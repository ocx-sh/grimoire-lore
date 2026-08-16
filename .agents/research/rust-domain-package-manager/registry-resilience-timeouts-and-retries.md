---
title: "Registry Resilience: Timeouts, Retries, and Idempotency"
agent: inv-resilience
model: sonnet
date_researched: 2026-08
sources_count: 14
scope: >
  Timeout taxonomy, retry policy, idempotency classification, resumable
  downloads, auth-token interaction, failure surfacing, and connection reuse
  for grim/ocx's registry (OCI/ghcr.io) HTTP surface. Motivating defect: the
  audit found 2 tokio::time::timeout call sites in grimoire against 22 in
  ocx_lib for equivalent registry surface.
---

## Table of contents

1. [Findings](#findings)
   1. [The timeout taxonomy](#1-the-timeout-taxonomy)
   2. [Retry policy](#2-retry-policy)
   3. [Idempotency as the precondition for retry](#3-idempotency-as-the-precondition-for-retry)
   4. [Resumable downloads](#4-resumable-downloads)
   5. [Auth interaction: 401 mid-transfer](#5-auth-interaction-401-mid-transfer)
   6. [Failure surfacing](#6-failure-surfacing)
   7. [Connection reuse: one client](#7-connection-reuse-one-client)
2. [Normative guidance candidates](#normative-guidance-candidates)
3. [AI-agent angle](#ai-agent-angle)
4. [Contested / evolving](#contested--evolving)
5. [Sources](#sources)

## Summary

1. Microsoft's Rust guidelines put **Resilience** under `guidelines/libs/resilience` as its own top-level library category, separate from `guidelines/correctness` — timeouts and retries are not correctness bugs, they are a distinct discipline with distinct review criteria.
2. `Client::timeout` in reqwest is a *total deadline*, "applied from when the request starts connecting until the response body has finished" — it cannot distinguish a slow-but-alive multi-GB blob from a hung connection, so it is the wrong bound for streaming downloads.
3. `read_timeout` is the per-frame idle bound: it "applies to each read operation, and resets after a successful read" — this is the one that stops a registry dribbling one byte per minute, and it is missing from `Client::timeout` alone.
4. `connect_timeout` and `read_timeout` compose to one non-obvious hazard: `read_timeout`'s clock starts at dispatch and is not reset by anything before the first body read, so it silently also bounds connect + TLS handshake + request-body upload + time-to-first-byte if no `connect_timeout` is set separately.
5. reqwest cannot express a TLS-handshake timeout independent of TCP connect — `connect_timeout` wraps the whole connector future (TCP + TLS for HTTPS); splitting them requires a custom `tower::Service`-based connector outside reqwest.
6. 429 and 503 are not the same retry case: 429 is a client-attributable "you personally are over budget" signal (RFC 6585) that should feed back into client-side throttling, not just backoff; 503 is server-attributable distress with no implication about *this* client's behavior.
7. `Retry-After` (RFC 9110 §10.2.3) — either delay-seconds or an HTTP-date — must override a computed backoff delay when the server sends it; computing your own delay when the server told you the answer is a bug, not an optimization.
8. AWS's canonical guidance ranks **full jitter** (`random(0, min(cap, base·2^attempt))`) as the best work-to-time ratio; **decorrelated jitter** is competitive; **equal jitter** does strictly more work for longer.
9. A retry policy needs three independent caps, not one: a per-attempt backoff formula, a hard **attempt count** cap, and a hard **total wall-clock time** cap — backoff growth alone does not bound total latency.
10. Every OCI registry write operation splits into two idempotency classes: PUT operations (content-addressed blob commit, manifest push) are idempotent because they are addressed by digest or replace-in-full by definition; POST (open upload session) and PATCH (upload chunk) are **not** idempotent — a PATCH replay is rejected by spec as out-of-order (`416`), and a POST replay opens a second, orphaned session.
11. The safe fallback for a non-idempotent chunked-upload step is **restart-whole**: abandon the failed session, `POST` a fresh one, and re-upload — never resume in place on an ambiguous PATCH failure, because the client cannot know how many bytes the server actually committed.
12. HTTP `Range` (RFC 9110 §14) is how OCI registries "SHOULD" support resumed blob GETs — but the digest verification must run over the **complete reassembled file**, re-hashing bytes written in an earlier process run too; a resumed suffix's own checksum proves nothing about the previously-written prefix surviving disk truncation or corruption between runs.
13. A naive "retry on 401" loop has two independent failure modes: retrying with the *same* expired token forever (infinite loop), and re-hitting the token endpoint on every single 401 with no caching or in-flight coalescing (credential-hammering that can itself trip 429 on the auth server).
14. The correct 401 handling is: single-flight token refresh shared across concurrent requests, one refresh-then-retry per original request (a 401 that recurs after a fresh token is a hard auth failure, not a retry condition), and proactive refresh before `expires_in` elapses on transfers long enough to outlive the token.
15. `tower::retry` supplies the `Policy` trait and a `Retry`/`RetryLayer` shim but leaves backoff-with-jitter, per-status classification, and idempotency-awareness entirely to the implementer — it is a primitive, not a policy.
16. `backon`'s `Retryable` trait retries a bare async closure (`ExponentialBuilder`/`FibonacciBuilder`/`ConstantBuilder`, all jitter-capable) without requiring the call site to be a `tower::Service` — the better fit for a CLI whose registry calls are plain `reqwest` futures with per-operation idempotency rules.
17. `reqwest-middleware` + `reqwest-retry`'s `RetryTransientMiddleware` retries transparently at the client layer via a `RetryableStrategy` — appropriate only for the strictly-idempotent read paths (GET/HEAD/token exchange); wiring it in front of PATCH/POST upload traffic would retry operations the spec says must not be blindly replayed.
18. The audit's finding — grimoire's 3-4 ad hoc `reqwest::Client::new()`/`Client::builder()` construction sites versus ocx_lib's one `ClientBuilder` — is a resilience defect in itself: every bypassing call site loses the configured timeouts, retry wiring, connection pool, and the SSRF-guarded DNS resolver simultaneously.
19. DNS caching and the SSRF `GuardedResolver` hook are in tension by design: a resolver that caches an address across a connection's lifetime reopens a resolve→validate→connect TOCTOU window; ocx's `dns_resolver` hook re-validates per connection attempt rather than trusting a cached answer.
20. Exit-code taxonomy must distinguish "retries exhausted on a transient condition" (a distinct sysexits-style code, e.g. `EX_TEMPFAIL`/75, matching ocx's existing `RegistryTransient` convention) from a hard `404` (not retryable, a different exit code) — a caller/CI script needs to tell "try again later" apart from "this will never succeed."

## Findings

### 1. The timeout taxonomy

reqwest exposes four timeout knobs and their documented semantics are precise about which phase of a request they cover:

| Layer | reqwest API | Covers | Default |
|---|---|---|---|
| Connect (TCP + TLS) | `ClientBuilder::connect_timeout` | "only the connect phase of a `Client`" — for HTTPS this includes the TLS handshake, since reqwest's connector does TCP-connect-then-handshake as one future | `None` (unbounded) |
| Whole request | `ClientBuilder::timeout` / `RequestBuilder::timeout` | "from when the request starts connecting until the response body has finished. Also considered a total deadline." | `None` |
| Per-read idle | `ClientBuilder::read_timeout` | "applies to each read operation, and resets after a successful read... more appropriate for detecting stalled connections when the size isn't known beforehand" | `None` |
| Pool idle eviction | `ClientBuilder::pool_idle_timeout` | how long a kept-alive idle socket is retained before eviction | 90s |

Source: [reqwest `ClientBuilder` docs](https://docs.rs/reqwest/latest/reqwest/struct.ClientBuilder.html).

**Two things the taxonomy in the prompt asks for and reqwest does not give you a dedicated knob for:**

- **TLS handshake timeout, separate from TCP connect.** `connect_timeout` wraps the whole connector future; reqwest does not expose a sub-timeout for "TCP connected, waiting on TLS `ClientHello`/`ServerHello`". To split them you need a custom `tower::Service`-based connector (e.g. via `hyper-util`) instead of reqwest's built-in one. In practice this is rarely worth doing — a black-holed TLS handshake and a black-holed TCP connect both surface as "the connect phase never finished," and one bound catches both.
- **Time-to-first-byte as its own bound, independent of the streaming-download idle timeout.** This *is* expressible in reqwest without extra crates: `request_builder.send()` resolves once headers/status arrive, before the body is read — wrap that call (not the subsequent `.bytes_stream()` consumption) in `tokio::time::timeout(ttfb_bound, req.send())`. What reqwest's `read_timeout` cannot give you on its own is a *different* bound for TTFB versus in-body idle gaps, because the same clock covers both (see next point) — if you need TTFB and idle-body to differ, you need the manual `tokio::time::timeout` wrap for TTFB plus `read_timeout` for the body.

**The one everyone forgets — per-read idle timeout on a streaming body — has a non-obvious "two semantics" property** that ocx_lib's own client builder documents from direct empirical testing: `read_timeout`'s sleep is created once at dispatch and only reset by a *successful body-frame read*. Until the first body byte arrives, it behaves as a hard deadline over connect + TLS + request-body upload + TTFB combined; after the first byte, it becomes a genuine per-frame idle bound that a slow-but-alive transfer never trips. See `/home/mherwig/dev/ocx/crates/ocx_lib/src/oci/client/builder.rs` (`REGISTRY_READ_TIMEOUT` doc comment) for the full empirical writeup and a passing regression test (`stalled_response_body_read_returns_instead_of_hanging`) that proves a registry which answers a few bytes then goes silent-but-open is caught.

**Practical consequence:** a whole-request `Client::timeout` sized for "a large layer download" is *wrong* for a small bounded call (manifest GET, token exchange, tag list) — those should get a short deterministic deadline (seconds, not minutes) precisely because their payload size is known-small. Conversely, a streaming blob/layer download must **not** carry a top-level `.timeout()` at all (or must set it very large) — the correctness bound for that call is `read_timeout` (idle) plus `connect_timeout`, not a size-agnostic wall clock. Treating "timeout" as one number that has to fit every call shape is the root of grimoire's asymmetry: a value picked for one call shape is either too tight for large blobs or too loose for small metadata calls.

Correct vs incorrect:

```rust
// WRONG: one Client::timeout tries to bound both a 20 KB manifest GET
// and a 4 GB blob download with the same number. Too short and the
// blob download always fails; too long and a hung manifest GET hangs
// the CLI for minutes.
let client = reqwest::Client::builder()
    .timeout(Duration::from_secs(120))
    .build()?;
```

```rust
// RIGHT: bound the phases that apply to every call (connect, idle-read)
// on the shared client; bound whole-call latency per call SHAPE, not
// globally — small bounded calls get an explicit short deadline via
// tokio::time::timeout at the call site; unbounded streamed downloads
// rely on connect_timeout + read_timeout alone.
let client = reqwest::Client::builder()
    .connect_timeout(Duration::from_secs(10))
    .read_timeout(Duration::from_secs(120))
    .build()?;

// small, bounded-size call:
let manifest = tokio::time::timeout(Duration::from_secs(15), client.get(url).send()).await??;

// unbounded streamed blob: no extra wrap, connect_timeout + read_timeout
// on the shared client already bound it correctly.
let stream = client.get(blob_url).send().await?.bytes_stream();
```

### 2. Retry policy

**Status codes.** Retryable: `429` (honor `Retry-After` if present; a client-attributable rate-limit signal per RFC 6585 — "the user has sent too many requests... MUST NOT be stored by a cache"), `503` (server distress, honor `Retry-After` if present, otherwise computed backoff), `502`/`504` (gateway-layer transient), and transport-level errors (`reqwest::Error::is_connect()`, `is_timeout()`, connection-reset). **Not retryable:** `401` (handled by the auth dance in §5, not generic retry), `403` (permission — permanent), `404` (hard error, distinct exit code), `400`/`422` (malformed request — a retry sends the identical malformed bytes again), and any TLS/certificate error (a config problem, not a transient network blip). `500` is registry-dependent and ambiguous; treat it as retryable **only** for idempotent read operations, never for a write.

RFC source for the 429/503 distinction: [RFC 6585 §4](https://www.rfc-editor.org/rfc/rfc6585.html#section-4) defines 429 as attributable to the requester ("rate limiting"); [RFC 9110 §10.2.3](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after) defines `Retry-After` generically as "how long a user agent ought to wait before making a follow-up request," applicable to both.

**Backoff.** AWS's canonical writeup gives three jitter formulas and ranks them on simulated client work and completion time:

- **Full jitter:** `sleep = random(0, min(cap, base·2^attempt))` — lowest client work, best time.
- **Equal jitter:** `sleep = base·2^attempt/2 + random(0, base·2^attempt/2)` — keeps a rising floor but does strictly more work for longer than full jitter.
- **Decorrelated jitter:** `sleep = min(cap, random(0, last_sleep·3))` — uses the previous sleep as input; competitive with full jitter, slightly more total work.

Source: [AWS Architecture Blog, "Exponential Backoff and Jitter"](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/). **Pick full jitter** as the default — it is both the simplest formula and the empirically best-ranked one; only reach for decorrelated jitter if the workload profile diverges from AWS's simulation (unlikely for a CLI's serial-ish registry traffic).

**Caps.** A backoff formula alone does not bound total latency — pair it with a hard **attempt count** cap and a hard **total wall-clock** cap, independently enforced, so a misconfigured `cap`/`base` cannot silently balloon a single logical operation past what a user is willing to wait. Recommended defaults for this codebase: 4 total attempts (1 original + 3 retries), 60s per-attempt timeout ceiling (per §1's per-call-shape rule), 5 minutes total wall-clock cap per logical operation (covers backoff sleeps plus all attempts).

**Crates, and the pick.** Four options surfaced:

- **`tower::retry`** — supplies `Policy` (the classification trait) and a `Retry`/`RetryLayer` wrapper, plus a `backoff` module of "generic backoff utilities" and a `budget` module for a retry budget. It does **not** ship a ready-made exponential-backoff-with-jitter policy or per-status classification — you write both. It also requires the wrapped `tower::Service`'s request type to be cloneable for a retry, which is awkward for a streamed upload body. Source: [`tower::retry` docs](https://docs.rs/tower/latest/tower/retry/index.html).
- **`backon`** — retries a bare async closure via the `Retryable` trait: `fetch.retry(ExponentialBuilder::default()).sleep(tokio::time::sleep).when(|e| ...).notify(|err, dur| ...).await`. `ExponentialBuilder`/`FibonacciBuilder`/`ConstantBuilder` are all jitter-capable out of the box, no `tower::Service` requirement. Source: [`backon` docs](https://docs.rs/backon/latest/backon/).
- **`reqwest-retry`/`reqwest-middleware`** — `RetryTransientMiddleware` wraps a `reqwest::Client` transparently via `ClientBuilder::new(reqwest::Client::new()).with(RetryTransientMiddleware::new_with_policy(policy))`, classification via a `RetryableStrategy` trait (default: `DefaultRetryableStrategy`), backoff via `policies::ExponentialBackoff::builder().build_with_max_retries(n)`, `Jitter` enum for interval randomization. Source: [`reqwest-retry` docs](https://docs.rs/reqwest-retry/latest/reqwest_retry/).
- **`governor`** — not a retry crate; a client-side rate limiter (`RateLimiter::direct()` + `Quota::per_second(...)`) implementing GCRA, for *proactively* capping outbound request rate rather than reacting after a 429. Source: [`governor` docs](https://docs.rs/governor/latest/governor/).

**Pick:** `backon` at the call site, scoped per operation, because idempotency differs by operation (§3) and a blanket client-level retry cannot tell a safe-to-replay GET from an unsafe-to-replay PATCH. `reqwest-retry`/`reqwest-middleware` is acceptable *only* wired in front of the strictly-idempotent read paths (blob GET, manifest GET, HEAD, token exchange) on the one shared client — never in front of the upload/PATCH path, which needs the restart-whole pattern in §3, not transport-level retry. `tower::retry` is the wrong fit here: this codebase is not built on `tower::Service` composition for its registry calls, and its cloneable-request requirement fights streamed upload bodies. `governor` is a deferred nice-to-have (see Contested/evolving) — a plain `tokio::sync::Semaphore` bounding concurrent in-flight requests achieves most of the same benefit for a CLI's parallel-layer-pull use case with no new dependency.

### 3. Idempotency as the precondition for retry

A retry is only sound if replaying the exact same request cannot leave the system in a worse or ambiguous state than not retrying. Classification of every registry operation named in the prompt:

| Operation | Verb | Idempotent? | Why / what to do instead |
|---|---|---|---|
| Blob GET | `GET` | Yes | Pure read; replay freely. |
| Manifest GET | `GET` | Yes | Pure read; replay freely. |
| Token exchange | `GET` (to auth realm) | Operationally yes, but **not** a generic-retry target | Repeatable, but blind retry-on-401 causes credential-hammering (§5) — needs single-flight + one-shot-per-request semantics, not a backoff loop. |
| Blob PUT (small, single-shot, digest in URL) | `PUT` | Yes | Content-addressed by the digest in the request URL; replaying the identical bytes to the identical digest-addressed location is a no-op the registry can dedupe. |
| Blob upload session open | `POST` | **No** | Each `POST` opens a *new* session with a new session URL/ID. A replay after ambiguous failure orphans the old session (garbage, not corruption) and does not resume it. |
| Blob chunk upload | `PATCH` | **No** | Spec: "Chunks MUST be uploaded in order, with the first byte of a chunk being the last chunk's `<end-of-range>` plus one" — an out-of-order/duplicate `PATCH` gets `416`. Replaying a `PATCH` in place is unsafe because the client cannot know from an ambiguous failure whether the server already committed those bytes. |
| Manifest PUT | `PUT` | Yes, *if* the request body is byte-for-byte identical on retry | Registries "MUST store the manifest in the exact byte representation provided by the client." A retry that regenerates the manifest (non-deterministic timestamps/annotations) produces a *different* digest and is not the same operation — precompute the manifest bytes once, retry the identical bytes. |
| Tag update (manifest PUT to a mutable tag ref) | `PUT` | Idempotent w.r.t. your own bytes, **not** safe against concurrent writers | The base distribution spec has no compare-and-swap / conditional-PUT primitive, so a retry can silently overwrite a tag another process moved in between. This is a consistency caveat, not a retry-safety blocker — flag it, do not build false confidence that retry-safe implies race-free. |

Sources: [OCI distribution spec](https://github.com/opencontainers/distribution-spec/blob/main/spec.md) (chunked-upload ordering, manifest byte-exactness).

**What a non-idempotent operation does instead of naive retry:** restart-whole. On an ambiguous `PATCH` failure, abandon the upload session (a fresh `POST` implicitly orphans whatever the old session stored — the registry garbage-collects it) and restart from `POST`, re-uploading all chunks. ocx_lib implements and tests exactly this pattern: `/home/mherwig/dev/ocx/crates/ocx_lib/src/oci/client/builder.rs`, test `transient_patch_failure_restarts_the_upload_and_commits_once` — a `503` on one chunk `PATCH` triggers a fresh `POST` (new session), not a resume, and the blob still commits exactly once via one final `PUT`.

```rust
// WRONG: retry the failed PATCH in place. If the registry actually
// committed the bytes before the connection died, this replay is an
// out-of-order chunk (416) or silently double-accounts progress.
async fn upload_chunk_naive(session: &Session, chunk: &[u8], range: Range) -> Result<()> {
    backon::Retryable::retry(
        || session.patch(chunk, range),
        ExponentialBuilder::default(),
    ).await
}

// RIGHT: on an ambiguous failure, abandon the session and restart
// the whole upload under a fresh POST. The failed session's state is
// never trusted again.
async fn upload_blob(client: &Client, blob: &[u8]) -> Result<()> {
    for attempt in 0..PUSH_RETRY_ATTEMPTS {
        let session = client.open_upload_session().await?; // fresh POST
        match session.upload_all_chunks(blob).await {
            Ok(()) => return session.commit(digest_of(blob)).await,
            Err(e) if e.is_transient() => continue, // next loop iteration = fresh POST
            Err(e) => return Err(e),
        }
    }
    Err(Error::RetriesExhausted)
}
```

### 4. Resumable downloads

Registries "SHOULD support the `Range` request header in accordance with RFC 9110 (section 14)" for blob GET — a client resumes an interrupted download by requesting `Range: bytes=<offset>-` rather than restarting from zero. Source: [OCI distribution spec](https://github.com/opencontainers/distribution-spec/blob/main/spec.md); [RFC 9110 §14](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after) (Range semantics generally).

**The rule the prompt calls out explicitly, and the one most likely to be gotten wrong:** the digest must be verified over the *complete reassembled artifact*, never trusted from a resumed suffix. A resumed download's own bytes hashing correctly proves nothing about the previously-written prefix — that prefix could have been truncated or corrupted on disk between the failed attempt and the resume (process crash mid-`fsync`, disk full, another process touching the temp file). The only sound check is: after the file is fully reassembled, re-read it from byte 0 and hash the whole thing, then compare to the requested digest.

```rust
// WRONG: verify only the newly-downloaded suffix, trusting the
// previously-written prefix blindly.
async fn resume_download(path: &Path, offset: u64, digest: &Digest) -> Result<()> {
    let suffix = client.get_range(offset..).await?;
    append_to_file(path, suffix.clone()).await?;
    verify_digest(&suffix, digest)?; // WRONG: only checks the new bytes
    Ok(())
}

// RIGHT: after reassembly, re-hash the WHOLE file from disk.
async fn resume_download(path: &Path, offset: u64, digest: &Digest) -> Result<()> {
    let suffix = client.get_range(offset..).await?;
    append_to_file(path, suffix).await?;
    let whole_file_hash = hash_file_from_start(path).await?;
    if whole_file_hash != *digest {
        return Err(Error::DigestMismatch); // catches prefix corruption too
    }
    Ok(())
}
```

### 5. Auth interaction: 401 mid-transfer

The OCI/docker distribution token flow: an anonymous request to a protected endpoint gets `401` with a `WWW-Authenticate: Bearer realm="...",service="...",scope="..."` challenge (RFC 6750 §3); the client `GET`s the realm URL with `service`/`scope` query params; the auth server returns `{"token": "...", "expires_in": 3600, "issued_at": "..."}`; the client retries the original request with `Authorization: Bearer <token>`. Source: [docker/distribution token auth spec](https://distribution.github.io/distribution/spec/auth/token/).

**Two independent naive-retry failure modes:**

1. **Infinite loop:** a bare `if 401 { retry }` with no state tracking retries with the *same already-expired* token forever, since nothing changed between attempts.
2. **Credential-hammering:** re-fetching a token on every single `401` with no caching or coalescing means N concurrent requests that all 401 at once trigger N independent token-endpoint round trips — which can itself 429 the auth server, compounding the outage.

**Correct pattern:** single-flight token refresh (one in-flight refresh shared across concurrent callers via a mutex or `OnceCell`-style gate, not N independent fetches), a hard **one-shot** rule — a request gets at most one 401-triggered refresh-and-retry; a 401 that recurs after a fresh token is a hard authentication failure surfaced immediately, not looped on — and **proactive** refresh before `expires_in` elapses for transfers long enough to outlive a token (a multi-GB upload can easily outlive a 300s token; the mid-transfer 401 must trigger a transparent refresh-and-resume of the *current* operation, not an abort-and-restart-from-zero).

```rust
// WRONG: unbounded retry-on-401, no refresh coalescing, no expiry-aware
// pre-emptive refresh.
loop {
    let resp = client.get(url).bearer_auth(&token).send().await?;
    if resp.status() == 401 {
        token = fetch_token().await?; // hammers auth endpoint under concurrency
        continue; // no bound — a persistently-wrong token loops forever
    }
    return Ok(resp);
}

// RIGHT: one-shot refresh, single-flight across callers.
async fn get_with_auth(client: &Client, url: &str, tokens: &TokenCache) -> Result<Response> {
    let token = tokens.get_or_refresh(url).await?; // coalesced, may hit cache
    let resp = client.get(url).bearer_auth(&token).send().await?;
    if resp.status() != StatusCode::UNAUTHORIZED {
        return Ok(resp);
    }
    let fresh = tokens.force_refresh(url).await?; // single-flight, one shot
    let resp = client.get(url).bearer_auth(&fresh).send().await?;
    if resp.status() == StatusCode::UNAUTHORIZED {
        return Err(Error::Authentication); // hard failure, no further loop
    }
    Ok(resp)
}
```

### 6. Failure surfacing

What the user sees per retry attempt should scale with the interface, not be one hardcoded behavior:

- **Interactive TTY:** a single overwritten status line per attempt (`retrying blob GET (attempt 2/4, backing off 1.2s)…`) — not silence (a >1s unexplained stall reads as a hang) and not one scrolling line per attempt (spam for a fast-recovering transient).
- **`--json`:** retry attempts are structured events on a side channel (e.g. one NDJSON object per attempt on stderr, or a `"progress"`-typed event in the same stream if the format already supports typed events) — never interleaved into the primary machine-readable payload, and never silently dropped (a caller building automation on `--json` needs the same visibility a human gets).
- **Non-TTY, non-JSON (piped/CI logs):** plain line-based progress, one line per retry attempt, no carriage-return spinner control codes (those corrupt CI log output).

**Exit codes:** retries-exhausted-on-a-transient-condition and a hard `404` must map to *different* exit codes — the first tells a caller/CI script "try again later," the second tells it "this input is wrong, retrying will not help." ocx_lib's existing convention — `RegistryTransient` mapping to a sysexits-style `EX_TEMPFAIL`/75 — is the right shape to standardize on across the whole family; a hard `404`/not-found should use a distinct, non-75 code so scripted retry-wrapping logic (`while ! grim install; do sleep 5; done` style) can distinguish the two without parsing stderr text.

### 7. Connection reuse: one client

**The audit's finding is itself the resilience defect.** grimoire has ad hoc client construction scattered across `src/catalog/forge.rs` (three separate `reqwest::Client::new()` calls plus a `Client::builder()`), `src/auth/verify.rs`, and `src/catalog/index_source.rs`, on top of the vendored `external/rust-oci-client/src/client.rs` fork's own two construction sites — every one of these bypasses whatever timeouts, retry wiring, connection pool, and (per §7 below) SSRF-guarded DNS resolver the "real" client is configured with. ocx_lib, by contrast, funnels every client through one `ClientBuilder` (`/home/mherwig/dev/ocx/crates/ocx_lib/src/oci/client/builder.rs`).

**Pool sizing and protocol.** `pool_idle_timeout` defaults to 90s; `pool_max_idle_per_host` defaults to `usize::MAX` (unbounded) per [reqwest `ClientBuilder` docs](https://docs.rs/reqwest/latest/reqwest/struct.ClientBuilder.html) — worth capping explicitly for a CLI that may open many short-lived per-host connections during a bulk pull/install, so idle sockets don't accumulate unbounded across a long-running process (`grim tui`, `ocx` daemon-adjacent modes). HTTP/2 vs 1.1 against ghcr.io: let ALPN negotiate rather than forcing `http2_prior_knowledge` (which "only use[s] HTTP/2" and would break against any plaintext mirror or a registry that only speaks 1.1) — ghcr.io supports HTTP/2 over TLS and reqwest negotiates it automatically without extra configuration.

**DNS caching vs the SSRF resolver hook.** ocx already wires a `GuardedResolver` through `ClientBuilder::ssrf_guard` → `reqwest::dns::Resolve` (`/home/mherwig/dev/ocx/crates/ocx_lib/src/oci/client/builder.rs`, `ssrf_guard`), which re-validates resolved addresses per connection attempt rather than trusting a cached answer — the whole point of resolve→validate→pin-per-connect is closing the TOCTOU window where a cached DNS answer or a rebinding attacker changes the address between validation and the actual `connect()`. Any alternate client construction site that does *not* go through this resolver reopens that SSRF window silently — another concrete cost of the "one client" rule, not just a performance one. Source for the trait surface: [`reqwest::dns::Resolve`](https://docs.rs/reqwest/latest/reqwest/dns/trait.Resolve.html).

## Normative guidance candidates

1. **No outbound registry HTTP call may construct its own `reqwest::Client`.** Exactly one constructor function builds the shared client (timeouts, retry wiring, DNS/SSRF resolver, pool config); every call site is injected the built client.
   Rationale: an ad hoc client silently loses every other rule in this document at once — timeouts, retries, and the SSRF guard all live on the client, not the call.
   VERIFICATION: `grep -rn "reqwest::Client::new()\|reqwest::Client::builder()\|ClientBuilder::new()" --include="*.rs" src/` must return zero hits outside the one designated builder file; wire this grep into CI as a hard gate, not just a review heuristic.

2. **Every shared client sets `connect_timeout` and `read_timeout`; neither may be left at reqwest's default `None`.**
   Rationale: `None` on either is an unbounded hang — a black-holing firewall (connect) or a registry that goes silent mid-body (read) blocks the CLI forever with no operator-visible signal.
   VERIFICATION: `grep -n "connect_timeout\|read_timeout" <builder-file>` — both must be present and set to `Some(_)`; a unit test asserting the built client's config carries `Some` for both (see ocx_lib's `production_client_config_carries_the_registry_read_timeout` / `_connect_timeout` tests as the pattern to copy).

3. **A top-level `Client::timeout`/`RequestBuilder::timeout` is set only on bounded-size calls (manifest GET/PUT, HEAD, tag list, token exchange); streaming blob transfers rely on `connect_timeout` + `read_timeout` alone, never a size-agnostic whole-request deadline.**
   Rationale: one number cannot correctly bound both a 20 KB metadata call and a multi-GB blob — too short breaks large transfers, too long lets a hung metadata call block for minutes.
   VERIFICATION: reading heuristic during review — every `.timeout(` call site is paired with a comment or type signaling "this response body is size-bounded"; a streaming/`.bytes_stream()` consumer must not also carry a `.timeout(` wrap on the same request.

4. **Retry is expressed as one policy struct (attempt cap, per-attempt backoff with full jitter, hard total-time cap, `Retry-After` override), not scattered inline retry loops.**
   Rationale: a policy that lives in one place can be reviewed once, tested once, and reused with consistent behavior; scattered ad hoc loops drift (some honor `Retry-After`, some don't; some cap attempts, some don't).
   VERIFICATION: `grep -rn "loop {" --include="*.rs" src/ | grep -i retry` — every hand-rolled retry loop found this way is a candidate to migrate onto the one policy type; `grep -rn "ExponentialBuilder\|RetryPolicy" src/` should converge on a single construction site.

5. **Status-code retry classification is a lookup, not scattered `if status == 503 || status == 429` checks:** retryable = `{429, 503, 502, 504}` + transport errors (`is_connect()`, `is_timeout()`); never-retryable = `{401 (handled separately), 403, 404, 400, 422}` + TLS/certificate errors.
   Rationale: a classification duplicated at each call site drifts — one call site might retry `500`, another might not, with no reviewable single source of truth.
   VERIFICATION: `grep -rn "StatusCode::" --include="*.rs" src/ | grep -v <the one classification module>` — a status-code match outside the one classifier is a finding.

6. **A `PATCH` (chunked-upload segment) or `POST` (upload-session-open) is never wrapped in a generic retry-the-request helper; an ambiguous failure on either triggers restart-whole (abandon session, fresh `POST`, re-upload).**
   Rationale: replaying a `PATCH` in place violates OCI ordering (`416`) and risks double-accounting bytes the server may have already committed; only a fresh session's `POST` has a well-defined "start from zero" semantics.
   VERIFICATION: grep the retry helper's call sites and manually confirm none wraps a bare chunk-`PATCH` send; stronger — make the type that performs a `PATCH` consume the session handle by value so a caller cannot re-invoke it against the same session without re-acquiring one via a fresh `POST`.

7. **Digest verification always re-hashes the complete reassembled file from byte 0, even on a resumed download; a resumed suffix is never independently trusted.**
   Rationale: a resumed suffix hashing correctly proves nothing about a previously-written prefix that could have been truncated or corrupted between process runs.
   VERIFICATION: grep the download-completion path for the verification call and confirm its input is the full file object/full byte range, not a variable scoped to "bytes downloaded this attempt."

8. **A `401` is handled by a dedicated auth-refresh path, never by the generic retry policy; that path allows exactly one refresh-and-retry per original request, with refreshes coalesced single-flight across concurrent callers.**
   Rationale: folding 401 into generic retry produces either an infinite loop (same expired token replayed) or credential-hammering (N concurrent unauthenticated 401s each independently hitting the token endpoint).
   VERIFICATION: grep for `StatusCode::UNAUTHORIZED`/`401` handling; confirm it is not inside the same function/closure the generic retry policy wraps, and confirm a retry-count guard (not a bare `continue`/recursive call) sits between the check and the re-attempt.

9. **Exhausted-retries-on-transient and hard-`404` map to different process exit codes.**
   Rationale: a caller/CI script needs a mechanical way to distinguish "try again later" from "this will never succeed" without parsing stderr text.
   VERIFICATION: `grep -rn "exit(" --include="*.rs" src/` or the error-to-exit-code mapping table — confirm the transient-registry-error variant and the not-found variant resolve to different codes; add a test asserting the two are distinct integers.

10. **`pool_max_idle_per_host` is set to an explicit finite value, not left at reqwest's unbounded default.**
    Rationale: a long-running process (bulk install, TUI, daemon-adjacent mode) doing many per-host requests can otherwise accumulate unboundedly many idle pooled sockets.
    VERIFICATION: `grep -n "pool_max_idle_per_host" <builder-file>` present and set; absent is a finding.

11. **The DNS resolver used by the shared client is always the SSRF-guarded resolver (`GuardedResolver`/equivalent), never reqwest's default resolver, on any code path that can reach an attacker- or config-influenced host.**
    Rationale: a client built without the guarded resolver reopens the resolve→validate→connect TOCTOU window the guard exists to close — this is a security property riding on the same "one client" discipline as the timeout/retry properties.
    VERIFICATION: `grep -n "dns_resolver\|GuardedResolver" <builder-file>` — confirm every production client-construction path sets it; a client built without it, reachable from a registry-host-controlled input, is a security finding, not just a style one.

## AI-agent angle

1. **Inline `reqwest::Client::new()` "just for this one call."** An LLM asked to add a new registry call reaches for the path of least resistance and constructs a fresh client inline rather than threading the shared one through. Smallest check: the grep gate in rule 1 above — any new `Client::new()`/`Client::builder()` outside the one file fails CI immediately, no manual review needed.

2. **Setting only `.timeout()` and believing it covers a streaming blob download.** The model knows reqwest has "a timeout" and stops there, missing that `read_timeout` is the one that matters for an open-ended stream. Smallest check: a code-review heuristic — any `reqwest::Client::builder()` (or per-request `.timeout()`) touching a module that also calls `.bytes_stream()`/streams a body must have an adjacent `read_timeout` set; its absence is the tell.

3. **Wrapping a chunk-`PATCH` in the same generic `.retry(...)` helper used for GETs.** The model treats "retry" as a uniform wrapper to sprinkle over any fallible async call, without reasoning about whether the specific HTTP verb is safe to replay. Smallest check: grep every call site of the retry helper and manually classify the wrapped request's HTTP method — any `PATCH` or session-`POST` inside a generic retry wrap is a finding; structurally, making the `PATCH`-issuing function consume a session handle by value (rather than borrow) makes this a compile error instead of a review finding.

4. **A bare `loop { if 401 { retry } }`.** The model produces the shortest code that "handles" a 401 without modeling the two failure modes (infinite loop, credential-hammering) that only show up under adversarial/production conditions the model never simulates. Smallest check: grep for `401`/`UNAUTHORIZED` handling and confirm a retry-count variable or one-shot flag exists between the check and the re-attempt — its absence is close to always a bug here.

5. **Verifying only the newly-downloaded suffix of a resumed transfer.** The model reasons "we already verified the earlier bytes in the previous attempt," which is true of the *logic* but false of the *bytes on disk* — it does not model disk-state-between-process-runs as an untrusted input. Smallest check: grep the digest-verification call site's argument — if it is scoped to "bytes from this attempt" rather than "the whole file," flag it.

6. **Copying a single hardcoded backoff `sleep(1s * attempt)` with no cap and no `Retry-After` check.** The model produces textbook-simple exponential backoff without the three caps (attempts, total time, `Retry-After` override) this document requires. Smallest check: grep the backoff implementation for a `max_delay`/attempt-count cap and a `response.headers().get("retry-after")` check — either missing is a finding.

## Contested / evolving

- **`tower::retry`'s backoff utilities are less turnkey than `backon`'s or `reqwest-retry`'s.** The docs describe a `backoff` module with "generic backoff utilities" but no ready-made jittered exponential-backoff `Policy` — expect this gap to close over time as `tower`'s ecosystem matures, but as of this research it is the reason `backon` is the pick, not a permanent architectural verdict.
- **Full jitter vs decorrelated jitter is not fully settled.** AWS's own post ranks full jitter best on their simulation but calls decorrelated jitter "competitive"; several SDKs (including some AWS SDKs) have shifted defaults between the two over the years. Treat "full jitter" as this document's default, not dogma — revisit if empirical retry-storm data from ghcr.io specifically suggests otherwise.
- **Whether a CLI needs `governor`-style proactive rate limiting at all is a judgment call, not settled by the research.** A CLI issuing serial or lightly-parallel registry requests may never need a token-bucket limiter — a plain `tokio::sync::Semaphore` bounding concurrent in-flight requests during a bulk parallel-layer pull achieves most of the same protection with no new dependency. Reach for `governor` only if empirical 429 rates against ghcr.io demonstrate the semaphore isn't enough.
- **reqwest's `read_timeout` "two semantics" behavior (idle-per-frame after first byte, hard-deadline before it) is documented behavior of the current reqwest, but is not obvious from the one-line docs.rs description** — the ocx_lib empirical writeup and regression test are the more reliable source than the prose docs alone; if reqwest ever splits this into two distinct knobs (a real feature request in the ecosystem), this document's guidance to combine `connect_timeout` + `read_timeout` for streaming calls should be revisited.
- **OCI registries' actual support for conditional/compare-and-swap manifest PUT (closing the tag-update race in §3) is inconsistent across registries** and not part of the base distribution spec — some registries (notably via `If-Match`/ETag extensions) support it, ghcr.io's exact behavior here was not verified in this pass and is worth a follow-up probe against the live registry rather than the spec alone.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [Microsoft Rust guidelines — Resilience](https://microsoft.github.io/rust-guidelines/guidelines/libs/resilience/index.html) | Official Microsoft Rust guidelines, library resilience category | 2026, current | The framing this deliverable adopts: resilience as a category distinct from correctness. |
| [corrode.dev — Hardening Rust Code for Production](https://corrode.dev/blog/hardening-rust/) | Rust consultancy blog, production-hardening checklist | 2026-07-23 | Practitioner-level guidance on explicit timeouts, circuit breakers, resource limits — corroborates the "set explicit limits on everything" framing. |
| [AWS Architecture Blog — Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) | AWS's canonical backoff/jitter writeup with simulation data | Long-standing, still cited | The primary source for full/equal/decorrelated jitter formulas and the full-jitter recommendation. |
| [reqwest `ClientBuilder` docs](https://docs.rs/reqwest/latest/reqwest/struct.ClientBuilder.html) | Official crate docs, current release | 2026, current | Exact, authoritative semantics of `timeout`/`connect_timeout`/`read_timeout`/`pool_max_idle_per_host`/`http2_prior_knowledge`. Primary source. |
| [OCI distribution-spec `spec.md`](https://github.com/opencontainers/distribution-spec/blob/main/spec.md) | OCI Distribution Specification, canonical repo | Current `main` | Primary spec source for chunked-upload ordering (`416` on out-of-order `PATCH`), manifest byte-exactness, Range support. |
| [docker/distribution token auth spec](https://distribution.github.io/distribution/spec/auth/token/) | The de facto OCI/Docker registry bearer-token auth flow | Long-standing, still authoritative | Primary source for the 401 → token-endpoint → retry dance and `expires_in` semantics. |
| [`tower::retry` docs](https://docs.rs/tower/latest/tower/retry/index.html) | Official crate docs | 2026, current | Primary source establishing `tower::retry` as a primitive (Policy trait), not a ready policy. |
| [`tower-http::timeout` docs](https://docs.rs/tower-http/latest/tower_http/timeout/index.html) | Official crate docs | 2026, current | Shows the HTTP-service-layer alternative to reqwest's own timeouts, and why it returns a response instead of erroring. |
| [`backon` docs](https://docs.rs/backon/latest/backon/) | Official crate docs | 2026, current | Primary source for the picked retry crate's API (`Retryable`, `ExponentialBuilder`). |
| [`reqwest-retry` docs](https://docs.rs/reqwest-retry/latest/reqwest_retry/) | Official crate docs | 2026, current | Primary source for the transparent-middleware alternative, scoped in this document to idempotent reads only. |
| [`governor` docs](https://docs.rs/governor/latest/governor/) | Official crate docs | 2026, current | Primary source for client-side rate limiting, deferred per Contested/evolving. |
| [RFC 9110 §10.2.3 — Retry-After](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after) | IETF HTTP Semantics RFC | 2022, current | Primary normative source for `Retry-After`'s two formats and its "how long to wait" contract. |
| [RFC 6585 §4 — 429 Too Many Requests](https://www.rfc-editor.org/rfc/rfc6585.html#section-4) | IETF additional HTTP status codes RFC | 2012, still current | Primary normative source for why 429 is a client-attributable signal, distinct from 503. |
| [`reqwest::dns::Resolve` docs](https://docs.rs/reqwest/latest/reqwest/dns/trait.Resolve.html) | Official crate docs | 2026, current | Primary source for the custom-DNS-resolver seam ocx's SSRF guard rides on. |

Additional in-house evidence read directly (not web sources, cited by path): `/home/mherwig/dev/ocx/crates/ocx_lib/src/oci/client/builder.rs` (the 22-timeout-site reference implementation, its read-timeout empirical writeup, and its restart-whole upload retry tests); `/home/mherwig/dev/grimoire/src/catalog/forge.rs`, `/home/mherwig/dev/grimoire/src/auth/verify.rs`, `/home/mherwig/dev/grimoire/src/catalog/index_source.rs` (grimoire's scattered client-construction sites, the motivating defect).

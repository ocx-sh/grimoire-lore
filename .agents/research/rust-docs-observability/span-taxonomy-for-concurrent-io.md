---
title: Span and Field Design for Concurrent Registry I/O
topic: rust-docs-observability
agent: rust-domain-researcher
model: sonnet
date_researched: 2026-08
sources_count: 14
scope: |
  Covers: the span tree for a package-manager command that resolves a manifest
  and pulls N layers concurrently; field-naming conventions cross-referenced
  against OpenTelemetry semantic conventions; cardinality/cost of per-layer
  spans and static max-level features; correlating a client run with a
  registry's server-side logs (trace-context headers, request-id headers);
  redaction of credentials inside spans; the err/ret double-reporting hazard;
  and keeping a progress UI and a tracing subscriber off each other's
  terminal output.
  Does NOT cover: OTel SDK/exporter configuration, metrics or logs pipelines,
  or full OTLP collector deployment — this is span/field *design*, not wire
  export.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The span tree for resolve → fetch-manifest → N×pull → extract → link](#1-the-span-tree)
   2. [One span per layer vs. one span per pull with per-layer events](#2-one-span-per-layer-vs-events)
   3. [Spans under tokio concurrency: what `Instrument` does and does not preserve](#3-instrument-and-spawn)
   4. [Field naming and OpenTelemetry semantic conventions](#4-field-naming)
   5. [Cardinality and cost at 200 layers](#5-cardinality-and-cost)
   6. [Correlating a run: run IDs, trace-context, registry request IDs](#6-correlation)
   7. [Redaction inside spans](#7-redaction)
   8. [Errors in spans: `err`, `ret`, and double-reporting](#8-errors-in-spans)
   9. [Progress UI vs. tracing subscriber on the same terminal](#9-progress-vs-tracing)
   10. [Debug flag vs. bug-report bundle](#10-debug-flag-vs-bundle)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

1. One root span per command invocation (e.g. `grim_add`, `ocx_install`), holding run-level fields (`run_id`, subcommand, cwd); every other span is a descendant of it, so a single `RUST_LOG=my_tool=info` capture is a full call tree, not a flat log.
2. Put a span at every unit the user can name in a bug report: `resolve`, `fetch_manifest`, `pull_layer` (one per layer), `extract`, `link`. Do not add spans for internal helper calls that never appear in a status line.
3. OpenTelemetry's own HTTP semantic conventions say retries get **new sibling spans**, not events on one span — `Instrumentations SHOULD create an HTTP span for each attempt to send an HTTP request over the wire`, correlated with `http.request.resend_count`. Apply the same rule one level up: one span per layer pull, with retries inside it as child spans or `attempt` fields, not folded into a single span with N log lines.
4. `#[instrument]` on an `async fn` re-enters the span on every poll and exits on every yield — this is what makes it safe across `.await`; holding a manual `Span::enter()` guard across an `.await` is documented as producing "incorrect traces" because the guard doesn't know about task switches.
5. `tokio::spawn` does **not** inherit the current span automatically. A spawned task is only inside the caller's span if you explicitly call `.instrument(Span::current())` (or `.in_current_span()`) on the future before spawning; otherwise events inside the spawned task attach to nothing.
6. Concurrent layer pulls (`join_all`/`FuturesUnordered` over `tokio::spawn`) therefore need every spawned future explicitly instrumented, or `pull_layer` spans silently become orphans with no parent — a plausible root cause for "spans show up flat" bug reports.
7. Prefer OTel semantic-convention field names over invented ones where an equivalent exists: `error.type` for classifying failures, `url.full` (never with embedded credentials — see redaction), `http.request.resend_count` for retry counters, `http.response.status_code`. For OCI-specific fields there is exactly one namespaced attribute, `oci.manifest.digest`; everything else (repository, reference, layer digest, media type, size) has no OTel equivalent yet, so name it `oci.*`-flavored and stable across the codebase rather than inventing per-call-site names.
8. A 200-layer pull creates 200 short-lived spans; that is normal, not a cardinality problem — cardinality blows up when a field varies without bound (e.g. putting a raw digest as a span *name* rather than a *field*, or one metric time series per digest). Keep the span *name* constant (`pull_layer`) and put the digest in a field.
9. `tracing`'s static `max_level_*` / `release_max_level_*` Cargo features remove disabled-level instrumentation from the binary at compile time — useful for a release CLI that never wants `trace!` compiled in, at the cost of no longer being able to raise verbosity at runtime past that ceiling.
10. `EnvFilter` and per-span "interest" caching mean a `debug!`/span check against a disabled level is cheap, but no source consulted here gives an exact cycle count — treat "spans are cheap when disabled" as directionally true, not a number to cite.
11. There is no OCI-distribution-spec-defined request-ID or trace-context header; `Docker-Content-Digest` and (for uploads) `Docker-Upload-UUID` are the only defined correlation headers. Anything registry-specific (GitHub's `x-github-request-id`, AWS's `x-amzn-RequestId`/`x-amz-request-id`) is a *platform* convention layered on top, not an OCI one.
12. W3C Trace Context (`traceparent`, `tracestate`) is the vendor-neutral way to propagate a client-side trace ID into a registry request; whether ghcr.io/ECR/etc. actually honor it server-side is unverified here — sending it costs nothing and is forward-compatible with any registry that later adopts OTel.
13. The reference Rust OCI client (`oci-client`, formerly `oci-distribution`) does **not** use `#[instrument]` or manual spans at all — it logs with bare `debug!`/`trace!`/`warn!` macros. There is no published span-design precedent to copy from the ecosystem's own reference client; this taxonomy is a synthesis from `tracing`'s own docs plus OTel semantic conventions, not a transcription of an existing Rust OCI tool's design.
14. `secrecy`'s design principle — make secret *access* require an explicit trait call (`ExposeSecret`) rather than relying on developers to remember not to `Debug`/log a value — is the structural fix for "never record a bearer token in a span": wrap credentials in a type that has no `Debug`/`Display` impl at all, so `#[instrument(skip(token))]` isn't the only thing standing between a token and the log.
15. OTel's own HTTP semantic conventions mandate credential redaction in the one field most likely to leak a token: `url.full` **MUST NOT** contain `user:pass@host` credentials, and known signed-URL query parameters (AWS SigV4, Azure SAS, GCS signed URLs) **SHOULD** be redacted while preserving the key name. This is the direct precedent for redacting presigned blob-download URLs recorded on `pull_layer` spans.
16. `#[instrument(err)]`/`#[instrument(ret)]` each emit their own tracing **event** (default level `ERROR` for `err`, `INFO` for `ret`) when the function returns; combining them is documented as supported for `Result`-returning functions, but nothing in the macro guards against the same failure also being separately logged at the call site or by an outer error-handling layer — that duplication is the caller's responsibility to avoid, not the macro's.
17. OpenTelemetry is deprecating exceptions-as-span-events in favor of exceptions-as-logs (`OTEL_SEMCONV_EXCEPTION_SIGNAL_OPT_IN`), and explicitly no longer recommends recording *handled* (non-escaping) exceptions on a span at all — the closest published analogue to "don't double-report an error you're also going to log," and it resolves in favor of recording it once, at the boundary, not on every span that saw it.
18. `indicatif::MultiProgress::suspend` is the documented mechanism for interleaving arbitrary terminal writes with a live progress bar: it hides all bars, runs your closure, redraws — but "the internal lock is held while `f` is executed," so it is meant for a `println!`/one-shot write, not for wrapping an entire tracing subscriber's write path.
19. The community answer to "progress bar and tracing subscriber fighting for the same terminal" is `tracing-indicatif`: an `IndicatifLayer` that creates a bar per active span, plus an `IndicatifWriter` you hand to `fmt::layer().with_writer(...)` so log lines print above the bars instead of corrupting them — this is the drop-in fix, not a hand-rolled mutex around stdout.
20. A user-facing `--debug`/`-v` flag and a bug-report bundle are different audiences with different budgets: the flag should raise `RUST_LOG`-equivalent verbosity for the current run's terminal (spans, no raw secrets, human-formatted); a bug-report bundle can and should be richer — full JSON-structured log capture to a file (never the TUI's own screen), because it is read by a developer offline, not scanned live by the user.

## Findings

### 1. The span tree

Root: one span per command invocation. Children, in the order the manifest-resolve-then-pull-N-layers flow actually executes:

```
grim_add (root span: run_id, subcommand="add", package)
├── resolve                      (repository, reference → resolved digest)
│   └── fetch_manifest            (repository, reference, media_type)
├── pull_layer [× N, concurrent]  (digest, media_type, size, attempt)
├── extract                      (digest, dest_path)
└── link                         (dest_path, target)
```

`resolve` and `fetch_manifest` are drawn as separate spans deliberately: resolving a tag to a digest and fetching the manifest body are two HTTP round-trips with independently interesting latencies (DNS/auth/redirect vs. transfer), and OTel's own HTTP semantic conventions instrument each HTTP attempt as its own span — see [§2](#2-one-span-per-layer-vs-events). Whether a given tool merges them into one span is a legitimate simplification for a v1, but the boundary should exist as a **field or child span**, not disappear, because "was it slow to resolve or slow to fetch the manifest" is exactly the question a debug flag exists to answer.

`extract` and `link` are per-package, not per-layer, because that's the actual unit of work: N layers pull concurrently into a shared cache, then extraction/linking happens once the full artifact is assembled. Putting them under the root, siblings of the `pull_layer` fan-out, mirrors the real dependency order (all pulls must complete before extract can start) — the span tree should not lie about ordering just to look tidy.

### 2. One span per layer vs. events

Model each layer pull as **its own span**, not as a log event under one big "pull all layers" span. Justification is not intuition — it's a direct analogue to OpenTelemetry's own HTTP client convention: instrumentations create a new span for every network attempt, and retries of the *same logical request* are new sibling spans distinguished by `http.request.resend_count`, not new events appended to one span:

> "Instrumentations SHOULD create an HTTP span for each attempt to send an HTTP request over the wire." — [OTel HTTP semantic conventions](https://opentelemetry.io/docs/specs/semconv/http/http-spans/)

Applied here: `pull_layer` is the span (one per layer, so N concurrent spans under the root), and a **retried** layer pull gets either a nested `attempt` span or an `attempt` field incremented on re-entry — not a single span that silently absorbs three failed attempts before succeeding, because that hides exactly the information ("it took 3 tries") a debug flag exists to surface.

The corollary: don't put transfer *progress* (bytes-so-far ticks) as tracing events at all. A span records "this operation happened, took this long, had these fields"; percent-complete ticks belong to a progress bar (see [§9](#9-progress-vs-tracing)), not the trace. Emitting one event per chunk received is the textbook example of a cardinality mistake — see [§5](#5-cardinality-and-cost).

### 3. Instrument and spawn

`#[instrument]` on an `async fn` is safe across `.await` because the generated code wraps the function body in a future and calls `Instrument::instrument`, which — per the trait's own docs — enters the span **on every poll** and exits when the poll returns, rather than entering once and holding a guard:

> "The attached `Span` will be entered every time the instrumented `Future` is polled." — [`tracing::Instrument` docs](https://docs.rs/tracing/latest/tracing/trait.Instrument.html)

The footgun this exists to prevent is documented directly on `Span::enter`:

> "Holding the drop guard returned by `Span::enter` across `.await` points will result in incorrect traces." — [`tracing::Span` docs](https://docs.rs/tracing/latest/tracing/span/struct.Span.html)

Two consequences for concurrent layer pulls:

- **Never** write `let _guard = span.enter(); some_async_call().await;` in a `pull_layer` implementation — use `#[instrument]` on the function, or `.instrument(span)` on the future you're about to `.await`.
- `tokio::spawn` starts a **new task with no parent span by default**. The `Instrument` docs give the exact failure mode:

  > "If the `my_future` span is enabled, then the spawned task will be within both `my_future` *and* `outer`... However, if `my_future` is disabled, the spawned task will *not* be in any span." — [`tracing::Instrument` docs](https://docs.rs/tracing/latest/tracing/trait.Instrument.html)

  For fan-out pulls (`tokio::spawn(pull_layer(...))` inside a loop, joined later), each spawned future must be explicitly `.instrument(tracing::Span::current())` (or `.in_current_span()`) *before* spawning, or the `pull_layer` spans become parentless siblings of the root instead of children — trace looks flat, and any span-scoped field set on the root (e.g. `run_id` recorded only as a span field rather than baked into every event) stops showing up on layer-pull log lines.

```rust
// wrong: spawned task is disconnected from the resolve/pull tree
for layer in layers {
    tokio::spawn(pull_layer(layer));
}

// right: explicit propagation across the spawn boundary
let parent = tracing::Span::current();
for layer in layers {
    tokio::spawn(pull_layer(layer).instrument(parent.clone()));
}
```

`Span::or_current()` is the variant to reach for in library code that doesn't know if it's already inside a span — it degrades to "use whatever span is current, or none" instead of panicking/erroring when there is no ambient span.

### 4. Field naming

Adopt OpenTelemetry semantic-convention names wherever one exists, for the same reason a package manager adopts SemVer instead of inventing a versioning scheme: every downstream consumer (log aggregator, APM, a human `grep`ping a bug-report bundle) already knows what `error.type` and `http.response.status_code` mean, and a field named `err_kind` or `status` means re-teaching every consumer per project.

Concretely mapped to this domain:

| Field on our spans | OTel equivalent | Source |
|---|---|---|
| manifest/root digest | `oci.manifest.digest` | [OTel OCI registry attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/oci/) |
| pull URL | `url.full` (credential- and signed-URL-redacted) | [OTel HTTP spans](https://opentelemetry.io/docs/specs/semconv/http/http-spans/) |
| registry host | `server.address` / `server.port` | [OTel HTTP spans](https://opentelemetry.io/docs/specs/semconv/http/http-spans/) |
| HTTP status of a pull | `http.response.status_code` | [OTel HTTP spans](https://opentelemetry.io/docs/specs/semconv/http/http-spans/) |
| retry counter | `http.request.resend_count` | [OTel HTTP spans](https://opentelemetry.io/docs/specs/semconv/http/http-spans/) |
| failure classification | `error.type` | [OTel HTTP spans](https://opentelemetry.io/docs/specs/semconv/http/http-spans/) |
| artifact filename/version (published packages) | `artifact.filename`, `artifact.version`, `artifact.hash` | [OTel artifact attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/artifact/) |

There is **no** OTel-defined attribute for: repository name, image/tag reference string, per-layer digest, media type, or uncompressed/compressed size — OCI's own semantic-convention namespace currently defines exactly one attribute, `oci.manifest.digest`. For everything else in that gap, still namespace consistently (`oci.repository`, `oci.reference`, `oci.layer.digest`, `oci.layer.media_type`, `oci.layer.size`) so the *shape* matches what OTel would eventually standardize, rather than mixing `repo`, `image`, and `pkg` across call sites in the same codebase.

`attempt` has no OTel-namespaced equivalent either (the convention is `http.request.resend_count`, 0-based-vs-1-based conventions differ by implementation) — pick one convention, document it once, and never let two call sites disagree on whether attempt 1 is "the first try" or "the first retry."

### 5. Cardinality and cost

Two different concerns get conflated under "cost," and they have different answers:

**Runtime cost of a span existing.** `tracing`'s architecture is built to make a *disabled* span/event cheap — subscribers register "interest" once per callsite and the check at each callsite is a fast filter lookup rather than a full re-evaluation of every directive, but no primary source consulted here states an exact number, and this document does not invent one. Treat "disabled instrumentation is cheap" as directionally reliable, not a specific nanosecond figure to put in a code comment.

**Compile-time elimination.** The static `max_level_*` / `release_max_level_*` Cargo features go further than runtime filtering — they remove disabled-level call sites from the binary entirely:

> "Trace instrumentation at disabled levels will be skipped and will not even be present in the resulting binary unless the verbosity level is specified dynamically." — [`tracing` level-filter docs](https://docs.rs/tracing/latest/tracing/level_filters/index.html)

For a CLI shipped as a prebuilt binary, `release_max_level_debug` (keep info/warn/error/debug, strip `trace!`) is a reasonable default if `trace!`-level output is genuinely never wanted in a release build; the trade-off is that no `RUST_LOG=trace` flag will ever produce anything at runtime past that compiled-in ceiling — verify the ceiling matches what the `--debug` flag promises (see [§10](#10-debug-flag-vs-bundle)) before shipping it.

**200-layer cardinality.** 200 `pull_layer` spans per run is not a cardinality problem by itself — it's 200 short-lived spans with a bounded set of field *names* and high-cardinality field *values* (digests), which is exactly what tracing/OTel spans are designed for. Cardinality becomes a real cost only when a high-cardinality value leaks into something aggregated per-distinct-value: a metric labeled by digest, or (subtler) a span *name* that embeds the digest instead of putting it in a field — `pull_layer{digest=…}` as one attribute on a stable-named span is fine; `pull_layer_sha256_abcd1234` as 200 distinct span names is not, because every downstream tool that groups/aggregates by span name now has 200 groups of size 1.

`skip_all` discipline matters at this volume for a mundane reason, not a cardinality one: a `pull_layer` function's arguments plausibly include a `&Layer` struct with a `Debug` impl that serializes its full descriptor. `#[instrument(skip_all, fields(digest = %layer.digest, size = layer.size))]` records only the two fields that matter instead of `Debug`-formatting the whole struct on every one of 200 spans.

### 6. Correlation

The OCI distribution spec defines exactly two correlation-relevant headers, neither of which is a general request-ID: `Docker-Content-Digest` (content-addressing, not correlation) and, for uploads only, `Docker-Upload-UUID` for matching a client's local upload state to server state. There is no distribution-spec-defined request-ID or trace-context header.

What actually correlates a client run with server-side registry logs is layered on top, from two directions:

- **Client → server, standardized**: [W3C Trace Context](https://www.w3.org/TR/trace-context/) defines `traceparent` (`version-traceid-spanid-flags`, e.g. `00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`) and `tracestate` headers a client can send on every registry HTTP call. Sending them costs one header and is forward-compatible with any registry that adopts OTel server-side tracing later; whether ghcr.io/ECR/GAR/Docker Hub currently honor them was not verified against each registry's own docs in this pass.
- **Server → client, platform-specific**: cloud-hosted registries return their own platform's request-ID header on every response — GHCR is fronted by GitHub's API surface, which conventionally returns `x-github-request-id`; AWS-hosted registries (ECR) return `x-amzn-RequestId`/`x-amzn-requestid` per AWS's general API error-handling convention. **These specific header names were not independently re-verified via a fetched primary source in this research pass** — treat them as high-confidence but citeless in this document, and confirm against the specific registry's current docs before hardcoding a header name into a client.

Practical design: generate one `run_id` (UUID or ULID) per command invocation, put it in the root span, and — separately — log whatever request-ID header the registry sends back on every HTTP response at `debug` level, tagged clearly as "registry request id" vs. "our run id." They are not the same identifier and conflating them in a bug report ("here's the request ID" — client's or registry's?) wastes a support round-trip.

### 7. Redaction

The structural fix, not the disciplinary one: credentials should be a type that **cannot** be `Debug`/`Display`-formatted, so that forgetting `skip()` on an `#[instrument]` argument is not a security incident. `secrecy`'s design is the reference pattern — `SecretString`/`SecretBox` require an explicit `ExposeSecret::expose_secret()` call to view the value, which:

> "helps mitigate the risk of sensitive information appearing in application logs or tracing spans" by making exposure "easy-to-audit" rather than implicit. — [`secrecy` docs](https://docs.rs/secrecy/latest/secrecy/)

Applied to registry auth: a bearer token, a basic-auth password, and a presigned-URL query string all belong in a type with no `Debug` impl (or a `Debug` impl that always prints `"[REDACTED]"`), not passed around as `String`. That makes `#[instrument(skip_all)]` a defense-in-depth backstop, not the only line of defense — the value literally cannot leak into a span field via an accidental `%`/`?` formatting even if someone adds `fields(token = ?token)` later.

For URLs specifically — the "presigned URL" case named in scope — OTel's own HTTP spec makes redaction a **MUST**, not a style preference:

> "`url.full` MUST NOT contain credentials passed via URL in form of `https://username:password@www.example.com/`. In such case username and password SHOULD be redacted" — and known signed-URL query parameters (AWS SigV4 `X-Amz-Signature`, Azure SAS `sig`, GCS signed-URL `Signature`) should be redacted while the key name is preserved. — [OTel HTTP spans](https://opentelemetry.io/docs/specs/semconv/http/http-spans/)

Concretely: a `pull_layer` span field for the blob-fetch URL should be produced by a redaction function that strips known signed-URL query parameters, never the raw `Url` passed straight into `%url`. The redaction function is the one place that needs a test; every call site downstream of it is then safe by construction.

### 8. Errors in spans

`#[instrument(err)]` and `#[instrument(ret)]` are independent options that each emit their own event:

> `ret` "will emit an event with the function's return value when the function returns"; combined with `err`, "will record returned values if and only if the function returns `Ok`"; `err`/`err(Display)` "will emit error events when the function returns `Err`." — [`tracing::instrument` docs](https://docs.rs/tracing/latest/tracing/attr.instrument.html)

Neither option is documented as suppressing a *separate* `error!`/`tracing::error!` call elsewhere for the same failure — the double-reporting hazard named in scope is real and is not something the macro guards against. If `pull_layer` is `#[instrument(err)]` **and** the caller that joins all N pulls also logs `error!("layer pull failed: {e}")` when a `JoinHandle`/`Result` comes back `Err`, the same failure is now recorded twice: once as the `err`-generated event at the point of failure, once again at the aggregation point. OpenTelemetry's own migration path for exception-recording resolves this in favor of **recording once**:

> exceptions that are handled and do not escape the scope of a span are "no longer recommended" to record on that span at all; the direction of travel is toward recording an error once, as a log, at the point it is finally handled — not on every span it passed through. — [OTel exceptions-on-spans (deprecated)](https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-spans/)

Practical rule for this codebase: `err` belongs on the span **closest to where the error originates** (the `pull_layer` call that actually failed the HTTP request) — that's a genuine occurrence, not a rethrow. Once it's wrapped and returned up through `resolve`/the root command, don't re-`#[instrument(err)]` every intermediate hop; let it surface once at the CLI's top-level error handler as the user-facing message. A span still *records* that it exited with an error status (that's structural, not a log line) even where `err` isn't set to also emit a redundant event.

### 9. Progress UI vs. tracing subscriber

Both a progress bar and a `tracing_subscriber::fmt` layer typically want stdout/stderr, and naively writing to it from both corrupts the terminal (a log line printed mid-frame splits a progress bar in two). Two real mechanisms exist, aimed at different situations:

- **One-shot interleaved writes**: `indicatif::MultiProgress::suspend(f)` — hides every bar, runs `f`, redraws. Documented cost: "the internal lock is held while `f` is executed. Other threads trying to print anything on the progress bar will be blocked until `f` finishes" — [indicatif docs](https://docs.rs/indicatif/latest/indicatif/struct.MultiProgress.html). This is for an occasional `println!`, not for wrapping a whole logging subscriber's write path per event — doing that would serialize every log write behind the progress-bar lock.
- **Continuous coexistence**: [`tracing-indicatif`](https://docs.rs/tracing-indicatif/latest/tracing_indicatif/) — an `IndicatifLayer` that creates/manages a progress bar per active span automatically (a `pull_layer` span *is* a progress bar, no manual bar bookkeeping in the pull code), plus an `IndicatifWriter` that the `fmt` layer writes through so log lines print above the bars instead of corrupting them. Setup is three lines: register `indicatif_layer` alongside `fmt::layer().with_writer(indicatif_layer.get_stderr_writer())` on `tracing_subscriber::registry()`.

For a full ratatui TUI (grim's `tui/`) rather than a plain progress bar, neither mechanism applies — the TUI owns the alternate screen buffer outright, and a `tracing_subscriber::fmt` layer writing to stderr mid-render will corrupt the raw-mode terminal regardless of locking. The correct default there, and the one `indicatif`'s own docs gesture at ("useful for external code that writes to standard output" — implying *not* the TUI's own render loop), is: **log to a file while the TUI is active**, never to the terminal, and let a `--debug` flag control the file's verbosity. This matches the general pattern used by `uv`, which routes all tracing output through an `EnvFilter`-driven subscriber to stderr with no TUI to fight — see [`uv`'s `logging.rs`](https://github.com/astral-sh/uv/blob/main/crates/uv/src/logging.rs), which is the simpler case (no TUI) but the same "own the write destination explicitly" principle.

### 10. Debug flag vs. bundle

These are different audiences and should not share one knob:

- **`--debug`/`-v` (interactive, this run, this terminal)**: raises verbosity for a human watching *right now*. Should be span/event output formatted for reading, never raw JSON, never secrets (redaction from [§7](#7-redaction) applies unconditionally — a debug flag is not an excuse to skip it), and should respect whatever the progress/TUI discipline from [§9](#9-progress-vs-tracing) requires (route through `tracing-indicatif`'s writer, or to a file if a TUI owns the screen).
- **Bug-report bundle (offline, a developer, not this terminal)**: can be strictly more — full span timing, structured JSON lines suitable for a script to parse, every field including ones too noisy for interactive use (per-attempt retry counts, exact byte counts, timing breakdowns per span) — because nobody is reading it live and its cost is disk space, not screen real estate. It should still apply the *same* redaction as the interactive path — "it's for support" is not a reason to relax [§7](#7-redaction); a bug-report bundle uploaded to a public issue tracker is a worse leak vector than a terminal, not a better one.

`uv`'s own verbosity levels are a reasonable model for the interactive side: distinct named levels for "debug this CLI crate specifically" vs. "trace everything, all dependencies" (`DebugUv`/`TraceUv`/`TraceAll` in its `Level` enum) rather than one undifferentiated `-vvv` counter — see [`uv`'s `logging.rs`](https://github.com/astral-sh/uv/blob/main/crates/uv/src/logging.rs).

## Normative guidance candidates

1. **One root span per command invocation; every span this run creates is a descendant of it.**
   Rationale: makes `RUST_LOG` output a tree, not a flat interleaved log, and gives every field on the root (`run_id`) automatic visibility on every child event.
   VERIFICATION: grep for top-level `#[instrument]` on the `main`/subcommand-dispatch functions; every other `#[instrument]`d function should be reachable from one of those, not called from a context with no ambient span.

2. **Every layer pull is its own span (`pull_layer`), not a log line under one big "pull all" span.**
   Rationale: matches OTel's own convention of one span per HTTP attempt; makes per-layer latency/failure independently visible instead of averaged into one bulk timer.
   VERIFICATION: grep the pull-layer function for `#[instrument]`; reading heuristic — can you answer "which of the 200 layers was slow" from the trace without cross-referencing log line order?

3. **Never hold a `Span::enter()` guard across an `.await`; use `#[instrument]` on async fns or `.instrument(span)` on the future.**
   Rationale: documented directly by `tracing` as producing incorrect traces — the guard doesn't re-enter across task-switch/poll boundaries.
   VERIFICATION: `grep -rn "\.enter()" --include=*.rs` and manually check none of the matches has an `.await` before the guard's drop; `clippy::await_holding_lock`-style reasoning applies conceptually even though there's no dedicated clippy lint for this specific guard type as of this research pass.

4. **Every `tokio::spawn`ed future inside an instrumented call chain is explicitly `.instrument(Span::current())` (or `.in_current_span()`) before spawning.**
   Rationale: spans do not propagate into spawned tasks automatically; an un-instrumented spawn silently orphans its events from the parent trace.
   VERIFICATION: grep for `tokio::spawn(` and check each match is immediately preceded by, or wraps its argument in, `.instrument(`.

5. **Field names follow OTel semantic conventions where one exists (`error.type`, `url.full`, `http.response.status_code`, `http.request.resend_count`, `oci.manifest.digest`); everything OCI-specific without an OTel equivalent gets a consistent `oci.*`-shaped name used identically at every call site.**
   Rationale: adopting a published convention means every consumer (aggregator, `grep`, future OTel export) already understands the field; inventing names means re-teaching every consumer per project and guarantees drift between call sites.
   VERIFICATION: grep all `fields(...)` / `%field_name` usages across `#[instrument]` call sites and diff the field-name set against a single constants module — flag any field name used at only one call site as a likely accidental synonym (`repo` vs `repository`).

6. **Credentials, bearer tokens, and presigned-URL query parameters are never a bare `String` passed through instrumented call chains — wrap them in a type with no `Debug`/`Display` impl (or one that always redacts), and redact known signed-URL parameters before any URL is recorded as a field.**
   Rationale: `skip()`/`skip_all` is a rule a future contributor can forget; a type with no `Debug` impl cannot leak via `%`/`?` formatting even by accident. OTel's own HTTP spec makes URL credential/signature redaction a MUST/SHOULD, not a style choice.
   VERIFICATION: grep for `Authorization`, `bearer`, `token`, `password` as raw `String`/`&str` fields on structs that also derive/implement `Debug`; grep `#[instrument]` call sites that take a `Url`/URL string argument and confirm it passes through a redaction function, not `%url` directly on the raw value.

7. **`#[instrument(err)]` goes on the span closest to where the error originates, not repeated at every hop the `Result` is propagated through; the CLI's top-level handler is the single place the user-facing failure is finally logged.**
   Rationale: prevents the same failure being recorded as an event at every layer of a `?`-propagated `Result`, matching OTel's own move away from recording the same exception at every span it passes through.
   VERIFICATION: reading heuristic — for a given error type, count how many `#[instrument(err)]`d functions are on its propagation path from origin to the CLI's exit code; more than one on the same unmodified `Result` is a double-report to fix.

8. **A per-layer span's fields are set via `#[instrument(skip_all, fields(digest = %layer.digest, size = layer.size, ...))]`, never by instrumenting the whole argument struct's `Debug` output.**
   Rationale: at 200 concurrent layers, an un-skipped argument with a verbose `Debug` impl multiplies a needless serialization cost by 200 and pollutes every span with fields nobody filters on.
   VERIFICATION: grep `#[instrument]` occurrences that lack `skip_all` or an explicit `skip(...)` and manually check whether the un-skipped arguments have non-trivial `Debug` impls.

9. **When a TUI (ratatui/raw-mode) owns the terminal, tracing output goes to a file, never to stdout/stderr; when only a progress bar (indicatif) is active, route the `fmt` layer through `tracing-indicatif`'s writer rather than writing to the bar's stream directly.**
   Rationale: a raw-mode TUI has no locking discipline with a separate writer at all — any direct terminal write corrupts the frame; `tracing-indicatif` is the maintained, documented fix for the simpler progress-bar case.
   VERIFICATION: grep for `tracing_subscriber::fmt` initialization and confirm its `.with_writer(...)` is either a file (when `tui::run` is reachable in the same binary) or `indicatif_layer.get_stderr_writer()`/`get_stdout_writer()` — never a bare `std::io::stdout()`/`stderr()` when either the TUI or a progress bar is also live.

10. **Static `max_level_*`/`release_max_level_*` features, if set, are set to match what `--debug`/`-v` actually promises the user — never ship a release binary where the flag claims a verbosity the compiled-in ceiling has already stripped.**
    Rationale: `tracing` compiles out instrumentation above the configured ceiling entirely; a mismatch between the advertised flag and the compiled ceiling is a silent, confusing dead end for a user who runs `--debug` and gets nothing.
    VERIFICATION: `grep -n "max_level" Cargo.toml` and cross-check the compiled-in level against every level the CLI's own `--help` text for the verbosity flag claims to support.

## AI-agent angle

An LLM asked to "add tracing to this function" defaults to sprinkling `#[instrument]` everywhere with no `skip`/`skip_all`, on every function including trivial getters, which is the exact anti-pattern §5's cost discussion warns against: at 200 concurrent layers, an un-skipped struct argument with a rich `Debug` impl means 200× the serialization cost, and it teaches the codebase's future contributors that `#[instrument]` with no thought is the norm. The mechanical check: `grep -rn "#\[instrument" --include=*.rs | grep -v "skip"` and read every hit — an `#[instrument]` with no `skip`/`skip_all` on a function whose arguments include a struct (not a `Copy` primitive) is worth a second look.

An LLM given "propagate this span across `tokio::spawn`" will very plausibly write the un-instrumented version (`tokio::spawn(pull_layer(layer))`) because that's what compiles and *looks* correct — nothing in the type system flags a silently-orphaned span. This is the single most likely correctness gap in this whole taxonomy for an autonomous agent to introduce, because the failure mode is invisible in code review (it compiles, it runs, the trace just silently loses its tree structure) and only shows up when someone actually inspects the trace output and finds `pull_layer` spans with no parent. Mechanical check: grep `tokio::spawn(` and confirm every match's argument is wrapped in `.instrument(`.

An LLM asked to "log the error" at multiple points along a `?`-propagated `Result` chain will add `#[instrument(err)]` at every hop plus an `error!` at the final handler, producing 3-4x duplicate log lines for one failure — because each individual addition looks locally correct and nothing forces the agent to trace the error's full propagation path before adding another log point. Mechanical check: for any error type, grep every `#[instrument(err` occurrence and every `error!(` call, then manually trace whether more than one fires for the same underlying failure on its way to the CLI's exit code.

## Contested / evolving

- **Exceptions-on-spans is mid-deprecation in OTel itself.** The spec [explicitly names an opt-in migration flag](https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-spans/) (`OTEL_SEMCONV_EXCEPTION_SIGNAL_OPT_IN=logs`/`logs/dup`) moving from "record exceptions as span events" toward "record as logs only." This document's §8 guidance (record once, at the origin, not at every propagation hop) is compatible with either end state, but if the ecosystem fully lands on logs-only, `#[instrument(err)]`'s span-event-per-failure model becomes the Rust-`tracing`-specific outlier relative to where OTel itself is heading — worth revisiting when `tracing-opentelemetry` catches up to that migration.
- **OTel's OCI/registry semantic-convention namespace is thin.** As of this research pass it defines exactly one attribute (`oci.manifest.digest`); repository name, layer digest, media type, and size have no standardized home yet. The `oci.*`-shaped naming this document recommends is a bet on where the convention will land, not a citation of an existing standard for those specific fields — expect the actual OTel registry namespace to grow and possibly diverge from a hand-rolled `oci.*` scheme.
- **No Rust OCI client in the ecosystem currently publishes a span design to converge on.** `oci-client`, the most-used Rust OCI client, uses bare `debug!`/`trace!`/`warn!` macros with no `#[instrument]` and no structured spans at all as of the version fetched during this research. There is no existing Rust prior art to defer to here; this document's span tree is original synthesis from `tracing`'s own docs and OTel's cross-language HTTP conventions, and should be treated as a proposal to validate against real trace output, not a transcription of established practice.
- **Exact registry request-ID header names (`x-github-request-id`, `x-amzn-RequestId`) were not re-verified against a fetched primary source in this pass** — cited from general knowledge of each platform's conventions, not confirmed against ghcr.io's or ECR's current API docs specifically. Treat as needing a direct-source check before being hardcoded into a client's correlation logic.
- **No authoritative source consulted gives an exact overhead number for a disabled span/event.** Multiple `tracing` ecosystem sources assert disabled instrumentation is cheap (interest-caching architecture), but this document deliberately does not repeat a specific nanosecond/cycle figure because none was found in a primary source during this pass — a benchmark-backed number, if needed, should come from running `tracing`'s own bench suite against the target codebase's actual callsite shapes, not a quoted figure from unrelated context.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [docs.rs/tracing `#[instrument]`](https://docs.rs/tracing/latest/tracing/attr.instrument.html) | Primary API docs, `tracing` crate | current (0.1.x, 2026) | Defines `skip`/`skip_all`, `err`/`ret`, field-recording syntax — the macro this whole taxonomy is built on |
| [docs.rs/tracing `Span`](https://docs.rs/tracing/latest/tracing/span/struct.Span.html) | Primary API docs | current | Documents the `Span::enter()`-across-`.await` footgun directly, in the maintainers' own words |
| [docs.rs/tracing `Instrument` trait](https://docs.rs/tracing/latest/tracing/trait.Instrument.html) | Primary API docs | current | Documents exactly what `tokio::spawn` does and does not inherit re: spans — the source for §3's central claim |
| [docs.rs/tracing level_filters](https://docs.rs/tracing/latest/tracing/level_filters/index.html) | Primary API docs | current | Static `max_level_*`/`release_max_level_*` feature semantics and compile-time elimination |
| [OTel semantic conventions: HTTP spans](https://opentelemetry.io/docs/specs/semconv/http/http-spans/) | Primary spec, OpenTelemetry | current, actively versioned | Retry-as-new-span convention, `http.request.resend_count`, mandatory URL-credential/signed-URL redaction — the strongest cross-domain precedent used in this document |
| [OTel semantic conventions: OCI registry attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/oci/) | Primary spec | current | The one standardized OCI-specific attribute (`oci.manifest.digest`); shows how thin this namespace still is |
| [OTel semantic conventions: artifact attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/artifact/) | Primary spec | current | Adjacent published-package attributes (`artifact.filename`, `artifact.version`, `artifact.hash`) relevant to a package manager specifically |
| [OTel exceptions-on-spans (deprecated)](https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-spans/) | Primary spec, marked deprecated | current, mid-migration | Direct precedent for "don't double-record a handled error"; documents the industry's own move away from that pattern |
| [W3C Trace Context](https://www.w3.org/TR/trace-context/) | W3C Recommendation | stable standard | `traceparent`/`tracestate` header format for propagating a client trace ID into registry HTTP calls |
| [OCI Distribution Spec HTTP API](https://distribution.github.io/distribution/spec/api/) | Primary spec | current | Establishes there is *no* distribution-spec-defined request-ID header — only `Docker-Content-Digest` and `Docker-Upload-UUID` |
| [`oci-client` docs.rs page + `client.rs` source](https://docs.rs/oci-client/latest/oci_client/) | Reference Rust OCI client, primary source | 0.17.x, 2026 | Confirms the ecosystem's own reference client has no span design to inherit — bare log macros only |
| [`indicatif::MultiProgress::suspend`](https://docs.rs/indicatif/latest/indicatif/struct.MultiProgress.html) | Primary API docs | current | Documents the lock-held-during-`f`-execution cost of the one-shot terminal-interleaving mechanism |
| [`tracing-indicatif` docs.rs page](https://docs.rs/tracing-indicatif/latest/tracing_indicatif/) | Primary crate docs | current | The maintained fix for progress-bar/tracing-subscriber terminal contention; `IndicatifLayer`/`IndicatifWriter` setup |
| [`secrecy` docs.rs page](https://docs.rs/secrecy/latest/secrecy/) | Primary crate docs | current | Structural (type-level) redaction pattern — `ExposeSecret` as the only path to a secret's value — the basis for §7's normative rule |
| [`uv` `logging.rs` source](https://github.com/astral-sh/uv/blob/main/crates/uv/src/logging.rs) | Primary source, real production Rust CLI | current (2026) | A real package manager's actual `tracing_subscriber` setup: `EnvFilter`, stderr-only output, named verbosity levels instead of a raw `-vvv` counter |

---
title: "Package-manager domain: bounded ingestion, registry resilience, batch reporting"
topic: rust-domain-package-manager
model: opus
consolidates:
  - .agents/research/rust-domain-package-manager/bounded-ingestion-and-untrusted-arithmetic.md
  - .agents/research/rust-domain-package-manager/registry-resilience-timeouts-and-retries.md
  - .agents/research/rust-domain-package-manager/batch-partial-failure-reporting.md
  - .agents/research/ocx-codebase-audit/errors-async-security.md
  - .agents/research/ocx-codebase-audit/exit-codes-and-cli.md
  - .agents/research/ocx-codebase-audit/crate-architecture.md
date: 2026-08
---

# Package-manager domain: bounded ingestion, registry resilience, batch reporting

## Verdict

These three subareas are one pipeline: `N items → registry HTTP → untrusted bytes → local
state → one exit code`. They are grouped because a defect in any of them surfaces the same
way — the tool reports success it did not achieve, or hangs forever, or eats the machine.

1. **Every number that arrives from a registry, an HTTP header, or an archive header is
   hostile until clamped.** `checked_*`/`try_from` on the ingestion path is not a style
   preference; release builds wrap silently while debug builds panic, so the bug is invisible
   in exactly the build an agent tests in.
2. **The lints that catch this stay scoped to ingestion modules, never repo-wide.**
   `arithmetic_side_effects` and `as_conversions` are `restriction`-group, allow-by-default,
   and deliberately noisy. A repo-wide `deny` gets switched off within a week; a
   `#![deny(...)]` on `src/oci/`-shaped modules survives.
3. **The digest must cover exactly the bytes that end up at the final path.** The two
   sub-researchers appear to conflict — one mandates hash-as-you-write per chunk, the other
   mandates re-hashing the whole file from byte 0 on a resume. They are the same rule at two
   scales: hash-as-you-write for a single-pass transfer, re-hash from disk whenever bytes
   from a *previous process run* are part of the artifact. Disk state between runs is
   untrusted input.
4. **One `reqwest::Client`, built in one place.** Every ad hoc `Client::new()` loses the
   timeouts, the retry policy, the pool config, and the SSRF-guarded resolver *simultaneously*.
   ocx already proves the shape; grimoire has 4 bypassing sites. This is the single
   highest-leverage rule in the document because it is a one-line CI grep.
5. **Timeouts are per call *shape*, not one number.** `Client::timeout` is a total deadline
   and cannot bound both a 20 KB manifest GET and a 4 GB blob stream. `connect_timeout` +
   `read_timeout` on the shared client; an explicit short `tokio::time::timeout` on
   size-bounded calls; nothing extra on streams.
6. **Retry safety is decided by HTTP verb, not by convenience.** GET/HEAD/PUT-by-digest are
   replayable. Session-`POST` and chunk-`PATCH` are not, by OCI spec. An ambiguous `PATCH`
   failure means restart-whole from a fresh `POST` — and the type system should make the
   wrong thing impossible (the `PATCH` fn consumes the session handle).
7. **`401` never goes through the generic retry policy.** It gets a dedicated single-flight
   refresh with a hard one-shot rule. Folding it into retry produces an infinite loop or
   credential-hammering, both of which only appear under concurrency the agent never tests.
8. **A batch of N items returns N outcomes.** One shared `BatchReport { succeeded, failed,
   skipped }` across `install`/`update`/`pull`/`prune`. A scalar `Result<(), E>` over
   independent items is a type-level bug that forces every implementation to either abort
   early or lie.
9. **Continue-and-collect is our default, against cargo's precedent.** `cargo install`
   defaults to fail-fast with `--keep-going` as opt-in because compiling a doomed graph is
   expensive. Pulling independent packages from a registry is cheap per item and the partial
   cache is a valid, resumable state — so we invert cargo's default and require the choice to
   be stated in a doc comment either way.
10. **Partial success is nonzero, classified by the worst failure, with no new exit code.**
    No surveyed tool (git, curl, ripgrep, gh, docker, cargo) has a partial-success code and
    neither does sysexits. The existing 0/1/64–81 taxonomy is the whole answer; `--json`
    carries the "which 2 of 50" granularity.
11. **`overflow-checks = true` in release, decided at group level by `rust-security.md` §5,
    stands.** The ingestion researcher's counter-argument (a panic on hostile input is a DoS)
    applies to daemons; we ship a CLI where a crash is a rejected input. It is a net behind
    explicit `checked_*`, never a substitute for it.
12. **The biggest new build is cancellation.** Neither grim nor ocx installs a SIGINT handler
    at all. Every other rule here is a tightening of something that exists; PKG-27 is
    greenfield.

## The ruleset

Verification commands assume repo root. `MUST` = blocks merge. `SHOULD` = blocks merge absent
a written exception. `CONSIDER` = raise in review. "Ingestion path" means every module between
the registry response and the verified artifact at its final path.

### Bounded ingestion and untrusted numbers

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| PKG-01 | On the ingestion path, every `+ - * <<` whose operand traces to a manifest field, HTTP header, or archive header uses `checked_*`, `saturating_*`, or `try_from` with a typed error on failure. | Release wraps silently, debug panics — the same expression has two behaviours chosen by the *user's* build profile, not the author's ([corrode.dev](https://corrode.dev/blog/pitfalls-of-safe-rust/)). | `#![warn(clippy::arithmetic_side_effects)]` as an inner attribute on ingestion modules; read every hit in the PR diff. | MUST |
| PKG-02 | Scope `clippy::arithmetic_side_effects` and `clippy::as_conversions` to ingestion modules via inner attributes. Never enable either in `[workspace.lints]` or `clippy.toml`. | Both are `restriction`-group and fire on trusted loop counters too; repo-wide `deny` produces false-positive fatigue that ends with the lint deleted, not the bugs fixed ([clippy docs](https://rust-lang.github.io/rust-clippy/master/index.html#arithmetic_side_effects)). | `grep -rn 'arithmetic_side_effects\|as_conversions' clippy.toml Cargo.toml crates/*/Cargo.toml` returns nothing; the names appear only inside `#![...]` in ingestion files. | MUST |
| PKG-03 | No `as` for numeric narrowing or signed↔unsigned conversion on the ingestion path. Use `u32::try_from(x)?` / `usize::try_from(x)?`. | `len as u32` silently keeps the low bits of `2^32 + n`; `u64 as usize` is correct on 64-bit and wrong on the 32-bit Windows target this project ships binaries for. | `#![deny(clippy::as_conversions)]` scoped per PKG-02; backstop `grep -rn ' as u\| as i\| as usize' <ingest dirs>`. | MUST |
| PKG-04 | Never pass a declared length to `Vec::with_capacity` / `String::with_capacity` / `HashMap::with_capacity` / `BufWriter::with_capacity`. Clamp against a named `MAX_*` first, then `try_reserve`, then grow incrementally as bytes actually arrive. | `with_capacity` panics or aborts on an allocation it cannot satisfy — there is no `Result` to catch. `try_reserve` alone still honours any number under `isize::MAX` ([std docs](https://doc.rust-lang.org/std/vec/struct.Vec.html#method.try_reserve)). | `grep -rn 'with_capacity(' <ingest dirs>` — every hit's argument is a compile-time constant or a value already clamped in the same function. | MUST |
| PKG-05 | Every decompression step enforces two independent caps: an absolute output-byte cap via `Read::take`/`AsyncReadExt::take` wrapping the **decompressor's output**, and an expansion-ratio cap (`compressed_len * MAX_RATIO`); use the tighter. | Ratio-only and cap-only are each independently bypassable; 42.zip reaches 100M:1 and Zip64 variants exceed that ([zip bomb](https://en.wikipedia.org/wiki/Zip_bomb)). Neither `flate2` nor `zstd` bounds output for you. Capping the *compressed* reader only limits download size, which was never the risk. | `grep -rn '\.take(' <ingest dirs>` shows a cap on each `GzDecoder`/`zstd::Decoder` output; `grep -rn 'MAX_EXPANSION_RATIO\|MAX_.*_BYTES'` shows both constants defined together. | MUST |
| PKG-06 | Apply the per-entry decompressed-size cap to every archive entry *and* enforce a separate hard cap on entry count per archive, incremented with `checked_add`. | One 5 GB member and a million 5 KB members are different attacks; the per-entry cap catches only the first. `tar`'s streaming design bounds per-entry memory, not cumulative extraction cost ([tar docs](https://docs.rs/tar/latest/tar/struct.Archive.html)). | `grep -rn 'MAX_ARCHIVE_ENTRIES' <ingest dirs>` — a counter checked against it once per `entries()` iteration. | MUST |
| PKG-07 | Treat `Content-Length` and every declared size field as a sizing *hint*. The real bound is enforced by counting bytes actually read through `.take(cap)`. | The header can be absent, wrong, or reflect pre-decompression size while the body is auto-decoded ([reqwest docs](https://docs.rs/reqwest/latest/reqwest/struct.Response.html#method.content_length)) — a hostile mirror lies in either direction. | `grep -rn 'content_length()' src/` — every use feeds a `.min(MAX_*)` clamp or a `try_reserve`, never a bare allocation and never the only limit on the read loop. | MUST |
| PKG-08 | Hash bytes in the same loop iteration that writes them; write to a temp path in the target directory; compare the digest; only then rename. Delete the temp on any failure. | This is oci-client's own `pull_blob` shape — `Digester::update` alongside `write_all`, compared after the stream ends ([client.rs](https://raw.githubusercontent.com/oras-project/rust-oci-client/main/src/client.rs)). The temp indirection is what stops unverified bytes ever being reachable under their final name. Reuse `utility::fs::persist_temp_file`, do not re-derive it. | `grep -rn 'rename\|persist' <ingest dirs>` — every hit is preceded in the same function by a digest comparison that returns early on mismatch. | MUST |
| PKG-09 | A partial/range fetch is never treated as digest-verified. A resumed download re-hashes the **complete reassembled file from byte 0** before publish, not the newly-fetched suffix. | oci-client documents that `pull_blob_stream_partial` does not verify the digest. A resumed suffix hashing correctly proves nothing about a prefix that may have been truncated between process runs — disk state across runs is untrusted input. *(Resolves the apparent conflict between the ingestion doc's hash-as-you-write and the resilience doc's re-hash-whole: PKG-08 covers single-pass, PKG-09 covers resumed.)* | Read the verification call's argument: it must be the whole file handle, never a variable scoped to "bytes downloaded this attempt". | MUST |
| PKG-10 | Bound concurrent blob downloads with `Arc<tokio::sync::Semaphore>` sized from a named constant; bound every inter-task chunk pipeline with `mpsc::channel(N)`. `unbounded_channel` is banned on the ingestion path. | N-way parallelism is a peak-memory multiplier regardless of per-download streaming discipline; an unbounded channel relocates the uncapped allocation from "one bad header" to "one slow consumer". Extends the existing house rule ("channels bounded by default, unbounded only with justification"). | `grep -rn 'unbounded_channel' <ingest dirs>` returns zero; `grep -rn 'Semaphore::new(' <ingest dirs>` shows a named constant, not a literal. | MUST |
| PKG-11 | Every limit is a named constant with a one-line rationale comment, a stated configurability decision, and a dedicated typed error variant carrying the limit and the offending value (`LayerTooLarge { limit, actual }`). | A limit trip is a decision point for the caller — hostile input (stop) versus transient I/O (retry). A generic `io::Error` or `anyhow!` erases that distinction. Slots into the existing per-subsystem `error.rs` + `#[non_exhaustive]` + `ClassifyExitCode` convention. | `grep -rn '^const MAX_' <ingest dirs>` cross-referenced against the module's error enum — every constant has a variant naming it. | MUST |
| PKG-12 | Pin `tar >= 0.4.45` and record in code which size field wins when a PAX extension and the base header disagree. | [RUSTSEC-2026-0068 / CVE-2026-33055](https://rustsec.org/advisories/RUSTSEC-2026-0068.html): tar-rs ≤0.4.44 ignores the PAX size header when the base header is nonzero, producing a parser differential against Go's `archive/tar` for the same bytes. | `cargo tree -i tar` shows ≥0.4.45; `cargo deny check advisories` clean. | SHOULD |

### Registry resilience

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| PKG-13 | Exactly one function constructs the `reqwest::Client`. No other module calls `Client::new()`, `Client::builder()`, or `ClientBuilder::new()`; every call site is injected the built client. | An ad hoc client silently loses the timeouts, the retry wiring, the pool config, and the SSRF-guarded resolver at once — four rules broken by one convenience. | `grep -rn 'reqwest::Client::new()\|reqwest::Client::builder()\|ClientBuilder::new()' --include='*.rs' src/` returns hits only in the one designated builder file. Wire as a CI gate, not a review heuristic. | MUST |
| PKG-14 | The shared client sets `connect_timeout`, `read_timeout`, and an explicit finite `pool_max_idle_per_host`. None may be left at reqwest's default. | `None` on either timeout is an unbounded hang — a black-holing firewall or a registry that goes silent mid-body blocks the CLI forever with no signal. `pool_max_idle_per_host` defaults to `usize::MAX`, so a long-running TUI accumulates idle sockets ([ClientBuilder docs](https://docs.rs/reqwest/latest/reqwest/struct.ClientBuilder.html)). | Unit test asserting the built client's config carries `Some` for both timeouts (copy ocx_lib's `production_client_config_carries_the_registry_read_timeout`); `grep -n 'pool_max_idle_per_host' <builder file>`. | MUST |
| PKG-15 | A whole-request `.timeout()` is set only on size-bounded calls (manifest GET/PUT, HEAD, tag list, token exchange). Streaming blob transfers rely on `connect_timeout` + `read_timeout` alone. | One number cannot bound both a 20 KB metadata call and a multi-GB blob: too short breaks large transfers, too long lets a hung manifest GET stall the CLI for minutes. Note `read_timeout`'s two semantics — a hard deadline until the first body byte, a per-frame idle bound after it. | Review heuristic: no request that reaches `.bytes_stream()` also carries a `.timeout(` wrap; every `.timeout(` site sits on a call whose response body is size-bounded. | MUST |
| PKG-16 | Retry is one policy value — retryable set `{429, 503, 502, 504}` plus transport errors (`is_connect()`, `is_timeout()`), full jitter (`random(0, min(cap, base·2^n))`), an attempt cap, a total wall-clock cap, and a `Retry-After` override. No inline retry loops; no status matching outside the one classifier. | Scattered loops drift — one honours `Retry-After`, another doesn't; one caps attempts, another doesn't. Backoff growth alone does not bound total latency, hence three independent caps. Full jitter is AWS's best-ranked formula on work-to-time ([AWS](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)); the server's own `Retry-After` always wins over a computed delay ([RFC 9110 §10.2.3](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after)). | `grep -rn 'StatusCode::' --include='*.rs' src/ \| grep -v <classifier module>` returns nothing; `grep -rn 'loop {' src/ \| grep -i retry` returns nothing outside the policy type. | MUST |
| PKG-17 | Never wrap a session-`POST` or a chunk-`PATCH` in the generic retry helper. An ambiguous failure on either abandons the session and restarts whole from a fresh `POST`. | OCI requires chunks in order; a replayed `PATCH` is rejected `416`, and the client cannot know from an ambiguous failure how many bytes the server committed ([distribution-spec](https://github.com/opencontainers/distribution-spec/blob/main/spec.md)). Only a fresh session has defined start-from-zero semantics. | Make the `PATCH`-issuing function consume the session handle **by value**, so re-invoking against a used session is a compile error rather than a review finding. Backstop: classify the HTTP method at every retry-helper call site. | MUST |
| PKG-18 | `401` is handled by a dedicated auth path, never the generic retry policy: single-flight refresh shared across concurrent callers, exactly one refresh-and-retry per original request, and proactive refresh before `expires_in` on transfers that can outlive a token. | A bare `if 401 { retry }` either loops forever on the same expired token or fires N concurrent token-endpoint round trips that 429 the auth server ([token auth spec](https://distribution.github.io/distribution/spec/auth/token/)). A 401 that recurs after a fresh token is a hard failure. | `grep -rn 'UNAUTHORIZED\|401' src/` — the handling sits outside anything the retry policy wraps, and a one-shot flag or counter sits between the check and the re-attempt (never a bare `continue`). | MUST |
| PKG-19 | The shared client's DNS resolver is always the SSRF-guarded resolver on any path that can reach a config- or registry-influenced host. | A client built without it reopens the resolve→validate→connect TOCTOU window that DNS rebinding exploits. This is a security property riding on the same one-client discipline as the timeouts. | `grep -n 'dns_resolver\|GuardedResolver' <builder file>` present on every production construction path. A reachable client without it is a security finding. | MUST |
| PKG-20 | Retry attempts are visible on every interface: one overwritten status line on a TTY, one structured event per attempt in `--json`, one plain line per attempt in non-TTY logs. Never silent, never carriage-return control codes in a pipe. | A >1s unexplained stall reads as a hang; CR spinners corrupt CI logs; automation built on `--json` needs the same visibility a human gets. | Review the retry policy's notify hook for all three branches; assert in a test that a non-TTY run emits no `\r`. | SHOULD |

### Batch operations and partial failure

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| PKG-21 | Every command operating on N independent items returns one shared `BatchReport<Item, T, E> { succeeded, failed, skipped }`. A scalar `Result<(), E>` over N independent items is banned, as are per-command bespoke report structs. | A scalar return type structurally cannot say "47 succeeded, 3 failed", so every implementation is forced to choose between aborting early and lying. One type means one JSON schema, one exit-code derivation, one renderer across `install`/`update`/`pull`/`prune`. `skipped` is a distinct bucket from `failed` because a skipped item's installer never ran — a user retrying needs that distinction. | `grep -rn 'struct.*Report\|struct.*Summary' src/` — any command-local type carrying succeeded/failed fields is a finding. | MUST |
| PKG-22 | Inside a loop or fan-out over independent items: no bare `?` on a per-item call, no `.ok()`/`let _ =` discarding a per-item `Result`, no `collect::<Result<Vec<_>, _>>()`, no `try_join_all`, no `JoinSet::join_all()`. Accumulate every outcome into `Vec<(Item, Result<T, E>)>`, draining a `JoinSet` with `while let Some(res) = set.join_next_with_id().await`. | These are five spellings of one bug. `?` and `collect::<Result<_>>` short-circuit by documented contract ([std docs](https://doc.rust-lang.org/std/result/enum.Result.html)); `try_join_all` cancels every other in-flight future; `JoinSet::join_all()` *panics* and cancels the rest on any `JoinError` — the opposite of `futures::join_all` despite the name ([JoinSet docs](https://docs.rs/tokio/latest/tokio/task/struct.JoinSet.html)). `.ok()` is the shipped, audited `dd` bug: a full disk silently produced a half-written destination ([corrode.dev](https://corrode.dev/blog/bugs-rust-wont-catch/)). A deliberate swallow uses the existing `ResultExt::ignore` plus a comment, never a bare `.ok()`. | `grep -rn '\.join_all()\|try_join_all(\|collect::<Result<' --include='*.rs' src/` — every hit must be on genuinely order-dependent items. `grep -rn '\.ok();\|let _ = ' src/` — every hit inside a loop body needs a justification comment. | MUST |
| PKG-23 | Every batch function's doc comment states which of fail-fast / continue-and-collect / transactional it uses and why, answered against three questions: is partial application a valid state, is re-running convergent, does item K's failure invalidate K+1. Default for independent items is continue-and-collect. | The four failure shapes are what happens when nobody made the decision on purpose. We invert cargo's fail-fast default (`--keep-going` is its opt-in, [cargo book](https://doc.rust-lang.org/cargo/commands/cargo-install.html)) because compiling a doomed graph is expensive while pulling an independent package is cheap and the partial cache is valid and resumable. The lockfile/manifest write that *records* the batch stays transactional (write-temp, fsync, rename) even when the downloads feeding it are not. | Read the doc comment. Absence is the finding — no particular choice is. | MUST |
| PKG-24 | The process exit code for a batch is the **worst** classified failure among `failed` items, via the existing `classify()`/`ClassifyExitCode` chain, falling back to `Failure` (1) only for genuinely mixed kinds. Never a new "partial success" code. Never derived from counting items or from progress-bar state. | 48-of-50 must never exit 0 — that is the audited `chmod -R` bug at the process boundary ([corrode.dev](https://corrode.dev/blog/bugs-rust-wont-catch/)). No surveyed tool and no sysexits value covers partial success, so inventing a 15th code is surface nobody scripts against. A progress counter ticks on *completion*, not on *success*; reading it to decide the exit code re-creates the scalar-signal bug at the UI layer. | Read the final `ExitCode` derivation: it walks `BatchReport::failed` through `classify()` and takes the worst. `grep -rn 'ProgressBar::position\|\.length()' src/` — any hit feeding a branch or an exit code is a finding. | MUST |
| PKG-25 | `--json` batch output is always `{ "summary": {...}, "items": [...] }` — `summary.status` ∈ `success`/`partial_failure`/`failure`/`cancelled`, per-item `status` ∈ `succeeded`/`failed`/`skipped`, `summary.exit_code` mirroring the process code, per-item errors reusing grim's existing error-slug envelope. Never a bare array; never truncated. | A script must branch on one field without counting the array or diffing schemas between `install` and `pull`. The schema is a direct serialization of `BatchReport`, not a parallel shape that can drift. | One shared schema snapshot test (`insta` or a JSON-Schema validator) run against every batch command in CI, not eyeballed per command. | MUST |
| PKG-26 | Terminal rendering of batch failures truncates to a fixed head (20) plus a `… and N more failures (see --json)` trailer. `--json` is never truncated. | 200 raw error chains on stderr buries the summary line that already gave the signal; rustc/cargo's "aborting due to N previous errors" is the convention. Untrusted item names in that output go through the terminal sanitizer (see `rust-security.md` SEC-31) — a batch multiplies that CWE-150 surface by N. | A test constructing >20 failures asserts the trailer appears and that `--json`'s item count still equals `summary.total`. | SHOULD |
| PKG-27 | On SIGINT mid-batch: stop spawning new items, let in-flight atomic writes either complete or abandon their temp file without touching the final path, and emit a report where every unattempted item appears in `skipped` with `SkipReason::Cancelled` and `summary.status` is `cancelled` — distinct from `partial_failure`. | "The user hit Ctrl-C" and "the tool finished with failures" call for different recovery actions. Cancel-safety here is a *consequence* of PKG-08's write-temp-then-rename discipline, not a separate mechanism — the worst case is an orphaned temp file the next GC pass removes. | Integration test that signals mid-batch and asserts every item is accounted for, none silently absent. | MUST |
| PKG-28 | Retries-exhausted-on-transient (`TempFail`, 75) and hard not-found (`NotFound`, 79) resolve to different exit codes, in every binary in the family. | A CI wrapper needs to distinguish "try again later" from "this will never succeed" without parsing stderr text. Both codes already exist and are tested; the rule is that no batch or retry path collapses them into a generic `1`. | A test asserting the two variants classify to distinct integers; `grep -rn 'process::exit(' src/` returns nothing outside the one boundary. | MUST |

## Applied to OCX

### Already satisfied

- **PKG-13/14/15/19/20 — in ocx only.** `ocx_lib` funnels every client through one
  `ClientBuilder` (`/home/mherwig/dev/ocx/crates/ocx_lib/src/oci/client/builder.rs`), which
  carries the `read_timeout` empirical writeup, the `ssrf_guard` → `reqwest::dns::Resolve`
  hook, and a passing regression test
  (`stalled_response_body_read_returns_instead_of_hanging`). `ocx_lib` has 22
  `tokio::time::timeout` sites (audit `errors-async-security.md` §3).
- **PKG-17.** ocx_lib implements and tests restart-whole exactly:
  `transient_patch_failure_restarts_the_upload_and_commits_once` — a `503` on one chunk
  `PATCH` triggers a fresh `POST`, never a resume, and the blob commits once
  (`.../oci/client/builder.rs`).
- **PKG-19 reference.** `ocx_lib/src/oci/ssrf.rs:38-68` — `#[non_exhaustive] enum SsrfError`
  with `#[source]` chaining and a `ClassifyExitCode` impl mapping each variant, plus the
  `GuardedResolver` that re-validates every resolved address at connect time with
  `trusted_hosts` as a scoped escape hatch (audit §7).
- **PKG-08 (mechanics half).** `tempfile`/`NamedTempFile` is universal (90 ocx_lib / 70
  grimoire / 52 ocx-mirror files); atomic write-via-`persist`/`rename` appears 31× in ocx_lib
  and 19× in grimoire; `sha2` in 65/47/19 files with dedicated digest-mismatch variants in
  25/8/4 (audit §6, §7). `utility::fs::persist_temp_file` and
  `utility::fs::rename_with_windows_retry` already exist as the house helpers
  (`rules-inventory.md` §helper-catalog) — PKG-08 reuses them, it does not add a primitive.
- **PKG-11 (typing half), ocx and grimoire.** 15 per-subsystem `error.rs` files in ocx_lib,
  `#[non_exhaustive]` at 82/66 hits, `#[source]`/`#[from]` at 114/43 and 45/23 (audit §1).
  New `IngestError` variants slot into an existing convention.
- **PKG-28.** `TempFail = 75` and `NotFound = 79` are both implemented, produced and tested in
  both binaries — grim `error.rs:449` / ocx `classify.rs:556` for 75, grim `error.rs:263` and
  `test/tests/test_exit_codes.py:42` for 79 (`exit-codes-and-cli.md` §1).
- **PKG-10 (policy half).** The existing async rules already say "channels bounded by default
  (`mpsc::channel(N)`), unbounded only with justification" (`rules-inventory.md` §async
  conventions). PKG-10 upgrades "with justification" to "banned" on the ingestion path only.

### Violated

- **PKG-13, grimoire.** Four ad hoc client-construction sites — `grimoire/src/catalog/forge.rs`
  (three `reqwest::Client::new()` plus a `Client::builder()`, including
  `catalog/forge.rs:263 fn build_client`), `src/auth/verify.rs`, `src/catalog/index_source.rs`
  — plus two more in the vendored `external/rust-oci-client/src/client.rs`
  (`crate-architecture.md` §7 counts ocx 3 / grimoire 4). Every one bypasses the timeouts, the
  pool, and the SSRF resolver simultaneously.
- **PKG-14/15, grimoire.** 2 `tokio::time::timeout` sites against grimoire's whole network
  surface versus ocx_lib's 22 (audit §3; ranked smell #5). Unbounded-wait risk against a slow
  or hostile registry.
- **PKG-19, grimoire and ocx-mirror.** No SSRF module exists in either (audit §7), while both
  dereference registry/index URLs the same way ocx does.
- **PKG-22.** 95 `JoinSet` sites in ocx_lib, 27 in grimoire, 5 in ocx-mirror (audit §3). Every
  `.join_all()` receiver among them is a candidate instance of the panic-and-cancel bug and
  should be the first sweep when this rule lands.
- **PKG-11, ocx-mirror.** Zero `thiserror` derives anywhere in `ocx-mirror/src`; `anyhow!()`
  used even in library-shaped `pipeline/`/`command/` modules (audit smell #2). A limit trip
  there cannot be typed, so it cannot be classified to an exit code.
- **PKG-24/28, ocx_schema.** `ocx_schema/src/main.rs:15` raw `process::exit(1)` for what is a
  usage error (should be 64), entirely outside the taxonomy
  (`exit-codes-and-cli.md` §2).
- **PKG-26, grimoire.** `grimoire/src/main.rs:191` writes `{err:#}` straight to stderr with no
  `sanitize_for_terminal` equivalent, unlike `ocx_cli/src/main.rs:20-27` +
  `api/data.rs:164` (audit smell #1). Batch rendering multiplies this by N registry-sourced
  item names.

### New commitments

- **`BatchReport` does not exist.** No shared succeeded/failed/skipped type in any of the three
  codebases. PKG-21 is a new type plus a migration of `install`/`update`/`pull`/`prune`.
- **No batch `--json` schema.** grim has a mature single-error envelope
  (`grim/main.rs:220-265`, `docs/src/json-interface.md`) with slug/reason/retryable/forceable;
  ocx has result-shaped `DataInterface` output but no structured error document at all
  (`exit-codes-and-cli.md` §4). PKG-25 extends grim's envelope to a batch wrapper and
  back-ports the error document to ocx.
- **No SIGINT handling anywhere.** grim and ocx install no Ctrl-C handler; no code path returns
  130; `.abort()`/`CancellationToken` totals 13 hits across all three codebases with no
  process-wide coordinator (audit §5, `exit-codes-and-cli.md` §2). PKG-27 is greenfield and is
  the largest single build in this document.
- **No scoped ingestion lints.** No `arithmetic_side_effects` or `as_conversions` attribute
  exists in any repo. PKG-01/02/03 start by choosing the module boundary that counts as "the
  ingestion path" — see Open questions.
- **No batch-strategy doc comments.** PKG-23 is a documentation sweep over every existing
  multi-item command before any behaviour changes.
- **Retry policy is not a value.** ocx has restart-whole tested for uploads and an
  ocx-mirror push retry (`ocx_cli/push.rs:157` → 75), but no single policy type carrying
  jitter, caps, and `Retry-After`. PKG-16 consolidates.

## AI-agent failure modes

Ranked by how often it bites in practice.

1. **`for item in items { do_thing(item)?; }` as the first draft of any batch loop.** The most
   natural shape an LLM produces for "do this for each item". It compiles, reads as idiomatic,
   and passes every test whose fixtures all succeed — which is exactly the input shape a
   shallow suite covers. Check: every loop over user-facing items, per PKG-22.
2. **`as` instead of `try_from`.** Shorter, never produces a compile error, and the agent has
   no type-level signal that the operand is tainted. A denied lint fails the agent's own
   `cargo clippy` self-check; a warn-only lint gets ignored.
3. **Inline `reqwest::Client::new()` "just for this one call."** Threading the shared client
   through is more work than constructing one, and nothing about the call site looks wrong.
   The CI grep in PKG-13 catches it with zero review effort.
4. **`.ok()` added to silence a `Result` during iterative development, never revisited.** This
   is how the real `dd` bug shipped into audited coreutils. Agents do it specifically to get
   code compiling before the error type exists.
5. **`Vec::with_capacity(declared_len)` as the "efficient" preallocation.** Textbook advice
   applied without adversarial framing on where the length came from. One line, instant DoS.
6. **Setting only `.timeout()` and believing it covers a streaming download.** The model knows
   reqwest "has a timeout" and stops. `read_timeout` is the one that matters for an open-ended
   stream and never appears in tutorials.
7. **`GzDecoder::new(reader)` chained straight into `read_to_end`.** A documentation-shaped
   gap, not a competence gap — no crate doc example shows the `.take()` wrapper, so the model
   pattern-matches on upstream examples that omit the bound.
8. **`JoinSet::join_all()` because the name reads like `futures::join_all`.** Two crates, same
   name, opposite failure semantics. An agent that internalised "join_all waits for everything"
   will misapply it and turn one flaky download into total batch data loss.
9. **`collect::<Result<Vec<_>, _>>()` because it is the shortest thing that "handles the
   Result".** An agent optimising for concise compiling code picks this over the
   `partition`/`BatchReport` fold every time unless told independent batches need the longer
   form.
10. **A bare `loop { if 401 { refresh; continue } }`.** The shortest code that "handles" a 401,
    with neither of the two failure modes modelled because both only appear under concurrency
    and expiry the agent never simulates.
11. **Two-pass digest verification — download everything, then hash it.** Conceptually simpler,
    and the agent is not tracking that pass 1 fully materialises the blob before pass 2 starts.
12. **Wrapping a chunk-`PATCH` in the same generic `.retry(...)` used for GETs.** "Retry" reads
    as a uniform wrapper for any fallible async call; HTTP-verb replay safety is not part of
    the model's default reasoning. PKG-17's by-value session handle turns this into a compile
    error, which is why the type-level fix is preferred over the review heuristic.
13. **Inventing a partial-success exit code.** "48 of 50 isn't quite failure" feels intuitively
    like it deserves a number, and no surveyed tool does it. Any new `ExitCode` variant landing
    alongside batch code is a finding to challenge.
14. **Serialising the loop's output directly as a bare JSON array.** Agents serialise the data
    structure they already built rather than the schema a script wants to branch on.
15. **`for_each_concurrent(usize::MAX, ...)` or an unbounded spawn loop for "parallel
    downloads".** The highest-relevance tutorial patterns for "run N async things", none of
    which carry a default bound.

## Open questions

- **What exactly is "the ingestion path" as a module boundary?** PKG-01/02/03/04/05/10's
  verification commands all assume a directory list. ocx's ingestion is spread across
  `oci/client.rs` (6,898 LOC), `oci/index/chained_index.rs`, `archive/`, and
  `utility/fs/assemble.rs`; grimoire's across `oci/`, `install/materializer.rs`, and
  `install/installer.rs`. Drawing this boundary is a prerequisite to landing the scoped lints
  and should be decided before the rules ship, not after.
- **Does the `JoinSet::join_all()` bug actually exist in the 127 call sites?** The batch
  research asserts the risk from the site count alone; nobody has run the grep. Cheap to
  answer, and it decides whether PKG-22 is a sweep or a guard.
- **Which `classify()` chain does the batch exit-code walk use?** ocx dispatches through the
  `ClassifyExitCode` trait on 50+ types; grimoire uses a genuine free function over one enum;
  the shared rule doc blocks the trait approach that ocx actually ships
  (`exit-codes-and-cli.md` §3). PKG-24 needs one severity ordering across both, and that
  ordering does not exist in either codebase — "worst" is currently undefined.
- **Is `--keep-going` (or its inverse) a user-facing flag?** PKG-23 fixes the default per
  command but does not decide whether users can override it. cargo exposes the knob; we
  currently do not.
- **Is the terminal truncation head (20) configurable?** No source surveyed resolves this;
  rustc/cargo do not expose it as a flag. A `--max-errors N` is a legitimate alternative
  nothing contradicts.
- **Does ghcr.io support conditional/compare-and-swap manifest PUT?** Not in the base
  distribution spec, inconsistent across registries, unverified against the live registry. It
  decides whether the tag-update race in PKG-17's neighbourhood is closeable or must be
  documented as accepted.

### Deserving another research round

- **Cancellation and graceful shutdown as its own subarea.** PKG-27 is the only greenfield rule
  here and the research behind it is a paragraph. The real questions are unowned: where the
  root `CancellationToken` lives in a CLI with no daemon, how it composes with `spawn_blocking`
  work that cannot be cancelled, what happens to a held file lock on SIGTERM, whether a second
  Ctrl-C escalates to hard exit, and what exit code a cancelled run returns (130 is
  conventional; neither binary produces it today). Cross-cuts `rust-async` and
  `rust-state-and-resources/drop-guards-panics-and-lock-poisoning`, which is precisely why no
  single existing wave owns it.
- **Resolver semantics and lockfile consistency under partial failure.** PKG-23 asserts the
  lockfile write is transactional and the downloads are not, but nothing researched what a
  lockfile should record when 48 of 50 items landed — whether a partial resolve is written at
  all, how the next run converges, and how minimal-version-selection interacts with a
  half-populated cache. The topic map deferred MVS semantics as "medium"; the batch interaction
  makes it sharper and package-manager-specific.
- **Behavioural parity with the reference implementation as a testable property.** The topic
  map flags it (most Rust CLI reimplementation CVEs are behavioural drift, not memory
  unsafety) and RUSTSEC-2026-0068 is a live parser-differential example, but no rule here
  checks it. Differential testing of our tar/manifest parsing against Go's `archive/tar` and
  the reference OCI implementation is a concrete, buildable gate that nobody has scoped.

## Sub-artifacts

- [bounded-ingestion-and-untrusted-arithmetic](rust-domain-package-manager/bounded-ingestion-and-untrusted-arithmetic.md)
  — overflow/cast discipline, allocation caps, decompression bombs, streaming with inline
  digest verification, bounded concurrency; the source for PKG-01…PKG-12.
- [registry-resilience-timeouts-and-retries](rust-domain-package-manager/registry-resilience-timeouts-and-retries.md)
  — the four-layer timeout taxonomy, jittered retry policy, per-verb idempotency
  classification, resumable downloads, the 401 dance, and one-client discipline; the source
  for PKG-13…PKG-20.
- [batch-partial-failure-reporting](rust-domain-package-manager/batch-partial-failure-reporting.md)
  — the four information-losing failure shapes, the fail-fast/collect/transactional decision,
  `BatchReport`, the `--json` batch schema, and partial-success exit-code semantics; the source
  for PKG-21…PKG-28.

## Key sources

- [corrode.dev — Bugs Rust Won't Catch](https://corrode.dev/blog/bugs-rust-wont-catch/) — the
  audited `chmod -R` and `dd` batch bugs and the track-worst-never-overwrite fix.
- [corrode.dev — Pitfalls of Safe Rust](https://corrode.dev/blog/pitfalls-of-safe-rust/) —
  debug/release overflow divergence and `as`-cast truncation.
- [corrode.dev — Hardening Rust for Production](https://corrode.dev/blog/hardening-rust/) —
  the explicit-limits-on-everything framing.
- [clippy — arithmetic_side_effects](https://rust-lang.github.io/rust-clippy/master/index.html#arithmetic_side_effects)
  — scope, `restriction` group, allow-by-default status, config knobs.
- [clippy — as_conversions](https://rust-lang.github.io/rust-clippy/master/index.html#as_conversions)
  and [cast_possible_truncation](https://rust-lang.github.io/rust-clippy/master/index.html#cast_possible_truncation).
- [std — `Vec::try_reserve`](https://doc.rust-lang.org/std/vec/struct.Vec.html#method.try_reserve)
  — the fallible-allocation API behind PKG-04.
- [std — `Result` `FromIterator`](https://doc.rust-lang.org/std/result/enum.Result.html) — the
  doctest proving `collect::<Result<Vec<_>,_>>()`'s short-circuit is real, not just documented.
- [tokio — `JoinSet`](https://docs.rs/tokio/latest/tokio/task/struct.JoinSet.html) —
  `join_next` cancel-safety and the `join_all()` panic-and-cancel trap.
- [tokio — `Semaphore`](https://docs.rs/tokio/latest/tokio/sync/struct.Semaphore.html) and
  [`mpsc::channel`](https://docs.rs/tokio/latest/tokio/sync/mpsc/fn.channel.html) — bounded
  concurrency and backpressure.
- [reqwest — `ClientBuilder`](https://docs.rs/reqwest/latest/reqwest/struct.ClientBuilder.html)
  — authoritative semantics for `timeout` / `connect_timeout` / `read_timeout` /
  `pool_max_idle_per_host`.
- [reqwest — `Response::content_length`](https://docs.rs/reqwest/latest/reqwest/struct.Response.html#method.content_length)
  — why the header is a hint, not a bound.
- [OCI distribution-spec](https://github.com/opencontainers/distribution-spec/blob/main/spec.md)
  — chunked-upload ordering (`416`), manifest byte-exactness, `Range` support, the 4 MiB
  manifest floor.
- [docker/distribution token auth spec](https://distribution.github.io/distribution/spec/auth/token/)
  — the 401 → realm → retry flow and `expires_in`.
- [AWS — Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
  — full/equal/decorrelated jitter formulas and the full-jitter recommendation.
- [RFC 9110 §10.2.3 — Retry-After](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after)
  and [RFC 6585 §4 — 429](https://www.rfc-editor.org/rfc/rfc6585.html#section-4).
- [RUSTSEC-2026-0068 / CVE-2026-33055](https://rustsec.org/advisories/RUSTSEC-2026-0068.html) —
  tar-rs PAX-vs-header size differential; the live example of "which untrusted field wins".
- [oras-project/rust-oci-client — client.rs](https://raw.githubusercontent.com/oras-project/rust-oci-client/main/src/client.rs)
  — our own dependency's hash-as-you-write `pull_blob` and the unverified-partial-fetch doc.
- [Wikipedia — Zip bomb](https://en.wikipedia.org/wiki/Zip_bomb) — the 100M:1 ratios that
  calibrate why one cap is not enough.
- [cargo book — `cargo install`](https://doc.rust-lang.org/cargo/commands/cargo-install.html) —
  `--keep-going` as prior art for making the batch strategy an explicit, named choice.

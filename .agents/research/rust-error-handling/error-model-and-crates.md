---
title: "Error Types: Crates, Enums, Conversion, Source Chains"
topic: rust-error-handling
agent: rust-domain-researcher-error-types
model: sonnet
date_researched: "2026-08"
sources_count: 25
scope: |
  Covers: the thiserror/anyhow/eyre/miette/snafu ecosystem (purpose, current
  versions, library-vs-binary split and where it's contested); error enum
  design (granularity, #[non_exhaustive], opaque types, #[from] vs explicit
  conversion, size/boxing, the source()/provide() APIs, backtraces); context
  discipline; user/environment/bug/upstream error taxonomy mapped to exit
  codes; panic policy and the enforcing clippy lints.
  Does NOT cover: async-specific error propagation across task boundaries,
  no_std-only concerns beyond what's noted inline, or WASM error handling.
---

## Table of contents

1. [The crate landscape](#1-the-crate-landscape)
2. [The library-vs-binary split, and where it's contested](#2-the-library-vs-binary-split-and-where-its-contested)
3. [Error enum design](#3-error-enum-design)
4. [`#[from]` vs explicit conversion](#4-from-vs-explicit-conversion)
5. [Error size and boxing](#5-error-size-and-boxing)
6. [`std::error::Error`, `source()`, and the provider API](#6-stderrorerror-source-and-the-provider-api)
7. [Backtraces](#7-backtraces)
8. [Adding context without double-reporting](#8-adding-context-without-double-reporting)
9. [Error taxonomy for tools: user / environment / bug / upstream](#9-error-taxonomy-for-tools-user--environment--bug--upstream)
10. [`Result` vs panic](#10-result-vs-panic)
11. [Mutex poisoning and `catch_unwind`](#11-mutex-poisoning-and-catch_unwind)
12. [Enforcing lints and `[lints]` config](#12-enforcing-lints-and-lints-config)
13. [Real error enums from well-known crates](#13-real-error-enums-from-well-known-crates)

## Summary

- `thiserror` (v2.0.20, Aug 2026) derives `std::error::Error` for hand-designed enums/structs; it does not appear in your public API surface — generated code is indistinguishable from hand-written code — [thiserror README](https://github.com/dtolnay/thiserror).
- `anyhow` (v1.0.104, Jul 2026) is a single `anyhow::Error` trait-object type for applications that don't care what error type a function returns, only that it's easy to propagate with `?` — [anyhow docs](https://docs.rs/anyhow/latest/anyhow/).
- `eyre` (v0.6.14) is a fork of anyhow with a swappable `EyreHandler`; `color-eyre` adds colored reports + span traces, `stable-eyre`/`simple-eyre` are lighter handlers — [eyre docs](https://docs.rs/eyre/latest/eyre/).
- `miette` (v7.6.0) targets *diagnostic-quality* application errors: source-span highlighting, ANSI/Unicode fancy rendering, a `Diagnostic` derive that layers on top of `thiserror` — [miette docs](https://docs.rs/miette/latest/miette/).
- `snafu` (v0.9.2) generates per-variant "context selector" types (`FooSnafu`) so the same underlying error can be re-contextualized differently at each call site; works in both libraries and applications, `no_std`-friendly — [snafu docs](https://docs.rs/snafu/latest/snafu/).
- The canonical split is: libraries define concrete `thiserror` enums; binaries collect everything into `anyhow`/`eyre::Report`. This is still the majority pattern in 2026, but `error-stack` (HASH) and workspace-internal crates increasingly blur it — see [§2](#2-the-library-vs-binary-split-and-where-its-contested).
- Error enums should be designed around **how errors arise**, not around recovery strategy — you can't predict every caller's recovery need, but you do know your own failure modes — [nrc error-docs](https://nrc.github.io/error-docs/error-design/error-type-design.html).
- Public error enums should be `#[non_exhaustive]` (clap's `ErrorKind` is) so new variants aren't a breaking change — [clap::error::ErrorKind](https://docs.rs/clap/latest/clap/error/enum.ErrorKind.html).
- `#[from]` implies `#[source]` automatically, but a `#[from]` field can hold *only* the source error (plus optional backtrace) — no room to attach extra context, which is the standard reason to write an explicit `From` impl or a `snafu` context selector instead — [thiserror docs](https://docs.rs/thiserror/latest/thiserror/).
- `clippy::result_large_err` (perf group, since 1.65.0) flags `Err` variants over a 128-byte default threshold (`large-error-threshold` in `clippy.toml`) because `Result<T, E>` is sized to its largest variant everywhere it's returned, including up the `?` chain — [lint source](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/functions/mod.rs).
- `std::error::Error::source()` has been stable since 1.30; the generic `provide()` member-access API is still nightly-only (`error_generic_member_access`, [tracking issue #99301](https://github.com/rust-lang/rust/issues/99301)) as of August 2026 — do not assume it's stable.
- `std::backtrace::Backtrace` has been stable since 1.65.0; `Backtrace::capture()` is a no-op unless `RUST_BACKTRACE` or `RUST_LIB_BACKTRACE` is set, so it's cheap to call unconditionally — [std::backtrace docs](https://doc.rust-lang.org/std/backtrace/struct.Backtrace.html).
- Never let both `Display` and `source()` render the same underlying error text — that's "double reporting," an explicitly named anti-pattern in the Rust error-handling working group — [project-error-handling#27](https://github.com/rust-lang/project-error-handling/issues/27).
- `anyhow::Context::with_context` is lazy (closure, only runs on the error path); `.context()` is eager — prefer `with_context` when the message involves formatting/allocation — [anyhow::Context docs](https://docs.rs/anyhow/latest/anyhow/trait.Context.html).
- Return `ExitCode` from `main`, not `process::exit` — `process::exit` skips destructors on every stack, `ExitCode` runs them — [std::process::ExitCode docs](https://doc.rust-lang.org/std/process/struct.ExitCode.html).
- `panic!`/`unwrap`/`expect` are for programmer-bug / invariant-violated states — genuinely-expected failures (bad user input, network errors, rate limits) must be `Result` — [Rust Book ch. 9.3](https://doc.rust-lang.org/book/ch09-03-to-panic-or-not-to-panic.html).
- `clippy::unwrap_used` and `clippy::expect_used` are both **restriction-group, allow-by-default** lints — they must be opted into explicitly per-crate via `[lints.clippy]`, they are not part of `-W clippy::all` or `pedantic` — [clippy source](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/methods/mod.rs).
- `clippy::missing_errors_doc` and `clippy::missing_panics_doc` are **pedantic-group** lints requiring a `# Errors` / `# Panics` doc section on public fallible/panicking functions — [lint source](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/doc/mod.rs).
- `clippy::error_impl_error` (restriction) flags any type literally named `Error` that implements `Error` — a real anti-pattern when many crates in one workspace all export `Error`, forcing callers to alias-import — [lint source](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/error_impl_error.rs).
- Mutex poisoning is advisory, not a safety guarantee — a panicking thread poisons the lock, `lock()` returns `Err(PoisonError)`, recoverable via `.into_inner()` or `clear_poison()` (1.77+) — [std::sync::Mutex docs](https://doc.rust-lang.org/std/sync/struct.Mutex.html).
- Never unwind across an FFI boundary — it's UB; catch panics at the FFI boundary with `catch_unwind` if the call can panic — [Rustonomicon, unwinding](https://doc.rust-lang.org/nomicon/unwinding.html).

## Findings

### 1. The crate landscape

| Crate | Version (Aug 2026) | Core purpose | Typical position |
|---|---|---|---|
| `thiserror` | 2.0.20 | Derive macro for `std::error::Error` on your own enum/struct | Library error types |
| `anyhow` | 1.0.104 | One `anyhow::Error` trait-object with `.context()` and `?`-friendly conversion from any `std::error::Error` | Application/binary top-level errors |
| `eyre` | 0.6.14 | Fork of `anyhow` with a swappable `EyreHandler` for custom report formatting | Application errors when you want pluggable reporting |
| `color-eyre` | (companion to eyre) | `EyreHandler` impl: colored backtraces + `tracing`-span traces | CLI/TUI applications |
| `miette` | 7.6.0 | `Diagnostic` trait/derive for source-span-annotated, "fancy" rendered error reports | User-facing CLI diagnostics, compilers, linters |
| `snafu` | 0.9.2 | Per-variant "context selector" generation; works library or binary, `no_std` | Errors that need different context injected at many call sites |

Sources: [thiserror docs.rs](https://docs.rs/thiserror/latest/thiserror/), [anyhow docs.rs](https://docs.rs/anyhow/latest/anyhow/), [eyre docs.rs](https://docs.rs/eyre/latest/eyre/), [miette docs.rs](https://docs.rs/miette/latest/miette/), [snafu docs.rs](https://docs.rs/snafu/latest/snafu/).

`thiserror`'s own docs state the deliberate boundary: *"deliberately does not appear in your public API. You get the same thing as if you had written an implementation of std::error::Error by hand"* — [thiserror README](https://github.com/dtolnay/thiserror/blob/master/README.md). This is why it's the default choice for library error types: it costs nothing at the API boundary.

`eyre`'s docs are explicit about the thiserror/eyre split: *"Use eyre if you don't think you'll do anything with an error other than report it. This is common in application code. Use thiserror if you think you need an error type that can be handled via match or reported"* — [eyre docs.rs](https://docs.rs/eyre/latest/eyre/). `eyre` also warns against re-exporting its types from your own public API, since its major-version bumps aren't your crate's to control.

`miette` pairs *with* `thiserror`, not instead of it — derive `Diagnostic` alongside `Error` on the same enum to add source-span/help-text metadata while keeping the concrete type — [miette docs.rs](https://docs.rs/miette/latest/miette/).

### 2. The library-vs-binary split, and where it's contested

The textbook rule, repeated across 2025–2026 blog coverage: *"libraries define errors with thiserror, applications consume them with anyhow"* ([OneUptime, Jan 2026](https://oneuptime.com/blog/post/2026-01-25-error-types-thiserror-anyhow-rust/view); [Pi Stack, Jun 2026](https://www.pistack.xyz/posts/2026-06-22-rust-error-handling-anyhow-thiserror-eyre-guide/)).

Where it's contested:

- **Internal-only crates inside one workspace.** When a "library" crate is never published and has exactly one consumer (the workspace's own binary), the argument for a hand-rolled `thiserror` enum weakens — there's no external caller who benefits from a stable, matchable error type, and `anyhow`-everywhere reduces boilerplate. This tradeoff is not settled community-wide; treat "is this crate actually a library, or just a compilation-unit split of one binary" as the deciding question, not the crate/lib.rs distinction alone.
- **`error-stack`** (HASH, [announcement](https://hash.dev/blog/announcing-error-stack)) proposes a third model: typed errors *and* an anyhow-like attachable-context stack, explicitly targeting the case where you want new error types at every module/crate boundary without writing `From` boilerplate by hand. It has not displaced thiserror+anyhow as of 2026 but is cited as the standard "if you outgrow the two-crate split" answer.
- **snafu already spans both roles** by design — its docs describe it as usable in libraries and applications, so for teams that don't want to learn two crates, snafu alone is a live alternative to the thiserror+anyhow pairing — [snafu docs.rs](https://docs.rs/snafu/latest/snafu/).

### 3. Error enum design

Two granularity styles, per [nrc's error-docs project](https://nrc.github.io/error-docs/error-design/error-type-design.html) (an in-progress but currently the closest thing to an official Rust error-design reference):

- **Fine-grained enum style**: one variant per distinct failure mode, each carrying whatever data is relevant to that specific failure. Natural fit for `thiserror`.
- **Coarse-grained single-struct style**: one struct holding a `kind`-style field (often a separate C-like enum) plus common data (message, source) stored once. `std::io::Error` uses an optimized/packed representation of this shape internally.

Design axis that matters: **partition variants by how the error arises, not by how callers will recover from it.** You cannot predict every caller's recovery strategy, but you do fully control your own failure surface — so origin-based partitioning ages better than speculative recovery-based partitioning. A function can only return one error type, so everything a function can fail with must fit in one enum, even if that cuts across your module boundaries — [nrc error-docs](https://nrc.github.io/error-docs/error-design/error-type-design.html).

**`#[non_exhaustive]`** on a public error enum lets you add variants later without a semver-major bump. `clap::error::ErrorKind` does exactly this — [clap::error::ErrorKind docs](https://docs.rs/clap/latest/clap/error/enum.ErrorKind.html).

**Opaque struct + `kind()` accessor** is the pattern used by both `clap::Error` (`kind()` → `ErrorKind`) and `reqwest::Error` (`is_timeout()`, `is_connect()`, `is_status()`, `status()`, `url()`, …). This hides the concrete variant set entirely — callers get typed queries, not exhaustive matching — which is the strongest compatibility guarantee a library can offer, at the cost of match-ability. See [§13](#13-real-error-enums-from-well-known-crates) for both, cited directly.

At an API boundary it's normal to convert to a *more* abstract error representation than your internals use — internal detail should not leak to the public type just because it was convenient to construct — [nrc error-docs](https://nrc.github.io/error-docs/error-design/error-type-design.html).

### 4. `#[from]` vs explicit conversion

```rust
// #[from]: convenient, but the field can hold ONLY the source error.
#[derive(thiserror::Error, Debug)]
pub enum DataStoreError {
    #[error("data store disconnected")]
    Disconnect(#[from] std::io::Error),
    #[error("the data for key `{0}` is not available")]
    Redaction(String),
    #[error("invalid header (expected {expected:?}, found {found:?})")]
    InvalidHeader { expected: String, found: String },
    #[error("unknown data store error")]
    Unknown,
}
```
— canonical example, [thiserror README](https://github.com/dtolnay/thiserror/blob/master/README.md).

`#[from]` auto-generates a `From<io::Error> for DataStoreError` and implies `#[source]` — you never write `.map_err(DataStoreError::Disconnect)?` by hand, `?` alone performs the conversion. The field annotated `#[from]` "must contain only the source error (plus optional backtrace)" — [thiserror docs.rs](https://docs.rs/thiserror/latest/thiserror/).

**This is exactly where `#[from]` loses context.** If you need to say *which* file failed to open, not just that *an* `io::Error` happened, `#[from]` can't carry that extra field — you need an explicit variant with both the path and the source:

```rust
// WRONG when you need the path: #[from] can't add a sibling field.
#[error("io error")]
Io(#[from] std::io::Error),

// RIGHT: explicit variant, explicit conversion at the call site.
#[error("failed to read {path}")]
Read { path: PathBuf, #[source] source: std::io::Error },
```
```rust
std::fs::read(&path).map_err(|source| MyError::Read { path: path.clone(), source })?;
```

`snafu`'s context-selector mechanism exists specifically to make this ergonomic without hand-writing the `map_err` above at every call site — [snafu docs.rs](https://docs.rs/snafu/latest/snafu/).

### 5. Error size and boxing

`clippy::result_large_err` (perf group, stable since 1.65.0, default threshold **128 bytes**, configurable via `large-error-threshold` in `clippy.toml`) exists because `Result<T, E>` is sized to fit its largest variant *everywhere it's returned* — including every stack frame the error is propagated through via `?`. A single large `Err` variant anywhere in a chain inflates every `Result` above it:

```rust
// Flagged: Result is >= 512 bytes even on the Ok path.
pub enum ParseError { UnparsedBytes([u8; 512]), UnexpectedEof }
pub fn parse() -> Result<(), ParseError> { Ok(()) }

// Fixed: box the large payload, Result shrinks to ~pointer-sized.
pub enum ParseError { UnparsedBytes(Box<[u8; 512]>), UnexpectedEof }
```
— verbatim example from [clippy lint source](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/functions/mod.rs).

`anyhow::Error` and `eyre::Report` are themselves already pointer-sized (a single boxed trait object internally), which is part of why they're attractive as a top-level catch-all — the cost of "any error" doesn't grow with how many concrete error types exist in your dependency graph.

### 6. `std::error::Error`, `source()`, and the provider API

```rust
pub trait Error: Debug + Display {
    fn source(&self) -> Option<&(dyn Error + 'static)> { None }   // stable since 1.30
    fn provide<'a>(&'a self, request: &mut Request<'a>) { }       // NIGHTLY ONLY, error_generic_member_access
    // description(), cause() — both deprecated, do not implement
}
```
— [std::error::Error docs](https://doc.rust-lang.org/std/error/trait.Error.html).

`source()` is the stable, load-bearing mechanism for chaining: return `Some(&self.inner)` when you wrap another error. `description()` (deprecated 1.42) and `cause()` (deprecated 1.33, replaced by `source`) must not be implemented in new code — use `Display`/`to_string()` instead.

`provide()` — the generic type-driven member-access API that lets a caller pull a `Backtrace` (or any typed side-channel data) out of a `dyn Error` without a bespoke method — is **still gated behind `#![feature(error_generic_member_access)]` as of August 2026**; tracking issue [#99301](https://github.com/rust-lang/rust/issues/99301) shows it unstabilized. Do not write guidance or generated code that assumes `provide()`/`Request` are available on stable. The explicit warning in the stable-but-unstable-feature docs: *"Avoid delegating `provide()` implementations to source errors, as this causes duplicate context in error chains"* — same page.

`thiserror`'s `#[backtrace]` field attribute requires nightly 1.73+ for the same reason (it's built on this unstable provider API) — [thiserror docs.rs](https://docs.rs/thiserror/latest/thiserror/).

### 7. Backtraces

`std::backtrace::Backtrace` has been **stable since 1.65.0**. `Backtrace::capture()` checks `RUST_BACKTRACE`/`RUST_LIB_BACKTRACE` at call time and is a documented no-op (near-zero cost) if neither is set — this is why it's fine to call unconditionally in a constructor rather than gating it yourself. `Backtrace::force_capture()` ignores the env vars and always pays the (real, platform-dependent) cost — use only in explicitly-enabled debug tooling, not on a hot path — [std::backtrace docs](https://doc.rust-lang.org/std/backtrace/struct.Backtrace.html).

`anyhow` captures a backtrace automatically on Rust 1.65+, surfaced when `RUST_BACKTRACE=1` — [anyhow docs.rs](https://docs.rs/anyhow/latest/anyhow/). `color-eyre` layers span-traces (via `tracing`) on top of this. `snafu` has its own `Backtrace` type plus an `ErrorCompat` trait for cross-version access — [snafu docs.rs](https://docs.rs/snafu/latest/snafu/).

### 8. Adding context without double-reporting

```rust
use anyhow::{Context, Result};

fn do_it(path: &str) -> Result<Vec<u8>> {
    std::fs::read(path)
        .with_context(|| format!("failed to read {path}"))   // lazy: only runs on Err
        .map(|v| v)
}
```
`with_context` takes a closure and only evaluates it on the error path; `context()` takes a value and evaluates eagerly even on success. Prefer `with_context` whenever the message requires formatting or allocation — [anyhow::Context docs](https://docs.rs/anyhow/latest/anyhow/trait.Context.html).

**Context belongs at the boundary where you have information the lower layer didn't** — the path being read, the URL being fetched, the config key being parsed — not repeated at every intermediate `?`. Attach it once, at the call site that knows the extra fact, and let `?` propagate unchanged everywhere else.

**Double reporting** — rendering the same underlying error text in both your `Display` impl *and* returning it from `source()` — is a named anti-pattern flagged by the (now-archived) Rust error-handling working group, citing real regressions found in `clap-rs` and `handlebars-rust`: *"including your source's message within your own Display output while also returning it from source()"* duplicates the message wherever a reporter walks the whole chain (e.g. `anyhow`'s default `{:#}` / `eyre`'s report printer) — [project-error-handling#27](https://github.com/rust-lang/project-error-handling/issues/27).

```rust
// WRONG: message duplicated when a reporter prints the whole chain.
#[error("failed to connect: {0}")]
Connect(#[source] io::Error),   // io::Error's own text is embedded AND re-surfaced via source()

// RIGHT: Display adds only what source() doesn't already say.
#[error("failed to connect")]
Connect(#[source] io::Error),
```

### 9. Error taxonomy for tools: user / environment / bug / upstream

A CLI/tool error generally falls into one of four buckets, each implying a different retryability and exit-code answer:

| Category | Example | Retryable? | Exit-code family |
|---|---|---|---|
| User error | bad flag, invalid config value, malformed input file | No — caller must fix input | `EX_USAGE`/`EX_DATAERR` style (64, 65) |
| Environment error | missing file, permission denied, disk full | Sometimes (after operator fixes env) | `EX_NOINPUT`/`EX_NOPERM`/`EX_IOERR` (66, 77, 74) |
| Upstream/network error | registry unreachable, HTTP 5xx, timeout | Often — safe to retry with backoff | `EX_UNAVAILABLE`/`EX_TEMPFAIL` (69, 75) |
| Bug (internal invariant violated) | assertion failed, unreachable reached | Never — must panic/abort, not be "handled" | `EX_SOFTWARE` (70), typically via panic → non-zero exit, not a modeled `Result` variant |

The BSD `sysexits.h` numbering is exposed to Rust directly by the `sysexits` crate, whose `ExitCode` enum implements `Termination` so it can be returned straight from `main`: variants include `Ok`, `Usage`, `DataErr`, `NoInput`, `Unavailable`, `Software`, `OSErr`, `IOErr`, `TempFail`, `Protocol`, `NoPerm` — [sysexits docs.rs](https://docs.rs/sysexits/latest/sysexits/).

Practical mapping rule: **the taxonomy bucket should be recoverable from the error value itself** (an error-kind enum or `is_*()` accessor), not re-derived by string-matching `Display` output at the exit boundary. Whatever top-level type your `main` returns should expose enough structure (a `kind()`, or distinct top-level variants) to pick the right `ExitCode`/`sysexits::ExitCode` without parsing text.

### 10. `Result` vs panic

Rust Book's decision framework (still current in the edition-2024 book): *"Return Result (default): gives calling code options... Call panic!: use when failure is unrecoverable or indicates a bug in calling code"* — [Rust Book ch. 9.3](https://doc.rust-lang.org/book/ch09-03-to-panic-or-not-to-panic.html). Panic is appropriate when a **bad, unexpected state** has been reached — broken invariant, contradictory data — where continuing would mean re-checking the same problem at every call site, and the state can't be pushed into the type system instead.

`expect()` over `unwrap()` in production code, always, and the message should **describe the invariant that guarantees success, not restate the failure**:

```rust
// WRONG: restates that it might fail — no new information over unwrap().
value.parse::<u32>().expect("parse failed");

// RIGHT: states the invariant the caller is relying on.
"127.0.0.1".parse::<IpAddr>().expect("hardcoded IP address is valid");
```
— pattern straight from the Book's own example — [Rust Book ch. 9.3](https://doc.rust-lang.org/book/ch09-03-to-panic-or-not-to-panic.html).

The Nomicon adds the control-flow argument for why panics must stay rare in the non-error-path sense: *"Rust's current unwinding implementation is heavily optimized for the 'doesn't unwind' case... actually unwinding will be more expensive than in e.g. Java"* and *"Don't build your programs to unwind under normal circumstances. Ideally, you should only panic for programming errors or extreme problems"* — [Rustonomicon, unwinding](https://doc.rust-lang.org/nomicon/unwinding.html). It further states the hierarchy: prefer `Option`/`Result`, escalate to panic only when truly unrecoverable, escalate to abort only for catastrophic failure.

### 11. Mutex poisoning and `catch_unwind`

`Mutex::lock()`/`try_lock()` return `LockResult`/`TryLockResult` — `Err(PoisonError)` if the thread that last held the lock panicked while holding it. Poisoning is **advisory, not a soundness guarantee**: *"Poisoning is only advisory... even unpoisoned mutexes need to be handled with care, since certain panics may have been skipped"* (e.g. panics during a `Drop` impl, or foreign/FFI exceptions don't poison at all) — [std::sync::Mutex docs](https://doc.rust-lang.org/std/sync/struct.Mutex.html). Recovery: `poisoned.into_inner()` to reach the guard anyway, or `clear_poison()` (stable since 1.77.0) once you've verified the data is consistent. Most production code just `.unwrap()`s the lock result, deliberately propagating the panic — a poisoned lock usually means "someone already panicked, don't pretend the process is healthy."

**Never unwind across an FFI boundary** — undefined behavior per the Nomicon, best case a crash, worst case silently corrupted state. `catch_unwind` at the FFI boundary is the legitimate, load-bearing use case; using it as ordinary application control flow is explicitly discouraged — [Rustonomicon, unwinding](https://doc.rust-lang.org/nomicon/unwinding.html).

### 12. Enforcing lints and `[lints]` config

```toml
# Cargo.toml — workspace root
[workspace.lints.clippy]
unwrap_used = "warn"
expect_used = "warn"
panic = "warn"
missing_errors_doc = "warn"
result_large_err = "warn"
error_impl_error = "warn"

# Cargo.toml — member crate
[lints]
workspace = true
```
Table-name resolution: the segment before `::` in the lint path picks the table — `clippy::foo` → `[lints.clippy]`, no `::` → `[lints.rust]`. Levels are `forbid` > `deny` > `warn` > `allow`; the shorthand `name = "warn"` is equivalent to `name = { level = "warn", priority = 0 }` — [Cargo manifest reference, lints section](https://doc.rust-lang.org/cargo/reference/manifest.html#the-lints-section).

Exact lint facts, pulled from clippy source (not just the rendered book, which can lag):

- **`clippy::unwrap_used`** — restriction group, **allow-by-default**, stable since 1.45.0. Flags `.unwrap()`/`.unwrap_err()` on `Result`, `.unwrap()` on `Option`. Must be explicitly opted in — [source](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/methods/mod.rs).
- **`clippy::expect_used`** — restriction group, **allow-by-default**, stable since 1.45.0. Same shape, for `.expect()`/`.expect_err()` — same source file.
- **`clippy::panic`** — restriction group, **allow-by-default**, stable since 1.40.0. Flags `panic!(...)` call sites directly — [source](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/panic_unimplemented.rs) (declared alongside `unimplemented`/`todo`/`unreachable` lints in the same module).
- **`clippy::missing_errors_doc`** — **pedantic group**. Flags public functions returning `Result` with no `# Errors` section in their doc comment — [source](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/doc/mod.rs).
- **`clippy::missing_panics_doc`** — **pedantic group**, sibling lint in the same file, requires a `# Panics` section on any public function that can panic.
- **`clippy::result_large_err`** — **perf group** (default-warn), stable since 1.65.0. Configurable threshold `large-error-threshold`, **default 128 bytes** — [config docs](https://doc.rust-lang.org/clippy/lint_configuration.html), [source](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/functions/mod.rs).
- **`clippy::error_impl_error`** — restriction group. Flags any type literally named `Error` that implements `std::error::Error`, because a workspace with 20 crates each exporting `pub enum Error` forces every caller into aliased/qualified imports — [source](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/error_impl_error.rs).

Test-code exemptions: `allow-unwrap-in-tests` and `allow-expect-in-tests` (both default `false`) can be set in `clippy.toml` to exempt `#[cfg(test)]` code from `unwrap_used`/`expect_used` without disabling the lint globally — [clippy lint_configuration.html](https://doc.rust-lang.org/clippy/lint_configuration.html).

Run the check the way a reviewer would:
```bash
cargo clippy --workspace --all-targets -- -D warnings
```

### 13. Real error enums from well-known crates

**`clap::error::ErrorKind`** — `#[non_exhaustive]` enum behind an opaque `clap::Error` struct with a `.kind()` accessor. Sample variants: `InvalidValue`, `UnknownArgument`, `MissingRequiredArgument`, `DisplayHelp` (a non-error "error" used to short-circuit `--help`) — [clap::error::ErrorKind docs](https://docs.rs/clap/latest/clap/error/enum.ErrorKind.html). This is the reference example for "opaque struct + non_exhaustive kind enum + accessor," and for the fact that not every `Err` return represents a true failure (`DisplayHelp`/`DisplayVersion` are control-flow, not errors, and clap documents them as such).

**`reqwest::Error`** — fully opaque struct, no public enum at all. Instead of matching a `kind()`, callers ask typed yes/no questions: `is_builder()`, `is_redirect()`, `is_status()`, `is_timeout()`, `is_request()`, `is_connect()`, `is_body()`, `is_decode()`, `is_upgrade()`, plus `status() -> Option<StatusCode>` and `url()`/`url_mut()`/`with_url()`/`without_url()` — [reqwest::Error docs](https://docs.rs/reqwest/latest/reqwest/struct.Error.html). This is the strongest-possible compatibility guarantee — reqwest can restructure its error internals across any release without breaking a single downstream `match`, because there's nothing to match against.

**`thiserror`'s `DataStoreError`** (canonical README example, reproduced in [§4](#4-from-vs-explicit-conversion)) is the standard citation for the fine-grained enum style: distinct variants per failure mode, `#[from]` for the trivial wraps, explicit named fields for the ones that need extra data — [thiserror README](https://github.com/dtolnay/thiserror/blob/master/README.md).

## Normative guidance candidates

1. **Library crates define a concrete error type (enum or opaque struct) derived with `thiserror`; binary/application crates collect errors into `anyhow::Error` (or `eyre::Report`) at the top.** Rationale: concrete types let library callers match/recover; a single dynamic type keeps `main`'s error plumbing trivial. Verify: grep each `Cargo.toml` — a `[lib]` crate depending on `anyhow` in non-dev-dependencies is a smell; a `[[bin]]`-only crate hand-rolling a thiserror enum per module is a smell.
2. **Every public error enum gets `#[non_exhaustive]` unless the crate has committed to never adding a variant.** Rationale: adding a variant to an exhaustive public enum is a semver-major break. Verify: `grep -B1 "pub enum.*Error" **/*.rs` and confirm `#[non_exhaustive]` precedes each public error enum.
3. **A `#[from]` field carries only the wrapped error — the moment you need a sibling fact (a path, a URL, a key), switch to an explicit named-field variant and `.map_err(...)` or a snafu context selector.** Rationale: `#[from]` fields cannot hold extra data by construction. Verify: code review — any `#[from]` field on a variant whose `#[error(...)]` message references a field other than the source is a compile error already, so this self-enforces; the check is for *missing* context, not present.
4. **Never let `Display` re-render text that `source()` will also surface when a chain is printed.** Rationale: avoids duplicated error text in `anyhow`/`eyre` chain printers ("double reporting"). Verify: code-reading heuristic — if a variant's `#[error("...")]` interpolates `{source}` or the source's `Display` output *and* also implements/derives `source()` returning that same error, flag it.
5. **Box any `Err` variant payload that pushes the enum's `Result` past ~128 bytes; run `clippy::result_large_err` in CI as warn-or-deny.** Rationale: an oversized `Err` inflates every `Result` it's ever returned in, including up the whole `?` chain. Verify: `cargo clippy --workspace -- -W clippy::result_large_err` (or `-D` in CI); grep any large fixed-size array (`[u8; N]` for N ≥ 128) inside an error variant.
6. **Opt in explicitly to `clippy::unwrap_used`, `clippy::expect_used`, and `clippy::panic` — they are restriction-group and allow-by-default, so "clippy is clean" proves nothing about them unless the `[lints]` table turns them on.** Rationale: these are the highest-value panic-policy lints and none of them fire without explicit config. Verify: `grep -A5 '\[lints.clippy\]' Cargo.toml` (or workspace root) for the three lint names; absence means the project has zero enforcement here regardless of clippy's exit code.
7. **Every `.expect(...)` message states the invariant that guarantees success, never the failure mode.** Rationale: "parse failed" tells the reader nothing `unwrap()` didn't already say; "hardcoded IP address is valid" tells them *why* this can't fail. Verify: code-reading heuristic — grep `\.expect\("` and read each message; reject any that start with a verb describing the failure ("failed to", "could not", "error").
8. **`main` returns `ExitCode`/`sysexits::ExitCode`, never calls `std::process::exit`.** Rationale: `process::exit` skips destructors on every live stack frame (including other threads); `ExitCode` runs them. Verify: `grep -rn "process::exit" src/` outside of signal handlers/panic hooks explicitly documented as needing immediate termination.
9. **The top-level error type returned toward `main` exposes a taxonomy accessor (`kind()`, or distinct top-level variants) mapping to user / environment / upstream / bug, and `main` translates that directly to an exit code — never by string-matching `Display` output.** Rationale: retryability and exit-code choice must be structurally derivable, not parsed from prose that can change wording. Verify: code-reading heuristic at the `main`/exit-code call site — look for `.to_string().contains(...)` or similar text-matching against an error; that's the smell this rule forbids.
10. **`clippy::missing_errors_doc` and `clippy::missing_panics_doc` are enabled (they're pedantic, not on by default) on any crate whose functions are called by other teams/crates.** Rationale: callers need to know what to `match`/handle and what invariant not to violate, without reading the implementation. Verify: `[lints.clippy] missing_errors_doc = "warn"` / `missing_panics_doc = "warn"` present; `cargo clippy -- -W clippy::pedantic` run at least once per crate to confirm no accumulated debt.
11. **No type in the workspace is named bare `Error` if the workspace has more than one crate exporting an error type.** Rationale: `clippy::error_impl_error`'s stated failure mode — 20 crates, 20 `Error`s, every caller forced to alias-import. Verify: `cargo clippy -- -W clippy::error_impl_error`, or `grep -rn "pub enum Error\|pub struct Error" **/src/lib.rs` across the workspace and check for name collisions.
12. **`catch_unwind` appears only at an FFI boundary or a supervised-worker boundary (thread pool task wrapper) — never as ordinary control flow for an expected failure.** Rationale: unwinding across FFI is UB; using panics as control flow defeats the panic=bug convention and is expensive by design. Verify: `grep -rn "catch_unwind"` and confirm each call site is adjacent to an `extern "C"` boundary or a documented worker-supervision comment.

## AI-agent angle

- **Hallucinating `std::error::Error::provide()` as stable.** An agent trained on mixed-era material will confidently write `fn provide(&self, request: &mut Request)` on stable Rust. It is nightly-only (`error_generic_member_access`, [#99301](https://github.com/rust-lang/rust/issues/99301)) as of Aug 2026. Check: `cargo build` on stable toolchain — it will fail with a feature-gate error; grep for `#![feature(error_generic_member_access)]` anywhere in a crate targeting stable and flag it.
- **Writing `#[from]` on a variant that also needs another field, then trying to smuggle the extra data in anyway** (e.g. adding a second field next to the `#[from]` field and expecting it to compile) — this doesn't compile, but a plausible near-miss is the agent silently dropping the context it meant to add (falling back to just `#[from]`) rather than restructuring to an explicit variant. Check: diff review — did a task that asked for "error should include the file path" actually add a path field, or did it settle for a bare `#[from] io::Error`?
- **Reaching for `anyhow` inside a library crate "for convenience," including in a leaf function whose error type then infects the whole call chain.** This compiles and looks idiomatic (agents have seen thousands of `anyhow::Result` examples) but breaks the ability of any downstream crate to `match` on a concrete error. Check: `grep -rn "anyhow" **/src/lib.rs` (not `main.rs`/`bin/`) — any hit in a published/reusable library crate is a candidate for downgrade to a concrete error type.
- **Using `.unwrap()`/`.expect()` on `Mutex::lock()` and treating a poison as impossible**, when the actual convention is deliberate propagation *or* documented recovery via `into_inner()`/`clear_poison()`. The failure mode: an agent "fixes" a poisoned-lock panic by swallowing the error with `if let Ok(guard) = m.lock() { ... } else { return default }`, silently masking real corruption instead of propagating. Check: code-reading heuristic — any `Mutex::lock()` error branch that returns a default/no-op value rather than propagating or explicitly recovering with `into_inner()`/`clear_poison()` is suspect.
- **Emitting `clippy::unwrap_used`/`expect_used`-violating code and assuming default `cargo clippy` will catch it** — since these are restriction-group and allow-by-default, an agent that "ran clippy and it was clean" has proven nothing about panic policy unless it also checked the `[lints]` table. Check: before trusting a clean `cargo clippy` run as evidence of panic-policy compliance, confirm `[lints.clippy] unwrap_used`/`expect_used` are actually set to `warn`/`deny` in the manifest.
- **Reflexively calling `std::process::exit(code)` from deep inside application logic** (a pattern extremely common in tutorial-era Rust and copied verbatim), instead of returning a `Result`/`ExitCode` up to `main`. Check: `grep -rn "process::exit" src/` — any hit outside `main.rs`'s final return or a documented panic/signal hook is a bug.
- **Writing exhaustive `match` on a crate's error enum that the crate marks `#[non_exhaustive]`**, which compiles today but is exactly the breakage the annotation exists to prevent going forward — the agent must add a wildcard arm. Check: `cargo build` after a dependency bump will surface this as a compile error if the arm is truly missing; proactively grep for `match` on a `#[non_exhaustive]` type without a trailing `_ =>` arm.

## Contested / evolving

- **Library-vs-binary split for internal, single-consumer workspace crates.** No settled community answer as of 2026 on whether an internal-only "library" crate should still pay for a hand-rolled `thiserror` enum, or whether `anyhow` end-to-end is acceptable when there's exactly one caller. Trending toward: judge by "does anything outside this workspace ever see this type," not by crate-type alone.
- **`error-stack` as a potential replacement for the thiserror+anyhow pairing.** Live in production at HASH and gaining blog coverage through 2026, but has not displaced the two-crate convention as the default recommendation in tutorials, project templates, or `cargo new` guidance. Watch, don't yet default to it.
- **`error_generic_member_access` stabilization.** Tracking issue [#99301](https://github.com/rust-lang/rust/issues/99301) is long-running; once stabilized, the "how do I get a `Backtrace` out of a `dyn Error`" story changes from thiserror's nightly-gated `#[backtrace]` to a stable, ecosystem-wide `provide()`/`request_ref` pattern. Any guidance written assuming stable `provide()` is currently wrong — recheck this section's status at time of read.
- **`miette` vs `color-eyre` for CLI-tool user-facing errors.** Both solve "pretty terminal error output," miette leaning toward source-span/diagnostic-code richness (compiler-style), color-eyre toward backtrace/span-trace richness (service/application-style). Choice is genuinely workload-dependent and not converging on one winner.

## Sources

| URL | What it is | Date/era | Why it was worth reading |
|---|---|---|---|
| [docs.rs/thiserror](https://docs.rs/thiserror/latest/thiserror/) | Official crate docs | v2.0.20, Aug 2026 | Primary source for `#[error]`/`#[from]`/`#[source]`/`#[backtrace]`/`transparent` semantics |
| [docs.rs/anyhow](https://docs.rs/anyhow/latest/anyhow/) | Official crate docs | v1.0.104, Jul 2026 | Primary source for `anyhow::Error`, backtrace capture, no_std support |
| [docs.rs/anyhow Context trait](https://docs.rs/anyhow/latest/anyhow/trait.Context.html) | Official API docs | v1.0.104 | Exact `.context()` vs `.with_context()` semantics and laziness |
| [docs.rs/eyre](https://docs.rs/eyre/latest/eyre/) | Official crate docs | v0.6.14 | Primary source for eyre-vs-anyhow-vs-thiserror recommendation, `EyreHandler` ecosystem |
| [docs.rs/miette](https://docs.rs/miette/latest/miette/) | Official crate docs | v7.6.0, Aug 2026 | Primary source for `Diagnostic` trait and fancy-report design |
| [docs.rs/snafu](https://docs.rs/snafu/latest/snafu/) | Official crate docs | v0.9.2, Jul 2026 | Primary source for context-selector pattern, `ensure!`, `no_std` support |
| [thiserror README (GitHub)](https://github.com/dtolnay/thiserror/blob/master/README.md) | Repo source (primary) | current | Canonical `DataStoreError` example, "does not appear in your public API" statement |
| [std::error::Error trait docs](https://doc.rust-lang.org/std/error/trait.Error.html) | Official std docs | current stable | Exact trait shape, `source()` stability, `provide()` unstable status, deprecated methods |
| [std::backtrace::Backtrace docs](https://doc.rust-lang.org/std/backtrace/struct.Backtrace.html) | Official std docs | stable since 1.65.0 | `capture()` vs `force_capture()`, env-var gating, cost model |
| [std::process::ExitCode docs](https://doc.rust-lang.org/std/process/struct.ExitCode.html) | Official std docs | current stable | `ExitCode` vs `process::exit`, destructor-running guarantee |
| [std::sync::Mutex docs](https://doc.rust-lang.org/std/sync/struct.Mutex.html) | Official std docs | current stable, `clear_poison` since 1.77.0 | Poisoning semantics, advisory-only guarantee, recovery API |
| [Rust API Guidelines — Interoperability](https://rust-lang.github.io/api-guidelines/interoperability.html) | Official Rust API guidelines (rust-lang org) | current | `C-GOOD-ERR`: `Error`+`Send`+`Sync`, Display formatting convention, no `()` as error |
| [rust-lang/project-error-handling#27](https://github.com/rust-lang/project-error-handling/issues/27) | Rust error-handling WG issue (archived repo, primary discussion) | archived Sep 2024, still authoritative | Names the "double reporting" anti-pattern with real clap-rs/handlebars-rust cases |
| [nrc error-docs: error-type-design](https://nrc.github.io/error-docs/error-design/error-type-design.html) | In-progress Rust error-handling reference book (by a former Rust team member) | current, flagged WIP by the author | Origin-vs-recovery partitioning heuristic, opaque type / boxing tradeoffs, `std::io::Error` packed-repr note |
| [Rust Book ch. 9.3 — To panic! or Not to panic!](https://doc.rust-lang.org/book/ch09-03-to-panic-or-not-to-panic.html) | Official Rust Book | current, edition-2024 era | Canonical panic-vs-Result decision framework and `expect()` message convention |
| [Rustonomicon — Unwinding](https://doc.rust-lang.org/nomicon/unwinding.html) | Official advanced-Rust reference | current | `catch_unwind` legitimate use, FFI-boundary UB warning, unwind cost model |
| [Cargo manifest reference — `[lints]`](https://doc.rust-lang.org/cargo/reference/manifest.html#the-lints-section) | Official Cargo book | current | Exact `[lints]`/`[lints.clippy]` TOML syntax, level semantics, tool-table resolution |
| [clippy lint_configuration.html](https://doc.rust-lang.org/clippy/lint_configuration.html) | Official clippy book | current | Exact `large-error-threshold` (128) default, `allow-unwrap-in-tests`/`allow-expect-in-tests` defaults |
| [clippy source: `unwrap_used`/`expect_used`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/methods/mod.rs) | Clippy repo source (primary) | current `master` | Verbatim `declare_clippy_lint!` doc comments, restriction-group + allow-by-default confirmed in code |
| [clippy source: `panic`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/panic_unimplemented.rs) | Clippy repo source (primary) | current `master` | Verbatim doc comment, restriction group, stable since 1.40.0 |
| [clippy source: `error_impl_error`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/error_impl_error.rs) | Clippy repo source (primary) | current `master` | Verbatim rationale for banning bare `Error`-named types |
| [clippy source: doc lints (`missing_errors_doc`/`missing_panics_doc`)](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/doc/mod.rs) | Clippy repo source (primary) | current `master` | Verbatim doc comments, pedantic-group confirmation |
| [clippy source: `result_large_err`](https://raw.githubusercontent.com/rust-lang/rust-clippy/master/clippy_lints/src/functions/mod.rs) | Clippy repo source (primary) | current `master`, stable since 1.65.0 | Verbatim before/after boxing example, perf-group rationale about `Result` propagation cost |
| [docs.rs/clap ErrorKind](https://docs.rs/clap/latest/clap/error/enum.ErrorKind.html) | Real-world crate docs | current | Concrete `#[non_exhaustive]` + opaque-struct-`kind()` example |
| [docs.rs/reqwest Error](https://docs.rs/reqwest/latest/reqwest/struct.Error.html) | Real-world crate docs | current | Concrete fully-opaque accessor-method error-type example |
| [docs.rs/sysexits](https://docs.rs/sysexits/latest/sysexits/) | Real-world crate docs | current | `sysexits.h`-derived `ExitCode` enum for taxonomy→exit-code mapping |

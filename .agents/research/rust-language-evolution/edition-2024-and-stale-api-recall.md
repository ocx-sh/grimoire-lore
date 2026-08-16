---
title: Edition 2024 Semantics and Stale-API Recall
agent: rust-edition-2024-researcher
model: sonnet
date_researched: 2026-08
sources_count: 21
scope: >
  Delta between the Rust an LLM has internalized (2021-edition, pre-1.80
  corpus-heavy) and Rust that compiles today (edition 2024, Rust 1.85+,
  current as of Rust 1.89 / rand 0.10 / reqwest 0.13, August 2026). Covers
  edition-2024 semantic changes, post-cutoff stdlib/language features, and
  crate-API drift for rand/thiserror/reqwest/rustls. Written for use as
  AI-agent configuration (rules + skills) for autonomous Rust code
  generation and review.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [`static mut` references — deny-by-default UB trap](#1-static-mut-references--deny-by-default-ub-trap)
   2. [`unsafe_op_in_unsafe_fn` — unsafe fn no longer grants unsafe powers](#2-unsafe_op_in_unsafe_fn--unsafe-fn-no-longer-grants-unsafe-powers)
   3. [`unsafe extern` blocks and `#[unsafe(no_mangle)]`](#3-unsafe-extern-blocks-and-unsafeno_mangle)
   4. [RPIT lifetime capture — implicit capture-all in 2024](#4-rpit-lifetime-capture--implicit-capture-all-in-2024)
   5. [`gen` reserved, `env::set_var`/`remove_var` now unsafe](#5-gen-reserved-envset_varremove_var-now-unsafe)
   6. [Post-cutoff features an agent may misjudge](#6-post-cutoff-features-an-agent-may-misjudge)
   7. [Crate-API drift: rand 0.9 → 0.10](#7-crate-api-drift-rand-09--010)
   8. [Crate-API drift: thiserror 2](#8-crate-api-drift-thiserror-2)
   9. [Crate-API drift: reqwest 0.12 → 0.13 and rustls crypto providers](#9-crate-api-drift-reqwest-012--013-and-rustls-crypto-providers)
   10. [Dead crates](#10-dead-crates)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

1. `static_mut_refs` is deny-by-default in edition 2024: taking `&`/`&mut` to a `static mut` is instant UB and now a hard compile error, not just a lint. Fix with `Atomic*`, `Mutex`, `LazyLock`/`OnceLock`, or `&raw mut`/`&raw const` — never `#[allow(static_mut_refs)]`.
2. `unsafe_op_in_unsafe_fn` is warn-by-default in edition 2024: an `unsafe fn` body must wrap unsafe operations in an explicit `unsafe {}` block. `cargo fix --edition` migrates it automatically; `#[allow(unsafe_op_in_unsafe_fn)]` is a red flag, not a fix.
3. `extern` blocks must be written `unsafe extern "C" { ... }` in edition 2024, and `#[no_mangle]`/`#[export_name]`/`#[link_section]` must be written `#[unsafe(no_mangle)]` etc. Pre-2024 FFI code does not compile as-is.
4. Return-position `impl Trait` captures **all** in-scope generic type/const/lifetime parameters by default in edition 2024 (previously lifetimes were excluded unless explicitly bounded). `+ use<'a, T>` opts a subset back in; `+ use<>` restores 2021 behavior. `cargo fix --edition` handles the mechanical cases; APIT (`impl Trait` in argument position) needs manual conversion to a named generic.
5. `gen` is a reserved keyword in edition 2024 (generator blocks are still unstable/unimplemented) — any crate using `gen` as an identifier needs `r#gen` or a rename; `cargo fix --edition` does this automatically.
6. `std::env::set_var` and `std::env::remove_var` are `unsafe fn` as of edition 2024 (actually all editions, since it's a std API change, not edition-gated) — every call site needs an `unsafe` block, and tests that mutate env vars in parallel are now flagged as a real soundness concern, not just style.
7. If-let chains (`if let Some(x) = a && let Some(y) = b { ... }`) stabilized in Rust 1.88 (June 2025) but work **only on the 2024 edition** — on a 2021-edition crate the compiler treats the syntax as a parse error with no edition hint, which reads to an agent as "I wrote this wrong" rather than "wrong edition."
8. Async closures (`async || {}`) and the `AsyncFn`/`AsyncFnMut`/`AsyncFnOnce` traits stabilized in Rust 1.85 (Feb 2025) — an LLM trained mostly on pre-1.85 corpus will reach for `Fn() -> impl Future` workarounds that are now needless.
9. `LazyLock`/`OnceLock` (stable since Rust 1.80, Aug 2024) supersede `once_cell::sync::Lazy`/`OnceCell` and `lazy_static!` for the plain "one static, lazily built" case — but `LazyLock` poisoning is **unrecoverable** (every subsequent access panics forever after the init closure panics once), unlike `Mutex` poisoning which is recoverable via `PoisonError::into_inner()`.
10. `#[expect(lint)]` stabilized in Rust 1.81 (Sep 2024): unlike `#[allow]`, it itself warns if the lint never actually fires, so it can't silently rot into permanent, unjustified suppression the way `#[allow]` can.
11. rand 0.9 (Jan 2025) renamed the entire ergonomic surface: `thread_rng()`→`rng()`, `Rng::gen()`→`random()` (forced by the `gen` keyword reservation), `gen_range()`→`random_range()`, `rand::distributions`→`rand::distr`, `SliceRandom` split into `IndexedRandom`/`IndexedMutRandom`/`SliceRandom`.
12. rand has already moved again: **rand 0.10.0 shipped Feb 2026** and is current as of this research — it further renames `OsRng`→`SysRng`, and (because `rand_core` renamed `RngCore`→`Rng`) the old `Rng` trait is now `RngExt`. An agent trained on rand 0.9-era docs will still be stale.
13. thiserror 2.0 (Nov 2024) requires the crate that invokes `#[derive(Error)]` to have `thiserror` as a **direct** dependency — a transitive-only dependency (common when one internal crate re-exports the derive) no longer compiles. It also dropped `{r#type}`-style raw-identifier field interpolation in format strings — use the unraw name (`{type}`) instead.
14. reqwest 0.12 (Mar 2024) moved to hyper/http/http-body 1.x — a breaking wire-level dependency bump, not just a version bump. reqwest 0.13 (2025) made `rustls` the default TLS backend (over `native-tls`) **and** switched rustls's default crypto provider from `ring` to `aws-lc-rs`.
15. `aws-lc-rs` always requires a C/C++ compiler at build time (cmake only for FIPS builds) — this breaks pure cross-compilation setups (`cross`, zig-cc, or a CI matrix building Linux/macOS/Windows binaries from one Linux host without per-target C toolchains) that worked fine under `ring`, which is pure Rust + a small amount of precompiled/allowed assembly.
16. There is no `rustls-tls-ring` reqwest feature in 0.13 — the public ring opt-out that existed as an internal `__rustls-ring` feature under reqwest 0.12's `rustls-tls` was removed. Projects that need ring on 0.13 must depend on `rustls` directly with its `ring` feature and disable reqwest's default `rustls` (aws-lc-rs) feature — a materially different pin than "just add a feature flag."
17. rustls's `CryptoProvider::install_default()` can only succeed once per process. If two dependencies in the same binary each try to install a different default provider (one pulling in `ring`, another `aws-lc-rs`), the second `install_default()` call fails at **runtime**, not compile time — this is a real, observed failure mode in dependency trees that mix TLS-using crates.
18. async-std is discontinued (maintainers: "use smol instead"); structopt is in permanent maintenance mode superseded by clap v3+; error-chain and failure predate `anyhow`/`thiserror` and are dead. None of these should appear in new code.
19. `once_cell` (the crate) is not dead — it still leads on features `LazyLock`/`OnceLock` don't have (e.g., `Lazy` with reentrant-safe reinitialization patterns, `OnceCell` without `Sync` bound needs) — but for the plain "lazily-initialized static, single-threaded-or-not" case, std now covers it and pulling the crate for that case is an avoidable dependency.
20. Precise capturing on RPITIT (`impl Trait` inside a `trait` definition, not a free function) via `use<...>` stabilized separately and later, in Rust 1.87 (May 2025) — the free-function `use<'a, T>` syntax itself stabilized earlier (1.82, Oct 2024) for all editions. An agent that assumes `use<...>` works uniformly everywhere as of 1.82 will be wrong specifically for trait-method RPIT until 1.87.

## Findings

### 1. `static mut` references — deny-by-default UB trap

The [Rust 2024 edition guide](https://doc.rust-lang.org/edition-guide/rust-2024/static-mut-references.html) states the `static_mut_refs` lint is now **deny by default**: taking a shared or mutable reference to a `static mut` item is flagged even if the reference is never dereferenced, because "taking a reference to a `static mut` ... constitutes instantaneous undefined behavior."

```rust
// WRONG — compiles under 2021, denied under 2024
static mut COUNTER: u64 = 0;
unsafe {
    COUNTER += 1;                 // implicit &mut COUNTER, deny(static_mut_refs)
}

// RIGHT
use std::sync::atomic::{AtomicU64, Ordering};
static COUNTER: AtomicU64 = AtomicU64::new(0);
COUNTER.fetch_add(1, Ordering::Relaxed);   // no `unsafe` needed at all
```

For non-atomic-representable state, the edition guide's recommended ladder is: `Mutex`/`RwLock` for general mutable data, `LazyLock` for parameterless one-time init, `OnceLock` for one-time init that needs a runtime argument, and `&raw mut`/`&raw const` (not `&mut`/`&`) only when interfacing with FFI that requires a genuine raw pointer.

**There is no automated migration** — `cargo fix --edition` does not touch this one; every site is a manual rewrite.

### 2. `unsafe_op_in_unsafe_fn` — unsafe fn no longer grants unsafe powers

Per [the edition guide](https://doc.rust-lang.org/edition-guide/rust-2024/unsafe-op-in-unsafe-fn.html) (citing [RFC 2585](https://rust-lang.github.io/rfcs/2585-unsafe-block-in-unsafe-fn.html)), `unsafe fn` previously did double duty: it told the *caller* the call is unsafe, and it implicitly let the *body* perform unsafe operations without a nested `unsafe {}`. Edition 2024 splits these — the body needs its own `unsafe {}` block, just like a safe function would.

```rust
// WRONG under 2024 (warn_by_default -> commonly denied in CI)
unsafe fn get_unchecked<T>(x: &[T], i: usize) -> &T {
    x.get_unchecked(i)
}

// RIGHT
unsafe fn get_unchecked<T>(x: &[T], i: usize) -> &T {
    unsafe { x.get_unchecked(i) }
}
```

`cargo fix --edition` migrates this mechanically. **`#[allow(unsafe_op_in_unsafe_fn)]` at the crate or function level defeats the entire point of the change** — it lets an agent under compile pressure paper over a genuine "which line is actually unsafe" ambiguity instead of resolving it.

### 3. `unsafe extern` blocks and `#[unsafe(no_mangle)]`

Per the [edition guide](https://doc.rust-lang.org/edition-guide/rust-2024/unsafe-extern.html), `extern` blocks (FFI declarations) must be marked `unsafe extern` in 2024, and individual items inside can be marked `safe` or `unsafe` per-item:

```rust
unsafe extern "C" {
    pub safe fn sqrt(x: f64) -> f64;               // no UB possible for any input
    pub unsafe fn strlen(p: *const std::ffi::c_char) -> usize; // caller must uphold validity
    pub safe static IMPORTANT_BYTES: [u8; 256];
}
```

`#[export_name]`, `#[link_section]`, and `#[no_mangle]` similarly require the `#[unsafe(...)]` wrapper:

```rust
#[unsafe(no_mangle)]
pub extern "C" fn my_ffi_fn() { /* ... */ }
```

`cargo fix --edition` handles this via the `missing_unsafe_on_extern` lint, but **cannot verify signature correctness** — a WinAPI shim with ~75 unsafe sites needs a human/reviewer pass after the mechanical fix, not just a green `cargo build`.

### 4. RPIT lifetime capture — implicit capture-all in 2024

Per the [edition guide](https://doc.rust-lang.org/edition-guide/rust-2024/rpit-lifetime-capture.html), in 2021 and earlier, `fn f(_: &()) -> impl Sized {}` does **not** capture the elided lifetime in the opaque return type. In 2024, it does, implicitly equivalent to `-> impl Sized + use<'_>`.

```rust
// 2021: caller can treat the return type as 'static-independent of the input lifetime
fn f(_: &()) -> impl Sized {}

// 2024: same signature now implicitly captures the input lifetime —
// this can break callers who relied on the returned opaque type outliving the borrow
```

`cargo fix --edition` inserts `+ use<>` to preserve 2021 semantics where the tool can prove it's safe; **APIT (argument-position `impl Trait`) cases need manual work** because the anonymous generic parameter has to be given a name before it can appear in a `use<...>` bound. The free-function `use<'a, T>` precise-capturing syntax itself stabilized in **Rust 1.82** (Oct 2024) and works on all editions as an explicit opt-in; capturing analogous to it inside `trait` method RPIT (RPITIT) stabilized later, in **Rust 1.87** (May 2025, [RELEASES.md](https://raw.githubusercontent.com/rust-lang/rust/master/RELEASES.md)). Treat this as both a one-time `cargo fix --edition` migration pass **and** an ongoing awareness item any time a function's return type widens or narrows what it captures.

### 5. `gen` reserved, `env::set_var`/`remove_var` now unsafe

`gen` becomes a reserved keyword in edition 2024 ([edition guide](https://doc.rust-lang.org/edition-guide/rust-2024/gen-keyword.html)) ahead of a future generator-blocks feature that is **still unstable** — an agent should not write `gen { ... }` blocks expecting them to compile. Existing identifiers named `gen` need `r#gen` (`cargo fix --edition` via `keyword_idents_2024`).

`std::env::set_var`, `std::env::remove_var`, and `std::os::unix::process::CommandExt::before_exec` became `unsafe fn` (confirmed in the [Rust 1.85.0 release post](https://blog.rust-lang.org/2025/02/20/Rust-1.85.0/)) — this is a std API change tied to the 1.85 release, not edition-gated, so it affects 2021-edition crates on a current toolchain too. Every call site (very commonly in test setup/teardown) needs an `unsafe { }` wrapper, and — because mutating process-wide env vars from multiple threads is a genuine data race — parallel test harnesses that call `set_var` need a serialization strategy (a mutex-guarded test helper, or `#[serial]` from the `serial_test` crate), not just the `unsafe` keyword slapped on.

### 6. Post-cutoff features an agent may misjudge

| Feature | Stabilized | Edition-gated? | Source |
|---|---|---|---|
| Async closures / `AsyncFn`, `AsyncFnMut`, `AsyncFnOnce` | 1.85 (Feb 2025) | No | [1.85.0 post](https://blog.rust-lang.org/2025/02/20/Rust-1.85.0/) |
| `LazyLock`/`OnceLock` (std) | 1.80 (Aug 2024) | No | [`LazyLock` docs](https://doc.rust-lang.org/std/sync/struct.LazyLock.html) |
| `#[expect(lint)]` | 1.81 (Sep 2024) | No | [1.81.0 post](https://blog.rust-lang.org/2024/09/05/Rust-1.81.0/) |
| Precise capturing `use<'a, T>` (free fns) | 1.82 (Oct 2024) | No (opt-in on any edition) | [edition guide, RPIT capture](https://doc.rust-lang.org/edition-guide/rust-2024/rpit-lifetime-capture.html) |
| Precise capturing in traits (RPITIT `use<...>`) | 1.87 (May 2025) | No | [RELEASES.md](https://raw.githubusercontent.com/rust-lang/rust/master/RELEASES.md) |
| If-let chains (`if let ... && let ...`) | 1.88 (Jun 2025) | **Yes — 2024 only** | [1.88.0 post](https://blog.rust-lang.org/2025/06/26/Rust-1.88.0/) |
| `gen` keyword reserved (generator blocks still unstable) | 1.85 (edition 2024) | Yes | [edition guide, gen keyword](https://doc.rust-lang.org/edition-guide/rust-2024/gen-keyword.html) |

The if-let-chains edition gate is the sharpest trap: the [1.88.0 release post](https://blog.rust-lang.org/2025/06/26/Rust-1.88.0/) explains the restriction to 2024 exists because the feature depends on 2024's `if let` temporary-scope/drop-order change for consistent semantics — "earlier attempts to support all editions encountered difficult edge cases." An agent generating code for a 2021-edition crate (many are, since 2021 is still extremely common in the wild and in training data) that writes `if let Some(x) = a && let Some(y) = b` gets a compile failure with **no edition hint in the message** — it reads as a syntax mistake, not a feature-availability mistake, and an agent is liable to "fix" it by mangling the logic instead of checking the crate's `edition` key.

### 7. Crate-API drift: rand 0.9 → 0.10

rand 0.9.0 (Jan 2025, [CHANGELOG](https://raw.githubusercontent.com/rand/rand/master/CHANGELOG.md) via [rust-random/rand](https://github.com/rust-random/rand/blob/master/CHANGELOG.md)) renamed the whole ergonomic entry surface:

| Old (≤0.8) | New (0.9) |
|---|---|
| `rand::thread_rng()` | `rand::rng()` (also removed from the prelude) |
| `Rng::gen()` | `Rng::random()` — forced by the `gen` keyword reservation in edition 2024 |
| `Rng::gen_range()` | `Rng::random_range()` |
| `Rng::gen_bool()` / `gen_ratio()` | `Rng::random_bool()` / `random_ratio()` |
| `rand::distributions` | `rand::distr` |
| `distr::Standard` | `distr::StandardUniform` |
| `SliceRandom` (one trait) | split into `IndexedRandom`, `IndexedMutRandom`, `SliceRandom` |
| feature `getrandom` | feature `os_rng` |
| feature `serde1` | feature `serde` |

**rand has already moved past 0.9**: rand **0.10.0 shipped 2026-02-08** and is the current stable line as of this research (0.10.2, 2026-07-02). It uses edition 2024 / MSRV 1.85 itself, and renames further: `os_rng`→`sys_rng`, `OsRng`→`SysRng`, `OsError`→`SysError`, and — because upstream `rand_core` renamed `RngCore`→`Rng` — the old `Rng` trait is now `RngExt`. An agent whose knowledge stops at "rand 0.9 renamed thread_rng to rng" is one full major version behind current.

### 8. Crate-API drift: thiserror 2

thiserror 2.0.0 (Nov 2024, [release](https://github.com/dtolnay/thiserror/releases/tag/2.0.0)) breaking changes:

- **Direct-dependency requirement**: "Code containing invocations of thiserror's `derive(Error)` must now have a direct dependency on the `thiserror` crate regardless of the error data structure's contents." A crate that only pulls in thiserror transitively (e.g., via an internal shared-types crate re-exporting the derive macro) no longer compiles — it must add `thiserror` to its own `Cargo.toml`.
- **Dropped raw-identifier interpolation**: `{r#type}` in an `#[error("...")]` format string is no longer accepted; use the unraw field name (`{type}`) directly.
- Tuple structs/variants can no longer mix positional `{0}`/`{1}` access with extra positional format arguments in the same message (ambiguous).
- No longer infers trait bounds on fields whose values are shadowed by explicit named format arguments.

### 9. Crate-API drift: reqwest 0.12 → 0.13 and rustls crypto providers

reqwest 0.12.0 (Mar 2024) is a wire-protocol-level breaking change: it moved to hyper/http/http-body **1.x**. Anything downstream doing low-level hyper/http-body interop (custom middleware, body streaming) needs its own bump, not just a reqwest version bump.

reqwest 0.13.0 ([CHANGELOG](https://raw.githubusercontent.com/seanmonstar/reqwest/master/CHANGELOG.md)) — current stable is 0.13.4 (2026-05-25):

- `rustls` is now the default TLS backend (was `native-tls`).
- rustls's default crypto provider is now **aws-lc-rs**, not ring.
- `rustls-tls` feature renamed to `rustls`; the old `rustls-tls-manual-roots`/`webpki-roots`/`native-roots` split is gone in favor of `rustls-platform-verifier` by default.
- `query`/`form` are now separate opt-in crate features (previously always compiled in).

**Cross-compilation consequence**: [aws-lc-rs's own build-requirements doc](https://aws.github.io/aws-lc-rs/requirements/) states a C/C++ compiler is *always* required (cmake only for FIPS builds). A project shipping prebuilt binaries across Linux/macOS/Windows from a single CI runner (`cross`, zig-cc, or manual per-target toolchains) that previously worked with ring — a pure-Rust crypto backend with no C-toolchain dependency — now needs a working C compiler for **every** cross target when it pulls in reqwest's default `rustls` feature. This is exactly the OCX/Grimoire shipping model (prebuilt binaries, Linux/macOS/Windows matrix).

**There is no direct `rustls-tls-ring` feature on reqwest 0.13** — the ring opt-out that existed as an internal `__rustls-ring` feature under reqwest 0.12's public `rustls-tls` feature ([confirmed against reqwest 0.12.12's `Cargo.toml`](https://raw.githubusercontent.com/seanmonstar/reqwest/v0.12.12/Cargo.toml)) was removed in 0.13. To stay on ring today, depend on the `rustls` crate directly with its `ring` feature, disable reqwest's default features, and re-enable only what's needed minus the default `rustls`(aws-lc-rs) pull — a materially bigger pin than flipping one feature flag.

**Runtime, not compile-time, failure mode**: [`rustls::crypto::CryptoProvider::install_default()`](https://docs.rs/rustls/latest/rustls/crypto/struct.CryptoProvider.html) documents that it "can be called successfully at most once in any process execution." If the dependency tree links two crates that each try to install a different default provider (one wanting ring, another aws-lc-rs — plausible when reqwest and a second TLS-using crate disagree), the second `install_default()` call returns `Err` (or the process panics, depending on how the caller handles that `Result`) — this surfaces as a runtime failure on whichever code path runs second, not a `cargo build` error, making it a much harder bug to trace back to a `Cargo.toml` feature-unification problem.

### 10. Dead crates

- **async-std**: officially discontinued; the [repo's own banner](https://github.com/async-rs/async-std) says "async-std has been discontinued; use smol instead."
- **structopt**: in permanent maintenance mode; [the repo](https://github.com/TeXitoi/structopt) states clap v3+ absorbed its functionality and directs users to clap's structopt migration guide.
- **error-chain**, **failure**: predate `anyhow`/`thiserror`; long unmaintained, do not appear in new code.

## Normative guidance candidates

1. **Read the target crate's `edition` (and `rust-version` if present) from `Cargo.toml` before emitting any edition-gated syntax** (if-let chains, `gen` blocks, bare `unsafe extern`/`#[unsafe(no_mangle)]` assumptions). Rationale: if-let chains and `unsafe extern` requirements are 2024-only; emitting them into a 2021-edition crate is a silent parse-failure trap, not a warning.
   VERIFICATION: `grep -E '^edition\s*=' Cargo.toml` (and `grep -E '^rust-version\s*='`) before generating code; reject if-let-chain syntax when edition < 2024.

2. **Never introduce `#[allow(static_mut_refs)]` or `#[allow(unsafe_op_in_unsafe_fn)]` — treat any diff adding either as review-blocking.** Rationale: both lints exist specifically to catch instant-UB or ambiguous-unsafe-scope bugs; allowing them preserves the exact defect the edition change was designed to surface.
   VERIFICATION: `git diff | grep -E '#!?\[allow\((static_mut_refs|unsafe_op_in_unsafe_fn)\)\]'` in CI / pre-merge review — any match fails the check.

3. **Ban `static mut` outright; require `Atomic*`/`Mutex`/`LazyLock`/`OnceLock` for any process-global mutable state.** Rationale: even without the lint, `static mut` requires proving no aliasing across the whole reentrancy/threading surface of the program, which does not scale to review.
   VERIFICATION: `grep -rn 'static mut ' --include=*.rs`; a clean grep is the pass condition. `cargo clippy` also flags most patterns via `clippy::mut_from_ref`/rustc's own `static_mut_refs` making it a hard error.

4. **Every `unsafe {}` block gets a `// SAFETY:` comment explaining the invariant it upholds — required now that `unsafe fn` bodies need their own explicit blocks, giving each block a distinct, reviewable scope.** Rationale: 2024's `unsafe_op_in_unsafe_fn` forces isolating exactly which operation is unsafe; that isolation is wasted if the accompanying justification isn't captured at the same granularity.
   VERIFICATION: `clippy::undocumented_unsafe_blocks` lint (enable in `[lints.clippy]`); or `grep -B1 'unsafe {' **/*.rs` sampled for missing `SAFETY:` comments.

5. **New FFI code must use `unsafe extern "C" { ... }` with per-item `safe`/`unsafe` markers, and `#[unsafe(no_mangle)]`/`#[unsafe(export_name)]`/`#[unsafe(link_section)]` — never the pre-2024 bare forms — on any 2024-edition crate.** Rationale: pre-2024 FFI syntax does not compile under edition 2024; an agent recalling older FFI examples produces a build break, not a working shim.
   VERIFICATION: `cargo build` itself is the check (pre-2024 forms are hard parse/compile errors under 2024); for review, `grep -n '^extern "C"' --include=*.rs` should return nothing on a 2024-edition crate (should always be `unsafe extern`).

6. **After any signature change to a function returning `impl Trait`, re-check what lifetimes/generics it now captures — do not assume 2021-era RPIT semantics.** Rationale: edition 2024 captures all in-scope generics (including lifetimes) implicitly; a signature that used to let the caller treat the return type as independent of an input borrow may now tie the two together, breaking callers silently at their call site instead of the function's own definition.
   VERIFICATION: `cargo fix --edition` run + `cargo build` on affected crates surfaces new capture-related borrow errors; for ongoing (non-migration) code, run `cargo clippy` and inspect any new "the following changes may be needed" lifetime diagnostics after touching an RPIT-returning fn signature.

7. **Prefer `std::sync::LazyLock`/`OnceLock` over `once_cell` or `lazy_static` for the plain "one global, lazily initialized" case; keep `once_cell` only where its extra API surface (non-`Sync` `OnceCell`, reentrant-safe patterns) is actually used — and know `LazyLock`'s panic-on-init poisoning is unrecoverable, unlike `Mutex`.** Rationale: fewer dependencies for the common case, but the two are not drop-in equivalents on panic behavior — treating them as interchangeable risks turning a recoverable-by-design pattern into a permanently-poisoned global.
   VERIFICATION: `cargo tree -e normal | grep -E 'once_cell|lazy_static'` — any hit should be justified in a comment or removed; `grep -rn 'LazyLock::new' --include=*.rs` sites should have a nearby comment or test covering the panic-poisons-forever behavior if the init closure is fallible.

8. **Ban `async-std`, `structopt`, `error-chain`, `failure` at the dependency-graph level via a `cargo-deny` `[[bans.deny]]` list; treat any reintroduction as a review-blocking regression.** Rationale: all four are dead or superseded upstream; letting one back in via a transitive dependency upgrade is a silent regression nobody chose.
   VERIFICATION: `cargo deny check bans` in CI with the list below; `cargo tree -i <crate>` to find the offending dependency path if the check fails.
   ```toml
   [[bans.deny]]
   name = "async-std"
   reason = "discontinued upstream; use tokio (already the project's runtime)"

   [[bans.deny]]
   name = "structopt"
   reason = "maintenance-mode upstream; functionality absorbed into clap (already a dependency)"
   use-instead = "clap"

   [[bans.deny]]
   name = "error-chain"
   reason = "long unmaintained; use thiserror/anyhow"

   [[bans.deny]]
   name = "failure"
   reason = "long unmaintained; use thiserror/anyhow"
   ```

9. **When adding or upgrading `rand`, `thiserror`, or `reqwest`, check the exact renamed API against the lookup tables in this document before writing call sites — do not pattern-match against remembered pre-2024 names (`thread_rng`, `gen_range`, `distributions::Standard`).** Rationale: these are the three highest-churn crates in the dependency graph and each has renamed its most commonly-used surface at least once since the training-corpus-heavy era.
   VERIFICATION: `cargo build` will catch renamed-symbol errors immediately after a version bump — but before writing new code, `cargo doc --open -p rand` (or `docs.rs/rand/<pinned-version>`) beats generating from memory; also grep for the specific stale names: `grep -rnE 'thread_rng\(\)|\.gen\(\)|\.gen_range\(|rand::distributions' --include=*.rs`.

10. **On any dependency-graph change touching TLS (reqwest, rustls, or anything pulling in a `CryptoProvider`), verify there is exactly one crypto provider selected process-wide, and that it matches what the cross-compilation toolchain can actually build for every shipped target.** Rationale: `CryptoProvider::install_default()` conflicts are a runtime failure invisible at compile time, and aws-lc-rs's C-compiler requirement can silently break a cross-target release build that previously needed no C toolchain at all.
   VERIFICATION: `cargo tree -e features -i rustls` (or `-i ring` / `-i aws-lc-rs`) to confirm only one crypto backend is reachable; run the actual cross-compilation matrix (not just `cargo check` on the host) in CI for every shipped target, since aws-lc-rs's C-compiler requirement only surfaces during a real cross build.

## AI-agent angle

- **The single highest-frequency failure**: an agent writes 2021-edition-shaped `unsafe fn` bodies, `static mut` access, or bare `extern "C"` blocks because that's what dominates its training corpus, and — critically — **fixes the resulting compile error by adding `#[allow(...)]` instead of restructuring the code**, because that's the shortest diff that makes the error go away. This is precisely the failure mode this document's rule 2 exists to block. Smallest mechanical check: grep the diff for `#[allow(static_mut_refs)]` / `#[allow(unsafe_op_in_unsafe_fn)]` before allowing a merge — zero false negatives, trivial to run.
- **Edition-gated syntax without an edition check**: an agent asked to "modernize this code" or shown a snippet using if-let chains has no way to know from the syntax alone whether the target crate can use it — it must read `Cargo.toml`'s `edition` key first. Smallest check: a pre-codegen grep of `edition = "20XX"` gating a small allow/deny-list of syntax features the agent is about to emit.
- **Stale crate-API recall reads as confident, not tentative** — an agent doesn't hedge "I think `thread_rng` might be renamed now"; it just writes `rand::thread_rng()` as fact. The fix isn't better prompting, it's mechanical: before emitting a call into `rand`, `thiserror`, or `reqwest`, check the pinned version in `Cargo.toml`/`Cargo.lock` against the rename table in this document (or fetch `docs.rs/<crate>/<version>`) rather than generating from memory.
- **Runtime-only failures (crypto provider conflicts) are invisible to an agent that only runs `cargo check`.** An agent that treats a clean `cargo build`/`cargo check` as proof of correctness will ship a `CryptoProvider::install_default()` panic straight to a user, because nothing before actual TLS-handshake time exercises that path. Smallest check: a one-line runtime smoke test that performs one real TLS connection (or explicitly calls `install_default()` and asserts `Ok`) in the crate's own test suite, not just a compile check.
- **Cross-compilation regressions from a dependency bump are invisible on the developer's own machine.** Bumping reqwest to pull in aws-lc-rs compiles fine on a Linux dev box with a C toolchain already installed; it only breaks in the CI cross-build job for a target lacking `cc`. Smallest check: never trust `cargo check` on the host as a stand-in for the actual release cross-build matrix when reviewing a dependency-bump PR.

## Contested / evolving

- **Whether to pin `ring` or accept `aws-lc-rs` is an active, unsettled trade-off**, not a solved question: `aws-lc-rs` gets more investment (AWS-backed, FIPS path) and is now upstream's default, but it costs a C toolchain on every cross-compilation target, which directly conflicts with a "ship prebuilt binaries from one CI runner with no per-target C toolchain" model. Direction of travel: the ecosystem (rustls, reqwest) has moved decisively toward aws-lc-rs as default, but `ring` support is explicitly preserved as a feature, not deprecated — projects with a pure cross-compilation constraint are the case for staying on ring deliberately, against the ecosystem default.
- **`gen` blocks (generators) remain unstable** despite the keyword being reserved since edition 2024 (Feb 2025) through at least Rust 1.89 (Aug 2025) — the keyword reservation was preparatory, and there is no confirmed stabilization timeline as of this research. Do not write speculative code assuming `gen {}` syntax will "just work" on a future compiler without checking current nightly status first.
- **rand's churn is not over**: two renaming waves in just over a year (0.9 in Jan 2025, 0.10 in Feb 2026, with further renames like `Rng`→`RngExt` following an upstream `rand_core` rename) suggests the crate is still stabilizing its post-`gen`-keyword-collision naming scheme. Treat any rand API name learned before mid-2026 as provisionally stale and re-verify against the pinned version rather than assuming 0.9 is still current.
- **Whether `once_cell` still earns its place as a dependency** once `LazyLock`/`OnceLock` cover the plain case is genuinely project-specific — some codebases lean on `once_cell`'s extra combinators; a blanket "always replace once_cell with std" rule is defensible as a default but not universally correct, and should be a lint/suggestion, not an automatic-reject.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [blog.rust-lang.org/2025/02/20/Rust-1.85.0](https://blog.rust-lang.org/2025/02/20/Rust-1.85.0/) | Official release announcement | Feb 2025, primary | The edition-2024-shipping release; covers static_mut_refs, unsafe_op_in_unsafe_fn, unsafe extern, env::set_var, async closures in one primary source |
| [doc.rust-lang.org/edition-guide/rust-2024/index.html](https://doc.rust-lang.org/edition-guide/rust-2024/index.html) | Official Edition Guide, 2024 chapter index | Current, primary | Canonical enumeration of every edition-2024 breaking change |
| [.../rust-2024/static-mut-references.html](https://doc.rust-lang.org/edition-guide/rust-2024/static-mut-references.html) | Edition Guide subpage | Current, primary | Exact migration recipes for the static-mut-refs deny |
| [.../rust-2024/unsafe-op-in-unsafe-fn.html](https://doc.rust-lang.org/edition-guide/rust-2024/unsafe-op-in-unsafe-fn.html) | Edition Guide subpage | Current, primary | Before/after code, `cargo fix --edition` behavior |
| [.../rust-2024/unsafe-extern.html](https://doc.rust-lang.org/edition-guide/rust-2024/unsafe-extern.html) | Edition Guide subpage | Current, primary | `unsafe extern`/`#[unsafe(no_mangle)]` exact syntax |
| [.../rust-2024/rpit-lifetime-capture.html](https://doc.rust-lang.org/edition-guide/rust-2024/rpit-lifetime-capture.html) | Edition Guide subpage | Current, primary | `use<...>` syntax, capture-all semantics, migration patterns |
| [.../rust-2024/gen-keyword.html](https://doc.rust-lang.org/edition-guide/rust-2024/gen-keyword.html) | Edition Guide subpage | Current, primary | `gen` reservation scope and `r#gen` migration |
| [raw RELEASES.md, rust-lang/rust](https://raw.githubusercontent.com/rust-lang/rust/master/RELEASES.md) | Canonical stabilization changelog | Rolling, primary | Exact per-version stabilization list (1.87 precise-capturing-in-traits, 1.88 let-chains, 1.89) |
| [doc.rust-lang.org/std/sync/struct.LazyLock.html](https://doc.rust-lang.org/std/sync/struct.LazyLock.html) | std API docs | Current, primary | Stabilization version (1.80) and unrecoverable-poisoning semantics, explicitly contrasted with `Mutex` |
| [blog.rust-lang.org/2025/06/26/Rust-1.88.0](https://blog.rust-lang.org/2025/06/26/Rust-1.88.0/) | Official release announcement | Jun 2025, primary | If-let-chains stabilization and the explicit 2024-edition-only restriction and its rationale |
| [blog.rust-lang.org/2025/04/03/Rust-1.86.0](https://blog.rust-lang.org/2025/04/03/Rust-1.86.0/) | Official release announcement | Apr 2025, primary | Confirms trait upcasting landed here, not an edition-2024 item — useful negative check |
| [blog.rust-lang.org/2024/09/05/Rust-1.81.0](https://blog.rust-lang.org/2024/09/05/Rust-1.81.0/) | Official release announcement | Sep 2024, primary | `#[expect]` attribute stabilization and rationale |
| [github.com/rust-random/rand CHANGELOG.md](https://github.com/rust-random/rand/blob/master/CHANGELOG.md) | Primary crate changelog | Rolling through 0.10.2 (Jul 2026), primary | Exact rename table for 0.9.0 and the further 0.10.0 renames (`RngExt`, `SysRng`) |
| [github.com/dtolnay/thiserror releases/tag/2.0.0](https://github.com/dtolnay/thiserror/releases/tag/2.0.0) | Primary crate release notes | Nov 2024, primary | Direct-dependency requirement and dropped `{r#type}` syntax, verbatim |
| [docs.rs/rustls CryptoProvider](https://docs.rs/rustls/latest/rustls/crypto/struct.CryptoProvider.html) | Primary API docs | Current, primary | `install_default()` once-per-process contract — the runtime-failure mechanism |
| [github.com/seanmonstar/reqwest Cargo.toml (master)](https://github.com/seanmonstar/reqwest/blob/master/Cargo.toml) | Primary manifest | Current (0.13-line), primary | Confirms current feature names and default `aws-lc-rs` selection |
| [raw reqwest v0.12.12 Cargo.toml](https://raw.githubusercontent.com/seanmonstar/reqwest/v0.12.12/Cargo.toml) | Primary manifest, historical tag | Dec 2024, primary | Proves `__rustls-ring` existed under 0.12's `rustls-tls`, for the before/after contrast |
| [raw reqwest CHANGELOG.md (master)](https://raw.githubusercontent.com/seanmonstar/reqwest/master/CHANGELOG.md) | Primary crate changelog | Rolling through 0.13.4 (May 2026), primary | Verbatim 0.13.0 breaking-change bullets |
| [aws.github.io/aws-lc-rs/requirements](https://aws.github.io/aws-lc-rs/requirements/) | Primary project build-requirements doc | Current, primary | C-compiler-always-required fact underlying the cross-compilation concern |
| [github.com/async-rs/async-std](https://github.com/async-rs/async-std) | Repo README/banner | Current, primary (self-declared) | Discontinuation notice, in the maintainers' own words |
| [embarkstudios.github.io/cargo-deny bans/cfg.html](https://embarkstudios.github.io/cargo-deny/checks/bans/cfg.html) | Official cargo-deny docs | Current, primary | Exact `[[bans.deny]]` TOML syntax used in the normative-guidance section |

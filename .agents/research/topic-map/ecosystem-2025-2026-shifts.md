---
title: Rust Ecosystem Shifts 2024-2026 — Landscape Scout
agent: inv-ecosystem-shifts
model: sonnet
date_researched: 2026-08
sources_count: 16
scope: >
  Language/edition changes (2024 edition through mid-2026 stabilizations),
  Cargo/tooling shifts, ecosystem crate churn ("use X not Y in 2026"), and
  emerging practice, for an AI-agent-authored, security-sensitive,
  cross-platform Rust CLI package manager (grim/ocx family).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)
7. [Candidate topics](#candidate-topics)

## Summary

1. Rust 1.85.0 (2025-02-20) stabilized the **2024 edition** — the largest edition yet; an AI agent trained on pre-2025 text will default to 2021-edition idioms that are now wrong or suboptimal.
2. `static mut` references are **deny-by-default UB** in the 2024 edition — any trained-in pattern of `unsafe { &STATIC_MUT }` must be replaced with `AtomicX`, `Mutex`/`RwLock`, or `LazyLock`/`OnceLock`.
3. `unsafe_op_in_unsafe_fn` is on by default in 2024-edition crates — an `unsafe fn` body no longer implicitly grants unsafe powers; every unsafe operation inside needs its own `unsafe {}` block.
4. `extern` blocks and `#[no_mangle]`/`#[export_name]`/`#[link_section]` now require `unsafe extern` / `unsafe(...)` — FFI code written pre-2024-edition style will not compile as-is under the new edition.
5. **If-let chains** (`if let Some(x) = a && let Some(y) = b`) stabilized only in **Rust 1.88.0 (2025-06-26)**, and only under the 2024 edition — this is *newer* than most model training data; do not assume it doesn't exist, but also don't assume it's usable pre-1.88 or on 2021-edition crates.
6. Async closures (`async || {}`, the `AsyncFn`/`AsyncFnMut`/`AsyncFnOnce` traits) stabilized in **1.85.0**, alongside the edition — trained-in workarounds (returning a boxed future from a sync closure) are now obsolete for new code.
7. `LazyLock`/`OnceLock` stabilized in **std as of Rust 1.80.0 (2024-08)** — `once_cell` and `lazy_static` are now legacy for the common case; still needed only for `Lazy<T, F>` with non-`Fn` init or pre-1.80 MSRV.
8. **`gen` is a reserved keyword** in the 2024 edition for future generator/`gen` blocks, but generators themselves are **still unstable** as of mid-2026 — an agent must not write `gen {}` blocks in stable code, and must not use `gen` as an identifier in 2024-edition crates.
9. `cargo script` (single-file `.rs` packages via embedded manifest) is **still nightly-only** (`-Zscript`) as of the current stable docs snapshot — do not tell agents to reach for it in stable-toolchain CI.
10. Cargo's **MSRV-aware resolver** ("resolver = 3", default with 2024-edition workspaces) prefers dependency versions whose `rust-version ≤` the package's own, configurable via `resolver.incompatible-rust-versions = "fallback"|"allow"` — pinning MSRV in `Cargo.toml` now actually changes what `cargo update` picks, not just documentation.
11. `[workspace.lints]` + per-crate `[lints] workspace = true` (stable since 1.74) is the correct way to centralize `#![deny(...)]`/clippy config across a multi-crate workspace like grim/ocx/ocx-mirror — stop duplicating `#![warn(clippy::all)]` per crate.
12. **reqwest 0.12** moved to hyper/http/http-body **v1**; **reqwest 0.13** made **rustls the default TLS backend** (native-tls demoted) and switched rustls's default crypto provider to **aws-lc-rs instead of ring** — code or docs assuming `native-tls`/`ring` defaults are stale.
13. **rand 0.9** renamed the hot API surface: `thread_rng()` → `rng()`, `Rng::gen()` → `random()` (to avoid colliding with the new `gen` keyword), `gen_range`/`gen_bool`/`gen_ratio` → `random_range`/`random_bool`/`random_ratio`, `distributions` module → `distr`, and split `SliceRandom` into `IndexedRandom`/`IndexedMutRandom`/`SliceRandom` — nearly every pre-2024 rand snippet an LLM has memorized now fails to compile.
14. **thiserror 2.0** requires a *direct* dependency on `thiserror` even for pass-through errors, disallows `{r#type}`-style raw-identifier format args, and adds `#[error(fmt = path)]` for out-of-line formatting plus no-std support — 1.x-era derive patterns mostly still work but some now warn or fail.
15. **syn 2.0** raised MSRV to 1.56+, removed `box`/type-ascription expr syntax, merged `Stmt::Expr`/`Stmt::Semi`, redesigned `Attribute` parsing around `syn::meta`, and renamed several enum variants — any hand-rolled proc-macro code an agent generates from memory targeting syn 1.x will not compile against syn 2.
16. **async-std is discontinued**; its own README now says "use `smol` instead" — an agent must never suggest async-std for new code, tokio (already the project's runtime) or smol are the live choices.
17. `cargo add`/`cargo remove` are built into stable Cargo — `cargo-edit` as an external crate is no longer required for this purpose; agents should invoke `cargo add <crate>` directly instead of hand-editing `Cargo.toml` version strings (which risks stale/incompatible pins).
18. **cargo-nextest** runs each test in its own process (catches UB/segfaults `cargo test` silently swallows in-process), supports per-test retries and JUnit output, and is markedly faster on larger suites — a natural fit for CI on a multi-crate workspace with filesystem/subprocess-heavy tests.
19. **cap-std** replaces ambient-authority `std::fs`/`std::net` with capability-scoped `Dir`/handles that reject `..`/symlink/absolute-path escapes (CWE-22 protection) using `openat2` where available — directly relevant to grim/ocx's cache-directory and archive-extraction code, which currently trusts paths from lockfiles/manifests.
20. **cargo-mutants** performs mutation testing (inserts small bugs, checks whether tests catch them) to surface tests that assert nothing meaningful — a stronger CI gate than coverage percentage for security-sensitive parsing/verification code.
21. Precise capturing (`impl Trait + use<'a, T>`) for RPITIT stabilized in **1.87.0 (2025-05-15)** — lets an agent narrow which generic params/lifetimes an `impl Trait` return captures, avoiding the 2024-edition default-capture-everything behavior when it's not wanted.

## Findings

### 1. The 2024 edition is now the baseline, and it changes semantics, not just syntax

Rust 1.85.0 "stabilizes the Rust 2024 Edition... the largest edition we have released" ([Rust 1.85.0 blog post](https://blog.rust-lang.org/2025/02/20/Rust-1.85.0/)). Concrete breaks:

- `static mut` references are deny-by-default UB (`static_mut_refs` lint). Old pattern:
  ```rust
  // WRONG under 2024 edition — deny-by-default
  static mut X: i32 = 23;
  unsafe { let y = &X; }
  ```
  Replacement:
  ```rust
  static X: AtomicI32 = AtomicI32::new(23);
  let y = X.load(Ordering::Relaxed);
  ```
  ([Edition Guide: static mut references](https://doc.rust-lang.org/edition-guide/rust-2024/static-mut-references.html))
- `unsafe_op_in_unsafe_fn` warns/denies by default — an `unsafe fn` body must wrap each unsafe operation in its own `unsafe {}`; the old "the whole fn body is an unsafe block" mental model an agent may have memorized is wrong under this edition.
- `extern` blocks and `#[no_mangle]`/`#[export_name]`/`#[link_section]` now require `unsafe extern` / `#[unsafe(no_mangle)]`.
- RPIT lifetime capture rules changed (2024 edition captures all in-scope generic params/lifetimes by default in `impl Trait` return position) — combined with precise capturing (`use<...>`, stable 1.87.0) as the opt-out.
- `gen` and raw string-adjacent syntax (`#"foo"#`) are now reserved keywords/syntax for future features, even though the features themselves (generator/`gen` blocks) are still unstable.

  (All from [Rust 1.85.0 blog post](https://blog.rust-lang.org/2025/02/20/Rust-1.85.0/).)

### 2. If-let chains and async closures are newer than most trained-in Rust knowledge

If-let chains — `if let Some(x) = a && let Some(y) = b { ... }`, also usable in `while` — stabilized "in the 2024 edition" per the raw changelog: *"Stabilize `#![feature(let_chains)]` in the 2024 edition... allowing `&&`-chaining `let` statements inside `if` and `while`"* in **Rust 1.88.0, 2025-06-26** ([rust-lang/rust RELEASES.md](https://raw.githubusercontent.com/rust-lang/rust/refs/heads/main/RELEASES.md)). This postdates most model training cutoffs — an agent may either not know it exists, or (worse) hallucinate that it works on 2021-edition crates or pre-1.88 toolchains. It does not.

Async closures (`async || {}`, `AsyncFn`/`AsyncFnMut`/`AsyncFnOnce`) shipped in the *same* 1.85.0 release as the edition: *"enable syntax like `async || {}`, allowing closures that return futures while capturing local values"* ([Rust 1.85.0 blog post](https://blog.rust-lang.org/2025/02/20/Rust-1.85.0/)). Old workaround still seen in trained code:
```rust
// old workaround
let f = |x: i32| async move { do_thing(x).await };
```
```rust
// now expressible directly, and composes with Fn traits properly
let f = async |x: i32| { do_thing(x).await };
```

### 3. LazyLock/OnceLock obsolete most `once_cell`/`lazy_static` use

`LazyLock` stabilized in **Rust 1.80.0**, "eliminat[ing] the need for external crates like `lazy_static` and `once_cell`... offering this functionality as part of the standard library" ([std::sync::LazyLock docs](https://doc.rust-lang.org/std/sync/struct.LazyLock.html)). It has documented poisoning semantics (init panic poisons the lock; later accessors panic too) — an agent generating code with `LazyLock` needs to know this differs from `once_cell::sync::Lazy`'s behavior.

### 4. `cargo script` is still nightly-only — do not recommend it for CI

Current stable Cargo docs: single-file `.rs` packages via `-Zscript` remain **unstable**, gated behind `+nightly`, tracked in [rust-lang/cargo#12207](https://github.com/rust-lang/cargo/issues/12207) ([Cargo unstable reference: script](https://doc.rust-lang.org/cargo/reference/unstable.html#script)). An agent should not suggest it as a stable-toolchain tool for e.g. release scripts or CI in grim/ocx.

### 5. MSRV-aware resolver changes what `cargo update` actually does

With `resolver = "3"` (the default resolver for 2024-edition workspaces), Cargo prefers dependency versions whose declared `rust-version` is `≤` the package's own `rust-version`, controlled by `resolver.incompatible-rust-versions = "fallback"` (default under resolver 3) vs `"allow"` (default under resolver 1/2) ([Cargo reference: resolver](https://doc.rust-lang.org/cargo/reference/resolver.html#msrv-aware-resolver)). Concretely: declaring `rust-version = "1.62"` in `Cargo.toml` for a 2024-edition workspace now causes `cargo update` to pick `clap 4.0.32` over `4.5.20` automatically, rather than silently letting the lockfile drift past MSRV. For workspaces (grim + ocx + ocx-mirror sharing one resolver run), member MSRVs are unified by heuristic, which can under- or over-shoot — worth an explicit `rust-version` on every workspace member rather than relying on the root's.

### 6. `[workspace.lints]` centralizes lint config across a multi-crate workspace

Stable since 1.74: define once in the workspace root, inherit everywhere:
```toml
# workspace root Cargo.toml
[workspace.lints.rust]
unsafe_code = "forbid"

# member Cargo.toml
[lints]
workspace = true
```
"Only the root manifest's lint configuration is used; member manifests' lint sections are ignored when workspace inheritance is enabled" ([Cargo reference: workspaces / lints table](https://doc.rust-lang.org/cargo/reference/workspaces.html#the-lints-table)). Directly applicable to the grim/ocx family's stated pain point (near-one-crate, but multiple binaries/crates) — a single `[workspace.lints]` block is the mechanical fix for "every crate reinvents its own `#![warn(...)]` list."

### 7. HTTP/TLS stack: reqwest's defaults moved twice, in ways trained knowledge won't reflect

- reqwest **0.12**: *"Upgrade to hyper, http, and http-body v1"* — the http 1.0 / hyper 1.0 rewrite is the current baseline, not the old `hyper::Body`/`http 0.2` APIs many code samples still show.
- reqwest **0.13**: *"rustls is now the default TLS backend, instead of native-tls"* and *"rustls crypto provider defaults to aws-lc instead of ring"* ([reqwest CHANGELOG.md](https://github.com/seanmonstar/reqwest/blob/master/CHANGELOG.md)).

For grim/ocx's OCI-registry HTTP client this matters directly: default builds now pull in `aws-lc-rs` (which has its own build-from-source/cross-compile implications, notably on Windows/macOS cross-builds) rather than `ring`. An agent adding TLS features must not assume `native-tls`/`ring` are still the path of least resistance, and must check whether `aws-lc-rs`'s build requirements (a C/assembler toolchain in some configs) are acceptable for the project's prebuilt-binary cross-compilation matrix — or explicitly select the `rustls-tls-ring` feature variant instead.

### 8. rand 0.9 renamed nearly every method an LLM has memorized

| Old (rand 0.8, in most training data) | New (rand 0.9+) |
|---|---|
| `rand::thread_rng()` | `rand::rng()` |
| `Rng::gen()` | `Rng::random()` (renamed specifically to avoid the new `gen` keyword) |
| `Rng::gen_range(..)` | `Rng::random_range(..)` |
| `Rng::gen_bool(..)` | `Rng::random_bool(..)` |
| `Rng::gen_ratio(..)` | `Rng::random_ratio(..)` |
| `rand::distributions` | `rand::distr` |
| `SliceRandom` (all methods) | split into `IndexedRandom` / `IndexedMutRandom` / `SliceRandom` |

Source: [rust-random/rand CHANGELOG.md](https://github.com/rust-random/rand/blob/master/CHANGELOG.md). An agent asked to write "pick a random element" code will, absent this table, reliably emit `rand 0.8`-era calls that fail to compile against a `rand = "0.9"` pin.

### 9. thiserror 2.0 tightens what compiles

Breaking/notable in 2.0.0: format strings no longer accept `{r#type}` raw-identifier form; a struct/enum using `derive(Error)` must directly depend on `thiserror` even if it has no error-specific fields; `#[error(fmt = path::to::myfmt)]` allows out-of-line `Display` logic; `thiserror = { version = "2", default-features = false }` now supports `no_std` ([dtolnay/thiserror releases: 2.0.0](https://github.com/dtolnay/thiserror/releases/tag/2.0.0)). Most 1.x derive usage is source-compatible, but an agent should not assume a transitive-only dependency on thiserror still works after bumping to 2.x.

### 10. syn 2.0 breaks hand-written proc-macro code from memory

MSRV rose to 1.56+; `box expr` and type-ascription syntax removed; `Stmt::Expr`/`Stmt::Semi` merged; `Attribute` parsing redesigned around `syn::meta`; several enum variants renamed (`LifetimeDef`→`LifetimeParam`, `TraitItem::Method`→`Fn`, `BinOp::AddEq`→`AddAssign`) ([dtolnay/syn releases: 2.0.0](https://github.com/dtolnay/syn/releases/tag/2.0.0)). Relevant if grim/ocx ever hand-roll a derive macro (e.g., for artifact/skill schema validation) rather than relying on `clap::Parser`'s existing syn 2-based derive.

### 11. async-std is dead; don't let an agent suggest it

The async-std README states outright: *"`async-std` has been discontinued; use `smol` instead"* ([async-rs/async-std](https://github.com/async-rs/async-std)). Since this project is already on tokio, the practical instruction is simpler than "choose smol" — never introduce async-std, and never mix runtimes.

### 12. Cap-based filesystem access exists as a stable alternative to ambient `std::fs`

cap-std reimplements `std::fs`/`std::net` around capability handles (`Dir`, etc.) instead of ambient path-based authority: *"Attempts to escape the directory — via `..`, symlinks, or absolute paths — return `PermissionDenied` errors,"* explicitly citing CWE-22 path-traversal protection, and using `openat2` on Linux 5.6+ for near-native performance ([bytecodealliance/cap-std README](https://github.com/bytecodealliance/cap-std)). This is a direct match for grim/ocx's archive-extraction and cache-write code paths, which currently must defend against zip-slip/path-traversal manually.

### 13. cargo-nextest and cargo-mutants as CI upgrades over `cargo test` + coverage %

nextest: *"Up to 3× faster than `cargo test`, with a modern interface, per-test isolation, and first-class CI support"* — crucially, per-test-process isolation means a segfault or `std::process::exit` in one test doesn't corrupt or hide the rest of the suite ([nexte.st](https://nexte.st/)), which matters for a CLI tool whose tests spawn subprocesses/exercise archive/exit-code paths. cargo-mutants inserts small mutations into the code and reports which ones no test catches — a materially stronger signal than line/branch coverage for verification-and-parsing-heavy code (digest checks, lockfile parsing).

## Normative guidance candidates

1. **Target the 2024 edition explicitly and audit `unsafe` blocks for the new unsafe-op-in-unsafe-fn boundary.**
   Rationale: silently-wrong unsafe scoping is exactly the failure mode an autonomous agent won't self-catch.
   VERIFICATION: `edition = "2024"` in every `Cargo.toml`; `cargo clippy -- -W unsafe_op_in_unsafe_fn` clean; grep for `unsafe fn` bodies containing operations outside a nested `unsafe {}`.

2. **Forbid `static mut`; require `Atomic*`/`Mutex`/`LazyLock`/`OnceLock` for any global mutable state.**
   Rationale: 2024 edition already denies references to it; codifying the rule stops an agent from reaching for `#[allow(static_mut_refs)]` to route around the compiler.
   VERIFICATION: `grep -rn 'static mut'` returns nothing outside vetted FFI shims; `#![deny(static_mut_refs)]` in workspace lints.

3. **Pin `rand` (and any crate with a recent major bump) to an exact minor and keep a one-page cheat-sheet of renamed APIs in the repo, not in the agent's head.**
   Rationale: rand 0.9's renames are exactly the kind of silent-wrong-then-compile-error trap that wastes an agent's iteration budget.
   VERIFICATION: `cargo build` clean; no `#[allow(deprecated)]` around rand calls; `cargo tree -i rand` shows one version.

4. **Adopt `[workspace.lints]` in the workspace root; every member crate sets `[lints] workspace = true` and nothing else.**
   Rationale: matches the stated architectural pain point (near-one-crate) by making lint policy structurally centralized instead of duplicated.
   VERIFICATION: `grep -L 'workspace = true' */Cargo.toml` (after excluding the root) returns nothing; no per-crate `#![warn(...)]`/`#![deny(...)]` attributes outside the workspace table.

5. **Do not use `cargo script`/`-Zscript` in any CI or release path; it is nightly-only.**
   Rationale: an agent that discovers the feature (it's well-publicized) may reach for it in a stable-toolchain release pipeline and silently require nightly.
   VERIFICATION: `grep -rn '\-Zscript\|cargo-script'` in `.github/workflows/` and release scripts returns nothing.

6. **Declare `rust-version` on every workspace member, not just the root, and treat `cargo update` output as MSRV-checked.**
   Rationale: resolver 3's MSRV-aware fallback only works if the version is actually declared; an unset field silently reverts to "allow incompatible."
   VERIFICATION: `grep -L 'rust-version' */Cargo.toml`; `cargo msrv verify` (or `cargo +<msrv> check`) in CI.

7. **When touching the HTTP/TLS stack, assume reqwest 0.12+/hyper 1.x/http 1.x APIs and rustls+aws-lc-rs defaults; verify the actual feature flags in `Cargo.toml` before generating client code.**
   Rationale: the http-crate-1.0 rewrite and the TLS-backend/crypto-provider default swap both invalidate common trained snippets.
   VERIFICATION: `cargo tree -p reqwest -e features`; confirm which TLS feature is enabled and that it matches the cross-compilation story (aws-lc-rs needs a C toolchain on some targets).

8. **Route archive extraction and cache-directory writes through a capability-scoped API (cap-std `Dir`, or an equivalent internal wrapper) instead of raw `std::fs::File::open(untrusted_path)`.**
   Rationale: this is a direct, stable-today mitigation for zip-slip/path-traversal in exactly the archive-extraction code path this project has.
   VERIFICATION: grep for `std::fs::` calls whose path argument derives from a manifest/lockfile/archive entry that hasn't been canonicalized/validated against a base `Dir`.

9. **Adopt cargo-nextest for the CI test runner; keep `cargo test` only as a doctest runner.**
   Rationale: per-test process isolation catches the crash/exit-code classes of bug this CLI's own contract cares about (exit codes, subprocess execution) that in-process `cargo test` can mask.
   VERIFICATION: `.github/workflows/*.yml` invokes `cargo nextest run`; `cargo test --doc` remains for doctests only.

10. **Never suggest `async-std`, `lazy_static`, `once_cell` (for the plain-`Fn`-init case), `structopt`, or `error-chain`/`failure` in new code.**
    Rationale: all are superseded by stdlib (`LazyLock`/`OnceLock`) or actively discontinued (async-std) or long folded into their successors (structopt→clap derive, error-chain/failure→thiserror/anyhow).
    VERIFICATION: `cargo tree` shows none of these as direct dependencies; `grep -rn 'once_cell::sync::Lazy\b'` flagged for review (still legitimate for non-`Fn` init, but should be a deliberate choice, not a reflex).

## AI-agent angle

- **Version-blind API recall is the single biggest failure mode here.** An LLM has seen far more `rand 0.8`, `once_cell::sync::Lazy`, `hyper::Body`, and `native-tls`-flavored code than post-2024 equivalents, because the corpus skews toward older, more-repeated content. The mechanical check: after any agent-authored change touching `rand`, `reqwest`, `hyper`, `syn`, or `thiserror`, run `cargo build` (not just `cargo check` on a stale lockfile) and treat the first compile error as *expected*, not a sign to `#[allow]` or hand-patch around — grep the error message for a renamed symbol before improvising a fix.
- **Edition-2024-only syntax silently fails on 2021-edition crates without a clear error pointing at the edition.** If an agent emits `if let ... && let ...` or `async || {}` into a crate whose `Cargo.toml` still says `edition = "2021"`, the compiler error is a generic parse error, not "upgrade your edition." Mechanical check: before generating either construct, `grep '^edition' Cargo.toml` in the target crate; if it's not `"2024"`, either use the older `match`/nested-`if let` form or refuse and flag the edition mismatch.
- **`static mut` is a UB trap an agent can "fix" the wrong way.** The compiler's `#[allow(static_mut_refs)]` suppresses the deny-by-default lint without fixing the UB — an agent under pressure to make code compile will reach for `#[allow]` first. Mechanical check: any diff introducing `#[allow(static_mut_refs)]` or `#[allow(unsafe_op_in_unsafe_fn)]` should be treated as a review-blocking finding, not accepted silently.
- **Reserved-but-unstable keywords (`gen`) look like a green light to an agent that only checks "does this parse."** An agent might write `gen {}` blocks expecting Rust's answer to Python generators, since the keyword is reserved and web content discusses the *proposal* extensively. Mechanical check: `cargo build` will reject it outright (feature-gated), but code review should flag any `gen` used as an identifier in a 2024-edition crate even if it happens to compile as a regular fn/var name, since it signals confusion about the feature's actual (unstable) status.
- **Crate-choice drift compounds silently.** An agent adding a new dependency for "random pick" or "lazy static" functionality, absent an explicit steer, will pick whatever it recalls most strongly — often the deprecated option. Mechanical check: a `deny`-level `cargo-deny` bans list (or a workspace-level `[workspace.metadata.banned-deps]` convention checked by a script) listing `lazy_static`, `once_cell` (with an allowed-exception note), `error-chain`, `failure`, `structopt`, `async-std` catches this at `cargo add` time rather than at review time.

## Contested / evolving

- **rustls default crypto provider (aws-lc-rs vs ring) is a live cross-compilation concern**, not settled practice: aws-lc-rs's C/assembly build requirements interact with prebuilt-binary release pipelines (exactly this project's shipping model) differently across Linux/macOS/Windows targets. Teams shipping prebuilt binaries for multiple targets are actively choosing between accepting the new default, pinning back to `ring` via feature flags, or vendoring build toolchains — no consensus yet ([reqwest CHANGELOG.md](https://github.com/seanmonstar/reqwest/blob/master/CHANGELOG.md)).
- **`cargo script` stabilization timeline is open.** It's a widely-wanted, long-discussed feature (tracked since [rust-lang/cargo#12207](https://github.com/rust-lang/cargo/issues/12207)) but still nightly-gated on current stable docs; guidance here should be revisited whenever it stabilizes, since it would directly affect how release/tooling scripts in this project could be structured.
- **Generators/`gen` blocks**: the keyword is reserved (2024 edition) but the feature is unstable; direction of travel is toward eventual stabilization of `gen fn`/`gen {}` blocks for synchronous iterators, but no committed timeline was found in this pass — treat as "reserved for the future," not "coming soon."
- **Next-generation trait solver**: widely discussed as an in-progress rustc-internals initiative aimed at fixing soundness/completeness issues in trait resolution (particularly around associated types and coherence), but this pass could not reach a primary source confirming current stabilization status for mid-2026 — flag as unverified rather than asserting a state. Do not treat trait-solver-dependent code patterns (e.g., certain higher-ranked trait bound tricks) as portable until confirmed.
- **Edition 2027 planning**: referenced by the existence of an active Rust Project Goals process for 2026 ([rust-lang.github.io/goals](https://rust-lang.github.io/goals/)), but no primary source in this pass enumerated concrete 2027-edition-specific proposals. Treat any "2027 edition will do X" claim as unverified until a dedicated fetch of the goals/edition-guide roadmap confirms it.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [blog.rust-lang.org/2025/02/20/Rust-1.85.0](https://blog.rust-lang.org/2025/02/20/Rust-1.85.0/) | Official release blog post | 2025-02-20 | Primary announcement of the 2024 edition + async closures; enumerates every headline language change |
| [rust-lang/rust RELEASES.md (raw)](https://raw.githubusercontent.com/rust-lang/rust/refs/heads/main/RELEASES.md) | Canonical compiler changelog | live, spans all versions | Ground truth for exact stabilization versions (if-let chains 1.88.0, precise capturing 1.87.0, naked functions 1.88.0) |
| [doc.rust-lang.org/edition-guide/rust-2024/static-mut-references.html](https://doc.rust-lang.org/edition-guide/rust-2024/static-mut-references.html) | Official Edition Guide chapter | current (2024 edition) | Exact before/after code for the static-mut-refs break and every stable replacement pattern |
| [doc.rust-lang.org/edition-guide/rust-2024/index.html](https://doc.rust-lang.org/edition-guide/rust-2024/index.html) | Official Edition Guide index | current | Points to RFC 3501 and the 1.85.0 release as canonical references |
| [doc.rust-lang.org/std/sync/struct.LazyLock.html](https://doc.rust-lang.org/std/sync/struct.LazyLock.html) | Official std docs | current (stabilized 1.80.0) | Confirms stabilization version and documents poisoning semantics not obvious from the type signature |
| [doc.rust-lang.org/cargo/reference/unstable.html#script](https://doc.rust-lang.org/cargo/reference/unstable.html#script) | Official Cargo unstable-features reference | current | Confirms `cargo script` is still nightly-only, with tracking issue link |
| [doc.rust-lang.org/cargo/reference/resolver.html#msrv-aware-resolver](https://doc.rust-lang.org/cargo/reference/resolver.html#msrv-aware-resolver) | Official Cargo reference | current | Explains resolver-3 default behavior and the `fallback`/`allow` config knob with worked example |
| [doc.rust-lang.org/cargo/reference/workspaces.html#the-lints-table](https://doc.rust-lang.org/cargo/reference/workspaces.html#the-lints-table) | Official Cargo reference | current (stable since 1.74) | Exact syntax for `[workspace.lints]` inheritance, directly actionable for this project's workspace |
| [github.com/rust-random/rand CHANGELOG.md](https://github.com/rust-random/rand/blob/master/CHANGELOG.md) | Primary crate changelog | rand 0.9 era | Enumerates every renamed method with PR links — the exact table an agent needs |
| [github.com/dtolnay/thiserror releases/tag/2.0.0](https://github.com/dtolnay/thiserror/releases/tag/2.0.0) | Primary release notes | 2.0.0 | Direct breaking-change list from the maintainer |
| [github.com/dtolnay/syn releases/tag/2.0.0](https://github.com/dtolnay/syn/releases/tag/2.0.0) | Primary release notes | 2.0.0 | Direct breaking-change list, relevant if this project ever hand-rolls a derive macro |
| [github.com/seanmonstar/reqwest CHANGELOG.md](https://github.com/seanmonstar/reqwest/blob/master/CHANGELOG.md) | Primary crate changelog | 0.12 / 0.13 eras | Confirms both the hyper-1.0 migration and the rustls/aws-lc-rs default switch, in the maintainer's own words |
| [github.com/async-rs/async-std](https://github.com/async-rs/async-std) | Primary repo README | current | Explicit discontinuation notice in the project's own voice |
| [github.com/bytecodealliance/cap-std](https://github.com/bytecodealliance/cap-std) | Primary project README | current | Explains the capability model and CWE-22 mitigation directly relevant to archive-extraction hardening |
| [nexte.st](https://nexte.st/) | Official project site | current | States the process-isolation and performance rationale in the maintainers' own framing |
| [releases.rs](https://releases.rs) | Community-maintained release/feature tracker | live | Cross-check for current stable/beta/nightly version numbers (1.97.1 stable as of this research date) and in-flight stabilization queue |

## Candidate topics

| Candidate topic | Why it matters | Source | Already covered? | Priority |
|---|---|---|---|---|
| `edition-2024-migration-checklist` — static-mut-refs, unsafe-op-in-unsafe-fn, unsafe-extern-blocks as a single audit pass | These three changes together are the most likely source of agent-introduced UB or non-compiling FFI code when "modernizing" older code | 1.85.0 blog, Edition Guide | no | high |
| `if-let-chains-and-let-else-usage` — when if-let chains (1.88.0+, 2024 edition only) are appropriate vs the older nested-`if let`/`let-else` forms | Very recent stabilization; wrong-edition usage fails silently with a confusing parse error | RELEASES.md | no | medium |
| `async-closures-vs-boxed-future-workarounds` | Removes a whole class of `Box<dyn Future>`/manual trait-object workaround code agents currently reach for | 1.85.0 blog | partial (rust-async covers async traits generally, not this specific closure-capture idiom) | medium |
| `lazylock-oncelock-vs-once_cell-lazy_static` — decision rule for when std suffices vs when `once_cell::Lazy` (non-Fn init) is still needed | Directly replaces two extremely common crates; agent default should flip to std | std docs | no | high |
| `gen-keyword-reserved-not-stable` — do not write `gen {}` blocks or use `gen` as an identifier in 2024-edition code | Confusable "looks available, isn't" trap unique to this edition transition | 1.85.0 blog | no | low |
| `cargo-script-is-nightly-only` — do not route release/CI scripts through `-Zscript` | Prevents an agent from building a stable-toolchain pipeline around a nightly-only feature | Cargo unstable reference | no | medium |
| `msrv-aware-resolver-and-rust-version-field` — declare `rust-version` on every workspace member, understand resolver-3 fallback behavior | Silent lockfile drift past MSRV is exactly the kind of bug that only surfaces on a user's older toolchain, not in CI on latest stable | Cargo resolver reference | no | high |
| `workspace-lints-table-centralization` | Directly targets the stated architecture pain point (near-one-crate, duplicated lint config) | Cargo workspaces reference | no | high |
| `cargo-add-remove-over-hand-edited-tomls` — agents should shell out to `cargo add`/`cargo remove`, not hand-edit dependency version strings | Hand-edited version strings risk stale/incompatible pins and skip the MSRV-aware resolution path | Cargo add reference | no | medium |
| `http-1.0-hyper-1.0-baseline` — assume http/hyper 1.x APIs (`http::Request`/`http::Response` v1, `hyper::body::Incoming`), not the 0.x-era `hyper::Body` | Extremely common source of stale generated client/middleware code for the OCI registry HTTP layer | reqwest CHANGELOG | no | high |
| `reqwest-rustls-default-and-aws-lc-rs` — know the current TLS-backend and crypto-provider defaults and their cross-compilation implications | Directly affects this project's prebuilt cross-platform binary shipping model | reqwest CHANGELOG | no | high |
| `rand-0.9-api-rename-table` — thread_rng→rng, gen→random, gen_range→random_range, distributions→distr, SliceRandom split | High-frequency, high-confidence-wrong pattern for any agent generating "pick random" code | rand CHANGELOG | no | high |
| `thiserror-2-direct-dependency-requirement` — derive(Error) needs a direct thiserror dep even for pass-through-only error types | Subtle break that surfaces as a confusing macro-expansion error, not an obvious API mismatch | thiserror 2.0.0 release notes | partial (rust-error-handling covers thiserror choice, not this specific 2.0 migration trap) | medium |
| `syn-2-proc-macro-porting-notes` | Only relevant if/when this project hand-rolls a derive macro; low current relevance but sharp cliff if triggered | syn 2.0.0 release notes | no | low |
| `async-std-discontinued-do-not-suggest` | Cheap, mechanical ban-list entry that prevents an agent from ever recommending a dead async runtime | async-std README | no | medium |
| `cap-std-for-archive-extraction-and-cache-writes` — replace ambient `std::fs::File::open(untrusted_path)` with capability-scoped `Dir` access in archive/cache code | Directly hardens exactly the code path (archive extraction, cache writes from lockfile-driven paths) this project's security posture depends on; goes beyond generic zip-slip advice with a concrete stable crate | cap-std README | partial (rust-security's zip-slip/TOCTOU/cap-std bullet names cap-std already; this topic is the applied "how to wire it into grim/ocx's extraction path" specific) | high |
| `cargo-nextest-adoption-for-subprocess-heavy-tests` — process-per-test isolation catches crashes/exit-code bugs `cargo test` masks | This CLI's own contract (exit codes, subprocess execution) is exactly what nextest's isolation model protects in tests | nexte.st | partial (rust-testing covers nextest generally; this is the specific "why for a CLI with exit-code/subprocess contracts" angle) | medium |
| `cargo-mutants-for-verification-code-paths` — mutation-test digest verification, lockfile parsing, credential handling | Coverage % doesn't catch assertion-free tests; mutation testing does, and this project has multiple security-critical parse/verify paths | (background knowledge; project site fetch 404'd this pass, needs re-verification) | partial (rust-testing lists mutation testing generically) | medium |
| `precise-capturing-use-syntax` — `impl Trait + use<'a, T>` to opt out of 2024-edition's default-capture-everything RPIT rule | Needed whenever an agent writes an RPIT-returning function and the 2024-edition default capture set causes an unwanted lifetime/auto-trait leak | RELEASES.md (1.87.0) | no | low |
| `edition-2024-vs-2021-detection-before-codegen` — grep the target crate's edition before emitting edition-gated syntax | Mechanical guardrail, not a knowledge topic per se, but the single highest-leverage AI-agent check from this whole survey | synthesis of above | no | high |
| `rustls-crypto-provider-explicit-selection` — pin `rustls` crypto provider explicitly (`aws-lc-rs` vs `ring`) rather than relying on whichever default a transitive dep pulls in, to avoid multiple-provider-in-one-binary link errors | rustls's "install a default provider" pattern breaks at runtime, not compile time, if two dependencies disagree on defaults — a classic AI-agent-invisible failure | reqwest CHANGELOG (contested section) | no | high |

---
title: Property-Based Testing, Fuzzing, Miri, Mutation and Semver Testing
topic: rust-testing/property-fuzz-and-formal
agent: rust-testing-property-fuzz-formal
model: sonnet
date_researched: 2026-08
sources_count: 23
scope: >
  Covers the "deeper verification tier" for Rust CLI/library code: property-based testing
  (proptest, quickcheck, proptest-state-machine), fuzzing (cargo-fuzz/libFuzzer, afl.rs,
  honggfuzz, arbitrary, OSS-Fuzz), Miri, mutation testing (cargo-mutants), semver/API-stability
  gating (cargo-semver-checks, cargo-public-api, non_exhaustive), deterministic simulation
  (turmoil, madsim), and concurrency model checking (loom, shuttle). Does NOT cover ordinary
  unit/integration testing, benchmark harnesses, or non-Rust fuzzing infrastructure.
---

## Table of contents

1. [Property-based testing](#1-property-based-testing)
2. [Fuzzing](#2-fuzzing)
3. [Miri in CI](#3-miri-in-ci)
4. [Mutation testing (cargo-mutants)](#4-mutation-testing-cargo-mutants)
5. [Semver and API stability testing](#5-semver-and-api-stability-testing)
6. [Deterministic simulation testing](#6-deterministic-simulation-testing)
7. [Concurrency verification: loom and shuttle](#7-concurrency-verification-loom-and-shuttle)
8. [Tiering recommendation](#8-tiering-recommendation)
9. [Normative guidance candidates](#normative-guidance-candidates)
10. [AI-agent angle](#ai-agent-angle)
11. [Contested / evolving](#contested--evolving)
12. [Sources](#sources)

## Summary

- Pick **proptest** by default, not quickcheck: it uses composable `Strategy` values instead of one generator/shrinker per type, gives finer-grained shrinking, and is the crate actually used across the Rust ecosystem (~14.9M downloads/month, 11.8k dependent crates) — see [proptest vs quickcheck](https://proptest-rs.github.io/proptest/proptest/vs-quickcheck.html).
- proptest is in "passive maintenance" by its own description — feature-complete, low architectural churn, not a sign of abandonment ([lib.rs/proptest](https://lib.rs/crates/proptest)).
- Commit the `proptest-regressions/*.txt` files proptest writes on failure to source control — they replay the exact minimal failing case on every future run and are the property-testing equivalent of a regression test ([proptest README](https://github.com/proptest-rs/proptest/blob/main/proptest/README.md)).
- The strongest properties for a package manager are round-trips (`parse(serialize(x)) == x`), format-then-parse ("every string generated to match the grammar parses"), and non-crash — apply these to: manifest/lockfile parsers, semver-range parsers, digest/hash encoding, path normalization, and OCI reference (`registry/repo:tag@digest`) parsing.
- Use `proptest-state-machine` for anything with mutable state across calls — lockfile read-modify-write, cache eviction, install/uninstall sequences — it generates and shrinks *sequences of transitions*, not just single inputs ([proptest state-machine chapter](https://proptest-rs.github.io/proptest/proptest/state-machine.html)).
- **cargo-fuzz (libFuzzer)** is the default fuzzing choice on Linux/macOS x86-64/AArch64; it needs a nightly compiler and only works with LLVM sanitizers, so it does not cover native Windows ([rust-fuzz book](https://rust-fuzz.github.io/book/cargo-fuzz.html)).
- Use the `arbitrary` crate with `#[derive(Arbitrary)]` to fuzz structured inputs (a parsed manifest, a `Vec<PathSegment>`) directly instead of raw bytes — this is "structure-aware fuzzing" and it is what actually finds bugs deep in parsers rather than at the first `?` ([structure-aware fuzzing](https://rust-fuzz.github.io/book/cargo-fuzz/structure-aware-fuzzing.html)).
- 300 seconds (5 minutes) per fuzz target is the rust-fuzz book's own CI example duration — treat that as a build-and-doesn't-immediately-crash smoke test, not real bug-finding; real fuzzing needs hours-to-days of wall clock, which is why it belongs on a scheduled/nightly job, not every PR ([cargo-fuzz CI chapter](https://rust-fuzz.github.io/book/cargo-fuzz/ci.html)).
- OSS-Fuzz only accepts projects with "a significant user base and/or [that are] critical to global IT infrastructure" — a small internal CLI will not qualify; **ClusterFuzzLite** (same tooling, runs in your own CI) is the fallback for everyone else ([OSS-Fuzz acceptance criteria](https://google.github.io/oss-fuzz/getting-started/accepting-new-projects/)).
- Miri cannot do FFI, cannot do networking, and has only partial/host-dependent file-I/O support — it interprets MIR as a platform-independent abstract machine, so `reqwest`/`tokio::net` code paths cannot run under it at all ([rust-lang/miri](https://github.com/rust-lang/miri/)).
- Even a "pure safe Rust" crate should run Miri: safety bugs live in the `unsafe` blocks of your *dependencies* (Vec/HashMap internals, unsafe-in-std, and any unsafe crate you pull in), and Miri catches UB your own code never appears to trigger directly.
- Miri is 10-100x slower than native execution ([Microsoft Rust Engineering Practices](https://microsoft.github.io/RustTraining/engineering-book/ch05-miri-valgrind-and-sanitizers-verifying-u.html)) — run it on the subset of tests that touch unsafe/FFI-adjacent logic, not the whole suite, unless the suite is small.
- **cargo-mutants** finds a specific gap coverage cannot see: a test that checks a `Result` came back `Ok` but never checks the side effect actually happened (a mutant that turns a function into `Ok(())`/`Default::default()` survives coverage but should die under mutation) — see [mutations vs coverage](https://mutants.rs/vs-coverage.html).
- Scope cargo-mutants to a PR with `cargo mutants --in-diff <(git diff origin/main..)` — full-repo mutation runs are too slow for every PR because the whole test suite reruns once per surviving mutant ([in-diff](https://mutants.rs/in-diff.html), [pr-diff](https://mutants.rs/pr-diff.html)).
- **cargo-semver-checks** catches struct/enum/trait/fn-signature breakage but explicitly does *not* yet catch breaking changes in generic/type-parameter positions or some inference regressions — run it, but do not treat a clean run as a formal breaking-change proof ([cargo-semver-checks](https://github.com/obi1kenobi/cargo-semver-checks)).
- The single most authoritative breaking-change reference is the Cargo Book's own [SemVer Compatibility](https://doc.rust-lang.org/cargo/reference/semver.html) page — it enumerates dozens of "obviously breaking", "minor", and "possibly-breaking" categories including auto-trait loss, RPIT lifetime capture, and inference regressions that most engineers (and every LLM) get wrong.
- Mark every public struct/enum you don't want to freeze forever with `#[non_exhaustive]` at the point you first publish it — retrofitting it later is itself a breaking change in the other direction for some patterns ([non_exhaustive reference](https://doc.rust-lang.org/reference/attributes/type_system.html)).
- **turmoil** and **madsim** buy you FoundationDB-style deterministic simulation of network/IO for Tokio code, at the cost of either swapping `tokio::net` for a shim (turmoil) or swapping the whole runtime crate (madsim) — worth it only once the project has real distributed/networked behavior worth de-flaking (registry pulls with retries/timeouts, concurrent lockfile writers), not for a single-process CLI with a linear happy path.
- **loom** exhaustively explores thread interleavings under a relaxed C11 model and is expensive (state-space heavy, needs dedicated `loom::model` test builds); **shuttle** trades exhaustiveness for randomized scheduling and scales to bigger concurrent code — reach for loom on a small, hand-written lock-free/atomics data structure, shuttle on a larger concurrent subsystem, and reach for neither if the concurrency is just `tokio::spawn` + channels with no unsafe/custom synchronization ([loom](https://github.com/tokio-rs/loom), [shuttle](https://github.com/awslabs/shuttle)).
- None of these tools substitute for each other: coverage tells you what ran, property/fuzz testing tells you what breaks on some input, mutation testing tells you whether your tests would notice, Miri tells you whether it's UB, semver tools tell you whether you broke your API, and loom/shuttle/turmoil/madsim tell you whether concurrent/distributed *ordering* is safe.

## Findings

### 1. Property-based testing

**proptest vs quickcheck.** QuickCheck derives one generator+shrinker per *type* via a trait; you get one arbitrary strategy for `u32` for the whole program. Proptest instead builds `Strategy` *values* compositionally (`0..100`, `prop::collection::vec(...)`, `prop_map`, `prop_flat_map`), so you can have as many different strategies for the same type as you need without a newtype wrapper. The trade-off called out in proptest's own docs: "Generating complex values in Proptest can be up to an order of magnitude slower than in QuickCheck" because of the richer shrink-tree bookkeeping ([vs-quickcheck](https://proptest-rs.github.io/proptest/proptest/vs-quickcheck.html)). For a package-manager crate — parsers, resolvers, path/digest logic — the composability wins outweigh the speed cost; pick proptest unless a specific hot generator profiles as a bottleneck.

Ecosystem signal: proptest pulls ~14.9M downloads/month across 11,846 dependent crates and describes itself as "fairly close to being feature-complete... at this point, it mainly sees passive maintenance" — read that as stable, not stale ([lib.rs/proptest](https://lib.rs/crates/proptest)). quickcheck is smaller (~3.1M downloads/month, 1,989 dependents) but not dead — v1.1.0 shipped in 2026 after a long gap from 1.0.3 (2021) ([lib.rs/quickcheck](https://lib.rs/crates/quickcheck)).

**Regression files.** On a failing case, proptest writes a minimized, deterministic reproduction to `<crate>/proptest-regressions/<test-file>.txt`. Commit these files: CI and every teammate then always re-check the exact bug that was found, even though the surrounding random exploration differs run to run ("add these files to source control immediately... team members and CI systems consistently reproduce the same minimal failing cases") ([proptest README](https://github.com/proptest-rs/proptest/blob/main/proptest/README.md)).

**Writing good properties.** The three patterns that show up repeatedly in the getting-started guide:
- **Non-crash**: feed arbitrary/adversarial input and assert no panic — cheapest, catches nothing about correctness, but is the right first property for any new parser.
- **Format-then-parse**: generate strings from a regex/grammar strategy (e.g. `"[0-9]{4}-[0-9]{2}-[0-9]{2}"`) and assert they always parse. Good for "is my grammar acceptance too strict."
- **Round-trip via the output side**: generate the *structured* value first, serialize it, then parse and assert equality — this is stronger than generating strings directly because it does not require reimplementing the parser's logic in the test, and the proptest docs note this exact strategy "caught a real bug in the date parser's month extraction logic" ([getting-started](https://proptest-rs.github.io/proptest/proptest/getting-started.html)).

```rust
// good: round-trip through the real value type, not through hand-rolled strings
proptest! {
    #[test]
    fn version_range_round_trips(v in any::<VersionReq>()) {
        let s = v.to_string();
        let parsed: VersionReq = s.parse().unwrap();
        prop_assert_eq!(v, parsed);
    }
}

// weaker: only tests that *some* strings don't crash the parser, tells you
// nothing about correctness of accepted input
proptest! {
    #[test]
    fn version_range_doesnt_panic(s in ".*") {
        let _ = s.parse::<VersionReq>();
    }
}
```

**Where properties pay off in a package manager** (this is domain judgment, not a citation): parsers (manifest/lockfile TOML-adjacent grammars, OCI reference strings, semver/version-req strings) via round-trip; version resolution (resolver output must satisfy every input constraint — an *oracle* property, not round-trip); path normalization (`normalize(normalize(p)) == normalize(p)`, idempotence, and `normalize(p)` never escapes a sandbox root — a security-relevant invariant); digest handling (hex-encode/decode round-trip, and "the digest of identical bytes is always identical" as a differential property against a second implementation or a fixed test vector).

**Stateful / model-based testing.** `proptest-state-machine` adds a `ReferenceStateMachine` (an abstract model: `State`, `Transition`, `init_state`, `transitions`, `apply`, `preconditions`) and a `StateMachineTest` (drives the real system: `init_test`, `apply` against the SUT, `check_invariants`). The `Sequential` strategy generates transition sequences; on failure, shrinking deletes trailing transitions first, then shrinks individual transitions front-to-back, then shrinks the initial state ([state-machine chapter](https://proptest-rs.github.io/proptest/proptest/state-machine.html)). This is the right tool for a lockfile/cache subsystem: model "install package, remove package, update lock" as transitions and let it hunt for an interleaving that corrupts on-disk state. A lighter-weight alternative crate exists, `proptest-stateful` ([readysettech/proptest-stateful](https://github.com/readysettech/proptest-stateful)), but `proptest-state-machine` is the one shipped and documented in the official book and is the safer default choice.

### 2. Fuzzing

**Tool landscape.** Three wrappers exist in the `rust-fuzz` org:
- **cargo-fuzz** (libFuzzer backend, via `libfuzzer-sys`) — the de facto default. Requires a nightly toolchain and LLVM sanitizer support, which "only works on x86-64 and Aarch64, and only on Unix-like operating systems" ([structure-aware fuzzing](https://rust-fuzz.github.io/book/cargo-fuzz/structure-aware-fuzzing.html)). No native Windows.
- **afl.rs** (AFL++ backend) — described by its own repo as running "AFLplusplus on code written in the Rust programming language," with CMPLOG and persistent-mode support; needs `cargo afl system-config`, sometimes requiring root, to tune the host kernel ([rust-fuzz/afl.rs](https://github.com/rust-fuzz/afl.rs)).
- **honggfuzz-rs** — wraps Google's honggfuzz, supports GNU/Linux, macOS, FreeBSD, NetBSD, Android; Windows only via WSL, not native ([rust-fuzz/honggfuzz-rs](https://github.com/rust-fuzz/honggfuzz-rs)).

Practical rule of thumb (not from a single citation, but consistent across all three docs): cargo-fuzz is the right default because it is what OSS-Fuzz and ClusterFuzzLite are built around; reach for afl.rs when you specifically want AFL++'s mutation engine (e.g. CMPLOG on comparison-heavy binary parsing) or need to fuzz on a platform/architecture libFuzzer doesn't reach.

**Structure-aware fuzzing with `arbitrary`.** Instead of a raw-byte fuzz target, derive `Arbitrary` on your real input type and let libFuzzer generate/mutate that type directly:

```rust
// fuzz/fuzz_targets/parse_manifest.rs
#![no_main]
use libfuzzer_sys::fuzz_target;

#[derive(Debug, arbitrary::Arbitrary)]
struct RawManifestInput {
    name: String,
    version_req: String,
    deps: Vec<(String, String)>,
}

fuzz_target!(|input: RawManifestInput| {
    // exercises the real parser deeper than raw bytes would,
    // because the fuzzer mutates structured fields, not a byte soup
    let _ = Manifest::from_fields(input.name, input.version_req, input.deps);
});
```

The `arbitrary` crate implements `Arbitrary` for nearly all `std` collection/string types, and supports `#[derive(Arbitrary)]` with the `derive` feature ([structure-aware fuzzing](https://rust-fuzz.github.io/book/cargo-fuzz/structure-aware-fuzzing.html)). For a package manager, this is the highest-leverage fuzz surface: the archive/tar extractor, the OCI manifest/index JSON parser, and any hand-rolled reference-string parser (`registry/repo:tag@sha256:...`).

**Corpus management.** `fuzz_target!` closures can return `Corpus::Keep` / `Corpus::Reject` to tell libFuzzer whether an input that failed a validity precondition should still be kept in the corpus — reject early-invalid inputs so the corpus doesn't fill up with garbage that never reaches interesting code ([structure-aware fuzzing](https://rust-fuzz.github.io/book/cargo-fuzz/structure-aware-fuzzing.html)).

**OSS-Fuzz onboarding.** Requirements: a `fuzz/` directory with `fuzz/Cargo.toml` and `fuzz/fuzz_targets/*.rs` (the normal cargo-fuzz layout); an OSS-Fuzz-side `project.yaml` declaring `language: rust`, `sanitizers: [address]` (the only sanitizer currently supported for Rust), `fuzzing_engines: [libfuzzer]` (the only engine); a `Dockerfile` starting `FROM gcr.io/oss-fuzz-base/base-builder-rust`; and a `build.sh` that runs `cargo fuzz build -O` and copies binaries to `$OUT/` ([OSS-Fuzz Rust integration guide](https://google.github.io/oss-fuzz/getting-started/new-project-guide/rust-lang/)). Acceptance is gated: "an open-source project must have a significant user base and/or be critical to the global IT infrastructure" ([accepting new projects](https://google.github.io/oss-fuzz/getting-started/accepting-new-projects/)). A niche internal tool will not clear this bar — use **ClusterFuzzLite** instead, which reuses the identical `project.yaml`/`Dockerfile`/`build.sh` layout but runs inside your own CI (GitHub Actions, GitLab, Cloud Build, Prow) rather than Google's infrastructure ([ClusterFuzzLite Rust integration](https://google.github.io/clusterfuzzlite/build-integration/rust-lang/)).

**How long is a meaningful run.** The rust-fuzz book's own CI example workflow runs each target for `-max_total_time=300` (5 minutes) on push/PR, explicitly framed as a smoke test that the target still builds and doesn't crash instantly ([cargo-fuzz CI chapter](https://rust-fuzz.github.io/book/cargo-fuzz/ci.html)). That is not a bug-finding budget — coverage-guided fuzzers commonly need hours to days to find deep bugs, which is why OSS-Fuzz/ClusterFuzzLite run continuously rather than per-PR. Practical split: 60-300s per target on every PR as a build/crash smoke test; hours-scale runs nightly or weekly against a persisted corpus; continuous (OSS-Fuzz/ClusterFuzzLite) fuzzing only once the project is either OSS-Fuzz-eligible or you're willing to host the CI minutes yourself.

### 3. Miri in CI

Miri is an interpreter for Rust's MIR that catches undefined behavior: out-of-bounds/use-after-free, invalid values, misaligned/invalid-provenance pointers, data races and weak-memory violations, and Stacked/Tree-Borrows aliasing violations ([rust-lang/miri](https://github.com/rust-lang/miri/)).

**What it cannot run.** "Miri runs the program as a platform-independent interpreter, so the program has no access to most platform-specific APIs or FFI" — most FFI calls fail outright. Networking is unsupported; file I/O is only partially implemented and varies by target, with Linux best-supported, then macOS, then Windows ([rust-lang/miri](https://github.com/rust-lang/miri/)). For an OCX/Grimoire-shaped crate this means: **none** of the actual HTTP/OCI-registry code paths, and only some filesystem code paths, can run under Miri at all. Miri is only useful on the pure-logic slice — parsers, resolvers, data structures, anything `unsafe`.

**Isolation flags.** By default Miri isolates the interpreted program from the host (fake clock, fake entropy, no real env vars). Set `MIRIFLAGS=-Zmiri-disable-isolation` if a test genuinely needs to read env vars or the filesystem; `-Zmiri-isolation-error=<action>` configures how Miri reacts when isolated code tries to reach the host ([rust-lang/miri](https://github.com/rust-lang/miri/); flag names corroborated in the wild by [Microsoft's Rust engineering-practices guide](https://microsoft.github.io/RustTraining/engineering-book/ch05-miri-valgrind-and-sanitizers-verifying-u.html)).

**Cost.** 10-100x slower than native execution ([Microsoft Rust Engineering Practices](https://microsoft.github.io/RustTraining/engineering-book/ch05-miri-valgrind-and-sanitizers-verifying-u.html)). Running `cargo miri test` on a whole integration-test suite that shells out, hits the network, or extracts large archives is both mostly-broken (unsupported syscalls) and slow. Scope it: run Miri only on the unit tests of crates/modules that contain `unsafe` or exercise generic/unsafe-adjacent data structures.

**Should a pure-safe-Rust project bother?** Yes: the bugs Miri finds are typically not in *your* `unsafe` blocks (there may be none) but in how you use `unsafe`-internally-implemented std/third-party types — a bad `Vec`/slice indexing pattern, a `mem::transmute`d third-party type, or triggering library UB via an unusual generic instantiation. `cargo miri test` on the safe-Rust core of a package manager (path canonicalization, version parsing, in-memory graph resolution) is cheap relative to the value, because none of that code touches network/FS syscalls Miri can't run anyway.

### 4. Mutation testing (cargo-mutants)

**What it is / what it finds that coverage does not.** cargo-mutants "helps you improve your program's quality by finding places where bugs could be inserted without causing any tests to fail" — it edits the compiled code (e.g. replaces a function body with `Ok(Default::default())`, flips a `<` to `<=`, deletes a `!`) and reruns the test suite per mutant. The canonical example: "a function that writes a file and returns a `Result` might be covered by a test that checks the return value, but not by a test that checks that the file was actually written" — coverage marks this line green; mutation testing marks the mutant *survived*, meaning the test suite has a real gap ([mutations vs coverage](https://mutants.rs/vs-coverage.html)).

**Cost.** "Most of the runtime for cargo-mutants is spent in running the program test suite and in running incremental builds: both are done once per viable mutant" ([performance](https://mutants.rs/performance.html)) — this is why full-repo mutation testing does not belong on every PR. Levers to cut wall clock: a dedicated `[profile.mutants]` inheriting from `test` with `debug = "none"`; moving the build dir to a ramdisk (`TMPDIR=/ram`); a faster linker (the docs report the Wild linker "cut cargo-mutants runtime by more than half on some projects," Mold "typically ~20%"); skipping doctests with `-- --all-targets` if they're documentation-only ([performance](https://mutants.rs/performance.html)).

**Scoping to a diff.** `cargo mutants --in-diff <(git diff)` only tests mutants overlapping lines changed in the given diff (git-style, `b/`-prefixed or unprefixed paths). Two sharp edges: it composes with `--package`/`--regex` filters (applied after), and it only matches against *code under test* — a diff that only touches test code produces zero mutants to run, so it does not validate "did you also update the tests" ([in-diff](https://mutants.rs/in-diff.html)). The documented CI pattern:

```bash
# on a PR: fetch full history, diff against the base branch, then scope
git fetch origin "${GITHUB_BASE_REF}" --depth=1
git diff "origin/${GITHUB_BASE_REF}".. > git.diff
cargo mutants --no-shuffle -vV --in-diff git.diff
```
([pr-diff](https://mutants.rs/pr-diff.html)). The book is explicit that this trades completeness for speed: "can miss some problems that would be found by running mutants on the whole codebase" ([pr-diff](https://mutants.rs/pr-diff.html)) — pair per-PR `--in-diff` runs with an unscoped run on a slower cadence.

**Real-world signal.** cargo-mutants is actively maintained ("actively-maintained spare time project... releases about every one or two months" as of the maintainer's own note) with ~68.7k downloads/month ([lib.rs/cargo-mutants](https://lib.rs/crates/cargo-mutants)) — mature enough to depend on, not a toy.

### 5. Semver and API stability testing

**cargo-semver-checks.** Lints a crate's API diff for semver violations before publish: covers function removal/signature changes, `#[must_use]` additions, trait removal, methods added to public traits, `#[doc(hidden)]` changes, struct-field visibility, enum-variant changes. It explicitly does **not yet** catch "breaking type changes... in the type of a field or function parameter" or "breaking changes in generics or lifetimes" — the project's own FAQ answers "no, not yet" to "will it catch every semver violation" ([cargo-semver-checks](https://github.com/obi1kenobi/cargo-semver-checks)). Install: `cargo install cargo-semver-checks --locked`; CI: `obi1kenobi/cargo-semver-checks-action@v2`; local: `cargo semver-checks` before `cargo publish`.

**cargo-public-api.** Complementary tool: lists/diffs the full public API surface (not just a lint pass) between two git refs or releases, via rustdoc JSON (needs a recent nightly): `cargo public-api diff ref1..ref2`. The recommended CI pattern is a snapshot test — commit `tests/snapshots/public-api.txt`, fail CI on unexpected drift, regenerate deliberately with `UPDATE_SNAPSHOTS=yes cargo test` ([cargo-public-api](https://github.com/cargo-public-api/cargo-public-api)). Where semver-checks lints for *known-bad* patterns, public-api gives a human-reviewable diff of *everything* that changed — run both; semver-checks as an automated release gate, public-api as a PR-time "does this API diff look intentional" review aid.

**What actually counts as breaking (Cargo Book, authoritative).** The [Cargo Reference SemVer page](https://doc.rust-lang.org/cargo/reference/semver.html) is the primary source and is far more exhaustive than either tool's current lint set. Non-obvious categories an LLM agent routinely gets wrong:
- Adding a trait impl to an existing public type is only "possibly-breaking" — but it can remove an auto-trait (`Send`/`Sync`) a downstream `!Trait` bound relied on, or create ambiguity with a local trait of the same method name via glob import.
- Adding a *defaulted* trait method is usually safe (inherent methods win resolution) but breaks under glob-imported local traits with a same-named method — ambiguous-method-call errors downstream.
- Generalizing a concrete-return function into a generic one (`fn foo() -> i32` → `fn foo<T: Default>() -> T`) is classified "minor" but can break call sites needing type inference (`let x = foo();` now needs an annotation).
- Tightening a generic bound on a struct (`Foo<A>` → `Foo<A: Eq>`) is **major**; loosening one is **minor**.
- Capturing an additional lifetime in return-position-impl-trait (RPIT) is **major** in editions before 2024 (Rust 2024 captures all lifetimes by default, closing this trap going forward).
- Adding *any* field — public or private — to an all-public-field struct that permits struct-literal construction is **major**; the fix is `#[non_exhaustive]` from day one.
- Adding an enum variant without `#[non_exhaustive]` breaks every exhaustive `match` downstream — **major**.
- Adding `#[repr(packed)]` breaks `&field` references (unaligned-reference error) — **major**.
- Changing a trait method's signature (even adding a generic parameter with a default) breaks every implementor — **major**.

```rust
// non-obvious MAJOR break: tightening a bound
// before
pub struct Foo<A> { pub f1: A }
// after — downstream `Foo { f1: 1.23 }` now fails: f64 does not impl Eq
pub struct Foo<A: Eq> { pub f1: A }
```

```rust
// non-obvious MINOR (not major) — loosening is always additive
pub struct Foo<A> { pub f1: A }   // was: pub struct Foo<A: Clone> { ... }
```

**`#[non_exhaustive]`.** Applies to structs, enums, and individual enum variants. Inside the defining crate it is a no-op — you can still construct/match exhaustively. Outside the crate: struct-literal construction is disallowed (must use a constructor fn or `..Default::default()`-style update syntax where available), struct patterns must include `..`, and enum matches must include a catch-all `_` arm ([non_exhaustive reference](https://doc.rust-lang.org/reference/attributes/type_system.html)). Apply it at first publish to any struct/enum you want room to grow — adding it later is *itself* a breaking change for code that currently constructs the type with a literal or matches it exhaustively.

### 6. Deterministic simulation testing

**turmoil.** Runs multiple simulated hosts on one thread for Tokio-based code, injecting "hardship" — latency, packet drops, partitions, crashes, corrupted writes — either by manual script or seeded randomness, so failures are reproducible ([tokio-rs/turmoil](https://github.com/tokio-rs/turmoil)). Newer companion crates (`turmoil-net`, `turmoil-fs`, `turmoil-io-uring`) are drop-in replacements for the corresponding `tokio::*` modules, meaning adoption requires swapping specific import paths, not the whole runtime.

**madsim.** A full drop-in *runtime* replacement for tokio (`tokio = { version = "0.2", package = "madsim-tokio" }`), explicitly modeled on FoundationDB's and sled's deterministic-simulation approach: "your code should be able to deterministically execute on top of a simulator," amplifying randomness and injecting failures to surface latent bugs, then replaying deterministically until fixed ([madsim-rs/madsim](https://github.com/madsim-rs/madsim)). It ships simulated shims for tonic (gRPC), etcd-client, rdkafka, and aws-sdk-s3 — relevant if the OCX registry client stack ever grows gRPC or S3-compatible storage backends.

**Is it worth it for a CLI with network I/O?** Only once there is real *concurrent/distributed* behavior worth de-flaking — concurrent registry pulls with retry/backoff, multiple processes racing on a lockfile, or a mirror/cache subsystem with its own consistency invariants. A CLI that does sequential HTTP calls with a linear happy path gets far less value: an integration test with a mock HTTP server (`wiremock`, `httpmock`) plus a handful of hand-written timeout/retry unit tests covers the same ground far more cheaply. Adopt turmoil/madsim when a bug report reads like "only happens under concurrent load / bad network," not preemptively.

### 7. Concurrency verification: loom and shuttle

**loom.** Runs a test repeatedly under `loom::model(|| { ... })`, permuting possible thread interleavings under a (relaxed) C11 memory model, using state-reduction techniques to keep the search tractable rather than truly exhaustive. Known gaps: `SeqCst` is modeled as `AcqRel` (can produce false positives), and load-buffering behaviors are not fully explored ([tokio-rs/loom](https://github.com/tokio-rs/loom)). It requires a separate, instrumented build (loom's own `Arc`, atomics, etc. replace `std`'s under `#[cfg(loom)]`), so it is not a drop-in "just run it" tool — it needs a maintained parallel test target.

**shuttle.** Same shape of problem, different trade-off: "Shuttle focuses on randomized testing, rather than the exhaustive testing that Loom offers. This is a soundness-scalability trade-off" ([awslabs/shuttle](https://github.com/awslabs/shuttle)) — passing shuttle runs is not a correctness proof, but it scales to larger concurrent subsystems that would blow up loom's state space, and it can replay a failing schedule deterministically once found. Works with `tokio`, `rand`, and standard sync primitives via its own shim crates.

**When to reach for either.** Both target *your own* unsafe/custom synchronization — a hand-rolled lock-free queue, a custom `Mutex`-free cache, atomics-based reference counting. Neither is useful for "I used `tokio::sync::Mutex` and `mpsc::channel` correctly" — that code's correctness rests on primitives already verified upstream. Use loom on a small, isolated, hand-written concurrent data structure (state space small enough to be exhaustive in CI minutes); use shuttle once the concurrent surface is too large for loom to finish in reasonable time. If OCX/Grimoire has no custom lock-free code and only uses `tokio` primitives + `Arc<Mutex<_>>`, neither tool is currently justified — flag as future work if a lock-free structure is ever introduced.

### 8. Tiering recommendation

Wall-clock budgets below are judgment calibrated against the documented per-tool costs above (mutation testing reruns the whole suite per mutant; Miri is 10-100x slower; real fuzzing needs hours; loom/shuttle are exploration-heavy) — not a single citation, but derived from the numbers cited in sections 2-7.

| Tier | Runs | Tools | Budget |
|---|---|---|---|
| **Every PR** | Always | `cargo test`, `proptest` suites (default `cases = 256`), `cargo miri test` on unsafe/parser-only crates, `cargo-semver-checks` (if publishing a library), `cargo mutants --in-diff` scoped to the PR diff, 60-300s cargo-fuzz smoke run per fuzz target (build + doesn't-immediately-crash) | 5-15 min total |
| **Nightly** | Scheduled | Full unscoped `cargo mutants` run, `cargo-public-api` snapshot diff against main, longer proptest run (`PROPTEST_CASES=10000` or similar env override), fuzz targets run 1-4 hours each against a persisted corpus, `loom`/`shuttle` suites if any custom concurrency exists | 1-6 hrs |
| **Release only** | Tag/publish | `cargo-semver-checks` as a hard gate (block publish on major-without-major-bump), `cargo-public-api diff` reviewed by a human before merge to main of the version bump, ClusterFuzzLite/OSS-Fuzz continuous corpus reviewed for any outstanding crash, full-suite Miri run including any newly-`unsafe` code paths | Minutes to hours (mostly review of accumulated nightly results, not new compute) |

Continuous (always-on) fuzzing belongs in its own lane — OSS-Fuzz if eligible, ClusterFuzzLite otherwise — running independent of the PR/nightly/release cadence, with its own crash-triage process feeding back into the corpus used by the CI smoke tests.

## Normative guidance candidates

1. **Default to `proptest`, not `quickcheck`, for new property tests.** Rationale: composable strategies, richer shrinking, and it is the crate the rest of the ecosystem already uses. Verify: `grep -rl 'quickcheck' --include=Cargo.toml` should turn up nothing new; new property-test modules `use proptest::prelude::*`.
2. **Commit every `proptest-regressions/*.txt` file; never `.gitignore` that directory.** Rationale: without it, a bug proptest found once can silently stop being tested for. Verify: `git check-ignore -v proptest-regressions` must return non-zero (not ignored) in every crate that has a `proptest!` block.
3. **Every parser/serializer pair (manifest, lockfile, OCI reference, version string, digest) needs a round-trip property test.** Rationale: round-trip via the structured type, not string-generation, is the highest-signal-per-line property proptest's own docs recommend. Verify: for each `FromStr`/`Display` or `serde` pair in the parsing modules, grep for a matching `proptest!` test asserting `parse(x.to_string()) == x`.
4. **Any type with sequential state-mutating operations (lockfile writer, cache, install/uninstall) gets a `proptest-state-machine` test before it gets more unit tests.** Rationale: sequential unit tests can't discover order-dependent corruption; state-machine tests generate and shrink whole operation sequences. Verify: reviewer heuristic — does the module have `read-modify-write` or multi-step mutation logic with no `prop_state_machine!` test anywhere in the crate?
5. **Every hand-rolled binary/text format parser (archive headers, custom wire formats) gets a `cargo-fuzz` target using `#[derive(Arbitrary)]` on the structured input, not raw bytes.** Rationale: structure-aware fuzzing reaches deep parser logic that byte-soup fuzzing rejects at the first validity check. Verify: `ls fuzz/fuzz_targets/`, confirm each target's `fuzz_target!` closure argument type is a domain struct, not `&[u8]`, unless the format's grammar is genuinely byte-oriented at the entry point.
6. **Fuzz targets run as a ≤5-minute smoke test on every PR and as an hours-scale run on a scheduled job with a persisted corpus.** Rationale: the rust-fuzz book's own CI example uses `-max_total_time=300` as a smoke test, not a bug-finding budget; real coverage-guided discovery needs far longer. Verify: CI config greps for `max_total_time` in the PR workflow (small number) vs. the nightly workflow (large number or none, i.e. unbounded).
7. **Run `cargo miri test` in CI, scoped to crates/modules containing `unsafe` or exercising exotic generic instantiations — not the whole workspace if it does network/FS-heavy integration tests.** Rationale: Miri cannot execute FFI, networking, or most syscalls, and is 10-100x slower than native; running it broadly wastes CI time on tests it cannot meaningfully execute. Verify: `grep -rl 'unsafe' --include=*.rs <crate>` identifies which crates justify a dedicated `cargo miri test -p <crate>` CI step.
8. **Scope mutation testing to the diff on every PR (`cargo mutants --in-diff`), and run an unscoped full pass nightly.** Rationale: cargo-mutants reruns the whole test suite once per surviving mutant, which is too slow for full-repo runs on every push; `--in-diff` targets only what actually changed. Verify: PR CI job includes `--in-diff`; a separate scheduled job invokes `cargo mutants` with no `--in-diff` flag.
9. **Any library crate that gets published runs `cargo semver-checks` and blocks the release on a detected breaking change without a matching major version bump.** Rationale: it is the closest thing to an authoritative automated check for semver violations, even though it has known gaps (generics, some inference cases). Verify: release CI job runs `cargo semver-checks check-release` (or the GH Action) and fails the job on nonzero exit before `cargo publish` runs.
10. **Mark every new public struct/enum `#[non_exhaustive]` unless the team has explicitly decided its shape is permanently frozen.** Rationale: adding it later is a breaking change for existing struct-literal/exhaustive-match call sites; adding it up front costs nothing and preserves the option to grow the type. Verify: reviewer/grep heuristic — every `pub struct` / `pub enum` with all-`pub` fields or without a documented "this is frozen" comment should carry `#[non_exhaustive]` or a constructor function instead of allowing literal construction.
11. **Do not add turmoil/madsim/loom/shuttle preemptively.** Rationale: each has real adoption cost (shim crates, instrumented builds, or a whole runtime swap) that only pays off once there is a concrete concurrency/distributed-systems bug class to catch. Verify: reviewer heuristic — is there an open bug report or design doc describing a race/ordering failure this tool would have caught? If not, the dependency addition should be questioned in review.
12. **Every fuzz corpus and every `proptest-regressions` file that reproduces a real historical bug must also exist as a plain `#[test]` regression test where practical.** Rationale: fuzzer/property-test infrastructure can be disabled, skipped in a fast CI profile, or removed by a future refactor; a plain unit test derived from the same minimized input survives that churn. Verify: for each crash/failure fixed via fuzzing or proptest, check there is a corresponding `#[test]` with the literal minimized input hardcoded.

## AI-agent angle

- **Reaching for `quickcheck` out of habit (e.g. from other languages' "QuickCheck" naming) instead of `proptest`.** An LLM trained on older tutorials will often default to whichever crate appeared more often in its training data for "property based testing rust," which skews toward quickcheck's simpler signature. Mechanical check: `grep -r 'use quickcheck' --include=Cargo.toml,*.rs` in new code; flag for justification.
- **Writing a "property" that reimplements the function under test instead of checking an independent invariant.** A common LLM failure mode is `prop_assert_eq!(my_parser(input), reference_impl_written_inline_in_the_test(input))` where the "reference" is just a copy of the same logic — the test can never fail. Mechanical check: read the property body; if the "oracle" side is structurally identical to the code under test (same branches, same order), it is not a real property.
- **Fuzz targets that take `&[u8]` and manually re-slice/parse fields by hand instead of using `#[derive(Arbitrary)]`.** This is a compiling-but-shallow pattern: it looks like structure-aware fuzzing but the manual byte-slicing usually rejects most inputs before reaching real logic. Mechanical check: is the fuzz target's argument a plain byte slice with hand-written offset math, or a `#[derive(Arbitrary)]`-annotated struct? Prefer the latter unless the format under test is genuinely a fixed binary layout.
- **Assuming `cargo miri test` "just runs the test suite" and adding it to CI without scoping, then it silently no-ops or times out on network/FS-heavy integration tests.** Models frequently don't know Miri lacks networking/FFI support and will wire it into the full `cargo test` command. Mechanical check: does the Miri CI step target a specific crate/module known to be syscall-free, or does it run `cargo miri test` at the workspace root? The latter needs justification.
- **Citing `cargo-semver-checks` (or any single tool) as proof "no breaking change occurred."** Because the tool's own maintainers say it doesn't yet catch generic/lifetime/inference breakage, an agent treating a clean `cargo semver-checks` run as sufficient will miss the Cargo Book's more subtle breaking-change categories (auto-trait loss, RPIT lifetime capture, bound tightening). Mechanical check: for any PR that adds a trait impl, changes a generic bound, or touches return-position-impl-trait, manually cross-check against the [Cargo semver reference](https://doc.rust-lang.org/cargo/reference/semver.html) categories rather than trusting tool output alone.
- **Forgetting `#[non_exhaustive]` on a newly introduced public enum/struct, then later "fixing" it by adding the attribute** — which is itself a breaking change for any code doing exhaustive matching or struct-literal construction against the old (exhaustive) shape. Mechanical check: `cargo public-api diff` between the two states will show the non_exhaustive addition as a breaking removal of construction/match capability — treat that diff as a signal the attribute should have been there from the first publish.
- **Adding `loom` or a simulation crate (turmoil/madsim) speculatively "for correctness," without a concrete concurrency bug motivating it**, ballooning CI time and dependency surface for no measured benefit. Mechanical check: does the PR/commit message point to an actual race condition, or is the tool being added because "concurrent code should be tested this way" in the abstract? The latter is a red flag per the ladder in this project's own review posture — prefer to wait for a real bug.

## Contested / evolving

- **proptest's "passive maintenance" status.** Its own docs describe it as feature-complete with limited architectural change ([lib.rs/proptest](https://lib.rs/crates/proptest)) — read as a maturity signal by most of the ecosystem (14.9M downloads/month), but a smaller vocal minority treats any low-churn crate as a maintenance risk. Practice trend: continue treating it as the default; watch for a de-facto successor (none has emerged as of this research).
- **cargo-semver-checks lint coverage is actively growing.** The project's own FAQ frames "not yet" catching generics/lifetime breakage as a temporary gap, not a permanent limitation ([cargo-semver-checks](https://github.com/obi1kenobi/cargo-semver-checks)) — expect the tool's coverage of the Cargo Book's breaking-change categories to keep closing over time; do not treat today's gap list as fixed.
- **RPIT lifetime capture breakage is edition-dependent and shrinking as a hazard.** Rust 2024's default-capture-all-lifetimes semantics close off one of the subtler "possibly-breaking" categories documented on the Cargo semver page going forward — a codebase fully on edition 2024 has less exposure here than the historical guidance suggests; check the project's edition before treating this as a live risk.
- **Deterministic simulation testing (turmoil/madsim) is still a minority practice outside a handful of high-profile distributed-systems projects** (FoundationDB, TigerBeetle, sled). Whether it is "worth it" for a CLI package manager rather than a distributed database is a judgment call this research makes explicitly (see §6) rather than one with ecosystem consensus — revisit if the project grows a server/daemon component.
- **loom vs shuttle is not a solved choice.** loom is older and more established in the tokio ecosystem itself; shuttle is AWS-maintained and newer. Both READMEs frame the soundness/scalability trade-off honestly rather than claiming superiority — treat the choice as workload-dependent (state-space size), not a settled "always prefer X."

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [proptest vs quickcheck](https://proptest-rs.github.io/proptest/proptest/vs-quickcheck.html) | Official proptest book chapter | current (proptest-rs org docs) | Primary source for the strategy-vs-type generation distinction and shrinking trade-offs |
| [proptest README](https://github.com/proptest-rs/proptest/blob/main/proptest/README.md) | Official crate README | current, `main` branch | Primary source for proptest-regressions behavior and property-writing patterns |
| [proptest getting-started](https://proptest-rs.github.io/proptest/proptest/getting-started.html) | Official proptest book chapter | current | Primary source for the round-trip/non-crash/format-validation property patterns |
| [proptest state-machine chapter](https://proptest-rs.github.io/proptest/proptest/state-machine.html) | Official proptest book chapter | current | Primary source for `ReferenceStateMachine`/`StateMachineTest` API and shrink order |
| [lib.rs/proptest](https://lib.rs/crates/proptest) | Package registry aggregator page | fetched 2026-08 | Independent maintenance/adoption signal (downloads, dependent-crate count, version history) |
| [lib.rs/quickcheck](https://lib.rs/crates/quickcheck) | Package registry aggregator page | fetched 2026-08 | Same, for the comparison baseline |
| [rust-fuzz book: structure-aware fuzzing](https://rust-fuzz.github.io/book/cargo-fuzz/structure-aware-fuzzing.html) | Official rust-fuzz project book | current | Primary source for `arbitrary`/`derive(Arbitrary)` fuzzing pattern and corpus `Keep`/`Reject` |
| [rust-fuzz book: cargo-fuzz CI chapter](https://rust-fuzz.github.io/book/cargo-fuzz/ci.html) | Official rust-fuzz project book | current | Primary source for the 300s CI smoke-test duration and example GitHub Actions workflow |
| [rust-fuzz/afl.rs](https://github.com/rust-fuzz/afl.rs) | Official repo README | current | Primary source for AFL++ backend capabilities and platform notes |
| [rust-fuzz/honggfuzz-rs](https://github.com/rust-fuzz/honggfuzz-rs) | Official repo README | current | Primary source for honggfuzz platform support incl. Windows-via-WSL-only |
| [OSS-Fuzz: Integrating a Rust project](https://google.github.io/oss-fuzz/getting-started/new-project-guide/rust-lang/) | Official OSS-Fuzz docs | current | Primary source for exact onboarding directory layout, project.yaml, Dockerfile/build.sh requirements |
| [OSS-Fuzz: Accepting new projects](https://google.github.io/oss-fuzz/getting-started/accepting-new-projects/) | Official OSS-Fuzz docs | current | Primary source for the eligibility bar ("significant user base and/or critical infrastructure") |
| [ClusterFuzzLite: Rust integration](https://google.github.io/clusterfuzzlite/build-integration/rust-lang/) | Official ClusterFuzzLite docs | current | Primary source confirming the self-hosted-CI fallback shares the OSS-Fuzz layout |
| [rust-lang/miri](https://github.com/rust-lang/miri/) | Official Miri repo README | current | Primary source for what UB classes Miri detects and what it cannot run (FFI/networking/syscalls) |
| [Microsoft Rust Engineering Practices: Miri chapter](https://microsoft.github.io/RustTraining/engineering-book/ch05-miri-valgrind-and-sanitizers-verifying-u.html) | Secondary training material | current | Only source found with an explicit 10-100x slowdown figure and isolation-flag names |
| [mutants.rs: vs-coverage](https://mutants.rs/vs-coverage.html) | Official cargo-mutants book | current | Primary source for the concrete "writes a file, checks Result only" example |
| [mutants.rs: performance](https://mutants.rs/performance.html) | Official cargo-mutants book | current | Primary source for runtime cost drivers and the Wild/Mold linker speedup figures |
| [mutants.rs: in-diff](https://mutants.rs/in-diff.html) | Official cargo-mutants book | current | Primary source for the exact `--in-diff` flag semantics |
| [mutants.rs: pr-diff](https://mutants.rs/pr-diff.html) | Official cargo-mutants book | current | Primary source for the documented CI workflow scoping mutation testing to a PR |
| [lib.rs/cargo-mutants](https://lib.rs/crates/cargo-mutants) | Package registry aggregator page | fetched 2026-08 | Independent maintenance/adoption signal, including maintainer's own release-cadence note |
| [Cargo Book: SemVer Compatibility](https://doc.rust-lang.org/cargo/reference/semver.html) | Official Cargo reference documentation | current, edition-2024-aware | THE authoritative primary source for what counts as a breaking change, including the subtle trait/inference/lifetime cases |
| [Rust Reference: `#[non_exhaustive]`](https://doc.rust-lang.org/reference/attributes/type_system.html) | Official Rust language reference | current | Primary source for exact in-crate vs out-of-crate semantics of the attribute |
| [obi1kenobi/cargo-semver-checks](https://github.com/obi1kenobi/cargo-semver-checks) | Official repo README | current | Primary source for what the tool does/does not catch and CI/release usage |
| [cargo-public-api/cargo-public-api](https://github.com/cargo-public-api/cargo-public-api) | Official repo README | current | Primary source for API diffing and the snapshot-test CI pattern |
| [tokio-rs/turmoil](https://github.com/tokio-rs/turmoil) | Official repo README | current | Primary source for turmoil's simulation model and drop-in-shim crates |
| [madsim-rs/madsim](https://github.com/madsim-rs/madsim) | Official repo README | current | Primary source for the FoundationDB-inspired deterministic-simulation approach and runtime-swap integration |
| [tokio-rs/loom](https://github.com/tokio-rs/loom) | Official repo README | current | Primary source for the exhaustive-interleaving model, its C11 gaps, and test structure |
| [awslabs/shuttle](https://github.com/awslabs/shuttle) | Official repo README | current | Primary source for the randomized-vs-exhaustive soundness/scalability trade-off framing |

---
title: Cargo Features as a Testing and Seam Mechanism
topic: rust-testing
agent: research-lang
model: sonnet
date_researched: "2026-08"
sources_count: 22
scope: >
  cfg(test) vs cargo test-util features; feature unification hazards with
  self-referencing dev-dependencies and virtual workspaces; additive-only
  feature discipline; test-suite tiering with cargo-nextest; mocking strategy
  (mockall, faux, wiremock/httpmock, hand-written fakes); -testsupport crates
  vs feature flags; fixture/golden-data location; CI feature-combination traps.
  Written for the OCX/Grimoire Rust CLI family (ocx: 4-crate virtual
  workspace, resolver = "3"; grimoire: 1-crate workspace), both prebuilt-binary
  distributions, nothing published to crates.io.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Why `cfg(test)` cannot do this job](#1-why-cfgtest-cannot-do-this-job)
   2. [The `test-util` idiom: `cfg(any(test, feature = "..."))` and its variants](#2-the-test-util-idiom-cfganytest-feature---and-its-variants)
   3. [Feature unification: the dev-dependency-on-self leak, exactly](#3-feature-unification-the-dev-dependency-on-self-leak-exactly)
   4. [Additive-only discipline and why mutually exclusive features are broken](#4-additive-only-discipline-and-why-mutually-exclusive-features-are-broken)
   5. [Default features, `--no-default-features`, `required-features`](#5-default-features---no-default-features-required-features)
   6. [`cargo-hack`: powerset testing without combinatorial explosion](#6-cargo-hack-powerset-testing-without-combinatorial-explosion)
   7. [Tiering a test suite: features, `#[ignore]`, nextest, separate binaries](#7-tiering-a-test-suite-features-ignore-nextest-separate-binaries)
   8. [Mocking strategy: the decision rule](#8-mocking-strategy-the-decision-rule)
   9. [`-testsupport` crate vs. a feature on the main crate](#9--testsupport-crate-vs-a-feature-on-the-main-crate)
   10. [Fixtures and golden data: location and discovery](#10-fixtures-and-golden-data-location-and-discovery)
   11. [What breaks in CI](#11-what-breaks-in-ci)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

1. `cfg(test)` is a compiler flag set only when `rustc` is invoked with `--test` on *that specific compilation unit* — it is never true for the library as seen by an integration test binary or by any downstream dependent crate, because both link the library as a plain, non-`--test` rlib.
2. A `test-util` (or `test-utils`, `testing`) Cargo feature exists specifically to cross that boundary: it is a real, resolvable graph node, so it can be turned on by an integration test's dev-dependency edge or by a downstream crate's `Cargo.toml`, where `cfg(test)` cannot reach.
3. The idiom `#[cfg(any(test, feature = "test-util"))]` (or `cfg_attr` variant) keeps the item available under both mechanisms at once: for the crate's own unit tests, use plain `cfg(test)`; add the feature so integration tests and dependents get the same code without needing `--cfg test`. Confirmed in production code at [signalapp/libsignal](https://github.com/signalapp/libsignal/blob/main/rust/net/src/auth.rs) and [n0-computer/iroh](https://github.com/n0-computer/iroh/blob/main/iroh-relay/src/tls.rs).
4. tokio itself does **not** use the `any(test, ...)` join for its `test-util` feature — its internal macro `cfg_test_util!` expands to plain `#[cfg(feature = "test-util")]`, because tokio's own unit tests enable the feature via `[dev-dependencies] tokio = { path = ".", features = ["test-util"] } ` rather than relying on `cfg(test)`. Don't assume every crate uses the joined form; check the actual macro/attribute before copying a pattern.
5. **The single most important correctness fact in this topic**: with the default resolver (v1, i.e. edition ≤2018 or an unset `resolver` field), enabling a feature only through a dev-dependency — including a "dev-dependency on yourself" to expose `test-util` to `tests/*.rs` — unifies that feature into the **normal** build too, because v1 does not distinguish which cargo target actually needs the dev-dependency edge. This is not a theoretical risk; it is the documented pre-2021 behavior of cargo's dependency resolution.
6. Resolver v2 (default for `edition = "2021"`) and v3 (default for `edition = "2024"`) fix this **for the edge that is a dev-dependency**: a feature enabled only via `[dev-dependencies]` is unified into the normal build "unless [the] dev-dependencies are currently being built" — i.e. cargo compiles the crate twice (once plain, once with the feature) and only the test/bench/example artifact gets the enriched build. `cargo build` never sees it; `cargo test` / `cargo build --tests` does.
7. Resolver v2/v3 does **not** protect you if the feature edge is a *normal* dependency anywhere in the graph — e.g. a workspace member accidentally depends on your crate with `features = ["test-util"]` under `[dependencies]` instead of `[dev-dependencies]`. That is a plain graph-wide unification with no dev/normal distinction to save you, in any resolver version.
8. Resolver version is a *workspace-wide* setting. For a **virtual workspace** (a `[workspace]` table with no `[package]`), cargo does **not** infer the resolver from member crates' `edition` fields — it must be set explicitly as `resolver = "2"` or `"3"` in the `[workspace]` table, or the whole workspace silently reverts to v1 semantics regardless of what edition every member declares. ocx's workspace root already does this correctly (`resolver = "3"`); this is exactly the kind of setting that is easy to lose when a workspace is restructured.
9. Cargo features must be additive: enabling one must never disable something another feature or the default build provides. Mutually exclusive features (e.g. two different TLS backends) are an explicitly discouraged pattern in the Cargo Book precisely because enabling both is a graph-wide event no single crate can prevent — any two dependents can jointly force both on. Real breakage: [erebe/wstunnel's CONTRIBUTING.md](https://github.com/erebe/wstunnel/blob/main/CONTRIBUTING.md) documents that `--all-features` enables both the `aws-lc-rs` and `ring` crypto providers together, which `jsonwebtoken` treats as mutually exclusive, and "every test going through a tunnel then panics."
10. `--all-features` in CI is a trap for exactly that reason: it is not "test everything," it's "test the one combination that includes every mutually-exclusive pairing at once," which may be a state no real user ever ships. Prefer `cargo-hack`'s `--each-feature` / `--feature-powerset` (with `--exclude-features`/`--group-features` to prune) over a blind `--all-features`.
11. `required-features` on a `[[bin]]`, `[[bench]]`, `[[test]]`, or `[[example]]` target makes cargo silently skip building that target when the feature isn't enabled — it has no effect on `[lib]`. Use it to keep feature-gated test/bench binaries out of default `cargo test` runs without a runtime `#[cfg]` guard inside `main`.
12. `#[ignore]` + `cargo test -- --ignored` is the stdlib-native way to separate slow/networked tests, but as of 2026 the ecosystem default for a Rust CLI with a real test-tier story is **cargo-nextest**: filtersets (`-E 'test(e2e)'`), test-groups with `max-threads` for rate-limited/serial resources, per-profile retries with backoff/jitter for flaky network tests, and JUnit output — none of which `cargo test` provides natively.
13. mockall's `#[automock]` generates a `Mock<Trait>` struct; the idiomatic gate is `#[cfg_attr(test, automock)]` for same-crate use, but if another workspace crate needs the mock type as a dev-dependency, `cfg(test)` cannot reach it (same reasoning as claim 1) — you need a real feature, following the `test-util` pattern, not `cfg(test)`.
14. mockall has hard limits worth knowing before reaching for it: generic methods with non-`'static` type parameters are painful, associated types must be spelled out on the `#[automock]` attribute itself, trait objects with `impl Trait` combinations of non-auto traits don't work, and static-method expectations are **global and unsynchronized** across tests in the same binary.
15. faux mocks concrete structs, not traits, and only public methods ("only visible behavior should be mocked... fields are not mocked, as they are data, not behavior"). Its own documentation states the rule directly: "to prevent `faux` from leaking into your production code, set it as a `dev-dependency`," paired with `#[cfg_attr(test, faux::create)]`.
16. wiremock-rs and httpmock stand up a real local HTTP server and let you assert on real request/response traffic — appropriate for the outer edge of an HTTP client, not for internal trait seams. wiremock is async-only (built for tokio); httpmock offers both sync and async APIs.
17. Decision rule for mocking: a hand-written fake behind a narrow, purpose-built trait is the default. Reach for mockall only when the trait already exists for a real reason (not invented for testability) and hand-rolling the fake would be large or repetitive. Reach for wiremock/httpmock specifically at the HTTP boundary (registry/API client), never as a substitute for an internal trait seam.
18. A dedicated `-testsupport` crate (dev-dependency only, never a normal dependency of anything shipped) is the only option that keeps test scaffolding out of the shipped binary *with certainty* — a feature flag only keeps it out if every consumer of the feature flag is disciplined about never wiring it through a normal-dependency edge (see claim 7). For a workspace the size of ocx (4 crates) or grimoire (1 crate, 129k LOC), a `-testsupport` crate is the safer default once more than one crate needs the same fixtures/fakes.
19. `CARGO_MANIFEST_DIR` (compile-time, via `env!`) is the reliable way to locate fixture files from a test binary — both unit and integration test binaries execute with their process working directory set to the *package's* manifest root by cargo, so relative paths from `cargo test`'s cwd usually work too, but that cwd guarantee is a `cargo test` behavior, not a guarantee of the binary itself (e.g. under `cargo nextest run` or a manually invoked test binary the cwd may differ) — `CARGO_MANIFEST_DIR` does not depend on how the binary is invoked and is the only truly portable answer.
20. `cargo-hack --feature-powerset` is the tool for combinatorial feature testing; use `--depth N` to cap simultaneous flags and `--group-features` to collapse features that are only ever meaningful together, keeping the combinatorial set small enough for CI instead of testing the true 2^n powerset.

## Findings

### 1. Why `cfg(test)` cannot do this job

The Rust Reference is explicit about what sets `cfg(test)`:

> "`test` — Enabled when compiling the test harness. Done with `rustc` by using the `--test` flag." — [Rust Reference, Conditional compilation](https://doc.rust-lang.org/reference/conditional-compilation.html)

`--test` is passed to `rustc` for exactly one compilation unit: the crate's own unit-test build (what `cargo test` does when it recompiles `src/lib.rs` with the test harness linked in). Two other, very common builds of the *same source* never pass `--test`:

- **Integration tests** (`tests/*.rs`): each file is its own crate that links the library as an ordinary, non-test rlib — [Cargo Book, cargo-targets](https://doc.rust-lang.org/cargo/reference/cargo-targets.html) describes these as compiling separately and using only the library's *public* API. The library itself, as consumed here, was never compiled with `--test`, so `#[cfg(test)]` items inside it do not exist for the integration test to call.
- **Dependent crates**: any downstream `[dependencies]` consumer compiles your crate as a plain rlib, never with `--test`. `cfg(test)` is always false there, full stop — it is not a property that can propagate across a crate boundary at all, because it's a per-`rustc`-invocation flag, not a graph attribute.

A cargo **feature**, by contrast, is a first-class node in the resolver's dependency graph: it can be turned on by a `dev-dependency` edge (reaching integration tests) or by any consumer's `Cargo.toml` (reaching dependent crates), which is precisely why a `test-util`/`test-utils`/`testing` feature exists as a named convention rather than people just writing `#[cfg(test)]` everywhere and being surprised when it doesn't reach far enough.

### 2. The `test-util` idiom: `cfg(any(test, feature = "..."))` and its variants

The combined form keeps one code path serving two different reach mechanisms:

```rust
#[cfg_attr(any(test, feature = "test-util"), derive(Default))]
pub struct Auth<S = String> { /* ... */ }
```

confirmed verbatim in [signalapp/libsignal, `rust/net/src/auth.rs`](https://github.com/signalapp/libsignal/blob/main/rust/net/src/auth.rs). The same repository's `rust/net/src/chat.rs` shows the fuller pattern in one file:

- `#[cfg_attr(any(test, feature = "test-util"), derive(PartialEq))]` on `Request`/`Response` — test-only trait impls, reachable both in-crate and from outside via the feature.
- `#[cfg(any(test, feature = "test-util"))] pub mod test_support` — an entire module of cross-crate test helpers (e.g. `simple_chat_connection`), gated the same way.
- `#[cfg_attr(feature = "test-util", visibility::make(pub))]` on `async fn start_connect_with_transport` — using the `visibility` crate to promote a `pub(crate)` item to fully `pub` **only** when the feature is on, so other crates can call it as a dev-dependency without permanently widening the API surface. This is a sharper tool than a plain `pub` behind `cfg`, because it keeps the item non-public in the default build's item tree, not merely "feature-gated but still pub."
- Plain `#[cfg(test)]` still used separately for the crate's own private unit-test module, showing the two mechanisms coexisting rather than being redundant.

[n0-computer/iroh, `iroh-relay/src/tls.rs`](https://github.com/n0-computer/iroh/blob/main/iroh-relay/src/tls.rs) shows the security-relevant hazard this idiom carries: a `test-utils`-gated `InsecureSkipVerify` mode and `make_dangerous_client_config()` function that disable TLS certificate verification entirely, commented "INSECURE: Do not verify server certificates at all. May only be used in tests or local development setups." This is exactly the kind of code a `test-util` feature must **never** let leak into a shipped binary (see §3) — the blast radius of the leak is not "extra test code in the binary," it's "certificate verification silently disabled in production."

**Counter-example, same convention name, different mechanics**: tokio's `test-util` feature (`test-util = ["rt", "sync", "time"]` in [`tokio/Cargo.toml`](https://github.com/tokio-rs/tokio/blob/master/tokio/Cargo.toml)) is implemented via an internal macro:

```rust
// tokio/src/macros/cfg.rs
cfg_test_util! { // expands to #[cfg(feature = "test-util")]
cfg_not_test_util! { // expands to #[cfg(not(feature = "test-util"))]
```

Neither branch joins with `test` — verified by direct inspection of [`tokio/src/macros/cfg.rs`](https://github.com/tokio-rs/tokio/blob/master/tokio/src/macros/cfg.rs) and by a zero-result GitHub code search for the literal string `any(test, feature = "test-util")` scoped to `tokio-rs/tokio`. tokio's own unit tests reach the feature by declaring it as a dev-dependency on itself with the feature enabled, not via `cfg(test)`. **Lesson for an agent implementing this pattern: read the actual macro/attribute in the crate you're copying from — the "canonical" `any(test, feature = "...")` join is common (6000+ GitHub code-search hits across the ecosystem) but not universal, and the two forms have different implications for whether the crate's own unit tests need the feature turned on at all.**

### 3. Feature unification: the dev-dependency-on-self leak, exactly

This is the load-bearing fact of the whole topic. Cargo Book, Features reference:

> "When a dependency is used by multiple packages, Cargo will use the union of all features enabled on that dependency when building it." — [Cargo Book, Features](https://doc.rust-lang.org/cargo/reference/features.html)

Concrete minimal setup — a crate exposing `test-util` and using the common "dev-dependency on self" trick so its own `tests/*.rs` integration tests can reach feature-gated helpers:

```toml
# crates/core/Cargo.toml
[package]
name = "core"
edition = "2021"

[features]
test-util = []

[dev-dependencies]
core = { path = ".", features = ["test-util"] }
```

**Resolver v1** (pre-2021-edition default, or an explicit `resolver = "1"`, or — critically — an *unset* `resolver` field in a virtual workspace even when every member is edition 2021): v1 unifies features per package **without distinguishing which cargo target actually needs the dev-dependency edge**. The dev-dependency-on-self edge is present in the graph the moment `cargo` resolves *anything* that touches this package's dev-dependencies (e.g. `cargo test`, but on some cargo versions even `cargo build` in the same workspace session can trigger a shared resolve), and once resolved, `test-util` is unified into the one feature set used for **every** artifact built from that package in that resolve — including the plain library used by a release binary. The practical failure mode: a maintainer runs `cargo test`, the lockfile / build cache picks up `test-util` as part of the resolved feature set for `core`, and a subsequent `cargo build --release` in the same target directory reuses cached units that were compiled with `test-util` on, or — worse, under v1's true unification — resolves `test-util` on for the release build too, silently including `iroh`-style insecure-mode code (§2) in a shipped binary.

**Resolver v2** (default for `edition = "2021"`) and **v3** (default for `edition = "2024"`, requires Rust ≥1.84) fix this specific case:

> "Features enabled on dev-dependencies will not be unified when those same dependencies are used as a normal dependency, unless those dev-dependencies are currently being built... the library will normally link against `serde` without the `std` feature. However, when built as a test or example, it will include the `std` feature." — [Cargo Book, Resolver](https://doc.rust-lang.org/cargo/reference/resolver.html)

Applied to the self-dependency case: cargo compiles `core` as **two separate artifacts** — a plain rlib for the normal `[lib]`/`[[bin]]` targets, and a second rlib with `test-util` on, used only when actually building `core`'s `tests/*.rs` targets. `cargo build` never links against the second artifact. This holds even inside `cargo test --workspace` in a multi-crate workspace: resolver v2/v3 tracks the feature requirement *per target*, not globally per package, so a sibling crate's normal (non-test) build of `core` still gets the plain artifact in the same invocation.

**What v2/v3 does *not* fix**: if the `test-util` edge is ever a **normal** dependency anywhere in the graph — e.g. a workspace member's `[dependencies]` (not `[dev-dependencies]`) accidentally names `features = ["test-util"]`, perhaps because a shared fixtures/property-test-generators crate was wired in the wrong section — that is graph-wide unification with no dev/normal split to protect you, in *any* resolver version. This is the actual way real projects ship test scaffolding by accident: not by misunderstanding the dev-dependency rule, but by putting the feature-enabling edge in the wrong `Cargo.toml` section once, in one crate, in a large workspace.

**The virtual-workspace gotcha** (verified against the Cargo Book, not inferred): resolver version is one setting for the whole workspace, and for a workspace with no root `[package]` (a "virtual workspace" — which is what a multi-crate CLI like ocx is), cargo does **not** derive it from member editions:

> "If using a virtual workspace, the version should be specified in the `[workspace]` table" — [Cargo Book, Resolver](https://doc.rust-lang.org/cargo/reference/resolver.html)

Omit `resolver = "2"`/`"3"` from a virtual workspace's `[workspace]` table and the whole workspace resolves under v1 semantics regardless of every member declaring `edition = "2021"` — reintroducing the dev-dependency leak described above with no per-crate warning. (ocx's own workspace root sets `resolver = "3"` explicitly — the correct state; this is the exact line to check when reviewing any new or restructured Rust workspace.)

### 4. Additive-only discipline and why mutually exclusive features are broken

> "Features should be additive... enabling a feature should not disable functionality, and it should usually be safe to enable any combination of features... There are rare cases where features may be mutually incompatible with one another. This should be avoided if at all possible, because it requires coordinating all uses of the package in the dependency graph to cooperate to avoid enabling them together." — [Cargo Book, Features](https://doc.rust-lang.org/cargo/reference/features.html)

The reason this is a hard rule and not a style preference: feature unification (§3) means *any two dependents anywhere in the graph* can jointly force on a combination neither of them individually asked for. A leaf crate cannot opt out of another crate's feature choice. If two features are truly incompatible, the Book's own fallback is a `compile_error!` guard:

```rust
#[cfg(all(feature = "foo", feature = "bar"))]
compile_error!("feature \"foo\" and feature \"bar\" cannot be enabled at the same time");
```

— which converts a silent miscompile/wrong-behavior bug into a build failure, but does not prevent the graph from *requesting* the bad combination; it only makes the request loud.

Real breakage, not hypothetical: [erebe/wstunnel's CONTRIBUTING.md](https://github.com/erebe/wstunnel/blob/main/CONTRIBUTING.md) documents that `--all-features` "does **not** work for [testing]: it enables both `aws-lc-rs` and `ring`, which forward `jsonwebtoken` the two providers it treats as mutually exclusive," with the effect that "every test going through a tunnel then panics." The project's fix is not a `compile_error!` — it's to never run `--all-features` and instead test each crypto-provider feature set separately in CI, treating `ring` as required only for the platforms that actually need it (armv6/armv7/freebsd/windows-x86).

### 5. Default features, `--no-default-features`, `required-features`

Default feature unification carries the same "any dependent can force it on" hazard: `default-features = false` must be set at **every** point in the graph that depends on a package, or the default set reappears via a sibling edge that didn't opt out — [Cargo Book, Features](https://doc.rust-lang.org/cargo/reference/features.html) calls this out directly: "Every package must ensure that `default-features = false` is specified to avoid enabling them." Testing `--no-default-features` in CI is therefore not optional polish; it is the only way to catch a dependent silently re-enabling defaults you thought you'd turned off.

`required-features` (`[[bin]]`, `[[bench]]`, `[[test]]`, `[[example]]` only — explicitly **not** `[lib]`) tells cargo to skip building that target entirely when the feature isn't active, rather than compiling it and failing, or relying on a runtime check inside `main`/the test body — [Cargo Book, cargo-targets](https://doc.rust-lang.org/cargo/reference/cargo-targets.html). Use it on an acceptance-test binary that needs, say, a `network-tests` feature, so a default `cargo test` invocation silently omits it instead of failing to compile or panicking at runtime for lack of network access.

### 6. `cargo-hack`: powerset testing without combinatorial explosion

[taiki-e/cargo-hack](https://github.com/taiki-e/cargo-hack) — "Cargo subcommand to provide various options useful for testing and continuous integration":

- `--each-feature` — one run per individual feature (plus a defaults run and a `--no-default-features` run) — catches "feature X doesn't compile in isolation" without a combinatorial run.
- `--feature-powerset` — every combination, deduplicating equivalent combinations. This *is* combinatorial (2^n) by construction; use it only on small feature sets or in combination with the pruning flags below.
- `--depth N` — caps how many features are combined simultaneously; `--depth 1` makes `--feature-powerset` behave like `--each-feature`.
- `--group-features a,b --group-features c,d` — collapses features that are only ever meaningful together into a single powerset unit, which is the main lever for keeping a real project's powerset tractable.
- `--exclude-features` / `--exclude-no-default-features` — prune known-bad or irrelevant combinations (e.g. exclude a `test-util` feature from a powerset meant to validate production feature combinations, since it should never appear in a production build in the first place).

Typical CI invocation: `cargo hack check --feature-powerset --exclude-features test-util --group-features a,b`.

### 7. Tiering a test suite: features, `#[ignore]`, nextest, separate binaries

Mechanisms available, from most to least stdlib-native:

- **`#[ignore]` + `cargo test -- --ignored`** — stdlib only, zero new dependencies. Coarse: one boolean per test, no grouping, no concurrency control, no retries.
- **cfg/feature gate on a whole test target** — `required-features` (§5) on a `[[test]]` skips compiling an acceptance-test binary unless a feature (e.g. `e2e`) is enabled; combine with `#[ignore]` for tests inside a shared binary that still needs to compile.
- **Separate integration test binaries** (`tests/unit_fast.rs` vs `tests/e2e_registry.rs`) — each `tests/*.rs` file is its own crate/binary and can be filtered by name with `cargo test --test e2e_registry`, and can carry its own `required-features`. Note the compile-time cost: every `tests/*.rs` file re-links the whole library — [matklad, "Delete Cargo Integration Tests"](https://matklad.github.io/2021/02/27/delete-cargo-integration-tests.html) measured a 3x compile-time and 5x on-disk-artifact reduction from consolidating many small `tests/*.rs` files into one binary with submodules, plus faster wall-clock runs because "the critical path is the sum of longest tests in each binary; the more binaries, the longer the path." Tension to hold explicitly: fewer binaries compiles faster, but a single acceptance-test binary can't be `required-features`-gated away from unit tests without splitting it back out — pick the split at the *tier* boundary (unit vs acceptance vs slow), not per source file.
- **Environment-variable gates** (`if std::env::var("OCX_E2E").is_ok() { return; }` at the top of a test) — works, but is invisible to `cargo test --list` and to any tool trying to select tests declaratively; treat as a last resort, not a tiering primitive.
- **cargo-nextest** — the 2026 default for a project already using nextest (per project context, already in tree): it adds what neither `cargo test` nor `#[ignore]` provide:
  - **Filtersets** (`-E`): a small DSL — `cargo nextest run -E 'test(e2e)'`, `package(serde) and test(deserialize)`, `deps(my-crate)`, `not (test(/parse[0-9]*/) | test(run))` — for selecting a tier by name/package/dependency-relationship rather than a single boolean — [nextest, Filtersets](https://nexte.st/docs/filtersets/).
  - **Test groups**, `.config/nextest.toml`:
    ```toml
    [test-groups]
    serial-integration = { max-threads = 1 }

    [[profile.default.overrides]]
    filter = 'package(integration-tests)'
    test-group = 'serial-integration'
    ```
    a real semaphore/mutex for tests that share a resource (a real registry, a rate-limited API) rather than relying on the whole run being `--test-threads 1` — [nextest, Test groups](https://nexte.st/docs/configuration/test-groups/) (introduced 0.9.48; `group()` filterset predicate in 0.9.133).
  - **Per-profile retries** with backoff/jitter for genuinely flaky network-dependent acceptance tests, distinct from silently ignoring them:
    ```toml
    [profile.default]
    retries = { backoff = "exponential", count = 3, delay = "1s", jitter = true }
    ```
    — [nextest, Retries](https://nexte.st/docs/features/retries/).
  - **JUnit output** per profile (`[profile.ci.junit] path = "junit.xml"`), including `<flakyFailure>`/`<rerunFailure>` markers distinguishing "passed on retry" from "failed outright" — [nextest, JUnit](https://nexte.st/docs/machine-readable/junit/).
  - **Profiles** selected with `-P`/`--profile` (e.g. a `ci` profile with stricter retries/output settings than `default`), resolved with command-line > env-var > per-test-override > profile precedence — [nextest, Configuration](https://nexte.st/docs/configuration/).

  None of filtersets, test-groups, retries, or JUnit output exist in stock `cargo test`; they are the actual reason nextest, not `cargo test`, is the tiering backbone for a CLI with a real acceptance/e2e tier.

### 8. Mocking strategy: the decision rule

- **Hand-written fake behind a narrow trait** — define the trait at the seam you actually need (e.g. `trait RegistryClient { fn fetch_manifest(&self, ...) -> Result<...>; }`), write a `struct FakeRegistry` that returns canned data. No macro, no derived global state, full control over async/generic/lifetime shapes that mocking frameworks struggle with. **Default choice** when the trait is small and you own both sides.
- **mockall** — `#[cfg_attr(test, automock)]` generates `MockTrait` with `.expect_method()` builders. Reach for it when the trait already exists for a real design reason (not invented purely to make something mockable) and hand-writing the fake would be large/repetitive. Known hard edges, confirmed from [docs.rs/mockall](https://docs.rs/mockall/latest/mockall/): generic methods with non-`'static` type parameters lose genericity and gain restrictions; associated types must be spelled out explicitly on the `#[automock]` attribute; `impl Trait`/trait-object combinations of two or more non-auto traits don't work; **static-method expectations are global across the whole test binary and unsynchronized** — a real hazard under nextest's default per-test parallelism, since two tests setting different expectations on the same static method race each other. To expose a mock to another workspace crate as a dev-dependency, `#[cfg_attr(test, automock)]` is insufficient (same reasoning as cfg(test) in §1) — gate it behind a real feature.
- **faux** — mocks concrete *structs*, not traits, and by design only public methods: "only visible behavior should be mocked... fields are not mocked, as they are data, not behavior. Private methods are not mocked, as they are invisible to others" — [docs.rs/faux](https://docs.rs/faux/latest/faux/). Its own docs state the containment rule explicitly: "to prevent `faux` from leaking into your production code, set it as a `dev-dependency`," paired with `#[cfg_attr(test, faux::create)] #[cfg_attr(test, faux::methods)]`. Appropriate when you want to fake a concrete type without introducing a trait purely for testability — but the moment you need to share that fake across a crate boundary (§9), a struct-mocking library can't help; you need the trait-based fake or feature-gated export instead.
- **wiremock-rs / httpmock** — stand up a real local HTTP server; assert on real serialized requests/responses. [wiremock-rs](https://github.com/LukeMathWalker/wiremock-rs) is async/tokio-only (`MockServer::start().await`, `Mock::given(method("GET")).and(path("/hello")).respond_with(...).mount(&server).await`); [httpmock](https://github.com/alexliesenfeld/httpmock) offers both sync and async APIs. Use these at the actual HTTP boundary (an OCI registry client, ghcr.io API calls) to catch serialization/header/status-code bugs a trait-level fake cannot — never as a substitute for an internal trait seam, since standing up an HTTP server per test is orders of magnitude slower than an in-process fake.

**The rule, not a survey**: default to a hand-written fake behind a trait you'd want to exist anyway; escalate to mockall only when the trait is large/pre-existing and the fake would be pure boilerplate; use wiremock/httpmock specifically at the outermost HTTP edge, in parallel with (not instead of) trait-level fakes for everything the HTTP client is behind.

### 9. `-testsupport` crate vs. a feature on the main crate

Two ways to share fixtures/fakes across workspace crates:

- **Feature on the main crate** (`test-util`, exported per §2): lower ceremony, one crate, one Cargo.toml. Certainty of exclusion from the shipped binary rests entirely on the dev-dependency discipline in §3 — every consumer of the feature must enable it via `[dev-dependencies]`, never `[dependencies]`, in every crate, forever. One mistake in one `Cargo.toml`, in a workspace of any size, ships it.
- **Dedicated `-testsupport` crate** (`core-testsupport`), consumed only via `[dev-dependencies]` by every crate that needs it, and never appearing in any `[dependencies]` section anywhere, including transitively: the shipped binary's dependency graph simply does not contain the crate at all — not "contains it with a feature off," but structurally absent. This is the *only* option that keeps test code out of the shipped artifact **with certainty** rather than with discipline, because there is no `Cargo.toml` section where getting it wrong still ships production code — getting it wrong (`[dependencies] core-testsupport = ...`) is an obviously wrong line to review, versus a feature flag typo that is easy to miss in review.

Trade-off: an extra crate to maintain, and (if it re-exports mocks of the main crate's own traits) a potential circular-looking dependency (`core` → dev-dep → `core-testsupport` → dep → `core`), which cargo permits (dev-dependency cycles back through the crate under test are explicitly allowed) but which is one more thing for a reviewer to reason about. For a single-crate workspace (grimoire today), a `test-util` feature is proportionate; for a multi-crate workspace where more than one crate needs the same fixtures (ocx: 4 crates), the `-testsupport` crate is the safer default the moment a second crate needs what the first crate's tests built.

### 10. Fixtures and golden data: location and discovery

- **Where fixtures live**: conventionally a `tests/fixtures/` or `testdata/` directory at the package root, referenced from tests via `concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/...")` rather than a bare relative path.
- **Why `CARGO_MANIFEST_DIR` and not a relative path**: `cargo test` sets the *process* working directory for both unit and integration test binaries to "the root directory of the package the test belongs to" — [Cargo Book, `cargo test`](https://doc.rust-lang.org/cargo/commands/cargo-test.html) — so a relative path from the crate root usually resolves correctly under plain `cargo test`. But that cwd guarantee belongs to `cargo test` as a launcher, not to the compiled test binary itself: run the same binary directly (`./target/debug/deps/mycrate-abcd1234`), under `cargo nextest run` (which launches binaries itself and is not contractually bound to the same cwd rule), under a debugger, or from a different working directory in a script, and a relative path can silently resolve against the wrong root. `CARGO_MANIFEST_DIR` is baked in at **compile time** via `env!("CARGO_MANIFEST_DIR")`, so it is correct regardless of how or from where the resulting binary is later invoked — the only fully portable answer.
- **Doctests** get a different rule again: rustdoc's own working directory is the *workspace* root, not the package root, controllable via `--test-run-directory` — worth knowing before assuming doctest fixture paths behave like integration-test ones.
- **Keeping fixtures in sync**: golden-file tests (compare output to a checked-in expected file) need an explicit "update the golden file" path (commonly an env var like `UPDATE_GOLDEN=1 cargo test`, or an `insta`-style review step) — otherwise fixtures drift from reality the first time someone forgets to regenerate them by hand, and a stale fixture silently tests the wrong thing rather than failing loudly.

### 11. What breaks in CI

- **Feature combinations that only fail together**: neither "every feature off" nor "every feature on" catches a bug that only manifests when features X and Y are combined but Z is not — this is exactly what `cargo hack --feature-powerset` (§6) exists to catch, at a cost that scales combinatorially without `--depth`/`--group-features` pruning.
- **The `--all-features` trap**: `--all-features` is not "the maximally-tested configuration" — for a crate with any mutually-exclusive pair (§4), it is *the one configuration guaranteed to combine features no real user combines*, and can fail for reasons that have nothing to do with real usage. The wstunnel/jsonwebtoken/aws-lc-rs-vs-ring case (§4) is a concrete, documented instance of exactly this.
- **Representative-subset testing instead of full combinatorics**: `cargo hack --each-feature` (catches "doesn't compile alone") plus `--feature-powerset --group-features ... --depth 2` (catches "doesn't compile with one other feature, grouped sensibly") plus explicit CI jobs for the two or three feature sets real users/binaries actually ship (e.g. "default", "no-default-features", "the release binary's exact feature set") is the practical middle ground between "only test default" and "test the true 2^n powerset."
- **`--no-default-features` drift**: per §5, a dependent re-enabling defaults you disabled elsewhere is silent unless a CI job actually builds with `--no-default-features` and fails loudly when the resulting build no longer compiles or behaves as expected.

## Normative guidance candidates

1. **Never gate cross-crate-boundary test helpers with `cfg(test)` alone; use a real Cargo feature.** Rationale: `cfg(test)` is a per-compilation-unit compiler flag that never reaches an integration test binary or a downstream crate (§1). VERIFICATION: `grep -rn 'cfg(test)' --include=*.rs crates/*/src | grep -v 'mod tests'` — any hit gating an `fn`/`struct`/`mod` that a `tests/*.rs` file or another workspace crate needs to call is a candidate to move to `#[cfg(any(test, feature = "test-util"))]`.
2. **Every crate's `test-util`-style feature edge must be a `[dev-dependencies]` edge, never a `[dependencies]` edge, anywhere in the workspace.** Rationale: this is the one thing resolver v2/v3 cannot protect against (§3). VERIFICATION: `grep -A3 '^\[dependencies\]' crates/*/Cargo.toml | grep 'test-util\|test_util'` must return nothing; the same grep against `[dev-dependencies]` sections is where it belongs.
3. **A virtual workspace must set `resolver = "2"` or `"3"` explicitly in its `[workspace]` table; never rely on member `edition` fields to imply it.** Rationale: cargo does not infer resolver version from member editions for a virtual manifest (§3), and losing this line silently reverts the whole workspace to v1 feature-unification semantics. VERIFICATION: `grep -A2 '^\[workspace\]' Cargo.toml | grep -q 'resolver = "[23]"'` must succeed for every virtual-workspace root in the fleet.
4. **Never run `cargo test --all-features` (or `cargo hack --all-features`) as the sole feature-combination CI gate.** Rationale: it forces on any mutually-exclusive feature pairing that exists anywhere in the dependency graph, testing a combination no shipped binary uses (§4, §11). VERIFICATION: `grep -rn 'all-features' .github/workflows Taskfile*.yml` — every hit should be paired with either a comment establishing there are no mutually-exclusive features in the graph, or removed in favor of `cargo-hack --feature-powerset` with exclusions.
5. **Any two features documented or suspected as mutually exclusive must carry a `compile_error!` guard.** Rationale: makes an illegal combination a build failure instead of silently-wrong runtime behavior (§4). VERIFICATION: for each such pair, `cargo check --features a,b` must fail with the `compile_error!` message, and CI must include a job that asserts this (a "must fail" check, not just "must pass").
6. **Put `required-features` on every test/bench/example target that needs network, a real registry, or another external resource — do not gate it with a runtime early-return.** Rationale: keeps `cargo test`/`cargo nextest run` from even compiling (let alone attempting and failing) resource-dependent targets by default (§5, §7). VERIFICATION: `cargo test --list` (no extra features) must not list any test that immediately errors/panics for lack of network access; `cargo metadata` shows `required-features` set on those targets.
7. **Adopt cargo-nextest filtersets + test-groups for tiering instead of environment-variable gates or ad hoc `#[ignore]` sprawl once a suite has more than one non-unit tier.** Rationale: filtersets/test-groups/retries/JUnit are declarative and toolable; env-var gates are invisible to `--list` and to any external test-selection tooling (§7). VERIFICATION: `cargo nextest list -E 'test(e2e)'` returns the expected acceptance-tier tests by name, and no test source file contains a bare `std::env::var(...).is_ok()` gate used for tiering.
8. **Default to a hand-written fake behind a narrow trait; escalate to mockall only for large/pre-existing traits, and never assume `#[cfg(test)]`-gated mocks are visible to another crate.** Rationale: fakes have no macro-generated global state and no generic/lifetime limitations; mockall's static-method expectations are unsynchronized process-global state, a real footgun under nextest's default parallelism (§8). VERIFICATION: `grep -rn 'expect_' crates/*/src | grep -B5 'fn.*() ->' ` — any `MockTrait` used for a `fn`-not-`&self`/static-style method is worth a design review for cross-test interference; and any `MockTrait` referenced from a `tests/*.rs` file or another crate must be behind a real feature, not bare `cfg(test)`.
9. **For a workspace where more than one crate needs the same fixtures/fakes, extract a `-testsupport` crate consumed only via `[dev-dependencies]`, rather than growing a shared `test-util` feature.** Rationale: a separate crate that never appears under any `[dependencies]` section is structurally absent from the shipped graph — certainty instead of discipline (§9). VERIFICATION: `cargo tree -e normal -p <shipped-binary-crate>` must not list the `-testsupport` crate at all.
10. **Locate test fixtures via `env!("CARGO_MANIFEST_DIR")`, never a bare relative path, in both unit and integration tests.** Rationale: the cwd-equals-package-root guarantee belongs to `cargo test` as a launcher, not to the compiled binary, and does not necessarily hold under `cargo nextest run`, direct invocation, or a debugger (§10). VERIFICATION: `grep -rn '"\./\|"\.\./\|"tests/' --include=*.rs crates/*/tests crates/*/src | grep -v CARGO_MANIFEST_DIR` flags candidate bare relative paths.

## AI-agent angle

- **The mistake an LLM defaults to**: writing `#[cfg(test)]` on a helper that a `tests/*.rs` file (in the *same* crate) or a sibling workspace crate then tries to call, and being surprised by an "unresolved item" error it then "fixes" by making the item `pub` unconditionally — which compiles, but ships test-only code (sometimes security-relevant, per the iroh insecure-TLS example in §2) in the default build. The correct fix is a feature, not wider visibility.
- **The second mistake**: adding the feature-enabling edge to `[dependencies]` because that's the section an LLM defaults to when it just wants "this crate to have that feature," rather than reasoning about whether the edge is dev-only. This is precisely the leak in §3, and it is *silent* — the build succeeds, nothing looks wrong locally, and the only symptom is a larger release binary or (in the iroh case) a security regression that ships without a compile error.
- **The third mistake**: reaching for `--all-features` as the "safe, thorough" CI flag because it sounds maximal, without checking whether the crate has any mutually-exclusive feature pair — producing either a hard-to-diagnose CI failure (§4/§11) or, worse, a green build that tested a configuration no real binary uses.
- **Smallest mechanical checks a review pass (human or agent) can run in seconds**:
  1. `grep -A3 '^\[dependencies\]' crates/*/Cargo.toml | grep -i 'test.util\|mock\|testsupport'` — any hit is almost certainly a misplaced edge (rule 2).
  2. `grep -A2 '^\[workspace\]' Cargo.toml | grep -q 'resolver'` — confirms rule 3 on any virtual workspace before trusting resolver v2/v3 semantics at all.
  3. `cargo build --release 2>&1 | grep -i 'test-util\|test_util'` (or inspect `cargo metadata --features ""` resolved feature set for the release target) — if a test-only feature shows up in the resolved set for the actual shipped binary target, stop and find the edge.
  4. `cargo tree -e normal -p <shipped-binary>` for any `-testsupport` crate name — must return nothing.

## Contested / evolving

- **`cargo test` vs `cargo nextest` as the default test runner**: not fully settled across the whole ecosystem (many crates.io libraries still document only `cargo test`), but for CLI/service projects with a real tiering need, nextest's filtersets/test-groups/retries/JUnit output (§7) have no `cargo test` equivalent, and the direction in 2026 is nextest-by-default for anything beyond a small single-crate library — consistent with this project already having nextest in tree.
- **mockall vs hand-written fakes**: genuine, ongoing disagreement in the Rust community, not a settled question. The mockall camp values less boilerplate for large trait surfaces; the fake camp (echoed by faux's own design philosophy in §8) values avoiding macro-generated global state and the static-method-expectation hazard. This document takes a position (§8's decision rule) rather than reporting a false consensus, because the trade-off is genuinely context-dependent and an agent needs a rule, not a survey, to act on.
- **Resolver v3's actual scope**: the Cargo Book documents v3 as changing MSRV-aware dependency resolution (`resolver.incompatible-rust-versions`), not feature-unification semantics beyond what v2 already established — worth stating plainly since "v3 fixes features further" is an easy but incorrect inference from "v3 is newer."
- **`-testsupport` crate vs. feature-flag convergence**: no single convention has won across the ecosystem; both patterns are common in different corners (tokio ships both `test-util` *and* a separate `tokio-test` crate, which is itself evidence the two approaches solve overlapping-but-different problems rather than one superseding the other — `test-util` gates internals only the main crate's own code can see, `tokio-test` is an independent public API for consumers).

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [Cargo Book — Features](https://doc.rust-lang.org/cargo/reference/features.html) | Official reference | current, 2026 | Primary source for additive-feature rule, unification statement, mutually-exclusive-feature guidance, `required-features`, default-feature hazards. |
| [Cargo Book — Resolver](https://doc.rust-lang.org/cargo/reference/resolver.html) | Official reference | current, 2026 | Primary source for v1/v2/v3 feature-unification differences, dev-dependency unification rule, virtual-workspace resolver placement — the load-bearing section of this whole topic. |
| [Cargo Book — Cargo Targets](https://doc.rust-lang.org/cargo/reference/cargo-targets.html) | Official reference | current, 2026 | Primary source for `required-features` field scope (`bin`/`bench`/`test`/`example`, not `lib`) and integration-vs-unit test target definitions. |
| [Cargo Book — `cargo test`](https://doc.rust-lang.org/cargo/commands/cargo-test.html) | Official command reference | current, 2026 | Primary source for the test-binary working-directory guarantee (package root) and `CARGO_BIN_EXE_<name>`. |
| [Rust Reference — Conditional compilation](https://doc.rust-lang.org/reference/conditional-compilation.html) | Official language reference | current, 2026 | Primary source for the exact `cfg(test)` semantics (`--test` flag, per-compilation-unit) underpinning §1. |
| [tokio `Cargo.toml`](https://github.com/tokio-rs/tokio/blob/master/tokio/Cargo.toml) | Production source, GitHub | 2026 snapshot | Primary source: exact `test-util = ["rt", "sync", "time"]` feature definition. |
| [tokio `src/macros/cfg.rs`](https://github.com/tokio-rs/tokio/blob/master/tokio/src/macros/cfg.rs) | Production source, GitHub | 2026 snapshot | Primary source: proves tokio's `test-util` gating is plain `cfg(feature = "test-util")`, not the `any(test, ...)` join — the canonical counter-example to a common assumption. |
| [signalapp/libsignal `rust/net/src/auth.rs`](https://github.com/signalapp/libsignal/blob/main/rust/net/src/auth.rs) | Production source, GitHub | 2026 snapshot | Primary source: real `#[cfg_attr(any(test, feature = "test-util"), derive(Default))]` usage in a shipping security product. |
| [signalapp/libsignal `rust/net/src/chat.rs`](https://github.com/signalapp/libsignal/blob/main/rust/net/src/chat.rs) | Production source, GitHub | 2026 snapshot | Primary source: full pattern in one file — `test_support` module, `visibility::make(pub)` gated by feature, plain `cfg(test)` coexisting. |
| [n0-computer/iroh `iroh-relay/src/tls.rs`](https://github.com/n0-computer/iroh/blob/main/iroh-relay/src/tls.rs) | Production source, GitHub | 2026 snapshot | Primary source: concrete case where a `test-util`-style leak has a security consequence (disabled TLS verification), motivating why the leak (§3) matters and isn't cosmetic. |
| [erebe/wstunnel `CONTRIBUTING.md`](https://github.com/erebe/wstunnel/blob/main/CONTRIBUTING.md) | Production project contributor docs, GitHub | 2026 snapshot | Primary source: documented, real `--all-features` failure from `aws-lc-rs` vs `ring` mutual exclusion via `jsonwebtoken` — grounds §4/§11 in an actual incident, not a hypothetical. |
| [taiki-e/cargo-hack](https://github.com/taiki-e/cargo-hack) | Tool README, GitHub | 2026 snapshot | Primary source for `--each-feature`, `--feature-powerset`, `--depth`, `--group-features`, `--exclude-features` semantics. |
| [nextest — Filtersets](https://nexte.st/docs/filtersets/) | Official tool docs | 2026 | Primary source for the filterset DSL used to select test tiers by name/package/dependency. |
| [nextest — Test groups](https://nexte.st/docs/configuration/test-groups/) | Official tool docs | 2026 | Primary source for `.config/nextest.toml` `[test-groups]` / `max-threads` syntax and version history (0.9.48, 0.9.90, 0.9.133). |
| [nextest — Retries](https://nexte.st/docs/features/retries/) | Official tool docs | 2026 | Primary source for retry/backoff/jitter/`flaky-result` configuration used to tier a flaky network-dependent suite. |
| [nextest — JUnit](https://nexte.st/docs/machine-readable/junit/) | Official tool docs | 2026 | Primary source for `[profile.ci.junit]` config and flaky-test JUnit markers. |
| [docs.rs — mockall](https://docs.rs/mockall/latest/mockall/) | Official crate docs | 2026 | Primary source for mockall's documented hard limits (generics, associated types, static-method global expectations). |
| [asomers/mockall README](https://github.com/asomers/mockall) | Tool README, GitHub | 2026 snapshot | Primary source for the baseline `#[cfg_attr(test, automock)]` gating pattern. |
| [docs.rs — faux](https://docs.rs/faux/latest/faux/) | Official crate docs | 2026 | Primary source for faux's struct-only/public-method-only mocking philosophy and its explicit dev-dependency containment statement. |
| [LukeMathWalker/wiremock-rs](https://github.com/LukeMathWalker/wiremock-rs) | Tool README, GitHub | 2026 snapshot | Primary source for the async HTTP-mock-server API used at the HTTP-client boundary. |
| [alexliesenfeld/httpmock](https://github.com/alexliesenfeld/httpmock) | Tool README, GitHub | 2026 snapshot | Primary source, sync+async HTTP mock server alternative to wiremock-rs. |
| [matklad — "Delete Cargo Integration Tests"](https://matklad.github.io/2021/02/27/delete-cargo-integration-tests.html) | Practitioner blog, author is a former Rust/rust-analyzer/Cargo-adjacent maintainer | 2021, still current guidance in 2026 | Measured (not anecdotal) compile-time/artifact-size case for consolidating `tests/*.rs` binaries, directly informing the tiering trade-off in §7. |

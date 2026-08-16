---
title: Cargo Workspaces and When to Split into Crates
topic: rust-type-architecture
agent: workspace-and-crate-splitting-researcher
model: sonnet
date_researched: 2026-08
sources_count: 18
scope: >
  Covers Cargo workspace mechanics (inheritance, resolver v2/v3, feature unification),
  criteria and canonical layouts for splitting a Rust CLI into multiple crates, the cost
  side of splitting (publish order, semver surface, workspace-hack), and what real-world
  large Rust projects (cargo, tokio, ripgrep, rust-analyzer, uv) actually do. Does NOT
  cover general Rust module-system mechanics (`mod`/`pub(crate)` visibility) except where
  it interacts with crate boundaries, and does not cover non-Cargo build systems (Bazel/Buck2).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Why split a crate: the criteria](#1-why-split-a-crate-the-criteria)
   2. [Measured compile-time evidence](#2-measured-compile-time-evidence)
   3. [Canonical splits for a CLI tool](#3-canonical-splits-for-a-cli-tool)
   4. [Cargo workspace mechanics](#4-cargo-workspace-mechanics)
   5. [Feature unification hazards](#5-feature-unification-hazards)
   6. [workspace-hack / cargo-hakari](#6-workspace-hack--cargo-hakari)
   7. [Costs of splitting: publish order, lockstep, churn](#7-costs-of-splitting-publish-order-lockstep-churn)
   8. [Public-API surface across crates](#8-public-api-surface-across-crates)
   9. [Real-world layouts: cargo, tokio, ripgrep, rust-analyzer, uv, deno](#9-real-world-layouts-cargo-tokio-ripgrep-rust-analyzer-uv-deno)
   10. [Anti-patterns](#10-anti-patterns)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- A crate boundary is a **compilation unit, a semver boundary, and a feature-flag boundary** simultaneously — split only when you want all three, not just one.
- Splitting for compile-time parallelism is real but has a floor: one team turned a 100k-line program into 1,106 crates and cut compile time from ~27 min to ~2.5 min (≈10x), but even at 128 cores the wall-clock was 7x the theoretical minimum, showing per-crate overhead (metadata, linking, dep-graph walking) doesn't vanish ([Feldera](https://www.feldera.com/blog/cutting-down-rust-compile-times-from-30-to-2-minutes-with-one-thousand-crates)).
- rust-analyzer (≈200k LOC) uses a **flat** `crates/*` layout, one level deep, no hierarchy — matklad argues hierarchical crate trees rot because Cargo's crate namespace is flat and a tree layout invents a second, inconsistent hierarchy on top of it ([matklad](https://matklad.github.io/2021/08/22/large-rust-workspaces.html)).
- Tokio went the **opposite direction from crate-per-module**: it deliberately consolidated code into fewer, larger crates (`tokio`, `tokio-util`, `tokio-stream`, `tokio-macros`, `tokio-test`) rather than one-crate-per-feature, because cross-crate version coordination and user confusion outweighed the parallelism win ([rust-unofficial patterns](https://rust-unofficial.github.io/patterns/patterns/structural/small-crates.html)).
- `[workspace.dependencies]`, `[workspace.package]`, and `[workspace.lints]` (stable since Rust 1.64, lints since 1.74) let you declare a dependency/version/lint-set once and inherit it per-member with `foo.workspace = true` — this is the mechanical fix for version drift across crates in one workspace ([Cargo Book: Workspaces](https://doc.rust-lang.org/cargo/reference/workspaces.html)).
- `[workspace.lints]` is **not implicitly inherited** — every member must opt in with `[lints] workspace = true`, or it silently gets no lints ([Cargo Book: Workspaces](https://doc.rust-lang.org/cargo/reference/workspaces.html)).
- Resolver v2 (default for edition 2021) stops unifying features across target-cfg, build-dependency/proc-macro, and dev-dependency boundaries; resolver v3 (default for edition 2024, needs Rust ≥1.84) additionally defaults `resolver.incompatible-rust-versions` to `fallback`, preferring MSRV-compatible dependency versions ([Cargo Book: Resolver](https://doc.rust-lang.org/cargo/reference/resolver.html)).
- Feature unification is still **workspace-wide** across whatever set of packages a single `cargo build`/`check` invocation touches — a `no_std` member built alongside a `std` member in the same invocation can get `std` features leaked in; the only fix is separate invocations, not a resolver flag ([Cargo Book: Resolver](https://doc.rust-lang.org/cargo/reference/resolver.html)).
- `cargo-hakari` workspace-hack crates fix a specific pathology: a shared dependency (e.g. `syn`) rebuilding — and invalidating everything downstream — every time some workspace member's invocation changes its feature set; hakari reports up to 100x speedup on individual commands and ~1.7x cumulative on workspaces with hundreds of third-party deps ([hakari docs](https://docs.rs/cargo-hakari/latest/cargo_hakari/about/index.html)).
- Publish/version tooling (`release-plz`, `cargo-workspaces`) resolves cross-crate publish order from the dependency graph automatically — you do not hand-sequence `cargo publish` calls in a multi-crate workspace ([release-plz docs](https://release-plz.dev/docs/usage/release)).
- A crate that is both path-linked in-workspace and published to crates.io must declare `{ path = "...", version = "..." }` together — path-only deps cannot be published, and Cargo uses the path locally and falls back to the registry version once published ([Cargo Book: Specifying Dependencies](https://doc.rust-lang.org/cargo/reference/specifying-dependencies.html)).
- If your public API exposes a dependency's types (e.g. a trait from `rand` in a function signature), **re-export that dependency crate itself** (`pub use rand;`) — otherwise every major bump of the hidden dependency silently forces a major bump of yours, and callers hit baffling "two versions of the same trait" errors ([Effective Rust, Item 24](https://effective-rust.com/re-export.html)).
- Adding a plain `use` or a private item next to a `pub use foo::*;` glob re-export can **silently shadow and remove** a previously-public name — this is a semver break that neither the compiler nor most test suites catch ([predr.ag](https://predr.ag/blog/breaking-semver-in-rust-by-adding-private-type-or-import/)).
- `cargo-semver-checks` diffs rustdoc JSON against the last published version and flags API changes inconsistent with the version bump you're about to publish (all lints are constructive proof, no false positives) — wire it into CI before publish, not after ([cargo-semver-checks project goals](https://rust-lang.github.io/rust-project-goals/2026/cargo-semver-checks.html)).
- The `xtask` pattern (a plain binary crate invoked via `.cargo/config.toml` alias, e.g. `cargo xtask codegen`) is the idiomatic way to add project automation in Rust instead of Make/shell — used by rust-analyzer, Cargo itself, and others, because it's cross-platform and can depend on arbitrary crates ([rust-analyzer xtask docs](https://rust-lang.github.io/rust-analyzer/xtask/index.html)).
- Real large workspaces (uv: 100+ crates, `resolver = "2"`, edition 2024; rust-analyzer: ~32 crates; ripgrep: 10 crates) all use `[workspace.dependencies]`/`[workspace.package]` inheritance and a flat `crates/*` layout — this is now the default convention, not an edge case (uv, rust-analyzer, ripgrep `Cargo.toml`, fetched directly).
- Do not split a crate speculatively "for reuse later" or "one crate per module" — crate boundaries cost real compile/link/version overhead and only pay off when there is an actual reuse consumer, a real compile-time bottleneck, or a real need to gate a dependency/feature ([rust-unofficial patterns: Prefer Small Crates](https://rust-unofficial.github.io/patterns/patterns/structural/small-crates.html)).

## Findings

### 1. Why split a crate: the criteria

Six legitimate reasons to draw a crate boundary, each independently sufficient — but the split should be motivated by at least one, not by "it felt too big":

1. **Compile-time parallelism.** Cargo launches one `rustc` process per crate; crates with no dependency edge between them build concurrently. Splitting a monolith increases the number of independently-buildable units, letting `cargo build -j N` use more cores simultaneously ([Cargo Book: Resolver](https://doc.rust-lang.org/cargo/reference/resolver.html); [rust-unofficial patterns](https://rust-unofficial.github.io/patterns/patterns/structural/small-crates.html)).
2. **Incremental-rebuild isolation.** A crate is also rustc's unit of re-typechecking. If `core` logic changes rarely and `cli` argument parsing changes every commit, splitting means editing `cli` never re-typechecks `core`.
3. **Semver boundary.** A crate has one version number. If "the wire protocol / schema" needs to evolve independently of "the CLI UX," they need separate crates with separate version numbers, or every schema-only patch forces a CLI major bump (or vice versa) ([Cargo Book: SemVer](https://doc.rust-lang.org/cargo/reference/semver.html)).
4. **Reuse.** Only split for reuse when there is an actual second consumer (another binary in the same workspace, or an external publish target) — not a hypothetical future one.
5. **Testability / test-surface isolation.** A `-testsupport` or fixture crate lets integration tests in multiple downstream crates share fixtures without those fixtures leaking into the production dependency graph (they land only in `[dev-dependencies]`).
6. **Feature/dependency isolation.** If one part of the codebase needs a heavy dependency (e.g. an OCI HTTP client) that another part (e.g. a pure-schema validator) must never pull in — for embedding, for a `no_std` target, or just to keep `cargo tree` sane — that's a crate boundary, because Cargo features are per-crate, and workspace-wide feature unification means you cannot "turn off" a feature for one workspace member while another member is being built in the same invocation ([Cargo Book: Resolver](https://doc.rust-lang.org/cargo/reference/resolver.html)).
7. **Publishability.** A crate you intend to publish to crates.io independently (a client library others can depend on) must be its own crate — you cannot publish "part of" a crate.

Two forces argue against splitting and must be weighed against the above:

- **Dependency-graph churn and version lockstep** (see §7).
- **LTO loss.** The compiler does not perform cross-crate link-time optimization by default; two small crates can run slower than one large one unless you turn on `lto = true` / `codegen-units = 1` in the release profile ([rust-unofficial patterns](https://rust-unofficial.github.io/patterns/patterns/structural/small-crates.html)).

### 2. Measured compile-time evidence

**Feldera case study (2025).** A ~100k-line generated Rust program compiled in 25–45 minutes as a single crate. The team modified their code generator to emit ~1,106 crates (one per dataflow operator, hashed names), each depending on the ones it needs, pulled together by one top-level `main` crate. Result: 1,617.77s → 150.24s of `rustc` time, a ~10x speedup, using full parallelism across 128 threads. Caveat explicitly called out by the authors: even with 128 threads fully utilized, wall time (150s) was ~7x the naive theoretical minimum (25min ÷ 128 ≈ 12s) — attributed to per-crate overhead (cache contention, filesystem I/O, metadata duplicated per crate) that does not shrink linearly with crate count ([Feldera blog](https://www.feldera.com/blog/cutting-down-rust-compile-times-from-30-to-2-minutes-with-one-thousand-crates)). Read this as evidence that *splitting has diminishing, then negative, returns past a point* — not as "more crates is strictly better."

**cargo-hakari / workspace-hack (guppy team, Facebook-era, still maintained).** On workspaces with several hundred third-party dependencies, adding a workspace-hack crate (which pins the union of every feature-set combination any workspace member could trigger for a shared dependency) yields up to 100x speedup on individual `cargo check`/`build` invocations, ~1.7x cumulative across a full workspace build. The mechanism being fixed: without a workspace-hack, a dependency like `syn` gets rebuilt — and everything depending on it invalidated — every time a *different* feature combination is requested by a *different* workspace member in a *different* invocation ([hakari `about` docs](https://docs.rs/cargo-hakari/latest/cargo_hakari/about/index.html)).

**rustc-level parallelism (context, not crate-splitting per se).** Independent of crate count, rustc itself parallelizes within a crate via codegen units (up to 16 by default in non-incremental builds) and, on nightly/newer stable, a parallel front-end. A single-CGU build measured 9.7s vs 4.5s multi-CGU on one benchmark — i.e. roughly half the wall time from intra-crate parallelism alone, before any crate-splitting ([Nethercote, "Back-end parallelism in the Rust compiler"](https://nnethercote.github.io/2023/07/11/back-end-parallelism-in-the-rust-compiler.html); [Rust Blog, "Faster compilation with the parallel front-end in nightly"](https://blog.rust-lang.org/2023/11/09/parallel-rustc/)). Practical implication: tune `codegen-units`/parallel-frontend settings before reaching for a crate split purely for parallelism — it's cheaper.

### 3. Canonical splits for a CLI tool

For a clap-based, tokio-async, OCI-registry CLI (the OCX/Grimoire shape), the recurring pattern across real projects is:

| Crate | Role | Depends on | Published? |
|---|---|---|---|
| `<name>-core` (or just the crate the CLI wraps, e.g. `ripgrep`'s `grep`) | Domain logic: registry client, cache, lockfile, extraction, verification. No `clap`, no `main`. | stdlib + narrow deps (tokio, reqwest, serde) | Often yes — this is the reusable library |
| `<name>` (bin) | `clap` definitions, arg parsing, `main.rs`, wires `core` to stdout/exit codes | `<name>-core` | The binary release artifact |
| `<name>-schema` | Serde types for on-disk/wire formats (lockfile, manifest, registry API) shared by core, plugins, and possibly external consumers | serde only | Yes, if third parties need to read the format |
| `<name>-plugin` / `-shim` | Trait(s) a plugin/extension implements; kept dependency-light so plugin authors don't pull in the whole CLI | schema crate only | Yes, if plugins are external |
| `xtask` | Repo automation (codegen, release, dist packaging) — a plain bin crate, not shipped | whatever it needs | Never — internal only, `publish = false` |
| `<name>-test-support` / `testsupport` | Shared fixtures, temp-dir helpers, mock registry server for integration tests | test-only deps (tempfile, wiremock) | Never — `[dev-dependencies]` only |
| `<name>-macros` | proc-macro crate (only if you actually have a proc-macro; a proc-macro crate is Cargo-mandatory to be separate — `proc-macro = true` requires its own crate) | syn/quote | Yes if the main crate is published |

This mirrors rust-analyzer's split (`hir`, `ide`, `syntax`, `base-db`, ... all under flat `crates/*`, plus `xtask/`) and ripgrep's split (`globset`, `grep`, `ignore`, `printer`, `searcher`, `matcher`, `pcre2`, `regex`, `cli`, plus the `rg` binary at `crates/core`) — domain logic decomposed by *capability*, with the binary crate as a thin composition root ([rust-analyzer Cargo.toml](https://raw.githubusercontent.com/rust-lang/rust-analyzer/master/Cargo.toml); ripgrep `Cargo.toml`, fetched directly).

The proc-macro constraint is a hard Cargo rule, not a style choice: a crate with `proc-macro = true` can only export proc-macro items, so any non-macro helpers used by the macro must live in a sibling crate — this is *why* `-macros` crates exist as a pattern, not a preference.

Integration-test crates: Cargo already treats every file under `tests/` as its own compiled binary/crate implicitly; a dedicated "integration-test crate" as a workspace member is only needed when tests must be shared *across* multiple binary/lib crates, which is what the `test-support` crate is for.

### 4. Cargo workspace mechanics

**Inheritance (stable since Rust 1.64; `[workspace.lints]` since 1.74).** Declare once at the workspace root, inherit per-member with `.workspace = true`:

```toml
# root Cargo.toml
[workspace]
members = ["crates/*"]
resolver = "3"

[workspace.package]
version = "0.4.0"
edition = "2024"
license = "MIT OR Apache-2.0"
repository = "https://github.com/org/repo"

[workspace.dependencies]
serde = { version = "1", features = ["derive"] }
tokio = { version = "1", features = ["rt-multi-thread"] }

[workspace.lints.rust]
unsafe_code = "forbid"
```

```toml
# crates/core/Cargo.toml
[package]
name = "myproj-core"
version.workspace = true
edition.workspace = true
license.workspace = true

[dependencies]
serde = { workspace = true, features = ["rc"] }   # additive with root features
tokio.workspace = true

[lints]
workspace = true   # NOT automatic — must be declared per member
```

Supported inheritable `workspace.package` keys: `version`, `authors`, `categories`, `description`, `documentation`, `edition`, `exclude`, `homepage`, `include`, `keywords`, `license`, `license-file`, `publish`, `readme`, `repository`, `rust-version` ([Cargo Book: Workspaces](https://doc.rust-lang.org/cargo/reference/workspaces.html)).

**Virtual vs root-package manifests.** A workspace root `Cargo.toml` with no `[package]` section is a *virtual manifest* — it must declare `resolver` explicitly (it has no edition to infer a default from) and every member is a peer. A root `Cargo.toml` that also has `[package]` makes the root itself a workspace member (used when the "main" crate lives at the repo root, e.g. Cargo's own repo) ([Cargo Book: Workspaces](https://doc.rust-lang.org/cargo/reference/workspaces.html)).

**`members` vs `default-members`.** `members` (glob-capable, e.g. `"crates/*"`) defines workspace membership; `default-members` narrows what a bare `cargo build` run from the workspace root actually builds when no `-p`/`--workspace` flag is given — useful to exclude `xtask` or fuzz/bench-only crates from the default build ([Cargo Book: Workspaces](https://doc.rust-lang.org/cargo/reference/workspaces.html)).

**Resolver versions.** `"1"` is legacy (pre-2021-edition default). `"2"` is edition-2021 default. `"3"` is edition-2024 default, requires Rust ≥1.84, and changes `resolver.incompatible-rust-versions` from `allow` to `fallback` — meaning the resolver now prefers a dependency version whose declared `rust-version` is ≤ your own MSRV, rather than blindly picking the newest semver-compatible version and leaving you to discover the MSRV break at build time ([Cargo Book: Resolver](https://doc.rust-lang.org/cargo/reference/resolver.html)). For a workspace targeting edition 2024, set `resolver = "3"` explicitly at the workspace root if the root manifest is virtual (edition alone doesn't imply it for virtual manifests until you add a `[workspace]`-level edition — check with `cargo metadata`).

**path + version dependencies.** A workspace crate that is also published must be declared with both:

```toml
[dependencies]
myproj-core = { path = "../core", version = "0.4" }
```

Cargo uses the local `path` copy while developing in the workspace, and would use the registry `version` if this manifest were built standalone (e.g. as a dependency of an external project) after publishing. Path-only dependencies cannot be published — `cargo publish` rejects a manifest containing a path-only entry with no `version` ([Cargo Book: Specifying Dependencies](https://doc.rust-lang.org/cargo/reference/specifying-dependencies.html)).

**Cyclic dev-dependencies.** A dev-dependency cycle (crate A's tests depend on crate B, crate B's tests depend on crate A) is allowed because dev-dependencies are excluded from the dependency graph used for the *build* — only `[dependencies]` cycles are forbidden ([Cargo Book: Specifying Dependencies](https://doc.rust-lang.org/cargo/reference/specifying-dependencies.html)).

### 5. Feature unification hazards

Resolver v2 fixed three specific over-unification bugs relative to v1 (target-cfg deps, build-dep/proc-macro deps, dev-deps no longer leak their extra features into the normal-dependency build of the same package) — but it did **not** fix workspace-wide unification: when you run `cargo build --workspace` (or pass multiple `-p` flags), Cargo still unions the feature requirements of every touched member for any dependency shared between them. A `no_std` member built in the same invocation as a `std`-using member can end up with `std` linked in via a shared dependency. The only mitigation is separate `cargo` invocations per member group, not a manifest setting ([Cargo Book: Resolver](https://doc.rust-lang.org/cargo/reference/resolver.html)).

```toml
# Hazard example
[dependencies]
serde = { version = "1.0", default-features = false }
[dev-dependencies]
serde = { version = "1.0", features = ["std"] }
```
Building the lib normally: no `std` feature. Running `cargo test`/`cargo build --all-targets`: `std` gets unified in for the lib build too, because the dev-dependency is now "in the build."

### 6. workspace-hack / cargo-hakari

Root cause: a shared dependency's *feature set* is a function of the union of everything depending on it in the current build. Two different workspace members requesting slightly different feature sets for `syn` (say) means `syn`, and everything depending on it, gets rebuilt from scratch depending on which subset of the workspace you happen to be building — this "feature-set thrash" is invisible in the manifest and only shows up as unexplained rebuild churn.

`cargo hakari` (crate: `cargo-hakari`) automates a **workspace-hack crate**: a manifest containing the union of every feature combination `guppy`'s build simulation determines any workspace member could ever request for each shared dependency, added as a dependency of *every* workspace member. This pins the feature set workspace-wide so it never varies invocation-to-invocation. Because a patch-version bump of any dependency can silently add/remove features/transitive deps, hakari requires `Cargo.lock` to be checked in even for pure-library workspaces (normally not required) so the hack crate's contents stay correct ([hakari `about` docs](https://docs.rs/cargo-hakari/latest/cargo_hakari/about/index.html)). This is a workspace-scale optimization — not worth adopting below "several hundred third-party dependencies," per the docs' own framing.

### 7. Costs of splitting: publish order, lockstep, churn

- **Dependency-graph churn.** Every internal crate boundary is a new node `cargo tree`/`cargo metadata` has to walk, and a new place a version mismatch (`path` vs `version` drift, see §4) can silently break `cargo publish` even though `cargo build` inside the workspace was fine.
- **Version lockstep vs independent versioning** is a real design fork: some workspaces pin all internal crates to one shared version (`workspace.package.version`, bumped together) to avoid combinatorial compatibility matrices; others (e.g. uv's ~100 crates) run near-lockstep with most crates at the same `0.0.x` internal version and only the user-facing `uv` binary crate versioned independently ([uv `Cargo.toml`](https://raw.githubusercontent.com/astral-sh/uv/main/Cargo.toml), fetched directly). Pick lockstep unless you have a concrete case for independent crate versions (i.e., an externally-consumed library crate with its own compatibility promise).
- **Publish order** must respect the dependency DAG — crates publishable to crates.io must have every path-dependency already published at a matching version. Both `cargo-workspaces` and `release-plz` compute this order from the graph automatically; `release-plz` additionally drives it from conventional-commit history and `cargo-semver-checks` output, and creates one git tag per package (`<package>-v<version>`) rather than one tag per repo ([release-plz docs](https://release-plz.dev/docs/usage/release)). Do not hand-sequence `cargo publish` calls for more than a couple of crates — this is exactly the kind of ordering bug that's mechanical to get wrong.
- **Refactor friction.** Moving a function across a crate boundary turns a private-visibility change into a public-API change (the function must become `pub` to cross the boundary, and now needs a semver review) — this is a real, recurring tax that plain in-crate `mod` reorganization doesn't have.

### 8. Public-API surface across crates

**Re-export dependencies that appear in your public API.** If a function signature exposes a type/trait from a dependency, re-export the dependency itself (`pub use rand;`), not just the specific type. Otherwise a version bump of the *hidden* dependency is an invisible-but-real breaking change for your callers, who hit "expected `Trait`, found `Trait`" errors from two different semver-incompatible copies of the same crate ([Effective Rust, Item 24](https://effective-rust.com/re-export.html)):

```rust
// Wrong: caller can't name the Rng type your API needs without guessing
// which version of `rand` to depend on.
pub fn pick_number_with<R: rand::Rng>(rng: &mut R, n: usize) -> usize { ... }

// Right: re-export the dependency so callers use YOUR copy of it.
pub use rand;
pub fn pick_number_with<R: rand::Rng>(rng: &mut R, n: usize) -> usize { ... }
```

**Glob re-export shadowing is a silent semver break.** `pub use inner::*;` followed by *any* later `use` or private item of the same name in the same scope makes Rust silently prefer the non-glob name and drop the glob-imported one from the public surface — with no compiler warning, and usually no test catching it, because the removed item simply becomes unreachable rather than causing an error at the removal site ([predr.ag](https://predr.ag/blog/breaking-semver-in-rust-by-adding-private-type-or-import/)):

```rust
// v1.0: `pub use inner::Foo;` reachable as `mycrate::Foo`
pub use inner::*;   // exports Foo

// v1.1: adding this PRIVATE item silently removes `Foo` from the public API
struct Foo;          // shadows the glob-exported `inner::Foo` — BREAKING, no warning
```

**Facade re-export pattern.** Keep source organized internally by concept (`inner::db`, `inner::net`), but re-export the public surface flat at the crate root with `#[doc(inline)] pub use inner::db::Thing;` so rustdoc inlines the item into the crate-root docs instead of showing an opaque "Re-exports" block. Do **not** `#[doc(inline)]` re-exports of `std` or third-party types — leave those as visible re-export blocks so readers know the type is external ([search-derived guidance, Microsoft Pragmatic Rust Guidelines / rustdoc re-export conventions](https://microsoft.github.io/rust-guidelines/guidelines/docs/)).

**Verification tool: `cargo-semver-checks`.** Diffs the current crate's rustdoc JSON against the last-published version on crates.io, detects the version-bump kind you're making (patch/minor/major) from `Cargo.toml`, and reports any API change inconsistent with that bump. Lints are "constructive proof" — the project's stated design goal is zero false positives. Used at Amazon and Google internally; ships as a GitHub Action (`obi1kenobi/cargo-semver-checks-action`) and is in the process of being pulled into `cargo` itself as a built-in subcommand ([cargo-semver-checks project goals, 2026](https://rust-lang.github.io/rust-project-goals/2026/cargo-semver-checks.html)). Run `cargo semver-checks` in CI before every publish of any crate that ships past `0.x` with a stability promise; below `0.x` still worth running since minor bumps are your only signal.

### 9. Real-world layouts: cargo, tokio, ripgrep, rust-analyzer, uv, deno

All fetched directly from source `Cargo.toml` files (August 2026 state):

- **tokio** (`tokio-rs/tokio`): `resolver = "2"`. Members: `tokio`, `tokio-macros`, `tokio-test`, `tokio-stream`, `tokio-util`, plus internal-only `benches`, `examples`, `stress-test`, `tests-build`, `tests-integration`. No `[workspace.dependencies]` table — instead uses `[patch.crates-io]` to redirect the five published crates to their local workspace paths during development. Deliberately *few*, capability-scoped crates rather than one per module — the split axis is "does this need an independent release cadence / optional dependency footprint" (macros need proc-macro isolation; util/stream are opt-in extras many users don't need) ([tokio `Cargo.toml`](https://raw.githubusercontent.com/tokio-rs/tokio/master/Cargo.toml)).
- **ripgrep** (`BurntSushi/ripgrep`): edition 2024, MSRV 1.96. 10 members (`globset`, `grep`, `cli`, `index`, `matcher`, `pcre2`, `printer`, `regex`, `searcher`, `ignore`) plus the `rg` binary crate itself. Split axis: each crate is an independently reusable *capability* (glob matching, ignore-file parsing, output printing) that other tools besides `rg` plausibly want — several of these crates (`ignore`, `globset`) are widely depended on outside ripgrep itself, i.e. the split was reuse-driven and validated by actual external consumers ([ripgrep `Cargo.toml`](https://raw.githubusercontent.com/BurntSushi/ripgrep/master/Cargo.toml)).
- **rust-analyzer**: `resolver = "2"`, edition 2024, MSRV 1.95. ~32 crates under flat `crates/*`, plus `xtask/` and `lib/*` for a couple of vendored/generated helper crates. Uses `[workspace.lints.rust]` (deny elided lifetimes, unreachable-pub, etc.) and `[workspace.lints.clippy]` (correctness/perf = deny, complexity/style = warn) inherited workspace-wide, plus per-dependency `[profile.dev.package.*] opt-level = 3` overrides for hot dependencies like `salsa`/`rowan` to keep dev-build test iteration fast ([rust-analyzer `Cargo.toml`](https://raw.githubusercontent.com/rust-lang/rust-analyzer/master/Cargo.toml); [matklad, "Large Rust Workspaces"](https://matklad.github.io/2021/08/22/large-rust-workspaces.html)).
- **uv** (`astral-sh/uv`): `resolver = "2"`, edition 2024, MSRV 1.95.0. `members = ["crates/*"]` with explicit `exclude` for a nightly-only trampoline crate and a `scripts` dir that isn't a crate at all. 100+ crates, near-lockstep internal versioning (`0.0.71` for internals, independent version for the user-facing `uv` binary). Full `[workspace.lints]` with clippy pedantic + curated allow-list, and `[dependencies]` — not just `[workspace.dependencies]` — carefully pinned per external crate at the workspace root ([uv `Cargo.toml`](https://raw.githubusercontent.com/astral-sh/uv/main/Cargo.toml)).
- **matklad's stated threshold**: flat `crates/*`, one level deep, works "for projects in between ten thousand and one million lines of code." Folder name == crate name, unpublished internal crates use `version = "0.0.0"`, project automation lives in a dedicated `xtask` crate rather than shell scripts ([matklad](https://matklad.github.io/2021/08/22/large-rust-workspaces.html)).

Pattern across all four real large projects: **flat membership glob (`crates/*`), resolver `"2"` or `"3"`, workspace-level dependency/lint inheritance, and crate count driven by capability boundaries, not by module count.** None of them use a deep/nested crate directory hierarchy.

### 10. Anti-patterns

- **Crate-per-module.** Turning every `mod foo;` into its own crate multiplies manifest/version/publish overhead without a compile-time, semver, or reuse justification — Tokio explicitly reversed an earlier tendency toward finer splitting for this reason ([rust-unofficial patterns](https://rust-unofficial.github.io/patterns/patterns/structural/small-crates.html)).
- **Splitting before there's a reuse or compile-time reason.** "This might be reusable someday" is not a reason; a second real consumer (in-workspace or external) is.
- **A generic `utils`/`common`/`helpers` crate.** This is a dependency-graph magnet: everything depends on it, it depends on nothing coherent, and it becomes a de facto second `core` with none of the semver discipline of a real one. If you find yourself reaching for it, the actual fix is usually to push the "util" function into whichever domain crate owns the concept it's about.
- **Circular workspace/crate dependencies.** Forbidden for `[dependencies]` (Cargo will refuse to build); the only legal cycle is via `[dev-dependencies]`, which are excluded from the build graph. A design that "needs" a `[dependencies]` cycle is a sign the two crates are actually one crate.
- **Hierarchical crate directories** (`crates/db/postgres/`, `crates/db/sqlite/` nested under a `db/` non-crate folder). Cargo's crate namespace is flat regardless of directory nesting, so the directory tree becomes a second, Cargo-invisible hierarchy that inevitably drifts from reality ([matklad](https://matklad.github.io/2021/08/22/large-rust-workspaces.html)).
- **Splitting purely for compile-time parallelism past the point of diminishing returns**, without a semver/reuse/feature-isolation reason riding along — see the Feldera 7x-overhead-vs-theoretical-minimum caveat (§2). More crates is not free.

## Normative guidance candidates

1. **Every crate split must be justified by ≥1 of: independent semver need, an actual second consumer, a real compile-time bottleneck (profiled, not assumed), or a hard dependency-isolation need (feature/`no_std`/plugin boundary).** Rationale: crate boundaries have real, measured overhead (§2, §7) and speculative splits (`utils`, crate-per-module) are the dominant anti-pattern (§10). Verify: for a new workspace member added in a PR, the PR description or commit message must name which of the four reasons applies; a reviewer greps the diff for a new `[[bin]]`/`[lib]` manifest and checks the stated reason is concrete, not "for organization."

2. **Use `[workspace.dependencies]` / `[workspace.package]` / `[workspace.lints]` inheritance; never duplicate a dependency version or lint config across member manifests.** Rationale: version drift across members is how `path`+`version` publish failures happen (§4, §7). Verify: `grep -rn '^\[dependencies\]' crates/*/Cargo.toml` then check no member pins a version string outright for a dep that also appears in root `[workspace.dependencies]` — every member entry should be `name.workspace = true` or `{ workspace = true, features = [...] }`.

3. **Every member's `[lints] workspace = true` must be present explicitly — it is never inherited implicitly.** Rationale: this is a documented, easy-to-miss Cargo footgun (§4). Verify: `for f in crates/*/Cargo.toml; do grep -q 'workspace = true' <(awk '/\[lints\]/,0' "$f") || echo "missing lints inherit: $f"; done`.

4. **Set `resolver = "3"` explicitly at the workspace root once the project is on edition 2024 (Rust ≥1.84); never rely on an implicit resolver default in a virtual-manifest workspace.** Rationale: a virtual manifest has no edition of its own to infer a resolver default from (§4). Verify: `grep -A2 '^\[workspace\]' Cargo.toml | grep resolver`.

5. **A workspace crate that is ever meant to be `cargo publish`-able must declare `{ path = "...", version = "..." }` for every internal dependency, never a bare `path = "..."`.** Rationale: path-only deps cannot be published; Cargo rejects it at publish time, not at build time, so the failure surfaces late (§4). Verify: `cargo publish --dry-run -p <crate>` in CI for every publishable member, plus `grep -rn 'path = "\.\./' crates/*/Cargo.toml` to spot-check missing `version =` siblings.

6. **If a public function/type signature names a type from a dependency, re-export that dependency crate at your crate root (`pub use dep_name;`), not just the individual type.** Rationale: hides otherwise-invisible transitive-major-bump breakage from your users (§8). Verify: for any `pub fn`/`pub struct` whose signature references `external_crate::Type`, check `grep -n "pub use external_crate;" src/lib.rs` exists.

7. **Never place a private item or a bare `use` in the same scope as a `pub use x::*;` glob re-export without checking name overlap.** Rationale: silent shadowing removes public API with no compiler diagnostic and usually no failing test (§8). Verify: `cargo public-api diff <previous-tag>` or `cargo semver-checks` — either will surface the item disappearing from the public surface even though nothing looks "removed" in the diff.

8. **Run `cargo semver-checks` in CI on every crate that is published, gating the merge/publish, not just informing it.** Rationale: it is the only tool that catches the shadowing/re-export/API-surface classes of breakage described in §8, with a stated zero-false-positive design goal. Verify: CI config contains a `cargo semver-checks check-release` (or the GH Action) step whose failure blocks merge/publish for any crate with `publish != false`.

9. **Do not hand-sequence multi-crate `cargo publish` calls; use a tool that computes publish order from the dependency graph** (`release-plz`, `cargo-workspaces`, or `cargo publish --workspace` where applicable). Rationale: publish order must respect the DAG and is exactly the kind of thing that's easy to get subtly wrong by hand once there are more than 2–3 interdependent crates (§7). Verify: repo has a release workflow file invoking one of these tools rather than a hand-written loop of `cargo publish -p ...` lines in a fixed order.

10. **New workspace members go under a flat `crates/*` (or `crates/<name>`) glob, one directory level deep — never nested (`crates/db/postgres/`).** Rationale: Cargo's crate namespace is flat regardless of directory nesting; a nested directory tree is a second, Cargo-invisible hierarchy that drifts (§10; matklad). Verify: `find crates -mindepth 3 -name Cargo.toml` should return nothing.

11. **Reach for a workspace-hack crate (`cargo-hakari`) only once the workspace has "several hundred" third-party dependencies or measurably suffers feature-thrash rebuilds — not by default on a small workspace.** Rationale: it's a real fix for a real problem, but it's overhead (an extra generated crate every member must depend on) not worth paying below that scale (§6). Verify: before adding hakari, run `cargo check -p <memberA>` then `cargo check -p <memberB>` then `cargo check -p <memberA>` again and confirm the first crate actually rebuilds unnecessarily — that's the symptom hakari fixes; if it doesn't reproduce, don't add hakari.

## AI-agent angle

- **Hallucinated/stale `[workspace.dependencies]` syntax.** Models trained on pre-1.64 material propose duplicating full version strings in every member `Cargo.toml`, or invent a nonexistent `[workspace.dependencies.inherit]` table. Check: every member `[dependencies]`/`[dev-dependencies]`/`[build-dependencies]` entry for a crate also present in root `[workspace.dependencies]` should read `name.workspace = true` (or the `{ workspace = true, ... }` form) — `grep -A1 <dep> crates/*/Cargo.toml | grep -c 'workspace = true'` should be nonzero for each.
- **Assuming `[workspace.lints]` auto-applies.** A common wrong pattern: models add `[workspace.lints]` at the root and stop, believing it's inherited automatically — it silently is not. Check: every member manifest has `[lints]\nworkspace = true`.
- **Defaulting to resolver `"1"` behavior mentally** (unifying dev-dependency features into the normal build) when reasoning about "why did this feature get pulled in" — leads to wrong root-cause explanations and wrong fixes (adding `default-features = false` in the wrong place instead of recognizing workspace-wide unification across the specific invocation). Check: reproduce with `cargo tree -e features -p <crate>` before proposing a fix; don't fix from memory of resolver semantics.
- **Recommending crate-per-module splits as "good architecture" by default**, echoing generic "modularity is good" training bias rather than this domain's actual evidence (§2, §10, Tokio's reversal). Check: any PR introducing a new workspace member should be rejected in review unless it satisfies rule 1 above — ask "which of the four reasons, concretely."
- **Fabricating a nonexistent `cargo publish --workspace --dependency-order` flag** (no such flag exists as of this research — publish-order automation lives in third-party tools, not built-in cargo) when asked to publish a multi-crate workspace. Check: `cargo publish --help` has no such flag; the agent must reach for `release-plz`/`cargo-workspaces` or a manual topological script, not a hallucinated cargo flag.
- **Proposing a glob re-export (`pub use inner::*;`) as the default way to flatten a facade crate's API**, without flagging the shadowing hazard from §8, because glob re-exports read as "cleaner" in isolation. Check: any new `pub use ...::*;` in a crate that's already published gets a `cargo semver-checks` run before merge, not just a visual diff review.
- **Writing a `path`-only internal dependency for a crate that's later expected to be published**, because in-workspace development never surfaces the missing `version =` until the actual `cargo publish` attempt. Check: `cargo publish --dry-run -p <crate>` in CI, not just `cargo build`.
- **Mis-scoping `default-members`**, e.g. omitting it entirely so `cargo build` at the workspace root also builds `xtask`/fuzz crates by default, bloating routine build times — models often don't know `default-members` exists and instead solve "build is slow" by proposing a crate split when the real fix is scoping the default build set. Check: `grep default-members Cargo.toml`; if absent and there are non-shipping members (`xtask`, `fuzz`, `benches`), that's the fix to reach for first.

## Contested / evolving

- **Independent per-crate versioning vs lockstep versioning inside one workspace.** No consensus: rust-analyzer and uv both effectively lockstep-version their internal crates (uv pins most internals to the same `0.0.x`), while crates meant for external reuse (ripgrep's `ignore`, `globset`) version independently because they have their own external consumers. The dividing line in current practice (as of 2026) is "does anything outside this workspace depend on this crate directly" — if yes, independent version; if no, lockstep is winning as the lower-overhead default.
- **`cargo-semver-checks` is mid-transition into cargo itself.** As of the 2026H1 Rust Project Goals update it is still a separate `cargo install cargo-semver-checks` tool, actively being adapted for eventual merge into upstream `cargo` as a built-in subcommand; guidance here (install and CI-gate it separately) is the *current* practice and will likely simplify to `cargo semver-check` needing no separate install within this edition's lifetime ([Rust Project Goals 2026](https://rust-lang.github.io/rust-project-goals/2026/cargo-semver-checks.html)).
- **Whether resolver v3's `fallback` MSRV behavior is desirable by default is still debated** — some maintainers want `allow` (get the newest compatible version, fail loudly on MSRV mismatch) rather than v3's default silent-downgrade-to-MSRV-compatible behavior, because it can silently pin you to an old, possibly-vulnerable dependency version without any warning. Current default (edition 2024) is `fallback`; teams that disagree must explicitly set `resolver.incompatible-rust-versions = "allow"` in `.cargo/config.toml`.
- **workspace-hack adoption threshold is a judgment call, not a documented number** — hakari's own docs say "moderately large" / "several hundred third-party dependencies" without a hard cutoff; some teams (smaller workspaces, ~30–50 deps) report the maintenance overhead of the generated crate isn't worth it below that scale, but this is anecdotal, not measured in a primary source found during this research.
- **`xtask` vs `just`/`Makefile.toml` (cargo-make) vs plain shell scripts** for repo automation is still a live stylistic choice across the ecosystem — rust-analyzer/Cargo itself favor `xtask` (pure Rust, cross-platform, can pull crates), but many smaller projects still use `just` or shell for the same job with no clear ecosystem-wide winner as of 2026.

## Sources

| URL | What it is | Date / era | Why it was worth reading |
|---|---|---|---|
| [Cargo Book: Workspaces](https://doc.rust-lang.org/cargo/reference/workspaces.html) | Official docs | Current (Rust ≥1.74 features) | Primary source for `workspace.dependencies`/`package`/`lints` inheritance syntax, virtual vs root manifest, `members`/`default-members` |
| [Cargo Book: Resolver](https://doc.rust-lang.org/cargo/reference/resolver.html) | Official docs | Current (edition 2024 / resolver v3) | Primary source for resolver v1/v2/v3 differences and workspace feature-unification hazard |
| [Cargo Book: SemVer Compatibility](https://doc.rust-lang.org/cargo/reference/semver.html) | Official docs | Current | Primary source for what counts as a major/minor manifest and API change |
| [Cargo Book: Specifying Dependencies](https://doc.rust-lang.org/cargo/reference/specifying-dependencies.html) | Official docs | Current | Primary source for path+version dual-declaration and dev-dependency cycle rules |
| [Feldera: Cutting Down Rust Compile Times From 30 to 2 Minutes With One Thousand Crates](https://www.feldera.com/blog/cutting-down-rust-compile-times-from-30-to-2-minutes-with-one-thousand-crates) | Engineering blog, real case study | 2025 | Only primary source found with concrete measured before/after compile-time numbers for crate splitting at scale, including the diminishing-returns caveat |
| [cargo-hakari `about` module docs](https://docs.rs/cargo-hakari/latest/cargo_hakari/about/index.html) | Official crate docs | Current (0.9.x era) | Primary source for the workspace-hack mechanism and its measured 1.1x–100x / 1.7x cumulative speedup claims |
| [matklad, "Large Rust Workspaces"](https://matklad.github.io/2021/08/22/large-rust-workspaces.html) | Well-known Rust engineer's blog (rust-analyzer author) | 2021, still current guidance | The canonical primary source for flat `crates/*` layout, the 10k–1M LOC applicability window, and why hierarchical crate trees rot |
| [rust-analyzer xtask docs](https://rust-lang.github.io/rust-analyzer/xtask/index.html) | Official project docs | Current | Primary source for the `xtask` pattern as used by a large real workspace |
| [Tokio `Cargo.toml`](https://raw.githubusercontent.com/tokio-rs/tokio/master/Cargo.toml) | Real source code | Fetched 2026-08 | Direct evidence of a large async-runtime workspace's crate split and lack of `workspace.dependencies` (uses `[patch]` instead) |
| [ripgrep `Cargo.toml`](https://raw.githubusercontent.com/BurntSushi/ripgrep/master/Cargo.toml) | Real source code | Fetched 2026-08 | Direct evidence of a reuse-driven, capability-scoped 10-crate CLI split |
| [rust-analyzer `Cargo.toml`](https://raw.githubusercontent.com/rust-lang/rust-analyzer/master/Cargo.toml) | Real source code | Fetched 2026-08 | Direct evidence of workspace-wide lint inheritance and dev-profile dependency opt-level overrides in a ~32-crate workspace |
| [uv `Cargo.toml`](https://raw.githubusercontent.com/astral-sh/uv/main/Cargo.toml) | Real source code | Fetched 2026-08 | Direct evidence of a 100+-crate, near-lockstep-versioned, edition-2024, resolver-2 workspace with full lint inheritance |
| [rust-unofficial Design Patterns: "Prefer Small Crates"](https://rust-unofficial.github.io/patterns/patterns/structural/small-crates.html) | Community-maintained patterns book | Current | Primary source for the advantages/disadvantages list and the Tokio-consolidation counter-example |
| [Effective Rust, Item 24: Re-export dependencies whose types appear in your API](https://effective-rust.com/re-export.html) | Well-regarded Rust book (O'Reilly-published author, David Drysdale) | Current | Primary source for the dependency-re-export semver rule with correct/incorrect code |
| [predr.ag: "Breaking semver in Rust by adding a private type, or by adding an import"](https://predr.ag/blog/breaking-semver-in-rust-by-adding-private-type-or-import/) | Technical blog by a semver/cargo-semver-checks contributor | Current | Primary source for the glob re-export shadowing semver hazard, a non-obvious footgun |
| [Rust Project Goals 2026: cargo-semver-checks](https://rust-lang.github.io/rust-project-goals/2026/cargo-semver-checks.html) | Official Rust project goals doc | 2026 | Primary source for current status/maturity of `cargo-semver-checks` and its path into upstream cargo |
| [release-plz docs: `release` usage](https://release-plz.dev/docs/usage/release) | Official tool docs | Current | Primary source for how automated multi-crate publish tooling actually orders/handles workspace publishing |
| [rust-lang API Guidelines: Interoperability](https://rust-lang.github.io/api-guidelines/interoperability.html) | Official (rust-lang org) API design guidelines | Current | Primary source for cross-crate API design conventions (trait impls, conversions, error types) relevant to facade-crate design |


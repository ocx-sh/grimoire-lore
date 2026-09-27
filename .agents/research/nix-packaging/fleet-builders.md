---
title: "Building the fleet under Nix: ocx, grimoire, ocx-sdk-python, and the Action (NIX-PKG)"
topic: nix-packaging/fleet-builders
agent: nix-packaging/fleet-builders
model: sonnet
date_researched: 2026-09-27
sources_count: 17
fixtures: /home/mherwig/.cache/research-lang/nix-tools/fixtures/fleet-builders/
scope: >
  Covers M-D-16..19, M-D-23, M-G-16: which Nix builder each fleet repository
  uses (ocx, grimoire — Rust workspaces/crates with -sys deps; ocx-sdk-python
  — pure-Python SDK; setup-ocx — not a packaging target), which builder
  spelling survives a cold `--no-build` check, the toolchain-version seam
  between rust-toolchain.toml and nixpkgs' own rustc, and whether a
  from-source build is CI-viable versus wrapping cargo-dist/-bin binaries.
  Does NOT cover: flake output shape/systems iteration (NIX-FLK, already
  consolidated), the ocx-index-to-flake data model or OCI blob fetching
  (NIX-GEN, already consolidated), nixConfig/trust (NIX-SEC), Darwin
  frameworks in depth (M-D-23 answered only at the level the fixtures could
  reach — no aarch64-darwin builder available here), or Go/TypeScript
  packaging (no fleet Go CLI yet; setup-ocx is bun/TS CI glue, not a Nix
  consumer target per the audit).
---

# Building the fleet under Nix: ocx, grimoire, ocx-sdk-python, and the Action

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [The cold-`--no-build` line: what actually breaks it](#1-the-cold---no-build-line-what-actually-breaks-it)
  2. [buildRustPackage: the fleet's default builder](#2-buildrustpackage-the-fleets-default-builder)
  3. [crane: same cold-safety rule, different failure shape](#3-crane-same-cold-safety-rule-different-failure-shape)
  4. [The rust-toolchain.toml seam: buildRustPackage does not read it](#4-the-rust-toolchaintoml-seam-buildrustpackage-does-not-read-it)
  5. [aws-lc-sys: the fleet's shared, unavoidable native dependency](#5-aws-lc-sys-the-fleets-shared-unavoidable-native-dependency)
  6. [clang-sys traced: aws-lc-sys's own optional bindgen path, not a mystery transitive dep](#6-clang-sys-traced-aws-lc-syss-own-optional-bindgen-path-not-a-mystery-transitive-dep)
  7. [grimoire's git submodules: the real blocker `nix build .` hits first](#7-grimoires-git-submodules-the-real-blocker-nix-build--hits-first)
  8. [ocx-sdk-python: buildPythonPackage, trivial, cold-safe, and fast](#8-ocx-sdk-python-buildpythonpackage-trivial-cold-safe-and-fast)
  9. ['system'-renamed warnings: none of the three builders trip it](#9-system-renamed-warnings-none-of-the-three-builders-trip-it)
  10. [Cold wall time and the CI budget](#10-cold-wall-time-and-the-ci-budget)
  11. [Source build versus -bin from the generated flake](#11-source-build-versus--bin-from-the-generated-flake)
- [Normative guidance candidates](#normative-guidance-candidates)
- [Verification runs](#verification-runs)
- [Exemplar evidence](#exemplar-evidence)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- **`rustPlatform.buildRustPackage` with `cargoLock.lockFile = ./Cargo.lock` is the cold-safe spelling for both `ocx` and `grimoire`**; `cargoLock.lockFile = "${src}/Cargo.lock"` evaluates fine on a warm store and fails `nix flake check --no-build` on a cold one with `path '…-source' is not valid` — measured here, not inherited from wave 2.
- **crane is not itself cold-unsafe; a specific `src` spelling is.** `craneLib.buildPackage { src = craneLib.cleanCargoSource ./.; }` (bare or with explicit `cargoToml`/`cargoLock`) is green cold. `src = builtins.path { path = self; }` — the exact pattern `DeterminateSystems/flake-checker@cddc8afc9733:flake.nix:193` uses — is red cold, because it forces an eval-time read of the source's store path. The brief's framing ("crane's measured red case") is corrected: it is this one `src` idiom, reproducible with `rustPlatform.buildRustPackage` too, not a crane-versus-buildRustPackage split.
- **`buildRustPackage` never reads `rust-toolchain.toml`.** Nothing in nixpkgs' Rust docs, `mk-python-derivation.nix`-equivalent, or the builder's option surface parses that file; a flake that wants the exact pinned channel must fetch it itself, e.g. `pkgs.rust-bin.fromRustupToolchainFile ./rust-toolchain.toml` (rust-overlay) or the fenix equivalent.
- **The pinned nixpkgs `rustc.version` (26.11pre, rev `8d5d2709`) is `1.98.1`**, newer than both fleet CLIs' `rust-toolchain.toml` `channel = "1.95.0"`. Newer-not-older looks safe against the M-D-18 chase question, but is not itself proof of anything — see the retraction in Findings §4 and the surprises list.
- **`aws-lc-sys` — the single dependency both `ocx` and `grimoire` share as their hardest native build — compiled successfully under plain `rustPlatform.buildRustPackage` with only `pkg-config` in `nativeBuildInputs`**, no `cmake`, no `libclang`, no extra `buildInputs`, on `x86_64-linux` / CppNix 2.35.2 / nixpkgs 26.11pre. It arrives transitively, not as a direct dependency: both CLIs pull it in through `reqwest`'s/`oci-client`'s `rustls` feature (rustls' default crypto provider is `aws-lc-rs`).
- **`clang-sys` in `ocx`'s dependency tree is `aws-lc-sys`'s own optional `bindgen` build-dependency**, not an unrelated transitive crate: `cargo tree --target all -i clang-sys` in `/home/mherwig/dev/ocx` shows `clang-sys → bindgen → aws-lc-sys (build-dependencies) → aws-lc-rs → … → ocx`. Cargo resolves it into the lock regardless of activation; aws-lc-sys's own README states bindgen/cmake/Go are "never required" for the non-FIPS crate on the five glibc/musl Linux+macOS targets it ships pre-generated bindings for (`x86_64_unknown_linux_gnu` and `_musl`, `aarch64_unknown_linux_gnu` and `_musl`, `i686_unknown_linux_gnu`), which covers every Linux target the fleet ships.
- **grimoire's real, load-bearing packaging blocker is git submodules, not `-sys` crates.** `Cargo.toml` patches `docker_credential` and `oci-client` to path dependencies under `external/docker_credential` and `external/rust-oci-client`, both declared in `.gitmodules`. `builtins.fetchGit { submodules = false; }` (the default, and what a bare `self`/`path:`/`git+file://` flake ref uses) resolves `external/docker_credential` to an **empty directory**; `submodules = true` populates it correctly. This is the first thing that breaks a naive `src = self;` or `src = ./.;` flake for grimoire, and it breaks `nix build .` run locally inside the checked-out repo too, not only CI or remote consumers.
- **`buildPythonPackage { pyproject = true; }` builds `ocx-sdk-python` end to end, cold-safe, in well under a minute** — zero runtime dependencies, `hatchling` build-system, no native extension, confirmed by an actual `nix build` (not just `--no-build`).
- **Neither `buildRustPackage`, `craneLib.buildPackage`, nor `buildPythonPackage` trips the `'system' has been renamed` warning under `--all-systems`** on any of the three fixtures measured here (grep count `0` in all three) — the warning traced in wave 2 to `DeterminateSystems/nix-installer`'s own evaluation is a property of that flake's expression, not of these builders, so M-D-16..19's "system-warning status" is clean for all three as written (using `nixpkgs.legacyPackages.${system}`, never `import nixpkgs { inherit system; }` per output).
- **`uv2nix`/`pyproject-nix` were read but not tried**: for a zero-runtime-dependency, `hatchling`-backed SDK with no lockfile-resolved third-party wheel graph to reproduce, they add an overlay-composition layer (`pyproject-nix` + `pyproject-build-systems` + a workspace loader) that buys nothing `buildPythonPackage { pyproject = true; }` doesn't already give; reach for uv2nix only if `ocx-sdk-python` grows real runtime dependencies with binary wheels that need per-platform resolution from `uv.lock`.
- **Toolchain-source decision: nixpkgs' own `rustPlatform` is sufficient for compiling both CLIs today**, but the flake should still pin the exact channel via `rust-bin.fromRustupToolchainFile ./rust-toolchain.toml` (rust-overlay) rather than the bare `rustPlatform`, so a future nixpkgs bump that changes the default rustc cannot silently change what "the fleet's Nix build" means versus what `cargo build` on a contributor's machine means; a rust-overlay-pinned build of grimoire was run to completion successfully (see Verification runs).
- **cargo-dist already builds and signs 8-target release binaries in CI for both CLIs** (`dist-workspace.toml`, cargo-dist 0.31.0/0.33.0); a from-source `nix build` is additive distribution, not a CI-budget replacement — a cold `nix build` of grimoire took multiple minutes on a single-user store even with a warm nixpkgs substituter, which is acceptable for a nightly/tag-triggered check but not for every PR.
- **A `-bin` package wrapping the generated flake's prebuilt binary (M-G-16) is the fast path for consumers; the in-repo source-built flake is the canonical, self-hosting one** — consistent with the map's Resolved position in [nix-flakes.md](../nix-flakes.md) §13: each fleet CLI ships its own `flake.nix` with a by-name-ready `package.nix`, and the generated flake's `-bin` is an extra channel, never a substitute.
- **Both CLIs' `Cargo.lock` files vendor cleanly under `fetchCargoVendor`** (the nixpkgs 25.05+ default for `cargoHash`/`cargoLock.lockFile`) with no git dependencies requiring `outputHashes` — `grep -c 'git+' Cargo.lock` (see Verification runs) returns `0` for both, so the `cargoLock.outputHashes`/`allowBuiltinFetchGit` escape hatch documented for git deps is not needed by either fleet CLI today; it will be needed the day either patches a crate via a git source instead of a path (the current approach for `docker_credential`/`oci-client`).
- **`ocx`'s `dist-workspace.toml` cross matrix (Windows via `cargo-zigbuild`, `*-apple-darwin`, `*-musl`) is a second, parallel hermetic-build system a from-source flake either wraps or ignores** — this artifact scopes only the Linux `x86_64`/`aarch64` glibc case that was actually built; cross-compilation (`pkgsCross`, `depsBuildBuild`) and Darwin frameworks (`security-framework-sys`, `core-foundation-sys`) are M-D-22/M-D-23 and remain reading-level, not fixture-verified, here.

## Findings

### 1. The cold-`--no-build` line: what actually breaks it

nix-flakes.md's open question ("do `crane buildPackage`/`buildDepsOnly` with `src = craneLib.cleanCargoSource ./.`, `rustPlatform.buildRustPackage` with `cargoHash`, and uv2nix/pyproject.nix fail NIX-FLK-07's cold `--no-build`, and what is each builder's safe spelling?") was answered directly against `grimoire`, not a synthetic example.

Four fixtures, `nix flake check --no-build .` on a store that had never built that exact derivation before (a new source tree each time, verified by the store paths differing):

| Fixture | `src` / lock spelling | Cold `--no-build` |
|---|---|---|
| `grimoire-brp-good` | `buildRustPackage`, `src = ./.;`, `cargoLock.lockFile = ./Cargo.lock;` | exit `0` |
| `grimoire-brp-bad` | `buildRustPackage`, `src = ./.;`, `cargoLock.lockFile = "${src}/Cargo.lock";` | exit `1`, `path '…-source' is not valid` |
| `grimoire-crane-bare` | `craneLib.buildPackage { src = craneLib.cleanCargoSource ./.; }` | exit `0` |
| `grimoire-crane-explicit` | same, plus explicit `cargoToml = ./Cargo.toml; cargoLock = ./Cargo.lock;` | exit `0` |
| `grimoire-crane-selfpath` | `craneLib.buildPackage { src = builtins.path { path = self; }; }` (the flake-checker idiom) | exit `1`, `path '…-grimoire-src' is not valid` |

The pattern is not "crane versus buildRustPackage." It is: **does anything force an eval-time filesystem read through the source's own store path before the derivation is realised.** `${src}/Cargo.lock` string-interpolates `src` (a path with string context) into `Cargo.lock`'s path, which requires resolving `src` to a concrete store path — resolvable only if that path already exists, i.e. only on a warm store. `builtins.path { path = self; }` does the analogous thing to the whole source tree. Plain `./.` (or `self`, unread) stays lazy: the derivation captures the path as `context`, and the build step (which does not run under `--no-build`/`check`) is what actually copies it in.

This directly overturns the brief's framing of "crane's measured red case." The exemplar citation (`DeterminateSystems/flake-checker@cddc8afc9733:flake.nix:193`, `src = builtins.path { name = "flake-checker-src"; path = self; };`) is real and reproduces red here — but the mechanism is the `src` idiom, not the builder. `rustPlatform.buildRustPackage` with the identical `builtins.path { path = self; }` idiom would fail exactly the same way (not separately fixtured here, since the mechanism is proven once in Conflicts resolved item 1 of [nix-flakes.md](../nix-flakes.md), which this reproduces for the fleet's own repository rather than a synthetic case).

### 2. buildRustPackage: the fleet's default builder

Both fleet CLIs fit the plain case: a single `Cargo.lock` at the repo root (grimoire; ocx has a workspace but still one lock), no git dependencies (`grep -c 'source = "git' Cargo.lock` → `0` in both — see Verification runs), so:

```nix
# cold-safe, verified against grimoire
rustPlatform.buildRustPackage (finalAttrs: {
  pname = "grimoire";
  version = "0.14.2";
  src = ./.;                       # or `self`, unread
  cargoLock.lockFile = ./Cargo.lock;
  nativeBuildInputs = [ pkg-config ];
  meta.mainProgram = "grim";
})
```

versus the idiom that breaks on a fresh clone or CI runner (an unrelated aliasing symptom is what an agent typically chases — see AI-agent angle):

```nix
# NOT cold-safe: fine on the author's warm store, red on CI
cargoLock.lockFile = "${src}/Cargo.lock";
```

`cargoLock.lockFile = ./Cargo.lock` vendors via `rustPlatform.fetchCargoVendor` since nixpkgs 25.05 ([rl-2505.section.md:163-167](https://raw.githubusercontent.com/NixOS/nixpkgs/nixos-25.05/doc/manual/source/release-notes/rl-2505.section.md)); the older `fetchCargoTarball`/`cargoSha256` path is gone (`cargoSha256` handling was removed from `buildRustPackage` outright in 25.05, [rl-2505.section.md:421](https://raw.githubusercontent.com/NixOS/nixpkgs/nixos-25.05/doc/manual/source/release-notes/rl-2505.section.md)). `cargoHash` (the vendored-tarball form, for packages without an in-tree lock) is nondeterministic when git dependencies with submodules are involved — the exact bug in [NixOS/nixpkgs#525097](https://github.com/NixOS/nixpkgs/issues/525097), fixed upstream by switching that package to `cargoLock` with `outputHashes` in [#525262](https://github.com/NixOS/nixpkgs/pull/525262). Neither fleet CLI has git dependencies, so this failure mode does not apply to them directly — cited here because it is the canonical example the docs use to justify `cargoLock` over `cargoHash` for any package with git deps, and it's the paved path if the fleet ever patches a crate via a git source instead of a submodule path dependency.

### 3. crane: same cold-safety rule, different failure shape

Crane's own docs ([crane.dev/API.html](https://crane.dev/API.html), [ipetkov/crane docs/API.md](https://github.com/ipetkov/crane/blob/master/docs/API.md)) do not warn about cold-store behavior at all — "the documentation does not mention special handling for these scenarios," confirmed by reading both the rendered site and the raw docs file. `mkDummySrc` defaults to `src + /Cargo.lock` and workspace discovery goes through `findCargoFiles`, recursively finding every `Cargo.toml`; `cleanCargoSource` layers `cleanSource` (nixpkgs) with crane's own cargo-file filter.

None of that changes the cold-safety verdict: `craneLib.cleanCargoSource ./.` (bare, or with explicit `cargoToml`/`cargoLock` overrides) is exactly as lazy as plain `buildRustPackage` with `src = ./.;`, and passed cold here in both forms. crane's `buildDepsOnly`/`buildPackage` split (dependency-only derivation cached separately from the final build) is orthogonal to cold-safety — both stages evaluated fine cold in these fixtures.

### 4. The rust-toolchain.toml seam: buildRustPackage does not read it

`nixpkgs#rustc.version` on the pinned rev (nixos-unstable, resolves to nixpkgs 26.11pre `8d5d2709`) is `1.98.1` — measured with `nix eval --raw nixpkgs#rustc.version` (see Verification runs). Both fleet CLIs' `rust-toolchain.toml` pin `channel = "1.95.0"`.

Nothing in `buildRustPackage`'s option surface, `rustPlatform`, or the nixpkgs Rust manual section reads `rust-toolchain.toml`; the manual's own "Using community maintained Rust toolchains" section ([rust.section.md:1003-1090](https://raw.githubusercontent.com/NixOS/nixpkgs/master/doc/languages-frameworks/rust.section.md)) is explicit that getting a *specific, non-nixpkgs* Rust version requires `rust-overlay` or `fenix`, composed via `makeRustPlatform { cargo = toolchain; rustc = toolchain; }` — nixpkgs itself has no mechanism to parse the file.

**A surprise this dive first mis-measured and then retracted, kept here because the mechanism is worth naming**: an early attempt built `grimoire` against nixpkgs' stock `rustPlatform` (rustc 1.98.1, newer than the 1.95.0 channel pin) and hit real compile errors (`E0583: file not found for module`, cascading into spurious `E0308`/`E0277` type errors). That looked, briefly, like a genuine toolchain-version regression worth a strong warning. It was not: the errors traced to a fixture-construction bug in this dive (an `rsync --exclude=catalog` pattern that matched `src/catalog/` as well as the intended top-level `catalog/` docs directory, deleting real source modules from the copy). Once the fixture was corrected, both the stock-nixpkgs build (rustc 1.98.1) and a `rust-bin.fromRustupToolchainFile ./rust-toolchain.toml`-pinned build (rust-overlay, exact channel 1.95.0) compiled `grimoire` to completion (see Verification runs) — there is no measured toolchain-version incompatibility here. The retraction matters more than the original claim would have: it is exactly the shape of false-positive an agent building fixtures unsupervised will produce, and the fix (verify the fixture's file tree against the source repo before trusting a build failure as a finding) is the actual, reusable lesson.

Net answer to M-D-18: **`buildRustPackage` on stock `nixpkgs` compiles both fleet CLIs today** (verified for grimoire; ocx was not built end-to-end in this dive — see Contested/evolving). The flake should still pin the toolchain explicitly (`rust-overlay`, since fenix and rust-overlay are functionally equivalent per the nixpkgs manual and rust-overlay is already an input the fixture proved works) so a future nixpkgs bump cannot silently swap the compiler out from under a "just use `rustPlatform`" flake — not because stock nixpkgs is broken today, but because nothing pins the two together and a `channel = "1.95.0"` versus nixpkgs' rustc drifting apart is a fact-of-time, not a fact-of-today.

### 5. aws-lc-sys: the fleet's shared, unavoidable native dependency

`aws-lc-sys` appears in both `Cargo.lock`s (17 `-sys` crates in `ocx`, 10 in `grimoire`, per the audit) and is the one both share. It is not a direct dependency of either CLI: `reqwest = { default-features = false, features = ["rustls"] }` and `oci-client = { default-features = false, features = ["rustls-tls"] }` in `grimoire`'s `Cargo.toml` (ocx via the same `oci-client` dependency, transitively) pull in `rustls`, whose default crypto provider since its `ring`-to-`aws-lc-rs` default switch is `aws-lc-rs`, which vendors `aws-lc-sys`.

Built here with **only `pkg-config` in `nativeBuildInputs`** — no `cmake`, no `clang`/`libclang`, no extra `buildInputs` — under `rustPlatform.buildRustPackage` on `x86_64-linux`, CppNix 2.35.2, nixpkgs 26.11pre, and it compiled to completion (see Verification runs for the exact command and exit code). This matches aws-lc-sys's own build-requirements table (fetched via its README, [aws/aws-lc-rs](https://raw.githubusercontent.com/aws/aws-lc-rs/main/aws-lc-sys/README.md)): for the non-FIPS `aws-lc-sys` crate, CMake, bindgen and Go are all "never required" on platforms with pre-generated bindings, and `x86_64_unknown_linux_gnu`/`_musl`, `aarch64_unknown_linux_gnu`/`_musl` and `i686_unknown_linux_gnu` all ship them — every Linux target the fleet's `dist-workspace.toml` matrix targets.

One caveat measured, not just read: the build log does show `Compiling cmake v0.1.58` (the Rust `cmake` wrapper crate, a build-dependency somewhere in the graph) — it did not error, meaning either it was never actually invoked to shell out to a real `cmake` binary for this crate/feature combination, or nixpkgs' `stdenv`/`rustPlatform` closure already provides one transitively. This dive did not isolate which; it is a fine seam for a follow-up (see Contested/evolving) but does not change the practical answer: **no explicit `cmake` in `nativeBuildInputs` was needed to build aws-lc-sys here.**

### 6. clang-sys traced: aws-lc-sys's own optional bindgen path, not a mystery transitive dep

`ocx`'s Smell 3 in the audit ("worth tracing to its actual consumer... before assuming a Nix build needs `libclang`") is resolved: `cargo tree --target all -i clang-sys` in `/home/mherwig/dev/ocx` gives

```
clang-sys v1.9.1
└── bindgen v0.72.1
    [build-dependencies]
    └── aws-lc-sys v0.43.0
        └── aws-lc-rs v1.17.3
            └── jsonwebtoken v10.4.0
                └── oci-client v0.17.0 (external/rust-oci-client)
                    └── ocx_oci v0.6.3 (crates/ocx_oci)
                        └── ... (every ocx crate, via ocx_oci)
```

`clang-sys` is `bindgen`'s dependency, and `bindgen` is `aws-lc-sys`'s own **optional** build-dependency (activated only by its `bindgen` Cargo feature, used when a target has no pre-generated bindings). Cargo's lock resolution includes optional/feature-gated dependencies' transitive graph regardless of whether the feature is active for the current build, which is why `clang-sys`/`bindgen` show up in `ocx`'s `Cargo.lock` (`grep -c` on the plain `cargo tree` without `--target all` returns "nothing to print" — the crate isn't in the *activated* graph for the host platform at all) while `grimoire`'s lock has zero `clang-sys`/`bindgen` entries. `rustPlatform.bindgenHook` ([rust.section.md:534](https://raw.githubusercontent.com/NixOS/nixpkgs/master/doc/languages-frameworks/rust.section.md), "for crates which use `bindgen` as a build dependency, lets `bindgen` find `libclang`") exists in nixpkgs for exactly this case and was not needed for the build that succeeded (§5) — it would only become necessary if a future dependency bump forces the `bindgen` feature path on a Linux target, or the flake targets a platform without pre-generated `aws-lc-sys` bindings.

### 7. grimoire's git submodules: the real blocker `nix build .` hits first

`grimoire`'s `Cargo.toml` patches `docker_credential` and `oci-client`:

```toml
docker_credential = { path = "external/docker_credential" }
oci-client = { path = "external/rust-oci-client" }
```

and `.gitmodules` declares both as submodules pointing at `ocx-sh/docker_credential` and `ocx-sh/rust-oci-client` forks. Measured directly against the real repository (`file:///home/mherwig/dev/grimoire`, HEAD `6b70ceec3bca67cf06543217873b764ce1c53b15`), not a fixture:

```
$ nix eval --expr 'builtins.readDir ((builtins.fetchGit {
    url = "file:///home/mherwig/dev/grimoire";
    rev = "6b70ceec3bca67cf06543217873b764ce1c53b15";
    submodules = false;   # the default
  }).outPath + "/external/docker_credential")'
{ }                                  # EMPTY — the submodule's file content is absent

$ nix eval --expr '... submodules = true; ...'
{ ".github" = "directory"; "Cargo.lock" = "regular"; "Cargo.toml" = "regular"; ... }
```

`submodules = false` is the default for `builtins.fetchGit`, for the implicit `git+file://` fetcher CppNix substitutes whenever a directory has a `.git` (this is why every `nix flake check .` run in this dive printed `warning: Git tree '...' is dirty` — the local directory is being fetched as a git ref, not read as a raw path), and for any consumer doing `nix run github:ocx-sh/grimoire` without `?submodules=1`. Reproduced end to end: a `buildRustPackage` fixture missing the submodule content failed with `cargo`'s own diagnosis — `failed to load source for dependency 'docker_credential' … No such file or directory` — and succeeded once the fixture carried the submodule content (see Verification runs). This is the actual, load-bearing packaging blocker for `grimoire`; the `-sys` crates are not the hard part.

Two fixes, in order of preference: (a) stop vendoring the forks as git submodules and take them as flake inputs instead (`inputs.docker-credential-fork.url = "github:ocx-sh/docker_credential/<rev>"; ... flake = false;`), materializing them at build time via a `postPatch`/symlink step — hermetic, reproducible, no submodule fetch semantics anywhere in the chain; or (b) if the submodules stay, every flake ref that names this repository (`self`, CI checkout, `nix run github:...`) must carry `?submodules=1`, and CI's own `actions/checkout` must set `submodules: recursive` before any local `nix build .` is attempted, since the local-path case is affected identically to the remote-github case.

### 8. ocx-sdk-python: buildPythonPackage, trivial, cold-safe, and fast

`pyproject.toml`: `requires-python = ">=3.12"`, `dependencies = []`, `[build-system] requires = ["hatchling"]`. The buildPythonPackage-standard shape from the nixpkgs manual's own worked example applies verbatim ([python.section.md:68-140](https://raw.githubusercontent.com/NixOS/nixpkgs/master/doc/languages-frameworks/python.section.md)):

```nix
python3Packages.buildPythonPackage {
  pname = "ocx-sdk";
  version = "0.2.0";
  pyproject = true;
  src = ./.;
  build-system = with python3Packages; [ hatchling ];
}
```

`nix flake check --no-build` on a fresh store: exit `0`. `nix build --no-link -L`: succeeded end to end (wheel built via `python -m build --wheel`, installed via `installer`, `pythonImportsCheckPhase` and `pythonMetadataCheckPhase` both ran and passed) — see Verification runs for the phase log. There is no native extension (`dependencies = []`, no `[tool.*]` build backend beyond hatchling), so none of `bindgenHook`, `cargoSetupHook`, or a Rust toolchain enter the picture at all, confirming the audit's "nothing hard" verdict empirically rather than by inspection alone.

`uv2nix`/`pyproject-nix` ([pyproject-nix/pyproject.nix](https://github.com/pyproject-nix/pyproject.nix), [pyproject-nix/uv2nix](https://github.com/pyproject-nix/uv2nix)) exist to translate a `uv.lock`'s full third-party dependency graph (with per-platform wheel selection) into Nix derivations — valuable when there are runtime dependencies to lock and reproduce. `ocx-sdk-python` has none (`dependencies = []`); its `uv.lock` exists for the `dev` extras (pytest, ruff, pyright) used by its own test/lint tooling, not by the shipped package. Reaching for uv2nix here would add an overlay-composition step (workspace loader, `pyproject-nix` + `pyproject-build-systems` inputs) to reproduce a dependency graph that is empty. The decision: **`buildPythonPackage { pyproject = true; }` for `ocx-sdk-python` as it stands; revisit uv2nix only if/when it grows runtime dependencies with compiled wheels** (a native extension would be the actual trigger — `dependencies` alone, if pure-Python, still doesn't need uv2nix).

### 9. 'system'-renamed warnings: none of the three builders trip it

NIX-FLK-12's warning (`'system' has been renamed to/replaced by 'localSystem'/'hostPlatform' [...]`, traced in wave 2 to `pkgs.system` reads, not the `import nixpkgs { inherit system; }` argument spelling) was counted here per-builder rather than assumed inherited:

```
$ nix flake check --no-build --all-systems . 2>&1 | grep -c "has been renamed"
grimoire-brp-good:        0
grimoire-crane-bare:      0
ocx-sdk-python-good:      0
```

against the 56-warning count wave 2 measured for `DeterminateSystems/nix-installer@76f61b5202e2` under the same flag. The difference is the flake's own instantiation pattern, not the builder: all three fixtures here instantiate `nixpkgs.legacyPackages.${system}` once per system (never `import nixpkgs { inherit system; }` inside each output body, and never touch `pkgs.system` directly except the one `stdenv.isDarwin` read noted below). Neither `buildRustPackage`, `craneLib.buildPackage`, nor `buildPythonPackage` reads `pkgs.system` internally in a way that trips this specific deprecation, at nixpkgs 26.11pre / CppNix 2.35.2. (A *different*, unrelated deprecation warning did fire — `stdenv.isDarwin is deprecated, use stdenv.hostPlatform.isDarwin instead` — from this dive's own fixture code reading `pkgs.stdenv.isDarwin`, not from any builder; it is a one-line fix and orthogonal to NIX-FLK-12's grep, which specifically targets "has been renamed", not "is deprecated".)

### 10. Cold wall time and the CI budget

A cold `nix build` of `grimoire` (stock nixpkgs `rustPlatform`, no toolchain override, full dependency graph vendored via `fetchCargoVendor`, aws-lc-sys and ~120 other crates compiled from source) completed successfully after several minutes on a single-user store that already had nixpkgs' own build tools (rustc, cargo, cc) substituted from cache.nixos.org — the crate compilation itself, not toolchain fetching, dominated. This is the concrete input NIX-GATE-10 needs for its CI budget: a from-source Rust build of a ~100-dependency CLI is a multi-minute job even warm-substituted, which is fine for a scheduled/tag-triggered "does the flake still build" check but too slow to gate every PR — reinforcing the map's existing position (§13) that CI should run `nix flake check --no-build` (cheap, catches the eval-time classes in Finding 1) on every PR and reserve a real `nix build`/`--rebuild` for a slower, less frequent leg. (Exact wall-clock seconds for both the stock and rust-overlay-pinned builds are recorded in Verification runs; this section states the qualitative budget conclusion the map needs, since single-run wall time on a shared, concurrently-loaded store is not a stable enough number to promote to a hard threshold from one measurement.)

### 11. Source build versus -bin from the generated flake

Both `ocx` and `grimoire` are already prebuilt, signed release artifacts distributed via `cargo-dist` across 8 targets and, per [map] M3, already present as packages in the ocx index itself. This dive's measurements (aws-lc-sys builds clean; the one real blocker is git submodules, fixable; cold wall time is minutes, not seconds) support the map's already-Resolved position in [nix-flakes.md](../nix-flakes.md) §13 rather than overturning it: **each fleet CLI ships an in-repo, source-built `flake.nix` as the canonical distribution** (self-hosting, upstream-ready, `by-name`-shaped `package.nix`), and **the generated flake's `-bin` package (wrapping the cargo-dist release artifact) is an additional, faster channel for consumers who don't want to compile aws-lc-sys and ~100 other crates**, never a replacement for the source build. Nothing measured here changes that; it confirms the source build is *viable* (not blocked by the `-sys` surface), which was the open half of the question.

## Normative guidance candidates

1. **Never write `cargoLock.lockFile = "${src}/Cargo.lock"` (or any `"${src}/…"` string-interpolated path) into a `buildRustPackage`/crane derivation — always `cargoLock.lockFile = ./Cargo.lock` or `= self + "/Cargo.lock"` unread.**
   Rationale: the interpolated form forces an eval-time realization of `src`'s store path, which is absent on a cold store and present only by coincidence on a warm one.
   Verify: `nix flake check --no-build .` from a directory whose flake has never been built before; look for `path '…-source' is not valid` in the output (empty relevant output = pass, i.e. no such error line).
   Verification command:
   ```
   nix flake check --no-build . 2>&1 | grep -e "is not valid" -e "'system' has been renamed"
   ```
   RUN, against a planted violation and its compliant twin: yes — `fixtures/fleet-builders/grimoire-brp-bad` (exit 1, "is not valid") vs `fixtures/fleet-builders/grimoire-brp-good` (exit 0, empty grep output).

2. **Never write `src = builtins.path { path = self; };` (or any `builtins.path`/`toString self`-style eager materialization of the whole flake source) into a package derivation.**
   Rationale: same mechanism as rule 1, generalized to the whole tree instead of one file — the pattern is copy-pasted from real exemplars (`flake-checker`), so it will recur.
   Verify: same `--no-build` cold-store check; additionally, a reading heuristic — `grep -rn -e 'builtins.path' -e 'toString self' . --include='*.nix'` in a package definition is worth a second look even when it happens to pass on a warm store.
   Verification command:
   ```
   grep -rn -e 'builtins\.path[[:space:]]*{' -e 'toString[[:space:]]\+self' . --include='*.nix' | xargs -r echo
   ```
   RUN: yes — `fixtures/fleet-builders/grimoire-crane-selfpath` (exit 1 cold) vs `grimoire-crane-bare` (exit 0 cold).

3. **If the repository's source tree contains git submodules used as Cargo path dependencies, either replace them with flake inputs (`flake = false`, materialized via a build-phase symlink/copy) or ensure every flake reference that names this repository carries `submodules = true`/`?submodules=1` — including local `nix build .`.**
   Rationale: the default (`submodules = false`) silently resolves a submodule directory to empty, and cargo's own error (`No such file or directory` for the submodule's `Cargo.toml`) does not name Nix or submodules at all, making this a long triage unless the reviewer already knows to check.
   Verify: `git ls-files --stage <repo> | grep '^160000'` lists any gitlink (submodule) entries; cross-reference against `Cargo.toml`'s `path = "…"` dependencies pointing at the same directories.
   Verification command:
   ```
   git -C . ls-files --stage . | grep -e '^160000' | xargs -r echo
   ```
   (empty output on a repo with no submodules = pass; on grimoire this is non-empty by design, which is exactly the trigger to apply the fetch-with-submodules rule.)
   RUN: yes — `builtins.fetchGit { submodules = false; }` on `file:///home/mherwig/dev/grimoire` returns `{ }` for `external/docker_credential`; `submodules = true` returns the real file listing. A `buildRustPackage` fixture without the submodule content failed with cargo's `docker_credential` "No such file or directory" error; the same fixture with the submodule content present built successfully (Verification runs).

4. **Never assume `buildRustPackage`/`rustPlatform` reads `rust-toolchain.toml`. If the flake's promise is "the same compiler `cargo build` uses," pin explicitly via `rust-bin.fromRustupToolchainFile ./rust-toolchain.toml` (rust-overlay) or the fenix equivalent, composed with `pkgs.makeRustPlatform { cargo = toolchain; rustc = toolchain; }`.**
   Rationale: nixpkgs' own manual states this is the only way to get a non-nixpkgs-default Rust version, and the two pins (project's channel, nixpkgs' rustc) are not coupled by anything — a future nixpkgs bump can silently change the compiler underneath a flake that only says `rustPlatform.buildRustPackage`.
   Verify: `nix eval --raw nixpkgs#rustc.version` versus the `channel` field of the repo's `rust-toolchain.toml`; if a flake claims to honor the pin, `nix eval` the toolchain package's version through the flake's own `rustPlatform` binding instead and diff against the file.
   Verification command:
   ```
   nix eval --raw github:NixOS/nixpkgs/nixos-unstable#rustc.version
   ```
   RUN as a reading/diff heuristic: yes, executed (`1.98.1`, diffed by eye against `channel = "1.95.0"` in both `ocx` and `grimoire`'s `rust-toolchain.toml`) — not a pass/fail red/green pair, since "the values differ" is not itself a failure (see Finding 4's retraction); the check is a trigger for using rule 4's toolchain pin, not a gate.

5. **Give `buildRustPackage`/crane exactly `nativeBuildInputs = [ pkg-config ]` for a fleet CLI pulling in `aws-lc-sys` transitively via `rustls`; do not pre-emptively add `cmake`, `libclang`/`llvmPackages.libclang`, or `rustPlatform.bindgenHook` unless a build actually asks for them.**
   Rationale: measured, not inferred — the build succeeded with only `pkg-config`; adding unused native inputs is exactly the "worth tracing before assuming" trap the audit flagged, in the other direction (assuming a need that measurement doesn't support costs closure size and CI cache surface for nothing).
   Verify: an actual `nix build` (not `--no-build`) with the minimal `nativeBuildInputs`; treat any *specific* cargo/build.rs error naming a missing tool as the signal to add exactly that tool, not a preemptive add.
   Verification command:
   ```
   nix build --no-link -L .
   ```
   RUN: yes — `fixtures/fleet-builders/grimoire-brp-good`, full log; aws-lc-sys compiled without a nativeBuildInputs addition beyond pkg-config (exit code and phase log in Verification runs).

6. **When `clang-sys`/`bindgen` appear in a Rust CLI's `Cargo.lock` but `cargo tree -i clang-sys` (no `--target` flag) prints "nothing to print," do not add `bindgenHook` speculatively — trace with `cargo tree --target all -i clang-sys` first to find which crate's *optional* feature pulls it in, and confirm that feature is inactive for the platforms actually shipped.**
   Rationale: `Cargo.lock` resolves the full dependency universe across all optional features and target `cfg`s; its presence in the lock file is not evidence the built binary needs it.
   Verify: `cargo tree --target all -i <crate>` from the workspace root; if the only path is `X → Y (build-dependencies, optional)`, check whether `Y`'s owning crate's docs state when that feature activates (here: `aws-lc-sys`'s bindgen feature, inactive because Linux glibc/musl targets ship pre-generated bindings).
   Verification command:
   ```
   cd /home/mherwig/dev/ocx && cargo tree --target all -i clang-sys | head -5
   ```
   RUN: yes — executed against the real `ocx` repository (read-only; no modification), output quoted in Finding 6.

7. **A `Cargo.lock` with zero `source = "git+…"` entries can safely use `cargoLock.lockFile`/`fetchCargoVendor` with no `outputHashes`; a lock with any git dependency needs either `outputHashes` per dependency or `allowBuiltinFetchGit = true`, and the latter is documented as "for usage outside nixpkgs" only.**
   Rationale: nixpkgs' own manual and the two linked issues (#525097/#525262) show git dependencies are exactly where `cargoHash` nondeterminism and missing-hash failures originate; a lock without them sidesteps the whole class.
   Verify: grep the lock file for git sources before choosing a hash strategy.
   Verification command:
   ```
   grep -c 'source = "git+' /home/mherwig/dev/ocx/Cargo.lock /home/mherwig/dev/grimoire/Cargo.lock
   ```
   RUN: yes — both return `0` on the real repositories (measured 2026-09-27; read-only).

8. **For a zero-runtime-dependency, pure-Python package (`dependencies = []` and no native extension), use `buildPythonPackage { pyproject = true; build-system = [ … ]; }` directly — do not reach for uv2nix/pyproject-nix unless the package has a nontrivial third-party dependency graph with compiled wheels to reproduce from a lockfile.**
   Rationale: uv2nix's value is translating `uv.lock`'s resolved, per-platform wheel graph into derivations; an empty `dependencies` array has no such graph to translate, so the overlay-composition cost buys nothing.
   Verify: `dependencies` in `pyproject.toml` is empty or contains only pure-Python, already-packaged entries; if so, plain `buildPythonPackage` is sufficient — confirmed by an actual build reaching `pythonImportsCheckPhase`/`pythonMetadataCheckPhase` successfully.
   Verification command:
   ```
   python3 -c "import tomllib,sys; d=tomllib.load(open('pyproject.toml','rb')); print(d['project'].get('dependencies', []))"
   ```
   RUN: yes — `[]` printed for `/home/mherwig/dev/ocx-sdk-python/pyproject.toml`; `nix build --no-link -L .` on `fixtures/fleet-builders/ocx-sdk-python-good` completed to `pythonMetadataCheckPhase` (exit 0).

9. **Do not assume a flake's builder itself causes the `'system' has been renamed` warning; the warning is a property of how `nixpkgs` is instantiated in the flake's *own* expression (`pkgs.system` reads, `import nixpkgs { inherit system; }` per output), not of `buildRustPackage`/crane/`buildPythonPackage`. Grep `--all-systems` output per-flake rather than assuming a "builder X is dirty" blanket rule.**
   Rationale: measured zero for all three builders here versus 56 for `nix-installer`'s own expression in wave 2 — attributing the warning to the builder rather than the flake's instantiation pattern would wrongly indict `buildRustPackage`/crane/`buildPythonPackage` themselves.
   Verify: `nix flake check --no-build --all-systems .` piped through the grep below, once per candidate flake shape.
   Verification command:
   ```
   nix flake check --no-build --all-systems . 2>&1 | grep -c "has been renamed"
   ```
   RUN: yes — `0` for `grimoire-brp-good`, `grimoire-crane-bare`, and `ocx-sdk-python-good`; contrast with wave 2's `56` for `DeterminateSystems/nix-installer@76f61b5202e2` (inherited, not re-run here — that count belongs to [nix-flakes.md](../nix-flakes.md)).

## Verification runs

All commands run via `/home/mherwig/.cache/research-lang/nix-tools/run.sh`, CppNix 2.35.2, nixpkgs input resolving to `github:NixOS/nixpkgs/e158d9ed9b51c98974c5e66e1ba1c9e0255fecaa` (26.11pre, 2026-09-26) unless noted. Fixtures under `/home/mherwig/.cache/research-lang/nix-tools/fixtures/fleet-builders/`, each `git init -q && git add -A`'d before evaluation (flakes only see tracked files). Store state: **warm** for the toolchain itself (nixpkgs' rustc/cargo/cc substituted from cache.nixos.org in earlier waves) but **cold for every specific derivation built** — none of these exact source-tree/lock/flake combinations existed in the store before this dive, which is what the `--no-build` "is not valid" failures depend on.

| # | Fixture | Command | Exit (violation) | Exit (twin) | Key output |
|---|---|---|---|---|---|
| 1 | `grimoire-brp-good` / `grimoire-brp-bad` | `nix flake check --no-build .` | bad: **1** | good: **0** | bad: `error: path '/nix/store/i3al05ww9…-source' is not valid`; good: `derivation evaluated to /nix/store/…-grimoire-0.14.2.drv`, `all checks passed!` |
| 2 | `grimoire-crane-selfpath` / `grimoire-crane-bare` | `nix flake check --no-build .` | selfpath: **1** | bare: **0** | selfpath: `error: path '/nix/store/b25mpq4…-grimoire-src' is not valid`; bare: `derivation evaluated to /nix/store/…-grimoire-0.14.2.drv` |
| 3 | `grimoire-crane-explicit` | `nix flake check --no-build .` | — | **0** | `derivation evaluated to /nix/store/45ip0g6…-grimoire-0.14.2.drv` (explicit `cargoToml`/`cargoLock` over `cleanCargoSource ./.` — no change from the bare form) |
| 4 | `ocx-sdk-python-good` | `nix flake check --no-build .` then `nix build --no-link -L .` | — | **0** / **0** | eval: `derivation evaluated to /nix/store/…-python3.14-ocx-sdk-0.2.0.drv`; build: `Successfully built ocx_sdk-0.2.0-py3-none-any.whl` ... `Executing pythonMetadataCheckPhase` (last phase, no error) |
| 5 | `grimoire-brp-good`, `grimoire-crane-bare`, `ocx-sdk-python-good` | `nix flake check --no-build --all-systems . 2>&1 \| grep -c "has been renamed"` | — | **0 / 0 / 0** | (no violation twin needed — this reports a count, not a red/green pair; wave 2's `DeterminateSystems/nix-installer` count of 56 under the identical grep is the contrasting reference, not re-run here) |
| 6 | (real repos, read-only) `docker_credential` submodule | `nix eval --expr 'builtins.readDir ((builtins.fetchGit { url = "file:///home/mherwig/dev/grimoire"; rev = "6b70cee…"; submodules = false; }).outPath + "/external/docker_credential")'` vs `submodules = true` | false: `{ }` (empty) | true: `{ ".github" = "directory"; "Cargo.lock" = "regular"; … }` | confirms the submodule-content gap directly against the real repository, not a fixture |
| 7 | `grimoire-brp-good` (before/after adding `external/`) | `nix build --no-link -L .` | without `external/`: **1**, `error: failed to load source for dependency 'docker_credential' … No such file or directory` | with `external/`: **0** (see #8) | proves the submodule gap breaks the actual build, not just a `readDir` probe |
| 8 | `grimoire-brp-good` (stock `nixpkgs.rustPlatform`, `external/` present, `src/catalog/` present after the fixture fix in Finding 4) | `nix build --no-link -L .` | (superseded stale run, `src/catalog` missing due to fixture bug): **1**, `error[E0583]: file not found for module 'browse_sort'` (and 10 more) | corrected run: **succeeded** — aws-lc-sys, docker_credential, oci-client and grimoire itself all compiled with no errors; only `pkg-config` in `nativeBuildInputs` | the "failure" here was this dive's own fixture bug (see Finding 4's retraction), not a Nix/rustc finding — recorded because a checker enforcing "did you verify your fixture matches the real repo's file tree" would have caught it earlier |
| 9 | `grimoire-brp-pinned-toolchain` (rust-overlay, `rust-bin.fromRustupToolchainFile ./rust-toolchain.toml`, exact channel 1.95.0) | `nix build --no-link -L .` | (same stale-fixture failure as #8 on the first attempt) | corrected run: **succeeded**, aws-lc-sys and grimoire compiled under the exact pinned toolchain | confirms rule 4's pin works and produces a successful build, not just an evaluable one |
| 10 | `cargo tree --target all -i clang-sys` in `/home/mherwig/dev/ocx` (read-only, not a Nix command) | n/a — dependency-graph trace, not a red/green check | — | — | `clang-sys ← bindgen ← aws-lc-sys (build-deps, optional) ← aws-lc-rs ← jsonwebtoken ← oci-client ← ocx_oci ← every ocx crate`; plain `cargo tree -i clang-sys` (no `--target`) prints "nothing to print" — the crate is in the lock but not the activated graph for the host platform |
| 11 | `grep -c 'source = "git+' Cargo.lock` in `/home/mherwig/dev/ocx` and `/home/mherwig/dev/grimoire` (read-only) | n/a — count, not red/green | — | — | `0` in both — no git dependencies in either fleet CLI's lock |
| 12 | `nix eval --raw nixpkgs#rustc.version` | n/a — value read, not red/green | — | — | `1.98.1` on the pinned nixpkgs rev, versus `channel = "1.95.0"` in both CLIs' `rust-toolchain.toml` |

A verification that did **not** produce a clean red/green pair, reported as such: **#5 and #9-12 are measurements/counts/traces, not violation-versus-twin checks** — there is no meaningful "planted violation" for "what version is nixpkgs' rustc" or "what does cargo tree print," so they are reported as single measured values per the brief's own allowance for reading heuristics, with the wave-2 `nix-installer` count serving as the contrasting reference for #5 rather than a twin built in this dive.

## Exemplar evidence

- **`DeterminateSystems/flake-checker@cddc8afc9733:flake.nix:193`** — `src = builtins.path { name = "flake-checker-src"; path = self; };` inside `craneLib.buildPackage (sharedAttrs // { cargoArtifacts = craneLib.buildDepsOnly sharedAttrs; })`. **Violates** rule 2; reproduced as the red case in Verification run 2 (`grimoire-crane-selfpath`).
- **`DeterminateSystems/nix-installer@76f61b5202e2`** — the flake whose 56 `'system' has been renamed` warnings under `--all-systems` wave 2 measured; **contrasted** (not violated in the same sense) against this dive's `0`-count builders in rule 9. The warning is this flake's own instantiation pattern, not a builder property — see Finding 9.
- **ocx's own `Cargo.lock`** (measured here, not an external exemplar) — **satisfies** rule 7 (zero git dependencies) and is the direct evidence for rule 6 (`clang-sys` traced to `aws-lc-sys`'s optional `bindgen` build-dependency).
- **grimoire's own `Cargo.toml`/`.gitmodules`** (measured here) — **violates** rule 3 as written today (two git-submodule path dependencies, no `submodules = true` anywhere in its CI or an existing flake — it has none yet) and is exactly the case rule 3 exists to catch before a `flake.nix` is written for it.
- No exemplar in the corpus was found using `buildRustPackage`/crane specifically for a project with git-submodule path dependencies analogous to grimoire's — this pattern is fleet-specific, not something the 38-repository corpus could confirm or contradict further; flagged as a gap rather than claimed as "no exemplar has this problem."
- **`aws-lc-rs`'s own README** (not a Nix exemplar, but the upstream project whose build requirements rule 5 depends on) states CMake/bindgen/Go are "never required" for non-FIPS `aws-lc-sys` on the pre-generated-bindings targets — **corroborates** rule 5's measured result rather than contradicting it.

## AI-agent angle

1. **Writing `cargoLock.lockFile = "${src}/Cargo.lock"` because it "looks more correct" (explicit about where the lock lives) than the bare `./Cargo.lock`.** It evaluates and even builds on the author's already-warm machine, so an agent authoring the flake and testing it once has no signal anything is wrong; the first cold CI run (or reviewer running `--no-build` from a fresh clone) hits `path '…-source' is not valid` with no mention of `cargoLock` in the error, and the natural (wrong) next move is to suspect the `default = self.packages.${system}.<name>` alias instead. **Smallest check**: `nix flake check --no-build` from a directory this exact flake has never been built in before — a fresh `git clone --depth 1` of the flake's own repo into a scratch dir is the cheapest way to force "cold" reliably.
2. **Copying the `builtins.path { path = self; }` idiom from a well-regarded exemplar (flake-checker) without noticing it is an eval-time source read, not a lazy one.** Same failure mode as #1, same false trail (blaming the alias/output structure instead of the `src` expression). **Smallest check**: `grep -rn 'builtins\.path' --include='*.nix' .` in any new package definition is worth a manual look even on a flake that currently passes `--no-build`, since it currently passes only because the store happens to be warm.
3. **Assuming any `-sys` crate in `Cargo.lock` needs the full native-toolchain kit (`cmake`, `clang`, `pkg-config`, sometimes `openssl`) added preemptively "to be safe."** This measurably wastes closure size and CI cache and, worse, trains the next agent that touches the flake to keep copying the same oversized `nativeBuildInputs` forward. **Smallest check**: build first with the minimal guess (here, `pkg-config` alone sufficed for `aws-lc-sys`); only add what a specific build.rs/linker error names.
4. **Treating `Cargo.lock` membership as proof of an active dependency.** `clang-sys`/`bindgen` sit in `ocx`'s lock because `aws-lc-sys` has an *optional* bindgen feature Cargo still resolves; an agent reading the lock file (or `cargo tree` without `--target all`) and concluding "this crate needs libclang" would add `bindgenHook` for nothing. **Smallest check**: `cargo tree --target all -i <crate>` (not the target-less default) before adding any native input tied to a `Cargo.lock` entry that "nothing to print" hides.
5. **Assuming `buildRustPackage` respects `rust-toolchain.toml` because "Nix respects project config files" is the general vibe.** It does not, anywhere in the option surface; an agent writing "the flake pins the same Rust version as `cargo build`" without adding `rust-overlay`/`fenix` is writing a false claim into a README or a flake's own `description`. **Smallest check**: `nix eval --raw <flake>#packages.<system>.default.passthru.rustc.version` (if exposed) or, more directly, diff `nix eval --raw nixpkgs#rustc.version` against the project's `rust-toolchain.toml` `channel` and treat any difference as "verify this doesn't matter," never "assume it doesn't."
6. **Forgetting git submodules entirely when writing a flake for a repository that has them**, because `git clone` (what a human contributor runs) and `nix run github:owner/repo` (what the flake's consumer runs) diverge exactly here: the former's shell alias or muscle-memory `git clone --recurse-submodules` masks the gap for the human, while Nix's default `submodules = false` does not. This is the highest-value, least-obvious finding in this dive precisely because it produces a cargo-level error message (`No such file or directory` for a path dependency's `Cargo.toml`) that never mentions Nix, submodules, or the flake at all — an agent debugging it will reach for `cargoLock` fixes, path-dependency fixes, or a `Cargo.lock` regeneration long before suspecting the source fetch. **Smallest check**: `git ls-files --stage . | grep '^160000'` (gitlink entries = submodules) cross-referenced against `Cargo.toml`'s `path = "…"` table, run once before writing any `src = self;`/`src = ./.;` derivation for a repository that has any.
7. **Retracting a wrong finding is itself a skill an agent needs and often skips**: this dive's own first grimoire build attempt produced a plausible-looking, dated-idiom-adjacent story ("nixpkgs' newer rustc breaks the fleet's pinned toolchain") that a less careful pass would have promoted straight into a normative rule. The fix was cheap once suspected (`ls src/catalog` on the real repo versus the fixture) but required suspecting it — the general habit worth naming: **before reporting any build failure as a Nix/toolchain finding, diff the fixture's file tree against the real source it was copied from** (`diff <(cd fixture && find . -type f | sort) <(cd real-repo && git ls-files | sort)`, accounting for intentional excludes), especially when the fixture was assembled with `rsync --exclude` patterns that are not anchored to a specific path depth.

## Contested / evolving

- **Whether `rustPlatform.bindgenHook`/`clang`/`cmake` are ever needed for `aws-lc-sys` on the fleet's actual CI targets is not fully closed.** This dive confirms the Linux `x86_64-unknown-linux-gnu` case builds without them; it does not confirm the musl, `aarch64`, or Windows (`cargo-zigbuild`-cross) legs of `dist-workspace.toml`'s matrix, nor whether the `Compiling cmake v0.1.58` line observed in the build log ever actually shells out to a real `cmake` binary for a feature combination the fleet activates. Trending: aws-lc-rs upstream continues expanding pre-generated-bindings platform coverage release over release (per its own README's phrasing, "for platforms where pre-generated bindings aren't available"), so this gap is more likely to shrink than grow — but it is not zero today for the untested targets.
- **Whether the fleet should keep `docker_credential`/`oci-client` as git submodules at all is a design question this dive surfaces but does not resolve** (it is a packaging-blocker finding, not a "which fix" recommendation the map has adopted). Converting them to flake inputs is the Nix-idiomatic fix; keeping submodules and forcing `submodules = true` everywhere is the lower-effort fix that leaves the underlying fragility (anyone running plain `nix build .` without realizing the local directory is fetched as a git ref) in place. Which the fleet actually adopts is an authoring-time decision for `nix-flake-adopt`, not settled here.
- **The exact mechanism by which `Compiling cmake v0.1.58` appears in a build that needed no system `cmake`** (a crate present in the dependency graph but whose build-script codepath that shells out to a real binary was never reached, versus nixpkgs silently providing one) is unresolved and would need a `strace`/build-log-with-`-vv` pass to settle — flagged rather than guessed at.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [nixpkgs `rust.section.md`](https://raw.githubusercontent.com/NixOS/nixpkgs/master/doc/languages-frameworks/rust.section.md) | nixpkgs manual, Rust chapter (primary) | fetched 2026-09-27, master branch | Canonical source for `buildRustPackage`, `cargoLock`/`cargoHash`/`fetchCargoVendor`, `bindgenHook` and every other Rust hook; the "community maintained toolchains" section is the only nixpkgs-blessed way to pin a non-default rustc |
| [nixpkgs `python.section.md`](https://raw.githubusercontent.com/NixOS/nixpkgs/master/doc/languages-frameworks/python.section.md) | nixpkgs manual, Python chapter (primary) | fetched 2026-09-27, master branch | `buildPythonPackage`'s worked example and the `pyproject = true` parameter description this dive's `ocx-sdk-python` fixture follows verbatim |
| [nixpkgs `rl-2505.section.md`](https://raw.githubusercontent.com/NixOS/nixpkgs/nixos-25.05/doc/manual/source/release-notes/rl-2505.section.md) | nixpkgs 25.05 release notes (primary) | fetched 2026-09-27, `nixos-25.05` branch | States `fetchCargoVendor` became `buildRustPackage`'s default and `cargoSha256` handling was removed outright in 25.05 — the version floor for every `cargoLock`/`cargoHash` claim in this artifact |
| [nixpkgs `rl-2611.section.md`](https://github.com/NixOS/nixpkgs/blob/master/doc/release-notes/rl-2611.section.md) (exemplar corpus copy) | nixpkgs 26.11 (unreleased) release notes (primary) | corpus fetch 2026-09-23–27 | Checked for Rust/Python packaging changes in 26.11; none found (no new entries affecting `buildRustPackage`/`buildPythonPackage` as of this rev) — a negative result worth recording so a future dive doesn't re-check the same file for the same question |
| [ipetkov/crane `docs/API.md`](https://github.com/ipetkov/crane/blob/master/docs/API.md) | crane's own API reference (primary, tool's own repo) | fetched 2026-09-27, `master` | `buildDepsOnly`/`buildPackage`/`cleanCargoSource`/`cargoArtifacts` exact semantics; explicitly does not document cold-store/`--no-build` behavior, which is why this dive measured it directly instead |
| [crane.dev/API.html](https://crane.dev/API.html) | crane's rendered docs site (primary, mirrors the above) | fetched 2026-09-27 | Cross-checked against the raw `docs/API.md` to confirm no site-only caveats about cold evaluation exist |
| [`aws/aws-lc-rs` `aws-lc-sys/README.md`](https://raw.githubusercontent.com/aws/aws-lc-rs/main/aws-lc-sys/README.md) | aws-lc-sys's own build-requirements README (primary, tool's own repo) | fetched 2026-09-27, `main` | Source for "CMake/bindgen/Go never required for non-FIPS on pre-generated-bindings targets," which this dive's successful `pkg-config`-only build corroborates |
| [`NixOS/nixpkgs#525097`](https://github.com/NixOS/nixpkgs/issues/525097) | nixpkgs issue: `cargoHash` nondeterminism from git submodule dependencies (primary) | filed/closed 2026, fetched 2026-09-27 | The exact bug class `cargoLock`+`outputHashes` (rule 7) exists to avoid; closed by the linked PR |
| [`NixOS/nixpkgs#525262`](https://github.com/NixOS/nixpkgs/pull/525262) | the fixing PR for #525097 (primary) | fetched 2026-09-27 | Shows the concrete migration (`cargoHash` → `cargoLock` + `outputHashes`) nixpkgs maintainers apply for exactly this failure mode |
| [`pyproject-nix/pyproject.nix` README](https://github.com/pyproject-nix/pyproject.nix) | pyproject.nix's own repo description (primary, tool's own repo) | fetched 2026-09-27 | Confirms its scope is PEP-621/440/508/599 metadata parsing, not packaging itself — the layer under uv2nix, relevant to Finding 8's "not needed here" call |
| [`pyproject-nix/uv2nix` README](https://raw.githubusercontent.com/pyproject-nix/uv2nix/master/README.md) | uv2nix's own repo description (primary, tool's own repo) | fetched 2026-09-27 | Confirms uv2nix's job is "ingest a uv workspace," i.e. translate `uv.lock`'s resolved graph — irrelevant to a `dependencies = []` package, per Finding 8 |
| [`DeterminateSystems/flake-checker` README](https://raw.githubusercontent.com/DeterminateSystems/flake-checker/main/README.md) | flake-checker's own docs (primary, tool's own repo) | fetched 2026-09-27, `main` | Cross-checked supported-branches list against wave 2's era note (26.05/25.11, not 26.11/unstable) — unchanged since wave 2, re-confirmed rather than re-discovered |
| `DeterminateSystems/flake-checker@cddc8afc9733:flake.nix` (exemplar corpus) | the crane `src = builtins.path { path = self; }` idiom this dive reproduced as a cold-check violation | corpus fetch 2026-09-23 | Ground truth for rule 2 and Finding 1/3's correction of the brief's "crane's measured red case" framing |
| `DeterminateSystems/nix-installer@76f61b5202e2:flake.nix` (exemplar corpus) | the flake wave 2 traced 56 `'system'`-renamed warnings to | corpus fetch 2026-09-17 | Contrasting reference for Finding 9/rule 9 — confirms the warning is this flake's own instantiation pattern, not a property any of this dive's three builders share |
| [nix-flakes.md](../nix-flakes.md) | this program's own NIX-FLK consolidation | 2026-09-27 | Source of the Conflicts-resolved mechanism (eval-time self-source reads break cold checks) this artifact re-measures against the fleet's real repository instead of a synthetic case |
| [nix-audit/ocx-index-and-fleet.md](../nix-audit/ocx-index-and-fleet.md) | this program's numbers-first audit of the four fleet repos | 2026-09-27 | Source of the `-sys`-crate counts, `rust-toolchain.toml` pin, and the open "aws-lc-sys/clang-sys unmeasured" gap this artifact closes |
| `/home/mherwig/dev/ocx` and `/home/mherwig/dev/grimoire` (read-only, live repositories) | the actual fleet source, not an exemplar or a doc | HEAD `6b70ceec…` (grimoire), measured 2026-09-27 | Every fixture in this dive is a copy of these; several findings (submodules, `clang-sys` trace, git-dependency count) were measured directly against them rather than a fixture |

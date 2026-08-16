---
title: CI, Release Engineering and Distribution for Rust CLIs
topic: CI pipelines, caching, cross-compilation and releases for production Rust CLI tools
agent: rust-tooling-ci
model: sonnet
date_researched: 2026-08
sources_count: 23
scope: |
  Covers GitHub Actions CI job design, Rust-specific caching (Swatinem/rust-cache, sccache),
  cross-compilation tooling (cross, cargo-zigbuild, musl/glibc), release automation
  (cargo-dist, release-plz, git-cliff), crates.io trusted publishing, binary artifact tuning
  (profile.release), docs.rs metadata, and supply-chain CI gates (cargo-deny, action pinning).
  Does NOT cover non-GitHub CI systems (GitLab CI, Buildkite), Rust language/API design, or
  runtime application security beyond the CI/release surface.
---

## Table of contents

1. [CI job design](#1-ci-job-design)
2. [Caching](#2-caching)
3. [Matrix: OS/arch/toolchain and MSRV](#3-matrix-osarchtoolchain-and-msrv)
4. [Cross-compilation tooling](#4-cross-compilation-tooling)
5. [Release automation](#5-release-automation)
6. [crates.io trusted publishing](#6-cratesio-trusted-publishing)
7. [Binary artifact tuning](#7-binary-artifact-tuning)
8. [Docs](#8-docs)
9. [Supply-chain gates in CI](#9-supply-chain-gates-in-ci)
10. [Complete annotated example workflow set](#10-complete-annotated-example-workflow-set)
11. [Normative guidance candidates](#normative-guidance-candidates)
12. [AI-agent angle](#ai-agent-angle)
13. [Contested / evolving](#contested--evolving)
14. [Sources](#sources)

## Summary

- Order CI jobs cheapest-fails-first: `fmt` → `clippy` → `build`/`test` → `deny`/`audit` → `docs`; a real-world 200k-LOC Rust project targets roughly 10-minute CI on GitHub Actions when tuned ([matklad](https://matklad.github.io/2021/09/04/fast-rust-builds.html)).
- Run `cargo clippy --workspace --all-targets --all-features --locked -- -D warnings` as the single lint gate; astral-sh/uv runs exactly this on both Linux and Windows runners ([uv check-lint.yml](https://github.com/astral-sh/uv/blob/main/.github/workflows/check-lint.yml)).
- Pin every third-party GitHub Action to a full 40-character commit SHA, not a tag — tags are mutable and GitHub's own hardening guide calls SHA pinning "the only way to use an action as an immutable release" ([GitHub security hardening docs](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)).
- Set `permissions: {}` at the workflow level and grant only what each job needs (`contents: read`, `id-token: write`, etc.) — uv's every workflow file starts with `permissions: {}` ([uv ci.yml](https://github.com/astral-sh/uv/blob/main/.github/workflows/ci.yml)).
- Add `merge_group:` as a trigger alongside `pull_request:` whenever required checks gate a merge queue, or GitHub will silently fail to report the required status when the PR enters the queue ([GitHub Actions events docs](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows)).
- `Swatinem/rust-cache` caches `~/.cargo` and `./target` but deliberately does *not* cache the workspace's own crates, and excludes `~/.cargo/registry/src` since Cargo rebuilds it cheaply from compressed archives ([rust-cache README](https://github.com/Swatinem/rust-cache/blob/master/README.md)).
- Restrict `rust-cache` saves to the main branch with `save-if: ${{ github.ref == 'refs/heads/main' }}` to avoid cache eviction churn from short-lived PR branches ([rust-cache README](https://github.com/Swatinem/rust-cache/blob/master/README.md)).
- Advisory (`cargo-deny check advisories`) checks should run with `continue-on-error: true` in a separate matrix leg from `bans`/`licenses`/`sources`, because a newly published RustSec advisory can fail CI on unrelated code with no way for the author to fix it ([cargo-deny-action README](https://github.com/EmbarkStudios/cargo-deny-action)).
- `cross` cross-compiles via Docker/Podman containers with prebuilt toolchains for 50+ targets and QEMU test execution; `cargo-zigbuild` instead uses Zig as the linker and lets you pin a glibc floor directly in the target triple, e.g. `--target aarch64-unknown-linux-gnu.2.17` ([cross README](https://github.com/cross-rs/cross), [cargo-zigbuild README](https://github.com/rust-cross/cargo-zigbuild)).
- `cargo-dist` (the `dist` tool) turns a git tag into a full GitHub Release: it generates its own `release.yml` implementing plan → build → host → publish → announce, and can run the "plan" stage on PRs to catch config errors before a real release ([dist book](https://axodotdev.github.io/cargo-dist/book/)).
- crates.io now supports OIDC "trusted publishing": `rust-lang/crates-io-auth-action` exchanges a GitHub Actions OIDC JWT for a short-lived, auto-revoked crates.io token, eliminating long-lived `CARGO_REGISTRY_TOKEN` secrets ([crates-io-auth-action README](https://github.com/rust-lang/crates-io-auth-action)); the feature is live in the crates.io codebase with dozens of merged trustpub PRs as of mid-2026 (`gh search` on rust-lang/crates.io).
- `release-plz` maintains a standing "release PR" that bumps versions/changelog from Conventional Commits + `cargo-semver-checks` API-diffing, and publishes to crates.io only once that PR is merged ([release-plz README](https://github.com/release-plz/release-plz)).
- Default `profile.release` is `opt-level = 3`, `lto = false`, `codegen-units = 16`, `strip = "none"`, `panic = "unwind"`, `debug = false` — every one of these is a deliberate lever a CLI should override in a `[profile.dist]`/custom profile, not accept as-is ([Cargo profiles reference](https://doc.rust-lang.org/cargo/reference/profiles.html)).
- `strip = "symbols"` plus `lto = "thin"` or `"fat"` plus `codegen-units = 1` is the standard "ship a small, fast CLI binary" combination; `opt-level = "z"` trades runtime speed for size further ([Cargo profiles reference](https://doc.rust-lang.org/cargo/reference/profiles.html)).
- `sccache` is a compiler-cache (ccache-style) distinct from `rust-cache`'s artifact caching: it caches individual object-file compilations (even across branches/machines via S3/GCS/GHA backends) but explicitly cannot cache anything that invokes the system linker or runs under incremental compilation ([sccache README](https://github.com/mozilla/sccache)).
- `CARGO_INCREMENTAL=0` is standard in CI (not local dev) because CI builds are effectively from-scratch every time and incremental compilation only adds cache-write overhead ([matklad](https://matklad.github.io/2021/09/04/fast-rust-builds.html), corroborated by uv setting it in every workflow's `env:` block).
- `dtolnay/rust-toolchain` supports MSRV-relative pins like `stable minus 8 releases`, useful for a rolling "N versions back" MSRV policy without hand-editing a version string every release ([rust-toolchain README](https://github.com/dtolnay/rust-toolchain)).
- `cargo-msrv verify` (reading `package.rust-version` from `Cargo.toml`) is the standard CI check that the declared MSRV still compiles, using binary search to *find* the MSRV when unset ([cargo-msrv README](https://github.com/foresterre/cargo-msrv)).
- `[package.metadata.docs.rs]` supports `all-features`, `default-target`, `targets`, `rustdoc-args`, `features`, `no-default-features`, `rustc-args`, `cargo-args` — the escape hatch for docs.rs builds that need e.g. platform-specific code or `--cfg docsrs` gating ([docs.rs metadata reference](https://docs.rs/about/metadata)).
- `actions/attest-build-provenance` generates signed SLSA build-provenance attestations (Sigstore-backed) for release artifacts, verifiable by consumers via `gh attestation verify`; as of v4 it's a thin wrapper over `actions/attest` and new projects should call that directly ([attest-build-provenance README](https://github.com/actions/attest-build-provenance)).
- `cargo-binstall` resolves prebuilt binaries straight from GitHub Releases using a `[package.metadata.binstall] pkg-url` template (`{ repo }`, `{ version }`, `{ target }`, `{ archive-format }`); a CLI's release artifact naming should match this convention if fast-install adoption matters ([cargo-binstall README](https://github.com/cargo-bins/cargo-binstall)).

## Findings

### 1. CI job design

The canonical fast-fail ordering for a Rust CLI is: **format check → lint (clippy) → build/test → supply-chain (deny/audit) → docs**, each cheaper and more likely to fail than the next. GitHub's own matrix-strategy docs confirm the default matrix behavior cancels in-progress/queued jobs on a non-experimental failure when `fail-fast: true` (the default), so ordering matters for wall-clock cost when jobs run in parallel legs of the same workflow rather than strictly sequentially — the real win comes from running the cheap jobs (fmt, a `--check` build) as separate, fast jobs so a trivial style break fails in seconds rather than waiting on the full test matrix ([GitHub matrix docs](https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs)).

A production example (astral-sh/uv, a large real-world Rust CLI) structures this as **reusable workflows** fanned out from one `ci.yml`, gated by a `plan` job that computes booleans like `test-code`, `run-checks`, `save-rust-cache` from changed-file detection, so unrelated changes (e.g. docs-only PRs) skip the expensive Rust build/test jobs entirely (`gh api repos/astral-sh/uv/contents/.github/workflows/ci.yml`). Concurrency is capped per-ref with `cancel-in-progress: true` so superseded pushes to the same PR don't burn CI minutes:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref_name }}-${{ github.event.pull_request.number || github.sha }}
  cancel-in-progress: true
```

**PR vs merge-queue vs nightly**: `pull_request` triggers run on every push to an open PR; a **merge queue** uses the distinct `merge_group` event, which "triggers when a pull request is added to a merge queue" and must be added explicitly as a trigger or "status checks will not be triggered when you add a pull request to a merge queue," causing the merge to hang since the required check never reports ([GitHub Actions events docs](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows)):

```yaml
on:
  pull_request:
    branches: ["main"]
  merge_group:
    types: [checks_requested]
```

Nightly/scheduled jobs (`schedule:` cron) are the right place for things that are expensive, non-deterministic across time (advisory databases), or only meaningful periodically: full OS×arch build matrices, `cargo update` + re-test ("dependency drift" canary), and `cargo-audit`/`cargo-deny advisories` reruns against an unchanged `Cargo.lock` (the advisory DB itself changes daily even if code doesn't).

**Wall-clock budget**: a well-tuned ~200k-LOC Rust project should land around **10 minutes** of CI on GitHub Actions runners, per matklad (rust-analyzer's former lead, an authority on Rust build performance) — beyond that, the fix is almost always dependency-graph shape (flatten deep chains, push proc-macro-heavy crates to the leaves) rather than more CPU ([matklad, "Fast Rust Builds"](https://matklad.github.io/2021/09/04/fast-rust-builds.html)).

### 2. Caching

**`Swatinem/rust-cache`** is the de facto standard GitHub Action for Cargo caching. Its cache key is built from: the GitHub job ID, the rustc release/host/hash, and (when `add-rust-environment-hash-key` is on, the default) a hash of all `Cargo.toml`/`Cargo.lock` files, any `rust-toolchain`/`rust-toolchain.toml` files, and `.cargo/config.toml`. It caches `~/.cargo` (registry index, downloaded crate archives, git deps, installed binaries) and `./target`, but **explicitly does not cache the workspace's own crates** ("generally not effective") and skips `~/.cargo/registry/src` because Cargo cheaply regenerates unpacked sources from the `.crate` archives already in `~/.cargo/registry/cache` ([rust-cache README](https://github.com/Swatinem/rust-cache/blob/master/README.md)).

Key parameters:

| Param | Purpose |
|---|---|
| `prefix-key` | Bump to force a fresh cache lineage (default `"v0-rust"`) |
| `shared-key` | Stable key across jobs, bypassing the automatic per-job key |
| `key` | Extra differentiator alongside the automatic key |
| `save-if` | Conditional save, e.g. only save from `main` |
| `cache-on-failure` | Whether a failed job still saves its cache (default `false`) |

Real-world usage restricts writes to the trunk branch to avoid PR-branch cache churn evicting the shared cache:

```yaml
- uses: Swatinem/rust-cache@c19371144df3bb44fab255c43d04cbc2ab54d1c4 # v2.9.1
  with:
    save-if: ${{ github.ref == 'refs/heads/main' }}
```

uv instead gates on `inputs.save-rust-cache`, computed once in a `plan` job.

**`sccache`** is a different layer: a `ccache`-style *compiler wrapper* (`RUSTC_WRAPPER=sccache` or `[build] rustc-wrapper` in `.cargo/config.toml`) that caches individual compilation units, not whole `target/` trees. It supports many storage backends — local disk, S3, GCS, Azure, Redis, and a GitHub Actions cache backend — which lets it share a cache across machines/branches in ways directory-based caching cannot. Its README is explicit about a hard limitation: **"crates that invoke the system linker cannot be cached,"** and incremental compilation defeats it entirely, so `CARGO_INCREMENTAL=0` is required alongside it for it to be effective ([sccache README](https://github.com/mozilla/sccache)).

**Target-dir hygiene / poisoning**: the biggest practical caching failure mode is a stale `target/` cache that contains build artifacts for a different rustc version, feature set, or `RUSTFLAGS` than the current job — `rust-cache`'s inclusion of the rustc hash and `Cargo.lock` hash in the key is precisely the mitigation; a hand-rolled `actions/cache` setup that keys only on `Cargo.lock` (ignoring rustc version or `RUSTFLAGS`) is a classic self-inflicted poisoning bug.

**Registry vs target caching**: cache the Cargo registry (`~/.cargo/registry/cache`, `~/.cargo/git`) and build `target/` separately in spirit even when one action handles both — registry cache hits save network I/O (crate downloads), target cache hits save CPU (recompilation); a CI job that only restores the registry but not `target/` still saves meaningfully on network-constrained runners but not on compile-bound ones.

### 3. Matrix: OS/arch/toolchain and MSRV

The combinations that matter for a cross-platform Rust CLI shipped as prebuilt binaries:

| Target | Why it's in the matrix |
|---|---|
| `x86_64-unknown-linux-gnu` | Default Linux desktop/server target |
| `x86_64-unknown-linux-musl` | Static binary, works in minimal containers (scratch/alpine), no glibc floor to manage |
| `aarch64-unknown-linux-gnu` | ARM servers/devices (AWS Graviton, Raspberry Pi 64-bit) |
| `x86_64-apple-darwin` | Intel Mac |
| `aarch64-apple-darwin` | Apple Silicon Mac — now the default new-Mac target |
| `x86_64-pc-windows-msvc` | Standard Windows target; MSVC preferred over `-gnu` for better ecosystem compatibility and no MinGW runtime dependency |

`x86_64-pc-windows-gnu` is a minority target kept mainly for cross-compiling from Linux without MSVC tooling; most projects don't ship it as a primary release artifact.

**MSRV job**: run `cargo msrv verify` (or a manually pinned `dtolnay/rust-toolchain@<msrv-version>` + `cargo check --locked`) against the version declared in `package.rust-version`. `cargo-msrv` uses binary search over installed toolchains to *discover* an MSRV when one isn't set, and `cargo msrv verify` is the CI-appropriate command once it is ([cargo-msrv README](https://github.com/foresterre/cargo-msrv)). `dtolnay/rust-toolchain` additionally accepts relative expressions like `stable minus 8 releases`, letting a "rolling N-version MSRV" policy stay correct without editing a hardcoded version every stable release ([rust-toolchain README](https://github.com/dtolnay/rust-toolchain)).

**Beta/nightly canary jobs**: typically `continue-on-error: true` (non-blocking) jobs run on a schedule or on push to main, using `dtolnay/rust-toolchain@beta` / `@nightly`, to catch upcoming compiler breakage early without blocking merges on toolchain flakiness that's out of the project's control.

### 4. Cross-compilation tooling

Two dominant approaches, with different tradeoffs:

**`cross`** — containerized cross-compilation via Docker or Podman (hard requirement, v20.10+/v3.4.0+ respectively). Ships prebuilt images with toolchains and system libraries for 50+ targets (ARM/ARM64, MIPS, PowerPC, RISC-V, s390x, WASM, BSD/Solaris), most runnable under QEMU for `cross test` as well as `cross build`. glibc versions are baked per-image (as low as 2.12 in some images, CentOS-based images available for older floors like glibc 2.17) ([cross README](https://github.com/cross-rs/cross)). Cost: Docker/Podman must be available in CI (GitHub-hosted Linux runners have it; macOS/Windows runners generally don't without extra setup), and image pulls add wall-clock time.

**`cargo-zigbuild`** — uses the Zig toolchain's `cc` as the linker, avoiding the container dependency entirely; `cargo zigbuild --target <triple>` after installing the Rust target via rustup. Its standout feature is pinning a **glibc version floor directly in the target string**: `cargo zigbuild --target aarch64-unknown-linux-gnu.2.17` produces a binary that runs on any glibc ≥ 2.17 (e.g. CentOS 7 / manylinux2014-era systems) without needing an old-glibc container image — Zig links against its own bundled glibc stub headers for the requested version ([cargo-zigbuild README](https://github.com/rust-cross/cargo-zigbuild)). The README notes this feature has caveats/fallback behavior and incompatibility with certain compiler flags, so it should be verified per-target rather than assumed universal.

**Static musl builds** (`--target x86_64-unknown-linux-musl`, no cross tool needed if the musl target + linker are installed) sidestep the glibc-floor problem entirely by statically linking a libc — the standard choice for a CLI that must "just run" on any Linux without dependency on the host's glibc version, at the cost of typically larger binaries and occasional friction with C dependencies that assume glibc.

**`cargo build --target <triple>`** alone works only when a suitable cross-linker is already on `PATH` (e.g. targeting one Linux libc flavor from another, or when using `rust-lld`) — it is the "no tool" baseline that `cross` and `cargo-zigbuild` exist to make robust across more target/host combinations.

### 5. Release automation

**`cargo-dist` (the `dist` tool)** is the most complete "git tag → full release" automation for Rust binaries. `dist init` generates a self-maintaining `release.yml` GitHub Actions workflow implementing a five-stage pipeline: **plan → build → publish → host → announce**. The "plan" stage alone can run on pull requests to validate release config before a tag is ever pushed, catching e.g. missing installer targets or malformed changelogs early. It generates installers (shell script, PowerShell, MSI, npm package, Homebrew formula) and wires in GitHub attestations + checksums for supply-chain verification, plus Windows code-signing support. A stated design goal is that the exact commands CI runs are runnable locally too, avoiding "works in CI, not locally" drift ([dist book](https://axodotdev.github.io/cargo-dist/book/)). `dist` composes with `cargo-release` for the purely mechanical parts (version bump, changelog heading, git tag) — the dist book has a dedicated guide for that combination.

**`release-plz`** takes a different, PR-centric approach: it continuously maintains an open "release PR" that bumps `Cargo.toml` versions, regenerates the changelog via `git-cliff`, and stages a crates.io publish — driven by parsing Conventional Commits *and* running `cargo-semver-checks` to catch API-breaking changes commit messages didn't flag. Merging that PR triggers the actual tag + `crates.io` publish + GitHub/Gitea/GitLab release creation. It ships both as a GitHub Action and a standalone CLI usable from other CI systems ([release-plz README](https://github.com/release-plz/release-plz)).

**`git-cliff`** is the changelog engine underneath both: it parses commit history (Conventional Commits natively, or custom regex parsers) into grouped, versioned changelog sections, and can pull PR titles/numbers/authors from GitHub/GitLab/Gitea. Its own docs recommend **squash-merging PRs** so each landed commit maps 1:1 to a changelog-worthy change, since a linear history with one commit per logical change is what the type-prefix parsing (`feat:` → minor, `fix:` → patch, `!` → major) depends on for reliable grouping ([git-cliff docs](https://git-cliff.org/docs/)).

**`cargo-release`** (the older, more manual tool) predates both — it automates the mechanical version-bump/tag/publish sequence but leaves changelog content and CI wiring to the caller; `cargo-dist` explicitly builds on top of it for that narrow mechanical role rather than reimplementing it.

**Conventional Commits + semver automation**: the pattern that both `release-plz` and `git-cliff`-based pipelines share is deriving the *next version* from commit-message types (`fix:`→patch, `feat:`→minor, `BREAKING CHANGE:`/`!`→major) rather than a human choosing a bump — this only stays correct if commit messages are enforced (via a commit-lint CI check or squash-merge commit-title editing) since a stray unconventional commit silently fails to influence the version bump.

**Distribution channels beyond GitHub Releases** — `dist`-style pipelines can generate a Homebrew formula (tap repo), an npm wrapper package (publishes a thin JS shim that downloads the right platform binary — the pattern esbuild/swc popularized), and Scoop manifests for Windows; AUR packaging is typically maintained separately (a `PKGBUILD` in a community-maintained AUR repo) since Arch's package acceptance model doesn't fit an automated upstream-push flow.

### 6. crates.io trusted publishing

crates.io has shipped **OIDC-based trusted publishing**, eliminating the need to store a long-lived `CARGO_REGISTRY_TOKEN` as a repository secret. The official action, `rust-lang/crates-io-auth-action`, exchanges a GitHub Actions-issued OIDC JWT for a short-lived crates.io access token that is automatically revoked when the job ends:

```yaml
permissions:
  id-token: write   # required: lets GitHub issue the OIDC JWT

steps:
  - name: Authenticate with crates.io
    id: auth
    uses: rust-lang/crates-io-auth-action@v1

  - name: Publish to crates.io
    run: cargo publish --token ${{ steps.auth.outputs.token }}
```

The trust relationship (which repo/workflow is allowed to publish which crate) is configured once on the crate's crates.io settings page, not as a GitHub secret at all ([crates-io-auth-action README](https://github.com/rust-lang/crates-io-auth-action)). Searching the `rust-lang/crates.io` repository confirms the feature is live and actively developed as of mid-2026 — merged PRs include a Svelte frontend for trusted-publisher settings, GitLab CI support in progress, and even the crates.io project's own internal smoke tests migrated to trusted publishing instead of a stored token (`gh search prs "trusted publishing" repo:rust-lang/crates.io`, e.g. [#13381](https://github.com/rust-lang/crates.io/pull/13381), [#13153](https://github.com/rust-lang/crates.io/pull/13153)).

This directly upgrades the standard `cargo login` / `cargo publish --token $CARGO_REGISTRY_TOKEN` flow described in the Cargo Book's publishing reference, which is still the fallback for non-OIDC CI systems and manual publishes ([Cargo Book publishing reference](https://doc.rust-lang.org/cargo/reference/publishing.html)).

### 7. Binary artifact tuning

Cargo's default `[profile.release]` is tuned for a reasonable general-purpose default, not for a shipped CLI binary:

```toml
# Cargo's built-in defaults (not written anywhere — this is what applies unless overridden)
[profile.release]
opt-level = 3
lto = false
codegen-units = 16
debug = false
strip = "none"
panic = "unwind"
incremental = false
```

A production CLI release profile typically overrides several of these ([Cargo profiles reference](https://doc.rust-lang.org/cargo/reference/profiles.html)):

```toml
[profile.dist]
inherits = "release"
lto = "thin"          # or "fat" for max optimization at the cost of link time
codegen-units = 1      # slower build, better inlining/optimization across the whole crate graph
strip = "symbols"      # smaller binary; drop if you want panic backtraces with symbol names
panic = "abort"        # smaller binary, faster panics — but no unwinding-based cleanup/catch_unwind
```

Tradeoff table (from the Cargo reference, annotated):

| Goal | Settings |
|---|---|
| Smallest binary | `opt-level = "z"`, `strip = "symbols"`, `lto = "fat"` |
| Fastest runtime | `opt-level = 3`, `lto = "fat"`, `codegen-units = 1` |
| Cargo's default | `opt-level = 3`, `lto = false`, `codegen-units = 16` |
| Fastest compile | `opt-level = 0`, `codegen-units = 256`, `lto = false` |

`panic = "abort"` is a real tradeoff, not a free win, for a CLI: it shrinks the binary and speeds up panics, but it also means no `catch_unwind`-based recovery (relevant if the CLI is ever embedded as a library, or uses `catch_unwind` at a top-level command dispatcher to convert a panic into a clean non-zero exit with a message) — most CLI-only crates choose it anyway since they don't offer a library API that needs unwinding, but a CLI shipped as `grim`/`ocx` that also exposes a library crate should keep `panic = "unwind"` for the lib and let only the final binary crate use `abort` (workspace-level profile overrides apply per final artifact, not selectively per intermediate crate, so this requires structuring the release profile at the binary-crate boundary, not assuming it composes automatically).

`strip = "debuginfo"` (vs `"symbols"`) is the compromise when you want smaller binaries but still want symbol names in a crash reporter or `RUST_BACKTRACE=1` output without full DWARF debug info.

uv's release build additionally shows a real linker-choice optimization: switching to Rust's bundled `rust-lld` with Identical Code Folding (`-C link-arg=--icf=safe`) reduced the macOS x86_64 binary size by ~2% (`gh api` fetch of `build-release-binaries.yml`, comment: `# Use Rust's bundled Mach-O LLD, which supports ICF. ICF reduces the macOS x86_64 uv binary size by ~2%.`).

### 8. Docs

`[package.metadata.docs.rs]` in `Cargo.toml` controls how docs.rs builds documentation for a published crate, independent of local `cargo doc`:

```toml
[package.metadata.docs.rs]
all-features = true
targets = ["x86_64-unknown-linux-gnu", "x86_64-pc-windows-msvc", "aarch64-apple-darwin"]
rustdoc-args = ["--cfg", "docsrs"]
```

Supported keys: `all-features`, `default-target`, `targets` (falls back to all Tier-1 targets if unset, landing page built with `x86_64-unknown-linux-gnu`), `features`, `no-default-features`, `rustdoc-args`, `rustc-args`, `cargo-args` ([docs.rs metadata reference](https://docs.rs/about/metadata)). The `--cfg docsrs` convention (paired with `#[cfg_attr(docsrs, doc(cfg(feature = "…")))]` in source) is how crates show "available on feature X only" badges on docs.rs without affecting normal builds — this is a widely used idiom even though the fetched docs.rs page itself didn't spell out the attribute syntax; it's documented in the `#[doc(cfg(...))]` unstable rustdoc feature that docs.rs enables by default for every crate build.

`cargo doc --no-deps -D warnings` (or `RUSTDOCFLAGS="-D warnings" cargo doc --no-deps`) is the standard CI gate for catching broken intra-doc links and other rustdoc lints (`rustdoc::broken_intra_doc_links` is warn-by-default) before they ship to docs.rs.

For a project-level book or wider docs site (as opposed to per-crate API docs), GitHub Pages deployment from a `mdbook build` step in a dedicated `docs.yml`/`publish-docs.yml` workflow, gated on `main` pushes only, is the standard pattern — uv's own workflow list includes a separate `publish-docs.yml` for exactly this purpose.

### 9. Supply-chain gates in CI

**`cargo-deny`** (via `EmbarkStudios/cargo-deny-action` in CI) checks four categories against a `deny.toml`: **advisories** (RustSec vulnerability database), **bans** (denylisted crates/versions, duplicate-version detection), **licenses** (an allow/deny list of SPDX license expressions across the whole dependency tree), and **sources** (only trusted registries/git hosts) ([cargo-deny book](https://embarkstudios.github.io/cargo-deny/)). The action's own README recommends splitting `advisories` into its own matrix leg with `continue-on-error: true`, specifically because a brand-new RustSec advisory can fail CI on a PR that touched nothing related to the vulnerable dependency — treating that as a hard PR-blocking failure punishes the wrong commit:

```yaml
strategy:
  matrix:
    checks:
      - advisories
      - bans licenses sources
continue-on-error: ${{ matrix.checks == 'advisories' }}
steps:
  - uses: EmbarkStudios/cargo-deny-action@v2
    with:
      command: check ${{ matrix.checks }}
```

([cargo-deny-action README](https://github.com/EmbarkStudios/cargo-deny-action)). `bans`/`licenses`/`sources` are deterministic given a fixed `Cargo.lock`, so they belong in the blocking PR gate; `advisories` is time-varying (the DB updates independently of your code) so it belongs in a scheduled/nightly job as the primary gate, with the PR-time check as an early warning only.

**Action pinning and minimal permissions** are the other half of the supply-chain surface. GitHub's hardening guide states pinning to a full commit SHA is "currently the only way to use an action as an immutable release," since a compromised or re-tagged action version otherwise silently changes what code runs with repository secrets; it further recommends defaulting `GITHUB_TOKEN` to `contents: read` and elevating only per-job ([GitHub security hardening docs](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)). Every workflow file in uv (a large real production Rust CLI) follows this exactly — every third-party `uses:` is SHA-pinned with a version comment, and every workflow starts `permissions: {}`:

```yaml
permissions: {}
jobs:
  clippy:
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
```

`persist-credentials: false` on `actions/checkout` is a related, easy-to-miss hardening step: without it, the job's `GITHUB_TOKEN` is left configured in the local git credential helper, exposing it to any subsequent step (including third-party build scripts) that shells out to `git`.

**`zizmor`** — a dedicated GitHub Actions *workflow* security linter (distinct from dependency-focused `cargo-deny`) — is run as its own CI job in uv, uploading SARIF results to GitHub code scanning via `security-events: write`:

```yaml
jobs:
  zizmor:
    permissions:
      security-events: write
    steps:
      - uses: zizmorcore/zizmor-action@3dc1ecc9bcb9e94e9b2c709687979e1298497054 # v0.6.2
```

**`actions/attest-build-provenance`** generates a Sigstore-signed SLSA build-provenance attestation for release artifacts, consumer-verifiable with `gh attestation verify <artifact>`; as of v4 the action is a thin wrapper over the lower-level `actions/attest` action, which new projects are advised to call directly ([attest-build-provenance README](https://github.com/actions/attest-build-provenance)). This is the mechanism `cargo-dist` wires in automatically for its generated release artifacts.

**`cargo shear`** (unused-dependency detection, `cargo shear --deny-warnings`) and `typos` (`crate-ci/typos`, a fast spell-checker for source/docs) round out uv's supply-chain-adjacent CI gates — neither is Rust-security-specific but both are cheap, high-signal CI jobs worth the ~10s they cost.

### 10. Complete annotated example workflow set

A composite, synthesized from the patterns above (uv's reusable-workflow structure, `rust-cache`, `cargo-deny`, SHA-pinned actions, trusted publishing) — illustrative, not copy-paste-ready for any specific repo, but representative of what a serious 2026 Rust CLI runs:

```yaml
# .github/workflows/ci.yml — fast PR + merge-queue gate
name: CI
on:
  pull_request:
  merge_group:
    types: [checks_requested]
  push:
    branches: [main]

permissions: {}

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  fmt:
    runs-on: ubuntu-latest
    permissions: { contents: read }
    steps:
      - uses: actions/checkout@<sha> # v4.x
        with: { persist-credentials: false }
      - uses: dtolnay/rust-toolchain@<sha> # stable, with rustfmt
        with: { toolchain: stable, components: rustfmt }
      - run: cargo fmt --all -- --check

  clippy:
    needs: fmt   # cheap gate first
    runs-on: ubuntu-latest
    permissions: { contents: read }
    steps:
      - uses: actions/checkout@<sha>
        with: { persist-credentials: false }
      - uses: dtolnay/rust-toolchain@<sha>
        with: { toolchain: stable, components: clippy }
      - uses: Swatinem/rust-cache@<sha>
        with: { save-if: "${{ github.ref == 'refs/heads/main' }}" }
      - run: cargo clippy --workspace --all-targets --all-features --locked -- -D warnings

  test:
    needs: clippy
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    permissions: { contents: read }
    steps:
      - uses: actions/checkout@<sha>
        with: { persist-credentials: false }
      - uses: dtolnay/rust-toolchain@<sha>
        with: { toolchain: stable }
      - uses: Swatinem/rust-cache@<sha>
        with: { save-if: "${{ github.ref == 'refs/heads/main' }}" }
      - run: cargo test --workspace --all-features --locked

  msrv:
    needs: fmt
    runs-on: ubuntu-latest
    permissions: { contents: read }
    steps:
      - uses: actions/checkout@<sha>
        with: { persist-credentials: false }
      - run: cargo install cargo-msrv --locked
      - run: cargo msrv verify

  deny:
    needs: fmt
    runs-on: ubuntu-latest
    permissions: { contents: read }
    strategy:
      matrix:
        checks: [advisories, "bans licenses sources"]
    continue-on-error: ${{ matrix.checks == 'advisories' }}
    steps:
      - uses: actions/checkout@<sha>
        with: { persist-credentials: false }
      - uses: EmbarkStudios/cargo-deny-action@<sha>
        with: { command: "check ${{ matrix.checks }}" }

  docs:
    needs: fmt
    runs-on: ubuntu-latest
    permissions: { contents: read }
    steps:
      - uses: actions/checkout@<sha>
        with: { persist-credentials: false }
      - uses: dtolnay/rust-toolchain@<sha>
        with: { toolchain: stable }
      - run: cargo doc --no-deps --workspace --all-features
        env: { RUSTDOCFLAGS: "-D warnings" }

  zizmor:
    runs-on: ubuntu-latest
    permissions: { contents: read, security-events: write }
    steps:
      - uses: actions/checkout@<sha>
        with: { persist-credentials: false }
      - uses: zizmorcore/zizmor-action@<sha>
```

```yaml
# .github/workflows/nightly.yml — non-blocking canaries, on schedule
name: Nightly
on:
  schedule: [{ cron: "0 6 * * *" }]

permissions: {}

jobs:
  beta-nightly-toolchain:
    strategy:
      fail-fast: false
      matrix: { toolchain: [beta, nightly] }
    continue-on-error: true
    runs-on: ubuntu-latest
    permissions: { contents: read }
    steps:
      - uses: actions/checkout@<sha>
        with: { persist-credentials: false }
      - uses: dtolnay/rust-toolchain@<sha>
        with: { toolchain: "${{ matrix.toolchain }}" }
      - run: cargo test --workspace --all-features

  advisories:
    runs-on: ubuntu-latest
    permissions: { contents: read, issues: write } # to file/comment on new advisories
    steps:
      - uses: actions/checkout@<sha>
        with: { persist-credentials: false }
      - uses: EmbarkStudios/cargo-deny-action@<sha>
        with: { command: check advisories }
```

```yaml
# .github/workflows/release.yml — tag-triggered, dist-generated skeleton
name: Release
on:
  push:
    tags: ["v[0-9]+.[0-9]+.[0-9]+*"]
  pull_request: {} # dist's "plan" stage validates config on PRs too

permissions: {}

jobs:
  plan:
    runs-on: ubuntu-latest
    permissions: { contents: read }
    steps:
      - uses: actions/checkout@<sha>
        with: { persist-credentials: false }
      - run: dist plan --output-format=json

  build-local-artifacts:
    needs: plan
    strategy:
      matrix:
        target:
          - x86_64-unknown-linux-gnu
          - x86_64-unknown-linux-musl
          - aarch64-unknown-linux-gnu
          - x86_64-apple-darwin
          - aarch64-apple-darwin
          - x86_64-pc-windows-msvc
    runs-on: ${{ contains(matrix.target, 'windows') && 'windows-latest' || contains(matrix.target, 'apple') && 'macos-latest' || 'ubuntu-latest' }}
    permissions: { contents: read, id-token: write, attestations: write }
    steps:
      - uses: actions/checkout@<sha>
        with: { persist-credentials: false }
      - run: dist build --target ${{ matrix.target }}
      - uses: actions/attest-build-provenance@<sha>
        with: { subject-path: "dist-out/*" }

  publish:
    needs: build-local-artifacts
    runs-on: ubuntu-latest
    permissions: { contents: write, id-token: write } # id-token for crates.io trusted publishing
    steps:
      - uses: actions/checkout@<sha>
        with: { persist-credentials: false }
      - uses: rust-lang/crates-io-auth-action@<sha>
        id: auth
      - run: cargo publish --token ${{ steps.auth.outputs.token }}
      - run: dist host --steps=upload,release  # creates the GitHub Release with checksums
```

Rationale annotations: `fmt`/`clippy`/`msrv`/`deny`/`docs` all fan out from the cheap `fmt` job so a formatting break fails in seconds without waiting on cross-platform test matrix; `test` is the most expensive leg and runs last-in-dependency-order but in parallel across OSes with `fail-fast: false` (an OS-specific failure shouldn't hide failures on the others); the advisories check is duplicated in both the PR gate (non-blocking, `continue-on-error`) and a scheduled job (the actual enforcement point) per the cargo-deny-action recommendation; the release workflow separates artifact-build (per-target, parallel, each attesting its own subject) from the single `publish`/`host` job that needs the trusted-publishing OIDC token and write access to the GitHub Release.

## Normative guidance candidates

1. **Pin every third-party GitHub Action to a full commit SHA with a version comment, never a mutable tag or branch.** Rationale: a tag can be moved to point at malicious code without warning; SHA pinning is GitHub's own stated "only way to use an action as an immutable release." Verify: `grep -rn "uses: [^@]*@[^0-9a-f]" .github/workflows/` should return nothing for third-party actions (first-party `actions/*` from GitHub are lower risk but should still be pinned for reproducibility).
2. **Every workflow file starts with `permissions: {}` at the top level; grant scopes per-job only.** Rationale: default `GITHUB_TOKEN` permissions are broad; least privilege limits blast radius of a compromised action or script. Verify: `grep -L "^permissions:" .github/workflows/*.yml` finds files missing an explicit top-level permissions block.
3. **Add `merge_group:` alongside `pull_request:` on every workflow that produces a required status check, if the repo uses a merge queue.** Rationale: omitting it means the required check silently never reports when a PR enters the queue, wedging the merge. Verify: if branch protection lists required checks and the repo has merge queue enabled, grep the producing workflow for `merge_group`.
4. **Run `cargo clippy --workspace --all-targets --all-features --locked -- -D warnings` as a single blocking CI job, not `cargo build` + hope.** Rationale: `--all-targets` catches lints in tests/benches/examples that a bare `clippy` skips; `--locked` catches drift between `Cargo.lock` and `Cargo.toml`; `-D warnings` makes lints fail-closed rather than accumulate silently. Verify: `grep -n "clippy.*--all-targets.*--all-features.*--locked.*-D warnings" .github/workflows/*.yml`.
5. **Restrict `Swatinem/rust-cache` saves to the trunk branch (`save-if: github.ref == 'refs/heads/main'`).** Rationale: every PR branch otherwise writes its own cache entry, evicting the shared cache under GitHub's per-repo cache size limit and making cache hit rate worse for everyone. Verify: grep workflow YAML for `Swatinem/rust-cache` and confirm a `save-if` input is present when the job also runs on `pull_request`.
6. **Split `cargo-deny check advisories` into its own job with `continue-on-error: true`, separate from `bans`/`licenses`/`sources`.** Rationale: the RustSec advisory DB changes independently of the PR's code, so blocking merges on it punishes unrelated commits; run it as a hard gate only in a scheduled job. Verify: read `deny.toml`-consuming workflow steps for a split matrix/job with differing `continue-on-error`.
7. **Declare `[package.metadata.docs.rs]` with `all-features = true` (or an explicit feature list) whenever any public API is feature-gated.** Rationale: docs.rs otherwise builds with default features only, silently hiding feature-gated public items from the published docs. Verify: `grep -A5 "\[package.metadata.docs.rs\]" Cargo.toml` and cross-check against `[features]` — any non-default feature exposing public API should appear.
8. **Set an explicit `[profile.release]` (or a named `[profile.dist]`) rather than relying on Cargo's built-in defaults for a shipped binary.** Rationale: the default `codegen-units = 16, lto = false, strip = "none"` is tuned for iteration speed, not for a distributed artifact's size/runtime; shipping the default is an unexamined choice, not a deliberate one. Verify: `Cargo.toml` contains a `[profile.release]` or `[profile.dist]` table with at least `lto` and `strip` set explicitly.
9. **Use `rust-lang/crates-io-auth-action` (OIDC trusted publishing) for `cargo publish` in CI instead of a stored `CARGO_REGISTRY_TOKEN` secret, for any crate published from GitHub Actions.** Rationale: a long-lived registry token in repo secrets is a standing credential that, if leaked (e.g. via a compromised dependency in the publish job), can publish malicious versions indefinitely; trusted publishing issues only a job-scoped, auto-revoked token. Verify: `grep -rn "CARGO_REGISTRY_TOKEN" .github/workflows/` should be empty for repos that have configured a crates.io trusted publisher; `grep -rn "crates-io-auth-action"` should be present instead.
10. **`actions/checkout` steps set `persist-credentials: false` in any workflow that runs third-party build tooling.** Rationale: leaving credentials persisted exposes `GITHUB_TOKEN` to any subsequent `git`-shelling step, including transitive build-script code. Verify: `grep -B1 "actions/checkout" .github/workflows/*.yml | grep -c persist-credentials` should equal the number of checkout steps.
11. **Cross-compiled Linux release targets pick a static-musl or an explicit glibc-floor build (`cargo-zigbuild --target <triple>.<glibc-version>`), never an unpinned `-gnu` build assumed to "just work everywhere."** Rationale: a `-gnu` binary built on a fresh Ubuntu runner links against a glibc newer than many users' systems have, causing a runtime `GLIBC_2.XX not found` failure that CI cannot catch (it only ran on the same, newer glibc). Verify: release build logs/scripts show either a `musl` target or an explicit `.<version>` glibc suffix / documented minimum glibc for every `-gnu` release artifact.
12. **A dedicated MSRV job runs `cargo msrv verify` (or an equivalent pinned-toolchain `cargo check --locked`) against `package.rust-version`, separate from the stable-toolchain test job.** Rationale: dependency updates or code changes routinely raise the effective minimum Rust version without anyone noticing until a downstream user on an older toolchain reports a break; only a job pinned to the *declared* MSRV toolchain catches this. Verify: a workflow job exists whose toolchain version matches `Cargo.toml`'s `rust-version` field exactly (not `stable`).

## AI-agent angle

- **Hallucinated or stale action versions/APIs.** An LLM agent frequently writes `actions/checkout@v2` or `actions/checkout@v3` (both long superseded) or invents plausible-but-wrong input names for `Swatinem/rust-cache` (e.g. a made-up `cache-directories:` key). Check: `grep -n "@v[0-9]" .github/workflows/*.yml` flags any tag-pin (should be SHA-pinned per rule 1 above regardless) and is a signal the agent didn't verify against the action's actual current release; cross-check every `with:` key against the action's real `action.yml` inputs list, not memory.
- **Writing `cargo build --release` in CI without `--locked`.** This silently lets CI resolve a *different* dependency set than what's committed in `Cargo.lock` (e.g. if the lockfile is stale relative to `Cargo.toml`), masking exactly the kind of drift CI exists to catch. Check: `grep -rn "cargo \(build\|test\|check\|clippy\)" .github/workflows/ | grep -v -- "--locked"` should be empty (with narrow, justified exceptions like a `cargo update` canary job).
- **Assuming `panic = "abort"` is a free size win with no semantic cost.** An agent asked to "shrink the release binary" will often add `panic = "abort"` without checking whether the crate is also consumed as a library elsewhere (workspace with both a `lib.rs` and `bin/`), where abort breaks any caller relying on `catch_unwind`. Check: if the workspace has more than one crate or exposes a public library target, confirm `panic = "abort"` is scoped to the binary-only profile/crate, not applied blindly workspace-wide.
- **Inventing a nonexistent `cargo publish --token` flow for "OIDC publishing" instead of the real `crates-io-auth-action` two-step (authenticate, then pass its output token).** Agents asked for "trusted publishing to crates.io" sometimes hallucinate a `cargo publish --oidc` flag that does not exist. Check: `cargo publish --help` (or the Cargo Book) has no `--oidc`/`--trusted` flag as of this research; the real mechanism is always the two-step action-then-token pattern shown in [Findings §6](#6-cratesio-trusted-publishing).
- **Confusing `cross` and `cargo-zigbuild` invocation syntax**, e.g. writing `cross build --target x86_64-unknown-linux-gnu.2.17` (the glibc-suffix syntax is `cargo-zigbuild`-only; `cross` has no such flag and will error or silently ignore it). Check: grep the exact tool binary name (`cross` vs `cargo zigbuild`) immediately preceding any `.2.NN`-suffixed target string — that suffix is only valid with `cargo zigbuild`.
- **Writing a `deny.toml` or CI step that treats `cargo-deny check advisories` as a hard blocking gate with no `continue-on-error`,** producing a workflow that will eventually fail every PR the day a new advisory lands for any transitive dependency, with no code change able to fix it until the dependency is patched. Check: confirm advisories checks either run `continue-on-error: true` in the PR gate or are isolated to a scheduled job, per rule 6.
- **Adding a new crates.io dependency or GitHub Action without checking `cargo-deny`'s `bans`/`sources` policy first,** producing a passing local build that then fails CI on the first push. Check: run `cargo deny check` locally before proposing a dependency addition; an agent should treat a `deny.toml`-having repo's policy as a pre-condition, not a post-hoc surprise.

## Contested / evolving

- **`panic = "abort"` as a release default for CLIs** is trending toward "yes, unless you also ship a library" — but it's not universal; some teams keep `unwind` everywhere for uniform panic-handling/telemetry (a top-level `catch_unwind` that reports panics before exiting) even in binary-only crates. No single answer; check whether the specific project's top-level `main` relies on `catch_unwind`.
- **`cross` vs `cargo-zigbuild` vs GitHub-hosted native runners per target** is actively shifting: as GitHub adds more native `aarch64` runner types and macOS runner variety, some projects are moving away from cross-compilation entirely for the targets that now have native runners (build a `aarch64-apple-darwin` binary *on* an `aarch64-apple-darwin` runner rather than cross-compiling from x86_64), trading CI cost/availability for build-tool simplicity. The tradeoff is currently unsettled and varies by which native runners a project's CI budget can afford.
- **Trusted publishing (crates.io OIDC) is new enough (feature actively being built out through 2026, per the live PR activity found in this research) that many existing Rust CLI projects still use a stored `CARGO_REGISTRY_TOKEN`.** This research treats trusted publishing as the forward-looking recommendation, but a repo's existing token-based publish step is not itself a defect — it's a migration opportunity, not an active bug, until trusted publishing is confirmed stable and fully documented for the project's exact publishing topology (e.g. multi-crate workspaces, custom registries).
- **`cargo-dist` vs hand-rolled release workflows**: `cargo-dist`'s self-generated `release.yml` is powerful but opinionated and occasionally lags behind a project's exact custom needs (e.g. non-standard installer requirements); some serious projects (uv is a partial example — it uses `cargo-dist` for parts of its release flow but layers substantial custom workflow logic, per its own `release.yml`/`release-prepare.yml` split found in this research) hand-write large parts of the pipeline rather than adopting `dist` wholesale. Whether to fully adopt `dist` or use it as one component among custom workflows remains a per-project judgment call.
- **musl-static-everywhere vs glibc-with-a-floor for Linux releases**: musl avoids the glibc-floor problem entirely but has historically had worse performance for some allocator-heavy workloads (musl's allocator is not jemalloc/mimalloc-tuned) and occasional subtle libc behavioral differences; `cargo-zigbuild`'s glibc-floor pinning is a newer alternative that keeps glibc's performance characteristics while solving the compatibility problem, but is less battle-tested than musl static linking, which has been the "just works everywhere" default for years.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [Swatinem/rust-cache README](https://github.com/Swatinem/rust-cache/blob/master/README.md) | Primary: action README | current (v2.x) | Exact cache-key composition, what is/isn't cached, `save-if`/`prefix-key`/`shared-key` semantics |
| [axodotdev/cargo-dist book](https://axodotdev.github.io/cargo-dist/book/) | Primary: official docs | current | Release pipeline stages, installer generation, attestation/checksum integration |
| [Cargo Book: Profiles reference](https://doc.rust-lang.org/cargo/reference/profiles.html) | Primary: official Rust docs | current | Exact defaults and semantics for every `profile.release` key |
| [embarkstudios.github.io/cargo-deny](https://embarkstudios.github.io/cargo-deny/) | Primary: official docs | current | The four check categories (advisories/bans/licenses/sources) and `deny.toml` config model |
| [GitHub: Security hardening for GitHub Actions](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions) | Primary: official platform docs | current | Canonical guidance on SHA-pinning, minimal `GITHUB_TOKEN` scope, `pull_request_target` risk |
| [cross-rs/cross README](https://github.com/cross-rs/cross) | Primary: project README | current | Container-based cross-compilation model, supported targets, Docker/Podman requirement |
| [rust-cross/cargo-zigbuild README](https://github.com/rust-cross/cargo-zigbuild) | Primary: project README | current | Zig-linker cross-compilation and the `.target.<glibc-version>` floor-pinning syntax |
| [docs.rs: metadata reference](https://docs.rs/about/metadata) | Primary: official docs | current | Full `[package.metadata.docs.rs]` key list |
| [git-cliff docs](https://git-cliff.org/docs/) | Primary: official docs | current | Conventional-commit changelog generation model, squash-merge recommendation |
| [release-plz README](https://github.com/release-plz/release-plz) | Primary: project README | current | PR-centric release automation, `cargo-semver-checks` integration for semver correctness |
| [cargo-bins/cargo-binstall README](https://github.com/cargo-bins/cargo-binstall) | Primary: project README | current | `pkg-url` template metadata and GitHub Release artifact naming conventions |
| [rust-lang/crates-io-auth-action README](https://github.com/rust-lang/crates-io-auth-action) | Primary: official rust-lang project README | current | The exact OIDC trusted-publishing action interface and workflow YAML |
| [actions/attest-build-provenance README](https://github.com/actions/attest-build-provenance) | Primary: official GitHub Actions org README | current | SLSA build-provenance attestation mechanics, `gh attestation verify` |
| [dtolnay/rust-toolchain README](https://github.com/dtolnay/rust-toolchain) | Primary: widely-used project README (dtolnay is a Rust core-ecosystem maintainer) | current | Toolchain-pinning syntax including MSRV-relative expressions |
| [rust-lang/rust-clippy repo (CI/lint-level guidance)](https://github.com/rust-lang/rust-clippy) | Primary: official Rust project docs | current | `clippy::all`/`pedantic`/`restriction` lint-group semantics and CI-deny recommendations |
| [mozilla/sccache README](https://github.com/mozilla/sccache) | Primary: project README | current | Compiler-cache model, backend list, linker-caching limitation |
| [matklad, "Fast Rust Builds"](https://matklad.github.io/2021/09/04/fast-rust-builds.html) | Secondary: authoritative practitioner blog (rust-analyzer lead) | 2021, still cited/current practice | Concrete CI build-time budget (~10 min for 200k LOC) and dependency-graph-shape advice |
| [astral-sh/uv `.github/workflows/*` (via `gh api`)](https://github.com/astral-sh/uv/tree/main/.github/workflows) | Primary: real production Rust CLI's actual CI config | current (fetched 2026-08) | Ground-truth example of SHA-pinning, `permissions: {}`, `-D warnings` clippy gate, `zizmor`, `cargo shear`, reusable-workflow fan-out |
| [EmbarkStudios/cargo-deny-action README](https://github.com/EmbarkStudios/cargo-deny-action) | Primary: project README | current | The `continue-on-error` advisories-matrix pattern, verbatim |
| [foresterre/cargo-msrv README](https://github.com/foresterre/cargo-msrv) | Primary: project README | current | `find`/`verify` command semantics, binary-search MSRV discovery |
| [GitHub: Events that trigger workflows — `merge_group`](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows) | Primary: official platform docs | current | Exact `merge_group` semantics and the required-check-hang failure mode if omitted |
| [GitHub: Using a matrix for your jobs](https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs) | Primary: official platform docs | current | `fail-fast`/`max-parallel` matrix semantics |
| [rust-lang/crates.io repo issues/PRs search (`gh search`)](https://github.com/rust-lang/crates.io) | Primary: live upstream repo activity | fetched 2026-08 | Confirms trusted publishing is a shipped, actively developed feature (not speculative), with dated merged PRs |

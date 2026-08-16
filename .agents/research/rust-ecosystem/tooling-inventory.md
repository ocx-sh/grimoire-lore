---
title: Rust Project-Tooling Inventory (2026)
topic: rust-tooling-inventory
agent: inv-tooling
model: sonnet
date_researched: 2026-08
sources_count: 24
scope: >
  Inventory of the non-compiler tooling a serious 2026 Rust project (specifically:
  clap+tokio+ratatui CLI package managers over OCI, cross-platform, prebuilt-binary
  distribution, security-sensitive) can put in its repo — task running, dependency
  hygiene, licensing/compliance, repo hygiene, docs/site, binary analysis, profiling,
  cross-compilation/packaging, and editor/agent automation. Excludes lint/CI/test/
  workspace-architecture/supply-chain-security/benchmark/rustdoc topics already
  covered by sibling research waves (rust-tooling-ci, rust-testing,
  rust-type-architecture, rust-security, rust-performance, rust-docs-observability).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)
7. [Inventory](#inventory)
8. [Candidate topics](#candidate-topics)

## Summary

1. `cargo-watch` (last published Oct 2024) is stale relative to `bacon` (Jul 2026, 320k downloads) and `watchexec` (Mar 2026) — for a new dev loop in 2026, prefer `bacon` for compiler-feedback loops and `watchexec-cli` for generic file-triggered commands.
2. `cargo-make` last published Jan 2025 (18 months stale) versus `just` actively releasing through Aug 2026 with 2.4M downloads — `just` is the 2026 default task runner; `cargo-make`'s Rust-native task DSL is a legacy signal, not a current one.
3. `cargo-husky` (last published Jan 2020, six years stale) is dead. Use `lefthook` (Go, fast, active — v2.1.10 Jul 2026) or the Python `pre-commit` framework for git-hook orchestration instead.
4. Dependency-pruning has three live options with different trust models: `cargo-machete` (2.66M downloads, fast heuristic AST scan, no nightly, false positives on macro-only usage), `cargo-shear` (466k downloads, newest of the three, actively released Aug 2026, built by the oxc team), and `cargo-udeps` (1.4M downloads, requires a **nightly** toolchain to run, more precise because it uses the actual compiler). None displaces the others outright — `cargo-machete`/`cargo-shear` for fast CI gates, `cargo-udeps` for periodic ground-truth sweeps.
5. `cargo-hakari` (workspace-hack generation, 1.08M downloads, active May 2026) only pays off once a workspace has enough crates with divergent feature unification to cause redundant rebuilds — for a 4-crate workspace (ocx) it is very likely premature; worth revisiting only if crate count grows materially.
6. Licensing/compliance for a security-sensitive tool wants three layers, not one: `cargo-deny`'s `licenses` check as the CI *gate* (already in project), `cargo-about` to *generate* the human-readable NOTICE/LICENSE-THIRD-PARTY file, and `cargo-cyclonedx` or `cargo-auditable` to produce a machine-readable SBOM / embed dependency provenance in the shipped binary. `cargo-license` (last published Jul 2025) is a lighter, largely superseded alternative to `cargo-about`.
7. `cargo-auditable` (918k downloads, active Jun 2026) embeds the dependency graph into the compiled binary itself — directly relevant to prebuilt-binary distribution, since it lets a downstream auditor (or `cargo-audit`) inspect what shipped *without* trusting a separately-hosted SBOM.
8. `hawkeye` (already in project via `.licenserc.toml`) is itself a Rust binary (MSRV 1.90), actively released (6.5.1, Feb 2026), distributed as prebuilt binaries + a GitHub Action — it remains the right 2026 choice for license-header enforcement, no displacement found.
9. `git-cliff` (already in project) and `cocogitto`/`cog.toml` (already in project) both remain actively released (Apr 2026 and Mar 2026 respectively) and are still the standard changelog/conventional-commit pairing — no displacement found for either.
10. `taplo-cli`, the standard TOML formatter/linter (2.12M downloads), has not published to crates.io since May 2025 — worth confirming the project pins a version deliberately rather than assuming it tracks upstream actively; `dprint`'s TOML plugin is the live alternative if formatting drift becomes a problem.
11. `cross` (Docker-based cross-compilation, 6.17M downloads) has not published a **new crates.io release since Feb 2023** — over three years — even though it is still widely cited as the default. Binaries/Docker images may move faster than the crate; treat this as a flag to verify current maintenance state before depending on it, not an endorsement by download count alone.
12. `cargo-zigbuild` (6.52M downloads, active Jun 2026) is increasingly preferred over `cross` for Linux cross-targets because it needs no Docker daemon — just a Zig toolchain — which matters for CI minutes and for contributors without Docker.
13. `cargo-dist` (axo.dev's `dist`, 170k downloads, active May 2026) generates the GitHub Actions release workflow plus install scripts (shell/powershell/npm/homebrew) and can emit `cargo-binstall`-compatible metadata — this is the toolchain the project's "cargo-dist-style packaging" almost certainly targets; worth confirming whether the project runs actual `cargo-dist` or a hand-rolled equivalent.
14. `cargo-binstall` (3.44M downloads, active Jul 2026) is the client-side complement to `cargo-dist` output — if the project wants `cargo install`-speed UX for its own prebuilt binaries, publishing `cargo-dist`-shaped release assets makes them `cargo-binstall`-installable for free.
15. For OS-native installers, the three per-platform packagers remain segregated and mature: `cargo-deb` (2.11M downloads, active May 2026) for Debian/Ubuntu, `cargo-generate-rpm` (314k downloads, active May 2026) for RPM distros, `cargo-wix` (492k downloads, last published Mar 2025) for Windows MSI. `cargo-bundle` targets macOS `.app`/GUI bundling and is a poor fit for a pure CLI tool.
16. `dhat` (10.65M downloads — inflated by transitive pulls, last published Feb 2024) and `tokio-console` (509k downloads, last published Oct 2025) are the two profiling tools most relevant to a tokio-based CLI: `dhat` for heap-allocation hot spots, `tokio-console` for stuck/starved async tasks. Both have slow release cadences but are API-stable, in-code instrumentation tools rather than fast-moving CLIs — slow releases are not a red flag here the way they are for a CLI binary.
17. `hyperfine` (650k downloads, last published Nov 2025) is the standard tool for comparing CLI wall-clock time across versions/flags — directly applicable to benchmarking `ocx`/`grim` command latency, distinct from the in-process benchmark-harness topic already covered elsewhere.
18. `cargo-bloat` (last published May 2024, over two years stale) is aging; `cargo-binutils` (2.84M downloads, wraps LLVM `nm`/`objdump`/`size`, last published Aug 2025) is the steadier default for binary-size inspection when it's needed at all — which for a CLI tool distributed as a handful of MB is rarely a priority.
19. `rust-analyzer` exposes no standalone CLI/JSON-RPC scripting surface for its most powerful automation feature (Structural Search & Replace, `rust-analyzer.ssr`) — it is reachable only via an LSP client (typically an editor). An autonomous agent that wants SSR-grade structural refactors must drive rust-analyzer as an LSP client itself; there is no `rust-analyzer ssr` CLI subcommand.
20. `docs.rs` and `crates.io` both expose plain JSON over HTTP an agent can query directly (`crates.io/api/v1/crates/<name>`, docs.rs build-queue and `[package.metadata.docs.rs]` config) — useful for an agent to check whether a dependency version resolves, is yanked, or fails to document, without shelling out to `cargo search` or scraping HTML.

## Findings

### 1. Task running and dev loop

`just` remains the ecosystem's default command runner: version 1.58.0 published Aug 3, 2026, 2.38M total crates.io downloads, MSRV-tracking active development, CC0-licensed ([just crate](https://crates.io/api/v1/crates/just)). `cargo-make` (0.37.24) has 3.58M lifetime downloads — higher than `just` — but its last crates.io publish was **Jan 18, 2025** ([cargo-make crate](https://crates.io/api/v1/crates/cargo-make)), an 18-month gap that is a strong staleness signal for a build tool. For a project already using Taskfile (go-task, not a crate) alongside an `xtask` pattern, the practical 2026 field is: `just` (declarative recipes, near-zero runtime dependency, wide adoption) vs Taskfile (YAML, cross-platform shell abstraction, already in project) vs `xtask` (arbitrary Rust code, no new dependency, best for logic too complex for a recipe file). None of the three is displaced by the others; they serve different complexity tiers.

`bacon` (3.24.0, 320k downloads, published Jul 14, 2026 — "background rust compiler") is the actively-maintained watch-and-recompile loop tool, purpose-built for Rust rather than `cargo-watch`'s generic file-watcher wrapper. `cargo-watch` (8.5.3, 1.91M downloads) last published Oct 2, 2024 ([cargo-watch crate](https://crates.io/api/v1/crates/cargo-watch)) — its GitHub repo has carried maintenance-mode notices pointing users to `bacon` or `watchexec` for some time. `watchexec-cli` (2.5.1, 656k downloads, published Mar 30, 2026) is the general-purpose file-watch-and-run tool for non-compiler workflows (docs rebuilds, asset pipelines) ([watchexec-cli crate](https://crates.io/api/v1/crates/watchexec-cli)).

`cargo-expand` (1.0.124, 3.33M downloads, published Jul 18, 2026) remains the standard macro-expansion inspector, thin wrapper around `rustc -Zunpretty=expanded` ([cargo-expand crate](https://crates.io/api/v1/crates/cargo-expand)). `cargo-modules` (0.27.0, 243k downloads, published Aug 3, 2026) draws a module tree/graph — useful for a 129k-221k LOC codebase where module boundaries aren't obvious at a glance ([cargo-modules crate](https://crates.io/api/v1/crates/cargo-modules)). `cargo tree` is built into cargo itself since 1.44 (2020) — no separate crate needed. `cargo-outdated` (0.19.0, 950k downloads, published Apr 14, 2026) reports dependency freshness against semver constraints, complementary to (not a replacement for) Renovate/Dependabot automation ([cargo-outdated crate](https://crates.io/api/v1/crates/cargo-outdated)). `cargo-limit` (0.0.13, 23k downloads, published Mar 9, 2026) is a low-adoption niche tool (warnings suppressed until errors clear, editor-jump integration) — not worth adopting on its own but worth knowing exists ([cargo-limit crate](https://crates.io/api/v1/crates/cargo-limit)).

### 2. Dependency hygiene

Three unused-dependency detectors coexist with different tradeoffs. `cargo-machete` (0.9.2, 2.66M downloads, published Apr 15, 2026) uses a fast textual/AST heuristic scan, runs on stable, and is the most widely adopted by raw download count ([cargo-machete crate](https://crates.io/api/v1/crates/cargo-machete)) — but its own docs warn of false positives on crates used only via macros or `#[cfg]`-gated code. `cargo-shear` (1.13.4, 466k downloads, published Aug 11, 2026 — the most recently active of the three) is built by the oxc (JS/TS tooling) team's Rust-tooling offshoot and both detects *and* can auto-fix `Cargo.toml` ([cargo-shear crate](https://crates.io/api/v1/crates/cargo-shear)). `cargo-udeps` (0.1.61, 1.42M downloads, published Apr 29, 2026) requires a **nightly** Rust toolchain to run because it hooks into unstable compiler internals for precision, trading convenience for fewer false positives ([cargo-udeps crate](https://crates.io/api/v1/crates/cargo-udeps)). Given the project already pins a stable toolchain, `cargo-machete` or `cargo-shear` are the practical CI-gate choices; `cargo-udeps` fits better as an occasional nightly-toolchain sweep, not a stable-CI gate.

`cargo-hakari` (0.9.38, 1.08M downloads, published May 21, 2026) manages a `workspace-hack` crate to unify feature flags across workspace members and cut redundant recompilation ([cargo-hakari crate](https://crates.io/api/v1/crates/cargo-hakari)). It is a guppy-ecosystem tool (same family as `cargo-guppy`) built for workspaces with many crates and divergent feature sets — the ROI curve only turns positive past a certain crate count and feature-flag surface area; a 4-crate workspace is below the range where this typically matters.

`cargo-sort` (2.1.4, 2.43M downloads, published Apr 25, 2026) checks/fixes lexical ordering of `Cargo.toml` tables and keys — a pure formatting concern, cheap CI gate ([cargo-sort crate](https://crates.io/api/v1/crates/cargo-sort)). `cargo-edit` (0.13.13, 3.4M downloads, published Jul 15, 2026, maintained by Ed Page/crate-ci) now bundles what used to be the separate `cargo-upgrades` idea into its own `cargo upgrade` subcommand, alongside `cargo add`/`rm`/`set-version` ([cargo-edit crate](https://crates.io/api/v1/crates/cargo-edit)) — a standalone `cargo-upgrades` crate is not the current path. `cargo-msrv` (0.19.3, 501k downloads, published Mar 25, 2026) discovers/verifies the minimum supported Rust version by bisecting toolchains ([cargo-msrv crate](https://crates.io/api/v1/crates/cargo-msrv)) — the *mechanism*, distinct from the MSRV-policy question already owned by the CI topic.

Renovate's cargo manager updates both `Cargo.toml` version constraints and `Cargo.lock`, choosing `rangeStrategy=widen` when a `<` upper bound exists and `rangeStrategy=update-lockfile` otherwise, and can inject git-credential `insteadOf` rules for private registries ([Renovate cargo manager docs](https://docs.renovatebot.com/modules/manager/cargo/)). This is the actively-recommended automation path over manually running `cargo-outdated` and hand-bumping.

### 3. Licensing and compliance

`hawkeye`, already in project via `.licenserc.toml`, is itself written in Rust (MSRV 1.90 per its 6.5.0 release notes), currently at 6.5.1 (published Feb 13/14, 2026), distributed as prebuilt binaries via a shell installer plus a GitHub Action ([hawkeye crate](https://crates.io/api/v1/crates/hawkeye), [hawkeye releases](https://github.com/korandoru/hawkeye/releases)) — no displacement found; it remains the right choice.

`cargo-about` (0.9.1, 1.08M downloads, published Jun 30, 2026) generates a human-readable listing of every dependency's license terms, driven by a template — the standard way to produce a `LICENSE-THIRD-PARTY`/NOTICE file ([cargo-about crate](https://crates.io/api/v1/crates/cargo-about)). `cargo-license` (0.7.0, 1.84M downloads, last published Jul 29, 2025 — over a year stale) is a simpler, older alternative that just prints a license summary; it has been effectively superseded by the `cargo-deny` (policy gate) + `cargo-about` (report generation) pairing for anything beyond a quick manual check ([cargo-license crate](https://crates.io/api/v1/crates/cargo-license)). `cargo-deny`'s own `licenses` check (already in project, 0.20.2, 5.02M downloads, published Jul 9, 2026 — [cargo-deny crate](https://crates.io/api/v1/crates/cargo-deny)) is the enforcement gate; it and `cargo-about` are complementary, not redundant — one blocks CI, the other produces the artifact a legal reviewer reads.

For SBOM generation, `cargo-cyclonedx` (0.5.9, 1.45M downloads, published Mar 19, 2026) emits CycloneDX-format SBOMs directly from `Cargo.lock`/metadata ([cargo-cyclonedx crate](https://crates.io/api/v1/crates/cargo-cyclonedx)); the general-purpose `syft` (not Rust-specific, Anchore) can also scan a `Cargo.lock` but adds an external non-Rust dependency to the toolchain for no format advantage over `cargo-cyclonedx` in a pure-Cargo project. `cargo-auditable` (0.7.5, 918k downloads, published Jun 28, 2026) takes a different, complementary approach: it embeds the dependency graph *inside the compiled binary* at a well-known ELF/PE section, so a downstream user (or `cargo audit bin`) can inspect exactly what shipped without trusting a separately-distributed SBOM file ([cargo-auditable crate](https://crates.io/api/v1/crates/cargo-auditable)) — directly relevant to a project that ships prebuilt binaries as its distribution mechanism. REUSE/SPDX header-and-license-declaration tooling (the FSFE `reuse` tool) is cross-language and Python-based, not Rust-specific; it overlaps with what `hawkeye` already does for header enforcement and is not an additional recommendation here.

### 4. Repo hygiene

`typos-cli` (1.49.0, 941k downloads, published Aug 3, 2026) is the de facto standard spelling checker for source trees, fast (Rust-native), with a dictionary tuned to avoid flagging common code identifiers ([typos-cli crate](https://crates.io/api/v1/crates/typos-cli)). `taplo-cli` (0.10.0, 2.12M downloads) last published to crates.io **May 23, 2025** ([taplo-cli crate](https://crates.io/api/v1/crates/taplo-cli)) — over a year stale on the CLI crate specifically, even though the underlying `taplo` library and its LSP/VS-Code extension have separate, more active release trains; a project depending on `taplo-cli` from crates.io should verify it isn't silently behind the formatter behavior documented upstream. `dprint` (0.55.2, 233k downloads, published Jul 14, 2026) is the actively-developed alternative/complement — a pluggable multi-language formatter (Markdown, JSON, YAML, TOML via a plugin) that some projects use instead of `taplo` specifically because of its release cadence ([dprint crate](https://crates.io/api/v1/crates/dprint)).

For conventional-commit linting and changelogs, `committed` (1.1.11, 81.8k downloads, published Feb 24, 2026, crate-ci/Ed Page) is a standalone commit-message linter ([committed crate](https://crates.io/api/v1/crates/committed)); the project already uses `cocogitto` (7.0.0, 217k downloads, published Mar 4, 2026 — [cocogitto crate](https://crates.io/api/v1/crates/cocogitto)) which bundles linting, version bumping, and changelog generation into one tool, and `git-cliff` (2.13.1, 312k downloads, published Apr 26, 2026 — [git-cliff crate](https://crates.io/api/v1/crates/git-cliff)) for changelog rendering specifically. Both remain actively released with no displacement found — `committed` would be redundant alongside `cocogitto`'s own linting.

For git-hook orchestration, `cargo-husky` (1.5.0, 3.23M lifetime downloads — a legacy-era high number — **last published Jan 21, 2020**, six years stale — [cargo-husky crate](https://crates.io/api/v1/crates/cargo-husky)) is dead; its high download count is a trap for anyone judging by that metric alone. `lefthook` (Go, latest v2.1.10 published Jul 8, 2026, distributed as .deb/.rpm/.apk/PyPI/Go module — [lefthook releases](https://github.com/evilmartians/lefthook/releases)) is the actively-maintained fast alternative; the Python-based `pre-commit` framework is the other common cross-language choice when a project already has Python tooling elsewhere. Neither is Rust-specific, which is itself relevant: hook orchestration is a repo-level, not language-level, decision.

### 5. Docs and site

`mdBook` (0.5.4, 9.88M downloads, published Jul 6, 2026, rust-lang org) is the official, actively-maintained book/site generator and remains the default for Rust-project documentation sites ([mdbook crate](https://crates.io/api/v1/crates/mdbook)). `mkdocs-material` is a Python/MkDocs-ecosystem tool, not Rust-specific, and not distributed via crates.io — its appeal for a Rust project is purely as a nicer theme/site generator, at the cost of adding a Python toolchain dependency for what mdBook already does natively. A project running *both* (as this one apparently does) should have an explicit reason per site (e.g., one for an external marketing/docs site, one for in-repo API-adjacent docs) rather than duplication by inertia.

`cargo-rdme` (2.2.1, 112k downloads, published Aug 11, 2026 — very recently active) generates `README.md` from a crate's `//!` doc comments, keeping the README and rustdoc from drifting apart ([cargo-rdme crate](https://crates.io/api/v1/crates/cargo-rdme)) — a single-source-of-truth pattern worth adopting per-crate if READMEs currently diverge from lib docs. Rustdoc JSON output (`-Z unstable-options --output-format json`, nightly-only as of this writing) is the machine-readable extraction format that both docs.rs's JSON feature and `cargo-public-api`/semver-diffing tools build on ([docs.rs about](https://docs.rs/about)) — relevant as a mechanism even though semver-gate policy itself is owned by a sibling topic.

### 6. Binary analysis

`cargo-binutils` (0.4.0, 2.84M downloads, published Aug 26, 2025) proxies LLVM's `nm`/`objdump`/`size` and is the steadiest, most-used option for raw binary inspection ([cargo-binutils crate](https://crates.io/api/v1/crates/cargo-binutils)). `cargo-bloat` (0.12.1, 378k downloads, last published **May 10, 2024**, over two years stale — [cargo-bloat crate](https://crates.io/api/v1/crates/cargo-bloat)) is aging and increasingly cited as "good enough but unmaintained" in community discussion; `cargo-show-asm` (0.2.62, 190k downloads, published Jun 26, 2026) is the actively-developed per-function assembly viewer that has displaced the older `cargo-asm` ([cargo-show-asm crate](https://crates.io/api/v1/crates/cargo-show-asm)). `twiggy` (0.8.0, 87.7k downloads, last published Jun 2025) is a Mozilla project primarily aimed at WASM binary-size analysis — low relevance for a native CLI tool ([twiggy crate](https://crates.io/api/v1/crates/twiggy)). For a CLI tool shipping as a handful-of-MB binary, none of this category is a priority unless a specific bloat complaint surfaces.

### 7. Profiling and diagnostics

`dhat` (0.3.3, 10.65M downloads — inflated by being pulled in transitively by other profiling/testing crates, last published Feb 2024 — [dhat crate](https://crates.io/api/v1/crates/dhat)) is an in-code heap-allocation profiler (Valgrind-DHAT-compatible viewer) — its slow release cadence is not a red flag the way it would be for a CLI, since it's a small, API-stable instrumentation library. `tokio-console` (0.1.14, 509k downloads, published Oct 30, 2025) is the async-task debugger for tokio runtimes ([tokio-console crate](https://crates.io/api/v1/crates/tokio-console)) — directly applicable given the project's tokio dependency; it needs `console-subscriber` wired into the binary and a `--cfg tokio_unstable` build. `samply` (0.13.1, 128k downloads, last published Feb 2025) is a macOS/Linux sampling profiler that opens results in the Firefox Profiler UI, increasingly recommended over raw `perf`+`inferno` because of its friendlier flame-graph exploration ([samply crate](https://crates.io/api/v1/crates/samply)). `cargo-flamegraph` (0.6.14, 984k downloads, published **Aug 12, 2026**, the freshest release found in this sweep) wraps `perf`/`dtrace` and `inferno` to generate flamegraphs directly ([flamegraph crate](https://crates.io/api/v1/crates/flamegraph)) — the two are complementary front-ends over similar underlying data, `samply` for an interactive session, `cargo-flamegraph` for a single static SVG artifact (e.g. attached to a PR). `hyperfine` (1.20.0, 650k downloads, published Nov 18, 2025) is the standard CLI benchmarking tool for comparing wall-clock time across binary versions or flag combinations ([hyperfine crate](https://crates.io/api/v1/crates/hyperfine)) — distinct from in-process Criterion-style benchmark harnesses (owned by the performance topic), this is for black-box "does `ocx add` feel faster after this change" comparisons. `heaptrack` (C++/KDE, Linux-only, not a crate) is a heavier alternative to `dhat` when full allocation call-graphs are needed; `cargo-instruments` is a macOS-only convenience wrapper around Instruments.app, relevant only for macOS-specific investigation.

### 8. Cross-compilation and packaging

`cross` (0.2.5, 6.17M downloads) has **not published a new version to crates.io since Feb 4, 2023** ([cross crate](https://crates.io/api/v1/crates/cross)) — over three and a half years at research time. This is a meaningful staleness signal even though `cross` remains widely cited by download count and community habit; before depending on it for a project's cross-compilation, verify current GitHub activity and Docker-image freshness directly rather than trusting the crates.io number. `cargo-zigbuild` (0.23.0, 6.52M downloads, published Jun 16, 2026) is the actively-developed alternative that avoids Docker entirely by using Zig as the linker, and is what the maturin/PyO3 ecosystem has standardized on for exactly this reason ([cargo-zigbuild crate](https://crates.io/api/v1/crates/cargo-zigbuild)).

`cargo-dist` — published to crates.io as `dist` (0.32.0, 170k downloads, published May 22, 2026) — generates a GitHub Actions release workflow, per-platform archives, and install scripts (shell, PowerShell, npm, Homebrew tap) from a manifest in `Cargo.toml`/`dist-workspace.toml`, and can emit metadata that makes releases directly `cargo-binstall`-installable ([cargo-dist / dist crate](https://crates.io/api/v1/crates/cargo-dist)). `cargo-binstall` (1.21.1, 3.44M downloads, published Jul 25, 2026) is the client that resolves and installs a prebuilt binary for a crate without compiling ([cargo-binstall crate](https://crates.io/api/v1/crates/cargo-binstall)) — the two are designed to interlock: `cargo-dist` shapes the release assets, `cargo-binstall` (or a project's own install script) consumes them.

Per-OS installer generation remains split by platform, each with one clear default: `cargo-deb` (3.7.0, 2.11M downloads, published May 2, 2026) for `.deb` ([cargo-deb crate](https://crates.io/api/v1/crates/cargo-deb)), `cargo-generate-rpm` (0.21.0, 314k downloads, published May 4, 2026) for `.rpm` ([cargo-generate-rpm crate](https://crates.io/api/v1/crates/cargo-generate-rpm)), `cargo-wix` (0.3.9, 492k downloads, last published Mar 13, 2025) for Windows MSI via the WiX Toolset ([cargo-wix crate](https://crates.io/api/v1/crates/cargo-wix)). `cargo-bundle` (0.11.0, 161k downloads, published May 30, 2026) targets macOS `.app` bundles and is primarily used by GUI-app ecosystems (notably Tauri) — a poor fit for a pure CLI tool with no app-bundle needs ([cargo-bundle crate](https://crates.io/api/v1/crates/cargo-bundle)).

### 9. Editor and agent tooling

`rust-analyzer`'s Structural Search & Replace (`rust-analyzer.ssr`) matches expressions/types/paths/patterns/items with named wildcards and rewrites them, resolving paths contextually rather than textually ([rust-analyzer features](https://rust-analyzer.github.io/book/features.html)). Critically, the documentation exposes this and rust-analyzer's other assists **only through LSP** (VS Code command / generic LSP `executeCommand`) — there is no documented standalone CLI or bare JSON-RPC scripting entry point separate from running the language server itself. An autonomous coding agent that wants SSR-grade structural rewrites has to speak LSP as a client, not shell out to a `rust-analyzer` subcommand.

`crates.io` exposes a plain JSON API at `crates.io/api/v1/crates/<name>` (confirmed empirically throughout this research — e.g. version, downloads, description, `updated_at`) that an agent can query directly without a browser or scraping the (JS-rendered) crates.io website. `docs.rs` similarly exposes a public build queue, per-crate build status, and reads `[package.metadata.docs.rs]` from `Cargo.toml` to control how a crate's docs get built ([docs.rs about](https://docs.rs/about)) — useful for an agent to confirm a dependency documents cleanly or to check whether a version was yanked before recommending it.

`rust-script` (0.36.0, 1.05M downloads, last published Aug 2025) runs a single `.rs` file as a script, pulling in crates declared in an embedded manifest comment — the community crate answering the "run one Rust file with dependencies, no `cargo new`" need, while cargo itself has an unstable native equivalent under discussion/development (`-Zscript`) that has not stabilized as of this research pass ([rust-script crate](https://crates.io/api/v1/crates/rust-script)).

## Normative guidance candidates

1. **Do not add `cargo-husky` or resurrect it if found vestigially configured.** Rationale: six years without a crates.io release; it is dead. VERIFICATION: `grep -r cargo-husky Cargo.toml **/Cargo.toml` returns nothing, or if found, is removed and replaced with `lefthook`/`pre-commit`.
2. **Prefer `bacon` over `cargo-watch` for the compile-on-save loop.** Rationale: `cargo-watch` has been in de facto maintenance mode since Oct 2024; `bacon` is purpose-built and actively released. VERIFICATION: `rg cargo-watch` in docs/scripts finds no live recommendation, or any found reference is intentionally historical.
3. **Gate unused-dependency checks on `cargo-machete` or `cargo-shear`, not `cargo-udeps`, in stable CI.** Rationale: `cargo-udeps` needs nightly; running nightly-only tooling in a stable-pinned CI pipeline is an unnecessary toolchain fork. VERIFICATION: the CI job invoking the unused-deps check does not install a nightly toolchain.
4. **Do not add `cargo-hakari` unless the workspace crate count or feature-unification pain becomes concrete.** Rationale: the tool's ROI curve requires enough crates/features to have redundant-rebuild pain; a 4-crate workspace is speculative need (YAGNI). VERIFICATION: no `workspace-hack` crate exists unless a specific, named rebuild-time complaint motivated it.
5. **When generating a third-party notice file, run `cargo-about` against the `cargo-deny licenses` allow-list, not independently.** Rationale: the two must agree on which licenses are permitted, or the generated NOTICE claims compliance the CI gate doesn't actually enforce. VERIFICATION: `cargo-about`'s `about.toml` license-allow-list is a subset of (or matches) `deny.toml`'s `[licenses]` config.
6. **For prebuilt-binary distribution, wrap release builds with `cargo-auditable`.** Rationale: the project already distributes binaries without publishing to crates.io — embedding the dependency graph in the binary is the only way a downstream user can `cargo audit bin` it after the fact, since there is no crates.io record to cross-reference. VERIFICATION: `cargo audit bin <shipped-binary>` succeeds and lists real dependency versions.
7. **Treat `cross`'s crates.io staleness (no release since Feb 2023) as a live risk, not settled fact.** Rationale: three-plus years without a crates.io publish for a security-sensitive cross-compilation tool warrants a fresh maintenance check before continuing to depend on it. VERIFICATION: an explicit note (or a switch to `cargo-zigbuild`) exists recording the maintenance-status decision, dated.
8. **If the project runs both `mdBook` and `mkdocs-material`, document why — one external, one internal — or consolidate.** Rationale: two Rust-adjacent doc-site generators for one project is duplication unless the split is deliberate. VERIFICATION: each site's purpose is stated in its own README/config comment.

## AI-agent angle

- **Download count is a trap an LLM reaches for by default.** `cargo-husky` (3.23M downloads, dead since 2020) and `cross` (6.17M downloads, no crates.io release since 2023) both look "clearly the standard choice" by raw download count alone. The mechanical check: before recommending any tool, fetch `https://crates.io/api/v1/crates/<name>` and read `updated_at` — if it is more than ~12 months old for a fast-moving CLI category (watchers, formatters, task runners), say so explicitly rather than presenting the download number as current-adoption evidence.
- **An agent will confidently invent a `rust-analyzer` CLI subcommand for SSR that does not exist.** The primary source is explicit: SSR is LSP-only. Mechanical check: grep the rust-analyzer book/CHANGELOG for a bare `rust-analyzer ssr` (not `rust-analyzer.ssr`, the LSP command name) before ever emitting a shell command that assumes one.
- **`cargo-machete`/`cargo-shear` false positives on macro-only or `#[cfg]`-gated crate usage are easy for an agent to "fix" by deleting the dependency rather than investigating.** Mechanical check: before removing a flagged dependency, `rg` the crate name across `**/*.rs` including inside `macro_rules!`/proc-macro-attribute bodies and `#[cfg(...)]` blocks; a hit there is a false positive, not dead weight.
- **`cargo-udeps` requiring nightly is a common gotcha an agent will paper over by silently switching the whole CI toolchain to nightly.** Mechanical check: any invocation of `cargo-udeps` must be isolated to its own job/step with an explicit `+nightly` toolchain override, never a change to the workspace's pinned stable toolchain file.
- **crates.io's website itself is a JS single-page app** — `WebFetch`-style HTML-to-markdown tools return only the page title, nothing else. An agent doing ecosystem research must know to hit the JSON API (`crates.io/api/v1/crates/<name>`) directly, not the human-facing URL, or it will silently produce zero data and may fabricate plausible-sounding numbers instead.

## Contested / evolving

- **`cross` vs `cargo-zigbuild`**: `cross`'s Docker-based model is the historically dominant cross-compilation approach, but its crates.io staleness (no publish since Feb 2023) alongside `cargo-zigbuild`'s continuous 2026 releases and no-Docker requirement is a live signal the center of gravity is shifting toward Zig-as-linker approaches, at least for Linux targets. Direction: toward `cargo-zigbuild` for CI speed, `cross` likely retained only where Docker-level environment fidelity (e.g., glibc version pinning) is specifically needed.
- **Native `cargo script`/frontmatter vs `rust-script`**: cargo itself has an unstable single-file-script feature in development; `rust-script` is the mature third-party answer today (last published Aug 2025). Direction: watch for stabilization; once native, `rust-script` likely becomes redundant for the common case, though it may retain a richer feature set (custom toolchains, templates) longer.
- **`taplo-cli`'s crates.io cadence vs its LSP/library counterpart**: the CLI binary specifically hasn't published since May 2025 while the broader taplo project has separate release trains for its library/LSP. Direction: unclear whether this is intentional (CLI is "done") or a maintenance gap — worth checking the GitHub issue tracker directly rather than assuming either.
- **SBOM format choice (`cargo-cyclonedx` vs SPDX-oriented tooling vs `cargo-auditable`'s embedded approach)**: no single format has "won" in the Rust ecosystem the way conventional commits won for changelogs; CycloneDX has stronger tooling-ecosystem support broadly, but embedded auditability (`cargo-auditable`) solves a different problem (binary-level truth vs. pre-build declaration) and the two are increasingly treated as complementary rather than competing.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [crates.io API: just](https://crates.io/api/v1/crates/just) | Primary registry data | Aug 2026 | Confirms `just` is the actively-released task-runner default |
| [crates.io API: cargo-make](https://crates.io/api/v1/crates/cargo-make) | Primary registry data | last publish Jan 2025 | Staleness signal for a widely-cited task runner |
| [crates.io API: cargo-watch](https://crates.io/api/v1/crates/cargo-watch) | Primary registry data | last publish Oct 2024 | Confirms displacement by `bacon`/`watchexec` |
| [crates.io API: bacon](https://crates.io/api/v1/crates/bacon) | Primary registry data | Jul 2026 | Confirms `bacon` as the live compile-loop tool |
| [crates.io API: cargo-machete](https://crates.io/api/v1/crates/cargo-machete) | Primary registry data | Apr 2026 | Highest-adoption unused-dep detector |
| [crates.io API: cargo-shear](https://crates.io/api/v1/crates/cargo-shear) | Primary registry data | Aug 2026 | Most recently active unused-dep detector |
| [crates.io API: cargo-udeps](https://crates.io/api/v1/crates/cargo-udeps) | Primary registry data | Apr 2026 | Confirms nightly-only requirement is still current |
| [crates.io API: cargo-hakari](https://crates.io/api/v1/crates/cargo-hakari) | Primary registry data | May 2026 | Workspace-hack tool adoption/currency |
| [crates.io API: hawkeye](https://crates.io/api/v1/crates/hawkeye) | Primary registry data | Feb 2026 | Confirms in-project license-header tool is current |
| [hawkeye GitHub releases](https://github.com/korandoru/hawkeye/releases) | Primary release notes | Feb 2026 | Confirms language (Rust, MSRV 1.90) and distribution channels |
| [crates.io API: cargo-about](https://crates.io/api/v1/crates/cargo-about) | Primary registry data | Jun 2026 | License-report generator currency |
| [crates.io API: cargo-cyclonedx](https://crates.io/api/v1/crates/cargo-cyclonedx) | Primary registry data | Mar 2026 | SBOM generator currency |
| [crates.io API: cargo-auditable](https://crates.io/api/v1/crates/cargo-auditable) | Primary registry data | Jun 2026 | Embedded-provenance tool currency, directly relevant to prebuilt-binary distribution |
| [crates.io API: cross](https://crates.io/api/v1/crates/cross) | Primary registry data | last publish Feb 2023 | Major staleness finding for a widely-assumed default |
| [crates.io API: cargo-zigbuild](https://crates.io/api/v1/crates/cargo-zigbuild) | Primary registry data | Jun 2026 | Active alternative to `cross` |
| [crates.io API: cargo-dist](https://crates.io/api/v1/crates/cargo-dist) | Primary registry data | May 2026 | Release-packaging tool currency, matches project's stated "cargo-dist-style" packaging |
| [crates.io API: cargo-binstall](https://crates.io/api/v1/crates/cargo-binstall) | Primary registry data | Jul 2026 | Binary-install client currency |
| [crates.io API: cargo-husky](https://crates.io/api/v1/crates/cargo-husky) | Primary registry data | last publish Jan 2020 | Confirms tool is dead despite high lifetime downloads |
| [lefthook GitHub releases](https://github.com/evilmartians/lefthook/releases) | Primary release notes | Jul 2026 | Active git-hook manager, language and distribution confirmation |
| [crates.io API: git-cliff](https://crates.io/api/v1/crates/git-cliff) | Primary registry data | Apr 2026 | Confirms in-project changelog tool is current |
| [crates.io API: cocogitto](https://crates.io/api/v1/crates/cocogitto) | Primary registry data | Mar 2026 | Confirms in-project commit/version tool is current |
| [crates.io API: mdbook](https://crates.io/api/v1/crates/mdbook) | Primary registry data | Jul 2026 | Confirms official book tool is current and rust-lang-maintained |
| [rust-analyzer book: Features](https://rust-analyzer.github.io/book/features.html) | Primary documentation | current | Confirms SSR/assists are LSP-only, no standalone CLI |
| [Renovate docs: cargo manager](https://docs.renovatebot.com/modules/manager/cargo/) | Primary documentation | current | Confirms Renovate's cargo update strategy behavior |
| [docs.rs: About](https://docs.rs/about) | Primary documentation | current | Confirms build-queue, metadata config, rustdoc JSON surface for agent queries |

## Inventory

| Name | What it does | Maturity / adoption signal | 2026 default, challenger, or legacy | Earns a place here (yes/no/conditional) |
|---|---|---|---|---|
| just | Declarative command runner (`justfile`) | 2.38M dl, active Aug 2026 | Default | Yes — already-adjacent, keep as/alongside Taskfile per team preference |
| cargo-make | Rust-native task DSL runner | 3.58M dl, last publish Jan 2025 | Legacy signal | No — displaced by `just`'s cadence and simplicity |
| Taskfile (go-task) | YAML cross-platform task runner | Already in project, widely used outside Rust | Default (cross-lang) | Yes — already adopted, no reason found to switch |
| xtask | Convention: arbitrary Rust binary as build-script | Pattern, not a crate; ubiquitous in complex workspaces | Default for logic-heavy tasks | Conditional — use only where recipe DSLs can't express the logic |
| bacon | Background Rust compiler / watch loop | 320k dl, active Jul 2026 | Default | Yes — for compile-on-save loop |
| cargo-watch | Generic cargo-command file watcher | 1.91M dl, last publish Oct 2024 | Legacy | No — superseded by bacon/watchexec |
| watchexec-cli | Generic file-triggered command runner | 656k dl, active Mar 2026 | Default (non-compiler watching) | Conditional — for non-cargo watch loops (docs, assets) |
| cargo-limit | Warning-suppressing cargo wrapper | 23k dl, active Mar 2026 | Niche | No — low adoption, marginal benefit |
| cargo-expand | Macro-expansion viewer | 3.33M dl, active Jul 2026 | Default | Yes — standard debugging aid, zero cost to have available |
| cargo-modules | Module-tree/graph visualizer | 243k dl, active Aug 2026 | Default for this niche | Conditional — useful for onboarding into 129k-221k LOC codebases |
| cargo tree | Dependency tree (built into cargo) | Built-in since cargo 1.44 | Default | Yes — no install needed |
| cargo-outdated | Reports stale dependency versions | 950k dl, active Apr 2026 | Default for manual checks | Conditional — largely subsumed by Renovate automation |
| cargo-shear | Unused-dependency detector + autofix | 466k dl, most recently active (Aug 2026) | Challenger/rising default | Yes — CI gate candidate |
| cargo-machete | Unused-dependency detector | 2.66M dl, active Apr 2026 | Default (by adoption) | Yes — CI gate candidate, alt to cargo-shear |
| cargo-udeps | Precise unused-dependency detector, nightly-only | 1.42M dl, active Apr 2026 | Ground-truth checker | Conditional — periodic sweep only, not stable-CI gate |
| cargo-hakari | Workspace-hack feature unification | 1.08M dl, active May 2026 | Default for large workspaces | No — premature for a 4-crate workspace; revisit if it grows |
| cargo-sort | Cargo.toml key/table sort checker | 2.43M dl, active Apr 2026 | Default | Conditional — cheap gate, low priority |
| cargo-edit | `cargo add/rm/upgrade/set-version` | 3.4M dl, active Jul 2026 | Default | Yes — standard dev convenience |
| cargo-msrv | MSRV bisection/verification | 501k dl, active Mar 2026 | Default mechanism | Conditional — pair with the project's MSRV policy decision (owned elsewhere) |
| Renovate (cargo manager) | Automated dependency PRs | Widely adopted platform | Default | Yes — preferred over manual cargo-outdated workflow |
| Dependabot (cargo support) | Automated dependency PRs | GitHub-native, widely adopted | Challenger to Renovate | Conditional — simpler but less configurable than Renovate |
| hawkeye | License-header check/format | 106k dl, active Feb 2026 | Default (already in project) | Yes — no displacement found |
| cargo-about | License-report generator | 1.08M dl, active Jun 2026 | Default | Yes — pair with cargo-deny licenses gate |
| cargo-license | Simple license lister | 1.84M dl, last publish Jul 2025 | Legacy-leaning | No — superseded by cargo-about + cargo-deny combo |
| cargo-deny (licenses check) | License policy CI gate | 5.02M dl, active Jul 2026 | Default (already in project) | Yes — already adopted, still current |
| cargo-cyclonedx | CycloneDX SBOM generator | 1.45M dl, active Mar 2026 | Default for SBOM | Yes — security-sensitive OCI tool should emit an SBOM |
| syft | General-purpose SBOM scanner | Widely used cross-language | Challenger, non-Rust-native | No — cargo-cyclonedx covers this natively without a new toolchain |
| cargo-auditable | Embeds dep graph in compiled binary | 918k dl, active Jun 2026 | Default for prebuilt-binary auditability | Yes — directly matches the project's distribution model |
| REUSE/SPDX tooling | Cross-language license-header/SPDX compliance | FSFE standard, Python-based | Overlaps with hawkeye | No — hawkeye already covers header enforcement |
| typos-cli | Spelling checker for source | 941k dl, active Aug 2026 | Default | Yes — cheap, high-signal CI gate |
| taplo-cli | TOML formatter/linter | 2.12M dl, last publish May 2025 | Default, but stale CLI cadence | Conditional — verify version pin deliberately, watch for drift |
| dprint | Pluggable multi-language formatter | 233k dl, active Jul 2026 | Challenger for non-Rust files | Conditional — adopt if taplo cadence becomes a problem |
| committed | Conventional-commit message linter | 81.8k dl, active Feb 2026 | Standalone alternative | No — redundant with cocogitto's own linting, already in project |
| cocogitto | Conventional commits + version + changelog | 217k dl, active Mar 2026 | Default (already in project) | Yes — no displacement found |
| git-cliff | Changelog generator | 312k dl, active Apr 2026 | Default (already in project) | Yes — no displacement found |
| lefthook | Fast git-hook manager (Go) | Active, v2.1.10 Jul 2026 | Default for hook orchestration | Conditional — adopt if git-hook enforcement is wanted and Go binary is acceptable |
| pre-commit (Python) | Git-hook framework | Widely adopted cross-language | Challenger to lefthook | Conditional — only if Python tooling already present elsewhere |
| cargo-husky | Cargo-integrated git hooks | 3.23M lifetime dl, last publish Jan 2020 | Dead | No — six years unmaintained |
| EditorConfig | Cross-editor formatting config file | Universal standard, not a tool | Default | Yes — zero-cost, add `.editorconfig` if missing |
| mdBook | Markdown book/site generator | 9.88M dl, active Jul 2026, rust-lang org | Default | Yes — already in project, no displacement found |
| mkdocs-material | Python/MkDocs theme+generator | Widely used broadly, not Rust-specific | Challenger | Conditional — only if the second site's purpose is distinct from mdBook's |
| rustdoc JSON | Machine-readable doc extraction (nightly) | Unstable, foundational for other tools | Default mechanism | Conditional — useful if building doc-coverage or symbol-query tooling |
| cargo-rdme | Syncs README from lib.rs doc comments | 112k dl, active Aug 2026 | Default for this niche | Conditional — adopt per-crate if README/rustdoc drift is a real problem |
| cargo-bloat | Binary size breakdown | 378k dl, last publish May 2024 | Aging | No — cargo-binutils is the steadier choice; low priority regardless |
| twiggy | Code-size profiler (WASM-focused) | 87.7k dl, last publish Jun 2025 | Niche | No — low relevance to a native CLI |
| cargo-binutils | LLVM nm/objdump/size proxy | 2.84M dl, last publish Aug 2025 | Default | Conditional — only if binary-size investigation is actually needed |
| cargo-show-asm | Per-function assembly viewer | 190k dl, active Jun 2026 | Default (successor to cargo-asm) | No — not relevant absent a specific codegen investigation |
| samply | Sampling profiler, Firefox Profiler UI | 128k dl, last publish Feb 2025 | Rising default | Conditional — for interactive perf investigation sessions |
| cargo-flamegraph | Flamegraph generator (perf+inferno) | 984k dl, active Aug 2026 | Default | Conditional — for static flamegraph artifacts (e.g., attached to a PR) |
| tokio-console | Async task debugger for tokio | 509k dl, last publish Oct 2025 | Default for tokio codebases | Yes — directly applicable given the project's tokio dependency |
| dhat | In-code heap-allocation profiler | 10.65M dl (inflated, transitive), last publish Feb 2024 | Default for heap profiling | Conditional — add as a dev-dependency behind a feature flag when investigating allocation hot spots |
| heaptrack | Full allocation call-graph profiler (C++/KDE) | Mature, Linux-only, not a crate | Heavier alternative to dhat | No — dhat covers the common case without an external non-Rust tool |
| hyperfine | CLI wall-clock benchmarking tool | 650k dl, last publish Nov 2025 | Default | Yes — directly useful for comparing ocx/grim command latency across versions |
| cargo-instruments | macOS Instruments.app wrapper | Niche, macOS-only | Platform-specific convenience | No — low priority, macOS-only investigation tool |
| cross | Docker-based cross-compilation | 6.17M dl, last crates.io publish Feb 2023 | Historically default, staleness risk | Conditional — verify current maintenance before depending on it further |
| cargo-zigbuild | Zig-linker cross-compilation, no Docker | 6.52M dl, active Jun 2026 | Rising default | Yes — preferred alternative to cross for Linux targets |
| cargo-dist (`dist`) | Generates release CI workflow + installers | 170k dl, active May 2026 | Default for "ship prebuilt binaries" | Yes — matches the project's stated packaging style; confirm actual adoption |
| cargo-binstall | Client-side binary installer | 3.44M dl, active Jul 2026 | Default | Yes — complements cargo-dist output, cheap to make releases compatible |
| cargo-deb | Debian .deb packager | 2.11M dl, active May 2026 | Default | Conditional — if .deb distribution is offered |
| cargo-generate-rpm | RPM packager | 314k dl, active May 2026 | Default | Conditional — if .rpm distribution is offered |
| cargo-wix | Windows MSI installer via WiX | 492k dl, last publish Mar 2025 | Default, slower cadence | Conditional — if MSI installer is offered (Windows is a stated target) |
| cargo-bundle | macOS .app / GUI bundler | 161k dl, active May 2026 | Default for GUI/Tauri apps | No — pure CLI tool has no .app-bundle need |
| rust-analyzer (SSR/assists) | LSP-only structural search/replace and code actions | Ubiquitous, official | Default | Conditional — only usable by an agent that speaks LSP as a client |
| crates.io API | Programmatic crate metadata (JSON) | Official, `api/v1/crates/<name>` | Default | Yes — reliable agent-facing data source, confirmed working in this research |
| docs.rs (build queue + metadata) | Programmatic doc-build status | Official | Default | Yes — useful pre-flight check for dependency additions |
| rust-script | Run a single .rs file as a script with deps | 1.05M dl, last publish Aug 2025 | Default (until cargo-script stabilizes) | Conditional — for one-off scripts/xtask-lite needs |

## Candidate topics

| Topic | Why it matters | Source | Already covered? | Priority |
|---|---|---|---|---|
| rust-task-running | just vs Taskfile vs xtask decision framework for this project's dev loop | crates.io just/cargo-make data | no | high |
| rust-dependency-pruning | cargo-shear vs cargo-machete vs cargo-udeps, false-positive handling on macro/cfg usage | crates.io data, tool docs | no | high |
| rust-license-sbom-pipeline | cargo-about + cargo-deny licenses + cargo-cyclonedx + cargo-auditable composition for a security-sensitive shipped binary | crates.io data | no | high |
| rust-profiling-toolkit | samply/tokio-console/dhat/hyperfine selection per bottleneck type for a tokio-heavy async CLI | crates.io data | no | high |
| rust-cross-compilation | cross's staleness vs cargo-zigbuild for Linux/macOS/Windows binary builds | crates.io cross data (no publish since 2023) | no | high |
| rust-release-packaging | cargo-dist + cargo-binstall + per-OS packagers end-to-end pipeline; verify actual project adoption vs hand-rolled equivalent | crates.io dist/binstall data | no | high |
| rust-workspace-hack | cargo-hakari adoption threshold — when a workspace is big enough to need it | crates.io cargo-hakari data | no | medium |
| rust-git-hooks | lefthook vs pre-commit vs dead cargo-husky for local hook enforcement | crates.io + GitHub release data | no | medium |
| rust-docs-site-tooling | mdbook vs mkdocs-material choice criteria; project currently runs both — reconcile or justify | crates.io mdbook data, project context | no | medium |
| rust-dependency-update-automation | Renovate cargo manager vs Dependabot cargo support, lockfile-only vs range-widen strategy | Renovate docs | no | medium |
| rust-analyzer-agent-automation | Driving SSR/assists via LSP for automated refactors; no CLI scripting surface exists | rust-analyzer book | no | medium |
| rust-agent-registry-apis | crates.io JSON API + docs.rs build-queue/metadata as queryable facts for an autonomous agent | crates.io API, docs.rs about | no | medium |
| rust-readme-sync | cargo-rdme doc-as-source-of-truth pattern for keeping README and rustdoc aligned | crates.io cargo-rdme data | no | low |
| rust-binary-size-analysis | cargo-bloat staleness vs cargo-binutils/twiggy applicability to a small CLI binary | crates.io data | no | low |
| rust-cargo-script | Native unstable cargo script/frontmatter vs the rust-script crate — contested, evolving | crates.io rust-script data | no | low |
| rust-toml-formatting | taplo-cli's stale CLI-crate cadence vs its LSP/library release train vs dprint's TOML plugin | crates.io taplo-cli data | no | low |
| rust-mcp-tooling-gap | No dominant Rust-specific MCP server identified in this pass — worth a dedicated look for agent-facing tooling | absence of a primary source found | no | low |
| rust-spell-lint-baseline | typos-cli config/false-positive handling for domain jargon (OCI, ghcr, grim, ocx) | crates.io typos-cli data | no | low |

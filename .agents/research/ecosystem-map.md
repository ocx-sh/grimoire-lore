---
title: Rust Ecosystem Map — Tooling, Crates, and Distribution
model: opus
date: 2026-08
consolidates:
  - rust-ecosystem/tooling-inventory.md
  - rust-ecosystem/crate-defaults.md
  - rust-ecosystem/publishing-and-distribution.md
grounded_by:
  - ocx/Cargo.toml, grimoire/Cargo.toml (read 2026-08)
  - ocx/dist-workspace.toml, grimoire/dist-workspace.toml
  - ocx/taskfiles/*, ocx/.github/workflows/*, grimoire/.github/workflows/*
  - topic-map.md
  - ocx-codebase-audit/rules-inventory.md
---

# Rust Ecosystem Map

Three landscape scouts inventoried the non-compiler tooling, the default-crate
field, and the publishing/distribution channels of the 2026 Rust ecosystem.
This document merges their three inventories into one verdict table, grounds
every verdict against what the ocx/grimoire tree actually contains, dedups
their candidate topics against the eleven waves already commissioned and the
fourteen selected in [topic-map.md](topic-map.md), and commissions the next
nine dives.

Grounding the scouts against the tree corrected three of their assumptions:

1. **The project already runs real `dist`**, not a hand-rolled equivalent.
   Both repos carry `dist-workspace.toml` pinned to `cargo-dist-version =
   "0.31.0"` with `cargo-auditable = true` and `cargo-cyclonedx = true`
   already enabled, eight target triples each, and custom pre/post-announce
   jobs. Four of the scouts' "adopt this" recommendations are already live.
   The open questions are narrower and more interesting than they assumed —
   notably `installers = []` on ocx versus `["shell", "powershell"]` on
   grimoire, an undocumented divergence in how the two tools are installed.
2. **There is no pyo3 crate in the family.** `ocx-sdk-python` is a pure-Python
   package (`pyproject.toml`, `uv.lock`, no `Cargo.toml`). Every pyo3/maturin
   recommendation in the crate-defaults scout is dead weight here.
3. **The docs-site split is three ways, not two.** grimoire uses mdBook
   (`docs/book.toml`), ocx uses **VitePress** (`website/.vitepress`, `bun.lock`
   — not mkdocs-material as the scout assumed), and ocx-mirror plus
   ocx-sdk-python use mkdocs.

And it surfaced one live defect worth naming before anything else:
**`grimoire/Cargo.toml` still depends on `serde_yaml = "0.9"`** — the crate
that has carried a `+deprecated` suffix and a "no longer maintained" notice
since March 2024 — while ocx already migrated to `serde_yaml_ng`. One repo in
the family has the fix and the other does not.

## The tooling verdict

Every tool and crate the three scouts inventoried, merged, deduplicated, and
scored against this tree. **keep** = in use, no change warranted. **adopt** =
not present, should be. **drop** = do not use, or remove if found. **conditional**
= only under the named trigger. Rows marked *(in tree)* were verified against
the actual manifests, taskfiles, or workflows in 2026-08.

| Tool / crate | Job | Verdict | Reason |
|---|---|---|---|
| **Taskfile (go-task)** | Task runner | keep | *(in tree, all four repos)* cross-platform, already load-bearing; no Rust-field tool displaces it |
| just | Task runner | drop | a second runner alongside Taskfile buys nothing |
| cargo-make | Task runner | drop | no crates.io release since Jan 2025 |
| xtask | Tasks as Rust code | conditional | only for orchestration a YAML recipe genuinely cannot express |
| bacon | Watch-and-recompile loop | conditional | per-developer dev-loop convenience; never a CI concern |
| cargo-watch | Watch loop | drop | maintenance mode since Oct 2024; points users at bacon/watchexec itself |
| watchexec-cli | Generic file-triggered runner | conditional | non-cargo watch loops (docs, website assets) |
| cargo-limit | Warning-suppressing wrapper | drop | 23k downloads, marginal benefit |
| cargo-expand | Macro expansion viewer | keep | zero-cost debugging aid, no install commitment |
| cargo-modules | Module tree/graph | conditional | onboarding aid for a 221k-LOC workspace; not a gate |
| cargo tree | Dependency tree | keep | built into cargo since 1.44 |
| rust-script / `cargo -Zscript` | Single-file Rust scripts | drop | nightly-only (native) or redundant with Taskfile+xtask |
| **cargo-shear** | Unused-dependency detector + autofix | adopt | most actively released of the three, runs on stable, can autofix `Cargo.toml` |
| cargo-machete | Unused-dependency detector | conditional | interchangeable with cargo-shear — pick one, never both |
| cargo-udeps | Unused deps, precise | drop | requires nightly; forking the pinned stable toolchain for a CI gate is not worth the precision |
| cargo-hakari | workspace-hack feature unification | drop | 4-crate and 1-crate workspaces are far below the ROI threshold |
| cargo-sort | `Cargo.toml` key ordering | conditional | cheap gate; adopt only if manifest diff churn is a real review cost |
| cargo-edit | `cargo add/rm/upgrade/set-version` | keep | `cargo add` is already the correct way to add a dep (MSRV-aware resolution) |
| cargo-outdated | Freshness report | drop | Renovate already does this continuously where it is configured |
| cargo-msrv | MSRV bisection | conditional | only once an MSRV is declared — neither repo sets `rust-version` today |
| **Renovate** | Automated dependency PRs | keep / adopt | *(in tree: ocx, ocx-mirror)* **absent in grimoire** — adopt there |
| Dependabot | Automated dependency PRs | drop | Renovate is already configured; two bots contend on the same manifests |
| **hawkeye** | License-header enforcement | keep | *(in tree: `.licenserc.toml`, all repos)* actively released, no displacement found |
| **cargo-deny** | Advisory/ban/license/source gate | keep | *(in tree: `deny.toml`)* the enforcement gate; four independent axes |
| **cargo-about** | Third-party notice generation | keep | *(in tree: `about.toml`, `about.hbs`, `LICENSE-THIRD-PARTY.md`)* complements the deny gate, does not duplicate it |
| cargo-license | License lister | drop | superseded by the cargo-deny (gate) + cargo-about (report) pairing |
| **cargo-cyclonedx** | CycloneDX SBOM | keep | *(in tree: `cargo-cyclonedx = true` in both `dist-workspace.toml`)* already emitted per release |
| **cargo-auditable** | Dep graph embedded in the binary | keep | *(in tree: `cargo-auditable = true` in both)* the only way a downstream auditor can inspect a shipped binary with nothing on crates.io |
| syft | Cross-language SBOM scanner | drop | cargo-cyclonedx covers it without adding a non-Rust toolchain |
| REUSE / SPDX tooling | License headers | drop | hawkeye already owns header enforcement |
| **typos-cli** | Source spell check | adopt | cheap, high-signal, fast; absent from every repo in the family |
| taplo-cli | TOML format/lint | conditional | *(in tree: grimoire, ocx-mirror — not ocx)* CLI crate stale since May 2025; pin deliberately or move to dprint |
| dprint | Pluggable multi-language formatter | conditional | only if taplo's CLI cadence becomes a real problem |
| EditorConfig | Cross-editor formatting | adopt | zero-cost `.editorconfig`, no tool to install |
| **cocogitto** | Conventional commits + version bump | keep | *(in tree: `cog.toml`)* actively released, no displacement |
| **git-cliff** | Changelog generation | keep | *(in tree: `cliff.toml`, all repos)* actively released, no displacement |
| committed | Commit-message linter | drop | redundant with cocogitto's own linting |
| lefthook | Git-hook orchestration | conditional | only if local pre-commit enforcement is wanted; CI already gates everything |
| pre-commit (Python) | Git-hook framework | drop | adds a Python toolchain to duplicate what CI already runs |
| cargo-husky | Cargo-integrated git hooks | drop | dead since Jan 2020; its 3.2M lifetime downloads are a download-count trap |
| **mdBook** | Docs site | keep | *(in tree: grimoire `docs/book.toml`)* official, actively maintained |
| **VitePress** | Docs site | keep | *(in tree: ocx `website/.vitepress`)* — the scout's "mkdocs-material" assumption was wrong for ocx |
| mkdocs-material | Docs site | conditional | *(in tree: ocx-mirror, ocx-sdk-python)* third generator in one family — justify per-site or consolidate |
| cargo-rdme | README from `//!` docs | drop | neither crate is published as a library; no README/rustdoc drift surface |
| rustdoc JSON | Machine-readable doc extraction | conditional | nightly-only; relevant only if doc-coverage or API-diff tooling is built |
| cargo-binutils | LLVM nm/objdump/size proxy | conditional | only on a concrete binary-size complaint |
| cargo-bloat | Binary size breakdown | drop | unmaintained since May 2024 |
| twiggy | Code-size profiler | drop | WASM-oriented; wrong target |
| cargo-show-asm | Per-function assembly | drop | no codegen investigation in flight |
| samply | Sampling profiler (Firefox UI) | conditional | interactive perf sessions only |
| cargo-flamegraph | Flamegraph SVG | conditional | when a static perf artifact belongs on a PR |
| tokio-console | Async task debugger | conditional | needs `console-subscriber` + `--cfg tokio_unstable`; adopt when a stall is actually being chased |
| dhat | Heap-allocation profiler | conditional | dev-dependency behind a feature flag when allocations are suspect |
| heaptrack | Full allocation call graph | drop | dhat covers the common case without a non-Rust dependency |
| cargo-instruments | macOS Instruments wrapper | drop | platform-locked convenience |
| **hyperfine** | CLI wall-clock benchmarking | adopt | the only tool that measures what a user of `ocx add` actually feels; distinct from in-process harnesses |
| **cargo-zigbuild** | Cross-compilation via Zig linker | keep | *(in tree: pinned `cargo-zigbuild@0.22.3` in `ocx/taskfiles/rust.taskfile.yml`)* |
| **xwin** | Windows SDK for cross-compiling | keep | *(in tree: `ocx/taskfiles/xwin.taskfile.yml`)* |
| cross | Docker-based cross-compilation | drop | no crates.io release since Feb 2023; zigbuild + xwin already cover the matrix without a Docker daemon |
| **dist (cargo-dist)** | Release pipeline generator | keep | *(in tree: both repos, `cargo-dist-version = "0.31.0"`)* — 0.32.0 exists upstream; the pin is one minor behind |
| **cargo-binstall** | Client-side binary installer | adopt | releases are already dist-shaped; `[package.metadata.binstall]` is nearly free reach |
| quickinstall | binstall's third-party fallback | drop | a side effect of good asset naming, not a decision |
| cargo-deb / cargo-generate-rpm / cargo-wix | Native OS installers | conditional | only when a distro channel is actually promised to users |
| cargo-bundle | macOS `.app` bundler | drop | pure CLI tool, no app-bundle need |
| Homebrew tap | macOS/Linux channel | conditional | the highest-reach channel currently unused |
| Scoop / WinGet | Windows channels | conditional | Windows is a shipped target with no native channel today |
| AUR / Nix / apt / rpm repos | Linux channels | drop | signing and repo maintenance cost exceeds current scale |
| npm as binary delivery | Channel | drop | wrong audience for a toolchain/AI-config package manager |
| **Docker images** | Channel | keep | *(in tree: `ocx/.github/workflows/docker-publish.yml`)* |
| self_update (crate) | In-process self-update | conditional | grim and ocx are themselves package managers — decide the boundary before importing a weaker mechanism |
| maturin | Rust→PyPI wheels | drop | `ocx-sdk-python` is pure Python; no pyo3 crate exists in the family |
| pyo3 | Rust↔Python bindings | drop | same — no binding crate exists |
| crates.io | Package registry | conditional | nothing published today; a decision-in-waiting, with a live name-squatting risk on `ocx` / `grim` |
| Trusted Publishing (OIDC) | CI publish auth | conditional | adopt at the first publish; never a long-lived `CARGO_REGISTRY_TOKEN` |
| release-plz / cargo-release / cargo-workspaces / cargo-smart-release | Release automation | drop | dist + cocogitto + git-cliff already own version, tag, changelog, and release |
| cargo-semver-checks | Semver CI gate | drop | neither crate is a published library; the blast radius is internal |
| cargo-public-api | Public API diff | drop | same |
| `cargo vendor` / `[source] replace-with` | Mirroring / offline builds | drop | not the mechanism in use, and `replace-with` requires content-identical mirrors |
| **`[patch]`** | Dependency override | keep | *(in tree: both repos patch `oci-client` and `docker_credential` to `external/` submodules)* the correct tool for a fork |
| Kellnr / Artifactory / Cloudsmith | Private cargo registry | drop | no cargo-registry need while distribution is prebuilt binaries |
| **crates.io JSON API** | Crate metadata for an agent | adopt | `crates.io/api/v1/crates/<name>` — the website is a JS SPA and returns nothing to a fetch tool |
| lib.rs | Registry mirror, download trend | adopt | carries maintenance notices and trend data the JSON API does not |
| docs.rs metadata / build queue | Doc build status | conditional | pre-flight check before adding a dependency |
| rust-analyzer SSR | Structural search & replace | conditional | LSP-only — there is no `rust-analyzer ssr` subcommand to shell out to |
| **clap / clap_builder / clap_complete** | CLI parsing, completions | keep | *(in tree, both)* unchallenged default |
| structopt | CLI parsing | drop | merged into clap 3.0, archived |
| **ratatui** | TUI framework | keep | *(in tree: grimoire)* the maintained continuation of tui-rs |
| tui-rs | TUI framework | drop | archived since 2023 |
| **crossterm** | Terminal backend | keep | *(in tree: grimoire)* |
| **indicatif** | Progress bars / spinners | keep | *(in tree: ocx)* no serious challenger |
| **console** | Terminal styling / capability | keep | *(in tree: ocx)* indicatif's sibling, already pulled in |
| **colored_json** | JSON pretty-printing | keep | *(in tree, both)* |
| anstream / anstyle | Terminal colour IO | conditional | the stack clap itself uses; adopt only as part of a deliberate colour-stack consolidation |
| ansi_term | Terminal colouring | drop | unmaintained since 2019 |
| owo-colors | Terminal colouring | drop | would be a third styling crate in one binary |
| **rpassword** | Hidden terminal input | keep | *(in tree, both)* |
| **unicode-width / fuzzy-matcher** | TUI text layout, filtering | keep | *(in tree: grimoire)* |
| **reqwest** | Async HTTP client | keep | *(in tree, both, `0.13` with `default-features = false, features = ["rustls"]`)* |
| hyper | Low-level HTTP | keep | transitive under reqwest; `1.x` API, not the `0.14` shape most training data assumes |
| ureq | Blocking HTTP client | drop | the binaries are already Tokio-based |
| axum | HTTP server | conditional | only if ocx-mirror ever serves rather than mirrors |
| **rustls** | TLS | keep | *(in tree, both)* — but see the crypto-provider question below |
| aws-lc-rs / ring | rustls crypto provider | conditional | the provider is an unmade decision across an eight-triple matrix — commissioned as topic 2 |
| **webpki-root-certs** | Bundled root store | keep | *(in tree, both)* deliberate: grimoire's oci-client fork carries an empty-system-trust-store fix |
| native-tls | System TLS | drop | pulls OpenSSL/Schannel into a prebuilt-binary matrix for no gain |
| **backon** | Retry / backoff | adopt | neither manifest carries any retry crate today |
| backoff / tokio-retry / tokio-retry2 | Retry | drop | stalled or superseded by backon |
| governor | Rate limiting (GCRA) | conditional | adopt when ghcr.io throttling is actually observed, not pre-emptively |
| **oci-client** | OCI Distribution client | keep | *(in tree: both, patched to the `external/rust-oci-client` submodule fork)* |
| **docker_credential** | Docker credential-helper client | keep | *(in tree: both, also a vendored fork)* |
| oci-spec | Raw OCI spec types | conditional | only if the fork's types prove insufficient |
| oras-rs / dkregistry-rs | OCI artifact clients | drop | the forked oci-client already covers the surface |
| **serde / serde_json** | Serialization | keep | *(in tree, both)* |
| **serde_json_canonicalizer** | Canonical JSON | keep | *(in tree: ocx)* already the determinism mechanism for JSON output |
| **serde_repr** | Versioned repr enums | keep | *(in tree, both)* the on-disk version-enum pattern the rules already prescribe |
| **serde_ignored** | Unknown-field reporting | keep | *(in tree: ocx)* the tolerant-parsing half of the `deny_unknown_fields` trade-off |
| **toml / toml_edit** | TOML parse / format-preserving edit | keep | *(in tree, both)* the tools rewrite their own `ocx.toml` / `grimoire.toml` |
| serde_yaml | YAML | **drop** | deprecated and unmaintained since Mar 2024 — **still a direct dependency of grimoire** |
| **serde_yaml_ng** | YAML | adopt | *(in tree: ocx)* the maintained drop-in; grimoire must migrate |
| **schemars** | JSON Schema generation | keep | *(in tree, both)* 1.x, stabilized API |
| simd-json | Fast JSON | drop | different API, no measured large-payload bottleneck |
| bincode | Binary serde | drop | reported unmaintained; final 3.0.0 ships a deliberate compile error |
| postcard / rmp-serde | Binary serde | drop | no binary-serde need in either tool |
| **thiserror / anyhow** | Errors | keep | *(in tree, both)* the lib/binary split the rules already enforce |
| miette | Rich diagnostics | drop | the error and exit-code rules already own presentation; a third layer is churn |
| **tracing / tracing-subscriber / tracing-log** | Structured diagnostics | keep | *(in tree, both)* |
| log + env_logger | Logging | drop | bridge legacy dependencies via tracing-log instead |
| metrics / OpenTelemetry | Metrics | drop | no metrics pipeline exists or is planned |
| **tokio** | Async runtime | keep | *(in tree, both)* |
| **async-trait / futures / tokio-util** | Async plumbing | keep | *(in tree)* |
| async-std | Async runtime | drop | discontinued by its own maintainers |
| smol | Async runtime | drop | a second runtime in one binary |
| parking_lot | Faster mutexes | drop | no measured contention justifies it |
| crossbeam-channel / flume | Channels | drop | `tokio::sync` covers the async paths already in use |
| **tempfile** | Temp files, atomic-write pattern | keep | *(in tree, both)* `NamedTempFile::persist` is the atomic-publish mechanism |
| **fs4** | Cross-platform file locking | keep | *(in tree, both)* the actively-developed superset of fs2 |
| fs2 | File locking | drop | fs4 supersedes it in practice |
| **dunce** | Non-verbatim Windows canonicalization | keep | *(in tree, both)* already cited by name in the cross-platform path rule |
| **dirs** | Base-directory lookups | keep | *(in tree: ocx)* |
| directories | Per-app `ProjectDirs` | conditional | only if config/cache path computation proves inconsistent across the three binaries |
| camino | UTF-8 paths | conditional | the previously-commissioned path topic owns this decision |
| cap-std | Capability-scoped filesystem | conditional | a real architectural commitment; deferred below |
| walkdir | Directory walking | drop | not in tree; `glob`/`globset` cover current needs |
| ignore | gitignore-aware walking | conditional | only where ignore-file semantics genuinely matter |
| **globset** / **glob** | Pattern matching | keep | *(in tree: globset in grimoire, glob in ocx)* — two glob crates across one family; consolidate on globset |
| **symlink / junction / which / sysinfo / libc / windows-sys / elf** | Platform primitives | keep | *(in tree: ocx)* the cross-platform substrate the Windows shim needs |
| **indexmap** | Insertion-ordered maps | keep | *(in tree: ocx)* the mechanical answer to HashMap-order leakage into serialized output |
| **flate2 / tar / zstd / zip / async-compression** | Archive and compression | keep | *(in tree: ocx)* the OCI layer path |
| **lzma-rust2** / **liblzma** | xz decompression | conditional | *(in tree: ocx, both)* two xz implementations — one pure Rust, one C bindings — in one binary; commissioned as topic 7 |
| xz2 | xz | drop | superseded by the two above |
| **sha2** | SHA-256/512 | keep | *(in tree, both)* contractually mandatory for OCI digests |
| blake3 | Fast hashing | conditional | internal content-addressed cache only, never for registry-facing digests |
| crc32fast | CRC32 | drop | no lightweight-integrity need not already covered |
| **chrono** | Date/time | keep | *(in tree, both)* incumbent; grimoire already restricts it to `default-features = false, features = ["clock"]` |
| jiff | DST-correct date/time | conditional | evaluate only for new calendar/timezone arithmetic, not for UTC timestamps |
| uuid | UUIDs | drop | not in tree; no identifier-generation surface |
| rand | Random | drop | not in tree |
| figment / config | Layered configuration | drop | hand-rolled precedence over `toml`/`toml_edit` already works; adding a config crate is churn |
| dotenvy | `.env` loading | drop | no `.env` surface; `dotenv` (unmaintained) likewise |
| keyring | OS-native credential storage | conditional | the credential-storage decision is commissioned as topic 6 |
| **secrecy** | In-memory secret wrapping | keep | *(in tree, both)* |
| `std::process::Command` | Process execution | keep | sufficient; no crate needed |
| duct | Shell-like pipelines | drop | raw `Command` has not become awkward |
| signal-hook / ctrlc | Signal handling | conditional | the previously-commissioned interruption-safety topic owns this |
| **cargo-nextest** | Test runner | keep | *(in tree: 34 references across taskfiles and workflows)* |
| wiremock | Async HTTP mocking | conditional | no HTTP test double exists today; the registry-client boundary is the natural place |
| mockito | HTTP mocking | drop | the suite is fully async; wiremock is the better fit |
| mockall | Trait mocking | conditional | pairs with wiremock at the registry-client trait boundary |
| **starlark / starlark_syntax / starlark_map / starlark_derive / allocative** | Embedded config language | keep | *(in tree: ocx)* — inventoried by no scout; a substantial dependency cluster nobody has reviewed |
| **rmcp** | MCP server SDK | keep | *(in tree: grimoire)* — likewise unreviewed by any scout |
| **semver / hex / base64 / bytes / strsim / regex** | Small utilities | keep | *(in tree)* unremarkable, no displacement |

## The map

Candidate topics from all three scouts, deduplicated and merged. Coverage is
judged against the eleven waves already commissioned (type-architecture,
error-handling, cli-contract, async, security, testing, tooling-ci,
performance, docs-observability, ai-agentic-coding, large-scale-ports) **and**
against the fourteen topics selected in [topic-map.md](topic-map.md).

### Distribution and release

| Topic | Why it matters | Coverage | Priority |
|---|---|---|---|
| Release-pipeline ownership: dist config, installers, channels | `dist` 0.31.0 pinned in both repos; `installers = []` on ocx vs shell+powershell on grimoire is an unexplained divergence in how users get the tools | uncovered (tooling-ci owns CI job design, not channels) | **high** |
| Cross-compilation and the eight-triple target matrix | zigbuild + xwin already in tree; `cross` is three years stale; musl/gnullvm/aarch64-Windows each behave differently | uncovered | **high** |
| rustls crypto-provider selection across that matrix | No `CryptoProvider::install_default()` anywhere in either tree; reqwest 0.13 + rustls; failure is a runtime panic, not a compile error | listed high in topic-map, **never selected** | **high** |
| cargo-binstall metadata for the existing release assets | Cheap reach; assets are already dist-shaped | uncovered | medium |
| Self-update: `self_update` crate vs grim's own package-manager semantics | Risk of building a weaker update mechanism next to the tool's core feature | uncovered | medium |
| Signature scheme for released artifacts (sigstore/cosign/minisign/zipsign) | Both binstall and self_update leave signing opt-in | covered (rust-security owns sigstore; tooling-ci owns attestation) | low |
| crates.io publishing decision; name-squatting on `ocx`/`grim` | Determines whether trusted publishing, yanking, ownership are live surface or dormant | uncovered, but strategic rather than agent-facing | medium |
| Homebrew tap / Scoop / WinGet | Windows and macOS are shipped targets with no native channel | folded into release-pipeline topic | medium |
| Docker images for CI-embedded use | Already shipped by ocx | covered in-tree | low |
| maturin / PyPI wheels | **Not applicable** — no pyo3 crate exists | n/a | drop |
| release-plz vs cargo-release vs cargo-workspaces | dist + cocogitto + git-cliff already own this | resolved by the verdict table | drop |
| cargo-semver-checks / cargo-public-api as gates | Nothing is published as a library | deferred in topic-map for the same reason | drop |

### Dependency and supply-chain hygiene

| Topic | Why it matters | Coverage | Priority |
|---|---|---|---|
| Vendored forks: `external/rust-oci-client`, `external/docker_credential` | Two patched, submoduled forks of security-critical crates in both repos; cargo-audit/deny advisory matching against a path-patched crate is not obvious | uncovered by every wave | **high** |
| Dependency-liveness verification method + deprecated-crate denylist | grimoire still ships deprecated `serde_yaml`; download count is the trap an LLM reaches for; crates.io's site is a JS SPA | partial — topic-map's `edition-2024-and-stale-api-recall` owns stale *APIs*, not crate *selection* | **high** |
| Dependency-update automation: Renovate cargo manager config | Configured in ocx, **absent in grimoire**; rangeStrategy and lockfile interaction are subtle | partial (rust-security owns lockfile policy, not update automation) | high |
| Unused-dependency gate and its macro/`#[cfg]` false positives | An agent "fixing" a flagged dep by deleting it is a real failure mode | uncovered | high |
| cargo-hakari / workspace-hack | Premature at this workspace size | resolved: drop | low |
| `[patch]` vs `[source] replace-with` confusion | Agents conflate them | folded into the vendored-forks topic | — |
| `cargo vendor` for air-gapped builds | No stated air-gap requirement | uncovered but speculative | low |

### Crate-choice decisions

| Topic | Why it matters | Coverage | Priority |
|---|---|---|---|
| Archive/compression crate stack | Six overlapping decoders in one binary (`flate2`, `tar`, `zstd`, `zip`, `lzma-rust2`, `liblzma`, `async-compression`), each an untrusted-input parser on the blob path | partial — the selected `bounded-ingestion` topic owns size caps, not crate selection | **high** |
| Credential storage and the registry-auth stack | `keyring` absent; a vendored `docker_credential` fork plus env vars plus `rpassword`; headless CI is where OS keychains bite | partial (security rules describe the auth chain; no wave owns the storage decision) | high |
| Config/manifest crate stack: `toml_edit` self-editing, schemars, figment | `grim add` rewrites the user's own `grimoire.toml`; comment/format loss is user-visible | partial — the selected `on-disk-format-evolution` owns schema versioning, not the editing mechanism | high |
| Terminal/TUI output stack currency | ratatui 0.30 is well past the API most training data carries; `console` + `colored_json` + `indicatif` + ratatui in one family with no anstream | uncovered (cli-contract owns the contract, not the crates) | high |
| Retry/backoff crate (`backon`) and rate limiting (`governor`) | No retry crate in either manifest | covered — topic-map selected `registry-resilience-timeouts-and-retries` | drop |
| `camino` adoption for UTF-8 paths | Removes `.to_str().unwrap()` chains | covered — topic-map selected `cross-platform-path-and-filename-handling` | drop |
| `cap-std` capability-scoped filesystem | Real CWE-22 defence-in-depth for executing fetched packages | partial (security names the crate; the wiring is unowned) | medium |
| blake3 for an internal content-addressed cache | Distinct from the mandatory sha256 registry digest | uncovered, but speculative — no CAS layer exists | low |
| jiff vs chrono for TTL arithmetic | DST-boundary correctness in cache freshness | covered — topic-map selected `time-clocks-and-cache-freshness` | drop |
| `directories` vs `dirs` consistency across three binaries | Path divergence between grim, ocx, ocx-mirror | uncovered, narrow | low |
| Two glob crates (`glob` in ocx, `globset` in grimoire) | Behavioural divergence in pattern semantics between sibling tools | uncovered, narrow | low |
| `starlark` and `rmcp` dependency clusters | Large, unreviewed dependencies no scout inventoried | uncovered | medium |
| Test-double stack: wiremock + mockall at the registry boundary | Neither exists today | covered (rust-testing) | drop |

### Repo and developer tooling

| Topic | Why it matters | Coverage | Priority |
|---|---|---|---|
| Docs-site consolidation: mdBook + VitePress + mkdocs across one family | Three generators, three build pipelines, three theme surfaces | uncovered (docs-observability owns rustdoc, not sites) | medium |
| Profiling toolkit selection per bottleneck (samply / tokio-console / dhat / hyperfine) | Tokio-heavy async CLI with no profiling story | partial (performance owns harnesses and CI gating) | medium |
| Task-runner tiering: Taskfile vs xtask | Taskfile works; xtask is the escape hatch | resolved by the verdict table | low |
| Git-hook orchestration (lefthook vs none) | CI already gates everything | resolved: conditional | low |
| Cheap repo gates: typos-cli, EditorConfig, cargo-sort | Trivially adoptable, near-zero cost | folded into the dependency-hygiene topic | low |
| taplo-cli staleness vs dprint | Present in two of four repos; CLI crate stale | folded into the same | low |
| rust-analyzer SSR via LSP for agent-driven refactors | An agent will invent a CLI subcommand that does not exist | uncovered; belongs to the agentic-coding track, not the ecosystem axis | low |
| Rust-specific MCP servers | No dominant option found | absence of a source; nothing to research | low |

## Selected for the next wave

Nine topics. Fewer than the cap, deliberately — the cut ran the stated criteria
in order and stopped where the marginal topic stopped changing what an
autonomous agent would do.

Four tiebreakers decided the close calls:

1. **A live in-tree fact beats a theoretical one.** `serde_yaml` in grimoire,
   the absent `CryptoProvider::install_default()`, `installers = []` on ocx,
   two xz decoders in one binary, two vendored forks — all verified, all
   greppable, all wrong-or-undecided today.
2. **A decision an agent will make unsupervised beats a decision a human makes
   once.** "Should we publish to crates.io" is a one-shot strategic call; "which
   crate do I reach for when I need X" happens on every task. The first is
   deferred, the second is commissioned.
3. **Recently-moved beats long-settled.** rustls's provider model, ratatui's
   0.28–0.30 API churn, dist's rename and config move, cargo-shear's arrival,
   `cross`'s three-year silence — a model trained before 2026 is confidently
   wrong about every one of these.
4. **What a grep or a `deny.toml` entry can check beats what only a reading
   can judge.** Every brief below names its verification mechanism.

Merges worth naming: the crypto-provider question and the cross-compilation
matrix collapsed into one topic because they are the same decision chain
(provider → buildability per triple → linker → runtime behaviour) and splitting
them would have two researchers arguing about musl. The vendored-fork topic
absorbed `[patch]` vs source-replacement, git-dependency pinning, and the
"should we use upstream oci-client" question, because in this tree they are one
artifact. Dependency-liveness absorbed the agent-facing registry APIs, because
the API *is* the verification method the rule depends on.

| # | Slug | Why it made the cut |
|---|---|---|
| 1 | `dependency-liveness-and-deprecated-crates` | A deprecated crate is shipping today; download count is the trap an LLM defaults to; the fix is one greppable denylist plus one verification method |
| 2 | `tls-stack-and-cross-target-matrix` | No provider is installed anywhere; the failure is a runtime panic on first handshake across eight shipped triples |
| 3 | `binary-release-pipeline-and-install-channels` | dist is real and already load-bearing; the two tools install differently with no stated reason; the channel set is unowned |
| 4 | `vendored-forks-and-patch-policy` | Two patched forks of security-critical crates with no stated exit criteria, and an unverified interaction with the audit and SBOM tooling |
| 5 | `archive-and-compression-crate-stack` | Six overlapping untrusted-input decoders in one binary, two of them for the same format |
| 6 | `dependency-update-automation-and-unused-deps` | Renovate configured in one repo and absent in the sibling; no unused-dep gate; both mechanically checkable |
| 7 | `credential-storage-and-registry-auth` | Registry tokens for a security-sensitive tool with no stated storage decision and a vendored credential-helper fork |
| 8 | `config-and-manifest-self-editing` | The tools rewrite the user's own config files; comment and format loss is a user-visible defect nobody owns |
| 9 | `terminal-ui-and-output-stack` | ratatui and the colour stack both moved past what a pre-2026 model recalls, and four styling paths coexist in one family |

## Deferred

Not selected, with the reason and the trigger to revisit.

- **crates.io publishing decision and crate-name squatting.** Strategic and
  one-shot rather than agent-facing; most of the publishing corpus (trusted
  publishing, yanking, team ownership, rate limits) is dormant until it flips.
  *Trigger:* any intent to publish a library, or evidence someone else has
  claimed `ocx` / `grim` on crates.io. The name check is cheap and should be
  done as an ops task, not a research brief.
- **`cap-std` capability-scoped filesystem wiring.** Genuinely uncovered and
  genuinely valuable for a tool that materializes fetched packages, but it is
  an architectural commitment, and the previously-selected
  `atomic-writes-and-interruption-safety` topic will reach the same code.
  *Trigger:* that wave's output landing, or a path-containment finding the
  existing two-layer guard misses.
- **Profiling toolkit selection (samply / tokio-console / dhat / hyperfine).**
  Real gap, weakly rule-checkable. `hyperfine` is a verdict-table adopt and
  needs no research; the rest are conditional-on-investigation.
  *Trigger:* a concrete latency or memory complaint.
- **Docs-site consolidation (mdBook + VitePress + mkdocs).** Three generators
  across one family is a real cost, but it is a maintenance decision with
  little bearing on whether an autonomous agent writes correct Rust.
  *Trigger:* a docs pipeline breaking, or a fourth generator appearing.
- **The `starlark` and `rmcp` dependency clusters.** Substantial, unreviewed by
  any scout, and each pulls a large transitive graph into a security-sensitive
  binary. Deferred only because neither has produced a symptom.
  *Trigger:* a cargo-deny advisory, a build-time complaint, or the next
  supply-chain review.
- **`directories` vs `dirs`, and `glob` vs `globset`, consistency across the
  three binaries.** Both are narrow divergences between sibling tools that could
  produce user-visible behavioural drift. Cheap to settle as a one-line rule
  appended to another wave's output rather than researched fresh.
- **Signature scheme for released artifacts.** rust-security owns sigstore and
  rust-tooling-ci owns attestation; the residue (binstall `--only-signed`,
  self_update's `signatures` feature) rides along in topic 3.
- **`cargo vendor` / air-gapped reproducible builds.** No stated requirement.
  *Trigger:* a user or compliance ask for offline installation.
- **Task-runner tiering, git hooks, taplo vs dprint, cargo-hakari, binary-size
  analysis, `rust-script`, Rust MCP servers.** All resolved by the verdict table
  or too low-leverage to commission. Keep in the map; revisit only on a concrete
  need.
- **rust-analyzer SSR via LSP.** A real agent-capability question, but it belongs
  to the `ai-agentic-coding` track, not the Rust ecosystem axis. Route it there.

## Sub-artifacts

- [rust-ecosystem/tooling-inventory.md](rust-ecosystem/tooling-inventory.md)
- [rust-ecosystem/crate-defaults.md](rust-ecosystem/crate-defaults.md)
- [rust-ecosystem/publishing-and-distribution.md](rust-ecosystem/publishing-and-distribution.md)
- [topic-map.md](topic-map.md) — the earlier consolidated backlog this map deduplicates against
- [ocx-codebase-audit/rules-inventory.md](ocx-codebase-audit/rules-inventory.md) — what the project already codifies

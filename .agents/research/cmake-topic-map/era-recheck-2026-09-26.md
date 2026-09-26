---
title: CMake and C++ package-manager ecosystem — era recheck
agent: cmake-era-recheck
model: sonnet
date_researched: 2026-09-26
sources_count: 24
scope: |
  Three-week freshness check on the wave-1 corpus (grounded 2026-09-05/06).
  Re-fetches every version/date claim in cmake-frame.md's Corrections blocks
  and cmake-topic-map/recent-shifts.md's era-check summary from primary
  sources (GitHub Releases API, gitlab.kitware.com raw RST, repo commit/branch
  APIs), plus records what the local ocx mirror serves. Does not re-derive
  any topic content; only asks "is the wave-1 version/date claim still true
  on 2026-09-26."
---

# CMake and C++ package-manager ecosystem — era recheck (2026-09-26)

## Current versions on 2026-09-26

| Tool | Current release | Release date | Proving URL | What wave 1 said |
|---|---|---|---|---|
| CMake (4.4 line, latest overall) | 4.4.3 | 2026-08-25 | [Releases API](https://api.github.com/repos/Kitware/CMake/releases) | Same — 4.4.3 (2026-08-25), unchanged |
| CMake, no 4.5 branch exists | — | — | [release/index.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/index.rst) (toctree tops out at 4.4) | Same — wave 1 also found no 4.5 |
| CMake presets schema | 12 (unchanged since 4.3/4.4) | — | [cmake-presets(7)](https://cmake.org/cmake/help/latest/manual/cmake-presets.7.html) ("Added/Removed in presets version 12") | Same — schema 12 since 4.4 |
| CMake `CMAKE_EXPERIMENTAL_*` gates | Same 6 gates, same UUIDs (`EXPORT_PACKAGE_DEPENDENCIES` `1942b4fa-…`, `MAPPED_PACKAGE_INFO` `ababa1b5-…`, `CXX_IMPORT_STD` `25d6f6aa-…`, `EXPORT_BUILD_DATABASE` `70ef007e-…`, `GENERATE_SBOM` `248471c2-…`, `RUST` `b6fdddce-…`) | — | [Help/dev/experimental.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/dev/experimental.rst) | Same list, same UUIDs — no rotation observed in this window despite the doc's own "will change over time" note |
| ocx local mirror, `kitware/cmake:4` and `:4.4` | **4.4.2 served** | — | `ocx package exec kitware/cmake:4 -- cmake --version` / `:4.4` (both printed `cmake version 4.4.2`), run from this worktree | Not measured by wave 1 — **the mirror lags upstream's 4.4.3 by one patch** |
| Conan | 2.32.0 | 2026-08-31 | [Releases API](https://api.github.com/repos/conan-io/conan/releases), confirmed via `/releases/latest` | Same — unchanged |
| vcpkg (registry) | 2026.07.29 | 2026-07-31 | [Releases API](https://api.github.com/repos/microsoft/vcpkg/releases) | Same — unchanged |
| vcpkg-tool | 2026-07-27 | 2026-07-28 | [Releases API](https://api.github.com/repos/microsoft/vcpkg-tool/releases) | Same — unchanged |
| CPM.cmake | **v0.43.2** | 2026-09-24 | [Releases API](https://api.github.com/repos/cpm-cmake/CPM.cmake/releases), [tag body](https://api.github.com/repos/cpm-cmake/CPM.cmake/releases/tags/v0.43.2) | v0.43.1 (2026-07-06) — **now stale** |
| gersemi | **0.29.1** | 2026-09-14 | [Releases API](https://api.github.com/repos/BlankSpruce/gersemi/releases) | 0.28.1 (2026-08-19) — **now stale** (two releases behind: 0.28.0, 0.29.0 landed 2026-07-21/09-12 too) |
| cpp-pm/hunter | **v0.26.12** | 2026-09-22 | [Releases API](https://api.github.com/repos/cpp-pm/hunter/releases), [tag body](https://api.github.com/repos/cpp-pm/hunter/releases/tags/v0.26.12) | v0.26.11 (2026-08-27) — **now stale**, but same conclusion (actively maintained) |
| bazel-contrib/rules_foreign_cc | **0.16.0** (tagged) | 2026-09-15 | [Releases API](https://api.github.com/repos/bazel-contrib/rules_foreign_cc/releases), [tag body](https://api.github.com/repos/bazel-contrib/rules_foreign_cc/releases/tags/0.16.0) | Last tag 0.15.1 (2025-06-24), 0.16.0 did not exist — **now stale**, the ~15-month tagging gap wave 1 flagged just closed |
| conan-io/cmake-conan (develop2) | HEAD `b1593849dd` | 2026-06-05 | [commits API](https://api.github.com/repos/conan-io/cmake-conan/commits?sha=develop2) | Same SHA as wave 1's exemplar-corpus snapshot — **no new commits in this window** |
| cps-org/cps (spec repo) | HEAD `485d717a2b` | 2026-06-26 | [commits API](https://api.github.com/repos/cps-org/cps/commits) | Not separately dated by wave 1's era-check table, but the CPS mini-wave read this same repo — **no new commits in this window** |
| Bazel (companion row) | 9.2.0 stable; 9.3.0rc3 in RC | 9.2.0: 2026-07-13; 9.3.0rc3: 2026-09-23 | [Releases API](https://api.github.com/repos/bazelbuild/bazel/releases) | 9.0.2 — **now stale** (companion-owned detail; BZL-CC owns the rest of this story) |

## Changes since 2026-09-05

| Date | Change | Touches | Proving URL |
|---|---|---|---|
| 2026-09-24 | CPM.cmake v0.43.2: `CPMAddPackage` source-override fix to preserve semicolons in arguments (#712) | CPM.cmake | [tag v0.43.2](https://api.github.com/repos/cpm-cmake/CPM.cmake/releases/tags/v0.43.2) |
| 2026-09-22 | Hunter v0.26.12: two recipe version bumps (cppduals, libdeflate), no CMake-4-floor or infrastructure change this time | Hunter | [tag v0.26.12](https://api.github.com/repos/cpp-pm/hunter/releases/tags/v0.26.12) |
| 2026-09-15 | **rules_foreign_cc 0.16.0** — first tagged release since 0.15.1 (2025-06-24), ~30 PRs merged (bzlmod docs, pkgconfig/meson fixes, resource_sets integration, CI cleanup). The bundled-CMake-version model has shifted: `toolchains/built_toolchains.bzl` now exposes a `cmake_source_spokes(cmake_version, …)` entry point and `MODULE.bazel` carries no fixed default CMake version — version selection looks BCR-spoke/explicit rather than the fixed "3.19.8–4.0.7, default 3.31.12" range wave 1 measured at `f68b351c46`. Needs a follow-up dive to confirm the new default/range precisely; flagging the model change, not yet the exact numbers. | rules_foreign_cc | [tag 0.16.0](https://api.github.com/repos/bazel-contrib/rules_foreign_cc/releases/tags/0.16.0), [MODULE.bazel@0.16.0](https://raw.githubusercontent.com/bazel-contrib/rules_foreign_cc/0.16.0/MODULE.bazel), [built_toolchains.bzl@0.16.0](https://raw.githubusercontent.com/bazel-contrib/rules_foreign_cc/0.16.0/toolchains/built_toolchains.bzl) |
| 2026-09-14 | gersemi 0.29.1: fixed custom-command formatting when an empty string is one of the arguments (#128) | gersemi | [tag 0.29.1](https://api.github.com/repos/BlankSpruce/gersemi/releases/tags/0.29.1) |
| 2026-09-12 | gersemi 0.29.0: `--stdin-filepath PATH` now affects config-file discovery when reading from stdin (#127) | gersemi | [tag 0.29.0](https://api.github.com/repos/BlankSpruce/gersemi/releases/tags/0.29.0) |
| 2026-09-04 (one day *before* wave 1's 2026-09-05 survey, not captured there) | CMake 4.3.5 and 4.2.8 patch releases | CMake release notes (older-branch patches) | [tag v4.3.5](https://api.github.com/repos/Kitware/CMake/releases/tags/v4.3.5), [tag v4.2.8](https://api.github.com/repos/Kitware/CMake/releases/tags/v4.2.8) |
| — | No CMake 4.4.4 or 4.5 release; no changes to the `CMAKE_EXPERIMENTAL_*` gate list or UUIDs; no new presets schema version; no new CPS-in-CMake commits; no new Conan release beyond 2.32.0; no new vcpkg/vcpkg-tool release; no new cmake-conan `develop2` commits; no new cps-org/cps commits | CMake core, CPS, Conan, vcpkg, cmake-conan | see per-row URLs above |

No changes found for: `CMakeConfigDeps`/`CPSDeps`/`BazelDeps` status (still gated by Conan 2.32.0, unchanged), vcpkg binary-caching provider list (`x-gha` still removed, `x-az*`/`x-gcs`/`x-aws`/`x-cos` still experimental — no fresher vcpkg-tool release to have changed this), vcpkg-artifacts removal (still the 2026-05-27 announcement, no later release revisits it), lockfiles/baselines format, or triplets.

## Wave-1 claims now wrong

| Claim | File that makes it | What is true now | URL |
|---|---|---|---|
| "CPM.cmake 0.43 (2026-07-06)" is current | `cmake-frame.md` §Corrections #1; `recent-shifts.md` Summary + §12 | v0.43.2 (2026-09-24) is current | [tag v0.43.2](https://api.github.com/repos/cpm-cmake/CPM.cmake/releases/tags/v0.43.2) |
| "gersemi 0.28.1 (2026-08-19) is maintained" | `cmake-frame.md` §Corrections #1; `recent-shifts.md` Summary + §14 + Sources table | v0.29.1 (2026-09-14) is current; two releases (0.29.0, 0.29.1) landed since | [releases](https://api.github.com/repos/BlankSpruce/gersemi/releases) |
| "Hunter/cpp-pm v0.26.11 (2026-08-27)" is the latest tag | `cmake-frame.md` §Corrections #1 and #3; `recent-shifts.md` Summary + §13 | v0.26.12 (2026-09-22) is current — conclusion ("maintained, not dead") still holds | [tag v0.26.12](https://api.github.com/repos/cpp-pm/hunter/releases/tags/v0.26.12) |
| "rules_foreign_cc ... last *tagged* release 0.15.1 (2025-06-24)" trailing Bazel's cadence by ~7 months | `cmake-frame.md` §Corrections #8; `recent-shifts.md` §16 + Sources table | 0.16.0 tagged 2026-09-15 — the tagging gap this program flagged has closed; the version-model change (BCR "spokes" for build tools) is new and needs its own look before any rule cites the old fixed CMake-version range | [tag 0.16.0](https://api.github.com/repos/bazel-contrib/rules_foreign_cc/releases/tags/0.16.0) |
| "Bazel 9.0.2 (2026, for the one companion row)" | `recent-shifts.md` Summary | 9.2.0 is current stable (2026-07-13); 9.3.0rc3 in release-candidate (2026-09-23) | [releases](https://api.github.com/repos/bazelbuild/bazel/releases) |

Everything else checked — CMake 4.4.3, no 4.5, presets schema 12, the 6 experimental-gate UUIDs, Conan 2.32.0, vcpkg 2026.07.29/vcpkg-tool 2026-07-27, cmake-conan `develop2` HEAD, and cps-org/cps HEAD — **still holds**. No wave-1 claim about CPS stability, `CMakeConfigDeps` status, vcpkg binary-cache provider removals, or `build_requires`→`tool_requires` was contradicted by this recheck.

## Sources

| URL | What it is | Fetched | Confirms |
|---|---|---|---|
| [gitlab.kitware.com/.../Help/release/index.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/index.rst) | CMake release-notes toctree | 2026-09-26 | No 4.5 minor exists yet |
| [gitlab.kitware.com/.../Help/release/4.4.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/4.4.rst) | CMake 4.4 release notes, raw RST | 2026-09-26 | cmake-diagnostics content unchanged from wave 1's read |
| [gitlab.kitware.com/.../Help/dev/experimental.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/dev/experimental.rst) | Experimental-gate list, raw RST | 2026-09-26 | Same 6 gates, same UUIDs as wave 1 recorded |
| [cmake.org/.../cmake-presets.7.html](https://cmake.org/cmake/help/latest/manual/cmake-presets.7.html) | Published presets manual | 2026-09-26 | Schema still 12, no schema 13 |
| [api.github.com/repos/Kitware/CMake/releases](https://api.github.com/repos/Kitware/CMake/releases) | Full CMake tag history | 2026-09-26 | 4.4.3 still newest; 4.3.5/4.2.8 patches dated 2026-09-04 |
| [tags/v4.4.3](https://api.github.com/repos/Kitware/CMake/releases/tags/v4.4.3), [v4.3.5](https://api.github.com/repos/Kitware/CMake/releases/tags/v4.3.5), [v4.2.8](https://api.github.com/repos/Kitware/CMake/releases/tags/v4.2.8) | Individual CMake release bodies | 2026-09-26 | Dates and milestone links |
| [api.github.com/repos/conan-io/conan/releases](https://api.github.com/repos/conan-io/conan/releases) (+ `/releases/latest`) | Conan tag history | 2026-09-26 | 2.32.0 still latest |
| [api.github.com/repos/microsoft/vcpkg/releases](https://api.github.com/repos/microsoft/vcpkg/releases) | vcpkg registry tag history | 2026-09-26 | 2026.07.29 still latest |
| [api.github.com/repos/microsoft/vcpkg-tool/releases](https://api.github.com/repos/microsoft/vcpkg-tool/releases) | vcpkg-tool tag history | 2026-09-26 | 2026-07-27 still latest |
| [api.github.com/repos/cpm-cmake/CPM.cmake/releases](https://api.github.com/repos/cpm-cmake/CPM.cmake/releases) (+ tag v0.43.2 body) | CPM.cmake tag history | 2026-09-26 | v0.43.2 (2026-09-24) is new |
| [api.github.com/repos/BlankSpruce/gersemi/releases](https://api.github.com/repos/BlankSpruce/gersemi/releases) (+ tags 0.29.0, 0.29.1 bodies, repo metadata) | gersemi tag history + activity | 2026-09-26 | 0.29.1 (2026-09-14) is new; repo pushed 2026-09-14 |
| [api.github.com/repos/cpp-pm/hunter/releases](https://api.github.com/repos/cpp-pm/hunter/releases) (+ tag v0.26.12 body) | Hunter tag history | 2026-09-26 | v0.26.12 (2026-09-22) is new |
| [api.github.com/repos/bazel-contrib/rules_foreign_cc/releases](https://api.github.com/repos/bazel-contrib/rules_foreign_cc/releases) (+ tag 0.16.0 body, repo metadata) | rules_foreign_cc tag history + activity | 2026-09-26 | 0.16.0 (2026-09-15) ends the tagging gap |
| [raw.githubusercontent.com/.../rules_foreign_cc/0.16.0/MODULE.bazel](https://raw.githubusercontent.com/bazel-contrib/rules_foreign_cc/0.16.0/MODULE.bazel) and [toolchains/built_toolchains.bzl](https://raw.githubusercontent.com/bazel-contrib/rules_foreign_cc/0.16.0/toolchains/built_toolchains.bzl) | 0.16.0 source files | 2026-09-26 | No fixed default CMake version embedded; spoke-based registration API |
| [api.github.com/repos/conan-io/cmake-conan/commits?sha=develop2](https://api.github.com/repos/conan-io/cmake-conan/commits?sha=develop2) | cmake-conan develop2 commit history | 2026-09-26 | HEAD unchanged (`b1593849dd`, 2026-06-05) since wave 1's snapshot |
| [raw.githubusercontent.com/.../cmake-conan/develop2/README.md](https://raw.githubusercontent.com/conan-io/cmake-conan/develop2/README.md) | cmake-conan README | 2026-09-26 | "not released as 1.0 yet" language unchanged |
| [api.github.com/repos/cps-org/cps/commits](https://api.github.com/repos/cps-org/cps/commits) | CPS spec repo commit history | 2026-09-26 | HEAD unchanged (`485d717a2b`, 2026-06-26) |
| [api.github.com/repos/bazelbuild/bazel/releases](https://api.github.com/repos/bazelbuild/bazel/releases) | Bazel tag history | 2026-09-26 | 9.2.0 stable, 9.3.0rc3 in RC — supersedes the 9.0.2 figure in `recent-shifts.md` |
| Local: `ocx package exec kitware/cmake:4 -- cmake --version` / `kitware/cmake:4.4 -- cmake --version` | ocx local mirror probe, run from this worktree | 2026-09-26 | Both serve 4.4.2, one patch behind upstream's 4.4.3 |

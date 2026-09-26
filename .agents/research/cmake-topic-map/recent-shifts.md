---
title: CMake and C++ package-manager ecosystem — recent shifts (24-36 months)
program: cmake
agent: cmake-scout-recent-shifts
model: sonnet
date_researched: 2026-09-05
sources_count: 24
scope: |
  What changed in CMake 3.24 through 4.4, Conan 2.0 through 2.32, vcpkg
  2024-2026, CPM.cmake, Hunter/cpp-pm, Ninja, gersemi/cmake-format, and the
  survey/adoption numbers, and which older advice each change invalidates.
  Sourced by fetching CMake's raw release-note RST from gitlab.kitware.com,
  the GitHub Releases API for Conan/vcpkg/vcpkg-tool/CPM.cmake/Hunter/Ninja/
  Bazel/rules_foreign_cc, and vcpkg's Microsoft Learn reference pages. Does
  not cover CMake-language fundamentals that have not changed recently (see
  the sibling canonical corpus survey in this directory for those), and does
  not re-derive Bazel-side C++ toolchain material (BZL-CC group owns that).
---

# CMake and C++ package-manager ecosystem — recent shifts

## Table of contents

1. [Summary](#summary)
2. [Survey](#survey)
3. [Candidate topics](#candidate-topics)
4. [Recent shifts seen in this corpus](#recent-shifts-seen-in-this-corpus)
5. [Contested](#contested)
6. [Sources](#sources)

## Summary

- **Era check (2026-09-05, all version-checked against GitHub Releases API):**
  CMake **4.4.3** (2026-08-25) is current; Conan **2.32.0** (2026-08-31);
  vcpkg registry **2026.07.29** / vcpkg-tool **2026-07-27**; CPM.cmake
  **v0.43.1** (2026-07-06); Hunter/cpp-pm **v0.26.11** (2026-08-27, repo
  actively pushed the same week); Ninja **1.13.2** (2025-11-20); Bazel
  **9.0.2** (2026, for the one companion row).
- **CMake 4.0 (2025-03-27) removed compatibility with `cmake_minimum_required`
  floors below 3.5** — calls that set an older policy version now error —
  and added `CMAKE_POLICY_VERSION_MINIMUM` as the escape hatch. No 4.x
  release since has moved that floor further; it is a one-time break, not a
  ratchet, as of 4.4.
- **Hunter is not dead.** `cpp-pm/hunter` is not archived, was pushed
  2026-08-27, tagged v0.26.11 the same day, has 35 open issues, and its
  most recent commits include a CMake-4-floor fix
  (`CMAKE_POLICY_VERSION_MINIMUM=3.5`) to a vendored recipe — this
  contradicts the frame's suspicion that it might be unmaintained in 2026.
- **The Common Package Specification (CPS) graduated from experimental to
  stable in CMake 4.3** (2026-03-17; confirmed by Kitware's own 2026-03-19
  blog post): `find_package()` now natively searches for `.cps` files
  ahead of CMake-script config files, and `install(PACKAGE_INFO)` /
  `export(PACKAGE_INFO)` need no `CMAKE_EXPERIMENTAL_*` gate any more.
  `install(SBOM)` (also 4.3) is a *separate*, still-experimental feature
  gated by `CMAKE_EXPERIMENTAL_GENERATE_SBOM`.
- **`FetchContent`'s `FIND_PACKAGE_ARGS` and `OVERRIDE_FIND_PACKAGE` both
  landed in 3.24**, alongside dependency providers and
  `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` — the whole "redirect a dependency
  request" toolkit shipped in one release. `SYSTEM` followed in 3.25,
  `EXCLUDE_FROM_ALL` in 3.28.
- **vcpkg removed its GitHub Actions Cache binary-cache provider
  (`x-gha`).** Current Microsoft Learn docs mark it "Removed: This feature
  has been removed from vcpkg" — any guidance still recommending `x-gha`
  is stale; the remaining experimental cloud providers (`x-azblob`,
  `x-azcopy[-sas]`, `x-gcs`, `x-aws[-config]`, `x-cos`, `x-az-universal`)
  all still carry the "will change or be removed without warning" notice.
- **vcpkg-artifacts (`vcpkg-ce`) is being removed.** The 2026-05-27
  vcpkg-tool release explicitly noted removal "after July 1" (2026); no
  later vcpkg-tool release re-adds or further documents it as of
  2026-07-27.
- **`CMAKE_EXPERIMENTAL_*` gates are UUID-valued, not boolean**, and the
  UUID is deliberately rotated across releases "to reinforce their
  experimental nature" (verbatim from CMake's own `Help/dev/experimental.rst`).
  Current gates (as of the 4.4/master dev tree): `EXPORT_PACKAGE_DEPENDENCIES`,
  `MAPPED_PACKAGE_INFO` (CPS via `install(EXPORT)`, distinct from the
  now-stable `install(PACKAGE_INFO)`), `CXX_IMPORT_STD`,
  `EXPORT_BUILD_DATABASE`, `GENERATE_SBOM`, and `RUST`.
- **`import std` is still experimental in 4.4** and gated by
  `CMAKE_EXPERIMENTAL_CXX_IMPORT_STD`; toolchain support is narrow: Clang
  18.1.2+ (libc++ or libstdc++), MSVC toolset 14.36+ (VS 17.6+), GCC 15+
  (non-macOS) or GCC 16+ (macOS), Ninja generators only (not Visual Studio
  generators), Ninja 1.11+ required.
- **Conan's `CMakeConfigDeps` generator is Conan's own current
  recommendation for `cmake-conan`**, not the older `CMakeDeps`. It moved
  incubating (2.13.0, 2025-02-26) → experimental (2.25.0, 2026-01-28) and
  is still gaining fixes in 2.32.0 — it has not reached "stable" status,
  and `cmake-conan`'s own README still calls itself "not released as 1.0
  yet."
- **Conan Workspaces graduated out of incubating in 2.31.0** (2026-07-23).
  Treat any pre-2026 guidance that calls workspaces experimental/incubating
  as stale, but note it is brand-new as GA (six weeks old at the time of
  this survey).
- **Conan added Bazel 9.x support to `BazelDeps`/`bazel_7_lib`/`bazel_7_exe`
  templates in 2.30.0** (2026-06-29) — the companion-contract seam between
  this program and BZL-CC now has a dated version marker.
- **`build_requires` is deprecated in favor of `tool_requires`** (Conan,
  2.28.0-era, 2026-04-28); any recipe or guidance still teaching
  `build_requires` is teaching a deprecated spelling.
- **Conan Center Index is Conan-2-only in practice**: the legacy remote
  froze new publishes for Conan 1.x clients on 2024-11-04, and ~97% of
  recipes were Conan-2-ready as of the 2024-09-30 migration announcement
  (no fresher percentage was found; treat 97% as a floor, not a current
  figure).
- **vcpkg's port count grew from 2,441 (2024-06-15) to 2,524
  (2025-01-13) to 2,858 (2026-07-29)** — roughly 17% growth in the last 26
  months, useful as a freshness signal for any "vcpkg has ~2,000 ports"
  claim.
- **`gersemi` looks like the actively maintained formatter and
  `cmake-format`/`cmakelang` looks stale**: `gersemi`'s repo was pushed
  2026-08-19 (346 stars); `cheshirekow/cmake_format` was last pushed
  2024-05-01 — over two years idle as of this survey.
- **`cmake --workflow` and workflow presets (3.25, schema v6)**, `--fresh`
  (3.24), and `block()`/`endblock()` (3.25) are all now well inside the
  fleet's supported range and unremarkable to recommend outright; presets
  schema has climbed 5 (3.24) → 6 (3.25) → 7 (3.27) → 8 (3.28) → 9 (3.30)
  → 11 (4.3) → 12 (4.4), holding steady across 3.31 and 4.0-4.2.
- **CMake removed VS generators on a rolling schedule**: VS 9 2008 removed
  3.30 (deprecated 3.27), VS 10 2010 removed 3.25, VS 11 2012 removed 3.28
  (deprecated 3.25), VS 12 2013 removed 3.31 (deprecated 3.28) — a clear
  "deprecate one release, remove ~3 releases later" cadence worth stating
  as a pattern for any project still pinning an old VS generator name.
- **`cmake_pkg_config` (3.31, `EXTRACT` only, explicitly "not yet" a
  pkg-config replacement) gained `IMPORT` and `POPULATE` subcommands in
  4.1** — it is closer to usable now than the 3.31 release notes'
  own hedge suggested, but its 3.31-era caveat should not be quoted as
  still current without checking the 4.1+ delta.
- **JetBrains' 2025 "State of C" survey (~900 respondents, 23 countries)
  puts CMake at 56% usage, and dependency-manager usage at: none 51%,
  system package manager 28%, vcpkg 9%, Conan 6%, NuGet 6%, build2 5%,
  Hunter 2%** — half of C developers use no dependency manager at all,
  which is direct survey evidence for the frame's "FetchContent/CPM as the
  de facto no-package-manager package manager" hypothesis, and shows
  Hunter still has non-zero real-world share.
- **This is a "State of C" survey, not "State of C++"** — JetBrains
  publishes them separately; do not cite these numbers as C++-specific
  without checking whether a separate C++ edition exists with different
  figures.

## Survey

### 1. CMake release notes, 3.24 through 4.4 (Kitware GitLab, raw RST)

Fetched verbatim from `https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/<version>.rst` for every minor 3.24-4.4 (no 4.5 exists yet — that path 404s). Key dated facts, cross-checked against `https://github.com/Kitware/CMake/releases` for exact publish timestamps:

- **3.24** (2022-08-04): dependency providers (`cmake_language(SET_DEPENDENCY_PROVIDER)`) and `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` land together. `FetchContent_Declare` gains `FIND_PACKAGE_ARGS` and `OVERRIDE_FIND_PACKAGE` (confirmed by reading `Modules/FetchContent.cmake`'s own `.. versionadded:: 3.24` block directly, not just the release notes — the release notes describe the *find_package↔FetchContent* integration in prose but the exact keyword names live in the module doc). `--fresh` and `CMAKE_COMPILE_WARNING_AS_ERROR`/`COMPILE_WARNING_AS_ERROR` also ship in 3.24. Presets schema bumps to `5`.
- **3.25** (2022-11-16): presets schema `6`, `workflowPresets` field, `cmake --workflow --preset`. `block()`/`endblock()` added. `FetchContent_Declare` gains `SYSTEM`. `add_subdirectory(SYSTEM)`. VS 10 2010 generator removed; VS 11 2012 deprecated.
- **3.26** (2023-03-14): `CTEST_NO_TESTS_ACTION` env var; otherwise a quiet release for this survey's scope.
- **3.27** (2023-07-18): presets schema `7`. `ExternalProject`/`FetchContent` now resolve relative `GIT_REPOSITORY` against the parent project's remote (policy `CMP0150`). VS 9 2008 deprecated.
- **3.28** (2023-12-06): C++20 named modules stable for Ninja and VS generators (VS 2022+/MSVC 14.34+, Clang 16+, GCC 14+ after 2023-09-20 daily). `target_sources(FILE_SET ... TYPE CXX_MODULES)`. `FetchContent_Declare` gains `EXCLUDE_FROM_ALL`. Presets schema `8`. VS 11 2012 removed.
- **3.29** (2024-03-21): ctest `--tests-from-file`/`--exclude-from-file`, job-server integration on POSIX, `-j` with no value or `0` for unbounded parallelism.
- **3.30** (2024-07-02): presets schema `9`. VS 9 2008 removed. `FetchContent` prefers direct population under `CMP0169`.
- **3.31** (2024-11-06): `cmake_pkg_config` added, `EXTRACT` subcommand only, release notes explicitly say "For most users, this is not yet a [pkg-config] replacement." `CMAKE_EXPORT_BUILD_DATABASE` for exporting C++ module compile commands, Ninja-only. `ctest_submit`/`ctest -T Submit` now verify TLS certs and require TLS 1.2+ by default. VS 12 2013 removed. No presets schema bump.
- **4.0** (2025-03-27): **compatibility with CMake older than 3.5 removed** — `cmake_minimum_required`/`cmake_policy` calls pinning an older floor now error; the `<min>...<max>` syntax still works. `CMAKE_POLICY_VERSION_MINIMUM` variable/env-var added as the override. `CMake --preset` no longer prints a cache/env summary by default (only at `VERBOSE`+). macOS Xcode-compiler auto-mapping under `/usr/bin` reverted; `CMAKE_OSX_SYSROOT` now defaults empty. No presets schema bump.
- **4.1** (2025-08-05): `cmake_pkg_config` gains `IMPORT`/`POPULATE`. `project(COMPAT_VERSION)` experimental, gated by `CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO` (a gate name later superseded — see below). `ctest --schedule-random-seed`.
- **4.2** (2025-11-19): `CMAKE_CXX_STDLIB_MODULES_JSON` for `import std` metadata discovery without invoking the compiler. `JOB_POOL_COMPILE` source-file property.
- **4.3** (2026-03-17): **Common Package Specification support added and immediately non-experimental** — `install(PACKAGE_INFO)`/`export(PACKAGE_INFO)`, `find_package()` CPS consumption, `project(COMPAT_VERSION, SPDX_LICENSE)`. `cmake-instrumentation(7)` added. `install(SBOM)` added, **experimental**, gated by `CMAKE_EXPERIMENTAL_GENERATE_SBOM`. Presets schema `11`. Point releases: 4.3.3 moved `export(PACKAGE_INFO)` output into a `cps/<package-name>` subdirectory; 4.3.4 changed `cmake-instrumentation` index-file generation.
- **4.4** (2026-07-09): presets schema `12` (with expansion changes at schema 12+). Ninja Generators gain a named build target; `JOB_POOL_COMPILE` file-set property.

Source cluster: [CMake release notes index](https://cmake.org/cmake/help/latest/release/index.html); per-version raw RST at `https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/{3.24,3.25,3.26,3.27,3.28,3.29,3.30,3.31,4.0,4.1,4.2,4.3,4.4}.rst`; [GitHub Releases API for Kitware/CMake](https://github.com/Kitware/CMake/releases) for exact dates.

### 2. CMake's own experimental-feature mechanism

`https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/dev/experimental.rst` — the authoritative, currently-accurate list (read 2026-09-05, reflects the tree that produced 4.4/heads toward 4.5): every `CMAKE_EXPERIMENTAL_*` variable takes a **specific UUID value**, not `ON`/`TRUE`; the doc states outright "the specific values will change over time to reinforce their experimental nature," and using the feature emits a warning that the behavior isn't covered by CMake's stability guarantees. Current gates and their UUIDs: `EXPORT_PACKAGE_DEPENDENCIES` (`1942b4fa-...`), `MAPPED_PACKAGE_INFO` (`ababa1b5-...`, CPS via `install(EXPORT)` — note this is a *different* mechanism from the now-stable `install(PACKAGE_INFO)`), `CXX_IMPORT_STD` (`25d6f6aa-...`), `EXPORT_BUILD_DATABASE` (`70ef007e-...`), `GENERATE_SBOM` (`248471c2-...`), `RUST` (`b6fdddce-...`, out of this program's C++ scope but confirms the mechanism is general-purpose).

### 3. C++ modules manual (`cmake-cxxmodules(7)`)

`https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-cxxmodules.7.rst` — current toolchain matrix for named modules (Clang 16+, MSVC 14.34+/VS 17.4+, GCC 14+ after 2023-09-20) and, separately, for `import std` (Clang 18.1.2+, MSVC 14.36+/VS 17.6+, GCC 15+ non-macOS, GCC 16+ macOS): only Ninja Generators support `import std` because Visual Studio generators can't build BMIs for `IMPORTED` targets; Ninja 1.11+ is required; the `CXX_MODULE_STD` target property is the per-target opt-in once the experimental gate is set.

### 4. `install()` command reference (current)

`https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/command/install.rst` — confirms `install(PACKAGE_INFO)` carries `.. versionadded:: 4.3` with **no** experimental note (i.e., shipped stable), while `install(SBOM)`, also `.. versionadded:: 4.3`, explicitly says "Experimental. Gated by `CMAKE_EXPERIMENTAL_GENERATE_SBOM`." Also documents `find_package`'s CPS-vs-CMake-script config-file search order (CPS preferred; `CONFIGS` suppresses CPS consideration) via `Help/command/find_package.rst`.

### 5. Kitware: "Common Package Specification is Out the Gate"

[kitware.com, 2026-03-19](https://www.kitware.com/common-package-specification-is-out-the-gate/) — Kitware's own announcement that "CMake 4.3 ... removes the 'experimental' status from CMake's CPS support," names `find_package()` (consuming) and `install(PACKAGE_INFO)` (exporting) as the two supported entry points, and says CPS/pkg-config interop is "actively underway" without naming which other build/package tools have adopted CPS yet.

### 6. Conan 2 changelog (docs.conan.io) and GitHub Releases API

`https://docs.conan.io/2/changelog.html` (fetched in full, 3,025 lines of rendered HTML covering every 2.x release back to 2.0.0) cross-checked against `gh api repos/conan-io/conan/releases`. Dated milestones:

- **2.0.0**: 2023-02-22 (per GitHub Releases API; the changelog page itself lists it as `22-Feb-2023`).
- **`CMakeConfigDeps` generator**: introduced *incubating*, feature-flagged, in 2.13.0 (2025-02-26); moved to *experimental* in 2.25.0 (2026-01-28, PR #19421); through 2.32.0 (2026-08-31) it is still receiving correctness fixes (`NO_SONAME`, common-files-for-host-context, multilib component handling) — never reached "stable."
- **Workspaces**: incubating for most of 2025-2026 (limited `python_requires` support added 2.29.0, 2026-05-28); **"Get Workspace feature out of incubating," 2.31.0, 2026-07-23**.
- **Bazel generators**: `BazelDeps`/`bazel_7_lib`/`bazel_7_exe` gain **Bazel 9.x support in 2.30.0** (2026-06-29, PR #20042); earlier fixes target Bazel 7/8 `glob(allow_empty=True)` compatibility (2.10-2.16 era).
- **`conan audit`**: CVE version info added 2.32.0; `--context={build,host}` filter and SBOM/lockfile support in `conan audit list` land across 2.15-2.18 (2025).
- **SBOM**: CycloneDX-SBOM-generating deployers land ~2.17-2.18 (2025 mid-year); SPDX-expression support in SBOM generation added 2.30.0 (2026-06-29).
- **`build_requires` → `tool_requires`**: `build_requires` explicitly deprecated (PR #19849, 2.28.0-era, 2026-04-28) in favor of `tool_requires`.
- **`package_id`**: micro (4th digit) package-ID modes added 2.32.0; `package_id_abi_options` added 2.29.0 (2026-05-28) for headers-variability cases like `shared` affecting consumer ABI.
- **Deprecation-removal-with-opt-out pattern**: 2.28.0 removed the old `--order-by` behavior and empty version ranges but let projects restore the old behavior "until Conan 2.32" via named policies (`deprecated_build_order_args`, `deprecated_empty_version_range`) — i.e. Conan gives a version-numbered grace window, not an immediate break.

### 7. `conan-io/cmake-conan` README (develop2 branch)

`https://raw.githubusercontent.com/conan-io/cmake-conan/develop2/README.md` — states plainly: "The `cmake-conan` integration in this `develop2` branch ... even if not released as 1.0 yet, is more stable, production-ready and recommended than the legacy `cmake-conan` for Conan 1." Also: "Only the `CMakeConfigDeps` generator is the recommended for `cmake-conan`" — i.e. Conan's own tooling has already moved past `CMakeDeps` for this integration even though `CMakeConfigDeps` itself is still labeled experimental in the core changelog. Uses `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` (the CMake 3.24 feature) as its hook point; documented known limitation that any `find_program`/`find_library`/`find_path`/`find_file` call issued *before* the first `find_package()` won't be intercepted.

### 8. Conan Center Index migration status

[GitHub Discussion #25461](https://github.com/conan-io/conan-center-index/discussions/25461), read 2026-09-05: as of **2024-09-30**, "nearly 97% of all recipes in Conan Center are compatible with Conan 2"; as of **2024-11-04**, the legacy `center.conan.io` remote is frozen — no new recipe revisions or library versions publish there for Conan 1.x clients any more, though previously-published content stays reachable. No fresher completion percentage was located as of this survey; treat 97% as a floor two years stale, not current.

### 9. vcpkg and vcpkg-tool releases (GitHub Releases API + release bodies)

`gh api repos/microsoft/vcpkg/releases` and `repos/microsoft/vcpkg-tool/releases`, full history paginated. Registry releases are monthly-ish; tool releases are more frequent and carry the substantive changelog text (registry releases mostly list port adds/updates/removals plus a rollup of "particularly meaningful" tool changes).

- Newest registry release **2026.07.29** (published 2026-07-31): **port count 2,858**; SPDX-PURL and Git-tree-gitoid additions to generated SBOMs (vcpkg-tool PRs #2049, #2072-2075); OHOS (OpenHarmony/HarmonyOS) platform support added upstream (vcpkg-tool 2026-05-27 release, PR #2004) — a new host/target platform, not in the frame's named triplet list.
- **vcpkg-artifacts (vcpkg-ce) removal announced**: vcpkg-tool release **2026-05-27**, PR #2030, "Note that artifacts will be removed after July 1" [2026]. No subsequent tool release (2026-07-13/24/27) documents completed removal in its own body, but none re-adds or walks it back either.
- Port-count trend: **2,441** (release 2024.06.15) → **2,524** (release 2025.01.13) → **2,858** (release 2026.07.29).

Sources: [vcpkg releases](https://github.com/microsoft/vcpkg/releases), [vcpkg-tool releases](https://github.com/microsoft/vcpkg-tool/releases).

### 10. vcpkg binary-caching reference (Microsoft Learn)

`https://learn.microsoft.com/en-us/vcpkg/reference/binarycaching` (page `git_commit_id` ada8ba11..., updated_at 2025-12-15). The authoritative provider table:

| Source form | Status |
|---|---|
| `clear`, `default[,<rw>]`, `files,<path>[,<rw>]` | Stable, default is `files` |
| `nuget,<uri>[,<rw>]`, `nugetconfig`, `nugettimeout` | Stable |
| `http,<url_template>[,<rw>[,<header>]]` | Stable |
| `x-azblob`, `x-azcopy`, `x-azcopy-sas` | **Experimental** ("will change or be removed without warning") |
| `x-gcs` | **Experimental** |
| `x-aws`, `x-aws-config` | **Experimental** |
| `x-cos` | **Experimental** |
| `x-az-universal` | **Experimental**, and the docs themselves warn it "is known to perform slowly with large numbers of binary packages," recommending `x-azcopy` instead where possible |
| `x-gha` (GitHub Actions cache) | **Removed** — "This section covers a feature that has been removed from vcpkg. The documentation for this feature is no longer maintained." |

The default binary cache (no configuration) is the `files` provider at `%LOCALAPPDATA%\vcpkg\archives` (Windows) or `$XDG_CACHE_HOME/vcpkg/archives`/`$HOME/.cache/vcpkg/archives` (non-Windows). The companion [Binary Caching overview](https://learn.microsoft.com/en-us/vcpkg/users/binarycaching) (updated_at 2025-05-09) still shows GitHub-Packages-via-NuGet as the recommended CI pattern, since the native GHA-cache provider is gone.

### 11. vcpkg manifest and configuration references

[`vcpkg.json` reference](https://learn.microsoft.com/en-us/vcpkg/reference/vcpkg-json) (updated_at 2025-10-02) and [`vcpkg-configuration.json` reference](https://learn.microsoft.com/en-us/vcpkg/reference/vcpkg-configuration-json) (updated_at 2025-10-02). Confirms: `"license"` is an SPDX short-license-expression string or `null` (no DocumentRefs); `"overrides"` are top-level-only exact version pins, transitive overrides are ignored; `"host": true` on a dependency marks it host-triplet (cross-compilation tool dependency); package-name-prefix patterns (`boost-*`) in registry `"packages"` lists were "Added in tool version 2022-12-14" — i.e. pre-dates this survey's 24-36-month window, included because it is still the mechanism in current docs; `vcpkg-configuration.json` supports `"overlay-ports"` and `"overlay-triplets"` alongside `"registries"`/`"default-registry"`.

### 12. CPM.cmake releases

`gh api repos/cpm-cmake/CPM.cmake/releases`, full history (v0.1 2019-04-09 through v0.43.1). Recent cadence: v0.40.0 (2024-06-12) through v0.43.1 (2026-07-06) — roughly a release every 1-2 months, actively maintained, no archival flag. `CPM_USE_LOCAL_PACKAGES`/`CPM_LOCAL_PACKAGES_ONLY`/`CPM_DOWNLOAD_ALL`/`CPM_SOURCE_CACHE` variables are documented in the project's own README (`https://github.com/cpm-cmake/CPM.cmake/blob/master/README.md`) as the stable interception knobs.

### 13. cpp-pm/hunter maintenance status

`gh api repos/cpp-pm/hunter` — **not archived**, `pushed_at` 2026-08-27, `updated_at` 2026-08-30, 35 open issues, latest tagged release **v0.26.11** (2026-08-27). Most recent commits (read via `gh api repos/cpp-pm/hunter/commits`) include a live example of the CMake 4.0 floor-removal fallout: `Protobuf: CMake 4+ support set CMAKE_POLICY_VERSION_MINIMUM=3.5 (#858)` (2026-06-11), fixing the exact "`cmake_minimum_required(VERSION ...)` compatibility error" the 4.0 release notes describe. This directly contradicts the frame's open question about whether Hunter is maintained at all in 2026 — it is, and it is actively adapting to the CMake 4.0 break.

### 14. Formatter/linter maintenance: gersemi vs. cmake-format

`gh api repos/BlankSpruce/gersemi` — `pushed_at` 2026-08-19, 346 stars, not archived. `gh api repos/cheshirekow/cmake_format` — `pushed_at` **2024-05-01**, not archived but over two years without a push as of this survey. This is circumstantial (push dates, not a definitive "which formatter is canonical now" ruling) but is a clear activity-gap signal in the direction the frame already suspected.

### 15. Ninja releases

`gh api repos/ninja-build/ninja/releases` — 1.13.0 (2025-06-18), 1.13.1 (2025-07-10), 1.13.2 (2025-11-20). CMake's `cmake-cxxmodules(7)` manual requires Ninja 1.11+ for `import std`/module scanning support generally; no CMake release note in this survey's window names a Ninja-1.12/1.13-specific new requirement.

### 16. Bazel 9 and rules_foreign_cc (companion-contract row only)

`gh api repos/bazelbuild/bazel/releases` — **Bazel 9.0.0 released 2026-01-20**. `gh api repos/bazelbuild/rules_foreign_cc` — last *tagged* release **0.15.1** (2025-06-24) but repo still pushed as recently as 2026-06-28, i.e. it trails Bazel's own release cadence by roughly seven months between the Bazel-9 GA and any subsequent rules_foreign_cc tag. This is the one row this program owns on the Bazel side of the seam per the companion contract; BZL-CC (`bazel-topic-map.md` dive 9.3, row M-L-13) owns the rest of the `rules_foreign_cc` story.

### 17. JetBrains "State of C" 2025 survey

[lp.jetbrains.com/the-state-of-c-2025](https://lp.jetbrains.com/the-state-of-c-2025/), ~900 respondents across 23 countries, published 2025. Build-system share: CMake 56%, Makefiles 37%, Visual Studio projects 29%, Ninja 12%, Xcode 5%, Meson 4%, custom 4%. Dependency-manager share: none 51%, system package manager 28%, vcpkg 9%, Conan 6%, NuGet 6%, build2 5%, Hunter 2%. Note the page title says "C," not "C++" — JetBrains runs these as separate surveys and this program should not silently substitute one for the other in a shipped rule.

## Candidate topics

| Topic (question) | Why it matters | Source | Covered? | Priority |
|---|---|---|---|---|
| Does this `CMakeLists.txt`'s `cmake_minimum_required` floor survive CMake 4.0, or will it error on a fresh 4.x install? | The single highest-frequency breakage from the 4.0 floor removal; a grep-able, mechanically verifiable question. | [4.0 release notes](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/4.0.rst) | no | P0 — every consumer of `find_ocx`-provisioned CMake 3.31/4.x hits this |
| When a vendored/third-party `CMakeLists.txt` can't be fixed, is `CMAKE_POLICY_VERSION_MINIMUM` set narrowly (per-subdirectory) or globally, and does the project document why? | The escape hatch is a blunt instrument; setting it globally silently re-enables ancient policy defaults project-wide. | [4.0 release notes](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/4.0.rst) | no | P0 |
| Does a `FetchContent_Declare(... OVERRIDE_FIND_PACKAGE)` call correctly note that `OVERRIDE_FIND_PACKAGE` and `FIND_PACKAGE_ARGS` are mutually exclusive? | Silent misuse produces a config-time error that reads unrelated to the real cause. | [FetchContent.cmake, `.. versionadded:: 3.24`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Modules/FetchContent.cmake) | no | P1 |
| When does a `FetchContent`-declared dependency silently shadow the system copy `find_package` would have found, and how is that detected? | Named directly in the frame as a suspected sharp edge; `FETCHCONTENT_TRY_FIND_PACKAGE_MODE` interacts with `OVERRIDE_FIND_PACKAGE` in ways that are easy to get backwards. | [FetchContent module, 3.24 notes](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/3.24.rst) | no | P0 |
| Is a project's dependency provider (Conan's `conan_provider.cmake`, a custom one) set via `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` compatible with also using `find_ocx`'s own `find_package`/`Findocx.cmake` bootstrap in the same configure? | Direct instance of the frame's "two or three providers compose" sharp question — provider chaining/precedence is undocumented territory. | [3.24 release notes](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/3.24.rst); [cmake-conan README](https://raw.githubusercontent.com/conan-io/cmake-conan/develop2/README.md) | no | P0 |
| Does a project relying on `cmake-conan`'s dependency-provider hook call `find_program`/`find_library`/`find_path`/`find_file` *before* its first `find_package()`? | Documented known limitation — such calls silently bypass the provider. | [cmake-conan README, "Known limitations"](https://raw.githubusercontent.com/conan-io/cmake-conan/develop2/README.md) | no | P1 |
| Which generator does the CI matrix use for C++20 named modules, and does it match the supported list (Ninja, VS 2022+/MSVC 14.34+/Clang 16+/GCC 14+)? | Modules support is generator- and toolchain-gated; the wrong combination fails silently or falls back to non-module compilation. | [cmake-cxxmodules(7)](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-cxxmodules.7.rst) | no | P1 |
| Is `import std` used anywhere without `CMAKE_EXPERIMENTAL_CXX_IMPORT_STD` set to the exact current UUID, and is that UUID pinned to the CMake minor actually in use? | The UUID rotates by design; a stale UUID from an older tutorial silently fails to enable the feature (or worse, on an old CMake, silently no-ops). | [Help/dev/experimental.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/dev/experimental.rst) | no | P0 — this is exactly the kind of trap this program exists to catch |
| Does a rule or example still call `install(EXPORT ... CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO)` gated by `CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO`, when the stable path is now `install(PACKAGE_INFO)` (no gate, since 4.3)? | Two CPS-export mechanisms coexist with different stability; conflating them ships wrong advice. | [install.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/command/install.rst); [Kitware CPS post](https://www.kitware.com/common-package-specification-is-out-the-gate/) | no | P1 |
| Does `find_package()` in this project's minimum-required CMake version even attempt CPS discovery, or is that a 4.3+-only behavior being assumed on an older floor? | CPS consumption is new; code written against current docs may silently regress to CMake-script-only lookup on an older pinned CMake. | [find_package.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/command/find_package.rst) | no | P1 |
| Is `install(SBOM)`/`export(SBOM)` used without acknowledging it needs `CMAKE_EXPERIMENTAL_GENERATE_SBOM`, separate from Conan's or vcpkg's own SBOM generation? | Three different tools (CMake, Conan, vcpkg) now generate SBOMs by three different mechanisms; a project could accidentally get zero, one, or three conflicting SBOMs. | [install.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/command/install.rst); [Conan changelog, SPDX/CycloneDX entries](https://docs.conan.io/2/changelog.html) | no | P2 |
| Does the project's presets file declare a `"version"` the pinned CMake minor actually supports, and does CI pin a CMake new enough for that schema version? | Schema jumped 5→12 across this window; an old CMake silently rejects (or a new preset feature silently no-ops on) a mismatched schema. | [presets schema history, per-version release notes] | no | P0 |
| Does any CI script still reference `vcpkg`'s `x-gha` binary-cache source? | Removed feature; a script still passing `x-gha` either errors or silently falls back with no caching, depending on vcpkg-tool version. | [vcpkg binarycaching reference](https://learn.microsoft.com/en-us/vcpkg/reference/binarycaching) | no | P0 — direct, mechanically greppable regression |
| Does any documentation or CI still reference `vcpkg-artifacts`/`vcpkg-ce`/`vcpkg new --artifact`? | Announced for removal after 2026-07-01; guidance written before that date is now stale. | [vcpkg-tool 2026-05-27 release](https://github.com/microsoft/vcpkg-tool/releases/tag/2026-05-27) | no | P1 |
| Is a `VCPKG_BINARY_SOURCES` entry using an `x-`-prefixed experimental provider (`x-azblob`, `x-gcs`, `x-aws`, `x-cos`, `x-azcopy*`, `x-az-universal`) called out as experimental in the project's own docs, so a future breaking change doesn't surprise the team? | vcpkg's own docs warn these "will change or be removed without warning" — same class of risk as `x-gha` just realized. | [vcpkg binarycaching reference](https://learn.microsoft.com/en-us/vcpkg/reference/binarycaching) | no | P1 |
| Does a `vcpkg-configuration.json` or embedded `"configuration"` field pin a `"baseline"` (git commit SHA) rather than a floating branch reference, for every registry it declares? | Baseline pinning is the reproducibility mechanism; a missing/floating baseline reintroduces the "silently different versions on different machines" bug class. | [vcpkg-configuration.json reference](https://learn.microsoft.com/en-us/vcpkg/reference/vcpkg-configuration-json) | partial (sibling sets cover lockfiles generically, not this format) | P0 |
| Does a `conanfile.py`/`conanfile.txt` still spell `build_requires` instead of `tool_requires`? | Deprecated in 2.28.0-era Conan; mechanically greppable. | [Conan changelog](https://docs.conan.io/2/changelog.html) | no | P1 |
| Is `CMakeDeps` used where `CMakeConfigDeps` (Conan's own current recommendation) would avoid the documented `CMakeDeps` issues, and if `CMakeConfigDeps` is used, is its non-stable status (incubating→experimental, never GA as of 2.32) documented? | Conan's own tooling has moved past `CMakeDeps` but the replacement is explicitly not stable — both defaults carry a caveat that must be stated, not assumed. | [cmake-conan README](https://raw.githubusercontent.com/conan-io/cmake-conan/develop2/README.md); [Conan changelog CMakeConfigDeps entries](https://docs.conan.io/2/changelog.html) | no | P1 |
| If the project uses Conan Workspaces, does it assume the pre-2.31.0 incubating behavior or the current (six-weeks-old as of this survey) GA behavior? | Workspaces only graduated 2026-07-23; almost every existing tutorial predates GA and may describe a different feature shape. | [Conan changelog, 2.31.0 entry](https://docs.conan.io/2/changelog.html) | no | P2 |
| Does a Conan recipe or profile assume Conan 1.x remotes/behavior, when Conan Center froze Conan-1.x publishing on 2024-11-04? | Directly answers "is this project stuck on a dead ecosystem branch." | [conan-center-index discussion #25461](https://github.com/conan-io/conan-center-index/discussions/25461) | no | P0 |
| Does the project's CMake/Conan/vcpkg CI job actually assert the CMake, Conan, and vcpkg minor versions it was validated against, or does it float to "latest" and silently absorb breaking changes like the 4.0 floor removal or the `x-gha` removal? | This entire survey is a list of "the ground moved" events; version-pinned CI is the generic defense. | synthesis of all rows above | no | P0 |
| Is `find_ocx`'s tool-provisioning role (via `Findocx.cmake`/`ocx.cmake`) documented as distinct from — and composable with — Conan `tool_requires` or vcpkg host dependencies, for teams that adopt more than one? | Named directly in the frame as "OCX competes with Conan `tool_requires` and vcpkg host dependencies for *tool* provisioning." | frame §"The codebases that will adopt the output" | no | P0 — this is this program's differentiator versus the canonical package-manager survey |
| Does `<Pkg>_ROOT`/`CMP0074` interact correctly when both a package manager's toolchain file (`conan_toolchain.cmake`, vcpkg's `scripts/buildsystems/vcpkg.cmake`) and `find_ocx`'s own path injection are present in the same configure? | Two toolchain files, one `CMAKE_TOOLCHAIN_FILE` variable — chaining is a real, underdocumented collision named in the frame. | frame §"The requester's hypothesis" | no | P0 |
| Does the project pin an exact `Hunter`/`cpp-pm` fork tag, and does that tag postdate the CMake-4.0-floor fix landed in the fork's own commit history (2026-06-11)? | Hunter is alive but was itself broken by the 4.0 floor removal until a specific commit; an old pinned tag inherits the break. | [cpp-pm/hunter commit #858](https://github.com/cpp-pm/hunter/commit/) (via `gh api repos/cpp-pm/hunter/commits`) | no | P1 |
| Is CPM.cmake pinned to a specific release SHA/tag (not a floating branch), and does the pin postdate whatever `CPM_SOURCE_CACHE`/`CPM_USE_LOCAL_PACKAGES` behavior the project relies on? | CPM ships roughly bimonthly; an unpinned `CPM.cmake` download is itself a supply-chain and reproducibility gap, ironically for a dependency-management tool. | [CPM.cmake releases](https://github.com/cpm-cmake/CPM.cmake/releases) | partial (sibling package-managers-canonical survey likely covers CPM basics; this angle is the pin/reproducibility question specifically) | P1 |
| Does project tooling (formatter/linter) invoke `cmake-format`/`cmakelang`, and if so, is that a deliberate choice given `gersemi`'s much more active maintenance signal? | Activity-gap finding from this survey; not a hard "never use X" rule but worth a documented decision. | repo `pushed_at` comparison (`cheshirekow/cmake_format` vs `BlankSpruce/gersemi`) | no | P2 |
| Does the project's `-Werror=dev`/lint gate reject use of a deprecated CMake command or removed generator name (e.g. `Visual Studio 9/10/11/12 20XX`) still hard-coded in a preset or script? | Concrete, greppable regression from the VS-generator removal cadence. | per-version release notes (3.25, 3.28, 3.30, 3.31) | no | P1 |
| Does a CTest invocation rely on `--test-dir`, resource groups, `--repeat`, or dynamically generated resource spec files, and if so, is the CMake floor new enough (3.28+ for `GENERATED_RESOURCE_SPEC_FILE`)? | Version-gated CTest features silently no-op or error on an older floor. | [3.28 release notes](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/3.28.rst) | no | P2 |
| Does the project's CTest submission step assume the pre-3.31 default of not verifying TLS certificates, e.g. by disabling verification "for convenience" in a way that now requires an explicit override? | 3.31 flipped the default to verify-and-require-TLS-1.2+; a script written to "fix" pre-3.31 cert issues may now be doing something actively insecure on 3.31+. | [3.31 release notes](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/3.31.rst) | no | P2 |
| Does the project use `cmake_pkg_config` assuming only 3.31's `EXTRACT`-only capability, when 4.1+ added `IMPORT`/`POPULATE` that changes the recommended usage pattern? | Directly reverses a "not yet a replacement" caveat from the same tool's own release notes 3 minors later. | [3.31](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/3.31.rst) and [4.1](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/4.1.rst) release notes | no | P2 |
| Is `CMAKE_COMPILE_WARNING_AS_ERROR`/`COMPILE_WARNING_AS_ERROR` set project-wide in a way that a `-Werror=dev` policy warning (not a compiler warning) could be conflated with, given they're unrelated mechanisms with similar names? | Naming collision risk between a CMake-language dev warning flag and a compiler-warning-promotion variable, both introduced same release (3.24). | [3.24 release notes](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/3.24.rst) | no | P3 |
| Does a relocatable installed Config package (or CPS file) reference any absolute build-tree path, defeating both classic Config-package relocatability and the Bazel-side "wrappable by `rules_foreign_cc`" requirement? | Directly the seam the companion contract assigns to this program; a single verification (`grep` the installed tree for the build-tree absolute path) covers both audiences. | frame §"The companion contract with the Bazel program" | covered-elsewhere (BZL-CC owns the Bazel-side half; this program owns the CMake-side "does install() honor `GNUInstallDirs`/relative paths" half) | P0 |
| If a project builds both a CMake tree and a Bazel `BUILD`/`MODULE.bazel` tree for the same C++ sources (the abseil/gRPC/protobuf/googletest pattern), what keeps the two dependency graphs (Conan/vcpkg lockfile vs. BCR/`bazel_dep`) from silently diverging? | Named in the frame as the "two-lockfile problem... from this side"; BZL-CC owns the Bazel half, this program owns "how does the CMake side notice drift." | frame §"The companion contract" | partial | P1 |
| Does a project's `CMakeLists.txt` set `CMAKE_LINK_LIBRARIES_ONLY_TARGETS` (3.23, just outside this window but still current guidance), and does enabling it retroactively break an existing `target_link_libraries(... some/lib/path.so)` call? | Named directly by the frame; enabling it is a real migration hazard even though the feature itself predates the survey window. | [3.23 release notes](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/3.23.rst) | no | P2 |
| Does the project's `vcpkg.json` `"license"` field use a real SPDX expression (not a made-up string), and does a feature-level `"license"` correctly override or inherit the top-level one? | Mechanically checkable (SPDX-expression grammar is documented exactly); a wrong/free-text license field is invisible until an SBOM or compliance tool chokes on it. | [vcpkg.json reference](https://learn.microsoft.com/en-us/vcpkg/reference/vcpkg-json) | no | P2 |
| Does a `vcpkg.json` `"overrides"` entry actually take effect, given transitive `"overrides"` from dependencies are silently ignored? | Documented, surprising semantic — a library author's override never propagates. | [vcpkg.json reference, "overrides"](https://learn.microsoft.com/en-us/vcpkg/reference/vcpkg-json) | no | P2 |
| Does a Conan profile's `[tool_requires]` section correctly distinguish build-context tool dependencies from host-context library dependencies, especially after the `build_requires` deprecation? | Direct successor question to the `build_requires`→`tool_requires` rename; getting build/host context wrong silently cross-compiles the wrong thing. | [Conan changelog](https://docs.conan.io/2/changelog.html) | no | P1 |
| Does the project state, in one place, which exact CMake, Conan, and vcpkg minors the CI matrix validates — including whether "3.19 floor, 3.31/4.x dogfooded" (find_ocx's own stated range) covers the CPS/import-std/CMakeConfigDeps features this rule set might otherwise recommend? | The single most load-bearing "verification" any shipped rule needs: a version claim that doesn't match the actual floor is worse than no claim. | frame §"The domain and its era"; this survey's era-check table | no | P0 |
| Is a binary-cache key (Conan's ABI-relevant `package_id`, vcpkg's ABI hash, CMake's own build-database) computed over inputs that actually capture toolchain/flag changes, or can two semantically different builds collide on the same cache key? | Three different binary-cache mechanisms (Conan `package_id`, vcpkg ABI hash, and any external ccache/sccache key) exist in the same pipeline with no shared model — a classic "cache poisoning by coincidence" trap. | [vcpkg binarycaching reference, "ABI Hash" section](https://learn.microsoft.com/en-us/vcpkg/reference/binarycaching); [Conan changelog, package_id entries](https://docs.conan.io/2/changelog.html) | no | P1 |
| Does the project's dependency-manager choice (or "none," per the 51% JetBrains figure) match its actual reproducibility needs, or is `FetchContent`/CPM being used as a package manager without the lockfile/pin discipline a real package manager would enforce? | Direct evidence-backed instance of the frame's central hypothesis; the survey shows this is the modal case (51% use nothing), not an edge case. | [JetBrains State of C 2025](https://lp.jetbrains.com/the-state-of-c-2025/) | no | P0 — this is the hypothesis the whole program should weigh most carefully |
| If ccache or sccache is set via `CMAKE_<LANG>_COMPILER_LAUNCHER`, does anything else (a package manager's toolchain file, a preset) also set `RULE_LAUNCH_COMPILE` or the same launcher variable, silently chaining or overriding it? | Real 2025-era community-reported failure mode (launcher chains like `sccache;ccache;cl.exe` and forced-launcher CI settings overriding local dev settings). | community reports surfaced via web search (see Sources) | no | P2 |
| Does the project document whether it targets the CPS ecosystem at all, given adoption outside CMake itself ("almost nothing outside CMake produces CPS files" as of early 2026) is still thin? | Prevents over-committing to a spec that is stable in CMake but not yet reciprocated by the tools a project actually ships against. | web search synthesis, CPS status sources (see Sources) | no | P2 |

## Recent shifts seen in this corpus

- **CMake 4.0 floor removal (2025-03-27)** is the single largest "old advice no longer works" event in this window: any pre-2025 tutorial assuming `cmake_minimum_required(VERSION 2.8)`-style floors configures cleanly is now wrong on 4.x without `CMAKE_POLICY_VERSION_MINIMUM`.
- **CPS went from nonexistent to stable inside 18 months**: no CPS support before 4.1's gated, narrow `project(COMPAT_VERSION)` preview (2025-08-05), to a full stable `install(PACKAGE_INFO)`/`find_package()` consumption path in 4.3 (2026-03-17). Any guidance written against 4.1 or 4.2 describing CPS as experimental is stale for the `install(PACKAGE_INFO)` path specifically (the `install(EXPORT ...)`-based CPS variant and `install(SBOM)` remain experimental).
- **vcpkg shed two features in one window**: the GitHub Actions binary-cache provider (`x-gha`, removed, undated exact commit but documented as removed in current reference docs) and `vcpkg-artifacts`/`vcpkg-ce` (announced for removal 2026-05-27, effective "after July 1" 2026). Both were the kind of feature a 2024-era blog post would confidently recommend.
- **Conan's recommended CMake-integration generator changed under `cmake-conan` even though the generator itself never left "experimental"**: `CMakeConfigDeps` superseded `CMakeDeps` as the tool's own recommendation while still carrying an experimental label in the core changelog — a "recommended but not stable" state that is easy to misreport as either "just use the default" or "don't touch it, it's experimental."
- **Hunter's suspected death is not supported by evidence**: this survey found active maintenance, a 2026-08-27 release, and a commit fixing exactly the CMake-4.0-floor problem this survey also documents independently — a direct falsification of a plausible hypothesis, which the frame explicitly asked scouts to attempt.
- **`gersemi` overtaking `cmake-format` in maintenance activity** matches the frame's suspicion but is based on push-date circumstantial evidence only (not download counts, not a formal deprecation announcement from `cmake-format`'s maintainer) — flagged here as a shift to verify further, not a settled fact.

## Contested

- **Is `CMakeConfigDeps` the right default to recommend?** Conan's own `cmake-conan` integration recommends it over `CMakeDeps` for new integrations, yet the Conan core changelog has never marked it non-experimental across 2.13.0→2.32.0 (19+ months). Trending: toward eventual stabilization (steady stream of fixes, no signs of abandonment), but not there yet as of 2026-09-05 — any rule should say "current recommendation, still experimental" rather than picking a side.
- **How complete is Conan-2 recipe migration, really?** The only concrete number found (97%, as of 2024-09-30) is now two years old; the remote froze Conan-1 publishing shortly after, which argues the real number today is higher, but no source in this survey states a current figure. Trending: assume "effectively done" is safe messaging, but the specific "97%" figure should not be repeated as current without a fresher source.
- **CPS adoption outside CMake.** CMake's own support is stable (4.3+), and Conan is working on interop, but "almost nothing outside CMake produces CPS files" per contemporaneous commentary found via web search (not independently verified against a primary CPS-project source in this pass — flagged for a follow-up wave that reads `cps-org.github.io/cps` and Conan's own CPS integration docs directly). Trending: CMake-side momentum is real; ecosystem-wide momentum is unproven.
- **Is Hunter worth recommending at all, even though it's maintained?** JetBrains' 2025 survey puts it at 2% dependency-manager share — alive, but a rounding error next to vcpkg (9%) and Conan (6%). "Maintained" and "worth a rule section" are different questions this survey does not resolve; that's a design decision for the next research phase, not a fact this scout can settle.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [cmake.org/cmake/help/latest/release/index.html](https://cmake.org/cmake/help/latest/release/index.html) | CMake release-notes index | current (4.4.x docs) | Confirms the full 3.24-4.4 minor list and that no 4.5 exists yet |
| [gitlab.kitware.com/.../Help/release/{3.24..4.4}.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/4.0.rst) | CMake's own release notes, raw RST, every minor 3.24-4.4 | 2022-08 to 2026-07 (per-version dates in Survey §1) | Primary, verbatim, complete — the only correct way to date a CMake feature |
| [gitlab.kitware.com/.../Help/dev/experimental.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/dev/experimental.rst) | CMake's living list of `CMAKE_EXPERIMENTAL_*` gates and their current UUIDs | read 2026-09-05, reflects post-4.4 dev tree | Only source for the exact UUID mechanism and the current gate list |
| [gitlab.kitware.com/.../Modules/FetchContent.cmake](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Modules/FetchContent.cmake) | FetchContent module source with inline `.. versionadded::` docs | current | Ground truth for exact keyword-to-version mapping the release notes only describe in prose |
| [gitlab.kitware.com/.../Help/command/install.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/command/install.rst) | `install()` command reference | current | Confirms `PACKAGE_INFO` shipped stable and `SBOM` shipped experimental, both in 4.3, distinguishing two features that landed in the same release with different stability |
| [gitlab.kitware.com/.../Help/manual/cmake-cxxmodules.7.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-cxxmodules.7.rst) | C++ modules manual | current | The only place the exact compiler-version matrix for named modules and `import std` is stated together |
| [github.com/Kitware/CMake/releases](https://github.com/Kitware/CMake/releases) | GitHub Releases API mirror of every CMake tag | full history | Exact publish timestamps (the RST files carry version numbers but not always a machine-readable date) |
| [kitware.com — "Common Package Specification is Out the Gate"](https://www.kitware.com/common-package-specification-is-out-the-gate/) | Kitware's own blog | 2026-03-19 | Independent confirmation, in Kitware's own words, of the exact release (4.3) and mechanism that stabilized CPS |
| [docs.conan.io/2/changelog.html](https://docs.conan.io/2/changelog.html) | Conan 2's official changelog, every release 2.0.0-2.32.0 | 2023-02-22 to 2026-08-31 | Primary, complete, PR-linked — the single best source for dating any Conan-2 feature |
| [github.com/conan-io/conan/releases](https://github.com/conan-io/conan/releases) | GitHub Releases API mirror | full history | Machine-readable publish timestamps to cross-check the changelog's human-written dates |
| [raw.githubusercontent.com/conan-io/cmake-conan/develop2/README.md](https://raw.githubusercontent.com/conan-io/cmake-conan/develop2/README.md) | `cmake-conan`'s own README | current (develop2 branch) | States, in the tool's own words, its recommended generator and unreleased-1.0 status — can't get this from the Conan core changelog alone |
| [GitHub Discussion conan-io/conan-center-index#25461](https://github.com/conan-io/conan-center-index/discussions/25461) | Official Conan Center Index migration announcement | 2024-09-30 / 2024-11-04 | Only source found with a concrete Conan-2-readiness percentage and the exact freeze date for Conan-1 publishing |
| [github.com/microsoft/vcpkg/releases](https://github.com/microsoft/vcpkg/releases) | vcpkg registry releases, full history with port-add/update/remove lists | 2019-06 to 2026-07-29 | Primary source for port-count trend and per-release "particularly meaningful" tool-change rollups |
| [github.com/microsoft/vcpkg-tool/releases](https://github.com/microsoft/vcpkg-tool/releases) | vcpkg-tool releases, full history | 2021-02 to 2026-07-27 | Carries the substantive PR-level changelog, including the vcpkg-artifacts removal notice |
| [learn.microsoft.com/.../vcpkg/reference/binarycaching](https://learn.microsoft.com/en-us/vcpkg/reference/binarycaching) | vcpkg's official binary-caching reference | updated_at 2025-12-15 | The only place that states, per-provider, which are stable vs. experimental vs. removed (`x-gha`) |
| [learn.microsoft.com/.../vcpkg/reference/vcpkg-json](https://learn.microsoft.com/en-us/vcpkg/reference/vcpkg-json) | vcpkg.json manifest reference | updated_at 2025-10-02 | Authoritative field-by-field spec, including SPDX-license grammar and the overrides-are-not-transitive rule |
| [learn.microsoft.com/.../vcpkg/reference/vcpkg-configuration-json](https://learn.microsoft.com/en-us/vcpkg/reference/vcpkg-configuration-json) | vcpkg-configuration.json reference | updated_at 2025-10-02 | Registry/baseline/overlay schema, needed for the lockfile-format candidate topics |
| [github.com/cpm-cmake/CPM.cmake/releases](https://github.com/cpm-cmake/CPM.cmake/releases) | CPM.cmake releases, full history | 2019-04 to 2026-07-06 | Confirms active bimonthly cadence, no archival |
| [github.com/cpp-pm/hunter](https://github.com/cpp-pm/hunter) (repo metadata + commits, via `gh api`) | cpp-pm/hunter maintenance signal | pushed_at 2026-08-27 | Directly falsifies the frame's "is Hunter dead" open question |
| [github.com/BlankSpruce/gersemi](https://github.com/BlankSpruce/gersemi) and [github.com/cheshirekow/cmake_format](https://github.com/cheshirekow/cmake_format) (repo metadata via `gh api`) | Formatter maintenance signal | gersemi pushed 2026-08-19; cmake_format pushed 2024-05-01 | The only evidence found for the "gersemi is overtaking cmake-format" shift the frame suspected |
| [github.com/ninja-build/ninja/releases](https://github.com/ninja-build/ninja/releases) | Ninja releases | 1.13.0-1.13.2, 2025-06 to 2025-11 | Era check for the Ninja version CMake's module-scanning support requires |
| [github.com/bazelbuild/bazel/releases](https://github.com/bazelbuild/bazel/releases) and [github.com/bazelbuild/rules_foreign_cc](https://github.com/bazelbuild/rules_foreign_cc) (via `gh api`) | Bazel 9 and rules_foreign_cc release/activity data | Bazel 9.0.0 2026-01-20; rules_foreign_cc last tag 2025-06-24 | The one companion-contract row this program owns on the Bazel side |
| [lp.jetbrains.com/the-state-of-c-2025](https://lp.jetbrains.com/the-state-of-c-2025/) | JetBrains developer ecosystem survey ("State of C"), ~900 respondents, 23 countries | published 2025 | Only quantitative, methodology-stated adoption data found for CMake/Conan/vcpkg/Hunter/build2 usage share |
| [hackingcpp.com/cpp/tools/package_managers](https://hackingcpp.com/cpp/tools/package_managers) | Community C++ package-manager roundup | page claims 2026 in title, but fetched content was last substantively updated 2021-06-08 | Included as a negative example: a URL that *looks* current but isn't — worth flagging so this program doesn't cite it as fresh without checking the actual last-updated date itself |
| community reports on `CMAKE_<LANG>_COMPILER_LAUNCHER` chaining issues (surfaced via web search, not independently fetched from a primary GitHub issue in this pass) | CMake Discourse / GitHub issue discussion, 2025-02 | 2025 | Flags a real-world compiler-launcher interaction hazard for a candidate topic; should be re-verified against the primary issue thread in a later wave before being cited in a shipped rule |

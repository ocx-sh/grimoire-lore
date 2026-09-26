---
title: "vcpkg in 2026: manifests, baselines, triplets and caches"
topic: cmake-package-managers
agent: vcpkg-manifests-and-caching
model: sonnet
kind: web
date_researched: 2026-09-26
sources_count: 19
scope: |
  Consumer-side vcpkg in manifest mode as of vcpkg-tool 2026-09-26 / vcpkg
  registry 2026.07.29: vcpkg.json/vcpkg-configuration.json reproducibility,
  the CMake toolchain wire-up, triplet ABI variables, binary and asset
  caching, and vcpkg-artifacts status. Answers M-N-01 through M-N-06, M-N-08,
  and the vcpkg halves of M-L-03 (lock-of-record) and M-L-05 (ABI
  consistency) from cmake-topic-map.md. Does not cover port/portfile
  authoring (M-N-07, M-N-09 — staged wave-3 dive `vcpkg-port-authoring`), the
  Conan side of any shared row, or the CMake-language side of toolchain-file
  mechanics (owned by cmake-build).
---

## Table of contents

1. [Manifest reproducibility: baseline, overrides, versions](#1-manifest-reproducibility-baseline-overrides-versions)
2. [Wiring the toolchain: timing, presets, manifest mode](#2-wiring-the-toolchain-timing-presets-manifest-mode)
3. [Triplets and ABI: CRT linkage vs CMAKE_MSVC_RUNTIME_LIBRARY](#3-triplets-and-abi-crt-linkage-vs-cmake_msvc_runtime_library)
4. [Binary caching: the provider table and malformed sources](#4-binary-caching-the-provider-table-and-malformed-sources)
5. [Asset caching and offline CI](#5-asset-caching-and-offline-ci)
6. [vcpkg-artifacts: announced removed, not removed](#6-vcpkg-artifacts-announced-removed-not-removed)
7. [Library-side vcpkg.json: features, platforms, license](#7-library-side-vcpkgjson-features-platforms-license)
8. [No dependency provider, no CPS, in vcpkg-tool](#8-no-dependency-provider-no-cps-in-vcpkg-tool)
9. [The 2026-09-26 vcpkg-tool release](#9-the-2026-09-26-vcpkg-tool-release)
10. [Two open, years-old vcpkg-tool issues](#10-two-open-years-old-vcpkg-tool-issues)

## Summary

- A top-level manifest is only reproducible if it sets `builtin-baseline` (or an equivalent `default-registry.baseline` in `vcpkg-configuration.json`); without either, vcpkg silently runs the **Classic mode algorithm and ignores all versioning information** — no error, no warning ([versioning](https://learn.microsoft.com/en-us/vcpkg/users/versioning#baselines), vcpkg-tool current as of 2026-09-26).
- `overrides` declared in a dependency's own manifest are **ignored** — "Only overrides defined by the top-level project are used" ([vcpkg-json](https://learn.microsoft.com/en-us/vcpkg/reference/vcpkg-json#overrides)); this is true of the whole `vcpkg-configuration.json` file too, not just `overrides` ([vcpkg-configuration-json](https://learn.microsoft.com/en-us/vcpkg/reference/vcpkg-configuration-json)).
- Baselines move by `vcpkg x-update-baseline [--add-initial-baseline] [--dry-run]`; port pins move by `x-add-version`. Both are still **x-prefixed experimental** as of the 2026-09-26 vcpkg-tool release — no promotion to stable in this window ([update-baseline](https://learn.microsoft.com/en-us/vcpkg/commands/update-baseline)).
- Only **5 of 9** real consumer `vcpkg.json` files in the 46-repo corpus (arrow ×2, project_options ×2, cmake-init ×1) carry `builtin-baseline`; **6 of 3,248** manifests corpus-wide, re-measured 2026-09-26 (own count below, §1) — reproducibility is the exception, not the rule, even among CMake-package-manager-aware projects.
- vcpkg has **no lockfile artifact**: reproducibility is `builtin-baseline` (a baseline commit) plus per-dependency `version>=` constraints, resolved by a documented **minimum-version algorithm** ("vcpkg selects the lowest version that matches all constraints") — never a pinned resolved graph the way `conan.lock` or a `Cargo.lock` is.
- The vcpkg CMake toolchain (`scripts/buildsystems/vcpkg.cmake`) is evaluated inside `project()`, so **every `VCPKG_*` variable must be set before the first `project()` call** — the same timing rule as CMake toolchain files generally and the dependency-provider mechanism ([cmake-integration](https://learn.microsoft.com/en-us/vcpkg/users/buildsystems/cmake-integration)).
- **Measured**: vcpkg's own `windows.cmake` sets `CMAKE_MSVC_RUNTIME_LIBRARY` as a plain `CACHE STRING` with **no `FORCE`** (`microsoft__vcpkg@c4ee5a52d7:scripts/toolchains/windows.cmake:3`) — a pre-existing cache entry (from a preset's `cacheVariables`, a `-D` flag, or an earlier `set(... CACHE ... FORCE)`) silently wins, so a triplet's `VCPKG_CRT_LINKAGE` and the project's runtime-library setting can disagree with **no configure-time diagnostic**.
- The binary-cache provider table has exactly one **removed** entry (`x-gha`, "This feature has been removed from vcpkg") and seven **experimental** entries ("will change or be removed without warning": `x-azblob`, `x-azcopy`, `x-azcopy-sas`, `x-gcs`, `x-aws`/`x-aws-config`, `x-cos`, `x-az-universal`); only `files`, `nuget`, `nugetconfig`, `nugettimeout`, and `http` are unqualified-stable ([binarycaching](https://learn.microsoft.com/en-us/vcpkg/reference/binarycaching)).
- **Measured in source**: an unrecognized `VCPKG_BINARY_SOURCES` provider token is a hard parse error (`msgUnknownBinaryProviderType`, `microsoft/vcpkg-tool@2026-09-26:src/vcpkg/binarycaching.cpp:2266`) — a malformed source string fails the command, it does not silently fall back to the local `files` default.
- `X_VCPKG_ASSET_SOURCES` with `x-block-origin` is the only way to stop a cache miss from falling through to the live upstream URL; without it, an "offline" CI job can still reach the network on a cache miss ([assetcaching](https://learn.microsoft.com/en-us/vcpkg/users/assetcaching#x-block-origin)).
- **Surprise**: vcpkg-artifacts was announced "removed after July 1" in the 2026-05-27 vcpkg-tool release, but as of the **2026-09-26** release the `/vcpkg-artifacts` directory still exists in the repo, still receives dependabot security bumps, and `microsoft__vcpkg-tool@51bf87ca6e:CMakePresets.json` still carries `VCPKG_ARTIFACTS_SHA`/`VCPKG_ARTIFACTS_DEVELOPMENT` cache variables — the removal is announced, not executed.
- **Surprise**: vcpkg-tool shipped a new release on **2026-09-26** (today), one past the era-recheck's 2026-07-27 figure; the vcpkg registry itself is still 2026.07.29 (no newer tag). Nothing in the new release changes a default this dive's rows depend on (confirmed by reading its full changelog, §9).
- vcpkg has **zero** dependency-provider support (`cmake_language(SET_DEPENDENCY_PROVIDER)`) and **zero** Common Package Specification support — confirmed both by grepping the checked-out `vcpkg.cmake` toolchain (zero hits) and by a full-tree filename search of `microsoft/vcpkg-tool` at its newest tag (2,461 paths, zero cps- or provider-shaped filenames beyond an unrelated `commands.package-info.cpp`, vcpkg's own `vcpkg package-info` CLI verb).
- `VCPKG_PREFER_SYSTEM_LIBS` is deprecated with an exact, quotable replacement: "Use empty overlay ports instead" ([cmake-integration](https://learn.microsoft.com/en-us/vcpkg/users/buildsystems/cmake-integration#vcpkg_prefer_system_libs)).
- Two vcpkg-tool issues the brief named are both still **open after ~6 years** with no maintainer resolution statement visible: #12357 (default triplet stays `x86-windows` on 64-bit Windows) and #14025 (manifest-mode install re-check costs 3+ seconds on every Visual Studio build even with no dependency changes) — neither is fixed by the 2026-09-26 release.
- A library's own `vcpkg.json` uses `features`/`default-features`/`supports` (Platform Expression) correctly when features are boolean and side-effect-free and `default-features` on a *dependency* is `false` unless the top-level consumer needs the library's own defaults — "Ports used by others should almost always use `\"default-features\": false` for their dependencies" ([vcpkg-json](https://learn.microsoft.com/en-us/vcpkg/reference/vcpkg-json#default-features)).

## Findings

### 1. Manifest reproducibility: baseline, overrides, versions

`builtin-baseline` is "a shortcut for specifying the `\"baseline\"` for version resolution in the default registry" and is required for any top-level manifest using versioning without an explicit `default-registry` ([vcpkg-json#builtin-baseline](https://learn.microsoft.com/en-us/vcpkg/reference/vcpkg-json#builtin-baseline)). Without it (and without a `default-registry`), vcpkg's own doc is explicit: "the install operates according to the Classic mode algorithm and ignores all versioning information" ([versioning#baselines](https://learn.microsoft.com/en-us/vcpkg/users/versioning#baselines)) — this is a silent behavior change, not an error.

`overrides` is transitive-blind by design: "`\"overrides\"` from transitive manifests (i.e. from dependencies) are ignored. Only overrides defined by the top-level project are used" ([vcpkg-json#overrides](https://learn.microsoft.com/en-us/vcpkg/reference/vcpkg-json#overrides)). The same rule covers the whole configuration file: "the `vcpkg-configuration.json` files in any dependencies are ignored" ([vcpkg-configuration-json](https://learn.microsoft.com/en-us/vcpkg/reference/vcpkg-configuration-json)). A library author who wants to force a minimum version on a transitive consumer uses `version>=` in the dependency object, not `overrides`.

Version selection is minimum-wins, not latest-wins: "vcpkg selects the lowest version that matches all constraints, so a less-than constraint is not required" ([versioning#version](https://learn.microsoft.com/en-us/vcpkg/users/versioning#version)). Four mutually exclusive schemes exist (`version`, `version-semver`, `version-date`, `version-string`) and vcpkg never compares across schemes even when the numbers look comparable — a package can't switch schemes without every `version>=`/`overrides` consumer updating in lockstep.

Which command moves what:
- `vcpkg x-update-baseline [--add-initial-baseline] [--dry-run]` — regenerates the baseline commit for every configured registry; `--add-initial-baseline` is required the first time a manifest has no `builtin-baseline` at all ([update-baseline](https://learn.microsoft.com/en-us/vcpkg/commands/update-baseline)). Still `x-`-prefixed, i.e. documented as experimental, unchanged since wave 1.
- `vcpkg x-add-version [--all]` — port-author side, regenerates `versions/baseline.json` and per-port version files (cited in the map's [pm] §12; not independently re-fetched here, out of this dive's consumer scope).
- `vcpkg install` in manifest mode reconciles the installed tree to whatever `vcpkg.json` currently says, with no separate "lock" step — `--dry-run` prints the plan, `--skip-install-if-cached` short-circuits when the binary cache already satisfies it ([install](https://learn.microsoft.com/en-us/vcpkg/commands/install)).

**Measured, recounted at the 2026-09-26 corpus SHAs** (M-L-03's vcpkg half — "is every dependency source covered by a lock of record"):

```sh
cd /home/mherwig/.cache/research-lang/exemplars/cmake
find . -path '*/.git' -prune -o -type f -name 'vcpkg.json' -print | wc -l
# 3248
find . -path '*/.git' -prune -o -type f -name 'vcpkg.json' -print \
  | xargs -r grep -l '"builtin-baseline"' | wc -l
# 6
```
(Empty output on the second command would mean zero manifests carry a baseline; 6 is the finding, not the pass.) Excluding `microsoft__vcpkg` and `microsoft__vcpkg-tool`'s own fixture trees, **5 of 9** real consumer manifests carry `builtin-baseline`: `apache__arrow@3ad410b7b1:cpp/vcpkg.json:61`, `apache__arrow@3ad410b7b1:c_glib/vcpkg.json:10`, `friendlyanon__cmake-init@7e0c52fc73:cmake-init/templates/common/vcpkg.json` (generated template, so every project scaffolded from it inherits one), and `aminya__project_options@412045e1f1:tests/{install,myproj}/vcpkg.json`. The four without one are all test-fixture manifests in `project_options` (`tests/{emscripten,minimal,rpi4-vcpkg}/vcpkg.json` and the vcpkg-parallel test tree) — throwaway scratch manifests, not shipped reproducibility surfaces, which is the honest reading of that gap.

There is no CI drift check to cite as a command: vcpkg has nothing equivalent to `conan install --lockfile=conan.lock` that fails on drift. The closest a project gets is committing the baseline SHA and letting `vcpkg install` fail if the registry commit is unreachable or the resolved graph changes shape unexpectedly — which is a much weaker guarantee than a resolved-graph lockfile. **Decided**: the MUST is "carry a baseline," not "carry a lock"; a rule text must not claim vcpkg CI can "fail on drift" the way Conan's `--lockfile` flag can.

### 2. Wiring the toolchain: timing, presets, manifest mode

The toolchain file is injected via `CMAKE_TOOLCHAIN_FILE` and evaluated **inside** `project()`: "Because the toolchain file is evaluated during the `project()` call, all CMake-level variables that modify a vcpkg setting must be set before the first call to `project()`" ([cmake-integration](https://learn.microsoft.com/en-us/vcpkg/users/buildsystems/cmake-integration)). Microsoft's own recommended wiring is a `CMakePresets.json` `configurePreset` with `"cacheVariables": {"CMAKE_TOOLCHAIN_FILE": "$env{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake"}`, exactly the pattern `microsoft__vcpkg-tool@51bf87ca6e:CMakePresets.json`'s own `"windows"` hidden preset uses (`"toolchainFile": "$env{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake"` — measured directly from the corpus file). CMake versions older than 3.19 cannot use presets for this and must pass `-DCMAKE_TOOLCHAIN_FILE=` on the command line.

`VCPKG_MANIFEST_MODE` auto-enables the moment a `vcpkg.json` sits next to the toolchain-driven project ("Defaults to `ON` when `VCPKG_MANIFEST_DIR` is non-empty or `${CMAKE_SOURCE_DIR}/vcpkg.json` exists" — [cmake-integration](https://learn.microsoft.com/en-us/vcpkg/users/buildsystems/cmake-integration)); a project cannot accidentally run in Classic mode by forgetting a flag, only by explicitly setting `VCPKG_MANIFEST_MODE=OFF` against a manifest that exists.

To combine vcpkg's toolchain with another one, the *sanctioned* mechanism is `VCPKG_CHAINLOAD_TOOLCHAIN_FILE` — set as a triplet or command-line variable, never a second `-DCMAKE_TOOLCHAIN_FILE=`, which CMake would simply overwrite with whichever is processed last. The general "never wire two package managers' toolchains into one configure" rule is CMK-PKG's M-L-02; this dive states only the vcpkg-specific chaining mechanism and does not restate M-L-02.

`apache__arrow@3ad410b7b1:cpp/cmake_modules/Usevcpkg.cmake:42-49` shows the corpus's own defensive pattern: it checks `DEFINED CMAKE_TOOLCHAIN_FILE` and verifies the file name is literally `vcpkg.cmake` before trusting it, falling back to `FATAL_ERROR` if a caller supplied a toolchain file that claims to be vcpkg's but doesn't exist at the stated path.

### 3. Triplets and ABI: CRT linkage vs `CMAKE_MSVC_RUNTIME_LIBRARY`

Triplet variables that change the produced binaries' ABI, per the fetched reference ([triplets](https://learn.microsoft.com/en-us/vcpkg/users/triplets)):

| Variable | Effect | Stability |
|---|---|---|
| `VCPKG_CRT_LINKAGE` | `dynamic`/`static` MSVC CRT choice | stable |
| `VCPKG_LIBRARY_LINKAGE` | `dynamic`/`static` preferred library linkage (ports may ignore it if unsupported) | stable |
| `VCPKG_HASH_ADDITIONAL_FILES` | extends the ABI-hash input set with extra files a custom triplet/toolchain `include()`s | stable, documented as the correct way to make custom includes cache-safe |
| `VCPKG_DISABLE_COMPILER_TRACKING` | removes the compiler identity from the ABI hash | present, carries an explicit warning: "can lead to ABI incompatibility in restored binary packages" |

`CMAKE_MSVC_RUNTIME_LIBRARY` is a CMake 3.15+ variable that "is used to initialize the `MSVC_RUNTIME_LIBRARY` property on all targets as they are created"; if unset, CMake defaults to `MultiThreaded$<$<CONFIG:Debug>:Debug>DLL` ([CMAKE_MSVC_RUNTIME_LIBRARY.rst, tag v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_MSVC_RUNTIME_LIBRARY.rst)).

**Measured** — `microsoft__vcpkg@c4ee5a52d7:scripts/toolchains/windows.cmake:3`:
```cmake
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>$<$<STREQUAL:${VCPKG_CRT_LINKAGE},dynamic>:DLL>" CACHE STRING "")
```
This is a plain `set(... CACHE STRING "")` with **no `FORCE`**. CMake's `set(... CACHE)` semantics only populate a cache entry that does not already exist; a pre-existing entry (from a `CMakePresets.json` `cacheVariables` block, a `-DCMAKE_MSVC_RUNTIME_LIBRARY=...` flag, or an earlier forced `set()` anywhere upstream) silently wins over the triplet's own choice. That means the vcpkg/Conan-style trap the map's M-L-05 asked about is real and specific for vcpkg: **a project can set a static-CRT `CMAKE_MSVC_RUNTIME_LIBRARY` while its triplet is a dynamic-CRT one (`x64-windows`) and vice versa, with zero configure-time diagnostic** — the mismatch surfaces only as an LNK2038 (`_ITERATOR_DEBUG_LEVEL`/`RuntimeLibrary`) linker error or, worse, a silently-corrupt binary if optimizations mask it. **Decided**: this is a reading heuristic, not an automatable check — an agent must compare the triplet name (or its `VCPKG_CRT_LINKAGE` setting) against any `CMAKE_MSVC_RUNTIME_LIBRARY` the project sets, by hand.

`VCPKG_PLATFORM_TOOLSET` values were re-verified fresh (not just carried from wave 1): `v145` = VS2026, `v143` = VS2022, `v142` = VS2019, `v141` = VS2017 — the `v145`/VS2026 pairing is new information this dive adds; wave 1's canonical scout did not fetch this page.

Host dependencies (the cross-compiling ABI split, distinct from the four variables above but load-bearing for the same "does the graph match the target" question): a dependency object's `"host": true` "require[s] the dependency for the host machine instead of the target," documented as mandatory for "any dependency that provides tools or scripts which should be 'executed' during a build ... such as when compiling for `arm64-android`" ([vcpkg-json#host](https://learn.microsoft.com/en-us/vcpkg/reference/vcpkg-json#dependency-host)). The corpus shows this in practice: `apache__arrow@3ad410b7b1:ci/vcpkg/vcpkg.json` marks `vcpkg-cmake` and `vcpkg-cmake-config` as `"host": true` — both are CMake-helper ports that must run on the build machine regardless of the target triplet.

### 4. Binary caching: the provider table and malformed sources

Full `VCPKG_BINARY_SOURCES` provider table, stability exactly as documented ([binarycaching](https://learn.microsoft.com/en-us/vcpkg/reference/binarycaching)):

| Provider string | Stability |
|---|---|
| `clear` | stable (control token, not a source) |
| `default[,<rw>]` | stable |
| `files,<path>[,<rw>]` | stable |
| `nuget,<uri>[,<rw>]` | stable |
| `nugetconfig,<path>[,<rw>]` | stable |
| `nugettimeout,<seconds>` | stable |
| `http,<url_template>[,<rw>[,<header>]]` | stable |
| `x-azblob,<baseuri>,<sas>[,<rw>]` | **Experimental: will change or be removed without warning** |
| `x-azcopy,<baseuri>[,<rw>]` | **Experimental: will change or be removed without warning** |
| `x-azcopy-sas,<baseuri>,<sas>[,<rw>]` | **Experimental: will change or be removed without warning** |
| `x-gcs,<prefix>[,<rw>]` | **Experimental: will change or be removed without warning** |
| `x-aws,<prefix>[,<rw>]` / `x-aws-config,<parameter>` | **Experimental: will change or be removed without warning** |
| `x-cos,<prefix>[,<rw>]` | **Experimental: will change or be removed without warning** |
| `x-az-universal,<org>,<project>,<feed>[,<rw>]` | **Experimental: will change or be removed without warning** |
| `x-gha,<rw>` | **Removed: "This feature has been removed from vcpkg"** |
| `interactive` | stable (NuGet credential debugging) |

**Decided (the P0 caching row from the topic map)**: a rule may recommend `files` (default, local/dev), `nuget`/`nugetconfig` (GitHub Packages, Azure DevOps Artifacts — the docs' own worked CI examples use exactly this pair, [binarycaching](https://learn.microsoft.com/en-us/vcpkg/reference/binarycaching#github-packages) and [Azure DevOps Artifacts](https://learn.microsoft.com/en-us/vcpkg/reference/binarycaching#azure-devops-artifacts)) or `http` **without** an experimental caveat. Every `x-`-prefixed provider except the already-removed `x-gha` needs the caveat every time a rule cites it; none has graduated in this window.

`x-gha` is not merely deprecated in the reference doc, it is gone from the tool: the `users/binarycaching` overview page's own "Reusing a binary cache for development" guidance now steers toward GitHub Packages via NuGet, not GitHub Actions cache, confirming the ecosystem's own docs already moved past `x-gha` before this dive started.

**Measured in source** (what a malformed `VCPKG_BINARY_SOURCES` string does — the map's open question): `microsoft/vcpkg-tool@2026-09-26:src/vcpkg/binarycaching.cpp:2266` —
```cpp
else
{
    return add_error(msg::format(msgUnknownBinaryProviderType), segments[0].first);
}
```
An unrecognized segment (a typo'd provider name, a missing required argument that shifts segment parsing) is a hard, reported parse error, not a silent fall-through to the `files` default and not a silent no-op. **Decided**: a rule may state "a malformed `VCPKG_BINARY_SOURCES` fails the command" as a MUST-level guarantee from the tool itself; the risk this closes off is a CI job whose error handling swallows vcpkg's non-zero exit and proceeds to build from source unnoticed — that failure mode is in the CI script, not in vcpkg.

The ABI hash itself (vcpkg's cache key) folds in every port-directory file, the triplet file's contents and name, both compiler executable identities, selected features, each dependency's own ABI hash, referenced helper functions (a heuristic), the CMake version, the PowerShell version (Windows), `VCPKG_ENV_PASSTHROUGH` contents, and the toolchain file's textual contents — documented exhaustively with a worked zlib example showing the literal hashed-entry list ([binarycaching#abi-hash](https://learn.microsoft.com/en-us/vcpkg/reference/binarycaching#abi-hash)). `VCPKG_HASH_ADDITIONAL_FILES` (§3) is the only sanctioned way to add more inputs to this list.

### 5. Asset caching and offline CI

`X_VCPKG_ASSET_SOURCES` mirrors upstream **source** downloads (never built binaries — that's §4's job): `clear`, `x-azurl,<url>[,<sas>[,<rw>]]` (also accepts `file://` UNC-style endpoints), `x-block-origin`, `x-script,<template>` ([assetcaching](https://learn.microsoft.com/en-us/vcpkg/users/assetcaching)). The workflow for `x-azurl` is documented explicitly as three steps: "1. Attempt to read from the mirror 2. (If step 1 failed) Read from the original url 3. (If step 2 succeeded) Write back to the mirror" — step 2 is exactly the network escape hatch `x-block-origin` closes: "Disables falling back to the original download URL when an asset is not found in any of the configured sources." An offline/air-gapped CI job that sets a mirror but omits `x-block-origin` is not actually offline — it degrades to "usually offline," which is a materially weaker guarantee than the job's author likely intends. Neither this page nor the reference page has any newer revision than 2025-04-17 (`updated_at` in the page's own front matter) — the feature's shape has not moved since well before this program's wave 1.

### 6. vcpkg-artifacts: announced removed, not removed

The 2026-05-27 vcpkg-tool release's changelog entry is exact: "[vcpkg-artifacts] Note that artifacts will be removed after July 1" (PR merged by @BillyONeal, [releases API](https://api.github.com/repos/microsoft/vcpkg-tool/releases/tags/2026-05-27)). **Measured directly against the live repository at its newest tag (2026-09-26)**:

```sh
curl -sL "https://api.github.com/repos/microsoft/vcpkg-tool/contents/vcpkg-artifacts?ref=2026-09-26"
# → 29 entries: package.json, main.ts, cli/, artifacts/, installers/, ...
```
(Non-empty output here is the finding: the directory is still present, three months past the announced removal date.) The 2026-09-26 release itself still carries two dependabot bumps scoped to that directory ("Bump brace-expansion from 1.1.15 to 1.1.18 in /vcpkg-artifacts", "Bump js-yaml from 4.2.0 to 4.3.2 in /vcpkg-artifacts"), meaning the code is not just present but actively receiving security maintenance. Separately, `microsoft__vcpkg-tool@51bf87ca6e:CMakePresets.json` (the corpus SHA, itself dated to the 2026-07-27 tool release) still defines `VCPKG_ARTIFACTS_SHA` and an `"artifacts"` hidden preset toggling `VCPKG_ARTIFACTS_DEVELOPMENT` — the tool's own build still ships and builds the artifacts component.

**Decided**: "removed" is the wrong word for a 2026 rule text. The correct claim is "announced for removal after 2026-07-01; not removed as of the 2026-09-26 release; do not adopt it for new work, but do not assert it is gone either." The map's M-N-06 question ("does anything still reference vcpkg-artifacts/`vcpkg-ce`?") is answered: the check is still meaningful for a *consuming* project (nothing outside vcpkg's own repo should reference it), but the underlying feature itself is still alive inside vcpkg-tool.

### 7. Library-side vcpkg.json: features, platforms, license

`features` are boolean toggles with a `description` (required), optional `dependencies`, `supports` and per-feature `license`. `default-features` on a *dependency reference* should almost always be `false`: "Default features handle the specific case of providing a 'default' configuration for transitive dependencies that the top-level project may not know about. Ports used by others should almost always use `\"default-features\": false` for their dependencies" ([vcpkg-json#default-features](https://learn.microsoft.com/en-us/vcpkg/reference/vcpkg-json#default-features)) — getting this backwards silently drags in a dependency's full default feature set into every consumer.

`supports` and per-feature `platform` fields use the Platform Expression grammar: `!`/`not`, `|`/`,` for OR, `&`/`and` for AND, parens for grouping, over identifiers keyed to triplet settings (`x64`, `windows`, `linux`, `osx`, `static`, `staticcrt`, `native`, and — newly confirmed by this fetch, not in wave 1's scout — `arm64ec`, `wasm32`, `mips64`, `xbox`, `qnx`, `vxworks`, `freebsd`, `openbsd`). `apache__arrow@3ad410b7b1:ci/vcpkg/vcpkg.json` uses `"supports": "x64 | (arm64 & !windows)"` as a real-world compound expression.

`license` must be an SPDX expression parsed by vcpkg's own documented EBNF grammar, or `null` to defer to a `copyright` file; `DocumentRefs` are explicitly unsupported by the implementation ([vcpkg-json#license](https://learn.microsoft.com/en-us/vcpkg/reference/vcpkg-json#license)). This is the M-N-08 answer directly: a library's `vcpkg.json` license is correct when it either matches this grammar or is `null`, and incorrect the moment it contains a free-text string.

### 8. No dependency provider, no CPS, in vcpkg-tool

The map's dependency-provider row (conflict 6) already measured zero real adopters besides `cmake-conan` across the 46-repo corpus, with vcpkg named explicitly as a non-adopter ([canon]/[deps] §7, cited not restated). This dive re-confirms the claim from vcpkg's own side, at the newest tag, two ways:

1. `microsoft__vcpkg@c4ee5a52d7:scripts/buildsystems/vcpkg.cmake` (987 lines, fully checked out in the corpus) has zero occurrences of `SET_DEPENDENCY_PROVIDER` or `PACKAGE_INFO`:
   ```
   grep -rn -e SET_DEPENDENCY_PROVIDER -e PACKAGE_INFO -- microsoft__vcpkg/scripts/buildsystems/vcpkg.cmake
   ```
   Empty output = confirmed absence.
2. A full-tree filename search of `microsoft/vcpkg-tool` at its newest tag (2,461 paths, fetched via the Git Trees API) has zero cps-shaped or dependency-provider-shaped filenames. The one near-miss, `include/vcpkg/commands.package-info.h` / `src/vcpkg/commands.package-info.cpp`, is vcpkg's own unrelated `vcpkg package-info` CLI verb (confirmed by reading the header — it declares `command_package_info_and_exit`, nothing CPS-shaped).

**Decided**: a rule text may state flatly that vcpkg offers neither a CMake dependency provider nor any CPS (`install(PACKAGE_INFO)`/`.cps`) integration, as of the vcpkg-tool 2026-09-26 tag — this is a durable negative, not a "not yet checked" gap, and it should be phrased as vcpkg-specific (Conan's own CPS story is a different dive's job, cited not restated: [cps-v] rows 41-45).

### 9. The 2026-09-26 vcpkg-tool release

Fetched directly from the GitHub Releases API (not summarized from a smaller model's read of the HTML page, which initially mis-stated some content — cross-checked against the raw JSON):

```sh
curl -sL "https://api.github.com/repos/microsoft/vcpkg-tool/releases" | jq -r '.[0:3][] | "\(.tag_name) \(.published_at)"'
# 2026-09-26  2026-09-26T06:19:05Z
# 2026-07-27  2026-07-28T00:56:13Z
# 2026-07-24  2026-07-24T05:00:38Z   (marked "failed validation, not promoted" in its own body)
```
This supersedes the era-recheck's "vcpkg-tool 2026-07-27" as current-as-of-today by exactly one release. The full changelog (26 PRs) contains no change to a default this dive's rows depend on: no binary-cache provider promoted or removed, no versioning-algorithm change, no triplet-default change. The two changes worth flagging for future waves: "Add diff output to `x-update-baseline`" (PR #2057 — a UX improvement to the same still-experimental command, not a stability change) and "Make binary cache ZIP compression level configurable" (PR #2125 — new knob, additive, no default change). The vcpkg **registry** (the ports/baselines repo, distinct from vcpkg-tool) has not tagged past 2026.07.29 ([releases API](https://api.github.com/repos/microsoft/vcpkg/releases)) — the tool ships faster than the registry in this window.

### 10. Two open, years-old vcpkg-tool issues

Both issues the brief named remain open with no resolution visible in any 2026 release changelog fetched for this dive:

- **[#12357](https://github.com/microsoft/vcpkg/issues/12357)** (opened 2020-07-10): requests that vcpkg auto-detect `x64-windows` as the default triplet on 64-bit hosts instead of always defaulting to `x86-windows`. No maintainer resolution statement is visible on the issue as fetched; the practical implication for a rule is unchanged from wave 1 — **never rely on vcpkg's default triplet on Windows**, always set `VCPKG_TARGET_TRIPLET` (or `VCPKG_DEFAULT_TRIPLET`) explicitly.
- **[#14025](https://github.com/microsoft/vcpkg/issues/14025)** (opened 2020-10-14): Visual-Studio-integrated manifest installs re-run `VcpkgInstallManifestDependencies` on every build, costing 3+ seconds even with zero dependency changes. Still open, no fix visible in the 2026-09-26 changelog. Relevant to CI-latency guidance but not to correctness.

## Normative guidance candidates

1. **MUST** — a top-level manifest using versioning carries `builtin-baseline` or a `default-registry.baseline`; a manifest with neither silently runs unversioned Classic-mode resolution. *Rationale*: silent, not erroring — the failure a reviewer must catch by reading, not by a tool warning. *Verify*: `grep -L -e builtin-baseline -e '"default-registry"' -- vcpkg.json vcpkg-configuration.json` (adjust to the repo's actual manifest paths); non-empty output (the manifest named) is the finding. *Version floor*: any vcpkg-tool with manifest mode (pre-2026, unaffected by this window).
2. **MUST NOT** — rely on `overrides` or any `vcpkg-configuration.json` field declared inside a dependency's own manifest; both are ignored outside the top-level project. *Rationale*: matches Microsoft's own documented behavior exactly, not an inference. *Verify*: reading heuristic — if a dependency ships `overrides` or a `configuration` block, note it as dead weight, never as a working pin. *Version floor*: current behavior, unchanged across the tracked window.
3. **SHOULD** — move baseline and per-port version pins only through `vcpkg x-update-baseline`/`x-add-version`, never a hand-edited SHA or `versions/baseline.json` entry. *Rationale*: both commands are still `x-`-prefixed experimental as of 2026-09-26, so state the caveat every time; hand-editing risks a baseline SHA that doesn't correspond to any real registry commit. *Verify*: reading heuristic on the PR/commit that changed the baseline — was it produced by the command, or edited by hand? *Version floor*: vcpkg-tool 2026-09-26 (experimental status confirmed at this tag).
4. **MUST** — set every `VCPKG_*` CMake variable, and `CMAKE_TOOLCHAIN_FILE` itself, before the first `project()` call — via `CMakePresets.json` `cacheVariables`/`toolchainFile`, never inside the `CMakeLists.txt` body after `project()`. *Rationale*: the toolchain file runs during `project()`; anything set after has already missed the window. *Verify*: `grep -n -e '^[[:space:]]*project(' -e 'VCPKG_' -- CMakeLists.txt` and confirm every `VCPKG_` line's line number is smaller than `project('s; a `VCPKG_` line after `project(` is the finding. *Version floor*: CMake ≥ 3.19 for the presets form; command-line `-D` works on any version vcpkg supports.
5. **MUST** — combine vcpkg's toolchain with a second one only via `VCPKG_CHAINLOAD_TOOLCHAIN_FILE`, never a second `-DCMAKE_TOOLCHAIN_FILE=`. *Rationale*: CMake keeps only the last `CMAKE_TOOLCHAIN_FILE` value; a second `-D` silently discards vcpkg's. This is the vcpkg-specific mechanism behind CMK-PKG's general M-L-02 (cited, not restated). *Verify*: `grep -rn -e CMAKE_TOOLCHAIN_FILE -- CMakePresets.json CMakeUserPresets.json` — more than one distinct value assigned across the same configure's inheritance chain is the finding. *Version floor*: none; documented since vcpkg's toolchain existed.
6. **SHOULD** — never set `CMAKE_MSVC_RUNTIME_LIBRARY` (via `-D`, a preset `cacheVariables` entry, or a `FORCE`d `set()`) to a value that disagrees with the active triplet's `VCPKG_CRT_LINKAGE`, and check this by hand — there is no configure-time diagnostic. *Rationale*: measured directly — vcpkg's `windows.cmake` writes the variable as a non-`FORCE`d cache entry (§3), so a pre-existing conflicting value silently wins and the mismatch surfaces only as a linker error or corrupt binary. *Verify*: named reading heuristic — read the active triplet name (static-CRT triplets are conventionally suffixed `-static`) and any `CMAKE_MSVC_RUNTIME_LIBRARY` cache entry side by side; no automatable grep exists because both live in different files with no shared identifier. *Version floor*: CMake ≥ 3.15 (`CMAKE_MSVC_RUNTIME_LIBRARY` itself); Windows/MSVC only.
7. **SHOULD** — register a custom triplet's or toolchain's `include()`d files in `VCPKG_HASH_ADDITIONAL_FILES`; never set `VCPKG_DISABLE_COMPILER_TRACKING`. *Rationale*: the first closes a documented cache-key gap; the second is explicitly warned against ("can lead to ABI incompatibility in restored binary packages"). *Verify*: TRIPLET_DIR=triplets; `grep -rn -e 'include(' -- "$TRIPLET_DIR"` cross-checked against a `VCPKG_HASH_ADDITIONAL_FILES` entry in the same file (an `include()` target with no corresponding `VCPKG_HASH_ADDITIONAL_FILES` entry is the finding); `grep -rn -e VCPKG_DISABLE_COMPILER_TRACKING -- "$TRIPLET_DIR"` — any hit is the finding. *Version floor*: current triplet mechanism, unversioned.
8. **MUST** — CI's `VCPKG_BINARY_SOURCES`/`--binarysource` never includes `x-gha` (removed outright) and treats every other `x-`-prefixed provider as carrying "will change or be removed without warning" every time it's cited; recommend `files`, `nuget`/`nugetconfig`, or `http` without caveat. *Rationale*: the docs' own stability labels, verbatim. *Verify*: `grep -rn -e x-gha -- .github`; non-empty output is the finding for `x-gha` specifically; for the other `x-` providers, `grep -rn -e x-azblob -e x-azcopy -e x-gcs -e x-aws -e x-cos -e x-az-universal -- .github` hits are not automatically findings but must carry a comment naming the experimental status. *Version floor*: current as of vcpkg-tool 2026-09-26 (`x-gha` removal predates this window; no other provider's status moved in it).
9. **SHOULD** — offline/air-gapped CI sets `X_VCPKG_ASSET_SOURCES` including `x-block-origin`; without it, a cache miss silently reaches the live upstream URL. *Rationale*: documented three-step fallback behavior; `x-block-origin` is the only switch that removes step 2. *Verify*: `grep -rln -e X_VCPKG_ASSET_SOURCES -- .github`, then for each matched file `grep -n -e x-block-origin -- <that file>`; a file matching the first grep but not the second is the finding. *Version floor*: current, unversioned feature.
10. **MUST NOT** — a *consuming* project references `vcpkg-artifacts`/`vcpkg-ce`/`VCPKG_ARTIFACTS_*` for anything (it remains present inside vcpkg-tool itself, actively maintained, as of 2026-09-26, but was never a documented consumer-facing feature and is announced for eventual removal). *Rationale*: guards against an agent copying vcpkg-tool's own internal build wiring into a consumer project. *Verify*: REPO_ROOT=.; `grep -rn -e vcpkg-artifacts -e vcpkg-ce -e VCPKG_ARTIFACTS -- "$REPO_ROOT"` (excluding a vendored `vcpkg` submodule/subtree) — any hit outside vcpkg's own tree is the finding. *Version floor*: current; re-check on every future vcpkg-tool tag since the removal is explicitly announced and could land at any release.
11. **MUST NOT** — expect vcpkg to plug into `cmake_language(SET_DEPENDENCY_PROVIDER)` or emit/consume CPS (`install(PACKAGE_INFO)`/`.cps`); it does neither. *Rationale*: measured against `vcpkg.cmake` and a full-tree filename search of vcpkg-tool's newest tag, both zero. *Verify*: VENDORED_TOOLCHAIN=scripts/buildsystems/vcpkg.cmake; `grep -rn -e SET_DEPENDENCY_PROVIDER -e PACKAGE_INFO -- "$VENDORED_TOOLCHAIN"` — empty output confirms the negative (this is a "confirm absence," not "flag presence," check; a hit would mean the vendored copy is not actually vcpkg's own file). *Version floor*: current as of vcpkg-tool's 2026-09-26 tag.

## Exemplar evidence

- **`apache__arrow@3ad410b7b1`** satisfies N1 twice over (`cpp/vcpkg.json:61`, `c_glib/vcpkg.json:10` both carry `builtin-baseline`) but its own **`ci/vcpkg/vcpkg.json` violates N1** — no `builtin-baseline` field at all, meaning arrow's CI-specific manifest resolves unversioned while its main `cpp/` build is versioned. Satisfies the host-dependency guidance (§3): `vcpkg-cmake`/`vcpkg-cmake-config` marked `"host": true` in that same CI manifest.
- **`friendlyanon__cmake-init@7e0c52fc73:cmake-init/templates/common/vcpkg.json`** satisfies N1 (`builtin-baseline` present) and demonstrates `version>=` and `overrides` used correctly together — every project scaffolded from this template starts reproducible by construction, the strongest "satisfies by default" evidence in the corpus.
- **`aminya__project_options@412045e1f1`** is split: `tests/install/vcpkg.json` and `tests/myproj/vcpkg.json` satisfy N1; `tests/{emscripten,minimal,rpi4-vcpkg}/vcpkg.json` do not carry a baseline — consistent with the earlier finding that these are scratch fixtures, not shipped reproducibility surfaces, so this is a defensible gap rather than a violation.
- **`microsoft__vcpkg-tool@51bf87ca6e:CMakePresets.json`** satisfies N4 (toolchain wired through `"windows"`'s `toolchainFile`, never inside a `CMakeLists.txt` body) but is the direct counter-evidence for N10's premise: it still defines `VCPKG_ARTIFACTS_SHA` and an `"artifacts"` preset toggling `VCPKG_ARTIFACTS_DEVELOPMENT` — the tool's *own* build is the one legitimate place that reference belongs, which is exactly why N10 is scoped to "a consuming project," not to vcpkg-tool's own repository.
- **`microsoft__vcpkg@c4ee5a52d7:scripts/toolchains/windows.cmake`** is the source of N6's finding directly — it is neither a violation nor a satisfaction of any rule; it is the mechanism the rule exists to work around.
- **`/home/mherwig/dev/find_ocx`** (the fleet's one CMake consumer) carries no `vcpkg.json` anywhere and is not a vcpkg consumer — none of this dive's rows apply to it, which matches the frame's own framing that the C++-package-manager rows ground on the exemplar corpus, not the fleet, because the fleet has zero C++.

## AI-agent angle

- **Recommending `x-gha` for GitHub Actions caching.** This was the standard advice in blog posts and Stack Overflow answers through the mid-2020s and is exactly the kind of caching wisdom a model trained on that era repeats confidently. *Check*: `grep -rn -e x-gha -- .github` (or any CI config directory) — any hit at all is wrong today; the fix is `nuget,GitHub,readwrite` per the docs' own GitHub Packages example.
- **Treating `VCPKG_PREFER_SYSTEM_LIBS` as the way to prefer system libraries.** It is deprecated with a named replacement ("Use empty overlay ports instead"). *Check*: `grep -rn -e VCPKG_PREFER_SYSTEM_LIBS -- triplets CMakeLists.txt` (adjust the path list to the repo's actual triplet directory) — any hit should be flagged for migration to an empty overlay port.
- **Assuming vcpkg has a single resolved-graph lockfile file, the way Conan (`conan.lock`) or Cargo (`Cargo.lock`) does.** A model asked "where is vcpkg's lockfile" will often invent a `vcpkg.lock` or point at `vcpkg_installed/` as if it were one. *Check*: there is no such file to grep for; the actual reproducibility surface is `builtin-baseline` plus `version>=` constraints (§1) — a rule review should reject any generated text that names a vcpkg lockfile file by path.
- **Believing a dependency's `overrides` field takes effect.** A plausible-sounding but wrong mental model ("overrides compose up the dependency tree like npm's `overrides`/`resolutions`") — vcpkg's docs say the opposite explicitly. *Check*: if generated guidance says "add an override in the library's manifest to force a version," that is wrong; the override must live in the top-level manifest.
- **Setting `VCPKG_*` variables, or `CMAKE_TOOLCHAIN_FILE`, inside the `CMakeLists.txt` body after `project()`.** This pattern reads naturally to a model that treats CMake variables as ordinary imperative assignments, and it silently does nothing because the toolchain already ran. *Check*: `grep -n -e '^[[:space:]]*project(' -e 'VCPKG_' -- CMakeLists.txt`, comparing line numbers (§ candidate 4's verification).
- **Assuming vcpkg supports a CMake dependency provider or CPS.** A model that has absorbed 2025-era CPS/provider discourse may generalize "modern CMake package managers plug into providers" to vcpkg by association with Conan. *Check*: there is no vcpkg-side variable or command to grep for because the feature doesn't exist; the mechanical check is the negative-evidence grep in candidate 11 against the vendored `vcpkg.cmake`, confirming it stays empty.
- **Citing `x-update-baseline` or `x-add-version` as stable, GA commands** because their names read like ordinary subcommands and the `x-` prefix is easy to drop when paraphrasing. *Check*: grep the generated text for `update-baseline`/`add-version` without an accompanying "experimental" qualifier and flag it — as of vcpkg-tool 2026-09-26 both remain `x-`-prefixed.

## Contested / evolving

- **vcpkg-artifacts's fate.** Announced for removal after 2026-07-01; not removed as of 2026-09-26, and still receiving dependency-security patches. Trending toward eventual removal (the announcement itself is the trend signal) but the timeline has already slipped past its own stated date by three months at the time of this dive — treat "removed" as future tense, re-check on every subsequent vcpkg-tool tag.
- **The `x-` provider family's stability.** Seven binary-cache providers and the whole asset-cache feature have sat in "will change or be removed without warning" for the entire tracked window (wave 1 through this recheck), with exactly one graduation event in either direction (`x-gha`'s removal, which predates this window). The pace is slow, not stalled — `x-az-universal` and `x-aws-config` are recent additions to the experimental tier, so the family is still growing, not just aging.
- **Default triplet detection (#12357) and manifest install latency (#14025).** Both open since 2020 with no maintainer resolution statement found in any fetched source; six years of no movement is itself the data point — a rule should not predict a near-term fix for either.
- **vcpkg-tool's release cadence versus the registry's.** The tool tagged three times in the roughly two months since the era-recheck's snapshot (2026-07-27 → 2026-09-26, with one failed/unpromoted release on 2026-07-24 in between); the registry has not tagged since 2026.07.29. A rule that assumes tool and registry version lockstep is wrong; they are decoupled release trains.

## Sources

| URL or measurement | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [learn.microsoft.com/vcpkg/reference/vcpkg-json](https://learn.microsoft.com/en-us/vcpkg/reference/vcpkg-json) | Primary manifest schema reference | fetched 2026-09-26, page dated 2025-10-02 | Full field table, `overrides`/`builtin-baseline`/`host`/`license` exact semantics |
| [learn.microsoft.com/vcpkg/reference/vcpkg-configuration-json](https://learn.microsoft.com/en-us/vcpkg/reference/vcpkg-configuration-json) | Primary configuration schema reference | fetched 2026-09-26, page dated 2025-10-02 | Registry kinds, "dependencies' copies are ignored" statement |
| [learn.microsoft.com/vcpkg/users/versioning](https://learn.microsoft.com/en-us/vcpkg/users/versioning) | Primary versioning concept/reference | fetched 2026-09-26, page dated 2025-02-06 | Baseline semantics, minimum-version algorithm, four version schemes |
| [learn.microsoft.com/vcpkg/users/triplets](https://learn.microsoft.com/en-us/vcpkg/users/triplets) | Primary triplet variable reference | fetched 2026-09-26, page dated 2026-08-05 | CRT/library linkage, `VCPKG_HASH_ADDITIONAL_FILES`, `VCPKG_DISABLE_COMPILER_TRACKING`, `v145`=VS2026 |
| [learn.microsoft.com/vcpkg/users/buildsystems/cmake-integration](https://learn.microsoft.com/en-us/vcpkg/users/buildsystems/cmake-integration) | Primary CMake integration guide | fetched 2026-09-26, page dated 2026-07-01 | `project()` timing rule, presets wiring, `VCPKG_CHAINLOAD_TOOLCHAIN_FILE`, full CMake-variable reference |
| [learn.microsoft.com/vcpkg/reference/binarycaching](https://learn.microsoft.com/en-us/vcpkg/reference/binarycaching) | Primary binary-cache provider reference | fetched 2026-09-26, page dated 2025-12-15 | Full provider table with exact stability labels, ABI-hash worked example |
| [learn.microsoft.com/vcpkg/users/binarycaching](https://learn.microsoft.com/en-us/vcpkg/users/binarycaching) | Primary binary-cache concept guide | fetched 2026-09-26, page dated 2025-05-09 | Default cache path table, GitHub Packages/Azure DevOps worked CI examples |
| [learn.microsoft.com/vcpkg/users/assetcaching](https://learn.microsoft.com/en-us/vcpkg/users/assetcaching) | Primary asset-cache reference | fetched 2026-09-26, page dated 2025-04-17 | `x-block-origin` exact semantics, three-step fallback workflow |
| [learn.microsoft.com/vcpkg/commands/update-baseline](https://learn.microsoft.com/en-us/vcpkg/commands/update-baseline) | Primary command reference | fetched 2026-09-26, page dated 2024-03-26 | Confirms `x-update-baseline` still experimental, `--add-initial-baseline` semantics |
| [learn.microsoft.com/vcpkg/commands/install](https://learn.microsoft.com/en-us/vcpkg/commands/install) | Primary command reference | fetched 2026-09-26, page dated 2026-05-28 | Manifest-mode install behavior, `--dry-run`/`--skip-install-if-cached` |
| [api.github.com/repos/microsoft/vcpkg-tool/releases](https://api.github.com/repos/microsoft/vcpkg-tool/releases) | Primary release history (raw API, `curl`) | fetched 2026-09-26 | Found the 2026-09-26 release the brief asked to chase; full changelog read |
| [api.github.com/repos/microsoft/vcpkg-tool/releases/tags/2026-05-27](https://api.github.com/repos/microsoft/vcpkg-tool/releases/tags/2026-05-27) | Primary release body | fetched 2026-09-26 | Exact vcpkg-artifacts removal-announcement wording |
| [api.github.com/repos/microsoft/vcpkg/releases](https://api.github.com/repos/microsoft/vcpkg/releases) | Primary release history (raw API) | fetched 2026-09-26 | Confirms registry still at 2026.07.29, decoupled from tool cadence |
| [github.com/microsoft/vcpkg/issues/12357](https://github.com/microsoft/vcpkg/issues/12357) | Primary issue tracker | fetched 2026-09-26 (opened 2020-07-10) | Default-triplet request, still open |
| [github.com/microsoft/vcpkg/issues/14025](https://github.com/microsoft/vcpkg/issues/14025) | Primary issue tracker | fetched 2026-09-26 (opened 2020-10-14) | Manifest-install latency report, still open |
| Measurement: `microsoft__vcpkg@c4ee5a52d7:scripts/toolchains/windows.cmake:3` | Exemplar corpus source (checked-out file) | corpus SHA 2026-09-26 | `CMAKE_MSVC_RUNTIME_LIBRARY` set without `FORCE`, the N6 finding |
| Measurement: `microsoft/vcpkg-tool@2026-09-26:src/vcpkg/binarycaching.cpp:2266` (raw fetch) | Primary source, fetched fresh since not in the sparse corpus checkout | fetched 2026-09-26 | `msgUnknownBinaryProviderType` — malformed-source hard-error behavior |
| Measurement: Git Trees API, `microsoft/vcpkg-tool` at tag `2026-09-26` (2,461 paths) | Primary, full-tree filename search | fetched 2026-09-26 | Zero cps-/provider-shaped filenames; the N11/§8 negative |
| Measurement: `curl -sL .../repos/microsoft/vcpkg-tool/contents/vcpkg-artifacts?ref=2026-09-26` | Primary, live repo directory listing | fetched 2026-09-26 | 29 entries — vcpkg-artifacts still present, the §6 finding |
| Exemplar corpus recount: `find … -name vcpkg.json` / `grep -l builtin-baseline` over `/home/mherwig/.cache/research-lang/exemplars/cmake` | Measurement over the 46-repo corpus at its 2026-09-26 SHAs | 2026-09-26 | 3,248 manifests, 6 with `builtin-baseline`, 5/9 among real consumer manifests |

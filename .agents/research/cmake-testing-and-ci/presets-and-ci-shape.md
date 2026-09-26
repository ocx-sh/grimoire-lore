---
title: Presets as the reproduction of CI
topic: cmake
agent: presets-and-ci-shape
model: sonnet
kind: exemplar
date_researched: 2026-09-26
sources_count: 19
scope: |
  CMK-CI only: whether CMakePresets.json/CMakeUserPresets.json actually
  reproduce a CI leg, presets schema vs the CMake CI installs, generator and
  compiler-launcher wiring per leg, and whether this program's own offline
  ("no network") MUST checks (`unshare -rn`) run on a stock GitHub-hosted
  runner. Does not cover the configure-gate spellings (CMK-CORE), the
  presets-schema rejection mechanics (CMK-CORE-02, CMK-VER), the CTest
  properties/fixtures surface (CMK-TEST, a sibling dive), or the round-trip's
  own install/export rules (CMK-INST) — those are cited, not re-derived.
---

# Presets as the reproduction of CI

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Presets schema vs the CMake CI actually runs](#1-presets-schema-vs-the-cmake-ci-actually-runs)
   2. [Adoption shape: 19 files, 7 repos, three idioms](#2-adoption-shape-19-files-7-repos-three-idioms)
   3. [Per-repo table](#3-per-repo-table)
   4. [Generator per leg and CMAKE_BUILD_TYPE](#4-generator-per-leg-and-cmake_build_type)
   5. [compile_commands.json](#5-compile_commandsjson)
   6. [Compiler-launcher wiring](#6-compiler-launcher-wiring)
   7. [CMakeUserPresets.json: tracked or gitignored](#7-cmakeuserpresetsjson-tracked-or-gitignored)
   8. [CI pinning the CMake it validates](#8-ci-pinning-the-cmake-it-validates)
   9. [Workflow presets: zero adopters](#9-workflow-presets-zero-adopters)
   10. [The install-and-consume round trip and the as-subproject smoke job](#10-the-install-and-consume-round-trip-and-the-as-subproject-smoke-job)
   11. [cmake-instrumentation and file-API: no row](#11-cmake-instrumentation-and-file-api-no-row)
   12. [Does `unshare -rn` work on a stock GitHub runner?](#12-does-unshare--rn-work-on-a-stock-github-runner)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- CMake 4.4.2 (2026) hard-rejects `warnings.dev`/`errors.dev` under presets schema ≥12 with exit 1 and `File version must be 11 or lower for errors.dev support` — **measured**, not inferred from docs.
- CMake 3.31.12 hard-rejects schema >10 with `Unrecognized "version" 12: must be >=1 and <=10` — **measured**. Schema ceilings: 3.31→10, 4.3→11, 4.4→12 ([presets(7) v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-presets.7.rst)).
- The exemplar corpus at its 2026-09-26 SHAs has exactly **19 `CMakePresets.json`/`CMakeUserPresets.json` files in 7 repos** (13 of the 19 are Kitware's own tutorial docs, not a real build).
- Only **1 of the 6 real-project presets repos** (`microsoft/vcpkg-tool`) maps every CI leg 1:1 to a named preset for configure, build *and* test. `cpp-best-practices/cmake_template` ships five CI-shaped presets that its own `ci.yml` never invokes — it re-implements the identical matrix with raw `-D` flags instead, the textbook decorative-presets case.
- `catchorg/Catch2`'s CI runs a *hybrid*: one preset (`basic-tests`) plus CLI `-D`/`-G` overrides per matrix leg — a third real idiom besides "fully named" and "decorative."
- `llvm/llvm-project`'s `llvm/CMakePresets.json` ships **10 presets, all hidden** — pure ingredients with no usable top-level preset, meant to be composed by a `CMakeUserPresets.json` the repo deliberately `.gitignore`s (`/*/CMakeUserPresets.json`, "the user specified CMake presets in subproject directories").
- `apache/arrow`'s `cpp/CMakePresets.json` inherits up to **6 levels deep with diamond inheritance** (`ninja-debug-maximal` reaches `features-basic` through six different parent chains) — the "how far hidden-base composition scales" data point for [gitlab#22538](https://gitlab.kitware.com/cmake/cmake/-/issues/22538) (open since 2021, 44 upvotes, still open as of 2026-04-27).
- **0 of the 7 presets repos set a compiler launcher inside the presets file itself.** Where launcher wiring exists (13/46 measured corpus-wide) it lives in `CMakeLists.txt` auto-detection, guarded against an already-set value — `ClickHouse/cmake/ccache.cmake` `return()`s early if `CMAKE_C_COMPILER_LAUNCHER` already matches `ccache`, then `find_program(NAMES sccache ccache)` to pick exactly one.
- **`CMakeUserPresets.json` is committed nowhere real** in this corpus: 0 of 6 real-project repos track a genuine one; 4 explicitly gitignore it; the one tracked copy (`friendlyanon/cmake-init`) is Jinja *scaffolding output* for a generated project, not the tool's own dev file.
- CMake 4.4 added `--presets-file <path>` — presets no longer have to be named `CMakePresets.json`/`CMakeUserPresets.json` at all ([presets(7) v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-presets.7.rst), line ~40); 0/46 corpus repos use it yet.
- **Workflow presets (`cmake --workflow`, schema 6, CMake 3.25): 0/46 real adopters**, corpus-wide — no repo declares `workflowPresets` or `packagePresets`.
- `curl/curl`'s `distcheck.yml` is the corpus's one exhaustive as-subproject/consumption-mode smoke job: named steps for `ExternalProject`, `FetchContent`, `add_subdirectory`, `find_package` and `find_package (C++)`, each via `tests/cmake/test.sh <mode>`.
- **A stock GitHub-hosted `ubuntu-24.04` runner restricts unprivileged user namespaces by default** (`kernel.apparmor_restrict_unprivileged_userns=1`) — `unshare -rn` fails with `Operation not permitted`. The fix PR to disable it in the runner image (`actions/runner-images#11489`) was **closed, not merged** ([gh api](https://github.com/actions/runner-images/pull/11489)). `unshare -rn` as this program's offline-check command does **not** work unmodified on that runner.
- The portable, no-privilege-mutation fallback that `ubuntu-24.04` already has preinstalled is `docker run --rm --network none gcc:14 cmake -S . -B build` (Docker 28.0.4 server, confirmed present in the runner image README); `macos-15` GH runners ship **no Docker at all**, so a Linux-only offline-network check simply doesn't run there — which is correct, since `unshare` never worked there either.

## Findings

### 1. Presets schema vs the CMake CI actually runs

This program's gate rules already settle the *spelling* question (`CMK-CORE-01/02`, `versions-and-gate/gate-and-language-semantics`); this dive supplies the CI-specific consequence that `CMK-CORE-02` names as CMK-CI's to own:

> "The schema-ceiling rule for the floor binary is `CMK-CI` (map M-J-01), which cites these ceilings." — `cmake-versions-and-gate.md:127`

Measured directly against 3.31.12 and 4.4.2 (`ocx package exec kitware/cmake:3.31 -- cmake --preset default -S . -B ./build`, `ocx package exec kitware/cmake:4.4 -- cmake --preset default -S . -B ./build2`; scratch project at `.agents/research/cmake-testing-and-ci/scratch/presets-ci-shape/schema-ceiling/`):

```sh
$ ocx package exec kitware/cmake:3.31 -- cmake --preset default -S . -B ./build   # version: 12 in the file
CMake Error: Could not read presets from …:
Error: @2,14: Unrecognized "version" 12: must be >=1 and <=10
  "version": 12,
             ^
EXIT=1

$ ocx package exec kitware/cmake:4.4 -- cmake --preset default -S . -B ./build2  # version: 12, "errors": {"dev": true}
CMake Error: Could not read presets from …:
File version must be 11 or lower for errors.dev support
EXIT=1
```

Both are cmake 3.31.12 and cmake 4.4.2 respectively (`ocx package exec kitware/cmake:3.31|4.4 -- cmake --version`). Schema 10 with `"errors": {"dev": true}` on 3.31.12 parses cleanly (proceeds to the build-tool-selection stage, confirmed by the run failing later on a missing `ninja` rather than on presets validation).

Combined with the settled CI-pinning fact (**CMK-VER-03**: `ubuntu-24.04` and `windows-2025` default to CMake **3.31.6**; `macos-15` defaults to **4.4.2**), the CI-specific finding is:

**M-J-01.** A `CMakePresets.json` at schema ≥11 will fail to parse — hard error, not a warning — on the `ubuntu-24.04`/`windows-2025` runner default (3.31.6, ceiling 10) unless CI pins a newer CMake. This is invisible in local development on a workstation with a newer CMake installed; it only shows up the first time CI runs against the runner default. Schema-version history, normative ([presets(7) v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-presets.7.rst)):

| schema | added in | what it added |
|---|---|---|
| 10 | 3.31 | `$comment`, `configurePresets.graphviz` |
| 11 | 4.3 | `testPresets.execution.jobs` accepts `""` |
| 12 | 4.4 | `warnings.dev`/`errors.dev` → `author`; adds `errors.uninitialized`, `errors.unusedCli`, `*.installAbsoluteDestination` |

Also normative and unused by any of the 7 presets-repos: CMake 4.4 added `--presets-file <path>` — a project's presets no longer have to be named `CMakePresets.json`/`CMakeUserPresets.json` to be read by `cmake --preset`. And: when both files are present, `CMakeUserPresets.json` **implicitly includes** `CMakePresets.json` even with no `include` field, in every schema version — a fact that matters for M-J-03 below, since a repo never needs to `include` its own base file from the gitignored user file.

### 2. Adoption shape: 19 files, 7 repos, three idioms

Measured (for each of the 46 exemplar clones: `git -C "$repo" ls-tree -r --name-only HEAD | grep -e 'CMakePresets\.json$' -e 'CMakeUserPresets\.json$'`, empty output = no presets file, a hit = the finding to record):

```sh
apache__arrow            cpp/CMakePresets.json
catchorg__Catch2         CMakePresets.json
cpp-best-practices__cmake_template   CMakePresets.json
friendlyanon__cmake-init cmake-init/templates/common/CMakePresets.json
friendlyanon__cmake-init cmake-init/templates/common/CMakeUserPresets.json
Kitware__CMake           Help/guide/tutorial/**/CMakePresets.json   (13 files)
llvm__llvm-project       llvm/CMakePresets.json
microsoft__vcpkg-tool    CMakePresets.json
```

19 files, 7 repos — matches the topic map's count exactly. The 13 Kitware files are tutorial-doc scaffolding (CMake teaches presets; it does not build itself with them) and are excluded from every count below. That leaves **6 real-project presets repos**.

Three distinct idioms for reaching CI from a preset, found by cross-referencing each repo's `configurePresets` names against its `.github/workflows/*.yml`:

1. **Fully named (1:1 job↔preset), the reference shape** — `microsoft/vcpkg-tool@51bf87ca6e:.github/workflows/build.yaml:11-21,38-46,60`. A matrix of `{os, preset}` pairs, then `cmake --preset ${{matrix.preset}}`, `cmake --build --preset ${{matrix.preset}} -- -k0`, `ctest --preset ${{matrix.preset}} --output-on-failure`. No leg re-implements a flag the preset already carries.
2. **Hybrid — one preset plus CLI overrides** — `catchorg/Catch2@222e233903:.github/workflows/linux-simple-builds.yml:100`: `cmake --preset basic-tests -GNinja -DCMAKE_BUILD_TYPE=${{matrix.build_type}} -DCMAKE_CXX_COMPILER=${{matrix.cxx}} -DCMAKE_CXX_STANDARD=${{matrix.std}}`. The preset supplies the constants (`CMAKE_EXPORT_COMPILE_COMMANDS`, `CMAKE_CXX_STANDARD_REQUIRED`); the CLI supplies the matrix axes.
3. **Decorative — presets exist, CI ignores them** — `cpp-best-practices/cmake_template@b86318abbf:.github/workflows/ci.yml:163-165`. The repo's own `CMakePresets.json` defines `ci-linux`/`ci-darwin`/`ci-win64`/`ci-ubuntu`/`ci-macos`/`ci-windows`, but `ci.yml`'s `Configure CMake` step is `cmake -S . -B ./build -G "${{matrix.generator}}" -D${{env.PROJECT_NAME}}_ENABLE_IPO=… -DCMAKE_BUILD_TYPE:STRING=${{matrix.build_type}} …` — a hand-rolled matrix (3 OS × 2 compiler × 2 build_type × 2 maintainer_mode × shared, `.github/workflows/ci.yml:19-100`) that never names a preset. `rg -n -e 'cmake --preset' -e 'ctest --preset' cpp-best-practices__cmake_template/.github/workflows` returns nothing.

A fourth pattern that is neither "used" nor "decorative": **`llvm/llvm-project@e0316c1b47:llvm/CMakePresets.json`** ships 10 presets, every one `"hidden": true` (`llvm-build-shared-libs`, `llvm-enable-assertions`, `llvm-export-compile-commands`, …) — no concrete preset a user could name. The repo's `.gitignore` (`/*/CMakeUserPresets.json`, commented "Ignore the user specified CMake presets in subproject directories") shows the intended composition: a developer's own gitignored `CMakeUserPresets.json` `include`s this file and inherits the pieces it wants. This corpus contains no such composing file (it is, by design, never checked in), so LLVM's own CI does not invoke `--preset` at all — it is a library of ingredients, not a CI contract.

### 3. Per-repo table

All fields read directly from each `CMakePresets.json`/`CMakeUserPresets.json` (`git -C "$repo" show HEAD:"$path"`), current corpus SHAs:

| repo@sha:path | schema | configure presets | inherits (max depth) | hidden | condition | include | toolchainFile field | warnings/errors | CI invokes by name |
|---|---|---|---|---|---|---|---|---|---|
| `apache/arrow@3ad410b7b1:cpp/CMakePresets.json` | 3 | 63 | 6, diamond | 22 | no | no | no (`ARROW_DEPENDENCY_SOURCE=VCPKG` var instead) | none | no (0 `--preset` hits in `.github/workflows`; 2 `--preset=` flags in `cpp_extra.yml:324,428` for JNI legs only) |
| `catchorg/Catch2@222e233903:CMakePresets.json` | 3 | 3 | 2 | 0 | no | no | no | none | hybrid (1 preset + CLI `-D`/`-G`) |
| `cpp-best-practices/cmake_template@b86318abbf:CMakePresets.json` | 3 | 21 (Jinja `{% if %}` branches; concrete count depends on generation flags) | 3 | ~14 | **yes** (`equals`/`inList` on `${hostSystemName}`) | no | no | `warnings.dev`/`errors.dev` (old spelling, pre-4.4) | no — decorative |
| `friendlyanon/cmake-init@7e0c52fc73:…/CMakePresets.json` | 2 | template (Jinja), not real JSON | 2 | most | no | no | no (`cacheVariables.CMAKE_TOOLCHAIN_FILE` for both vcpkg and Conan) | `warnings.dev`/`errors.dev` | n/a — generator output, not the tool's own CI |
| `llvm/llvm-project@e0316c1b47:llvm/CMakePresets.json` | 6 | 10 (all hidden ingredients) | 0 | 10/10 | no | no | no | none | no (fragment file, composed downstream) |
| `microsoft/vcpkg-tool@51bf87ca6e:CMakePresets.json` | 3 | 29 | 4 | 10 | no | no | **yes**, `windows` hidden base only | none (uses `VCPKG_WARNINGS_AS_ERRORS` cache var, not the schema field) | **yes, 1:1** (`build.yaml`, `pr.yaml`) |

Notes: `cmake_template`'s file is a Jinja2 template (`{% if vcpkg %}…{% end %}`), so "schema/counts" are the union across generation branches, not one fixed document — worth flagging on its own: an agent reading a `cmake-init`-generated repo's presets file sees the *rendered* output, never this template, so citing this file's exact counts against a real project is a category error the templates themselves warn about implicitly.

Diamond-inheritance detail for `apache/arrow` (`cpp/CMakePresets.json:280-292` region, `ninja-debug-maximal`): `ninja-debug-maximal` → inherits `features-maximal` → inherits `[features-main, features-python-maximal]` → `features-python-maximal` inherits `[features-cuda, features-filesystems, features-flight-sql, features-gandiva, features-opentelemetry, features-python]` → `features-python` inherits `[features-main, features-python-minimal]` → `features-python-minimal` inherits `features-minimal`. Six parent chains converge on `features-basic`/`features-minimal` — a real DAG, not a tree, and evidence for how far the hidden-base idiom scales before `gitlab#22538` (below) becomes unmanageable by hand.

### 4. Generator per leg and CMAKE_BUILD_TYPE

Generators declared inside the 6 real presets files: `Ninja` (arrow's `base`, vcpkg-tool's `base`, cmake-init's none-set-in-file), `Unix Makefiles` (cmake_template `ci-linux`), `Xcode` (cmake_template `ci-darwin`, multi-config), `Visual Studio 17 2022` (cmake_template `ci-win64`, multi-config). Catch2 and llvm-project set no generator in the file at all (CLI/`-G` supplies it). None of the 6 files sets `CMAKE_BUILD_TYPE` on a multi-config preset (`ci-darwin`/`ci-win64` correctly omit it; arrow's `base-debug`/`base-release`/`base-benchmarks` and vcpkg-tool's `debug`/`release` correctly set it only under their single-config `Ninja` base).

The one measured violation lives **outside** the presets file, in `cmake_template`'s own CI: `.github/workflows/ci.yml:19-42` declares `generator: ["Ninja Multi-Config"]` as the matrix default (multi-config) yet its `Configure CMake` step (`ci.yml:163-165`) unconditionally passes `-DCMAKE_BUILD_TYPE:STRING=${{matrix.build_type}}` regardless of which generator the leg drew. On a multi-config generator this cache variable is silently accepted and has no effect — the actual configuration is chosen later, per-leg, via `cmake --build ./build --config ${{matrix.build_type}}` (`ci.yml:170`). The CLI flag looks load-bearing and is not; only the `--config` flag on the build step actually selects the configuration.

### 5. compile_commands.json

`CMAKE_EXPORT_COMPILE_COMMANDS` is set directly in the presets file in 3 of 6 real repos: `apache/arrow` (`base` hidden preset), `catchorg/Catch2` (`basic-tests`), `microsoft/vcpkg-tool` (`base` hidden preset). `llvm/llvm-project` ships it as an unused hidden ingredient (`llvm-export-compile-commands`) with nothing inheriting it in-repo. `cpp-best-practices/cmake_template` sets it only in the Jinja `CMakeUserPresets.json` template's `dev-linux` preset — never in `CMakePresets.json` itself, so a fresh clone's CI build (which never generates a user-presets file) does not produce a compile database at all. Corpus-wide, `CMAKE_EXPORT_COMPILE_COMMANDS` appears 49 times ([exemplar-cmake-shape.md](../cmake-audit/exemplar-cmake-shape.md) §9, wave-1 SHAs); the Bazel side of this same variable is owned by `BZL-CC-28` (cited, not restated here).

### 6. Compiler-launcher wiring

Measured fresh (for each of the 46 corpus clones at their 2026-09-26 SHAs: `grep -rn -e CMAKE_C_COMPILER_LAUNCHER -e CMAKE_CXX_COMPILER_LAUNCHER -e RULE_LAUNCH_COMPILE "$repo" --include='*.cmake' --include=CMakeLists.txt --include=CMakePresets.json --include='*.yml' --include='*.yaml'`): **13 repos** wire a launcher — `aminya/project_options`, `apache/arrow`, `catchorg/Catch2` (CI-only, see below), `ccache/ccache`, `ClickHouse/ClickHouse`, `cpp-best-practices/cmake_template`, `duckdb/duckdb`, `filipdutescu/modern-cpp-template`, `grpc/grpc`, `Kitware/CMake`, `llvm/llvm-project`, `qt/qtbase`, `Tencent/rapidjson`.

**None of the 7 presets files sets a launcher inside the presets JSON itself.** Where launcher wiring exists it is `CMakeLists.txt`-side auto-detection, and the mature pattern guards against clobbering a value the caller (CLI, preset, or toolchain file) already set:

```cmake
# ClickHouse/ClickHouse@5cbca3e099:cmake/ccache.cmake:14-19 (correct: guard first)
if (CMAKE_CXX_COMPILER_LAUNCHER MATCHES "ccache" OR CMAKE_C_COMPILER_LAUNCHER MATCHES "ccache")
    message(STATUS "Using custom C compiler launcher: ${CMAKE_C_COMPILER_LAUNCHER}")
    message(STATUS "Using custom C++ compiler launcher: ${CMAKE_CXX_COMPILER_LAUNCHER}")
    return()
endif()
# … then: find_program(CCACHE_EXECUTABLE NAMES sccache ccache)  — picks exactly ONE
```

`apache/arrow@3ad410b7b1:cpp/CMakeLists.txt:237-238,264-265` uses the same `AND NOT CMAKE_C_COMPILER_LAUNCHER` guard before setting its own default. The one CI-side override in the presets repos is `catchorg/Catch2@222e233903:.github/workflows/linux-other-builds.yml:120`, which passes `-DCMAKE_CXX_COMPILER_LAUNCHER=/usr/bin/true` on the CLI (a no-op stub launcher, apparently for a specific matrix leg) alongside `--preset basic-tests` — proving the launcher and the preset can compose, just not inside the JSON.

Two repos still use the **legacy, pre-3.4 idiom**, `set_property(GLOBAL PROPERTY RULE_LAUNCH_COMPILE ccache)`, instead of the modern per-language cache variable: `filipdutescu/modern-cpp-template@0fab2c3552:cmake/StandardSettings.cmake:87` and `Tencent/rapidjson@24b5e7a8b2:CMakeLists.txt:51` (and its two test subdirectories). `RULE_LAUNCH_COMPILE` still works, but it is a global directory property set at configure time — it does not compose with a preset's `cacheVariables` the way `CMAKE_<LANG>_COMPILER_LAUNCHER` does, and does not export to a generated build the way the cache variable form is documented to.

No corpus hit for a literal chained value (e.g. a single `"sccache;ccache"` string meant as a fallback list) anywhere in the presets/CMake files searched; `ClickHouse`'s `find_program(NAMES sccache ccache)` — try sccache, then ccache, pick one — is the only "auto" idiom found, and it is a `find_program` selection, not a launcher chain.

### 7. CMakeUserPresets.json: tracked or gitignored

`git -C "$repo" ls-tree -r --name-only HEAD` lists it tracked in exactly **one** repo in the whole corpus: `friendlyanon/cmake-init@7e0c52fc73:cmake-init/templates/common/CMakeUserPresets.json` — and that file is Jinja **scaffolding output**, part of the template a generated project starts from, not `cmake-init`'s own development preset file. No real project's own `CMakeUserPresets.json` is tracked anywhere in this corpus.

`.gitignore` entries, read directly:

| repo | `.gitignore` entry |
|---|---|
| `apache/arrow` | none found (no entry, no tracked file — silent by absence) |
| `catchorg/Catch2` | `**/CMakeUserPresets.json` |
| `cpp-best-practices/cmake_template` | `CMakeUserPresets.json` |
| `llvm/llvm-project` | `/*/CMakeUserPresets.json` — comment: "Ignore the user specified CMake presets in subproject directories." |
| `microsoft/vcpkg-tool` | `/CMakeUserPresets.json` |

4 of 5 real projects explicitly gitignore it (arrow is silent-by-omission, not a contradiction — it simply has no entry and no tracked file either). Conan's `CMakeToolchain` generator writes a `CMakeUserPresets.json` at configure time in projects that use it ([cmake-package-managers.md](../cmake-package-managers.md) §2, cited not restated) — another reason this file belongs on the ignore list by default rather than by exception.

### 8. CI pinning the CMake it validates

This program's own `CMK-VER-03` (settled, cited not re-derived) already gives the runner-default floor: `ubuntu-24.04` and `windows-2025` → CMake **3.31.6**; `macos-15` → **4.4.2**. The wave-1 audit's corpus-wide count of *how* CI obtains CMake, at the wave-1 SHAs ([exemplar-deps-and-dual-build.md](../cmake-audit/exemplar-deps-and-dual-build.md) §9):

| method | repos (of 46) |
|---|---|
| `lukka/get-cmake` | 4 (`conan-io/cmake-conan`, `google/benchmark`, `microsoft/vcpkg-tool`, `nlohmann/json`) |
| `jwlawson/actions-setup-cmake` | 1 (`gflags/gflags`) |
| `pip[3] install cmake` | 2 |
| `apt(-get) install cmake` | 4 |
| (implicit: runner default) | **35 — the majority path** |

`lukka/get-cmake`'s inputs ([README](https://raw.githubusercontent.com/lukka/get-cmake/main/README.md)): `cmakeVersion` and `ninjaVersion`, each accepting an exact pin (`3.25.2`), a semver range (`~3.25.0`, `^1.11.1`), or the tokens `latest`/`latestrc`; both are optional and default to "latest stable" if omitted — meaning a project that adds the action but never sets `cmakeVersion` is still floating, just on a different, self-hosted-by-the-action float rather than the runner image's.

The CI-specific consequence this dive adds: **35/46 floating on the runner default is exactly the population at risk from M-J-01** — any of those repos that later adds a schema-11+ `CMakePresets.json`, or a `cmake_minimum_required` floor the runner default can't satisfy, breaks with no warning until the runner image itself changes (a version-inheritance failure mode, not a code-review-visible one).

### 9. Workflow presets: zero adopters

`workflowPresets` (schema 6, CMake 3.25) appears **0 times** in any of the 7 presets files, and `packagePresets` likewise 0 times. Corpus-wide `"cmake --workflow"` / `"workflowPresets"` search: 0 hits ([exemplar-cmake-shape.md](../cmake-audit/exemplar-cmake-shape.md) §10, re-confirmed for this dive against the fresh SHAs — no repo's presets file gained either field). This matches the topic map's already-decided conflict resolution #12 ("workflow presets CONSIDER at most, never SHOULD/MUST").

### 10. The install-and-consume round trip and the as-subproject smoke job

`CMK-INST-18` (cited, not re-derived: `cmake-consumable-library.md:404`) already sets the SHOULD-grade rule that the round trip be its own CI step. This dive's job is the CI-presence half: measured fresh (for each of the 46 corpus clones: `grep -rln -e 'cmake --install' -e cmake_install "$repo" --include='*.yml' --include='*.yaml' --include='*.sh'`), repos with an install step in CI at the current SHAs: `aminya/project_options`, `apache/arrow`, `conan-io/conan-center-index` (recipe data, not CI), `curl/curl`, `duckdb/duckdb`, `friendlyanon/cmake-init`, `jbeder/yaml-cpp`, `Kitware/CMake`, `libuv/libuv`, `llvm/llvm-project`, `madler/zlib`, `microsoft/vcpkg` — a superset of `CMK-INST-18`'s own three named repos (curl, yaml-cpp, zlib), consistent with it.

**The one exhaustive as-subproject/consumption-mode smoke job in the whole corpus**: `curl/curl@68ed69a5ab:.github/workflows/distcheck.yml:317-326`:

```yaml
- name: 'via ExternalProject'
  run: ./tests/cmake/test.sh ExternalProject ${TESTOPTS}
- name: 'via FetchContent'
  run: ./tests/cmake/test.sh FetchContent ${TESTOPTS} -DCURL_USE_OPENSSL=ON
- name: 'via add_subdirectory'
  run: ./tests/cmake/test.sh add_subdirectory ${TESTOPTS} -DCURL_USE_OPENSSL=ON
- name: 'via find_package'
  run: ./tests/cmake/test.sh find_package ${TESTOPTS} -DCURL_USE_OPENSSL=ON
- name: 'via find_package (C++)'
  run: ./tests/cmake/test.sh find_package ${TESTOPTS} -DCURL_USE_OPENSSL=ON -DCURL_USE_STATIC=ON
```

Five named jobs, one per consumption mode, driven by one parameterised `tests/cmake/test.sh`. No other repo in the corpus names all four/five modes as separate CI steps; a broader `add_subdirectory`/`FetchContent_Declare` search across all `.github/workflows/*.yml` in the 46 repos returns only this file and two unrelated `conandata.yml` recipe entries — the as-subproject smoke job that `M-E-06` (a `CMK-TGT` row, not this dive's) recommends locally is essentially never run as a *named CI job* anywhere else in this corpus.

### 11. cmake-instrumentation and file-API: no row

`cmake-instrumentation(7)` (CMake 4.3) and file-API-based tooling (`cmake-file-api(7)`) have **0 corpus hits** as a CI-driven artifact — they support IDE/build-analysis tooling, not a CI gate. **Decided: no row.** (Matches the topic map's own P3 "no" for M-J-11.)

### 12. Does `unshare -rn` work on a stock GitHub runner?

`CMK-DEP-16` and `CMK-BZL-01` both ship `unshare -rn` as their offline/no-network verification and both flag the same open question: *"`unshare -rn` needs unprivileged user namespaces on Linux; see Open questions for CI runners"* (`cmake-bazel-seam.md:50,224`). This dive answers it.

**No, not unmodified.** Ubuntu 23.10 introduced, and 24.04 LTS enables by default, `kernel.apparmor_restrict_unprivileged_userns=1` — AppArmor gates unprivileged `unshare`/`clone(CLONE_NEWUSER)` to processes with a confining profile that grants `userns,`, or `CAP_SYS_ADMIN` ([Ubuntu blog, "Restricted unprivileged user namespaces are coming to Ubuntu 23.10"](https://ubuntu.com/blog/ubuntu-23-10-restricted-unprivileged-user-namespaces)). GitHub's own `ubuntu-24.04` runner image ships this default unchanged: [`actions/runner-images#10443`](https://github.com/actions/runner-images/issues/10443) ("ubuntu-24.04 Error during unshare(...): Operation not permitted") is a real, reported failure on the stock image, and the maintainer-proposed fix, [`actions/runner-images#11489`](https://github.com/actions/runner-images/pull/11489) ("[Ubuntu] Disable apparmor user namespace restrictions"), was **closed without merging** (2025-01-28) — a commenter on the original issue: *"thanks, sorry that they closed your PR, that seemed shortsighted."*

`Ubuntu2404-Readme.md` confirms the runner-installed CMake matches `CMK-VER-03` exactly: "CMake 3.31.6" ([raw.githubusercontent.com/.../Ubuntu2404-Readme.md](https://raw.githubusercontent.com/actions/runner-images/main/images/ubuntu/Ubuntu2404-Readme.md)).

**The portable fallback.** `unshare` is Linux-only to begin with — `CMK-BZL-01`'s own text already scopes the simulation to Linux, and `unshare -rn`'s failure mode is a hard error (exit ≠ 0), not a silent pass, so a naive `unshare -rn -- cmake …` at least fails loudly rather than pretending to have isolated the network. Two real fixes, decided here:

1. **Default: `docker run --rm --network none gcc:14 cmake -S . -B build` (or the project's own toolchain image in place of `gcc:14`, and its real configure/build command in place of `cmake -S . -B build`).** Docker needs no unprivileged user namespace at all (the daemon runs privileged, isolation is the container's network namespace, not the caller's). `ubuntu-24.04`'s own README lists Docker Server 28.0.4 as preinstalled — no extra setup step. This is the one command every shipped offline check in this program should standardise on, because it also runs unmodified on a self-hosted or hardened Linux runner where the sysctl mutation below would be refused.
2. **Narrower fallback, GitHub-hosted only: `sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0`** immediately before the `unshare -rn` step. GitHub's `ubuntu-24.04` runner grants the job passwordless `sudo`, so this one-liner restores the exact behaviour `CMK-DEP-16`/`CMK-BZL-01` already assume — but it mutates a host security control for the whole job, won't be available on a locked-down self-hosted runner, and is the weaker default for that reason.

Neither fix is meant to make the check cross-platform: `macos-15` GH runners ship **no Docker at all** (`macos-15-Readme.md`, 0 matches for "docker"), so a Linux-scoped offline-network check has nothing to run there either way — that is not a gap, since it never claimed macOS coverage.

## Normative guidance candidates

**CMK-CI-01 · SHOULD · Presets follow-through: every configure preset a repo ships is invoked by name in CI, or the repo doesn't ship it.** *Rationale:* only 1 of 6 real presets repos (`vcpkg-tool`) does this fully; `cmake_template` ships five CI-shaped presets its own CI never calls, a decorative-config smell that costs maintenance without buying reproduction of CI. *Verify:* `rg -n -e 'cmake --preset' -e 'ctest --preset' .github/workflows`; cross-check hit names against `jq -r '.configurePresets[].name' CMakePresets.json`. A preset name that never appears in any workflow is the finding. *Floor:* CMake 3.19 (presets exist at all).

**CMK-CI-02 · MUST · A presets file's declared `"version"` must not exceed the schema ceiling of the lowest CMake any CI leg installs.** *Rationale:* schema ≥11 hard-fails, not warns, on the `ubuntu-24.04`/`windows-2025` runner default (3.31.6, ceiling 10) — measured. Cites `CMK-CORE-02` for the rename mechanics. *Verify:* `jq -r .version CMakePresets.json` compared against the minimum among: each leg's `cmakeVersion` pin (`lukka/get-cmake`/`actions-setup-cmake`/`apt`/`pip`), or the runner-image default from `CMK-VER-03` if no pin exists. A schema number above that minimum's ceiling (10 for 3.31.x, 11 for 4.3.x, 12 for 4.4.x) is the finding. *Floor:* any presets-using project.

**CMK-CI-03 · SHOULD · Pin the CMake (and Ninja) version CI validates; do not float the runner-image default.** *Rationale:* 35/46 corpus repos float; that population is exactly what `CMK-CI-02` breaks the day a presets schema or `cmake_minimum_required` floor exceeds the current runner default. *Verify:* `rg -n -e 'lukka/get-cmake' -e 'actions-setup-cmake' -e 'pip3\? install cmake==' -e 'apt-get install.*cmake=' .github/workflows`; empty output on a repo with a presets file at schema ≥11, or a floor above 3.31, is the finding. *Floor:* any.

**CMK-CI-04 · MUST · `CMakeUserPresets.json` is never committed.** *Rationale:* 0 of 6 real corpus projects track a real one; Conan's `CMakeToolchain` writes one at configure time in projects that use it, so committing it fights the tool; CMake's own implicit-include behaviour means a repo never needs to `include` its base file from the (gitignored) user file. *Verify:* `git ls-files CMakeUserPresets.json` — non-empty output is the finding. *Floor:* CMake 3.19.

**CMK-CI-05 · SHOULD · Avoid the OS × compiler × config cross product with hidden bases, `inherits`, and `condition` — not a flat preset per combination, and not a hand-rolled CI matrix that bypasses the presets file entirely.** *Rationale:* [gitlab#22538](https://gitlab.kitware.com/cmake/cmake/-/issues/22538) is open since 2021 with 44 upvotes and no shipped first-class fix as of 2026-04-27; `cmake_template`'s `condition: {type: inList, string: "${hostSystemName}", list: [...]}` idiom is the cleanest corpus example; arrow's 63-preset, 6-deep diamond-inheritance tree is the "how far hidden bases scale before they need their own review" caution. *Verify (reading heuristic):* a `CMakePresets.json` with ≥3 near-duplicate non-hidden presets differing only in OS/compiler/config, and no `condition` or `inherits` reuse between them, is the finding. *Floor:* 3.21 for `condition`.

**CMK-CI-06 · CONSIDER · Where a compiler launcher is wired at all, it is set in exactly one place, and every writer guards against an already-set value before overwriting it — never a hand-written chained string.** *Rationale:* 13/46 corpus repos wire a launcher; 0/7 presets files do it in the JSON itself; the durable pattern (`ClickHouse`, `arrow`, `qtbase`, `grpc`, `duckdb`) checks `if (NOT CMAKE_<LANG>_COMPILER_LAUNCHER)` before setting a default, and picks one tool via `find_program(NAMES sccache ccache)` rather than concatenating a fallback string. `RULE_LAUNCH_COMPILE` (2/46: `modern-cpp-template`, `rapidjson`) is the legacy idiom the per-language variable superseded. *Verify:* `rg -n COMPILER_LAUNCHER .` run from the repo root (covers presets, toolchain files and CI in one pass); more than one unconditional `set(CMAKE_<LANG>_COMPILER_LAUNCHER …)` (no surrounding `if (NOT …)`) is the finding. *Floor:* 3.4 (`CMAKE_<LANG>_COMPILER_LAUNCHER` introduced).

**CMK-CI-07 · CONSIDER at most, never SHOULD/MUST · Workflow presets (`cmake --workflow`, schema 6, 3.25+).** *Rationale:* 0/46 real adopters in this corpus; a rule recommending them holds every real project to a standard none meets, including this program's own consumers. *Verify:* none — a negative decision, not a checkable rule. *Floor:* n/a.

**CMK-CI-08 · SHOULD · The install-then-consume round trip and any as-subproject/FetchContent/find_package smoke test run as their own named CI job(s).** Cites `CMK-INST-18` for the rationale. *Verify:* job/step names in the workflow name the consumption mode explicitly (`curl/curl`'s `distcheck.yml` is the reference shape: `'via ExternalProject'`, `'via FetchContent'`, `'via add_subdirectory'`, `'via find_package'`). A repo with an install step (`cmake --install` in CI) but no distinguishable second-consumer configure step is the finding. *Floor:* any.

**CMK-CI-09 · MUST, for any project whose own offline/no-network verification the fleet's rules ship as `unshare -rn` (`CMK-DEP-16`, `CMK-BZL-01`) · Run the Linux-scoped offline simulation inside `docker run --rm --network none gcc:14 <the configure/build command>`, not bare `unshare -rn`, on a GitHub-hosted (or any Docker-capable) runner.** *Rationale:* `unshare -rn` fails with `Operation not permitted` on a stock `ubuntu-24.04` GH runner (measured via the closed, unmerged `actions/runner-images#11489`); Docker needs no unprivileged user namespace and `ubuntu-24.04` ships it preinstalled. *Verify:* the check's exit code, never wrapped in `|| true`; a green offline-check step whose underlying command exited non-zero and was swallowed is the finding (a real silent-pass risk once someone "fixes" the AppArmor failure by suppressing the error instead of switching commands). *Floor:* n/a (a CI-wiring rule, not a CMake-version rule).

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| CMK-CI-01 | `microsoft/vcpkg-tool@51bf87ca6e:.github/workflows/build.yaml:11-21,38-46,60` (1:1 job↔preset) | `cpp-best-practices/cmake_template@b86318abbf:.github/workflows/ci.yml:163-165` (presets defined, never invoked) |
| CMK-CI-02 | measured: 3.31.12 accepts schema 10 (`.agents/research/cmake-testing-and-ci/scratch/presets-ci-shape/schema-ceiling/`) | measured: 3.31.12 rejects schema 12 with exit 1; 4.4.2 rejects `errors.dev` under schema 12 with exit 1 |
| CMK-CI-03 | `microsoft/vcpkg-tool@51bf87ca6e` (`lukka/get-cmake`, per wave-1 audit) | 35/46 corpus repos (wave-1 count, [exemplar-deps-and-dual-build.md](../cmake-audit/exemplar-deps-and-dual-build.md) §9) float on the runner default |
| CMK-CI-04 | `catchorg/Catch2@222e233903`, `cpp-best-practices/cmake_template@b86318abbf`, `microsoft/vcpkg-tool@51bf87ca6e`, `llvm/llvm-project@e0316c1b47` (.gitignore entries) | `friendlyanon/cmake-init@7e0c52fc73:cmake-init/templates/common/CMakeUserPresets.json` tracked, but as Jinja scaffolding output, not a real dev file — a residual naming-collision risk if an agent mistakes it for the repo's own presets |
| CMK-CI-05 | `cpp-best-practices/cmake_template@b86318abbf:CMakePresets.json` (`condition` idiom) | `apache/arrow@3ad410b7b1:cpp/CMakePresets.json` (63 presets, 6-deep diamond inheritance, no `condition` at all) is the scale warning, not a violation per se |
| CMK-CI-06 | `ClickHouse/ClickHouse@5cbca3e099:cmake/ccache.cmake:14-19`, `apache/arrow@3ad410b7b1:cpp/CMakeLists.txt:237-238` (guard-before-set) | `filipdutescu/modern-cpp-template@0fab2c3552:cmake/StandardSettings.cmake:87`, `Tencent/rapidjson@24b5e7a8b2:CMakeLists.txt:51` (legacy `RULE_LAUNCH_COMPILE`) |
| CMK-CI-08 | `curl/curl@68ed69a5ab:.github/workflows/distcheck.yml:317-326` (five named consumption-mode jobs) | `duckdb/duckdb`, `Kitware/CMake`, `microsoft/vcpkg`, `apache/arrow`, `llvm/llvm-project` all install in CI but show no distinguishable second-consumer configure step |
| CMK-CI-09 | n/a (a CI-infrastructure decision, not a corpus pattern) | `actions/runner-images#10443`/`#11489` (GitHub's own tracker) is the evidence that the naive command fails |

**`find_ocx` (fleet's one CMake consumer):** ships a `test/CMakePresets.json` at schema 8 with Ninja (per `cmake-audit/fleet-inventory-and-bazel-overlap.md:80`), but nothing in its CI references it (`fleet-inventory-and-bazel-overlap.md:277`) — decorative, same failure mode as `cmake_template`. Its own `.github/workflows/ci.yml` installs no pinned CMake ([find-ocx-cmake-shape-and-contracts.md](../cmake-audit/find-ocx-cmake-shape-and-contracts.md)), so it is also in the 35-repo floating-default population `CMK-CI-03` targets.

## AI-agent angle

1. **Writing `"warnings": {"dev": true}` under a schema-12 presets file.** An LLM trained before CMake 4.4 (2026) knows only the `dev`/`author` split's older half. **Measured**: 4.4.2 rejects this with exit 1, `File version must be 11 or lower for errors.dev support`. Check: `jq -e '.version >= 12 and ([.configurePresets[]? | (.warnings // {}), (.errors // {}) | has("dev")] | any)'` — `true` is the finding (verbatim `CMK-CORE-02` verify command, restated because it is exactly the mistake an agent authoring a CI preset makes).
2. **Recommending `CMakeUserPresets.json` be committed "so the team shares one dev setup."** Backwards: 0/6 real corpus projects commit it, 4/5 explicitly gitignore it, and Conan's `CMakeToolchain` generator writes one at configure time — committing it means the tool's own output collides with source control. Check: `git ls-files CMakeUserPresets.json`.
3. **Passing `-DCMAKE_BUILD_TYPE=Release` on a multi-config generator (Ninja Multi-Config, Visual Studio, Xcode) and believing it selected the configuration.** Measured live in `cmake_template`'s own CI: the flag is silently accepted and ignored; only `cmake --build --config <cfg>` (or a preset's `configuration` field) actually selects it. Check: does the preset/CLI generator name match `Multi-Config`/`Visual Studio`/`Xcode`, and is `CMAKE_BUILD_TYPE` present anyway?
4. **Recommending `cmake --workflow` as "the modern CI entry point"** because it is a real, stable (3.25+) feature the model knows about. 0/46 corpus repos use it — recommending it prescribes a pattern with zero real adopters in this fleet's exemplar set.
5. **Suggesting `unshare -rn` (or, worse, permanently disabling the AppArmor restriction on a shared runner) as "the" way to test an offline configure**, unaware that GitHub's own `ubuntu-24.04` image still enforces the Ubuntu 23.10+ restriction and that the fix PR to the image was closed, not merged. Training data mostly predates the restriction becoming default-on; a model will confidently emit a command that hard-fails in CI. Check: does the CI-facing offline check use `unshare -rn` directly, or `docker run --network none`?
6. **Writing `set_property(GLOBAL PROPERTY RULE_LAUNCH_COMPILE ccache)`** because it is the pattern in older tutorials/StackOverflow answers, instead of `CMAKE_<LANG>_COMPILER_LAUNCHER`, which is what composes with presets, toolchain files, and 11+ of the 13 corpus repos that actually wire a launcher today. Check: `RULE_LAUNCH_COMPILE` present anywhere is a migration candidate, not a new addition to write.

## Contested / evolving

- **[gitlab#22538](https://gitlab.kitware.com/cmake/cmake/-/issues/22538) (presets combinatorial explosion): open since 2021-08-13, 44 upvotes, still `opened` as of its last activity 2026-04-27.** No Kitware-shipped first-class matrix feature exists; the corpus shows three competing hand-rolled idioms (hidden-base trees, `condition`, fragment-only files for downstream composition) with no convergence — as of this era, still an unresolved, community-improvised area, trending toward *more* `inherits` depth per adopting repo (arrow's 6-level diamond) rather than toward one canonical shape.
- **CMake 4.4's `--presets-file` option is brand new (2026) and has 0 corpus adopters.** It changes a background assumption ("presets files are always named `CMakePresets.json`/`CMakeUserPresets.json`") that every rule and every agent heuristic in this space currently relies on; too fresh to normalise into a MUST/SHOULD yet, but worth a watch note for the next era-recheck.
- **The AppArmor userns restriction on GitHub's own runner image is not settled upstream.** `actions/runner-images#11489` was closed without merging (2025-01-28); as of this dive's fetch (2026-09-26) no newer PR or changelog entry reopens it. GitHub could revisit this at any point, which would make `CMK-CI-09`'s Docker-first default a defensive-but-no-longer-strictly-necessary step rather than a requirement — re-check at the next runner-images changelog pass.
- **`rules_foreign_cc` 0.16.0 (2026-09-15) changed its bundled-CMake-version model from a fixed range to BCR "spokes" with no fixed default** ([era-recheck](../cmake-topic-map/era-recheck-2026-09-26.md)) — this touches what CMake floor a Bazel-wrapped build can assume in CI, but is `CMK-BZL` territory; flagged here only because it intersects "what CI validates," not re-derived.

## Sources

| URL or measurement | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [gitlab.kitware.com/.../Help/manual/cmake-presets.7.rst@v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-presets.7.rst) | Normative presets manual, raw RST | v4.4.2 (2026-08-25) | Schema-version history table, `--presets-file`, implicit-include behaviour |
| [gitlab.kitware.com/.../Help/manual/presets/root-properties.rst@v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/presets/root-properties.rst) | Root-object field reference (generated, included by the manual) | v4.4.2 | `cmakeMinimumRequired` is optional, `version` is required — explains `vcpkg-tool`'s omission |
| Measured: `ocx package exec kitware/cmake:3.31 -- cmake --preset default -S … -B …`, schema 12 | Real binary run, exit code + stderr | cmake 3.31.12, 2026-09-26 | `Unrecognized "version" 12: must be >=1 and <=10`, exit 1 |
| Measured: `ocx package exec kitware/cmake:4.4 -- cmake --preset default -S … -B …`, schema 12 + `errors.dev` | Real binary run, exit code + stderr | cmake 4.4.2, 2026-09-26 | `File version must be 11 or lower for errors.dev support`, exit 1, confirms `CMK-CORE-02` verbatim |
| Measured: `git -C "$repo" ls-tree -r --name-only HEAD` piped to `grep -e CMakePresets -e CMakeUserPresets`, per repo across 46 clones | Exemplar corpus enumeration | 2026-09-26 SHAs | 19 files / 7 repos, exact match to topic-map count |
| Measured: `grep -rn COMPILER_LAUNCHER …` across 46 clones | Exemplar corpus enumeration | 2026-09-26 SHAs | 13/46 launcher adopters, guard-before-set pattern, `RULE_LAUNCH_COMPILE` legacy holdouts |
| [gitlab.kitware.com/cmake/cmake/-/issues/22538 (API)](https://gitlab.kitware.com/api/v4/projects/cmake%2Fcmake/issues/22538) | Issue metadata via GitLab API | fetched 2026-09-26; issue opened 2021-08-13, updated 2026-04-27 | Current state (open, 44 upvotes) of the combinatorial-explosion issue |
| [lukka/get-cmake README](https://raw.githubusercontent.com/lukka/get-cmake/main/README.md) | Action README | fetched 2026-09-26 | `cmakeVersion`/`ninjaVersion` inputs, exact/semver-range/`latest` pinning |
| [actions/runner-images Ubuntu2404-Readme.md](https://raw.githubusercontent.com/actions/runner-images/main/images/ubuntu/Ubuntu2404-Readme.md) | Official runner-image manifest | fetched 2026-09-26 | Confirms CMake 3.31.6 default and Docker Server 28.0.4 preinstalled |
| [actions/runner-images macos-15-Readme.md](https://raw.githubusercontent.com/actions/runner-images/main/images/macos/macos-15-Readme.md) | Official runner-image manifest | fetched 2026-09-26 | No Docker on the macOS image (0 hits) — scopes the portable-fallback decision |
| [actions/runner-images Windows2025-Readme.md](https://raw.githubusercontent.com/actions/runner-images/main/images/windows/Windows2025-Readme.md) | Official runner-image manifest | fetched 2026-09-26 | Docker 29.7.2 present but Windows-container-oriented; not a drop-in Linux-container fallback |
| [actions/runner-images#10443](https://github.com/actions/runner-images/issues/10443) (`gh api`) | Reported issue + 5 comments | 2024-08-15 opened, 2025-01-28 last comment | Real, reproduced `unshare` failure on stock `ubuntu-24.04`; workaround comments |
| [actions/runner-images#11489](https://github.com/actions/runner-images/pull/11489) (`gh api`) | The proposed fix PR | opened/closed 2025-01-27/28 | Closed without merging — the restriction is not going away on its own |
| [ubuntu.com/blog: Restricted unprivileged user namespaces are coming to Ubuntu 23.10](https://ubuntu.com/blog/ubuntu-23-10-restricted-unprivileged-user-namespaces) | Canonical's own announcement | 2023 (Ubuntu 23.10 era; still the mechanism in 24.04 LTS) | Explains the AppArmor `userns,` rule mechanism and the sysctl toggle |
| [exemplar-cmake-shape.md](../cmake-audit/exemplar-cmake-shape.md) | This program's wave-1 corpus audit | 2026-09-05/06 SHAs | §9-10 launcher/presets baseline counts, cited and re-verified against fresher SHAs |
| [exemplar-deps-and-dual-build.md](../cmake-audit/exemplar-deps-and-dual-build.md) | This program's wave-1 corpus audit | 2026-09-05/06 SHAs | §9 CI CMake-pinning and `--preset` usage counts |
| [cmake-versions-and-gate.md](../cmake-versions-and-gate.md) | This program's consolidated CMK-CORE/CMK-VER rules | 2026-09-26 | `CMK-CORE-02` (schema-ceiling rationale, cited not re-derived), `CMK-VER-03` (runner-default pins) |
| [cmake-consumable-library.md](../cmake-consumable-library.md) | This program's consolidated CMK-INST/CMK-TGT rules | 2026-09-26 | `CMK-INST-18` (round-trip-in-CI rationale, cited not re-derived) |
| [cmake-bazel-seam.md](../cmake-bazel-seam.md) | This program's consolidated CMK-BZL rules | 2026-09-26 | `CMK-BZL-01`'s open question this dive resolves; `unshare -rn` scoping to Linux |

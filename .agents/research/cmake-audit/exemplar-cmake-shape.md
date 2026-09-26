---
title: Exemplar corpus — CMake language and buildsystem shape
agent: cmake-exemplar-shape-auditor
model: sonnet
scope: >
  46-repo exemplar corpus at scratchpad/exemplars (CMake language and
  buildsystem shape only — package-manager manifest *content* is a sibling
  worker's dependency-shape audit; this file only records manifest
  *presence* for the corpus table).
method: >
  Read-only grep/find/git over the checked-out corpus, no cmake/conan/vcpkg/
  bazel invocation. Every number's command is inlined next to it and re-runnable
  from the scripts under .agents/research/cmake-audit/scratch/. sha is
  `git -C <dir> rev-parse --short=10 HEAD`. "CMake files" = CMakeLists.txt,
  *.cmake, *.cmake.in, confirmed fully checked out on disk (matches
  `git ls-tree` counts exactly for every repo sampled — see Method note M0).
date_researched: 2026-09-05
---

# Exemplar corpus — CMake language and buildsystem shape

Corpus: `/tmp/claude-1000/.../scratchpad/exemplars`, 46 repos, all with `.git`
(zero failed clones). This file measures the corpus **as checked out on
2026-09-05**; every command below is re-runnable from
`.agents/research/cmake-audit/scratch/*.sh`.

## Table of contents

- [Method notes](#method-notes)
- [Headline numbers](#headline-numbers)
- [1. Version floors](#1-version-floors)
- [2. Project declaration](#2-project-declaration)
- [3. Language standard](#3-language-standard)
- [4. Target- vs directory-based commands](#4-target--vs-directory-based-commands)
- [5. Sources](#5-sources)
- [6. Options and cache](#6-options-and-cache)
- [7. Functions and macros](#7-functions-and-macros)
- [8. Install and export](#8-install-and-export)
- [9. Testing and packaging](#9-testing-and-packaging)
- [10. Presets](#10-presets)
- [11. Lint and format configs](#11-lint-and-format-configs)
- [12. Cohesion of the largest files](#12-cohesion-of-the-largest-files)
- [Smells (ranked)](#smells-ranked)
- [Patterns worth encoding](#patterns-worth-encoding)
- [Contradictions of the frame](#contradictions-of-the-frame)
- [Gaps](#gaps)

## Method notes

- **M0 — disk = tree for CMake files.** Verified on 5 large repos that
  `find` on disk for `CMakeLists.txt`/`*.cmake`/`*.cmake.in` exactly equals
  `git ls-tree -r --name-only HEAD` counts. Corpus-wide greps run on disk via
  a saved list (`scratch/all-cmake-files.txt`, 27,159 paths), not `git show`.
- **M1 — 2 repos have no single root `CMakeLists.txt`** despite building with
  CMake: `apache__arrow` (root build is `cpp/CMakeLists.txt`) and
  `llvm__llvm-project` (`llvm/CMakeLists.txt`); both substituted for "root"
  below. 8 more genuinely have no single main list (fixtures/ports/templates
  only): rules_foreign_cc, cmake-conan, conan-center-index, hunter,
  cmake-init, vcpkg, sccache, imgui. `conan`, `stb`, `openssl` have **zero**
  CMake files at all.
- **M2 — single-line regexes undercount multi-line calls** (`FILE_SET`,
  `TARGETS…EXPORT`, `CACHE…FORCE`, `…ARGN`) — real CMake wraps long calls
  across lines, so these counts are **floors**. Flagged per-metric below.
- **M3 — `Kitware__CMake` (1,722 CMakeLists.txt) dominates naive corpus-wide
  sums**, being both CMake's own test suite (one fixture per policy under
  `Tests/RunCMake/`) and its documentation (`Help/`). Several metrics below
  are reported both with- and without-Kitware.
- **M4 — a real bug found and fixed while measuring.** Every script here
  originally set `pipefail`. Piping `git ls-tree | grep -q` or
  `xargs grep -l | grep -q .` is unsafe under it: `grep -q` exits on its
  first match, SIGPIPEing the still-writing upstream (`git`, or `grep -l`
  mid-`xargs`-batch); under `pipefail` that SIGPIPE's non-zero status
  **outranks** the downstream `grep -q`'s successful 0, so a real match
  reads back as "not found." This produced 5 false negatives in the first
  `exemplar-table.md` (rules_foreign_cc, Catch2 ×2, yaml-cpp, llvm-project,
  nlohmann/json all missing a true Bazel/conan "y") and zeroed **every**
  column for `Kitware__CMake` in `adoption.tsv` (its test fixtures use
  space-containing paths, which also breaks naive `xargs` splitting).
  Fixed by capturing output into a variable first and grepping *that* (no
  live process to kill) — `exemplar-table.md`/`adoption.tsv` on disk are the
  corrected versions. **`pipefail` + `grep -q`/`-m1` early exit + a
  still-producing upstream = a trap**, worth encoding as a named heuristic
  in the shipped rules, since an agent writing a verification grep is
  exactly this failure mode.

## Headline numbers

| # | Number | Command |
|---|---|---|
| 1 | 46 repos, 0 failed clones, all with `.git` | `for d in */; do [ -d "$d/.git" ] || echo "$d FAILED"; done` (empty) |
| 2 | 27,159 CMake files (`CMakeLists.txt`+`*.cmake`+`*.cmake.in`), 1,190,121 lines | `find <corpus> -type f \( -name CMakeLists.txt -o -name '*.cmake' -o -name '*.cmake.in' \) \| wc -l` and `… -exec cat {} + \| wc -l` |
| 3 | 3 of 46 repos have **zero** CMake files: `conan-io__conan`, `nothings__stb`, `openssl__openssl` | `exemplar-table.md` column 3 |
| 4 | 33 of 46 repos have a discoverable single root `cmake_minimum_required` (21 single-version, 12 range form); 8 have CMake files but no single main list; 2 have a root list with **no** `cmake_minimum_required` call at all | `scratch/shape-versionfloor.sh` → `versionfloor.tsv` |
| 5 | Version-floor range across the 33: **min 3.5** (`nlohmann__json` 09b6b6b5ba:CMakeLists.txt:1, `Tencent__rapidjson` 24b5e7a8b2:CMakeLists.txt:1), **max lower-bound 3.29** (`KDE__extra-cmake-modules` b4c4ec9997:CMakeLists.txt, `cpp-best-practices__cmake_template` b86318abbf:CMakeLists.txt); **0 repos below 3.5** | `versionfloor.tsv`, manual scan |
| 6 | Only **5 of 46** repos ship a real `CMakePresets.json` at their build root (`apache__arrow` cpp/, `catchorg__Catch2`, `cpp-best-practices__cmake_template`, `llvm__llvm-project` llvm/, `microsoft__vcpkg-tool`); `Kitware__CMake` itself has none for its own build, only 13 tutorial-doc examples | `scratch/shape-presets.sh` → `presets.tsv` |
| 7 | `-Werror=dev` in CI: **1 of 46** repos (`ocx-sh__find_ocx` — the fleet's own consumer, not an independent exemplar) | `scratch/shape-lintformat.sh` → `lintformat.tsv` |
| 8 | `.gersemirc` or `cmake-lint` in `.pre-commit-config.yaml`: **0 of 46** | same |
| 9 | Real, production (non-test, non-doc) C++20 named-module adoption: **2 of 46** (`fmtlib__fmt`, `nlohmann__json`); everything else touching `CXX_MODULES`/`import std` is `Kitware__CMake`'s own test suite (117/141 hits) or a single upstream-CMake-tooling test in `qt__qtbase` | grep + manual file read, axis 5 |
| 10 | `target_link_libraries(... PUBLIC\|PRIVATE\|INTERFACE ...)` = 5,473 of 8,453 total calls (65%); the legacy no-keyword form is still 35% | `corpus-counts.tsv` |
| 11 | `HunterGate`/`cmake/Hunter*` used by **0** repos other than `cpp-pm__hunter` itself | `exemplar-table.md` column 9 |
| 12 | `CMAKE_POLICY_VERSION_MINIMUM=3.5` injected as a **workaround for vendored/third-party CMake floors below 3.5** in 6 repos (`apache__arrow`, `Kitware__CMake` — own test only, `cpp-pm__hunter` ×8 recipes, `microsoft__vcpkg` ×3 ports, `qt__qtbase`, `nlohmann__json` CI matrix) — even though **none of the 33 repos' own floors are below 3.5** | grep, axis 1 |

## 1. Version floors

```
scratch/shape-versionfloor.sh
```

| form | count | repos |
|---|---|---|
| single | 21 | abseil-cpp 3.16, arrow(¹) 3.25, Catch2 3.16, ccache 3.18, ClickHouse 3.25, CPM.cmake 3.14, cmake_template 3.29, curl 3.18, modern-cpp-template 3.15, gflags 3.10(²), googletest 3.16, re2 3.22, grpc 3.22, yaml-cpp 3.15..4.3(³), extra-cmake-modules 3.29, libuv 3.10, llvm-project(¹) 3.20.0, ninja 3.15, find_ocx 3.19, qtbase 3.16, rapidjson 3.5(⁴) |
| range | 12 | boost 3.8...3.16, duckdb 3.14...3.29, fmt 3.8...3.28, spdlog 3.10...3.21, glfw 3.16...3.28, benchmark 3.13...3.22, yaml-cpp 3.15..4.3, Kitware/CMake 3.13...4.3, zlib 3.12...3.31, vcpkg-tool 3.15...3.24, nlohmann/json 3.5...4.0, protobuf 3.16...3.26, ModernCppStarter 3.14...3.22 |
| absent (root file exists, no `cmake_minimum_required` call) | 2 | `aminya__project_options` d386a62c58:CMakeLists.txt (it's an included module, not invoked standalone), `cpm-cmake__CPMLicenses.cmake` ca42334d56:CMakeLists.txt (function-library file) |
| no-root-cmakelists (CMake files exist, no single main list) | 8 | rules_foreign_cc, cmake-conan, conan-center-index, hunter, cmake-init, vcpkg, sccache, imgui |
| nocmake | 3 | conan, stb, openssl |

(¹) `apache__arrow`: root build is `cpp/CMakeLists.txt` e0cf4184dd:cpp/CMakeLists.txt:1; `llvm__llvm-project`: root build is `llvm/CMakeLists.txt` 5115f32500:llvm/CMakeLists.txt (see M1).
(²) `gflags__gflags` bdda022e7c:CMakeLists.txt:73 — the *real* minimum is 3.10; lines 22/32/42 are a **commented-out** `2.8.12` left in an explanatory comment block. First-match-without-comment-filtering would misreport this (fixed in the script, see `shape-versionfloor.sh`).
(³) `jbeder__yaml-cpp` e5fe9f2cdd:CMakeLists.txt:1 — `VERSION 3.15..4.3` uses **two** dots, not CMake's documented three-dot range syntax; reads as one literal dotted-version token, likely a `3.15...4.3` typo in a real shipped exemplar (not verified against CMake's parser — no `cmake` invocation permitted; a smell, not a confirmed defect).
(⁴) `Tencent__rapidjson` 24b5e7a8b2:CMakeLists.txt:1 uses uppercase `CMAKE_MINIMUM_REQUIRED(VERSION 3.5)` — the only all-caps call in the corpus.

**Below 3.5 (the CMake-4.0 break line): 0 of 33.** Min lower-bound is exactly
3.5 (nlohmann/json, rapidjson); every other repo already clears it, several
by a wide margin (3.16–3.29). Range ceiling touches or exceeds 4.x in 3
repos (yaml-cpp `4.3`, Kitware/CMake `4.3`, nlohmann/json `4.0`) — the upper
bound is CMake's policy-max escape hatch, not a compatibility floor.

**The policy-version escape hatch IS a live, load-bearing pattern — for
*dependencies*, not for a repo's own floor.**
`CMAKE_POLICY_VERSION_MINIMUM=3.5` appears in:

```
xargs grep -HnE 'CMAKE_POLICY_VERSION_MINIMUM' < scratch/all-cmake-files.txt
```

| repo | where | why (from adjacent comment) |
|---|---|---|
| `apache__arrow` | e0cf4184dd:cpp/cmake_modules/ThirdpartyToolchain.cmake:963,1038 | "temporarily due to failures with CMake 4" when building vendored Snappy/utf8proc |
| `apache__arrow` | e0cf4184dd:cpp/cmake_modules/FindRapidJSONAlt.cmake:29-32 | save/restore around a `find_package` for a dependency whose own floor is <3.5 |
| `cpp-pm__hunter` | 708cab1c49:cmake/projects/{termcolor,minizip,jasper,glog,gflags,Protobuf,OpenBLAS,ICU,BZip2}/hunter.cmake | 9 vendored-recipe compatibility flags, one per third-party package Hunter builds |
| `microsoft__vcpkg` | 04a9d8e521:scripts/ports.cmake:7, ports/libvorbis/portfile.cmake:17, ports/libogg/portfile.cmake:16 | global default + 2 per-port overrides for upstream projects with pre-3.5 floors |
| `qt__qtbase` | d95af8296a:cmake/QtCMakeVersionHelpers.cmake:304-375 | cross-compilation toolchain-file generation, exposed as a per-platform override knob |
| `nlohmann__json` | 09b6b6b5ba:cmake/ci.cmake:571-572 | CI test matrix building older CMake releases from source under CMake 4 |

**Reading**: the 4.0-floor-removal risk is real and actively worked around
*when consuming third-party/vendored CMake code* — but every repo here has
already raised **its own** floor above the line. The live exposure is one
hop downstream: a project's own floor is fine, but its `FetchContent`/
vendored dependencies may still have a stale one, and the save-set-restore
fix (`FindRapidJSONAlt.cmake` above) is worth encoding directly.

```
xargs grep -lE 'CMAKE_POLICY_DEFAULT_CMP[0-9]+' < scratch/all-cmake-files.txt | sed 's|.*/exemplars/||;s|/.*||' | sort | uniq -c
grep -v Kitware__CMake scratch/all-cmake-files.txt > scratch/all-cmake-files-nokitware.txt
xargs grep -hoE 'cmake_policy\([[:space:]]*SET[[:space:]]+CMP[0-9]+' < scratch/all-cmake-files-nokitware.txt | grep -oE 'CMP[0-9]+' | sort | uniq -c | sort -rn
xargs grep -lE 'if[[:space:]]*\([[:space:]]*POLICY' < scratch/all-cmake-files.txt | sed 's|.*/exemplars/||;s|/.*||' | sort -u | wc -l
```

**`CMAKE_POLICY_DEFAULT_CMPxxxx`**: 21 files, but 39/45 non-doc occurrences
are `microsoft__vcpkg` (20, one override per port needing it) and
`Kitware__CMake` (19, its own docs/tests); real per-project use elsewhere is
1 file each in `qt__qtbase`, `cpp-pm__hunter`, `cpm-cmake__CPM.cmake`,
`conan-io__conan-center-index`, `ClickHouse__ClickHouse`, `apache__arrow`.

**`cmake_policy(SET CMPxxxx …)`**: 1,252 calls corpus-wide, but 1,041 are
`Kitware__CMake`'s own `Tests/RunCMake/` fixtures. Excluding Kitware: **211
calls across 21 repos**, dominated by `microsoft__vcpkg` (40, mostly
`CMP0057` for `if(IN_LIST)` on old CMake), `qt__qtbase` (16), `duckdb`
(13), `KDE/ECM` (11). Top policies set (excl. Kitware): `CMP0057` (28,
`IN_LIST`), `CMP0012` (17, literal true/false), `CMP0063` (15, visibility
properties), `CMP0137` (14, `find_package` casing), `CMP0067` (14,
`CXX_STANDARD` honored by `check_cxx_source_compiles`), `CMP0056`/`CMP0054`
(14 each).

**`if(POLICY CMPxxxx)`**: used by **20 of 43** CMake-having repos (47%) — a
common, but not majority, defensive-guard pattern.

## 2. Project declaration

```
corpus-counts.tsv (project_with_*, PROJECT_IS_TOP_LEVEL_uses, CMAKE_SOURCE_DIR_STREQUAL_CURRENT_guard, include_CTest, enable_testing_calls, BUILD_TESTING_refs)
```

| metric | count (occurrences) | note |
|---|---|---|
| `project(... VERSION ...)` | 151 | `grep -hoE 'project\([^)]*VERSION'` |
| `project(... LANGUAGES ...)` | 2,861 | inflated — matches every `project()` call whose args happen to span past `LANGUAGES` in a multi-line regex window; treat as an upper bound, not exact |
| `project(... DESCRIPTION ...)` | 6, only `Kitware__CMake` and `microsoft__vcpkg` | rare |
| `project(... HOMEPAGE_URL ...)` | 6, only `glfw__glfw` and `Kitware__CMake` | rare |

**Top-level guard**: two non-overlapping idioms. `PROJECT_IS_TOP_LEVEL`
(3.21+): `cpp-best-practices__cmake_template`, `friendlyanon__cmake-init`,
`gabime__spdlog`, `Kitware__CMake`. Older
`CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR`: `boostorg__boost`,
`google__googletest`, `grpc__grpc`, `llvm__llvm-project`. **No repo uses
both**; 35 of 43 use *neither* (they gate on `BUILD_TESTING` instead).

**`include(CTest)` vs `enable_testing()`**: 16 repos use `include(CTest)`
(pulls in `BUILD_TESTING` option + CDash vars), 29 use bare
`enable_testing()`. `BUILD_TESTING` itself is referenced 519 times
corpus-wide — almost universal as the test-subtree gate regardless of which
of the two entry points a project uses.

## 3. Language standard

```
xargs grep -hoE 'cxx_std_[0-9]+' < scratch/all-cmake-files.txt | sort | uniq -c | sort -rn
xargs grep -hoE 'set\([[:space:]]*CMAKE_CXX_STANDARD[[:space:]]+[0-9]+' < scratch/all-cmake-files.txt | grep -oE '[0-9]+$' | sort | uniq -c
```

| `cxx_std_NN` (target-scoped, `target_compile_features`) | count | `CMAKE_CXX_STANDARD NN` (directory/global) | count |
|---|---|---|---|
| 17 | 918 | 11 | 97 |
| 11 | 514 | 17 | 84 |
| 20 | 224 | 20 | 35 |
| 14 | 143 | 14 | 22 |
| 23 | 47 | 23 | 6 |
| 26 | 5 | 98 | 4 |
| 98 | 3 | 26 | 1 |

Target-scoped `cxx_std_NN` outnumbers global `CMAKE_CXX_STANDARD NN` ~4:1 by
occurrence (1,716 vs 454, `corpus-counts.tsv`) — dominant by volume, but 454
global calls means the directory-scoped style is far from dead. C++17/C++11
are still the two most-set standards by a wide margin over C++20/23.

`CMAKE_CXX_EXTENSIONS OFF`: 37. `CMAKE_CXX_STANDARD_REQUIRED ON`: 67 — i.e.
**fewer than half** of the 454 `CMAKE_CXX_STANDARD` setters also pin
`_REQUIRED ON`, so most global-standard projects allow silent fallback to
an older standard.

C: `CMAKE_C_STANDARD` 131 calls; `c_std_NN` target-scoped 69 (`c_std_99` 54,
`c_std_11` 24, `c_std_90` 6, `c_std_23` 5, `c_std_17` 4) — C99 still
dominant, consistent with C being mostly legacy/vendored here, not primary.

## 4. Target- vs directory-based commands

```
corpus-counts.tsv, lines "include_directories_calls" through "genexpr_dollar_angle_occurrences"
```

| directory-scoped | count | target-scoped | count | ratio (target:dir) |
|---|---|---|---|---|
| `include_directories(` | 653 | `target_include_directories(` | 2,166 | 3.3:1 |
| `add_definitions(` | 677 | `target_compile_definitions(` | 2,068 | 3.1:1 |
| `add_compile_options(` | 137 | `target_compile_options(` | 722 | 5.3:1 |
| `link_directories(` | 36 | (no target equivalent; usage itself is rare) | — | — |
| `link_libraries(` | 50 | `target_link_libraries(` | 8,453 | 169:1 |

Target-scoped commands dominate 3:1 to 169:1 depending on the pair, but
directory-scoped forms are **not extinct** — `add_definitions`/
`include_directories` still appear 600-700 times each, concentrated in
older/vendored subtrees (spot-checked: `ClickHouse/contrib/`,
`Kitware/CMake/Utilities/`).

`set(CMAKE_CXX_FLAGS …)`: 318 calls; `string(APPEND CMAKE_CXX_FLAGS …)`:
164 — global-flags mutation is alive and common (482 combined), not dead.

**`target_link_libraries` keyword usage**: 5,473 of 8,453 calls (65%) use an
explicit `PUBLIC`/`PRIVATE`/`INTERFACE` keyword; **35% still use the bare
legacy signature** — this is a real, common gap, not a rounding error.

**`add_library` kind mix** (occurrences, a call can match more than one
keyword if e.g. a variable expands differently per platform branch):
STATIC 1,017, SHARED 1,002, INTERFACE 1,029, OBJECT 330, MODULE 102, of
5,791 total `add_library(` calls; **446** are `ALIAS` targets, of which
**245** are namespaced (`Foo::foo` form) — so about 55% of ALIAS targets
follow the namespace convention, not the near-universal practice the
convention's popularity might suggest. `add_executable(`: 5,990 calls.

`BUILD_SHARED_LIBS`: 1,284 references corpus-wide — a near-universal escape
hatch, present in the large majority of CMake-having repos (not spot-audited
per-repo at this pass; see Gaps).

**Generator-expression density** (`$<` per 100 CMake lines), per repo,
top 10 (of repos with any CMake at all):

```
scratch/shape-genexpr-density.sh
```

| repo | `$<` occurrences | CMake lines | per 100 lines |
|---|---|---|---|
| `madler__zlib` | 275 | 5,005 | 5.49 |
| `libuv__libuv` | 53 | 986 | 5.38 |
| `jbeder__yaml-cpp` | 65 | 1,377 | 4.72 |
| `gabime__spdlog` | 33 | 908 | 3.63 |
| `google__googletest` | 29 | 910 | 3.19 |
| `duckdb__duckdb` | 229 | 7,701 | 2.97 |
| `catchorg__Catch2` | 132 | 4,830 | 2.73 |
| `nlohmann__json` | 68 | 2,932 | 2.32 |
| `Kitware__CMake` | 5,575 | 359,509 | 1.55 |
| `filipdutescu__modern-cpp-template` | 12 | 804 | 1.49 |

Corpus-wide total: **9,827** `$<` occurrences (corrected from an earlier
miscounted 209 — a quoting bug in the first pass, see `corpus-counts.tsv`).
Smaller, younger, target-based libraries (zlib, libuv, yaml-cpp, spdlog) run
2-3x the generator-expression density of Kitware/CMake itself (1.55/100).

## 5. Sources

```
corpus-counts.tsv "file_GLOB*", "target_sources*", "FILE_SET*", "CMAKE_CXX_SCAN_FOR_MODULES", "import_std_uses"
```

| metric | count |
|---|---|
| `file(GLOB …)` (non-recursive) | 984 |
| `file(GLOB_RECURSE …)` | 490 |
| … of which carry `CONFIGURE_DEPENDS` | 33 (2.2% of all GLOB/GLOB_RECURSE calls) |
| `target_sources(…)` | 1,121 |
| `target_sources(…FILE_SET…)` (single-line match only, M2) | 141 |

**`CONFIGURE_DEPENDS` adoption: 16 of 43 repos** (`scratch/adoption.tsv`) —
a minority practice CMake's own docs discourage (`CONFIGURE_DEPENDS` is
explicitly "best effort"). Adopters: Catch2, ClickHouse, cmake-conan,
conan-center-index, curl, yaml-cpp, KDE/ECM, Kitware/CMake, llvm-project,
vcpkg, vcpkg-tool, nlohmann/json, find_ocx, ModernCppStarter.

**C++20 named modules — real vs. test-only adoption** (the frame's
suspected sharp question):

```
xargs grep -lE 'CXX_MODULES' < scratch/all-cmake-files.txt | sed 's|.*/exemplars/||;s|/.*||' | sort | uniq -c
```
| repo | hits | what it actually is (file read) |
|---|---|---|
| `Kitware__CMake` | 117 | its own `Tests/RunCMake/CXXModules/` + `Help/` feature docs — CMake testing the feature it implements |
| `fmtlib__fmt` | 3 | **real production target**: `d90c33606c:CMakeLists.txt:365` `target_sources(${name} PUBLIC FILE_SET fmt TYPE CXX_MODULES FILES …)` + install wiring at line 545/554 |
| `nlohmann__json` | 2 | **real production target** (`09b6b6b5ba:src/modules/CMakeLists.txt:11`) *and* a separate `tests/module_cpp20/` smoke test |
| `qt__qtbase` | 3 | test-only: `tests/auto/cmake/test_cxx_modules{,_moc,_moc_lowlevel}/CMakeLists.txt` — exercising *upstream CMake's* AUTOMOC support, not shipping a Qt module |
| `microsoft__vcpkg`, `mozilla__sccache`, `conan-io__conan-center-index` | 1 each | single incidental hit, not a shipped module target (spot-checked, not a real feature) |

`CMAKE_CXX_SCAN_FOR_MODULES`: 5 repos. `CMAKE_EXPERIMENTAL_CXX_IMPORT_STD` /
`CMAKE_CXX_MODULE_STD` (`import std`): 3 repos, 2 of which are single test
files (`nlohmann__json/tests/module_cpp20`,
`conan-io__conan-center-index`) and one is `Kitware__CMake`'s own test
matrix (14 hits).

**Reading: production C++20-module adoption in this corpus is 2 of 46
repos** (fmt, nlohmann/json), both opt-in *additional* targets alongside a
conventional header/source build, not a replacement for it.

## 6. Options and cache

```
scratch/shape-option-prefix.sh; corpus-counts.tsv "option_calls" etc.
```

`option()`: 1,848 calls corpus-wide. `cmake_dependent_option()`: 83 calls.
`set(... CACHE ... FORCE)`: 492 (single-line only, M2). `unset(... CACHE)`:
468. `mark_as_advanced()`: 882.

**Prefix discipline** (heuristic: leading token before first `_`,
uppercased, as share of that repo's own `option()` names — method note:
this catches vendoring artifacts, see the CMake/CURL row):

| repo | total options | top prefix | share |
|---|---|---|---|
| `gabime__spdlog` | 31 | `SPDLOG` | 100% |
| `cpp-best-practices__cmake_template` | 27 | `MYPROJECT` | 100% (template placeholder, never renamed by the generator itself) |
| `protocolbuffers__protobuf` | 25 | `PROTOBUF` | 92% |
| `microsoft__vcpkg-tool` | 15 | `VCPKG` | 93% |
| `qt__qtbase` | 56 | `QT` | 89% |
| `google__benchmark` | 19 | `BENCHMARK` | 89% |
| `madler__zlib` | 96 | `ZLIB` | 77% |
| `ClickHouse__ClickHouse` | 148 | `ENABLE` | 77% (generic verb prefix, not a project namespace) |
| `grpc__grpc` | 16 | `GRPC` | 75% |
| `Kitware__CMake` | 270 | `CURL` | 29% — **its own bundled `Utilities/cmcurl` vendoring dominates the option-name histogram**, not CMake's own options |
| `llvm__llvm-project` | 416 | `LLVM` | 30% — sub-projects (`clang`, `libc`, `compiler-rt`, …) each bring their own prefix, diluting a single "top" one |

**Reading**: prefix discipline is real and common (7 of 11 sampled ≥75%) but
the naive "top prefix as % of options" metric is fooled by (a) generic verb
prefixes (`ENABLE_`) that aren't project-namespaced, and (b) large
multi-component repos (LLVM, CMake) where "the project's own prefix" isn't
one token. A rule on this axis needs the caveat, not just the number.

## 7. Functions and macros

```
corpus-counts.tsv "function_defs" through "CMAKE_MESSAGE_CONTEXT_uses"; all-cmake-files-nokitware.txt for de-skewed figures
```

| metric | corpus-wide | excl. `Kitware__CMake` |
|---|---|---|
| `function(...)` defs | 4,704 | 3,050 |
| `macro(...)` defs | 1,577 | 754 |
| `block(...)` calls | 307 | 39 |
| `message(FATAL_ERROR …)` | 5,724 | 3,022 |
| `add_test(...)` | 1,479 | 447 |

function:macro ratio holds ~4:1 to 4.5:1 whether or not Kitware is
included — a consistent preference for `function()` (own scope) over
`macro()`.

`cmake_parse_arguments(PARSE_ARGV …)`: 480 calls vs `ARGN`-form: 322
(M2) — the newer `PARSE_ARGV` form (3.5+, correct handling of `;`-bearing
arguments) already outnumbers the older `ARGN` form.

`PARENT_SCOPE`: 3,962 uses vs `set_property(GLOBAL PROPERTY …)`: 412 — the
variable-return channel outnumbers the global-property one ~10:1.

`include_guard()`: 242 calls — a real minority practice; most `*.cmake`
files here do **not** self-guard against multiple `include()`.

Message severity: `FATAL_ERROR` 5,724, `SEND_ERROR` 1,570, `WARNING` 844,
`AUTHOR_WARNING` 108, `DEPRECATION` 53. `CMAKE_MESSAGE_CONTEXT`: only **11**
occurrences — this 3.17+ feature is essentially unadopted despite being
purpose-built for large, function-heavy modules like axis 12's.

## 8. Install and export

```
corpus-counts.tsv "install_*" through "CMAKE_UNITY_BUILD_refs"; scratch/adoption.tsv
```

| metric | count |
|---|---|
| `install(TARGETS … EXPORT …)` (single-line, M2) | 368 |
| `install(EXPORT …)` | 263 |
| `install(FILES …)` | 951 |
| `install(DIRECTORY …)` | 224 |
| `export(EXPORT\|TARGETS …)` | 153 |
| `include(GNUInstallDirs)` | 296 |
| `include(CMakePackageConfigHelpers)` | 120 |
| `configure_package_config_file(...)` | 104 |
| `write_basic_package_version_file(...)` | 88 |
| `install(PACKAGE_INFO …)` (CPS, CMake 3.31+) | **54**, all in `Kitware__CMake`'s own test/doc tree — **0 real adopters** in this corpus |
| `NAMESPACE Foo::` (on `install(EXPORT)`/`export()`) | 245 |

`write_basic_package_version_file` `COMPATIBILITY` histogram:

```
xargs grep -A3 'write_basic_package_version_file' < scratch/all-cmake-files.txt | grep -oE 'COMPATIBILITY[[:space:]]+[A-Za-z]+' | sort | uniq -c
```
`SameMajorVersion` 33, `AnyNewerVersion` 27, `ExactVersion` 9,
`SameMinorVersion` 1 — `SameMajorVersion` is the plurality choice but not a
majority (33 of 70 = 47%).

**Config-file naming split**: `*Config.cmake.in` (PascalCase, the pattern
CMake's `find_package(Config mode)` docs lead with): **128** files.
`*-config.cmake.in` (lowercase, hyphenated): **48** — but 40 of those 48 are
`microsoft__vcpkg/ports/*`, following vcpkg's own
`unofficial-<name>-config.cmake.in` convention for packages lacking
upstream CMake config support. Outside vcpkg, lowercase naming is rare
(yaml-cpp, fmt, protobuf + vendored utf8_range, grpc's vendored
utf8_range, llvm/openmp, a few Kitware test fixtures).

**RPATH / visibility / IPO / MSVC-runtime adoption** (per-repo yes/no,
`scratch/adoption.tsv`, y-counts out of 43 CMake-having repos):

| feature | adopters |
|---|---|
| `CMakePackageConfigHelpers` included | 26 (60%) |
| `install(EXPORT …)` | 19 (44%) |
| `CheckIPOSupported` | 8 (19%) |
| `GenerateExportHeader`/`generate_export_header` | 9 (21%) — corpus-wide 46+84 occurrences |
| `target_precompile_headers` | 6 (14%) |
| `CMAKE_UNITY_BUILD` | 5 (12%) — `apache__arrow`, `curl__curl`, `Kitware__CMake`, `microsoft__vcpkg`, `qt__qtbase` |
| compiler-launcher var (`CMAKE_*_COMPILER_LAUNCHER`, i.e. ccache/sccache hook) | 11 (26%) |

RPATH-family variables are individually rare (`CMAKE_INSTALL_RPATH` 33,
`CMAKE_BUILD_RPATH` 9, `INSTALL_RPATH_USE_LINK_PATH` 13,
`CMAKE_MACOSX_RPATH` 15) — combined, well under half the corpus.
`CMAKE_POSITION_INDEPENDENT_CODE`: 34. `CMAKE_MSVC_RUNTIME_LIBRARY` (3.15+,
replaces `/MD`/`/MT` flag hacks): 109 — already the dominant MSVC-runtime
pattern here.

**`-Werror` as a literal flag: 187 occurrences (corrected from a
regex-argument bug that first reported 0) vs `CMAKE_COMPILE_WARNING_AS_ERROR`
(the 3.24+ portable equivalent): 16.** The portable variable trails the raw
flag it's meant to replace by ~12x — a real, sizeable adoption gap.

`CMAKE_EXPORT_COMPILE_COMMANDS`: 49 occurrences — the compile-database seam
this program's Bazel/`rules_foreign_cc` companion contract cares about.

## 9. Testing and packaging

```
corpus-counts.tsv "add_test_calls" through "cmake_workflow_refs"
```

`add_test(...)`: 1,479 calls (447 excl. Kitware). Framework discovery
helpers: `gtest_discover_tests()` 44 calls, but **only Kitware__CMake**
uses it (its own `Modules/GoogleTest.cmake` + `Tests/`); `catch_discover_tests()`
8, `doctest_discover_tests()` 1 — **auto-discovery of individual test
cases is essentially unused**; even `google__googletest` and
`catchorg__Catch2` register their own tests with plain `add_test`, not
their own discovery macro.

CTest properties: `WORKING_DIRECTORY` 1,284 (also used by
`add_custom_command`/`execute_process`, so overcounts test-specific use —
M2), `LABELS` 208, `FIXTURES_*` 202, `WILL_FAIL` 39, `ENVIRONMENT` 86,
`TIMEOUT` only 17 (single-line grep, likely undercounted — often wrapped
across lines in `set_tests_properties`).

`include(CPack)`: 65; `CPACK_*` variables: 3,338 corpus-wide, but **3,074
are `Kitware__CMake`'s own doc/module-source text**. Excluding Kitware:
**264 occurrences across ~10 repos** (gflags 46, spdlog/cmake/spdlogCPack.cmake
41, arrow 27, llvm-project 23, fmt 12, ClickHouse/contrib/mariadb-connector-c-cmake
7, zlib root+contrib/minizip 11, KDE/ECM 5). CPack itself: **11 of 43** (26%)
actually wire it up.

`cmake --workflow` / `"workflowPresets"`: **0 occurrences anywhere.** No
repo has adopted CMake's 3.25+ workflow-preset feature yet.

## 10. Presets

```
scratch/shape-presets.sh → presets.tsv
```

| repo | schema | configure | build | test | package | workflow | inherits | hidden | toolchainFile | condition |
|---|---|---|---|---|---|---|---|---|---|---|
| `apache__arrow` (cpp/) | 3 | 63 | 0 | 0 | 0 | 0 | 56 | 22 | 0 | 0 |
| `catchorg__Catch2` | 3 | 3 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 |
| `cpp-best-practices__cmake_template` | 3 | 11 | 0 | 9 | 0 | 0 | 18 | 4 | 0 | 2 |
| `llvm__llvm-project` (llvm/) | 6 | 10 | 0 | 0 | 0 | 0 | 0 | 10 | 0 | 0 |
| `microsoft__vcpkg-tool` | 3 | 32 | 8 | 8 | 0 | 0 | 23 | 10 | 1 | 0 |

Not counted above (not a real project's own presets): `Kitware__CMake` has
13 `CMakePresets.json` under `Help/guide/tutorial/` (docs only — CMake
teaches presets but doesn't build itself with them); `friendlyanon/cmake-init`
ships one as *scaffolding output* for generated projects.

**Adoption: 5 of 46 repos (11%) have a real root `CMakePresets.json`** — a
"fewer than a quarter" finding by a wide margin. No repo declares
`packagePresets` or `workflowPresets`. `CMakeUserPresets.json` is tracked in
git in **0** of the 5; 4 of 5 `.gitignore` it explicitly (llvm-project's
`.gitignore` simply doesn't mention it — absence, not a contradiction).

## 11. Lint and format configs

```
scratch/shape-lintformat.sh → lintformat.tsv
```

| config | adopters (of 46) |
|---|---|
| `.cmake-format.yaml`/`.py`/`cmake-format.yaml` | 7 (`aminya/project_options`, `cpm-cmake/CPM.cmake`, `cpm-cmake/CPMLicenses.cmake`, `cpp-best-practices/cmake_template`, `fmtlib/fmt`, `madler/zlib`, `TheLartians/ModernCppStarter`) |
| `.gersemirc` | **0** |
| `cmake-lint`/`cmakelang` named in `.pre-commit-config.yaml` | **0** |
| `.clang-tidy` | 17 |
| `.clang-format` | 23 |
| `-Werror=dev` anywhere in `.github/workflows/*` | **1** (`ocx-sh/find_ocx` — the fleet's own consumer) |
| `--warn-uninitialized` in CI | **0** |

**Reading**: C++-source linting (37-50% adoption) is common; *CMake-language*
linting/formatting is rare (15% for a format config, 0% for gersemi/
cmake-lint) and CI enforcement of CMake hygiene is essentially absent
outside the fleet's own module. The starkest asymmetry this audit found:
projects police their C++ style far more than their CMake style.

## 12. Cohesion of the largest files

```
xargs wc -l < scratch/all-cmake-files.txt | grep -v ' total$' | sort -rn | head -10
```

| rank | file | lines | funcs/macros |
|---|---|---|---|
| 1 | `grpc__grpc` 6e5ac36afe:CMakeLists.txt | 56,456 | 3 |
| 2 | `llvm__llvm-project` 5115f32500:libc/test/src/math/smoke/CMakeLists.txt | 6,812 | 0 (499× one macro call) |
| 3 | `llvm__llvm-project` 5115f32500:libc/src/__support/math/CMakeLists.txt | 5,901 | (not sampled) |
| 4 | `llvm__llvm-project` 5115f32500:libc/src/math/generic/CMakeLists.txt | 5,075 | (not sampled) |
| 5 | `Kitware__CMake` 1ef330f5ee:Modules/FindPython/Support.cmake | 4,789 | 30 |
| 6 | `apache__arrow` e0cf4184dd:cpp/cmake_modules/ThirdpartyToolchain.cmake | 4,341 | 36 |
| 7 | `qt__qtbase` d95af8296a:src/corelib/Qt6CoreMacros.cmake | 4,322 | 99 |

**#1 `grpc/CMakeLists.txt` (56,456 lines, 3 functions, 492
`add_library`/`add_executable` calls): not hand-authored.** Its own header
(`6e5ac36afe:CMakeLists.txt:3-6`) says: *"automatically generated from a
template file... regenerated by running tools/buildgen/generate_projects.sh."*
One concern (enumerate every build target), zero authored complexity — the
generated file is not the authoritative source; the template/buildgen
system is. A reviewer grading this file for CMake hygiene is reading the
wrong artifact.

**#2 `llvm-project/libc/test/src/math/smoke/CMakeLists.txt` (6,812 lines,
499 calls to one macro `add_fp_unittest(...)`)**: mechanically repetitive,
one call per libc math function under test — not real complexity, same
verdict as #1 but by hand-repetition rather than codegen.

**#5 `Kitware/CMake/Modules/FindPython/Support.cmake` (4,789 lines, 30
`function()`/`macro()` defs, lines 43-4,772)**: real, single-purpose
complexity — shared implementation backing `FindPython3`/`FindPython2`/
`FindPythonInterp`. One concern (locate Python across every OS/venv/
framework layout) executed exhaustively; internal functions consistently
`_PYTHON_`-prefixed, none exported. Big because the problem is big, not a
dumping ground.

**#6 `apache__arrow/cpp/cmake_modules/ThirdpartyToolchain.cmake` (4,341
lines, 36 functions)**: one concern (acquire/configure Arrow's ~30+ optional
third-party deps, `FetchContent`+`find_package` dispatch per package) but a
*very* large one — this is the file with the `CMAKE_POLICY_VERSION_MINIMUM`
workaround from axis 1. Candidate for splitting per-dependency-family, but
internally consistent (one function-naming convention throughout).

**#7 `qt__qtbase/src/corelib/Qt6CoreMacros.cmake` (4,322 lines, 99
`function()`/`macro()` defs, lines 16-4,313): multiple concerns in one
file** — moc/AUTOMOC, `.qrc` resource compilation, plugin import,
metatypes extraction, target finalization, and a full deployment-script
generator all live here. The one top-5 file that reads as "grew by
accretion across several features" rather than "one big problem" — the
strongest cohesion-smell of the five.

## Smells (ranked)

1. **CMake-authoring CI enforcement is nearly absent.** `-Werror=dev` 1/46
   (fleet's own module), `--warn-uninitialized` 0/46, `.gersemirc`/
   `cmake-lint` in pre-commit 0/46 — vs C++-source linting (`.clang-tidy`
   17/46, `.clang-format` 23/46). A rule recommending `-Werror=dev` would
   recommend something almost nobody here — including CMake's own
   project — does for itself.
2. **The legacy `target_link_libraries` signature is still 35% of all
   calls** (2,980/8,453) — a real fraction, not a straggler (per-repo
   breakdown not isolated, see Gaps).
3. **`pipefail` + early-exiting `grep -q` is a live authoring trap**, not
   theoretical — it produced 5 false negatives and one all-columns
   false-negative row in this audit's own scripts (M4). Worth encoding as a
   named trap in the shipped rules, since an agent writing a verification
   grep is exactly this failure mode.
4. **C++20 modules' "shift to check" resolves to near-zero real adoption**
   (2/46 production adopters) — useful as a current-state fact so agents
   don't over-recommend an unadopted feature, but there's no "how everyone
   does it" to encode yet.
5. **CPack real adoption (11/43, 26%) is 12x smaller than the raw
   `CPACK_*` grep suggests** (3,338 raw vs 264 real) — Kitware's own docs
   dominate the naive count, textbook case for the M3 caveat.
6. **`install(PACKAGE_INFO ...)` (CPS, CMake 3.31+): 0 real adopters** —
   only Kitware's own test/doc tree. Implemented, documented, used by
   nobody's shipped build in this corpus.
7. **CMake workflow presets (`cmake --workflow`): 0/46.** Same shape as #6.
8. **`option()` prefix discipline is real but not uniform, and a naive
   "prefix = repo name" heuristic breaks on the two biggest repos** (LLVM's
   multi-component tree, CMake's own vendored cmcurl) — needs a vendoring
   exception or it misfires on its most prominent potential users.

## Patterns worth encoding

- **Save-set-restore `CMAKE_POLICY_VERSION_MINIMUM`** around a single
  `find_package`/`FetchContent` call for a dependency with a stale floor
  (`apache__arrow` `FindRapidJSONAlt.cmake:29-32`) — answers "keep the
  CMake-4.0 floor bump from breaking one old dependency without lowering my
  own floor," exactly the narrow, checkable shape the frame's artifact
  constraints call for.
- **`if(POLICY CMPxxxx)` before `cmake_policy(SET …)`** as the portable
  guard for a policy absent on the floor version — used by 20/43 repos;
  cite `qt__qtbase`/`microsoft__vcpkg` as real (non-fixture) exemplars.
- **`CMAKE_MSVC_RUNTIME_LIBRARY` over hand-rolled `/MD`/`/MT` surgery** —
  already dominant (109 occurrences) despite being a 3.15+ feature; a clean
  "modernize this" rule.
- **`PROJECT_IS_TOP_LEVEL` over `CMAKE_SOURCE_DIR STREQUAL
  CMAKE_CURRENT_SOURCE_DIR`** — both live and non-overlapping (4 repos
  each); recommend the newer, shorter form going forward without flagging
  the old one as a defect in existing code.
- **A generated top-level `CMakeLists.txt` needs a "read the template, not
  this file" check** — gRPC's 56K-line list (axis 12 #1) is the exemplar;
  detect a generated-file banner comment before line count triggers a false
  "split this file" recommendation.
- **vcpkg's `unofficial-<name>-config.cmake.in` naming** for packages
  lacking upstream CMake config support — 100%-consistent across 40 port
  files, worth citing as the canonical answer.

## Contradictions of the frame

1. **"CMake 4.0 removed compatibility with floors below 3.5" reads as a
   live risk for this corpus's own projects — it isn't. Zero of 33 repos
   with a discoverable floor sit below 3.5**, and several (curl, zlib,
   ninja, libuv) predating 3.5 have already bumped past it. The live
   exposure is one hop downstream: **vendored/`FetchContent`-fetched
   dependencies**, not a project's own floor (axis 1, 6 repos, 15+ sites).
   A rule targeting "your project's floor" solves an already-solved
   problem here; one targeting "your dependency's floor" solves the one
   this audit actually found.
2. **CPS (`install(PACKAGE_INFO)`) and `cmake --workflow`, the frame's
   "shift to check" candidates, are both unadopted (0 real users)** in a
   corpus whose only hits are CMake's own docs/tests. Worth documenting as
   available; encoding either as an expected practice would hold every real
   project here to a standard none meets.
3. **Hunter/cpp-pm has zero downstream consumers in this corpus**
   (`HunterGate.cmake`/`cmake/Hunter*`: 0 adopters besides Hunter itself) —
   a much stronger data point than the frame's hedge about its 2026
   maintenance status. Conan (5 repos), vcpkg (2, plus vcpkg itself
   producing 3,040 manifests), and CPM (4) all show real presence; Hunter's
   practical weight here is zero.
4. **C++20 modules show a specific shape the frame didn't predict**: real
   production use is only as an *additional, opt-in* target (fmt,
   nlohmann/json) beside a conventional build, never a replacement for one.
   A rule assuming "modules OR classic sources" would misdescribe both real
   adopters found.

## Gaps

- `target_link_libraries` legacy-signature 35% figure isn't broken down
  per-repo — unclear if concentrated in a few legacy subtrees (ClickHouse
  `contrib/`, Kitware `Utilities/`) or spread evenly.
- `BUILD_SHARED_LIBS` (1,284 refs) and per-repo shared/static discipline for
  subprojects wasn't audited — the frame's Bazel-interop question on this
  is unanswered.
- Axis 4/2 `add_library`/`project()` argument counts use single-line
  regexes (M2) — multi-line calls undercounted; a small multi-line parser
  (or `cmake --trace-expand`, forbidden by this audit's read-only mandate)
  would tighten these.
- CTest `TIMEOUT`/`WORKING_DIRECTORY` counts likely contaminated by
  non-test uses of the same keywords on `add_custom_command`/
  `execute_process` — not disambiguated.
- `option()` prefix heuristic (axis 6) only ran for repos with ≥3 calls and
  is a same-repo self-comparison, not a ground-truth project-name check —
  good enough to spot the LLVM/Kitware exceptions, not precise enough to
  certify a pass/fail threshold.
- No correlation attempted between `CMakePresets.json` content and
  `.github/workflows/*` (does CI actually invoke the preset, or is it
  decorative) — the frame calls presets "the CI contract"; this pass
  measured presence and shape only.
- Package-manager manifest *content* is out of scope here (sibling
  dependency-shape worker's job) — this file only recorded manifest
  *presence* for `exemplar-table.md`.

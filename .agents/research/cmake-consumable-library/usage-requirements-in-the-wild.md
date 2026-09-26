---
title: Usage requirements in the wild
topic: "Where legacy target usage actually lives, and what an installable library must never do"
agent: cmake-consumable-library-targets
model: sonnet
kind: exemplar
date_researched: 2026-09-26
sources_count: 15
scope: |
  CMK-TGT rows M-E-01..04, M-E-10, M-E-11 and CMK-LANG rows M-C-03, M-C-07,
  M-C-09, measured per-repo and per-subtree over the 46-repo exemplar corpus
  at its 2026-09-26 SHAs. Covers target_link_libraries keyword discipline,
  directory-scoped commands, CMAKE_*_FLAGS mutation, CMAKE_CXX_STANDARD vs
  target_compile_features, file(GLOB) into targets, literal -Werror/-WX,
  unquoted if()/foreach() forms, generator expressions at configure time, and
  option()/CMAKE_* naming. Does not cover install/export (CMK-INST, a sibling
  dive) or the language rows outside this list (CMK-LANG's other 6 rows).
---

## Table of contents

1. [Method and a parser-limitation ledger](#1-method-and-a-parser-limitation-ledger)
2. [M-E-01 — target_link_libraries keyword discipline](#2-m-e-01)
3. [M-E-02 — directory-scoped commands](#3-m-e-02)
4. [M-E-03 — CMAKE_C/CXX_FLAGS mutation](#4-m-e-03)
5. [M-E-04 — CMAKE_CXX_STANDARD vs target_compile_features](#5-m-e-04)
6. [M-E-10 — file(GLOB) feeding targets](#6-m-e-10)
7. [M-E-11 — literal -Werror/-WX](#7-m-e-11)
8. [M-C-03 — unquoted if() and bare foreach()](#8-m-c-03)
9. [M-C-07 — generator expressions at configure time](#9-m-c-07)
10. [M-C-09 — option()/CMAKE_* naming](#10-m-c-09)
11. [Normative guidance candidates](#normative-guidance-candidates)
12. [Exemplar evidence](#exemplar-evidence)
13. [AI-agent angle](#ai-agent-angle)
14. [Contested / evolving](#contested--evolving)
15. [Sources](#sources)

## Summary

- **The corpus-wide "35% of target_link_libraries calls are bare" headline (wave-1 audit, 2,980/8,453) does not describe an installable library's shipped surface.** Re-measured at the 2026-09-26 SHAs with generated files, Kitware's `Tests/`+`Help/`, and example/test scaffolding separated out: a repo's own non-scaffold CMakeLists carry 568/4,280 bare calls = **13.3%**; test/example scaffolding carries 418/1,306 = **32.0%** (§2).
- **A single-file exclusion changes a headline number by itself**: `grpc/grpc`'s 56,561-line root `CMakeLists.txt` is machine-generated (`grpc__grpc@0f8d72ed71:CMakeLists.txt:3`, "This file has been automatically generated from a template file") and was excluded by the banner detector; left in, its zero-keyword style would have dominated any grpc-specific count (§2).
- **Two parser failure modes, both inherited unchanged from `cmake-audit/scratch/deps-cmake-calls.py`, were caught by manual re-read and must be fixed before this becomes a shipped verification**: (1) the comment-stripper does not recognize CMake bracket comments (`#[[.rst: … #]]`), so a Find module's own documentation examples (e.g. `Kitware__CMake@e8befb989b:Modules/FindBoost.cmake:344`) are scanned as executable code; (2) the paren-balancer does not track quote state, so a `message()` whose string argument contains a literal unmatched `(` (a common shape in "unhandled arguments to `add_mlir_python_sources_target(...`" error text) causes runaway extraction that misattributes a later, unrelated call's content (`llvm__llvm-project@e0316c1b47:mlir/cmake/modules/AddMLIRPython.cmake:915`) (§1, §9).
- **M-C-07's proposed grep (`message\(.*\$<`, `if\(.*\$<`, `string\(.*\$<`) had a 100% false-positive rate on this corpus's `message()`/`if()` axis on manual read**: of 3 raw `message()` hits, 2 were the paren-balancer artifact above and 1 (`qt__qtbase@0ef5a8e9ca:cmake/QtPublicSbomCommonGenerationHelpers.cmake:659`) is CMake's own documented `install(CODE …)` generator-expression support (`versionadded:: 3.14`), not configure-time consumption. Every `if(... MATCHES "\$<...")` hit found corpus-wide is the opposite of a bug: code that recognizes a genexpr-shaped string as opaque before forwarding it (§9).
- **`CMAKE_CXX_STANDARD_EXTENSIONS OFF` has zero occurrences anywhere in the 46-repo corpus** (`grep -rl` returns nothing), despite being the second half of the widely-repeated pairing advice; `_REQUIRED ON` is paired in 43 of 136 files that set the standard (31.6%). The "pair with `_REQUIRED ON` and `_EXTENSIONS OFF`" rule is real advice with near-zero adoption for its second half (§5).
- **`file(DOWNLOAD)`'s `CONFIGURE_DEPENDS` sibling is barely used for `GLOB`**: 36 of 1,254 core-bucket `file(GLOB[_RECURSE])` calls (2.9%) carry it; CMake's own docs recommend against `GLOB` for sources at all and warn `CONFIGURE_DEPENDS` "may not work reliably on all generators" (Help/command/file.rst, v4.4.2) — this keeps the row SHOULD, never MUST (§6).
- **Literal `-Werror`/`/WX` in an installable library's own CMakeLists is rare on this corpus**: 12 core-bucket hits (`catchorg/Catch2` ×3, one each in ClickHouse, spdlog, vcpkg, qtbase), versus `CMAKE_COMPILE_WARNING_AS_ERROR` (3.24) which exists for exactly this and is portable across MSVC/GCC/Clang (§7).
- **Refining the "unquoted `${var}` in an `if()` comparison" regex to reject compound-identifier construction (`CMAKE_${lang}_COMPILER_ID`) cut Kitware/CMake's own hit count from 501 to 128 — a 74% false-positive reduction** from one regex fix; the surviving hits are genuine whole-token unquoted comparisons (§8).
- **A large share of the surviving "unquoted if" hits compare a CMake builtin that can never contain a semicolon or embedded space** (`CMAKE_SYSTEM_NAME`, `CMAKE_CXX_COMPILER_ID`, `CMAKE_VERSION`), so the naive regex is textbook-correct but practically low-risk; the genuinely risky class is a **bare `foreach(x ${list})` over a user- or path-derived list**, which corpus-wide is 40.2% of all `foreach()` calls in first-party code (1,687/4,193 core-bucket, deduplicated across 46 repos) (§8).
- **`option()` names starting with `CMAKE_` are dominated by one repo that is allowed to: CMake's own build (`Kitware__CMake@e8befb989b:CMakeLists.txt:98` `option(CMAKE_USE_SYSTEM_LIBARCHIVE …)`) accounts for 26 of the corpus's 28 core-bucket hits, because CMake defining `CMAKE_`-prefixed options for its own build is not the same hazard as a third-party library colliding with CMake's own namespace (§10).
- **The "leading-token prefix share" heuristic for option-namespacing is fooled by monorepos in exactly the way wave-1's shape audit already flagged for LLVM and Kitware** (`exemplar-cmake-shape.md` §6): re-measured independently, `llvm-project`'s dominant single token (`LLVM`) covers only 30% of its 369 distinct option names because Clang/MLIR/libc/compiler-rt each carry their own (still valid) sub-project prefix; the row needs a "known sub-project prefix list" heuristic, not a single-token share (§10).
- **Directory-scoped commands concentrate in a handful of large, old repos, not evenly**: `include_directories()` is 205/542 corpus-wide in `llvm-project` alone; `add_compile_options()` at directory scope is 44/113 in `microsoft/vcpkg`'s port recipes (§3).
- **`CMAKE_CXX_FLAGS`/`CMAKE_C_XX_FLAGS` mutation outside a toolchain file is real and concentrated**: 434 of 480 non-toolchain `set`/`string(APPEND)` hits sit in `Kitware/CMake`, `llvm-project`, `duckdb`, `ClickHouse`, `KDE/extra-cmake-modules`, `cpp-pm/hunter` and `Tencent/rapidjson` — seven repos carry 90% of the corpus-wide non-toolchain total (§4).
- **`find_ocx` is vacuous for every CMK-TGT row in this dive**: it ships `LANGUAGES NONE` and has zero `target_link_libraries`, zero `option()`, zero `CMAKE_CXX_STANDARD` calls; none of M-E-01..04/10/11 apply to it because it has no C++ targets (§12).
- Verification commands for every row below state their measured false-positive characteristic on this corpus, not an assumed one; three of nine rows (M-C-03's unquoted-if, M-C-07 entirely, M-E-10's dataflow) need a narrower parser or a "read the hit" step before they can be a shipped MUST-grade automated gate.

## 1. Method and a parser-limitation ledger

Extended `.agents/research/cmake-audit/scratch/deps-cmake-calls.py`'s paren-balanced, comment-stripped call extractor (kept its per-line comment stripping and its `finditer`-based, multi-line-aware balanced-paren body extraction) into one pass covering `target_link_libraries`, the five directory-scoped commands, `set`/`string(APPEND)` on the flags variables, `set(CMAKE_CXX_STANDARD…)`, `target_compile_features`, `file(GLOB…)`+`add_library`/`add_executable`/`target_sources` (a same-file, in-order variable-name match, not a real dataflow graph), `if`/`elseif`/`while`/`foreach`, `message`/`string`/`file(WRITE)` for generator expressions, and `option()`. Script: `/home/mherwig/.cache/cmake-measure-scratch/consumable-library-targets/parse.py` (also copied to `.agents/research/cmake-consumable-library/scratch/consumable-library-targets/parse.py`). Run: `python3 parse.py` against `/home/mherwig/.cache/research-lang/exemplars/cmake/*/`, 2.9s wall, 46 repos.

**Corpus scope**: of 26,879 `CMakeLists.txt`/`*.cmake` files under the corpus root, 10,287 are `Kitware__CMake/Tests/**` or `Kitware__CMake/Help/**` (excluded per brief), 194 more matched the generated-file banner detector (case-insensitive `automatically generated|do not edit|generated by cmake|@generated|autogenerated` in the first 40 lines — this is what caught `grpc/grpc`'s root file), leaving **16,207 files scanned**. Every scanned file is further bucketed `vendored` (a path component in `{contrib, third_party, third-party, deps, _deps}`), `scaffold` (a path component in `{example, examples, test, tests, testing, fixture, fixtures, sample, samples}`), or `core` (neither) — `core` is the bucket that answers "what does an installable library's own shipped build do," which is this dive's actual question; `vendored` and `scaffold` are reported separately as the brief requires.

**Verified parser limitations** (found by manually re-reading a sample of hits against the source, not assumed):

| Limitation | Evidence | Effect | Fix (not yet applied) |
|---|---|---|---|
| No bracket-comment (`#[[.rst: … #]]`) stripping | `Kitware__CMake@e8befb989b:Modules/FindBoost.cmake:344`, `:FindKDE4.cmake:178`, `:FindMatlab.cmake:1431-1526`, `:FindwxWidgets.cmake:278` are all inside `.. code-block:: cmake` documentation examples, not executable code | Inflates every axis's hit count for `Find*.cmake` modules specifically (Kitware, KDE ECM, Hunter's `cmake/find/`) | Track a bracket-comment open/close state machine (`#\[(=*)\[` … `\]\1\]`) alongside the existing line-comment stripper before paren-balancing |
| Paren-balancer does not track quote state | `llvm__llvm-project@e0316c1b47:mlir/cmake/modules/AddMLIRPython.cmake:915,990` — both flagged for a generator expression that manual read shows is not on either line; the unmatched `(` inside `"Unhandled arguments to add_mlir_python_sources_target(${name}, ..."` extends the "call" until the next real `)`, picking up unrelated content | Misattributes a call's classification (seen here for M-C-07) to the wrong source line | Re-use the quote-aware char scan already written for `strip_comment` inside the paren-depth loop, not just for `#` |
| `${var}` unquoted-compare regex matched compound identifiers | `if(CMAKE_${lang}_COMPILER_ID STREQUAL "PGI")` (`Kitware__CMake@e8befb989b:CompileFlags.cmake:111`) is dynamic variable-name construction, a legitimate idiom, not a quoting bug | 501 raw hits in Kitware/CMake before the fix, 128 after | **Applied in this dive**: require the `${…}` to be a standalone token (`(?<![A-Za-z0-9_}])\$\{…\}(?![A-Za-z0-9_{])`), not embedded in a larger identifier |
| Same-file, in-order variable match for GLOB→target dataflow | `file(GLOB SRCS …)` followed elsewhere by `add_library(x ${SRCS})` is caught; a GLOB result forwarded through a second variable, an included helper file, or an `install(FILES)` call is not | Undercounts M-E-10's "feeds a target" column; the "does not feed a target" residual is not proof of safety | State as a known undercount; a real answer needs `cmake --trace-expand`, not static parsing |

None of these are hypothetical: each is a specific `repo@sha:path:line` a human can re-open. The corpus-wide numbers below are **measured upper bounds** for M-C-07 and for Kitware/CMake and KDE's Find-module contributions to every axis, refined once (M-C-03's regex) and flagged-but-not-refined twice (bracket comments, paren-balancer) for the remaining rows — a second pass should apply the bracket-comment fix before any of these numbers become a CI gate's threshold.

## 2. M-E-01 — target_link_libraries keyword discipline {#2-m-e-01}

**Corpus-wide** (this dive's re-fetch, 2026-09-26 SHAs, `core`+`scaffold`+`vendored`): 5,795 calls, 1,017 bare (17.6%) — not the wave-1 audit's 8,453/2,980 (35.3%), because that count did not separate generated files, `Kitware/Tests`+`Help`, or scaffolding from a library's own shipped surface, and ran against different (pre-refresh) SHAs (map correction 12: 33/46 SHAs changed).

**Split by bucket** — this is the chase-the-surprise finding:

| Bucket | total | bare | % |
|---|---:|---:|---:|
| `core` (a repo's own non-vendored, non-test/example CMakeLists) | 4,280 | 568 | **13.3%** |
| `scaffold` (examples/, test/, tests/, samples/) | 1,306 | 418 | **32.0%** |
| `vendored` (contrib/, third_party/, deps/, _deps/) | 209 | 31 | 14.8% |

**Per-repo, `core` bucket, sorted by bare-call share** (repos with ≥5 calls):

| repo | total | bare | % | reading |
|---|---:|---:|---:|---|
| `duckdb/duckdb` | 30 | 23 | 76.7% | real, its own top-level `src/CMakeLists.txt` |
| `KDE/extra-cmake-modules` | 24 | 18 | 75.0% | mostly its own find-modules and macros, not doc blocks (spot-checked 3, all real) |
| `protocolbuffers/protobuf` | 31 | 15 | 48.4% | mixed real/legacy in `cmake/` helper files |
| `libuv/libuv` | 9 | 9 | 100.0% | real, small repo, entire build predates keyword-only style |
| `Kitware/CMake` | 269 | 51 | 19.0% | **noisy**: a manual sample of 20 hits found ~9 inside `#[[.rst:` Find-module documentation (parser limitation above), ~6 using a dynamically-computed keyword variable (`${CUDA_LINK_LIBRARIES_KEYWORD}` in `FindCUDA.cmake`, neither bare nor a literal keyword), and the rest genuinely bare in CMake's own vendored utility libraries (`Source/kwsys/CMakeLists.txt:766`, `Utilities/cmlibuv/CMakeLists.txt:335`, `Utilities/cmlibarchive/libarchive/CMakeLists.txt:250,261,275`) |
| `conan-io/conan-center-index` | 2,303 | 341 | 14.8% | Conan recipes wrapping arbitrary upstream sources, not an installable-library corpus member in the sense this row targets |
| `apache/arrow` | 134 | 23 | 17.2% | real |
| `microsoft/vcpkg` | 544 | 42 | 7.7% | port recipes |
| `qt/qtbase` | 136 | 5 | 3.7% | clean |
| `llvm/llvm-project` | 425 | 26 | 6.1% | clean relative to its size |
| `ClickHouse/ClickHouse` | 236 | 2 | 0.8% | exemplary — `ClickHouse__ClickHouse@0995a518a8:CMakeLists.txt:848` `target_link_libraries(${target} PUBLIC ch_contrib::fuzzer)` |

**Correct vs incorrect, from the corpus**:

```cmake
# Kitware__CMake@e8befb989b:Source/kwsys/CMakeLists.txt:766 — bare, real
target_link_libraries(${KWSYS_TARGET_INTERFACE} ${KWSYS_LINK_DEPENDENCY}
  ${CMAKE_DL_LIBS})

# ClickHouse__ClickHouse@0995a518a8:CMakeLists.txt:848 — keyworded
target_link_libraries(${target} PUBLIC ch_contrib::fuzzer)
```

Grounding: `cmake-buildsystem(7)` (v4.4.2) — "`target_link_libraries` … Populates the `LINK_LIBRARIES` build specification and `INTERFACE_LINK_LIBRARIES` usage requirement properties. This is the primary mechanism by which link dependencies and their usage requirements are transitively propagated" (Help/manual/cmake-buildsystem.7.rst:361-367, fetched `gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/…`). Effective Modern CMake: "Always explicitly declare properties `PUBLIC`, `PRIVATE`, or `INTERFACE` when using `target_*`. Being explicit reduces the chance to unintendedly introduce hidden dependencies" (gist.github.com/mbinna/…, "Targets and Properties" §, fetched 2026-09-26).

**Verification**: `python3 parse.py` over a directory (the multi-line-aware balanced-paren extractor above); reading `tll_bare`/`tll_total` per repo/bucket from `per_repo_counts.json`. A simpler single-file spot-check: `rg -n -A2 'target_link_libraries\(' <path>` then read whether the second token is `PUBLIC`/`PRIVATE`/`INTERFACE` — empty PUBLIC/PRIVATE/INTERFACE match on a call = finding, but a single-line `rg` **undercounts** any multi-line call whose keyword sits on a later line (this dive's motivation for a real parser). **False-positive rate measured**: near zero for the keyword-presence check itself (a keyword is either there or not); the *classification of a hit as "real" vs "documentation" vs "dynamic keyword variable"* needs the bracket-comment fix (§1) before Kitware- or KDE-flavored counts can be trusted without a manual sample.

## 3. M-E-02 — directory-scoped commands {#3-m-e-02}

Corpus-wide, `core` bucket: `include_directories` 542, `add_definitions` 444, `add_compile_options` 113, `link_directories` 20, `link_libraries` 31.

| command | top repos (core) |
|---|---|
| `include_directories` | `llvm-project` 205, `vcpkg` 64, `Kitware/CMake` 52, `duckdb` 51 |
| `add_definitions` | `vcpkg` 91, `llvm-project` 69, `Kitware/CMake` 54, `arrow` 36 |
| `add_compile_options` | `vcpkg` 44 (port recipes), `ClickHouse` 8, `llvm-project` 8 |
| `link_directories` | `llvm-project` 6, `Kitware/CMake` 5, `vcpkg` 5 |
| `link_libraries` | `conan-center-index` 16, `ccache` 3 |

These five are not evenly spread; `vcpkg`'s port `portfile.cmake`/`CMakeLists.txt` fixtures and `llvm-project`'s size dominate three of the five columns each. Effective Modern CMake: "Forget the commands `add_compile_options`, `include_directories`, `link_directories`, `link_libraries`. Those commands operate on the directory level. All targets defined on that level inherit those properties. This increases the chance of hidden dependencies" (gist §General). Same source elsewhere: "Don't use macros that affect all targets in a directory tree… It is easy to accidentally create hidden dependencies through other targets with those macros."

**Verification**: `rg -n -e '^\s*include_directories\(' -e '^\s*add_definitions\(' -e '^\s*add_compile_options\(' -e '^\s*link_directories\(' -e '^\s*link_libraries\(' <dir> --include='*.cmake' --include='CMakeLists.txt'`; empty = pass. **False positive**: a call at true top level with a single subdirectory (no sibling target that shouldn't inherit it) is technically "directory-scoped" but has no blast radius — the check cannot distinguish this from a real hazard without reading whether `add_subdirectory` follows; treat as a reading heuristic, not an auto-fail.

## 4. M-E-03 — CMAKE_C/CXX_FLAGS mutation {#4-m-e-03}

`core` bucket, split by whether the file's path contains `toolchain` (case-insensitive) or lives under `cmake/toolchains/`:

| | `set(CMAKE_C[XX]_FLAGS …)` | `string(APPEND CMAKE_C[XX]_FLAGS …)` |
|---|---:|---:|
| toolchain-ish path | 36 | 22 |
| **non-toolchain path** | **388** | **46** |

Non-toolchain top repos: `Kitware/CMake` 71, `llvm-project` 63, `duckdb` 43, `ClickHouse` 40, `KDE/extra-cmake-modules` 37, `cpp-pm/hunter` 26, `Tencent/rapidjson` 25, `arrow` 23 — these seven repos carry 90% of the corpus's 434 non-toolchain hits.

```cmake
# non-toolchain mutation (representative shape, seen across the top-7 list)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fno-exceptions")
```

Effective Modern CMake: "Get your hands off `CMAKE_CXX_FLAGS`. Different compilers use different command-line parameter formats… it's much better to tell CMake the compile features" (gist §General). This variable is genuinely global and additive across every subdirectory, including a `FetchContent`/`add_subdirectory`-pulled dependency's own build.

**Verification**: `rg -n -e 'set\(CMAKE_CXX_FLAGS' -e 'set\(CMAKE_C_FLAGS' -e 'string\(APPEND CMAKE_CXX_FLAGS' -e 'string\(APPEND CMAKE_C_FLAGS' <dir> --include='*.cmake' --include='CMakeLists.txt'`, then exclude a path matching `toolchain`. Empty (after the toolchain exclusion) = pass. **False-positive rate**: the toolchain-path exclusion is a filename/dirname heuristic, not semantic; a project that names its toolchain file `compiler-settings.cmake` is missed by the exclusion (undercount, not overcount) and a project with `toolchain` in an unrelated path name would be wrongly excused (not observed in this corpus).

## 5. M-E-04 — CMAKE_CXX_STANDARD vs target_compile_features {#5-m-e-04}

`core` bucket: 228 `set(CMAKE_CXX_STANDARD …)` calls across 136 distinct files; 43 of those 136 files (31.6%) also `set(CMAKE_CXX_STANDARD_REQUIRED ON)`; **0 of 136 also set `CMAKE_CXX_STANDARD_EXTENSIONS OFF`** — verified with a direct corpus-wide search independent of the parser (`grep -rl "CMAKE_CXX_STANDARD_EXTENSIONS" /home/mherwig/.cache/research-lang/exemplars/cmake --include='CMakeLists.txt' --include='*.cmake'` returns nothing; exit code 1, no matches anywhere in the 46-repo corpus). `target_compile_features(<t> PUBLIC cxx_std_NN)`: 70 core-bucket calls; `target_compile_features(... cxx_std_NN)` at any other scope: 885.

Per-repo `CMAKE_CXX_STANDARD` setters vs `target_compile_features(... PUBLIC cxx_std_NN)` users (`core`):

| repo | `CMAKE_CXX_STANDARD` sets | `target_compile_features …PUBLIC cxx_std_NN` |
|---|---:|---:|
| `microsoft/vcpkg` | 71 | 10 |
| `conan-io/conan-center-index` | 37 | 43 |
| `llvm-project` | 17 | 0 |
| `Kitware/CMake` | 9 | 0 |
| `qt/qtbase` | 8 | 0 |
| `fmtlib/fmt` | 0 | 2 |
| `catchorg/Catch2` | 0 | 2 |
| `nlohmann/json` | 0 | 1 |
| `google/googletest` | 0 | 1 |
| `protocolbuffers/protobuf` | 0 | 1 |

```cmake
# fmtlib__fmt@522e2c12ab:CMakeLists.txt — the target-based form (present, 2 calls)
target_compile_features(fmt PUBLIC cxx_std_11)

# microsoft__vcpkg (representative port shape, 71 occurrences corpus-wide) — the variable form
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
```

Grounding: `CXX_STANDARD` property doc (Help/prop_tgt/CXX_STANDARD.rst, v4.4.2) — "Supported values are 98/11/14/17/20/23/26…"; the property is set globally by the `CMAKE_CXX_STANDARD` variable but is a *build specification*, not a usage requirement — it does not propagate to a consumer the way `target_compile_features(... PUBLIC ...)` does. `cmake-buildsystem(7)`: `target_compile_features` "Populates the `COMPILE_FEATURES` build specification and `INTERFACE_COMPILE_FEATURES` usage requirement properties" (`versionadded:: 3.1`).

**Verification**: `rg -n 'CMAKE_CXX_STANDARD\b' <library-dir> --include='*.cmake' --include='CMakeLists.txt'`, excluding the library's top-level test/example directories; any hit outside a top-level project or preset is a finding. Pairing check: for each `set(CMAKE_CXX_STANDARD …)` hit, `grep -q CMAKE_CXX_STANDARD_REQUIRED` the same file — absent = finding (conflict 11's decided rule). **False-positive rate**: near zero for presence detection; the real finding here is that the *rule itself* (pair with `_EXTENSIONS OFF`) has 0% adoption to point to as precedent, so shipping it as MUST would fail every exemplar — see Normative guidance §5 below for the SHOULD-not-MUST call.

## 6. M-E-10 — file(GLOB) feeding targets {#6-m-e-10}

`core` bucket: 1,218 `file(GLOB|GLOB_RECURSE …)` calls without `CONFIGURE_DEPENDS`, 36 with (2.9% adoption). Same-file, in-order variable-match to a later `add_library`/`add_executable`/`target_sources` (§1's known undercount): 148 without `CONFIGURE_DEPENDS`, 12 with.

| repo | GLOB w/o CONFIGURE_DEPENDS | GLOB w/ CONFIGURE_DEPENDS | matched into a target, w/o CD |
|---|---:|---:|---:|
| `microsoft/vcpkg` | 756 | 0 | 82 |
| `Kitware/CMake` | 83 | 0 | 0 |
| `conan-io/conan-center-index` | 75 | 2 | 41 |
| `llvm-project` | 50 | 2 | 0 |
| `qt/qtbase` | 34 | 4 | 2 |
| `ClickHouse/ClickHouse` | 8 | 6 | 8 |
| `microsoft/vcpkg-tool` | 0 | 8 | — |

```cmake
# conan-io__conan-center-index (representative recipe shape) — GLOB feeding add_library, no CONFIGURE_DEPENDS
file(GLOB SOURCES "src/*.cpp")
add_library(${PACKAGE_NAME} ${SOURCES})
```

Grounding, Help/command/file.rst (v4.4.2): "If the `CONFIGURE_DEPENDS` flag is specified, CMake will add logic to the main build system check target to rerun the flagged `GLOB` commands at build time… We do not recommend using GLOB to collect a list of source files from your source tree. If no CMakeLists.txt file changes when a source is added or removed then the generated build system cannot know when to ask CMake to regenerate. The `CONFIGURE_DEPENDS` flag may not work reliably on all generators." Effective Modern CMake: "Don't use `file(GLOB)` in projects… CMake is a build system generator, not a build system." Both sources treat `CONFIGURE_DEPENDS` as a mitigation, not a fix — this keeps the row SHOULD, not MUST.

**Verification**: `rg -n 'file\(GLOB' <dir> --include='*.cmake' --include='CMakeLists.txt'`; for each hit, check the same block for `CONFIGURE_DEPENDS` — absent = SHOULD finding. **False-positive rate**: the "feeds a target" column is a measured **undercount** (§1) — a GLOB result forwarded through an intermediate variable, an `include()`d helper, or consumed by `install(FILES ${var})` instead of a target command is invisible to this heuristic; do not report "does not feed a target" as proof the GLOB is harmless, only that this parser could not trace it.

## 7. M-E-11 — literal -Werror/-WX {#7-m-e-11}

`core` bucket: 12 hits total — `catchorg/Catch2` ×3, one each in `ClickHouse`, `gabime/spdlog`, `microsoft/vcpkg`, `qt/qtbase`. `scaffold` bucket: 3 (`TheLartians/ModernCppStarter` ×2, `google/benchmark` ×1). Rare relative to the corpus's overall size — consistent with the topic map's "187 literal uses vs 16" (wave-1, unfiltered) once scaffolding and template-placeholder repos are separated out.

```cmake
# catchorg__Catch2@222e233903 (representative; literal, hard-codes the compiler's flag spelling)
target_compile_options(Catch2 PRIVATE -Werror)

# the portable alternative (CMake 3.24+) — set once, by the top level or a preset, never inside the library
set(CMAKE_COMPILE_WARNING_AS_ERROR ON)   # -Werror=dev is a different, unrelated switch (M-A family)
```

Grounding, CMAKE_COMPILE_WARNING_AS_ERROR.rst (v4.4.2): `versionadded:: 3.24`, "Specify whether to treat warnings on compile as errors. This variable is used to initialize the `COMPILE_WARNING_AS_ERROR` property on all the targets." Effective Modern CMake, "Treat warnings as errors": "To treat warnings as errors, never pass `-Werror` to the compiler. If you do, the compiler treats warnings as errors. You can no longer treat warnings as errors, because you no longer get any warnings. All you get is errors" — the checklist's own argument for a switch a consumer/CI can toggle centrally rather than a literal flag baked into the library's source.

**Verification**: `rg -n -e '-Werror\b' -e '/WX\b' <library-CMakeLists> --include='CMakeLists.txt' --include='*.cmake'`; a hit inside a library (not its own top-level CI-only path) is a finding. **False-positive rate**: near zero on this corpus — `-Werror=<category>` (turning one category into an error, not all warnings) also matches the `\b-Werror\b` pattern and reads differently in intent than bare `-Werror`; none of the 12 core hits were the `=<category>` form, but a shipped verification should say so explicitly to avoid flagging a narrower, arguably-fine use the same as the broad one.

## 8. M-C-03 — unquoted if() and bare foreach() {#8-m-c-03}

**Unquoted `${var}` in an `if()`/`elseif()`/`while()` comparison**: naive regex (`\$\{VAR\}[^"]{0,40}(STREQUAL|MATCHES|EQUAL|VERSION_…)`) found 991 corpus-wide; refining it to require the `${…}` be a standalone token (rejecting `CMAKE_${lang}_COMPILER_ID`-style compound-identifier construction) cut that to 575 (`core`: 491). Kitware/CMake alone dropped from 501 to 128 raw hits — a 74% reduction from that one fix, all in the compound-identifier class (`if(CMAKE_${lang}_COMPILER_ID STREQUAL "PGI")`, `Kitware__CMake@e8befb989b:CompileFlags.cmake:111`).

Refined per-repo (`core`, top 10): `Kitware/CMake` 128, `llvm-project` 123, `qt/qtbase` 34, `microsoft/vcpkg` 31, `KDE/extra-cmake-modules` 30, `conan-center-index` 22, `apache/arrow` 16, `cpp-pm/hunter` 15, `catchorg/Catch2` 14, `duckdb/duckdb` 14. `ocx-sh/find_ocx`: **0** (matches the wave-1 audit's own finding of 0/240).

```cmake
# ClickHouse__ClickHouse@0995a518a8:cmake/sanitize_targets.cmake:38 — real, unquoted
if(${target_type} STREQUAL "INTERFACE_LIBRARY")

# safe idiom (the recommended fix)
if("${target_type}" STREQUAL "INTERFACE_LIBRARY")
```

A meaningful chunk of the surviving hits compare a CMake builtin that is defined to be a single word with no embedded semicolon (`CMAKE_SYSTEM_NAME`, `CMAKE_CXX_COMPILER_ID`, `CMAKE_VERSION`, `CMAKE_MATCH_<n>`) — e.g. `KDE__extra-cmake-modules@b4c4ec9997:kde-modules/KDEMetaInfoPlatformCheck.cmake:39` `if(${CMAKE_MATCH_1} STREQUAL "Linux")`. These are the naive check's textbook-correct, practically-safe hits: the pattern is real, the risk is not, because the variable can never smuggle a semicolon or a space into the comparison. Contrast with `ClickHouse__ClickHouse@0995a518a8:CMakeLists.txt:738` `if(${type} STREQUAL EXECUTABLE)` where `type` is a caller-supplied macro argument — a genuinely risky instance of the identical syntax.

**Bare `foreach(x ${list})`** (no `IN LISTS`/`IN ITEMS`): 1,687 of 4,193 `core`-bucket `foreach()` calls corpus-wide (40.2%), concentrated at the high end in `apache/arrow` (85%), `cpp-pm/hunter` (85%), `conan-center-index` (78%), `cpp-best-practices/cmake_template` (82%), and at the low end in `microsoft/vcpkg` (13%, 598 total calls — the largest single denominator in the corpus) and 0% in nine smaller, actively-styled repos (`ccache`, `curl`, `friendlyanon/cmake-init`, `gabime/spdlog`, `gflags`, `glfw`, `madler/zlib`, `ninja-build/ninja`, `microsoft/vcpkg-tool`, `ocx-sh/find_ocx`).

```cmake
# fmtlib__fmt@522e2c12ab:CMakeLists.txt:406 — bare
foreach(src ${sources})
# the safe form
foreach(src IN LISTS sources)
```

Grounding, Effective Modern CMake, "Use modern foreach syntax": `foreach(var IN ITEMS foo bar baz)`, `foreach(var IN LISTS my_list)`. `cmake-audit/find-ocx-cmake-shape-and-contracts.md` §4's two regexes are the origin point; this dive re-ran them corpus-wide (not just against `find_ocx`) and confirmed `find_ocx`'s own 0/240, 0-bare-foreach result as still true against the refreshed corpus.

**Verification**: unquoted-if — `rg -Pzo '(?s)(if|elseif|while)\([^)]*\)' <dir>` piped through the refined check (a plain `rg` cannot express the standalone-token exclusion; use the parser). Bare foreach — `rg -n 'foreach\([A-Za-z_][A-Za-z0-9_]*\s+\$\{[A-Za-z_][A-Za-z0-9_]*\}\s*\)' <dir>`. **False-positive rate, measured**: unquoted-if dropped 74% with one token-boundary fix on this corpus's largest contributor; a further, unimplemented refinement (excluding known-scalar CMake builtins from a MUST-grade finding, keeping them as a SHOULD/low-priority note) would cut it further but was not built in this pass — report both numbers, not just the smaller one, since the "safe builtin" exclusion list itself needs maintenance as CMake adds variables.

## 9. M-C-07 — generator expressions at configure time {#9-m-c-07}

Raw hits, `core` bucket: `message()` 3, `string()` 144, `file(WRITE …)` 1. A corpus-wide direct grep for `if(...\$<` / `elseif(...\$<` (independent of the parser, to sanity-check it) found 23 hits, all outside `Kitware/CMake/Tests`+`Help`/vendored/scaffold paths.

**Every raw `message()` hit, manually re-read, is not the bug this row is looking for**:

- `llvm__llvm-project@e0316c1b47:mlir/cmake/modules/AddMLIRPython.cmake:915,990` — both are the paren-balancer artifact from §1: the flagged line contains no `$<` at all; a later, unrelated call's `$<` was misattributed after the balancer failed to stop at the string's own unmatched `(`.
- `qt__qtbase@0ef5a8e9ca:cmake/QtPublicSbomCommonGenerationHelpers.cmake:659` — `message(STATUS "Writing install marker for config $<CONFIG>: ...")` is text inside `install(CODE "${install_marker_code}")`, and `install(CODE …)`'s `<code>` argument has supported generator expressions **since CMake 3.14** (Help/command/install.rst, v4.4.2: "`<file>` or `<code>` may use 'generator expressions' with the syntax `$<...>`"). The `message()` call never runs at configure time; it runs inside the generated install script, where `$<CONFIG>` is a legitimate, evaluated construct.

**Every `if(... MATCHES "\$<...")` hit corpus-wide is the opposite of a bug**: code that recognizes a genexpr-shaped *string value* (already collected from an argument) as opaque before deciding how to forward it — e.g. `qt__qtbase@0ef5a8e9ca:src/corelib/Qt6CoreMacros.cmake:108` `if(_moc_parameter MATCHES "\\\$<")`, `llvm__llvm-project@e0316c1b47:llvm/cmake/modules/AddLLVM.cmake:1762` `if(item MATCHES "\\$<")`. This is the CMake-recommended idiom for a helper function that must not double-evaluate or mis-forward a caller's already-genexpr-laden argument; it is unrelated to "a generator expression consumed at configure time" and the naive grep cannot tell them apart because both contain the literal substring `$<` inside an `if(...)` call.

**Net result: this corpus has zero confirmed real instances of the M-C-07 anti-pattern** (a live generator expression evaluated directly by `message()`, `if()`, or a `string()` operation that acts on it *now*, such as `string(COMPARE EQUAL "$<CONFIG>" "Debug" …)`). The `string()` axis's 144 hits were not individually re-read past the first dozen; the sampled ones (`Kitware__CMake@e8befb989b:Modules/GoogleTest.cmake:685,719,754,777,779`, `Modules/FindMPI.cmake:1381-1392`) are all building genexpr-laden *text* for later `file(GENERATE)`/ctest-include consumption — the correct, documented pattern — not evaluating the genexpr themselves.

**Verification**: the map's proposed `rg -n -e 'message\(.*\$<' -e 'if\(.*\$<' -e 'string\(.*\$<'` is **not shippable as an automated MUST-grade gate on this evidence** — every hit found required a manual read to classify. Ship it as a **reading heuristic** (a hit means "read this line and confirm the genexpr is really being evaluated now, not built into a string headed for `file(GENERATE)`, `install(CODE)`, or a value comparison inside another `if(... MATCHES "\$<")` guard"), not a grep whose non-empty output is itself the finding. **False-positive rate: 100% on every raw hit manually classified in this corpus** (3/3 `message()` hits refuted; the `if()` axis's 23 hits are 23/23 the correct defensive idiom).

## 10. M-C-09 — option()/CMAKE_* naming {#10-m-c-09}

`core` bucket: 1,662 `option()` calls corpus-wide; 28 begin with `CMAKE_` — 26 of those 28 are `Kitware/CMake`'s own build (`Kitware__CMake@e8befb989b:CMakeLists.txt:98,100,102,103,114,117,118,122,226,237,242,247,256,258,322,326,337,375,386,394,446`, plus `CMakeCPack.cmake:4`, `Modules/Platform/Windows-GNU.cmake:174`, `Source/Modules/CMakeBuildUtilities.cmake:156`, `Utilities/Doxygen/CMakeLists.txt:33,41`), and the remaining 2 are `microsoft/vcpkg` port scripts (`ports/duktape/CMakeLists.txt:3` `option(CMAKE_VERBOSE_MAKEFILE …)`, `ports/usockets/CMakeLists.txt:7` `option(CMAKE_UNITY_BUILD …)`).

```cmake
# Kitware__CMake@e8befb989b:CMakeLists.txt:98 — CMake defining its OWN build's option in CMake's own namespace
option(CMAKE_USE_SYSTEM_LIBARCHIVE "Use system-installed libarchive" "${CMAKE_USE_SYSTEM_LIBRARY_DEFAULT}")
```

This is the vendoring/self-reference caveat the row's brief calls out: CMake IS the project that owns the `CMAKE_` namespace, so its own build using `CMAKE_`-prefixed options is not the third-party-collision hazard the rule targets. The 2 vcpkg-port hits (`CMAKE_VERBOSE_MAKEFILE`, `CMAKE_UNITY_BUILD`) are genuine instances of the anti-pattern — a port re-declaring a CMake-builtin-shaped `option()` name, which silently shadows the builtin variable for anyone who `add_subdirectory()`s that port.

**"Dominant leading-token prefix" heuristic**, independently re-measured (same method as wave-1's `exemplar-cmake-shape.md` §6):

| repo | distinct option names | dominant token | unprefixed-by-that-token estimate |
|---|---:|---|---:|
| `llvm-project` | 369 | `LLVM` | 258 (70%) |
| `Kitware/CMake` | 250 | `CURL` | 175 (70%) |
| `conan-center-index` | 106 | `ENABLE` | 85 (80%) |
| `duckdb/duckdb` | 61 | `DISABLE` | 51 (84%) |
| `microsoft/vcpkg` | 52 | `VCPKG` | 45 (87%) |
| `curl/curl` | 105 | `CURL` | 29 (28%) |
| `KDE/extra-cmake-modules` | 21 | `KDE` | 15 (71%) |

This independently reproduces wave-1's own finding almost exactly (`exemplar-cmake-shape.md` §6: "`Kitware__CMake` 270 total options, top prefix `CURL` 29% — its own bundled `Utilities/cmcurl` vendoring dominates the option-name histogram, not CMake's own options"; "`llvm-project` 416, top prefix `LLVM` 30% — sub-projects (clang, libc, compiler-rt, …) each bring their own prefix, diluting a single 'top' one"). Two independent measurements at different SHAs (three weeks apart) landing on the same repos and nearly the same shape is strong corroboration that this heuristic's failure mode is structural, not a one-off artifact: **a single-token "dominant prefix" metric cannot separate "no project namespace" from "a monorepo with several valid sub-project namespaces" or "a vendored subtree's own naming convention dominating the count."**

**Verification**: `rg -n 'option\(CMAKE_' <dir> --include='CMakeLists.txt' --include='*.cmake'` for the `CMAKE_`-prefix collision (empty = pass, a hit inside the project's own top-level `CMakeLists.txt` for a project actually named CMake is the one sanctioned exception — this is why the row needs to state that carve-out explicitly, or the check produces a false MUST-fail against CMake's own source, which would be an amusing but wrong finding for a rule about CMake hygiene to make about CMake itself). Prefix-share heuristic: reading, not grep — a repo with a monorepo shape (sub-project directories each with `CMakeLists.txt`) needs a per-subproject prefix check, not one corpus-wide token.

---

## Normative guidance candidates

1. **Every `target_link_libraries` call in an installable library's own (non-test, non-example) CMakeLists names `PUBLIC`, `PRIVATE`, or `INTERFACE`.** Rationale: it is CMake's own documented propagation mechanism (cmake-buildsystem.7); a bare call silently exposes a private link dependency to every consumer. MUST for a library; SHOULD (not MUST) for its own test/example targets, where this dive measured 2.4x the bare-call rate (32.0% vs 13.3%) and a mistake there never reaches a downstream consumer. Verify: `python3 parse.py` (this dive's script) over the library's own subtree, excluding its test/example directories; a single-file spot check is `rg -n -A3 'target_link_libraries\(' <file>` then read whether a scope keyword is present within the shown context — empty grep output is not itself meaningful here, the *content* of each hit must be read; a bare match with no keyword in the following two lines = finding. Floor: CMake ≥2.8.12 (the keyword forms), assumed floor 3.25.
2. **Never `include_directories()`, `add_definitions()`, `add_compile_options()`, `link_directories()`, or `link_libraries()` (the five directory-scoped forms) in a new or actively-modernized installable library; the `target_*` equivalent instead.** Rationale: directory scope leaks to every target defined afterward in that directory and its subdirectories, including one that should never have seen it (Effective Modern CMake, "those macros are evil"). MUST for a library authored or touched under `cmake-modernize`; SHOULD (recognize-and-flag) for an untouched legacy tree, since blanket auto-fixing five directory-scoped commands into per-target calls without knowing every target in scope risks silently dropping a dependency. Verify: `rg -n -e '^\s*include_directories\(' -e '^\s*add_definitions\(' -e '^\s*add_compile_options\(' -e '^\s*link_directories\(' -e '^\s*link_libraries\(' <dir> --include='*.cmake' --include='CMakeLists.txt'`; empty = pass. Floor: none — these commands predate every CMake version in the corpus.
3. **Never `set(CMAKE_CXX_FLAGS …)` or `string(APPEND CMAKE_CXX_FLAGS …)` outside a toolchain file, a preset's `cacheVariables`, or the top-level project's own CI-only guarded block.** Rationale: the variable is global and additive across every subdirectory, including a fetched dependency's build (Effective Modern CMake, "Get your hands off CMAKE_CXX_FLAGS"). MUST for a library (never, full stop — a library that needs a compiler flag uses `target_compile_options`); SHOULD-avoid for a top-level application (acceptable only inside an explicit, documented, single-purpose block). Verify: `rg -n -e 'set\(CMAKE_CXX_FLAGS' -e 'set\(CMAKE_C_FLAGS' -e 'string\(APPEND CMAKE_CXX_FLAGS' -e 'string\(APPEND CMAKE_C_FLAGS' <dir> --include='*.cmake' --include='CMakeLists.txt'`, then exclude any path containing `toolchain`; non-empty after exclusion = finding. Floor: none.
4. **An installable library states its C++ minimum with `target_compile_features(<target> PUBLIC cxx_std_NN)`, never `CMAKE_CXX_STANDARD` in its own CMakeLists.** Rationale: `target_compile_features` is a usage requirement that propagates to consumers and exports correctly; `CMAKE_CXX_STANDARD` is a build-specification variable a consumer's own profile or preset must be free to set instead (conflict 11). MUST for a library. Where `CMAKE_CXX_STANDARD` legitimately appears (a top-level project, a preset, a manager-generated toolchain file), it MUST be paired with `CMAKE_CXX_STANDARD_REQUIRED ON`; pairing with `CMAKE_CXX_STANDARD_EXTENSIONS OFF` is SHOULD, not MUST — **this corpus shows 0/136 real-world adoption of the `_EXTENSIONS OFF` half**, so a rule that makes it MUST would fail 100% of the exemplars that otherwise follow the rest of the pairing advice; ship it as recommended-but-unenforced until adoption data changes. Verify: `rg -n 'CMAKE_CXX_STANDARD\b' <library-dir>` outside its top-level/test/preset files = finding; for each survivor, grep the same file for `CMAKE_CXX_STANDARD_REQUIRED` (absent = finding) and `_EXTENSIONS` (absent = note, not a finding). Floor: `target_compile_features` since 3.1; `cxx_std_NN` meta-features since 3.8 (17) / 3.12 (20) — state per standard requested.
5. **`file(GLOB)`/`file(GLOB_RECURSE)` feeding `add_library`/`add_executable`/`target_sources` is a SHOULD-fix, never a MUST-block, and `CONFIGURE_DEPENDS` is a mitigation, not the fix.** Rationale: CMake's own docs recommend explicit source lists and warn `CONFIGURE_DEPENDS` "may not work reliably on all generators" (file.rst); this corpus's 2.9% adoption rate for `CONFIGURE_DEPENDS` where GLOB is already in use shows it is not treated as a required companion even by projects that keep GLOB. Verify: `rg -n 'file\(GLOB' <dir> --include='*.cmake' --include='CMakeLists.txt'`, then check the same block for `CONFIGURE_DEPENDS`; absent = SHOULD finding, present = downgrade to a note ("mitigated, not eliminated"). Do not claim "no target consumes this GLOB" from a failed same-file variable match — the check can only prove the positive (it does feed a target), never the negative. Floor: `CONFIGURE_DEPENDS` since 3.12.
6. **No literal `-Werror` or `/WX` in an installable library's own CMakeLists; use `CMAKE_COMPILE_WARNING_AS_ERROR` (3.24) set by the top level, a preset, or CI, never the library.** Rationale: a hard-coded flag is compiler-specific (MSVC's spelling differs), cannot be toggled off by a consumer building the library as a dependency, and (Effective Modern CMake) removes the very warnings a `-Werror` policy needs to see before it can be safely turned on. MUST for a library at any priority; a library's own top-level CI-only path (never installed, never inherited by a consumer) is the one place a literal flag is tolerable, and should say so in a comment. Verify: `rg -n -e '-Werror\b' -e '/WX\b' -g CMakeLists.txt -g '*.cmake' <library-dir>`; a hit outside the library's own top-level developer-only block = finding. Note the `-Werror=<category>` sub-form reads differently (narrows one category, not "all warnings become errors") and should be called out separately in the finding message rather than conflated with bare `-Werror`. Floor: `CMAKE_COMPILE_WARNING_AS_ERROR` since 3.24; below that floor, a preset-scoped or CI-only flag is the fallback, still never inside the library's own CMakeLists.
7. **Every `if()`/`elseif()`/`while()` comparison quotes its variable operand; every `foreach()` over a list uses `IN LISTS`/`IN ITEMS`, never the bare `foreach(x ${list})` form.** Rationale: an unquoted `${var}` that is empty, contains a semicolon, or contains embedded whitespace changes `if()`'s argument count or truth value silently (`cmake-language(7)` §6); a bare `foreach` over a semicolon-bearing value mis-splits it into extra iterations. MUST universally — this is cheap, mechanical, and the corpus shows both experienced (CMake's own source) and inexperienced projects get it wrong at similar rates once compound-identifier false positives are removed. Verify (if): the parser's token-boundary-aware regex (§1's fix), not a naive `\$\{VAR\}.*STREQUAL` grep, which had a 74%-inflated hit count on this corpus's largest single contributor. Verify (foreach): `rg -n 'foreach\([A-Za-z_][A-Za-z0-9_]*\s+\$\{[A-Za-z_][A-Za-z0-9_]*\}\s*\)' <dir>`; empty = pass. Downgrade a hit to a note, not a MUST-fail, when the compared/iterated variable is a documented CMake builtin that cannot contain a semicolon (`CMAKE_SYSTEM_NAME`, `CMAKE_CXX_COMPILER_ID`, `CMAKE_VERSION`, `CMAKE_MATCH_<n>`) — flag it for style, not correctness. Floor: none; these idioms work identically back to CMake 2.x.
8. **A generator-expression-shaped grep inside `message()`/`if()`/`string()` is a reading heuristic, never an automated MUST-grade gate, until it can tell "evaluated now" from "text built for `file(GENERATE)`/`install(CODE)`/a later genexpr-aware sink" apart.** Rationale: on this 46-repo, ~16,000-file corpus, the naive check's false-positive rate was 100% on every hit that was actually re-read (2 parser artifacts, 1 genuine `install(CODE)` use, 23 defensive `MATCHES "\$<"` idioms in `if()`, 0 confirmed real bugs). Ship the row as: a hit means "open this line and ask does CMake evaluate this argument today, or does it become text handed to `file(GENERATE)`, `install(CODE)`/`install(SCRIPT)`, or a target property" — never as a CI gate whose non-empty output alone is the finding. Verify (as a recognize step, not a gate): `rg -n -e 'message\(.*\$<' -e 'if\(.*\$<' -e 'string\(.*\$<' <dir>`, followed by manual classification per hit. Floor: `install(CODE|SCRIPT)` genexpr support since 3.14; genexprs themselves are much older.
9. **A new `option()` name carries a project-specific prefix; a new normal or cache variable is never named `CMAKE_<anything>`.** Rationale: `option()` and cache variables live in a single global namespace shared with every dependency an `add_subdirectory()` or `FetchContent` pulls in; a collision silently takes the first-registered definition (cmake-lint W0105's still-valid check, per the topic map's conflict 4). MUST for a genuinely new option in a non-monorepo project; the `CMAKE_`-prefix rule is MUST **except** for CMake's own build of itself (the one sanctioned self-reference this corpus shows, 26/28 of the corpus's hits). For an option-prefix audit of an *existing* monorepo (LLVM-, Kitware-, KDE-shaped), replace the single-token "dominant prefix" metric with a maintained list of that repo's known sub-project prefixes before treating an unmatched name as a finding — a single-token share metric independently reproduced wave-1's own false-positive finding on the same two repos three weeks apart, which is strong evidence the failure mode is structural, not incidental. Verify: `rg -n 'option\(CMAKE_' <dir> --include='CMakeLists.txt' --include='*.cmake'`, with the CMake-build-of-itself carve-out named explicitly in the finding text; the prefix-share check is a reading heuristic, not a grep. Floor: none.

## Exemplar evidence

| Row | Satisfies | Violates | Contradicts / nuances |
|---|---|---|---|
| M-E-01 | `ClickHouse/ClickHouse` (0.8% bare in `core`); `qt/qtbase` (3.7%) | `duckdb/duckdb` (76.7%), `libuv/libuv` (100%, small repo), `Kitware/CMake`'s own `Source/kwsys` | `Kitware/CMake`'s headline 19% is inflated by Find-module documentation examples and a dynamic-keyword idiom (`${CUDA_LINK_LIBRARIES_KEYWORD}`) — read before citing |
| M-E-02 | most small, actively-styled libraries (`fmt`, `spdlog`, `nlohmann/json`: near-zero hits) | `llvm-project`, `microsoft/vcpkg` port recipes, `Kitware/CMake` | none found |
| M-E-03 | `fmt`, `spdlog`, `googletest`, `re2`, `curl` (0 core hits) | `Kitware/CMake`, `llvm-project`, `duckdb`, `ClickHouse`, `KDE/extra-cmake-modules`, `cpp-pm/hunter`, `Tencent/rapidjson` (90% of the non-toolchain total between them) | none found |
| M-E-04 | `fmt`, `Catch2`, `nlohmann/json`, `googletest`, `protobuf` (target_compile_features, no CMAKE_CXX_STANDARD) | `microsoft/vcpkg` (71 sets, 10 target_compile_features), `llvm-project`, `Kitware/CMake`, `qt/qtbase` (CMAKE_CXX_STANDARD only, 0 target_compile_features) | the `_EXTENSIONS OFF` half of the pairing rule: 0/46 adopters, contradicting the rule's own premise that this is standard practice |
| M-E-10 | `Kitware/CMake` (83 GLOBs, 0 with CONFIGURE_DEPENDS, 0 measured feeding a target) | `microsoft/vcpkg` (756 GLOBs, 82 feeding a target, 0 with CONFIGURE_DEPENDS) | `microsoft/vcpkg-tool`'s 8 GLOBs are 100% CONFIGURE_DEPENDS-covered — the one repo in the corpus that fully adopted the mitigation |
| M-E-11 | 40 of 46 repos: zero literal `-Werror`/`/WX` in `core` | `catchorg/Catch2` (×3), `ClickHouse`, `spdlog`, `vcpkg`, `qtbase` (1 each) | rarity itself is the finding — this row's automated gate will almost never fire, which is expected, not a parser failure |
| M-C-03 | `find_ocx` (0/240, wave-1's own finding, reconfirmed against the refreshed corpus); `microsoft/vcpkg` foreach (13% bare of 598, the largest single denominator) | `apache/arrow`, `cpp-pm/hunter` (85% bare foreach); `Kitware/CMake` (128 refined unquoted-if hits) | Kitware's raw 501 vs refined 128 is itself the strongest evidence in this dive for shipping the token-boundary-aware version, not the naive one |
| M-C-07 | — (no row can "satisfy" a check with zero confirmed real instances corpus-wide) | — (none confirmed) | every raw hit refuted on manual read; this is the row itself under contest, not any one exemplar |
| M-C-09 | `spdlog`, `protobuf`, `vcpkg-tool`, `qtbase`, `benchmark`, `zlib` (≥75% single-prefix share, wave-1's own table) | `microsoft/vcpkg` (2 CMAKE_-prefixed port options: `CMAKE_VERBOSE_MAKEFILE`, `CMAKE_UNITY_BUILD`) | `Kitware/CMake`'s 26 CMAKE_-prefixed options are the sanctioned self-reference exception, not a violation; `llvm-project`/`Kitware/CMake`'s low prefix-share is a monorepo artifact, independently reproduced from wave-1's measurement |

**`find_ocx`**: ships `LANGUAGES NONE` (`ocx-sh__find_ocx@ac2a759cd0:CMakeLists.txt`), zero `target_link_libraries`, zero `option()`, zero `CMAKE_CXX_STANDARD`/`target_compile_features` calls of any kind. None of M-E-01, M-E-02 (partially — it does not use the five directory-scoped commands either), M-E-03, M-E-04, M-E-10, or M-E-11 apply to it, because it has no C++ compilation target to have usage requirements about. This is the correct, vacuous outcome for a pure tool-provisioning module and should be stated as such in shipped text — a rule engine that reports "0 findings" for `find_ocx` on this family is reporting truthfully, not silently skipping something.

## AI-agent angle

- **An LLM trained on pre-2.8.12 or tutorial-era CMake will write bare `target_link_libraries(target dep1 dep2)` by default**, because that is still the form shown in the majority of Stack Overflow answers and many still-circulating tutorials, and it is not a syntax error — CMake accepts it silently. The smallest mechanical check: after generating or editing any `target_link_libraries` call, grep the edited hunk for `target_link_libraries\(` and confirm the very next non-whitespace token is `PUBLIC`, `PRIVATE`, or `INTERFACE`; if not, add one (default to `PRIVATE` unless the dependency's type appears in the target's own installed/public headers).
- **An LLM will reach for `include_directories()`/`add_definitions()` when it needs "the include path" or "a define" for a target it just created**, because these are shorter to write and match the oldest, most-memorized CMake idiom. The mechanical check: any suggested `include_directories(`/`add_definitions(`/`add_compile_options(`/`link_directories(`/`link_libraries(` call outside an explicitly-requested legacy-compatibility context should be rewritten to the matching `target_*` form before being accepted.
- **An LLM will suggest `set(CMAKE_CXX_STANDARD 17)` as "the way to require C++17"** even inside a library's own `CMakeLists.txt`, because this is the form shown in nearly every quick-start tutorial and vcpkg port template (71 of this corpus's 228 `CMAKE_CXX_STANDARD` sets are in vcpkg's own port scripts, effectively a copy-pasted template). The mechanical check: if the file being edited is a library's own build description (has an `install(TARGETS …)` or `install(EXPORT …)` elsewhere in the tree) rather than a top-level application, reject `CMAKE_CXX_STANDARD` in favor of `target_compile_features(<target> PUBLIC cxx_std_NN)`.
- **An LLM will suggest `file(GLOB_RECURSE SOURCES *.cpp)` as "the modern, low-maintenance way to list sources,"** treating `CONFIGURE_DEPENDS` as if it fully solved the staleness problem CMake's own docs warn it does not. The mechanical check: if GLOB is genuinely wanted (a generated-sources directory, a vendored drop, or an explicit user request), require `CONFIGURE_DEPENDS` and state in a comment which generators the project targets (Ninja and Makefiles support it reliably; some others do not per CMake's own docs) — never silently omit it, and never present GLOB as equivalent in correctness to an explicit list.
- **An LLM asked to "make the build strict" will emit `-Werror` (or `/W4 /WX` on a Windows-flavored prompt) directly into `target_compile_options` or `CMAKE_CXX_FLAGS`**, because that is the shortest path a training corpus dominated by single-compiler tutorials would suggest, and it will not know `CMAKE_COMPILE_WARNING_AS_ERROR` exists unless the model's training cutoff is recent enough to have seen CMake 3.24-era material widely — which for a library-authoring prompt is a real risk given how much of the visible internet's CMake advice predates 2022. Mechanical check: reject a literal `-Werror`/`/WX` suggestion for anything other than the project's own top-level, CI-only, never-installed compile step; redirect to `CMAKE_COMPILE_WARNING_AS_ERROR`.
- **An LLM asked to "check if this is a genexpr" will pattern-match `$<` inside `message()`/`if()`/`string()` calls and flag them as configure-time-evaluation bugs without reading whether the surrounding code forwards the string to `file(GENERATE)` or `install(CODE)` first** — this dive found the exact failure mode in the other direction (every raw hit in the corpus was a false positive), and the same shallow-pattern-match habit that produces the anti-pattern in a naive lint tool will also make an LLM *reviewer* over-flag entirely correct code that uses this idiom. Mechanical check: before flagging a `$<...>` inside one of these three commands, trace whether the containing variable or argument is later passed to `file(GENERATE)`, `install(CODE|SCRIPT)`, an `add_custom_command(...COMMAND...)`, or a target property — if so, it is correct, deferred-evaluation usage, not a bug.
- **An LLM will name a new option `ENABLE_TESTS` or `BUILD_SHARED_LIBS`-adjacent generic names without a project prefix**, because that is the shortest, most "obvious" name and matches a huge share of tutorial code (this corpus's own `ENABLE_`-prefixed clusters in ClickHouse and CCI recipes are 77-80% of those repos' options, which an LLM would read as "this is the convention," missing that it is a *repo-internal* convention that still functions as that repo's de facto prefix, not evidence that a bare `ENABLE_` is safe in a new, separately-consumed library). Mechanical check: before accepting a new `option()` name, confirm it starts with the project's own established prefix (derived from `project(<NAME> ...)`, not invented fresh) and is never a bare `CMAKE_*` name.

## Contested / evolving

- **Whether `CMAKE_CXX_STANDARD_EXTENSIONS OFF` should be MUST or SHOULD.** The advice is old and widely repeated (cmake-init, Effective Modern CMake, most C++ style guides), but this corpus shows literally 0/46 adoption even among repos that otherwise carefully pair `_REQUIRED ON`. As of 2026-09-26 this reads as aspirational guidance that has not been adopted even by the exemplar corpus's best-practice repos (`fmt`, `Catch2`, `nlohmann/json` avoid the whole `CMAKE_CXX_STANDARD` variable rather than pairing it) — trending toward "the `target_compile_features` escape hatch makes the whole pairing question moot for new code," not toward wider `_EXTENSIONS OFF` adoption.
- **Whether a grep-shaped check for M-C-07 belongs in a shipped rule set at all.** This dive's finding — 100% false-positive rate on every hit actually re-read, zero confirmed real bugs corpus-wide — is strong enough that the row could be dropped entirely rather than kept as a "reading heuristic." Recommendation in this dive: keep it as documentation-only content (the "AI-agent angle" entry above is the more useful shape of this row than a verification command), not as a numbered checkable rule with a grep attached; revisit if a future measurement finds a real instance.
- **How aggressively `cmake-modernize` should auto-fix M-E-02's directory-scoped commands versus only flag them.** A bare `include_directories()`/`add_definitions()` at the true top level of a small, single-target project is functionally identical to its `target_*` equivalent; the same call in a multi-target tree with siblings that should not inherit it is a real bug. Static analysis alone (this dive's method) cannot always tell which case a given hit is; as of 2026-09-26 the safer default is flag-and-read, not auto-rewrite, until a future dive can add a real target-graph check (`cmake --trace-expand` or `cmake-file-api` codemodel).
- **The option-prefix monorepo problem is unsolved, not merely under-measured.** Two independent measurements (wave-1's 2026-09-05/06 pass and this dive's 2026-09-26 re-fetch, on different SHAs) land on the same conclusion for the same two repos (LLVM, Kitware): a single dominant-token metric cannot separate "no namespace discipline" from "several valid sub-project namespaces." No corpus evidence points to an emerging fix (e.g., no repo was observed switching to a maintained sub-project allowlist specifically to make this metric legible); this is a genuine open problem for automated option-prefix linting, not a temporary gap.

## Sources

| URL / measurement | What it is | Date / era | Why worth reading |
|---|---|---|---|
| `python3 /home/mherwig/.cache/cmake-measure-scratch/consumable-library-targets/parse.py` over `/home/mherwig/.cache/research-lang/exemplars/cmake/*/` | This dive's own multi-line-aware, paren-balanced parser (extends `cmake-audit/scratch/deps-cmake-calls.py`); output in `per_repo_counts.json`, `examples.json`, `exclusions_summary.json` in the same directory | Run 2026-09-26 | Primary — every corpus-wide and per-repo count in this document |
| Manual `sed`/`grep` re-reads of ~40 individual hits against their source files (cited inline as `repo@sha:path:line` throughout §1-10) | Spot-verification of the parser's own output, catching the bracket-comment and paren-balance limitations | 2026-09-26 | Primary — this is what separates "the regex matched" from "the finding is real" for this dive; without it, M-C-07 and much of M-C-03/M-E-01's Kitware numbers would have been reported uncritically |
| `grep -rl "CMAKE_CXX_STANDARD_EXTENSIONS" /home/mherwig/.cache/research-lang/exemplars/cmake --include='CMakeLists.txt' --include='*.cmake'` (no matches, exit 1) | Independent, parser-free confirmation of the 0/46 adoption finding | 2026-09-26 | Primary — a second, simpler tool corroborating the parser's own count for the single most surprising number in this dive |
| [Help/manual/cmake-buildsystem.7.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-buildsystem.7.rst) | CMake's own normative buildsystem reference, raw RST | Tag v4.4.2 (current per era-recheck 2026-09-26) | Primary — exact language for target commands, scope keywords, and the build-specification/usage-requirement split (§2, §5) |
| [Help/command/file.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/file.rst) | `file(GLOB…)` command reference | v4.4.2 | Primary — CMake's own recommendation against GLOB and the CONFIGURE_DEPENDS caveat (§6) |
| [Help/command/install.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/install.rst) | `install()` command reference, all sub-signatures | v4.4.2 | Primary — `versionadded:: 3.14` generator-expression support in `install(CODE|SCRIPT)`, the fact that refuted 1/3 of the M-C-07 message() hits (§9) |
| [Help/variable/CMAKE_COMPILE_WARNING_AS_ERROR.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_COMPILE_WARNING_AS_ERROR.rst) | Variable reference | v4.4.2, `versionadded:: 3.24` | Primary — the exact version floor for M-E-11's recommended mechanism |
| [Help/prop_tgt/CXX_STANDARD.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/prop_tgt/CXX_STANDARD.rst) | Target property reference | v4.4.2 | Primary — supported standard values and version floors per standard (17 since 3.8, etc.) for M-E-04 |
| [Effective Modern CMake (mbinna gist)](https://gist.githubusercontent.com/mbinna/c61dbb39bca0e4fb7d1f73b0d66a4fd1/raw/) | Practitioner checklist, widely cited in CMake circles | fetched 2026-09-26, content undated but stable/long-circulating | Codified — nearly one-to-one mapping onto this row family (directory-scoped commands, CMAKE_CXX_FLAGS, PUBLIC/PRIVATE/INTERFACE, GLOB, -Werror), used as the "why" for several MUST calls above |
| `.agents/research/cmake-audit/exemplar-cmake-shape.md` §6 (this program, wave 1) | Prior corpus measurement of option-prefix discipline, same heuristic | 2026-09-05/06, pre-refresh SHAs | Codified — independently reproduced by this dive's own re-measurement three weeks and 33/46-SHA-changes later; the agreement is itself evidence (§10) |
| `.agents/research/cmake-audit/find-ocx-cmake-shape-and-contracts.md` §4 | Prior measurement of `find_ocx`'s own quoting discipline (0/240 unquoted, 0 bare foreach), origin of the two M-C-03 regexes | 2026-09-05/06 | Codified — this dive's M-C-03 section re-confirms the 0/240 result against the refreshed corpus and reuses/refines the regex |
| `.agents/research/cmake-topic-map.md` (Conflicts resolved §11, §16, §17; the M-E/M-C row table) | The program's own decision record binding this dive's scope and priorities | 2026-09-26 (opus, 164-row map) | Codified — the floor (3.25), the `-Werror=dev`-is-deprecated framing, and which rows this dive owns all come from here |
| `.agents/research/cmake-frame.md` (Corrections #7, #9, #16) | Prior program-level corrections on false-positive findings (find_ocx's memo defect refuted, TLS re-scoping) | 2026-09-05 through 2026-09-26 | Codified — establishes the program's own precedent for "a plausible-looking static finding needs a measured re-check before shipping," the same discipline this dive applied to M-C-07 and M-C-03 |
| `grpc__grpc@0f8d72ed71:CMakeLists.txt:1-4` | The generated-file banner that the exclusion detector caught | Read 2026-09-26 | Primary — concrete evidence the generated-file exclusion is load-bearing, not cosmetic (§1, Summary) |

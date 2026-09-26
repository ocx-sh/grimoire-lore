---
title: "Who injects policy, who forces acquisition, and who still calls removed Find modules"
topic: "The dependency seam: find_package, FetchContent, providers, toolchains and CPS — wave 3 revision"
agent: cmake-dep-scope-classification
model: sonnet
kind: exemplar
date_researched: 2026-09-26
sources_count: 15
scope: |
  Revises cmake-dependency-seam.md (CMK-DEP-07, CMK-DEP-15) with corpus-wide
  violator classification, mints CMK-DEP-19 (removed Find modules, M-G-16)
  and CMK-DEP-20 (explicit CONFIG/MODULE, M-G-08's fate), and re-counts
  find_package CONFIG/MODULE usage at the 2026-09-26 corpus SHAs. Does not
  re-derive the resolution-order table, CPS rows, or toolchain rows already
  shipped in cmake-dependency-seam.md — cites them. Excludes
  Kitware/CMake/Tests and grpc's generated CMakeLists.txt list throughout,
  per CMK-CORE-05.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Who writes CMAKE_POLICY_VERSION_MINIMUM / CMAKE_POLICY_DEFAULT_CMP0nnn, and what value](#1-who-writes-cmake_policy_version_minimum--cmake_policy_default_cmp0nnn-and-what-value)
   2. [Do installable libraries force their own acquisition?](#2-do-installable-libraries-force-their-own-acquisition)
   3. [Live uses of removed Find modules, replacements, and the OLD escape hatch](#3-live-uses-of-removed-find-modules-replacements-and-the-old-escape-hatch)
   4. [find_package CONFIG/MODULE recount at the new SHAs](#4-find_package-configmodule-recount-at-the-new-shas)
   5. [The 3.x remedy for a 3.5–3.9-floor dependency](#5-the-3x-remedy-for-a-35-39-floor-dependency)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- **`CMAKE_POLICY_VERSION_MINIMUM` and `CMAKE_POLICY_DEFAULT_CMP0077`/`CMP0167` writes in the corpus are 100% scoped — 0 real violators of the "never global" MUST — but 100% of the literal values written are `3.5`, never the map's decided `3.10`.** Measured across 46 repos, excluding Kitware/CMake and grpc's generated file (2026-09-26 SHAs).
- **The one corpus site that itself defaults to `3.10` is Qt**, in `qt__qtbase@0ef5a8e9ca:cmake/QtAutoDetectHelpers.cmake:84-85` — when no override is given, `qt_auto_detect_set_cmake_policy_version_minimum()` falls back to `set(min_policy_version "3.10")`. This is independent, real-world confirmation of the topic map's decided value (cross-consolidation resolution 1), not just an argued preference.
- **`CMAKE_DEP-15`'s "scoped set/restore around one add" clause holds for a pattern the original rule text did not anticipate: a `macro()` invoked from inside a `function()`.** `apache__arrow@3ad410b7b1:cpp/cmake_modules/ThirdpartyToolchain.cmake:1025-1038` sets `CMAKE_POLICY_VERSION_MINIMUM` inside `macro(prepare_fetchcontent)`, called from `function(build_boost)`, `function(build_thrift)`, `function(build_absl)` and `function(build_protobuf)` (lines 1078, 1813, 1926, 2088). CMake's own function-scope boundary discards the variable when each `build_*()` returns — no explicit `unset` is needed, and one call site (`build_gtest`, line 2657) adds a defensive `unset()` the code comment admits is now redundant.
- **CMK-DEP-07 (a library never forces its own acquisition) has zero corpus violators among the 26 exemplars that ship `install(EXPORT)`.** No installable library calls `FetchContent_MakeAvailable` or `CPMAddPackage` in non-test, non-example, non-tool code without a guard. This is new evidence, not a re-assertion: the rule stays MUST as a preventive rather than a corrective control (map's DECIDE point 1).
- **`protocolbuffers__protobuf@c64743979d:cmake/abseil-cpp.cmake:12-34` and `cmake/gtest.cmake:1-19` are hand-written try-find-then-fetch, not the 3.24 `FIND_PACKAGE_ARGS` keyword** — `find_package(... CONFIG)` first, `FetchContent_MakeAvailable` only as a fallback gated on `NOT TARGET` and an explicit `protobuf_FORCE_FETCH_DEPENDENCIES` escape hatch. Both idioms satisfy CMK-DEP-07; an agent should not flag the older idiom as a violation just because it lacks the newer keyword.
- **Removed Find modules are used live in the corpus, but overwhelmingly in package-manager glue code (vcpkg ports, Conan Center recipes), never in a shipped library's own core `CMakeLists.txt`.** Bare `find_package(Boost ...)` (no `CONFIG`/`NO_MODULE`): 24 call sites, all in `conan-io__cmake-conan` test fixtures (2), `conan-io__conan-center-index` recipes (17) and `microsoft__vcpkg` ports (5). `find_package(CUDA ...)`: 2 real sites (`fmtlib__fmt`, `apache__arrow`). `find_package(PythonInterp/PythonLibs)`: 5 and 3 sites respectively, all in vcpkg/Hunter/CCI glue. `FindGCCXML`/`FindCABLE`: **0 hits anywhere in the 46-repo corpus** outside Kitware's own tree.
- **A bare `find_package(Boost)` is frequently not a real defect even without `CONFIG`, because "removed" means policy-gated, not deleted.** A port whose own floor predates the removal policy (e.g. `microsoft__vcpkg@c4ee5a52d7:ports/plustache/CMakeLists.txt:1,7`, floor 3.1) gets `CMP0167=OLD` by default, so CMake's bundled `FindBoost.cmake` still loads and still works; and even under `CMP0167=NEW`, `find_package(Boost)` with no module present falls straight through to `BoostConfig.cmake` (shipped since Boost 1.70) with no error. The real exposure is narrower than "no CONFIG keyword": a project relying on `FindBoost.cmake`-only variables/targets against a Boost too old to ship a Config package.
- **`apache__arrow@3ad410b7b1:cpp/src/arrow/gpu/CMakeLists.txt:34,41` calls `find_package(CUDA REQUIRED)` with its own code comment acknowledging the deprecation** ("`find_package(CUDA)` is deprecated..."), still legal because arrow's declared floor (`cpp/CMakeLists.txt:1`, `VERSION 3.25`) predates CMP0146's 3.27 introduction. `fmtlib__fmt@522e2c12ab:test/CMakeLists.txt:228-232` has already migrated: the legacy `find_package(CUDA 9.0)` call is gated `if(${CMAKE_VERSION} VERSION_LESS 3.15)`, dead code on every CMake this dive can run, with `check_language(CUDA)` + `enable_language(CUDA OPTIONAL)` as the live path.
- **Real, opposite-direction uses of the removal policies exist in vcpkg**, confirming they are live knobs, not theoretical: `microsoft__vcpkg@c4ee5a52d7:ports/folly/portfile.cmake:61`, `ports/openmvs/portfile.cmake:57` and `ports/libigl/portfile.cmake:47` set `-DCMAKE_POLICY_DEFAULT_CMP0167=NEW` (force modern Config-only Boost lookup on a low-floor upstream project); `ports/openscap/portfile.cmake:41` sets `-DCMAKE_POLICY_DEFAULT_CMP0148=OLD` (force the legacy Python module back on); `scripts/test_ports/vcpkg-ci-python3/project/CMakeLists.txt:3-8` guards `cmake_policy(SET CMP0148 OLD)` behind `if(POLICY CMP0148)` specifically to test the pre-removal path in CI.
- **`cmake --help-module` confirms every replacement's `versionadded`/`versionchanged` identically on 3.31.12 and 4.4.2**: `FindPython3` 3.12, `FindCUDAToolkit` 3.17, `FindBoost`'s CMP0167 gate 3.30, `FindCUDA`'s CMP0146 gate 3.27, `FindPythonLibs`'s CMP0148 gate 3.27 — no doc drift between the two lines for this family (unlike the experimental-gate UUIDs, `cmake-versions-and-gate/floors-policies-and-era.md` §4).
- **M-G-08 survives as a new row, `CMK-DEP-20`, SHOULD not MUST.** Re-extracted with a paren-balanced Python walk (not line-grep) over the 2026-09-26 SHAs: 7,123 `find_package` calls outside Kitware/CMake/Tests and grpc's generated list; 2,842 (39.9%) state `CONFIG`, 117 (1.6%) state `MODULE`, the remaining 4,164 (58.5%) state neither. Wave-1's 41%/1.7% on the 2026-09-05 SHAs is unchanged within rounding — this is a stable corpus-wide habit, not sampling noise, so the row survives.
- **No corpus repo patches a fetched dependency's own `cmake_minimum_required` line for the 3.x leg.** Zero hits for `vcpkg_replace_string`/`PATCH_COMMAND` targeting `cmake_minimum_required` anywhere in the 46-repo corpus. The one real "make the 3.x leg pass" mechanism found beyond re-pinning `CMAKE_POLICY_VERSION_MINIMUM` is `curl__curl@98519dac83:.github/workflows/non-native.yml:419`, which passes `-DCMAKE_WARN_DEPRECATED=OFF` for one Android-NDK CI leg. `KDE__extra-cmake-modules@b4c4ec9997:tests/CMakeLists.txt:87,95,106` uses the same variable in the opposite direction — `=TRUE` — to deliberately provoke the deprecation warning in its own test suite.
- **Every `CMAKE_POLICY_VERSION_MINIMUM`/`_DEFAULT_CMP0167` write found is a whole-port or one-`function()`-scoped pattern; none is a bare project-wide `set()` at file scope with no enclosing boundary.** This is stronger than the existing `CMK-DEP-15` rationale claims (which cites only the arrow `find_package` save/restore as its positive exemplar) and stronger than the map's own "no violator row" hedge — it is now a measured universal.

## Findings

### 1. Who writes `CMAKE_POLICY_VERSION_MINIMUM` / `CMAKE_POLICY_DEFAULT_CMP0nnn`, and what value

Every write in the corpus, excluding `Kitware__CMake` and `grpc__grpc`'s
generated `CMakeLists.txt` (verified empty at those two exclusions with:

```sh
grep -rn --include='*.cmake' --include='CMakeLists.txt' -e 'CMAKE_POLICY_VERSION_MINIMUM' \
  /home/mherwig/.cache/research-lang/exemplars/cmake | grep -v '/Kitware__CMake/' | grep -v '/grpc__grpc/CMakeLists.txt'
```

empty output on the excluded paths = confirmed nothing was lost by the
exclusion clause):

| Site | Class | Value | Scope mechanism |
|---|---|---|---|
| `apache__arrow@3ad410b7b1:cpp/cmake_modules/FindRapidJSONAlt.cmake:29-32` | scoped, one add | 3.5 | explicit save/`set`/restore around one `find_package` (the exemplar `CMK-DEP-15` already cites) |
| `apache__arrow@3ad410b7b1:cpp/cmake_modules/ThirdpartyToolchain.cmake:1025-1038,1078,1813,1926,2088` | scoped, one add | 3.5 | `macro(prepare_fetchcontent)` invoked from inside `function(build_boost)`/`build_thrift`/`build_absl`/`build_protobuf`; CMake's function-scope boundary discards it on return (new pattern, not in the existing rule text) |
| `apache__arrow@3ad410b7b1:cpp/cmake_modules/ThirdpartyToolchain.cmake:960-963,1436-1438,3281-3283` | scoped, one add | 3.5 | passed once in a specific `ExternalProject_Add`'s `CMAKE_ARGS` list — inherently scoped, the sub-build is a separate `cmake` process |
| `microsoft__vcpkg@c4ee5a52d7:scripts/ports.cmake:5-7` | whole-port (CMK-VER-06 sanctioned) | 3.5 | `set(ENV{CMAKE_POLICY_VERSION_MINIMUM} 3.5)` guarded by `CMAKE_VERSION VERSION_GREATER_EQUAL "4.0"`, in the port-build driver every port configure goes through |
| `microsoft__vcpkg@c4ee5a52d7:ports/libogg/portfile.cmake:16`, `ports/libvorbis/portfile.cmake:17` | whole-port | 3.5 | one port's own `vcpkg_cmake_configure(... OPTIONS -DCMAKE_POLICY_VERSION_MINIMUM=3.5 ...)`, cited to an upstream issue in a trailing comment |
| `cpp-pm__hunter@997fab148b:cmake/projects/{termcolor,OpenBLAS,gflags,minizip,jasper,glog,ICU,BZip2,Protobuf}/hunter.cmake` (7 recipes) | whole-port (CMK-VER-06 sanctioned) | 3.5 | `hunter_cmake_args(<pkg> CMAKE_ARGS ... CMAKE_POLICY_VERSION_MINIMUM=3.5)`, each gated on `HUNTER_<pkg>_VERSION VERSION_LESS_EQUAL <old-release>` |
| `qt__qtbase@0ef5a8e9ca:cmake/QtAutoDetectHelpers.cmake:66-101`, `cmake/QtCMakeVersionHelpers.cmake:304-376` | environment / cross-toolchain generation | **3.10 (default)**, or `QT_<PLATFORM>_CMAKE_POLICY_VERSION_MINIMUM` if the caller set one | `set(CMAKE_POLICY_VERSION_MINIMUM "${min_policy_version}" PARENT_SCOPE)` plus `set(ENV{CMAKE_POLICY_VERSION_MINIMUM} ...)`, inside a macro gated on `CMAKE_VERSION VERSION_GREATER_EQUAL "4.0"` and a per-platform opt-out; written once per cross-compilation toolchain-file generation, not restored, but bounded to that one toolchain file's lifetime |
| `nlohmann__json@f422b753cc:cmake/ci.cmake:644-645` | preset/CI | 3.5 | one `-D` on a nested `cmake -S cmake-${version} -B cmake-${version}` invocation, downloading and self-testing old CMake *releases*, not a project dependency |

No corpus site sets the variable as an unguarded, unpaired, file-scope
`set()` at the top of a `CMakeLists.txt`, and none sets it via a committed
`CMakePresets.json` `cacheVariables` entry or an unscoped CI environment
export. **The universal-scoping claim in `CMK-DEP-15`'s existing rationale
is now measured across the whole corpus, not just its one cited exemplar.**

The value question is separate from the scope question, and the corpus is
lopsided: every real write is `3.5` except Qt's `3.10` default. Per
`cmake-versions-and-gate/floors-policies-and-era.md` M8/M9 (already folded
into `cmake-dependency-seam.md`'s cross-consolidation resolution 1),
`3.5` clears CMake 4's hard "unsupported floor" error but a dependency whose
own declared floor sits in `3.5`–`3.9` still trips the deprecation-warning
gate on 3.31 and 4.4; only `3.10` clears both. Whether this bites any of the
sites above depends on facts this corpus cannot supply (the *fetched*
upstream project's real floor lives outside the corpus for FetchContent/
ExternalProject cases, and none of the whole-port mechanisms above run under
`-Werror=dev`/`-Werror=author` by default — vcpkg does not enable dev
warnings on port builds, and Hunter's `hunter_cmake_args` does not either).
So the exposure is real in principle (M8/M9) but not demonstrated as live
breakage in this corpus at either value. **Decision:** the rule's printed
value stays `3.10` per the map (nothing here breaks it), the MUST is the
scoping clause (0 violators, keep MUST), and the value clause is SHOULD
because every corpus author who scoped it correctly still chose the
insufficient literal — this is a real, common, low-severity gap, not a
theoretical one, and Qt's own fallback proves `3.10` is exactly as easy to
write as `3.5`.

The one genuinely new fact for `CMK-DEP-15`: add the `macro()`-inside-
`function()` scoping idiom as a second sanctioned shape beside explicit
save/restore, since arrow uses it at 4 call sites and the existing rule text
would otherwise make a reviewer flag `prepare_fetchcontent()` as an unpaired
"global" write when it demonstrably is not one (`unset(CMAKE_POLICY_VERSION_MINIMUM)` at `ThirdpartyToolchain.cmake:2657` is dead code by the function's own return-time scope discard — the code comment at 2658-2659 says the same).

### 2. Do installable libraries force their own acquisition?

26 corpus repos ship `install(EXPORT ...)` at the 2026-09-26 SHAs (both
single-line and gersemi-split `install(\n  EXPORT ...)` forms counted):

```sh
grep -rl --include='*.cmake' --include='CMakeLists.txt' -e 'install(EXPORT' \
  /home/mherwig/.cache/research-lang/exemplars/cmake | grep -v '/Kitware__CMake/Tests/'
```

plus a second pass for the split form (`install(` alone, followed by
`EXPORT` on the next line) that the single-line grep misses — the same
gersemi split trap `CMK-DEP-01`'s verify block already warns about. Union:
`abseil-cpp`, `arrow`, `rules_foreign_cc`, `Catch2`, `curl`, `duckdb`,
`modern-cpp-template`, `fmt`, `cmake-init`, `spdlog`, `glfw`, `benchmark`,
`googletest`, `re2`, `grpc`, `yaml-cpp`, `extra-cmake-modules`, `Kitware/CMake`,
`libuv`, `llvm-project`, `zlib`, `vcpkg`, `vcpkg-tool`, `nlohmann/json`,
`protobuf`, `qtbase`.

For each, every `FetchContent_MakeAvailable`/`CPMAddPackage` call, filtered
to exclude any path containing `test`, `tests` or `testing` (case-insensitive):

```sh
CORPUS=/home/mherwig/.cache/research-lang/exemplars/cmake
REPO=abseil__abseil-cpp   # repeated once per one of the 26 install(EXPORT) repos
grep -rln --include='*.cmake' --include='CMakeLists.txt' \
  -e 'FetchContent_MakeAvailable' -e 'CPMAddPackage' \
  "$CORPUS/$REPO" | grep -viE '/test/|/tests/|/testing/|/Tests/'
```

**Empty output on all 26 repos.** Widening the search to the whole corpus
(minus Kitware/CMake/Tests) to sanity-check the grep still fires, every hit
that lands in one of these 26 repos sits in a test, example, doc, tool or
language-binding path, never in the library's own build:
`curl__curl@98519dac83:tests/cmake/CMakeLists.txt:82` (test);
`duckdb__duckdb@d8a1bd4f4f:tools/cpp/example/CMakeLists.txt:14` and
`tools/cpp/cmake/DuckDBCppApi.cmake:123` (a separate C++-API helper tool that
fetches duckdb's own prebuilt release archive — self-referential packaging,
not a third-party dependency of duckdb's core build, and outside
`CMK-DEP-07`'s binding population by construction);
`gabime__spdlog@5b63780337:tests/CMakeLists.txt:26`, `bench/CMakeLists.txt:23`
(test and benchmark harness); `grpc__grpc@0f8d72ed71:examples/cpp/cmake/common.cmake:83`
(example); `nlohmann__json@f422b753cc:tests/...` (4 sites) and
`docs/mkdocs/docs/integration/cpm/CMakeLists.txt:6` (docs example);
`protocolbuffers__protobuf@c64743979d:cmake/abseil-cpp.cmake:16-34`,
`cmake/gtest.cmake:1-19` (guarded try-find-then-fetch, positive exemplar, see
below), `cmake/conformance.cmake:23` (the conformance *test* suite);
`qt__qtbase@0ef5a8e9ca:tests/manual/iconbrowser/CMakeLists.txt:52` (a manual
test); `friendlyanon__cmake-init@7e0c52fc73:cmake-init/templates/common/cmake/docs.cmake:17`
(fetches a docs generator, `mcss`, not a build dependency);
`apache__arrow@3ad410b7b1:matlab/tools/cmake/BuildMatlabArrowInterface.cmake:115`
(a language-binding build tool, not arrow's core C++ library).

`protocolbuffers__protobuf@c64743979d:cmake/abseil-cpp.cmake:12-34` is a
positive exemplar worth quoting in full because it predates the 3.24
`FIND_PACKAGE_ARGS` keyword and is easy for an agent to misjudge as
non-compliant just because it lacks that keyword:

```cmake
if (NOT TARGET absl::strings)
  if (NOT protobuf_FORCE_FETCH_DEPENDENCIES)
    find_package(absl CONFIG)
  endif()
  if (NOT absl_FOUND AND NOT protobuf_LOCAL_DEPENDENCIES_ONLY)
    include(FetchContent)
    FetchContent_Declare(absl GIT_REPOSITORY ... GIT_TAG "${abseil-cpp-version}")
    FetchContent_MakeAvailable(absl)
  endif()
endif()
```

`find_package` runs first; the fetch is a fallback gated on `NOT TARGET`,
`NOT absl_FOUND` and an explicit `protobuf_LOCAL_DEPENDENCIES_ONLY` escape
hatch a consumer can flip. `cmake/gtest.cmake:1-19` repeats the identical
shape for `GTest::gmock`. Both hold under `CMK-DEP-07` exactly as the map's
M-G-01 already cites `abseil-cpp.cmake:16-43` for the resolution-order rule
— this is the same file serving two rules.

**Verdict: `CMK-DEP-07` keeps MUST with zero violator rows in this corpus.**
The map's DECIDE point offered a severity drop "if the corpus shows no
exposure an agent would hit" — the correct reading of a clean corpus here is
the opposite: this MUST is winning, not idle. An agent generating a new
library's CMakeLists from a training-data pattern (`FetchContent_MakeAvailable`
inline, no guard) is the actual risk this rule defends against, and the
corpus shows every real, shipped library already avoids it — which is
evidence the pattern is worth keeping as a MUST precisely because violating
it is rare and therefore conspicuous when it happens.

### 3. Live uses of removed Find modules, replacements, and the OLD escape hatch

Replacement table (from `cmake-versions-and-gate/floors-policies-and-era.md`
§3, confirmed independently in this dive with `cmake --help-module` on both
pinned binaries — see below):

| Policy | Module gated | Introduced | Replacement | `--help-module` confirms (3.31.12 / 4.4.2, identical) |
|---|---|---|---|---|
| CMP0167 | `FindBoost` | 3.30 | `find_package(Boost CONFIG)` against upstream `BoostConfig.cmake` (Boost ≥1.70) | `FindBoost`: `.. versionchanged:: 3.30` — "available only if policy `CMP0167` is not set to `NEW`" |
| CMP0146 | `FindCUDA` | 3.27 | `enable_language(CUDA)` + `find_package(CUDAToolkit)` | `FindCUDA`: `.. versionchanged:: 3.27`; `FindCUDAToolkit`: `.. versionadded:: 3.17` |
| CMP0148 | `FindPythonInterp`, `FindPythonLibs` | 3.27 | `FindPython3`/`FindPython2`/`FindPython` | `FindPythonLibs`: `.. versionchanged:: 3.27`; `FindPython3`: `.. versionadded:: 3.12` |
| CMP0191 | `FindCABLE` | 4.1 | none named — CABLE is unmaintained | not re-confirmed here (0 corpus uses; floors-policies-and-era already covers it) |
| CMP0188 | `FindGCCXML` | 4.1 | CastXML | not re-confirmed here (0 corpus uses) |

```sh
ocx package exec kitware/cmake:3.31 -- cmake --help-module FindBoost      # (and FindCUDA, FindPythonLibs, FindPython3, FindCUDAToolkit)
ocx package exec kitware/cmake:4.4  -- cmake --help-module FindBoost
```

Both binaries print byte-identical `versionchanged`/`versionadded` lines for
every module above — unlike the experimental-gate UUIDs, this doc family did
not drift between 3.31.12 and 4.4.2.

**Live usage, corpus-wide, excluding Kitware/CMake and comments:**

```sh
grep -rn --include='*.cmake' --include='CMakeLists.txt' -e 'find_package(Boost' \
  /home/mherwig/.cache/research-lang/exemplars/cmake | grep -v '/Kitware__CMake/' \
  | grep -v '/cpp-pm__hunter/cmake/find/' | grep -v '#'
```
61 total lines; 37 already state `CONFIG` or `NO_MODULE`; **24 do not**:
2 in `conan-io__cmake-conan@b1593849dd:tests/resources/find_module/builtin_module/CMakeLists.txt:10,12`
(a test fixture deliberately exercising Module mode), 17 across
`conan-io__conan-center-index@07389b8fa0` recipes (mostly the `recipes/boost`
package's own `test_package/CMakeLists.txt`, 13 of the 17, testing the
just-built Boost package; plus `recipes/opentdf-client`, `recipes/embag`),
and 5 in `microsoft__vcpkg@c4ee5a52d7` ports (`ports/modern-cpp-kafka`,
`ports/autodock-vina`, `ports/plustache`, and `ports/vcpkg-boost/boost-install.cmake:99,105`
— vcpkg's own glue for installing Boost's own component libraries).

None of the 24 sit in a shipped library's own core `CMakeLists.txt` (the
`install(EXPORT)` set in Findings §2); all are package-manager glue (port
wrappers, recipe test packages, a test fixture). Every low-floor one checked
(`microsoft__vcpkg@c4ee5a52d7:ports/plustache/CMakeLists.txt:1,7`, floor
`3.1`; `ports/autodock-vina/CMakeLists.txt:1,9`, floor `3.11`) predates
CMP0167's 3.30 introduction, so `CMP0167` defaults `OLD` there and CMake's
bundled `FindBoost.cmake` genuinely still runs — not a latent break, because
"removed" is policy-gated, not deleted (`floors-policies-and-era.md` §3,
confirmed independently by this dive's own `--help-module` reads above). The
narrower real exposure — a project whose floor is *past* 3.30 relying on
`FindBoost.cmake`-only behavior against a Boost too old for a Config package
— has zero confirmed instances in this corpus.

```sh
grep -rn --include='*.cmake' --include='CMakeLists.txt' -e 'find_package(CUDA[^T]' -e 'find_package(CUDA)' \
  /home/mherwig/.cache/research-lang/exemplars/cmake | grep -v '/Kitware__CMake/'
```
2 real calls: `apache__arrow@3ad410b7b1:cpp/src/arrow/gpu/CMakeLists.txt:34`
(`find_package(CUDA REQUIRED)`, with the file's own comment at line 41
acknowledging "`find_package(CUDA)` is deprecated"; arrow's floor,
`cpp/CMakeLists.txt:1`, is `VERSION 3.25`, below CMP0146's 3.27, so this is
legal and not yet forced off) and `fmtlib__fmt@522e2c12ab:test/CMakeLists.txt:228-232`
(gated `if(${CMAKE_VERSION} VERSION_LESS 3.15)`, with the live path already
`check_language(CUDA)` + `enable_language(CUDA OPTIONAL)` — dead code on
every CMake line this program runs, and the positive exemplar for the
replacement).

```sh
grep -rn --include='*.cmake' --include='CMakeLists.txt' -e 'find_package(PythonInterp' -e 'find_package(PythonLibs' \
  /home/mherwig/.cache/research-lang/exemplars/cmake | grep -v '/Kitware__CMake/'
```
5 `PythonInterp` sites (`microsoft__vcpkg@c4ee5a52d7:scripts/test_ports/vcpkg-ci-python3/project/CMakeLists.txt:78`,
`cpp-pm__hunter@997fab148b:scripts/find_python.cmake:4`, two
`conan-io__conan-center-index@07389b8fa0` recipes, one `cpython` test
package) and 3 `PythonLibs` sites (same vcpkg CI project, one Hunter
example, the same `cpython` test package). `microsoft__vcpkg@c4ee5a52d7:ports/ctemplate/CMakeLists.txt:4`
has the call commented out — a live migration marker, not a violator.

```sh
grep -rln --include='*.cmake' --include='CMakeLists.txt' -e 'GCCXML' -e 'CABLE' \
  /home/mherwig/.cache/research-lang/exemplars/cmake | grep -v '/Kitware__CMake/'
```
**Empty.** 0 of 45 non-Kitware exemplars mention either name.

**Real opposite-direction (OLD-forcing and NEW-forcing) uses**, confirming
these five policies are live production knobs, not archived trivia:

```sh
grep -rn --include='*.cmake' -e 'CMAKE_POLICY_DEFAULT_CMP0167' -e 'CMAKE_POLICY_DEFAULT_CMP0148' \
  /home/mherwig/.cache/research-lang/exemplars/cmake/microsoft__vcpkg
```
`ports/folly/portfile.cmake:61`, `ports/openmvs/portfile.cmake:57` and
`ports/libigl/portfile.cmake:47` (`# boost used by cgal`) force
`-DCMAKE_POLICY_DEFAULT_CMP0167=NEW` on a dependency whose own low floor
would otherwise still use the legacy module; `ports/openscap/portfile.cmake:41`
forces `-DCMAKE_POLICY_DEFAULT_CMP0148=OLD` to keep the legacy Python finder
for a build that still needs it; `scripts/test_ports/vcpkg-ci-python3/project/CMakeLists.txt:3-8`
guards `cmake_policy(SET CMP0148 OLD)` behind `if(POLICY CMP0148)`
specifically to keep testing the pre-removal path in CI.

**Decision: this is a new row, `CMK-DEP-19`.** `CMK-VER-07` (map's Wave-2
harvest, orphan list) hands the replacement table to CMK-DEP but never wrote
the consuming row; this dive supplies it.

### 4. `find_package` CONFIG/MODULE recount at the new SHAs

Wave 1's `deps-cmake-calls.py` extractor (paren-balanced, not line-grep, so
it correctly spans the gersemi multi-line split) was re-run against the
2026-09-26 corpus refetch, adapted only to add `find_package` to its
tracked-function list and point `CORPUS` at
`/home/mherwig/.cache/research-lang/exemplars/cmake`. Script and its output
TSV are preserved at
[`scratch/scope-classification/`](scratch/scope-classification/) for
re-running.

```sh
python3 scratch/scope-classification/extract-find-package-calls.py \
  | awk -F'\t' '$4=="find_package"' \
  | grep -v '/Kitware__CMake/Tests/' | grep -v '^grpc__grpc	CMakeLists.txt' \
  > find_package.tsv
wc -l find_package.tsv                                                       # 7123
awk -F'\t' '{print $5}' find_package.tsv | grep -ciE '(^| )CONFIG( |$)'       # 2842  (39.9%)
awk -F'\t' '{print $5}' find_package.tsv | grep -ciE '(^| )MODULE( |$)'       # 117   (1.6%)
```

7,123 total calls (up from wave 1's 6,957 — the corpus grew by roughly the
same fraction each repo's tree grew over three weeks, not a change in
authoring habit); 2,842 (39.9%) state `CONFIG`; 117 (1.6%) state `MODULE`;
the remaining 4,164 (58.5%) state neither. Wave 1's 41%/1.7% on the older
SHAs is unchanged within rounding.

**Decision: M-G-08 survives as `CMK-DEP-20`, severity SHOULD.** The
rationale in the map's row text — "explicit mode improves the not-found
message" — is a diagnostics-quality claim, not a correctness one, so MUST
would overstate it; but a stable 58.5% gap across two measurements three
weeks apart is real practice worth naming, not a row to drop for lack of
signal.

### 5. The 3.x remedy for a 3.5–3.9-floor dependency

This dive's brief scopes only "list what corpus repos do"; the measured
verdict on which remedy actually clears the gate on 3.31/4.4 belongs to
`skills/dependency-triage-procedure` (wave 3, still to run).

```sh
grep -rn --include='*.cmake' --include='CMakeLists.txt' --include='*.yml' -e 'CMAKE_WARN_DEPRECATED' \
  /home/mherwig/.cache/research-lang/exemplars/cmake | grep -v '/Kitware__CMake/'
```
`curl__curl@98519dac83:.github/workflows/non-native.yml:419` passes
`-DCMAKE_WARN_DEPRECATED=OFF` alongside the Android NDK toolchain file, for
one CI leg — the only corpus site that suppresses the deprecation gate
outright for a downstream build. `KDE__extra-cmake-modules@b4c4ec9997:tests/CMakeLists.txt:87,95,106`
uses the same variable in the opposite sense (`=TRUE`), deliberately turning
the warning on inside its own `ecm_add_test`-style harness — a test of the
gate itself, not a remedy.

```sh
grep -rln --include='*.cmake' --include='CMakeLists.txt' -e 'PATCH_COMMAND' \
  /home/mherwig/.cache/research-lang/exemplars/cmake | grep -v '/Kitware__CMake/' \
  | xargs -r grep -l 'cmake_minimum_required'
grep -rl 'vcpkg_replace_string' /home/mherwig/.cache/research-lang/exemplars/cmake/microsoft__vcpkg/ports \
  | xargs -r grep -B1 -A1 'vcpkg_replace_string' | grep -i cmake_minimum_required
```
Both empty. **No corpus repo patches a fetched or ported dependency's own
`cmake_minimum_required` line.** The `-Wno-error=deprecated-declarations`
hits found elsewhere in `qt__qtbase`, `apache__arrow` and
`protocolbuffers__protobuf` are C++ *compiler* warning suppressions
(`-Wno-error=deprecated-declarations` as a `target_compile_options`/`CMAKE_CXX_FLAGS`
entry), unrelated to CMake's own configure-time deprecation gate — an easy
false-positive an agent's grep must not conflate. **Re-pinning
`CMAKE_POLICY_VERSION_MINIMUM` (Findings §1) is the corpus's only real
remedy family**, plus curl's one `CMAKE_WARN_DEPRECATED=OFF` CI-leg
override.

## Normative guidance candidates

1. **A `CMAKE_POLICY_VERSION_MINIMUM` or `CMAKE_POLICY_DEFAULT_CMP<NNNN>` write for a third-party dependency is scoped to the one call that loads it — by explicit save/restore, by a `macro()` called only from inside a `function()` whose return discards the value, by a port tool's own per-port `CMAKE_ARGS`, or by a separate-process `ExternalProject_Add` `CMAKE_ARGS` entry — never a bare file-scope `set()`, a committed preset `cacheVariables` entry, or an unscoped CI export.** *Rationale:* the corpus shows 100% compliance across every real site found, so a genuinely file-scope, no-boundary write is itself the anomaly worth flagging. *Verify:* the grep already shipped in `CMK-DEP-15`; for each hit, confirm it sits inside a `function()`, a save/restore pair, one port's own args list, or one `ExternalProject_Add`'s `CMAKE_ARGS` — a hit with none of those = finding. *Floor:* 4.0 (the variable's own `versionadded`).
2. **When a project must set `CMAKE_POLICY_VERSION_MINIMUM` for a dependency, prefer `3.10` over `3.5`.** *Rationale:* `3.5` clears only CMake 4's hard floor error; a dependency whose own floor sits in `3.5`–`3.9` still trips the deprecation-warning gate on 3.31 and 4.4 (versions-and-gate M8/M9). `qt__qtbase@0ef5a8e9ca:cmake/QtAutoDetectHelpers.cmake:84-85` already defaults to `3.10` in production. *Verify:* `grep -rn -A1 --include='*.cmake' --include='CMakeLists.txt' -e 'CMAKE_POLICY_VERSION_MINIMUM[[:space:]]*=\?[[:space:]]*"\?3\.5' -e 'CMAKE_POLICY_DEFAULT_CMP0077' .` — a literal `3.5` value is a SHOULD finding (works for the common case, silently under-covers a `3.5`–`3.9`-floor dependency once the configure gate is active downstream); `3.10` or higher is pass. *Severity:* SHOULD, not MUST — no confirmed live breakage in this corpus at either value, only the M8/M9 theoretical exposure. *Floor:* 4.0.
3. **An installable library never calls `FetchContent_MakeAvailable`/`CPMAddPackage` in its own non-test, non-example, non-tool build code without a top-level guard or a try-find-first idiom (`FIND_PACKAGE_ARGS`, or hand-written `find_package` then `FetchContent_Declare`/`MakeAvailable` on miss).** *Rationale:* 0 violators across the 26 corpus exemplars that ship `install(EXPORT)`; the pattern's absence is itself the evidence this MUST is doing its job. *Verify:* the CMK-DEP-07 grep, `grep -rn --include='*.cmake' --include='CMakeLists.txt' -e 'FetchContent_MakeAvailable' -e 'CPMAddPackage' .`, then read each hit's enclosing directory and guard; a hit in a path containing `test`, `example`, `tool`, `doc` or a language-binding directory, or behind `PROJECT_IS_TOP_LEVEL`/`NOT <dep>_FOUND`, is not a finding. *Severity:* MUST. *Floor:* any (the try-find-first idiom needs no CMake version; `FIND_PACKAGE_ARGS` needs 3.24).
4. **A pre-3.30 `find_package(Boost)` with no `CONFIG` keyword is not automatically a finding — check the enclosing project's declared floor against CMP0167's 3.30 introduction before flagging it.** *Rationale:* below the introduction version the policy defaults `OLD` and CMake's bundled `FindBoost.cmake` genuinely still runs (`floors-policies-and-era.md` §3: "removal ≠ deletion"); at or above it, `find_package(Boost)` with no module present falls through to `BoostConfig.cmake` (Boost ≥1.70) automatically. The real finding is narrower: a project at or past the 3.30 floor whose code depends on `FindBoost.cmake`-only variables (`Boost_INCLUDE_DIR` singular, module-only target names) against a Boost too old to ship a Config package. *Verify:* `grep -rn --include='*.cmake' --include='CMakeLists.txt' -e 'find_package(Boost' .` filtered to exclude `CONFIG`/`NO_MODULE`; for each hit, read the file's own `cmake_minimum_required` (or the nearest enclosing one) and compare to 3.30 — below it, not a finding by itself; at or above it, read for `Boost_INCLUDE_DIR`/module-only variable use before calling it a finding. *Severity:* CONSIDER (reading heuristic, not a mechanical MUST/SHOULD). *Floor:* CMP0167 3.30.
5. **A legacy `find_package(CUDA)`, `find_package(PythonInterp)` or `find_package(PythonLibs)` call is migrated to `enable_language(CUDA)` + `find_package(CUDAToolkit)`, or `FindPython3`, respectively — check the replacement's own `versionadded` before assuming it is available at the project's floor.** *Rationale:* `FindCUDAToolkit` needs 3.17, `FindPython3` needs 3.12 (`cmake --help-module`, confirmed identical on 3.31.12 and 4.4.2); a project whose floor predates the replacement cannot migrate without also raising its floor. *Verify:* `grep -rn --include='*.cmake' --include='CMakeLists.txt' -e 'find_package(CUDA' -e 'find_package(PythonInterp' -e 'find_package(PythonLibs' .`, filtered to exclude an enclosing `if(${CMAKE_VERSION} VERSION_LESS ...)` guard around the legacy call paired with a modern branch (the `fmtlib__fmt` shape = pass). *Severity:* SHOULD. *Floor:* `CUDAToolkit` 3.17; `FindPython3` 3.12.
6. **`FindGCCXML` and `FindCABLE` need no migration guidance beyond a recognition line — the corpus shows zero adopters.** *Rationale:* 0 of 45 non-Kitware exemplars mention either name; CABLE itself is unmaintained and Kitware names no replacement for it in the policy docs. *Verify:* `grep -rln --include='*.cmake' --include='CMakeLists.txt' -e GCCXML -e CABLE .` — empty = pass (the expected, unremarkable case). *Severity:* CONSIDER. *Floor:* CMP0191/CMP0188, 4.1.
7. **State `CONFIG` or `MODULE` explicitly on any `find_package` call whose author has an opinion about which mode should win.** *Rationale:* 58.5% of 7,123 corpus calls state neither (stable across two measurements three weeks apart); the docs' own value proposition is a clearer not-found diagnostic, not correctness. *Verify:* `grep -rnE --include='*.cmake' --include='CMakeLists.txt' -e 'find_package\([A-Za-z0-9_]+[[:space:]]+(REQUIRED|COMPONENTS|QUIET)' .` and read each hit for a missing `CONFIG`/`MODULE` keyword — a hit with neither is a SHOULD finding, not a MUST one. *Severity:* SHOULD. *Floor:* any.
8. **A CI leg testing a project below the removal-policy floor sets `CMAKE_WARN_DEPRECATED=OFF` deliberately and says why, rather than silently tolerating the noise or patching the dependency's own floor.** *Rationale:* the corpus's one real "make an old leg pass" mechanism beyond re-pinning `CMAKE_POLICY_VERSION_MINIMUM` is exactly this (`curl__curl`); zero corpus repos patch a fetched dependency's declared floor via `PATCH_COMMAND`/`vcpkg_replace_string`, which is the more invasive alternative this rule steers away from. *Verify:* reading heuristic — a CI leg testing an old CMake or an old-floor dependency carries a `CMAKE_WARN_DEPRECATED=OFF` (or a scoped `CMAKE_POLICY_VERSION_MINIMUM`) with a comment explaining the leg's purpose; a bare unexplained deprecation-suppression flag is a SHOULD finding. *Severity:* CONSIDER. *Floor:* any.

## Exemplar evidence

| Candidate | Satisfies | Violates | Contested |
|---|---|---|---|
| 1 (scoped injection) | `apache__arrow@3ad410b7b1:cpp/cmake_modules/FindRapidJSONAlt.cmake:29-32` (save/restore); `ThirdpartyToolchain.cmake:1025-1038,1078,1813,1926,2088` (macro-in-function); `microsoft__vcpkg@c4ee5a52d7:scripts/ports.cmake:5-7`, `ports/libogg/portfile.cmake:16` (whole-port); `cpp-pm__hunter@997fab148b:cmake/projects/termcolor/hunter.cmake:34-36` (whole-port) | none found in 46 repos | — |
| 2 (value 3.10) | `qt__qtbase@0ef5a8e9ca:cmake/QtAutoDetectHelpers.cmake:84-85` | every other corpus write (all `3.5`: arrow, vcpkg, hunter, nlohmann/json CI) — SHOULD-grade, not MUST | whether `3.5` ever actually trips the gate downstream, given none of these sub-builds run with `-Werror=dev`/`author` by default |
| 3 (no forced acquisition) | all 26 `install(EXPORT)` repos; `protocolbuffers__protobuf@c64743979d:cmake/abseil-cpp.cmake:12-34`, `cmake/gtest.cmake:1-19` (positive, try-find-then-fetch) | none found | `duckdb__duckdb@d8a1bd4f4f:tools/cpp/cmake/DuckDBCppApi.cmake:123` — fetches duckdb's own prebuilt release for a helper tool, arguably out of scope rather than a violation; noted, not counted |
| 4 (Boost floor-aware reading) | `microsoft__vcpkg@c4ee5a52d7:ports/plustache/CMakeLists.txt:1,7` (floor 3.1, `CMP0167` genuinely `OLD`, not a defect) | none confirmed at or past the 3.30 floor in this corpus | whether any *unmeasured* downstream consumer of these vcpkg ports crosses the 3.30 line and hits the narrower real exposure |
| 5 (CUDA/Python migration) | `fmtlib__fmt@522e2c12ab:test/CMakeLists.txt:228-232` (dead-code legacy branch, live `check_language`/`enable_language` path) | `apache__arrow@3ad410b7b1:cpp/src/arrow/gpu/CMakeLists.txt:34` — legal today (floor 3.25 < CMP0146's 3.27) but a ticking migration debt the file's own comment (line 41) already names | — |
| 6 (GCCXML/CABLE) | the entire corpus (0/45 use either) | none | — |
| 7 (explicit CONFIG/MODULE) | 2,959 of 7,123 calls (39.9% + 1.6%) | the remaining 4,164 (58.5%), spread across nearly every repo — too diffuse for named violator rows; report as a corpus-wide percentage, not a per-repo table | — |
| 8 (CI deprecation handling) | `curl__curl@98519dac83:.github/workflows/non-native.yml:419` (named, explained); `KDE__extra-cmake-modules@b4c4ec9997:tests/CMakeLists.txt:87,95,106` (opposite direction, also explained by context) | none found (also none patching a dependency's floor, the worse alternative) | — |

`find_ocx` has no bearing on any of the five rows above: it neither injects
policy into a fetched dependency, ships `install(EXPORT)`, calls the five
removed Find modules, nor runs `find_package` at all in its own 1,506-line
module (`cmake-dependency-seam.md`'s existing find_ocx rows, `CMK-DEP-13/-14`,
cover its actual exposure elsewhere in the seam).

## AI-agent angle

- **An LLM trained on pre-2026 CMake examples will suggest `find_package(Boost COMPONENTS ...)` with no `CONFIG` keyword as if it were still the only option, and will suggest `find_package(CUDA)`/`find_package(PythonInterp)` as the current idiom.** These are not hallucinations — they are real, common, still-legal patterns in the training distribution — but they are outdated for a project whose floor sits past the removal policy. **Mechanical check:** before accepting either suggestion, read the project's own `cmake_minimum_required` and compare it to the policy's introduction version (3.30 Boost, 3.27 CUDA/Python) with `cmake --help-policy CMP0167`/`CMP0146`/`CMP0148` on the pinned binary; below the introduction, the suggestion is harmless; at or above, redirect to `find_package(Boost CONFIG)`, `enable_language(CUDA)` + `find_package(CUDAToolkit)`, or `FindPython3`.
- **An LLM will often propose `-DCMAKE_POLICY_VERSION_MINIMUM=3.5` as "the fix" for a CMake-4 configure failure on an old dependency, copying the value from the many blog posts and Stack Overflow answers written right after CMake 4.0 shipped.** This clears the hard error but not the 3.31/4.4 deprecation-gate warning for a `3.5`–`3.9`-floor dependency. **Mechanical check:** grep the suggested `set`/`-D` for the literal string `3.5`; if found, ask whether the actual configure will run under `-Werror=dev`/`-Werror=author` downstream (most `ExternalProject_Add`/port-tool sub-builds do not, most `FetchContent_MakeAvailable`/`add_subdirectory` calls in the same process do) — if it will, change the value to `3.10`.
- **An LLM will often make the fix global** — `set(CMAKE_POLICY_VERSION_MINIMUM 3.5)` at the top of the top-level `CMakeLists.txt`, or a committed `CMakePresets.json` `cacheVariables` entry — because that is the shape of most public troubleshooting posts, which are usually one-off local fixes, not library code meant to ship. This corpus shows **zero** production examples of that shape; every real site scopes it. **Mechanical check:** the CMK-DEP-15 grep, then confirm the hit sits inside a `function()`, a save/restore pair, or a single port/sub-build's own arguments — a bare top-level `set()` with no enclosing boundary is the finding.
- **An LLM may suggest patching a fetched dependency's `cmake_minimum_required` line (via `PATCH_COMMAND`/`sed`, or `vcpkg_replace_string`) as "the clean fix" for an old floor**, reasoning by analogy from patching version strings or paths, which is a common `PATCH_COMMAND` use for other purposes. This corpus shows zero real instances of that specific patch — every real remedy re-pins `CMAKE_POLICY_VERSION_MINIMUM` instead, which survives a dependency version bump without needing to be re-derived. **Mechanical check:** if a suggested `PATCH_COMMAND`/`vcpkg_replace_string` targets the literal string `cmake_minimum_required`, prefer the policy-variable form unless there is a specific reason the dependency's own floor line must change (e.g., the dependency's own build also fails on an unrelated policy the variable cannot address).
- **An LLM may treat `find_package(Boost)` failing to find headers/libraries on a modern system as evidence the Find module is "broken" or "needs FindBoost.cmake reinstalled," when the real cause is CMP0167=NEW skipping the module entirely and Config mode failing to find a Boost older than 1.70 (no `BoostConfig.cmake` shipped).** **Mechanical check:** `cmake --trace-expand -DBoost_DEBUG=ON` (module mode) or read `CMakeFiles/CMakeConfigureLog.yaml`'s `find_package-v1` entries (4.1+) to see which mode actually ran; if Config mode ran and failed, the fix is `find_package(Boost MODULE)` with `cmake_policy(SET CMP0167 OLD)` (only viable for old Boost) or upgrading Boost, never reinstalling anything.
- **An LLM will confuse `-Wno-error=deprecated-declarations` (a C++ compiler flag suppressing deprecated-*API* warnings) with CMake's own deprecation gate (`CMAKE_WARN_DEPRECATED`, or `-Werror=dev`/`-Werror=deprecated` on the CLI).** They share the word "deprecated" but operate on entirely different layers — this dive's own initial grep pass produced exactly this false-positive class before manual review filtered it out (`qt__qtbase`, `apache__arrow`, `protocolbuffers__protobuf` all use the compiler-flag form for unrelated C++ API deprecations). **Mechanical check:** grep for the string `deprecated` alone always over-reports; require the CMake variable's own spelling (`CMAKE_WARN_DEPRECATED`, `CMAKE_POLICY_VERSION_MINIMUM`) as the pattern, never the bare word.

## Contested / evolving

- **Whether `3.5` remains an acceptable `CMAKE_POLICY_VERSION_MINIMUM` value in practice, or whether the ecosystem converges on `3.10`, is unsettled as of 2026-09-26.** Every real corpus author who has touched this problem so far chose `3.5` (the value every CMake-4-transition blog post and the CMake 4.0 release notes themselves lead with); only Qt's own helper independently reaches `3.10`. If the M8/M9 gate exposure starts producing visible CI failures (a `-Werror=dev`/`author` leg on a `FetchContent_MakeAvailable`-acquired dependency whose floor sits in `3.5`–`3.9`), expect a shift toward `3.10` becoming the copy-pasted value instead — track whether arrow's own tracked issue (`apache/arrow#45985`, cited in its own code comments) resolves toward one value or the other.
- **Whether `install(PACKAGE_INFO)`-based CPS adoption will change how "removed Find module" guidance is framed is open.** None of the five removed modules in this dive has a CPS angle today — CPS packages are all newly-authored Config-style descriptions, not migrations of legacy Find modules — but if a future CMake release adds a CPS-native Boost/CUDA/Python description, the "check the floor against the policy" heuristic in candidate 4 would gain a third branch.
- **Trend, not yet settled:** package-manager glue code (vcpkg ports, Conan Center recipes) is where every live removed-Find-module use concentrates, and that code is maintained by people who track CMake's release notes closely (the vcpkg/Hunter/CCI opposite-direction `CMAKE_POLICY_DEFAULT_CMP*` uses in Findings §3 prove this). Whether that discipline holds as CMake continues removing modules (CMP0191/CMP0188 at 4.1, with zero adoption to defend yet) or whether a future removal catches these same maintainers by surprise is not yet observable from this corpus.

## Sources

| URL or measurement | What it is | Date/era | Why worth reading |
|---|---|---|---|
| `grep`/`awk` corpus scan, `CMAKE_POLICY_VERSION_MINIMUM`/`_DEFAULT_CMP0167` across 46 repos (Findings §1) | measurement (primary) | corpus SHAs 2026-09-26 | Full classification of every real injection site in the exemplar corpus, superseding the map's single-exemplar citation |
| `sed`-read of `apache__arrow@3ad410b7b1:cpp/cmake_modules/ThirdpartyToolchain.cmake:1025-1038,2647-2660` | measurement (primary) | 2026-09-26 SHA | Confirms the `macro()`-inside-`function()` scoping idiom and that its defensive `unset()` is dead code |
| `sed`-read of `qt__qtbase@0ef5a8e9ca:cmake/QtAutoDetectHelpers.cmake:66-101` | measurement (primary) | 2026-09-26 SHA | The one corpus site independently defaulting to `3.10`, confirming the map's decided value with real code rather than argument |
| `grep`-scan for `install(EXPORT)` plus `FetchContent_MakeAvailable`/`CPMAddPackage` outside test/example/tool paths, 26 repos (Findings §2) | measurement (primary) | corpus SHAs 2026-09-26 | Establishes 0 violators for CMK-DEP-07 at the current SHAs |
| `sed`-read of `protocolbuffers__protobuf@c64743979d:cmake/abseil-cpp.cmake:12-34`, `cmake/gtest.cmake:1-19` | measurement (primary) | 2026-09-26 SHA | The pre-3.24 try-find-then-fetch idiom, cited by both this dive and the map's M-G-01 |
| `ocx package exec kitware/cmake:3.31 -- cmake --help-module FindBoost/FindCUDA/FindPythonLibs/FindPython3/FindCUDAToolkit` | measurement (primary, host binary) | run 2026-09-26 on CMake 3.31.12 | Confirms `versionadded`/`versionchanged` independently of the versions-and-gate dive |
| `ocx package exec kitware/cmake:4.4 -- cmake --help-module` (same modules) | measurement (primary, host binary) | run 2026-09-26 on CMake 4.4.2 | Confirms no doc drift between 3.31.12 and 4.4.2 for this module family |
| `grep`-scan for bare `find_package(Boost/CUDA/PythonInterp/PythonLibs)` and `GCCXML`/`CABLE`, whole corpus (Findings §3) | measurement (primary) | corpus SHAs 2026-09-26 | Full M-G-16 count; the basis for `CMK-DEP-19` |
| `microsoft__vcpkg@c4ee5a52d7:ports/folly/portfile.cmake:61`, `ports/openmvs/portfile.cmake:57`, `ports/libigl/portfile.cmake:47`, `ports/openscap/portfile.cmake:41`, `scripts/test_ports/vcpkg-ci-python3/project/CMakeLists.txt:3-8` | exemplar read (primary, corpus code) | 2026-09-26 SHA | Real opposite-direction (OLD/NEW-forcing) uses of the five removal policies |
| Re-run of `deps-cmake-calls.py` (adapted) against the 2026-09-26 corpus, output at `scratch/scope-classification/find_package-calls-2026-09-26.tsv` | measurement (primary) | corpus SHAs 2026-09-26 | The M-G-08 recount: 7,123/2,842/117, basis for `CMK-DEP-20` |
| `curl__curl@98519dac83:.github/workflows/non-native.yml:419`; `KDE__extra-cmake-modules@b4c4ec9997:tests/CMakeLists.txt:87,95,106` | exemplar read (primary, corpus code) | 2026-09-26 SHA | The only two corpus uses of `CMAKE_WARN_DEPRECATED`, opposite directions |
| `.agents/research/cmake-dependency-seam.md` | consolidation (codified) | 2026-09-26 | The existing `CMK-DEP-07`/`CMK-DEP-15` rule text this dive revises; holds every ID stable |
| `.agents/research/cmake-versions-and-gate/floors-policies-and-era.md` §3-5 | consolidation (codified, itself grounded in normative CMake docs) | 2026-09-26 | The M8/M9 gate-value finding and the removed-module replacement table this dive re-confirms independently |
| `.agents/research/cmake-topic-map.md` (Wave 2 harvest, "Orphans found") | consolidation (codified) | 2026-09-26 | Names the two orphaned rows (M-G-16, M-G-08) this dive's DECIDE points settle |
| `.agents/research/cmake-topic-map/era-recheck-2026-09-26.md` | consolidation (codified) | 2026-09-26 | Confirms no CMake/Conan/vcpkg version fact used here has moved since the map was written |


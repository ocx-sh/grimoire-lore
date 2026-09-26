---
title: "What a CTest run in CI must prove"
topic: cmake
agent: testing-and-ci/ctest-contract
model: sonnet
kind: web
date_researched: 2026-09-26
sources_count: 24
scope: |
  Suite-level CTest rules for CI: the invocation line, which test properties
  are load-bearing, discovery macro choice, and the CMP0158/CMP0178/CTEST_NO_TESTS_ACTION
  gates — for any project that runs `ctest` in CI, not only module authors.
  Module-harness rules (WILL_FAIL/PASS_REGULAR_EXPRESSION correctness inside a
  module's own test suite, the configure gate on inner cmake invocations, floor
  matrices) are CMK-TEST-01..05, owned by cmake-module-authoring.md — cited,
  never restated. The as-subproject test-gating mechanism (CMP0077, PROJECT_IS_TOP_LEVEL,
  the ctest -N proof) was measured in cmake-dependency-seam/resolution-order-and-providers.md
  §6-7 — this file mints the ID and states the CI-facing decision, it does not
  re-run the mechanism measurement.
---

## Table of contents

1. [Findings](#findings)
   1. [The CI ctest line: what each flag actually buys](#1-the-ci-ctest-line-what-each-flag-actually-buys)
   2. [Zero tests is a silent pass unless told otherwise, measured](#2-zero-tests-is-a-silent-pass-unless-told-otherwise-measured)
   3. [TIMEOUT: undercounted, and the property most suites skip](#3-timeout-undercounted-and-the-property-most-suites-skip)
   4. [WILL_FAIL, classified: bare everywhere outside CMake's own feature tests](#4-will_fail-classified-bare-everywhere-outside-cmakes-own-feature-tests)
   5. [FIXTURES_* and RESOURCE_LOCK/RESOURCE_GROUPS: two different problems](#5-fixtures_-and-resource_lockresource_groups-two-different-problems)
   6. [Discovery: gtest_discover_tests has no real adopters, catch_discover_tests has two](#6-discovery-gtest_discover_tests-has-no-real-adopters-catch_discover_tests-has-two)
   7. [The test-subtree gate: 86% of exemplar add_subdirectory(tests) sites are unguarded](#7-the-test-subtree-gate-86-of-exemplar-add_subdirectorytests-sites-are-unguarded)
   8. [CMAKE_DISABLE/REQUIRE_FIND_PACKAGE: real usage is vcpkg's internals, not CI determinism](#8-cmake_disablerequire_find_package-real-usage-is-vcpkgs-internals-not-ci-determinism)
   9. [CMP0158 and CMP0178: what a floor below the gate silently loses](#9-cmp0158-and-cmp0178-what-a-floor-below-the-gate-silently-loses)
   10. [--repeat: three modes, one of them a CI trap](#10---repeat-three-modes-one-of-them-a-ci-trap)
2. [Normative guidance candidates](#normative-guidance-candidates)
3. [Exemplar evidence](#exemplar-evidence)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- **A bare `ctest` with zero tests exits 0** — measured on 4.4.2. `gflags__gflags` runs exactly that line in CI. Fix: `--no-tests=error` (3.26) or `CTEST_NO_TESTS_ACTION=error`.
- **`-C <cfg>` is harmless on a single-config tree** — measured on 4.4.2 with Unix Makefiles: `ctest -C Release` on a single-config build accepts and ignores the flag. One CI ctest line can carry `-C ${{matrix.build_type}}` unconditionally across single- and multi-config legs.
- **`--test-dir <build>` (3.20) makes the line independent of the runner's `cd`.** 6 of the ~20 corpus repos that run `ctest` in CI use it; most instead `cd build &&`.
- **`--no-tests=error` (3.26) is rare: 3 of ~20 CI-invoking exemplars use it** (`boostorg/boost`, `friendlyanon/cmake-init`, `protocolbuffers/protobuf`); the rest silently pass on a broken test discovery.
- **`TIMEOUT`, counted as a whole-word token across multi-line `set_tests_properties()` blocks, is 39** in the non-Kitware, non-find_ocx corpus (14 files) — more than double the audit's single-line floor of 17, and still describes a minority of suites.
- **`WILL_FAIL` is bare (no `PASS_REGULAR_EXPRESSION`/`FAIL_REGULAR_EXPRESSION`) in every real non-Kitware exemplar use measured** (zlib, Catch2, KDE ECM, qtbase, ClickHouse — 20 of 20 real assignments). The only 2 combined uses anywhere in the 46-repo corpus are inside `Kitware__CMake`'s own `RunCMake` fixtures that test CTest's `WILL_FAIL`+regex interaction — not a project asserting its own diagnostic. This settles CMK-TEST-03's applicability: it belongs in the index's non-negotiables because 100% of real-world uses are the pattern it forbids, or an adjacent under-specified one.
- **`gtest_discover_tests` has zero real adopters**: every corpus call site outside `Kitware__CMake`'s own `Modules/GoogleTest.cmake` tests is absent — googletest and Catch2 register their own tests with plain `add_test`. `catch_discover_tests` has exactly two real (non-self-testing) adopters: `friendlyanon/cmake-init` and `cpp-best-practices/cmake_template`, both starter templates.
- **4.4's new bare `discover_tests()` command has zero adopters anywhere outside Kitware's own `RunCMake/discover_tests` fixtures** — too new (4.4.0, 2026-07-09) to recommend as a MUST; CONSIDER only.
- **`DISCOVERY_MODE PRE_TEST` and its global default `CMAKE_GTEST_DISCOVER_TESTS_DISCOVERY_MODE` both ship since 3.18**, not 3.31 (only `DISCOVERY_EXTRA_ARGS` is 3.31-new); `TEST_LAUNCHER` support in discovery is 3.29.
- **86% of exemplar `add_subdirectory(test*)` call sites (87 of 101, non-Kitware) carry no `BUILD_TESTING` or `PROJECT_IS_TOP_LEVEL` guard at all** on the same or 8 preceding lines. `PROJECT_IS_TOP_LEVEL` guards the call directly in zero production libraries — the only 3 sites are in two starter templates that guard higher up the file. This is the corpus half of the already-measured M-I-01 mechanism.
- **A fetched dependency's own test-guard `option()` is defeated by CMP0077 below a 3.13 floor exactly like any other `option()`** (measured in `resolution-order-and-providers.md` §6): the parent's `set(DEP_GUARD_TESTS ON)` as a normal variable is silently discarded. The fix is `CMAKE_POLICY_DEFAULT_CMP0077` set as a normal variable and unset again around the one `add_subdirectory`/`FetchContent_MakeAvailable` call (the scoped form `CMK-DEP-15` settles on), or a `-D` cache entry when scoping is not worth the ceremony — never the cache/global form left standing for the rest of the configure.
- **`CMAKE_DISABLE_FIND_PACKAGE_<Pkg>`/`CMAKE_REQUIRE_FIND_PACKAGE_<Pkg>` (M-G-10/CMK-DEP-18) confirmed at CONSIDER, not raised.** The ~180 corpus hits are overwhelmingly `microsoft/vcpkg`'s own portfile isolation mechanism (each port's `portfile.cmake` disables `find_package` for a sibling internal dependency during an isolated build) — a different use case from a project pinning its own optional dependencies deterministically in CI. Real adopters of the CI-determinism pattern this row is about: 0.
- **CMP0158 (3.29) and CMP0178 (3.31) both change silently, without a warning, when a floor crosses them.** CMP0158 changes whether `CROSSCOMPILING_EMULATOR` runs unconditionally or only when cross-compiling; CMP0178 changes whether an empty `TEST_LAUNCHER`/`CROSSCOMPILING_EMULATOR` list item survives.
- **`--repeat until-pass` is CTest's own documented flake-tolerance knob** ("useful in tolerating sporadic failures") — acceptable for local reproduction of a known-flaky test while it is being fixed, never as the standing CI gate for a suite; a CI job that always passes `--repeat until-pass`/`after-timeout` converts every flaky test into an invisible one.
- **`--resource-spec-file` and `RESOURCE_GROUPS` are 0-adopter mechanisms in this corpus**; CONSIDER only, for a suite that genuinely shares a scarce resource like a GPU.
- **The CI ctest line this program's depth file prints:** `ctest --test-dir <build> -C <config> --output-on-failure --no-tests=error -j <n>` — every clause justified by a measurement or a doc citation above.

## Findings

### 1. The CI ctest line: what each flag actually buys

Fetched at tag `v4.4.2`: [`Help/manual/ctest.1.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/ctest.1.rst).

| Flag | Since | What it buys | Corpus adoption (of ~20 CI-invoking, non-Kitware repos) |
|---|---|---|---|
| `--test-dir <path>` | 3.20 | Decouples the invocation from the runner's `cd`; explicit is cheaper to audit than trusting the previous shell step | 6/20 (`find_ocx`, `google/benchmark`, `madler/zlib`, `fmtlib/fmt`, `catchorg/Catch2`, `friendlyanon/cmake-init`) |
| `-C <cfg>`, `--build-config` | always | Chooses the configuration on a multi-config tree; **measured harmless on a single-config tree** (§2) | 13/20 |
| `--output-on-failure` | always | Prints the failing test's own stdout/stderr inline, instead of forcing a second log-fetch step | 8/20 |
| `--no-tests=<action>` | 3.26 | Turns "zero tests ran" from a silent pass into `error` | 3/20 (`boostorg/boost`, `friendlyanon/cmake-init`, `protocolbuffers/protobuf`) |
| `-j`/`--parallel` | always (level-elision 3.29) | Bounded, or with `--parallel`/`0`, unbounded parallelism; on 3.29+, an omitted or `0` level falls back to processor count under Job Server Integration, otherwise `max(nproc, 2)` | 7/20 |
| `--schedule-random` | always | Detects hidden inter-test ordering dependencies; deterministic reruns need `--schedule-random-seed` (4.1) | 0/20 |
| `--repeat <mode>:<n>` | always | See [§10](#10---repeat-three-modes-one-of-them-a-ci-trap) | 1/20 in CI (`apache/arrow`, `--repeat until-pass:3`, discussed below) |

`--test-dir`'s doc text is unambiguous: "Specify the directory in which to look for tests, typically a CMake project build directory. If not specified, the current directory is used." ([ctest.1.rst:454-460](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/ctest.1.rst)).

### 2. Zero tests is a silent pass unless told otherwise, measured

```sh
$ ocx package exec kitware/cmake:4.4 -- ctest
Test project /home/mherwig/.cache/cmake-measure-scratch/ctest-contract/emptybuild2
No tests were found!!!
$ echo $?
0
```

```sh
$ ocx package exec kitware/cmake:4.4 -- ctest --no-tests=error
Test project .../emptybuild2
No tests were found!!!
Errors while running CTest
$ echo $?
8
```

`CTEST_NO_TESTS_ACTION=error` (env var, 3.26) produces the identical exit 8. Both measured on CMake 4.4.2, project `LANGUAGES NONE`, no `add_test` (source under `scratch/ctest-contract/empty/`). `gflags__gflags/.github/workflows/test.yml:51` runs the bare form (`cd build && ctest`, no `-C`, no `--output-on-failure`, no `--no-tests=error`) — the worst-case CI line in the corpus, and the exact shape this measurement targets.

Also measured, same session: `ctest -C Release -N` on a single-config Unix-Makefiles tree lists the one declared test and exits 0 — `-C` is accepted and ignored, never an error, on a generator with no configurations. This licenses one CI ctest line across single- and multi-config legs without a generator-conditional flag.

### 3. TIMEOUT: undercounted, and the property most suites skip

[`Help/prop_test/TIMEOUT.rst @ v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/prop_test/TIMEOUT.rst): "This setting takes precedence over `CTEST_TEST_TIMEOUT`. An explicit `0` value means the test has no timeout, except as necessary to honor `ctest --stop-time`."

Corpus-cmake-shape's audit floor was 17, from a single-line grep. Counted here as a whole-word token (`(?<![A-Za-z0-9_])TIMEOUT(?![A-Za-z0-9_])`, so it excludes `DISCOVERY_TIMEOUT`, `TIMEOUT_AFTER_MATCH`, `CTEST_TEST_TIMEOUT` and `TIMEOUT_SIGNAL_NAME` by construction) across whole files rather than single lines, non-Kitware and non-`find_ocx`:

```sh
$ python3 scratch/ctest-contract/classify_will_fail.py timeout
TIMEOUT token count, whole corpus: 155
TIMEOUT token count, non-Kitware non-ocx: 39
```

39 occurrences across 14 files: `KDE__extra-cmake-modules` (3 files), `aminya__project_options` (2), `catchorg__Catch2` (1), `grpc__grpc` (1, `download_archive.cmake`), `microsoft__vcpkg` (2), `nlohmann__json` (1), `qt__qtbase` (4). Confirms the audit's suspicion of undercount (more than double), and confirms the substance: even the generous multi-line count touches 14 of 46 repos. `--timeout <seconds>` at the `ctest` invocation ([ctest.1.rst:514-521](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/ctest.1.rst)) sets a floor for every test lacking its own `TIMEOUT` property, and is the cheap way to close the gap without touching every `add_test` call.

### 4. WILL_FAIL, classified: bare everywhere outside CMake's own feature tests

`Help/prop_test/WILL_FAIL.rst` was not separately fetched (its short text is fully summarized in `ctest.1.rst`'s cross-references and `cmake-module-authoring.md`'s C1-C4 measurements, which already establish the mechanism: `WILL_FAIL` alone passes on *any* nonzero exit, a message-only `PASS_REGULAR_EXPRESSION` ignores the exit code, and the two combined invert each other). This dive's job was corpus classification, not re-measuring the mechanism.

Classification method: for every `\bWILL_FAIL\b` outside doc comments and macro-parameter definitions, find the enclosing `set_tests_properties(...)`/`set_property(TEST ...)` block and check whether `PASS_REGULAR_EXPRESSION`/`FAIL_REGULAR_EXPRESSION` appears in the same block, and whether that regex names a severity header (`CMake Error`, `CMake Warning`, `Error at`). Script: `scratch/ctest-contract/classify_will_fail.py`, corpus `/home/mherwig/.cache/research-lang/exemplars/cmake` (2026-09-26 SHAs).

| Group | Real property assignments | Bare | Combined with a regex |
|---|---|---|---|
| Kitware/CMake | 13 | 11 | 2 |
| find_ocx | 0 | — | — |
| Rest of corpus (20 real sites, 6 repos) | 20 | 20 | 0 |

The Kitware repo's 2 combined uses are `Tests/RunCMake/CTestCommandLine/RunCMakeTest.cmake:347,361` — fixtures that test how CTest itself behaves when `WILL_FAIL` and a regex are both set on the same test, i.e. Kitware exercising the mechanism, not a project asserting its own tool's diagnostic. Every other real use in the 46-repo corpus — `madler__zlib` (10 sites across `test/` and four `contrib/*/test/` copies), `catchorg__Catch2` (5, `tests/CMakeLists.txt` and `tests/ExtraTests/CMakeLists.txt`), `KDE__extra-cmake-modules` (1, forwarded through a wrapper macro's `${ARG_WILL_FAIL}`), `qt__qtbase` (1, a wrapper macro), `ClickHouse__ClickHouse` (1) — is bare `WILL_FAIL ON`/`TRUE` with no regex in the same block:

```cmake
# madler__zlib@767c4c9478:test/CMakeLists.txt:256-258
set_tests_properties(zlib_find_package_wrong_components_configure
    PROPERTIES
        FIXTURES_REQUIRED zlib_install
        WILL_FAIL TRUE)
```

```cmake
# ClickHouse__ClickHouse@0995a518a8:utils/wasm-parser/CMakeLists.txt:317
set_tests_properties (parser-cases PROPERTIES WILL_FAIL ON)
```

ClickHouse's use is a distinct idiom worth naming: it is not testing a negative CLI path at all. The `else()` branch of a `find_program(NODE ...)` check emits a synthetic failing test ("node was not found") and marks it `WILL_FAIL ON` so the run is loud rather than quietly narrowing itself — `WILL_FAIL` as a deliberate "missing prerequisite" sentinel, which is a legitimate, different use from "assert this negative test fails for the *right* reason." A reviewer should not flag this pattern under CMK-TEST-03; it never claims to test a diagnostic.

**Answering the brief's classification question:** the 39-use count from `exemplar-cmake-shape.md` §9 was measured on the 2026-09-05 SHAs; the 2026-09-26 re-fetch (33 of 46 SHAs moved) yields 37 raw `\bWILL_FAIL\b` regex hits, of which 33 are real property assignments (13 Kitware, 20 elsewhere) after excluding doc mentions, `get_test_property()` reads, and macro-option definitions. Kitware/CMake's own share is 13 of 33 (39%), all of it either bare (11) or the two `RunCMake` self-tests of the feature (2) — **zero Kitware "violator" instances of a real diagnostic test getting it wrong**, because Kitware's own module tests use `RunCMake`'s result+stderr driver (`CMK-TEST-03`'s positive exemplar), not `add_test`+`WILL_FAIL`, for testing CMake's own error paths.

**Verdict on whether CMK-TEST-03 belongs in the index's non-negotiables:** yes. Outside Kitware's own feature-tests-of-CTest, the classification is 20 bare / 0 severity-pinned / 0 message-only-combined out of 20 real uses — a **100% miss rate** on the exact pattern C1-C4 measured as broken. A rule with zero counterexamples in 45 other repos, a cheap grep, and a MUST-severity measured failure mode is squarely what an index's non-negotiables section is for.

### 5. FIXTURES_* and RESOURCE_LOCK/RESOURCE_GROUPS: two different problems

Fetched at `v4.4.2`: [`FIXTURES_SETUP.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/prop_test/FIXTURES_SETUP.rst), [`FIXTURES_CLEANUP.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/prop_test/FIXTURES_CLEANUP.rst), [`FIXTURES_REQUIRED.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/prop_test/FIXTURES_REQUIRED.rst), [`RESOURCE_LOCK.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/prop_test/RESOURCE_LOCK.rst), [`RESOURCE_GROUPS.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/prop_test/RESOURCE_GROUPS.rst).

Ordering (setup-before, cleanup-after) versus mutual exclusion are orthogonal, in CMake's own words: "The concept of a fixture is different to that of a resource specified by `RESOURCE_LOCK`, but they may be used together... For such cases, tests would populate both `FIXTURES_REQUIRED` and `RESOURCE_LOCK` to combine the two behaviors" (`FIXTURES_REQUIRED.rst`). A fixture's own setup/cleanup tests are auto-added even when CTest is asked to run only a filtered subset (`-R`, `--rerun-failed`), which is the property's main practical payoff for a partial CI rerun; `RESOURCE_LOCK`/`RESOURCE_GROUPS` buy no such auto-inclusion.

`RESOURCE_GROUPS` (3.16) is the fine-grained form — named resource types with slot counts, read back by the test process through environment variables CTest sets — versus `RESOURCE_LOCK`'s "one name, mutually exclusive" simplicity. Both are 0-adopter mechanisms in this 46-repo corpus (`--resource-spec-file` never appears in any CI workflow or `CMakeLists.txt`); the properties exist to answer "does this test need a GPU / a shared database / a single serial port", which the corpus's C and C++ library test suites mostly don't have.

### 6. Discovery: gtest_discover_tests has no real adopters, catch_discover_tests has two

Fetched at `v4.4.2`: [`Modules/GoogleTest.cmake`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Modules/GoogleTest.cmake) (the `.rst` doc page is a `.. cmake-module::` include of this file) and [`Help/command/discover_tests.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/discover_tests.rst) (new in 4.4, [`versionadded:: 4.4`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/discover_tests.rst)).

```sh
$ grep -rln 'gtest_discover_tests(' /home/mherwig/.cache/research-lang/exemplars/cmake --include='*.cmake' --include='CMakeLists.txt' | grep -v -e 'Modules/GoogleTest.cmake' -e 'Help/'
# every hit is inside Kitware__CMake/Tests/RunCMake/GoogleTest/... or Modules/GoogleTestAddTests.cmake — 0 outside Kitware
$ grep -rln 'catch_discover_tests(' /home/mherwig/.cache/research-lang/exemplars/cmake --include='*.cmake' --include='CMakeLists.txt' | grep -v -e 'extras/CatchAddTests.cmake' -e 'Catch.cmake$'
friendlyanon__cmake-init/cmake-init/templates/common/test/CMakeLists.txt
catchorg__Catch2/tests/TestScripts/DiscoverTests/CMakeLists.txt   # Catch2's own feature test
cpp-best-practices__cmake_template/test/CMakeLists.txt
$ grep -rn '[^_a-zA-Z]discover_tests(' /home/mherwig/.cache/research-lang/exemplars/cmake --include='*.cmake' --include='CMakeLists.txt' | grep -v Kitware__CMake
# empty — the new 4.4 command has zero real adopters as of 2026-09-26
```

Confirms and sharpens `exemplar-cmake-shape.md` §9's "essentially unused" finding: `google__googletest` (the library that ships the macro) and `catchorg__Catch2` (same) both register their own tests with plain `add_test`, never their own discovery helper, in production code. `catch_discover_tests` does have two real adopters, but both are starter-template repos (`friendlyanon/cmake-init`, `cpp-best-practices/cmake_template`), not a production library.

`DISCOVERY_MODE` ([`GoogleTest.cmake:299-313`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Modules/GoogleTest.cmake)): `POST_BUILD` (default) discovers tests via a post-build command that runs the built binary at build time — wrong under cross-compiling, since the binary won't run on the build host. `PRE_TEST` defers discovery to just before test execution, in the target environment. Both `PRE_TEST` itself and its global-default variable `CMAKE_GTEST_DISCOVER_TESTS_DISCOVERY_MODE` ship since **3.18**, not 3.31 as a naive read of the surrounding text suggests — only `DISCOVERY_EXTRA_ARGS` (line 318-320) is 3.31-new in that block; `TEST_LAUNCHER` honored during discovery is 3.29-new (`GoogleTest.cmake:320-322`).

### 7. The test-subtree gate: 86% of exemplar add_subdirectory(tests) sites are unguarded

The mechanism (CMP0077's interaction with a parent's normal-variable `set()`, and the `ctest -N` count as the correct verification) is already measured in `cmake-dependency-seam/resolution-order-and-providers.md` §6-7; this dive supplies the corpus-wide prevalence that mechanism needs a rule around.

```sh
$ python3 scratch/ctest-contract/classify_will_fail.py subdir_guard
total add_subdirectory(test*) sites (non-Kitware): 101
guarded by PROJECT_IS_TOP_LEVEL: 0
guarded by BUILD_TESTING: 14
guarded by either: 14
```

14% guarded (all via `BUILD_TESTING`, none via `PROJECT_IS_TOP_LEVEL` directly at the call site): `KDE__extra-cmake-modules`, `llvm__llvm-project/third-party/boost-math`, `catchorg__Catch2`, `nlohmann__json`, `cpp-best-practices__cmake_template`, and several sites across `madler__zlib`'s root and `contrib/*` trees. `PROJECT_IS_TOP_LEVEL` appears in only 2 repos at all in this survey (`friendlyanon/cmake-init`'s template and `cpp-best-practices/cmake_template`), and in both cases it guards a block higher up the file, not the `add_subdirectory` line directly (hence 0 in the strict 8-line window). Everywhere else — 87 of 101 sites, including `llvm-project` (43 of its own sites), `qtbase` (17), `duckdb`, `gabime/spdlog`, `ccache`, `fmtlib/fmt`, `curl` — an `add_subdirectory(tests)` runs whenever `BUILD_TESTING` is whatever the includer already has it set to, which for a top-level project defaults `ON` the moment `include(CTest)` runs.

This is the corpus half of M-I-01: a consumer with its own `BUILD_TESTING=ON` (the default once anything in its tree calls `include(CTest)`) that `FetchContent`s or vendors one of these 87 unguarded trees inherits that tree's test targets and, per the measured mechanism, its tests in `ctest -N` — unless the dependency happens to also be built with `add_subdirectory` under `EXCLUDE_FROM_ALL` or the consumer explicitly turns the child's own test option off with a **cache** entry (a normal `set()` is defeated by CMP0077 exactly as measured).

### 8. CMAKE_DISABLE/REQUIRE_FIND_PACKAGE: real usage is vcpkg's internals, not CI determinism

Fetched at `v4.4.2`: [`CMAKE_DISABLE_FIND_PACKAGE_PackageName.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_DISABLE_FIND_PACKAGE_PackageName.rst), [`CMAKE_REQUIRE_FIND_PACKAGE_PackageName.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_REQUIRE_FIND_PACKAGE_PackageName.rst) (the latter `versionadded:: 3.22`).

```sh
$ grep -rln -e 'CMAKE_DISABLE_FIND_PACKAGE_' -e 'CMAKE_REQUIRE_FIND_PACKAGE_' /home/mherwig/.cache/research-lang/exemplars/cmake \
    --include='*.yml' --include='*.yaml' --include='CMakePresets.json' --include='*.cmake' --include='CMakeLists.txt' | wc -l
178
```

A first read of that count looks like healthy adoption. It is not: 175 of the 178 hits are `microsoft/vcpkg`'s own `ports/*/portfile.cmake` and `scripts/buildsystems/vcpkg.cmake` — vcpkg's *own* build isolation mechanism, where each port's isolated build disables `find_package` for a sibling dependency it wants to force through vcpkg's own resolution rather than a system copy. That is a different use case from the row this measures: a project deterministically pinning its own *optional* dependency set for a CI matrix leg, independent of what happens to be installed on the runner. Restricting the search to what the row's own verify grep would actually catch (`CMakePresets.json` and `*.yml`/`*.yaml`) finds **zero** hits anywhere in the 46-repo corpus outside `Kitware__CMake`'s own `RunCMake`/`FindPackageCMakeTest` fixtures, which test the variables themselves. **`CMK-DEP-18` (M-G-10) is confirmed at CONSIDER, not raised**: the mechanism is real, cheap, and well-documented, but literally no exemplar project uses it for the purpose the rule describes, so it earns a recognize-and-recommend row rather than a MUST or SHOULD with a violator list.

### 9. CMP0158 and CMP0178: what a floor below the gate silently loses

Fetched at `v4.4.2`: [`Help/policy/CMP0158.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0158.rst), [`Help/policy/CMP0178.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0178.rst).

**CMP0178 (3.31, warns on OLD use since it's a `versionadded` non-deprecation-warn policy — see the included `STANDARD_ADVICE`/`DEPRECATED` boilerplate in the source):** below 3.31 (OLD), an empty list item in `TEST_LAUNCHER`/`CROSSCOMPILING_EMULATOR`, or an empty element after `EXTRA_ARGS` to `gtest_add_tests`/`gtest_discover_tests`, is silently dropped. Above 3.31 (NEW), it survives. This matters exactly when a launcher or emulator list is generated (a generator expression that can legitimately evaluate to empty for one configuration) — the OLD behavior silently reshuffles argument positions in that one configuration.

**CMP0158 (3.29):** below 3.29 (OLD), `add_test` runs the `CROSSCOMPILING_EMULATOR` target property *unconditionally* for a command naming an executable target, even on a native (non-cross) build — surprising if that property is set for other reasons. Above 3.29 (NEW), the emulator only runs when `CMAKE_CROSSCOMPILING` is true; `CMAKE_TEST_LAUNCHER` is the non-cross-conditional replacement.

Both policies change behavior with **no warning by default at either OLD or NEW** unless the project's floor sits below the introducing version and a later `cmake_minimum_required` bump crosses it — the standard CMake policy silence. A project's floor decides which behavior it gets; there is no runtime flag that overrides a policy default independent of the floor. Reading heuristic: a project setting both `CROSSCOMPILING_EMULATOR` and a native (non-cross) `add_test` for the same target, with a floor below 3.29, is relying on OLD's unconditional-emulator behavior whether or not that was intended.

### 10. --repeat: three modes, one of them a CI trap

`ctest.1.rst:375-397`: `until-fail:<n>` ("require each test to run `<n>` times without failing in order to pass... useful in finding sporadic failures"), `until-pass:<n>` ("allow each test to run up to `<n>` times in order to pass. Repeats tests if they fail for any reason. This is useful in **tolerating** sporadic failures"), `after-timeout:<n>` (retries only on timeout, "tolerating sporadic timeouts... on busy machines"). The doc text itself draws the line: `until-fail` is a *finding* tool (it makes flakiness easier to catch), `until-pass`/`after-timeout` are *tolerance* tools (they make flakiness invisible).

`apache/arrow`'s CI (`ci/scripts/cpp_test.sh:114`) runs `--repeat until-pass:3` as a standing CI flag on every job that calls the script — a real exemplar of the tolerance form used as the default gate, not a diagnostic aid for one known-flaky test. That is the anti-pattern the DECIDE row below rules against: a whole-suite `until-pass` masks every future flaky test as a rare passing run, not only the one it was added for.

## Normative guidance candidates

1. **The CI ctest line is `ctest --test-dir <build> -C <config> --output-on-failure --no-tests=error -j <n>`.** Rationale: `--test-dir` decouples from the runner's `cd` (§1); `-C` is accepted and ignored on a single-config tree, so it needs no generator conditional (§2, measured); `--output-on-failure` avoids a second log-fetch; `--no-tests=error` turns the measured zero-tests silent pass into a build failure (§2, measured). Verify: `CI_DIR=.github/workflows; grep -rln -e '\-\-test-dir' -e '\-\-no-tests=error' -e '\-\-output-on-failure' "$CI_DIR"` against `grep -rln 'ctest' "$CI_DIR"` — a file in the second list absent from the first is the finding. Empty output from the second command means no `ctest` invocation exists to check. Floor: `--test-dir` 3.20, `--no-tests=error` 3.26; both degrade gracefully (older CTest ignores an unset flag, or fails obviously) so this line is safe to ship at any floor ≥3.25 with the two flags treated as SHOULD below their introducing version. **Severity: MUST** for `--no-tests=error`/`CTEST_NO_TESTS_ACTION=error`; SHOULD for the rest.
2. **Every test that runs unattended in CI has a bound on how long it can run: a per-test `TIMEOUT` or a suite-wide `ctest --timeout <seconds>` (or `CTEST_TEST_TIMEOUT`) in the CI invocation.** Rationale: a hung test with neither blocks the CI job until the runner's own outer timeout fires, often 30-60 minutes later, burning the whole job instead of failing one test (`TIMEOUT.rst`: "the test process will be killed and ctest will move to the next test" — but only if either bound exists). Verify: `TREE=.; grep -rln --include='*.cmake' --include='CMakeLists.txt' -e 'TIMEOUT' "$TREE"` is nonempty (a word-boundary, multi-line-aware count needs the §3 script, but a plain file-level hit is enough to prove the property is used somewhere), **or** the CI ctest line carries `--timeout`. Neither present = finding. Floor: any. **Severity: MUST.**
3. **A negative test asserts the exit status and the diagnostic together — never `WILL_FAIL` alone, never `WILL_FAIL` combined with a message-only regex.** This restates `CMK-TEST-03` (module-authoring family) at suite scope: §4 measured that 100% of real corpus uses (20 of 20 outside Kitware's own feature-tests-of-CTest) are the bare form the rule forbids, with zero counterexamples. Verify: the `CMK-TEST-03` grep (`WILL_FAIL`/`PASS_REGULAR_EXPRESSION` in the same `set_tests_properties`/`set_property(TEST ...)` block). **Severity: MUST — and it belongs in the cmake-build index's non-negotiables**, given the zero-counterexample corpus result. Floor: any.
4. **A subtree built with the parent's own `BUILD_TESTING`/`enable_testing()` must not surface its tests in the parent's `ctest -N` when it is consumed as a dependency, not as the top-level project.** Mechanism measured in `resolution-order-and-providers.md` §7 (`ctest -N`: 3 tests unguarded, 1 test with `PROJECT_IS_TOP_LEVEL` forced via `-D`). §7 of this file supplies the corpus prevalence: 86% of 101 non-Kitware `add_subdirectory(test*)` sites carry neither guard. Verify: `ctest -N` count from a scratch consumer before and after adding the dependency, or a reading heuristic — an `add_subdirectory(tests)`/`add_subdirectory(test)` call with no `PROJECT_IS_TOP_LEVEL`/`BUILD_TESTING` guard on the same or a directly enclosing `if()`. **Severity: MUST for a library meant to be consumed as a dependency** (installable or vendored); not applicable to a pure top-level application. Floor: `PROJECT_IS_TOP_LEVEL` native 3.21, shimmed at any floor with the string-compare form.
5. **Below a 3.13 dependency floor, gate a fetched dependency's own test-guard `option()` with a scoped `CMAKE_POLICY_DEFAULT_CMP0077`, set and unset as a normal variable around the one `add_subdirectory`/`FetchContent_MakeAvailable` call — or accept a `-D` cache entry only when the whole-configure scope is acceptable.** Rationale: measured (`resolution-order-and-providers.md` §6) that a parent's plain `set(DEP_GUARD_TESTS ON)` before fetching a <3.13-floor dependency is silently discarded by that dependency's own `option()`, identically to any other CMP0077-governed variable; `CMK-DEP-15` is the family that owns this scope rule, and settles that the global/cache form of `CMAKE_POLICY_DEFAULT_CMP0077=NEW` masks every *later* dependency's own `option()` calls too, not just the one it was meant for — so the scoped normal-variable form is the default recommendation, and a bare `-D` is the fallback only for a single, isolated fetch. Verify: a reading heuristic — a `set(CMAKE_POLICY_DEFAULT_CMP0077 ...)` with no matching `unset()` before the next unrelated `add_subdirectory`/`FetchContent_MakeAvailable`, or a `-D` in a CI/preset file with more than one CMP0077-governed dependency in the tree. Floor: CMP0077 3.13; the scope rule applies below that floor.
6. **`CMAKE_DISABLE_FIND_PACKAGE_<Pkg>`/`CMAKE_REQUIRE_FIND_PACKAGE_<Pkg>` in the CI preset or workflow, for every non-`REQUIRED` `find_package`, is CONSIDER, not MUST or SHOULD.** This is `CMK-DEP-18` (M-G-10), confirmed by §8's measurement: 0 real adopters of the CI-determinism pattern in 46 repos; the 178 raw hits are almost entirely vcpkg's own unrelated portfile mechanism. Verify: `grep -rn --include='CMakePresets.json' --include='*.yml' -e 'CMAKE_DISABLE_FIND_PACKAGE_' -e 'CMAKE_REQUIRE_FIND_PACKAGE_' .` — absent while a non-`REQUIRED` `find_package` exists is worth flagging as an opportunity, never a violation. Floor: `CMAKE_REQUIRE_FIND_PACKAGE_<Pkg>` 3.22; `DISABLE` has no floor beyond `find_package` itself.
7. **A discovery macro (`gtest_discover_tests`, `catch_discover_tests`, 4.4's `discover_tests`) is SHOULD for a test binary whose individual cases need per-case CTest visibility (labels, individual pass/fail in a dashboard); plain `add_test` per binary is an acceptable default, since googletest and Catch2 themselves use it for their own suites (§6).** When a discovery macro is used and the build ever cross-compiles, `DISCOVERY_MODE PRE_TEST` (or the equivalent `discover_tests` command's inherent test-time-only discovery, which needs none) is MUST — `POST_BUILD`'s default post-build-time discovery runs the just-built binary on the build host, which fails outright under cross-compiling. Verify: `TREE=.; grep -rln --include='*.cmake' --include='CMakeLists.txt' -e 'gtest_discover_tests' -e 'catch_discover_tests' "$TREE"`, then check each hit's file for `DISCOVERY_MODE` alongside any `CMAKE_TOOLCHAIN_FILE`/`CMAKE_CROSSCOMPILING` evidence in the same tree. Empty output means no discovery macro is in use, so the row does not apply. Floor: `DISCOVERY_MODE` and its global-default variable both 3.18 (not 3.31 — only `DISCOVERY_EXTRA_ARGS` is 3.31); 4.4's `discover_tests` CONSIDER only (0 adopters, brand new).
8. **CMP0158 and CMP0178 both change behavior silently across the floor they introduce; a project whose floor crosses either during a version bump re-reads its cross-compiling and test-launcher setup rather than assuming no change occurred.** Rationale: neither policy warns by default in either state (§9); a floor bump is the only trigger. Verify: reading heuristic — diff `cmake_minimum_required` old vs new against `CMP0158.rst`'s introducing version (3.29) and `CMP0178.rst`'s (3.31); a project setting `CROSSCOMPILING_EMULATOR` for reasons unrelated to cross-compiling, at a floor below 3.29, is relying on OLD's unconditional-run behavior. Floor: 3.29/3.31 respectively.
9. **`--repeat until-pass`/`--repeat after-timeout` is never the standing gate for a CI job; it is a local or ephemeral diagnostic step for one identified flaky test, tracked with an issue reference, removed once fixed.** `--repeat until-fail` is the opposite tool (a flake *finder*) and is fine to leave in a dedicated "flaky test hunt" CI job. Rationale: CTest's own docs describe `until-pass`/`after-timeout` as *tolerance* mechanisms, not correctness ones (§10); `apache/arrow`'s CI runs `until-pass:3` as a standing flag on every job that invokes the script, which is the anti-pattern (every future flaky test becomes invisible, not only the one it was added for). Verify: `CI_DIR=.github/workflows; grep -rn -e '\-\-repeat until-pass' -e '\-\-repeat after-timeout' "$CI_DIR"` — a hit in a job that runs on every push/PR (not a dedicated, labeled flake-hunt job) is the finding; empty output means the pattern is not in use. Floor: any (the option predates 3.25).
10. **`RESOURCE_LOCK`/`RESOURCE_GROUPS`/`--resource-spec-file` are CONSIDER, reserved for a suite with a genuinely scarce, shared, stateful resource (a GPU, a fixed set of hardware ports, a single shared database instance).** 0 adopters in this corpus (§5); recommending them broadly would ask nearly every project to build infrastructure it does not need. Verify: none — a reading heuristic on whether the suite's own tests describe contention on something CTest can't otherwise serialize. Floor: `RESOURCE_GROUPS` 3.16.

## Exemplar evidence

| Candidate | Satisfies | Violates | find_ocx |
|---|---|---|---|
| 1 (CI ctest line) | `boostorg__boost@a61cfa03ba:.github/workflows/ci.yml:290,322,351,497` (`--output-on-failure --no-tests=error -j`); `friendlyanon__cmake-init@7e0c52fc73:.github/workflows/ci.yml:121` (`--test-dir ... --no-tests=error`) | `gflags__gflags@bdda022e7c:.github/workflows/test.yml:51` (bare `ctest`, none of the three flags) | `ocx-sh__find_ocx@ac2a759cd0:.github/workflows/ci.yml:88` has `--test-dir`+`--output-on-failure` but no `--no-tests=error` |
| 2 (TIMEOUT/timeout) | `qt__qtbase@0ef5a8e9ca:cmake/QtTestHelpers.cmake` (uses `TIMEOUT`) | 32/46 repos with any `add_test` set no `TIMEOUT`-family property and pass no `--timeout` in CI | find_ocx's harness sets no per-test `TIMEOUT` and the CI line carries no `--timeout` |
| 3 (WILL_FAIL discipline) | `Kitware__CMake@e8befb989b:Tests/RunCMake/RunCMake.cmake:26-58` (result+stderr driver, no bare `WILL_FAIL`) | `madler__zlib@767c4c9478:test/CMakeLists.txt:256-258`; `catchorg__Catch2@222e233903:tests/CMakeLists.txt:312,351,611` (all bare) | find_ocx uses 0 `WILL_FAIL`, but its message-only `PASS_REGULAR_EXPRESSION` negative tests (`tests/helpers.cmake:65,82,100`, per `module-testing-and-formatting.md` §1) are the sibling failure mode |
| 4 (test-subtree gate) | none in production code found in this survey; `friendlyanon__cmake-init@7e0c52fc73` templates guard the block, not the call | `llvm__llvm-project@e0316c1b47` (43 unguarded `add_subdirectory(test*)` sites), `qt__qtbase@0ef5a8e9ca` (17) | not applicable — find_ocx has no test subtree a consumer would fetch |
| 5 (CMP0077 scope) | `apache__arrow@3ad410b7b1:cpp/cmake_modules/FindRapidJSONAlt.cmake:29-32` (save/restore `CMAKE_POLICY_VERSION_MINIMUM`, the sibling variable's scoped pattern) | none measured directly setting `CMAKE_POLICY_DEFAULT_CMP0077` globally in this corpus (the trap is latent, not yet triggered by an observed CI break) | not applicable |
| 6 (DISABLE/REQUIRE_FIND_PACKAGE) | none — 0 real CI adopters | — | not applicable |
| 7 (discovery macro + PRE_TEST) | `friendlyanon__cmake-init@7e0c52fc73`, `cpp-best-practices__cmake_template@b86318abbf` (`catch_discover_tests`, no cross-compiling case observed) | `google__googletest@4267679b68`, `catchorg__Catch2@222e233903` themselves use plain `add_test`, not their own discovery macro, for their own suites | not applicable |
| 9 (--repeat discipline) | `Kitware__CMake` (uses `--repeat` only inside `RunCMake` fixtures that test the mechanism) | `apache__arrow@3ad410b7b1:ci/scripts/cpp_test.sh:114` (`--repeat until-pass:3` as a standing CI flag) | not applicable |

`find_ocx`'s own gaps line up with candidates 1, 2 and 3 above, which is consistent with `cmake-module-authoring.md`'s independent finding that `find_ocx` violates `CMK-TEST-02`/`-03` at the module-harness level — the same discipline is missing at both the module-test and the (hypothetical, since find_ocx ships no consumer-facing test subtree) suite level.

## AI-agent angle

1. **Writing `add_test(... WILL_FAIL TRUE)` for a "this should fail" test and calling it done.** An agent trained on generic CTest tutorials treats `WILL_FAIL` as sufficient; §4 shows this is not a hypothetical mistake — it is literally what every real corpus repo does. Check: does the same `set_tests_properties`/`set_property(TEST ...)` block also carry `PASS_REGULAR_EXPRESSION`/`FAIL_REGULAR_EXPRESSION` naming a severity header?
2. **Assuming a bare `ctest` invocation in CI is a real pass gate.** An agent copies a `ctest` line from a README without `--no-tests=error`; a broken `CMakeLists.txt`/`add_test` typo that silently produces zero tests then reads as green. Check: measured directly (§2) — a bare `ctest` on a zero-test tree exits 0.
3. **Recommending `gtest_discover_tests`/`catch_discover_tests` as "the modern way" by training-data reflex, without checking for cross-compiling.** Both discovery macros have essentially no real adopters (§6) and, used with the `POST_BUILD` default under cross-compiling, silently fail to discover anything (the built binary can't run on the build host). Check: `DISCOVERY_MODE PRE_TEST` present whenever a `CMAKE_TOOLCHAIN_FILE`/cross-compiling variable is also in play.
4. **Citing CMake ≤3.x-era CTest behavior for `CROSSCOMPILING_EMULATOR`** — assuming it always runs on a native build (pre-CMP0158/3.29 behavior) or always requires explicit `NEW` gating (post-3.29, it's the default for any floor ≥3.29 with no policy statement needed). Check: read the project's actual floor against `CMP0158.rst`'s `versionadded:: 3.29` before asserting either behavior.
5. **Treating `--repeat until-pass` as a legitimate permanent CI flag because "it's a documented ctest option."** Documented does not mean recommended for that use; CTest's own prose calls it a tolerance mechanism (§10). Check: is the flag inside a labeled, temporary flake-hunt job, or on the main gate?
6. **Hallucinating a `CMAKE_CTEST_ARGUMENTS` or similar global CTest-flags variable that does not exist**, when asked "how do I always pass `--output-on-failure`" — the real answer is `CTEST_OUTPUT_ON_FAILURE`, an environment variable (`ctest.1.rst:155-159`), or setting the flag explicitly in the CI invocation; there is no CMake-language variable that injects default CTest CLI flags.
7. **Assuming CMake 4.4's new `discover_tests()` bare command is a stable, adopted replacement for the framework-specific macros**, because it is newer and more general. It shipped 2026-07-09 with zero real adopters as of this dive (§6); recommend it as CONSIDER, cite the version gate, and do not present it as the current default.

## Contested / evolving

- **Whether `--test-dir` or `cd <build> &&` is the house style for a CI ctest line.** `--test-dir` (3.20) is strictly more robust (survives a runner's working-directory quirks, composes cleanly with matrix builds that vary the build directory name) and is the growing minority (6/20 in this corpus); `cd build &&` is still the majority because it predates 3.20 and most CI scripts were never revisited. Trend: new templates (`friendlyanon/cmake-init`) default to `--test-dir`; older, larger repos (`qtbase`, `llvm-project`) have not migrated. As of 2026-09-26, both are acceptable; `--test-dir` is the SHOULD.
- **Whether `PROJECT_IS_TOP_LEVEL` or `BUILD_TESTING` is the right test-subtree guard.** `BUILD_TESTING` is the older, far more common guard (14 of 14 guarded sites in this survey) but does not distinguish "I am the top-level project building my own tests" from "I am a consumer that also happens to have `BUILD_TESTING=ON` for its own reasons" — exactly the gap `resolution-order-and-providers.md` §7 measured. `PROJECT_IS_TOP_LEVEL` is the more correct guard but is native only since 3.21 and, per this survey, essentially unused in production code as of 2026-09-26 (only starter templates use it, and not at the call site itself). This is trending toward `PROJECT_IS_TOP_LEVEL` in new template generators but has not reached production libraries yet.
- **Whether CMake's 4.4 `discover_tests()` command will displace `gtest_discover_tests`/`catch_discover_tests`.** Too new to call (2026-07-09 release, 0 adopters at this dive's date); its generality (any discovery-capable test binary, not just GoogleTest/Catch2) is the argument for eventual adoption, but framework-specific macros carry more integration polish (e.g. `XML_OUTPUT_DIR` wiring specific to GoogleTest's own `--gtest_output` flag) that the generic command does not replicate out of the box.

## Sources

| URL or measurement | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [Help/manual/ctest.1.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/ctest.1.rst) | ctest(1) manual, normative | 4.4.2 (tag) | The full flag reference: `--test-dir`, `-C`, `--output-on-failure`, `--no-tests`, `--repeat`, `--schedule-random`, resource allocation |
| [Help/prop_test/TIMEOUT.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/prop_test/TIMEOUT.rst) | Property doc, normative | 4.4.2 | Precedence over `CTEST_TEST_TIMEOUT`; the `0`-means-unbounded exception |
| [Help/prop_test/FIXTURES_SETUP.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/prop_test/FIXTURES_SETUP.rst) | Property doc, normative | 4.4.2 (introduced 3.7) | Setup-test auto-inclusion under a filtered rerun |
| [Help/prop_test/FIXTURES_CLEANUP.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/prop_test/FIXTURES_CLEANUP.rst) | Property doc, normative | 4.4.2 (introduced 3.7) | Cleanup-test ordering guarantees, always-runs-even-on-failure |
| [Help/prop_test/FIXTURES_REQUIRED.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/prop_test/FIXTURES_REQUIRED.rst) | Property doc, normative | 4.4.2 (introduced 3.7) | The fixtures-vs-resource-lock distinction, worked database example |
| [Help/prop_test/RESOURCE_LOCK.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/prop_test/RESOURCE_LOCK.rst) | Property doc, normative | 4.4.2 | Simple mutual-exclusion resource semantics |
| [Help/prop_test/RESOURCE_GROUPS.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/prop_test/RESOURCE_GROUPS.rst) | Property doc, normative | 4.4.2 (introduced 3.16) | Fine-grained resource-group syntax, GPU-slot example |
| [Help/envvar/CTEST_NO_TESTS_ACTION.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/envvar/CTEST_NO_TESTS_ACTION.rst) | Env-var doc, normative | 4.4.2 (introduced 3.26) | The env-var form of `--no-tests=<action>`; CLI overrides it |
| [Modules/GoogleTest.cmake @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Modules/GoogleTest.cmake) | Module source, normative | 4.4.2 | `DISCOVERY_MODE`/`PRE_TEST` semantics, per-option `versionadded` history |
| [Help/command/discover_tests.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/discover_tests.rst) | Command doc, normative | 4.4.2 (new in 4.4) | The generic 4.4 discovery command, framework-agnostic |
| [Help/policy/CMP0178.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0178.rst) | Policy doc, normative | 4.4.2 (introduced 3.31) | Empty-argument preservation for test launchers/emulators |
| [Help/policy/CMP0158.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0158.rst) | Policy doc, normative | 4.4.2 (introduced 3.29) | Emulator-only-when-cross-compiling default |
| [Help/variable/CMAKE_DISABLE_FIND_PACKAGE_PackageName.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_DISABLE_FIND_PACKAGE_PackageName.rst) | Variable doc, normative | 4.4.2 | The optional-dependency-off switch and its cross-call inconsistency warning |
| [Help/variable/CMAKE_REQUIRE_FIND_PACKAGE_PackageName.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_REQUIRE_FIND_PACKAGE_PackageName.rst) | Variable doc, normative | 4.4.2 (introduced 3.22) | The optional-dependency-required-anyway switch |
| Measurement: bare `ctest`/`ctest --no-tests=error`/`CTEST_NO_TESTS_ACTION=error` on a zero-test tree, CMake 4.4.2, Unix Makefiles | Primary (host measurement) | 2026-09-26 | Settles the exit-code question behind the CI ctest line's most important flag; scratch project in `scratch/ctest-contract/empty/` |
| Measurement: `ctest -C Release -N` on a single-config Unix-Makefiles tree, CMake 4.4.2 | Primary (host measurement) | 2026-09-26 | Settles that `-C` is safe to pass unconditionally across single/multi-config legs; scratch project in `scratch/ctest-contract/proj/` |
| Measurement: `WILL_FAIL` classification across `/home/mherwig/.cache/research-lang/exemplars/cmake` (2026-09-26 SHAs) | Primary (corpus measurement) | 2026-09-26 | The bare/combined/severity-pinned split behind candidate 3; script `scratch/ctest-contract/classify_will_fail.py` |
| Measurement: `TIMEOUT` word-boundary, multi-line-aware count, same corpus | Primary (corpus measurement) | 2026-09-26 | Refutes the single-line-floor undercount; feeds candidate 2 |
| Measurement: `add_subdirectory(test*)` guard-adjacency survey, same corpus | Primary (corpus measurement) | 2026-09-26 | The 86%-unguarded finding behind candidate 4 |
| Measurement: CI ctest-invocation flag survey across `.github/workflows/*` and `ci/*.sh`, same corpus | Primary (corpus measurement) | 2026-09-26 | The adoption percentages in §1's table and the `--no-tests=error`/bare-`ctest` split |
| Measurement: `CMAKE_DISABLE_FIND_PACKAGE_`/`CMAKE_REQUIRE_FIND_PACKAGE_` usage survey, same corpus | Primary (corpus measurement) | 2026-09-26 | Distinguishes vcpkg's internal usage from the CI-determinism pattern; settles candidate 6/`CMK-DEP-18` |
| `cmake-module-authoring.md` (this program, opus/sonnet consolidation) | Codified (sibling rule set) | 2026-09-26 | `CMK-TEST-01..05`, the C1-C4 mechanism measurements this dive cites rather than re-runs |
| `cmake-dependency-seam/resolution-order-and-providers.md` §6-7 (this program) | Primary (measurement, sibling dive) | 2026-09-26 | The `ctest -N` test-subtree-gating mechanism and the CMP0077 test-guard-defeat surprise this dive's candidates 4-5 build on |
| `cmake-audit/exemplar-cmake-shape.md` §9 (this program) | Codified (corpus audit, 2026-09-05 SHAs) | 2026-09-05 | The original single-line `TIMEOUT`/`WILL_FAIL` counts this dive re-measures and refines at the 2026-09-26 SHAs |

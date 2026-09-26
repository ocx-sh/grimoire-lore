---
title: "CTest, presets and CI — consolidated"
topic: cmake-testing-and-ci
model: opus
id_family: CMK-TEST, CMK-CI
date: 2026-09-26
verified: 2026-09-26
consolidates:
  - cmake-testing-and-ci/ctest-contract.md
  - cmake-testing-and-ci/presets-and-ci-shape.md
  - cmake-audit/exemplar-cmake-shape.md
  - cmake-audit/exemplar-deps-and-dual-build.md
  - cmake-audit/find-ocx-cmake-shape-and-contracts.md
  - cmake-audit/fleet-inventory-and-bazel-overlap.md
  - cmake-topic-map.md rows M-I-01..06, M-J-01..11 (M-G-10 and M-E-06 cited)
  - cmake-dependency-seam/resolution-order-and-providers.md §6-7 (cited for the measurement it owns, not consolidated)
---

# CTest, presets and CI

Measured on CMake 3.31.12 and 4.4.2 (the host's OCX mirror; upstream is at
4.4.3) with ninja 1.13.2 and gcc 15.2, on 2026-09-26. Rules assume the map's
floor of 3.25 ([map] conflict 1). A rule that needs a newer CMake names the
version.

**ID continuity.** The map gave `CMK-TEST` to two groups. `CMK-TEST-01..05`
shipped in `cmake-module-authoring.md` and cover testing CMake code itself.
They are held stable and cited here, never restated. This file owns the
suite-level rows from `CMK-TEST-06` on, and all of `CMK-CI`.

**Measurements this consolidation added (2026-09-26).** Sources and scripts
are in
[`cmake-testing-and-ci/scratch/testing-and-ci-consolidation/`](cmake-testing-and-ci/scratch/testing-and-ci-consolidation/)
(`run.sh`, `ctestargs.sh`, `subgate.sh`, `launcher.sh`, `offline-docker.sh`,
`ci-ctest-census.sh`). Build trees are under
`/home/mherwig/.cache/cmake-measure-scratch/testing-and-ci-consolidation/`.

| Tag | What was run | Result, same on 3.31.12 and 4.4.2 unless noted |
|---|---|---|
| T1 | `ctest` on a tree with `enable_testing()` and no `add_test` | bare: **rc 0**. `--no-tests=error`: rc 8. `CTEST_NO_TESTS_ACTION=error`: rc 8 |
| T2 | `ctest -V` on a 3 s test: `include(CTest)` vs `enable_testing()` only | `include(CTest)`: `TimeOut: 1500` in `DartConfiguration.tcl`, "timeout computed to be: 1500". `enable_testing()`: no Dart file, "timeout computed to be: 10000000", which is effectively unbounded. `--timeout 1`: rc 8. **`CTEST_TEST_TIMEOUT=1` in the environment: ignored, the test passes** (4.4.2) |
| T3 | `-C` against the generator | `-C Release` on single-config Ninja: rc 0, but a test with `CONFIGURATIONS Debug` in a Debug tree is silently not run (verify wave 3). Ninja Multi-Config without `-C`: every test "Test not available without configuration", **rc 8**. With `-C Debug`: rc 0 |
| T4 | ClickHouse's sentinel (`cmake -E echo` + `WILL_FAIL ON`) beside a plain `cmake -E false` | both **Failed**. The inversion buys nothing the direct form lacks |
| T5 | zero tests through `cmake --build <b> --target test` | no arguments: **rc 0**. `-DCMAKE_CTEST_ARGUMENTS=--no-tests=error;--output-on-failure`: nonzero |
| T6 | a consumer with `include(CTest)` does `add_subdirectory` on two libraries | the library that guards on `BUILD_TESTING` **leaks its test** into the consumer's `ctest -N`. The one that guards on `option(LIBTOP_BUILD_TESTS … ${PROJECT_IS_TOP_LEVEL})` does not, and still has its test when built standalone |
| T7 | `set(CMAKE_C_COMPILER_LAUNCHER projlauncher)` in project code, with `-DCMAKE_C_COMPILER_LAUNCHER=userlauncher` on the command line | unconditional `set()`: `build.ninja` uses **projlauncher**, so the caller's `-D` is shadowed. Guarded by `if(NOT DEFINED …)`: userlauncher |
| T8 | `docker run --rm --network none` with the checkout, the pinned CMake 4.4.2 and ninja mounted read-only | no-network project: rc 0. FetchContent of an https URL: rc 1, `status_string: "Could not resolve hostname"`. The same image with no generator mounted: rc 1 |
| T9 | census of `.github/workflows` over the 46-repo corpus at the [map] H8 SHAs | 18 repos run `ctest` from a workflow (word match; the first count's substring match also took duckdb's `sqllogictest` and ccache's `doctest`, verify wave 3). **1 carries `--timeout`** (arrow; duckdb's hit is `retry.py --timeout`). **4 carry `--no-tests=error`** (boost, Catch2, cmake-init, protobuf). Scripts outside `.github/workflows` are not counted |

## Verdict

1. **A green CTest step must prove that tests ran and that none of them hung.
   It is MUST for every project that runs `ctest` in CI.** A bare `ctest`
   passes with zero tests (T1), and so does a `test` target (T5).
   `enable_testing()` alone leaves every test unbounded (T2). The CI line
   is `ctest --test-dir <b> -C <cfg> --output-on-failure --no-tests=error --timeout <s>`
   (CMK-TEST-06, -07). Of 18 corpus repos that run ctest from a workflow, 4
   guard zero tests and 1 bounds the runtime (T9).
2. **A library that others consume gates its tests on being top level, never
   on `BUILD_TESTING` alone. This is MUST for a library shipping a package
   or meant to be vendored.** T6 measured the leak. The ctest-contract dive's
   "86 % unguarded" figure is an upper bound, because its classifier missed
   project-prefixed options (conflict 5).
3. **`CMK-TEST-03` binds every test suite, not only module harnesses, and
   belongs in the `cmake-build` index's non-negotiables.** Outside CMake's own
   tests of CTest, all 20 real `WILL_FAIL` uses in the corpus are bare
   ([ctest] §4). module-authoring explicitly handed this decision to the
   ctest-contract dive, and the count settles it.
4. **Presets: two MUSTs, and everything else SHOULD or out.** The declared
   schema must parse on the oldest CMake any leg runs (CMK-CI-01), and
   `CMakeUserPresets.json` is never committed (CMK-CI-02). Each CI leg
   configures through a named preset (SHOULD, CMK-CI-03), which is the map's
   conflict-12 decision held. Workflow presets get no rule: 0 of 46 repos
   use them ([presets] §9). `cmake-instrumentation(7)` and the file API get
   no rule either (M-J-11).
5. **Pinning the CMake that CI runs stays `CMK-VER-03`.** The presets dive's
   pinning rule duplicated it and is dropped (conflict 11).
6. **Offline probes on hosted Ubuntu 24.04 run in a `--network none`
   container, not under bare `unshare -rn` (SHOULD, CMK-CI-05).** This binds
   whoever runs the `CMK-DEP-16` and `CMK-BZL-01` probes in CI: a library
   shipping a package, a recipe or port author, a Bazel-wrapped dependency.
   It stays SHOULD because nobody here has run it on a GitHub runner
   (Open questions).
7. **A compiler launcher belongs to the caller.** Project code offers a
   default only under `if(NOT DEFINED …)` (T7). This binds applications and
   libraries alike (SHOULD, CMK-CI-04).
8. **Folded or cited, not re-ruled:** `CMAKE_POLICY_DEFAULT_CMP0077` around a
   dependency's test toggle is `CMK-DEP-15`. Deterministic optional
   dependencies stay `CMK-DEP-18` at CONSIDER: 0 real CI adopters, and 175
   of 178 raw hits are vcpkg's own portfile isolation ([ctest] §8). The
   round trip in CI is `CMK-INST-18`. The dev-to-author rename is
   `CMK-CORE-02`. CMP0158 and CMP0178 are `CMK-VER-02`'s business
   (conflict 9). `RESOURCE_LOCK`, `RESOURCE_GROUPS`, `FIXTURES_*` and
   `--schedule-random` are dropped: 0 corpus adopters for the resource
   mechanisms, and knowing them would not change what an agent writes.

### Conflicts resolved

1. **ID collision.** The map gave `CMK-TEST` to both module-authoring and
   testing-and-ci. Module-authoring shipped 01-05 first. **Resolved:** those
   IDs stay; this file starts at 06, and the depth file `testing.md` carries
   both ranges under two headings.
2. **When `--no-tests` arrived.** [ctest] says 3.26 for the flag. In the
   `ctest.1.rst` at v4.4.2, the `versionadded:: 3.26` line sits beside the
   environment-variable sentence, not the option. The v3.17 manual on
   cmake.org lists `--no-tests` and the v3.16 manual does not.
   **Resolved (normative):** the flag is 3.17 and `CTEST_NO_TESTS_ACTION` is
   3.26. Both are below the 3.25 floor, so the MUST carries no gate.
3. **How to bound a suite.** [ctest] offers `CTEST_TEST_TIMEOUT` as a CI
   knob and never mentions the Dart default. **Resolved (measured, T2):**
   `CTEST_TEST_TIMEOUT` is a dashboard-script variable, and the environment
   form does nothing. `include(CTest)` sets 1500 s through
   `Modules/CTest.cmake:180` @ v4.4.2, and `enable_testing()` alone sets no
   bound. The rule names `--timeout`.
4. **`CMAKE_CTEST_ARGUMENTS`.** [ctest]'s AI-agent item 6 calls it a
   hallucinated variable. **Refuted:** it is `versionadded:: 3.17`
   (`cmake --help-variable`, 4.4.2), and T5 shows it carries
   `--no-tests=error` through the `test` target. That dive item is itself
   the failure mode, and here it becomes a rule clause.
5. **"86 % of `add_subdirectory(test*)` sites are unguarded."** [ctest] §7
   only recognised `BUILD_TESTING` and `PROJECT_IS_TOP_LEVEL` tokens within 8
   lines. It counted fmt (`option(FMT_TEST … ${FMT_MASTER_PROJECT})`,
   `CMakeLists.txt:89,622-624`) and spdlog (`SPDLOG_BUILD_TESTS` default
   OFF, `:79,360-363`) as unguarded, yet both are correct. **Resolved:** the
   figure is an upper bound and no shipped text may quote it. The rule is
   stated from T6. The true count is commissioned (Open questions).
6. **ClickHouse's `WILL_FAIL` sentinel.** [ctest] exempts it from
   `CMK-TEST-03` and describes it as a failing test made loud. It is the
   reverse: `cmake -E echo` succeeds and `WILL_FAIL` inverts that into a
   failure. **Resolved (T4):** `COMMAND ${CMAKE_COMMAND} -E false` fails the
   same way with no inversion. The `CMK-TEST-03` grep keeps listing the
   sentinel, and the fix is one token.
7. **The CMP0077 remedy for a dependency's test toggle.** Three positions:
   [resolution] §6 says the global default is the only fix; [ctest]
   candidate 5 accepts a `-D` cache entry; `CMK-DEP-15` measured set and
   restore around the one call (C3). **Resolved:** `CMK-DEP-15` governs, as
   the later and verified consolidation. No `CMK-TEST` rule restates it.
8. **Discovery under cross-compiling.** [ctest] makes `DISCOVERY_MODE
   PRE_TEST` a MUST. The GoogleTest module text (4.4.2) says discovery
   "requires that `CROSSCOMPILING_EMULATOR` is properly set". `PRE_TEST`
   only moves discovery to wherever ctest runs. **Resolved (normative):**
   either one satisfies the rule, which is SHOULD because the failure is
   loud and only two starter templates use a discovery macro.
9. **CMP0158 and CMP0178 "never warn".** [ctest] §9 says neither warns.
   `cmake --help-policy` on 4.4.2 says CMP0178 warns when unset and CMP0158
   does not. **Resolved:** a `3.25...4.4` range sets both NEW, so
   `CMK-VER-02`'s range rule covers them and no row is added.
10. **Presets in CI.** [presets] CMK-CI-01 said every configure preset must
    be invoked by CI, or not shipped. The map's conflict 12 said "one
    configure preset per CI leg". LLVM ships hidden ingredient presets on
    purpose. **Resolved:** the rule binds the CI-to-preset direction.
    Developer presets and hidden presets are legal. The finding is a
    CI-named preset that CI never calls (cmake_template).
11. **Pinning CI's CMake.** [presets] CMK-CI-03 restates `CMK-VER-03`.
    **Resolved:** dropped. `CMK-VER-03` keeps the text. Its grep
    (`get-cmake`, `setup-cmake`, `cmake==`) misreads a lockfile-pinned
    provisioner as floating, and find_ocx is the case: it pins cmake 3.31
    in `ocx.toml:3` and `ocx.lock`. That false positive is handed back to
    CMK-VER.
12. **find_ocx and presets.** [presets] says find_ocx ships
    `test/CMakePresets.json` and floats the runner CMake. Both claims are
    wrong. That file is `/home/mherwig/dev/test/`, which is not a git repo
    and not find_ocx ([fleet] §1). find_ocx tracks no presets file
    (`git ls-files`) and pins its CMake, as in conflict 11. **Resolved:**
    CMK-CI-01..03 are vacuous for find_ocx.
13. **The offline probe command.** [presets] ships
    `docker run --rm --network none gcc:14 cmake -S . -B build`. It mounts no
    checkout, and the `gcc:14` image (FROM `buildpack-deps:trixie`) installs
    no cmake. The upstream Dockerfiles have zero `cmake` tokens.
    **Resolved (T8):** mount the checkout, and use an image that carries the
    pinned CMake and generator.
14. **Severity of the offline-probe rule.** [presets] rates it MUST. The
    runner failure rests on an issue report, a closed PR and Ubuntu's own
    post; none of it was measured on a runner, and `unshare` fails loudly.
    **Resolved:** SHOULD.
15. **`CMakeUserPresets.json` severity.** `CMK-CONAN-08` is SHOULD for the
    Conan case. The general rule has normative text (`cmake-presets.7.rst:33-34`
    @ v4.4.2: "should NOT be checked in") and 0 of 6 real corpus projects
    track the file. **Resolved:** CMK-CI-02 is MUST and CONAN-08 keeps its
    Conan-specific consequence and cites CI-02. The severity alignment is an
    owner note.

## The ruleset

Verification variables: `CI_DIR` names one directory that holds CI
definitions or scripts. Run each command once per such directory, for
example with `CI_DIR=.github` and then `CI_DIR=ci`; a quoted `"$CI_DIR"`
holding two names is one missing path to grep. Run each command from the
repository root.

### CMK-TEST — suite-level CTest (`cmake-build/testing.md`, continues 01-05)

Consumer kind: every project that runs `ctest` in CI, unless a row says
otherwise. `CMK-TEST-01..05` (module harnesses) are in
`cmake-module-authoring.md`.

#### Caught by reading the CI ctest line

**CMK-TEST-06 — Run CTest in CI as
`ctest --test-dir <build> -C <config> --output-on-failure --no-tests=error`.
When CI runs tests through the build's `test` target, put the same flags in
`CMAKE_CTEST_ARGUMENTS`.**
- Match `-C` to the build's configuration: the `--config` of the build
  step on multi-config legs, `CMAKE_BUILD_TYPE` on single-config legs. Pass
  it unconditionally. A single-config tree runs every test under any `-C`,
  except a test restricted by `add_test(… CONFIGURATIONS …)`, which a wrong
  or missing `-C` drops without a word (3.31.12, 4.4.2).
- A `ctest --preset` passes when its test preset sets
  `"execution": {"noTestsAction": "error"}`.
- Rationale: T1, T3 and T5 on both lines. A zero-test tree, a `-R` or `-L`
  filter that matches nothing, and a `test` target all exit 0. `ctest.1.rst`
  @ v4.4.2 says `--no-tests` covers the case where "the given arguments
  exclude all tests". Multi-config without `-C` fails every test. A
  `--test-dir` that names a directory with no `CTestTestfile.cmake` also
  exits 0 on 3.31.12, 4.3.4 and 4.4.2 and exits 8 with `--no-tests=error`;
  4.4's new nonzero exit for a missing test file covers only a bare `ctest`
  with no arguments (`ctest.1.rst` @ v4.4.2, measured).
- Verification: the command below. It prints each CI file that runs ctest
  or the `test` target with no zero-test guard. Empty output passes; each
  file printed is a finding, unless its only run is `ctest --preset <p>` and
  that test preset sets `execution.noTestsAction` to `error`. Then read every
  invocation in the other files: a file can hold one guarded line and one
  bare one, a multi-line call spans lines, and a `CMAKE_CTEST_ARGUMENTS`
  without `--no-tests=error` does not count.

  ```sh
  grep -rlw -e 'ctest' -e '--target test' "$CI_DIR" | xargs -r grep -L -e 'no-tests=error' -e 'CTEST_NO_TESTS_ACTION' -e 'CMAKE_CTEST_ARGUMENTS' -e 'noTestsAction'
  ```

- Severity: **MUST**. Floor: `--no-tests` and `CMAKE_CTEST_ARGUMENTS` 3.17,
  `--test-dir` 3.20, and `CTEST_NO_TESTS_ACTION` 3.26.

**CMK-TEST-07 — Bound every test's run time in CI: `--timeout <seconds>` on
the ctest line, or in `CMAKE_CTEST_ARGUMENTS` or the test preset's
`execution.timeout`, plus a per-test `TIMEOUT` for the few tests that need
longer.**
- `enable_testing()` alone sets no bound. `include(CTest)`'s default of
  1500 s is a bound nobody chose. `CTEST_TEST_TIMEOUT` in the environment
  does nothing.
- Rationale: T2 on both lines. Without a bound, a hung test holds the whole
  job until the runner's own job timeout. `--timeout` applies only to tests
  that lack their own `TIMEOUT` (`ctest.1.rst:514-521` @ v4.4.2). Only 1 of
  18 corpus repos that run ctest from a workflow passes it (T9).
- Verification: the first command prints each CI file that runs ctest or
  the `test` target with no `--timeout`. Empty output passes. A file whose
  only run is `ctest --preset <p>` passes when that test preset sets
  `execution.timeout`. For each other file printed, run the second command.
  Empty output from it is the finding. A hit passes only if every `add_test`
  carries its own `TIMEOUT`; an `include(CTest)` hit alone is the 1500 s
  default this rule rejects, so it is still the finding.

  ```sh
  grep -rlw -e 'ctest' -e '--target test' "$CI_DIR" | xargs -r grep -L -e '--timeout' -e '"timeout"'
  grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'TIMEOUT' -e 'include(CTest)' .
  ```

- Severity: **MUST**. Floor: any version.

**CMK-TEST-08 — Never put `--repeat until-pass` or `--repeat after-timeout`
on a gating ctest line.** Keep either one for a named, temporary flake-hunt
job that cites an issue. `--repeat until-fail:<n>` finds flakes and may run
anywhere.
- Rationale: `ctest.1.rst:375-397` @ v4.4.2 calls `until-pass` and
  `after-timeout` a way of "tolerating" sporadic failures, so on a gate every
  future flaky test turns green on retry. Arrow runs `until-pass:3` on every
  job that calls its script
  (`apache__arrow@3ad410b7b1:ci/scripts/cpp_test.sh:114`).
- Verification: the command below. Empty output passes. A hit in a job that
  runs on every push or pull request is the finding.

  ```sh
  grep -rn -e 'until-pass' -e 'after-timeout' "$CI_DIR"
  ```

- Severity: SHOULD. Floor: any version.

#### Caught by an as-subproject smoke build

**CMK-TEST-09 — Gate the test tree of a library that others consume on a
project-prefixed option whose default is `PROJECT_IS_TOP_LEVEL` (or `OFF`).
Never gate it on `BUILD_TESTING` alone. Call `include(CTest)` inside the
gate.** Run the smoke build below as a named CI job.

```cmake
option(MYLIB_BUILD_TESTS "Build MyLib's tests" ${PROJECT_IS_TOP_LEVEL})
if(MYLIB_BUILD_TESTS)
  include(CTest)
  add_subdirectory(tests)
endif()
```

- Binds: a library shipping a package, or a library meant to be vendored or
  fetched. A pure top-level application is exempt.
- Rationale: T6 on both lines. A consumer's `include(CTest)` turns
  `BUILD_TESTING` on for the whole tree, and the dependency's tests land in
  the consumer's `ctest -N`. [resolution] §7 measured the same leak with
  `PROJECT_IS_TOP_LEVEL`. A parent cannot flip a toggle in a dependency whose
  floor is below 3.13 with a plain `set()`; that is `CMK-DEP-15`. curl's
  as-subproject job is the reference CI shape
  (`curl__curl@98519dac83:.github/workflows/distcheck.yml:317-329`).
- Verification: the static read comes first. Each hit must sit inside an
  `if()` on a project-prefixed option whose default is top-level-only or
  `OFF`. A `BUILD_TESTING`-only guard, or an unprefixed option that defaults
  to `ON`, is the finding. Then run the smoke build. A consumer that
  `add_subdirectory`s the library after `include(CTest)` must list only its
  own tests in `ctest -N`.

  ```sh
  grep -rn --include='CMakeLists.txt' -e 'add_subdirectory(test' -e 'add_subdirectory (test' -e 'add_subdirectory(unittest' .
  ```

- Severity: **MUST**. Floor: `PROJECT_IS_TOP_LEVEL` needs 3.21. Below that,
  compare `CMAKE_SOURCE_DIR` with `PROJECT_SOURCE_DIR`, as cmake-init's shim
  does.

#### Caught by reading discovery calls

**CMK-TEST-10 — On a cross-compiling leg, give every `gtest_discover_tests`
or `catch_discover_tests` a `CROSSCOMPILING_EMULATOR` on the test target, or
use `DISCOVERY_MODE PRE_TEST` with ctest running in the target environment.**
- Plain `add_test` per test binary remains an acceptable default:
  googletest and Catch2 use it for their own suites.
- Call 4.4's generic `discover_tests()` only under
  `CMAKE_VERSION VERSION_GREATER_EQUAL 4.4`.
- Rationale: the GoogleTest module (4.4.2) says discovery "requires that
  `CROSSCOMPILING_EMULATOR` is properly set in order to function in a
  cross-compiling environment". The default `POST_BUILD` runs the built
  binary on the build host. `DISCOVERY_MODE` and
  `CMAKE_GTEST_DISCOVER_TESTS_DISCOVERY_MODE` are 3.18; only
  `DISCOVERY_EXTRA_ARGS` is 3.31 ([ctest] §6). `discover_tests()` has 0
  adopters outside Kitware.
- Verification: the command below. Empty output means the rule does not
  apply. For each hit on a tree that has a cross leg, read it for an emulator
  or `PRE_TEST`. A hit with neither is the finding.

  ```sh
  grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'gtest_discover_tests' -e 'catch_discover_tests' -e 'discover_tests(' .
  ```

- Severity: SHOULD. Floor: `gtest_discover_tests`' `DISCOVERY_MODE` 3.18;
  `catch_discover_tests`' `DISCOVERY_MODE` is Catch2's own module and needs
  Catch2 3.4.0 (`catchorg__Catch2@222e233903:docs/release-notes.md:540`);
  `discover_tests()` 4.4.

### CMK-CI — presets and pipelines (`cmake-build/presets-and-ci.md`)

Consumer kind: any project with a `CMakePresets.json` or a CI pipeline that
runs CMake, unless a row says otherwise.

#### Caught by jq and git over the presets files

**CMK-CI-01 — Keep a committed presets file's `"version"` at or below the
schema ceiling of the oldest CMake any CI leg runs.**

| Schema | Needs CMake | Schema | Needs CMake |
|---|---|---|---|
| 6 | 3.25 | 10 | 3.31 |
| 7 | 3.27 | 11 | 4.3 |
| 8 | 3.28 | 12 | 4.4 |
| 9 | 3.30 | 13 | not released (4.5, `master` only) |

- Rationale: measured in [presets] §1. 3.31.12 rejects schema 12 with
  `Unrecognized "version" 12: must be >=1 and <=10`, rc 1. The
  `ubuntu-24.04` and `windows-2025` images default to 3.31.6 (CMK-VER-03), so
  a schema-11 file fails there while the author's newer local CMake accepts
  it. The table comes from `cmake-presets.7.rst` @ v4.4.2. Renaming `dev` to
  `author` at schema 12 is `CMK-CORE-02`.
- Verification: the command below prints each file's schema and the files
  it includes. Run the same `jq` on every included file (paths are relative
  to the including file), because each one carries its own `"version"` and
  3.31.12 rejects a schema-11 include under a schema-10 root. Compare every
  number with the lowest CMake among the CI legs (their pins, or the image
  default when a leg pins nothing). A number above that version's ceiling is
  the finding. Empty output means no presets file, and the rule does not
  apply.

  ```sh
  find . -name CMakePresets.json -not -path '*/_deps/*' -print0 | xargs -0 -r -n1 jq -r '(input_filename) + " " + (.version | tostring), (.include[]? | "  includes " + .)'
  ```

- Severity: **MUST**. Floor: presets exist from 3.19.

**CMK-CI-02 — Never commit `CMakeUserPresets.json`. List it in `.gitignore`.**
- Rationale: `cmake-presets.7.rst:33-34` @ v4.4.2 says it "should NOT be
  checked in". 0 of 6 real corpus projects track one, and 4 of 5 ignore it
  ([presets] §7). Conan writes the file and silently skips a hand-written
  one (`CMK-CONAN-08`). The user file includes `CMakePresets.json` implicitly
  at every schema, so it never needs an `include` ([presets] §1).
- Verification: the command below. Empty output passes; any line printed is
  the finding.

  ```sh
  git ls-files -- '*CMakeUserPresets.json'
  ```

- Severity: **MUST**. Floor: 3.19.

#### Caught by matching workflow steps against preset names

**CMK-CI-03 — Configure each CI leg with `cmake --preset <name>`, and pass
the matrix axes as `-D` or `-G` on top of it. Ship no CI-named preset that CI
does not call. Compose OS, compiler and configuration from hidden bases with
`inherits` and `condition`, not one flat preset per combination.**
- Rationale: map conflict 12 decided SHOULD. Only vcpkg-tool is fully 1:1
  (`microsoft__vcpkg-tool@51bf87ca6e:.github/workflows/build.yaml:42-43,60`).
  Catch2's hybrid, one preset plus the axes, is the cheaper conforming
  shape. cmake_template defines `ci-*` presets and then rebuilds the same
  matrix with raw flags
  (`cpp-best-practices__cmake_template@b86318abbf:.github/workflows/ci.yml:165`),
  so its presets drift unseen. The cross-product problem is open upstream as
  gitlab#22538 (44 upvotes, 2026-04-27).
- Verification: a reading heuristic built on two commands. Every non-hidden
  preset that CI is meant to use must appear among the second command's
  hits. Empty second output with presets present means they are decorative
  (finding). Hidden ingredient presets and plainly local developer presets
  are not findings.

  ```sh
  jq -r '.configurePresets[] | select(.hidden != true) | .name' CMakePresets.json
  grep -rn -e 'cmake --preset' -e 'ctest --preset' -e '--preset=' "$CI_DIR"
  ```

- Severity: SHOULD. Floor: `condition` needs schema 3 (3.21), `include`
  schema 4 (3.23).

#### Caught by one grep for the launcher

**CMK-CI-04 — Set a compiler launcher only as the cache entry
`CMAKE_<LANG>_COMPILER_LAUNCHER`, from one place: a preset's
`cacheVariables`, a `-D`, or the environment variable of that name.**
- Project code that offers a default wraps it in
  `if(NOT DEFINED CMAKE_<LANG>_COMPILER_LAUNCHER)` and picks one tool with
  `find_program(NAMES sccache ccache)`.
- Never use `RULE_LAUNCH_COMPILE`, and never set a chained list.
- Rationale: T7 on both lines. An unconditional `set()` shadows the
  caller's `-D` and nothing reports it. Arrow guards with
  `AND NOT CMAKE_C_COMPILER_LAUNCHER`
  (`apache__arrow@3ad410b7b1:cpp/CMakeLists.txt:237-238`). ClickHouse is
  the half-way case: it returns early only when the caller's launcher
  matches `ccache`, and prepends its own to any other launcher as a chained
  list (`ClickHouse__ClickHouse@0995a518a8:cmake/ccache.cmake:15,97-98`). 13 of 46 corpus
  repos wire a launcher, and none does it in a presets file ([presets] §6).
- Verification: the command below. Every `RULE_LAUNCH_COMPILE` hit is a
  finding. A `set(CMAKE_<LANG>_COMPILER_LAUNCHER …)` outside an
  `if(NOT DEFINED …)` or `if(NOT CMAKE_<LANG>_COMPILER_LAUNCHER)` guard is a
  finding. Empty output means no launcher, and the rule does not apply.

  ```sh
  grep -rn --include='CMakeLists.txt' --include='*.cmake' --include='CMakePresets.json' --include='*.yml' --include='*.yaml' -e 'COMPILER_LAUNCHER' -e 'RULE_LAUNCH_COMPILE' .
  ```

- Severity: SHOULD. Floor: the cache variable needs 3.4, the environment
  variable 3.17.

#### Caught by reading the offline job

**CMK-CI-05 — On a hosted `ubuntu-24.04` runner, run the offline probes of
`CMK-DEP-16` and `CMK-BZL-01` inside a `--network none` container.** Mount
the checkout, use an image that carries the pinned CMake and generator, and
never follow the probe with `|| true`.

```sh
docker run --rm --network none -v "$PWD:/src" -w /src "$IMAGE" \
  cmake -S . -B build-offline -DFETCHCONTENT_FULLY_DISCONNECTED=ON -DCMAKE_POLICY_DEFAULT_CMP0170=NEW
```

- Binds: a library shipping a package, a recipe or port author, and a
  Bazel-wrapped dependency, which are the populations of those two MUSTs.
- Rationale: Ubuntu 24.04 restricts unprivileged user namespaces
  (`kernel.apparmor_restrict_unprivileged_userns=1`). The failure is
  reported on the stock image as actions/runner-images#10443. The fix PR,
  #11489, was closed unmerged ([presets] §12). T8 shows the container probe
  passes a clean tree and fails a fetch with "Could not resolve hostname",
  and that the image must carry the build tool. macOS runners have no
  Docker, and the probe is Linux-scoped there as it always was.
- Verification: the command below. A hit in a job on `ubuntu-24.04` or
  `ubuntu-latest` is the finding. Also read every `--network none` step: one
  ending in `|| true` is the finding. Empty output passes.

  ```sh
  grep -rn -e 'unshare -rn' -e 'unshare --net' "$CI_DIR"
  ```

- Severity: SHOULD. Floor: none; this is CI wiring, not a CMake feature.

## Applied to find_ocx and the exemplars

find_ocx is read in its dirty working tree on 2026-09-26. Corpus SHAs are
those of [map] H8.

| Rule | Satisfied by | Violated by | find_ocx |
|---|---|---|---|
| TEST-06 | `boostorg__boost@a61cfa03ba:.github/workflows/ci.yml:290`; `friendlyanon__cmake-init@7e0c52fc73:.github/workflows/ci.yml:121`; Catch2 (5 of 5 workflow files, T9) | `gflags__gflags@bdda022e7c:.github/workflows/test.yml:51` (`cd build && ctest`); 14 of 18 ctest-running repos lack the guard (T9) | **Violated**: `.github/workflows/ci.yml:88`, `taskfile.yml:39,48` carry `--test-dir` and `--output-on-failure` but not `--no-tests=error`. **New commitment** |
| TEST-07 | `apache__arrow@3ad410b7b1:ci/scripts/cpp_test.sh:115` (`--timeout`) | 17 of 18 ctest-running repos pass no `--timeout` from a workflow (T9) | **Violated**: `CMakeLists.txt:11` uses `enable_testing()` only, there is no `TIMEOUT`, and the harness talks to the live registry (`ci.yml:62-63`), so a stalled pull hangs the job (T2). **New commitment** |
| TEST-08 | Kitware uses `--repeat` only inside RunCMake tests of the feature ([ctest] §10) | `apache__arrow@3ad410b7b1:ci/scripts/cpp_test.sh:114` (`until-pass:3` on every job) | Satisfied: no `--repeat` |
| TEST-09 | `fmtlib__fmt@522e2c12ab:CMakeLists.txt:89,622-624`; `gabime__spdlog@5b63780337:CMakeLists.txt:79,360-363` | `curl__curl@98519dac83:CMakeLists.txt:1922-1927,1948-1949` (derived from `BUILD_TESTING`); `ccache__ccache@b471bbde29:CMakeLists.txt:73,134-137` (unprefixed `ENABLE_TESTING`, default ON) | Not applicable: the harness is never consumed as a subproject |
| TEST-10 | cmake-init and cmake_template use `catch_discover_tests` with no cross leg | none found: 0 production adopters | Not applicable |
| TEST-03 (cited, scope widened) | `Kitware__CMake@e8befb989b:Tests/RunCMake/RunCMake.cmake:26-58` | `catchorg__Catch2@222e233903:tests/CMakeLists.txt:312,351,611`; `madler__zlib@767c4c9478:test/CMakeLists.txt:256-258`; `ClickHouse__ClickHouse@0995a518a8:utils/wasm-parser/CMakeLists.txt:317` (sentinel, conflict 6) | Violated per `cmake-module-authoring.md` (message-only regexes) |
| CI-01 | 3.31.12 accepts schema 10 (measured) | 3.31.12 rejects 12, and 4.4.2 rejects `errors.dev` at 12 (measured) | Not applicable: no presets file (conflict 12) |
| CI-02 | `.gitignore` in Catch2, cmake_template, vcpkg-tool, llvm-project ([presets] §7) | none. cmake-init's tracked copy is template output, not a violation | Not applicable: no user presets file |
| CI-03 | `microsoft__vcpkg-tool@51bf87ca6e:.github/workflows/build.yaml:42-43,60`; Catch2's hybrid | `cpp-best-practices__cmake_template@b86318abbf:.github/workflows/ci.yml:165`; arrow's 63 presets and 0 workflow `--preset` outside the JNI legs ([presets] §3) | Not applicable |
| CI-04 | `apache__arrow@3ad410b7b1:cpp/CMakeLists.txt:237-238` | `filipdutescu__modern-cpp-template@0fab2c3552:cmake/StandardSettings.cmake:87`; `Tencent__rapidjson@24b5e7a8b2:CMakeLists.txt:51` (`RULE_LAUNCH_COMPILE`); `ClickHouse__ClickHouse@0995a518a8:cmake/ccache.cmake:97-98` (chains its launcher onto a non-ccache one) | Not applicable: `LANGUAGES NONE` |
| CI-05 | none: 0 corpus repos run a network-namespace probe in CI | none measured | Not applicable: the `offline` job (`ci.yml:90-112`) tests the tool's own offline mode, not a network-free configure |

**New commitments.** TEST-06 and TEST-07 join the find_ocx handoff note
(map "Owner decisions" 5, where no issue gets filed). find_ocx's
`CMK-VER-03` status flips from violated to satisfied in intent, because its
pin is a lockfile (conflict 11).

## AI-agent failure modes

Ranked by how often the corpus shows each one.

1. **Copying a bare `ctest` line from a README.** 14 of 18 ctest-running
   repos have no zero-test guard (T9). A typo in `add_test`, a filter that
   matches nothing, or a missing `-C` then reads as green.
   *Check:* the CMK-TEST-06 command.
2. **Leaving tests unbounded.** 17 of 18 repos pass no `--timeout` (T9). An
   agent believes `CTEST_TEST_TIMEOUT` in `env:` bounds them, and it does
   not (T2). *Check:* the CMK-TEST-07 command.
3. **Treating `WILL_FAIL TRUE` as a negative test.** 20 of 20 real uses are
   bare ([ctest] §4). *Check:* the `CMK-TEST-03` grep.
4. **Guarding a library's tests with `if(BUILD_TESTING)`.** The consumer's
   `include(CTest)` then pulls them in (T6). *Check:* the CMK-TEST-09 static
   read, then `ctest -N` on the smoke build.
5. **Hard-coding a launcher with `set(CMAKE_CXX_COMPILER_LAUNCHER ccache)`,
   or `RULE_LAUNCH_COMPILE`,** copied from old tutorials. It overrides the
   user's choice (T7). *Check:* the CMK-CI-04 grep.
6. **Bumping presets to the newest schema.** The newest local CMake accepts
   it, and the 3.31.6 runner rejects it. *Check:* the CMK-CI-01 `jq`
   against the leg versions.
7. **Committing `CMakeUserPresets.json` "so the team shares a setup."**
   *Check:* the CMK-CI-02 `git ls-files` pathspec.
8. **Writing CI-named presets and then a hand-rolled matrix beside them.**
   *Check:* the CMK-CI-03 name match.
9. **Adding `--repeat until-pass:3` to "fix flaky CI".** *Check:* the
   CMK-TEST-08 grep.
10. **Emitting `unshare -rn` in a GitHub workflow,** then silencing the
    `Operation not permitted` with `|| true`. *Check:* the CMK-CI-05 grep.
11. **Claiming `CMAKE_CTEST_ARGUMENTS` does not exist.** The ctest-contract
    dive did exactly this. It exists from 3.17 (conflict 4). *Check:*
    `cmake --help-variable CMAKE_CTEST_ARGUMENTS` on the pinned binary.
12. **Prescribing `cmake --workflow` or 4.4's `discover_tests()` as "the
    modern way".** They have 0 and 0 real adopters. *Check:* the pinned
    binary's `--help-command discover_tests`, and the CMK-TEST-10 gate.
13. **Passing `-DCMAKE_BUILD_TYPE` on a multi-config leg and believing it
    selects the configuration.** cmake_template's CI does this
    (`ci.yml:165` beside `--config` at `:170`). *Check:* the `-C` clause of
    CMK-TEST-06, which fails loudly on a mismatch (T3).

## Open questions

**Owner decisions** (the defaults apply if nobody answers):

1. `CMK-TEST-03` in the `cmake-build` index's non-negotiables. **Default:
   yes** (Verdict 3). Module-authoring asked this group to decide.
2. `CMK-CONAN-08` (SHOULD) against `CMK-CI-02` (MUST), which cover the same
   act. **Default:** CONAN-08 becomes a citation of CI-02 plus its
   Conan-specific consequence, at the package-managers revision.
3. The `CMK-VER-03` grep misreads a lockfile-pinned provisioner as a floating
   CMake. **Default:** the versions-and-gate owner adds a clause that
   recognises a pinned tool lock; nothing in this file changes.
4. The find_ocx handoff note gains `CMK-TEST-06` and `-07`. **Default:** no
   issue is filed.

**Another research round:**

- **testing-and-ci / as-subproject corpus reclassification.** How many of
  the 101 non-Kitware `add_subdirectory(test*)` sites are really unguarded
  once each guard variable is resolved to its option default (fmt and
  spdlog style) or its `BUILD_TESTING` derivation (curl style)? The answer
  sets CMK-TEST-09's shipped prevalence line, which currently must not quote
  86 %.
- **presets-and-ci / a hosted-runner measurement.** Does `unshare -rn` fail,
  and does the T8 container probe pass, on a real GitHub `ubuntu-24.04` and
  `ubuntu-latest` runner (`workflow_dispatch` in a scratch repository)? A
  yes on both raises CMK-CI-05 to MUST. A pass for `unshare` retires the
  rule.
- **ctest-contract / CI lines outside `.github/workflows`.** T9 skips
  `ci/*.sh`, Kokoro and GitLab scripts. Arrow's timeout lives in one of
  them. Re-run the census over every script CI calls to firm up the
  TEST-06 and TEST-07 counts.

## Revision log

- 2026-09-26, verify wave 3: T9 corrected from 20 repos, 2 with `--timeout`, to 18 repos, 1 with `--timeout`; duckdb (`sqllogictest`, `retry.py --timeout`) and ccache (`doctest`) were substring hits. Verdict 1, TEST-07's rationale, the applied table and failure modes 1-2 follow.
- 2026-09-26, verify wave 3: TEST-06's `-C` bullet no longer says single-config trees ignore `-C`; a `CONFIGURATIONS`-restricted test is dropped silently by a wrong or missing `-C` (measured 3.31.12, 4.4.2). T3 notes it.
- 2026-09-26, verify wave 3: TEST-06 rationale gains the measured wrong-`--test-dir` case (rc 0 bare, rc 8 guarded, on 3.31.12, 4.3.4, 4.4.2).
- 2026-09-26, verify wave 3: TEST-06 and TEST-07 first commands match `ctest` as a word and add `--target test`; the substring form flagged `doctest` and `sqllogictest` and missed a `test`-target run (planted fixtures). Both now say how a `ctest --preset` run passes.
- 2026-09-26, verify wave 3: TEST-07's verification no longer accepts `include(CTest)`'s 1500 s as a pass, which contradicted the rule's own first bullet.
- 2026-09-26, verify wave 3: TEST-10's floor separates Catch2's `DISCOVERY_MODE` (Catch2 3.4.0) from GoogleTest's (CMake 3.18).
- 2026-09-26, verify wave 3: CI-01's command also lists included presets files; the published form printed 10 for a root whose schema-11 include 3.31.12 rejects.
- 2026-09-26, verify wave 3: CI-04 no longer cites ClickHouse as satisfying the rule; it guards only a ccache launcher and chains onto any other (`cmake/ccache.cmake:15,97-98`). Moved to the violated column.
- 2026-09-26, verify wave 3: "Verification variables" now runs each command once per CI directory; a quoted `"$CI_DIR"` holding two names fails with "No such file or directory".

## Sub-artifacts

- [ctest-contract.md](cmake-testing-and-ci/ctest-contract.md) covers what a
  CTest run in CI must prove: the flag table, the `WILL_FAIL`
  classification, discovery adoption, `--repeat` modes, and the
  `DISABLE_FIND_PACKAGE` survey. Its `--no-tests` version,
  `CTEST_TEST_TIMEOUT`, `CMAKE_CTEST_ARGUMENTS`, 86 % and CMP0178 claims are
  corrected here.
- [presets-and-ci-shape.md](cmake-testing-and-ci/presets-and-ci-shape.md)
  covers presets against CI jobs: schema ceilings (measured), three CI
  idioms, launchers, user presets, the CI census, and `unshare -rn` on hosted
  runners. Its find_ocx row, its pinning rule and its `docker` command are
  corrected here.

## Key sources

1. [ctest.1.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/ctest.1.rst):
   `--test-dir`, `--timeout`, `--no-tests` and `--repeat` semantics.
2. [ctest(1) manual, v3.17](https://cmake.org/cmake/help/v3.17/manual/ctest.1.html)
   and [v3.16](https://cmake.org/cmake/help/v3.16/manual/ctest.1.html): the
   `--no-tests` introduction is bracketed by these two versions.
3. [cmake-presets.7.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-presets.7.rst):
   the schema-to-version table, and "should NOT be checked in" at lines
   33-34.
4. [CTEST_NO_TESTS_ACTION.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/envvar/CTEST_NO_TESTS_ACTION.rst):
   `versionadded:: 3.26`, and the command line overrides it.
5. [Modules/GoogleTest.cmake @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Modules/GoogleTest.cmake):
   the emulator requirement, and `DISCOVERY_MODE` from 3.18.
6. `Modules/CTest.cmake:180` @ 4.4.2 (the host binary): the
   `DART_TESTING_TIMEOUT 1500` default behind T2.
7. Measurements T1-T9 in
   [`cmake-testing-and-ci/scratch/testing-and-ci-consolidation/`](cmake-testing-and-ci/scratch/testing-and-ci-consolidation/),
   on 3.31.12 and 4.4.2.
8. The presets schema rejection measured on 3.31.12 and 4.4.2 in
   [presets-and-ci-shape.md §1](cmake-testing-and-ci/presets-and-ci-shape.md).
9. The corpus `WILL_FAIL` classification in
   [ctest-contract.md §4](cmake-testing-and-ci/ctest-contract.md).
10. [cmake-dependency-seam/resolution-order-and-providers.md §6-7](cmake-dependency-seam/resolution-order-and-providers.md):
    the `ctest -N` subproject leak, and CMP0077 on a dependency's toggle.
11. [actions/runner-images#10443](https://github.com/actions/runner-images/issues/10443)
    and [#11489](https://github.com/actions/runner-images/pull/11489): the
    `unshare` failure on stock `ubuntu-24.04`, and the fix that was closed
    unmerged.
12. [Ubuntu: restricted unprivileged user namespaces](https://ubuntu.com/blog/ubuntu-23-10-restricted-unprivileged-user-namespaces):
    the AppArmor mechanism.
13. [Ubuntu2404-Readme.md](https://raw.githubusercontent.com/actions/runner-images/main/images/ubuntu/Ubuntu2404-Readme.md):
    CMake 3.31.6 and Docker preinstalled.
14. [docker-library/gcc 14 Dockerfile](https://raw.githubusercontent.com/docker-library/gcc/master/14/Dockerfile)
    and [buildpack-deps trixie](https://raw.githubusercontent.com/docker-library/buildpack-deps/master/debian/trixie/Dockerfile):
    no cmake in the dive's image (conflict 13).
15. [gitlab#22538](https://gitlab.kitware.com/cmake/cmake/-/issues/22538):
    the presets cross-product problem, still open on 2026-04-27.

[map]: cmake-topic-map.md
[ctest]: cmake-testing-and-ci/ctest-contract.md
[presets]: cmake-testing-and-ci/presets-and-ci-shape.md
[resolution]: cmake-dependency-seam/resolution-order-and-providers.md
[fleet]: cmake-audit/fleet-inventory-and-bazel-overlap.md

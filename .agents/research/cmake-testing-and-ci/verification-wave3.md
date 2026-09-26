---
title: "CTest, presets and CI — verification wave 3"
verifies: cmake-testing-and-ci.md
model: opus
date: 2026-09-26
---

# Verification wave 3: cmake-testing-and-ci.md

Every MUST rule, every version floor and every "tool X does Y" claim in
[`../cmake-testing-and-ci.md`](../cmake-testing-and-ci.md) was re-checked on
2026-09-26 against CMake 3.31.12, 4.3.4 and 4.4.2 (ninja 1.13.2, gcc 15.2),
against the v4.4.2 sources fetched raw from gitlab.kitware.com, and against
the 46-repo exemplar corpus at the [map] H8 SHAs.

Scratch sources and scripts are under
`/home/mherwig/.cache/cmake-measure-scratch/verify-testing-and-ci/`:
`src/run.sh` (V1-V9 on all three CMake lines), `src/offline-docker.sh` (T8
re-run), `src/{zero,tmo,mc,cfg,willfail,leak,launch,presets,errdev,empty,netfetch}`,
`grep/{bad,clean}` (planted-violation and clean fixtures) and `grep/cmds.sh`
(every verification command, as published and as corrected). The copy into
`cmake-testing-and-ci/scratch/verify-testing-and-ci/` and the deletion of the
5.3 MB `build/` tree were both refused by the permission system; they remain
for the owner.

## Ledger

| # | ID or claim | verdict | evidence | note |
|---|---|---|---|---|
| 1 | TEST-06 MUST: bare `ctest` passes with zero tests; `--no-tests=error` fails | CONFIRMED | V1: bare rc 0, `--no-tests=error` rc 8, `CTEST_NO_TESTS_ACTION=error` rc 8 on 3.31.12, 4.3.4, 4.4.2. V1b: `-R nomatch` rc 0, guarded rc 8 | Also measured: `--test-dir` naming a directory with no `CTestTestfile.cmake` rc 0 bare, rc 8 guarded, all three lines. Added to the rationale |
| 2 | T5: `test` target with zero tests rc 0; `CMAKE_CTEST_ARGUMENTS=--no-tests=error` carries through | CONFIRMED | V5: rc 0 and rc 8 on all three lines | |
| 3 | Floor `--no-tests` 3.17 | CONFIRMED | cmake.org v3.17 `ctest.1.html` contains `--no-tests=<[error\|ignore]>`, v3.16 has no `no-tests` | |
| 4 | Floor `CTEST_NO_TESTS_ACTION` 3.26; the 3.26 line belongs to the env-var sentence | CONFIRMED | `Help/envvar/CTEST_NO_TESTS_ACTION.rst` @ v4.4.2 `versionadded:: 3.26`; `ctest.1.rst:555-558` @ v4.4.2 | |
| 5 | Floor `CMAKE_CTEST_ARGUMENTS` 3.17 | CONFIRMED | `Help/variable/CMAKE_CTEST_ARGUMENTS.rst` @ v4.4.2 `versionadded:: 3.17` | |
| 6 | Floor `--test-dir` 3.20 | CONFIRMED | `ctest.1.rst:454-456` @ v4.4.2 | |
| 7 | `ctest.1.rst` says `--no-tests` covers "the given arguments exclude all tests" | CONFIRMED | `ctest.1.rst:539-541` @ v4.4.2 | |
| 8 | T3: Ninja Multi-Config without `-C` rc 8; `-C Debug` rc 0 | CONFIRMED | V3 on all three lines | |
| 9 | TEST-06: `-C` on single-config trees is ignored | CORRECTED | `cfg/`: Debug tree with `any` plus `dbgonly` (`CONFIGURATIONS Debug`). No `-C`: 1 test run. `-C Release`: 1 test run, rc 0. `-C Debug`: 2 run. Same on 3.31.12 and 4.4.2 | Bullet now says match `-C` to `CMAKE_BUILD_TYPE` on single-config legs; T3 notes it |
| 10 | TEST-06 verification command | CORRECTED | `grep/bad`: the published form printed `docs.yml` (`doctest`, `sqllogictest`) and missed `tgt.yml` (`cmake --build build --target test`) | Now `grep -rlw -e 'ctest' -e '--target test'`; preset pass condition stated |
| 11 | T2: `include(CTest)` gives 1500 s from `Modules/CTest.cmake:180` | CONFIRMED | `v4.4.2 Modules/CTest.cmake:180` `set(DART_TESTING_TIMEOUT 1500 CACHE STRING`; V2 `TimeOut: 1500`, "timeout computed to be: 1500" on all three lines | |
| 12 | T2: `enable_testing()` alone is unbounded | CONFIRMED | V2: no `DartConfiguration.tcl`, "timeout computed to be: 10000000" on all three lines | |
| 13 | T2: `--timeout 1` fails a 3 s test; `CTEST_TEST_TIMEOUT=1` in the env does nothing | CONFIRMED | V2: rc 8 and rc 0 on 3.31.12, 4.3.4, 4.4.2 (the consolidation measured 4.4.2 only) | |
| 14 | `--timeout` applies only to tests without `TIMEOUT` | CONFIRMED | `ctest.1.rst:514-520` @ v4.4.2 | |
| 15 | TEST-07 verification command | CORRECTED | Same substring defect as #10 (`grep/bad`); and its "or you accept 1500 s from `include(CTest)`" let `grep/bad` pass on an `include(CTest)` hit, contradicting the rule's first bullet | Escape removed; word match and `--target test` added |
| 16 | T9: 20 repos run ctest from a workflow; 2 carry `--timeout` (arrow, duckdb); 4 carry `--no-tests=error` | CORRECTED | Word-bounded re-run: 18 repos. duckdb's only hit is `sqllogictest` (`.github/workflows/NightlyTests.yml:823`) and its `--timeout` is `retry.py --timeout 2m` (`Main.yml:226`); ccache's is `doctest` (`build.yaml:104`). 1 carries `--timeout` (arrow `cpp_extra.yml:347`). 4 guard zero tests (unchanged) | Verdict 1, TEST-07 rationale, applied table, failure modes 1-2 updated |
| 17 | TEST-08: `ctest.1.rst:375-397` calls `until-pass`/`after-timeout` "tolerating" | CONFIRMED | `ctest.1.rst:384-393` @ v4.4.2 | Range cited is 2 lines wide of the option block; harmless |
| 18 | TEST-08: arrow runs `until-pass:3` | CONFIRMED | `apache__arrow@3ad410b7b1:ci/scripts/cpp_test.sh:114` | `:115` is `--timeout` |
| 19 | TEST-09 MUST: `BUILD_TESTING` guard leaks; top-level option does not; standalone keeps the test | CONFIRMED | V6 consumer `ctest -N`: `consumer_test libbt_test`; `lib_top` standalone: `libtop_test`; all three lines | |
| 20 | Floor `PROJECT_IS_TOP_LEVEL` 3.21; cmake-init's shim compares source dirs | CONFIRMED | `Help/variable/PROJECT_IS_TOP_LEVEL.rst` @ v4.4.2 `versionadded:: 3.21`; `friendlyanon__cmake-init@7e0c52fc73:cmake-init/templates/common/cmake/project-is-top-level.cmake` | |
| 21 | CMP0077 is what stops a plain `set()` below 3.13 | CONFIRMED | `cmake --help-policy CMP0077` (4.4.2): "introduced in CMake version 3.13" | |
| 22 | TEST-09 citations: fmt, spdlog, curl, ccache | CONFIRMED | fmt `CMakeLists.txt:89,622-624`; spdlog `:79,360-363`; curl `:1922-1927,1948-1949`; ccache `:73,134-137` at the cited SHAs | |
| 23 | TEST-10: GoogleTest discovery "requires that `CROSSCOMPILING_EMULATOR` is properly set" | CONFIRMED | `Modules/GoogleTest.cmake:194-195` @ v4.4.2 | |
| 24 | Floors `DISCOVERY_MODE` 3.18, `CMAKE_GTEST_DISCOVER_TESTS_DISCOVERY_MODE` 3.18, `DISCOVERY_EXTRA_ARGS` 3.31 | CONFIRMED | `Modules/GoogleTest.cmake:299-318` @ v4.4.2 | |
| 25 | TEST-10 floor "`DISCOVERY_MODE` 3.18" read for `catch_discover_tests` too | CORRECTED | Catch2's option lives in its own `extras/Catch.cmake:141`; added in Catch2 3.4.0 (`catchorg__Catch2@222e233903:docs/release-notes.md:540`, under `## 3.4.0`) | Floor now split |
| 26 | `discover_tests()` is 4.4; 0 adopters outside Kitware | CONFIRMED | `Help/command/discover_tests.rst` @ v4.4.2 `versionadded:: 4.4`; 4.3.4 `--help-command discover_tests`: "not a CMake command"; 0 corpus hits outside Kitware | |
| 27 | CI-01 MUST: schema table 6→3.25 ... 12→4.4, 13 unreleased | CONFIRMED | `cmake-presets.7.rst:363-480` @ v4.4.2; V8: 3.31.12 accepts ≤10, 4.3.4 ≤11, 4.4.2 ≤12; 13 rejected by all; era re-check: no 4.5 | |
| 28 | 3.31.12 rejects 12 with `must be >=1 and <=10`, rc 1 | CONFIRMED | V8 | |
| 29 | `ubuntu-24.04` and `windows-2025` default to 3.31.6 | CONFIRMED | runner-images `main` `Ubuntu2404-Readme.md` and `Windows2025-Readme.md`: "CMake 3.31.6", fetched 2026-09-26 | |
| 30 | CI-01 verification command | CORRECTED | `src/presets`: root schema 10 including `presets/ci.json` at 11; 3.31.12 `--list-presets` rc 1 `Unrecognized "version" 11`, the published command printed only `10` | Command now lists includes |
| 31 | Floor: presets 3.19; `condition` schema 3 = 3.21; `include` schema 4 = 3.23 | CONFIRMED | `cmake-presets.7.rst:373,385,402` @ v4.4.2 | |
| 32 | CI-02 MUST: "should NOT be checked in" at lines 33-34 | CONFIRMED | `cmake-presets.7.rst:32-35` @ v4.4.2 | |
| 33 | User presets include `CMakePresets.json` implicitly at every schema | CONFIRMED | `cmake-presets.7.rst:68-71` @ v4.4.2 "in all versions of the format" | |
| 34 | 0 real corpus projects track `CMakeUserPresets.json`; Catch2, cmake_template, vcpkg-tool, llvm ignore it | CONFIRMED | `git ls-tree` over 46 repos: only cmake-init's template copy; the 4 `.gitignore` files match | |
| 35 | CI-03 citations: vcpkg-tool 1:1, cmake_template raw flags at `ci.yml:165`, `--config` at `:170` | CONFIRMED | `build.yaml:42-43,60`; `ci.yml:165,170` at the cited SHAs | |
| 36 | gitlab#22538 open, 44 upvotes, 2026-04-27 | CONFIRMED | GitLab API: "presets: combinatorial explosion", opened, 44, updated 2026-04-27 | |
| 37 | CI-04 floors: variable 3.4, env var 3.17 | CONFIRMED | `Help/variable/CMAKE_LANG_COMPILER_LAUNCHER.rst` and `Help/envvar/…` @ v4.4.2 | |
| 38 | T7: unconditional `set()` shadows `-D`; `if(NOT DEFINED …)` does not | CONFIRMED | V7: `projlauncher` vs `userlauncher` in `build.ninja` on all three lines | |
| 39 | CI-04: "ClickHouse returns early when a launcher is already set" | CORRECTED | `ClickHouse__ClickHouse@0995a518a8:cmake/ccache.cmake:15` returns only on `MATCHES "ccache"`; `:97-98` prepend `${LAUNCHER}` to any other launcher, a chained list | Moved to violated; arrow stays the example |
| 40 | CI-04: arrow guard; filipdutescu and rapidjson use `RULE_LAUNCH_COMPILE` | CONFIRMED | `cpp/CMakeLists.txt:237-238`; `StandardSettings.cmake:87`; `CMakeLists.txt:51` | |
| 41 | CI-04: no corpus repo sets a launcher in a presets file | CONFIRMED | 0 `COMPILER_LAUNCHER` hits across every tracked `*Presets.json` | |
| 42 | T8: `--network none` container: clean rc 0, fetch rc 1 "Could not resolve hostname" | CONFIRMED | `src/offline-docker.sh` re-run, 4.4.2 + ninja mounted in `bitnami/git`, fetch of a github.com URL | |
| 43 | runner-images#10443 reports `unshare` failing; #11489 closed unmerged | CONFIRMED | GitHub API: #10443 "ubuntu-24.04 Error during unshare(...): Operation not permitted", closed 2024-08-20; #11489 `merged_at: null`, closed 2025-01-28 | |
| 44 | macOS runners have no Docker | CONFIRMED | `macos-15-arm64-Readme.md` (main): 0 `docker` mentions | |
| 45 | CMP0178 warns when unset (3.31); CMP0158 does not (3.29) | CONFIRMED | `cmake --help-policy` on 4.4.2 | |
| 46 | CMP0170 in the CI-05 command | CONFIRMED | `cmake --help-policy CMP0170`: `versionadded:: 3.30` | Below 3.30 the `-D` is an unused variable, not an error |
| 47 | 4.4.2 rejects `errors.dev` at schema 12 | CONFIRMED | `errdev/`: "File version must be 11 or lower for errors.dev support", rc 1; `errors.author` rc 0 | |
| 48 | T4: `WILL_FAIL` sentinel and `-E false` both fail | CONFIRMED | V4 on all three lines; ClickHouse `utils/wasm-parser/CMakeLists.txt:316-317` | |
| 49 | "Verification variables": `CI_DIR` is every CI directory, used as `"$CI_DIR"` | CORRECTED | `CI_DIR=".github ci"; grep -rn -e 'ctest' "$CI_DIR"` → "No such file or directory", rc 2 | Now one directory per run |
| 50 | find_ocx: `ci.yml:88`, `taskfile.yml:39,48` lack `--no-tests=error`; `CMakeLists.txt:11` `enable_testing()` only; no `TIMEOUT`; `ocx.toml:3` pins 3.31; no presets | CONFIRMED | Read in the dirty tree, 2026-09-26 | |
| 51 | Mirror serves 4.4.2, upstream at 4.4.3 | CONFIRMED | `cmake --version`; era re-check row 23, 27 | |
| 52 | `--no-tests error` (space form) | CONFIRMED (note) | 3.31.12 rc 1 (argument error); 4.3.4 and 4.4.2 accept it, rc 8 | The rule's `=` form works on all three; the grep flags the space form, the safe direction. No edit |

## Verification commands exercised

Fixtures: `grep/bad` plants one violation per rule; `grep/clean` is the
conforming twin. Both are `git init` + `git add` trees. Run with
`CI_DIR=.github` from each fixture root.

| Command | bad (planted) | clean | Verdict |
|---|---|---|---|
| TEST-06, published | printed `ci.yml` and `docs.yml`; missed `tgt.yml` | empty | red, but with a false positive and a false negative |
| TEST-06, corrected | printed `ci.yml` and `tgt.yml` | empty | red on bad, green on clean |
| TEST-07 first, published | printed `ci.yml` and `docs.yml`; missed `tgt.yml` | empty | same defect as TEST-06 |
| TEST-07 first, corrected | printed `ci.yml` and `tgt.yml` | empty | red on bad, green on clean |
| TEST-07 second | `include(CTest)` only; the published escape passed it | `include(CTest)` inside the gate (not reached: first command empty) | corrected text makes the bad hit a finding |
| TEST-08 | `ci.yml:7 … --repeat until-pass:3` | empty | red / green |
| TEST-09 (static read) | `add_subdirectory(tests)` under `if(BUILD_TESTING)` | `add_subdirectory(tests)` under `if(CLEAN_BUILD_TESTS)` | both hit; the read separates them, as the rule says. Smoke build is V6 |
| TEST-10 | `gtest_discover_tests(unit)` | empty | red (read) / green |
| CI-01, published | `12` | `6` | reader compares; misses included files (`src/presets`: printed `10`) |
| CI-01, corrected | `./CMakePresets.json 12` | `./CMakePresets.json 6` | `src/presets` prints `10` plus `includes presets/ci.json` |
| CI-02 | `CMakeUserPresets.json` | empty (file present, ignored) | red / green |
| CI-03 | preset `ci-gcc`, no `--preset` in CI (finding) | preset `ci`, `cmake --preset ci` hit | red / green |
| CI-04 | unguarded `set(…LAUNCHER ccache)` and `RULE_LAUNCH_COMPILE` | hits only inside `if(NOT DEFINED …)` | both hit; the read separates them |
| CI-05 | `ci.yml:8 unshare -rn … \|\| true` | empty | red / green |
| `"$CI_DIR"` with two names | grep rc 2, "No such file or directory" | — | corrected to one directory per run |

## Unverifiable

- CI-05's premise that `unshare -rn` fails on a real hosted `ubuntu-24.04`
  runner: no runner was available; only the issue report and the closed PR
  were checked. The rule stays SHOULD, as the consolidation already says.
- "13 of 46 corpus repos wire a launcher" ([presets] §6): not re-counted;
  only the "none in a presets file" half was re-measured.
- "20 of 20 real `WILL_FAIL` uses are bare" ([ctest] §4), "175 of 178 raw
  hits are vcpkg portfile isolation" ([ctest] §8), and the 86 % upper bound
  ([ctest] §7): cited from the dives, not re-measured.
- Ubuntu's `kernel.apparmor_restrict_unprivileged_userns=1` mechanism: the
  Ubuntu blog was not re-fetched.

[map]: ../cmake-topic-map.md
[ctest]: ctest-contract.md
[presets]: presets-and-ci-shape.md

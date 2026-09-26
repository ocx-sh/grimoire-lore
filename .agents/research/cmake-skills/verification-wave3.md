---
title: "Verify wave 3 — the two skill procedures (cmake-dependency-triage, cmake-modernize)"
verifies: ../cmake-skills.md
model: opus
date: 2026-09-26
measured_on: CMake 3.31.12, 4.3.4 and 4.4.2 via ocx package exec kitware/cmake; ninja from ocx; gcc 15.2 (C); Conan 2.32.0 with cmake-conan develop2 b1593849dd (byte-identical to the corpus copy)
---

# Verify wave 3 — the two skill procedures

This pass tried to refute every MUST rule, version floor, measured claim and
verification command in `cmake-skills.md`.

- **Scratch sources**, re-runnable, are in
  [`scratch/verify-skills/`](scratch/verify-skills/). Run
  `sh run.sh <that dir> <build root on disk>` from the worktree root.
  `run.log` is the recorded output.
- **The Conan re-run of M-P and M-S** reused the consolidation's fixtures in
  `scratch/skills-consolidation/`, with a private `CONAN_HOME`.
- **Build trees** (38 MB) remain under
  `/home/mherwig/.cache/cmake-measure-scratch/verify-skills/`. That is on
  disk, not `/tmp`. The session's permission policy refused `rm -rf`.
- **Primary sources** were fetched on 2026-09-26:
  - `Help/release/3.11.rst` and `Modules/FetchContent.cmake` at v3.11.0;
  - `Help/manual/cmake.1.rst` and `Help/guide/tutorial/index.rst` at v4.4.2.

  Everything else was read from the local binaries' `--help-*` output.

Summary: 57 claims checked, 45 confirmed, 10 corrected, 2 unverifiable. Two
corrections change what the rules forbid:
- `-Wno-deprecated` is a real gate bypass that the rule missed.
- So is a preset's `"warnings": {"deprecated": false}`.

## Ledger

| # | ID or claim | verdict | evidence | note |
|---|---|---|---|---|
| 1 | CMK-DEP-30 (MUST): on 3.x a patch of the floor line or a `...<max>` range clears a 3.7 dependency under the gate | CONFIRMED | `mo-srcdir`/`mo-git` rc 0 and `range` rc 0 on 3.31.12; also on 4.3.4 and 4.4.2 | — |
| 2 | `CMAKE_POLICY_VERSION_MINIMUM` is `versionadded:: 4.0` and absent from 3.31.12 | CONFIRMED | 3.31.12 `--help-variable` reports "not a defined variable". 4.3.4 and 4.4.2 print `.. versionadded:: 4.0` | — |
| 3 | 3.31.12 does not reject `-DCMAKE_POLICY_VERSION_MINIMUM`; exits 0 with "Manually-specified variables were not used" (failure mode 4) | CONFIRMED | `pvm-ignored` rc 0 with that warning | — |
| 4 | `-Wno-error=deprecated` leaves rc 1 in both flag orders on 3.31.12 | CONFIRMED | `wnoerrdep-a`/`-b` rc 1, `CMake Deprecation Error` | 4.4.2 with the flag after `-Werror=author`: rc 0 (`wnoerrdep44`). Irrelevant to the 3.x rule, and the grep already flags it |
| 5 | `CMAKE_WARN_DEPRECATED=OFF` passes the gate on 3.31.12 and silences the project's own deprecation | CONFIRMED | `warndepoff` rc 0; `own-warndepoff` (`cmake_policy(VERSION 3.7)` in own code) rc 0 | On 4.4.2 under `-Werror=author` it does *not* pass (`warndepoff44` rc 1) |
| 6 | `-Wno-dev` suppresses every author warning | CONFIRMED, amended | `wnodev-a` (`-Werror=dev -Wno-dev`) rc 0; `wnodev-b` (reverse order) rc 1 | The order dependence is added to the rationale |
| 7 | CMK-DEP-30's forbidden list is complete (`CMAKE_WARN_DEPRECATED=OFF`, `-Wno-dev`, `-Wno-error=deprecated`) | CORRECTED | `-Wno-deprecated` gives rc 0 on 3.31.12 in both orders (`wnodep-a`/`-b`), on 4.3.4 (`wnodep43`), and on 4.4.2 after the gate (`wnodep44-a`). It also silences own-code deprecation (`wnodep-own` rc 0). A preset `"warnings": {"deprecated": false}` gives rc 0 on 3.31.12 even with `-Werror=dev` on the command line (`preset-nodep-3.31`) | Rule text, rationale, second grep and failure mode 3 updated. The open question is answered |
| 8 | Range `3.7...4.0` configures with no deprecation line under the gate on 3.31.12 and 4.4.2 (M-R) | CONFIRMED | `range` / `range43` / `range44` rc 0, no diagnostic | — |
| 9 | 4.4.2 prints the gated floor as `CMake Error (deprecated)` | CONFIRMED | `base44` first line | 3.31.12 and 4.3.4 print `CMake Deprecation Error` |
| 10 | CMK-DEP-30 grep (first command) catches the named switches and keeps `-Wno-error=deprecated-declarations` out | CONFIRMED | Planted `plant/bad`: 4 hits. `plant/clean` with `-Wno-error=deprecated-declarations`: empty | It misses `-Wno-deprecated` and the preset form (row 7), so a second command was added |
| 11 | CMK-DEP-30 behavioural check: "Exit 0 with every count 0 = pass" | CORRECTED | `grep -rc` over two clean gated logs printed `:0` twice and exited **1**. Over three bypassed logs it printed `:1` and exited 0 | Now reads the counts: all 0 = pass, grep exits 1 |
| 12 | CMK-DEP-30 floor: `PATCH_COMMAND` in `FetchContent` 3.11 | CONFIRMED | `Help/release/3.11.rst:153` "A new FetchContent module was added". `FetchContent.cmake@v3.11.0:86` "download or update/patch options" | — |
| 13 | CMK-DEP-31 (MUST): an override skips the declare's `PATCH_COMMAND`; the `GIT_REPOSITORY` declare exits 0, and the override of a pristine copy exits 1 | CONFIRMED | `mo-git` rc 0 and `mo-override` rc 1 on 3.31.12, 4.3.4 and 4.4.2; the pristine copy still reads `VERSION 3.7` afterwards | 4.3.4 added |
| 14 | A `SOURCE_DIR` declare runs the patch and edits the named directory in place | CONFIRMED | `srccopy/CMakeLists.txt` reads `VERSION 3.10` after configure on all three lines | — |
| 15 | CMK-DEP-31 floor: `FETCHCONTENT_SOURCE_DIR_<X>` 3.11 | CONFIRMED | `FetchContent.cmake@v3.11.0:206,851-858` | — |
| 16 | CMK-DEP-31 override grep scope (presets, yml, yaml, sh) | CORRECTED | It misses an override passed from CMake code: `apache__arrow@3ad410b7b1:cpp/cmake_modules/ThirdpartyToolchain.cmake:2203` and planted `plant31/bad/cmake_args.cmake`. The extended grep lists both; `plant31/clean` is empty | Now also scans `CMakeLists.txt`, `*.cmake` and `CMakeUserPresets.json` |
| 17 | Applied row: "Outside vcpkg, no corpus file passes `FETCHCONTENT_SOURCE_DIR_`" | CORRECTED | arrow `:2203` (above) and `grpc__grpc@0f8d72ed71:test/distrib/cpp/run_distrib_test_cmake_fetchcontent.sh:43`. The grpc file matches even the old grep's own `*.sh` include | Row rewritten |
| 18 | CMK-DEP-32 / F1: with the installed copy on `CMAKE_PREFIX_PATH`, an `OVERRIDE_FIND_PACKAGE` declare wins silently; `dep_DIR` is `CMakeFiles/pkgRedirects`; `--debug-find-pkg` never names the installed prefix | CONFIRMED | `f1-3.31` and `f1-4.4`: the cache line `dep_DIR:PATH=…/CMakeFiles/pkgRedirects`; `instA` appears 0 times in the debug output | — |
| 19 | CMK-DEP-32 floor: `CMAKE_FIND_PACKAGE_REDIRECTS_DIR` 3.24 | CONFIRMED | `versionadded:: 3.24` on 3.31.12, 4.3.4 and 4.4.2 | — |
| 20 | CMK-DEP-17 amendment / F2: on a reused tree, a changed `dep_ROOT` is ignored and `--debug-find-pkg` shows only the cached copy; `--fresh` picks the new hint | CONFIRMED | Reuse: `dep_DIR=instA`, `instB` appears 0 times in the debug output (3.31.12 and 4.4.2). `--fresh`: `dep_DIR=instB` | — |
| 21 | `cmake -L` omits an `UNINITIALIZED` `-D<Pkg>_ROOT` | CONFIRMED | The cache holds `dep_ROOT:UNINITIALIZED=…`; `cmake -L -N` and `-LA -N` both list it 0 times (both lines) | — |
| 22 | `find_package-v1` configure-log event is `versionadded:: 4.1` and carries `found.path` | CONFIRMED | `cmake-configure-log(7)` on 4.4.2, lines 424 and 430-500. The measured count is 0 on 3.31.12 and 1 per configure on 4.4.2 | The log appends per configure (a reused tree read 2), so the skill's "after `--fresh`" ordering matters |
| 23 | `cmake --graphviz` draws the target graph only | CONFIRMED | `cmake.1.rst@v4.4.2:252-259`: "dependencies between the targets … as well as external libraries" | — |
| 24 | CMK-DEP-15 amendment: value 3.10; 3.5 leaves "< 3.10 will be removed", which the gate fails; a 3.4 floor is a hard error on 4.x | CONFIRMED | 4.4.2: `dep34` rc 1 "Compatibility with CMake < 3.5 has been removed"; `pvm35` rc 1 `CMake Error (deprecated)`; `pvm310` rc 0 (3.7 floor) | — |
| 25 | CMK-TC-05 amendment / M-P: under `CMakeConfigDeps`, `CMAKE_PROGRAM_PATH`/`CMAKE_LIBRARY_PATH` carry the package's `bin`/`lib` after the first `find_package`; under `CMakeDeps` they stay empty; `CMAKE_PREFIX_PATH` is empty under both | CONFIRMED | Re-run on 4.4.2 with Conan 2.32.0: `find_program`/`find_library` resolve only under `CMakeConfigDeps`, and subdirectories added later see them | — |
| 26 | M-S: first intercepted `find_package` in a subdirectory → top-level `find_program` NOTFOUND even after its own later `find_package` ("'conan install' already ran") | CONFIRMED | `b-scope` output, verbatim | — |
| 27 | `conan_provider.cmake:634-638` includes `conan_cmakedeps_paths.cmake` in the first-run branch | CONFIRMED | Lines 634-637 in the provider, which is byte-identical to `conan-io__cmake-conan@b1593849dd` | — |
| 28 | `cmake_language(DEFER)` runs "as if written at the end of the current directory's CMakeLists.txt" | CONFIRMED | `cmake --help-command cmake_language` on 4.4.2, lines 111-113 | — |
| 29 | T8: `conan graph explain` errors "There is no missing binary" on a resolved graph | CONFIRMED | `ERROR: There is no missing binary` (Conan 2.32.0) | — |
| 30 | T2: `--trace-expand --trace-source=CMakeLists.txt` names the declaring line | CORRECTED | For a declare in `CMakeLists.txt`, 1 trace line (3.31.12, 4.4.2). For a declare in `cmake_modules/Deps.cmake`, 0 trace lines on 4.4.2 (`f1mod`). Arrow's 7 `OVERRIDE_FIND_PACKAGE` declares are all in `ThirdpartyToolchain.cmake` | T2 now greps `OVERRIDE_FIND_PACKAGE` |
| 31 | T3 / failure mode 6: "grep the configure log for `conan_cmakedeps_paths`" | CORRECTED | `CMakeConfigureLog.yaml`: 0 hits under both generators. Console output: 1 hit (`CMake-Conan: Loading conan_cmakedeps_paths.cmake file`) under `CMakeConfigDeps`, 0 under `CMakeDeps` | Names the console line and the `build/conan/` file |
| 32 | `PROJECT_IS_TOP_LEVEL` 3.21 | CONFIRMED | `versionadded:: 3.21` on all three lines | — |
| 33 | `install(PACKAGE_INFO)` 4.3; the round trip ends in `/cps/<pkg>` on ≥4.3 and `/cmake/<pkg>` on 3.31 | CONFIRMED | `install(7)` on 4.3.4 prints `versionadded:: 4.3`. Both installed: `dep_DIR=…/lib/cps/dep` on 4.3.4 and 4.4.2, and `…/lib/cmake/dep` on 3.31.12 | — |
| 34 | `cmake --build . --target help --directory DIR` fails "Unknown argument --directory" (M-A) | CONFIRMED | 4.4.2, verbatim | — |
| 35 | Ninja `--target help` prints `name: phony` | CONFIRMED | `mylib_unit_tests: phony` | — |
| 36 | Step 7 smoke block: prints `Total Tests: 0` for a guarded library and lists no guarded target | CONFIRMED | `lib-clean`: the tests grep prints the line and the target grep is empty. `lib-leak`: the tests grep is empty and the target grep prints `mylib_unit_tests: phony`. Both on 3.31.12 and 4.4.2 | Red and green both proven |
| 37 | `include(CTest)` in the parent turns `BUILD_TESTING` on for the subproject | CONFIRMED | `lib-leak`'s `if(BUILD_TESTING)` branch ran under the parent | — |
| 38 | Step 1 floor grep lists every bare or two-dot floor | CORRECTED | It missed `cmake_minimum_required (VERSION 3.10)` (space before the paren) on a fixture, and in the corpus `gflags__gflags@bdda022e7c:CMakeLists.txt:73` (`3.10 FATAL_ERROR`). 28 non-Kitware lines use the spaced form | Patterns now allow the space. On 8 fixtures, 6 are listed and the two three-dot forms are not |
| 39 | Step 4 exit / failure mode 8: exact match against `cmake --help-variable-list`, 0 = invented | CORRECTED | 4.4.2: `CMAKE_CXX_FLAGS` and `CMAKE_CXX_COMPILER` count 0, because the list prints `CMAKE_<LANG>_FLAGS` (100 `<LANG>` entries) | Placeholder-expanded check; 9 names classified correctly |
| 40 | Gate spelling: `-Werror=author` on ≥4.4, `-Werror=dev` on ≤4.3 (CMK-CORE-01) | CONFIRMED (gating half) | `base43` (`-Werror=dev`) rc 1 and `base44` (`-Werror=author`) rc 1 on the 3.7 floor | The silent-ignore half is owned and measured by `cmake-versions-and-gate.md` |
| 41 | CMake Tutorial at v4.4.2 is organised as topic pages | CONFIRMED | `Help/guide/tutorial/index.rst@v4.4.2`: toctree "Getting Started with CMake … Finding Dependencies"; the old step titles sit in a hidden forwarding toctree | — |
| 42 | libuv: 7 of 7 `target_link_libraries` bare at 477, 494, 530, 727, 745, 747, 763; `CMAKE_C_FLAGS` appends at 56, 60, 68, 76 | CONFIRMED | `libuv__libuv@abe835d413:CMakeLists.txt` | — |
| 43 | libuv exports `NAMESPACE libuv::` with `write_basic_package_version_file` at 795-803 | CONFIRMED | Same file, lines 795-803 | — |
| 44 | vcpkg-tool: found-package escape at `FindCMakeRC.cmake:1-6`, floor patch at 19-24 to `3.6...4.0` | CONFIRMED | Lines verbatim; `CMakeRC_cmake_4.patch` shows `-3.6` becoming `+3.6...4.0` and `-3.3` becoming `+3.3...4.0` | — |
| 45 | curl `non-native.yml:419` passes `-DCMAKE_WARN_DEPRECATED=OFF` in a `-DCURL_WERROR=ON` leg; rapidjson `appveyor.yml:107` passes `-Wno-dev` | CONFIRMED | curl 419 and 421 (the same `run:` block); rapidjson 107 | — |
| 46 | arrow `FindRapidJSONAlt.cmake:29-32` set/restore of `3.5`; `ThirdpartyToolchain.cmake:1809,2084` `PATCH_COMMAND` for thrift and protobuf | CONFIRMED | Lines verbatim at `3ad410b7b1` | — |
| 47 | aminya `Conan.cmake:237` appends to `CMAKE_PROJECT_TOP_LEVEL_INCLUDES`; `:239-248` `DEFER` "to invoke conan even when there's no find_package" | CONFIRMED | Lines verbatim at `412045e1f1` | — |
| 48 | spdlog `:21-24` shim; cmake-init template uses `PROJECT_IS_TOP_LEVEL`; libuv, rapidjson, zlib and curl roots never do | CONFIRMED | spdlog lines 21-24; template `:69,80`; root counts 0, 0, 0, 0 | — |
| 49 | rapidjson citations `:136-140` (`/WX`), `:148,233` (prefix-absolute), `:227-230` (bare `CONFIGURE_FILE`), `:255` (no `NAMESPACE`) | CORRECTED | 136-140, 148, 227-230 and 233 hold. Line 255 is `INSTALL(TARGETS …)`, and the `INSTALL(EXPORT …)` without `NAMESPACE` is `:256` | Citation moved |
| 50 | vcpkg ports: `fmilib/portfile.cmake:31` `-Wno-dev`, `launch-darkly-server:68-72` and `wpilib:46` inject overrides | CONFIRMED | Lines verbatim at `c4ee5a52d7` | — |
| 51 | cmake-init `ci.yml:113-120` installs and never consumes; libuv `CI-sample.yml` tests the subproject path only; curl `tests/cmake/test.sh` exists | CONFIRMED | cmake-init: build, install, then `ctest` on the build tree. libuv: `docs/code/CMakeLists.txt:7` `add_subdirectory("../../" build)`. curl: the file exists | — |
| 52 | ClickHouse `CMakeLists.txt:848` keyworded (`PUBLIC`) | CONFIRMED | Line verbatim at `0995a518a8` | The "0.8 % bare" figure was not re-counted (see Unverifiable) |
| 53 | find_ocx `ocx.cmake:1199-1201` writes `<name>_ROOT CACHE PATH … FORCE`, and no `_DIR CACHE` unset exists | CONFIRMED | Lines verbatim; the grep for `_DIR CACHE` is empty (working tree, read-only) | — |
| 54 | find_ocx `ocx.cmake:1061-1063` and `examples/package/CMakeLists.txt:25-26` claim `find_library`/`find_program` searches (CMK-DEP-14 violation) | CONFIRMED | Lines verbatim | — |
| 55 | CMK-DEP-30 open question: `-Wno-deprecated` against the gate "unmeasured" | CORRECTED | Measured in row 7 | Question closed; the preset-`warnings` angle is handed to the CMK-CORE owner |
| 56 | Triage F2v: re-pointing `VCPKG_INSTALLED_DIR` on a reused tree leaves `widget_DIR` on the old tree | UNVERIFIABLE | Not re-run: needs a vcpkg-tool bootstrap and two overlay-port installs | The same mechanism is confirmed through plain CMake (row 20) |
| 57 | Triage F4: a missing `find_dependency` stays green for a `LANGUAGES NONE` consumer and fails at a compiled consumer's Generate step | UNVERIFIABLE | Not re-run here. It is handed back to `CMK-INST-01`, whose own verify wave owns it | — |

## Verification commands exercised

| Command (as in `cmake-skills.md`) | Planted violation | Clean case | Outcome |
|---|---|---|---|
| CMK-DEP-30 grep 1 (`CMAKE_WARN_DEPRECATED`, `Wno-dev`, `Wno-error=deprecated`) | `plant/bad/.github/workflows/ci.yml`: 4 hits | `plant/clean` (`-Wno-error=deprecated-declarations`): empty | Goes red and stays green. It **missed** `-Wno-deprecated` and the preset form |
| CMK-DEP-30 grep 2 (added: `-Wno-deprecated`, preset `"deprecated": false`) | 2 hits (ci.yml:6, CMakePresets.json:1) | empty | Red and green. Corpus: 1 hit, in CMake's own schema docs (Kitware, excluded by name) |
| CMK-DEP-30 behavioural `grep -rc … logs` | 3 bypassed logs: counts 1, exit 0 | 2 clean logs: counts 0, **exit 1** | Stated pass condition was impossible; corrected |
| CMK-DEP-31 grep 1 (`PATCH_COMMAND`) | `plant31/bad`: 1 hit | `plant31/clean`: empty | Red and green |
| CMK-DEP-31 grep 2 (overrides), original scope | CI yml: 1 hit; `cmake_args.cmake`: **missed** | empty | Extended scope: both hit, clean empty |
| CMK-DEP-31 override-dir read (`cmake_minimum_required` in `$OVERRIDE_DIR`) | `VERSION 3.7` printed | — | Works as described |
| CMK-DEP-32 / T1 cache grep | F1 tree: `…/CMakeFiles/pkgRedirects` (fetched) | F2 tree: `…/instA/lib/cmake/dep` (installed) | Distinguishes the two on both lines |
| T1 configure-log count (`find_package-v1`) | 3.31.12: `:0` (no event kind) | 4.4.2: `:1` | Works on 4.1+ as stated |
| T2 `--trace-source=CMakeLists.txt` | Declare in `Deps.cmake`: 0 lines | Declare in `CMakeLists.txt`: 1 line | False negative; replaced by the `OVERRIDE_FIND_PACKAGE` grep |
| T3 `conan_cmakedeps_paths` | `CMakeDeps` console: 0 | `CMakeConfigDeps` console: 1; `CMakeConfigureLog.yaml`: 0 under both | Only the console or `build/conan/` file carries it |
| Step 1 floor grep (original) | 8 fixtures: 5 of 6 bare or two-dot floors listed; **missed** `cmake_minimum_required (VERSION 3.10)` | two three-dot fixtures not listed | Corrected pattern lists 6 of 6 and keeps both three-dot forms out |
| Step 7 smoke block | `lib-leak`: tests grep empty, target grep hits | `lib-clean`: `Total Tests: 0`, target grep empty | Red and green on 3.31.12 and 4.4.2 |
| Failure mode 8 variable check (original) | `CMAKE_CXX_STANDARD_EXTENSIONS`: 0 | `CMAKE_CXX_FLAGS`: **0** (false positive) | Placeholder-expanded check: invented = 0, 5 real per-language names = 1 |
| Modernize dive's `--directory` smoke (M-A) | — | — | "Unknown argument --directory", as the file says |

## Unverifiable

- **Triage F2v through vcpkg** (row 56). A re-run needs a vcpkg-tool
  bootstrap and two overlay-port installs. Only the plain-CMake form of the
  mechanism was re-measured.
- **Triage F4** (row 57). It belongs to `CMK-INST-01`'s own verification;
  it was not re-run here.
- **Counts carried from other files, not re-measured:**
  - ClickHouse "0.8 % bare in core" (modernize dive);
  - "87 of 101 non-Kitware `add_subdirectory(test*)` sites unguarded"
    (`cmake-testing-and-ci/ctest-contract.md` §7);
  - whether the patched declares in arrow's `ThirdpartyToolchain.cmake` and
    grpc's distrib test are ever run under the overrides they pass.
- **Rows owned by other families and only cited here** were not
  re-litigated:
  - `CMK-CORE-01`'s silent ignore of `-Werror=author` below 4.4;
  - `CMK-MOD-15` (`gersemi --check`, never `--diff`);
  - `CMK-INST-12/-14..17` (CPS preconditions).

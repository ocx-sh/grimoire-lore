---
title: "Wave 7: held-out test of cmake-modernize (classes C1 to C9) on two fresh trees"
date: 2026-09-26
model: opus
skill: skills/cmake-modernize (SKILL.md 450 lines, classes C1 to C9 from .agents/research/cmake-skills/fm-classes-modernize.md)
trees:
  - repo: https://github.com/commonmark/cmark
    tag: 0.30.3
    commit: 5ba25ff40eba44c811f79ab6a792baf945b8307c
    shape: >-
      C library built as shared (cmark) and static (cmark_static) from one source list, with a
      generate_export_header header (cmark_export.h, installed) whose CMARK_STATIC_DEFINE the static target sets
      through the COMPILE_FLAGS property; an installed executable in the same export set; custom build types
      (Asan, Profile, Ubsan) through a FindAsan.cmake that FORCE-writes CMAKE_<LANG>_FLAGS_ASAN; spec tests
      through FindPythonInterp; floor 3.7; CI through a root Makefile on the runner image's CMake, with a Windows leg
    clone: shallow (git clone --depth 1 --branch 0.30.3), local step commits tagged w7-s0 .. w7-s5, w7-s2b
  - repo: https://github.com/libssh2/libssh2
    tag: libssh2-1.11.1
    commit: a312b43325e3383c865a87bb1d26cb52e3292641
    shape: >-
      C library built as libssh2_shared and libssh2_static from one source list; installs three CMake Find
      modules (FindLibgcrypt, FindMbedTLS, FindWolfSSL) beside a hand-configured Config that puts its own
      directory on CMAKE_MODULE_PATH for find_dependency; export(PACKAGE) under floor 3.7; 14 unprefixed
      toggles plus a CRYPTO_BACKEND cache STRING; include(CPack) and feature_summary in the library;
      CI on the runner image's CMake, with its own consumer test in tests/cmake/test.sh
    clone: shallow (git clone --depth 1 --branch libssh2-1.11.1), local step commits tagged w7-s0 .. w7-s6b
measured_on: >-
  cmake 3.31.12, 4.0.7, 4.1.6, 4.2.7, 4.3.4, 4.4.2 (printed once per tag, out/00-versions.txt; step checks on
  3.31.12 and 4.4.2) via ocx package exec kitware/cmake:<tag> from the worktree; ninja 1.13.2; gcc 15.2.1;
  zig c++ (clang 21.1.0) for cmark's CXX; zig 0.16.0-dev cc -target x86_64-windows-gnu for one cross consumer;
  gersemi 0.29.1 via uvx; pkg-config from the host. HOME redirected per run so export(PACKAGE) writes a scratch registry.
scratch: >-
  H=/home/mherwig/.cache/cmake-measure-scratch/w7/holdout-modernize. bash $H/run.sh reproduces every number below
  into $H/out/*.txt (the file named in each evidence cell) from the clones, or from fresh clones plus $H/patches.
  Helper scripts: inv.sh (I1 to I12, F1, F1b verbatim), flags.sh (flag-set check verbatim), smoke.sh (smoke passes 1 to 3),
  rt-verbatim.sh (the round trip extracted byte for byte from proofs.md), proposed.sh (the check fixes below).
  Build trees were deleted after the run. Each clone carries its plan file, cmake-modernize-plan.md.
---

# Wave 7 held-out test: cmake-modernize on cmark and libssh2

## Verdict

- **New classes: 0.** Every problem maps to one of C1 to C9.
- **Check defects: 14**, and C2 alone accounts for 4 of them. On these
  trees the class list holds, but several class checks are still lists of
  known instances.
- **Counts:** (i) 12, (ii) 14, (iii) 0, (iv) 4.
- **New MUST rows: 3.** None is a new rule: `CMK-DEP-19`, `CMK-INST-24`
  and `CMK-VER-07` are MUST rows the rule set already has.
  - Both trees hit a failure that one of these three rows exists to stop.
  - The skill neither cites nor checks any of them.
  - The fixes below cite them, so the skill's MUST table grows from 16 to 19
    rows.
  - By the stop test (no new MUST rule and no new failure mode), the program
    has not converged. The class structure passed the held-out test.

I followed the skill step by step on each tree. Each problem is filed in one
of four categories:

| Category | Meaning |
|---|---|
| (i) | The class check caught it |
| (ii) | The class check missed it: a check defect |
| (iii) | New class |
| (iv) | A text defect |

Two things below are not problems I ran into by following the skill:

- **Negative controls** break a correct conversion on purpose, the same way
  as the "bare negative control" in failure-modes.md C3. They are labelled
  NEG.
- **Fix candidates** that were measured are labelled FIX.

## Step table: cmark (5ba25ff4)

| Step | What was done | Exit check result (3.31.12 and 4.4.2) | Evidence |
|---|---|---|---|
| Entry | Default configure, ungated, on 3.31 | exit 1, `No CMAKE_CXX_COMPILER could be found` (`project(cmark VERSION 0.30.3)` enables CXX; api_test has a .cpp). With the zig c++ wrapper as a plan option: exit 0, build 0, `Total Tests: 9`, `git status --short` empty | out/10 |
| 0 | I1 to I12, F1, F1b, caller contract | I1 5 bare calls, I2 1 (`add_compile_options($<$<CONFIG:Debug>:-DCMARK_DEBUG_NODES>)`), I3 4 (FindAsan `CMAKE_<LANG>_FLAGS_ASAN ... FORCE`), I6 1, I12 3 (FindAsan `CMAKE_REQUIRED_FLAGS`), F1 `CMakeLists.txt:1 VERSION 3.7`, I11 empty, I9 vacuous | cm/inv-s0.txt |
| 1 | `3.7...4.4` | F1 exit 1, F1b lists the new range, probe `CMP0083=NEW`, canary exit 1 on both, gated configure exit 0 on both, configured-file diff (3 files) exit 0 for each. But `Total Tests: 9` became `Total Tests: 2` (`api_test`, `skipping_spectests`), and ctest reports `100% tests passed out of 2` (A2) | out/11 |
| 1b | FindPythonInterp → `find_package(Python3 COMPONENTS Interpreter)` | gated exit 0 on both, `Total Tests: 9` | out/11 |
| 2 | The Debug-only definition goes onto each target in `cmark_add_compile_options` | I2 exit 1. Gated configure and build exit 0. Flag-set diff exit 0 on 4 targets in Release and in Debug | out/12 |
| 2b | `target_compile_definitions(cmark_static PUBLIC CMARK_STATIC_DEFINE)` replaces `COMPILE_FLAGS` (found at step 6, A8) | Flag-set diff exit 0 in both configurations. Windows-target round trip exit 0 | out/12, out/15 |
| 3 | `PRIVATE` on 5 calls | I1 all keyworded. Build 0 with `-DCMARK_SHARED=OFF`. `-DCMARK_LIB_FUZZER=ON` fails on gcc (`-fsanitize-coverage=trace-pc-guard`), so it is `flagged-not-converted` | out/12 |
| 4 | FindAsan flags go onto targets as `$<CONFIG:Asan>` compile and link options. `CMAKE_C_STANDARD` trio goes inside `NOT DEFINED` | I3 exit 1. Flag-set diff exit 0 in Release, Debug and Asan. `-DCMAKE_C_STANDARD=11` now gives `-std=gnu11` (it was `-std=c99`) | out/13 |
| 5 | `CMARK_TESTS` defaults to `PROJECT_IS_TOP_LEVEL` (with a <3.21 fallback), `include(CTest)` inside the gate, build-type guard | Smoke: `Total Tests: 0`, api_test grep exit 1, pass 3 build 0. Top-level `Total Tests: 9`, `CMAKE_BUILD_TYPE=Release`. Old `-DCMARK_TESTS=ON` exit 0. Flag-set diff exit 0 | out/14 |
| 6 | Already compliant (GNUInstallDirs, `configure_package_config_file`, version file, `NAMESPACE cmark::`), so no diff | Round trip exit 0 on both lines for `cmark::cmark cmark::cmark_static`, and per target. `cmark::cmark_exe` cannot be linked (A10). pkg-config diff exit 0 | out/15 |
| 7 | Smoke passes 1 and 3 (pass 2 not applicable: every option is prefixed) | As in step 5 | out/14 |
| 8 | CI greps and gersemi | CORE-01 over `.github/workflows Makefile`: exit 1, no gate. CORE-05 exit 2 (no `scripts`). gersemi gate line exit 123, 7 of 7 files. Runner-image CMake is a `CMK-VER-03` finding, reported to the owner | out/16 |

## Step table: libssh2 (a312b433)

| Step | What was done | Exit check result (3.31.12 and 4.4.2) | Evidence |
|---|---|---|---|
| Entry | Default configure, ungated, on 3.31 | exit 0, build 0, `Total Tests: 44`, `git status` empty. The configure also wrote `$HOME/.cmake/packages/libssh2/<hash>` → `ls/entry-331/src` | out/20 |
| 0 | Inventory | I1 3 bare, I2 7, I3 16 (all appends), I4 1 (private helper), I7 1 (under tests/cmake, not a finding), F1 2, I11 empty, I12 5. The option lister gives 18 lines, without `CRYPTO_BACKEND` | ls/inv-s0.txt |
| 1 | `3.7...4.4` on both floors | Gated configure exit 1 on both: CMP0175 is now NEW, so `add_custom_command(TARGET): DEPENDS` and a missing `POST_BUILD` are errors (B2) | out/20 |
| 1b | CMP0175 repair: drop `DEPENDS`, add `POST_BUILD` | Gated exit 0 on both, `CMP0083=NEW`, `Total Tests: 44`. Canary exit 1. Configured-file diff exit 0 (3 files). The registry now holds 4 build trees, every one written by a step-0 configure, the ungated 4.4 configure of the configured-file check among them | out/20 |
| 2 | `LIBSSH2DEBUG` and `HAVE_CONFIG_H` become `PRIVATE` on the libraries, tests and examples. `LIBSSH2_NO_DEPRECATED` becomes `PUBLIC` | Reader grep: `NO_DEPRECATED` read at 5 lines of include/libssh2.h, the other two not read. Flag-set diff exit 0 on 5 targets in default, Debug and `-DLIBSSH2_NO_DEPRECATED=ON`. Four I2 hits in the wolfSSL, libgcrypt, mbedTLS and WinCNG branches are `flagged-not-converted` | out/21 |
| 3 | `PRIVATE` on 3 calls | Build 0 with `BUILD_SHARED_LIBS=OFF`, `BUILD_STATIC_LIBS=OFF` and `LINT=ON` on both lines | out/21 |
| 4 | PickyWarnings appends go onto `LIBSSH2_PICKY_OPTIONS` target options | Flag-set diff exit 0 in all three configurations. Configured-file diff s3 to s4 exit 0 with and without `ENABLE_WERROR` (these appends also reach try_compile). Backend and MSVC appends are `flagged-not-converted` | out/21 |
| 5 | 14 toggles and the `CRYPTO_BACKEND` cache take the `LIBSSH2_` prefix, each taking its old spelling at top level. Tests and examples default to `PROJECT_IS_TOP_LEVEL`. `BUILD_SHARED_LIBS` shim | Smoke: `asub_bsl` exit 1, `Total Tests: 0`, pass 3 build 0. Every old `-D` spelling lands in the new cache entry (zlib fails for lack of a host library). Top-level `Total Tests: 44`. Flag-set diff exit 0 | out/22 |
| 6 | `configure_package_config_file` for the hand-configured Config (w7-s6). Then (w7-s6b) the Config restores the consumer's `CMAKE_MODULE_PATH` | Round trip exit 0 on both lines for each of `libssh2::libssh2_static`, `libssh2::libssh2_shared`, `libssh2::libssh2` and `Libssh2::libssh2`. `_DIR` resolves under `moved/`. pkg-config diff exit 0 | out/23 |
| 7 | Smoke at w7-s6b | pass 1 exit 0, `asub_bsl` exit 1, `Total Tests: 0`, pass 3 build 0 | out/23 |
| 8 | CI greps and gersemi | CORE-01 exit 1. CORE-05 exit 2. INST-18 finds 0 `cmake --install` lines, but ci.yml runs `tests/cmake/test.sh`, which installs and consumes (B11). gersemi exit 123, 12 of 13 files | out/24 |

## Classification

| # | Problem | Cat | Class | Evidence |
|---|---|---|---|---|
| A1 | cmark does not configure by default: `project()` enables CXX and the host has no C++ compiler | i | C9 | The entry check says an absent compiler is the owner's. The zig wrapper goes in as a plan option, exit 0 (out/10) |
| A2 | Raising `<max>` turns CMP0148 NEW. `find_package(PythonInterp 3)` then finds nothing, and 7 spec tests become one `echo` test. Every step 1 check passes: F1 empty, probe NEW, canary 1, gated exit 0 (a plain `CMake Warning`, not a dev warning), configured-file diff empty. `ctest -N`: 9 before, 2 after. `100% tests passed out of 2`, exit 0. This breaks MUST `CMK-DEP-19`, which the skill never runs | ii | C3 | out/11 |
| A3 | The configured-file list command is case-sensitive, so it misses `CONFIGURE_FILE(` (cmark's config.h). config.h did not change here, but it was never listed | ii | C8 | out/11 (2 lines), `proposed.sh` with `-rni` finds 3 (out/24) |
| A4 | The flag-set check runs in one configuration. NEG: dropping the Debug-only `-DCMARK_DEBUG_NODES` passes every step 2 check (I2 exit 1, gated configure and build 0, Release diff exit 0). The Debug diff prints 4 `< -DCMARK_DEBUG_NODES`. libssh2's `LIBSSH2DEBUG` (default from `CMAKE_BUILD_TYPE STREQUAL "Debug"`) shows up in 0 default and 5 Debug flag sets | ii | C3 | out/12, out/21 |
| A5 | The flag-set check reads compile commands only. NEG: dropping the Asan `target_link_options` gives I3 exit 1 and an Asan flag-set diff of exit 0. The cmark_exe link line loses `-fsanitize=address`, and the link fails with ``undefined reference to `__asan_option_detect_stack_use_after_return'``. The correct s4 conversion also changed the link line (`-O1 -g -fno-omit-frame-pointer ...` left it), and nothing saw that either. The host has no libasan, so s3 and s4 also fail to link, with `cannot find libasan.so.8.0.0`. The discriminating fact is the link line | ii | C3 | out/13 |
| A6 | I11 matches only `CMAKE_CXX_STANDARD`. cmark's unguarded `set(CMAKE_C_STANDARD 99)` ignores a user's (or a profile's) `-DCMAKE_C_STANDARD=11`: `-std=c99`, exit 0, no warning. After the guard, `-std=gnu11` | ii | C2 | out/13 |
| A7 | I12 lists try-compile probe flags (`CMAKE_REQUIRED_FLAGS "-Werror -fsanitize=address"` in cmark, `"/WX-"` in libssh2). Read literally ("a hit outside a developer option that defaults OFF is the finding"), these are findings, yet no build flag is involved | iv | - | out/13, out/21 |
| A8 | `COMPILE_FLAGS -DCMARK_STATIC_DEFINE` on cmark_static. The installed cmark_export.h reads it, but no inventory command lists a definition set as a target property, so the C5 reader grep never ran. Linux round trip exit 0. The same round trip through a Windows-target toolchain exits 1 with `undefined symbol: __declspec(dllimport) cmark_version`. After the `PUBLIC` fix: exit 0 | ii | C5 | out/15 (`rt s5static xwin exit=1`, `rt s2b-static xwin exit=0`) |
| A9 | The round trip over `cmark::cmark cmark::cmark_static` in one consumer resolves `cmark_version` from libcmark.so (`nm -u`, `ldd`). libcmark.a is on the link line and supplies nothing, so the static target is never tested. The skill's remedy, "one exported function per target", cannot apply when two targets export the same API. Per target, the static consumer defines 106 `cmark_` symbols | ii | C1 | out/15 |
| A10 | The caller contract names the exported executable `cmark::cmark_exe`. As a `TARGETS` entry the round trip fails at generate with `links to: cmark::cmark_exe but the target was not found` | iv | - | out/15 |
| A11 | I6 listed the unguarded build-type `FORCE`. Smoke pass 1 at s4 caught `Total Tests: 9` and `api_test: phony`. At s5: 0 and empty | i | C2 | out/14 |
| A12 | `-DCMARK_LIB_FUZZER=ON` cannot build with gcc | i | C9 | `flagged-not-converted`, prerequisite clang plus libFuzzer (out/12) |
| A13 | Smoke pass 3 compiled a consumer through `add_subdirectory` on both trees | i | C1 | out/14, out/23 |
| A14 | cmark CI configures through a root `Makefile`. `CI_SCRIPTS=Makefile` works as a file operand, and the grep reads "no gate" correctly. Runner-image CMake is recorded under `CMK-VER-03` | i | C8 | out/16 |
| A15 | proofs.md says the gersemi gate line exits 1 on an unformatted file. Through `xargs` it exits 123 on both trees (gersemi alone: 1) | iv | - | out/16, out/24 |
| B2 | Raising `<max>` turns CMP0175 NEW, and the gated configure exits 1 on both lines. Step 1 names an owner only for a configured-file repair ("second diff before step 2"). A code repair the new range needs has none, though `CMK-VER-07` requires migrating to NEW. A2's PythonInterp repair is the same gap | ii | C9 | out/20 |
| B4 | The reader grep over include/ (installed headers only) decided `PUBLIC` for `LIBSSH2_NO_DEPRECATED` and `PRIVATE` for `LIBSSH2DEBUG` and `HAVE_CONFIG_H`. The per-target flag-set diff held on 5 targets | i | C5 | out/21 |
| B5 | The tree's own `export(PACKAGE)` (floor 3.7, CMP0090 OLD) wrote a user-registry entry during the entry check. NEG (version file not installed, a `CMK-INST-04` defect): the verbatim round trip exits **0** on both lines, and `libssh2_DIR` is the entry-check build tree `ls/entry2-331/src`. With an empty HOME, or `-DCMAKE_FIND_USE_PACKAGE_REGISTRY=OFF`, it exits 1 with `version: unknown`. The skill does not run the `CMK-INST-24` grep and never asserts the `_DIR` line | ii | C8 | out/23 |
| B6 | The smoke's option lister misses `set(CRYPTO_BACKEND "" CACHE` / `STRING ...)` (a cache STRING, split across lines): 0 lines. A parent owning `CRYPTO_BACKEND=mbedTLS` fails libssh2's configure with `Could NOT find MbedTLS` | ii | C2 | out/22 |
| B7 | The step 5 shim takes the old spelling only on a first configure. Reconfiguring an existing tree with `-DENABLE_WERROR=ON` gives 105 `-Werror` in build.ninja before step 5 (s4) and 0 after (s5), with `LIBSSH2_ENABLE_WERROR:BOOL=OFF`, exit 0 and no warning. The step 5 exit runs the old `-D` only fresh | ii | C6 | out/22 |
| B8 | The smoke's target grep is a substring match. `NAME=ssh2` (an example) matches `libssh2.a`, `libssh2.so`, `libssh2_shared` and `libssh2_static`: 5 lines, so a false "leak" that no step can clear. Anchored `^ssh2: ` gives 0 | iv | - | out/22 |
| B9 | The installed Config runs `list(PREPEND CMAKE_MODULE_PATH ...)` in the consumer's scope. After `find_package(libssh2)`, the consumer's own `FindWolfSSL.cmake` is shadowed (`after=[.../moved/lib64/cmake/libssh2;.../consumer/cmake]`, `Could NOT find WolfSSL`), exit 0 on both lines. With the save and restore fix: `FindWolfSSL: the consumer own module` | ii | C2 | out/23 |
| B10 | The library's `include(CPack)` rewrites the parent's build-root `CPackConfig.cmake`. A parent `parentapp 9.9.9` gets `CPACK_PACKAGE_VERSION "1.11.1_DEV"`, exit 0, and every smoke grep reads clean | ii | C2 | out/23 |
| B11 | The INST-18 greps read only `.github/workflows` and only the `cmake --install` spelling: 0 hits. The tree's install and consumer test runs from `tests/cmake/test.sh` (`make -j3 -C bld-libssh2 DESTDIR=pkg install`, then `-DCMAKE_PREFIX_PATH=...`), which ci.yml calls | ii | C8 | out/24 |
| B12 | Smoke pass 2 at s4 caught every unprefixed toggle: each dev-only target grep hit, and a parent owning `ENABLE_ZLIB_COMPRESSION=ON` failed configure. At s5, every old `-D` spelling reached its new entry | i | C2 | out/22 |
| B13 | `asub_bsl` caught `option(BUILD_SHARED_LIBS ... ON)` at s4 (`asub_bsl=[ON]`) and read clean after the shim | i | C2 | out/22 |
| B14 | wolfSSL, libgcrypt, mbedTLS and WinCNG branches, and the three installed Find modules, cannot run on this host | i | C9 | `flagged-not-converted`, prerequisite named (plan file) |
| B15 | Every `contract:` exported name went through the round trip on both lines | i | C6 | out/23 |
| B16 | `CMK-CORE-05` over an absent `scripts` exits 2 on both trees | i | C8 | out/16, out/24 |
| B17 | The policy probe and F1b settled both floors (C4). The per-target flag-set diff (FM21) held for both shared and static pairs (C3) | i | C3, C4 | out/11, out/20, out/21 |

Counts: (i) 12 (A1, A11, A12, A13, A14, B4, B12, B13, B14, B15, B16, B17).
(ii) 14 (A2, A3, A4, A5, A6, A8, A9, B2, B5, B6, B7, B9, B10, B11). (iii) 0.
(iv) 4 (A7, A10, A15, B8).

By class, the (ii) rows fall as follows:

| Class | (ii) rows | Count |
|---|---|---|
| C1 | A9 | 1 |
| C2 | A6, B6, B9, B10 | 4 |
| C3 | A2, A4, A5 | 3 |
| C5 | A8 | 1 |
| C6 | B7 | 1 |
| C8 | A3, B5, B11 | 3 |
| C9 | B2 | 1 |

## Fixes

Each fix names the file and the exact change. Each one marked "measured" was
run through `proposed.sh`, `rt-fixed-verbatim.sh` or a FIX branch. The results
are in out/22 to out/24.

1. **A2 and B2 (C3, C9). New MUST rows `CMK-DEP-19` and `CMK-VER-07`.**
   - In SKILL.md "Step 1 in detail", replace the sentence "A file
     `configure_file()` writes that changes under the new range (the
     configured-file check) is repaired in a second diff before step 2, never
     by lowering `<max>`." with this text:

     > Any repair the raised range needs is the floor's second diff, before
     > step 2, never a lower `<max>`:
     >
     > - a file `configure_file()` writes that changes (the configured-file
     >   check);
     > - a policy-removed Find module the tree calls (`CMK-DEP-19`:
     >   `find_package(PythonInterp)` becomes
     >   `find_package(Python3 COMPONENTS Interpreter)`);
     > - a `Policy CMPxxxx` error the new range raises (`CMK-VER-07`: migrate
     >   the code to NEW; libssh2's `add_custom_command(TARGET ... DEPENDS)`
     >   loses `DEPENDS` and gains `POST_BUILD`).

   - Step 1's exit cell: add "the `CMK-DEP-19` grep prints nothing, and the
     test-list diff is empty".
   - inventory.md: add the `CMK-DEP-19` grep as `I13`, copied from
     `rules/cmake-build/dependencies.md`. Under "The configured-file check",
     add:

     ```sh
     # The two build dirs of the configured-file check. Empty output = pass. A lost test is the finding.
     ctest --test-dir build-step0 -N > tests-step0.txt
     ctest --test-dir build-step1 -N > tests-step1.txt
     diff tests-step0.txt tests-step1.txt
     ```

   - Add both rows to the MUST table and to failure-modes.md: C3 "a policy
     that removes a Find module", C9 "a code repair the raised range needs".
   - Measured: the DEP-19 grep lists `test/CMakeLists.txt:7` and `:9` (out/24),
     and the test-list diff prints the 7 lost tests (out/11).
2. **A3 (C8).** In inventory.md, the configured-file list command changes from
   `grep -rn` to `grep -rni`, because CMake command names are
   case-insensitive. Measured: it now lists `src/CMakeLists.txt:194:CONFIGURE_FILE(`.
3. **A4 (C3).** In inventory.md "The flag-set check", add after the command:

   > Run it once per configuration the tree names: the default build type,
   > plus each value a `$<CONFIG:...>` genex, a `CMAKE_BUILD_TYPE` test or a
   > `CMAKE_<LANG>_FLAGS_<CONFIG>` name spells (pass
   > `-DCMAKE_BUILD_TYPE=<value>`).

   The list command:

   ```sh
   # A list to read: each configuration name is one more flag-set run.
   grep -rnoiE --include='CMakeLists.txt' --include='*.cmake' --exclude-dir='_deps' --exclude-dir='build*' \
     -e 'CONFIG:[A-Za-z]+' -e 'CMAKE_BUILD_TYPE[[:space:]]+STREQUAL[[:space:]]+"?[A-Za-z]+' \
     -e 'CMAKE_BUILD_TYPE[[:space:]]+MATCHES[[:space:]]+"?[A-Za-z]+' -e 'CMAKE_[A-Z]+_FLAGS_[A-Z]+' .
   ```

   Measured (run by hand, not in run.sh): it lists `CONFIG:Debug`, `profile`,
   `ubsan` and `CMAKE_C_FLAGS_ASAN` in cmark, and `STREQUAL "Debug` in
   libssh2.
4. **A5 (C3).** In inventory.md "The flag-set check", add a link-line half.
   It runs for each target a diff moves a linker flag onto or off (an I3
   `_LINKER_FLAGS` hit, `target_link_options`, `LINK_FLAGS`):

   ```sh
   # Ninja. Writes link-after.txt; link-before.txt comes from the step-1 commit. Empty diff = pass.
   ninja -C build-flags -t commands "$TGT" | tail -1 | tr ' ' '\n' | grep -e '^-' | sort -u > link-after.txt
   diff link-before.txt link-after.txt
   ```

   Measured: the pipeline gives `-fsanitize=address` at s4, and nothing for
   the NEG (out/13).
5. **A6 (C2).**
   - In inventory.md, I11 gains
     `-e 'set[[:space:]]*\([[:space:]]*CMAKE_C_STANDARD[[:space:]]'`, and its
     reading becomes "an enclosing `if()` that lacks
     `NOT DEFINED CMAKE_<LANG>_STANDARD`".
   - In SKILL.md, the steps 2 to 4 guard paragraph gets the same wording.
   - Note for the drafters: `CMK-TGT-05`'s variable sentence names only
     `CMAKE_CXX_STANDARD`, so the rule text needs the same widening. That is
     a MUST row whose text grows, not a new row.
   - Measured: the new I11 lists `CMakeLists.txt:17`.
6. **A7 (iv).** In inventory.md, the I12 reading gains:

   > A hit that sets `CMAKE_REQUIRED_FLAGS` feeds a try-compile probe, never a
   > target: `vacuous`. So is `/WX-`, which turns warnings-as-errors off.

7. **A8 (C5).**
   - inventory.md: add `I2b`, which lists definitions set as target or
     directory properties:

     ```sh
     # I2b: a list to read. Each -D in a hit gets the reader grep of SKILL.md steps 2 to 4.
     grep -rniE --include='CMakeLists.txt' --include='*.cmake' --exclude-dir='_deps' --exclude-dir='build*' \
       -e '[[:space:]]COMPILE_FLAGS[[:space:]]' -e '[[:space:]]COMPILE_DEFINITIONS[[:space:]]' .
     ```

   - SKILL.md steps 2 to 4 (C5 paragraph): add

     > A static library built beside a shared one shares its
     > `generate_export_header` header, which reads `<BASE>_STATIC_DEFINE`:
     > `PUBLIC` on the static target. A Linux consumer cannot show a missing
     > one. When CI has a Windows leg, the static target's round trip runs
     > there, or through a Windows cross toolchain.

   - Measured: I2b lists `src/CMakeLists.txt:64` and `:100`. The cross round
     trip goes from exit 1 to exit 0.
8. **A9 (C1).** In proofs.md, round trip paragraph, add:

   > When two targets in `TARGETS` export the same symbols (a shared and a
   > static build of one library), the call resolves from whichever the
   > linker reads first. Run the round trip once per target instead.

   Measured per target, both exit 0.
9. **A10 (iv).** In SKILL.md step 6 "Exported names", add:

   > An exported executable is not a `TARGETS` entry. The consumer checks it
   > with `if(NOT TARGET <name>)` and `message(FATAL_ERROR)`.

10. **A15 (iv).** In proofs.md, "exit 1 on an unformatted file" becomes "exit
    1 from gersemi, which `xargs` reports as 123; any non-zero exit is the
    finding".
11. **B5 (C8). New MUST row `CMK-INST-24`.**
    - proofs.md round trip: the consumer configure gains
      `-DCMAKE_FIND_USE_PACKAGE_REGISTRY=OFF` (CMake ≥ 3.16). The last line
      becomes `grep -e "^${PKG}_DIR:PATH=$W/moved/" "$W/consumer-build/CMakeCache.txt"`,
      which under `set -e` exits 1 when the consumer resolved anything else.
    - inventory.md: add the `CMK-INST-24` grep from install-and-export.md as
      `I14`, a step 6 row.
    - SKILL.md: add the MUST table row, and add to the C8 statement "or a
      proof that resolved a copy other than the one under test (a registry
      entry, a stale install)".
    - Measured with `rt-fixed-verbatim.sh`: exit 1 on the NEG on both lines,
      exit 0 on w7-s6b with `_DIR` under `moved/`. The variable exists on
      3.31.12 and 4.4.2 (`--help-variable` exit 0).
12. **B6 (C2).** In proofs.md, the option lister becomes
    `-e '^[[:space:]]*option[[:space:]]*\(' -e 'CACHE[[:space:]]+BOOL' -e 'CACHE[[:space:]]+STRING' -e 'CACHE[[:space:]]+PATH' -e 'CACHE[[:space:]]+FILEPATH' -e 'CACHE[[:space:]]*$'`.
    Measured: it lists `CMakeLists.txt:292:set(CRYPTO_BACKEND "" CACHE`. The
    cmark `CACHE STRING` hits it adds are settled by I6 and I3.
13. **B7 (C6).**
    - SKILL.md step 5 exit cell: "the old `-D` spelling of each renamed
      option" becomes "..., once on a fresh configure and once as a
      re-configure of the step-4 build tree".
    - The shim snippet gains a migration of an untyped command-line entry,
      after the `option()`:

      ```cmake
      get_property(_old_type CACHE BUILD_TESTING PROPERTY TYPE)
      if(PROJECT_IS_TOP_LEVEL AND _old_type STREQUAL "UNINITIALIZED")
          set(OPENJPEG_BUILD_TESTING "${BUILD_TESTING}" CACHE BOOL "Build the tests" FORCE)
          unset(BUILD_TESTING CACHE)
      endif()
      ```

    - Measured as a macro on the fix-recfg branch: the old `-D` on
      re-configure wins (105 `-Werror`), a later new spelling wins after it,
      and a CTest-created typed `BUILD_TESTING` is left alone (out/22).
14. **B9 and B10 (C2), and the class-level check the four C2 misses point to.**
    - SKILL.md step 5, "The tree shares one cache with any parent" paragraph:
      add "and one build root: `include(CPack)`, `feature_summary()` and any
      write under `${CMAKE_BINARY_DIR}` run only under
      `PROJECT_IS_TOP_LEVEL`".
    - SKILL.md step 6: add

      > A Config that puts its own directory on `CMAKE_MODULE_PATH` for
      > `find_dependency` restores the consumer's value before it includes
      > the targets file.

    - proofs.md: two outer-layer state checks replace the per-name lists as
      the C2 class check. Neither needs to know a name in advance.
      - (a) Smoke pass 0: configure the smoke parent once without the
        `add_subdirectory` and diff the two caches, filtered to `BOOL`,
        `STRING`, `PATH` and `FILEPATH` entries without the project prefix.
        Also compare the build-root `CPackConfig.cmake`. Every entry the
        library adds is a pass 2 name, and a build-root file that differs is
        the finding.
      - (b) The round-trip consumer records `CMAKE_MODULE_PATH` before
        `find_package` and stops with `FATAL_ERROR` when it differs after.
    - Measured: (a) is `statediff.sh`. At s4 it lists 12 unprefixed
      toggles and `CRYPTO_BACKEND:STRING` (the base parent owns `BUILD_TESTING` through CTest), plus `CPackConfig.cmake`. At
      s6b it lists only GNUInstallDirs, FindOpenSSL and FindZLIB entries
      (noise to read past) and `CPackConfig.cmake` (out/23). For (b), the
      before and after values were measured, but the assertion itself was not
      run.
15. **B8 (iv).** In proofs.md smoke passes 1 and 2, the target grep becomes
    `-e "^$NAME: "` (Ninja's `help` format). Measured: 0 lines for `ssh2`
    against 5 unanchored.
16. **B11 (C8).** In proofs.md "For CMK-INST-18", both greps take
    `${CI_SCRIPTS:+"$CI_SCRIPTS"}` and match `-e 'cmake --install' -e '--target install' -e 'make .* install'`.
    Measured on libssh2 with `CI_SCRIPTS=tests/cmake/test.sh`: it lists
    `test.sh:21` and the consumer's `-DCMAKE_PREFIX_PATH` at `:23`. The
    ci.yml hits are dependency installs, a list to read.

## New classes

None. Three rows came closest; none is a new mechanism:

- **B5 (a stale registry copy passes the round trip).** No existing class
  statement names it, but the mechanism is C8's: the check could not fire
  on the artifact under test and read clean. The skill already prints the
  `_DIR` line, which shows the authors expected this. Fix 11 turns that line
  into an assertion and widens the C8 statement.
- **B9 and B10 (an installed Config, or a library's `include(CPack)`,
  writing into the consumer's scope or build root).** This is C2's
  mechanism, "a write that creates or overrides the outer layer's entry",
  through two channels (the install channel and the build root) that C2's
  check does not reach.
- **A2 and B2 (raising `<max>` changes behaviour outside configured
  files).** This is C3's "a policy that rewrites a configured file" with the
  output widened to the test list, and C9's ownership gap. Fix 1 folds both
  into one step 1 sentence.

## Wave 7 applied (2026-09-26)

Applier: opus. Scratch `$H` as above. `bash $H/applier-run.sh` reproduces every
number in this section into `$H/out/30` to `out/33` (`verify-applier*.sh`). The
proofs.md and inventory.md fences were run as extracted byte for byte from the
shipped files (`extract.py`), with `cmake`/`ctest` bound to one line per run.
Tools as in the frontmatter: `cmake version 3.31.12` and `cmake version 4.4.2`
printed at the head of out/30, ninja 1.13.2, gcc 15.2.1, zig c++ for cmark's CXX.
The applier's build trees (`va/`, `vp/`) were deleted afterwards.

### Re-run of the three most consequential claims

All three reproduce. None is rejected.

| Claim | Command (from `$H`, HOME redirected) | Exit | Excerpt |
|---|---|---|---|
| A2 | `cmk 4.4 -S cmark -B va/cm-s0 --fresh` at `w7-s0`, then `cmk <line> -S cmark -B va/cm-s1-<line> --fresh -Werror=<dev or author> -DCMAKE_PROJECT_INCLUDE=probe.cmake` at `w7-s1`, then `ctest -N` on both | 0, 0 on 3.31.12 and 4.4.2 | `CMP0148=NEW`, `Total Tests: 9` against `Total Tests: 2` (`skipping_spectests` replaces 8 tests) |
| B2 | `cmk <line> -S libssh2 -B va/ls-s1-<line> --fresh <gate>` at `w7-s1` | 1 on 3.31.12 and 4.4.2 | `CMake Error at cmake/CopyRuntimeDependencies.cmake:59 (add_custom_command)`, `add_custom_command(TARGET): DEPENDS` |
| B5 | entry configure and build of `w7-s0` on 3.31, then the verbatim pre-wave-7 round trip (`rt.sh`) at `neg-ver` | 0 on both lines | `libssh2_DIR:PATH=$H/va/ls-entry/src`. The same consumer with `-DCMAKE_FIND_USE_PACKAGE_REGISTRY=OFF`: exit 1, `version: unknown` |

Two corrections to the ledger's fixes:

1. **Fix 1's test-list diff never reads empty.** `diff` over raw `ctest -N`
   output prints every line that names a build directory, so it exits 1 on
   any two trees (out/30, `A2 test-list diff`, 30 changed lines per side before the test names). The shipped form
   pipes each `ctest -N` through `grep -e 'Test *#'` and diffs only the names.
   Run from inventory.md verbatim on cmark: exactly the 8 lost names and
   `skipping_spectests` (out/33).
2. **B2's error does not name its policy.** `grep -c CMP0175` over the gated
   log is 0 on both lines. The NEW behaviour raises a plain `CMake Error`, not a
   `Policy CMPxxxx is not set` gate error, so the step 1 text says "an error a
   newly `NEW` policy raises: migrate the code (`CMK-VER-07`), never
   `cmake_policy(SET ... OLD)`" rather than calling it a policy error.

### What was applied

| Ledger fix | Where | Measured by the applier |
|---|---|---|
| 1 A2, B2 (C3, C9) | SKILL.md step 1 detail (the second diff owns every repair the range needs), step 1 row (exit check, `CMK-DEP-19`, `CMK-VER-07`, class C9), inventory.md `I13` and the test-name diff, reviewable units, C9 statement, failure-modes C3 and C9, MUST rows 17 and 18 | `I13` in the skill's spelling (`-i`, `[[:space:]]*` before the paren, excludes): cmark `test/CMakeLists.txt:7` and `:9`, libssh2 exit 1 (out/33) |
| 2 A3 (C8) | inventory.md configured-file list `-rni` | cmark `src/CMakeLists.txt:194:CONFIGURE_FILE(` listed (out/33) |
| 3 A4 (C3) | inventory.md per-configuration run and its list command | cmark `CONFIG:Debug`, `MATCHES profile`, `MATCHES ubsan`, `CMAKE_C_FLAGS_ASAN`, libssh2 `STREQUAL "Debug` (out/33). This was run by hand in the holdout |
| 4 A5 (C3) | inventory.md link-line half | Configure only, Asan, 4.4.2: s3 to NEG prints `< -fsanitize=address` among 5 lines, s4 to NEG prints only `< -fsanitize=address`, and the correct s3 to s4 prints the 4 compile flags that left the link line (out/31). The reading says a `<` line the plan names as compile-only passes |
| 5 A6 (C2) | inventory.md `I11` and reading, SKILL.md steps 2 to 4 (`CMAKE_<LANG>_STANDARD`) | cmark `CMakeLists.txt:17: set(CMAKE_C_STANDARD 99)` (out/33) |
| 6 A7 (iv) | inventory.md `I12` reading | text only |
| 7 A8 (C5) | inventory.md `I2b` (the property name anchored at a line start or whitespace on both sides), SKILL.md steps 2 to 4 shared-and-static sentence, C5 statement, plan-file command list | cmark `:64` and `:100`, libssh2 exit 1 (out/33) |
| 8 A9 (C1) | proofs.md round-trip paragraph, step 6 row "once per exported target", C1 statement | cmark per target, both lines exit 0 with `_DIR` under `moved/` (out/32) |
| 9 A10 (iv) | SKILL.md step 6 exported names | text only |
| 10 A15 (iv) | proofs.md gersemi sentence | text only |
| 11 B5 (C8), `CMK-INST-24` | proofs.md round trip (registry switch, anchored `_DIR` grep), inventory.md `I14`, step 6 row, C8 statement, MUST row 19 | Round trip extracted from proofs.md: `neg-ver` exit 1 `version: unknown` on both lines with the entry-check registry entry present, `w7-s6b` exit 0 (out/32). `I14` lists libssh2 `src/CMakeLists.txt:191` |
| 12 B6 (C2) | proofs.md option lister | libssh2 `CMakeLists.txt:292:set(CRYPTO_BACKEND "" CACHE` listed (out/32) |
| 13 B7 (C6) | SKILL.md step 5 snippet (`UNINITIALIZED` block) and step 5 exit cell, failure-modes C6 | not re-run: the holdout's `fix-recfg` measurement (out/22) stands |
| 14 B9, B10 (C2) | SKILL.md step 5 build-root sentence, step 6 consumer-scope bullet, C2 statement. proofs.md smoke state diff and the round trip's `CMAKE_MODULE_PATH` guard | The guard, never run in the holdout, now runs: `w7-s6` exit 1 `find_package changed CMAKE_MODULE_PATH`, `w7-s6b` exit 0, both lines. The state diff at libssh2 `w7-s4` lists the 12 unprefixed toggles, `CRYPTO_BACKEND:STRING`, 16 `CPACK_*` entries, and `CPackConfig.cmake` and `CPackSourceConfig.cmake` in the root list. At `w7-s6b` only `CMAKE_INSTALL_*`, Find-module results, `CPACK_*` and the two CPack files remain (the holdout left `include(CPack)` unguarded). cmark `w7-s5` shows only `CMAKE_INSTALL_*` and the `CMAKE_CXX_*` entries of the language the library enables, and `lib-build` (out/32) |
| 15 B8 (iv) | proofs.md passes 1 and 2 target grep `"^$NAME: "` | libssh2 `w7-s4`: `ssh2: phony` found, `w7-s6b`: exit 1 (out/32) |
| 16 B11 (C8) | proofs.md CI fence (`CMK-INST-18` pair with `CI_SCRIPTS` and three install spellings), CI_SCRIPTS comment | libssh2 with `CI_SCRIPTS=tests/cmake/test.sh`: `test.sh:21` and `:23` listed beside five ci.yml dependency installs (out/32) |

Budgets held by compressing evidence that failure-modes.md already carries:
SKILL.md 450, inventory.md 300, proofs.md 300, failure-modes.md 297 lines. The
seven-tree list moved from the SKILL.md preamble to failure-modes.md. Every
fenced command line that left is one the fixes changed on purpose (the round
trip's consumer, the option lister, both target greps, `I11`, the
configured-file list, the `CMK-INST-18` greps, and reworded comments).

### Class and MUST decisions

- **New classes: 0.** Checked against fm-classes-modernize.md: every row is an
  instance of C1 to C9, recorded in that file's class tables.
- **New MUST rows in the skill's table: 3**, rows 17 to 19, `CMK-DEP-19`,
  `CMK-VER-07` and `CMK-INST-24`. Each is an existing MUST rule in the
  `cmake-build` set. Each has a reproduction above and a harm on a held-out
  tree the skill neither cited nor checked. No new rule ID is minted.
- **New rule failure modes: 0.** No rule depth file was edited.
- **Checker:** `check-artifacts.py ... skills/cmake-modernize` prints `clean`,
  exit 0.

### Handbacks

1. `rules/cmake-build/targets.md:109`, in the `CMK-TGT-05` statement: replace
   ``Set `CMAKE_CXX_STANDARD` only inside `if(NOT DEFINED CMAKE_CXX_STANDARD)`.``
   with ``Set `CMAKE_<LANG>_STANDARD` (`CMAKE_C_STANDARD` as `CMAKE_CXX_STANDARD`) only inside `if(NOT DEFINED CMAKE_<LANG>_STANDARD)`.``
   Its gate line at `:96` scans only `cmake_cxx_`. Proposed:
   `guard_scan 'set[[:space:]]*[(][[:space:]]*cmake_(c|cxx)_(standard|standard_required|extensions)[[:space:])]' 'not[[:space:]]+defined[[:space:]]+cmake_(c|cxx)_standard[[:space:])]'`.
   Not measured by this applier. Measure it on cmark `w7-s0` before applying.
2. `.agents/research/cmake-topic-map.md:2071`, note 3.1: append "Wave 7
   (2026-09-26) adds DEP-19, VER-07 and INST-24, which steps 1 and 6 now cite
   (19 rows)."

### Convergence

Not converged by the stop test: the skill's MUST table grew by 3 rows. The
class list converged. Two fresh trees produced no new class, and every check
defect is now a class-level check or a widened pattern.

## Handbacks applied (2026-09-26)

Applier: opus, rules owner. Scratch `R=/home/mherwig/.cache/cmake-measure-scratch/w7/handbacks-rules`.
`bash $R/run-tgt05.sh` reproduces every number below into `$R/run-tgt05.out` (exit 0). It extracts
cmark `w7-s0` with `git archive`, plus two copies: `cm-guarded` (the block under
`if(NOT MSVC AND NOT DEFINED CMAKE_C_STANDARD)`) and `cm-wrong` (under `if(NOT DEFINED CMAKE_CXX_STANDARD)`).
`guard_scan` is the targets.md function verbatim. Build trees were deleted after the run.

| Check | Command | Version | Exit | Excerpt |
|---|---|---|---|---|
| Old gate line (1) on `w7-s0` | `guard_scan` with `cmake_cxx_` setter and guard | n/a | 0 | empty (the miss) |
| Handback's one-line form on `w7-s0` | `guard_scan` with `cmake_(c\|cxx)_` setter and guard | n/a | 0 | `./CMakeLists.txt:17: set(CMAKE_C_STANDARD 99)`, `:18`, `:19` |
| Handback's one-line form on `cm-wrong` | same | n/a | 0 | empty: a C setter under a C++ guard passes (false pass) |
| Per-language form (two lines) on `w7-s0`, `cm-guarded`, `cm-wrong` | `guard_scan` once with `cmake_c_`, once with `cmake_cxx_` | n/a | 0 | `:17` to `:19` listed, empty, `:17` to `:19` listed |
| Harm | `cmake -S cm-s0 -B ... -G Ninja -DCMAKE_EXPORT_COMPILE_COMMANDS=ON -DCMARK_TESTS=OFF -DCMAKE_C_STANDARD=11`, then the `-std=` grep over `compile_commands.json` | 3.31.12, 4.4.2 | 0 | `cm-s0`: `-std=c99`. `cm-guarded`: `-std=gnu11` |

1. **Applied** (handback 1). `rules/cmake-build/targets.md` CMK-TGT-05 statement now reads
   ``Set `CMAKE_<LANG>_STANDARD` (`CMAKE_C_STANDARD` as `CMAKE_CXX_STANDARD`) only inside `if(NOT DEFINED CMAKE_<LANG>_STANDARD)`.``
   verbatim. Its Verification cell gains the cmark measurement and the wrong-language red case.
   Severity unchanged (MUST).
2. **Applied with a changed form** (handback 2). The one-line `(c|cxx)` form reproduces the cmark
   hit, but its guard ERE accepts either language's guard, so `cm-wrong` passes. Gate line (1)
   in targets.md is now two `guard_scan` lines, one per language, which catch all three cases.
   Gate line (2), the `CMK-TGT-06` pairing, stays C++ only: no handback asked for it.
3. **Not applied, handed back** (handback 3). `.agents/research/cmake-topic-map.md` note 3.1 is
   outside the rules applier's file set. The line to append is unchanged: "Wave 7 (2026-09-26)
   adds DEP-19, VER-07 and INST-24, which steps 1 and 6 now cite (19 rows)."

Checker: `check-artifacts.py` with the six `--forbid` operands on `rules/cmake-build.md
rules/cpp-packaging.md` printed `clean`, exit 0. No new MUST row, no new rule failure mode.

---
title: "Wave 6 — cmake-modernize run on two new real-tree shapes"
date: 2026-09-26
model: opus
skill: cmake-modernize
trees:
  - repo: https://github.com/uclouvain/openjpeg
    commit: 8314119b067c0fc77834731168daaebd379fdb12
    date: 2026-09-05
    shape: >-
      C, several libraries in one build (openjp2 shared + openjp2_static from one source list, optional openjpip),
      three installed executables (opj_compress, opj_decompress, opj_dump) in the same export set, four
      configure_file-generated headers (opj_config.h is installed), a vendored thirdparty/ (libz, libpng, libtiff,
      lcms2, astyle) whose glue file reads the project's options, an un-namespaced install(EXPORT) with a
      hand-written OpenJPEGConfig.cmake.in whose variables INSTALL.md documents, a hand-written libopenjp2.pc,
      floor 3.10...3.31.5, CI through a ctest -S script on the runner image's CMake
    clone: shallow (git clone --depth 1), local step commits tagged w6-s0 .. w6-final
  - repo: https://github.com/madler/zlib
    commit: 51b7f2abdade71cd9bb0e7a373ef2610ec6f9daf
    tag: v1.3.1
    shape: >-
      C library (zlib shared + zlibstatic from one source list), install(TARGETS) with no EXPORT to absolute
      INSTALL_*_DIR cache paths, a hand-written zlib.pc consumers use, CMake's own FindZLIB as the consumer
      interface (ZLIB::ZLIB), configure_file zconf.h plus a configure-time file(RENAME) inside the source tree,
      floor 2.4.4...3.15.0, no project VERSION, CI on the runner image's CMake
    clone: shallow (git clone --depth 1 --branch v1.3.1), local step commits tagged w6-s0 .. w6-final
measured_on: >-
  cmake 3.31.12, 4.0.7, 4.1.6, 4.2.7, 4.3.4, 4.4.2 (printed once per tag; the step checks ran on 3.31.12 and 4.4.2,
  the CMP0219 check also on 4.3.4) via ocx package exec kitware/cmake:<tag>; ninja 1.13.2; gcc 15.2.1 (C only);
  gersemi 0.29.1 via uvx; pkg-config (pkgconf) from the host
scratch: >-
  /home/mherwig/.cache/cmake-measure-scratch/w6/modernize/ — run.sh reproduces every number below and writes
  run.log (the lines after "== done" come from o12-extra.sh, run separately and now called by run.sh). Build trees are under b/ (the session's permission policy refused rm -rf, so they stay). Variant trees
  are git worktrees of the two clones (openjpeg-s1raw, openjpeg-s1, openjpeg-s2one, openjpeg-v5lit,
  openjpeg-v5ren, zlib-vsrc, zlib-vpub, cfg-*). Each clone carries its plan file, cmake-modernize-plan.md.
---

# Wave 6 — cmake-modernize on openjpeg and zlib

I ran the skill in step order, the way an agent that had loaded it would. Each
command came from the skill text. The deviations:

- The round trip is `roundtrip.sh`, verbatim from `proofs.md` (C consumer),
  run through `rt.sh` in a fresh directory per label.
- The smoke is `smoke.sh`: all three passes verbatim, plus the configure exit
  of every pass and one extra probe in pass 3 (a parent library and executable
  added after the `add_subdirectory`: its `TYPE` and its output directory).
- Host constraint (not a finding): the host has no zlib, libpng, libtiff or
  lcms2 development files, so openjpeg's codec builds without image formats
  under the default options, and `-DBUILD_THIRDPARTY=ON` builds the vendored
  copies. openjpeg's test tree compiles `converttif.c` unconditionally, so it
  builds only with `-DBUILD_THIRDPARTY=ON`. That configures gated only on
  4.4.2 after step 1 (the vendored 3.5 floors, O2).

"Both lines" means 3.31.12 with `-Werror=dev` and 4.4.2 with `-Werror=author`.
Script names are files in the scratch directory, and `$W` stands for it.

**Result.** The wave does not converge. It adds 17 candidate failure modes and
6 candidate MUST rows, all measured on the real trees on both lines. Seven of
the defects pass every exit check the skill defines (O3, O7, O9, O12, O19, Z10,
Z11). The wave also confirms four wave-4/5 additions on new trees: the `SYM_CALL`
consumer (O17: `undefined reference to lrintf`), the unprefixed-option pass
(O11, O14), the `asub_bsl` grep (O11) and the DEP-15 set-and-restore (O2).

| Tree | worked | misled | stalled | wrong | Steps |
|---|---|---|---|---|---|
| openjpeg | 9 | 10 | 4 | 1 | 24 |
| zlib | 8 | 4 | 2 | 2 | 16 |

Step 9 (CPS, optional) was not asked for and not run.

## openjpeg

Plan options: none (the defaults, `BUILD_CODEC=ON`). Extra option set:
`-DBUILD_THIRDPARTY=ON`. `<max>` 4.4 and lines 3.31 and 4.4 (the CI takes
CMake from the runner image, a `CMK-VER-03` finding).

| # | Step | What the skill said | What I did | Exit check (command, version, exit, excerpt) | Verdict |
|---|---|---|---|---|---|
| O0 | Entry check | Configure and build ungated on the oldest line | Defaults, then `-DBUILD_THIRDPARTY=ON` | `o00-entry.sh openjpeg`, both lines: ungated configure 0, build 0. Gated: exit 1, `Deprecation Error at thirdparty/libz/CMakeLists.txt:3` and `thirdparty/libtiff/CMakeLists.txt:1`, and on 4.4.2 also `CMake Error (policy) at CMakeLists.txt:326 ... Policy CMP0219 is not set` | worked |
| O1 | Step 0, `I1` to `I12`, `F1`, `F1b` | "Write every hit into the plan file" | `inventory.sh $W/openjpeg thirdparty` > `o01-inventory.out` | I1 exit 0 (36 matching lines), I2 exit 0 (29), I3 exit 0 (3, one a comment at `CMakeLists.txt:166`), I9 exit 0 (`thirdparty/libtiff:1`, `thirdparty/libz:3`, both `VERSION 3.5`), I11 exit 0 (vendored astyle), I12 exit 0, F1 exit 0 (the two vendored floors and `tests/nonregression/CMakeLists.txt:3 VERSION 3.10`), F1b exit 1. No command lists `set(EXECUTABLE_OUTPUT_PATH ... CACHE PATH)` (`CMakeLists.txt:148`), see O11 | worked |
| O2 | Step 1, `F1` and the edit | "Keep the existing minimum. Add `...<max>`", `F1` "Empty output = pass" | Literal: `...4.4` on the one own-code F1 hit, and CMK-DEP-15's set and restore around `add_subdirectory(thirdparty)` (tag `w6-s1-literal`) | `step1.sh`, both lines: canary exit 1. 4.4.2: DEP-15 wrap clears both vendored errors (`-DBUILD_THIRDPARTY=ON` now fails only on CMP0219). 3.31.12 with `-DBUILD_THIRDPARTY=ON`: exit 1, `Deprecation Error at thirdparty/libz`; the text sends it to the owner (CMK-DEP-30 has no remedy for an in-repo vendored tree). The top-level `cmake_minimum_required(VERSION 3.10...3.31.5)` is never printed, because F1 matches only a bare floor or a two-dot range. Gated 4.4.2 configure still exit 1, `Policy CMP0219 is not set` at `CMakeLists.txt:331` | misled |
| O3 | Step 1, raised max | "`<max>` is the newest CMake CI runs" | Raised `3.31.5` to `4.4` (`w6-s1`) | Every step 1 check passes on both lines: canary 1, gated configure 0, probe `CMP0083=NEW`, `CMP0219=NEW` (4.4.2). The generated `libopenjp2.pc` on 4.4.2 reads `libdir=\/lib64` and `includedir=\/include/openjpeg-2.5`, and `pkg-config --cflags --libs libopenjp2` exits 0 with `-I/include/openjpeg-2.5 -L/lib64 -lopenjp2`. 3.31.12 and 4.3.4 write `libdir=${prefix}/lib64` (`o04-cmp0219.sh`). CMP0219 (new in 4.4) stops re-escaping `macro()` arguments, and `set_variable_from_rel_or_absolute_path` is a macro called with `"\\\${prefix}"`. The round trip later excludes `*.pc` and never consumes one | wrong |
| O4 | Step 1, where the repair goes | "The floor diff touches only `cmake_minimum_required` lines, plus any vendored floor fix" | Turned the macro into a `function()` with `PARENT_SCOPE` and passed `"\${prefix}"` (`w6-s1b`), as its own diff | Both lines: gated configure 0, `libdir=${prefix}/lib64` on 3.31.12, 4.3.4 and 4.4.2. The proposed configured-file check (`o11-cfgdiff.sh`, 4.4.2, ungated, `w6-s0` against each commit): `libopenjp2.pc` diff exit 1 for `w6-s1` (5 lines), exit 0 for `w6-s1b`; the three configured headers exit 0. No step owns a policy adaptation, and step 1's unit rule forbids it | stalled |
| O5 | Step 2, the definition readers | `grep -rn -e "$NAME" include`, "the operand = the directory the library installs headers from". "Any line = PUBLIC" | openjpeg installs `openjpeg.h` from `src/lib/openjp2`, which also holds every source and the CMakeLists | `MUTEX_pthread`: `thread.c:285` and `CMakeLists.txt:185`. `OPJ_DISABLE_TPSOT_FIX`: `j2k.c:10713` and three CMakeLists lines. `USE_JPIP`: `jp2.c` and the private `opj_includes.h:251`. All three read PUBLIC literally. The installed headers (`openjpeg.h`, the generated `opj_config.h`) read none of them, so all three are PRIVATE | misled |
| O6 | Step 2, `openjp2` and `openjp2_static` | Move directory scope onto `target_*`, include directories `$<BUILD_INTERFACE:...>` | Definitions PRIVATE on both library targets, the binary and source include directories PUBLIC `BUILD_INTERFACE` (`w6-s2lib`) | I2 scoped to `src/lib/openjp2` exit 1. Gated configure 0 and build 0, both lines. Flag diff for `j2k.c`: `> -I$W/openjpeg/src/lib/openjp2`, an added flag the plan names | worked |
| O7 | Step 2, the flag-set check on a shared source | "Record the flag set of one source per target" with the given `jq` | Variant `openjpeg-s2one`: the definitions moved onto `openjp2` only, `openjp2_static` forgotten | `o03-union.sh`, both lines: the skill's `jq` (every compile entry for `thread.c`, union of both targets) diff exit 0, a pass. The same `jq` filtered on `.output` containing `/openjp2_static.dir/` prints `< -DMUTEX_pthread`, exit 1. Without it `thread.c` compiles its `#else` stub (lines 428-433 per source, not executed): the static library silently loses threading. I2 is empty and the build is green | misled |
| O8 | Step 2, the executables | Same | `target_include_directories`/`target_compile_definitions` PRIVATE per executable, the library's own directories through its PUBLIC requirements (`w6-s2bin`) | Flag diffs for `opj_compress.c` and `opj_dump.c` exit 0, both lines. Build 0. With `-DBUILD_THIRDPARTY=ON`: 4.4.2 configure 0 and build 0, 3.31.12 configure 1 (the vendored floor, O2) | worked |
| O9 | Step 3, keywords | "Default to `PRIVATE` unless the type is in its installed headers". Exit: "`I1` on that file shows only keyworded calls" | `PRIVATE` on every call, `OpenJPEG::` aliases (`w6-s3`) | I1 shows only keyworded calls. Default build 0 on both lines. The test tree (4.4.2, `-DBUILD_TESTING=ON -DBUILD_THIRDPARTY=ON`, gated): build exit 1, `bin/compare_images ... /usr/lib64/libm.so.6: error adding symbols: DSO missing from command line`. The step-1 tree builds with exit 0. `compare_images` used `m` through `openjp2`'s plain-signature link. Adding `m` to it (`w6-s3b`) gives exit 0. Nothing in step 3 builds a dependent the plan options switch off | misled |
| O10 | Step 4 | "every `I12` hit sits in a developer option that defaults `OFF`", and `I12`: "Report `-Werror=<category>` separately" | Nothing to convert: no `-std`, no own-code flag write | I3 own-code hit is a comment (vacuous). I12: `CMakeLists.txt:169` puts `-Werror=declaration-after-statement`, `-Werror=strict-prototypes` and `-Werror=missing-prototypes` on `openjp2` unconditionally under GCC. The exit check cannot pass and the text gives this hit no disposition. Recorded `flagged-not-converted` for the owner | stalled |
| O11 | Step 5, the smoke as negative control | "The step 7 smoke, run here too" | `smoke.sh` on `w6-s3b` with 5 developer-only names and the 11 unprefixed names | Both lines, pass 1 configure 0: `asub_bsl=[ON]`, `Total Tests: 1335`, `compare_images: phony`. Pass 2: `BUILD_VIEWER` exit 1 (`No CMAKE_CXX_COMPILER could be found`), `BUILD_JAVA` exit 1 (`Could NOT find JNI`), `BUILD_THIRDPARTY` exit 1 on 3.31.12. Extra probe: `probe parent_lib=SHARED_LIBRARY`, and the parent's `parent_exe` is built at `./lib-build/bin/parent_exe`: `set(EXECUTABLE_OUTPUT_PATH ... CACHE PATH)` redirects every target the parent adds later. No skill check looks at the output path | worked |
| O12 | Step 5, the test gate default | "a project-prefixed option that defaults to `PROJECT_IS_TOP_LEVEL`" | Variant `openjpeg-v5lit`: `OPENJPEG_BUILD_TESTING` defaulting to `${PROJECT_IS_TOP_LEVEL}`. Upstream defaulted `OFF` | `o07-step5-variants.sh`, both lines: the smoke passes, and the top-level default build exits 1 with `converttif.c:49:3: error: #error OPJ_HAVE_LIBTIFF_NOT_DEFINED` (`Total Tests: 1335`). With the legacy `OFF` default: configure 0, build 0, `Total Tests: 0`. Step 5's exit check never builds the top level | misled |
| O13 | Step 5, renaming an unprefixed option | "An unprefixed name such as `BUILD_DEMOS` reads the parent's own entry" | Variant `openjpeg-v5ren`: plain `option(OPENJPEG_BUILD_TESTING ... OFF)` | Both lines: `cmake -DBUILD_TESTING=ON` (INSTALL.md's documented spelling) configures with exit 0 and `Total Tests: 0`; the only trace is `Manually-specified variables were not used by the project`. `tools/ctest_scripts/travis-ci.cmake:119` seeds `BUILD_TESTING`, `BUILD_THIRDPARTY` and `BUILD_UNIT_TESTS` into the cache, so CI would run 0 tests green. With a top-level fallback to the old spelling (`opj_option()` in `w6-s5`): `Total Tests: 1335` | misled |
| O14 | Step 5, pass 2 after the edit | Pass 2 per unprefixed name | `w6-s5`: 11 names prefixed with a top-level fallback, a `BUILD_SHARED_LIBS` shim, the output paths under `PROJECT_IS_TOP_LEVEL` | Both lines: pass 1 clean, `asub_bsl` empty, `parent_lib=STATIC_LIBRARY`, `parent_exe` at `./parent_exe`. Pass 2 caught my own ordering error: `t1_generate_luts: phony` and `bench_dwt: phony` leak because the options were declared after the `add_subdirectory(src/lib)` that reads them. Moved (`w6-s5b`): all 11 passes exit 0, all greps empty | worked |
| O15 | Step 5, the pass-2 option list | `grep ... -e '^[[:space:]]*option[[:space:]]*\('` | Ran it on the step-3 tree | `WITH_ASTYLE` is declared `SET (WITH_ASTYLE FALSE CACHE BOOL ...)` at `CMakeLists.txt:366` and is not listed. Pass 2 with a parent owning `WITH_ASTYLE=ON`: configure exit 1 on both lines, `thirdparty/CMakeLists.txt:163 (enable_language): No CMAKE_CXX_COMPILER could be found` | misled |
| O16 | Step 5, a vendored file reads the renamed options | "Vendored and third-party subtrees are ... never entered" | `thirdparty/CMakeLists.txt` reads `BUILD_THIRDPARTY` and `WITH_ASTYLE`. I re-set each old name as a directory-scoped normal variable from the new option, before the `add_subdirectory` | Works on both lines (O14). No text anticipates it: a literal agent either edits the vendored glue or leaves the option unprefixed | stalled |
| O17 | Step 6, the round trip before the edit | The script, `SYM_CALL` one exported function | `PKG=OpenJPEG VER=2.5`, `SYM_DECL='#include <openjpeg.h>'` | Both lines: `openjp2` with `opj_version()` exit 0 (`OpenJPEG_DIR:PATH=.../moved/lib64/cmake/openjpeg-2.5`). `openjp2_static` with `opj_create_compress(OPJ_CODEC_J2K)` exit 1, `t1.c:(.text+0x15): undefined reference to lrintf`: the static target never linked `m`. Fixed as its own step-3 diff (`w6-s3c`) | worked |
| O18 | Step 6, `NAMESPACE` on an existing export | "Ship the old names in the Config package as an `ALIAS`" | `NAMESPACE OpenJPEG::`, aliases for the four library and eight executable names (`w6-s6`) | Both lines, round trip exit 0 for `OpenJPEG::openjp2`, `openjp2`, `OpenJPEG::openjp2_static`, `openjp2_static`. INSTALL.md's consumer (`include_directories(${OPENJPEG_INCLUDE_DIRS})`, `target_link_libraries(myapp ${OPENJPEG_LIBRARIES})`) configure 0 and build 0 | worked |
| O19 | Step 6, the alias form | The same sentence, no guard | Copy of the installed prefix with the `NOT TARGET` guard removed | `o08-alias-guard.sh`, both lines: a consumer calling `find_package(OpenJPEG 2.5 CONFIG REQUIRED)` twice in one directory: guarded exit 0, unguarded exit 1 with `add_library cannot create ALIAS target "openjp2" because another target with the same name already exists`. The round trip calls `find_package` once | misled |
| O20 | Step 7 | Three passes | Final tree `w6-final` | Both lines: pass 1 configure 0, `Total Tests: 0`, 5 target greps exit 1; pass 2 all 11 names configure 0 with no leak; pass 3 (`OpenJPEG::openjp2_static`, `opj_create_compress`) configure 0, build 0 | worked |
| O21 | Step 8, the gate in CI | "Wire the gate per leg" and `grep -rn -e 'Werror=author' -e 'Werror=dev' .github/workflows` | The workflows run `tools/travis-ci/run.sh`, which configures through `ctest -S tools/ctest_scripts/travis-ci.cmake`. I appended `-Werror=dev` to `CTEST_CONFIGURE_OPTIONS` (`w6-s8b`) | The CORE-01 grep exits 1 ("no gate, finding") before and after the edit. The same grep with `tools/ctest_scripts` as a second operand exits 0 | misled |
| O22 | Step 8, `gersemi --check` | The gate line `git ls-files -z -- '*CMakeLists.txt' '*.cmake' \| xargs -0 -r gersemi --check`, and "A first `gersemi` reformat ships as its own diff" | Ran it on `w6-s6` | Exit 123, 39 files to reformat, 8 of them under `thirdparty/`. With `':!:thirdparty/**'`: 31 files, reformat `w6-s8`, then `--check` exit 0, gated build 0 on both lines | misled |
| O23 | Plan-file statuses | `open`, `converted`, `flagged-not-converted` (vendored, or the owner declined), `vacuous` | Rows in `src/lib/openjpip`, `src/bin/jpip`, `wrapping/java`, `src/bin/wx`, and `CMakeLists.txt:84` (WIN32 only) | The host cannot configure `BUILD_JPIP` (FCGI, curl), `BUILD_JAVA` (JDK) or `BUILD_VIEWER` (wxWidgets, C++), and the WIN32 branch is dead. A conversion there has no exit check to run. No status fits, so the stop condition is not reachable. The plan file leaves them `open` | stalled |

Stop condition: the round trip and the smoke pass on both lines. It is not
reached as written, because the O23 rows and `tests/CMakeLists.txt:2` are
`open`.

## zlib

Plan options: none. `<max>` 4.4, lines 3.31 and 4.4 (runner-image CMake,
`CMK-VER-03`). The kept minimum 2.4.4 is a `CMK-VER-05` question for the owner.

| # | Step | What the skill said | What I did | Exit check (command, version, exit, excerpt) | Verdict |
|---|---|---|---|---|---|
| Z0 | Entry check | Ungated on the oldest line | `o00-entry.sh zlib ""` | Both lines: ungated configure 0, build 0. Gated 3.31.12 exit 0. Gated 4.4.2 exit 1, six `CMake Error (install-absolute-destination) at CMakeLists.txt:182` (and `:188`, `:191`, `:194`) | worked |
| Z1 | Entry check, the checkout afterwards | Nothing | `git status --short` after the first configure | ` D zconf.h`: `CMakeLists.txt:76` does `file(RENAME ${CMAKE_CURRENT_SOURCE_DIR}/zconf.h ...zconf.h.included)` on every out-of-source configure (`z03-variants.sh`, 3.31.12). Every step diff, smoke and round trip dirties the tracked tree again, and a commit of the step carries a deletion no plan row names. I restored it (`git checkout -f`) after every run | misled |
| Z2 | Step 0 | `I1` to `I12`, `F1`, `F1b` | `inventory.sh $W/zlib ""` (I9 vacuous: no vendored or fetched CMake tree) | I1 exit 0 (4 bare links), I2 exit 0 (`:44`, `:53`, `:63`, `:64`, `:65`, `:85`, the last `include_directories(${CMAKE_CURRENT_BINARY_DIR} ${CMAKE_SOURCE_DIR})`), all others exit 1, F1 and F1b exit 1. The raw `target_include_directories(zlib PUBLIC ${CMAKE_CURRENT_BINARY_DIR} ...)` at `:153` is not listed, and step 6's exception covers it | worked |
| Z3 | Step 1, `F1` | "Empty output = pass" | `cmake_minimum_required(VERSION 2.4.4...3.15.0)` is a three-dot range with a stale max, so F1 and F1b are empty. I raised it to `...4.4` (`w6-s1`) | `step1.sh zlib`: canary 1 on both lines, probe `CMP0083=NEW`, `CMP0219=NEW` (4.4.2). Configured-file diff (`o11-cfgdiff.sh`, 4.4.2): `zlib.pc` and `zconf.h` exit 0 | misled |
| Z4 | Step 1, the exit check on 4.4 | "the project's gated configure exits 0 on each CI binary" | Nothing in step 1's scope can fix it | Gated 4.4.2 exit 1, `install-absolute-destination` at `:182` (4.4 promotes it; CMK-INST-10 is step 6's). The same blocks the step-2 build check, the flag-set check (4.4.2 recorded ungated) and the step-5 smoke on 4.4.2: the parent's gated configure exits 1 on zlib's absolute destinations (`smoke.sh` on `w6-s3`, pass 1 and pass 3 configure exit 1). All of them pass on 4.4.2 from `w6-s6` | stalled |
| Z5 | Step 2, the definition readers | "Any line = `PUBLIC`" | `grep -rn -e _LARGEFILE64_SOURCE zlib.h zconf.h.cmakein` | Nine lines (`zlib.h:1852`, `zconf.h.cmakein:464-500`), so literally `PUBLIC`. The header reads it to ask whether the consumer wants the 64-bit API. Upstream never gave it to consumers. With `PUBLIC` (variant `zlib-vpub`) the round trip still exits 0 on both lines, and every installed consumer compiles with `DEFINES = -D_LARGEFILE64_SOURCE=1`; the `PRIVATE` tree's consumer has no `DEFINES` line. I kept it `PRIVATE` | misled |
| Z6 | Steps 2 and 3 | One target per diff, flag set per source | Definitions `PRIVATE` on the two libraries and four examples, include directories `BUILD_INTERFACE`, `PRIVATE` links, `ZLIB::` aliases (`w6-s2`, `w6-s3`) | Flag diffs for `adler32.c`, `test/example.c` and `test/minigzip.c` exit 0 (3.31.12 gated, 4.4.2 ungated). I2 exit 1. 3.31.12 gated configure 0 and build 0; 4.4.2 see Z4 | worked |
| Z7 | Step 4 | `I3`, `I11`, `I12` | No hits | All exit 1: vacuous | worked |
| Z8 | Step 5 | Test and example gate on `PROJECT_IS_TOP_LEVEL`, `include(CTest)` inside | `ZLIB_BUILD_EXAMPLES` defaults to `${PROJECT_IS_TOP_LEVEL}` (upstream `ON`, so the top level keeps it), `enable_testing()` moved into the gate as `include(CTest)`, shim for the 2.4.4 minimum (`w6-s5`) | Negative control on `w6-s3`, 3.31.12: `Total Tests: 2`, `example: phony`, `minigzip: phony`. After: `Total Tests: 0`, both greps exit 1, pass 3 build 0. Pass 2 not applicable (the one option is prefixed). Top level: `Total Tests: 2` still, plus 56 CDash dashboard lines in `--target help` that `enable_testing()` never made | worked |
| Z9 | Step 6, the version | "A `project()` without `VERSION` ... The version is the owner's. Ask" | The tree states `set(VERSION "1.3.1")` at `:6`, and `zlib.h` defines `ZLIB_VERSION` | `write_basic_package_version_file(... VERSION ${VERSION} ...)` configures on both lines, and the round trip accepts `find_package(ZLIB 1.3 ...)`. The text stops a literal agent to ask the owner for a version the tree already states | stalled |
| Z10 | Step 6, literal | `GNUInstallDirs`, `configure_package_config_file`, version file, `NAMESPACE`, in one diff; exit = the round trip | Replaced the `INSTALL_*_DIR` cache paths with `CMAKE_INSTALL_*`, added `EXPORT`, `NAMESPACE ZLIB::`, `ZLIBConfig.cmake.in` (`w6-s6lit`) | Round trip exit 0 on both lines for `ZLIB::zlib` (`ZLIB_DIR:PATH=.../moved/lib64/cmake/ZLIB`) and `ZLIB::zlibstatic` (`compressBound`). The installed `zlib.pc` reads `libdir=`, `sharedlibdir=` and `includedir=`, because `zlib.pc.cmakein` reads `@INSTALL_LIB_DIR@` and `@INSTALL_INC_DIR@`. `pkg-config --cflags --libs zlib` exits 0 with `-I -L -lz`. The round trip excludes `*.pc` from its leak grep and never consumes a `.pc` | wrong |
| Z11 | Step 6, who consumes the package | The round trip's `find_package($PKG $VER CONFIG REQUIRED)`, and old names only for "previously exported" names | `z-consumers.sh` on the moved prefix, what zlib consumers write today | Both lines: `find_package(ZLIB 1.3 REQUIRED)` + `ZLIB::ZLIB` configures 0, builds 0 and has no `ZLIB_DIR`, only `ZLIB_LIBRARY_RELEASE=.../moved/lib64/libz.so`: CMake's FindZLIB answered and the Config package was never read. With `-DCMAKE_FIND_PACKAGE_PREFER_CONFIG=ON` the Config answers: `ZLIB::ZLIB` configure exit 1 (`target_link_libraries` at `CMakeLists.txt:5`), and `${ZLIB_INCLUDE_DIRS}`/`${ZLIB_LIBRARIES}` build exit 1 (`zlib.h: No such file or directory`) | wrong |
| Z12 | Step 6, repaired | Same | `zlib.pc.cmakein` on `CMAKE_INSTALL_*`, and the Config adds `ZLIB::ZLIB` (an `INTERFACE IMPORTED` target over `ZLIB::zlib`) and FindZLIB's result variables (`w6-s6`) | Both lines: round trip exit 0 for `ZLIB::zlib`, `ZLIB::zlibstatic` and `ZLIB::ZLIB`. All three consumer spellings configure 0 and build 0. `pkg-config` prints `-I/usr/local/include -L/usr/local/lib64 -lz` | worked |
| Z13 | Step 6, the old install knobs | Nothing | `-DINSTALL_LIB_DIR=lib/custom` on `w6-s6` | Both lines: configure 0, `Manually-specified variables were not used by the project`, and the library installs to `lib64/`. Upstream installs to the path the knob names (`install(TARGETS ... LIBRARY DESTINATION "${INSTALL_LIB_DIR}")`, `CMakeLists.txt:182`). A packager's existing `-D` is dropped silently | misled |
| Z14 | Step 7 | Three passes | `w6-final` | Both lines: pass 1 configure 0, `Total Tests: 0`, both greps exit 1; pass 3 (`ZLIB::zlibstatic`) configure 0, build 0 | worked |
| Z15 | Step 8 | Gate per leg, `gersemi --check` | `-Werror=dev` in `cmake.yml:69` (`w6-s8b`), first reformat as its own diff (`w6-s8`) | CORE-01 grep exit 1, then 0. gersemi exit 123 (1 file), then 0. CORE-05 grep exit 2 (no `scripts`, as in wave 5). Gated build 0 on both lines | worked |

Stop condition reached on both lines: the round trip exits 0 for all three
spellings, the smoke passes, and every plan row is `converted`.

## Fixes

Line numbers are as of this wave. Each fix is exact text, and most replace
text. SKILL.md grows by about 12 lines. To pay for that, move "Legacy parses"
(`SKILL.md:264-291`, 28 lines) into `references/inventory.md` beside `I4`, and
keep a two-line pointer in its place.

1. **`SKILL.md:98`, step 1 row** (O2, Z3 misled; O3 wrong). Replace the "Do"
   cell with:

   > Keep the existing minimum. Add `...<max>`, or raise an existing `...<max>` below it, where `<max>` is the newest CMake CI runs. Re-scan fetched and vendored trees

   And replace the exit-check cell with:

   > `F1` prints no line outside a vendored directory (a vendored hit is recorded `flagged-not-converted`), every `F1b` line is settled as step 1 below says, the canary exits 1, the project's gated configure exits 0 on each CI binary, and the configured-file check prints nothing on the newest line

2. **`SKILL.md:125-128`, `F1b`** (O2, Z3). Replace the comment line with
   `# F1b: floors through a variable, own-code policy pins, and every existing range (its max must be the plan's <max>). A list to read, never a pass.`
   and add a third pattern before the operand:
   `-e 'cmake_minimum_required[[:space:]]*\([[:space:]]*VERSION[[:space:]]+[0-9.]+\.\.\.[0-9]' \`

3. **`SKILL.md:110-112`** (O3 wrong, O4 stalled). Replace the first sentence
   with:

   > The floor diff touches only `cmake_minimum_required` lines, plus any vendored floor fix the re-scan exposes. A file `configure_file()` writes that changes under the new range is repaired in a second diff before step 2, never by lowering `<max>`: on 4.4.2, CMP0219 stops re-escaping `macro()` arguments, and uclouvain/openjpeg's pkg-config macro wrote `libdir=\/lib64` while every other step 1 check passed.

   Add to `references/inventory.md`, after "The flag-set check":

   ````markdown
   ## The configured-file check

   The third half of step 1's exit check. Configure the step-0 commit and the
   floor diff on the newest CI line, ungated, and compare every file
   `configure_file()` writes (`grep -rn -e 'configure_file' .` lists them).

   ```sh
   # CONFIGURED = the configured outputs, relative to the build dir. Empty diff output = pass.
   CONFIGURED='libopenjp2.pc src/lib/openjp2/opj_config.h'
   for f in $CONFIGURED; do diff "build-step0/$f" "build-step1/$f"; done
   ```

   Measured on 4.4.2: openjpeg's `libopenjp2.pc` differs in five lines after
   `...3.31.5` became `...4.4`, and nothing differs after the macro became a
   `function()`. zlib's `zlib.pc` and `zconf.h` do not differ.
   ````

4. **`SKILL.md:184-190`, the reader grep** (O5, Z5 misled). Replace the fence
   and the sentence after it with:

   ````markdown
   ```sh
   # NAME = the definition. The operands = the header files the library installs
   # (its install(FILES) or PUBLIC_HEADER list, generated ones from the build tree),
   # never a directory that also holds sources.
   NAME=JSONCPP_USE_SECURE_MEMORY
   grep -n -e "$NAME" include/json/value.h include/json/config.h
   ```

   Empty output = `PRIVATE`. A line where the header only asks whether the
   consumer wants an API (zlib's `zlib.h` and `_LARGEFILE64_SOURCE`) is not a
   reader either: `PUBLIC` there puts `-D_LARGEFILE64_SOURCE=1` on every
   installed consumer. Any other line = `PUBLIC`, or a configured header that
   bakes the value in.
   ````

5. **`references/inventory.md:189-195`, the flag-set `jq`** (O7 misled).
   Replace the fence body with:

   ```sh
   # SRCFILE = one source of the converted target, TGT = that target. Writes flags-before.txt at the
   # step-1 commit (rename the output), flags-after.txt after the diff.
   SRCFILE=src/core.c
   TGT=core
   cmake -S . -B build-flags --fresh "$GATE" -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
   jq -r --arg f "$SRCFILE" --arg t "$TGT" '[.[] | select(.file | endswith($f)) | select(.output | contains("/" + $t + ".dir/")) | .command | split(" ")[] | select(startswith("-"))] | sort | unique | .[]' \
     build-flags/compile_commands.json > flags-after.txt
   diff flags-before.txt flags-after.txt
   ```

   and add after "Empty `diff` output = pass.":
   "Run it once per target when two targets compile the same source (a shared
   and a static library from one list): without `TGT` the union hides a flag
   one of them lost (openjpeg's `openjp2_static` lost `-DMUTEX_pthread`, both
   lines)."

6. **`SKILL.md:100`, step 3 exit cell** (O9 misled). Replace with:

   > `I1` on that file shows only keyworded calls, and the gated build with every option that adds an in-tree dependent of the target (tests included) exits 0

7. **`SKILL.md:102`, step 5 row** (O12, O13 misled). Replace
   "Gate the test tree on a project-prefixed option that defaults to `PROJECT_IS_TOP_LEVEL`"
   with
   "Gate the test tree on a project-prefixed option that defaults to `PROJECT_IS_TOP_LEVEL`, or `OFF` where the legacy option defaulted `OFF`".
   Replace the exit cell with:

   > The step 7 smoke, run here too, the top-level gated build with the plan options, and the `CMK-DEP-07` probe when `I7` listed a hit

   Add to "Step 5: the guard and its shim", replacing its last paragraph's
   first sentence ("Keep the value the legacy tree defaulted to."):

   > Keep the value the legacy tree defaulted to, for the build type and for every renamed option. A renamed option takes its old spelling as the default at top level only (`if(PROJECT_IS_TOP_LEVEL AND DEFINED BUILD_TESTING)`), and a file that still reads the old name, vendored glue included, gets it back as a directory-scoped normal variable before the `add_subdirectory` that reads it. A plain rename drops `-DBUILD_TESTING=ON` with only a "not used" warning, and openjpeg's CI, which seeds that cache entry, would run 0 tests green. A library's `set(... CACHE ...)` of a variable CMake reads (`EXECUTABLE_OUTPUT_PATH`, `LIBRARY_OUTPUT_PATH`, `CMAKE_<KIND>_OUTPUT_DIRECTORY`) goes under `PROJECT_IS_TOP_LEVEL` too, or every target the parent adds later lands in the library's `bin/`.

8. **`references/proofs.md:86-88`, the pass-2 option list** (O15 misled).
   Replace the fence body with:

   ```sh
   grep -rnE --include='CMakeLists.txt' --include='*.cmake' --exclude-dir='_deps' --exclude-dir='build*' \
     -e '^[[:space:]]*option[[:space:]]*\(' -e '^[[:space:]]*set[[:space:]]*\([[:space:]]*[A-Za-z_]+[[:space:]].*CACHE[[:space:]]+BOOL' "$SRC"
   ```

   and after "Run it once per listed name that lacks the project's prefix:"
   add "A `set(<name> ... CACHE BOOL ...)` toggle counts as an option
   (openjpeg's `WITH_ASTYLE` failed the parent's configure with
   `No CMAKE_CXX_COMPILER could be found`, both lines)."

9. **`SKILL.md:232-235`, the alias sentence** (O19 misled, Z11 wrong).
   Replace "Ship the old names in the Config package as an `ALIAS` of each
   namespaced imported target (a consumer on CMake 3.18 or later, the version
   that allows it)." with:

   > Ship the old names in the Config package as an `ALIAS` of each namespaced imported target, each under `if(NOT TARGET <old>)` (a consumer on CMake 3.18 or later). Without the guard, a second `find_package` in one directory fails with `add_library cannot create ALIAS target` (openjpeg, both lines). A package whose name CMake ships a Find module for (`ZLIB`, `PNG`, `CURL`) is consumed today through that module's imported target and variables: the Config package defines them too (`ZLIB::ZLIB`, `ZLIB_INCLUDE_DIRS`, `ZLIB_LIBRARIES`), and the round trip runs once on the module's target name. The round trip's `CONFIG` consumer passes without them, while a `CMAKE_FIND_PACKAGE_PREFER_CONFIG` consumer fails (madler/zlib at v1.3.1, both lines).

10. **`SKILL.md:242-245`, the version** (Z9 stalled). Replace with:

    > `write_basic_package_version_file` without `VERSION` reads `PROJECT_VERSION`, and a `project()` without one stops the configure with `No VERSION specified` (tinyformat, 3.31.12 and 4.4.2). A version the tree already states (zlib's `set(VERSION "1.3.1")`) is passed as `VERSION ${VERSION}`. Only a tree that states none goes to the owner. Record the answer in the plan file, and never derive a version from a git tag on your own.

11. **`references/proofs.md:192`, the round trip** (Z10 wrong, O3). After the
    last line of the script add:

    ```sh
    # (d) Every shipped .pc against the same file from a step-0 install (STEP0_PREFIX). Empty output = pass;
    # a changed line is named in the plan file. No .pc in the prefix = not applicable.
    find "$W/moved" -name '*.pc' -printf '%P\n' | xargs -r -I{} diff "$STEP0_PREFIX/{}" "$W/moved/{}"
    ```

    and to the export comment block add `# STEP0_PREFIX: an install prefix of the step-0 commit, when the tree ships a .pc`.
    Measured: zlib's step-6 `zlib.pc` loses `libdir`, `sharedlibdir` and
    `includedir` (`pkg-config` prints `-I -L -lz`, exit 0) while the
    round trip exits 0 on both lines.

12. **`references/proofs.md:220`, the CORE-01 grep** (O21 misled). Replace the
    command line with
    `grep -rn -e 'Werror=author' -e 'Werror=dev' .github/workflows "${CI_SCRIPTS:-.github}"`
    and add to its comment: `# CI_SCRIPTS = the directory holding a script the workflows configure through (openjpeg: tools/ctest_scripts).`

13. **`references/proofs.md:237`, the gersemi gate line** (O22 misled).
    Replace it with
    `git ls-files -z -- '*CMakeLists.txt' '*.cmake' ':!:third_party/**' | xargs -0 -r gersemi --check`,
    and add "with one `':!:<dir>/**'` per vendored directory the plan file
    records (openjpeg: 8 of 39 reformat candidates sat under `thirdparty/`)".

14. **`references/inventory.md:172-174`, `I12`** (O10 stalled). Replace
    "Report `-Werror=<category>` separately." with:
    "A `-Werror=<category>` hit is recorded `flagged-not-converted` with a
    `CMK-TGT-09` note for the owner, and does not hold step 4's exit
    (openjpeg: three categories on `openjp2`, unconditional under GCC)."

15. **`SKILL.md:86`, the Status column** (O23 stalled). Replace the cell with:

    > `open`, `converted`, `flagged-not-converted` (vendored, the owner declined, or a component the host cannot configure, with the missing prerequisite named) or `vacuous`

16. **`SKILL.md:47-50`, the entry check** (Z1 misled, Z4 stalled). Append:

    > Run `git status --short` after it. A tracked file the configure changed (zlib 1.3.1 renames `zconf.h` in the source tree) is restored before every diff and after every script. A 4.4-only gate error that step 6 owns (`install-absolute-destination`) goes into the plan file as a step-6 row: until step 6, the gated checks of steps 1 to 5 run on the 4.3-or-older line and the 4.4 line runs ungated.

17. **`references/inventory.md:62-69`, `I3`** (O1, cosmetic). Anchor each
    `set`/`string` pattern at `^[[:space:]]*` as `I2` does, so a commented
    `# set(CMAKE_C_FLAGS ...)` (openjpeg `CMakeLists.txt:166`) is not
    listed.

## Candidate new failure modes

Each one was measured on the real tree on both lines unless marked otherwise.
None of them is in the skill, the rules, or the wave 4 or wave 5 lists.

1. **A three-dot range whose max is older than the CI line.** (O2, Z3)
   - F1 and F1b are empty, so step 1 reads as done.
   - openjpeg `3.10...3.31.5` fails the 4.4.2 gate on CMP0219. zlib
     `2.4.4...3.15.0` leaves every policy after 3.15 unset.
   - Reproduce: `run.sh` sections O3 and Z4.
2. **Raising `<max>` flips a behaviour policy in own code.** (O3)
   - CMP0219 (4.4) stops re-escaping `macro()` arguments.
   - openjpeg's `.pc` loses `${prefix}` on 4.4.2 only. `pkg-config` exits 0
     with `-I/include/openjpeg-2.5`.
   - Every step 1 check passes, and the round trip never reads a `.pc`.
   - Reproduce: `o04-cmp0219.sh`, `o11-cfgdiff.sh`.
3. **The flag-set check merges targets that share a source.** (O7)
   - A definition dropped from `openjp2_static` stays invisible because
     `openjp2` compiles the same file.
   - Reproduce: `o03-union.sh`.
4. **The reader grep over a mixed directory, and consumer feature-test
   macros.** (O5, Z5)
   - Sources and CMakeLists in the header directory make every definition read
     `PUBLIC`.
   - `_LARGEFILE64_SOURCE`, which `zlib.h` reads only as an opt-in, then lands
     on every installed consumer.
   - Reproduce: `run.sh` O8 and `z03-variants.sh`.
5. **The `PRIVATE` default removes a transitive system library that an in-tree
   dependent relied on.** (O9)
   - `compare_images` failed with `DSO missing from command line`.
   - The plan options never build it, and step 3's exit is `I1` only.
   - Reproduce: `run.sh` O11 (the `tests+thirdparty` lines).
6. **A library's cache write of an output-path variable CMake reads.** (O11)
   - `set(EXECUTABLE_OUTPUT_PATH ... CACHE PATH)` moves every executable the
     parent adds later into `lib-build/bin/`.
   - This is the `BUILD_SHARED_LIBS` shape for a variable no smoke grep reads.
   - Reproduce: `smoke.sh` pass-3 probe on `w6-s3b`.
7. **The test gate's `PROJECT_IS_TOP_LEVEL` default switches on a test tree
   the legacy build defaulted `OFF`.** (O12)
   - The smoke passes, and the top-level default build fails
     (`#error OPJ_HAVE_LIBTIFF_NOT_DEFINED`).
   - Reproduce: `o07-step5-variants.sh`.
8. **Renaming an option or install knob drops the old `-D` spelling
   silently.** (O13, Z13)
   - `-DBUILD_TESTING=ON` gives 0 tests with exit 0, CI's seeded cache
     included.
   - `-DINSTALL_LIB_DIR` is ignored and the library installs to `lib64`.
   - Reproduce: `o07-step5-variants.sh` and `run.sh` Z9.
9. **A toggle declared with `set(... CACHE BOOL)` escapes the pass-2 list.**
   (O15)
   - The parent's `WITH_ASTYLE=ON` fails the configure.
10. **Vendored glue reads the options step 5 renames.** (O16)
    - `thirdparty/CMakeLists.txt` reads `BUILD_THIRDPARTY` and `WITH_ASTYLE`.
    - Neither editing it nor leaving the option unprefixed is allowed.
11. **An unguarded compatibility `ALIAS` in a Config package.** (O19)
    - A second `find_package` in one directory fails.
    - Reproduce: `o08-alias-guard.sh`.
12. **A package whose name CMake ships a Find module for.** (Z11)
    - The round trip's `CONFIG` consumer passes.
    - Plain `find_package(ZLIB)` never reads the Config.
    - `CMAKE_FIND_PACKAGE_PREFER_CONFIG` consumers lose `ZLIB::ZLIB` and
      FindZLIB's variables.
    - Reproduce: `z-consumers.sh z6lit-shared <tag>`.
13. **Step 6 renames the variables a hand-written `.pc` template reads.** (Z10)
    - `zlib.pc` is installed with empty `libdir` and `includedir`.
    - The round trip excludes `*.pc` and consumes none.
    - Reproduce: `run.sh` Z8.
14. **A 4.4 gate error that step 6 owns blocks the gated checks of steps 1 to
    5.** (Z4)
    - `install-absolute-destination` blocks the gated checks of steps 1 to 5
      on 4.4.2, and the smoke of any gated parent.
    - Reproduce: `run.sh` Z0, Z6.
15. **The configure mutates the tracked source tree.** (Z1)
    - `file(RENAME zconf.h ...)` dirties every step's diff.
    - Reproduce: `z03-variants.sh`.
16. **CI configures through a `ctest -S` script.** (O21)
    - The CORE-01 grep over `.github/workflows` reports "no gate" after the
      gate is wired.
17. **The formatter gate line includes vendored CMake files.** (O22)
    - 8 of openjpeg's 39 reformat candidates are vendored, and the skill
      forbids editing them.

Two further stalls (`-Werror=<category>` with no disposition, O10, and
optional components the host cannot configure, O23) are gaps in the text rather
than failure modes. Fixes 14 and 15 cover them.

## Candidate new MUST rows

Each one was measured on 3.31.12 and 4.4.2 (the CMP0219 row on 4.4.2, with
4.3.4 as the control). Each amends an existing MUST or adds a sibling. None is a
new family.

1. **CMK-VER-02 (amendment).** Raising `<max>` in an existing tree leaves every
   `configure_file()` output byte-identical on the newest line, or the diff
   names each changed file.
   - Verification: the configured-file check (fix 3).
   - Measured: openjpeg `libopenjp2.pc`, five lines differ under CMP0219 NEW
     (`pkg-config` then prints `-I/include/openjpeg-2.5`), none after the
     `function()` repair.
2. **CMK-INST-06 (amendment).** Each compatibility `ALIAS` in a Config package
   sits under `if(NOT TARGET <old>)`.
   - Verification: a consumer calling `find_package` twice in one directory.
   - Measured: exit 1 unguarded, exit 0 guarded.
3. **CMK-INST-07 sibling.** A Config package for a name CMake ships a Find
   module for also defines that module's imported targets and result
   variables.
   - Verification: the round trip on the module's target name, with
     `-DCMAKE_FIND_PACKAGE_PREFER_CONFIG=ON`.
   - Measured on zlib: configure exit 1 (`ZLIB::ZLIB`) and build exit 1
     (variables) without them, and exit 0 with them.
4. **CMK-INST-01 (amendment).** A package that ships a `.pc` proves it too.
   Every installed `.pc` is diffed against the step-0 install, or consumed with
   `pkg-config` from the moved prefix.
   - Measured on zlib: round trip exit 0 while `pkg-config` printed `-I -L -lz`.
5. **CMK-TGT-11 (amendment).** A library never creates a cache entry, outside
   `PROJECT_IS_TOP_LEVEL`, for a variable CMake itself reads:
   `BUILD_SHARED_LIBS`, `EXECUTABLE_OUTPUT_PATH`, `LIBRARY_OUTPUT_PATH`,
   `CMAKE_<KIND>_OUTPUT_DIRECTORY`.
   - Verification: the pass-3 probe (a parent executable added after the
     `add_subdirectory`, and where it is built).
   - Measured on openjpeg: `./lib-build/bin/parent_exe` before, `./parent_exe`
     after.
6. **CMK-TEST-09 (migration clause, parallel to CMK-LANG-04 and CMK-INST-06).**
   Renaming an existing option to its prefixed form keeps the old spelling as
   the top-level default, or ships a changelog entry naming the rename.
   - Verification: the old `-D` spelling at top level changes the result.
   - Measured on openjpeg: `Total Tests: 0` with a plain rename,
     `Total Tests: 1335` with the fallback.

## Wave 6 applied (2026-09-26)

Applier: opus. Files edited: `skills/cmake-modernize/SKILL.md` (493 lines),
`references/inventory.md` (279), `references/proofs.md` (300). The checker
(`check-artifacts.py` with the six `--forbid` operands) prints `clean`, exit 0.
All five `cmake` fences pass `gersemi==0.29.1 --check` (exit 0). New applier
scripts are in the scratch directory, prefixed `apply-`, with their output in
`apply-*.out`.

**Spot checks (all three reproduced).**

| Claim | Command | Result |
|---|---|---|
| O3: CMP0219 empties `${prefix}` in `libopenjp2.pc` on 4.4 only | `o04-cmp0219.sh` (3.31.12, 4.3.4, 4.4.2) | exit 0. 4.4.2 `openjpeg-s1raw`: `libdir=\/lib64`, pkg-config exit 0 with `-I/include/openjpeg-2.5 -L/lib64 -lopenjp2`. 3.31.12 and 4.3.4 and the `function()` repair on 4.4.2: `libdir=${prefix}/lib64` |
| O7: the flag-set union hides a lost flag | `o03-union.sh` (3.31.12, 4.4.2) | union diff exit 0 on both lines. Per-target diff prints `< -DMUTEX_pthread`, exit 1 |
| Z10/Z11: `.pc` loses its paths and FindZLIB answers first | `z-consumers.sh z6lit-shared <tag>` (3.31.12, 4.4.2) | pkg-config exit 0, `-I -L -lz`. Plain `find_package(ZLIB)` configure 0, build 0, `ZLIB_LIBRARY_RELEASE` only. With `CMAKE_FIND_PACKAGE_PREFER_CONFIG=ON`: `ZLIB::ZLIB` configure 1 at `CMakeLists.txt:5`, variables build 1, `zlib.h: No such file or directory` |

**New measurements by the applier.**

- `apply-z4.sh` (4.4.2, zlib `w6-s1`): `-Werror=author` exit 1 with 6 errors.
  `-Werror=author -Wno-error=install-absolute-destination` exit 0 with 6
  warnings. The canary with the demotion exits 1, so the gate stays live. This
  replaces fix 16's "the 4.4 line runs ungated".
- `apply-f1b.sh`: the F1b range pattern prints `CMakeLists.txt:10` (openjpeg
  `3.10...3.31.5`, plus `tools/ctest_scripts/travis-ci.cmake:7`) and zlib
  `CMakeLists.txt:1`, exit 0. The pass-2 lister from fix 8 as written lists no
  `WITH_ASTYLE` line (count 0), because the tree spells it `SET (`. With `-i`
  the count is 1. Shipped with `-i`.
- `apply-pc.sh` (3.31.12, 4.4.2): zlib `w6-s0` installed with `--prefix` fails
  with `Permission denied` on `/usr/local/lib` (absolute destinations), so fix
  11's step-0 prefix cannot be made that way. A `DESTDIR` install works, exit 0.
  pkg-config before: `-I/usr/local/include -L/usr/local/lib -lz`. After the
  literal step 6: `-I -L -lz` (diff exit 1). After the repaired step 6: only
  `lib` to `lib64` differs. Shipped as a pkg-config output comparison instead of
  fix 11's file diff, which would flag every legitimate `libdir` change.
- `apply-optfix.sh` (3.31.12, 4.4.2): the shipped renamed-option snippet reads
  `OFF` at top level, `ON` with `-DBUILD_TESTING=ON`, `OFF` under a parent
  with `include(CTest)`, every configure exit 0.
- `apply-ci.sh` (openjpeg `w6-final`): the CORE-01 grep with the optional
  `${CI_SCRIPTS:+"$CI_SCRIPTS"}` operand exits 1 unset and 0 with
  `tools/ctest_scripts`. Fix 12's `"${CI_SCRIPTS:-.github}"` default would
  print every workflow hit twice.

**Changed in the skill.**

- Step table: step 1 (raise an existing max, configured-file check in the exit),
  step 3 (exit adds the gated build with every option that adds an in-tree
  dependent), step 5 (`OFF` default where legacy was `OFF`, exit adds the
  top-level build and the old `-D` spellings), step 6 (pkg-config check).
  Plan-file status: host-cannot-configure components go `flagged-not-converted`
  with the missing prerequisite named (O23).
- Entry check: `git status --short` after configure (Z1), and the per-category
  4.4 demotion until step 6 (Z4, measured above).
- Step 1: F1b third pattern (O2, Z3), configured-file repair as its own diff (O4).
- Step 2: definition-reader operand and the consumer opt-in exception (O5, Z5).
- Step 5: legacy default kept for every option, the measured renamed-option
  snippet, directory-scoped old names for vendored glue (O16), `CACHE BOOL`
  toggles, output-path cache writes under `PROJECT_IS_TOP_LEVEL` (O11).
- Step 6: `NOT TARGET` guard on each alias (O19), Find-module names (Z11), `.pc`
  templates and install knobs (Z10, Z13), a version the tree states (Z9).
- inventory.md: the parse migration moved in from SKILL.md, per-target flag-set
  `jq` (O7), the configured-file check (O3), `-Werror=<category>` disposition (O10).
- proofs.md: the pkg-config check (Z10), the pass-2 lister with `-i` and the
  `CACHE BOOL` pattern (O15), `CI_SCRIPTS` (O21), vendored pathspecs on the
  gersemi gate line (O22). Step 8's carry list moved here from SKILL.md, and
  prose was tightened to hold the 300-line budget.
- Failure modes added to SKILL.md: 19 (stale range max), 20 (CMP0219 after
  raising max), 21 (flag-set union), 22 (reader grep over a mixed directory and
  opt-in macros), 23 (step 3 on `I1` alone), 24 (rename or re-default of an
  option or install knob), 25 (Find-module name), 26 (`.pc` template). Items 13,
  16 and 17 were extended with `CACHE BOOL` toggles, the cached output path and
  the unguarded alias.

**Not added as failure-mode items** (applied as text fixes, because the agent
stalls or runs a wrong operand that the corrected text removes): 10 vendored
glue, 14 the step-6 gate error on 4.4, 15 configure mutating the source tree,
16 `ctest -S` CI, 17 vendored gersemi files. The two text gaps O10 and O23 are
fixed as the ledger proposed.

**MUST candidates.** None is added as a new row, because the skill mints no IDs.
Four go back to the rule files as amendments or rows:

- 2 (INST-06 guard), 4 (INST-01 `.pc`) and 6 (TEST-09 rename) amend existing
  MUST rows.
- 3 is proposed as `CMK-INST-25` at SHOULD. The default consumer still
  resolves through FindZLIB and builds, and only a prefer-config consumer
  breaks.
- 1 (VER-02) stays SHOULD, with rationale and verification text only. The
  configured-file check in the skill enforces it.
- 5 (TGT-11 output paths) is a SHOULD clause. The measured effect is where the
  parent's executables land, not a failed build.

**Rejected.** Fix 17 (anchor `I3`): cosmetic, since `I3` is read hit by hit and
a comment is visibly vacuous. The "4.4 runs ungated" half of fix 16: the
measured per-category demotion keeps the gate live instead.

Convergence: not converged. The skill gained eight failure-mode items and three
extensions. No MUST row was added.

## Handbacks applied (2026-09-26)

Applier: opus (handback wave). Re-run script
`/home/mherwig/.cache/cmake-measure-scratch/w6/handbacks/run.sh`, output
`run.out` beside it, exit 0. Versions printed: cmake 3.31.12, 4.3.4, 4.4.2.
All six handbacks reproduced and were applied. `check-artifacts.py` with the six
`--forbid` operands: `clean`, exit 0.

| Row | Re-run (version) | Result | Applied |
|---|---|---|---|
| CMK-INST-06 guard | `o08-alias-guard.sh` (3.31.12, 4.4.2) | guarded configure 0, unguarded 1 with `add_library cannot create ALIAS target "openjp2"` | rule, rationale and verification as handed back. `skills/cmake-modernize/SKILL.md` row 16 synced |
| CMK-INST-01 `.pc` | `apply-pc.sh` (3.31.12, 4.4.2) | DESTDIR step-0 install exit 0, before `-I/usr/local/include -L/usr/local/lib -lz`, literal step 6 `-I -L -lz` (pkg-config exit 0), repaired step 6 differs only `lib` to `lib64` | verification cell as handed back (the "empty `-I`/`-L` or lost prefix" wording is right: a plain diff also flags the legitimate `lib64` change) |
| CMK-INST-25 (new, SHOULD) | `z-consumers.sh z6lit-shared` (3.31.12, 4.4.2) | module consumer configure 0 build 0, PREFER_CONFIG `ZLIB::ZLIB` configure 1, variables configure 0 build 1 (`zlib.h: No such file`) | row inserted after CMK-INST-07, next free ID |
| CMK-TEST-09 rename | configure-only loop from `o07-step5-variants.sh` (3.31.12, 4.4.2) | `-DBUILD_TESTING=ON`: `openjpeg` (fallback) 1335 tests, `openjpeg-v5ren` 0 tests with "not used by the project", exit 0 | rule, rationale and verification as handed back |
| CMK-TGT-11 output paths | new parent probe in `run.sh` on `openjpeg-s1raw` and `openjpeg` (3.31.12, 4.4.2) | `parent_exe` at `./lib-build/bin/parent_exe` with the cached `EXECUTABLE_OUTPUT_PATH`, at `./parent_exe` after the fix, every exit 0 | rule, rationale, severity cell as handed back. Added a probe sentence to the verification (parent's later executable built under the subproject's `bin/` = finding), because a one-line grep misses gersemi's multi-line `set(`, measured on `openjpeg` (exit 1 while the call is present) |
| CMK-VER-02 CMP0219 | `o04-cmp0219.sh` (3.31.12, 4.3.4, 4.4.2) | 4.4.2 `openjpeg-s1raw`: `libdir=\/lib64`, pkg-config `-I/include/openjpeg-2.5 -L/lib64`, gated configure 0. 3.31.12, 4.3.4 and the `function()` repair: `${prefix}` kept | rationale and verification as handed back |

Rejected: none. Severity changes: TGT-11's severity cell gains a SHOULD clause
for the other cached output variables, as handed back. The MUST halves are
unchanged.

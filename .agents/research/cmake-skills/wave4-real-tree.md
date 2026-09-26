---
title: "Wave 4 — both CMake skills run literally on real trees"
date: 2026-09-26
model: opus
trees:
  - skill: cmake-modernize
    repo: https://github.com/slembcke/Chipmunk2D
    commit: f2f3d66220b8bb1568b8402c6d194d73d4e477d1
    clone: shallow (git clone --depth 1), local step commits dc963fd..fd9e5ba on top
  - skill: cmake-dependency-triage
    repo: https://github.com/DaveGamble/cJSON
    commits:
      v1.7.15: d348621ca93571343a56862df7de4ff3bc9b5667
      v1.7.18: acc76239bee01d8e9c858ae2cab296704e52d916
    host copy: /usr/lib64/libcjson.so.1.7.18 (Fedora runtime package, no headers)
measured_on: >-
  cmake 3.31.12, 4.3.4, 4.4.2 (also printed: 4.0.7, 4.1.6, 4.2.7) via ocx package exec kitware/cmake:<tag>;
  ninja 1.13.2; gcc 15.2.1 (C default gnu23); zig c++ wrapper as CMAKE_CXX_COMPILER where Chipmunk2D's
  implicit CXX needed one; gersemi 0.29.1 via uvx
scratch: /home/mherwig/.cache/cmake-measure-scratch/w4/skills-real/ (run.sh reproduces every number; build trees kept, 384 MB, rm -rf refused by the session's permission policy)
---

# Wave 4 — both skills on real trees

Both skills were run in step order, the way an agent that had loaded them
would run them. Each command was copied from the skill text. The only changes
were `-DCMAKE_CXX_COMPILER=<zig wrapper>`, because this host has no g++, and
the few extra arguments noted in the row that needed them.

- Every script named below is under `modernize/` or `triage/` in the scratch
  directory.
- The `$T` and `SRC` placeholders in the excerpts are the scratch paths.
- "Both lines" means 3.31.12 with `-Werror=dev` and 4.4.2 with
  `-Werror=author`.

**Result.** This wave did not converge. The real trees produced 9 candidate
failure modes and 4 candidate MUST rows. Five of the MUST-worthy defects pass
every exit check the skills define:

| Skill | worked | misled | stalled | wrong | Steps |
|---|---|---|---|---|---|
| cmake-modernize | 4 | 2 | 6 | 3 | 15 (step 9 not run: optional, not asked) |
| cmake-dependency-triage | 8 | 2 | 3 | 1 | 14 (3 scenarios) |

## cmake-modernize on Chipmunk2D

Chipmunk2D is a C physics library with a legacy build:

- a floor of `VERSION 3.7`;
- `include_directories`, `link_directories` and bare `target_link_libraries`;
- four global `CMAKE_C_FLAGS*` appends, including `-std=gnu99`;
- a forced `CMAKE_BUILD_TYPE` inside the library;
- a hard-coded `SHARED` target plus a `STATIC` target with the same `OUTPUT_NAME`;
- `file(GLOB)` sources;
- demos gated only on `BUILD_DEMOS`, which defaults to `ON` and needs OpenGL;
- `LIB_INSTALL_DIR` cache variables and no `install(EXPORT)`;
- no CI.

| # | Step | What the skill said | What I did | Exit check (command, version, exit, excerpt) | Verdict |
|---|---|---|---|---|---|
| M0 | Entry check | "The unmodified tree configures and builds today. If it does not ... stop and run `cmake-dependency-triage` first" | Ran the default configure. It fails for two reasons: `project(chipmunk)` enables CXX, and the demo needs OpenGL. Triage has no row for an absent host dependency. I continued with the tree's own `-DBUILD_DEMOS=OFF` | `m00-entry.sh`, both lines: exit 1, `No CMAKE_CXX_COMPILER could be found`, then `Could NOT find OpenGL`. `m00b`: with `BUILD_DEMOS=OFF` the ungated run exits 0 and the build exits 0. The gated run exits 1 on `CMake Deprecation Error` (3.31.12) and `CMake Error (deprecated)` (4.4.2) at `CMakeLists.txt:1` | stalled |
| M1 | Step 0 inventory | Run I1 to I12 and F1, write the plan file | Ran each command verbatim (`m01-inventory.sh`) and wrote `cmake-modernize-plan.md` | I1: 2 hits (`src/CMakeLists.txt:32 target_link_libraries(chipmunk m)`, `demo:44`). I2: 3. I3: 4, all appends. I6: `CMakeLists.txt:12 SET(CMAKE_BUILD_TYPE Release CACHE ... FORCE)`. F1: `CMakeLists.txt:1 cmake_minimum_required(VERSION 3.7)`. I4, I5, I7, I8, I10, I11 and I12 exit 1 (empty) | worked |
| M1b | Step 0, I9 | "Name the directories that exist in this tree as operands" | Ran it verbatim | `grep: build/_deps: No such file or directory`, `grep: third_party: ...`, exit 2. The tree has no fetched or vendored CMake, and the text does not say that this is "not applicable" | stalled |
| M2 | Step 1, choosing `<max>` | "`<max>` is the newest CMake CI runs" | The tree has no CI, so `<max>` is undefined. I adopted 4.4, the program's pinned lines | none | stalled |
| M3 | Step 1, the edit | Keep 3.7 and add `...<max>`. The minimum is below 3.10, so ask the owner | Changed the line to `cmake_minimum_required(VERSION 3.7...4.4)` and recorded the VER-05 hazard | `m02-step1.sh`, both lines: F1 exit 1 (empty). Canary exit 1. Gated configure (`BUILD_DEMOS=OFF`) exit 0, build exit 0. `m03`: compile and link commands are byte-identical to baseline (`diff` exit 0) | worked |
| M4 | Step 2, `src` targets | "Move directory scope onto `target_*`" | Wrote the natural edit, `target_include_directories(chipmunk PUBLIC ${chipmunk_SOURCE_DIR}/include)`, and the same for `chipmunk_static` | Step 2's own check passes. Step 6's round trip then fails at generate on both lines: `Target "chipmunk" INTERFACE_INCLUDE_DIRECTORIES property contains path: ".../Chipmunk2D/include"` (the source-tree path error). Step 2 never mentions `$<BUILD_INTERFACE:>` | misled |
| M5 | Step 2, exit check | "`I2`, scoped to that target's directory, is empty" | Negative control (`m05-step2-negative.sh`, 4.4.2): deleted `include_directories` and added nothing | I2(`src`) exit 1 = "pass". Gated configure exit 0. Build exit 1: `fatal error: chipmunk/chipmunk_private.h: No such file or directory`. The check certifies that the old command is gone, not that the conversion kept the build | wrong |
| M6 | Step 3, keywords and ALIAS | `PRIVATE` unless the type is in installed headers. Add `chipmunk::` aliases | `target_link_libraries(chipmunk PRIVATE m)`, two aliases, and the demo links through `chipmunk::chipmunk_static` | `m06-step3.sh`, both lines: I1 shows only keyworded calls. Gated configure exit 0, build exit 0 | worked |
| M7 | Step 4, flags and standards | "Standards become `target_compile_features`" | Moved the four appends onto targets and replaced `-std=gnu99` with `target_compile_features(... PUBLIC c_std_99)` | `m07-step4.sh`, both lines: I3, I11 and I12 exit 1 (all pass), configure 0, build 0. But the compile line changed from `... -std=gnu99 -O3 ...` to `... -O3 -DNDEBUG -fPIC -ffast-math ...` with no `-std`. `cstd/probe.sh` shows gcc 15.2.1's `CMAKE_C_STANDARD_COMPUTED_DEFAULT "23"`: `c_std_99` emits no flag, while `C_STANDARD 99` emits `-std=gnu99`. The library now compiles as gnu23 and every check is green. Corrected in `d086fcc` with `C_STANDARD 99 C_EXTENSIONS ON` | misled |
| M8 | Step 5, top-level gating | Use the `PROJECT_IS_TOP_LEVEL` shim below 3.21, guard the build type and guard examples | Added the shim, the `GENERATOR_IS_MULTI_CONFIG` + `FORCE` idiom and `option(BUILD_DEMOS ... ${PROJECT_IS_TOP_LEVEL})` | `m08-smoke.sh`, both lines: smoke configure exit 0, `Total Tests: 0`, the `chipmunk_demos` grep exit 1 (empty), and the parent's `CMAKE_BUILD_TYPE:STRING=` is empty | worked |
| M9 | Step 6, running the round trip | "The script is in references/proofs.md" | Ran it verbatim | Both lines: exit 1, `Could NOT find OpenGL`. The script's first `cmake -S` has no slot for the library's own `-D` options, so `BUILD_DEMOS=OFF` needs a script edit (`EXTRA_CFG` in `roundtrip.sh`) | stalled |
| M10 | Step 6, the reviewable unit | "all in one diff ... with no `CMK-TGT` change riding along". Also "A diff that touches a file no plan-file row names is out of scope" (SKILL.md:233) | Two problems. M4's fix is a `target_include_directories` edit, which is a TGT change. The Config template `cmake/chipmunkConfig.cmake.in` is a new file that no row names. I made both edits and recorded them as `new:` rows | After the fix (`dd99a35`), both lines: round trip exit 0, `chipmunk_DIR:PATH=.../moved/lib64/cmake/chipmunk`, and the leak greps are empty | stalled |
| M11 | Step 6, exit check | "The gated round trip exits 0 ... and its leak greps are empty" | The round trip passed for `TARGETS=chipmunk::chipmunk_static`. I then ran a consumer that calls `cpBodySetAngle` (`m10-symbol-consumer.sh`) | Both lines: the round trip exits 0, but the calling consumer's build exits 1 with ``undefined reference to `sincos'``. The static target never linked `m`, and the empty `main` never pulls an archive member. Adding `target_link_libraries(chipmunk_static PRIVATE m)` (`91913ae`) makes the calling consumer exit 0 and exports `$<LINK_ONLY:m>` | wrong |
| M12 | Step 7, as-subproject smoke | "proves the source tree, dropped in with `add_subdirectory`, defines no test and no developer-only target" | Ran the smoke verbatim, then the same smoke with a parent that has its own `option(BUILD_DEMOS "parent demos" ON)` | Verbatim run, both lines: pass. With the parent option: configure exit 1, `Could NOT find OpenGL`. The unprefixed option read the parent's entry and pulled in `chipmunk_demos` | wrong |
| M13 | Step 8, CI | Wire the gate per leg, `gersemi --check`, and the round trip as its own job | The tree has no CI. Ran the CI greps verbatim (`m11-step8.sh`) and ran gersemi | `grep: .github/workflows: No such file or directory`, exit 2, for both the CORE-01 and the INST-18 grep: neither "empty" nor a hit. `gersemi --check` through xargs exits 123, with `would be reformatted` on all 3 files. Passing it takes a whole-file reformat, which "What it refuses" forbids ("the whole tree in one pass"), and no reviewable unit covers it | stalled |

The stop condition was reached after the corrections:

- The round trip exits 0 on both lines, for both exported targets.
- The smoke passes.
- Every plan row is `converted` or `vacuous`.

The plan file is `modernize/Chipmunk2D/cmake-modernize-plan.md`.

## cmake-dependency-triage on real cJSON copies

### Scenario 1: an OVERRIDE_FIND_PACKAGE fallback shadows the installed copy

**Fixture** (`app1/`):

- The top level calls `find_package(cJSON 1.7.18 CONFIG REQUIRED)` and links
  `cjson`.
- `cmake/deps.cmake` declares cJSON 1.7.15 from a local tarball with
  `OVERRIDE_FIND_PACKAGE`, as a vendored fallback.
- `CMAKE_PREFIX_PATH` points at a real cJSON 1.7.18 install.

**The user's symptom** (`t09`, 3.31.12, ungated): configure exit 0, build
exit 1 with `fatal error: cjson/cJSON.h: No such file or directory`. The build
log compiles `_deps/cjson-build/CMakeFiles/cjson.dir/cJSON.c.o`.

On 4.4.2 the configure itself fails:
`CMake Error at build44/_deps/cjson-src/CMakeLists.txt:2 ... Compatibility with CMake < 3.5 has been removed`.

| # | Step | What the skill said | What I did | Exit check (command, version, exit, excerpt) | Verdict |
|---|---|---|---|---|---|
| T1-a | Before you start | Run `cmake --version`. The line picks `GATE` | 3.31.12, so `GATE=-Werror=dev` | `cmake version 3.31.12` | worked |
| T1-b | Pick the entry point | T2: "Installed copy ignored, fetched copy built" | Matched it to the `_deps/cjson-build` line in the build log | none | worked |
| T1-c | Read order, step 1 | Grep the cache before any flag | `NAME=cJSON`, verbatim grep (`t02`) | Exit 0: `cJSON_DIR:PATH=$T/app1/build/CMakeFiles/pkgRedirects` points to T2. Resolved at step one | worked |
| T1-d | Read order, step 2 | Fresh configure with `--debug-find-pkg`. "If the gated configure stops at a floor error first, triage that first" | Ran verbatim, then with the leg's `-DCMAKE_PREFIX_PATH` | Exit 1: `CMake Deprecation Error at build/_deps/cjson-src/CMakeLists.txt:2`, which is T6. The debug log lists only `pkgRedirects/cJSONConfig.cmake` and `pkgRedirects/cjson-config.cmake`. `cJSON_DIR` did not move | worked |
| T1-e | T5 on 4.x | Apply CMK-DEP-15: 3.10, set and restore around the one `FetchContent_MakeAvailable` | Wrapped the call as told (`t04`) | 4.3.4: exit 0. 4.4.2 exits 1 on a new stop: `CMake Error (install-absolute-destination) at build-44/_deps/cjson-src/CMakeLists.txt:163 (install)`, because cJSON installs to `${CMAKE_INSTALL_FULL_LIBDIR}`. No T row fits. These did not clear it (`t05`, `t06`, all exit 1): a scoped `cmake_diagnostic(PUSH)` + `SET CMD_INSTALL_ABSOLUTE_DESTINATION WARN`, a scoped `CMAKE_SKIP_INSTALL_RULES ON`, and `-Werror=dev` on 4.4.2. A declare-level `PATCH_COMMAND sed -i "s/CMAKE_INSTALL_FULL_/CMAKE_INSTALL_/g" CMakeLists.txt` did (`t07`, exit 0). Patching only the export line moved the error to line 149 | stalled |
| T1-f | Read order, step 3 (4.1+) | "A count of 0 on 4.1 or newer after a `find_package` ran is a finding (CMK-DEP-17), except for a provider under `CMakeConfigDeps`" | Counted `find_package-v1` events on the `--fresh` 4.3.4 and 4.4.2 trees | With the redirect answering `find_package(cJSON)`: 0 events on 4.3.4 (configure exit 0) and 0 on 4.4.2, alongside 17 `find-v1` events. The fixed tree (fix B) logs 2. The skill reports a false CMK-DEP-17 finding whenever a FetchContent redirect answered | wrong |
| T1-g | T2, the declaring line | `grep ... -e 'OVERRIDE_FIND_PACKAGE' .` | Ran verbatim | Exit 0: `./cmake/deps.cmake:7:  OVERRIDE_FIND_PACKAGE)` | worked |
| T1-h | T2, the fix | Rules CMK-DEP-07 (declare "carrying `FIND_PACKAGE_ARGS`"), DEP-09 and DEP-32. DEP-07 covers only installable libraries, and `jsonapp` is an application | Took DEP-07's shape and swapped in `FIND_PACKAGE_ARGS 1.7.18 CONFIG` (fix A, `t03`) | Fix A, both lines: the fetch still happens. `cjson_DIR:INTERNAL=.../pkgRedirects`, and `_deps/cjson-src` exists. The try-find searches `cjsonConfig.cmake` and `cjson-config.cmake` (the declare's name), but the package ships `cJSONConfig.cmake`. Fix B, `FIND_PACKAGE_ARGS NAMES cJSON 1.7.18 CONFIG`, both lines: gated configure exit 0, `cJSON_DIR:PATH=$T/pfx/cjson-1.7.18/lib64/cmake/cJSON`, and the binary prints `header 1.7.18, library 1.7.18` | misled |

Stop condition, reached with fix B:

- **Copy:** `cJSON_DIR` under `pfx/cjson-1.7.18`.
- **Mechanism:** the `OVERRIDE_FIND_PACKAGE` redirect at `cmake/deps.cmake:7`.
- **Rule:** DEP-09. The stub reads `Version not available`, and
  `find_package(cJSON 1.7.18)` passed against 1.7.15.

### Scenario 2: the right copy is configured, and another copy loads at run time

This is the scenario the second task asked for, because scenario 1 resolved at
step one.

**Fixture** (`app2/`): `find_package(cJSON 1.7.15 EXACT CONFIG REQUIRED)`
against the 1.7.15 prefix, then `install(TARGETS jsonapp2)`.

**The user's symptom** (`t08`, both lines, configure, build and install all
exit 0):

- The build-tree binary prints `header 1.7.15, library 1.7.15`.
- The installed binary prints `header 1.7.15, library 1.7.18`.
- `ldd` resolves the installed binary to `libcjson.so.1 => /lib64/libcjson.so.1`.

The skill's description lists this symptom: "a binary links or loads a
different copy than the one configured".

| # | Step | What the skill said | What I did | Exit check (command, version, exit, excerpt) | Verdict |
|---|---|---|---|---|---|
| T2-a | Pick the entry point, then the stop condition | T1 to T10 | No row covers loading at run time. The stop condition ("On a `--fresh` configure, `<Pkg>_DIR` names the copy you intended") is already met while the wrong copy runs | none | stalled |
| T2-b | Read order, step 1 | Row 5: "`dep_DIR` under the expected prefix: the copy is right. A wrong version is the manager's", then T8 or T9 | Ran verbatim | Both lines, exit 0: `cJSON_DIR:PATH=$T/pfx/cjson-1.7.15/lib64/cmake/cJSON`. That routes to Conan or vcpkg, and no manager is involved | misled |
| T2-c | Read order, step 2 | `--fresh --debug-find-pkg` | Ran verbatim | Exit 0: `The file was found at` followed by the 1.7.15 `cJSONConfig.cmake`. The read is right but leads nowhere | worked |
| T2-d | Read order, step 3 | Configure-log events | Ran on 4.4.2 | 1 event: `name: "cJSON"`, `path: ".../cjson-1.7.15/.../cJSONConfig.cmake"`, `mode: "config"` | worked |

**The read that answers it** (`t10`, not in the skill):

- `readelf -d` on the build-tree binary shows
  `RUNPATH [$T/pfx/cjson-1.7.15/lib64:]`. The installed binary has no RUNPATH,
  because install strips it.
- Fix: `set_target_properties(jsonapp2 PROPERTIES INSTALL_RPATH_USE_LINK_PATH ON)`.
  On both lines the installed binary then prints `library 1.7.15`, with
  `RUNPATH [$T/pfx/cjson-1.7.15/lib64]`.
- CMK-INST-11 covers only a library loaded from the same prefix, via `$ORIGIN`.

### Scenario 3: a re-pointed CMAKE_PREFIX_PATH has no effect (T1)

**Fixture** (`app3/`, `t11`): a bare `find_package(cJSON CONFIG REQUIRED)`,
configured against 1.7.15. Then `CMAKE_PREFIX_PATH` is re-pointed at 1.7.18 on
the same tree. The binary still prints `header 1.7.15, library 1.7.15`.

| # | Step | What the skill said | What I did | Exit check (command, version, exit, excerpt) | Verdict |
|---|---|---|---|---|---|
| T3-a | Read order, step 1 | The reading compares `dep_DIR` with "the current `dep_ROOT`, `CMAKE_PREFIX_PATH` entry or `VCPKG_INSTALLED_DIR`" | The verbatim grep prints only `cJSON_DIR`. `CMAKE_PREFIX_PATH` is not among its patterns. I added `-e '^CMAKE_PREFIX_PATH'` | Both lines: `CMAKE_PREFIX_PATH:UNINITIALIZED=$T/pfx/cjson-1.7.18` against `cJSON_DIR:PATH=$T/pfx/cjson-1.7.15/...` | stalled |
| T3-b | Read order, step 2 | `_DIR` moves under `--fresh`, which means a stale cache: CMK-DEP-13 | Ran verbatim, with the leg's hint | Both lines: exit 0. `cJSON_DIR` moves to `.../cjson-1.7.18/...`, and the binary prints `header 1.7.18, library 1.7.18` | worked |

## Fixes

Line numbers refer to the files as of this wave, 2026-09-26. Each replacement
is exact text.

### cmake-modernize

1. **`skills/cmake-modernize/SKILL.md:43-45`** (M0, stalled). Replace the
   paragraph with:

   > **Entry check.** The unmodified tree configures and builds today with
   > the options its documentation gives for a library-only build (for
   > example `-DBUILD_DEMOS=OFF`). Write those options into the plan file
   > once. Every later configure, the round trip (`CFG_ARGS`) and the smoke
   > pass them. If the tree does not configure even then, stop. A wrong copy
   > of a dependency is `cmake-dependency-triage`. An absent host dependency
   > or compiler is the owner's to install or switch off, not a triage.

2. **`skills/cmake-modernize/SKILL.md:255`** (M2, stalled). Replace the row
   with:

   > | `<max>` | The newest CMake CI runs, never the newest release. A tree with no CI takes the program's pinned newest line (4.4) and records it in the plan file |

   Add this row after `SKILL.md:259`:

   > | CI lines | The CMake lines CI runs. A tree with no CI takes 3.31 and 4.4 for every "each CI line" check, and step 8 is reported to the owner, not created |

3. **`skills/cmake-modernize/SKILL.md:86`** (M4 misled, M5 wrong). Replace
   the step 2 row with:

   > | 2 Targets | Move directory scope onto `target_*`, one target at a time, leaves of the in-tree graph first. A `PUBLIC` or `INTERFACE` include directory under the source or build tree is written `$<BUILD_INTERFACE:...>` from the start, because `install(EXPORT)` rejects a raw source path at generate time | `I2`, scoped to that target's directory, is empty, the gated configure and build exit 0 on each CI line, and `compile_commands.json` for one source of that target shows the same `-I`, `-D` and `-std` set as before the diff | `CMK-TGT-03` |

4. **`skills/cmake-modernize/SKILL.md:88`** (M7, misled). Replace the Do
   cell of step 4 with:

   > Overwrites and appends become `target_compile_options`, a toolchain file or a preset. A `-std=` flag becomes the target property `<LANG>_STANDARD NN` (with `<LANG>_EXTENSIONS ON` for a `gnu` spelling) plus `target_compile_features(<t> PUBLIC <lang>_std_NN)` for consumers. The compile feature alone is a floor: when the compiler's default is newer, CMake adds no flag. Fix the parses `I4` listed

   Append to the step 4 exit-check cell:

   > , and the `-std=` in `compile_commands.json` for one source per converted target equals the one before the diff

5. **`skills/cmake-modernize/SKILL.md:89`** (M12, candidate FM4). Replace
   "Guard examples, dev options, the `CMAKE_BUILD_TYPE` default and any
   non-test fetch on `PROJECT_IS_TOP_LEVEL`" with:

   > Gate examples, demos and developer options on project-prefixed options (`<PROJECT>_BUILD_EXAMPLES`) that default to `PROJECT_IS_TOP_LEVEL`. An unprefixed name such as `BUILD_DEMOS` reads the parent's own entry of that name. Guard the `CMAKE_BUILD_TYPE` default and any non-test fetch on `PROJECT_IS_TOP_LEVEL`

6. **`skills/cmake-modernize/SKILL.md:170-176`** (M10, stalled). Replace
   "land together, with no `CMK-TGT` change riding along" with:

   > land together, with no `CMK-TGT` change riding along except the `$<BUILD_INTERFACE:>`/`INCLUDES DESTINATION` form of an include directory that the round trip rejects. Add a `new:` plan row for each file the step creates (the Config template) before the diff.

   At `SKILL.md:233`, replace "A diff that touches a file no plan-file row
   names is out of scope." with:

   > A diff that touches a file no plan-file row names is out of scope. Steps 5 and 6 add `new:` rows for the structure and files they create.

7. **`skills/cmake-modernize/SKILL.md:92` and `:188-192`** (M13, stalled).
   Append to the step 8 Do cell:

   > In a tree with no CI, report the three items to the owner and stop. Do not create a CI system. A first `gersemi` reformat ships as its own diff, listed in Reviewable units, never inside a conversion diff

   Add a bullet to "Reviewable units" (`SKILL.md:226-231`):

   > - The first `gersemi` reformat, alone, with no content change.

8. **`skills/cmake-modernize/references/inventory.md:130-133`** (M1b,
   stalled). Append:

   > When neither a fetched nor a vendored CMake tree exists, `I9` is not applicable: record it `vacuous` and do not run it.

9. **`skills/cmake-modernize/references/proofs.md:104-113`** and the same
   script at **`rules/cmake-build/install-and-export.md:25`** (M9, stalled).
   In the header comment, after the `GATE` line, add:

   > `# CFG_ARGS (optional): the library's own -D options from the plan file, for example -DBUILD_DEMOS=OFF`

   Change the first configure to:

   > `cmake -S "$SRC" -B "$W/build" "$GATE" ${CFG_ARGS:-}`

10. **`skills/cmake-modernize/references/proofs.md:125`** and
    **`rules/cmake-build/install-and-export.md:40`** (M11, wrong). Replace the
    `main.c` line with:

    > `printf '%s\n' "$SYM_DECL" "int main(void) { return $SYM_CALL; }" > "$W/consumer/main.c"`

    Add to the header comment:

    > `# SYM_DECL, SYM_CALL: an include or prototype and a call of one exported function per target in TARGETS, e.g. SYM_DECL='#include <mylib/mylib.h>' SYM_CALL='mylib_version() != 0'. An empty main never pulls a static archive member, so a missing link dependency stays green.`

11. **`skills/cmake-modernize/references/proofs.md:46-49`** (M12, wrong).
    Replace "It proves the source tree, dropped in with `add_subdirectory`,
    defines no test and no developer-only target." with:

    > It proves the source tree, dropped in with `add_subdirectory` under a parent that defines none of the library's option names, defines no test and no developer-only target. Run it a second time with the parent line `option(<NAME> "" ON)` for each unprefixed option the library declares. Any developer-only target in that run is a finding.

### cmake-dependency-triage

12. **`skills/cmake-dependency-triage/SKILL.md:97`** (T3-a, stalled). Replace
    the grep with:

    > `grep -rn --include='CMakeCache.txt' -e "^${NAME}_DIR" -e "^${NAME}_ROOT" -e '^CMAKE_PREFIX_PATH' -e '^VCPKG_INSTALLED_DIR' -e '^CMAKE_TOOLCHAIN_FILE' -e '^CMAKE_PROJECT_TOP_LEVEL_INCLUDES' build`

13. **`skills/cmake-dependency-triage/SKILL.md:109`** (T2-b, misled). Replace
    the row with:

    > | `dep_DIR` under the expected prefix | The configured copy is right. A binary that reports another version at run time is the loader: T11. Otherwise a wrong version is the manager's | T11, T8, T9 |

14. **`skills/cmake-dependency-triage/SKILL.md:164`** (T2-a, stalled). Add
    these rows after T10:

    > | T11 | The configured copy is right, but the built or installed binary loads another | `ldd <binary>` and `readelf -d <binary>` | No `RUNPATH` on the installed binary, while the build-tree binary has one: install stripped it and a same-SONAME host copy loads | CMK-INST-11 (`$ORIGIN` for the same prefix), `INSTALL_RPATH_USE_LINK_PATH ON` for another prefix |
    > | T12 | 4.4 and newer: the gate stops on `install-absolute-destination` inside a fetched or vendored dependency | The error's file:line | The dependency installs to an absolute `DESTINATION` (`CMAKE_INSTALL_FULL_*`). A scoped `cmake_diagnostic(SET ... WARN)`, `CMAKE_SKIP_INSTALL_RULES` and `-Werror=dev` do not clear it | A `PATCH_COMMAND` that rewrites every absolute destination, or a re-pin (the CMK-DEP-30 shape). CMK-DEP-31 for the override |

    Add these sections after T10:

    > ## T11 The right copy configured, another one loaded
    >
    > ```sh
    > BIN=build/app
    > ldd "$BIN"
    > readelf -d "$BIN"
    > ```
    >
    > The line naming the library in `ldd` output is the copy that loads. An installed binary with no `RUNPATH` or `RPATH` entry in `readelf` output, whose build-tree twin has one, lost it at install. A host copy with the same SONAME then wins with exit 0 everywhere (measured with cJSON 1.7.15 against a host 1.7.18, 3.31.12 and 4.4.2). For a dependency in the same prefix the fix is CMK-INST-11. For one in another prefix it is `INSTALL_RPATH_USE_LINK_PATH ON` on the executable, or `INSTALL_RPATH` naming that prefix's library directory.
    >
    > ## T12 The 4.4 gate stops inside a dependency's install()
    >
    > `CMake Error (install-absolute-destination) at <dep>/CMakeLists.txt:<n> (install)`. The dependency is third-party code, so CMK-INST-10 cannot be applied to it. `-Werror=dev` promotes the category as well, and `cmake_diagnostic(SET CMD_INSTALL_ABSOLUTE_DESTINATION WARN)` around the add does not beat the command-line gate (4.4.2). Patch every absolute destination in one `PATCH_COMMAND`, because a patch of the first hit moves the error to the next `install()`, or re-pin to a release that uses relative destinations.

15. **`skills/cmake-dependency-triage/SKILL.md:144-147`** (T1-f, wrong).
    Replace "except for a provider under `CMakeConfigDeps`, which logs no
    event (4.4.2)" with:

    > except for a provider under `CMakeConfigDeps` and for a call answered by a FetchContent redirect (`dep_DIR` under `pkgRedirects`), neither of which logs an event (4.3.4 and 4.4.2)

    Make the same change in the Verification cell of
    **`rules/cmake-build/dependencies.md:136`** (CMK-DEP-17):

    > 0 after a `find_package` ran = finding, unless step 1 shows the `_DIR` under `CMakeFiles/pkgRedirects` or a `CMakeConfigDeps` provider answered, and 0 on 3.x is expected.

16. **`skills/cmake-dependency-triage/SKILL.md:210-215`** (T1-h, misled).
    Replace "Empty output means no override declare exists, so look for a
    `FIND_PACKAGE_ARGS` declare whose `find_package` missed." with:

    > Empty output means no override declare exists, so look for a `FIND_PACKAGE_ARGS` declare whose `find_package` missed. The try-find searches the declare's name, so `FetchContent_Declare(cjson ... FIND_PACKAGE_ARGS)` misses a package that ships `cJSONConfig.cmake` on a case-sensitive file system and fetches silently. Its record is `cjson_DIR:INTERNAL=.../pkgRedirects`, under the declare's spelling. For an application, the fix for either keyword is `FIND_PACKAGE_ARGS NAMES <Package> <version> CONFIG` (CMK-DEP-09). For an installable library it is CMK-DEP-07.

## Candidate new failure modes

Each one is measured on the real tree unless it is marked otherwise. None is in
the skills or the rules today.

1. **A compile feature is a floor, not a pin.**
   - Replacing a global `-std=gnu99` with `target_compile_features(c_std_99)`
     makes the library compile at the compiler default.
   - On gcc 15.2.1 the default is `CMAKE_C_STANDARD_COMPUTED_DEFAULT "23"`, so
     the compile line has no `-std`.
   - Every modernize exit check passes (both lines).
   - The rules cover the standard for C++ only (TGT-05..07). No row mentions
     `C_STANDARD` or `c_std_*`.
2. **A step-2 include path is a raw source path.**
   - `target_include_directories(PUBLIC ${..._SOURCE_DIR}/include)` passes
     steps 2 to 5.
   - `install(EXPORT)` then fails at generate (both lines).
   - Its fix is a TGT edit, which step 6's diff forbids.
3. **The round-trip consumer references no symbol.**
   - The empty `main` in both the CMK-INST-01 script and the skill's copy
     passes a static library that is missing a link dependency.
   - A consumer that calls `cpBodySetAngle` fails with
     ``undefined reference to `sincos'`` (both lines).
4. **Unprefixed example and developer options collide with the parent.**
   - `option(BUILD_DEMOS ... ${PROJECT_IS_TOP_LEVEL})` still reads a parent's
     own `BUILD_DEMOS=ON`.
   - The consumer's configure then fails (`Could NOT find OpenGL`, both
     lines), while the skill's smoke parent passes.
   - TEST-09 requires a project prefix only for the test gate.
5. **A kept minimum below the floor of a mechanism the procedure
   prescribes.** Per docs, not measured: no binary below 3.31 was available.
   - Chipmunk's kept 3.7 is below `c_std_99` (3.8, `--help-property
     CMAKE_C_KNOWN_FEATURES` on 4.4.2) and `GENERATOR_IS_MULTI_CONFIG` (3.9).
   - The skill says "never raise the minimum" and never checks new code
     against it.
6. **The `FIND_PACKAGE_ARGS` try-find uses the declare's name.**
   - Lower-case `cjson` misses `cJSONConfig.cmake` and fetches silently (both
     lines).
   - Step 1's grep under the `find_package` spelling (`cJSON`) never shows
     the failed `cjson_DIR:INTERNAL` record.
7. **A redirect-answered `find_package` logs no `find_package-v1` event** (4.3.4
   and 4.4.2). CMK-DEP-17's "0 = finding" is then a false positive, both in
   the skill and in the rule.
8. **The 4.4 gate promotes `install-absolute-destination` inside third-party
   code.**
   - Real case: cJSON 1.7.15, 1.7.18 and master `6d9f2443ab` (2026-09-16)
     all install to `CMAKE_INSTALL_FULL_*` (17 to 19 hits each), so no re-pin
     clears it.
   - Neither `cmake_diagnostic` scoping, `CMAKE_SKIP_INSTALL_RULES` nor
     `-Werror=dev` clears it. A full `PATCH_COMMAND` does.
   - 4.3.4 is unaffected. Fetching cJSON under a 4.4 gate is impossible
     without a patch.
9. **The configured copy is right, and another copy loads at run time.**
   - Install strips the RUNPATH. The host `libcjson.so.1` (1.7.18) then
     satisfies the SONAME for a binary built against 1.7.15 (both lines).
   - The triage skill's description advertises this symptom and has no row
     for it. CMK-INST-11 covers the same-prefix case only.

## Candidate new MUST rows

Each is measured on 3.31.12 and 4.4.2. Each is an amendment to or sibling of
an existing MUST, not a new family.

1. **CMK-TGT (C sibling of TGT-05).** When a `-std=` flag leaves
   `CMAKE_<LANG>_FLAGS`, set the target's `<LANG>_STANDARD` to the same
   level, with `<LANG>_EXTENSIONS ON` for a `gnu` spelling. Use
   `target_compile_features(<t> PUBLIC <lang>_std_NN)` alongside it, never
   instead of it. Verification: the `-std=` in `compile_commands.json` is
   unchanged by the diff.
2. **CMK-INST-01 (verification amendment).** The round-trip consumer calls at
   least one exported function of every target in `TARGETS`. An empty `main`
   is not a consumer of a static library.
3. **CMK-DEP-07/-09 (amendment).** A `FetchContent_Declare` with
   `FIND_PACKAGE_ARGS` whose content name differs in any character, case
   included, from the package's Config name carries `NAMES <Package>`.
   Verification: after configure with the package installed,
   `<name>_DIR` for the declare's own spelling is not under `pkgRedirects`.
4. **CMK-TEST-09 (scope extension).** Gate the examples, demos and benchmarks
   of a consumed library on project-prefixed options that default to
   `PROJECT_IS_TOP_LEVEL`, never on an unprefixed `BUILD_DEMOS` or
   `BUILD_EXAMPLES`. Verification: the smoke re-run with the parent declaring
   each unprefixed option `ON`.

Failure modes 7 and 8 are corrections to a check and a triage row. They are
not new MUSTs:

- For failure mode 8, the only forbidden remedy is dropping the gate, which
  CMK-CORE-01 already forbids.
- Failure mode 9 is a candidate SHOULD extension of CMK-INST-11
  (`INSTALL_RPATH_USE_LINK_PATH` for a dependency in another prefix), because
  of the loader-default-path exception.

## Wave 4 applied (2026-09-26)

Applier: opus. Scripts are under `apply/` in the scratch directory, and
`run.sh` now ends with an apply section that reproduces each line below.
Tools: cmake 3.31.12, 4.3.4 and 4.4.2, gcc 15.2.1, ninja 1.13.2.

### Spot checks (all three reproduced)

| Claim | Command | Result |
|---|---|---|
| FM1: `c_std_99` alone adds no `-std` | `modernize/cstd/probe.sh` | 3.31.12 and 4.4.2: `feature` form has no `-std` flag, `prop` and `flags` forms print `-std=gnu99`, `CMAKE_C_STANDARD_COMPUTED_DEFAULT "23"`. Configure exit 0 in all six |
| FM6: `FIND_PACKAGE_ARGS` misses on name case | `triage/t03-fix1.sh` | Fix A: `cjson_DIR:INTERNAL=.../pkgRedirects`, fetched source present (exit 1 on both lines, from the fetched cJSON floor). Fix B: exit 0, both `_DIR` lines under `pfx/cjson-1.7.18` |
| FM3: empty `main` misses the static link gap | `RT=fixed-static modernize/m10-symbol-consumer.sh` | Both lines: `chipmunk_static` consumer build exit 1, ``undefined reference to `sincos'``. The empty-main `rt.log` ends in `chipmunk_DIR:PATH=.../moved/...` |

Also re-run and reproduced: FM7 (0 `find_package-v1` events against 17
`find-v1` in the redirect trees on 4.3.4 and 4.4.2, 2 in fix B), FM8
(`t05`, `t06`, `t07`: scoped `cmake_diagnostic`, scoped
`CMAKE_SKIP_INSTALL_RULES` and `-Werror=dev` all exit 1 on 4.4.2, 4.3.4 exits
0, the full patch configures with exit 0), FM4 (`m08-smoke.sh`) and FM9 (`t08`,
`t10`).

### Measured while applying

- `apply/a1-roundtrip-sym.sh`: the amended round trip (`SYM_DECL`, `SYM_CALL`,
  `CFG_ARGS`) exits 1 at `dd99a35` with `sincos` undefined and exits 0 at
  `91913ae`, on 3.31.12 and 4.4.2, with `SYM_CALL='cpBodyNew(1, 1) != 0'`.
- `apply/a2-flagset.sh`: the flag-set diff against the step-1 commit prints
  nothing for step 2 (`c5ae468`) and the corrected step 4 (`d086fcc`), and
  prints `< -std=gnu99` for the literal step 4 (`9a565d7`), both lines. The
  unmodified `f2f3d66` cannot be the baseline, because its gated configure
  exits 1 on the 3.7 floor.
- `apply/a3-dep07-probe-case.sh`: CMK-DEP-07's offline probe already catches
  FM6. Fix A exits 1 on 3.31.12 and 4.3.4, fix B exits 0.
- `apply/a4-option-collision.sh`: the smoke's second pass on a 6-line library.
  Unprefixed `BUILD_EXAMPLES` leaks `mylib_example: phony`, and
  `mylib_BUILD_EXAMPLES` leaks nothing, on 3.31.12 and 4.4.2.

### Changed in owned files

- `skills/cmake-modernize/SKILL.md`: Fixes 1 to 7 applied. Entry check with
  plan-file options. Step 2 `$<BUILD_INTERFACE:>`. Step 4 `<LANG>_STANDARD`
  beside the compile feature. Step 5 prefixed example options. Step 6
  exception and `new:` rows. Step 7 second pass. Step 8 no-CI case. `<max>`
  and CI-lines defaults. The gersemi reviewable unit. Steps 2 and 4 now close
  on the flag-set diff instead of Fix 3's hand comparison. Agent failure modes
  10 to 13 added (FM1 to FM4).
- `skills/cmake-modernize/references/inventory.md`: Fix 8 (`I9` vacuous) and a
  new "The flag-set check" section.
- `skills/cmake-modernize/references/proofs.md`: Fixes 9, 10 and 11, plus the
  no-workflows exit-2 reading in CI checks.
- `skills/cmake-dependency-triage/SKILL.md`: Fixes 12 to 16 applied. T11 and
  T12 rows and sections. The Stop condition routes a run-time mismatch to T11.
  The description names the 4.4 stop. Failure modes 8 to 11 added (FM6 to
  FM9).
- `skills/cmake-dependency-triage/references/reading-the-answers.md`: two
  FetchContent-redirect rows (FM6, FM7).

### Handed back (rule files, not owned)

CMK-INST-01 script and rationale (`install-and-export.md:19`, `:22`, `:25`,
`:40`, `:53`), CMK-DEP-17 verification (`dependencies.md:136`), CMK-TGT-05 C
and conversion clause (`targets.md:93`), CMK-TEST-09 scope and verification
(`testing.md:112`), CMK-INST-11 other-prefix clause (`install-and-export.md:134`)
and CMK-DEP-07 rationale (`dependencies.md:99`). Each keeps its ID and
severity.

### Rejected

- Candidate MUST 1 as a new row: it is CMK-TGT-05's conversion case, so it
  goes back as an amendment to that row, not a new ID.
- Candidate MUST 2 as a new row: it is a verification fix to CMK-INST-01.
- Candidate MUST 3: CMK-DEP-07's existing probe already fails the miss
  (`a3`, exit 1). The knowledge lands as triage text and a DEP-07 rationale
  line.
- Candidate MUST 4 as a new row: it is CMK-TEST-09's scope and verification.
- FM5 (kept minimum below prescribed features): read from the docs only, with
  no binary below 3.31, and every CI line the skill runs is green. The step 1
  owner question on a minimum below 3.10 already covers it.

No new MUST row. Eight new failure modes are in shipped skill files, so wave 4
did not converge.

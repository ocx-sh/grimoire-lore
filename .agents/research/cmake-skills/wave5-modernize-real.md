---
title: "Wave 5 — cmake-modernize run literally on two more real trees"
date: 2026-09-26
model: opus
skill: cmake-modernize
trees:
  - repo: https://github.com/open-source-parsers/jsoncpp
    commit: 3347a4b86bb914cb565f0cbda19c06e109513300
    shape: C++ library, directory-scoped build over five subdirectories (src/lib_json, src/test_lib_json, src/jsontestrunner, include, example), own unit and reader/writer tests, an existing un-namespaced install(EXPORT), GitHub Actions CI on an unpinned runner CMake
    clone: shallow (git clone --depth 1), local step commits bb7f08b..4984ebf on top
  - repo: https://github.com/c42f/tinyformat
    commit: aef402d85c1e8f9bf491b72570bfe8938ae26727
    shape: header-only C++ library, no library target, no install, floor 2.8 after project(), CMAKE_CXX_FLAGS and CMAKE_BUILD_TYPE cache writes before project(), Travis/AppVeyor only
    clone: shallow (git clone --depth 1), local step commits d3d33be..b1aadef on top
measured_on: >-
  cmake 3.31.12, 4.0.7, 4.1.6, 4.2.7, 4.3.4, 4.4.2 (versions printed; the step checks ran on 3.31.12 and 4.4.2,
  the tinyformat floor also on 4.0.7) via ocx package exec kitware/cmake:<tag>; ninja 1.13.2; gcc 15.2.1 (C);
  zig c++ wrapper (clang 21.1.0, CMAKE_CXX_COMPILER_ID Clang) for C++; gersemi 0.29.1 via uvx
scratch: /home/mherwig/.cache/cmake-measure-scratch/w5/modernize/ (run.sh reproduces every number and exited 0, and run.log is its output. Build trees are under b/. Variant trees are git worktrees of the two clones. cand/ holds 5 unused candidate clones, because the session's permission policy refused rm -rf)
---

# Wave 5 — cmake-modernize on jsoncpp and tinyformat

I ran the skill in step order, the way an agent that had loaded it would. Each
command came from the skill text. There were two kinds of deviation:

- The documented C++ switch in the round trip. `roundtrip.sh` is
  `roundtrip-verbatim.sh` with `RT_LANG=CXX` and `RT_EXT=cpp`.
- Host flags, named in the row where they apply.

"Both lines" means 3.31.12 with `-Werror=dev` and 4.4.2 with `-Werror=author`.
Every script named below is in the scratch directory, and `$W` stands for that
directory.

**Host constraint (not a finding).** The zig c++ wrapper links libc++
statically into every shared object. A shared `libjsoncpp` and the test
executable therefore carry two copies, and `jsoncpp_test` aborts with
`double free or corruption` (`j00-entry.sh`, both lines, build exit 134). With
`-DBUILD_SHARED_LIBS=OFF` (`j00b-entry-static.sh`), the gated configure, the
build and ctest all exit 0 on both lines (`100% tests passed ... out of 3`).
jsoncpp's plan file therefore carries `-DBUILD_SHARED_LIBS=OFF`. Because the
compiler ID is Clang, jsoncpp's GNU-only branches (`-Werror=strict-aliasing`,
`-Wextra`, `-Wpedantic`) were not exercised.

**Result.** The wave does not converge. It adds 9 candidate failure modes and 4
candidate MUST rows. Five of the defects pass every exit check the skill
defines (J3, J4, J8c, J9, T11b). The wave also confirms three things:

- The wave-4 unprefixed-option pass catches tinyformat's `COMPILE_SPEED_TEST`
  (T7).
- The wave-4 `SYM_CALL` consumer (J9) works on a real tree.
- The wave-4 "no `.github/workflows`, so step 8 is not applicable" text holds
  (T12).

| Tree | worked | misled | stalled | wrong | Steps |
|---|---|---|---|---|---|
| jsoncpp | 6 | 4 | 2 | 4 | 16 |
| tinyformat | 8 | 0 | 4 | 2 | 14 |

Step 9 (CPS, optional) was not asked for and not run on either tree.

## jsoncpp

| # | Step | What the skill said | What I did | Exit check (command, version, exit, excerpt) | Verdict |
|---|---|---|---|---|---|
| J0 | Entry check | Configure and build with the library-only options, and record them | Kept the tests (default). Recorded `-DBUILD_SHARED_LIBS=OFF` as the host constraint | `j00b-entry-static.sh`, both lines: gated configure 0, build 0, ctest `100% tests passed` (3 tests) | worked |
| J1a | Step 0, I1 to I12 | "Write every hit into the plan file" | Ran `inventory.sh` (verbatim) on the upstream tree | I2 exit 0 with 22 lines. It misses three live directory-scoped calls: `src/lib_json/CMakeLists.txt:22 add_compile_definitions(JSONCPP_NO_LOCALE_SUPPORT)` and `add_compile_definitions( JSON_DLL )` at `src/test_lib_json:14` and `src/jsontestrunner:18`. It prints only their dead `else()` twins, `add_definitions(...)` under `CMAKE_VERSION VERSION_LESS 3.12` | misled |
| J1b | Step 0, F1 | "Empty output = pass" | Ran F1 verbatim | F1 exit 1 (empty), so the literal reading is that step 1 is already done. The floor is `CMakeLists.txt:17 cmake_minimum_required(VERSION ${JSONCPP_OLDEST_VALIDATED_POLICIES_VERSION})`, a bare 3.10 spelled through a variable, followed at `:24` by `cmake_policy(VERSION ${JSONCPP_CMAKE_POLICY_VERSION})`, which is 3.13.2 | wrong |
| J2 | Step 1, `<max>` | "`<max>` is the newest CMake CI runs" | `cmake.yml` runs `threeal/cmake-action@v2.0.0` and `abi-compatibility.yml` runs a bare `cmake`, both with the runner image's CMake, which the tree does not pin. The no-CI default covers only "a tree with no CI". I took 4.4 | none | stalled |
| J3 | Step 1, the edit | "Keep the existing minimum. Add `...<max>`" | Wrote `cmake_minimum_required(VERSION ${JSONCPP_OLDEST_VALIDATED_POLICIES_VERSION}...4.4)` | `j02-step1.sh` on the upstream tree and on the floor-only edit, both lines: F1 exit 1, canary exit 1, gated configure exit 0, identical before and after. A `CMAKE_PROJECT_INCLUDE` probe prints `CMP0083= CMP0126= CMP0140= CMP0177=` (unset) both times: the `cmake_policy(VERSION 3.13.2)` at `:24` resets what `...4.4` set. After I also raised `JSONCPP_NEWEST_VALIDATED_POLICIES_VERSION` to `4.4` (`c03ddc7`), all five policies print `NEW`. Build 0, ctest 3/3 | wrong |
| J4 | Step 2, conversion | "Move directory scope onto `target_*`". Step 3's "Default to `PRIVATE`" is the only keyword guidance | Moved `HAVE_MEMSET_S` and `JSONCPP_USE_SECURE_MEMORY` onto the three library targets as `PRIVATE` (tree `jsoncpp-s2priv`) | Step 2's own checks pass on both lines: I2 empty per directory, gated configure 0, build 0, ctest 3/3. With `-DJSONCPP_USE_SECURE_MEMORY=ON` (`j03-secure-baseline.sh`): the step-1 tree builds and passes 3/3, and `-DJSONCPP_USE_SECURE_MEMORY=1` appears in 10 compile commands. The PRIVATE tree has 6, and its build exits 1 with `ld.lld: error: undefined symbol: Json::Value::operator[](std::__1::basic_string<...std::__1::allocator<char>> const&)`. `include/json/value.h:396` and `config.h:133` read the define. The `PUBLIC` form (`bc815e7`) builds, passes 3/3, and has 10 | misled |
| J5 | Step 2, flag-set check | "`<` is a flag the diff lost, the finding" | Ran `flags.sh` per target at the step-1 commit and after each diff | All three sources on both lines print `< -I$W/jsoncpp/include`. The same directory stays as `-I$W/jsoncpp/src/lib_json/../../include`, and `realpath` resolves both to one path. That is a false loss | misled |
| J6 | Step 3, keywords and ALIAS | Keywords, then "Add the namespaced `ALIAS`" | `PRIVATE` on the five I1 calls. `jsoncpp::` aliases for the three library targets, choosing step 6's namespace here | I1 shows only keyworded calls. `j04-step2.sh`, both lines: configure 0, build 0, ctest 3/3 | worked |
| J7 | Step 4, flags and standards | I3, I11 and I12 read | No `CMAKE_*_FLAGS` write, no standard setter, no `-std=` | I3 and I11 exit 1. I12's `-Werror` hits sit in `if(JSONCPP_WITH_WARNING_AS_ERROR)` (default `OFF`). `-Werror=strict-aliasing` is reported separately | worked |
| J8a | Step 5, test gate | Project-prefixed option defaulting to `PROJECT_IS_TOP_LEVEL`, with `include(CTest)` inside the gate | `JSONCPP_WITH_TESTS` now defaults to `${PROJECT_IS_TOP_LEVEL}`, and I added the shim (kept minimum 3.10) | Negative control on the step-3 tree (`j05-neg-and-leak.sh`), both lines: the tests grep exits 1, and `jsoncpp_test: phony`, `jsontestrunner_exe: phony` and `jsoncpp_check: phony` leak. After step 5 (`smoke.sh`): `Total Tests: 0`, all target greps exit 1, and the second pass for `BUILD_SHARED_LIBS`, `BUILD_STATIC_LIBS` and `BUILD_OBJECT_LIBS` configures with exit 0 | worked |
| J8b | Step 5, build-type snippet | Copy the snippet with `RelWithDebInfo` | Kept the tree's `Release`. Measured the verbatim copy in tree `jsoncpp-rwdi` | `flags.sh`, 4.4.2: the verbatim snippet changes `-O3` to `-O2 -g`. Step 5's exit check is the smoke, which never compares flags | misled |
| J8c | Step 5, exit check | "The step 7 smoke, run here too" | Added a parent library after the `add_subdirectory` | On the step-3 and step-5 trees, both lines: `before_lib=STATIC_LIBRARY after_lib=SHARED_LIBRARY BUILD_SHARED_LIBS=ON`. jsoncpp's `option(BUILD_SHARED_LIBS ... ON)`, the shape CMK-TGT-11 prescribes, creates the parent's cache entry. The smoke passes. A directory-scoped `set(BUILD_SHARED_LIBS ON)` under `NOT PROJECT_IS_TOP_LEVEL AND NOT DEFINED BUILD_SHARED_LIBS` (`8ff2174`) gives `after_lib=STATIC_LIBRARY` and an empty parent entry, and the smoke still passes | wrong |
| J9 | Step 6, install and export | "`NAMESPACE`, all in one diff". The round trip is the exit | The tree already had `install(EXPORT jsoncpp)` without a namespace and a hand-written `jsoncpp-namespaced-targets.cmake`. I added `NAMESPACE jsoncpp::` (tree `jsoncpp-s6lit`) | Both lines: the round trip exits 0 for `jsoncpp::jsoncpp_static`. The spellings that worked before (`pre6-*`, exit 0) now fail: `JsonCpp::JsonCpp` exits 1 at generate (`Target "rt" links to: JsonCpp::JsonCpp`), and `jsoncpp_static` exits 2 (`'json/json.h' file not found`: the bare name became a `-l` flag). `abi-compatibility.yml` links `JsonCpp::JsonCpp`. With compatibility names in the targets file (`3a39550`), all five spellings exit 0 on both lines | wrong |
| J10 | Step 6, round trip mechanics | The script, and "for a C++ library ... `LANGUAGES CXX` and `main.cpp`" | `roundtrip.sh` with `RT_LANG`/`RT_EXT`, `CFG_ARGS=-DBUILD_SHARED_LIBS=OFF`, `SYM_CALL='Json::Value(Json::objectValue)[std::string("k")].isNull() != 1'` | Both lines, exit 0, `jsoncpp_DIR:PATH=.../moved/lib64/cmake/jsoncpp`. With `-DJSONCPP_USE_SECURE_MEMORY=ON`: upstream's directory-scoped define fails its own install consumer (`undefined symbol: Json::Value::operator[]`, exit 2), and the modernized tree exits 0 | worked |
| J11 | Step 7 smoke | Both passes | Final tree | Both lines: pass 1 configure 0, `Total Tests: 0`, all target greps exit 1. Pass 2 (3 options) configures 0, all greps exit 1 | worked |
| J12 | Step 8, CI | Wire the gate per leg, run the canary "through each leg's own binary and preset", `gersemi --check` | Added `-Werror=dev` (the shared-line spelling) to every CI configure (`c872b94`). The first gersemi reformat is its own diff (`176ede9`) | CORE-01 grep exit 1, then 0 after the edit. The canary cannot run through the runner image's binary. The CORE-05 grep exits 2 because the `scripts` operand does not exist, and `-s` hides the message while hits print (`update-project-version.yml:79-82`, no `pipefail`). gersemi 0.29.1 `--check` exits 123 (9 files), then 0 after `-i`. The build then exits 0 and ctest passes 3/3 on both lines | stalled |

Stop condition reached on both lines:

- The round trip exits 0 for `jsoncpp::jsoncpp_static`,
  `jsoncpp::jsoncpp_object`, `jsoncpp_static`, `jsoncpp_object` and
  `JsonCpp::JsonCpp`.
- The smoke passes.
- Every plan row is `converted` or `vacuous`.

The plan file is `jsoncpp/cmake-modernize-plan.md`.

## tinyformat

| # | Step | What the skill said | What I did | Exit check (command, version, exit, excerpt) | Verdict |
|---|---|---|---|---|---|
| T0 | Entry check | "configures and builds today ... If the tree does not configure even then, stop" | Ran `t00-entry.sh` on the upstream tree | 3.31.12 ungated: configure 0 (`CMake Deprecation Warning ... < 3.10`), build 0, ctest 1/1. 4.0.7 and 4.4.2 ungated: exit 1, `Compatibility with CMake < 3.5 has been removed from CMake`. Gated on every line: exit 1, `cmake_minimum_required() should be called prior to this top-level project() call`. The check names no binary, so on 4.x a literal agent stops on the defect step 1 exists to fix. I continued on the 3.31 result | stalled |
| T1 | Step 0, inventory | Run I1 to I12 and F1 | `inventory.sh` verbatim | F1: `CMakeLists.txt:21 cmake_minimum_required(VERSION 2.8)`. I2: `:31 include_directories(${CMAKE_SOURCE_DIR})`. I3 and I12: `:17 set(CMAKE_CXX_FLAGS "-Wall -Werror -std=${CXX_STD}" CACHE ...)` and `:27` (`/W3 /WX`). I6: `:8 set(CMAKE_BUILD_TYPE "Release" CACHE ...)`. The others are empty | worked |
| T2 | Step 1, `<max>` and lines | No CI: 4.4, and lines 3.31 and 4.4 | Travis and AppVeyor files only. I applied the no-CI defaults | none | worked |
| T3 | Step 1, the edit | Keep 2.8, add `...4.4`. A minimum below 3.10 is a `CMK-VER-05` hazard for the owner | In place (`tinyformat-inplace`): F1 exit 1, but the gated configure exits 1 on 3.31.12, 4.0.7 and 4.4.2 (`should be called prior to this top-level project()`). Moved above `project()` (`d098691`) | Gated configure exits 0 on 3.31.12, 4.0.7 and 4.4.2, so `2.8...4.4` clears the 4.x hard error. Build 0, ctest 1/1 on both lines. The step's own exit check caught the position | worked |
| T4 | Step 2 | Move directory scope onto targets | `target_include_directories(tinyformat_test PRIVATE ${CMAKE_SOURCE_DIR})` | `t04-step2.sh`, both lines: I2 exit 1, gated configure 0, build 0, ctest 1/1, flag diff exit 0 | worked |
| T5 | Step 3 | Keywords on the links, "Add the namespaced `ALIAS`" | There is no library target to key or alias, and no step creates one | I1 exit 1 (vacuous). There is nothing to alias | stalled |
| T6 | Step 4 | `-std=` becomes `CXX_STANDARD NN` plus the compile feature. Overwrites move to targets | Mapped the `CXX_STD` knob (`c++98`, `c++11`, `gnu++NN`), which CI passes, onto `CXX_STANDARD` and `CXX_EXTENSIONS` inside `NOT DEFINED CMAKE_CXX_STANDARD`. `-Wall` became `target_compile_options`, and `-Werror` became `COMPILE_WARNING_AS_ERROR ON` on the test target | Both lines: I3 and I12 exit 1, configure 0, build 0, ctest 1/1, flag diff exit 0. `-DCXX_STD=c++98` gives `-std=c++98` in both compile entries | worked |
| T7 | Step 5 | Gate tests and developer options on prefixed options | `TINYFORMAT_BUILD_TESTS` (`${PROJECT_IS_TOP_LEVEL}`) with `include(CTest)` inside the gate. `COMPILE_SPEED_TEST` renamed to `TINYFORMAT_COMPILE_SPEED_TEST`. Build-type guard after `project()`, value kept at `Release` | Negative control (step-4 tree, 4.4.2): the tests grep exits 1, `tinyformat_test` and `testall` leak, and pass 2 with the parent's `COMPILE_SPEED_TEST=ON` also leaks `tinyformat_speed_test`. The unprefixed pass works. The step-4 tree also writes `_empty.cpp` into the parent's build root, and `tinyformat_test` built there fails with `'tinyformat.h' file not found`. After `29278c3`: `Total Tests: 0`, all greps exit 1 on both lines | worked |
| T8 | Step 6, the unit | "all in one diff ... with no `CMK-TGT` change riding along" | A header-only library needs `add_library(tinyformat INTERFACE)`, an `ALIAS` and an include directory. That is a TGT change, and no earlier step creates it. I put it in the step-6 diff as a `new:` row | none | stalled |
| T9 | Step 6, the version | `write_basic_package_version_file` | `project(tinyformat)` has no `VERSION`. The tree has none, only git tags up to `v2.3.0`. Without one (`tinyformat-nover`) | `t06-asub-consumer.sh`, both lines: configure exit 1, `No VERSION specified for WRITE_BASIC_CONFIG_VERSION_FILE()`. The version is the owner's call. I recorded `2.3.0` from the latest tag as a stand-in (`aa5771b`) | stalled |
| T10 | Step 6, round trip | The script | `PKG=tinyformat VER=2.3 TARGETS=tinyformat::tinyformat`, `SYM_CALL='tfm::format("%d", 1).size() != 1'` | Both lines: exit 0, `tinyformat_DIR:PATH=.../moved/share/cmake/tinyformat` (INST-08 `ARCH_INDEPENDENT` and the data dir) | worked |
| T11a | Step 7, smoke pass 1 | "The tests grep prints `Total Tests: 0`, the target grep is empty". Only pass 2 checks the configure exit | Ran the smoke on `tinyformat-nover` | Both lines: pass 1 configure exit 1, then `ctest -N` prints `Total Tests: 0` (grep exit 0 = "pass") and every target grep exits 1 (= "pass") against a missing `build.ninja`. A failed configure reads as a pass | wrong |
| T11b | Step 7, what the smoke proves | Configure plus target listing | Wrote the include directory with the tree's own spelling, `$<BUILD_INTERFACE:${CMAKE_SOURCE_DIR}>` (`tinyformat-srcdir`) | Both lines: the round trip exits 0 (it uses `INSTALL_INTERFACE`), and the smoke passes (`Total Tests: 0`, greps empty). A compiled consumer through `add_subdirectory` (`t06-asub-consumer.sh`) configures with exit 0, then the build exits 1 with `main.cpp:1:10: fatal error: 'tinyformat.h' file not found`. The `${CMAKE_CURRENT_SOURCE_DIR}` form builds with exit 0 | wrong |
| T12 | Step 8 | Report CI to the owner when there is no `.github/workflows` | Ran the greps. The first gersemi reformat is its own diff (`b1aadef`) | CORE-01 and INST-18 greps exit 2 (`No such file or directory`), which the text already reads as "not applicable". gersemi `--check` exits 123 (1 file), then 0 after `-i`. Build and ctest stay green on both lines | worked |

Stop condition reached on both lines:

- The round trip exits 0.
- The smoke passes.
- A compiled `add_subdirectory` consumer builds.
- Every plan row is `converted` or `vacuous`.

The kept minimum, 2.8, sits below `COMPILE_WARNING_AS_ERROR` (3.24),
`ARCH_INDEPENDENT` (3.14) and `INTERFACE` libraries (3.0). This is wave 4's
failure mode 5 again (per docs, not re-measured), so it is not re-reported.

## Fixes

Line numbers refer to the files as of this wave (2026-09-26). Each replacement
is exact text.

1. **`skills/cmake-modernize/SKILL.md:108-114`** (J1b wrong, J3 wrong).
   Replace the comment line at `:110` with:

   > `# and a two-dot 3.15..4.3. A floor split across lines or spelled through a variable is not seen: F1b lists those.`

   After the closing fence at `:114`, insert:

   > ```sh
   > # F1b: floors spelled through a variable, and own-code policy pins. A list to read, never a pass.
   > grep -rniE --include='CMakeLists.txt' --include='*.cmake' --exclude-dir='_deps' --exclude-dir='build*' \
   >   -e 'cmake_minimum_required[[:space:]]*\([[:space:]]*VERSION[[:space:]]+[$]' \
   >   -e 'cmake_policy[[:space:]]*\([[:space:]]*VERSION' .
   > ```
   >
   > An own-code `cmake_policy(VERSION <v>)` after the floor resets the policy version that `...<max>` set. The floor diff gives it the same `...<max>`, or raises the variable that caps it. On jsoncpp at 3347a4b8 (`cmake_policy(VERSION 3.13.2)`), the `...4.4` edit alone left CMP0083 to CMP0177 unset on 3.31.12 and 4.4.2 while every step 1 check passed. To confirm, print one policy newer than the kept minimum from a `-DCMAKE_PROJECT_INCLUDE` probe: it reads `NEW` after the diff.

   Measured on jsoncpp-s0: F1b prints `CMakeLists.txt:17` and `:24`, exit 0.

2. **`skills/cmake-modernize/references/inventory.md:46-49`** and
   **`rules/cmake-build/targets.md:41`** (the CMK-TGT-03 rule text and its
   grep) (J1a misled). Add the alternative
   `-e '^[[:space:]]*add_compile_definitions[[:space:]]*\('` to I2, and add
   `add_compile_definitions` to the command list in CMK-TGT-03's rule text.
   Measured on jsoncpp-s0: the added pattern prints the three missing lines,
   exit 0. `add_link_options` belongs to the same class, but neither tree had
   one.

3. **`skills/cmake-modernize/SKILL.md:266-267`** (J2 stalled). In both
   pinned-default rows, replace "A tree with no CI" with:

   > A tree with no CI, or whose CI takes CMake from the runner image without pinning a version,

4. **`skills/cmake-modernize/SKILL.md:92`** (J4 misled). Append to the Do
   cell of step 2:

   > A definition that an installed header reads is `PUBLIC`, and one that only sources read is `PRIVATE`. `grep -rn -e "$NAME" include` lists the readers, with `NAME` set to the definition (for example `NAME=JSONCPP_USE_SECURE_MEMORY`) and the operand set to the installed include directory. Empty output means `PRIVATE`. Run the flag-set check once more with each option that adds a definition switched on

5. **`skills/cmake-modernize/references/inventory.md:194`** (J5 misled).
   After "A line starting `<` is a flag the diff lost, the finding.", insert:

   > A `<` and a `>` line for two `-I` spellings of one directory are not a loss: compare them with `realpath` first (jsoncpp: `-I.../include` and `-I.../src/lib_json/../../include`).

6. **`skills/cmake-modernize/SKILL.md:166`** (J8b misled). After the snippet's
   closing fence, insert:

   > Keep the value the legacy tree defaulted to. `RelWithDebInfo` is for a tree that had none. Step 5's exit check is the smoke, which compares no flags, so re-run the flag-set check after this edit: the verbatim snippet turned jsoncpp's `-O3` into `-O2 -g` (4.4.2).

7. **`skills/cmake-modernize/SKILL.md:95`** (J8c wrong). Append to the step 5
   Do cell:

   > A library that declares `option(BUILD_SHARED_LIBS ...)` first sets it as a normal variable when it is not top level and the parent has not defined it (`if(NOT PROJECT_IS_TOP_LEVEL AND NOT DEFINED BUILD_SHARED_LIBS)`). Otherwise the option creates the parent's cache entry, and every later `add_library()` of the parent turns `SHARED`

   **`skills/cmake-modernize/references/proofs.md:54-56`**: before the
   `printf` that writes the parent, add
   `printf 'int asub_fn(void) { return 1; }\n' > "$W/asub/asub.c"`. After the
   `add_subdirectory` element of that `printf`, add the elements
   `'add_library(asub_after asub.c)' 'get_target_property(_t asub_after TYPE)' 'message(STATUS "asub_after=${_t}")'`.
   Add this reading: "The configure output must print
   `asub_after=STATIC_LIBRARY`. `SHARED_LIBRARY` means the library wrote the
   parent's `BUILD_SHARED_LIBS`." Measured on jsoncpp, both states, both
   lines.

8. **`skills/cmake-modernize/SKILL.md:182`** (J9 wrong). After "so the round
   trip runs once, after all of them.", insert:

   > When the tree already exports targets without a namespace, adding `NAMESPACE` renames every imported target consumers link today. Ship the old names in the Config package: an `ALIAS` of each namespaced imported target on CMake 3.18 and later, and an `INTERFACE IMPORTED` target linking it below that. Keep any name a hand-written targets file defined. Run the round trip once per old spelling as well as the new one. On jsoncpp the `NAMESPACE` edit alone passed for `jsoncpp::jsoncpp_static`, broke `JsonCpp::JsonCpp` at generate and turned `jsoncpp_static` into `-ljsoncpp_static` (`'json/json.h' file not found`), and the tree's own `abi-compatibility.yml` links `JsonCpp::JsonCpp`.

9. **`skills/cmake-modernize/SKILL.md:98`** and
   **`references/proofs.md:192-194`** (J12 stalled). Append to the step 8 Do
   cell:

   > A leg that takes CMake from the runner image has no binary to run the canary through here: spell its gate `-Werror=dev` and record the canary run as the owner's

   In the CORE-05 comment, add: "Name only operands that exist: a missing
   `scripts` exits 2 while `-s` hides the message and the hits still print."

10. **`skills/cmake-modernize/SKILL.md:45-51`** (T0 stalled). After "Write
    those options into the plan file once.", insert:

    > Run it ungated on the oldest CI line (3.31 with no CI). A floor below 3.5 stops every 4.x configure with `Compatibility with CMake < 3.5 has been removed`. That is step 1's to fix, not a stop, as long as the oldest line configures.

11. **`skills/cmake-modernize/SKILL.md:105`** (T3, worked, one line to save
    the round trip). Append to the first paragraph of "Step 1 in detail":

    > A `cmake_minimum_required` below the top-level `project()` moves above it in the same diff. In place, the gated configure fails with `cmake_minimum_required() should be called prior to this top-level project()` (3.31.12, 4.0.7, 4.4.2).

12. **`skills/cmake-modernize/SKILL.md:93`** (T5 and T8 stalled). Append to
    the step 3 Do cell:

    > A header-only library with no target gets `add_library(<pkg> INTERFACE)`, its `ALIAS` and a `$<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>` include directory here, as a `new:` plan row, so that step 6 carries no `CMK-TGT` change

13. **`skills/cmake-modernize/SKILL.md:182`** (T9 stalled). After fix 8's
    paragraph, insert:

    > A `project()` without `VERSION` gives `write_basic_package_version_file` nothing to write, and the configure stops with `No VERSION specified` (3.31.12, 4.4.2). The version is the owner's: ask, and record the answer in the plan file. Never derive it from a git tag on your own.

14. **`skills/cmake-modernize/references/proofs.md:57`** and
    **`SKILL.md:97`** (T11a wrong). After the first `cmake -S "$W/asub"`, add
    the reading "Its exit code must be 0. After a failed configure, `ctest -N`
    still prints `Total Tests: 0` and every target grep is empty." In the step
    7 exit-check cell, replace "The tests grep prints `Total Tests: 0`" with:

    > Both passes configure with exit 0, the tests grep prints `Total Tests: 0`

15. **`skills/cmake-modernize/references/proofs.md:44-73`** and
    **`SKILL.md:97`** (T11b wrong). Add a third pass to the smoke:

    > ```sh
    > # A compiled consumer through add_subdirectory. Exit 0 = pass. TARGETS, SYM_DECL, SYM_CALL as in the round trip.
    > mkdir -p "$W/asub3"
    > printf '%s\n' "$SYM_DECL" "int main(void) { return $SYM_CALL; }" > "$W/asub3/main.c"
    > printf '%s\n' 'cmake_minimum_required(VERSION 3.25...4.4)' 'project(asub3 LANGUAGES C)' \
    >   "add_subdirectory($SRC lib-build)" 'add_executable(app main.c)' "target_link_libraries(app PRIVATE $TARGETS)" > "$W/asub3/CMakeLists.txt"
    > cmake -S "$W/asub3" -B "$W/asub3-build" -G Ninja "$GATE"
    > cmake --build "$W/asub3-build"
    > ```
    >
    > For a C++ library, declare `LANGUAGES CXX` and write `main.cpp`, as in the round trip. The round trip builds against `INSTALL_INTERFACE` only, so a `$<BUILD_INTERFACE:${CMAKE_SOURCE_DIR}>` passes it and fails here: tinyformat, `'tinyformat.h' file not found`, both lines.

    In the step 7 exit-check cell, append: ", and the compiled
    `add_subdirectory` consumer builds with exit 0".

## Candidate new failure modes

Each one was measured on the real tree on both lines, unless marked
otherwise. None of them is in the skill, the rules, or wave 4's list.

1. **A floor spelled through a variable, followed by an own-code
   `cmake_policy(VERSION)`.** (jsoncpp, J1b and J3)
   - F1 is empty.
   - The `...<max>` edit is dead: the policies stay at 3.13.2.
   - Every step 1 check passes before and after.
   - Reproduce: `TREE=jsoncpp-floor-only ./j02-step1.sh`.
2. **I2 and CMK-TGT-03 miss `add_compile_definitions`.** (jsoncpp, J1a)
   - Three live calls are invisible.
   - Only their dead `add_definitions` twins print.
3. **A directory-scoped definition that an installed header reads.**
   (jsoncpp, J4 and J10)
   - The skill's only keyword default (`PRIVATE`) passes every step 2 check
     under the plan options.
   - It breaks the in-tree link under `-DJSONCPP_USE_SECURE_MEMORY=ON`.
   - Upstream's directory scope already broke install consumers under that
     option.
   - `PUBLIC` fixes both.
   - Reproduce: `j03-secure-baseline.sh` on `jsoncpp-s2priv`, and `rt.sh`
     with `secure2-*`.
4. **A library's own `option(BUILD_SHARED_LIBS ...)` writes the parent's
   cache.** (jsoncpp, J8c)
   - The parent's `add_library()` calls after the `add_subdirectory` become
     `SHARED`.
   - CMK-TGT-11 prescribes this option shape.
   - Both smoke passes stay green.
5. **Adding `NAMESPACE` to an existing export renames the targets consumers
   link.** (jsoncpp, J9)
   - The round trip on the new name is green.
   - `JsonCpp::JsonCpp` fails at generate, which breaks the tree's own CI
     consumer.
   - The bare `jsoncpp_static` configures green and fails at compile.
6. **Smoke pass 1 does not check its configure exit.** (tinyformat, T11a;
   also reproduced by a wrong `SRC` in `b/smoke-badsrc-*`)
   - A failed configure prints `Total Tests: 0`.
   - The target greps then run against no build tree and print nothing.
7. **Nothing compiles a consumer through `add_subdirectory`.** (tinyformat,
   T11b and T7)
   - A usage requirement or generated file built on `CMAKE_SOURCE_DIR` or
     `CMAKE_BINARY_DIR` passes the round trip and the smoke.
   - It fails every FetchContent or `add_subdirectory` consumer at compile.
   - Unguarded, tinyformat's `file(WRITE ${CMAKE_BINARY_DIR}/_empty.cpp)`
     writes into the parent's build root.
8. **A header-only library with no target and no project version.**
   (tinyformat, T5, T8 and T9)
   - No step creates the `INTERFACE` target.
   - Step 6's unit rule forbids creating it there.
   - `write_basic_package_version_file` stops on `No VERSION specified`.
9. **The entry check blocks the defect step 1 exists to fix.** (tinyformat,
   T0)
   - A floor below 3.5 fails every 4.x configure (4.0.7 and 4.4.2 measured).
   - The entry check names no line, and its "stop" applies.

## Candidate new MUST rows

Each one was measured on 3.31.12 and 4.4.2. Each amends an existing MUST or
adds a sibling. None is a new family.

1. **CMK-TGT-03 (MUST half).** A compile definition that an installed header
   reads is `PUBLIC` on the library target, or configured into an installed
   header. It is never directory-scoped or `PRIVATE`.
   - Verification: build and run the round trip once with each option that
     adds a definition switched on.
   - Measured: `undefined symbol: Json::Value::operator[]` for upstream's
     install consumer and for the `PRIVATE` in-tree build. Both exit 0 with
     `PUBLIC`.
2. **CMK-TGT-11 (amendment).** A library consumed with `add_subdirectory`
   never creates the `BUILD_SHARED_LIBS` cache entry when it is not top level.
   It sets a directory-scoped default first, under
   `NOT PROJECT_IS_TOP_LEVEL AND NOT DEFINED BUILD_SHARED_LIBS` (CMP0077 NEW).
   - Verification: a parent library added after the `add_subdirectory` reads
     `STATIC_LIBRARY`.
   - Measured: `SHARED_LIBRARY` before the fix, `STATIC_LIBRARY` after.
3. **CMK-INST-06 (migration clause, parallel to CMK-LANG-04's).** Adding
   `NAMESPACE` to an existing export keeps every previously exported name, and
   every name a hand-written targets file defined, as an alias in the Config
   package, or it ships with a changelog entry naming the rename.
   - Verification: the round trip once per old spelling.
   - Measured: 2 of 3 old spellings fail without the aliases, and 5 of 5
     spellings pass with them.
4. **CMK-TGT sibling, candidate `CMK-TGT-21`.** A consumable library never
   builds its own usage requirements, generated sources or output
   directories on `CMAKE_SOURCE_DIR` or `CMAKE_BINARY_DIR`. It uses
   `CMAKE_CURRENT_*` or `PROJECT_*`.
   - Verification: the compiled `add_subdirectory` consumer of fix 15.
   - Measured: `'tinyformat.h' file not found` with `CMAKE_SOURCE_DIR`, exit 0
     with `CMAKE_CURRENT_SOURCE_DIR`.

## Wave 5 applied (2026-09-26)

Applier: opus. Files edited: `skills/cmake-modernize/SKILL.md` (347 to 432
lines), `references/inventory.md` (209 to 216), `references/proofs.md` (249 to
281). The checker (`check-artifacts.py` with the six `--forbid` operands) prints
`clean`, exit 0. No cmake fence was edited, so gersemi was not re-run.

**Spot checks, re-run from the scratch scripts (all reproduced).**

- J3: `TREE=jsoncpp-floor-only ./j02-step1.sh` prints `F1 exit=1`, canary 1,
  gated configure 0 and `CMP0083= CMP0126= CMP0140= CMP0177=` on 3.31.12 and
  4.4.2. `TREE=jsoncpp-s1` prints all five `NEW`. The two trees differ only in
  `JSONCPP_NEWEST_VALIDATED_POLICIES_VERSION` (`rtk proxy diff`, exit 1).
- J8c: the leak probe from `run.sh` on `jsoncpp-s3` prints
  `before_lib=STATIC_LIBRARY after_lib=SHARED_LIBRARY BUILD_SHARED_LIBS=ON`
  and `BUILD_SHARED_LIBS:BOOL=ON` in the parent cache on both lines, and on
  `jsoncpp-s5` `after_lib=STATIC_LIBRARY` with an empty value.
- J9: `rt.sh` on `jsoncpp-s6lit`, 4.4.2: `jsoncpp::jsoncpp_static` exit 0,
  `jsoncpp_static` exit 2 at compile, `JsonCpp::JsonCpp` exit 1
  (`CMake Generate step failed`). The final tree exits 0 for both old names.
- Also re-run: J4 (`j03-secure-baseline.sh` on `jsoncpp-s2priv`, 4.4.2: build
  exit 1, `undefined symbol: Json::Value::operator[]`, 6 defining compile
  entries) and T11b and T9 (`t06-asub-consumer.sh`: `'tinyformat.h' file not
  found` with `CMAKE_SOURCE_DIR`, `No VERSION specified`, both lines).

**Shipped text measured as written.** `apply-check.sh` (appended to `run.sh`,
output in `b/apply-check.log`) runs the new smoke lines: the `asub_bsl=[ON]`
grep exits 0 (finding) on `jsoncpp-s3` and 1 (pass) on `jsoncpp-s5`, and the
third pass builds tinyformat with exit 0 and fails `tinyformat-srcdir` with
exit 1, on 3.31.12 and 4.4.2. The shipped `I2` prints 25 lines on `jsoncpp-s0`
(22 plus the three `add_compile_definitions` calls). The shipped `F1b` prints
`CMakeLists.txt:17` and `:24` on `jsoncpp-s0` (exit 0) and nothing on
`tinyformat-t0` (exit 1).

**Changed in place (category a).**

- Entry check: run ungated on the oldest CI line, and a floor below 3.5 on 4.x
  is step 1's (fix 10, T0).
- Step 0 and step 1: `F1b` added with its reading and the `CMP0083` probe, the
  `F1` comment names the variable blind spot, and a floor below `project()`
  moves above it in the floor diff (fixes 1 and 11, J1b, J3, T3).
- Step 2: a definition an installed header reads is `PUBLIC`, with the header
  grep and a build per defining option (fix 4, J4).
- Step 3: a header-only library's `INTERFACE` target is created here as a
  `new:` row (fix 12, T5, T8).
- Step 5: the non-top-level `BUILD_SHARED_LIBS` default (fix 7, J8c), and the
  build-type value is kept with a flag-set re-run (fix 6, J8b). Cites
  `CMK-TGT-11`.
- Step 6: the old-name compatibility paragraph (fix 8, J9, `ALIAS` branch
  only) and the owner's version (fix 13, T9).
- The provenance line names the two wave-5 trees (category e).
- Step 7 exit check: every pass exits 0, the `asub_bsl` grep, and the third
  pass (fixes 7, 14, 15). The `asub_after` library of fix 7 was replaced by a
  `message` of the parent's `BUILD_SHARED_LIBS`: it needs no source file and
  so works for a C or C++ parent unchanged.
- Step 8: the runner-image leg (fix 9, J12). Pinned defaults `<max>` and
  CI lines cover an unpinned runner-image CMake and name it a `CMK-VER-03`
  finding (fix 3, J2).
- `inventory.md`: `I2` gains `add_compile_definitions` and the dead-twin note
  (fix 2, J1a), the flag-set reading gains the `realpath` note (fix 5, J5), and
  the `F1` pointer names `F1b`.
- `proofs.md`: pass 1 records its configure exit and the `asub_bsl` grep
  (fix 14, T11a, J8c), the third pass (fix 15, T11b), the round trip runs once
  per defining option (J10), and the CORE-05 comment names only existing
  operands (fix 9).
- Existing failure mode 6 gains the `-O3` to `-O2 -g` swap (J8b).

**New failure modes (category d), SKILL.md "What agents get wrong".**

- 14: `...<max>` on a floor through a variable, reset by an own-code
  `cmake_policy(VERSION)` (candidate 1).
- 15: a header-read definition moved as `PRIVATE` (candidate 3).
- 16: a library's `option(BUILD_SHARED_LIBS ... ON)` flips the parent
  (candidate 4).
- 17: `NAMESPACE` added to an existing export, round trip on the new name only
  (candidate 5).
- 18: `${CMAKE_SOURCE_DIR}` kept in a usage requirement (candidate 7).

**Not failure modes, fixed as procedure text instead.** Candidate 2 (`I2`
misses `add_compile_definitions`) and candidate 6 (pass 1 unchecked) are defects
in the skill's own commands, now corrected. Candidates 8 and 9 stalled the
agent without a wrong result, and the procedure now says what to do.

**Rule changes, handed back (skills mint no IDs).** MUST bar applied to each:

- `CMK-TGT-03` MUST half (candidate MUST 1): passes. The skill's and
  `CMK-TGT-01`'s `PRIVATE` default steers an agent wrong, a header grep and a
  build with the option on check it, and the defect is a link failure for
  every consumer. A new blocking obligation.
- `CMK-TGT-11` (candidate MUST 2): the row's prescribed shape is the defect.
  Its text is corrected, and the MUST half extends to the non-top-level
  default, same harm class as the unguarded `FORCE`.
- `CMK-INST-06` migration clause (candidate MUST 3): passes, parallel to
  `CMK-LANG-04`'s clause. The measured compatibility file also carried a
  below-3.18 `INTERFACE IMPORTED` branch. The rule's round-trip step (c) would
  list that line as a bare name, so both the skill and the handback keep only
  the `ALIAS` branch (its line contains `::`, and the 3.18 floor sits below the
  program's 3.25). The `ALIAS` branch is the one that ran on 3.31.12 and 4.4.2.
- `CMK-TGT-21` (candidate MUST 4): passes for usage requirements, which break
  every `add_subdirectory` and FetchContent consumer at compile. Generated
  files and output directories are SHOULD: tinyformat's `_empty.cpp` lands in
  the parent's build root, but nothing failed.

**Rejected.**

- `add_link_options` in `I2` and `CMK-TGT-03`: same class, no hit in either
  tree, so unmeasured. Left out.
- A git tag as the package version (T9): the measurer's stand-in, not a rule.
  The skill now says the version is the owner's.
- An `I13` grep for `CMAKE_SOURCE_DIR`: the third smoke pass is decisive, and
  the grep lists legitimate top-level-only uses (tinyformat's gated test code,
  jsoncpp's `CMAKE_CURRENT_SOURCE_DIR STREQUAL CMAKE_SOURCE_DIR` guard).
- Failure mode 5 of wave 4 (kept minimum below the features used) on
  tinyformat: already listed, not re-reported, as the measurer said.

**Convergence.** Not converged: five new failure modes, and three new MUST
obligations handed back (`CMK-TGT-03` MUST half, the `CMK-INST-06` migration
clause, `CMK-TGT-21`).

## Handbacks applied (2026-09-26)

Applier: opus. Re-run script: `$W/handback-spot.sh` (appended to `run.sh`),
output `$W/handback-spot.out`, exit 0. Versions printed: `cmake version
3.31.12` and `cmake version 4.4.2`. Every carrying measurement reproduced.

| Handback | Command | Result (3.31.12 and 4.4.2) | Applied |
|---|---|---|---|
| CMK-TGT-03 MUST half | `TREE=jsoncpp-s2priv ./j03-secure-baseline.sh <tag> hb-s2priv`, then `rt.sh hb-secure2-s1` and `hb-secure2-final` with `-DJSONCPP_USE_SECURE_MEMORY=ON` | `PRIVATE`: build exit 1, `undefined symbol: Json::Value::operator[]`, 6 defining entries. Upstream directory scope: round trip exit 2, same symbol. `PUBLIC` (final): exit 0 | Row replaced as handed back. Severity SHOULD to "MUST (a definition an installed header reads), SHOULD (the rest)" |
| CMK-TGT-21 (new row) | compiled `add_subdirectory` consumer of `tinyformat` and `tinyformat-srcdir`, plus a parent over `tinyformat-s4` | `CMAKE_CURRENT_SOURCE_DIR`: configure 0, build 0. `CMAKE_SOURCE_DIR`: configure 0, build 1, `'tinyformat.h' file not found`. `_empty.cpp` lands in `build/`, not `build/lib-build/`, on both lines | Inserted after CMK-TGT-03 as handed back |
| CMK-TGT-11 | parent probe over `jsoncpp-s3` and `jsoncpp-s5`, `message(STATUS "after_lib=... bsl=[...]")` | s3: `after_lib=SHARED_LIBRARY bsl=[ON]`, `BUILD_SHARED_LIBS:BOOL=ON` in the parent cache. s5: `after_lib=STATIC_LIBRARY bsl=[]`, no cache line. Exit 0 all four | Rule, Rationale, Verification and Severity edited as handed back |
| CMK-INST-06 migration clause | `rt.sh` on `jsoncpp-s6lit` (3 names) and `jsoncpp` (5 names) | s6lit: `jsoncpp::jsoncpp_static` 0, `jsoncpp_static` 2 (`-ljsoncpp_static` in `link.txt`, compile `'json/json.h' file not found`), `JsonCpp::JsonCpp` 1 (`CMake Generate step failed`). Final: 5 of 5 exit 0 | Applied. Rationale names the compile error behind the `-l` item |
| targets.md failure modes 12 to 14 | as above | as above | Appended |
| install-and-export.md failure mode 14 | as above | as above | Appended |
| cmake-build.md index rows 6 and 8 | none (index text) | not applicable | Applied, row 6 ID cell gains CMK-TGT-03 and CMK-TGT-21 |

**Not applied (file not mine).** `.agents/research/cmake-topic-map.md:2073`,
bounded-duplication list for `cmake-modernize`: add TGT-03 (definition half),
TGT-11 and INST-06 (migration clause). Handed on. The skill's MUST table stays
unchanged until that list changes.

Checker: `check-artifacts.py` with the six `--forbid` operands prints `clean`,
exit 0. `targets.md` 201 lines, `install-and-export.md` 206.

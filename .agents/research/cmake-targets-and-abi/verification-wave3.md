---
title: "Verify wave 3 — targets, linkage and ABI"
verifies: ../cmake-targets-and-abi.md
model: opus
date: 2026-09-26
measured_on: CMake 3.31.12, 4.3.4 (help and UUID only) and 4.4.2 via ocx package exec kitware/cmake; gcc 15.2.1 (not default-PIE); Clang 21.1.0 via /opt/zig/zig c++; ninja 1.13.2; Unix Makefiles, Ninja, Ninja Multi-Config
---

# Verify wave 3 — targets, linkage and ABI

Every verification claim, MUST rule and version floor in
`cmake-targets-and-abi.md` was re-checked against the strongest evidence
that was cheap to get.

- **Scratch sources**, re-runnable, are in
  [`scratch/verify-targets-and-abi/`](scratch/verify-targets-and-abi/).
  Run `sh run.sh <proj> <build root>` and `sh run2.sh <proj> <build root>`
  from the worktree root. Run `sh lint/lint.sh <lint dir>` for the grep
  red/green table. `run.log` and `run2.log` are the recorded outputs.
- **Build trees** were deleted.
- **Primary sources** were fetched on 2026-09-26:
  - Conan `blocks.py` at 2.6.0, 2.7.0 and 2.32.0;
  - vcpkg `scripts/buildsystems/vcpkg.cmake` at 2026.07.29, and the vcpkg
    maintainer guide (vcpkg-docs `main`);
  - CMake `Help/dev/experimental.rst` at v3.31.12, v4.3.4, v4.4.2 and
    master;
  - CMake `Source/cmTarget.cxx` at v2.8.8 and v2.8.9;
  - the Kitware modules blog post;
  - microsoft/vcpkg#50271 through the GitHub API.

Totals: 66 claims checked. 52 confirmed, 11 corrected, 3 unverifiable.

## Ledger

| # | ID or claim | verdict | evidence | note |
|---|---|---|---|---|
| 1 | TGT-04 (amended): overwriting `CMAKE_C_FLAGS` drops a toolchain's `_INIT` `-fPIC`, and the shared link fails; appending keeps it | CONFIRMED | `pic-flags`, 3.31.12 and 4.4.2: append gives `C_FLAGS = -fPIC -DSEED=1 -Wall` and `libshared.so` builds. Overwrite gives `C_FLAGS = -Wall` and `libshared.so` is not built | MUST holds |
| 2 | TGT-05: the `NOT DEFINED` guard keeps the Conan profile; `PROJECT_IS_TOP_LEVEL` alone overrides it at top level | CONFIRMED | `conan-sim` (hand-rendered `CppStdBlock` gnu20 and `VSRuntimeBlock`), 3.31.12 and 4.4.2. `guarded` gives `std=20`. `toplevel` gives `std=17` plus one STATUS "has been modified" line. A pre-`project()` unguarded set gives `std=20` | simulated toolchain, not a Conan-generated one |
| 3 | TGT-05 floor: "the Conan behaviour applies from Conan 2.7.0" | CORRECTED | `blocks-2.6.0.py` `CppStdBlock` already has an unconditional `set(CMAKE_CXX_STANDARD …)`, and `variable_watch` is absent there. It is present at 2.7.0 and 2.32.0 | only the STATUS line needs 2.7.0. The override exists in every Conan 2 checked |
| 4 | Conan 2.32.0 `CppStdBlock`: unconditional `set()` plus a later watch on `CMAKE_CXX_STANDARD` only | CONFIRMED | `blocks.py@2.32.0:335-338` | the watch prints `message(STATUS "Warning: …")`, not a CMake warning |
| 5 | TGT-06: `CppStdBlock` writes `CMAKE_CXX_STANDARD_REQUIRED` | CONFIRMED | `blocks.py@2.32.0:337` | |
| 6 | TGT-07: extensions come from `gnuNN`, the watch covers only the standard, and a later set overrides them silently | CONFIRMED | `blocks.py@2.32.0:336` and `context()`. `conan-sim toplevel` gives `ext=ON` becoming `OFF`, with no line | text upgraded from "read from source, not measured" |
| 7 | TGT-16 / Verdict 3: `VSRuntimeBlock` is a plain `set()` with no watch (`blocks.py:60-76`) | CONFIRMED | `blocks.py@2.32.0:60-75`: `cmake_policy(GET CMP0091)` guard, then `set(CMAKE_MSVC_RUNTIME_LIBRARY …)` | cited range is off by one line |
| 8 | Conflict 3: all three placements are safe, because Conan's `set()` inside `project()` shadows an earlier normal or cache value | CONFIRMED | `conan-sim` with `-DCMAKE_MSVC_RUNTIME_LIBRARY=FromPresetCache`. `pre` and `guarded` give Conan's genex. The `toplevel` override gives `MultiThreadedDLL` with no line | simulated |
| 9 | vcpkg's toolchain never sets `CMAKE_MSVC_RUNTIME_LIBRARY` | CONFIRMED | `grep -n -i MSVC_RUNTIME` on `vcpkg.cmake@2026.07.29` is empty | |
| 10 | vcpkg#50271 is an open static-triplet runtime mismatch | CONFIRMED | API: "[DirectXTex] link failed: x64-windows-static use MD[d] instead of expected MT[d]", open, 2026-03-03, LNK2038 in body | |
| 11 | `CMAKE_MSVC_RUNTIME_LIBRARY` is read when each target is created | CONFIRMED | `cmake --help-variable` at 4.4.2: "used to initialize the `MSVC_RUNTIME_LIBRARY` property on all targets as they are created" | |
| 12 | TGT-16 floor 3.15 (CMP0091) | CONFIRMED | `--help-policy CMP0091` on 3.31, 4.3 and 4.4: "introduced in CMake version 3.15" | |
| 13 | TGT-16 verification grep `-e '/MT' -e '/MD'` | CORRECTED | planted `add_compile_options(-MT)`: the flag half reads red=0. Corpus: curl `CMakeLists.txt:384-385` uses `-MT`/`-MTd` | the new ERE (see the rule) reads red=1, green=0 |
| 14 | TGT-16 table: curl is "satisfied by (opt-in)" | CORRECTED | `curl__curl@98519dac83:CMakeLists.txt:384-385` appends raw `-MT`/`-MTd` behind default-OFF `CURL_STATIC_CRT` | added to the violators cell. The variable at 379-383 stays sanctioned |
| 15 | Conflict 8 / TGT-16 rows: abseil `else()` sets DLL by default; duckdb unconditional; ccache default ON on `WIN32`; glfw opt-in; yaml-cpp and googletest guarded | CONFIRMED | `git show` at the cited SHAs: abseil `CMakeLists.txt:63-67` (after `project()` at 26), duckdb `:96` (after `project()` at 23), ccache `StaticLinkSupport.cmake:4-21`, glfw `:70-72`, yaml-cpp `:54-57`, googletest `internal_utils.cmake:74-76` | |
| 16 | TGT-16: the unguarded set produces LNK2038 on Windows | UNVERIFIABLE | no Windows host | normative support: rows 7-11 |
| 17 | TGT-10: a normal `set(BUILD_SHARED_LIBS ON)` before a fetch into a dependency on floor 3.12 builds STATIC, with only a CMP0077 warning | CONFIRMED | `bsl-normal` (FetchContent `SOURCE_DIR`), 3.31.12 and 4.4.2: "Policy CMP0077 is not set", `DEPA_TYPE=STATIC_LIBRARY` | needs the dependency's own `option(BUILD_SHARED_LIBS …)` |
| 18 | TGT-10 C5: set and restore plus `CMAKE_POLICY_DEFAULT_CMP0077=NEW` | CONFIRMED | `bsl-scoped`: `DEPA_TYPE=SHARED_LIBRARY DEPB_TYPE=STATIC_LIBRARY`, no CMP0077 warning | |
| 19 | TGT-10 and TGT-11 C6: `CACHE … FORCE` overrides `-DBUILD_SHARED_LIBS=OFF` | CONFIRMED | `bsl-force -DBUILD_SHARED_LIBS=OFF`: `DEP_TYPE=SHARED_LIBRARY` on both | MUST holds |
| 20 | CMP0077 introduced in 3.13 | CONFIRMED | `--help-policy CMP0077` on 3.31, 4.3 and 4.4 | |
| 21 | qtbase guarded FORCE at `QtAutoDetectHelpers.cmake:11-13` | CONFIRMED | `qt__qtbase@0ef5a8e9ca`: `if(NOT DEFINED BUILD_SHARED_LIBS)` then FORCE | |
| 22 | TGT-11 grep `add_library([^ )]* STATIC` | CORRECTED | corpus: 1,989 hits as written against 2,072 with a whitespace-tolerant ERE. About 20 more are split across lines | grep widened; multi-line calls stay a manual read |
| 23 | TGT-12: no PIC means the shared link fails with `recompile with -fPIC`; the variable and the property both fix it | CONFIRMED | `pic`, 3.31.12 and 4.4.2: none gives "relocation R_X86_64_32S against symbol `table' can not be used when making a shared object". `-DCMAKE_POSITION_INDEPENDENT_CODE=ON` and the property both build | only the `-D` channel was re-run; the two `set()` channels are the dive's |
| 24 | `POSITION_INDEPENDENT_CODE` is initialised from the variable only when the target is created | CONFIRMED | `--help-property` at 4.4.2: "initialized by the value of the `CMAKE_POSITION_INDEPENDENT_CODE` variable if it is set when the target is created" | |
| 25 | TGT-12 floor: the property exists since 2.8.9 | CONFIRMED | `Source/cmTarget.cxx`: 0 occurrences at v2.8.8, 4 at v2.8.9 | |
| 26 | TGT-13: ELF exports every symbol by default; with the presets it exports only the marked API | CONFIRMED | `vis` (Clang 21), 3.31.12 and 4.4.2, `nm -D --defined-only -C`: without the presets `header_inline` W, `internal_helper` T, `api_fn` T. With them, only `api_fn` T | |
| 27 | `WINDOWS_EXPORT_ALL_SYMBOLS` is MS-only and does not cover data | CONFIRMED | `--help-property` at 4.4.2: "implemented only for MS-compatible tools on Windows"; "Global *data* symbols must be explicitly marked" | normative only |
| 28 | vcpkg maintainer guide: do not add `CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS` | CONFIRMED | `maintainer-guide.md:705-707`: "Unless the author of the library is already using it, we should not use this" | |
| 29 | TGT-13: the four Google flagships "have no export markup" | CORRECTED | `ABSL_DLL` `absl/base/config.h:564`; `PROTOBUF_EXPORT` `port_def.inc:334`; `GRPC_DLL`/`GPR_DLL` `include/grpc/support/port_platform.h:72,94`; re2 none | conclusion kept on vcpkg's author-already-uses-it exemption |
| 30 | The four export-all call sites (abseil `:8`, re2 `:52`, protobuf `:260`, grpc `:39`) | CONFIRMED | `git show` at the cited SHAs | |
| 31 | CMP0063 (3.3) extends the presets to all target types | CONFIRMED | `--help-policy CMP0063`: "Honor visibility properties for all target types", introduced in 3.3 | |
| 32 | TGT-13 adoption: 9 of 43 | CONFIRMED | `cmake-audit/exemplar-cmake-shape.md:456`: "9 (21%)" | |
| 33 | TGT-14: a bare `m`, a bare `pthread` and a misspelling each exit 1 with "which is not a target", after "Configuring done"; an absolute path and `Threads::Threads` pass | CONFIRMED | `ot`, 3.31.12 and 4.4.2: exit 1 for three items, error at log line 16 after "Configuring done" at line 10; exit 0 for `/usr/lib/libm.so.6` and `Threads::Threads` | also on 3.31, not only 4.4 |
| 34 | TGT-14 floor 3.23 | CONFIRMED | `--help-variable CMAKE_LINK_LIBRARIES_ONLY_TARGETS`: `versionadded:: 3.23` on all three binaries | |
| 35 | TGT-15: `CMAKE_DEBUG_PREFIX_MAP` does not exist, and CMake has no native prefix-map variable | CONFIRMED | `--help-variable` exits 1 on 3.31, 4.3 and 4.4; `--help-variable-list` has no `PREFIX_MAP` entry | |
| 36 | TGT-15: objects from two checkouts differ without the flags and are byte-identical with them | CONFIRMED | `prefix`, gcc, 3.31.12 and 4.4.2: `cmp` "differ: byte 41" without them, "identical" with them | Clang 21 via zig also honours the flag |
| 37 | `CMAKE_CXX_STANDARD_EXTENSIONS` does not exist | CONFIRMED | `--help-variable` exits 1 on 3.31, 4.3 and 4.4 | |
| 38 | TGT-17 C1: a plain `CACHE` set after `project()` is a no-op | CONFIRMED | `bt-noforce`: `AFTER=[]`, `CMAKE_BUILD_TYPE:STRING=` on both | |
| 39 | TGT-17 C3: `FORCE` after `project()`, or a plain `CACHE` set before it, takes effect | CONFIRMED | `bt-force` and `bt-preproject`: `AFTER=[Release]` on both | |
| 40 | TGT-17 C2: a subproject's forced default gives the parent's target `-O3 -DNDEBUG` | CONFIRMED | `bt-sub`: `PARENT_AFTER=[Release]`, parent `flags.make` `C_FLAGS = -O3 -DNDEBUG` | |
| 41 | TGT-17 C4: before `project()`, Ninja Multi-Config reports `CMAKE_CONFIGURATION_TYPES` empty and `GENERATOR_IS_MULTI_CONFIG` = 1 | CONFIRMED | `mc-pre`: `PRE: CONFIGURATION_TYPES=[] IS_MULTI=[1]`, then `POST: [Debug;Release;RelWithDebInfo]` | |
| 42 | TGT-17 shipped snippet | CONFIRMED | `bt-snippet`: single-config gives `RelWithDebInfo`; `-DCMAKE_BUILD_TYPE=Debug` is kept; Ninja Multi-Config stays empty | |
| 43 | TGT-17: "a hit after `project()` without FORCE" is a finding, and an empty cache is a finding | CORRECTED | `bt-normal`: a normal `set(CMAKE_BUILD_TYPE RelWithDebInfo)` after `project()` gives `-O2 -g -DNDEBUG` while the cache reads empty (3.31.12 and 4.4.2) | narrowed to `CACHE` hits; the behavioural check reads flags for a normal default |
| 44 | TGT-17 grep `set(CMAKE_BUILD_TYPE` | CORRECTED | corpus: `ClickHouse__ClickHouse@0995a518a8:CMakeLists.txt:68` `set (CMAKE_BUILD_TYPE …)` is missed. Planted `set (` reads red=1 as written and 2 corrected | |
| 45 | TGT-17 floors: `GENERATOR_IS_MULTI_CONFIG` 3.9, `PROJECT_IS_TOP_LEVEL` 3.21 | CONFIRMED | `versionadded:: 3.9` and `versionadded:: 3.21` | |
| 46 | TGT-17 exemplar rows: rapidjson forces after `project()`; arrow and boost set before `project()`; aminya and cmake_template use FORCE | CONFIRMED | rapidjson `:13-15` (PROJECT at 10); arrow `cpp/CMakeLists.txt:104-108` (project at 122); boost `:8-11` (project at 13); aminya `Common.cmake:21-26`; cmake_template `StandardProjectSettings.cmake:2-6` | |
| 47 | TGT-18: a `3.25...4.4` range makes CMP0155 NEW, so C++20 scans sources with no modules | CONFIRMED | `scan`: `CMP0155=[NEW]` on 3.31.12 and 4.4.2. Ninja at 20 gives 2 `CXX_SCAN__`/`CXX_DYNDEP__` lines in `build.ninja`; at 17 and with `NOSCAN` it gives 0 | |
| 48 | CMP0155 and `CMAKE_CXX_SCAN_FOR_MODULES` since 3.28 | CONFIRMED | `--help-policy` and `--help-variable` on all three binaries | |
| 49 | TGT-18 severity SHOULD: "the cost is build time; no wrong output" | CORRECTED | `scan` Ninja STD=20, Clang 21 without `clang-scan-deps`: configure exits 0, then the build fails with `CMAKE_CXX_COMPILER_CLANG_SCAN_DEPS-NOTFOUND: command not found`, exit 127, on 3.31.12 and 4.4.2. STD=17 and STD=20 with `NOSCAN` build | now **MUST** (measured). Unix Makefiles: no scan step, builds |
| 50 | TGT-18 verification `grep -rc --include='build.ninja'` | CORRECTED | Ninja Multi-Config STD=20: `build.ninja:0`, but `CMakeFiles/impl-<Config>.ninja:2` each | now `grep -rl --include='*.ninja'` |
| 51 | TGT-18: set the variable as a normal variable, not in the cache | CONFIRMED | `cmake-cxxmodules(7)` at 4.4.2, "Scanning Without Modules": "it should **not** be in the cache" | added to the rule text |
| 52 | TGT-19 gate matrix: 3.28, Ninja 1.11, VS 17.4 / MSVC 14.34, GCC 14, Clang 16 | CONFIRMED | `--help-manual cmake-cxxmodules` at 4.4.2, lines 70-80 and 121 | |
| 53 | TGT-19: `import std` stays experimental through 4.4, Ninja only | CONFIRMED | same manual, lines 100-108 | |
| 54 | TGT-19: the `import std` toolchain gates are missing from the rule | CORRECTED | same manual, lines 85-90: Clang 18.1.2+, MSVC 14.36+, GCC 15+ | an omission, not a wrong value; gates added |
| 55 | C7: `CXX_IMPORT_STD` UUIDs `d0edc3af…` (3.31.12), `451f2fe2…` (4.3.4), `f35a9ac6…` (4.4.2); master `25d6f6aa…` | CONFIRMED | `Help/dev/experimental.rst` at each tag. Behaviour: 4.4.2 accepts `f35a9ac6` and prints "set to incorrect value" for `d0edc3af` and `25d6f6aa`; 3.31.12 accepts `d0edc3af` | behavioural check added to the rule |
| 56 | Kitware: named modules left experimental in 3.28; `import std` did not | CONFIRMED | blog, 2023-10-18: "CMake 3.28 has official support for C++ 20 named modules"; "still plenty of work to do, including … 'import std'" | |
| 57 | Two of 46 repos ship modules in production (fmt, nlohmann/json) | CONFIRMED | `exemplar-cmake-shape.md:98`; `fmtlib__fmt@522e2c12ab:CMakeLists.txt:341` `add_module_library`; `nlohmann__json` `src/modules/CMakeLists.txt` exists | |
| 58 | TGT-20: sanitizer module citations and the two Windows-trap line ranges | CONFIRMED | `aminya__project_options@412045e1f1:src/Sanitizers.cmake:169-186` (standalone UBSan and the static CRT) and `:735-751` (debug CRT); cmake_template `cmake/Sanitizers.cmake` exists | codified |
| 59 | TGT-20: the Windows sanitizer traps reproduce | UNVERIFIABLE | no Windows host | |
| 60 | TGT-20 floor: `target_link_options` 3.13 | CONFIRMED | `--help-command`: `versionadded:: 3.13` | |
| 61 | 25 of 46 repos carry `-fsanitize=` | CONFIRMED | `exemplar-deps-and-dual-build.md:73,445` | the audit row is #12, not §9 |
| 62 | TGT-05/06/07 exemplar cell: cmake_template `CMakeLists.txt:10-12` satisfies all three | CORRECTED | the guard is at `:11-13` and covers only the standard; no `CMAKE_CXX_STANDARD_REQUIRED` anywhere; `set(CMAKE_CXX_EXTENSIONS OFF)` at `:18`, unguarded but before `project()` | TGT-05 only |
| 63 | TGT-18 / TGT-12 rows: cmake_template `CMP0155 OLD` at `:3-4`; duckdb PIC at `:94`; duckdb `_REQUIRED` and `_EXTENSIONS` unguarded at `:90-91` | CONFIRMED | `git show` at the cited SHAs | |
| 64 | TGT-09 (carried MUST) grep catches a literal `-Werror` | CONFIRMED | lint: red=1, green=0 | |
| 65 | find_ocx is vacuous for the family | CONFIRMED | 0 `add_library`/`target_link_libraries` hits; every fixture has `project(… LANGUAGES NONE)` | |
| 66 | TGT-13 / TGT-16: export-all misses data, and a runtime mismatch is LNK2038 at link time on Windows (behaviour) | UNVERIFIABLE | no Windows host | the docs (rows 11, 27) are the evidence |

## Verification commands exercised

The planted tree (`lint/red/CMakeLists.txt`) carries one violation per rule.
The clean tree (`lint/green/CMakeLists.txt`) carries the sanctioned shape.
Counts are output lines from `sh lint/lint.sh lint`.

- **TGT-04** (BZL-03 `-i -F` form, which the amendment adopts): red=3,
  green=0. `SET(` is caught through `-i`.
- **TGT-05** `CMAKE_CXX_STANDARD` read: red=1, green=3. This is a reading
  heuristic by design. The green hits are the guarded ones, and triage
  passes them.
- **TGT-06** REQUIRED pipeline: red=1, green=0.
- **TGT-07** EXTENSIONS pipeline: red=1, green=0.
- **TGT-09** `-Werror`: red=1, green=0.
- **TGT-10** `BUILD_SHARED_LIBS`: red=1 (the FORCE write), green=0.
  Behavioural `TYPE` message: shown red (`SHARED_LIBRARY` against `-D … OFF`)
  in `bsl-force`, and green in `bsl-scoped`.
- **TGT-11**:
  - as written: red=2, green=0;
  - widened ERE: red=2, green=0. The corpus gains 83 hits.
- **TGT-12**:
  - `compile_commands.json` lines for `stat.c` with `-fPIC`: none=0 (red),
    var=1, prop=1;
  - `readelf -rW stat.c.o` `R_X86_64_32`/`32S` count: none=1 (red),
    var=0, prop=0.
- **TGT-13** presence grep (empty = finding): red=0 (finding), green=2.
  `nm -D` shrinks from 3 to 1 symbols with the presets.
- **TGT-14**: the `-A3` grep shows the bare `m` in red. The configure exit
  code is 1 for a bare name and 0 for a target or a path.
- **TGT-15**: `grep -rlF --include='*.o' -e "$SRC_DIR" build` gives 1 file
  without the map (red) and 0 with it (green).
- **TGT-16**:
  - as written: red=1, green=0, but only through the variable;
  - its flag half alone: red=0. It misses `-MT`;
  - corrected ERE: red=1, green=0.
- **TGT-17**:
  - as written: red=1, green=0. It misses `set (`;
  - corrected: red=2, green=0;
  - `CMakeCache.txt` read: empty for C1 (a true finding) and also for
    `bt-normal` (a false finding, now routed to `flags.make`).
- **TGT-18**:
  - as written, on single-config Ninja: `build.ninja:2` at 20 (red) and
    `:0` at 17 or with `NOSCAN` (green);
  - as written, on Ninja Multi-Config: `build.ninja:0` at 20 (a false green);
  - corrected (`-rl --include='*.ninja'`): lists `impl-*.ninja` and
    `rules.ninja` (red).
- **TGT-19** modules grep: red=1, green=0. The UUID warning check is shown
  red for a wrong UUID and green for the right one on 4.4.2.
- **TGT-20** `-fsanitize=`: red=1, green=0.

## Unverifiable

- **Windows (TGT-16, TGT-13, TGT-20):** LNK2038 from an unguarded runtime
  `set()` under a static Conan profile; export-all missing data symbols;
  the two clang-sanitizer CRT traps. There is no Windows host. The evidence
  stays normative (CMake docs, Conan and vcpkg source) or codified
  (project_options comments).
- **A real Conan run:** rows 2, 6 and 8 used a toolchain rendered by hand
  from `blocks.py@2.32.0`, not a `conan install` output. CMK-CONAN-10's own
  verify wave 2 ran a Conan-generated file with matching results.
- **The TGT-12 `set()` channels** (before `add_subdirectory`, before
  `FetchContent_MakeAvailable`) were not re-run. Only the `-D` channel and
  the property were.

---
title: Wave 6 sweep B — targets, install-and-export, dependencies, toolchains-and-providers on real trees
date: 2026-09-26
repositories:
  - fmtlib/fmt @ 522e2c12abe6e0d721640eb6cba9fed30c588983 (2026-09-25) — modern consumable library
  - jbeder/yaml-cpp @ 1e0876c671268661deb2628040e3959e1e9d6e69 (2026-09-17) — modern consumable library
  - ccache/ccache @ b471bbde2923994781821e8d8893e7180ba45168 (2026-09-19) — application with FetchContent dependencies
  - Tencent/rapidjson @ 24b5e7a8b27f42fa16b96fc70aade9106cf7102f (2025-02-05) — legacy directory-scoped tree
  - KDE/extra-cmake-modules @ b4c4ec9997373cfccc3a1da95232a54f14e9dede (2026-09-04) — ships CMake modules for others
  - catchorg/Catch2 @ 222e233903d287cda4713fb08e1a959e8d71fd6d (2026-09-25) — CMakePresets.json + CI workflows
cmake_versions: "4.4.2 (kitware/cmake:4.4) for every live configure/build; 3.31.12 confirmed via --version only this wave"
scratch: /home/mherwig/.cache/cmake-measure-scratch/w6/sweep-b/ (logs/, run-*.sh, guard_scan.sh, roundtrip-rapidjson.sh)
---

## Method

Six shallow clones (`git clone --depth 1`, one commit each, listed above) under
`/home/mherwig/.cache/cmake-measure-scratch/w6/sweep-b/<owner>__<repo>/`, copied from
the existing blob-less sparse exemplar cache (full file content confirmed present
before use). Every grep-shaped Verification cell in `targets.md`,
`install-and-export.md`, `dependencies.md` and `toolchains-and-providers.md` was
run **exactly as printed**, from each repository's root, via `run-targets.sh`,
`run-inst.sh`, `run-deps.sh`, `run-tc.sh` (one script per rule file, looping over
all six repos; `guard_scan.sh` holds the shell function the rows define inline).
Raw output is in `logs/<family>-<repo>.log`.

One live configure+build+install round trip was run (`roundtrip-rapidjson.sh`):
CMake 4.4.2, Ninja 1.13.2, `-Werror=author`, against Tencent/rapidjson, using the
zig C++ wrapper as `CMAKE_CXX_COMPILER` (no g++ on this host). No cell exceeded
one minute; the slowest was KDE/extra-cmake-modules' full-tree greps (115
`.cmake` files, sub-second).

**Not run this wave** (time-boxed, honestly reported rather than invented):
the full CMK-INST-01 round trip on fmt/yaml-cpp/Catch2 (all three ship real
exported C++ libraries; the shipped round-trip script's example consumer is
`LANGUAGES C`, and building a C++ consumer needs the zig wrapper — done once,
not six times), the multi-config leg (CMK-INST-21/22), the CMK-DEP-07/16
consumer/offline probes, the CMK-TC-04 marker-provider probe (C3), and the
configure+build needed for CMK-TGT-12/14/18 (compile_commands.json /
`--debug-find-pkg` reads). These need per-repo SYM_DECL/SYM_CALL/CFG_ARGS
scaffolding that did not fit this pass's budget.

## Results by repository

| Repo | Rows with a hit | True positives (read-confirmed) | False positives / miscategorized | Notable pass |
|---|---|---|---|---|
| fmtlib/fmt | TGT-01(test only), TGT-09, TGT-11(test only), TGT-13, TGT-19, INST-05/06/08 | none of the grep hits is a real finding on the main library: `TGT-09`'s `-Werror`/`/WX` are only ever applied via `target_compile_options(fmt PRIVATE ${WERROR_FLAG})` behind `if(FMT_WERROR)`, and `FMT_WERROR` defaults `OFF` (`CMakeLists.txt:97-98,307-308`) — a clean, read-confirmed pass under the row's own default-OFF exception; INST-05/06/08 clean modern packaging | none found | TGT-03, TGT-04, TGT-05/06/07, TGT-17 all clean (no hits) — a well-behaved modern library |
| jbeder/yaml-cpp | TGT-01(test/vendored gtest only), INST-05/06/08/18/23 | INST-05/06/08/18/23 all clean modern packaging, CI installs and consumes (INST-18 pass) | none found | TGT-03/04/05-07/09/10/11/17/20 all clean |
| ccache/ccache | TGT-03(app-scope), TGT-04(1+2), TGT-08, TGT-09(test), TGT-11(vendored), TGT-16, TGT-17, DEP-04, DEP-07, DEP-10, DEP-14, DEP-21, INST-19, INST-23, TC-08(E3) | **TC-08: all 6 toolchain files miss `CMAKE_FIND_ROOT_PATH_MODE_PACKAGE`** (real, MUST); DEP-04 one-arg `FetchContent_Populate` (real, gated dead-on-tested-CMake, see note) | TGT-04(1) `CMAKE_REQUIRED_FLAGS` ×1; INST-19 fires on an unrelated dependency-fetch, not a packaging helper | Find*.cmake try-find-then-fetch pattern matches CMK-DEP-07's endorsed shape exactly |
| Tencent/rapidjson | TGT-01, TGT-03, TGT-04(2), TGT-08, TGT-09, TGT-17, TGT-11(test), TGT-05/06 guard, INST-09, INST-24 | **TGT-03, TGT-04(2), TGT-09, TGT-05, TGT-17, INST-09, INST-24 all real MUST/SHOULD findings**; **INST-06: `install(EXPORT RapidJSON-targets)` has no `NAMESPACE` at all** (new, MUST); **live build: configure fails on CMake 4.4.2 under `-Werror=author` with three `install-absolute-destination` errors** (CMK-INST-02/CMK-INST-10, confirmed by execution, not just reading) | none found | — legacy tree behaves exactly as the family's rationale predicts, wall to wall |
| KDE/extra-cmake-modules | TGT-01/03/04/08/09/11/13/19 (module-authoring context), INST-05/06/08/09, TC E1-E4(Android.cmake) | INST-05/06/08 clean on ECM's own package; INST-09 ~50 hits, almost all the project's own documented `LIB_INSTALL_DIR`→`KDE_INSTALL_*` back-compat shim (see note) | TGT-04(1) `CMAKE_REQUIRED_FLAGS` ×3 and 9 self-referencing linker-flag prefixes misfiled as "overwrite"; TC-08 E1-E4 flags `toolchain/Android.cmake` for leaving all four FIND_ROOT_PATH modes unset — but it delegates to the Android NDK's own `android.toolchain.cmake` via `include()`, which sets them (not independently re-measured, see caveat) | — |
| catchorg/Catch2 | TGT-01(test), TGT-04(1), TGT-09(test/tool), TGT-13, TGT-20(fuzz), DEP-01..23(mostly empty) | TGT-13 `CXX_VISIBILITY_PRESET "default"` at `src/CMakeLists.txt:477` — deliberate revert of the class-level default (documented reading, not classified as a violation) | TGT-04(1) `CMAKE_REQUIRED_FLAGS` ×1 (`CMake/Findcodecov.cmake:87`) | CMakePresets.json + 9 CI workflows, no dependency-management or toolchain rows apply |

## False positives, misses and errors

### 1. CMK-TGT-04(1) matches `CMAKE_REQUIRED_FLAGS`, a CMake Check-module probe variable, not a compiler/linker flags variable

- **File:line**: `rules/cmake-build/targets.md:53` (the overwrite cell)
- **Command**: `grep -rniE --include='CMakeLists.txt' --include='*.cmake' -e 'set[[:space:]]*[(][[:space:]]*CMAKE_[A-Z]+_(LINKER_)?FLAGS(_[A-Z]+)?([[:space:]]|[)]|$)' . | grep -viE -e 'FLAGS_INIT' -e 'FLAGS(_[A-Z]+)?[[:space:]]+"?[$][{]CMAKE_'`
- **Repositories hit**: ccache/ccache (`src/third_party/blake3/CMakeLists.txt:77: set(CMAKE_REQUIRED_FLAGS ${compile_flags})`), KDE/extra-cmake-modules (`modules/CheckAtomic.cmake:39,44,54`; two `ECMGenerateExportHeaderTest` fixtures), catchorg/Catch2 (`CMake/Findcodecov.cmake:87: set(CMAKE_REQUIRED_FLAGS "${FLAG}")`) — 3 of 6 repos.
- **What it printed**: 3, 7, and 1 lines respectively, all `set(CMAKE_REQUIRED_FLAGS …)` around a `check_cxx_source_compiles`/`CheckCXXCompilerFlag`-style probe. `[A-Z]+` in the pattern accepts any all-caps word, so `REQUIRED` satisfies the `<LANG>` slot the row's own prose restricts to a real language name.
- **Why it's wrong**: `CMAKE_REQUIRED_FLAGS` governs `Check*` module probes, has no `_INIT` counterpart, and setting/unsetting it around one compile check is the CMake-recommended idiom — the exact opposite of the rule's target (clobbering a toolchain's injected compiler/linker flags).
- **Proposed replacement**: append `-e 'CMAKE_REQUIRED_(LINKER_)?FLAGS'` to both exclusion pipelines (line 1 overwrite and line 2 append).
- **Re-run showing the fix**: with the added exclude, all 11 `CMAKE_REQUIRED_FLAGS` hits across the three repos disappear from both cells; every previously-confirmed true positive (rapidjson's 20 real appends, KDE's 3 real overwrites below) is unaffected.

### 2. CMK-TGT-04(1) misclassifies a prefix-style self-referencing append as a destructive "overwrite"

- **File:line**: `rules/cmake-build/targets.md:53`
- **Command**: same as above.
- **Repository hit**: KDE/extra-cmake-modules, `kde-modules/KDECompilerSettings.cmake:448,449,450,567,568,580,581,787,788` — 9 lines, all shaped `set(CMAKE_SHARED_LINKER_FLAGS "-Wl,--enable-new-dtags ${CMAKE_SHARED_LINKER_FLAGS}")`.
- **What it printed**: 9 lines classified as MUST-severity "overwrite" findings.
- **Why it's wrong**: every one of these lines *preserves* the prior value by self-reference — it prefixes a new flag instead of appending one. The exclusion regex `FLAGS(_[A-Z]+)?[[:space:]]+"?[$][{]CMAKE_` only recognises a self-reference that is the *first* token of the new value (the common `"${CMAKE_CXX_FLAGS} -foo"` suffix shape); it does not recognise `"<literal> ${CMAKE_CXX_FLAGS}"`. These are functionally the row's own SHOULD-severity "append" case, not the MUST-severity "overwrite" case its rationale describes ("drops the toolchain's `_INIT` value") — nothing is dropped here.
- **Proposed replacement**: broaden the overwrite exclusion to catch a self-reference anywhere in the value: add `-e '[$][{]CMAKE_[A-Z]+_(LINKER_)?FLAGS(_[A-Z]+)?[}]'`.
- **Re-run showing the fix**: `grep -rniE --include='CMakeLists.txt' --include='*.cmake' -e 'set[[:space:]]*[(][[:space:]]*CMAKE_[A-Z]+_(LINKER_)?FLAGS(_[A-Z]+)?([[:space:]]|[)]|$)' . | grep -viE -e 'FLAGS_INIT' -e 'CMAKE_REQUIRED_(LINKER_)?FLAGS' -e '[$][{]CMAKE_[A-Z]+_(LINKER_)?FLAGS(_[A-Z]+)?[}]'` run across all six repos: KDE's overwrite-cell count drops from 16 → 0; Catch2 and ccache's `CMAKE_REQUIRED_FLAGS` hits also drop out (issue 1); fmt/yaml-cpp/rapidjson (0 originally) stay 0. The two remaining ccache hits (`cmake/CIBuildType.cmake:10,14`, defining brand-new `CMAKE_EXE_LINKER_FLAGS_CI` / `CMAKE_SHARED_LINKER_FLAGS_CI` from scratch for a project-invented "CI" build type) are a separate, softer case: nothing pre-existing is overwritten (no `_CI` `_INIT` value exists for CMake to seed), but the accompanying `CACHE … FORCE` does reset a user's own `-DCMAKE_CXX_FLAGS_CI=` on every reconfigure — a real but different failure mode than the one CMK-TGT-04's rationale names. Left as a MUST-severity hit under the fixed cell; flagged here so the next drafter can judge it explicitly rather than by accident.

### 3. CMK-INST-19 fires on an ordinary dependency fetch, not a packaging helper

- **File:line**: `rules/cmake-build/install-and-export.md:185` (the pipeline) and row `CMK-INST-19`
- **Command**: `grep -rn --include='*.cmake' -e 'FetchContent_Populate(' -e 'file(DOWNLOAD' .`
- **Repository hit**: ccache/ccache, `cmake/FindZstd.cmake:62: FetchContent_Populate(Zstd)`.
- **What it printed**: one line, read by the row's own text as "Empty output is the pass. A hit inside an install or packaging helper is the finding."
- **Why it's wrong**: ccache never calls `install(EXPORT)`, `write_basic_package_version_file`, or `configure_package_config_file` at all (confirmed: `CMK-INST-05/06/08` greps are empty for this repo, and the only `install(TARGETS)` is a bare executable install). There is no packaging helper in this repository for the hit to be "inside." The line is CMK-DEP-04's dependency-acquisition territory (already correctly flagged there, see the results table) and CMK-INST-19's grep has no scoping — `FetchContent_Populate(`/`file(DOWNLOAD` anywhere in any `.cmake` file lights it up, regardless of whether the file has anything to do with exporting a package.
- **Proposed replacement**: exclude `Find*.cmake` and any file that does not also match `install(EXPORT|PACKAGE_INFO)` / `configure_package_config_file(` / `write_basic_package_version_file(` in the same file, e.g. run the existing grep, then `xargs -r grep -L -e 'install(EXPORT' -e 'install(PACKAGE_INFO' -e 'configure_package_config_file(' -e 'write_basic_package_version_file('` and keep only files that fail that second grep.
- **Re-run showing the fix**: applying the two-stage pipeline to ccache leaves 0 hits (its `FindZstd.cmake` never calls the three packaging commands); rapidjson, fmt, yaml-cpp, Catch2 and KDE-ECM (all 0 originally) are unaffected.

### 4. CMK-TC-08's E1–E4 checks cannot see a mode set by an `include()`-d toolchain

- **File:line**: `rules/cmake-build/toolchains-and-providers.md:149-152` (E1-E4)
- **Command**: e.g. `grep -rliE --include='*.cmake' --exclude='conan_toolchain.cmake' -e 'set[[:space:]]*\([[:space:]]*CMAKE_SYSROOT' -e 'set[[:space:]]*\([[:space:]]*CMAKE_SYSTEM_NAME' . | xargs -r grep -L -e 'CMAKE_FIND_ROOT_PATH_MODE_LIBRARY'`
- **Repository hit**: KDE/extra-cmake-modules, `toolchain/Android.cmake`, flagged on E1/E2/E3/E4 (all four modes "missing").
- **What it printed**: the one file name, four times.
- **Why it's plausibly wrong**: the file sets `CMAKE_SYSTEM_NAME Android` (line 181) then, at line 216, `include(${CMAKE_ANDROID_NDK}/build/cmake/android.toolchain.cmake REQUIRED)` — delegating to the Android NDK's own, externally maintained toolchain file, which (per Google's NDK documentation) sets all four `CMAKE_FIND_ROOT_PATH_MODE_*` variables itself. The row already special-cases exactly this shape for `conan_toolchain.cmake` ("The excludes keep a generated conan_toolchain.cmake out of E1 to E6, where it is expected to match") but does not generalize the exclusion to any other delegated/included toolchain.
- **Caveat**: no Android NDK is installed on this host, so `android.toolchain.cmake`'s actual content was not fetched and measured this wave — this is a **plausible**, not confirmed, false positive, argued from the `include()` line and NDK's public docs rather than from reading the delegated file.
- **Proposed replacement**: before flagging a file in E1-E4, `grep -l 'include(' <file>` and read whether the included path names a well-known external toolchain (NDK's `android.toolchain.cmake`, `emscripten`'s `Emscripten.cmake`) before treating the four-mode absence as a finding — or add those paths to the existing `--exclude` alongside `conan_toolchain.cmake`.

## Candidate new failure modes

1. **A hand-rolled `*ConfigVersion.cmake.in` that implements the version-file protocol correctly passes CMK-INST-04's behavioral check while still violating its MUST text.** rapidjson's `RapidJSONConfigVersion.cmake.in` sets `PACKAGE_VERSION`/`PACKAGE_VERSION_COMPATIBLE`/`PACKAGE_VERSION_EXACT` by hand instead of calling `write_basic_package_version_file()`, and does so correctly enough that `find_package(RapidJSON <ver>)` would succeed. CMK-INST-04's only Verification is "Step (d)'s `find_package($PKG $VER …)` fails with 'version: unknown'" — a hand-rolled-but-working file never produces that failure, so the round trip reports a clean pass on code that textually violates the MUST rule. CMK-INST-05 already has the two-part fix for the analogous problem ("list the templates … and the calls … a listed template named in no call is the finding"); CMK-INST-04 needs the same treatment: list every `*ConfigVersion.cmake.in`/similarly-named file and cross-reference which are produced by `write_basic_package_version_file` vs. hand-authored.
2. **CMK-INST-02/CMK-INST-10's absolute-destination defect reproduces live, at scale, on a widely-used real library, purely from the pinned CMake ≥ 4.4 gate — no reading needed.** `roundtrip-rapidjson.sh`, configure step, CMake 4.4.2, `-Werror=author`: three separate `install-absolute-destination` errors (`CMakeLists.txt:200,204,256`), because `INCLUDE_INSTALL_DIR`/`DOC_INSTALL_DIR`/`CMAKECONFIG_INSTALL_DIR` are all built by concatenating `${CMAKE_INSTALL_PREFIX}` (CMK-INST-09's antipattern feeding CMK-INST-10's antipattern). This is not a new rule — both MUST rows already exist and already cite rapidjson — but it is the wave's first *executed*, not merely read, confirmation of the mechanism on a fresh 2026-09-26 clone, and it demonstrates that CMK-INST-10's gate does the intended job unassisted (exit 1, no reading required).
3. **CMK-INST-06 has an un-namespaced real-world example beyond the one already cited.** `install(EXPORT RapidJSON-targets DESTINATION ${CMAKE_INSTALL_DIR})` in rapidjson carries no `NAMESPACE` at all (the file contains zero occurrences of the word), so the installed `RapidJSON-targets.cmake` would define a bare `RapidJSON` target. Worth adding as a second citation next to the existing NAMESPACE-rename example, since it shows the *simpler*, more common failure (never had a namespace, vs. renaming into one).
4. **An application repo swept with `targets.md`'s library-shaped severity table has no third bucket.** CMK-TGT-01/03/10/11/13/21 all grade a hit as MUST (library) or SHOULD (test/example); ccache is a top-level application, never `add_subdirectory`-ed, never installed as a dependency — its `link_libraries()` directory-scope call (CMK-TGT-03) and its `target_include_directories(ccache_framework PUBLIC ${CMAKE_BINARY_DIR} …)` (CMK-TGT-21) are real grep hits whose rationale (leaking into a parent project or an install-tree consumer) does not obviously apply to a binary that is never consumed by anyone else's CMake. Not proposing a rule change — flagging that the reading heuristic gives no guidance for this very common repo shape, so two different agents will triage it two different ways.
5. **CMK-INST-09's back-compat-shim exception has no reading heuristic of its own, and a "ships CMake modules for others" repo can produce 50+ hits that are almost all exempt.** KDE/extra-cmake-modules' `kde-modules/KDEInstallDirsCommon.cmake` and friends implement a documented `LIB_INSTALL_DIR`/`INCLUDE_INSTALL_DIR`/`SYSCONF_INSTALL_DIR`/`SHARE_INSTALL_PREFIX` → `KDE_INSTALL_*` compatibility layer for consumers migrating off the legacy names — exactly the carve-out CMK-INST-09's Verification text already grants ("unless it is a documented back-compat shim that only reads GNUInstallDirs"), but the cell offers no way to pre-filter for it. A drafter or agent reading the raw 50-line hit list with no triage aid will either spend real time re-deriving "this file is a compat shim" once per hit, or (worse) stop reading partway through and miss the small number of genuine hits mixed in (`ECMGeneratePkgConfigFile.cmake`'s own default fallback logic reads these names too, and is worth a second look). Candidate refinement: add a second-pass filter — e.g. `xargs -r grep -L 'GNUInstallDirs\|KDE_INSTALL_'` — to separate probable shims from probable genuine hard-codes before a human reads anything.
6. **CMK-DEP-04's one-argument `FetchContent_Populate` has no carve-out for a call that is dead on every CMake version the row itself measures.** ccache's `cmake/FindZstd.cmake:62` calls it only inside `if(CMAKE_VERSION VERSION_LESS "3.28")`, with `FetchContent_MakeAvailable` used on every newer version — including every version this rule family tests (3.31.12 through 4.4.2). The line is real, deprecated, and correctly matched, but unreachable under the pinned floor. Not proposing to drop the SHOULD finding — proposing the rationale note this shape explicitly, since "gated behind a CMake-version check that is always false on the tested floor" is a materially different risk than a live call.

## Candidate new MUST rows

None. Every hit this wave that survived reading was an existing MUST or SHOULD row firing correctly (rapidjson's TGT-03/04/09/05/17/INST-09/24/06, ccache's TC-08), or a defect in a verification cell rather than a gap in rule coverage. No new rule text is proposed — issues 1-4 above under "False positives, misses and errors" are cell-shape fixes to existing rows, and candidate 1/5/6 above are refinements to existing rows' Verification columns, not new IDs.

## Cells not exercised as builds this wave (honest gap, not a finding)

CMK-TGT-12/14/18 (compile_commands.json / `-DCMAKE_LINK_LIBRARIES_ONLY_TARGETS=ON` / ninja module-scan grep), the CMK-INST-01 round trip on fmt/yaml-cpp/Catch2, the CMK-INST-21/22 multi-config leg, CMK-DEP-07's consumer probe, CMK-DEP-16's `unshare -rn` offline probe, and CMK-TC-04's C3 marker-provider probe all need per-repo build scaffolding (SYM_DECL/SYM_CALL, a second build tree, or a network-namespace probe) that this sweep's time budget did not cover for all six repositories. The one build-based cell that was run end to end (rapidjson's CMK-INST-01 round trip, configure through install) produced a real, decisive result (finding 2 above) rather than a clean pass, so the round trip's value on a real tree is independently demonstrated even though the full six-repo matrix was not completed.

## Wave 6 applied (2026-09-26)

Applier scratch: `/home/mherwig/.cache/cmake-measure-scratch/w6/sweep-b/apply/` (`run.sh` reproduces every number below, output in `run.log`; `tgt04-cells.sh`, `tgt04-fixture/`, `inst04/`, `custom-config/`, `android-fake/`). CMake 3.31.12 and 4.4.2 via `ocx package exec kitware/cmake:{3.31,4.4}`, Ninja 1.13.2. Small `LANGUAGES NONE` build trees were left in place because `rm -rf` was denied in this session.

### Spot-checks (all three reproduced)

1. **CMK-TGT-04(1) false positives.** Old line (1) counts re-run: KDE-ECM 16, ccache 4, Catch2 1, fmt/yaml-cpp/rapidjson 0 (matches the ledger). The 19 lines removed by the fix are 10 `CMAKE_REQUIRED_FLAGS` probe lines (including ccache's `unset(CMAKE_REQUIRED_FLAGS)`, which the unanchored `set` pattern also matched) and KDE's 9 prefix appends. ccache's two `_CI` linker lines remain.
2. **CMK-INST-19 on ccache.** Shipped grep prints `./cmake/FindZstd.cmake:62: FetchContent_Populate(Zstd)`, exit 0, and ccache has no packaging command (grep exit 1). Reproduced.
3. **rapidjson live configure.** `roundtrip-rapidjson.sh`, CMake 4.4.2, `-Werror=author`: `configure exit=1`, three `install-absolute-destination` errors at `CMakeLists.txt:200,204,256`. Reproduced. The same log also has a CMP0175 policy error at `CMakeLists.txt:165` (`add_custom_command`), which the ledger did not mention. It belongs to CMK-VER, not to this topic.

### Changed (existing rows, IDs kept)

- **CMK-TGT-04** (`targets.md`, Global Flags section). (a) Line (1)'s second exclusion is now `[(][[:space:]]*CMAKE_REQUIRED_FLAGS` plus a self-reference anywhere in the value (`[$][{]CMAKE_[A-Z]+_(LINKER_)?FLAGS(_[A-Z]+)?[}]`), which replaces the first-token-only form. Line (2) now matches a `CMAKE_*_FLAGS` reference anywhere in the value, so prefix appends move from (1) to (2) instead of dropping out, and it drops `CMAKE_REQUIRED_FLAGS` and `_FLAGS_INIT` setters. Planted fixture: `set(CMAKE_C_FLAGS "-O2")` and `SET(CMAKE_SHARED_LINKER_FLAGS …)` print in (1). The suffix append, the prefix append, `string(APPEND …)` and `set(CMAKE_C_FLAGS_RELEASE "${CMAKE_C_FLAGS} -O3")` print in (2). Three `CMAKE_REQUIRED_FLAGS` forms and a `_FLAGS_INIT` print in neither. Old versus new line (2) is identical on ccache, Catch2 and rapidjson. On KDE-ECM it gains the 9 prefix lines and loses one `CMAKE_REQUIRED_FLAGS` line. The Verification cell now covers the ccache `_CI` case: a project-defined configuration's flags pass without `FORCE`. With `CACHE … FORCE` they are a SHOULD finding, measured: `-DCMAKE_C_FLAGS_CI=-O0 -user` prints `CI=[-O2 -g]` on 3.31.12 and 4.4.2.
- **CMK-INST-04** (`install-and-export.md`). (a) Measured the ledger's candidate 1, which it argued from reading. rapidjson's `RapidJSONConfigVersion.cmake.in` configured to 1.1.0 accepts `find_package(Foo 1.0...<1.1 CONFIG REQUIRED)` (exit 0 on 3.31.12 and 4.4.2), and a `write_basic_package_version_file(… SameMajorVersion ARCH_INDEPENDENT)` file rejects it (exit 1). Both accept `1.1` and `1.0`, and both reject `2.0`. The round trip therefore passes a hand-written file. Added the measured reason to the Rationale and a listing grep to the Verification: `grep -rl --include='*.in' --include='*ConfigVersion.cmake' --include='*-config-version.cmake' --exclude-dir='build*' --exclude-dir='_deps' -e 'PACKAGE_VERSION_COMPATIBLE' .` It lists only rapidjson's template on the six repos (exit 1 on the other five). Across the exemplar corpus it also lists hand-written templates in duckdb, gflags, llvm-project, nlohmann/json, openssl, protobuf, qtbase and two vcpkg ports, plus Kitware/CMake's own `BasicConfigVersion-*.cmake.in`, which is expected. Only gflags and qtbase read `PACKAGE_FIND_VERSION_RANGE` or `_MAX`.
- **CMK-INST-10** (`install-and-export.md`). (e) Added the executed rapidjson result (4.4.2, `-Werror=author`, exit 1, three errors at lines 200, 204, 256) beside the documented diagnostic. CMK-INST-02's "rapidjson ships a non-relocatable package" stays read-only: an ungated install to reach step (b) failed because the blob-less sparse clone lacks non-code files (`readme.md`, examples).
- **CMK-INST-19** (`install-and-export.md`). (a) Added `--exclude='Find*.cmake'` and a line that sends dependency fetchers (`CPM.cmake`) to CMK-DEP. ccache now prints nothing (exit 1). cpp-best-practices/cmake_template@b86318a still prints `cmake/PackageProject.cmake:179` (the row's motivating hit) and `cmake/CPM.cmake:19`.
- **CMK-TC-08 / CMK-TC-09** (`toolchains-and-providers.md`). (a) + (e) Turned the ledger's plausible-but-unmeasured finding 4 into a measurement, with a different mechanism than the ledger proposed. CMake's own `Platform/Android-Initialize.cmake` (identical on 3.31.12 through 4.4.2) sets the four modes to NEVER/ONLY/ONLY/ONLY when they are undefined, for `CMAKE_SYSTEM_NAME Android`, a `CMAKE_SYSTEM_VERSION` other than 1 and an NDK with the unified `toolchains/llvm/prebuilt/<host>/sysroot`. A stub NDK (`source.properties`, `platforms/android-24`, the unified sysroot directory) printed all four modes on 3.31.12 and 4.4.2. With the sysroot removed, and for a `Linux` + `CMAKE_SYSROOT` toolchain, all four were empty. KDE-ECM's `toolchain/Android.cmake` sets `CMAKE_SYSTEM_VERSION ${CMAKE_ANDROID_API}`, so it passes. `Platform/Darwin.cmake` sets LIBRARY/INCLUDE/PACKAGE `ONLY` for iOS/tvOS/visionOS/watchOS. That was read at 4.4.2 and not run (no Xcode). TC-08's rationale "all three behave as BOTH" is now scoped to other platforms, and TC-09's E4 cell names the Android exception.

### Added

- **Failure mode 15** in `install-and-export.md`: keeping or copying a hand-written `ConfigVersion.cmake.in` because the round trip passes. It ignores range upper bounds (measured above).
- No new MUST row.

### Rejected

- Candidate 1 as proposed ("cross-reference which files wbpvf produces"): superseded by the simpler listing grep above, because a hand-written template is what matters.
- Candidate 2 as a new failure mode: it is a measurement for existing rows, applied to CMK-INST-10 under (e), not a new agent mistake.
- Candidate 3 (a second NAMESPACE citation for CMK-INST-06): a restatement. The row already fires correctly and has a measured example. A citation adds no rule content.
- Candidate 4 (no severity bucket for applications): the rows already scope themselves. CMK-TGT-03 says "In a library you author or modernise", and CMK-TGT-21 says "A library others consume". ccache's hits are out of scope by the row text.
- Candidate 5 (INST-09 shim pre-filter `xargs -r grep -L 'GNUInstallDirs\|KDE_INSTALL_'`): it is a lossy filter on a MUST grep. A file that includes `GNUInstallDirs` and still writes `DESTINATION lib` would vanish. It also uses `\|` (section 7) and names one project's variables.
- Candidate 6 (DEP-04 carve-out for a call gated behind `CMAKE_VERSION VERSION_LESS "3.28"`): the pinned floor is 3.25, not the 3.31.12 measurement line, so that branch runs on 3.25 to 3.27. ccache's own floor is 3.18. The call is live, and the SHOULD stands.
- Finding 3's proposed fix (keep only files that also call `CMakePackageConfigHelpers`): measured to drop cmake_template's `PackageProject.cmake`, the row's own true positive (`xargs` exit 123, no output), because that helper packages through fetched ycm (`install_basic_package_files`), not through `write_basic_package_version_file`. Replaced by the `Find*.cmake` exclude.
- Finding 4's proposed fix (extend `--exclude` to named external toolchains): the pass comes from CMake's platform module, not from the included NDK file, so a file-name exclude would be the wrong mechanism. Replaced by the Verification rule above.

### Handbacks

None.

---
title: "The Bazel seam and dual builds — consolidated"
topic: "The CMake side of the Bazel seam: what a CMake project owes rules_foreign_cc, how dual CMake+Bazel builds stay in step, and what Conan and vcpkg offer across the seam"
model: opus
id_family: CMK-BZL
consolidates:
  - cmake-bazel-seam/wrappable-cmake-contract.md
  - cmake-bazel-seam/dual-build-sync-and-conan-bazel.md
also_read:
  - cmake-frame.md (every Corrections block)
  - cmake-topic-map/era-recheck-2026-09-26.md
  - cmake-topic-map.md (conflicts 1, 19, 20; group K rows M-K-01..08; M-E-09, M-F-02, M-G-18, M-H-01; Artifact set decision)
  - cmake-audit/exemplar-deps-and-dual-build.md
  - cmake-audit/fleet-inventory-and-bazel-overlap.md
  - cmake-audit/find-ocx-cmake-shape-and-contracts.md
  - cmake-audit/exemplar-cmake-shape.md
  - ../../rules/bazel-quality/cpp.md (BZL-CC-22, -23, -24, -28)
measurements: cmake-bazel-seam/scratch/bzl-consolidate/measure.sh (M1-M8, CMake 3.31.12 and 4.4.2, gcc 15.2.1, 2026-09-26)
date: 2026-09-26
verified: 2026-09-26
verification: cmake-bazel-seam/verification-wave2.md
---

# The Bazel seam and dual builds (CMK-BZL)

Contents: [Verdict](#verdict) · [The ruleset](#the-ruleset) ·
[Applied to find_ocx and the exemplars](#applied-to-find_ocx-and-the-exemplars) ·
[AI-agent failure modes](#ai-agent-failure-modes) ·
[Open questions](#open-questions) · [Sub-artifacts](#sub-artifacts) ·
[Key sources](#key-sources) · [Conflicts resolved](#conflicts-resolved) ·
[Measurements added by this consolidation](#measurements-added-by-this-consolidation) ·
[Revision log](#revision-log)

## Verdict

1. **The wrapped project's contract is one Bazel-free simulation, and it binds the *library shipping a package* that a Bazel user may wrap.** Configure under `unshare -rn` with a caller toolchain file and only `-D` cache entries. Then build with `-j`, install to a fresh prefix, and read the listing. Five MUST rules fall out of that one script (CMK-BZL-01..05). The Bazel half of the contract stays with `BZL-CC-22/23/24/28`, cited and never restated.
2. **A PIC failure inside the wrap comes from the project overwriting the flags it was handed, not from a missing `CMAKE_POSITION_INDEPENDENT_CODE`.** This was measured on 3.31.12 and 4.4.2. A hard-coded `set(CMAKE_POSITION_INDEPENDENT_CODE OFF)` does not block a flag-delivered `-fPIC`. A plain `set(CMAKE_C_FLAGS "-O2")` throws away the toolchain's `_INIT` seed, and the link fails. This overturns the dive's PIC rule and its "adds to, not replaces" claim.
3. **The CMake that runs inside the wrap is rules_foreign_cc's, not the host's.** At 0.16.0 (tag commit `931cb33cf8`, 2026-09-15; the same values re-read at main `bb2f3e5d72`, 2026-09-23) the default is 3.31.12 and the ceiling is 4.0.7. 0.16.0 changed only how the tool is registered, not which versions it offers. So a project wrapped by others keeps its floor at or below the wrapper's CMake. It also guards CPS and every other ≥ 4.1 feature, and always ships the CMake-script Config package (CMK-BZL-08). This binds the *library shipping a package*. The *Bazel-wrapped dependency* author either picks a CMake in `MODULE.bazel` or accepts that ceiling.
4. **Dual builds: CI that builds *and tests* both descriptions is SHOULD, not MUST.** Two healthy, actively maintained repos (zlib, nlohmann/json) ship Bazel files with no Bazel build or test in CI. A MUST would flag projects that are working. The strongest sync pattern is protobuf's: generate the CMake pins from `MODULE.bazel` and run the staleness test in CI. The dive said that CI wiring was unconfirmed. This consolidation measured it as a daily job plus a post-submit regeneration.
5. **Agent behaviour at the seam is where the MUSTs are.** Before calling a repo "no sync", read CI outside `.github/workflows`. Before building a drift finding on a generated file, read its generator. Report "not knowable" when the CMake side has no version token. Never guess a Bazel label from a CMake target name, because 6 of 8 measured pairs differ.
6. **Conan reaches Bazel under Bzlmod; vcpkg does not reach Bazel at all.** From Conan 2.30.0 through 2.32.0, `BazelDeps` writes `conan_deps.MODULE.bazel`, and the root module pulls it in with `include()`. That works only for the root module, so a library published to the BCR cannot use it (SHOULD, zero adopters). vcpkg has no Bazel generator (MUST negative). This binds the *application consuming packages*.
7. **"CMake plus a package manager, or Bazel?" (M-K-07) is a decision branch, not a rule.** Cite `BZL-CC-24` (rules_foreign_cc is for third-party code you will not port) and stop there.
8. **What goes back to `bazel-quality`:** proposed as a patch its owner applies, never an edit by this program.
   - A pointer line: "The wrapped project's side of this contract is `CMK-BZL` in `cmake-build/bazel-seam.md`."
   - The CPS negative.
   - Two caller-side facts that have no BZL-CC home yet: `build_args` `-j` ([#329](https://github.com/bazel-contrib/rules_foreign_cc/issues/329)) and sandbox-symlinked installs ([#1129](https://github.com/bazel-contrib/rules_foreign_cc/issues/1129)).

## The ruleset

Fifteen rules: 10 MUST, 5 SHOULD. Ruleset floor is CMake 3.25 (topic-map conflict 1). The version cell names any stricter gate. Commands run from the project root. `unshare -rn` needs unprivileged user namespaces on Linux; see Open questions for CI runners. **The dive-local IDs (`CMK-BZL-01..10` in `wrappable-cmake-contract.md`, unnumbered candidates in `dual-build-sync-and-conan-bazel.md`) are superseded by the numbering below.**

### CMK-BZL — A. The wrap simulation (one script catches all five)

Binds: a library shipping a package that anyone may wrap with `rules_foreign_cc`'s `cmake()`. The simulation, all five rules at once:

```sh
# wrap-toolchain.cmake stands in for rules_foreign_cc's synthesised crosstool file
# no FETCHCONTENT_FULLY_DISCONNECTED here: the wrapper does not pass it, and it masks fetches
printf 'set(CMAKE_C_FLAGS_INIT "-fPIC -DWRAP_SEED=1")\nset(CMAKE_CXX_FLAGS_INIT "-fPIC -DWRAP_SEED=1")\nmessage(STATUS "CALLER_TOOLCHAIN_LOADED")\n' >wrap-toolchain.cmake
unshare -rn cmake -S . -B build-wrap -DCMAKE_TOOLCHAIN_FILE="$PWD/wrap-toolchain.cmake" \
  -DCMAKE_INSTALL_PREFIX="$PWD/wrap-prefix" -DCMAKE_EXPORT_COMPILE_COMMANDS=ON \
  -DBUILD_SHARED_LIBS=OFF 2>&1 | tee wrap-configure.log
unshare -rn cmake --build build-wrap -j 4
cmake --install build-wrap
find wrap-prefix -type f -o -type l | sort >wrap-listing.txt
```

**CMK-BZL-01 — Make configure, build and install succeed with no network, given only `-D` cache entries.** Give every fetch a cache-entry route to a local copy: `FETCHCONTENT_SOURCE_DIR_<NAME>`, `FETCHCONTENT_TRY_FIND_PACKAGE_MODE` or `FIND_PACKAGE_ARGS` (3.24), or a project option that turns the fetch off. `FETCHCONTENT_FULLY_DISCONNECTED=ON` is not a route on its own: it only skips population, so pair it with `FETCHCONTENT_SOURCE_DIR_<NAME>` or never use it.
- Rationale: `cmake()` runs configure+build+install as one action with `block-network` unless the target is tagged `requires-network` (`rules_foreign_cc@bb2f3e5d72:foreign_cc/private/framework.bzl:589-591`, identical at tag 0.16.0 `931cb33cf8`). Measured: a `FetchContent` git fetch fails at *configure* under `unshare -rn`, and `-DFETCHCONTENT_SOURCE_DIR_DEP=<local>` passes (M8, 3.31.12 and 4.4.2). Measured (verify wave 2, M8b/M8c): `FETCHCONTENT_FULLY_DISCONNECTED=ON` with nothing populated only *warns* and configures with the dependency silently absent under a policy version below 3.30 (CMP0170 OLD), and is a fatal error at 3.30 or higher (CMP0170 NEW), on 3.31.12 and 4.4.2.
- Verification: run the simulation *without* `FETCHCONTENT_FULLY_DISCONNECTED`. "Configuring done", a finished build and a finished install = pass. `Failed to clone`, `Could not resolve host`, any download error, or `FETCHCONTENT_FULLY_DISCONNECTED is set to true` in `wrap-configure.log` = finding (planted FetchContent: red on 3.31.12 and 4.4.2; the same plant *with* `-DFETCHCONTENT_FULLY_DISCONNECTED=ON` configured, built and installed green, so never add that entry to the probe run). To enumerate what needs a switch (the general rule is M-G-18, family CMK-DEP; cite it, do not restate it): `grep -rn -e 'FetchContent_MakeAvailable' -e 'file(DOWNLOAD' -e 'ExternalProject_Add' -e 'CPMAddPackage' -e 'HunterGate' -e 'SET_DEPENDENCY_PROVIDER' --include='*.cmake' --include='CMakeLists.txt' .`. This is a union. Empty = nothing to switch. Each hit needs a named cache entry that disables it.
- Severity: **MUST** (measured and normative).
- Version: any. `FIND_PACKAGE_ARGS` needs ≥ 3.24; rules_foreign_cc ≥ 0.16.0.

**CMK-BZL-02 — Honour a caller-supplied `CMAKE_TOOLCHAIN_FILE`.** Never `set(CMAKE_TOOLCHAIN_FILE …)` as a normal variable, and never with `CACHE … FORCE` or `CACHE INTERNAL`, unless one of two conditions holds. Either it sits inside `if(NOT DEFINED CMAKE_TOOLCHAIN_FILE)`, or it first chainloads the supplied path, for example into `VCPKG_CHAINLOAD_TOOLCHAIN_FILE`.
- Rationale: a caller-supplied `CMAKE_TOOLCHAIN_FILE` suppresses crosstool synthesis (`foreign_cc/cmake.bzl:210`), so the caller's file carries the whole compiler setup. Measured: a normal `set(CMAKE_TOOLCHAIN_FILE …)` before `project()` silently wins over `-DCMAKE_TOOLCHAIN_FILE`, with no warning, on 3.31.12 and 4.4.2 (M2). The vcpkg, Conan and cross-toolchain composition question is M-H-01, family CMK-TC.
- Verification: `grep -rn -i -e 'set(CMAKE_TOOLCHAIN_FILE' -e 'set (CMAKE_TOOLCHAIN_FILE' --include='*.cmake' --include='CMakeLists.txt' .`. `-i` because CMake command names are case-insensitive (`SET(` is legal and occurs in the corpus). Empty = pass. A hit with no `NOT DEFINED` guard and no chainload in the lines above it = finding. Behavioural check: the simulation's configure output contains `CALLER_TOOLCHAIN_LOADED`. Absent = finding.
- Severity: **MUST** (measured).
- Version: any (measured 3.31.12, 4.4.2).

**CMK-BZL-03 — Never overwrite `CMAKE_<LANG>_FLAGS`, `CMAKE_<LANG>_FLAGS_<CONFIG>` or `CMAKE_<KIND>_LINKER_FLAGS`.** Put project flags on targets with `target_compile_options` or `add_compile_options`, or append to the incoming value. Never make PIC depend on `CMAKE_POSITION_INDEPENDENT_CODE`.
- Rationale: the wrapper passes compiler, PIC and sysroot flags only as `CMAKE_*_FLAGS_INIT` seeds (`foreign_cc/private/cmake_script.bzl:259-312`). PIC arrives as a flag since 0.16.0 ([PR #1440](https://github.com/bazel-contrib/rules_foreign_cc/pull/1440)).
  - Measured: `set(CMAKE_C_FLAGS "-O2")` discards an `_INIT` `-fPIC`, and the shared link fails with `relocation R_X86_64_32 … recompile with -fPIC` (M6).
  - Measured: `set(CMAKE_POSITION_INDEPENDENT_CODE OFF)` plus flag-delivered `-fPIC` links cleanly (M5). Both on 3.31.12 and 4.4.2.
- Verification: `grep -rn -i -F -e 'set(CMAKE_C_FLAGS' -e 'set(CMAKE_CXX_FLAGS' -e 'set(CMAKE_EXE_LINKER_FLAGS' -e 'set(CMAKE_SHARED_LINKER_FLAGS' -e 'set(CMAKE_STATIC_LINKER_FLAGS' -e 'set(CMAKE_MODULE_LINKER_FLAGS' --include='*.cmake' --include='CMakeLists.txt' --exclude='wrap-toolchain.cmake' --exclude-dir='build-wrap' --exclude-dir='wrap-prefix' .`. `-i` catches `SET(` (42 such lines for these variables in the corpus, Kitware CMake and LLVM); the excludes keep the simulation's own toolchain file out. Empty = pass. A `…_FLAGS_INIT` hit in a toolchain file is the correct channel, not a finding. Any other hit whose value does not start with the same variable's own `${…}` = finding. Behavioural check: `grep -c -e 'WRAP_SEED' build-wrap/compile_commands.json`. `0` = finding (the seed was dropped).
- Severity: **MUST** (measured).
- Version: any. `CMAKE_EXPORT_COMPILE_COMMANDS` is Makefile and Ninja generators only.

**CMK-BZL-04 — Keep every `install()` `DESTINATION` relative to the install prefix.** Use `GNUInstallDirs` variables. Never use `/abs/path`, and never use `${CMAKE_INSTALL_PREFIX}/…`.
- Rationale: `cmake()` installs into a Bazel-managed output tree. An absolute destination writes outside it, so nothing is ever declared as an output. CMake 4.4 has a dedicated diagnostic for this, `CMD_INSTALL_ABSOLUTE_DESTINATION`. Its default is `ignore`, so it stays silent unless asked (`cmake --help-manual cmake-diagnostics`, 4.4.2).
- Verification, on 4.4: `cmake -S . -B build-abs -Werror=install-absolute-destination`. `CMake Error (install-absolute-destination)` = finding (measured, M4). It also fires on `DESTINATION ${CMAKE_INSTALL_PREFIX}/…`, because it checks the expanded path (measured, M4x). On ≤ 4.3 the same flag is accepted *silently* (measured on 4.3.4: exit 0, no warning), so a green run there proves nothing; grep instead: `grep -rn -e 'DESTINATION /' -e 'DESTINATION "/' -e 'DESTINATION ${CMAKE_INSTALL_PREFIX}' -e 'DESTINATION "${CMAKE_INSTALL_PREFIX}' --include='*.cmake' --include='CMakeLists.txt' --exclude='cmake_install.cmake' --exclude-dir='build-wrap' --exclude-dir='wrap-prefix' .`. The excludes matter: every generated `cmake_install.cmake` contains `DESTINATION "${CMAKE_INSTALL_PREFIX}/…"`, so without them any configured build tree inside the source tree reads red. Empty = pass.
- Severity: **MUST** (normative diagnostic plus measured).
- Version: the diagnostic needs 4.4. The grep works on any version.

**CMK-BZL-05 — Install to a fresh prefix and check two things.** First, every file sits at a stable name under `include/`, `lib/` or `bin/` that the wrapping `out_*` attributes can name. Second, no installed `*Config.cmake`, `*Targets*.cmake` or `.pc` file contains the source, build or install path.
- Rationale: a produced file that no attribute names never becomes a Bazel output, and no error reports it (`BZL-CC-23` owns that side). The sandbox path disappears after the action, so an embedded absolute path breaks every consumer. The relocation standard itself is M-F-02, family CMK-INST; this rule adds only the "diff against the declared names" step.
- Verification: `grep -rn -e "$PWD" wrap-prefix`. Empty = pass. This was measured empty for a `configure_package_config_file` package in the dive's Finding 4. Then diff `wrap-listing.txt` by hand against the `out_*` names the wrapping `BUILD.bazel` declares, or would need to declare. Identical = pass. A name in only one list = finding.
- Severity: **MUST** (measured, plus normative rule source).
- Version: any. `configure_package_config_file` needs ≥ 3.0.

**CMK-BZL-06 — Install real files, not symlinks.** Resolve sources through `file(REAL_PATH)` (3.19), or `get_filename_component(… REALPATH)` below 3.19, before `install(FILES)` or `install(DIRECTORY)` of headers and data.
- Rationale: measured on 3.31.12 and 4.4.2, `install(FILES)` and `install(DIRECTORY)` copy a symlinked source *as a symlink*. From a `cp -rs` symlink farm, which stands in for Bazel's sandbox, the installed header is an absolute link to the farm entry's target (the original source file), which lies outside the install prefix. A `file(REAL_PATH)` source installs a regular file (M3, M7). This matches rules_foreign_cc [#1129](https://github.com/bazel-contrib/rules_foreign_cc/issues/1129) ("invalid symlink" in the TreeArtifact), still open 2026-09-26. The Bazel-side trigger comes only from the issue report and was not measured under Bazel, hence SHOULD.
- Verification: `cp -rs "$PWD" ../wrap-farm`, then configure and install from `../wrap-farm` to a new prefix, then `find ../wrap-farm-prefix -type l -lname '/*'`. Empty = pass. Any line = finding. The relative namelinks that `install(TARGETS)` makes for shared libraries stay inside the prefix and are not findings.
- Severity: **SHOULD**.
- Version: `file(REAL_PATH)` needs ≥ 3.19.

**CMK-BZL-07 — Choose static or shared through a cache entry.** Use `BUILD_SHARED_LIBS` or a documented `option()`, such as zlib-style build-static and build-shared switches. Never hard-code the type on the library a wrapper will consume.
- Rationale: `cache_entries` is the only channel `cmake()` has into the project (`foreign_cc/cmake.bzl:366-373`). A hard-coded type turns the choice between `out_static_libs` and `out_shared_libs` into source-reading. Only the rule's own source supports this, not a measured failure, hence SHOULD. The corpus has 1,284 `BUILD_SHARED_LIBS` references ([shape] §7).
- Verification: reading heuristic. For each exported target, check that its `add_library(… STATIC)` or `add_library(… SHARED)` is guarded by, or chosen from, a cache variable. `grep -rn -e 'BUILD_SHARED_LIBS' --include='*.cmake' --include='CMakeLists.txt' .` empty, while an exported target hard-codes its type with no `option()` switch = finding.
- Severity: **SHOULD**.
- Version: any.

### CMK-BZL — B. The CMake the wrapper runs

**CMK-BZL-08 — Keep `cmake_minimum_required`'s lower bound at or below the CMake the wrapper provisions.** At rules_foreign_cc 0.16.0 that is a default of 3.31.12, from a prebuilt table of 3.19.8 to 4.0.7. Guard every feature newer than that bound with `if(CMAKE_VERSION VERSION_GREATER_EQUAL x.y)`, CPS (`install(PACKAGE_INFO)`, 4.3) included. Always ship the CMake-script Config package beside CPS.
- Rationale: `DEFAULT_TOOL_VERSIONS["cmake"] = "3.31.12"` (`foreign_cc/repositories.bzl:19`). `tools.cmake(mode = "binary", version = "3.31.12")` (`MODULE.bazel:73-76`). The generated version table stops at `4.0.7` (`toolchains/private/cmake_versions.bzl`), all re-read at main `bb2f3e5d72` and again, identical, at the 0.16.0 tag commit `931cb33cf8` (verify wave 2). Measured: a `VERSION 4.1` floor fails on 3.31.12 with "CMake 4.1 or higher is required" (M1b). A guarded `install(PACKAGE_INFO)` is skipped on 3.31.12 and emitted on 4.4.2 (M1). Kitware's own advice is to ship CPS *in addition to* Config files (frame, CPS mini-wave result).
- Verification:
  - Read the lower bound of `cmake_minimum_required`, then the consumer's `grep -rn -e 'tools.cmake' -e 'cmake_version' --include='MODULE.bazel' --include='WORKSPACE*' .`. Empty = the default applies (3.31.12 at 0.16.0). A lower bound above the provisioned version = finding.
  - Run `grep -rn -e 'install(PACKAGE_INFO' -e 'export(PACKAGE_INFO' --include='*.cmake' --include='CMakeLists.txt' .`. Each hit must sit inside a `CMAKE_VERSION` guard, next to an `install(EXPORT)` Config package. An unguarded hit = finding. Empty = pass.
- Severity: **MUST** (measured plus rule source).
- Version: rules_foreign_cc 0.16.0 (2026-09-15). Re-read the version table at each release.

### CMK-BZL — C. Dual CMake+Bazel builds

Binds: a project that maintains both descriptions, and every agent that reports on one.

**CMK-BZL-09 — Build and test both descriptions in CI on the same trigger.** A job that only builds one side is *partial* sync. Report it as partial, never as "tested".
- Rationale: of 11 dual repos, 7 build and test both: re2, benchmark, protobuf and yaml-cpp through GitHub Actions (yaml-cpp's `build.yml:128-164` runs `bazel test` in `bazel-build` and `bzlmod-build` jobs on push and pull request; the dual dive missed them); abseil, googletest and grpc through Kokoro `ci/` or `tools/internal_ci/` scripts. Catch2 and gflags only build the Bazel side. zlib and nlohmann/json never build or test Bazel in CI (dual dive §2, corrected in verify wave 2). nlohmann/json does regenerate its `BUILD.bazel` header list on every pull request (see CMK-BZL-11). SHOULD because those two are healthy and maintained.
- Verification: `grep -rln -e 'bazel test' -e 'bazelisk test' .github ci tools/internal_ci` and `grep -rln -e 'ctest' -e 'cmake --build' .github ci tools/internal_ci`. Missing directories print errors, which are not findings. Empty on the Bazel test grep while a `MODULE.bazel` exists = finding: partial or no sync. **Empty `.github/workflows` alone is not evidence of no CI.**
- Severity: **SHOULD** (exemplar-measured).
- Version: any.

**CMK-BZL-10 — Keep one source of truth for dependency versions.** Generate the CMake side's pins from `MODULE.bazel`, or the reverse, and run a staleness test in CI. Never hand-maintain two pins for one dependency.
- Rationale: protobuf generates `cmake/dependencies.cmake` from `//:MODULE.bazel` (`protocolbuffers__protobuf@c64743979d:cmake/BUILD.bazel:9-25`). A daily job runs every `staleness_test`-tagged target (`.github/workflows/staleness_check.yml:3-6,62`), and a post-submit job regenerates and pushes (`staleness_refresh.yml:3-7,30-31`). This consolidation measured that; see conflict 10. The two hand-maintained pairs in the corpus both drift: yaml-cpp and benchmark (dual dive §6).
- Verification: `grep -rln -i -e 'auto-generated' -e 'automatically generated' --include='*.cmake' --include='CMakeLists.txt' .`. Empty while `MODULE.bazel` and the CMake side pin the same package = hand-maintained, then run CMK-BZL-12's drift check. A hit = read the generator, then confirm a CI job runs its staleness check. None = finding.
- Severity: **SHOULD** (exemplar-measured).
- Version: any.

**CMK-BZL-11 — Treat a file with a "generated" header, or one a script or CI step regenerates, as derived.** Read the generator before editing it or reporting drift in it. Never hand-edit it.
- Rationale: grpc's root `CMakeLists.txt` is generated from Bazel metadata (`grpc__grpc@0f8d72ed71:CMakeLists.txt:1-4`, `tools/buildgen/extract_metadata_from_bazel_xml.py:16-22`). protobuf's `cmake/dependencies.cmake` is generated from `MODULE.bazel`. Generation runs both ways: `nlohmann__json@f422b753cc` generates `BUILD.bazel` from a CMake script (`cmake/scripts/gen_bazel_build_file.cmake:1-6`, "edit this script rather than BUILD.bazel") and re-runs it on every pull request (`.github/workflows/check_amalgamation.yml:64-72`), yet that `BUILD.bazel` carries no generated header (verify wave 2). A hand edit is overwritten, and a version that matches by construction is not drift.
- Verification: `grep -rln -i -e 'auto-generated' -e 'automatically generated' -e 'do not edit' --include='*.cmake' --include='CMakeLists.txt' --include='BUILD.bazel' .` (a hit = derived). A header is not guaranteed, so also set `FILE=BUILD.bazel` (or `CMakeLists.txt`, or the pin file) and run `grep -rl -F -e "$FILE" --include='*.yml' --include='*.yaml' --include='*.sh' --include='*.py' --include='*.cmake' --include='Makefile' .` (a script or workflow that names the file = read it; it may regenerate the file). Both empty = hand-authored, edit freely. Any derived file = the generator must be named in the change, or in the report, before any edit or drift claim. Measured: the header grep finds grpc and protobuf and misses nlohmann/json; the name grep finds json's generator and workflow, and is empty on zlib, yaml-cpp, re2 and Catch2.
- Severity: **MUST** (measured).
- Version: any.

**CMK-BZL-12 — Report "not knowable statically" whenever the CMake side carries no version token.** That covers an unversioned `find_package`, a git submodule gitlink, and a vcpkg-baseline resolution. Never report such a pair as "same" or "no drift".
- Rationale: re2's `find_package(absl REQUIRED)` has no version and faces `abseil-cpp 20250814.1` in `MODULE.bazel`; its CI resolves through a vcpkg baseline, a third source (`google__re2@972a15cedd:CMakeLists.txt:93-96`). grpc pins through submodule commits (`gRPC_<NAME>_PROVIDER=module`). Only 3.2 percent of 6,957 corpus `find_package` calls carry a version ([deps] headline 1).
- Verification: the Bazel module name and the CMake package name usually differ (`abseil-cpp` against `absl`, `googletest` against `GTest`), so use two variables. Set `BZL_NAME=abseil-cpp` and `CMAKE_NAME=absl`, taking `CMAKE_NAME` from the dependency's own Config package or the project's `find_package` call. Run `grep -rn -e "bazel_dep(name = \"$BZL_NAME\"" --include='MODULE.bazel' .`, then `grep -rn -i -e "find_package($CMAKE_NAME" -e "FetchContent_Declare($BZL_NAME" -e "FetchContent_Declare($CMAKE_NAME" -e "ExternalProject_Add($BZL_NAME" -e "ExternalProject_Add($CMAKE_NAME" -e "$BZL_NAME" --include='*.cmake' --include='CMakeLists.txt' .` (the bare `$BZL_NAME` alternative catches a vendored directory such as `googletest-1.16.0`), then `git ls-tree -r HEAD | grep -e '^160000'`. A CMake-side hit with no `GIT_TAG` or version argument, or a gitlink = NOT KNOWABLE. A vendored directory whose name carries a version, or two concrete versions = compare them. Empty CMake side = no pair. Measured on re2: with one `NAME=abseil-cpp` for both sides, the CMake grep is empty and reads "no pair" for the very pair this rule cites; with `CMAKE_NAME=absl` it finds `CMakeLists.txt:94` (verify wave 2).
- Severity: **MUST** (measured).
- Version: any.

**CMK-BZL-13 — Never derive a Bazel label from a CMake imported target, or the reverse.** Read both descriptions before writing a mapping.
- Rationale: 6 of 8 measured pairs fail a pattern match. For example, `ZLIB::ZLIB` maps to `@zlib//:z`, `protobuf::libprotobuf` to `@protobuf//:protobuf`, `GTest::gtest` to `@googletest//:gtest`, and `nlohmann_json::nlohmann_json` to `@nlohmann_json//:json`. Only yaml-cpp and re2 match exactly (dual dive §5, 2026-09-26 SHAs).
- Verification: `grep -rn -e 'NAMESPACE' -e 'ALIAS' --include='*.cmake' --include='CMakeLists.txt' .` for the CMake side. For the Bazel side, `grep -rn -A2 -e 'cc_library(' --include='BUILD.bazel' --include='BUILD' .` plus `grep -rn -e 'module(' --include='MODULE.bazel' .`. A mapping published without both outputs in hand = finding.
- Severity: **MUST** (measured).
- Version: any.

### CMK-BZL — D. Package managers across the seam

Binds: an application consuming packages that also builds with Bazel.

**CMK-BZL-14 — Wire Conan into a Bzlmod root module with the generated include.** Use `BazelDeps` plus `include("//<generators-folder>:conan_deps.MODULE.bazel")` in the *root* `MODULE.bazel`. Pair it with `BazelToolchain`'s `conan_bzl.rc`, passed as `--bazelrc=… --config=conan-config`. Never hand-write a `local_path_override` for Conan output, and never state "WORKSPACE only". A module published to the BCR cannot use this path.
- Rationale: in Conan 2.32.0's `conan/tools/google/bazeldeps.py`, three output sets appear:
  - WORKSPACE `dependencies.bzl`, annotated "Bazel 6.x … likely be dropped soon".
  - A Bazel 7.1+ `module_extension`.
  - The Bazel 9 `conan_deps.MODULE.bazel`, carrying its own `bazel_dep(name = "rules_cc", version = "0.2.17")` (conan develop2 `39898afdfb`, lines 440-455, 516, 558).

  Support arrived in PR [#20042](https://github.com/conan-io/conan/pull/20042) and shipped in 2.30.0. Bazel's `include()` is restricted to "the root module and modules subject to a non-registry override". The docs landing page shows only WORKSPACE, and the corpus has zero adopters, hence SHOULD. WORKSPACE removal belongs to `BZL-MOD` (`rules/bazel-quality/bzlmod.md:11`) and autoload removal to `BZL-LARK-10`; cite them, do not restate them.
- Verification: `grep -rn -e 'BazelDeps' --include='conanfile.py' --include='conanfile.txt' .`, then `grep -rn -e 'conan_deps.MODULE.bazel' --include='MODULE.bazel' .`. Generator active and include grep empty = finding. Both empty = not applicable.
- Severity: **SHOULD**.
- Version: Conan ≥ 2.30.0 (absent at 2.29.0; byte-identical at 2.32.0, 2026-08-31, and develop2 `39898afdfb`). Bazel's `include()` itself exists since Bazel 7.2.0 (release notes, [#22204](https://github.com/bazelbuild/bazel/pull/22204)). The generated `conan_deps.MODULE.bazel` wires Conan's rules_cc extension, which Conan's source labels "Bazel 9+". For Bazel 7.1–8.x, Conan's source points to `conan_deps_module_extension.bzl` through a hand-written `use_extension`. Whether the include file also works on Bazel 7.2–8.x was not measured.

**CMK-BZL-15 — State that vcpkg has no Bazel bridge.** There is no `vcpkg export` Bazel format and no maintained `rules_vcpkg`. The options are hand-written repository rules over the vcpkg installed tree, or moving that dependency to a BCR module or to `rules_foreign_cc`.
- Rationale: the only two `bazel` paths in `microsoft__vcpkg@c4ee5a52d7` run the opposite way, `vcpkg_find_acquire_program(BAZEL)` for Bazel-built ports, or belong to a community port last released in 2022. `microsoft__vcpkg-tool@51bf87ca6e` has zero (dual dive §9).
- Verification: `grep -rln -i -e 'bazel' "$VCPKG_ROOT/scripts"` should list exactly two files: `scripts/cmake/vcpkg_find_acquire_program(BAZEL).cmake` and `scripts/test_ports/vcpkg-find-acquire-program/portfile.cmake`, which only calls `vcpkg_find_acquire_program(BAZEL)` (measured at `c4ee5a52d7`, verify wave 2). Any other hit is new and must be re-read before it is cited. A recommendation that names a vcpkg Bazel generator = finding.
- Severity: **MUST** (measured negative).
- Version: vcpkg 2026.07.29, vcpkg-tool 2026-07-27 (source measured). vcpkg-tool 2026-09-26 was released on the verification day. Its release notes mention no Bazel, but its source was not re-grepped.

### Not CMK-BZL rules (routed elsewhere)

- **Network enumeration in general** is M-G-18 (CMK-DEP). **Relocatable exports** are M-F-02 (CMK-INST). **PIC on the target** is M-E-09 (CMK-TGT). For M-E-09, flag-delivered `-fPIC` works whatever `CMAKE_POSITION_INDEPENDENT_CODE` says (M5), so CMK-TGT must not claim that OFF blocks it. **Toolchain-file composition** is M-H-01 (CMK-TC).
- **`build_args` `-j`** and **`compile_commands.json` for wrapped builds** are Bazel-side attributes. They go back to `bazel-quality` (Verdict 8; `BZL-CC-28` owns the database), not into CMK-BZL.

## Applied to find_ocx and the exemplars

| Rule | Satisfies | Violates or partial | New commitment |
|---|---|---|---|
| CMK-BZL-01 | `filipdutescu__modern-cpp-template@0fab2c3552`: its configure-time `file(DOWNLOAD)` of `vcpkg.cmake` (`cmake/Vcpkg.cmake:5-11`) is off by default (`cmake/StandardSettings.cmake:21`). The dive's `netprobe` fixture fails without network and passes with a source-dir entry (M8). | find_ocx: configure-time downloads (`ocx.cmake:738,765`, [ocx] §5). Offline mode needs a warm store *outside* any sandbox (`.github/workflows/ci.yml:90-112`), so it cannot pass the simulation with cache entries alone. | find_ocx docs should say Bazel users take `rules_ocx`, never a rules_foreign_cc wrap of a find_ocx project |
| CMK-BZL-02 | `qt__qtbase@0ef5a8e9ca:cmake/QtAutoDetectHelpers.cmake:330-336` chainloads the supplied file before its FORCE. `ClickHouse__ClickHouse@0995a518a8:PreLoad.cmake:80-81` is guarded by `NOT DEFINED`. `apache__arrow@3ad410b7b1:cpp/cmake_modules/Usevcpkg.cmake:99-101` uses non-FORCE `CACHE`. find_ocx: grep empty. | `aminya__project_options@412045e1f1:src/Vcpkg.cmake:160-162` FORCE-sets vcpkg's toolchain. Its chainload (`:179-190`) reads `CROSS_TOOLCHAIN_FILE` or a helper, not the caller's `-D`. Violated unless that helper returns the caller's file (not traced). `modern-cpp-template@0fab2c3552:cmake/Vcpkg.cmake:19` sets it *after* `project()` (`CMakeLists.txt:7` vs `:56`), which is dead code rather than an override. | none |
| CMK-BZL-03 | find_ocx: no `CMAKE_*_FLAGS` writes (grep empty; its harness is `LANGUAGES NONE`) | corpus-wide `-Werror` as a raw flag appears 187 times against 16 uses of `CMAKE_COMPILE_WARNING_AS_ERROR` ([shape] §8). Raw-flag habits are where `set(CMAKE_CXX_FLAGS …)` clobbering lives. Per-repo not measured. | wave-3 skill `cmake-modernize` carries the flags-to-targets step |
| CMK-BZL-04, -05, -06, -07 | The dive's scratch package: relative destinations, empty `$PWD` grep, listing under `lib/`, `include/`, `lib/cmake/` (dive Finding 4). find_ocx: not applicable, it installs nothing (copy-and-own module). | The rules_foreign_cc example wraps a `cmake_minimum_required(VERSION 2.8.4)` toy (`examples/cmake_crosstool/static/src/CMakeLists.txt`). That is a fixture, not practice. No exemplar was run through the symlink farm; that is pending. | the wrap simulation ships as the verification script in `bazel-seam.md` |
| CMK-BZL-08 | 31 of the 46 corpus repos declare a floor in a root `CMakeLists.txt`, and all 31 are ≤ 3.29 (highest: cmake_template and KDE ECM at 3.29; find_ocx 3.19; `Findocx.cmake` documents 3.15+). The other 15 have no root `CMakeLists.txt` floor (re-measured, verify wave 2). All run under the 3.31.12 default (measured 2026-09-26). | none today. Any `VERSION 4.1+` floor breaks under the default (M1b). | ship CPS only behind a `CMAKE_VERSION` guard, beside Config |
| CMK-BZL-09 | Full: re2, benchmark, protobuf, `jbeder__yaml-cpp@1e0876c671` (`build.yml:128-164`) (GitHub Actions); abseil, googletest, grpc (Kokoro) | Partial: `catchorg__Catch2@222e233903` (`linux-bazel-builds.yml` builds, no test) and `gflags__gflags@bdda022e7c` (`bazel.yml` builds only). None: `madler__zlib@767c4c9478`, `nlohmann__json@f422b753cc` (json regenerates `BUILD.bazel` per pull request but never builds it) | none |
| CMK-BZL-10 | protobuf: generated, with staleness enforced in CI (conflict 10). grpc: CMake generated from Bazel. | `jbeder__yaml-cpp@1e0876c671:MODULE.bazel:14` pins googletest 1.17.0.bcr.2 while CMake vendors `test/googletest-1.16.0`. `google__benchmark@ac13143d96:MODULE.bazel:11` pins 1.14.0 while `cmake/GoogleTest.cmake.in:41` fetches `v1.15.2`. No major-version split in the corpus. | none |
| CMK-BZL-11 | grpc and protobuf both carry explicit generated headers naming their generator. nlohmann/json generates `BUILD.bazel` from `cmake/scripts/gen_bazel_build_file.cmake` with no header; only the generator-name grep finds it | the wave-1 audit, which counted generated CMake as independently authored ("no repo generates one from the other", [deps] §8) | none |
| CMK-BZL-12 | protobuf: comparable by construction | `google__re2@972a15cedd:CMakeLists.txt:93-96` is unversioned. `grpc__grpc@0f8d72ed71:.gitmodules` pins by submodule gitlink. Both are NOT KNOWABLE. | none |
| CMK-BZL-13 | yaml-cpp, re2 (exact matches) | zlib, protobuf, googletest, nlohmann/json: the leaf name or case differs. abseil, benchmark: the repo or namespace spelling differs (dual dive §5). | none |
| CMK-BZL-14, -15 | Conan 2.32.0 source; vcpkg negative confirmed | Conan's landing page `docs.conan.io/2/integrations/bazel.html` understates Bzlmod support | none, since the fleet has no Conan or vcpkg manifest ([fleet]) |

## AI-agent failure modes

Ranked by how often each bites. Four of them bit this program's own wave 1 (marked †).

1. **Calling a dual repo "no sync" from an empty `.github/workflows`.** † The wave-1 audit did this for googletest and abseil. *Check:* CMK-BZL-09's grep over `ci/` and `tools/internal_ci/`.
2. **Treating a generated file as hand-written.** This produces false drift findings, or hand edits that get overwritten. † The wave-1 audit said no repo generates one description from the other. *Check:* CMK-BZL-11's header grep.
3. **Reporting "no drift" when the CMake side has nothing to compare.** † The audit flagged drift as not derivable and then counted repos anyway. *Check:* CMK-BZL-12. No version token = NOT KNOWABLE.
4. **Fixing a wrapped PIC link failure with `set(CMAKE_POSITION_INDEPENDENT_CODE ON)`** when the cause is a `set(CMAKE_C_FLAGS …)` that discarded the injected `-fPIC`. † The dive itself wrongly blamed a hard-coded `OFF`. *Check:* CMK-BZL-03's `WRAP_SEED` probe.
5. **Assuming the host's CMake runs inside the wrap.** Examples: recommending CPS or a 4.x floor because "CMake 4.4 supports it", or using a WORKSPACE `cmake_version=` spelling in `MODULE.bazel`. *Check:* CMK-BZL-08's `tools.cmake` grep, then the version table of the pinned release.
6. **Guessing a Bazel label from a CMake target, such as `@zlib//:zlib`.** *Check:* CMK-BZL-13, with both greps in hand.
7. **"Conan's Bazel support is WORKSPACE-only", or a hand-written `local_path_override`,** from reading only the integrations landing page. *Check:* CMK-BZL-14. Read `reference/tools/google/bazeldeps.rst` or the source.
8. **Inventing `rules_vcpkg`, `vcpkg export --bazel` or similar.** *Check:* CMK-BZL-15's negative grep.
9. **Hard-coding a convenience toolchain (`set(CMAKE_TOOLCHAIN_FILE …/vcpkg.cmake)`) before `project()`,** which silently beats the caller's (M2). *Check:* CMK-BZL-02.
10. **Chasing a "missing file" when Bazel reports "invalid symlink" after a wrapped install.** The install step copied a sandbox symlink. *Check:* CMK-BZL-06's symlink-farm `find -lname '/*'`.
11. **Spelling the wrap simulation's warning gate `-Werror=dev` on 4.4.** That spelling is deprecated; the gate itself belongs to CMK-CORE and is not restated here.

## Open questions

**Owner decisions**

1. Apply the handback patch to `rules/bazel-quality/cpp.md` *Wrapped Foreign Builds*? It has four parts: the pointer line (Verdict 8), the CPS negative, a proposed caller-side row for `build_args` `-j` (#329, open since 2019), and the symlink trap (#1129). Default: offer the pointer and the CPS negative only. The two new rows are for the Bazel program's owner to accept or decline.
2. Keep CMK-BZL-09 at SHOULD? Default: yes (Verdict 4).

**Needs another research round**

1. **rules_foreign_cc under real Bazel.** Run one wrap end to end on Bazel 9.2.0 with rules_foreign_cc 0.16.0. Does #1129 fail exactly as M7's symlink farm predicts, and does `--force_pic` reach the build as `_INIT` flags? Both are inferred from source and simulation here, never observed under Bazel.
2. **The `unshare -rn` simulation on CI runners.** Does it work on GitHub's `ubuntu-24.04` runner? Ubuntu 23.10+ AppArmor can restrict unprivileged user namespaces. If not, what is the portable fallback: `FETCHCONTENT_FULLY_DISCONNECTED` plus a dead proxy, or a network-less container?
3. **Conan BazelDeps under Bzlmod.** Build one measured consumer: `conan install`, then `bazel build` with `include()`, on Conan 2.32.0 and Bazel 9.2.0. Does the root-module restriction bite real layouts, and does Conan's current docs page mark BazelDeps experimental? Zero adopters today; source-read only.
4. ~~**Versions and gate: `CMD_INSTALL_ABSOLUTE_DESTINATION`.** Does the 4.4 diagnostic fire on `DESTINATION ${CMAKE_INSTALL_PREFIX}/lib` after expansion?~~ Resolved in verify wave 2: yes, it fires on the expanded path on 4.4.2 (M4x). The grep stays as the ≤ 4.3 check, where the flag is silently accepted.

## Sub-artifacts

- [cmake-bazel-seam/wrappable-cmake-contract.md](cmake-bazel-seam/wrappable-cmake-contract.md) covers what rules_foreign_cc 0.16.0's `cmake()` needs from a wrapped CMake project: attributes, `block-network`, crosstool synthesis, the PIC fix, the 3.19.8–4.0.7 version ceiling and the CPS negative. Its PIC, flags and symlink claims are superseded here (conflicts 2-4).
- [cmake-bazel-seam/dual-build-sync-and-conan-bazel.md](cmake-bazel-seam/dual-build-sync-and-conan-bazel.md) covers the 11 dual repos' CI sync, target-name mapping, the per-pair drift table, grpc and protobuf generation, Conan's `BazelDeps` and `BazelToolchain` under Bzlmod, and the vcpkg negative. Its protobuf CI claim is superseded (conflict 10).
- [cmake-bazel-seam/scratch/wrap-contract/](cmake-bazel-seam/scratch/wrap-contract/) holds the dive's wrap fixtures: netprobe, the static library with a consumer, and the toolchain file.
- [cmake-bazel-seam/scratch/bzl-consolidate/](cmake-bazel-seam/scratch/bzl-consolidate/) holds this consolidation's fixtures and `measure.sh`, which re-runs M1-M8.

## Key sources

1. `bazel-contrib__rules_foreign_cc@bb2f3e5d72` (main, 2026-09-23, after tag 0.16.0 `931cb33cf8`; every cited line re-read identical at the tag in verify wave 2): `foreign_cc/private/framework.bzl:589-591` (block-network), `foreign_cc/cmake.bzl:210` (toolchain suppression), `foreign_cc/private/cmake_script.bzl:259-312` (`_INIT` seeding), `foreign_cc/repositories.bzl:19`, `MODULE.bazel:73-76` and `toolchains/private/cmake_versions.bzl` (3.31.12 default, 4.0.7 ceiling).
2. [rules_foreign_cc 0.16.0 release](https://api.github.com/repos/bazel-contrib/rules_foreign_cc/releases/tags/0.16.0) and [PR #1440](https://github.com/bazel-contrib/rules_foreign_cc/pull/1440) (PIC delivered as a flag).
3. [rules_foreign_cc #1129](https://github.com/bazel-contrib/rules_foreign_cc/issues/1129) (symlinked installs) and [#329](https://github.com/bazel-contrib/rules_foreign_cc/issues/329) (parallelism), both open on 2026-09-26.
4. Measurements M1-M8 in this consolidation (`scratch/bzl-consolidate/measure.sh`, 3.31.12 and 4.4.2): toolchain override, flags clobbering, PIC with OFF, symlink install, REAL_PATH fix, absolute-destination diagnostic, floor, no-network fetch.
5. `cmake --help-manual cmake-diagnostics` on 4.4.2: `CMD_INSTALL_ABSOLUTE_DESTINATION`, versionadded 4.4, default ignore.
6. The dive's wrap measurements (network, toolchain, install listing, PIC three ways), `wrappable-cmake-contract.md` Findings 2-5.
7. `protocolbuffers__protobuf@c64743979d`: `cmake/BUILD.bazel:9-25`, `cmake/dependencies.cmake:1-7`, `.github/workflows/staleness_check.yml`, `.github/workflows/staleness_refresh.yml`, `.github/workflows/README.md:47-69`.
8. `grpc__grpc@0f8d72ed71`: `CMakeLists.txt:1-4` and `tools/buildgen/extract_metadata_from_bazel_xml.py:16-22`.
9. The 11 dual repos' CI reads and the 8-pair target mapping (dual dive §2, §5, §6), at the 2026-09-26 SHAs.
10. conan-io/conan `conan/tools/google/bazeldeps.py` at 2.32.0 (re-read at develop2 `39898afdfb`) and [PR #20042](https://github.com/conan-io/conan/pull/20042).
11. [Conan BazelDeps reference page](https://raw.githubusercontent.com/conan-io/docs/develop2/reference/tools/google/bazeldeps.rst) against the [integrations landing page](https://docs.conan.io/2/integrations/bazel.html).
12. [Bazel `include()` reference](https://bazel.build/rules/lib/globals/module) (root-module restriction).
13. `microsoft__vcpkg@c4ee5a52d7` and `microsoft__vcpkg-tool@51bf87ca6e` (the negative Bazel grep).
14. `rules/bazel-quality/cpp.md` (`BZL-CC-22/23/24/28`), cited and not restated.

## Conflicts resolved

1. **The rules_foreign_cc version model.** The era re-check said the "model shifted" and the numbers needed a new dive. The wrappable dive said only the plumbing changed. **Dive wins**: re-read at `bb2f3e5d72` and at the tag commit `931cb33cf8` (verify wave 2), default 3.31.12 and a 14-entry table ending at 4.0.7. Frame correction 8's numbers stand; only the registration mechanism is new.
2. **"A project's `set(CMAKE_C_FLAGS …)` adds to, not replaces, Bazel's flags"** (wrappable dive, Summary). **Refuted by M6**: a normal `set()` shadows the `_INIT`-seeded value, and the injected `-fPIC` is lost. This became CMK-BZL-03.
3. **"Hard-coding `CMAKE_POSITION_INDEPENDENT_CODE OFF` defeats flag-delivered PIC"** (wrappable dive, CMK-BZL-05 and AI angle 1). **Refuted by M5**: `OFF` adds no counter-flag, and `-fPIC` from flags links. The rule was rewritten around flag clobbering.
4. **"Symlinked installs are usually automatic for `install(FILES)`; the trap is `create_symlink` in `install(CODE)`"** (wrappable dive, Finding 7). **Refuted by M3 and M7**: `install(FILES)` and `install(DIRECTORY)` preserve source symlinks on both lines. The fix is `file(REAL_PATH)` (CMK-BZL-06).
5. **The dive's `CMAKE_INSTALL_PREFIX` check** (zero mentions of the variable = finding) flags every correct `GNUInstallDirs` project. **Replaced** by the 4.4 `install-absolute-destination` diagnostic, measured, plus a grep for absolute destinations.
6. **Linkage as MUST with "never hard-code STATIC/SHARED"** (dive CMK-BZL-06). zlib-style build-static and build-shared options are legitimate, and the harm rests only on the rule's source. **Downgraded to SHOULD and broadened** to any cache entry (CMK-BZL-07).
7. **The dive's toolchain check grepped only `CACHE … FORCE`.** **Extended**: M2 shows a *normal* `set(CMAKE_TOOLCHAIN_FILE)` before `project()` also beats the caller, silently (CMK-BZL-02).
8. **The "no sync" count.** The audit headline said 5, the audit body said 4, and frame correction 8 said 4. **Resolved to 3** (yaml-cpp, zlib, nlohmann/json), because the dual dive read every CI file including Kokoro scripts. Catch2 and gflags are partial, not none. **Verify wave 2 corrects this to 2** (zlib, nlohmann/json): yaml-cpp's `build.yml:128-164` builds and runs `bazel test` on push and pull request.
9. **"No repo generates one description from the other"** ([deps] §8). **Refuted**: grpc generates `CMakeLists.txt` from Bazel metadata, and protobuf generates its CMake dependency pins from `MODULE.bazel`. Verify wave 2 adds the reverse direction: nlohmann/json generates `BUILD.bazel` from a CMake script.
10. **protobuf's staleness test "not wired into any tracked workflow"** (dual dive §4). That claim came from a grep by target name. **Refuted by this consolidation**: `staleness_check.yml` runs `bazel query 'attr(tags, "staleness_test", //...)'` daily, and `staleness_refresh.yml` regenerates on every push to `main`. The workflow README documents `manual` as deliberate.
11. **Topic-map conflict 19: `BazelDeps` under Bzlmod.** **Resolved**: it works through `include()` of a generated `conan_deps.MODULE.bazel` since Conan 2.30.0, for the root module only (CMK-BZL-14).
12. **Whether CI must build both descriptions (MUST or SHOULD).** The dual dive argued SHOULD. **SHOULD stands**, because a MUST flags two healthy projects (CMK-BZL-09; three before verify wave 2 moved yaml-cpp to full).
13. **Duplicate rules across families.** The dive's no-network, relocation and PIC rules restated M-G-18 (CMK-DEP), M-F-02 (CMK-INST) and M-E-09 (CMK-TGT). **CMK-BZL keeps only the wrap-specific acceptance test** and cites those rows.
14. **Dive rules on `build_args` `-j` and `compile_commands.json`.** Both describe Bazel-side attributes. **Handed back** to `bazel-quality` and not shipped as CMK-BZL (`BZL-CC-28` already owns the database).
15. **The dive's CPS SHOULD and its separate floor observation.** **Merged** into one MUST, CMK-BZL-08, on the wrapper's CMake version. The floor failure was measured (M1b), and CPS becomes a guarded addition next to Config.

## Measurements added by this consolidation

CMake 3.31.12 and 4.4.2 via `ocx package exec kitware/cmake:{3.31,4.4}`, gcc 15.2.1, 2026-09-26. Fixtures and the `measure.sh` that re-runs them are in `cmake-bazel-seam/scratch/bzl-consolidate/`.

| # | Probe | 3.31.12 | 4.4.2 |
|---|---|---|---|
| M1 | `install(PACKAGE_INFO)` inside `if(CMAKE_VERSION VERSION_GREATER_EQUAL 4.3)` | skipped | emitted |
| M1b | `cmake_minimum_required(VERSION 4.1)` | "CMake 4.1 or higher is required" | configures |
| M2 | `set(CMAKE_TOOLCHAIN_FILE project-tc.cmake)` before `project()`, with `-DCMAKE_TOOLCHAIN_FILE=caller-tc.cmake` | project's file wins, no warning | project's file wins, no warning |
| M3 | `install(FILES)` and `install(DIRECTORY)` of symlinked sources | installed as symlinks | installed as symlinks |
| M4 | `install(… DESTINATION /opt/x)` with `-Werror=install-absolute-destination` | not available | `CMake Error (install-absolute-destination)` |
| M5 | `set(CMAKE_POSITION_INDEPENDENT_CODE OFF)` plus `-DCMAKE_C_FLAGS=-fPIC`, static linked into shared | links | links |
| M6 | toolchain `CMAKE_C_FLAGS_INIT "-fPIC"`, project `set(CMAKE_C_FLAGS "-O2")` | `relocation R_X86_64_32 … recompile with -fPIC` | same failure |
| M7 | `cp -rs` symlink farm, `install(FILES)` plain against `file(REAL_PATH)` | plain: absolute symlink. REAL_PATH: regular file | same |
| M8 | `unshare -rn` configure, FetchContent git fetch, against `-DFETCHCONTENT_SOURCE_DIR_DEP=<local>` | fetch fails at configure; override passes | same |
| M4x (verify wave 2) | `install(… DESTINATION ${CMAKE_INSTALL_PREFIX}/share/x)` with `-Werror=install-absolute-destination` | not available (flag accepted silently, also on 4.3.4) | `CMake Error (install-absolute-destination)` |
| M8b (verify wave 2) | `unshare -rn` FetchContent under a 3.25 floor with only `-DFETCHCONTENT_FULLY_DISCONNECTED=ON` | warning naming CMP0170, configures, dependency absent | same |
| M8c (verify wave 2) | the same under a 3.30 floor (CMP0170 NEW) | `CMake Error`, configure fails | same |

Build trees remain under `/home/mherwig/.cache/cmake-measure-scratch/bzl-consolidate/build`, because deleting them was denied by the permission system in this session. Verify wave 2 re-ran M1-M8 on 3.31.12, 4.3.4 and 4.4.2 with the same results. Its scripts are in `/home/mherwig/.cache/cmake-measure-scratch/verify-bazel-seam/` (`verify.sh`, `verify-fixed.sh`).

## Revision log

- verify wave 2 (2026-09-26): Verdict 3, CMK-BZL-08, Key sources 1 and Conflict 1 labelled `bb2f3e5d72` as tag 0.16.0. It is a main commit of 2026-09-23. The tag commit is `931cb33cf8`, and every cited value and line number is identical there.
- verify wave 2: CMK-BZL-01 and the simulation. `-DFETCHCONTENT_FULLY_DISCONNECTED=ON` was removed from the probe, because it masked a planted FetchContent, which configured, built and installed green on 3.31.12 and 4.4.2. It was also dropped as a stand-alone route: it only skips population (M8b/M8c, CMP0170). A `FULLY_DISCONNECTED` warning is now a finding signature.
- verify wave 2: CMK-BZL-02 verification gains `-i`, because CMake command names are case-insensitive.
- verify wave 2: CMK-BZL-03 verification gains `-i`, `CMAKE_MODULE_LINKER_FLAGS`, and excludes for the simulation's own files. The old grep went red on a clean project after the simulation, from `wrap-toolchain.cmake`'s `_INIT` lines. `_INIT` hits in toolchain files are declared not findings.
- verify wave 2: CMK-BZL-04 verification. The grep now excludes `cmake_install.cmake` and the simulation directories: the old grep went red on every clean project that had a configured build tree. The text now notes that the flag is accepted silently on ≤ 4.3, and that the 4.4 diagnostic fires on `${CMAKE_INSTALL_PREFIX}/…` (M4x). Open question 4 is resolved.
- verify wave 2: CMK-BZL-06 wording. The installed link points at the farm entry's target, not into the farm.
- verify wave 2: CMK-BZL-09, Verdict 4, Conflicts 8 and 12, and the Applied row. yaml-cpp builds and tests Bazel in CI (`build.yml:128-164`), so the count is 7 full, 2 partial and 2 none. SHOULD is unchanged.
- verify wave 2: CMK-BZL-11 rule, rationale and verification. nlohmann/json generates `BUILD.bazel` from a CMake script with no header (the CMake → Bazel direction), so the header grep alone misses it. A generator-name grep was added. The claim "generation runs Bazel → CMake only" is withdrawn.
- verify wave 2: CMK-BZL-12 verification now uses `BZL_NAME` and `CMAKE_NAME`, plus a vendored-directory alternative. The single-`NAME` recipe read "no pair" for re2's `abseil-cpp`/`absl` and for yaml-cpp's vendored googletest, the two pairs the ruleset itself cites.
- verify wave 2: CMK-BZL-14 version cell. It said "The `include()` form needs Bazel 9". Bazel's `include()` exists since 7.2.0; what is Bazel-9-labelled is Conan's rules_cc extension, which the generated include file wires in. The Conan floor was re-confirmed as absent at 2.29.0 and present at 2.30.0.
- verify wave 2: CMK-BZL-15 verification. The expected grep output adds the `test_ports/vcpkg-find-acquire-program` hit. The version cell notes vcpkg-tool 2026-09-26, released on the verification day, whose release notes mention no Bazel.
- verify wave 2: the Applied row for CMK-BZL-08 said "All 46 corpus root floors". Only 31 of the 46 repos declare a root `CMakeLists.txt` floor; all 31 are ≤ 3.29.

---
title: "CMK-BZL verification, wave 2"
verifies: ../cmake-bazel-seam.md
model: opus
date: 2026-09-26
---

# CMK-BZL verification, wave 2

Scope: every MUST rule (CMK-BZL-01, -02, -03, -04, -05, -08, -11, -12, -13, -15) and every version-bearing or load-bearing claim in `cmake-bazel-seam.md`. Local binaries: CMake 3.31.12, 4.3.4 and 4.4.2 (`ocx package exec kitware/cmake:<v>`), gcc 15.2 and GNU make. Primary sources fetched on 2026-09-26: the rules_foreign_cc 0.16.0 tag files, the GitHub API (tags, PRs, issues, releases), Conan `bazeldeps.py` at tags 2.29.0, 2.30.0 and 2.32.0, the Bazel 7.2.0 release notes and the `include()` reference, and the Conan docs pages. Exemplar corpus reads are cited `repo@sha:path:line`.

Scripts: `/home/mherwig/.cache/cmake-measure-scratch/verify-bazel-seam/verify.sh`, which re-runs M1-M8 on three versions plus the simulation against seven planted variants, and `verify-fixed.sh`, which runs the corrected simulation and corrected greps. Fixtures are in `fx/`: the consolidation's fixtures, plus `wrapclean/` with `# PLANT-*` markers, `absprefix/` and `netprobe330/`. Run both scripts from the lore worktree root. The task restricted writes to the two research files and this scratch directory, so the fixture copy under `cmake-bazel-seam/scratch/` was not made.

## Ledger

| # | ID or claim | verdict | evidence | note |
|---|---|---|---|---|
| 1 | CMK-BZL-01: the simulation proves "no network" | CORRECTED | A planted `FetchContent_Declare(dep GIT_REPOSITORY https://github.com/madler/zlib.git)` under the simulation's own `-DFETCHCONTENT_FULLY_DISCONNECTED=ON` gave `cfg=0 build=0 install=0` on 3.31.12 and 4.4.2. Without that entry: `cfg=1`, `Failed to clone` (verify-fixed.sh). | The probe dropped the entry. The signature now also counts the `FETCHCONTENT_FULLY_DISCONNECTED is set to true` warning. |
| 2 | CMK-BZL-01: `FETCHCONTENT_FULLY_DISCONNECTED=ON` is a route to a local copy | CORRECTED | With a 3.25 floor it gives a CMake Warning ("requires the source directory … to already be populated … Policy CMP0170 controls enforcement") and configures with the dependency absent. With a 3.30 floor it is a `CMake Error`, on 3.31.12 and 4.4.2. `cmake --help-policy CMP0170`: "versionadded 3.30 … not checked or enforced with CMake 3.29 or older". | Kept only when paired with `FETCHCONTENT_SOURCE_DIR_<NAME>` |
| 3 | CMK-BZL-01: `block-network` unless `requires-network` | CONFIRMED | `framework.bzl:590-591`: `if "requires-network" not in execution_requirements: execution_requirements["block-network"] = ""`, identical at tag `931cb33cf8` and main `bb2f3e5d72` | — |
| 4 | CMK-BZL-01: `FIND_PACKAGE_ARGS` and `FETCHCONTENT_TRY_FIND_PACKAGE_MODE` need 3.24 | CONFIRMED | 4.4.2 `--help-module FetchContent`: `versionadded:: 3.24` above each | — |
| 5 | M8: the fetch fails at configure under `unshare -rn`, and `FETCHCONTENT_SOURCE_DIR_DEP` passes | CONFIRMED | 3.31.12, 4.3.4, 4.4.2: `Failed to clone repository` / `Configuring incomplete`; with the override: `localdep used`, `Configuring done` | — |
| 6 | CMK-BZL-02: a normal `set(CMAKE_TOOLCHAIN_FILE)` before `project()` beats `-D`, with no warning (M2) | CONFIRMED | Full configure output on 3.31.12, 4.3.4 and 4.4.2 is only `-- TC_MARK=project` plus the done lines. There is no "Manually-specified variables were not used" warning. | — |
| 7 | CMK-BZL-02: the verification grep | CORRECTED | The grep was case-sensitive. CMake command names are case-insensitive, and the corpus has `SET(` forms (item 10). | `-i` added. The planted variant is red, both in the grep (`CMakeLists.txt:2`) and in the simulation (`TCLOADED=0`); clean is green. |
| 8 | CMK-BZL-02: toolchain suppression at `cmake.bzl:210` | CONFIRMED | `no_toolchain_file = ctx.attr.cache_entries.get("CMAKE_TOOLCHAIN_FILE") or not ctx.attr.generate_crosstool_file`, line 210 at the tag | — |
| 9 | CMK-BZL-03: `set(CMAKE_C_FLAGS "-O2")` drops the `_INIT` `-fPIC` (M6); PIC OFF plus flag `-fPIC` links (M5) | CONFIRMED | M6: `relocation R_X86_64_32 against symbol 'tbl' … recompile with -fPIC` on 3.31.12, 4.3.4 and 4.4.2. M5: `Built target c` on all three. | — |
| 10 | CMK-BZL-03: the verification grep | CORRECTED | After the simulation, the old grep hit `./wrap-toolchain.cmake:1:set(CMAKE_C_FLAGS_INIT …)` on the clean variant: red on clean input. The corpus has 42 uppercase `SET(CMAKE_C(XX)_FLAGS` lines (Kitware CMake 37, LLVM 5) that the case-sensitive grep misses. `CMAKE_MODULE_LINKER_FLAGS_INIT` is also seeded (`cmake_script.bzl`, tag) but was not in the grep. | `-i`, the MODULE variable and three excludes were added; `_INIT` is declared not a finding. The corrected grep gives clean 0, planted 1 and `flagsok` 1 (a pass by the reading rule). |
| 11 | CMK-BZL-03: the `_INIT` seeding at `cmake_script.bzl:259-312`, `replace = False` | CONFIRMED | At the tag: lines 260-264 `"CFLAGS": struct(value = "CMAKE_C_FLAGS_INIT", replace = False)` and siblings; linker `_INIT` entries at 467-469 | — |
| 12 | CMK-BZL-03: PIC arrives as a flag since 0.16.0 (PR #1440) | CONFIRMED | PR #1440 "fix: honor --force_pic for shared library", merged 2025-11-06. Its diff adds `use_pic = cc_toolchain_.needs_pic_for_dynamic_libraries(…)` to the compile flag lines. It is listed in the 0.16.0 release body; the previous tag was 0.15.1. | — |
| 13 | CMK-BZL-03: `CMAKE_EXPORT_COMPILE_COMMANDS` works on Makefile and Ninja generators only | CONFIRMED | 4.4.2 `--help-variable`: "implemented only by Makefile Generators and Ninja Generators. It is ignored on other generators." | — |
| 14 | CMK-BZL-03: WRAP_SEED behavioural probe | CONFIRMED | `WRAP_SEED` count in `compile_commands.json`: clean 1, `flags` plant 0, `flagsok` 1, on 3.31.12 and 4.4.2 | Goes red and stays green |
| 15 | CMK-BZL-04: `CMD_INSTALL_ABSOLUTE_DESTINATION`, versionadded 4.4, default ignore | CONFIRMED | 4.4.2 `--help-manual cmake-diagnostics`: `versionadded:: 4.4`, `:default: ignore`, `:parent: CMD_AUTHOR`. 4.3.4: "cmake-diagnostics … is not an available manual". Without `-W` the absdest fixture configures silently on 4.4.2. | — |
| 16 | CMK-BZL-04: `-Werror=install-absolute-destination` gives `CMake Error (install-absolute-destination)` (M4) | CONFIRMED | 4.4.2: `CMake Error (install-absolute-destination) at CMakeLists.txt:3 (install)`. In the simulation variants, `abs` is 1, `absp` is 1 and `clean` is 0. | — |
| 17 | CMK-BZL-04: the ≤ 4.3 grep and the "no diagnostic on ≤ 4.3" step | CORRECTED | 4.3.4 accepts `-Werror=install-absolute-destination` silently (exit 0, no warning), so a green run there is meaningless. The grep hit `./build-wrap/cmake_install.cmake:46: file(INSTALL DESTINATION "${CMAKE_INSTALL_PREFIX}/lib64" …` on the clean variant: red on clean input. | Added `--exclude='cmake_install.cmake'` and the simulation dir excludes. Corrected: clean 0, `abs` 1, `absp` 1. |
| 18 | Open question 4: does the 4.4 diagnostic fire on `${CMAKE_INSTALL_PREFIX}/…`? | CONFIRMED (resolved) | M4x on 4.4.2: `CMake Error (install-absolute-destination) at CMakeLists.txt:3` for `DESTINATION ${CMAKE_INSTALL_PREFIX}/share/absprefix` | Open question marked resolved |
| 19 | CMK-BZL-05: `grep -rn -e "$PWD" wrap-prefix` | CONFIRMED | Clean: 0 files. A planted `file(WRITE …wcSrc.cmake "set(WC_SRC ${CMAKE_CURRENT_SOURCE_DIR})")` that is installed gives 1 file, on 3.31.12 and 4.4.2. | The listing-vs-`out_*` diff is a reading step (item 42) |
| 20 | CMK-BZL-05: `configure_package_config_file` needs ≥ 3.0 | CONFIRMED | 4.4.2 `--help-module CMakePackageConfigHelpers` has no `versionadded` on the command, so it predates 3.0 | Loose but true; the ruleset floor is 3.25 anyway |
| 21 | CMK-BZL-06: `install(FILES)` and `install(DIRECTORY)` copy symlinks as symlinks (M3); `file(REAL_PATH)` fixes it (M7) | CONFIRMED | 3.31.12, 4.3.4, 4.4.2: `include/hdr.h -> real/hdr.h`, `include/sub -> real/sub`. In the farm, `a.h` is a link and the REAL_PATH `b.h` is a regular file. The CMK-BZL-06 check on `wrapclean` run from a farm is red (`include/wc.h`). | — |
| 22 | CMK-BZL-06: "absolute link back into the farm" | CORRECTED | The installed link is `a.h -> …/fx/symfix/src/a.h`: the farm entry's target (the original tree), not the farm | Wording only |
| 23 | CMK-BZL-06: `file(REAL_PATH)` needs 3.19; #1129 open | CONFIRMED | 4.4.2 `--help-command file`: `versionadded:: 3.19`. API: #1129 `open`, created 2023-12-11. | — |
| 24 | CMK-BZL-07: `cache_entries` is the only channel (`cmake.bzl:366-373`) | CONFIRMED | `"cache_entries": attr.string_dict(` at line 366 at the tag | 1,284 `BUILD_SHARED_LIBS` refs matches `cmake-audit/exemplar-cmake-shape.md:270`; not re-counted |
| 25 | CMK-BZL-08: default 3.31.12, table 3.19.8 to 4.0.7, `repositories.bzl:19`, `MODULE.bazel:73-76` | CONFIRMED | Tag `931cb33cf8` (API `git/ref/tags/0.16.0`): `"cmake": "3.31.12"` at line 19; `tools.cmake(mode = "binary", version = "3.31.12")` at 73-76; the table has 14 versions, 3.19.8 through 4.0.7 | Also overrides the era re-check's "no fixed default" reading, as Conflict 1 already did |
| 26 | CMK-BZL-08, Verdict 3, Key sources 1: `bb2f3e5d72` is tag 0.16.0 | CORRECTED | The clone HEAD `bb2f3e5d72` has commit date 2026-09-23 ("prebuilt cmake: map the Windows arm64 archives … (#1597)"). The API resolves tag 0.16.0 to `931cb33cf882`. | The values are identical, so only the label changed |
| 27 | CMK-BZL-08: M1 guarded CPS, M1b 4.1 floor | CONFIRMED | 3.31.12: `CPS skipped on 3.31.12` and "CMake 4.1 or higher is required. You are running version 3.31.12". 4.3.4 and 4.4.2: `CPS emitted` and configures. | — |
| 28 | CMK-BZL-08: `install(PACKAGE_INFO)` and `export(PACKAGE_INFO)` are 4.3 | CONFIRMED | 4.4.2 `--help-command install` line 982 and `export` line 145: `versionadded:: 4.3` | Matches frame correction (4.1 spelling `export(EXPORT … PACKAGE_INFO)`) |
| 29 | Applied row CMK-BZL-08: "All 46 corpus root floors ≤ 3.29" | CORRECTED | Only 31 of 46 repos have a root `CMakeLists.txt` with `cmake_minimum_required`; the top values are ClickHouse 3.25, KDE ECM 3.29, cmake_template 3.29. find_ocx's `CMakeLists.txt:8` is 3.19, and `Findocx.cmake:36` says "3.15+". | — |
| 30 | CMK-BZL-09: 6 full, 2 partial, 3 none; yaml-cpp "never runs Bazel in CI" | CORRECTED | `jbeder__yaml-cpp@1e0876c671:.github/workflows/build.yml:128-164` has `bazel-build` and `bzlmod-build` jobs with `bazel test test` / `bazel test --enable_bzlmod test`, `on: push, pull_request` (same file has `ctest` at :85). The dive's §2 row called this "NO SYNC (confirmed)". | Now 7, 2 and 2. SHOULD unchanged. Verdict 4 and Conflicts 8 and 12 were updated. |
| 31 | CMK-BZL-09: Catch2 and gflags build Bazel only; zlib and json have no Bazel build | CONFIRMED | The `bazel test` grep is empty on all four. Catch2 has `linux-bazel-builds.yml` and gflags has `bazel.yml`. json's hits are amalgamation checks (item 36). | — |
| 32 | CMK-BZL-09: the verification grep reaches Kokoro | CONFIRMED | Hits `abseil@61d073d671:ci/linux_gcc-latest_libstdcxx_bazel.sh`, `googletest@4267679b68:ci/linux-presubmit.sh`, `grpc@0f8d72ed71:tools/internal_ci/linux/aws/grpc_bazel_test_c_cpp_aarch64.sh` | Red on yaml-cpp too (correctly "full") |
| 33 | CMK-BZL-10: protobuf generates from `MODULE.bazel`, and the staleness runs daily and after push | CONFIRMED | `cmake/BUILD.bazel:9-25` (genrule `srcs = ["//:MODULE.bazel"]`, `staleness_test … tags = ["manual"]`); `upb/cmake/build_defs.bzl:58` `tags = ["staleness_test"] + tags`; `staleness_check.yml` `cron: 0 10 * * *` and `bazel query 'attr(tags, "staleness_test", //...)' \| xargs bazel test`; `staleness_refresh.yml` `on: push: branches: [main]` | — |
| 34 | CMK-BZL-10: yaml-cpp and benchmark drift | CONFIRMED | yaml-cpp `MODULE.bazel:14` googletest `1.17.0.bcr.2` against `test/googletest-1.16.0/`; benchmark `MODULE.bazel:11` googletest `1.14.0` against `cmake/GoogleTest.cmake.in:41` `GIT_TAG "v1.15.2"` | — |
| 35 | CMK-BZL-11: the grpc and protobuf generated headers | CONFIRMED | grpc `CMakeLists.txt:3` "This file has been automatically generated from a template file."; protobuf `cmake/dependencies.cmake:1` "Auto-generated by @//cmake:make_dependencies". The header grep hits both. | — |
| 36 | CMK-BZL-11: "In this corpus, generation runs Bazel → CMake only", and the header grep as the sole check | CORRECTED | `nlohmann__json@f422b753cc:cmake/scripts/gen_bazel_build_file.cmake:1-6` ("generate Bazel BUILD file … edit this script rather than BUILD.bazel"), re-run per pull request at `check_amalgamation.yml:64-72`. `BUILD.bazel:1-8` has no header, so the header grep is empty (false "hand-authored"). | A generator-name grep was added. It hits json's script and workflows, and is empty on zlib, yaml-cpp, re2 and Catch2. |
| 37 | CMK-BZL-12: re2 unversioned `find_package(absl REQUIRED)` against `abseil-cpp 20250814.1` | CONFIRMED | `google__re2@972a15cedd:CMakeLists.txt:94`; `MODULE.bazel:16` | 3.2 percent of 6,957 matches `cmake-audit/exemplar-deps-and-dual-build.md:62`; not re-counted |
| 38 | CMK-BZL-12: the single-`NAME` recipe | CORRECTED | `NAME=abseil-cpp` on re2: the Bazel grep hits `MODULE.bazel:16` and the CMake grep is empty, so it reads "no pair". The corrected `BZL_NAME` and `CMAKE_NAME` recipe hits `CMakeLists.txt:94`. yaml-cpp with `NAME=googletest`: CMake side empty. Corrected: `test/CMakeLists.txt:8 find_package(GTest)` and `:14 googletest-1.16.0`. | — |
| 39 | CMK-BZL-13: the target-name mismatches | CONFIRMED (4 of 8 re-read) | zlib `BUILD.bazel:93` `name = "z"`; json `:19` `name = "json"`; googletest `:103` `name = "gtest"`; protobuf `:400` `name = "protobuf"` | abseil and benchmark were not re-read |
| 40 | CMK-BZL-14: `BazelDeps` include file since Conan 2.30.0 (PR #20042) | CONFIRMED | `conan_deps.MODULE.bazel` occurs 0 times at tag 2.29.0 and 5 times at 2.30.0 and 2.32.0. 2.32.0 is byte-identical to develop2 `39898afdfb`. PR #20042 "[Bazel] Add support for 9.x LTS version", merged 2026-06-16, milestone 2.30.0. | develop2 is `2.33.0-dev` |
| 41 | CMK-BZL-14: the three output sets, `rules_cc 0.2.17`, "Bazel 6.x … dropped soon", `BazelToolchain` `conan_bzl.rc` / `conan-config` | CONFIRMED | `bazeldeps.py` at develop2: 411-424 (6.0 / 7.1 / 9+ docstring), 516 `bazel_dep(name = "rules_cc", version = "0.2.17")`, 558 "# Bazel 6.x, but it'll likely be dropped soon"; `toolchain.py:48-49` | — |
| 42 | CMK-BZL-14: "The `include()` form needs Bazel 9" | CORRECTED | Bazel 7.2.0 release notes: "Added a new `include()` directive to `MODULE.bazel` files" (#22204). What is Bazel-9-labelled is Conan's rules_cc extension, which the include file wires (`module_include_template` → `conan_deps_module_extension_rules_cc.bzl`). | Behaviour on Bazel 7.2 to 8.x is not measured |
| 43 | CMK-BZL-14: `include()` is root-module only | CONFIRMED | bazel.build `globals/module`: "Only the root module and modules subject to a non-registry override may use include()." | — |
| 44 | CMK-BZL-14: the Conan landing page shows only WORKSPACE | CONFIRMED | `docs.conan.io/2/integrations/bazel.html`: `MODULE.bazel` 0, `WORKSPACE` 1, `bzlmod` 0; `reference/tools/google/bazeldeps.rst` (develop2): `conan_deps.MODULE.bazel` 8 | — |
| 45 | CMK-BZL-15: vcpkg has no Bazel bridge; its only Bazel paths run the other way | CONFIRMED | `c4ee5a52d7` ls-tree: `scripts/cmake/vcpkg_find_acquire_program(BAZEL).cmake` and `versions/v-/vcpkg-tool-bazel.json` (Bazel 5.2.0 tool port; no `ports/` dir remains). `vcpkg-tool@51bf87ca6e`: 0 paths. | — |
| 46 | CMK-BZL-15: "the grep lists only `vcpkg_find_acquire_program(BAZEL).cmake`" | CORRECTED | The grep over the fully checked-out `scripts/` (890 of 890 files) also lists `scripts/test_ports/vcpkg-find-acquire-program/portfile.cmake`, whose line 18 is `vcpkg_find_acquire_program(BAZEL)` | Expected output now names two files |
| 47 | CMK-BZL-15: version cell "vcpkg-tool 2026-07-27" | CORRECTED | Releases API: vcpkg-tool `2026-09-26` published 2026-09-26T06:19Z; the release body has no "bazel" line. vcpkg `2026.07.29` is still latest. | The source is not re-grepped at the new tag |
| 48 | Current versions: Conan 2.32.0, rules_foreign_cc 0.16.0 (2026-09-15), #329 open since 2019 | CONFIRMED | Releases API `latest`: 2.32.0 (2026-08-31), 0.16.0 (2026-09-15T04:22Z); #329 `open`, 2019-10-18 | — |
| 49 | Failure mode 11: `-Werror=dev` deprecated on 4.4 | CONFIRMED | 4.4.2: "The error=dev option is deprecated. Use -Werror=author instead."; 4.3.4 prints nothing | — |
| 50 | Applied: find_ocx configure-time downloads at `ocx.cmake:738,765`; no flag writes | CONFIRMED | `ocx.cmake:738` and `:765` `file(DOWNLOAD …)`; the flags/toolchain grep is empty | — |
| 51 | Applied: the CMK-BZL-02 exemplar citations | CONFIRMED (spot) | ClickHouse `PreLoad.cmake:80` `AND NOT DEFINED CMAKE_TOOLCHAIN_FILE`; project_options `src/Vcpkg.cmake:160-161` `CACHE STRING … FORCE`; qtbase `QtAutoDetectHelpers.cmake:329-336` chainload then FORCE; modern-cpp-template `cmake/Vcpkg.cmake:19` | The arrow citation was not re-read |

## Verification commands exercised

Each command was run against a clean case and a planted violation. "Red" means the command reported the finding.

| Rule | Command | Clean | Planted | Outcome |
|---|---|---|---|---|
| CMK-BZL-01 | simulation as published (with `FULLY_DISCONNECTED=ON`) | green | FetchContent plant: **green** (cfg 0, build 0, install 0) | Could not go red: corrected |
| CMK-BZL-01 | corrected simulation (no `FULLY_DISCONNECTED`) | green (3.31.12, 4.4.2) | red: `Failed to clone`, cfg 1 | Works |
| CMK-BZL-01 | enumeration grep | empty | `CMakeLists.txt:17 FetchContent_MakeAvailable(dep)` | Works |
| CMK-BZL-02 | grep | empty | `CMakeLists.txt:2:set(CMAKE_TOOLCHAIN_FILE …)` | Works (now `-i`) |
| CMK-BZL-02 | `CALLER_TOOLCHAIN_LOADED` in configure output | 2 (loaded) | 0 | Works |
| CMK-BZL-03 | grep as published | **red** (`wrap-toolchain.cmake` `_INIT` lines) | red | False positive on clean: corrected |
| CMK-BZL-03 | corrected grep | 0 | 1 (`set(CMAKE_C_FLAGS "-O2")`); `flagsok` 1, a pass by reading | Works |
| CMK-BZL-03 | `WRAP_SEED` count | 1 | 0 | Works |
| CMK-BZL-04 | 4.4 `-Werror=install-absolute-destination` | 0 errors | `/opt/wcabs` 1; `${CMAKE_INSTALL_PREFIX}/include/extra` 1 | Works on 4.4; silent no-op on 4.3.4 |
| CMK-BZL-04 | grep as published | **red** (5 `cmake_install.cmake` lines) | red | False positive on clean: corrected |
| CMK-BZL-04 | corrected grep | 0 | 1 and 1 | Works |
| CMK-BZL-05 | `grep -rn -e "$PWD" wrap-prefix` | 0 files | 1 file (installed `wcSrc.cmake`) | Works |
| CMK-BZL-06 | symlink farm plus `find -type l -lname '/*'` | REAL_PATH fixture: none | plain `install(FILES)`: `include/wc.h` link | Works |
| CMK-BZL-08 | `install(PACKAGE_INFO` grep | `wrapclean` empty | `fx/floor` hit (guarded, a pass by reading) | Works; the guard check is a reading step |
| CMK-BZL-09 | `bazel test` grep over `.github ci tools/internal_ci` | zlib empty (none) | yaml-cpp, abseil, googletest, grpc hit | Works; exposed the yaml-cpp misclassification |
| CMK-BZL-11 | header grep | zlib empty | grpc, protobuf hit; **json empty** although generated | Misses header-less generation: corrected |
| CMK-BZL-11 | added generator-name grep (`FILE=BUILD.bazel`) | zlib, yaml-cpp, re2, Catch2 empty | json: script plus two workflows plus `Makefile` | Works |
| CMK-BZL-12 | single-`NAME` recipe | — | re2 `abseil-cpp`: **"no pair"** (wrong) | Corrected |
| CMK-BZL-12 | corrected two-name recipe | — | re2: `CMakeLists.txt:94`; yaml-cpp: `find_package(GTest)` plus `googletest-1.16.0` | Works |
| CMK-BZL-13 | reading check (publish no mapping without both greps) | — | — | Not mechanically red/green: a process rule |
| CMK-BZL-15 | `grep -rln -i -e 'bazel' "$VCPKG_ROOT/scripts"` | two files (the stated one plus the test port) | — | Expected output corrected |

## Unverifiable

- **#1129 under real Bazel.** No Bazel 9.2.0 plus rules_foreign_cc 0.16.0 run was possible without network access during the build. It stays a simulation plus the issue report, which is why CMK-BZL-06 is SHOULD.
- **`unshare -rn` on GitHub `ubuntu-24.04` runners** (Open question 2). There was no runner to test on. The host has unprivileged user namespaces.
- **"Kitware advises shipping CPS in addition to Config files"** (CMK-BZL-08 rationale). This comes from the frame's CPS mini-wave and was not re-fetched here.
- **Conan's `conan_deps.MODULE.bazel` on Bazel 7.2 to 8.x.** It is only known that `include()` exists there; whether the rules_cc-wired snippet resolves was not measured.
- **CMK-BZL-13's abseil and benchmark pairs**, and the arrow citation in CMK-BZL-02's applied row. These were not re-read.
- **vcpkg-tool 2026-09-26 source.** Only its release notes were read.
- **Build trees.** Deleting `/home/mherwig/.cache/cmake-measure-scratch/verify-bazel-seam/build` (13 MB with fixtures) was denied by the permission system. It remains on disk, not in `/tmp`.

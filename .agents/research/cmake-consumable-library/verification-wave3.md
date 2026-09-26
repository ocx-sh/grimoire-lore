---
title: Verification ledger, wave 3 — the consumable library
verifies: cmake-consumable-library.md
model: opus
date: 2026-09-26
measured_on: CMake 3.31.12, 4.3.4, 4.4.2 (ocx package exec kitware/cmake), ninja 1.13.2, gcc 15.2.1, zig c++ (Clang), pkg-config 2.3.0
---

# Verification ledger, wave 3: the consumable library

This pass tried to refute every MUST rule and every version claim in
`cmake-consumable-library.md`, including the rules the wave-3 revision
added after the wave-2 ledger (CMK-INST-21 to -24, and the new CMK-INST-15
text). It did not reuse the author's fixtures. It wrote independent ones:
a C shared library `foo` with switches for CPS, namespace, `EXPORT_NAME`,
schema, genex, absolute export destination, a public dependency and a
missing `find_dependency`, plus C++ static, C++ header-only, a dependent
CPS package `bar`, and per-rule planted lint trees.

The two scripts in the consolidation (the CMK-INST-01 round trip and the
CMK-INST-22 multi-config leg) were **extracted verbatim** from the file by
line number and run as written. The only changes were a `CMAKE_ARGS` hook on
the library's configure line, and the placeholder line that this pass
corrected.

Normative checks read the `Help/` and `Modules/` trees that ship inside each
ocx CMake package (3.31.12, 4.3.4, 4.4.2). Older floors used raw files at a
tag on gitlab.kitware.com. The Fedora change page and Conan's
`CppStdBlock` came from the web and the exemplar clone.

Scripts: `/home/mherwig/.cache/cmake-measure-scratch/verify-consumable-library/wave3/`
contains `run-rt.sh` (runs `rt.sh`), `run-mc.sh` (runs `mc.sh`),
`run-misc3.sh`, `run-cps3.sh` and `run-greps3.sh` (over `lint/bad` and
`lint/good`). Fixtures are under `src/` and fetched primary sources under
`fetched/`. The build trees (`wave3/w/`, 335 MB, and `wave3/w-old-libname/`,
42 MB, on disk, not `/tmp`) were not deleted, because the permission
system refused the `rm -rf`. They are safe to remove. This verifier's scope
allowed writes to this ledger and the consolidation only, so the sources
were not copied into `scratch/`.

**Result.** 46 claims checked. 36 confirmed. 7 corrected in place, logged as
7 revision-log entries tagged "verify wave 3". 3 are unverifiable.

## Ledger

| # | ID or claim | verdict | evidence | note |
|---|---|---|---|---|
| 1 | CMK-INST-01 (MUST): a missing `find_dependency` passes the library's build and install and fails only at the consumer's Generate step | CONFIRMED | `run-rt.sh` case `nofd`, on 3.31.12, 4.3.4 and 4.4.2: `-- Configuring done`, then `CMake Error at …/fooTargets.cmake:61 (set_target_properties)` naming `Threads::Threads` "but the target was not found", then `CMake Generate step failed`. The script exits 1. Case `clean` exits 0. | |
| 2 | CMK-INST-01 script as printed (`PKG=example … SRC=/abs/path/to/project`) | CORRECTED | The comment says the caller sets the four variables. The next line overwrites them with placeholders, so a caller's exported values are ignored and `find_package(example)` fails. That is a false red. | Both scripts now use `: "${PKG:?}" "${VER:?}" "${TARGETS:?}" "${SRC:?}"`. |
| 3 | CMK-INST-01 / -14: on ≥ 4.3 with CPS installed, the last line ends in `/cps/<pkg>`; on 3.31 in `/cmake/<pkg>` | CONFIRMED | Case `cps`: `foo_DIR:PATH=…/moved/lib64/cps/foo` on 4.3.4 and 4.4.2, `…/lib64/cmake/foo` on 3.31.12 | A package literally named `lib` resolves Config first, because `<prefix>/<name>*/` globs `lib64`. That is a fixture artefact, not a rule defect. |
| 4 | CMK-INST-01: a `LANGUAGES C` consumer is enough | CONFIRMED | The C consumer exits 0 against a C++ `STATIC` library, the same library with `target_compile_features(PUBLIC cxx_std_17)`, and a header-only `INTERFACE` library with `cxx_std_17`, on 3.31.12 and 4.4.2 | The generated `main.c` includes no header. A missing header file is not caught, but a missing include directory is: the imported target's non-existent `INTERFACE_INCLUDE_DIRECTORIES` failed configure on all three lines. |
| 5 | CMK-INST-01 note / Verdict 10: a `.cps` `requires.<dep>.hints` carries the dependency's absolute `<dep>_DIR`; step (a) is quiet when the dependency lives outside the tree | CONFIRMED | `bar.cps` on 4.3.4 and 4.4.2: `"hints" : [ "…/4.4-cps/moved/lib64/cps/foo" ]`. The step (a) grep over bar's prefix lists 0 files. | |
| 6 | CMK-INST-02 (MUST): an absolute `install(EXPORT … DESTINATION)` writes `set(_IMPORT_PREFIX "/…")` | CONFIRMED | Case `absdest` with the configure prefix equal to `$W/prefix`: `fooTargets.cmake:50:set(_IMPORT_PREFIX "/…/4.4-absdest/prefix")`. Step (a) fires first and the script exits 1 on all three lines. | |
| 7 | CMK-INST-03 (MUST): `find_dependency` forwards `QUIET` and `REQUIRED`; floor 3.0 | CONFIRMED | `Modules/CMakeFindDependencyMacro.cmake` at v3.0.0: line 30 `macro(find_dependency dep)`, lines 53-57 forward `QUIET` and `REQUIRED`. The file does not exist at v2.8.12 (HTTP 404). | |
| 8 | CMK-INST-03 verification grep | CORRECTED | A planted untemplated `cmake/install-config.cmake` holding `find_package(ZLIB REQUIRED)` gave 0 hits. The corpus has the same shape: `apache__arrow@3ad410b7b1:cpp/src/arrow/arrow-config.cmake:19` is installed by `cpp/src/arrow/CMakeLists.txt:1355`, and cmake-init's template installs `cmake/install-config.cmake`. | The grep adds `*Config.cmake`, `*-config.cmake` and `--exclude='Find*.cmake'`, and uses `find_package[[:space:]]*(`. It now finds 3 of 3 plants and 0 in the clean tree. Outside Kitware and vcpkg it adds 2 files: arrow's (real) and llvm's `LLDBConfig.cmake`, which is not installed as a Config file. |
| 9 | CMK-INST-04 (MUST): with no ConfigVersion file, a versioned request fails with "version: unknown" | CONFIRMED | `foo_FOUND=0` and `version: unknown` on 3.31.12, 4.3.4 and 4.4.2 | |
| 10 | CMK-INST-05 (MUST): `configure_file(@ONLY)` blanks `@PACKAGE_INIT@`; `configure_package_config_file` since 2.8.8 | CONFIRMED | `cmake -P`: `configure_file lines: BEFORE;;AFTER` on all three lines. `Modules/CMakePackageConfigHelpers.cmake` at v2.8.8 defines `function(CONFIGURE_PACKAGE_CONFIG_FILE`. At v2.8.7 the file does not exist (HTTP 404). | |
| 11 | CMK-INST-06 (MUST) / CMP0028 since 3.0: a bare name falls back to `-l<name>`; a `::` name must be a target | CONFIRMED | Bare `nosuchlib` configures (exit 0) and writes `-lnosuchlib`. `ns::nosuchlib` fails configure (exit 1) on all three lines. `CMP0028.rst` at 4.4.2: `INTRODUCED_IN_CMAKE_VERSION` 3.0. | |
| 12 | CMK-INST-06 post-install grep | CONFIRMED | Real non-namespaced export: 1 hit (`add_library(foo SHARED IMPORTED)`) on 3.31.12 and 4.4.2. Clean namespaced prefix and CPS prefix: 0. | |
| 13 | CMK-INST-08: `ARCH_INDEPENDENT` since 3.14; `share/` is searched with no language enabled, `lib64` is not | CONFIRMED | `CMakePackageConfigHelpers.cmake` at 4.4.2 line 204 `versionadded:: 3.14`, line 208 "compatible only if the architecture matches". A `LANGUAGES NONE` project loaded `share/cmake/foo/fooConfig.cmake` (it then failed inside `find_dependency(Threads)`, which needs a language). The same project missed `lib64`. | |
| 14 | CMK-INST-09 (MUST): `lib64` on this host; `lib/<multiarch-tuple>` on Debian under `/usr`; Fedora 45 drops five variables; page updated 2026-03-10 | CONFIRMED | Every install on this host landed in `lib64`. `GNUInstallDirs.cmake` at 4.4.2, lines 89-90 and 459-463. The Fedora wiki page, fetched 2026-09-26: "Fedora Linux 45", "Last updated: 2026-03-10", and the five `-D` options listed. | |
| 15 | CMK-INST-09 grep | CONFIRMED | 2 of 2 plants (`DESTINATION lib`, `LIB_INSTALL_DIR`/`LIB_SUFFIX`), clean 0 | It does not follow a variable (`set(D ${CMAKE_INSTALL_PREFIX}/lib/…)`). Step (b) and the 4.4 gate cover the export case. |
| 16 | CMK-INST-10 (MUST): `CMD_INSTALL_ABSOLUTE_DESTINATION` since 4.4, default ignore, child of `CMD_AUTHOR`; `-Werror=author` and `-Werror=dev` promote it on 4.4.2; all three flags are silent no-ops on 3.31.12 and 4.3.4; install to another prefix fails; `DESTDIR` works | CONFIRMED | `Help/diagnostic/CMD_INSTALL_ABSOLUTE_DESTINATION.rst` at 4.4.2: `versionadded:: 4.4`, `:default: ignore`, `:parent: CMD_AUTHOR`. `run-misc3.sh`: on 4.4.2 each of the three flags gives exit 1 with `CMake Error (install-absolute-destination)`. On 3.31.12 and 4.3.4 all three give exit 0 with no message. Install with `--prefix` elsewhere exits 1: "file cannot create directory … Maybe need / administrative privileges" (the message wraps). `DESTDIR` exits 0 with 1 file. | 4.3.4 ships no `Help/diagnostic/` directory, which is consistent with the 4.4 origin. |
| 17 | CMK-INST-10 grep | CORRECTED | Planted `DESTINATION ${CFGDIR}`, with `CFGDIR` built from `${CMAKE_INSTALL_PREFIX}`: grep 0 hits, and 3.31.12 with `-Werror=dev` exits 0. 4.4.2 with `-Werror=dev` exits 1. On all three lines the round trip's install exits non-zero, or step (a) fires. | A rule-text note now names the checks that do see through a variable. The two literal plants still give 2 of 2 hits, and the clean tree 0. |
| 18 | CMK-INST-24 (MUST): below a 3.15 floor `export(PACKAGE)` writes `~/.cmake/packages`; `CMAKE_EXPORT_NO_PACKAGE_REGISTRY=ON` stops it; at ≥ 3.15 nothing is written; `CMAKE_EXPORT_PACKAGE_REGISTRY=ON` or `cmake_policy(SET CMP0090 OLD)` restores the write; `-DCMAKE_POLICY_DEFAULT_CMP0090` is "not used"; CMP0090 since 3.15 | CONFIRMED | Throwaway `HOME`, all three lines: floor 3.5 gives 1 entry; plus `NO_PACKAGE_REGISTRY` gives 0; floor 3.15 gives 0; plus `EXPORT_PACKAGE_REGISTRY=ON` gives 1; `SET OLD` gives 1; `POLICY_DEFAULT_CMP0090=OLD` gives 0 and "not used by the project"; floor 3.25 gives 0. rapidjson's real tree (`@24b5e7a8b2`, `CMakeLists.txt:1` floor 3.5, `:218` `EXPORT( PACKAGE …)`) writes 1 entry on 3.31.12 and 4.4.2. `CMP0090.rst`: `versionadded:: 3.15`. | vcpkg `@c4ee5a52d7:scripts/cmake/vcpkg_configure_cmake.cmake:205` passes `-DCMAKE_EXPORT_NO_PACKAGE_REGISTRY=ON`. |
| 19 | CMK-INST-24 grep (`export( *package`, `-i`) | CORRECTED | It matches `export(PACKAGE_INFO`: 67 corpus occurrences (Kitware tests). It went red on a clean tree whose only call is the 4.3 build-tree `export(PACKAGE_INFO good …)`. It also missed `export (PACKAGE …)`, planted and in `gflags__gflags@bdda022e7c:CMakeLists.txt:606` (floor 3.10, behind the default-OFF `REGISTER_BUILD_DIR`). | The new pattern is two `-E` alternatives, `export[[:space:]]*\([[:space:]]*package[[:space:])]` and `…package$`. It finds 2 of 2 plants, 0 in the clean tree, and 12 corpus files instead of 58. |
| 20 | CMK-INST-13 (MUST): CPS import exists only on ≥ 4.3; the experimental gates are retired at 4.3 | CONFIRMED | With the Config files deleted, a CPS-only prefix gives `foo_FOUND=0` on 3.31.12 and `foo_FOUND=1` on 4.4.2. On 4.3.4, `install(PACKAGE_INFO)` and CPS import worked with no `CMAKE_EXPERIMENTAL_*` variable set. `Help/release/4.3.rst` at 4.4.2, lines 16-24: "Support for importing and exporting packages described using the Common Package Specification (CPS) was added." `4.1.rst:76` is the last mention of `CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO`. | Grep: 1 plant, clean 0. |
| 21 | CMK-INST-14: `find_package` picks `.cps` over Config on 4.3.4 and 4.4.2 with or without `CONFIG`; 0 adopters in the corpus | CONFIRMED | `vcons` (with `CONFIG`) and `vcons2` (without) both resolve `lib64/cps/foo` on 4.3.4 and 4.4.2. `install(PACKAGE_INFO` appears in 0 corpus files outside `Kitware__CMake`. | |
| 22 | CMK-INST-15 (MUST): a namespace mismatch (`acme::`) and a case-only mismatch (`Foo::` over `foo`) pass on 3.31 and fail on ≥ 4.3 at Generate with "the target was not found"; `EXPORT_NAME` is the safe rename | CONFIRMED | `run-rt.sh`: `cps-acme` and `cps-case` exit 0 on 3.31.12 and exit 1 on 4.3.4 and 4.4.2 (`CMake Error at CMakeLists.txt:5 (target_link_libraries)`, then `Generate step failed`). `foo.cps` holds the component key `"foo"` in both cases. `cps-ename` (`EXPORT_NAME fooimpl`, consumer `foo::fooimpl`) exits 0 on all three lines. The `.cps` component is `"fooimpl"` and the Config file creates `foo::fooimpl`. | The reading grep lists both spellings (2 lines each tree), as stated. |
| 23 | CMK-INST-16 (MUST): `custom`, `rpm`, `dpkg` and `pep440` accept only the exact version string, and anything else falls through to Config; `find_package.rst` recognises only `simple` and `custom` | CONFIRMED | `run-cps3.sh`, 4.3.4 and 4.4.2, requests 1.2.0 / 1.2 / 1.0 against 1.2.0: `simple` gives cps/cps/cps; the other four each give cps/cmake/cmake. CPS-only with an exact request is found for every schema. `find_package.rst` at 4.4.2, lines 843-849: `simple`, and `custom` "must match exactly". | The grep finds 2 of 2 plants, including a multi-line `VERSION_SCHEMA` / `rpm`, and 0 in the clean tree. |
| 24 | CMK-INST-17 (MUST): a `$<COMPILE_LANGUAGE:C>` interface genex fails configure once CPS is present, but build and install exit 0 and the `.cps` drops it; the message wraps | CONFIRMED | 4.3.4 and 4.4.2: configure=1 build=0 install=0. `FOO_C` is in `fooTargets.cmake` and 0 times in `foo.cps`. A one-line grep for "contains a generator expression" finds 0; a line ending `contains a` exists. | |
| 25 | CMK-INST-19: CMP0169 (3.30) deprecates only the one-argument form; the full-details form "remains fully supported" | CONFIRMED | `CMP0169.rst` at 4.4.2: `versionadded:: 3.30`, and the note quoted | |
| 26 | CMK-INST-20: `FILE_SET` install since 3.23 | CONFIRMED | `install.rst` at 4.4.2 line 248 | |
| 27 | CMK-INST-21 (MUST): with one file name, the Release install overwrites Debug and step (d) prints the shared path; `CMAKE_DEBUG_POSTFIX=d` gives distinct files and an empty scan | CONFIRMED | `mc.sh`, extracted verbatim, on 3.31.12, 4.3.4 and 4.4.2. Without a postfix: exit 1, `dup.txt` = `"${_IMPORT_PREFIX}/lib64/libfoo.so.1.2.0"`. With `d`: exit 0, prefix holds `libfood.so.1.2.0` and `libfoo.so.1.2.0`. `fmtlib__fmt@522e2c12ab:CMakeLists.txt:112,271` and `jbeder__yaml-cpp@1e0876c671:CMakeLists.txt:123-124` read as cited. 15 repos outside Kitware and vcpkg mention `DEBUG_POSTFIX`. | |
| 28 | CMK-INST-22: Ninja Multi-Config needs `CMAKE_MAKE_PROGRAM` when ninja is off `PATH`; with no map a Release consumer borrows Debug; a self-pinned map fails when Release is missing and passes when it is present; an empty map fails even when Release is installed | CONFIRMED | All three lines: with ninja off `PATH`, "CMAKE_MAKE_PROGRAM is not set", exit 1. Debug-only install: no map gives configure=0 build-Release=0; pinned gives configure exit 1. Debug+Release: pinned exits 0 (the `d` leg); empty `RELEASE` map exits 1 with "IMPORTED_LOCATION or IMPORTED_IMPLIB not set". A CPS-installed Debug-only prefix on 4.3.4 and 4.4.2 behaves the same (pinned 1, no map 0/0). | `IMPORTED_LOCATION.rst:30-32` and `MAP_IMPORTED_CONFIG_CONFIG.rst:15-17` at 4.4.2 read as quoted. |
| 29 | CMK-INST-23 rule text and verification: "name a `RUNTIME DESTINATION` whenever you name `ARCHIVE` or `LIBRARY`" | CORRECTED | `install.rst` at 4.4.2, lines 283-289: "if neither `RUNTIME` nor `ARCHIVE` destinations are specified, both … are installed to their default destinations". A `LIBRARY`-only call therefore ships the DLL to `bin`. | Normative only (no Windows host). The rule and the finding now key on `ARCHIVE` without `RUNTIME`. |
| 30 | CMK-INST-23 version claims: `RUNTIME_DEPENDENCY_SET` and `$<TARGET_RUNTIME_DLLS>` 3.21, `$<TARGET_RUNTIME_DLL_DIRS>` 3.27, CMP0207 4.3; `TARGET_RUNTIME_DLLS` is empty on non-DLL platforms and an error on other target types | CONFIRMED | `install.rst` `versionadded:: 3.21` (lines 428, 439, 1134). `cmake-generator-expressions.7.rst` at 4.4.2, lines 3324-3334 and 3364-3366. `CMP0207.rst`: `versionadded:: 4.3`. | |
| 31 | CMK-INST-23: on Linux `RUNTIME_DEPENDENCY_SET` copies the library and CMP0207 raises no warning under the gate | CONFIRMED | `rtd` fixture, configured with `-Werror=dev` (3.31.12, 4.3.4) or `-Werror=author` (4.4.2): configure 0, 0 `CMP0207` lines, install 0, `lib64/libfoo.so.1.2.0` copied | Install was re-run separately. The first run printed `install=1`, which was the exit code of an echo's command substitution. |
| 32 | CMK-TGT-01 (MUST): keywords since 2.8.12; plain signature "transitive by default" | CONFIRMED | `Source/cmTargetLinkLibrariesCommand.h` at v2.8.12, lines 117-118: `<PRIVATE\|PUBLIC\|INTERFACE>`. At v2.8.11 the header has no such signature. `target_link_libraries.rst` at 4.4.2 line 181. | |
| 33 | CMK-TGT-01 rationale: "The keyword-less legacy forms are 'for compatibility only'" | CORRECTED | `target_link_libraries.rst` at 4.4.2: lines 197 and 221 attach "This signature is for compatibility only" to the `LINK_PUBLIC`/`LINK_PRIVATE` and `LINK_INTERFACE_LIBRARIES` signatures. The keyword-less signature (lines 175-186) carries no such label. | The MUST stands on the transitive default. The spot-check grep also gained `[[:space:]]*` (`target_link_libraries (`: 194 lines in Kitware's tree). |
| 34 | CMK-TGT-05 (MUST) floors: `cxx_std_17` 3.8, 20 3.12, 23 3.20, 26 3.30; `CXX_STANDARD 26` 3.25 | CONFIRMED | `Help/release/3.8.rst:58-60` ("aware of C++ 17 … the `cxx_std_17` meta-feature"). `3.12.rst:252`, `3.20.rst:30`. `3.30.rst:36-42`: `cxx_std_26` "first documented by CMake 3.25, but were not fully implemented". `CXX_STANDARD.rst` at 4.4.2: `26` `versionadded:: 3.25`. | `cxx_std_17` was unverifiable in wave 2 and is now confirmed. |
| 35 | CMK-TGT-05: a library's plain `set(CMAKE_CXX_STANDARD)` shadows the value a Conan toolchain passes in | CONFIRMED | `conan-io__conan@39898afdfb:conan/tools/cmake/toolchain/blocks.py:316-337`: `CppStdBlock` writes `set(CMAKE_CXX_STANDARD {{ cppstd }})` and a `variable_watch` that only prints "has been modified". Measured on 4.4.2 with a toolchain file setting 20: `-std=gnu++20`; with the project also setting 17: `-std=gnu++17`. | Unverifiable in wave 2, now confirmed. No Conan binary was run; the toolchain file stands in for Conan's generated block. |
| 36 | CMK-TGT-06 (MUST): "decay" quote, floor 3.1 | CONFIRMED | `CXX_STANDARD_REQUIRED.rst` at 4.4.2: `versionadded:: 3.1`, line 11 | |
| 37 | CMK-TGT-06 (and -07) pipeline | CORRECTED | `set\(CMAKE_CXX_STANDARD` misses `set (CMAKE_CXX_STANDARD 20)`: a planted file was not listed. In the corpus, 11 files use that spelling and 10 of them lack `_REQUIRED` (6 in ClickHouse `contrib/`, 4 in Hunter `examples/`). | The new pattern `set[[:space:]]*\(…` lists 2 of 2 plants and 0 in the clean tree. |
| 38 | CMK-TGT-07: `CMAKE_CXX_STANDARD_EXTENSIONS` does not exist; extensions default ON | CONFIRMED | `--help-variable CMAKE_CXX_STANDARD_EXTENSIONS` exits 1 on all three lines, and `CMAKE_CXX_EXTENSIONS` exits 0. With no extensions setting, the compile line has `-std=gnu++20` (row 35 fixture). | |
| 39 | CMK-TGT-08: `file.rst` quotes; `CONFIGURE_DEPENDS` since 3.12 | CONFIRMED | `file.rst` at 4.4.2, lines 361, 368 and 372 | |
| 40 | CMK-TGT-09 (MUST): variable, property and `--compile-no-warning-as-error` since 3.24; the CLI disables the property but not a literal `-Werror` | CONFIRMED | `versionadded:: 3.24` on all three. With `--compile-no-warning-as-error`: property build exit 0, literal build exit 2, on all three lines. Control without the flag: property build exit 2. | |
| 41 | Verdict 2: `cmake-packages(7)`'s relocation section never mentions the `install(EXPORT)` destination | CONFIRMED | `cmake-packages.7.rst` at 4.4.2, lines 475-530: only the `$<INSTALL_INTERFACE>` include-path example; no `DESTINATION` or absolute-destination text | |
| 42 | Verdict 7 / find_ocx: `LANGUAGES NONE` misses a `lib64` Config package through `<Pkg>_ROOT` and `CMAKE_PREFIX_PATH` | CONFIRMED | `foo_FOUND=0` for both on 3.31.12 and 4.4.2; `LANGUAGES C` gives `foo_FOUND=1` for both | |
| 43 | Configure gate: `-Werror=author` works on 4.4 and is a silent no-op on 3.31 and 4.3 | CONFIRMED | Row 16: 3.31.12 and 4.3.4 exit 0 with no message. `CMD_AUTHOR.rst`: `versionadded:: 4.4`. | This group relies on the definition. The versions group owns it. |
| 44 | CMK-INST-11 Apple `@loader_path` spelling | UNVERIFIABLE | No macOS host | Already marked "documented, not measured" |
| 45 | CMK-INST-23 Windows behaviour (DLL placement, CMP0207 on Windows paths, VS multi-config) | UNVERIFIABLE | No Windows host. Only the normative text was read (rows 29 and 30). | |
| 46 | Corpus shares in rule rationales (13.3 %, 245/446 aliases, 43/136 setter files, the 33/27/9 `COMPATIBILITY` split, 0 of 12 `.pc.in`) | UNVERIFIABLE | Not re-measured. Counts that were re-measured: 15 `DEBUG_POSTFIX` repos (match), 0 CPS adopters (match), 10 extra unpaired setter files (row 37). | Not version claims |

CMK-INST-12 (SHOULD) was also re-run: `file(RELATIVE_PATH)` gives `../..` for
`lib64` and `../../..` for `lib/x86_64-linux-gnu` on 3.31.12 and 4.4.2.
pkg-config 2.3.0 prints the unnormalised `…/pkgconfig/../../..`. `realpath`
of that is the moved prefix. A fixed `../..` resolves to `<prefix>/lib`. All
of this confirms the rule as written.

## Verification commands exercised

`run-greps3.sh` runs each command in `lint/bad` (planted) and `lint/good`
(clean). Unless the row says otherwise, empty output means pass.

| Command | Planted | Clean | Outcome |
|---|---|---|---|
| INST-01 round-trip script (verbatim) | `nofd` exit 1 at consumer Generate; `absdest` exit 1 at install (default prefix) or step (a); `cps-acme`/`cps-case` exit 1 on 4.3.4 and 4.4.2; `cps-genex` exit 1 at configure on 4.3.4 and 4.4.2 | `clean`, `cps`, `cps-ename`, `cxx-static`, `cxxfeat` and `cxxhdr` exit 0 on all three lines | Goes red and stays green. The placeholder line needed correcting. |
| INST-02, step (b) | 1 hit (`fooTargets.cmake:50`) | 0 | Works |
| INST-03, old globs | 1 of 3 plants (missed untemplated and spaced) | 0 | Corrected |
| INST-03, new | 3 of 3 | 0 | Works |
| INST-05 listing | lists both templates | lists 1 | Reading list, as stated |
| INST-06 post-install grep | 1 (`add_library(foo SHARED IMPORTED)`) | 0 (Config and CPS prefixes) | Works |
| INST-09 | 2 of 2 literal plants | 0 | Works; blind to variables |
| INST-10 grep | 2 of 3 plants (misses `${CFGDIR}`) | 0 | Note added. The 4.4 gate catches the third, exit 1. |
| INST-10 `-Werror=install-absolute-destination`, `=author`, `=dev` | exit 1 on 4.4.2; exit 0 on 3.31.12 and 4.3.4 | exit 0 | Works on 4.4 only, as claimed |
| INST-13 gate grep | 1 | 0 | Works |
| INST-15 reading grep | 2 lines | 2 lines | Reading heuristic, as stated |
| INST-16 | 2 of 2 (one multi-line) | 0 | Works |
| INST-17 configure exit code | exit 1 | exit 0 (`WITH_GENEX=OFF`) | Works; a one-line log grep does not |
| INST-21 step (d) | 1 duplicate path, exit 1 | empty with postfix `d`, exit 0 | Works on 3.31.12, 4.3.4 and 4.4.2 |
| INST-22 step (e) | Debug-only install: consumer configure exit 1 | Debug+Release: exit 0 | Works, including with CPS installed |
| INST-24, old | 1 of 2 plants (missed `export (PACKAGE`) | **1** (`export(PACKAGE_INFO`) | Corrected: it was red on clean input |
| INST-24, new | 2 of 2 | 0 | Works |
| TGT-01 spot check, old / new | 1 / 2 plants among listed lines | listing | Reading heuristic; new grep sees `target_link_libraries (` |
| TGT-04 | 1 | 0 | Works |
| TGT-05 | 2 hits to read | 2 hits to read (guarded) | Reading heuristic, as stated |
| TGT-06, old / new | 1 / 2 of 2 files | 0 / 0 | Corrected |
| TGT-07, old / new | 1 / 2 of 2 files | 0 / 0 | Corrected with TGT-06 |
| TGT-09 | 1 | 0 | Works |

## Unverifiable

- **Apple `@loader_path` (CMK-INST-11).** There is no macOS host. The rule
  already calls it documented, not measured.
- **Windows (CMK-INST-23, Verdict 10).** There is no Windows host.
  Measurement cannot show whether a DLL lands in `bin`, whether CMP0207
  warns on Windows-path filters, or what the Visual Studio multi-config leg
  does. Only `install.rst` was read. The consolidation's Open questions
  already carry this.
- **Corpus shares** (13.3 %, 245 of 446, 43 of 136, 33/27/9, 0 of 12). These
  are not version claims and were not re-measured. The counts that were
  re-measured agree.

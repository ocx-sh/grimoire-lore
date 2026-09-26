---
title: Verification ledger, wave 2 — the consumable library
verifies: cmake-consumable-library.md
model: opus
date: 2026-09-26
measured_on: CMake 3.31.12, 4.3.4, 4.4.2 (ocx package exec kitware/cmake), gcc 15.2.1, zig c++ (Clang), Unix Makefiles, pkg-config 2.3.0
---

# Verification ledger, wave 2: the consumable library

This ledger re-checks every MUST rule and every version claim in
`cmake-consumable-library.md`. Checks use the local binaries where a small
project settles the question, and the primary source (CMake's `--help-*`
output on the local binaries, or raw files at a tag on gitlab.kitware.com)
where one does not.

All scripts are in `/home/mherwig/.cache/cmake-measure-scratch/verify-consumable-library/`.
Each one re-runs as written: `run-roundtrip.sh` (runs `roundtrip.sh`),
`run-cps.sh`, `run-misc.sh`, `run-ext.sh`, `run-find.sh`, `run-werror.sh`
and `make-fixtures.sh` followed by `run-greps.sh`. Build trees were
deleted afterwards. The sources, the lint fixtures and the help dumps
remain.

The verifier's scope allowed changes to this ledger and the consolidation
only, so the scratch sources were not copied into `scratch/`.

**Result.** 34 claims were checked. 23 are confirmed. 11 were corrected in
place, as 9 revision-log entries. 4 sub-claims could not be verified.

## Ledger

| # | ID or claim | verdict | evidence | note |
|---|---|---|---|---|
| 1 | CMK-INST-01 (MUST): a missing `find_dependency` fails only in the downstream consumer | CONFIRMED | `run-roundtrip.sh` case `dep-nofd`, on 3.31.12, 4.3.4 and 4.4.2. The library's configure, build and install all exit 0. The consumer fails with "The link interface of target "dep::dep" contains: base::base but the target was not found … CMake Generate step failed". | The consumer's `main.c` references no library symbol. A static archive whose interface omits a needed link library would therefore still pass. The `LANGUAGES C` consumer did work against a static C++ library carrying `cxx_std_17` on all three lines (case `cx-clean-langC`). |
| 2 | CMK-INST-01: on ≥ 4.3 with CPS installed, `<pkg>_DIR` ends in `/cps/<pkg>` | CONFIRMED | `run-cps.sh` prints `dep_DIR:PATH=…/lib64/cps/dep` on 4.3.4 and 4.4.2 | |
| 3 | CMK-INST-02 (MUST): an absolute `install(EXPORT … DESTINATION)` bakes `set(_IMPORT_PREFIX "/…")` into the export | CONFIRMED | Case `cx-abs` on all three lines writes `cxTargets.cmake:50:set(_IMPORT_PREFIX "/…/prefix")`. The relative clean case produces no hit. | The script goes red at step (a), the leak grep, before it reaches step (b). |
| 4 | CMK-INST-03 (MUST): a raw `find_package(X REQUIRED)` in a Config file is fatal even when the consumer asked `QUIET`; `find_dependency` forwards `QUIET` and `REQUIRED` | CONFIRMED | `run-find.sh`: `find_package(qraw QUIET)` exits 1 on all three lines. `find_package(qfd QUIET)` exits 0 with `qfd_FOUND=0`. `CMakeFindDependencyMacro` doc: "parameters for QUIET and REQUIRED which were passed to" the original call. | |
| 5 | CMK-INST-03 floor: `find_dependency` since 3.0 | CONFIRMED | `Modules/CMakeFindDependencyMacro.cmake` at v3.0.0 defines `macro(find_dependency dep)` and forwards `QUIET` and `REQUIRED` | |
| 6 | CMK-INST-03 verification grep | CORRECTED | 8 of the 163 corpus Config templates escape the globs. Two of them are nlohmann/json's and gflags's `cmake/config.cmake.in`. A planted `config.cmake.in` gave 0 hits with the old globs and 1 with the new ones. | `*-config.cmake.in` was replaced with `*config.cmake.in`. |
| 7 | CMK-INST-04 (MUST): without a ConfigVersion file, every versioned request fails with "version: unknown" | CONFIRMED | Case `cx-nover` fails on 3.31.12, 4.3.4 and 4.4.2 with "…/cxConfig.cmake, version: unknown" | |
| 8 | CMK-INST-05 (MUST): only `configure_package_config_file` expands `@PACKAGE_INIT@`; through `configure_file(@ONLY)` it becomes empty | CONFIRMED | `run-misc.sh`: `configure_file` output is `BEFORE`, an empty line, then `AFTER`. `configure_package_config_file` output is 27 lines. Same on all three lines. | |
| 9 | CMK-INST-05 floor: `configure_package_config_file` since 2.8.12 | CORRECTED | `Modules/CMakePackageConfigHelpers.cmake` at v2.8.8 already defines `function(CONFIGURE_PACKAGE_CONFIG_FILE …)` | The floor is now 2.8.8. The change is harmless under the 3.25 floor. |
| 10 | CMK-INST-05 verification grep (`--include='*.cmake.in'`) | CORRECTED | curl's `CMake/curl-config.in.cmake:24` holds `@PACKAGE_INIT@` and the old glob misses it. A planted `bad-config.in.cmake` was found only once `--include='*.in.cmake'` was added. | |
| 11 | CMK-INST-06 (MUST) / CMP0028: a bare name falls back to `-l<name>`; a `::` name must be a target; the policy dates from 3.0 | CONFIRMED | `run-misc.sh`: `link.txt` holds `-lnosuchlib`, and `ns::nosuchlib` fails configure on all three lines. `--help-policy CMP0028`: "introduced in CMake version 3.0", with OLD removed in 4.0. | |
| 12 | CMK-INST-08: `ARCH_INDEPENDENT` since 3.14; without it the pointer size must match; `share/` is searched with no language enabled, `lib64` is not | CONFIRMED | `CMakePackageConfigHelpers` doc at 4.4.2: `versionadded:: 3.14`, "compatible only if the architecture matches exactly". `run-find.sh` under `LANGUAGES NONE`: `pshare` found (`FOUND=1`) and `plib64` not (`FOUND=0`) on all three lines. | |
| 13 | CMK-INST-09 (MUST): `CMAKE_INSTALL_LIBDIR` is `lib64` on this host and `lib/<multiarch-tuple>` on Debian with `/usr`; Fedora 45 drops five variables (page updated 2026-03-10) | CONFIRMED | Every install on this host landed in `lib64`. `GNUInstallDirs` doc at 4.4.2: "On Debian, this may be lib/<multiarch-tuple> when CMAKE_INSTALL_PREFIX is /usr". The Fedora page names Fedora Linux 45, the five variables, and "Last Updated 2026-03-10". | |
| 14 | CMK-INST-09 verification grep | CORRECTED | The planted `install(TARGETS bad DESTINATION lib)` gave 0 hits, because only `DESTINATION lib64` was matched. `ORIGIN/../lib"` also misses `$ORIGIN/../lib)`. | The new grep matches `DESTINATION lib`, `DESTINATION "lib` and `ORIGIN/../lib`. It found 4 of 4 plants and nothing in the clean tree. |
| 15 | CMK-INST-10 (MUST): `CMD_INSTALL_ABSOLUTE_DESTINATION` exists since 4.4 and is ignored by default; `-Werror=install-absolute-destination` does nothing on 3.31/4.3; install to another prefix fails with "Maybe need administrative privileges"; `DESTDIR` still works | CONFIRMED | `cmake-diagnostics(7)` at 4.4.2: `versionadded:: 4.4`, `:default: ignore`, `:parent: CMD_AUTHOR`. With no flag, configure exits 0 on 4.4.2. With the flag it exits 1 with "CMake Error (install-absolute-destination)". On 3.31.12 and 4.3.4 it exits 0. The install message was seen as written, and the `DESTDIR` staging install wrote the payload. | Refined: on 4.4.2, `-Werror=author` and `-Werror=dev` also fail it, so the configure gate covers this rule. |
| 16 | CMK-INST-10 verification grep | CORRECTED | The planted `DESTINATION ${CMAKE_INSTALL_PREFIX}/include` gave 0 hits with the old grep and 1 with the new pattern. The clean tree gave 0 hits with both. | |
| 17 | CMK-INST-11: with no `INSTALL_RPATH`, the installed binary has no RUNPATH and fails after `mv`; `$ORIGIN/../${CMAKE_INSTALL_LIBDIR}` survives | CONFIRMED | `run-find.sh` on 3.31.12 and 4.4.2 prints "Set non-toolchain portion of runtime path of …". Without the RPATH: no RUNPATH, and "libbase.so.1: cannot open shared object file". With it: `RUNPATH [$ORIGIN/../lib64]`, and the binary prints `42`. | The Apple spelling was not measured. |
| 18 | CMK-INST-12: a `${pcfiledir}`-relative `.pc` resolves after the prefix moves | CONFIRMED | pkg-config 2.3.0 prints `…/pc-4.4-moved/lib64/pkgconfig/../..` | |
| 19 | CMK-INST-12 verification (hard-coded `lib64/pkgconfig`) | CORRECTED | This contradicts the `GNUInstallDirs` Debian path quoted in #13. On a multiarch layout the check fails for a reason unrelated to the rule. | The path now uses the configured libdir. |
| 20 | CMK-INST-13 (MUST): CPS import exists only on ≥ 4.3; the two `CMAKE_EXPERIMENTAL_*` gates were retired at 4.3.0; `CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO` is for distributors | CONFIRMED | The `Help/release/4.3.rst` release notes at v4.3.0 say "Support for importing and exporting packages described using the Common Package Specification (CPS) was added", with no gate. `install(PACKAGE_INFO)` and `.cps` import work on 4.3.4 with no gate set (`run-cps.sh`). A 3.31.12 consumer resolves the Config file. The era re-check lists 6 live gates, and neither name is among them. The variable is `versionadded:: 4.3`, and `install.rst` says "For distributors". | |
| 21 | CMK-INST-14: on 4.3.4 and 4.4.2 `find_package` picks `.cps` over `depConfig.cmake`, with or without `CONFIG` | CONFIRMED | `run-cps.sh`: all three request forms resolve `…/lib64/cps/dep` on both lines. A 3.31.12 consumer gets `…/lib64/cmake/dep`. `find_package.rst` at 4.4.2: "tend to prefer CPS files". | Per that doc, the `CONFIGS` keyword suppresses CPS. |
| 22 | CMK-INST-15 (MUST): `install(PACKAGE_INFO dep)` over an `acme::` export gives no diagnostic; `acme::dep` works on 3.31 and fails on ≥ 4.3 | CONFIRMED | Export configure exits 0 with 0 warnings. The consumer linking `acme::dep` exits 0 on 3.31.12 (Config) and exits 1 on 4.3.4 and 4.4.2 (`.cps`) with 'Target "c" links to: acme::dep'. | |
| 23 | CMK-INST-16: `rpm`, `dpkg` and `pep440` reject every version request, "even an exact match"; `custom` is safe | CORRECTED | `run-cps.sh` on 4.3.4 and 4.4.2, for each of `custom`, `rpm`, `dpkg` and `pep440`: `find_package(dep 1.2 CONFIG)` falls through to `…/cmake/dep`, while `find_package(dep 1.2.0 CONFIG)` and the unversioned request resolve `…/cps/dep`. `find_package.rst`: only `simple` and `custom` are recognised, and `custom` "must match exactly". | `custom` fails exactly like the other three, so the rule now allows only `simple` or no schema. The grep flags any schema other than `simple`. |
| 24 | CMK-INST-17 (MUST): a `$<COMPILE_LANGUAGE:C>` interface genex is fatal at configure once CPS is present, yet build and install exit 0 and the `.cps` drops the property | CONFIRMED | 4.3.4 and 4.4.2 give configure=1, build=0, install=0. The `.cps` has 0 `DEP_C_ONLY_DEFINE` hits and `depTargets.cmake` has 1. | |
| 25 | CMK-INST-17 verification ("a non-zero exit that cites 'contains a generator expression'") | CORRECTED | The log reads `…of target "dep" contains a` / `generator expression.  This is not allowed.` over two lines, so a one-line grep returned nothing. | The check is now the exit code alone. |
| 26 | CMK-INST-19: the direct `FetchContent_Populate(… URL …)` form is deprecated by CMP0169 (3.30) | CORRECTED | `--help-policy CMP0169` on 3.31.12 and 4.4.2: "Calling FetchContent_Populate() with the full population details … remains fully supported. Only the form calling FetchContent_Populate() with a single argument … is deprecated". cmake_template@b86318a `cmake/PackageProject.cmake:158,179` uses the full-details form. | The rule stands on its other grounds: a network fetch at configure time, and a third-party packaging contract. The floor is now "any". |
| 27 | CMK-INST-20: `FILE_SET` install since 3.23 | CONFIRMED | `install.rst` at 4.4.2: `FILE_SET <set-name>` `versionadded:: 3.23` | |
| 28 | CMK-TGT-01 (MUST): doc quotes and the 2.8.12 keyword floor | CONFIRMED | `target_link_libraries` doc at 4.4.2, lines 194, 210 and 232 ("transitive by default", "for compatibility only"). `cmTargetLinkLibrariesCommand.h` at v2.8.11 documents only `LINK_PUBLIC` and `LINK_PRIVATE`. At v2.8.12 it documents "The PUBLIC, PRIVATE and INTERFACE keywords". | |
| 29 | CMK-TGT-05 (MUST) floors: `cxx_std_20` 3.12, `cxx_std_23` 3.20, `cxx_std_26` 3.25 | CORRECTED (26 only) | `--help-property CMAKE_CXX_KNOWN_FEATURES` on 4.4.2 and 3.31.12: `cxx_std_20` 3.12, `cxx_std_23` 3.20, `cxx_std_26` `versionadded:: 3.30`. `CXX_STANDARD` value `26` is `versionadded:: 3.25`. | This mixed up the property value and the compile feature. `cxx_std_26` needs a gate under the 3.25 floor. |
| 30 | CMK-TGT-06 (MUST): the "decay" quote and the 3.1 floor; grep pipeline | CONFIRMED | `--help-property CXX_STANDARD_REQUIRED` on 4.4.2: `versionadded:: 3.1`, 'may "decay" to a previous standard'. The pipeline listed the planted file and nothing in the clean tree. | Upper-case `SET(` is missed. Across the corpus the case-insensitive variant finds the same 233 files, so the old grep was kept. |
| 31 | CMK-TGT-07: `CMAKE_CXX_STANDARD_EXTENSIONS` does not exist; extensions default ON (`-std=gnu++NN`); floor 3.1 | CONFIRMED | `--help-variable CMAKE_CXX_STANDARD_EXTENSIONS` exits 1 on all three lines. `run-ext.sh` with Clang: `-std=gnu++20` by default and `-std=c++20` with `CMAKE_CXX_EXTENSIONS=OFF`, on 3.31.12 and 4.4.2. `CXX_EXTENSIONS` is `versionadded:: 3.1`. | When the requested standard equals the compiler default (17 for this Clang), CMake adds no `-std` flag. |
| 32 | CMK-TGT-08: `file.rst` quotes; `CONFIGURE_DEPENDS` since 3.12 | CONFIRMED | `file` doc at 4.4.2, lines 358, 365 and 369 | |
| 33 | CMK-TGT-09 (MUST): `CMAKE_COMPILE_WARNING_AS_ERROR` since 3.24; `--compile-no-warning-as-error` disables the property but not a literal flag | CONFIRMED | Variable and property are both `versionadded:: 3.24`. `run-werror.sh` on 3.31.12 and 4.4.2 under the override: the property target gets `CXX_FLAGS =` (empty), and the literal target keeps `CXX_FLAGS = -Werror`. | |
| 34 | Failure mode 12: `export(PACKAGE)` writes nothing to the registry by default since 3.15 (CMP0090); find_ocx's `LANGUAGES NONE` blindness to `lib64` through `<Pkg>_ROOT` | CONFIRMED | `--help-policy CMP0090`: `versionadded:: 3.15`, "does nothing unless an explicit CMAKE_EXPORT_PACKAGE_REGISTRY". `run-find.sh`: `plib64_ROOT` gives `FOUND=0` under `NONE` and `FOUND=1` under `C`, on 3.31.12, 4.3.4 and 4.4.2. | |

## Verification commands exercised

`make-fixtures.sh` builds a planted-violation tree (`lint/bad`) and a clean
tree (`lint/good`). `run-greps.sh` runs each command in both trees. For
every grep below, empty output means pass.

| Command | Planted tree | Clean tree | Outcome |
|---|---|---|---|
| INST-01 round-trip script | `cx-abs` failed at (a), `cx-nover` failed at the consumer configure, `dep-nofd` failed at the consumer Generate step (all exit 1). `cx-nons` exits 0 (expected: the INST-06 grep catches it). | `base-clean`, `cx-clean-*` and `dep-clean` exit 0 on all three lines | Goes red and stays green as claimed |
| INST-02, step (b) | 1 hit (`cxTargets.cmake:50`) | 0 | Works |
| INST-03, old globs | 2 of 3 plants | 0 | Misses `config.cmake.in`, now corrected |
| INST-03, new globs | 3 of 3 | 0 | Works |
| INST-05, old globs | 2 of 3 plants | 1 (a listing, to be read) | Misses `*.in.cmake`, now corrected |
| INST-05, new globs | 3 of 3 | 1 (a listing, to be read) | Works as a reading list |
| INST-06 (`add_library(` without `::`) | 1 hit (`add_library(cx STATIC IMPORTED)`) | 0 | Works |
| INST-08 | listing | listing | Reading heuristic only |
| INST-09, old | 3 of 4 plants (misses `DESTINATION lib`) | 0 | Corrected |
| INST-09, new | 4 of 4 | 0 | Works |
| INST-10, old | 1 of 2 plants (misses `${CMAKE_INSTALL_PREFIX}`) | 0 | Corrected |
| INST-10, new | 2 of 2 | 0 | Works |
| INST-10, `-Werror=install-absolute-destination` | exit 1 on 4.4.2; exit 0 on 3.31.12 and 4.3.4 | exit 0 | Works on 4.4 only, as claimed |
| INST-12, `.pc.in` grep | 1 | 0 | Works |
| INST-13, gate grep | 1 | 0 | Works |
| INST-13, `install(PACKAGE_INFO` listing | 1 | 1 | Reading heuristic only |
| INST-16, old | 1 of 2 plants (misses `custom`) | 0 | Corrected |
| INST-16, new | 2 of 2 | 0 | Works |
| INST-17 (configure exit code) | exit 1 | exit 0 (`DEP_GENEX=OFF`) | Works. A grep of the log for the phrase does not. |
| INST-18 (the two workflow greps) | first grep 1 hit, second grep 0: finding | 1 and 1 | Works |
| INST-19 | 1 | 0 | Works |
| TGT-01 spot check | a hit to read | a hit to read | Reading heuristic, as stated |
| TGT-03 | 1 | 0 | Works |
| TGT-04 | 1 | 0 | Works |
| TGT-05 | 3 hits to read | 2 hits to read (guarded) | Reading heuristic, as stated |
| TGT-06 | 1 file | 0 | Works. Upper-case `SET(` is missed, but the corpus has no instance. |
| TGT-07 (`-L` pipeline and wrong-name grep) | 1 and 1 | 0 and 0 | Works |
| TGT-08 | 1 | 0 | Works |
| TGT-09 | 1 | 0 | Works |
| Failure mode 12 (`export( *package`) | 1 | 0 | Works |

## Unverifiable

- **`cxx_std_17` since 3.8 (CMK-TGT-05).** The 4.4.2 and 3.31.12 docs carry
  no `versionadded` note for it, and no binary older than 3.31 is available
  on this host. The value was left unchanged.
- **The Conan `compiler.cppstd` claim (CMK-TGT-05 rationale).** It says a
  `set(CMAKE_CXX_STANDARD)` in a library shadows the value a Conan
  toolchain injects. No Conan run or Conan source was checked here; the
  claim rests on topic-map conflict 11.
- **The Apple `@loader_path` spelling (CMK-INST-11).** The consolidation
  already marks it as documented, not measured. There is no macOS host.
- **Corpus counts** (13.3 %, 245 of 446 aliases, 43 of 136 setter files,
  the 33/27/9 `COMPATIBILITY` split, 0 of 12 `.pc.in` files). These are
  not version claims and were not re-measured. The one re-count made here
  found 233 `set(CMAKE_CXX_STANDARD` files across the whole corpus, where
  the consolidation says 136. That count is scoped differently (it includes
  vendored code), so the discrepancy is left for the consolidation's owner.

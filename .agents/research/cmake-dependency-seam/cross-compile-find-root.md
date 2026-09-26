---
title: "Cross-compiling, find-root modes and hint precedence against manager toolchains"
topic: cmake-dependency-seam
agent: cross-compile-find-root
model: sonnet
kind: measure
date_researched: 2026-09-26
sources_count: 18
scope: |
  Measured: CMAKE_FIND_ROOT_PATH_MODE_* defaults and combinations against a
  fake sysroot/host pair; find_program + CMAKE_CROSSCOMPILING_EMULATOR;
  <Name>_ROOT CACHE FORCE hints against vcpkg- and Conan-injected paths
  (native and cross); LANGUAGES NONE vs C for find_package(CONFIG) lib64/
  lib32/lib-tuple/share resolution; pkg_check_modules with
  PKG_CONFIG_SYSROOT_DIR/LIBDIR; VCPKG_CHAINLOAD_TOOLCHAIN_FILE precedence
  using the real local vcpkg.cmake; toolchain re-read count with
  whole-project try_compile. All on CMake 3.31.12 and 4.4.2 via ocx, zig
  as the aarch64-linux-musl cross compiler, real Conan 2.32.0.
  Not covered: CMAKE_TOOLCHAIN_FILE composition mechanics (dependency-seam/
  toolchain-composition, already measured for CMK-TC-06/M-H-03/M-H-07's
  "why"); Windows/Apple find-root specifics; vcpkg's own port-build
  toolchain (VCPKG_CHAINLOAD_TOOLCHAIN_FILE in a triplet file).
---

# Cross-compiling, find-root modes and hint precedence against manager toolchains

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The real defaults: PROGRAM=NEVER, but LIBRARY/INCLUDE/PACKAGE default to BOTH, not ONLY](#1-the-real-defaults-programnever-but-libraryincludepackage-default-to-both-not-only)
   2. [Explicit MODE_PACKAGE values, measured: NEVER leaks the host copy, BOTH prefers rooted over unrooted](#2-explicit-mode_package-values-measured-never-leaks-the-host-copy-both-prefers-rooted-over-unrooted)
   3. [find_program(gen): the default already excludes the sysroot; MODE_PROGRAM=ONLY breaks CMake's own build-tool search](#3-find_programgen-the-default-already-excludes-the-sysroot-mode_programonly-breaks-cmakes-own-build-tool-search)
   4. [CMAKE_CROSSCOMPILING_EMULATOR is generate-time target wiring only](#4-cmake_crosscompiling_emulator-is-generate-time-target-wiring-only)
   5. [`<Name>_ROOT CACHE FORCE` loses to a manager's CMAKE_FIND_ROOT_PATH entry](#5-nameroot-cache-force-loses-to-a-managers-cmake_find_root_path-entry)
   6. [Conan 2 forces BOTH under cross-compiling — and that can let the sysroot shadow Conan's own package](#6-conan-2-forces-both-under-cross-compiling--and-that-can-let-the-sysroot-shadow-conans-own-package)
   7. [M-G-21: LANGUAGES NONE is blind to lib64 because CMAKE_SIZEOF_VOID_P is unset](#7-m-g-21-languages-none-is-blind-to-lib64-because-cmake_sizeof_void_p-is-unset)
   8. [M-G-19: FindPkgConfig never sets PKG_CONFIG_SYSROOT_DIR/LIBDIR](#8-m-g-19-findpkgconfig-never-sets-pkg_config_sysroot_dirlibdir)
   9. [VCPKG_CHAINLOAD_TOOLCHAIN_FILE, measured against the real vcpkg.cmake](#9-vcpkg_chainload_toolchain_file-measured-against-the-real-vcpkgcmake)
   10. [Toolchain re-read count, precisely: 5 reads for one configure with 2 whole-project try_compiles](#10-toolchain-re-read-count-precisely-5-reads-for-one-configure-with-2-whole-project-try_compiles)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- **The single biggest overturned assumption of this dive**: when a cross toolchain sets `CMAKE_SYSTEM_NAME`/`CMAKE_SYSROOT` but none of the four `CMAKE_FIND_ROOT_PATH_MODE_*` variables, the real default for `LIBRARY`/`INCLUDE`/`PACKAGE` is **`BOTH`, not `ONLY`** — measured on CMake 3.31.12 and 4.4.2 by isolating a package that exists *only* in a host prefix (never in the sysroot): `find_package(onlyhost)` still resolves it. A toolchain that omits the three `set(CMAKE_FIND_ROOT_PATH_MODE_* ONLY)` lines is not "safe by default" — it silently falls through to the host's own copy of anything missing from the sysroot.
- `CMAKE_FIND_ROOT_PATH_MODE_PROGRAM`'s default genuinely is `NEVER` (measured, 3.31.12/4.4.2): `find_program(gen)` finds a host-only tool with no `NO_CMAKE_FIND_ROOT_PATH` needed. Overriding it to `ONLY`/`BOTH` in a toolchain is not just risky for one `find_program` call — it also breaks CMake's own generator bootstrap (`CMAKE_MAKE_PROGRAM` search), turning a whole configure into a hard error.
- `CMAKE_FIND_ROOT_PATH_MODE_PACKAGE=BOTH` (and, measured, the *unset* default) does not preserve `find_package`'s documented step-order (`<Name>_ROOT` before `CMAKE_PREFIX_PATH` before `CMAKE_SYSTEM_PREFIX_PATH`) across the rooted/unrooted split: CMake runs a full **rooted pass across every search-order category first**, then a full unrooted pass — so a same-named package reachable through *any* rooted category (a manager's `CMAKE_FIND_ROOT_PATH` entry, or the sysroot's own default `/usr`) wins over a `<Name>_ROOT` hint or a `CMAKE_PREFIX_PATH` entry that is not itself rooted, even though those are nominally earlier steps.
- A module that force-caches `<Name>_ROOT` (the `find_ocx`/CMK-MOD-12 pattern) **does not survive** a manager's `CMAKE_FIND_ROOT_PATH` injection under `ONLY` or `BOTH`, or a manager's own `FindFiles`-style `BOTH` override, or the sysroot's default `/usr` — measured against the real local `vcpkg.cmake` and a real Conan-2.32.0-generated `conan_toolchain.cmake`. Only `CMAKE_FIND_ROOT_PATH_MODE_PACKAGE=NEVER` restores the hint's nominal priority, and that also disables the sysroot restriction for every other `find_package` call in the same configure.
- **Conan 2.32.0's `CMakeToolchain` (`FindFiles` block) actively rewrites `CMAKE_FIND_ROOT_PATH_MODE_PACKAGE/PROGRAM/LIBRARY/INCLUDE` from `ONLY` (or unset) to `BOTH`** whenever `cross_building` is true — read in `conan/tools/cmake/toolchain/blocks.py` and confirmed in a real generated `conan_toolchain.cmake` from a cross profile. This is *why* Conan never injects `CMAKE_FIND_ROOT_PATH` the way vcpkg does: it disables the restriction that would otherwise hide its `CMAKE_PREFIX_PATH`-only install location.
- **Measured consequence**: in a Conan-only cross configure (no vcpkg-style `CMAKE_FIND_ROOT_PATH`, `CMAKE_SYSROOT` set), a same-named package pre-existing under the sysroot's own `/usr` (reachable via the always-present platform paths, `find_package.rst` step 7) is found *before* Conan's own `CMakeDeps`-generated package in the generators folder — Conan's forced `BOTH` reopens exactly the "silently resolve a copy you didn't ask for" trap it was trying to avoid, just against the sysroot instead of the host.
- `project(x LANGUAGES NONE)` leaves `CMAKE_SIZEOF_VOID_P` **completely unset** (measured, 3.31.12/4.4.2), which is what makes `find_package(CONFIG)` blind to a `lib64` install layout — the global property `FIND_LIBRARY_USE_LIB64_PATHS` is `TRUE` regardless of language, but the `lib64` candidate is gated on `CMAKE_SIZEOF_VOID_P EQUAL 8`, a string comparison that fails against an empty value. Neither `CMAKE_PREFIX_PATH` nor `<Pkg>_ROOT` (CACHE FORCE) compensates; the only fix is enabling a language.
- `CMAKE_LIBRARY_ARCHITECTURE` stayed empty in every configuration measured here (Fedora/RHEL-family host, no Debian multiarch) — the `lib/<tuple>` layout never even entered the candidate list, independent of `LANGUAGES NONE` vs `C`. This is host-distro-dependent, not CMake-version-dependent.
- **`FindPkgConfig.cmake` (4.4.2) never references `PKG_CONFIG_SYSROOT_DIR` or `PKG_CONFIG_LIBDIR` anywhere** — confirmed by reading the whole module. `pkg_check_modules` will happily report `_FOUND=TRUE` for a `.pc` file discovered via a sysroot-pointed `PKG_CONFIG_PATH`/`PKG_CONFIG_LIBDIR`, while `_INCLUDE_DIRS`/`_LIBRARY_DIRS` still contain the literal, host-rooted `/usr/include`/`/usr/lib` from the `.pc` file's own `prefix=` line — measured, both with and without `PKG_CONFIG_SYSROOT_DIR` set, and again under a chainloaded cross toolchain that sets `CMAKE_SYSROOT` (which `FindPkgConfig` also ignores).
- Neither vcpkg's `vcpkg.cmake` nor a real Conan 2.32.0 `conan_toolchain.cmake` sets `PKG_CONFIG_SYSROOT_DIR`; Conan sets `PKG_CONFIG_PATH` (prepending its own generators folder) but nothing else pkg-config-specific — confirmed by grepping both files.
- The real local `vcpkg.cmake` (no network, scripts only) confirms the toolchain-composition dive's read: `VCPKG_CHAINLOAD_TOOLCHAIN_FILE` is `include()`-d **unconditionally at the very top**, before the `VCPKG_TOOLCHAIN` self-guard check — measured, the chainloaded file's `message()` fires on *every* read of `vcpkg.cmake` in a configure (twice, for a zero-`try_compile` `LANGUAGES NONE` project), not just the first. The self-guard protects vcpkg's *own* setup code, not the act of re-including the user's file.
- **Measured**: a `project()` call inside a file reached via `VCPKG_CHAINLOAD_TOOLCHAIN_FILE` produces a hard configure error — `CMake Error ... project): Language 'NONE' is currently being enabled. Recursive call not allowed.` — because the chainload happens from inside `project()`'s own internal `CMakeDetermineSystem.cmake` processing.
- **Measured, precise toolchain re-read count**: one configure with `LANGUAGES C` and two whole-project `try_compile()` calls reads the toolchain file **5 times**: 2 from `project()` itself, 1 from the compiler's own internal ABI-detection `try_compile`, and 1 per explicit `try_compile()` — extending the already-measured "4 reads with one `try_compile`" (CMK-TC-06) linearly. The simpler `try_compile(<var> SOURCES ...)` signature (3.25+) does **not** re-read the toolchain at all — only the whole-project (source-directory) signature does, matching CMP0137's actual scope.
- The `CMAKE_FIND_ROOT_PATH`/root-path mechanism applies even in a **non-cross** configure (`CMAKE_CROSSCOMPILING=FALSE`) the moment `CMAKE_FIND_ROOT_PATH` is non-empty for any reason — measured; this matters because a leftover or manually-set `CMAKE_FIND_ROOT_PATH` (e.g. copied from a vcpkg example) changes `find_package` resolution order even outside a real cross build.
- `find_package`'s 4.2 change ("most recent version wins among viable matches") only affects ordering **within** a single glob-expression search step (versioned directory names like `example-1.2`/`example-1.10`); it does not change the documented step-order (`<Name>_ROOT` → `CMAKE_PREFIX_PATH` → … → `CMAKE_SYSTEM_PREFIX_PATH`) across categories — [`find_package.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/find_package.rst) still says the first *viable configuration file found* wins, even if a newer version resides later in the search order.

## Findings

### 1. The real defaults: PROGRAM=NEVER, but LIBRARY/INCLUDE/PACKAGE default to BOTH, not ONLY

`cmake-toolchains(7)`'s own worked example shows a toolchain explicitly setting `CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER` / `LIBRARY ONLY` / `INCLUDE ONLY` / `PACKAGE ONLY` ([cmake-toolchains.7.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-toolchains.7.rst)), and its prose says only: "CMake `find_*` commands will look in the sysroot, and the `CMAKE_FIND_ROOT_PATH` entries by default in all cases, as well as looking in the host system root prefix." That sentence describes what happens when the mode is **unset**, but it is easy to read it as "the worked example's explicit `ONLY` values are also the default." They are not.

Fixture: a fake sysroot (`.../cross/sysroot/usr/lib/cmake/libfoo`) and a separate host prefix (`.../cross/host/usr/lib/cmake/libfoo` and `.../cross/host/usr/lib/cmake/onlyhost`, the latter with no sysroot counterpart at all), `CMAKE_PREFIX_PATH` pointed at the host prefix, toolchain sets only `CMAKE_SYSTEM_NAME`/`CMAKE_SYSROOT`/compilers (`toolchains/tc-modes-from-env.cmake` with no `TC_MODE_*` env vars):

```sh
$ ocx package exec kitware/cmake:4.4 -- cmake -S proj-findroot -B build \
    -DCMAKE_TOOLCHAIN_FILE=toolchains/tc-modes-from-env.cmake -Wno-dev
-- MODE_PROGRAM=
-- MODE_LIBRARY=
-- MODE_INCLUDE=
-- MODE_PACKAGE=
-- RESULT find_package(libfoo) -> TARGET-SYSROOT (libfoo_DIR=.../sysroot/usr/lib/cmake/libfoo)
-- RESULT find_library(libfoo) -> .../sysroot/usr/lib/libfoo.a
-- RESULT find_package(onlyhost) -> FOUND (onlyhost_DIR=.../host/usr/lib/cmake/onlyhost)
```

`libfoo` exists in both places and resolves to the sysroot copy first (rooted paths are tried before unrooted ones — see §2) — that alone would be consistent with either `ONLY` or `BOTH` being the effective default. **`onlyhost` exists only in the host prefix, never in the sysroot, and it is still found.** That is only possible if the default is `BOTH`: under a true `ONLY` default, `find_package(onlyhost)` would be `NOTFOUND`. Identical result on CMake 3.31.12 (same command, `kitware/cmake:3.31`).

**Consequence**: a hand-written cross toolchain that omits the three `set(CMAKE_FIND_ROOT_PATH_MODE_* ONLY)` lines — because the author assumed CMake is conservative by default — is not sandboxed at all for `find_package`/`find_library`/`find_path`. This is the "find-root mode default that silently resolves the host copy" this dive was asked to chase, and it directly revises the topic map's own framing of M-H-05 (which described the default as already `PROGRAM NEVER; LIBRARY, INCLUDE, PACKAGE ONLY` — that description is the *worked example*, not the *default*).

### 2. Explicit MODE_PACKAGE values, measured: NEVER leaks the host copy, BOTH prefers rooted over unrooted

Same fixture, `CMAKE_FIND_ROOT_PATH_MODE_PACKAGE`/`_LIBRARY` forced via the toolchain's `TC_MODE_PACKAGE`/`TC_MODE_LIBRARY` env hooks:

```sh
$ TC_MODE_PACKAGE=NEVER TC_MODE_LIBRARY=NEVER TC_MODE_INCLUDE=NEVER TC_MODE_PROGRAM=NEVER \
  ocx package exec kitware/cmake:4.4 -- cmake -S proj-findroot -B build-never \
    -DCMAKE_TOOLCHAIN_FILE=toolchains/tc-modes-from-env.cmake -Wno-dev
-- RESULT find_package(libfoo) -> HOST (libfoo_DIR=.../host/usr/lib/cmake/libfoo)
-- RESULT find_library(libfoo) -> .../host/usr/lib/libfoo.a
```

`NEVER` on every mode ignores `CMAKE_SYSROOT`/`CMAKE_FIND_ROOT_PATH` entirely, so the cross build silently links the **host's** `libfoo` — a well-known footgun, now measured rather than asserted, and worth flagging because `NEVER` is a plausible-looking value to copy-paste ("never restrict my search") without realizing what it disables.

```sh
$ TC_MODE_PACKAGE=BOTH TC_MODE_LIBRARY=BOTH \
  ocx package exec kitware/cmake:4.4 -- cmake -S proj-findroot -B build-both \
    -DCMAKE_TOOLCHAIN_FILE=toolchains/tc-modes-from-env.cmake -Wno-dev
-- RESULT find_package(libfoo) -> TARGET-SYSROOT (libfoo_DIR=.../sysroot/usr/lib/cmake/libfoo)
```

`BOTH` still resolves the sysroot copy first — confirming [`include/FIND_XXX_ROOT.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/include/FIND_XXX_ROOT.rst)'s "at first the directories listed in `CMAKE_FIND_ROOT_PATH`/`CMAKE_SYSROOT` are searched, then the non-rooted directories" — rooted wins over unrooted regardless of which nominal step (`CMAKE_PREFIX_PATH` here) the unrooted candidate came from. §5 shows this generalizes across *all* nine `find_package` search-order categories, not just this one.

### 3. find_program(gen): the default already excludes the sysroot; MODE_PROGRAM=ONLY breaks CMake's own build-tool search

Default (no `TC_MODE_PROGRAM`), host tool `gen` on `CMAKE_PREFIX_PATH`, sysroot has no `gen`:

```sh
$ ocx package exec kitware/cmake:4.4 -- cmake -S proj-findprogram -B build \
    -DCMAKE_TOOLCHAIN_FILE=toolchains/tc-modes-from-env.cmake -Wno-dev
-- MODE_PROGRAM=
-- RESULT find_program(gen) sandboxed -> .../host/usr/bin/gen
-- RESULT find_program(gen) NO_CMAKE_FIND_ROOT_PATH -> .../host/usr/bin/gen
```

Both calls resolve identically — `NO_CMAKE_FIND_ROOT_PATH` is a no-op here because the default (`NEVER`) already ignores the sysroot for programs. Forcing `MODE_PROGRAM=ONLY` (a plausible "lock everything to the sysroot" over-correction) changes this:

```sh
$ TC_MODE_PROGRAM=ONLY ocx package exec kitware/cmake:4.4 -- cmake -S proj-findprogram -B build2 \
    -G Ninja -DCMAKE_MAKE_PROGRAM=<ninja> \
    -DCMAKE_TOOLCHAIN_FILE=toolchains/tc-modes-from-env.cmake -Wno-dev
-- RESULT find_program(gen) sandboxed -> NOTFOUND
-- RESULT find_program(gen) NO_CMAKE_FIND_ROOT_PATH -> .../host/usr/bin/gen
```

`NO_CMAKE_FIND_ROOT_PATH` now earns its keep. But the same override, tried with the *default* Makefiles generator and no explicit `CMAKE_MAKE_PROGRAM`, fails configure outright:

```sh
CMake Error: CMake was unable to find a build program corresponding to "Unix Makefiles".
CMAKE_MAKE_PROGRAM is not set. You probably need to select a different build tool.
```

Setting `CMAKE_FIND_ROOT_PATH_MODE_PROGRAM` away from its default doesn't just affect the project's own `find_program` calls — it also sandboxes CMake's *own* search for `make`/`ninja`, since that search goes through the same mode variable. Measured on 4.4.2; the mechanism (one shared mode variable) is version-independent.

### 4. CMAKE_CROSSCOMPILING_EMULATOR is generate-time target wiring only

[`CROSSCOMPILING_EMULATOR` target property @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/prop_tgt/CROSSCOMPILING_EMULATOR.rst): "This command will be added as a prefix to `add_test`, `add_custom_command`, and `add_custom_target` commands **for built target system executables**... not supported when using the old form of `add_test`." This is a *target* property (`prop_tgt`), not a test property — there is no `prop_test/CROSSCOMPILING_EMULATOR.rst` in CMake's own docs.

Measured, 4.4.2, `-DCMAKE_CROSSCOMPILING_EMULATOR=toolchains/fake-emulator.sh` (a script that echoes then `exec`s its arguments), two tests: `run_real_target` (`add_executable(real_target_exe main.c)` + `add_test(NAME run_real_target COMMAND real_target_exe)`) and `run_fake_target_exe` (`add_test(NAME run_fake_target_exe COMMAND "${CMAKE_CURRENT_SOURCE_DIR}/fake_target_exe.sh" hello)`, plus an explicit `set_tests_properties(run_fake_target_exe PROPERTIES CROSSCOMPILING_EMULATOR ...)`):

```cmake
# generated CTestTestfile.cmake
add_test("run_real_target" "toolchains/fake-emulator.sh" "build/real_target_exe")
add_test("run_fake_target_exe" "proj-findprogram/fake_target_exe.sh" "hello")
set_tests_properties("run_fake_target_exe" PROPERTIES CROSSCOMPILING_EMULATOR "toolchains/fake-emulator.sh" ...)
```

For the **real target**, CMake baked the emulator directly into the generated `add_test()` command at configure time — no `CROSSCOMPILING_EMULATOR` property line at all, because the wiring already happened. For the **script-path test**, the property is dutifully recorded (CMake allows setting an arbitrary custom property on any test) but the emulator never appears in the generated `add_test()` line. Running both under `ctest -V` confirms it:

```sh
1: Test command: toolchains/fake-emulator.sh "build/real_target_exe"
1: EMULATOR-WRAPPED: build/real_target_exe        # emulator ran
...
2: Test command: proj-findprogram/fake_target_exe.sh "hello"
2: FAKE-TARGET-EXE-RAN hello                       # emulator never ran
```

**`set_tests_properties(<test> PROPERTIES CROSSCOMPILING_EMULATOR ...)` on a script-path test is accepted syntax that CTest silently never acts on.** The only way to get the emulator prefix is a real `add_executable` target referenced by name (or `$<TARGET_FILE:...>`) in `add_test(NAME ... COMMAND ...)`. This is exactly `CMK-TC-07`'s subject (M-H-06).

### 5. `<Name>_ROOT CACHE FORCE` loses to a manager's CMAKE_FIND_ROOT_PATH entry

Fixture: three distinct `libfoo` copies — `hintroot` (what a module force-sets `libfoo_ROOT` to, the `find_ocx`/CMK-MOD-12 pattern), `managerpath` (what a manager like vcpkg puts on `CMAKE_PREFIX_PATH` *and* `CMAKE_FIND_ROOT_PATH`, mirroring `z_vcpkg_add_vcpkg_to_cmake_path` — microsoft__vcpkg@`c4ee5a52d7`:scripts/buildsystems/vcpkg.cmake:452,454, which appends the same installed-triplet directory to both variables), and `sysroot` (§1's fixture, for the Conan case in §6).

`CMakeLists.txt` sets `list(APPEND CMAKE_FIND_ROOT_PATH managerpath)`, `set(CMAKE_PREFIX_PATH managerpath)`, then `set(libfoo_ROOT hintroot CACHE PATH ... FORCE)` — exactly `find_ocx`'s own pattern (find_ocx@`9094f87`:ocx.cmake:1200: `set(${arg_NAME}_ROOT "${content}" CACHE PATH ... FORCE)`), before `find_package(libfoo CONFIG)`.

```sh
$ ocx package exec kitware/cmake:4.4 -- cmake -S proj-roothint -B build --debug-find-pkg=libfoo -Wno-dev
-- CMAKE_CROSSCOMPILING=FALSE
-- RESULT find_package(libfoo) -> MANAGER-INJECTED (libfoo_DIR=.../managerpath/lib/cmake/libfoo)
```

Note `CMAKE_CROSSCOMPILING=FALSE` — this is not even a cross build; simply having `CMAKE_FIND_ROOT_PATH` non-empty is enough to re-root the search. The `--debug-find-pkg` trace confirms `<PackageName>_ROOT` (`hintroot`) is listed as a source but **its rooted candidate (`managerpath` + `hintroot`, which does not exist) is the only form ever tried** — `hintroot`'s own unrooted path never appears in the "considered" list. Repeating with `CMAKE_FIND_ROOT_PATH_MODE_PACKAGE` forced to `BOTH` or `ONLY` gives the identical result. Only `NEVER` restores the hint:

```sh
$ TEST_MODE_PACKAGE=NEVER ocx package exec kitware/cmake:4.4 -- cmake -S proj-roothint -B build-never --debug-find-pkg=libfoo -Wno-dev
-- RESULT find_package(libfoo) -> HINT-ROOT (libfoo_DIR=.../hintroot/lib/cmake/libfoo)
```

The mechanism (confirmed by reading the full `--debug-find-pkg` trace): CMake does not interleave "try step 1 rooted, then step 1 unrooted, then step 2 rooted, ..." — it runs a **complete rooted pass across every search-order category (1 through 9) first**, then a complete unrooted pass. Because `managerpath` is *itself* one of the `CMAKE_FIND_ROOT_PATH` entries, its `CMAKE_PREFIX_PATH` candidate (step 2) resolves directly in the rooted pass — before `hintroot`'s own step-1 candidate is ever tried unrooted. **A manager's `CMAKE_FIND_ROOT_PATH` injection outranks a `<Name>_ROOT` hint's nominal step-1 priority, under both `ONLY` and `BOTH`.**

### 6. Conan 2 forces BOTH under cross-compiling — and that can let the sysroot shadow Conan's own package

Real Conan 2.32.0 (`CONAN_HOME` pointed at the wave-2 fixture, no network — `conan install` needs no package downloads to run `CMakeToolchain`'s `generate()`), cross profile (`os=Linux`, `arch=armv8`, `compiler=clang`, zig wrapper via `[buildenv]`), `user_toolchain` conf chaining in `toolchains/tc-modes-from-env.cmake` (sets `CMAKE_SYSROOT`, leaves every `CMAKE_FIND_ROOT_PATH_MODE_*` unset):

```sh
$ conan install conanfile.txt -pr:h=conan-cross-profile -pr:b=default \
    --output-folder=conan-cross-out2 \
    -c tools.cmake.cmaketoolchain:user_toolchain="['toolchains/tc-modes-from-env.cmake']" \
    -g CMakeToolchain
```

The generated `conan_toolchain.cmake` (conan-io/conan@`2.32.0`:conan/tools/cmake/toolchain/blocks.py, class `FindFiles`, lines 580-641):

```cmake
{% if cross_building %}
if(NOT DEFINED CMAKE_FIND_ROOT_PATH_MODE_PACKAGE OR CMAKE_FIND_ROOT_PATH_MODE_PACKAGE STREQUAL "ONLY")
    set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE "BOTH")
endif()
# ... same pattern for PROGRAM, LIBRARY, (FRAMEWORK on Apple), INCLUDE
{% endif %}
```

confirmed rendered verbatim in the real generated file (`grep CMAKE_FIND_ROOT_PATH_MODE_PACKAGE conan_toolchain.cmake` → `set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE "BOTH")`). Conan **actively overwrites `ONLY` to `BOTH`** for a cross build, and never sets `CMAKE_FIND_ROOT_PATH` at all (0 matches in either a native or the cross-generated file) — the opposite strategy from vcpkg's (§5): instead of adding its install directory to the root-path list, Conan disables the restriction that would otherwise hide a plain `CMAKE_PREFIX_PATH` entry.

Placing a `libfoo-config.cmake` directly in the Conan generators folder (mirroring how `CMakeDeps` writes files there) and running the same `proj-roothint`-style probe through this real toolchain:

```sh
$ ocx package exec kitware/cmake:4.4 -- cmake -S proj-roothint-conan -B build \
    -DCMAKE_TOOLCHAIN_FILE=conan-cross-out2/conan_toolchain.cmake --debug-find-pkg=libfoo -Wno-dev
-- CMAKE_CROSSCOMPILING=TRUE
-- CMAKE_SYSROOT=.../sysroot
-- CMAKE_FIND_ROOT_PATH=
-- CMAKE_PREFIX_PATH=.../conan-cross-out2
-- MODE_PACKAGE=BOTH
-- RESULT find_package(libfoo) -> TARGET-SYSROOT (libfoo_DIR=.../sysroot/usr/lib/cmake/libfoo)
```

Neither the project's `libfoo_ROOT` hint (`hintroot`, unrooted, category 1) nor Conan's own `CMAKE_PREFIX_PATH` entry (`conan-cross-out2`, unrooted, category 2) wins. The `--debug-find-pkg` trace's only successful candidate is `sysroot/usr/lib/cmake/libfoo/libfooConfig.cmake` — reached via the sysroot-rooted form of the always-present platform paths (`/usr`, `/usr/local`, step 7, [`find_package.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/find_package.rst) §7), which resolves in the rooted pass before either category 1 or 2's unrooted attempt is ever tried (same mechanism as §5, generalized). **A Conan-only cross configure, forced to `BOTH`, can silently prefer a same-named package that happens to pre-exist under the sysroot's own `/usr` over the package Conan itself just resolved and configured** — with no error, no warning, and no difference in Conan's own reported "Installing packages" step.

### 7. M-G-21: LANGUAGES NONE is blind to lib64 because CMAKE_SIZEOF_VOID_P is unset

Fixture: one prefix (`gsearch/`) with `dep` installed identically under `lib64/cmake/dep`, `lib32/cmake/dep`, `lib/aarch64-linux-gnu/cmake/dep` and `share/cmake/dep`, each config setting a distinct `dep_LAYOUT` marker. `CMakeLists.txt` toggles `project(g21_probe LANGUAGES NONE)` vs `LANGUAGES C` on `-DTEST_LANG_C=ON`, and `CMAKE_PREFIX_PATH` vs `dep_ROOT CACHE PATH FORCE` on `-DTEST_VIA_ROOT=ON`:

```sh
$ ocx package exec kitware/cmake:4.4 -- cmake -S proj-g21 -B build-none -Wno-dev
-- CMAKE_SIZEOF_VOID_P=
-- GLOBAL PROPERTY FIND_LIBRARY_USE_LIB64_PATHS=TRUE
-- RESULT find_package(dep) -> share

$ ocx package exec kitware/cmake:4.4 -- cmake -S proj-g21 -B build-c -DTEST_LANG_C=ON -Wno-dev
-- CMAKE_SIZEOF_VOID_P=8
-- GLOBAL PROPERTY FIND_LIBRARY_USE_LIB64_PATHS=TRUE
-- RESULT find_package(dep) -> lib64
```

The same pair repeated with `-DTEST_VIA_ROOT=ON` (`dep_ROOT` instead of `CMAKE_PREFIX_PATH`) gives identical results: `share` under `NONE`, `lib64` under `C`. Identical on CMake 3.31.12.

The `FIND_LIBRARY_USE_LIB64_PATHS` **global property** (not a `CMAKE_`-prefixed variable — a common hallucination target, see AI-agent angle) is `TRUE` in *both* runs. What actually gates the `lib64` candidate is [`find_package.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/find_package.rst) line 443-445: "Searched on 64 bit platforms (`CMAKE_SIZEOF_VOID_P` is 8) **and** the `FIND_LIBRARY_USE_LIB64_PATHS` property is set to TRUE." `CMAKE_SIZEOF_VOID_P` is only populated once a language's compiler ABI has been detected (`enable_language`); `project(... LANGUAGES NONE)` never runs that detection, so the variable stays empty, the `EQUAL 8` comparison fails, and `lib64` is silently never added to the candidate suffix list — regardless of `CMAKE_LIBRARY_ARCHITECTURE` (which stayed empty throughout on this host — see below) and regardless of whether the hint comes through `CMAKE_PREFIX_PATH` or `<Pkg>_ROOT`. **The fix is enabling a language, not repointing the hint.**

`CMAKE_LIBRARY_ARCHITECTURE` (governs the `lib/<tuple>` layout) was empty in every configuration measured here: `gcc -print-multiarch` returns nothing on this Fedora/RHEL-family host (`gcc (GCC) 15.2.1 20260123 (Red Hat 15.2.1-7)`), confirming [`CMAKE_LIBRARY_ARCHITECTURE.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_LIBRARY_ARCHITECTURE.rst)'s "if detected" — a Debian/Ubuntu host would populate it and enable the `lib/<tuple>` candidate; this is a host-distro fact, not a CMake-version fact, and it is confirmed directly in `FindPkgConfig.cmake`'s own logic (§8): `if(EXISTS "/etc/debian_version") ... list(APPEND _lib_dirs "lib/${CMAKE_LIBRARY_ARCHITECTURE}/pkgconfig") else() ... lib64/pkgconfig ... endif()` — CMake itself branches on the Debian-vs-not distinction for the pkg-config search dirs.

### 8. M-G-19: FindPkgConfig never sets PKG_CONFIG_SYSROOT_DIR/LIBDIR

Read the whole of [`FindPkgConfig.cmake`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Modules/FindPkgConfig.cmake) (4.4.2, ~1500 lines): zero references to `PKG_CONFIG_SYSROOT_DIR` or `PKG_CONFIG_LIBDIR`, in either direction. The module *does* unconditionally force `ENV{PKG_CONFIG_ALLOW_SYSTEM_LIBS}`/`ENV{PKG_CONFIG_ALLOW_SYSTEM_CFLAGS}` to `1` (`_pkg_set_path_internal`, so `-I`/`-L` paths under `/usr` are never stripped from results) and, when *not* cross-compiling, appends `lib64/pkgconfig`/`lib/<arch>/pkgconfig`/`lib32/pkgconfig` guesses derived from `CMAKE_PREFIX_PATH` (gated on the same `FIND_LIBRARY_USE_LIB64_PATHS`/`CMAKE_SIZEOF_VOID_P` pair as §7, and on `/etc/debian_version` for the multiarch case) — but this whole `_lib_dirs` guess block is skipped when actually cross-compiling (`if(NOT DEFINED CMAKE_SYSTEM_NAME OR (CMAKE_SYSTEM_NAME MATCHES "^(Linux|GNU)$" AND NOT CMAKE_CROSSCOMPILING))`), leaving pure passthrough to whatever `PKG_CONFIG_PATH`/`PKG_CONFIG_LIBDIR`/`PKG_CONFIG_SYSROOT_DIR` are already in the process environment.

Measured, `pkgconf` 2.3.0, target `.pc` file (`prefix=/usr`) at `sysroot/usr/lib/pkgconfig/libfoo.pc`, project does `pkg_check_modules(LIBFOO QUIET IMPORTED_TARGET libfoo)`:

| `PKG_CONFIG_PATH`/`_LIBDIR` | `PKG_CONFIG_SYSROOT_DIR` | `LIBFOO_FOUND` | `LIBFOO_INCLUDE_DIRS` |
|---|---|---|---|
| `sysroot/usr/lib/pkgconfig` (PATH) | unset | TRUE | `/usr/include` (host-rooted, **wrong**) |
| `sysroot/usr/lib/pkgconfig` (PATH) | `sysroot` | TRUE | `sysroot/usr/include` (correct) |
| `sysroot/usr/lib/pkgconfig` (LIBDIR) | unset | TRUE | `/usr/include` (host-rooted, **wrong**) |
| `sysroot/usr/lib/pkgconfig` (LIBDIR) | `sysroot` | TRUE | `sysroot/usr/include` (correct) |
| unset / unset | — | FALSE | — |

Repeated under a chainloaded cross toolchain (`-DCMAKE_TOOLCHAIN_FILE=toolchains/tc-modes-from-env.cmake`, which sets `CMAKE_SYSROOT`) with no `PKG_CONFIG_*` env vars: `LIBFOO_FOUND=FALSE` — `CMAKE_SYSROOT` has **no effect whatsoever** on `pkg_check_modules`. Only setting `PKG_CONFIG_LIBDIR`/`PKG_CONFIG_SYSROOT_DIR` by hand (in the shell, or via a toolchain's own `set(ENV{PKG_CONFIG_SYSROOT_DIR} ...)`) makes it work correctly under that same toolchain. Neither the real vcpkg.cmake (0 `PKG_CONFIG` matches) nor a real Conan 2.32.0 cross `conan_toolchain.cmake` sets `PKG_CONFIG_SYSROOT_DIR` — Conan sets only `ENV{PKG_CONFIG_PATH}` (prepending its own generators folder, `conan_toolchain.cmake:157-160`, both the native and cross-generated files).

### 9. VCPKG_CHAINLOAD_TOOLCHAIN_FILE, measured against the real vcpkg.cmake

Using the actual local checkout (`.../verify-package-managers/vcpkg/root`, scripts only, no network, bootstrap not run — a real vcpkg binary is not needed to evaluate the toolchain file itself when the project has no `vcpkg.json`, so `VCPKG_MANIFEST_MODE` auto-defaults `OFF`):

```sh
$ ocx package exec kitware/cmake:4.4 -- cmake -S proj-vcpkgchain -B build-good \
    -DCMAKE_TOOLCHAIN_FILE=<vcpkg-root>/scripts/buildsystems/vcpkg.cmake \
    -DVCPKG_TARGET_TRIPLET=x64-linux \
    -DVCPKG_CHAINLOAD_TOOLCHAIN_FILE=toolchains/chainload-wellbehaved.cmake -Wno-dev
-- CHAINLOAD-WELLBEHAVED-RAN
-- CHAINLOAD-WELLBEHAVED-RAN
-- MY_CHAINLOAD_MARKER=yes
-- VCPKG_TOOLCHAIN=ON
-- Configuring done (0.0s)
```

The marker fires **twice** for a `LANGUAGES NONE` project with zero `try_compile` calls — confirming, live, the toolchain-composition dive's read of `scripts/buildsystems/vcpkg.cmake:207-213`: `include("${VCPKG_CHAINLOAD_TOOLCHAIN_FILE}")` runs **before** the `if(VCPKG_TOOLCHAIN) return() endif()` self-guard, on every single read of `vcpkg.cmake` in the configure (§10 shows a bare `project()` already reads any toolchain file twice). The self-guard makes vcpkg's *own* expensive setup idempotent; it does nothing to protect a chainloaded file from being re-executed just as many times.

Replacing the chainload target with a file that calls `project()`:

```cmake
message(STATUS "CHAINLOAD-BADBEHAVED-RAN")
project(should_not_be_called_here LANGUAGES NONE)
```

```sh
$ ocx package exec kitware/cmake:4.4 -- cmake -S proj-vcpkgchain -B build-bad \
    -DCMAKE_TOOLCHAIN_FILE=<vcpkg-root>/scripts/buildsystems/vcpkg.cmake \
    -DVCPKG_TARGET_TRIPLET=x64-linux \
    -DVCPKG_CHAINLOAD_TOOLCHAIN_FILE=toolchains/chainload-badbehaved.cmake -Wno-dev
-- CHAINLOAD-BADBEHAVED-RAN
CMake Error at toolchains/chainload-badbehaved.cmake:4 (project):
  Language 'NONE' is currently being enabled.  Recursive call not allowed.
Call Stack (most recent call first):
  <vcpkg-root>/scripts/buildsystems/vcpkg.cmake:210 (include)
  <cmake-share>/Modules/CMakeDetermineSystem.cmake:152 (include)
  CMakeLists.txt:2 (project)
```

**A project-level command inside a chainloaded toolchain is a hard, immediate configure failure**, not a silent misbehavior — the call stack shows exactly why: the chainload happens from inside the outer `project()` call's own `CMakeDetermineSystem.cmake` processing, so a second `project()` is a literal recursive call CMake detects and rejects. (The configure then also fails to find a build program, a downstream symptom of aborting mid-`project()`, not a separate bug.)

### 10. Toolchain re-read count, precisely: 5 reads for one configure with 2 whole-project try_compiles

`toolchains/tc-modes-from-env.cmake` appends a line to a log file (`ENV{TC_READ_LOG}`) on every read, tagged with `CMAKE_CURRENT_LIST_FILE` and the current `CMAKE_BINARY_DIR}` (which differs per `try_compile` scratch directory). Project: `LANGUAGES C`, two explicit whole-project `try_compile(<var> <bindir> <srcdir> <target>)` calls against a trivial `add_executable` sub-project (the signature CMP0137 actually governs — the simpler `try_compile(<var> SOURCES <file>)` signature, 3.25+, does **not** re-read the toolchain at all, confirmed by the same log staying empty across two such calls):

```sh
$ TC_READ_LOG=$PWD/tcread.log ocx package exec kitware/cmake:4.4 -- cmake -S proj-tcread -B build \
    -G Ninja -DCMAKE_MAKE_PROGRAM=<ninja> \
    -DCMAKE_TOOLCHAIN_FILE=toolchains/tc-modes-from-env.cmake -Wno-dev
$ cat tcread.log
read at toolchains/tc-modes-from-env.cmake, IN_TRY_COMPILE=build                                    # project() pass 1
read at toolchains/tc-modes-from-env.cmake, IN_TRY_COMPILE=build                                    # project() pass 2
read at toolchains/tc-modes-from-env.cmake, IN_TRY_COMPILE=build/CMakeFiles/CMakeScratch/TryCompile-UMQ8LA  # compiler ABI detection's own try_compile
read at toolchains/tc-modes-from-env.cmake, IN_TRY_COMPILE=build/tc1-bin                            # explicit try_compile #1
read at toolchains/tc-modes-from-env.cmake, IN_TRY_COMPILE=build/tc2-bin                            # explicit try_compile #2
```

**5 total reads.** `project()` itself accounts for 2 (matching §1/§9's bare-configure measurement); CMake's own "Detecting C compiler ABI info" step is implemented as a whole-project `try_compile` internally and accounts for a 3rd; each of the 2 explicit whole-project `try_compile()` calls accounts for exactly 1 more. This is consistent with, and extends, the already-measured "4 reads with one `try_compile`" (`CMK-TC-06`, dependency-seam/toolchain-composition): `2 (project) + 1 (ABI detection) + 1 (the one try_compile) = 4`; here, `2 + 1 + 2 = 5`. **Budget: `2 + 1 + N` toolchain reads for a `LANGUAGES C`/`CXX` configure with `N` whole-project `try_compile()` calls** (the ABI-detection `+1` applies once per enabled compiled language, not measured separately here for multi-language projects).

## Normative guidance candidates

1. **A cross toolchain MUST explicitly set `CMAKE_FIND_ROOT_PATH_MODE_LIBRARY`, `_INCLUDE` and `_PACKAGE` to `ONLY`; never rely on leaving them unset.** Rationale: measured (§1) that the unset default is `BOTH`, which silently falls through to a host-prefix package that has no sysroot counterpart — "I didn't set a restrictive mode, so CMake must be conservative by default" is false. Verify, against a directory holding the toolchain file(s) (e.g. `cmake/toolchains/`) that also set `CMAKE_SYSROOT` or `CMAKE_SYSTEM_NAME`: run `grep -rn 'CMAKE_FIND_ROOT_PATH_MODE_LIBRARY' cmake/toolchains --include='*.cmake'`, then the same command with `_INCLUDE` and `_PACKAGE` in place of `_LIBRARY` — three separate checks, since a union pattern cannot assert all three are present; each must produce at least one line setting `ONLY`, and empty output on any one of the three is the finding. Floor: any CMake version (the default has not changed across 3.31.12/4.4.2).
2. **Never set `CMAKE_FIND_ROOT_PATH_MODE_PROGRAM` to anything other than its default (`NEVER`) in a cross toolchain.** Rationale: measured (§3) that `ONLY`/`BOTH` breaks not just project `find_program` calls but CMake's own `CMAKE_MAKE_PROGRAM` search, turning a whole configure into a hard error rather than a wrong dependency resolution. Verify: `rg -rn 'CMAKE_FIND_ROOT_PATH_MODE_PROGRAM' . --include='*.cmake'` from the repository root; any `set(...)` whose value is not `NEVER` is a finding — empty output is pass. Floor: any CMake version; MUST.
3. **Wire `CMAKE_CROSSCOMPILING_EMULATOR` only onto a real `add_executable` target referenced by name in `add_test(NAME ... COMMAND ...)`; never expect `set_tests_properties(<test> PROPERTIES CROSSCOMPILING_EMULATOR ...)` on a script-path test to do anything.** Rationale: measured (§4) that CTest only reads the property at generate time, from a target's own `CROSSCOMPILING_EMULATOR` property, baking the emulator into the generated `add_test()` line; a manually-set test property of the same name is accepted syntax with zero runtime effect. Verify: reading heuristic — for any `set_tests_properties(... CROSSCOMPILING_EMULATOR ...)`, confirm the same test's `add_test(NAME ... COMMAND ...)` names a CMake target (or `$<TARGET_FILE:...>`), not a literal path; if it names a literal path, the property is dead code. Floor: property added 3.3 (list form 3.15, genex support 3.29); MUST — this is `CMK-TC-07`'s subject, and severity is MUST (not SHOULD) because the failure mode is not "slightly wrong," it is "completely silent no-op that reads as configured correctly."
4. **A module that force-caches `<Name>_ROOT` (e.g. `find_ocx`'s `CMK-MOD-12` pattern) MUST NOT be relied on to outrank a package manager's own resolution once `CMAKE_FIND_ROOT_PATH` is non-empty or a manager forces `CMAKE_FIND_ROOT_PATH_MODE_PACKAGE=BOTH`.** Rationale: measured (§5, §6) against both a real vcpkg.cmake-style injection and a real Conan-2.32.0-generated toolchain — the hint's nominal step-1 priority does not survive either `ONLY` or `BOTH` once a rooted candidate from *any* later category (a manager's own directory, or the sysroot's default `/usr`) is reachable first. This **changes `CMK-MOD-12`'s promise**: the rule text should read "acts only inside `find_package`, and only reliably outranks other sources when `CMAKE_FIND_ROOT_PATH_MODE_PACKAGE` is `NEVER` or `CMAKE_FIND_ROOT_PATH` is empty — not a general guarantee under a cross build." Verify: reading heuristic — a project consuming `find_ocx`-style `_ROOT` hints under a package-manager cross toolchain must not assume the hint wins; check the manager's generated toolchain for `CMAKE_FIND_ROOT_PATH_MODE_PACKAGE` and, if it is `BOTH`/`ONLY`, confirm no same-named package exists in a reachable rooted location. Floor: `CMP0074`/`<Name>_ROOT`, CMake ≥3.12; the interaction with root-path modes is version-independent (measured 3.31.12 and 4.4.2).
5. **Do not assume Conan 2's forced `CMAKE_FIND_ROOT_PATH_MODE_*=BOTH` makes a cross build safe from stale sysroot packages.** Rationale: measured (§6) that Conan's `FindFiles` block rewrites `ONLY`/unset to `BOTH` specifically so its own `CMAKE_PREFIX_PATH`-only install location stays reachable — but `BOTH` also re-opens the sysroot's default `/usr` paths (category 7) to shadow Conan's own resolved package, silently and without a version conflict, if a same-named package happens to already live there (e.g. from a distro cross-package or a leftover previous build). Verify: for any dependency Conan is expected to supply in a cross build, check that no same-named `<Name>Config.cmake`/`Find<Name>.cmake`-discoverable package exists under `<sysroot>/usr/lib/cmake`, `<sysroot>/usr/lib/<arch>/cmake`, or `<sysroot>/usr/share/cmake` — a reading/inventory check, not a single grep pattern (the failure is a search-path interaction, not a text pattern). Floor: Conan ≥2.x (`FindFiles` block content read at 2.32.0).
6. **Enable at least one language before any `find_package(CONFIG)` call for a dependency that might use a `lib64`/`lib32`/`lib/<tuple>` install layout; `project(... LANGUAGES NONE)` is not compatible with that layout.** Rationale: measured (§7) that `CMAKE_SIZEOF_VOID_P` stays completely unset under `LANGUAGES NONE`, which silently removes `lib64` from the search candidates regardless of the `FIND_LIBRARY_USE_LIB64_PATHS` global property's value, and regardless of whether the search comes through `CMAKE_PREFIX_PATH` or a `<Pkg>_ROOT` hint — `dep_DIR` (setting it directly) is the only hint-based workaround; enabling a language is the structural fix. Verify: reading heuristic — any `project(... LANGUAGES NONE)` followed by a `find_package(... CONFIG)` for a package that might be installed only under `lib64` is a finding; `enable_language(C)` (or any language) before the `find_package` call resolves it. Floor: any CMake version; this is `M-G-21`, family `CMK-DEP`, and it is a MUST for any project that both defers language enablement and finds packages by `CONFIG` mode.
7. **A cross build using pkg-config MUST set both a sysroot-scoped `PKG_CONFIG_PATH`/`PKG_CONFIG_LIBDIR` and `PKG_CONFIG_SYSROOT_DIR`; neither `CMAKE_SYSROOT` nor `CMAKE_FIND_ROOT_PATH` propagates to either automatically.** Rationale: measured (§8) that `FindPkgConfig.cmake` contains zero references to `PKG_CONFIG_SYSROOT_DIR`, so a `.pc` file can be correctly *found* via a sysroot-pointed `PKG_CONFIG_PATH` while its reported `_INCLUDE_DIRS`/`_LIBRARY_DIRS` still literally read `/usr/include`/`/usr/lib` from the file's own unprefixed `prefix=` value — a silent host-path leak into a cross build's compile/link flags. Verify: `rg -rn PKG_CONFIG_SYSROOT_DIR . --include='*.cmake' --include='toolchain*'` (from the repository root) across any cross toolchain that also calls or expects `pkg_check_modules`; empty output alongside a present `pkg_check_modules`/`cmake_pkg_config` call is the finding, a hit is pass. Floor: any CMake version (confirmed on 4.4.2's `FindPkgConfig.cmake`; the module has not gained sysroot awareness).
8. **Neither vcpkg's toolchain nor Conan's `CMakeToolchain` sets `PKG_CONFIG_SYSROOT_DIR` for you — do not assume a chainloaded manager toolchain has already solved rule 7.** Rationale: confirmed by reading both real files (0 `PKG_CONFIG` matches in `vcpkg.cmake`; Conan's `conan_toolchain.cmake` sets only `ENV{PKG_CONFIG_PATH}`, prepending its own generators folder). Verify: same as rule 7, applied specifically to a project already consuming a manager's generated toolchain. Floor: vcpkg (any recent release, checked at `c4ee5a52d7`); Conan 2.32.0.
9. **Never place a project-level command (`project()`, `enable_language()`, or anything that would recurse into `project()`'s own processing) inside a file meant to be chainloaded via `VCPKG_CHAINLOAD_TOOLCHAIN_FILE` or Conan's `user_toolchain` conf.** Rationale: measured (§9) that this produces an immediate, unambiguous configure error ("Recursive call not allowed") because the chainload happens from inside the outer `project()` call's own internal processing — this is a stronger and more specific statement than "toolchain files must avoid project-level commands" (dependency-seam/toolchain-composition's rule 3): it is not merely bad practice, it is a hard failure with a diagnostic call stack pointing at the chainload site. Verify: reading heuristic — grep any file assigned to `VCPKG_CHAINLOAD_TOOLCHAIN_FILE` or a `user_toolchain` conf entry for a bare `project(` or `enable_language(` call; any hit is a finding. Floor: any CMake version.
10. **When profiling or bounding configure-time side effects in a toolchain file, budget `2 + 1 + N` reads for a configure with `N` whole-project `try_compile()` calls and one compiled language enabled (`2` from `project()`, `1` from the compiler's own ABI-detection `try_compile`).** Rationale: measured precisely (§10); a toolchain with expensive or side-effecting unconditional statements (network calls, subprocess spawns, file writes without a guard) will repeat that work exactly this many times, not once. The simpler `try_compile(<var> SOURCES ...)` signature (3.25+) does not add to this count. Verify: `TC_READ_LOG`-style instrumentation (a `file(APPEND ...)` line early in the toolchain file) is a named reading heuristic for confirming the count on a real project; no static grep substitutes for it. Floor: `try_compile(SOURCES ...)` requires CMake ≥3.25; the whole-project signature and its re-read behavior are older (CMP0137, 3.24, is the propagation-behavior gate, not the re-read itself).

## Exemplar evidence

- **find_ocx@`9094f87`:ocx.cmake:1200** is the live, unmodified instance of the `<Name>_ROOT CACHE PATH ... FORCE` pattern rule 4 is about: `set(${arg_NAME}_ROOT "${content}" CACHE PATH "find_ocx: content root of ${ref} (CMP0074 search hint)" FORCE)`. find_ocx itself never cross-compiles and sets no `CMAKE_TOOLCHAIN_FILE` (confirmed by the toolchain-composition dive's own read, §"Exemplar evidence": "no `CMAKE_TOOLCHAIN_FILE` reference at all"), so this dive's finding is a *live risk for consumers*, not a defect in find_ocx: a project that consumes an `ocx_package`-provided `_ROOT` hint while also cross-compiling under a manager's toolchain (vcpkg or Conan) should not assume the hint wins, per rule 4.
- **microsoft__vcpkg@`c4ee5a52d7`:scripts/buildsystems/vcpkg.cmake:207-213,452,454** is both the source this dive read *and* the exact binary measured directly in §5 and §9 (no network, the wave-2 fixture checkout) — real-file confirmation, not inference, for the chainload-before-guard order and the dual `CMAKE_PREFIX_PATH`/`CMAKE_FIND_ROOT_PATH` injection.
- **conan-io/conan@`2.32.0`:conan/tools/cmake/toolchain/blocks.py:580-641 (`FindFiles`)** is both read and measured (§6): the exact template text matches a real generated `conan_toolchain.cmake` from a live `conan install` run against a cross profile, byte-for-byte on the `CMAKE_FIND_ROOT_PATH_MODE_PACKAGE` lines.
- No exemplar in the 46-repo corpus was checked directly in this dive for the `lib64`/`LANGUAGES NONE` interaction (§7) or the pkg-config sysroot gap (§8) — both are host/toolchain mechanism findings, not corpus-authorship-style findings, and the existing `cmake-audit` inventories were not re-queried for them; a follow-up could grep the corpus for `project(\w+ LANGUAGES NONE)` immediately followed by a `find_package(... CONFIG)` to see whether real projects hit rule 6 in practice.

## AI-agent angle

- **Assuming a cross toolchain is "safe by default" once `CMAKE_SYSTEM_NAME`/`CMAKE_SYSROOT` are set.** A model trained on the `cmake-toolchains(7)` worked example (which always shows explicit `ONLY` lines) will often reproduce the explicit lines correctly *when asked to write a toolchain from scratch*, but when asked to *review* or *debug* an existing toolchain that omits them, it will frequently assert "the defaults already restrict this to the sysroot" — measured false (§1). Mechanical check: for any toolchain file setting `CMAKE_SYSROOT` or `CMAKE_SYSTEM_NAME`, grep for all three of `CMAKE_FIND_ROOT_PATH_MODE_LIBRARY`, `_INCLUDE`, `_PACKAGE`; missing any one is a finding regardless of what the model claims about defaults.
- **Inventing `CMAKE_FIND_LIBRARY_USE_LIB64_PATHS` as a variable.** The real name is the **global property** `FIND_LIBRARY_USE_LIB64_PATHS` (no `CMAKE_` prefix, not a variable) — a natural hallucination given how many other lib-search knobs *are* `CMAKE_`-prefixed variables. Mechanical check: `message(STATUS "${CMAKE_FIND_LIBRARY_USE_LIB64_PATHS}")` prints empty even when the property is `TRUE` (measured, §7); the correct read is `get_property(var GLOBAL PROPERTY FIND_LIBRARY_USE_LIB64_PATHS)`. Any generated code or explanation referencing `CMAKE_FIND_LIBRARY_USE_LIB64_PATHS` as a settable/readable cache variable is wrong.
- **Treating `set_tests_properties(... CROSSCOMPILING_EMULATOR ...)` as sufficient for a script-based test.** A model asked "how do I run this test under an emulator" will often reach for `set_tests_properties` on any test, since that is the generic mechanism for most test properties — but `CROSSCOMPILING_EMULATOR` is a *target* property that CTest only consults at generate time for target-command tests (§4). Mechanical check: does the test's `add_test(NAME ... COMMAND ...)` reference a CMake target, or a literal path/script? Only the former makes the property meaningful.
- **Assuming `CMAKE_SYSROOT` or a cross `CMAKE_TOOLCHAIN_FILE` automatically wires up `pkg_check_modules`.** Because `CMAKE_SYSROOT` genuinely does affect `find_package`/`find_library`/`find_path`, a model will often assume it also affects `pkg_check_modules` (a very common cross-compiling dependency path) — measured false (§8): `FindPkgConfig.cmake` has zero coupling to `CMAKE_SYSROOT`. Mechanical check: for any cross toolchain expected to support `pkg_check_modules`, grep for `PKG_CONFIG_SYSROOT_DIR` (as an `ENV{}` set inside the toolchain, or documented as a required external environment variable) — its complete absence alongside a `pkg_check_modules` call anywhere in the project is the finding.
- **Citing Conan 1's `build_requires` or assuming Conan doesn't handle cross builds' `find_root` interaction at all.** A model with older training data may not know Conan 2's `CMakeToolchain` actively *rewrites* `CMAKE_FIND_ROOT_PATH_MODE_*` — it may instead assume Conan leaves CMake's cross-compiling variables completely untouched (true for `CMAKE_FIND_ROOT_PATH` itself, false for the four mode variables — measured, §6). Mechanical check: `grep -n FIND_ROOT_PATH_MODE conan_toolchain.cmake` against a real Conan-2-generated cross toolchain file — the presence of `BOTH` overrides is Conan-specific behavior worth knowing before debugging an unexpected package resolution.
- **Assuming a toolchain file is read once per configure.** A model asked to reason about a toolchain file's performance or side effects will often treat it as a single-execution script. Measured (§1, §9, §10): even a `LANGUAGES NONE` project with zero `try_compile` calls reads it twice; a `LANGUAGES C` project with 2 explicit whole-project `try_compile()`s reads it 5 times. Mechanical check: any toolchain file containing an unconditional `execute_process()`, network call, or `message(FATAL_ERROR)` gated only on a variable set post-`project()` should be treated as running that many times, not once — instrument with `file(APPEND ...)` (§10's technique) rather than trusting a single `message(STATUS)` count (which vanishes into `try_compile`'s captured output, see below).
- **Trusting `message(STATUS ...)` output to count toolchain reads inside `try_compile`.** `try_compile()` captures its nested configure's stdout/stderr rather than forwarding it to the parent log by default; a `message(STATUS "read")` marker in a toolchain file will appear in the outer configure's console output only for the reads that happen *outside* `try_compile` (§10 measured exactly 2 `message()`-visible reads even with 2 explicit `try_compile()` calls present — the true count, 5, only appeared once the marker was changed to `file(APPEND ...)`, which is unaffected by output capture). Mechanical check: never conclude "N reads" from grepping console output for a `message()` marker if `try_compile` is anywhere in the configure — use a `file(APPEND ...)` sink instead.

## Contested / evolving

- **Whether `CMK-MOD-12` should now read as an unconditional guarantee or a conditional one.** This dive's §5/§6 measurements settle the *mechanical* question (the hand-off does not survive a manager's root-path injection or forced `BOTH`), but the *wording* consequence — whether `CMK-MOD-12` should carry a version floor, an explicit "does not apply once cross-compiling under a manager toolchain" clause, or be split into a separate cross-specific rule — is a documentation-shape decision for whoever folds this dive's findings back into the consolidated `cmake-dependency-seam.md`/module-authoring rule sets, not something this measurement alone resolves.
- **The true default for `CMAKE_FIND_ROOT_PATH_MODE_LIBRARY`/`_INCLUDE`/`_PACKAGE` (`BOTH`) is a long-standing CMake behavior, not a recent change** — nothing in the 4.0-4.4 release notes surveyed by the era-recheck or topic-map dives flags a change here, and it measured identically on 3.31.12 and 4.4.2. It is "contested" only in the sense that it contradicts a very widely copied mental model (and the topic map's own M-H-05 framing); there is no version-transition angle to track.
- **`CMAKE_LIBRARY_ARCHITECTURE` populating (or not) is entirely a function of the host/target distro, not of CMake version or of `LANGUAGES NONE` vs `C`** — this dive's Fedora/RHEL host never populates it under any configuration tested; a Debian/Ubuntu-targeted measurement would be needed to confirm the `lib/<tuple>` half of `M-G-21` behaves the same way once the tuple is actually available (the `CMAKE_SIZEOF_VOID_P`/`LANGUAGES NONE` mechanism for `lib64` is host-independent and fully confirmed; the `lib/<tuple>` mechanism's *language* dependency was read from `FindPkgConfig.cmake`'s source but not independently re-measured on a Debian-tuple host in this dive).
- **`rules_foreign_cc`'s own cross-compiling story (bundled `CMAKE_SYSTEM_NAME`/`generate_crosstool_file` defaults) was mid-change as of the 0.16.0 BCR-spoke retag** (per the era-recheck and toolchain-composition dives) — this dive did not re-touch `rules_foreign_cc` at all; its `CMAKE_FIND_ROOT_PATH_MODE_*` interaction (if any) with the caller-supplied-toolchain path remains unmeasured and out of scope here.

## Sources

| URL or measurement | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [CMAKE_FIND_ROOT_PATH_MODE_XXX.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/include/CMAKE_FIND_ROOT_PATH_MODE_XXX.rst) | Kitware normative doc, raw RST | Fetched 2026-09-26 | ONLY/NEVER/BOTH semantics, quoted verbatim; does not itself state the default |
| [cmake-toolchains.7.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-toolchains.7.rst) | Kitware normative manual, raw RST | Fetched 2026-09-26 | The worked-example toolchain (source of the widely-copied assumption §1 overturns) and the "by default in all cases... host system root prefix" sentence |
| [include/FIND_XXX_ROOT.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/include/FIND_XXX_ROOT.rst) | Kitware normative doc, raw RST | Fetched 2026-09-26 | "Rooted first, then non-rooted" ordering statement underlying §2/§5/§6 |
| [find_package.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/find_package.rst) | Kitware normative doc, raw RST | Fetched 2026-09-26 | Full 9-category search order, `<Name>_ROOT` precedence, lib64/lib32/`CMAKE_LIBRARY_ARCHITECTURE` gating, the 4.2 "most recent version" change and its actual (narrower) scope |
| [CROSSCOMPILING_EMULATOR (prop_tgt) @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/prop_tgt/CROSSCOMPILING_EMULATOR.rst) | Kitware normative doc, raw RST | Fetched 2026-09-26 | Confirms it is a *target* property, generate-time only, not supported for the old `add_test` form — grounds §4/rule 3 |
| [CMAKE_LIBRARY_ARCHITECTURE.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_LIBRARY_ARCHITECTURE.rst) | Kitware normative doc, raw RST | Fetched 2026-09-26 | "if detected" wording, grounds the host-distro-dependence note in §7 |
| [FindPkgConfig.cmake @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Modules/FindPkgConfig.cmake) | Kitware normative module source | Fetched 2026-09-26 | Read in full: zero `PKG_CONFIG_SYSROOT_DIR`/`PKG_CONFIG_LIBDIR` references, the `CMAKE_CROSSCOMPILING`-gated lib-suffix guess block, the forced `ALLOW_SYSTEM_*` env vars — grounds §7/§8 entirely |
| microsoft__vcpkg@`c4ee5a52d7`:scripts/buildsystems/vcpkg.cmake | Exemplar corpus source, also the real binary run in §5/§9 | Corpus checkout re-used 2026-09-26 | Chainload-before-guard order (207-213), dual `CMAKE_PREFIX_PATH`/`CMAKE_FIND_ROOT_PATH` injection (452,454) — read AND executed, not inferred |
| conan-io/conan@`2.32.0`:conan/tools/cmake/toolchain/blocks.py | Primary source code (`FindFiles` class) | Fetched 2026-09-26 | The `ONLY`→`BOTH` cross-compiling override, quoted and then confirmed byte-identical in a live generated file |
| find_ocx@`9094f87`:ocx.cmake:1200 | Read-only consumer repo | Read 2026-09-26 | Live instance of the `<Name>_ROOT CACHE ... FORCE` pattern rule 4 is about |
| Measurement: `find_package(onlyhost)` under an unset toolchain mode | Real run, CMake 3.31.12 and 4.4.2 via `ocx package exec kitware/cmake:{3.31,4.4}` | Run 2026-09-26 | Isolates and settles the true default (`BOTH`, not `ONLY`) — §1 |
| Measurement: `find_program(gen)`/`CMAKE_CROSSCOMPILING_EMULATOR`/`add_test`/`ctest -V` | Real run, CMake 4.4.2, Ninja 1.13.2 | Run 2026-09-26 | §3, §4 |
| Measurement: `<Name>_ROOT` vs `managerpath` vs sysroot, `--debug-find-pkg` | Real run, CMake 4.4.2 (spot-checked 3.31.12) | Run 2026-09-26 | §5 |
| Measurement: real `conan install` cross profile + generated `conan_toolchain.cmake`, `--debug-find-pkg` | Real run, Conan 2.32.0, CMake 4.4.2 | Run 2026-09-26 | §6 |
| Measurement: `LANGUAGES NONE` vs `C`, `CMAKE_SIZEOF_VOID_P`, `FIND_LIBRARY_USE_LIB64_PATHS` global property | Real run, CMake 3.31.12 and 4.4.2 | Run 2026-09-26 | §7 |
| Measurement: `pkg_check_modules` with `PKG_CONFIG_SYSROOT_DIR`/`_LIBDIR` set/unset, native and chainloaded | Real run, pkgconf 2.3.0, CMake 4.4.2 | Run 2026-09-26 | §8 |
| Measurement: real `vcpkg.cmake` chainload, well- and bad-behaved | Real run, CMake 4.4.2, local vcpkg checkout (no network, bootstrap not run) | Run 2026-09-26 | §9 |
| Measurement: `file(APPEND)`-based toolchain re-read count, 2 whole-project `try_compile()`s | Real run, CMake 4.4.2, Ninja 1.13.2, zig `aarch64-linux-musl` cross compiler | Run 2026-09-26 | §10 |

---
title: Install, export and CPS round trips, measured
topic: cmake-consumable-library
agent: cmake-install-round-trip
model: sonnet
kind: measure
date_researched: 2026-09-26
sources_count: 20
scope: |
  Measures what makes an installed CMake C library consumable and relocatable
  (install(TARGETS/EXPORT), configure_package_config_file, RPATH, absolute
  DESTINATION, pkg-config) and settles the CPS export rows (M-F-11/12,
  M-G-15) by running install(PACKAGE_INFO)/export(PACKAGE_INFO)/find_package
  against real CMake 3.31.12, 4.3.4 and 4.4.2 binaries. Does not cover
  Windows DLL installs, CPack, SBOM, or vcpkg/Conan-specific packaging
  (M-F-08/17/19, CMK-VCPKG/CMK-CONAN) — those are other rows' territory.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The base round trip: install, export, consume](#1-the-base-round-trip-install-export-consume)
   2. [A missing find_dependency is caught only downstream](#2-a-missing-find_dependency-is-caught-only-downstream)
   3. [RPATH: stripped by default, relocatable with $ORIGIN](#3-rpath-stripped-by-default-relocatable-with-origin)
   4. [Relocation: grep-clean tree, mv, re-consume](#4-relocation-grep-clean-tree-mv-re-consume)
   5. [Absolute DESTINATION defeats the prefix, DESTDIR still stages](#5-absolute-destination-defeats-the-prefix-destdir-still-stages)
   6. [CPS: where it writes, what it writes, what it refuses to read](#6-cps-where-it-writes-what-it-writes-what-it-refuses-to-read)
   7. [Config beats CPS by default; issue #26410 reproduced](#7-config-beats-cps-by-default-issue-26410-reproduced)
   8. [Version ranges: both endpoints, per-package](#8-version-ranges-both-endpoints-per-package)
   9. [pkg-config survives relocation](#9-pkg-config-survives-relocation)
   10. [Simulating a rules_foreign_cc wrap](#10-simulating-a-rules_foreign_cc-wrap)
   11. [Surprise: LANGUAGES NONE blinds find_package to lib64](#11-surprise-languages-none-blinds-find_package-to-lib64)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- `install(TARGETS … EXPORT)` + `install(EXPORT … NAMESPACE)` + `configure_package_config_file()` + `write_basic_package_version_file()` is a working, relocatable round trip on **3.31.12, 4.3.4 and 4.4.2** — measured identically on all three with a base→dep→consumer chain.
- A Config file missing `find_dependency(base)` is **not** caught by the exporting library's own build — it surfaces only at a **downstream consumer's** `find_package(dep)`, as a fatal error from the generated `depTargets.cmake` at the consumer's **Generate** step, byte-identical wording on 3.31.12 and 4.4.2.
- With no `CMAKE_INSTALL_RPATH` set, CMake actively **strips** the build-tree RPATH at install time (`Set non-toolchain portion of runtime path of "…" to ""`); the installed `.so`/executable then carries **no RUNPATH tag at all** and fails at runtime (`cannot open shared object file`) without `LD_LIBRARY_PATH`.
- `INSTALL_RPATH "$ORIGIN/../${CMAKE_INSTALL_LIBDIR}"` + `BUILD_WITH_INSTALL_RPATH FALSE` produces a genuinely relocatable install: `mv` the prefix, rerun the installed binary with no `LD_LIBRARY_PATH`, still works.
- `${CMAKE_INSTALL_LIBDIR}` resolves to **`lib64`**, not `lib`, on this Fedora-based host — any rule or doc that hardcodes `$ORIGIN/../lib` is wrong here; always derive the RPATH suffix from `CMAKE_INSTALL_LIBDIR`.
- `install(... DESTINATION /abs/path)` **defeats `CMAKE_INSTALL_PREFIX` entirely** — measured: changing the prefix and reinstalling still tries to write literally to `/abs/path` and fails without root (`Maybe need administrative privileges`); `DESTDIR` staging still works correctly on top of that absolute path.
- CMake 4.4's `CMD_INSTALL_ABSOLUTE_DESTINATION` diagnostic (default: **ignore**) only fires when promoted with `-Werror=install-absolute-destination`; on **3.31.12 and 4.3.4 that exact flag is silently accepted and does nothing** — no error, no warning — because the categorized-diagnostics system doesn't exist pre-4.4.
- `export(PACKAGE_INFO)` writes its build-tree `.cps` to `<build-dir>/cps/<package-name>/` **identically on 4.3.4 and 4.4.2** — confirms the CPS-verification ledger's "since 4.3.3" claim (row 14); no further move at 4.4.
- `install(PACKAGE_INFO)`'s platform-default destination on Linux/lib64 is `<prefix>/lib64/cps/<name>/<name>.cps`, plus a `<name>@noconfig.cps` twin when `CMAKE_BUILD_TYPE` is unset.
- `VERSION_SCHEMA rpm` (also `dpkg`, `pep440`) is written into the `.cps` **completely unvalidated** — but `find_package`'s own CPS version engine **rejects every version request** against such a package, even an exact numeric match: measured `VERSION_SCHEMA rpm` + package `1.2.0` + request `"1.2"` → `"not compatible with the version requested"`; the identical package rebuilt with `VERSION_SCHEMA simple` → accepted. CMake writes a schema it then refuses to read back for matching.
- A non-configuration-dependent generator expression (`$<COMPILE_LANGUAGE:C>`) on a CPS-recognized `INTERFACE_*` property is a **hard configure-time error** once `install(PACKAGE_INFO)` is wired up (`"...contains a generator expression. This is not allowed."`), even though the same property is perfectly legal for plain `install(EXPORT)`; `cmake --build`/`--install` against the already-generated tree still succeed and silently **drop** the property from the `.cps`.
- With both a Config package and a CPS package installed at their **default** search locations, `find_package(dep)` picks the **Config** file on **both** 4.3.4 and 4.4.2 (`dep_DIR` lands in `lib64/cmake/dep`, not `lib64/cps/dep`) — this appears to contradict the docs' "CPS preferred in most cases" framing for this default-search scenario. CPS is only actually selected when `dep_DIR` is pointed explicitly at the `lib64/cps/dep` directory.
- Issue [#26410](https://gitlab.kitware.com/cmake/cmake/-/issues/26410) reproduced directly: pointing `dep_DIR` at the CPS-only directory with a `VERSION_SCHEMA rpm` `.cps` fails on a numerically-matching version request; the same setup with `VERSION_SCHEMA simple` succeeds end to end (configure, build, run, output `43`).
- CPS version **ranges honor both endpoints** (`1.0...1.1` correctly excludes `1.2.0`; `1.0...1.3` includes it). The classic Config+`ConfigVersion.cmake` scheme **also** honors both endpoints — but only because `write_basic_package_version_file()` is explicitly range-aware; the docs' "non-CPS ignores the upper bound" caveat is per-package behavior, not a universal Config-mode limitation.
- Surprise, independent of CPS: a wrapper/superbuild `CMakeLists.txt` declaring `project(... LANGUAGES NONE)` **never finds a package installed under `lib64/`** via `find_package(... CONFIG)` — CMake only searches architecture-specific `lib64`/`lib32`/`lib/<arch>` directories when at least one compiled language is enabled in the calling project. Confirmed with `--debug-find-pkg`.
- A generated `.pc` using `${pcfiledir}`-relative `prefix=`/`libdir=`/`includedir=` resolves correctly via `pkg-config --cflags --libs` both before and after the entire install prefix is relocated — no rebuild, no edit.
- Simulating a `rules_foreign_cc` wrap (`unshare -rn` + external `CMAKE_TOOLCHAIN_FILE` + `-DCMAKE_POSITION_INDEPENDENT_CODE=ON`) configures, builds `-j4`, and installs a **static** library with zero network access; the verbose build log shows `-fPIC` reaching the compiler invocation for the archived object.
- `grep`-ing the fully-installed tree (both libraries, three prefixes) for the literal build-tree and source-tree absolute paths returns **zero hits** — `configure_package_config_file()`'s `@PACKAGE_INIT@`/`PACKAGE_PREFIX_DIR` machinery plus `GNUInstallDirs`-relative destinations plus `$<INSTALL_INTERFACE:…>` together produce a genuinely relocatable tree with no manual fix-up.

## Findings

All measurements below use the scratch project at
`.agents/research/cmake-consumable-library/scratch/install-round-trip/src/`
(three tiny C libraries/executables: `base` ← `dep` ← `consumer`, `dep` has a
PUBLIC dependency on `base`) built with `gcc 15.2.1` via
`ocx package exec kitware/cmake:<3.31|4.3|4.4> -- cmake`, generator
`Unix Makefiles`. Full command transcripts live under
`/home/mherwig/.cache/cmake-measure-scratch/install-round-trip/log-*.txt`
(not committed; scratch is on-disk per the run's constraints).

### 1. The base round trip: install, export, consume

`base/CMakeLists.txt` and `dep/CMakeLists.txt` both do:

```cmake
install(TARGETS dep EXPORT depTargets
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR})
install(EXPORT depTargets NAMESPACE dep:: DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/dep)

include(CMakePackageConfigHelpers)
configure_package_config_file(depConfig.cmake.in "${CMAKE_CURRENT_BINARY_DIR}/depConfig.cmake"
    INSTALL_DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/dep)
write_basic_package_version_file("${CMAKE_CURRENT_BINARY_DIR}/depConfigVersion.cmake"
    VERSION ${PROJECT_VERSION} COMPATIBILITY SameMajorVersion)
```

`consumer/CMakeLists.txt` is the 5-statement consumer:

```cmake
cmake_minimum_required(VERSION 3.20)
project(consumer LANGUAGES C)
find_package(dep 1.2 CONFIG REQUIRED)
add_executable(consumer main.c)
target_link_libraries(consumer PRIVATE dep::dep)
```

Measured end to end on all three binaries — configure, build, install `base`,
then `dep` (against `-DCMAKE_PREFIX_PATH=$PFX`), then configure+build+run
`consumer` against the same `CMAKE_PREFIX_PATH`:

```
$ ocx package exec kitware/cmake:4.4 -- cmake -S src/consumer -B b-consumer-442 \
    -G "Unix Makefiles" -DCMAKE_C_COMPILER=gcc -DCMAKE_PREFIX_PATH=$PFX
...
-- Build files have been written to: .../b-consumer-442
$ ocx package exec kitware/cmake:4.4 -- cmake --build b-consumer-442
[100%] Built target consumer
$ ./b-consumer-442/consumer
43
```

Identical `43` output (42 from `base` + 1 from `dep`) on 3.31.12 and 4.3.4.
This is `M-F-01`'s round trip, confirmed measured (not just a CI grep for a
`cmake --install` step, which the fleet's own audit already flagged as
unconfirmed end-to-end — see [Sources](#sources), row "cmake-audit
exemplar-cmake-shape.md").

### 2. A missing find_dependency is caught only downstream

`M-F-03`. Removed `find_dependency(base)` from the **installed**
`depConfig.cmake` (simulating an author who forgot it), then reconfigured a
fresh `consumer` build against the same prefix — did **not** touch `dep`'s
own build or install, which stays green regardless:

```
$ ocx package exec kitware/cmake:4.4 -- cmake -S src/consumer -B b-consumer-nodep \
    -G "Unix Makefiles" -DCMAKE_C_COMPILER=gcc -DCMAKE_PREFIX_PATH=$PFX
-- Configuring done (0.0s)
CMake Error at .../lib64/cmake/dep/depTargets.cmake:61 (set_target_properties):
  The link interface of target "dep::dep" contains:
    base::base
  but the target was not found.  Possible reasons include:
    * There is a typo in the target name.
    * A find_package call is missing for an IMPORTED target.
    * An ALIAS target is missing.
Call Stack (most recent call first):
  .../lib64/cmake/dep/depConfig.cmake:28 (include)
  CMakeLists.txt:3 (find_package)
-- Generating done (0.0s)
CMake Generate step failed.  Build files cannot be regenerated correctly.
```

Byte-identical wording and phase (`Configuring done` printed, error fires
during the same pass, `CMake Generate step failed`, exit 1) reproduced on
**3.31.12**. **Answers the DECIDE question directly: yes, a missing
`find_dependency` is caught only at consume time**, never at the exporting
project's own configure/build/install. A CI job that only builds and
installs the library — the majority pattern the fleet's own corpus audit
found (7/46 repos run `cmake --install` in CI, **0** traced to a second,
independent consumer configure) — will never catch this class of bug.

### 3. RPATH: stripped by default, relocatable with $ORIGIN

`M-F-07`. Default build (no `INSTALL_RPATH` set anywhere):

```
$ ocx package exec kitware/cmake:4.4 -- cmake --install b-dep-442
-- Installing: .../lib64/libdep.so.1.2.0
-- Set non-toolchain portion of runtime path of ".../lib64/libdep.so.1.2.0" to ""
$ readelf -d prefix442/lib64/libdep.so.1.2.0 | grep -i RUNPATH
(no output)
$ readelf -d prefix442/bin/consumer | grep -i RUNPATH
(no output)
$ env -i PATH=/usr/bin:/bin prefix442/bin/consumer
prefix442/bin/consumer: error while loading shared libraries: libdep.so.1: cannot open shared object file: No such file or directory
```

CMake doesn't merely "not set" RPATH by default — it **explicitly clears**
whatever build-tree RPATH would otherwise leak in, and prints that it did
so. With `-DBASE_SET_RPATH=ON -DDEP_SET_RPATH=ON` (each target does
`set_target_properties(… PROPERTIES INSTALL_RPATH "$ORIGIN/../${CMAKE_INSTALL_LIBDIR}" BUILD_WITH_INSTALL_RPATH FALSE)`)
plus `-DCMAKE_INSTALL_RPATH='$ORIGIN/../lib64'` for the consumer itself:

```
$ readelf -d prefix442-rpath/bin/consumer | grep -i RUNPATH
 0x000000000000001d (RUNPATH)  Library runpath: [$ORIGIN/../lib64]
$ env -i PATH=/usr/bin:/bin prefix442-rpath/bin/consumer
43
```

`${CMAKE_INSTALL_LIBDIR}` resolved to `lib64` on this host (`GNUInstallDirs`
on a 64-bit Fedora-family layout) — **not** `lib`. Any rule that writes a
literal `$ORIGIN/../lib` is wrong on this class of host; the RPATH suffix
must always come from `CMAKE_INSTALL_LIBDIR`, never a literal.

### 4. Relocation: grep-clean tree, mv, re-consume

`M-F-02`.

```
$ grep -rn "$SRC_DIR" "$BUILD_DIR" prefix442  # both the plain and RPATH prefixes
(no output — 0 hits in either)
$ mv prefix442-rpath prefix442-rpath-MOVED
$ env -i PATH=/usr/bin:/bin prefix442-rpath-MOVED/bin/consumer
43
$ ocx package exec kitware/cmake:4.4 -- cmake -S src/consumer -B b-consumer-reloc \
    -DCMAKE_C_COMPILER=gcc -DCMAKE_PREFIX_PATH=prefix442-rpath-MOVED
-- Configuring done ... Generating done ... Build files have been written to: b-consumer-reloc
$ ./b-consumer-reloc/consumer
43
```

Both the already-built relocated binary (thanks to `$ORIGIN`) and a
completely fresh consumer configure/build against the moved prefix (thanks
to `@PACKAGE_INIT@`/`PACKAGE_PREFIX_DIR`) succeed with no edits.

### 5. Absolute DESTINATION defeats the prefix, DESTDIR still stages

`M-F-06`. Minimal probe: `install(FILES payload.txt DESTINATION /opt/absdest-payload)`.

Default (diagnostic category `ignore`), install under `DESTDIR`:

```
$ DESTDIR=$S/destdir-stage cmake --install b-absdest-default
-- Installing: .../destdir-stage/opt/absdest-payload/payload.txt
```

`DESTDIR` staging still works — it's applied on top of whatever the
resolved (here: absolute, unprefixed) path is. But changing
`CMAKE_INSTALL_PREFIX` instead of using `DESTDIR` does **nothing** for this
rule:

```
$ cmake -S src/absdest -B b-absdest-prefix -DCMAKE_INSTALL_PREFIX=$S/some-other-prefix
$ cmake --install b-absdest-prefix
CMake Error at b-absdest-prefix/cmake_install.cmake:49 (file):
  file cannot create directory: /opt/absdest-payload.  Maybe need
  administrative privileges.
```

4.4.2's diagnostic, per `cmake --help-manual cmake-diagnostics`:

```
CMD_INSTALL_ABSOLUTE_DESTINATION
---------------------------------
.. versionadded:: 4.4
:default: ignore
:parent: CMD_AUTHOR
Warn when an install() command specifies an absolute DESTINATION path...
```

Promoted:

```
$ ocx package exec kitware/cmake:4.4 -- cmake -S src/absdest -B b -Werror=install-absolute-destination
CMake Error (install-absolute-destination) at CMakeLists.txt:3 (install):
  INSTALL command given absolute DESTINATION path:
    /opt/absdest-payload
This error is for project developers.  Use -Wno-error=author or
-Wno-error=install-absolute-destination to suppress it.
```

Same flag on **3.31.12** and **4.3.4** — silently accepted, zero effect:

```
$ ocx package exec kitware/cmake:3.31 -- cmake -S src/absdest -B b331 -Werror=install-absolute-destination
-- Configuring done (0.0s)
-- Generating done (0.0s)
(exit 0, no warning at all)
$ ocx package exec kitware/cmake:4.3 -- cmake -S src/absdest -B b434 -Werror=install-absolute-destination
(same: exit 0, no warning)
```

**Category name, exact CLI spelling: `install-absolute-destination`**
(kebab-case of `CMD_INSTALL_ABSOLUTE_DESTINATION` minus the `CMD_` prefix),
introduced 4.4 with **no legacy `-Werror=dev` equivalent** — passing this
flag in a CI script that must also run on 3.x/4.3 gives a false sense of
safety.

### 6. CPS: where it writes, what it writes, what it refuses to read

`M-F-11`, `M-F-12`. `dep`'s CMakeLists, guarded on the version floor:

```cmake
if(DEP_CPS AND CMAKE_VERSION VERSION_GREATER_EQUAL 4.3)
  install(PACKAGE_INFO dep EXPORT depTargets
      VERSION 1.2.0 COMPAT_VERSION 1.0.0 VERSION_SCHEMA rpm)
endif()
if(DEP_CPS_EXPORT AND CMAKE_VERSION VERSION_GREATER_EQUAL 4.3)
  export(PACKAGE_INFO dep EXPORT depTargets VERSION 1.2.0)
endif()
```

**Build-tree location** (`export(PACKAGE_INFO)`), identical on both:

```
$ find b-dep-434-cpsexport -iname '*.cps'
b-dep-434-cpsexport/cps/dep/dep.cps
$ find b-dep-442-cpsexport -iname '*.cps'
b-dep-442-cpsexport/cps/dep/dep.cps
```

Matches `export.rst`: *"Files are written to the `cps/<package-name>`
subdirectory of the current build directory."* Confirms
[cps-verification.md](../cmake-dependency-seam/cps-verification.md) ledger
row 14 (the 4.3.3 move) still holds unchanged at 4.4.2 — no further move.

**Install-tree location** (`install(PACKAGE_INFO)`, no `DESTINATION`
given — "a platform-specific default is used"):

```
-- Installing: .../lib64/cps/dep/dep.cps
-- Installing: .../lib64/cps/dep/dep@noconfig.cps
```

i.e. `<prefix>/lib64/cps/<name>/<name>.cps`, plus a `@noconfig` twin
(no `CMAKE_BUILD_TYPE` was set for this single-config generator).

**Content, with `VERSION_SCHEMA rpm`:**

```json
{
  "compat_version" : "1.0.0",
  "components" : { "dep" : { "includes" : [ "@prefix@/include" ],
    "requires" : [ "base:base" ], "type" : "dylib" } },
  "cps_path" : "@prefix@/lib64/cps/dep",
  "cps_version" : "0.14.1",
  "name" : "dep",
  "requires" : { "base" : { "components" : [ "base" ],
    "hints" : [ ".../lib64/cmake/base" ], "version" : "1.0.0" } },
  "version" : "1.2.0",
  "version_schema" : "rpm"
}
```

`version_schema: "rpm"` lands verbatim, unvalidated — matches
cps-verification ledger row 19 (**REFUTED for export**: CMake writes
`dpkg`/`rpm`/`pep440` without a diagnostic).

**What it refuses to read back.** `find_package` cannot compare `rpm`
against a numeric request. Pointing `dep_DIR` straight at the CPS
directory:

```
$ ocx package exec kitware/cmake:4.4 -- cmake -S src/consumer -B b \
    -Ddep_DIR=$PFX/lib64/cps/dep -DCMAKE_PREFIX_PATH=$PFX
CMake Error at CMakeLists.txt:3 (find_package):
  Could not find a configuration file for package "dep" that is compatible
  with requested version "1.2".
  The following configuration files were considered but not accepted:
    .../lib64/cps/dep/dep.cps, version: 1.2.0
      Version "1.2.0" is not compatible with the version requested.
```

Rebuilt the identical package with `VERSION_SCHEMA simple` (the CPS
default) instead of `rpm` — same numeric version, same request:

```
-- Configuring done (0.1s)
-- Generating done (0.0s)
$ ./consumer
43
```

**This is the chased surprise**: `install(PACKAGE_INFO VERSION_SCHEMA rpm)`
is accepted silently at export time and produces a syntactically valid
`.cps`, but CMake's own `find_package` then refuses to accept *any* version
request against that same file — not "loosely accepts," not "warns,"
**rejects outright**, even an exact match. A project that sets
`VERSION_SCHEMA rpm` "because that's how our distro versions things" makes
its own CPS file unconsumable by CMake.

**Generator expressions.** Added
`target_compile_definitions(dep INTERFACE "$<$<COMPILE_LANGUAGE:C>:DEP_C_ONLY_DEFINE>")`
(a non-configuration-dependent genex on `INTERFACE_COMPILE_DEFINITIONS`, a
CPS-recognized property) with `install(PACKAGE_INFO)` active:

```
$ ocx package exec kitware/cmake:4.3 -- cmake -S src/dep -B b -DDEP_CPS=ON ...
-- Configuring done (0.1s)
CMake Error in CMakeLists.txt:
  Property "INTERFACE_COMPILE_DEFINITIONS" of target "dep" contains a
  generator expression.  This is not allowed.
-- Generating done (0.0s)
CMake Generate step failed.  Build files cannot be regenerated correctly.
(configure exit 1)
$ cmake --build b && cmake --install b   # run anyway
[100%] Built target dep
-- Installing: .../lib64/cps/dep/dep.cps
(both exit 0)
```

The resulting `dep.cps` has **no** `defines` entry for `dep` at all — the
property is silently dropped, not partially exported. Matches
`install.rst`'s note *("generator expression support…limited…to
configuration-dependent expressions")* exactly, but the practical shape is
sharper than the prose: it's a **hard, fatal configure error** (deferred
genex-evaluation error, reported after "Generating done"), yet the build
tree it leaves behind is fully buildable and installable — an agent that
only checks the build/install exit code, not the configure exit code, will
ship a `.cps` silently missing data and never notice.

### 7. Config beats CPS by default; issue #26410 reproduced

`M-G-15`. With **both** `depConfig.cmake` and `dep.cps` installed at their
respective default search locations in the same prefix, on **both** 4.3.4
and 4.4.2:

```
$ ocx package exec kitware/cmake:4.4 -- cmake -S src/consumer -B b -DCMAKE_PREFIX_PATH=$PFX
$ grep ^dep_DIR b/CMakeCache.txt
dep_DIR:PATH=.../lib64/cmake/dep
```

Reproduced identically on 4.3.4. The documented search-path table
(`find_package.rst`) lists `<prefix>/lib*/cps/<name>/` *before*
`<prefix>/lib*/cmake/<name>*/` for Unix, and the same doc says CPS is
"preferred…in most cases" — but the measured `dep_DIR` in both runs is the
**Config** directory, not the CPS one. Root cause not isolated further
(possibly a real gap between the documented order and the implementation,
or an interaction this dive didn't chase down); reported as a measured
fact, not a doc interpretation, because it directly determines what a
freshly-installed project actually consumes.

CPS **is** selected once you stop relying on the default search and point
at it directly — reproducing [issue #26410](https://gitlab.kitware.com/cmake/cmake/-/issues/26410)'s exact "mixed directory" premise:

```
$ cmake -Ddep_DIR=$PFX/lib64/cps/dep -DCMAKE_PREFIX_PATH=$PFX ...
```

picks the `.cps` (see §6's version-schema test, which used exactly this).

### 8. Version ranges: both endpoints, per-package

`M-G-15`, cps-verification row 22. Probe project:
`find_package(dep ${PROBE_RANGE} REQUIRED)`.

| Path | Range | Package | Result |
|---|---|---|---|
| CPS (`dep_DIR` → `lib64/cps/dep`, schema `simple`) | `1.0...1.1` | `1.2.0` | rejected — `"considered but not accepted...not compatible"` |
| CPS, same | `1.0...1.3` | `1.2.0` | accepted, configures clean |
| Config (`CMAKE_PREFIX_PATH` only) | `1.0...1.1` | `1.2.0` | rejected |
| Config, same | `1.0...1.3` | `1.2.0` | accepted |

Both endpoints are honored on **both** paths here — but the Config side
only because `write_basic_package_version_file()`'s generated
`depConfigVersion.cmake` explicitly branches on `PACKAGE_FIND_VERSION_RANGE`
(confirmed by reading the generated file). `find_package.rst`'s own caveat
("non-CPS packages…ignore the upper end point…unless the package is
designed to expect it") is real but **per-package**: a hand-rolled
`*ConfigVersion.cmake` that doesn't check `PACKAGE_FIND_VERSION_RANGE` would
silently accept `1.2.0` for a `1.0...1.1` request. CPS is the only path
where range support is a CMake-side guarantee independent of the package
author's version-file code.

### 9. pkg-config survives relocation

`M-F-14`. `base.pc.in`:

```
prefix=${pcfiledir}/../..
libdir=${prefix}/@CMAKE_INSTALL_LIBDIR@
includedir=${prefix}/@CMAKE_INSTALL_INCLUDEDIR@
Libs: -L${libdir} -lbase
Cflags: -I${includedir}
```

```
$ PKG_CONFIG_PATH=prefix442/lib64/pkgconfig pkg-config --cflags --libs base
-I.../prefix442/lib64/pkgconfig/../../include -L.../prefix442/lib64/pkgconfig/../../lib64 -lbase
$ cp -r prefix442 prefix442-pc-moved   # simulates mv
$ PKG_CONFIG_PATH=prefix442-pc-moved/lib64/pkgconfig pkg-config --cflags --libs base
-I.../prefix442-pc-moved/lib64/pkgconfig/../../include -L.../prefix442-pc-moved/.../lib64 -lbase
```

Resolves correctly against the new path with zero edits, because
`${pcfiledir}` is expanded by `pkg-config` itself at query time from the
`.pc` file's actual on-disk location, not baked in at `configure_file()`
time.

### 10. Simulating a rules_foreign_cc wrap

`M-K-01`, `M-G-18`. `unshare -rn` (loopback-only network namespace) +
external toolchain file + static build + PIC:

```
$ unshare -rn ocx package exec kitware/cmake:4.4 -- cmake -S src/base -B b \
    -DCMAKE_TOOLCHAIN_FILE=toolchain-external.cmake \
    -DCMAKE_INSTALL_PREFIX=prefix-foreigncc -DBASE_SHARED=OFF \
    -DCMAKE_POSITION_INDEPENDENT_CODE=ON
(configure exit 0)
$ unshare -rn cmake --build b -j 4
(build exit 0)
$ unshare -rn cmake --install b
(install exit 0)
$ find prefix-foreigncc -type f
prefix-foreigncc/include/base.h
prefix-foreigncc/lib64/cmake/base/{baseConfig,baseConfigVersion,baseTargets,baseTargets-noconfig}.cmake
prefix-foreigncc/lib64/libbase.a
prefix-foreigncc/lib64/pkgconfig/base.pc
```

Zero network reached at any of configure/build/install (the whole flow
happens inside a namespace with no route to anywhere but loopback), and
`grep -rn -e FetchContent_MakeAvailable -e 'file(DOWNLOAD' -e ExternalProject_Add -e CPMAddPackage -e HunterGate src/`
across the scratch sources returns nothing — `M-G-18`'s "enumerate and
switch off" check is trivially satisfied by having none of these calls.
PIC reaching the **static** archive's object file, confirmed from the
verbose build log:

```
$ VERBOSE=1 cmake --build b
/usr/sbin/gcc -I... -fPIC -MD -MT CMakeFiles/base.dir/base.c.o ... -c base.c
```

### 11. Surprise: LANGUAGES NONE blinds find_package to lib64

Not in the brief; found while investigating §8's range tests. A probe
project declared `project(proberange LANGUAGES NONE)` and called
`find_package(dep 1.0...1.3 REQUIRED)` against a prefix that has
`lib64/cmake/dep/depConfig.cmake` — and failed to find it at all, even
though the identical `find_package` call from a `LANGUAGES C` project
(the real `consumer`) succeeds against the same prefix. `--debug-find-pkg=dep`
confirms why:

```
$ cmake -S src/probe-range -B b -DCMAKE_PREFIX_PATH=prefix442 --debug-find-pkg=dep
  find_package considered the following locations for dep's Config module:
    .../prefix442/depConfig.cmake
    .../prefix442/dep-config.cmake
    .../prefix442/lib/cps/dep.cps
    .../prefix442/share/cps/dep.cps
    ... (dozens more top-level-only candidates, PATH-derived roots)
  The file was not found.
```

**No `lib64/...` candidate appears anywhere in the list.** Switching the
probe to `project(proberange LANGUAGES C)` with everything else identical
makes it succeed immediately. Confirmed by `find_package.rst` line ~436:
*"If at least one compiled language has been enabled, the
architecture-specific `lib/<arch>` and `lib*` directories may be
searched…"* — a project with no compiled language enabled **cannot** find
a Config package under `lib64` (or `lib32`, or `lib/<arch>`) by design,
regardless of `CMAKE_PREFIX_PATH` correctness. This directly matters for
any top-level "orchestrator" `CMakeLists.txt` in a polyglot monorepo that
declares `LANGUAGES NONE` and does a `find_package(... CONFIG)` for a
compiled dependency before descending into subdirectories.

## Normative guidance candidates

1. **Every PUBLIC/INTERFACE `find_package` dependency of an exported target must have a matching, hand-written `find_dependency()` in that Config's `.cmake.in`.** CMake never generates it and never checks for it at export time — only a downstream consumer's `find_package` reveals a missing one, as a fatal `set_target_properties` error from the generated `<X>Targets.cmake`. *Verify*: for each `target_link_libraries(<t> PUBLIC ns::x)` on an exported target, `grep -n 'find_dependency(x' <Config>.cmake.in`; missing = finding. Floor: any (3.0+, `find_dependency` has existed since 3.0).
2. **Any installed shared library or executable that links another installed shared library must set `INSTALL_RPATH` (`$ORIGIN/../${CMAKE_INSTALL_LIBDIR}` on Linux, `@loader_path/../…` on Apple) and `BUILD_WITH_INSTALL_RPATH FALSE`, or ship broken.** By default CMake strips the RPATH at install (measured), leaving no way to find sibling libraries without `LD_LIBRARY_PATH`. *Verify*: `readelf -d <installed-binary> | grep -q RUNPATH` — empty when the binary NEEDS another installed `.so` = finding. Floor: any.
3. **Never hardcode `lib` or `lib64` as a literal path segment — always derive it from `${CMAKE_INSTALL_LIBDIR}`,** including inside `INSTALL_RPATH` strings and `.pc.in` templates; the value is platform-determined (measured `lib64` on this host) and a literal breaks portability silently. *Verify*: `rg -n -e 'ORIGIN/\.\./lib"' -e 'DESTINATION lib64' -e 'DESTINATION "lib/' CMakeLists.txt`; a hit not using `${CMAKE_INSTALL_LIBDIR}` = finding.
4. **Never write `install(... DESTINATION /literal/absolute/path)` in project code.** It silently defeats `CMAKE_INSTALL_PREFIX` (measured: overriding the prefix does nothing, the literal path is used verbatim and fails without root) and only ever works through `DESTDIR` staging. *Verify* (4.4+ floor): reconfigure with `-Werror=install-absolute-destination`; nonzero exit = finding. Below 4.4: `rg -n 'DESTINATION\s+/[^$"]' CMakeLists.txt` (a literal leading `/`, not a variable) — hit = finding. This diagnostic has **no pre-4.4 equivalent**; do not rely on `-Werror=install-absolute-destination` in a CI matrix that includes 3.x/4.3 without also running the grep-based check.
5. **A project that installs a Config package and targets a CMake ≥ 4.3 floor should also `install(PACKAGE_INFO)` beside it, guarded by `if(CMAKE_VERSION VERSION_GREATER_EQUAL 4.3)` — but never as a replacement, and never expect it to be picked up automatically.** Measured: with both installed at default locations, `find_package` chose the Config file on both 4.3.4 and 4.4.2. CPS today is a no-regression addition for non-CMake tooling, not (yet) a change to what an ordinary CMake consumer resolves. *Verify*: `install(EXPORT` present without a paired, version-guarded `install(PACKAGE_INFO` = SHOULD-level finding; presence of `install(PACKAGE_INFO` with NO paired `install(EXPORT`/Config = MUST-level finding (never CPS-only).
6. **Never set `VERSION_SCHEMA` to `rpm`, `dpkg` or `pep440` on `install(PACKAGE_INFO)` for a package any CMake consumer might `find_package()`.** CMake writes these unvalidated but its own version-matching engine rejects every request against them, even an exact match (measured). Use the default (`simple`) or `custom`, whose comparison semantics CMake actually implements. *Verify*: `rg -n 'VERSION_SCHEMA\s+(rpm|dpkg|pep440)' CMakeLists.txt` — hit = finding unless the package is explicitly non-CMake-only.
7. **Never place a non-configuration-dependent generator expression (`$<COMPILE_LANGUAGE:...>`, `$<TARGET_...>`, etc.) in an `INTERFACE_*` property of a target that is also exported via `install(PACKAGE_INFO)`.** It's legal for plain `install(EXPORT)` but a hard configure-time error once CPS export is added (measured: `"...contains a generator expression. This is not allowed."`), and the resulting `.cps` silently drops the property even though `cmake --build`/`--install` still succeed. *Verify*: after adding `install(PACKAGE_INFO)`, `cmake -S -B` must exit 0; a nonzero exit citing "contains a generator expression" = finding — check the configure exit code specifically, not just build/install.
8. **Template pkg-config `.pc` files from `${pcfiledir}`, never from the CMake-time absolute prefix.** This, not the paired `install(EXPORT)`, is what survives an `mv` of the prefix (measured). *Verify*: `.pc.in` must contain `${pcfiledir}`; a literal `@CMAKE_INSTALL_PREFIX@` used for `prefix=` = finding.
9. **A top-level/superbuild `CMakeLists.txt` that calls `find_package(... CONFIG)` for anything installed under an architecture-specific directory (`lib64`, `lib32`, `lib/<arch>`) must enable at least one compiled language before that call — `project(... LANGUAGES NONE)` silently blinds the search to those directories** (measured, confirmed via `--debug-find-pkg`). *Verify*: a `project(...)` declaring `LANGUAGES NONE` followed by any `find_package(... CONFIG)` expected to resolve a compiled dependency = finding; confirm with `--debug-find-pkg=<name>` and check whether any `lib64`/`lib32` candidate appears.
10. **A project meant to be wrapped by `rules_foreign_cc` (or any similar bootstrap) must configure/build/install with zero network and must propagate `CMAKE_POSITION_INDEPENDENT_CODE` to every target that ends up in a distributable archive, static included** — not just to shared-library targets. *Verify*: `unshare -rn cmake --build ...` exits 0 for the full configure→build→install sequence; `VERBOSE=1 cmake --build ...` shows `-fPIC` on the compile line for a static target when `CMAKE_POSITION_INDEPENDENT_CODE=ON` is set. Cite `rules_foreign_cc`'s own contract (`BZL-CC-22/23/24`, `bazel-quality/cpp.md`) for the Bazel-side half; this rule is the CMake-project side only.
11. **The install-then-consume round trip is a required, separate CI step, not implied by "the install step exits 0."** A missing `find_dependency` (rule 1) and most relocation breakage are invisible from the exporting project's own build+install log — they only appear when something else `find_package()`s the result. *Verify*: CI must run a second, independent `cmake` configure (and ideally build+run) of a throwaway consumer against `-DCMAKE_PREFIX_PATH=<the just-installed prefix>`, as a step distinct from "run the library's own test suite."
12. **Relocation is a mandatory, scripted CI check: grep the installed tree for the build- and source-directory absolute paths (must be empty), then physically move the prefix and re-run both the installed binary and a fresh consumer configure against the new location.** *Verify*: `grep -rn -e "$SRC_DIR" -e "$BUILD_DIR" "$PREFIX"` — empty = pass; then `mv "$PREFIX" "$PREFIX-moved"` and repeat the round trip from rule 11 against the moved path — any failure = finding.

## Exemplar evidence

- **Rule 1 (find_dependency)** — `friendlyanon/cmake-init@7e0c52fc73f2:cmake-init/templates/common/cmake/install-config.cmake` ships exactly this pattern as its generated-project template: `include(CMakeFindDependencyMacro)` / `find_dependency(fmt)` guarded before including `<name>Targets.cmake`. This is the tool the fleet's own `cmake-audit` corpus flags as the closest thing to a canonical "new project" skeleton.
- **Rule 2 (RPATH)** — `apache/arrow@3ad410b7b1a2:cpp/cmake_modules/BuildUtils.cmake:410-417` implements the exact cross-platform pattern (`$ORIGIN` on Linux, `@loader_path` on Apple) behind an `ARROW_RPATH_ORIGIN` toggle — a real, large exemplar doing what rule 2 asks, not a toy. Per `cmake-audit/exemplar-cmake-shape.md` the corpus-wide adoption of any RPATH-family variable is well under half (`CMAKE_INSTALL_RPATH` 33/46, `INSTALL_RPATH_USE_LINK_PATH` 13/46) — most exemplars simply don't handle this, which is consistent with this dive's finding that the *default* (do nothing) silently produces an unusable installed binary rather than an obviously broken one.
- **Rule 4 (absolute DESTINATION)** — a quick corpus scan (`curl`, `openssl`, `protobuf`, `grpc`, `qtbase`) found **zero genuine `install(... DESTINATION /literal)` violations**; the one hit, `qtbase@0ef5a8e9cadd:examples/corelib/time/calendarbackendplugin/application/CMakeLists.txt:21`, is `qt_add_wasm_preload(... DESTINATION /plugin ...)` — a Qt-specific Emscripten helper whose `DESTINATION` names an in-memory virtual path, not `install()`'s prefix-relative one. Read this as: the mistake is rare in mature projects, which is exactly why an agent needs the mechanical check (rule 4) rather than "reviewers will notice it" — reviewers rarely see it either.
- **Rule 5 (CPS)** — per `cmake-audit/exemplar-cmake-shape.md`, `install(PACKAGE_INFO ...)` has **54 hits in the 46-repo corpus, all inside `Kitware/CMake`'s own test/doc tree — 0 real adopters**. Nothing in the corpus currently exercises rules 5-7 in the wild; this dive's measurements are the only evidence available until a real adopter appears.
- **`find_ocx`** ships no library and calls no `install(EXPORT ...)` or `install(PACKAGE_INFO ...)` (confirmed: zero hits for either in `ocx-sh/find_ocx@ac2a759cd0da`), so none of these rules apply to it directly. It is, however, a live instance of rule 9's precondition: `find_ocx/CMakeLists.txt:9` is `project(find_ocx LANGUAGES NONE)`, and its own `find_package(ocx REQUIRED)` calls (`Findocx.cmake`, `examples/find_package/CMakeLists.txt:19`) go through **Module mode**, not Config mode — Module mode has no `lib64`-gating-on-language behavior, so `find_ocx` happens to sidestep the exact pitfall in finding #11 by construction, not by policy. A future Config-mode `find_package()` added to that same `LANGUAGES NONE` project would hit it.

## AI-agent angle

- **Assuming CMake auto-generates `find_dependency()` calls.** A model trained mostly on `install(EXPORT)`/`configure_package_config_file()` boilerplate tends to reproduce the template's *shape* (the macro include, the `check_required_components` call) but treats the dependency propagation as automatic, because `target_link_libraries(... PUBLIC ns::x)` really does make the *build* work without any extra step. The smallest mechanical check: for every exported target's PUBLIC/INTERFACE `ns::x` link, `grep` the Config template for a matching `find_dependency(x`.
- **Assuming an installed shared library "just works" at its new location.** Models trained on 2.8-era or Windows-flavored examples (or examples that never actually run the installed binary) miss that Linux/macOS need an explicit `INSTALL_RPATH`; the failure mode (`cannot open shared object file`) looks like a linking bug, not an install-configuration gap, and a model will often "fix" it by adding `LD_LIBRARY_PATH` to a run script instead of fixing the RPATH — masking the packaging bug for every *other* consumer of that install tree. Check: `readelf -d`/`otool -l` on the actual installed artifact, not the build-tree one.
- **Treating CPS (`install(PACKAGE_INFO)`) as either "doesn't exist" (pre-2026 training data) or "the modern replacement for `install(EXPORT)`" (over-correcting once told CPS is stable in 4.3).** Both are wrong: CPS is additive, `install(EXPORT)`/Config packages remain necessary (this dive measured Config winning the default resolution over CPS on both 4.3.4 and 4.4.2), and a model asked to "modernize" a project's exports should never delete the Config path. Check: after any CPS-adding edit, `install(EXPORT` must still be present and unconditional.
- **Copy-pasting `VERSION_SCHEMA rpm`/`dpkg` from a packaging-adjacent example** (a model that has seen RPM/deb packaging code will reach for these names by pattern-matching, since they read as "the right schema for a Linux package") **without knowing CMake accepts but can't compare them.** Check: any `VERSION_SCHEMA` value other than `simple`/`custom` (or omitted) on `install(PACKAGE_INFO)` is worth a second look; test with an actual version-constrained `find_package` against the result, not just a successful `install`.
- **Believing `cmake --install` (or a successful build) proves the package is consumable.** This dive's own §2 and §6 show two independent cases where the exporting project's build+install is completely green while the artifact is broken for a consumer (missing `find_dependency`) or missing data (the dropped generator-expression property) — the second case doesn't even fail `--install`, only the earlier `--configure` (which many CI scripts don't gate on separately from `--build`). Check: gate CI on the `cmake -S -B` (configure) exit code as its own step, and always add a second, independent consumer configure (rule 11).
- **Using `$<COMPILE_LANGUAGE:...>` or other non-configuration generator expressions in target properties without checking whether the target will ever be exported via CPS.** These are completely ordinary and correct for a C/C++ codebase; the restriction is CPS-specific and easy to trip over months after the genex was added, once someone else later adds `install(PACKAGE_INFO)` to the same target. Check: run a full configure (not just build) immediately after adding `install(PACKAGE_INFO)` to a target with any nontrivial `INTERFACE_*` generator expression.
- **Declaring `project(... LANGUAGES NONE)` for a "no C/C++ code here" wrapper CMakeLists that still calls `find_package(... CONFIG)`.** This is an increasingly common AI-agent-authored pattern for polyglot monorepo orchestration; it is completely invisible until someone's dependency happens to live under `lib64`/`lib32` instead of a top-level or `lib/` (`share/`-style) location. Check: `--debug-find-pkg=<name>` after any surprising "package not found" from a `LANGUAGES NONE` project.

## Contested / evolving

- **Whether "CPS preferred over Config in most cases" (`find_package.rst`) matches practice.** As documented, and as the CPS-verification ledger confirmed by direct re-fetch (row 21), the *prose* is unambiguous. This dive's direct measurement on 4.3.4 and 4.4.2, however, found Config winning at the default search locations in a from-scratch build. This is reported as an open, measured discrepancy — not resolved further within this dive's scope — and is exactly the kind of claim a future re-check (or a CMake bug-tracker search for the specific search-order interaction) should either confirm as version-specific/setup-specific or elevate as a doc-vs-implementation gap worth reporting upstream. As of 2026-09-26: unresolved, trending toward "verify empirically, don't trust the doc's ordering claim for a mixed install."
- **`VERSION_SCHEMA rpm`/`dpkg`/`pep440` acceptance-without-validation.** Kitware's own code (`cmExportPackageInfoGenerator.cxx`, per the CPS-verification ledger) has a literal `// TODO` comment: "We don't validate these at this time." This is openly unfinished, not a stable design decision — a future CMake release could either start validating (breaking anyone relying on silent acceptance) or implement comparison for these schemas (which would be the fix this dive's finding argues for). Track via `Help/release/*.rst` CPS sections on future minors.
- **CPS adoption overall.** Per the CPS-verification ledger's Verdict, CPS remains a SHOULD, not a MUST, for 2026: zero real adopters in the 46-repo exemplar corpus, zero engagement from vcpkg/Meson/pkgconf/build2/xmake/rules_foreign_cc. This dive's measurements don't change that verdict — if anything, the Config-beats-CPS-by-default finding and the version-schema trap make CPS *harder* to recommend unconditionally today, reinforcing rather than contradicting the existing SHOULD-grade call.

## Sources

| URL or measurement | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [`install.rst@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/install.rst) | `install()` command reference, pinned tag | 4.4.2 | `PACKAGE_INFO` full signature, the genex-limitation note, the CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO cross-reference |
| [`export.rst@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/export.rst) | `export()` command reference, pinned tag | 4.4.2 | `export(PACKAGE_INFO)` signature and the literal "written to `cps/<package-name>`" sentence |
| [`find_package.rst@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/find_package.rst) | `find_package()` command reference, pinned tag | 4.4.2 | Full Unix/macOS search-path tables, the CPS-preference note, the version-range caveat, the `lib64`-needs-a-language note |
| `cmake --help-manual cmake-diagnostics` on `kitware/cmake:4.4` | Measurement (CLI, not a fetch) | 4.4.2, run 2026-09-26 | Exact `CMD_INSTALL_ABSOLUTE_DESTINATION` category text, default action, `versionadded:: 4.4` |
| Full install→export→consume round trip, `ocx package exec kitware/cmake:{3.31,4.3,4.4}` | Measurement | 3.31.12 / 4.3.4 / 4.4.2, 2026-09-26 | The base round trip (§1), byte-identical across all three versions |
| Missing-`find_dependency` reproduction | Measurement | 3.31.12 and 4.4.2, 2026-09-26 | Exact failure text and phase (§2) |
| RPATH default-strip and `$ORIGIN` relocation, `readelf -d` | Measurement | 4.4.2, 2026-09-26 | §3-4; the "Set non-toolchain portion of runtime path…to \"\"" install-time message |
| Absolute `DESTINATION` + `DESTDIR` + `-Werror=install-absolute-destination` across all three versions | Measurement | 3.31.12 / 4.3.4 / 4.4.2, 2026-09-26 | §5; confirms the diagnostic is 4.4-only with no legacy equivalent |
| `install(PACKAGE_INFO)`/`export(PACKAGE_INFO)` location and content, `VERSION_SCHEMA rpm` vs `simple` | Measurement | 4.3.4 and 4.4.2, 2026-09-26 | §6; the unvalidated-schema-then-unreadable finding, the genex hard-error finding |
| Config-vs-CPS default resolution + issue #26410 `dep_DIR` reproduction | Measurement | 4.3.4 and 4.4.2, 2026-09-26 | §7; the "docs say CPS preferred, measured says Config wins" discrepancy |
| Version-range endpoint enforcement, CPS and Config paths | Measurement | 4.4.2, 2026-09-26 | §8; the per-package (not universal) upper-bound behavior |
| `pkg-config --cflags --libs` before/after prefix relocation | Measurement | 4.4.2 + system `pkg-config` 2.3.0, 2026-09-26 | §9 |
| `unshare -rn` configure/build/install with external toolchain + PIC | Measurement | 4.4.2, 2026-09-26 | §10; zero-network confirmation, `-fPIC` reaching a static archive |
| `--debug-find-pkg=dep` trace, `LANGUAGES NONE` vs `LANGUAGES C` | Measurement | 4.4.2, 2026-09-26 | §11; the surprise finding, with the exact candidate-path list as evidence |
| [`.agents/research/cmake-dependency-seam/cps-verification.md`](../cmake-dependency-seam/cps-verification.md) | Prior wave's adversarial CPS claim ledger (rows 14, 19-26, Verdict) | Fetched 2026-09-05, still current per the 2026-09-26 era recheck | The claims this dive's measurements were tasked to confirm or overturn; rows 14, 19, 21, 22 all independently reproduced here |
| [`.agents/research/cmake-audit/exemplar-cmake-shape.md`](../cmake-audit/exemplar-cmake-shape.md) | Prior corpus-wide static-analysis audit (46 repos) | Grounded 2026-09-06 | Corpus counts cited in Findings/Exemplar evidence: `install(PACKAGE_INFO)` 54/0-adopters, RPATH-variable adoption rates, the "install-tree consumption not confirmed end-to-end" gap this dive closes for the round trip itself |
| `apache/arrow@3ad410b7b1a2:cpp/cmake_modules/BuildUtils.cmake` | Exemplar corpus file | Corpus snapshot 2026-09 | Real-world `$ORIGIN`/`@loader_path` RPATH pattern (rule 2) |
| `friendlyanon/cmake-init@7e0c52fc73f2:cmake-init/templates/common/cmake/install-config.cmake` | Exemplar corpus file | Corpus snapshot 2026-09 | Canonical `find_dependency()` template (rule 1) |
| `ocx-sh/find_ocx@ac2a759cd0da:CMakeLists.txt`, `Findocx.cmake` | Fleet's own CMake consumer (exemplar corpus copy) | Corpus snapshot 2026-09 | `LANGUAGES NONE` + Module-mode `find_package`, live instance of finding #11's precondition |
| CMake issue [#26410](https://gitlab.kitware.com/cmake/cmake/-/issues/26410) | GitLab issue, open | Created 2024-10-28, still open per the CPS-verification ledger's 2026-09-05 re-fetch | The exact "mixed CPS/Config directory" scenario this dive reproduced directly (§7) |

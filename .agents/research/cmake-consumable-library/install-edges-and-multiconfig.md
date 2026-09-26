---
title: "Install edges: multi-config round trips, CPS naming, pkg-config depth"
topic: cmake-consumable-library
agent: install-edges-measure
model: sonnet
kind: measure
date_researched: 2026-09-26
sources_count: 15
scope: |
  Wave-3 measurement dive revising cmake-consumable-library.md (CMK-INST-01,
  CMK-INST-15, family CMK-INST). Tests whether the shipped install/export
  round trip and CPS preconditions hold under Ninja Multi-Config, under a
  namespace/EXPORT_NAME mismatch, under a multi-arch libdir, and for
  export(PACKAGE)/CMP0090 — all of which wave 2 never exercised (it ran only
  single-config Unix Makefiles). Does not re-measure single-config install
  correctness (see cmake-consumable-library.md) and does not cover Windows
  directly (no Windows host; those rows are web-only and say so).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Multi-config round trip](#1-multi-config-round-trip)
   2. [Multi-config CPS](#2-multi-config-cps)
   3. [A config absent from the install](#3-a-config-absent-from-the-install)
   4. [CPS naming: case-only namespace mismatch](#4-cps-naming-case-only-namespace-mismatch)
   5. [CPS naming: EXPORT_NAME differs from the target name](#5-cps-naming-export_name-differs-from-the-target-name)
   6. [pkg-config depth](#6-pkg-config-depth)
   7. [export(PACKAGE) and CMP0090](#7-exportpackage-and-cmp0090)
   8. [Windows, read-only](#8-windows-read-only)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- **CMK-INST-01 needs a multi-config variant.** The single-config script never
  exercises `--config`, so it cannot catch a multi-config-only defect; ship it
  as an additional script, not a rewrite (§1).
- A **shared `OUTPUT_NAME` across configs makes `cmake --install --config
  Release` silently overwrite the file `cmake --install --config Debug` just
  wrote**, on 3.31.12 and 4.4.2 (measured, md5 mismatch): both `baseTargets-debug.cmake`
  and `baseTargets-release.cmake` then point `IMPORTED_LOCATION_DEBUG`/`_RELEASE`
  at the one surviving (Release) binary (§1).
- Ninja Multi-Config installs write one `<pkg>Targets-<config>.cmake` per
  installed config, all included by the config-agnostic `<pkg>Targets.cmake`
  via `file(GLOB)` — confirmed identical on 3.31.12 and 4.4.2 (§1).
- **A consumer requesting a configuration absent from the install does NOT
  fail loudly by default.** It silently falls back to whatever configuration
  is present and links it — no warning, no diagnostic — measured identical on
  3.31.12 and 4.4.2 (§3).
- Setting `CMAKE_MAP_IMPORTED_CONFIG_<CONFIG>` (or the target property) to an
  **explicit empty value** is what turns that silent fallback into a hard
  `Generate step failed` error ("IMPORTED_LOCATION or IMPORTED_IMPLIB not set");
  this is opt-in, not the default (§3, MUST candidate).
- On CMake ≥ 4.3, a per-config CPS export writes `<pkg>@<config-lowercased>.cps`
  beside the config-agnostic `<pkg>.cps` — measured `dep@debug.cps` /
  `dep@release.cps` on both 4.3.4 and 4.4.2 (§2).
- **CPS's cross-package `requires.<dep>.hints` array bakes the literal,
  un-relativized install prefix into the exported `.cps` file** — a real
  relocation leak, but one the existing CMK-INST-01 leak grep (step a)
  already catches, unmodified, on 4.3.4 and 4.4.2 (§2). Functionally the leak
  is harmless as long as the consumer sets `CMAKE_PREFIX_PATH` (the normal
  search wins over the stale hint), but the leak grep still flags it (§2).
- **`install(PACKAGE_INFO <pkg>)` ignores the `install(EXPORT)` `NAMESPACE`
  entirely.** A set exported as `Dep::` (case-shifted from the package name
  `dep`) still produces a CPS component key spelled `dep` — measured on 4.3.4
  and 4.4.2. There is no "comparison" to make case-sensitive or -insensitive:
  CPS names components after the string passed to `install(PACKAGE_INFO)`,
  full stop (§4).
- A consumer that links `Dep::dep` (the namespace it saw in `install(EXPORT)`)
  **fails at the Generate step** ("target was not found") on both 4.3.4 and
  4.4.2 once CPS is present, while `dep::dep` succeeds — confirmed measured
  (§4). CMK-INST-15's comparison is therefore effectively **exact-match,
  case-sensitive, against the CPS package name argument, not the CMake
  `NAMESPACE`** (§4, sharpens CMK-INST-15).
- `EXPORT_NAME` behaves the opposite way: an exported target with
  `EXPORT_NAME depimpl` produces **both** `dep::depimpl` in the Config file
  **and** a `"depimpl"` component key in the `.cps` — consistent, and a
  consumer linking `dep::depimpl` builds cleanly on 4.3.4 and 4.4.2 (§5).
- **A hard-coded `prefix=${pcfiledir}/../..` in a `.pc.in` is wrong once
  `CMAKE_INSTALL_LIBDIR` is a multi-arch path.** With
  `-DCMAKE_INSTALL_LIBDIR=lib/x86_64-linux-gnu`, `pkg-config --variable=prefix`
  resolves one directory too shallow (lands on `.../lib`, not the prefix) —
  measured on 3.31.12 and 4.4.2 with pkg-config 2.3.0 (§6, confirms the
  consolidation's unmeasured prediction).
- A `.pc.in` `prefix=` computed at configure time with `file(RELATIVE_PATH)`
  from the pkgconfig directory to `CMAKE_INSTALL_PREFIX` resolves correctly
  for both the default `lib64/pkgconfig` depth (`../..`) and the multi-arch
  `lib/x86_64-linux-gnu/pkgconfig` depth (`../../..`) — measured on 3.31.12
  and 4.4.2 (§6, MUST candidate).
- **`export(PACKAGE)` writes nothing to `~/.cmake/packages` under the default
  and under an explicit `cmake_policy(SET CMP0090 NEW)`, on both 3.31.12 and
  4.4.2** — identical behavior across the whole tested version range; only an
  explicit `cmake_policy(SET CMP0090 OLD)` populates the registry (measured
  with a throwaway `HOME`) (§7).
- CMake's own `cmake_minimum_required(VERSION 3.20)` already implies CMP0090
  `NEW` (3.20 ≥ the policy's introduction at 3.15), so
  `-DCMAKE_POLICY_DEFAULT_CMP0090=OLD` on the command line is a **silent
  no-op** ("Manually-specified variables were not used") unless the
  `CMakeLists.txt` itself calls `cmake_policy(SET CMP0090 OLD)` or lowers its
  floor below 3.15 (§7, AI-agent trap).
- Windows DLL placement (`install(RUNTIME_DEPENDENCY_SET)`,
  `install(IMPORTED_RUNTIME_ARTIFACTS)`, `$<TARGET_RUNTIME_DLLS>`,
  `$<TARGET_RUNTIME_DLL_DIRS>`, CMP0207) is read-only-grounded from
  `Help/command/install.rst`, `Help/manual/cmake-generator-expressions.7.rst`
  and `Help/policy/CMP0207.rst` at v4.4.2: no Windows host exists to measure
  on (§8, SHOULD candidate, web-only).
- Real corpus adopters of `$<TARGET_RUNTIME_DLLS>` outside Kitware's own
  tests: `aminya__project_options@412045e1f1:src/PackageProject.cmake:73`,
  `cpp-best-practices__cmake_template@b86318abbf:test/CMakeLists.txt:58`,
  `qt__qtbase@0ef5a8e9ca:src/corelib/Qt6CoreMacros.cmake:3605` (§8).

## Findings

Measured on 2026-09-26 with `ocx package exec kitware/cmake:{3.31,4.3,4.4} --
cmake`, ninja 1.13.2 via `ocx package exec ninja-build/ninja -- ninja`, gcc
15.2.1, pkg-config 2.3.0, generators `Unix Makefiles` and `Ninja
Multi-Config`. All scratch trees under
`/home/mherwig/.cache/cmake-measure-scratch/install-edges/`; scripts and
sources copied to
[`cmake-consumable-library/scratch/install-edges/`](cmake-consumable-library/scratch/install-edges/).
Base fixtures (`src/base`, `src/dep`, `src/consumer`) are the ones from
[`cmake-consumable-library/scratch/consumable-library-consolidation/`](cmake-consumable-library/scratch/consumable-library-consolidation/);
the new fixtures this dive adds are listed inline.

### 1. Multi-config round trip

Script: [`run-multiconfig-roundtrip.sh`](cmake-consumable-library/scratch/install-edges/run-multiconfig-roundtrip.sh).

```sh
NINJA=$(ocx package exec ninja-build/ninja -- sh -c 'command -v ninja')
cmake -S src/base -B b -G "Ninja Multi-Config" -DCMAKE_MAKE_PROGRAM=$NINJA \
      -DCMAKE_C_COMPILER=gcc -DCMAKE_INSTALL_PREFIX=$P
cmake --build b --config Debug
cmake --build b --config Release
cmake --install b --config Debug
cmake --install b --config Release
```

`Ninja Multi-Config` does not auto-detect `ninja` the way `Unix Makefiles`
finds `make`: without `CMAKE_MAKE_PROGRAM` the configure fails with "CMake
was unable to find a build program corresponding to \"Ninja Multi-Config\"."
(measured on 3.31.12 and 4.4.2; the `ocx`-provisioned `ninja` is not on
`PATH`, only reachable through `ocx package exec`).

Both installs succeed on 3.31.12 and 4.4.2 and write two config-specific
export files beside the config-agnostic one:

```sh
lib64/cmake/base/baseTargets.cmake
lib64/cmake/base/baseTargets-debug.cmake
lib64/cmake/base/baseTargets-release.cmake
```

`baseTargets.cmake` loads both with `file(GLOB _cmake_config_files
"${CMAKE_CURRENT_LIST_DIR}/baseTargets-*.cmake")` (verified by reading the
generated file on 4.4.2 — byte-identical logic to 3.31.12). Each per-config
file sets `IMPORTED_LOCATION_<CONFIG>` and appends to `IMPORTED_CONFIGURATIONS`:

```cmake
# baseTargets-debug.cmake
set_property(TARGET base::base APPEND PROPERTY IMPORTED_CONFIGURATIONS DEBUG)
set_target_properties(base::base PROPERTIES
  IMPORTED_LOCATION_DEBUG "${_IMPORT_PREFIX}/lib64/libbase.so.1.0.0")
```

**The surprise: both `IMPORTED_LOCATION_DEBUG` and `IMPORTED_LOCATION_RELEASE`
point at the identical path**, `lib64/libbase.so.1.0.0`, because the fixture's
`OUTPUT_NAME` does not vary by config. `cmake --install --config Debug`
writes that file; `cmake --install --config Release` then overwrites it in
place — "Installing:" (not "Up-to-date:") on the second pass. Verified with
checksums:

```sh
$ md5sum $P/lib64/libbase.so.1.0.0 \
         $S/mc-b-base-4.4/Debug/libbase.so.1.0.0 \
         $S/mc-b-base-4.4/Release/libbase.so.1.0.0
2f4becc2c88cddc686a16554c085f2b3  .../mc-pfx-4.4/lib64/libbase.so.1.0.0
d8a889a3538c2335ca791fc8f26f0263  .../Debug/libbase.so.1.0.0
2f4becc2c88cddc686a16554c085f2b3  .../Release/libbase.so.1.0.0
```

The installed file matches the *Release* build, not the Debug build that was
installed first. A "Debug" consumer configuration therefore silently links
the Release binary — no warning at either install step. This is invisible to
`cmake --build`/`--install` exit codes and to `run-cps-order.sh`-style scripts
that only check exit codes.

Consumption of both configs still succeeds mechanically (linking the wrong
binary is silent, not a link error), and — separately — a full move-and-consume
round trip works for both configs after `mv`:

```sh
$ readelf -d $S/mc-cons2-4.4/Debug/baseconsumer | grep -e NEEDED -e RUNPATH
 (NEEDED) Shared library: [libbase.so.1]
 (RUNPATH) Library runpath: [.../mc-pfx-4.4/lib64]
$ mv mc-pfx-4.4 mc-pfx-4.4-moved   # fresh configure+build+run against the move:
Debug run: 42
Release run: 42
base_DIR:PATH=.../mc-pfx-4.4-moved/lib64/cmake/base
```

Both configs re-resolve and run correctly after the move, on 3.31.12 and
4.4.2 — CMK-INST-01's core relocation guarantee holds under Ninja
Multi-Config exactly as it did under Unix Makefiles.

### 2. Multi-config CPS

Script: [`run-multiconfig-cps.sh`](cmake-consumable-library/scratch/install-edges/run-multiconfig-cps.sh),
using the `dep` fixture with `-DDEP_CPS=ON -DDEP_CPS_SCHEMA=`.

```sh
$ cmake --install b-dep --config Debug | grep cps
-- Installing: .../lib64/cps/dep/dep.cps
-- Installing: .../lib64/cps/dep/dep@debug.cps
$ cmake --install b-dep --config Release | grep cps
-- Up-to-date: .../lib64/cps/dep/dep.cps
-- Installing: .../lib64/cps/dep/dep@release.cps
```

Identical on 4.3.4 and 4.4.2. The config-agnostic `dep.cps` carries the
component's static shape (`includes`, `requires`, `type`); each
`dep@<config>.cps` carries only `location` and `configuration`:

```json
// dep@debug.cps (4.4.2)
{
  "components": { "dep": { "location": "@prefix@/lib64/libdep.so.1.2.0" } },
  "configuration": "Debug",
  "name": "dep"
}
```

**The leak.** The config-agnostic `dep.cps`'s cross-package `requires` entry
for `base` carries a `hints` array with the literal, un-relativized install
prefix baked in at export time — not `@prefix@`-relative, unlike every path
inside the same file's own package:

```json
"requires": {
  "base": {
    "components": ["base"],
    "hints": ["/home/mherwig/.../mc-pfx-4.4/lib64/cmake/base"],
    "version": "1.0.0"
  }
}
```

Running the existing CMK-INST-01 leak check (step a) against the *un-moved*
prefix already flags this file:

```sh
$ grep -rIl --exclude='*.pc' -e "$P" "$P"
.../lib64/cps/dep/dep.cps
```

Functionally the leak is not fatal: consuming `dep` against a **moved**
prefix (`mv mc-pfx-4.4 mc-pfx-4.4-moved`, then configure with
`-DCMAKE_PREFIX_PATH=.../mc-pfx-4.4-moved`) still resolves `base_DIR` inside
the moved tree, not the stale hint — CMake's own `find_package` search runs
first and wins before the hint would ever be consulted. But the leak grep
does not know that, and correctly refuses to pass; a project must not treat
this file as clean just because the round trip's step (c) still succeeds.

### 3. A config absent from the install

Script: same as §1, second half. Install only `Debug`, then ask a consumer
for `Release`:

```sh
$ cmake -S consumer -B b -G "Ninja Multi-Config" -DCMAKE_PREFIX_PATH=$DEBUG_ONLY_PREFIX
$ cmake --build b --config Release
[2/2] Linking C executable Release/baseconsumer
$ ./Release/baseconsumer
42
```

**No error, no warning, at either configure or build.** Identical on 3.31.12
and 4.4.2. This is the fallback the `MAP_IMPORTED_CONFIG_<CONFIG>` property
doc (`Help/prop_tgt/MAP_IMPORTED_CONFIG_CONFIG.rst` at v4.4.2) describes only
by omission: "If this property is set and no matching configurations are
available, then the imported target is considered to be not found" — implying
that when it is *not* set (the default), some other, undocumented-in-that-page
fallback applies. Measured: that fallback silently picks whichever
`IMPORTED_LOCATION_<CONFIG>` exists.

Setting `CMAKE_MAP_IMPORTED_CONFIG_RELEASE` to an **explicit empty value**
turns this into the documented "not found" case, but as a hard failure at
Generate, not at find_package:

```sh
$ cmake -S consumer -B b2 -G "Ninja Multi-Config" \
        -DCMAKE_PREFIX_PATH=$DEBUG_ONLY_PREFIX -DCMAKE_MAP_IMPORTED_CONFIG_RELEASE=
CMake Error in CMakeLists.txt:
  IMPORTED_LOCATION or IMPORTED_IMPLIB not set for imported target
  "base::base" configuration "Release".
CMake Generate step failed.  Build files cannot be regenerated correctly.
```

Identical wording and identical failure point on 3.31.12 and 4.4.2.
`find_package` itself still succeeds (`base_DIR` is set); the failure is a
Generate-time diagnostic, so a script that only checks the `find_package`/
`configure` exit code without also building will still miss it — the
Generate step runs as part of `cmake -S/-B` in a single-config generator but
is a distinct, later step for a multi-config generator invoked without `--build`.

### 4. CPS naming: case-only namespace mismatch

Fixture: [`src/ns-case`](cmake-consumable-library/scratch/install-edges/src/ns-case)
(`dep`'s `CMakeLists.txt` with `NAMESPACE dep::` changed to `NAMESPACE Dep::`).
Script: [`run-cps-naming-depth.sh`](cmake-consumable-library/scratch/install-edges/run-cps-naming-depth.sh).

```sh
$ grep -A3 '"components"' pfx-nscase-4.4/lib64/cps/dep/dep.cps
"components": { "dep": { "includes": [...], "requires": [...], "type": "dylib" } }
```

`install(PACKAGE_INFO dep …)` writes the component key `dep` — the string
passed as `install(PACKAGE_INFO)`'s first argument — completely independent
of the `Dep::` namespace used one line earlier at `install(EXPORT … NAMESPACE
Dep::)`. This holds identically on 4.3.4 and 4.4.2: **CPS does not read, and
therefore cannot mismatch against, the CMake export namespace at all.**

Consuming with each spelling, against a `CMAKE_PREFIX_PATH` covering both
`dep`'s and `base`'s prefixes:

```sh
$ # target_link_libraries(consumer PRIVATE Dep::dep)
CMake Error: ... but the target was not found. Possible reasons include:
  * There is a typo in the target name. ...
CMake Generate step failed.

$ # target_link_libraries(consumer PRIVATE dep::dep)
-- Generating done (0.0s)
-- Build files have been written to: ...
```

Identical on 4.3.4 and 4.4.2. So CMK-INST-15's "comparison" is not really a
comparison between two spellings CMake reconciles — it is that **CPS always
defines `<package-name-as-passed-to-install(PACKAGE_INFO)>::<component>`,
period**, and any code that assumed the `install(EXPORT)` `NAMESPACE` is what
consumers link against breaks the moment `install(PACKAGE_INFO)` is added
with a namespace that differs from the package name in even one character's
case. There is no case-folding anywhere in this path.

### 5. CPS naming: EXPORT_NAME differs from the target name

Fixture: [`src/exportname`](cmake-consumable-library/scratch/install-edges/src/exportname)
(`dep`'s target gets `EXPORT_NAME depimpl`, `install(EXPORT)` still uses
`NAMESPACE dep::`).

```sh
$ grep 'add_library(' pfx-exportname-4.4/lib64/cmake/dep/depTargets.cmake
add_library(dep::depimpl SHARED IMPORTED)
$ grep -A3 '"components"' pfx-exportname-4.4/lib64/cps/dep/dep.cps
"components": { "depimpl": { "includes": [...], "requires": [...] } }
```

Identical on 4.3.4 and 4.4.2: `EXPORT_NAME` is honored consistently by
**both** the Config-file generator and CPS export — the two never disagree on
the component/target basename, only the package-level `NAMESPACE` is the part
CPS silently discards (§4). A consumer linking `dep::depimpl` builds cleanly
on both versions:

```sh
$ target_link_libraries(consumer PRIVATE dep::depimpl)
[100%] Linking C executable consumer
[100%] Built target consumer
```

**Answer to the brief's question "does a 4.4.2 consumer link?": yes, and
identically on 4.3.4.** `EXPORT_NAME` is the safe axis to rename on; the
export `NAMESPACE` is not, once CPS is in play.

### 6. pkg-config depth

Script: [`run-cps-naming-depth.sh`](cmake-consumable-library/scratch/install-edges/run-cps-naming-depth.sh),
third section. Fixture [`src/base-relpath`](cmake-consumable-library/scratch/install-edges/src/base-relpath)
adds a `file(RELATIVE_PATH)` computation ahead of `configure_file()`:

```cmake
file(RELATIVE_PATH PC_PREFIX_RELPATH
    "${CMAKE_INSTALL_PREFIX}/${CMAKE_INSTALL_LIBDIR}/pkgconfig"
    "${CMAKE_INSTALL_PREFIX}")
string(REGEX REPLACE "/$" "" PC_PREFIX_RELPATH "${PC_PREFIX_RELPATH}")
if(NOT PC_PREFIX_RELPATH)
    set(PC_PREFIX_RELPATH ".")
endif()
```
and the `.pc.in` uses `prefix=${pcfiledir}/@PC_PREFIX_RELPATH@` instead of a
literal `${pcfiledir}/../..`.

With `-DCMAKE_INSTALL_LIBDIR=lib/x86_64-linux-gnu` (a 3-segment libdir, so
`pkgconfig` sits 3 levels below the prefix, not 2):

```sh
$ # hard-coded ../.. (consolidation's existing fixture, unmodified)
$ PKG_CONFIG_PATH=$P/lib/x86_64-linux-gnu/pkgconfig pkg-config --variable=prefix base
.../pfx-multiarch-4.4/lib/x86_64-linux-gnu/pkgconfig/../..
# = .../pfx-multiarch-4.4/lib   <-- WRONG, one level too shallow

$ # file(RELATIVE_PATH)-computed
$ cat pfx-relpath-multiarch-4.4/lib/x86_64-linux-gnu/pkgconfig/base.pc | head -1
prefix=${pcfiledir}/../../..
$ PKG_CONFIG_PATH=$P2/lib/x86_64-linux-gnu/pkgconfig pkg-config --variable=prefix base
.../pfx-relpath-multiarch-4.4/lib/x86_64-linux-gnu/pkgconfig/../../..
# = .../pfx-relpath-multiarch-4.4   <-- correct
```

Identical on 3.31.12 and 4.4.2 — this is a pkg-config (2.3.0) and shell-path
question, not a CMake-version question. The same fixture also confirms the
computed relative path is `../..` (unchanged) for the default `lib64`
layout, so `file(RELATIVE_PATH)` is a strict superset of the hard-coded form,
never a regression for the common case. pkg-config does not normalize the
`..` segments in its printed output, but the path still *resolves* correctly
when used, which is what the round-trip check needs.

### 7. export(PACKAGE) and CMP0090

Script: [`run-export-package-cmp0090.sh`](cmake-consumable-library/scratch/install-edges/run-export-package-cmp0090.sh),
fixture [`src/exportpkg`](cmake-consumable-library/scratch/install-edges/src/exportpkg):

```cmake
cmake_minimum_required(VERSION 3.20)
project(exportpkgtest LANGUAGES C VERSION 1.0.0)
set(TESTPOL "" CACHE STRING "")
if(TESTPOL)
    cmake_policy(SET CMP0090 ${TESTPOL})
endif()
add_library(exportpkgtest INTERFACE)
install(TARGETS exportpkgtest EXPORT exportpkgtestTargets)
install(EXPORT exportpkgtestTargets NAMESPACE exportpkgtest:: DESTINATION lib/cmake/exportpkgtest)
export(EXPORT exportpkgtestTargets)
export(PACKAGE exportpkgtest)
```

Run three ways per CMake line, each with a fresh throwaway `HOME`:

```sh
$ HOME=$HOMEDIR cmake -S src/exportpkg -B b -DTESTPOL=$TP
$ find "$HOMEDIR/.cmake" -type f
```

| CMake | `TESTPOL` (policy) | `$HOME/.cmake/packages/...` written? |
|---|---|---|
| 3.31.12 | (default) | no |
| 3.31.12 | `NEW` | no |
| 3.31.12 | `OLD` | **yes** |
| 4.4.2 | (default) | no |
| 4.4.2 | `NEW` | no |
| 4.4.2 | `OLD` | **yes** |

Byte-for-byte identical behavior across 3.31.12 and 4.4.2: this policy has
not moved at all in the tested range. The registry file's content is the
build-tree path (`.../b-exportpkg2-4.4-OLD`), matching
`Help/policy/CMP0090.rst`'s description exactly.

**The command-line trap.** The very first attempt at this measurement used
`-DCMAKE_POLICY_DEFAULT_CMP0090=OLD` on the command line with the same
`cmake_minimum_required(VERSION 3.20)` project and got **no registry file and
a warning**:

```sh
CMake Warning:
  Manually-specified variables were not used by the project:
    CMAKE_POLICY_DEFAULT_CMP0090
```

Because `cmake_minimum_required(VERSION 3.20)` already sets every policy
introduced at or before 3.20 — CMP0090 included (introduced 3.15) — to `NEW`
as an implicit `cmake_policy(VERSION 3.20)`, the `CMAKE_POLICY_DEFAULT_CMP0090`
variable has nothing left to default: the policy is already explicitly
decided by the project's own floor. Only an explicit `cmake_policy(SET
CMP0090 OLD)` *inside* the `CMakeLists.txt` (or a floor below 3.15) can
reach `OLD` behavior. A packager trying to suppress or restore the registry
write from the command line for someone else's project should reach instead
for `CMAKE_EXPORT_NO_PACKAGE_REGISTRY` / `CMAKE_EXPORT_PACKAGE_REGISTRY`
(the variables CMP0090's own doc names as the pre-3.15 opt-out and the
post-3.15 opt-in), not the policy-default variable.

### 8. Windows, read-only

No Windows host exists; every claim in this subsection is normative only,
read at tag `v4.4.2`.

- [`Help/command/install.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/install.rst)
  (§427–470, §495–530, §1130–1179): `install(TARGETS … RUNTIME_DEPENDENCY_SET
  <set-name>)` collects runtime dependencies of installed executables/shared
  libs/modules into a named set (3.21+); `install(RUNTIME_DEPENDENCY_SET
  <set-name> …)` installs that set, to the `RUNTIME` destination on DLL
  platforms and `LIBRARY` on non-DLL platforms; `install(IMPORTED_RUNTIME_ARTIFACTS
  <target>…)` does the equivalent for imported targets (needs
  `IMPORTED_LOCATION` set on the imported `SHARED` target — many Find-module
  `UNKNOWN`-type imports do not have this and are silently skipped).
  `RUNTIME_DEPENDENCY_SET` and `RUNTIME_DEPENDENCIES` are mutually exclusive
  keywords on the same `install(TARGETS)` call.
- [`Help/manual/cmake-generator-expressions.7.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-generator-expressions.7.rst)
  (§3324–3373): `$<TARGET_RUNTIME_DLLS:tgt>` (3.21+) lists the `.dll` files
  a target depends on at runtime — evaluates to an **empty string on
  non-DLL platforms** (so it is safe to use unconditionally in a
  cross-platform `POST_BUILD` copy command); it errors if applied to a
  target that is not an executable/`SHARED`/`MODULE`; imported `SHARED`
  targets need `IMPORTED_LOCATION` set to their `.dll`. `$<TARGET_RUNTIME_DLL_DIRS:tgt>`
  (3.27+) is the directory-only sibling.
- [`Help/policy/CMP0207.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0207.rst):
  new at **4.3**. `file(GET_RUNTIME_DEPENDENCIES)` and
  `install(RUNTIME_DEPENDENCY_SET)` filter resolved paths with regexes; on
  CMake 4.2 and below, a Windows-targeting filter had to match both slash
  directions itself (`[\\/]`); 4.3+ normalizes to forward slashes before
  matching (`NEW`), so a pre-4.3-authored filter regex containing `[\\/]`
  becomes redundant-but-harmless, never wrong, after the upgrade.

**Candidate SHOULD row** (unmeasured, web-only, says so): a library that
installs a `SHARED` target and installs an executable that links it should
either (a) rely on RPATH on ELF/Mach-O and add, on Windows only, a
`POST_BUILD` step copying `$<TARGET_RUNTIME_DLLS:$<TARGET_NAME>>` beside the
executable via `install(TARGETS … RUNTIME_DEPENDENCY_SET rtd)` +
`install(RUNTIME_DEPENDENCY_SET rtd …)`, or (b) accept that a Windows install
without either mechanism ships an executable that cannot find its DLL outside
the build tree. Verification, reading heuristic (no Windows host):
`grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'RUNTIME_DEPENDENCY_SET' -e 'TARGET_RUNTIME_DLLS' -e 'IMPORTED_RUNTIME_ARTIFACTS' .`
Presence without a Windows-only guard is fine (the genex is a no-op
elsewhere) — this reading heuristic has no pass/fail on emptiness, every hit
must be read; absence, for a project that ships a `SHARED` library plus an
executable and targets Windows in its CI matrix, is the finding.

**Corpus adopters of `$<TARGET_RUNTIME_DLLS>`.** For each of the 46 clones
under `/home/mherwig/.cache/research-lang/exemplars/cmake/`, with `REPO` set
to that clone's directory:
`git -C "$REPO" grep -n -e 'TARGET_RUNTIME_DLLS' -- '*.cmake' '*.txt'`

- `aminya__project_options@412045e1f1:src/PackageProject.cmake:73`
- `cpp-best-practices__cmake_template@b86318abbf:test/CMakeLists.txt:58`
- `qt__qtbase@0ef5a8e9ca:src/corelib/Qt6CoreMacros.cmake:3605`
- `microsoft__vcpkg@c4ee5a52d7:ports/lcms/lcms2-config.cmake:20` (a comment
  referencing the genex, not a call site)
- `Kitware__CMake@e8befb989b:Tests/RunCMake/GenEx-TARGET_RUNTIME_DLLS/*.cmake`
  (the feature's own test suite — not evidence of external adoption)

Three real, independent adopters outside Kitware's own tree; the mechanism
is documented and used, not vestigial, but far from universal (3 of 46).

## Normative guidance candidates

Floor convention as in the consolidation: rules target
`cmake_minimum_required(VERSION 3.25...<max>)`; a newer mechanism carries its
own gate.

1. **Give every `OUTPUT_NAME` (or equivalent binary filename) that a
   multi-config generator installs a per-config-varying name, or install each
   config to a distinct destination, whenever more than one config is
   installed to one prefix.** Rationale: a config-agnostic `OUTPUT_NAME`
   makes the second `cmake --install --config <X>` silently overwrite the
   first config's binary file, while both configs' import files keep pointing
   at the same now-single-config path (measured, §1). Verify: after
   installing every config, `find $PREFIX -name 'lib*.so*' -o -name '*.dll'`
   then `md5sum` each installed binary against its own `<build>/<Config>/`
   copy; any binary whose checksum does not match its own build directory is
   the finding — a MUST-grade multi-config addition to CMK-INST-01. Floor:
   any (Ninja Multi-Config and Visual Studio generators both apply).
2. **Add a multi-config leg to the CMK-INST-01 round-trip script**: configure
   once with `-G "Ninja Multi-Config" -DCMAKE_MAKE_PROGRAM=$(ocx package exec
   ninja-build/ninja -- sh -c 'command -v ninja')`, `--build`/`--install
   --config Debug` and `--config Release` in turn, then run the *same*
   consumer build for each `--config`. Rationale: the single-config script
   never invokes `--config` and cannot see either finding #1 or #3's fallback
   (measured, §1, §3). Verify: exit code 0 for both configs' consumer builds,
   plus finding #1's checksum check. Floor: any.
3. **Set `MAP_IMPORTED_CONFIG_<CONFIG>` (target property or its
   `CMAKE_MAP_IMPORTED_CONFIG_<CONFIG>` variable default) to an explicit empty
   value on any consumer configuration that must never silently borrow
   another config's binary — most commonly `Release` must not silently accept
   `Debug`.** Rationale: without it, a config absent from the install is
   accepted with no diagnostic and links whatever configuration exists
   (measured identical on 3.31.12 and 4.4.2, §3); Kitware's own doc for the
   property only describes the *set* case's failure, not the default's silent
   fallback. Verify: `cmake --build <B> --config <X>` against an install
   missing `<X>` must fail with "IMPORTED_LOCATION or IMPORTED_IMPLIB not
   set"; a clean exit 0 there is the finding. Severity: SHOULD for a
   consumer that only ever builds one config it controls; MUST for a CI
   matrix that could receive a partial install. Floor: any.
4. **Never assume `install(EXPORT … NAMESPACE X::)` is what a CPS-aware
   consumer links.** Make the CPS package name (the identifier passed to
   `install(PACKAGE_INFO <name>)`) match the `NAMESPACE`'s prefix exactly,
   including case (sharpens CMK-INST-15). Rationale: `install(PACKAGE_INFO)`
   never reads the export `NAMESPACE`; CPS always names components after its
   own first argument, so any spelling difference — including case only —
   silently produces a package whose only correct spelling on ≥4.3 differs
   from the pre-CPS namespace (measured, §4). Verify: the CMK-INST-01 round
   trip's step (c), run on ≥4.3, with `TARGETS` set to the
   `install(PACKAGE_INFO)` argument's own casing, not the `NAMESPACE`'s;
   additionally `grep -rn --include='CMakeLists.txt' -e 'install(PACKAGE_INFO' -A1 .`
   then read the argument against the nearest `install(EXPORT … NAMESPACE`
   above it — any difference in spelling (not just case) is the finding.
   Floor: 4.3.
5. **`EXPORT_NAME` is safe to use to decouple a target's internal CMake name
   from its published name; the CPS component key and the Config file's
   imported target agree on it.** Rationale: measured identical, consistent
   output on 4.3.4 and 4.4.2 (§5) — the opposite of finding #4's `NAMESPACE`
   trap, so a reviewer should not conflate the two. Verify: reading
   heuristic, compare `EXPORT_NAME` (or the bare target name if unset)
   against both `add_library(<Ns>::<name> …)` in the installed
   `<Set>Targets.cmake` and the `.cps`'s `components` key; they must match
   each other (not necessarily the CMake target's own internal name). Floor: any.
6. **Compute a `.pc.in`'s `prefix=` relative-to-`pcfiledir` depth at configure
   time with `file(RELATIVE_PATH)` from `${CMAKE_INSTALL_PREFIX}/${CMAKE_INSTALL_LIBDIR}/pkgconfig`
   to `${CMAKE_INSTALL_PREFIX}`; never hard-code `../..`.** Rationale: `../..`
   is only correct for a 2-segment libdir (`lib64`, `lib`); a 3-segment
   multi-arch libdir (`lib/x86_64-linux-gnu`) needs `../../..`, and a
   hard-coded `../..` there resolves `pkg-config --variable=prefix` one level
   too shallow (measured, §6, confirms the consolidation's CMK-INST-12
   rationale that was previously unmeasured). Verify: with
   `-DCMAKE_INSTALL_LIBDIR=lib/x86_64-linux-gnu`, after install,
   `PKG_CONFIG_PATH=$PREFIX/$LIBDIR/pkgconfig pkg-config --variable=prefix
   <pkg>` must resolve (after the shell/filesystem follows the `..`
   segments) to `$PREFIX`; any other result is the finding. This sharpens
   CMK-INST-12's existing verification with a concrete multi-arch libdir to
   test against. Severity: SHOULD (matches CMK-INST-12). Floor: any (pure
   configure-time string math; needs no CMake version gate).
7. **Reach for `CMAKE_EXPORT_NO_PACKAGE_REGISTRY` /
   `CMAKE_EXPORT_PACKAGE_REGISTRY`, never `CMAKE_POLICY_DEFAULT_CMP0090`, to
   change `export(PACKAGE)`'s registry-write behavior for a project you do
   not control.** Rationale: any project whose own
   `cmake_minimum_required` floor is ≥ 3.15 already fixes CMP0090 to `NEW`
   implicitly, so the policy-default variable is a silent no-op there
   (measured warning: "Manually-specified variables were not used by the
   project", §7) — only the two `CMAKE_EXPORT_*` variables (named in
   CMP0090's own doc) actually gate the write regardless of the project's
   policy version. Verify: `cmake --help-variable CMAKE_EXPORT_NO_PACKAGE_REGISTRY`
   succeeds and the packaging script uses it (or `CMAKE_EXPORT_PACKAGE_REGISTRY`
   to force a write under `NEW`); a `CMAKE_POLICY_DEFAULT_CMP0090` reference
   anywhere in a packaging recipe for a third-party project is a finding to
   re-check. Floor: any (CMP0090 since 3.15; the `CMAKE_EXPORT_*` variables
   since 3.15 too).
8. **Never call `export(PACKAGE)` in a library's own default configure
   path.** Rationale: on both 3.31.12 and 4.4.2 the default and `NEW` policy
   already make it a no-op for a floor ≥ 3.15 (measured, §7) — the call is
   dead code for any modern consumer and a footgun (writing to the invoking
   user's `~/.cmake/packages`, polluting every later `find_package` search on
   that machine) for the rare case where it is not, matching the
   consolidation's existing CMK-INST-20 sibling finding (rapidjson still
   calls it). Verify: `grep -rni --include='CMakeLists.txt' -e 'export(
   *package' .` — empty output = pass. Severity: MUST (already listed in the
   consolidation's AI-agent failure list #12; this dive adds the measured
   confirmation that it is a no-op on the current default). Floor: any.
9. **(SHOULD, web-only) On a project that ships a Windows-targeted `SHARED`
   library plus an executable, install the DLLs beside the executable with
   `install(TARGETS … RUNTIME_DEPENDENCY_SET <set>)` +
   `install(RUNTIME_DEPENDENCY_SET <set> …)`, or copy
   `$<TARGET_RUNTIME_DLLS:$<TARGET_NAME>>` in a `POST_BUILD` step.**
   Rationale: normative only (§8) — no Windows host to measure the failure
   mode on, but the mechanism's own doc's "empty string on non-DLL
   platforms" guarantee makes it safe to add unconditionally. Verify:
   reading heuristic, `grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'RUNTIME_DEPENDENCY_SET' -e 'TARGET_RUNTIME_DLLS' .`;
   absence on a Windows-CI'd `SHARED`-plus-executable
   project is the finding. Floor: 3.21 (`RUNTIME_DEPENDENCY_SET`,
   `TARGET_RUNTIME_DLLS`); CMP0207 (path-separator normalization for the
   filter regexes) needs 4.3.
10. **A pre-4.3-authored `PRE_INCLUDE_REGEXES`/`POST_EXCLUDE_REGEXES` (etc.)
    filter on `install(RUNTIME_DEPENDENCY_SET)` that matches both slash
    directions (`[\\/]`) needs no change on upgrade to ≥4.3**, but a
    *newly written* filter on ≥4.3 should assume forward-slash-normalized
    paths and never need the bracket class. Rationale: CMP0207 (new at 4.3)
    normalizes to forward slashes before matching under `NEW`
    (`Help/policy/CMP0207.rst`, §8) — normative only, no Windows host.
    Verify: reading heuristic; a filter regex containing `[\\/]` or `\\\\`
    written after this project's floor reached 4.3 is a smell, not a defect.
    Floor: 4.3 for the simplification; the old pattern remains correct
    (redundant) on ≥4.3 too.

## Exemplar evidence

- **Candidate 1/2 (multi-config OUTPUT_NAME collision):** not exercised by
  any corpus repo's *own* CMakeLists in a way this dive could re-measure
  cheaply (multi-config installs of a real flagship library were out of
  scope for this dive's budget); this is a scratch-project-only finding.
  `find_ocx` is vacuous here (installs nothing, `LANGUAGES NONE`).
- **Candidate 3 (`MAP_IMPORTED_CONFIG`):** 0 corpus hits for
  `MAP_IMPORTED_CONFIG` across the 46-repo corpus in the wave-1/2 shape dive
  ([cmake-audit/exemplar-cmake-shape.md]) — this mechanism is unused in
  practice, which is exactly why the silent-fallback default (§3) matters:
  nobody is opting in to the loud failure.
- **Candidate 4/5 (CPS `NAMESPACE`/`EXPORT_NAME`):** 0 real
  `install(PACKAGE_INFO)` adopters exist in the 46-repo corpus outside
  Kitware's own tree (consolidation §"Applied to find_ocx and the
  exemplars", row INST-13 to 17) — both findings are necessarily
  scratch-only. `find_ocx`'s `Findocx.cmake:84-88` does create a namespaced
  `ocx::ocx` imported target (satisfies CMK-INST-06's intent) but never adds
  CPS, so it cannot expose the `NAMESPACE`-vs-CPS-name gap this dive found.
- **Candidate 6 (pkg-config depth):** the consolidation's own §"Applied to
  find_ocx and the exemplars" row INST-12 already noted "only vcpkg's own
  port templates (16 of 79 `.pc.in`)" bake `prefix=${pcfiledir}/../..`
  (`microsoft__vcpkg` corpus, per [deps]); none of the sampled upstream
  `.pc.in` files were found using `file(RELATIVE_PATH)` for this — this
  dive's fixture is the first measured instance of the corrected pattern,
  not a corpus-observed one. `find_ocx` ships no `.pc` file (vacuous).
- **Candidate 7/8 (`export(PACKAGE)`/CMP0090):**
  `Tencent__rapidjson@24b5e7a8b2:CMakeLists.txt:218` still calls
  `export(PACKAGE RapidJSON)` unconditionally (already flagged in the
  consolidation's AI-agent failure list #12); this dive's measurement
  confirms that call is a **no-op** under rapidjson's own
  `cmake_minimum_required` (which, per the shape dive, sits well above 3.15),
  so the finding stands as "dead code and a footgun on an older CMake," not
  "currently pollutes the registry" for any consumer running ≥3.15 with
  default policies. `find_ocx` never calls `export(PACKAGE)` (vacuous, no
  compiled targets).
- **Candidate 9/10 (Windows DLLs):** three real adopters outside Kitware's
  own tests, listed in §8; `find_ocx` and the wider fleet have no Windows CI
  leg and no compiled targets, so this candidate binds nothing in the fleet
  today — it is forward-looking guidance for a future consumer of a
  `cmake-build`-governed project that does target Windows.

## AI-agent angle

1. **Assuming a multi-config install "just works" the same as single-config,
   because the round-trip script it was shown only used `Unix Makefiles`.**
   An agent asked to "add Windows/multi-config support" will often just add
   `-G "Ninja Multi-Config"` to an existing recipe and declare victory once
   `cmake --build --config Release` exits 0 — exactly the case that hides
   finding #1 (checksums, not exit codes, catch it). *Check:* run the
   multi-config leg of the round-trip script (candidate 2) and diff checksums
   (candidate 1), not just exit codes.
2. **Treating a config-absent-from-install as something CMake will refuse.**
   Training data full of `find_package(... REQUIRED)` examples primes the
   assumption that a missing piece is always a loud `REQUIRED` failure; the
   measured behavior here (silent fallback to whichever config exists) is the
   opposite, and it is easy for an agent to "fix" a CI flake by relaxing a
   check that was actually protecting against exactly this. *Check:* build
   every declared config against a deliberately partial install; a clean
   exit is the finding, not the reassurance.
3. **Copying `NAMESPACE Vendor::` from a hand-rolled Config template
   unchanged once CPS is added, on the (reasonable-looking) assumption CMake
   reconciles the two.** It does not — CPS never reads `NAMESPACE`. An agent
   that "adds CPS support" to an existing project with a pre-existing,
   long-lived `Vendor::` namespace that differs even by case from the
   package name will silently break every ≥4.3 consumer that still links
   `Vendor::target` (measured, §4), while its own `--build`/`--install` stay
   green. *Check:* candidate 4's grep-plus-read pairing every
   `install(PACKAGE_INFO)` argument against the nearest `NAMESPACE` above it.
4. **Reaching for `-DCMAKE_POLICY_DEFAULT_CMP0090=OLD`/`NEW` on the command
   line to control `export(PACKAGE)`, by analogy with other
   `CMAKE_POLICY_DEFAULT_CMP0NNN` variables that do work this way for a
   project with no floor opinion.** This is the one policy where a
   sufficiently modern floor (any `cmake_minimum_required` ≥ 3.15, which is
   nearly all of them in 2026) makes that variable inert — the measured
   warning ("Manually-specified variables were not used") is the tell, but
   an agent skimming only the final exit code (0) will miss it. *Check:*
   candidate 7 — grep the configure log for "Manually-specified variables
   were not used" whenever a `CMAKE_POLICY_DEFAULT_CMPnnnn` is passed on the
   command line of a project whose floor already covers that policy.
5. **Writing `$<TARGET_RUNTIME_DLLS:tgt>` on a static library or a
   non-executable/non-SHARED/non-MODULE target**, extrapolating from its
   apparent generality — the doc is explicit this is an error, not a silent
   no-op, unlike the non-DLL-platform case. *Check:* `cmake --help-variable`
   does not apply here (it is a generator expression, not a variable); the
   mechanical check is a normal configure/generate run — the error surfaces
   at generate time on the platform where the genex is evaluated, so a
   Linux-only CI leg will never catch a Windows-only misuse; this is a real
   gap this dive could not measure (no Windows host) and flags as
   contested/unverified rather than resolved.
6. **Believing "custom" CPS `VERSION_SCHEMA` values are still comparable by
   order** (already flagged CMK-INST-16 in the consolidation) **and,
   separately, believing a `NAMESPACE` mismatch would at least produce a CPS
   validation warning.** Neither call emits any diagnostic (measured, §4 and
   the consolidation's CMK-INST-16); an agent debugging a "consumer can't
   find the target" failure on ≥4.3 has no log line pointing at the actual
   cause and must be told to check the `.cps` file's `components` key by
   hand.

## Contested / evolving

- **The default silent-fallback for an absent imported configuration (§3) is
  undocumented as a default**, only as the behavior of the opt-out
  (`MAP_IMPORTED_CONFIG_<CONFIG>` set-but-empty). Whether Kitware considers
  this default fallback intentional public behavior or an implementation
  detail is not settled in `Help/prop_tgt/MAP_IMPORTED_CONFIG_CONFIG.rst`
  at v4.4.2; this dive found no CMake issue tracker discussion confirming
  either reading (out of budget to search exhaustively). Trending: nothing
  in the 4.3→4.4 release notes touches this, so treat it as stable until a
  future release says otherwise.
- **The CPS `hints` absolute-path leak (§2) is a real relocation smell that
  the existing CMK-INST-01 leak check already happens to catch**, but
  whether Kitware intends `hints` to ever be relativized, or considers it
  purely a same-machine convenience hint that consumers should never trust
  across a `mv`, is unresolved — `cps-verification.md`'s ledger (rows 14,
  19, 21, 22, 26, 27, 52) does not mention `hints` specifically. This dive's
  measurement (§2) is new evidence for a future CPS-focused dive or an
  upstream report, not a settled Kitware position.
- **`file(RELATIVE_PATH)`-computed `.pc.in` prefixes (§6, candidate 6) have
  zero corpus adopters** (§"Exemplar evidence" above) — every sampled
  upstream `.pc.in` either hard-codes `../..` or bakes an absolute
  `@CMAKE_INSTALL_PREFIX@`. This candidate is measured-correct but
  practice-untested at scale; it should ship as SHOULD, matching
  CMK-INST-12's existing severity, not escalate to MUST on the strength of
  one scratch measurement.

## Sources

| URL or measurement | What it is | Date/era | Why worth reading |
|---|---|---|---|
| `run-multiconfig-roundtrip.sh` (this dive) | Ninja Multi-Config install/consume round trip, 3.31.12 and 4.4.2 | 2026-09-26 | Primary: settles the OUTPUT_NAME-collision and per-config-export-file findings |
| `run-multiconfig-cps.sh` (this dive) | Per-config CPS files and the `hints` leak, 4.3.4 and 4.4.2 | 2026-09-26 | Primary: `dep@debug.cps`/`dep@release.cps` write locations; the leak grep |
| `run-cps-naming-depth.sh` (this dive) | CPS namespace-case mismatch, EXPORT_NAME, pkg-config depth | 2026-09-26 | Primary: settles CMK-INST-15's comparison rule and CMK-INST-12's multi-arch claim |
| `run-export-package-cmp0090.sh` (this dive) | `export(PACKAGE)`/CMP0090 across policy values, throwaway HOME | 2026-09-26 | Primary: settles the "does it write, with NEW vs OLD" question |
| [Help/command/install.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/install.rst) | `RUNTIME_DEPENDENCY_SET`, `IMPORTED_RUNTIME_ARTIFACTS` | fetched 2026-09-26, tag 4.4.2 | Normative source for the Windows DLL candidate (§8, §9) |
| [Help/manual/cmake-generator-expressions.7.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-generator-expressions.7.rst) | `$<TARGET_RUNTIME_DLLS>`, `$<TARGET_RUNTIME_DLL_DIRS>` | fetched 2026-09-26, tag 4.4.2 | Normative source, incl. the "empty string on non-DLL platforms" guarantee |
| [Help/policy/CMP0207.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0207.rst) | Path-separator normalization for runtime-dependency filters | fetched 2026-09-26, tag 4.4.2, new at 4.3 | Normative source for candidate 10 |
| [Help/prop_tgt/MAP_IMPORTED_CONFIG_CONFIG.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/prop_tgt/MAP_IMPORTED_CONFIG_CONFIG.rst) | `MAP_IMPORTED_CONFIG_<CONFIG>` target property | fetched 2026-09-26, tag 4.4.2 | Documents the opt-out failure mode measured in §3 |
| [Help/policy/CMP0090.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0090.rst) | `export(PACKAGE)` registry-population policy | fetched 2026-09-26, tag 4.4.2 | Normative source for §7; matched exactly by measurement |
| `git -C "$REPO" grep -n -e 'TARGET_RUNTIME_DLLS' -- '*.cmake' '*.txt'` over the 46 exemplar clones | Corpus adoption search | 2026-09-26 | Primary: found the 3 real adopters cited in §8 |
| [cmake-consumable-library.md](cmake-consumable-library.md) | Wave-2 consolidation this dive revises (CMK-INST-01..20, CMK-TGT-01..09) | 2026-09-26 | Baseline this dive holds stable and extends |
| [cmake-topic-map.md](cmake-topic-map.md) | Rows M-F-08, M-F-18, and the "install-edges (wave 3)" open question | 2026-09-26 | Assignment source for this dive's scope |
| [cmake-frame.md](cmake-frame.md) | Program frame, every Corrections block | 2026-09-26 (corrections through wave 2) | Era and artifact-set constraints |
| [cmake-topic-map/era-recheck-2026-09-26.md](cmake-topic-map/era-recheck-2026-09-26.md) | Three-week freshness re-check | 2026-09-26 | Confirms 4.4.2/4.3.4/3.31.12 are still the right measurement targets |
| `ocx package exec kitware/cmake:{3.31,4.3,4.4} -- cmake --version` | Host binary versions | 2026-09-26 | 3.31.12, 4.3.4, 4.4.2 confirmed present and used throughout |

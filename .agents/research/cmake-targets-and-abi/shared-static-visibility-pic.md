---
title: "Shared, static, visible and position-independent: linkage traps, measured"
topic: "CMake linkage behaviours targets.md has no rule for yet: BUILD_SHARED_LIBS propagation into FetchContent, PIC on a static archive linked into a shared object, symbol-visibility hardening, CMAKE_LINK_LIBRARIES_ONLY_TARGETS, and reproducible-build path embedding"
agent: shared-static-visibility-pic
model: sonnet
kind: measure
date_researched: 2026-09-26
sources_count: 18
scope: |
  Covers M-E-07 (BUILD_SHARED_LIBS propagation and CMP0077 interaction),
  M-E-09 (PIC on a static archive linked into a shared library, three ways to
  set the property), M-E-08 (CXX_VISIBILITY_PRESET/VISIBILITY_INLINES_HIDDEN
  with GenerateExportHeader; WINDOWS_EXPORT_ALL_SYMBOLS by doc reading only),
  M-E-15 (CMAKE_LINK_LIBRARIES_ONLY_TARGETS diagnostics) and M-E-17
  (-ffile-prefix-map for reproducible builds). Does not re-measure CMK-TGT-01
  through -09 (target_link_libraries keywords, aliases, target_* vs
  directory-scoped commands, CMAKE_CXX_STANDARD, file(GLOB), literal
  -Werror — cmake-consumable-library.md), flag-delivered PIC under a
  rules_foreign_cc-style wrap (CMK-BZL-03/07, cmake-bazel-seam.md M5/M6), or
  M-E-12 (CMAKE_MSVC_RUNTIME_LIBRARY, no Windows host, out of this dive).
---

## Contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [BUILD_SHARED_LIBS into a FetchContent dependency (M-E-07)](#1-build_shared_libs-into-a-fetchcontent-dependency-m-e-07)
   2. [PIC on a static archive linked into a shared library (M-E-09)](#2-pic-on-a-static-archive-linked-into-a-shared-library-m-e-09)
   3. [Visibility hardening with GenerateExportHeader (M-E-08)](#3-visibility-hardening-with-generateexportheader-m-e-08)
   4. [CMAKE_LINK_LIBRARIES_ONLY_TARGETS (M-E-15)](#4-cmake_link_libraries_only_targets-m-e-15)
   5. [-ffile-prefix-map for reproducible builds (M-E-17)](#5--ffile-prefix-map-for-reproducible-builds-m-e-17)
   6. [Re-confirming CMK-TGT-04's append/overwrite split under a PIC-seeding toolchain](#6-re-confirming-cmk-tgt-04s-appendoverwrite-split-under-a-pic-seeding-toolchain)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- **CMAKE_POSITION_INDEPENDENT_CODE reaches a static archive linked into a shared library, on all three tested channels — `-D` on the command line, `set()` as a normal variable before `add_subdirectory`, and `set()` before `FetchContent_MakeAvailable` — on 3.31.12 and 4.4.2.** All three add `-fPIC` to the archive member's compile command.
- **The baseline (no property set anywhere) fails the shared link with `relocation R_X86_64_32S against '.data' can not be used when making a shared object; recompile with -fPIC`, exit 1, identically on 3.31.12 and 4.4.2.** This is a real, reproducible failure, not a hypothetical — it needs code whose global-data access does not stay RIP-relative under `-fno-pic`-adjacent defaults (a plain "return a constant" static function does *not* trigger it on this Fedora/RHEL-style toolchain; array-of-pointers indexing does).
- **The property is not a guarantee: it only seeds `POSITION_INDEPENDENT_CODE` on a target at the moment the target is created, and only if the target does not already set the property itself** (`Help/prop_tgt/POSITION_INDEPENDENT_CODE.rst`, v4.4.2). A fetched dependency that calls `set_target_properties(... POSITION_INDEPENDENT_CODE OFF)` on its own target is untouched by any parent variable. No shipped rule may claim the variable "guarantees" PIC.
- **The bigger, silent surprise is in `BUILD_SHARED_LIBS`, not PIC: setting it as a normal variable before `FetchContent_MakeAvailable` is silently overridden back to the dependency's own default when that dependency's own `cmake_minimum_required` predates 3.13 (CMP0077).** Measured: dependency floor 3.25 (CMP0077 NEW) → the fetched library ends up `SHARED`. Same parent, same intent, dependency floor 3.12 (CMP0077 unset/OLD-compatible) → the fetched library ends up `STATIC`, with only a policy *warning* ("Policy CMP0077 is not set…") on stderr — no error, no red exit code. Confirmed on 3.31.12 and 4.4.2.
- **Setting `BUILD_SHARED_LIBS` as a CACHE entry (`-D` or `set(... CACHE BOOL "" FORCE)`) is immune to this: it wins regardless of the dependency's floor,** because an already-existing cache entry is never recreated by a plain `option()` call. Measured on both floors, both CMake versions.
- **A dependency that hard-codes `add_library(dep STATIC ...)` ignores `BUILD_SHARED_LIBS` entirely, in either channel** — measured, no surprise, but it is the negative case that motivates CMK-BZL-07's "choose through a cache entry" rule for a *library shipping a package*, not just a Bazel-wrap concern.
- **Everything is exported by default from an ELF shared library, including a header-only inline function.** Measured: a plain `SHARED` target with no visibility hardening exposes all three symbols — the intended public API, an internal helper, and a header `inline` function — from `nm -D --defined-only`. Adding `CXX_VISIBILITY_PRESET hidden` + `VISIBILITY_INLINES_HIDDEN ON` alongside `GenerateExportHeader`'s macro on only the public function drops the export list to exactly that one symbol.
- **`WINDOWS_EXPORT_ALL_SYMBOLS` is Windows-and-MS-toolchain-only** (`Help/prop_tgt/WINDOWS_EXPORT_ALL_SYMBOLS.rst`, v4.4.2) and even there does not fully replace explicit markup: global *data* symbols and, in some cases, a whole polymorphic class still need `__declspec(dllimport)` on the consumer side. It is never a Linux/macOS substitute for the visibility rule above. No Windows host was available; this is a doc reading, not a measurement.
- **`CMAKE_LINK_LIBRARIES_ONLY_TARGETS ON` (3.23) rejects a misspelled target, and it rejects the bare system-library names `m` and `pthread` with the exact same diagnostic — it cannot tell "typo" from "legitimate bare linker name."** Measured on 4.4.2: all three fail at generate time with `CMake Error … has LINK_LIBRARIES_ONLY_TARGETS enabled, but it links to: <name> which is not a target`, exit 1, listing three possible reasons (typo, missing `find_package`, missing `ALIAS`).
- **The same setting accepts an absolute library path (`/usr/lib64/libm.so`) and a real imported target (`Threads::Threads` via `find_package(Threads)`) without complaint.** Exit 0 for both, measured on 4.4.2.
- **This means adopting `CMAKE_LINK_LIBRARIES_ONLY_TARGETS` is a breaking change for any project that still links bare `m`, `pthread`, `dl` or `rt` by name — it must first convert those to `Threads::Threads` / an equivalent imported target or an absolute path**, not just fix real typos.
- **CMake has no `CMAKE_DEBUG_PREFIX_MAP` variable — confirmed absent on 4.4.2 (`cmake --help-variable` reports "not a defined variable")** — so reproducible-build path stripping is entirely manual, via `-ffile-prefix-map` (GCC/Clang, not a CMake abstraction).
- **`-ffile-prefix-map` delivered through `target_compile_options()` and through a toolchain file's `CMAKE_C_FLAGS_INIT` produce byte-identical `.o` files** when the same two absolute source/build directories are mapped to the same canonical strings — measured with `cmp` (identical) and `strings` (no absolute source-tree path present after mapping, the canonical replacement string present instead) on 4.4.2. Without either, the two builds' `.o` files differ and each embeds its own absolute source and build directory.
- **CMK-TGT-04's severity split (overwrite = MUST, append = SHOULD) is reconfirmed on a fresh, general (non-Bazel-wrap) scaffold.** Under a toolchain seeding `CMAKE_C_FLAGS_INIT` with `-fPIC -DWRAP_SEED=1`, `string(APPEND CMAKE_C_FLAGS " -Wall")` keeps both the seed and the new flag and the shared link succeeds; `set(CMAKE_C_FLAGS "-Wall")` drops the seed entirely and the shared link fails with the identical `recompile with -fPIC` error as the M-E-09 baseline. Both measured on 4.4.2.
- **A library should never force `BUILD_SHARED_LIBS` on or off for itself.** It should read the incoming value (`option(BUILD_SHARED_LIBS "..." <sensible-default>)` with no `CACHE ... FORCE`) and let a consumer's own `-D`, preset or top-level `set(... CACHE ...)` decide — the same "user/consumer chooses" posture as CMK-BZL-07 (SHOULD), generalised beyond the Bazel-wrap scope to any consumer including a plain FetchContent-as-subproject build.
- **None of the six measured behaviours here vary between 3.31.12 and 4.4.2** (spot-checked on both for M-E-07 and M-E-09); the mechanisms are compiler/linker-level (GCC codegen, ELF relocations) or CMake-language-level features stable since well below the 3.25 assumed floor (CMP0077 since 3.13, `POSITION_INDEPENDENT_CODE` since 2.8.9, `CMAKE_LINK_LIBRARIES_ONLY_TARGETS`/`LINK_LIBRARIES_ONLY_TARGETS` since 3.23, `file(REAL_PATH)`-adjacent `-ffile-prefix-map` is a raw compiler flag with no CMake-version gate). 4.3.4 was not separately run because no result was expected to, or did, differ.

## Findings

All commands below were run from scratch project directories under
`/home/mherwig/.cache/cmake-measure-scratch/linkage/`; copies of every
scratch project's sources live under
`.agents/research/cmake-targets-and-abi/scratch/shared-static-visibility-pic/`
in this worktree. CMake via `ocx package exec kitware/cmake:{3.31,4.4} --
cmake`, generator `Unix Makefiles` (`CMAKE_C_COMPILER=/usr/sbin/gcc`,
`CMAKE_MAKE_PROGRAM=/usr/sbin/make`; the Ninja binary is not on `PATH` for
this sandbox, only reachable via its own `ocx package exec`, so Makefiles was
used throughout for reliability). `/opt/zig/zig c++` via the two-line wrapper
script was used only for §3, the one C++-only measurement.

### 1. BUILD_SHARED_LIBS into a FetchContent dependency (M-E-07)

Setup: a dependency `dep` with `option(BUILD_SHARED_LIBS "Build shared" OFF)`
followed by `add_library(dep dep.c)` (no explicit type), fetched from a local
`file://` bare git repo. Two dependency floors (`cmake_minimum_required`
3.12 and 3.25) and two ways for the parent to set `BUILD_SHARED_LIBS ON`
before `FetchContent_MakeAvailable`.

```sh
$ ocx package exec kitware/cmake:4.4 -- cmake -S parent-normal-312 -B build-normal-312-dbg \
    -G "Unix Makefiles" -DCMAKE_C_COMPILER=/usr/sbin/gcc -DCMAKE_MAKE_PROGRAM=/usr/sbin/make
-- CMP0077= BEFORE_OPTION_BUILD_SHARED_LIBS=ON
  Policy CMP0077 is not set: option() honors normal variables.  Run "cmake
  --help-policy CMP0077" for policy details.  Use the cmake_policy command to
  ...
-- AFTER_OPTION_BUILD_SHARED_LIBS=OFF
-- DEP_TARGET_TYPE=STATIC_LIBRARY
```

```sh
$ ocx package exec kitware/cmake:4.4 -- cmake -S parent-normal-325 -B build-normal-325-dbg \
    -G "Unix Makefiles" -DCMAKE_C_COMPILER=/usr/sbin/gcc -DCMAKE_MAKE_PROGRAM=/usr/sbin/make
-- CMP0077=NEW BEFORE_OPTION_BUILD_SHARED_LIBS=ON
-- AFTER_OPTION_BUILD_SHARED_LIBS=ON
-- DEP_TARGET_TYPE=SHARED_LIBRARY
```

Identical on `kitware/cmake:3.31` (3.31.12): floor 3.12 → `STATIC_LIBRARY`
with the same CMP0077 warning; floor 3.25 → `SHARED_LIBRARY`, no warning.
The parent's `CMakeLists.txt` is byte-identical between the two runs; only
`local-repos/notype312/CMakeLists.txt`'s `cmake_minimum_required` line
differs from `notype325`'s.

Now the cache-entry channel, same two dependency floors, parent
`CMakeLists.txt` has **no** `set(BUILD_SHARED_LIBS ...)` at all:

```sh
$ ocx package exec kitware/cmake:4.4 -- cmake -S parent-cache-312 -B build-cache-312 \
    -G "Unix Makefiles" -DCMAKE_C_COMPILER=/usr/sbin/gcc -DCMAKE_MAKE_PROGRAM=/usr/sbin/make \
    -DBUILD_SHARED_LIBS=ON
-- DEP_TARGET_TYPE=SHARED_LIBRARY
$ ocx package exec kitware/cmake:4.4 -- cmake -S parent-cache-325 -B build-cache-325 \
    -G "Unix Makefiles" -DCMAKE_C_COMPILER=/usr/sbin/gcc -DCMAKE_MAKE_PROGRAM=/usr/sbin/make \
    -DBUILD_SHARED_LIBS=ON
-- DEP_TARGET_TYPE=SHARED_LIBRARY
```

Both floors: `SHARED_LIBRARY`. The `-D` creates the cache entry *before*
`option()` ever runs; `option()`'s documented behaviour (`Help/command/option.rst`,
`Help/policy/CMP0077.rst`) is to leave an existing cache entry alone
regardless of CMP0077 status, so the floor stops mattering.

Finally, the dependency hard-codes its type
(`add_library(dep STATIC dep.c)`, `option(BUILD_SHARED_LIBS OFF)` still
present but never consulted for the type):

```sh
$ ocx package exec kitware/cmake:4.4 -- cmake -S parent-normal-static -B build-normal-static \
    -G "Unix Makefiles" -DCMAKE_C_COMPILER=/usr/sbin/gcc -DCMAKE_MAKE_PROGRAM=/usr/sbin/make
-- DEP_TARGET_TYPE=STATIC_LIBRARY
```

`STATIC_LIBRARY` regardless of the parent's `BUILD_SHARED_LIBS=ON` (normal
variable, same as the surprising case above) — expected, since an explicit
`STATIC`/`SHARED` keyword on `add_library` is never conditioned on the
variable at all.

**Why this happens** (`Help/policy/CMP0077.rst`, v4.4.2): pre-3.13, when a
cache entry of the option's name does not yet exist, `option()` creates one
using its own default, *without* consulting a pre-existing normal variable
of the same name — and the new cache entry is what wins for expressions like
`add_library(dep ${SRCS})`'s implicit-type check, discarding the inherited
normal-variable value from the parent scope for anything evaluated from that
point on inside the dependency's directory. Under CMP0077 NEW (floor ≥
3.13), `option()` instead detects the pre-existing normal variable and skips
creating a cache entry at all, so the inherited value survives untouched.

### 2. PIC on a static archive linked into a shared library (M-E-09)

Reproducer (needed to actually trigger the ELF relocation trap on this
host's GCC 15.2.1 — a plain "return a constant" static function does *not*
trigger it, because x86-64's default RIP-relative addressing already covers
it):

```c
/* stat/stat.c */
#include <stdio.h>
static const char *table[10] = {"a","b","c","d","e","f","g","h","i","j"};
int stat_fn(int i) { return puts(table[i % 10]); }
```

`add_library(stat STATIC stat.c)`, no `POSITION_INDEPENDENT_CODE` property
anywhere on it; `add_library(shared SHARED shared.c)` links `stat` `PRIVATE`.

Baseline, no property set anywhere:

```sh
$ ocx package exec kitware/cmake:4.4 -- cmake -S . -B build-base -G "Unix Makefiles" \
    -DCMAKE_C_COMPILER=/usr/sbin/gcc -DCMAKE_MAKE_PROGRAM=/usr/sbin/make
-- Configuring done (0.1s)
$ ocx package exec kitware/cmake:4.4 -- cmake --build build-base
...
[100%] Linking C shared library libshared.so
/usr/sbin/ld: stat/libstat.a(stat.c.o): relocation R_X86_64_32S against `.data' can not be used when making a shared object; recompile with -fPIC
/usr/sbin/ld: failed to set dynamic section sizes: bad value
collect2: error: ld returned 1 exit status
```

Exit 1. Identical on 3.31.12. `readelf -r` on the archive member confirms
the offending relocation:

```sh
$ readelf -r build-base/stat/CMakeFiles/stat.dir/stat.c.o
Relocation section '.rela.text' ... contains 2 entries:
  Offset  Info  Type       Sym. Value  Sym. Name + Addend
  00003c  ...   R_X86_64_32S  0000000000000000  .data + 0
  000044  ...   R_X86_64_PLT32 0000000000000000  puts - 4
```

Three ways to set `CMAKE_POSITION_INDEPENDENT_CODE ON`, each configured
with `-DCMAKE_EXPORT_COMPILE_COMMANDS=ON`:

**A — `-D` on the command line (global cache variable):**
```sh
$ ocx package exec kitware/cmake:4.4 -- cmake -S . -B build-A ... -DCMAKE_POSITION_INDEPENDENT_CODE=ON
$ ocx package exec kitware/cmake:4.4 -- cmake --build build-A   # exit 0, libshared.so links
$ grep -A0 stat.c build-A/compile_commands.json | grep command
"command": "/usr/sbin/gcc   -fPIC -o CMakeFiles/stat.dir/stat.c.o -c .../stat/stat.c"
```

**B — `set()` as a normal variable in the parent, before `add_subdirectory`:**
```cmake
project(picarchive_b C)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
add_subdirectory(../stat stat-build)
```
Build exit 0; compile command for `stat.c.o`: `... gcc -fPIC -o ... -c .../stat/stat.c`.

**C — `set()` before `FetchContent_MakeAvailable`, same local `file://` repo:**
```cmake
include(FetchContent)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)
FetchContent_Declare(statdep GIT_REPOSITORY file:///.../local-repo GIT_TAG main)
FetchContent_MakeAvailable(statdep)
```
Build exit 0; compile command:
`... gcc -fPIC -o CMakeFiles/stat.dir/stat.c.o -c .../build-C/_deps/statdep-src/stat.c`.

`readelf -r` on method A's archive member shows the absolute relocation
replaced by a RIP-relative one:

```sh
$ readelf -r build-A/stat/CMakeFiles/stat.dir/stat.c.o
Relocation section '.rela.text' ...
  000043  ...  R_X86_64_PC32  0000000000000000  .data.rel.local - 4
  00004f  ...  R_X86_64_PLT32 0000000000000000  puts - 4
```

All three channels reach the archive identically. This overturns nothing
from `install-round-trip-and-cps.md` §10's own claim ("PIC reaching the
static archive's object file, confirmed") — that measurement is simply
*not evidence for this row*: it never linked the static archive into a
shared object (`BASE_SHARED=OFF`, no consuming `SHARED` target), so it could
not have observed a PIC-related link failure or success either way; it only
showed `-fPIC` on the compile line when the variable was passed as a global
`-D`. This dive supplies the missing shared-link half and the other two
channels.

**Caveat for the normative rule (per Help/prop_tgt/POSITION_INDEPENDENT_CODE.rst,
v4.4.2):** "this property is initialized by the value of
`CMAKE_POSITION_INDEPENDENT_CODE`… **if it is set when the target is
created**." A `set()` after the static library's `add_library()` call has no
effect on it. A dependency's own `set_target_properties(dep PROPERTIES
POSITION_INDEPENDENT_CODE OFF)` — an explicit target-level override — is
never touched by the parent's variable at all, since the variable only ever
*seeds* an unset property. No shipped rule may say the variable
"guarantees" PIC on every static target a build produces.

### 3. Visibility hardening with GenerateExportHeader (M-E-08)

C++ required for `VISIBILITY_INLINES_HIDDEN` (an inline-function concept);
`CMAKE_CXX_COMPILER` set to
`/home/mherwig/.cache/cmake-measure-scratch/zig-cxx-wrapper.sh` (`exec
/opt/zig/zig c++ "$@"`).

```cpp
// mylib.hpp
#include "mylib_export.h"
MYLIB_EXPORT int public_api(void);
int internal_helper(void);
inline int inline_helper(void) { return 7; }
```
```cmake
add_library(mylib SHARED mylib.cpp)
include(GenerateExportHeader)
generate_export_header(mylib)
target_include_directories(mylib PUBLIC ${CMAKE_CURRENT_BINARY_DIR})
if(HIDE_IT)
  set_target_properties(mylib PROPERTIES CXX_VISIBILITY_PRESET hidden VISIBILITY_INLINES_HIDDEN ON)
endif()
```

Before (`HIDE_IT=OFF`):
```sh
$ nm -D --defined-only build-before/libmylib.so
000000000001e090 T _Z10public_apiv
000000000001e0f0 W _Z13inline_helperv
000000000001e0e0 T _Z15internal_helperv
```
All three symbols dynamically exported — the intended public API, the
"private" helper, and the header-only inline function.

After (`HIDE_IT=ON`):
```sh
$ nm -D --defined-only build-after/libmylib.so
000000000001dff0 T _Z10public_apiv
```
Only `public_api` remains. A consumer needs nothing beyond `#include
"mylib.hpp"` (which pulls in the generated `mylib_export.h`) and linking
`mylib` — `MYLIB_EXPORT` already expands to
`__attribute__((visibility("default")))` on the one symbol meant to be
public. Both runs on 4.4.2 (visibility-preset handling is a compiler/linker
feature, not CMake-version-gated; `CXX_VISIBILITY_PRESET` and
`GenerateExportHeader` predate the 3.25 assumed floor by a wide margin).

`WINDOWS_EXPORT_ALL_SYMBOLS` — doc reading only, no Windows host:
[`Help/prop_tgt/WINDOWS_EXPORT_ALL_SYMBOLS.rst@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/prop_tgt/WINDOWS_EXPORT_ALL_SYMBOLS.rst) —
"implemented only for MS-compatible tools on Windows"; even there, "global
*data* symbols must be explicitly marked with `__declspec(dllimport)`" and a
class whose constructor references a vtable may need the whole class
marked, so it is not a complete substitute for real visibility control even
on its own platform, and never applicable on Linux/macOS.

### 4. CMAKE_LINK_LIBRARIES_ONLY_TARGETS (M-E-15)

`set(CMAKE_LINK_LIBRARIES_ONLY_TARGETS ON)` (3.23) before `add_executable` +
`target_link_libraries`, five link items, one project each, on 4.4.2:

| Link item | Configure result | Exit |
|---|---|---|
| `NoSuchTarget123` (misspelled) | `CMake Error at CMakeLists.txt:5 (target_link_libraries): Target "app" has LINK_LIBRARIES_ONLY_TARGETS enabled, but it links to: NoSuchTarget123 which is not a target.` (3 possible-reasons bullets), then `CMake Generate step failed.` | 1 |
| `m` (bare, legitimate `libm`) | identical diagnostic, `m` in place of the name | 1 |
| `pthread` (bare, legitimate `libpthread`) | identical diagnostic, `pthread` in place of the name | 1 |
| `/usr/lib64/libm.so` (absolute path) | `Configuring done` / `Generating done`, no error | 0 |
| `Threads::Threads` (via `find_package(Threads REQUIRED)`) | `Found Threads: TRUE`, `Configuring done` / `Generating done` | 0 |

```sh
$ ocx package exec kitware/cmake:4.4 -- cmake -S barem -B build2-barem -G "Unix Makefiles" \
    -DCMAKE_C_COMPILER=/usr/sbin/gcc -DCMAKE_MAKE_PROGRAM=/usr/sbin/make
CMake Error at CMakeLists.txt:5 (target_link_libraries):
  Target "app" has LINK_LIBRARIES_ONLY_TARGETS enabled, but it links to:
    m
  which is not a target.  Possible reasons include:
    * There is a typo in the target name.
    * A find_package call is missing for an IMPORTED target.
    * An ALIAS target is missing.
CMake Generate step failed.
$ echo $?
1
```

The error is deferred to the generate phase (it fires after "Configuring
done" is printed, immediately before "Generating done"), so a CI step that
only checks the configure log for the literal string `Error` before
"Configuring done" would miss it — check the final exit code, not a log
substring position.

### 5. `-ffile-prefix-map` for reproducible builds (M-E-17)

Same source (`lib.c`) checked out at two different absolute directories,
built with `-g -O0` (typical debug-info-bearing build):

```sh
$ cmp dirA/build-noflag/CMakeFiles/mathlib.dir/lib.c.o \
      dirB_different_path/build-noflag/CMakeFiles/mathlib.dir/lib.c.o
... differ: byte 41, line 1
$ strings dirA/build-noflag/CMakeFiles/mathlib.dir/lib.c.o | grep -e '/home/.../m5-file-prefix-map'
/home/.../m5-file-prefix-map/dirA/build-noflag
/home/.../m5-file-prefix-map/dirA/lib.c
/home/.../m5-file-prefix-map/dirA
```

With `target_compile_options(mathlib PRIVATE
-ffile-prefix-map=${CMAKE_CURRENT_SOURCE_DIR}=/canon/src
-ffile-prefix-map=${CMAKE_CURRENT_BINARY_DIR}=/canon/build)`:

```sh
$ cmp dirA/build-flag/.../lib.c.o dirB_different_path/build-flag/.../lib.c.o
(no output — identical)
$ strings dirA/build-flag/.../lib.c.o | grep -e '/home/.../m5-file-prefix-map'
(no output)
$ strings dirA/build-flag/.../lib.c.o | grep -e /canon
/canon/build
/canon/src/lib.c
/canon/src
```

Byte-identical, no source-tree absolute path present. The same result comes
from a toolchain file instead of `target_compile_options`:

```cmake
# toolchain-prefixmap.cmake, one per source directory (paths are absolute and directory-specific)
set(CMAKE_C_FLAGS_INIT "-ffile-prefix-map=<abs-src-dir>=/canon/src -ffile-prefix-map=<abs-src-dir>/build-toolchain=/canon/build")
```
```sh
$ ocx package exec kitware/cmake:4.4 -- cmake -S dirA -B dirA/build-toolchain ... \
    -DCMAKE_TOOLCHAIN_FILE=<abs>/toolchain-prefixmap.cmake
$ cmp dirA/build-toolchain/.../lib.c.o dirB_different_path/build-toolchain/.../lib.c.o
(no output — identical)
```

`CMAKE_DEBUG_PREFIX_MAP` does not exist as a variable:

```sh
$ ocx package exec kitware/cmake:4.4 -- cmake --help-variable CMAKE_DEBUG_PREFIX_MAP
Argument "CMAKE_DEBUG_PREFIX_MAP" to --help-variable is not a defined variable.
```

### 6. Re-confirming CMK-TGT-04's append/overwrite split under a PIC-seeding toolchain

Reuses the §2 static-into-shared scaffold. Toolchain file:
`set(CMAKE_C_FLAGS_INIT "-fPIC -DWRAP_SEED=1")`.

Append (`string(APPEND CMAKE_C_FLAGS " -Wall")` after `project()`):
```sh
$ grep stat.c build-append/compile_commands.json | grep command
"command": "/usr/sbin/gcc   -fPIC -DWRAP_SEED=1 -Wall -o ... -c .../stat.c"
```
Shared link succeeds, exit 0.

Overwrite (`set(CMAKE_C_FLAGS "-Wall")` after `project()`):
```sh
$ grep stat.c build-overwrite/compile_commands.json | grep command
"command": "/usr/sbin/gcc   -Wall -o ... -c .../stat.c"
$ ocx package exec kitware/cmake:4.4 -- cmake --build build-overwrite
...
/usr/sbin/ld: stat/libstat.a(stat.c.o): relocation R_X86_64_32S against `.data' can not be used when making a shared object; recompile with -fPIC
```
Exit 1, the identical error text as the §2 baseline. Both on 4.4.2. This is
the fresh, general-scope confirmation the map's Contradiction 3 asked this
dive to supply, matching `cmake-bazel-seam.md` M6's Bazel-wrap-scoped result.

## Normative guidance candidates

Provisional dive-local IDs; the next `cmake-build/targets.md` consolidation
supersedes this numbering (same convention `cmake-bazel-seam.md` used for
its own dive-local IDs).

1. **CMK-TGT-10 (MUST, floor: 3.13 for the CMP0077 mechanism, any for the workaround).** When a build must make `BUILD_SHARED_LIBS` reach a `FetchContent`- or `add_subdirectory`-added dependency, set it as a **cache** entry (`-DBUILD_SHARED_LIBS=ON` or `set(BUILD_SHARED_LIBS ON CACHE BOOL "" FORCE)`), never as a plain `set(BUILD_SHARED_LIBS ON)` normal variable. *Rationale*: a normal-variable setting is silently discarded — with only a policy warning, no error — by any dependency whose own `cmake_minimum_required` predates 3.13 (§1, M-E-07). *Verify*: configure with `-DBUILD_SHARED_LIBS=ON` and no `set(BUILD_SHARED_LIBS` line above the fetch/add_subdirectory call; `grep -rn -e 'set(BUILD_SHARED_LIBS' --include='CMakeLists.txt' --include='*.cmake' .` — every hit not spelled `set(BUILD_SHARED_LIBS <val> CACHE` is a finding when it sits before a `FetchContent_MakeAvailable`/`add_subdirectory` call. Empty (or every hit is the CACHE form) = pass.
2. **CMK-TGT-11 (SHOULD, any floor; generalises CMK-BZL-07 beyond the wrap scope — cite, do not restate).** A library never forces `BUILD_SHARED_LIBS` on or off for itself. Read it with `option(BUILD_SHARED_LIBS "..." <default>)` and no `CACHE ... FORCE`; let the consumer's own `-D`, preset, manager profile or top-level `set(... CACHE ...)` decide. *Verify*: reading heuristic — for each exported library target, its `add_library` has no literal `STATIC`/`SHARED` keyword, or the keyword is itself behind a documented per-project `option()` that a consumer can flip (the zlib pattern), never a value baked in from the library's own detection of its environment.
3. **CMK-TGT-12 (MUST, any floor for the property; the PIC-requiring code pattern is compiler-codegen-dependent, not CMake-version-dependent).** Any static-library target that may end up linked into a `SHARED` or `MODULE` target must have `POSITION_INDEPENDENT_CODE` resolved to `ON` *before that target is created* — via `CMAKE_POSITION_INDEPENDENT_CODE` set as a normal or cache variable ahead of the `add_library`/`add_subdirectory`/`FetchContent_MakeAvailable` call, or via the target property directly. Never claim the variable "guarantees" PIC: it has no effect on a target that already sets `POSITION_INDEPENDENT_CODE` itself, and it has no effect if set after the target exists (§2 caveat, `POSITION_INDEPENDENT_CODE.rst`). *Verify*: `unshare -rn`-style or plain build; a shared-library link ending in `relocation R_...32... can not be used when making a shared object; recompile with -fPIC` against one of its own static dependencies = finding. `VERBOSE=1 cmake --build ...` showing `-fPIC` on every static dependency's compile line, or `readelf -r <member>.o` showing no absolute-address relocation in `.text`, = pass.
4. **CMK-TGT-13 (SHOULD, any floor; `VISIBILITY_INLINES_HIDDEN` is a C++-only concept).** An installable shared library sets `CXX_VISIBILITY_PRESET hidden` (and `C_VISIBILITY_PRESET hidden` for C) plus `VISIBILITY_INLINES_HIDDEN ON`, and marks its public API with `GenerateExportHeader`'s generated macro. Never reach for `WINDOWS_EXPORT_ALL_SYMBOLS` as a cross-platform substitute — it is Windows/MS-toolchain-only and does not cover data symbols or every virtual-function case even there (`WINDOWS_EXPORT_ALL_SYMBOLS.rst`). *Verify*: `nm -D --defined-only <built .so>` before and after adding the properties — a shrinking export list that still contains every symbol the library's own public headers declare, and none that they don't, is the pass condition; an unchanged, large export list = finding.
5. **CMK-TGT-14 (SHOULD to adopt `CMAKE_LINK_LIBRARIES_ONLY_TARGETS`, MUST to convert bare system-library names first; floor 3.23).** Before turning `CMAKE_LINK_LIBRARIES_ONLY_TARGETS` `ON`, replace every bare system-library link item (`m`, `pthread`, `dl`, `rt`, …) with its imported-target form (`Threads::Threads` via `find_package(Threads)`, or a hand-written `IMPORTED` target) or an absolute path — the flag cannot distinguish a legitimate bare linker name from a typo and rejects both identically. *Verify*: `grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'target_link_libraries(' .` — read every call site's argument list by hand for a bare `m`, `pthread`, `dl` or `rt` token not already spelled as an imported target or absolute path; empty output = nothing to check, no calls at all. A bare hit = finding, *before* enabling the variable. After enabling it, a clean `cmake --build` exit 0 through the generate step is the pass signal — a "which is not a target" `CMake Error` naming one of those bare names, exit 1, is the finding the hand-read grep should already have caught.
6. **CMK-TGT-15 (SHOULD, any floor — raw compiler flag, not CMake-gated).** A reproducible build wires `-ffile-prefix-map=<abs-source-dir>=<canonical>` and `-ffile-prefix-map=<abs-binary-dir>=<canonical>` itself, through `target_compile_options` or a toolchain file's `CMAKE_<LANG>_FLAGS_INIT` — both deliver byte-identical objects (§5). There is no `CMAKE_DEBUG_PREFIX_MAP` or other CMake-native abstraction for this (confirmed absent, `cmake --help-variable`); do not invent one in generated guidance.
7. **CMK-TGT-04 (unchanged; reconfirmed).** Overwriting `CMAKE_C_FLAGS`/`CMAKE_CXX_FLAGS` after `project()` (MUST-severity clause) drops a toolchain's `_INIT`-seeded flags including `-fPIC`, reproducing the identical relocation failure as an unset PIC property (§6); `string(APPEND ...)` (SHOULD-severity clause) preserves the seed. No text change from `cmake-consumable-library.md`'s existing rule; this dive supplies a second, independent, non-Bazel-wrap measurement.

## Exemplar evidence

- **BUILD_SHARED_LIBS as a documented `option()`, the sanctioned shape CMK-TGT-11 asks for:** `madler__zlib` and the corpus's other CL-shape libraries follow the zlib-style build-static/build-shared switch pattern the shape audit and `cmake-bazel-seam.md` (CMK-BZL-07) already cite — cited there, not re-measured here.
- **GenerateExportHeader adoption is 9 of 43 corpus repos** ([shape] §8, cited by the map's M-E-08 row) — CMK-TGT-13 is SHOULD, not MUST, on that adoption evidence; `find_ocx` ships no library and has no row here (`ocx-sh/find_ocx@ac2a759cd0`, confirmed zero `install(EXPORT`/library targets by `install-round-trip-and-cps.md`).
- **rules_foreign_cc issue [#421](https://github.com/bazel-contrib/rules_foreign_cc/issues/421)** (`-fPIC` with `--force_pic`) is the flag-delivered side of the PIC story, already fully resolved as CMK-BZL-03/M5/M6 in `cmake-bazel-seam.md`; this dive's §2 and §6 are the property-level and non-wrap-scaffold companions, not a restatement.
- **rules_foreign_cc PR [#1440](https://github.com/bazel-contrib/rules_foreign_cc/pull/1440)** ("PIC arrives as a flag since 0.16.0") is cited by `cmake-bazel-seam.md` CMK-BZL-03's rationale; this dive adds nothing new to it beyond confirming the general (non-wrap) case behaves the same way for the property-based channel.
- **`/home/mherwig/dev/find_ocx`** has `LANGUAGES NONE`, ships no library target and calls no `add_library`, `FetchContent_MakeAvailable` on a compiled dependency, or `target_link_libraries` — none of CMK-TGT-10 through -15 apply to it directly. It is a plausible future violator of CMK-TGT-10 if it ever vendors a compiled tool via `FetchContent` and expects a parent's `BUILD_SHARED_LIBS` to reach it, given how easy the normal-variable form is to reach for.

## AI-agent angle

- **Assuming `set(BUILD_SHARED_LIBS ON)` before `FetchContent_MakeAvailable` is equivalent to `-DBUILD_SHARED_LIBS=ON`.** A model that has seen countless `set(CMAKE_CXX_STANDARD 20)`-style "just set the variable" snippets will reach for the same shape here and get silently the wrong library type on any dependency with an older floor, with no red exit code to notice. Check: after any such fetch, `cmake --build --target <dep> -v 2>&1 | grep -c '\.so\b'` (or read the dependency's actual `TYPE` property) before trusting the intent was honoured; never assume "no error" means "the setting took."
- **Treating `CMAKE_POSITION_INDEPENDENT_CODE=ON` as a blanket fix applied once at the top and forgotten.** Models trained on 2.8-era or single-project examples describe it as "the PIC switch" without the ordering caveat; a target created before the `set()` call, or one that sets its own `POSITION_INDEPENDENT_CODE` property, silently keeps its old behaviour. Check: `readelf -r` the specific archive member in question, not just "the variable is set somewhere in the top-level file."
- **Assuming a shared library's symbol surface is whatever `nm -D` on an *unhardened* build shows, i.e. "it's fine, the function is there."** Every symbol including test-only helpers and header `inline` functions is exported by default on ELF; a model that has not measured this treats the visibility problem as Windows-only ("DLLs need `__declspec`, .so doesn't"), which is backwards — Linux/macOS export *everything* by default and Windows/MSVC hides everything by default. Check: `nm -D --defined-only` the actual `.so`, count the symbols, and compare against the public header's declared surface.
- **Reaching for `CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS` as "the portable one-liner for exports."** It is a real property, but Windows-only, and a model asked to "make my library work as a shared library everywhere" may propose it as if it also fixed the ELF over-export problem above; it does nothing there. Check: the property name itself names the platform; grep for it outside a `WIN32`/MSVC guard.
- **Hallucinating `CMAKE_DEBUG_PREFIX_MAP` or a similar CMake-native reproducibility variable**, because the naming pattern ("`CMAKE_<LANG>_FLAGS_INIT` exists, so surely a debug-prefix equivalent does too") is plausible and the flag genuinely exists at the compiler level (`-ffile-prefix-map`/`-fdebug-prefix-map`). Check: `cmake --help-variable-list | grep -i prefix_map` — empty on 4.4.2.
- **Turning on `CMAKE_LINK_LIBRARIES_ONLY_TARGETS` as a pure hardening improvement with no migration cost**, because the property's own one-line doc summary reads as strictly positive ("catches typos"). A model proposing it as a drop-in addition to an existing project's `CMakeLists.txt` will break every bare `pthread`/`m`/`dl` link in one shot. Check: run the bare-name grep from CMK-TGT-14 *before* proposing the flag, not after the build breaks.
- **Assuming Conan-1-era or `option(BUILD_SHARED_LIBS ...)`-free vendored code from pre-3.13 tutorials composes safely with a modern parent's `BUILD_SHARED_LIBS`.** This is exactly §1's CMP0077 trap in miniature: an agent porting an old header-only-turned-compiled example into a modern `FetchContent` block inherits the old floor's `option()` semantics unless the dependency's own `cmake_minimum_required` is bumped, or the parent uses the cache-entry form.

## Contested / evolving

- **Whether CMAKE_POSITION_INDEPENDENT_CODE-vs-flag-delivered-PIC is "the same mechanism" or two mechanisms an agent must track separately.** `cmake-bazel-seam.md` (M5/M6) measured the flag-delivered channel under a wrap-style toolchain and found overwriting `CMAKE_C_FLAGS` — not the property — is what breaks PIC there. This dive measured the property-delivered channel directly and found it equally real and equally silent-if-missed (a hard link failure, not a silently wrong binary, but nothing before the link step indicates trouble). As of 2026-09-26 the honest statement is: **both channels matter, independently, and a rule set must cover both** — CMK-BZL-03 (flags) and CMK-TGT-12 (the property) rather than merging them into one row, because a project can get either one wrong without the other.
- **Whether `CMAKE_LINK_LIBRARIES_ONLY_TARGETS` is worth recommending broadly, given the migration cost measured in §4.** 3.23 is recent enough that most exemplars have not adopted it (not separately re-counted in this dive; the map's own coverage marks the row `uncovered`), and the diagnostic's inability to distinguish a typo from a legitimate bare name is a real ergonomic cost. Trending: worth a SHOULD for new, greenfield code (write bare-name-free from day one) rather than a retrofit MUST for existing trees — this dive's measurement supports SHOULD-with-migration-step, not a stronger claim.
- **Whether GCC's default-PIE behaviour on modern Linux distros (Fedora/RHEL-style, confirmed on this host) makes CMK-TGT-12 less urgent than it looks.** It does not, but it does make the failure *harder to catch in CI on some distros and easier on others*: a project that never triggers the exact codegen pattern this dive had to construct (§2) may go years without ever seeing the failure on Ubuntu/Fedora, then hit it immediately on Alpine/musl or a `-fno-pic`-default embedded toolchain. This is a portability trap, not a settled question, and worth flagging explicitly in any generated guidance rather than treating "it links on my machine" as proof.

## Sources

| URL or measurement | What it is | Date/era | Why worth reading |
|---|---|---|---|
| §1 measurement: `parent-normal-{312,325}` / `parent-cache-{312,325}` / `parent-normal-static`, `ocx package exec kitware/cmake:{3.31,4.4}` | Measurement | 3.31.12 and 4.4.2, 2026-09-26 | The CMP0077/BUILD_SHARED_LIBS silent-override surprise and its cache-entry fix |
| §2 measurement: `build-base`/`build-A`/`build-B`/`build-C`, same tool | Measurement | 3.31.12 and 4.4.2, 2026-09-26 | Baseline link failure and all three PIC-property channels, plus `readelf -r` before/after |
| §3 measurement: `build-before`/`build-after`, `/opt/zig/zig c++` wrapper | Measurement | 4.4.2, 2026-09-26 | ELF default-export behaviour and the visibility-hardening fix, `nm -D` evidence |
| §4 measurement: five `CMAKE_LINK_LIBRARIES_ONLY_TARGETS` probes | Measurement | 4.4.2, 2026-09-26 | Exact diagnostic text, phase and exit codes for typo/bare-name/abspath/imported-target |
| §5 measurement: `dirA`/`dirB_different_path`, `cmp` and `strings` | Measurement | 4.4.2, 2026-09-26 | `-ffile-prefix-map` via `target_compile_options` and via `CMAKE_C_FLAGS_INIT`, byte-identical outputs |
| §6 measurement: `append`/`overwrite` under a PIC-seeding toolchain | Measurement | 4.4.2, 2026-09-26 | Independent reconfirmation of CMK-TGT-04's severity split |
| [`Help/policy/CMP0077.rst@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0077.rst) | CMake policy reference, pinned tag | 4.4.2 | Exact OLD/NEW semantics that explain the §1 measurement |
| [`Help/prop_tgt/POSITION_INDEPENDENT_CODE.rst@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/prop_tgt/POSITION_INDEPENDENT_CODE.rst) | CMake target-property reference, pinned tag | 4.4.2 | The "initialized… if set when the target is created" ordering rule behind the §2 caveat |
| [`Help/prop_tgt/VISIBILITY_INLINES_HIDDEN.rst@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/prop_tgt/VISIBILITY_INLINES_HIDDEN.rst) | CMake target-property reference, pinned tag | 4.4.2 | Confirms the property's exact effect and its CMP0063 tie-in |
| [`Help/prop_tgt/WINDOWS_EXPORT_ALL_SYMBOLS.rst@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/prop_tgt/WINDOWS_EXPORT_ALL_SYMBOLS.rst) | CMake target-property reference, pinned tag | 4.4.2 | Windows/MS-toolchain-only scope, and its own documented data-symbol/vtable exceptions |
| [`Help/variable/CMAKE_LINK_LIBRARIES_ONLY_TARGETS.rst@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_LINK_LIBRARIES_ONLY_TARGETS.rst) | CMake variable reference, pinned tag | 4.4.2 | Confirms the 3.23 floor and the property it initializes |
| `cmake --help-variable CMAKE_DEBUG_PREFIX_MAP` on `kitware/cmake:4.4` | Measurement (CLI, not a fetch) | 4.4.2, 2026-09-26 | Confirms no such CMake-native variable exists |
| [rules_foreign_cc issue #421](https://github.com/bazel-contrib/rules_foreign_cc/issues/421) | GitHub issue, cited via `cmake-bazel-seam.md` | referenced 2026-09-26 | The flag-delivered-PIC companion story this dive's §2/§6 complement |
| [rules_foreign_cc PR #1440](https://github.com/bazel-contrib/rules_foreign_cc/pull/1440) | GitHub PR, cited via `cmake-bazel-seam.md` | referenced 2026-09-26 | "PIC arrives as a flag since 0.16.0" — the CMK-BZL-03 rationale this dive does not restate |
| `cmake-consumable-library.md` | Wave-2 consolidation, this program | 2026-09-26 | CMK-TGT-01..09 (not re-measured here) and the CMK-TGT-04 text this dive reconfirms |
| `cmake-bazel-seam.md` | Wave-2 consolidation, this program | 2026-09-26 | CMK-BZL-03/07 (flag-delivered PIC, cache-entry channel for library type) and measurements M5/M6 this dive's §2/§6 complement without restating |
| `cmake-consumable-library/install-round-trip-and-cps.md` §10 | Wave-2 dive, this program | 2026-09-26 | The confounded prior PIC measurement this dive's §2 replaces for the static-into-shared claim |
| `cmake-topic-map.md` (rows M-E-07/-08/-09/-15/-17, Conflict 3, Staged-for-wave-3 §1 brief) | Wave-1→3 adjudication, this program | 2026-09-26 | The brief and prior decisions this dive answers and does not re-litigate |


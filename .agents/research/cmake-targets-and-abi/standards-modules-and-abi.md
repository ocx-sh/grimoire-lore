---
title: "Language standard, C++20 modules and ABI consistency across a managed graph"
topic: cmake
agent: cmk-targets-and-abi-standards-modules
model: sonnet
kind: web
date_researched: 2026-09-26
sources_count: 20
scope: |
  Wave-3 web dive for the `targets-and-abi` group (family CMK-TGT). Covers where
  a project may set CMAKE_CXX_STANDARD/CMAKE_MSVC_RUNTIME_LIBRARY relative to a
  Conan or vcpkg toolchain, C++20 named-module opt-in and the CMP0155 scanning
  gate, CMAKE_BUILD_TYPE defaulting, and a sanitizer-options table. Does NOT
  re-derive the already-settled cppstd-vs-profile precedence (CMK-CONAN-10) or
  the vcpkg-runtime-mechanism fact (CMK-VCPKG-06); it cites and extends both.
  Windows link-time evidence is web/issue-tracker only — no Windows host exists
  in this program.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The two settled facts this dive builds on](#1-the-two-settled-facts-this-dive-builds-on)
   2. [Contradiction 6 resolved: the CXX_STANDARD guard, from the toolchain's own source](#2-contradiction-6-resolved-the-cxx_standard-guard-from-the-toolchains-own-source)
   3. [Contradiction 7 resolved: where CMAKE_MSVC_RUNTIME_LIBRARY must sit](#3-contradiction-7-resolved-where-cmake_msvc_runtime_library-must-sit)
   4. [C++20 named modules: the dated gate table](#4-c20-named-modules-the-dated-gate-table)
   5. [The surprise, measured: raising CXX_STANDARD to 20 turns on scanning for plain sources](#5-the-surprise-measured-raising-cxx_standard-to-20-turns-on-scanning-for-plain-sources)
   6. [CMAKE_BUILD_TYPE: default once, at the top, single-config only](#6-cmake_build_type-default-once-at-the-top-single-config-only)
   7. [Sanitizers: options, not flags, and three Windows-specific traps](#7-sanitizers-options-not-flags-and-three-windows-specific-traps)
   8. [Windows LNK2038 evidence for CMK-VCPKG-06 and CMK-CONAN-10](#8-windows-lnk2038-evidence-for-cmk-vcpkg-06-and-cmk-conan-10)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- A later `set(CMAKE_CXX_STANDARD N)` always wins over a Conan profile, and the
  only guard that reliably defers to the profile is `if(NOT DEFINED
  CMAKE_CXX_STANDARD)` — `PROJECT_IS_TOP_LEVEL` alone does **not** protect a
  top-level Conan consumer, because that is exactly the case where the
  override fires (Conan 2.32.0, verified from `conan/tools/cmake/toolchain/blocks.py`).
- `PROJECT_IS_TOP_LEVEL` cannot be read before `project()` at all (it is a
  variable `project()` itself sets, CMake ≥3.21), so any guard that must run
  before `project()` — as `cpp-best-practices/cmake_template` does — has no
  choice but `NOT DEFINED`.
- Conan's `CppStdBlock` installs a `variable_watch()` on `CMAKE_CXX_STANDARD`
  *after* its own `set()`, which is why a later override gets the "has been
  modified to" warning (CMK-CONAN-10); its `VSRuntimeBlock` sets
  `CMAKE_MSVC_RUNTIME_LIBRARY` with **no watch at all**, so an override there
  is always completely silent — never even a STATUS line.
- Because `VSRuntimeBlock` never warns, the only way a project avoids silently
  clobbering a Conan profile's `compiler.runtime` is a guarded
  `if(NOT DEFINED CMAKE_MSVC_RUNTIME_LIBRARY)` placed **after** `project()`
  (CMP0091 takes effect there) and before the first target is created — the
  same placement resolves the vcpkg side (CMK-VCPKG-06), because vcpkg's
  toolchain never sets the variable at all, so the guard's body always runs.
- Measured on CMake 4.4.2 with Ninja 1.13.2: a target with `CXX_STANDARD 20`
  and zero `import`/`export module` statements gets scanned anyway —
  `main.cpp.o` builds through `CXX_SCAN__app_` → a `.ddi` file → `CXX_DYNDEP__app_`
  → the real compile, instead of the one-step `CXX_COMPILER__app_unscanned_`
  rule a `CXX_STANDARD 17` target gets. `set(CMAKE_CXX_SCAN_FOR_MODULES 0)`
  removes every one of those extra Ninja build statements.
- `cpp-best-practices/cmake_template` (a flagship, actively used C++20
  starter) hits this exact trap and defends against it: `cmake_policy(SET
  CMP0155 OLD)` at the top of its `CMakeLists.txt`, with the comment "this is
  broken with clang-tidy at the moment" — a real, current instance of the
  brief's chase-the-surprise item.
- CMP0155 (3.28) is `NEW`-by-default only once the *effective* policy version
  reaches 3.28. This program's assumed floor is 3.25 (topic-map conflict 1),
  but its own convention is a two-dot range (`VERSION 3.25...<max>`), and the
  upper bound — not the floor — decides CMP0155 on any CMake ≥3.28. A project
  written to this program's own floor guidance gets scanning turned on the
  moment it is built with a current CMake, unless it opts out explicitly.
- C++20 named-module scanning needs MSVC 14.34+ (VS 17.4+), Clang 16.0+ or GCC
  14+ (`cmake-cxxmodules(7)` at v4.4.2); `import std` narrows that further to
  Clang 18.1.2+, MSVC 14.36+ (VS 17.6+) or GCC 15+, is Ninja-generator-only
  (Visual Studio generators cannot build BMIs for `IMPORTED` targets), and
  stays behind the `CMAKE_EXPERIMENTAL_CXX_IMPORT_STD` gate
  (`f35a9ac6-8463-4d38-8eec-5d6008153e7d` at 4.4.2, unchanged from the era
  re-check) in 4.4 — "the experiment is over" (Kitware, 2023) applies only to
  named modules themselves, not to `import std`.
- Both production module adopters in the corpus, fmt and nlohmann/json, ship
  the module target as a **separate, opt-in** target built with
  `target_compile_features(<t> PUBLIC cxx_std_20)` — never `CMAKE_CXX_STANDARD`
  — beside the classic build, matching CMK-TGT-05's existing rule.
- Ninja generators need ≥1.11 for module scanning at all
  (`cmake-cxxmodules(7)` "Generator Support"); the host's ninja is 1.13.2, so
  this program's own measurements are unaffected, but a rule that assumes
  Ninja must still state the floor.
- Five flagship libraries — abseil, curl, duckdb, glfw, ccache — set
  `CMAKE_MSVC_RUNTIME_LIBRARY` unconditionally, with no `NOT DEFINED` guard,
  on a line *after* their own `project()` call. Under Conan's `CMakeToolchain`
  this silently discards the profile's `compiler.runtime` — with zero
  diagnostic, because `VSRuntimeBlock` never watches the variable. Only
  yaml-cpp and googletest in the corpus guard it correctly.
- `CMAKE_BUILD_TYPE` defaulting is a two-part guard in every correct exemplar
  — `NOT CMAKE_BUILD_TYPE` **and** `NOT CMAKE_CONFIGURATION_TYPES` — and
  Apache Arrow's `cpp/CMakeLists.txt:104` is a real, current counter-example
  that carries only the first half.
- Sanitizer wiring in both `aminya/project_options` and
  `cpp-best-practices/cmake_template` is boolean `option()`s joined into one
  `-fsanitize=<list>` string on an `INTERFACE` target with
  `target_compile_options`/`target_link_options` — never a global
  `CMAKE_CXX_FLAGS` write, and MSVC only ever gets `/fsanitize=address`
  (every other sanitizer is a `message(WARNING ...)` no-op there).
- Two Windows sanitizer traps are directly tied to `CMAKE_MSVC_RUNTIME_LIBRARY`:
  clang's ASan crashes on any C++ `throw` against the **debug** CRT
  (`msvcp140d.dll` frees against the wrong heap), and the standalone UBSan
  runtime is built only for the **static** CRT, so pairing it with `/MD`
  fails to link — both documented as measured operational knowledge inside
  `project_options`, not as CMake or vendor documentation.
- No closed, current-era (Conan 2 / vcpkg manifest mode) issue tracker report
  ties an LNK2038 `RuntimeLibrary` mismatch to a *silent CMake-side*
  precedence bug the way CMK-CONAN-10 measured for `CMAKE_CXX_STANDARD`; every
  closed report found is user configuration error (wrong triplet, missing
  `-s compiler.runtime`) or a Conan `CMakeDeps` generator bug already fixed in
  1.51.3 — say this plainly rather than force a defect narrative.
- One open vcpkg issue (`microsoft/vcpkg#50271`, filed 2026, still open) is
  the textbook CMK-VCPKG-06 scenario verbatim: `x64-windows-static` plus a
  consuming project that never sets `CMAKE_MSVC_RUNTIME_LIBRARY`, producing
  `MTd_StaticDebug` vs `MDd_DynamicDebug`.
- C++20 modules earn more than a bare gate table: the opt-in-target rule
  (already CMK-TGT-05-adjacent), the CMP0155/`CXX_SCAN_FOR_MODULES` mitigation
  clause, and the generator/compiler/`import std` matrix are each
  independently checkable and belong in `targets.md`.

## Findings

### 1. The two settled facts this dive builds on

Per the revised brief, these are given, not re-derived:

- **CMK-CONAN-10** (measured, Conan 2.7.0+): loading `conan_toolchain.cmake`
  makes the profile own `CMAKE_CXX_STANDARD`, `CMAKE_CXX_EXTENSIONS` and
  `CMAKE_MSVC_RUNTIME_LIBRARY`. A later `set()` wins with only a STATUS
  "Warning:" line; `-DCMAKE_CXX_STANDARD` loses silently;
  `target_compile_features` raises the standard silently
  (`.agents/research/cmake-package-managers.md:110-119`).
- **CMK-VCPKG-06** (measured): vcpkg's consumer toolchain `vcpkg.cmake` never
  touches `CMAKE_MSVC_RUNTIME_LIBRARY` — 0 references in
  `microsoft__vcpkg@c4ee5a52d7:scripts/buildsystems/vcpkg.cmake` — so a static
  triplet (`*-windows-static`) needs the *consuming project* to set the
  variable itself, or link fails with LNK2038
  (`.agents/research/cmake-package-managers.md:166-169`).

This dive answers *why* those precedence facts hold (by reading Conan's
actual toolchain-generator source) and *where* a project's own `set()` must
sit so the two rules never collide on one line.

### 2. Contradiction 6 resolved: the CXX_STANDARD guard, from the toolchain's own source

`conan-io/conan@2.32.0:conan/tools/cmake/toolchain/blocks.py:318-349`
(`CppStdBlock.template`, fetched raw at tag `2.32.0`):

```cmake
function(conan_modify_std_watch variable access value current_list_file stack)
  set(conan_watched_std_variable "{{ cppstd }}")
  ...
  if ("${access}" STREQUAL "MODIFIED_ACCESS" AND NOT "${value}" STREQUAL "${conan_watched_std_variable}")
    message(STATUS "Warning: Standard ${variable} value defined in conan_toolchain.cmake to ${conan_watched_std_variable} has been modified to ${value} by ${current_list_file}")
  endif()
endfunction()

set(CMAKE_CXX_STANDARD {{ cppstd }})
set(CMAKE_CXX_EXTENSIONS {{ cppstd_extensions }})
set(CMAKE_CXX_STANDARD_REQUIRED ON)
variable_watch(CMAKE_CXX_STANDARD conan_modify_std_watch)
```

Two mechanical facts follow directly from this template, and they resolve the
map's Contradiction 6:

1. **The `set()` is unconditional — no `NOT DEFINED` guard on Conan's own
   side.** Conan's toolchain always writes its profile's `cppstd`, whatever a
   project set earlier (before `project()`, or in a parent scope). The
   `variable_watch()` is installed *immediately after* that `set()`, so it can
   only ever detect a change that happens **later** in execution order — a
   `set()` that runs before `project()` (before the toolchain is even loaded)
   is silently overwritten with no warning at all, and a `set()` that runs
   after `project()` triggers the STATUS line.
2. **`PROJECT_IS_TOP_LEVEL` does not exist until `project()` sets it**
   (`versionadded:: 3.21`, `Help/variable/PROJECT_IS_TOP_LEVEL.rst`). A guard
   that must run *before* `project()` — as
   `cpp-best-practices__cmake_template` does deliberately, so the standard is
   fixed before its own `project()` call — has no `PROJECT_IS_TOP_LEVEL` to
   read yet. `NOT DEFINED CMAKE_CXX_STANDARD` is the only form usable in both
   positions.

This also explains exactly why the map's Contradiction 6 is a real trap and
not a wording nitpick: a guard of `if(PROJECT_IS_TOP_LEVEL)` **alone**, with
no `NOT DEFINED` check, is wrong in precisely the case that matters most for
Conan — a top-level application project, which is the normal Conan-consumer
topology. There, `PROJECT_IS_TOP_LEVEL` is true, the guard's body runs *after*
`project()` (so after Conan's toolchain has already run and installed the
watch), and an unconditional `set(CMAKE_CXX_STANDARD 20)` inside that guard
is exactly the "later `set()` wins, with a warning" case CMK-CONAN-10 already
measured. `PROJECT_IS_TOP_LEVEL` correctly stops a *subproject* (added via
`add_subdirectory`/`FetchContent`) from overriding its parent, but it does
nothing to stop a top-level project from overriding its own package manager.

**Decided:** `CMK-TGT-05`'s guard clause is revised to require `NOT DEFINED
CMAKE_CXX_STANDARD` unconditionally; `PROJECT_IS_TOP_LEVEL` may be added as an
*extra* condition (`if(PROJECT_IS_TOP_LEVEL AND NOT DEFINED CMAKE_CXX_STANDARD)`)
to also skip a subproject whose parent left the variable undefined, but it
must never appear alone. See the amended rule text in
[Normative guidance candidates](#normative-guidance-candidates).

### 3. Contradiction 7 resolved: where CMAKE_MSVC_RUNTIME_LIBRARY must sit

`conan-io/conan@2.32.0:conan/tools/cmake/toolchain/blocks.py:60-76`
(`VSRuntimeBlock.template`, same fetch):

```cmake
cmake_policy(GET CMP0091 POLICY_CMP0091)
if(NOT "${POLICY_CMP0091}" STREQUAL NEW)
    message(FATAL_ERROR "The CMake policy CMP0091 must be NEW, but is '${POLICY_CMP0091}'")
endif()
message(STATUS "Conan toolchain: Setting CMAKE_MSVC_RUNTIME_LIBRARY={{ genexpr.str }}")
set(CMAKE_MSVC_RUNTIME_LIBRARY "{{ genexpr.str }}")
```

There is **no `variable_watch()` anywhere in `VSRuntimeBlock`** — CMK-CONAN-10
already noted this from behavioural testing ("a plain `set()` with no watch,
so an override is completely silent"); the source confirms there is
structurally no mechanism that ever could warn. Combined with
`Help/variable/CMAKE_MSVC_RUNTIME_LIBRARY.rst`'s note that the variable "has
effect only when policy CMP0091 is set to NEW prior to the first `project()`"
and that it is read when each target is *created* (not when `project()` runs),
the composition is:

- Both `conan_toolchain.cmake` (`VSRuntimeBlock`) and a project's own `set()`
  are read at the moment `add_library`/`add_executable` creates a target, not
  at `project()` time. Whichever `set()` executed **most recently in listfile
  order** before that target is created wins — with no diagnostic either way.
- Conan's `set()` runs during `project()`'s toolchain-file processing, i.e.
  before any line of the including `CMakeLists.txt` that comes textually
  after `project()`.
- A guard `if(NOT DEFINED CMAKE_MSVC_RUNTIME_LIBRARY)` placed **after
  `project()`** and before the first target therefore sees Conan's value
  already present and correctly skips — satisfying CMK-CONAN-10 ("profile
  owns it"). Under vcpkg, whose toolchain never sets the variable
  (CMK-VCPKG-06), the same guard's body always runs and supplies the
  project's own default — satisfying CMK-VCPKG-06's MUST that the *project*
  set it for a static-CRT triplet. Under neither manager, the guard's default
  applies plainly.
- Placed **before `project()`** the guard still "works" by coincidence for
  the successful case (Conan's later, unconditional `set()` simply
  overwrites the temporary default with no watch to complain), but it is
  fragile: a value from `-DCMAKE_MSVC_RUNTIME_LIBRARY=...` on the command
  line (a cache entry, defined from process start) would be seen as already
  `DEFINED` even before `project()`, silently skipping the guard *before*
  Conan's own toolchain gets a chance to run its `CMP0091 must be NEW` check
  against the project's real toolchain state — an ordering that has nothing
  to gain and one more variable to reason about.

**Decided:** the runtime-placement clause is `if(NOT DEFINED
CMAKE_MSVC_RUNTIME_LIBRARY) set(CMAKE_MSVC_RUNTIME_LIBRARY
"MultiThreaded$<$<CONFIG:Debug>:Debug>") endif()`, placed immediately after
`project()` (never before it) and before the first `add_library`/
`add_executable` call. This is exactly the shape `jbeder/yaml-cpp` already
ships (`jbeder__yaml-cpp@1e0876c671:CMakeLists.txt:54-56`, quoted in
[Exemplar evidence](#exemplar-evidence)). With this placement, CMK-VCPKG-06
and the runtime half of CMK-CONAN-10 never fire on the same line: exactly one
of "the guard's body ran" (vcpkg, or no manager) or "the guard's body did not
run because the value was already defined" (Conan) is true for any given
configure.

### 4. C++20 named modules: the dated gate table

From `Help/manual/cmake-cxxmodules.7.rst` at tag `v4.4.2`:

| Support | Requirement | Source |
|---|---|---|
| Named-module scanning at all | CMake ≥3.28 | manual header, `versionadded:: 3.28` |
| Compiler: MSVC | toolset 14.34+ (VS 17.4+) | "Compiler Support" |
| Compiler: Clang | 16.0+; `clang-cl` 19.1+ except under Visual Studio generators (4.4 addition) | "Compiler Support" |
| Compiler: GCC | 14+ | "Compiler Support" |
| Generator | Ninja, Ninja Multi-Config, Visual Studio 17 2022, Visual Studio 18 2026 | "Generator Support" |
| Ninja version floor | ≥1.11 | "Generator Support" |
| `import std` compiler/stdlib | Clang 18.1.2+ (libc++ or libstdc++), MSVC 14.36+ (VS 17.6+), GCC 15+ | "`import std` Support" |
| `import std` generator | **Ninja only** — Visual Studio generators cannot build BMIs for `IMPORTED` targets | "`import std` Support" |
| `import std` gate | `CMAKE_EXPERIMENTAL_CXX_IMPORT_STD`, UUID `f35a9ac6-8463-4d38-8eec-5d6008153e7d` | `Help/dev/experimental.rst:68-82` at v4.4.2 |
| Header units | Not supported, any generator | "Limitations" |

`import std` under the Ninja+GCC 15 combination has an extra platform trap:
"Ubuntu prior to 26.04 ships broken `libstdc++.modules.json` files"
(`cmake-cxxmodules.7.rst:96-101`, linking Ubuntu bug 2141579) — worth a note
for any CI matrix that pins an older Ubuntu runner image.

The `CXX_IMPORT_STD` UUID matches the era re-check's and the topic map's own
host reading (`era-recheck-2026-09-26.md`; `[host]` H1-H8 in
`cmake-topic-map.md`) — no rotation for this gate between wave 1 and today.
Kitware's own announcement, ["Import CMake: The Experiment is Over"](https://www.kitware.com/import-cmake-the-experiment-is-over/)
(2023, CMake 3.28), is specifically about *named modules* leaving experimental
status (`CMAKE_EXPERIMENTAL_CXX_MODULE_CMAKE_API` was removed); the post
itself says "there is still plenty of work to do, including but not limited
to support of `import std`" — an AI agent that cites this post as proof
`import std` is stable is wrong on both counts (named modules: correctly
stable since 3.28; `import std`: still gated in 4.4.2, three-and-a-half years
later).

### 5. The surprise, measured: raising CXX_STANDARD to 20 turns on scanning for plain sources

Measured on the host, CMake 4.4.2, Ninja 1.13.2, `/opt/zig/zig c++` as the
compiler (wrapper script at
`.agents/research/cmake-targets-and-abi/scratch/cmk-tgt-abi-wave3/zigxx.sh`),
Ninja generator, a single `main.cpp` with no `import`/`export module`
statement in either case
(`.agents/research/cmake-targets-and-abi/scratch/cmk-tgt-abi-wave3/`):

```sh
# proj/CMakeLists.txt.in, @STD@ substituted 17 then 20:
cmake_minimum_required(VERSION 3.28)
project(scanprobe CXX)
add_executable(app main.cpp)
set_target_properties(app PROPERTIES CXX_STANDARD @STD@ CXX_STANDARD_REQUIRED ON)
```

```sh
ocx package exec kitware/cmake:4.4 -- cmake -S proj -B build-$std -G Ninja \
  -DCMAKE_CXX_COMPILER=./zigxx.sh -DCMAKE_MAKE_PROGRAM=<ninja path> -Wno-dev
```

`CXX_STANDARD 17` produces one build statement for the object file:

```
build CMakeFiles/app.dir/main.cpp.o: CXX_COMPILER__app_unscanned_ .../main.cpp || cmake_object_order_depends_target_app
```

`CXX_STANDARD 20` produces four, none of which exist at 17:

```
build CMakeFiles/app.dir/main.cpp.o.ddi: CXX_SCAN__app_ .../main.cpp || cmake_object_order_depends_target_app
  DEP_FILE = CMakeFiles/app.dir/main.cpp.o.ddi.d
  DYNDEP_INTERMEDIATE_FILE = CMakeFiles/app.dir/main.cpp.o.ddi
  PREPROCESSED_OUTPUT_FILE = CMakeFiles/app.dir/main.cpp.o.ddi.i
build CMakeFiles/app.dir/main.cpp.o: CXX_COMPILER__app_scanned_ .../main.cpp | CMakeFiles/app.dir/main.cpp.o.modmap || cmake_object_order_depends_target_app CMakeFiles/app.dir/CXX.dd
  DYNDEP_MODULE_MAP_FILE = CMakeFiles/app.dir/main.cpp.o.modmap
  dyndep = CMakeFiles/app.dir/CXX.dd
build CMakeFiles/app.dir/CXX.dd | CMakeFiles/app.dir/CXXModules.json CMakeFiles/app.dir/main.cpp.o.modmap: CXX_DYNDEP__app_ CMakeFiles/app.dir/main.cpp.o.ddi | .../CXXDependInfo.json
```

Adding `set(CMAKE_CXX_SCAN_FOR_MODULES 0)` before `add_executable` at
`CXX_STANDARD 20` collapses this back to the single one-step
`CXX_COMPILER__app_unscanned_` rule (re-measured, same host and generator).
This is the exact mechanism `Help/manual/cmake-cxxmodules.7.rst`'s "Scanning
Without Modules" section names as the mitigation, and it matches the policy
text verbatim: CMP0155's `NEW` behaviour is "C++ 20 and newer files may
import modules if the compiler understands how to scan for their
dependencies, and need to be scanned" — the policy does not check whether any
source *actually* contains a module declaration.

**The flagship-template instance the brief asked to chase:**
`cpp-best-practices__cmake_template@b86318abbf:CMakeLists.txt:1-12` sets
`cmake_policy(SET CMP0155 OLD)` as its second line, immediately after
`cmake_minimum_required(VERSION 3.29)` and before its own
`if(NOT DEFINED CMAKE_CXX_STANDARD) set(CMAKE_CXX_STANDARD 23) endif()`, with
the comment `# Disable modules support, this is broken with clang-tidy at the
moment`. This is a real, currently-shipping C++ starter template raising its
standard to 23 and hitting exactly the scanning-overhead/tooling-friction
trap this dive measured, and defending against it at the policy level rather
than the `CXX_SCAN_FOR_MODULES` variable level (CMP0155 `OLD` is
process-wide; the variable is finer-grained and the manual's own
recommendation, but either clears the symptom).

**A compounding fact for this program's own floor:** conflict 1 in the topic
map decided rules are written for `cmake_minimum_required(VERSION
3.25...<max>)` — a *range*. A two-dot range sets policies to the upper
bound's behaviour on any CMake that supports that upper bound
(`cmake_minimum_required(VERSION)` semantics, unchanged through 4.4.2), so a
project following this program's own floor guidance and built with any
current CMake gets CMP0155 `NEW` (scanning on for C++20+) regardless of the
3.25 floor number, unless it pins the range's ceiling below 3.28 or opts out
explicitly. Any rule that recommends the range form for C++20-or-newer
targets should say this once, in the same breath as the standard-selection
rule.

### 6. CMAKE_BUILD_TYPE: default once, at the top, single-config only

`Help/variable/CMAKE_BUILD_TYPE.rst` and
`Help/variable/CMAKE_CONFIGURATION_TYPES.rst` at v4.4.2 confirm the split is
exactly what M-E-14 asked: `CMAKE_BUILD_TYPE` is for single-config generators
("e.g. Makefile Generators or Ninja"); `CMAKE_CONFIGURATION_TYPES` is its
multi-config counterpart ("e.g. Visual Studio, Xcode, or Ninja Multi-Config").
Setting the former on a multi-config generator has no build-type effect (the
generator ignores it) but does litter the cache with an unused entry, which
is the harmless-but-untidy failure mode a missing guard produces.

Every correct exemplar guards with the same two-part condition:

```cmake
if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)
  set(CMAKE_BUILD_TYPE RelWithDebInfo CACHE STRING "Choose the type of build.")
  set_property(CACHE CMAKE_BUILD_TYPE PROPERTY STRINGS "Debug" "Release" "MinSizeRel" "RelWithDebInfo")
endif()
```

(`aminya__project_options@412045e1f1:src/Common.cmake:23-26`;
`cpp-best-practices__cmake_template@b86318abbf:cmake/StandardProjectSettings.cmake:1-14`,
called only when `PROJECT_IS_TOP_LEVEL` — `CMakeLists.txt:73` guards the rest
of the file's top-level-only logic, and this call sits above that line inside
the same top-level `CMakeLists.txt`, never inside a library subdirectory.)

**The real counter-example:** `apache__arrow@3ad410b7b1:cpp/CMakeLists.txt:104-108`

```cmake
# if no build type is specified, default to release builds
if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release CACHE STRING "Choose the type of build.")
endif()
```

carries only the first half of the guard. `cpp/CMakeLists.txt` is arrow's own
top-level C++ project (so the top-level condition is moot for it), but the
missing `AND NOT CMAKE_CONFIGURATION_TYPES` means every arrow multi-config
build (Visual Studio, Xcode, Ninja Multi-Config) still writes a
`CMAKE_BUILD_TYPE=Release` cache entry that plays no role — harmless in
practice for arrow specifically, but exactly the pattern that IS harmful in a
library that a consumer might `add_subdirectory`, because that same
half-guarded `set(... CACHE ...)` is now a **global cache write** that
persists across reconfigures, visible even after the consumer moves off a
single-config generator.

**Decided:** the row is MUST-severity for the guard shape (`AND NOT
CMAKE_CONFIGURATION_TYPES` is not optional), SHOULD for gating it behind
`PROJECT_IS_TOP_LEVEL` (a library must never set it at all; a standalone
top-level project should).

### 7. Sanitizers: options, not flags, and three Windows-specific traps

Corpus [deps] measured 25/46 repos carrying `-fsanitize=`. Reading the two
named exemplars in full (`aminya/project_options` `src/Sanitizers.cmake`,
`cpp-best-practices/cmake_template` `cmake/Sanitizers.cmake`) shows one shared
shape and Windows-only complications neither the CMake manual nor Conan/vcpkg
documentation states — this is measured operational knowledge baked into two
maintained CMake modules, cited as such:

- Both build a `SANITIZERS` list from boolean `option()`s (`ENABLE_SANITIZER_ADDRESS`,
  `_LEAK`, `_UNDEFINED_BEHAVIOR`, `_THREAD`, `_MEMORY`), join it with a comma, and apply
  it as `target_compile_options(<t> INTERFACE -fsanitize=<list>)` +
  `target_link_options(<t> INTERFACE -fsanitize=<list>)` on a dedicated
  `INTERFACE` options target — never a global `CMAKE_CXX_FLAGS` write (CMK-TGT-04
  already forbids that generally; this is its sanitizer instance).
- On MSVC, only `/fsanitize=address` is ever emitted; every other sanitizer
  choice on MSVC is a `message(WARNING "MSVC only supports address sanitizer")`
  no-op (`cpp-best-practices__cmake_template@b86318abbf:cmake/Sanitizers.cmake:56-60`).
- **Trap 1 — clang ASan crashes on `throw` against the debug CRT on Windows.**
  `aminya__project_options@412045e1f1:src/Sanitizers.cmake:735-751`: clang's
  ASan interceptors "do not own the debug heap", so `msvcp140d.dll` freeing
  through it at teardown aborts the process — "down to a hello-world using
  `std::string`" — with "attempting free on address which was not
  malloc()-ed". The module checks `CMAKE_MSVC_RUNTIME_LIBRARY` (via
  `check_msvc_debug_runtime`) and refuses to enable clang sanitizers on
  Windows when the runtime resolves to a debug CRT, printing "Build a
  non-Debug configuration, or set CMAKE_MSVC_RUNTIME_LIBRARY to a non-debug
  runtime" instead of silently shipping a binary that cannot run.
- **Trap 2 — the standalone UBSan runtime is static-CRT-only.**
  `src/Sanitizers.cmake:169-186`: "the standalone UBSan runtime is only
  shipped for the static CRT, so on its own it cannot be linked into a `/MD`
  build", quoting the exact LNK-style failure
  (`lld-link: error: /failifmismatch: mismatch detected for 'RuntimeLibrary'`).
  The module's fix: pair UBSan with ASan (which supplies the runtime that
  does link against `/MD`), or set `CMAKE_MSVC_RUNTIME_LIBRARY` to a static
  runtime — the same variable CMK-VCPKG-06 and this dive's runtime-placement
  clause govern.
- **Trap 3 — MSVC STL container annotations disagree with prebuilt
  dependencies.** Enabling `__SANITIZE_ADDRESS__` turns on MSVC STL container
  annotations that stamp `#pragma detect_mismatch(...)` markers; a
  vcpkg/Conan/system-SDK prebuilt dependency compiled without ASan carries
  the opposite marker, and linking fails with `mismatch detected for
  'annotate_string'`/`'annotate_vector'` — the same LNK2038-family mechanism
  as the runtime-library mismatch, one layer up the ABI stack.

**Decided:** sanitizers get a table row in `targets.md` (SHOULD: use an
options-target pattern, never raw flags in a library) plus a **presets
note**, not a MUST and not a depth file — CI selects the sanitizer
combination per leg via cache variables in a preset (`M-J-*` already owns
presets-as-CI-reproduction as SHOULD), and the three Windows traps above are
reading-heuristic content (documented, not independently checkable by a
grep) that belongs beside CMK-TGT's runtime-placement rule as a cross-reference,
because all three traps resolve through the same variable that rule governs.

### 8. Windows LNK2038 evidence for CMK-VCPKG-06 and CMK-CONAN-10

The brief asks for 2-4 closed issues; the honest result is 4 closed plus one
still-open report, spanning old Conan-1-era bugs (kept for mechanism context)
through a Conan-2-era generator bug and a live, current-era vcpkg case that
matches CMK-VCPKG-06 exactly. **None of the closed issues is a CMake-side
precedence defect** — every resolution is either user configuration error or
a Conan generator bug already fixed upstream — so this dataset does not, and
cannot, add a new MUST; it corroborates the two already-shipped rules and
supplies the citable trail the brief asked for.

| Issue | State | Root cause | Resolution |
|---|---|---|---|
| [microsoft/vcpkg#50271](https://github.com/microsoft/vcpkg/issues/50271) | **Open** | `x64-windows-static` triplet (static CRT) consumed by a project that never sets `CMAKE_MSVC_RUNTIME_LIBRARY`; `DirectXTex.lib` built `MTd_StaticDebug`, the consumer's own objects default to `MDd_DynamicDebug` | Unresolved as of 2026-09-26 — the exact CMK-VCPKG-06 scenario, verbatim |
| [microsoft/vcpkg#47402](https://github.com/microsoft/vcpkg/issues/47402) | Closed | Reporter used `x86-windows-static` (static CRT by design) and expected dynamic-CRT linking | "Well, you told vcpkg to build with /MT and it did. Use `x86-windows-static-md`." — user error, not a defect |
| [conan-io/conan#11884](https://github.com/conan-io/conan/issues/11884) | Closed | `CMakeDeps` (Conan ≥1.51.0) generated Release-config files that pointed at debug libraries when both configs were installed | Fixed as part of [conan-io/conan#11852](https://github.com/conan-io/conan/issues/11852), shipped 1.51.3 |
| [conan-io/conan#2147](https://github.com/conan-io/conan/issues/2147) | Closed (Conan 1, `cmake`/`cmake_multi` generators, pre-`CMakeToolchain`) | The legacy single-config `cmake` generator produced a VS solution where both configs got `/MD` under `conan create`, mismatching an `/MDd` executable | Workaround: `cmake_multi` generator; the underlying generator itself is long superseded by `CMakeToolchain`/`CMakeDeps` |
| [conan-io/conan#1341](https://github.com/conan-io/conan/issues/1341) | Closed (Conan 1, 2017) | Reporter built the Debug VS configuration without telling Conan to install a Debug package (`-s compiler.runtime=MDd` never passed) | "You need `-s compiler.runtime=MDd` for the debug creation" |

The one open case is worth citing on its own merits: it demonstrates the
defect is not hypothetical — real users hit `CMK-VCPKG-06`'s exact failure
mode on a real, currently-maintained port (`DirectXTex`) with the current
vcpkg CLI, and as of this dive's date it has no fix beyond "the consuming
project must set `CMAKE_MSVC_RUNTIME_LIBRARY` itself", which is precisely
what the rule already says.

## Normative guidance candidates

Numbered provisionally in the `CMK-TGT` family, continuing from the highest
ID in `cmake-consumable-library.md` (`CMK-TGT-09`). **The sibling wave-3 dive
`shared-static-visibility-pic` (family `CMK-TGT`, kind `measure`) mints IDs
from the same pool and has not landed as this dive was written — a
consolidation pass must renumber/deduplicate both sets before either ships.**

**CMK-TGT-05 (revision — guard wording).** State an installable library's
minimum language standard as `target_compile_features(<t> PUBLIC
cxx_std_NN)`. Where `CMAKE_CXX_STANDARD` must be set at all (a top-level
project, a preset, a manager profile), guard it with `if(NOT DEFINED
CMAKE_CXX_STANDARD)`. `PROJECT_IS_TOP_LEVEL` may be added as an *additional*
condition but never replaces the `NOT DEFINED` check, because a top-level
project is exactly the topology in which a package-manager toolchain (Conan)
has already set the variable and needs it left alone.
- Rationale: measured from `conan-io/conan@2.32.0`'s `CppStdBlock` — its
  `set()` is unconditional and its `variable_watch()` only fires on writes
  *after* itself, so an unguarded or `PROJECT_IS_TOP_LEVEL`-only `set()`
  placed after `project()` overrides the profile with only a STATUS line, and
  `PROJECT_IS_TOP_LEVEL` cannot even be evaluated before `project()`.
- Verify: `grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'CMAKE_CXX_STANDARD' .`
  A hit not immediately preceded (within the same `if()`) by a `NOT DEFINED
  CMAKE_CXX_STANDARD` test, and outside a top-level project's own default
  block, is the finding. Empty = pass.
- Severity: MUST. Floor: any (mechanism is CMake-version-independent; the
  Conan behaviour is Conan ≥2.7.0 per CMK-CONAN-10).

**CMK-TGT-10 (new). Guard `CMAKE_MSVC_RUNTIME_LIBRARY` with `if(NOT DEFINED
CMAKE_MSVC_RUNTIME_LIBRARY)`, placed after `project()` and before the first
`add_library`/`add_executable`. Never set it unconditionally, and never
before `project()`.**
- Rationale: `VSRuntimeBlock` in `conan-io/conan@2.32.0` sets the variable
  with no `variable_watch()` at all — an override here is *always* silent, so
  the guard is the only defense. Placed after `project()`, the guard
  correctly detects a Conan-set value (skip) or a vcpkg-toolchain's absence
  of one (fire, satisfying CMK-VCPKG-06). Placed before `project()` it cannot
  see either.
- Verify: `grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'set(CMAKE_MSVC_RUNTIME_LIBRARY' .`
  For each hit, confirm (a) it is textually after the file's first
  `project(` line and (b) it sits inside an `if(NOT DEFINED
  CMAKE_MSVC_RUNTIME_LIBRARY)` block. A hit failing either check is the
  finding. Empty = pass. (No Windows host: the variable's *effect* is
  documentation-grounded, not measured; its *precedence* is measured from
  Conan's own source, which is host-independent.)
- Severity: MUST. Binds APP, LIB. Floor: CMake 3.15 (CMP0091); the guard
  itself works on any floor.

**CMK-TGT-11 (new). Default `CMAKE_BUILD_TYPE` with the two-part guard
`if(NOT CMAKE_BUILD_TYPE AND NOT CMAKE_CONFIGURATION_TYPES)`, only inside a
`PROJECT_IS_TOP_LEVEL` (or equivalent) block. Never the single-condition
form.**
- Rationale: `CMAKE_BUILD_TYPE` and `CMAKE_CONFIGURATION_TYPES` are
  documented as mutually exclusive by generator kind
  (`Help/variable/CMAKE_BUILD_TYPE.rst`, `CMAKE_CONFIGURATION_TYPES.rst` at
  v4.4.2); the single-condition form writes a dead cache entry on every
  multi-config generator and, inside a library, a cache write a consumer did
  not ask for.
- Verify: `grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'set(CMAKE_BUILD_TYPE' .`
  A hit not paired with `CMAKE_CONFIGURATION_TYPES` in the same `if()`
  condition is the finding; a hit outside a top-level guard in a library's
  own CMakeLists is a second, independent finding. Empty = pass.
- Severity: MUST (guard shape); SHOULD (top-level gating). Floor: any.

**CMK-TGT-12 (new). A C++20 named-module target is a separate, opt-in target
using `target_compile_features(<t> PUBLIC cxx_std_20)` (never
`CMAKE_CXX_STANDARD`), gated to the generator/compiler matrix in
[Findings §4](#4-c20-named-modules-the-dated-gate-table), and any project that
raises its standard to 20+ for reasons unrelated to modules sets
`CMAKE_CXX_SCAN_FOR_MODULES 0` (non-cache, near the top of the top-level
`CMakeLists.txt`) or pins `cmake_policy(SET CMP0155 OLD)` to avoid unwanted
scanning overhead.**
- Rationale: measured — a `CXX_STANDARD 20` target with zero module sources
  is scanned by default on CMake ≥3.28 (CMP0155 `NEW`), adding a `.ddi`
  scan step, a preprocessed-output file and a `CXX_DYNDEP` step to every
  affected object; `cmake-cxxmodules(7)` names the mitigation, and
  `cpp-best-practices/cmake_template` ships it in production.
- Verify (opt-in target shape): `grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'FILE_SET.*CXX_MODULES' .`
  then confirm the same target's standard comes from `target_compile_features`,
  not `CMAKE_CXX_STANDARD` (reading heuristic). Verify (scanning mitigation,
  measured shape, reproducible from
  `.agents/research/cmake-targets-and-abi/scratch/cmk-tgt-abi-wave3/`): configure
  with `-G Ninja`, `grep -c -e 'CXX_SCAN__' -e 'CXX_DYNDEP__' build/build.ninja`
  — non-zero on a project with no module sources and no `CMAKE_CXX_SCAN_FOR_MODULES`/
  `CMP0155 OLD` opt-out is the finding.
- Severity: SHOULD (opt-in-target shape is a P2 pattern per the map, 2/46
  adopters); the scanning-mitigation clause is MUST once a non-module project
  intentionally raises its standard to 20+, because the alternative is a
  silent build-graph and build-time cost regression with no functional
  benefit.
- Floor: CMake 3.28 (CMP0155, `FILE_SET CXX_MODULES`, `CXX_SCAN_FOR_MODULES`);
  gate `import std` behind `CMAKE_EXPERIMENTAL_CXX_IMPORT_STD` and Ninja-only,
  per the table in Findings §4.

**CMK-TGT-13 (new). Wire sanitizers as boolean `option()`s joined into one
`target_compile_options`/`target_link_options` `INTERFACE` call on a
dedicated options target — never a literal `-fsanitize=` in
`CMAKE_CXX_FLAGS` or a per-source `target_compile_options` scattered across
the tree.**
- Rationale: both maintained sanitizer modules in the corpus use this shape;
  it is the only one that composes cleanly with the rest of a project's
  usage-requirement graph and lets a consumer opt out target-by-target.
- Verify: `grep -rn --include='CMakeLists.txt' --include='*.cmake' -e '\-fsanitize=' .`
  A hit inside `set(CMAKE_CXX_FLAGS` / `string(APPEND CMAKE_CXX_FLAGS` (already
  CMK-TGT-04's finding shape) is a compounding finding here. A hit inside a
  `target_compile_options(... INTERFACE ...)` on a dedicated options target
  is not a finding.
- Severity: SHOULD. Floor: any. **Presets note:** which sanitizer
  combination runs on which CI leg belongs in a preset's `cacheVariables`
  (per the CMK-CI presets-as-reproduction SHOULD), not hard-coded in
  `CMakeLists.txt` — no independent MUST/SHOULD row for this; it is the
  general presets guidance applied to one more set of cache variables.

## Exemplar evidence

| Candidate | Satisfies | Violates |
|---|---|---|
| CMK-TGT-05 (guard) | `cpp-best-practices__cmake_template@b86318abbf:CMakeLists.txt:10-12` (`NOT DEFINED`, used because it must run before `project()`) | none found using `PROJECT_IS_TOP_LEVEL` alone for this specific variable in the corpus — the trap is latent, not yet observed in the wild here |
| CMK-TGT-10 (runtime placement) | `jbeder__yaml-cpp@1e0876c671:CMakeLists.txt:54-56`: `if (NOT DEFINED CMAKE_MSVC_RUNTIME_LIBRARY) set(CMAKE_MSVC_RUNTIME_LIBRARY MultiThreaded$<$<CONFIG:Debug>:Debug>$<${msvc-shared_rt}:DLL>) endif()`, after `project()` (line 3), before `add_library(yaml-cpp ...)`; `google__googletest@4267679b68:googletest/cmake/internal_utils.cmake:74-76` guards the same way | `abseil__abseil-cpp@61d073d671:CMakeLists.txt:65,67` (after `project()` at line 26, unconditional `if/else` `set()`, no `NOT DEFINED`); `curl__curl@98519dac83:CMakeLists.txt:383`; `duckdb__duckdb@d8a1bd4f4f:CMakeLists.txt:96`; `glfw__glfw@92dcf4ce74:CMakeLists.txt:71`; `ccache__ccache@b471bbde29:cmake/StaticLinkSupport.cmake:21` (included from `CMakeLists.txt:61`, after `project()` at line 3) |
| CMK-TGT-11 (`CMAKE_BUILD_TYPE` guard) | `aminya__project_options@412045e1f1:src/Common.cmake:23-26`; `boostorg__boost@a61cfa03ba:CMakeLists.txt:8-11` (its own hand-rolled `CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR` top-level check, before `project()`, paired with the full two-part guard); `cpp-best-practices__cmake_template@b86318abbf:cmake/StandardProjectSettings.cmake:1-14` | `apache__arrow@3ad410b7b1:cpp/CMakeLists.txt:104-108` (missing `AND NOT CMAKE_CONFIGURATION_TYPES`) |
| CMK-TGT-12 (opt-in module target) | `fmtlib__fmt@522e2c12ab:CMakeLists.txt:340-366` (`add_module_library`, `target_compile_features(${name} PUBLIC cxx_std_20)`, `FILE_SET fmt TYPE CXX_MODULES`); `nlohmann__json@f422b753cc:src/modules/CMakeLists.txt` (separate `nlohmann_json_modules` target, same `target_compile_features` pattern) | none in the corpus ships modules as anything other than opt-in |
| CMK-TGT-12 (scanning mitigation) | `cpp-best-practices__cmake_template@b86318abbf:CMakeLists.txt:1-4` (`cmake_policy(SET CMP0155 OLD)`) | every other C++20-or-newer project in the corpus that neither sets the policy nor `CMAKE_CXX_SCAN_FOR_MODULES` is a latent finding once built with CMake ≥3.28 — not independently re-surveyed this dive; flagged for the `usage-requirements-in-the-wild` consolidation to re-run its existing `CMAKE_CXX_STANDARD` count against this new predicate |
| CMK-TGT-13 (sanitizer options) | `aminya__project_options@412045e1f1:src/Sanitizers.cmake` (full module); `cpp-best-practices__cmake_template@b86318abbf:cmake/Sanitizers.cmake` | none found using a raw global flag in the two named exemplars; general `-Werror`/flag-hygiene violators are already CMK-TGT-04/09's, not re-counted here |

`find_ocx` stands outside every row here: `LANGUAGES NONE`, no C++ target, no
standard, no runtime library, no sanitizer — every row above is vacuous for
it, consistent with `cmake-consumable-library.md`'s own "Applied to find_ocx"
table.

## AI-agent angle

1. **Citing "Import CMake: The Experiment Is Over" as proof `import std` is
   stable.** The post is about *named modules* (3.28); `import std` is a
   separate, still-experimental gate in 4.4.2
   (`CMAKE_EXPERIMENTAL_CXX_IMPORT_STD`). *Check:* `grep -rn
   CMAKE_EXPERIMENTAL_CXX_IMPORT_STD` in generated or authored config — its
   presence at all should not be treated as "using a stable feature" without
   the gate.
2. **Writing `if(PROJECT_IS_TOP_LEVEL) set(CMAKE_CXX_STANDARD NN) endif()`
   and calling it Conan-safe.** It is the topology where the override
   *actually happens*. *Check:* pair every `PROJECT_IS_TOP_LEVEL` guard
   around `CMAKE_CXX_STANDARD` or `CMAKE_MSVC_RUNTIME_LIBRARY` with a `NOT
   DEFINED` test in the same condition; a solo `PROJECT_IS_TOP_LEVEL` is the
   finding.
3. **Assuming a silent `CMAKE_MSVC_RUNTIME_LIBRARY` override prints something
   like the `CMAKE_CXX_STANDARD` warning.** It never does — `VSRuntimeBlock`
   has no `variable_watch()`. An agent debugging an LNK2038 by grepping the
   configure log for "Warning" will find nothing and may conclude the runtime
   setting was never touched. *Check:* read the *generated*
   `conan_toolchain.cmake` itself (`grep -n CMAKE_MSVC_RUNTIME_LIBRARY
   conan_toolchain.cmake`) rather than trusting configure-log silence.
4. **Treating `CMAKE_CXX_STANDARD_EXTENSIONS` as a real variable** (already
   flagged in `cmake-consumable-library.md`'s AI-agent list; recurring here
   because a model asked to "harden" a C++20/23 target commonly invents it
   alongside the standard bump). *Check:* `cmake --help-variable
   CMAKE_CXX_STANDARD_EXTENSIONS` must fail; the real name is
   `CMAKE_CXX_EXTENSIONS`.
5. **Recommending `-fsanitize=` in `CMAKE_CXX_FLAGS`/`add_compile_options`
   globally**, the answer that dominates search results and pre-2023
   tutorials, instead of the options-target-plus-`option()` shape both
   maintained sanitizer modules in this corpus use. *Check:* CMK-TGT-13's
   grep; a hit outside an `INTERFACE` options target is the finding.
6. **Recommending clang's ASan/UBSan on Windows without checking the CRT.**
   Training data mostly reflects Linux/macOS sanitizer usage, where the CRT
   distinction does not exist; an agent porting a sanitizer CI job to a
   Windows runner verbatim will hit the debug-CRT ASan crash or the
   static-CRT-only UBSan link failure with no CMake-level error message
   pointing at the cause. *Check:* before enabling clang sanitizers on
   Windows, confirm `CMAKE_MSVC_RUNTIME_LIBRARY` is a non-debug, and — for
   standalone UBSan — a static, runtime (Findings §7, traps 1-2).
7. **Bumping `CXX_STANDARD` to 20+ "for `if constexpr`/concepts/whatever" and
   not noticing the build got slower or gained new Ninja rules.** A model
   asked to modernize a target's standard has no reason to expect a
   side-effect on the build graph; nothing about `set(CXX_STANDARD 20)` reads
   as module-related. *Check:* CMK-TGT-12's `grep -c -e 'CXX_SCAN__' -e
   'CXX_DYNDEP__' build.ninja` after any standard bump to 20+ on a Ninja
   generator, on a project with no module sources — non-zero means the bump
   silently turned on scanning.

## Contested / evolving

- **Whether the `CMAKE_MSVC_RUNTIME_LIBRARY` genex gap (cmake-conan#174) will
  ever be fixed upstream.** Open since 2019-09-04, no comments proposing a
  concrete fix in the visible thread; the practical answer for this program's
  guidance is the guarded-`set()` pattern in CMK-TGT-10, which sidesteps the
  gap rather than closing it (Conan's own generator never needs to *evaluate*
  a generator expression at configure time — it just always writes the
  literal `$<$<CONFIG:Debug>:Debug>` string, and the "gap" the issue names is
  about `conan.cmake`-style tools that try to *read back* the value, not
  about `CMakeToolchain`'s own generation).
- **CMP0155's cost as C++ toolchains modernize.** Today it is close to a pure
  tax for the ~98% of the corpus not using modules (measured: extra scan
  step, extra file, no functional benefit) — but as `import std` and named
  modules mature past their experimental gates, the scanning infrastructure
  CMP0155 turns on is exactly what a future module-using codebase needs
  already warmed up. This program's guidance (opt out explicitly today) is
  correct for the current corpus and will need revisiting once module
  adoption in this ecosystem moves past 2/46.
- **Sanitizer-under-Bazel and sanitizer-under-CMake staying two separate
  stories.** `bazel-quality/cpp.md`'s `BZL-CC` rows own sanitizers under
  Bazel; nothing here claims the two option surfaces (`ENABLE_SANITIZER_*`
  boolean options here vs. Bazel `--features`/config settings there) need
  reconciling for a dual CMake+Bazel project, and the dual-build dive
  (`cmake-bazel-seam.md`) does not name sanitizer-flag drift as a measured
  gap — an open question for a future wave, not this one.

## Sources

| URL or measurement | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [Help/manual/cmake-cxxmodules.7.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-cxxmodules.7.rst) | Primary/normative | CMake 4.4.2, fetched 2026-09-26 | Full generator/compiler/`import std` support matrix, scanning-control order, "Scanning Without Modules" mitigation |
| [Help/policy/CMP0155.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0155.rst) | Primary/normative | CMake 4.4.2 | Exact OLD/NEW behaviour text; confirms it "does not warn" either way |
| [Help/prop_tgt/CXX_SCAN_FOR_MODULES.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/prop_tgt/CXX_SCAN_FOR_MODULES.rst) | Primary/normative | CMake 4.4.2 | Per-target/source/file-set override order for the scanning decision |
| [Help/dev/experimental.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/dev/experimental.rst) | Primary/normative | CMake 4.4.2 | `CXX_IMPORT_STD` gate variable and UUID, cross-checked against the era re-check's host reading |
| [Help/variable/CMAKE_MSVC_RUNTIME_LIBRARY.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_MSVC_RUNTIME_LIBRARY.rst) | Primary/normative | CMake 4.4.2 | "Initializes the property... as targets are created" — the fact the whole placement argument rests on |
| [Help/policy/CMP0091.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0091.rst) | Primary/normative | CMake 4.4.2 | CMP0091 NEW-by-default floor (3.15) and its "takes effect as of the first `project()`" scope |
| [Help/variable/CMAKE_BUILD_TYPE.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_BUILD_TYPE.rst) | Primary/normative | CMake 4.4.2 | Single-config scope, confirms the split with `CMAKE_CONFIGURATION_TYPES` |
| [Help/variable/CMAKE_CONFIGURATION_TYPES.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_CONFIGURATION_TYPES.rst) | Primary/normative | CMake 4.4.2 | Multi-config counterpart |
| `conan-io/conan@2.32.0:conan/tools/cmake/toolchain/blocks.py` (raw GitHub tag fetch) | Primary/source | Conan 2.32.0, tag fetched 2026-09-26 | `CppStdBlock`/`VSRuntimeBlock` Jinja templates — the actual mechanism behind CMK-CONAN-10, read directly rather than inferred |
| Measurement: CXX_STANDARD 17 vs 20, Ninja build-graph diff | Primary/measured | CMake 4.4.2, Ninja 1.13.2, host 2026-09-26 | Proves the scanning surprise mechanically; scratch at `.agents/research/cmake-targets-and-abi/scratch/cmk-tgt-abi-wave3/` |
| Measurement: `CMAKE_CXX_SCAN_FOR_MODULES 0` at `CXX_STANDARD 20` | Primary/measured | Same host/run | Confirms the manual's stated mitigation actually removes the scan rules |
| [kitware.com/import-cmake-the-experiment-is-over](https://www.kitware.com/import-cmake-the-experiment-is-over/) | Argued/vendor blog | 2023, CMake 3.28 | Scope of "the experiment is over" — named modules only, explicitly not `import std` |
| [github.com/conan-io/cmake-conan/issues/174](https://github.com/conan-io/cmake-conan/issues/174) | Codified/issue tracker | Opened 2019-09-04, still open | The MSVC-runtime generator-expression gap the brief named |
| [github.com/microsoft/vcpkg/issues/50271](https://github.com/microsoft/vcpkg/issues/50271) | Argued/issue tracker | Open, 2026 | Live, current-era CMK-VCPKG-06 failure instance |
| [github.com/microsoft/vcpkg/issues/47402](https://github.com/microsoft/vcpkg/issues/47402) | Argued/issue tracker | Closed 2025-09-22 | Triplet-choice user error, contrast case |
| [github.com/conan-io/conan/issues/11884](https://github.com/conan-io/conan/issues/11884) | Argued/issue tracker | Closed, Conan 1.51.x, 2022 | Modern (`CMakeDeps`)-era generator bug, fixed upstream — not a CMake precedence defect |
| [github.com/conan-io/conan/issues/2147](https://github.com/conan-io/conan/issues/2147), [#1341](https://github.com/conan-io/conan/issues/1341) | Argued/issue tracker | Closed, Conan 1, 2017-18 | Pre-`CMakeToolchain` mechanism context for why the modern watch/placement design exists |
| `.agents/research/cmake-package-managers.md:80-198` | Codified (this program) | 2026-09-26 | CMK-CONAN-10, CMK-CONAN-11, CMK-VCPKG-06 as already shipped — the two settled facts this dive builds on |
| `.agents/research/cmake-consumable-library.md:504-546` | Codified (this program) | 2026-09-26 | CMK-TGT-05/06/07 as already shipped, the rule this dive amends |
| Exemplar corpus reads: `fmtlib__fmt@522e2c12ab`, `nlohmann__json@f422b753cc`, `aminya__project_options@412045e1f1`, `cpp-best-practices__cmake_template@b86318abbf`, `jbeder__yaml-cpp@1e0876c671`, `google__googletest@4267679b68`, `abseil__abseil-cpp@61d073d671`, `curl__curl@98519dac83`, `duckdb__duckdb@d8a1bd4f4f`, `glfw__glfw@92dcf4ce74`, `ccache__ccache@b471bbde29`, `apache__arrow@3ad410b7b1`, `boostorg__boost@a61cfa03ba` | Primary/exemplar | 2026-09-26 SHAs, corpus at `/home/mherwig/.cache/research-lang/exemplars/cmake` | Module-target shape, runtime-guard shape, build-type-guard shape, sanitizer modules — all `repo@sha:path:line` cited inline above |

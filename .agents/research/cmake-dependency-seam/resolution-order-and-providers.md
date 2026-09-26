---
title: Who wins a dependency — find_package, FetchContent, providers, resolution order
topic: The dependency seam — find_package, FetchContent, dependency providers, CMAKE_POLICY_VERSION_MINIMUM scope, CMP0077
agent: cmake-dependency-seam/resolution-order-and-providers
model: sonnet
kind: measure
date_researched: 2026-09-26
sources_count: 15
scope: |
  Measures, on real cmake 3.31.12, 4.3.4 and 4.4.2 binaries, which mechanism wins when several
  can supply one dependency name: FetchContent keyword interactions (FIND_PACKAGE_ARGS,
  OVERRIDE_FIND_PACKAGE, FETCHCONTENT_TRY_FIND_PACKAGE_MODE, FETCHCONTENT_SOURCE_DIR_<X>),
  find_package hint precedence and cache stickiness (<pkg>_ROOT, CMP0144, CMAKE_PREFIX_PATH,
  variable vs environment), dependency-provider registration and blind spots, silent
  post-project() variable writes, CMAKE_POLICY_VERSION_MINIMUM's real scope against the
  CMake-4.0 floor-removal error, the CMP0077 option()-vs-normal-variable trap in a fetched
  dependency, and PROJECT_IS_TOP_LEVEL test-subtree gating. Out of scope: CPS import/export
  mechanics (owned by cps-spec-and-cmake-implementation.md / cps-verification.md), Conan/vcpkg
  provider or toolchain internals, and the Bazel side of the seam (BZL-CC).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [FetchContent vs find_package: the six-way resolution order](#1-fetchcontent-vs-find_package-the-six-way-resolution-order)
   2. [Location-hint precedence and cache stickiness](#2-location-hint-precedence-and-cache-stickiness)
   3. [Dependency providers: registration, silent replacement, and blind spots](#3-dependency-providers-registration-silent-replacement-and-blind-spots)
   4. [CMAKE_PROJECT_TOP_LEVEL_INCLUDES and post-project() writes](#4-cmake_project_top_level_includes-and-post-project-writes)
   5. [CMAKE_POLICY_VERSION_MINIMUM: the 4.0 floor-removal escape hatch and its real scope](#5-cmake_policy_version_minimum-the-40-floor-removal-escape-hatch-and-its-real-scope)
   6. [CMP0077: a fetched dependency's option() silently discarding the parent's variable](#6-cmp0077-a-fetched-dependencys-option-silently-discarding-the-parents-variable)
   7. [PROJECT_IS_TOP_LEVEL test-subtree gating, measured with ctest -N](#7-project_is_top_level-test-subtree-gating-measured-with-ctest--n)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- `OVERRIDE_FIND_PACKAGE` and `FIND_PACKAGE_ARGS` are hard mutually exclusive on `FetchContent_Declare`: CMake 3.31.12/4.4.2 both raise a configure-time `FATAL_ERROR` ("Cannot specify both OVERRIDE_FIND_PACKAGE and FIND_PACKAGE_ARGS") — never a warning, never a runtime choice.
- `FETCHCONTENT_SOURCE_DIR_<X>` outranks everything else in the resolution order: with it set, `FIND_PACKAGE_ARGS`, an installed copy on `CMAKE_PREFIX_PATH`, and a dependency provider are all bypassed — `find_package` is never even attempted (3.31.12, 4.4.2).
- `FETCHCONTENT_TRY_FIND_PACKAGE_MODE=ALWAYS` makes `FetchContent_MakeAvailable` try `find_package` even when the `Declare` call carries no `FIND_PACKAGE_ARGS` keyword at all; `=NEVER` suppresses the try even when `FIND_PACKAGE_ARGS` **is** present — both measured on 3.31.12/4.4.2.
- A `find_package`-satisfied `FetchContent_MakeAvailable(dep)` does **not** create a target named `dep`; it only produces whatever the installed Config package names (here `dep::dep`-style namespaced targets never got created bare — `TARGET dep` was false in every found-via-config run, true only when it actually fetched and used `add_subdirectory`).
- `<pkg>_ROOT` (lower-case, CMP0074) and `<PKG>_ROOT` (upper-case, CMP0144, 3.27) both win over `CMAKE_PREFIX_PATH`; a hint passed once via `-D` sticks as a `CACHE` entry (visible in `CMakeCache.txt`) and survives a reconfigure that omits the `-D` — a fresh build tree or `--fresh`/deleting the cache is the only way to clear it (3.31.12).
- `cmake_language(SET_DEPENDENCY_PROVIDER)` called a second time from a second `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` file **silently replaces** the first provider — no warning, no error, on 3.31.12 or 4.4.2; this is documented behavior (`cmake_language.rst`: "the new provider replaces the previously set one"), not a bug, but nothing at configure time tells you which provider is active.
- `cmake_language(SET_DEPENDENCY_PROVIDER)` from a project's own `CMakeLists.txt` (not a top-level include) is a hard error naming the exact rule: "can only be called while the first project() command processes files listed in CMAKE_PROJECT_TOP_LEVEL_INCLUDES" (3.31.12, 4.4.2).
- `SUPPORTED_METHODS` for a provider is a closed set — `FIND_LIBRARY` is not a valid method name at all and errors immediately ("Unknown dependency provider method"); a provider categorically cannot see `find_library`/`find_program`/`find_path`, not merely "before the first find_package" (3.31.12).
- Setting `CMAKE_TOOLCHAIN_FILE` via `set(... CACHE ... FORCE)` **after** `project()` updates the cache variable's printed value but the toolchain file is never read — completely silent, no warning (3.31.12). A project reading `${CMAKE_TOOLCHAIN_FILE}` after this "fix" sees the new path and wrongly concludes it took effect.
- `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` **can** be set with a plain `set()` in the same `CMakeLists.txt` immediately before `project()`, and it works exactly as if passed on `-D` — it does not require a command-line or preset origin (3.31.12).
- A dependency declaring `cmake_minimum_required(VERSION 3.4)` is a hard configure error on 4.4.2 ("Compatibility with CMake < 3.5 has been removed") and only a deprecation warning on 3.31.12; the error message itself suggests the exact fix (`-DCMAKE_POLICY_VERSION_MINIMUM=3.5`).
- The `arrow`-style save/`set()`/restore of `CMAKE_POLICY_VERSION_MINIMUM` around one `FetchContent_MakeAvailable` call is **correctly scoped**: measured with two separate sub-3.5-floor dependencies, the first (inside the save/restore) configures cleanly and the second (fetched after the restore) still hits the 4.0 floor-removal error — the variable does not leak (4.4.2).
- The same fix as a global `-D` cache variable or as an **environment** variable is whole-configure-wide: both sub-3.5-floor dependencies configure cleanly with no per-dependency scoping (4.4.2). The environment-variable form additionally gets written into `CMakeCache.txt` as a normal `CACHE STRING` entry and **stays there** silently on a reconfigure after the environment variable is unset — a durable, invisible mask on that build tree (4.4.2).
- CMP0077 bites exactly where the topic map predicted: a fetched dependency with `cmake_minimum_required(VERSION 3.10)` (below the CMP0077-introducing 3.13) calling `option(DEP_TESTS ON)` **discards** the parent's pre-set `set(DEP_TESTS OFF)` normal variable and forces the option back to cache `ON`, with an author warning naming CMP0077 by number (4.4.2). Passing `-DCMAKE_POLICY_DEFAULT_CMP0077=NEW` on the command line makes the same dependency honor the parent's variable and the warning disappears.
- The same CMP0077 trap applies to a fetched dependency's own `option()`-controlled feature switches (e.g., a `PROJECT_IS_TOP_LEVEL` test guard exposed as `option(DEP_GUARD_TESTS OFF)`): setting it via a parent `set()` before `FetchContent_MakeAvailable` silently failed to take effect at a sub-3.13 floor; only a `-D` cache variable (which pre-empts `option()` regardless of CMP0077) reliably forced it — measured as a genuine cross-experiment interaction, not a hypothetical.
- Gating a fetched project's `add_subdirectory(tests)` behind a `PROJECT_IS_TOP_LEVEL`-based guard is the only measured way to keep the parent's `ctest -N` count clean: without the guard the parent's test list showed 3 tests (1 own + 2 from the fetched dependency); with the guard forced on via `-D`, it showed 1 (4.4.2).
- `CMakeConfigureLog.yaml` gets a `find_package-v1` event (with the exact CPS/CMake config filenames it tried, in order) only from **4.1 onward**; on 3.31.12 the same configure produces zero `find_package`/`find`-kind entries in the log at all (only `message-v1`/`try_compile-v1`) — `--debug-find-pkg=<name>` is the only native tool that answers "why was this copy found" on 3.31.12.
- On 4.4.2, `find_package`'s CONFIG-mode search additionally probes CPS locations (`lib64/cps/<pkg>.cps`, `lib/cps/<pkg>.cps`, `share/cps/<pkg>.cps`) before falling through to the `.cmake` Config files, even for a plain `find_package(dep CONFIG REQUIRED)` with no CPS anywhere involved — visible only via `--debug-find-pkg`.

## Findings

### 1. FetchContent vs find_package: the six-way resolution order

Scratch harness: `dep` is a tiny installable C static library with an
`install(EXPORT)` Config package, installed to two prefixes with
distinguishable versions (`prefix-A` = dep 1.0.0, tag `A`; `prefix-B` = dep
2.0.0, tag `B`), plus a local git repo (`dep-gitsrc`, dep 3.0.0, tag
`C-fetched`) consumed over `file://` for `FetchContent`. Consumer:
`consumer-fc/CMakeLists.txt`
(full source: `cmake-dependency-seam/scratch/resolution-order/consumer-fc/CMakeLists.txt`).

**`FIND_PACKAGE_ARGS` alone, with `CMAKE_PREFIX_PATH=prefix-A` set** — finds
the installed copy, never clones:

```
ocx package exec kitware/cmake:3.31 -- cmake -S consumer-fc -B build \
  -DSCEN_FIND_PACKAGE_ARGS=ON -DCMAKE_PREFIX_PATH=<prefix-A> --debug-find-pkg=dep
```
Observed: `The file was found at .../prefix-A/lib64/cmake/dep/depConfig.cmake`;
`dep_VERSION=1.0.0`; `TARGET dep does NOT exist` (the installed Config
package only defines `dep::dep`, so bare `dep` is unavailable — a consumer
written against `target_link_libraries(app PRIVATE dep)` breaks silently
switching from the fetched-and-`add_subdirectory`'d path to the
found-via-`find_package` path, where only `dep::dep` exists). On 3.31.12 the
`CMakeConfigureLog.yaml` contains no `find_package`/`find`-kind record at
all; on 4.4.2 the identical configure produces a `find_package-v1` record
naming both `dep.cps` and `depConfig.cmake` as tried config kinds, in that
order (source: `cmake-configure-log.7.rst`, `find_package-v1 Event`).

**`OVERRIDE_FIND_PACKAGE` alone, with `CMAKE_PREFIX_PATH=prefix-A` set** —
ignores the installed prefix outright and clones from the local git repo:

```
ocx package exec kitware/cmake:3.31 -- cmake -S consumer-fc -B build \
  -DSCEN_OVERRIDE=ON -DSCEN_LATER_FIND_PACKAGE=ON -DCMAKE_PREFIX_PATH=<prefix-A>
```
Observed: `dep_SOURCE_DIR=.../_deps/dep-src` (fetched, not `prefix-A`); a
subsequent plain `find_package(dep CONFIG)` reports `dep_FOUND=1` and
`TARGET dep exists`, redirected via
`CMakeFiles/pkgRedirects/dep-config.cmake` (contents: `include(dep-extra.cmake
OPTIONAL)`/`depExtra.cmake OPTIONAL)` only — no real target logic, the
targets already exist globally from the earlier `add_subdirectory`).
`dep_VERSION` came back **empty** — `dep-config-version.cmake`'s generated
content is literally:
```
# Version not available, assuming it is compatible. We must also say it is an
# exact match to ensure find_package() calls with the EXACT keyword still get
# redirected.
set(PACKAGE_VERSION_COMPATIBLE TRUE)
set(PACKAGE_VERSION_EXACT TRUE)
```
so any later `find_package(dep 2.0 EXACT)` will report success and a blank
version, silently passing a version gate it did nothing to satisfy. Identical
on 4.4.2.

**Both keywords together** — hard configure error on both tested lines:
```
CMake Error ... FetchContent.cmake:1282 (message):
  Cannot specify both OVERRIDE_FIND_PACKAGE and FIND_PACKAGE_ARGS when
  declaring details for dep
```
(3.31.12 line number; 4.4.2 raises byte-identical text at its own module
line). Confirms `Help/module/FetchContent.cmake` doc comment: "``OVERRIDE_FIND_PACKAGE`` cannot be used when ``FIND_PACKAGE_ARGS`` is [given]" ([FetchContent module source](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Modules/FetchContent.cmake), lines 203, 220). **Decided: yes, unconditionally mutually exclusive, enforced at `Declare` time, not a soft precedence rule.**

**`FETCHCONTENT_TRY_FIND_PACKAGE_MODE`** — `ALWAYS` makes CMake try
`find_package` even with **no** `FIND_PACKAGE_ARGS` keyword in the `Declare`
call:
```
-DFETCHCONTENT_TRY_FIND_PACKAGE_MODE=ALWAYS -DCMAKE_PREFIX_PATH=<prefix-A>
```
→ found `prefix-A`, `dep_VERSION=1.0.0`, no clone. `NEVER` suppresses the try
even when `FIND_PACKAGE_ARGS` **is** present in the `Declare` call:
```
-DSCEN_FIND_PACKAGE_ARGS=ON -DFETCHCONTENT_TRY_FIND_PACKAGE_MODE=NEVER -DCMAKE_PREFIX_PATH=<prefix-A>
```
→ `dep_SOURCE_DIR=.../_deps/dep-src` (fetched anyway), `TARGET dep exists`.
Both measured on 3.31.12. Matches doc text: "the behavior will be as though FIND_PACKAGE_ARGS had been provided" for `ALWAYS`, and NEVER omits it "when the details were declared" ([FetchContent.cmake:759-773](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Modules/FetchContent.cmake)).

**`FETCHCONTENT_SOURCE_DIR_DEP`** — outranks `FIND_PACKAGE_ARGS` and
`CMAKE_PREFIX_PATH` entirely:
```
-DSCEN_FIND_PACKAGE_ARGS=ON -DFETCHCONTENT_SOURCE_DIR_DEP=<dep-gitsrc> -DCMAKE_PREFIX_PATH=<prefix-A>
```
→ `dep_SOURCE_DIR=<dep-gitsrc>` (the local override directory, used directly
via `add_subdirectory`, no clone, no `find_package` attempt at all —
`dep_DIR` is only the redirect stub, never a real Config path). **Decided:
`FETCHCONTENT_SOURCE_DIR_<X>` is the strongest override in the whole
resolution order** — stronger than an explicit find-first request, stronger
than any installed prefix.

**`CMAKE_FIND_PACKAGE_REDIRECTS_DIR` contents, summarized per scenario**
(all under `<build>/CMakeFiles/pkgRedirects/`):

| Scenario | Redirect files written |
|---|---|
| `FIND_PACKAGE_ARGS`, found via installed prefix | none (empty dir) |
| `OVERRIDE_FIND_PACKAGE`, fetched | `dep-config.cmake`, `dep-config-version.cmake` (synthesized, version-less) |
| `FETCHCONTENT_TRY_FIND_PACKAGE_MODE=NEVER` (forced fetch) | none observed for the found-copy case; fetched path uses the real build |
| `FETCHCONTENT_SOURCE_DIR_DEP` set | none — `find_package` never runs |

### 2. Location-hint precedence and cache stickiness

Consumer: plain `find_package(dep CONFIG REQUIRED)`
(`consumer-plain/CMakeLists.txt`), no `FetchContent` involved, floor 3.27
(so CMP0074/CMP0144 are both NEW).

All four hint forms independently resolve to the intended copy (3.31.12):

| Hint | Value | Result `dep_DIR` | `dep_VERSION` |
|---|---|---|---|
| `-Ddep_ROOT=` (lower-case CLI var, CMP0074) | prefix-B | `.../prefix-B/lib64/cmake/dep` | 2.0.0 |
| `-DDEP_ROOT=` (upper-case CLI var, CMP0144, 3.27) | prefix-B | `.../prefix-B/lib64/cmake/dep` | 2.0.0 |
| `-Ddep_DIR=` | prefix-A's Config dir | `.../prefix-A/lib64/cmake/dep` | 1.0.0 |
| `-DCMAKE_PREFIX_PATH=` (variable) | prefix-A | `.../prefix-A/lib64/cmake/dep` | 1.0.0 |
| `CMAKE_PREFIX_PATH=` (environment, no `-D`) | prefix-B | `.../prefix-B/lib64/cmake/dep` | 2.0.0 |

**Precedence, `dep_ROOT` vs `CMAKE_PREFIX_PATH`**: with
`-Ddep_ROOT=<prefix-B>` and `-DCMAKE_PREFIX_PATH=<prefix-A>` set together,
`dep_ROOT` wins (`dep_VERSION=2.0.0`, prefix-B) — matches the documented
search-order groups where `<PackageName>_ROOT` is tier 1 and
`CMAKE_PREFIX_PATH` is a later tier ([`find_package` CONFIG-mode search
procedure](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/find_package.rst)).

**Cache stickiness**: configuring once with `-Ddep_ROOT=<prefix-B>`, then
reconfiguring the **same** build directory with `dep_ROOT` omitted from the
command line:
```
$ grep -i 'dep_DIR\|dep_ROOT' build/CMakeCache.txt   # after first configure
dep_DIR:PATH=.../prefix-B/lib64/cmake/dep
dep_ROOT:UNINITIALIZED=.../prefix-B
$ cmake -S consumer-plain -B build  # no -Ddep_ROOT this time
$ grep -i 'dep_DIR\|dep_ROOT' build/CMakeCache.txt   # after reconfigure
dep_DIR:PATH=.../prefix-B/lib64/cmake/dep
dep_ROOT:UNINITIALIZED=.../prefix-B
```
Both `dep_DIR` and `dep_ROOT` persist unchanged — removing the `-D` flag from
the command line has no effect once the cache entry exists. **Decided: the
hint sticks in the cache, not the command line; clearing it requires a fresh
build tree, `--fresh`, or `cmake -U dep_ROOT -U dep_DIR`.**

### 3. Dependency providers: registration, silent replacement, and blind spots

Harness: `providers/provider1.cmake` and `providers/provider2.cmake`, each
registering a distinctly-named logging function via
`cmake_language(SET_DEPENDENCY_PROVIDER <fn> SUPPORTED_METHODS ...)`.

**One provider, `CMAKE_PROJECT_TOP_LEVEL_INCLUDES=provider1.cmake`**, plain
`find_package(dep CONFIG REQUIRED)`, `CMAKE_PREFIX_PATH=prefix-A`:
```
-- [provider1] called: method=FIND_PACKAGE package_name=dep ARGN=CONFIG;REQUIRED
-- [scenario] dep_DIR=.../prefix-A/lib64/cmake/dep dep_VERSION=1.0.0
```
The provider is consulted first (method + package name + forwarded args
visible), does nothing, and CMake's built-in search runs afterward and
succeeds normally — a no-op provider is a pure observer, not a blocker.

**Two `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` files, both registering a provider**
(`provider1.cmake;provider2.cmake`), on both 3.31.12 and 4.4.2:
```
-- [provider1] file included, PROJECT_NAME=consumer2
-- [provider1] registered
-- [provider2] file included
-- [provider2] registered
...
-- [provider2] called: method=FIND_PACKAGE package_name=dep
```
`provider1` is registered, then silently displaced by `provider2` — no
warning, no error, `grep -i 'warn\|error'` over the full configure output is
empty. This matches the documented rule verbatim: "If a provider is already
set when `cmake_language(SET_DEPENDENCY_PROVIDER)` is called, the new
provider replaces the previously set one" ([`cmake_language.rst`, Dependency
Providers](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/cmake_language.rst)).
It is documented behavior, not a defect — but nothing at configure time
tells a reader *which* provider ended up active, and two top-level-include
files from two unrelated sources (e.g. two vendored provider scripts) have
no way to detect the collision.

**`SET_DEPENDENCY_PROVIDER` from the project's own `CMakeLists.txt`** (not a
top-level include), 3.31.12 and 4.4.2, byte-identical error:
```
CMake Error at CMakeLists.txt:6 (cmake_language):
  cmake_language Dependency providers can only be set as part of the first
  call to project().  More specifically,
  cmake_language(SET_DEPENDENCY_PROVIDER) can only be called while the first
  project() command processes files listed in
  CMAKE_PROJECT_TOP_LEVEL_INCLUDES.
```

**`SUPPORTED_METHODS ... FIND_LIBRARY`** (an attempt to intercept
`find_library`), 3.31.12:
```
CMake Error ... provider-bad-methods.cmake:3 (cmake_language):
  cmake_language Unknown dependency provider method "FIND_LIBRARY"
```
`FIND_LIBRARY` is not a recognized keyword at all. **Decided: a provider's
blind spot is categorical, not sequencing** — the only two valid
`SUPPORTED_METHODS` values are `FIND_PACKAGE` and
`FETCHCONTENT_MAKEAVAILABLE_SERIAL` ([`cmake_language.rst` lines
253-260](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/cmake_language.rst)); `find_program`/`find_library`/`find_path` cannot be
intercepted by any dependency provider on any CMake version that has the
feature (3.24+), which matches cmake-conan's own documented limitation
([cmake-dependency-seam/cps-ecosystem-adoption-and-interop.md]).

### 4. CMAKE_PROJECT_TOP_LEVEL_INCLUDES and post-project() writes

Marker toolchain file `h02-toolchain/marker-toolchain.cmake` prints a
message and sets a cache marker when actually read. `consumer-h02`
prints `CMAKE_TOOLCHAIN_FILE` before `project()`, then again immediately
after, then does `set(CMAKE_TOOLCHAIN_FILE ... CACHE FILEPATH "" FORCE)`
**after** `project()` and prints it a third time (3.31.12):
```
-- [h02] before project(): CMAKE_TOOLCHAIN_FILE=
-- [h02] after project(): CMAKE_TOOLCHAIN_FILE(effective)=
-- [h02] after late set(): CMAKE_TOOLCHAIN_FILE=.../marker-toolchain.cmake
-- [h02] H02_TOOLCHAIN_READ=
```
The variable's printed value **changes** to the new path, but the marker
message from inside `marker-toolchain.cmake` never appears and
`H02_TOOLCHAIN_READ` stays unset — the toolchain file is never read. This is
silent by every observable measure: no warning, no error, and the variable
itself looks like the assignment worked. **A reader who checks
`${CMAKE_TOOLCHAIN_FILE}` after the "fix" will be misled into thinking it
took.**

Conversely, `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` set with a plain `set()`
**inside the top `CMakeLists.txt`, before `project()`** works exactly like
passing it on `-D` (3.31.12):
```
$ cat consumer-h02b/CMakeLists.txt
cmake_minimum_required(VERSION 3.27)
set(CMAKE_PROJECT_TOP_LEVEL_INCLUDES "<providers/provider1.cmake>")
project(h02btest LANGUAGES C)
$ cmake -S consumer-h02b -B build
-- [provider1] file included, PROJECT_NAME=h02btest
-- [provider1] registered
```
**Decided: the rule is "before the first `project()` call in the file
CMake starts processing," not "must originate from the command line or a
preset."** A project can safely self-register its own top-level include
without requiring the consumer to pass `-D`.

### 5. CMAKE_POLICY_VERSION_MINIMUM: the 4.0 floor-removal escape hatch and its real scope

`dep-old-src` (`cmake_minimum_required(VERSION 3.4)`), bare configure:

```
$ ocx package exec kitware/cmake:4.4 -- cmake -S dep-old-src -B build
CMake Error at CMakeLists.txt:1 (cmake_minimum_required):
  Compatibility with CMake < 3.5 has been removed from CMake.
  Update the VERSION argument <min> value.  Or, use the <min>...<max> syntax
  to tell CMake that the project requires at least <min> but has been updated
  to work with policies introduced by <max> or earlier.
  Or, add -DCMAKE_POLICY_VERSION_MINIMUM=3.5 to try configuring anyway.
```
On 3.31.12 the identical file only produces `CMake Warning (deprecated)`
("Compatibility with CMake < 3.10 will be removed from a future version of
CMake") and configures successfully.

**(a) Local variable, save/`set()`/restore, arrow-style** (pattern at
`apache__arrow@e0cf4184dd:cpp/cmake_modules/FindRapidJSONAlt.cmake:29-32`),
around **one** `FetchContent_MakeAvailable(depold)`, then a **second**,
separate sub-3.5-floor dependency (`depold2`) fetched *after* the restore
(`consumer-b05a/CMakeLists.txt`), on 4.4.2:
```
-- [parent] BEFORE: CMAKE_POLICY_VERSION_MINIMUM=''
CMake Warning (deprecated) ... dep-old-src/CMakeLists.txt:1 ...   # depold, 3.4 floor: warning only, configures
-- [depold] configured OK, CMAKE_POLICY_VERSION set to floor
-- [parent] AFTER RESTORE: CMAKE_POLICY_VERSION_MINIMUM=''
CMake Error ... dep-old-src2/CMakeLists.txt:1 (cmake_minimum_required):
  Compatibility with CMake < 3.5 has been removed from CMake.
```
The **second** dependency, configured after the restore, hits the exact same
hard error the bare test did — the save/restore genuinely did not leak.
**Decided: the arrow pattern is correctly scoped** because
`cmake_minimum_required` reads `CMAKE_POLICY_VERSION_MINIMUM` as a normal
variable at the moment the child directory is entered (`add_subdirectory`
copies the parent's variable snapshot down), so restoring the parent's copy
before the next `FetchContent_MakeAvailable` genuinely re-exposes that next
dependency to the removed-compatibility check.

**(b) Global `-D` cache variable**, same two dependencies, no save/restore
(`consumer-b05b/CMakeLists.txt`), on 4.4.2:
```
$ cmake -S consumer-b05b -B build -DCMAKE_POLICY_VERSION_MINIMUM=3.5
-- [depold2] configured OK
-- [parent] both fetched OK under global CMAKE_POLICY_VERSION_MINIMUM
```
Both configure cleanly — no per-dependency scoping at all; every `<3.5`
floor anywhere in the tree is masked for the whole build.

**(c) Environment variable**, same test, on 4.4.2:
```
$ CMAKE_POLICY_VERSION_MINIMUM=3.5 cmake -S consumer-b05b -B build2
-- [depold2] configured OK
-- [parent] both fetched OK under global CMAKE_POLICY_VERSION_MINIMUM
$ grep CMAKE_POLICY_VERSION_MINIMUM build2/CMakeCache.txt
CMAKE_POLICY_VERSION_MINIMUM:STRING=3.5
```
Same whole-configure-wide effect as (b), **plus** it is written into
`CMakeCache.txt` as an ordinary `CACHE STRING` entry. Unsetting the
environment variable and reconfiguring the same build directory leaves the
cache entry untouched and both dependencies still configure cleanly — a
silent, durable mask with nothing on the command line to reveal it later.
The `-D` form (b) is also written to cache the same way (`UNINITIALIZED`
type since it was never re-read against a `CACHE` declaration), so **any**
non-scoped form of this fix is a permanent property of that build directory,
not a one-time override. **Decided: only the local-variable save/set/restore
around one `FetchContent_MakeAvailable` call gives real per-dependency
scope; the global and environment forms are whole-tree and sticky.** The
parent's own declared floor (its own `cmake_minimum_required`) was
unaffected in every variant — none of these forms touch the *parent's* own
compatibility checking, only what a child directory sees when it runs its
own `cmake_minimum_required`.

### 6. CMP0077: a fetched dependency's option() silently discarding the parent's variable

`dep-cmp0077-src` (`cmake_minimum_required(VERSION 3.10)`, below the
CMP0077-introducing 3.13) declares `option(DEP_TESTS "" ON)`. Parent sets
`set(DEP_TESTS OFF)` as a **normal variable** before
`FetchContent_MakeAvailable(depopt)`:

```
$ cmake -S consumer-cmp0077 -B build -DCMAKE_POLICY_VERSION_MINIMUM=3.10
-- [parent] set DEP_TESTS=OFF (normal var) before fetching
CMake Warning (policy) at dep-cmp0077-src/CMakeLists.txt:3 (option):
  Policy CMP0077 is not set: option() honors normal variables.  Run "cmake
  --help-policy CMP0077" for policy details.  Use the cmake_policy command to
  set the policy and suppress this warning.
-- [depopt] DEP_TESTS=ON
```
The dependency's `option()` **discards** the parent's `OFF` and forces the
cache entry back to its own default `ON` — CMP0077 OLD behavior, live
exactly where the topic map predicted (floor below 3.13). Adding
`-DCMAKE_POLICY_DEFAULT_CMP0077=NEW` fixes it completely:
```
$ cmake -S consumer-cmp0077 -B build2 -DCMAKE_POLICY_VERSION_MINIMUM=3.10 -DCMAKE_POLICY_DEFAULT_CMP0077=NEW
-- [parent] set DEP_TESTS=OFF (normal var) before fetching
-- [depopt] DEP_TESTS=OFF
```
No warning, and the dependency now honors the parent's variable.
**Decided: `CMAKE_POLICY_DEFAULT_CMP0077=NEW` (global) is the fix, and it is
whole-configure-wide like §5(b)/(c)** — there is no local, scoped variant of
this fix the way there is for `CMAKE_POLICY_VERSION_MINIMUM`, because
`CMAKE_POLICY_DEFAULT_CMP0077` only ever takes effect through the cache/global
default mechanism, not through a normal-variable read at `add_subdirectory`
time the way `CMAKE_POLICY_VERSION_MINIMUM` does.

**Surprise, found while building the §7 harness**: a fetched dependency's
own `option(DEP_GUARD_TESTS OFF)` — meant to let the *parent* opt the child
into a `PROJECT_IS_TOP_LEVEL` test guard — is subject to the identical trap.
Setting `set(DEP_GUARD_TESTS ON)` as a normal variable in the parent before
`FetchContent_MakeAvailable`, against a dependency floor of 3.5 (`<3.13`),
silently failed: the guard message never printed and all child tests still
appeared in the parent's `ctest -N`. Only passing `-DDEP_GUARD_TESTS=ON` as
a **pre-existing cache entry** on the command line reliably forced it (cache
entries pre-date `option()`'s own default and are never overwritten by it,
regardless of CMP0077 state). **A "just add a PROJECT_IS_TOP_LEVEL guard and
expose a toggle" recommendation is not self-sufficient below a 3.13 floor
unless the toggle is set via `-D`/cache, not a parent `set()`.**

### 7. PROJECT_IS_TOP_LEVEL test-subtree gating, measured with ctest -N

`dep-gitsrc` ships an `option(DEP_GUARD_TESTS OFF)` that, when ON, skips
`add_subdirectory(tests)` unless `PROJECT_IS_TOP_LEVEL` is true (a 3.5-floor
shim: `string(COMPARE EQUAL "${CMAKE_SOURCE_DIR}" "${CMAKE_CURRENT_SOURCE_DIR}"
PROJECT_IS_TOP_LEVEL)`, the same idea as
`friendlyanon__cmake-init@7e0c52fc73:cmake-init/templates/common/cmake/project-is-top-level.cmake`).
Parent has its own `add_test(NAME parent_test ...)` and fetches `dep` via
`FetchContent_Declare(dep SOURCE_DIR <dep-gitsrc>)`.

**Without the guard active** (`DEP_GUARD_TESTS=OFF`, the default), 4.4.2:
```
$ ctest -N
  Test #1: parent_test
  Test #2: dep_smoke
  Test #3: dep_smoke2
Total Tests: 3
```
**With the guard forced on** (`-DDEP_GUARD_TESTS=ON`, see the §6 surprise
for why it must be `-D` and not a parent `set()`), 4.4.2:
```
-- [dep] guarded: NOT top level, skipping add_subdirectory(tests)
$ ctest -N
  Test #1: parent_test
Total Tests: 1
```
**Decided: a `ctest -N` count comparison (guarded vs unguarded) is the
correct native verification for this row** — reading source for
`PROJECT_IS_TOP_LEVEL` alone is not sufficient, because the guard's own
activation path can itself be swallowed by CMP0077 (§6).

## Normative guidance candidates

1. **Never pass both `FIND_PACKAGE_ARGS` and `OVERRIDE_FIND_PACKAGE` to the same `FetchContent_Declare` call.** Rationale: hard `FATAL_ERROR` on every tested line, not a soft precedence choice. Verify: `rg -rn -A15 -e 'FetchContent_Declare\(' --include='*.cmake' --include='CMakeLists.txt' .` and read each match's next 15 lines for both keywords in one block; empty output (no `FetchContent_Declare` at all) means nothing to check, and a block containing both keywords is the finding. Floor: CMake ≥ 3.24 (`FIND_PACKAGE_ARGS`)/3.25 (`OVERRIDE_FIND_PACKAGE`).
2. **State `FETCHCONTENT_TRY_FIND_PACKAGE_MODE` explicitly (never rely on the default `OPT_IN`) whenever a project mixes some `Declare` calls with `FIND_PACKAGE_ARGS` and some without, in one build.** Rationale: `ALWAYS` silently makes every dependency try `find_package` first, including ones the author never opted in; `NEVER` silently makes every dependency skip `find_package`, including ones with `FIND_PACKAGE_ARGS`. Verify: `rg -rn -e FETCHCONTENT_TRY_FIND_PACKAGE_MODE .` — empty output on a tree with more than one `FetchContent_Declare` and inconsistent `FIND_PACKAGE_ARGS` use across them is the SHOULD finding (the mode is left at its ambient, easy-to-miss default). Floor: CMake ≥ 3.24.
3. **Never rely on a bare target name (`dep`, not `dep::dep`) after a `FetchContent_MakeAvailable` that may resolve via `find_package`.** Rationale: measured — the found-via-Config path only exposes the namespaced target(s) the installed package declares; the fetched-and-`add_subdirectory`'d path may additionally expose a bare target the Config package never aliases. Verify (reading heuristic, two greps): `rg -rn -e 'FetchContent_Declare\(dep' .` to find the declared name, then `rg -rn -e 'target_link_libraries.*[^:]dep[^:]' .` to find consumers linking the bare name instead of its namespaced alias; any hit on the second grep for a package resolved through `find_package` is the finding. Floor: any.
4. **Treat `<Pkg>_DIR`/`<Pkg>_ROOT`/`<PKG>_ROOT` set via `-D` as sticky, build-tree-scoped state, not a per-invocation override.** Rationale: measured — omitting the `-D` on a reconfigure does not clear the cache entry. Verify: a named reading heuristic — any CI script or doc instructing "pass `-Ddep_ROOT=...` to switch dependency" without also naming `--fresh`, `-U dep_ROOT`, or a clean build directory for reverting is the finding; confirm on disk with `rg -rn -e '_ROOT=' .github .agents 2>/dev/null` (empty = nothing to check) paired with a check for `--fresh` or `-U` nearby in the same file. Floor: CMake ≥ 3.12 (`_ROOT`), ≥ 3.27 for the upper-case form (CMP0144).
5. **A dependency-provider registration collision (two `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` files, or a vendored script plus the consumer's own) is invisible at configure time; a project that composes provider scripts from more than one source must log which provider ended up active.** Rationale: measured — the second `SET_DEPENDENCY_PROVIDER` call silently replaces the first, by design, with zero diagnostic. Verify: a named reading heuristic — every file a `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` list names should `message(STATUS "[provider] active: ...")` immediately after registering; more than one file listed and fewer such messages than files is the finding. Floor: CMake ≥ 3.24.
6. **Never call `cmake_language(SET_DEPENDENCY_PROVIDER)` from a project's own `CMakeLists.txt`.** Rationale: hard error on every tested version — it only works from a file listed in `CMAKE_PROJECT_TOP_LEVEL_INCLUDES`, processed during the first `project()`. Verify: `rg -rln -e SET_DEPENDENCY_PROVIDER --include='CMakeLists.txt' .` then check each listed file is also named by that tree's `CMAKE_PROJECT_TOP_LEVEL_INCLUDES`; empty output means nothing to check, and a `CMakeLists.txt` in the list that is not a top-level include is the finding. Floor: CMake ≥ 3.24.
7. **Do not assume a dependency provider can intercept `find_library`/`find_program`/`find_path`.** Rationale: measured — `SUPPORTED_METHODS` accepts only `FIND_PACKAGE` and `FETCHCONTENT_MAKEAVAILABLE_SERIAL`; any other method name is a configure-time error, not a partial capability. Verify: a named reading heuristic — a design doc or rule claiming a provider "intercepts all dependency lookups" is the finding; the true set is exactly the two named methods, confirmable with `cmake --help-command cmake_language` on the pinned binary. Floor: CMake ≥ 3.24.
8. **Never write to `CMAKE_TOOLCHAIN_FILE`, `CMAKE_PROJECT_TOP_LEVEL_INCLUDES`, or any `VCPKG_*` pre-project variable after the first `project()` call — the write silently changes the variable's printed value with zero effect on behavior.** Rationale: measured — no warning, no error, and the variable's own value looks like the write succeeded. Verify: a named ordering heuristic — in the top `CMakeLists.txt`, compare the line number of the first `project(` call against the line number of every `set(CMAKE_TOOLCHAIN_FILE`, `set(CMAKE_PROJECT_TOP_LEVEL_INCLUDES` or `set(VCPKG_` call (`rg -n -e 'project\(' -e 'set\(CMAKE_TOOLCHAIN_FILE' -e 'set\(CMAKE_PROJECT_TOP_LEVEL_INCLUDES' -e 'set\(VCPKG_' CMakeLists.txt`); any such `set()` line numbered after the first `project()` line is the finding. Floor: any.
9. **`CMAKE_PROJECT_TOP_LEVEL_INCLUDES` may be set with a plain `set()` immediately before a project's own `project()` call — this is a legitimate self-registration pattern, not a workaround.** Rationale: measured to behave identically to a command-line `-D`. Verify: a named reading heuristic — do not flag this pattern as a misuse of a "must be command-line-only" variable when the `set()` line precedes the file's own first `project()` line. Floor: CMake ≥ 3.24.
10. **Scope every `CMAKE_POLICY_VERSION_MINIMUM` fix for a fetched or vendored sub-3.5-floor dependency to a local `set()`/save/restore pair immediately around the one `FetchContent_MakeAvailable`/`add_subdirectory` call that needs it — never as a global `-D`, a preset `cacheVariables` entry, or an environment variable.** Rationale: measured — the local-variable form is genuinely scoped to the one dependency; the global and environment forms mask the CMake-4.0 floor-removal safety net for the *entire* build tree, including dependencies added later that were never audited, and the environment form additionally persists silently in the cache after the environment variable is removed. Verify: `rg -rn -e CMAKE_POLICY_VERSION_MINIMUM --include='CMakeLists.txt' --include='*.cmake' --include='CMakePresets.json' .` — empty output means nothing to check; a hit inside a preset's `cacheVariables` block, or a `CMakeLists.txt`/`*.cmake` hit not immediately paired with a save-before/restore-after of the same variable around one `FetchContent`/`add_subdirectory` call, is the finding. Floor: CMake ≥ 4.0 for the error this works around; the variable itself exists from 3.12 (as a no-op before 4.0).
11. **Set `CMAKE_POLICY_DEFAULT_CMP0077=NEW` globally (`-D` or a preset) on any build that fetches dependencies whose declared floor may be below 3.13, rather than expecting a per-dependency scoped fix — none exists for this policy.** Rationale: measured — a sub-3.13-floor dependency's `option()` silently discards the parent's pre-set variable of the same name; `CMAKE_POLICY_DEFAULT_CMP0077=NEW` is whole-configure by construction (no scoped variant is possible, unlike `CMAKE_POLICY_VERSION_MINIMUM`). Verify: `rg -rn -e CMAKE_POLICY_DEFAULT_CMP0077 --include='CMakePresets.json' --include='CMakeLists.txt' .` — empty output while the same tree also has a `FetchContent`/CPM/vendored dependency below floor 3.13 (rule 10's grep, non-empty) is the finding. Floor: CMake ≥ 3.13 for the policy to exist at all; the fix variable works from 3.13 onward.
12. **When exposing a fetched dependency's own feature toggle (test guard, `option()`-controlled behavior) to the parent, force it via a pre-existing cache entry — a parent-side `set(<VAR> <value> CACHE ... FORCE)` before `add_subdirectory`/`FetchContent_MakeAvailable`, or `-D<VAR>=<value>` on the command line — never a plain `set()` normal variable, unless the dependency's floor is confirmed ≥ 3.13 or the global CMP0077 default is forced NEW.** Rationale: measured — a normal-variable `set()` at a sub-3.13 floor is silently discarded by the dependency's own `option()`, exactly as in rule 11's finding, even when the toggle exists specifically to let a parent opt out of test/subtree behavior. Verify: rule 11's grep, applied to the tree that fetches the dependency; empty output alongside a `set(<TOGGLE> ...)` (not `CACHE`) immediately before the fetch call is the finding. Floor: CMake ≥ 3.13 (or `CMAKE_POLICY_DEFAULT_CMP0077=NEW` at any floor ≥ that policy's existence).
13. **Gate a fetched or `add_subdirectory`'d project's test subtree (`include(CTest)`/`enable_testing()`/`add_subdirectory(tests)`) behind `PROJECT_IS_TOP_LEVEL`, and verify with a `ctest -N` count comparison, not a source read alone.** Rationale: measured — the unguarded case leaked 2 extra tests into the parent's `ctest -N`; a source-only check for the presence of a guard variable can pass while the guard is actually inert (rule 12). Verify: build the project standalone and record its `ctest -N` count, then build it again as a `FetchContent`/`add_subdirectory` child of a trivial parent and record that parent's `ctest -N` count; the counts differing by the child's own test count is the finding (no growth is the pass). Floor: CMake ≥ 3.21 for native `PROJECT_IS_TOP_LEVEL`; a shim (`string(COMPARE EQUAL ...)`) is required below that and must itself be verified to compute correctly as a subdirectory, not just at top level.
14. **When triaging "which copy of a dependency was found," read `--debug-find-pkg=<name>` output on any tested version; only additionally consult `CMakeConfigureLog.yaml`'s `find_package-v1`/`find-v1` records on CMake ≥ 4.1 — on 3.31.12 those records do not exist.** Rationale: measured — an identical configure on 3.31.12 produced zero `find`-kind entries in the configure log, while 4.4.2 produced a detailed `find_package-v1` record listing every config file candidate tried, in order, including CPS candidates. Verify: in the build directory, `grep -c -e 'kind: "find' CMakeFiles/CMakeConfigureLog.yaml` — a count of 0 on a CMake binary older than 4.1 is expected and is not itself a finding; a count of 0 on CMake ≥ 4.1 after a `find_package` call ran is the finding. `--debug-find-pkg=<name>` at configure time is the version-independent fallback on every tested line. Floor: `--debug-find-pkg` from CMake ≥ 3.24 (topic map [canon] §14); configure-log `find_package-v1` from CMake ≥ 4.1.

## Exemplar evidence

- **Try-find-then-fetch, `FIND_PACKAGE_ARGS`-adjacent shape**:
  `protocolbuffers/protobuf@e816e3cbab:cmake/abseil-cpp.cmake:16-43` —
  `find_package(absl CONFIG)` guarded by `protobuf_FORCE_FETCH_DEPENDENCIES`,
  falling back to a plain `FetchContent_Declare`/`FetchContent_MakeAvailable`
  (no `FIND_PACKAGE_ARGS` keyword — the try/fetch split is hand-rolled with
  `if(NOT TARGET absl::strings)` rather than the native keyword). Content and
  line numbers (16, 25, 35, 40, 43) confirmed unchanged in the local
  corpus clone's current HEAD (`c647439`, same repository, same file); rule
  10's guidance (scope any policy-version fix locally) is not yet exercised
  here because this file does not set `CMAKE_POLICY_VERSION_MINIMUM` at all —
  it is a plain rule-6 exemplar (M-G-01/M-G-02), not a rule-10 one.
- **Fetch-on-miss inside a `Find*.cmake` module**:
  `ccache/ccache@e256302fa6:cmake/FindZstd.cmake:49` — `find_library(ZSTD_LIBRARY zstd)` (line 12) with a `FetchContent_Declare` fallback at line 49 gated
  by a `DEPS`/`DEP_ZSTD` variable, `SOURCE_SUBDIR` and `EXCLUDE_FROM_ALL #
  CMake 3.28+` noted inline — this is the module-hides-a-network-touch
  pattern rule 3's `TARGET`-naming concern does not cover (it is a `Find*`
  module smell, not a resolution-order smell), cited here only because the
  brief names it; owned in full by `M-D-04`/`M-G-18`, not this file.
  Confirmed unchanged at these line numbers in the local corpus clone's
  current HEAD (`b471bbd`).
- **The `CMAKE_POLICY_VERSION_MINIMUM` save/set/restore pattern rule 10
  distills**: `apache/arrow@e0cf4184dd:cpp/cmake_modules/FindRapidJSONAlt.cmake:29-32`
  (cited by the topic map's conflict 18 and frame correction 2; not
  independently re-fetched in this dive — the pattern was instead
  reproduced and measured directly in §5(a), which is the stronger
  evidence tier for this DECIDE item).
- **`find_ocx`** (`ocx-sh/find_ocx@ac2a759cd0`): uses neither
  `FetchContent` nor a dependency provider (frame correction 4: "1 of 46
  exemplars uses one," and that one is a different repository) — none of
  rules 1, 2, 5–7, 10–13 apply to it directly; rule 4 (hint stickiness) and
  rule 14 (triage tool) are its closest points of contact, both already
  covered by `cmake-audit/find-ocx-cmake-shape-and-contracts.md`.
- No exemplar in the corpus was found mixing `FIND_PACKAGE_ARGS` and
  `OVERRIDE_FIND_PACKAGE` in one `Declare` call (rule 1 has zero violators
  to cite because the mistake is a hard configure error, not a style choice
  that could ship).

## AI-agent angle

- **Hallucinated composability of dependency providers.** A model trained
  on the *concept* of "provider" from other ecosystems (npm resolutions,
  Python entry-point plugin systems) tends to assume multiple
  `SET_DEPENDENCY_PROVIDER` registrations compose or chain. Measured: the
  second call silently and totally replaces the first. Mechanical check:
  grep for more than one `SET_DEPENDENCY_PROVIDER` call across the files
  named by `CMAKE_PROJECT_TOP_LEVEL_INCLUDES`, and if found, require an
  explicit `message(STATUS "[provider] active: ...")` naming the winner.
- **Treating `FIND_PACKAGE_ARGS` and `OVERRIDE_FIND_PACKAGE` as tunable
  independent flags** (e.g., suggesting "set both to be safe" or "try
  `FIND_PACKAGE_ARGS` first, add `OVERRIDE_FIND_PACKAGE` for the corner
  case") — this is a hard `FATAL_ERROR`, not a preference order. Mechanical
  check: rule 1's verify command (`rg -rn -A15 -e 'FetchContent_Declare\(' --include='*.cmake' --include='CMakeLists.txt' .`), reading each matched block for both keywords together.
- **Assuming a `-D<pkg>_ROOT=...` override is a one-shot, per-invocation
  switch** — a model asked "how do I point this build at a different
  copy temporarily" will often suggest just adding `-D` without mentioning
  the cache is sticky. Measured: removing the `-D` on a later reconfigure
  leaves the old hint active. Mechanical check: any generated
  troubleshooting doc that says "pass `-D<pkg>_ROOT=`" without also naming
  `--fresh` or a fresh build directory for reversal is incomplete.
  Model recommendation would come from 3.x-era muscle memory where `-D`
  felt ephemeral; it never was, for any CMake version.
  Model recommendation would also miss that `<PKG>_ROOT` (upper-case,
  CMP0144, 3.27) is a **separate**, newer spelling many 2024-training-era
  models don't know exists alongside the lower-case `CMP0074` (3.12) form.
- **Applying `CMAKE_POLICY_VERSION_MINIMUM` globally "to fix the CMake 4
  error" without scoping it.** This is the single most likely 2026-era
  hallucination-adjacent mistake: a model that correctly recalls the
  variable's *name* (it is new enough that pre-2026 training data may not
  even have it) is very likely to reach for the simplest form — a global
  `-D` or a `set()` at the top of `CMakeLists.txt` — because that's the
  shape every other "just make the error go away" CMake variable takes.
  Measured: this masks the CMake-4.0 removal check for the entire build,
  permanently, including dependencies added later. Mechanical check: rule
  10's grep — a hit not paired with an immediate save/restore is a
  finding, full stop.
  Conan 1's `CMAKE_MINIMUM_REQUIRED` patching macros and old StackOverflow
  answers about "just lower your `cmake_minimum_required`" are a related
  wrong-generation reflex a model may reproduce verbatim; the 4.4.2 error
  message itself is short enough that a model should quote it rather than
  paraphrase a remembered fix.
- **CPS search paths appearing unbidden.** A model that has not internalized
  that CPS import became ungated at 4.3 (not 4.4, not "experimental
  forever") may be confused by `--debug-find-pkg` output on 4.4.2 that
  shows `dep.cps` candidate paths for a package that has no `.cps` file and
  never asked for one — this is default, silent, and not a sign of
  misconfiguration; the CPS mini-wave (`cps-verification.md`) already
  settled the version boundary, cited here because it is directly visible
  in this dive's own `--debug-find-pkg`/configure-log output.
- **Assuming `find_library`/`find_program` participate in the provider
  seam "eventually" or "in a newer CMake."** They are excluded by a fixed,
  closed enum (`FIND_PACKAGE`, `FETCHCONTENT_MAKEAVAILABLE_SERIAL`) that has
  not grown since the feature's introduction at 3.24; a model should not
  present this as a temporary gap. Mechanical check: `cmake --help-command
  cmake_language` on the pinned binary is the arbiter, not memory.

## Contested / evolving

- **Whether the provider-replacement silence (§3) should be treated as a
  defect worth a Kitware issue** is not this dive's call — it is documented
  behavior as of 4.4.2 with no deprecation or planned-change language found
  in `Help/command/cmake_language.rst`. As of 2026-09-26 there is no
  indication this is trending toward a warning; flagged here as a
  practitioner-facing sharp edge, not a version-specific claim to track.
- **`CMAKE_POLICY_DEFAULT_CMP0077`'s lack of a scoped/local equivalent to
  `CMAKE_POLICY_VERSION_MINIMUM`'s save/restore pattern** is a real
  asymmetry between two policy-adjacent variables that look superficially
  similar; nothing in the fetched docs (`cmake_policy.rst`,
  `cmake-policies.7.rst` as read for the CPS mini-wave) suggests a future
  per-directory form is planned. Treat the asymmetry as durable, not a gap
  awaiting a fix.
- **CPS candidate paths appearing in every CONFIG-mode `find_package` search
  on 4.3+** (§1, §"AI-agent angle") is new territory this dive measured
  incidentally; whether authors should start shipping `.cps` files
  alongside `Config.cmake` for exactly this reason is the subject of the
  dedicated CPS dives (`cps-spec-and-cmake-implementation.md`,
  `cps-verification.md`) and is intentionally not re-litigated here.

## Sources

| URL or measurement | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [FetchContent.cmake source, v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Modules/FetchContent.cmake) | Primary, normative module source with doc comments | fetched 2026-09-26 | Ground truth for `FIND_PACKAGE_ARGS`/`OVERRIDE_FIND_PACKAGE` mutual exclusion and `FETCHCONTENT_TRY_FIND_PACKAGE_MODE` semantics |
| [cmake_language.rst, v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/cmake_language.rst) | Primary, normative command reference | fetched 2026-09-26 | Confirms provider replacement-not-error, the top-level-includes-only restriction, and the closed `SUPPORTED_METHODS` enum |
| [cmake-configure-log.7.rst, v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-configure-log.7.rst) | Primary, normative manual | fetched 2026-09-26 | Defines `find-v1`/`find_package-v1` event schemas and their version introduction |
| Measurement: FetchContent keyword matrix (§1, 8 configure runs) | Primary (measured) | 2026-09-26, CMake 3.31.12 + 4.4.2 | Settles the six-way resolution order and the mutual-exclusion error text |
| Measurement: hint precedence and cache stickiness (§2, 7 configure runs) | Primary (measured) | 2026-09-26, CMake 3.31.12 | Settles `_ROOT` vs `CMAKE_PREFIX_PATH` precedence and cache persistence |
| Measurement: dependency-provider registration matrix (§3, 5 configure runs) | Primary (measured) | 2026-09-26, CMake 3.31.12 + 4.4.2 | Settles silent replacement, top-level-only restriction, closed method enum |
| Measurement: post-project() silent writes (§4, 2 configure runs) | Primary (measured) | 2026-09-26, CMake 3.31.12 | Settles the toolchain-file-set-too-late silent no-op and the legitimate in-tree self-registration pattern |
| Measurement: `CMAKE_POLICY_VERSION_MINIMUM` scope matrix (§5, 4 configure runs across 2 dependencies) | Primary (measured) | 2026-09-26, CMake 4.4.2 (control run on 3.31.12) | Settles local-vs-global-vs-environment scoping and cache persistence of the environment form |
| Measurement: CMP0077 trap and fix (§6, 2 configure runs) | Primary (measured) | 2026-09-26, CMake 4.4.2 | Settles the option()-discards-normal-variable trap and the `CMAKE_POLICY_DEFAULT_CMP0077=NEW` fix, with verbatim policy-warning text |
| Measurement: `PROJECT_IS_TOP_LEVEL` test-subtree gating via `ctest -N` (§7, 2 configure+ctest runs) | Primary (measured) | 2026-09-26, CMake 4.4.2 | Settles that a `ctest -N` count comparison, not a source read, is the correct verification |
| [find_package.rst, v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/find_package.rst) | Primary, normative command reference | fetched 2026-09-26 | CONFIG-mode search-path tier ordering that explains why `_ROOT` outranks `CMAKE_PREFIX_PATH` |
| [cmake-topic-map.md](../cmake-topic-map.md), rows M-G-01/02/09/11/17, M-D-12, M-H-02/03/04, M-B-05, M-E-06, M-I-01 | Codified (this program's own prior synthesis) | 2026-09-26 | The binding brief and DECIDE items this dive answers; not re-litigated, only executed |
| [cmake-dependency-seam/cps-verification.md](cps-verification.md) | Codified (this program's own prior verification pass) | 2026-09-06 (CPS mini-wave) | Source for the CPS 4.3-ungating boundary referenced in §1/AI-agent-angle without re-deriving it |
| `protocolbuffers/protobuf` exemplar clone, `cmake/abseil-cpp.cmake` | Exemplar (measured by reading) | corpus fetched 2026-09-06, re-read 2026-09-26 at local HEAD `c647439` | Real try-find-then-fetch shape matching §1's `FIND_PACKAGE_ARGS`-adjacent (but keyword-less) idiom |
| `ccache/ccache` exemplar clone, `cmake/FindZstd.cmake` | Exemplar (measured by reading) | corpus fetched 2026-09-06, re-read 2026-09-26 at local HEAD `b471bbd` | Real fetch-on-miss-inside-a-Find-module shape cited by the brief |

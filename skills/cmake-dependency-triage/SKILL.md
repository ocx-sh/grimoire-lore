---
name: cmake-dependency-triage
description: Symptom-first triage for a CMake dependency that resolved to the wrong copy, version or mechanism, with the exact cache, configure-log, Conan, vcpkg and CPM reads and what each output means. Use when find_package picked the wrong installed copy, a re-pointed _ROOT, CMAKE_PREFIX_PATH or toolchain had no effect, a cross build linked a host library, a fetched or CPM copy was built instead of the expected one, two copies of one library meet in one link, a provider or cmake-conan never supplied a package or find_program cannot see it, a binary loads a different copy than the one configured, a consumer fails with "link interface of target ... not found", CMake 4 reports "Compatibility with CMake < 3.5 has been removed" or the gate stops on "< 3.10 will be removed" or install-absolute-destination in a dependency, an offline or FETCHCONTENT_SOURCE_DIR configure fails where the online one passed, or someone asks which version Conan or vcpkg picked. Not for choosing a package manager or writing build files.
license: Apache-2.0
metadata:
  summary: Ordered triage for "which copy, which version and which mechanism resolved this dependency", read from the configure's own records before any debug flag
  keywords: cmake,dependency,triage,find_package,CMakeCache,_DIR,_ROOT,debug-find-pkg,fresh,CMakeConfigureLog,FetchContent,OVERRIDE_FIND_PACKAGE,pkgRedirects,FETCHCONTENT_SOURCE_DIR,dependency-provider,cmake-conan,CMakeConfigDeps,conan-graph-info,conan-graph-explain,conan.lock,vcpkg,VCPKG_INSTALLED_DIR,toolchain,CMAKE_FIND_ROOT_PATH,find_dependency,CMAKE_POLICY_VERSION_MINIMUM,cmake_minimum_required,CPM,CPMUsePackageLock,CPM_USE_LOCAL_PACKAGES,CPM_SOURCE_CACHE,bundled,CMAKE_SYSROOT,CMAKE_LIBRARY_ARCHITECTURE
---

# cmake-dependency-triage

Answer one question with evidence: which copy, which version and which
mechanism resolved this dependency, and why not the one you expected. Then hand
the fix to the rule that owns it.

This skill assumes the `cmake-build` and `cpp-packaging` rule sets are
installed. The MUST rows it leans on are repeated at the end, on purpose.
Everything below was run on CMake 3.31.12, 4.3.4 and 4.4.2, Conan 2.32.0 with
cmake-conan `develop2` (`b1593849`), vcpkg-tool 2026-09-26 (2026-07-27 where a
line says so) and CPM.cmake 0.43.2, on real cJSON, spdlog 1.17.0, fmt 11.1.4 to
12.1.0 and expat 2.8.5 trees, the last cross-built with zig cc 0.16 (2026-09-26).
The references name each version.

Contents: [Stop condition](#stop-condition) · [The evidence rule](#the-evidence-rule) · [Before you start](#before-you-start) ·
[The read order](#the-read-order) · [Pick the entry point](#pick-the-entry-point) · [T1 to T15](#t1-wrong-copy-or-a-re-pointed-hint-had-no-effect) ·
[Pinned defaults](#pinned-defaults) · [MUST rows this procedure enforces](#must-rows-this-procedure-enforces) · [Failure modes](#failure-modes) · [References](#references)

## Stop condition

Stop when the triage names all three. Any one missing and it is a guess.

- **Which copy.** On a `--fresh` configure, `<Pkg>_DIR` (or a Find module's
  library cache line, or the provider that answered) names the copy you intended.
- **Which mechanism put it there.** A stale cache entry, a FetchContent
  or CPM redirect, a provider, a toolchain-injected root, a Find module, a
  bundled copy, or the manager's resolution. "It found X" is not a mechanism.
- **The rule that fixes it, and its check passing.** Applied at the file and
  line that decided, never at a layer that did not.

Out of scope, because each turns a diagnosis into a defect: a global floor
switch, wiping the tree before step 1, a hand-edited lockfile (CMK-CONAN-09),
and `cmake_language(DEFER)` as an ordering fix (CMK-TC-05).

## The evidence rule

Provenance comes only from the configure's own records:

- `CMakeCache.txt`, read by `grep`, never by `cmake -L`, which omits the
  `UNINITIALIZED` type a plain `-Ddep_ROOT=...` gets (both lines).
- `CMakeFiles/pkgRedirects/`.
- `CMakeConfigureLog.yaml` `find_package-v1` events, on 4.1 and newer only.
- `--debug-find-pkg=NAME` output, but only from a `--fresh` configure.

It never comes from the call site, a green configure, a manager's trace
(`VCPKG_TRACE_FIND_PACKAGE`, `vcpkg depend-info`), `conan graph info`, or
`cmake --graphviz`, which draws the target graph only. A copy bundled inside
another package never passes through `find_package`: its version macro is its
record (T14).

## Before you start

```sh
cmake --version
```

The binary line decides the gate spelling and which floor rule applies. Every
configure in this skill passes the gate for its line and, because a fetch may
be involved, `-DCMAKE_POLICY_DEFAULT_CMP0170=NEW` (floor pinned below).

| Binary line | `GATE` | A dependency floor of 3.5 to 3.9 | A floor below 3.5 |
|---|---|---|---|
| 3.x (3.31.12) | `-Werror=dev` | T6, fixed by CMK-DEP-30 | T6 as well: 3.31.12 prints the same deprecation for it |
| 4.0 to 4.3 (4.3.4) | `-Werror=dev` | T6, fixed by CMK-DEP-15 | T5, fixed by CMK-DEP-15 |
| 4.4 and newer (4.4.2) | `-Werror=author` | T6, fixed by CMK-DEP-15 | T5, fixed by CMK-DEP-15 |

`-Werror=author` below 4.4 is ignored silently, so one command line serving
both sides uses `-Werror=dev`, which 4.4.2 still honours (CMK-CORE-01).

## The read order

Run the three steps in order, on the build tree that showed the symptom. The
examples use `build` and a package named `dep`. Substitute the leg's build
directory and the name exactly as the `find_package` call spells it.

### 1. Grep the cache, before any flag

```sh
NAME=dep
grep -rn --include='CMakeCache.txt' -e "^${NAME}_DIR" -e "^${NAME}_ROOT" -e '^CMAKE_PREFIX_PATH' -e '^VCPKG_INSTALLED_DIR' -e '^CMAKE_TOOLCHAIN_FILE' -e '^CMAKE_PROJECT_TOP_LEVEL_INCLUDES' -e '^CPM_PACKAGE_' -e '^CPM_USE_LOCAL_PACKAGES' -e '^CPM_SOURCE_CACHE' build
```

The patterns are a union, so read each line, and the first row below that
matches decides. Non-empty output is expected. Save it before step 2, because
`--fresh` deletes the cache it came from.

| What the output shows | Reading | Go to |
|---|---|---|
| `CMAKE_TOOLCHAIN_FILE` names `vcpkg.cmake`, and no `VCPKG_INSTALLED_DIR` line | vcpkg's toolchain never ran. A toolchain given to an existing build tree is cached and never loaded: `grep -rn --include='CMakeSystem.cmake' -e 'include(' build/CMakeFiles` prints nothing (3.31.12 and 4.4.2) | T1 |
| A `dep_DIR` line while `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` names cmake-conan with `CMakeConfigDeps` | The provider's own search failed, and its fallback `find_package` found a copy outside Conan | T13 |
| `dep_DIR` is a Conan `generators` folder | That folder is the copy of record, whatever version it now describes. Read the version there, never from `conan graph info` | T8 |
| `CPM_USE_LOCAL_PACKAGES:BOOL=ON` | CPM ran `find_package` before fetching. The option is read from the environment on the first configure and then cached, so unsetting the variable or `-U dep_DIR` keeps the local copy (4.4.2) | T15 |
| `CPM_PACKAGE_dep_VERSION` other than the version the `CPMAddPackage` call names | Another declaration of the name came first, a `CPMUsePackageLock` file included | T15 |
| `CPM_PACKAGE_dep_SOURCE_DIR` outside the build tree | A shared `CPM_SOURCE_CACHE` copy, which every tree reuses, `--fresh` included | T15 |
| `dep_DIR` not under the current `dep_ROOT`, `CMAKE_PREFIX_PATH` entry or `VCPKG_INSTALLED_DIR` | A stale cache entry, or a rooted copy. Step 2 tells them apart | T1, T9 |
| `dep_DIR:PATH=<build>/CMakeFiles/pkgRedirects` | A FetchContent or CPM redirect answered, and step 2 prints its candidates with no `The file was found at` line. An installed copy was never consulted | T2 |
| No `dep_DIR` line, with `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` naming a provider | Expected under cmake-conan with `CMakeConfigDeps`: the provider sets `dep_DIR` as a normal variable (measured 3.31.12 and 4.4.2) | T3 |
| No `dep_DIR` line and no provider | A Find module answered, or the call never ran. A module's copy is its `<NAME>_LIBRARY*` and `<NAME>_INCLUDE_DIR` cache lines, grepped with `NAME` as the call spells it | [references](references/reading-the-answers.md#module-mode-find_package) |
| `dep_DIR` under the expected prefix, and no row above matches | The configured copy is right. A binary that reports another version at run time is the loader (T11), or, with no `ldd` line for the library, a bundled copy compiled in (T14). Otherwise a wrong version is the manager's | T11, T14, T8, T9 |

### 2. Reconfigure fresh, with the search printed

```sh
GATE=-Werror=dev
cmake -S . -B build --fresh "$GATE" -DCMAKE_POLICY_DEFAULT_CMP0170=NEW --debug-find-pkg="$NAME"
```

Pass the same `-D` hints and `--toolchain` the leg passes. A preset leg runs
`cmake --preset "$PRESET" --fresh "$GATE" -DCMAKE_POLICY_DEFAULT_CMP0170=NEW
--debug-find-pkg="$NAME"` with its configure preset, so its cache variables
and `warnings` block apply exactly as in CI.

- `The file was found at` followed by a path names the file that answered.
- `Package was found by the dependency provider` means the provider returned,
  not that it supplied the copy: cmake-conan prints it after its fallback
  search too. The `The file was found at` path above it is the answer, and a
  `considered but not accepted` `generators` copy is the one Conan supplied (T13).
- On a reused tree the same flag lists only the cached candidate and prints
  the old answer with no warning (measured, both lines). That is why it never
  runs before step 1, and never without `--fresh`.
- `The item was found at` is a `find_library` or `find_path` answer. For a Find
  module these lines are the copy, and `The file was found at` names the module.
- If the gated configure stops at a floor error first, triage that first
  (T5, T6).

Then re-run the step 1 grep. A `dep_DIR` that moved to the hinted copy
confirms a stale cache (T1). One that stays on a manager's tree or a sysroot
is a rooted copy winning (T1, CMK-DEP-21).

### 3. On CMake 4.1 and newer, read the configure log

```sh
grep -rc --include='CMakeConfigureLog.yaml' -e 'kind: "find_package-v1"' build
grep -rn --include='CMakeConfigureLog.yaml' -e '^    name: ' -e '^      path: ' -e '^      mode: ' -e '^      version: ' build
```

Run both only after the `--fresh` configure of step 2, because the log appends
on a reused tree (4.4.2 counted 2 events after one reconfigure). A count of 0
on 3.x is expected. A count of 0 on 4.1 or newer after a `find_package` ran is
a finding (CMK-DEP-17). A call a FetchContent or CPM redirect answered logs an
event only under `--debug-find-pkg`, with its `path:` in `pkgRedirects` and a
blank found `version:` (4.3.4 and 4.4.2). A cmake-conan call's events:
[references](references/reading-the-answers.md#dependency-providers). The second
command pairs each package `name:` with its `path:`, `mode:` and `version:`
lines, the request's version first when the call names one, then the found
copy's. A found version other than the one the manager reports is the finding.
A Find module reports the version it parsed, usually the header's, so compare
it with step 1's library line. Empty output means no `find_package` resolved.
On 3.x, read the version file beside step 1's `_DIR`
([references](references/reading-the-answers.md#config-mode-find_package)).

## Pick the entry point

| # | Symptom | First read | Reading | Fixing rule |
|---|---|---|---|---|
| T1 | Wrong copy or version found. A re-pointed hint had no effect | Step 1, then step 2 | `_DIR` moves under `--fresh`: stale cache. It does not move: a rooted copy wins | CMK-DEP-13, CMK-DEP-21, CMK-TC-08 |
| T2 | Installed copy ignored, fetched copy built | Step 1 | `_DIR` under `pkgRedirects` | CMK-DEP-07, CMK-DEP-09, CMK-DEP-32 |
| T3 | cmake-conan active, `find_program` or `find_library` NOTFOUND | Configure console output | `Loading conan_cmakedeps_paths.cmake` absent: `CMakeDeps`. Present: check the call's directory | CMK-TC-05, CMK-TC-04 |
| T4 | Consumer fails right after `Configuring done` with "The link interface of target ... not found" | The installed Config file | No `find_dependency` for a package on the link interface | CMK-INST-03, CMK-INST-01 |
| T5 | 4.x: "Compatibility with CMake < 3.5 has been removed" | The error's file:line | A dependency's floor | CMK-DEP-15 |
| T6 | Gate error: "Compatibility with CMake < 3.10 will be removed" | The error's file:line and `cmake --version` | 4.x: CMK-DEP-15. 3.x: CMK-DEP-30 | CMK-DEP-15, CMK-DEP-30 |
| T7 | Online configure passes, offline or override configure fails | The patch and override greps | An override of a patched dependency | CMK-DEP-31, CMK-DEP-16 |
| T8 | "Which version did Conan pick?" | `conan graph info`, then the generators folder | graph info: what the conanfile resolves to now. The folder: what this tree consumes | CMK-CONAN-07, CMK-CONAN-09 |
| T9 | vcpkg: wrong tree or wrong version | Step 1 | `_DIR` not under the current `VCPKG_INSTALLED_DIR`: T1 through vcpkg. A version above a `version>=` floor: the baseline won | CMK-DEP-13, CMK-VCPKG-01, CMK-VCPKG-02 |
| T10 | A provider registered, never called | Step 1, then the TC-04 grep | The project set or appended `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` | CMK-TC-04 |
| T11 | The configured copy is right, but the built or installed binary loads another | `ldd` and `readelf -d` on the binary | No `RUNPATH` on the installed binary while the build-tree binary has one: install stripped it and a same-SONAME copy on the loader path wins | CMK-INST-11 |
| T12 | 4.4 and newer: the gate stops on `install-absolute-destination` inside a fetched or vendored dependency | The error's file:line | The dependency installs to an absolute `DESTINATION` (`CMAKE_INSTALL_FULL_*`) | CMK-DEP-30, CMK-DEP-31 |
| T13 | cmake-conan ran, and the consumer got a copy or version Conan did not install | Step 1, then step 2 | A `dep_DIR` cache line under `CMakeConfigDeps`, and `considered but not accepted` naming the generators copy | CMK-DEP-32, CMK-CONAN-07 |
| T14 | A link error names two versions of one library ("did you mean" another inline namespace), or a static binary runs another version than `<dep>_DIR` names | The version macro over step 1's prefixes | Another package bundles a copy in its headers and library | CMK-DEP-33 |
| T15 | A CPM project builds another version or source than its `CPMAddPackage` call names | Step 1's `CPM_` lines | A lock declaration, a cached `CPM_USE_LOCAL_PACKAGES`, or a shared source cache | CMK-DEP-10, CMK-DEP-16, CMK-DEP-32 |

## T1 Wrong copy, or a re-pointed hint had no effect

A resolved `find_package` keeps `<Pkg>_DIR` in the cache, so re-pointing
`<Pkg>_ROOT`, `CMAKE_PREFIX_PATH`, `VCPKG_INSTALLED_DIR` or a Conan output
folder keeps the old copy while the hint prints the new value (both lines):

- **`_DIR` moves under `--fresh`.** Stale cache. For a person, `--fresh` or a
  new build tree is the fix, and `-U <Pkg>_DIR` is enough only when the
  toolchain did not change, because a toolchain given to an existing tree is
  never loaded (CMK-TC-03). For a module that writes a `_ROOT` cache entry on
  every configure, the fix is CMK-DEP-13's guarded `unset(<Pkg>_DIR CACHE)`
  when the value changes. A vendored bootstrap module that writes `<name>_ROOT`
  as `CACHE PATH ... FORCE` keeps the old copy for as long as it exists on
  disk. List modules with that shape:

  ```sh
  grep -rlzE --include='*.cmake' -e '_ROOT[^)]*CACHE' . | xargs -r grep -L -e '_DIR CACHE'
  ```

  Empty output passes. A listed file writes a `_ROOT` cache entry and never
  unsets a `_DIR` one. A `FORCE` in that call is the finding.
- **`_DIR` stays put under `--fresh`, and starts with a root.**
  `CMAKE_FIND_ROOT_PATH` or `CMAKE_SYSROOT` is non-empty (step 2 prints both),
  and every rooted candidate beats an unrooted `_ROOT` hint. Pin the copy with
  `<Pkg>_DIR` (CMK-DEP-21, and CMK-TC-10 under a Conan cross build). Both empty
  while step 1 names cmake-conan means its fallback search found the copy
  again: T13, never a `_DIR` pin.
- **`_DIR` stays put outside every root, in a cross build.** The target's copy
  was never a candidate, and the toolchain leaves the find-root modes at `BOTH`
  (CMK-TC-08). A sysroot's `usr/lib/<triplet>` is searched only when
  `CMAKE_LIBRARY_ARCHITECTURE` is set. zig cc 0.16 leaves
  `CMAKE_C_LIBRARY_ARCHITECTURE ""` in `CMakeFiles/<ver>/CMakeCCompiler.cmake`,
  so `ONLY` alone turns the host copy into "Could not find". The toolchain also
  sets the triplet (CMK-TC-11, 3.31.12, 4.3.4 and 4.4.2,
  [references](references/reading-the-answers.md#toolchain-injected-paths)).

## T2 Installed copy ignored, fetched copy built

`dep_DIR` under `CMakeFiles/pkgRedirects` means an `OVERRIDE_FIND_PACKAGE`
declare, or a `FIND_PACKAGE_ARGS` declare that fell through to a fetch, won,
and `--debug-find-pkg` never names the installed prefix (both lines). Name the
declaring line with a grep, never a trace:

```sh
grep -rn --include='*.cmake' --include='CMakeLists.txt' -e 'OVERRIDE_FIND_PACKAGE' .
```

Empty output, or a hit only inside `CPM.cmake` (CPM writes the redirect itself
for every package it fetches: T15), means no override declare. Then look for a
`FIND_PACKAGE_ARGS` declare whose try-find missed because its name is spelled
unlike the Config file: re-run step 1 with `NAME` set to that spelling
([references](references/reading-the-answers.md#fetchcontent-redirects)). A hit
in an installable library outside a top-level guard is a CMK-DEP-07 finding.
A later `find_package(dep 2.0 ...)` against the redirect passes with a blank
version (CMK-DEP-09). A CI leg on the installed copy asserts step 1's path (CMK-DEP-32).

## T3 cmake-conan active, and a find_program or find_library is NOTFOUND

Providers intercept only `find_package` and `FetchContent_MakeAvailable`. The
tell is in the console output (and `build/conan/conan_cmakedeps_paths.cmake`),
never in `CMakeConfigureLog.yaml`:

```sh
PRESET=default
mkdir -p logs
cmake --preset "$PRESET" --fresh "$GATE" -DCMAKE_POLICY_DEFAULT_CMP0170=NEW > logs/configure.log 2>&1
grep -rn --include='configure.log' -e 'conan_cmakedeps_paths' logs
```

A leg without presets captures the step 2 command the same way. Empty output
means `CMakeDeps`, whose content no `find_*` call sees. A `Loading` line means
`CMakeConfigDeps`, whose paths exist after the first intercepted `find_package`,
in that directory scope (4.4.2).

The fix is CMK-TC-05: the first `find_package` of a Conan package goes in the
top-level `CMakeLists.txt`, before any `add_subdirectory`, and `DEFER` never
helps ([references](references/reading-the-answers.md#dependency-providers)).

## T4 Consumer fails after Configuring done

The error names the installed `*Targets.cmake`: the exporter never redeclared
a dependency on its link interface. Only a compiled consumer fails (failure mode 7).

```sh
NAME=dep2
PREFIX=/usr/local
grep -rn --include="${NAME}Config.cmake" --include="${NAME}-config.cmake" -e 'find_dependency' "$PREFIX"
grep -rn --include="${NAME}*argets.cmake" -e 'INTERFACE_LINK_LIBRARIES' "$PREFIX"
```

Empty output from the first while the second names another package's target
is the finding (CMK-INST-03). The proof that the fix holds is the CMK-INST-01
round trip with a compiled consumer, never a green install.

## T5 and T6 A dependency's floor stops the configure

T5 is 4.x's "Compatibility with CMake < 3.5 has been removed". T6 is the gate on
"< 3.10 will be removed": `CMake Deprecation Error` on 3.31.12 and 4.3.4,
`CMake Error (deprecated)` on 4.4.2. Both name the dependency's
`cmake_minimum_required` line. On 4.x the fix is CMK-DEP-15, value 3.10 (never
CMake's suggested 3.5), scoped to the one call that adds the dependency. On 3.x
it is CMK-DEP-30, a re-pin or a one-line `PATCH_COMMAND` (a `...4.0` range also
clears it), because 3.31.12 ignores `CMAKE_POLICY_VERSION_MINIMUM`. Never a
warning switch. List the writes:

```sh
grep -rn --include='*.cmake' --include='CMakeLists.txt' --include='CMakePresets.json' --include='*.yml' --include='*.yaml' -e 'CMAKE_POLICY_VERSION_MINIMUM' -e 'CMAKE_POLICY_DEFAULT_CMP' .
```

Empty output passes. Each hit must be a set/restore around one call that adds
the dependency, a `set()` inside a function, or a vcpkg port's own arguments.
A preset, workflow or file-scope hit is the finding.

## T7 Online passes, offline or override fails

`FETCHCONTENT_SOURCE_DIR_<X>` skips the declare's `PATCH_COMMAND`, so pristine
source fails the gate or builds differently (3.31.12, 4.3.4 and 4.4.2).

```sh
grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'PATCH_COMMAND' .
grep -rn --include='CMakeLists.txt' --include='*.cmake' --include='CMakePresets.json' --include='CMakeUserPresets.json' --include='*.yml' --include='*.yaml' --include='*.sh' -e 'FETCHCONTENT_SOURCE_DIR_' .
```

Empty first output means no dependency is patched, so the cause is elsewhere in
the offline probe (CMK-DEP-16). A name in both lists whose override directory
lacks the patched line is the finding (CMK-DEP-31). The probe always carries
`-DCMAKE_POLICY_DEFAULT_CMP0170=NEW`, or a missing source directory exits 0.

## T8 Which version did Conan pick

```sh
conan graph info . --profile:host=default --profile:build=default
```

Pass the flags the build's `conan install` uses. It prints what the conanfile
resolves to now. The tree builds against the last install's generators folder:

```sh
grep -rn --include='*ConfigVersion.cmake' --include='*-config-version.cmake' --include='*-data.cmake' -e 'set(PACKAGE_VERSION ' -e '_PACKAGE_FOLDER_[A-Z]* "' build
```

Hits under a `generators` directory are this tree's version and package
folder, and empty output means no generators folder (not applicable). A version
other than graph info's means `conan install` did not run after a change
(CMK-CONAN-07, CMK-CONAN-09, [references](references/reading-the-answers.md#the-conan-graph)).

## T9 vcpkg: wrong tree or wrong version

Step 1's `VCPKG_INSTALLED_DIR` and `<Pkg>_DIR` lines answer "which tree", and
a `_DIR` outside it is T1. For the version, read what vcpkg installed here:

```sh
grep -rn --include='status' -e '^Package: ' -e '^Version: ' -e '^Status: ' build/vcpkg_installed/vcpkg
```

Only an `install ok installed` entry counts, and empty output means no manifest
install ran into this tree. A version above a `version>=` floor is the baseline
winning (CMK-VCPKG-02, [references](references/reading-the-answers.md#vcpkg)).

## T10 A provider registered, never called

Step 1 shows the user's file in `CMAKE_PROJECT_TOP_LEVEL_INCLUDES`, and step 2
never credits the provider. A project `set()` of that variable hides the user's
file, and a `list(APPEND)` registers the project's provider last, which wins.

```sh
grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'SET_DEPENDENCY_PROVIDER' -e 'CMAKE_PROJECT_TOP_LEVEL_INCLUDES' .
```

Empty output passes. Any `CMakeLists.txt` hit, or a module that sets or
appends the variable, is the finding (CMK-TC-04).

## T11 The right copy configured, another one loaded

```sh
BIN=build/app
ldd "$BIN"
readelf -d "$BIN"
```

`ldd` printing `not a dynamic executable`, or no line naming the library, means
T11 does not apply: a static or header copy is T14. The `ldd` line naming the
library is the copy that loads. An installed binary with no `RUNPATH` or
`RPATH` line, whose build-tree twin has one, lost it at install, and a
same-SONAME copy on the loader's path wins with exit 0 (3.31.12 and 4.4.2:
cJSON 1.7.15 configured, a host 1.7.18 loaded). The fix is CMK-INST-11
(`$ORIGIN`) for the same prefix, and `INSTALL_RPATH_USE_LINK_PATH ON` on the
executable for another. Never `LD_LIBRARY_PATH`.

## T12 The 4.4 gate stops inside a dependency's install()

No re-pin clears it: cJSON 1.7.15, 1.7.18 and master `6d9f2443ab` all install
to `CMAKE_INSTALL_FULL_*`. A scoped `CMAKE_SKIP_INSTALL_RULES ON` or
`cmake_diagnostic(SET CMD_INSTALL_ABSOLUTE_DESTINATION WARN)` does not clear it
on 4.4.2, and 4.3.4 is unaffected (2026-09-26). Patch every absolute
destination in one `PATCH_COMMAND` (CMK-DEP-30's shape), or the error moves to
the next `install()`:

```sh
grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'CMAKE_INSTALL_FULL_' build/_deps
```

Empty output means a literal absolute path, so read the error's file:line. The
gate never drops (CMK-CORE-01).

## T13 The provider ran, and another copy answered

cmake-conan re-runs a failed generators search with CMake's default search, so
a request that rejects Conan's copy, or a conanfile without the package, lets
another copy win with exit 0
([references](references/reading-the-answers.md#dependency-providers)). Fix the
request or the conanfile. A leg that must use Conan's copy asserts that step 1
prints no `<Pkg>_DIR` line for it (CMK-DEP-32).

## T14 Two copies of one library in one link

A package that bundles a dependency ships the copy in its own include
directory and library, and no configure record names it. When both copies
share include guards, the first include per source file wins: a link error
naming both inline namespaces, or a green binary running the bundled version
(spdlog 1.17.0 beside fmt 11.1.4, 3.31.12 to 4.4.2). List every copy:

```sh
grep -rn --include='*.h' --include='*.hpp' -e 'define FMT_VERSION ' /usr/local/include /opt/spdlog/include
```

Name the library's version macro and each of step 1's prefixes. One hit
passes, and empty output means a wrong macro or prefix. A second hit is the
finding: consume the bundling package's build that uses the external copy,
whose targets then list it (T4's second grep), never an include order
(CMK-DEP-33, [references](references/reading-the-answers.md#bundled-copies)).

## T15 CPM chose another copy

Step 1's `CPM_PACKAGE_<name>_VERSION` and `_SOURCE_DIR` lines are CPM's record.
List the declarations, the lock included, then check the source copy:

```sh
grep -rn --include='CMakeLists.txt' --include='*.cmake' --exclude='CPM.cmake' --exclude='cpm-package-lock.cmake' --exclude-dir='_deps' -e 'CPMUsePackageLock' -e 'CPMDeclarePackage' -e 'CPMAddPackage' .
DIR=build/_deps/dep-src
git -C "$DIR" status --porcelain
```

Empty output from the grep means no CPM. A `CPMDeclarePackage` beats every
`CPMAddPackage` of the name with one ungated warning, so a bump goes in the
lock (CMK-DEP-10). Step 2's `Debug Log at cmake/CPM.cmake` is the cached local
search: pass `-DCPM_USE_LOCAL_PACKAGES=OFF`, and a CI leg asserts the copy
(CMK-DEP-32). Set `DIR` to the `_SOURCE_DIR` value: empty `git` output passes,
`not a git repository` means a URL download (not applicable), and a line under
`CPM_SOURCE_CACHE` means another project edited the shared copy (CMK-DEP-16,
[references](references/reading-the-answers.md#cpm)).

## Pinned defaults

Agreed defaults an adopter overrides once, never re-litigated during a triage.

| Decision | Default (pinned) |
|---|---|
| Floor of every shipped probe | `cmake_minimum_required(VERSION 3.25...4.4)` |
| Gate spelling and floor value | As in [Before you start](#before-you-start) and T5 and T6 (CMK-DEP-15, CMK-DEP-30). `CMAKE_POLICY_VERSION_MINIMUM` 3.5 only inside a vcpkg port build |
| Conan flow | Explicit `conan install`, then `cmake --preset`. The cmake-conan provider is legal within CMK-TC-05's limits, and `DEFER` is never offered as a fix |
| Managers per configure | One manager of record (CMK-PKG-01, CMK-TC-02) |

## MUST rows this procedure enforces

Duplicated as a hedge against the scoped rule set not being loaded. The full
rows live in the `cmake-build` and `cpp-packaging` rule sets, which settle a dispute.

| # | Finding | Rule |
|---|---|---|
| 1 | An application whose `requires` or `tool_requires` use a version range commits `conan.lock`. CI passes `--lockfile=conan.lock` explicitly and never `--lockfile-partial`. The lock is regenerated with `--lockfile-out` (plus `--lockfile-clean`), never edited by hand | CMK-CONAN-09 |
| 2 | An installable library resolves its dependencies with `find_package` and never forces acquisition | CMK-DEP-07 |
| 3 | Treat `<Pkg>_DIR` as the sticky record of which copy was found. To switch copies use a fresh build tree, `--fresh` or `-U <Pkg>_DIR`, and only a fresh tree or `--fresh` when the switch adds or changes the toolchain. A module that re-points `<Pkg>_ROOT` on reconfigure must `unset(<Pkg>_DIR CACHE)` whenever the hint's value changes | CMK-DEP-13 |
| 4 | On CMake 4.x, set a third-party dependency's policy knobs with set/restore around the one `add_subdirectory`, `FetchContent_MakeAvailable` or `find_package` that loads it, with `CMAKE_POLICY_VERSION_MINIMUM` at 3.10. Never use a project-wide `set()`, a committed preset `cacheVariables` entry, or a CI environment variable | CMK-DEP-15 |
| 5 | Make every configure-time network touch satisfiable offline | CMK-DEP-16 |
| 6 | On CMake 3.x, clear a fetched or vendored dependency whose floor is 3.5 to 3.9 by re-pinning to a version that declares 3.10 or newer, or with a `PATCH_COMMAND` that rewrites that one `cmake_minimum_required` line. Never use `-DCMAKE_WARN_DEPRECATED=OFF`, `-Wno-dev`, `-Wno-deprecated`, `-Wno-error=deprecated` or a preset's `"warnings": {"deprecated": false}` as the remedy | CMK-DEP-30 |
| 7 | Point an offline or override configure (`FETCHCONTENT_SOURCE_DIR_<X>`, including the CMK-DEP-16 probe) only at source that already carries the declare's `PATCH_COMMAND` result | CMK-DEP-31 |
| 8 | Whenever install, export, Config-template or dependency wiring changes, prove the package can be consumed with the round-trip script. Never treat a green build and install as proof | CMK-INST-01 |
| 9 | In the Config template, redeclare every imported dependency that sits on an exported target's PUBLIC or INTERFACE link line with `find_dependency()`, under the same condition the build used to add it. Never use a raw `find_package()` there | CMK-INST-03 |
| 10 | Leave the dependency provider to the user. Never `set()` or `list(APPEND)` `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` from project or module code, and list at most one provider-registering file per configure | CMK-TC-04 |
| 11 | Never design on a provider seeing `find_program`, `find_library` or `find_path`. With cmake-conan they see Conan content only under `CMakeConfigDeps`, only after the first intercepted `find_package`, and only in that directory scope, so the first `find_package` of a Conan package goes in the top-level `CMakeLists.txt` before any `add_subdirectory`. `DEFER` is not an ordering fix | CMK-TC-05 |
| 12 | Link one copy of each library. When a consumed package can bundle a dependency that the project, or another package in the same link, also uses, consume the package's build that uses the external copy (spdlog: `SPDLOG_FMT_EXTERNAL=ON`) | CMK-DEP-33 |

## Failure modes

1. **"Fixing" a floor error with a global switch** (a warning switch, or a preset or CI `CMAKE_POLICY_VERSION_MINIMUM`), or with the value 3.5.
2. **Emitting `CMAKE_POLICY_VERSION_MINIMUM` for a 3.x build.** 3.31.12 ignores it with exit 0.
3. **Assuming a provider widens search paths like a toolchain file**, or that `DEFER` runs a call earlier.
4. **Reading an empty `_DIR` grep as "never looked up"** when a Find module or a `CMakeConfigDeps` provider answered.
5. **Wiping the build tree first.** The stale `_DIR` was the evidence.
6. **Passing `FETCHCONTENT_SOURCE_DIR_<X>` for a patched dependency**, then debugging the dependency.
7. **Proving a missing `find_dependency` fixed with a `LANGUAGES NONE` consumer.** It stays green either way.
8. **Stopping at "the configured copy is right"** when the binary reports another version (T11).
9. **Spelling a `FIND_PACKAGE_ARGS` declare's name differently from the package's Config file**, case included. The try-find misses, the fetch runs silently, and step 1 under the `find_package` spelling never shows it.
10. **Reporting a CMK-DEP-17 finding for a zero event count** when a redirect answered: it logs an event only under `--debug-find-pkg`.
11. **Clearing 4.4's `install-absolute-destination` stop in a dependency with a scoped `cmake_diagnostic` or `CMAKE_SKIP_INSTALL_RULES`.** Only a patch does (T12).
12. **Reading vcpkg's `version>=` as the version installed.** The result is the highest of the baseline and every floor. Only `overrides` pins lower (T9).
13. **Giving an existing build tree a toolchain, then clearing `_DIR` with `-U`.** The toolchain is never loaded, so `-U` finds the old copy (T1).
14. **Taking `conan graph info` as the build tree's record.** The tree builds against what the last `conan install` wrote to its generators folder (T8).
15. **Trusting `Package was found by the dependency provider`.** cmake-conan prints it after its fallback search found a copy outside Conan (T13).
16. **Stopping at a right `<dep>_DIR` when another package bundles the dependency.** The bundled copy never passes through `find_package` (T14).
17. **Reading a CPM project's copy from its `CPMAddPackage` call.** A lock, a cached `CPM_USE_LOCAL_PACKAGES` or a shared source cache decides (T15).
18. **Reading a `_DIR` outside every root as "a rooted copy won"** because `CMAKE_SYSROOT` is set. The sysroot's copy was never searched, often because `CMAKE_LIBRARY_ARCHITECTURE` is empty (T1).
19. **Taking a Find module's reported version as the linked copy's.** FindEXPAT printed the sysroot header's 2.8.5 beside the host library (step 3).

## References

Read one level down, on demand.

| File | Read it when |
|---|---|
| [references/reading-the-answers.md](references/reading-the-answers.md) | An output does not match a row above. Holds, per mechanism, what each writes into the cache, the redirects directory and the configure log: Config and Module mode, FetchContent redirects, providers, toolchain-injected paths, bundled copies, CPM, the Conan graph and vcpkg |

Re-check on each tool bump: the cmake-conan provider's `CMakeConfigDeps`
behaviour and fallback search (`b1593849`), whether `CMakeConfigDeps` leaves
experimental status (Conan 2.32.0, 2026-09-26), the `find_package-v1` event
layout (4.4.2), vcpkg's no-lockfile, no-provider stance and version selection
(vcpkg-tool 2026-09-26 and 2026-07-27), CPM's redirect stub, cached options and
lock precedence (CPM.cmake 0.43.2), and whether zig cc still reports no
implicit link directories (0.16.0-dev).

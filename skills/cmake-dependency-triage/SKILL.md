---
name: cmake-dependency-triage
description: Symptom-first triage for a CMake dependency that resolved to the wrong copy, version or mechanism, with the exact cache, configure-log, Conan and vcpkg reads and what each output means. Use when find_package picked a different installed copy than expected, a re-pointed _ROOT hint or CMAKE_PREFIX_PATH had no effect, a fetched copy was built although an installed one was on the path, a dependency provider or cmake-conan never supplied a package or find_program cannot see it, a binary links or loads a different copy than the one configured, a consumer fails with "link interface of target ... not found", CMake 4 reports "Compatibility with CMake < 3.5 has been removed" or the configure gate stops on "< 3.10 will be removed", an offline or FETCHCONTENT_SOURCE_DIR configure fails where the online one passed, or someone asks which version Conan or vcpkg picked. Not for choosing a package manager or writing build files (the cmake-build and cpp-packaging rules).
license: Apache-2.0
metadata:
  summary: Ordered triage for "which copy, which version and which mechanism resolved this dependency", read from the configure's own records before any debug flag
  keywords: cmake,dependency,triage,find_package,CMakeCache,_DIR,_ROOT,debug-find-pkg,fresh,CMakeConfigureLog,FetchContent,OVERRIDE_FIND_PACKAGE,pkgRedirects,FETCHCONTENT_SOURCE_DIR,dependency-provider,cmake-conan,CMakeConfigDeps,conan-graph-info,conan-graph-explain,conan.lock,vcpkg,VCPKG_INSTALLED_DIR,toolchain,CMAKE_FIND_ROOT_PATH,find_dependency,CMAKE_POLICY_VERSION_MINIMUM,cmake_minimum_required
---

# cmake-dependency-triage

Answer one question with evidence: which copy, which version and which
mechanism resolved this dependency, and why not the one you expected. Then hand
the fix to the rule that owns it.

This skill assumes the `cmake-build` and `cpp-packaging` rule sets are
installed. The merge-blocking rows the procedure leans on are repeated at the
end, on purpose.
Everything below was run on CMake 3.31.12, 4.3.4 and 4.4.2, Conan 2.32.0 with
cmake-conan `develop2`, and vcpkg-tool 2026-09-26 (verified 2026-09-26).

Contents: [Stop condition](#stop-condition) · [The evidence rule](#the-evidence-rule) ·
[Before you start](#before-you-start) · [The read order](#the-read-order) ·
[Pick the entry point](#pick-the-entry-point) · [T1 to T10](#t1-wrong-copy-or-a-re-pointed-hint-had-no-effect) ·
[Pinned defaults](#pinned-defaults) · [MUST rows this procedure enforces](#must-rows-this-procedure-enforces) ·
[Failure modes](#failure-modes) · [References](#references)

## Stop condition

Stop when the triage names all three. Any one missing and it is a guess.

- **Which copy.** On a `--fresh` configure, `<Pkg>_DIR` (or the Find module or
  provider that answered) names the copy you intended.
- **Which mechanism put it there.** A stale cache entry, a FetchContent
  redirect, a provider, a toolchain-injected root, a Find module, or the
  manager's resolution. "It found X" is not a mechanism.
- **The rule that fixes it, and its check passing.** Applied at the file and
  line that decided, never at a layer that did not.

If the copy is right and the version is wrong, the cause sits in the manager's
resolution. Hand it to `conan graph info` (T8) or the vcpkg manifest (T9).

Four moves stay out of scope, each turning a diagnosis into a new defect:
fixing a floor error with a global `CMAKE_POLICY_VERSION_MINIMUM` or a warning
switch, deleting a build tree before recording which `_DIR` was stale, editing
a manager lockfile by hand (CMK-CONAN-09), and offering
`cmake_language(DEFER)` as an ordering fix (CMK-TC-05).

## The evidence rule

Provenance comes only from the configure's own records:

- `CMakeCache.txt`, read by `grep`, never by `cmake -L`. `-L` omits
  `UNINITIALIZED` entries, which is exactly the type a plain `-Ddep_ROOT=...`
  gets (measured, both lines).
- `CMakeFiles/pkgRedirects/`.
- `CMakeFiles/CMakeConfigureLog.yaml` `find_package-v1` events, on CMake 4.1
  and newer only. 3.31.12 writes none.
- `--debug-find-pkg=NAME` output, but only from a `--fresh` configure.

It never comes from the call site, a green configure, a manager's trace
(`VCPKG_TRACE_FIND_PACKAGE`, `vcpkg depend-info`), or `cmake --graphviz`, which
draws the target graph only and on a `find_package`-only project renders just
its legend.

## Before you start

```sh
cmake --version
```

The binary line decides the gate spelling and which floor rule applies. Every
configure in this skill passes the gate for its line and, because a fetch may
be involved, `-DCMAKE_POLICY_DEFAULT_CMP0170=NEW`. Shipped probes assume
`cmake_minimum_required(VERSION 3.25...4.4)` (pinned).

| Binary line | `GATE` | A dependency floor of 3.5 to 3.9 | A floor below 3.5 |
|---|---|---|---|
| 3.x (3.31.12) | `-Werror=dev` | T6, fixed by CMK-DEP-30 | T6 as well: 3.31.12 prints the same deprecation for it |
| 4.0 to 4.3 (4.3.4) | `-Werror=dev` | T6, fixed by CMK-DEP-15 | T5, fixed by CMK-DEP-15 |
| 4.4 and newer (4.4.2) | `-Werror=author` | T6, fixed by CMK-DEP-15 | T5, fixed by CMK-DEP-15 |

When one command line must serve both sides of 4.4, use `-Werror=dev`: 4.4.2
still honours it and prints a deprecation note. `-Werror=author` below 4.4 is
ignored silently (CMK-CORE-01).

## The read order

Run the three steps in order, on the build tree that showed the symptom. The
examples use `build` and a package named `dep`. Substitute the leg's build
directory and the name exactly as the `find_package` call spells it.

### 1. Grep the cache, before any flag

```sh
NAME=dep
grep -rn --include='CMakeCache.txt' -e "^${NAME}_DIR" -e "^${NAME}_ROOT" -e '^VCPKG_INSTALLED_DIR' -e '^CMAKE_TOOLCHAIN_FILE' -e '^CMAKE_PROJECT_TOP_LEVEL_INCLUDES' build
```

The patterns are a union, so read each line. Non-empty output is expected.
Save it before step 2, because `--fresh` deletes the cache it came from.

| What the output shows | Reading | Go to |
|---|---|---|
| `dep_DIR` not under the current `dep_ROOT`, `CMAKE_PREFIX_PATH` entry or `VCPKG_INSTALLED_DIR` | A stale cache entry, or a rooted copy. Step 2 tells them apart | T1, T9 |
| `dep_DIR:PATH=<build>/CMakeFiles/pkgRedirects` | A FetchContent redirect answered. An installed copy was never consulted | T2 |
| No `dep_DIR` line, with `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` naming a provider | Expected under cmake-conan with `CMakeConfigDeps`: the provider sets `dep_DIR` as a normal variable (measured 3.31.12 and 4.4.2) | T3 |
| No `dep_DIR` line and no provider | A Find module answered, or the call never ran. Step 2 prints which | [references](references/reading-the-answers.md#module-mode-find_package) |
| `dep_DIR` under the expected prefix | The copy is right. A wrong version is the manager's | T8, T9 |

### 2. Reconfigure fresh, with the search printed

```sh
GATE=-Werror=dev
cmake -S . -B build --fresh "$GATE" -DCMAKE_POLICY_DEFAULT_CMP0170=NEW --debug-find-pkg="$NAME"
```

Pass the same `-D` hints and `--toolchain` the leg passes. A leg that
configures through a preset runs `cmake --preset "$PRESET" --fresh "$GATE" -DCMAKE_POLICY_DEFAULT_CMP0170=NEW
--debug-find-pkg="$NAME"` instead, so the preset's cache variables and its
`warnings` block apply exactly as in CI. `PRESET` is the leg's configure
preset.

- `The file was found at` followed by a path names the file that answered.
- `Package was found by the dependency provider` means a provider answered.
- On a reused tree the same flag lists only the cached candidate and prints
  the old answer with no warning (measured, both lines). That is why it never
  runs before step 1, and never without `--fresh`.
- If the gated configure stops at a floor error first, triage that first
  (T5, T6).

Then re-run the step 1 grep. A `dep_DIR` that moved to the hinted copy
confirms a stale cache (T1). One that stays on a manager's tree or a sysroot
is a rooted copy winning (T1, CMK-DEP-21).

### 3. On CMake 4.1 and newer, read the configure log

```sh
grep -rc --include='CMakeConfigureLog.yaml' -e 'kind: "find_package-v1"' build
grep -rn --include='CMakeConfigureLog.yaml' -e '^    name: ' -e '^      path: ' -e '^      mode: ' build
```

Run both only after the `--fresh` configure of step 2, because the log appends
on a reused tree (4.4.2 counted 2 events after one reconfigure). A count of 0
on 3.x is expected. A count of 0 on 4.1 or newer after a `find_package` ran is
a finding (CMK-DEP-17), except for a provider under `CMakeConfigDeps`, which
logs no event (4.4.2). The second command pairs each package `name:` with the
`path:` it resolved and its `mode:` (`config` or `module`). Empty output from
it means no `find_package` resolved in this configure.

## Pick the entry point

| # | Symptom | First read | Reading | Fixing rule |
|---|---|---|---|---|
| T1 | Wrong copy or version found. A re-pointed hint had no effect | Step 1, then step 2 | `_DIR` moves under `--fresh`: stale cache. It does not move: a rooted copy wins | CMK-DEP-13, CMK-DEP-21 |
| T2 | Installed copy ignored, fetched copy built | Step 1 | `_DIR` under `pkgRedirects` | CMK-DEP-07, CMK-DEP-09, CMK-DEP-32 |
| T3 | cmake-conan active, `find_program` or `find_library` NOTFOUND | Configure console output | `Loading conan_cmakedeps_paths.cmake` absent: `CMakeDeps`. Present: check the call's directory | CMK-TC-05, CMK-TC-04 |
| T4 | Consumer fails right after `Configuring done` with "The link interface of target ... not found" | The installed Config file | No `find_dependency` for a package on the link interface | CMK-INST-03, CMK-INST-01 |
| T5 | 4.x: "Compatibility with CMake < 3.5 has been removed" | The error's file:line | A dependency's floor | CMK-DEP-15 |
| T6 | Gate error: "Compatibility with CMake < 3.10 will be removed" | The error's file:line and `cmake --version` | 4.x: CMK-DEP-15. 3.x: CMK-DEP-30 | CMK-DEP-15, CMK-DEP-30 |
| T7 | Online configure passes, offline or override configure fails | The patch and override greps | An override of a patched dependency | CMK-DEP-31, CMK-DEP-16 |
| T8 | "Which version did Conan pick?" | `conan graph info` | The resolved reference and revision | CMK-CONAN-09 |
| T9 | vcpkg: wrong tree or wrong version | Step 1 | `_DIR` not under the current `VCPKG_INSTALLED_DIR`: T1 through vcpkg | CMK-DEP-13, CMK-VCPKG-01 |
| T10 | A provider registered, never called | Step 1, then the TC-04 grep | The project set or appended `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` | CMK-TC-04 |

## T1 Wrong copy, or a re-pointed hint had no effect

A resolved `find_package` keeps `<Pkg>_DIR` in the cache and reuses it on every
reconfigure. Re-pointing `<Pkg>_ROOT`, `CMAKE_PREFIX_PATH`, `VCPKG_INSTALLED_DIR`
or a Conan output folder leaves the old copy in force while the hint prints the
new value (measured, both lines). Step 2 settles which case you have:

- **`_DIR` moves under `--fresh`.** Stale cache. For a person, `--fresh`, a new
  build tree or `-U <Pkg>_DIR` is the fix. For a module that writes a `_ROOT`
  cache entry on every configure, the fix is CMK-DEP-13's guarded
  `unset(<Pkg>_DIR CACHE)` when the value changes. Worked example: a vendored
  bootstrap module writes `<name>_ROOT` as `CACHE PATH ... FORCE` and never
  unsets `<name>_DIR`, so after the pinned package changes, a Config-mode
  `find_package` keeps the old copy for as long as it exists on disk. List
  modules with that shape:

  ```sh
  grep -rlzE --include='*.cmake' -e '_ROOT[^)]*CACHE' . | xargs -r grep -L -e '_DIR CACHE'
  ```

  Empty output passes. A listed file writes a `_ROOT` cache entry and never
  unsets a `_DIR` one. A `FORCE` in that call is the finding.
- **`_DIR` stays put under `--fresh`.** A rooted copy won: `CMAKE_FIND_ROOT_PATH`
  or `CMAKE_SYSROOT` is non-empty, typically from vcpkg's toolchain or a cross
  toolchain, and every rooted candidate beats an unrooted `_ROOT` hint. Pin the
  copy with `<Pkg>_DIR` (CMK-DEP-21, and CMK-TC-10 under a Conan cross build).

A `<Pkg>_ROOT` hint also never reaches a top-level `find_program` or
`find_library`. Only `find_package(<Pkg>)` and the scripts it loads read it
(CMK-DEP-14).

## T2 Installed copy ignored, fetched copy built

`dep_DIR` under `CMakeFiles/pkgRedirects` means an `OVERRIDE_FIND_PACKAGE`
declare, or a `FIND_PACKAGE_ARGS` declare that fell through to a fetch, won.
The installed prefix never appears in `--debug-find-pkg` output (measured with
it on `CMAKE_PREFIX_PATH`, both lines). Name the declaring line with a grep, not
a trace: `--trace-source=CMakeLists.txt` misses a declare kept in a `.cmake`
module.

```sh
grep -rn --include='*.cmake' --include='CMakeLists.txt' -e 'OVERRIDE_FIND_PACKAGE' .
```

Empty output means no override declare exists, so look for a
`FIND_PACKAGE_ARGS` declare whose `find_package` missed. A hit in an installable
library outside a top-level guard is a CMK-DEP-07 finding. Any later
`find_package(dep 2.0 ...)` against the redirect passes with a blank version
(CMK-DEP-09). A CI leg that must test the installed copy asserts the step 1
path (CMK-DEP-32).

## T3 cmake-conan active, and a find_program or find_library is NOTFOUND

Providers intercept only `find_package` and `FetchContent_MakeAvailable`.
Capture the configure's console output. The tell appears there, and as the
file `build/conan/conan_cmakedeps_paths.cmake`, never in
`CMakeConfigureLog.yaml`:

```sh
PRESET=default
mkdir -p logs
cmake --preset "$PRESET" --fresh "$GATE" -DCMAKE_POLICY_DEFAULT_CMP0170=NEW > logs/configure.log 2>&1
grep -rn --include='configure.log' -e 'conan_cmakedeps_paths' logs
```

A leg without presets captures the step 2 `-S`/`-B` command the same way.

- **Empty output:** the generator is `CMakeDeps`, and no `find_program`,
  `find_library` or `find_path` ever sees Conan content.
- **`CMake-Conan: Loading conan_cmakedeps_paths.cmake file`:** `CMakeConfigDeps`.
  The paths exist only after the first intercepted `find_package`, and only in
  that directory scope and subdirectories added after it. A first call inside a
  subdirectory leaves the top level NOTFOUND even after its own later
  `find_package` (measured, 4.4.2).

The fix is CMK-TC-05: the first `find_package` of a Conan package goes in the
top-level `CMakeLists.txt`, before any `add_subdirectory`. `DEFER` runs at the
end of the directory, so it never helps. Details:
[references/reading-the-answers.md](references/reading-the-answers.md#dependency-providers).

## T4 Consumer fails after Configuring done

The error names the installed `*Targets.cmake` and "The link interface of
target ... contains: ... but the target was not found". The exporter never
redeclared a dependency on its link interface. The exporter's own build and
install, and a `LANGUAGES NONE` or interface-only consumer, all stay green.
Only a compiled consumer's Generate step fails (measured, both lines).

```sh
NAME=dep2
PREFIX=/usr/local
grep -rn --include="${NAME}Config.cmake" --include="${NAME}-config.cmake" -e 'find_dependency' "$PREFIX"
grep -rn --include="${NAME}*argets.cmake" -e 'INTERFACE_LINK_LIBRARIES' "$PREFIX"
```

Empty output from the first while the second names another package's target
is the finding (CMK-INST-03). The proof that the fix holds is the CMK-INST-01
round trip with a compiled consumer, never a green install.

## T5 CMake 4 removed compatibility below 3.5

```text
CMake Error at <dep>/CMakeLists.txt:1 (cmake_minimum_required):
  Compatibility with CMake < 3.5 has been removed from CMake.
```

The file:line is the dependency's floor. CMake's own text suggests
`-DCMAKE_POLICY_VERSION_MINIMUM=3.5` on the command line. Both halves are
wrong for a fix: the value must be 3.10, because 3.5 leaves the "< 3.10 will be
removed" deprecation that the gate turns into T6, and the scope must be the one
call that adds the dependency (CMK-DEP-15). List the existing writes:

```sh
grep -rn --include='*.cmake' --include='CMakeLists.txt' --include='CMakePresets.json' --include='*.yml' --include='*.yaml' -e 'CMAKE_POLICY_VERSION_MINIMUM' -e 'CMAKE_POLICY_DEFAULT_CMP' .
```

Empty output passes. Each hit must be a set/restore around one
`add_subdirectory`, `FetchContent_MakeAvailable`, `ExternalProject_Add` or
`find_package`, a `set()` inside a function, or a vcpkg port's own arguments. A
preset, workflow or file-scope hit is the finding.

## T6 The gate stops on "< 3.10 will be removed"

3.31.12 and 4.3.4 print `CMake Deprecation Error`, 4.4.2 prints
`CMake Error (deprecated)`, each at the dependency's `cmake_minimum_required`
line. `cmake --version` picks the rule:

- **4.x:** CMK-DEP-15, value 3.10, scoped as in T5.
- **3.x:** `CMAKE_POLICY_VERSION_MINIMUM` does not exist before 4.0. 3.31.12
  accepts it, prints "Manually-specified variables were not used" and changes
  nothing. The remedy is CMK-DEP-30: re-pin to a version that declares 3.10 or
  newer, or a `PATCH_COMMAND` that rewrites that one line (a `...4.0` range
  also clears it). Never a warning switch: `CMAKE_WARN_DEPRECATED=OFF`,
  `-Wno-dev` and `-Wno-deprecated` can each get past the gate on 3.31.12, and
  each silences the project's own deprecations with it.

## T7 Online passes, offline or override fails

`FETCHCONTENT_SOURCE_DIR_<X>` skips the declare's `PATCH_COMMAND`, so a patched
dependency pointed at pristine source fails the gate or builds differently
(measured on 3.31.12, 4.3.4 and 4.4.2).

```sh
grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'PATCH_COMMAND' .
grep -rn --include='CMakeLists.txt' --include='*.cmake' --include='CMakePresets.json' --include='CMakeUserPresets.json' --include='*.yml' --include='*.yaml' --include='*.sh' -e 'FETCHCONTENT_SOURCE_DIR_' .
```

Empty first output means no dependency is patched, so the cause is elsewhere in
the offline probe (CMK-DEP-16). A name in both lists whose override directory
lacks the patched line is the finding (CMK-DEP-31). The offline probe itself
always carries `-DCMAKE_POLICY_DEFAULT_CMP0170=NEW`. Without it, a missing
source directory configures and exits 0.

## T8 Which version did Conan pick

```sh
conan graph info . --profile:host=default --profile:build=default
```

Pass the profiles, settings, options and lockfile the build's `conan install`
uses. Read the `Requirements` block: each line is `name/version#revision`,
then `- Cache` or `- Missing`. `conan graph explain` answers a
different question, why no existing binary matches: on a resolved graph it
exits 1 with `ERROR: There is no missing binary`, and on a missing binary it
exits 0 with a `Closest binaries` block whose `diff` lists `expected:` against
`existing:` settings. A range that did not float, or floated only in CI, starts
at the lock: a `conan.lock` in the working directory is picked up with no flag
(CMK-CONAN-09).

```sh
grep -rn --include='conanfile.py' --include='conanfile.txt' -e '/\[' .
grep -rn -e 'conan install' .github
grep -rn -e '--lockfile[= ]' -e ' -l ' .github
grep -rn -e '--lockfile=""' -e "--lockfile=''" -e '--lockfile= ' -e '--lockfile=$' -e '--lockfile-partial' .github
```

A hit from the first means ranges exist, and `git ls-files conan.lock` must then
be non-empty. Empty output from the first means no ranges, so the rule is not
applicable. Empty output from the second means CI runs no `conan install` (not
applicable). An install line from the second that is missing from the third is
the finding. The fourth must be empty: an empty `--lockfile=` switches the lock
off.

## T9 vcpkg: wrong tree or wrong version

Step 1's `VCPKG_INSTALLED_DIR` and `<Pkg>_DIR` lines answer "which tree". A
`_DIR` not under the current installed directory is T1 through vcpkg, fixed
the same way (measured 2026-09-26 with vcpkg-tool 2026-09-26).
`VCPKG_TRACE_FIND_PACKAGE` logs every `find_package` call whoever answers it,
and `vcpkg depend-info` reads only the manifest, so neither is provenance. A
wrong version is the manifest's baseline (CMK-VCPKG-01). vcpkg has no lockfile
(CMK-VCPKG-11). A `VCPKG_*` variable set after the first `project()` is
ignored with exit 0 (CMK-TC-03, CMK-VCPKG-04).

## T10 A provider registered, never called

Step 1 shows the user's file in `CMAKE_PROJECT_TOP_LEVEL_INCLUDES`, and step 2
never prints `Package was found by the dependency provider`. A project `set()`
of that variable hides the user's file entirely, and a `list(APPEND)` loads it
and then registers its own provider last, which wins silently.

```sh
grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'SET_DEPENDENCY_PROVIDER' -e 'CMAKE_PROJECT_TOP_LEVEL_INCLUDES' .
```

Empty output passes. Any `CMakeLists.txt` hit, or a module that sets or
appends the variable, is the finding (CMK-TC-04).

## Pinned defaults

Agreed decisions, not derivations. Each is a default an adopter overrides once,
and none is re-litigated during a triage.

| Decision | Default (pinned) |
|---|---|
| Floor of every shipped probe | `cmake_minimum_required(VERSION 3.25...4.4)` |
| Gate spelling | `-Werror=author` on 4.4 and newer, `-Werror=dev` on 4.3 and older, `-Werror=dev` when one command line serves both |
| `CMAKE_POLICY_VERSION_MINIMUM` | 3.10, scoped to one call (CMK-DEP-15). 3.5 only inside a vcpkg port build. On 3.x, CMK-DEP-30 |
| Conan flow | Explicit `conan install`, then `cmake --preset`. The cmake-conan provider is legal within CMK-TC-05's limits, and `DEFER` is never offered as a fix |
| Managers per configure | One manager of record (CMK-PKG-01, CMK-TC-02) |

## MUST rows this procedure enforces

Duplicated as a hedge against the scoped rule set not being loaded. The rule
text, rationale and full verification live in the `cmake-build` and
`cpp-packaging` rule sets, and a disputed row is settled there.

| # | Finding | Rule |
|---|---|---|
| 1 | An application whose `requires` or `tool_requires` use a version range commits `conan.lock`. CI passes `--lockfile=conan.lock` explicitly and never `--lockfile-partial`. The lock is regenerated with `--lockfile-out` (plus `--lockfile-clean`), never edited by hand | CMK-CONAN-09 |
| 2 | An installable library resolves its dependencies with `find_package` and never forces acquisition | CMK-DEP-07 |
| 3 | Treat `<Pkg>_DIR` as the sticky record of which copy was found. To switch copies use a fresh build tree, `--fresh` or `-U <Pkg>_DIR`. A module that re-points `<Pkg>_ROOT` on reconfigure must `unset(<Pkg>_DIR CACHE)` whenever the hint's value changes | CMK-DEP-13 |
| 4 | On CMake 4.x, set a third-party dependency's policy knobs with set/restore around the one `add_subdirectory`, `FetchContent_MakeAvailable` or `find_package` that loads it, with `CMAKE_POLICY_VERSION_MINIMUM` at 3.10. Never use a project-wide `set()`, a committed preset `cacheVariables` entry, or a CI environment variable | CMK-DEP-15 |
| 5 | Make every configure-time network touch satisfiable offline | CMK-DEP-16 |
| 6 | On CMake 3.x, clear a fetched or vendored dependency whose floor is 3.5 to 3.9 by re-pinning to a version that declares 3.10 or newer, or with a `PATCH_COMMAND` that rewrites that one `cmake_minimum_required` line. Never use `-DCMAKE_WARN_DEPRECATED=OFF`, `-Wno-dev`, `-Wno-deprecated`, `-Wno-error=deprecated` or a preset's `"warnings": {"deprecated": false}` as the remedy | CMK-DEP-30 |
| 7 | Point an offline or override configure (`FETCHCONTENT_SOURCE_DIR_<X>`, including the CMK-DEP-16 probe) only at source that already carries the declare's `PATCH_COMMAND` result | CMK-DEP-31 |
| 8 | Whenever install, export, Config-template or dependency wiring changes, prove the package can be consumed with the round-trip script. Never treat a green build and install as proof | CMK-INST-01 |
| 9 | In the Config template, redeclare every imported dependency that sits on an exported target's PUBLIC or INTERFACE link line with `find_dependency()`, under the same condition the build used to add it. Never use a raw `find_package()` there | CMK-INST-03 |
| 10 | Leave the dependency provider to the user. Never `set()` or `list(APPEND)` `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` from project or module code, and list at most one provider-registering file per configure | CMK-TC-04 |
| 11 | Never design on a provider seeing `find_program`, `find_library` or `find_path`. With cmake-conan they see Conan content only under `CMakeConfigDeps`, only after the first intercepted `find_package`, and only in that directory scope, so the first `find_package` of a Conan package goes in the top-level `CMakeLists.txt` before any `add_subdirectory`. `DEFER` is not an ordering fix | CMK-TC-05 |

## Failure modes

1. **"Fixing" a floor error with a global switch** (`CMAKE_WARN_DEPRECATED=OFF`,
   `-Wno-dev`, `-Wno-deprecated`, a preset's `"deprecated": false`, a preset
   or CI `CMAKE_POLICY_VERSION_MINIMUM`), or with the value 3.5.
2. **Emitting `CMAKE_POLICY_VERSION_MINIMUM` for a 3.x build.** It is 4.0 and
   newer, and 3.31.12 ignores it with exit 0.
3. **Assuming a provider widens search paths like a toolchain file**, or that
   `DEFER` makes a call run earlier. It runs later.
4. **Reading an empty `_DIR` grep as "never looked up"** when a Find module or
   a `CMakeConfigDeps` provider answered.
5. **Wiping the build tree first.** The stale `_DIR` was the evidence.
   Record step 1, then `--fresh`.
6. **Passing `FETCHCONTENT_SOURCE_DIR_<X>` for a patched dependency**, then
   debugging the dependency instead of the dropped patch.
7. **Proving a missing `find_dependency` fixed with a `LANGUAGES NONE` smoke
   consumer.** It stays green either way. Only a compiled consumer fails.

## References

Read one level down, on demand.

| File | Read it when |
|---|---|
| [references/reading-the-answers.md](references/reading-the-answers.md) | An output does not match a row above. Holds, per mechanism, what each writes into the cache, the redirects directory and the configure log: Config and Module mode, FetchContent redirects, providers, toolchain-injected paths, the Conan graph and vcpkg |

Re-check on each tool bump: the cmake-conan provider's `CMakeConfigDeps`
behaviour and whether `CMakeConfigDeps` leaves experimental status (Conan
2.32.0, 2026-09-26), the `find_package-v1` event layout (4.4.2), and vcpkg's
no-lockfile, no-provider stance (vcpkg-tool 2026-09-26).

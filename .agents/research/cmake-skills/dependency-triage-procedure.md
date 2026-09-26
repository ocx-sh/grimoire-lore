---
title: The CMake dependency-triage procedure, from symptom to mechanism
topic: Symptom-routed diagnosis for a CMake dependency graph that resolved the wrong thing, silently or loudly
agent: cmake-dependency-triage-procedure
model: sonnet
kind: measure
date_researched: 2026-09-26
sources_count: 16
scope: |
  Turns the resolution table and CMK-DEP-17's reading order (cmake-dependency-seam.md)
  into an ordered, symptom-routed triage procedure with six deliberately broken
  scratch projects, each run on CMake 3.31.12 and 4.4.2, plus the real Conan
  2.32.0 / cmake-conan provider and vcpkg-tool 2026-09-26. Does not re-measure
  resolution order itself, and does not restate the CMK-DEP/CMK-TC/CMK-VER/CMK-INST
  rule text this procedure cites by ID.
---

## Contents

1. [Summary](#summary)
2. [Findings](#findings)
   - [F1 — FetchContent silently substituted via OVERRIDE_FIND_PACKAGE](#f1)
   - [F2 — the wrong of two installed copies, stale `_DIR`](#f2)
   - [F2v — the same defect through vcpkg's toolchain](#f2v)
   - [F3 — the real cmake-conan provider and the sequencing effect (CMK-TC-05)](#f3)
   - [F4 — a Config file missing `find_dependency`](#f4)
   - [F5 — a fetched dependency with a 3.4 floor, on 4.4.2](#f5)
   - [F6 — a fetched dependency with a 3.7 floor, under `-Werror=dev` on 3.31.12](#f6)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- The first command for "which copy resolved" is never `--debug-find-pkg`: read `<Pkg>_DIR` in `CMakeCache.txt` against the current `<Pkg>_ROOT` value first, because a reconfigure that reuses a cached `_DIR` prints the *old* answer confidently, not an error (measured, 3.31.12 and 4.4.2).
- On CMake ≥4.1, `CMakeFiles/CMakeConfigureLog.yaml`'s `find_package-v1` event's `found.path` names the prefix actually used; on 3.31.12 that event does not exist at all (`cmake-configure-log(7)`, `versionadded:: 4.1`; zero `find_package-v1` events measured on 3.31.12 for an identical configure).
- `dep_DIR` found under `CMakeFiles/pkgRedirects/` rather than a real prefix is itself the tell for `OVERRIDE_FIND_PACKAGE` substitution — no separate "was this fetched" check is needed once you know to read the path (measured, both lines).
- `cmake --graphviz` shows the *target* graph, never which prefix or fetch satisfied a dependency; on a `find_package`-only project with no targets it renders only the legend (measured, 4.4.2). Do not route a "which copy" triage through it.
- `cmake -L` omits an `UNINITIALIZED`-type entry: a `-D<Pkg>_ROOT=...` that the project never `CACHE`s is invisible to `-L` even though it is live in `CMakeCache.txt` (measured, 4.4.2). Grep the cache file directly instead.
- A missing `find_dependency()` in an installed Config file produces a **clean, green configure** for both the exporting project and a `LANGUAGES NONE` consumer that never links a real target; the error appears only at a downstream consumer's **Generate** step, one line after "Configuring done", when a genuine compiled target actually links (measured on 3.31.12 and 4.4.2; matches CMK-INST-01's own claim, now independently reproduced with the exact failure point pinned down).
- The cmake-conan dependency provider never populates `CMAKE_PREFIX_PATH`: a `find_program`/`find_library` sees the same empty value before *and after* the intercepted `find_package` succeeds (measured with the real `conan-io/cmake-conan@b1593849dd` provider and Conan 2.32.0). The provider satisfies `find_package(Beta)` by injecting `Beta_DIR`/`Beta::beta` directly, not by widening the search path.
- `cmake_language(DEFER CALL find_package ...)` schedules the call for the **end** of the current listfile's processing (`cmake_language.rst`, `versionadded:: 3.19`), confirmed by measurement: it fires strictly *after* every non-deferred command in the same file, including a `find_program` at the top. It cannot make an earlier `find_program` see Conan's paths — its value is a single, deterministic trigger point regardless of which subdirectory holds the "real" first `find_package`, not a fix for command order.
- `conan graph explain` is not a general dependency-graph reader: run against a graph with no missing or mismatched binary it prints `ERROR: There is no missing binary` and exits nonzero (measured, Conan 2.32.0). Use `conan graph info` to read a resolved graph; reserve `graph explain` for an actual missing-binary investigation.
- `VCPKG_TRACE_FIND_PACKAGE=ON` works by macro-overriding `find_package` itself inside `vcpkg.cmake` (`microsoft/vcpkg-tool@51bf87ca6e:scripts/buildsystems/vcpkg.cmake:811-826`); it logs every call whether or not vcpkg is what satisfies it, so a trace hit is not by itself evidence that vcpkg resolved the package.
- vcpkg's toolchain integration has no staleness protection of its own: a CMake build tree whose `VCPKG_INSTALLED_DIR` is repointed keeps the old `<pkg>_DIR` cache entry exactly like the plain-CMake case, because the toolchain only ever widens `CMAKE_PREFIX_PATH` — CMake's own `find_package` cache is what sticks (measured with a real `vcpkg-glibc install` against two overlay-port versions).
- `vcpkg depend-info` answers "what does the manifest declare", never "which installed tree did this configure use" — it is a manifest reader, not a per-configure diagnostic (measured).
- `CMAKE_POLICY_VERSION_MINIMUM` does not exist on 3.31.12 (`versionadded:: 4.0`); on a floor below 3.5, 4.4.2 without any remedy is a hard `FATAL_ERROR` naming the exact fix in its own text (measured).
- Setting `CMAKE_POLICY_VERSION_MINIMUM 3.5` scoped around one dependency clears the hard-error tier but leaves a "< 3.10 will be removed" deprecation warning live; setting it to `3.10` clears both tiers with zero warnings (measured, 4.4.2) — this is the reading behind CMK-VER-06's "3.10 clears both tiers".
- On 3.x, where the variable does not exist, CMK-VER-06's remedy for a stale floor is not a flag at all: **patch the dependency's `cmake_minimum_required` line (a `FetchContent` `PATCH_COMMAND`), or re-pin to a version that already declares a floor ≥3.10.** Both were measured clean, with zero warnings, and both leave `-Werror=dev` fully live for the project's own code.
- **Correction to the wave-2 consolidation:** `-DCMAKE_WARN_DEPRECATED=OFF` *does* survive `-Werror=dev` on 3.31.12 — it suppresses the deprecation entirely and exits 0 (measured twice, reproducibly). The consolidation's CMK-DEP-15 rationale ("`CMAKE_WARN_DEPRECATED OFF` does not survive `-Werror=dev` [M9]") does not hold as stated. The practical verdict is unchanged for a different, better reason: the same flag also silences a genuine deprecation warning in the *project's own* `CMakeLists.txt` (measured), so it does not "keep the gate live" — it disables the gate wholesale, project-wide, which is worse than the stated defect and is why it stays a forbidden remedy.
- `-Wno-error=deprecated` does **not** clear a `cmake_minimum_required`-floor deprecation when `-Werror=dev` is also passed, in either flag order (measured, 3.31.12): the same warning is independently escalated by the `dev` category, and `-Wno-error=deprecated` only cancels the `deprecated` category's own escalation. `-Wno-dev` (not `-Wno-error=deprecated`) is what silences it, and that suppresses the warning outright rather than un-erroring it.

## Findings

Binaries: CMake **3.31.12** and **4.4.2** via `ocx package exec kitware/cmake:<line>`. Conan **2.32.0** from the scratch venv (`CONAN_HOME` pointed at an offline local cache holding `pkgb/1.0`). vcpkg-tool **2026-09-26** (`vcpkg package management program version 2026-09-26-51bf87ca6e`). `CMAKE_CXX_COMPILER` is a two-line wrapper around `/opt/zig/zig c++` (identifies as Clang 21.1.0). All scratch sources are under `scratch/dependency-triage/` next to this file, with a `run.sh` that reproduces every command below; build trees themselves live under `/home/mherwig/.cache/cmake-measure-scratch/triage/` and are not committed.

<a id="f1"></a>

### F1 — FetchContent silently substituted via `OVERRIDE_FIND_PACKAGE`

Setup: `dep` is installed at a real prefix (`dep-A`, marker `A`). The consumer does:

```cmake
include(FetchContent)
FetchContent_Declare(dep
  SOURCE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../f1-fetched-dep"   # marker "FETCHED"
  OVERRIDE_FIND_PACKAGE
)
FetchContent_MakeAvailable(dep)
find_package(dep CONFIG REQUIRED)
```

configured with `-DCMAKE_PREFIX_PATH=<dep-A>` — the real installed copy is on the search path the whole time.

```sh
ocx package exec kitware/cmake:4.4 -- cmake -S f1-consumer -B build --fresh \
  -DCMAKE_PREFIX_PATH=<dep-A> --debug-find-pkg=dep
grep '^dep_DIR' build/CMakeCache.txt
```

Output: `dep_DIR:PATH=<build>/CMakeFiles/pkgRedirects` — never `<dep-A>/...`. Identical on 3.31.12. `--debug-find-pkg=dep` prints only the redirect-dir candidates (`.../pkgRedirects/dep.cps`, `depConfig.cmake`, `dep-config.cmake`); it never mentions `dep-A` at all, because the redirect happens before the normal search paths are even consulted. `CMakeFiles/pkgRedirects/dep-config-version.cmake` is the versionless stub CMake writes for this case:

```cmake
# Version not available, assuming it is compatible. We must also say it is an
# exact match to ensure find_package() calls with the EXACT keyword still get
# redirected.
set(PACKAGE_VERSION_COMPATIBLE TRUE)
set(PACKAGE_VERSION_EXACT TRUE)
```

`--trace-expand --trace-source=CMakeLists.txt` names the exact declaring line (`FetchContent_Declare(dep SOURCE_DIR ... OVERRIDE_FIND_PACKAGE)`) — this is in practice the fastest diagnostic, because it is also a static grep: `OVERRIDE_FIND_PACKAGE` cannot appear without the substitution being possible. `CMakeConfigureLog.yaml`'s `find_package-v1` event (4.4.2 only) shows `found.path` under `pkgRedirects` too, confirming the same fact from a different angle. `FetchContent.cmake`'s own module docs state the mechanism directly: "`OVERRIDE_FIND_PACKAGE`... subsequent calls to `find_package(<name> ...)` will ensure that `FetchContent_MakeAvailable(<name>)` has been called, then use the config package files in the `CMAKE_FIND_PACKAGE_REDIRECTS_DIR` directory" (`Modules/FetchContent.cmake@v4.4.2:211-219`) — the installed copy is never consulted once the override fires, whatever `CMAKE_PREFIX_PATH` says. Cites CMK-DEP-07 (a library must not force acquisition) and CMK-DEP-09 (never trust a version check against a redirected name).

<a id="f2"></a>

### F2 — the wrong of two installed copies, stale `_DIR`

Two real installed copies, `dep-A` (marker `A`) and `dep-B` (marker `B`). Consumer: `find_package(dep CONFIG REQUIRED)`.

```sh
ocx package exec kitware/cmake:4.4 -- cmake -S f2-consumer -B build --fresh -Ddep_ROOT=<dep-A>
ocx package exec kitware/cmake:4.4 -- cmake -S f2-consumer -B build -Ddep_ROOT=<dep-B> --debug-find-pkg=dep
grep -e '^dep_DIR' -e '^dep_ROOT' build/CMakeCache.txt
```

```
dep_DIR:PATH=<dep-A>/lib/cmake/dep
dep_ROOT:UNINITIALIZED=<dep-B>
```

`dep_DIR` never moved. Identical on 3.31.12. Three diagnostics were tried, with sharply different value:

- **`--debug-find-pkg=dep` on the reconfigure is nearly useless here.** It prints `-- dep: resolved copy = A` and a "CMake Debug Log" block that lists exactly one candidate — the cached `depConfig.cmake` under `dep-A` — because a valid cached `_DIR` short-circuits the search entirely. It does not print `dep-B` anywhere, does not warn, and does not show that `dep_ROOT` changed. Reading it alone, a reviewer would conclude "dep resolves fine."
- **`CMakeFiles/CMakeConfigureLog.yaml`'s `found.path` (4.1+) is the one diagnostic that actually shows the mismatch**, because it prints the absolute path found (`.../dep-A/lib/cmake/dep/depConfig.cmake`) next to a `settings` block, which a reviewer can hold against the current `dep_ROOT` cache value (`dep-B`) to see the contradiction directly. On 3.31.12, `grep 'kind:' CMakeConfigureLog.yaml` finds only a `message-v1` event, never `find_package-v1` — this event kind is 4.1+ (`cmake-configure-log(7)`, `versionadded:: 4.1`), confirmed measured (zero hits on an identical 3.31.12 configure).
- **`cmake -L build | grep dep`** prints only `dep_DIR`; `dep_ROOT` never appears, because it is `UNINITIALIZED` in `CMakeCache.txt` (never `CACHE`d by the project) and `-L` does not list that entry type. Grepping `CMakeCache.txt` directly is the only reliable read.
- **`cmake --graphviz`** was tried and produced no signal at all: the consumer has no targets, so the `.dot` file contains only the fixed shape/color legend. Even with real targets, graphviz draws the target-link graph, never a package's resolved prefix. This diagnostic does not belong in the "which copy" triage at all — a negative, measured result.

The fix, `unset(dep_DIR CACHE)` whenever the hint changes (or `--fresh`), was confirmed to work (`f2-consumer` reconfigured with `--fresh` correctly reports `B`). Cites CMK-DEP-13 (the rule), CMK-DEP-17 (this diagnostic order).

<a id="f2v"></a>

### F2v — the same defect through vcpkg's toolchain

Two overlay-port builds of `widget/1.0` (markers `A`/`B`), each installed to its own `--x-install-root` via the real `vcpkg-glibc` binary (`vcpkg_install_copyright` is the only helper needed; no `vcpkg-cmake` port fetch required). Consumer uses `CMAKE_TOOLCHAIN_FILE=vcpkg.cmake`, `VCPKG_MANIFEST_MODE=OFF`, `VCPKG_INSTALLED_DIR` pointed first at `installed-A`, then reconfigured pointing at `installed-B`:

```
VCPKG_INSTALLED_DIR:PATH=<installed-B>
widget_DIR:PATH=<installed-A>/x64-linux/share/widget
```

Identical mechanism to F2: `widget_DIR` is a plain CMake `find_package` cache entry, and vcpkg's toolchain never touches it after the first configure — it only ever *adds* to `CMAKE_PREFIX_PATH` at the start. `VCPKG_TRACE_FIND_PACKAGE=ON` logs `find_package(widget CONFIG REQUIRED)` on both configures but shows nothing about the staleness (the same output both times); it is implemented as a macro override of `find_package` inside `vcpkg.cmake` (`microsoft/vcpkg-tool@51bf87ca6e:scripts/buildsystems/vcpkg.cmake:811-826`) and only ever reports that the call happened, never which prefix answered it. `vcpkg depend-info --x-manifest-root=... ` on the manifest prints only `widget:` (the declared dependency, no versions, no resolution state) — it is a manifest reader, not a per-configure diagnostic; it cannot answer this question at all. The fix is identical to CMK-DEP-13's: a fresh build tree, `--fresh`, or `-U widget_DIR`.

<a id="f3"></a>

### F3 — the real cmake-conan provider and the sequencing effect (CMK-TC-05)

`conan-io/cmake-conan@b1593849dd:conan_provider.cmake`, registered via `CMAKE_PROJECT_TOP_LEVEL_INCLUDES`, against `pkgb/1.0` in the local Conan cache (its CMake-facing name is `Beta`/`Beta::beta`, a recipe property, not a naming mistake — `pkgb/1.0`'s `conanfile.py` sets `cmake_file_name`/`cmake_target_name` to `Beta`). `CONAN_HOST_PROFILE=default` (default profile: `compiler=gcc/15`) is required to keep Conan's binary lookup matching `pkgb/1.0`'s existing gcc-built binary, since the zig-c++ wrapper self-identifies as Clang and the provider's `auto-cmake` profile layer would otherwise request a `compiler=clang` binary that was never built.

```cmake
message(STATUS "[before] CMAKE_PREFIX_PATH=${CMAKE_PREFIX_PATH}")
find_program(SEQ_PROG NAMES seq)
find_library(EARLY_LIB NAMES anything_early)
find_package(Beta REQUIRED)
message(STATUS "[after] CMAKE_PREFIX_PATH=${CMAKE_PREFIX_PATH}")
```

Result on 4.4.2 (`rc=0`):

```
-- [before] CMAKE_PREFIX_PATH=
-- [before find_package] find_program(seq)=/usr/sbin/seq
-- [before find_package] find_library(anything_early)=EARLY_LIB-NOTFOUND
-- CMake-Conan: first find_package() found. Installing dependencies with Conan
-- [after] CMAKE_PREFIX_PATH=
-- HAVE_TARGET Beta::beta after find_package
```

`CMAKE_PREFIX_PATH` is empty **before and after** the intercepted call. `Beta::beta` still exists, because the provider satisfies the call by generating `Beta_DIR`/`BetaConfig.cmake` and letting the ordinary `find_package` machinery pick them up directly — it never widens the search path for anything else. This sharpens CMK-TC-05 beyond "sequencing": a bare `find_program`/`find_library`, whether placed before *or after* the first `find_package`, never sees Conan's paths through `CMAKE_PREFIX_PATH`, because the provider does not use that mechanism at all. The cmake-conan README's own "any `find_*` before the first `find_package` misses Conan" is the narrower, true half of a broader fact: no `find_*` other than `find_package` (and `FetchContent_MakeAvailable`) is ever in scope, at any point in the file.

The `cmake_language(DEFER)` "workaround" was measured directly and does **not** do what an agent might assume:

```cmake
find_program(SEQ_PROG NAMES seq)
message(STATUS "[before deferred find_package] SEQ_PROG=${SEQ_PROG}")
cmake_language(DEFER CALL find_package Beta REQUIRED)
message(STATUS "[end of top-level, before DEFER fires] listfile done")
```

```
-- [before deferred find_package] SEQ_PROG=/usr/sbin/seq
-- [end of top-level, before DEFER fires] listfile done
-- CMake-Conan: first find_package() found. Installing dependencies with Conan
```

The deferred call fires **after** every other command in the file, matching `cmake_language.rst`'s own text ("executed as if written at the end of the current directory's `CMakeLists.txt` file", `versionadded:: 3.19`). It makes the provider's trigger point later, never earlier, so it cannot rescue an earlier `find_program`. Its real value — as used in `aminya/project_options@412045e1f1:src/Conan.cmake:241-249` — is to guarantee the intercepted call fires exactly once, from a known, deterministic point (the top-level directory), regardless of which subdirectory happens to hold whatever the project's "natural" first `find_package` is. Treating DEFER as a fix for command order is the mistake to catch.

`conan graph info f3-provider --profile:host=default --profile:build=default -s build_type=Release` printed the full resolved graph (`pkgb/1.0#<revision> - Cache`) — the right tool for "what did Conan resolve." `conan graph explain` against the same inputs, with no missing binary, printed:

```
======== Retrieving and computing closest binaries ========
ERROR: There is no missing binary
```

`graph explain`'s own `--help` text says what it is for: "report missing binaries['] closest alternatives, trying to explain why the existing binaries do not match" — it is not a substitute for `graph info` when nothing is actually missing. **Not demonstrated:** a genuine missing/mismatched-binary scenario for `graph explain`'s positive output (would need a profile change that leaves no matching binary in cache); the `CMakeConfigDeps` generator path on 4.3+ (only `CMakeDeps` was exercised here — wave 2's `provider/b-CMakeConfigDeps.log` covers that leg separately and is cited, not re-run).

<a id="f4"></a>

### F4 — a Config file missing `find_dependency`

`dep2` links `dep::dep` and installs a hand-written `dep2Config.cmake` that only does `include(dep2Targets.cmake)` — no `find_dependency(dep)`.

**With a `LANGUAGES NONE` consumer that never actually links anything** (`add_library(app INTERFACE)`, `target_link_libraries(app INTERFACE dep2::dep2)`):

```sh
ocx package exec kitware/cmake:4.4 -- cmake -S f4-consumer -B build --fresh -DCMAKE_PREFIX_PATH=<f4-prefix>
```

`rc=0`. Completely clean. No warning, no error, `--debug-find-pkg=dep2` shows a normal successful resolution. **The defect is entirely invisible at this level** — CMake never validates an `INTERFACE_LINK_LIBRARIES` target reference until something actually needs to compute a real link line.

**With a real `add_executable(app main.cpp)` and `-DCMAKE_CXX_COMPILER=<zig-wrapper>`:**

```sh
ocx package exec kitware/cmake:4.4 -- cmake -S f4-consumer2 -B build --fresh -G Ninja \
  -DCMAKE_MAKE_PROGRAM=<ninja> -DCMAKE_CXX_COMPILER=<zig-wrapper> -DCMAKE_PREFIX_PATH=<f4-prefix>
```

```
-- Configuring done (0.2s)
CMake Error at <prefix>/lib/cmake/dep2/dep2Targets.cmake:61 (set_target_properties):
  The link interface of target "dep2::dep2" contains: ...
  but the target was not found.  Possible reasons include:
    * There is a typo in the target name.
    * A find_package call is missing for an IMPORTED target.
    * An ALIAS target is missing.
```

`rc=1`, identical error text and location on 3.31.12. The error fires immediately after "Configuring done", inside the Generate step, not from `find_package(dep2)` itself. This confirms CMK-INST-01's own rationale ("a missing `find_dependency` fails only in the downstream consumer's Generate step") with the exact failure point pinned down, and sharpens the triage consequence: **testing an installed package with a `LANGUAGES NONE` or header-only-interface-only smoke test proves nothing about a missing `find_dependency`.** The round-trip must link a real, compiled target. Cites CMK-INST-01 (prove consumability by round-trip, never by a green build+install) and CMK-INST-03 (the fix: `find_dependency()` under the same condition the build used).

<a id="f5"></a>

### F5 — a fetched dependency with a 3.4 floor, on 4.4.2

```sh
ocx package exec kitware/cmake:4.4 -- cmake -S f5-consumer -B build --fresh
```

```
CMake Error at .../f5-fetched-old34/CMakeLists.txt:1 (cmake_minimum_required):
  Compatibility with CMake < 3.5 has been removed from CMake.
  ...
  Or, add -DCMAKE_POLICY_VERSION_MINIMUM=3.5 to try configuring anyway.
```

`rc=1`, hard `FATAL_ERROR`, and CMake's own error text names the exact global-flag remedy. Scoping it around the one `FetchContent_MakeAvailable` call instead (`set(CMAKE_POLICY_VERSION_MINIMUM 3.5) ... unset(...)`) configures cleanly but leaves a live `CMake Deprecation Warning: Compatibility with CMake < 3.10 will be removed`; raising the scoped value to `3.10` clears both tiers with **zero** warnings (measured, both cases). This is the concrete reading behind CMK-VER-06's "3.10 clears both tiers" line: 3.5 is the minimum that avoids the *hard error*, 3.10 is the minimum that avoids the *deprecation warning* too.

<a id="f6"></a>

### F6 — a fetched dependency with a 3.7 floor, under `-Werror=dev` on 3.31.12

Baseline, no remedy:

```sh
ocx package exec kitware/cmake:3.31 -- cmake -S f6-consumer -B build --fresh -Werror=dev
```

```
CMake Deprecation Error at .../f6-fetched-old37/CMakeLists.txt:1 (cmake_minimum_required):
  Compatibility with CMake < 3.10 will be removed from a future version of CMake.
```

`rc=1`. Without `-Werror=dev` the identical message prints as `CMake Deprecation Warning` and `rc=0` — confirms CMK-VER-05's gate mechanism exactly. `CMAKE_POLICY_VERSION_MINIMUM` is undefined on 3.31.12 (`versionadded:: 4.0`), so none of the 4.x remedy is available; four remedies were measured:

| # | Remedy | Command | Result | Keeps the gate live for the project's own code? |
|---|---|---|---|---|
| 1 | `FetchContent` `PATCH_COMMAND` rewriting the floor | `PATCH_COMMAND sed -i "s/VERSION 3.7/VERSION 3.10/" CMakeLists.txt` on a `GIT_REPOSITORY` declare (`SOURCE_DIR`-only declares skip the patch step entirely — a local `file://` git repo was created to exercise this) | `rc=0`, zero warnings; the fetched source itself now reads `VERSION 3.10` (verified by reading the populated `_deps/old37-src/CMakeLists.txt`) | **Yes** — nothing global changed |
| 2 | `-Wno-error=deprecated` alongside `-Werror=dev` | both orders tried | **`rc=1`, unchanged** — still `CMake Deprecation Error` | N/A — does not clear the gate at all when the CI gate is specifically `-Werror=dev` |
| 3 | `-DCMAKE_WARN_DEPRECATED=OFF` | `-Werror=dev -DCMAKE_WARN_DEPRECATED=OFF` | `rc=0` (plus a harmless "Manually-specified variables were not used" notice) | **No** — the identical flag also silenced a genuine `cmake_policy(VERSION 3.7)` deprecation in a *separate own-code* test project under the same `-Werror=dev`, so it defeats the gate project-wide, not just for the one dependency |
| 4 | Re-pin to a version whose floor is already ≥3.10 | fetch a later git ref of the same repo whose `CMakeLists.txt` already reads `VERSION 3.10` | `rc=0`, zero warnings | **Yes** |

Remedy 2's failure is itself a measured, non-obvious result: `cmake --help` classifies `-Werror=dev`/`-Wno-error=dev` and `-Werror=deprecated`/`-Wno-error=deprecated` as two independent pairs, but a `cmake_minimum_required` floor warning is escalated by **either** category on its own — `-Wno-error=deprecated` only cancels the `deprecated` category's escalation, and `-Werror=dev` still fires independently. Only `-Wno-dev` (which suppresses the warning's emission outright, a strictly bigger hammer) makes it go away, confirmed separately (`-Werror=dev -Wno-dev` → `rc=0`).

**Correction to the wave-2 consolidation:** CMK-DEP-15's rationale states "`CMAKE_WARN_DEPRECATED OFF`... does not survive `-Werror=dev` [M9]". Measured twice, reproducibly, on 3.31.12, remedy 3 above shows the opposite: the flag *does* survive and does suppress the error. The rule's practical verdict (don't use it) is still correct, for the sharper and more damaging reason measured here: it is not narrowly scoped, it silences deprecations in the consumer's own code under the same flag. This correction should be carried back into `cmake-dependency-seam.md`'s CMK-DEP-15 rationale by whichever pass next touches that file; this dive does not edit it.

## Normative guidance candidates

Each rule is checkable in the shape the validator expects; empty-output direction is stated for every grep.

1. **Diagnose "which copy resolved" by reading `<Pkg>_DIR` against the current `<Pkg>_ROOT`/`CMAKE_PREFIX_PATH` in `CMakeCache.txt`, never by running `--debug-find-pkg` alone on a tree that already has a cached `_DIR`.**
   - *Rationale:* a cached, valid `_DIR` short-circuits the search; `--debug-find-pkg` then reports only that one candidate and nothing about a hint that changed (F2, measured).
   - *Verify:* `NAME=dep; grep -n -e "^${NAME}_DIR" -e "^${NAME}_ROOT" build/CMakeCache.txt`. Read both lines together; a `_DIR` whose path does not start with the current `_ROOT` value is the finding. No named "empty means pass" here — this is a comparison, not a presence check.
   - *Floor:* any.
2. **On CMake ≥4.1, read `CMakeFiles/CMakeConfigureLog.yaml`'s last `find_package-v1` event's `found.path` before trusting a resolution; on <4.1 this file has no such event and the cache-file comparison (rule 1) is the only mechanical check.**
   - *Rationale:* `found.path` names the absolute prefix that answered the call, catching a stale-`_DIR` mismatch that `--debug-find-pkg` on the same reconfigure does not surface (F2, measured; `cmake-configure-log(7)`, `versionadded:: 4.1`).
   - *Verify:* `grep -c 'kind: "find_package-v1"' CMakeFiles/CMakeConfigureLog.yaml`. 0 on <4.1 is expected and not a finding; 0 on ≥4.1 after a real `find_package` ran is the finding (CMK-DEP-17).
   - *Floor:* 4.1.
3. **Never route a "which package/prefix resolved" question through `cmake --graphviz`.** It draws the target-link graph only.
   - *Rationale:* measured empty/legend-only output on a `find_package`-only project; graphviz has no notion of a resolved prefix even with real targets present.
   - *Verify:* reading heuristic — a review or procedure step that cites `--graphviz` output as evidence for *which* dependency source was used (fetched vs. found, or which prefix) is itself the finding.
   - *Floor:* n/a.
4. **Grep `CMakeCache.txt` directly for a hint variable that is not `CACHE`d by the consuming project (a plain `-D<Pkg>_ROOT=...`); do not rely on `cmake -L`/`cmake -LA` to enumerate it.**
   - *Rationale:* `cmake -L` omits `UNINITIALIZED`-type entries; a `_ROOT` hint the project never promotes to `CACHE` is invisible to `-L` even though `CMakeCache.txt` carries it (measured, 4.4.2).
   - *Verify:* `grep -c '^dep_ROOT' build/CMakeCache.txt` (nonzero) vs. `cmake -L build | grep -c dep_ROOT` (zero) — a gap between the two on any hint variable is the finding that `-L` was trusted where it should not have been.
   - *Floor:* any.
5. **Prove a package is consumable by linking a real, compiled target from a separate configure — never by a green build-and-install of the exporting project, and never by a `LANGUAGES NONE` or interface-only smoke consumer.**
   - *Rationale:* a missing `find_dependency()` produces a fully green exporting-project build/install and a fully green `LANGUAGES NONE` consumer configure; the only failure point is a downstream Generate step that actually needs a real link line (F4, measured on 3.31.12 and 4.4.2; CMK-INST-01).
   - *Verify:* CMK-INST-01's round-trip script, with the consumer declaring a real language and linking a real `add_executable`/`add_library` with sources. Exit 0 = pass.
   - *Floor:* any.
6. **Redeclare every dependency on an exported target's link interface with `find_dependency()`, gated on the same condition the build used, in the Config template — never a raw `find_package()`.**
   - *Rationale:* CMake neither generates nor checks for these calls at export time (CMK-INST-03).
   - *Verify:* `grep -rn --include='*Config.cmake.in' --include='*config.cmake.in' --include='*config.in.cmake' -e 'find_package(' .` Empty = pass.
   - *Floor:* `find_dependency` since 3.0.
7. **Never design a dependency-provider integration on `find_program`/`find_library` seeing the provider's paths, whether placed before or after the first `find_package`; route every provider-managed lookup through `find_package`.**
   - *Rationale:* the real cmake-conan provider leaves `CMAKE_PREFIX_PATH` empty on both sides of the intercepted call; it resolves the request by injecting `Beta_DIR` directly, not by widening the search path (F3, measured). `SUPPORTED_METHODS` for a provider is `FIND_PACKAGE` and `FETCHCONTENT_MAKEAVAILABLE_SERIAL` only (CMK-TC-05).
   - *Verify:* reading heuristic — a `find_program(`/`find_library(` call anywhere in a provider-managed project whose comment or intent says "the provider makes this visible" is the finding, regardless of its position relative to `find_package`.
   - *Floor:* providers 3.24.
8. **Do not use `cmake_language(DEFER CALL find_package ...)` to fix a `find_program`/`find_library` call that runs before the project's first `find_package`.** Use it only to guarantee a single, deterministic trigger point for a provider across an `add_subdirectory` tree.
   - *Rationale:* DEFER schedules the call for the end of the current directory's listfile processing (`cmake_language.rst`, `versionadded:: 3.19`), strictly *after* every non-deferred command in that same file — measured to fire after an in-file `find_program`, never before it.
   - *Verify:* reading heuristic — a comment or commit message that frames a `DEFER`-wrapped `find_package` as "so the earlier `find_program` sees Conan's paths" is the finding; that effect was measured not to occur.
   - *Floor:* `DEFER` 3.19; providers 3.24.
9. **A fetched or vendored dependency with an effective floor below 3.5 needs `CMAKE_POLICY_VERSION_MINIMUM` set to 3.10, not 3.5, scoped around the one call that adds it.**
   - *Rationale:* 3.5 clears only the hard-error tier (4.0's floor) and leaves a live "< 3.10 will be removed" deprecation warning; 3.10 clears both, measured with zero warnings (F5; CMK-VER-06).
   - *Verify:* configure with the scoped value and grep the log for `CMake Deprecation Warning`; nonzero = the value was too low.
   - *Floor:* the variable itself needs CMake ≥4.0.
10. **For the same floor problem on a 3.x line, where `CMAKE_POLICY_VERSION_MINIMUM` does not exist, the remedy is a `FetchContent` `PATCH_COMMAND` that rewrites the dependency's `cmake_minimum_required` line, or a re-pin to a version that already declares a floor ≥3.10 — never a `-Wno-error=*` flag and never `CMAKE_WARN_DEPRECATED OFF`.**
    - *Rationale:* both measured clean with zero warnings and with `-Werror=dev` fully intact for the project's own code (F6, remedies 1 and 4). `-Wno-error=deprecated` measured **not** to clear the error when `-Werror=dev` is the active gate (F6, remedy 2) — the same warning is independently escalated by the `dev` category. `CMAKE_WARN_DEPRECATED OFF` measured to work mechanically but to also silence a real deprecation in the project's own code under the identical flag (F6, remedy 3) — it does not keep the gate live.
    - *Verify:* `grep -rn -e 'CMAKE_WARN_DEPRECATED' -e 'Wno-error=deprecated' --include='CMakeLists.txt' --include='*.cmake' --include='CMakePresets.json' --include='*.yml' .` Any hit used as a *fix* for a dependency's floor (rather than a genuine, reviewed, project-wide decision) is the finding.
    - *Floor:* any; `PATCH_COMMAND` since `FetchContent` 3.11.
11. **`FetchContent_Declare(... SOURCE_DIR ...)` skips the update/patch step entirely.** Use `PATCH_COMMAND` only on a download-based declare (`GIT_REPOSITORY`/`URL`), never expect it to run against a `SOURCE_DIR` override.
    - *Rationale:* measured — a `PATCH_COMMAND` attached to a `SOURCE_DIR` declare was not reachable in this setup; the working remedy 1 above required switching to a real `GIT_REPOSITORY` (a local `file://` repo).
    - *Verify:* reading heuristic — a `PATCH_COMMAND` sitting next to a `SOURCE_DIR` keyword in the same `FetchContent_Declare` call is the finding.
    - *Floor:* `FetchContent` 3.11.
12. **`conan graph explain` answers "why doesn't the closest binary match", not "what did Conan resolve" — use `conan graph info` for the latter, every time, and expect `graph explain` to error when nothing is missing.**
    - *Rationale:* measured `ERROR: There is no missing binary` against a fully-resolved graph; `graph info` printed the resolved tree cleanly against the identical inputs.
    - *Verify:* reading heuristic on triage write-ups — `graph explain` cited as evidence for a *successful* resolution is the finding.
    - *Floor:* Conan 2.x.
13. **`VCPKG_TRACE_FIND_PACKAGE=ON` and `vcpkg depend-info` answer different questions than "which installed tree resolved this configure"; treat vcpkg's dependency staleness exactly like CMK-DEP-13's plain-CMake case (fresh tree, `--fresh`, or `-U <pkg>_DIR`), because vcpkg's toolchain adds to `CMAKE_PREFIX_PATH` but never clears a stale `find_package` cache entry.**
    - *Rationale:* measured — repointing `VCPKG_INSTALLED_DIR` on a reused build tree left `<pkg>_DIR` on the old prefix; the trace flag logged the call identically both times; `depend-info` only echoes the manifest's declared names.
    - *Verify:* `PKG=widget; grep -e '^VCPKG_INSTALLED_DIR' -e "^${PKG}_DIR" build/CMakeCache.txt`; the `${PKG}_DIR` line not rooted under the current `VCPKG_INSTALLED_DIR` value is the finding.
    - *Floor:* vcpkg-tool any; toolchain integration any.

## Exemplar evidence

The dependency-seam consolidation's own corpus work already covers static exemplars for these rule families (CMK-DEP, CMK-TC, CMK-INST) at `cmake-dependency-seam.md` and `cmake-consumable-library.md`; this dive adds no new exemplar-corpus reads, only fresh scratch-project measurements of the same mechanisms plus the real cmake-conan/Conan/vcpkg binaries. Where this dive's findings sharpen or correct a prior claim, the exemplar citations already on file stand:

- `apache__arrow@3ad410b7b1:cpp/cmake_modules/FindRapidJSONAlt.cmake:29-32` — the positive set/restore exemplar CMK-DEP-15 already cites; F5/F6's remedy-4.4.2-vs-3.x split does not change which shape this exemplar demonstrates.
- `aminya__project_options@412045e1f1:src/Conan.cmake:241-249` — the DEFER call this dive measured directly (§F3); the exemplar itself is unchanged, but its *purpose* (a deterministic single trigger point, not a find_program fix) is now measured rather than inferred.
- No exemplar in the 46-repo corpus was found, in prior waves or here, deliberately shipping any of F1/F2/F4/F5/F6's defects — they are triage scenarios, not shipped patterns, and the consolidation's own corpus scan already established that real projects overwhelmingly avoid `OVERRIDE_FIND_PACKAGE` misuse and stale-`_ROOT` bugs (`cmake-dependency-seam.md` §Verdict 3, §Conflicts resolved 10).
- `find_ocx` (`/home/mherwig/dev/find_ocx`) is CMK-DEP-13/-14's own violator, already measured in the consolidation (`ocx.cmake:1200-1201`, `HEAD:1225-1226`); this dive's F2 is the general-purpose reproduction of the same class of bug with a from-scratch, minimal project, useful as the skill's worked example precisely because it has no OCX-specific machinery in it.

## AI-agent angle

- **Assuming `--debug-find-pkg` or a green configure is sufficient evidence for "which copy resolved."** Both were measured to be silent or misleading on a stale-`_DIR` reconfigure (F2) and on a missing-`find_dependency` Config (F4). The mechanical check is the cache-file comparison (rule 1) or, on ≥4.1, the configure log's `found.path` (rule 2) — never a single debug flag read in isolation.
- **Reaching for `CMAKE_POLICY_VERSION_MINIMUM` on a 3.x line.** The variable is 4.0+ only and simply does not exist below it; an agent trained on generic "just set the policy floor" advice will emit a flag CMake rejects outright with "unknown option." The floor-repair options on 3.x are a `PATCH_COMMAND` or a re-pin (rule 10) — no flag exists.
- **Treating `-Wno-error=deprecated` as the deprecation-specific counterpart of `-Werror=dev`, and assuming it neutralizes anything `-Werror=dev` escalates.** Measured false: a `cmake_minimum_required`-floor deprecation is escalated by `-Werror=dev` independently of the `deprecated` category, so `-Wno-error=deprecated` alone leaves it an error. This is exactly the kind of two-flag interaction a model conflates from having seen each flag documented, but rarely measured together.
- **Assuming a dependency provider (cmake-conan) behaves like a toolchain file and widens `CMAKE_PREFIX_PATH`, `CMAKE_PROGRAM_PATH`, or similar for the rest of the configure.** Measured false (F3): it satisfies only the intercepted `find_package` call directly. An agent used to Conan's older, toolchain-file-based workflow (where `conan_toolchain.cmake` genuinely does populate prefix/program paths before `project()`) will misdiagnose a provider-based project's `find_program` failures as "Conan isn't installed" rather than "providers don't do this."
- **Reading `cmake_language(DEFER)` as a general "make this run earlier" primitive.** It defers to *later*, never earlier (`versionadded:: 3.19` docs and measurement agree). A model pattern-matching on "defer = fix ordering" will apply it backwards.
- **Citing Hunter/HunterGate-era or Conan-1-era vocabulary** (`conan_basic_setup()`, `CONAN_PACKAGE_TARGETS_NAME`, `KEEP_RPATHS`) for any of the failures above — none of it applies to a `cmake-conan` provider or `CMakeDeps`/`CMakeToolchain`-generator project, and none of it appeared anywhere in the real provider output measured here. Grep the generated `conanfile`/generator output for these tokens before trusting an agent's Conan-flavored suggestion; their presence in *new* code is itself a floor-mismatch smell.
- **Trusting `vcpkg depend-info` or a `VCPKG_TRACE_FIND_PACKAGE` hit as proof of successful resolution.** Both were measured to answer a narrower question than "did this resolve, and from where" (§F2v, rules 12-13); an agent should read `<pkg>_DIR` in the cache, exactly as in the plain-CMake case.

## Contested / evolving

- **CMK-DEP-15's `CMAKE_WARN_DEPRECATED OFF` claim.** As of 2026-09-26 this dive's direct, repeated measurement contradicts the consolidation's stated mechanism (§Findings F6, §Summary). The practical guidance (don't use it) is unaffected, but the *reason* changes from "it doesn't survive `-Werror=dev`" to "it survives, but silences the project's own deprecations too." This should be corrected in `cmake-dependency-seam.md` by whichever pass next revises CMK-DEP-15; flagged here, not edited there.
- **`rules_foreign_cc` 0.16.0's CMake-version model** (BCR "spokes" replacing a fixed default range) landed 2026-09-15, per the era recheck; it is out of scope for this CMake-side dive but means any triage advice that assumes a fixed bundled CMake version under `rules_foreign_cc` is already dated as of this corpus's own era-check.
- **Whether `cmake-conan`'s provider path will ever expose `CMAKE_PROGRAM_PATH`/tool visibility to plain `find_program`.** No open upstream issue was found proposing this in the develop2 branch (HEAD unchanged at `b1593849dd` since wave 1, per the era recheck); the measured behavior in this dive should be read as current and not imminently changing.

## Sources

| URL or measurement | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [Help/module/FetchContent.cmake@v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Modules/FetchContent.cmake) | `OVERRIDE_FIND_PACKAGE` docs, raw source | 2026-09-26 fetch, v4.4.2 | Ground truth for F1's mechanism (lines 211-226) |
| [Help/command/cmake_language.rst@v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/cmake_language.rst) | `DEFER` semantics, raw RST | 2026-09-26 fetch, v4.4.2 | "executed as if written at the end of the current directory's CMakeLists.txt file" — grounds F3's DEFER measurement |
| [Help/manual/cmake-configure-log.7.rst@v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-configure-log.7.rst) | `find_package-v1` event schema | 2026-09-26 fetch, v4.4.2 | Confirms `versionadded:: 4.1`, matching the zero-events-on-3.31.12 measurement |
| `microsoft/vcpkg-tool@51bf87ca6e:scripts/buildsystems/vcpkg.cmake:809-858` (local copy, vcpkg-tool 2026-09-26 release) | `VCPKG_TRACE_FIND_PACKAGE` implementation | 2026-09-26 | Shows the trace is a `find_package` macro override, not a resolution-provenance log |
| Measurement F1 (4.4.2, 3.31.12) | `OVERRIDE_FIND_PACKAGE` substitutes for an installed copy | 2026-09-26 | `dep_DIR` lands under `pkgRedirects`, never the real prefix, on both lines |
| Measurement F2 (4.4.2, 3.31.12) | stale `dep_DIR` after `dep_ROOT` repoint | 2026-09-26 | Reproduces CMK-DEP-13's C4 with a from-scratch project; adds the `-L`-omits-`UNINITIALIZED` and graphviz-is-useless findings |
| Measurement F2v (vcpkg-tool 2026-09-26, overlay ports) | same staleness through `vcpkg.cmake` toolchain | 2026-09-26 | First measurement of CMK-DEP-13's mechanism specifically under vcpkg integration |
| Measurement F3 (Conan 2.32.0, `conan-io/cmake-conan@b1593849dd`, 4.4.2) | provider never populates `CMAKE_PREFIX_PATH`; DEFER fires at end-of-file | 2026-09-26 | Sharpens CMK-TC-05 with the real provider binary, not a synthetic stand-in |
| Measurement F4 (4.4.2, 3.31.12) | missing `find_dependency` invisible without a real compiled link | 2026-09-26 | Independently reproduces and pins down CMK-INST-01's own claim |
| Measurement F5 (4.4.2) | 3.4-floor hard error; 3.5 vs. 3.10 scoped remedy | 2026-09-26 | Grounds CMK-VER-06's "3.10 clears both tiers" with an exact before/after |
| Measurement F6 (3.31.12, four remedies) | `-Werror=dev` gate and four candidate remedies | 2026-09-26 | The only real measurement of `CMAKE_WARN_DEPRECATED OFF`'s interaction with `-Werror=dev` on record for this corpus; corrects CMK-DEP-15's stated mechanism |
| `conan graph info` / `conan graph explain` (Conan 2.32.0) | live CLI runs against the F3 project | 2026-09-26 | `graph explain`'s "no missing binary" error, not previously exercised in this corpus |
| `vcpkg-glibc install` / `depend-info` (vcpkg-tool 2026-09-26) | live CLI runs, overlay ports `widget@1.0` (A/B) | 2026-09-26 | Real binary run, not a doc read, for the vcpkg-manifest variant of F2 |
| [cmake-dependency-seam.md](../cmake-dependency-seam.md) | wave-2 consolidation, CMK-DEP/CMK-TC ruleset | 2026-09-26 | The resolution table and rule IDs this procedure cites and does not restate |
| [cmake-consumable-library.md](../cmake-consumable-library.md) | wave-2 consolidation, CMK-INST/CMK-TGT ruleset | 2026-09-26 | CMK-INST-01/-03, independently reproduced in F4 |
| [cmake-topic-map/era-recheck-2026-09-26.md](../cmake-topic-map/era-recheck-2026-09-26.md) | freshness check on tool versions | 2026-09-26 | Confirms Conan 2.32.0, vcpkg-tool 2026-09-26, cmake-conan HEAD unchanged, `rules_foreign_cc` 0.16.0 landed |

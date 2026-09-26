---
title: "One CMAKE_TOOLCHAIN_FILE, four claimants: vcpkg, Conan, rules_foreign_cc and a cross toolchain"
topic: cmake-dependency-seam
agent: toolchain-composition-dive
model: sonnet
kind: web
date_researched: 2026-09-26
sources_count: 18
scope: |
  How a configure composes CMAKE_TOOLCHAIN_FILE, CMAKE_PROJECT_TOP_LEVEL_INCLUDES
  and dependency providers when vcpkg, Conan 2, rules_foreign_cc and a hand-written
  cross toolchain each want a say, and what must be set before the first project().
  Answers M-H-01, M-H-06, M-H-07, M-H-08, M-L-02, M-N-02 from cmake-topic-map.md.
  Does not cover: CMAKE_FIND_ROOT_PATH_MODE_* semantics or sysroot construction
  (staged for wave-3 dive toolchains-and-cross/cross-compile-find-root, which this
  file's "Claims wave-3 must still run" section hands off precisely); provider
  resolution order against FetchContent/find_package hints (dependency-seam/
  resolution-order-and-providers, wave 2, family CMK-DEP); rules_foreign_cc's own
  bundled-CMake-version model (M-K-02, bazel-seam group).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [CMAKE_TOOLCHAIN_FILE takes exactly one path](#1-cmake_toolchain_file-takes-exactly-one-path)
   2. [vcpkg: self-guarding, chainload has two distinct meanings](#2-vcpkg-self-guarding-chainload-has-two-distinct-meanings)
   3. [Conan 2: two flows, and a user_toolchain hook that runs first](#3-conan-2-two-flows-and-a-user_toolchain-hook-that-runs-first)
   4. [The cmake-conan provider never touches CMAKE_TOOLCHAIN_FILE](#4-the-cmake-conan-provider-never-touches-cmake_toolchain_file)
   5. [rules_foreign_cc: a caller-supplied toolchain always wins](#5-rules_foreign_cc-a-caller-supplied-toolchain-always-wins)
   6. [CMAKE_PROJECT_TOP_LEVEL_INCLUDES and the provider slot, measured](#6-cmake_project_top_level_includes-and-the-provider-slot-measured)
   7. [Toolchain re-read on try_compile: two products already assume it](#7-toolchain-re-read-on-try_compile-two-products-already-assume-it)
   8. [Host tools in a cross build: four independent answers](#8-host-tools-in-a-cross-build-four-independent-answers)
   9. [One manager of record: no primary source blesses running both](#9-one-manager-of-record-no-primary-source-blesses-running-both)
   10. [vcpkg through a preset: the ordering trap is the same one, twice](#10-vcpkg-through-a-preset-the-ordering-trap-is-the-same-one-twice)
3. [The composition table](#the-composition-table)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- `CMAKE_TOOLCHAIN_FILE` is a single scalar path, not a list; only one wins per configure — the exact wording is "Path to toolchain file" (singular), [CMAKE_TOOLCHAIN_FILE.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_TOOLCHAIN_FILE.rst), current at CMake 4.4.2.
- Every one of the four claimants (vcpkg, Conan's explicit flow, rules_foreign_cc, a hand-written cross toolchain) is designed to be the sole value of `CMAKE_TOOLCHAIN_FILE`; composition across claimants always goes through one of them chainloading the others' output as CMake-language `include()`, never through CMake itself merging two files.
- vcpkg's toolchain file (`scripts/buildsystems/vcpkg.cmake`) is self-guarding: it sets `VCPKG_TOOLCHAIN ON` after its first pass and returns immediately on re-entry (microsoft__vcpkg@`c4ee5a52d7`:scripts/buildsystems/vcpkg.cmake:207-213,282), which is what makes it safe as the target of `try_compile`'s per-check re-read (CMP0137, 3.24) and safe to `include()` a second time from a wrapping toolchain file.
- `VCPKG_CHAINLOAD_TOOLCHAIN_FILE` has two documented but easily conflated meanings — set on the CMake command line it chains a project-scope toolchain into vcpkg's; set inside a custom *triplet* file it is vcpkg's own build toolchain for *ports* — confirmed live and unresolved by vcpkg maintainers in [microsoft/vcpkg#36244](https://github.com/microsoft/vcpkg/issues/36244) (opened 2024, still open 2026-09-26).
- vcpkg reads `VCPKG_CHAINLOAD_TOOLCHAIN_FILE` unconditionally as the very first statement of its own logic (before any option, cache or search-path code), so a chained toolchain always runs *before* vcpkg's own settings and can be overridden by them only where vcpkg explicitly checks `NOT DEFINED` (microsoft__vcpkg@`c4ee5a52d7`:scripts/buildsystems/vcpkg.cmake:209-211).
- Conan 2's normal, "preferred for most cases" flow is two-step and out-of-band: `conan install` must run *before* `cmake configure` to produce `conan_toolchain.cmake`, which is then passed with `-DCMAKE_TOOLCHAIN_FILE=…` or via the `CMakePresets.json`/`CMakeUserPresets.json` Conan itself generates (schema 3 / schema 4, requiring CMake ≥3.21 / ≥3.23) — [Conan 2 CMakeToolchain reference](https://docs.conan.io/2/reference/tools/cmake/cmaketoolchain.html), Conan 2.32.0 (2026-08-31).
- Conan's sanctioned chaining hook is the `user_toolchain` block, populated by `tools.cmake.cmaketoolchain:user_toolchain=[<file>,...]`: those `include()` lines are written as the *first* lines of `conan_toolchain.cmake`, ahead of every Conan-deduced block, and any `CMAKE_SYSTEM_NAME`/`CMAKE_SYSTEM_VERSION`/`CMAKE_SYSTEM_PROCESSOR` the user file sets is left alone by Conan's own `generic_system` block ([Conan 2 CMakeToolchain reference](https://docs.conan.io/2/reference/tools/cmake/cmaketoolchain.html), "Using a custom toolchain file"). The competing knob, `tools.cmake.cmaketoolchain:toolchain_file`, *replaces* `conan_toolchain.cmake` outright and "translates all the toolchain responsibility to the user" — Conan's docs call `user_toolchain` "recommended in most cases" over it.
- The `cmake-conan` dependency-provider flow (`conan_provider.cmake` via `CMAKE_PROJECT_TOP_LEVEL_INCLUDES`) never sets or reads `CMAKE_TOOLCHAIN_FILE` at all — its own README states plainly that compiler/global build settings "would otherwise be provided by `CMakeToolchain`" and for those you must invoke Conan's explicit flow separately ([cmake-conan develop2 README](https://raw.githubusercontent.com/conan-io/cmake-conan/develop2/README.md), HEAD `b1593849dd`, unchanged since 2026-06-05). This means the provider path and a project's own or a manager's `CMAKE_TOOLCHAIN_FILE` never collide — they compose by construction, not by convention.
- `rules_foreign_cc`'s `cmake()` rule checks `cache_entries.get("CMAKE_TOOLCHAIN_FILE")` before deciding whether to synthesize its own crosstool file: if the caller supplies one, `generate_crosstool_file` is skipped and the Bazel-derived toolchain values are instead passed as plain `-D`/environment cache entries alongside the caller's file — the caller's toolchain always wins (bazel-contrib__rules_foreign_cc@`bb2f3e5d72`:foreign_cc/cmake.bzl:210 and foreign_cc/private/cmake_script.bzl:170-176; note the file moved from `foreign_cc/private/framework.bzl` at the older `f68b351c46` SHA the brief named — see Contested/evolving).
- **Measured, 4.4.2**: when two files named in `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` both call `cmake_language(SET_DEPENDENCY_PROVIDER)`, CMake raises no error — the second call silently *replaces* the first, and only the last-registered provider is ever invoked. This matches [`cmake_language.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/cmake_language.rst) lines 262-265 verbatim ("the new provider replaces the previously set one") and upgrades that normative claim to measured tier — command and output in Findings §6.
- Kitware's own words, unchanged since at least 3.24: "the choice of dependency provider should always be under the user's control" — a project should at most *offer* a provider file for the user's `CMAKE_PROJECT_TOP_LEVEL_INCLUDES`, never register one from its own `CMakeLists.txt` ([`cmake_language.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/cmake_language.rst) line 281). No text surveyed calls providers a "neutral seam" or an ecosystem convergence point; only one implementation (cmake-conan) exists among the four claimants in this dive, and it is opt-in per user, per configure.
- Every `VCPKG_*` variable and `CMAKE_TOOLCHAIN_FILE` itself must be set before the first `project()` call — vcpkg's own words: "all vcpkg-affecting variables must be defined before the first `project()` directive" ([vcpkg CMake integration](https://learn.microsoft.com/en-us/vcpkg/users/buildsystems/cmake-integration), 2026-09-26 fetch) — because the toolchain file is evaluated *during* `project()`, and `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` files run "immediately after the toolchain file has been read... but before any languages have been enabled" ([`CMAKE_PROJECT_TOP_LEVEL_INCLUDES.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_PROJECT_TOP_LEVEL_INCLUDES.rst)), so a `set()` of any of these after `project()` is a silent no-op, not a diagnosed error.
- No primary source blesses running vcpkg's and Conan's toolchains together in one configure. [conan-io/conan#12341](https://github.com/conan-io/conan/issues/12341) is the closest thing to a primary statement: a user asked Conan to adopt vcpkg's generic-chainload model precisely *because* it lacked it, and Conan's own maintainer (`memsharded`) redirected the discussion to a separate architectural proposal rather than endorsing dual toolchains — as of 2026-09-26 that proposal has not shipped. The mechanical fact that `CMAKE_TOOLCHAIN_FILE` accepts one path is the harder constraint: making it work requires vcpkg's own chainload slot to carry Conan's `conan_toolchain.cmake` (or the reverse via Conan's `user_toolchain` block), and nothing in either project's documentation describes or supports that specific pairing.
- `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` (3.24) accepts a semicolon-separated list and, since 3.29, module names resolved via `CMAKE_MODULE_PATH`; a real exemplar (`aminya__project_options`) uses `list(APPEND CMAKE_PROJECT_TOP_LEVEL_INCLUDES ...)` to add the Conan provider file without clobbering another top-level include, and separately pairs a `cmake_language(DEFER ... CALL find_package Git QUIET)` to force the provider to fire even when the project's own `CMakeLists.txt` has no early `find_package` call — a documented workaround for [conan-io/cmake-conan#595](https://github.com/conan-io/cmake-conan/issues/595) (aminya__project_options@`412045e1f1`:src/Conan.cmake:236-248).
- vcpkg via a preset: Microsoft's own recommended pattern sets `"CMAKE_TOOLCHAIN_FILE": "$env{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake"` inside `cacheVariables` on a `configurePreset` — a corpus instance at `microsoft__vcpkg-tool@51bf87ca6e:CMakePresets.json:43` does exactly this. Because preset `cacheVariables` are applied before `project()` runs (they become `-D` on the effective command line), this satisfies the before-`project()` requirement; `VCPKG_MANIFEST_MODE` still auto-detects from `vcpkg.json` presence unless a preset explicitly forces it `OFF`.

## Findings

### 1. CMAKE_TOOLCHAIN_FILE takes exactly one path

[`CMAKE_TOOLCHAIN_FILE.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_TOOLCHAIN_FILE.rst) at tag v4.4.2, fetched 2026-09-26:

> Path to toolchain file supplied to `cmake(1)`. This variable is specified on the command line when cross-compiling with CMake. ... This is initialized by the `CMAKE_TOOLCHAIN_FILE` environment variable if it is set when a new build tree is first created.

Three entry mechanisms, all setting the same single scalar:

- `-DCMAKE_TOOLCHAIN_FILE=<path>` on the command line, or `--toolchain <path>` (documented alias, `cmake-toolchains(7)`), any CMake version.
- A `configurePreset`'s `cacheVariables.CMAKE_TOOLCHAIN_FILE` or the dedicated `toolchainFile` preset field (presets schema ≥3, i.e. CMake ≥3.21) — Microsoft's own recommendation for vcpkg, Conan's own generator output.
- The `CMAKE_TOOLCHAIN_FILE` **environment variable**, but only "when a new build tree is first created" — added 3.21; it does nothing on an existing build tree's reconfigure, a footgun for CI caches that reuse a build directory across branches with different toolchain needs.

There is no CMake-native mechanism to merge two toolchain files; every composition case below is one file including another as ordinary CMake-language `include()`.

### 2. vcpkg: self-guarding, chainload has two distinct meanings

microsoft__vcpkg@`c4ee5a52d7` (was `04a9d8e521` at wave 1) : `scripts/buildsystems/vcpkg.cmake`:

```cmake
# lines 207-213
if(VCPKG_CHAINLOAD_TOOLCHAIN_FILE)
    include("${VCPKG_CHAINLOAD_TOOLCHAIN_FILE}")
endif()

if(VCPKG_TOOLCHAIN)
    cmake_policy(POP)
    return()
endif()
```

`VCPKG_TOOLCHAIN` is then `set(VCPKG_TOOLCHAIN ON)` at lines 282, 305, 345 and again 960 — so the *first* pass through `vcpkg.cmake` chainloads the user's file, does its own setup, and marks itself done; any *later* inclusion (a `try_compile` re-read, or the documented pattern of `include()`-ing vcpkg.cmake at the end of your own toolchain file) chainloads again and then returns immediately without repeating vcpkg's search-path or compiler-detection logic. This is the mechanism, not a side effect: it is what makes vcpkg's toolchain idempotent under repeated inclusion (ties to M-H-07, §7).

Two ways to compose, both documented at [vcpkg CMake integration — Using Multiple Toolchain Files](https://learn.microsoft.com/en-us/vcpkg/users/buildsystems/cmake-integration):

```sh
cmake -DCMAKE_TOOLCHAIN_FILE=/vcpkg/scripts/buildsystems/vcpkg.cmake \
      -DVCPKG_CHAINLOAD_TOOLCHAIN_FILE=/my/project/toolchain.cmake
```

or, equivalently, write your own toolchain file that ends with:

```cmake
set(CMAKE_CXX_COMPILER ...)
set(VCPKG_TARGET_TRIPLET x64-my-custom-windows-triplet)
include(/path/to/vcpkg/scripts/buildsystems/vcpkg.cmake)
```

**The two-meanings trap** ([microsoft/vcpkg#36244](https://github.com/microsoft/vcpkg/issues/36244), filed 2024, open as of 2026-09-26): `VCPKG_CHAINLOAD_TOOLCHAIN_FILE` set on the CMake command line (project scope) chains a toolchain into the *consuming project's* configure; the exact same variable name set *inside a custom triplet file* (vcpkg's own scope) chains a toolchain that vcpkg uses to build the *ports themselves*. vcpkg's own docs already warn: "vcpkg does not automatically apply your toolchain's settings, such as your compiler or compilation flags, while building libraries" — the project-scope chainload and the triplet-scope chainload are independent, and setting only one leaves the other on vcpkg's autodetected default. The maintainer thread proposes renaming to `VCPKG_PROJECT_CHAINLOAD_TOOLCHAIN_FILE` / `VCPKG_PORTS_CHAINLOAD_TOOLCHAIN_FILE`; unresolved.

### 3. Conan 2: two flows, and a user_toolchain hook that runs first

[Conan 2 `CMakeToolchain` reference](https://docs.conan.io/2/reference/tools/cmake/cmaketoolchain.html), Conan 2.32.0 (2026-08-31), fetched 2026-09-26.

The **explicit flow** ("preferred... in most cases" per the cmake-conan README, §4): `conan install .` runs first and writes `conan_toolchain.cmake` plus a `CMakePresets.json` (schema **3**, needs CMake ≥3.21) with a `configurePreset.toolchainFile` pointing at it, and — only if the project's own `CMakeLists.txt` is found at `conanfile.source_folder` — a `CMakeUserPresets.json` (schema **4**, needs CMake ≥3.23) that includes it, *unless one already exists and was not generated by Conan* (the skip-if-foreign rule, answering M-M-08). `cmake --preset conan-<config>` then reads that chain. There is no way to invoke this flow from inside a single `cmake` call; it is fundamentally two processes.

Two ways to bring in an outside toolchain, and the docs explicitly rank them:

| Config | Effect |
|---|---|
| `tools.cmake.cmaketoolchain:toolchain_file=<filepath>` | `conan_toolchain.cmake` generation is skipped entirely; CMake reads `<filepath>` directly. "Translates all the toolchain responsibility to the user" — dependency `xxx-config.cmake` discovery gets no help. |
| `tools.cmake.cmaketoolchain:user_toolchain=["<filepath>", ...]` | "Recommended in most cases." Conan writes `include(<filepath>)` as the **first lines** of `conan_toolchain.cmake` (the `user_toolchain` block runs before every other block: `generic_system`, `compilers`, `android_system`, `apple_system`, ...). If the user file sets `CMAKE_SYSTEM_NAME`/`CMAKE_SYSTEM_VERSION`/`CMAKE_SYSTEM_PROCESSOR`, Conan's own deduced values for those are **not** written over them; unset ones still get Conan's defaults. |

`tools.cmake.cmaketoolchain:enabled_blocks` can pair with `user_toolchain` to suppress specific Conan-generated blocks (e.g. keep only `find_paths`) without disabling the whole toolchain. A `user_toolchain` value can also be shipped as a `tool_requires` package via `self.conf_info.define("tools.cmake.cmaketoolchain:user_toolchain", [f])` (or `.append(...)` to compose several), so a "toolchain package" applies itself with zero recipe changes downstream.

The `try_compile` block, added to every generated `conan_toolchain.cmake`: "Stop processing the toolchain, skipping the blocks below this one, if `IN_TRY_COMPILE` CMake property is defined" — Conan's own equivalent of vcpkg's re-entrancy guard, deliberately truncating rather than fully skipping (earlier blocks like `user_toolchain` and `generic_system` still run inside a `try_compile`, later ones like `find_paths`/`pkg_config` do not).

### 4. The cmake-conan provider never touches CMAKE_TOOLCHAIN_FILE

[cmake-conan `develop2` README](https://raw.githubusercontent.com/conan-io/cmake-conan/develop2/README.md), HEAD `b1593849dd` (unchanged since 2026-06-05, confirmed by [era-recheck-2026-09-26.md](cmake-topic-map/era-recheck-2026-09-26.md)).

Entry: `-DCMAKE_PROJECT_TOP_LEVEL_INCLUDES=/path/to/conan_provider.cmake`, requires CMake ≥3.24, Conan ≥2.0.5. Quoted limitation, verbatim:

> For build settings that would otherwise be provided by `CMakeToolchain` (for example, the compiler itself or other global build settings) please invoke Conan separately as per [documentation]..., that is first calling `conan install` then `cmake --preset`.

This is the load-bearing fact for composition: the provider path is **only** a `find_package`/`FetchContent_MakeAvailable` interceptor (it registers via `SET_DEPENDENCY_PROVIDER`, §6), never a toolchain source. A separately supplied `CMAKE_TOOLCHAIN_FILE` — vcpkg's, a cross toolchain, or nothing at all — is completely unaffected by adding this provider, and the two do not need a chaining hook between them because they occupy disjoint responsibilities by design, not by convention. The second stated limitation is equally load-bearing for M-H-04 (deferred to the resolution-order dive): "the `cmake-conan` triggers the `conan install` at the first `find_package()` occurrence... any other dependencies that have logic outside of `find_package`... may not work correctly if done after."

### 5. rules_foreign_cc: a caller-supplied toolchain always wins

bazel-contrib__rules_foreign_cc@`bb2f3e5d72` (was `f68b351c46` at wave 1 — the file itself moved; see Contested/evolving):

```python
# foreign_cc/cmake.bzl:210
no_toolchain_file = ctx.attr.cache_entries.get("CMAKE_TOOLCHAIN_FILE") or not ctx.attr.generate_crosstool_file
```

```python
# foreign_cc/private/cmake_script.bzl:170
if no_toolchain_file:
    params = _create_cache_entries_env_vars(toolchain_dict, user_cache, user_env)
else:
    params = _create_crosstool_file_text(toolchain_dict, user_cache, user_env, target_os)
```

`generate_crosstool_file` (`cmake()` rule attribute) defaults to `True`. If the caller passes `CMAKE_TOOLCHAIN_FILE` in `cache_entries`, or explicitly sets `generate_crosstool_file = False`, rules_foreign_cc **skips writing its own crosstool file** and instead folds every Bazel-cc-toolchain-derived value (compiler paths, sysroot, target OS/arch) into plain `-D` cache entries and environment variables passed alongside the caller's file — the caller's toolchain file is used verbatim, never merged or wrapped. The rule's own doc comment: "If `CMAKE_TOOLCHAIN_FILE` cache entry is passed, specified crosstool file will be used." When cross-compiling *without* a caller-supplied file, `generate_crosstool_file=True` requires `CMAKE_SYSTEM_NAME` in `cache_entries` (rules_foreign_cc's own doc string) — the synthesized file needs that value to decide whether to emit cross-compile settings at all, matching cmake-toolchains(7)'s statement that `CMAKE_SYSTEM_PROCESSOR` is ignored unless `CMAKE_SYSTEM_NAME` is also set.

### 6. CMAKE_PROJECT_TOP_LEVEL_INCLUDES and the provider slot, measured

[`CMAKE_PROJECT_TOP_LEVEL_INCLUDES.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_PROJECT_TOP_LEVEL_INCLUDES.rst): added 3.24, semicolon-separated list; since 3.29 an entry may also be a module name resolved via `CMAKE_MODULE_PATH` or built into CMake. Files run "immediately after the toolchain file has been read... but before any languages have been enabled" — i.e. between toolchain and `enable_language`, every time, non-optionally.

[`cmake_language.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/cmake_language.rst) lines 262-273, quoted:

> If a provider is already set when `cmake_language(SET_DEPENDENCY_PROVIDER)` is called, the new provider replaces the previously set one... The dependency provider can only be set while processing one of the files specified by the `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` variable... Calling `cmake_language(SET_DEPENDENCY_PROVIDER)` outside of that context will result in an error.

**Measured** (upgrades the above from normative to measured tier), CMake 4.4.2, `ocx package exec kitware/cmake:4.4 -- cmake`, scratch at `.agents/research/cmake-dependency-seam/scratch/toolchain-composition/` (re-runnable copy of the exact files used):

```sh
$ cmake -S proj -B build \
    -DCMAKE_PROJECT_TOP_LEVEL_INCLUDES="$PWD/provider_a.cmake;$PWD/provider_b.cmake"
-- PROVIDER-A-REGISTERED
-- PROVIDER-B-REGISTERED
-- PROVIDER-B-CALLED for Nonexistent
-- Configuring done (0.0s)
-- Generating done (0.0s)
```

Both registrations succeed with **no error or warning**; only the second (`provider_b`) is ever invoked for the subsequent `find_package(Nonexistent QUIET)`. This settles, without needing the wave-3 measurement the map staged, the exact "what happens" half of M-H-03 for the two-top-level-includes case: **last write wins, silently** — an agent cannot detect a shadowed provider from configure output alone; only `--trace-expand` or reading every file named in `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` in order would reveal it. This is the mechanical grounding for Kitware's own single-slot framing quoted in the Summary (line 281 of the same file): a provider is not an ecosystem seam with several cooperating members, it is one user-controlled variable that the last file to run overwrites.

### 7. Toolchain re-read on try_compile: two products already assume it

[CMP0137](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0137.rst) (3.24): the *source-file* signature of `try_compile` has always propagated platform variables into the generated test project; the *whole-project* signature only started doing so with `NEW` (CMake's own default advice: this policy warns neither way — `STANDARD_ADVICE.rst`). `cmake-toolchains.7.rst` itself warns that `CMAKE_SOURCE_DIR`/`CMAKE_BINARY_DIR` are unsafe to use inside a toolchain file precisely because "the toolchain file is used in contexts where these variables have different values... as part of a call to `try_compile`" — i.e. the toolchain file is *re-read*, not cached, on every `try_compile` whole-project invocation. Two of the four claimants already build their idempotence around this fact rather than treating it as a rule to state independently:

- vcpkg's `VCPKG_TOOLCHAIN` early-return guard (§2) exists for exactly this: a `try_compile` whole-project re-read of `vcpkg.cmake` chainloads once more and returns without repeating expensive search-path setup.
- Conan's `try_compile` block (§3) deliberately truncates `conan_toolchain.cmake` processing when `IN_TRY_COMPILE` is set, rather than relying on re-entrancy to be harmless.

Neither vcpkg's nor Conan's documentation states a project-authored toolchain file must be similarly idempotent and free of project-level commands — but both products' own source treats that as the load-bearing assumption. A hand-written cross toolchain (the fourth claimant) that runs `execute_process()` unconditionally, or calls `message(FATAL_ERROR)` on a variable only set post-`project()`, will re-run that side effect on every `try_compile`; counting the actual re-read frequency for a real check-heavy project (two `try_compile`s, one toolchain with a `message()` marker) is exactly what wave-3's `toolchains-and-cross/cross-compile-find-root` dive is staged to measure (M-H-07's own "count reads" verification) — this dive found the *why* (re-read is real, per cmake-toolchains.7.rst and CMP0137) but not the *how many times in practice*.

### 8. Host tools in a cross build: four independent answers

CMake's own primitives: `find_program(... NO_CMAKE_FIND_ROOT_PATH)` un-sandboxes a single `find_program` call from `CMAKE_FIND_ROOT_PATH_MODE_PROGRAM`'s sysroot restriction so it can find a host-native code generator; `CMAKE_CROSSCOMPILING_EMULATOR` (3.3, list form 3.15, environment-initializable 3.28) names the command that runs a target-arch executable on the host, used by `try_run` and as the default `CROSSCOMPILING_EMULATOR` target property for `add_test` ([`CMAKE_CROSSCOMPILING_EMULATOR.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_CROSSCOMPILING_EMULATOR.rst)).

The two package managers answer the same underlying question — "this dependency must be built for the machine running the build, not the target" — with unrelated mechanisms:

- **vcpkg**: a manifest dependency entry's `"host": true` boolean. [vcpkg.json reference](https://learn.microsoft.com/en-us/vcpkg/reference/vcpkg-json): "a boolean indicating that the dependency must be built for the host triplet instead of the current port's triplet... any dependency that provides tools or scripts which should be 'executed' during a build (such as buildsystems, code generators, or helpers) should be marked as `"host": true`." Consumed automatically by `VCPKG_HOST_TRIPLET`; a CMake-side project never sets a variable for this — it is manifest metadata, invisible to a `find_package`-only reading of the build.
- **Conan 2**: `tool_requires` in the *build* context, resolved against the `-pr:b` (build) profile rather than `-pr:h` (host); this is the successor to the deprecated (~2.28) `build_requires`.

None of the four claimants in this dive's scope makes the other's host-tool mechanism visible to CMake directly — a project cross-compiling with vcpkg's `"host": true` and consuming a Conan `tool_requires` in the same graph has two independent host/target split declarations that must agree by construction, with no CMake-level cross-check. This is a reading heuristic, not a measured claim; the scratch cross-build wave-3 dive (`cross-compile-find-root`) is staged to measure the `find_program`/`NO_CMAKE_FIND_ROOT_PATH` half directly.

### 9. One manager of record: no primary source blesses running both

The topic map's M-L-02 states the "never" verdict; this dive's job was to find a primary statement for or against it. Two lines of evidence, both primary, neither a direct "thou shalt not":

1. **Mechanical**: §1's single-scalar `CMAKE_TOOLCHAIN_FILE` means vcpkg's and Conan's toolchains cannot both be the active toolchain file. The only way to run both mechanisms is to nest one inside the other's chainload slot — vcpkg's `VCPKG_CHAINLOAD_TOOLCHAIN_FILE` pointing at `conan_toolchain.cmake`, or Conan's `user_toolchain` block `include()`-ing `vcpkg.cmake`. **Neither vcpkg's nor Conan's documentation describes or supports this specific pairing**; every documented chainload example on both sides is a hand-written cross toolchain, never the other package manager's generated file.
2. **[conan-io/conan#12341](https://github.com/conan-io/conan/issues/12341)** ("Run Conan from generic CMakeToolchain file and chainload the generated") is the closest thing to a primary discussion of running Conan the way vcpkg runs itself. The reporter explicitly frames it as porting vcpkg's model to Conan because Conan currently *lacks* a generic chainload-and-generate toolchain. Conan's own maintainer (`memsharded`) response does not propose combining the two managers; it redirects toward `cmake-conan`'s existing chicken-and-egg problem and a separate (still unshipped as of 2026-09-26) architectural discussion. No comment in the thread, and no other primary source found in this dive, describes vcpkg and Conan cooperating on one dependency graph in one configure.

Given both, the map's MUST framing holds: **one package manager of record per configure is the safe default**, grounded in the mechanical single-toolchain-file constraint (hard) plus the absence of any primary source describing or endorsing the alternative (soft, but consistent across both projects' own docs and their own issue trackers). A project needing a library only the *other* manager packages has three documented escape hatches, none of which runs both managers' toolchains together: a vcpkg overlay port wrapping the Conan-only library, a from-scratch Conan recipe for the vcpkg-only library, or a plain `FetchContent`/CPM fallback outside either manager for that one dependency.

### 10. vcpkg through a preset: the ordering trap is the same one, twice

microsoft__vcpkg-tool@`51bf87ca6e` (was `f9eb9c63d0` at wave 1): `CMakePresets.json:43`:

```json
{
    "name": "windows",
    "hidden": true,
    "toolchainFile": "$env{VCPKG_ROOT}/scripts/buildsystems/vcpkg.cmake",
    "cacheVariables": { "VCPKG_BUILD_TLS12_DOWNLOADER": true }
}
```

This is the one corpus preset the wave-1 audit flagged as using `toolchainFile`. Because a preset's `cacheVariables` (and the dedicated `toolchainFile` field, which is sugar for `CMAKE_TOOLCHAIN_FILE` in `cacheVariables`) are applied by `cmake --preset` as if passed with `-D` on the command line — before CMake starts processing `CMakeLists.txt` — this satisfies vcpkg's own "before the first `project()`" rule (§2) automatically, which is exactly why Microsoft's docs recommend presets as *the* way to set `CMAKE_TOOLCHAIN_FILE` for vcpkg rather than hand-editing `CMakeLists.txt`. `VCPKG_MANIFEST_MODE` is not itself in this preset; per [vcpkg CMake integration](https://learn.microsoft.com/en-us/vcpkg/users/buildsystems/cmake-integration) it "defaults to ON when `VCPKG_MANIFEST_DIR` is non-empty or `${CMAKE_SOURCE_DIR}/vcpkg.json` exists" — so a preset that wires the toolchain but never mentions manifest mode still gets it automatically the moment a `vcpkg.json` is present, which is the ordering-independent case; the fragile case (M-H-02's territory, not this dive's) is a preset or `CMakeLists.txt` line that tries to *force it OFF* after the toolchain has already run its own auto-detection — a silent no-op if placed after `project()`, and moot if placed in the same preset's `cacheVariables` alongside `toolchainFile` (both apply pre-`project()` together).

## The composition table

| Claimant | Entry mechanism | If another `CMAKE_TOOLCHAIN_FILE` is already set | Sanctioned chaining hook | Must be set/run before `project()` |
|---|---|---|---|---|
| **vcpkg** (`scripts/buildsystems/vcpkg.cmake`) | `-DCMAKE_TOOLCHAIN_FILE=`, preset `toolchainFile`/`cacheVariables`, `CMAKE_TOOLCHAIN_FILE` env var (new build tree only, ≥3.21); pre-3.19 must use `-D` on the command line | It *is* meant to be the sole value; if included from inside another file it self-guards via `VCPKG_TOOLCHAIN` and no-ops after its first pass | `VCPKG_CHAINLOAD_TOOLCHAIN_FILE` (cache var: chains a project toolchain *in*; triplet var: chains vcpkg's *port*-build toolchain — two meanings, vcpkg#36244), included unconditionally as the first statement | `CMAKE_TOOLCHAIN_FILE` itself, plus every `VCPKG_*` variable (`VCPKG_TARGET_TRIPLET`, `VCPKG_MANIFEST_MODE`/`_FEATURES`/`_DIR`, `VCPKG_CHAINLOAD_TOOLCHAIN_FILE`, `VCPKG_OVERLAY_*`) — vcpkg's own words, "before the first `project()` directive" |
| **Conan 2, explicit flow** (`CMakeToolchain`+`CMakeDeps`/`CMakeConfigDeps`) | Two-step, out-of-band: `conan install` writes `conan_toolchain.cmake` + `CMakePresets.json` (schema 3, ≥CMake 3.21) + `CMakeUserPresets.json` (schema 4, ≥CMake 3.23, skipped if a non-Conan one exists); then `-DCMAKE_TOOLCHAIN_FILE=conan_toolchain.cmake` or `cmake --preset conan-*` | It *is* the sole toolchain file for that configure; `conan install` itself must run before `cmake`, so there is no "already set" case to react to at CMake time | `tools.cmake.cmaketoolchain:user_toolchain=[<file>,...]` conf → `include()`d as the first lines of `conan_toolchain.cmake`, ahead of every other block; a user file's `CMAKE_SYSTEM_*` values are left alone by Conan's `generic_system` block | Nothing at the CMake-variable level beyond the one `-DCMAKE_TOOLCHAIN_FILE=` — everything else (compiler, cppstd, `[conf]`) is precomputed by `conan install`, which runs before CMake even starts |
| **cmake-conan provider** (`conan_provider.cmake`) | `-DCMAKE_PROJECT_TOP_LEVEL_INCLUDES=/path/to/conan_provider.cmake` (≥CMake 3.24; module-name form ≥3.29) | Coexists by construction — never sets or reads `CMAKE_TOOLCHAIN_FILE` at all; the README states compiler/global settings must come from the explicit flow instead | `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` accepts a list; `list(APPEND ...)` composes it with other top-level includes | The include-list variable itself; the provider only intercepts the *first* `find_package()`/`FetchContent_MakeAvailable`, so any `find_program`/`find_library`/`find_path` called earlier is invisible to it |
| **rules_foreign_cc `cmake()`** | Wraps whatever the Bazel `cc_toolchain` supplies; `cache_entries["CMAKE_TOOLCHAIN_FILE"]` lets the caller override | Caller-supplied `CMAKE_TOOLCHAIN_FILE` in `cache_entries` (or `generate_crosstool_file=False`) makes rules_foreign_cc **skip its own crosstool synthesis** and pass Bazel-derived values as plain cache entries/env vars instead — the caller's file wins outright | The `cache_entries`/`generate_args` attributes themselves; no separate "chain into mine" hook exists because the caller's file is used verbatim, not merged | `CMAKE_SYSTEM_NAME` in `cache_entries` if `generate_crosstool_file=True` and cross-compiling (rules_foreign_cc's synthesized crosstool file needs it, per cmake-toolchains.7.rst's own `CMAKE_SYSTEM_PROCESSOR`-is-ignored-without-it rule) |
| **Hand-written cross toolchain** | `-DCMAKE_TOOLCHAIN_FILE=<file>` directly, or as the file every other claimant above chainloads into | Whichever of the above wraps it decides precedence (vcpkg: chainload runs first, vcpkg fills gaps; Conan `user_toolchain`: user's `CMAKE_SYSTEM_*` values win, Conan fills gaps) | Being `include()`-d is the hook — no chainload variable of its own; must be idempotent and side-effect-free on repeat `include()` since it will be re-read on every `try_compile` whole-project check (CMP0137, §7) | `CMAKE_SYSTEM_NAME`/`_VERSION`/`_PROCESSOR`, `CMAKE_SYSROOT`, `CMAKE_FIND_ROOT_PATH_MODE_*` — all of cmake-toolchains(7)'s own before-`project()` list |

## Normative guidance candidates

1. **A configure sets `CMAKE_TOOLCHAIN_FILE` exactly once, from exactly one source of record.** Rationale: the variable is a single scalar (§1); a second `-D`/preset/env assignment silently overwrites the first with no diagnostic. Verify: `rg -rn CMAKE_TOOLCHAIN_FILE . --include='CMakePresets.json' --include='CMakeUserPresets.json' --include='*.yml'` run from the repository root, read per configure leg; more than one *distinct value* assigned to it for the same leg (across the matched presets and CI files, plus any `set()` before `project()`) is the finding — empty output (one or zero assignments) is pass. Floor: any CMake version.
2. **Never run vcpkg's and Conan's generated toolchains in the same configure.** Rationale: no primary source describes or supports chaining one package manager's generated toolchain into the other's slot (§9); each expects to own the whole toolchain. Verify: `rg -rn -e vcpkg.cmake -e conan_toolchain.cmake . --include='CMakePresets.json' --include='CMakeUserPresets.json' --include='*.yml'` run from the repository root; both patterns present for one configure leg = finding, empty or single-pattern output = pass. Floor: any CMake version; MUST.
3. **A cross toolchain file that a package manager may chainload must be idempotent and free of project-level commands (`project()`, `enable_language()`, unconditional `execute_process()`/`message(FATAL_ERROR)`).** Rationale: it is re-read on every `try_compile` whole-project check (cmake-toolchains.7.rst's own `CMAKE_SOURCE_DIR`/`CMAKE_BINARY_DIR` warning, CMP0137), and both vcpkg and Conan build their own re-entrancy guards around this assumption rather than treating it as optional (§7). Verify: reading heuristic — grep the toolchain file for `execute_process(` or `message(FATAL_ERROR` outside an `if(NOT DEFINED ...)`/first-run guard; any unconditional hit is a finding. Floor: CMake ≥3.24 for CMP0137's `NEW` behavior to matter; the underlying re-read exists on any version.
4. **Register a dependency provider only from a file named in the user's own `CMAKE_PROJECT_TOP_LEVEL_INCLUDES`, never from the project's `CMakeLists.txt`, and never assume it is the only one that will run.** Rationale: `SET_DEPENDENCY_PROVIDER` is user-owned by Kitware's own words (§6), and a second top-level include calling it silently replaces the first with no error (measured, §6) — a project that ships its own provider file and expects it to remain active cannot guarantee that if the user's `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` names anything else afterward. Verify: `rg -rn SET_DEPENDENCY_PROVIDER . --include='CMakeLists.txt' --include='*.cmake'` run from the repository root; any hit outside a file plausibly reached only via `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` is a finding, empty output is pass. Floor: CMake ≥3.24 (module-name form ≥3.29); MUST.
5. **When wiring a provider (or any `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` file) that must fire even without an early `find_package()` in the project, pair it with `cmake_language(DEFER DIRECTORY ... CALL find_package ...)`, not a hope that some early call exists.** Rationale: the provider only intercepts `find_package`/`FetchContent_MakeAvailable`; `find_program`/`find_library`/`find_path` calls before the first `find_package` are invisible to it (§4, §6), and a real exemplar needed this exact workaround for a shipped issue (aminya__project_options, cmake-conan#595). Verify: reading heuristic — if a provider file is added and the project's dependency-consuming code starts with anything other than `find_package`, check for a matching `cmake_language(DEFER ... CALL find_package ...)`. Floor: CMake ≥3.24 for `cmake_language(DEFER)`.
6. **Prefer Conan's `tools.cmake.cmaketoolchain:user_toolchain` over `:toolchain_file` when a cross toolchain must coexist with Conan.** Rationale: `user_toolchain` is included first and lets Conan still populate `find_paths`/`CMakeDeps` wiring around it; `:toolchain_file` discards `conan_toolchain.cmake` entirely and "translates all the toolchain responsibility to the user" per Conan's own docs (§3). Verify: `rg -rn -e 'tools.cmake.cmaketoolchain:toolchain_file' -e 'tools.cmake.cmaketoolchain:user_toolchain' .` run over the Conan home/profile directory and any in-repo `global.conf`; presence of `:toolchain_file` without a documented reason (no CMakeDeps consumer needing auto-discovery) is a SHOULD finding, not a MUST — some projects genuinely want full toolchain replacement; empty output means neither knob is set (pass by default). Floor: Conan 2.x, any.
7. **A vcpkg toolchain wired into a configure preset must set `CMAKE_TOOLCHAIN_FILE`/`toolchainFile` and every `VCPKG_*` cache variable inside that same preset's `cacheVariables`, never as a later `set()` in `CMakeLists.txt`.** Rationale: preset `cacheVariables` apply before `project()` runs; a `CMakeLists.txt`-level `set(VCPKG_MANIFEST_MODE OFF)` placed after `project()` is a silent no-op (§10, CMAKE_PROJECT_TOP_LEVEL_INCLUDES.rst's own "before any languages have been enabled" wording extends to the toolchain-adjacent variables read at the same phase). Verify: ordering check — the line number of `project(` in the top-level `CMakeLists.txt` versus every `set(VCPKG_` or `set(CMAKE_TOOLCHAIN_FILE` line; any hit after `project(` is a finding (this specific check is M-H-02's, cited not restated). Floor: presets schema ≥3 (CMake ≥3.21).
8. **When rules_foreign_cc wraps a CMake project that itself uses a package manager's toolchain, pass that manager's generated `CMAKE_TOOLCHAIN_FILE` through `cache_entries` explicitly and set `generate_crosstool_file = False` (or rely on the same-effect auto-skip), rather than letting rules_foreign_cc synthesize a competing crosstool file.** Rationale: rules_foreign_cc already auto-skips synthesis when `cache_entries["CMAKE_TOOLCHAIN_FILE"]` is present (§5), but the reverse — omitting it and letting rules_foreign_cc's own crosstool file silently replace the manager's — throws away every setting the manager's toolchain would have applied (cppstd, CRT linkage, sanitizer flags). Verify: `rg -rn cache_entries . --include='BUILD.bazel' --include='*.bzl'` run from the repository root, read at the `cmake()` target; absence of `CMAKE_TOOLCHAIN_FILE` inside a matched `cache_entries` block when the wrapped project's own build normally consumes one from a package manager is a finding. Floor: rules_foreign_cc's `cmake()` rule, any recent tag (checked at 0.16.0-adjacent `bb2f3e5d72`; the `cache_entries` mechanism itself predates this dive's SHA window).

## Exemplar evidence

- **vcpkg's own toolchain** (microsoft__vcpkg@`c4ee5a52d7`:scripts/buildsystems/vcpkg.cmake:207-282) is the canonical positive example for rule 3 (idempotent, self-guarding) — it is the thing every other claimant's chainload hook is built to tolerate.
- **aminya__project_options@`412045e1f1`:src/Conan.cmake:184-248** satisfies rule 5 directly: `list(APPEND CMAKE_PROJECT_TOP_LEVEL_INCLUDES ...)` plus `cmake_language(DEFER ... CALL find_package Git QUIET)`, citing conan-io/cmake-conan#595 in its own comment. The same file's `_run_conan1` macro (`src/Conan.cmake:21-35`) is a live negative-space marker: it `FATAL_ERROR`s if Conan ≥2.0.0 is detected and tells the caller to use `run_conan()`/Conan 2 instead — a real project drawing the exact Conan-1-vs-2 line this program's sibling groups (M-M-07) also flag.
- **aminya__project_options@`412045e1f1`:src/Vcpkg.cmake:160,219**: `run_vcpkg()` sets `CMAKE_TOOLCHAIN_FILE ... CACHE ...` and its own doc comment states "should be called before defining `project()`" — an independent confirmation of rule 1/7's ordering requirement, written by a project with no visibility into vcpkg's own docs saying the same thing.
- **microsoft__vcpkg-tool@`51bf87ca6e`:CMakePresets.json:40-46** is the corpus's one preset using `toolchainFile`, and it is the positive example for rule 7 — `toolchainFile` and a `VCPKG_*` cache variable (`VCPKG_BUILD_TLS12_DOWNLOADER`) sit in the same preset's `cacheVariables`, not split across a preset and a `CMakeLists.txt` `set()`.
- **bazel-contrib__rules_foreign_cc@`bb2f3e5d72`:examples/cmake_crosstool/BUILD.bazel** exercises the caller-supplied-toolchain path this dive's rule 8 recommends, though at this SHA the example predates the 0.16.0 BCR-spoke version-model change (M-K-02's territory) — re-check whether `generate_crosstool_file`'s default or the example's `cache_entries` shape changed there; not re-measured here.
- **/home/mherwig/dev/find_ocx**: no `CMAKE_TOOLCHAIN_FILE` reference at all ([host] H6, `rg -c TLS_VERIFY ocx.cmake` → 0 was measured for a different row, but the same read found no toolchain-file handling either); find_ocx is a tool bootstrapper, not a library consumer, so this dive's rows do not apply to it directly — it competes with Conan `tool_requires`/vcpkg `"host": true` for *tool* provisioning (§8), not with vcpkg/Conan's toolchain files for *library* provisioning, a distinction the frame's own audience-2 framing already drew.
- No corpus repo was found chaining vcpkg's and Conan's toolchains together (consistent with rule 2's absence-of-precedent finding in §9) — this is a negative result, not an oversight: the 93-file wave-1 toolchain inventory (`cmake-audit/scratch/deps-toolchain-files.tsv`) has zero hits for `conan_toolchain.cmake` inside a `VCPKG_CHAINLOAD_TOOLCHAIN_FILE` value or vice versa, re-checked by grep against the same file (still wave-1 SHAs; a full re-run at the 2026-09-26 SHAs was not repeated here since the file's own paths, not its content, are what the map cites and neither vcpkg nor Conan repos are in the 93-file list to begin with).

## AI-agent angle

- **Treating `CMAKE_TOOLCHAIN_FILE` as mergeable.** A model trained on scattered Stack Overflow snippets from both vcpkg and Conan tutorials will often suggest setting `CMAKE_TOOLCHAIN_FILE` twice (once per manager) "just in case," or concatenating two paths with a semicolon as if it were a list variable. Mechanical check: `CMAKE_TOOLCHAIN_FILE` is documented as a scalar path, singular ("Path to toolchain file"); a semicolon inside its value is a syntax error at best, a single garbage path at worst — grep with `rg -rn 'CMAKE_TOOLCHAIN_FILE.*;' .` from the repository root and flag any hit inside a `set()`/`-D`.
- **Assuming Conan 1's `cmake` generator or `conanbuildinfo.cmake` still exists.** Conan 1's classic generators are gone from Conan 2's toolchain story entirely; a model may still emit `include(${CMAKE_BINARY_DIR}/conanbuildinfo.cmake)` or `conan_basic_setup()`. Mechanical check: `rg -rn -e conanbuildinfo -e conan_basic_setup .` from the repository root — any hit against a `conanfile.py` declaring `generators = "CMakeToolchain"` (Conan 2 style) is Conan-1 residue; empty output is pass.
- **Believing `VCPKG_CHAINLOAD_TOOLCHAIN_FILE` has one meaning.** Because the name and one-line description look self-evident, a model will confidently explain it as "chains a toolchain into vcpkg" without knowing the triplet-file/project-scope split vcpkg's own maintainers still haven't resolved (#36244). Mechanical check: when this variable appears in a *triplet file* (`triplets/*.cmake`, `triplets/community/*.cmake`) versus the CMake command line / `CMakePresets.json`, the effect is different — flag any explanation or generated code that treats the two locations identically.
- **Registering a dependency provider from the project's own `CMakeLists.txt`.** A model asked "how do I make CMake use Conan automatically" may emit `cmake_language(SET_DEPENDENCY_PROVIDER ...)` directly in `CMakeLists.txt`, which the primary source states outright will error ("outside of that context" — only `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` files may call it). Mechanical check: `rg -rn SET_DEPENDENCY_PROVIDER .` from the repository root — any hit in a file that is not reachable only via `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` is either a bug report waiting to happen or a hallucinated capability; empty output is pass.
- **Assuming the cmake-conan provider sets the compiler/toolchain.** Because "provider" sounds toolchain-adjacent, a model may claim `-DCMAKE_PROJECT_TOP_LEVEL_INCLUDES=conan_provider.cmake` alone is a complete cross-compiling or compiler-pinning solution. The README explicitly disclaims this (§4); mechanical check: if a generated instruction sequence sets only `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` and never runs `conan install`/`cmake --preset` separately, and the task involves choosing a non-default compiler or cross-compiling, flag it as incomplete.
- **Citing 2020-era rules_foreign_cc `framework.bzl` line numbers.** This dive's own brief was handed a stale path (`foreign_cc/private/framework.bzl`) that no longer exists at `bb2f3e5d72` — the logic moved to `foreign_cc/private/cmake_script.bzl`. A model with 2024-or-earlier training data will cite the old path confidently. Mechanical check: `git -C <rules_foreign_cc-checkout> log --follow --oneline -- foreign_cc/private/cmake_script.bzl` (or simply check the path exists) before trusting any cited line number in this repo.

## Contested / evolving

- **The `foreign_cc/private/framework.bzl` → `foreign_cc/private/cmake_script.bzl` split.** This dive's brief named `foreign_cc/cmake.bzl` and `foreign_cc/private/framework.bzl` at `bazel-contrib__rules_foreign_cc@bb2f3e5d72`, following wave-1's file list captured at the older `f68b351c46` SHA. At `bb2f3e5d72`, `framework.bzl` does not exist; the toolchain-composition logic (`create_cmake_script`, `no_toolchain_file`) lives in `foreign_cc/private/cmake_script.bzl`. This dive cites the correct, current path throughout; any earlier consolidated text citing `framework.bzl` for this logic is now stale and should be corrected on sight, not repeated.
- **`VCPKG_CHAINLOAD_TOOLCHAIN_FILE`'s two-meanings issue is unresolved and trending toward a rename, not a fix.** [microsoft/vcpkg#36244](https://github.com/microsoft/vcpkg/issues/36244) remains open with maintainer engagement (`FrankXie05` tagging a reviewer) but no shipped change as of 2026-09-26; the proposed fix is a *second* variable name (`VCPKG_PROJECT_CHAINLOAD_TOOLCHAIN_FILE`/`VCPKG_PORTS_CHAINLOAD_TOOLCHAIN_FILE`), which if it ships would deprecate the very row this dive documents. Any shipped rule text citing `VCPKG_CHAINLOAD_TOOLCHAIN_FILE`'s dual meaning should carry a version floor and be re-checked against vcpkg's changelog before every future consolidation.
- **Whether Conan will ever ship a vcpkg-style generic chainload toolchain is an open design question, not a settled "no."** [conan-io/conan#12341](https://github.com/conan-io/conan/issues/12341) is a live feature request (2023-opened, commented as recently as visible in this fetch) with the maintainer acknowledging the chicken-and-egg problem it would solve but no committed timeline; `cmake-conan`'s dependency-provider flow (§4) is the closer-but-different answer Conan actually shipped instead. If Conan ships something resembling the requested generic toolchain, rule 2 and the §9 finding should be re-verified, not assumed to still hold.
- **rules_foreign_cc's own bundled-CMake-version story changed underneath this dive during the same research window** (era-recheck-2026-09-26.md: 0.16.0, 2026-09-15, replaced the fixed 3.19.8–4.0.7 range with BCR "spoke" registration, no fixed default). This dive's rule 8 and the composition table's rules_foreign_cc row describe the *toolchain-file* mechanism, which did not change at 0.16.0 (confirmed by reading `cmake.bzl`/`cmake_script.bzl` at `bb2f3e5d72`, which postdates the 0.16.0 tag date); the *version* question is explicitly M-K-02's, not this dive's, and remains open there.

## Claims wave-3 dive `toolchains-and-cross/cross-compile-find-root` must still run

Per the topic map's staging note ("dependency-seam/toolchain-composition lists the composition claims it could not settle from docs; run those here first"):

1. **The actual `CMAKE_FIND_ROOT_PATH_MODE_*` resolution matrix** for `find_package`/`find_library`/`find_program` against a fake sysroot plus a host-installed copy of the same library name — this dive found only the normative default table (cmake-toolchains.7.rst's worked example: `PROGRAM NEVER`, `LIBRARY`/`INCLUDE`/`PACKAGE ONLY`), never measured which one a real `find_program(gen)` picks with and without `NO_CMAKE_FIND_ROOT_PATH` (M-H-06's own measurement half).
2. **The exact re-read count of a toolchain file within one configure containing two `try_compile` checks**, with a `message()` marker inside the toolchain file to count invocations directly (M-H-07's own verification, staged as "count reads in the M-H-05 scratch" — this dive established *that* re-reads happen and *why* two products guard against it, not *how many* in a representative project).
3. **Reproducing `VCPKG_CHAINLOAD_TOOLCHAIN_FILE`'s precedence rules without vcpkg itself installed** (no network available to this dive; vcpkg's bootstrap script requires downloading the tool) — the wave-3 dive has the cross-compiler and scratch budget to build a fake triplet directory and confirm variable precedence experimentally rather than by reading `vcpkg.cmake` alone.
4. **`pkg_check_modules`/`PKG_CONFIG_SYSROOT_DIR` interaction with a chainloaded cross toolchain** (M-G-19's cross-build half) — out of this dive's fetched-primary-sources scope entirely; wave-3's own listed experiment 4 already covers it.

## Sources

| URL or measurement | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [CMAKE_TOOLCHAIN_FILE.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_TOOLCHAIN_FILE.rst) | Kitware normative doc, raw RST | Fetched 2026-09-26, current at 4.4.2 | Establishes the single-scalar, env-var-since-3.21 facts underlying rule 1 |
| [CMAKE_PROJECT_TOP_LEVEL_INCLUDES.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_PROJECT_TOP_LEVEL_INCLUDES.rst) | Kitware normative doc, raw RST | Fetched 2026-09-26 | List semantics, 3.29 module-name form, ordering relative to the toolchain file |
| [cmake_language.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/cmake_language.rst) | Kitware normative doc, raw RST | Fetched 2026-09-26 | `SET_DEPENDENCY_PROVIDER` replace-on-second-call semantics and the user-control statement, both quoted verbatim |
| [cmake-toolchains.7.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-toolchains.7.rst) | Kitware normative manual, raw RST | Fetched 2026-09-26 | `CMAKE_SOURCE_DIR`/`CMAKE_BINARY_DIR`-unsafe-in-toolchain warning (re-read evidence), find-root-mode defaults |
| [CMP0137.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0137.rst) | Kitware policy doc | Fetched 2026-09-26 | Confirms `try_compile` platform-variable propagation and its 3.24 policy gate |
| [CMAKE_CROSSCOMPILING_EMULATOR.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_CROSSCOMPILING_EMULATOR.rst) | Kitware normative doc | Fetched 2026-09-26 | Version floors (3.3/3.15/3.28) for the host-tool-execution primitive |
| [vcpkg CMake integration](https://learn.microsoft.com/en-us/vcpkg/users/buildsystems/cmake-integration) | Microsoft normative doc | Fetched 2026-09-26 | Chainload mechanism, "before first project()" rule, preset recommendation |
| [vcpkg.json reference](https://learn.microsoft.com/en-us/vcpkg/reference/vcpkg-json) | Microsoft normative doc | Fetched 2026-09-26 | `"host": true` dependency field, quoted verbatim for M-H-06 |
| microsoft__vcpkg@`c4ee5a52d7`:scripts/buildsystems/vcpkg.cmake:207-282,960 | Exemplar corpus source | Corpus re-fetched 2026-09-26 | Measured/read source for the self-guard mechanism, the strongest evidence in this dive |
| [microsoft/vcpkg#36244](https://github.com/microsoft/vcpkg/issues/36244) | GitHub issue, fetched via `gh issue view` | Filed 2024, open 2026-09-26 | Primary source for the chainload two-meanings problem, unresolved |
| [Conan 2 CMakeToolchain reference](https://docs.conan.io/2/reference/tools/cmake/cmaketoolchain.html) | Conan normative doc | Fetched 2026-09-26, Conan 2.32.0 era | `user_toolchain` vs `toolchain_file`, block ordering, presets skip-if-foreign rule |
| [cmake-conan develop2 README](https://raw.githubusercontent.com/conan-io/cmake-conan/develop2/README.md) | Conan-affiliated normative doc, raw markdown | Fetched 2026-09-26, HEAD `b1593849dd` (2026-06-05) | Provider-flow limitations, quoted verbatim, load-bearing for §4 |
| [conan-io/conan#12341](https://github.com/conan-io/conan/issues/12341) | GitHub issue, fetched via `gh issue view` | Opened 2023, commented through 2024+ | Closest primary discussion of Conan adopting vcpkg's chainload model; grounds §9's "no blessing found" |
| bazel-contrib__rules_foreign_cc@`bb2f3e5d72`:foreign_cc/cmake.bzl:210, foreign_cc/private/cmake_script.bzl:96-176 | Exemplar corpus source | Corpus re-fetched 2026-09-26 | `no_toolchain_file` decision and its two downstream code paths, quoted verbatim |
| aminya__project_options@`412045e1f1`:src/Conan.cmake:21-248, src/Vcpkg.cmake:160,219 | Exemplar corpus source | Corpus re-fetched 2026-09-26 | Real project independently confirming before-`project()` ordering and the `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` list/DEFER workaround |
| microsoft__vcpkg-tool@`51bf87ca6e`:CMakePresets.json:40-46 | Exemplar corpus source | Corpus re-fetched 2026-09-26 | The one corpus preset using `toolchainFile`, positive example for rule 7 |
| Measurement: `cmake_language(SET_DEPENDENCY_PROVIDER)` from two `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` files | Real run, CMake 4.4.2 via `ocx package exec kitware/cmake:4.4 -- cmake` | Run 2026-09-26 | Upgrades the normative replace-on-second-call claim to measured tier; scratch at `.agents/research/cmake-dependency-seam/scratch/toolchain-composition/` |
| `.agents/research/cmake-audit/scratch/deps-toolchain-files.tsv` | Wave-1 exemplar inventory (93 files, 2026-09-05 SHAs) | 2026-09-05 | Negative-result cross-check for §9 (no vcpkg/Conan chainload pairing found); paths, not content-freshness, are what this dive relies on |

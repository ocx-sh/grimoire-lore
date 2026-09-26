---
title: "Verify wave 2: cmake-package-managers.md (Conan 2 and vcpkg at the CMake seam)"
verifies: .agents/research/cmake-package-managers.md
model: opus
date: 2026-09-26
---

# Verify wave 2: cmake-package-managers.md

Everything was re-checked on 2026-09-26 against the strongest evidence that was cheap to get. The measuring tools were:

- **Conan 2.32.0**, and 2.27.0 for one bisect, installed in a scratch venv (`uv pip install conan==2.32.0`) with an offline local cache.
- **vcpkg-tool 2026-09-26**: the release binary `vcpkg-glibc`, which reports `2026-09-26-51bf87ca6e…`, plus its standalone bundle.
- **CMake 3.31.12, 4.3.4 and 4.4.2** through `ocx package exec kitware/cmake:{3.31,4.3,4.4}`, with ninja and `zig c++`.

The primary sources were raw Conan and vcpkg-docs files, Conan source at a tag, vcpkg-tool source at tag `2026-09-26`, the GitHub Releases and commits APIs, and CMake `Help/*.rst` at a tag. Scratch sources are copied to `scratch/verify-package-managers/`. Build trees, venvs and caches stay under `/home/mherwig/.cache/cmake-measure-scratch/verify-package-managers/`.

Result: 54 claims checked. 40 are CONFIRMED, 12 CORRECTED and 2 UNVERIFIABLE. Three MUST rows had verification commands that did not work on planted input: CONAN-09 missed a violation and flagged a clean case, VCPKG-06 stayed green on three planted violations, and VCPKG-04 flagged a clean case. All three are fixed in place.

## Ledger

| # | ID or claim | verdict | evidence | note |
|---|---|---|---|---|
| 1 | Conan 2.32.0 is current (2026-08-31) | CONFIRMED | Releases API: `2.32.0` published 2026-08-31T11:21:25Z; the one before it is 2.31.2 | |
| 2 | vcpkg-tool 2026-09-26 is current, published 2026-09-26T06:19Z | CONFIRMED | Releases API `2026-09-26` 2026-09-26T06:19:05Z; the binary prints `2026-09-26-51bf87ca6e9bf3e622d84ff323bd202ab1ca0c0b` | Supersedes the era re-check's 2026-07-27 (conflict 10 holds) |
| 3 | vcpkg registry 2026.07.29 | CONFIRMED | Releases API `2026.07.29` 2026-07-31T23:15:56Z | |
| 4 | cmake-conan `develop2` HEAD `b1593849dd` (2026-06-05) | CONFIRMED | commits API: `b1593849dd` 2026-06-05T21:47:00Z; corpus clone at the same SHA | |
| 5 | Measurement hosts are CMake 3.31.12 and 4.4.2 | CONFIRMED | `cmake --version` on both; `:4.3` serves 4.3.4, which was added as a third point | |
| 6 | CONAN-01 (MUST): `conans/__init__.py` is 0 bytes at 2.32.0, so a Conan-1 import dies | CONFIRMED | `curl …/2.32.0/conans/__init__.py` gives 0 bytes. Measured: `conan create` of a `from conans import ConanFile` recipe gives `ImportError: cannot import name 'ConanFile' from 'conans'`, exit 1 | Floor 2.0 holds: at 2.0.0 `conans/__init__.py` holds only constants and `__version__` |
| 7 | CONAN-02 (MUST): `cpp_info.names` is a `MockInfoProperty` at `cpp_info.py:96` that throws the value away and only warns | CONFIRMED | Source line 96; `__setitem__` records usage and stores nothing. Measured: a names-only `pkga` gives `pkga-config.cmake` and `pkga::pkga` under CMakeDeps, plus `WARN: deprecated: 'cpp_info.names' used in: pkga/1.0` | |
| 8 | CONAN-03 (MUST): `build_requires` deprecated in 2.28.0 (PR #19849) | CONFIRMED | changelog.rst:198 under `2.28.0 (28-Apr-2026)`. Measured: 2.32.0 prints `WARN: deprecated: build_requires is deprecated`; 2.27.0 prints nothing for the same recipe | Extra: in `conanfile.txt`, `[build_requires]` is a hard error at 2.32.0 (`ConfigParser: Unrecognized field 'build_requires'`). The rule already covers conanfile.txt, so no edit |
| 9 | `tool_requires` exists since 2.0 | CONFIRMED | `conans/model/requires.py`@2.0.0 defines `ToolRequirements` | |
| 10 | CONAN-04 (SHOULD): CMakeConfigDeps is experimental at 2.32.0 | CONFIRMED | `cmakeconfigdeps.rst:6` includes `experimental_warning.inc`; changelog.rst:321 under 2.25.0 says "Move `CMakeConfigDeps` from incubating to experimental". Measured: `WARN: experimental: CMakeConfigDeps is experimental, and might get breaking changes` | `incubating.rst` still says "generally available", so conflict 1 holds |
| 11 | CMakeConfigDeps floor is Conan 2.25.0 | CONFIRMED | rst:9 says "available as experimental from Conan 2.25" | The name was importable at 2.20.0 to 2.24.0, but only behind the `tools.cmake.cmakedeps:new` gate (source at 2.24.0). The floor is correct for ungated use |
| 12 | Corpus: 14 CMakeConfigDeps files outside CCI, all in cmake-conan; CCI has 2,515 CMakeDeps and 6 CMakeConfigDeps | CONFIRMED | Recount at corpus HEADs: CCD 14 (all `conan-io__cmake-conan`). CMakeDeps-only files: project_options 2, Catch2 2, conan 1, cmake-init 1. CCI 2515/6 | |
| 13 | CONAN-05 (MUST): CMakeConfigDeps writes no `Find*.cmake`; `cmakeconfigdeps.rst` line 80 | CORRECTED | The quote is at line 79 on develop2 today. Measured with `cmake_find_mode=both`: CMakeDeps writes `FindGamma.cmake`, CMakeConfigDeps writes only `GammaConfig*.cmake` | Citation only; the rule stands and is now [N]+[M] |
| 14 | CONAN-06 (MUST): under CMakeDeps a `tool_requires` gets no config files unless it is in `build_context_activated` | CONFIRMED | `cmakedeps.rst:117`. Measured: `tool/1.0` as tool_requires gives 0 `tool*` files by default and 5 when activated; CMakeConfigDeps writes 4 with no activation | |
| 15 | CONAN-07 (SHOULD): the explicit flow is "the recommended flow for most cases", the provider is for "extraordinary and exceptional scenarios" | CONFIRMED | `integrations/cmake.rst:43,45` | |
| 16 | CONAN-07: the provider needs CMake 3.24 (`conan_provider.cmake:36`), only warns on a missing generator (593-599), and checks Conan 2.0.5 | CONFIRMED | Lines 36 (`cmake_minimum_required(VERSION 3.24)`), 593-599 and 23 (`CONAN_MINIMUM_VERSION 2.0.5`). Measured on 4.4.2 offline: with `CMakeDeps` in conanfile.txt it prints the WARNING, exits 0 and still defines `Beta::beta` | |
| 17 | CONAN-07: five documented limits; "profiles for anything but MSVC, gcc and clang" | CORRECTED | README:49-55 lists five limits, but the supported set is "Windows+MSVC, Linux+gcc, Apple+clang" | Rule text now uses the platform+compiler pairs |
| 18 | CONAN-08 (SHOULD): Conan skips a `CMakeUserPresets.json` without `vendor.conan` (`presets.py:307-311`) | CONFIRMED | `presets.py:310`@2.32.0. Measured: a hand-written file stays byte-identical, nothing is logged, and Conan still prints `(cmake>=3.23) cmake --preset conan-release`. The fresh file is `"version": 4` with `vendor.conan`; the generated `CMakePresets.json` is `"version": 3` | |
| 19 | CONAN-09 (MUST): lock picked up implicitly, strict, `--lockfile-partial` relaxes | CONFIRMED | Measured on 2.32.0: implicit pickup kept `tool/1.0` under a widened range; `--lockfile=` resolved 1.1; missing requirement gave `ERROR: Requirement 'pkgb/1.0' not in lockfile 'requires'`; `--lockfile-partial` exited 0. `lockfiles.rst:113-118,138-139` | |
| 20 | CONAN-09 Verify: `grep -rn -e '--lockfile=' .github` must be non-empty | CORRECTED | Planted `--lockfile=""` (lock off) passed the check. The clean `-l conan.lock` was flagged. `conan install -h` lists `-l, --lockfile LOCKFILE` | Now pairs install lines with `--lockfile[= ]` or ` -l `, and adds a must-be-empty grep for an empty `--lockfile=` |
| 21 | CONAN-10 (MUST): later `set(CMAKE_CXX_STANDARD 20)` wins with a STATUS line; `-D` silently loses; `cxx_std_20` silently raises; exit 0 under `-Werror=dev` | CONFIRMED | Re-run with Conan 2.32.0's full generated toolchain on 3.31.12, 4.3.4 and 4.4.2. set20: `-std=c++20`, 1 watch line, rc 0. cli20: `-std=c++17`, 0 lines. feature20: `-std=c++20`, 0 lines. The `if(NOT DEFINED)` guard gives `-std=c++17`, 0 lines | |
| 22 | CONAN-10 / Verdict 4: "invisible to `-Werror=dev`" | CORRECTED | CMake 4.4.2 prints "The error=dev option is deprecated. Use -Werror=author instead."; with `-Werror=author` the run is again rc 0 with 1 line | Adds the 4.4 name; the conclusion is unchanged |
| 23 | CONAN-10: the watch exists from Conan 2.7.0 (absent 2.6.0) | CONFIRMED | `blocks.py` has 0 `conan_modify_std_watch` matches at 2.6.0 and 3 at 2.7.0; present at 2.32.0 (`blocks.py:338`) | Only the endpoints were fetched; 2.8 to 2.31 are inferred |
| 24 | CONAN-10: `VSRuntimeBlock` is a plain `set()` with no watch | CONFIRMED | `blocks.py:60-75`@2.32.0. The generated msvc toolchain has line 57 `set(CMAKE_MSVC_RUNTIME_LIBRARY "$<$<CONFIG:Release>:MultiThreaded>")`, and its only `variable_watch` is on `CMAKE_CXX_STANDARD` | |
| 25 | CONAN-11 (SHOULD): `check_min_cppstd`, floor 2.0; Catch2 `conanfile.py:80` | CONFIRMED | `conan/tools/build/__init__.py`@2.0.0 exports it; `catchorg__Catch2@222e233:conanfile.py:80` | |
| 26 | CONAN-12 (SHOULD): `tool_requires` is built for the build machine | CONFIRMED | `cross_building_with_conan.rst:59,163`: the build context holds tool requirements, and the default build profile is used when `-pr:b` is absent | |
| 27 | CONAN-12: "2.27.0 added negated-OR patterns in `[tool_requires]`" | CORRECTED | changelog.rst:223 under 2.27.0 says the patterns are in *profile* `[tool_requires]` (PR #19780) | Not conanfile.txt |
| 28 | Workspaces out of incubating at 2.31.0 | CONFIRMED | changelog.rst:64 under 2.31.0: "Get Workspace feature out of incubating" | |
| 29 | CCI residue: 2,002 recipe folders; 40 `from conans`, 35 `build_requires`, 270 `cpp_info.names`, 24 with no `set_property` | CONFIRMED | Recount at `07389b8f`: 2002 / 40 / 35 / 270 / 24. Including `test_package`, the figures are 128 `from conans` and 44 `build_requires`; the file correctly counts recipe folders only | |
| 30 | VCPKG-01 (MUST): the Classic-mode quote at `versioning.md:117` | CONFIRMED | Line 117 is verbatim | |
| 31 | VCPKG-01: missing baseline "is silent" | CORRECTED | Measured on vcpkg-tool 2026-09-26: `version>=` without a baseline is "rejected because it uses "version>=" and does not have a "builtin-baseline"", and `overrides` is rejected the same way. A plain `["foo"]` manifest went on to compiler detection with no warning | The silent case is the constraint-free manifest; the MUST stands |
| 32 | VCPKG-01 corpus: 9 consumer manifests, 5 with baseline; arrow pins the root at `.env:95` = `cpp/vcpkg.json:61` | CONFIRMED | Recount: project_options 5 (2 with), arrow 3 (2 with), cmake-init 1 (with). `.env:95` `VCPKG="9b965a11…"`, `install_vcpkg.sh:44` `git checkout`, `cpp/vcpkg.json:61` has the same SHA | |
| 33 | `x-update-baseline` is experimental and `--add-initial-baseline` exists | CONFIRMED | `commands/update-baseline.md:8` includes experimental.md; `:13,:36` | |
| 34 | VCPKG-02 (MUST): transitive `overrides` and dependency `vcpkg-configuration.json` are ignored | CONFIRMED | `vcpkg-json.md:223`; `vcpkg-configuration-json.md:12-13`; `versioning.md:119` | |
| 35 | VCPKG-03 (SHOULD): `default-features` (`:80`) and `host` (`:364-368`); arrow marks both helpers host | CONFIRMED | Quotes at `:80` and `:368`; `apache__arrow@3ad410b:ci/vcpkg/vcpkg.json` has `vcpkg-cmake` and `vcpkg-cmake-config` with `"host": true` | |
| 36 | VCPKG-04 (MUST): `VCPKG_*` set after `project()` is a silent no-op | CONFIRMED | `cmake-integration.md:43`. Measured with the bundle's `vcpkg.cmake` on 3.31.12, 4.3.4 and 4.4.2: triplet before `project()` or via `-D` finds arm64; after `project()` it finds x64 silently, rc 0 | |
| 37 | VCPKG-04 Verify and Floor ("presets need CMake 3.19") | CORRECTED | The planted clean `if(VCPKG_TARGET_TRIPLET MATCHES …)` after `project()` was flagged. The `toolchainFile` field is "allowed in preset files specifying version 3" (cmake-presets.7.rst@v3.21.0:185-191) and absent at v3.20.0 | Verify now greps writes only; the floor separates v1 (3.19) from v3 (3.21) |
| 38 | VCPKG-05 (MUST): "`CMAKE_TOOLCHAIN_FILE` takes one path, and the last assignment wins" | CORRECTED | Measured on three CMakes: one preset with `toolchainFile` A and `cacheVariables` B loads A only; a preset with A plus CLI `-D` B loads B only | Precedence, not order; the rule stands |
| 39 | VCPKG-06 (MUST): consumer `vcpkg.cmake` (987 lines) never sets the MSVC runtime; `windows.cmake:3` is the port chainload | CONFIRMED | 987 lines with 0 `CMAKE_MSVC_RUNTIME_LIBRARY` or `VCPKG_CRT_LINKAGE`, both in corpus `c4ee5a52` and in the 2026-09-26 bundle; `windows.cmake:3`; `vcpkg_cmake_configure.cmake:175-181`; `x64-windows-static.cmake:2` | |
| 40 | VCPKG-06: CMake default `MultiThreaded$<$<CONFIG:Debug>:Debug>DLL`; floor 3.15 (CMP0091) | CONFIRMED | `Help/prop_tgt/MSVC_RUNTIME_LIBRARY.rst:26-27`@v3.31.0; `CMP0091.rst` `versionadded:: 3.15` | |
| 41 | VCPKG-06 Verify | CORRECTED | Planted `VCPKG_DEFAULT_TRIPLET: x64-windows-static` (unquoted YAML), `set(VCPKG_TARGET_TRIPLET x64-windows-static)` and triplet `set(VCPKG_CRT_LINKAGE static)`: 0 hits. The CRT alternative could never match because `*.cmake` was not included | Widened; `*-static-md` still excluded |
| 42 | VCPKG-07 (SHOULD): included triplet files belong in `VCPKG_HASH_ADDITIONAL_FILES`; disabling compiler tracking "can lead to ABI incompatibility in restored binary packages" | CONFIRMED | `users/triplets.md:195-205,245-256` | Normative only; see Unverifiable |
| 43 | VCPKG-08 (MUST): provider table marks `x-gha` Removed and the other `x-` providers Experimental | CONFIRMED | `binarycaching.md:20-33` (`x-gha` at :32); also `x-aws-config` | Line range corrected, see 44 |
| 44 | VCPKG-08: an unknown token is a hard error, not a fallback | CORRECTED (sharpened) | Measured: `bogus,readwrite` gives `unknown binary provider type`, rc 1. But `x-gha,readwrite` gives only a `warning: The 'x-gha' binary caching backend has been removed`, rc 0 (`binarycaching.cpp:2168-2170`) | A CI still naming `x-gha` runs uncached with no failure, which makes the MUST stronger |
| 45 | VCPKG-09 (SHOULD): without `x-block-origin` a mirror miss reads the origin URL | CONFIRMED | `users/assetcaching.md` workflow steps 1-3 and "you can disable step 2 via `x-block-origin`" | |
| 46 | VCPKG-10 (MUST): artifacts removal *announced* 2026-05-27 and not yet executed at 2026-09-26 | CONFIRMED | 2026-05-27 release body: "Note that artifacts will be removed after July 1" (PR #2030). Measured: `vcpkg help activate` still prints "Synopsis: Activates artifacts from a manifest"; the 2026-09-26 release ships `vcpkg-artifacts.mjs`; the tree has `vcpkg-artifacts/` | |
| 47 | VCPKG-10: `VCPKG_PREFER_SYSTEM_LIBS` deprecated | CONFIRMED | `cmake-integration.md:263`: "This feature has been deprecated. Use empty overlay ports instead." | |
| 48 | VCPKG-11 (MUST): no lockfile, no provider, no CPS; minimum-version selection | CONFIRMED | `vcpkg.cmake`: 0 `SET_DEPENDENCY_PROVIDER`/`PACKAGE_INFO`; the tag-2026-09-26 tree has 2,461 paths (untruncated) with no CPS or provider file (`portfileprovider` is internal); `versioning.md:139`. A measured manifest install left only `vcpkg.json` and the install root, with no lock file | |
| 49 | #12357 closed 2021-04-13; host-triplet default since September 2023 | CONFIRMED | Issues API `closed 2021-04-13T09:32:19Z`; `common-options.md:141` | |
| 50 | find_ocx has no Conan or vcpkg surface and has `ocx.lock` plus `--check` | CONFIRMED | HEAD `9094f87`; grep over CMake/JSON/YAML/MD gives 0 hits; `README.md:48`, `ocx.cmake:428,961-962` | |
| 51 | Applied/Violate citations | CORRECTED | All re-read and correct except two. The CCI template range is at `:65`, not `:64`. The arrow unpinned-clone row (`github.windows.yml:50`, confirmed) was labelled VCPKG-04 although its own text calls it a VCPKG-01 miss | Label and line fixed |
| 52 | Open question: "Every Conan flow row is normative-only … because no Conan binary runs on the host" | CORRECTED | Conan 2.32.0 and 2.27.0 ran from a scratch venv (rows 6-24) | Item narrowed to the provider's four unmeasured limits |
| 53 | VCPKG-06 / CONAN-10: a runtime mismatch surfaces only at link (LNK2038) | UNVERIFIABLE | No MSVC toolchain on host | See Unverifiable |
| 54 | VCPKG-07: the ABI hash ignores `include()`d triplet files unless they are listed (measured side) | UNVERIFIABLE | vcpkg compiler detection failed on host (no system `c++`) | Normative half is row 42 |

## Verification commands exercised

Fixtures: `scratch/verify-package-managers/checks/{bad,good}/`, each a git repo with planted violations (`bad`) or the compliant form (`good`). The runner is `checks/run.sh`, run with `bash`. It runs each command verbatim with GNU grep. Line counts below are bad → good. "Red" means the command reported the planted violation in the way the rule says it reads.

On this host the Bash tool's rtk hook rewrites top-level `grep`, `find`, `wc` and `curl … | …`. Run the commands inside a script, as `run.sh` does, or the output is wrong.

- CONAN-01 (MUST, empty = pass): 2 → 0. Red on `from conans` and `generators = "cmake"`, green on clean.
- CONAN-02 (MUST, non-empty = finding): 1 → 0. Red on names-only, green on `set_property`.
- CONAN-03 (MUST, empty = pass): 1 → 0. `def build_requirements` plus `self.tool_requires` correctly does not match.
- CONAN-04 (SHOULD, hit = read): 1 → 0.
- CONAN-05 (MUST, hit = finding): 1 → 0. Red on `find_package(ZLIB MODULE REQUIRED)`.
- CONAN-06 (MUST, reading heuristic, name missing = finding): 0 → 1. `bad` has protobuf tool_requires plus `find_package(protobuf)` and no activation, so red by reading; `good` names it.
- CONAN-07 (SHOULD, hit = read, in CMakeLists = CMK-TC finding): 1 → 0.
- CONAN-08 (SHOULD, empty = pass): 1 → 0.
- CONAN-09, original (MUST): range grep 1 → 1 (both have ranges); `git ls-files conan.lock` 0 → 1 (red → green). `--lockfile=` grep 1 → 0: **wrong both ways**. The planted `--lockfile=""` satisfied it, and the clean `-l conan.lock` failed it.
- CONAN-09, corrected: `--lockfile[= ]` or ` -l ` gives 1 → 1 and pairs with the install lines. The new empty-`--lockfile=`/`--lockfile-partial` grep gives 1 → 0 (red → green).
- CONAN-10, dynamic (MUST, empty = pass): `grep -e 'has been modified to'` gives 1 line on set20 and 0 on the guarded and none modes, on all three CMakes. The static grep gives 1 → 2; the reading step clears `good`'s guarded `set()` and its vcpkg-branch runtime.
- CONAN-11 (SHOULD, pairing read): 0 → 0 (no `cxx_std_` planted). Not exercised red.
- CONAN-12 (SHOULD, reading): 1 → 1. `good` shows `-pr:b`.
- VCPKG-01 (MUST, listed top-level = finding): 2 → 1. The one left in `good` is `lib/vcpkg.json`, a library manifest that the "top-level" reading step clears. Measured: its `version>=` would be a hard error without a baseline anyway.
- VCPKG-02 (MUST, hit in a port/overlay repo = finding): 1 → 0.
- VCPKG-03 (SHOULD, missing `"host": true` beside hit = finding): 3 context lines → 0. Red by reading.
- VCPKG-04, original (MUST): 2 → 3. **False positive**: `good`'s `if(VCPKG_TARGET_TRIPLET MATCHES …)` after `project()` was flagged.
- VCPKG-04, corrected: 2 → 2. `bad` shows a `set(VCPKG_` after `project(`, which is red. `good` shows `set(VCPKG_` before `project(`, which is green.
- VCPKG-05 (MUST, two values or conan beside vcpkg = finding): 2 → 1 on the preset grep and 1 → 0 on the `conan_toolchain.cmake` grep. Red → green.
- VCPKG-06, original (MUST): first grep 0 → 1. **Stayed green on three planted static-CRT triplets.**
- VCPKG-06, corrected: first grep 3 → 1; second grep 0 → 1. Red (static triplet, no runtime) → green.
- VCPKG-07 (SHOULD, empty = pass / non-empty = finding): 1 → 0 on both halves.
- VCPKG-08 (MUST, empty = pass): `x-gha` 1 → 0. The experimental-provider list is 1 → 0 (`x-aws` planted).
- VCPKG-09 (SHOULD, empty = pass): 1 → 0.
- VCPKG-10 (MUST, empty = pass): 1 → 0.
- VCPKG-11 (MUST, empty = pass): 1 → 0.

## Unverifiable

- **LNK2038 at link** (VCPKG-06 mechanism, and the runtime half of CONAN-10). The host has no MSVC or Windows linker. What was verified: `vcpkg.cmake` sets no runtime, CMake's default is the DLL runtime, and Conan's runtime `set()` has no watch. The link failure itself was not produced. This stays in the file's open question `package-managers/windows-abi-measurement`.
- **VCPKG-07 ABI hash omits `include()`d triplet files**. Only the vcpkg-docs text was checked. A port build to compare ABI hashes failed at vcpkg's compiler detection, because the host has no system `c++` and `CXX` was not wired into vcpkg's detect project. Not retried.

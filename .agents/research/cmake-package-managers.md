---
title: "Conan 2 and vcpkg at the CMake seam — consolidated ruleset"
topic: "cpp-packaging index, cpp-packaging/conan.md and cpp-packaging/vcpkg.md (package-managers group)"
model: opus
id_family: CMK-CONAN, CMK-VCPKG, CMK-PKG
consolidates:
  - cmake-package-managers/conan-cmake-integration.md
  - cmake-package-managers/vcpkg-manifests-and-caching.md
  - cmake-package-managers/verification-wave2.md
  - cmake-package-managers/verification-wave3.md
  - cmake-package-managers/conan-recipe-authoring.md
  - cmake-package-managers/vcpkg-port-authoring.md
  - cmake-package-managers/tool-provisioning-and-supply-chain.md
  - cmake-audit/exemplar-deps-and-dual-build.md
  - cmake-audit/exemplar-cmake-shape.md
  - cmake-audit/find-ocx-cmake-shape-and-contracts.md
  - cmake-audit/fleet-inventory-and-bazel-overlap.md
  - cmake-topic-map.md (rows M-M-01..12, M-N-01..09, M-L-01, M-L-03, M-L-04, M-L-06..09, M-F-16, Conan and vcpkg halves of M-L-03 and M-L-05; conflicts 6, 13, 21, 22, 23, 24; wave-2 cross-consolidation items (e) 6, 7 and 9)
  - cmake-topic-map/era-recheck-2026-09-26.md
  - cmake-frame.md (Corrections blocks)
date: 2026-09-26
verified: 2026-09-26
revised: 2026-09-26
---

# Conan 2 and vcpkg at the CMake seam

Versions this file is written against (all 2026-09-26): **Conan 2.32.0**
(2026-08-31, Releases API, re-fetched today), **vcpkg-tool 2026-09-26**
(published 2026-09-26T06:19Z, re-fetched today — one release newer than the
era re-check's 2026-07-27), vcpkg registry **2026.07.29**, cmake-conan
`develop2` HEAD `b1593849dd` (2026-06-05). CMake measurements ran on
**3.31.12** and **4.4.2** (`ocx package exec kitware/cmake:{3.31,4.4}`), plus
4.3.4 in verify wave 2. Corpus snapshots: `conan-io__conan-center-index@07389b8fa0`
and `microsoft__vcpkg@c4ee5a52d7` (both committed 2026-09-25). Revision 3
re-ran Conan 2.32.0 from the verify-wave-2 venv (`conan graph info`, recipe
`package_id` behaviour). The rule set assumes the map's CMake floor 3.25 (map
conflict 1).

Consumer kinds used below: **APP** application consuming packages · **LIB**
library shipping a package (and its own `vcpkg.json`/`conanfile.py` for
consumers) · **RCP** recipe or port author · **MOD** CMake module author ·
**BZL** Bazel-wrapped dependency.

## Verdict

1. **Conan generator (APP):** the explicit flow uses `CMakeToolchain` + `CMakeDeps`. `CMakeConfigDeps` is the cmake-conan *provider's* generator and is experimental at 2.32.0; adopt it only there or with a comment naming the status. The corpus splits exactly this way: all 14 `CMakeConfigDeps` conanfiles outside CCI sit in cmake-conan's own tree, and every non-provider consumer uses `CMakeDeps`. CCI has 2,515 `CMakeDeps` conanfiles against 6 `CMakeConfigDeps` (measured below). A recipe's own `generate()` and its `test_package` use `CMakeDeps` too: the CCI template at `07389b8fa0` does, and the flow split is a consumer choice (CONAN-04).
2. **Conan flow (APP):** run `conan install` explicitly, then `cmake --preset conan-<x>`, as Conan itself recommends. The cmake-conan provider is an opt-in for IDE or single-command use. It is user-owned (injected through `CMAKE_PROJECT_TOP_LEVEL_INCLUDES`, never from CMakeLists; CMK-TC owns that slot), needs CMake 3.24 and has five documented limits.
3. **Conan-1 residue is a hard error, not style (RCP, LIB).** `from conans import` fails at import under Conan 2: `conans/__init__.py` is 0 bytes at 2.32.0. `cpp_info.names` is worse because it fails silently: a mock takes the value, throws it away and emits only a deprecation warning. Conan Center is **not** residue-free. Of its 2,002 recipe folders, 40 still use `from conans import`, 35 use `build_requires`, and 24 set `cpp_info.names` with no `set_property` fallback. The dead `names` beside `set_property` (246 folders) can be deleted on any edit: CCI's legacy Conan-1 remote froze on 2024-11-04, so no Conan-1 client ever sees an edited recipe (CONAN-02).
4. **Profile owns the language standard and MSVC runtime when `conan_toolchain.cmake` is loaded (APP, LIB).** Measured on 3.31.12 and 4.4.2, a project's later `set(CMAKE_CXX_STANDARD 20)` wins over the profile's 17. The only sign is a `STATUS` line that begins "Warning:", and configure exits 0 even under `-Werror=dev`, or `-Werror=author`, its CMake 4.4 name (Conan 2.7.0 and later). `-DCMAKE_CXX_STANDARD=20` silently *loses*. The runtime has no watch at all. So the mismatch can be checked by grepping configure output, not by the configure gate.
5. **Lock of record differs by manager, and rule text must say so.** In Conan, an APP with version ranges commits `conan.lock` and passes `--lockfile=conan.lock` explicitly in CI; lockfiles are strict, so drift fails. vcpkg has **no lockfile**. Its reproducibility is `builtin-baseline` (or a registry baseline) or a pinned vcpkg root commit, ideally both at one SHA (arrow). No rule may promise that vcpkg CI "fails on drift". A tree that reaches several acquisition mechanisms owes one lock-of-record entry **per mechanism** (PKG-01), because the per-manager rules do not compose. The vcpkg *tool* is pinned by the pinned root only when CI bootstraps from it: the root's `scripts/vcpkg-tool-metadata.txt` names the tool release (`2026-07-27` at `c4ee5a52d7`, although vcpkg-tool 2026-09-26 is out), and a runner image's preinstalled vcpkg pins nothing (PKG-02).
6. **vcpkg MSVC runtime (APP, RCP):** the consumer toolchain `vcpkg.cmake` never sets `CMAKE_MSVC_RUNTIME_LIBRARY` (0 of 987 lines). A project built against a static-CRT triplet (`*-windows-static`) therefore must set the runtime itself, in the preset's `cacheVariables` or before the first `project()`. This corrects the vcpkg dive, which read the port-build chainload toolchain (`scripts/toolchains/windows.cmake`) as if it were loaded into the consumer. On the port-build side, that chainload's non-`FORCE` cache entry loses silently to any `-DCMAKE_MSVC_RUNTIME_LIBRARY` in a port's `OPTIONS` or a triplet's `VCPKG_CMAKE_CONFIGURE_OPTIONS` (measured on 3.31.12 and 4.4.2), so a port sets it only derived from `VCPKG_CRT_LINKAGE` (VCPKG-15).
7. **CI caching (APP):** for vcpkg, recommend `files`, `nuget`/`nugetconfig` or `http` with no caveat. `x-gha` is removed. Every other `x-` provider needs an "experimental" note, and offline CI needs `x-block-origin`. A CI cache persists the manager's **content-addressed** store (vcpkg's binary cache, keyed internally by an ABI hash that covers both compilers, the triplet and every port file) and lets the install step run every time. Caching an installed tree and skipping `vcpkg install` on a cache hit freezes the dependency set silently (boost, PKG-04). This replaces the tool-provisioning dive's MUST, which claimed a manifest-and-compiler cache key is what keeps foreign binaries out; the ABI hash does that.
8. **Things vcpkg does not have (all kinds):** no dependency provider, no CPS, no lockfile file. vcpkg-artifacts has been *announced* for removal and is not yet removed (still in vcpkg-tool at 2026-09-26). Say exactly that, not "removed". `VCPKG_PREFER_SYSTEM_LIBS` is deprecated with a configure `WARNING` and **no** announced removal date (`vcpkg.cmake:54-57` at `c4ee5a52d7`); its replacement is the two-file empty overlay port under VCPKG-10.
9. **BZL / MOD:** nothing here binds a Bazel-wrapped dependency beyond CMK-PKG's "one toolchain source per configure" (the ban's text is `CMK-TC-02`; map item (e) 9). A dependency wrapped by rules_foreign_cc must not require either manager (CMK-BZL, and `BZL-CC` on the Bazel side). find_ocx is a MOD and a tool provisioner with no Conan or vcpkg surface, so no rule here applies to it directly (see Applied).
10. **Recipe authoring (RCP, Conan):** the producer rows are CONAN-13..24 (Check F). Measured on Conan 2.32.0: `self.info.header_only()` is an `AttributeError`; `package_type = "header-library"` alone does **not** clear the `package_id`; and a recipe that defines `package_id()`, `config_options()` or `configure()` silently switches off the matching `implements` mixin. `implements` exists from Conan **2.0.9**, not the 2.4 line the dive gave. **Documented gaps:** no maintained recipe linter replaces the archived `conan-io/hooks`, so every producer check is a grep or a read; `compatibility()` has 0 adopters in the 40-recipe sample and in all six CCI templates, so it gets no rule.
11. **Port authoring (RCP, vcpkg):** the port rows are VCPKG-12..21 (Check F). The six deprecated CMake helpers have 0 users in 2,867 portfiles, but they still ship in `scripts/cmake/` and still run, and only `vcpkg_apply_patches` warns. So the rule is a MUST for new or edited ports, not a "removed API" claim. `unofficial-<port>` naming has 0 counter-examples (M-F-16); the general principle belongs in CMK-INST as a cross-reference (Open questions). **Documented gaps:** vcpkg has no semantic port linter, and vendoring (VCPKG-21) has no greppable signature.
12. **The cpp-packaging index (CMK-PKG, all kinds):** there is no mandate for Conan, vcpkg, CPM, FetchContent or system packages. The index ships two trigger tables (below) and four rules. The one citable adoption figure is the ISO C++ 2024 Annual Developer Survey "Lite", Q9/Q10, read from the PDF: Conan 19.34 % (241 of 1,246), vcpkg 19.10 % (238), system package managers 37.80 % (471); CMake 83.24 % (1,043 of 1,253), Bazel 9.98 %, Meson 5.99 %. The 2025 "Lite" PDF has no percentage table at all, so any "2025 survey" percentage is fabricated; the 2026 survey was not checked (gap). No supply-chain mechanism is a rule: `conan audit` is experimental from 2.14.0 through 2.32.0 (CVE version info landed in 2.27.0, not 2.32.0), vcpkg's SPDX SBOM (PURLs and gitoids from registry 2026.07.29) is descriptive, and CMake `install(SBOM)` sits behind `CMAKE_EXPERIMENTAL_GENERATE_SBOM`; nothing here requires or forbids gating on them. pixi-build, Spack, nixpkgs and xrepo-cmake inject `CMAKE_PREFIX_PATH` from outside the configure, and Meson's wrap drives CMake as a subproject, so no `find_package`-keyed rule special-cases any of them. **Documented gap:** 0 corpus CI caches key on `conan.lock`, a `conanfile.*` or a profile, so the Conan half of PKG-04 has no calibration.

## The ruleset

Evidence tags: **[N]** normative (tool docs/source at a tag), **[M]** measured
(host run or corpus count, command given), **[C]** codified, **[A]** argued.
Every MUST carries [N] or [M].

### CMK-CONAN

#### Check A: grep the conanfile (a static check; empty output is a pass unless stated)

**CMK-CONAN-01: Write Conan 2 imports only: `from conan import ConanFile` and `conan.tools.*`. Never write `from conans import`, `generators = "cmake"`, `conan_basic_setup()` or `include(conanbuildinfo.cmake)`.**
- Rationale: at 2.32.0 `conans/__init__.py` is empty, so the recipe dies at import and no Conan 2 client can run it [N/M: `curl -sfL https://raw.githubusercontent.com/conan-io/conan/2.32.0/conans/__init__.py | wc -c` gives `0`]. The reverse direction has a shim: Conan 1.x (1.50.0 and 1.53.0 checked) ships a `conan` package that re-exports `ConanFile`, so a `from conan import` recipe with a `>=1.5x` floor is not residue (CONAN-21).
- Verify: `grep -rn --include='conanfile.py' -e 'from conans' -e conan_basic_setup -e conanbuildinfo -e 'generators = "cmake"' .`, where empty = pass. `--include='CMakeLists.txt'` catches the same tokens in a `test_package` (CONAN-22).
- Severity **MUST**. Binds RCP, LIB. Floor: Conan 2.0.

**CMK-CONAN-02: Name exported CMake files and targets with `self.cpp_info.set_property("cmake_file_name", …)` and `("cmake_target_name", …)` — plus `cmake_module_file_name`/`cmake_module_target_name` when `cmake_find_mode` is `module` or `both`, and `pkg_config_name` for pkg-config. Never rely on `cpp_info.names` or `cpp_info.filenames`, never add one to a new recipe, and delete them on any edit where `set_property` already exists.**
- Rationale: Conan 2 keeps `names` as a `MockInfoProperty`, which discards the value and only warns (`conan/internal/model/cpp_info.py:96`@2.32.0). A names-only recipe silently gives consumers Conan's default target names [N/M]. Deleting the dead copy cannot break a Conan-1 consumer on CCI: "The legacy remote at `https://center.conan.io` stopped receiving updates on 4 November 2024 and is frozen" (`conan-io__conan-center-index@07389b8fa0:README.md:34`), and CCI's CI is Conan-2-only from the same date (`docs/changelog.md:3-5`) [N]. The sampled residue carries its own "TODO: to remove in conan v2" comment (`recipes/proposal/all/conanfile.py:114-116`).
- Verify: `grep -rln --include='conanfile.py' -e 'cpp_info.names' -e 'cpp_info.filenames' .` lists candidates. Pipe that list through `xargs -r grep -L -e cmake_target_name -e cmake_file_name`: a non-empty result is the MUST finding. A file in the first list but not the second is dead code, to delete on the next edit.
- Severity **MUST**. Binds RCP, LIB. Floor: Conan 2.0.

**CMK-CONAN-03: Declare build tools as `tool_requires`, either the attribute or `self.tool_requires()` inside `build_requirements()`. Never use `build_requires`.**
- Rationale: deprecated in 2.28.0 (PR #19849, changelog). `tool_requires` has existed since 2.0, so the replacement always works [N]. In `conanfile.txt`, `[build_requires]` is already a hard parse error at 2.32.0 [M, verify wave 2].
- Verify: `grep -rn --include='conanfile.py' --include='conanfile.txt' -e build_requires .`, where empty = pass.
- Severity **MUST** for new or edited recipes. Binds RCP, APP. Floor: Conan 2.0; the deprecation is at 2.28.0.

#### Check B: generator choice against `find_package` usage (grep, then read)

**CMK-CONAN-04: In the explicit flow generate with `CMakeToolchain` + `CMakeDeps`. Use `CMakeConfigDeps` only with the cmake-conan provider, or with a comment that names it experimental at 2.32.0. A recipe's own `generate()` and its `test_package/conanfile.py` use `CMakeDeps`.**
- Rationale: `cmakeconfigdeps.rst` still includes `experimental_warning.inc`. The changelog's last status line is 2.25.0 "incubating → experimental". Only `incubating.rst` says "generally available", and it loses to the conservative page (map conflict 21, [cps-v] row 43) [N]. Corpus [M]: `CMakeDeps` is used by CCI's template (`conan-io__conan-center-index@07389b8fa0:docs/package_templates/cmake_package/all/conanfile.py:94-98`), cmake-init, Catch2 and project_options. `CMakeConfigDeps` appears only in `conan-io__cmake-conan@b1593849dd` (example + tests). CCI has 2,515 `CMakeDeps` against 6 `CMakeConfigDeps`, and 0 of the 40 sampled recipes use it. A recipe's `generate()` runs in `conan create`, never inside a provider consumer's configure, so the provider exception cannot apply to it.
- Verify: `grep -rn --include='conanfile.py' --include='conanfile.txt' -e CMakeConfigDeps .`. For each hit, read whether the project uses the provider (`grep -rn -e conan_provider.cmake .`) or carries an "experimental" comment. If neither, it is a finding. A hit in a published recipe or its `test_package` is a finding without the read.
- Severity **SHOULD**, because this is a choice between two shipped generators. Binds APP, RCP. Floor: `CMakeConfigDeps` needs Conan 2.25.0.

**CMK-CONAN-05: Never pair `CMakeConfigDeps` with `find_package(<conan dep> MODULE)` or with any code that expects a Conan-generated `Find<Pkg>.cmake`.**
- Rationale: "it will not generate `Find*.cmake` find modules, and support for it is not planned" (`cmakeconfigdeps.rst`, line 79 on `develop2` at 2026-09-26) [N]. Measured on Conan 2.32.0: for a package with `cmake_find_mode` `both`, `CMakeDeps` writes `FindGamma.cmake` and `CMakeConfigDeps` writes only `GammaConfig*.cmake` [M].
- Verify: runs only when CMK-CONAN-04's grep hits. Then `grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'find_package(.* MODULE' .` (it finds only single-line calls, so read multi-line `find_package(` calls by hand). A hit naming a Conan-provided package is the finding; empty = pass.
- Severity **MUST**. Binds APP. Floor: Conan 2.25.0.

**CMK-CONAN-06: Under `CMakeDeps`, when CMake must `find_package` a `tool_requires` dependency (a code generator's targets, for example), list it in `build_context_activated`. Add `build_context_suffix` when the same package is also a host `requires`.**
- Rationale: "When you have a build-require, by default, the config files (`xxx-config.cmake`) files are not generated" (`cmakedeps.rst` lines 117-127) [N]. `CMakeConfigDeps` does not need this.
- Verify: a reading heuristic. For each `tool_requires` name that also appears in a `find_package(` call, `grep -rn --include='conanfile.py' -e build_context_activated .` must name it. A missing name is the finding.
- Severity **MUST**. Binds APP, RCP. Floor: Conan 2.0.

#### Check C: how Conan enters the configure (read presets and CI)

**CMK-CONAN-07: Default to `conan install …` followed by `cmake --preset conan-<x>`. Adopt the cmake-conan provider only for IDE or one-command use. Then inject it through `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` from a preset or the CLI, generate `CMakeConfigDeps`, always set `CMAKE_BUILD_TYPE` for single-config generators, supply profiles for anything but Windows+MSVC, Linux+gcc and Apple+clang, and call no `find_program`/`find_library` before the first `find_package`.**
- Rationale: Conan's `integrations/cmake.rst` calls the explicit flow "the recommended flow for most cases" and reserves the provider for "extraordinary and exceptional scenarios" [N]. The provider README lists those five limits, the provider requires 3.24 (`conan_provider.cmake:36`), and it only *warns* when the generator is missing (`conan_provider.cmake:593-599`) [N/M].
- Verify: `grep -rn -e conan_provider.cmake .`. Empty = explicit flow and pass. A hit triggers the five-limit reading check; a hit inside a `CMakeLists.txt` is a CMK-TC finding.
- Severity **SHOULD**. Binds APP. Floor: CMake 3.24 for the provider; cmake-conan checks Conan 2.0.5.

**CMK-CONAN-08: Add `CMakeUserPresets.json` to `.gitignore` and never commit it. Conan's `CMakeToolchain` writes it (schema 4) into the source folder and only rewrites a file that carries `vendor.conan`. A hand-written one makes Conan skip silently, so the `conan-*` presets never appear.**
- Rationale: `conan/tools/cmake/presets.py:307-311`@2.32.0 returns early when `"conan" not in data.get("vendor", {})` [N/M]. The general "never commit the user presets" rule is CMK-CI (M-J-03); this is the Conan trigger for it.
- Verify: `git ls-files CMakeUserPresets.json`, where empty = pass. Positive exemplar: `friendlyanon__cmake-init@7e0c52fc73:cmake-init/templates/common/.gitignore:11`.
- Severity **SHOULD**. Binds APP. Floor: generated `CMakePresets.json` schema 3 needs CMake 3.21 and `CMakeUserPresets.json` schema 4 needs 3.23, both below the 3.25 floor.

#### Check D: the lock of record (presence plus the CI flag)

**CMK-CONAN-09: An application whose `requires` or `tool_requires` use a version range commits `conan.lock`. CI passes `--lockfile=conan.lock` explicitly and never `--lockfile-partial`. The lock is regenerated with `--lockfile-out` (plus `--lockfile-clean`), never edited by hand. A published recipe (CCI-style) is exempt, because it floats by design; on CCI it may float only on the allow-listed dependencies (CONAN-20).**
- Rationale: without a lock a range resolves to whatever is newest today. With a lock, resolution is strict ("Requirement … not in lockfile"). `conan.lock` in the working directory is picked up *implicitly*, and Conan's tutorial asks CI to make the flag explicit (`tutorial/versioning/lockfiles.rst` lines 98-144) [N]. Measured on Conan 2.32.0 [M]: a lock holding `tool/1.0` kept a widened range `[>=1.0 <2]` at 1.0 with no flag (implicit pickup); `--lockfile=` (empty) disabled it and resolved 1.1; a requirement missing from the lock failed with `ERROR: Requirement 'pkgb/1.0' not in lockfile 'requires'`; `--lockfile-partial` let the same install exit 0. Corpus [M]: 0 `conan.lock` in 46 repos, and 0 in CCI at `07389b8fa0`. This is the Conan entry of CMK-PKG-01's per-mechanism lock of record.
- Verify: `grep -rn --include='conanfile.py' --include='conanfile.txt' -e '/\[' .` finds ranges. If it hits, `git ls-files conan.lock` must be non-empty (empty = finding). Then `grep -rn -e 'conan install' .github` lists the install lines and `grep -rn -e '--lockfile[= ]' -e ' -l ' .github` lists the lines that pass a lock (Conan accepts `--lockfile=X`, `--lockfile X` and `-l X`); an install line absent from the second list is the finding. `grep -rn -e '--lockfile=""' -e "--lockfile=''" -e '--lockfile= ' -e '--lockfile=$' -e '--lockfile-partial' .github` must be empty (empty = pass), because an empty `--lockfile=`, quoted or bare, switches the lock off.
- Severity **MUST**. Binds APP. Floor: Conan 2.0 lockfile format.

#### Check E: configure-output grep against profile/project agreement (measured)

**CMK-CONAN-10: When a build loads `conan_toolchain.cmake`, the profile owns `CMAKE_CXX_STANDARD`, `CMAKE_CXX_EXTENSIONS` and `CMAKE_MSVC_RUNTIME_LIBRARY`. Never `set()` them after `project()`, never pass `-DCMAKE_CXX_STANDARD` next to the Conan toolchain, and state a library's minimum as `target_compile_features(<t> PUBLIC cxx_std_NN)` (CMK-TGT, M-E-04). If the project must default the standard, guard it with `if(NOT DEFINED CMAKE_CXX_STANDARD)`.**
- Rationale [M]: the rendered `CppStdBlock` from `conan-io/conan@2.32.0:conan/tools/cmake/toolchain/blocks.py:320-340` (cppstd=17) was run on 3.31.12 and 4.4.2 with ninja and zig c++. Verify wave 2 re-ran it with the full `conan_toolchain.cmake` that Conan 2.32.0 itself generated, on 3.31.12, 4.3.4 and 4.4.2, with identical results:
  - a later `set(CMAKE_CXX_STANDARD 20)` wins (`-std=c++20`). Only `-- Warning: Standard CMAKE_CXX_STANDARD value defined in conan_toolchain.cmake to 17 has been modified to 20` prints, and configure exits 0 with `-Werror=dev`, and on 4.4.2 also with `-Werror=author` (4.4 prints "The error=dev option is deprecated. Use -Werror=author instead.").
  - the `if(NOT DEFINED CMAKE_CXX_STANDARD)` guard keeps the profile's `-std=c++17` with no line.
  - `-DCMAKE_CXX_STANDARD=20` silently loses (`-std=c++17`, no line).
  - `target_compile_features(... cxx_std_20)` silently compiles `-std=c++20` while the profile says 17. This is expected and harmless for an APP, and handled for RCP by CMK-CONAN-11.
  - `VSRuntimeBlock` (`blocks.py:60-75`) is a plain `set()` with no watch, so an override is completely silent [N].
  - The watch exists from Conan **2.7.0** (bisected: absent at 2.6.0, present at 2.7.0 through 2.32.0).
- Verify: `cmake --preset conan-release 2>&1 | grep -e 'has been modified to'`, where empty = pass. Statically, `grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'set(CMAKE_CXX_STANDARD' -e 'set(CMAKE_MSVC_RUNTIME_LIBRARY' .` flags each hit that is not before `project()` and not inside `if(NOT DEFINED …)`. Run the static grep only on legs that load `conan_toolchain.cmake`; a vcpkg leg's runtime `set()` is VCPKG-06's business (map item (e) 7).
- Severity **MUST**. Binds APP, LIB. Floor: Conan 2.7.0 for the status line; the precedence facts hold on every CMake tested.

**CMK-CONAN-11: A recipe whose library needs C++NN calls `check_min_cppstd(self, NN)` in `validate()`, so a profile below NN fails at `conan install` rather than building at NN under a package_id that says less.**
- Rationale: CMK-CONAN-10's `feature20` case (measured) shows CMake silently raising the standard above the profile. Catch2 does this (`catchorg__Catch2@222e233903:conanfile.py:80`), and so do 31 of the 40 sampled CCI recipes [M/N].
- Verify: `grep -rn --include='conanfile.py' -e check_min_cppstd .` must be non-empty in any recipe whose CMake uses `cxx_std_` above the profile default. The check reads by pairing it with `grep -rn --include='CMakeLists.txt' -e cxx_std_ .`.
- Severity **SHOULD**. Binds RCP. Floor: Conan 2.0.

**CMK-CONAN-12: For a cross build, pass both profiles explicitly (`-pr:h` and `-pr:b`) and put code generators in the build context (`tool_requires`), never in a host `requires`.**
- Rationale: a `tool_requires` is built for the build machine, a `requires` for the host. 2.27.0 added negated-OR patterns in a *profile's* `[tool_requires]` section to break build-context cycles (changelog, PR #19780) [N].
- Verify: a reading heuristic on every `conan install` line in CI for a cross leg. `grep -rn -e 'conan install' .github` must show `-pr:b` on legs whose host profile names another arch or OS.
- Severity **SHOULD**. Binds APP. Floor: Conan 2.0.

#### Check F: recipe authoring (RCP; grep the recipe, then read)

Sample: 40 CCI recipes at `07389b8fa0`, every 49th of 1,950 sorted recipe
names (`cmake-package-managers/conan-recipe-authoring.md` §1), plus whole-tree
greps re-run for this revision (`scratch/pm-rev3/corpus/checks.sh`).

**CMK-CONAN-13: A recipe that runs a real CMake build calls `cmake_layout(self, src_folder="src")` in `layout()`. A recipe that never builds calls `basic_layout(self, src_folder="src")`.**
- Rationale: the CCI template does (`docs/package_templates/cmake_package/all/conanfile.py:54-55`) [N], as do 21 of the 22 CMake-building sampled recipes; the exception, `trianglemeshdistance`, is header-only with `basic_layout` [M]. Whole tree: 43 of 1,149 recipe files that construct `CMake(self)` or `CMakeToolchain` lack `cmake_layout`, 23 of them Conan-1 residue [M]. A recipe without a layout still builds, which is why this is not a MUST.
- Verify: `grep -rl --include='conanfile.py' -e 'CMake(self)' -e CMakeToolchain . | xargs -r grep -L -e cmake_layout`. Non-empty lists findings; a listed header-only recipe that calls `basic_layout` is cleared by reading.
- Severity **SHOULD**. Binds RCP. Floor: Conan 2.0.

**CMK-CONAN-14: A new or heavily edited recipe declares `implements = ["auto_shared_fpic"]` instead of hand-writing the `shared`/`fPIC` logic, and then defines neither `config_options()` nor `configure()` unless the method repeats the removal itself. An existing hand-rolled `rm_safe("fPIC")` or `del self.options.fPIC` is not required to migrate.**
- Rationale: CCI recommends the mixin (`docs/adding_packages/conanfile_attributes.md:153-157`) [N]. It has existed since Conan **2.0.9** (changelog, PR #14320) [N]. In Conan 2.32.0's source the mixin runs only in the `elif` branch after `hasattr(conanfile, "config_options")` and `hasattr(conanfile, "configure")` (`conan/internal/methods.py:99-115`), so defining either method silently disables that half [N]. Adoption: 3 of 40 sampled, 178 recipes whole-tree; 31 of the 178 also define one of the methods [M] (`pistache` repeats the removal by hand, so it is correct but the mixin is dead there).
- Verify: `grep -rl --include='conanfile.py' -e auto_shared_fpic . | xargs -r grep -l -e 'def config_options' -e 'def configure'`. Each listed file is read: a defined method that does not remove `fPIC` (Windows, or when `shared`) is the finding.
- Severity **SHOULD**. Binds RCP. Floor: Conan 2.0.9.

**CMK-CONAN-15: A header-only recipe clears its `package_id`: either `implements = ["auto_header_only"]` with no `package_id()` method, or a `package_id()` that calls `self.info.clear()`, plus `no_copy_source = True`. `package_type = "header-library"` alone does not clear it.**
- Rationale [M, Conan 2.32.0, `conan graph info`, `scratch/pm-rev3/conan/`]:
  - `package_type = "header-library"` with no mixin and no method keeps os, arch, compiler and build_type in the package info (`ho4`), so the package gets one binary per configuration.
  - `auto_header_only` clears it (`ho2`); per source it covers both `package_type = "header-library"` and an option `header_only=True` (`conan/internal/methods.py:163-165`), so the option-gated case (spdlog) needs no hand-written branch either. The dive's "conditional case must stay hand-written" is superseded.
  - A recipe that declares the mixin **and** defines `package_id()` silently loses the mixin (`conan/internal/graph/compute_pid.py:106-112`): `ho3` kept every setting but `build_type`, with no warning.
  - Whole tree [M]: 11 recipes use `auto_header_only`, none also defines `package_id()`. 8 of 532 `header-library` recipes neither use it nor call `self.info.clear()` (hfsm2, kangaru and six more), each to read.
- Verify: `grep -rl --include='conanfile.py' -e auto_header_only . | xargs -r grep -l -e 'def package_id'`, where non-empty = finding. `grep -rl --include='conanfile.py' --exclude-dir=test_package -e '"header-library"' . | xargs -r grep -L -e auto_header_only -e 'info.clear()'`, where each listed file with a `settings` attribute is a finding.
- Severity **SHOULD** (the failure is extra binaries and a loud "missing binary" for consumers, not a wrong build). Binds RCP. Floor: Conan 2.0.9 for `implements`.

**CMK-CONAN-16: Never call `self.info.header_only()`. It does not exist in Conan 2; clear with `self.info.clear()` (CONAN-15).**
- Rationale [M]: on Conan 2.32.0 a recipe calling it fails `conan graph info` with `AttributeError: 'ConanInfo' object has no attribute 'header_only'`, exit 1 (`scratch/pm-rev3/conan/ho1`). `ConanInfo` defines `clear()` and no `header_only` (`conan/internal/model/info.py`). CCI whole tree: 7 recipes still call it (crow, msgpack, cpp-taskflow and four more), all Conan-1 recipes (`from conans`) already caught by CONAN-01.
- Verify: `grep -rn --include='conanfile.py' -e '^[^#]*info\.header_only()' .`, where empty = pass (the pattern skips commented-out calls such as `recipes/stlab/all/conanfile.py:165`).
- Severity **MUST**. Binds RCP. Floor: Conan 2.0.

**CMK-CONAN-17: A tool recipe (consumed through `tool_requires`, an application package) removes `compiler` in `package_id()` (`del self.info.settings.compiler`) and keeps `build_type`.**
- Rationale: CCI "advised that the `compiler` setting is removed", and "We do not recommend removing the `build_type` setting on these packages, in order to preserve the ability of consumers to run debug executables" (`docs/adding_packages/conanfile_attributes.md:99-109`) [C]. Exemplars: `recipes/b2/standard/conanfile.py:99-101`, `recipes/kcov/all/conanfile.py:43-45` [M]. The wording is advice, so this is not a MUST.
- Verify: a reading heuristic on recipes with `package_type = "application"`: `grep -rn --include='conanfile.py' -e 'del self.info.settings.build_type' .` hitting such a recipe is the finding.
- Severity **SHOULD**. Binds RCP. Floor: Conan 2.0.

**CMK-CONAN-18: When `package()` calls `cmake.install()` and the upstream installs a Config package or a `.pc` file, remove them (`rmdir` of `lib/cmake`, `lib/pkgconfig`, and any package-specific duplicate such as `lib/spdlog/cmake`), so the generator's files are the only package description consumers see.**
- Rationale: the template removes `lib/pkgconfig`, `lib/cmake` and `share` after `cmake.install()` (`docs/package_templates/cmake_package/all/conanfile.py:112-114`) [N]. 13 of the 22 CMake-building sampled recipes do; the other 9 never call `cmake.install()` (`recipes/libbasisu/all/conanfile.py:107-113`) or install nothing to remove [M]. This is the Conan face of KB-H016 and KB-H020, which no longer run anywhere.
- Verify: `grep -rl --include='conanfile.py' -e 'cmake.install()' . | xargs -r grep -L -e rmdir` lists candidates; each is a finding only if the package folder after `conan create` holds `lib/cmake` or `lib/pkgconfig`.
- Severity **SHOULD**. Binds RCP. Floor: Conan 2.0.

**CMK-CONAN-19:** not assigned. The dive's candidate (producer-side `set_property` naming and `names` deletion) restated CONAN-02 and is merged into it. The number is reserved and never reused.

**CMK-CONAN-20 (CCI-specific): A recipe for Conan Center uses a `requires()`/`tool_requires()` version range only for a dependency on CCI's allow-list, at the listed range: OpenSSL, CMake, doxygen, libcurl, zlib, libpng, expat, libxml2, libuv, qt5, qt6, c-ares, zstd, ninja, meson, pkgconf and xz_utils.**
- Rationale: "Outside of the cases outlined above, version ranges are not allowed in ConanCenter recipes" (`docs/adding_packages/dependencies.md:57-77` at `07389b8fa0`) [C]. This is CCI policy, not a Conan mechanism, and it is independent of CONAN-09 (which exempts published recipes from the lock). 15 of the 40 sampled recipes carry a range; the template's own is `openssl/[>=1.1 <4]` (`…/cmake_package/all/conanfile.py:65`) [M].
- Verify: `grep -rn --include='conanfile.py' -e 'requires(.*\[' .`. Each hit's dependency name must be on the list, else a finding. Internal remotes set their own policy and are exempt.
- Severity **SHOULD**. Binds RCP (CCI). Floor: current CCI policy.

**CMK-CONAN-21: Every recipe declares `required_conan_version`, and the floor covers every feature the recipe uses (`implements` needs `>=2.0.9`). A new recipe declares `>=2.0` or higher. Never raise an existing `>=1.5x` floor on a `from conan import` recipe merely because it is below 2.0.**
- Rationale: all six CCI templates declare `>=2.0` or `>=2.0.9` [N], and 38 of the 40 sampled recipes declare a floor; whole tree, 56 recipe conanfiles have none [M]. A `>=1.5x` floor beside `from conan import` is honoured: Conan 1.50.0 and 1.53.0 ship a `conan/__init__.py` that re-exports `ConanFile` (measured with `curl` against both tags) [M]. A missing attribute makes an old client fail with a confusing error rather than a clear one, which is why this is not a MUST.
- Verify: `grep -rL --include='conanfile.py' --exclude-dir=test_package -e required_conan_version .`, where empty = pass. `grep -rl --include='conanfile.py' -e 'implements' . | xargs -r grep -l -e 'required_conan_version = ">=1'` lists floors below the mixin's; each is a finding.
- Severity **SHOULD**. Binds RCP. Floor: Conan 2.0 (the attribute itself works on 1.x).

**CMK-CONAN-22: `test_package/CMakeLists.txt` consumes the package the way a user would: `find_package(<Pkg> REQUIRED CONFIG)` (`MODULE` only when the package legitimately ships a Find module), one `add_executable`, one `target_link_libraries(… PRIVATE <Pkg>::<target>)`. `test_package/conanfile.py` generates `CMakeDeps` and `CMakeToolchain` (plus `VirtualRunEnv` when the binary needs a runtime search path) and runs the binary only under `can_run(self)`. The floor line follows the CCI template (`3.15`) for a CCI submission and CMK-VER-02 everywhere else.**
- Rationale: the template shape (`docs/package_templates/cmake_package/all/test_package/`) [N]; 37 of 38 sampled test packages match, 38 of 40 call `can_run()`, 29 of 37 add `VirtualRunEnv` [M]. The one deviation, `libui`, is a whole Conan-1 test package (`recipes/libui/all/test_package/CMakeLists.txt:1-8`), a CONAN-01 finding. `can_run()` is what lets a cross build package without executing a foreign binary.
- Verify: `find . -path '*/test_package/CMakeLists.txt' -print0 | xargs -0 -r grep -L -e 'CONFIG' -e 'MODULE'` and `find . -path '*/test_package/conanfile.py' -print0 | xargs -0 -r grep -L -e can_run`, where empty = pass for both.
- Severity **SHOULD**. Binds RCP. Floor: Conan 2.0.

**CMK-CONAN-23: Every `conandata.yml` source entry carries a `sha256`, and `source()` fetches through `get(self, **self.conan_data["sources"][self.version], …)`, never a hand-written unchecked download. There are two exceptions. A host that serves non-byte-stable archives (googlesource `+archive`) is one; such an entry names a commit in its URL and says why in a comment. A git source with a full `commit` hash, fetched by `Git(self).fetch_commit(**self.conan_data["sources"][self.version])`, is the other.**
- Rationale: `get()` and `download()` check a hash only when one is passed (`conan/tools/files/files.py:97,181`@2.32.0, `sha256=None` by default), so an entry without a hash accepts whatever the server returns. This is the recipe-side twin of `CMK-DEP-03` (URL fetches carry `URL_HASH`, MUST) [N: template `:80`]. 40 of 40 sampled recipes hash every entry. Whole tree, 5 of 1,991 `conandata.yml` files carry no `sha256` at all [M]. Four are googlesource `+archive` (`gn`, which says so in a comment, `libyuv`, `depot_tools`, `linux-syscall-support`). The fifth, `gnu-config`, is a git URL plus `commit` fetched with `Git(self).fetch_commit` [M, verify wave 3]. `linux-syscall-support` `2022.10.12` names a tag (`+archive/refs/tags/…`), not a commit, so it is a finding under this rule.
- Verify: `grep -rL --include='conandata.yml' -e sha256 .`, where empty = pass; each listed file is cleared only by one of the two exceptions. A file with one hash can still miss one entry, so read each `sources:` block of a recipe you edit. The hand-written half: `grep -rn --include='conanfile.py' -e 'download(self, *"' -e "download(self, *'" -e 'download(self, *f"' -e 'get(self, *"' -e "get(self, *'" -e 'get(self, *f"' .` lists calls with a literal URL, and empty = pass. Read each hit: one without a `sha256=` argument is the finding. At `07389b8fa0` it lists 1 call, `recipes/cryptopp-pem/all/conanfile.py:73`, and that call carries `sha256=` on `:75`.
- Severity **MUST**. Binds RCP. Floor: Conan 2.0.

**CMK-CONAN-24: Never describe `CPSDeps`, `conan.cps`, `[replace_requires]` or `[platform_requires]` as stable, GA or documented. The way to consume a system copy is a wrapper recipe plus `[replace_requires]`, not a bare `[platform_requires]`.**
- Rationale: `CPSDeps` is registered in source only (`conan/internal/api/install/generators.py:39`@2.32.0, writing `build/cps/<config>/cps/*.cps` per `conan/tools/cps/cps_deps.py`; read-back `conan/cps/cps.py:238,291`), with no docs page and 0 of 40 sampled adopters [N/M]. Both profile sections include `experimental_warning.inc` (`reference/config_files/profiles.rst:443,548` on `develop2`) [N], and Conan's own text steers the system-copy case to a wrapper recipe. The CMake-side CPS import and export rows belong to CMK-DEP and CMK-INST, which this rule cites and does not restate.
- Verify: a reading heuristic on generated prose and docs: `grep -rn --include='*.md' -i -e CPSDeps -e platform_requires -e replace_requires .` lists passages to read for "stable" or "GA".
- Severity **SHOULD**. Binds every kind. Floor: Conan 2.32.0; re-check on each Conan minor.

### CMK-VCPKG

#### Check A: manifest JSON (grep or `jq` on `vcpkg.json` and `vcpkg-configuration.json`)

**CMK-VCPKG-01: Every top-level manifest is reproducible. It carries `builtin-baseline`, or a `vcpkg-configuration.json` whose default registry has a `baseline`, or CI pins the vcpkg root to a commit. The best practice is baseline plus pinned root at the same SHA. Move a baseline with `vcpkg x-update-baseline` (`--add-initial-baseline` the first time; the `x-` prefix means experimental), never by hand.**
- Rationale: "If a manifest does not configure any registries and does not have a `builtin-baseline`, the install operates according to the Classic mode algorithm and ignores all versioning information" (vcpkg-docs `users/versioning.md:117`) [N]. The silent case is the constraint-free manifest only. Measured on vcpkg-tool 2026-09-26 (`51bf87ca6e`): a manifest with `"version>="` or `"overrides"` and no baseline is rejected outright ("was rejected because it uses "version>=" and does not have a "builtin-baseline""), while a plain `"dependencies": ["foo"]` manifest proceeds to planning with no warning [M]. Corpus [M], re-counted today:
  - 9 consumer manifests outside the vcpkg repos, 5 with a baseline.
  - The 4 without are 3 `project_options` test fixtures plus `apache__arrow@3ad410b7b1:ci/vcpkg/vcpkg.json`, which arrow still makes reproducible by pinning the root: `.env:95` `VCPKG="9b965a11…"`, checked out at `ci/scripts/install_vcpkg.sh:44`. That SHA equals `cpp/vcpkg.json:61`'s `builtin-baseline`.
- Verify: `grep -rL --include='vcpkg.json' --exclude-dir=vcpkg --exclude-dir=vcpkg_installed --exclude-dir=build -e '"builtin-baseline"' .` lists manifests without a baseline, and empty = pass. For each listed top-level manifest, a sibling `vcpkg-configuration.json` with `"baseline"`, or a pinned vcpkg checkout in CI, clears it. Otherwise it is the finding.
- Severity **MUST**. Binds APP. Floor: manifest versioning (vcpkg-tool 2021+), unchanged at 2026-09-26.

**CMK-VCPKG-02: Put `overrides` and all registry and overlay configuration only in the top-level project. A library states a floor with `"version>="` on the dependency, never with `overrides` in its own manifest, and never ships an overlay its consumers are expected to pick up.**
- Rationale: "`overrides` from transitive manifests … are ignored. Only overrides defined by the top-level project are used" (`vcpkg-json.md:223`), and "All fields in the `vcpkg-configuration.json` file are only used from the top-level project -- the `vcpkg-configuration.json` files in any dependencies are ignored" (`reference/vcpkg-configuration-json.md:10-13`, re-fetched 2026-09-26) [N]. That includes `"overlay-ports"`: overlays come only from `--overlay-ports`, the top-level configuration and `VCPKG_OVERLAY_PORTS`, in that order (`concepts/package-name-resolution.md:201-209`) [N]. This corrects the port dive's claim that a dependency's manifest may declare overlays.
- Verify: in a repo that ships as a port or overlay, `grep -rn --include='vcpkg.json' --include='vcpkg-configuration.json' -e '"overrides"' -e '"overlay-ports"' .`, where empty = pass and a hit is dead weight. Positive exemplar of top-level use: `friendlyanon__cmake-init@7e0c52fc73:cmake-init/templates/common/vcpkg.json:26,29`.
- Severity **MUST**. Binds LIB. Floor: current.

**CMK-VCPKG-03: A library's own `vcpkg.json` gives its dependencies `"default-features": false` unless it really needs them, marks every build-time tool dependency (code generators, `vcpkg-cmake`, `vcpkg-cmake-config`) `"host": true`, and writes `license` as an SPDX expression or `null`.**
- Rationale: "Ports used by others should almost always use `"default-features": false`" (`vcpkg-json.md:80`). Tools "should be marked as `"host": true`" for cross-compilation (`vcpkg-json.md:364-368`) [N]. Arrow marks both helpers host (`apache__arrow@3ad410b7b1:ci/vcpkg/vcpkg.json`). A port that adopts the current helpers (VCPKG-13) needs exactly these two host dependencies.
- Verify: `grep -rn -A2 --include='vcpkg.json' -e '"vcpkg-cmake' .` must show `"host": true` beside each hit; a missing one is the finding. Default features and license are a reading heuristic.
- Severity **SHOULD**. Binds LIB, RCP. Floor: current.

#### Check B: CMake wiring (presets and the first `project()`)

**CMK-VCPKG-04: Wire `scripts/buildsystems/vcpkg.cmake` through a preset (`toolchainFile` or `cacheVariables.CMAKE_TOOLCHAIN_FILE`) or `-D`. Set every `VCPKG_*` variable (triplet, manifest features, overlays, chainload) before the first `project()`, preferably in the same preset.**
- Rationale: "all CMake-level variables that modify a vcpkg setting must be set before the first call to `project()`" (`cmake-integration.md:43`). Anything set later is a silent no-op [N]. Measured with the vcpkg-tool 2026-09-26 bundle's `vcpkg.cmake` on 3.31.12, 4.3.4 and 4.4.2: `set(VCPKG_TARGET_TRIPLET arm64-linux)` before `project()` or as `-D` found the arm64 package, the same `set()` after `project()` silently found the x64-linux one, and configure exited 0 [M]. Positive exemplar: `microsoft__vcpkg-tool@51bf87ca6e:CMakePresets.json:43`. The general ordering rule is CMK-TC (M-H-02); this is its vcpkg trigger.
- Verify: `grep -rn --include='CMakeLists.txt' -e 'set(VCPKG_' -e 'list(APPEND VCPKG_' -e 'project(' .`. A `VCPKG_` write whose line number is greater than the file's first `project(` is the finding; none = pass. Reads after `project()` (`if(VCPKG_TARGET_TRIPLET MATCHES …)`) are legitimate and are not matched.
- Severity **MUST**. Binds APP. Floor: `cacheVariables.CMAKE_TOOLCHAIN_FILE` needs presets v1 (CMake 3.19), the `toolchainFile` field needs presets v3 (CMake 3.21), and `-D` works everywhere; all are below the 3.25 floor.

**CMK-VCPKG-05: Compose another toolchain with vcpkg's only through `VCPKG_CHAINLOAD_TOOLCHAIN_FILE`. One configure has exactly one `CMAKE_TOOLCHAIN_FILE`, and it is never vcpkg's and Conan's together.**
- Rationale: exactly one toolchain file is loaded. Measured on 3.31.12, 4.3.4 and 4.4.2: a preset's `toolchainFile` beats the same preset's `cacheVariables.CMAKE_TOOLCHAIN_FILE`, and a command-line `-DCMAKE_TOOLCHAIN_FILE` beats the preset; the losing file is never loaded [M] (`toolchainFile` "Takes precedence over any `CMAKE_TOOLCHAIN_FILE` value", cmake-presets(7) at v3.21) [N]. The cross-manager ban is `CMK-TC-02` (map item (e) 9) and the composition table is CMK-TC (M-H-01). Both are cited here, not restated.
- Verify: `grep -rn --include='CMakePresets.json' --include='CMakeUserPresets.json' -e CMAKE_TOOLCHAIN_FILE -e toolchainFile .`. More than one distinct value in one preset's inheritance chain is the finding, and so is `grep -rn -e conan_toolchain.cmake .` hitting beside a vcpkg preset.
- Severity **MUST**. Binds APP, BZL. Floor: current.

#### Check C: triplet and ABI (presets and triplet files)

**CMK-VCPKG-06: Name the triplet explicitly per configure leg (`VCPKG_TARGET_TRIPLET` in the preset). When that triplet links the CRT statically (`*-windows-static`, or `VCPKG_CRT_LINKAGE static`), the consuming project sets `CMAKE_MSVC_RUNTIME_LIBRARY` to `MultiThreaded$<$<CONFIG:Debug>:Debug>` itself, in the preset's `cacheVariables` or before the first `project()`. With `x64-windows` or `*-static-md` it keeps CMake's default.**
- Rationale [M]: `microsoft__vcpkg@c4ee5a52d7:scripts/buildsystems/vcpkg.cmake` has 0 references to `CMAKE_MSVC_RUNTIME_LIBRARY` or `VCPKG_CRT_LINKAGE`. The `windows.cmake:3` setter is the chainload toolchain for *port* builds (`ports/vcpkg-cmake/vcpkg_cmake_configure.cmake:175-181`), and even there a command-line `-D` beats it (VCPKG-15). `triplets/x64-windows-static.cmake:2` is CRT static. CMake defaults to `MultiThreaded$<$<CONFIG:Debug>:Debug>DLL` [N]. A mismatch surfaces only at link (LNK2038). Arrow sidesteps it with `*-static-md` triplets (`apache__arrow@3ad410b7b1:ci/vcpkg/amd64-windows-static-md-release.cmake:19`). The placement clause is map item (e) 7.
- Verify: if `grep -rn --include='CMakePresets.json' --include='CMakeLists.txt' --include='*.cmake' --include='*.yml' --include='*.yaml' --exclude-dir=vcpkg -e 'windows-static$' -e 'windows-static[^-]' -e 'VCPKG_CRT_LINKAGE static' .` hits (it matches quoted, unquoted and `set()` spellings and skips `*-static-md`), then `grep -rn --include='CMakeLists.txt' --include='*.cmake' --include='CMakePresets.json' -e CMAKE_MSVC_RUNTIME_LIBRARY .` must be non-empty. Empty on the second is the finding; a `CMakeLists.txt` hit after the first `project()` is a finding too.
- Severity **MUST**. Binds APP. Floor: CMake 3.15 (CMP0091); Windows/MSVC only.

**CMK-VCPKG-07: Register every file a custom or overlay triplet `include()`s in `VCPKG_HASH_ADDITIONAL_FILES`, and never set `VCPKG_DISABLE_COMPILER_TRACKING`.**
- Rationale: the ABI hash covers "the triplet file contents and name" and both compiler executables, and its documented input list names no included file (`reference/binarycaching.md:436-450`, re-fetched 2026-09-26). The docs warn that disabling compiler tracking "can lead to ABI incompatibility in restored binary packages" (`users/triplets`) [N].
- Verify: `grep -rn --include='*.cmake' -e VCPKG_DISABLE_COMPILER_TRACKING triplets`, where empty = pass. `grep -rln --include='*.cmake' -e 'include(' triplets | xargs -r grep -L -e VCPKG_HASH_ADDITIONAL_FILES`, where non-empty = finding. Use the repo's overlay-triplet directory in place of `triplets`.
- Severity **SHOULD**. Binds APP, RCP. Floor: current.

#### Check D: CI caches (grep the pipeline directory)

**CMK-VCPKG-08: Never use `x-gha` in `VCPKG_BINARY_SOURCES`/`--binarysource`. Recommend `files`, `nuget`/`nugetconfig` or `http` without a caveat, and add a comment naming "experimental" beside any other `x-` provider.**
- Rationale: the provider table (`reference/binarycaching.md:20-33`) marks `x-gha` "Removed" and `x-azblob`, `x-azcopy`, `x-azcopy-sas`, `x-gcs`, `x-aws`, `x-aws-config`, `x-cos` and `x-az-universal` "Experimental: will change or be removed without warning" [N]. `x-gha` itself is *not* an error: vcpkg-tool 2026-09-26 prints "warning: The 'x-gha' binary caching backend has been removed" and exits 0 (`binarycaching.cpp:2168-2170`), so a CI that still names it silently runs uncached [M]. An unknown provider token is a hard parse error, not a fallback to `files` (`microsoft/vcpkg-tool@2026-09-26:src/vcpkg/binarycaching.cpp:2266`; measured `bogus,readwrite` exits 1) [M]. Positive exemplar: `apache__arrow@3ad410b7b1:.github/workflows/cpp_extra.yml:253` `clear;nuget,GitHub,readwrite`. How the CI cache around it is keyed is CMK-PKG-04.
- Verify: `grep -rn -e x-gha .github`, where empty = pass. `grep -rn -e x-azblob -e x-azcopy -e x-gcs -e x-aws -e x-cos -e x-az-universal .github` lists hits that each need the comment.
- Severity **MUST**. Binds APP. Floor: vcpkg-tool 2026-09-26 (no provider changed status in this window).

**CMK-VCPKG-09: An offline or air-gapped CI that sets `X_VCPKG_ASSET_SOURCES` includes `x-block-origin`.**
- Rationale: without it, a mirror miss falls through to the upstream URL, which is step 2 of the documented read, origin, write-back flow (`users/assetcaching`) [N]. Corpus: 0 uses [M].
- Verify: `grep -rln -e X_VCPKG_ASSET_SOURCES .github | xargs -r grep -L -e x-block-origin`, where empty = pass.
- Severity **SHOULD**. Binds APP. Floor: current, and the feature is itself `x-`-prefixed.

#### Check E: dead and never-existing surface (grep plus a wording check on generated text)

**CMK-VCPKG-10: A consuming project never introduces vcpkg-artifacts (`vcpkg-ce`, `vcpkg activate`, `VCPKG_ARTIFACTS_*`) or `VCPKG_PREFER_SYSTEM_LIBS`. Replace the latter with an empty overlay port (recipe below).**
- Rationale: artifacts are "removed after July 1" per the 2026-05-27 release note, but the code is still in vcpkg-tool at 2026-09-26 [M]. `VCPKG_PREFER_SYSTEM_LIBS` is "deprecated. Use empty overlay ports instead" [N]; at `microsoft__vcpkg@c4ee5a52d7:scripts/buildsystems/vcpkg.cmake:54-57` it still exists (default `OFF`) and prints that text as a `WARNING` when set, with no announced removal date [M].
- Verify: `grep -rn --exclude-dir=vcpkg -e vcpkg-artifacts -e vcpkg-ce -e VCPKG_ARTIFACTS -e 'vcpkg activate' -e VCPKG_PREFER_SYSTEM_LIBS .`, where empty = pass.
- Severity **MUST**. Binds APP. Floor: re-check on every vcpkg-tool tag.
- Recipe (no ID), the replacement for `VCPKG_PREFER_SYSTEM_LIBS`: an overlay directory holding one directory per port, each with two files. `vcpkg.json` names the real port and any valid version, because "Overlays are considered before any registry lookups, or versioning considerations" (`concepts/package-name-resolution.md:199`) [N]. `portfile.cmake` is one line, `set(VCPKG_POLICY_EMPTY_PACKAGE enabled)`, which "disables all post-build checks" (`reference/policies`) [N], so the port installs nothing and the consumer's `find_package` falls through to the system copy. Register it from the top-level project only (VCPKG-02): `--overlay-ports`, the top-level `vcpkg-configuration.json` `"overlay-ports"`, or `VCPKG_OVERLAY_PORTS`. vcpkg's own `scripts/test_ports` uses the same policy line in 166 files [M].

```json
{ "name": "zlib", "version": "1.0.0" }
```

```cmake
set(VCPKG_POLICY_EMPTY_PACKAGE enabled)
```

**CMK-VCPKG-11: Never state or generate that vcpkg has a lockfile (`vcpkg.lock`), a CMake dependency provider or CPS support, or that its CI "fails on drift". Reproducibility means baseline plus `version>=` plus a pinned tool and root.**
- Rationale [M]: `vcpkg.cmake` has 0 `SET_DEPENDENCY_PROVIDER`/`PACKAGE_INFO` hits. The vcpkg-tool tree at tag 2026-09-26 (2,461 paths) has no CPS or provider file. Version selection is "the lowest version that matches all constraints" [N]. Map conflict 23.
- Verify: `grep -rn -e vcpkg.lock -e 'vcpkg-lock' .`, where empty = pass. For generated prose, a reading heuristic.
- Severity **MUST**. Binds every kind. Floor: vcpkg-tool 2026-09-26.

#### Check F: port authoring (RCP; grep `portfile.cmake`, then read)

Corpus: `microsoft__vcpkg@c4ee5a52d7`, 2,867 `portfile.cmake` files; 40-port
sample, every 71st of 2,865 sorted port names
(`cmake-package-managers/vcpkg-port-authoring.md`). Whole-tree counts re-run
for this revision (`scratch/pm-rev3/corpus/`). Commands below run from the
port or overlay root.

**CMK-VCPKG-12: Write hexadecimal strings in lower case: every `SHA512` argument, a hex `REF`, and `git-tree` values.**
- Rationale: the maintainer guide requires it, and says why: "Internally, vcpkg uses lowercase normalization for comparisons … However, tooling built on top of vcpkg's infrastructure may not make the same considerations" (`contributing/maintainer-guide.md:216-230`, re-fetched 2026-09-26) [N]. So vcpkg itself accepts upper case, which is why this is not a MUST. 17 of the 2,728 portfiles with a `SHA512` violate it (`ports/rpclib/portfile.cmake:7`, `ports/icu/portfile.cmake:5`, `ports/clue/portfile.cmake:5` and 14 more) [M].
- Verify: `grep -rlP --include='portfile.cmake' -e 'SHA512\s+[0-9a-fA-F]*[A-F][0-9a-fA-F]*' .`, where empty = pass.
- Severity **SHOULD**. Binds RCP. Floor: current.

**CMK-VCPKG-13: A new or edited port uses `vcpkg_cmake_configure`, `vcpkg_cmake_build`/`vcpkg_cmake_install` and `vcpkg_cmake_config_fixup`, with `vcpkg-cmake` and `vcpkg-cmake-config` as host dependencies (VCPKG-03). It never calls `vcpkg_configure_cmake`, `vcpkg_build_cmake`, `vcpkg_install_cmake`, `vcpkg_fixup_cmake_targets`, `vcpkg_extract_source_archive_ex`, `vcpkg_apply_patches` or `vcpkg_build_msbuild`, and never calls `vcpkg_extract_source_archive` in its deprecated form without `ARCHIVE`. It replaces `vcpkg_copy_tool_dependencies` with `vcpkg_copy_tools` (SHOULD).**
- Rationale: the maintainer guide lists all of them as deprecated with their replacements, including "the deprecated overload of `vcpkg_extract_source_archive()` without `ARCHIVE`" (`maintainer-guide.md:182-195`) [N]. The seven helpers named above and the old overload have 0 users across 2,867 portfiles; `vcpkg_copy_tool_dependencies` still has 48, which is why its clause is a SHOULD [M]. The legacy helpers are **not removed**: all seven files still ship in `scripts/cmake/` at `c4ee5a52d7`. Of the seven, only `vcpkg_apply_patches` prints a deprecation message (the old extract overload prints one too). Mixing is a `FATAL_ERROR`: `vcpkg_fixup_cmake_targets` with `vcpkg-cmake-config` (`scripts/cmake/vcpkg_fixup_cmake_targets.cmake:2-4`), and `vcpkg_configure_cmake`, `vcpkg_build_cmake` or `vcpkg_install_cmake` with `vcpkg-cmake` (their `Z_VCPKG_CMAKE_*_GUARD` checks) [M]. So an overlay port that uses only the old helpers still builds, silently; the rule is for new and edited work, like CONAN-03.
- Verify: `grep -rlw --include='portfile.cmake' -e vcpkg_configure_cmake -e vcpkg_build_cmake -e vcpkg_install_cmake -e vcpkg_fixup_cmake_targets -e vcpkg_extract_source_archive_ex -e vcpkg_apply_patches -e vcpkg_build_msbuild .`, where empty = pass (`-w` keeps `z_vcpkg_apply_patches` out). `grep -rn --include='portfile.cmake' -e 'vcpkg_extract_source_archive( *["$]' .` finds the old overload, whose first argument is the archive path rather than an output variable, and empty = pass. `grep -rlw --include='portfile.cmake' -e vcpkg_copy_tool_dependencies .` lists the SHOULD clause.
- Severity **MUST** for new or edited ports. Binds RCP. Floor: current registry.

**CMK-VCPKG-14: A Config package the port exports for a library whose upstream ships none is named `unofficial-<port>` (lower case), with targets in the `unofficial::<port>::` namespace.**
- Rationale: "any CMake configs that the port exports, which are not in the upstream library, should have `unofficial-` as a prefix. Any additional targets should be in the `unofficial::<port>::` namespace" (`maintainer-guide.md:256-265`) [N]. 141 portfiles pass `PACKAGE_NAME unofficial-<port>` to `vcpkg_cmake_config_fixup`, and no `unofficial-*` template in the tree uses upper case (M-F-16) [M]. The guide says "should", so this ships as SHOULD, the same call as conflict 11. The general naming principle for anyone packaging someone else's library belongs beside `CMK-INST-06`/`-07` as a cross-reference (Open questions).
- Verify: a reading pass over `grep -rn --include='portfile.cmake' -e 'PACKAGE_NAME' .`: a value other than `unofficial-<port>` for a port whose upstream ships no Config of its own is the finding.
- Severity **SHOULD**. Binds RCP. Floor: current.

**CMK-VCPKG-15: A port's `OPTIONS` (or a triplet's `VCPKG_CMAKE_CONFIGURE_OPTIONS`, `_RELEASE`, `_DEBUG`) sets `CMAKE_MSVC_RUNTIME_LIBRARY` only as a value derived from `VCPKG_CRT_LINKAGE`, never as a constant.**
- Rationale [M/N]: a port's `OPTIONS` and the triplet's `VCPKG_CMAKE_CONFIGURE_OPTIONS` reach the inner `cmake` as command-line `-D` flags (`ports/vcpkg-cmake/vcpkg_cmake_configure.cmake:218,230-245`), and the chainload toolchain sets the runtime as a non-`FORCE` cache entry (`scripts/toolchains/windows.cmake:3`). Measured on CMake 3.31.12 and 4.4.2 (`scratch/pm-rev3/crt/run.sh`): a `-DCMAKE_MSVC_RUNTIME_LIBRARY=CLI_VALUE` beats the toolchain's `set(… CACHE STRING "")`, exit 0 under `-Werror=dev`, 0 warnings. So a constant there silently defeats the triplet's CRT choice, and the consumer sees LNK2038 at best. Corpus: the port dive reported 0 users; the whole tree has 2 (`ports/llfio/portfile.cmake:58-64`, `ports/zyre/portfile.cmake:28-35`), and both branch on `VCPKG_CRT_LINKAGE`, the correct form. The dive's `CMAKE_POSITION_INDEPENDENT_CODE` half is dropped: 0 portfiles set it, and no harmful direction was measured.
- Verify: `grep -rl --include='portfile.cmake' -e CMAKE_MSVC_RUNTIME_LIBRARY . | xargs -r grep -L -e VCPKG_CRT_LINKAGE` and, over the overlay-triplet directory, `grep -rl --include='*.cmake' -e VCPKG_CMAKE_CONFIGURE_OPTIONS triplets | xargs -r grep -l -e CMAKE_MSVC_RUNTIME_LIBRARY`. Empty on both = pass; both are empty on the registry today. The pairing is per file, so a constant in a portfile that mentions `VCPKG_CRT_LINKAGE` anywhere else slips through. `grep -rl --include='portfile.cmake' -e CMAKE_MSVC_RUNTIME_LIBRARY . | xargs -r grep -l -e VCPKG_CRT_LINKAGE` lists those files. Read each one: a runtime value outside a `VCPKG_CRT_LINKAGE` branch is the finding. On the registry it lists `llfio` and `zyre`, and both are clean.
- Severity **MUST**. Binds RCP. Floor: CMake 3.15 (CMP0091); Windows/MSVC only.

**CMK-VCPKG-16: A port that supports one linkage on a platform says so with `vcpkg_check_linkage(ONLY_STATIC_LIBRARY)` or `(ONLY_DYNAMIC_LIBRARY)`, guarded by the matching `VCPKG_TARGET_IS_*`, never only in prose, and never by adding `CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS`.**
- Rationale: this is the maintainer guide's own example, in its section against `CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS` [N]. 552 of 2,867 portfiles call it [M].
- Verify: a reading heuristic beside `grep -rl --include='portfile.cmake' -e vcpkg_check_linkage .`: a Windows-capable port whose upstream has no export macros or `.def` file and lacks the call is the finding.
- Severity **SHOULD**. Binds RCP. Floor: current.

**CMK-VCPKG-17: Ship and install a `usage` file (`share/<port>/usage`) whenever consuming the port needs something non-obvious: an `unofficial-` package name, non-default components, a target name, or a runtime asset path.**
- Rationale: vcpkg's post-build check fires when a port directory holds `usage` and `share/${PORT}/usage` is not installed; `VCPKG_POLICY_SKIP_USAGE_INSTALL_CHECK` exists only to silence it (`reference/policies`) [N]. 543 of 2,865 ports ship one [M].
- Verify: a reading heuristic. A port that passes `PACKAGE_NAME unofficial-` (VCPKG-14) and has no `usage` file beside its `portfile.cmake` is the finding; the install half is caught by vcpkg's own post-build check.
- Severity **SHOULD**. Binds RCP. Floor: current.

**CMK-VCPKG-18: Install the license with `vcpkg_install_copyright(FILE_LIST …)`, not a hand-written `file(INSTALL … RENAME copyright)` or a hand-built `share/${PORT}/copyright` path.**
- Rationale: the guide prefers the helper and calls the manual form "discouraged in favor of `vcpkg_install_copyright` in new ports but is still allowed" (`maintainer-guide.md:273-279`) [N], hence SHOULD. 1,847 of 2,867 portfiles use the helper. The port dive's "91 hand-rolled" counted only the literal path: 675 portfiles hand-roll it without the helper, 588 of them through `RENAME copyright` [M].
- Verify: `grep -rlF --include='portfile.cmake' -e 'RENAME copyright' -e 'share/${PORT}/copyright' . | xargs -r grep -L -e vcpkg_install_copyright`, where empty = pass.
- Severity **SHOULD**. Binds RCP. Floor: current.

**CMK-VCPKG-19 and CMK-VCPKG-20:** not assigned. The dive's candidates were a redundant `CMAKE_POLICY_VERSION_MINIMUM` in port `OPTIONS` (2 of 2,867 ports, both harmless restatements of the `3.5` that `scripts/ports.cmake:6-8` exports for CMake 4.0+) and uncommented `CMAKE_POLICY_DEFAULT_CMP<N>` pins (20 ports, all one named policy). Neither prevents a measured failure, and the policy-knob scoping rule is `CMK-DEP-15`. Inside a port build the `3.5` value is enough: `vcpkg_cmake_configure` passes no `-Werror=dev`/`-Werror=author`, so the 3.5–3.9 gate tier never fires there. The numbers are reserved and never reused.

**CMK-VCPKG-21: Do not vendor a dependency's source inside a port. Split it into its own port, depend on it, and patch the upstream build to use it.**
- Rationale: "Do not use vendored dependencies", citing symbol conflicts between two vendored copies, licensing opacity and duplicated maintenance (`maintainer-guide.md:398-416`) [N].
- Verify: a reading heuristic only, because a vendored copy has no keyword: read the portfile and the upstream `CMakeLists.txt` for an `add_subdirectory` into a bundled `third_party/` or `extern/` tree that no patch devendors.
- Severity **SHOULD**. Binds RCP. Floor: current.

### CMK-PKG (the cpp-packaging index)

The index owns the acquisition choice, the per-mechanism lock of record,
tool provisioning and CI cache shape. The one-manager-of-record ban is
`CMK-TC-02` (map item (e) 9); VCPKG-05 is its vcpkg trigger.

Acquisition triggers (a table, not a mandate; M-L-01):

| Situation | Strategy that fits | Why |
|---|---|---|
| The dependency has no CMake build, or Bazel/Meson must build the same tree | System package or a vendored copy | FetchContent and CPM assume the dependency speaks CMake |
| A few header-only or fast-building deps, no registry of record | FetchContent or CPM | No packaging step; every clean tree rebuilds from source (CPM README, Limitations) |
| Cross-compiling with tools that run during the build | Conan `tool_requires` or vcpkg `"host": true` | Only the two managers split build and host |
| One binary cache and an audit or SBOM surface for an organisation | Conan or vcpkg | Neither CPM nor system packages offer either |
| A platform registry already exists (a distro) | System packages, a manager only for the gaps | One ABI story per configure (`CMK-TC-02`) |

Build-tool provisioning (M-L-04; portable wording, conflict 24):

| Mechanism | What pins the version | Offline story |
|---|---|---|
| Conan `tool_requires` (recipe or profile `[tool_requires]`) | The package reference, and `conan.lock` when ranged (CONAN-09) | Conan remote and binary cache |
| vcpkg `"host": true` dependency | The same baseline as every other dependency (VCPKG-01) | vcpkg binary and asset caches |
| An external hash-verified provisioner | The hash written at that call site | Whatever mirror that site names |
| The runner or container image | The image digest, if pinned; otherwise nothing | None of its own |

**CMK-PKG-01: A tree that reaches more than one acquisition mechanism keeps a lock-of-record entry for every mechanism it reaches, each checked by that mechanism's rule, not only the primary manager's.**
- Rationale: the per-mechanism rules do not compose. A pristine `conan.lock` says nothing about a `FetchContent_Declare(… GIT_TAG main)` beside it. The entries are CONAN-09 (Conan), VCPKG-01 and PKG-02 (vcpkg), `CMK-DEP-01..03` (FetchContent, CPM, ExternalProject), `CMK-DEP-05` (CPM bootstrap), `CMK-DEP-06` (HunterGate) and the gitlink (submodules). Corpus [M, audit]: 96.8 % of 6,957 `find_package` calls carry no version, 10 of 34 git-based `FetchContent_Declare` pin a full hash, 21 of 64 `CPMAddPackage` pin a `VERSION`, 0 of 46 repos commit `conan.lock`, and 5 of 9 consumer vcpkg manifests carry a baseline (conflict 7). A `branch =` key in `.gitmodules` does not float a gitlink (map M-G-14, closed as not a defect), so submodules need no extra check.
- Verify: detect each mechanism, then run its rule. `grep -rl --include='conanfile.py' --include='conanfile.txt' -e requires .` non-empty → CONAN-09. `grep -rl --include='vcpkg.json' -e dependencies .` non-empty → VCPKG-01 and PKG-02. `grep -rl --include='CMakeLists.txt' --include='*.cmake' -e FetchContent_Declare -e CPMAddPackage -e ExternalProject_Add -e HunterGate .` non-empty → `CMK-DEP-01..03`, `-05`, `-06`. Empty on all three means no fetched mechanism; a detected mechanism whose rule was not run is the finding.
- Severity **MUST**. Binds APP, LIB. Floor: any; it composes already-versioned rules.

**CMK-PKG-02: Pin the vcpkg tool as well as the port versions. Either bootstrap the tool from the pinned vcpkg root (`bootstrap-vcpkg`, which reads the root's `scripts/vcpkg-tool-metadata.txt`) or pin an explicit vcpkg-tool release and its hash. Never run a runner image's preinstalled vcpkg.**
- Rationale: `builtin-baseline` pins ports, not the tool. The registry root pins the tool it bootstraps: at `microsoft__vcpkg@c4ee5a52d7` (2026-09-25), `scripts/vcpkg-tool-metadata.txt` reads `VCPKG_TOOL_RELEASE_TAG=2026-07-27` with per-platform SHA512s, although vcpkg-tool 2026-09-26 has been released [M]. So a root pinned at one SHA (VCPKG-01's best practice) also pins the tool, provided CI bootstraps from it. A runner image's vcpkg (`C:\vcpkg`, `VCPKG_INSTALLATION_ROOT`) changes whenever the image does. The tool-provisioning dive's "the two trains are independent, so one pin cannot stand in for the other" is corrected: they are independent release trains, but the root commit fixes the tool.
- Verify: `grep -rn -e VCPKG_INSTALLATION_ROOT -e 'C:\\vcpkg' .github`, where empty = pass. Otherwise read the CI for a checkout of a fixed vcpkg SHA followed by `bootstrap-vcpkg`, or a tool download with a hash.
- Severity **SHOULD**. Binds APP. Floor: vcpkg registry with `scripts/vcpkg-tool-metadata.txt` (present at `c4ee5a52d7`); re-check each registry tag.

**CMK-PKG-03: For every build tool whose version changes the output (a code generator, a required CMake or Ninja floor), state which provisioning mechanism supplies it and pin it there. "Whatever the runner image ships" is not a mechanism.**
- Rationale: the runner image is the majority path in the corpus: 35 of the 46 repos install no CMake of their own (`cmake-audit/exemplar-deps-and-dual-build.md:430`) [M], and a `protoc` skew between runs changes generated code without any error. The provisioning table above says what each mechanism pins.
- Verify: a reading heuristic. For each tool the project's docs or CI name, find a `tool_requires` entry, a `"host": true` entry, a hash-verified download, or a digest-pinned image. None for a version-sensitive tool is the finding.
- Severity **SHOULD**. Binds APP. Floor: any.

**CMK-PKG-04: In CI, cache the manager's content-addressed store (vcpkg's binary cache or its `files` provider directory, Conan's package cache) and run the manager's install step on every job. Never skip `vcpkg install` or `conan install` on an `actions/cache` hit. If an installed tree is cached instead, its key hashes the manifest or lock and the baseline, so a dependency change invalidates it.**
- Rationale: vcpkg's binary cache is keyed by an ABI hash over every port file, the triplet, both compiler executables, the CMake version and each dependency's hash (`reference/binarycaching.md:434-450`) [N], so a stale or foreign archive is never used, whatever the outer key says. That is what protects `aminya__project_options@412045e1f1:.github/workflows/ci.yml:47-59`, which caches the archives; its manifest-and-compiler key only saves space. The harm is the other shape: `boostorg__boost@a61cfa03ba:.github/workflows/ci.yml:372-386` caches the classic-mode `C:\vcpkg\installed` tree under the constant key `vcpkg-${{ runner.os }}-arm64` and runs `vcpkg install openssl:arm64-windows` only `if: steps.cache-vcpkg.outputs.cache-hit != 'true'`. The OpenSSL it builds is frozen at the first save, whatever the runner's vcpkg or compiler later becomes [M, read]. The dive's MUST rested on the outer key preventing ABI mismatches; the ABI hash already does that, so this ships as a SHOULD. The Conan half has no corpus example either way (Verdict 12). With CONAN-09's lock, resolution is exact, so a restored cache cannot change versions.
- Verify: `grep -rn -e 'cache-hit' .github` lists guarded steps; one that guards a `vcpkg install` or `conan install` is the finding. `grep -rn -A12 -e 'actions/cache' .github` lists cache steps; a `path:` naming an installed tree (`installed`, `vcpkg_installed`) whose `key:` has no `hashFiles(` over `vcpkg.json` or `conan.lock` is the finding.
- Severity **SHOULD**. Binds APP. Floor: any `actions/cache` version (v2 to v6 seen in the corpus).

**CMK-PKG-05, CMK-PKG-06 and CMK-PKG-07:** not assigned. The dive's candidates were a ccache key design note, "do not gate CI on `conan audit`, vcpkg SBOMs or `install(SBOM)`", and the survey-citation rule, all CONSIDER. This file keeps no CONSIDER rows. The survey and supply-chain findings are Verdict 12. "Do not gate" was not supported by the evidence: an experimental command can still be gated on, as long as the Conan version is pinned. The numbers are reserved and never reused.

**MUST count: 20.**
- MUST: CONAN-01, 02, 03, 05, 06, 09, 10, 16, 23 (9); VCPKG-01, 02, 04, 05, 06, 08, 10, 11, 13, 15 (10); PKG-01 (1).
- SHOULD: CONAN-04, 07, 08, 11, 12, 13, 14, 15, 17, 18, 20, 21, 22, 24; VCPKG-03, 07, 09, 12, 14, 16, 17, 18, 21; PKG-02, 03, 04.
- Reserved, never assigned: CONAN-19, VCPKG-19, VCPKG-20, PKG-05, PKG-06, PKG-07.
- No CONSIDER rows survived: every argued-only candidate was cut instead.

Deliberately **not** rules. Each was a candidate from a sub-artifact and was cut for low yield or because another family owns it:
- Conan workspaces are GA-without-a-flag since 2.31.0, but `incubating.rst` still says "generally available as experimental". There are 0 corpus adopters, so this is a verdict line and not a rule.
- `conan graph explain` and `graph info` belong to the `cmake-dependency-triage` skill procedure.
- CMake-side CPS import and export (M-M-09's CMake half) go to CMK-DEP/CMK-INST; the Conan-side wording guard is CONAN-24.
- The `CMakeUserPresets.json` `vendor.conan` "adopt" trick is covered by CONAN-08.
- vcpkg-tool issue [#14025](https://github.com/microsoft/vcpkg/issues/14025) (VS manifest re-check latency) is latency only.
- `compatibility()` (0 of 40 sampled, 0 of 6 templates), KB-H034/050/051 option-shape hooks, and `x-add-version` hygiene (a three-way diff against `versions/`, not a grep) stay reading notes in the depth dives.
- Script Mode inside `portfile.cmake` (no toolchain, language or target concepts) is a failure mode, not a rule.
- The comparison ecosystems (M-L-09) and distro recipes (M-L-10) bind no rule.

## Applied to find_ocx and the exemplars

**find_ocx** (`/home/mherwig/dev/find_ocx`, HEAD `9094f87b55`, working tree dirty; corpus copy `ac2a759cd0`):
- It has 0 Conan, vcpkg or `tool_requires` references (`grep -rn -i -e conan -e vcpkg` over its CMake, JSON, YAML and Markdown files; [fleet] §7, [ocx] Gaps). No CMK-CONAN, CMK-VCPKG or CMK-PKG rule binds it; it reaches none of Conan, vcpkg, CPM or Hunter (`cmake-audit/find-ocx-cmake-shape-and-contracts.md:494`).
- It does already satisfy the *principle* behind CONAN-09, VCPKG-01 and PKG-01 on its own surface. It commits a lock of record (`ocx.lock`), gates staleness in CI (`README.md:48`, `ocx lock --check`), and its failure hint says "run 'ocx lock' and commit" (`ocx.cmake:428,961-962`). That is stricter than anything vcpkg offers.
- Per map conflict 24, shipped text uses this only as an anonymised, portable pattern ("an explicit lock, verified in CI, regenerated by a command"), and never positions it against `tool_requires` or `"host": true` (the provisioning table names "an external hash-verified provisioner").

**Satisfy:**
- CONAN-01/02/04/11: `catchorg__Catch2@222e233903:conanfile.py` (`CMakeDeps` at :93, `check_min_cppstd` at :80, `rmdir(lib/cmake)` at :106).
- CONAN-04/08: `friendlyanon__cmake-init@7e0c52fc73` (`templates/common/conanfile.py:6` `CMakeDeps`; `.gitignore:11` ignores `CMakeUserPresets.json`).
- CONAN-13/18/23 and the option-gated half of CONAN-15: `conan-io__conan-center-index@07389b8fa0:recipes/spdlog/all/conanfile.py` (`cmake_layout` at :65, conditional `self.info.clear()` at :72-74, `rmdir` of `lib/spdlog/cmake` at :161-163).
- CONAN-15 through the mixin: `…/recipes/trianglemeshdistance/all/conanfile.py:19,21-22`.
- CONAN-17: `…/recipes/b2/standard/conanfile.py:99-101`, `…/recipes/kcov/all/conanfile.py:43-45`.
- VCPKG-01/02: `friendlyanon__cmake-init@7e0c52fc73:cmake-init/templates/common/vcpkg.json:26,29`.
- VCPKG-01/03/06/08: `apache__arrow@3ad410b7b1`. Baseline and pinned root share one SHA (`cpp/vcpkg.json:61`, `.env:95`). The helpers are `host`. The triplets are `*-static-md` with a dynamic CRT. Caching uses `nuget`.
- VCPKG-04: `microsoft__vcpkg-tool@51bf87ca6e:CMakePresets.json:43`.
- VCPKG-12/13/14: `microsoft__vcpkg@c4ee5a52d7:ports/lmdb/portfile.cmake:25-28`.
- VCPKG-15: `…/ports/llfio/portfile.cmake:58-64`, `…/ports/zyre/portfile.cmake:28-35` (runtime derived from `VCPKG_CRT_LINKAGE`).
- VCPKG-16: `…/ports/3fd`, `…/ports/ryml`, `…/ports/tinyfiledialogs`.
- PKG-02: `microsoft__vcpkg@c4ee5a52d7:scripts/vcpkg-tool-metadata.txt` (the root pins the tool it bootstraps).
- PKG-03, partially: `aminya__project_options@412045e1f1:.github/workflows/ci.yml:62-70` names a provisioner per tool (`cmake: true`, `ninja: true`, `vcpkg: true`, `conan: true`) but pins no version.
- CONAN-07: cmake-conan's provider enforces its own 3.24 floor (`conan_provider.cmake:36`).

**Violate:**
- CONAN-01: `abseil__abseil-cpp@61d073d671:conanfile.py:8` (`from conans import ConanFile, CMake, tools`) and `:23` (`generators = "cmake"`). A flagship dual-build library's recipe cannot run under any Conan 2 client.
- CONAN-01: `conan-io__conan-center-index@07389b8fa0:recipes/crow/all/conanfile.py:1`, and 39 more of 2,002 recipe folders. `recipes/libui/all/` is the sample's example, test package included (CONAN-22).
- CONAN-03: `…@07389b8fa0:recipes/at-spi2-atk/all/conanfile.py:58` (`self.build_requires("meson/1.1.1")`), and 34 more recipe folders.
- CONAN-02: 24 CCI recipe folders set `cpp_info.names` with no `set_property`, so their target names are silently default under Conan 2. Another 246 carry dead `names` beside `set_property`, for example `recipes/cli11/all/conanfile.py:94` next to `:90`; these are now "delete on edit", not "harmless".
- CONAN-16: 7 CCI recipes still call `self.info.header_only()` (crow, msgpack, cpp-taskflow, ios-cmake, jsonformoderncpp and the two diligentgraphics header ports), all also CONAN-01.
- CONAN-15: 8 of 532 `header-library` recipes clear nothing (e.g. `recipes/hfsm2/all/conanfile.py:21-23`).
- CONAN-09 (APP pattern): 0 of 46 repos commit a `conan.lock`. CCI's template range `openssl/[>=1.1 <4]` (`…/cmake_package/all/conanfile.py:65`) is correct *for a recipe*, and becomes the finding when an application copies it.
- VCPKG-01: `aminya__project_options@412045e1f1:tests/{minimal,rpi4-vcpkg,emscripten}/vcpkg.json`. These are test fixtures, so a real but low-stakes violation.
- VCPKG-01: `apache__arrow@3ad410b7b1:dev/tasks/vcpkg-tests/github.windows.yml:50` clones vcpkg HEAD unpinned. The manifest baseline still pins the port versions, but the tool itself floats. That is a VCPKG-01 "best practice" miss and a PKG-02 finding, not a VCPKG-01 MUST breach.
- VCPKG-12: `microsoft__vcpkg@c4ee5a52d7:ports/rpclib/portfile.cmake:7` and 16 more.
- VCPKG-18: 675 portfiles hand-roll the copyright file, e.g. `…/ports/console-bridge/portfile.cmake`.
- PKG-02 and PKG-04: `boostorg__boost@a61cfa03ba:.github/workflows/ci.yml:372-386` (runner-image `C:\vcpkg`, classic mode, installed tree cached under a constant key, install skipped on a hit).
- VCPKG-06 mechanism: the vcpkg dive's own reading of `microsoft__vcpkg@c4ee5a52d7:scripts/toolchains/windows.cmake:3` was a mis-scoped citation, and this consolidation corrects it (see Conflicts).

**New commitments (no exemplar practises them yet):**
- CONAN-10's configure-output grep, since the watch line is invisible to the configure gate.
- CONAN-09's explicit `--lockfile=` in CI, with 0 corpus adopters.
- VCPKG-09's `x-block-origin`, with 0 adopters.
- VCPKG-06's explicit runtime for static-CRT triplets, where the corpus has no consumer using `*-windows-static`.
- PKG-01's per-mechanism lock across a mixed tree; the 8 repos that mix `find_package` with a fetch were not re-checked (Open questions).

## AI-agent failure modes

Ranked by how often each bites. Frequency is judged from how much of each form is in training-era text and how much residue is still in the corpus. Items 13-19 were added in revision 3 and are ranked among themselves.

1. **Writes Conan-1 recipes** (`from conans import`, `generators = "cmake"`, `self.copy`, `cpp_info.names`). 40 live CCI recipes and abseil still carry them. Check: CONAN-01 and CONAN-02 greps.
2. **Uses `build_requires`** for tools, the older and more frequent term. Check: CONAN-03 grep.
3. **Recommends `x-gha`** for GitHub Actions caching (mid-2020s blog advice). Check: `grep -rn -e x-gha .github`, where empty = pass.
4. **Sets `CMAKE_CXX_STANDARD` or `CMAKE_MSVC_RUNTIME_LIBRARY` after `project()` in a Conan-built project**, or passes `-DCMAKE_CXX_STANDARD` expecting it to win. Check: CONAN-10's configure-output grep for `has been modified to`.
5. **Sets `VCPKG_TARGET_TRIPLET` or `CMAKE_TOOLCHAIN_FILE` in CMakeLists after `project()`**, where it silently does nothing. Check: VCPKG-04 line-number grep.
6. **Invents a vcpkg lockfile** (`vcpkg.lock`, or treats `vcpkg_installed/` as a lock), or promises drift-failing CI. Check: VCPKG-11 grep plus a read of generated prose.
7. **Reaches for `CMakeConfigDeps` first** as "the newer one" and then writes `find_package(X MODULE)`, or puts it in a recipe's `generate()`. Check: CONAN-04 and CONAN-05 greps.
8. **Makes the cmake-conan provider the default**, or registers it from CMakeLists. Check: `grep -rn -e conan_provider.cmake .`, where a hit in a `CMakeLists.txt` is the finding.
9. **Adds `conan.lock` without `--lockfile=` in CI**, or misses that an existing `conan.lock` in the directory silently constrains every `conan install`. Check: CONAN-09.
10. **Puts `overrides` or `overlay-ports` in a library's manifest** on the npm-`resolutions` mental model. Check: VCPKG-02 grep.
11. **Assumes vcpkg's consumer toolchain sets the MSVC runtime from the triplet**, or asserts the pre-2023 "`x86-windows` default" (host triplet since September 2023). Check: VCPKG-06 pair of greps.
12. **Calls vcpkg-artifacts "removed"** or `x-update-baseline` "stable", or claims vcpkg plugs into dependency providers or CPS. Check: reading heuristic on generated text against VCPKG-10 and VCPKG-11.
13. **Writes `self.info.header_only()`**, or trusts `package_type = "header-library"` to clear the package id. Check: CONAN-16 and CONAN-15 greps.
14. **Reaches for a pre-2021 vcpkg helper** (`vcpkg_configure_cmake`, `vcpkg_fixup_cmake_targets`), which still runs silently in an overlay. Check: VCPKG-13 grep.
15. **"Fixes" an LNK2038 by adding a constant `-DCMAKE_MSVC_RUNTIME_LIBRARY` to a port's `OPTIONS`**, which silently overrides the triplet. Check: VCPKG-15 grep.
16. **Adds `implements = [...]` and then also writes `package_id()` or `configure()`**, disabling the mixin without a word. Check: CONAN-14 and CONAN-15 greps.
17. **Caches `installed/` and skips `vcpkg install` on a cache hit**, or keys a ccache store on a whole-tree hash, copying "cache keys hash the inputs" from npm or pip. Check: PKG-04 greps.
18. **Quotes a "2025 ISO C++ survey" percentage** for Conan or vcpkg. The 2025 PDF has none. Check: Verdict 12.
19. **Bumps a working `>=1.53` `required_conan_version` to `>=2.0`** as a "fix", or adds `cpp_info.names` "for Conan 1 compatibility" to a new recipe. Check: CONAN-21 and CONAN-02.

## Conflicts resolved

1. **CMakeConfigDeps status.** `incubating.rst` says GA; the reference page and the 2.25.0 changelog say experimental. Decided: **experimental**. The conservative page governs, and it agrees with map conflict 21 and [cps-v] row 43.
2. **Which generator the rule recommends.** Map M-M-01 said "cmake-conan recommends CMakeConfigDeps"; the Conan dive said "CMakeDeps is the default"; the deps audit counted CMakeConfigDeps in 6 of 11 non-CCI conanfiles; the Conan dive said "no conanfile in the named repos declares CMakeConfigDeps". Re-measured at the 2026-09-26 SHAs: the dive's negative is wrong (14 files, all in cmake-conan), and the audit's 6/11 is cmake-conan-concentrated. Decided **by flow**: explicit flow uses CMakeDeps, provider flow uses CMakeConfigDeps (CONAN-04).
3. **Is a cppstd mismatch diagnosable?** The Conan dive measured "no diagnostic" against a hand-written stand-in toolchain that omitted Conan's `variable_watch`. Conan source at 2.32.0 has the watch (since 2.7.0). Re-measured with the rendered block on 3.31.12 and 4.4.2: it produces a STATUS line, exit 0, and is invisible to `-Werror=dev`. Two further silent cases were found: a `-D` that loses, and a feature raise. Decided: checkable by grepping configure output, not by the gate (CONAN-10).
4. **vcpkg MSVC runtime mechanism.** The vcpkg dive attributed the mismatch to `windows.cmake`'s non-FORCE cache entry. That file is the port-build chainload toolchain; the consumer's `vcpkg.cmake` sets nothing. The dive's conclusion (no configure diagnostic) survives, but the mechanism and the check change: a static-CRT triplet requires a project-set runtime, and this is mechanically checkable (VCPKG-06).
5. **vcpkg default triplet.** The dive said issue #12357 is still open and the default is still `x86-windows`. Measured: [#12357](https://github.com/microsoft/vcpkg/issues/12357) was closed 2021-04-13, and vcpkg-docs `commands/common-options.md:141` says releases from September 2023 default to the host triplet. The "never rely on the x86 default" rationale is dropped. Naming the triplet stays, for ABI visibility (VCPKG-06).
6. **"Conan Center is Conan-2-only."** The deps audit's 0/40 alphabetical sample said so. A whole-tree count at `07389b8fa0` finds 40 `from conans`, 35 `build_requires` and 270 `cpp_info.names` in 2,002 recipe folders. The whole tree beats the sample, so CCI is not an oracle for residue checks.
7. **vcpkg baseline counts.** The map had "6/209"; the dive had "6/3,248" and said the "four without are all project_options fixtures", contradicted by its own arrow row. Re-measured: 9 consumer manifests, 5 with a baseline, and the 4 without include arrow's CI manifest. Arrow's is reproducible through a pinned root, so VCPKG-01 widens to "baseline **or** pinned root".
8. **Malformed `VCPKG_BINARY_SOURCES`.** Map M-N-04 suspected a silent fallback to `files`. vcpkg-tool source says hard error, so no fallback rule ships.
9. **vcpkg-artifacts.** Frame correction 1 has it "retires after 2026-07-01"; the vcpkg dive measured it still present and patched at 2026-09-26. Decided: "announced, not executed" (VCPKG-10).
10. **Current vcpkg-tool.** The era re-check said 2026-07-27; the vcpkg dive said 2026-09-26. The Releases API re-fetched today confirms **2026-09-26**, published hours after the re-check ran. The registry root still bootstraps 2026-07-27 (PKG-02), which is where the re-check's number came from.
11. **Host dependencies "mandatory".** The vcpkg dive paraphrased the docs as mandatory; the docs say "should be marked". The row ships as SHOULD (VCPKG-03).
12. **Producer naming (dive CONAN-19) vs CONAN-02.** One rule stated twice. CONAN-02 keeps the text and gains the producer keys and "delete on edit"; the dive's number 19 is reserved. The open question "is the 246-recipe `names` residue removable?" is answered yes: CCI's Conan-1 remote froze on 2024-11-04.
13. **`auto_header_only` scope.** The recipe dive said an option-gated header-only recipe "must keep" a hand-written conditional. Conan 2.32.0 source applies the mixin to `options.header_only` as well as `package_type` (`methods.py:163-165`). Both forms are allowed (CONAN-15). Two measured traps were added: `package_type` alone clears nothing, and an own `package_id()` disables the mixin.
14. **`implements` floor.** The dive said the mixin arrived in "the 2.4 line"; the changelog puts it at **2.0.9** (PR #14320). CONAN-14 and CONAN-21 use 2.0.9.
15. **Recipe-author severities.** The dive shipped six MUSTs. CONAN-13 (a missing layout still builds), CONAN-17 (CCI says "advised" and "do not recommend") and CONAN-21 (a missing floor fails loudly) drop to SHOULD. CONAN-16 (measured `AttributeError`) and CONAN-23 (integrity, like `CMK-DEP-03`) stay MUST; CONAN-23 gains the googlesource exception after the whole-tree count found 5 hashless `conandata.yml` files.
16. **Port-author severities.** VCPKG-12 drops to SHOULD, because the guide itself says vcpkg normalizes hex case internally. VCPKG-14 drops to SHOULD, because the guide says "should", the same call as item 11.
17. **VCPKG-15 corpus claim.** The port dive said 0 portfiles set `CMAKE_MSVC_RUNTIME_LIBRARY`. The whole tree has 2, both derived from `VCPKG_CRT_LINKAGE`, so the rule now forbids only a constant. The dive's grep would have flagged both. The PIC half was dropped (0 users, no harmful direction measured), and the precedence was re-measured on 3.31.12 as well as 4.4.2.
18. **Copyright counts.** The dive's 91 hand-rolled portfiles counted only the literal path; 675 hand-roll without the helper, 588 through `RENAME copyright`. VCPKG-18's verify matches both forms.
19. **Overlays in dependency manifests.** The port dive said any manifest, including a dependency's, may declare `overlay-ports`. `vcpkg-configuration-json.md:10-13` says a dependency's configuration is ignored. VCPKG-02 now names overlays, and the empty-overlay recipe registers top-level only. Its "version must satisfy the graph" is also dropped, because overlays bypass versioning (`package-name-resolution.md:199`).
20. **"Deprecated helpers removed."** The port dive called them removed. They still ship in `scripts/cmake/` and run; only `vcpkg_apply_patches` warns. VCPKG-13 is a MUST for new or edited ports, like CONAN-03. It adds `vcpkg_build_msbuild` (0 users), and `vcpkg_copy_tool_dependencies` (48 users) as a SHOULD clause.
21. **vcpkg tool and registry pins (PKG-02).** The tool dive said the two release trains are independent, so the tool stays undetermined unless pinned separately. The registry root pins the tool it bootstraps (`scripts/vcpkg-tool-metadata.txt`). PKG-02 is rewritten: bootstrap from the pinned root, or pin a release, and never use a runner image's vcpkg.
22. **Cache-key severity (PKG-04).** The tool dive made the vcpkg half a MUST because a key without the compiler "restores binaries vcpkg would treat as ABI-distinct". vcpkg's binary cache is ABI-addressed, so it never uses them. The measured harm is boost's installed tree with install skipped on a hit. Rewritten and shipped as SHOULD.
23. **Dive SHAs.** The tool dive cited `aminya…@d386a62c58`, `boostorg…@cb94f33fcb`, `qt__qtbase@d95af8296a` and `apache__arrow@e0cf4184dd`. The corpus HEADs are `412045e1f1`, `a61cfa03ba`, `0ef5a8e9ca` and `3ad410b7b1`, and the cited lines match at those SHAs. Citations here use the corpus SHAs.
24. **Lock-of-record table (tool dive §2).** Its "6/209 manifests" is conflict 7's stale figure (9 manifests, 5 with a baseline), and its "`branch =` lets submodules float" contradicts map M-G-14 (closed as not a defect). PKG-01 uses the corrected facts.
25. **Supply-chain, ccache and survey rows (dive PKG-05..07).** These were CONSIDER rows, which this file does not keep; their numbers are reserved. "Do not gate on `conan audit`" is replaced by Verdict 12's neutral statement: experimental is a reason to pin the tool, not a ban.
26. **Port policy-knob rows (dive VCPKG-19, VCPKG-20).** Cut as low-yield. `CMK-DEP-15` owns the scoping rule; inside a port build, `3.5` is enough because `vcpkg_cmake_configure` passes no gate flag.
27. **`test_package` floor.** CONAN-22's template `cmake_minimum_required(VERSION 3.15)` meets `CMK-VER-02`'s `<min>...<max>` form. Decided: a CCI submission keeps the template line, and everything else follows `CMK-VER-02`.
28. **Map items (e) 7 and (e) 9.** (e) 7 is applied in place: VCPKG-06 gains the placement clause, and CONAN-10's static grep runs only on Conan legs. (e) 9 is applied: the CMK-PKG index cites `CMK-TC-02` and restates no ban.

## Open questions

**Owner decisions:**
- CONAN-04 auto-flip. Should the rule flip its default to `CMakeConfigDeps` as soon as a Conan changelog line says "stable" or "no longer experimental" (a re-check trigger in the depth file), or only by a new research round? Default: flip on the changelog line, with a dated edit.
- Upstream reports. abseil's Conan-1 `conanfile.py`, the 24 CCI names-only recipes and the 7 `header_only()` recipes are real upstream defects. Filing is an owner call; the default is not to file (this program files nothing, per the map's owner defaults).
- `unofficial-<name>` in CMK-INST. The port dive recommends a one-line cross-reference beside `CMK-INST-06`/`-07` ("a Config package for a library that ships none is named `unofficial-<name>` with `unofficial::<name>::` targets; vcpkg's convention, `CMK-VCPKG-14`"). That edit belongs to `cmake-consumable-library.md`. Default: add it in that file's next revision.

**Another round:**
- `package-managers/conan-measured-flows`. Mostly done by verify wave 2, which ran Conan 2.32.0 (and 2.27.0) from a scratch venv (`uv pip install conan==2.32.0`), so the "no Conan binary runs on the host" premise of map M-M-08 no longer holds. Still open: the provider's other four limits (build type, `find_program` ordering, non-mainstream compilers, toolchain-only settings) on 3.31.12 and 4.4.2.
- `package-managers/windows-abi-measurement`. On a Windows runner, does `x64-windows-static` with CMake's default runtime fail deterministically with LNK2038, and does a Conan profile runtime overridden after `project()` do the same? A constant runtime in a port's `OPTIONS` (VCPKG-15) should also be measured. VCPKG-06, VCPKG-15 and the runtime half of CONAN-10 rest on source reading and CMake precedence, not a link.
- `package-managers/manager-cache-restore` (narrowed from `manager-ci-caching`, whose key survey is done). Two measurements decide whether PKG-04 can become a MUST. (a) Does manifest-mode `vcpkg install` rebuild a package in a restored `vcpkg_installed` whose ABI hash changed, while classic mode keeps it? (b) Does Conan 2 resolve a version range from a restored cache without consulting remotes when `--update` is absent?
- `package-managers/dual-mechanism-locks`. Are both mechanisms locked in the 8 repos that reach one package through both `find_package` and a fetch (frame correction 6 names arrow, ccache, grpc, protobuf, curl, spdlog and vcpkg-tool)? This gives PKG-01 exemplars.
- The ISO C++ 2026 developer survey was not checked. If it publishes Q9/Q10-style percentages, it replaces the 2024 line in Verdict 12.

## Sub-artifacts

- [conan-cmake-integration.md](cmake-package-managers/conan-cmake-integration.md): Conan 2.32 generators, explicit flow versus provider, `tool_requires`, `conan.lock`, the CMakeToolchain presets skip rule, Conan-1 residue and workspaces. Its cppstd "no diagnostic" claim is superseded here (conflict 3).
- [vcpkg-manifests-and-caching.md](cmake-package-managers/vcpkg-manifests-and-caching.md): manifests, baselines, toolchain timing, triplet ABI variables, the binary- and asset-cache provider tables, vcpkg-artifacts status and the provider/CPS negative. Its MSVC-runtime mechanism and #12357 claims are superseded here (conflicts 4 and 5).
- [conan-recipe-authoring.md](cmake-package-managers/conan-recipe-authoring.md): the 40-recipe CCI sample, the template diff, the KB-H hook legend, `CPSDeps` and `[replace_requires]`. Its severities, the `implements` floor and the `auto_header_only` scope are superseded here (conflicts 13-15).
- [vcpkg-port-authoring.md](cmake-package-managers/vcpkg-port-authoring.md): the 40-port sample, helper and naming counts, the CRT-override measurement and the empty-overlay recipe. Its runtime and copyright counts, severities and overlay-scope claim are superseded here (conflicts 16-20).
- [tool-provisioning-and-supply-chain.md](cmake-package-managers/tool-provisioning-and-supply-chain.md): the trigger and provisioning tables, the cache-key survey, supply-chain status, the ISO survey read and the comparison ecosystems. Its PKG-02, PKG-04, lock table and SHAs are superseded here (conflicts 21-25).
- [scratch/conan-cmake-integration/](cmake-package-managers/scratch/conan-cmake-integration/): the Conan dive's stand-in toolchain measurement.
- [scratch/pm-consolidation/cppstd-watch/](cmake-package-managers/scratch/pm-consolidation/cppstd-watch/): this file's first measurement. It runs the rendered Conan 2.32.0 `CppStdBlock` in four modes on 3.31 and 4.4; re-run with `sh run.sh` from the lore worktree.
- [scratch/pm-rev3/](cmake-package-managers/scratch/pm-rev3/): revision 3's measurements. `conan/run.sh` (`ho1`-`ho4`: `header_only()`, the mixin, the mixin with `package_id()`, `package_type` alone; needs a Conan 2.32.0 venv), `crt/run.sh` (CRT `-D` vs toolchain cache on 3.31 and 4.4; run from the lore worktree), and `corpus/*.sh` (the whole-tree recounts).
- [verification-wave2.md](cmake-package-managers/verification-wave2.md): the verify-wave-2 ledger (every MUST and version claim, with the planted-violation run of each verification command). Its sources are in [scratch/verify-package-managers/](cmake-package-managers/scratch/verify-package-managers/).
- [verification-wave3.md](cmake-package-managers/verification-wave3.md): the verify-wave-3 ledger. It re-checks all 20 MUSTs and the version floors against revision 3, and runs each MUST's verification command on planted and clean fixtures. Its sources are in [scratch/verify-package-managers/w3/](cmake-package-managers/scratch/verify-package-managers/w3/).

## Key sources

1. [Conan changelog (develop2 raw)](https://raw.githubusercontent.com/conan-io/docs/develop2/changelog.rst): 2.0.9 `implements` (#14320), 2.14.0 `conan audit`, 2.25.0 CMakeConfigDeps experimental, 2.27.0 audit CVE info, 2.28.0 `build_requires` deprecated, 2.31.0 workspaces.
2. [cmakeconfigdeps.rst](https://raw.githubusercontent.com/conan-io/docs/develop2/reference/tools/cmake/cmakeconfigdeps.rst) and [cmakedeps.rst](https://raw.githubusercontent.com/conan-io/docs/develop2/reference/tools/cmake/cmakedeps.rst): experimental banner, no Find modules, build-context default.
3. [integrations/cmake.rst](https://raw.githubusercontent.com/conan-io/docs/develop2/integrations/cmake.rst) and the [cmake-conan README](https://raw.githubusercontent.com/conan-io/cmake-conan/develop2/README.md): explicit flow recommended; provider limits.
4. [lockfiles tutorial](https://raw.githubusercontent.com/conan-io/docs/develop2/tutorial/versioning/lockfiles.rst): implicit pickup, strictness, `--lockfile-out`/`--lockfile-clean`.
5. [conan/tools/cmake/toolchain/blocks.py@2.32.0](https://raw.githubusercontent.com/conan-io/conan/2.32.0/conan/tools/cmake/toolchain/blocks.py): `CppStdBlock` watch (320-340), `VSRuntimeBlock` (60-75).
6. [conan/tools/cmake/presets.py@2.32.0](https://raw.githubusercontent.com/conan-io/conan/2.32.0/conan/tools/cmake/presets.py) (307-311) and [conan/internal/model/cpp_info.py@2.32.0](https://raw.githubusercontent.com/conan-io/conan/2.32.0/conan/internal/model/cpp_info.py) (96).
7. Measurement: `sh .agents/research/cmake-package-managers/scratch/pm-consolidation/cppstd-watch/run.sh` on CMake 3.31.12 and 4.4.2. Results: `set20` wins with a STATUS line; `cli20` loses silently; `feature20` raises silently; all exit 0 under `-Werror=dev`.
8. [vcpkg-docs users/versioning.md](https://learn.microsoft.com/en-us/vcpkg/users/versioning): the Classic-mode fallback without a baseline, and minimum-version selection.
9. [vcpkg-docs reference/vcpkg-json.md](https://learn.microsoft.com/en-us/vcpkg/reference/vcpkg-json): overrides are top-level only, `default-features`, `host`, `license`.
10. [vcpkg-docs cmake-integration](https://learn.microsoft.com/en-us/vcpkg/users/buildsystems/cmake-integration): set before `project()`, `VCPKG_CHAINLOAD_TOOLCHAIN_FILE`, `VCPKG_PREFER_SYSTEM_LIBS` deprecated.
11. [vcpkg-docs reference/binarycaching.md](https://learn.microsoft.com/en-us/vcpkg/reference/binarycaching) and [users/assetcaching](https://learn.microsoft.com/en-us/vcpkg/users/assetcaching): provider stability table, `x-gha` removed, `x-block-origin`, the ABI hash input list (434-450).
12. Corpus reading `microsoft__vcpkg@c4ee5a52d7`: `scripts/buildsystems/vcpkg.cmake` (0 runtime references; `VCPKG_PREFER_SYSTEM_LIBS` at 54-57), `ports/vcpkg-cmake/vcpkg_cmake_configure.cmake:175-181,218,230-245`, `triplets/x64-windows-static.cmake:2`, `scripts/toolchains/windows.cmake:3`, `scripts/ports.cmake:6-8`, `scripts/vcpkg-tool-metadata.txt`.
13. [vcpkg-tool releases API](https://api.github.com/repos/microsoft/vcpkg-tool/releases) (2026-09-26 current) and [tag 2026-05-27](https://api.github.com/repos/microsoft/vcpkg-tool/releases/tags/2026-05-27) (the artifacts removal notice).
14. Corpus counts at `conan-io__conan-center-index@07389b8fa0`: 2,002 recipe folders, of which 40 use `from conans`, 35 `build_requires`, 270 `cpp_info.names` (24 without `set_property`), 2,515/6 files CMakeDeps/CMakeConfigDeps, and 0 `conan.lock`. Revision 3 adds 7 `header_only()` calls, 178 `auto_shared_fpic`, 11 `auto_header_only`, 8 of 532 uncleared `header-library` recipes, 5 hashless `conandata.yml`, 56 recipes without `required_conan_version`, and 43 of 1,149 CMake-building recipes without `cmake_layout`.
15. [microsoft/vcpkg#12357](https://github.com/microsoft/vcpkg/issues/12357) (closed 2021-04-13) and [vcpkg-docs commands/common-options.md](https://learn.microsoft.com/en-us/vcpkg/commands/common-options) (host-triplet default since September 2023).
16. CCI maintainer docs at `07389b8fa0`: `README.md:32-34` (legacy remote frozen 2024-11-04), `docs/changelog.md:3-5`, `docs/adding_packages/conanfile_attributes.md:95-157`, `docs/adding_packages/dependencies.md:55-78`, `docs/package_templates/`.
17. Conan 2.32.0 source: `conan/internal/methods.py:95-165` (mixins run only without the matching method), `conan/internal/graph/compute_pid.py:104-112`, `conan/internal/api/install/generators.py:39` (`CPSDeps`); `conan/__init__.py` at 1.50.0 and 1.53.0 (the forward shim); [profiles.rst](https://raw.githubusercontent.com/conan-io/docs/develop2/reference/config_files/profiles.rst) `:443,548` (experimental sections).
18. [vcpkg maintainer guide (raw)](https://raw.githubusercontent.com/MicrosoftDocs/vcpkg-docs/main/vcpkg/contributing/maintainer-guide.md): deprecated helpers (182-195), lower-case hex (216-230), `unofficial-` (256-265), copyright (273-279), vendoring (398-416). Also [vcpkg-configuration-json.md](https://raw.githubusercontent.com/MicrosoftDocs/vcpkg-docs/main/vcpkg/reference/vcpkg-configuration-json.md) (10-13) and [package-name-resolution.md](https://raw.githubusercontent.com/MicrosoftDocs/vcpkg-docs/main/vcpkg/concepts/package-name-resolution.md) (197-209).
19. Measurements: `scratch/pm-rev3/conan/run.sh` on Conan 2.32.0 (`ho1` exit 1 `AttributeError`; `ho2` info cleared; `ho3` settings kept, no warning; `ho4` settings kept) and `scratch/pm-rev3/crt/run.sh` on CMake 3.31.12 and 4.4.2 (the `-D` wins, exit 0, 0 warnings).
20. ISO C++ 2024 Annual Developer Survey "Lite" PDF, Q9/Q10, and the 2025 "Lite" PDF (no percentage table), both read by the tool-provisioning dive.

## Revision log

- 2026-09-26, verify wave 2: CONAN-09 Verify. `-e '--lockfile='` missed `-l X` and `--lockfile X` and passed `--lockfile=""`, which switches the lock off. Replaced with a pairing of install lines against `--lockfile[= ]`/` -l `, plus a must-be-empty grep for `--lockfile=""` and `--lockfile-partial`. The rationale is now measured on Conan 2.32.0 and cites lockfiles.rst 98-144.
- 2026-09-26, verify wave 2: VCPKG-04 Verify matched reads such as `if(VCPKG_TARGET_TRIPLET …)` after `project()`, so it now greps for `set(VCPKG_`/`list(APPEND VCPKG_`. Floor: `toolchainFile` needs presets v3 (3.21), not 3.19. The silent no-op is measured on 3.31.12, 4.3.4 and 4.4.2.
- 2026-09-26, verify wave 2: VCPKG-06 Verify missed unquoted YAML triplets and `set(VCPKG_TARGET_TRIPLET x64-windows-static)`. Its `VCPKG_CRT_LINKAGE static` alternative could never hit, because no `*.cmake` include was given. Includes and patterns are widened; `*-static-md` is still excluded.
- 2026-09-26, verify wave 2: VCPKG-01 rationale. "Silent" holds only for constraint-free manifests. `version>=` or `overrides` without a baseline is a hard rejection at vcpkg-tool 2026-09-26 (measured).
- 2026-09-26, verify wave 2: VCPKG-05 rationale. "Last assignment wins" is replaced by the measured precedence: in one preset `toolchainFile` beats `cacheVariables`, and `-D` beats the preset.
- 2026-09-26, verify wave 2: VCPKG-08 rationale. `x-gha` warns and exits 0 at vcpkg-tool 2026-09-26, so the cache is lost silently; only unknown tokens are errors (both measured). Table lines are now 20-33, and `x-aws-config` is added.
- 2026-09-26, verify wave 2: Verdict 4 and CONAN-10. CMake 4.4 deprecates `-Werror=dev` for `-Werror=author`, and the watch line passes both. The measurement is re-run with Conan's full generated toolchain on 3.31.12, 4.3.4 and 4.4.2, and the `if(NOT DEFINED)` guard is added as a measured mode.
- 2026-09-26, verify wave 2: CONAN-05 citation moves from line 80 to line 79, plus a measured Find-module negative.
- 2026-09-26, verify wave 2: CONAN-07. The provider's supported set is the README's platform+compiler pairs (Windows+MSVC, Linux+gcc, Apple+clang), not "MSVC, gcc and clang".
- 2026-09-26, verify wave 2: CONAN-12. The 2.27.0 negated-OR patterns are a *profile* `[tool_requires]` feature (PR #19780).
- 2026-09-26, verify wave 2: Applied/Violate. The arrow unpinned clone is relabelled VCPKG-04 → VCPKG-01, and the CCI template range citation moves from :64 to :65.
- 2026-09-26, verify wave 2: Open questions. The `conan-measured-flows` premise ("no Conan binary runs on the host") is false, because Conan runs from a scratch venv. The item is narrowed to the provider's four unmeasured limits.
- 2026-09-26, revision 3: frontmatter adds `CMK-PKG`, the three wave-3 dives, verification-wave2, the M-L/M-F-16 rows and map items (e) 6, 7 and 9, plus `revised:`. Why: this round folds the dives it commissioned.
- 2026-09-26, revision 3: CONAN-02 text changed in place. It gains the producer keys and "never add; delete on edit", with the frozen-remote evidence. Why: the recipe dive answered the removability question, and its candidate 19 restated this rule (conflict 12).
- 2026-09-26, revision 3: CONAN-04 gains "a recipe's `generate()` and `test_package` use `CMakeDeps`" and binds RCP. Why: the CCI template at `07389b8fa0` settles the producer side (template line cite corrected from :87-93 to :94-98).
- 2026-09-26, revision 3: CONAN-09 exemption cross-references CONAN-20 and PKG-01. CONAN-10 Verify runs the static grep only on Conan legs. CONAN-11 cites the 31-of-40 sample. Why: new neighbours, and map item (e) 7.
- 2026-09-26, revision 3: new CONAN-13, 14, 15, 17, 18, 20, 21, 22, 24 (SHOULD) and CONAN-16, 23 (MUST), as Check F; CONAN-19 reserved. Why: M-M-06, M-M-09 and M-M-12 are answered. The severities are re-graded (conflict 15), and the `ho1`-`ho4` Conan 2.32.0 measurements and the 2.0.9 `implements` floor are added (conflicts 13, 14).
- 2026-09-26, revision 3: VCPKG-02 text changed in place. It now covers `overlay-ports` and quotes `vcpkg-configuration-json.md:10-13`. Why: the port dive's "any manifest may declare overlays" contradicted the docs (conflict 19).
- 2026-09-26, revision 3: VCPKG-03 cross-references VCPKG-13. VCPKG-07 cites the ABI hash input list. VCPKG-08 points to PKG-04. Why: new neighbours and a fresh normative source.
- 2026-09-26, revision 3: VCPKG-06 gains the placement clause (preset `cacheVariables` or before the first `project()`) and a pointer to VCPKG-15. Why: map item (e) 7.
- 2026-09-26, revision 3: VCPKG-10 rationale is measured (`vcpkg.cmake:54-57` still warns, no removal date), and the rule gains the empty-overlay-port recipe with top-level registration and the no-versioning note. Why: M-N-09, and conflict 19.
- 2026-09-26, revision 3: new VCPKG-12, 14, 16, 17, 18, 21 (SHOULD) and VCPKG-13, 15 (MUST), as Check F; VCPKG-19 and 20 reserved. Why: M-N-07 and M-F-16 are answered. The severities, counts and the VCPKG-15 scope are corrected (conflicts 16-18, 20, 26), and the CRT precedence is re-measured on 3.31.12.
- 2026-09-26, revision 3: new CMK-PKG section with the two trigger tables, PKG-01 (MUST), PKG-02, 03, 04 (SHOULD); PKG-05..07 reserved. Why: M-L-01, 03, 04 and 06 are answered. PKG-02 and PKG-04 are rewritten because the dive's mechanism was wrong (conflicts 21, 22), and the lock table and SHAs are corrected (conflicts 23, 24).
- 2026-09-26, revision 3: Verdict 1, 3, 5, 6, 7, 8 and 9 are extended. Verdicts 10-12 are new, carrying the documented gaps: no Conan recipe linter, `compatibility()` unadopted, no vcpkg port linter, vendoring ungreppable, Conan cache keys uncalibrated, 2026 survey unchecked. Why: this round settled them.
- 2026-09-26, revision 3: Open questions. `conan-recipe-authoring` and `vcpkg-port-authoring` are removed as answered. `manager-ci-caching` is narrowed to `manager-cache-restore`. `dual-mechanism-locks`, the 2026 survey and the owner call on the CMK-INST `unofficial-` cross-reference are added. Why: answered, narrowed or newly found.
- 2026-09-26, revision 3: MUST count moves from 15 to 20 (CONAN-16, CONAN-23, VCPKG-13, VCPKG-15, PKG-01). AI failure modes 13-19 are added, and 7 and 10 are widened. Why: the new rules.
- 2026-09-26, verify wave 3: CONAN-09 Verify. The must-be-empty grep missed a bare `--lockfile= ` (planted `conan install . --lockfile= --build=missing` stayed green, and the pairing grep counted it as passing a lock). It now also matches `--lockfile= ` and `--lockfile=$`. The lock-off behaviour was re-measured on Conan 2.32.0.
- 2026-09-26, verify wave 3: CONAN-23 text, rationale and Verify. There is a second exception: a git source with a full `commit` hash via `Git(self).fetch_commit` (`gnu-config`, 1 of the 5 hashless files). The other 4 are googlesource `+archive`, and one of those names a tag, not a commit. The Verify missed a planted hand-written `download(self, "https://…", …)` with no hash, so a literal-URL `download`/`get` grep is added (1 hit in CCI, which is clean).
- 2026-09-26, verify wave 3: VCPKG-13 text and Verify. The rule gains the guide's deprecated `vcpkg_extract_source_archive` overload without `ARCHIVE` (0 registry users), with a grep that goes red on a planted `vcpkg_extract_source_archive(${ARCHIVE})`. The rationale adds the `FATAL_ERROR` guards of `vcpkg_configure_cmake`, `vcpkg_build_cmake` and `vcpkg_install_cmake` beside `vcpkg-cmake`. The file count changes from "six CMake-family files" to "all seven files".
- 2026-09-26, verify wave 3: VCPKG-15 Verify. The per-file pairing missed a planted constant `-DCMAKE_MSVC_RUNTIME_LIBRARY=MultiThreaded` in a portfile that mentions `VCPKG_CRT_LINKAGE` for something else. A read step is added for files in both lists; on the registry these are `llfio` and `zyre`, both clean.

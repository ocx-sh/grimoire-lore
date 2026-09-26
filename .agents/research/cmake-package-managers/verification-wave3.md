---
title: "Verify wave 3: cmake-package-managers.md (Conan 2 and vcpkg at the CMake seam)"
verifies: .agents/research/cmake-package-managers.md
model: opus
date: 2026-09-26
---

# Verify wave 3: cmake-package-managers.md

Revision 3 of the consolidation was re-checked on 2026-09-26. The run covered all 20 MUST rules and every version floor or "tool X.Y does Z" claim, and it tried to refute each one. The measuring tools were:

- **Conan 2.32.0**, from the verify-wave-2 venv (`uv pip install conan==2.32.0`) with an offline local cache.
- **vcpkg-tool 2026-09-26**, the release binary `vcpkg-glibc` downloaded again, which prints `2026-09-26-51bf87ca6e9bf3e622d84ff323bd202ab1ca0c0b`, plus the wave-2 bundle root.
- **CMake 3.31.12, 4.3.4 and 4.4.2**, through `ocx package exec kitware/cmake:{3.31,4.3,4.4}`, with ninja and `zig c++`.

The primary sources were fetched again today:

- the Conan changelog and docs pages, raw from `develop2`;
- Conan source at the tags 2.0.0, 2.6.0, 2.7.0, 1.49.0, 1.50.0 and 1.53.0, and the installed 2.32.0 package;
- the vcpkg-docs raw pages;
- the GitHub Releases, commits and issues APIs;
- CMake `Help/manual/cmake-presets.7.rst` at v3.19.0 through v3.23.0, `Help/dev/experimental.rst` at v4.3.0 and v4.4.0, and the local `cmake --help-*` output;
- the ISO C++ 2024 "Lite" survey PDF.

Corpus reads are at `conan-io__conan-center-index@07389b8f`, `microsoft__vcpkg@c4ee5a52` and `conan-io__cmake-conan@b159384`.

Scratch sources are copied to `scratch/verify-package-managers/w3/`. The wave-2 scripts that were re-run are in `scratch/verify-package-managers/` and `scratch/pm-rev3/`. Build trees and caches stay under `/home/mherwig/.cache/cmake-measure-scratch/verify-package-managers/`.

**Result: 83 claims checked. 75 are CONFIRMED, 5 CORRECTED and 3 UNVERIFIABLE.** Every correction is to a MUST rule, and three of them fix a verification command:

- CONAN-09 stayed green on a planted bare `--lockfile= `.
- CONAN-23 stayed green on a planted unhashed `download()`, and its exception text was too narrow for the corpus.
- VCPKG-15 stayed green on a planted constant runtime in a portfile that also mentions `VCPKG_CRT_LINKAGE`.

VCPKG-13 also left out one deprecated form that the maintainer guide lists. No floor, severity or MUST count changes.

## Ledger

| # | ID or claim | verdict | evidence | note |
|---|---|---|---|---|
| 1 | Conan 2.32.0 is current (2026-08-31) | CONFIRMED | Releases API: `2.32.0` 2026-08-31T11:21:25Z; previous 2.31.2 | |
| 2 | vcpkg-tool 2026-09-26 is current (06:19Z), one release after 2026-07-27 | CONFIRMED | Releases API: `2026-09-26` 2026-09-26T06:19:05Z, then `2026-07-27` 2026-07-28T00:56:13Z; the binary prints `2026-09-26-51bf87ca6e…` | Supersedes the era re-check's row (conflict 10 holds) |
| 3 | vcpkg registry 2026.07.29 | CONFIRMED | Releases API: `2026.07.29` 2026-07-31T23:15:56Z | |
| 4 | cmake-conan `develop2` HEAD `b1593849dd` (2026-06-05) | CONFIRMED | commits API: `b1593849dd` 2026-06-05T21:47:00Z | |
| 5 | Registry root pins tool `2026-07-27` (PKG-02, Verdict 5) | CONFIRMED | `microsoft__vcpkg@c4ee5a52:scripts/vcpkg-tool-metadata.txt:1` `VCPKG_TOOL_RELEASE_TAG=2026-07-27`, with per-platform SHA512s | |
| 6 | CONAN-01 (MUST): `conans/__init__.py` is 0 bytes at 2.32.0, so a Conan-1 import dies | CONFIRMED | Installed 2.32.0: `wc -c` gives 0; `python -c "from conans import ConanFile"` gives `ImportError: cannot import name 'ConanFile' from 'conans'` | Floor 2.0: the 2.0.0 `conans/__init__.py` holds only constants and `__version__` |
| 7 | CONAN-01/21: Conan 1.50.0 and 1.53.0 ship a forward `conan` package that re-exports `ConanFile` | CONFIRMED | `conan/__init__.py`@1.50.0 and @1.53.0: `from conans.model.conan_file import ConanFile` | 1.49.0 has it too |
| 8 | CONAN-01 Verify: empty = pass | CONFIRMED | Red on wave-2 `bad` (2 lines), green on `good`, `bad2` and `good2` | |
| 9 | CONAN-02 (MUST): `cpp_info.names` is a `MockInfoProperty` (`cpp_info.py:96`) | CONFIRMED | 2.32.0 `conan/internal/model/cpp_info.py:96` `self.names = MockInfoProperty("cpp_info.names")` | |
| 10 | CONAN-02: CCI's legacy remote froze on 2024-11-04 (`README.md:34`), and CI is Conan-2-only (`docs/changelog.md:3-5`) | CONFIRMED | `07389b8f:README.md:34` "stopped receiving updates on 4 November 2024 and is frozen"; `docs/changelog.md:3-6` "Conan 1.x end of support … New CI infrastructure for Conan 2.x only" | |
| 11 | CONAN-02: 24 CCI recipes are names-only | CONFIRMED | The rule's own pipeline over `recipes/`, excluding test packages, gives 24 | 276 files also carry `names` or `filenames` |
| 12 | CONAN-02 Verify: non-empty = finding | CONFIRMED | Red on `bad`. A dead `names` beside `set_property` (`bad2/recipes/bar`) is green on the MUST and appears in the candidate list, as the rule says | |
| 13 | CONAN-03 (MUST): `build_requires` is deprecated in 2.28.0 (#19849); `tool_requires` exists since 2.0 | CONFIRMED | changelog: 2.28.0 "Deprecate ``build_requires``" #19849. Re-measured: 2.32.0 prints `WARN: deprecated: build_requires is deprecated`. `ToolRequirements` is in `conans/model/requires.py:394`@2.0.0 | |
| 14 | CONAN-03 Verify: empty = pass | CONFIRMED | Red on `bad` (1), green elsewhere; `def build_requirements` does not match | |
| 15 | CONAN-05 (MUST): CMakeConfigDeps writes no `Find*.cmake` (`cmakeconfigdeps.rst:79`) | CONFIRMED | Line 79 on `develop2` is verbatim. Re-measured (`proj/gen2.sh`): with `cmake_find_mode` both, CMakeDeps writes `FindGamma.cmake` and CMakeConfigDeps writes only `GammaConfig*.cmake` | |
| 16 | CONAN-04/05 floor: CMakeConfigDeps needs 2.25.0 and is experimental at 2.32.0 | CONFIRMED | rst:6 includes `experimental_warning.inc`; rst:9 "available as experimental from Conan 2.25"; changelog 2.25.0 #19421 "from incubating to experimental". Re-measured: `WARN: experimental: CMakeConfigDeps is experimental` | `incubating.rst:14` still says "generally available" (conflict 1 holds) |
| 17 | CONAN-05 Verify: a hit naming a Conan package = finding | CONFIRMED | Red on `bad` (`find_package(ZLIB MODULE REQUIRED)`), green elsewhere | |
| 18 | CONAN-06 (MUST): under CMakeDeps a `tool_requires` gets no config files unless it is activated; floor 2.0 | CONFIRMED | `cmakedeps.rst:117`. Re-measured (`proj/gen.sh`): 0 `tool*` files by default, 5 when activated, 4 under CMakeConfigDeps. `build_context_activated` and `build_context_suffix` are in `cmakedeps.py:24,29`@2.0.0 | Reading heuristic: `bad` 0 lines, `good` names it |
| 19 | CONAN-09 (MUST): implicit lock pickup, strict resolution, `--lockfile=` off, `--lockfile-partial` relaxes | CONFIRMED | Re-ran `proj/lock.sh` on 2.32.0. Implicit pickup kept `tool/1.0`; `--lockfile=` resolved `tool/1.1`; the missing requirement gave `ERROR: Requirement 'pkgb/1.0' not in lockfile 'requires'`; `--lockfile-partial` gave exit 0 | |
| 20 | CONAN-09 Verify: the must-be-empty grep catches a lock switched off | CORRECTED | Planted `conan install . --lockfile= --build=missing` (`bad2`). The pairing grep counted it as passing a lock, and the must-be-empty grep (`--lockfile=""`, `--lockfile=''`, `--lockfile-partial`) gave 0 lines, so it stayed green | Adds `-e '--lockfile= ' -e '--lockfile=$'`. Now red on `bad2` and `bad`, green on `good` and `good2` |
| 21 | CONAN-10 (MUST): a later `set()` wins with one STATUS line, `-D` silently loses, `cxx_std_20` silently raises, the guard keeps 17, and every case exits 0 | CONFIRMED | Re-ran `cppstd/run.sh` (Conan 2.32.0's full generated toolchain) on 3.31.12, 4.3.4 and 4.4.2. The results were the same on all three: set20 `-std=c++20` with 1 line; guarded20 `-std=c++17` with 0; feature20 `-std=c++20` with 0; cli20 `-std=c++17` with 0; all rc 0 | |
| 22 | CONAN-10: 4.4 renames `-Werror=dev` to `-Werror=author`, and the watch line passes both | CONFIRMED | 4.4.2: "The error=dev option is deprecated.  Use -Werror=author instead."; with `-Werror=author`, rc 0 and 1 watch line | |
| 23 | CONAN-10: the watch exists from Conan 2.7.0 | CONFIRMED | `conan_modify_std_watch` appears 0 times at 2.6.0 and 3 times at 2.7.0; in 2.32.0 it is at `blocks.py:328,338` | 2.8 to 2.31 are inferred |
| 24 | CONAN-10 static Verify | CONFIRMED | `bad` gives 1 line (`set` after `project`); `good`'s 2 lines are cleared by reading (guarded, and a vcpkg-branch runtime) | |
| 25 | CONAN-16 (MUST): `self.info.header_only()` is an `AttributeError`; floor 2.0 | CONFIRMED | Re-ran `pm-rev3/conan/run.sh`: `ho1` rc 1, `AttributeError: 'ConanInfo' object has no attribute 'header_only'`. `conans/model/info.py`@2.0.0 has `clear()` and no `header_only` | |
| 26 | CONAN-16: 7 CCI recipes call it, all Conan-1 | CONFIRMED | The rule's pattern gives 7 lines in 7 recipes; `xargs -r grep -L -e "from conans"` over them is empty | Without the comment filter it gives 8 (`stlab:165` is commented out) |
| 27 | CONAN-16 Verify: empty = pass | CONFIRMED | Red on `bad2` (1), green on `good2`, which has the call only in a comment plus `self.info.clear()` | |
| 28 | CONAN-23 (MUST): an entry without a hash makes `get()` accept anything | CONFIRMED | 2.32.0 `conan/tools/files/files.py:97` `def get(…, sha256=None…)` and `:181` `download(…, sha256=None)`: a hash is checked only when one is passed | |
| 29 | CONAN-23: "the only exception is googlesource `+archive`"; "at least `libyuv`" | CORRECTED | Of the 5 hashless `conandata.yml` files, 4 are googlesource `+archive` (gn, libyuv, depot_tools, linux-syscall-support). The fifth, `gnu-config`, is a git URL plus `commit:`, fetched with `Git(self).fetch_commit(...)` (`recipes/gnu-config/all/conanfile.py:30-31`). `linux-syscall-support` `2022.10.12` names a tag, not a commit | Rule text gains the git-commit exception; rationale names all 5 |
| 30 | CONAN-23 Verify covers "never a hand-written unchecked download" | CORRECTED | Planted `download(self, "https://…", "foo.tgz")` with a hashed-looking layout (`bad2`): the `conandata.yml` grep does not look at `conanfile.py`, so the planted violation stayed green | Adds a literal-URL `download`/`get` grep, read for `sha256=`: red on `bad2`, green on `good2`, 1 CCI hit (`cryptopp-pem:73`, hashed at `:75`) |
| 31 | VCPKG-01 (MUST): Classic-mode fallback (`versioning.md:117`); `version>=` and `overrides` without a baseline are rejected; a constraint-free manifest goes ahead silently | CONFIRMED | Line 117 ends "…Classic mode algorithm and ignores all versioning information." Re-ran with vcpkg-tool 2026-09-26: "rejected because it uses "version>=" …" and "… uses "overrides" …"; a plain `["foo"]` manifest went on to compiler detection with no versioning message | |
| 32 | VCPKG-01 corpus: 9 consumer manifests, 5 with a baseline | CONFIRMED | Recount over the 44 non-vcpkg repos: project_options 5 (2 with), arrow 3 (2 with), cmake-init 1 (with) | |
| 33 | VCPKG-01 Verify | CONFIRMED | `bad` lists 2; `good` lists only `lib/vcpkg.json`, which the top-level reading clears | |
| 34 | VCPKG-02 (MUST): transitive `overrides` and a dependency's `vcpkg-configuration.json` are ignored | CONFIRMED | `vcpkg-json.md:223`; `vcpkg-configuration-json.md:10-13`, verbatim | |
| 35 | VCPKG-02: overlays come only from the CLI, the top-level configuration and the environment, in that order, and bypass versioning | CONFIRMED | `package-name-resolution.md:199` "considered before any registry lookups, or versioning considerations"; the order list at `:201-209` | |
| 36 | VCPKG-02 Verify | CONFIRMED | Red on `bad` (`overrides` in `lib/vcpkg.json`), green elsewhere | |
| 37 | VCPKG-04 (MUST): a `VCPKG_*` set after `project()` is a silent no-op | CONFIRMED | `cmake-integration.md:43`. Re-ran `vcpkg/timing/run.sh` (bundle `vcpkg.cmake`) on 3.31.12, 4.3.4 and 4.4.2: before or `-D` found `arm64-linux`, after found `x64-linux`, all rc 0 | Fixture restored from the lore scratch copy |
| 38 | VCPKG-04 floors: `cacheVariables` presets v1 (3.19), `toolchainFile` v3 (3.21) | CONFIRMED | `cmake-presets.7.rst`: v3.19.0 "the only supported version is 1"; v3.21.0 adds 3; `toolchainFile` 0 mentions at v3.19.0 and v3.20.0, 1 at v3.21.0 | |
| 39 | VCPKG-04 Verify | CONFIRMED | `bad` has `set(VCPKG_` on line 3 after `project(` on line 2, which is red. `good` has it before `project(`, which is green. `bad2` and `good2` have no writes | |
| 40 | VCPKG-05 (MUST): one toolchain loads; a preset's `toolchainFile` beats its `cacheVariables`, and `-D` beats the preset | CONFIRMED | Re-ran `tcprec/run.sh` on 3.31.12, 4.3.4 and 4.4.2: "both" loads A only; `cv` plus `-D` loads B only | |
| 41 | VCPKG-05 Verify | CONFIRMED | `bad`: 2 distinct values plus a `conan_toolchain.cmake` hit, red. `good`: 1 value, 0 conan hits, green | |
| 42 | VCPKG-06 (MUST): the consumer `vcpkg.cmake` never sets the runtime; `windows.cmake:3` is the port chainload; `x64-windows-static.cmake:2` is CRT static | CONFIRMED | `c4ee5a52:scripts/buildsystems/vcpkg.cmake`: 987 lines, 0 `CMAKE_MSVC_RUNTIME_LIBRARY` or `VCPKG_CRT_LINKAGE`; `windows.cmake:3` `set(… CACHE STRING "")`; `x64-windows-static.cmake:2` `set(VCPKG_CRT_LINKAGE static)`; `vcpkg_cmake_configure.cmake:175-177` selects the chainload | |
| 43 | VCPKG-06/15: CMake's default is `MultiThreaded$<$<CONFIG:Debug>:Debug>DLL`; floor 3.15 (CMP0091) | CONFIRMED | 4.4.2 `--help-property MSVC_RUNTIME_LIBRARY` lines 48-49; 3.31.12 `--help-policy CMP0091` "introduced in CMake version 3.15" | |
| 44 | VCPKG-06 Verify | CONFIRMED | `bad`: first grep 3 lines, second 0, red. `good`: 1 and 1, green | |
| 45 | VCPKG-08 (MUST): table marks `x-gha` Removed and the rest Experimental; `x-gha` warns with exit 0; an unknown token is exit 1 | CONFIRMED | `binarycaching.md:20-33`; `x-gha` is at `:32`. Re-ran `vcpkg/binsrc.sh`: `x-gha,readwrite` rc 0 with "warning: The 'x-gha' binary caching backend has been removed"; `bogus,readwrite` rc 1 "unknown binary provider type" | The error text's provider list omits `x-cos`, `x-azcopy` and `x-az-universal`, but the parser accepts them (`binarycaching.cpp:2135,2238,2256`). Not a claim of the file |
| 46 | VCPKG-08 Verify | CONFIRMED | `x-gha` grep: red on `bad`, green elsewhere | |
| 47 | VCPKG-10 (MUST): artifacts removal *announced* 2026-05-27, not executed | CONFIRMED | 2026-05-27 release body: "Note that artifacts will be removed after July 1"; the 2026-09-26 release assets still include `vcpkg-artifacts.mjs`; `vcpkg-glibc help activate` still prints "Activates artifacts from a manifest" | |
| 48 | VCPKG-10: `VCPKG_PREFER_SYSTEM_LIBS` is deprecated, warns at `vcpkg.cmake:54-57`, and has no removal date | CONFIRMED | `c4ee5a52:scripts/buildsystems/vcpkg.cmake:54-57` is `option(… OFF)` plus `message(WARNING "… has been deprecated. Use empty overlay ports instead.")`; `cmake-integration.md:263` | |
| 49 | VCPKG-10 recipe: `VCPKG_POLICY_EMPTY_PACKAGE` "disables all post-build checks"; 166 `test_ports` files use it | CONFIRMED | `reference/policies.md:67-69`; `scripts/test_ports` count 166 | |
| 50 | VCPKG-10 Verify | CONFIRMED | Red on `bad` (`VCPKG_PREFER_SYSTEM_LIBS`), green elsewhere | |
| 51 | VCPKG-11 (MUST): no lockfile, provider or CPS; lowest-version selection | CONFIRMED | Bundle `vcpkg.cmake`: 0 `SET_DEPENDENCY_PROVIDER`/`PACKAGE_INFO`; the tag tree (2,461 paths, untruncated) has only internal `*provider*` files; `versioning.md:139`. A manifest install leaves `vcpkg.json` plus the install root and no lock | |
| 52 | VCPKG-11 Verify | CONFIRMED | Red on `bad` (`vcpkg.lock` in CI text), green elsewhere | |
| 53 | VCPKG-13 (MUST): the seven helpers are deprecated (`maintainer-guide.md:182-195`) with 0 users; `vcpkg_copy_tool_dependencies` has 48 users; the files still ship; only `vcpkg_apply_patches` warns; mixing `vcpkg_fixup_cmake_targets` with `vcpkg-cmake-config` is `FATAL_ERROR` | CONFIRMED | Guide lines 184-194. Corpus: `grep -rlw` gives 0, the SHOULD clause 48. All seven `scripts/cmake/*.cmake` exist. `z_vcpkg_deprecation_message` appears only in `vcpkg_apply_patches.cmake:2` and in the old extract overload. `vcpkg_fixup_cmake_targets.cmake:2-4` | Also `FATAL_ERROR`: `vcpkg_configure_cmake`/`build`/`install` beside `vcpkg-cmake` (`Z_VCPKG_CMAKE_*_GUARD`). Added to the rationale |
| 54 | VCPKG-13 covers the guide's deprecated list | CORRECTED | The guide also deprecates "the deprecated overload of `vcpkg_extract_source_archive()` without `ARCHIVE`" (`:187`), which the rule and its grep omitted. It has 0 users in 268 portfiles that call the function | Rule and Verify gain it; the new grep is red on a planted `vcpkg_extract_source_archive(${ARCHIVE})`, green on the `ARCHIVE` form |
| 55 | VCPKG-13 Verify (`-w`) | CONFIRMED | Red on `bad2/ports/foo` (3 helpers); green on `good2`, which has `z_vcpkg_apply_patches` in a comment | |
| 56 | VCPKG-15 (MUST): a command-line `-D` beats the chainload's non-`FORCE` cache entry silently | CONFIRMED | `w3/crt/run.sh` on 3.31.12, 4.3.4 and 4.4.2: none gives `RT=TOOLCHAIN_VALUE`; `-D` and `-D…:STRING` give `RT=CLI_VALUE`; rc 0 under `-Werror=dev`, 0 warnings, on all three | Adds 4.3.4 and the typed `-D` to rev 3's measurement |
| 57 | VCPKG-15: a port's `OPTIONS` and a triplet's `VCPKG_CMAKE_CONFIGURE_OPTIONS` reach the inner `cmake` as `-D` | CONFIRMED | `vcpkg_cmake_configure.cmake:220-229` appends `VCPKG_CMAKE_CONFIGURE_OPTIONS*` to `arg_OPTIONS*`; `:231-244` puts `${arg_OPTIONS}` on the `cmake` command line (`:218` prepends to the same list) | The file's `:218,230-245` covers these lines; no edit needed |
| 58 | VCPKG-15 corpus: 2 portfiles set the runtime, both derived from `VCPKG_CRT_LINKAGE` | CONFIRMED | `ports/llfio/portfile.cmake:58-64`, `ports/zyre/portfile.cmake:28-35` | |
| 59 | VCPKG-15 Verify catches a constant | CORRECTED | Planted `bad2/ports/baz`: a constant `-DCMAKE_MSVC_RUNTIME_LIBRARY=MultiThreaded` plus an unrelated `if(VCPKG_CRT_LINKAGE …)`. The per-file `grep -L` pairing skipped it, so it stayed green | Adds a read list (files in both greps). Red on `baz` by reading; on the registry it lists `llfio` and `zyre`, both clean |
| 60 | PKG-01 (MUST) corpus figures: 96.8 % of 6,957; 10 of 34; 21 of 64 | CONFIRMED | `cmake-audit/exemplar-deps-and-dual-build.md:62,180,459,469` | |
| 61 | PKG-01 cross-references (`CMK-DEP-01..03`, `-05`, `-06`, `CMK-TC-02`, `CMK-DEP-15`) | CONFIRMED | `cmake-dependency-seam.md:115,126,137,157,167,254,355` carry those IDs with the cited meaning | |
| 62 | PKG-01 Verify (mechanism detection) | CONFIRMED | `bad2` (a Conan range plus `FetchContent_Declare(… GIT_TAG main)`) detects both, so it routes to CONAN-09 and `CMK-DEP-01..03`. `good2` detects Conan only | The "rule not run" finding is procedural and cannot go red by grep |
| 63 | `implements` from Conan 2.0.9 (#14320) | CONFIRMED | changelog: 2.0.9 "Add `implements` attribute" #14320 | |
| 64 | `conan audit` is experimental from 2.14.0; CVE version info arrived in 2.27.0 | CONFIRMED | changelog: 2.14.0 #17951, 2.27.0 #19774; `reference/commands/audit.rst:6` includes `experimental_warning.inc` on `develop2` | Only the endpoints were read; "through 2.32.0" rests on the current page |
| 65 | Workspaces out of incubating at 2.31.0; `incubating.rst` says "generally available as experimental" | CONFIRMED | changelog: 2.31.0 #20202; `incubating.rst:22` | |
| 66 | CONAN-12: 2.27.0 negated-OR patterns in a profile's `[tool_requires]` (#19780) | CONFIRMED | changelog: 2.27.0 #19780 "in profile ``[tool_requires]``" | |
| 67 | CONAN-24: `CPSDeps` is registered in source only; `[replace_requires]` and `[platform_requires]` are experimental | CONFIRMED | 2.32.0 `generators.py:39` `"CPSDeps": "conan.tools.cps"`; the docs tree (`develop2`, untruncated) has 0 paths containing `cps`; `profiles.rst:443,548` include `experimental_warning.inc` | `:506` and `:598` (`replace_tool_requires`, `platform_tool_requires`) are experimental too |
| 68 | CONAN-07: the provider needs CMake 3.24 and Conan 2.0.5, and only warns on a missing generator | CONFIRMED | `conan_provider.cmake:23,36,593-599`@`b159384` | |
| 69 | CONAN-07: "recommended flow for most cases"; "extraordinary and exceptional scenarios"; five limits | CONFIRMED | `integrations/cmake.rst:43,45`; README "Known limitations" lists five items, supported pairs Windows+MSVC, Linux+gcc, Apple+clang | |
| 70 | CONAN-08: Conan skips a user presets file that lacks `vendor.conan`, and writes schema 4 | CONFIRMED | 2.32.0 `presets.py:305-312` (`"version": 4`, `"vendor": {"conan": …}`, early `return`) | |
| 71 | CONAN-08 floors: schema 3 needs 3.21, schema 4 needs 3.23 | CONFIRMED | `cmake-presets.7.rst` supported versions: v3.20.0 "1 and 2", v3.21.0 adds 3, v3.23.0 adds 4 | |
| 72 | CONAN-14/15: mixins run only in the `elif` after `hasattr`; `auto_header_only` covers `header_only` and `package_type`; a defined `package_id()` disables it | CONFIRMED | 2.32.0 `methods.py:99-115,163-165`; `compute_pid.py:107-112` | |
| 73 | CONAN-15 measurement (`ho2` cleared, `ho3` keeps settings, `ho4` keeps all) | CONFIRMED | Re-ran `pm-rev3/conan/run.sh`: `ho2` info `{}`; `ho3` keeps os, arch and compiler; `ho4` keeps everything including `build_type` | |
| 74 | VCPKG-19/20 note: `scripts/ports.cmake:6-8` exports `CMAKE_POLICY_VERSION_MINIMUM` 3.5 for CMake 4.0+; `vcpkg_cmake_configure` passes no `-Werror` | CONFIRMED | `ports.cmake:6-8` `if(CMAKE_VERSION VERSION_GREATER_EQUAL "4.0") set(ENV{CMAKE_POLICY_VERSION_MINIMUM} 3.5)`; 0 `Werror` in `vcpkg_cmake_configure.cmake` | |
| 75 | Verdict 12: CMake `install(SBOM)` sits behind `CMAKE_EXPERIMENTAL_GENERATE_SBOM` | CONFIRMED | Measured: without the gate, 3.31.12, 4.3.4 and 4.4.2 all say "install does not recognize sub-command SBOM". With the gate UUID documented at the tag (v4.3.0 `ca494ed3-…`, v4.4.0 `2d856d6d-…`), 4.3.4 and 4.4.2 print the experimental warning and parse the command | The UUID differs per minor; the file names only the variable, which is correct |
| 76 | Conflict 5: #12357 closed 2021-04-13; host-triplet default since September 2023 | CONFIRMED | Issues API `closed 2021-04-13T09:32:19Z`; `common-options.md:141` | |
| 77 | Verdict 12: vcpkg SPDX SBOM PURLs and gitoids arrive in 2026.07.29 | CONFIRMED | 2026.07.29 release body: "Emit a PURL in generated SPDX SBOMs" (vcpkg-tool #2049), "Add Git tree gitoids to SPDX SBOMs" (#2074) | |
| 78 | Verdict 12: ISO C++ 2024 "Lite" Q9/Q10 percentages | CONFIRMED | PDF text (pypdf): Q9 "Answered: 1,246", with Conan 19.34 % 241, Vcpkg 19.10 % 238 and system package managers 37.80 % 471. Q10 "Answered: 1,253", with CMake 83.24 % 1,043, Bazel 9.98 % 125 and Meson 5.99 % 75 | |
| 79 | VCPKG-07 and PKG-04: the ABI hash input list | CONFIRMED | `binarycaching.md:434-450`: port files, triplet contents and name, both compilers, features, dependency hashes, helper functions, CMake version, PowerShell, `VCPKG_ENV_PASSTHROUGH`, chainload text; no `include()`d-file item. `triplets.md:195-205,245-249` | Normative only; see row 83 |
| 80 | PKG-03: 35 of 46 repos install no CMake of their own | CONFIRMED | `cmake-audit/exemplar-deps-and-dual-build.md:430` "remaining 35" | |
| 81 | Verdict 12: the 2025 "Lite" PDF has no percentage table | UNVERIFIABLE | Not fetched this wave; the 2024 PDF was the only one read | Still rests on the tool-provisioning dive |
| 82 | VCPKG-06 / CONAN-10: a runtime mismatch surfaces only at link (LNK2038) | UNVERIFIABLE | The host has no MSVC or Windows linker | Open question `windows-abi-measurement` |
| 83 | VCPKG-07: the ABI hash ignores an `include()`d triplet file unless it is listed (measured side) | UNVERIFIABLE | vcpkg compiler detection fails on this host (`detect_compiler` exits 1, no system `c++`); not retried | The normative half is row 79 |

## Verification commands exercised

The fixtures are wave 2's `checks/{bad,good}` plus wave 3's `w3/checks/{bad2,good2}`, each a git repo. `bad2` plants these violations:

- a `header_only()` call;
- a hashless `conandata.yml` and a literal-URL `download()`;
- dead `names` beside `set_property`;
- the legacy vcpkg helpers, including the old extract overload;
- a constant runtime in two portfiles, one of which mentions `VCPKG_CRT_LINKAGE`;
- a bare `--lockfile= `;
- Conan plus `FetchContent_Declare(… GIT_TAG main)`.

`good2` holds the compliant form of each. The runner is `w3/checks/run.sh`, run with `bash` so that GNU grep runs the commands verbatim and the host's rtk hook does not rewrite them.

Counts are lines of output, in the order bad → good → bad2 → good2. "Red" means the command reported the planted violation in the way the rule says it reads.

- CONAN-01 (empty = pass): 2 → 0 → 0 → 0. Red on `from conans` and `generators = "cmake"`.
- CONAN-02 (non-empty = finding): 1 → 0 → 0 → 0. The candidate list gives 1 → 0 → 1 → 0; `bad2`'s dead `names` is listed for delete-on-edit and is not a MUST finding, as the rule says.
- CONAN-03 (empty = pass): 1 → 0 → 0 → 0.
- CONAN-05 (hit = finding): 1 → 0 → 0 → 0.
- CONAN-06 (reading; a name missing = finding): 0 → 1 → 0 → 0. `bad` has protobuf `tool_requires` and `find_package(protobuf)` with no activation.
- CONAN-09, as published: the range grep is 1 in every fixture. `git ls-files conan.lock` gives 0 → 1 → 1 → 1. The pairing grep gives 1 in every fixture. The must-be-empty grep gives 1 → 0 → **0** → 0: **`bad2`'s bare `--lockfile= ` stayed green**.
- CONAN-09, corrected: the must-be-empty grep with `-e '--lockfile= ' -e '--lockfile=$'` gives 1 → 0 → 1 → 0. Red on both lock-off spellings, green on `-l conan.lock` and `--lockfile=conan.lock`.
- CONAN-10, static: 1 → 2 → 0 → 0, and reading clears `good`. Dynamic: `has been modified to` gives 1 line on set20 and 0 on the other modes, on all three CMakes (ledger row 21).
- CONAN-16 (empty = pass): 0 → 0 → 1 → 0. `good2`'s commented call is not matched.
- CONAN-23, as published: `grep -rL` over `conandata.yml` gives 0 → 0 → 1 → 0. Red on the hashless file, but the planted literal-URL `download()` is not covered.
- CONAN-23, added: the literal-URL grep gives 0 → 0 → 1 → 0. Red on `download(self, "https://…"`, green on `get(self, **self.conan_data…)`. On CCI it gives 1 hit, which is cleared by its `sha256=`.
- VCPKG-01 (a listed top-level manifest = finding): 2 → 1 → 0 → 0. `good`'s entry is the library manifest, which reading clears.
- VCPKG-02 (hit = finding): 1 → 0 → 0 → 0.
- VCPKG-04 (a `set(VCPKG_` after `project(` = finding): `bad` is red (line 3 after line 2). `good` is green (line 2 before line 3). `bad2` and `good2` have `project(` only.
- VCPKG-05 (two values, or conan beside vcpkg = finding): the preset grep gives 2 → 1 → 0 → 0 and the conan grep 1 → 0 → 0 → 0.
- VCPKG-06 (first grep hits and second is empty = finding): the first grep gives 3 → 1 → 0 → 0 and the second 0 → 1 → 2 → 2. Red on `bad` and green on `good`. The `bad2` and `good2` hits are portfiles, which are VCPKG-15's scope.
- VCPKG-08 (empty = pass): 1 → 0 → 0 → 0.
- VCPKG-10 (empty = pass): 1 → 0 → 0 → 0.
- VCPKG-11 (empty = pass): 1 → 0 → 0 → 0.
- VCPKG-13, as published (empty = pass): 0 → 0 → 1 → 0. `-w` keeps `good2`'s `z_vcpkg_apply_patches` out.
- VCPKG-13, added old-overload grep (empty = pass): 0 → 0 → 1 → 0. Red on `vcpkg_extract_source_archive(${ARCHIVE})`, green on `(SOURCE_PATH ARCHIVE "${ARCHIVE}")`. On the registry it gives 0.
- VCPKG-15, as published (empty = pass): 0 → 0 → 1 → 0. It catches `ports/foo` but **misses `ports/baz`**, whose constant sits beside an unrelated `VCPKG_CRT_LINKAGE`.
- VCPKG-15, added read list: 0 → 0 → 1 → 1. `baz` is red by reading and `good2/foo` is cleared, because its runtime is inside the `VCPKG_CRT_LINKAGE` branch. On the registry it lists `llfio` and `zyre`, both cleared.
- PKG-01 detection: the Conan grep gives 2 → 1 → 1 → 1, the vcpkg grep 2 → 2 → 0 → 0, and the fetch grep 0 → 0 → 1 → 0. `bad2` routes to CONAN-09 and `CMK-DEP-01..03`; `good2` routes to CONAN-09 only.

The re-run measurement scripts, all run from the lore worktree, are:

- `scratch/verify-package-managers/cppstd/run.sh`, `tcprec/run.sh`, `vcpkg/timing/run.sh`, `proj/lock.sh`, `proj/gen.sh`, `proj/gen2.sh`, `vcpkg/binsrc.sh` and `vcpkg/nobase2.sh`;
- `scratch/pm-rev3/conan/run.sh`, with `CONAN=<venv>/bin/conan`;
- `scratch/pm-rev3/corpus/{checks,vc,vc2}.sh`;
- `scratch/verify-package-managers/w3/crt/run.sh`, `w3/corpus.sh`, `w3/corpus-fix.sh` and `w3/src.sh <site-packages>`.

## Unverifiable

- **The 2025 ISO C++ "Lite" PDF has no percentage table** (Verdict 12, failure mode 18). Not fetched this wave. Only the 2024 PDF was read, and its figures are confirmed (row 78).
- **LNK2038 at link** (VCPKG-06, and the runtime half of CONAN-10). There is no MSVC toolchain on the host. The mechanism is confirmed: `vcpkg.cmake` sets no runtime, CMake's default is the DLL runtime, and Conan's runtime `set()` has no watch. The link failure was not produced. This stays in the open question `package-managers/windows-abi-measurement`.
- **VCPKG-07, measured side.** A port build that would compare ABI hashes stops at vcpkg's compiler detection on this host. Only the documented input list (row 79) was checked.

Housekeeping: the permission policy refused an `rm -rf` of the leftover build trees. They are small, all under `/home/mherwig/.cache/cmake-measure-scratch/verify-package-managers/`: `w3/sbom/{b-3.31,b-4.3,b-4.4,g43,g44}`, `w3/b-author`, `w3/b-dev`, `w3/conanhome`, `cppstd/b-*`, plus the downloaded `vcpkg/vcpkg-glibc`. They are safe to delete.

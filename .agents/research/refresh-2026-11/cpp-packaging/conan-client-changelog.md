---
title: Conan 2 client delta since 2.32.0 for the cpp-packaging pair
pair: cpp-packaging
date_researched: 2026-11-27
window_start: 2026-09-26
model: sonnet
sources_fetched: 12
---

# Conan 2 client delta since 2.32.0

Verdict: two releases landed after the baseline, 2.33.0 and 2.34.0. Neither calls CMakeConfigDeps stable, so CMK-CONAN-04 does not flip. One claim changed (CMK-CONAN-24, the CPS docs page now exists). The gate should pin 2.34.0.

## Releases after the 2.32.0 baseline (2026-08-31)

Source: GitHub Releases API, api.github.com/repos/conan-io/conan/releases, cross-checked with changelog.rst on conan-io/docs develop2.

| Version | Date | In the 2026-09-26 to 2026-11-27 window? |
|---|---|---|
| 2.33.0 | 2026-09-29 | yes |
| 2.34.0 | 2026-10-28 | yes |

Nothing newer than 2.34.0 exists on 2026-11-27. 2.32.0 (2026-08-31) is the baseline, and no patch release (2.32.x, 2.33.x, 2.34.x) exists.

## Per-claim verdicts

Source key: CL = https://raw.githubusercontent.com/conan-io/docs/develop2/changelog.rst; SRC = conan-io/conan source at tag 2.34.0 (raw.githubusercontent.com/conan-io/conan/2.34.0/...), diffed against tag 2.32.0.

1. The Gate, "Conan 2.32.0 ... verified 2026-09-26": changed. New text: "Conan 2.34.0 ... verified 2026-11-27". Header of skills/cpp-packaging-reference/conan.md: "Written against Conan 2.34.0 (released 2026-10-28)". The claims below were re-read against 2.34.0 source, so the pin move is safe once the changed rows are applied.

2. The Gate severity, "CMakeDeps as the explicit-flow generator until a Conan changelog calls CMakeConfigDeps stable": unchanged. See CMK-CONAN-04.

3. CMK-CONAN-04 (CMakeConfigDeps status): unchanged, no flip. Evidence: docs reference/tools/cmake/cmakeconfigdeps.rst on develop2 still includes common/experimental_warning.inc ("This feature is experimental and subject to breaking changes") and says "available as experimental from Conan 2.25". The 2.34.0 source of conan/tools/cmake/__init__.py still warns "CMakeConfigDeps is now experimental". Changelog lines in the window only add features (2.33.0 cpp_info.sources-only packages, objects; 2.34.0 CMAKE_PREFIX_PATH fallback, cmake_file_names property, require-trait filtering), none says stable. Replace "moved ... still carries the experimental banner at 2.32.0" with "at 2.34.0". Decision: keep CMakeDeps; D2 auto-flip trigger has not fired. Re-check command: `curl -s https://raw.githubusercontent.com/conan-io/docs/develop2/reference/tools/cmake/cmakeconfigdeps.rst | grep -c experimental_warning` (non-zero means still experimental), plus `curl -s .../changelog.rst | grep -i "CMakeConfigDeps.*stable"`.
   Side note for the rule text: the docs now say fixes and new features land mainly in CMakeConfigDeps and the CMakeDeps page carries a note recommending trying it first. That is a trend signal, not a stability claim.

4. CMK-CONAN-05 (no Find modules): holds. cmakeconfigdeps.rst on develop2 still says: "it will not generate Find*.cmake find modules, and support for it is not planned. Use the CMakeDeps generator for that".

5. CMK-CONAN-03 (build_requires): holds. SRC conan/internal/model/conan_file.py is byte-identical between 2.32.0 and 2.34.0; it still has the class attribute `build_requires = None` and, when set, emits the warning "build_requires is deprecated, prefer to use tool_requires with correct traits". No changelog line in 2.33.0 or 2.34.0 removes build_requires from conanfile.py. The conanfile.txt parse-error part was not re-measured (the parser file was not diffed); mark "could not determine" for that sub-claim only, and treat it as unchanged since no changelog line mentions it. Re-measure: `uvx --from conan==2.34.0 conan install` against a conanfile.txt with a `[build_requires]` section.

6. CMK-CONAN-09 (lockfile flags): holds. SRC conan/cli/args.py identical between 2.32.0 and 2.34.0. It still defines `--lockfile-partial` ("Do not raise an error if some dependency is not found in lockfile"), `--lockfile-out`, `--lockfile-clean`, and the `--lockfile` help "Use --lockfile="" to avoid automatic use of existing 'conan.lock' file". The lockfiles tutorial (tutorial/versioning/lockfiles.rst) still documents --lockfile-partial, --lockfile-out and --lockfile-clean. One related changelog line: 2.33.0 "Do not inject a full lockfile due to export operations" (#19404). It concerns export, not install, so the install-exit-0 measurement is probably unchanged but was not re-run. Re-measure: in a scratch venv, `uv venv /tmp/c234 && uv pip install --python /tmp/c234/bin/python conan==2.34.0`, then repeat the CMK-CONAN-09 partial-lock install and check `echo $?`.

7. CMK-CONAN-10 (CppStdBlock watch and runtime block): holds. SRC blocks.py at 2.34.0: the watch function still calls `message(STATUS "Warning: Standard ... has been modified ...")`, no WARNING or FATAL_ERROR. The runtime block still does a plain `set(CMAKE_MSVC_RUNTIME_LIBRARY "{{ genexpr.str }}")` with no variable_watch. The only blocks.py diff between 2.32.0 and 2.34.0 is the /MP condition (clang-cl with Visual Studio generators; changelog 2.34.0 "Define /MP in CMakeToolchain for clang-cl"). The only FATAL_ERROR in the file is the CMP0091 policy check. Re-measure: `uv pip install conan==2.34.0` then generate a toolchain and `grep -n "WARNING\|FATAL_ERROR" conan_toolchain.cmake`.

8. CMK-CONAN-08 (presets writer): holds. SRC conan/tools/cmake/presets.py at 2.34.0 still has `if "conan" not in data.get("vendor", {}):` (lines 64 and 322). The diff against 2.32.0 only adds a `generator` argument to `_build_preset_fields` and a `_build_preset_jobs` helper (for Visual Studio generators the preset `jobs` now come from `tools.microsoft.msbuild:max_cpu_count`; changelog 2.34.0 "Use tools.microsoft.msbuild:max_cpu_count for the -m argument in CMakeToolchain Visual Studio presets"). New fact, not at risk to a claim: build presets under a Visual Studio generator no longer take `tools.build:jobs`.

9. CMK-CONAN-02 (cpp_info.names mock): holds. SRC conan/internal/model/cpp_info.py at 2.34.0: `self.names = MockInfoProperty("cpp_info.names")`, same for filenames and build_modules. Diff against 2.32.0 touches only aggregated_components and the loader lock, unrelated.

10. CMK-CONAN-16 (self.info.header_only()): holds. conan/internal/model/info.py is byte-identical between 2.32.0 and 2.34.0 and defines no header_only method. Re-measure: `uv pip install conan==2.34.0` and run a recipe calling `self.info.header_only()` in package_id().

11. CMK-CONAN-14 and CMK-CONAN-15 (mixins run only when the recipe lacks the matching method): could not determine for the behaviour itself, but no changelog line in 2.33.0 or 2.34.0 mentions package_id mixins or recipe mixin behaviour, and conan_file.py and info.py are unchanged. The loader.py diff is only a thread lock around invalidate_caches. Treat as unchanged; re-measure with the same scratch-venv command as above on the CONAN-15 fixture.

12. CMK-CONAN-23 (get/download hash): holds. SRC conan/tools/files/files.py has no diff between 2.32.0 and 2.34.0; signatures remain `get(conanfile, url, md5=None, sha1=None, sha256=None, ...)` and `download(..., md5=None, sha1=None, sha256=None)`.

13. CMK-CONAN-24 (CPSDeps and experimental banners): partly changed.
    - Old: "At Conan 2.32.0 CPSDeps exists in source only, with no docs page".
    - New: Conan docs gained an integrations page, integrations/cps.rst, "CPS (Common Package Specification)", added by docs PR #4585 "add cps information" on 2026-11-20. It carries the experimental banner and says "The CPS support in Conan is experimental ... can have breaking changes in future Conan versions. It requires CMake>=4.4". Source: https://raw.githubusercontent.com/conan-io/docs/develop2/integrations/cps.rst. The page documents CPS support generally; it is not a reference page for the CPSDeps generator class (source file conan/tools/cps/cps_deps.py exists at 2.34.0). Suggested replacement: "CPSDeps lives in conan/tools/cps; the docs gained an experimental-bannered integrations page on CPS on 2026-11-20 but no CPSDeps reference page, and the page says CMake>=4.4 is required." Also in the window: 2.33.0 "Support for CPS components configurations" and 2.34.0 "Support the new CPS dyld_requires (CMake>=4.4)". None declares it stable.
    - [replace_requires] and [platform_requires]: holds. profiles.rst on develop2 still includes common/experimental_warning.inc under both sections.

14. CMK-CONAN-12 ("Conan 2.27.0 added negated-OR patterns"): holds. CL: 2.27.0 (25-Mar-2026) "Allow negated OR patterns !(<pattern1>|<pattern2>|...) in profile [tool_requires] for breaking cycles in build context". Not reverted. Possible confusion to avoid: 2.34.0 adds an unrelated line, "Allow several negated patterns, and mixing them with inclusions, in remote --allowed-packages" (#20412), which is about remotes, not profile [tool_requires].

## Other 2.33.0 and 2.34.0 lines worth knowing (not claims at risk)

- 2.33.0: CMakeConfigDeps `get_cmake_file_name` returns a dict instead of a string (#20300), a breaking change inside an experimental API; Python 3.7 support removed (#20357).
- 2.34.0: `.ps1` launchers always generated alongside .bat/.sh; `tools.env.virtualenv:powershell` no longer replaces the .bat/.sh launchers (#19649); remote `[tool_requires]` from the host profile no longer installed when only `--tool-requires` is passed (#20422).

## Normative candidates

1. Gate pin moves to Conan 2.34.0 (verified 2026-11-27). Rationale: it is the newest release and every claim above was re-read against it. Verification: `curl -s "https://api.github.com/repos/conan-io/conan/releases?per_page=1" | grep tag_name` shows 2.34.0 until a newer release.
2. CMK-CONAN-24 text change as in item 13. Rationale: the "no docs page" fact is now false. Verification: `curl -sI https://raw.githubusercontent.com/conan-io/docs/develop2/integrations/cps.rst` returns 200; `grep -n "CPSDeps" reference/` finds no reference page.
3. No change to CMK-CONAN-04 other than the version number in its evidence sentence. Verification: the grep in item 3.

## Sources

| URL | What | Date |
|---|---|---|
| https://api.github.com/repos/conan-io/conan/releases | release list, tags and dates | read 2026-11-27 |
| https://raw.githubusercontent.com/conan-io/docs/develop2/changelog.rst | changelog 2.33.0, 2.34.0, 2.27.0 | read 2026-11-27 |
| https://raw.githubusercontent.com/conan-io/docs/develop2/reference/tools/cmake/cmakeconfigdeps.rst | experimental banner, no-Find-modules line | develop2 |
| https://raw.githubusercontent.com/conan-io/docs/develop2/reference/tools/cmake/cmakedeps.rst | CMakeDeps page note | develop2 |
| https://raw.githubusercontent.com/conan-io/docs/develop2/common/experimental_warning.inc | banner text | develop2 |
| https://raw.githubusercontent.com/conan-io/docs/develop2/reference/config_files/profiles.rst | replace_requires, platform_requires banners | develop2 |
| https://raw.githubusercontent.com/conan-io/docs/develop2/tutorial/versioning/lockfiles.rst | lockfile flags | develop2 |
| https://raw.githubusercontent.com/conan-io/docs/develop2/integrations/cps.rst | new CPS page (2026-11-20) | develop2 |
| conan-io/conan tag 2.34.0 and 2.32.0, conan/tools/cmake/toolchain/blocks.py | CppStdBlock, runtime block | diffed |
| conan-io/conan tag 2.34.0 and 2.32.0, conan/tools/cmake/presets.py | vendor check | diffed |
| conan-io/conan tag 2.34.0 and 2.32.0, conan/cli/args.py, conan/internal/model/{conan_file,info,cpp_info}.py, conan/tools/files/files.py, conan/internal/loader.py | lockfile args, build_requires, mocks, header_only, hash defaults | diffed |
| https://api.github.com/repos/conan-io/docs/commits?path=integrations/cps.rst | date of the CPS page | read 2026-11-27 |

Not measured: no Conan was installed or run; all verdicts are from source and docs reads. Behaviours CONAN-09, 10, 15, 16 are source-unchanged but the one-command re-measurements above remain the proof.

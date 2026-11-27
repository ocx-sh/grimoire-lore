---
title: Conan, cmake-conan and vcpkg facts at the CMake seam, delta 2026-09-26 to 2026-11-27
pair: cmake-build
date_researched: 2026-11-27
window_start: 2026-09-26
model: sonnet
sources_fetched: 22
---

# Conan, cmake-conan and vcpkg facts at the CMake seam (delta)

Scope: this is a delta of the existing cmake-build research. It checks only the claims the pair's CMake-side rows quote from Conan, cmake-conan and vcpkg. It does not survey manager releases at large. Everything not listed as "changed" stays exactly as it is.

## Summary

- Verdict: no claim at risk changed. Every quoted fact is "unchanged", except one line-number shift in `blocks.py` and one status note on issue #36244. No re-measurement on CMake 3.31.12 or 4.4.2 is needed.
- Newest Conan tag is 2.34.0 (published 2026-10-28). 2.33.0 was published 2026-09-29. The baseline pin was 2.32.0 (2026-08-31).
- `CMakeConfigDeps` did NOT become Conan's default. It is still labelled experimental, and `conan new` templates still emit `CMakeDeps`. CMK-TC-05 and Re-check D2 keep their shape.
- The only code change in `conan/tools/cmake/toolchain/blocks.py` between 2.32.0 and 2.34.0 is in `ParallelBlock` (clang-cl `/MP`). `CppStdBlock`, `VSRuntimeBlock`, `FindFiles` and `PkgConfigBlock` are byte-identical.
- The `FindFiles` class moved up one line: it starts at line 580 in 2.32.0 and at line 579 in 2.34.0. The cited range `580-644` becomes `579-643` if the pair re-pins to 2.34.0.
- cmake-conan `develop2` has no commit after `b1593849` (2026-06-05). The GitHub compare of `b1593849...develop2` reports status "identical". `conan_provider.cmake` is unchanged.
- vcpkg has one new tag, 2026.10.16 (release 2026-10-20). `scripts/buildsystems/vcpkg.cmake` is byte-identical between 2026.07.29 and 2026.10.16 (same md5).
- vcpkg-tool has two new releases, 2026-09-26 and 2026-10-29. Their release notes list no toolchain, CMake-configure or `find_package` behaviour change.
- Issues conan-io/conan#12341, microsoft/vcpkg#36244 and microsoft/vcpkg#50271 are all still open.

## Findings

Method note: sources were read through the GitHub API (`gh api`, raw file contents at a tag, release bodies, issue records, compare endpoint) and one docs page via fetch. Search snippets were not used. Quoted line numbers come from the raw files at the named tags.

### 1. Conan blocks.py, 2.32.0 versus 2.34.0

Files compared: `conan/tools/cmake/toolchain/blocks.py` (1486 lines at 2.32.0, 1485 at 2.34.0) and `conan/tools/cmake/toolchain/toolchain.py` (no difference).

The whole diff is two hunks, both in `ParallelBlock` (source: [blocks.py at 2.34.0](https://github.com/conan-io/conan/blob/2.34.0/conan/tools/cmake/toolchain/blocks.py)):

```
< if compiler != "msvc" or "Visual" not in self._toolchain.generator:
> if "Visual" not in self._toolchain.generator or compiler not in ("msvc", "clang"):
```

The removed `# TODO: Check this conf` comment is the other hunk. This is PR [conan-io/conan#20439](https://github.com/conan-io/conan/pull/20439), "Define /MP in CMakeToolchain for clang-cl", listed in the [2.34.0 release notes](https://github.com/conan-io/conan/releases/tag/2.34.0) and merged 2026-10-26.

Per claim:

| Claim | Status | Evidence |
|---|---|---|
| CMK-TC-10 "Conan forces `BOTH`" (`FindFiles`, `blocks.py:580-644`) | unchanged in behaviour; line range shifts to 579-643 at 2.34.0 | At 2.34.0 lines 626-641 still set `CMAKE_FIND_ROOT_PATH_MODE_PACKAGE`, `_PROGRAM`, `_LIBRARY`, `_FRAMEWORK` and `_INCLUDE` to `"BOTH"` when undefined or `"ONLY"`. Still read from source, not measured. |
| targets.md `CppStdBlock` (CMK-TGT-05, -06, -07, -16) | unchanged | Class at line 318 in 2.34.0, template sets `CMAKE_CXX_STANDARD`, `CMAKE_CXX_EXTENSIONS`, `CMAKE_CXX_STANDARD_REQUIRED ON`, `variable_watch(CMAKE_CXX_STANDARD ...)`. No diff. |
| targets.md `VSRuntimeBlock` | unchanged | Class at line 60 in both; no diff. |
| "Conan 2.7.0 and later, silent on 2.6.0" for the standard override | could not determine for the 2.6.0/2.7.0 history; unchanged for the window | Only the 2.32.0 to 2.34.0 range was diffed. Nothing in the window touches the version boundary. |
| CMK-DEP-23 no `PKG_CONFIG_SYSROOT_DIR` or `PKG_CONFIG_LIBDIR` from Conan's cross `conan_toolchain.cmake` | unchanged | `PkgConfigBlock` (line 735) sets only `PKG_CONFIG_EXECUTABLE` and `ENV{PKG_CONFIG_PATH}`. A grep for `PKG_CONFIG_SYSROOT_DIR` and `PKG_CONFIG_LIBDIR` in `blocks.py` and `toolchain.py` at 2.34.0 returns nothing. |

Unreleased note: `blocks.py` has three more commits on the default branch after the 2.34.0 tag that were not diffed: `f730f67c0` (2026-11-03, make `ANDROID_ABI` an internal cache variable), `f3356df86` (2026-11-13, style cleanup of old code) and `5fd213f27` (2026-11-25, cache compiled jinja2 templates). They are unreleased, so they do not affect a pin to a released tag. `f730f67c0` touches Android only.

### 2. CMakeConfigDeps default status (Re-check D2 and CMK-TC-05)

- The [CMakeConfigDeps reference page](https://docs.conan.io/2/reference/tools/cmake/cmakeconfigdeps.html) says "This feature is experimental and subject to breaking changes", available as experimental from Conan 2.25, and "designed as a replacement of the current `CMakeDeps` generator". It does not say it is the default or recommended generator. The opt-in conf `tools.cmake.cmakedeps:new=will_break_next` still exists.
- At 2.34.0, `conan/tools/cmake/__init__.py` still defines `CMakeDeps(conanfile)` as a function that returns the real `CMakeDeps` unless that conf is set, and the incubating warning text still says "CMakeConfigDeps is now experimental".
- `conan new` template `cmake_lib.py` still contains `CMakeDeps` (lines 2, 48, 250) at both 2.32.0 and 2.34.0.
- Conclusion: `CMakeConfigDeps` did not become the default. CMK-TC-05 and Re-check D2 are not reshaped.
- Relevant additions for CMakeConfigDeps in the window (none touches the `find_program`/`find_library`/`find_path` claim; the docs page mentions `find_program()` once, and `find_library` and `find_path` not at all):
  - 2.33.0: `find_package` verbosity level in CMakeConfigDeps ([#20275](https://github.com/conan-io/conan/pull/20275)); `get_cmake_file_name` returns a dict ([#20300](https://github.com/conan-io/conan/pull/20300)); `cpp_info.sources`-only packages ([#20297](https://github.com/conan-io/conan/pull/20297)); imported object libraries ([#20347](https://github.com/conan-io/conan/pull/20347)).
  - 2.34.0: `CMAKE_PREFIX_PATH` added as a fallback for cases beyond the `<pkg>_DIR` variable ([#20420](https://github.com/conan-io/conan/pull/20420), merged 2026-10-20); `cmake_file_names` dict property ([#20298](https://github.com/conan-io/conan/pull/20298)); CPS `dyld_requires` for CMake 4.4 and later ([#20362](https://github.com/conan-io/conan/pull/20362)); require-trait filtering ([#20277](https://github.com/conan-io/conan/pull/20277)).
  - The `CMAKE_PREFIX_PATH` fallback (#20420) is the only item that touches how a consumer reaches Conan content. It concerns `find_package`, not `find_program`/`find_library`/`find_path`.

### 3. cmake-conan `develop2` after `b1593849`

- `gh api repos/conan-io/cmake-conan/compare/b1593849...develop2` returns status "identical", ahead_by 0, no files. The newest `develop2` commit is `b1593849d` (2026-06-05, PR #733). Newest release is still 0.19.0 (2026-02-09).
- `conan_provider.cmake` on `develop2` equals the file at `b1593849` (empty diff). It still has `set(CONAN_MINIMUM_VERSION 2.0.5)` (line 23) and the `CMakeConfigDeps` warnings at lines 593 and 598.
- So "cmake-conan needs Conan 2.0.5", CMK-DEP-17 (`find_package-v1` events only under `--debug-find-pkg`) and the CMK-TC-05 provider statement are unchanged. Source: [cmake-conan develop2](https://github.com/conan-io/cmake-conan/tree/develop2).

### 4. vcpkg after 2026.07.29 and vcpkg-tool after 2026-07-27

- New vcpkg tag: 2026.10.16 (release 2026-10-20), 941 commits after 2026.07.29. Sources: [vcpkg tags](https://github.com/microsoft/vcpkg/tags), [vcpkg releases](https://github.com/microsoft/vcpkg/releases).
- `scripts/buildsystems/vcpkg.cmake`: identical md5 (`9adf31195675d77146e55dbff9b9436d`) at 2026.07.29 and 2026.10.16. CMK-DEP-21 (toolchain appends the installed triplet to `CMAKE_FIND_ROOT_PATH`, line 454 `z_vcpkg_add_vcpkg_to_cmake_path(CMAKE_FIND_ROOT_PATH "")`) is unchanged. The `ONLY` mode handling at lines 461-471 is also unchanged.
- CMK-DEP-16: the line lives in `ports/vcpkg-cmake/vcpkg_cmake_configure.cmake`, not in `scripts/`. Line 218 `vcpkg_list(PREPEND arg_OPTIONS "-DFETCHCONTENT_FULLY_DISCONNECTED=ON")` is present at both tags. The only change in that file is an added `vcpkg_host_path_list(REMOVE_DUPLICATES ENV{PATH})` at lines 246-247 of the 2026.10.16 copy. Unchanged for the claim.
- CMK-DEP-23: a grep of `scripts/` at both vcpkg tags finds no `PKG_CONFIG_SYSROOT_DIR` and no `PKG_CONFIG_LIBDIR`. Unchanged.
- `scripts/cmake/` differences between the tags are seven files (msys acquisition, `vcpkg_find_acquire_program` for CLANG, PATCHELF, PKGCONFIG and PYTHON3, `vcpkg_find_fortran`, `z_vcpkg_spdx`). None is a configure-seam file the pair quotes. `scripts/toolchains/` has no difference.
- vcpkg-tool: releases [2026-09-26](https://github.com/microsoft/vcpkg-tool/releases/tag/2026-09-26) and [2026-10-29](https://github.com/microsoft/vcpkg-tool/releases/tag/2026-10-29). The notes list binary-cache, registry, `x-update-baseline`, `depend-info` JSON and packaging changes and vcpkg-scripts SHA bumps; none names the toolchain file, `CMAKE_TOOLCHAIN_FILE` handling or `find_package` behaviour. `src/vcpkg/commands.build.cpp` is identical between 2026-07-27 and 2026-10-29. CMK-DEP-13 (a cached valid `<Pkg>_DIR` is used as is) is CMake behaviour; nothing in the vcpkg-tool notes bears on it.
- Caveat: CMK-DEP-13 stays labelled "measured with vcpkg-tool 2026-07-27". The label is still true. A re-measurement with 2026-10-29 is optional, not required.

### 5. The three issues

| Issue | State on 2026-11-27 | Last activity | Note |
|---|---|---|---|
| [conan-io/conan#12341](https://github.com/conan-io/conan/issues/12341) "Run Conan from generic CMakeToolchain file and chainload the generated" | open | 2022-12-05 | The "open as of 2026-09-26" wording stays true; update the date to 2026-11-27 if the pair re-stamps. |
| [microsoft/vcpkg#36244](https://github.com/microsoft/vcpkg/issues/36244) "`VCPKG_CHAINLOAD_TOOLCHAIN_FILE` has two different meanings" | open | 2026-11-03 | New comment 2026-11-03 reports a messy clang-on-Windows (msys2 clang64) setup with cache variables. No maintainer resolution. |
| [microsoft/vcpkg#50271](https://github.com/microsoft/vcpkg/issues/50271) DirectXTex x64-windows-static uses MD[d] instead of expected MT[d] | open | 2026-03-03 | Unchanged. |

## Per-claim decision table

| Claim at risk | Decision | Tag or commit | Changed line |
|---|---|---|---|
| "Conan 2.32.0 and vcpkg 2026.07.29" composition text | unchanged in behaviour; newer pins exist: Conan 2.34.0, vcpkg 2026.10.16 | conan 2.34.0, vcpkg 2026.10.16 | none relevant |
| conan#12341 open | unchanged (open) | n/a | none |
| vcpkg#36244 | unchanged (open; one new comment 2026-11-03) | n/a | none |
| CMK-TC-05 (`develop2` find_* under `CMakeConfigDeps`; "cmake-conan needs Conan 2.0.5") | unchanged | cmake-conan `b1593849` = `develop2` head | `CONAN_MINIMUM_VERSION 2.0.5` at line 23 |
| CMK-TC-10 `FindFiles` forces `BOTH` | unchanged behaviour; range shifts to `579-643` at 2.34.0 | conan 2.34.0 | class starts at line 579 |
| Re-check D2 (recommend `CMakeConfigDeps`) | unchanged; not the default | conan 2.34.0 docs | docs still say "experimental" |
| Re-check D4 | could not determine: its text was not given in the commission | n/a | none found in the checked sources |
| CMK-DEP-13 vcpkg-tool 2026-07-27 | unchanged; newer tool releases do not touch it | vcpkg-tool 2026-09-26, 2026-10-29 | none |
| CMK-DEP-16 vcpkg forces `FETCHCONTENT_FULLY_DISCONNECTED=ON` | unchanged | vcpkg 2026.10.16 | `ports/vcpkg-cmake/vcpkg_cmake_configure.cmake:218` |
| CMK-DEP-17 cmake-conan `--debug-find-pkg` | unchanged | cmake-conan `b1593849` | none |
| CMK-DEP-21 vcpkg appends triplet to `CMAKE_FIND_ROOT_PATH` | unchanged | vcpkg 2026.10.16 | `vcpkg.cmake` line 454, file identical |
| CMK-DEP-23 no `PKG_CONFIG_SYSROOT_DIR` plus `PKG_CONFIG_LIBDIR` pair | unchanged | conan 2.34.0, vcpkg 2026.10.16 | none |
| targets.md `CppStdBlock`, `VSRuntimeBlock` (CMK-TGT-05, -06, -07, -16) | unchanged | conan 2.34.0 | none |
| "Conan 2.7.0 and later, silent on 2.6.0" | could not determine for that boundary; unaffected by the window | n/a | none |
| microsoft/vcpkg#50271 | unchanged (open) | n/a | none |

Re-measurement: none required on 3.31.12 or 4.4.2. Optional: if the pair re-pins its "as of" text to Conan 2.34.0, update the `FindFiles` range to `579-643` and the date stamps; if it quotes the CMakeConfigDeps consumer path, add one line on the 2.34.0 `CMAKE_PREFIX_PATH` fallback.

## Normative guidance candidates

1. Rule: when a row cites `blocks.py` line numbers, cite them with the tag, and use `579-643` for `FindFiles` at 2.34.0 (or keep `580-644` with "at 2.32.0"). Rationale: the line shifted by one in the window, so an unpinned range misleads. Verification: `gh api "repos/conan-io/conan/contents/conan/tools/cmake/toolchain/blocks.py?ref=<tag>" -H "Accept: application/vnd.github.raw" | grep -n "class FindFiles"` prints the start line.
2. Rule: keep CMK-TC-05 and Re-check D2 describing `CMakeConfigDeps` as an experimental opt-in, not as Conan's default. Rationale: the docs page and `conan/tools/cmake/__init__.py` at 2.34.0 still say experimental. Verification: grep the docs page for "experimental"; grep `__init__.py` for `will_break_next`. Re-run before any later refresh.
3. Rule (optional, low priority): if the pair describes how a consumer finds `CMakeConfigDeps` packages, state that Conan 2.34.0 added a `CMAKE_PREFIX_PATH` fallback beyond `<pkg>_DIR`. Rationale: it changes how `find_package` can reach Conan content, and falls under CMK-DEP-21's hint-order warning. Verification: Conan 2.34.0 release notes, PR #20420; a measured `--debug-find-pkg` on a rooted configure.

## AI-agent angle

- An agent trained before 2.25 may say `CMakeDeps` is the only Conan CMake generator, or, after reading 2.33/2.34 notes, may assume `CMakeConfigDeps` is now the default. Both are wrong; the docs still say experimental. Check: grep for `tools.cmake.cmakedeps:new` and the docs "experimental" line.
- An agent may cite `blocks.py:580-644` without a tag. Check: require a tag next to any `blocks.py:` line range.
- An agent may assume the cmake-conan provider moved with Conan 2.33/2.34. It did not; `develop2` is still `b1593849`. Check: `gh api repos/conan-io/cmake-conan/compare/b1593849...develop2 --jq .status`.
- An agent may look for `FETCHCONTENT_FULLY_DISCONNECTED` in `scripts/buildsystems/vcpkg.cmake`. It is in `ports/vcpkg-cmake/vcpkg_cmake_configure.cmake:218`. Check: grep that path.

## Contested / evolving

- `CMakeConfigDeps` is moving toward replacing `CMakeDeps` (docs say "designed as a replacement") and gains features each release (2.33.0, 2.34.0), but is still experimental as of 2026-11-27. Trend: toward default, no date given.
- The vcpkg chainload-toolchain semantics (#36244) are still contested and open; new reports keep arriving (2026-11-03).
- Unreleased Conan changes after 2.34.0 on the default branch (Android `ANDROID_ABI`, template caching) were not assessed beyond their commit titles.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://github.com/conan-io/conan/releases/tag/2.34.0 | Conan 2.34.0 release notes | 2026-10-28 | Lists PR #20439, #20420 |
| https://github.com/conan-io/conan/releases/tag/2.33.0 | Conan 2.33.0 release notes | 2026-09-29 | CMakeConfigDeps changes |
| https://github.com/conan-io/conan/releases/tag/2.32.0 | Conan 2.32.0 release notes | 2026-08-31 | Baseline |
| https://github.com/conan-io/conan/blob/2.32.0/conan/tools/cmake/toolchain/blocks.py | blocks.py at baseline | 2.32.0 | Diff base |
| https://github.com/conan-io/conan/blob/2.34.0/conan/tools/cmake/toolchain/blocks.py | blocks.py at newest tag | 2.34.0 | Diff target; FindFiles, PkgConfigBlock |
| https://github.com/conan-io/conan/blob/2.34.0/conan/tools/cmake/toolchain/toolchain.py | toolchain.py at newest tag | 2.34.0 | No pkg-config sysroot variables |
| https://github.com/conan-io/conan/blob/2.34.0/conan/tools/cmake/__init__.py | `CMakeDeps` wrapper with `will_break_next` conf | 2.34.0 | Shows CMakeConfigDeps still opt-in |
| https://docs.conan.io/2/reference/tools/cmake/cmakeconfigdeps.html | CMakeConfigDeps reference | read 2026-11-27 | States "experimental" |
| https://github.com/conan-io/cmake-conan/tree/develop2 | cmake-conan develop2 and compare with `b1593849` | head 2026-06-05 | No newer commits |
| https://github.com/conan-io/conan/issues/12341 | chainload issue | last activity 2022-12-05 | Still open |
| https://github.com/microsoft/vcpkg/issues/36244 | chainload meaning issue | last activity 2026-11-03 | Still open |
| https://github.com/microsoft/vcpkg/issues/50271 | DirectXTex runtime mismatch | last activity 2026-03-03 | Still open |
| https://github.com/microsoft/vcpkg/blob/2026.10.16/scripts/buildsystems/vcpkg.cmake | vcpkg toolchain at newest tag | 2026-10-16 | Identical to 2026.07.29 |
| https://github.com/microsoft/vcpkg/blob/2026.10.16/ports/vcpkg-cmake/vcpkg_cmake_configure.cmake | Port configure helper | 2026-10-16 | FETCHCONTENT line 218 |
| https://github.com/microsoft/vcpkg-tool/releases/tag/2026-10-29 | vcpkg-tool release notes | 2026-10-29 | No toolchain changes |
| https://github.com/microsoft/vcpkg-tool/releases/tag/2026-09-26 | vcpkg-tool release notes | 2026-09-26 | No toolchain changes |
| https://github.com/microsoft/vcpkg/releases | vcpkg release list | 2026.10.16 on 2026-10-20 | Newest tag |

---
title: CMake experimental gates, C++ modules and CPS delta, 2026-09-26 to 2026-11-27
pair: cmake-build
date_researched: 2026-11-27
window_start: 2026-09-26
model: sonnet
sources_fetched: 31
---

# Delta: experimental gates, C++ modules, `import std`, CPS (cmake-build)

Scope: an update of the 2026-09-26 research, not a re-creation. Anything not listed as "changed" below is unchanged. Everything was read at the tag named, from raw.githubusercontent.com/Kitware/CMake, plus a downloaded cmake 4.5.1 Linux x86_64 binary (the CMK-VER-09 (2) count command was run on it) and the CMake GitLab issue API.

## Summary

- Tags newer than the baseline: v4.2.8 (2026-09-10 per the Kitware blog, listed for completeness), v4.3.5, v4.3.6, v4.4.3, v4.4.4, v4.4.5, v4.5.0 (2026-11-12) and v4.5.1 (2026-11-19). There is no v3.31.13; 3.31.12 is still the last 3.31 tag.
- CHANGED, large: CMake 4.5.0 removed the `CMAKE_EXPERIMENTAL_CXX_IMPORT_STD` gate. `import std` is no longer experimental from 4.5.0. The `CXX_MODULE_STD` target property, the `CMAKE_CXX_MODULE_STD` variable and the `CMAKE_CXX_COMPILER_IMPORT_STD` variable were removed with it. CMK-TGT-19 and CMK-VER-09 are wrong for 4.5.
- CHANGED: the `CMAKE_EXPERIMENTAL_GENERATE_SBOM` gate was also removed in 4.5.0. `install(SBOM)` and `export(SBOM)` are stable at 4.5.
- CHANGED: 4.5.0 added a new gate, `CMAKE_EXPERIMENTAL_SYCL`.
- UNCHANGED: every other gate UUID is identical at 4.5.0 and 4.5.1 to 4.4.2. All patch tags (4.2.8, 4.3.5, 4.3.6, 4.4.3 to 4.4.5, 4.5.1) carry a byte-identical `experimental.rst` to their minor's previous tag.
- UNCHANGED: `cmake-cxxmodules(7)` compiler floors for named modules and the Ninja 1.11 or VS 17.4 floor. Only the `import std` section changed (new GCC rule on macOS, new "Ubuntu before 26.04 ships broken `libstdc++.modules.json`" note).
- CHANGED (minor): `install(PACKAGE_INFO)` now writes `cps_version` 0.15.0 (4.4.2 wrote 0.14.1). The CPS specification site shows v0.15.0 as current.
- CPS behaviours CMK-INST-13 to -17 and CMK-DEP-11 re-measured on 4.5.1: all still hold. The docs for `find_package` and `install(PACKAGE_INFO)` changed only by typo and by a header-file-set note (see 3).
- The CPS importer gained `compile_flags` and `link_flags` support (issue 28198, milestone 4.5.0), `executable` component import, and header file set import and export.
- Silent export gaps: still no upstream issue for mismatched namespace, non-`simple` schema, or absolute `hints`. Related open issues now exist for Find-module exports (28296) and invalid package names (27965, filed 2026-07-17, before the baseline). Links in section 4.
- SBOM: no longer experimental. Pointer for the recent-shifts brief only.

## Findings

### 1. Gate UUIDs per tag (Help/dev/experimental.rst)

Method: `curl` of `Help/dev/experimental.rst` at each tag, `cmp` between tags, and the CMK-VER-09 (2) count (`LC_ALL=C tr -c ' -~' '\n' < $CMAKE_BIN | grep -c -F -e "$UUID"`) on the 4.5.1 binary.

| Gate variable | 4.2.8 | 4.3.5, 4.3.6 | 4.4.3 to 4.4.5 | 4.5.0, 4.5.1 | Count in 4.5.1 binary |
|---|---|---|---|---|---|
| `CXX_IMPORT_STD` | same as 4.2.7 | same as 4.3.4 (`451f2fe2…`) | same as 4.4.2 (`f35a9ac6…`) | removed | `f35a9ac6…` 0, `451f2fe2…` 0 |
| `GENERATE_SBOM` | n/a | same as 4.3.4 | same as 4.4.2 (`2d856d6d-53e8-488b-a17f-d486d2cac317`) | removed | 0 |
| `EXPORT_PACKAGE_DEPENDENCIES` | n/a | same | `1942b4fa-b2c5-4546-9385-83f254070067` | same | 1 |
| `MAPPED_PACKAGE_INFO` | n/a | same | `ababa1b5-7099-495f-a9cd-e22d38f274f2` | same | 1 |
| `EXPORT_BUILD_DATABASE` | n/a | same | `70ef007e-b743-492d-9407-e35eeac03a40` | same | 1 |
| `RUST` | n/a | same | `b6fdddce-bf66-41a5-bc5f-077f6fa4d2a1` | same | 1 |
| `SYCL` | n/a | n/a | n/a | new, `c0d1fb10-2ece-420e-9d29-7d7f2b300f25` | 1 |

Evidence: `cmp v4.2.7 v4.2.8`, `cmp v4.3.4 v4.3.6` and `cmp v4.4.2 v4.4.5` all report identical files; `cmp v4.5.0 v4.5.1` identical. `diff v4.4.2 v4.5.0` shows only the removal of the import std and SBOM sections and the addition of the SYCL section.

Claim status:
- "`CXX_IMPORT_STD` is `d0edc3af…` on 3.31.12 (unchanged through 4.2.7), `451f2fe2…` on 4.3.4 and `f35a9ac6…` on 4.4.2": unchanged as a statement about those tags. Extend it: unchanged through 4.2.8, 4.3.6, 4.4.5, and the gate does not exist from 4.5.0.
- "Four of six gates rotated between 4.3.4 and 4.4.2": unchanged (historical). Between 4.4.2 and 4.5.x no gate that still exists rotated: four kept their UUIDs, two were removed, one was added. The count of gates in 4.4.2 was six; in 4.5.x it is five.
- "On 4.4.2, `451f2fe2…` counts 0 and `f35a9ac6…` counts 1": unchanged. On 4.5.1 both count 0.
- Retired 4.3.0 gates (`EXPORT_PACKAGE_INFO`, `FIND_CPS_PACKAGES`): unchanged; neither appears in any tag read.
- "Only `CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO` still needs `MAPPED_PACKAGE_INFO`": unchanged at 4.5.0. `Help/variable/CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO.rst` at v4.5.0 still says "meaningful only when experimental support has been enabled" (its note spells the gate `CMAKE_EXPERIMENTAL_FIXME`, an upstream doc placeholder), and `experimental.rst` at 4.5.0 still lists `MAPPED_PACKAGE_INFO` for it.
- CMK-VER-09 "Floor: the UUID can change at any minor": still true, and now also "a gate can be deleted at any minor". A stale `CMAKE_EXPERIMENTAL_CXX_IMPORT_STD` set on 4.5 is not tested by me (see "could not determine").
- Re-check D7 stays valid. Add: on 4.5 the grep for `CMAKE_EXPERIMENTAL_` hits in own listfiles for `CXX_IMPORT_STD` and `GENERATE_SBOM` is dead code.

Sources: [experimental.rst v4.5.0](https://raw.githubusercontent.com/Kitware/CMake/v4.5.0/Help/dev/experimental.rst), [v4.4.2](https://raw.githubusercontent.com/Kitware/CMake/v4.4.2/Help/dev/experimental.rst), [v4.4.5](https://raw.githubusercontent.com/Kitware/CMake/v4.4.5/Help/dev/experimental.rst), [v4.3.6](https://raw.githubusercontent.com/Kitware/CMake/v4.3.6/Help/dev/experimental.rst), [v4.2.8](https://raw.githubusercontent.com/Kitware/CMake/v4.2.8/Help/dev/experimental.rst), [v4.5.1](https://raw.githubusercontent.com/Kitware/CMake/v4.5.1/Help/dev/experimental.rst). Release dates from the [CMake releases API](https://api.github.com/repos/Kitware/CMake/releases) and the [Kitware blog CMake tag](https://www.kitware.com/tag/cmake).

### 2. C++ modules and `import std` (cmake-cxxmodules(7), release notes 4.5)

What changed upstream, date 2026-11-12 (v4.5.0):
- The 4.5 release notes, "Languages", state: "`import std` is now available for all C++ 20 and later code with CXX_SCAN_FOR_MODULES enabled." ([Help/release/4.5.rst](https://raw.githubusercontent.com/Kitware/CMake/v4.5.0/Help/release/4.5.rst)). The experimental-gate removal was decided in [issue 28014, "RFC: Drop the import std experimental gate", closed 2026-09-28](https://gitlab.kitware.com/cmake/cmake/-/work_items/28014): "`import std` no longer has any interface" apart from `CMAKE_CXX_STDLIB_MODULES_JSON`.
- `cmake-cxxmodules(7)` at 4.5.0 has a new `import std Support` section (`versionadded:: 4.5`) in place of the 4.4.2 text. Toolchain list: Clang 18.1.2 and newer with `libc++` or `libstdc++`; MSVC toolset 14.36 and newer (VS 17.6 and newer); GCC 15 and newer except macOS; GCC 16 and newer on macOS. New note: "Ubuntu prior to 26.04 ships broken `libstdc++.modules.json` files" (Ubuntu bug 2141579). Only the Ninja generators support `import std`; Visual Studio generators do not (BMIs for IMPORTED targets). Standards: "all language standards which support C++ module scanning (ie, C++20 and newer)", where 4.4.2 required C++23 (`cxx_std_23`).
- Removed at 4.5.0 (HTTP 404 at v4.5.0, 200 at v4.4.2): `Help/prop_tgt/CXX_MODULE_STD.rst`, `Help/variable/CMAKE_CXX_MODULE_STD.rst`, `Help/variable/CMAKE_CXX_COMPILER_IMPORT_STD.rst`. The 4.4.2 doc paragraph "targets may use the `CXX_MODULE_STD` target property" is gone from cxxmodules. `Source/cmGeneratorTarget.cxx` at v4.5.0 has one `IMPORT_STD` occurrence (the `CMAKE_CXX_COMPILER_IMPORT_STD_ERROR_MESSAGE` lookup) against eight at v4.4.2.
- New: `CMAKE_CXX_STDLIB_MODULES_JSON` (4.5), `CMAKE_CXX_COMPILER_IMPORT_STD_ERROR_MESSAGE` (read in source, no doc page in the 404 set; users ask for the old availability variable back in [issue 28183](https://gitlab.kitware.com/cmake/cmake/-/work_items/28183), closed 2026-10-19).
- Unchanged: named-module compiler floors (MSVC 14.34, Clang 16, `clang-cl` 19.1 from 4.4 except the VS `ClangCl` toolset, GCC 14), Ninja 1.11 or newer, generator list (Ninja, Ninja Multi-Config, VS 17 2022, VS 18 2026). `Visual Studio 14 2015` generator removed at 4.5 (release notes, "Deprecated and Removed"); no effect on the floor.
- 4.4.x and 4.3.x patch tags: `cmake-cxxmodules.7.rst`, `install.rst`, `find_package.rst`, `export.rst`, `cmake-packages.7.rst` at v4.4.5 are identical to v4.4.2, and v4.5.1 to v4.5.0. So nothing changed on 4.4 or 4.3 lines.

Claim status:
- targets.md CMK-TGT-19 floors "CMake >= 3.28, Ninja >= 1.11 or Visual Studio >= 17.4, and GCC 14+, Clang 16+ or MSVC 14.34+": unchanged.
- "`import std` ... gated on Clang 18.1.2+, MSVC 14.36+ or GCC 15+": changed in one detail. Old text: "gated on Clang 18.1.2+, MSVC 14.36+ or GCC 15+". New fact: the same three, plus "GCC 15+ except macOS, GCC 16+ on macOS", a libstdc++ module-JSON Ubuntu note, and no standard-version gate beyond C++20. Source: [cmake-cxxmodules.7.rst v4.5.0](https://raw.githubusercontent.com/Kitware/CMake/v4.5.0/Help/manual/cmake-cxxmodules.7.rst). Date: 2026-11-12.
- "Floor: 3.28, `import std` experimental through 4.4": the text is true for 4.4 and older and wrong for 4.5. Old text: "`import std` experimental through 4.4". New fact: from 4.5.0 it is stable and needs no gate, no `CXX_MODULE_STD`, no UUID. On 4.4 and older it is still gated by the exact-binary UUID. Pair the rule on `CMAKE_VERSION`: below 4.5 the gate and `CXX_MODULE_STD`, 4.5 and newer neither. Source: experimental.rst v4.5.0 diff; date 2026-11-12.
- Failure-mode statement "Kitware's 'the experiment is over' covers named modules, not `import std`": now outdated for 4.5, still right for 4.4.
- CMK-TGT-18 (clang-scan-deps, exit 127 on Ninja with a Clang that ships no `clang-scan-deps`): the mechanism is not shown to have changed; no tag in the window alters `CMAKE_CXX_SCAN_FOR_MODULES` docs (`CXX_SCAN_FOR_MODULES.rst` diff 4.4.2 to 4.5.0 is empty). A new, open failure of the same family exists: [issue 28315](https://gitlab.kitware.com/cmake/cmake/-/work_items/28315), opened 2026-11-23, `clang-scan-deps` fails to find the C++ standard library when `CMAKE_CXX_COMPILER` is a symlink into a prefix layout (Debian-style `/usr/lib/llvm23`). Open issue 28304 (opened 2026-11-17) says `import std` is incompatible with unity builds. Both are issues, not documented behaviour.
- Not verified here: the 4.5 binary on a Clang or GCC 15 Ninja leg. This machine has GCC 13.3 and no Ninja, so no `import std` build was run (see "could not determine").

### 3. CPS import and export (CMK-INST-13 to -17, CMK-DEP-11)

Docs diff 4.4.2 to 4.5.0: `find_package.rst` differs by two typo fixes only; `cmake-packages.7.rst` identical; `install.rst` PACKAGE_INFO section unchanged apart from the SBOM section and unrelated 4.5 additions (`BUILD_DEPENDS`, module-library destinations, `RUNTIME_DEPENDENCY_TARGETS`). `CPS_PATH` and `CPS_PREFIX_PATH` still appear nowhere in `find_package.rst` at v4.5.0 (count 0).

Code and release-note changes, 4.5.0 (2026-11-12):
- `install(PACKAGE_INFO)` and `export(PACKAGE_INFO)` now write CPS `cps_version` "0.15.0" (`Source/cmExportPackageInfoGenerator.cxx`: `"0.14.1"` at v4.4.2, `"0.15.0"` at v4.5.0). The CPS spec page ([cps-org.github.io/cps](https://cps-org.github.io/cps/)) shows v0.15.0. The cps-org GitHub releases page shows no releases and its tags page one tag (v0.5, 2017), so the spec has no release feed; I could not read its commit history (page returned nothing).
- 4.5 release notes: "|CPS| import by `find_package`, and export by `install(PACKAGE_INFO)` and `export(PACKAGE_INFO)`, now support header file sets"; "`find_package` now supports importing CPS `executable` components".
- [Issue 28198](https://gitlab.kitware.com/cmake/cmake/-/work_items/28198) (closed 2026-10-24, milestone 4.5.0): CPS import did not apply `compile_flags` and `link_flags` to `INTERFACE_COMPILE_OPTIONS` and `INTERFACE_LINK_OPTIONS`. Milestone says the fix is in 4.5.0; I did not run it.
- [Issue 28266](https://gitlab.kitware.com/cmake/cmake/-/work_items/28266) (closed 2026-11-18): CPS transitive dependencies ignored dependency providers. Milestone empty, so the release is not known; relevant if a provider (CPM or FetchContent) mixes with CPS consumers.

Re-measured on the 4.5.1 binary (project with `install(EXPORT fooT NAMESPACE acme:: …)` and `install(PACKAGE_INFO foo EXPORT fooT VERSION 1.2.0 COMPAT_VERSION 1.0)`, no experimental variable set):
- CMK-INST-13: unchanged. `install(PACKAGE_INFO)` configures and installs with no gate; output is `lib/cps/foo/foo.cps` and `foo@noconfig.cps` beside `lib/cmake/foo/fooConfig.cmake`.
- CMK-DEP-11: unchanged. With both files in the prefix, `find_package(foo 1.0)` sets `foo_DIR=<prefix>/lib/cps/foo`, so the valid `.cps` wins over Config. `CPS_PATH` and `CPS_PREFIX_PATH` unread (docs; no binary test of the variables).
- CMK-INST-15: unchanged. The `.cps` defines `foo::foo`, and linking `acme::foo` fails at Generate with "target was not found". `NAMESPACE acme::` is not read.
- CMK-INST-16: unchanged. `VERSION_SCHEMA rpm` is written verbatim (`"version_schema" : "rpm"`). A request for `1.2.0` is accepted, a request for `1.1` is rejected. With the default (omitted) schema, a request for `1.1` against 1.2.0 with `COMPAT_VERSION 1.0` is accepted. The fall-through to Config was not shown (my test project has no ConfigVersion file).
- CMK-INST-17: unchanged. `$<COMPILE_LANGUAGE:C>` on `INTERFACE_COMPILE_DEFINITIONS` with `install(PACKAGE_INFO)` present gives configure exit 1.
- Note: in my first consumer run the generate error was about a missing include directory because my test project installed no headers. That is a test artifact, not a behaviour change.

### 4. Silent CPS export gaps: tracked upstream?

Claim at risk: "Kitware's silent CPS export gaps (a mismatched namespace accepted, non-`simple` schemas written, absolute `hints`, Find-module `requires`), none reported upstream as of 2026-09-26."

Searched the CMake GitLab issue API for "CPS", "namespace", "cps schema", "hints", "find module" (updated_after 2026-09-20). Result by gap:
- Mismatched namespace accepted: no issue found.
- Non-`simple` schema written: no issue found.
- Absolute `hints`: no issue found.
- Find-module `requires`: related, new and open: [28296, "FindaCUDAToolkit: Exports not compatible with CPS"](https://gitlab.kitware.com/cmake/cmake/-/work_items/28296), opened 2026-11-16. It discusses a Find module whose targets do not export to CPS cleanly. Also [28113, "CMake could warn when a CPS refers to an unknown target"](https://gitlab.kitware.com/cmake/cmake/-/work_items/28113), opened 2026-09-23 (before the baseline date, so the baseline phrase "none reported" was already imprecise for it), and [28130, "CPS: Clarification on package dependencies"](https://gitlab.kitware.com/cmake/cmake/-/work_items/28130), opened 2026-09-29.
- A different silent-export gap that the baseline did not list: [27965, "CPS: Reject invalid package names"](https://gitlab.kitware.com/cmake/cmake/-/work_items/27965), opened 2026-07-17, still open: CMake silently exports package names containing periods and produces unimportable CPS.
- Related open CPS issues from the window, useful as a risk list for CMK-INST-14: 28268, 28269, 28271, 28272, 28273, 28274, 28278, 28279 (all `find_package` import with GLOBAL targets, aliases, existing targets, or failure leaving targets behind, opened 2026-11-10 to 2026-11-12), 28247 (`link_languages` ignored), 28303 (RFE: abort `find_package` on an unsuitable package, opened 2026-11-17; today a rejected `.cps` continues to the next candidate, which is the CMK-DEP-11 fall-through, and the issue proposes an opt-in `CMAKE_FIND_PACKAGE_RETRY_MODE`), 28204 (CPS: use complete serde), 28158 (cps-migration diagnostics). Issue URLs follow `https://gitlab.kitware.com/cmake/cmake/-/work_items/<n>`.
- [Issue 28286](https://gitlab.kitware.com/cmake/cmake/-/work_items/28286) (closed 2026-11-17) is the reason 4.5.1 reverted the 4.5.0 FindCUDAToolkit `CUDAToolkit::` namespace targets (4.5.1 release notes, "Updates"): exports from 4.5.0 could not be consumed by CMake 4.4 and older. It is an export-compatibility finding, not CPS, but it bites any project that exports a target linking `CUDA::cudart`.

Verdict: the three gaps CMK-INST-15 and -16 and the absolute-hints text rely on are still not tracked upstream by title or description search. I cannot prove absence from a title and description search. The Find-module gap now has a related open issue (28296).

### 5. SBOM (pointer only)

Changed at 4.5.0: `install(SBOM)` and `export(SBOM)` lost the experimental note and the gate, `versionadded` moved from 4.3 to 4.5, and `LICENSE` was renamed `DATA_LICENSE` with a new `DEFAULT_LICENSE` (`install.rst`, `export.rst` diffs 4.4.2 to 4.5.0; [issue 28117](https://gitlab.kitware.com/cmake/cmake/-/work_items/28117) closed 2026-10-06). `CMAKE_INSTALL_SBOM_FORMATS` is new in 4.5. For the recent-shifts brief. It changes no CMK-INST claim; the CMK-INST text "SBOM generation carry no rule ... (as of 2026-09-26)" stays true as a statement about rules, but its premise "experimental" is now false.

## Normative guidance candidates

1. Rule: Cite `import std` per CMake line. Below 4.5, set `CMAKE_EXPERIMENTAL_CXX_IMPORT_STD` to the UUID in the pinned tag's `experimental.rst` and set `CXX_MODULE_STD` ON or `CMAKE_CXX_MODULE_STD`. From 4.5, set neither, and let `import std` work on a `CXX_SCAN_FOR_MODULES` target at C++20 or newer on Ninja only. Rationale: the 4.5.0 removal of gate, property and variables ([experimental.rst v4.5.0](https://raw.githubusercontent.com/Kitware/CMake/v4.5.0/Help/dev/experimental.rst)); old spelling on 4.5 is dead code and the property is no longer read. Verification: `grep -rn "CMAKE_EXPERIMENTAL_CXX_IMPORT_STD\|CXX_MODULE_STD" ` over own listfiles must have a `CMAKE_VERSION VERSION_LESS 4.5` guard on the same or enclosing `if()`; reading heuristic, on a 4.5 binary an unguarded hit is the finding.
2. Rule: On 4.5 and newer, test `import std` availability with `CMAKE_CXX_STDLIB_MODULES_JSON` and `CMAKE_CXX_COMPILER_IMPORT_STD_ERROR_MESSAGE`, never with `CMAKE_CXX_COMPILER_IMPORT_STD` (removed). Rationale: [issue 28183](https://gitlab.kitware.com/cmake/cmake/-/work_items/28183) shows users must write the long test themselves. Verification: `grep -rn CMAKE_CXX_COMPILER_IMPORT_STD` finds the removed variable. Treat as CONSIDER because the error-message variable has no doc page at 4.5.0.
3. Rule: Add the Ubuntu caveat to CMK-TGT-19: Ubuntu before 26.04 ships broken `libstdc++.modules.json`, so an `import std` leg on Ubuntu 24.04 needs `CMAKE_CXX_STDLIB_MODULES_JSON` or a newer image. Rationale: the 4.5.0 doc note. Verification: CI image tag read against 26.04.
4. Rule: Replace "`import std` experimental through 4.4" in CMK-TGT-19's floor line with "gated through 4.4, stable from 4.5" and tighten the compiler line to "GCC 15+ (GCC 16+ on macOS)". Rationale: 4.5.0 cxxmodules text. Verification: re-read both fields against `cmake-cxxmodules(7)` of the pinned binary (`cmake --help-manual cmake-cxxmodules`).
5. Rule: CMK-VER-09 re-check text must state the removal case: if the pinned binary is 4.5 or newer and a `CMAKE_EXPERIMENTAL_CXX_IMPORT_STD` or `CMAKE_EXPERIMENTAL_GENERATE_SBOM` variable still appears in a listfile, delete it. Rationale: both gates are gone; the count command on 4.5.1 returns 0 for both stale UUIDs, so the CMK-VER-09 (2) finding "count 0 = stale gate" fires correctly but the remedy "copy the new UUID" would send an agent hunting a UUID that does not exist. Verification: CMK-VER-09 (1) hits against the `grep -c` count 0 on the 4.5 binary; the fix is deletion, not a new UUID.
6. Rule: Add 4.5 to the CMK-VER-04 table: `import std` ungated, `install(SBOM)` ungated, `cps_version` 0.15.0, `Visual Studio 14 2015` removed. Rationale: version table currently stops at 4.4. Verification: read each row against [Help/release/4.5.rst](https://raw.githubusercontent.com/Kitware/CMake/v4.5.0/Help/release/4.5.rst).
7. Rule: CMK-INST-14 gains "do not export a target that links `CUDA::cudart` with a 4.5.0 producer when 4.4 consumers exist; use 4.5.1 or newer". Rationale: issue 28286, revert in 4.5.1. Verification: producer `CMAKE_VERSION` read against 4.5.0.
8. Rule: CMK-INST-15 to -17 stay as written; re-measure confirmed. Add 27965 as a new silent-export check: reject a CPS package name containing a period before `install(PACKAGE_INFO)`. Rationale: [27965](https://gitlab.kitware.com/cmake/cmake/-/work_items/27965) open, CMake exports an unimportable `.cps`. Verification: `grep -n 'install(PACKAGE_INFO' ` and read the first argument for `.`; reading heuristic.
9. Rule: CMK-DEP-11 and CMK-INST-14's wording "a rejected `.cps` falls through silently" is accurate today but an opt-in stop-on-unsuitable mode is proposed ([28303](https://gitlab.kitware.com/cmake/cmake/-/work_items/28303), open). Rationale: if it lands, the silent fall-through becomes configurable. Verification: re-read `find_package.rst` at each release for `CMAKE_FIND_PACKAGE_RETRY_MODE`; no rule change now.

## AI-agent angle

- An agent trained before 4.5 copies `set(CMAKE_EXPERIMENTAL_CXX_IMPORT_STD "<uuid>")` plus `CMAKE_CXX_MODULE_STD ON` into a 4.5 project. Both are dead, harmless to the build but they print nothing useful, and `CXX_MODULE_STD` is no longer read. Smallest check: CMK-VER-09 (1) grep, then the count on the pinned binary, which returns 0 on 4.5.
- An agent looks for a "new UUID" for `import std` on 4.5 and invents one. Check: the 4.5 `experimental.rst` lists five gates, none for modules.
- An agent writes `if(CMAKE_CXX_COMPILER_IMPORT_STD)` on 4.5. The variable is removed; the test is silently false. Check: `grep CMAKE_CXX_COMPILER_IMPORT_STD`.
- An agent assumes `import std` needs C++23. On 4.5 it needs C++20 and a supported toolchain on Ninja. Check: read `cmake-cxxmodules(7)` of the pinned binary.
- An agent treats "SBOM is experimental" as current. Not on 4.5. Check: read `install.rst` for the "Experimental" note at the pinned tag.
- An agent writing CPS exports assumes `cps_version` is fixed at 0.14.1 or sets it by hand; CMake writes 0.15.0 from 4.5. Check: read `cps_version` in the installed `.cps`.

## Contested / evolving

- `import std` on 4.5: official as stable, but the open issues 28304 (unity builds), 28315 (symlinked clang prefix), 28249 (Ninja Multi-Config Debug scans with Release options) show real gaps as of 2026-11-27. Trend: more toolchains, fewer interface knobs. Treat as stable API with known bugs; a floor of 4.5 for a project that depends on it is argued.
- CPS importer: many open `find_package` import bugs filed between 2026-11-10 and 2026-11-12, and a proposed `CMAKE_FIND_PACKAGE_RETRY_MODE` (28303). Trend: Kitware is hardening CPS validation, which could turn today's silent fall-through into diagnostics. Re-check on 4.6.
- `MAPPED_PACKAGE_INFO`: the only CPS gate left. The 28014 RFC text itself names it as the model for gating anything built on top of a minimal interface, so expect it to stay while the distributor mapping stabilises.
- The CPS spec: v0.15.0 is current but I found no published changelog. Unknown whether it renames fields CMake reads.

## Could not determine

- Whether setting `CMAKE_EXPERIMENTAL_CXX_IMPORT_STD` (stale UUID or any value) on 4.5 warns, errors or is silent: not run. A 4.5.1 binary was downloaded but only the UUID count and CPS round trip were run; no Ninja or Clang or GCC 15 was available for an `import std` build.
- The CPS spec change list from 0.14.1 to 0.15.0 (cps-org GitHub pages returned no releases and no commits to the fetcher; the spec site has no changelog).
- Whether issues 28198 and 28266 are in 4.5.0 or 4.5.1: 28198 has milestone 4.5.0; 28266 has none.
- Whether the three unlisted gaps (namespace, schema, hints) are tracked: title and description search found nothing; comments and merge requests were not searched.
- `CPS_PATH` and `CPS_PREFIX_PATH` on the 4.5.1 binary: confirmed only through absence from the 4.5.0 docs.
- The Kitware blog posts for 4.5.0 and rc1 to rc3 were listed but not opened.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://raw.githubusercontent.com/Kitware/CMake/v4.5.0/Help/dev/experimental.rst | Gate list at 4.5.0 | 2026-11-12 | Five gates, no `CXX_IMPORT_STD`, no SBOM, new SYCL |
| https://raw.githubusercontent.com/Kitware/CMake/v4.5.1/Help/dev/experimental.rst | Same at 4.5.1 | 2026-11-19 | Identical to 4.5.0 |
| https://raw.githubusercontent.com/Kitware/CMake/v4.4.5/Help/dev/experimental.rst | Gates at last 4.4 patch | 2026-10-27 | Identical to 4.4.2 |
| https://raw.githubusercontent.com/Kitware/CMake/v4.3.6/Help/dev/experimental.rst | Gates at last 4.3 patch | 2026-10-27 | Identical to 4.3.4 |
| https://raw.githubusercontent.com/Kitware/CMake/v4.2.8/Help/dev/experimental.rst | Gates at last 4.2 patch | 2026-09-10 | Identical to 4.2.7 |
| https://raw.githubusercontent.com/Kitware/CMake/v4.4.2/Help/dev/experimental.rst | Baseline gate list | 2026-08-03 | The diff base |
| https://raw.githubusercontent.com/Kitware/CMake/v4.5.0/Help/manual/cmake-cxxmodules.7.rst | cxxmodules manual 4.5.0 | 2026-11-12 | New `import std` section and floors |
| https://raw.githubusercontent.com/Kitware/CMake/v4.4.2/Help/manual/cmake-cxxmodules.7.rst | cxxmodules manual 4.4.2 | 2026-08-03 | Baseline |
| https://raw.githubusercontent.com/Kitware/CMake/v4.5.0/Help/release/4.5.rst | 4.5 release notes | 2026-11-12 | import std, CPS, SBOM, removals |
| https://raw.githubusercontent.com/Kitware/CMake/v4.5.1/Help/release/4.5.rst | 4.5 notes with 4.5.1 "Updates" | 2026-11-19 | FindCUDAToolkit revert |
| https://raw.githubusercontent.com/Kitware/CMake/v4.5.0/Help/command/install.rst | install() 4.5.0 (PACKAGE_INFO, SBOM) | 2026-11-12 | PACKAGE_INFO unchanged, SBOM ungated |
| https://raw.githubusercontent.com/Kitware/CMake/v4.5.0/Help/command/find_package.rst | find_package 4.5.0 | 2026-11-12 | CPS search text, no `CPS_PATH` |
| https://raw.githubusercontent.com/Kitware/CMake/v4.5.0/Source/cmExportPackageInfoGenerator.cxx | CPS writer | 2026-11-12 | `cps_version` 0.15.0 (0.14.1 at v4.4.2) |
| https://raw.githubusercontent.com/Kitware/CMake/v4.5.0/Source/cmGeneratorTarget.cxx | Target source | 2026-11-12 | Removal of the `CXX_MODULE_STD` reads |
| https://raw.githubusercontent.com/Kitware/CMake/v4.5.0/Help/variable/CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO.rst | Distributor variable | 2026-11-12 | Still experimental |
| https://github.com/Kitware/CMake/releases/download/v4.5.1/cmake-4.5.1-linux-x86_64.tar.gz | 4.5.1 binary | 2026-11-19 | UUID count and CPS round trip, measured 2026-11-27 |
| https://api.github.com/repos/Kitware/CMake/releases | Release dates | 2026-11 | Tag dates |
| https://gitlab.kitware.com/cmake/cmake/-/work_items/28014 | RFC: drop the import std gate | closed 2026-09-28 | Rationale for removal |
| https://gitlab.kitware.com/cmake/cmake/-/work_items/28117 | RFC: drop the SBOM gate | closed 2026-10-06 | SBOM removal |
| https://gitlab.kitware.com/cmake/cmake/-/work_items/28183 | Bring `CMAKE_CXX_COMPILER_IMPORT_STD` back | closed 2026-10-19 | Detection workaround for 4.5 |
| https://gitlab.kitware.com/cmake/cmake/-/work_items/28315 | clang-scan-deps and symlinked compiler | open 2026-11-23 | TGT-18 family |
| https://gitlab.kitware.com/cmake/cmake/-/work_items/27965 | CPS: reject invalid package names | open | Unlisted silent export gap |
| https://gitlab.kitware.com/cmake/cmake/-/work_items/28296 | FindaCUDAToolkit exports vs CPS | open 2026-11-16 | Find-module gap, related |
| https://gitlab.kitware.com/cmake/cmake/-/work_items/28286 | 4.5 CUDA exports unreadable by 4.4 | closed 2026-11-17 | Cause of 4.5.1 revert |
| https://gitlab.kitware.com/cmake/cmake/-/work_items/28303 | Abort find_package on unsuitable package | open 2026-11-17 | Fall-through may become configurable |
| https://gitlab.kitware.com/cmake/cmake/-/work_items/28198 | CPS import compile_flags and link_flags | closed 2026-10-24 | Importer change, milestone 4.5.0 |
| https://gitlab.kitware.com/cmake/cmake/-/work_items/28266 | CPS dependencies and providers | closed 2026-11-18 | Provider interaction |
| https://gitlab.kitware.com/cmake/cmake/-/work_items/28113 | Warn on CPS unknown target | open 2026-09-23 | Related to Find-module `requires` |
| https://www.kitware.com/tag/cmake | Kitware blog CMake tag | 2026-11 | Release dates, no CPS or modules post in the window |
| https://cps-org.github.io/cps/ | CPS specification | v0.15.0 | Current spec version |
| https://github.com/cps-org/cps/releases | cps-org releases | 2026-11 | No releases published |

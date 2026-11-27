---
title: CMake releases 2026-09-26 to 2026-11-27, effect on the gate, presets, versionadded table and policy set
pair: cmake-build
date_researched: 2026-11-27
window_start: 2026-09-26
model: sonnet
sources_fetched: 9
---

# Scope

Delta update. Only what changed upstream between 2026-09-26 and 2026-11-27 is reported. Anything not listed under "changed" is unchanged.

Primary sources read. The GitLab tag list at gitlab.kitware.com returned HTTP 403, so the Kitware GitHub mirror stood in for it.

1. Tag list: `gh api repos/Kitware/CMake/tags` (mirror of the GitLab repository), read 2026-11-27.
2. Release list with publish dates: `gh api repos/Kitware/CMake/releases`, read 2026-11-27.
3. Commit dates per tag: `gh api repos/Kitware/CMake/commits/<tag>`.
4. `Help/release/4.5.rst` at v4.5.1: https://raw.githubusercontent.com/Kitware/CMake/v4.5.1/Help/release/4.5.rst
5. `Help/release/4.4.rst` at v4.4.2, v4.4.5 and v4.5.1 (diffed).
6. Binaries `kitware/cmake:4.4.2`, `4.4.5`, `4.5.0` and `4.5.1` through `ocx package exec`, measured 2026-11-27 (canaries, presets, policies, `--help-manual cmake-diagnostics`, `--help-manual cmake-presets`, `--help-policy`).

# Releases in the window

| Tag | Date | Content |
|---|---|---|
| 3.31.x | none | Newest tag is v3.31.12 (2026-04-20). Nothing after it. |
| v4.3.5, v4.3.6 | 2026-09-04, 2026-10-27 | Out of scope except as existence. |
| v4.4.3 | 2026-08-25 | Before the window. Only documented change: Swift CMP0215 NEW now also requires CMP0157 and CMP0195 NEW. |
| v4.4.4 | 2026-10-02 | "No changes to documented features or interfaces." |
| v4.4.5 | 2026-10-27 | Same statement. |
| v4.5.0-rc1, rc2, rc3 | 2026-10-15, 2026-10-28, 2026-11-04 | Release candidates. |
| v4.5.0 | 2026-11-12 | Release. |
| v4.5.1 | 2026-11-19 | One fix: FindCUDAToolkit `CUDAToolkit::` namespace change from 4.5.0 reverted. |

`diff 4.4.rst` between v4.4.2 and v4.4.5 shows only the CMP0215 sentence. No 4.4 notes changed that this pair cites.

# Claim by claim

## rules/cmake-build.md

1. "Verified 2026-09-26 on CMake 3.31.12, 4.3.4 and 4.4.2" and `BIN=/opt/cmake-4.4.2/bin`. Status: unchanged as a measurement date. Newer binaries exist: 4.4.5 and 4.5.1. The top CI binary is an owner decision (see Flags).
2. "`-Werror=dev` whenever one command line serves legs on both sides, which 4.4.2 still honours with a one-line deprecation notice". Status: unchanged, and now also true on 4.4.5, 4.5.0 and 4.5.1. Measured 2026-11-27: `-Werror=dev` prints "The error=dev option is deprecated. Use -Werror=author instead." and still gates. Both canaries (AUTHOR_WARNING, DEPRECATION) exit 1 under `-Werror=dev` and `-Werror=author` on 4.4.5, 4.5.0 and 4.5.1. `message(STATUS)` exits 0.
3. CMK-CORE-02 "4.4.2 rejects `dev` under schema 12". Status: unchanged, and extended. Measured: on 4.4.5 and 4.5.1, `"errors": {"dev": true}` under version 12 fails with "File version must be 11 or lower for errors.dev support". On 4.5.1 the same error appears under version 13. `errors.author` is accepted under 12 (and 13 on 4.5.1). Version 13 is rejected on 4.4.5 ("must be >=1 and <=12").
4. CMK-CORE-03 "Neither gate spelling reaches the `uninitialized` or `unused-cli` category on 4.4.2". Status: unchanged on 4.4.5 and 4.5.1. `-Werror=dev` and `-Werror=author` exit 0 on a script that dereferences an undefined variable on 4.4.2 and 4.5.1. `-Werror=uninitialized` exits 1 on both. `CMD_UNINITIALIZED` and `CMD_UNUSED_CLI` are still `versionadded:: 4.4`, `default: ignore`, with no parent (`cmake --help-manual cmake-diagnostics`, 4.5.1).

## CHANGED: the gate on 4.5 (new, high impact, not in the files)

On CMake 4.5.0 and 4.5.1, `-Werror=author` and `-Werror=dev` fail configure on directory-scope commands that have target-specific equivalents. Source: `Help/release/4.5.rst` ("`CMD_NON_TARGET_DIRECTIVE` diagnostic category was added"), published 2026-11-12; measured 2026-11-27.

- New category `CMD_NON_TARGET_DIRECTIVE` (`versionadded:: 4.5`, default `ignore`, parent `CMD_STRICT`). New category `CMD_STRICT` (`versionadded:: 4.5`, default `ignore`, parent `CMD_AUTHOR`). Children of `CMD_STRICT`: `CMD_INSTALL_ABSOLUTE_DESTINATION` (was a direct child of author in 4.4) and `CMD_NON_TARGET_DIRECTIVE`.
- Because the parent chain reaches author, `-Werror=author` promotes the category even though its default is ignore. Measured on 4.5.1, exit 1 under `-Werror=author` for each of `include_directories()`, `add_definitions()`, `add_compile_options()`, `add_compile_definitions()`, `link_directories()`, `link_libraries()` and `add_link_options()`. Exit 0 for `set(CMAKE_CXX_STANDARD 17)` and `include_regular_expression()`. The same files exit 0 on 4.4.5 under `-Werror=author`.
- The error fires inside `add_subdirectory()` dependencies too (`dep/CMakeLists.txt:1 (add_definitions)` exit 1 under `-Werror=author`). So FetchContent and vendored third-party projects that use directory commands turn a 4.5 gate leg red.
- Exits: `-Werror=author -Wno-error=non-target-directive` exit 0, and `-Werror=author -Wno-non-target-directive` exit 0. The absolute-destination case (`install(FILES ... DESTINATION /abs)`) still exits 1 under `-Werror=author` on both 4.4.2 and 4.5.1, so CMK-CORE-01's list of author children stays correct, with `strict` now sitting between author and `install-absolute-destination`.
- `-Werror=strict` and `-Werror=non-target-directive` and `-Wstrict` are accepted as separate arguments on 4.5.1 (an earlier attempt that joined them in one quoted argument failed with "warning category ... is not known", which is a test artefact, not a CMake behaviour).

Replacement fact for the gate text: on a 4.5 leg, the gate also fails legacy directory-scope commands; a project either migrates them to `target_*` commands or sets `-Wno-error=non-target-directive` on that leg, with a comment and an exit condition.

## skills/cmake-build-reference/versions-and-policies.md

5. "Features on `master` do not exist in 4.4.3: presets schema 13, `CMD_STRICT`, `CMD_NON_TARGET_DIRECTIVE` and `cmake_language(PRINT_TARGETS)`". Status: changed. All four shipped in 4.5.0 (2026-11-12): schema 13, `CMD_STRICT`, `CMD_NON_TARGET_DIRECTIVE` and `cmake_language(PRINT_TARGETS)` all appear in the 4.5 release notes. The sentence remains true for 4.4.x only if reworded as "do not exist in 4.4.x; they arrived in 4.5.0". The CMK-VER-04 anti-pattern at line 196 ("Citing a 4.5 or `master` feature as current") needs the same reword: 4.5 is released.
6. The versionadded table whose last row is 4.4. Status: changed. A 4.5 row is due. Verified items for 4.5 (from `4.5.rst` and the binary):
   - Presets schema 13; `${configurePresetName}` macro (configure, build, test, package presets, not workflow); preset fields `warnings.strict` and `warnings.nonTargetDirective`.
   - Diagnostics `CMD_STRICT`, `CMD_NON_TARGET_DIRECTIVE`.
   - Commands: `cmake_language(PRINT_PROPERTIES | PRINT_TARGETS | PRINT_VARIABLES)`, `add_custom_rule()`, `install(SBOM)`, `export(SBOM)`, `if(PATH_IS_PREFIX)`, `if(RULE)`, `math(INCREMENT | DECREMENT)`, `string(JSON ARRAY_SPLIT)`, `function()` sets `ARGNC`, `discover_tests(BUILD_DEPENDS)`, `install(TARGETS ... RUNTIME_DEPENDENCY_TARGETS)`, `install(... BUILD_DEPENDS)`.
   - Alias targets accepted by `add_dependencies`, `install`, `export`, `set_property`, `set_target_properties` and the `target_*` commands.
   - Generated targets `install_prep/*` and `test_prep/*` by default on Ninja and Makefile generators (`CMAKE_SKIP_INSTALL_PREP_TARGETS`, `CMAKE_SKIP_TEST_PREP_TARGETS`); `CMAKE_TEST_BUILD_DEPENDS` variable no longer honoured.
   - `ctest --out-of-date`; `cmake --list-presets=defined`.
   - `import std` for all C++20 code with `CXX_SCAN_FOR_MODULES`.
   - CPS `executable` components; `CMAKE_SYSTEM_ENVIRONMENT_ID` environment variable.
   - Removed: the `Visual Studio 14 2015` generator. Deprecated (with a diagnostic): `install_files`, `install_programs`, `install_targets`, `make_directory`, `remove`, `subdirs`, `write_file`; `cmake_print_properties` and `cmake_print_variables` (module `CMakePrintHelpers`).
   - Behaviour changes without a policy: `cmake --install` now exits non-zero when an install script fails; `cmake --build` groups output per recipe for parallel GNU Make builds that CMake itself parallelises.
7. "77 policies arrived after 3.25, as of 4.4.2". Status: unchanged for 4.4.2 (reproduced: 77 policies with `versionadded` above 3.25, from `--help-policy-list` plus `--help-policy`; the plain count of `CMP0142` and up gives 78, so the file's counting basis is `versionadded`). 4.5.1 total: 84 (220 listed on 4.4.2/4.4.5, 227 on 4.5.1). 4.4.3 to 4.4.5 added no policy (`--help-policy-list` identical on 4.4.2 and 4.4.5).
8. DECIDE set (CMP0155, CMP0168 to CMP0170, CMP0176, CMP0177). Status: unchanged for 4.4. Seven new policies exist in 4.5.0, all `versionadded:: 4.5`:
   - CMP0220: languages enabled in subdirectories (`project()`, `enable_language()`) propagate to ancestor scopes, including through `block()` and `function()`. Quiet behaviour change.
   - CMP0221: `cmake_host_system_information(DISTRIB_*)` reads the host os-release, not the one under `CMAKE_SYSROOT`. Changes cross-compile results.
   - CMP0222: `if(PATH_IS_PREFIX)` operator is interpreted (OLD ignores it). Feature gate.
   - CMP0223: an empty path is not a prefix of any path (`cmake_path(IS_PREFIX)`, `$<PATH:IS_PREFIX>`). Quiet behaviour change.
   - CMP0224: test fixtures run in `AROUND_EACH_REPEAT` mode under `ctest --repeat`. Only affects `--repeat` users.
   - CMP0225: `ExternalProject_Add()` default configure command passes `CMAKE_INSTALL_PREFIX=<INSTALL_DIR>`. Changes where an external CMake project installs (previously `/usr/local`). Quiet.
   - CMP0226: `Swift_MODULE_NAME` applied under the Xcode generator. Platform plumbing.
   Recommendation for the DECIDE set (owner may overrule): add CMP0220, CMP0221 and CMP0225. They change a build quietly when the `<max>` bound reaches 4.5 and they touch what this pair already covers (project layout, cross builds, ExternalProject install prefixes). Do not add CMP0222 to CMP0224 or CMP0226: new-feature gate, rare option, or platform plumbing. CMK-VER-08 wording "these six" becomes "these nine" if all three are added.
9. "CMP0177 OLD passes on 3.31.12 through 4.4.2, CMP0155 OLD ... fails the 4.4.2 gate". Status: unchanged, extended. Measured 2026-11-27 with `cmake_minimum_required(VERSION 3.25...4.4)` and `if(POLICY X) cmake_policy(SET X OLD)`: CMP0177 OLD exit 0 under `-Werror=dev` and `-Werror=author` on 4.4.2, 4.4.5 and 4.5.1. CMP0155 OLD exit 1 on all three. CMP0126 OLD exit 1 on all three. So the sentence "CMP0177 OLD passes on 3.31.12 through 4.4.2" can read "through 4.5.1".

## skills/cmake-build-reference/presets-and-ci.md

10. Schema table row "13 | not released (4.5, as of 2026-09-26)". Status: changed. Replacement: "13 | 4.5" (CMake 4.5.0, released 2026-11-12; `4.5.rst`: "cmake-presets(7) files now support schema version 13"). Measured 2026-11-27: 4.5.1 accepts up to 13 and rejects 14 ("must be >=1 and <=13"); 4.4.5 rejects 13 ("must be >=1 and <=12"). The sentence "4.4.2 up to 12" holds for 4.4.5 too. Schema 13 adds `warnings.strict`, `warnings.nonTargetDirective` and the `${configurePresetName}` macro (cmake-presets 4.5.1, lines for version 13). The "as of v4.4.2" source citation of the table should add v4.5.1.
11. "`cmake --presets-file` (CMake >= 4.4)". Status: unchanged. 4.5.1 `cmake --help` still lists `--presets-file <file>`.

## Other files

12. `PARSE_ARGN` 4.4 (language.md, CMK-LANG-05). Unchanged: 4.5.1 `--help-command cmake_parse_arguments` still lists the `PARSE_ARGN` signature, function-only.
13. `cmake -P` gate result (testing.md, CMK-TEST-02). Unchanged: `cmake -Werror=dev -P` and `-Werror=author -P` on an AUTHOR_WARNING script exit 1 on 4.4.2 and 4.5.1.
14. `discover_tests()` 4.4 (CMK-TEST-10). Unchanged on the 4.4 introduction (`versionadded:: 4.4`). New in 4.5: `discover_tests(BUILD_DEPENDS)` and `ctest --out-of-date`.
15. Configure-log `find_package-v1` events from 4.1 (dependencies.md, CMK-DEP-16). Could not determine whether 4.5 changed the configure-log schema: `4.5.rst` mentions none, and no measurement was run.
16. CMP0170 default the offline probes pass (CMK-DEP-17, Re-check D1). Unchanged: CMP0170 is still `versionadded:: 3.30` on 4.5.1; no 4.5 note touches it.

# New normative candidates

1. Rule: on a 4.5 or newer CI leg, run the gate and handle `non-target-directive` explicitly: either migrate directory-scope `include_directories`, `add_definitions`, `add_compile_options`, `add_compile_definitions`, `link_directories`, `link_libraries` and `add_link_options` to `target_*`, or pass `-Wno-error=non-target-directive` with a comment naming the reason and exit. Rationale: `-Werror=author` fails them on 4.5.x including inside fetched subprojects, and exits 0 on 4.4.5. Verification: the two canaries stay green, plus `cmake -S . -B b --fresh -Werror=author` on the 4.5 binary; reading heuristic `grep -rnE '^\s*(include_directories|add_definitions|add_compile_options|add_compile_definitions|link_directories|link_libraries|add_link_options)\s*\(' --include=CMakeLists.txt --include=*.cmake .` outside `_deps` and `build*`.
2. Rule: a schema-13 presets file is read only by 4.5 or newer; keep the committed version at the ceiling of the oldest CMake any leg runs (extends CMK-CI-01). Verification: the existing `jq` block, plus run `cmake --list-presets` on each leg's binary.
3. Rule: guard use of `strict` and `nonTargetDirective` preset fields behind schema 13. Verification: same `jq` block plus `grep -n 'nonTargetDirective\|"strict"'` on a file whose version is below 13.
4. Rule (CMK-VER-08 extension): add CMP0220, CMP0221 and CMP0225 to the DECIDE set. Verification: reading heuristic, a diff that raises `<max>` to 4.5 and names none of them.

# AI-agent angle

- An agent trained before 4.5 writes that `-Werror=author` is "safe" because it only covers the 4.4 categories. On 4.5 it also fails `add_definitions()` and similar. Catch: run the canary and a configure with the 4.5 binary.
- An agent writes `cmake_print_variables()` or `cmake_print_properties()` as current; both are deprecated in 4.5 in favour of `cmake_language(PRINT_VARIABLES | PRINT_PROPERTIES)`. Catch: grep for `cmake_print_`.
- An agent treats schema 13 as unreleased (per the old table). Catch: `cmake --list-presets` on the 4.5 binary.

# Flags for the owner (not decided here)

- Pinned range `3.25...4.4`. 4.5.0 and 4.5.1 are released and measured. Moving the upper bound to 4.5 flips CMP0220 to CMP0226 to NEW for projects that use the range. Owner decision.
- Top CI binary (`BIN=/opt/cmake-4.4.2/bin`, "Verified ... on 4.4.2"). 4.4.5 is the newest 4.4.x and behaves identically on every measured point; 4.5.1 changes the gate (see "CHANGED"). Moving the top binary to 4.5.1 needs the non-target-directive handling above. Owner decision.
- 3.31 line: no release after 3.31.12 (2026-04-20) at the time of reading.
- The files cite v4.4.3; the newest 4.4 tag is v4.4.5 and its documented content is the same (no feature changes), so the v4.4.3 citation can stay or move to v4.4.5 at no cost.

# Could not determine

- Discourse release announcements and the GitLab tag page: not read (GitLab returned 403; announcements not fetched). The GitHub mirror release notes carry the same content.
- Configure-log `find_package-v1` events in 4.5 (item 15).
- Which 4.5.0-rc changes were later reverted; irrelevant to the released behaviour measured on 4.5.0 and 4.5.1.

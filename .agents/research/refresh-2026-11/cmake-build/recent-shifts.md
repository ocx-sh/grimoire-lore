---
title: CMake build pair, recent shifts not yet covered (2026-09-26 to 2026-11-27)
pair: cmake-build
date_researched: 2026-11-27
window_start: 2026-09-26
model: sonnet
sources_fetched: 24
---

# CMake build pair: recent shifts not yet covered

This is a delta over the baseline of 2026-09-26. It asks only what is new in the window and absent from `rules/cmake-build.md` and `skills/cmake-build-reference/`. Re-checks of existing claims belong to the other briefs.

## Summary

- The one event that matters is CMake 4.5.0, tagged 2026-11-12 (rc1 2026-10-15, rc2 2026-10-28, rc3 2026-11-04), followed by 4.5.1 on 2026-11-19. Source: [GitHub tags](https://github.com/Kitware/CMake/tags). The pair says "not released (4.5, as of 2026-09-26)" in `presets-and-ci.md` line 63 and defers 4.5 to its own D1 re-check items, so every 4.5 row is a new row.
- Patch releases in the window: 4.4.4 (2026-10-02), 4.4.5 (2026-10-27), 4.3.5 and 4.2.8 (2026-09-04, just before the window), 4.3.6 (2026-10-27). The gate is written against 4.4.2, which is now three patches stale.
- Highest-impact new authoring surface: `CMD_STRICT` and `CMD_NON_TARGET_DIRECTIVE` diagnostics with presets schema 13. They give a machine check for what `CMK-TGT-03` only greps for.
- `install(SBOM)`, `export(SBOM)` and `CMAKE_INSTALL_SBOM_FORMATS` now exist (4.5). The sentence "CPack and SBOM generation carry no rule" in `install-and-export.md` line 8 is still true for the measured-failure test but no longer for the feature: a rule about an unwanted implicit SBOM and about an explicit one is possible.
- `cmake --install` now exits non-zero when an install script fails, and an invalid `install(SCRIPT CODE ...)` form that older CMake accepted now errors. This changes what a "green install" means in `CMK-INST-01`.
- New policies CMP0220 to CMP0226. CMP0225 (ExternalProject default configure sets `CMAKE_INSTALL_PREFIX` to `INSTALL_DIR`) and CMP0220 (languages enabled in subdirectories propagate) touch existing rules. The pair counts policies "past 3.25 (77 as of 4.4.2)" in `versions-and-policies.md`; that count is now 77 plus CMP0220 to CMP0226 minus nothing, check against the pinned binary.
- Nothing found for security, FetchContent and `file(DOWNLOAD)`, CPS adoption outside CMake, and Kitware supply-chain guidance.

## Findings

### 1. CMake 4.5 features that change authoring practice

Release notes: [CMake 4.5 release notes](https://cmake.org/cmake/help/v4.5/release/4.5.html), read at 4.5.1. Release dates: [GitHub tags](https://github.com/Kitware/CMake/tags) and [GitHub releases](https://github.com/Kitware/CMake/releases), 2026-11-27.

**1a. `CMD_STRICT` shipped, with a child `CMD_NON_TARGET_DIRECTIVE`.**
- [CMD_STRICT](https://cmake.org/cmake/help/v4.5/diagnostic/CMD_STRICT.html): "allowed but disrecommended usage", default action ignore, added in 4.5. Children: `CMD_INSTALL_ABSOLUTE_DESTINATION` and `CMD_NON_TARGET_DIRECTIVE`. Switches: `-Wstrict`, `-Werror=strict`, presets `warnings.strict` and `errors.strict`.
- [CMD_NON_TARGET_DIRECTIVE](https://cmake.org/cmake/help/v4.5/diagnostic/CMD_NON_TARGET_DIRECTIVE.html): "non-target directives which alter the build environment". Default ignore. Switches: `-Wnon-target-directive`, `-Werror=non-target-directive`, presets `warnings.nonTargetDirective` and `errors.nonTargetDirective`. The page does not list which commands it covers. Which commands fire is therefore not determined from docs and needs a measurement on a 4.5.1 binary.
- The category list in [cmake-diagnostics(7)](https://cmake.org/cmake/help/v4.5/manual/cmake-diagnostics.7.html) is nine: `CMD_AUTHOR`, `CMD_DEPRECATED`, `CMD_EXPERIMENTAL`, `CMD_INSTALL_ABSOLUTE_DESTINATION`, `CMD_NON_TARGET_DIRECTIVE`, `CMD_POLICY`, `CMD_STRICT`, `CMD_UNINITIALIZED`, `CMD_UNUSED_CLI`. The pair does not mention `CMD_STRICT` except as a thing not to cite as current (`versions-and-policies.md` line 196) and does not mention the other categories except `CMD_AUTHOR` through the gate. `CMD_UNINITIALIZED` is relevant to `CMK-CORE-03` ("uninitialized variables stay ignored under either gate spelling"): the pair's rule rests on a measurement that should be repeated on 4.5.1 to see whether `-Werror=uninitialized` now maps to this category.
- Precedence of initial state, from the manual: default action, then cache, then presets `warnings` and `errors`, then command-line `-W` arguments, applied recursively and in order.

**1b. Presets schema 13.** [cmake-presets(7)](https://cmake.org/cmake/help/v4.5/manual/cmake-presets.7.html): version 13 adds `strict` and `nonTargetDirective` to `warnings` and `errors`, and the `${configurePresetName}` macro (not available in workflow presets). `errors.strict` may not be `true` while `warnings.strict` is `false`. Fields `dev` was renamed to `author` at schema 12, and `deprecated` is unchanged at 12 and 13. This confirms the existing `CMK-CORE-02` text and extends the `CMK-CI-01` table row 13 (currently "not released").

**1c. New commands and keywords (feature rows for `CMK-VER-04`).** From the 4.5 release notes: `add_custom_rule()`, `cmake_language(PRINT_PROPERTIES|PRINT_TARGETS|PRINT_VARIABLES)`, `math(INCREMENT|DECREMENT)`, `if(PATH_IS_PREFIX)` and `if(RULE)`, `string(JSON ... ARRAY_SPLIT)`, `function()` sets `ARGC`, alias targets accepted by `install()`, `export()`, `set_property()`, `set_target_properties()` and the `target_*()` commands, `install(TARGETS ... RUNTIME_DEPENDENCY_TARGETS)`, `BUILD_DEPENDS` on `install(FILES|PROGRAMS|DIRECTORY|SCRIPT|CODE)` and on `discover_tests()`, new `$<ARGS>`, `$<DIRECTORY_PROPERTY>`, `$<GLOBAL_PROPERTY>`, `$<RULE_PROPERTY>`, `LIST` `PREDICATE`, `REGEX`, `COMPARATOR` and `APPLY` options, and file-set properties (`FILE_SET_TYPES` and others). `add_custom_rule` page: no experimental gate, [added in 4.5](https://cmake.org/cmake/help/v4.5/command/add_custom_rule.html). Deprecated in 4.5: `cmake_print_properties()` and `cmake_print_variables()` (CMakePrintHelpers) in favour of `cmake_language(PRINT_*)`, and now emitting deprecation diagnostics: `install_files()`, `install_programs()`, `install_targets()`, `make_directory()`, `remove()`, `subdirs()`, `write_file()`. Removed: the Visual Studio 14 2015 generator.

**1d. Behaviour that changes what a pass means.**
- "`cmake --install` returns a non-zero exit code when an install script fails" (4.5 notes). Matters to `CMK-INST-01` and to `bazel-seam.md`'s `cmake --install` steps.
- Invalid `install(SCRIPT CODE ...)` now errors. A [Discourse thread of 2026-11-23](https://discourse.cmake.org/t/cmake-4-5-0-new-problems/) (fish, sra-tools) shows `install SCRIPT given invalid argument ... missing required value`: older CMake accepted it silently. Another failure in that thread: an empty `CMAKE_TOOLCHAIN_FILE` inside a `try_compile` (cvc5), fixed in the project.
- `cmake --build` with GNU Make 4.0+ groups recipe output in parallel builds unless `-- -j` is passed.
- New `install_prep/all`, `install_prep/<component>` and `test_prep/<test>` targets, skipped with `CMAKE_SKIP_INSTALL_PREP_TARGETS` and `CMAKE_SKIP_TEST_PREP_TARGETS`. `CMAKE_TEST_BUILD_DEPENDS` is no longer honoured.
- `import std` now available for C++20 and later when `CXX_SCAN_FOR_MODULES` is on; `CMAKE_CXX_STDLIB_MODULES_JSON` sets the metadata path. Relevant to `CMK-TGT-18`, which currently tells C++20 users without module sources to turn scanning OFF.

**1e. Policies.** [Policy list](https://cmake.org/cmake/help/v4.5/manual/cmake-policies.7.html): CMP0219 (4.4: macro invocations preserve backslashes; pre-window, not examined), CMP0220 to CMP0226 (4.5).
- CMP0220, [full text](https://cmake.org/cmake/help/v4.5/policy/CMP0220.html): languages enabled in a subdirectory, function or block propagate to ancestors and later siblings. OLD (unset) does not warn. Old text to change: none in the pair; closest is the `project()` placement convention, not a CMK row.
- CMP0225, [full text](https://cmake.org/cmake/help/v4.5/policy/CMP0225.html): the default `ExternalProject_Add` configure command now sets `CMAKE_INSTALL_PREFIX` to `INSTALL_DIR`; unset warns and uses OLD; it also prepends the prefix to `CMAKE_SYSTEM_PREFIX_PATH` even with `INSTALL_COMMAND ""`, and switching in an existing build tree overwrites the cached prefix. A `CMAKE_ARGS` prefix still wins.
- CMP0224: `ctest --repeat` uses `AROUND_EACH_REPEAT` for fixtures by default. Relevant to `CMK-TEST-08`.
- CMP0221, CMP0222, CMP0223, CMP0226: host os-release for `DISTRIB_*`, `PATH_IS_PREFIX`, empty path no longer a prefix, Swift module name on Xcode. No pair row touched.

**1f. CTest.** [ctest(1)](https://cmake.org/cmake/help/v4.5/manual/ctest.1.html): `--out-of-date` runs only tests whose recorded build dependencies are newer than their last run and excludes tests without known dependencies; `--show-only=json-v1-raw`; `INCLUDE_LABEL` and `EXCLUDE_LABEL` accept several values; `RESOURCE_ERROR_ACTION`; Windows job-server. The page was truncated after 100000 characters, so the `test_prep` and CMP0224 text was not read there; the release notes carry them. Whether `--out-of-date` can silently skip tests is a reading of the page, not a measurement.

**1g. Instrumentation.** 4.5 notes: data version 1.2, interrupted `cmakeBuild`, `cmakeInstall` and `ctest` snippets recorded with `interruptSignal`, `ctest -F` resumes interrupted runs, `cmake -E capabilities` gains an `instrumentation` object. Nothing in the pair covers instrumentation. No rule candidate: it is observability, not correctness.

**1h. File-Based API.** Codemodel 2.12 adds `interfaceIncludes`. No rule.

### 2. SBOM generation

Old text (`install-and-export.md` line 8): "CPack and SBOM generation carry no rule: no measured failure depends on them (as of 2026-09-26)."
Status: changed in capability, unchanged in measured failures.
- Sources: [install()](https://cmake.org/cmake/help/v4.5/command/install.html), [export()](https://cmake.org/cmake/help/v4.5/command/export.html), [CMAKE_INSTALL_SBOM_FORMATS](https://cmake.org/cmake/help/v4.5/variable/CMAKE_INSTALL_SBOM_FORMATS.html), all added in 4.5.0 (2026-11-12).
- `install(SBOM <name> EXPORTS <export-names>... [PROJECT|NO_PROJECT_METADATA] [DESTINATION] [VERSION] [DATA_LICENSE] [DEFAULT_LICENSE] [DESCRIPTION] [HOMEPAGE_URL] [PACKAGE_URL] [FORMAT])`. Default format SPDX 3.0.1 JSON-LD (`FORMAT` accepts `spdx` or `spdx-3.0.1+json`). No experimental gate stated on the page. Component license comes from the `SPDX_LICENSE` target property, falling back to `DEFAULT_LICENSE`. An SBOM cannot be generated for targets whose `LINK_LIBRARIES` or `INTERFACE_LINK_LIBRARIES` contain generator expressions not guarded by `LINK_ONLY`.
- `export(SBOM ...)` writes to `sbom/<name>` under the build directory.
- `CMAKE_INSTALL_SBOM_FORMATS` (values `spdx`, `spdx-3.0+json`; unset or empty means none): turns on automatic SBOM for every export set made by `install(TARGETS ... EXPORT ...)`, skipping sets with an explicit `install(SBOM)`, installing to `<libdir>/sbom/<export-name>`. A distributor can switch this on without editing project scripts, which is the cross-cutting risk: a library with a generator-expression link line can then fail configure or install from a variable it never set. That failure is an inference from the page, not measured.
- Verdict: a documentation-level rule is justified now; a hard rule is not, because no measured failure exists and nobody can measure on a 4.4 pin.

### 3. FetchContent, ExternalProject and `file(DOWNLOAD)`

- FetchContent: [module page at 4.5](https://cmake.org/cmake/help/v4.5/module/FetchContent.html) has no "Added in 4.4" or "Added in 4.5" marker; newest marker is 3.29. Unchanged. Nothing found.
- `file(DOWNLOAD)`: [file()](https://cmake.org/cmake/help/v4.5/command/file.html) shows 4.4 and 4.5 markers only for `READ_SYMLINK`, `ARCHIVE_CREATE`, `ARCHIVE_EXTRACT` (4.5 adds `PATTERNS_EXCLUDE`) and `GET_RUNTIME_DEPENDENCIES` on FreeBSD. No new verification, signature or retry option. Nothing found for the download path.
- ExternalProject: CMP0225 only (section 1e). A [Discourse topic of 2026-11-27](https://discourse.cmake.org/c/announcements/9) asks whether `ExternalProject` should retry downloads on curl error 56. It is a proposal, not a feature, and its page returned 404 when opened, so only the title was read.
- A Discourse title of 2026-10-01, "FetchContent_Declare issues misleading error message", appears in the same listing; its body was not read. Could not determine.

### 4. Security

- [Kitware/CMake security advisories](https://github.com/Kitware/CMake/security/advisories): "There aren't any published security advisories." Nothing found.
- Web search for 2026 CMake CVEs returned only CVE-2025-9301 (ForEach assertion failure, fixed in 3.31.11 per Fedora, pre-window) and distro tracker entries for CVE-2026-8286, which [OSV](https://osv.dev/vulnerability/CVE-2026-8286) describes as a curl bug ("wrong STARTTLS connection reuse", published 2026-07-03). That is a bundled-library tracker row, not a CMake advisory. I did not open cve.org or the GitHub advisory database search pages for "cmake" directly. Marked "could not determine" for those two, "nothing found" for Kitware itself.
- The [Kitware blog first pages](https://www.kitware.com/blog/) 2026-10-27 to 2026-11-25 carry no CMake, SBOM, CPS or supply-chain post by title. Posts before 2026-10-27 were not reached.
- OpenSSF guidance on CMake fetches: not found.

### 5. CPS outside CMake

- The [CPS site](https://cps-org.github.io/cps/history.html) documents v0.15.0 and shows no dates, so a window change cannot be established. Could not determine.
- [pkgconf releases](https://github.com/pkgconf/pkgconf/releases): 3.0.7 (2026-09-04), 3.0.8 (10-08), 3.0.9 (10-15), 3.0.10 (10-19), 3.0.11 (11-14), notes are a version line only. No CPS mention.
- [Meson releases](https://github.com/mesonbuild/meson/releases): 1.12.1 (2026-09-22) and 1.13.0rc1 (2026-11-23), no notes on the page. Could not determine.
- A web search found only secondary summaries and no confirmation of vcpkg or Conan CPS changes in the window; those are the sibling pair's scope. Within CMake itself, 4.5 adds `find_package()` importing CPS executable components, and CPS import and export of header file sets. That is the only item that changes what a CMake project exports.

### 6. Tooling

- gersemi: [0.29.2 on 2026-10-01](https://github.com/BlankSpruce/gersemi/releases) fixes a regression formatting unknown commands (0.29.1 is the version the gate and `CMK-CORE-04` name; 0.29.0 added `--stdin-filepath`). No new lint checks and no CMake 4.5 syntax note. Whether 0.29.2 changes `--check` results on the tracked-file gate was not measured. Changed: pin version.
- Ninja: [v1.13.2 on 2026-11-20](https://github.com/ninja-build/ninja/releases) "Fix Ninja exit code when interrupted". The listing's dates for older releases did not look consistent, so no other Ninja claim is made. No module-scanning change found.
- cmake-lint: [1.4.3 (12 May, year not shown)](https://github.com/cmake-lint/cmake-lint/releases), no change in window that could be read. No CMake language server or cmake-format successor was investigated; not found.

### 7. Contradicting guidance

Nothing found that contradicts a rule. Two things come close, both from Kitware's own 4.5 notes rather than community guidance. First, `CMD_NON_TARGET_DIRECTIVE` agrees with `CMK-TGT-03`. Second, `CMAKE_CXX_SCAN_FOR_MODULES OFF` advice in `CMK-TGT-18` is not contradicted, but `import std` for C++20 now exists, so the advice should name the 4.5 behaviour. The Discourse list also shows "Efforts to reduce duplication of features in CMake" (2026-10-28), "Suggestion for CMake 5" (2026-09-02) and "ctest: property to exclude a test from default runs unless selected with -R" (2026-11-01); titles only, not read.

### Claims at risk

| Claim in pair | Status | Detail |
|---|---|---|
| `presets-and-ci.md` row "13, not released (4.5, as of 2026-09-26)" | changed | 4.5.0 released 2026-11-12 adds `strict`, `nonTargetDirective` and `${configurePresetName}` at schema 13. [cmake-presets(7)](https://cmake.org/cmake/help/v4.5/manual/cmake-presets.7.html) |
| `install-and-export.md` "SBOM ... carry no rule" | changed (feature exists) | `install(SBOM)` etc. since 2026-11-12. Measured-failure basis still unchanged |
| `versions-and-policies.md` "Citing a 4.5 or master feature as current (schema 13, CMD_STRICT, PRINT_TARGETS)" | changed | All three released in 4.5.0. Wording to become "gate behind 4.5" |
| Gate "-Werror=author on >= 4.4, -Werror=dev on <= 4.3" | could not determine on 4.5.1 | No binary run here; the other briefs own the D1 re-measure |
| "77 policies past 3.25 (as of 4.4.2)" | changed | CMP0219 (4.4) and CMP0220 to CMP0226 (4.5) added since; recount on the pin |
| Pinned CMake 4.4.2 in the gate | changed | 4.4.4 (2026-10-02), 4.4.5 (2026-10-27) and 4.5.1 (2026-11-19) exist |
| Hosted-image CMake versions (3.31.6, 4.4.2) | could not determine | Runner images not checked |
| FetchContent, `file(DOWNLOAD)` rules | unchanged | No 4.4 or 4.5 markers |
| Security posture | unchanged | No advisory published by Kitware |

## Normative guidance candidates

Ranked by likely impact. "Measurable on pin" means a pinned binary at 4.5.1 or newer can prove it; nothing here is `master`-only, since every item below shipped in the 4.5.0 tag.

1. **Strict diagnostics as an opt-in gate, `CMK-CORE-06` (SHOULD, index).**
   - Rule: "On a leg pinned to CMake 4.5 or newer, a library you author runs one extra configure with `-Werror=non-target-directive`, or a preset with `errors.nonTargetDirective: true` at schema 13. Never enable `errors.strict` on a library that is fetched by others, because a parent's `CMD_STRICT` also covers `CMD_INSTALL_ABSOLUTE_DESTINATION`."
   - Rationale: `CMK-TGT-03` is a grep that misses indirect calls; the category is the compiler's own check.
   - Verification: configure with the flag on the pin and expect exit 1 on a canary calling `include_directories(.)`; expect exit 0 on the clean tree. First measure which commands fire (the page does not say).
   - Severity: SHOULD, since the default is ignore and the pair's floor is 3.25. Measurable on pin: yes, 4.5.1.
   - Owner: `rules/cmake-build.md` gate section, with a pointer from `targets.md` (`CMK-TGT-03`).
2. **Schema 13 row, `CMK-CI-01` table (new row, no new rule).**
   - Sentence: "Schema 13 adds `warnings.strict`, `errors.strict`, `warnings.nonTargetDirective`, `errors.nonTargetDirective` and `${configurePresetName}`; a presets file that uses them declares `"version": 13` and parses only on 4.5 or newer."
   - Verification: `cmake --list-presets` on the oldest CI CMake exits non-zero on a schema it does not know. MUST-level follows from the existing `CMK-CI-01`. Measurable on pin: yes.
   - Owner: `presets-and-ci.md`.
3. **`cmake --install` exit code and `install(SCRIPT CODE)`, extension of `CMK-INST-01` (SHOULD).**
   - Rule: "Count `install(SCRIPT CODE ...)`: spell it `install(CODE ...)` or `install(SCRIPT <file>)`; and on 4.5 expect a failing install script to fail the round trip, where 4.4 and older exited 0."
   - Rationale: the 2026-11-23 Discourse thread shows two real projects (fish, sra-tools) broken by 4.5.0.
   - Verification: `grep -n -E 'install\(SCRIPT[[:space:]]+CODE' ` over tracked listfiles; round trip on 4.4.5 and 4.5.1 compares exit codes.
   - Severity: SHOULD for the grep, informational for the exit code. Measurable on pin: yes. Owner: `install-and-export.md`.
4. **Version-row batch for `CMK-VER-04` (rows, not a rule).** Add 4.5 rows: `add_custom_rule`, `cmake_language(PRINT_*)`, `install(SBOM)` and `export(SBOM)`, `CMAKE_INSTALL_SBOM_FORMATS`, `install(... RUNTIME_DEPENDENCY_TARGETS)`, `BUILD_DEPENDS`, `PATH_IS_PREFIX`, `ctest --out-of-date`, schema 13, `CMD_STRICT`, `CMD_NON_TARGET_DIRECTIVE`. Verification: `cmake --help-command <name>` on the pin; the CMK-VER-04 grep. Remove the "Citing a 4.5 feature" pitfall's three examples or retarget it to 4.6/master. Owner: `versions-and-policies.md`.
5. **Policies CMP0220 and CMP0225 into the `CMK-VER-08` decide set.** Sentence: "Adopt CMP0225 NEW for a project whose ExternalProject default configure relied on a system install prefix, and rerun the offline configure afterwards; set CMP0220 NEW only when a subdirectory enables a language used by a sibling." Rationale: CMP0225 changes `CMAKE_SYSTEM_PREFIX_PATH` and so `find_*()` results (it can change which copy wins, adjacent to `CMK-DEP-13`). Verification: `cmake --help-policy CMP0225`; configure with `-DCMAKE_POLICY_DEFAULT_CMP0225=NEW` on the pin and diff `CMakeCache.txt` `<Pkg>_DIR`. Severity: SHOULD. Measurable on pin: yes. Owner: `versions-and-policies.md`, cross-reference `dependencies.md` for ExternalProject.
6. **SBOM, soft rule `CMK-INST-25` (CONSIDER).** Sentence: "If a library ships an SBOM, use an explicit `install(SBOM ... EXPORTS ...)` guarded by `CMAKE_VERSION VERSION_GREATER_EQUAL 4.5`, give each exported target `SPDX_LICENSE`, and keep generator expressions in link properties inside `$<LINK_ONLY:...>`." Rationale: `CMAKE_INSTALL_SBOM_FORMATS` can switch generation on from outside; the generator-expression limit is stated on the page. Verification: install with `-DCMAKE_INSTALL_SBOM_FORMATS=spdx` on the pin and expect `<libdir>/sbom/<export>` and exit 0; grep for `install\(SBOM`. Severity: CONSIDER until a failure is measured. Measurable on pin: yes. Owner: `install-and-export.md`, and rewrite the "no rule" sentence at line 8.
7. **`CMK-TGT-18` update.** Replace "raising to C++20 without module sources sets `CMAKE_CXX_SCAN_FOR_MODULES OFF`" with a note that 4.5 offers `import std` when scanning is on; keep the rule for sources that do not use modules. Verification: unchanged. Severity unchanged. Measurable on pin: yes. Owner: `targets.md`.
8. **Tool pin bump (no rule).** Gate lines that say "gersemi 0.29.1" take 0.29.2 and the pin line takes 4.4.5 and 4.5.1; verification is the full gate on the new pins. Owner: index.
9. **`ctest --out-of-date` caution, `CMK-TEST-06` addition (CONSIDER).** "Never gate on `ctest --out-of-date`: it omits tests without recorded build dependencies, so a green run is not a full run." Verification: grep CI files for `--out-of-date`. Based on a reading of the page, not a measurement; measure before adopting. Owner: `testing.md`.

## AI-agent angle

- An LLM trained before November 2026 will say `CMD_STRICT`, schema 13, `install(SBOM)`, `add_custom_rule` and `cmake_language(PRINT_TARGETS)` do not exist, or will treat them as `master`-only. The pair's current pitfall says exactly that. Check: `cmake --help-command install | grep -n SBOM` on the pin.
- It will keep writing `-Werror=dev` and `"dev": false` presets, and will likely not know `-Werror=non-target-directive`. Check: the CMK-CORE-01 greps plus the canary.
- It will write `install(SCRIPT CODE ...)` by merging the two forms. Check: the grep in candidate 3.
- It will recommend `cmake_print_variables()` which is now deprecated. Check: `grep -rn 'cmake_print_variables\|cmake_print_properties'`.
- It will assume the CMake on a hosted runner is 4.4.2. Check: the pin rule `CMK-VER-03`.

## Contested / evolving

- Whether `CMD_STRICT` becomes a recommended default for new projects: Kitware ships it ignored by default; no guidance yet. Trend: tightening, as of 2026-11.
- SBOM: only SPDX 3.0.1 JSON-LD today and the interface "allows other formats later" (as of 2026-11-12). CycloneDX is not offered.
- CPS: spec is at 0.15.0 and 4.5 extends CMake's import and export (header file sets, executable components). Outside CMake no adoption evidence found. Contested whether to emit CPS beside Config files; existing `CMK-INST-14` stays.
- The 4.5.1 patch reverted a 4.5.0 `FindCUDAToolkit` target change because aliases did not carry through exports to CMake 4.4 and earlier consumers. This shows the mixed-version export risk the pair already handles in `CMK-INST-01`.
- The Discourse thread on C++20 modules with Makefiles ("never?", 2026-11-16) and `CMAKE_EXPERIMENTAL_CXX_IMPORT_STD` history (2026-11-17) suggest module support is still moving; not read.

## Sources

| URL | What | Date/era | Why |
|---|---|---|---|
| https://cmake.org/cmake/help/v4.5/release/4.5.html | 4.5 release notes (read at 4.5.1) | 2026-11-12 / 11-19 | Primary, whole delta |
| https://github.com/Kitware/CMake/tags | Tag list | to 2026-11-19 | Primary, release dates |
| https://github.com/Kitware/CMake/releases | Release list | to 2026-11-19 | Primary, patch dates; v4.4.3 not shown |
| https://cmake.org/cmake/help/v4.5/manual/cmake-diagnostics.7.html | Diagnostics manual | 4.4/4.5 | Primary, categories and precedence |
| https://cmake.org/cmake/help/v4.5/diagnostic/CMD_STRICT.html | Category page | 4.5 | Primary |
| https://cmake.org/cmake/help/v4.5/diagnostic/CMD_NON_TARGET_DIRECTIVE.html | Category page | 4.5 | Primary |
| https://cmake.org/cmake/help/v4.5/command/cmake_diagnostic.html | Command page | 4.4/4.5 | Primary, actions and stack |
| https://cmake.org/cmake/help/v4.5/manual/cmake-presets.7.html | Presets manual | 4.5 | Primary, schema 13 |
| https://cmake.org/cmake/help/v4.5/manual/cmake-policies.7.html | Policy list | 4.5 | Primary, CMP0219 to CMP0226 |
| https://cmake.org/cmake/help/v4.5/policy/CMP0220.html | Policy page | 4.5 | Primary |
| https://cmake.org/cmake/help/v4.5/policy/CMP0225.html | Policy page | 4.5 | Primary |
| https://cmake.org/cmake/help/v4.5/command/install.html | install(SBOM) and friends | 4.5 | Primary |
| https://cmake.org/cmake/help/v4.5/command/export.html | export(SBOM) | 4.5 | Primary |
| https://cmake.org/cmake/help/v4.5/variable/CMAKE_INSTALL_SBOM_FORMATS.html | Variable page | 4.5 | Primary |
| https://cmake.org/cmake/help/v4.5/command/add_custom_rule.html | Command page | 4.5 | Primary |
| https://cmake.org/cmake/help/v4.5/module/FetchContent.html | FetchContent module | 4.5 | Primary, negative result |
| https://cmake.org/cmake/help/v4.5/command/file.html | file() | 4.5 | Primary, negative result |
| https://cmake.org/cmake/help/v4.5/manual/ctest.1.html | ctest manual (truncated at 100000 chars) | 4.5 | Primary |
| https://discourse.cmake.org/c/announcements/9 | Discourse listing | to 2026-11-27 | Community, titles only |
| https://discourse.cmake.org/t/cmake-4-5-0-new-problems/ | 4.5.0 breakage thread | 2026-11-23 | Community, real failures |
| https://github.com/Kitware/CMake/security/advisories | Advisory list | 2026-11-27 | Primary, negative result |
| https://osv.dev/vulnerability/CVE-2026-8286 | curl CVE | 2026-07-03 | Secondary, rules out a CMake CVE |
| https://www.kitware.com/blog/ | Kitware blog first pages | 2026-10-27 to 11-25 | Primary, negative result |
| https://github.com/BlankSpruce/gersemi/releases | gersemi releases | 2026-09 to 10 | Primary, tooling |
| https://github.com/ninja-build/ninja/releases | Ninja releases | to 2026-11-20 | Primary, tooling |
| https://github.com/pkgconf/pkgconf/releases | pkgconf releases | 2026-09 to 11 | Primary, CPS negative |
| https://github.com/mesonbuild/meson/releases | Meson releases | 2026-09 to 11 | Primary, no notes |
| https://cps-org.github.io/cps/history.html | CPS spec page | v0.15.0, undated | Primary, no dates |
| https://github.com/cmake-lint/cmake-lint/releases | cmake-lint releases | 1.4.3 | Primary, tooling |

Not reached, so no claim made: cve.org and GitHub advisory database search pages, the Kitware GitLab issue tracker, Kitware blog posts before 2026-10-27, per-release notes for 4.4.3 to 4.4.5, runner image versions, the body of individual Discourse threads other than 2026-11-23.

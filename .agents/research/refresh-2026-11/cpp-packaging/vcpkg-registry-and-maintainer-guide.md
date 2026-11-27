---
title: vcpkg registry and maintainer guide, delta 2026-09-26 to 2026-11-27
pair: cpp-packaging
date_researched: 2026-11-27
window_start: 2026-09-26
model: sonnet
sources_fetched: 21
---

# vcpkg registry and maintainer guide, delta

This is a delta against the corpus snapshot of 2026-09-25. All facts below were read from the GitHub API raw contents of the named refs on 2026-11-27. Shorthand: "HEAD" is microsoft/vcpkg master at `9fa95bf687fa6ae7f2da0673a8067e5fc1515c27` (committed 2026-11-26). "Tag" is registry release 2026.10.16 at `9eec002df1cd109f8f104cd966a763daf9751489` (committed 2026-10-17). "Baseline" is 2026.07.29 at `9e593bb18ea69cc5095e012465dcd675a822ed0d` (committed 2026-07-30). The maintainer guide is `vcpkg/contributing/maintainer-guide.md` in MicrosoftDocs/vcpkg-docs (the path in the commission, `contributing/maintainer-guide.md`, lacks the `vcpkg/` prefix), read at `91d0374724` (2026-11-19) against the pre-window revision `6e953266cd` (2026-02-19).

## Summary

- One registry tag exists in the window: 2026.10.16 (published 2026-10-20 per the release API; commit 2026-10-17). No tag after it. The "last release 2026.07.29" header text is superseded.
- The tag names vcpkg-tool 2026-09-26 and CMake 4.4.3. HEAD names vcpkg-tool 2026-10-29 and CMake 4.4.5. The baseline named vcpkg-tool 2026-07-27 and CMake 4.4.0.
- The five consumer-facing scripts the corpus cites are byte-identical between baseline and tag. At HEAD only `vcpkg.cmake` and `ports.cmake` differ, and neither change touches a cited claim.
- `vcpkg.cmake` still has zero references to `CMAKE_MSVC_RUNTIME_LIBRARY` or `VCPKG_CRT_LINKAGE`. CMK-VCPKG-06 stands.
- The `VCPKG_PREFER_SYSTEM_LIBS` warning is unchanged at `vcpkg.cmake:54-57`. CMK-VCPKG-10 stands.
- No deprecated helper was removed. All eight helper files are byte-identical to baseline. CMK-VCPKG-13 stands, with one correction to "no registry port uses them" (see claim 5).
- No semantic port linter exists. No lockfile exists. The "no lockfile and no semantic port linter" header text stands.
- The maintainer guide changed substantively. Only the vendored-dependency section (CMK-VCPKG-21) and the `vcpkg_copy_tool_dependencies` bullet (CMK-VCPKG-13) alter a quoted claim. Both are softenings, not hardenings.
- The ABI Hash input list in `reference/binarycaching.md` is unchanged, so CMK-VCPKG-07 stands.
- Replacement floor string: "vcpkg registry 2026.10.16 (as of 2026-11-27)".

## Findings

### 1. Registry tags in the window

`gh api repos/microsoft/vcpkg/tags` lists, newest first: 2026.10.16, 2026.07.29, 2026.06.24. One tag falls in the window.

| Tag | Commit date | vcpkg-tool named | CMake named |
|---|---|---|---|
| 2026.07.29 (baseline) | 2026-07-30 | 2026-07-27 | 4.4.0 |
| 2026.10.16 | 2026-10-17 | 2026-09-26 | 4.4.3 |
| HEAD 9fa95bf687 | 2026-11-26 | 2026-10-29 | 4.4.5 |

Sources: `scripts/vcpkg-tool-metadata.txt:1` (`VCPKG_TOOL_RELEASE_TAG=`) and `scripts/vcpkg-tools.json` (the `cmake` entries for windows, osx and linux) at each ref. The 2026.10.16 release notes state "Total port count: 2877" and name vcpkg-tool 2026-09-26 as the only tool release since the last registry release (<https://github.com/microsoft/vcpkg/releases/tag/2026.10.16>). vcpkg-tool 2026-09-26 was published 2026-09-26T06:19:05Z and 2026-10-29 on 2026-10-29T23:42:49Z (<https://github.com/microsoft/vcpkg-tool/releases/tag/2026-09-26>, <https://github.com/microsoft/vcpkg-tool/releases/tag/2026-10-29>).

### 2. Claim by claim

Each verdict is unchanged, changed or could not determine. Line numbers are at HEAD (`9fa95bf687`) and were also checked at the tag.

1. **vcpkg.md header, "the registry as of 2026-09-25 (last release 2026.07.29)". Changed.** Old text: registry as of 2026-09-25, last release 2026.07.29. New fact: release 2026.10.16 exists, and the file was re-read at HEAD 2026-11-26. Source: <https://github.com/microsoft/vcpkg/releases/tag/2026.10.16>. Upstream change date: 2026-10-17 (commit), release page 2026-10-20.
2. **vcpkg.md header, "no lockfile and no semantic port linter". Unchanged.** The vcpkg-tool source tree at 2026-10-29 has `postbuildlint.cpp` (a post-build file-layout check, which the corpus already treats as such) and no lint command. The command sources under `src/vcpkg/commands.*.cpp` list no `lint`, `check-port` or lock command, and `vcpkg/commands/` in the docs has no such page. Release notes for tools 2026-09-26 and 2026-10-29 mention neither. A `vcpkg.lock` or lint addition did not occur.
3. **CMK-PKG-02, tool metadata and CMake version. Changed (the dated example only).** Old text: "it read `2026-07-27` on 2026-09-25, while vcpkg-tool 2026-09-26 was already out", and "at root `11ace80` vcpkg-tool 2026-07-27 downloaded CMake 4.4.3". New fact: the newest registry tag, 2026.10.16, reads `VCPKG_TOOL_RELEASE_TAG=2026-09-26` (`scripts/vcpkg-tool-metadata.txt:1`) and pins CMake 4.4.3 in `scripts/vcpkg-tools.json`. HEAD reads `2026-10-29` and CMake 4.4.5. The measured claim about root `11ace80` is a historical measurement and cannot be re-measured from sources alone, so it is "could not determine" whether it still reproduces; it was not contradicted. The rule itself (the root fixes the tool and its CMake) is unchanged and in fact illustrated again: baseline 4.4.0, tag 4.4.3, HEAD 4.4.5. Note for the author: root `11ace80` sat between the baseline tag (CMake 4.4.0) and the 2026.10.16 tag (4.4.3), consistent with the 4.4.3 measurement. Upstream change date for the tag's tool pin: 2026-10-17; for HEAD: after 2026-10-29.
4. **CMK-VCPKG-06, runtime never set by vcpkg.cmake. Unchanged.** `grep -n "VCPKG_CRT_LINKAGE\|MSVC_RUNTIME" scripts/buildsystems/vcpkg.cmake` returns nothing at baseline, tag and HEAD (`vcpkg.cmake` is 1005 lines at HEAD, 50385 bytes at baseline and tag, 51523 at HEAD). The setter remains in `scripts/toolchains/windows.cmake:3` (`set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>$<$<STREQUAL:${VCPKG_CRT_LINKAGE},dynamic>:DLL>" CACHE STRING "")`), guarded by `if(NOT _VCPKG_WINDOWS_TOOLCHAIN)` at line 1. `windows.cmake` is byte-identical (git blob `97b0a03bbaaf36b486a1570ce6c99183025766ce`) across all three refs, so "loads only for port builds" is unchanged. Only the "registry as of" date needs refreshing.
5. **CMK-VCPKG-10, `VCPKG_PREFER_SYSTEM_LIBS` warning. Unchanged.** `scripts/buildsystems/vcpkg.cmake:54-57` at HEAD: `option(VCPKG_PREFER_SYSTEM_LIBS ...)` at 54, `if(VCPKG_PREFER_SYSTEM_LIBS)` at 55, `message(WARNING "VCPKG_PREFER_SYSTEM_LIBS has been deprecated. Use empty overlay ports instead.")` at 56, `endif()` at 57. Lines 54-57 are identical to baseline. Still a warning, not an error.
6. **CMK-VCPKG-13, deprecated helpers. Unchanged, with one correction.** All eight helper files exist at HEAD under `scripts/cmake/` and are byte-identical to baseline: `vcpkg_configure_cmake` (374 lines), `vcpkg_build_cmake` (95), `vcpkg_install_cmake` (23), `vcpkg_fixup_cmake_targets` (186), `vcpkg_extract_source_archive_ex` (11), `vcpkg_apply_patches` (17), `vcpkg_build_msbuild` (87), `vcpkg_copy_tool_dependencies` (72). None was removed, so "still run silently" does not become a hard error. `vcpkg_apply_patches.cmake:2` still prints `z_vcpkg_deprecation_message`. "Mixing old and new is a FATAL_ERROR" still holds: `vcpkg_configure_cmake.cmake:76`, `vcpkg_build_cmake.cmake:9`, `vcpkg_install_cmake.cmake:3`, `vcpkg_fixup_cmake_targets.cmake:3` each `message(FATAL_ERROR ...)` when the port already depends on `vcpkg-cmake` or `vcpkg-cmake-config`. Correction to "no registry port uses them any more": `ports/qt5-base/cmake/qt_download_submodule.cmake:33` calls `vcpkg_extract_source_archive_ex(` at HEAD, and the call is present at baseline too. It is a helper script inside a port, not a `portfile.cmake`, so a portfile-only grep misses it. This is not a window change; it is a pre-existing imprecision. The corpus claim should read "no registry `portfile.cmake` uses them (one port helper script, `qt5-base`, still calls `vcpkg_extract_source_archive_ex`)". A GitHub code search over portfile.cmake files returned only `scripts/detect_compiler/portfile.cmake` for `vcpkg_configure_cmake` (a script, not a port), and the search index may lag, so treat the portfile claim as "could not fully determine" at the 100 percent level.
7. **Authoring a Port, `CMAKE_POLICY_VERSION_MINIMUM` 3.5. Unchanged.** `scripts/ports.cmake:6-8` at HEAD: `if(CMAKE_VERSION VERSION_GREATER_EQUAL "4.0")` then `set(ENV{CMAKE_POLICY_VERSION_MINIMUM} 3.5)`. Same at baseline (line 7 holds the `set`). `ports.cmake` gained one line at 101 (`include("${SCRIPTS}/cmake/z_vcpkg_set_if_not_defined.cmake")`), which does not touch this.
8. **CMK-VCPKG-03, 07, 12, 14, 16, 17, 18, 21 floor strings. Changed (floor string only), with content verdicts below.** Old text: "Floor: vcpkg registry 2026.07.29 (as of 2026-09-26)". New floor: "vcpkg registry 2026.10.16 (as of 2026-11-27)". Rows whose quoted wording changed are flagged in section 3.
9. **CMK-VCPKG-07, ABI hash input list. Unchanged.** `vcpkg/reference/binarycaching.md` (the page the corpus calls binarycaching.md) section "ABI Hash", read at `91d0374724`, lists: every file in the port directory; the triplet file contents and name; the C++ and C compiler executables; selected features; each dependency's ABI hash; helper functions referenced by `portfile.cmake` (heuristic); the CMake version; the PowerShell version (Windows); `VCPKG_ENV_PASSTHROUGH` variables; the chainload toolchain file's textual contents; the GRDK toolkit (Xbox). It still names no included triplet file, and still carries the note that it "will change without notice". The list is identical to the pre-window revision; the page changed only by a NuGet `<clear />` note (2026-10-01, commit `ef02419ec5`). "Normative only" stands; re-date it to 2026-11-27.

### 3. Maintainer-guide diff that touches quoted rows

Diff of `vcpkg/contributing/maintainer-guide.md` between `6e953266cd` (2026-02-19) and `91d0374724` (2026-11-19). The file changed in two window commits: `eda2ef2683` (2026-10-20, "Document how we handle AI generated bug reports in new ports + AI review maintainer guide") and `91d0374724` (2026-11-19, "Clarify when to use vcpkg tool-copy helpers"). The front matter `ms.date` reads 9/30/2026.

| Row | Quoted wording | New text | Verdict |
|---|---|---|---|
| CMK-VCPKG-21 | "Do not use vendored dependencies" | Heading `### Do not use vendored dependencies` is unchanged (guide line 425), but the body went from "Do not use embedded copies of libraries. All dependencies should be split out and packaged separately" to "Prefer to package dependencies separately ..." and "devendor dependencies whenever practical" (lines 427-438). It then adds: "A vendored dependency is allowed only when it is fully isolated from link domains used by downstream ports and user applications. For example, a host-only build tool can contain a statically linked dependency ..." | **Changed.** The rule is weaker than the row states. "Never vendor" overstates it: a vendored copy fully isolated from consumers' link domains is allowed, and the test is link-domain exposure, not vendoring itself. Row stays SHOULD; reword the rationale and the verification (see candidate 1). Upstream change date: 2026-10-20 (`eda2ef2683`) or earlier in the 2026-09 window; the pre-window text at `6e953266cd` read "Do not use embedded copies of libraries."; the diff against `6e953266cd` cannot place it more tightly without a revision in between. |
| CMK-VCPKG-13 | "Replace `vcpkg_copy_tool_dependencies` with `vcpkg_copy_tools` (SHOULD)" | The bullet at old line 190 ("`vcpkg_copy_tool_dependencies()` should be replaced by `vcpkg_copy_tools()`") is replaced by "Use `vcpkg_copy_tools()` when you need to copy executables into the package's tools directory ... If the build system installs the tools in the right place already, don't move them just to use this helper. Use `vcpkg_copy_tool_dependencies()` directly if you only need to copy runtime DLLs alongside those tools." | **Changed.** `vcpkg_copy_tool_dependencies` is no longer deprecated in the guide; it is the right helper when only runtime DLLs need copying. Drop it from the deprecated list; keep the SHOULD clause only for the executable-copying case. Upstream change date: 2026-11-19 (`91d0374724`). |
| CMK-VCPKG-18 | "discouraged in favor of ... but is still allowed" | Line 297 unchanged: "This is discouraged in favor of `vcpkg_install_copyright` in new ports but is still allowed." | Unchanged. |
| CMK-VCPKG-12 | lower-case hex | Section "Use lowercase for hexadecimal digits strings" (line 234) unchanged. | Unchanged. |
| CMK-VCPKG-14 | `unofficial-` prefix, "should" | Line 278 unchanged: "any CMake configs that the port exports, which are not in the upstream library, should have `unofficial-` as a prefix." | Unchanged. |
| CMK-VCPKG-16 | `ONLY_STATIC_LIBRARY` example | Section "Do not add `CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS`" (line 793) and the `vcpkg_check_linkage(ONLY_STATIC_LIBRARY)` example (line 799) unchanged. | Unchanged. |
| CMK-VCPKG-17 | `usage` file | Not in the diff. | Unchanged. |
| CMK-VCPKG-03 | "should" on default features and `host: true` | The guide's default-features section was rewritten (new lines 372-388) and now says "if a feature adds an API, it must be off by default" where it said "additional APIs, executables, or other binaries". That is a narrowing of a curated-registry requirement and does not touch the row's quoted source, which is the `vcpkg-json` reference, not the guide. | Unchanged for the row. The `vcpkg-json` reference page was not re-read in this task, so the `"host": true` quotation is "could not determine" for this window. |

Other guide changes with no row in the pair (recorded so the author need not re-find them): the prebuilt-binary section was rewritten around "link domain" (lines 578-616, guide wording "allowed but strongly discouraged" unchanged); conflicting libs now go in `lib/manual-link` with a narrow exception to the "Install symbols and definitions owned by another package" ban (lines 30-31, 559-574); patch downloads must be pinned to a full commit ID, not a pull-request diff URL (lines 741-755); a port may not be renamed more than once in 12 months; new-port AI-review findings must be reported upstream, and a port is closed after 30 days of upstream silence (lines 709-728); the `"port-version"` and `versions/` sections now say every PR that modifies a port must produce a new version and to use `vcpkg x-add-version <port> --overwrite-version` to refresh an unmerged entry. Any of these could be candidates for a future row.

### 4. Scripts diff, baseline against HEAD

- `scripts/toolchains/windows.cmake`: no change.
- `scripts/ports.cmake`: one added line (`include(.../z_vcpkg_set_if_not_defined.cmake)` at line 101); a new helper file `scripts/cmake/z_vcpkg_set_if_not_defined.cmake` and a new `scripts/cmake/vcpkg_find_acquire_program(FASTBUILD).cmake` exist at HEAD.
- `scripts/buildsystems/vcpkg.cmake`: `VCPKG_USE_HOST_TOOLS` was redefined at line ~581: the default changed from ON to OFF and its meaning from "host tools" to "only host tools", and a new option `VCPKG_PREFER_HOST_TOOLS` (default ON, host tools first then target tools) was added, with `CMAKE_FIND_ROOT_PATH_MODE_PROGRAM` set to `NEVER` for cross builds when undefined. This is a cross-compile behaviour change after the 2026.10.16 tag (the tag's `vcpkg.cmake` is byte-identical to baseline). No row in the pair cites `VCPKG_USE_HOST_TOOLS`; grep of `vcpkg.md` and the rule found no mention. It could matter to a cross-build row if one is added.
- `ports/vcpkg-cmake/vcpkg.json`: `version-date` moved from 2024-04-23 to 2026-11-09; `portfile.cmake` for the port is unchanged. The `ports/vcpkg-cmake` directory listing is otherwise unchanged.

## Normative guidance candidates

1. **CMK-VCPKG-21 narrows its rule to link-domain exposure.** Rule: "Never expose a vendored dependency to a link domain that downstream ports or user applications share. Prefer to split it into its own port and depend on it. A copy fully isolated from consumers (a host-only build tool with a private static dependency) is allowed." Rationale: the guide's own text now says "allowed only when it is fully isolated" and "devendor dependencies whenever practical" (guide lines 427-438). Verification: read-only, because a vendored copy has no keyword; an `add_subdirectory` into a bundled `third_party/` or `extern/` tree that no patch devendors, and whose symbols reach an installed library, header or Config file, is the finding. Severity stays SHOULD.
2. **CMK-VCPKG-13 drops `vcpkg_copy_tool_dependencies` from its replacement clause.** Rule: "Use `vcpkg_copy_tools` to copy executables; use `vcpkg_copy_tool_dependencies` directly only when copying runtime DLLs next to tools the build already installed." Rationale: guide commit `91d0374724` (2026-11-19). Verification: `grep -rn "vcpkg_copy_tool_dependencies" ports/*/portfile.cmake`; a hit is a finding only when the same portfile also copies the executables by hand.
3. **CMK-VCPKG-13 rationale: replace "no registry port uses them" with a portfile-scoped statement.** Rationale: `ports/qt5-base/cmake/qt_download_submodule.cmake:33` still calls `vcpkg_extract_source_archive_ex`. Verification: `grep -rln "vcpkg_extract_source_archive_ex\|vcpkg_configure_cmake\|vcpkg_build_cmake\|vcpkg_install_cmake" ports/ scripts/cmake/` over a registry checkout; the expected hits are the helper definitions and `qt5-base`'s helper only.
4. **Floor strings: replace "vcpkg registry 2026.07.29 (as of 2026-09-26)" with "vcpkg registry 2026.10.16 (as of 2026-11-27)"** in CMK-VCPKG-03, 07, 12, 14, 16, 17, 18, 21 and the header, and "as of 2026-09-25" with "as of 2026-11-27" in CMK-VCPKG-06 and CMK-VCPKG-13. Verification: `grep -rn "2026.07.29" rules/cpp-packaging.md skills/cpp-packaging-reference/` returns no hits after the edit.
5. **CMK-PKG-02: refresh the dated example.** Rule text stays. Replace "it read `2026-07-27` on 2026-09-25, while vcpkg-tool 2026-09-26 was already out" with the current facts: tag 2026.10.16 reads `2026-09-26` and pins CMake 4.4.3; HEAD reads `2026-10-29` and pins CMake 4.4.5, while the baseline registry 2026.07.29 pinned CMake 4.4.0. Verification: `grep VCPKG_TOOL_RELEASE_TAG scripts/vcpkg-tool-metadata.txt` and `grep -n '"cmake"' -A3 scripts/vcpkg-tools.json` at the checked-out root.
6. **Optional new CONSIDER, `VCPKG_USE_HOST_TOOLS`.** Rule: a cross-compiling vcpkg manifest build that relied on the old default (host tools only) must set `VCPKG_USE_HOST_TOOLS=ON` explicitly, or accept the new host-then-target search. Rationale: default changed after 2026.10.16 (`vcpkg.cmake` near line 581 at HEAD). Verification: `grep -rn "VCPKG_USE_HOST_TOOLS\|VCPKG_PREFER_HOST_TOOLS" CMakeLists.txt CMakePresets.json cmake/`. This is outside the rows at risk; record for the author to accept or reject.

## AI-agent angle

- An agent trained before 2026-10 writes "last release 2026.07.29" or pins `builtin-baseline` to that SHA as "latest". Catch: `gh api repos/microsoft/vcpkg/tags --jq '.[0].name'` and compare.
- An agent asserts "vcpkg 2026-07-27 downloads CMake 4.4.3". The registry baseline pinned CMake 4.4.0, the 2026.10.16 tag 4.4.3, and HEAD 4.4.5. Catch: read `scripts/vcpkg-tools.json` at the pinned root and never quote a CMake version from memory.
- An agent turns "Prefer to package dependencies separately" back into "Never vendor" and flags an isolated host tool. Catch: apply candidate 1's link-domain test.
- An agent claims the deprecated helpers were removed, or that a vcpkg lockfile or linter appeared, after reading vague release notes. Catch: `ls scripts/cmake/vcpkg_configure_cmake.cmake` and the command list under vcpkg-tool `src/vcpkg/commands.*.cpp`.

## Contested / evolving

- The helper deprecations have stood for years without removal. As of 2026-11-27, with the file bodies unchanged, removal is not scheduled in any source read. Trend: static.
- vcpkg-artifacts: not re-examined in this task (outside the commission's file list). The vcpkg-tool release notes for 2026-09-26 and 2026-10-29 contain only dependency bumps for `/vcpkg-artifacts` and no removal. The D3 open question in `vcpkg.md` line 275 stays open from these sources.
- The maintainer guide is being rewritten for precision (project to component, link-domain wording, AI-review policy). Expect further softening or tightening of "must" and "should" wording; re-diff at each refresh. As of 2026-11-19 the guide's trend is toward testable conditions (link-domain exposure) instead of blanket bans.
- `VCPKG_USE_HOST_TOOLS` and `VCPKG_PREFER_HOST_TOOLS` landed on master after the last tag and may change before the next tag (unreleased as of 2026-11-26).

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| <https://github.com/microsoft/vcpkg/releases/tag/2026.10.16> | Registry release notes | 2026-10-17 | Only registry tag in the window; names the tool release since baseline |
| <https://github.com/microsoft/vcpkg/tags> | Tag list via API | read 2026-11-27 | Proves no tag after 2026.10.16 |
| <https://github.com/microsoft/vcpkg/blob/9eec002df1cd109f8f104cd966a763daf9751489/scripts/vcpkg-tool-metadata.txt> | Tool pin at the tag | 2026-10-17 | `2026-09-26` |
| <https://github.com/microsoft/vcpkg/blob/9fa95bf687fa6ae7f2da0673a8067e5fc1515c27/scripts/vcpkg-tool-metadata.txt> | Tool pin at HEAD | 2026-11-26 | `2026-10-29` |
| <https://github.com/microsoft/vcpkg/blob/9fa95bf687fa6ae7f2da0673a8067e5fc1515c27/scripts/vcpkg-tools.json> | CMake pins (4.4.0 baseline, 4.4.3 tag, 4.4.5 HEAD) | 2026-11-26 | The CMake version port builds download |
| <https://github.com/microsoft/vcpkg/blob/9fa95bf687fa6ae7f2da0673a8067e5fc1515c27/scripts/buildsystems/vcpkg.cmake> | Consumer toolchain | 2026-11-26 | Lines 54-57; no runtime setter; host-tools change near 581 |
| <https://github.com/microsoft/vcpkg/blob/9fa95bf687fa6ae7f2da0673a8067e5fc1515c27/scripts/ports.cmake> | Port-build entry | 2026-11-26 | Line 6-8 `CMAKE_POLICY_VERSION_MINIMUM` |
| <https://github.com/microsoft/vcpkg/blob/9fa95bf687fa6ae7f2da0673a8067e5fc1515c27/scripts/toolchains/windows.cmake> | Windows port toolchain | unchanged since baseline | Line 3 runtime setter |
| <https://github.com/microsoft/vcpkg/tree/9fa95bf687fa6ae7f2da0673a8067e5fc1515c27/scripts/cmake> | Deprecated helper files | 2026-11-26 | Eight files present, byte-identical to baseline |
| <https://github.com/microsoft/vcpkg/blob/9fa95bf687fa6ae7f2da0673a8067e5fc1515c27/ports/qt5-base/cmake/qt_download_submodule.cmake> | Port helper script | 2026-11-26 | Line 33 still calls a deprecated helper |
| <https://github.com/microsoft/vcpkg/tree/9fa95bf687fa6ae7f2da0673a8067e5fc1515c27/ports/vcpkg-cmake> | vcpkg-cmake port | 2026-11-26 | `version-date` bumped to 2026-11-09 |
| <https://github.com/microsoft/vcpkg-tool/releases/tag/2026-09-26> | vcpkg-tool release notes | 2026-09-26 | No lint or lock command; changes named |
| <https://github.com/microsoft/vcpkg-tool/releases/tag/2026-10-29> | vcpkg-tool release notes | 2026-10-29 | Newest tool; no lint or lock command |
| <https://github.com/microsoft/vcpkg-tool/tree/2026-10-29/src/vcpkg> | Tool command sources | 2026-10-29 | Command list: no lint, no lockfile |
| <https://github.com/MicrosoftDocs/vcpkg-docs/blob/91d0374724f86faa5817f6a157145f66f262e39c/vcpkg/contributing/maintainer-guide.md> | Maintainer guide, current | 2026-11-19 | The quoted wording |
| <https://github.com/MicrosoftDocs/vcpkg-docs/blob/6e953266cd/vcpkg/contributing/maintainer-guide.md> | Maintainer guide, pre-window | 2026-02-19 | Diff base |
| <https://github.com/MicrosoftDocs/vcpkg-docs/commit/eda2ef2683> | Guide commit | 2026-10-20 | AI-review policy |
| <https://github.com/MicrosoftDocs/vcpkg-docs/commit/91d0374724> | Guide commit | 2026-11-19 | `vcpkg_copy_tool_dependencies` clarification |
| <https://github.com/MicrosoftDocs/vcpkg-docs/blob/91d0374724f86faa5817f6a157145f66f262e39c/vcpkg/reference/binarycaching.md> | Binary caching reference | 2026-11-19 | ABI Hash list, unchanged |
| <https://github.com/MicrosoftDocs/vcpkg-docs/commit/ef02419ec5> | Binary caching commit | 2026-10-01 | NuGet `<clear />` note only |
| <https://github.com/MicrosoftDocs/vcpkg-docs/commit/c2628b2596> | Binary cache ZIP compression docs | 2026-10-01 | Related; no row cites it |

Fewer than 12 distinct primary sources were needed for this bounded delta; all sources above are primary (upstream repositories and docs).

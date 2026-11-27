---
title: "cpp-packaging delta refresh, 2026-09-26 to 2026-11-27"
pair: cpp-packaging
date: 2026-11-27
window_start: 2026-09-26
model: opus
consolidates:
  - .agents/research/refresh-2026-11/cpp-packaging/conan-client-changelog.md
  - .agents/research/refresh-2026-11/cpp-packaging/cmake-conan-and-conan-center.md
  - .agents/research/refresh-2026-11/cpp-packaging/vcpkg-tool-and-docs.md
  - .agents/research/refresh-2026-11/cpp-packaging/vcpkg-registry-and-maintainer-guide.md
  - .agents/research/refresh-2026-11/cpp-packaging/cmake-and-runner-images-as-cited.md
  - .agents/research/refresh-2026-11/cpp-packaging/recent-shifts.md
revises:
  - .agents/research/cmake-package-managers.md
  - .agents/research/cmake-versions-and-gate.md
---

# cpp-packaging delta refresh, 2026-09-26 to 2026-11-27

## Verdict

This is a delta update of the pair as verified on 2026-09-26. Claims whose
upstream did not change stay exactly as written, including their "as of"
stamps. The decisions:

1. No rule ID is added, renumbered or retired. Seven existing rows change in
   place: `CMK-PKG-02`, `CMK-PKG-03`, `CMK-CONAN-04`, `CMK-CONAN-24`,
   `CMK-VCPKG-10`, `CMK-VCPKG-13` and `CMK-VCPKG-21`.
2. `CMK-CONAN-04` does not flip. `CMakeConfigDeps` still carries the
   experimental banner at Conan 2.34.0 (2026-10-28), and no changelog line in
   2.33.0 or 2.34.0 calls it stable. Only the version in its text moves, plus
   one rationale clause: its Python API changed type between minors
   (`get_cmake_file_name` returns a dict from 2.33.0), which supports the pin.
3. `CMK-CONAN-24` is corrected: Conan's docs gained an experimental-bannered CPS
   integrations page on 2026-11-20, so "no docs page" is false and the word
   "documented" leaves the rule. `CPSDeps` itself still has no reference page.
   The row also absorbs Conan workspaces, which the docs call "generally
   available as experimental", because the rule already loads on `conanws.yml`
   and `conanws.py` and said nothing about them. This is folded into the
   existing describe-a-feature row rather than given a new ID, because the only
   sourced fact is the status, which is exactly what row 24 governs.
4. `CMK-VCPKG-21` narrows to the maintainer guide's new test: link-domain
   exposure, not vendoring itself. Severity stays SHOULD.
5. `CMK-VCPKG-13` stops treating `vcpkg_copy_tool_dependencies` as deprecated
   (guide revision of 2026-11-19) and scopes "no registry port uses them" to
   `portfile.cmake`, because a `qt5-base` helper script still calls
   `vcpkg_extract_source_archive_ex`.
6. The measured version stamps in the Gate stay, because nothing was
   re-measured. The Gate gains one sentence saying Conan 2.34.0 and vcpkg-tool
   2026-10-29 were source-diffed on 2026-11-27 and change no rule. The depth
   file headers get the same source-checked note, and vcpkg.md's registry
   reference moves to the 2026.10.16 release.
7. Floor strings on vcpkg rows whose upstream did not change stay at "vcpkg
   registry 2026.07.29 (as of 2026-09-26)". Only rows 13 and 21, whose source
   text changed, move their floor.
8. Rejected for this window: a `nuget.config` `<clear />` rule (the failure is a
   loud 401, not a silent pass, so it does not meet this rule set's bar); a
   `VCPKG_USE_HOST_TOOLS` rule (the default change is on vcpkg master only,
   unreleased as of 2026-11-26); a standalone workspaces rule with a
   `conan.lock` clause (no source says how workspaces interact with the lock,
   and `CMK-CONAN-09` already applies to every application conanfile).
9. Budgets hold: the rule body goes from 191 to 193 lines, conan.md and vcpkg.md
   keep their tables of contents, and SKILL.md is untouched.

## Changed rules

| ID | Old text | New text | Source |
|---|---|---|---|
| CMK-PKG-02 (rationale) | "it read `2026-07-27` on 2026-09-25, while vcpkg-tool 2026-09-26 was already out." | "registry tag 2026.10.16 reads `2026-09-26` while vcpkg-tool 2026-10-29 is out, and the registry head of 2026-11-26 already reads `2026-10-29`. Its `scripts/vcpkg-tools.json` pins CMake 4.4.0 at tag 2026.07.29, 4.4.3 at 2026.10.16 and 4.4.5 at that head." | microsoft/vcpkg `scripts/vcpkg-tool-metadata.txt` and `scripts/vcpkg-tools.json` at tag 2026.10.16 (`9eec002df1`) and head `9fa95bf687` (2026-11-26). URLs: https://github.com/microsoft/vcpkg/blob/9eec002df1cd109f8f104cd966a763daf9751489/scripts/vcpkg-tool-metadata.txt, https://github.com/microsoft/vcpkg/blob/9fa95bf687fa6ae7f2da0673a8067e5fc1515c27/scripts/vcpkg-tool-metadata.txt, https://github.com/microsoft/vcpkg/blob/9fa95bf687fa6ae7f2da0673a8067e5fc1515c27/scripts/vcpkg-tools.json |
| CMK-PKG-03 (rationale) | "(CMake 3.31.6 on `ubuntu-24.04`, 4.4.2 on `macos-15`, as of 2026-09-26)" | "(CMake 3.31.6 on `ubuntu-24.04`, 4.5.1 on `macos-15`, as of 2026-11-27)" | actions/runner-images release macos-15-arm64/20261123.0558 (2026-11-24); ubuntu24 release 20261122.23 lists no CMake change. URL: https://github.com/actions/runner-images/releases (consolidated: cpp-packaging/cmake-and-runner-images-as-cited.md) |
| CMK-CONAN-04 | "with a comment naming it experimental at Conan 2.32.0"; rationale "still carries the experimental banner at 2.32.0." | "experimental at Conan 2.34.0"; rationale "still carries the experimental banner at 2.34.0, and its Python API changed between minors (`get_cmake_file_name` returns a dict from 2.33.0). The `CMakeDeps` page now suggests trying `CMakeConfigDeps` first, which is advice, not a stability claim." | docs `reference/tools/cmake/cmakeconfigdeps.rst` and `cmakedeps.rst` on develop2; conan 2.34.0 `conan/tools/cmake/__init__.py`; changelog 2.33.0 (#20300). URLs: https://raw.githubusercontent.com/conan-io/docs/develop2/reference/tools/cmake/cmakeconfigdeps.rst, https://raw.githubusercontent.com/conan-io/docs/develop2/reference/tools/cmake/cmakedeps.rst, https://docs.conan.io/2/changelog.html |
| CMK-CONAN-24 | "Never describe `CPSDeps`, `conan.cps`, `[replace_requires]` or `[platform_requires]` as stable, GA or documented." Rationale: "At Conan 2.32.0 `CPSDeps` exists in source only, with no docs page and no adopters sampled" | Adds Conan workspaces to the list, drops "documented", adds "never cite a `CPSDeps` reference page". Rationale names the 2026-11-20 CPS integrations page (experimental, CMake 4.4 or later), the workspaces status and the 2.34.0 floor. Grep adds `conanws` and `conan workspace`. | docs `integrations/cps.rst` (added by conan-io/docs PR #4585, 2026-11-20); `incubating.html` ("Workspaces are not incubating anymore, but generally available as experimental."); `profiles.rst` banners. URLs: https://raw.githubusercontent.com/conan-io/docs/develop2/integrations/cps.rst, https://docs.conan.io/2/incubating.html, https://raw.githubusercontent.com/conan-io/docs/develop2/reference/config_files/profiles.rst |
| CMK-VCPKG-10 (rationale) | "still ship in vcpkg-tool 2026-09-26" and "no announced removal date (as of 2026-09-26)" | "still ship in vcpkg-tool 2026-10-29, whose message still reads "vcpkg artifacts will be removed shortly after July 1, 2026"" and "(as of 2026-11-27)" | vcpkg-tool tag 2026-10-29: `vcpkg-artifacts/` in tree, `locales/messages.json` `VcpkgCeIsExperimental`; `vcpkg.cmake:54-57` at head; `cmake-integration.md` line 260. URLs: https://github.com/microsoft/vcpkg-tool/releases/tag/2026-10-29, https://github.com/microsoft/vcpkg-tool/tree/2026-10-29/src/vcpkg, https://github.com/microsoft/vcpkg/blob/9fa95bf687fa6ae7f2da0673a8067e5fc1515c27/scripts/buildsystems/vcpkg.cmake |
| CMK-VCPKG-13 | "Replace `vcpkg_copy_tool_dependencies` with `vcpkg_copy_tools` (SHOULD)." and "no registry port uses them any more (as of 2026-09-25)" | "Copy executables into `tools/` with `vcpkg_copy_tools`, not by hand (SHOULD). `vcpkg_copy_tool_dependencies` on its own stays right when only runtime DLLs need copying beside tools the build already installed." Rationale scopes the zero-user claim to `portfile.cmake` and names the `qt5-base` helper script. Verification (3) becomes a candidate list with a stated finding. Floor moves. | maintainer guide commit `91d0374724` (2026-11-19); `ports/qt5-base/cmake/qt_download_submodule.cmake:33` at head. URLs: https://github.com/MicrosoftDocs/vcpkg-docs/commit/91d0374724, https://github.com/microsoft/vcpkg/blob/9fa95bf687fa6ae7f2da0673a8067e5fc1515c27/ports/qt5-base/cmake/qt_download_submodule.cmake |
| CMK-VCPKG-21 | "Never vendor a dependency's source inside a port." | "Never let a dependency vendored inside a port reach a link domain that downstream ports or user applications share. ... A copy fully isolated from consumers, such as a statically linked dependency of a host-only build tool, is allowed." Verification adds the reach test. | maintainer guide at `91d0374724`, lines 425-438 (body changed by 2026-10-20, `eda2ef2683`). URLs: https://github.com/MicrosoftDocs/vcpkg-docs/blob/91d0374724f86faa5817f6a157145f66f262e39c/vcpkg/contributing/maintainer-guide.md, https://github.com/MicrosoftDocs/vcpkg-docs/commit/eda2ef2683 |

Non-ID changes: Non-Negotiable 13's stamp becomes "(as of vcpkg-tool
2026-10-29)"; the survey sentence names the 2025 and 2026 editions (isocpp.org
2026 survey summary PDF, 2026-05-04, text extracted, no percentages; https://isocpp.org/files/papers/CppDevSurvey-2026-summary.pdf, https://isocpp.org/blog/2026/05/2026-survey-summary); the Gate
gains its source-checked sentence; conan.md and vcpkg.md headers and their
re-check lists move to the newest checked versions.

## New rules

None. The workspaces finding is folded into `CMK-CONAN-24` (see Verdict 3). If
a later refresh finds a sourced workspace-specific failure mode, the next free
Conan ID is `CMK-CONAN-25` (`CMK-CONAN-19` is reserved and never reused). The
next free vcpkg ID is `CMK-VCPKG-22` (`CMK-VCPKG-19` and `-20` are reserved).

## Confirmed unchanged

- `CMK-CONAN-05`: the `CMakeConfigDeps` page still says it writes no Find
  modules and support "is not planned".
- `CMK-CONAN-03`: `conan_file.py` is byte-identical between 2.32.0 and 2.34.0
  and still warns on `build_requires`.
- `CMK-CONAN-09`: `conan/cli/args.py` is identical, and `--lockfile-partial`,
  `--lockfile-out`, `--lockfile-clean` and the empty `--lockfile=` help remain.
- `CMK-CONAN-10`: the cppstd watch is still a `STATUS` message and the runtime
  block a plain `set()` at 2.34.0.
- `CMK-CONAN-08`: the presets writer still returns early without `"conan"` in
  `vendor`.
- `CMK-CONAN-02`, `CMK-CONAN-16`, `CMK-CONAN-23`: `cpp_info.names` is still a
  mock, `info.py` defines no `header_only`, and `get()`/`download()` still
  default `sha256=None`.
- `CMK-CONAN-12`: the 2.27.0 negated-OR line stands. The 2.34.0 negated-pattern
  line concerns `remote --allowed-packages`, not profiles.
- `CMK-CONAN-07`, Non-Negotiable 10: cmake-conan `develop2` has no commit since
  2026-06-05, and the README still states CMake 3.24, Conan 2.0.5 and the three
  default pairs.
- `CMK-CONAN-20`: the Conan Center allow-list is the same 17 entries, file
  unchanged since 2024-11-13.
- `CMK-CONAN-13`, `-17`, `-18`, `-21`, `-22`: `docs/package_templates` has no
  commit since 2024-12-30.
- Publishing a Recipe: `conan-io/hooks` is still archived and no maintained
  recipe linter was found.
- `CMK-VCPKG-01`, `-02`, `-09`: the Classic-mode quote, transitive-override
  ignoring, overlay order and `x-block-origin` docs are unchanged.
  `x-update-baseline` is still `x-`-prefixed and experimental at 2026-10-29.
- `CMK-VCPKG-06`: `vcpkg.cmake` still has zero references to the runtime, and
  `scripts/toolchains/windows.cmake` is byte-identical.
- `CMK-VCPKG-07`: the ABI hash input list is unchanged and still names no
  included triplet file.
- `CMK-VCPKG-08`: the provider table still marks `x-gha` removed and the eight
  other `x-` providers experimental, and the 2026-10-29 source still only warns
  on `x-gha`.
- `CMK-VCPKG-11`, Non-Negotiable 4: no lockfile, dependency provider or CPS in
  vcpkg-tool 2026-10-29, the docs or the registry.
- `CMK-VCPKG-12`, `-14`, `-16`, `-17`, `-18`: the quoted guide passages are
  unchanged.
- Authoring a Port: `scripts/ports.cmake:6-8` still exports
  `CMAKE_POLICY_VERSION_MINIMUM` 3.5 on CMake 4.0 and later.
- `CMK-PKG-04`: no actions/cache release in the window.
- vcpkg.md header: still no lockfile and no semantic port linter.
- The Gate's `-Werror=dev` and `-Werror=author` split for CMake 3.31 to 4.4: no
  upstream change in the window.

## Open questions

1. Behaviour on Conan 2.34.0 was read from source only. Re-measure the
   `CMK-CONAN-09` partial-lock exit 0, the `CMK-CONAN-03` `[build_requires]`
   parse error in a `conanfile.txt`, the `CMK-CONAN-15` mixin fixture and the
   `CMK-CONAN-16` `AttributeError` before restamping those "Measured on Conan
   2.32.0" sentences.
2. vcpkg-tool 2026-10-29 was source-diffed, not run. Re-run: `x-gha` warns and
   exits 0, an unknown binary-source token exits 1, `version>=` or `overrides`
   without a baseline is rejected, `vcpkg new --application` omits the artifact
   registry, and the `x-update-baseline` invocation still works after its #2151
   fix.
3. The Gate on CMake 4.5.1, the version `macos-15` now ships: does `-Werror=dev`
   still promote an `AUTHOR_WARNING`, does it print a deprecation notice, and
   does a preset's `"warnings": {"deprecated": false}` still beat the flag? The
   4.5 manual calls `-Wdev` a deprecated synonym of `-Wauthor` but does not say.
   Also confirm the split on 4.3.6 and 4.4.5. The flag rule is `CMK-CORE-01`,
   owned by `cmake-build`.
4. The 40 Conan-1 recipe folders in `CMK-CONAN-01` were not recounted.
5. vcpkg master changed `VCPKG_USE_HOST_TOOLS` (default OFF, new meaning) and
   added `VCPKG_PREFER_HOST_TOOLS` after tag 2026.10.16. Re-check at the next
   registry tag whether a cross-build row is warranted.
6. Removal of vcpkg-artifacts is four months overdue and unexecuted. Whether a
   `"kind": "artifact"` registry is rejected after removal is still unknown
   (D3).
7. A committed `nuget.config` with `<clear />` under `<packageSources>` breaks
   the `nuget` provider with a 401. Rejected as a rule here because it fails
   loudly. Revisit if a silent variant appears.
8. The maintainer guide gained candidate rows with no current ID: patch
   downloads pinned to a full commit, `vcpkg x-add-version --overwrite-version`
   for unmerged entries, `lib/manual-link` for conflicting libs.
9. How Conan workspaces interact with `conan.lock` is not sourced (the
   workspaces blog body could not be fetched).

## Revision log

1. rules/cpp-packaging.md, The Gate: add the 2026-11-27 source-checked sentence.
2. rules/cpp-packaging.md, Non-Negotiable 13: stamp "as of vcpkg-tool 2026-10-29".
3. rules/cpp-packaging.md, strategy paragraph: survey sentence names 2025 and 2026.
4. rules/cpp-packaging.md, CMK-PKG-02: registry tool and CMake pins at tag 2026.10.16 and head 2026-11-26.
5. rules/cpp-packaging.md, CMK-PKG-03: `macos-15` CMake 4.5.1 as of 2026-11-27.
6. conan.md header: source-checked against Conan 2.34.0.
7. conan.md, CMK-CONAN-04: experimental at 2.34.0, the `get_cmake_file_name` dict change, the `CMakeDeps` page note.
8. conan.md, CMK-CONAN-24: CPS docs page, workspaces, "documented" dropped, floor 2.34.0, grep extended.
9. conan.md, re-check D2 and D4: 2.34.0.
10. vcpkg.md header: tool source-checked at 2026-10-29, registry as of 2026-11-26, last release 2026.10.16.
11. vcpkg.md, CMK-VCPKG-10: artifacts still ship in 2026-10-29, removal-date stamp 2026-11-27.
12. vcpkg.md, CMK-VCPKG-13: `vcpkg_copy_tool_dependencies` clause, portfile-scoped zero-user claim, verification (3), floor.
13. vcpkg.md, CMK-VCPKG-21: link-domain test.
14. vcpkg.md, re-check D3: 2026-10-29.
15. Spillover round (from cmake-build): no file changes. The one confirmed item was already true in the target text; see "## Spillover round".

Sources for every entry above: the Changed rules table carries the URLs, and the full set is in the six files under `.agents/research/refresh-2026-11/cpp-packaging/`. Entries 1 and 2 (source-diff of Conan 2.34.0 and vcpkg-tool 2026-10-29) rest on https://github.com/conan-io/conan/releases and https://github.com/microsoft/vcpkg-tool/releases/tag/2026-10-29.

## Edit list

Apply each entry as an exact, single-occurrence string replacement. Every find
string was checked to occur exactly once in its file on 2026-11-27.

1. File: `rules/cpp-packaging.md`
   Find:
   ```
   2026-09-26 and CMake 3.31.12, 4.3.4 and 4.4.2, verified 2026-09-26.
   ```
   Replace:
   ```
   2026-09-26 and CMake 3.31.12, 4.3.4 and 4.4.2, verified 2026-09-26. Conan
   2.34.0 and vcpkg-tool 2026-10-29 were source-diffed on 2026-11-27 and change
   no rule here, but are not re-measured.
   ```

2. File: `rules/cpp-packaging.md`
   Find:
   ```
   never "removed" (as of 2026-09-26).
   ```
   Replace:
   ```
   never "removed" (as of vcpkg-tool 2026-10-29).
   ```

3. File: `rules/cpp-packaging.md`
   Find:
   ```
   The 2025 edition publishes no percentages, so never quote one.
   ```
   Replace:
   ```
   The 2025 and 2026 editions publish no percentages, so never quote one.
   ```

4. File: `rules/cpp-packaging.md`
   Find:
   ```
   it read `2026-07-27` on 2026-09-25, while vcpkg-tool 2026-09-26 was already out.
   ```
   Replace:
   ```
   registry tag 2026.10.16 reads `2026-09-26` while vcpkg-tool 2026-10-29 is out, and the registry head of 2026-11-26 already reads `2026-10-29`. Its `scripts/vcpkg-tools.json` pins CMake 4.4.0 at tag 2026.07.29, 4.4.3 at 2026.10.16 and 4.4.5 at that head.
   ```

5. File: `rules/cpp-packaging.md`
   Find:
   ```
   4.4.2 on `macos-15`, as of 2026-09-26
   ```
   Replace:
   ```
   4.5.1 on `macos-15`, as of 2026-11-27
   ```

6. File: `skills/cpp-packaging-reference/conan.md`
   Find:
   ```
   as of 2026-06-05, verified 2026-09-26. CMake behaviour was measured on
   ```
   Replace:
   ```
   as of 2026-06-05, verified 2026-09-26, and source-checked against Conan
   2.34.0 (released 2026-10-28) on 2026-11-27. CMake behaviour was measured on
   ```

7. File: `skills/cpp-packaging-reference/conan.md`
   Find:
   ```
   with a comment naming it experimental at Conan 2.32.0.
   ```
   Replace:
   ```
   with a comment naming it experimental at Conan 2.34.0.
   ```

8. File: `skills/cpp-packaging-reference/conan.md`
   Find:
   ```
   still carries the experimental banner at 2.32.0.
   ```
   Replace:
   ```
   still carries the experimental banner at 2.34.0, and its Python API changed between minors (`get_cmake_file_name` returns a dict from 2.33.0). The `CMakeDeps` page now suggests trying `CMakeConfigDeps` first, which is advice, not a stability claim.
   ```

9. File: `skills/cpp-packaging-reference/conan.md`
   Find (the whole row):
   ```
   | CMK-CONAN-24 | Never describe `CPSDeps`, `conan.cps`, `[replace_requires]` or `[platform_requires]` as stable, GA or documented. Consume a system copy through a wrapper recipe plus `[replace_requires]`, not a bare `[platform_requires]`. | At Conan 2.32.0 `CPSDeps` exists in source only, with no docs page and no adopters sampled, and both profile sections carry the experimental banner. The CMake-side CPS rows are `CMK-DEP` (import) and `CMK-INST` (export). Floor: Conan 2.32.0. | Block CMK-CONAN-24 lists passages. Empty output means nothing to read. A passage calling one stable or GA is the finding. | SHOULD |
   ```
   Replace:
   ```
   | CMK-CONAN-24 | Never describe `CPSDeps`, `conan.cps`, `[replace_requires]`, `[platform_requires]` or Conan workspaces (`conanws.yml`, `conanws.py`, `conan workspace`) as stable or GA, and never cite a `CPSDeps` reference page. Consume a system copy through a wrapper recipe plus `[replace_requires]`, not a bare `[platform_requires]`. | At Conan 2.34.0 `CPSDeps` has no reference page. The docs gained an integrations page on CPS on 2026-11-20 that carries the experimental banner, warns of breaking changes and requires CMake 4.4 or later. Both profile sections still carry the experimental banner, and the docs call workspaces "generally available as experimental". No `CPSDeps` adopters were sampled (as of 2026-09-26). The CMake-side CPS rows are `CMK-DEP` (import) and `CMK-INST` (export). Floor: Conan 2.34.0. | Block CMK-CONAN-24 lists passages. Empty output means nothing to read. A passage calling one stable or GA, or citing a `CPSDeps` reference page, is the finding. | SHOULD |
   ```

10. File: `skills/cpp-packaging-reference/conan.md`
    Find:
    ```
    grep -H -n -i -e CPSDeps -e platform_requires -e replace_requires --
    ```
    Replace:
    ```
    grep -H -n -i -e CPSDeps -e platform_requires -e replace_requires -e conanws -e 'conan workspace' --
    ```

11. File: `skills/cpp-packaging-reference/conan.md`
    Find:
    ```
    at Conan 2.32.0, 2026-09-26).
    ```
    Replace:
    ```
    at Conan 2.34.0, 2026-11-27).
    ```

12. File: `skills/cpp-packaging-reference/conan.md`
    Find:
    ```
    status on each Conan minor after 2.32.0.
    ```
    Replace:
    ```
    status on each Conan minor after 2.34.0.
    ```

13. File: `skills/cpp-packaging-reference/vcpkg.md`
    Find:
    ```
    Written against vcpkg-tool 2026-09-26, the registry as of 2026-09-25 (last
    release 2026.07.29) and the CMake floor 3.25, with CMake behaviour measured on
    ```
    Replace:
    ```
    Written against vcpkg-tool 2026-09-26 (source-checked against 2026-10-29 on
    2026-11-27), the registry as of 2026-11-26 (last release 2026.10.16) and the
    CMake floor 3.25, with CMake behaviour measured on
    ```

14. File: `skills/cpp-packaging-reference/vcpkg.md`
    Find:
    ```
    still ship in vcpkg-tool 2026-09-26, so write
    ```
    Replace:
    ```
    still ship in vcpkg-tool 2026-10-29, whose message still reads "vcpkg artifacts will be removed shortly after July 1, 2026", so write
    ```

15. File: `skills/cpp-packaging-reference/vcpkg.md`
    Find:
    ```
    has no announced removal date (as of 2026-09-26)
    ```
    Replace:
    ```
    has no announced removal date (as of 2026-11-27)
    ```

16. File: `skills/cpp-packaging-reference/vcpkg.md`
    Find:
    ```
    Replace `vcpkg_copy_tool_dependencies` with `vcpkg_copy_tools` (SHOULD).
    ```
    Replace:
    ```
    Copy executables into `tools/` with `vcpkg_copy_tools`, not by hand (SHOULD). `vcpkg_copy_tool_dependencies` on its own stays right when only runtime DLLs need copying beside tools the build already installed.
    ```

17. File: `skills/cpp-packaging-reference/vcpkg.md`
    Find:
    ```
    and no registry port uses them any more (as of 2026-09-25).
    ```
    Replace:
    ```
    and no registry `portfile.cmake` uses them (as of 2026-11-26), though the `qt5-base` port's helper script `cmake/qt_download_submodule.cmake` still calls `vcpkg_extract_source_archive_ex`, so a portfile-only grep does not cover the whole registry. Since 2026-11-19 the guide no longer deprecates `vcpkg_copy_tool_dependencies`.
    ```

18. File: `skills/cpp-packaging-reference/vcpkg.md`
    Find:
    ```
    Floor: vcpkg registry 2026.07.29 (as of 2026-09-26). | See block CMK-VCPKG-13 (1).
    ```
    Replace:
    ```
    Floor: vcpkg registry 2026.10.16 and the maintainer guide of 2026-11-19 (as of 2026-11-27). | See block CMK-VCPKG-13 (1).
    ```

19. File: `skills/cpp-packaging-reference/vcpkg.md`
    Find:
    ```
    Block CMK-VCPKG-13 (3) lists the SHOULD clause's findings, and empty output is its pass.
    ```
    Replace:
    ```
    Block CMK-VCPKG-13 (3) lists the SHOULD clause's candidates, and empty output is its pass: a listed portfile that also copies executables by hand (`file(COPY` or `file(INSTALL` into `tools/`) is the finding.
    ```

20. File: `skills/cpp-packaging-reference/vcpkg.md`
    Find (the whole row):
    ```
    | CMK-VCPKG-21 | Never vendor a dependency's source inside a port. Split it into its own port, depend on it, and patch the upstream build to use it. | The guide's "Do not use vendored dependencies": two vendored copies conflict at link, the license becomes opaque, and every fix is made twice. Floor: vcpkg registry 2026.07.29 (as of 2026-09-26). | Read only, because a vendored copy has no keyword: an `add_subdirectory` into a bundled `third_party/` or `extern/` tree that no patch devendors is the finding. | SHOULD |
    ```
    Replace:
    ```
    | CMK-VCPKG-21 | Never let a dependency vendored inside a port reach a link domain that downstream ports or user applications share. Prefer to split it into its own port, depend on it, and patch the upstream build to use it. A copy fully isolated from consumers, such as a statically linked dependency of a host-only build tool, is allowed. | The guide's "Do not use vendored dependencies" section now says "Prefer to package dependencies separately" and "devendor dependencies whenever practical", and allows a vendored copy "only when it is fully isolated from link domains used by downstream ports and user applications" (revision of 2026-11-19). An exposed copy conflicts at link with the packaged one, the license becomes opaque, and every fix is made twice. Floor: the maintainer guide of 2026-11-19 (as of 2026-11-27). | Read only, because a vendored copy has no keyword: an `add_subdirectory` into a bundled `third_party/` or `extern/` tree that no patch devendors, and whose code reaches an installed library, header or CMake config, is the finding. A copy linked only into a host tool is cleared. | SHOULD |
    ```

21. File: `skills/cpp-packaging-reference/vcpkg.md`
    Find:
    ```
    not executed at vcpkg-tool 2026-09-26
    ```
    Replace:
    ```
    not executed at vcpkg-tool 2026-10-29
    ```

## Spillover round

Input: `.agents/research/refresh-2026-11/cpp-packaging/spillover-check.md`, which
carries one item from the cmake-build refresh. That item is confirmed by a
primary source, and the target is already correct.

### Verdict

No edit. Every fact the item restates is already in the target, written by the
first round of this refresh. The rule says "Conan 2.34.0 and vcpkg-tool
2026-10-29 were source-diffed on 2026-11-27 and change no rule here".
`conan.md` names 2.34.0 (released 2026-10-28) in its header, keeps
`CMK-CONAN-04` pinned because the experimental banner holds at 2.34.0, and
re-checks D2 at 2.34.0. `vcpkg.md` names the registry as of 2026-11-26 with
last release 2026.10.16. The target cites no `blocks.py` line range, no
`FindFiles` block and no tag 2026.07.29 that a restamp would have to move. Its
one 2026.07.29 mention, in `CMK-PKG-02`, is the historical CMake pin at that
tag, and it stays true.

### Changed rules

None.

### New rules

None. No ID is added, so no family sequence moves.

### Declined

- The optional sentence that Conan 2.34.0 adds a `CMAKE_PREFIX_PATH` fallback
  to `CMakeConfigDeps` (conan#20420). The fact is confirmed by the Conan
  changelog, but no rule or verification depends on it. `CMK-CONAN-04` still
  pins `CMakeDeps` outside the provider flow, so the fallback changes no
  decision. A competent model needs no line for it.
- Restamping `blocks.py` line numbers (`FindFiles` at 579 at 2.34.0, 580 at
  2.32.0) and the vcpkg 2026.07.29 to 2026.10.16 byte-identity of
  `vcpkg.cmake`. The target cites neither, so there is nothing to restamp.

### Sources

No change was made, so no source row is needed. The evidence for the
"already correct" verdict:

| Claim | Primary source |
|---|---|
| Conan 2.34.0 released 2026-10-28, adds the `CMAKE_PREFIX_PATH` fallback (PR 20420) | https://docs.conan.io/2/changelog.html |
| `CMakeConfigDeps` still experimental at 2.34.0 | https://docs.conan.io/2/reference/tools/cmake/cmakeconfigdeps.html and https://raw.githubusercontent.com/conan-io/conan/2.34.0/conan/tools/cmake/__init__.py |
| `vcpkg.cmake` byte-identical at 2026.10.16 and 2026.07.29 | https://raw.githubusercontent.com/microsoft/vcpkg/2026.10.16/scripts/buildsystems/vcpkg.cmake and https://raw.githubusercontent.com/microsoft/vcpkg/2026.07.29/scripts/buildsystems/vcpkg.cmake |

No first-round change was flagged as missing a source row.

### Edit list (spillover round)

Empty. No file under `rules/` or `skills/cpp-packaging-reference/` changes in
this round.

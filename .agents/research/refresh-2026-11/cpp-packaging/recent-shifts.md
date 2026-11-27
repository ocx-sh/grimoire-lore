---
title: C++ packaging at the CMake seam, recent shifts 2026-09-26 to 2026-11-27
pair: cpp-packaging
date_researched: 2026-11-27
window_start: 2026-09-26
model: sonnet
sources_fetched: 21
---

# Recent shifts, cpp-packaging delta

This is a delta against the pair as verified on 2026-09-26 (Conan 2.32.0, vcpkg-tool 2026-09-26, CMake 3.31.12 / 4.3.4 / 4.4.2). Only events inside the window are reported. Verdict first: **no new Non-Negotiable is warranted.** Non-Negotiables 3, 4 and 13 were re-checked and hold. One survey sentence should be reworded, the version stamps need a bump, and four low-severity candidates exist (one SHOULD at most).

## Verdict on the survey line

Keep the "never quote a percentage" instruction, but fix its wording. The current text says "The 2025 edition publishes no percentages". The 2026 edition ("Lite") was published 2026-05-04 (see the isocpp blog post) and its summary PDF is headed "[AI-generated summary]". I extracted its full text: it contains no percentages, no Q9/Q10 package-manager figures, and no Conan or vcpkg usage numbers. Package management appears only as theme 1, the top wished-for change, which is "CMake/vcpkg/Conan/Bazel fragmentation". So the rule stays true; only its year reference is stale. Proposed text: "The 2025 and 2026 editions publish no percentages, so never quote one." The 2024 figures (Conan 19.34 %, vcpkg 19.10 %) remain the only citable ones. I did not re-fetch the 2024 PDF (unchanged by definition).

## Look-for items

| Item | Result |
|---|---|
| Supply-chain gates matured (conan audit, vcpkg SBOM, Conan CycloneDX/SPDX deployers) | **No shift found** for a MUST or SHOULD. `conan audit` docs at 2.34 still say "This feature is experimental and subject to breaking changes" (since 2.14.0). 2.34.0 changed `AuditAPI.auth_provider` to take a provider name, a breaking API change in an experimental feature. Conan SBOM got small fixes (2.33.0 CPEs through `extra_info`; 2.34.0 joins license expressions with `AND` for CycloneDX). vcpkg SBOM improved before the window (registry 2026.07.29: canonical PURLs, SPDX gitoids, per PRs 2049/2072/2073/2074); the Oct 2026 vcpkg post and the 2026-10-29 tool release contain no SBOM item and no stability statement. Row M-L-07 stands. |
| vcpkg lockfile, dependency provider or CPS | **No shift found.** The learn.microsoft.com versioning page still offers only `builtin-baseline`, `version>=` and `overrides`, no lockfile. The Oct 2026 blog post, the 2026-10-29 tool release and registry 2026.10.16 mention none. A web search for a vcpkg CPS proposal found nothing. cps-org/cps shows no GitHub releases at all. Non-Negotiable 4 holds. |
| Conan features after 2.32.0 that change CMake wiring | **Shift found**, see candidates 1 and 2. Workspaces and CMakeConfigDeps both changed. `compatibility()`: no changelog entry in 2.33 or 2.34, no shift found. No new generator beyond CMakeConfigDeps changes and a Bazel template bump. |
| New vcpkg binary-cache path for GitHub Actions; nuget or http provider guidance | **Minor shift**, see candidate 3. No new recommended GHA path: the docs still say use the NuGet provider with GitHub Packages, and `x-gha` is listed as "Removed: This feature has been removed from vcpkg". The http provider text is unchanged. |
| Conan Center or vcpkg registry breaking changes | **No shift found.** 2.34.0 removed the legacy "ConanCenter frozen for Conan 1" warning and Conan 1 `@_` syntax now errors, both Conan 1 only. Registry 2026.10.16: 2877 ports, 41 added, 806 updated, 22 removed (tensorflow, v8, sdl1), no triplet rename and no new required field stated. A search for a Conan Center URL or policy change returned only unrelated results (could not determine beyond that; the conan-center-index repo was not read). |
| GitHub changelog (Actions cache service, GitHub Packages NuGet auth) | **No shift found.** The only related entry, 2026-10-22 "Meta API endpoints updated for Actions blob storage", adds blob hosts `productionresultssa30..49` and `100..199` (`*.blob.core.windows.net`) for allow-listed firewalls; it names no cache service and no deadline. No NuGet or Packages authentication entry in the window. |
| Kitware blog | **No shift found.** The 18 posts from 2026-10-27 to 2026-11-25 on page 1 include none on CMake, CPS or package managers (titles only; page 2 for late September not read). |

## Claims at risk

| Claim in the pair | Status |
|---|---|
| Gate line "Conan 2.32.0, vcpkg-tool 2026-09-26" | **Changed.** Old: those versions. New: Conan 2.33.0 (2026-09-29) and 2.34.0 (2026-10-28, Latest), vcpkg-tool 2026-10-29, registry 2026.10.16 (published 2026-10-20). Sources: docs.conan.io changelog, github.com/conan-io/conan/releases, github.com/microsoft/vcpkg-tool/releases. Re-run the gate before restamping. |
| NN 13 and CMK-VCPKG-10 "artifacts announced for removal, never removed" | **Unchanged.** vcpkg-tool 2026-10-29 still bumps a dependency "in /vcpkg-artifacts", so artifacts still ship. |
| CMK-VCPKG-08 "x-gha removed; tool only warns and exits 0" | **Unchanged** as far as the docs go (provider table updated 2026-10-21 still says removed). Behaviour of 2026-10-29 not re-measured: could not determine. |
| CMK-CONAN-04 "CMakeConfigDeps experimental at 2.32.0, pinned" | **Unchanged in status.** Docs at 2.34 still carry the experimental banner. Version stamp "2.32.0" should read 2.34.0 once re-verified. |
| CMK-PKG-02 "registry root named tool 2026-07-27 on 2026-09-25" | **Could not determine** whether the 2026.10.16 root names tool 2026-09-26 or 2026-10-29. Re-check `scripts/vcpkg-tool-metadata.txt` at that tag. |
| NN 3, NN 4, NN 5, NN 8 | **Unchanged.** Nothing in the window touches lock handling, vcpkg locking, the Conan 1 API or the Find-module rule. |

## Candidate shifts

### 1. Conan workspaces are generally available as experimental (new, nothing in the pair)

- Date: 2.31.0 (before window) "Get Workspace feature out of incubating"; 2.33.0 (2026-09-29) workspace host/visible-node tie-break in monolithic builds; 2.34.0 (2026-10-28) the workspace warning can be skipped; blog "Conan Workspaces: a monolithic super-build of your packages, on demand" 2026-10-15 (the post body could not be fetched, title only; two URL guesses returned 404).
- Citation: https://docs.conan.io/2/incubating.html ("Workspaces are not incubating anymore, but generally available as experimental."), https://docs.conan.io/2/changelog.html, https://github.com/conan-io/conan/releases.
- Lands in: `skills/cpp-packaging-reference/conan.md`, a new rule; the rule file already lists `conanws.yml` and `conanws.py` in `paths` but neither file mentions workspaces at all, so a reader gets no guidance.
- Proposed ID: CMK-CONAN-24 (check the next free number). Severity: **CONSIDER**.
- Rationale: an agent will either hand-write a monorepo of `add_subdirectory` plus `conan install` loops, or enable workspaces and commit a status the docs call experimental. State the status and say a workspace never replaces `conan.lock` for an application (NN 3 still applies per member).
- Verification: reading heuristic, `git ls-files '*conanws.yml' '*conanws.py'`; a hit with no `conan.lock` beside an application recipe is the finding.

### 2. CMakeConfigDeps API churn in 2.33 and 2.34

- Date: 2.33.0 2026-09-29, 2.34.0 2026-10-28.
- Citation: changelog entries "CMakeConfigDeps.get_cmake_file_name returns a dict object instead of a string" (2.33.0), "Add cmake_file_names dict property to CMakeConfigDeps" (2.34.0), "Allow cpp_info.sources-only packages", "Support for CPS components configurations", "imported object library support"; https://docs.conan.io/2/reference/tools/cmake/cmakeconfigdeps.html (still "experimental and subject to breaking changes").
- Lands in: `conan.md` under CMK-CONAN-04 and its "What Agents Get Wrong" list, as a sentence, not a new rule.
- Proposed ID: extend CMK-CONAN-04, no new ID. Severity: unchanged (pinned). Update the "experimental at 2.32.0" stamp.
- Rationale: the generator broke its own Python API within two minors, which is the strongest evidence yet that the pin on `CMakeDeps` is right. Any recipe or helper that calls `get_cmake_file_name` and expects a string breaks on 2.33.
- Verification: `grep -rn "get_cmake_file_name" --include=conanfile.py --include=*.py .` returns nothing outside Conan-aware tooling.

### 3. vcpkg nuget provider gotchas (documentation, tool 2026-09-26 and 2026-10-29)

- Date: docs page updated 2026-10-21; tool 2026-09-26 added `-SkipDuplicate` to `nuget push` and configurable compression; Oct 2026 blog 2026-10-29.
- Citation: https://learn.microsoft.com/en-us/vcpkg/reference/binarycaching ("If a repository-level `nuget.config` contains `<clear />` under `<packageSources>`, it can remove package sources inherited from the user-level configuration ... resulting in authentication failures such as `401 (Unauthorized)`"); https://devblogs.microsoft.com/cppblog/whats-new-in-vcpkg-oct-2026/ (`--binary-cache-compression-level=<0-9>` or `VCPKG_BINARY_CACHE_COMPRESSION_LEVEL`, command line wins, "does not change package ABIs", NuGet unaffected); https://github.com/microsoft/vcpkg-tool/releases/tag/2026-09-26.
- Lands in: `vcpkg.md` under CMK-VCPKG-08 or its CI cache recipe.
- Proposed ID: extend CMK-VCPKG-08, no new ID. Severity: **SHOULD** at most, because the gotcha is real but narrow (a committed `nuget.config` with `<clear />` beside the `nuget` provider).
- Rationale: the failure is a 401 on a source that was added successfully, a confusing symptom an agent will "fix" by loosening tokens. Compression level is a tuning knob, never a correctness one; do not add a rule for it.
- Verification: `git ls-files -z -- '*nuget.config' '*NuGet.Config' | xargs -0 -r grep -l -e '<clear' --` combined with a `nuget,` or `nugetconfig,` provider in CI; both present and the effective config lacking the feed is the finding.

### 4. Survey sentence (see verdict)

- Date: 2026-05-04 (publication), found in the window research pass, not a window event.
- Citation: https://isocpp.org/blog/2026/05/2026-survey-summary and https://isocpp.org/files/papers/CppDevSurvey-2026-summary.pdf (text extracted, no percentages).
- Lands in: `rules/cpp-packaging.md`, "Rules This File Owns", the paragraph after the strategy table.
- Proposed ID: none, a wording fix. Severity: n/a.
- Verification: `grep -n "ISO C++ 2024 survey" rules/cpp-packaging.md` shows the reworded sentence naming both 2025 and 2026.

### 5. Environment edges that may need a sentence (CONSIDER, low confidence)

- Conan 2.33.0 adds the `force_auth` remote capability and `core.net.http:trust_store`; 2.34.0 adds `CMAKE_PREFIX_PATH` fallback in CMakeConfigDeps and `/MP` for clang-cl with Visual Studio generators. They change CI wiring only for authenticated or corporate-CA remotes. No rule needed. Source: https://docs.conan.io/2/changelog.html. I did not verify their docs pages, so treat the one-line descriptions as changelog summaries.

## Normative guidance candidates

1. New rule CMK-CONAN-24 (workspaces), CONSIDER: say workspaces are "generally available as experimental", never replace `conan.lock`, never commit a workspace to a library recipe. Rationale: nothing in the pair covers `conanws.yml`. Verify: `git ls-files '*conanws.yml' '*conanws.py'`, then check each application member for `conan.lock`.
2. Extend CMK-CONAN-04 with a sentence that `get_cmake_file_name` changed type in 2.33.0 and that the experimental banner persists at 2.34.0. Verify: the grep in candidate 2.
3. Extend CMK-VCPKG-08 with the `<clear />` nuget.config failure, SHOULD. Verify: the grep in candidate 3.
4. Reword the survey sentence as above. Verify: grep.
5. Restamp the gate to Conan 2.34.0, vcpkg-tool 2026-10-29, registry 2026.10.16 only after re-running the gate. Verify: `conan --version` and `"$VCPKG_ROOT/vcpkg" version` on the gate run.

## AI-agent angle

- An agent trained before 2.33 calls `CMakeConfigDeps.get_cmake_file_name` and treats the result as a string. Catch: the grep in candidate 2.
- An agent reading "not incubating anymore" decides workspaces are stable and drops `conan.lock`. Catch: candidate 1 verification.
- An agent that adds an authenticated GitHub Packages feed with `nuget sources add` hits 401 when a repo `nuget.config` has `<clear />`, then rewrites tokens. Catch: candidate 3 grep.
- An agent quotes a "2026 survey" adoption figure it half remembers. Catch: the reworded survey sentence, and `grep -rn "19\.34\|19\.10" ` only against the 2024 figure.

## Contested / evolving

- `conan audit`, CMakeConfigDeps and workspaces all carry "experimental" wording as of 2.34.0 (2026-10-28), but each shipped changes in 2.33/2.34. Trend: Conan is moving CMake integration toward CPS (2.33.0 "CPS components configurations", 2.34.0 CPS `dyld_requires`), still experimental. Revisit at each Conan minor.
- vcpkg shows no CPS or lockfile movement as of 2026-10-29. Kitware reported CPS out of experimental in CMake on 2026-03-19 (search result, not re-fetched); that is the CMake-side CPS item that belongs to `cmake-build`.

## Sources

| URL | What it is | Date | Why |
|---|---|---|---|
| https://docs.conan.io/2/changelog.html | Conan changelog (2.33.0, 2.34.0 read; older half not read beyond offset 200000) | 2026-09-29, 2026-10-28 | Primary for all Conan items |
| https://github.com/conan-io/conan/releases | Conan release list | 2.34.0 Latest | Primary, confirms 2.33/2.34 and no 2.32.x patch |
| https://docs.conan.io/2/incubating.html | Incubating features page | 2.34 | Workspaces status wording |
| https://docs.conan.io/2/reference/tools/cmake/cmakeconfigdeps.html | CMakeConfigDeps reference | 2.34 | Experimental banner, `cmake_file_names` |
| https://docs.conan.io/2/reference/commands/audit.html | conan audit reference | 2.34 | Still experimental |
| https://blog.conan.io/ | Conan blog index | 2026-09-29, 2026-10-15 posts | Workspaces post listed; body not read |
| https://github.com/microsoft/vcpkg-tool/releases | vcpkg-tool releases | 2026-10-29 | Primary |
| https://github.com/microsoft/vcpkg-tool/releases/tag/2026-09-26 | Tool release at window start | 2026-09-26 | Compression, `-SkipDuplicate` |
| https://github.com/microsoft/vcpkg/releases | Registry releases | 2026-10-20 (2026.10.16) | Registry breaking-change check |
| https://devblogs.microsoft.com/cppblog/whats-new-in-vcpkg-oct-2026/ | vcpkg blog | 2026-10-29 | Cache compression, nuget.config note |
| https://devblogs.microsoft.com/cppblog/whats-new-in-vcpkg-jul-2026/ | vcpkg blog | 2026-08-11 | SBOM improvements, pre-window |
| https://devblogs.microsoft.com/cppblog/category/vcpkg/ | vcpkg blog index | up to 2026-10-29 | Only one post in window |
| https://learn.microsoft.com/en-us/vcpkg/reference/binarycaching | Binary caching reference | updated 2026-10-21 | Provider table, x-gha removed, nuget guidance |
| https://learn.microsoft.com/en-us/vcpkg/consume/lock-package-versions | Version pinning tutorial | page updated 2025-02-06 | No lockfile |
| https://isocpp.org/blog/2026/05/2026-survey-summary | ISO C++ 2026 survey post | 2026-05-04 | Survey verdict |
| https://isocpp.org/files/papers/CppDevSurvey-2026-summary.pdf | Survey summary PDF, text extracted locally | 2026-05 | No percentages |
| https://github.com/cps-org/cps/releases | CPS releases | none listed | No release found |
| https://github.blog/changelog/label/actions/ | GitHub Actions changelog index | to 2026-11-19 | Titles only |
| https://github.blog/changelog/2026-10-22-meta-api-endpoints-updated-for-actions-blob-storage/ | Blob storage endpoints | 2026-10-22 | Not a cache-service change |
| https://www.kitware.com/blog/ | Kitware blog index | 2026-10-27 to 2026-11-25 | Nothing relevant |

Not fetched successfully: vcpkg SBOM docs page and `export-sbom` command page (both 404), Conan workspaces blog body (404 on guessed URLs). Search snippets were used only to find pages, never as the claim source, except the Kitware CPS date and the 2026.04.27 vcpkg lock-file relocation, which are flagged as unverified.

---
title: cmake-conan and Conan Center delta, 2026-09-26 to 2026-11-27
pair: cpp-packaging
date_researched: 2026-11-27
window_start: 2026-09-26
model: sonnet
sources_fetched: 9
---

# cmake-conan and Conan Center delta

Method: GitHub REST API (gh api) against the primary repositories, read 2026-11-27. Every statement below comes from those responses. No claim is from memory.

## Verdict

Nothing in the window changes a claim in the cpp-packaging pair. One upstream edit touched Conan Center docs (inclusion criteria, 2026-10-26), but it affects no cited claim.

## cmake-conan (conan-io/cmake-conan, develop2)

- Commits on develop2 since 2026-09-26: 0 (`commits?sha=develop2&since=2026-09-26`). HEAD is still b1593849dd, dated 2026-06-05, which is the baseline. Source: https://github.com/conan-io/cmake-conan/commits/develop2
- conan_provider.cmake blob sha on develop2 is b2a6f0fad431a38e818d1fcf9d1058f986b78bba; no commit touched it in the window.
- Latest release is still 0.19.0 (2026-02-09).
- README read 2026-11-27 still states "CMake 3.24", "Conan 2.0.5" and "Windows+MSVC, Linux+gcc, Apple+clang".

| Claim | Status | Citation |
|---|---|---|
| conan.md header "cmake-conan develop2 as of 2026-06-05" | unchanged | HEAD b1593849dd, 2026-06-05 |
| CMK-CONAN-07: CMake 3.24 | unchanged | README line 16 |
| CMK-CONAN-07: checks for Conan 2.0.5 | unchanged | README line 17 |
| CMK-CONAN-07: pairs Windows+MSVC, Linux+gcc, Apple+clang | unchanged | README line 55 |
| CMK-CONAN-07: only warns when generator missing; find_program/find_library scope limits; Conan's "recommended flow for most cases" wording | unchanged by inference: provider file and README have no commits in the window. The README text of these two items was not re-read line by line. | commit list empty |
| Non-Negotiable 10 (never rely on provider feeding find_program, find_library, find_path) | unchanged | same |

## Conan Center Index (conan-io/conan-center-index)

Commits in the window on: README.md 0, docs/changelog.md 0, docs/package_templates 0 (last change 2024-12-30, 3d2005a60a), docs/adding_packages/dependencies.md 0 (last change 2024-11-13, 1be3711325), docs/adding_packages/conanfile_attributes.md 1.

The one commit: 915064e521, 2026-10-26, "add documented inclusion criteria for new recipes (#31236)". It adds docs/adding_packages/inclusion_criteria_for_new_recipes.md, removes the "No Upstream Build Scripts" section from docs/adding_packages/README.md, and removes one license bullet ("no license, shall not be accepted") from conanfile_attributes.md. Source: https://github.com/conan-io/conan-center-index/commit/915064e521. No rule row in the pair cites these passages. Status: no rule touched. Optional note only: if a row says CCI rejects recipes with no license, that bullet is now gone from conanfile_attributes.md; I did not find such a row in the files I grepped (CMK-CONAN-07 and 20 only).

### Allow-list diff (CMK-CONAN-20)

Live list in dependencies.md (Version Ranges): OpenSSL, CMake, doxygen, Libcurl, Zlib, Libpng, Expat, Libxml2, Libuv, qt5, qt6, c-ares, zstd, ninja, meson, pkgconf, xz_utils (17 entries). Quoted text: the same 17. Diff: empty. The file's last change is 2024-11-13, so "as of 2026-09-26" remains true and now also holds on 2026-11-27. Status: unchanged. The CMake entry still says CCI assumes 3.15.

### Template claims (CMK-CONAN-13, 17, 18, 21, 22)

docs/package_templates has no commit since 2024-12-30. The cmake_package test_package/CMakeLists.txt still reads `cmake_minimum_required(VERSION 3.15)`. Status: unchanged for all five rows. I did not re-read the other template lines (cmake_layout, del self.info.settings.compiler, rmdir, required_conan_version); the zero-commit result covers them.

### Conan-1 remote freeze (CMK-CONAN-02)

docs/changelog.md still has "04-Nov-2024 ... Conan 1.x end of support", no new entries. Status: unchanged.

### Recipe count (CMK-CONAN-01, "40 from-conans folders")

Not recounted. No evidence the tree moved in a way that makes 40 misleading; I did not measure. Status: could not determine (not re-measured).

### Linter (Publishing a Recipe)

conan-io/hooks: archived true, last push 2026-03-24. Unchanged. The CCI .github/workflows listing shows only stale.yml. No linter directory exists in CCI. A repository search for a conan recipe linter pushed after 2026-09-26 returned nothing. Status: holds, no maintained recipe linter found; no CONAN-13 to CONAN-23 grep defers to one. Limit: search was via GitHub API only, not exhaustive of third-party tools.

## Normative candidates

None.

## Could not determine

- Exact README wording of the "warns when generator missing", find_program and "recommended flow" statements, re-read line by line (inferred unchanged from empty commit history).
- Recount of the 40 recipe folders.

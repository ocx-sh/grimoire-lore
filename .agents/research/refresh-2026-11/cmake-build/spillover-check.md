---
title: cmake-build spillover check from cpp-packaging
target: cmake-build
date_researched: 2026-11-27
model: sonnet
sources_fetched: 14
---

# Spillover check: three cpp-packaging items addressed to cmake-build

Sources fetched: the CMake 4.5 manual (cmake.1), cmake-diagnostics(7), the 4.5 and 4.3 release notes, the CMake download page, Kitware/CMake tag objects through the GitHub API (v4.5.x, v4.3.6, v4.4.5), the actions/runner-images releases API, the Conan docs source integrations/cps.rst on GitHub, and the Kitware blog post on CPS. The cpp-packaging evidence read is under `.agents/research/refresh-2026-11/cpp-packaging/` (cmake-and-runner-images-as-cited.md, conan-client-changelog.md) and the decision file `cpp-packaging.md`. I had no CMake binary, so nothing was re-measured here.

## Item 1: -Werror=dev on CMake 4.5 (CMK-CORE-01)

Item: the 4.5 manual calls `-Wdev` a deprecated synonym of `-Wauthor`, but whether `-Werror=dev` still promotes AUTHOR_WARNING on 4.5 is unmeasured. Re-measure on 4.3.6, 4.4.5 and 4.5.1.

Verdict: target already correct. The primary source (CMake 4.5 manual, https://cmake.org/cmake/help/v4.5/manual/cmake.1.html, no date on the page) says `-Wdev` is "Deprecated since version 4.4" and a "Compatibility synonym" for `-Wauthor`. It does not say what `-Werror=dev` does, and cmake-diagnostics(7) and the 4.5 release notes do not mention dev or author handling, so the manual alone cannot settle it. The cmake-build pipeline did measure it: its own artifact states 4.5.1 kept both spellings on 2026-11-27, and the target says so. The cpp-packaging item predates that measurement.

Affected text, `/home/mherwig/dev/ocx-sh/grimoire-lore/skills/cmake-build-reference/versions-and-policies.md`: "CMK-CORE-06), and add that minor's rows to the CMK-VER-04 table. 4.5.1 kept both spellings (measured 2026-11-27)." Also `/home/mherwig/dev/ocx-sh/grimoire-lore/skills/cmake-build-reference/testing.md`: "spellings on 4.5.1 (measured 2026-11-27)." And `/home/mherwig/dev/ocx-sh/grimoire-lore/skills/cmake-build-reference/install-and-export.md`: "(4.5.1 still maps it, measured 2026-11-27)".

Smallest change: none. Residual gap: the stamps name 4.5.1 and 4.4.5 only. The split on 4.3.6 is still stamped on 4.3.4, which is acceptable because 4.3.5 and 4.3.6 are patch releases with no documented flag change.

## Item 2: macos-15 CMake moved to 4.5.1; new patches 4.3.6 and 4.4.5

Item: macos-15 CMake moved from 4.4.2 to 4.5.1 (runner-images macos-15-arm64/20261123.0558, 2026-11-24); 4.3.6 and 4.4.5 exist (2026-10-27); 4.5.0 and 4.5.1 are final.

Verdict: confirmed by primary source, and the target already correct. Evidence:
- https://api.github.com/repos/actions/runner-images/releases (the runner-images release feed): tag macos-15-arm64/20261123.0558 published 2026-11-24T10:41:39Z, "Updated from 4.5.0 to 4.5.1" for CMake.
- Kitware/CMake tag objects via the GitHub API: v4.3.6 tagger date 2026-10-27T15:18:23Z, v4.4.5 tagger date 2026-10-27T16:05:53Z, and tags v4.5.0 and v4.5.1 exist (the v4.5.0 and v4.5.1 dates of 2026-11-12 and 2026-11-19 come from the cpp-packaging artifact, not re-fetched). The cmake.org download page lists Latest Release 4.5.1 and Previous Release 4.4.5 and gives no dates.
The cpp-packaging item cites "cmake-versions-and-gate.md line 222", a file that does not exist in this repository's cmake-build pair. Its sentence is the cpp-packaging gate stamp, not cmake-build text.

Affected text, `/home/mherwig/dev/ocx-sh/grimoire-lore/rules/cmake-build.md`: "on 2026-11-27 the hosted `ubuntu-24.04` and `windows-2025` images ship 3.31.6, while `macos-15` and `ubuntu-latest` (now Ubuntu 26.04) ship 4.5, so one unpinned workflow runs two gates." Also `/home/mherwig/dev/ocx-sh/grimoire-lore/skills/cmake-build-reference/versions-and-policies.md`: "Measured on CMake 3.31.12, 4.3.4 and 4.4.2 on 2026-09-26, and the 4.5 facts on 4.4.5 and 4.5.1 on 2026-11-27." The target contains no "4.4.2 on macos-15" claim.

Smallest change: none. Not checked: the 3.31.6 claim for windows-2025 and the Ubuntu 26.04 `ubuntu-latest` claim, which are outside this item.

## Item 3: Conan CPS page requires CMake 4.4; CPS out of experimental on 2026-03-19

Item: Conan's new CPS integrations page (2026-11-20) requires CMake 4.4 or later. A search snippet says CPS left experimental in CMake on 2026-03-19, unverified.

Verdict: confirmed by primary source for both halves.
- Conan docs source, https://raw.githubusercontent.com/conan-io/docs/develop2/integrations/cps.rst: "It requires CMake>=4.4 for the CMake integration." and "The CPS support in Conan is experimental, it is evolving together with the specification and it can have breaking changes in future Conan versions." The page date 2026-11-20 is the docs commit date recorded in the cpp-packaging artifact (docs PR 4585), not shown on the page itself.
- CMake side: the Kitware blog post https://www.kitware.com/common-package-specification-is-out-the-gate/, dated March 19, 2026, states "CMake 4.3, however, represents an exciting milestone, because it removes the "experimental" status from CMake's CPS support." This is the CMake maintainer's own blog, so a vendor source but not the release notes. The CMake 4.3 release notes (https://cmake.org/cmake/help/v4.3/release/4.3.html) list CPS import and export as new features with no "experimental" wording, which agrees. The 2026-03-19 date is the blog date, not a CMake release date.

Affected text, `/home/mherwig/dev/ocx-sh/grimoire-lore/skills/cmake-build-reference/install-and-export.md` (CMK-INST-13): "Both gates were retired at 4.3.0." and "CPS import is ungated only from 4.3." These match the sources. The target says nothing about Conan's CPS requirement of CMake 4.4 or Conan's experimental status: `grep -i conan` over install-and-export.md and the CPS rows of dependencies.md finds no such claim, and CMK-DEP-11 only says "On CMake 4.3 or newer, expect `find_package(X)` to load a valid `X.cps`". The Conan side belongs to the cpp-packaging pair.

Smallest change: none required for truth. Optional: add to CMK-DEP-11 the clause "Conan's CPS integration is itself experimental and needs CMake 4.4 or newer (docs page of 2026-11-20); a Conan-driven consumer on 4.3 gets no CPS from Conan" only if the cmake-build rule is meant to describe the Conan seam, which currently lives in `cpp-packaging`.

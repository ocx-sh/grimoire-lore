---
title: CPS claim verification — adversarial re-fetch of both dives
topic: cps-common-package-specification
group: cmake-dependency-seam
agent: cps-claim-verifier
model: opus
date_researched: 2026-09-05
verifies:
  - .agents/research/cmake-dependency-seam/cps-spec-and-cmake-implementation.md
  - .agents/research/cmake-dependency-seam/cps-ecosystem-adoption-and-interop.md
---

# CPS claim verification

Every load-bearing version, gate and status claim in the two CPS dives, re-fetched
from its primary source on 2026-09-05 with the explicit goal of refuting it.
Dive labels in the ledger: **S** = `cps-spec-and-cmake-implementation.md`,
**E** = `cps-ecosystem-adoption-and-interop.md`.

Method: `Help/dev/experimental.rst`, `Help/command/{install,export,find_package,add_library}.rst`
and `Help/release/*.rst` pulled at pinned git tags from `gitlab.kitware.com/cmake/cmake/-/raw/<tag>/…`;
tag dates from the GitLab tags API (project 541); CMake C++ source from the same raw endpoint;
CPS spec pages from `cps-org.github.io/cps/`; Conan docs and source from `raw.githubusercontent.com`
at `develop2` / tag `2.32.0`; GitHub metadata via `gh api`; Kitware posts and the CMake Discourse
thread fetched directly. Nothing was built or executed.

## Table of contents

1. [Ledger](#ledger)
2. [Refuted claims and the corrections](#refuted-claims-and-the-corrections)
3. [Conflicts between the dives](#conflicts-between-the-dives)
4. [Unverifiable](#unverifiable)
5. [Corrections neither dive is wrong about but both under-state](#corrections-neither-dive-is-wrong-about-but-both-under-state)
6. [Verdict for the map](#verdict-for-the-map)

## Ledger

| # | Claim | Dive | Verdict | Evidence URL | What the source actually says |
|---|---|---|---|---|---|
| 1 | CMake 3.31.0 tagged 2024-11-06 | S | **CONFIRMED** | `gitlab.kitware.com/api/v4/projects/541/repository/tags/v3.31.0` | `created_at: 2024-11-06T08:41:37-05:00`. Every other tag date in S's timeline table also matches exactly: 4.0.0 = 2025-03-27, 4.1.0 = 2025-08-05, 4.2.0 = 2025-11-19, 4.3.0 = 2026-03-17, 4.3.3 = 2026-05-21, 4.4.0 = 2026-07-09, 4.4.3 = 2026-08-25. |
| 2 | 3.31 introduced `install(PACKAGE_INFO)`, experimental, gate `CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO` = `b80be207-778e-46ba-8080-b23bba22639e` | S, E | **CONFIRMED** | [`experimental.rst@v3.31.0`](https://gitlab.kitware.com/cmake/cmake/-/raw/v3.31.0/Help/dev/experimental.rst) | Section "Export CPS Package Information", exact variable and UUID. Absent from [`@v3.30.0`](https://gitlab.kitware.com/cmake/cmake/-/raw/v3.30.0/Help/dev/experimental.rst). The gate grants exactly one thing: "The experimental ``install(PACKAGE_INFO)`` command is available". |
| 3 | 3.31 also introduced `export(PACKAGE_INFO)` | S, E | **REFUTED** | [`export.rst@v3.31.0`](https://gitlab.kitware.com/cmake/cmake/-/raw/v3.31.0/Help/command/export.rst) | Zero occurrences of `PACKAGE_INFO`. Same at `@v4.0.0` (zero). Build-tree CPS export first appears at 4.1 as `export(EXPORT <export-name> PACKAGE_INFO <package-name>)`, `.. versionadded:: 4.1`, "Experimental. Gated by ``CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO``". |
| 4 | 4.0 added `find_package` CPS import, gate `CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES` = `e82e467b-f997-4464-8ace-b00808fff261` | S, E | **CONFIRMED** | [`experimental.rst@v4.0.0`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.0.0/Help/dev/experimental.rst) | Section "Find/Import CPS Packages", exact variable and UUID. Absent at `@v3.31.0`. |
| 5 | 4.1 added experimental `project(COMPAT_VERSION)` reusing the export gate | S | **CONFIRMED** | [`4.1.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/4.1.rst) L75 | "The `project` command now has experimental support for the ``COMPAT_VERSION`` keyword, gated by ``CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO``." |
| 6 | 4.1 added `install(PACKAGE_INFO)`'s `DESCRIPTION` / `HOMEPAGE_URL` | S | **CONFIRMED** | [`install.rst@master`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/command/install.rst) | Both options carry `.. versionadded:: 4.1`; both present in the `@v4.1.0` signature, absent from `@v3.31.0`. |
| 7 | 4.2 added `install(PACKAGE_INFO)`'s `LICENSE` / `DEFAULT_LICENSE` | S | **CONFIRMED** | `install.rst@master` | Both carry `.. versionadded:: 4.2`; present at `@v4.2.0`, absent at `@v4.1.0`. |
| 8 | 4.2 added the `SYMBOLIC` target type, "still experimental" | S | **CONFIRMED / PARTLY REFUTED** | [`add_library.rst@v4.2.0`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.2.0/Help/command/add_library.rst) L199 | `add_library(<name> INTERFACE SYMBOLIC)` carries `.. versionadded:: 4.2` and **no** experimental note — the target type itself shipped stable in 4.2. What was gated was CPS export/import *of* symbolic targets, per [Kitware](https://www.kitware.com/components-targets-and-symbols/): "CMake 4.2 has experimental support for CPS export and import, including symbolic targets." |
| 9 | 4.3.0 removed both gates from `experimental.rst` | S, E | **CONFIRMED** | [`experimental.rst@v4.3.0`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.3.0/Help/dev/experimental.rst) | Neither `CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO` nor `CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES` appears; both present at `@v4.2.0`. |
| 10 | 4.3.0: `install(PACKAGE_INFO)`, `export(PACKAGE_INFO)`, `find_package` CPS search all carry unconditional `versionadded:: 4.3`, no experimental note | S | **CONFIRMED** | `install.rst@master`, `export.rst@master`, [`find_package.rst@v4.3.0`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.3.0/Help/command/find_package.rst) | `.. versionadded:: 4.3` on both signatures. Grep for "Gated by" at `@v4.3.0` returns only `EXPORT_PACKAGE_DEPENDENCIES` and `GENERATE_SBOM` — zero CPS-related gate notes. |
| 11 | The full `.cps` search-path table, incl. macOS Framework/AppBundle `Resources/CPS/`, is `versionadded:: 4.3` | S | **CONFIRMED** | `find_package.rst@master` L380–430 | Footnote `[#p2]` (`<prefix>/…/cps/…` rows) and `[#p3]` (`<name>.framework/…/Resources/CPS/`, `<name>.app/Contents/Resources/CPS/`) both read `.. versionadded:: 4.3`. |
| 12 | 4.3 release notes announce CPS import + export as a stable feature | S, E | **CONFIRMED** | [`4.3.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/4.3.rst) L14–29 | Section "Common Package Specification": `find_package` "now searches for and can import CPS packages"; `install`/`export` "gained a new ``PACKAGE_INFO`` sub-command"; `project` "gained new ``COMPAT_VERSION`` and ``SPDX_LICENSE`` options". |
| 13 | 4.3 also added `project(COMPAT_VERSION)` and `project(SPDX_LICENSE)` | E | **CONFIRMED (with a caveat)** | `4.3.rst` L26 | Correct for the stable release note. `COMPAT_VERSION` already existed experimentally from 4.1 (row 5) — 4.3 is when it became unconditional. |
| 14 | 4.3.3 moved `export(PACKAGE_INFO)` output to `cps/<package-name>/` under the build dir | S, E | **CONFIRMED** | `4.3.rst` L297–301 (section "4.3.3") | "The `export(PACKAGE_INFO)` command now writes to the ``cps/<package-name>`` subdirectory of the current build directory, rather than directly to the current build directory." Master's `export.rst` restates it as current behaviour. |
| 15 | 4.4.0 shipped zero CPS-related changes | S | **CONFIRMED** | [`4.4.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/4.4.rst) | Zero hits for `CPS`, `PACKAGE_INFO`, `COMPAT_VERSION`, `SPDX`, `version_schema`. The 4.4.1/4.4.2/4.4.3 "Updates" entries (FindPython, a no-op, Swift `CMP0215`) are also CPS-free. |
| 16 | As of 4.4.3 and master, `CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO` = `ababa1b5-7099-495f-a9cd-e22d38f274f2` is the only remaining CPS gate | S | **CONFIRMED** | [`experimental.rst@master`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/dev/experimental.rst) | Identical block at `@v4.3.0`, `@v4.3.3`, `@v4.4.0`, `@v4.4.3` and master. The other master gates (`EXPORT_PACKAGE_DEPENDENCIES`, `CXX_IMPORT_STD`, `EXPORT_BUILD_DATABASE`, `GENERATE_SBOM`, `RUST`) are not CPS features. |
| 17 | That gate is **new at ≥4.4.0** — "absent at v4.3.0, present at v4.4.0" | E | **REFUTED** | `experimental.rst@v4.3.0` L47 | The gate and its UUID are present at v4.3.0, verbatim identical to master. [`CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/variable/CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO.rst) carries `.. versionadded:: 4.3`. It shipped in the *same* release that stabilised CPS. |
| 18 | Master is `4.4.20260905` | E | **CONFIRMED** | [`Source/CMakeVersion.cmake@master`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Source/CMakeVersion.cmake) | `MAJOR 4 / MINOR 4 / PATCH 20260905`. |
| 19 | `find_package` recognizes exactly two `version_schema` values, `simple` and `custom`; `rpm`/`dpkg` not implemented by CMake | S | **CONFIRMED for import / REFUTED for export** | `find_package.rst@master` L838–853; [`Source/cmExportPackageInfoGenerator.cxx`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Source/cmExportPackageInfoGenerator.cxx) L116–128 | Import: "At present, the following schemas are recognized: ``simple`` … ``custom`` … the specification may include schemas that are not supported by CMake." Export: `install(PACKAGE_INFO VERSION_SCHEMA …)` accepts `simple`, `custom`, **`dpkg`, `rpm` and `pep440`** without diagnostic — "`// TODO` … We don't validate these at this time" — and writes them straight into the `.cps`. Only a value outside those five raises an author warning. |
| 20 | CMake does not implement the spec's `CPS_PATH` / `CPS_PREFIX_PATH` search | S | **CONFIRMED** | `find_package.rst`, `install.rst`, `export.rst` @master | Zero hits for either name across all three. [`searching.html`](https://cps-org.github.io/cps/searching.html) defines both as the spec's own environment variables. |
| 21 | CPS files are preferred over `*Config.cmake` "in most cases"; `CONFIGS` suppresses CPS entirely | S, E | **CONFIRMED** | `find_package.rst@master` L96–99, L336 | Verbatim. CMake also gives the reason E inferred: "Because CPS files are not permitted to have names that do *not* match the package name, specifying ``CONFIGS`` will suppress searching for CPS files." |
| 22 | Version ranges are fully honoured only for CPS packages | S | **CONFIRMED** | `find_package.rst@master` L227 | "With the exception of CPS packages, version support is currently provided only on a package-by-package basis." |
| 23 | `compat_version` gives CPS a uniform compatibility check | S | **CONFIRMED** | `find_package.rst@master` L866–882 | Rule as stated: `EXACT` or no `compat_version` ⇒ exact equality; otherwise `version >= requested` **and** `compat_version <= requested` (plus the max endpoint). |
| 24 | Documented CPS limitation: genex support limited to configuration-dependent expressions | S | **CONFIRMED** | `install.rst@master`, `install(PACKAGE_INFO)` note | Verbatim, including "CPS may not support all features that are allowed in CMake-script exports." |
| 25 | `install(PACKAGE_INFO)` requires targets already attached via `install(TARGETS … EXPORT)` | S | **CONFIRMED** | `install.rst@master` | "Target installations are associated with the export ``<export-name>`` using the ``EXPORT`` option of the `install(TARGETS)` signature." |
| 26 | Kitware recommends calling `install(PACKAGE_INFO)` yourself; `CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO` is a distributor-only escape hatch | S | **CONFIRMED** | `install.rst@master`; `CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO.rst` | "This is the recommended way to generate CPS package information for a project." And: "this feature is intended for package distributors, and should **only** be used when editing a project's CMake script is not feasible. Developers should use `install(PACKAGE_INFO)` directly." Also confirms the conflict warning ("will usually cause the project's configure step to fail"). |
| 27 | `CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO.rst` has a `CMAKE_EXPERIMENTAL_FIXME` placeholder defect | S | **CONFIRMED** | `CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO.rst@master` | Twice: the note ("enabled by the ``CMAKE_EXPERIMENTAL_FIXME`` gate") and the worked example (`-DCMAKE_EXPERIMENTAL_FIXME=<elided>`). |
| 28 | `cmake-packages(7)` has zero CPS content, 723 lines | S | **CONFIRMED** | [`cmake-packages.7.rst@master`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/manual/cmake-packages.7.rst) | 723 lines, zero hits for `CPS`, `PACKAGE_INFO` or `.cps`. |
| 29 | `install(PACKAGE_INFO CXX_MODULES_DIRECTORY)` available as of 4.3, closing the C++-modules gap | S | **CONFIRMED in substance, wrong mechanism** | `install.rst@v4.2.0` vs `@v4.3.0`; `cmExportPackageInfoGenerator.cxx` L655–670; [`schema.html`](https://cps-org.github.io/cps/schema.html) | Option absent from the 4.2 signature, present at 4.3 ✓. But S's rationale is wrong: `install(EXPORT)`'s `CXX_MODULES_DIRECTORY` writes *CMake-script* property files. The real path is CPS-native — the spec has a `cpp_module_metadata` attribute ("path to a C++ module metadata file (also known as a 'P3286' file)") and the generator writes `component["cpp_module_metadata"]`, gated on `target->HaveCxx20ModuleSources()`. |
| 30 | CMake issue #26410 ("find_package needs some consistency for CPS") is open | S | **CONFIRMED** | [`issues/26410`](https://gitlab.kitware.com/cmake/cmake/-/issues/26410) | `state: opened`, created 2024-10-28, never closed. Quoted passages match verbatim. |
| 31 | `.cps` schema: `cps_version`/`name`/`components` required; `version_schema` default `simple`; `compat_version` defaults to `version`; "Exactly one of `cps_path` or `prefix` is required"; filename must match `name` exactly or lower-cased; unrecognized component `type` ignored; `compile_flags` discouraged; `link_libraries` discouraged in favour of `requires` | S | **CONFIRMED** | `schema.html` (spec v0.15.0) | All verbatim. |
| 32 | Prefix determination / `@prefix@` relocation model | S | **CONFIRMED** | [`searching.html#prefix-determination`](https://cps-org.github.io/cps/searching.html) | Verbatim, including the `/usr/local/lib/cps/foo/foo.cps` worked example. |
| 33 | `license` / `default_license` are package+component SPDX fields documented at `schema.html` | S | **CONFIRMED, wrong URL** | [`schema-supplement.html`](https://cps-org.github.io/cps/schema-supplement.html) | `schema.html` has **zero** occurrences of "license". The fields live on the Supplemental Schema page, alongside `description`, `display_name`, `website`, `meta_comment`, `meta_schema`. Substance (types, applicability, SPDX expression) is right. |
| 34 | Spec is at v0.15.0 on 2026-09-05; was v0.14.1 "as of writing" in the March 2026 post | S, E | **CONFIRMED** | `<title>… Common Package Specification v0.15.0</title>`; [out-the-gate post](https://www.kitware.com/common-package-specification-is-out-the-gate/) | "CPS itself is still in its 'pre-release' phase (version 0.14.1 as of writing)". |
| 35 | `cps-org/cps` has one git tag (`v0.5`) and zero GitHub Releases | E | **CONFIRMED** | `gh api /repos/cps-org/cps/{tags,releases}` | Tags: `v0.5`. Releases: `0`. |
| 36 | Four `cps-org` repos with the stated stars and push dates | S, E | **CONFIRMED** | `gh api /orgs/cps-org/repos` | `cps` 192★ pushed 2026-06-26; `cps-wiki` 4★ 2024-02-01; `cps-config` 21★ 2025-04-28T21:49:41Z; `cps-examples` 4★ 2026-05-04. |
| 37 | `cps-config` is alpha, MIT, 29 open issues, dormant 16+ months | S, E | **CONFIRMED** | `gh api /repos/cps-org/cps-config` | `open_issues=29`, `license=MIT`, description "A drop in replacement for pkg-config/pkgconf using cps files", last push 2025-04-28 (16.3 months before this date). |
| 38 | Contributor concentration: `mwoehlke` 91 / `mwoehlke-kitware` 54 / `dcbaker` 4 / `bretbrownjr` 1 / `memsharded` 1 | E | **CONFIRMED** | `gh api /repos/cps-org/cps/contributors` | Exact match. |
| 39 | "No vcpkg-affiliated account appears in the contributor list at all" | E | **REFUTED** | same, plus `gh api /search/issues?q=repo:microsoft/vcpkg+author:autoantwort+is:merged` | The contributor list also contains `autoantwort` (1 commit), who has **785 merged PRs in microsoft/vcpkg**. `nickelpro` and `bruxisma` (1 each) are not vcpkg-affiliated (2 and 0 vcpkg PRs). |
| 40 | Conan 2.13.0 (26-Feb-2025) introduced `CMakeConfigDeps` as incubating | E | **CONFIRMED** | [`changelog.rst`](https://raw.githubusercontent.com/conan-io/docs/develop2/changelog.rst) heading `2.13.0 (26-Feb-2025)`, entry `#17831` | "Make available in conanfiles the new incubating ``CMakeConfigDeps`` generator, still under the incubating 'conf' feature flag." |
| 41 | Conan 2.25.0 (28-Jan-2026) moved it incubating→experimental and added full CPS round trip | E | **CONFIRMED** | `changelog.rst` heading `2.25.0 (28-Jan-2026)` | Same release: "Move ``CMakeConfigDeps`` from incubating to experimental" (#19421); "Support full CPS CMake round trip in ``CMakeConfigDeps``" (#19410); "Support CPS shared libs from CMake" (#19417); "CPS CMake-Conan round trip support for components" (#19428). |
| 42 | Conan 2.26.0 (25-Feb-2026) shipped CPS parsing/naming bugfixes | E | **CONFIRMED** | `changelog.rst` heading `2.26.0 (25-Feb-2026)` | "Fix CPS parsing of package preprocessor definitions" (#19539); "Ensure ``CPS`` component Cmake targets follow expected name pattern" (#19584). |
| 43 | Conan 2.32.0 (31-Aug-2026) is current; `incubating.rst` says "generally available" while `cmakeconfigdeps.rst` still ships the experimental box | E | **CONFIRMED** | [`incubating.rst`](https://raw.githubusercontent.com/conan-io/docs/develop2/incubating.rst), [`cmakeconfigdeps.rst`](https://raw.githubusercontent.com/conan-io/docs/develop2/reference/tools/cmake/cmakeconfigdeps.rst) | 2.32.0 (31-Aug-2026) is the newest changelog heading. Incubating: "This generator is not incubating anymore, but already generally available." Reference page: `.. include:: ../../../common/experimental_warning.inc` plus "available as experimental from Conan 2.25". The contradiction is real. |
| 44 | `CPSDeps` (`conan.tools.cps.cps_deps.CPSDeps`) ships in tagged 2.32.0, writes `build/cps/<config>/cps/<name>.cps`, and has zero documentation | E | **CONFIRMED** | [`conan/tools/cps/cps_deps.py@2.32.0`](https://raw.githubusercontent.com/conan-io/conan/2.32.0/conan/tools/cps/cps_deps.py), [`test/integration/cps/test_cps.py@2.32.0`](https://raw.githubusercontent.com/conan-io/conan/2.32.0/test/integration/cps/test_cps.py) | Class `CPSDeps` present; `generate()` writes to `<base_build>/build/cps/<config>/cps`; the test asserts `build/cps/msvc-191-x86_64-release/cps/pkg.cps`. Docs tree at `develop2` (615 paths) has **zero** paths containing `cps`; GitHub code search for `CPSDeps` in `conan-io/docs` returns 0. |
| 45 | `CPS.load(path).to_conan()` is the reverse (consume) direction | E | **CONFIRMED** | `test_cps.py@2.32.0` L104–105 | `from conan.cps import CPS` / `self.cpp_info = CPS.load("zlib.cps").to_conan()` inside `package_info()`. Note the import path is `conan.cps`, not `conan.tools.cps`. |
| 46 | vcpkg: zero CPS code, docs or substantive issues | E | **CONFIRMED** | `gh api /search/{code,issues}` on `microsoft/vcpkg`, `microsoft/vcpkg-tool` | 0 code hits and 0 issue hits for the phrase "Common Package Specification" in either repo. |
| 47 | Meson: zero CPS-consuming code; only substantive mention is #15848 (27-May-2026), conceptual | E | **CONFIRMED** | `gh api /repos/mesonbuild/meson/issues/15848` | Open, created 2026-05-27T17:26:42Z. Body verbatim: "pkg-config cannot declare this, but CMake dependencies and CPS can represent this." Zero code hits for the phrase in `mesonbuild/meson`. |
| 48 | pkgconf: zero CPS issues or code | E | **CONFIRMED** | `gh api /search/{code,issues}` on `pkgconf/pkgconf` | 0 and 0. |
| 49 | build2: zero genuine CPS engagement | E | **CONFIRMED** | `gh api /search/issues?q=org:build2` | Exactly one hit, `build2/build2#381` "build2 0.16.0 failed to build against pkgconf 2.2.0" (closed 2024-05-01) — a coincidental match, exactly as E described. 0 code hits. |
| 50 | xmake #7639 is an open, unimplemented tracking issue from 2026-07-04 | E | **CONFIRMED** | `gh api /repos/xmake-io/xmake/issues/7639` | Open, created 2026-07-04T15:52:01Z, 3 comments, title "Common Package Specification (CPS) support for xmake/xrepo". |
| 51 | `rules_foreign_cc` and the BCR have zero CPS issues | E | **CONFIRMED** | `gh api /search/issues` on both repos | 0 and 0. |
| 52 | CPS forbids namespace ≠ package name; Gamberini confirms it is intentional and permanent | E | **CONFIRMED** | [discourse.cmake.org/t/…/15720.json](https://discourse.cmake.org/t/cps-doesnt-work-with-boost-headers/15720) | Thread created 2026-06-19, 5 posts. Error text and Gamberini's 2026-06-25 reply ("There's no solution here. The incompatibility is intentional…") match verbatim; the `find_package(Boost REQUIRED MODULE)` workaround is post #2. |
| 53 | `jasper-software/jasper` and `memsharded/cppcon24` are real adopters, both gated | E | **CONFIRMED** | [jasper `src/libjasper/CMakeLists.txt`](https://raw.githubusercontent.com/jasper-software/jasper/master/src/libjasper/CMakeLists.txt) L228–232; [cppcon24 `cmake_cps/CMakeLists.txt`](https://raw.githubusercontent.com/memsharded/cppcon24/main/cmake_cps/CMakeLists.txt) | Both snippets are verbatim, including jasper's `VERSION_GREATER_EQUAL "4.3.0" AND JAS_ENABLE_CMAKE_PACKAGE_CONFIG_CPS` double gate and cppcon24's now-dead `set(CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO …)`. |
| 54 | `conan-io/conan#19589` is a live gap the Conan community is pushing back with | E | **CONFIRMED then REFUTED** | `gh api /repos/conan-io/conan/issues/19589` | Created 2026-02-09, **closed 2026-02-18 as `completed`**. Closing comment (memsharded): "this conversation is being continued on cps-org/cps#111, I think there are no actions at this moment in Conan". E's §3 says "closed"; E's Contested section then treats it as live and says "track the fate of #19589". The live thread is [cps-org/cps#111](https://github.com/cps-org/cps/issues/111) (open, last updated 2026-04-01). |
| 55 | Spec issues #78, #111, #112, #99 are open | S | **CONFIRMED** | `gh api /repos/cps-org/cps/issues/{78,111,112,99}` | All four open. #78 created 2024-09-27, #99 2025-10-28, #111 2026-02-11, #112 2026-02-23; all last updated 2026-04-01/02, not S's stated "2026-07-04" snapshot. |
| 56 | P2656 was withdrawn from WG21 at R4, December 2024 | S | **CONFIRMED** | [P2656R4](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2024/p2656r4.html) | Title literally "WITHDRAWN: C++ Ecosystem International Standard", dated 2024-12-15, author René Ferdinand Rivera Morell. "We hereby withdraw this paper from WG21 consideration… the limitations of WG21 and ISO are insurmountable in the near term… We will continue development of the Ecosystem standard externally. [github.com/ecostd]" |
| 57 | P2656 "remains an in-progress WG21 study-group effort" as of 2026-09-05 | E | **REFUTED** | same | See row 56. |
| 58 | Kitware post dates: a-year-closer 2024-10-22, navigating 2025-03-31, components 2026-02-16, out-the-gate 2026-03-19 | S | **CONFIRMED** | the four kitware.com posts | Displayed dates match exactly (navigating's JSON-LD `datePublished` is 2025-04-01; the byline date is March 31, 2025). |
| 59 | Kitware post dates as tabled by E: navigating "2026, CMake 4.0 era", a-year-closer "2026, retrospective" | E | **REFUTED** | same | Off by roughly a year and a half. navigating = 2025-03-31; a-year-closer = 2024-10-22. |
| 60 | The four Kitware blog quotes S relies on | S | **CONFIRMED** | the four posts | "CMake 4.3, however, represents an exciting milestone, because it removes the 'experimental' status from CMake's CPS support"; "first introduced in CMake 3.29, remains experimental"; "idiosyncrasies in version matching … automatic dependency export doesn't record version information or hints"; "C++ module support is not yet implemented in CPS" — all verbatim. |
| 61 | Kitware calls CPS/pkg-config interop "actively underway" | E | **CONFIRMED** | out-the-gate post | "Investigation into CPS / pkg-config interop is actively underway." Note the hedge word E dropped: *investigation into*. |
| 62 | nesbitt.io's over-claim and its adoption read | S, E | **CONFIRMED** | [nesbitt.io 2026-04-13](https://nesbitt.io/2026/04/13/common-package-specification.html) | "it's a JSON format that CMake and Meson and autotools can all read" (aspirational, as E flags); "Conan can already generate CPS files for everything in ConanCenter"; "…don't yet ship `.cps` files because almost nothing outside CMake produces them". |
| 63 | C++Now 2025 "CPS in CMake" talk, 30-Apr-2025 | E | **CONFIRMED** | [kitware.com/cnow-2025](https://www.kitware.com/cnow-2025/) | "CPS in CMake … Wednesday, April 30 … Kitware's Bret Brown and Bill Hoffman … this session explores CMake 4.0's experimental CPS support and its impact on IDEs, package managers, and SBOM generation." Verbatim. |

## Refuted claims and the corrections

### R1. `export(PACKAGE_INFO)` did not exist in CMake 3.31 (rows 3, 8)

Both dives pair `install(PACKAGE_INFO)` and `export(PACKAGE_INFO)` as a single 3.31
feature. `Help/command/export.rst` at tags `v3.31.0` and `v4.0.0` contains zero
occurrences of `PACKAGE_INFO`. The build-tree half arrived a year later.

> **Corrected sentence for the consolidator.** CMake 3.31.0 (tagged 2024-11-06) added
> `install(PACKAGE_INFO)` only, experimental, gated by
> `CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO` = `b80be207-778e-46ba-8080-b23bba22639e`.
> Build-tree CPS export arrived in 4.1.0 (2025-08-05) as
> `export(EXPORT <export-name> PACKAGE_INFO <package-name>)` behind the same gate, and
> was respelled as today's `export(PACKAGE_INFO <package-name> EXPORT <export-name>)`
> in 4.3.0, which is the version its `versionadded` tag names.

Consequence for rule text: a "CPS export has been available since 3.31" claim is wrong
for `export(PACKAGE_INFO)` by two minor versions.

### R2. `CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO` arrived at 4.3.0, not 4.4.0 (row 17)

E states the gate is "absent at v4.3.0, present at v4.4.0" and builds two guidance
items and one AI-agent trap on "since 4.4.0". `experimental.rst@v4.3.0` line 47 carries
the gate and the identical UUID; `CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO.rst` carries
`.. versionadded:: 4.3`. S's own table row ("unchanged since 4.3.0") is right.

> **Corrected sentence.** CMake 4.3.0 both removed the two original CPS gates and
> introduced a third, `CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO` =
> `ababa1b5-7099-495f-a9cd-e22d38f274f2`, gating
> `CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO` (`versionadded:: 4.3`). That gate is
> byte-identical at 4.3.0, 4.3.3, 4.4.0, 4.4.3 and master (4.4.20260905) — it has not
> moved in six months, which weakens E's "UUID will very likely change again" prediction.

### R3. CMake's CPS *export* accepts `rpm`, `dpkg` and `pep440`; only *import* is limited to two schemas (row 19)

S writes "rpm and dpkg are named by the CPS spec but not implemented by CMake". Half
right, and the wrong half is the dangerous one.

> **Corrected sentence.** `find_package` compares only `simple` and `custom` CPS
> versions. `install(PACKAGE_INFO VERSION_SCHEMA …)` additionally accepts `rpm`, `dpkg`
> and `pep440` silently — `cmExportPackageInfoGenerator.cxx` marks their validation a
> `// TODO` — and writes them into the `.cps`. So CMake will emit a package whose
> version it will later refuse to order, with no warning at either end. Only a sixth,
> unrecognised value produces an author diagnostic.

This strengthens S's normative rule 6 rather than weakening it; the rule should say the
producing side is where the trap is set, not just the consuming side.

### R4. `license` / `default_license` / `description` are on the Supplemental Schema page (row 33)

S's field table cites `schema.html`. That page has zero occurrences of "license". The
fields are on `schema-supplement.html`, which S neither cites nor lists in Sources.

> **Corrected sentence.** The CPS attribute set is split across two pages: core
> attributes at `cps-org.github.io/cps/schema.html`, and the optional metadata
> attributes — `license`, `default_license`, `description`, `display_name`, `website`,
> `meta_comment`, `meta_schema` — at `cps-org.github.io/cps/schema-supplement.html`.

### R5. `SYMBOLIC` shipped stable in 4.2; only its CPS export/import was gated (row 8)

`add_library.rst@v4.2.0` documents `add_library(<name> INTERFACE SYMBOLIC)` with
`versionadded:: 4.2` and no experimental note.

> **Corrected sentence.** CMake 4.2.0 added the `SYMBOLIC` interface-library target type
> as a stable feature; exporting and importing symbolic targets *through CPS* remained
> gated until 4.3.

### R6. A vcpkg maintainer has committed to the CPS spec (row 39)

E's governance argument concludes "No vcpkg contributor appears at all". `autoantwort`
— 785 merged PRs in `microsoft/vcpkg` — has one commit on `cps-org/cps`.

> **Corrected sentence.** CPS spec governance is overwhelmingly Kitware (145 of ~153
> commits across two Woehlke accounts); Meson, Bloomberg, Conan and vcpkg are each
> represented by a single-digit contributor (`dcbaker` 4, `bretbrownjr` 1, `memsharded` 1,
> `autoantwort` 1). One commit from a prolific vcpkg maintainer is *not* a vcpkg
> position on CPS, but "no vcpkg-affiliated account appears at all" is false.

### R7. `conan-io/conan#19589` is closed, not live (row 54)

Closed 2026-02-18 as `completed`, with "there are no actions at this moment in Conan".

> **Corrected sentence.** Conan closed #19589 without action and redirected the
> name-mapping question to the spec: `cps-org/cps#111` is the open thread, last touched
> 2026-04-01. There is no active Conan-side work on the namespace constraint.

### R8. P2656 was withdrawn; it is not in progress (rows 56–57) — see [Conflicts](#conflicts-between-the-dives)

### R9. E misdates two Kitware posts by up to 18 months (row 59)

E's Sources table dates "Navigating CMake Dependencies with CPS" as "2026, CMake 4.0 era"
and "A Year Closer to Standard C++ Dependency Management" as "2026, retrospective".

> **Corrected sentence.** The Kitware CPS series runs 2024-10-22 (a-year-closer,
> pre-3.31), 2025-03-31 (navigating, CMake 4.0 import), 2026-02-16 (components/symbols,
> CMake 4.2), 2026-03-19 (out-the-gate, CMake 4.3 stabilisation).

## Conflicts between the dives

| Question | S says | E says | Sources support |
|---|---|---|---|
| When did `CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO` appear? | "unchanged since 4.3.0" | "new as of CMake 4.4.0; absent at v4.3.0" | **S.** Present verbatim at `experimental.rst@v4.3.0`; the variable doc carries `versionadded:: 4.3`. |
| Status of the WG21 Ecosystem IS (P2656) | Withdrawn at R4, December 2024; work moved to `github.com/ecostd` | "remains an in-progress WG21 study-group effort, not a ratified ISO standard"; R3+ "not found" | **S.** [P2656R4](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2024/p2656r4.html) is titled "WITHDRAWN", dated 2024-12-15. E's own open question ("current status of P2656 past R2") is answerable in one fetch and its answer inverts E's summary bullet. |
| Does Conan produce CPS, and from what? | Not surveyed; flagged as an open question resting on "a single third-party blog post plus one bug report" | Two mechanisms: `CMakeConfigDeps` round trip (2.25.0+) and the standalone, undocumented `CPSDeps` generator | **E**, and it is now first-party proven: `conan/tools/cps/cps_deps.py` and `test/integration/cps/test_cps.py` at tag `2.32.0`, plus five CPS changelog entries pinned to 2.25.0 and two to 2.26.0. S's open question is closed. |
| Do the Kitware posts date from 2024–2026 or all from 2026? | 2024-10-22 / 2025-03-31 / 2026-02-16 / 2026-03-19 | Source table says "2026" for the first two | **S.** |
| Is CPS "Kitware-led with no vcpkg presence"? | Not claimed | "No vcpkg contributor appears at all" | **Neither, as stated.** Kitware dominance confirmed; the absolute vcpkg claim is false (row 39). |
| Is `#19589` an active push-back? | Not claimed | Framed both as closed (§3) and as live to track (Contested) | **Closed.** E contradicts itself; use the §3 framing. |

No conflict was found on: the two original gate names and UUIDs, the 4.3.0 stabilisation,
the 4.3.3 output-path change, spec version v0.15.0, `cps-config`'s dormancy, or the
absence of CPS support in vcpkg, Meson, pkgconf, build2, xmake and Bazel.

## Unverifiable

| Claim | Dive | Why | What would verify it |
|---|---|---|---|
| "the CPSDeps integration test is **passing** in this tagged release" | E | The test file exists at tag `2.32.0` and its assertions were read, but nothing was executed (and executing it is out of scope for this program). Presence in a release tag is evidence of shipping, not of a green run. | Conan's CI status for the `2.32.0` tag, or running `pytest test/integration/cps/` against that tag. |
| "A GitHub code search for `.cps` files … the only genuine CPS file found was `cps-org/cps`'s own `sample.cps`" | E | GitHub's code-search API is not reproducible across sessions (ranking, rate limits, indexing lag); the negative cannot be re-established the way an issue-search count can. The *direction* — that real `.cps` files are generated, not committed — is sound and independently supported by nesbitt.io. | A cloned-corpus grep (e.g. the 46-repo exemplar corpus already fetched for this program) rather than a code-search count. |
| "No large, widely-depended-upon C/C++ library ships `install(PACKAGE_INFO)` unconditionally" | E | Same reason: an unbounded negative over all of GitHub. | `rg -n 'install\(PACKAGE_INFO' <exemplar corpus>` over the 46 checked-out repos, which is a bounded, reproducible check this program can actually run. |
| "CMake gitlab MRs `!9693` and `!11364` located by title only" | S | S already labels these unread; not re-fetched here, and they carry no load-bearing claim. | Fetch both MR discussions from `gitlab.kitware.com/cmake/cmake/-/merge_requests/<n>`. |
| The exact mapping from a consumed CPS component's attributes onto CMake `INTERFACE_*` imported-target properties, and from CPS `configurations` onto `IMPORTED_CONFIGURATIONS` | S (open question) | Still not stated in any `Help/*.rst`. Confirmed as a genuine documentation gap, not a research miss. | Read `Source/cmImportedCpsPackage*` / the CPS import path in CMake's source, or `Tests/RunCMake/find_package` CPS cases. S's guess at the generator filename was wrong — the export side is `Source/cmExportPackageInfoGenerator.cxx`, `cmExportInstallPackageInfoGenerator.cxx`, `cmExportBuildPackageInfoGenerator.cxx`. |
| Whether `install(PACKAGE_INFO)` resolves `INSTALL_INTERFACE` and `export(PACKAGE_INFO)` resolves `BUILD_INTERFACE` | S (open question) | Still unstated in the prose docs; not resolved here. | Same source read, or a `Tests/RunCMake` fixture. |

## Corrections neither dive is wrong about but both under-state

These are primary-source findings that change how the guidance should read, without
refuting anything either dive wrote.

- **CMake re-dated `install(PACKAGE_INFO)` when it stabilised.** At tag `v4.2.0` the
  command carries `.. versionadded:: 3.31`; at `v4.3.0` and master it carries
  `.. versionadded:: 4.3`. Both stamps are "true"; a rule that says "available since
  3.31" is only true for someone who also sets a UUID gate. Rule text should say
  *usable without a gate from 4.3.0*, and treat 3.31/4.0/4.1/4.2 as gated pre-history.
- **Kitware's own recommendation is additive, in writing.** The out-the-gate post:
  "we recommend that projects generate CPS **in addition to** CMake-script package
  descriptions, with the intention that the latter is for compatibility". Neither dive
  quotes this, and both propose an additive rule — it can now be sourced rather than
  argued.
- **CMake emits `cpp_module_metadata`.** `cmExportPackageInfoGenerator.cxx` L662–670
  writes `component["cpp_module_metadata"]` when `CXX_MODULES_DIRECTORY` is set and the
  target has C++20 module sources; the spec defines the attribute as a path to a "P3286"
  file. This is the citable basis for "the modules gap closed", replacing S's inference.
- **The `CMakeConfigDeps` reference page never mentions CPS.** Zero hits for `cps` in
  `cmakeconfigdeps.rst`. Conan's CPS round trip is documented *only* in changelog
  entries. E's "undocumented" finding applies to `CPSDeps`; it applies almost as fully
  to the round trip.
- **S's rendered search-path table is lossy.** It omits three real rows
  (`<prefix>/<name>/*/cps/`, `<prefix>/cps/<name>/*/`,
  `<prefix>/(lib/<arch>|lib*|share)/cps/<name>/*/`) and one macOS row
  (`<prefix>/<name>.framework/Resources/CPS/`), and drops the `<prefix>/` on the two it
  does list. Use `find_package.rst` directly if the table is reproduced in a rule.

## Verdict for the map

**CPS is a SHOULD-grade topic for a 2026 CMake rule set, not a MUST.** The CMake side is
genuinely stable and dated — 4.3.0, 2026-03-17, no gate, `versionadded:: 4.3` on all
three commands — but the format buys a project nothing outside CMake ≥ 4.3 and Conan's
experimental round trip. Six independent tool ecosystems were checked and every one
returned a clean zero. A rule that mandates `install(PACKAGE_INFO)` would be mandating an
export nothing in the fleet's world reads.

**Safe to build rules on** (independently re-fetched, exact-quote grade): the two retired
gate names and UUIDs and the fact that setting them on a ≥ 4.3 floor is dead code; the
4.3.0 stabilisation boundary; the 4.3.3 build-tree path change; `CONFIGS` suppressing CPS
and `.cps` being preferred otherwise; the `simple`/`custom` import limit; the
"configuration-dependent generator expressions only" limitation; the namespace-must-equal-
package-name constraint (Kitware-confirmed permanent); `CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO`
as distributor-only and still gated; and Conan's 2.13.0 → 2.25.0 → 2.26.0 → 2.32.0 timeline.

**Not safe to build rules on:** anything that says CPS export existed before 4.1 (R1);
anything keyed to "the new 4.4 gate" (R2); "CMake rejects rpm/dpkg version schemas" — it
writes them and then cannot compare them (R3); any claim that the ISO Ecosystem effort is
live (R8); and any GitHub-code-search-derived adoption count.

**What the dependency-seam consolidation must decide.** First: whether CPS gets rule text
at all in this cycle, or one paragraph in the `find_package` depth file plus a re-check
date — the honest read is that the only rule with a live consumer today is "if you already
`install(EXPORT)`, add `install(PACKAGE_INFO)` beside it, guarded on
`CMAKE_VERSION VERSION_GREATER_EQUAL 4.3`, and never instead of it", which Kitware now says
in its own words. Second: the version floor the whole rule set assumes — `find_ocx` dogfoods
3.31 and 4.x, and every CPS statement flips meaning across the 4.3.0 line, so the floor has
to be stated once and inherited, not re-litigated per rule. Third: whether the
namespace-equals-package-name constraint belongs in the CPS section or in the
`install(EXPORT NAMESPACE)` section — it is the one CPS fact that changes advice about
non-CPS code, because it makes `Vendor::Product` namespaces a forward-compatibility
liability. Fourth: CPS is a *seam* topic, not a CMake-language topic; it should sit with
dependency providers and the Conan/vcpkg integration questions, and the Bazel companion
should be told the seam is empty on its side (zero hits in `rules_foreign_cc` and the BCR)
so it does not re-run the search.

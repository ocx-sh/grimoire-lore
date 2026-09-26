---
title: CPS ecosystem adoption and interoperability
topic: cps-common-package-specification
group: cmake-dependency-seam
agent: cmake-cps-ecosystem-researcher
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 29
primary_sources_count: 27
scope: |
  Who, outside CMake itself, produces or consumes the Common Package
  Specification (CPS) today — Conan, vcpkg, Meson, pkg-config/pkgconf,
  build2, xmake, Bazel/rules_foreign_cc, cps-config, and the WG21 SG15
  standards effort — and what a CMake library author must ship in 2026 to
  stay consumable across all of them. Not a CMake command reference; CMake's
  own `install(PACKAGE_INFO)`/`find_package` behavior is covered only as the
  baseline the rest of the ecosystem does or doesn't build on.
---

# CPS ecosystem adoption and interoperability

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [CMake's own CPS support: three gates, one now retired](#1-cmakes-own-cps-support-three-gates-one-now-retired)
   2. [The CPS spec itself: young, ungoverned by formal releases, Kitware-led](#2-the-cps-spec-itself-young-ungoverned-by-formal-releases-kitware-led)
   3. [Conan: two overlapping mechanisms, one documented, one not](#3-conan-two-overlapping-mechanisms-one-documented-one-not)
   4. [vcpkg: no engagement found, anywhere](#4-vcpkg-no-engagement-found-anywhere)
   5. [Meson: aware, undecided, unimplemented](#5-meson-aware-undecided-unimplemented)
   6. [pkg-config / pkgconf: named as a future interop target, not yet acted on](#6-pkg-config--pkgconf-named-as-a-future-interop-target-not-yet-acted-on)
   7. [build2: no engagement found](#7-build2-no-engagement-found)
   8. [xmake: one open, stalled feature request](#8-xmake-one-open-stalled-feature-request)
   9. [Bazel / rules_foreign_cc / Bazel Central Registry: no engagement found](#9-bazel--rules_foreign_cc--bazel-central-registry-no-engagement-found)
   10. [cps-config: the pkg-config drop-in, dormant since April 2025](#10-cps-config-the-pkg-config-drop-in-dormant-since-april-2025)
   11. [Bloomberg and the CppCon/C++Now talk trail](#11-bloomberg-and-the-cppconc-now-talk-trail)
   12. [WG21 SG15: the standards-track lineage](#12-wg21-sg15-the-standards-track-lineage)
   13. [Adoption in the wild: real but vanishingly small](#13-adoption-in-the-wild-real-but-vanishingly-small)
   14. [A real, load-bearing limitation: CPS forbids Boost-style namespace/package-name mismatch](#14-a-real-load-bearing-limitation-cps-forbids-boost-style-namespacepackage-name-mismatch)
   15. [The interoperability consequence: CPS is a third path, not a replacement, in 2026](#15-the-interoperability-consequence-cps-is-a-third-path-not-a-replacement-in-2026)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Open questions for the map](#open-questions-for-the-map)
7. [Sources](#sources)

## Summary

- **CMake ≥4.3.0** (released 2026-03-17): `install(PACKAGE_INFO)`, `export(PACKAGE_INFO)` and CPS import via `find_package()` are all **stable**, no experimental gate required. [cmake.org/.../release/4.3.html](https://cmake.org/cmake/help/latest/release/4.3.html)
- **CMake 3.31–4.2.x**: CPS export was gated behind `CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO` = `b80be207-778e-46ba-8080-b23bba22639e`; **CMake 4.0–4.2.x**: CPS import via `find_package()` was gated behind `CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES` = `e82e467b-f997-4464-8ace-b00808fff261`. Both gates are gone from `Help/dev/experimental.rst` as of 4.3.0. [Kitware: Common Package Specification is Out the Gate](https://www.kitware.com/common-package-specification-is-out-the-gate/)
- **CMake ≥4.4.0** (still experimental as of this research): a *new*, separate gate `CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO` = `ababa1b5-7099-495f-a9cd-e22d38f274f2` lets `install(EXPORT)` itself also emit CPS (`CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO`) — do not confuse this with the now-stable `install(PACKAGE_INFO)`. [Kitware/CMake experimental.rst, v4.4.0 tag](https://raw.githubusercontent.com/Kitware/CMake/v4.4.0/Help/dev/experimental.rst)
- **CMake 4.3.3**: `export(PACKAGE_INFO)` changed its output location to a `cps/<package-name>/` subdirectory of the build tree, not the build root — a breaking path change for anyone scripting around the build-tree output. [CMake 4.3 release notes source](https://raw.githubusercontent.com/Kitware/CMake/master/Help/release/4.3.rst)
- **Conan ≥2.25.0** (28-Jan-2026): `CMakeConfigDeps` gained "full CPS CMake round trip" support; Conan's own docs (`incubating.rst`) call `CMakeConfigDeps` "generally available", but its own reference page still ships the `experimental_warning.inc` box — treat it as **promoted-out-of-incubating, still experimental** as of Conan 2.32.0 (31-Aug-2026). [conan-io/docs incubating.rst](https://raw.githubusercontent.com/conan-io/docs/develop2/incubating.rst); [conan-io/docs cmakeconfigdeps.rst](https://raw.githubusercontent.com/conan-io/docs/develop2/reference/tools/cmake/cmakeconfigdeps.rst)
- **Conan has a second, separate, wholly undocumented CPS generator**: `conan.tools.cps.cps_deps.CPSDeps`, invoked as `-g CPSDeps`, producing real `.cps` files under `build/cps/<config>/cps/<name>.cps`. Confirmed present and passing tests in the tagged **2.32.0** release; zero matches for `cps` in any file path of the `conan-io/docs` repository — it has no reference page at all. [conan-io/conan test/integration/cps/test_cps.py](https://raw.githubusercontent.com/conan-io/conan/2.32.0/test/integration/cps/test_cps.py)
- **vcpkg (repo, vcpkg-tool, and learn.microsoft.com)**: zero code, zero documentation, and zero substantive issues mentioning CPS as of 2026-09-05. No stated position exists to cite, positive or negative.
- **Meson**: zero lines of CPS-consuming code in the `mesonbuild/meson` repository. The only substantive mention is maintainer discussion issue [#15848](https://github.com/mesonbuild/meson/issues/15848) (27-May-2026), which cites CPS conceptually (for ABI-representation) but proposes no implementation.
- **pkg-config / pkgconf**: no CPS support, no CPS-tagged issue in `pkgconf/pkgconf`. CPS's own literature names pkgconf as a future collaborator, but that is CPS's framing, not a pkgconf maintainer statement found anywhere in pkgconf's own repository.
- **build2**: zero engagement found — no issue, no code, no blog reference.
- **xmake**: one open, unimplemented tracking issue, [#7639](https://github.com/xmake-io/xmake/issues/7639) (04-Jul-2026), referencing a contributor's already-stale experimental branch from "a couple of months back."
- **Bazel / rules_foreign_cc / Bazel Central Registry**: zero issues mention CPS in any of `bazel-contrib/rules_foreign_cc` or `bazelbuild/bazel-central-registry`. No Bazel rule consumes `.cps` files.
- **cps-config** (`cps-org/cps-config`, "a drop in replacement for pkg-config/pkgconf using cps files"): real code exists, but the repository has had no push since **2025-04-28** — over a year stale as of this research date.
- **The CPS spec repository itself has no disciplined release process**: one lightweight git tag (`v0.5`) exists, while the published documentation (`cps-org.github.io/cps/`) is at **v0.15.0** — version bumps happen in docs prose, not in tagged releases.
- **CPS governance is Kitware-led, not multi-vendor**: of the top contributors to `cps-org/cps`, Matthew Woehlke (Kitware, editor-in-chief) and a second Kitware account together hold the overwhelming majority of commits; Conan's founder and a Meson core developer each have single-digit commit counts; no vcpkg contributor appears at all.
- **A real, load-bearing spec limitation surfaced on CMake's own forum**: CPS *requires* a package's export namespace to equal its package name, which Boost's `Boost::headers` (package `boost_headers`) violates — confirmed by CMake/CPS developer Vito Gamberini as **intentional, by design, with no workaround inside CPS**. [discourse.cmake.org, topic 15720](https://discourse.cmake.org/t/cps-doesnt-work-with-boost-headers/15720)
- **Real-world `.cps`-emitting adopters exist but are rare and opt-in**: `jasper-software/jasper` gates `install(PACKAGE_INFO)` behind `CMAKE_VERSION VERSION_GREATER_EQUAL "4.3.0"` **and** its own cache option `JAS_ENABLE_CMAKE_PACKAGE_CONFIG_CPS`; Conan founder Diego Rodriguez-Losada's own CppCon-2024 demo repository (`memsharded/cppcon24`) is a second confirmed real example. A GitHub code search for `.cps` files or `install(PACKAGE_INFO` turns up almost entirely false positives (CNC post-processor files, arcade-emulator source, unrelated acronym collisions) once the coincidental hits are excluded.
- **WG21 SG15's "C++ Ecosystem International Standard" effort (P2656) is the standards-track parent of CPS**, tracing to P1177 (2018, "Package Ecosystem Plan"), P1313 (2018, "Let's Talk About Package Specification") and P2673 (2022, "Common Description Format for C++ Libraries and Packages"). As of 2026-09-05 this remains an in-progress WG21 study-group effort, not a ratified ISO standard.
- **Net interoperability read for 2026**: CPS today removes nothing. A CMake library that wants to stay consumable by Conan, vcpkg, Meson, and a Bazel `rules_foreign_cc` wrap in 2026 still ships a `Config.cmake` (or lets `CMakeConfigDeps`/`CMakeDeps` generate one) and a `.pc` file; `install(PACKAGE_INFO)` is additive, consumed today only by CMake itself and, experimentally, by Conan's round-trip tooling.

## Findings

### 1. CMake's own CPS support: three gates, one now retired

CMake shipped CPS support in three separate steps, each behind its own experimental-feature UUID gate (the mechanism documented in [`Help/dev/experimental.rst`](https://raw.githubusercontent.com/Kitware/CMake/master/Help/dev/experimental.rst)):

| CMake version | Feature | Gate variable | UUID | Status as of 2026-09-05 |
|---|---|---|---|---|
| 3.31 | `install(PACKAGE_INFO)` / `export(PACKAGE_INFO)` (CPS export) | `CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO` | `b80be207-778e-46ba-8080-b23bba22639e` | **Retired at 4.3.0** — no longer needed |
| 4.0 | `find_package()` CPS import | `CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES` | `e82e467b-f997-4464-8ace-b00808fff261` | **Retired at 4.3.0** — no longer needed |
| ≥4.4.0 | `install(EXPORT)` / `export(EXPORT)` *also* emitting CPS via `CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO` | `CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO` | `ababa1b5-7099-495f-a9cd-e22d38f274f2` | **Still experimental** |

Verified by diffing `Help/dev/experimental.rst` across tags: the export- and find-gates are present at [v4.2.0](https://raw.githubusercontent.com/Kitware/CMake/v4.2.0/Help/dev/experimental.rst) and absent at [v4.3.0](https://raw.githubusercontent.com/Kitware/CMake/v4.3.0/Help/dev/experimental.rst); the new mapped-package-info gate is absent at v4.3.0 and present at [v4.4.0](https://raw.githubusercontent.com/Kitware/CMake/v4.4.0/Help/dev/experimental.rst), [v4.4.1](https://raw.githubusercontent.com/Kitware/CMake/v4.4.1/Help/dev/experimental.rst), and current `master` (checked out as `4.4.20260905`, i.e. a dev snapshot past 4.4.1).

Correct usage today (CMake ≥4.3, stable, no gate needed):

```cmake
# correct — CMake 4.3+
add_library(mypkg src/mypkg.cpp)
target_include_directories(mypkg PUBLIC
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
  $<INSTALL_INTERFACE:include>)
install(TARGETS mypkg EXPORT mypkg)
install(PACKAGE_INFO mypkg EXPORT mypkg VERSION 1.0.0 LICENSE "MIT")
```

Incorrect / obsolete (the pattern still circulating in 2024–2025 demo repos and blog posts, including [Bloomberg's own CppCon-2024 demo](https://github.com/memsharded/cppcon24/blob/main/cmake_cps/CMakeLists.txt)):

```cmake
# obsolete on CMake >= 4.3 — the gate no longer exists and the set() is a no-op
set(CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO "b80be207-778e-46ba-8080-b23bba22639e")
install(PACKAGE_INFO mypkg EXPORT mypkg)
```

The exact `install(PACKAGE_INFO)` grammar, "Added in version 4.3" ([cmake.org/.../install.html](https://cmake.org/cmake/help/latest/command/install.html)):

```
install(PACKAGE_INFO <package-name> EXPORT <export-name>
        [PROJECT <project-name>|NO_PROJECT_METADATA]
        [APPENDIX <appendix-name>]
        [DESTINATION <dir>]
        [LOWER_CASE_FILE]
        [VERSION <version>
         [COMPAT_VERSION <version>]
         [VERSION_SCHEMA <string>]]
        [DEFAULT_TARGETS <target>...]
        [DEFAULT_CONFIGURATIONS <config>...]
        [LICENSE <license-string>]
        [DEFAULT_LICENSE <license-string>]
        [DESCRIPTION <description-string>]
        [HOMEPAGE_URL <url-string>]
        [PERMISSIONS <permission>...]
        [CONFIGURATIONS <config>...]
        [CXX_MODULES_DIRECTORY <directory>]
        [COMPONENT <component>]
        [EXCLUDE_FROM_ALL])
```

Output file naming: `<package-name>[-<appendix-name>].cps`, or lower-cased with `LOWER_CASE_FILE`. `COMPAT_VERSION` defaults to `VERSION` if omitted ("no backwards compatibility is provided"). `project()` gained `COMPAT_VERSION` and `SPDX_LICENSE` options in the same 4.3 release, feeding the CPS description automatically. [CMake 4.3 release notes source](https://raw.githubusercontent.com/Kitware/CMake/master/Help/release/4.3.rst)

`find_package()`'s CPS search algorithm ([`Help/command/find_package.rst`, v4.3.0 tag](https://raw.githubusercontent.com/Kitware/CMake/v4.3.0/Help/command/find_package.rst)):

- Looks for `<PackageName>.cps` / `<lowercasePackageName>.cps` **only** in search paths that contain `/cps/` (e.g. `<prefix>/<name>/cps/`, `<prefix>/cps/<name>/`, `<prefix>/(lib/<arch>|lib*|share)/cps/<name>/`, and macOS Framework `Resources/CPS/`); `.cmake` config files are looked for everywhere else.
- "Search is implemented in a manner that will tend to prefer [CPS] files over CMake-script config files in most cases."
- Passing `CONFIGS <file>...` to `find_package()` **suppresses CPS search entirely**, because CPS files' names are fixed to the package name and can't match an arbitrary `CONFIGS` filename.
- Version checks for CPS packages use the package's own `version` plus the CPS `compat_version`/`version_schema` fields, not CMake's `<Pkg>_FIND_VERSION` string matching used for Config-mode packages.
- Transitive `requires` inside a CPS component resolve via a nested `find_package()` call that can land on *either* another CPS package or a legacy CMake-script Config package; when it lands on a Config package, CPS's declared components are passed as `OPTIONAL_COMPONENTS` because Config packages have no formal notion of "components" — "this ... does not have the same correlation to imported targets that is normal for CPS."

### 2. The CPS spec itself: young, ungoverned by formal releases, Kitware-led

The spec is maintained at [`cps-org/cps`](https://github.com/cps-org/cps), documented at [cps-org.github.io/cps/](https://cps-org.github.io/cps/), currently at **v0.15.0** (as shown in the docs' page titles as of this research). The repository has exactly **one** git tag, `v0.5`, and **zero** GitHub Releases — version numbers advance in the documentation, not through a tagged release process. Treat "v0.15.0" as a moving, pre-1.0, undisciplined-release-cadence number, not a stable API contract.

Governance, per the spec's own [Development](https://cps-org.github.io/cps/development.html) page: an "editor in chief" (currently **Matthew Woehlke**, Kitware) curates the spec; changes not previously discussed "may not be desirable, and may be rejected." Discussion venues are GitHub Issues/Discussions, the `#ecosystem_evolution` channel on the CppLang Slack, a `cxx-ecosystem-evolution` mailing list, and monthly video calls — i.e., the same infrastructure as WG21 SG15's ecosystem-evolution activity, not a separate multi-vendor standards body.

Contributor counts on `cps-org/cps` confirm a Kitware-dominated project: `mwoehlke` (91 commits) and `mwoehlke-kitware` (54) together dwarf every other contributor; `dcbaker` (Dylan Baker, a Meson core developer) has 4; `bretbrownjr` (Bret Brown, Bloomberg) and `memsharded` (Diego Rodriguez-Losada, Conan's founder) have 1 each. No `vcpkg`-affiliated account appears in the contributor list at all. [github.com/cps-org/cps](https://github.com/cps-org/cps)

The `cps-org` GitHub organization has four repositories: `cps` (spec, 192 stars, pushed 2026-06-26 — active), `cps-examples` (4 stars, pushed 2026-05-04), `cps-wiki` (4 stars, dormant since 2024-02-01), and `cps-config` (21 stars, dormant since 2025-04-28 — see §10).

Canonical field names, taken from the schema-shaped example in [`cps-org/cps-examples`](https://github.com/cps-org/cps-examples) and cross-checked against a real Conan-generated file in `test/integration/cps/test_cps.py`:

```json
{
  "cps_version": "0.12.0",
  "name": "pkg",
  "version": "0.1",
  "license": "MIT",
  "description": "…",
  "default_components": ["pkg"],
  "configurations": ["release"],
  "components": {
    "pkg": {
      "type": "interface",
      "includes": ["…"],
      "compile_flags": [],
      "definitions": {},
      "link_flags": [],
      "link_languages": ["…"],
      "link_libraries": [],
      "link_location": null,
      "location": "…",
      "requires": ["…"]
    }
  },
  "requires": { "libfoo": { "version": "…" } }
}
```

### 3. Conan: two overlapping mechanisms, one documented, one not

Conan's CPS story has **two** distinct pieces that are easy to conflate:

**a) `CMakeConfigDeps`** — a CMake-native `find_package()`-config generator, positioned as the eventual replacement for `CMakeDeps`, that gained CPS *round-trip* support as one of its features:

| Conan version | Date | Change |
|---|---|---|
| 2.13.0 | 26-Feb-2025 | `CMakeConfigDeps` introduced, "incubating", behind a config feature flag ([#17831](https://github.com/conan-io/conan/pull/17831)) |
| 2.25.0 | 28-Jan-2026 | Moved from incubating to experimental ([#19421](https://github.com/conan-io/conan/pull/19421)); "Support full CPS CMake round trip in `CMakeConfigDeps`" ([#19410](https://github.com/conan-io/conan/pull/19410)); CPS shared-lib support ([#19417](https://github.com/conan-io/conan/pull/19417)); CPS-component round trip ([#19428](https://github.com/conan-io/conan/pull/19428)) |
| 2.26.0 | 25-Feb-2026 | CPS parsing/naming bugfixes ([#19539](https://github.com/conan-io/conan/pull/19539), [#19584](https://github.com/conan-io/conan/pull/19584)) |
| 2.32.0 (current) | 31-Aug-2026 | `incubating.rst` calls it "not incubating anymore, but already generally available"; its own reference page **still carries the standard experimental-warning box** and the sentence "available as experimental from Conan 2.25" |

Sources: [conan-io/docs `incubating.rst`](https://raw.githubusercontent.com/conan-io/docs/develop2/incubating.rst), [conan-io/docs `cmakeconfigdeps.rst`](https://raw.githubusercontent.com/conan-io/docs/develop2/reference/tools/cmake/cmakeconfigdeps.rst), [conan-io/docs `changelog.rst`](https://raw.githubusercontent.com/conan-io/docs/develop2/changelog.rst). The contradiction between the two docs pages is real, not a research artifact — read it as "graduated past the incubating opt-in flag, but still an experimental, breaking-changes-possible surface" as of 2.32.0.

Usage (unchanged whether or not CPS round-trip is exercised):

```python
# conanfile.py
class Pkg(ConanFile):
    requires = "hello/0.1"
    generators = "CMakeConfigDeps"
```
```cmake
find_package(hello CONFIG REQUIRED)
target_link_libraries(app PRIVATE hello::hello)
```

**b) `CPSDeps`** — a *separate*, standalone generator, `conan.tools.cps.cps_deps.CPSDeps`, invoked with `-g CPSDeps`, that writes real `.cps` files directly:

```
$ conan install --requires=pkg/0.1 -s ... -g CPSDeps
# writes build/cps/<config>/cps/pkg.cps
```

Confirmed present, and its integration test passing, in the **tagged 2.32.0 release** ([`test/integration/cps/test_cps.py`](https://raw.githubusercontent.com/conan-io/conan/2.32.0/test/integration/cps/test_cps.py)). A search of the entire `conan-io/docs` repository tree for any path containing `cps` returns **zero files** — `CPSDeps` has no reference page, no tutorial mention, nothing in `changelog.rst` under its own name (only under the `CMakeConfigDeps`-round-trip framing above). It also supports the reverse direction — consuming an existing `.cps` file inside a recipe's `package_info()` via `CPS.load(path).to_conan()`.

A live gap: [conan-io/conan#19589](https://github.com/conan-io/conan/issues/19589) (opened 2026-02-09, closed 2026-02-18) reports that CPS's package-name/target-namespace rule (see §14) breaks a working CMake+Conan+Boost setup, and requests a name-mapping escape hatch — evidence the round trip is still actively being hardened against real projects, not a finished feature.

### 4. vcpkg: no engagement found, anywhere

Searched: `microsoft/vcpkg` (code and issues), `microsoft/vcpkg-tool` (code and issues), and `learn.microsoft.com/vcpkg`. Result: **zero** code hits, **zero** documentation hits, and the handful of issue-search hits for "CPS" are unrelated string collisions (build-failure logs, an unrelated `pkgconfing` typo issue) — none discuss the Common Package Specification. There is no vcpkg RFC, discussion, or blog post taking a position on CPS, for or against, as of 2026-09-05. This is a genuine, checked absence, not an unsearched gap.

### 5. Meson: aware, undecided, unimplemented

A code search of `mesonbuild/meson` for `CPS` returns **zero** matches — `dependency()` has no CPS backend. The only substantive discussion is issue [#15848](https://github.com/mesonbuild/meson/issues/15848) ("limitations of dependencies, what to do about it, and how to not break everything…", opened 27-May-2026), which mentions CPS only as a comparison point for representing incompatible-ABI information: "pkg-config cannot declare this, but CMake dependencies and CPS can represent this." No implementation plan, milestone, or gate is proposed. Independent commentary (e.g. [nesbitt.io](https://nesbitt.io/2026/04/13/common-package-specification.html)) states in passing that "CPS is a JSON format that CMake, Meson, and autotools can all read" — this is **aspirational, not current fact**; it is not corroborated by anything in Meson's own repository.

### 6. pkg-config / pkgconf: named as a future interop target, not yet acted on

A code and issue search of `pkgconf/pkgconf` for `CPS` returns **zero** results — no open issue, no merged feature, no maintainer statement in that repository. Secondary sources describe CPS's *aspiration* to interoperate with pkg-config/pkgconf ("CPS/pkg-config interop is actively underway", per [Kitware's own retrospective](https://www.kitware.com/common-package-specification-is-out-the-gate/)) but that is Kitware's framing of the relationship, not something documented from pkgconf's side as of this research date.

### 7. build2: no engagement found

A code and issue search across the `build2` GitHub organization for `CPS` returns only coincidental string matches (a `pkgconf 2.2.0` version number in an unrelated build-failure issue title, a `key.pem` filename). No CPS engagement of any kind exists in `build2`'s own repositories.

### 8. xmake: one open, stalled feature request

[`xmake-io/xmake#7639`](https://github.com/xmake-io/xmake/issues/7639), "Common Package Specification (CPS) support for xmake/xrepo", opened 2026-07-04, still **open** with 3 comments as of this research date. The issue author explicitly frames it as a tracking issue and references a contributor's (`ecoezen`) experimental branch that is "a bit aged as stale" after "a couple of months." No shipped code exists in `xmake-io/xmake` itself.

### 9. Bazel / rules_foreign_cc / Bazel Central Registry: no engagement found

Issue searches of `bazel-contrib/rules_foreign_cc` and `bazelbuild/bazel-central-registry` for `CPS` return **zero** results; a code-string search returns only coincidental matches unrelated to the Common Package Specification. No Bazel rule reads `.cps` files, and no BCR policy document mentions CPS. This is the proven negative the research brief asked for: as of 2026-09-05, the Bazel side of the interoperability question is entirely untouched by CPS.

### 10. cps-config: the pkg-config drop-in, dormant since April 2025

[`cps-org/cps-config`](https://github.com/cps-org/cps-config): "A drop in replacement for pkg-config/pkgconf using cps files." MIT-licensed, 21 stars, 29 open issues, **last pushed 2025-04-28T21:49:41Z** — over 16 months stale relative to this research date. It is real, working code (`src/cps/loader.cpp`, `loader.hpp`) but is not being actively developed at anything like the pace of the spec repo itself (pushed 2026-06-26) or CMake's own implementation. This is the tool that would let a Meson, build2, or Autotools consumer read a `.cps` file the way it reads a `.pc` file today — and it is currently the weakest link in the chain, not CMake's side.

### 11. Bloomberg and the CppCon/C++Now talk trail

Bret Brown (Bloomberg, Build Tools team lead) is a named co-author of CPS's originating work and a recurring speaker:

- **CppCon 2023 keynote**, Bret Brown & Bill Hoffman, "A First Step Toward Standard C++ Dependency Management" — [cppcon.org/2023-keynote-bret-brown-bill-hoffman](https://cppcon.org/2023-keynote-bret-brown-bill-hoffman/); [isocpp.org writeup](https://isocpp.org/blog/2024/06/cppcon-2023-libraries-a-first-step-toward-standard-cpp-dependency-mgmt-bret).
- **CppCon 2024**, "Common Package Specification (CPS) in Practice: A Full Round Trip Implementation in Conan C++ Package Manager" — a working demonstration that "current package information in ConanCenter allows automatic creation of CPS files for many tens of thousands of packages." The demo's own companion repository, [`memsharded/cppcon24`](https://github.com/memsharded/cppcon24) (owned by Conan founder Diego Rodriguez-Losada), contains a real, runnable `install(PACKAGE_INFO)` example (quoted in §1) — pushed 2025-02-07, i.e. before CPS stabilized in 4.3, so it still carries the now-obsolete experimental gate.
- **C++Now 2025**, "CPS in CMake" (Bill Hoffman, with Bret Brown), scheduled 30-Apr-2025 per [Kitware's own conference page](https://www.kitware.com/cnow-2025/): "explores CMake 4.0's experimental CPS support and its impact on IDEs, package managers, and SBOM generation."

No Bloomberg engineering-blog post specifically about CPS was found independent of the conference talks above.

### 12. WG21 SG15: the standards-track lineage

CPS traces to a chain of WG21 SG15 (Tooling Study Group) papers, all on [open-std.org](https://www.open-std.org/):

- [P1177](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2018/p1177r1.pdf) (2018), "Package Ecosystem Plan" — outlines the goal of a cohesive package production/consumption ecosystem across all C++ tools.
- [P1313](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2018/p1313r0.html) (2018), "Let's Talk About Package Specification" — the direct conceptual ancestor of a package-description format.
- [P2673](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2022/p2673r0.pdf) (2022), "Common Description Format for C++ Libraries and Packages" — the paper that names and scopes what became CPS, prompted by C++20 Modules removing the option of getting by with older, looser conventions.
- [P2656R2](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2023/p2656r2.html) (2023-02-14), "C++ Ecosystem International Standard" — proposes a **new International Standard** (separate from the C++ IS itself) covering "formats, processes, definitions... that facilitate the interoperation of the tools and systems that implement, and interface with, the C++ International Standard," explicitly including build-system/package-manager interoperability. As of P2656R2's own text this was still "in progress," targeting a Q3-2025 publication track; no later revision or ratification record was found in this research pass (see Open questions).

### 13. Adoption in the wild: real but vanishingly small

A GitHub code search for files with extension `.cps` returns tens of thousands of hits, but essentially all of the ones inspected are unrelated formats that happen to share the extension (CNC/CAM post-processor scripts, Capcom-Play-System arcade-emulator source, old GCC/Texinfo index files, COPASI simulation files). Among the sampled results, the **only genuine Common-Package-Specification file found was `cps-org/cps`'s own `sample.cps`** — real `.cps` outputs are generated into build/install trees by CMake or Conan, not committed to source control, so a source-code search under-counts real usage but also shows there is no meaningful trend of projects checking generated `.cps` files into their repos.

A search for `install(PACKAGE_INFO` in CMake files is less noisy and does surface genuine adopters:

- [`jasper-software/jasper`](https://raw.githubusercontent.com/jasper-software/jasper/master/src/libjasper/CMakeLists.txt) gates it behind both a CMake-version check and a project-local opt-in option:
  ```cmake
  if(CMAKE_VERSION VERSION_GREATER_EQUAL "4.3.0" AND
     JAS_ENABLE_CMAKE_PACKAGE_CONFIG_CPS)
    install(PACKAGE_INFO ${CMAKE_PROJECT_NAME} EXPORT JasPerTargets
      VERSION ${PROJECT_VERSION} LICENSE "JasPer-2.0")
  endif()
  ```
- `memsharded/cppcon24` (§11), a demo repository, not a library used by others.

No large, widely-depended-upon C or C++ library was found shipping `install(PACKAGE_INFO)` unconditionally (without a version guard and/or an opt-in flag) as of 2026-09-05.

### 14. A real, load-bearing limitation: CPS forbids Boost-style namespace/package-name mismatch

On CMake's own Discourse, thread [15720, "CPS doesn't work with Boost::headers"](https://discourse.cmake.org/t/cps-doesnt-work-with-boost-headers/15720) (opened 2026-06-19 by user Yanzhao_Wang, CMake 4.3.0, Boost 1.90):

> `CMake Error in src/CMakeLists.txt: Target "mps" references target "Boost::headers", which comes from the "boost_headers" package, but does not belong to the package's canonical namespace ("boost_headers::"). This is not allowed.`

CMake/CPS developer Vito Gamberini's reply (2026-06-25) confirms this is intentional, permanent design, not a bug:

> "There's no solution here. The incompatibility is intentional... Having packages namespaced by anything other than the package name was a possibility opened by the original CMakeConfig mechanism. This possibility made further innovations extremely difficult... CPS wants to fix that... So it shut the door on the mechanism used by the old CMakeConfigs."

The only workaround is `find_package(Boost REQUIRED MODULE)` — i.e., **not using CPS for that dependency at all**. Any project whose exported target namespace differs from its CPS package name (a common pattern: `Boost::`, many `Vendor::Product` namespaces that don't match their `find_package()` name) cannot be represented as a CPS package without renaming, and this same rule is what conan-io/conan#19589 (§3) was filed against.

### 15. The interoperability consequence: CPS is a third path, not a replacement, in 2026

Given §1–§14, answering the brief's pinned questions directly:

| Tool | Produces `.cps`? | Consumes `.cps`? | Since | Status |
|---|---|---|---|---|
| CMake | Yes (`install`/`export(PACKAGE_INFO)`) | Yes (`find_package()`) | 3.31 export / 4.0 import, both **stable at 4.3.0** | Stable; a *newer* dual-export path (`install(EXPORT)` → CPS) is experimental since 4.4.0 |
| Conan | Yes (`CPSDeps`, undocumented; `CMakeConfigDeps` round-trip) | Yes (`CPS.load().to_conan()`) | 2.25.0 (round trip); `CPSDeps` version-introduced date unconfirmed (see Open questions) | Experimental / undocumented |
| vcpkg | No | No | — | No stated position found |
| Meson | No | No | — | Aware (1 issue), no implementation |
| pkg-config/pkgconf | No | No | — | Named as a future target by CPS, not by pkgconf |
| build2 | No | No | — | No engagement found |
| xmake | No (open issue only) | No | — | Tracking issue open since 2026-07-04, stale experimental branch |
| Bazel / rules_foreign_cc | No | No | — | No engagement found |

**Does CPS remove the need for Conan's `CMakeDeps`-generated Config files or vcpkg's toolchain-file integration?** No. Neither Conan nor vcpkg has stopped, deprecated, or announced deprecation of their existing CMake-integration paths. CPS is additive.

**Does it add a third path alongside `Config.cmake` and `.pc`?** Yes, and only for consumers that are CMake itself or Conan's experimental round-trip tooling today. A CMake project that wants maximal 2026 consumability across Conan, vcpkg, Meson, and a Bazel `rules_foreign_cc` wrap must still ship **both** a CMake Config package (hand-written, or generated by `CMakeConfigDeps`/`CMakeDeps` for the Conan case, or vcpkg's own portfile mechanism) **and** a `.pc` file for pkg-config-only consumers (Meson's `dependency('name')` falls back to pkg-config; Bazel's `rules_foreign_cc` wraps whatever the underlying build produces and has no CPS awareness). `install(PACKAGE_INFO)` is worth adding **in addition**, because it costs little and is read by CMake ≥4.3 today, but it substitutes for nothing yet.

## Normative guidance candidates

1. **Ship `install(PACKAGE_INFO)` unconditionally guarded by a CMake-version check; never assume the experimental gate still applies.**
   Rationale: the gate variables (`CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO`, `CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES`) were retired in CMake 4.3.0; setting a retired `CMAKE_EXPERIMENTAL_*` variable is a silent no-op, not an error, so a copy-pasted 2024/2025 snippet keeps "working" while doing nothing observable until someone checks the installed output.
   Verify: `grep -rn 'CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO\|CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES' **/*.cmake CMakeLists.txt` — any hit is a stale pattern to remove; pair with `grep -n 'cmake_minimum_required' CMakeLists.txt` to confirm the floor is below 4.3 (if ≥4.3 is already required, the `set(CMAKE_EXPERIMENTAL_...)` line is pure dead code). Empty output on the first grep means the project never touched the old gate — nothing to fix here, check separately whether `install(PACKAGE_INFO)` is used at all.

2. **Never write `install(PACKAGE_INFO)`/CPS guidance that assumes a project's exported target namespace can differ from its package name.**
   Rationale: CPS's namespace-must-equal-package-name rule is a permanent, confirmed-intentional design constraint (§14), not a bug queued for a fix — a rule set that tells authors "just add `install(PACKAGE_INFO)`" without checking this will break on any project shaped like Boost.
   Verify: before recommending CPS export, grep the project's own `install(EXPORT ... NAMESPACE <ns>)` calls and confirm `<ns>` (minus the trailing `::`) case-insensitively matches the intended CPS `<package-name>`. A mismatch means either rename the namespace, split into a differently-named CPS package per namespace, or skip CPS for that export and rely on the CMake-script Config file instead — do not attempt a workaround inside CPS, none exists as of 2026-09-05.

3. **Do not tell an AI agent or a human author that Meson, vcpkg, pkg-config, build2, or Bazel currently read `.cps` files.**
   Rationale: verified zero implementation in each of those projects' own repositories as of 2026-09-05 (§4–§9); several public blog posts (e.g. nesbitt.io) state or imply otherwise in present tense, and that phrasing is the single most likely source of a hallucinated "just ship a `.cps` file, Meson will pick it up" claim.
   Verify: this is a reading-heuristic check, not a grep — before trusting any claim of the form "<tool> supports CPS", require a citation to that tool's own repository, docs, or issue tracker (not a Kitware/CPS-side source describing the tool), dated and versioned. No such citation existing for Meson/vcpkg/pkg-config/build2/Bazel as of this research date is the expected, correct state, not a gap in this research.

4. **Treat Conan's `CPSDeps` generator (`-g CPSDeps`) as usable-but-undocumented; do not point authors at official Conan docs for it, because none exist.**
   Rationale: the generator ships and its tests pass in the tagged Conan 2.32.0 release, but zero pages under `conan-io/docs` mention it — any "official" reference an agent produces for `CPSDeps` is necessarily fabricated.
   Verify: `curl -sL https://docs.conan.io/2/search.html?q=CPSDeps` (or grep a local clone of `conan-io/docs` for `cps`) returning nothing is expected and correct; cite the generator only from Conan's own source (`conan/tools/cps/cps_deps.py`) and its integration test, never from a docs URL that doesn't exist.

5. **Treat `CMakeConfigDeps` as experimental, even where Conan's own `incubating.rst` calls it "generally available."**
   Rationale: the generator's own dedicated reference page (`cmakeconfigdeps.rst`) still carries Conan's standard experimental-warning include as of the 2.32.0-era docs — the two Conan-authored pages disagree, so the more conservative, still-in-force warning governs.
   Verify: fetch `https://docs.conan.io/2/reference/tools/cmake/cmakeconfigdeps.html` and check for the experimental-warning admonition box; its presence means "experimental" wins regardless of what `incubating.rst` says elsewhere.

6. **For 2026, tell library authors to ADD `install(PACKAGE_INFO)`, not to REPLACE their existing `Config.cmake` + `.pc` export with it.**
   Rationale: no consumer this research found — not vcpkg, not Meson, not pkg-config, not Bazel — reads CPS today; removing the Config/`.pc` path in favor of CPS alone would make the package unconsumable by every non-CMake, non-Conan-experimental tool in the fleet's own interoperability matrix.
   Verify: a project is "maximally consumable" in 2026 iff it satisfies **all** of: (a) `find_package(<name> CONFIG)` succeeds against its installed tree (hand-written or Conan/vcpkg-generated Config file present), (b) a `.pc` file exists under `lib/pkgconfig/` or `share/pkgconfig/`, and (c), optionally and additively, `install(PACKAGE_INFO)` is present guarded by `if(CMAKE_VERSION VERSION_GREATER_EQUAL "4.3")`. Grep for all three; missing (a) or (b) is a real consumability gap, missing (c) is not (yet) one.

7. **When CPS export is added, pin behavior to CMake 4.3.3+ if the build-tree (as opposed to install-tree) output path matters to any tooling.**
   Rationale: `export(PACKAGE_INFO)`'s build-tree output location changed in the 4.3.3 patch release (from the build root to a `cps/<package-name>/` subdirectory) — a project or CI script that globs for the old flat location will silently stop finding the file after an unrelated CMake patch bump.
   Verify: `grep -rn 'export(PACKAGE_INFO' CMakeLists.txt cmake/` and, if found, check any script that consumes the build-tree output for a hard-coded flat path rather than a `cps/*/*.cps` glob.

8. **Do not recommend the `CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO` / `CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO` combination as a general-purpose CPS-export mechanism.**
   Rationale: this is a distinct, still-experimental (as of 4.4.x/master) feature layered on top of the already-stable `install(PACKAGE_INFO)`, meant for retrofitting CPS output onto an existing `install(EXPORT)` call without restructuring it — using it as if it were the standard, stable path conflates two different stability tiers.
   Verify: `grep -n 'CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO\|CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO' CMakeLists.txt` — any hit should be paired with an explicit acknowledgment (in a comment or the project's docs) that this is experimental and UUID-gated, distinct from the plain `install(PACKAGE_INFO)` call.

## AI-agent angle

An LLM trained before CMake 4.3 (March 2026) landed will characteristically:

- **Hallucinate or misdate the experimental gate.** It may invent a plausible-looking `CMAKE_EXPERIMENTAL_...` variable name/UUID pair, or cite the real pre-4.3 gates (`CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO` / `CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES`) as still required on a modern floor. *Check*: if the project's `cmake_minimum_required` is ≥4.3 and the generated CMakeLists still contains a `set(CMAKE_EXPERIMENTAL_...)` line for either of those two variables, it's dead code from a stale training-era pattern — delete it.
- **Confuse a CPS file with a CMake Config package or a pkg-config `.pc` file.** All three answer "where is my dependency and how do I link it," so a model may describe `install(PACKAGE_INFO)` as "just another way to generate `<Pkg>Config.cmake`" or claim a `.pc` file and a `.cps` file are interchangeable outputs of the same command. *Check*: the three are separate, separately-invoked commands (`install(EXPORT)`, `install(PACKAGE_INFO)`, and whatever hand-rolled or `pkg_check_modules`-fed `.pc` generation the project uses) writing to different filenames (`<name>Config.cmake` vs. `<name>.cps` vs. `<name>.pc`) — grep the CMakeLists for all three and confirm the model's claim names the one it actually means.
- **Overclaim ecosystem-wide consumption.** Trained on early CPS-launch enthusiasm and blog posts phrased in aspirational present tense ("CPS is a format Meson and autotools can read"), a model will assert Meson, vcpkg, or Bazel support that does not exist (§4, §5, §9). *Check*: demand a citation from the named tool's *own* repository/docs/issue-tracker, dated; the absence of one is disqualifying, not an oversight to paper over.
- **Treat "experimental" and "stable" as interchangeable, or the reverse — assume 4.3's stabilization means every CPS-adjacent feature is stable.** The new `CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO` gate (§1, since 4.4.0) is exactly the trap: a model that knows "CPS became stable in 4.3" may wrongly extend that stability to this newer, genuinely-still-experimental sibling feature. *Check*: `grep` the exact gate variable name against the current `Help/dev/experimental.rst` of the CMake version actually in use — presence there means still-experimental, full stop, regardless of what shipped stable in an earlier minor version.
- **Recommend renaming a target's export namespace to fix a CPS error, without recognizing it as data loss for existing CMake-script consumers.** A model presented with the Boost-style error from §14 may suggest "just rename `Boost::headers` to `boost_headers::headers`" as a generically-safe fix, without flagging that this is a breaking change for every existing `target_link_libraries(... Boost::headers)` call across a consumer's codebase. *Check*: any suggested namespace rename to satisfy CPS should be flagged as a breaking API change to the exported target names, requiring a deprecation alias (`add_library(Boost::headers ALIAS boost_headers::headers)`) if backward compatibility matters — a model that proposes the rename without the alias has not thought through the consequence.

## Contested / evolving

- **CMakeConfigDeps stability tier**: Conan's own two documentation pages disagree (§3/§5) — `incubating.rst` says "generally available," `cmakeconfigdeps.rst` still carries the experimental-warning box. Trending: given the pace of bugfixes still landing in 2.26.x–2.27.x for CPS-round-trip specifically, treat this as *converging toward stable but not there yet* as of 2026-09-05; re-check at the next Conan minor release for the warning box's removal.
- **The CPS spec's own version discipline**: v0.15.0 in docs, one lightweight `v0.5` git tag, zero GitHub Releases. Trending: no evidence of movement toward a disciplined SemVer release process found in this pass; this is a standing risk for anyone depending on field-level stability across CPS versions, not a resolved question.
- **`CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO` (install(EXPORT)-as-CPS)**: brand new as of CMake 4.4.0, actively evolving, UUID will very likely change again before stabilization (per CMake's own stated policy that experimental-gate UUIDs "may change in future versions").
- **Namespace/package-name equivalence (§14)**: Kitware's position (Gamberini) is that this is permanent, not a bug. Conan's community (issue #19589) is actively pushing back with a name-mapping proposal. As of 2026-09-05 this reads as *unresolved tension between the spec's design philosophy and real-world package shapes like Boost*, not a settled question — track the fate of #19589 and any successor spec-repo discussion.
- **CPS ⇄ pkg-config interop**: Kitware's retrospective post calls this "actively underway"; nothing in `pkgconf/pkgconf`'s own repository substantiates it. Trending: unclear — could be happening off-repo (mailing list, Slack) with no code yet, or could be aspirational framing with no concrete work at all. Not resolvable from public repository evidence alone.
- **SG15's "C++ Ecosystem International Standard" (P2656) timeline**: P2656R2's text (2023) targeted a Q3-2025 publication track; this research pass found no later revision (R3+) or a ratification record, and did not have time to search WG21's post-2023 mailing/paper index exhaustively. Status as of 2026-09-05 is genuinely unconfirmed, not merely uninteresting — flagged explicitly below as an open question.
- **Adoption trend line**: real, but from a near-zero base. The signal that most credibly generalizes is the direction (Conan and CMake actively investing, both governance-adjacent to Kitware/Bloomberg; every non-CMake, non-Conan tool at "aware at best") rather than any specific number — a project doing a repeat of this dive in six months should expect movement mainly in the Conan/CMake pair, not a sudden Meson or vcpkg reversal.

## Open questions for the map

- **What CMake version(s) does the fleet's own `find_ocx`/OCX baseline actually target, and does it fall above or below 4.3?** This dive did not check the frame's own adopting codebase against the 4.3 stabilization line — a follow-up should grep `find_ocx`'s `cmake_minimum_required` and harness matrix (3.31 and 4.x per the frame) against the exact 4.3.0 threshold before any normative rule assumes CPS is even available.
- **Exact Conan version that first shipped the standalone `CPSDeps` generator class** (as opposed to the `CMakeConfigDeps`-round-trip feature, which is version-pinned in §3). This research confirmed it exists and works in 2.32.0 and confirmed the *concept* first appears in changelog entries from 2.25.0, but did not isolate the exact PR/version that introduced `conan.tools.cps.cps_deps.CPSDeps` as a directly-invokable `-g CPSDeps` generator distinct from the CMakeConfigDeps round trip. A follow-up should `git log -p --follow conan/tools/cps/cps_deps.py` against a full clone (this pass only had GitHub's rate-limited search API and raw-file fetches, not a full history walk).
- **Current status of P2656 ("C++ Ecosystem International Standard") past R2 (2023).** Not found in this pass: any R3+ revision, any WG21 poll result, or confirmation/denial that the Q3-2025 target was met, slipped, or abandoned. A follow-up should walk the WG21 papers index (`open-std.org/jtc1/sc22/wg21/docs/papers/2024/` and `2025/` directories) directly for P2656 revisions and any successor paper number.
- **Whether the CPS/pkg-config interop Kitware describes as "actively underway" has any concrete artifact** (a paper, a proof-of-concept branch, a named person) anywhere outside of the one sentence in the Kitware retrospective post. Not found; worth one more targeted pass against the CppLang Slack `#ecosystem_evolution` archive or the `cxx-ecosystem-evolution` mailing list if either is publicly readable.
- **Whether any downstream Linux distribution (Debian, Fedora, Arch, Homebrew, Conda-forge) has taken a packaging-policy position on CPS** — outside this dive's brief but directly relevant to whether "ship a `.cps` file" is a real distribution-facing win or a CMake/Conan-only curiosity. Not researched at all in this pass.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [kitware.com/navigating-cmake-dependencies-with-cps](https://www.kitware.com/navigating-cmake-dependencies-with-cps/) | Kitware blog | 2026, CMake 4.0 era | Announces `find_package()` CPS import and its gate; the brief's named starting point |
| [kitware.com/common-package-specification-is-out-the-gate](https://www.kitware.com/common-package-specification-is-out-the-gate/) | Kitware blog | 2026-03, CMake 4.3 | Primary announcement of CPS leaving experimental status; gate UUIDs, known limitations |
| [kitware.com/a-year-closer-to-standard-c-dependency-management](https://www.kitware.com/a-year-closer-to-standard-c-dependency-management/) | Kitware blog | 2026, retrospective | Confirms 3.31/4.0 timeline, gestures at other-tool investment without naming specifics |
| [cmake.org/.../release/4.3.html](https://cmake.org/cmake/help/latest/release/4.3.html) | CMake official release notes | 2026-03-17 | Canonical "added in 4.3" record for `install(PACKAGE_INFO)` and CPS import |
| [Kitware/CMake `Help/release/4.3.rst`](https://raw.githubusercontent.com/Kitware/CMake/master/Help/release/4.3.rst) | CMake source doc (raw) | current master | Exact wording of the 4.3.3 `export(PACKAGE_INFO)` output-path change |
| [cmake.org/.../command/install.html](https://cmake.org/cmake/help/latest/command/install.html) | CMake manual | current (4.4.x) | Full `install(PACKAGE_INFO)` grammar, field defaults, file-naming rule |
| [Kitware/CMake `Help/command/find_package.rst`, v4.3.0](https://raw.githubusercontent.com/Kitware/CMake/v4.3.0/Help/command/find_package.rst) | CMake source doc (raw) | 2026-03-17 tag | Exact CPS search-path algorithm, `CONFIGS` suppression rule, transitive-requires handling |
| [Kitware/CMake `Help/dev/experimental.rst`](https://raw.githubusercontent.com/Kitware/CMake/master/Help/dev/experimental.rst) (diffed across v4.2.0/v4.3.0/v4.4.0/v4.4.1/master) | CMake source doc (raw) | 2026-09 snapshot, multi-version | Proves the two original CPS gates retired at 4.3.0 and the new `CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO` gate appearing at 4.4.0 |
| [cps-org.github.io/cps](https://cps-org.github.io/cps/) (+ `overview.html`, `history.html`, `development.html`, `schema.html`) | CPS spec site | v0.15.0, 2026 | The spec itself: field names, governance, version-schema semantics |
| [github.com/cps-org/cps](https://github.com/cps-org/cps) | Spec repository (GitHub API: contributors, tags) | pushed 2026-06-26 | Governance/maintainer-concentration evidence; only 1 git tag despite v0.15.0 docs |
| [github.com/cps-org/cps-config](https://github.com/cps-org/cps-config) | pkg-config drop-in tool repo | pushed 2025-04-28 | The would-be non-CMake consumer tool; evidence it is dormant |
| [github.com/cps-org/cps-examples](https://github.com/cps-org/cps-examples) | Example `.cps` files repo | pushed 2026-05-04 | Canonical field-name reference used in Findings §2 |
| [conan-io/docs `incubating.rst`](https://raw.githubusercontent.com/conan-io/docs/develop2/incubating.rst) | Conan official docs source | 2.32.0 era | "CMakeConfigDeps... generally available" claim |
| [conan-io/docs `cmakeconfigdeps.rst`](https://raw.githubusercontent.com/conan-io/docs/develop2/reference/tools/cmake/cmakeconfigdeps.rst) | Conan official docs source | 2.32.0 era | Contradicts the above: still ships the experimental-warning box |
| [conan-io/docs `changelog.rst`](https://raw.githubusercontent.com/conan-io/docs/develop2/changelog.rst) | Conan official changelog | 2025-02-26 through 2026-08-31 | Exact version numbers for every CPS-round-trip feature/fix in Conan |
| [conan-io/conan `test/integration/cps/test_cps.py`, tag 2.32.0](https://raw.githubusercontent.com/conan-io/conan/2.32.0/test/integration/cps/test_cps.py) | Conan source (raw) | 2026-08-31 release | Proves `CPSDeps` generator ships and works, undocumented anywhere |
| [conan-io/conan#19589](https://github.com/conan-io/conan/issues/19589) | Conan issue tracker | opened 2026-02-09 | Live CPS namespace/name-mapping gap reported against a real Boost-based project |
| [memsharded/cppcon24](https://github.com/memsharded/cppcon24/blob/main/cmake_cps/CMakeLists.txt) | Conan founder's CppCon 2024 demo repo | pushed 2025-02-07 | Real `install(PACKAGE_INFO)` usage example, shows the now-obsolete pre-4.3 gate |
| [jasper-software/jasper `CMakeLists.txt`](https://raw.githubusercontent.com/jasper-software/jasper/master/src/libjasper/CMakeLists.txt) | Real-world OSS library | 2026 snapshot | One of the few confirmed real-world CPS adopters, version- and flag-gated |
| [P2656R2, "C++ Ecosystem International Standard"](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2023/p2656r2.html) (+ [P1177R1](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2018/p1177r1.pdf), [P1313R0](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2018/p1313r0.html), [P2673R0](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2022/p2673r0.pdf)) | WG21 SG15 standards papers | 2018–2023 | Standards-track lineage of CPS through the Ecosystem International Standard effort |
| [discourse.cmake.org, topic 15720](https://discourse.cmake.org/t/cps-doesnt-work-with-boost-headers/15720) | CMake's own user forum | 2026-06-19 to 2026-06-25 | Real limitation reported and authoritatively explained by CMake/CPS developer Vito Gamberini |
| [discourse.cmake.org, topic 15562](https://discourse.cmake.org/t/15562) | CMake's own user forum | 2026-03-17 | Kitware's own 4.3.0 release announcement, cross-checked against the official release notes |
| [kitware.com/cnow-2025](https://www.kitware.com/cnow-2025/) | Kitware conference listing | talk dated 2025-04-30 | Confirms the Bloomberg/Kitware "CPS in CMake" C++Now 2025 talk |
| [cppcon.org/2023-keynote-bret-brown-bill-hoffman](https://cppcon.org/2023-keynote-bret-brown-bill-hoffman/) | CppCon's own program page | 2023 | Origin keynote naming the roadmap that became CPS |
| GitHub code/issue search across `microsoft/vcpkg`, `microsoft/vcpkg-tool`, `mesonbuild/meson`, `pkgconf/pkgconf`, `build2/build2`, `xmake-io/xmake`, `bazel-contrib/rules_foreign_cc`, `bazelbuild/bazel-central-registry` | Each project's own repository | 2026-09 snapshot | The "prove the negative" adoption survey underlying §4, §5, §6, §7, §9 |
| [mesonbuild/meson#15848](https://github.com/mesonbuild/meson/issues/15848) | Meson issue tracker | opened 2026-05-27 | Meson maintainers' only substantive CPS mention: conceptual, no implementation |
| [xmake-io/xmake#7639](https://github.com/xmake-io/xmake/issues/7639) | xmake issue tracker | opened 2026-07-04, open | Tracking issue, stale experimental branch, unshipped |
| [nesbitt.io/2026/04/13/common-package-specification.html](https://nesbitt.io/2026/04/13/common-package-specification.html) | Independent blog (Andrew Nesbitt) | 2026-04-13 | Ecosystem-wide survey commentary; also the source of the over-claiming "Meson/autotools can read CPS" phrasing flagged in Findings §5 |
| [moderncppdevops.com/cps-and-why](https://moderncppdevops.com/cps-and-why/) | Blog critique | 2024-03-18, historical | Early-draft-era field-level critique, useful only as pre-stabilization context, not current guidance |

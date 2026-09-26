---
title: The Common Package Specification and CMake's implementation of it
topic: cps-common-package-specification
group: cmake-dependency-seam
agent: cps-spec-and-cmake-implementation researcher
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 27
primary_sources_count: 19
scope: >
  The Common Package Specification (CPS) itself — the JSON schema, the search
  algorithm, the version/configuration model — and how CMake 3.31 through the
  current 4.4.x/master line produces (`install`/`export(PACKAGE_INFO)`) and
  consumes (`find_package`) `.cps` files. Conan's, vcpkg's and Meson's own CPS
  support are mentioned only where they bear on CMake's interop story, per the
  sibling package-manager dives; they are not surveyed here in depth.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [What CPS is, precisely](#1-what-cps-is-precisely)
   2. [The CMake timeline, version by version](#2-the-cmake-timeline-version-by-version)
   3. [The `.cps` JSON schema, field by field](#3-the-cps-json-schema-field-by-field)
   4. [The CPS search algorithm vs. what CMake actually implements](#4-the-cps-search-algorithm-vs-what-cmake-actually-implements)
   5. [Version and compatibility semantics](#5-version-and-compatibility-semantics)
   6. [Configurations, and multi-config generators](#6-configurations-and-multi-config-generators)
   7. [`install(PACKAGE_INFO)` and `export(PACKAGE_INFO)`, exactly](#7-installpackage_info-and-exportpackage_info-exactly)
   8. [What CPS cannot express that a hand-written Config.cmake can](#8-what-cps-cannot-express-that-a-hand-written-configcmake-can)
   9. [Relocatability](#9-relocatability)
   10. [The reference implementation ecosystem](#10-the-reference-implementation-ecosystem)
   11. [The ISO C++ (SG15/WG21) standards track](#11-the-iso-c-sg15wg21-standards-track)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Open questions for the map](#open-questions-for-the-map)
7. [Sources](#sources)

## Summary

- CMake **3.31.0** (tagged 2024-11-06) shipped `install(PACKAGE_INFO)` /
  `export(PACKAGE_INFO)` as **experimental**, gated by
  `CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO` = `b80be207-778e-46ba-8080-b23bba22639e` — export only, no import. [confirmed by diffing `Help/dev/experimental.rst` at tags `v3.30.0` (absent) and `v3.31.0` (present)]
- CMake **4.0.0** (tagged 2025-03-27) added CPS **import** to `find_package`, experimental, gated by `CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES` = `e82e467b-f997-4464-8ace-b00808fff261`.
- CMake **4.3.0** (tagged 2026-03-17) made CPS import/export **stable** — both of the above gate variables are removed from `Help/dev/experimental.rst`, and `install(PACKAGE_INFO)`, `export(PACKAGE_INFO)`, and `find_package`'s CPS Config-mode search all carry unconditional `.. versionadded:: 4.3` tags with no experimental note.
- One CPS-adjacent feature is **still experimental as of CMake 4.4.3 and current master** (checked 2026-09-05): `CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO`, gated by `CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO` = `ababa1b5-7099-495f-a9cd-e22d38f274f2`. This is the *only* remaining CPS gate.
- CMake **4.4.0** (2026-07-09) shipped no CPS-related changes at all — `Help/release/4.4.rst` has zero hits for "CPS" or "PACKAGE_INFO". The feature has been quiet since 4.3.
- `find_package()`'s Config mode now searches for `<PackageName>.cps` and `<lowercasePackageName>.cps` **before** `*Config.cmake` — "Search is implemented in a manner that will tend to prefer CPS files over CMake-script config files in most cases," and passing `CONFIGS` to `find_package` suppresses CPS consideration entirely (current master `Help/command/find_package.rst`).
- CMake does **not** implement the CPS spec's own generic search algorithm (the `CPS_PATH` / `CPS_PREFIX_PATH` environment variables from `cps-org.github.io/cps/searching.html`) — grepping CMake's `find_package.rst`, `install.rst`, and `export.rst` for those two names returns zero hits. CMake instead folds `.cps` lookup into its pre-existing `CMAKE_PREFIX_PATH` / `<Pkg>_ROOT` (`CMP0074`) machinery, adding `cps/` subdirectories at each existing search point.
- CMake's `.cps` search paths gained their own versioned rows only in **4.3**: `<prefix>/cps/<name>/`, `<prefix>/(lib/<arch>|lib*|share)/cps/<name>/`, and the macOS `<name>.framework/…/Resources/CPS/` / `<name>.app/…/Resources/CPS/` paths are all `.. versionadded:: 4.3`.
- CPS packages are the *only* package kind for which `find_package` version **ranges** are fully honored end to end — "with the exception of CPS packages, version support is currently provided only on a package-by-package basis" for non-CPS Config/Find packages (current master `find_package.rst`).
- CMake recognizes only **two** of CPS's version schemas — `simple` and `custom`. The spec also names `rpm` and `dpkg` as schema identifiers a producer may use, but CMake's own docs say "the specification may include schemas that are not supported by CMake," and no CMake doc defines `rpm`/`dpkg` comparison semantics.
- `install(PACKAGE_INFO)` explicitly documents a hole: "support for generator expressions in interface properties is limited at this time to configuration-dependent expressions" — a hand-written `Config.cmake` has no such limit.
- `install(PACKAGE_INFO)` requires the targets to already be associated with an export set via `install(TARGETS ... EXPORT <export-name>)`; it is not a standalone way to publish a target.
- Kitware's own written recommendation (`install.rst`, current master): "This is the recommended way to generate CPS package information for a project" — i.e. call `install(PACKAGE_INFO)` yourself. `CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO` (still experimental) exists only for **distributors** who cannot edit the upstream project's `CMakeLists.txt`.
- A `.cps` file is relocatable by construction: paths that start with `@prefix@` have the package's prefix substituted at load time, and the prefix itself is derived either from an explicit `prefix` field or from `cps_path` plus the file's own on-disk location (`cps-org.github.io/cps/searching.html#prefix-determination`).
- CPS's `compat_version` (oldest version this release is backward-compatible with) is genuinely different from a hand-rolled `*ConfigVersion.cmake`: CMake accepts a CPS package whenever the *requested* version falls between `compat_version` and `version` inclusive, computed the same way for every CPS package — non-CPS packages implement this check ad hoc, per-package.
- The CPS spec (`v0.15.0` as fetched 2026-09-05) moved from `v0.14.1` ("as of writing", per the March 2026 Kitware post) in under six months — the spec text itself is still moving, not frozen.
- The C++ Ecosystem International Standard effort that CPS grew alongside (WG21 **P2656**) was **withdrawn** from WG21/ISO in December 2024 (**P2656R4**): "the limitations of WG21 and ISO are insurmountable in the near term… we will continue development of the Ecosystem standard externally," moving to `github.com/ecostd`. CPS itself is governed independently at `github.com/cps-org`, outside any WG21 paper.
- The reference `pkg-config` replacement, `cps-config` (`github.com/cps-org/cps-config`), is C++/Meson-built, self-describes as "alpha status… some things work, others do not," and has had **no commits since 2025-04-28** — over 16 months stale as of this research date.

## Findings

### 1. What CPS is, precisely

The Common Package Specification is a declarative, JSON-based description of "the useful artifacts of a software package," meant to be produced by a package's build system and shipped alongside the package, in the same spirit as a `.pc` file or a CMake Config-file package, but tied to no particular build tool or language ([Overview](https://cps-org.github.io/cps/overview.html)). Its own History page states its reason for existing in one line: pkg-config's flag-soup approach is "semantically lossy," and CMake's own exported-targets format, while richer, is "tightly coupled to that build system" because "packages have access to the entire CMake language, which is Turing complete and capable of executing external processes" — non-CMake tools would have to "effectively reimplement… most or all of CMake itself" to consume it ([History](https://cps-org.github.io/cps/history.html)).

A CPS document is one JSON file with a mandatory `cps_version` and `name`, a map of named `components` (the consumable units — libraries, executables, symbolic feature flags), and optional `requires` (a package-level map of other packages this one depends on). It is explicitly *not* a mechanism for describing "all possible configurations of a package" — it describes one or more configurations of one build, for one platform ([Overview](https://cps-org.github.io/cps/overview.html)).

### 2. The CMake timeline, version by version

Every date and gate below was independently confirmed either by diffing `Help/dev/experimental.rst` across pinned CMake git tags, or by reading a version-pinned command doc, not from the blog alone:

| CMake version | Tag date | What shipped | Gate |
|---|---|---|---|
| 3.30.0 | — | (nothing — confirmed by diffing `experimental.rst`, no CPS section exists) | — |
| **3.31.0** | 2024-11-06 | `install(PACKAGE_INFO)` / `export(PACKAGE_INFO)`, export only | `CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO` = `b80be207-778e-46ba-8080-b23bba22639e` |
| **4.0.0** | 2025-03-27 | `find_package` CPS import | `CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES` = `e82e467b-f997-4464-8ace-b00808fff261` |
| **4.1.0** | 2025-08-05 | `project(COMPAT_VERSION)` experimental keyword (reuses the export gate); `install(PACKAGE_INFO)` gains `DESCRIPTION`/`HOMEPAGE_URL` | still `CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO` |
| **4.2.0** | 2025-11-19 | `install(PACKAGE_INFO)` gains `LICENSE`/`DEFAULT_LICENSE`; `SYMBOLIC` target type ships ("CMake 4.2 has experimental support for CPS export and import, including symbolic targets" — [Components, Targets and Symbols](https://www.kitware.com/components-targets-and-symbols/)) | still experimental |
| **4.3.0** | 2026-03-17 | **CPS graduates to stable** — both gates above removed from `experimental.rst`; full `.cps` search-path table documented (`versionadded:: 4.3`); `project(SPDX_LICENSE)` added | *(none — stable)* |
| 4.3.3 | 2026-05-21 | `export(PACKAGE_INFO)` bugfix: now writes into `cps/<package-name>/` under the build dir instead of the build-dir root | n/a |
| **4.4.0** | 2026-07-09 | *nothing CPS-related* — zero hits in `Help/release/4.4.rst` | n/a |
| 4.4.3 | 2026-08-25 | Latest 4.4.x patch as of this research (kitware.com's own "CMake 4.4.3 available for download" post is linked from the CPS blog) | n/a |
| master (dev) | as fetched 2026-09-05 | `CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO` still present, unchanged since 4.3.0 | `ababa1b5-7099-495f-a9cd-e22d38f274f2` |

The 3.31.0 tag date (2024-11-06, confirmed via `gitlab.kitware.com/api/v4/.../repository/tags/v3.31.0`) postdates the Kitware post that describes the feature, "[A Year Closer to Standard C++ Dependency Management](https://www.kitware.com/a-year-closer-to-standard-c-dependency-management/)," published 2024-10-22 — that post describes a pre-GA build.

The four-post Kitware blog series that documents this progression, in order:

1. [A Year Closer to Standard C++ Dependency Management](https://www.kitware.com/a-year-closer-to-standard-c-dependency-management/) (2024-10-22) — introduces experimental `install(PACKAGE_INFO)` ahead of 3.31.
2. [Navigating CMake Dependencies with CPS](https://www.kitware.com/navigating-cmake-dependencies-with-cps/) (2025-03-31, the requester's seed post) — announces CPS **import** with CMake 4.0: `set(CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES e82e467b-f997-4464-8ace-b00808fff261)`; explicitly flags version-matching "idiosyncrasies" and says automatic dependency export "doesn't record version information or hints."
3. [Components, Targets and Symbols](https://www.kitware.com/components-targets-and-symbols/) (2026-02-16) — CMake 4.2's `SYMBOLIC` target type and the component/target equivalence.
4. [Common Package Specification is Out the Gate](https://www.kitware.com/common-package-specification-is-out-the-gate/) (2026-03-19) — announces 4.3's graduation to stable, two days after the 4.3.0 tag: "CMake 4.3, however, represents an exciting milestone, because it removes the 'experimental' status from CMake's CPS support." Also notes that CMake-script automatic transitive-dependency export ("first introduced in CMake 3.29") **remains** experimental — CPS's transitive-dependency story is what graduated, not the older CMake-script one.

### 3. The `.cps` JSON schema, field by field

Every field the brief named, as documented at [`cps-org.github.io/cps/schema.html`](https://cps-org.github.io/cps/schema.html) (spec version **v0.15.0** as fetched):

| Field | Applies to | Required | Meaning |
|---|---|---|---|
| `cps_version` | package | **Yes** | Spec version this file conforms to; follows SemVer — a tool supporting `X.Y` can read `X.Z` for any `Z`. |
| `name` | package | **Yes** | Canonical package name; the `.cps` filename (minus suffix) must exactly match `name` as-is or lower-cased. |
| `components` | package | **Yes** | Map of component name → component object. |
| `version` | package | No | Version string; format governed by `version_schema`. Omitted ⇒ "will not satisfy any request for a specific version." |
| `version_schema` | package | No, default `"simple"` | `simple` \| `custom` (CMake-recognized); spec also names `rpm`/`dpkg` as tool-deferred schemas CMake does not implement. |
| `compat_version` | package | No | Oldest version this release is backward-compatible with; defaults to `version` (no back-compat) if absent. |
| `default_components` | package | No | Components inferred when a consumer names the package but no component. |
| `platform` | package | No | Object gating `isa`, `kernel`-equivalent attrs, `c_runtime_vendor/version`, `clr_vendor/version`, `jvm_vendor/version`; absent ⇒ platform-agnostic. |
| `prefix` | package | No¹ | Package's install prefix for a *non*-relocatable package. |
| `cps_path` | package | No¹ | `@prefix@`-relative location of the `.cps` file itself, used to derive the prefix for a relocatable package. |
| `requires` | package | No | Map of required-package-name → requirement object (version, `components`, `hints`). |
| `default_license` / `license` | package, component | No (supplemental) | SPDX license expression. |

¹ "Exactly one of `cps_path` or `prefix` is required" (schema.html).

Component-level attributes worth carrying forward: `type` (`"executable"`, `"archive"`, `"dylib"`, `"module"`, `"jar"`, `"interface"`, `"symbolic"` — unrecognized types are ignored, not errors), `location` / `link_location` (both `@prefix@`-relocatable), `includes`, `compile_features`, `compile_flags` ("use of this attribute is discouraged"), `definitions`, `requires` (component-level, transitive), `compile_requires` / `link_requires` (stage-scoped subsets of `requires`), `link_libraries` ("packages should avoid using this attribute if at all possible. Use `requires` instead whenever possible.").

A **`symbolic`** component "has no (required) attributes at all… intended to be used as a form of feature testing" — this is the schema-level basis for CMake 4.2's `SYMBOLIC` target type.

### 4. The CPS search algorithm vs. what CMake actually implements

The spec's own generic algorithm ([`searching.html`](https://cps-org.github.io/cps/searching.html)) is short and self-contained: search `environment-path/name-like/cps/` and `environment-path/name-like/` for each path in the `CPS_PATH` environment variable, then `prefix/…` variants (including OS-specific Windows/macOS layouts and `libdir/cps/`) for each prefix in `CPS_PREFIX_PATH`, `/usr/local`, and `/usr`, in that order.

CMake does not implement this. `Help/command/find_package.rst` (current master) never mentions `CPS_PATH` or `CPS_PREFIX_PATH` — confirmed by `grep` returning zero hits across `find_package.rst`, `install.rst`, and `export.rst`. Instead, CMake extended its pre-existing Config-mode search table (the one built from `CMAKE_PREFIX_PATH`, `<PackageName>_ROOT` gated by `CMP0074`, the Windows/System registries, and per-package unique prefixes) with new rows, all `.. versionadded:: 4.3`:

```
<prefix>/<name>/cps/                                    (Windows convention)
<prefix>/cps/<name>/                                    (Windows convention)
<prefix>/cps/                                            (Windows convention)
<prefix>/(lib/<arch>|lib*|share)/cps/<name>/            (UNIX convention)
<prefix>/(lib/<arch>|lib*|share)/cps/                    (UNIX convention)
<name>.framework/Versions/*/Resources/CPS/               (Apple, versionadded 4.3)
<name>.app/Contents/Resources/CPS/                       (Apple, versionadded 4.3)
```

"When searching the above paths, `find_package` will only look for `.cps` files in search paths which contain `/cps/`, and will only look for `.cmake` files otherwise." This is precisely the ambiguity CMake's own issue tracker records: [issue #26410, "find_package needs some consistency for CPS"](https://gitlab.kitware.com/cmake/cmake/-/issues/26410) — "This comes with a challenge due to the CPS and CMake search paths being disjoint sets… Where problems arise is when we look for a package configuration file in `<name>_DIR`… are we actually worried about [users setting `<name>_DIR` and expecting only `.cmake`, not `.cps`, to be considered]?" That issue is **open**, unresolved, as of this research date.

CMake does document one deliberate ordering guarantee and one deliberate escape hatch: CPS files are preferred over `*Config.cmake` files "in most cases," and passing `CONFIGS <file>...` to `find_package()` "suppresses consideration of CPS files" entirely — the only documented way to force a CMake-script-only search.

### 5. Version and compatibility semantics

Two things are new with CPS that are not general `find_package` behavior:

- **Version ranges work fully only for CPS.** "With the exception of CPS packages, version support is currently provided only on a package-by-package basis. When a version range is specified but the package is only designed to expect a single version, the package will ignore the upper end point" (`find_package.rst`). CPS packages don't have this caveat.
- **`compat_version` is a real, uniformly-applied field**, not a per-package convention. CMake's rule (`find_package.rst`, [`cps version selection`](https://cps-org.github.io/cps/schema.html#compat-version)): if `EXACT` was given, or the package supplies no `compat_version`, the found `version` must equal the request exactly; otherwise the request is satisfied whenever it falls between `compat_version` and `version` inclusive. `install(PACKAGE_INFO)`'s `COMPAT_VERSION <version>` option writes this field directly.

CMake recognizes exactly two `version_schema` values: `simple` (a dotted-integer tuple, optionally suffixed with `-`/`+` metadata that is ignored for comparison; `"semver"` is "a deprecated alias for `simple`" since spec v0.9.0) and `custom` ("version numbers may be compared, but version ordering is not possible" — exact string match only). The spec additionally names `rpm` and `dpkg` as schema identifiers a producer *should* use where their meaning is the native rpm/dpkg version-compare algorithm, but explicitly warns these "may not be supported by all tools" — and CMake's own docs confirm it is one of the tools that doesn't: "the specification may include schemas that are not supported by CMake."

### 6. Configurations, and multi-config generators

CPS "configurations" (Debug/Release, static/shared, etc.) are a package-level list (`"configurations": ["optimized", "debug"]` in the [sample file](https://cps-org.github.io/cps/sample.html)) with per-component overrides. The spec's own recommended pattern for orthogonal axes is **"Configurations as Flags"** ([`recommendations.html`](https://cps-org.github.io/cps/recommendations.html#configurations-as-flags)): model each axis (static/shared, debug/release) as its own `interface` component whose `configurations` map each choice to a `requires` on the concrete component, so a consumer picks `"static", "release"` rather than a single combined `"release_static"` string, and the graph resolves recursively:

```jsonc
"foo": {
  "type": "interface",
  "configurations": {
    "static": { "requires": [ "foo-static" ] },
    "shared": { "requires": [ "foo-shared" ] }
  }
}
```

The spec leaves selection policy to the consumer/tool: "the consumer shall have a mechanism for providing a list of preferred configurations. The first configuration in this list which matches an available configuration of the component shall be used" — and if no configuration-specific value exists for a needed attribute, the component's own non-configuration-specific value is used as fallback, with `null` explicitly suppressing that fallback ([`configurations.html`](https://cps-org.github.io/cps/configurations.html)).

**What I could not confirm from CMake's own docs:** the exact mechanical mapping from CPS's free-form configuration names onto CMake's own `IMPORTED_CONFIGURATIONS` target-property mechanism (which expects specific per-build-type suffixes like `DEBUG`/`RELEASE`). None of `install.rst`, `export.rst`, or `find_package.rst` state this mapping explicitly. `install(PACKAGE_INFO)`'s `DEFAULT_CONFIGURATIONS <config>...` option ("ordered list of configurations consumers should prefer if no exact match… exists") is the CMake-side knob that populates the CPS-side fallback-order rule above, but I found no documented statement of how an imported CPS component's `optimized`/`debug` configuration set becomes CMake's `IMPORTED_CONFIGURATIONS` list at consume time. Flagged in Open Questions.

### 7. `install(PACKAGE_INFO)` and `export(PACKAGE_INFO)`, exactly

Full current-master signature ([`install.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/command/install.rst)):

```cmake
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

Requires: the named targets must already be attached to `<export-name>` via `install(TARGETS ... EXPORT <export-name>)` — "Unlike `install(EXPORT)`, this information is not expressed in CMake code, and can be consumed by tools other than CMake." Imported targets land under the `<package-name>::` namespace by default. `CXX_MODULES_DIRECTORY` reuses the pre-existing (CMake 3.28) C++-modules export mechanism from `install(EXPORT)` — meaning C++20 named-module targets *can* be exported through `PACKAGE_INFO`, contradicting the October 2024 blog's earlier "C++ module support is not yet implemented in CPS" (that gap has since closed, at least on the CMake-script/CMake-consumer side).

`export(PACKAGE_INFO)` is the build-tree twin: same options minus install-specific ones (`DESTINATION`, `PERMISSIONS`, `COMPONENT`, `EXCLUDE_FROM_ALL`), writing to `cps/<package-name>/` under the current build directory as of the 4.3.3 fix (before that, it wrote directly into the build-dir root — a documented behavior *change*, not just a bugfix, so a project built with 4.3.0–4.3.2 and consumed against 4.3.3+ moves the file).

`DEFAULT_TARGETS` is the CMake-side knob for the CPS schema's `default_components` field: "Targets to be used if a consumer requests linking to the package name, rather than to specific components."

### 8. What CPS cannot express that a hand-written Config.cmake can

Kitware states this plainly, twice, in the same note block of `install.rst`:

> "Because it is intended to be portable across multiple build tools, CPS may not support all features that are allowed in CMake-script exports. In particular, support for generator expressions in interface properties is limited at this time to configuration-dependent expressions."

Concretely, absent from CPS: arbitrary CMake scripting inside a package description (this is the entire point of the format, per the History page's critique of CMake-script exports being "Turing complete"); generator expressions beyond configuration-dependent ones (no `$<COMPILE_LANG_AND_ID:...>`, no `$<TARGET_PROPERTY:...>` chains); `find_dependency(... OPTIONS)`-style scripted lookup logic (CPS's `requires`/`hints` model is declarative and automatic, not scriptable); and arbitrary custom target properties (only the fixed schema attribute set crosses the boundary — an `INTERFACE_MY_CUSTOM_PROPERTY` has no CPS representation; the spec's own escape hatch is `x_<tool>_`-prefixed vendor extension attributes, which any *other* tool is free to ignore).

I could not find CMake documentation stating explicitly whether `install(PACKAGE_INFO)` resolves `INSTALL_INTERFACE` genex (and `export(PACKAGE_INFO)` resolves `BUILD_INTERFACE`) the same way `install(EXPORT)`/`export(EXPORT)` already do — no fetched page names `BUILD_INTERFACE`/`INSTALL_INTERFACE` in connection with `PACKAGE_INFO`. Given both commands are explicitly modeled as CPS-format twins of the existing `EXPORT` commands, the same split is the reasonable inference, but it is unverified against a primary source and is listed under Open Questions.

### 9. Relocatability

CPS packages are relocatable by construction, not by convention: any attribute value beginning `@prefix@` (`location`, `link_location`, `includes`, `cps_path`) has the literal package prefix substituted at load time. The prefix is resolved one of two ways ([`searching.html#prefix-determination`](https://cps-org.github.io/cps/searching.html#prefix-determination)):

- If `prefix` is set explicitly, use it — package is **not** relocatable (fixed install location).
- If `cps_path` is set (e.g. `"cps_path": "@prefix@/lib/cps/foo"`), the tool derives the prefix from the *actual, current* absolute location of the `.cps` file on disk: strip the trailing portion matching `cps_path`'s tail from `dirname(fullpath)`, and what's left is the live prefix. Moving the whole install tree anywhere just works, with no file edits — this is the entire relocation story.

"Exactly one of `cps_path` or `prefix` is required" per package — a `.cps` cannot declare both or neither.

### 10. The reference implementation ecosystem

`github.com/cps-org` hosts four repositories: `cps` (the spec itself — 192 stars, last pushed 2026-06-26, actively evolving), `cps-wiki`, `cps-config`, and `cps-examples`. **cps-config**, "a drop in replacement for pkg-config/pkgconf using cps files," is the closest thing to the brief's "cps-config reference implementation": C++, built with Meson, 21 stars, self-described in its own README as "currently in alpha status. Some things work, others do not." Its last commit is **2025-04-28** — as of this research date (2026-09-05) that is over 16 months of inactivity against 29 open issues. It should not be treated as a load-bearing dependency for anything shipping today.

The spec repo's own open issues are a live map of unresolved ambiguity: [#78](https://github.com/cps-org/cps/issues/78) ("Definition of `isa` has an OS-specific vocabulary and various other corner cases" — `uname -m` is a Unixism with no defined Windows equivalent, and the same ISA is spelled differently across OSes), [#111](https://github.com/cps-org/cps/issues/111) ("Support for name mapping" — a real Conan-generates-CPS/CMake-consumes-CPS repro showing a package-name mismatch), [#112]/[#99] (open proposals for compiler-conditional flags and a vendor field), all open as of the last-updated snapshot (2026-07-04).

### 11. The ISO C++ (SG15/WG21) standards track

CPS itself was never a WG21 paper — it is edited independently by Matthew Woehlke (Kitware) with contributions from Ben Boeckel and Brad King, governed at `github.com/cps-org`, outside ISO process. The *adjacent* WG21 effort, SG15's proposed **C++ Ecosystem International Standard** ([P2656](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2023/p2656r2.html), first drafted 2023, targeting a first edition in Q3 2025, citing [P2673 "Common Description Format for C++ Libraries and Packages"](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2022/p2673r0.pdf) (Dos Reis/Microsoft, Caro Campos/Conan, 2022-10-13) and [P1177 "Package Ecosystem Plan"](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2018/p1177r1.pdf) as prior groundwork), was **withdrawn from WG21/ISO** at revision R4 (December 2024): "After almost three years of work it has become apparent that the limitations of WG21 and ISO are insurmountable in the near term… We will continue development of the Ecosystem standard externally," moving to `github.com/ecostd`. CPS is not that continuation project; it is a separate, narrower, already-shipping artifact that CMake, and per third-party reporting Conan, implement today without any ISO backing.

## Normative guidance candidates

1. **Rule.** A CMake project targeting CMake ≥ 4.3 that already calls `install(TARGETS ... EXPORT <export-name>)` and `install(EXPORT ...)` should add `install(PACKAGE_INFO <name> EXPORT <export-name> VERSION ${PROJECT_VERSION} ...)` **alongside**, never instead of, the Config-file/`*Config.cmake` export.
   *Rationale.* CPS is stable (no gate) since 4.3.0, but real-world consumers other than CMake ≥ 4.0 barely exist yet (§ Contested/evolving) — a `.cps`-only project is invisible to every consumer that predates the format.
   *Verify.* `rg -n 'install\(PACKAGE_INFO' CMakeLists.txt` returns at least one hit, AND `rg -n 'install\(EXPORT' CMakeLists.txt` also returns at least one hit for the same export name. Empty output on the `PACKAGE_INFO` grep means the project ships no CPS file at all (acceptable if the floor is below 4.3, unacceptable if the floor is 4.3+ and the project publishes Config packages for consumption).

2. **Rule.** Never gate `install(PACKAGE_INFO)`/`export(PACKAGE_INFO)`/CPS `find_package` behind `CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO` or `CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES` on a project whose `cmake_minimum_required` floor is ≥ 4.3. Only `CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO` (for `CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO`) is still a real gate on any currently supported CMake line.
   *Rationale.* Both older gates were removed at 4.3.0; setting them on 4.3+ is a silent no-op that reads as cargo-culted advice from the 4.0–4.2 era (exactly what an LLM trained before 4.3 would write).
   *Verify.* `rg -n 'CMAKE_EXPERIMENTAL_(EXPORT_PACKAGE_INFO|FIND_CPS_PACKAGES)' **/*.cmake **/CMakeLists.txt` — any hit on a project whose floor is ≥ 4.3 is stale. Empty output is correct for a 4.3+-floor project.

3. **Rule.** A project floor **below** 4.3 (i.e. 3.31 ≤ floor < 4.3) that wants to ship CPS must guard both gate variables explicitly and by their documented UUIDs, never by name alone, and must not assume `find_package` import exists before 4.0.
   *Rationale.* CMake explicitly reserves the right to change these UUIDs between versions ("This UUID may change in future versions of CMake. Be sure to use the value documented here by the source tree of the version of CMake with which you are experimenting" — `experimental.rst`), so a hardcoded UUID copied from one CMake version's docs can silently fail to activate the feature on a different pre-4.3 version.
   *Verify.* For each CMake version in the support matrix below 4.3, confirm the UUID against that exact tag's `Help/dev/experimental.rst` (`curl -sL https://gitlab.kitware.com/cmake/cmake/-/raw/v<X.Y.Z>/Help/dev/experimental.rst`) rather than trusting a single value across the whole floor range.

4. **Rule.** Do not rely on `<Pkg>_DIR` or `CONFIGS` in a `find_package()` call to force CMake-script-only resolution unless that is the explicit intent — `CONFIGS` suppresses CPS entirely, and a bare `<Pkg>_DIR` pointing at a directory containing both a `.cps` and a `*Config.cmake` will prefer the `.cps`.
   *Rationale.* CMake's own issue tracker (#26410) documents this as an open, unresolved ambiguity — behavior can change out from under a project between CMake versions without any code change on the consumer's part, if a producer starts shipping `.cps` files where it previously shipped only `*Config.cmake`.
   *Verify.* Reading heuristic: if a `CMakeLists.txt` sets `<Pkg>_DIR` manually and the target install prefix could plausibly gain a `.cps` file in a future package upgrade (i.e., it's a third-party dependency, not vendored), flag it as a forward-compatibility risk, not a bug today.

5. **Rule.** Never author a `.cps` file (or a CPS-emitting CMake call) that mixes `prefix` and `cps_path`, and never omit both.
   *Rationale.* The schema makes this a hard constraint: "Exactly one of `cps_path` or `prefix` is required." Both-or-neither is ill-formed per spec, and CMake's generated output always picks exactly one automatically — a hand-edited `.cps` is the only way to violate this.
   *Verify.* JSON-schema check, or a grep heuristic: `jq 'has("prefix") and has("cps_path")' *.cps` must print `false` for every file (a `true` means both are present — invalid); `jq 'has("prefix") or has("cps_path") | not' *.cps` must also print `false` for every file (neither present is equally invalid). Empty file set means nothing to check.

6. **Rule.** Treat `VERSION_SCHEMA` values other than `simple` or `custom` (i.e. `rpm`, `dpkg`, or any future spec addition) as **unsupported by CMake today** — do not write CMake tooling logic, rule text, or reviewer expectations assuming CMake enforces rpm/dpkg version ordering on a CPS package.
   *Rationale.* `find_package.rst`: "At present, the following schemas are recognized: `simple`, `custom`… Note that the specification may include schemas that are not supported by CMake."
   *Verify.* `rg -n '"version_schema"\s*:\s*"(rpm|dpkg)"' **/*.cps` — any hit means that package's version comparisons will not be enforced correctly by CMake's `find_package`, regardless of what `VERSION` range the consumer requests. Empty output is the safe state.

7. **Rule.** A `.cps` file generated via `install(PACKAGE_INFO)` must never be the *only* record of a target's usage requirements when the interface property in question uses a generator expression that is not configuration-dependent (e.g. `$<COMPILE_LANGUAGE:...>`, `$<TARGET_PROPERTY:...>`, `$<BOOL:...>` on a non-config value).
   *Rationale.* Documented limitation: "support for generator expressions in interface properties is limited at this time to configuration-dependent expressions." Such an expression silently degrades or is dropped in the `.cps` output; the CMake-script Config file remains the source of truth for that property.
   *Verify.* `rg -n 'INTERFACE_(COMPILE|LINK|INCLUDE)' CMakeLists.txt` on targets in the export set, then manually check each `$<...>` genex used against the configuration-dependent allowlist (`$<CONFIG:...>`, `$<$<CONFIG:...>:...>`); anything else on an exported target is a documented CPS export gap, not a bug to file against CMake.

8. **Rule.** Distributors packaging someone else's CMake project (rpm/deb/vcpkg-style overlay, not the upstream project itself) may reach for `CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO` + `CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO`; **the upstream project itself should not** — Kitware's docs say so explicitly.
   *Rationale.* "This feature is intended for package distributors, and should only be used when editing a project's CMake script is not feasible. Developers should use `install(PACKAGE_INFO)` directly" (`CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO.rst`). Using both mechanisms on the same export "may result in conflicting installation directives, which will usually cause the project's configure step to fail."
   *Verify.* `rg -n 'CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO' CMakeLists.txt` — any hit inside the upstream project's own `CMakeLists.txt` (as opposed to a distro packaging script invoked with `-D` at configure time) is a misuse of a distributor-only escape hatch.

9. **Rule.** Do not treat `cps-config` as a mature or dependable `pkg-config` replacement in any shipped tooling or CI step as of 2026-09-05.
   *Rationale.* Its own README says "alpha status," and it has had zero commits for 16+ months against 29 open issues.
   *Verify.* Reading heuristic: check `https://github.com/cps-org/cps-config` commit history before depending on it; a gap of more than ~6 months since the last commit, at the time of the check, is a signal to re-verify rather than assume continuity.

## AI-agent angle

An LLM trained before CMake 4.3 (or trained on generic "CMake dependency" material without a hard cutoff check) characteristically gets these wrong:

- **Reaches for the wrong gate on a 4.3+ floor.** It will write `set(CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO b80be207-778e-46ba-8080-b23bba22639e)` or `CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES` before `install(PACKAGE_INFO)`, because that's what every blog post and Stack-Overflow-era example shows. **Check:** if `cmake_minimum_required(VERSION 4.3...)` or higher is set, grep for either gate name — any hit is dead code from a pre-4.3 mental model (rule 2 above).
- **Confuses CPS with a Config-file package or with pkg-config.** It may describe `.cps` as "just CMake's Config.cmake in JSON" (wrong — it's build-tool-neutral by design, consumable by non-CMake tools) or assume `pkg-config --cflags` reads `.cps` files today (wrong — `cps-config` is the intended eventual bridge and is alpha, unmaintained since April 2025; stock `pkg-config`/`pkgconf` has no CPS awareness). **Check:** if the agent's plan involves `pkg-config` reading a `.cps` file directly, that's a hallucination — there is no such capability documented anywhere in this dive.
- **Assumes `find_package` version ranges "just work" the same for every package.** They do not — CPS is the one case where CMake owns the full comparison; every non-CPS Config/Find package implements its own, inconsistent version-range handling. **Check:** ask "is this a CPS package?" before asserting version-range behavior; if unverified, do not claim it.
- **Invents a CPS attribute → CMake target-property mapping table** (e.g. asserting confidently that `includes` becomes `INTERFACE_INCLUDE_DIRECTORIES` and `requires` becomes `INTERFACE_LINK_LIBRARIES`) as if it were documented. It is a reasonable inference, but no fetched CMake page states it — this dive explicitly could not confirm it (§8, §6, Open Questions). **Check:** any documentation-authoring output that presents this mapping as a *cited CMake behavior* rather than "expected by analogy, unverified" should be caught in review and downgraded.
- **Treats `.cps` search as governed by `CPS_PATH`/`CPS_PREFIX_PATH`.** These are the *spec's* generic env vars, not CMake's. An agent that writes `export CPS_PREFIX_PATH=...` expecting CMake's `find_package` to honor it is wrong — CMake uses `CMAKE_PREFIX_PATH` and `<Pkg>_ROOT` instead. **Check:** `rg -n 'CPS_(PREFIX_)?PATH'` in any CMake-facing script or CI config is almost certainly a spec/CMake conflation bug.
- **Assumes CPS is a WG21/ISO deliverable ("the C++ standard's answer to package management").** It is not standards-track; the adjacent ISO effort (P2656) was withdrawn from WG21 in December 2024. **Check:** any claim that CPS "will be part of C++26/29" or is "an ISO standard" is unsupported by any source found in this dive and should be struck.
- **Overstates cross-tool adoption.** An agent may assert vcpkg or Meson "supports CPS" because the ecosystem story sounds inevitable. As of this research date, no primary vcpkg or Meson documentation surfaced any CPS awareness; the strongest adoption claim found (third-party, not a CMake/CPS primary source) is that Conan can generate CPS files for ConanCenter packages. **Check:** any adoption claim about a specific tool must cite that tool's own docs/changelog, not inferred from CPS's existence.

## Contested / evolving

- **Spec version churn.** v0.14.1 (named "as of writing" in the March 2026 Kitware post) → v0.15.0 (as fetched 2026-09-05) in under six months. `cps_version` compatibility is forward-tolerant by design (a tool for `X.Y` can read `X.Z`, `Z>Y`), but treat any hardcoded schema assumption as provisional.
- **The search-path disjunction is unresolved, not just historical.** CMake issue [#26410](https://gitlab.kitware.com/cmake/cmake/-/issues/26410) is open as of this dive; the proposed fix (a `<name>_TYPE` variable restricting search to `cmake`/`cps`/`any`) is a proposal, not shipped behavior. Do not treat the current search table as final.
- **`CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO`'s own doc has a documentation defect**, not just an experimental status: the fetched current-master text literally says "meaningful only when experimental support has been enabled by the `CMAKE_EXPERIMENTAL_FIXME` gate" — `CMAKE_EXPERIMENTAL_FIXME` is a placeholder, not a real variable name. The real gate, cross-checked against `experimental.rst`, is `CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO`. This is worth reporting upstream; until fixed, don't trust that one doc page's literal gate name.
- **`cmake-packages(7)`, the conceptual manual page, has not been updated for CPS at all** — a full-text search of the current-master `Help/manual/cmake-packages.7.rst` (723 lines) for "CPS" returns zero hits; its entire narrative ("Config-file Packages", "Package Layout", "Creating a Package Configuration File") still describes the pre-CPS, CMake-script-only world. The authoritative CPS narrative currently lives only in the command references (`install.rst`, `export.rst`, `find_package.rst`) and the experimental-features guide — a gap between CMake's own conceptual docs and its command reference.
- **Package-manager adoption is thin and asymmetric.** Independent commentary (not a CPS/CMake primary source — treat as informed opinion, dated April 2026): "[Conan] can already generate CPS files for everything in ConanCenter… [but] the libraries that gems actually build against… ship `.pc` files… and don't yet ship `.cps` files because almost nothing outside CMake produces them" ([nesbitt.io](https://nesbitt.io/2026/04/13/common-package-specification.html)). A concrete Conan+CMake interop friction point exists in the CPS repo's own issue tracker: [#111 "Support for name mapping"](https://github.com/cps-org/cps/issues/111), an open bug report showing a real `conan.cps.CPS` + `install(PACKAGE_INFO)` combination failing on package-name disagreement. Direction: CMake side is stabilizing fast (3.31→4.3 in 18 months); the rest of the ecosystem is not moving at the same pace.
- **ISO/SG15 track is dead for now, alive informally.** P2656 (Ecosystem IS) withdrawn from WG21 in Dec 2024, continuing at `github.com/ecostd` — separate governance from `cps-org`. Whether these two efforts converge, and on what timeline, is unresolved as of this research date.
- **`isa` platform-attribute ambiguity is an open, acknowledged spec defect** ([cps-org/cps#78](https://github.com/cps-org/cps/issues/78)), not a CMake implementation bug — cross-OS/cross-endianness ISA naming is unresolved at the spec level, so any CMake or agent logic that branches on a CPS package's `isa` string should not assume canonical spelling.

## Open questions for the map

- Does `install(PACKAGE_INFO)` resolve `INSTALL_INTERFACE` genex and `export(PACKAGE_INFO)` resolve `BUILD_INTERFACE` genex, matching `install(EXPORT)`/`export(EXPORT)`'s well-established split? No fetched CMake doc states this for `PACKAGE_INFO` specifically — needs either a CMake test-suite read or a maintainer/changelog citation.
- What is the documented (not inferred) mapping from individual CPS component attributes (`includes`, `compile_flags`, `definitions`, `requires`, `link_libraries`) onto specific CMake `INTERFACE_*` imported-target properties when `find_package` consumes a `.cps`? Not found in `install.rst`/`export.rst`/`find_package.rst` — may require reading CMake's C++ source (`Source/cmExportCPSGenerator.cxx`-style file, name unconfirmed) rather than its prose docs.
- How, exactly, does a consumed CPS package's `configurations` list become CMake's `IMPORTED_CONFIGURATIONS` target property list at `find_package` time, given CPS configuration names are free-form strings and CMake's convention is fixed uppercase build-type suffixes? Flagged in §6 as unresolved.
- Does Conan 2's CPS export (referenced only secondhand via a GitHub issue reproduction, `conan.cps.CPS`) correspond to an experimental or stable Conan feature, and as of which Conan version — this dive did not fetch any Conan primary source (out of scope by design) and the claim rests on a single third-party blog post plus one bug report; the sibling package-manager dive should verify directly against Conan's own docs/changelog.
- Whether vcpkg or Meson have any CPS awareness at all (production or consumption) was not confirmed either way from a primary source in this dive — the one targeted search returned no evidence either way, only silence, which is weaker than a documented "not supported."
- CMake gitlab merge requests `!9693` ("export: Add initial CPS support") and `!11364` ("CPS: Improve invalid namespace error") were located by title only (search snippet), not read in full — a follow-up could mine their review discussions for implementation-level ambiguities not visible in the shipped docs.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [cps-org.github.io/cps/](https://cps-org.github.io/cps/) | CPS spec overview (primary) | v0.15.0, fetched 2026-09-05 | The spec's own framing of what CPS is and isn't. |
| [cps-org.github.io/cps/schema.html](https://cps-org.github.io/cps/schema.html) | CPS spec — full attribute reference (primary) | v0.15.0 | Every JSON field, type, applicability, and required/optional status. |
| [cps-org.github.io/cps/searching.html](https://cps-org.github.io/cps/searching.html) | CPS spec — search algorithm and prefix determination (primary) | v0.15.0 | The generic algorithm CMake does *not* implement verbatim — ground truth for §4. |
| [cps-org.github.io/cps/configurations.html](https://cps-org.github.io/cps/configurations.html) | CPS spec — configuration model and merging rules (primary) | v0.15.0 | Debug/Release and configuration-merge semantics. |
| [cps-org.github.io/cps/components.html](https://cps-org.github.io/cps/components.html) | CPS spec — component/configuration naming grammar (primary) | v0.15.0 | The `pkg:component@config` addressing syntax. |
| [cps-org.github.io/cps/history.html](https://cps-org.github.io/cps/history.html) | CPS spec — design rationale vs. pkg-config and CMake exports (primary) | v0.15.0 | Kitware's own stated critique of the two formats CPS replaces. |
| [cps-org.github.io/cps/recommendations.html](https://cps-org.github.io/cps/recommendations.html) | CPS spec — implementation recommendations (primary) | v0.15.0 | "Configurations as Flags" pattern, cross-compiling guidance. |
| [cps-org.github.io/cps/sample.html](https://cps-org.github.io/cps/sample.html) | CPS spec — full worked `.cps` example (primary) | v0.15.0 | The concrete JSON fragment quoted in §6. |
| [github.com/cps-org/cps](https://github.com/cps-org/cps) (issues [#78](https://github.com/cps-org/cps/issues/78), [#111](https://github.com/cps-org/cps/issues/111)) | Spec repository, issue tracker (primary) | checked 2026-09-05, last push 2026-06-26 | Live evidence of unresolved spec ambiguity and real interop friction. |
| [github.com/cps-org/cps-config](https://github.com/cps-org/cps-config) | Reference pkg-config-replacement implementation (primary) | last commit 2025-04-28 | Maturity/staleness check for the one named reference implementation. |
| [gitlab.kitware.com/.../Help/command/install.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/command/install.rst) | CMake `install()` command reference, master branch (primary) | fetched 2026-09-05 | `install(PACKAGE_INFO)` full signature and notes, incl. the "cannot express" limitation. |
| [gitlab.kitware.com/.../Help/command/export.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/command/export.rst) | CMake `export()` command reference, master branch (primary) | fetched 2026-09-05 | `export(PACKAGE_INFO)` build-tree twin. |
| [gitlab.kitware.com/.../Help/command/find_package.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/command/find_package.rst) | CMake `find_package()` command reference, master branch (primary) | fetched 2026-09-05 | CPS Config-mode search table, version-schema rules, transitive-requirement handling. |
| [gitlab.kitware.com/.../Help/dev/experimental.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/dev/experimental.rst) | CMake experimental-features guide, plus versions `v3.30.0`/`v3.31.0`/`v4.0.0`/`v4.2.8`/`v4.3.0` (primary) | diffed across tags, 2026-09-05 | Exact gate names/UUIDs and when each was added/removed — this is how the timeline in §2 was actually proven, not just quoted from a blog. |
| [gitlab.kitware.com/.../Help/variable/CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/variable/CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO.rst) | CMake variable reference, master branch (primary) | fetched 2026-09-05 | The distributor-only escape hatch, and its own `CMAKE_EXPERIMENTAL_FIXME` documentation defect. |
| [gitlab.kitware.com/.../Help/release/{3.31,4.0,4.1,4.2,4.3,4.4}.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/master/Help/release/4.3.rst) | CMake release notes (primary) | fetched 2026-09-05 | Confirms which minor introduced which stable CPS feature; 4.4's zero hits confirm the feature has gone quiet since 4.3. |
| [gitlab.kitware.com/cmake/cmake/-/issues/26410](https://gitlab.kitware.com/cmake/cmake/-/issues/26410) | CMake issue tracker, open issue (primary) | opened and still open as of 2026-09-05 | The maintainers' own words for the CPS/CMake search-path disjunction. |
| [www.kitware.com/a-year-closer-to-standard-c-dependency-management/](https://www.kitware.com/a-year-closer-to-standard-c-dependency-management/) | Kitware blog (primary, vendor) | 2024-10-22 | First public description of experimental `install(PACKAGE_INFO)`, ahead of 3.31 GA. |
| [www.kitware.com/navigating-cmake-dependencies-with-cps/](https://www.kitware.com/navigating-cmake-dependencies-with-cps/) | Kitware blog — the requester's seed post (primary, vendor) | 2025-03-31 | Announces CMake 4.0's experimental CPS import and its exact gate/UUID. |
| [www.kitware.com/components-targets-and-symbols/](https://www.kitware.com/components-targets-and-symbols/) | Kitware blog (primary, vendor) | 2026-02-16 | CMake 4.2's `SYMBOLIC` target type and the component≡target equivalence. |
| [www.kitware.com/common-package-specification-is-out-the-gate/](https://www.kitware.com/common-package-specification-is-out-the-gate/) | Kitware blog (primary, vendor) | 2026-03-19 | Announces the 4.3.0 graduation to stable, two days after the tag. |
| [www.open-std.org/.../p2656r2.html](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2023/p2656r2.html) & [p2656r4.html](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2024/p2656r4.html) | WG21 paper + its withdrawal (primary, standards) | 2023-02-14 / 2024-12 | The Ecosystem IS proposal and its explicit withdrawal from ISO process. |
| [www.open-std.org/.../p2673r0.pdf](https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2022/p2673r0.pdf) | WG21 paper (primary, standards) | 2022-10-13 | The earlier, narrower "Common Description Format" proposal that fed into the CPS/Ecosystem discussion; co-authored by a Conan maintainer. |
| [nesbitt.io/2026/04/13/common-package-specification.html](https://nesbitt.io/2026/04/13/common-package-specification.html) | Independent developer blog (secondary) | 2026-04-13 | Outside-CMake-ecosystem read on real adoption thinness — a useful counterweight to Kitware's own optimism. |
| [www.kitware.com/tag/common-package-specification/](https://www.kitware.com/tag/common-package-specification/) | Kitware blog tag index (primary, vendor) | checked 2026-09-05 | Confirms the complete, ordered set of Kitware's own CPS posts — used to make sure nothing in the series was missed. |

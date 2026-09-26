---
title: The cpp-packaging index — choosing, provisioning, caching, gating
topic: cpp-packaging index (CMK-PKG)
agent: cmake-tool-provisioning-and-supply-chain
model: sonnet
kind: web
date_researched: 2026-09-26
sources_count: 19
scope: |
  Opens family CMK-PKG, the index that sits above CMK-CONAN and CMK-VCPKG:
  acquisition-strategy choice (M-L-01), the cross-manager half of the
  lock-of-record question (M-L-03), build-tool provisioning (M-L-04), CI
  cache-key correctness across managers (M-L-06), supply-chain gates
  (M-L-07), the one citable adoption survey (M-L-08), and the CMake
  integration model of five comparison ecosystems (M-L-09). Does not
  restate the Conan- or vcpkg-specific rows already settled in
  conan-cmake-integration.md, vcpkg-manifests-and-caching.md or
  cmake-dependency-seam.md (CMK-CONAN-04/-07/-09, CMK-VCPKG-01/-08/-09/-11,
  CMK-TC-01/-02) — those are cited by ID. Does not cover recipe/port
  authoring, presets mechanics, or the Bazel seam (BZL-CC, cited only).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Acquisition strategy — the decision, not a mandate (M-L-01)](#1-acquisition-strategy--the-decision-not-a-mandate-m-l-01)
   2. [The lock-of-record row, cross-manager (M-L-03)](#2-the-lock-of-record-row-cross-manager-m-l-03)
   3. [Build-tool provisioning (M-L-04)](#3-build-tool-provisioning-m-l-04)
   4. [CI cache keys, measured across the exemplar corpus (M-L-06)](#4-ci-cache-keys-measured-across-the-exemplar-corpus-m-l-06)
   5. [Supply-chain gates (M-L-07)](#5-supply-chain-gates-m-l-07)
   6. [The one citable adoption survey (M-L-08)](#6-the-one-citable-adoption-survey-m-l-08)
   7. [The comparison set's CMake integration model (M-L-09)](#7-the-comparison-sets-cmake-integration-model-m-l-09)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- No mandate exists for Conan vs vcpkg vs CPM vs system packages (M-L-01); the fleet decision is a trigger table, never a default (topic map priority: decision table, no mandate).
- A project with more than one acquisition mechanism must state a lock-of-record policy for **each** mechanism it actually uses — per-manager rules (CMK-CONAN-09, CMK-VCPKG-01/-11) do not compose automatically across a mixed Conan+FetchContent or vcpkg+CPM tree.
- vcpkg-tool and the vcpkg registry ship on separate release trains: the registry's `2026.07.29` tag and vcpkg-tool's `2026-07-27` tag are independent identifiers, and vcpkg-tool cut three more releases after the registry's tag with no corresponding registry re-tag ([era-recheck.md](../cmake-topic-map/era-recheck-2026-09-26.md)) — a lock-of-record row must pin both, never one and assume the other.
- Conan provisions build tools with `tool_requires` in the **build context**, set per-recipe (`tool_requires("cmake/[>=3.25]")`) or per-profile (`[tool_requires]\ncmake/3.25.2`, applied to whichever profile — host or build — needs the tool) ([conanfile attributes](https://docs.conan.io/2/reference/conanfile/attributes.html), [profiles reference](https://docs.conan.io/2/reference/config_files/profiles.html)).
- vcpkg provisions build tools as **host dependencies**: `{"name": "protobuf", "host": true}` builds the tool for `VCPKG_HOST_TRIPLET` (defaults to the machine's native triplet) before the target build starts, exposed to the portfile via `CURRENT_HOST_INSTALLED_DIR` ([host dependencies](https://learn.microsoft.com/en-us/vcpkg/users/host-dependencies)).
- CPM.cmake's own documented limitation list: no pre-built binaries (every configure rebuilds from source unless `CPM_SOURCE_CACHE` is set), "first version used" in diamond dependency graphs (only a warning, not an error), and it force-sets `CMP0077`/`CMP0126`/`CMP0135`/`CMP0150` to `NEW` on inclusion ([CPM.cmake README §Limitations](https://raw.githubusercontent.com/cpm-cmake/CPM.cmake/master/README.md)).
- Measured (2026-09-26, exemplar corpus, 46 repos): a broader `actions/cache` grep than wave 2's audit found found **5 repos with vcpkg-keyed cache steps** (0 was wave 2's answer with a narrower window-bounded regex) — `aminya/project_options` keys correctly on `vcpkg.json` plus compiler/cmake matrix axes; `boostorg/boost` keys three cache steps on the bare string `vcpkg-${{ runner.os }}-arm64` with no content hash at all (`boostorg__boost@cb94f33fcb:.github/workflows/ci.yml:379,444,480`).
- Zero cache steps in the corpus key on `conan.lock`, a `conanfile.*`, or a triplet name, confirming wave 2's gap as a real absence, not a measurement artifact.
- `qt/qtbase`'s ccache cache step deliberately keys on `github.run_id` (always-unique, so the cache always saves) and falls back through an `os`/`branch` `restore-keys` prefix chain, with an in-repo comment explaining exactly why (`qt__qtbase@d95af8296a:.github/workflows/ninja-build.yml:89-98`) — the correct idiom for a compiler-cache key, since ccache is already content-addressed internally.
- `apache/arrow`'s MATLAB ccache steps key on `hashFiles('cpp/**', 'matlab/**', ...)` — hashing the entire C++ tree recomputes the primary key on nearly every commit that touches `cpp/`, so the exact key almost never hits and the real reuse happens through the `restore-keys` prefix anyway, making the expensive tree-wide hash pointless work (`apache__arrow@e0cf4184dd:.github/workflows/matlab.yml:77-78,126-127,168-169`).
- `conan audit` stays experimental through 2.32.0 (introduced 2.14.0; three subcommands `scan`/`list`/`provider`; ConanCenter is the default vulnerability provider) — no changelog entry between 2.27.0 (CVE version info) and 2.32.0 touches it further ([audit command reference](https://docs.conan.io/2/reference/commands/audit.html), [changelog](https://docs.conan.io/2/changelog.html)); **the brief's premise that 2.32.0 carries "the CVE entry" is wrong** — that entry is 2.27.0 (2026-03-25), and 2.32.0's changelog has no audit-related line at all.
- vcpkg 2026.07.29 added PURL emission and Git-tree gitoids to its SPDX SBOMs and fixed unreplaced CMake variables leaking into generated SBOMs — a provenance improvement, not a gate: nothing in the release fails a build on an SBOM finding ([vcpkg 2026.07.29 release notes](https://github.com/microsoft/vcpkg/releases/tag/2026.07.29)).
- No supply-chain mechanism in either manager rises above CONSIDER severity for a MUST-grade CI gate in 2026: Conan's audit is explicitly experimental, vcpkg's SBOM is descriptive-only, and CMake's own `install(SBOM)` is still behind `CMAKE_EXPERIMENTAL_GENERATE_SBOM` per the wave-1 CPS mini-wave's gate inventory (cited, not re-verified here).
- The one adoption survey shipped text may cite is the **ISO C++ 2024 Annual Developer Survey "Lite"**, Q9 ("How do you manage your C++ 1st and 3rd party libraries?", n=1,246): Conan 19.34% (241), vcpkg 19.10% (238), system package managers 37.80% (471); Q10 ("What build tools do you use?", n=1,253): CMake 83.24% (1,043), Bazel 9.98% (125), Meson 5.99% (75) — read directly from the PDF, not a summary page.
- The **2025** ISO C++ "Lite" survey PDF is readable but contains **no quantitative package-manager or build-system breakdown at all** — it is a free-text/write-in survey with AI-generated qualitative theme summaries only; it cannot substitute for the 2024 figures and should never be cited for a percentage.
- Five comparison ecosystems inject dependencies into a CMake build the same way CMake itself was designed for — `CMAKE_PREFIX_PATH` (or an equivalent `find_package`-visible path) set from outside the CMake invocation: pixi-build's CMake backend (preview-gated), Spack's `CMakePackage` class, nixpkgs' `cmake` setup hook, and (with caveats) xrepo-cmake's `xrepo_package()`; Meson's wrap system is the outlier — it treats a CMake dependency as a Meson subproject via the `cmake` module, not the reverse.
- A rule keyed to `find_package`-consumable, generated Config packages (CMK-DEP, CMK-INST) must tolerate all five of these environments injecting paths from outside the CMake invocation — none of them is "a package manager to add a rule for," they are five more shapes the same seam already has to handle.

## Findings

### 1. Acquisition strategy — the decision, not a mandate (M-L-01)

The topic map is explicit that M-L-01 is "a decision table, not a rule; no
mandate" — the fleet publishes triggers, never a default choice. The
exemplar corpus (cited via [pm]/[deps], not re-measured here) and this
dive's own sources support the following trigger table:

| Situation | Strategy that fits | Why (this dive's sources) |
|---|---|---|
| Dependency has no CMake build at all, or you need the exact same source tree Bazel/Meson also builds | System package or a vendored copy | No manager here injects a build system; CPM/FetchContent assume the dependency already speaks CMake |
| Small number of header-only or fast-building deps, no organizational registry | CPM.cmake or FetchContent | "No packaging required," "plug-and-play" per CPM's own pitch — at the cost of "no pre-built binaries" (rebuild every clean tree) |
| Cross-compiling, and some dependencies must run *during* the build (codegen, a tool) | Conan `tool_requires` or vcpkg `"host": true` | Both managers have a first-class build/host split; CPM and system packages do not |
| An organization wants one binary-cache backend and a security-audit surface | Conan (audit tooling, package_id-based binary compatibility) or vcpkg (SBOM emission, registries) | Neither CPM nor system packages offer either |
| A registry-of-record already exists for the platform (e.g. a Linux distro's own packages) | System packages, with Conan/vcpkg only for what the distro lacks | Avoids two competing "the toolchain decides ABI" stories (CMK-TC-02) |

This table is the whole answer to M-L-01: a trigger list, not a
recommendation of one manager over another. `find_ocx`, the fleet's one
CMake consumer, uses none of Conan, vcpkg, CPM or Hunter
([find-ocx-cmake-shape-and-contracts.md:494](../cmake-audit/find-ocx-cmake-shape-and-contracts.md)) — its own dependency surface is OCX packages, orthogonal to this table.

### 2. The lock-of-record row, cross-manager (M-L-03)

The per-manager halves are settled and cited only:

- Conan: **CMK-CONAN-09** — a `requires`/`tool_requires` version range commits `conan.lock`, CI passes `--lockfile=conan.lock` explicitly.
- vcpkg: **CMK-VCPKG-01** — `builtin-baseline` or a configured registry baseline, plus a pinned vcpkg root, at the same SHA.

The cross-manager gap this dive answers: **a mixed-mechanism tree has no
single "lock of record"** — it has one lock-of-record *entry per mechanism
it actually reaches, and a rule that checks only the project's primary
manager misses the others. Concretely, in one CMake tree:

| Mechanism present | Lock-of-record artifact | Owning rule | Measured adoption (46-repo corpus) |
|---|---|---|---|
| `find_package` (MODULE or CONFIG, system/self-built) | n/a — not a fetched artifact, out of scope for a lock | — | 96.8% of 6,957 calls carry no version constraint at all ([exemplar-deps-and-dual-build.md:458,473](../cmake-audit/exemplar-deps-and-dual-build.md)) |
| Conan `requires`/`tool_requires` | `conan.lock` + `--lockfile` | CMK-CONAN-09 | 0/46 ship a committed `conan.lock` (wave-1 finding, re-cited by CMK-CONAN-09's own rationale) |
| vcpkg manifest | `builtin-baseline` / registry baseline + pinned tool version | CMK-VCPKG-01, -11 | 6/209 manifests set `builtin-baseline` |
| `FetchContent_Declare`/`CPMAddPackage` (git-based) | full-hash `GIT_TAG` | CMK-DEP (dependencies.md, cited not restated) | 10/34 git-based `FetchContent_Declare` pin a full hash; 21/64 `CPMAddPackage` pin a `VERSION`, 33/64 use an opaque `@ref` shorthand a static grep cannot classify ([exemplar-deps-and-dual-build.md:459,461](../cmake-audit/exemplar-deps-and-dual-build.md)) |
| `FetchContent_Declare`/`ExternalProject_Add` (URL-based) | `URL_HASH` | CMK-DEP | 32 declares carry `URL_HASH` (may overlap git-based rows) |
| Hunter `hunter_add_package` | the pinned `cpp-pm/gate` submodule commit (centralized, not per-call) | CMK-DEP | 100% by construction — Hunter's whole model is one pin point, not per-package (`exemplar-deps-and-dual-build.md:465,490`) |
| Git submodule | the gitlink itself | n/a | 100% by construction, but 3+ of 9 repos with submodules additionally carry a `branch =` key that lets `git submodule update --remote` float past the pinned commit — **not separately counted**, a real gap in the corpus's own coverage ([exemplar-deps-and-dual-build.md:466](../cmake-audit/exemplar-deps-and-dual-build.md)) |

The wave-2 vcpkg-tool/registry split (see Summary) makes the vcpkg row's
"pinned tool version" half a second, independent number: pin
`microsoft/vcpkg-tool`'s release, separately from the registry baseline
commit, because the tool has cut releases with no corresponding registry
tag in the same window.

### 3. Build-tool provisioning (M-L-04)

Four mechanisms provision a build tool (`cmake`, `ninja`, `protoc`,
`ccache`), and none of them are interchangeable in what they lock:

| Mechanism | How it's invoked | What is locked | Offline / mirror story |
|---|---|---|---|
| Conan `tool_requires` (build context) | Recipe: `tool_requires("cmake/[>=3.25]")`; consumer profile: `[tool_requires]` section, e.g. `cmake/3.25.2` under `[tool_requires]`, applied to whichever profile (host or build) needs the tool ([profiles reference](https://docs.conan.io/2/reference/config_files/profiles.html)) | The exact Conan package reference/version; "if there is an existing pre-compiled binary for the current package, the binaries for the tool_require won't be retrieved" ([conanfile attributes](https://docs.conan.io/2/reference/conanfile/attributes.html)) | Conan's own binary cache/remote; works with `conan.lock` |
| vcpkg host dependency (`"host": true`) | Manifest: `{"name": "protobuf", "host": true}`; built for `VCPKG_HOST_TRIPLET` (default: native triplet), exposed via `CURRENT_HOST_INSTALLED_DIR` in the consumer's portfile ([host dependencies](https://learn.microsoft.com/en-us/vcpkg/users/host-dependencies)) | The vcpkg port version, via the same baseline as every other manifest dependency — no separate pin | vcpkg's own binary cache (`VCPKG_BINARY_SOURCES`); no separate offline path for host tools |
| External hash-verified provisioner (e.g. a `file(DOWNLOAD ... EXPECTED_HASH)` fetch, or a dedicated tool-fetch action) | Project-specific CMake code or a CI action, outside both package managers | Whatever hash the project writes down — as strong or weak as that one call site | Whatever URL the project points at; no shared registry |
| Runner/container image | Nothing — "whatever's on `PATH`" | The image tag, if the image itself is pinned; otherwise nothing | Depends entirely on image pinning discipline |

Measured: the exemplar corpus's own tool-provisioning mix (already
measured by wave-2's audit, cited not re-run) shows the fourth row — the
runner image, unpinned — as the majority path: "35 remaining — the
majority path is 'whatever the runner image ships,' not a pinned-action
install" ([exemplar-deps-and-dual-build.md:430](../cmake-audit/exemplar-deps-and-dual-build.md)), against `tool_requires`/`build_requires` appearing in only 10 of the sampled recipes and 0 in profile files directly ([exemplar-deps-and-dual-build.md:207,225](../cmake-audit/exemplar-deps-and-dual-build.md)).

### 4. CI cache keys, measured across the exemplar corpus (M-L-06)

Wave 2's own audit tried `actions/cache[\s\S]{0,400}vcpkg\.json` and found
zero hits, flagging the 400-character line-window as a likely
false-negative source ([exemplar-deps-and-dual-build.md:437,504](../cmake-audit/exemplar-deps-and-dual-build.md)). This dive re-ran the search without a window bound — every `actions/cache`/`uses: actions/cache@vN` step in every `.github/workflows/*.yml`/`.yaml` file across all 46 repos, printing the following 20 lines and grepping the block for `vcpkg`, `conan`, `triplet`, `compiler`, `ccache`/`sccache`, `hashFiles`:

```sh
grep -rn --include='*.yml' --include='*.yaml' -A20 -e 'actions/cache' .github/workflows/
```
(run per repository root, printing 20 lines of trailing context per hit so the `key:`/`path:` lines that follow a `uses: actions/cache` line are visible in the same match)

Findings (empty-reads-as-pass framing: a manager's cache key that never
references its manifest is a finding; the table below lists every hit,
not an absence):

- **`aminya/project_options`** — four workflows key the vcpkg archive-cache path on `hashFiles('./vcpkg.json')` plus a compiler/platform/cmake-version matrix axis:
  ```yaml
  # aminya__project_options@d386a62c58:.github/workflows/ci.yml:57
  key: ${{ runner.os }}-${{ matrix.compiler }}-${{ env.BUILD_TYPE }}-${{ hashFiles('**/CMakeLists.txt', './vcpkg.json')}}
  ```
  This is the **correct** pattern: the key changes when the manifest changes (new/removed dependency) and when the compiler changes (vcpkg's ABI hash tracks the compiler by default — see `VCPKG_DISABLE_COMPILER_TRACKING` below), so a stale binary built by a different compiler is never silently restored.
- **`boostorg/boost`** — three cache steps key the same vcpkg install path on a bare string:
  ```yaml
  # boostorg__boost@cb94f33fcb:.github/workflows/ci.yml:374-379 (and again at 439-444, 475-480)
  uses: actions/cache@v5
  with:
    path: |
      C:\vcpkg\downloads
      C:\vcpkg\installed
    key: vcpkg-${{ runner.os }}-arm64
  ```
  This is the **anti-pattern**: no `hashFiles` on any manifest, baseline, or vcpkg-root pin, and no compiler axis. The cache is restored identically regardless of whether the dependency set, the baseline, or the vcpkg binary itself changed; the only way it ever invalidates is a manual cache-eviction or a key-string edit.
- **Conan**: zero cache steps anywhere in the corpus key on `conan.lock`, a `conanfile.*`, or a profile file — confirming wave 2's gap is real, not an artifact of its narrower regex. This dive found no counter-example to cite.
- **ccache/sccache**:
  ```yaml
  # qt__qtbase@d95af8296a:.github/workflows/ninja-build.yml:89-98
  uses: actions/cache@v2
  with:
    path: ${{ runner.temp }}/ccache
    # "github.run_id" is unique, which causes the cache to always get
    # saved at the end of a successful run.
    key:  ccache-${{ matrix.os }}-${{ github.ref }}-${{ github.run_id }}
    # As the unique "key" above will never be found in the cache when the
    # job starts, we need these broader "restore-keys" in order to match
    # and restore the most recent cache.
    restore-keys: |
      ccache-${{ matrix.os }}-${{ github.ref }}-
      ccache-${{ matrix.os }}-${{ env.BRANCH_REF }}-
      ccache-${{ matrix.os }}-refs/heads/dev-
      ccache-${{ matrix.os }}-
  ```
  vs.
  ```yaml
  # apache__arrow@e0cf4184dd:.github/workflows/matlab.yml:77-78 (macos/windows variants at 126-127, 168-169)
  key: matlab-ccache-ubuntu-${{ hashFiles('cpp/**', 'matlab/**', '!matlab/build/**') }}
  restore-keys: matlab-ccache-ubuntu-
  ```
  Both end up relying on the `restore-keys` prefix match for actual reuse (a compiler cache is already content-addressed by ccache itself, so keying the *cache-storage* layer on file contents adds nothing); qt's version says so in a comment and uses a cheap, always-changing key (`github.run_id`) on purpose, while arrow's version pays for an expensive whole-tree `hashFiles` that changes on nearly every commit touching `cpp/` and therefore almost never hits its own primary key either — same effective behavior, one documented and cheap, one undocumented and needlessly expensive.

Underlying ABI-hash mechanics that explain *why* the compiler belongs in
a vcpkg key: `VCPKG_DISABLE_COMPILER_TRACKING`, "when set to `TRUE`, `ON`,
or `1`, the compiler will not be tracked as part of the package abis,"
with an explicit warning that enabling it "can lead to ABI incompatibility
in restored binary packages" ([vcpkg triplets reference](https://learn.microsoft.com/en-us/vcpkg/users/triplets)) — i.e., turning this off is what would make dropping the compiler from a cache key safe, and no exemplar sets it. `VCPKG_HASH_ADDITIONAL_FILES` extends the ABI hash to custom triplet/toolchain includes, for teams whose triplet does more than the stock ones.

### 5. Supply-chain gates (M-L-07)

- **`conan audit`** — introduced 2.14.0, still marked experimental at 2.32.0 (2026-08-31). Three subcommands: `scan` ("Scan a given recipe for vulnerabilities in its dependencies"), `list` (vulnerabilities for given references, no transitive walk), `provider` (manage vulnerability-data providers; ConanCenter is the default, private JFrog Security providers are pluggable) ([audit command reference](https://docs.conan.io/2/reference/commands/audit.html)). The CVE-version-info feature the brief expected in the 2.32.0 changelog is actually a **2.27.0** (2026-03-25) entry ("Add CVE version info to `conan audit` results"); the 2.32.0 changelog carries no audit-related line at all ([changelog](https://docs.conan.io/2/changelog.html)) — a severity threshold for `conan audit scan` was added earlier still, at 2.16.0 (2025-04-29).
- **vcpkg SBOM** — SPDX-format, generated per install; 2026.07.29 added PURL emission ("Emit a PURL in generated SPDX SBOMs", "Use canonical vcpkg PURLs in dependency snapshots"), Git-tree gitoids for provenance, and fixed a bug where CMake variables leaked unreplaced into generated SBOM text ([vcpkg 2026.07.29 release notes](https://github.com/microsoft/vcpkg/releases/tag/2026.07.29)). It is descriptive: nothing in vcpkg fails a build because of SBOM content.
- **CMake `install(SBOM)`** — still behind `CMAKE_EXPERIMENTAL_GENERATE_SBOM` as of the era-recheck's gate inventory (same six-gate list, same UUIDs, unchanged since wave 1: [era-recheck.md](../cmake-topic-map/era-recheck-2026-09-26.md)); cited here, not re-verified.

None of the three is stable, none of the three fails a build by default,
and no exemplar repo's CI is observed gating on any of them
(`-Werror=dev`, the closest analog to a strict-mode gate this corpus has,
sits at 3/46 — [exemplar-deps-and-dual-build.md:446](../cmake-audit/exemplar-deps-and-dual-build.md)). **Answer to the DECIDE item: no supply-chain gate rises above CONSIDER in 2026.**

### 6. The one citable adoption survey (M-L-08)

Read directly from the PDF (not a summary page, not a snippet):

- **ISO C++ 2024 Annual Developer Survey "Lite"**, Q9 "How do you manage your C++ 1st and 3rd party libraries? (Check all that apply)," n=1,246: library source code part of the build 68.54% (854), compile separately 48.48% (604), system package managers 37.80% (471), download prebuilt 25.60% (319), **Conan 19.34% (241)**, **Vcpkg 19.10% (238)**, other 14.53% (181), NuGet 5.30% (66), none 1.69% (21).
- Same survey, Q10 "What build tools do you use? (Check all that apply)," n=1,253: **CMake 83.24% (1,043)**, Ninja 45.41% (569), Make/nmake 36.31% (455), MSBuild 29.77% (373), distcc/ccache 15.16% (190), Bazel 9.98% (125), Meson 5.99% (75).

The 2025 "Lite" survey PDF fetched and read in full (30 pages): it
contains only free-text write-in questions with AI-generated qualitative
theme summaries (e.g. page 25's "Standardized Package Management and
Build System" theme, drawn from open-ended complaints, not a checkbox
question) — no percentage table for any build tool or package manager
exists in this year's PDF. Citing "2025 ISO C++ survey: Conan X%" would be
fabricated; the number does not exist in that document.

**Answer to the DECIDE item:** the single citable survey line is the 2024
ISO C++ Developer Survey Lite, Q9/Q10, exactly as quoted above — never the
2025 ISO Lite survey (no quantitative data) and never JetBrains' "State of
C" survey (C-only per the frame's conflict 7, already resolved).

### 7. The comparison set's CMake integration model (M-L-09)

| Ecosystem | CMake integration model | Maturity | Source |
|---|---|---|---|
| pixi-build (prefix.dev), CMake backend | Auto-generates a conda package from a CMake project by running `cmake -DCMAKE_INSTALL_PREFIX=$PREFIX ...` with Ninja; dependencies come from Pixi's own resolver, not from CMake `find_package` directly | **Preview**: requires opting in via `workspace.preview` in `pixi.toml`; "will change until it is stabilized" | [pixi-build-cmake docs](https://prefix-dev.github.io/pixi-build-backends/backends/pixi-build-cmake/) |
| Spack, `CMakePackage` class | Standard `cmake .. -DCMAKE_INSTALL_PREFIX=... && make && make install` phases; Spack sets `CMAKE_PREFIX_PATH` to the transitive closure of the spec's dependency prefixes so `find_package()`/`find_library()` resolve them; package authors override `cmake_args()` with `define()`/`define_from_variant()` helpers | Stable, long-lived build-system class | [Spack CMakePackage docs](https://spack.readthedocs.io/en/latest/build_systems/cmakepackage.html) |
| nixpkgs, `cmake` setup hook | "Dependencies are added automatically to `CMAKE_PREFIX_PATH` so that packages are correctly detected by CMake"; `cmakeFlags` controls extra `-D` flags, `cmakeBuildType` sets `CMAKE_BUILD_TYPE` (default `Release`) | Stable, core nixpkgs infrastructure | [nixpkgs cmake hook doc](https://github.com/NixOS/nixpkgs/blob/master/doc/hooks/cmake.section.md) |
| xrepo-cmake (xmake/xrepo) | `xrepo_package("pkg 1.2.3")` adds the package's install directory to `CMAKE_PREFIX_PATH` so `find_package()` still works when the port ships one; otherwise it populates `<pkg>_INCLUDE_DIRS`/`_LIBRARY_DIRS`/`_LIBRARIES`/`_DEFINITIONS` manually, or `xrepo_target_packages(target pkg...)` wires a target directly via `target_include_directories()`/`target_link_libraries()` | Actively maintained wrapper repo, not part of CMake or xmake core | [xrepo-cmake README](https://raw.githubusercontent.com/xmake-io/xrepo-cmake/main/README.md) |
| Meson, wrap-dependency system | The *inverse* direction: a `.wrap` file lets a **Meson** project consume a non-Meson (including CMake) subproject via Meson's `cmake` module; because the module can't see a CMake project's "public" dependency names, the wrap's `dep_name` must equal `<CMakeTargetName>_dep` with non-alphanumerics replaced by `_` | Stable, core Meson feature; WrapDB is the shared registry | [Meson Wrap manual](https://mesonbuild.com/Wrap-dependency-system-manual.html) |

Four of five (pixi-build, Spack, nixpkgs, xrepo-cmake) inject paths into
`CMAKE_PREFIX_PATH` from outside the CMake invocation — exactly the model
`find_package`-based rules (CMK-DEP, CMK-INST) already assume for a plain
system install. Meson is the exception: it never becomes the environment
a CMake `find_package` call runs inside; instead it treats a CMake
dependency as a foreign subproject it drives through its own `cmake`
module. **No rule keyed on generated Config packages or `find_package`
call sites should special-case any of these five** — the four
`CMAKE_PREFIX_PATH`-style ones already satisfy it by construction, and
Meson never triggers a CMake-side rule at all because the CMake code in
question is the dependency, not the consumer.

## Normative guidance candidates

**CMK-PKG-01 — A tree that reaches more than one acquisition mechanism states a lock-of-record entry for every mechanism it reaches, not only its primary manager's.**
- *Rationale:* per-manager lock rules (CMK-CONAN-09, CMK-VCPKG-01/-11, and the FetchContent/CPM hash discipline that lives in CMK-DEP) do not compose: a repo can have a pristine `conan.lock` while its `FetchContent_Declare(... GIT_TAG main)` for a second dependency floats freely, and neither per-manager rule alone catches that. §2 above.
- *Verify:* first identify which mechanisms are present — `grep -rn --include='conanfile.*' -e '.' .` (any hit), `grep -rn --include='vcpkg.json' -e '.' .` (any hit), `grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'FetchContent_Declare' -e 'CPMAddPackage' .` (any hit) — then apply the matching per-mechanism rule (CMK-CONAN-09 / CMK-VCPKG-01 / a full-hash `GIT_TAG` or `URL_HASH` check) to each one found present. A mechanism present with no corresponding lock check applied = finding.
- *Severity:* MUST.
- *Floor:* any; this is a composition rule over already-versioned mechanisms.

**CMK-PKG-02 — Pin the vcpkg tool and the vcpkg registry baseline as two independent values, never one standing in for the other.**
- *Rationale:* vcpkg-tool and the vcpkg registry ship on separate release trains; the tool has cut releases after the registry's most recent tag with no corresponding registry re-tag in the same window (era-recheck, §Summary). A CI pin that only records "vcpkg 2026.07.29" and assumes the tool binary matches leaves the tool version undetermined.
- *Verify:* read the CI/toolchain-provisioning file (Dockerfile, setup-vcpkg action config, or a version file) for two distinct version strings: one matching the registry tag pattern (`YYYY.MM.DD`), one matching the vcpkg-tool tag pattern (`YYYY-MM-DD` or a commit). Only one present, or both present but identical, = finding (a reading heuristic, not a single grep — the two trains use similar date-shaped tags on purpose).
- *Severity:* SHOULD.
- *Floor:* vcpkg-tool releases with independent tags (current as of 2026-09-26; verify the split still holds before reusing this rule in a later era).

**CMK-PKG-03 — State explicitly, per required build tool, which of the four provisioning mechanisms supplies it; never leave a build-tool version whose output affects the build (codegen, a required feature flag) to "whatever the runner image ships."**
- *Rationale:* the runner-image path is unpinned by construction and was the majority path in the exemplar corpus (35/46, `exemplar-deps-and-dual-build.md:430`); a `protoc` or `ninja` version skew between CI runs can change generated code or accepted flags silently. §3's table names the four mechanisms and what each locks.
- *Verify (reading heuristic, not a single grep):* for each build tool the project's own docs or CI call out by name (protoc, a codegen tool, a specific ninja/cmake floor), find one of: a `tool_requires` line in a `conanfile.*` or a profile's `[tool_requires]` section; a `"host": true` entry in `vcpkg.json` naming that tool; an explicit hash-verified `file(DOWNLOAD ...)`/CI-action pin; or a Dockerfile/runner-image tag pinned to a specific digest. No match for a tool whose version matters = finding.
- *Severity:* SHOULD.
- *Floor:* any; Conan 2.x for `tool_requires`, any vcpkg manifest version for `"host": true`.

**CMK-PKG-04 — A CI cache key for a package manager's binary cache must be invalidated by everything that determines the binary's identity: the manifest/lock content, and the compiler identity unless the manager is explicitly told to drop it.**
- *Rationale:* `boostorg/boost`'s static `vcpkg-${{ runner.os }}-arm64` key (§4) can restore an OpenSSL binary built against a stale `vcpkg.json`/baseline/vcpkg-tool version forever, because nothing in the key can ever change except by hand; `aminya/project_options`'s `hashFiles('./vcpkg.json')` plus a compiler-matrix axis is the pattern that actually invalidates. vcpkg's ABI hash tracks the compiler by default (`VCPKG_DISABLE_COMPILER_TRACKING` exists specifically to opt out, with an explicit ABI-incompatibility warning attached) — a cache key that also drops the compiler without that setting is restoring binaries vcpkg itself would treat as ABI-distinct.
- *Verify:*
  ```sh
  grep -rn --include='*.yml' --include='*.yaml' -B2 -A15 -e 'uses: actions/cache' .github/workflows/
  ```
  Read each block: a `key:` for a vcpkg-path cache with no `hashFiles(...)` touching `vcpkg.json`/`vcpkg-configuration.json` = finding. A `key:` for a Conan-cache path with no `hashFiles(...)` touching `conanfile.*`/`conan.lock`/the profile directory = finding (a plain grep over `key:` lines suffices for this half — zero corpus examples currently do it correctly, so there is no false-positive risk from an existing good pattern). Empty output from the first grep = no cache steps to check, not a pass on its own — confirm the manager isn't cached at all in that case, which is CONSIDER-severity on its own but not this rule's finding.
- *Severity:* MUST for the vcpkg half (an ABI mismatch is a real corruption risk); SHOULD for the Conan half (no corpus baseline exists yet to calibrate a stricter grade).
- *Floor:* any; `VCPKG_DISABLE_COMPILER_TRACKING` documented at least since the vcpkg triplets reference current in 2026.

**CMK-PKG-05 — A compiler-cache (ccache/sccache) key should not hash the full source tree; key on something cheap and rely on `restore-keys` prefix matching for reuse.**
- *Rationale:* ccache is already content-addressed internally — the GitHub Actions cache layer only needs to persist the *directory*, not re-derive an exact key from source contents. `apache/arrow`'s `hashFiles('cpp/**', ...)` key changes on nearly every commit touching `cpp/`, so its own primary key rarely hits and reuse happens via `restore-keys` anyway, at the cost of hashing the whole tree every run for no benefit; `qt/qtbase`'s `github.run_id`-keyed, `restore-keys`-chained pattern gets the same reuse cheaply and documents why in a comment. §4.
- *Verify:* read each ccache/sccache `actions/cache` step's `key:`. A `key:` built from `hashFiles()` over a large source glob (more than the tool's own config files) with a `restore-keys` present as well = finding (the hash is redundant work, not wrong, so this is a design note, not a correctness bug). No `restore-keys` at all on a ccache/sccache step = a stronger finding (a first-run-of-the-day cache miss then never recovers same-day reuse).
- *Severity:* CONSIDER.
- *Floor:* any; both patterns work on any actions/cache version observed in the corpus (v2 through v6).

**CMK-PKG-06 — Do not gate CI on `conan audit`, vcpkg's SBOM output, or CMake's `install(SBOM)`; run them as non-blocking/advisory steps only.**
- *Rationale:* all three are explicitly experimental or purely descriptive as of 2026-09-26 (§5); no exemplar in the corpus fails its build on any of them, and Conan's own docs mark `conan audit` "experimental and subject to breaking changes."
- *Verify (reading heuristic):* find any CI step invoking `conan audit scan`/`list`, a vcpkg SBOM-consuming step, or a `CMAKE_EXPERIMENTAL_GENERATE_SBOM`-gated build; confirm its exit code is not allowed to fail the job (e.g. `continue-on-error: true`, or the step only uploads an artifact). A hard-failing invocation of any of the three = finding.
- *Severity:* CONSIDER (this is the ceiling itself — nothing here can be MUST while the underlying feature is experimental).
- *Floor:* Conan 2.14.0+ for `audit`; vcpkg 2026.07.29+ for the PURL/gitoid SBOM fields; CMake 3.31+ behind the experimental gate for `install(SBOM)`.

**CMK-PKG-07 — Cite only the ISO C++ 2024 Annual Developer Survey Lite (Q9/Q10) for C++ package-manager or build-tool adoption percentages; never the 2025 Lite survey and never a C-only survey.**
- *Rationale:* the 2025 ISO Lite PDF has no quantitative package-manager/build-tool table at all (§6) — any percentage attributed to "the 2025 C++ survey" is fabricated. JetBrains' "State of C" survey is C-only, already excluded by the frame's conflict 7.
- *Verify (reading heuristic — citation hygiene, not a grep):* any shipped text citing a C++ package-manager or build-tool percentage names "ISO C++ 2024 Annual Developer Survey Lite, Q9/Q10" (or links the 2024 PDF) as its source. A citation naming 2025, JetBrains, or no year at all for such a figure = finding.
- *Severity:* CONSIDER (documentation hygiene, not a build-correctness rule).
- *Floor:* n/a.

## Exemplar evidence

- **CMK-PKG-01** (composed lock-of-record): no exemplar satisfies this fully — the corpus's 8 dual-mechanism repos (arrow, ccache, grpc, protobuf, curl, spdlog, vcpkg-tool; frame correction 6) were not re-checked here for whether *both* their mechanisms are locked; flagged as a follow-up, not measured in this dive's budget.
- **CMK-PKG-02** (vcpkg tool/registry split): no exemplar CI file was found pinning both trains independently in this dive's sampling; `microsoft/vcpkg-tool`'s own release process is the authoritative example of the split existing, not of a consumer handling it (era-recheck.md).
- **CMK-PKG-03** (tool provisioning stated per-tool): `aminya/project_options`'s workflows come closest — `aminya/setup-cpp@v1` with `cmake:`, `ninja:`, `vcpkg:`, `conan:` inputs names each tool's source explicitly, though the action itself is the provisioning layer, not `tool_requires`/`"host": true` (`aminya__project_options@d386a62c58:.github/workflows/ci.yml:64-69`).
- **CMK-PKG-04 violates**: `boostorg__boost@cb94f33fcb:.github/workflows/ci.yml:379,444,480`. **CMK-PKG-04 satisfies**: `aminya__project_options@d386a62c58:.github/workflows/ci.yml:57` and the three sibling workflows (`ci.cross.mingw.yml:47`, `ci.emscripten.yml:37`, `ci.cross.arm.yml:63`).
- **CMK-PKG-05 satisfies (documented)**: `qt__qtbase@d95af8296a:.github/workflows/ninja-build.yml:89-98`. **CMK-PKG-05's design-note case**: `apache__arrow@e0cf4184dd:.github/workflows/matlab.yml:77-78,126-127,168-169`.
- **CMK-PKG-06**: no exemplar runs `conan audit` or a vcpkg-SBOM-consuming CI step at all in the sampled workflows, gating or otherwise — the rule is currently unexercised in the corpus, consistent with §5's "no exemplar gates on any of them."
- **`find_ocx`**: reaches none of Conan, vcpkg, CPM or Hunter (`find-ocx-cmake-shape-and-contracts.md:494`), so none of CMK-PKG-01 through -06 currently applies to it; it stands outside this family entirely, not as a passing or failing case.

## AI-agent angle

- **Conan-1 `build_requires` muscle memory.** A model trained through Conan 1's long tail will reach for `build_requires` where 2.x wants `tool_requires` (deprecated ~2.28, per the already-settled CMK-CONAN-03/M-M-03 boundary) — the mechanical check is `rg -n build_requires -g 'conanfile.*'`, a hit is stale syntax.
- **Treating vcpkg's `"host": true` as a vcpkg-classic-mode CONTROL-file concept.** Classic mode has no per-dependency host/target split at all; a model that "knows vcpkg" from pre-manifest-mode training may invent a nonexistent classic-mode equivalent instead of the manifest field. Check: the project has a `vcpkg.json` (manifest mode is a prerequisite for `"host": true` at all — the host-dependencies doc explicitly says CONTROL-format consumers must convert first).
- **Assuming `conan audit` or vcpkg's SBOM output can gate a build today.** Both are new enough (`audit` 2.14.0, PURL/gitoid SBOM fields 2026.07.29) that a model may confidently write a hard-failing CI step around either, matching the general pattern "supply-chain scanning tools fail the build" from other ecosystems where that is true. Check: does the step have `continue-on-error` or only upload an artifact — if it hard-fails, that's over-trusting an experimental feature (CMK-PKG-06).
- **Citing "recent" C++ survey percentages without checking which year's PDF actually has them.** The 2025 ISO Lite PDF exists, is fetchable, and *looks* like the right citation for "current" data — but contains no percentage table at all. A model asked for "the latest C++ package manager adoption numbers" may hallucinate 2025 figures that resemble the 2024 ones, or cite the wrong document entirely. Check: open the actual PDF and search for the tool's name followed by a `%` sign — if absent, the year is wrong.
- **Copying a `hashFiles()`-heavy cache key pattern from a "found it on the internet" ccache example without noticing it defeats the cache.** A model may pattern-match "cache keys should hash the inputs" from other caching contexts (pip, npm) and apply it uncritically to ccache, producing arrow's expensive-and-pointless pattern instead of qt's cheap-and-documented one. Check: does the ccache/sccache key's `hashFiles()` argument include the whole source tree — if so, ask whether `restore-keys` alone would do the same job for less cost.
- **Assuming CMake's `install(SBOM)`/CPS gates are stable because they read as "the new standard way."** Both are dated 2026-era CMake features a model without post-cutoff grounding will not have seen at all, and one it has seen may be misremembered as shipped rather than experimental. Check: grep for `CMAKE_EXPERIMENTAL_` beside the feature name in the project's own CMake code — its presence is the tell that the gate is still opt-in.

## Contested / evolving

- **Whether a GitHub Actions cache key should hash the compiler-cache's source inputs at all** is not settled practice — this dive found exactly one exemplar (`qt/qtbase`) documenting the "don't hash, use restore-keys" position explicitly, against several undocumented `hashFiles()`-based keys elsewhere in the same corpus (arrow's MATLAB workflows) that achieve the same fallback behavior less deliberately. Trending, as of 2026-09-26: no consensus visible in this corpus; the `qt/qtbase` comment is the only piece of *taught* reasoning found, not a majority pattern.
- **Whether `conan audit`/vcpkg SBOM will graduate to gate-worthy before the next wave.** `conan audit` has had incremental feature releases every couple of months since 2.14.0 (2.16.0 severity threshold, 2.17.0 SPDX license validation, 2.18.0 sbom/lockfile support, 2.21.0 build/host context filter, 2.23.0 more output, 2.27.0 CVE version info) without ever dropping "experimental" — the cadence suggests active investment, not stagnation, but the label hasn't moved in over a year of releases as of 2026-09-26.
- **The vcpkg-tool/registry train split** (era-recheck's wave-2 surprise) is new enough that no fleet or corpus practice yet exists for pinning both independently — CMK-PKG-02 is this dive's proposed answer, not an observed consensus.

## Sources

| URL or measurement | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [Conan `conanfile` attributes reference](https://docs.conan.io/2/reference/conanfile/attributes.html) | Primary docs | Conan 2.31/2.32-era, fetched 2026-09-26 | `tool_requires` attribute wording, verbatim |
| [Conan tool_requires packages tutorial](https://docs.conan.io/2/tutorial/creating_packages/other_types_of_packages/tool_requires_packages.html) | Primary docs | Conan 2.32.0, fetched 2026-09-26 | Build-context explanation and `--build-require` requirement |
| [Conan profiles reference, `[tool_requires]`](https://docs.conan.io/2/reference/config_files/profiles.html) | Primary docs | Conan 2.32.0, fetched 2026-09-26 | Exact profile-section syntax and example |
| [vcpkg host dependencies](https://learn.microsoft.com/en-us/vcpkg/users/host-dependencies) | Primary docs (MicrosoftDocs/vcpkg-docs) | Updated 2025-02-06, fetched 2026-09-26 | Full `"host": true` mechanics, `CURRENT_HOST_INSTALLED_DIR`, `VCPKG_USE_HOST_TOOLS` |
| [vcpkg triplet variables reference](https://learn.microsoft.com/en-us/vcpkg/users/triplets) | Primary docs | Updated 2026-08-05, fetched 2026-09-26 | `VCPKG_DISABLE_COMPILER_TRACKING`, `VCPKG_HASH_ADDITIONAL_FILES`, VS2026 toolset `v145` |
| [CPM.cmake README](https://raw.githubusercontent.com/cpm-cmake/CPM.cmake/master/README.md) | Primary source (raw GitHub) | v0.43.2-era (2026-09-24), fetched 2026-09-26 | §Limitations verbatim: no pre-built binaries, first-version-used, forced `NEW` policies |
| [`conan audit` command reference](https://docs.conan.io/2/reference/commands/audit.html) | Primary docs | Conan 2.32.0, fetched 2026-09-26 | Subcommands, experimental status, default provider |
| [Conan changelog](https://docs.conan.io/2/changelog.html) | Primary docs | Through 2.32.0 (2026-08-31), fetched 2026-09-26 | Located the actual CVE-info entry at 2.27.0, corrected the brief's 2.32.0 premise |
| [vcpkg 2026.07.29 release notes](https://github.com/microsoft/vcpkg/releases/tag/2026.07.29) | Primary source (GitHub Releases) | 2026-07-31, fetched 2026-09-26 | PURL/gitoid SBOM additions, port counts |
| [pixi-build-cmake backend docs](https://prefix-dev.github.io/pixi-build-backends/backends/pixi-build-cmake/) | Primary docs | Preview-feature era, fetched 2026-09-26 | Confirms preview-gated status and Ninja/CMake invocation shape |
| [Spack `CMakePackage` docs](https://spack.readthedocs.io/en/latest/build_systems/cmakepackage.html) | Primary docs | Fetched 2026-09-26 | `CMAKE_PREFIX_PATH` injection and `cmake_args()` mechanics |
| [nixpkgs `cmake` setup hook doc](https://github.com/NixOS/nixpkgs/blob/master/doc/hooks/cmake.section.md) | Primary source (repo doc) | Fetched 2026-09-26 | `CMAKE_PREFIX_PATH`/`cmakeFlags`/`cmakeBuildType` wording, verbatim |
| [xrepo-cmake README](https://raw.githubusercontent.com/xmake-io/xrepo-cmake/main/README.md) | Primary source (raw GitHub) | Fetched 2026-09-26 | `xrepo_package()`/`xrepo_target_packages()` signatures and `CMAKE_PREFIX_PATH` behavior |
| [Meson Wrap dependency system manual](https://mesonbuild.com/Wrap-dependency-system-manual.html) | Primary docs | Fetched 2026-09-26 | Confirms the CMake-as-subproject (inverse) integration direction, `dep_name` naming rule |
| ISO C++ 2024 Annual Developer Survey "Lite" PDF, Q9/Q10 (measured, `pypdf` text extraction) | Primary source (survey PDF, not a summary page) | Published 2024, fetched/read 2026-09-26 | Exact percentages and response counts for the one citable adoption line |
| ISO C++ 2025 Annual Developer Survey "Lite" PDF (measured, `pypdf` text extraction, full 30 pages scanned for `%` near tool names) | Primary source (survey PDF) | Published 2025, fetched/read 2026-09-26 | Confirms no quantitative package-manager/build-tool data exists in this year's document |
| Measurement: unbounded `actions/cache` block grep over all 46 exemplar repos' `.github/workflows/*.yml` | Measurement (this dive) | Corpus snapshot 2026-09-05/06, re-run 2026-09-26 | Found the 5 vcpkg-keyed cache steps wave 2's window-bounded regex missed; confirmed zero Conan-keyed cache steps |
| [era-recheck-2026-09-26.md](../cmake-topic-map/era-recheck-2026-09-26.md) | Internal (this program, wave 3) | 2026-09-26 | vcpkg-tool/registry train-split figures, current version table |
| [exemplar-deps-and-dual-build.md](../cmake-audit/exemplar-deps-and-dual-build.md) | Internal (this program, wave 1 audit) | 2026-09-05/06 | Lock/pin-posture table, tool-provisioning majority-path figures, the narrower cache-key gap this dive re-measured |


---
title: "CMake floors, policies and the configure gate"
topic: "cmake-versions-and-gate"
agent: cmake-versions-floor
model: sonnet
kind: web
date_researched: 2026-09-26
sources_count: 29
scope: |
  Pins the version tables versions-and-policies.md will cite: the assumed
  floor, what current distros/CI ship, the live policy list past 3.25, the
  CMAKE_EXPERIMENTAL_* gate/UUID inventory at v4.3.4 and v4.4.2, removed Find
  modules and generators, and whether a maintained semantic CMake linter
  exists. Does not cover CPS mechanics (owned by the cps-v/cps-s dives), the
  configure-gate's diagnostic-category list (owned by cmake-build's index,
  conflict 2), or non-VER language/target/install rows.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Distro and CI floor survey](#1-distro-and-ci-floor-survey-measured-2026-09-26)
   2. [The live policy list past a 3.25 floor](#2-the-live-policy-list-past-a-325-floor)
   3. [Removed Find modules and their replacements](#3-removed-find-modules-and-their-replacements-m-g-16)
   4. [Experimental gates: rotation and the master-branch trap](#4-experimental-gates-rotation-and-the-master-branch-trap-m-b-08)
   5. [versionadded verification table](#5-versionadded-verification-table-m-b-03)
   6. [Removed and added generators](#6-removed-and-added-generators-m-b-11)
   7. [No maintained semantic CMake linter exists](#7-no-maintained-semantic-cmake-linter-exists-m-a-05)
   8. [Corpus re-scan: nothing moved](#8-corpus-re-scan-nothing-moved-m-b-10)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- **Floor confirmed at 3.25, not moved.** Debian 12 ships 3.25.1 exactly at
  that line; nothing in the distro/CI survey below argues for 3.24 or 3.28.
- **The surprise: Ubuntu 22.04 LTS (jammy) ships CMake 3.22.1-1ubuntu1 via
  apt** — below every candidate floor (3.24/3.25/3.28) — and is supported
  until April 2027; `apt install cmake` is not a viable install path there
  for a 3.25-floor project.
- Debian 13 (3.31.6-2), Ubuntu 24.04 (3.28.3-1build7), RHEL/AlmaLinux 9 and 10
  (3.31.8 both), Alpine 3.22 (3.31.7-r1) and Homebrew (4.4.3, rolling) all
  clear a 3.25 floor with room; only jammy and (barely) bookworm are tight.
- GitHub Actions `ubuntu-24.04`, `windows-2025` and `macos-15` images default
  to CMake 3.31.5/3.31.6 on `PATH` and carry 4.1.2 (macOS also 4.4.2) as an
  alternate toolset — none below 3.25.
- **77 policies were introduced after 3.25** (3.26 through 4.4); the ones a
  rule set must call out are the five Find-module removals and the
  FetchContent/install behavior changes — the rest (Swift, AIX, MSVC ABI
  detail) are noise for a C++-package-management audience.
- CMP0167 (FindBoost removed, 3.30), CMP0146 (FindCUDA removed, 3.27), CMP0148
  (FindPythonInterp/Libs removed, 3.27), CMP0191 (FindCABLE removed, 4.1),
  CMP0188 (FindGCCXML removed, 4.1): each module still **ships** in CMake's
  tree, gated to load only when its policy is `OLD` — "removed" means the
  default (`NEW`) skips it, not that the `.cmake` file is deleted.
- Replacements, confirmed from the policy docs themselves: Boost →
  `find_package(Boost CONFIG)` against upstream `BoostConfig.cmake` (Boost
  ≥1.70); CUDA → `enable_language(CUDA)` + `find_package(CUDAToolkit)`;
  PythonInterp/Libs → `FindPython3`/`FindPython2`/`FindPython`.
- **`CMAKE_EXPERIMENTAL_*` UUIDs are not stable across minor releases.** Of
  the 6 live gates, only `EXPORT_PACKAGE_DEPENDENCIES` and
  `MAPPED_PACKAGE_INFO` kept identical UUIDs from v4.3.4 to v4.4.2;
  `CXX_IMPORT_STD`, `EXPORT_BUILD_DATABASE`, `GENERATE_SBOM` and `RUST` all
  rotated between those two tagged releases.
- **Worse: GitLab's `master` branch already carries a *third* generation** of
  the `CXX_IMPORT_STD` and `GENERATE_SBOM` UUIDs that match neither the 4.3.4
  nor the 4.4.2 tag. A worker (or an agent) that reads "current" docs from
  `master` instead of the release tag it actually runs will copy a UUID that
  activates nothing on any shipped CMake.
- **Measured:** configuring with a stale `CMAKE_EXPERIMENTAL_CXX_IMPORT_STD`
  value on CMake 4.4.2 produces **no warning and no error** — the gate
  silently fails closed. `nlohmann/json`'s own exemplar comment
  ("configuration fails loudly otherwise") does not hold for CMake's actual
  behavior; only the project's own doubled build (module test target
  disappearing) would reveal it.
- `CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO` and
  `CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES` are absent from v4.3.4's and
  v4.4.2's `experimental.rst` and from the current `Kitware/CMake` checkout —
  consistent with retirement at 4.3.0, when `install(PACKAGE_INFO)` went
  ungated.
- `install(PACKAGE_INFO)` is `versionadded:: 4.3` and carries **no**
  experimental gate of its own (confirmed in `Help/command/install.rst`);
  only the `install(EXPORT)`-based CPS variant
  (`CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO`) stays behind
  `CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO`.
- versionadded facts confirmed against v4.4.2 primary source: `string(JSON)`
  3.19, `PROJECT_IS_TOP_LEVEL` 3.21, `FILE_SET` 3.23, `FIND_PACKAGE_ARGS`
  3.24, `OVERRIDE_FIND_PACKAGE` 3.24, `CMAKE_COMPILE_WARNING_AS_ERROR` 3.24,
  `cmake_language(SET_DEPENDENCY_PROVIDER)` 3.24, `block()` 3.25,
  FetchContent's `SYSTEM` keyword 3.25, the `CXX_MODULES` file-set type 3.28.
- Removed Visual Studio generators (measured against v4.4.2 doc pages): VS 6
  (removed 3.6), VS 9 2008 (removed 3.30), **VS 10 2010 (removed exactly at
  3.25** — the assumed floor), VS 11 2012 (removed 3.28), VS 12 2013 (removed
  3.31). New in 4.2: `FASTBuild` and `Visual Studio 18 2026` — both post-date
  the 3.31.12 test binary and error there.
- Re-running the wave-1 version-floor script against the 2026-09-26 corpus
  refetch: **zero of 43 discoverable root floors moved** since the
  2026-09-05 SHAs. The only `CMAKE_EXPERIMENTAL_` use outside
  `Kitware/CMake` anywhere in the 46-repo corpus is `nlohmann/json`'s
  `CXX_IMPORT_STD` gate, and it is correctly commented and pinned to match
  its own CI's CMake 4.3.x.
- No maintained *semantic* CMake linter exists as of 2026-09-26.
  `cmake-format`/`cmake-lint` (last PyPI release 0.6.13, 2020-08-19,
  reconfirmed) is frozen; `marzer/check-cmake` (last push 2025-08-07, 7
  stars) is a small line-based checker, over a year stale. `gersemi` (0.29.1,
  2026-09-14) is a formatter, not a linter. The lint role stays CMake's own
  categorized diagnostics plus named greps.
- GitLab tags API (measured): newest 4.4.x is **v4.4.3** (2026-08-25); newest
  4.3.x is **v4.3.5** (2026-09-04) — the "older" branch's latest patch
  postdates the "newer" branch's by 10 days, and both pinned test binaries
  (4.3.4, 4.4.2) are one patch behind their own branch's tip.

## Findings

### 1. Distro and CI floor survey (measured 2026-09-26)

| Platform | CMake shipped | Source | Clears 3.25? |
|---|---|---|---|
| Debian 12 (bookworm) | 3.25.1-1 | [packages.debian.org/bookworm/cmake](https://packages.debian.org/bookworm/cmake) | Exactly at the line |
| Debian 13 (trixie) | 3.31.6-2 | [packages.debian.org/trixie/cmake](https://packages.debian.org/trixie/cmake) | Yes |
| Ubuntu 22.04 (jammy) | **3.22.1-1ubuntu1** | [packages.ubuntu.com/jammy/cmake](https://packages.ubuntu.com/jammy/cmake) | **No** — below 3.24 too |
| Ubuntu 24.04 (noble) | 3.28.3-1build7 | [packages.ubuntu.com/noble/cmake](https://packages.ubuntu.com/noble/cmake) | Yes |
| RHEL/AlmaLinux 9 | 3.31.8-3.el9 | [repo.almalinux.org/almalinux/9/AppStream/x86_64/os/Packages/](https://repo.almalinux.org/almalinux/9/AppStream/x86_64/os/Packages/) | Yes |
| RHEL/AlmaLinux 10 | 3.31.8-1.el10 | [repo.almalinux.org/almalinux/10/AppStream/x86_64/os/Packages/](https://repo.almalinux.org/almalinux/10/AppStream/x86_64/os/Packages/) | Yes |
| Alpine 3.22 | 3.31.7-r1 | [pkgs.alpinelinux.org/package/v3.22/main/x86_64/cmake](https://pkgs.alpinelinux.org/package/v3.22/main/x86_64/cmake) | Yes |
| Homebrew | 4.4.3 (rolling `stable`) | [formulae.brew.sh/api/formula/cmake.json](https://formulae.brew.sh/api/formula/cmake.json) | Yes |
| GH Actions `ubuntu-24.04` (PATH default) | 3.31.6 (side-by-side: 3.31.5, 4.1.2) | [runner-images Ubuntu2404-Readme.md](https://raw.githubusercontent.com/actions/runner-images/main/images/ubuntu/Ubuntu2404-Readme.md) | Yes |
| GH Actions `windows-2025` (PATH default) | 3.31.6 (side-by-side: 3.30.5, 3.31.5, 4.1.2) | [runner-images Windows2025-Readme.md](https://raw.githubusercontent.com/actions/runner-images/main/images/windows/Windows2025-Readme.md) | Yes |
| GH Actions `macos-15` (PATH default) | 4.4.2 (side-by-side table: 3.31.5, 4.1.2) | [runner-images macos-15-Readme.md](https://raw.githubusercontent.com/actions/runner-images/main/images/macos/macos-15-Readme.md) | Yes |

`repology.org` itself was unreachable from this host (`getaddrinfo ENOTFOUND
repology.org` via WebFetch, `curl` returned exit 000) both directly and
through the fetch tool; the distro package trackers above were read
individually instead, which is a strictly stronger primary source per
platform than repology's aggregation.

**Reading:** the assumed 3.25 floor is fine for every 2026-current
distro/CI target measured. The one real risk is Ubuntu 22.04 LTS's apt
package, which sits below any candidate floor in the 3.24–3.28 range
considered by the topic map — so lowering the floor would not rescue that
platform anyway. The correct guidance is not "lower the floor" but "don't
rely on `apt install cmake` on jammy for a project at any modern floor" —
use `pip install cmake`, the Kitware APT repository, or a pinned
`actions/setup-cmake`-style installer instead.

### 2. The live policy list past a 3.25 floor

Read from a full `cmake --help-policies` dump on the pinned **4.4.2** binary
(`ocx package exec kitware/cmake:4.4 -- cmake --help-policies`), 219 policies
total, cross-checked one-by-one against the version each policy's help text
names. 77 were introduced after 3.25:

| Introduced in | Count | IDs |
|---|---|---|
| 3.26 | 1 | CMP0143 |
| 3.27 | 8 | CMP0144–CMP0151 |
| 3.28 | 4 | CMP0152–CMP0155 |
| 3.29 | 6 | CMP0156–CMP0161 |
| 3.30 | 9 | CMP0162–CMP0170 |
| 3.31 | 10 | CMP0171–CMP0180 |
| 4.0 | 5 | CMP0181–CMP0185 |
| 4.1 | 12 | CMP0186–CMP0197 |
| 4.2 | 7 | CMP0198–CMP0204 |
| 4.3 | 6 | CMP0205–CMP0210 |
| 4.4 | 9 | CMP0211–CMP0219 |

Of these, the ones with real content for a C++/dependency-management rule set
(rest are Swift/AIX/MSVC-ABI plumbing a CMake-authoring rule does not need to
individually decide):

| Policy | Title | `KEEP-NEW` or `DECIDE` |
|---|---|---|
| CMP0167 (3.30) | `FindBoost` removed | KEEP-NEW — see §3 |
| CMP0146 (3.27) | `FindCUDA` removed | KEEP-NEW — see §3 |
| CMP0148 (3.27) | `FindPythonInterp`/`FindPythonLibs` removed | KEEP-NEW — see §3 |
| CMP0191 (4.1) | `FindCABLE` removed | KEEP-NEW — see §3 |
| CMP0188 (4.1) | `FindGCCXML` removed | KEEP-NEW — see §3 |
| CMP0165 (3.30) | `enable_language()` must not precede `project()` | KEEP-NEW — was already an error in practice |
| CMP0168/CMP0169/CMP0170 (3.30) | FetchContent implements steps directly; single-arg `FetchContent_Populate` deprecated; `FETCHCONTENT_FULLY_DISCONNECTED` enforced | **DECIDE** — timing/behavior change for M-G rows, not a simple default |
| CMP0155 (3.28) | C++ sources scanned for imports once `CXX_STANDARD >= 20` | **DECIDE** — silently turns on module scanning; flag in the modules row |
| CMP0176 (3.31) | `execute_process()` output is UTF-8 by default | **DECIDE** — can change parsed-output assumptions on Windows |
| CMP0177 (3.31) | `install()` `DESTINATION` paths are normalized | **DECIDE** — can change exact-string install-path assumptions |
| CMP0180 (3.31) | `project()` always sets `<PROJECT-NAME>_*` as normal variables | KEEP-NEW |
| CMP0219 (4.4) | Macro invocations preserve backslashes | KEEP-NEW |

**Gate mechanics, not re-derived here:** because the map's decided rule-set
convention is `cmake_minimum_required(VERSION 3.25...<max>)` with `<max>`
tracking the highest tested release, a project written this way gets `NEW`
behavior for essentially all 77 policies automatically — the range's upper
bound, not the floor, decides the default for anything introduced after 3.25.
The rows above are the ones worth a rule's own sentence regardless, because
their `NEW` behavior is either a hard removal (no silent fallback exists) or
a behavior change with a real failure mode.

### 3. Removed Find modules and their replacements (M-G-16)

Confirmed by fetching each policy's own doc page at v4.4.2:

| Policy | Module removed | Introduced | Kitware's stated replacement |
|---|---|---|---|
| CMP0167 | `FindBoost` | 3.30 | `find_package(Boost CONFIG)` against upstream `BoostConfig.cmake` (shipped since Boost 1.70) |
| CMP0146 | `FindCUDA` | 3.27 | First-class `CUDA` language: `project(... CUDA)` / `enable_language(CUDA)`, plus `find_package(CUDAToolkit)` for libraries |
| CMP0148 | `FindPythonInterp`, `FindPythonLibs` | 3.27 | `FindPython3`, `FindPython2`, or `FindPython` |
| CMP0191 | `FindCABLE` | 4.1 | none named — CABLE itself is unmaintained |
| CMP0188 | `FindGCCXML` | 4.1 | CastXML (GCC-XML's stated successor) |

**Removal ≠ deletion.** Every one of these modules is still physically
present in `Kitware/CMake`'s `Modules/` tree; `FindPythonLibs.cmake`'s own
header states *"This module is available only if policy CMP0148 is not set
to NEW"* (`Kitware__CMake@ac2a759cd0`-equivalent checkout,
`Modules/FindPythonLibs.cmake:8`). A project can still
`cmake_policy(SET CMP0148 OLD)` to load it. "Removed" means CMake's own
default (`NEW`, active once the floor/range passes the introduction version)
skips it — the module is dead code on a 3.25+-range project, not gone from
disk.

### 4. Experimental gates: rotation and the master-branch trap (M-B-08)

Fetched `Help/dev/experimental.rst` at three **tags** (never `master`, per
this dive's own instruction — see why below):

| Gate | v3.31.12 | v4.3.4 | v4.4.2 | `master` (fetched 2026-09-26 by the era-recheck) |
|---|---|---|---|---|
| `EXPORT_PACKAGE_DEPENDENCIES` | n/a | `1942b4fa-b2c5-4546-9385-83f254070067` | `1942b4fa-b2c5-4546-9385-83f254070067` (same) | `1942b4fa-…` (same) |
| `EXPORT_PACKAGE_INFO` (pre-4.3 only) | `b80be207-778e-46ba-8080-b23bba22639e` | absent | absent | absent |
| `MAPPED_PACKAGE_INFO` | n/a | `ababa1b5-7099-495f-a9cd-e22d38f274f2` | `ababa1b5-7099-495f-a9cd-e22d38f274f2` (same) | `ababa1b5-…` (same) |
| `CXX_IMPORT_STD` | `d0edc3af-4c50-42ea-a356-e2862fe7a444` | `451f2fe2-a8a2-47c3-bc32-94786d8fc91b` | `f35a9ac6-8463-4d38-8eec-5d6008153e7d` | `25d6f6aa-…` (**a fourth value, matches none of the three tags**) |
| `EXPORT_BUILD_DATABASE` | `4bd552e2-b7fb-429a-ab23-c83ef53f3f13` | `73194a1d-c0b5-41b9-9190-a4512925e192` | `70ef007e-b743-492d-9407-e35eeac03a40` | `70ef007e-…` (matches 4.4.2, coincidentally) |
| `GENERATE_SBOM` | n/a | `ca494ed3-b261-4205-a01f-603c95e4cae0` | `2d856d6d-53e8-488b-a17f-d486d2cac317` | `248471c2-…` (**a third value, matches neither tag**) |
| `RUST` | n/a | `3cc9b32c-47d3-4056-8953-d74e69fc0d6c` | `b6fdddce-bf66-41a5-bc5f-077f6fa4d2a1` | `b6fdddce-…` (matches 4.4.2) |
| `FIND_CPS_PACKAGES` | absent | absent | absent | absent |

Sources: [`experimental.rst`@v3.31.12](https://gitlab.kitware.com/cmake/cmake/-/raw/v3.31.12/Help/dev/experimental.rst), [@v4.3.4](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.3.4/Help/dev/experimental.rst), [@v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/dev/experimental.rst); `master` column from `cmake-topic-map/era-recheck-2026-09-26.md`'s own fetch of the same file on `master`.

Only 2 of 6 live gates kept an identical UUID between v4.3.4 and v4.4.2. The
doc's own text warns *"the specific values will change over time"* — this
measurement shows that warning is not decorative: three gates rotate release
to release. Worse, the era-recheck's citation of `master` for "current"
values produced UUIDs for `CXX_IMPORT_STD` and `GENERATE_SBOM` that match
**neither released tag**, because `master` is ahead of both — it holds values
for the next, unreleased minor. Any rule or agent that copies a gate UUID
from `cmake.org`'s "latest" pages or a `master` fetch, rather than the
`Help/dev/experimental.rst` shipped inside the exact CMake binary in use,
risks pinning a value that activates nothing.

**Measured — what happens on a stale gate.** A scratch project
(`cmake --version` 4.4.2, `zig c++` as `CMAKE_CXX_COMPILER`) with
`set(CMAKE_EXPERIMENTAL_CXX_IMPORT_STD "451f2fe2-a8a2-47c3-bc32-94786d8fc91b")`
(the **v4.3.4** value, stale on 4.4.2) configures cleanly with **no warning,
no error**:

```
$ ocx package exec kitware/cmake:4.4 -- cmake -S src -B build-wrong -DCMAKE_CXX_COMPILER=.../zig-cxx-wrapper.sh
-- The CXX compiler identification is Clang 21.1.0
...
-- gate variable after project(): 451f2fe2-a8a2-47c3-bc32-94786d8fc91b
-- CXX_MODULE_STD initial value:
-- Configuring done (0.2s)
```

Configuring with the **correct** v4.4.2 value (`f35a9ac6-…`) produces
byte-identical output apart from the echoed variable — no distinguishing
"activated" message at this level either; the feature only becomes visible
once `CMAKE_CXX_MODULE_STD` is explicitly turned on and a source actually
does `import std;`. So a wrong gate UUID does not fail loudly by itself: the
only symptom is the feature silently not being available downstream. This
directly contradicts the code comment in the exemplar discussed in §8.

`CMAKE_EXPERIMENTAL_EXPORT_PACKAGE_INFO` (the pre-4.3 gate for
`install(PACKAGE_INFO)` itself) is present only at v3.31.12 and absent from
both v4.3.4 and v4.4.2 — consistent with retirement once
`install(PACKAGE_INFO)` went ungated at 4.3 (§5). `FIND_CPS_PACKAGES` never
appeared in any of the three fetched tags, and
`grep -rn FIND_CPS_PACKAGES Kitware__CMake/` over the current corpus
checkout is empty — consistent with the map's claim that it, too, is
retired, though this dive found no tagged doc that ever carried it under
that exact name to confirm the retirement date independently.

### 5. `versionadded` verification table (M-B-03)

Every cell below is a direct read of the `.. versionadded::` (or
`.. presets-versionadded::`) directive in the **v4.4.2** raw RST/module
source, not a restatement of the brief:

| Feature | `versionadded` | Source |
|---|---|---|
| `string(JSON ...)` | 3.19 | [`Help/command/string.rst:539`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/string.rst) |
| `PROJECT_IS_TOP_LEVEL` | 3.21 | [`Help/variable/PROJECT_IS_TOP_LEVEL.rst:4`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/PROJECT_IS_TOP_LEVEL.rst) |
| `target_sources(FILE_SET)` | 3.23 | [`Help/command/target_sources.rst:68`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/target_sources.rst) |
| `cmake_language(SET_DEPENDENCY_PROVIDER)` | 3.24 | [`Help/command/cmake_language.rst:229`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/cmake_language.rst) |
| `FetchContent_Declare(... FIND_PACKAGE_ARGS)` | 3.24 | [`Modules/FetchContent.cmake:174`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Modules/FetchContent.cmake) |
| `OVERRIDE_FIND_PACKAGE` | 3.24 | [`Modules/FetchContent.cmake:278`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Modules/FetchContent.cmake) |
| `CMAKE_COMPILE_WARNING_AS_ERROR` | 3.24 | [`Help/variable/CMAKE_COMPILE_WARNING_AS_ERROR.rst:4`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_COMPILE_WARNING_AS_ERROR.rst) |
| `block()` | 3.25 | [`Help/command/block.rst:4`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/block.rst) |
| `block(SCOPE_FOR DIAGNOSTICS)` (not the command itself) | 4.4 | same file, line 24 |
| `FetchContent_Declare(... SYSTEM)` | 3.25 | [`Modules/FetchContent.cmake:229`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Modules/FetchContent.cmake) |
| `target_sources(FILE_SET ... TYPE CXX_MODULES)` | 3.28 | [`Help/command/target_sources.rst:105`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/target_sources.rst) |
| `install(PACKAGE_INFO)` (ungated) | 4.3 | [`Help/command/install.rst:990`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/install.rst) |
| presets schema `6` | (maps to 3.25 per the topic map's already-grounded schema table) | [`Help/manual/cmake-presets.7.rst:133,145`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-presets.7.rst) |

All twelve match the brief's stated versions exactly — no drift found between
the brief's pre-existing knowledge and the v4.4.2 primary source.

### 6. Removed and added generators (M-B-11)

Fetched each `Help/generator/*.rst` page at v4.4.2:

| Generator | Status | Since |
|---|---|---|
| Visual Studio 6 | Removed | 3.6 |
| Visual Studio 9 2008 | Removed | 3.30 |
| **Visual Studio 10 2010** | Removed | **3.25** (the assumed floor itself) |
| Visual Studio 11 2012 | Removed | 3.28 |
| Visual Studio 12 2013 | Removed | 3.31 |
| FASTBuild | Added | 4.2 |
| Visual Studio 18 2026 | Added | 4.2 |

Sources: [`Visual Studio 6.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/generator/Visual%20Studio%206.rst), [`Visual Studio 9 2008.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/generator/Visual%20Studio%209%202008.rst), [`Visual Studio 10 2010.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/generator/Visual%20Studio%2010%202010.rst), [`Visual Studio 11 2012.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/generator/Visual%20Studio%2011%202012.rst), [`Visual Studio 12 2013.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/generator/Visual%20Studio%2012%202013.rst), [`FASTBuild.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/generator/FASTBuild.rst), [`Visual Studio 18 2026.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/generator/Visual%20Studio%2018%202026.rst).

Measured on the Linux test host (`ocx package exec kitware/cmake:4.4 -- cmake --help`):
FASTBuild is listed as an available (experimental, work-in-progress)
generator on 4.4.2; the 3.31.12 binary predates both 4.2-only generators, so
a preset or CI matrix naming either will fail to configure there — the
verification is `cmake --help` on the actually-pinned binary, not a version
comparison against a table, since generator availability is also
platform-gated.

VS 10 2010 being removed at exactly the assumed 3.25 floor means a rule set
at this floor never needs a fallback path for it — a project below 3.25 that
still names that generator is already relying on a removed-since-floor
feature and belongs to the "raise your floor or don't upgrade CMake" case,
not the "the rule set's fallback idiom" case.

### 7. No maintained semantic CMake linter exists (M-A-05)

- `cmake-format`/`cmake-lint` (cmakelang): PyPI JSON confirms the latest
  release is still **0.6.13**, uploaded **2020-08-19** — unchanged, refetched
  2026-09-26 (`https://pypi.org/pypi/cmake-format/json`).
- `gersemi`: PyPI/GitHub confirm **0.29.1** (2026-09-14) — actively
  maintained, but it is a **formatter** (reflows listfiles to a canonical
  style); it has no rule engine for semantic checks (unused variables,
  dead `if()` branches, wrong `target_link_libraries` scope, etc.).
- `marzer/check-cmake`: the one candidate this search surfaced that wasn't
  already in the topic map. GitHub API: `pushed_at: 2025-08-07`, `archived:
  false`, 7 stargazers, Python. Its own README describes it as "a simple
  linter for CMake" that walks a project tree and applies a small built-in
  rule set — no evidence of parsing CMake expressions, evaluating variables,
  or tracking scope; it reads as a line/pattern checker in the same class as
  `cmake-lint`, and it has been silent for over a year as of this date.
- No other actively-developed project surfaced in two rounds of web search
  (`"semantic CMake linter 2026"`, `"cmake" linter tool 2026 github active
  maintained`) claiming AST-level or dataflow analysis of CMake listfiles.

**Verdict:** unchanged from the topic map's provisional call — no maintained
semantic linter exists. The lint role for a 2026 rule set is CMake's own
categorized configure diagnostics (`cmake-diagnostics(7)`, owned by the
CMK-CORE index) plus the named `rg`/`grep` checks this program's rows
specify. A rule may say "gersemi formats this" or "the configure gate
flags this category"; no rule may say "the linter catches this" without
naming which grep it means.

### 8. Corpus re-scan: nothing moved (M-B-10)

Re-ran the wave-1 `shape-versionfloor.sh` logic against the exemplar corpus
refetched at `/home/mherwig/.cache/research-lang/exemplars/cmake` (2026-09-26
checkouts; SHAs captured in `versionfloor-2026-09-26.tsv`, scratch copy at
`.agents/research/cmake-versions-and-gate/scratch/versionfloor-and-gate/`).
Comparing the `repo` + raw `cmake_minimum_required` line against the
2026-09-05 baseline (`cmake-audit/scratch/versionfloor.tsv`):

```
$ join -t $'\t' -j1 <(cut -f1,3 versionfloor.tsv | sort) <(cut -f1,3 versionfloor-2026-09-26.tsv | sort) \
    | awk -F'\t' '$2!=$3{print}'
(empty)
```

Empty output = pass = no root floor changed for any of the 43 repos with a
discoverable root `CMakeLists.txt`. No 4.5/master-only feature (presets
schema 13, `CMD_STRICT`, `CMD_NON_TARGET_DIRECTIVE`, `PRINT_TARGETS`) was
found cited as current anywhere reachable from this dive's own fetches;
`Help/release/index.rst`'s toctree tops out at 4.4 (already confirmed by the
era-recheck, not re-fetched here per the "reuse era-recheck facts"
instruction).

`CMAKE_EXPERIMENTAL_` usage outside `Kitware__CMake` across the full 46-repo
corpus:

```
$ grep -rIn --include='*.cmake' --include='CMakeLists.txt' -e 'CMAKE_EXPERIMENTAL_' <each-non-Kitware-repo-dir>
nlohmann__json/tests/module_cpp20/CMakeLists.txt:8:set(CMAKE_EXPERIMENTAL_CXX_IMPORT_STD "451f2fe2-a8a2-47c3-bc32-94786d8fc91b")
```
(empty for the other 44 repos = pass)

`nlohmann__json@f422b75:tests/module_cpp20/CMakeLists.txt:1-8` is the single
hit, dated 2026-09-25 in that repo's own history (one day before this dive).
It is a *correct* usage: `cmake_minimum_required(VERSION 3.30)`, the UUID is
the **v4.3.4** value, and a code comment states the value is
version-specific and matches "the CMake version pinned in the
`ci_module_cpp20` CI jobs (4.3.x)." §4 measured that the comment's claim of
"fails loudly otherwise" is not accurate for CMake itself, but the pinning
discipline (CI CMake version and gate UUID updated together) is exactly the
pattern to encode as a rule.

## Normative guidance candidates

1. **A rule that names a version-gated feature MUST spell
   `cmake_minimum_required(VERSION 3.25...<max>)`** with `<max>` equal to the
   highest CMake version the rule set is tested on (4.4 at the time of
   writing), not a bare `VERSION 3.25`. *Rationale:* the range's upper bound,
   not the floor, decides whether a post-floor policy defaults to `NEW`.
   *Verify:* `grep -n cmake_minimum_required CMakeLists.txt` — a bare
   floor with no `...` is a finding, not a pass. *Floor:* 3.25 (CMake 3.19
   also supports the two-dot range form; this is not itself a floor
   dependency).
2. **Never treat `apt install cmake` as sufficient on Ubuntu 22.04 (jammy)
   for any project at a 3.24+ floor.** *Rationale:* jammy ships 3.22.1,
   below every candidate floor this program considered; CI or dev setup on
   that LTS must install CMake another way. *Verify:* a reading heuristic —
   flag a `apt-get install cmake` (with no version pin or PPA) in a
   Dockerfile or CI script targeting `ubuntu:22.04`/`ubuntu-22.04` alongside
   a floor ≥3.24. *Floor:* the check applies to any floor above 3.22.
3. **Never copy a `CMAKE_EXPERIMENTAL_*` gate UUID from `cmake.org`'s
   "latest" docs or a `master`/`HEAD` fetch of `Help/dev/experimental.rst`.**
   Read it from `Help/dev/experimental.rst` in the source tree of the exact
   CMake release the project is pinned to (or run
   `cmake --help-manual dev` if using the `dev` guide is exposed on the
   pinned binary; otherwise fetch the matching **tag**, never `master`).
   *Rationale:* measured — `CXX_IMPORT_STD` and `GENERATE_SBOM` carry three
   different UUID generations across v3.31.12/v4.3.4/v4.4.2/`master`; only 2
   of 6 gates are even stable release-to-release. *Verify:*
   `rg -n CMAKE_EXPERIMENTAL_ -g CMakeLists.txt -g '*.cmake'`, then diff each
   literal UUID against the release-tagged `experimental.rst`, not `master`.
   *Floor:* applies at any floor that uses an experimental feature (≥4.1 for
   the currently-live gates).
4. **A wrong or stale experimental-gate UUID is a silent no-op, not a
   configure error — never assume "it configured" means "the gate
   activated."** *Rationale:* measured on 4.4.2 — a stale UUID produces
   identical, warning-free output to a correct one; the only symptom is the
   downstream feature (property, command) staying unavailable. *Verify:* the
   project's own smoke test must exercise the *feature*, not just check
   configure's exit code (e.g., actually compile a TU using `import std;`
   when `CXX_IMPORT_STD` is gated on, not merely assert
   `CMAKE_CXX_MODULE_STD` was requested). *Floor:* 4.1+ (current live gates).
5. **A `find_package(Boost)` / `find_package(CUDA)` /
   `find_package(PythonInterp|PythonLibs)` / `find_package(CABLE)` /
   `find_package(GCCXML)` call at a floor at or above the module's removal
   version is dead unless the code also sets the matching policy to `OLD`.**
   *Rationale:* CMP0167/0146/0148/0191/0188 default to `NEW` once the
   project's range covers the introduction version; the module file still
   ships but is skipped. *Verify:*
   `rg -n -e 'find_package(Boost' -e 'find_package(CUDA' -e 'find_package(PythonInterp' -e 'find_package(PythonLibs' -e 'find_package(CABLE' -e 'find_package(GCCXML' -g CMakeLists.txt -g '*.cmake' .`
   — a hit not inside a version guard for the module's own removal version,
   or not paired with `cmake_policy(SET CMPxxxx OLD)`, is a finding; migrate
   to the named replacement instead of setting the policy `OLD`. *Floor:*
   CMP0146/0148 at 3.27, CMP0167 at 3.30, CMP0191/0188 at 4.1.
6. **`install(PACKAGE_INFO)` needs no experimental gate at a 4.3+ floor;
   `CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO` still does.** *Rationale:*
   `install(PACKAGE_INFO)` is `versionadded:: 4.3` with no gate in its own
   doc section; the separate `install(EXPORT)`-based CPS path stays behind
   `CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO`. *Verify:* a project calling
   `install(PACKAGE_INFO ...)` guarded only by
   `if(CMAKE_VERSION VERSION_GREATER_EQUAL 4.3)` and *also* setting
   `CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO` is over-guarding the wrong
   command — a naming-confusion finding. *Floor:* 4.3.
7. **A CI matrix or preset naming `FASTBuild` or `Visual Studio 18 2026`
   must not also claim to support the 3.31.x line.** *Rationale:* both
   generators are `versionadded:: 4.2`; a 3.31.12 (or older) binary does not
   recognize either name. *Verify:* `cmake --help` on the actually-pinned
   binary for that CI leg lists the generator; a table match against the
   version string alone is insufficient because generator availability is
   also platform-gated (Windows-only for VS 18, and FASTBuild ships
   "experimental, work-in-progress" even at 4.4.2). *Floor:* 4.2.
8. **No shipped verification may cite a semantic "the linter catches this"
   claim; only `gersemi --check` (formatting), CMake's own diagnostic
   categories, or a named `rg`/`grep` may be cited as the check.**
   *Rationale:* no maintained semantic CMake linter exists as of 2026-09-26
   (§7); `cmake-lint` is frozen at 0.6.13 (2020), `check-cmake` is stale
   (last push 2025-08-07). *Verify:* a reading heuristic over the rule
   text itself — grep the depth files for the literal string "linter" and
   confirm each hit names `gersemi` or a specific diagnostic category, never
   a bare "the linter". *Floor:* n/a (tooling-availability fact, not a
   version gate).
9. **A rule that states a `.rst`-fetched fact for the *current* CMake MUST
   name the exact tag it was fetched from, never `master`.** *Rationale:*
   `master`'s content for at least two experimental gates already diverges
   from the latest tagged release as of 2026-09-26 (§4); "current" from
   `master` is actually "next, unreleased." *Verify:* a reading heuristic —
   any citation of `.../raw/master/...` (or `HEAD`) inside a depth file for a
   version-dependent fact is itself a finding; it must be
   `.../raw/v<X.Y.Z>/...` naming a real tag. *Floor:* n/a (authoring
   hygiene, applies at every floor).
10. **A dependency-provider (`cmake_language(SET_DEPENDENCY_PROVIDER)`)
    based rule may not apply below a 3.24 floor**, and a `block()`,
    `return(PROPAGATE)`, or FetchContent `SYSTEM`-keyword based rule may not
    apply below 3.25 — these are hard command/keyword floors, not policy
    defaults, so there is no `OLD`/`NEW` fallback; a project below the
    version simply cannot use the command. *Verify:* `cmake --help-command
    block` (or the matching command) on the project's actual floor binary
    returns "unknown command" below the version; the fallback is the older
    idiom (`PARENT_SCOPE`, a manual `find_package`-first check, etc.), never
    "raise the floor." *Floor:* 3.24 (providers), 3.25 (block/PROPAGATE/
    FetchContent SYSTEM).

## Exemplar evidence

- **`nlohmann__json@f422b75:tests/module_cpp20/CMakeLists.txt:1-8`** —
  satisfies rule 3's spirit (pins the UUID to the CI's actual CMake line,
  documents why) but its own comment overclaims CMake's failure behavior;
  see rule 4. This is the corpus's only `CMAKE_EXPERIMENTAL_` use outside
  `Kitware/CMake` (§8).
- **`apache__arrow@3ad410b:cpp/src/arrow/gpu/CMakeLists.txt:33-44`** —
  satisfies rule 5 correctly: `find_package(CUDA REQUIRED)` is inside
  `if(CMAKE_VERSION VERSION_LESS 3.17)`, with the `else()` branch using
  `find_package(CUDAToolkit REQUIRED)` and a comment explaining exactly why
  (`# find_package(CUDA) is deprecated, and for newer CUDA, it doesn't
  recognize that the CUDA driver library is in the "stubs" dir`). Not a
  violation — the removed-module call is dead below any floor this program
  considers, correctly gated.
- **`conan-io__cmake-conan@b159384:tests/resources/find_module/builtin_module/CMakeLists.txt:10,12`**
  and **`conan-io__conan-center-index@07389b8f:recipes/opentdf-client/all/conan_cmake_project_include.cmake:1`,
  `recipes/boost/all/test_package/CMakeLists.txt:6,12`** — violate rule 5's
  letter (`find_package(Boost ...)` with no `CONFIG` and no version guard),
  but all three are test fixtures / recipe test packages exercising Conan's
  own Boost package, not production library code; a rule row citing them
  should scope the finding to "test fixture, not a production consumer."
  `find_ocx` has no equivalent — it names no Find module for a removed
  package.
- **`google__benchmark@ac13143:.github/workflows/build-and-test.yml:79`** —
  satisfies rule 7's pairing requirement: `generator: 'Visual Studio 18
  2026'` runs only on `os: windows-2025` **and** the job installs CMake via
  `lukka/get-cmake@latest` rather than trusting the runner image's bundled
  version — exactly the "pin CMake explicitly when naming a 4.2-only
  generator" discipline rule 7 asks for.
- No exemplar in the corpus cites `master`/`HEAD` GitLab URLs for any
  version fact (rule 9) — the only violation of that discipline found in
  this program's own materials is the wave-1 era-recheck's citation of
  `Help/dev/experimental.rst` on `master` (§4), which is exactly the trap
  rule 9 exists to catch. `find_ocx` makes no such citation.
- No exemplar (including `find_ocx`) references `cmake-lint`, `cmake-format`,
  or `check-cmake` in CI or pre-commit config — consistent with rule 8's
  premise that no rule in this program should expect one either.

## AI-agent angle

- **Hallucinated-stable experimental gate:** a model trained before mid-2026
  (or one that reads `cmake.org`'s docs for "the latest" instead of the
  pinned tag) will confidently emit a `CMAKE_EXPERIMENTAL_CXX_IMPORT_STD`
  UUID that was correct for some past minor and silently does nothing on
  the project's actual CMake. **Check:** after writing any
  `CMAKE_EXPERIMENTAL_*` line, `grep` the exact UUID against
  `Help/dev/experimental.rst` fetched at the *tag* matching
  `cmake --version` on the CI/dev binary in use — not `master`, not
  "latest" web docs.
- **CMake-4-era removal blindness:** a model trained on 3.x-era corpora
  will emit `find_package(Boost)` bare, `find_package(CUDA)`, or
  `find_package(PythonInterp)`/`find_package(PythonLibs)` as if they were
  still the default path, unaware CMP0167/0146/0148 flipped the default at
  3.27–3.30. **Check:** `rg -n -e 'find_package(Boost' -e 'find_package(CUDA' -e 'find_package(PythonInterp' -e 'find_package(PythonLibs'`
  against the project's stated floor; a hit at floor ≥ the removal version
  with no `CONFIG`/replacement module is the tell.
- **Treating a stable feature as experimental, or vice versa:** a model may
  wrap `install(PACKAGE_INFO)` in an unnecessary
  `CMAKE_EXPERIMENTAL_MAPPED_PACKAGE_INFO` guard (confusing it with the
  `install(EXPORT)`-based variant that *is* still gated), or conversely
  ship `CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO` un-gated, assuming CPS is
  fully stable everywhere. **Check:** grep for `CMAKE_EXPERIMENTAL_` beside
  `install(PACKAGE_INFO` in the same file — their co-occurrence is itself
  the finding (§6/rule 6).
- **Bare-floor range confusion:** a model may write
  `cmake_minimum_required(VERSION 3.25)` and believe every post-3.25 policy
  is now `NEW`, when in fact CMake sets policies `NEW` up to the *range's
  upper bound* if given, or up to the running CMake version if no upper
  bound — a bare single-version floor leaves the model's "this policy is
  handled" assumption unverified for anything the range doesn't cover.
  **Check:** rule 1's grep — a bare floor, no `...<max>`, on a rule set that
  also claims a specific post-floor policy's `NEW` behavior is a
  mismatch to flag.
- **VS-generator-version drift:** a model may hard-code
  `"Visual Studio 12 2013"` (a common tutorial-era example) into a preset or
  CI matrix, unaware it was removed at 3.31, or may reach for
  `"Visual Studio 18 2026"` while also claiming support for CMake ≤4.1.
  **Check:** rule 7's `cmake --help` comparison against the pinned binary
  for that leg.
- **Trusting `cmake-lint`/`cmake-format` as a live semantic tool:** a model
  may recommend "run `cmake-lint`" as if it were a maintained,
  actively-developed checker (the way `ruff` or `clippy` are for their
  languages). **Check:** `pip show cmake-format` (or a PyPI JSON fetch) —
  the version string frozen at `0.6.13` since 2020-08-19 is the tell; the
  correct recommendation is `gersemi --check` for formatting only.

## Contested / evolving

- **Whether `CMAKE_EXPERIMENTAL_*` UUID rotation should itself be called out
  as a stability signal or dismissed as noise.** This dive's measurement
  (§4) shows 4 of 6 gates rotated between two tagged minors within roughly
  two months; Kitware's own doc language treats this as intentional
  friction against depending on experimental features long-term. As of
  2026-09-26 the practical trend is toward *more* gates (RUST joined this
  cycle) rather than fewer, so the churn is not slowing.
- **Whether the assumed 3.25 floor should be reconsidered given Ubuntu
  22.04's apt package.** This dive's answer is no (§1) — jammy is already
  below any floor candidate in the 3.24–3.28 range the topic map
  considered, so no floor choice in that range accommodates its apt
  package, and the real fix (install CMake another way on that platform) is
  orthogonal to the floor decision. This could be re-opened if a future
  wave decides the rule set should also serve floors below 3.24, which
  would be a materially different scope than "the modern dependency and
  scoping toolkit" the map's conflict 1 already settled on.
- **Whether `install(PACKAGE_INFO)` adoption changes the Find-module
  removal calculus.** Not yet — 0 real production adopters were found in
  the corpus (per the map's conflict 5), so CPS does not yet offer an
  alternative resolution path for the five removed Find modules; the
  Config-file/first-class-language replacements in §3 remain the only
  practical fix as of 2026-09-26.
- **`FASTBuild`'s status.** Still marked "experimental, work-in-progress" in
  `cmake --help` output at 4.4.2, roughly 2.5 years after its 4.2
  introduction (versionadded 4.2; if 4.2 shipped on the cadence implied by
  this program's release-date data, that is on the order of a year, not
  2.5 — the label has not changed since introduction as of this
  measurement date, so trend is "still experimental," not "graduating
  soon").

## Sources

| URL / measurement | What it is | Date / era | Why worth reading |
|---|---|---|---|
| [cmake-policies.7.html](https://cmake.org/cmake/help/latest/manual/cmake-policies.7.html) | Published CMake policies manual (latest release) | fetched 2026-09-26 | Full grouped policy list 3.25→4.4 with one-line titles, used for §2's table |
| [`experimental.rst`@v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/dev/experimental.rst) | Raw RST, tagged release | tag dated ~2026-07-31 | Primary source for the 4.4.2 gate/UUID column |
| [`experimental.rst`@v4.3.4](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.3.4/Help/dev/experimental.rst) | Raw RST, tagged release | tag dated 2026-06-17 | Primary source for the 4.3.4 gate/UUID column |
| [`experimental.rst`@v3.31.12](https://gitlab.kitware.com/cmake/cmake/-/raw/v3.31.12/Help/dev/experimental.rst) | Raw RST, tagged release | tag on the 3.31 branch | Shows the pre-4.3 `EXPORT_PACKAGE_INFO` gate and an even earlier `CXX_IMPORT_STD` UUID |
| [GitLab tags API, `cmake/cmake`](https://gitlab.kitware.com/api/v4/projects/cmake%2Fcmake/repository/tags) | Full tag list with commit dates | queried 2026-09-26 | Confirms newest 4.4.x (v4.4.3, 2026-08-25) and 4.3.x (v4.3.5, 2026-09-04) independent of the era-recheck |
| Measured: `cmake --help-policies` on pinned 4.4.2 | Real-binary output | 2026-09-26 | Ground truth for every policy ID/title/version in §2 |
| Measured: `cmake --help` (generators) on pinned 4.4.2/3.31.12 | Real-binary output | 2026-09-26 | Confirms FASTBuild ships (experimental) on 4.4.2; establishes which generators exist per pinned binary |
| Measured: scratch configure with stale vs. correct `CMAKE_EXPERIMENTAL_CXX_IMPORT_STD` | Real-binary behavior, `/home/mherwig/.cache/cmake-measure-scratch/uuid-gate-test/` | 2026-09-26 | The silent-no-op finding in §4/rule 4 |
| Measured: version-floor re-scan of the 46-repo exemplar corpus | `versionfloor-2026-09-26.tsv` vs. wave-1 baseline | 2026-09-26 checkouts | Answers the brief's "report every root floor that moved" — none did |
| Measured: `CMAKE_EXPERIMENTAL_` grep across the corpus outside `Kitware/CMake` | corpus-wide search | 2026-09-26 | Finds the single live usage (`nlohmann/json`) discussed in §8 |
| [PyPI JSON, `cmake-format`](https://pypi.org/pypi/cmake-format/json) | Package release metadata | queried 2026-09-26 | Confirms 0.6.13 (2020-08-19) is still latest |
| [PyPI JSON, `gersemi`](https://pypi.org/pypi/gersemi/json) | Package release metadata | queried 2026-09-26 | Confirms 0.29.1 (2026-09-14) is current |
| [Homebrew formula API, `cmake`](https://formulae.brew.sh/api/formula/cmake.json) | Formula metadata | queried 2026-09-26 | Confirms Homebrew tracks upstream 4.4.3 |
| [packages.debian.org/bookworm/cmake](https://packages.debian.org/bookworm/cmake), [/trixie/cmake](https://packages.debian.org/trixie/cmake) | Debian package pages | fetched 2026-09-26 | Debian 12/13 exact package versions |
| [packages.ubuntu.com/jammy/cmake](https://packages.ubuntu.com/jammy/cmake), [/noble/cmake](https://packages.ubuntu.com/noble/cmake) | Ubuntu package pages | fetched 2026-09-26 | Surfaces the Ubuntu 22.04 below-floor finding |
| [pkgs.alpinelinux.org v3.22 cmake](https://pkgs.alpinelinux.org/package/v3.22/main/x86_64/cmake) | Alpine package page | fetched 2026-09-26 | Alpine 3.22 exact version |
| [repo.almalinux.org 9/10 AppStream package listings](https://repo.almalinux.org/almalinux/9/AppStream/x86_64/os/Packages/) | RPM repo directory listing | fetched 2026-09-26 | RHEL/AlmaLinux 9 and 10 exact rpm filenames/versions |
| [GH `runner-images` READMEs, ubuntu/windows/macos](https://raw.githubusercontent.com/actions/runner-images/main/images/ubuntu/Ubuntu2404-Readme.md) | Runner-image documentation | fetched 2026-09-26 (`main` branch, rolling) | CI-image CMake versions for §1's table |
| [GitHub API, `marzer/check-cmake`](https://api.github.com/repos/marzer/check-cmake) + its [README](https://raw.githubusercontent.com/marzer/check-cmake/main/README.md) | Repo metadata + docs | fetched 2026-09-26 | Confirms staleness and scope for the "no semantic linter" verdict |
| `cmake-topic-map/era-recheck-2026-09-26.md` | Internal three-week freshness recheck, reused per this dive's own instruction | 2026-09-26 | Source of the `master`-branch UUID column in §4's table, and of the already-settled CMake/Conan/vcpkg/CPM/gersemi/Hunter current-version facts this dive did not re-derive |
| `nlohmann__json@f422b75:tests/module_cpp20/CMakeLists.txt` | Exemplar corpus file | corpus checkout 2026-09-26 | The corpus's one live `CMAKE_EXPERIMENTAL_` usage (§8) |
| `apache__arrow@3ad410b:cpp/src/arrow/gpu/CMakeLists.txt` | Exemplar corpus file | corpus checkout 2026-09-26 | Correctly-gated removed-module usage (§3, exemplar evidence) |
| `google__benchmark@ac13143:.github/workflows/build-and-test.yml` | Exemplar corpus file | corpus checkout 2026-09-26 | Real adoption of a 4.2-only generator paired with an explicit CMake install (rule 7) |

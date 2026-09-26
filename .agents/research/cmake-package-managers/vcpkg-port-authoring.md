---
title: "Authoring a vcpkg port and an overlay for a CMake library"
topic: "cpp-packaging/vcpkg.md port-author rows (package-managers group, wave 3)"
agent: vcpkg-port-authoring
model: sonnet
kind: exemplar
date_researched: 2026-09-26
sources_count: 15
scope: >
  Adds the port-author and overlay-port rows (CMK-VCPKG-12..21) after the
  consumer rules already shipped in cmake-package-managers.md
  (CMK-VCPKG-01..11, held stable here). Covers writing and maintaining a
  portfile.cmake and its vcpkg.json/versions/ entries: source acquisition,
  the current vs deprecated CMake helpers, OPTIONS forwarding and the
  triplet-CRT interaction, linkage, unofficial-<port> configs, usage files,
  policy overrides, copyright, and versioning. Does not cover the consumer
  side (manifests, toolchain wiring, triplets, CI caching — already in
  CMK-VCPKG-01..11) or Conan (CMK-CONAN, untouched).
---

# Authoring a vcpkg port and an overlay for a CMake library

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Source acquisition and hashing](#1-source-acquisition-and-hashing)
   2. [Current vs deprecated build helpers](#2-current-vs-deprecated-build-helpers)
   3. [OPTIONS forwarding and the CRT-override hazard](#3-options-forwarding-and-the-crt-override-hazard)
   4. [Linkage, unofficial- configs and usage files](#4-linkage-unofficial--configs-and-usage-files)
   5. [Policy overrides](#5-policy-overrides)
   6. [Copyright handling](#6-copyright-handling)
   7. [Port-version bumps and the versions/ database](#7-port-version-bumps-and-the-versions-database)
   8. [VCPKG_PREFER_SYSTEM_LIBS and the empty-overlay-port recipe](#8-vcpkg_prefer_system_libs-and-the-empty-overlay-port-recipe)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- The registry is clean of deprecated helpers: **0 of 2,867** `portfile.cmake` files at `microsoft/vcpkg@c4ee5a52d7` (2026-09-26) use `vcpkg_configure_cmake`, `vcpkg_build_cmake`, `vcpkg_install_cmake`, `vcpkg_fixup_cmake_targets`, `vcpkg_extract_source_archive_ex` or `vcpkg_apply_patches`; **1,972** use `vcpkg_cmake_configure`, **1,957** `vcpkg_cmake_install`, **1,643** `vcpkg_cmake_config_fixup`.
- `SHA512` case is 99.4 % compliant, not 100 %: **17 of 2,728** portfiles that carry a `SHA512` parameter mix in upper-case hex (e.g. `rpclib`, `clue`, `icu`), against the maintainer guide's explicit lower-case rule.
- **Measured on CMake 4.4.2**: a port's `OPTIONS -DCMAKE_MSVC_RUNTIME_LIBRARY=…` (or a triplet's `VCPKG_CMAKE_CONFIGURE_OPTIONS`) silently overrides the triplet's CRT choice, because both are forwarded as command-line `-D` flags and CMake initializes command-line cache entries *before* running the toolchain file — so `scripts/toolchains/windows.cmake:3`'s non-`FORCE` `set(CMAKE_MSVC_RUNTIME_LIBRARY … CACHE STRING "")` becomes a silent no-op. Zero warning either way. This is a genuine port-author hazard and gets its own row (CMK-VCPKG-15).
- 0 of 40 sampled ports (and no corpus-wide search hit) sets `CMAKE_MSVC_RUNTIME_LIBRARY` or `CMAKE_POSITION_INDEPENDENT_CODE` in its own `OPTIONS` — the hazard is real but unexercised in the current registry.
- `unofficial-<port>` naming is uncontested and universal: **141** portfiles pass `PACKAGE_NAME unofficial-<port>` to `vcpkg_cmake_config_fixup`, and **0 of 75+** `unofficial-*-config(.cmake).in` template files use anything but lower-case (M-F-16 answered: yes, 40/40 widens to a clean corpus-wide 0 counter-examples).
- `vcpkg_check_linkage` appears in **552 of 2,867** portfiles (476 `ONLY_STATIC_LIBRARY`, 77 `ONLY_DYNAMIC_LIBRARY`, some ports branch both ways per platform).
- A `usage` file ships in **543 of 2,867** ports (19 %); vcpkg's own post-build check (`VCPKG_POLICY_SKIP_USAGE_INSTALL_CHECK`) exists specifically to catch a `usage` file present in the port tree but never installed.
- `vcpkg_install_copyright` is now the majority idiom (**1,847 of 2,867**, 64 %); **91** portfiles still hand-roll a `file(INSTALL … share/${PORT}/copyright)` path, which the maintainer guide calls "allowed but discouraged."
- `CMAKE_POLICY_VERSION_MINIMUM` is set in a portfile's own `OPTIONS` in only **2 of 2,867** cases (`libogg`, `libvorbis`, both `=3.5`, both listed in `MAYBE_UNUSED_VARIABLES`) — redundant with `scripts/ports.cmake:7`'s environment-variable default, which every port build already inherits. `CMAKE_POLICY_DEFAULT_CMP<N>` (a *different*, per-policy knob) is set in **20** portfiles, always for one named upstream compatibility issue (CMP0057, CMP0072, CMP0091, CMP0167, CMP0177, …), never as a blanket floor bypass.
- `scripts/ports.cmake:7` only exports `CMAKE_POLICY_VERSION_MINIMUM=3.5` into the environment when `CMAKE_VERSION VERSION_GREATER_EQUAL 4.0`, and vcpkg's own `vcpkg_cmake_configure` never passes `-Werror=dev`/`-Werror=author` to a port's inner configure — so the "3.5 clears only the CMake-4 hard error, not the 3.5–3.9 gate-error tier" nuance from `cmake-versions-and-gate.md` does not bite inside a port build; it matters only for consumer-side gates, not here.
- The exact empty-overlay-port recipe that replaces `VCPKG_PREFER_SYSTEM_LIBS` is two files: a `vcpkg.json` with the real port's `name` and a `version` that satisfies the graph, and a `portfile.cmake` containing exactly `set(VCPKG_POLICY_EMPTY_PACKAGE enabled)` — nothing else, when there is truly nothing to build. `VCPKG_POLICY_EMPTY_PACKAGE` "disables all post-build checks and prevents a port from being included in a `vcpkg export`'d package for some package types." vcpkg's own `scripts/test_ports/vcpkg-ci-*` directories use exactly this pattern (10+ occurrences at `c4ee5a52d7`, though there it stands in for a validation build, not a pure system-library redirect).
- `VCPKG_PREFER_SYSTEM_LIBS` is still present and still deprecated at 2026-09-26: `microsoft__vcpkg@c4ee5a52d7:scripts/buildsystems/vcpkg.cmake:54-57` defines it (default `OFF`) and immediately warns `"VCPKG_PREFER_SYSTEM_LIBS has been deprecated. Use empty overlay ports instead."` if set. No removal date has been announced (unlike `vcpkg-artifacts`, `CMK-VCPKG-10`).
- The `unofficial-<name>`/`unofficial::<name>::` naming convention (M-F-16) is not vcpkg-specific: it is a general answer to "how do you name a Config package for someone else's upstream so a later real upstream Config cannot collide," and belongs as a cross-reference in `cmake-consumable-library.md` (CMK-INST), with the vcpkg-specific trigger (`vcpkg_cmake_config_fixup(PACKAGE_NAME unofficial-<port>)`) staying here. See [Decisions](#decide-items).
- No port-authoring row needs "no vendored dependencies" as a grep — it is a reading heuristic straight from the maintainer guide, not a checkable pattern (a vendored copy looks like ordinary source, not like a keyword).

## Findings

Corpus: `microsoft__vcpkg@c4ee5a52d7` (`/home/mherwig/.cache/research-lang/exemplars/cmake/microsoft__vcpkg`), 2,865 port directories under `ports/`, 2,867 `portfile.cmake` files on disk (two ports carry more than one, or the count includes a duplicate path — the discrepancy is immaterial to every ratio below, which uses whichever denominator the `find`/`grep -rl` command actually returned). CMake measurements ran on **4.4.2** (`ocx package exec kitware/cmake:4.4`).

### Deterministic sample

40 ports, every 71st of the 2,865 directory names sorted lexicographically (`N = 2865 // 40 = 71`, sample indices `0, 71, 142, …, 2769`):

```sh
git -C /home/mherwig/.cache/research-lang/exemplars/cmake/microsoft__vcpkg \
  ls-tree --name-only HEAD:ports | sort > ports_sorted.txt
python3 -c "
lines=[l.strip() for l in open('ports_sorted.txt') if l.strip()]
N=len(lines)//40
print(N, [lines[i*N] for i in range(40)])
"
```
N = 71. Full list and the analysis script are in
[`scratch/vcpkg-port-authoring/`](vcpkg-port-authoring/) (`ports_sorted.txt`,
`analyze.py`, `sample_results.jsonl`).

| Port | SHA512 lc | Helpers | OPT -D | RUNTIME/PIC opt | check_linkage | unofficial- | usage | policy override | copyright | port-ver |
|---|---|---|---|---|---|---|---|---|---|---|
| 3fd | Y | – | – | – | Y | – | – | – | helper | 5 |
| arp1it-minecraft-server-status | Y | – | – | – | – | – | – | – | helper | 0 |
| azure-macro-utils-c | Y | CIF | Y | – | Y | – | – | – | manual | 1 |
| boost-assert | Y | – | – | – | – | – | – | – | – | 0 |
| boost-log | Y | – | – | – | – | – | – | – | – | 0 |
| boost-uninstall | – | – | – | – | – | – | – | – | – | 0 |
| cgicc | Y | CI | Y | – | – | – | – | – | helper | 2 |
| console-bridge | Y | CIF | Y | – | – | – | – | – | manual | 0 |
| cthash | Y | – | – | – | – | – | – | – | helper | 0 |
| directxsdk | Y | – | – | – | – | – | – | – | manual | 8 |
| elfio | Y | CIF | Y | – | – | – | – | – | manual | 1 |
| flashlight-sequence | Y | CIF | Y | – | – | – | – | – | helper | 0 |
| getdns | Y | CI | Y | – | – | – | – | – | manual | 0 |
| gul14 | Y | – | Y | – | – | – | – | – | helper | 0 |
| idyntree | Y | CIF | Y | – | – | – | Y | – | helper | 0 |
| json-rpc-cxx | Y | CIF | Y | – | – | Y | Y | – | helper | 0 |
| kf6-solid | Y | CIF | Y | – | – | – | – | – | helper | 0 |
| libbacktrace | Y | – | – | – | – | Y | – | – | helper | 2 |
| libgd | Y | CI | Y | – | – | – | Y | – | manual | 3 |
| libmt32emu | Y | CIF | Y | – | – | – | – | – | manual | 0 |
| libsercomm | Y | CIF | – | – | – | – | – | – | manual | 1 |
| libvpl | Y | CIF | Y | – | – | – | – | – | helper | 1 |
| lmdb | Y | CIF | Y | – | – | Y | – | – | helper | 0 |
| matplotlib-cpp | Y | – | – | – | – | – | – | – | manual | 2 |
| mpdecimal | Y | – | – | – | – | – | Y | – | helper | 0 |
| neko-threadpool | Y | CIF | Y | – | – | – | Y | – | helper | 0 |
| ois | Y | CI | – | – | – | – | – | – | manual | 0 |
| osgearth | Y | CIF | Y | – | – | – | – | – | helper | 0 |
| plutovg | Y | CIF | Y | – | – | – | – | – | helper | 0 |
| qe6502 | Y | CIF | Y | – | – | – | – | – | helper | 0 |
| qtgraphs | – | – | – | – | – | – | – | – | – | 0 |
| readerwriterqueue | Y | CIF | – | – | – | – | – | – | manual | 0 |
| ryml | Y | CIF | Y | – | Y | – | – | – | helper | 0 |
| signalsmith-dsp | Y | – | – | – | – | – | – | – | helper | 0 |
| speexdsp | Y | CI | Y | – | – | – | – | – | manual | 1 |
| suitesparse-cxsparse | Y | CIF | Y | – | – | – | – | – | helper | 4 |
| tinyfiledialogs | Y | CIF | – | – | Y | – | – | – | manual | 0 |
| unimail-cpp-sdk | Y | CIF | Y | – | – | – | – | – | helper | 0 |
| vlfeat | Y | CIF | Y | – | – | – | – | – | helper | 5 |
| wpilib | Y | CIF | Y | – | – | – | – | – | helper | 2 |

`Helpers` = which of `vcpkg_cmake_configure`(C)/`vcpkg_cmake_install`(I)/`vcpkg_cmake_config_fixup`(F) the portfile calls; "–" means the port has no CMake build at all (13 of 40: header-only copy via `vcpkg_from_github` + `file(INSTALL)`, or a non-CMake buildsystem). `boost-uninstall` and `qtgraphs` have no `vcpkg_from_github`/`SHA512` at all (`boost-uninstall` removes files installed by other boost- ports; `qtgraphs` builds from a Qt submodule source layout fetched by a sibling port).

Verify (empty = pass; every command below names a directory operand and quotes its glob):
```sh
grep -rl --include='portfile.cmake' -e vcpkg_configure_cmake -e vcpkg_build_cmake \
  -e vcpkg_install_cmake -e vcpkg_fixup_cmake_targets \
  -e vcpkg_extract_source_archive_ex -e vcpkg_apply_patches \
  /home/mherwig/.cache/research-lang/exemplars/cmake/microsoft__vcpkg/ports
```

### 1. Source acquisition and hashing

The maintainer guide is explicit and version-independent: "we require hexadecimal strings to be lowercased for consistency … The `SHA512` parameter in vcpkg helper functions" ([maintainer-guide.md](https://raw.githubusercontent.com/MicrosoftDocs/vcpkg-docs/main/vcpkg/contributing/maintainer-guide.md)). Measured corpus-wide:

```sh
grep -rl --include='portfile.cmake' -e 'SHA512' \
  /home/mherwig/.cache/research-lang/exemplars/cmake/microsoft__vcpkg/ports | wc -l
# 2728
grep -rlP --include='portfile.cmake' -e 'SHA512\s+[0-9a-fA-F]*[A-F][0-9a-fA-F]*' \
  /home/mherwig/.cache/research-lang/exemplars/cmake/microsoft__vcpkg/ports | wc -l
# 17
```
17 files carry a genuine mixed- or upper-case hash — confirmed by inspection, not a regex false-positive:
`microsoft__vcpkg@c4ee5a52d7:ports/rpclib/portfile.cmake:7` (`SHA512 9C65AE5D…`), `ports/icu/portfile.cmake:5`, `ports/clue/portfile.cmake:5`, and 14 more (`microsoft-windows-devices-midi2`, `tl-optional`, `yas`, `nmslib`, `indicators`, `blpapi`, `greatest`, `sparsehash`, `distorm`, `snap7`, `edlib`, `easyhook`, `minisat-master-keying`, `sushant-wayal-stringhash`). This is a genuine, low-rate (0.62 %) violation, not a hypothetical.

`vcpkg_from_github` remains the dominant acquisition helper (2,320 of 2,867 portfiles); `vcpkg_from_git` is rare (13).

### 2. Current vs deprecated build helpers

Corpus-wide, over **all** 2,867 portfiles, not the sample:

```sh
for h in vcpkg_configure_cmake vcpkg_build_cmake vcpkg_install_cmake \
         vcpkg_fixup_cmake_targets vcpkg_extract_source_archive_ex vcpkg_apply_patches; do
  grep -rl --include='portfile.cmake' -e "$h" \
    /home/mherwig/.cache/research-lang/exemplars/cmake/microsoft__vcpkg/ports | wc -l
done
# 0 0 0 0 0 0
```
All six deprecated helpers are extinct in the current registry. This is stronger than a "prefer current" guideline — it is now a pure violator check, because the registry itself already enforces it (CCI's own CI likely lints new PRs for this; vcpkg's contribution flow gates on it). The maintainer guide's replacement table names the parameter-level migrations, not just the function renames: `vcpkg_extract_source_archive_ex()` → `vcpkg_extract_source_archive()` with an `ARCHIVE` parameter, and `vcpkg_apply_patches()` folds into the `PATCHES` argument of the extraction helper (`vcpkg_from_github(… PATCHES …)`) rather than a separate call.

### 3. OPTIONS forwarding and the CRT-override hazard

`vcpkg_cmake_configure`'s reference page ([learn.microsoft.com](https://learn.microsoft.com/en-us/vcpkg/maintainers/functions/vcpkg_cmake_configure)) documents its implicit options (`CMAKE_BUILD_TYPE`, `BUILD_SHARED_LIBS`, `CMAKE_TOOLCHAIN_FILE`, `FETCHCONTENT_FULLY_DISCONNECTED` since 2022-10-30, …) and states: "This command also passes all options in `VCPKG_CMAKE_CONFIGURE_OPTIONS` and the configuration-specific options from `VCPKG_CMAKE_CONFIGURE_OPTIONS_RELEASE` or `VCPKG_CMAKE_CONFIGURE_OPTIONS_DEBUG`." Reading the source confirms both a port's own `OPTIONS` and the triplet's `VCPKG_CMAKE_CONFIGURE_OPTIONS` end up in the same list, appended to the literal `cmake` invocation:

`microsoft__vcpkg@c4ee5a52d7:ports/vcpkg-cmake/vcpkg_cmake_configure.cmake:218,230-232,239-245`:
```cmake
vcpkg_list(PREPEND arg_OPTIONS "-DFETCHCONTENT_FULLY_DISCONNECTED=ON")            # :218
if(DEFINED VCPKG_CMAKE_CONFIGURE_OPTIONS)                                        # :230-232
    vcpkg_list(APPEND arg_OPTIONS ${VCPKG_CMAKE_CONFIGURE_OPTIONS})
endif()
vcpkg_list(SET rel_command "${CMAKE_COMMAND}" "${arg_SOURCE_PATH}" -G "${generator}" # :239-245
    "-DCMAKE_INSTALL_PREFIX=${CURRENT_PACKAGES_DIR}"
    ${arg_OPTIONS} ${arg_OPTIONS_RELEASE})
```
and the triplet's own chainload toolchain sets the CRT variable without `FORCE`,
`microsoft__vcpkg@c4ee5a52d7:scripts/toolchains/windows.cmake:3`:
```cmake
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>$<$<STREQUAL:${VCPKG_CRT_LINKAGE},dynamic>:DLL>" CACHE STRING "")
```
CMake's cache-initialization order settles the question: every `-D` on the command line becomes a cache entry *before* `-DCMAKE_TOOLCHAIN_FILE=…` executes, and `set(… CACHE STRING "")` without `FORCE` only creates a cache entry if none exists — it never overwrites one. Measured directly (CMake 4.4.2, `ocx package exec kitware/cmake:4.4`), reproducing the exact shape:
```sh
# toolchain.cmake: set(CMAKE_MSVC_RUNTIME_LIBRARY "TOOLCHAIN_VALUE" CACHE STRING "")
cmake -S proj -B build_cli   -DCMAKE_TOOLCHAIN_FILE=toolchain.cmake -DCMAKE_MSVC_RUNTIME_LIBRARY=CLI_VALUE
# -- CMAKE_MSVC_RUNTIME_LIBRARY=CLI_VALUE        (the -D silently wins)
cmake -S proj -B build_noopt -DCMAKE_TOOLCHAIN_FILE=toolchain.cmake
# -- CMAKE_MSVC_RUNTIME_LIBRARY=TOOLCHAIN_VALUE  (only the toolchain's set() applies)
```
No warning, no diagnostic, in either run. Reproducible with `sh scratch/vcpkg-port-authoring/README.md`'s two commands.

**Decision:** yes, this deserves a port-author row (CMK-VCPKG-15). A port whose `OPTIONS` or a triplet's `VCPKG_CMAKE_CONFIGURE_OPTIONS` writes `-DCMAKE_MSVC_RUNTIME_LIBRARY=…` silently defeats the triplet's own CRT selection — the exact LNK2038 failure mode `CMK-VCPKG-06` already describes for the *consumer* side, now shown to be equally reachable from the *port-build* side, through a completely different mechanism (command-line precedence over a non-`FORCE` cache write, not "the consumer's toolchain never sets it at all"). The corpus shows 0 real violators (0/40 sampled, 0 corpus-wide hits for either variable inside a port's own `OPTIONS`), so this is a "no exemplar violates it yet" MUST, not a cleanup task — the value is in catching an agent that "helpfully" adds a runtime override to fix an unrelated build error.

### 4. Linkage, unofficial- configs and usage files

`vcpkg_check_linkage` appears in 552 of 2,867 portfiles (476 `ONLY_STATIC_LIBRARY`, 77 `ONLY_DYNAMIC_LIBRARY`); the maintainer guide's own canonical example is exactly the Windows-DLL-support gate:
```cmake
if(VCPKG_TARGET_IS_WINDOWS)
    vcpkg_check_linkage(ONLY_STATIC_LIBRARY)
endif()
```
([maintainer-guide.md § "Do not add CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS"](https://raw.githubusercontent.com/MicrosoftDocs/vcpkg-docs/main/vcpkg/contributing/maintainer-guide.md)).

`unofficial-<port>` naming answers **M-F-16** directly: `vcpkg_cmake_config_fixup(PACKAGE_NAME unofficial-<port>)` appears in 141 portfiles, and every template file that ships the exported config is lower-case. `microsoft__vcpkg@c4ee5a52d7:ports/lmdb/portfile.cmake:27`:
```cmake
vcpkg_cmake_config_fixup(PACKAGE_NAME unofficial-lmdb)
```
`microsoft__vcpkg@c4ee5a52d7:ports/lmdb/cmake/unofficial-lmdb-config.cmakein`:
```cmake
include("${CMAKE_CURRENT_LIST_DIR}/unofficial-lmdb-targets.cmake")
```
```sh
find /home/mherwig/.cache/research-lang/exemplars/cmake/microsoft__vcpkg/ports \
  -regextype posix-extended -iregex '.*[Uu]nofficial.*' -name '*[A-Z]*' \
  | grep -E 'Unofficial|UNOFFICIAL'
```
returns nothing: 0 mixed-case counter-examples across the 75+ `unofficial-*` template files and 196 portfiles that reference the string at all. This closes M-F-16 as "clean, uncontested, and universal in this registry": there is no live counter-example to weigh against the rule.

Usage files: 543 of 2,867 ports install one (`share/<port>/usage`); vcpkg's own post-build check, `VCPKG_POLICY_SKIP_USAGE_INSTALL_CHECK`, exists precisely because a port can carry a `usage` file in its port directory and forget to actually install it — "This is triggered when a port contains a file named `usage` but no `${CURRENT_PACKAGES_DIR}/share/${PORT}/usage` exists" ([policies reference](https://learn.microsoft.com/en-us/vcpkg/reference/policies)).

### 5. Policy overrides

`scripts/ports.cmake` is the harness every portfile runs under. `microsoft__vcpkg@c4ee5a52d7:scripts/ports.cmake:1,6-8`:
```cmake
cmake_minimum_required(VERSION 3.21)                          # :1
if(CMAKE_VERSION VERSION_GREATER_EQUAL "4.0")                  # :6-8
    set(ENV{CMAKE_POLICY_VERSION_MINIMUM} 3.5)
endif()
```
This exports the *environment-variable* form, which every child `cmake` process the portfile shells out to (via `vcpkg_cmake_configure`) inherits automatically — no portfile needs to repeat it. Measured against the corpus: only 2 of 2,867 portfiles set `CMAKE_POLICY_VERSION_MINIMUM` themselves, both `libogg` and `libvorbis`, both re-asserting the same value (`3.5`) that the harness already provides, and both correctly listing it in `MAYBE_UNUSED_VARIABLES` (so vcpkg does not warn when the variable turns out to be unread):
`microsoft__vcpkg@c4ee5a52d7:ports/libogg/portfile.cmake:16`:
```cmake
-DCMAKE_POLICY_VERSION_MINIMUM=3.5 #https://gitlab.xiph.org/xiph/ogg/-/issues/2304
```
`CMAKE_POLICY_DEFAULT_CMP<N>` is a different, per-policy knob (not a floor-wide bypass) and is used correctly and sparingly — 20 portfiles, each pinning one named policy for one named upstream issue: `CMP0057` (`IN_LIST`, 3 ports), `CMP0072` (prefer GLVND, 3 ports), `CMP0091`/`CMP0167`/`CMP0177` (MSVC runtime / Boost / install-destination normalization, `openmvs`, `vtk`), `CMP0022`, `CMP0063`, `CMP0120` (`OLD`, needs `WriteCompilerDetectionHeader`), `CMP0127`, `CMP0148` (`OLD`), `CMP0175` (`OLD`), `CMP0012`. None sets a blanket "accept everything" default.

**The wave-2 3.10 nuance does not apply inside a port build.** `cmake-topic-map.md`'s correction 10 (also in `cmake-versions-and-gate.md`, `CMK-DEP-15`) established that `CMAKE_POLICY_VERSION_MINIMUM=3.5` clears CMake 4.0's hard floor-removal error but *not* the separate deprecation-to-error escalation that `-Werror=dev`/`-Werror=author` (the "configure gate") applies to policies below 3.10. That escalation only fires when the gate is actually requested. `vcpkg_cmake_configure.cmake` never appends `-Werror=dev`, `-Werror=author`, `--warn-uninitialized` or any diagnostics-category flag to a port's inner `cmake` invocation (confirmed: `grep -rn -e Werror -e warn-uninitialized ports/vcpkg-cmake/ scripts/` returns nothing but an unrelated Meson comment). So a port build sits entirely below the gate, and `3.5` is sufficient for every port whose upstream floor predates 3.5 — the 3.10 nuance is a *consumer-side* concern (`CMK-DEP-15`), not a port-author one, and this file does not add a row for it.

### 6. Copyright handling

The current idiom, `vcpkg_install_copyright(FILE_LIST "${SOURCE_PATH}/LICENSE")`, is now the majority: 1,847 of 2,867 portfiles (64.4 %). The older, still-permitted-but-discouraged idiom — a hand-written `file(INSTALL … DESTINATION share/${PORT})` targeting the `copyright` filename directly — remains in 91 portfiles. The maintainer guide is explicit that both are valid but the helper is preferred (no fixed sunset date found for the manual form).

### 7. Port-version bumps and the versions/ database

`versions/` holds one JSON history file per port plus `versions/baseline.json`. Cross-checked for `3fd` (port-version 5 in the sample table). `microsoft__vcpkg@c4ee5a52d7:versions/3-/3fd.json` (most recent entry):
```json
{"git-tree": "bc015ca2306c3d177cf011b7bb54d5181d62b0e9", "version": "2.6.3", "port-version": 5}
```
`microsoft__vcpkg@c4ee5a52d7:versions/baseline.json`, key `default.3fd`:
```json
{"baseline": "2.6.3", "port-version": 5}
```
Both agree with `ports/3fd/vcpkg.json`'s own `"port-version": 5`. `x-add-version` is the only sanctioned way to keep these three in sync (the maintainer guide: `vcpkg x-add-version <port>` or `--all`); hand-editing any one of the three without the other two is the failure mode this row exists to catch — but it is not mechanically greppable across a single portfile (it needs a three-way diff against `versions/`), so it stays a reading heuristic, not a MUST with a grep.

### 8. VCPKG_PREFER_SYSTEM_LIBS and the empty-overlay-port recipe

Confirmed still present and still deprecated at 2026-09-26, unchanged from the wave-2 finding. `microsoft__vcpkg@c4ee5a52d7:scripts/buildsystems/vcpkg.cmake:54-57`:
```cmake
option(VCPKG_PREFER_SYSTEM_LIBS "Appends the vcpkg paths to CMAKE_PREFIX_PATH, CMAKE_LIBRARY_PATH and CMAKE_FIND_ROOT_PATH so that vcpkg libraries/packages are found after toolchain/system libraries/packages." OFF)
if(VCPKG_PREFER_SYSTEM_LIBS)
    message(WARNING "VCPKG_PREFER_SYSTEM_LIBS has been deprecated. Use empty overlay ports instead.")
endif()
```
No removal has been announced for this variable (contrast `vcpkg-artifacts`, `CMK-VCPKG-10`, which has an announced-but-unexecuted removal date).

The exact recipe the deprecation notice points to (from the [C++ Team Blog](https://devblogs.microsoft.com/cppblog/using-system-package-manager-dependencies-with-vcpkg/) and confirmed against vcpkg's own use of the same mechanism in its test suite):

1. Create an overlay directory, e.g. `overlays/<port>/`.
2. `overlays/<port>/vcpkg.json`: the same `"name"` (and a `"version"` that satisfies the real dependency graph — the blog's example uses `"1.0.0"` for a port with no strict version requirers; match the real port's scheme if anything in the graph pins a version).
3. `overlays/<port>/portfile.cmake`, in the minimal case, exactly one line:
   ```cmake
   set(VCPKG_POLICY_EMPTY_PACKAGE enabled)
   ```
4. Register the overlay: `--overlay-ports=<path>/overlays`, the `VCPKG_OVERLAY_PORTS` environment variable, or `vcpkg-configuration.json`'s `"overlay-ports"` array.

`VCPKG_POLICY_EMPTY_PACKAGE`'s documented effect: "Disables all post-build checks and prevents a port from being included in a `vcpkg export`'d package for some package types" ([policies reference](https://learn.microsoft.com/en-us/vcpkg/reference/policies)). With no build step and no post-build checks, vcpkg records the port as "installed" (satisfying the manifest graph) while installing zero files, so `find_package` (or `pkg-config`) in the *consuming* CMake project falls through to the system-installed copy via the ordinary prefix-path search. vcpkg's own registry uses the identical one-line policy in `scripts/test_ports/vcpkg-ci-*` (10+ ports, e.g. `vcpkg-ci-glaze`, `vcpkg-ci-lua`), though there it wraps a small validation build rather than a bare redirect — the mechanism (the policy line) is the same; the surrounding portfile content is the only thing that differs by use case.

## Normative guidance candidates

Numbered to continue the shipped set. **`CMK-VCPKG-01..11` are unchanged** (see `cmake-package-managers.md`); this file adds 12–21. Evidence tags follow the shipped convention: **[N]** normative, **[M]** measured, **[C]** codified.

**CMK-VCPKG-12: Write every `SHA512` parameter (`vcpkg_from_github`, `vcpkg_from_git`, `vcpkg_download_distfile`, …) as lower-case hex.**
- Rationale [N]: maintainer guide, "we require hexadecimal strings to be lowercased for consistency … The `SHA512` parameter in vcpkg helper functions."
- Verify: `grep -rlP --include='portfile.cmake' -e 'SHA512\s+[0-9a-fA-F]*[A-F][0-9a-fA-F]*' /home/mherwig/.cache/research-lang/exemplars/cmake/microsoft__vcpkg/ports`, empty = pass. Measured [M]: 17/2,728 fail this today.
- Severity **MUST**. Binds RCP. Floor: current registry convention, no version gate.

**CMK-VCPKG-13: Use only `vcpkg_cmake_configure` / `vcpkg_cmake_install` / `vcpkg_cmake_config_fixup` (plus `vcpkg_cmake_build` where a project needs a build step split from install). Never `vcpkg_configure_cmake`, `vcpkg_build_cmake`, `vcpkg_install_cmake`, `vcpkg_fixup_cmake_targets`, `vcpkg_extract_source_archive_ex` or `vcpkg_apply_patches`.**
- Rationale [N/M]: the current helpers "replace" the deprecated ones (`vcpkg_cmake_configure` reference page, "Remarks"); the deprecated set has **0** users across 2,867 portfiles at `c4ee5a52d7`.
- Verify: `grep -rl --include='portfile.cmake' -e vcpkg_configure_cmake -e vcpkg_build_cmake -e vcpkg_install_cmake -e vcpkg_fixup_cmake_targets -e vcpkg_extract_source_archive_ex -e vcpkg_apply_patches /home/mherwig/.cache/research-lang/exemplars/cmake/microsoft__vcpkg/ports`, empty = pass. Add the two required dependencies (`vcpkg-cmake`, `vcpkg-cmake-config` — `"host": true` both) to `vcpkg.json` when adopting the current helpers on a legacy port.
- Severity **MUST**. Binds RCP. Floor: current; the deprecated forms are removed from vcpkg's own maintainer guidance, not merely discouraged.

**CMK-VCPKG-14: Name a Config package the port exports for someone else's library `unofficial-<port>`, with targets in the `unofficial::<port>::` namespace, both lower-case.**
- Rationale [N/M]: "any CMake configs that the port exports, which are not in the upstream library, should have `unofficial-` as a prefix … targets should be in the `unofficial::<port>::` namespace" (maintainer guide). Measured: 141/2,867 portfiles use `vcpkg_cmake_config_fixup(PACKAGE_NAME unofficial-<port>)`; 0 mixed-case counter-examples across 75+ template files.
- Verify: `grep -rn --include='portfile.cmake' -e 'PACKAGE_NAME' /home/mherwig/.cache/research-lang/exemplars/cmake/microsoft__vcpkg/ports` — a `PACKAGE_NAME` value that is not `unofficial-<port>` (lower-case) for a port whose upstream provides no CMake config of its own is the finding; a reading pass, since the exemption ("upstream ships its own Config") is not greppable.
- Severity **MUST** when exporting a config the upstream never shipped. Binds RCP. Floor: current, answers **M-F-16**.

**CMK-VCPKG-15: Never let a port's `OPTIONS` or a triplet's `VCPKG_CMAKE_CONFIGURE_OPTIONS`/`_RELEASE`/`_DEBUG` set `CMAKE_MSVC_RUNTIME_LIBRARY` or `CMAKE_POSITION_INDEPENDENT_CODE` to a value that could diverge from the triplet's own CRT/PIC choice — both reach the child `cmake` as a command-line `-D`, which silently wins over the non-`FORCE` `CACHE STRING` that `scripts/toolchains/windows.cmake` sets, with zero diagnostic either way.**
- Rationale [M]: measured on CMake 4.4.2 (`ocx package exec kitware/cmake:4.4`): a `-DCMAKE_MSVC_RUNTIME_LIBRARY=CLI_VALUE` beats a toolchain's `set(… CACHE STRING "")` unconditionally and silently; `vcpkg_cmake_configure.cmake:230-245` folds `VCPKG_CMAKE_CONFIGURE_OPTIONS` and a port's own `OPTIONS` into the identical `-D`-flag list passed to the same `cmake` invocation.
- Verify: `grep -rn --include='portfile.cmake' -e CMAKE_MSVC_RUNTIME_LIBRARY -e CMAKE_POSITION_INDEPENDENT_CODE /home/mherwig/.cache/research-lang/exemplars/cmake/microsoft__vcpkg/ports` inside an `OPTIONS`/`OPTIONS_RELEASE`/`OPTIONS_DEBUG` block, and separately grep any custom triplet's `.cmake` file for `VCPKG_CMAKE_CONFIGURE_OPTIONS.*CMAKE_MSVC_RUNTIME_LIBRARY`. Empty on both = pass. Corpus: 0/2,867 hits today — the row exists for the mismatch it would silently cause, not a cleanup.
- Severity **MUST**. Binds RCP. Floor: CMake 3.15 (`CMP0091`, same floor as CMK-VCPKG-06); vcpkg-tool 2026-09-26 for the exact forwarding line numbers cited.

**CMK-VCPKG-16: A port that supports only one linkage on a platform calls `vcpkg_check_linkage(ONLY_STATIC_LIBRARY)` or `(ONLY_DYNAMIC_LIBRARY)`, guarded by the relevant `VCPKG_TARGET_IS_*`, instead of documenting the limitation only in prose.**
- Rationale [N]: maintainer guide's own canonical example is exactly this pattern, in the section warning against `CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS`.
- Verify: a reading heuristic paired with `grep -rl --include='portfile.cmake' -e vcpkg_check_linkage /home/mherwig/.cache/research-lang/exemplars/cmake/microsoft__vcpkg/ports` (552/2,867 already do); a port whose upstream is known single-linkage (no `.def` file, no `__declspec` export macros) and lacks the call is the finding.
- Severity **SHOULD**. Binds RCP. Floor: current.

**CMK-VCPKG-17: Ship a `usage` file (installed to `share/<port>/usage`) whenever consuming the port needs non-obvious information — an `unofficial-<port>` config name, non-default `COMPONENTS`, a manual target name, or a runtime asset path.**
- Rationale [N]: `VCPKG_POLICY_SKIP_USAGE_INSTALL_CHECK` exists specifically to catch a `usage` file present in the port tree but never installed to `share/${PORT}/usage` — evidence that vcpkg treats "wrote one but forgot to install it" as a real, recurring mistake.
- Verify: `find ports/<port> -maxdepth 1 -name usage` (present in the port source) paired with a check that the portfile actually installs it (`grep -n --include='portfile.cmake' -e '/usage' ports/<port>/portfile.cmake`, or trust `vcpkg_install_copyright`/default install-tree behavior only where it actually copies `usage`). Corpus: 543/2,867 (19 %) ship one.
- Severity **SHOULD**. Binds RCP. Floor: current.

**CMK-VCPKG-18: Install copyright/license text with `vcpkg_install_copyright(FILE_LIST …)`, not a hand-written `file(INSTALL … share/${PORT}/copyright)`.**
- Rationale [N/M]: the maintainer guide recommends the helper; the manual form "remains allowed but discouraged." Measured: 1,847/2,867 (64 %) already use the helper; 91 still hand-roll the path.
- Verify: `grep -rl --include='portfile.cmake' -e 'share/\${PORT}/copyright' -e 'share/${PORT}/copyright' /home/mherwig/.cache/research-lang/exemplars/cmake/microsoft__vcpkg/ports | xargs -r grep -L -e vcpkg_install_copyright`, non-empty = finding (a hand-rolled copyright path with no helper call nearby).
- Severity **SHOULD**. Binds RCP. Floor: current; `vcpkg_install_copyright` predates this dive's SHA by years, so no gate.

**CMK-VCPKG-19: Do not set `CMAKE_POLICY_VERSION_MINIMUM` in a port's own `OPTIONS` unless it needs a value different from the registry-wide default (`3.5`, from `scripts/ports.cmake:7`'s environment export); if kept for an unrelated reason (documentation, explicitness), pair it with `MAYBE_UNUSED_VARIABLES` so vcpkg does not warn that the option went unread.**
- Rationale [M]: `scripts/ports.cmake:7` already exports `ENV{CMAKE_POLICY_VERSION_MINIMUM}=3.5` for every port build once the vcpkg-invoking CMake is 4.0+, and that environment variable is inherited by the child `cmake` process `vcpkg_cmake_configure` shells out to. The 2 corpus examples that set it explicitly (`libogg`, `libvorbis`) both re-assert the same value and both correctly list it in `MAYBE_UNUSED_VARIABLES`.
- Verify: `grep -rn --include='portfile.cmake' -e CMAKE_POLICY_VERSION_MINIMUM /home/mherwig/.cache/research-lang/exemplars/cmake/microsoft__vcpkg/ports`; for each hit, confirm the value differs from `3.5` (a legitimate override) or the same value is also listed in `MAYBE_UNUSED_VARIABLES` (a documented redundant one). Neither condition met is the finding — a silent, undocumented restatement.
- Severity **SHOULD**. Binds RCP. Floor: relevant only when the vcpkg-invoking CMake is 4.0+; cites `CMK-DEP-15` for the general (consumer-side) injection-scope rule, which this does not duplicate — the 3.5-vs-3.10 gate nuance never applies inside a port build (§5, above), so this row's rationale is deliberately narrower than `CMK-DEP-15`'s.

**CMK-VCPKG-20: Use `CMAKE_POLICY_DEFAULT_CMP<N>` only to pin one named policy for one named, commented upstream-compatibility reason — never as a blanket default.**
- Rationale [M]: all 20 corpus uses (`CMP0057`, `CMP0072`, `CMP0091`, `CMP0167`, `CMP0177`, `CMP0022`, `CMP0063`, `CMP0120`, `CMP0127`, `CMP0148`, `CMP0175`, `CMP0012`) name one policy and, in most cases, a one-line comment explaining why (`# Prefer GLVND`, `# MSVC runtime, needed for CUDA`, `# vxl needs WriteCompilerDetectionHeader`).
- Verify: `grep -rn --include='portfile.cmake' -E -e 'CMAKE_POLICY_DEFAULT_CMP[0-9]+' /home/mherwig/.cache/research-lang/exemplars/cmake/microsoft__vcpkg/ports` — a reading pass per hit for a comment naming the reason; a bare `-DCMAKE_POLICY_DEFAULT_CMP<N>=OLD` with no comment is a SHOULD-fix, not a MUST-block.
- Severity **SHOULD**. Binds RCP. Floor: current.

**CMK-VCPKG-21: Do not vendor a dependency's source inside a port. Split it into its own port and depend on it, even when the upstream project embeds a copy.**
- Rationale [N]: maintainer guide, "Do not use vendored dependencies … All dependencies should be split out and packaged separately," citing update difficulty, symbol conflicts between two vendored copies at different versions, licensing opacity and duplicated maintenance.
- Verify: reading heuristic only — a vendored copy has no distinguishing keyword. Read the port's `portfile.cmake` for `add_subdirectory` into a bundled third-party directory, or check the upstream's own `CMakeLists.txt` for an embedded `extern/`/`third_party/` tree the portfile does not devendor with a patch.
- Severity **SHOULD**. Binds RCP. Floor: current.

**Recipe (not a numbered rule — this is what CMK-VCPKG-10 points readers to): the empty-overlay-port replacement for `VCPKG_PREFER_SYSTEM_LIBS`.**
`overlays/<port>/vcpkg.json` — match the real port's name/version scheme:
```json
{ "name": "example-port", "version": "1.0.0" }
```
```cmake
# overlays/<port>/portfile.cmake — the whole file, when there is nothing to build
set(VCPKG_POLICY_EMPTY_PACKAGE enabled)
```
Registered with `--overlay-ports=<dir>`, `VCPKG_OVERLAY_PORTS`, or `vcpkg-configuration.json`'s `"overlay-ports"` array (`CMK-VCPKG-02`'s "top-level only" rule for `overrides` does **not** apply to `overlay-ports`, which any manifest — including a dependency's — may declare per the overlay-ports doc's resolution order). `VCPKG_POLICY_EMPTY_PACKAGE` "disables all post-build checks and prevents a port from being included in a `vcpkg export`'d package for some package types" ([policies reference](https://learn.microsoft.com/en-us/vcpkg/reference/policies)).

### Decide items

- **Port-author rows**: CMK-VCPKG-12..21 above, each with its own grep or named reading heuristic.
- **The empty-overlay-port recipe CMK-VCPKG-10 points at**: the two-file, `VCPKG_POLICY_EMPTY_PACKAGE`-only recipe given above and under [§8](#8-vcpkg_prefer_system_libs-and-the-empty-overlay-port-recipe).
- **Does `unofficial-<name>` belong in `cmake-consumable-library.md` (CMK-INST) instead, since it generalises beyond vcpkg?** Yes, but as an addition, not a move. The naming principle — "a Config package for someone else's upstream must not risk colliding with a Config that upstream ships later" — is general and belongs beside `CMK-INST-06`/`-07` (namespace-present, namespace-equals-package-name) as a one-line cross-reference: *"When packaging a library that ships no Config of its own, name the exported package and namespace `unofficial-<name>`/`unofficial::<name>::` (vcpkg's convention, `CMK-VCPKG-14`), never the bare name."* `cmake-consumable-library.md` is outside this dive's writable paths, so this file states the recommendation without applying it; `CMK-VCPKG-14` keeps the full text and the vcpkg-specific trigger (`vcpkg_cmake_config_fixup(PACKAGE_NAME …)`).

## Exemplar evidence

- **Satisfy CMK-VCPKG-12/13/14**: `microsoft__vcpkg@c4ee5a52d7:ports/lmdb/portfile.cmake:25-28` (current helpers, `unofficial-lmdb` config, lower-case `SHA512`), `ports/idyntree/portfile.cmake` (current helpers plus a `usage` file), `ports/json-rpc-cxx/portfile.cmake` (current helpers, `unofficial-` reference, `usage` file).
- **Satisfy CMK-VCPKG-16**: `ports/3fd/portfile.cmake`, `ports/ryml/portfile.cmake`, `ports/tinyfiledialogs/portfile.cmake` (all call `vcpkg_check_linkage`).
- **Satisfy CMK-VCPKG-18**: 1,847 of 2,867 portfiles, e.g. every sampled port marked "helper" in the sample table's `copyright` column.
- **Satisfy CMK-VCPKG-19's discipline**: `ports/libogg/portfile.cmake:16,21` and `ports/libvorbis/portfile.cmake:17,19` — both name the upstream issue in a comment and both pair the override with `MAYBE_UNUSED_VARIABLES`.
- **Satisfy CMK-VCPKG-20's discipline**: `ports/openmvs/portfile.cmake:56-58` (three named `CMAKE_POLICY_DEFAULT_CMP*`, each commented), `ports/vtk/portfile.cmake:321-322,332-333` (same pattern, paired with `MAYBE_UNUSED_VARIABLES`).
- **Satisfy the empty-overlay-port recipe (not CMK-VCPKG-10 itself, which binds the consumer)**: `microsoft__vcpkg@c4ee5a52d7:scripts/test_ports/vcpkg-ci-glaze/portfile.cmake:1`, `scripts/test_ports/vcpkg-ci-lua/portfile.cmake:1`, and 8 more `vcpkg-ci-*` ports all open with `set(VCPKG_POLICY_EMPTY_PACKAGE enabled)`.
- **Violate CMK-VCPKG-12**: `ports/rpclib/portfile.cmake:7`, `ports/icu/portfile.cmake:5`, `ports/clue/portfile.cmake:5`, and 14 more (listed in §1) — genuine mixed/upper-case `SHA512` values, 17 of 2,728 portfiles carrying the parameter.
- **Violate CMK-VCPKG-18**: `ports/console-bridge/portfile.cmake`, `ports/elfio/portfile.cmake`, `ports/libmt32emu/portfile.cmake` and 88 more (marked "manual" in the sample table) — hand-rolled copyright installation, still permitted but discouraged per the maintainer guide, not a hard defect.
- **No exemplar yet exercises CMK-VCPKG-15** (0/2,867 corpus hits) or **CMK-VCPKG-21** (not mechanically countable) — both are "no violator found, ship anyway" rows, same shape as `CMK-VCPKG-09`'s `x-block-origin` in the shipped consumer set.
- **find_ocx** (`/home/mherwig/dev/find_ocx`): no vcpkg surface at all — the file `Applied to find_ocx and the exemplars` in `cmake-package-managers.md` already establishes this for CMK-VCPKG generally; nothing here changes that.

## AI-agent angle

1. **Reaches for a deprecated helper from pre-2021 vcpkg docs or blog posts** (`vcpkg_configure_cmake`, `vcpkg_build_cmake`, `vcpkg_fixup_cmake_targets`) because training-era text and Stack Overflow answers still teach them. Check: `grep -rl --include='portfile.cmake' -e vcpkg_configure_cmake -e vcpkg_fixup_cmake_targets .` (run from the port or overlay root), empty = pass. The registry itself is now 0/2,867, so any hit is either new agent-authored code or an untouched decade-old port.
2. **"Fixes" a CRT-mismatch build failure by adding `-DCMAKE_MSVC_RUNTIME_LIBRARY=…` to a port's `OPTIONS`**, not realizing this silently overrides the triplet — the exact opposite of the intended fix, since it makes the port's binaries diverge from whatever the *consumer's* triplet expects, with zero diagnostic. Check: CMK-VCPKG-15's grep; also re-run the measurement in `scratch/vcpkg-port-authoring/` if in doubt.
3. **Writes a Config export named after the bare port** (`FooConfig.cmake`, namespace `Foo::`) for an upstream that ships none of its own, risking a collision if upstream ever adds a real one — a natural mistake for a model trained mostly on libraries that already have upstream Config packages. Check: CMK-VCPKG-14's reading pass; the fix is always `unofficial-<port>`/`unofficial::<port>::`.
4. **Recommends `VCPKG_PREFER_SYSTEM_LIBS`** as the way to prefer a system copy, because it is the older, more heavily indexed answer; the correct 2026 answer is the empty-overlay-port recipe. Check: `grep -rn -e VCPKG_PREFER_SYSTEM_LIBS .`, and read for whether the replacement recipe is offered instead (already `CMK-VCPKG-10`'s territory; this dive supplies the exact recipe that check was missing).
5. **Assumes vcpkg has a semantic linter** (a `vcpkg-lint` or similar) that would catch deprecated helpers automatically — there is none; the 0/2,867 result is a fact about the current registry's manual review discipline (and its own CI), not about tooling an agent can rely on running for it.
6. **Treats `CMAKE_POLICY_VERSION_MINIMUM=3.5` as something the port must set**, unaware that `scripts/ports.cmake:7` already exports it as an environment variable for every port build on CMake 4.0+ — leading to redundant, undocumented `-D` overrides that add noise without changing behavior. Check: CMK-VCPKG-19's grep plus the `MAYBE_UNUSED_VARIABLES` pairing check.
7. **Conflates Script Mode and Project Mode inside a portfile** — reaching for `CMAKE_CXX_COMPILER`, `CMAKE_EXECUTABLE_SUFFIX` or `CMAKE_SYSTEM_NAME` directly inside `portfile.cmake` itself (as opposed to inside the `OPTIONS` passed to the *upstream's* Project-Mode build), because portfiles look like ordinary CMake but run in Script Mode, which "does not have the concepts of 'Toolchain', 'Language' and 'Target'" (maintainer guide). Check: a reading heuristic — any of those variables referenced outside an `OPTIONS`/`vcpkg_cmake_configure` block inside `portfile.cmake` itself is almost certainly a mistake.

## Contested / evolving

- **The manual copyright-install idiom (91/2,867) is "discouraged," not banned**, and the maintainer guide gives no sunset date. Trending toward the helper (64 % adoption already), but this file ships CMK-VCPKG-18 as SHOULD, not MUST, because the maintainer guide itself declines to make it a hard rule as of 2026-09-26.
- **`VCPKG_PREFER_SYSTEM_LIBS` has no announced removal date**, unlike `vcpkg-artifacts` (`CMK-VCPKG-10`, announced-but-unexecuted since 2026-05-27). It may persist indefinitely as a soft-deprecated escape hatch, or it may pick up a removal date in a future release; re-check on every `vcpkg-tool` tag, same cadence as `CMK-VCPKG-10`.
- **`CMAKE_POLICY_DEFAULT_CMP<N>` usage (20 ports) is trending upward** as CMake's policy list grows (three of the twenty entries are `CMP0167`, `CMP0174`, `CMP0177` — all CMake 3.30–4.0-era policies), and each new CMake major release will likely add a few more named-policy pins to the registry. This is expected, healthy usage of the mechanism (one policy, one comment, one upstream reason) and not itself a trend to correct.
- **Whether `unofficial-<name>` deserves a first-class row in `cmake-consumable-library.md`** rather than only a cross-reference from here is an open call for whoever next edits that file — this dive recommends it (§ Decide items) but cannot apply it (out of scope).

## Sources

| Source | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [maintainer-guide.md (raw)](https://raw.githubusercontent.com/MicrosoftDocs/vcpkg-docs/main/vcpkg/contributing/maintainer-guide.md) | vcpkg's own port-authoring standard | live `main`, fetched 2026-09-26 | Primary, normative — SHA512 case, deprecated-helper table, unofficial- naming, vendoring, `CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS`, Script Mode |
| [vcpkg_cmake_configure reference](https://learn.microsoft.com/en-us/vcpkg/maintainers/functions/vcpkg_cmake_configure) | portfile function reference | `ms.date` 2024-01-10, fetched 2026-09-26 | Primary — implicit options list, `OPTIONS`/`VCPKG_CMAKE_CONFIGURE_OPTIONS` forwarding, `FETCHCONTENT_FULLY_DISCONNECTED` |
| [Overlay ports concept doc](https://learn.microsoft.com/en-us/vcpkg/concepts/overlay-ports) | overlay-port resolution order and CLI/manifest/env registration | `updated_at` 2026-08-05, fetched 2026-09-26 | Primary — registration mechanisms for the empty-overlay-port recipe |
| [Port Policies reference](https://learn.microsoft.com/en-us/vcpkg/reference/policies) | every `VCPKG_POLICY_*` name and effect | `ms.date` 2024-05-10, fetched 2026-09-26 | Primary — exact `VCPKG_POLICY_EMPTY_PACKAGE` and `VCPKG_POLICY_SKIP_USAGE_INSTALL_CHECK` wording |
| [vcpkg.json reference](https://learn.microsoft.com/en-us/vcpkg/reference/vcpkg-json) | manifest field reference | `updated_at` 2025-10-02, fetched 2026-09-26 | Primary — `port-version`, `overrides` scope, `configuration`/`overlay-ports` embedding |
| [Using system package manager dependencies with vcpkg (C++ Team Blog)](https://devblogs.microsoft.com/cppblog/using-system-package-manager-dependencies-with-vcpkg/) | the empty-overlay-port recipe's canonical write-up | dev blog, referenced from the overlay-ports doc, fetched 2026-09-26 | Primary for the exact recipe steps |
| Measurement: CRT-override precedence | `ocx package exec kitware/cmake:4.4 -- cmake …` on the toolchain/proj pair in `scratch/vcpkg-port-authoring/` | run 2026-09-26, CMake 4.4.2 | Primary/measured — settles the OPTIONS-vs-toolchain CRT question from source semantics, not inference |
| Corpus count: deprecated vs current helpers | `grep -rl --include='portfile.cmake' -e '<helper>' ports/ \| wc -l` over `microsoft__vcpkg@c4ee5a52d7` | 2026-09-26 | Primary/measured — 0/2,867 deprecated, 1,972/1,957/1,643 current |
| Corpus count: SHA512 case | `grep -rlP --include='portfile.cmake' -e 'SHA512\s+[0-9a-fA-F]*[A-F][0-9a-fA-F]*' ports/` | 2026-09-26 | Primary/measured — 17/2,728 violators, individually inspected |
| Corpus count: unofficial- naming | `grep -rl --include='portfile.cmake' -e 'unofficial-' ports/`; `find … -iregex '.*[Uu]nofficial.*' -name '*[A-Z]*'` | 2026-09-26 | Primary/measured — 196 references, 0 mixed-case counter-examples, answers M-F-16 |
| Corpus count: usage files, check_linkage, copyright, policy overrides | `find`/`grep -rl` over `ports/`, commands inline in §§3-6 | 2026-09-26 | Primary/measured |
| Corpus reading: `scripts/ports.cmake`, `scripts/toolchains/windows.cmake`, `ports/vcpkg-cmake/vcpkg_cmake_configure.cmake` | vcpkg's own harness and helper source | `microsoft__vcpkg@c4ee5a52d7`, 2026-09-26 | Primary — the policy-injection mechanism and the CRT-forwarding mechanism, read directly rather than inferred |
| Corpus reading: `scripts/test_ports/vcpkg-ci-*/portfile.cmake` | vcpkg's own use of `VCPKG_POLICY_EMPTY_PACKAGE` | `microsoft__vcpkg@c4ee5a52d7` | Exemplar evidence for the empty-package policy in real use |
| `cmake-package-managers.md` | the shipped CMK-VCPKG-01..11 consolidation this file extends | 2026-09-26, held stable | Held-stable baseline; CMK-VCPKG-06's MSVC-runtime finding and CMK-VCPKG-10's `VCPKG_PREFER_SYSTEM_LIBS`/vcpkg-artifacts distinction are the two facts this dive was told are already settled |
| `cmake-topic-map.md` (rows M-N-07, M-N-09, M-F-16; `cmake-versions-and-gate.md` correction 10 citation) | wave-3 commissioning brief and the map's own adjudication | 2026-09-26 | Defines exactly which questions this file must answer and the ID space it must not collide with |

## Revision log

- 2026-09-26: initial dive. Adds CMK-VCPKG-12..21 after the held-stable CMK-VCPKG-01..11. Answers M-N-07 (port-author rows), M-N-09 (`VCPKG_PREFER_SYSTEM_LIBS` still deprecated, not removed), M-F-16 (unofficial- naming, 0 counter-examples). Decides the wave-2 CRT-override surprise deserves a row (CMK-VCPKG-15, measured) and that `unofficial-<name>` generalizes into CMK-INST as a cross-reference, not a move.

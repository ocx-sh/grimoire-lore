---
title: Pinning, caching and offline builds across the dependency seam
topic: How fetched dependencies are pinned, cached and taken offline (FetchContent, CPM, Hunter, find_package)
agent: cmake-dependency-seam-pinning
model: sonnet
kind: exemplar
date_researched: 2026-09-26
sources_count: 19
scope: |
  Re-measures pin shape, offline switches and CONFIG/MODULE/version discipline
  for FetchContent_Declare, ExternalProject_Add, CPMAddPackage, HunterGate and
  find_package across the 46-repo exemplar corpus re-fetched 2026-09-26
  (new SHAs), outside Kitware/CMake/Tests. Does not cover dependency-provider
  resolution order (M-G-01/02, a separate `measure` dive), CPS import/export
  (owned by the `cmake-dependency-seam` CPS mini-wave), or the Bazel-side seam
  (owned by `bazel-quality/cpp.md`, BZL-CC).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [FetchContent_Declare pin shape: 33 GIT_REPOSITORY declares, 13 needed their variable read](#1-fetchcontent_declare-pin-shape)
   2. [URL-form declares: hash discipline splits cleanly by whether a versions file backs it](#2-url-form-declares)
   3. [The CMake docs already say what wave 1 wanted confirmed](#3-the-cmake-docs-already-say-what-wave-1-wanted-confirmed)
   4. [CPM.cmake: one wrapper, four policies, and practice that ignores its own security note](#4-cpmcmake)
   5. [Hunter / cpp-pm: one recognition row, a submodule that is genuinely pinned](#5-hunter--cpp-pm)
   6. [find_package: CONFIG/MODULE/version/range at the new SHAs](#6-find_package-config-module-version-range)
   7. [Going offline: FETCHCONTENT_* and CPM_* adoption](#7-going-offline)
   8. [Vendored directories and submodule branch= keys](#8-vendored-directories-and-submodule-branch-keys)
   9. [ExternalProject_Add: superbuild use outside Kitware's own tests](#9-externalproject_add)
   10. [Network-touch enumeration and its false-positive rate](#10-network-touch-enumeration)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- A full 40-hex `GIT_TAG` is a **MUST**, a semver/CalVer tag is **SHOULD**, a branch name (`main`/`master`/`develop`/`HEAD`) is a **MUST-fail**, and `URL` without `URL_HASH` is a **MUST-fail** — CMake 4.4.2's own `FetchContent.cmake` docstring already states the hash-over-branch preference verbatim, so this is codified, not just this program's opinion.
- Of 33 `GIT_REPOSITORY`+`GIT_TAG` `FetchContent_Declare` calls outside `Kitware__CMake/Tests` (2026-09-26 SHAs), 10 use a full hash, 6 a semver tag, 4 a bare floating branch/`HEAD`, and 13 needed the `GIT_TAG` variable's definition read to classify — of those 13, 6 are Kitware's own doc-illustration placeholders (fictitious 32-hex "hashes", not real refs), 3 resolve to a centrally-defined semver string (`protocolbuffers/protobuf`), 1 resolves to a real full-hash sibling (`apache/arrow`), 1 resolves to a real floating-branch default (`curl/curl`, `option(FROM_GIT_TAG "Git tag" "master")`), 1 resolves through a generic macro to 40-hex commits at every one of its 23 real call sites (`duckdb/duckdb`), and 1 is a literal placeholder string that is not a valid git ref at all (`grpc/grpc`'s example).
- `duckdb/duckdb`'s `register_external_extension()` macro takes `GIT_TAG` as an opaque parameter — reading the macro alone tells you nothing; reading its 23 leaf call sites in `.github/config/**/*.cmake` shows every one pins a real 40-hex commit. A grep that stops at the macro definition undercounts good practice.
- `curl/curl`'s own CMake test harness (`tests/cmake/CMakeLists.txt:75-78`) defaults `FROM_GIT_TAG` to the literal string `"master"` — a real, if test-only, floating-branch default in a top-tier exemplar.
- `apache/arrow`'s 18 URL-form `FetchContent_Declare` calls (`cpp/cmake_modules/ThirdpartyToolchain.cmake`) all carry `URL_HASH SHA256=${ARROW_<PKG>_BUILD_SHA256_CHECKSUM}`; every one of those variables resolves to `cpp/thirdparty/versions.txt` — a plain `KEY=VALUE` file, **not** a `.cmake` file — so a naive `--include='*.cmake'` grep for the pin will silently miss where the pin actually lives.
- `duckdb/duckdb`'s `tools/cpp/cmake/DuckDBCppApi.cmake:121` `FetchContent_Declare(duckdb_lib URL "${_duckdb_cpp_url}" ...)` has **no `URL_HASH` at all**, including in its `"nightly"` mode — a real MUST-severity finding, not a hypothetical.
- `microsoft/vcpkg`'s `vcpkg-cmake` port helper (`ports/vcpkg-cmake/vcpkg_cmake_configure.cmake:218`) unconditionally prepends `-DFETCHCONTENT_FULLY_DISCONNECTED=ON` to every CMake-based port's configure — this is the systemic offline switch for the entire vcpkg ports tree, not something any individual portfile opts into.
- CPM.cmake (both vendored copies in the corpus, `cpp-best-practices/cmake_template` at 0.42.1 and `TheLartians/ModernCppStarter` at 0.42.3, both stale against the 2026-09-24 current 0.43.2) bootstrap-downloads itself with `file(DOWNLOAD ... EXPECTED_HASH SHA256=${CPM_HASH_SUM})` — hash-checked, confirming the brief's premise.
- `cpm-cmake/CPM.cmake@01678cfe17:cmake/CPM.cmake:91,96,103,109` sets `CMP0077`, `CMP0126`, `CMP0135`, `CMP0150` to `NEW` unconditionally on load — a consumer that relies on any of those policies' `OLD` behavior silently loses it the moment CPM is included.
- CPM's own README (fetched 2026-09-26) explicitly recommends `gh:user/repo#<commit>@<version>` for "supply chain security best practice" — but of 6 real (non-CPM-internal) `CPMAddPackage` call sites with a resolvable ref in the corpus, only 1 uses a commit hash (CPM's own doc example, `mosra/m.css`); the rest use version tags, and `cpp-best-practices/cmake_template/Dependencies.cmake:74` pins `tools` at `GIT_TAG "main"` — a floating branch through CPM, in a template other projects copy wholesale.
- `cpp-pm/hunter@997fab148b` (v0.26.12, 2026-09-22) still keeps `HunterGate.cmake` in the `gate` submodule pinned at commit `920507363b5239a62196e430dd2f458bc5179f99` — unchanged since wave 1's `708cab1c49` snapshot despite three Hunter point releases in between; `nlohmann/json`'s own docs example (`docs/mkdocs/docs/integration/hunter/CMakeLists.txt:4`) pins Hunter itself at the ancient `v0.23.297`, a stale copy-pasteable example.
- `find_package` CONFIG/MODULE/version stated explicitly, re-measured outside `Kitware__CMake/Tests` (6,112 calls, down from wave 1's 6,957 which included Kitware's self-tests): `CONFIG` 44.9% (2,744), `MODULE` 1.3% (77), an explicit version token 1.8% (108), a version range 0.02% (1 call) — directionally consistent with wave 1 but the exact percentages move when the excluded-tests scoping changes, so cite the command, not the number, going forward.
- `ClickHouse/ClickHouse`'s own `.gitmodules` carries a maintainer comment telling contributors *not* to use `branch =` on a submodule, because "such tags make updating submodules a little bit more convenient but they do *not* specify the tracked submodule branch" — a primary-source rebuttal of the common `branch =` misconception, worth quoting directly in the rule.
- `boostorg/boost` sets `branch = .` on all ~200 of its submodules — not a real branch name, a Boost-superproject-tooling convention consumed by `boostdep`/`b2`, not by plain `git submodule update --remote`; an AI agent that reads `branch = .` and concludes "floating on the literal branch dot" is wrong twice over.
- OpenSSF Scorecard's Pinned-Dependencies check (fetched 2026-09-26, `docs/checks.md`) still scopes itself to "Dockerfiles, shell scripts, and GitHub workflows" with zero mention of CMake, `FetchContent`, or `CPMAddPackage` — a `GIT_TAG main` in a `CMakeLists.txt` earns the same Scorecard score as a full-hash pin.
- `ExternalProject_Add` outside `Kitware__CMake/Tests`: 57 calls, dominated by `llvm-project` (9 files) and `apache/arrow`'s `ThirdpartyToolchain.cmake` (14, all build-time, none configure-time-recursive); `grpc/grpc`'s own teaching example (`examples/cpp/helloworld/cmake_externalproject/`) is 8 of those 57 and exists specifically to show the superbuild pattern.
- A naive `grep -rl 'file(DOWNLOAD'` over the corpus (excluding Kitware's own module/test code) returns 14 files; at least one of those (`glfw/glfw/CMake/GenerateMappings.cmake`) is invoked only via `add_custom_command(... COMMAND cmake -P ...)` at **build** time, not configure time — a real false positive for a "network at configure time" claim that the grep alone cannot distinguish.

## Findings

### 1. FetchContent_Declare pin shape

**Corpus and method.** Re-fetched exemplar corpus at `/home/mherwig/.cache/research-lang/exemplars/cmake` (2026-09-26 SHAs, see per-repo SHA table below). Reused `.agents/research/cmake-audit/scratch/deps-cmake-calls.py` (paren-balanced call extractor) against the new corpus path, then filtered `Kitware__CMake/Tests/**` per the brief:

```
python3 deps-cmake-calls.py > calls.tsv   # CORPUS repointed to the 2026-09-26 path
awk -F'\t' '!($1=="Kitware__CMake" && $2 ~ /^Tests\//)' calls.tsv > calls-notests.tsv
```
19,235 raw calls total; 17,659 after the Tests/ exclusion (empty output would mean the extractor found nothing — not the case here).

Repo SHAs used (`git -C <dir> rev-parse --short=10 HEAD`, run 2026-09-26): `apache__arrow@3ad410b7b1`, `curl__curl@98519dac83`, `duckdb__duckdb@d8a1bd4f4f`, `grpc__grpc@0f8d72ed71`, `protocolbuffers__protobuf@c64743979d`, `gabime__spdlog@5b63780337`, `aminya__project_options@412045e1f1`, `cpm-cmake__CPM.cmake@01678cfe17`, `cpp-pm__hunter@997fab148b`, `Kitware__CMake@e8befb989b`, `nlohmann__json@f422b753cc`, `TheLartians__ModernCppStarter@72b8957f9e` (unchanged since wave 1), `cpp-best-practices__cmake_template@b86318abbf` (unchanged since wave 1), `microsoft__vcpkg-tool@51bf87ca6e`, `microsoft__vcpkg@c4ee5a52d7`, `ccache__ccache@b471bbde29`, `ninja-build__ninja@4e4df1e567`, `boostorg__boost@a61cfa03ba`, `openssl__openssl@e13af7e602`, `ClickHouse__ClickHouse@0995a518a8`.

**Total GIT_REPOSITORY-based declares.** 33 (`awk -F'\t' 'tolower($4)=="fetchcontent_declare"' calls-notests.tsv | grep -c GIT_REPOSITORY`), down one from wave 1's 34 at the old SHAs — a real corpus drift, not a script bug; every one of the 33 also carries a `GIT_TAG` (0 bare `GIT_REPOSITORY`-only declares).

Programmatic classification (Python, `re.fullmatch(r'[0-9a-f]{33,40}', tag)` for full-hash, `re.match(r'v?[0-9]+\.[0-9]+', tag)` for semver, `tag.lower() in ('main','master','develop','head')` for branch, else opaque):

| Class | n | Note |
|---|---|---|
| Full 33–40 hex `GIT_TAG` | 10 | all inside `Kitware__CMake/Modules/FetchContent.cmake`'s own doc examples (`googletest`/`Catch2`/`protobuf` illustrations) |
| Semver-looking `GIT_TAG` | 6 | `aminya/project_options`, `cpm-cmake/CPM.cmake`'s own test, `duckdb`'s example, `gabime/spdlog`'s bench, `nlohmann/json`'s fmt-formatter test |
| Branch/`HEAD` literal | 4 | `aminya/project_options` (`main`), `nlohmann/json`×3 (`HEAD`, all in `tests/`) |
| Opaque — required reading the variable | 13 | resolved below |

Resolving the 13 opaque `GIT_TAG` values by reading each variable's `set()` (or, for a macro parameter, its leaf call sites):

| repo@sha:path:line | `GIT_TAG` expression | Resolves to | Classification after resolution |
|---|---|---|---|
| `Kitware__CMake@e8befb989b:Modules/FetchContent.cmake:1000,1005,1029,1034,1047` (5 rows) | literal 32-hex strings (`4a89dc7e24ff212a7b5167bef7ab079d` etc.) | fictitious — 32 hex chars, MD5-length, not a valid git commit SHA (7–40 hex) | doc illustration, not a real ref |
| `Kitware__CMake@e8befb989b:Modules/FetchContent.cmake:1010` | `origin/integrationBranch` | a remote-tracking branch spelled out | doc illustration of the *bad* pattern the surrounding prose warns against |
| `apache__arrow@3ad410b7b1:matlab/tools/cmake/BuildMatlabArrowInterface.cmake:109` | `${MATLAB_ARROW_LIBMEXCLASS_CLIENT_FETCH_CONTENT_GIT_TAG}` | `set(... "2a75a5e9bbb524a044572598e371c994cc715d3d")` at line 27 of the same file | **full hash** — resolves clean |
| `curl__curl@98519dac83:tests/cmake/CMakeLists.txt:76` | `"${FROM_GIT_TAG}"` | `option(FROM_GIT_TAG "Git tag" "master")` at line 75 | **floating branch by default** — a real finding, test-harness code |
| `duckdb__duckdb@d8a1bd4f4f:extension/extension_build_tools.cmake:605` | `${COMMIT}` (macro parameter of `register_external_extension`) | not statically resolvable at the macro; resolved at its 23 leaf call sites in `.github/config/**/*.cmake` (e.g. `.github/config/extensions/vss.cmake:5` `GIT_TAG 9eba8b3dc41e819eafb693102b4fb4a2845934c1`) | **full hash at every real call site** (23/23 checked via `grep -rhoE 'GIT_TAG [0-9a-f]{7,40}' .github/config` = 23 matches, same as the file count) |
| `protocolbuffers__protobuf@c64743979d:cmake/gtest.cmake:12` | `"v${googletest-version}"` | `cmake/dependencies.cmake:32` `set(googletest-version "1.17.0")` | **semver, centrally defined** |
| `protocolbuffers__protobuf@c64743979d:cmake/abseil-cpp.cmake:25` | `"${abseil-cpp-version}"` | `cmake/dependencies.cmake:15` `set(abseil-cpp-version "20250512.1")` | **CalVer, centrally defined** |
| `protocolbuffers__protobuf@c64743979d:cmake/conformance.cmake:18` | `"${jsoncpp-version}"` | `cmake/dependencies.cmake:19` `set(jsoncpp-version "1.9.6")` | **semver, centrally defined** |
| `grpc__grpc@0f8d72ed71:examples/cpp/cmake/common.cmake:82` | `vGRPC_TAG_VERSION_OF_YOUR_CHOICE` | not a variable at all — a literal placeholder string left in a copy-pasteable teaching example (the surrounding comment reads "when using gRPC, you will actually set this to an existing tag, such as v1.25.0") | **not a valid git ref** — would fail `git checkout` if run verbatim, not a silent security issue but a broken-by-design example |

Net effect of resolving the 13: real-corpus pin discipline is better than the unresolved grep suggests for protobuf (3 opaque → 3 centrally-versioned) and for duckdb (1 opaque macro → 23 real hash pins), and worse than a first read suggests for curl (1 "opaque" → a real floating-branch default) and grpc (1 "opaque" → not even a valid ref).

### 2. URL-form declares

17 `URL`-form declares outside `GIT_REPOSITORY` in the same 33-declare real-corpus set were separately tabulated. `apache/arrow`'s `cpp/cmake_modules/ThirdpartyToolchain.cmake` accounts for 18 URL-form declares (across the whole corpus, all with `URL_HASH SHA256=${ARROW_<PKG>_BUILD_SHA256_CHECKSUM}`). Every one of those checksum variables is defined not in a `.cmake` file but in `cpp/thirdparty/versions.txt`, a flat `KEY=VALUE` file `include()`d by `ThirdpartyToolchain.cmake`:

```
git -C apache__arrow show HEAD:cpp/thirdparty/versions.txt | grep -c '_SHA256_CHECKSUM=\|_SHA512_CHECKSUM='
# → 46
```

versus `duckdb/duckdb@d8a1bd4f4f:tools/cpp/cmake/DuckDBCppApi.cmake:121`:

```cmake
FetchContent_Declare(duckdb_lib URL "${_duckdb_cpp_url}"
                     ${_duckdb_cpp_extract_ts})
```

`_duckdb_cpp_url` resolves (lines 103-113 of the same file) to `<base>/v<version>/libduckdb-<platform>.zip` or, in `"nightly"` mode, `<base>/nightly/libduckdb-<platform>.zip` — **no `URL_HASH` anywhere in the function**, including the nightly path where the artifact is expected to change. This is a genuine MUST-severity finding in a widely-used repo, not a corner case.

`microsoft/vcpkg-tool@51bf87ca6e`'s `cmake/FindLibCURL.cmake:47`, `cmake/Findfmt.cmake:41`, `cmake/FindCMakeRC.cmake:20` are Find-module-that-fetches-on-miss (the same idiom wave 1 flagged for `ccache/ccache@b471bbde29:cmake/FindZstd.cmake:49`), all with `URL_HASH`.

### 3. The CMake docs already say what wave 1 wanted confirmed

Fetched `Modules/FetchContent.cmake` at tag `v4.4.2` directly (the `Help/module/FetchContent.rst` page is a one-line `.. cmake-module::` include, so the real docstring lives in the module source):

```
curl -sL https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Modules/FetchContent.cmake
```

Verbatim (lines 156-159): *"Where contents are being fetched from a remote location and you do not control that server, it is advisable to use a hash for `GIT_TAG` rather than a branch or tag name. A commit hash is more secure and helps to confirm that the downloaded contents are what you expected."* This is CMake's own normative text, not an inference — cite it directly rather than paraphrasing.

The same fetch confirms the mutual exclusivity the topic map flagged as *pending*: *"`OVERRIDE_FIND_PACKAGE` cannot be used when `FIND_PACKAGE_ARGS` is given"* and the reverse, stated twice (once under each keyword's docs, lines 199 and 217 respectively of the 4.4.2 source) — genuinely mutually exclusive at the single-declare level, confirmed from the primary source rather than left to the M-G-02 scratch matrix.

`FETCHCONTENT_TRY_FIND_PACKAGE_MODE` (3.24+) interacts with `FIND_PACKAGE_ARGS` only, never with `OVERRIDE_FIND_PACKAGE` (lines 737-880 of the 4.4.2 source): `ALWAYS` calls `find_package` even without `FIND_PACKAGE_ARGS`; `NEVER` blocks it even with `FIND_PACKAGE_ARGS` present; unset/`OPT_IN` is the default, calling `find_package` only when `FIND_PACKAGE_ARGS` was given.

`FetchContent_Populate()`'s single-argument (deprecated, CMP0169) form was measured at 38 raw hits outside Kitware's own module/test code; after excluding CPM's internal calls (`cpm-cmake/CPM.cmake@01678cfe17:cmake/CPM.cmake:625-644,1222-1233`, part of CPM's own implementation, not consumer-visible) and Kitware's docs, 7 real call sites remain: `apache/arrow` (`opentelemetry_cpp`), `ccache/ccache`'s `FindZstd.cmake:62`, `microsoft/vcpkg-tool`'s `FindLibCURL.cmake:57`, `nlohmann/json`'s test, and — the interesting one — `cpp-best-practices/cmake_template@b86318abbf:cmake/PackageProject.cmake:158,179`, a widely-copied starter template still using the deprecated one-arg form for two of its own dependencies, one of them (`_fargs`) pinned to a real 40-hex commit archive URL (`.../archive/8c50d1f956172edb34e95efa52a2d5cb1f686ed2.zip`) despite the deprecated wrapper.

### 4. CPM.cmake

CPM's own repo (`cpm-cmake/CPM.cmake@01678cfe17:cmake/CPM.cmake`) sets four policies unconditionally on load:

```
grep -n "cmake_policy(SET CMP" cpm-cmake__CPM.cmake/cmake/CPM.cmake
# 91:  cmake_policy(SET CMP0077 NEW)
# 96:    cmake_policy(SET CMP0126 NEW)
# 103:    cmake_policy(SET CMP0135 NEW)
# 109:    cmake_policy(SET CMP0150 NEW)
```

Both vendored copies in the corpus bootstrap-download themselves with a checked hash:

```cmake
# cpp-best-practices__cmake_template@b86318abbf:cmake/CPM.cmake:5,19-21 (CPM_DOWNLOAD_VERSION 0.42.1)
# TheLartians__ModernCppStarter@72b8957f9e:cmake/CPM.cmake:5,19-21    (CPM_DOWNLOAD_VERSION 0.42.3)
file(DOWNLOAD
     https://github.com/cpm-cmake/CPM.cmake/releases/download/v${CPM_DOWNLOAD_VERSION}/CPM.cmake
     ${CPM_DOWNLOAD_LOCATION} EXPECTED_HASH SHA256=${CPM_HASH_SUM})
```
Both are hash-checked (confirming the brief's premise) but both are stale: 0.42.1 and 0.42.3 vendored against the era-recheck's current 0.43.2 (2026-09-24) — two minor releases behind, unchanged since wave 1.

**Real (non-CPM-internal) `CPMAddPackage` call sites with a resolvable ref** — 24 rows across `TheLartians/ModernCppStarter` (11), `cpp-best-practices/cmake_template` (6), `nlohmann/json`'s docs example (1):

| repo@sha:path:line | Ref | Shape |
|---|---|---|
| `TheLartians__ModernCppStarter@72b8957f9e:CMakeLists.txt:27` | `"gh:TheLartians/PackageProject.cmake@1.13.0"` | version tag |
| `TheLartians__ModernCppStarter@72b8957f9e:documentation/CMakeLists.txt:9` | `"gh:mosra/m.css#a0d292ec311b97fefd21e93cdefb60f88d19ede6"` | **commit hash** (the only one) |
| `TheLartians__ModernCppStarter@72b8957f9e:cmake/tools.cmake:14` | `"gh:StableCoder/cmake-scripts#25.08"` | CalVer tag |
| `TheLartians__ModernCppStarter@72b8957f9e:cmake/tools.cmake:73` | `"gh:TheLartians/Ccache.cmake@1.2.5"` | version tag |
| `TheLartians__ModernCppStarter@72b8957f9e:test/CMakeLists.txt:18-19` | `"gh:doctest/doctest@2.5.2"`, `"gh:TheLartians/Format.cmake@1.8.3"` | version tags |
| `cpp-best-practices__cmake_template@b86318abbf:Dependencies.cmake:12,24,38,50,62` | `GIT_TAG "12.1.0"`, `VERSION 1.17.0`, `VERSION 3.12.0`, `VERSION 2.6.1`, `VERSION 6.1.9` | version tags |
| `cpp-best-practices__cmake_template@b86318abbf:Dependencies.cmake:74` | `NAME tools GITHUB_REPOSITORY "lefticus/tools" GIT_TAG "main"` | **floating branch through CPM** |
| `nlohmann__json@f422b753cc:docs/mkdocs/docs/integration/cpm/CMakeLists.txt:6` | `"gh:nlohmann/json@3.12.0"` | version tag |

CPM's own README (fetched 2026-09-26, `raw.githubusercontent.com/cpm-cmake/CPM.cmake/master/README.md`) states, verbatim: *"For maximum security and reproducibility, always prefer specifying immutable git commit hashes instead of tags or branches... You can specify a commit hash before the version in the URI, e.g. `gh:user/repo#<commit>@<version>`."* Of 8 resolvable real-adopter refs measured, 1 follows this (the CPM docs' own example), 6 use version tags, and 1 is a floating branch. **Decision for the rule set: CPM gets one row, not several** — the corpus gives no evidence of distinct sub-idioms worth separate rows (shorthand vs. `NAME=`/`GITHUB_REPOSITORY=` long form is a syntax choice, not a pinning-discipline difference; every real adopter that pins at all pins the same way regardless of syntax).

`CPM_USE_LOCAL_PACKAGES`, `CPM_DOWNLOAD_ALL`, `CPMUsePackageLock`/`package-lock.cmake` all show 0 real (non-CPM-internal) adopters except `CPM_USE_LOCAL_PACKAGES` in one vcpkg portfile (`microsoft__vcpkg@c4ee5a52d7:ports/saucer/portfile.cmake`) and `CPM_SOURCE_CACHE` in `TheLartians/ModernCppStarter`'s CI workflows (7 `.github/workflows/*.yml` files) and `microsoft__vcpkg@c4ee5a52d7:ports/stdexec/portfile.cmake`.

### 5. Hunter / cpp-pm

`cpp-pm/hunter@997fab148b` (v0.26.12, 2026-09-22 — confirmed against the era-recheck) has no `HunterGate.cmake` file directly in the repo; it lives in the `gate` submodule:

```
git -C cpp-pm__hunter show HEAD:.gitmodules | grep -A1 'submodule "gate"'
git -C cpp-pm__hunter ls-tree HEAD | grep gate
# 160000 commit 920507363b5239a62196e430dd2f458bc5179f99  gate
```
Unchanged since wave 1's `708cab1c49` snapshot of the parent repo — the `gate` submodule SHA held steady across three Hunter point releases (`v0.26.11` → `v0.26.12`) in this window.

`HunterGate(...)` call sites outside `cpp-pm/hunter`'s own examples: only `nlohmann/json@f422b753cc:docs/mkdocs/docs/integration/hunter/CMakeLists.txt:4`, `URL "https://github.com/cpp-pm/hunter/archive/v0.23.297.tar.gz" SHA1 "3319fe6a3b08090df7df98dee75134d68e2ef5a3"` — `URL`+`SHA1`, the shape `HunterGate.cmake` itself exposes (no branch/`latest` option in the macro). `v0.23.297` predates the June-2026 CMake-4-floor fix (`#858`) by roughly three years of Hunter's own numbering — a stale docs example, not a live security issue (it is an integration-docs page, not a build that runs in CI), but exactly the kind of copy-pasteable snippet an agent would lift unread.

`hunter_add_package` appears 659 times, entirely inside `cpp-pm/hunter`'s own recipe catalog (`cmake/projects/**`); **0 of the other 45 exemplars call it** — confirming wave 1's "maintained but not chosen" verdict at the new SHAs. **Decision: Hunter gets one recognition row** (pin-shape + gate-submodule-SHA check), not a depth file — the corpus gives no additional adopters to generalize from.

### 6. find_package: CONFIG, MODULE, version, range

```
awk -F'\t' 'tolower($4)=="find_package"' calls-notests.tsv > fp.tsv
wc -l fp.tsv                              # 6112
grep -cE '\bCONFIG\b' fp.tsv               # 2744  (44.9%)
grep -cE '\bMODULE\b' fp.tsv               # 77    (1.3%)
```
Version and range counted with a small Python pass (first token after the package name; version = starts with a digit, range = also contains `...`): 108 calls (1.8%) carry a version, 1 call (0.02%) a range.

These move against wave 1's reported 6,957/41%/1.7%/3.2%/0.2% mainly because this dive follows the brief's exact "outside `Kitware__CMake/Tests`" scoping — Kitware's own `find_package` count drops from 1,848 (full corpus) to 809 (Tests excluded), and `qt/qtbase` genuinely grew from 1,188 to 1,376 calls at the new SHA. **Cite the command and the exclusion rule, not a bare percentage, when this number is repeated** — it moves with scoping choices as much as with real corpus drift.

Per-repo concentration is unchanged in shape from wave 1: `conan-io/conan-center-index` (2,188), `qt/qtbase` (1,376), `Kitware__CMake` (809, Tests excluded), `cpp-pm/hunter` (604, self-catalog), `microsoft/vcpkg` (528) are the top 5.

### 7. Going offline

```
grep -rl "FETCHCONTENT_FULLY_DISCONNECTED" $CORPUS --include='*.cmake' --include='CMakeLists.txt'
```
20 files, but the interesting one is systemic rather than per-project:

```cmake
# microsoft__vcpkg@c4ee5a52d7:ports/vcpkg-cmake/vcpkg_cmake_configure.cmake:218
vcpkg_list(PREPEND arg_OPTIONS "-DFETCHCONTENT_FULLY_DISCONNECTED=ON")
```
Every CMake-based vcpkg port that calls `vcpkg_cmake_configure` (the standard port helper) gets this flag unconditionally — it is vcpkg's own answer to "can the configure run with no network", enforced by the package manager's tooling rather than by individual `portfile.cmake` authors. The 17 remaining `FETCHCONTENT_FULLY_DISCONNECTED` hits in individual portfiles pair it with `FETCHCONTENT_SOURCE_DIR_<X>` pointing at vcpkg's own pre-fetched, patched source tree (e.g. `ports/tl-function-ref/portfile.cmake`, `ports/stdexec/portfile.cmake`) rather than re-implementing the disconnect logic.

Two consumer patterns for reading (not setting) the flag: `ccache/ccache@b471bbde29:cmake/Dependencies.cmake:18-21` reacts to it (`if(FETCHCONTENT_FULLY_DISCONNECTED) ... set(DEPS LOCAL) ... endif()`); `apache/arrow@3ad410b7b1:cpp/CMakeLists.txt:94-96` explicitly sets `CMP0170` to `NEW` specifically because — per its own comment — "CMP0170 is for enforcing dependency populations by users with `FETCHCONTENT_FULLY_DISCONNECTED=ON`", i.e. the pre-3.30 behavior of that variable was not strict enough for their needs.

`CPM_SOURCE_CACHE` real adopters: `TheLartians/ModernCppStarter`'s 7 CI workflow files (caches CPM downloads across CI runs — `${{ runner.os }}-cpm-...` style cache keys) and `microsoft/vcpkg@c4ee5a52d7:ports/stdexec/portfile.cmake`.

### 8. Vendored directories and submodule branch= keys

```
git -C <repo> show HEAD:.gitmodules 2>/dev/null | grep -E 'submodule|branch ='
```
run across all 46 repos. Two contrasting, citable results:

`ClickHouse/ClickHouse@0995a518a8:.gitmodules` (header comment, verbatim): *"Please do not use 'branch = ...' tags with submodule entries. Such tags make updating submodules a little bit more convenient but they do *not* specify the tracked submodule branch. Thus, they are..."* — a maintainer directly rebutting the naive reading of `branch =`, on a repo with ~160 `contrib/*` submodules and zero `branch =` keys.

`boostorg/boost@a61cfa03ba:.gitmodules` sets `branch = .` on all ~200 of its library submodules. This is not a real branch name — Boost's own super-repo tooling (`b2`/`boostdep`) reads `.` to mean "whatever branch the super-repo itself is on", a Boost-specific convention. A `git submodule update --remote` (the operation `branch =` normally controls) run on a plain checkout of boost would not resolve `.` the way Boost's own scripts do.

`openssl/openssl@e13af7e602:.gitmodules` has exactly one real floating submodule: `[submodule "fuzz/corpora"] branch = main` — a test-fixture corpus, not a build dependency.

`grpc/grpc@0f8d72ed71`, `cpp-pm/hunter@997fab148b`, `Tencent/rapidjson@24b5e7a8b2`: submodules present, **no `branch =` key on any of them** — every submodule is pinned to a fixed commit by ordinary git-submodule semantics regardless of the `branch =` key's absence (that key only affects `--remote` updates; the gitlink itself is always a commit pointer).

### 9. ExternalProject_Add

57 calls outside `Kitware__CMake/Tests`:

```
awk -F'\t' 'tolower($4)=="externalproject_add"' calls-notests.tsv | cut -f1 | sort | uniq -c | sort -rn
#  14 apache__arrow            (cpp/cmake_modules/ThirdpartyToolchain.cmake, build-time thirdparty acquisition)
#   9 llvm__llvm-project       (spread across compiler-rt, clang, bolt, spirv-tools, dxil-dis, libc)
#   8 grpc__grpc               (examples/cpp/helloworld/cmake_externalproject/, a teaching example)
#   3 cpp-pm__hunter           (cmake/modules/hunter_autotools_project.cmake — bridges an autotools dep)
#   2 ClickHouse__ClickHouse
#  ... (qtbase, protobuf, nlohmann/json's download_test_data.cmake, curl's own test harness, 1 each)
```
No repo drives `ExternalProject_Add` from inside an `execute_process`-triggered configure-time recursive `cmake --build` — every call found is a normal build-time superbuild/glue target. **Decision (M-G-20): `ExternalProject_Add` is right for a non-CMake-native build (`hunter_autotools_project.cmake`'s autotools bridge) or a genuinely different toolchain per subproject; it is the corpus's minority mechanism (57 real calls vs. 57 `FetchContent_Declare`) and the teaching-example count (8/57 in one file) shows it is more often demonstrated than deployed.**

### 10. Network-touch enumeration

```
grep -rl "file(DOWNLOAD" $CORPUS --include='*.cmake' --include='CMakeLists.txt' \
  | grep -v '/Kitware__CMake/Tests/' | grep -v '/Kitware__CMake/Modules/'
```
14 distinct files (20 raw call sites). At least one is a **false positive** for "network reached during configure": `glfw/glfw@92dcf4ce74:CMake/GenerateMappings.cmake` is invoked only via `src/CMakeLists.txt:24`'s `add_custom_command(... COMMAND "${CMAKE_COMMAND}" -P "${GLFW_SOURCE_DIR}/CMake/GenerateMappings.cmake" ...)` — a **build-time** custom command running a `cmake -P` script, never evaluated during `cmake -S`/configure. A configure-time-only grep target (e.g. restrict to files reachable from a top-level `CMakeLists.txt` before any `add_custom_command`/`add_custom_target` boundary) is not mechanically derivable from text alone; the practical check is `unshare -rn cmake -S . -B build` and reading whether configure fails, not a static grep. **False-positive rate on this corpus: at least 1/14 files (7%) confirmed by manual trace; likely higher — `llvm-project`'s `AddMLIRPython.cmake` and `TensorFlowCompile.cmake` and `Kitware/CMake`'s own `.gitlab/ci/download_qt.cmake` all warrant the same trace before being cited as configure-time network use.**

## Normative guidance candidates

1. **A `FetchContent_Declare`/`ExternalProject_Add` git dependency states a full 40-hex `GIT_TAG`; a branch name or `HEAD` is a MUST-fail, a semver/CalVer tag is a SHOULD-fail.** Rationale: CMake 4.4.2's own docs recommend the hash over the alternatives, and OpenSSF Scorecard's Pinned-Dependencies check does not see CMake at all, so nothing else enforces it. Verify: `grep -rn -e 'GIT_TAG[[:space:]]*"\?main"\?' -e 'GIT_TAG[[:space:]]*"\?master"\?' -e 'GIT_TAG[[:space:]]*"\?develop"\?' -e 'GIT_TAG[[:space:]]*"\?HEAD"\?' <dir> --include='*.cmake' --include=CMakeLists.txt` (hit = MUST finding, empty = pass on the literal cases); a `GIT_TAG` set to a `${VARIABLE}` requires reading that variable's `set()` before either passing or failing — never report "opaque" as the final answer. Floor: CMake 3.11 (`FetchContent` itself).
2. **`URL`-form `FetchContent_Declare`/`ExternalProject_Add` always carries `URL_HASH`.** Rationale: `duckdb/duckdb`'s `DuckDBCppApi.cmake` shows a real, current example of a hashless URL fetch, including in a `"nightly"` mode where the artifact is expected to change underneath the pin. Verify: for every `URL[[:space:]]+"?https?://` match in a `FetchContent_Declare`/`ExternalProject_Add` call block, confirm `URL_HASH` (or `URL_MD5`) appears in the same call; empty output from `grep -L 'URL_HASH\|URL_MD5' <files-with-URL-form-declares>` = pass. Floor: `URL_HASH` has existed since `FetchContent`'s 3.11 introduction.
3. **A `URL_HASH`/checksum variable that is not defined in the same file may be defined in a non-`.cmake` properties file (e.g. `versions.txt`) `include()`d nearby — a `--include='*.cmake'` grep alone cannot resolve it.** Rationale: `apache/arrow`'s entire thirdparty pin set (46 checksums) lives in `cpp/thirdparty/versions.txt`, not in any `.cmake` file. Verify (reading heuristic, not a single grep): if a checksum variable's `set()` is not found under `--include='*.cmake' --include=CMakeLists.txt`, search the same directory tree for `include(` calls with no extension filter and re-grep the target. Floor: none — a documentation/measurement discipline, not a CMake feature.
4. **A macro/function parameter used as `GIT_TAG` (an opaque pin at its definition site) must be resolved at its call sites, not reported as unpinned.** Rationale: `duckdb/duckdb`'s `register_external_extension(... COMMIT ...)` is opaque at the macro but resolves to a real 40-hex commit at all 23 real call sites; the opposite failure mode is just as real — `apache/arrow`'s MATLAB interface resolves an opaque-looking `${...GIT_TAG}` to a real hash two lines away, while `curl/curl`'s opaque-looking `${FROM_GIT_TAG}` resolves to a floating `"master"` default. Verify: `grep -rn '<the macro name>(' <dir>` to enumerate call sites, then apply candidate 1 to each resolved value. Floor: none — a reading discipline.
5. **CPM vendored into a project is version-pinned (`CPM_DOWNLOAD_VERSION`) and hash-checked (`EXPECTED_HASH SHA256=${CPM_HASH_SUM}`) on its own bootstrap `file(DOWNLOAD)`.** Rationale: both real vendored copies in the corpus already do this; the remaining risk is staleness (both are two minor releases behind CPM's current 0.43.2), not missing verification. Verify: `grep -n 'EXPECTED_HASH' <vendored-CPM.cmake>` — empty output is the finding (missing hash check); separately diff `CPM_DOWNLOAD_VERSION` against the current upstream tag. Floor: any CPM version (the pattern is unchanged since CPM's `get_cpm.cmake` template originated).
6. **`CPMAddPackage`'s `GIT_TAG`/shorthand-`@` ref should be a commit hash per CPM's own README, but real adopters overwhelmingly use version tags instead — do not report "no commit hash" alone as a finding; report a bare branch name (`GIT_TAG "main"`) as the MUST-severity case.** Rationale: measured 6/8 resolvable real-adopter refs use version tags (accepted, SHOULD-tier at worst), 1 uses a commit hash, and 1 (`cpp-best-practices/cmake_template`) genuinely floats on `main`. Verify: `grep -rn -e 'GIT_TAG[[:space:]]*"main"' -e 'GIT_TAG[[:space:]]*"master"' <dir> --include='*.cmake' --include=CMakeLists.txt` in the context of a `CPMAddPackage(` block = MUST finding; a version tag alone is not a finding at this corpus's SHOULD bar. Floor: CPM.cmake, any version.
7. **A `CPMAddPackage`/vendored-`CPM.cmake` consumer is warned in review guidance that CPM sets `CMP0077`, `CMP0126`, `CMP0135` and `CMP0150` to `NEW` unconditionally on `include()`, before the consumer's own project can set them differently.** Rationale: measured directly in `cpm-cmake/CPM.cmake@01678cfe17:cmake/CPM.cmake:91,96,103,109`; a project relying on `CMP0077`'s `OLD` behavior for an `option()` in a subdirectory loses it silently the moment CPM is included anywhere earlier in the configure. Verify: a named reading heuristic, not a grep — if a project both vendors/includes CPM and sets any of these four policies explicitly elsewhere, check the include order; CPM's `cmake_policy(SET ... NEW)` always wins once it has run. Floor: CPM 0.32+ (when it began setting these; the exact floor per policy was not separately re-verified this dive — treat as "current CPM," not version-floored, until checked).
8. **`vcpkg_cmake_configure`-based ports get `FETCHCONTENT_FULLY_DISCONNECTED=ON` from the vcpkg toolchain itself; a portfile that calls raw `FetchContent_Declare` without pairing it with `FETCHCONTENT_SOURCE_DIR_<X>` will fail configure inside vcpkg's build, not silently reach the network.** Rationale: measured directly in `microsoft/vcpkg@c4ee5a52d7:ports/vcpkg-cmake/vcpkg_cmake_configure.cmake:218`. Verify: for any portfile calling `FetchContent_Declare`/`_MakeAvailable`, confirm a paired `FETCHCONTENT_SOURCE_DIR_<UPPERCASE_NAME>` is set earlier in the same portfile or by a sibling port. Floor: current vcpkg-cmake port helper (checked 2026-09-26 SHA only).
9. **`HunterGate(...)` calls are recognized and their pin checked against the gate submodule's fixed SHA; no separate depth guidance is warranted.** Rationale: 0 of 45 other exemplars adopt Hunter; the one real docs example found (`nlohmann/json`) pins an ancient Hunter release. Verify: `grep -rn 'HunterGate(' <dir> --include=CMakeLists.txt --include='*.cmake'`; if found, check the `SHA1` against `cpp-pm/gate`'s current tip and flag if it predates the June-2026 CMake-4-floor fix (`#858`). Floor: any HunterGate-based project.
10. **A submodule's `branch =` key in `.gitmodules` never means "this submodule floats" by itself — the gitlink is always a fixed commit; `branch =` only changes what `git submodule update --remote` does, and some projects (Boost) repurpose it for their own tooling.** Rationale: `ClickHouse`'s own maintainers state this directly; Boost's `branch = .` is a non-standard convention that would mislead a naive reader. Verify (reading heuristic): `git config -f .gitmodules --get-regexp branch` lists which submodules have the key at all; treat its presence as a signal to check the CI's actual update command (`git submodule update --remote`? never called? a custom script?), not as a standalone finding.

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| 1 (full-hash `GIT_TAG`) | `gabime/spdlog@5b63780337:tests/CMakeLists.txt:22` (40-hex Catch2 pin); `duckdb/duckdb@d8a1bd4f4f`'s 23 bundled-extension configs | `aminya/project_options@412045e1f1:src/CrossCompiler.cmake:350` (`GIT_TAG main`); `curl/curl@98519dac83:tests/cmake/CMakeLists.txt:75` (`option(... "master")`); `nlohmann/json@f422b753cc`'s 3 `HEAD`-pinned test fixtures |
| 2 (`URL` needs `URL_HASH`) | `apache/arrow@3ad410b7b1` (18/18 URL declares hash-checked); `ninja-build/ninja@4e4df1e567:CMakeLists.txt:261` (googletest release tarball, `URL_HASH SHA256=...`) | `duckdb/duckdb@d8a1bd4f4f:tools/cpp/cmake/DuckDBCppApi.cmake:121` (no `URL_HASH`, including nightly mode) |
| 3 (checksum may live outside `.cmake`) | `apache/arrow@3ad410b7b1:cpp/thirdparty/versions.txt` (46 checksums, plain-text) | — (no corpus example of a *missing* out-of-band file; this is a methodology candidate, not yet an enforceable finding class) |
| 5/6 (CPM pin discipline) | `cpp-best-practices__cmake_template@b86318abbf:Dependencies.cmake:12-62` (5/6 real deps on version tags); `TheLartians__ModernCppStarter@72b8957f9e:documentation/CMakeLists.txt:9` (one commit-hash pin) | `cpp-best-practices__cmake_template@b86318abbf:Dependencies.cmake:74` (`GIT_TAG "main"` through CPM) |
| 7 (CPM's 4 forced policies) | — (no corpus consumer visibly relies on the OLD behavior of any of the four; absence of a counter-example, not confirmation of safety) | `cpm-cmake__CPM.cmake@01678cfe17:cmake/CPM.cmake:91,96,103,109` is the source of the rule itself |
| 8 (vcpkg forces offline) | `microsoft/vcpkg@c4ee5a52d7:ports/vcpkg-cmake/vcpkg_cmake_configure.cmake:218` plus 17 portfiles pairing it with `FETCHCONTENT_SOURCE_DIR_<X>` | — |
| 10 (submodule `branch=`) | `ClickHouse/ClickHouse@0995a518a8:.gitmodules` header comment (explicit maintainer guidance); `grpc/grpc@0f8d72ed71`, `cpp-pm/hunter@997fab148b` (no `branch=` key anywhere) | `boostorg/boost@a61cfa03ba:.gitmodules` (`branch = .` on ~200 submodules, a convention easy to misread); `openssl/openssl@e13af7e602:.gitmodules` (`fuzz/corpora`, `branch = main`) |

`ocx-sh/find_ocx@ac2a759cd0` has **zero** `FetchContent`/`CPMAddPackage`/`HunterGate` calls in the corpus — it is a pure `find_package`/Find-module tool-discovery project with no bundled dependency acquisition of its own; its relevant exposure is `file(DOWNLOAD)` in its own bootstrap (`ocx.cmake`), already measured by the prior audit (`cmake-audit/find-ocx-cmake-shape-and-contracts.md`: 0 of 5 `file(DOWNLOAD)` calls set `TLS_VERIFY`, 2 of 5 carry `EXPECTED_HASH`) — not re-measured here per the brief's "cite, don't re-measure" instruction.

## AI-agent angle

- **Reporting an opaque `${VARIABLE}` `GIT_TAG` as "unpinned" without reading its definition is wrong in both directions.** An LLM that stops at `GIT_TAG ${COMMIT}` and calls it unpinned would be wrong for `duckdb/duckdb` (resolves to a real hash at every call site) and right for `curl/curl` (resolves to a floating `"master"` default) — the two look identical at the declare site. Mechanical check: before reporting a pin-shape finding on a variable-valued `GIT_TAG`, `grep -rn 'set(<VARNAME>' <same-dir-and-parents>` (or trace macro call sites) and re-classify the resolved value.
- **Treating CPM's documented "always use a commit hash" recommendation as universal practice.** A model trained on CPM's README text alone would expect `gh:owner/repo#<hash>@<version>` everywhere; the corpus shows 6 of 8 real adopters use version tags instead, and one genuinely floats on `main`. Mechanical check: grep the actual `CPMAddPackage`/`GIT_TAG` values in the target repo before asserting what "CPM users do."
- **Assuming a submodule's `branch =` key means the submodule floats on that branch.** `ClickHouse`'s own maintainers explicitly warn against this reading; Boost's `branch = .` is not even a real branch name. Mechanical check: `branch =` presence is a prompt to check the actual update mechanism (`git submodule update --remote`? a project-specific script?), never a standalone finding.
- **Citing OpenSSF Scorecard's Pinned-Dependencies check as evidence that a CMake dependency is "scored" for pinning.** It is not — the check's own docs (fetched 2026-09-26) scope it to Dockerfiles, shell scripts and GitHub Actions workflows, with no mention of CMake. A model that says "Scorecard will catch this" about a floating `GIT_TAG` is wrong; nothing catches it except manual review or a project's own CI grep.
- **Recommending `FetchContent_Populate()` with a single argument** because it appears in older training-data examples (pre-CMake-3.30 style) or because it is still present, deprecated, in real templates like `cpp-best-practices/cmake_template`. CMP0169 deprecates this form; the two-argument `FetchContent_Populate(<name> [args])` (paired with `FetchContent_GetProperties`/manual `add_subdirectory`) or, in most cases, plain `FetchContent_MakeAvailable()` is current. Mechanical check: `grep -n 'FetchContent_Populate([A-Za-z_][A-Za-z0-9_]*)' <file>` (a single bareword argument, no further keywords) flags the deprecated form.
- **Treating `HunterGate`'s `SHA1`+`URL` pin shape as current CMake practice worth recommending to a new project.** It is a legitimate but effectively unused pattern (0/45 other exemplars); a model suggesting Hunter for a new C++ project in 2026 is recommending a tool the ecosystem has not adopted, per this corpus's measured adoption.
- **Assuming a `file(DOWNLOAD)` hit means network access at configure time.** `glfw/glfw`'s `GenerateMappings.cmake` is a build-time `cmake -P` script invoked from `add_custom_command`; a static grep cannot distinguish this from a configure-time `include()`d file. Mechanical check: trace whether the file containing `file(DOWNLOAD)` is `include()`d directly from a `CMakeLists.txt`/`.cmake` reachable before the first `project()`'s targets are defined, or is only ever passed to `cmake -P` inside a `COMMAND`.

## Contested / evolving

- **CPM's documented "always pin a commit hash" guidance versus measured practice.** CPM.cmake's README has carried this "supply chain security best practice" callout since at least wave 1's snapshot (0.43, 2026-07-06) and still does at 0.43.2 (2026-09-24); real adopters in this corpus (`TheLartians/ModernCppStarter`, `cpp-best-practices/cmake_template`) have not moved toward it — 6 of 8 resolvable refs still use version tags. As of 2026-09-26 this reads as a documentation-practice gap that has not narrowed since wave 1, not a trend in either direction.
- **`FETCHCONTENT_FULLY_DISCONNECTED` as a project-level offline switch versus a package-manager-level one.** vcpkg has made it systemic (every `vcpkg_cmake_configure`-based port gets it); no other package manager or starter template in the corpus does the equivalent — Conan's `CMakeConfigDeps`/`CMakeToolchain` path does not touch `FetchContent` at all (Conan and FetchContent are largely non-overlapping mechanisms per this program's earlier conflict-14 finding). Whether other managers converge on vcpkg's pattern or leave it project-specific is open; no signal either way was found this dive.
- **Rules_foreign_cc's version-model change (era-recheck, 2026-09-15, `0.16.0`) affects the Bazel-side CMake version pinned for a `cmake_source_spokes`-style build, which interacts with this program's FetchContent-pinning guidance only at the Bazel/CMake seam** (owned by `bazel-quality/cpp.md`) — flagged here only because it changed since wave 1's corpus snapshot; not otherwise measured in this dive.

## Sources

| URL or measurement | What it is | Date / era | Why worth reading |
|---|---|---|---|
| [`Modules/FetchContent.cmake@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Modules/FetchContent.cmake) | CMake's own module docstring, fetched raw | 2026-09-26 (v4.4.2, released 2025) | Primary source for the hash-over-branch recommendation, `FIND_PACKAGE_ARGS`/`OVERRIDE_FIND_PACKAGE` mutual exclusivity, `FETCHCONTENT_TRY_FIND_PACKAGE_MODE` semantics, and CMP0169's deprecation text — all quoted verbatim above |
| [`Help/guide/using-dependencies/index.rst@v4.4.2`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/guide/using-dependencies/index.rst) | CMake's Using Dependencies guide, raw RST | 2026-09-26 (v4.4.2) | Normative "project control vs. user override" framing already cited by the topic map; fetched to confirm it still matches the 4.4.2 text |
| [CPM.cmake README](https://raw.githubusercontent.com/cpm-cmake/CPM.cmake/master/README.md) | CPM's own docs | 2026-09-26 (tracks `master`, current release 0.43.2 per era-recheck) | Source of the "supply chain security best practice" commit-hash recommendation and the 4-policies-on-load behavior's user-facing description |
| [OSSF Scorecard checks.md](https://raw.githubusercontent.com/ossf/scorecard/main/docs/checks.md) | Scorecard's own check documentation | 2026-09-26 | Confirms Pinned-Dependencies still scopes to Dockerfiles/shell/GitHub-workflows only, with zero CMake/FetchContent mention |
| Measurement: `deps-cmake-calls.py` re-run against `/home/mherwig/.cache/research-lang/exemplars/cmake` (2026-09-26 SHAs) | Paren-balanced call extractor over the full 46-repo corpus | 2026-09-26 | Primary dataset for every per-repo count in Findings §1, §6, §9; 19,235 raw calls, 17,659 after Tests/ exclusion |
| Measurement: `git -C <repo> show HEAD:cpp/thirdparty/versions.txt` (`apache/arrow@3ad410b7b1`) | Direct repo read | 2026-09-26 | Resolves all 18 of arrow's URL-form `FetchContent_Declare` checksum variables; the finding that a `.cmake`-only grep would miss this |
| Measurement: `git -C <repo> ls-tree HEAD \| grep gate` (`cpp-pm/hunter@997fab148b`) | Direct repo read | 2026-09-26 | Confirms the `gate` submodule SHA (`920507363b...`) unchanged since wave 1 |
| Measurement: `git -C <repo> show HEAD:.gitmodules` across all 46 repos | Direct repo reads | 2026-09-26 | Source of the `ClickHouse` maintainer-comment quote and the `boostorg/boost` `branch = .` finding |
| Measurement: `grep -rhoE 'GIT_TAG [0-9a-f]{7,40}' .github/config` (`duckdb/duckdb@d8a1bd4f4f`) | Direct repo read | 2026-09-26 | Resolves `register_external_extension`'s opaque `${COMMIT}` parameter at all 23 real call sites |
| Measurement: `grep -n -B5 'file(DOWNLOAD' src/CMakeLists.txt` trace (`glfw/glfw@92dcf4ce74`) | Direct repo read, call-site trace | 2026-09-26 | Source of the confirmed build-time-not-configure-time false positive for the M-G-18 network-touch grep |
| [Wave-1 audit: `exemplar-deps-and-dual-build.md`](../../cmake-audit/exemplar-deps-and-dual-build.md) | This program's own prior measurement pass, old SHAs | 2026-09-06 | Baseline this dive re-measures against; cited for the pre-existing `find_ocx` `file(DOWNLOAD)` measurement, reused rather than repeated |
| [Topic map: `cmake-topic-map.md`, §G rows M-G-01–M-G-20](../../cmake-topic-map.md) | This program's synthesized question set | 2026-09-06/26 | The brief this dive answers; cited for the exact questions and priority/severity framing |
| [Era-recheck: `era-recheck-2026-09-26.md`](../../cmake-topic-map/era-recheck-2026-09-26.md) | This program's freshness check | 2026-09-26 | Source of the CPM 0.43.2 / Hunter v0.26.12 current-version figures used throughout |
| Measurement: `microsoft/vcpkg@c4ee5a52d7:ports/vcpkg-cmake/vcpkg_cmake_configure.cmake:218` | Direct repo read | 2026-09-26 | Source of the systemic `FETCHCONTENT_FULLY_DISCONNECTED=ON` finding for the whole vcpkg ports tree |
| Measurement: `protocolbuffers/protobuf@c64743979d:cmake/dependencies.cmake` | Direct repo read | 2026-09-26 | Resolves protobuf's 3 opaque `${...-version}` `GIT_TAG` variables to a single centralized version file |
| Measurement: `curl/curl@98519dac83:tests/cmake/CMakeLists.txt:75-78` | Direct repo read | 2026-09-26 | Source of the `option(FROM_GIT_TAG "Git tag" "master")` floating-default finding |
| Measurement: `cpp-best-practices/cmake_template@b86318abbf:Dependencies.cmake` and `cmake/PackageProject.cmake` | Direct repo read | 2026-09-26 (repo unchanged since wave 1, `b86318abbf`) | Source of the `GIT_TAG "main"` through CPM finding and the deprecated one-arg `FetchContent_Populate` finding, both in a widely-copied starter template |
| Measurement: `grpc/grpc@0f8d72ed71:examples/cpp/cmake/common.cmake:65-97` | Direct repo read | 2026-09-26 | Source of the `vGRPC_TAG_VERSION_OF_YOUR_CHOICE` broken-placeholder finding |

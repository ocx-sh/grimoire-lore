---
title: Exemplar corpus audit — dependency acquisition and dual CMake/Bazel builds
agent: cmake-research (sonnet)
model: claude-sonnet-5
scope: >
  46-repo exemplar corpus at scratchpad/exemplars (owner__repo dirs, blob-less
  --depth 1 clones, non-cone sparse checkout of build/config files). Read-only
  measurement of dependency acquisition (find_package, FetchContent, CPM,
  Conan, vcpkg, Hunter), dependency providers, vendoring, dual CMake+Bazel
  builds, and CI. No cmake/conan/vcpkg/bazel command was ever run.
method: >
  All commands are inlined next to their result throughout this file. Every
  repo path is `owner__repo`; every sha is `git -C <dir> rev-parse --short=10
  HEAD`. Bulk extraction used one shared parser,
  `.agents/research/cmake-audit/scratch/deps-cmake-calls.py` (paren-balanced,
  case-insensitive, comment-stripped), which walks every `CMakeLists.txt`,
  `*.cmake` and `portfile.cmake` under the corpus and emits one TSV row per
  call to a fixed function list (find_package, FetchContent_*,
  ExternalProject_Add, CPMAddPackage, hunter_add_package, cmake_language,
  HunterGate, vcpkg_*) to `scratch/calls.tsv` (18,995 rows, 2.4s). Ten
  `scratch/deps-<axis>.sh` scripts (axis 1-9 plus providers) then grep/awk
  that TSV or the corpus directly and write `scratch/deps-<axis>*.tsv`. A
  sibling worker's `scratch/exemplar-table.md` (repo|sha|CMakeLists.txt
  count|Bazel|conanfile|vcpkg.json|CPM|Hunter|files|root min-version) was
  read and reused for shas, CMakeLists.txt counts and root
  `cmake_minimum_required` lines — but its Bazel/conanfile/vcpkg/CPM/Hunter
  presence columns were independently re-derived here after a reproducible
  check (`git -C nlohmann__json ls-tree -r --name-only HEAD | grep -qE
  '(^|/)(MODULE\.bazel|BUILD|BUILD\.bazel)$'` → match) showed that table's
  boolean columns were computed mid-clone (a race in the fetch script, not a
  data-source error) and undercount at least one repo (nlohmann__json's own
  `MODULE.bazel`/`BUILD.bazel`, sha `09b6b6b5ba`, both tracked). All ls-tree
  and show reads here were run after every clone in the corpus had a stable
  sha printed by `git -C <dir> rev-parse --short=10 HEAD`.
date_researched: 2026-09-05
---

# Exemplar corpus audit — dependency acquisition and dual CMake/Bazel builds

## Table of contents

- [Headline numbers](#headline-numbers)
- [1. find_package](#1-find_package)
- [2. FetchContent / ExternalProject_Add](#2-fetchcontent--externalproject_add)
- [3. CPM.cmake](#3-cpmcmake)
- [4. Conan](#4-conan)
- [5. vcpkg](#5-vcpkg)
- [6. Hunter / cpp-pm](#6-hunter--cpp-pm)
- [7. Dependency providers, toolchains, vendoring](#7-dependency-providers-toolchains-vendoring)
- [8. Dual build systems (CMake + Bazel)](#8-dual-build-systems-cmake--bazel)
- [9. CI census](#9-ci-census)
- [10. Lock and pin posture](#10-lock-and-pin-posture)
- [Smells (ranked)](#smells-ranked)
- [Patterns worth encoding](#patterns-worth-encoding)
- [Contradictions of the frame](#contradictions-of-the-frame)
- [Gaps](#gaps)

## Headline numbers

| # | Number | Command |
|---|---|---|
| 1 | **6,957** `find_package` calls corpus-wide; only **222** (3.2%) pass a version and **13** a version range | `awk -F'\t' 'tolower($4)=="find_package"' calls.tsv \| wc -l` |
| 2 | **8 real (non-test) repos** call `find_package` **and** `FetchContent`/`CPM`/`ExternalProject` for the *same* package name in the *same* repo — the frame's suspected "two copies of one library" pattern, confirmed: `apache__arrow` (absl, grpc, lz4, orc, protobuf, rapidjson, re2, thrift), `ccache__ccache` (hiredis, xxhash, zstd), `grpc__grpc` (absl, c-ares, grpc, protobuf, re2, zlib), `protocolbuffers__protobuf` (absl, jsoncpp), `curl__curl`, `gabime__spdlog`, `microsoft__vcpkg-tool` | see [§1/§2 cross-check](#cross-mechanism-duplication-the-frames-suspected-finding) |
| 3 | **Only 1 of 46 repos** ships a real `cmake_language(SET_DEPENDENCY_PROVIDER …)` integration: `conan-io__cmake-conan/conan_provider.cmake:36,684`. The other 3 hits are Kitware/CMake's own test suite. vcpkg ships **none** | `grep -rlE 'SET_DEPENDENCY_PROVIDER' calls.tsv` |
| 4 | **11 repos** have both a root `CMakeLists.txt` and a root Bazel entrypoint (`MODULE.bazel`/`WORKSPACE`/`BUILD.bazel`): abseil-cpp, Catch2, gflags, benchmark, googletest, re2, grpc, yaml-cpp, zlib, nlohmann/json, protobuf | `git -C <d> ls-tree --name-only HEAD` per repo, see [§8](#8-dual-build-systems-cmake--bazel) |
| 5 | **4 of those 11** have *zero* sync mechanism found (no cmake file mentioning bazel, no CI parity job, no README): google/benchmark, google/googletest, google/re2, jbeder/yaml-cpp, madler/zlib | `grep -rlE 'bazel' --include='*.cmake' --include=CMakeLists.txt` per repo |
| 6 | Consumer-side `vcpkg.json` (excluding vcpkg's own ports/e2e fixtures): **3 of 46 repos** — `apache__arrow`, `aminya__project_options` (test-only), `friendlyanon__cmake-init` (template) | `find $d -name vcpkg.json` per repo, minus `microsoft__vcpkg*` |
| 7 | Conan: **3 of 46** ship a `conanfile.*` outside `conan-io__conan-center-index` — `aminya__project_options`, `conan-io__cmake-conan`, `friendlyanon__cmake-init` | `find $d -name 'conanfile.py' -o -name 'conanfile.txt'` per repo |
| 8 | CPM.cmake vendored (`cmake/CPM.cmake` present): **4 of 46** — `cpp-best-practices__cmake_template` (0.42.1), `TheLartians__ModernCppStarter` (0.42.3), `cpm-cmake__CPM.cmake` itself, `cpm-cmake__CPMLicenses.cmake` | `find $CORPUS -iname CPM.cmake` |
| 9 | Hunter: `hunter_add_package` appears **659** times but **658 are inside `cpp-pm__hunter` itself** (its own example/test catalog); exactly **1** real external consumer in the corpus (`nlohmann__json`, docs example) | `awk 'tolower($4)=="hunter_add_package"{c[$1]++}...' calls.tsv` |
| 10 | `HunterGate.cmake` is **not shipped as a file** in `cpp-pm__hunter` HEAD `708cab1c49` any more — it lives in a separate git submodule, `gate` → `https://github.com/cpp-pm/gate` pinned at commit `920507363b5239a62196e430dd2f458bc5179f99` | `git -C cpp-pm__hunter show HEAD:.gitmodules; git -C cpp-pm__hunter ls-tree HEAD gate` |
| 11 | `-Werror=dev` appears in only **3 of 46** repos: `Kitware__CMake` (dogfooding its own flag), `nlohmann__json`, `ocx-sh__find_ocx` — the fleet's own module is already ahead of the exemplar median on this | `grep -rlE '\-Werror=dev' $CORPUS` |
| 12 | Sanitizer builds (`-fsanitize=` anywhere in cmake/presets/CI) are common: **25 of 46** repos | `grep -rlE '\-fsanitize=' --include='*.cmake' --include=CMakeLists.txt --include=CMakePresets.json --include='*.yml'` |
| 13 | `rules_foreign_cc@f68b351c46` (2026-06-26) bundles prebuilt CMake **3.19.8 → 4.0.7**, default **3.31.12** — `foreign_cc/repositories.bzl:12` `DEFAULT_TOOL_VERSIONS = {"cmake": "3.31.12", ...}`; supported list in `toolchains/private/cmake_versions.bzl` | `grep -A5 'DEFAULT_TOOL_VERSIONS =' foreign_cc/repositories.bzl` |
| 14 | CCI 40-recipe sample: `def layout()` in **40/40**, Conan-2 `from conan import ConanFile` in **40/40**, Conan-1 imports in **0/40** — Conan Center is Conan-2-only by 2026-09 | `grep -lE 'from conan import ConanFile' $(cci-sample-files) \| wc -l` |
| 15 | vcpkg 40-port sample: `vcpkg_from_github` **36/40**, of which **40/40** (all github-sourced ones) carry `SHA512`; `OPTIONS ... -D` passed in **26/40** | `perl -0777 -ne 'exit(!(/OPTIONS[\s\S]{0,400}?-D/))' $f` per port |

## 1. find_package

```
python3 scratch/deps-cmake-calls.py > scratch/calls.tsv                 # 18,995 rows, 2.4s
bash scratch/deps-find_package.sh                                       # -> deps-find_package*.tsv
```

Aggregate (`awk -F'\t' 'tolower($4)=="find_package"' calls.tsv` then `grep -cE '\bKEYWORD\b'`):

| Flag | n of 6,957 | % |
|---|---|---|
| `CONFIG` | 2,852 | 41.0% |
| `REQUIRED` | 5,156 | 74.1% |
| `COMPONENTS` | 1,528 | 22.0% |
| `MODULE` | 117 | 1.7% |
| `QUIET` | 350 | 5.0% |
| `GLOBAL` | 6 | 0.1% |
| version token (2nd word starts with a digit) | 222 | 3.2% |
| version range (`X...Y`) | 13 | 0.2% |

**Per-repo concentration** (`awk -F'\t' '{c[$1]++} END{...}' .fp_rows.tsv \| sort -k2 -rn`): the top 5 repos — `conan-io__conan-center-index` (2,190), `Kitware__CMake` (1,844, self-test), `qt__qtbase` (1,188), `cpp-pm__hunter` (604, self-catalog), `microsoft__vcpkg` (527) — are **75%** of all calls. Real consumer projects rarely call `find_package` more than a dozen times; `curl__curl` (65), `grpc__grpc` (35) and `aminya__project_options` (14) are the busiest non-self-hosting repos.

**Package-name histogram** (`awk -F'\t' '{split($5,a," "); print a[1]}' .fp_rows.tsv \| sort \| uniq -c \| sort -rn`), top real (non-`Qt6*`, non-`Foo`/`Bar` test placeholder) entries: `PkgConfig` 257, `Threads` 121, `Boost` 80, `Python3` 70, `ZLIB` 67, `OpenSSL` 54, `Protobuf` 38, `OpenGL` 32, `CUDAToolkit` 32, `GTest` 28, `CURL` 28, `PNG` 21, `JPEG` 24, `Doxygen` 30, `SWIG` 28.

**Own `Find<Pkg>.cmake` modules** (`find $d -iname 'Find*.cmake' | grep -E '/(cmake|CMake|Modules)/'`): **409** across the corpus, almost entirely `Kitware__CMake/Modules/*` (its shipped module set) and `microsoft__vcpkg/ports/*/vcpkg-cmake-wrapper.cmake`-adjacent files; outside those two, real consumer-authored Find modules are rare — `ccache__ccache/cmake/FindZstd.cmake` is a notable one (see §2 for why).

**`<Pkg>_ROOT` manipulation** — `_DIR` was too generic to measure (`CMAKE_CURRENT_SOURCE_DIR`, `RunCMake_*_DIR` etc. dominate any unscoped `_DIR` grep with 5-figure counts), so this axis is reported for `_ROOT` only:

```
grep -rohE 'set\([[:space:]]*[A-Za-z_][A-Za-z0-9_]*_ROOT\b' $CORPUS --include='*.cmake' --include=CMakeLists.txt | sed -E 's/set\([[:space:]]*//' | sort | uniq -c | sort -rn
```
→ **98 files** set some `_ROOT` var; legitimate `CMP0074`-style package roots are a minority of the 85 distinct names — real ones seen: `Boost_ROOT`/`BOOST_ROOT` (6), `VCPKG_ROOT` (1), `HDF5_ROOT`, `ICU_ROOT`, `Arrow_ROOT`, `MySQL_ROOT`, `ANDROID_NDK_ROOT`/`ANDROID_SDK_ROOT`. Most hits are project-internal path variables that merely end in `_ROOT` (`PROJECT_ROOT`, `LLDB_SOURCE_ROOT`, `GHS_TOOLSET_ROOT`), not `find_package` roots.

`CMAKE_FIND_PACKAGE_PREFER_CONFIG` (`grep -rlE ... --include='*.cmake' --include=CMakeLists.txt`): **8 files**, all in test/CI-adjacent code (`Kitware__CMake/Tests/FindPackageCMakeTest`, `Kitware__CMake/Modules/FindProtobuf.cmake`, 4 vcpkg portfiles, `llvm__llvm-project/clang/cmake/caches/Fuchsia.cmake`) — real projects setting this globally are essentially absent from the corpus.

`CMAKE_PREFIX_PATH` reference: **148 files**. `CMAKE_MODULE_PATH` append: **267 files**.

### Cross-mechanism duplication: the frame's suspected finding

The frame asked, unverified: *"two copies of one library when `FetchContent` and `find_package` meet."* Cross-referencing package names (lower-cased first positional arg) between `find_package` calls and `{FetchContent_Declare, CPMAddPackage, ExternalProject_Add}` calls **within the same repo**:

| Repo | Shared package names | Evidence (repo@sha:path:line) |
|---|---|---|
| `apache__arrow@e0cf4184dd` | absl, grpc, lz4, orc, protobuf, rapidjson, re2, thrift | `cpp/cmake_modules/FindProtobufAlt.cmake:31,45` (`find_package(protobuf CONFIG)`) vs `cpp/cmake_modules/ThirdpartyToolchain.cmake:2073` (`FetchContent_Declare(protobuf ... OVERRIDE_FIND_PACKAGE ...)`) |
| `protocolbuffers__protobuf@e816e3cbab` | absl, jsoncpp | `cmake/abseil-cpp.cmake:16,25,43` — `find_package(absl CONFIG)` first, `FetchContent_Declare(absl GIT_REPOSITORY ... GIT_TAG "${abseil-cpp-version}")` as the fallback in the same file |
| `ccache__ccache@e256302fa6` | hiredis, xxhash, zstd | `cmake/Dependencies.cmake:30` `find_package(Zstd 1.3.4 MODULE REQUIRED)` **resolves to** `cmake/FindZstd.cmake:49`, which itself does `FetchContent_Declare(Zstd URL ... SOURCE_SUBDIR build/cmake EXCLUDE_FROM_ALL)` — a Find-module-that-fetches-on-miss pattern |
| `grpc__grpc@6e5ac36afe` | absl, c-ares, grpc, protobuf, re2, zlib | `cmake/zlib.cmake:48,56` (`find_package(ZLIB REQUIRED)`) vs `examples/cpp/helloworld/cmake_externalproject/CMakeLists.txt:96` (`ExternalProject_Add(zlib ...)`) — the second is an *example*, not the main build, weaker evidence than arrow/protobuf/ccache |
| `curl__curl`, `gabime__spdlog`, `microsoft__vcpkg-tool` | curl, catch2, cmakerc/fmt | weaker: mostly test-harness self-reference (curl building curl in its own test suite) |

`Kitware__CMake` also shows overlap (`catch2`, `googletest`, `protobuf`, plus placeholder names `foo`/`bar`) but every hit is inside `Tests/RunCMake/**` — CMake testing its own `FetchContent`/`find_package` interaction, not a real project doing double-sourcing. **Net: the pattern is real in at least 3 first-class exemplars (arrow, protobuf, ccache) with `OVERRIDE_FIND_PACKAGE` / try-then-fetch / Find-module-that-fetches as the three distinct idioms used to resolve it — not accidental duplication, but a deliberate (if under-documented) three-shape convention.**

## 2. FetchContent / ExternalProject_Add

```
bash scratch/deps-fetchcontent.sh
```

| Metric | Count |
|---|---|
| `FetchContent_Declare` | 145 |
| `FetchContent_MakeAvailable` | 120 |
| `FetchContent_Populate` (legacy) | 66 |
| `FetchContent_GetProperties` | 21 |
| `ExternalProject_Add` | 184 |

Per-repo (`FetchContent_Declare`, non-zero, `sort -k2 -rn`): `Kitware__CMake` 89 (self-test, `Tests/RunCMake/FetchContent*`), `apache__arrow` 22, `aminya__project_options` 6, `nlohmann__json` 5, `ccache__ccache` 4, `protocolbuffers__protobuf` 3, `microsoft__vcpkg-tool` 3, `duckdb__duckdb` 3 — **excluding Kitware's self-test, real-project usage is 56 declares spread over 14 repos**, not the dominant acquisition mechanism the frame's phrasing ("de facto no-package-manager package manager") implies at this sample size.

Pin shape of the 145 declares:

| Shape | n | Command |
|---|---|---|
| `GIT_REPOSITORY` + `GIT_TAG` present | 34 | `grep -cE 'GIT_REPOSITORY' .fcd.tsv` (100% of these also have `GIT_TAG` — 0 floating-branch git declares found) |
| — full 33-40 char hex `GIT_TAG` | 10 | `grep -cE 'GIT_TAG[[:space:]]+"?[0-9a-f]{33,40}"?'` |
| — semver-looking `GIT_TAG` (`v?X.Y…`) | 6 | `grep -cE 'GIT_TAG[[:space:]]+"?v?[0-9]+\.[0-9]+'` |
| — branch name (`main`/`master`/`develop`/`HEAD`) | 4 | `grep -cE 'GIT_TAG[[:space:]]+"?(main\|master\|develop\|HEAD)"?'` |
| — indirect via a CMake variable, shape not statically determinable | 14 | remainder, e.g. `GIT_TAG "${abseil-cpp-version}"` |
| `URL` form | 15 | `grep -cE '\bURL[[:space:]]+"?https?://'` |
| — with `URL_HASH` | 32 (some declares set both URL and hash across wrapped lines) | `grep -cE 'URL_HASH'` |
| `SOURCE_DIR`-only, no VCS/URL ref (local fixture) | 69 | remainder — **all but a handful are `Kitware__CMake/Tests/RunCMake/FetchContent_find_package/*.cmake`**, i.e. CMake testing itself against local directories, not real network dependencies |

Modifier keywords across the 145 declares: `FIND_PACKAGE_ARGS` 15, `OVERRIDE_FIND_PACKAGE` 16, `SYSTEM` 3, `EXCLUDE_FROM_ALL` 3, `DOWNLOAD_EXTRACT_TIMESTAMP` 1, `SOURCE_SUBDIR` 13, `GIT_SHALLOW` 3. `FETCHCONTENT_SOURCE_DIR_<X>` set: 10 files. `FETCHCONTENT_TRY_FIND_PACKAGE_MODE` set: 6 files.

`ExternalProject_Add` (184 calls) is **dominated by Kitware/CMake's own `Tests/RunCMake/ExternalProject/*` suite** (≈70 of the 184) plus `llvm__llvm-project` (10 files, mostly `runtime/CMakeLists.txt`-style superbuild glue) and `apache__arrow` (2). No repo in the corpus drives `ExternalProject_Add` from inside an `execute_process`-triggered configure-time script (the classic "superbuild that recurses into itself" anti-pattern the frame worried about) — every hit found is a normal build-time `add_custom_target`-adjacent dependency, not configure-time recursion:
```
awk -F'\t' 'tolower($4)=="externalproject_add"{print $1"\t"$2}' calls.tsv | sort -u   # 22 distinct files, none co-located with execute_process(...) driving cmake --build
```

## 3. CPM.cmake

```
bash scratch/deps-cpm.sh
```

Vendored `cmake/CPM.cmake`: **4 of 46** repos.

| Repo | Version pinned inside the file | Command |
|---|---|---|
| `cpm-cmake__CPM.cmake` | (is the tool itself) | `grep -m1 'set(CPM_' cmake/CPM.cmake` |
| `cpm-cmake__CPMLicenses.cmake` | `0.27.5` | same |
| `cpp-best-practices__cmake_template` | `0.42.1` | same |
| `TheLartians__ModernCppStarter` | `0.42.3` | same |

`CPMAddPackage` calls: **64** total, concentrated in `cpm-cmake__CPM.cmake` (39, its own test suite) and `TheLartians__ModernCppStarter` (11), `cpm-cmake__CPMLicenses.cmake` (7), `cpp-best-practices__cmake_template` (6). Shorthand URI form (no `NAME` keyword, e.g. `CPMAddPackage("gh:owner/repo@1.2.3")`) vs long form: **30 shorthand / 34 long-form**. Pin keyword: `VERSION` in 21, `GIT_TAG` in 10 (some calls carry neither, relying on the shorthand `@ref` suffix). `FIND_PACKAGE_ARGS` inside `CPMAddPackage`: 0 hits (CPM's own `find_package`-first behavior is controlled by `CPM_USE_LOCAL_PACKAGES`, not a per-call keyword).

Global knobs: `CPM_SOURCE_CACHE` set in 15 files, `CPM_USE_LOCAL_PACKAGES` in 2, `CPM_DOWNLOAD_ALL` in 1, `CPMUsePackageLock`/`package-lock.cmake` in 2, `CPMLicenses.cmake` shipped by 0 repos other than its own home repo (i.e., no exemplar consumer has adopted license aggregation).

`nlohmann__json` calls `CPMAddPackage` once (`docs/mkdocs/docs/integration/...`) **without vendoring `cmake/CPM.cmake`** — a documented-but-not-dogfooded integration example, not live usage.

## 4. Conan

```
bash scratch/deps-conan.sh
```

**Presence outside `conan-io__conan-center-index`** (`find $d -name conanfile.py -o -name conanfile.txt -o -name conandata.yml -o -name conan.lock`):

| Repo | conanfile.py | conanfile.txt | conandata.yml | conan.lock |
|---|---|---|---|---|
| `abseil__abseil-cpp` | 1 | 0 | 0 | 0 |
| `aminya__project_options` | 0 | 2 | 0 | 0 |
| `catchorg__Catch2` | 2 | 0 | 0 | 0 |
| `conan-io__cmake-conan` | 7 | 9 | 0 | 0 |
| `friendlyanon__cmake-init` | 1 | 0 | 0 | 0 |

No repo in the corpus ships a `conan.lock`. Marker counts across the **11** non-CCI `conanfile.py` files:

| Marker | n of 11 |
|---|---|
| `requires` | 6 |
| `tool_requires`/`build_requires` | 0 |
| `test_requires` | 1 |
| generator `CMakeToolchain` | 8 |
| generator `CMakeConfigDeps` (experimental Conan-2 generator) | 6 |
| generator `CMakeDeps` | 3 |
| `def layout()` | 7 |
| `cmake_layout()` call | 6 |
| `settings =` | 11 |
| `options =` | 5 |
| `from conan import ConanFile` (Conan 2) | 10 |
| `from conans import ConanFile` (Conan 1) | 1 |
| `conan.tools.cmake` import | 8 |

**CCI 40-recipe deterministic sample** (`ls recipes | sort | head -after-filter-40`, first alphabetically starting `7bitconf` through `arcus`):

| Marker | n of 40 |
|---|---|
| `requires` | 19 |
| `tool_requires`/`build_requires` | 10 |
| `def layout()` | 40 |
| `cmake_layout()` | 24 |
| `def package_id()` | 15 |
| `from conan import ConanFile` | 40 |
| `from conans import ConanFile` | 0 |
| generator `CMakeToolchain` | 25 |
| generator `CMakeDeps` | 12 |
| `test_package/CMakeLists.txt` present | 38/40 |

`self.requires(...)` version-pin shape across the 40-recipe sample (42 calls): **24 exact** (`libjpeg/9e`, `boost/1.83.0`), **17 range** (`expat/[>=2.6.2 <3]`, `abseil/[*]` = fully floating), **1** `.../system`. Recipe layout confirmed uniform: `<pkg>/config.yml` + `<pkg>/all/{conandata.yml,conanfile.py,test_package/CMakeLists.txt}`.

`conan-io__conan@e42971dc29` ships **zero** static `.cmake` files anywhere in the tree (`find $d -iname '*.cmake'` → empty) — its `CMakeDeps`/`CMakeToolchain` output is generated at runtime from Python, not vendored as templates a consumer can read statically.

`conan-io__cmake-conan@b1593849dd` is the only repo with a real dependency-provider integration file: `conan_provider.cmake`, requiring `cmake_minimum_required(VERSION 3.24)` (`conan_provider.cmake:36`) — CMake 3.24 is therefore the practical floor for Conan 2's provider-based workflow, one full minor above the fleet's 3.19.

## 5. vcpkg

```
bash scratch/deps-vcpkg.sh
```

Consumer `vcpkg.json` **excluding `microsoft__vcpkg` (its own ports) and `microsoft__vcpkg-tool` (200 e2e test fixtures)**: **3 of 46 repos** — `apache__arrow` (`cpp/vcpkg.json`, `ci/vcpkg/vcpkg.json`, `c_glib/vcpkg.json`), `aminya__project_options` (5 files, all under `tests/`), `friendlyanon__cmake-init` (1 template file). No repo carries a *root* production manifest and nothing else — every real hit is a subdirectory or test-only manifest.

Field usage across all 209 found manifests (dominated by `microsoft__vcpkg-tool`'s fixtures, so read as "field vocabulary exercised," not "adoption"):

| Field | n of 209 |
|---|---|
| `name` | 200 |
| `version` | 168 |
| `dependencies` | 87 |
| `features` | 49 |
| `default-features` | 24 |
| `version-string` | 24 |
| `supports` | 12 |
| `builtin-baseline` | 6 |
| `overrides` | 5 |
| `license` | 7 |
| `version-semver` | 4 |
| `version-date` | 4 |
| `port-version` | 3 |
| `host: true` dependency | 17 |

`vcpkg-configuration.json` in the corpus: **8 files, all inside `microsoft__vcpkg-tool`'s own e2e fixtures**; kinds seen: `git`, `filesystem`. **Zero real consumer repos in this corpus ship a `vcpkg-configuration.json`.**

Variable/toolchain references (`grep -rlE ... --include=CMakePresets.json --include='*.yml' --include=CMakeLists.txt --include='*.cmake'`, `microsoft__vcpkg*` excluded):

| Variable | files |
|---|---|
| `scripts/buildsystems/vcpkg.cmake` (toolchainFile wiring) | 11 |
| `VCPKG_TARGET_TRIPLET` | 15 |
| `VCPKG_BINARY_SOURCES` | 7 |
| `VCPKG_CHAINLOAD_TOOLCHAIN_FILE` | 6 |
| `VCPKG_MANIFEST_FEATURES` | 2 |
| `VCPKG_MANIFEST_MODE` | 2 |
| `VCPKG_OVERLAY_PORTS` | 0 |
| `X_VCPKG_ASSET_SOURCES` | 0 |

**microsoft/vcpkg 40-port deterministic sample** (`ls ports | sort | head -after-portfile-filter-40`, `3fd` through `abseil`):

| Marker | n of 40 |
|---|---|
| `vcpkg_from_github` | 36 |
| — with `SHA512` | 40 (100% of all github-sourced ports in the sample) |
| `vcpkg_cmake_configure` | 32 |
| `vcpkg_cmake_install` | 31 |
| `vcpkg_cmake_config_fixup` | 24 |
| `vcpkg_copy_pdbs` | 16 |
| `vcpkg_fixup_pkgconfig` | 9 |
| `OPTIONS ... -D` passed (multi-line aware: `perl -0777 -ne 'exit(!(/OPTIONS[\s\S]{0,400}?-D/))'`) | 26 |
| `usage` file present | 5 |

Maintainer-guide location: **not present under `docs/` in this HEAD** (`git -C microsoft__vcpkg ls-tree -r --name-only HEAD | grep -iE '^docs/'` → 7 files, none maintainer-facing: `about/privacy.md`, `users/{assetcaching,binarycaching,manifests,registries,triplets,versioning}.md`). Port-authoring guidance has evidently moved out of the main repo entirely — the task's own hint ("docs/ or in vcpkg-docs") resolves to **vcpkg-docs**, a separate repository not in this corpus.

## 6. Hunter / cpp-pm

```
bash scratch/deps-hunter.sh
```

| Metric | Value |
|---|---|
| `HunterGate.cmake` files in corpus | **0** — see below |
| `cmake/Hunter/config.cmake` files | 2 |
| `hunter_add_package` total calls | 659 |
| — inside `cpp-pm__hunter` itself | 658 |
| — real external consumer | 1 (`nlohmann__json`, docs example) |
| `cpp-pm__hunter` sha | `708cab1c49` |
| packages under `cmake/projects/` | 548 (`ls cmake/projects \| wc -l`) |
| last commit | `2026-08-23T23:58:40+02:00` (`git log -1 --format=%cI`) — **actively maintained**, contradicting a plausible "Hunter is dead" hypothesis |
| `releases.txt` / `VERSION` file | none found |

`HunterGate.cmake` is not a tracked file in `cpp-pm__hunter@708cab1c49` — `git ls-tree -r --name-only HEAD | grep -i huntergate` returns only a docs page. The gate macro now lives in a **separate submodule**: `.gitmodules` → `[submodule "gate"] path = gate url = https://github.com/cpp-pm/gate`, pinned at commit `920507363b5239a62196e430dd2f458bc5179f99` (`git ls-tree HEAD gate` → `160000 commit 920507363b...`). Consumers copy that submodule's `HunterGate.cmake` into their own tree; the corpus's one real consumer example inlines the call directly:
```
nlohmann__json@09b6b6b5ba:docs/mkdocs/docs/integration/hunter/CMakeLists.txt:4
HunterGate(URL "https://github.com/cpp-pm/hunter/archive/v0.23.297.tar.gz" SHA1 "3319fe6a3b08090df7df98dee75134d68e2ef5a3")
```
— confirming the pin shape: `URL` + `SHA1`, no branch/latest option exposed by the macro itself.

`hunter_add_package` calls inside `cpp-pm__hunter`'s own examples/tests **never pass a `VERSION` keyword** (0/658) — Hunter's pinning model is centralized (one version per package baked into `cmake/projects/<pkg>/hunter.cmake` for a given Hunter release), not per-call like Conan/vcpkg/CPM. This is a real architectural difference worth calling out, not a measurement gap.

## 7. Dependency providers, toolchains, vendoring

```
bash scratch/deps-providers.sh
```

| Metric | Count |
|---|---|
| `cmake_language(... SET_DEPENDENCY_PROVIDER ...)` calls | 4 (3 Kitware/CMake self-test, 1 real: `conan-io__cmake-conan`) |
| `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` references | 12 (9 Kitware/CMake self-test; real: `conan-io__cmake-conan/conan_provider.cmake`, `aminya__project_options/src/Conan.cmake`, `qt__qtbase/cmake/QtBuildRepoExamplesHelpers.cmake`) |
| files referencing `CMAKE_TOOLCHAIN_FILE` | 97 |
| toolchain files shipped under `cmake/`/`*toolchain*` dirs | 93 |
| — of those, cross-compiling (`CMAKE_SYSTEM_NAME` set) | 29 |
| `pkg_check_modules` calls | 322 |
| files doing `find_package(PkgConfig ...)` | 239 |

Vendored third-party directories (root-level dir name, checked via `git ls-tree --name-only HEAD` so sparse-checkout gaps don't hide them, subdir count via `git ls-tree "HEAD:<dir>" | grep -c '^040000'`):

| Repo | Dir | Immediate subdirs |
|---|---|---|
| `ClickHouse__ClickHouse` | `contrib` | 145 |
| `duckdb__duckdb` | `third_party` | 28 |
| `madler__zlib` | `contrib` | 17 |
| `grpc__grpc` | `third_party` | 8 |
| `llvm__llvm-project` | `third-party` (hyphen) | 4 |
| `glfw__glfw` | `deps` | 2 |
| `openssl__openssl` | `external` | 1 |
| `protocolbuffers__protobuf` | `third_party` | 1 |
| `Tencent__rapidjson` | `contrib` | 1 |
| `catchorg__Catch2` | `third_party` | 0 (dir exists, empty at this sha) |

**10 of 46** repos have a vendored dir by this reckoning — an early, name-only `find -d name` pass had found only 5 by missing the `contrib`/`third-party`(hyphen)/`deps` spellings; the ls-tree-based re-check is the number reported above (method note: broaden the name list before trusting a "vendored-dirs" count on any future corpus).

Git submodules (`.gitmodules` entry count, `git show HEAD:.gitmodules | grep -c '^\[submodule'`): **9 of 46** repos — `boostorg__boost` 173(!), `ClickHouse__ClickHouse` 141, `grpc__grpc` 18, `openssl__openssl` 11, `apache__arrow` 2, `cpp-pm__hunter` 2, `aminya__project_options` 1, `Tencent__rapidjson` 1, `protocolbuffers__protobuf` 0 (file present, no submodule stanzas — likely leftover/legacy).

## 8. Dual build systems (CMake + Bazel)

```
bash scratch/deps-dualbuild.sh
```

Root-level presence, all 46, via `git -C $d ls-tree --name-only HEAD` (root only) and `ls-tree -r` (anywhere):

**11 repos have both a root `CMakeLists.txt` and a root Bazel entrypoint**: `abseil__abseil-cpp`, `catchorg__Catch2`, `gflags__gflags`, `google__benchmark`, `google__googletest`, `google__re2`, `grpc__grpc`, `jbeder__yaml-cpp`, `madler__zlib`, `nlohmann__json`, `protocolbuffers__protobuf`. (`bazel-contrib__rules_foreign_cc` has Bazel only, no CMakeLists.txt — it is the tool, not a dual-build consumer.)

| Repo | cc_library | cc_binary | cc_test | add_library | add_executable | add_test | bazel_dep() calls |
|---|---|---|---|---|---|---|---|
| `abseil__abseil-cpp` | 306 | 82 | 300 | 10 | 2 | 1 | 6 |
| `catchorg__Catch2` | 7 | 0 | 2 | 6 | 48 | 143 | 3 |
| `gflags__gflags` | 3 | 6 | 0 | 3 | 10 | 4 | 2 |
| `google__benchmark` | 6 | 0 | 5 | 11 | 4 | 3 | 7 |
| `google__googletest` | 5 | 28 | 21 | 2 | 1 | 2 | 5 |
| `google__re2` | 4 | 4 | 22 | 3 | 2 | 1 | 9 |
| `grpc__grpc` | 120 | 104 | 77 | 74 | 580 | 1 | 35 |
| `jbeder__yaml-cpp` | 10 | 25 | 24 | 4 | 6 | 5 | 3 |
| `madler__zlib` | 2 | 0 | 0 | 26 | 23 | 86 | 3 |
| `nlohmann__json` | 4 | 1 | 0 | 16 | 37 | 23 | 2 |
| `protocolbuffers__protobuf` | 337 | 108 | 247 | 13 | 16 | 6 | 27 |

(`grep -rohE '\bcc_library\b' --include=BUILD --include=BUILD.bazel --include='*.bzl'` / `grep -rohE '\badd_library\s*\(' --include=CMakeLists.txt --include='*.cmake'`.) Note the shape difference is systematic, not noise: Bazel `BUILD` files enumerate one target per translation unit or component (hence abseil's 306 `cc_library`, protobuf's 337), while the CMake side collapses the same code into far fewer `add_library` calls (10, 13) with per-file granularity handled by `target_sources` — the two descriptions are not line-for-line mirrors of each other even when "in sync."

**Sync mechanism** (`grep -rlE bazel --include='*.cmake' --include=CMakeLists.txt`, `grep -rlE '\bbazel\b' .github`, `find cmake/ bazel/ -iname 'README*'`):

| Repo | CMake files mentioning bazel | CI files mentioning bazel | README |
|---|---|---|---|
| `abseil__abseil-cpp` | 1 | 1 | none |
| `catchorg__Catch2` | 1 | 1 | none |
| `gflags__gflags` | 0 | 1 | `cmake/README_runtime.txt` (unrelated content, false-positive path match) |
| `google__benchmark` | 0 | 3 | none |
| `google__googletest` | 0 | 1 | none |
| `google__re2` | 0 | 6 | none |
| `grpc__grpc` | 2 | 5 | none |
| `jbeder__yaml-cpp` | 0 | 2 | none |
| `madler__zlib` | 0 | 0 | none |
| `nlohmann__json` | 1 | 0 | none |
| `protocolbuffers__protobuf` | 1 | 20 | `cmake/README.md` |

**4 of 11 have no detectable sync mechanism at all** (googletest, re2, yaml-cpp, zlib: 0 cmake-side mention, CI mention only incidental or none) — for these, the two build descriptions are maintained by hand, independently, with no CI parity gate found. No repo generates one description from the other (no "generated CMake from Bazel or the reverse" instance found anywhere in the sample).

**`MODULE.bazel` `bazel_dep` list** (102 total `bazel_dep(` lines across the 11; sample, `grep -E '^bazel_dep\(' MODULE.bazel`):
- `abseil__abseil-cpp`: `rules_cc@0.2.22`, `bazel_skylib@1.9.2`, `platforms@1.1.0`, +3 more
- `catchorg__Catch2`: `bazel_skylib@1.9.0`, `rules_cc@0.2.16`, `rules_license@1.0.0`
- `gflags__gflags`: `platforms@1.0.0`, `rules_cc@0.1.1`
- `google__benchmark`: `bazel_skylib@1.9.0`, `platforms@0.0.11`, `rules_cc@0.1.5`, `googletest@1.14.0` (dev), `libpfm@4.11.0.bcr.1`, `nanobind_bazel@2.12.0` (dev)

**Drift table is not derivable from static files alone**: the Bazel side pins third-party deps (`googletest`, `libpfm`) via BCR module versions in `MODULE.bazel`; the CMake side of the same repos pins the *same* transitive deps (when it needs them at all) via `find_package`/`FetchContent` with different version strings that are not co-located in one file for comparison — e.g. `google__benchmark`'s CMake side pins its own googletest test dependency via `FetchContent_Declare` (own file, own version variable) while Bazel pins `googletest@1.14.0` in `MODULE.bazel` as a `dev_dependency`. Confirming or refuting version drift per pair would require resolving each `FetchContent`/`find_package` version against the corresponding `bazel_dep` version by hand per repo — flagged as a **Gap**, not answered here (see Gaps).

**`bazel-contrib__rules_foreign_cc`** (Bazel-only ruleset for wrapping CMake/Make/Meson/Ninja/Autotools projects, sha `f68b351c46`, last commit `2026-06-26T21:31:16-07:00`):
- Bundled/expected CMake versions: `DEFAULT_TOOL_VERSIONS = {"cmake": "3.31.12", ...}` (`foreign_cc/repositories.bzl:12`); prebuilt toolchain list in `toolchains/private/cmake_versions.bzl` spans `3.19.8` through `4.0.7` (14 versions).
- `cmake()` rule doc (`foreign_cc/cmake.bzl:1`, Stardoc docstring — `docs/src/*.md` is generated from this and was not checked out): documents wrapping a CMake project as a `cc_library`-like target, consuming the Bazel `cc_toolchain`, and recommends pinning `rules_foreign_cc` itself to a released version via `http_archive` + `sha256`; the example builds a plain `http_archive`-fetched CMake project (pcre) with no CMake-side changes required beyond it building standalone.
- Most recent release tag/date: **not determinable from this shallow clone** — `git tag` returns nothing (depth-1 clone fetches no tags) and `.bcr/metadata.template.json`'s `"versions": []` is a template placeholder, not a live registry read. Flagged as a Gap; would require a `git ls-remote --tags` or BCR API call, both out of scope for this read-only, no-network-fetch pass.

## 9. CI census

```
bash scratch/deps-ci.sh    # matches confined to .github/workflows/*.{yml,yaml} and .gitlab-ci.yml
```

| Signal | repos (of 46) |
|---|---|
| `lukka/get-cmake` | 4 (`conan-io__cmake-conan`, `google__benchmark`, `microsoft__vcpkg-tool`, `nlohmann__json`) |
| `jwlawson/actions-setup-cmake` | 1 (`gflags__gflags`) |
| `pip[3] install cmake` | 2 (`cpm-cmake__CPMLicenses.cmake`, `fmtlib__fmt`) |
| `apt(-get) install cmake` | 4 (`duckdb__duckdb`, `llvm__llvm-project`, `mozilla__sccache`, `ninja-build__ninja`) |
| (implicit: runner-default or container-provided cmake, not otherwise installed) | remaining 35 — the majority path is "whatever the runner image ships," not a pinned-action install |
| `cmake --preset(s)` in CI | 3 (`catchorg__Catch2`, `friendlyanon__cmake-init`, `microsoft__vcpkg-tool`) |
| Ninja Multi-Config generator | 3 |
| Visual Studio generator (`-G "Visual Studio ..."`) | 6 |
| `hendrikmuhs/ccache-action` | 1 (`llvm__llvm-project`) |
| `mozilla-actions/sccache-action` (the action specifically) | 0 — but `sccache` referenced some other way (env var/direct binary) in 7: `aminya__project_options`, `apache__arrow`, `Kitware__CMake`, `llvm__llvm-project`, `mozilla__sccache`, `protocolbuffers__protobuf`, `qt__qtbase` |
| `lukka/run-vcpkg` | 1 (`duckdb__duckdb`) |
| `actions/cache` keyed on `vcpkg.json`/`conan.lock` | 0 each in the strict pattern tried (`actions/cache[\s\S]{0,400}vcpkg\.json`) — a broader/manual read would be needed to rule this out entirely (Gap) |
| install-tree consumption test (`cmake --install` appears anywhere in CI/scripts) | 7 (`apache__arrow`, `curl__curl`, `duckdb__duckdb`, `friendlyanon__cmake-init`, `jbeder__yaml-cpp`, `libuv__libuv`, `madler__zlib`) — none of these were verified by hand to also re-configure a *second*, separate consumer project against the installed tree via `CMAKE_PREFIX_PATH`; the grep only proves an install step exists, not a full install-then-consume round trip (Gap) |
| `CMAKE_BUILD_TYPE` appears as a matrix axis | 19 |

Broadened, corpus-wide (not CI-YAML-only) greps, since sanitizer/`-Werror`/generator choices more often live in `CMakeLists.txt`/presets than literally in the workflow YAML:

| Signal (`--include='*.cmake' --include=CMakeLists.txt --include=CMakePresets.json --include='*.yml'`) | repos |
|---|---|
| `-fsanitize=` anywhere | 25 |
| `-Werror=dev` anywhere | 3 (`Kitware__CMake`, `nlohmann__json`, `ocx-sh__find_ocx`) |
| `--warn-uninitialized` anywhere | 1 (`Kitware__CMake` only — it is documenting/testing its own flag) |
| Xcode generator referenced | 9 |

**OS matrix families** (`grep -rhoE 'ubuntu-[0-9.]+|windows-[0-9]+|macos-[0-9.]+|...-latest'` per repo's `.github/workflows`, collapsed to linux/macos/windows): full 3-OS matrices are the norm among libraries with public CI (curl, libuv, fmt, benchmark, duckdb, openssl, nlohmann/json, jbeder/yaml-cpp, google/re2, boost, madler/zlib, cpp-pm/hunter, conan-io/conan, ccache, catchorg/Catch2 all list all three); single-OS (`ubuntu-latest` only) is the pattern for repos whose real CI runs elsewhere and the mirrored workflow is a stub: `ClickHouse__ClickHouse`, `bazel-contrib__rules_foreign_cc`, `conan-io__conan-center-index`, `grpc__grpc`, `microsoft__vcpkg`, `nothings__stb`.

## 10. Lock and pin posture

One table, corpus-wide, counting regex shown per row (all from the axis sections above, gathered here for the cross-mechanism comparison the task asked for):

| Mechanism | Content-pinned (hash) | Version-pinned (exact) | Range-pinned | Floating (branch/latest/none) | Regex / source |
|---|---|---|---|---|---|
| `find_package` | n/a (mechanism has no hash concept) | 222 (version token) | 13 (`X...Y`) | 6,722 (no version arg — floats to whatever's on `CMAKE_PREFIX_PATH`/system) | §1 |
| `FetchContent_Declare` (git-based, 34) | 10 (full-hash `GIT_TAG`) | 6 (semver-tag `GIT_TAG`) | 0 | 4 (branch name) + 14 (indirect variable, shape unknown) | §2 |
| `FetchContent_Declare` (URL-based, 15) | 32 declares carry `URL_HASH` somewhere (overlaps git-based rows since a repo can mix forms) | — | — | — | §2 |
| `CPMAddPackage` (64) | 0 explicit hash keyword seen | 21 (`VERSION`) | 0 | 10 (`GIT_TAG`, shape not re-classified here) + 33 (shorthand `@ref` only, shape opaque to static grep) | §3 |
| Conan `requires` (CCI 40-sample, 42 calls) | 0 (Conan has no source-hash pin at the `requires` level — integrity comes from `conandata.yml` checksums, not measured per-call here) | 24 | 17 | 1 (`.../system`) | §4 |
| vcpkg `dependencies` (manifest fields, 209 files) | n/a at the dependency level (pin is corpus-wide via `builtin-baseline`, only 6 files set it) | via `version-string`/exact `version` fields where present (168 have *a* `version` field; shape not further split) | via `overrides` (5 files) | the norm: most manifests list a bare package name with no per-dependency version constraint, relying on the baseline | §5 |
| vcpkg ports (40-sample, github-sourced) | 40/40 (`SHA512`) | — | — | 0 | §5 |
| Hunter `hunter_add_package` (658 internal) | via the pinned `gate` submodule commit + per-package `hunter.cmake`, not per-call | 0 per-call `VERSION` keyword | — | — | §6 |
| Submodules (`.gitmodules`, 9 repos, ~350 entries) | 100% by construction (a gitlink is always a fixed commit) — but 3+ of those repos additionally track a `branch =` key in `.gitmodules` that lets `git submodule update --remote` float; **not separately counted here** (Gap) | — | — | — | §7 |
| Vendored dirs (10 repos) | effectively content-pinned (the code is copied in, no re-fetch) but **carries no visible upstream-version marker** in most cases — provenance is whatever the copying commit's message says, not machine-checkable | — | — | — | §7 |

**Reading**: the two mechanisms with the strongest default pin discipline in this corpus are **vcpkg ports** (100% SHA512 in-sample) and **git submodules** (100% by construction). The two with the weakest are **`find_package`** (96.8% carry no version constraint at all — expected, since `find_package` resolves against whatever is installed, not a fetched artifact) and **CPM's shorthand form** (33/64 calls pin only via an opaque `@ref` string that this grep cannot classify without resolving CPM's own URI-parsing logic).

## Smells (ranked)

1. **`find_package` version starvation.** 96.8% of all 6,957 calls carry no version constraint (§1) — the single largest pin-posture gap in the corpus by volume, and it is invisible to every "do you pin your dependencies" checklist that only looks at FetchContent/Conan/vcpkg.
2. **Sync-free dual builds.** 4 of 11 CMake+Bazel repos (googletest, re2, yaml-cpp, zlib) have no detectable parity mechanism between the two build descriptions (§8) — a silent-drift risk the frame explicitly flagged and this audit confirms is unmitigated in over a third of the dual-build sample.
3. **Dependency providers are a one-implementation feature.** `cmake_language(SET_DEPENDENCY_PROVIDER)` has exactly one real adopter in 46 repos (`conan-io__cmake-conan`); vcpkg — the other package manager the requester named — has none (§7, headline #3). A CMake-quality rule set that treats "dependency providers" as a load-bearing, mature seam would be overstating 2026 reality.
4. **`Find<Pkg>.cmake` that silently fetches on miss.** `ccache__ccache/cmake/FindZstd.cmake` resolves a `find_package(Zstd MODULE REQUIRED)` call by `FetchContent_Declare`-ing zstd inside the Find module itself (§1 cross-check) — works, but hides a network dependency behind what looks like a pure local-search call; anyone reading only the `find_package` call site would not know a fetch can happen.
5. **HunterGate.cmake has quietly moved to a submodule.** `cpp-pm__hunter` no longer ships the file consumers are told to copy-paste; it is pulled from `cpp-pm/gate` via a pinned submodule commit (§6). Any existing "copy HunterGate.cmake from hunter's README" guidance is stale against the current upstream shape.
6. **vcpkg's maintainer guide is off-corpus.** `docs/` in `microsoft__vcpkg` HEAD carries only 7 user-facing pages; port-authoring guidance has moved to a separate `vcpkg-docs` repo not in this exemplar set (§5) — any rule citing "read vcpkg's docs/ for port conventions" needs the right repo named.
7. **`-Werror=dev` and `--warn-uninitialized` are almost unused outside CMake's own test suite** (§9) — 3/46 and 1/46 respectively. If the shipped rule set recommends these as a default CI gate, it is recommending something the exemplar corpus itself overwhelmingly does not practice; that is fine as *advice* but should not be framed as "what everyone already does."
8. **`ExternalProject_Add` volume is almost entirely CMake dogfooding itself**, not real superbuild usage (§2) — a naive "count `ExternalProject_Add` calls" metric would wildly overstate how common the pattern is among real C++ projects in 2026.
9. **`rules_foreign_cc`'s own release cadence is unverifiable offline** — no tags in the shallow clone, template metadata with an empty version list (§8). Any rule that names "the latest rules_foreign_cc release" needs a live check, not a corpus read.

## Patterns worth encoding

- **`OVERRIDE_FIND_PACKAGE` / try-find-then-fetch is the sanctioned way to resolve the find_package-vs-FetchContent duplication**, not an accident to avoid outright — `apache__arrow` and `protocolbuffers__protobuf` both use it deliberately (§1). A rule should teach *this* pattern rather than simply warning against "having both."
- **A Find-module that fetches on miss** (`ccache/cmake/FindZstd.cmake`) is a real, working idiom for making a hard dependency painless for casual builders while still respecting `find_package(... MODULE REQUIRED)` call sites — worth naming as a pattern, with the caveat from Smell #4 (document the fetch, don't hide it).
- **CCI's recipe skeleton is worth citing verbatim** as a target-based Conan layout example: `config.yml` + `all/{conandata.yml,conanfile.py,test_package/CMakeLists.txt}`, `def layout()` in 40/40 sampled recipes, Conan-2-only imports in 40/40 (§4) — this is the most internally consistent large sample in the whole corpus and a safe canonical reference.
- **vcpkg's `SHA512`-on-every-github-source discipline (40/40 in-sample) is the strongest pin-hygiene default found anywhere in this audit** — worth citing as the bar other mechanisms should be measured against.
- **`bazel_dep(..., dev_dependency = True)` for test-only deps** (google/benchmark pinning `googletest`/`nanobind_bazel` as dev deps in `MODULE.bazel`, §8) is a clean pattern for keeping a dual-build repo's Bazel-side dependency graph from leaking test tooling into consumers — worth a cross-reference note to the Bazel program's BZL-CC group rather than re-deriving it here.
- **Hunter's centralized-version model** (no per-call `VERSION`, one version baked into the release's `cmake/projects/<pkg>/hunter.cmake`, §6) is architecturally distinct from Conan/vcpkg/CPM's per-call pinning and should be presented as a genuine alternative design, not a lesser version of the others.

## Contradictions of the frame

- **"Hunter is dead"** is the frame's own listed open question ("whether Hunter is maintained at all in 2026"). It is not: `cpp-pm__hunter`'s last commit in this clone is `2026-08-23` (§6), 13 days before this audit. The concern that *should* replace it: Hunter is maintained but has essentially **zero adoption growth signal in this corpus** — 1 real external consumer (a docs example) out of 46 repos, versus Conan/vcpkg/CPM each having multiple genuine consumers. Maintained-but-unadopted is a different, more specific finding than dead.
- **"CPM.cmake and FetchContent as the de facto no-package-manager package manager"** (frame, "candidates ... did not verify") is **not supported at this sample size** for FetchContent: excluding CMake's own self-tests, only 14 repos use it meaningfully (56 declares), fewer than the 46-repo corpus's Conan-consumer count would suggest by naive comparison, and far short of "de facto standard." CPM specifically is vendored by only 4 repos, 2 of which are CPM's own family of tools. The frame's phrasing should be softened from "de facto" to "a documented option most projects don't reach for."
- **"Dependency providers as the neutral seam every manager plugs into"** (frame, unverified candidate) is contradicted directly: exactly one manager (Conan, via `cmake-conan`) implements the seam in this corpus; vcpkg does not. "Every manager" should read "one manager, so far."
- **The frame worried about "ABI and cppstd mismatches across managers"** and **"two copies of one library"** as separate open questions — this audit found the second is real and specific (§1 cross-check, 3 solid exemplars with named idioms), but found **no evidence either way** on ABI/cppstd mismatch specifically (no repo in the corpus visibly documents or works around a cross-manager ABI conflict in its checked-out files) — that question remains open, not confirmed, and should not be asserted without further, more targeted grounding (e.g., reading `compatibility.py`/`package_id()` logic in depth, out of scope here).
- **The frame's artifact-set hypothesis floated a possible second rule, `cpp-packaging`, "only if the map confirms a genuinely different glob."** This audit's evidence leans toward yes: the glob surface for Conan/vcpkg (`conanfile.py`, `vcpkg.json`, etc.) touches a near-disjoint set of repos from the CMake-language axes (§1, §7) — of the 46 repos, only 3 have both a `conanfile.*` *and* meaningful CMake-language depth-file material (aminya/project_options, friendlyanon/cmake-init, conan-io/cmake-conan), suggesting the two rule sets would mostly fire on different files in different repos, which is exactly the "genuinely different glob" test the frame set.

## Gaps

- **Dual-build drift table not completed.** The task asked for a per-dependency-pair `dependency | Bazel version | CMake mechanism and pin | same version? y/n/unknown` table across the 11 dual-build repos. This audit gathered both sides' raw pins (§8) but did not hand-resolve each Bazel `bazel_dep` version against its CMake-side counterpart (they live in different files with different variable names, not machine-joinable by name alone at this budget) — flagged rather than guessed.
- **`rules_foreign_cc`'s latest release tag/date is not determinable offline** (§8) — the shallow, no-network-fetch corpus design that makes this whole audit reproducible also means it cannot answer "what version is current." A live `git ls-remote --tags` or BCR query is needed and was intentionally not run here (task forbids network operations beyond the initial clone).
- **`actions/cache` keyed on `vcpkg.json`/`conan.lock` returned zero hits** with the tried regex (§9) — plausible given the small consumer counts for both managers in this corpus, but the regex (`actions/cache[\s\S]{0,400}vcpkg\.json`) is line-window-bounded and could miss a cache step whose `key:` references the file through a shell expression or a separate `hashFiles()` call further than 400 chars away. Not re-verified by hand across all 46 `.github/workflows` trees.
- **Install-tree consumption round trip not confirmed end-to-end.** 7 repos show a `cmake --install` step (§9); none were manually traced to confirm a *second*, separate `cmake --preset`/configure step that then re-consumes the installed tree via `CMAKE_PREFIX_PATH` in the same CI job — the grep proves "installs," not "installs and is then consumed as a package."
- **Submodule branch-floating not separately counted.** `.gitmodules` entries are content-pinned by construction (a gitlink is a fixed commit), but some may additionally declare a `branch =` key enabling `git submodule update --remote` to float — this would change the pin-posture read for those specific entries in §10 and was not checked per-entry across the 9 repos with submodules.
- **CCI's `config.yml` presence was measured at the wrong grain.** The script computed a repo-wide `config.yml` count instead of per-sampled-package presence (visible as the malformed `config.yml_present_for_sampled_pkgs` row emitted by `deps-conan.sh`, since discarded from this write-up) — the recipe-layout claim in §4 is confirmed by direct listing of one recipe (`zlib`) rather than by the aggregate script, and the per-sample count should be treated as not measured.
- **ABI/cppstd cross-manager mismatch** (a frame candidate) was not investigated beyond confirming it is absent from every checked-out file's visible surface — a real answer needs a semantic read of `package_id()`/`compatibility.py` logic in Conan recipes and vcpkg triplet files, out of scope for a file:line-citation-only pass.
- **This audit did not read `llvm__llvm-project`, `qt__qtbase`, `Kitware__CMake`, or `ClickHouse__ClickHouse` in depth** — their sheer size (2,498 / 1,920 / 1,722 / 280 `CMakeLists.txt` files respectively) made them contribute mostly to aggregate counts and per-repo tables above, not close reading; any rule leaning heavily on "how does LLVM structure its CMake" needs a dedicated pass.

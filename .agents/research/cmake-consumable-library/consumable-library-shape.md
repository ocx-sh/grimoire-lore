---
title: How consumable libraries in the corpus actually install
topic: CMake install(), export(), Config packages — practice vs aspiration
agent: consumable-library-shape
model: sonnet
kind: exemplar
date_researched: 2026-09-26
sources_count: 21
scope: |
  Install and export surface of 14 flagship exemplar C/C++ libraries plus two
  starter-template patterns (friendlyanon/cmake-init, cpp-best-practices/
  cmake_template), at their 2026-09-26 re-fetched SHAs. Answers M-F-04,
  M-F-05, M-F-09, M-F-10, M-F-14, M-F-15, M-E-05, M-J-10 from
  cmake-topic-map.md. Does not re-decide the CPS verdict (cmake-dependency-seam/
  cps-verification.md owns it), the round-trip/relocation measurement matrix
  (that is dive install-round-trip-and-cps's job — this file adds one
  narrower, load-bearing measurement of its own: why one flagship library's
  export is not relocatable), or corpus-wide target/linkage hygiene (CMK-TGT).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The install/export skeleton, per repo](#1-the-installexport-skeleton-per-repo)
   2. [Namespace vs package name](#2-namespace-vs-package-name)
   3. [Config file: generated vs hand-written](#3-config-file-generated-vs-hand-written)
   4. [COMPATIBILITY and ARCH_INDEPENDENT](#4-compatibility-and-arch_independent)
   5. [GNUInstallDirs vs hand-rolled install variables](#5-gnuinstalldirs-vs-hand-rolled-install-variables)
   6. [FILE_SET HEADERS vs install(DIRECTORY)](#6-file_set-headers-vs-installdirectory)
   7. [The relocatability mechanism — measured root cause](#7-the-relocatability-mechanism--measured-root-cause)
   8. [find_dependency() vs raw find_package() in Config files](#8-find_dependency-vs-raw-find_package-in-config-files)
   9. [Install components and `<name>_INSTALL_CMAKEDIR`](#9-install-components-and-name_install_cmakedir)
   10. [.pc generation](#10-pc-generation)
   11. [Install gating: PROJECT_IS_TOP_LEVEL vs an option](#11-install-gating-project_is_top_level-vs-an-option)
   12. [CPack gating](#12-cpack-gating)
   13. [CI install-then-consume: tracing the audit's 7 repos](#13-ci-install-then-consume-tracing-the-audits-7-repos)
   14. [Surprise: a packaging helper that fetches over the network during install](#14-surprise-a-packaging-helper-that-fetches-over-the-network-during-install)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- **A library's `install(EXPORT ... DESTINATION <dir>)` must use a *relative* destination.** If `<dir>` is absolute — even one built from `${CMAKE_INSTALL_PREFIX}` — CMake 4.4.2 bakes a literal, non-relocatable path into `_IMPORT_PREFIX` instead of the usual `get_filename_component()` relocation chain. Measured directly; this is the root cause behind Tencent/rapidjson's broken package (§7).
- **Tencent/rapidjson's installed Config package is not relocatable, has no `NAMESPACE`, no `GNUInstallDirs`, and never calls `configure_package_config_file` or `write_basic_package_version_file`** — despite being one of the most-used JSON libraries in C++. Verified end to end on real CMake 4.4.2: move the install prefix and a `find_package(RapidJSON CONFIG)` consumer fails to configure (§1, §5, §7).
- **glfw's `install(EXPORT)` carries no `NAMESPACE` at all**, and no namespaced `ALIAS` exists anywhere in its build tree either — the exported target is the bare name `glfw`, not `glfw::glfw` (`glfw__glfw@92dcf4ce74:CMakeLists.txt:119-121`).
- **0 of 14 flagship libraries in this sample install headers with `FILE_SET HEADERS` (CMake 3.23+).** `install(DIRECTORY)` with a `BUILD_INTERFACE`/`INSTALL_INTERFACE` split on `target_include_directories` remains the universal practice; `FILE_SET` appears in fmt only for the experimental C++20-modules build, never for ordinary headers.
- **gflags actively perpetuates `LIB_SUFFIX`/`LIB_INSTALL_DIR`** as documented, public configuration knobs (`gflags__gflags@bdda022e7c:CMakeLists.txt:68,435-438`) — exactly the variables Fedora 45 (targeted 2026-03-10) stopped auto-injecting via its `%cmake` macro.
- **Every `.pc.in` checked across the 14 repos (8 sampled directly, corpus-wide 45 of 79) hard-codes `prefix=@CMAKE_INSTALL_PREFIX@`** (or an equivalent absolute substitution); `${pcfiledir}`-relative generation exists only in vcpkg's own hand-rolled ports (16 of 79 corpus-wide), never in an upstream library's own `.pc.in`.
- **spdlog's Config file calls raw `find_package(Threads REQUIRED)` instead of `find_dependency(Threads)`** (`gabime__spdlog@5b63780337:cmake/spdlogConfig.cmake.in:6`) — this forces `Threads` to be `REQUIRED` even when a consumer does `find_package(spdlog QUIET)`, unlike its own (correct) `find_dependency(fmt CONFIG)` two lines later.
- **curl is the corpus's install-then-consume model**: `tests/cmake/test.sh` builds and links a real, separate consumer project against curl through `find_package`, `FetchContent`, `ExternalProject`, and `add_subdirectory`, run from CI (`curl__curl@98519dac83:.github/workflows/distcheck.yml:319-374`). Its Config template also guards every `find_dependency()` on the exact build-time condition that pulled that dependency in.
- **yaml-cpp and zlib are also genuinely traced to a consumer, contrary to the earlier audit's blanket "traced none" reading of a CI-YAML-only grep.** yaml-cpp installs, then configures and builds a second project at `test/cmake` with `CMAKE_PREFIX_PATH` set to the install tree (`jbeder__yaml-cpp@1e0876c671:.github/workflows/build.yml:91-103`); zlib installs system-wide in `contribs.yml`, then `contrib/minizip`'s own `CMakeLists.txt` calls `find_package(ZLIB REQUIRED ... CONFIG)` (`madler__zlib@767c4c9478:contrib/minizip/CMakeLists.txt:57`, workflow at `.github/workflows/contribs.yml:96`). libuv and cmake-init are **not** traced: libuv's only sample CI job does `add_subdirectory("../../" build)` (no install involved), and cmake-init's CI installs to `proj/prefix` but never reconfigures a second project against it.
- **The `cpp-best-practices/cmake_template` packaging helper (`cmake/PackageProject.cmake`) fetches two GitHub archives over the network, unconditionally, from inside the packaging function itself**, using the direct/full-argument form of `FetchContent_Populate` (the exact shape CMP0169, 3.30, deprecates) — a widely templated "best practices" helper that itself violates the no-network-at-configure rule (`cpp-best-practices__cmake_template@b86318abbf:cmake/PackageProject.cmake:158,179`).
- **`write_basic_package_version_file` `COMPATIBILITY` choice correlates with the library's own ABI promise**: abseil, which explicitly disclaims ABI stability, is the only sample using `ExactVersion` (`abseil__abseil-cpp@61d073d671:CMakeLists.txt:204-207`); zlib, yaml-cpp, benchmark, googletest use `AnyNewerVersion`/`SameMajorVersion` consistent with semver-like promises.
- **nlohmann/json and cmake-init hand-write their Config files deliberately and safely**: both do zero absolute- or relative-path arithmetic inside the Config template itself, relying entirely on `install(TARGETS ... INCLUDES DESTINATION ...)` + `install(EXPORT ...)` to carry relocation. Measured: nlohmann/json's installed package **is** relocatable end to end (move the prefix, `find_package` + build a consumer still works) despite using the identical superficial idiom (`$<INSTALL_INTERFACE:relative-path>`) that broke rapidjson — the difference is `install(EXPORT)`'s destination being relative, not the include-dir generator expression.
- **nlohmann/json's exported target carries a harmless duplicate include entry**, `INTERFACE_INCLUDE_DIRECTORIES "${_IMPORT_PREFIX}/include;${_IMPORT_PREFIX}/include"`, from combining a manual `target_include_directories(... $<INSTALL_INTERFACE:...>)` with `install(TARGETS ... INCLUDES DESTINATION ...)` for the same path — pick one, not both.
- **A `<name>_INSTALL_CMAKEDIR` packager-overridable cache variable is a template pattern (cmake-init), not yet a library pattern**: only yaml-cpp among the 14 flagships ships an equivalent (`YAML_CPP_INSTALL_CMAKEDIR`, `jbeder__yaml-cpp@1e0876c671:CMakeLists.txt:33`); the rest hard-code the destination or derive it inline.
- **Component-based install (`_Runtime`/`_Development` split, `NAMELINK_COMPONENT` separated)** is a cmake-init/starter-template convention, not yet flagship-library practice: real libraries use ad hoc component names (`fmt_core`, `dev`, `doc`, `pkgconfig`, `shlib`) rather than the systematic Runtime/Development pair.
- **Legacy `EXPORT(PACKAGE ...)` (the CMake package-registry write, `CMP0090`-governed, off by default since 3.15) still ships unconditionally in rapidjson** (`Tencent__rapidjson@24b5e7a8b2:CMakeLists.txt:218`) — a dead pattern from pre-3.x CMake tutorials that an LLM trained on that era might still reach for.
- **libuv has no real Config.cmake wrapper file at all**: it names its export set `libuvConfig` so `install(EXPORT libuvConfig ...)` generates a file that is literally named `libuvConfig.cmake`, standing in for a hand-written Config (`libuv__libuv@abe835d413:CMakeLists.txt:795-799`). This works only because libuv has zero `PUBLIC` `find_package`-based dependencies to redeclare with `find_dependency()`; it is not a pattern to recommend for a library with real transitive dependencies.
- **find_ocx has zero install/export surface** — it is a downloading/bootstrapping module, not an installable library, and answers none of this dive's rows directly; every CMK-INST rule in this file targets a *different* kind of fleet artifact than find_ocx.

## Findings

### 1. The install/export skeleton, per repo

All 14 flagship libraries call `install(TARGETS ... EXPORT ...)` followed by `install(EXPORT ... NAMESPACE ...)`, with two partial exceptions.

| Repo (sha) | `install(TARGETS…EXPORT…)` | `install(EXPORT…)` | `NAMESPACE` present | Citation |
|---|---|---|---|---|
| fmtlib/fmt `522e2c12ab` | yes | yes | `fmt::` | `CMakeLists.txt:547-550,561-564` |
| gabime/spdlog `5b63780337` | yes | yes | `spdlog::` | `CMakeLists.txt:444` |
| madler/zlib `767c4c9478` | yes (×2, shared+static export sets) | yes (×2) | `ZLIB::` | `CMakeLists.txt:345-356,372-381` |
| curl/curl `98519dac83` | yes | yes | `CURL::` (= `PROJECT_NAME`) | `CMakeLists.txt:2409-2411`, `lib/CMakeLists.txt:326-335` |
| libuv/libuv `abe835d413` | yes (×2, static+shared, one export set) | yes | `libuv::` | `CMakeLists.txt:795-799,814-817` |
| jbeder/yaml-cpp `1e0876c671` | yes | yes | `yaml-cpp::` | `CMakeLists.txt:153-163` |
| gflags/gflags `bdda022e7c` | yes | yes (namespaced + optional non-namespaced set) | `${PACKAGE_NAME}::` (opt-in via `EXPORT_NAMESPACE_SET`) | `CMakeLists.txt:566-577` |
| glfw/glfw `92dcf4ce74` | yes | **yes, but no `NAMESPACE` keyword at all** | **none** | `src/CMakeLists.txt:340-341`, `CMakeLists.txt:119-121` |
| google/benchmark `ac13143d96` | yes | yes | `benchmark::` (via `${namespace}` variable) | `src/CMakeLists.txt:153-184` |
| google/googletest `4267679b68` | yes | yes | `${cmake_package_name}::` | `googletest/CMakeLists.txt:97-100` |
| nlohmann/json `f422b753cc` | yes (with `INCLUDES DESTINATION`) | yes | `nlohmann_json::` | `CMakeLists.txt:226-238` |
| Tencent/rapidjson `24b5e7a8b2` | **yes, but no `EXPORT` namespace and no `INCLUDES DESTINATION`** | **yes, no `NAMESPACE`** | **none** | `CMakeLists.txt:255-256` |
| catchorg/Catch2 `222e233903` | yes | yes | `Catch2::` | `src/CMakeLists.txt:411-425` |
| abseil/abseil-cpp `61d073d671` | yes (per-component, `AbseilHelpers.cmake`) | yes | `absl::` | `CMake/AbseilHelpers.cmake:354`, `CMakeLists.txt:186-189` |

Two repos deviate from the skeleton entirely:

- **libuv** never generates a Config file; it names the export set `libuvConfig` so that `install(EXPORT libuvConfig DESTINATION ... )` itself produces the file `libuvConfig.cmake`, which `find_package(libuv CONFIG)` then loads directly as the "Config" file (`libuv__libuv@abe835d413:CMakeLists.txt:795-802`). There is no `configure_package_config_file` call and no `find_dependency` anywhere in the repo. This only works because libuv links no `PUBLIC` `find_package`-found dependency (`CURL` is looked up only inside a *sample* in `docs/code/CMakeLists.txt`, not the library itself).
- **rapidjson** has an `install(TARGETS RapidJSON EXPORT RapidJSON-targets)` / `install(EXPORT RapidJSON-targets DESTINATION ${CMAKE_INSTALL_DIR})` pair with **no `NAMESPACE`**, plus a legacy `EXPORT( PACKAGE ${PROJECT_NAME} )` call (`Tencent__rapidjson@24b5e7a8b2:CMakeLists.txt:218,255-256`) — the pre-3.x package-registry mechanism, governed by `CMP0090` (OFF/registry-populating by default until 3.15, and even after 3.15 the *old* behaviour of unconditionally calling `export(PACKAGE)` still runs because the policy is not set here).

### 2. Namespace vs package name

The map's decided rule (conflict 5 / M-F-10) treats **absence** of a namespace as a defect independent from a **mismatched** namespace. Both occur in this sample:

| Repo | `find_package(<Name>)` | Export namespace | Match? |
|---|---|---|---|
| fmt | `fmt` | `fmt::` | exact |
| spdlog | `spdlog` | `spdlog::` | exact |
| zlib | `ZLIB` | `ZLIB::` | exact (case) |
| curl | `CURL` | `CURL::` | exact |
| libuv | `libuv` | `libuv::` | exact |
| yaml-cpp | `yaml-cpp` | `yaml-cpp::` | exact |
| gflags | `gflags` | `gflags::` (opt-in) | exact when enabled |
| **glfw** | `glfw3` | **(none)** | **no namespace at all** |
| benchmark | `benchmark` | `benchmark::` | exact |
| googletest | `GTest` | `GTest::` | exact |
| nlohmann_json | `nlohmann_json` | `nlohmann_json::` | exact |
| **rapidjson** | `RapidJSON` | **(none)** | **no namespace at all** |
| Catch2 | `Catch2` | `Catch2::` | exact |
| abseil | `absl` | `absl::` | exact |

Every flagship library in this sample that *does* export a namespace uses one equal to its own package/find name — the map's cited mismatch risk (CPS forbids `Vendor::Product` when the package is `product`) is a *forward-looking* liability, not an active practice defect, in this corpus. The active, present-day defects are the two libraries (glfw, rapidjson) with **no namespace whatsoever** — a stronger and more directly actionable finding than "mismatch."

### 3. Config file: generated vs hand-written

| Repo | Mechanism | Verdict |
|---|---|---|
| fmt, spdlog, zlib, curl, yaml-cpp, benchmark, googletest, Catch2, abseil, glfw | `configure_package_config_file()` | Standard, correct |
| gflags | Hand-written, via plain `configure_file(cmake/config.cmake.in ...)` with a manually computed `file(RELATIVE_PATH INSTALL_PREFIX_REL2CONFIG_DIR ...)` (`gflags__gflags@bdda022e7c:CMakeLists.txt:526-527`) | Hand-written but relocation-aware — computes its own relative prefix correctly |
| nlohmann/json | Hand-written, plain `configure_file()` for **both** Config and ConfigVersion, deliberately, citing [nlohmann/json#1697](https://github.com/nlohmann/json/issues/1697) (`nlohmann__json@f422b753cc:CMakeLists.txt:196-201`, `cmake/nlohmann_jsonConfigVersion.cmake.in:1-3`) | Hand-written but safe — the template does **no** path arithmetic; all relocation happens in the separately generated Targets file |
| cmake-init template | Hand-written, static per-project template (`{{= name =}}Config.cmake`, `install-config.cmake`), `RENAME`d on install (`friendlyanon__cmake-init@7e0c52fc73:cmake-init/templates/common/cmake/install-rules.cmake:57-62`) | Hand-written and safe, same reason as nlohmann/json |
| **rapidjson** | Hand-written via plain `CONFIGURE_FILE` of a template that **contains a literal `@PACKAGE_INIT@` token** — the macro variable that only `configure_package_config_file()` itself defines and substitutes (confirmed in `Modules/CMakePackageConfigHelpers.cmake:497` at v4.4.2) | **Broken**: `@PACKAGE_INIT@` is undefined in this scope, so `CONFIGURE_FILE(... @ONLY)` silently substitutes it with an empty string. Measured on real CMake 4.4.2 (§7). |

The generalizable rule this data supports is **not** "always use `configure_package_config_file`" — it is **"a hand-written Config file is safe exactly when it performs zero prefix/path arithmetic of its own."** nlohmann/json and cmake-init prove the pattern works; gflags proves a hand-rolled *relative*-path computation also works; rapidjson proves that copying the `@PACKAGE_INIT@` idiom without the macro that defines it does not.

### 4. COMPATIBILITY and ARCH_INDEPENDENT

```
grep -rn -A3 'write_basic_package_version_file' <repo>/CMakeLists.txt
```

| Repo | COMPATIBILITY | ARCH_INDEPENDENT | Citation |
|---|---|---|---|
| zlib | `AnyNewerVersion` | no | `CMakeLists.txt:389-392` |
| curl | `SameMajorVersion` | no | `CMakeLists.txt:2354-2356` |
| yaml-cpp | `AnyNewerVersion` | no | `CMakeLists.txt:141-143` |
| gflags | (none — hand-written `version.cmake.in`, no `write_basic_package_version_file` call at all) | n/a | `CMakeLists.txt:528` |
| glfw | `SameMajorVersion` | no | `CMakeLists.txt:86-88` |
| benchmark | `SameMajorVersion` | no | `src/CMakeLists.txt:104-106` |
| googletest | `AnyNewerVersion` | no | `googletest/CMakeLists.txt:96` |
| catch2 | `SameMajorVersion` | no | `CMakeLists.txt:132-135` |
| **abseil** | **`ExactVersion`** | no | `CMakeLists.txt:204-207` |
| libuv | `SameMajorVersion` | no | `CMakeLists.txt:800-802` |
| fmt | `AnyNewerVersion` | no | `CMakeLists.txt:527-530` |
| spdlog | `SameMajorVersion` | no | `CMakeLists.txt:449` |
| **nlohmann/json** | hand-rolled equivalent of `SameMajorVersion`, **deliberately not using `write_basic_package_version_file`** to control arch-independence pre-dating the `ARCH_INDEPENDENT` keyword (added 3.14) | n/a (hand-rolled: no 32/64-bit check at all) | `cmake/nlohmann_jsonConfigVersion.cmake.in:1-3` |
| **rapidjson** | (none — hand-written `ConfigVersion.cmake.in` predates `write_basic_package_version_file` too, but with **no** documented rationale, and its `PACKAGE_VERSION_COMPATIBLE` logic is a manual, less-defensive reimplementation) | n/a | `RapidJSONConfigVersion.cmake.in:1-9` |

**abseil's `ExactVersion` is the one deliberate outlier**, and it is correct given abseil's own, explicit no-ABI-stability policy — this is the right use case for the strictest compatibility mode, not an oversight. cmake-init's template (`cmake-init/templates/common/cmake/install-rules.cmake:43-47`) is the only place in this sample that pairs `SameMajorVersion` with `ARCH_INDEPENDENT` for header-only targets, and it is a template default, not something any of the 14 real libraries reproduces verbatim even though half of them (fmt, spdlog... no — fmt/spdlog/curl/zlib/libuv/glfw/benchmark/googletest/catch2/abseil are all compiled, not header-only) are compiled libraries for which `ARCH_INDEPENDENT` would be wrong anyway. Genuinely header-only in this sample: nlohmann/json and rapidjson — and *neither* uses `write_basic_package_version_file`, let alone its `ARCH_INDEPENDENT` flag, at all. **The keyword the map cites (M-F-04) has zero adoption among the header-only libraries that would benefit from it in this sample** — both take a hand-written path instead, for different reasons (nlohmann: deliberate, documented; rapidjson: no version-file discipline at all).

### 5. GNUInstallDirs vs hand-rolled install variables

```
grep -rln 'include(GNUInstallDirs)' <repo's CMakeLists.txt tree>
```

12 of 14 flagship libraries include `GNUInstallDirs`. The two that do not are both instructive, in different ways:

- **rapidjson** hand-rolls `INCLUDE_INSTALL_DIR`, `LIB_INSTALL_DIR`, `DOC_INSTALL_DIR` as plain cache variables defaulting to `"${CMAKE_INSTALL_PREFIX}/include"` / `"${CMAKE_INSTALL_PREFIX}/lib"` / `"${CMAKE_INSTALL_PREFIX}/share/doc/${PROJECT_NAME}"` — **absolute paths, with no multi-arch (`lib64`) awareness at all** (`Tencent__rapidjson@24b5e7a8b2:CMakeLists.txt:147-149`). This is the same absolute-path habit that breaks its relocatability (§7): `LIB_INSTALL_DIR` feeds directly into `CMAKECONFIG_INSTALL_DIR` (`CMakeLists.txt:233`), which becomes the (absolute) `install(EXPORT ... DESTINATION ...)` argument.
- **gflags** documents and actively supports `LIB_INSTALL_DIR` and `LIB_SUFFIX` as public, Fedora-oriented compatibility knobs: `gflags_define (PATH LIBRARY_INSTALL_DIR ... "lib${LIB_SUFFIX}")` and `if (NOT GFLAGS_LIBRARY_INSTALL_DIR AND LIB_INSTALL_DIR) set (GFLAGS_LIBRARY_INSTALL_DIR "${LIB_INSTALL_DIR}") endif()` (`gflags__gflags@bdda022e7c:CMakeLists.txt:68,435-438`). Unlike rapidjson, gflags computes its own **relative** paths correctly (`CONFIG_INSTALL_DIR` defaults to `"lib/cmake/${PACKAGE_NAME}"`, `CMakeLists.txt:441`), so this specific defect does not break relocatability — but it perpetuates exactly the two variables (`-DLIB_INSTALL_DIR`, `-DLIB_SUFFIX`) that [Fedora's `CMake_drop_install_vars` change](https://fedoraproject.org/wiki/Changes/CMake_drop_install_vars) (targeted Fedora 45, last updated 2026-03-10) stops injecting via the `%cmake` macro. A distro build of gflags on Fedora 45+ that relies on the macro's old auto-injection will silently fall back to gflags's own `"lib"`-based default instead of the distro's `lib64`, unless the packager adds the variable manually — exactly the "quick fix" the Fedora page documents as the interim workaround.

The Fedora page (fetched 2026-09-26) confirms the map's dated claim precisely: the dropped variables are `-DINCLUDE_INSTALL_DIR`, `-DLIB_INSTALL_DIR`, `-DSYSCONF_INSTALL_DIR`, `-DSHARE_INSTALL_PREFIX`, `-DLIB_SUFFIX` — the same five names both outlier repos in this sample use.

### 6. FILE_SET HEADERS vs install(DIRECTORY)

```
grep -rn 'FILE_SET.*HEADERS' <14 repos' CMakeLists.txt trees>
# empty = no adopter
```

**Result: zero hits across all 14 repos.** The only `FILE_SET` use anywhere in the sample is fmt's, and it is `FILE_SET fmt TYPE CXX_MODULES` — the experimental C++20-modules build (`fmtlib__fmt@522e2c12ab:CMakeLists.txt:365,545`), not a `HEADERS`-type file set for ordinary public headers. Every one of the 14 libraries still installs headers with `install(DIRECTORY include/... DESTINATION ...)` (rapidjson, zlib, curl, nlohmann/json) or per-file `install(FILES ...)`/`PUBLIC_HEADER` (fmt's core headers, gflags's generated headers), paired with the classic `target_include_directories(... $<BUILD_INTERFACE:...> $<INSTALL_INTERFACE:...>)` split.

`FILE_SET HEADERS` was added in CMake 3.23 (2022) specifically to let CMake track header membership and re-export it without a separate `install(DIRECTORY)` call — but **it has zero adopters among the libraries people actually consume in this sample**, four years later. It is a real, documented, working mechanism (aspiration), not yet practice.

### 7. The relocatability mechanism — measured root cause

The map's row M-F-02 (relocation) is owned by dive `install-round-trip-and-cps`, but this dive's own tabulation surfaced a real, uninvestigated non-relocatable Config package (rapidjson) and the map's DECIDE explicitly asks to chase it. The mechanism is narrow enough, and load-bearing enough for M-F-09's "BUILD_INTERFACE/INSTALL_INTERFACE" row, to measure here rather than defer.

**Claim (measured on CMake 4.4.2, `ocx package exec kitware/cmake:4.4`):** `install(EXPORT <name> DESTINATION <dir>)` only gets CMake's usual relocatable `_IMPORT_PREFIX` computation (a chain of `get_filename_component(_IMPORT_PREFIX "${_IMPORT_PREFIX}" PATH)` calls walking up from the Targets file's own location) when `<dir>` is a **relative** path. If `<dir>` is absolute — even one built from `${CMAKE_INSTALL_PREFIX}` and therefore *nominally* inside the same prefix — CMake bakes the literal, build-time absolute path into `_IMPORT_PREFIX` instead, and every `$<INSTALL_INTERFACE:...>`-derived include directory becomes permanently wrong once the tree is moved.

Isolated repro, source at `.agents/research/cmake-consumable-library/scratch/consumable-library-shape/reloc-repro/CMakeLists.txt`:

```cmake
# Case A: relative EXPORT destination — relocatable
install(TARGETS nodest EXPORT nodestTargets)
install(EXPORT nodestTargets DESTINATION lib/cmake/nodest)

# Case B: absolute EXPORT destination — NOT relocatable
set(ABS_CMAKE_DIR "${CMAKE_INSTALL_PREFIX}/lib/cmake/reloctest")
install(TARGETS absdest EXPORT absdestTargets)
install(EXPORT absdestTargets DESTINATION "${ABS_CMAKE_DIR}")
```

```
$ ocx package exec kitware/cmake:4.4 -- cmake --install <build> ...
$ grep -n _IMPORT_PREFIX <prefix>/lib/cmake/nodest/nodestTargets.cmake
50:get_filename_component(_IMPORT_PREFIX "${CMAKE_CURRENT_LIST_FILE}" PATH)
51:get_filename_component(_IMPORT_PREFIX "${_IMPORT_PREFIX}" PATH)
52:get_filename_component(_IMPORT_PREFIX "${_IMPORT_PREFIX}" PATH)
53:get_filename_component(_IMPORT_PREFIX "${_IMPORT_PREFIX}" PATH)

$ grep -n _IMPORT_PREFIX <prefix3>/lib/cmake/reloctest/absdestTargets.cmake
50:set(_IMPORT_PREFIX "/home/mherwig/.cache/cmake-measure-scratch/consumable-library-shape/reloc-repro-prefix3")
```

Case B's `_IMPORT_PREFIX` is a literal string — no relocation logic at all. This exactly matches rapidjson's real shape: `LIB_INSTALL_DIR` is `"${CMAKE_INSTALL_PREFIX}/lib"` (absolute, §5), so `CMAKECONFIG_INSTALL_DIR` (`CMakeLists.txt:233`) and the `install(EXPORT ... DESTINATION ${CMAKE_INSTALL_DIR})` call (`CMakeLists.txt:256`) are absolute, and rapidjson's real installed `RapidJSON-targets.cmake` is byte-for-byte the same shape as the isolated Case B repro.

**End-to-end confirmation on the real library** (`.agents/research/cmake-consumable-library/scratch/consumable-library-shape/rj-src`, built with CMake 4.4.2 and `/opt/zig/zig c++` as `CMAKE_CXX_COMPILER`):

```
$ cmake --install rj-build            # installs to .../rj-prefix
$ mv .../rj-prefix .../rj-prefix-moved
$ cmake -S rj-consumer -B rj-consumer-build -DCMAKE_PREFIX_PATH=.../rj-prefix-moved ...
CMake Error in CMakeLists.txt:
  Imported target "RapidJSON" includes non-existent path
    ".../rj-prefix/include"
  in its INTERFACE_INCLUDE_DIRECTORIES.
```

The identical experiment against **nlohmann/json** (`.agents/research/cmake-consumable-library/scratch/consumable-library-shape/nl-src`) — which uses the same superficial `target_include_directories(... $<INSTALL_INTERFACE:${NLOHMANN_JSON_INCLUDE_INSTALL_DIR}>)` idiom (`nlohmann__json@f422b753cc:CMakeLists.txt:155-156`) — **succeeds** after the move, because nlohmann/json also passes `INCLUDES DESTINATION ${NLOHMANN_JSON_INCLUDE_INSTALL_DIR}` to `install(TARGETS ...)` (`CMakeLists.txt:230-233`) and its `NLOHMANN_JSON_CONFIG_INSTALL_DIR` (`"${CMAKE_INSTALL_DATADIR}/cmake/${PROJECT_NAME}"`, line 78) is relative. Isolating just the `INCLUDES DESTINATION` variable (repro Case C, no `BUILD_INTERFACE` entry at all, `EXPORT` destination relative) also produces the correct relocation chain — confirming the **EXPORT destination's absoluteness**, not the presence/absence of `INCLUDES DESTINATION` or `BUILD_INTERFACE`, is the actual discriminator. nlohmann/json's belt-and-suspenders use of both mechanisms for the same path does leave one harmless artifact: `INTERFACE_INCLUDE_DIRECTORIES "${_IMPORT_PREFIX}/include;${_IMPORT_PREFIX}/include"` (duplicate entry, confirmed in the installed `nlohmann_jsonTargets.cmake:64`).

**This directly refines CMake's own documentation.** [`Help/manual/cmake-packages.7.rst`'s "Creating Relocatable Packages" section](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-packages.7.rst) (lines 475-514 at v4.4.2) presents `target_include_directories(tgt INTERFACE $<INSTALL_INTERFACE:include>)` as "Ok, relocatable" and never mentions that `install(EXPORT ... DESTINATION)` must itself be relative for that promise to hold. An agent (or a library author) who follows that page's example literally, as rapidjson evidently did, can still ship a non-relocatable package if the *export destination* — a separate, easy-to-miss line — is built from an absolute base.

### 8. find_dependency() vs raw find_package() in Config files

```
grep -rn -e 'find_dependency' -e 'find_package(' <repo's Config.cmake.in>
```

| Repo | PUBLIC/INTERFACE deps redeclared | Mechanism | Note |
|---|---|---|---|
| curl | Threads, OpenSSL, ZLIB, Brotli, Cares, GSS, Libbacktrace, Libgsasl, LDAP, Libidn2, Libpsl, Libssh(2), MbedTLS, NGHTTP2/3, NGTCP2, GnuTLS, Nettle, Quiche, Rustls, WolfSSL, Zstd — **each wrapped in `if("@HAVE_...@")` / `if("@USE_...@")` matching the exact build-time condition** | `find_dependency(...)`, `CMakeFindDependencyMacro` | Gold-standard: no dependency is unconditionally required that the build itself made optional (`curl__curl@98519dac83:CMake/curl-config.in.cmake:34-147`) |
| abseil | Threads | `find_dependency(Threads)` | `CMake/abslConfig.cmake.in:4` |
| benchmark | Threads (always), PFM (conditionally) | `find_dependency` | `cmake/Config.cmake.in:5,9` |
| **spdlog** | Threads (unconditional), fmt (conditional on `SPDLOG_FMT_EXTERNAL(_HO)`) | **`find_package(Threads REQUIRED)`** for Threads, `find_dependency(fmt CONFIG)` for fmt | Inconsistent within the same file: the `Threads` line forces `REQUIRED` regardless of whether the *consumer's* own `find_package(spdlog QUIET)` asked for quiet/optional behaviour, unlike the correctly-written `fmt` line two lines later (`gabime__spdlog@5b63780337:cmake/spdlogConfig.cmake.in:6,14`) |
| cmake-init template | one hard-coded dependency name (`fmt` or `json-c`, template-substituted) | `find_dependency` | `cmake-init/templates/common/cmake/install-config.cmake:4` |
| gflags | none (copies `INTERFACE_LINK_LIBRARIES` directly off the already-imported target instead) | n/a | No `find_dependency` calls exist in the file at all; any transitive `Threads`-style dependency must already be resolvable as a bare target name, which is fragile but works only because gflags's own optional pthread linkage is handled inside the same translation unit, not via a separately `find_package`d target |
| zlib, libuv, glfw (no NAMESPACE case aside), Catch2, googletest, nlohmann/json, rapidjson | none | n/a | No `PUBLIC`/`INTERFACE` `find_package`-found dependency exists on the exported target(s), so absence is correct |

`find_dependency()` (from `CMakeFindDependencyMacro`) exists specifically to forward the parent `find_package()` call's `REQUIRED`/`QUIET`/version arguments and to compose a correct `NOT_FOUND_MESSAGE` on failure ([`cmake-packages.7.rst:419-444`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-packages.7.rst) at v4.4.2). spdlog's mixed use of raw `find_package(... REQUIRED)` alongside a correct `find_dependency()` two lines later shows this is an easy, low-visibility mistake even in a widely-used, actively maintained library — not merely a hypothetical AI-agent trap.

### 9. Install components and `<name>_INSTALL_CMAKEDIR`

cmake-init's template is the fullest expression of both patterns in this sample:

```cmake
# friendlyanon__cmake-init@7e0c52fc73:cmake-init/templates/common/cmake/install-rules.cmake:50-74
set({= name =}_INSTALL_CMAKEDIR "...${package}" CACHE STRING "...")
set_property(CACHE {= name =}_INSTALL_CMAKEDIR PROPERTY TYPE PATH)
mark_as_advanced({= name =}_INSTALL_CMAKEDIR)
install(TARGETS {= name =}_{= name =} EXPORT {= name =}Targets
    RUNTIME COMPONENT {= name =}_Runtime
    LIBRARY COMPONENT {= name =}_Runtime
    NAMELINK_COMPONENT {= name =}_Development
    ARCHIVE COMPONENT {= name =}_Development
    INCLUDES DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}")
```

Among the 14 real libraries, only **yaml-cpp** ships an equivalent packager-overridable cache variable, `YAML_CPP_INSTALL_CMAKEDIR` (`jbeder__yaml-cpp@1e0876c671:CMakeLists.txt:33,137,163,167`). The rest hard-code the Config-install destination inline (`${FMT_CMAKE_DIR}`, `${CMAKE_INSTALL_LIBDIR}/cmake/libuv`, `${CMAKECONFIG_INSTALL_DIR}` computed once and not cached/advertised for override, etc.) — functionally similar but not exposed as a documented, packager-facing knob.

Component usage is real but ad hoc:

```
grep -rn 'COMPONENT' <14 repos> | grep -oE 'COMPONENT [A-Za-z_]+' | sort | uniq -c
```
`dev` (5), `Development` (3, cmake-init only), `Runtime` (2, cmake-init only), `doc`/`Docs` (4), `examples` (2), `fmt_core`/`fmt_doc` (fmt's own naming), `pkgconfig` (2), `shlib`/`lib`/`bin` (cmake_template's `PackageProject.cmake`). **No flagship library in this sample reproduces the systematic `_Runtime`/`_Development` pair with `NAMELINK_COMPONENT` split** — it is a template convention that has not yet propagated into the libraries people actually consume.

### 10. .pc generation

```
find <corpus> -name '*.pc.in' -print   # 79 files, 22 repos, per [host] H7
grep -l 'pcfiledir' <those 79 files>   # 16 files, all under microsoft__vcpkg(-tool)
grep -l -e 'prefix=@CMAKE_INSTALL_PREFIX@' -e 'prefix=${CMAKE_INSTALL_PREFIX}' -e 'prefix=@prefix@' <those 79 files>   # 45 files
```

Every `.pc.in` sampled directly from the 14 flagship repos (curl, catch2, fmt, gflags, nlohmann/json, spdlog, glfw, yaml-cpp, zlib, libuv, benchmark, rapidjson) starts with an absolute `prefix=` line — `@CMAKE_INSTALL_PREFIX@`, `@prefix@` (itself derived from `CMAKE_INSTALL_PREFIX` via `configure_file`), or a repo-specific absolute variable (`@CMAKE_INSTALL_FULL_INCLUDEDIR@` in glfw and yaml-cpp). **None uses `${pcfiledir}`** — the pkg-config convention for a file that relocates alongside itself. `${pcfiledir}` appears only in 16 of the corpus's 79 `.pc.in` files, and every one of those 16 is under `microsoft__vcpkg` or `microsoft__vcpkg-tool` — vcpkg's own hand-rolled wrapper `.pc.in` templates for **non-CMake-aware** upstreams being packaged as vcpkg ports (`cblas`, `openssl`, `krb5`, `egl`, `blas`, `opengl`, `snappy`, `glpk`, `dawn`), not a pattern any upstream library author uses for their own `.pc.in`.

Generation mechanism is uniform: `configure_file(<name>.pc.in <name>.pc @ONLY)`, install to `${CMAKE_INSTALL_LIBDIR}/pkgconfig` (11/12 sampled) or `${CMAKE_INSTALL_DATADIR}/pkgconfig` (nlohmann/json, a deliberate choice for a header-only, arch-independent package — `nlohmann__json@f422b753cc:CMakeLists.txt:236` uses `NLOHMANN_JSON_PKGCONFIG_INSTALL_DIR = ${CMAKE_INSTALL_DATADIR}/pkgconfig`).

### 11. Install gating: PROJECT_IS_TOP_LEVEL vs an option

| Repo | Gate | Mechanism |
|---|---|---|
| abseil | `ABSL_ENABLE_INSTALL` option, defaulted from `if(NOT CMAKE_SOURCE_DIR STREQUAL PROJECT_SOURCE_DIR)` | Pre-3.21 idiom, not the native `PROJECT_IS_TOP_LEVEL` variable (`abseil__abseil-cpp@61d073d671:CMakeLists.txt:38-41,172,280`) |
| nlohmann/json | `JSON_Install` option, defaulted from its own `MAIN_PROJECT` variable (same `CMAKE_CURRENT_SOURCE_DIR STREQUAL CMAKE_SOURCE_DIR` idiom) | `nlohmann__json@f422b753cc:CMakeLists.txt:12-15,59` |
| cmake-init template | native `PROJECT_IS_TOP_LEVEL` (3.21+), with the map-cited compat shim (`cmake-init/templates/common/cmake/project-is-top-level.cmake`) for floors below 3.21 | `cmake-init/templates/common/cmake/install-rules.cmake:1,77` |
| curl, zlib, fmt, spdlog, catch2, gflags, benchmark, googletest, glfw, libuv, yaml-cpp | install always runs, gated only by their own top-level `option(BUILD_...)`-style flags or nothing | Consistent with the audit's corpus-wide finding that most projects gate only `BUILD_TESTING`, not `install()` itself |

Two of the three gating repos in this sample (abseil, nlohmann/json) use the older `CMAKE_SOURCE_DIR STREQUAL PROJECT_SOURCE_DIR` idiom rather than the native `PROJECT_IS_TOP_LEVEL` variable added in 3.21 — both predate that CMake release in their own history and never migrated. Only the *template* (cmake-init) uses the modern variable plus its documented pre-3.21 shim.

### 12. CPack gating

```
grep -rn 'include(CPack)' <repo tree>
```

Present in 7 of the 14 (fmt, zlib, curl, catch2, nlohmann/json, cmake-init template, cmake_template). Where a gating condition is visible, it matches the install gate: cmake-init's template wraps it in the same `if(PROJECT_IS_TOP_LEVEL)` block as the rest of its install rules (`install-rules.cmake:77-79`); nlohmann/json's `include(CPack)` sits inside the same `if(JSON_Install)` block as its own install rules (`CMakeLists.txt:203,239`). No repo in this sample calls `include(CPack)` unconditionally at file scope outside any top-level guard.

### 13. CI install-then-consume: tracing the audit's 7 repos

[exemplar-deps-and-dual-build.md §9](../cmake-audit/exemplar-deps-and-dual-build.md) found `cmake --install` appearing somewhere in CI/scripts for 7 repos and noted "none of these were verified by hand to also re-configure a second, separate consumer project" — a Gap the map's brief for this dive asks to close for the 5 of those 7 repos inside this dive's scope (arrow and duckdb are out of scope here).

| Repo | Install step | Second consumer configure? | Evidence |
|---|---|---|---|
| **curl** | multiple (`.github/workflows/linux.yml`, `distcheck.yml`) | **Yes** — `tests/cmake/test.sh find_package` builds a fresh, separate CMake project (`tests/cmake/CMakeLists.txt` + `test.c`/`test.cpp`) that calls `find_package(CURL ...)` against the installed tree, run for both C and C++ consumers, with and without `CMAKE_FIND_PACKAGE_PREFER_CONFIG` | `curl__curl@98519dac83:.github/workflows/distcheck.yml:319-374`, `tests/cmake/test.sh:1-60` |
| **jbeder/yaml-cpp** | `cmake --install build` | **Yes** — a `Configure CMake package test` step immediately follows, pointing `CMAKE_PREFIX_PATH` at the just-installed prefix and configuring `test/cmake` as a separate source tree | `jbeder__yaml-cpp@1e0876c671:.github/workflows/build.yml:91-103` |
| **madler/zlib** | `cmake --install ../build-zlib` (in `contribs.yml`, a *different* workflow from the sanitizer/package-target `cmake.yml` the earlier grep likely matched) | **Yes** — the same job then configures `contrib/minizip` (and other `contrib/*` subprojects) as a separate `src_dir`, and `contrib/minizip/CMakeLists.txt` calls `find_package(ZLIB REQUIRED ... CONFIG)` | `madler__zlib@767c4c9478:.github/workflows/contribs.yml:88-96`, `contrib/minizip/CMakeLists.txt:57` |
| **libuv** | none in the file the earlier grep matched, only `CI-sample.yml`'s subproject build | **No** — `CI-sample.yml`'s `docs/code/CMakeLists.txt` calls `add_subdirectory("../../" build)`, an in-tree subproject build, not an install-then-`find_package` round trip | `libuv__libuv@abe835d413:.github/workflows/CI-sample.yml:1-30`, `docs/code/CMakeLists.txt:1-5` |
| **friendlyanon/cmake-init** | `cmake --install proj/build --config Release --prefix proj/prefix` | **No** — the workflow installs the freshly generated template project, then runs `ctest` against the *original* build tree; no second `cmake -S -B` invocation ever points at `proj/prefix` | `friendlyanon__cmake-init@7e0c52fc73:.github/workflows/ci.yml:113-120` |

**Correction to the earlier audit's framing:** the "traced none" conclusion was an artifact of a CI-YAML-only grep that missed the *scripts* those workflows call (curl's `tests/cmake/test.sh`) and the *other* workflow files in the same repo (zlib's `contribs.yml` versus the `cmake.yml` the audit likely matched). 3 of these 5 repos (curl, yaml-cpp, zlib) genuinely do run a real install-then-`find_package` round trip in CI; 2 (libuv, cmake-init) do not.

### 14. Surprise: a packaging helper that fetches over the network during install

`cpp-best-practices__cmake_template`'s `cmake/PackageProject.cmake` (`install_basic_package_files` wrapper, `PackageProject()` function, a copy of the widely-templated `TheLartians/PackageProject.cmake` helper) is invoked from the template's own `CMakeLists.txt` to produce the project's install/export rules. Its implementation does not call `configure_package_config_file` or `write_basic_package_version_file` at all. Instead, unconditionally, every time the function runs:

```cmake
# cpp-best-practices__cmake_template@b86318abbf:cmake/PackageProject.cmake:158-183
FetchContent_Populate(
  _fargs
  URL https://github.com/polysquare/cmake-forward-arguments/archive/8c50d1f956172edb34e95efa52a2d5cb1f686ed2.zip)
...
FetchContent_Populate(_ycm URL https://github.com/robotology/ycm/archive/refs/tags/v0.13.0.zip)
...
include("${_ycm_SOURCE_DIR}/modules/InstallBasicPackageFiles.cmake")
install_basic_package_files(${_PackageProject_NAME} "${_FARGS_LIST}")
```

Both calls use the **direct, full-argument** form of `FetchContent_Populate` — supplying `URL` inline rather than via a prior `FetchContent_Declare` — which is exactly the shape `CMP0169` (3.30) deprecates for calls outside `FetchContent_MakeAvailable`. There is no offline guard, no `FETCHCONTENT_FULLY_DISCONNECTED` awareness, and no caching beyond `FetchContent`'s own `_deps`-style default: **every configure of a project built from this template reaches the network unconditionally**, and the actual Config-package generation logic then lives in a third-party module (`ycm`'s `InstallBasicPackageFiles.cmake`) fetched at that moment, not in the project's own, auditable CMake code. A template explicitly named "cmake best practices" is, on its own install/export path, the corpus's clearest violation of the no-network-at-configure principle the map's other dives establish for dependency acquisition (M-G-18) — worth flagging back to that surface even though this dive does not re-decide it.

## Normative guidance candidates

1. **MUST — `install(EXPORT <name> DESTINATION <dir>)`'s `<dir>` must be relative** (built from `GNUInstallDirs` variables — `${CMAKE_INSTALL_LIBDIR}/cmake/<pkg>` or `${CMAKE_INSTALL_DATADIR}/cmake/<pkg>` — never from `${CMAKE_INSTALL_PREFIX}` or any other absolute base). *Rationale:* an absolute destination silences CMake's own `_IMPORT_PREFIX` relocation-chain generation and bakes the build machine's path into every installed consumer (§7, measured). *Verify:* install to a scratch prefix, then `grep -c 'get_filename_component(_IMPORT_PREFIX' <prefix>/<config-dir>/*Targets.cmake` — `0` with a target that has any `$<INSTALL_INTERFACE:...>` content = finding (destination was absolute); non-empty = pass. *Floor:* any CMake version with `install(EXPORT)` (≥2.8.something; verified on 3.31.12 and 4.4.2).

2. **MUST — every `install(EXPORT ...)` carries a `NAMESPACE`.** *Rationale:* an un-namespaced exported target (glfw, rapidjson) collides with any other project's plain-named target of the same name once both are `add_subdirectory`d, `FetchContent`d, or linked from two Config packages in one build. *Verify:* `grep -A5 'install(EXPORT' CMakeLists.txt <cmake dir>/*.cmake` — a matched block with no `NAMESPACE` keyword before its closing paren = finding. *Floor:* any CMake with `install(EXPORT)`.

3. **SHOULD — the export `NAMESPACE` equals the `find_package` name, case-insensitively.** *Rationale:* every namespace-carrying library in this sample already does this; a mismatch is a forward-compatibility liability once CPS's permanent namespace=package-name rule (cps-verification.md row 52) matters, but is not itself an active failure today. *Verify:* compare the `NAMESPACE X::` argument with the `project()`/package name, case-insensitive. *Floor:* any.

4. **MUST — a hand-written Config file performs zero prefix/path arithmetic of its own.** *Rationale:* nlohmann/json and cmake-init hand-write safely by relying entirely on `install(TARGETS ... INCLUDES DESTINATION ...)` + `install(EXPORT ...)` for all path resolution; rapidjson hand-writes unsafely by embedding a literal, never-substituted `@PACKAGE_INIT@` token from a plain `CONFIGURE_FILE()` call, and by hand-rolling absolute install-prefix variables (§3, §5). If a project cannot avoid a hand-written Config, it must either call `configure_package_config_file()` or contain no `@...@`/`${...}` reference to an install-time absolute path. *Verify (reading heuristic):* for a hand-written `*.cmake.in` Config template, confirm it never references `@CMAKE_INSTALL_PREFIX@`, a project-defined absolute-install variable, or a literal `@PACKAGE_INIT@` outside a real `configure_package_config_file()` call. *Floor:* any (`configure_package_config_file` itself needs CMake ≥2.8.12, per `CMakePackageConfigHelpers.cmake`).

5. **MUST — `write_basic_package_version_file(... COMPATIBILITY <mode>)` is called with a deliberate, documented mode**; a compiled library never uses `ARCH_INDEPENDENT`, and a header-only library adds it unless it has an explicit, documented reason not to (nlohmann/json's issue #1697 predates the keyword — new header-only projects have no such excuse). *Rationale:* rapidjson skips version-compatibility checking entirely; a consumer pinning a version range gets no protection at all. *Verify:* `grep -c write_basic_package_version_file CMakeLists.txt` — `0` alongside a Config-generating install = finding. *Floor:* `ARCH_INDEPENDENT` needs CMake ≥3.14.

6. **MUST — every `PUBLIC`/`INTERFACE` `find_package`-found dependency of an exported target is redeclared with `find_dependency()`, not raw `find_package()`, in the Config file, guarded by the same condition that made the build use it.** *Rationale:* raw `find_package(X REQUIRED)` forces `REQUIRED` even when the consumer's own `find_package(<pkg> QUIET)` asked for quiet/optional resolution (spdlog's Threads line, §8); an unconditional `find_dependency` for a build-time-optional dependency breaks consumers who never needed it. curl's guarded pattern (`if("@HAVE_LIBZ@") find_dependency(ZLIB ...) endif()`) is the model. *Verify:* for each PUBLIC dependency, `grep -n 'find_package(\|find_dependency(' <Config>.cmake.in`; a `find_package(` hit outside a `CMakeFindDependencyMacro`-documented exception = finding. *Floor:* `CMakeFindDependencyMacro` ships since CMake 3.x-era `CMakePackageConfigHelpers`; no meaningful floor beyond the project's own.

7. **SHOULD — public headers install through `FILE_SET HEADERS` (CMake ≥3.23) rather than `install(DIRECTORY)`.** *Rationale:* it is the documented, forward-looking mechanism, but this dive found **zero** adopters among 14 flagship libraries (§6) — treat its absence as a modernization opportunity, not a defect, and never "fix" a project's `install(DIRECTORY)` header install into `FILE_SET` unprompted. *Verify:* `grep -c 'FILE_SET.*HEADERS'`; `0` is the corpus norm, not a finding by itself. *Floor:* CMake ≥3.23.

8. **SHOULD — a packager-overridable `<name>_INSTALL_CMAKEDIR` cache variable (type `PATH`, `mark_as_advanced`d) names the Config-install destination, and installs split `COMPONENT`s into a `_Runtime`/`_Development` pair with `NAMELINK_COMPONENT` on the shared-library case.** *Rationale:* cmake-init's template models this correctly; only yaml-cpp among 14 real libraries reproduces the cache-variable half, and none reproduces the Runtime/Development component split (§9) — this is aspiration, not yet common practice, but a clean, checkable win for a new or modernized library. *Verify:* reading heuristic against the cmake-init reference shape. *Floor:* any (cache variables and `COMPONENT`/`NAMELINK_COMPONENT` are ancient).

9. **SHOULD — a `.pc.in` a project ships for itself is understood to be non-relocatable by construction** (every real upstream library in this sample bakes an absolute `prefix=`); do not claim or imply pkg-config output is relocatable unless the project deliberately adopts vcpkg's `${pcfiledir}`-relative pattern, which is a packaging-layer convention, not upstream-library practice. *Verify:* `grep -c pcfiledir <name>.pc.in` — its presence or absence is informational, not a MUST/SHOULD violation either way, given 0/12 sampled upstream libraries use it. *Floor:* pkg-config's own `pcfiledir` variable has been supported by pkg-config itself since 0.24 (2007) — the gap is adoption, not tooling.

10. **MUST — a packaging/install-authoring helper module never reaches the network unconditionally from inside an `install()`-generating function**, and never via the direct/full-argument `FetchContent_Populate(<name> <url-or-repo-args>)` form outside `FetchContent_Declare`+`FetchContent_MakeAvailable` (CMP0169, 3.30, deprecates exactly this shape). *Rationale:* `cpp-best-practices/cmake_template`'s `PackageProject.cmake` does exactly this, unconditionally, on every configure (§14) — a template that will be copied into new projects verbatim. *Verify:* `grep -n 'FetchContent_Populate(' <install-authoring module>` — a hit whose first non-name argument is a fetch keyword (`URL`, `GIT_REPOSITORY`, `SVN_REPOSITORY`) rather than nothing = finding. *Floor:* CMP0169 exists from CMake 3.30; the underlying network-at-configure problem applies to any version.

## Exemplar evidence

| Candidate | Satisfies | Violates | find_ocx |
|---|---|---|---|
| 1 (relative EXPORT destination) | 13 of 14 (all but rapidjson) | `Tencent__rapidjson@24b5e7a8b2:CMakeLists.txt:233,256` | n/a — find_ocx installs nothing (`grep -c 'install(EXPORT' ocx.cmake` → 0) |
| 2 (NAMESPACE present) | 12 of 14 | `glfw__glfw@92dcf4ce74:CMakeLists.txt:119-121`; `Tencent__rapidjson@24b5e7a8b2:CMakeLists.txt:256` | n/a |
| 3 (NAMESPACE = package name) | 12 of 12 that have one | none observed in this sample (contested only by CPS's forward rule, not by present practice) | n/a |
| 4 (hand-written Config does no path arithmetic) | `nlohmann__json@f422b753cc:CMakeLists.txt:196-201`; `friendlyanon__cmake-init@7e0c52fc73:cmake-init/templates/common/cmake/install-config.cmake`; `gflags__gflags@bdda022e7c:CMakeLists.txt:526-527` (relative-path variant) | `Tencent__rapidjson@24b5e7a8b2:RapidJSONConfig.cmake.in:1` (`@PACKAGE_INIT@` never substituted) | n/a |
| 5 (deliberate COMPATIBILITY) | 12 of 14 call `write_basic_package_version_file` with an explicit mode | `Tencent__rapidjson@24b5e7a8b2` (no call at all); gflags (no call — hand-rolled `version.cmake.in`) | n/a |
| 6 (find_dependency, guarded) | `curl__curl@98519dac83:CMake/curl-config.in.cmake:34-147` (model); `gabime__spdlog@5b63780337:cmake/spdlogConfig.cmake.in:14` (fmt line only) | `gabime__spdlog@5b63780337:cmake/spdlogConfig.cmake.in:6` (Threads line) | n/a |
| 7 (FILE_SET HEADERS) | 0 of 14 | n/a — universal non-adoption, not a violation | n/a |
| 8 (`_INSTALL_CMAKEDIR` + components) | `friendlyanon__cmake-init@7e0c52fc73:cmake-init/templates/common/cmake/install-rules.cmake:50-74`; `jbeder__yaml-cpp@1e0876c671:CMakeLists.txt:33` (cache-var half only) | none — absence, not a violation, in the remaining 12 | n/a |
| 9 (.pc relocatability disclosed correctly) | n/a — no rule text claims relocatability | n/a | n/a |
| 10 (no unconditional network in packaging helpers) | 13 of 14 (no packaging helper reaches the network) | `cpp-best-practices__cmake_template@b86318abbf:cmake/PackageProject.cmake:158,179` | n/a |

`/home/mherwig/dev/find_ocx` has no install/export surface at all (`grep -c -e 'install(TARGETS' -e 'install(EXPORT' -e 'configure_package_config_file' ocx.cmake CMakeLists.txt` → 0/0) — it is a bootstrapping module (audience 1 of the program's two audiences, per the topic map), not a consumable library (audience 2, which every rule above targets). None of these ten rules apply to it directly; they matter for the C++ libraries `find_ocx`-provisioned projects will themselves consume or ship.

## AI-agent angle

- **Trusting the official "Creating Relocatable Packages" example literally.** [`cmake-packages.7.rst`](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-packages.7.rst) shows `$<INSTALL_INTERFACE:include>` as sufficient for relocatability and never mentions that `install(EXPORT ... DESTINATION)` must also be relative. An LLM asked to "make this package relocatable" that fixes only the `target_include_directories` line (matching the docs) while leaving an absolute `install(EXPORT)` destination in place will produce exactly rapidjson's bug and believe the job is done. **Mechanical check:** after any relocatability fix, actually install to a scratch prefix and `grep get_filename_component <config-dir>/*Targets.cmake` for the real chain, per candidate 1 — never trust the presence of `$<INSTALL_INTERFACE:...>` alone as proof.
- **Emitting `export(PACKAGE ...)`.** This is a pre-3.x-tutorial-era pattern (rapidjson still has it, `CMakeLists.txt:218`) that populates the user package registry, an implicit global side effect most modern guidance recommends against; an LLM trained on older StackOverflow answers or old CMake tutorials reaches for it reflexively when asked "how do I let other projects find my build tree." **Mechanical check:** `grep -n 'EXPORT( \?PACKAGE' -i` — any hit in new code is a finding; recommend `export(TARGETS ...)` (build-tree-only, opt-in) instead if the use case is genuinely "consume from the build tree without installing."
- **Recommending `LIB_SUFFIX`/`LIB_INSTALL_DIR` as "the standard CMake way to support `lib64`."** This is exactly backwards as of Fedora 45 (targeted 2026-03-10): the standard mechanism is `GNUInstallDirs`, and the very variables many older answers recommend are the ones a modern distro's build macro stops injecting. **Mechanical check:** any new/modernized CMakeLists that defines or reads `LIB_SUFFIX`, `LIB_INSTALL_DIR`, `INCLUDE_INSTALL_DIR`, `SYSCONF_INSTALL_DIR`, or `SHARE_INSTALL_PREFIX` outside a documented, backward-compat-only shim should be flagged.
- **Treating `FILE_SET HEADERS` as mandatory "modern CMake" that every project should already use.** It is real (3.23+) but has zero adoption among the flagship libraries an agent is most likely to be asked to pattern-match against (§6). An agent "modernizing" a library's header install by unprompted-ly converting `install(DIRECTORY)` to `FILE_SET HEADERS` is optimizing for a pattern the ecosystem has not actually adopted, and risks introducing a floor bump (3.23) the project may not want.
- **Copying a "best practices" starter template's packaging helper uncritically.** `cpp-best-practices/cmake_template`'s `PackageProject.cmake` is exactly the kind of file an agent would suggest wholesale ("use this well-known packaging boilerplate") — but it fetches two GitHub archives unconditionally, with the deprecated direct `FetchContent_Populate` form, every time it runs (§14). **Mechanical check:** before recommending or vendoring any third-party "packaging helper" module, grep it for `FetchContent_Populate(` with inline URL/repo arguments and for any other configure-time network primitive (`file(DOWNLOAD)`, `execute_process(COMMAND git clone ...)`), the same enumeration the map's M-G-18 already calls for at the dependency-acquisition layer.
- **Writing `find_package(Dep REQUIRED)` inside a Config template instead of `find_dependency(Dep)`.** The two look nearly identical, and spdlog itself gets this wrong for one of its two dependencies while getting it right for the other (§8) — an agent pattern-matching on "a real project does it this way" has a 50% chance of copying the wrong line from the same file. **Mechanical check:** any `find_package(` call appearing inside a file matched by `*Config.cmake.in`/`*-config.cmake.in` (outside a documented, deliberate exception) is worth a second look; it should almost always be `find_dependency(`.

## Contested / evolving

- **`FILE_SET HEADERS` vs `install(DIRECTORY)`**: genuinely unresolved in practice, not just under-adopted. Four years after 3.23, 0 of 14 flagship libraries have moved, and this dive found no repo-side signal (an open issue, a changelog note, a maintainer discussion) that any of them plan to. Until real movement appears, a rule set should record this as SHOULD/aspiration and re-check the corpus periodically rather than escalate it.
- **CPS `install(PACKAGE_INFO)` alongside `install(EXPORT)`**: already decided SHOULD by the map (conflict 5, cps-verification.md Verdict) — this dive adds no new vote, only corroboration: **0 of the 14 flagship libraries in this narrower sample** emit CPS at their 2026-09-26 SHAs, consistent with [shape]'s corpus-wide 0-real-adopters finding.
- **Whether `.pc` relocatability should ever become a rule for upstream libraries**: contested in a different sense — pkg-config's own trust model (a `.pc` file is installed once, for one prefix, and regenerated if the prefix changes) may simply not need the CMake-Config-package notion of "move the tree and it still works." vcpkg's `${pcfiledir}` convention exists because vcpkg relocates *installed trees* as a packaging strategy, a use case none of the 14 upstream libraries in this sample actually has for their own `.pc.in`. This dive takes no position on whether upstream libraries should change; it only records that none currently do.
- **Component-based install (`_Runtime`/`_Development` + `NAMELINK_COMPONENT`)**: trending in templates (cmake-init) but not yet in libraries; too early to call it more than a SHOULD, and even that is generous given only 1 of 14 real libraries (yaml-cpp, partially) has moved toward it.
- **Hand-written vs generated Config files**: not a simple "always generate" rule — this dive found the generated path is the majority (10 of 14) and safe, but two of the four hand-written cases (nlohmann/json, cmake-init) are deliberate and correct, while the other two (gflags, rapidjson) split into "hand-rolled but relocation-aware" and "hand-rolled and broken." The discriminator is not "hand-written vs generated" but "does the template do its own path arithmetic," a subtler and more durable rule (candidate 4).

## Sources

| URL or measurement | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [Help/manual/cmake-packages.7.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-packages.7.rst) | CMake's own package/relocation manual | 4.4.2, fetched 2026-09-26 | Normative baseline for `find_dependency`, relocatable packages, `export(PACKAGE)` — and the gap this dive found in its relocatability example (§7) |
| [Modules/CMakePackageConfigHelpers.cmake @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Modules/CMakePackageConfigHelpers.cmake) | Source of `configure_package_config_file`/`write_basic_package_version_file`, including the `@PACKAGE_INIT@` substitution logic | 4.4.2, fetched 2026-09-26 | Proves `@PACKAGE_INIT@` is defined only inside `configure_package_config_file()` itself — the exact mechanism rapidjson's plain `CONFIGURE_FILE` misses |
| [Fedora Changes/CMake_drop_install_vars wiki](https://fedoraproject.org/wiki/Changes/CMake_drop_install_vars) | Fedora 45 change proposal | Targeted Fedora 45, last updated 2026-03-10, fetched 2026-09-26 | Names the exact five variables (`INCLUDE_INSTALL_DIR`, `LIB_INSTALL_DIR`, `SYSCONF_INSTALL_DIR`, `SHARE_INSTALL_PREFIX`, `LIB_SUFFIX`) two flagship libraries in this sample still hand-roll |
| Measurement: rapidjson install + move-prefix + consume, CMake 4.4.2 | Real build (`.agents/research/cmake-consumable-library/scratch/consumable-library-shape/rj-src`, `zigxx.sh` as `CMAKE_CXX_COMPILER`) | 2026-09-26 | Primary evidence the flagship library's Config package is genuinely non-relocatable, not just textually suspicious |
| Measurement: nlohmann/json install + move-prefix + consume, CMake 4.4.2 | Real build (`.agents/research/cmake-consumable-library/scratch/consumable-library-shape/nl-src`) | 2026-09-26 | Control case: identical superficial idiom, but relocatable — isolates the real discriminator |
| Measurement: isolated `install(EXPORT)` relative-vs-absolute-destination repro, CMake 4.4.2 | Real build (`.agents/research/cmake-consumable-library/scratch/consumable-library-shape/reloc-repro`) | 2026-09-26 | Minimal, controlled proof of the exact mechanism (§7), independent of any one library's other quirks |
| `fmtlib/fmt@522e2c12ab` CMakeLists.txt + support/cmake/* | Exemplar corpus (blob-less clone) | Re-fetched 2026-09-26 | Config generation, FILE_SET-for-modules-not-headers, .pc |
| `gabime/spdlog@5b63780337` CMakeLists.txt + cmake/* | Exemplar corpus | Re-fetched 2026-09-26 | The `find_package`-vs-`find_dependency` mixed-correctness case |
| `madler/zlib@767c4c9478` CMakeLists.txt + contrib/minizip + .github/workflows/contribs.yml | Exemplar corpus | Re-fetched 2026-09-26 | Dual export sets, traced install-then-consume via a sibling contrib project |
| `curl/curl@98519dac83` CMakeLists.txt, lib/CMakeLists.txt, CMake/curl-config.in.cmake, tests/cmake/test.sh, .github/workflows/distcheck.yml | Exemplar corpus | Re-fetched 2026-09-26 | The corpus's best-practice model for guarded `find_dependency` and a real CI round trip across four consumption idioms |
| `jbeder/yaml-cpp@1e0876c671` CMakeLists.txt, .github/workflows/build.yml | Exemplar corpus | Re-fetched 2026-09-26 | `<name>_INSTALL_CMAKEDIR` precedent, traced CI round trip |
| `gflags/gflags@bdda022e7c` CMakeLists.txt, cmake/config.cmake.in | Exemplar corpus | Re-fetched 2026-09-26 | Hand-rolled but relocation-aware Config; documented `LIB_SUFFIX`/`LIB_INSTALL_DIR` support |
| `glfw/glfw@92dcf4ce74` CMakeLists.txt, src/CMakeLists.txt, CMake/glfw3Config.cmake.in | Exemplar corpus | Re-fetched 2026-09-26 | The no-namespace-at-all case |
| `nlohmann/json@f422b753cc` CMakeLists.txt, cmake/config.cmake.in, cmake/nlohmann_jsonConfigVersion.cmake.in | Exemplar corpus | Re-fetched 2026-09-26 | The safe hand-written Config, documented rationale, relocatable control case |
| `Tencent/rapidjson@24b5e7a8b2` CMakeLists.txt, RapidJSONConfig.cmake.in, RapidJSONConfigVersion.cmake.in | Exemplar corpus | Re-fetched 2026-09-26 | The chased surprise: a flagship, widely-used library whose installed Config package is not relocatable |
| `friendlyanon/cmake-init@7e0c52fc73` cmake-init/templates/common/cmake/install-rules.cmake, install-config.cmake | Exemplar corpus | Re-fetched 2026-09-26 | The reference "what a consumable library should do" template, MUST/SHOULD baseline |
| `cpp-best-practices/cmake_template@b86318abbf` cmake/PackageProject.cmake | Exemplar corpus | Re-fetched 2026-09-26 | The chased surprise's second half: a "best practices" packaging helper that violates the no-network-at-configure principle |
| `abseil/abseil-cpp@61d073d671` CMakeLists.txt, CMake/AbseilHelpers.cmake, CMake/abslConfig.cmake.in | Exemplar corpus | Re-fetched 2026-09-26 | The one deliberate `ExactVersion` case, install gating idiom |
| `google/benchmark@ac13143d96`, `google/googletest@4267679b68`, `catchorg/Catch2@222e233903`, `libuv/libuv@abe835d413` | Exemplar corpus | Re-fetched 2026-09-26 | Rounding out the install/export/NAMESPACE/COMPATIBILITY table (§1, §4) |
| [cmake-topic-map.md](../cmake-topic-map.md) (rows M-F-04/05/09/10/14/15, M-E-05, M-J-10; conflicts 1, 3, 5, 10, 13) | This program's phase-3 map | 2026-09-26 | Binding decisions this dive answers into, and the audit citation this dive corrects (§13) |
| [exemplar-deps-and-dual-build.md §9](../cmake-audit/exemplar-deps-and-dual-build.md) | Wave-1 audit | 2026-09-05/06 | Source of the "7 repos, none traced" claim this dive re-examines and partially refutes |

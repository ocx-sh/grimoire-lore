---
title: "Targets, linkage and ABI — consolidated"
topic: cmake-targets-and-abi
model: opus
id_family: CMK-TGT
consolidates:
  - cmake-targets-and-abi/shared-static-visibility-pic.md
  - cmake-targets-and-abi/standards-modules-and-abi.md
inputs_also_read:
  - cmake-frame.md (every Corrections block; the wave-2 harvest block wins)
  - cmake-topic-map/era-recheck-2026-09-26.md
  - cmake-topic-map.md (conflicts 1 and 11; rows M-E-01..19, M-L-05; Wave 2 landed (c) and (e) 3, 6, 7)
  - cmake-consumable-library.md (owns CMK-TGT-01..09; amended here)
  - cmake-dependency-seam.md (CMK-DEP-15), cmake-bazel-seam.md (CMK-BZL-03, -07), cmake-package-managers.md (CMK-CONAN-10, CMK-VCPKG-06), cmake-versions-and-gate.md (CMK-VER-09)
  - cmake-skills/modernize-procedure.md (its provisional CMK-TGT-10..18 only)
  - cmake-audit/exemplar-cmake-shape.md, exemplar-deps-and-dual-build.md, find-ocx-cmake-shape-and-contracts.md, fleet-inventory-and-bazel-overlap.md
  - ../../rules/bazel-quality/cpp.md (BZL-CC-18, BZL-CC-27 cited, not restated)
date: 2026-09-26
verified: 2026-09-26
measured_on: CMake 3.31.12 and 4.4.2 (plus 4.3.4 for one UUID read) via ocx package exec kitware/cmake, gcc 15.2.1, Unix Makefiles and Ninja Multi-Config (ninja 1.13.2)
---

# Targets, linkage and ABI — consolidated

This file owns the `CMK-TGT` family. `cmake-consumable-library.md` minted
CMK-TGT-01..09 in wave 2. Those IDs stay stable: four are amended here, five
are unchanged, and none is restated. CMK-TGT-10..20 are new.

The consolidation added seven measurements (C1-C7) to settle conflicts
between the dives. Their sources are in
[`cmake-targets-and-abi/scratch/cmk-tgt-consolidation/`](cmake-targets-and-abi/scratch/cmk-tgt-consolidation/).
To re-run them, execute `run.sh <that dir> <a build root>` from the worktree
root. It needs `ocx` and `/usr/sbin/gcc`.

## Verdict

1. **Library type: the consumer decides, and the dependency's floor can
   silently discard that decision.** A plain `set(BUILD_SHARED_LIBS ON)`
   before a fetch is lost to any dependency whose floor is below 3.13. There
   is no error, only a CMP0077 warning. The dive fixed this with
   `CACHE … FORCE`. **Rejected:** FORCE overwrites the user's own `-D` (C6).
   Project code scopes a normal variable plus CMK-DEP-15's CMP0077 default
   around the one add (C5). *Binds: application consuming packages (TGT-10);
   library shipping a package (TGT-11).*
2. **PIC splits by who owns the static target.** A library sets the property
   on its own static targets. A top level seeds third-party targets through
   `CMAKE_POSITION_INDEPENDENT_CODE` before they are created. Neither may
   claim that the variable guarantees PIC. This reconciles the dive with
   CMK-BZL-03's "never make PIC depend on the variable".
3. **The MSVC runtime is a guarded choice, and it can sit in any of three
   places.** The only finding is a `set()` that runs by default after
   `project()` without `if(NOT DEFINED …)`. Conan 2.32.0 overwrites the
   variable with no watch, so such a `set()` silently beats the profile. The
   dive's "never before `project()`" rule is not adopted. Its fragility
   argument fails, because Conan's own `set()` shadows any earlier value.
4. **`CMAKE_BUILD_TYPE` is a top-level, single-config default, and the
   common idiom is often a no-op.** A library that writes the variable
   changes its parent's build (C2), so that is MUST. After `project()`, a
   plain `CACHE` set does nothing (C1). Before `project()`, a
   `CMAKE_CONFIGURATION_TYPES` test cannot see a multi-config generator
   (C4). This inverts the dive's severities and corrects its canonical
   snippet.
5. **Standards are guarded defaults; the scanning opt-out is MUST.** The
   existing CMK-TGT-05 guard becomes `NOT DEFINED` (map (e) 6), and that
   guard now also wraps `_REQUIRED` and `_EXTENSIONS`. On CMake 3.28 or
   later, C++20+ turns on scanning for sources with no modules, and the
   program's own `3.25...4.4` range triggers it. The consolidation had
   downgraded the dive's MUST to SHOULD as "build cost only". Verify wave 3
   reversed that: on Ninja with a Clang that has no `clang-scan-deps`, the
   configure passes and the build fails (exit 127, measured on 3.31.12 and
   4.4.2), so it stays **MUST** (CMK-TGT-18). `import std` stays gated in 4.4.
6. **Visibility and reproducibility are SHOULD, and sanitizers are
   CONSIDER.** On Linux and macOS, ELF exports every symbol by default
   (measured). Four Google flagship libraries rely on
   `CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS`, so it is a finding only when a
   recipe or port adds it, or when someone offers it as a portable fix.
7. **find_ocx is vacuous for the whole family.** It declares
   `LANGUAGES NONE` and has no targets.

## Conflicts resolved

| # | Conflict | Resolution and reason |
|---|---|---|
| 1 | shared-static proposal "TGT-10": deliver `BUILD_SHARED_LIBS` as a cache entry, including `set(… CACHE BOOL "" FORCE)`, versus CMK-DEP-15: set and restore `CMAKE_POLICY_DEFAULT_CMP0077` around one add | FORCE overrides the user's `-DBUILD_SHARED_LIBS=OFF` (C6). The cache entry is the user's channel (`-D`, preset). Project code uses a scoped normal variable plus DEP-15's knob (C5: the target dependency is SHARED, a later old dependency keeps its own default). **CMK-TGT-10.** |
| 2 | shared-static proposal "TGT-12": PIC "via the variable or the property", versus CMK-BZL-03's "never make PIC depend on `CMAKE_POSITION_INDEPENDENT_CODE`" | Split by binder. A library's correctness never depends on its consumer's variable, so it sets the property on its own static targets. The variable is the top level's seed for other people's targets. The flag is the wrapper's channel (BZL-03). **CMK-TGT-12.** |
| 3 | standards proposal "TGT-10": `CMAKE_MSVC_RUNTIME_LIBRARY` guarded "after `project()`, never before", versus map (e) 7 and CMK-VCPKG-06: "the preset's `cacheVariables` or before the first `project()`" | All three placements are safe under both managers. Conan's `VSRuntimeBlock` `set()` runs inside `project()` and shadows any earlier normal or cache value. vcpkg never touches the variable. The dive's objection, that a `-D` cache entry makes the guard skip, describes the user's own choice, which is correct behaviour. **CMK-TGT-16:** the finding is a default-path, unguarded `set()` after `project()`. |
| 4 | standards proposal "TGT-11": MUST for the two-part `CMAKE_BUILD_TYPE` guard, SHOULD for top-level gating. Its snippet has no `FORCE`. | Measurement inverts it. A subproject's forced default turns the parent's own target into `-O3 -DNDEBUG` (C2), so a library write is MUST. A plain `CACHE` set after `project()` is a no-op, because the empty cache entry already exists (C1). The exemplars the dive cites (aminya, cmake_template) actually carry `FORCE`. **CMK-TGT-17.** |
| 5 | standards dive: arrow's pre-`project()` guard is "the real counter-example", boost's is "correct" | Both sit before `project()`, where `CMAKE_CONFIGURATION_TYPES` is empty even on Ninja Multi-Config (C4). Boost's second half is therefore inert, and the two behave the same. The multi-config test becomes `GENERATOR_IS_MULTI_CONFIG`. The real violator is rapidjson: a library that forces the build type with no top-level guard. |
| 6 | standards proposal "TGT-12": the scanning opt-out is MUST | The consolidation downgraded it to SHOULD, because the dive only configured and saw extra Ninja statements. **Verify wave 3 reversed that: MUST.** Building the same target with Ninja and a Clang that lacks `clang-scan-deps` (Clang 21 via `zig c++`) fails with `CMAKE_CXX_COMPILER_CLANG_SCAN_DEPS-NOTFOUND: command not found` (exit 127) on 3.31.12 and 4.4.2, even though the configure exits 0. **CMK-TGT-18.** |
| 7 | standards dive: the `CXX_IMPORT_STD` UUID `f35a9ac6…` "matches the era re-check" | The value is right for 4.4.2, but the provenance is wrong. The era re-check printed master's `25d6f6aa…`. The binaries hold `d0edc3af…` (3.31.12), `451f2fe2…` (4.3.4) and `f35a9ac6…` (4.4.2) (C7). Rotation is CMK-VER-09's; **CMK-TGT-19** cites it. |
| 8 | standards dive: five flagships set the runtime "unconditionally" (abseil, curl, duckdb, glfw, ccache) | Three do so by default: abseil (the `else()` branch), duckdb, and ccache (`STATIC_LINK` defaults ON on `WIN32`). curl and glfw set it only behind default-OFF opt-in options. That is the sanctioned shape, by the same logic as CMK-TGT-09's Catch2 and spdlog rows. |
| 9 | CMK-TGT-04 SHOULD versus CMK-BZL-03 MUST (map (e) 3) | This applies the map's resolution in place: overwrite = MUST, append = SHOULD. The shared-static dive §6 re-measured it outside the wrap scope. |
| 10 | CMK-TGT-05's guard (`PROJECT_IS_TOP_LEVEL` *or* `NOT DEFINED`) versus CMK-CONAN-10 (map (e) 6) | The guard is `NOT DEFINED CMAKE_CXX_STANDARD`, from Conan 2.32.0 `blocks.py`. `CppStdBlock`'s `set()` is unconditional, and its watch only sees later writes. `PROJECT_IS_TOP_LEVEL` cannot be read before `project()`. Alone, it is wrong in exactly the top-level Conan consumer. |
| 11 | ID pool: both dives and `cmake-skills/modernize-procedure.md` minted a provisional CMK-TGT-10 and up | This file allocates CMK-TGT-10..20. The modernize dive's "TGT-10..18" are procedure ordering and diff-size rules. Skills carry procedures and rules carry standards, so they ship as skill steps that cite TGT and INST IDs, and they get no TGT IDs. Their content rows are already TGT-01/-03 and INST-01. |
| 12 | `install-round-trip-and-cps.md` §10 "PIC reached the archive" as evidence for M-E-09 | Superseded. That run hard-coded the property and never linked into a shared object. Shared-static §2 is the evidence (consumable-library Open question 1 closed). |

## The ruleset

The floor convention follows topic-map conflict 1: rules are written for
`cmake_minimum_required(VERSION 3.25...<max>)`, and newer mechanisms carry
their gate. "Measured" means measured on 3.31.12 and 4.4.2 unless the row
says otherwise. Verifications run from the project root. For a grep,
empty output = pass unless the row says otherwise.

### CMK-TGT: targets, linkage and ABI

#### Carried from `cmake-consumable-library.md` (IDs stable)

| ID | Status | Change |
|---|---|---|
| CMK-TGT-01 | unchanged | Name `PUBLIC`/`PRIVATE`/`INTERFACE` in every `target_link_libraries` call (MUST for libraries, SHOULD for tests). |
| CMK-TGT-02 | unchanged | Namespaced `ALIAS` matching the export name (SHOULD). |
| CMK-TGT-03 | unchanged | `target_*` over directory-scoped commands. Flag in legacy trees; never auto-rewrite (SHOULD). |
| CMK-TGT-04 | **amended** | Severity split in place. **Overwriting** `CMAKE_<LANG>_FLAGS`, `_FLAGS_<CONFIG>` or `CMAKE_<KIND>_LINKER_FLAGS` = **MUST**, because it drops a toolchain's `_INIT` `-fPIC` and the shared link fails (shared-static §6; CMK-BZL-03 M6). **Appending** = SHOULD. The grep adopts BZL-03's `-i` and the linker variables, including `MODULE`. |
| CMK-TGT-05 | **amended** | The guard is `if(NOT DEFINED CMAKE_CXX_STANDARD)`. `PROJECT_IS_TOP_LEVEL` may be added with `AND` and never replaces it. Reading heuristic: a `set(CMAKE_CXX_STANDARD` whose enclosing `if()` lacks `NOT DEFINED CMAKE_CXX_STANDARD` is a finding. MUST. Floor: any. Conan's unconditional `set()` is in every Conan 2 release checked (2.6.0, 2.7.0, 2.32.0). Only the "has been modified" STATUS line needs Conan 2.7.0 (CMK-CONAN-10). |
| CMK-TGT-06 | **amended** | `CMAKE_CXX_STANDARD_REQUIRED ON` sits inside the same `NOT DEFINED` guard. Conan's `CppStdBlock` writes it too (`blocks.py`, Conan 2.32.0). MUST, as before. |
| CMK-TGT-07 | **amended** | `CMAKE_CXX_EXTENSIONS OFF` sits inside the same guard. `CppStdBlock` sets the extensions from the profile (`gnuNN`) and watches only `CMAKE_CXX_STANDARD`, so an unguarded later `set(CMAKE_CXX_EXTENSIONS OFF)` overrides it silently. Verify wave 3 measured this on 3.31.12 and 4.4.2 with a toolchain rendered by hand from `CppStdBlock`, not a Conan-generated file: an `if(PROJECT_IS_TOP_LEVEL)` set after `project()` turns `ext=ON` into `OFF`, and the only STATUS line is for the standard. SHOULD, as before. |
| CMK-TGT-08 | unchanged | Explicit source lists, no `file(GLOB)` (SHOULD). |
| CMK-TGT-09 | unchanged | No unconditional literal `-Werror` or `/WX` in an installable library (MUST). |

#### Caught by a configure probe: library type and PIC

**CMK-TGT-10 — Let the user choose a sub-built dependency's library type through a cache entry (`-DBUILD_SHARED_LIBS=…` or a preset's `cacheVariables`). When project code must choose it, set `BUILD_SHARED_LIBS` as a normal variable and restore it around the one `add_subdirectory` or `FetchContent_MakeAvailable`, together with `CMAKE_POLICY_DEFAULT_CMP0077=NEW` (CMK-DEP-15 owns that knob). Never write it with `CACHE … FORCE`. Confirm the result from the dependency target's `TYPE`.**
- Binds: application consuming packages.
- Rationale (measured): with a normal variable, a dependency on floor 3.12
  builds STATIC, with only a CMP0077 warning (shared-static §1). Set and
  restore plus the policy default builds it SHARED and leaves a later old
  dependency STATIC (C5). `CACHE … FORCE` turns `-DBUILD_SHARED_LIBS=OFF`
  into SHARED (C6).
- Verification:
  ```sh
  grep -rn -i --include='CMakeLists.txt' --include='*.cmake' -e 'BUILD_SHARED_LIBS' .
  ```
  Empty = nothing to check. For each hit, any of these is a finding:
  - a `CACHE … FORCE` write that is not inside `if(NOT DEFINED BUILD_SHARED_LIBS)`;
  - a plain `set()` that is not restored after exactly one add;
  - a plain `set()` without the CMP0077 default, where the dependency's floor is below 3.13.

  Behavioural check, after the add:
  ```cmake
  get_target_property(_dep_type dep TYPE)
  message(STATUS "dep TYPE=${_dep_type}")
  ```
  A type other than the one intended is a finding.
- Severity: **MUST** (measured).
- Floor: CMP0077 and its policy default, 3.13. Any floor for the cache entry.

**CMK-TGT-11 — In a library, never write `BUILD_SHARED_LIBS` with an unguarded `FORCE`, and never hard-code `STATIC` or `SHARED` on an exported target. Declare `option(BUILD_SHARED_LIBS "…" <default>)` or a documented per-kind option (the zlib shape), and let the consumer decide.**
- Binds: library shipping a package. This extends CMK-BZL-07's wrap-scoped
  SHOULD to every consumer, and BZL-07 keeps the wrap rationale.
- Rationale: an unguarded FORCE overrides the consumer's `-D` (C6). A
  hard-coded type ignores both channels (shared-static §1, `staticdep`).
  qtbase's `if(NOT DEFINED BUILD_SHARED_LIBS)` plus FORCE is guarded, so
  it is not a finding.
- Verification:
  ```sh
  grep -rn -i -E --include='CMakeLists.txt' --include='*.cmake' -e 'add_library[[:space:]]*\([[:space:]]*[^[:space:])]+[[:space:]]+(STATIC|SHARED)' .
  ```
  Empty = pass. A hit on an exported target that no `option()` or cache
  variable selects is a finding. For the FORCE half, use CMK-TGT-10's grep.
  The earlier single-space pattern missed 83 of 2,072 corpus hits (a space
  after the paren or a double space). A name and a type on separate lines
  (about 20 corpus hits) are still missed, so read multi-line
  `add_library(` calls by hand.
- Severity: **MUST** for FORCE (measured). SHOULD for a hard-coded type.
- Floor: any.

**CMK-TGT-12 — Make every static library that ends up in a `SHARED` or `MODULE` target position-independent before it is created.**
- The rule:
  - A library sets `POSITION_INDEPENDENT_CODE ON` on its own static targets.
  - A top level that links other people's static targets into a shared
    object sets `CMAKE_POSITION_INDEPENDENT_CODE ON` before the
    `add_subdirectory` or `FetchContent_MakeAvailable` that creates them.
  - Never state that the variable guarantees PIC.
- Binds: library shipping a package (the property); application consuming
  packages (the variable).
- Rationale (measured): without PIC, the shared link fails with
  `relocation R_X86_64_32S against '.data' … recompile with -fPIC`. All three
  variable channels reach a property-less static target (`-D`, `set()`
  before `add_subdirectory`, `set()` before `FetchContent_MakeAvailable`).
  The variable only seeds targets created after it, and never overrides a
  target's own setting (`POSITION_INDEPENDENT_CODE.rst` at v4.4.2;
  shared-static §2). Whether the link fails depends on codegen, so "it links
  here" is no proof.
- Verification:
  ```sh
  cmake -S . -B build -DCMAKE_EXPORT_COMPILE_COMMANDS=ON
  cmake --build build
  grep -rn --include='compile_commands.json' -e '"command"' build
  ```
  Read the line for each source of a static target that feeds a shared
  object. A line without `-fPIC` (or `-fPIE`) is a finding. So is a
  `recompile with -fPIC` link error. As a second check,
  `readelf -rW <member>.o` must show no `R_X86_64_32` or `R_X86_64_32S`
  in `.rela.text`.
- Severity: **MUST** (measured).
- Floor: property since 2.8.9. Any floor.

#### Caught by reading the built artefact: symbols, link items, paths

**CMK-TGT-13 — Give an installable shared library `C_VISIBILITY_PRESET hidden` and `CXX_VISIBILITY_PRESET hidden`, plus `VISIBILITY_INLINES_HIDDEN ON`, and mark its API with `generate_export_header`'s macro. Never offer `WINDOWS_EXPORT_ALL_SYMBOLS` as a portable fix, and never add it in a recipe or port.**
- Binds: library shipping a package; recipe or port author (the second
  sentence).
- Rationale: without the presets, an ELF `.so` exports the API, an internal
  helper and a header `inline` function. With them, it exports only the
  marked symbol (measured on 4.4.2 with `nm -D`; shared-static §3).
  Export-all applies only to MS toolchains on Windows, and even there it
  does not cover global data (`WINDOWS_EXPORT_ALL_SYMBOLS.rst` at v4.4.2).
  vcpkg's maintainer guide says not to add it "unless the author of the
  library is already using it" (map M-E-08). Four Google flagships set it
  upstream. Three of them also carry their own `__declspec` macros for what
  export-all misses: `ABSL_DLL` (abseil), `PROTOBUF_EXPORT` (protobuf) and
  `GRPC_DLL`/`GPR_DLL` (grpc). re2 has none. Upstream use is the author's
  own choice, so for these four it is not a finding.
- Verification: `nm -D --defined-only build/libNAME.so` lists no symbol
  that is missing from the public headers. A list that does not shrink
  when the presets are added is a finding. Presence check:
  ```sh
  grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'VISIBILITY_PRESET' -e 'generate_export_header' .
  ```
  Empty output, for a project that builds a SHARED library, is a finding.
- Severity: SHOULD. The effect is measured, but adoption is 9 of 43
  ([shape] §8) and the harm is ABI surface, not a broken build.
- Floor: any. CMP0063 (3.3) extends the presets to every target type.

**CMK-TGT-14 — Before enabling `CMAKE_LINK_LIBRARIES_ONLY_TARGETS`, replace every bare `m`, `pthread`, `dl` or `rt` link item with an imported target (`Threads::Threads`) or an absolute path. Judge the result by the configure exit code, not by the log.**
- Binds: every project that adopts the setting.
- Rationale (measured on 4.4.2): a misspelling, a bare `m` and a bare
  `pthread` all fail with the same error, "`… which is not a target`",
  and exit 1. An absolute path and `Threads::Threads` pass. The error
  arrives in the generate step, after `Configuring done`. Shared-static §4.
- Verification:
  ```sh
  grep -rn -A3 --include='CMakeLists.txt' --include='*.cmake' -e 'target_link_libraries(' .
  ```
  Read the items. A bare system name is a finding before the setting is
  enabled. After enabling, `cmake -S . -B build` must exit 0.
- Severity: SHOULD. Enabling the setting is CONSIDER.
- Floor: 3.23.

**CMK-TGT-15 — When a build must not embed its checkout or build path, pass `-ffile-prefix-map=<source dir>=<canonical>` and `-ffile-prefix-map=<binary dir>=<canonical>` yourself. Use a compiler-guarded `target_compile_options`, or a toolchain file's `CMAKE_<LANG>_FLAGS_INIT`. CMake has no native variable for this, and `CMAKE_DEBUG_PREFIX_MAP` does not exist.**
- Binds: every project that promises reproducible builds.
- Rationale (measured on 4.4.2): without the flags, objects built from two
  directories differ and embed both paths. With either channel they are
  byte-identical. `cmake --help-variable CMAKE_DEBUG_PREFIX_MAP` fails
  (shared-static §5). The flag is GCC and Clang only.
- Verification: build the project from two checkout directories and `cmp`
  the objects. Then run
  `SRC_DIR=/abs/checkout; grep -rlF --include='*.o' -e "$SRC_DIR" build`.
  Empty = pass.
- Severity: SHOULD (conditional on the reproducibility promise).
- Floor: any.

#### Caught by greps over standard, runtime and build-type setters

**CMK-TGT-16 — Choose the MSVC runtime only through `CMAKE_MSVC_RUNTIME_LIBRARY` or `MSVC_RUNTIME_LIBRARY`, never with `/MD` or `/MT` flags. Never let a `set(CMAKE_MSVC_RUNTIME_LIBRARY …)` run by default after `project()`. Put the value in a preset's `cacheVariables`, inside `if(NOT DEFINED CMAKE_MSVC_RUNTIME_LIBRARY)`, or behind a default-OFF option.**
- Binds: application consuming packages; library shipping a package.
- Rationale:
  - Conan 2.32.0 `VSRuntimeBlock` sets the variable with no
    `variable_watch`, so a later `set()` overrides `compiler.runtime` with
    no message at all (`blocks.py:60-76`; standards §3).
  - The variable is read when each target is created
    (`CMAKE_MSVC_RUNTIME_LIBRARY.rst` at v4.4.2).
  - vcpkg's toolchain never sets it, so a static triplet needs the project
    to set it (CMK-VCPKG-06). The open issue
    [vcpkg#50271](https://github.com/microsoft/vcpkg/issues/50271) is this
    failure.
  - No Windows host exists, so the link failure (LNK2038) comes from
    documents and issues, not from a measurement.
- Verification:
  ```sh
  grep -rn -E --include='CMakeLists.txt' --include='*.cmake' -e 'CMAKE_MSVC_RUNTIME_LIBRARY' -e '[/-]M[TD]d?([^A-Za-z]|$)' .
  ```
  Empty = pass. A runtime flag (`/MT`, `/MD`, `-MT`, `-MTd` and so on) is a
  finding. So is a `set()` that runs by default after `project()` outside a
  `NOT DEFINED` guard or a default-OFF option. MSVC accepts the dash
  spelling. The earlier `-e '/MT' -e '/MD'` form missed curl's
  `$<$<CONFIG:Release>:-MT>`. Treat GCC depfile flags (`-MD -MT <DEP_TARGET>`)
  as noise.
- Severity: **MUST**. The evidence is normative: the tool's own source and
  CMake's docs.
- Floor: 3.15 (CMP0091). The guard works on any floor.

**CMK-TGT-17 — Only the top-level project defaults `CMAKE_BUILD_TYPE`, and only on a single-config generator. A library never writes it. Test for multi-config with `GENERATOR_IS_MULTI_CONFIG`. After `project()`, a cache default needs `CACHE … FORCE`, because a plain `CACHE` set there does nothing. A normal `set()` there does take effect, but it leaves the cache entry empty.**
- Binds: library shipping a package (never write it); application (how to
  default it).
- Rationale (measured):
  - C1: a plain `CACHE` set after `project()` leaves the value empty.
  - C3: `FORCE` after `project()`, or a plain `CACHE` set before it, takes
    effect.
  - C2: a subproject's `if(NOT CMAKE_BUILD_TYPE) … FORCE` makes its parent's
    own target compile with `-O3 -DNDEBUG`.
  - C4: before `project()`, a Ninja Multi-Config generator reports
    `CMAKE_CONFIGURATION_TYPES` empty and `GENERATOR_IS_MULTI_CONFIG` = 1.
  - Verify wave 3: a normal `set(CMAKE_BUILD_TYPE RelWithDebInfo)` after
    `project()` gives the target `-O2 -g -DNDEBUG`, while the cache still
    reads `CMAKE_BUILD_TYPE:STRING=` (3.31.12 and 4.4.2). ClickHouse ships
    this shape (`ClickHouse__ClickHouse@0995a518a8:CMakeLists.txt:67-70`).

  The shape to ship, placed after `project()`:
  ```cmake
  get_property(_is_multi GLOBAL PROPERTY GENERATOR_IS_MULTI_CONFIG)
  if(PROJECT_IS_TOP_LEVEL AND NOT _is_multi AND NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE RelWithDebInfo CACHE STRING "Build type" FORCE)
  endif()
  ```
- Verification:
  ```sh
  grep -rn -i -E --include='CMakeLists.txt' --include='*.cmake' -e 'set[[:space:]]*\([[:space:]]*CMAKE_BUILD_TYPE' .
  ```
  Empty = nothing to check. The earlier `set(CMAKE_BUILD_TYPE` pattern
  missed `set (CMAKE_BUILD_TYPE …)`, which ClickHouse uses. Each of these is
  a finding:
  - a hit in a library's files outside a top-level guard;
  - a `CACHE` hit after `project()` without `FORCE`;
  - a hit before `project()` whose only multi-config test is
    `CMAKE_CONFIGURATION_TYPES`.

  Behavioural check: configure with no `-D`, then
  `grep -rn --include='CMakeCache.txt' -e '^CMAKE_BUILD_TYPE:' build`. An
  empty value where the project promises a `CACHE` default is a finding.
  For a normal-variable default the cache stays empty by design, so read the
  target's compile flags instead:
  `grep -rn --include='flags.make' -e '_FLAGS = ' build`. With Ninja, read
  `compile_commands.json` instead.
- Severity: **MUST** for the library write and the no-op (measured).
  SHOULD for the multi-config test.
- Floor: `GENERATOR_IS_MULTI_CONFIG` 3.9. `PROJECT_IS_TOP_LEVEL` 3.21; below
  3.21, use the shim.

#### Caught by the build graph: C++20 modules

**CMK-TGT-18 — When a target's C++ standard rises to 20 or later and the project has no named-module sources, set `CMAKE_CXX_SCAN_FOR_MODULES OFF` as a normal variable (never a cache entry), or set the target property. Prefer this over `cmake_policy(SET CMP0155 OLD)`.**
- Binds: every C++ project on CMake 3.28 or later. A `3.25...4.4` range
  makes CMP0155 NEW, because the upper bound sets policies
  (`cmake_minimum_required` semantics).
- Rationale (measured on 4.4.2 with Ninja 1.13.2): a `CXX_STANDARD 20`
  target with no module source gets `CXX_SCAN__`, `.ddi` and `CXX_DYNDEP__`
  statements. At 17 it gets one compile statement, and
  `CMAKE_CXX_SCAN_FOR_MODULES 0` restores that. This is the
  "Scanning Without Modules" mitigation in `cmake-cxxmodules(7)`
  (standards §5). That manual says the variable "should **not** be in the
  cache", because a cache entry leaks into projects that consume this one
  through `FetchContent`.
- Rationale, the build break (measured by verify wave 3 on 3.31.12 and 4.4.2,
  Ninja 1.13.2, Clang 21 via `zig c++`, which has no `clang-scan-deps`):
  - the `CXX_STANDARD 20` target configures with exit 0, and CMake caches
    `CMAKE_CXX_COMPILER_CLANG_SCAN_DEPS-NOTFOUND`;
  - `cmake --build` then fails with
    `CMAKE_CXX_COMPILER_CLANG_SCAN_DEPS-NOTFOUND: command not found`
    (exit 127);
  - `CXX_STANDARD 17`, or 20 with `CMAKE_CXX_SCAN_FOR_MODULES 0`, builds;
  - Unix Makefiles emitted no scan step and built at 20 on both versions.

  A library cannot know whether its consumer's Clang ships the scanner.
- Verification:
  ```sh
  grep -rl --include='*.ninja' -e 'CXX_SCAN__' -e 'CXX_DYNDEP__' build
  ```
  Empty = pass. A listed file, when the project has no
  `FILE_SET CXX_MODULES`, is a finding. The glob must be `*.ninja`. Ninja
  Multi-Config writes the statements to `CMakeFiles/impl-<Config>.ninja`,
  where the earlier `build.ninja`-only grep counted 0 (measured).
- Severity: **MUST** (measured build failure). The rule was SHOULD before
  verify wave 3.
- Floor: 3.28.

**CMK-TGT-19 — Ship a C++20 named-module interface only as an extra, opt-in target beside the classic one.**
- The rule:
  - State the module target's standard with
    `target_compile_features(<t> PUBLIC cxx_std_20)`.
  - Gate the target on CMake 3.28 or later.
  - Gate it on a generator that supports modules: Ninja 1.11 or later, or
    Visual Studio 17.4 or later.
  - Gate it on a compiler that supports modules: GCC 14+, Clang 16+ or
    MSVC 14.34+.
  - Keep `import std` behind `CMAKE_EXPERIMENTAL_CXX_IMPORT_STD`, using the
    UUID of the exact CMake binary (CMK-VER-09), on Ninja only.
  - Gate `import std` on its own, stricter toolchains: Clang 18.1.2+
    (libc++ or libstdc++), MSVC 14.36+ (VS 17.6+) or GCC 15+
    (`cmake-cxxmodules.7.rst`, "import std Support", at 4.4.2).
- Binds: library shipping a package.
- Rationale: the gates come from the compiler and generator matrix in
  `cmake-cxxmodules.7.rst` at v4.4.2. Two of 46 repos ship modules in
  production (fmt, nlohmann/json), both as extra targets ([shape] §5).
  Kitware's "the experiment is over" covers named modules, not `import std`.
  The 4.4.2 gate is `f35a9ac6…` (C7). BZL-CC-27 owns modules under Bazel.
- Verification:
  ```sh
  grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'CXX_MODULES' -e 'CMAKE_EXPERIMENTAL_CXX_IMPORT_STD' .
  ```
  Each of these is a finding:
  - a `FILE_SET … CXX_MODULES` target that is the only target, or that no
    option or `CMAKE_VERSION` guard gates;
  - a gate UUID that differs from the value in the pinned binary.

  Empty = nothing to check. Behavioural check for the UUID: configure a C++
  project with the gate set. On 4.4.2, a wrong UUID prints
  `CMAKE_EXPERIMENTAL_CXX_IMPORT_STD is set to incorrect value`, and that
  line is the finding. The right UUID prints "support for `import std;` …
  is experimental" (measured by verify wave 3; 3.31.12 accepted
  `d0edc3af…`).
- Severity: SHOULD.
- Floor: 3.28. `import std` is experimental through 4.4.

#### Reading heuristic: sanitizers

**CMK-TGT-20 — Select sanitizers with cache options. Apply each one as both `target_compile_options` and `target_link_options` on an `INTERFACE` options target, and let each CI leg pick its combination in a preset. On Windows, pair clang sanitizers with a non-debug runtime, and standalone UBSan with a static one.**
- Binds: application consuming packages; library development builds.
- Rationale: both maintained sanitizer modules in the corpus use this shape:
  `aminya__project_options@412045e1f1:src/Sanitizers.cmake` and
  `cpp-best-practices__cmake_template@b86318abbf:cmake/Sanitizers.cmake`.
  project_options documents the two Windows runtime traps at
  `src/Sanitizers.cmake:169-186` and `:735-751` (standards §7). This is
  codified and argued, and was not measured. BZL-CC-18 owns sanitizers under
  Bazel.
- Verification:
  ```sh
  grep -rn --include='CMakeLists.txt' --include='*.cmake' --include='CMakePresets.json' -e '-fsanitize=' .
  ```
  A hit inside `CMAKE_*_FLAGS` or `add_compile_options` is a finding
  (CMK-TGT-04 or -03). So is a compile-only hit with no matching link
  option.
- Severity: CONSIDER.
- Floor: `target_link_options` 3.13. Any floor.

Not given IDs:
- M-E-18 (in-source build refusal, `enable_language` before `project()`)
  and M-E-19 (IPO, unity builds, PCH) are P3 performance knobs. No
  correctness failure was found for them.
- M-E-06 (`PROJECT_IS_TOP_LEVEL` gating) belongs to the dependency-seam
  group.
- M-E-12's Windows link behaviour is unmeasured (see Open questions).

## Applied to find_ocx and the exemplars

| Rule | Satisfied by | Violated by | find_ocx |
|---|---|---|---|
| TGT-04 (amended) | shared-static §6 append case (`-fPIC -DWRAP_SEED=1 -Wall` survives) | the overwrite scaffold reproduces the link failure; corpus counts are CMK-TGT-04's in `cmake-consumable-library.md` | vacuous: `LANGUAGES NONE` |
| TGT-05/06/07 (amended) | TGT-05 only: `cpp-best-practices__cmake_template@b86318abbf:CMakeLists.txt:11-13` (`NOT DEFINED`, before `project()`). The same file has no `CMAKE_CXX_STANDARD_REQUIRED`, which is a TGT-06 finding by the rule text, mitigated by `cxx_std_${CMAKE_CXX_STANDARD}` at `:53`. Its `set(CMAKE_CXX_EXTENSIONS OFF)` at `:18` is outside the guard but before `project()`, where Conan's later `set()` still wins (verify wave 3). | none seen using `PROJECT_IS_TOP_LEVEL` alone: a latent trap. `duckdb__duckdb@d8a1bd4f4f:CMakeLists.txt:90-91` sets `_REQUIRED` and `_EXTENSIONS` unguarded at top level | vacuous |
| TGT-10 | `qt__qtbase@0ef5a8e9ca:cmake/QtAutoDetectHelpers.cmake:11-13` (FORCE only under `NOT DEFINED`) | not surveyed corpus-wide; spot grep found no unguarded parent-side FORCE outside ports | vacuous |
| TGT-11 | zlib-style per-kind option (CMK-BZL-07 row) | not surveyed beyond BZL-07 | vacuous |
| TGT-12 | `duckdb__duckdb@d8a1bd4f4f:CMakeLists.txt:94` (top-level `CMAKE_POSITION_INDEPENDENT_CODE ON` before its adds) | not surveyed; `install-round-trip` §10 is not evidence either way | vacuous |
| TGT-13 | 9 of 43 repos use `GenerateExportHeader` ([shape] §8) | rely on export-all upstream (context, not a finding): `abseil__abseil-cpp@61d073d671:absl/copts/AbseilConfigureCopts.cmake:8`, `google__re2@972a15cedd:CMakeLists.txt:52`, `protocolbuffers__protobuf@c64743979d:CMakeLists.txt:260`, `grpc__grpc@0f8d72ed71:CMakeLists.txt:39` | vacuous |
| TGT-16 | `jbeder__yaml-cpp@1e0876c671:CMakeLists.txt:54-57`; `google__googletest@4267679b68:googletest/cmake/internal_utils.cmake:74-76`; opt-in: `curl__curl@98519dac83:CMakeLists.txt:379-383` (variable only; see the next cell), `glfw__glfw@92dcf4ce74:CMakeLists.txt:70-72` | `abseil__abseil-cpp@61d073d671:CMakeLists.txt:63-67` (the default branch sets `…DLL`); `duckdb__duckdb@d8a1bd4f4f:CMakeLists.txt:96`; `ccache__ccache@b471bbde29:cmake/StaticLinkSupport.cmake:3-21` (default ON on `WIN32`); `curl__curl@98519dac83:CMakeLists.txt:384-385` also appends raw `-MT`/`-MTd` compile options behind its default-OFF `CURL_STATIC_CRT`. That is opt-in, but a raw flag is still this rule's finding (verify wave 3) | vacuous |
| TGT-17 | `aminya__project_options@412045e1f1:src/Common.cmake:21-26` and `cpp-best-practices__cmake_template@b86318abbf:cmake/StandardProjectSettings.cmake:2-6` (FORCE after `project()`); `apache__arrow@3ad410b7b1:cpp/CMakeLists.txt:104-108` and `boostorg__boost@a61cfa03ba:CMakeLists.txt:8-11` (before `project()`; the multi-config half is inert, C4) | `Tencent__rapidjson@24b5e7a8b2:CMakeLists.txt:13-15`: a consumable library that forces `RelWithDebInfo` with no top-level guard, which flips a parent build (C2) | vacuous |
| TGT-18 | `cpp-best-practices__cmake_template@b86318abbf:CMakeLists.txt:3-4` (policy-level form, `CMP0155 OLD`) | latent in every C++20+ corpus project without an opt-out; not re-surveyed | vacuous |
| TGT-19 | `fmtlib__fmt@522e2c12ab:CMakeLists.txt:340-366`; `nlohmann__json@f422b753cc:src/modules/CMakeLists.txt` | none: no corpus repo ships modules as its only target | vacuous |
| TGT-20 | the two sanitizer modules above | not surveyed; 25 of 46 repos carry `-fsanitize=` somewhere ([deps] §9) | vacuous |

The whole family is vacuous for find_ocx. Every example and fixture declares
`LANGUAGES NONE`, and it has no `add_library` or `target_link_libraries`
(`cmake-consumable-library.md` Verdict 7; standards "Exemplar evidence").
This group adds nothing to its handoff note.

The new commitments are CMK-TGT-10..20, together with the amended guard and
severity text in TGT-04..07. They bind libraries and applications that adopt
the ruleset. No corpus repo is checked against TGT-10, -11, -14 or -15 beyond
spot reads.

## AI-agent failure modes

Ranked by how often each one bites, weighted by how silent it is.

1. **Writing `set(BUILD_SHARED_LIBS ON)` before a fetch and assuming it
   took, or "fixing" it with `CACHE … FORCE`.** The first is silent on old
   dependencies. The second overrides the user. *Check:* CMK-TGT-10's grep
   plus the `TYPE` message.
2. **Putting `set(CMAKE_CXX_STANDARD …)` or `set(CMAKE_MSVC_RUNTIME_LIBRARY …)`
   after `project()` inside `if(PROJECT_IS_TOP_LEVEL)` and calling it
   Conan-safe.** The top level is the topology where the override fires.
   The runtime override prints nothing. *Check:* TGT-05's and TGT-16's
   greps. To debug an LNK2038, read the generated `conan_toolchain.cmake`,
   not the configure log.
3. **Copying the build-type idiom without `FORCE` after `project()`, or
   putting it in a library.** The first is a no-op (C1). The second changes
   the parent's build (C2). *Check:* CMK-TGT-17's grep and the
   `CMakeCache.txt` read.
4. **Treating `CMAKE_POSITION_INDEPENDENT_CODE` as a global guarantee, or
   "it links on my machine" as proof.** *Check:* the compile line for each
   static member (CMK-TGT-12), not the link result.
5. **Raising the standard to C++20 without noticing that scanning turned on.**
   *Check:* the `build.ninja` count (CMK-TGT-18).
6. **Citing "the experiment is over" for `import std`, or copying a gate
   UUID from another CMake version.** *Check:* CMK-TGT-19's grep, against
   the UUID in the pinned binary (CMK-VER-09).
7. **Believing symbol visibility is a Windows-only problem, or offering
   `CMAKE_WINDOWS_EXPORT_ALL_SYMBOLS` as the portable fix.** *Check:*
   `nm -D --defined-only` on the real `.so` (CMK-TGT-13).
8. **Inventing a CMake variable: `CMAKE_DEBUG_PREFIX_MAP` or
   `CMAKE_CXX_STANDARD_EXTENSIONS`.** *Check:* `cmake --help-variable NAME`
   must succeed for every `CMAKE_`-prefixed name an agent writes (TGT-15,
   TGT-07).
9. **Enabling `CMAKE_LINK_LIBRARIES_ONLY_TARGETS` as free hardening, or
   reading "Configuring done" as success.** *Check:* the bare-name read
   first, then the exit code (CMK-TGT-14).
10. **Putting `-fsanitize=` in the global flags or in compile options only,
    or porting a Linux sanitizer job to Windows unchanged.** *Check:*
    CMK-TGT-20's grep and the runtime pairing.

## Open questions

**Owner decisions** (defaults apply if unanswered):

1. **ID ownership.** `cmake-skills/modernize-procedure.md` minted a
   provisional CMK-TGT-10..18. Under conflict 11, the skills consolidation
   must cite TGT and INST IDs and mint none. *Default:* as resolved. The
   skills consolidation renumbers its procedure rules as skill steps.
2. **CMK-TGT-16 is MUST without a Windows measurement.** *Default:* keep it
   MUST. The evidence is the tool's own source plus CMake's docs, which
   meets the normative bar.

**Another research round**, one line per subarea:

- **targets-and-abi, Windows:** on a Windows runner, does an unguarded
  runtime `set()` after `project()` under a `compiler.runtime=static` Conan
  profile produce LNK2038? Does export-all miss data symbols? Do the two
  sanitizer runtime traps reproduce?
- **targets-and-abi, libstdc++ dual ABI (M-L-05):** the brief's
  "`_GLIBCXX_USE_CXX11_ABI` / Conan `compiler.libcxx=libstdc++` vs
  `libstdc++11`" question went unanswered. The host has no `g++`, and
  `zig c++` uses libc++. Measure on a host with g++.
- **targets-and-abi, PIC portability:** does the CMK-TGT-12 failure
  reproduce, or stay hidden, on default-PIE toolchains (Ubuntu gcc, Alpine
  musl)? The answer decides whether the rule may ever cite a link result.
- **targets-and-abi, scanning and clang-tidy:** does CMP0155 NEW change
  `compile_commands.json` in a way that breaks clang-tidy? cmake_template
  asserts it does. Verify wave 3 settled the severity question separately:
  TGT-18 is MUST because of the Ninja build break. Unix Makefiles emitted
  no scan step at C++20 on 3.31.12 and 4.4.2.
- **targets-and-abi, violator census:** count TGT-10, -11, -16 and -17
  violators across the corpus with the multi-line parser. This round had
  spot reads only.

## Sub-artifacts

- [shared-static-visibility-pic.md](cmake-targets-and-abi/shared-static-visibility-pic.md):
  measured on 3.31.12 and 4.4.2.
  - `BUILD_SHARED_LIBS` and CMP0077 into a fetched dependency.
  - PIC across three channels, plus the baseline link failure.
  - ELF visibility with `nm -D`.
  - The `CMAKE_LINK_LIBRARIES_ONLY_TARGETS` diagnostics.
  - `-ffile-prefix-map` reproducibility.
  - The CMK-TGT-04 append-versus-overwrite re-check.

  Its CACHE-FORCE remedy is rejected (conflict 1).
- [standards-modules-and-abi.md](cmake-targets-and-abi/standards-modules-and-abi.md):
  - Conan `blocks.py` source behind the `CMAKE_CXX_STANDARD` and runtime
    guards.
  - The modules gate table and the measured C++20 scanning surprise.
  - `CMAKE_BUILD_TYPE` exemplars and sanitizer modules.
  - LNK2038 issue-tracker evidence.

  Its runtime placement, build-type severity and snippet, scanning severity
  and violator list are corrected above (conflicts 3-8).
- [scratch/cmk-tgt-consolidation/](cmake-targets-and-abi/scratch/cmk-tgt-consolidation/):
  this consolidation's measurements C1-C6 and `run.sh`.

## Key sources

1. Measurement C1-C3 (`bt-noforce`, `bt-preproject`, `bt-force`,
   `bt-force-sub`) on 3.31.12 and 4.4.2:
   - a plain `CACHE` build-type default after `project()` is a no-op;
   - `FORCE`, or a pre-`project()` set, takes effect;
   - a subproject's forced default gives the parent's target
     `-O3 -DNDEBUG`.
2. Measurement C4 (`mc-preproject`, Ninja Multi-Config, 3.31.12 and 4.4.2):
   before `project()`, `CMAKE_CONFIGURATION_TYPES=[]` and
   `GENERATOR_IS_MULTI_CONFIG=1`.
3. Measurement C5 and C6 (`bsl-scoped`, `bsl-force`), 3.31.12 and 4.4.2:
   - with set/restore plus `CMAKE_POLICY_DEFAULT_CMP0077=NEW`, the target
     dependency is `SHARED_LIBRARY` and a later old dependency is
     `STATIC_LIBRARY`;
   - with `CACHE … FORCE`, `-DBUILD_SHARED_LIBS=OFF` still yields
     `SHARED_LIBRARY`.
4. Measurement C7: the `CXX_IMPORT_STD` UUID read from each binary.
   `d0edc3af…` on 3.31.12, `451f2fe2…` on 4.3.4, `f35a9ac6…` on 4.4.2.
5. shared-static §1-§6 measurements: CMP0077 discard, PIC link failure and
   channels, `nm -D` before and after, the link-items table,
   `cmp`/`strings` identity, the append-versus-overwrite split.
6. standards §5 measurement: the `build.ninja` diff for `CXX_STANDARD` 17
   versus 20, and `CMAKE_CXX_SCAN_FOR_MODULES 0`.
7. [`conan/tools/cmake/toolchain/blocks.py` @ Conan 2.32.0](https://github.com/conan-io/conan/blob/2.32.0/conan/tools/cmake/toolchain/blocks.py):
   `CppStdBlock` (unconditional `set()` plus a later watch) and
   `VSRuntimeBlock` (no watch).
8. [Help/prop_tgt/POSITION_INDEPENDENT_CODE.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/prop_tgt/POSITION_INDEPENDENT_CODE.rst):
   the property is initialised only when the target is created.
9. [Help/policy/CMP0077.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0077.rst):
   `option()` and normal variables.
10. [Help/manual/cmake-cxxmodules.7.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-cxxmodules.7.rst)
    and [Help/policy/CMP0155.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0155.rst):
    the gate matrix, "Scanning Without Modules", and the fact that scanning
    runs regardless of content.
11. [Help/variable/CMAKE_MSVC_RUNTIME_LIBRARY.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_MSVC_RUNTIME_LIBRARY.rst)
    and [CMP0091](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/policy/CMP0091.rst):
    the variable is read at target creation.
12. [Help/prop_tgt/WINDOWS_EXPORT_ALL_SYMBOLS.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/prop_tgt/WINDOWS_EXPORT_ALL_SYMBOLS.rst):
    MS toolchains only; data symbols are not covered.
13. [microsoft/vcpkg#50271](https://github.com/microsoft/vcpkg/issues/50271):
    an open, current instance of the static-triplet runtime mismatch.
14. [Kitware, "Import CMake: the Experiment is Over"](https://www.kitware.com/import-cmake-the-experiment-is-over/):
    named modules left experimental in 3.28; `import std` did not.

## Revision log

Ledger: [cmake-targets-and-abi/verification-wave3.md](cmake-targets-and-abi/verification-wave3.md).

- verify wave 3: CMK-TGT-18 goes from SHOULD to **MUST**. With Ninja and a
  Clang that has no `clang-scan-deps`, the C++20 target without modules
  configures and then fails to build (exit 127) on 3.31.12 and 4.4.2.
  Verdict 5 and conflict 6 are amended to match.
- verify wave 3: the CMK-TGT-18 grep widens from `build.ninja` to
  `*.ninja` and becomes `-rl` (empty = pass). The old form read 0 on Ninja
  Multi-Config, which writes the statements to `CMakeFiles/impl-<Config>.ninja`.
- verify wave 3: CMK-TGT-18 now says to set `CMAKE_CXX_SCAN_FOR_MODULES` as
  a normal variable, never a cache entry (`cmake-cxxmodules(7)` at 4.4.2).
- verify wave 3: CMK-TGT-17's finding and title are narrowed. A plain
  `CACHE` set after `project()` is the no-op. A normal `set()` does take
  effect, while the cache stays empty (measured). The behavioural check now
  reads compile flags for a normal-variable default.
- verify wave 3: the CMK-TGT-17 grep now tolerates whitespace before and
  after the paren. The old pattern missed ClickHouse's
  `set (CMAKE_BUILD_TYPE …)`.
- verify wave 3: the CMK-TGT-16 grep now catches the dash spelling
  (`-MT`, `-MTd`). The old `/MT`, `/MD` form missed
  `curl__curl@98519dac83:CMakeLists.txt:384-385`, which is added to the
  violators column.
- verify wave 3: the CMK-TGT-13 rationale is corrected. abseil, protobuf and
  grpc do carry `__declspec` export macros; only re2 has none. The "not a
  finding" conclusion stands, now resting on vcpkg's exemption for an author
  who already uses export-all.
- verify wave 3: the CMK-TGT-11 grep is widened to any whitespace. The old
  form missed 83 of 2,072 corpus hits. Multi-line calls are still a manual read.
- verify wave 3: the CMK-TGT-05 floor note is corrected. Conan's
  unconditional `set()` is in 2.6.0 as well, so only the STATUS line needs
  2.7.0.
- verify wave 3: CMK-TGT-07's "read from source, not measured" is replaced
  by a measurement against a hand-rendered `CppStdBlock` toolchain on
  3.31.12 and 4.4.2.
- verify wave 3: CMK-TGT-19 gains the `import std` toolchain gates
  (Clang 18.1.2+, MSVC 14.36+, GCC 15+) and a behavioural UUID check (the
  "set to incorrect value" warning on 4.4.2).
- verify wave 3: the TGT-05/06/07 exemplar cell is corrected. cmake_template
  satisfies TGT-05 only, at lines 11-13 rather than 10-12. It lacks
  `CMAKE_CXX_STANDARD_REQUIRED`, and it sets `CMAKE_CXX_EXTENSIONS` outside
  the guard, before `project()`.

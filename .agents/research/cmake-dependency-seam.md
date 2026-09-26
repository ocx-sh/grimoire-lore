---
title: "The dependency seam — find_package, FetchContent, providers, toolchains and CPS (consolidation)"
topic: "The dependency seam: find_package, FetchContent, providers, toolchains and CPS"
model: opus
id_family: "CMK-DEP, CMK-TC"
consolidates:
  - cmake-dependency-seam/resolution-order-and-providers.md
  - cmake-dependency-seam/pinning-offline-and-cpm.md
  - cmake-dependency-seam/toolchain-composition.md
  - cmake-dependency-seam/cps-spec-and-cmake-implementation.md
  - cmake-dependency-seam/cps-ecosystem-adoption-and-interop.md
  - cmake-dependency-seam/cps-verification.md
  - cmake-dependency-seam/cross-compile-find-root.md
  - cmake-dependency-seam/scope-classification-and-find-module-migration.md
  - cmake-audit/find-ocx-cmake-shape-and-contracts.md
  - cmake-audit/fleet-inventory-and-bazel-overlap.md
  - cmake-audit/exemplar-cmake-shape.md
  - cmake-audit/exemplar-deps-and-dual-build.md
date: 2026-09-26
verified: 2026-09-26
verification: cmake-dependency-seam/verification-wave2.md
verification_wave3: cmake-dependency-seam/verification-wave3.md
revised: 2026-09-26
---

# The dependency seam — consolidation

Binaries: CMake **3.31.12** and **4.4.2** (4.3.4 where named), run through
`ocx package exec kitware/cmake:<line>`; upstream's newest tag is 4.4.3
([era recheck](cmake-topic-map/era-recheck-2026-09-26.md)). Conan 2.32.0,
vcpkg 2026.07.29 / vcpkg-tool 2026-07-27, CPM.cmake v0.43.2, cpp-pm/hunter
v0.26.12. Corpus SHAs are the 2026-09-26 set in the topic map's host table.
Rules assume the map's floor, `cmake_minimum_required(VERSION 3.25...<max>)`,
and name their own gate where the mechanism is newer or older.

Measurements this consolidation added (sources and a `run.sh` in
[`scratch/dependency-seam-consolidation/`](cmake-dependency-seam/scratch/dependency-seam-consolidation/),
run 2026-09-26 on 3.31.12 and 4.4.2, identical on both):

| # | Experiment | Result |
|---|---|---|
| C1 | User passes `-DCMAKE_PROJECT_TOP_LEVEL_INCLUDES=user.cmake`; the project does `set(CMAKE_PROJECT_TOP_LEVEL_INCLUDES proj.cmake)` before `project()` | The user's file never runs. The project's normal variable shadows the user's cache entry, silently. |
| C2 | Same, but the project does `list(APPEND CMAKE_PROJECT_TOP_LEVEL_INCLUDES proj.cmake)` (the `aminya__project_options@412045e1f1:src/Conan.cmake:237` shape) | Both files run in list order; the project's provider registers last and silently replaces the user's. Only the project's provider is ever called. |
| C3 | `set(CMAKE_POLICY_DEFAULT_CMP0077 NEW)` before `FetchContent_MakeAvailable(depA)`, `unset()` before `FetchContent_MakeAvailable(depB)`; both deps have floor 3.10 and `option(<x>_TESTS ON)`; parent pre-set both to `OFF` | depA honours `OFF`; depB warns CMP0077 and resets to `ON`. The scoped form works and does not leak. |
| C4 | `set(dep_ROOT <prefix-A> CACHE PATH "" FORCE)` + `find_package(dep CONFIG REQUIRED)`; reconfigure the same tree with the hint re-pointed to prefix-B | `dep_ROOT` shows B, `dep_DIR` stays at A, and copy A is used. Adding `unset(dep_DIR CACHE)` when the hint changes makes the second run pick B. |
| C5 | `dep_ROOT` set, then a top-level `find_program(DEPPROG_EXE NAMES depprog)` with `depprog` only under `<dep_ROOT>/bin` | `DEPPROG_EXE-NOTFOUND`. A `<Pkg>_ROOT` hint does not reach a `find_*` call outside `find_package(<Pkg>)`. |
| C6 | `include(cmake/CPM.cmake)` (verbatim `cpm-cmake__CPM.cmake@01678cfe17`) in a floor-3.10 project | The includer's own `CMP0077` stays unset (the include pops its policy scope), but `CMAKE_POLICY_DEFAULT_CMP0077` and `..._CMP0135` read `NEW` afterwards. CPM leaks policy defaults into every subproject added after it. |
| C7 | `--help-*` on 3.31.12 and 4.4.2 | `FIND_PACKAGE_ARGS` and `OVERRIDE_FIND_PACKAGE` share one `versionadded:: 3.24` block. `FetchContent` `SYSTEM` is 3.25, `EXCLUDE_FROM_ALL` 3.28, `cmake_language(DEFER)` 3.19. `CMAKE_POLICY_VERSION_MINIMUM` is `versionadded:: 4.0` and undefined on 3.31.12. CMP0135 is 3.24, CMP0144 and CMP0150 3.27, CMP0168/0169/0170 3.30. |

Measurements the wave-3 revision added (sources and `run.sh` per experiment in
[`scratch/dependency-seam-revision/`](cmake-dependency-seam/scratch/dependency-seam-revision/),
run 2026-09-26 on 3.31.12 and 4.4.2, identical on both). R1 re-checks a claim
of [cross] that disagreed with verify wave 2; R2 re-checks the remedy for
[cross] §5; R3 re-checks the floor heuristic of [scope] candidate 4.

| # | Experiment | Result |
|---|---|---|
| R1 | Toolchain file that appends one line per read; `project(p LANGUAGES C)`, gcc, Ninja; then nothing, one `check_c_source_compiles`, two `try_compile(… SOURCE_FROM_CONTENT …)`, or two `try_compile(… PROJECT …)` | 3, 4, 5 and 5 reads. Every `try_compile`, both signatures and every `check_*` macro, re-reads the toolchain once. [cross] §10's "the `SOURCES` signature does not re-read" is refuted. |
| R2 | `LANGUAGES NONE`, `list(APPEND CMAKE_FIND_ROOT_PATH mgr)`, `CMAKE_PREFIX_PATH=mgr`, `foo_ROOT=hint` `CACHE … FORCE`, `find_package(foo CONFIG)`; not a cross build | Mode unset, `BOTH` or `ONLY`: `mgr` wins. `NEVER`: `hint` wins. `foo_DIR` set to the hint's config directory: `hint` wins, under `ONLY` too. |
| R3 | `cmake_policy(GET)` for CMP0146, CMP0148 and CMP0167 after `cmake_minimum_required(VERSION 3.25...4.4)` and after a bare `3.25`; then `find_package(PythonInterp)` and `find_package(PythonInterp QUIET)` under the range | Range: all three `NEW`. Bare floor: all three unset (OLD behaviour). Under the range, the plain call warns and exits 0, the `QUIET` call is silent, and both leave `PYTHONINTERP_FOUND` empty. |

## Verdict

1. **A library never chooses its own dependencies' source; the top level does.** *Binds: library shipping a package.* An installable library calls `find_package`. It uses FetchContent only under a top-level guard, for its own tests, or with `FIND_PACKAGE_ARGS` (or a hand-written `find_package` first) so that a found copy wins. The whole seam then stays under the consumer's control (CMK-DEP-07).
2. **A pin is a content hash.** *Binds: application consuming packages; module author.* Branch pins and unhashed `URL`s are MUST findings. A tag is a SHOULD finding, for CPM too: CMake's and CPM's own docs both recommend the hash. The pinning dive's "don't report CPM tags" is overruled (CMK-DEP-01..03).
3. **`<Pkg>_DIR` is the real resolution record.** *Binds: module author; application.* A resolved `find_package` ignores a re-pointed `_ROOT`, `CMAKE_PREFIX_PATH` or manager path until `_DIR` is cleared. `_ROOT` feeds `find_*` only inside `find_package(<Pkg>)` (C4, C5). This is new, measured, and find_ocx gets it wrong in code and in its docs (CMK-DEP-13, -14). A hint is also weaker than its nominal step: see Verdict 9.
4. **Inject policy into a third-party dependency only around the one call that adds it.** *Binds: application consuming packages.* `CMAKE_POLICY_VERSION_MINIMUM` and `CMAKE_POLICY_DEFAULT_CMP<NNNN>` both scope correctly with set/restore (resolution dive §5, C3). The dive's "CMP0077 has no scoped form" is refuted, and both variables' 4.4.2 docs sanction this exact shape (CMK-DEP-15).
5. **The configure must succeed with the network removed, given pre-populated sources.** *Binds: library shipping a package; recipe or port author.* vcpkg already forces `FETCHCONTENT_FULLY_DISCONNECTED=ON` on every port, and rules_foreign_cc blocks the network. A text grep has at least a 7 % false-positive rate, so `unshare -rn` is the check (CMK-DEP-16).
6. **A dependency provider is one user-owned slot, never the ecosystem's seam.** *Binds: module author; application.* It has one real implementation (cmake-conan) and vcpkg has none. The last registration wins silently. A project that sets or appends `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` either hides the user's provider or displaces it (C1, C2). The resolution dive's "legitimate self-registration" is overruled by that measurement and by Kitware's own note (CMK-TC-04).
7. **Each configure has one `CMAKE_TOOLCHAIN_FILE` and one package manager of record.** *Binds: application; Bazel-wrapped dependency.* The variable holds a single path. Composition works only through the claimant's chainload hook, and vcpkg's and Conan's toolchains never meet (CMK-TC-01, -02).
8. **CPS on the consuming side is SHOULD-grade: on 4.3+ a valid `X.cps` wins, and a rejected one falls through silently.** *Binds: application.* With `XConfig.cmake` and a valid `X.cps` in the same prefix, 4.3.4 and 4.4.2 load the `.cps` (verify wave 2, re-measured under `lib/`, `lib64/` and named subdirectories; CMK-INST-14's `run-cps-order.sh` agrees). The earlier "Config won" run used a `VERSION_SCHEMA rpm` file that `find_package` rejected, so the search fell through to Config (CMK-INST-16). Export stays additive and guarded on 4.3 under CMK-INST (verifier verdict, map conflict 5).
9. **Once `CMAKE_FIND_ROOT_PATH` or `CMAKE_SYSROOT` is non-empty, a `<Pkg>_ROOT` hint no longer outranks a rooted copy.** *Binds: module author; application; cross build.* CMake runs the whole search order re-rooted first and only then unrooted. A same-named package reachable through any rooted category therefore beats a `_ROOT` hint or a `CMAKE_PREFIX_PATH` entry, in a cross build and in a native one alike ([cross] §5-§6, R2). vcpkg's toolchain appends its installed tree to `CMAKE_FIND_ROOT_PATH`. Setting `<Pkg>_DIR` is the pin that survives (R2) (CMK-DEP-21).
10. **Cross toolchains are not sandboxed by default.** *Binds: cross build; application.* The unset `CMAKE_FIND_ROOT_PATH_MODE_LIBRARY/INCLUDE/PACKAGE` behave as `BOTH`: `find_package.rst@v4.4.2` says so, and a host-only package is found ([cross] §1). The `ONLY` values everyone copies come from the `cmake-toolchains(7)` worked example, not from the defaults, and the map's M-H-05 framing is corrected. `PROGRAM` is no exception: unset, it also behaves as `BOTH`, and a plain `find_program` returns a same-named sysroot binary before the host's (verify wave 3, 3.31.12, 4.3.4, 4.4.2). A toolchain must set `PROGRAM` to `NEVER` itself, and `ONLY` there breaks CMake's own build-program search. Conan 2.32.0's `CMakeToolchain` rewrites all four to `BOTH` in every cross build, which lets the sysroot's own `/usr` shadow Conan's package ([cross] §3, §6) (CMK-TC-08..10).
11. **The removal policies bite at the policy version, not the floor.** *Binds: application; library shipping a package.* The fleet's `3.25...<max>` range sets CMP0146, CMP0148 and CMP0167 to `NEW` on 3.31.12 and 4.4.2 (R3). An optional or `QUIET` call to a removed Find module is then a silent feature loss. [scope]'s "compare the floor to the policy's version" is right only for a bare floor (CMK-DEP-19).
12. **The two scope rules are satisfied corpus-wide.** CMK-DEP-15 has 0 unscoped writes among the 45 non-Kitware exemplars, and CMK-DEP-07 has 0 forced fetches among the 26 that ship `install(EXPORT)` ([scope] §1-§2). Both stay MUST as preventive controls, because the violating shape is what AI agents and troubleshooting posts emit.

**Documented gaps** (the research established that no mechanism exists, rather than finding an answer):

- `FindPkgConfig.cmake` at 4.4.2 never reads `CMAKE_SYSROOT` and never sets `PKG_CONFIG_SYSROOT_DIR` or `PKG_CONFIG_LIBDIR` (0 references, re-grepped in this revision). Neither vcpkg's `vcpkg.cmake` nor Conan's `conan_toolchain.cmake` sets them either. A cross build that uses pkg-config must supply both itself ([cross] §8) (CMK-DEP-23).
- Conan 2 has no switch that keeps `ONLY` in a cross build. The `FindFiles` block rewrites it, so a Conan cross configure can only be defended by inventory or by a `<Pkg>_DIR` pin (CMK-TC-10).
- The `lib/<tuple>` half of M-G-21 is unmeasured. This host is Fedora-family and never populates `CMAKE_LIBRARY_ARCHITECTURE`. Only the `lib64` half is measured (CMK-DEP-22).

### Conflicts resolved

1. **Provider self-registration.** [resolution] rule 9 calls `set(CMAKE_PROJECT_TOP_LEVEL_INCLUDES …)` before `project()` legitimate. [toolchain] rule 4 and map conflict 6 forbid project-side registration. *Resolved by C1 and C2 plus Kitware's note:* it works mechanically, but it hides or displaces the user's provider, so it is forbidden (CMK-TC-04).
2. **Scoping CMP0077.** [resolution] §6 and rule 11 say no scoped form exists and demand a global `CMAKE_POLICY_DEFAULT_CMP0077`. *Refuted by C3 and the variable's own docs:* set/restore scopes it (CMK-DEP-15).
3. **The provider's blind spot.** [toolchain] §4 says "before the first `find_package`"; [resolution] §3 says categorical. *Both hold:* the method set is closed, and cmake-conan adds a separate sequencing effect (CMK-TC-05).
4. **Tag pins.** [pinning] candidate 6 says CPM tags are not a finding; its own Summary and map M-G-03 say a tag is SHOULD. *Resolved for SHOULD everywhere:* CMake's and CPM's own docs recommend the hash (CMK-DEP-02).
5. **CPM's policies.** Map conflict 8 says "sets four policies NEW on load"; [pinning] rule 7 says the consumer loses OLD. *Measured (C6):* the includer's policies are unchanged, but `CMAKE_POLICY_DEFAULT_*` leaks to every later subproject (CMK-DEP-05).
6. **cmake_template's `FetchContent_Populate`.** [pinning] §3 calls it the deprecated one-argument form. *Re-read:* it is the direct-population form. The real defect is a URL with no `URL_HASH` at `PackageProject.cmake:158-160,179` (CMK-DEP-03, -04).
7. **CPS versus Config.** [cps-s], [cps-e] and [cps-v] row 21 say CPS is "preferred in most cases". [install-cps] §7 measured Config winning on 4.3.4 and 4.4.2. *Corrected in verify wave 2:* that run's `.cps` carried `VERSION_SCHEMA rpm`, which `find_package` rejects, so the search fell through. A valid `.cps` beside `XConfig.cmake` wins on both lines. The docs hold, and a rejected `.cps` falls through with no diagnostic (CMK-DEP-11).
8. **Ranges.** [cps-v] row 22 says only CPS honours ranges. *Measured* ([install-cps] §8): Config honours them through `write_basic_package_version_file`, so the behaviour is per-package (CMK-DEP-12).
9. **Version floors.** [resolution] rule 1 dates `OVERRIDE_FIND_PACKAGE` to 3.25; it is 3.24. Rule 10 says `CMAKE_POLICY_VERSION_MINIMUM` exists from 3.12; it is 4.0 and undefined on 3.31.12. [toolchain] rule 5 dates `DEFER` to 3.24; it is 3.19 (C7).
10. **`_ROOT` and `find_program`.** The [ocx] §9 audit and find_ocx's docs say `<X>_ROOT` feeds a following `find_program`/`find_library`. *Refuted by C5* (CMK-DEP-14).
11. **The aminya provider pattern.** [toolchain] §Exemplar evidence cites `src/Conan.cmake` as a positive exemplar. *Reclassified:* as a reusable module it violates CMK-TC-04 (C2). Only its DEFER workaround stays positive (CMK-TC-05).
12. **Inherited CPS conflicts.** The five dive-versus-dive conflicts (`export(PACKAGE_INFO)` 4.1 not 3.31, MAPPED gate 4.3 not 4.4, `rpm`/`dpkg` written but not compared, P2656 withdrawn, conan#19589 closed) are settled by [cps-v] and not reopened.
13. **Toolchain re-reads per `try_compile` signature.** Verify wave 2 measured 4 reads with one `check_c_source_compiles`. [cross] §10 says the `SOURCES` signature never re-reads. *Measured (R1):* both signatures re-read once per call, and `check_*` macros count. The budget is 2, plus one ABI probe per compiled language (measured for C only), plus one per `try_compile`. The ABI-probe read that [cross] §10 counts is itself a source-file `try_compile`, which is consistent with R1 (CMK-TC-06).
14. **The default find-root modes.** Map M-H-05 says `PROGRAM NEVER; LIBRARY, INCLUDE, PACKAGE ONLY`. *Resolved by `find_package.rst@v4.4.2` and [cross] §1:* those values come from the worked example. The unset default is `BOTH`, and a toolchain must set `ONLY` itself (CMK-TC-08).
15. **`MODE_PROGRAM` values.** [cross] candidate 2 bans `ONLY` and `BOTH` alike as configure-breaking. Only `ONLY` was measured to break the configure, and Conan's generated cross toolchain sets `BOTH` and still configures. *Resolved:* `ONLY` in a project-owned toolchain is a MUST finding, and `BOTH` or an unset mode is a SHOULD finding because its rooted-first pass picks a target-arch binary from the sysroot. Verify wave 3 measured that pick, and measured that the unset mode behaves as `BOTH` (CMK-TC-09).
16. **Emulator severity.** [cross] candidate 3 wants a MUST for the inert `set_tests_properties(… CROSSCOMPILING_EMULATOR …)`. *Kept inside CMK-TC-07 at SHOULD:* the property is dead, but running a target binary without the emulator fails with an exec-format error unless the host has a binfmt handler, so the defect is loud. The measured fact becomes part of TC-07's text.
17. **Removed-module floor heuristic.** [scope] candidate 4 compares a call's `cmake_minimum_required` floor with the policy's introduction version. *Refuted for ranges by R3:* the policy version is the `...<max>` end, capped at the running CMake. Under the fleet's range all three policies are `NEW` on 3.31.12 (CMK-DEP-19).
18. **The `CMAKE_POLICY_VERSION_MINIMUM` value.** [scope] makes "prefer 3.10 over 3.5" a separate SHOULD. CMK-VER-06 already owns the value (3.10 clears both tiers). *Resolved:* CMK-DEP-15 cites CMK-VER-06 for the value and mints nothing. The corpus finding (every write is `3.5` except Qt's `3.10` default) is recorded as evidence under CMK-VER-06.
19. **The protobuf citation.** This file cited `abseil-cpp.cmake:16-43`, and [scope] cites `12-34`. *Re-read at `c64743979d`:* the try-find-then-fetch block is lines 13-37, and the `FATAL_ERROR` guard runs to 41. It is cited as `:13-41` (CMK-DEP-07).
20. **CMK-MOD-12's promise.** [cross] candidate 4 says CMK-MOD-12's "`_ROOT` hand-off" overclaims under a manager's root path. That rule belongs to the module-authoring family, so this file does not edit it. CMK-DEP-21 states the limit, and CMK-MOD-12 must cite it (handoff, below).
21. **Severities of the new cross-build rules.** [cross] grades the `lib64` rule, the pkg-config rule and the find-root default rule MUST. *Resolved:* the pkg-config rule (CMK-DEP-23) and the find-root rule (CMK-TC-08) stay MUST, because both silently put host paths into a target build. The `lib64` rule (CMK-DEP-22) is SHOULD, because it is silent only when a second layout also holds a copy. The Conan inventory (CMK-TC-10) is SHOULD, because no text check proves it.
22. **arrow's CUDA call.** [scope] §3 lists `apache__arrow@3ad410b7b1:cpp/src/arrow/gpu/CMakeLists.txt:34` as live migration debt. *Re-read:* the call sits behind `if(CMAKE_VERSION VERSION_LESS 3.17)`, and the `else()` branch calls `find_package(CUDAToolkit REQUIRED)`. The comment [scope] quotes explains that branch. The shape is fmt's, and it is a pass (CMK-DEP-19).

## The ruleset

Each entry gives the rule, its rationale, a verification with the direction empty output reads, a severity and a version floor. Rules are grouped by the check that catches them. Grep commands run from the repository root. The configure gate is the cmake-build index's (CMK-CORE), which this file does not restate.

### CMK-DEP — consuming dependencies (`cmake-build/dependencies.md`)

#### Check 1: grep the acquisition calls

**CMK-DEP-01 — Never pin a fetched git dependency to a branch or `HEAD`, and resolve every variable-valued ref to its definition before judging it.** Applies to `FetchContent_Declare`, `ExternalProject_Add` and `CPMAddPackage`, whether through `GIT_TAG`, a shorthand `#ref` or `@ref`.
- *Rationale:* "it is advisable to use a hash for `GIT_TAG` rather than a branch or tag name" (`Modules/FetchContent.cmake@v4.4.2:156-159`). OpenSSF Scorecard's Pinned-Dependencies check does not inspect CMake at all ([pinning] §3, §Summary). An opaque `${VAR}` can hide either a real hash (duckdb's 23/23 call sites) or `"master"` (curl) ([pinning] §1).
- *Verify:*
  ```sh
  grep -rnE --include='*.cmake' --include='CMakeLists.txt' -e 'GIT_TAG[[:space:]]+"?main\b' -e 'GIT_TAG[[:space:]]+"?master\b' -e 'GIT_TAG[[:space:]]+"?develop\b' -e 'GIT_TAG[[:space:]]+"?HEAD\b' -e '#main"' -e '#master"' .
  grep -rnE -A1 --include='*.cmake' --include='CMakeLists.txt' -e 'GIT_TAG[[:space:]]*$' .
  ```
  Empty first output = pass on literal pins; any line = finding. The second command catches gersemi-style split lines (`GIT_TAG` then `"main"` on the next line, `cpp-best-practices__cmake_template@b86318abbf:Dependencies.cmake:78-79`). Read the value on the following line. For a `${VAR}` value, run `NAME=EXAMPLE_TAG; grep -rn -e "set($NAME" .` without an `--include` filter: arrow's pins live in `cpp/thirdparty/versions.txt`. For a macro parameter, grep the macro's call sites. "Opaque" is never a final verdict.
- *Severity:* MUST.
- *Floor:* FetchContent 3.11, any CPM, any CMake.

**CMK-DEP-02 — Pin to a full 40-hex commit, with the human-readable tag kept as a trailing comment (FetchContent) or as `gh:owner/repo#<commit>@<version>` (CPM).**
- *Rationale:* both CMake (above) and CPM's README ("always prefer specifying immutable git commit hashes") say so. Measured practice lags: 6 of 8 real CPM refs use tags ([pinning] §4), so a tag is a SHOULD finding rather than a MUST.
- *Verify:*
  ```sh
  grep -rnE --include='*.cmake' --include='CMakeLists.txt' -e 'GIT_TAG[[:space:]]+"?[^"[:space:])$]' . | grep -vE -e 'GIT_TAG[[:space:]]+"?[0-9a-f]{40}\b'
  grep -rnE --include='*.cmake' --include='CMakeLists.txt' -e '"gh:[^"#]*@[^"#]*"' .
  ```
  Empty = pass. Each line is a literal non-hash pin, or a CPM shorthand without `#<commit>`: a SHOULD finding.
- *Severity:* SHOULD.
- *Floor:* as CMK-DEP-01.

**CMK-DEP-03 — Give every URL-form fetch a `URL_HASH`.** This covers `FetchContent_Declare`, the direct-population `FetchContent_Populate(<name> URL …)`, `ExternalProject_Add` and CPM `URL`. A mode whose artifact changes under the pin ("nightly") is an explicit opt-in, not the default.
- *Rationale:* `URL_HASH` "is strongly recommended for URL downloads, as it ensures the integrity of the downloaded content" (`cmake --help-module ExternalProject`, 4.4.2). FetchContent forwards these options. Real violators exist at the 2026-09-26 SHAs: `duckdb__duckdb@d8a1bd4f4f:tools/cpp/cmake/DuckDBCppApi.cmake:121`, and `cpp-best-practices__cmake_template@b86318abbf:cmake/PackageProject.cmake:158-160,179`.
- *Verify:*
  ```sh
  grep -rlE --include='*.cmake' --include='CMakeLists.txt' -e '\bURL[[:space:]]+"?https?:' -e '\bURL[[:space:]]+"?\$\{' . | xargs -r grep -L -e URL_HASH -e URL_MD5
  ```
  Empty = pass at file grain. A listed file = finding. `\b` keeps `GIT_URL` out, which removes duckdb's 23 false positives. A file that mixes hashed and unhashed blocks passes this grep, so read each `URL` block with `-A6` in files that pass.
- *Severity:* MUST.
- *Floor:* 3.11.

**CMK-DEP-04 — Use `FetchContent_MakeAvailable`, never the one-argument `FetchContent_Populate(<name>)`.**
- *Rationale:* CMP0169 (3.30) deprecates the one-argument form. It survives in real code at `ccache__ccache@b471bbde29:cmake/FindZstd.cmake:62` and `microsoft__vcpkg-tool@51bf87ca6e:cmake/FindLibCURL.cmake:57`. Do not confuse it with the multi-argument direct-population form, which is not deprecated. The pinning dive miscounted cmake_template's two calls, which are that form ([pinning] §3, re-read 2026-09-26).
- *Verify:*
  ```sh
  grep -rnE --include='*.cmake' --include='CMakeLists.txt' -e 'FetchContent_Populate[[:space:]]*\([[:space:]]*[A-Za-z0-9_]+[[:space:]]*\)' .
  ```
  Empty = pass. A line = finding.
- *Severity:* SHOULD.
- *Floor:* `MakeAvailable` 3.14, CMP0169 3.30.

**CMK-DEP-05 — A vendored `CPM.cmake` pins `CPM_DOWNLOAD_VERSION` and hash-checks its own bootstrap download. Treat `include(CPM.cmake)` as setting `CMAKE_POLICY_DEFAULT_CMP0077/0126/0135/0150=NEW` for every subproject added after it, CPM-managed or not.**
- *Rationale:* the corpus holds three vendored copies, not two (verify wave 2). The template copies hash-check their bootstrap and are stale: 0.42.1 and 0.42.3 against the current 0.43.2 ([pinning] §4). `cpm-cmake__CPMLicenses.cmake@ca42334d56:cmake/CPM.cmake` pins 0.27.5 and has no `EXPECTED_HASH`, so the grep below lists it. The policy leak was measured (C6). The map's "CPM sets four policies NEW on load" and the pinning dive's "the consumer loses OLD" are both imprecise: the includer's own policies are untouched, but every subproject's defaults change.
- *Verify:*
  ```sh
  grep -rl --include='CPM.cmake' -e 'CPM_DOWNLOAD_VERSION' . | xargs -r grep -L -e 'EXPECTED_HASH'
  ```
  Empty = pass. A listed file = finding. Then a reading heuristic: if the tree also adds a non-CPM subproject with a floor below 3.13 after the CPM include, that subproject now runs with CMP0077 NEW. Say so in review.
- *Severity:* SHOULD.
- *Floor:* current CPM (v0.43.2, source read at `01678cfe17`).

**CMK-DEP-06 — Do not introduce `HunterGate` into a new project. An existing call pins `URL` plus `SHA1` of Hunter v0.26.10 (2026-06-11) or later, which carries the last per-package CMake 4 fix in the release notes (cpp-pm/hunter#858, Protobuf).**
- *Rationale:* Hunter is maintained (v0.26.12, 2026-09-22) but none of the other 45 exemplars adopt it. `HunterGate.cmake` now lives in the `gate` submodule at `920507363b` ([pinning] §5). nlohmann/json's docs example pins v0.23.297. CMake 4 compatibility arrived per package, not as one floor fix: #845 (OpenBLAS) shipped in v0.26.7, #849-#854 in v0.26.9 and #858 (Protobuf) in v0.26.10, according to the GitHub release notes fetched 2026-09-26.
- *Verify:*
  ```sh
  grep -rn --include='*.cmake' --include='CMakeLists.txt' -e 'HunterGate(' .
  ```
  Empty = not applicable. For a hit, read the release in its `URL`; a release older than v0.26.10 = finding.
- *Severity:* CONSIDER. "Do not introduce" rests on adoption counts, not on normative text.
- *Floor:* any.

#### Check 2: read the resolution seam (`--debug-find-pkg=<name>`)

The resolution order `dependencies.md` ships. It is normative from FetchContent and find_package at v4.4.2, and measured where marked ([resolution] §1-§2, C4):

| Step | Mechanism | Evidence |
|---|---|---|
| 1 | `FETCHCONTENT_SOURCE_DIR_<X>` set: that directory is `add_subdirectory`'d. No provider, no `find_package` | measured against `FIND_PACKAGE_ARGS` and an installed prefix, and in verify wave 2 against a registered `FETCHCONTENT_MAKEAVAILABLE_SERIAL` provider, which was never called (3.31.12, 4.3.4, 4.4.2) |
| 2 | A provider with `FETCHCONTENT_MAKEAVAILABLE_SERIAL` is called; if it satisfies the dependency, done | normative (3.24) |
| 3 | `find_package(<X> <FIND_PACKAGE_ARGS>)` runs when `FIND_PACKAGE_ARGS` is given and the mode is `OPT_IN` (the default), or the mode is `ALWAYS`; never with `NEVER` | measured |
| 4 | Already populated in this run: reuse it. The first `FetchContent_Declare` of a name wins | normative |
| 5 | Populate from the declared details | normative |
| after | `OVERRIDE_FIND_PACKAGE`, or a `FIND_PACKAGE_ARGS` declare that fell through to a fetch: a later `find_package(<X>)` goes through `CMAKE_FIND_PACKAGE_REDIRECTS_DIR` to a version-less stub. A declare with neither keyword writes no stub | measured (the `FIND_PACKAGE_ARGS` and neither-keyword cases in verify wave 3, 3.31.12, 4.3.4, 4.4.2) |
| plain `find_package` | provider (`FIND_PACKAGE`), then the redirects dir, then a cached, valid, version-compatible `<X>_DIR` (used as is, under any find-root mode), then the search: `<X>_ROOT`/`<X-upper>_ROOT`, then `CMAKE_PREFIX_PATH` (variable, then environment), then system paths. **The search order holds only while `CMAKE_FIND_ROOT_PATH` and `CMAKE_SYSROOT` are both empty, or the package mode is `NEVER`.** Otherwise CMake runs every category re-rooted first, then (under `BOTH`, the default) every category unrooted, so any rooted hit beats an unrooted `_ROOT` (CMK-DEP-21). On 4.3+ each prefix also probes `cps/` locations. From 4.2, "newest version wins" applies only among the matches of one glob step, never across steps ([cross] Summary) | provider and `_DIR`/`_ROOT`/prefix order measured; the redirects dir beating a cached `_DIR` measured in verify wave 2 (3.31.12, 4.3.4, 4.4.2); the rooted-first pass and `_DIR` surviving it measured in [cross] §5 and R2 (3.31.12, 4.4.2) |

`OVERRIDE_FIND_PACKAGE` together with `FIND_PACKAGE_ARGS` is a hard `FATAL_ERROR` on both lines ([resolution] §1). It reports itself, so it is not a rule.

**CMK-DEP-07 — An installable library resolves its dependencies with `find_package` and never forces acquisition.** Outside test code, `FetchContent_MakeAvailable` or `CPMAddPackage` runs only under a top-level guard (`PROJECT_IS_TOP_LEVEL`, shimmed below 3.21), on a declare that carries `FIND_PACKAGE_ARGS`, or as the fallback of a `find_package` that ran first.
- *Binds:* library shipping a package.
- *Rationale:* the Using Dependencies guide at v4.4.2 separates `FIND_PACKAGE_ARGS` ("project control") from providers ("user override"), and map conflict 7 decided this rule. A library that always fetches takes steps 2-3 of the table away from every consumer.
  A hand-written try-find-then-fetch also satisfies the rule: `find_package` first, then the fetch only on a miss, behind a switch the consumer can flip (`protocolbuffers__protobuf@c64743979d:cmake/abseil-cpp.cmake:13-41`, `cmake/gtest.cmake:1-19`). Do not flag it for lacking the 3.24 keyword ([scope] §2).
- *Verify:* from a consumer, install the dependency and configure the library as a subproject with `-DCMAKE_PREFIX_PATH=$DEP_PREFIX -DFETCHCONTENT_FULLY_DISCONNECTED=ON -DCMAKE_POLICY_DEFAULT_CMP0170=NEW` and an empty `_deps`. Exit 0 = pass (it found the installed copy). A non-zero exit from a forced fetch = finding. Always pass the CMP0170 default: without it, a tree whose range stops below 3.30 configures a forced fetch against an empty source directory and exits 0 (verify wave 2, 3.31.12, 4.3.4 and 4.4.2). To locate candidates, run `grep -rn --include='*.cmake' --include='CMakeLists.txt' -e 'FetchContent_MakeAvailable' -e 'CPMAddPackage' .` and read each hit's enclosing directory and guard. Empty = not applicable. A hit under a test, example, benchmark, docs, tool or language-binding directory, or behind `PROJECT_IS_TOP_LEVEL`, `NOT <dep>_FOUND` or `NOT TARGET`, is not a finding.
- *Evidence:* 0 violators among the 26 exemplars that ship `install(EXPORT)`, measured at the 2026-09-26 SHAs with gersemi-split `install(` lines counted. Every hit in those repos sits in a test, example, docs, tool or binding path, or behind a guard ([scope] §2). The rule stays MUST as a preventive control: inline, unguarded `FetchContent_MakeAvailable` is the shape an agent emits from training data.
- *Severity:* MUST.
- *Floor:* 3.24 for `FIND_PACKAGE_ARGS`. The hand-written try-find-then-fetch works on any version.

**CMK-DEP-08 — When a dependency can arrive either fetched or found, link only the namespaced name the installed package exports (`dep::dep`). A project that may itself be fetched defines matching `ALIAS` targets.**
- *Rationale:* measured on 3.31.12 and 4.4.2. When `find_package` satisfies a `FIND_PACKAGE_ARGS` declare, only `dep::dep` exists and `TARGET dep` is false. A consumer linking the bare `dep` breaks the moment an installed copy appears ([resolution] §1, rule 3).
- *Verify:* for each name declared with `FIND_PACKAGE_ARGS`, `NAME=dep; grep -rnE --include='*.cmake' --include='CMakeLists.txt' -e "target_link_libraries.*[[:space:]]$NAME[[:space:])]" -e "target_link_libraries.*[[:space:]]$NAME\$" .` Empty = pass. A hit = finding. That grep reads one line at a time and misses a call split across lines, which gersemi emits. Also run the file-grain form `NAME=dep; grep -rlzE --include='*.cmake' --include='CMakeLists.txt' -e "target_link_libraries\([^)]*[[:space:]]$NAME[[:space:])]" .`. Empty = pass. A listed file = finding (verify wave 3: the line form missed a planted three-line call, and the `-z` form caught it without flagging `dep::dep`).
- *Severity:* MUST.
- *Floor:* 3.24.

**CMK-DEP-09 — Never rely on a `find_package` version check against a fetched dependency. That covers a name declared with `OVERRIDE_FIND_PACKAGE`, and a name declared with `FIND_PACKAGE_ARGS` whose installed copy was missing. `FIND_PACKAGE_ARGS <version>` gates only the installed copy. Check the fetched version explicitly, and never put both keywords on one declare.**
- *Rationale:* measured on both lines. The synthesised `<name>-config-version.cmake` sets `PACKAGE_VERSION_COMPATIBLE TRUE` and `PACKAGE_VERSION_EXACT TRUE` with no version, so `find_package(dep 2.0 EXACT)` succeeds with a blank `dep_VERSION` ([resolution] §1). Verify wave 3 (3.31.12, 4.3.4 and 4.4.2) measured the same stub after a `FIND_PACKAGE_ARGS 2.0` declare fell through to fetching a 1.0 source: a later `find_package(dep 3.0 EXACT REQUIRED)` exits 0 with a blank `dep_VERSION`. A declare with neither keyword writes no stub, and that call fails. `OVERRIDE_FIND_PACKAGE` together with `FIND_PACKAGE_ARGS` is a `FATAL_ERROR` ("Cannot specify both"), so the old advice to add `FIND_PACKAGE_ARGS <version>` to an overriding declare cannot be followed. `FetchContent_MakeAvailable`'s 4.4.2 docs say the stub makes later calls succeed "regardless of any version requirements", unless the dependency writes its own version file into the redirects directory.
- *Verify:* `grep -rn -A12 --include='*.cmake' --include='CMakeLists.txt' -e 'OVERRIDE_FIND_PACKAGE' -e 'FIND_PACKAGE_ARGS' .` Empty = not applicable. For each declared name, a later `find_package(<name> <version>…)` in the tree with no explicit check of the fetched version = finding. On a built tree, `grep -rl -e 'Version not available' build/CMakeFiles/pkgRedirects` lists the stubs; empty = no version-less stub was written.
- *Severity:* MUST.
- *Floor:* 3.24.

**CMK-DEP-10 — Declare every dependency shared by several subprojects in the top-level project, before any `add_subdirectory` or `FetchContent_MakeAvailable` that might declare it again.**
- *Rationale:* "the first such call will control how that dependency will be made available" (`FetchContent_MakeAvailable`, 4.4.2 docs). CPM also resolves a diamond as "first version wins" (map conflict 7). A newer pin added in a subdirectory is silently ignored.
- *Verify:* reading heuristic. `grep -rnE --include='*.cmake' --include='CMakeLists.txt' -e 'FetchContent_Declare\(' -e 'CPMAddPackage\(' .` Group the hits by name. A name declared in more than one file, whose top-level declaration is missing or comes later in include order, = finding. A single declaration per name = pass.
- *Severity:* SHOULD.
- *Floor:* 3.14.

**CMK-DEP-11 — On CMake ≥4.3, expect `find_package(X)` to load a valid `X.cps` over an `XConfig.cmake` in the same prefix, and expect a rejected `.cps` to fall through silently to `XConfig.cmake`. State the intent: `CONFIGS` for script-only, `X_DIR` pointed at the `cps/` directory for CPS. Never set the retired `CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES`, and never set `CPS_PATH`/`CPS_PREFIX_PATH` expecting CMake to read them.**
- *Rationale:* the docs say CPS is preferred "in most cases" and that `CONFIGS` suppresses CPS ([cps-v] row 21). Measured in verify wave 2: with both files present, the `.cps` won on 4.3.4 and 4.4.2 under `lib/cps/`, `lib/cps/X/` and `lib64/cps/X/`. CMK-INST-14's `run-cps-order.sh` agrees. The "Config won" result in [install-cps] §7 came from a `VERSION_SCHEMA rpm` file that `find_package` rejected (CMK-INST-16). With `CPS_PATH` set and no prefix, both lines report "Could not find" (verify wave 2). CMake never reads the spec's `CPS_PATH`/`CPS_PREFIX_PATH` ([cps-v] row 20). The import gate retired at 4.3.0 is silently ignored ([cps-v] row 9). Every CONFIG search on 4.4.2 probes `cps/` paths: that is noise in `--debug-find-pkg`, not misconfiguration ([resolution] §Summary).
- *Verify:*
  ```sh
  grep -rn --include='*.cmake' --include='CMakeLists.txt' --include='CMakePresets.json' --include='*.yml' -e 'CPS_PATH' -e 'CPS_PREFIX_PATH' -e 'CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES' .
  ```
  Empty = pass. The gate is legitimate only on a 4.0-4.2 leg, using the UUID that tag documents. Confirm which file won with `--debug-find-pkg=X`.
- *Severity:* SHOULD.
- *Floor:* 4.3 (import ungated).

**CMK-DEP-12 — Give `find_package` a minimum version for any dependency with a known breaking major. Rely on a range's upper bound only when the package's version file handles ranges: CPS always does, `write_basic_package_version_file()` does, a hand-written `*ConfigVersion.cmake` may not.**
- *Rationale:* 108 of 6,112 calls carry a version and one carries a range ([pinning] §6). A version request also makes CMake discard a cached `_DIR` whose package is incompatible ("…or if the requested version is not compatible…", `find_package`, 4.4.2), which partly defends against CMK-DEP-13. The docs' "only CPS honours ranges" is per-package: both endpoints were honoured on Config through the generated version file ([install-cps] §8).
- *Verify:* reading heuristic, `grep -rnE --include='*.cmake' --include='CMakeLists.txt' -e 'find_package\([A-Za-z0-9_]+[[:space:]]+CONFIG' -e 'find_package\([A-Za-z0-9_]+[[:space:]]+REQUIRED' -e 'find_package\([A-Za-z0-9_]+[[:space:]]+COMPONENTS' -e 'find_package\([A-Za-z0-9_]+[[:space:]]+QUIET' .`. Each hit names a package with no version; a package with a documented breaking major among them = finding. Empty = every call carries something other than a bare mode keyword.
- *Severity:* SHOULD.
- *Floor:* any; ranges 3.19.

#### Check 3: reconfigure twice and diff `CMakeCache.txt`

**CMK-DEP-13 — Treat `<Pkg>_DIR` as the sticky record of which copy was found.** To switch copies use a fresh build tree, `--fresh` or `-U <Pkg>_DIR`. A module that re-points `<Pkg>_ROOT` on reconfigure must `unset(<Pkg>_DIR CACHE)` whenever the hint's value changes.
- *Binds:* module author; application.
- *Rationale:* measured on 3.31.12 and 4.4.2. A `-D<pkg>_ROOT` survives a reconfigure that omits it ([resolution] §2). Re-pointing `<pkg>_ROOT`, even `CACHE PATH … FORCE`, leaves `dep_DIR` and the copy it found in place while `dep_ROOT` prints the new value. The guarded `unset` fixes it (C4). The docs agree: a `_DIR` holding a valid, compatible config is used as is. The fix works only while the hint can win the search at all. Under a non-empty `CMAKE_FIND_ROOT_PATH` or `CMAKE_SYSROOT`, a cleared `_DIR` is re-resolved to whichever rooted copy comes first, and CMK-DEP-21 applies.
- *Verify:* configure with the hint at prefix A, reconfigure the same tree with it at prefix B, then `NAME=dep; grep -rn --include='CMakeCache.txt' -e "^${NAME}_DIR" build`. Still under A = finding. For modules, run `grep -rlzE --include='*.cmake' -e '_ROOT[^)]*CACHE' . | xargs -r grep -L -e '_DIR CACHE'`. Empty = pass. The `-z` flag reads each file as one record, so `[^)]*` spans lines. Without it, the grep misses a call that puts `CACHE` on the line after `_ROOT` (verify wave 3, planted). A listed file writes a `_ROOT` cache entry and never unsets a `_DIR` cache entry. Read it with `grep -nE -A2 -e '_ROOT[^)]*CACHE' FILE`: a `FORCE` in the call, often on the next line, = finding. The earlier one-line `'_ROOT[^)]*CACHE[^)]*FORCE'` grep returned nothing on find_ocx's own two-line violator (`ocx.cmake:1200-1201`), which is why it was replaced (verify wave 2).
- *Severity:* MUST.
- *Floor:* any; the upper-case `<PKG>_ROOT` form is 3.27 (CMP0144).

**CMK-DEP-14 — Hand a provisioned tool or library to `find_program`/`find_library` through `HINTS`, `CMAKE_PROGRAM_PATH`/`CMAKE_LIBRARY_PATH` or an imported target. `<Pkg>_ROOT` is read only by `find_package(<Pkg>)` and by the `find_*` calls in any script that call loads, whether a Find module or a Config file.**
- *Binds:* module author.
- *Rationale:* measured (C5). A top-level `find_program` with `dep_ROOT` pointing at a prefix that holds `bin/depprog` returns `NOTFOUND` on 3.31.12 and 4.4.2. A `find_program` inside `dep2Config.cmake`, loaded by `find_package(dep2 CONFIG)`, does find `<dep2_ROOT>/bin/dep2prog` (verify wave 2, 3.31.12, 4.3.4 and 4.4.2). This matches `find_program`'s docs: "within a find module or any other script loaded by a call to `find_package(<PackageName>)`". find_ocx's docs and its audit both claim that a following top-level call searches the root (below).
- *Verify:* reading heuristic. Any doc or comment saying `<X>_ROOT` makes a following bare `find_program` or `find_library` search a prefix = finding. For the behaviour, `grep -rn --include='*.cmake' --include='CMakeLists.txt' -e 'find_program(' -e 'find_library(' .`, then read each hit that relies on a `_ROOT` set nearby. Empty = pass.
- *Severity:* MUST.
- *Floor:* CMP0074 3.12.

#### Check 4: policy injection into a dependency

**CMK-DEP-15 — Set a third-party dependency's policy knobs with set/restore around the one `add_subdirectory`, `FetchContent_MakeAvailable` or `find_package` that loads it.** The knobs are `CMAKE_POLICY_VERSION_MINIMUM` (4.0+) for a floor below 3.5, and `CMAKE_POLICY_DEFAULT_CMP<NNNN>`, for example CMP0077 for a floor below 3.13 whose `option()` would discard the parent's variable. Never use a project-wide `set()`, a committed preset `cacheVariables` entry, or a CI environment variable.
- *Binds:* application consuming packages.
  Four shapes count as scoped: an explicit save, set and restore; a `set()` inside a `function()` (or inside a `macro()` called only from functions), which the function's return discards; one `ExternalProject_Add`'s `CMAKE_ARGS`, a separate process; and a port tool's per-port arguments, which CMK-VER-06 sanctions. The value is CMK-VER-06's: 3.10 clears both tiers, and 3.5 clears only the hard error.
- *Rationale:* measured. Set/restore scopes both knobs: after the restore, a second old dependency still errors or warns ([resolution] §5a, C3). The global `-D` and environment forms mask every dependency added later, and the environment form persists in `CMakeCache.txt` after it is unset ([resolution] §5b-c). Both variables' 4.4.2 docs: "Projects may set this variable before a call to `add_subdirectory()` that adds a third-party project". A user may pass either knob on the command line for a one-off try. The resolution dive's "no scoped variant exists for CMP0077" is refuted by C3. This rule owns the injection scope. CMK-VER keeps the fact that 4.0 removed compatibility below 3.5 (map M-B-04/05).
- *Verify:*
  ```sh
  grep -rn --include='*.cmake' --include='CMakeLists.txt' --include='CMakePresets.json' --include='*.yml' -e 'CMAKE_POLICY_VERSION_MINIMUM' -e 'CMAKE_POLICY_DEFAULT_CMP' .
  ```
  Empty = pass. Every hit must be one of the four scoped shapes above, around one `add_subdirectory`, `FetchContent_MakeAvailable`, `ExternalProject_Add` or `find_package` call. A preset hit, a workflow hit, or a file-scope hit with no enclosing function and no restore = finding. A literal `3.5` is reported under CMK-VER-06, not here. `find_package` belongs on that list because a found package's config runs its own `cmake_minimum_required`, and the arrow exemplar below wraps exactly such a call (verify wave 2). On a built tree, a non-empty `grep -rn --include='CMakeCache.txt' -e CMAKE_POLICY_VERSION_MINIMUM build` on a tree whose documented commands never pass it = leaked environment. Exemplars: `apache__arrow@3ad410b7b1:cpp/cmake_modules/FindRapidJSONAlt.cmake:29-32` (save and restore); `apache__arrow@3ad410b7b1:cpp/cmake_modules/ThirdpartyToolchain.cmake:1025-1038`, `macro(prepare_fetchcontent)` called from four `build_*()` functions (lines 1078, 1813, 1926, 2088). Its defensive `unset()` at line 2657 is redundant, as its own comment says.
- *Evidence:* every write in the corpus is scoped: arrow (three shapes), vcpkg's `scripts/ports.cmake:5-7` and two portfiles, seven Hunter recipes, Qt's toolchain-generation helper, and nlohmann/json's old-CMake CI. That leaves 0 violators, excluding Kitware/CMake and grpc's generated list ([scope] §1).
- *Severity:* MUST.
- *Floor:* the escape hatch needs 4.0; `CMAKE_POLICY_DEFAULT_CMP0077` works from 3.13.

#### Check 5: configure with the network removed

**CMK-DEP-16 — Make every configure-time network touch satisfiable offline.** That covers FetchContent, CPM, HunterGate, `file(DOWNLOAD)` in configure scope, and a provider that runs a manager. A configure with `FETCHCONTENT_FULLY_DISCONNECTED=ON`, `FETCHCONTENT_SOURCE_DIR_<X>` per dependency and `CPM_SOURCE_CACHE` must succeed with no network.
- *Binds:* library shipping a package; recipe or port author; Bazel-wrapped dependency (the zero-network form is CMK-BZL's).
- *Rationale:* vcpkg prepends `-DFETCHCONTENT_FULLY_DISCONNECTED=ON` to every port configure (`microsoft__vcpkg@c4ee5a52d7:ports/vcpkg-cmake/vcpkg_cmake_configure.cmake:218`, [pinning] §7). CMP0170 (3.30) turns an unpopulated disconnected dependency into a hard error; arrow sets it NEW for exactly that reason (`apache__arrow@3ad410b7b1:cpp/CMakeLists.txt:94-96`). A text grep over-reports: `glfw__glfw@92dcf4ce74:CMake/GenerateMappings.cmake` downloads at build time through `cmake -P` ([pinning] §10). A Find module that fetches on a miss is CMK-MOD's (map M-D-04).
- *Verify:*
  ```sh
  grep -rnE --include='*.cmake' --include='CMakeLists.txt' -e 'FetchContent_MakeAvailable' -e 'CPMAddPackage' -e 'HunterGate' -e 'file\(DOWNLOAD' -e 'SET_DEPENDENCY_PROVIDER' .
  ```
  This enumerates the touches; empty = no network surface. Then run `unshare -rn cmake -S . -B build-offline -DFETCHCONTENT_FULLY_DISCONNECTED=ON -DCMAKE_POLICY_DEFAULT_CMP0170=NEW -DFETCHCONTENT_SOURCE_DIR_ZLIB=$PWD/vendor/zlib` on a pre-populated tree. Exit 0 = pass. Keep the CMP0170 default. Without it, a floor-3.25 tree that misses one `FETCHCONTENT_SOURCE_DIR_<X>` still exits 0 under `unshare -rn`, and the check stays green on the violation it exists to catch (verify wave 2, 4.4.2).
- *Severity:* MUST.
- *Floor:* 3.11; strict failure needs CMP0170 (3.30), which a `3.25...3.30` or wider range turns on.

#### Check 6: diagnosis and CI determinism

**CMK-DEP-17 — Answer "which copy was used" from the configure, not from the call site.** Read `--debug-find-pkg=<name>` first (both lines), then the `<name>_DIR` cache entry, `CMakeFiles/pkgRedirects/`, and on 4.1+ the `find_package-v1` events in `CMakeFiles/CMakeConfigureLog.yaml`.
- *Rationale:* the identical configure logged zero `find`-kind events on 3.31.12 and a full `find_package-v1` candidate list on 4.4.2 ([resolution] §Summary, rule 14). This order is the first step of the `cmake-dependency-triage` skill.
- *Verify:* on a fresh tree (`--fresh`), `grep -rc --include='CMakeConfigureLog.yaml' -e 'kind: "find_package-v1"' build`. 0 on <4.1 is expected. 0 on ≥4.1 after a `find_package` ran = finding. Match `find_package-v1` exactly. The broader `'kind: "find'` also counts the `find-v1` events CMake logs for its own `uname` and `make` probes, 2 per `LANGUAGES NONE` configure on 4.3.4 and 4.4.2, so it never reads 0. A reconfigure that reuses a cached `<name>_DIR` logs no new `find_package` event (verify wave 2).
- *Severity:* SHOULD.
- *Floor:* configure-log events 4.1.

**CMK-DEP-18 — Make optional dependencies deterministic in CI: every non-`REQUIRED` `find_package` gets `CMAKE_DISABLE_FIND_PACKAGE_<Pkg>` or `CMAKE_REQUIRE_FIND_PACKAGE_<Pkg>` in the CI preset.**
- *Rationale:* otherwise the runner image decides the feature set (map M-G-10, [canon] §2). No wave-2 measurement stands behind this rule.
- *Verify:* `grep -rn --include='CMakePresets.json' --include='*.yml' -e 'CMAKE_DISABLE_FIND_PACKAGE_' -e 'CMAKE_REQUIRE_FIND_PACKAGE_' .` Empty while the tree has a non-`REQUIRED` `find_package` = finding.
- *Severity:* CONSIDER.
- *Floor:* `CMAKE_REQUIRE_FIND_PACKAGE_<Pkg>` 3.22.

#### Check 7: removed Find modules and the stated mode

**CMK-DEP-19 — Never call a policy-removed Find module where its removal policy is `NEW`. Migrate `find_package(CUDA)` to `enable_language(CUDA)` plus `find_package(CUDAToolkit)`, and `PythonInterp`/`PythonLibs` to `find_package(Python3)`. Treat `GCCXML` (use CastXML) and `CABLE` (no replacement) the same way. Read the policy version from the `...<max>` end of the governing `cmake_minimum_required`, capped at the running CMake, not from the floor.**
- *Binds:* application; library shipping a package.
- *Rationale:* CMP0146 (`FindCUDA`) and CMP0148 (`FindPythonInterp`, `FindPythonLibs`) arrived in 3.27, CMP0167 (`FindBoost`) in 3.30, and CMP0188 (`FindGCCXML`) and CMP0191 (`FindCABLE`) in 4.1. `--help-module` shows identical `versionchanged` lines on 3.31.12 and 4.4.2 ([scope] §3). Under the fleet's `3.25...<max>` range all three 3.x policies are `NEW` on 3.31.12 and 4.4.2. A plain call then warns and exits 0, and a `QUIET` call is silent: the feature vanishes, and only `REQUIRED` fails loudly (R3). With a bare floor below the policy the module still loads, which is debt that CMK-VER-07 tells the author to migrate. The replacements have floors of their own: `FindPython3` 3.12, `FindCUDAToolkit` 3.17. Corpus: 2 CUDA calls, both dead behind a `CMAKE_VERSION VERSION_LESS` guard with the replacement live; 5 `PythonInterp` and 3 `PythonLibs` calls, all in manager glue; 0 `GCCXML`/`CABLE` ([scope] §3, re-read in this revision). CMK-VER-07 owns "adopt NEW, never OLD", and this rule owns the consuming side (M-G-16).
- *Boost:* under `NEW`, a bare `find_package(Boost)` falls through to the `BoostConfig.cmake` that Boost ships from 1.70 onward. It is a finding only when the supported Boost range reaches below 1.70, or when the code reads `FindBoost`-only results. Otherwise write `CONFIG` for the diagnostic (CMK-DEP-20). 24 bare Boost calls in the corpus, all in vcpkg ports, conan-center recipes or cmake-conan fixtures ([scope] §3).
- *Verify:*
  ```sh
  grep -rnE --include='*.cmake' --include='CMakeLists.txt' -e 'find_package\([[:space:]]*CUDA[[:space:])]' -e 'find_package\([[:space:]]*PythonInterp' -e 'find_package\([[:space:]]*PythonLibs' -e 'find_package\([[:space:]]*GCCXML' -e 'find_package\([[:space:]]*CABLE' .
  ```
  Empty = pass. For each hit, read the governing `cmake_minimum_required`. A `...<max>` of 3.27 or later (4.1 or later for GCCXML/CABLE) = finding. So is a bare floor at or past those versions. A legacy call behind `if(CMAKE_VERSION VERSION_LESS …)` with a modern branch beside it passes (`fmtlib__fmt@522e2c12ab:test/CMakeLists.txt:228-236`, `apache__arrow@3ad410b7b1:cpp/src/arrow/gpu/CMakeLists.txt:33-44`).
- *Severity:* MUST.
- *Floor:* removal policies 3.27, 3.30 and 4.1; replacements 3.12 (`FindPython3`) and 3.17 (`FindCUDAToolkit`).

**CMK-DEP-20 — State `CONFIG` or `MODULE` on a `find_package` whose package ships only one of the two.**
- *Rationale:* an explicit mode makes the not-found message name the file that was expected, instead of listing both modes' candidates, and it keeps a stray `Find<X>.cmake` on `CMAKE_MODULE_PATH` from answering a Config-only package. 58.5 % of 7,123 corpus calls state neither, and the share is stable across wave 1 (2026-09-05 SHAs) and wave 3 (2026-09-26 SHAs), measured with a paren-balanced extractor ([scope] §4, `scratch/scope-classification/`). This is diagnostics quality, not correctness, hence SHOULD (M-G-08).
- *Verify:* reading heuristic, `grep -rn --include='*.cmake' --include='CMakeLists.txt' -e 'find_package(' . | grep -v -e 'CONFIG' -e 'MODULE'`. Each line is a call with no mode on its first line; read multi-line calls in full. Empty = pass.
- *Severity:* SHOULD.
- *Floor:* any.

#### Check 8: cross builds and root paths (`--debug-find-pkg=<name>`)

**CMK-DEP-21 — When `CMAKE_FIND_ROOT_PATH` or `CMAKE_SYSROOT` is non-empty, never rely on `<Pkg>_ROOT` or `CMAKE_PREFIX_PATH` to choose between copies of a package. Pin the copy with `<Pkg>_DIR`, or put the hint inside a root, and confirm the result with `--debug-find-pkg`.**
- *Binds:* module author; application; cross build.
- *Rationale:* measured on 3.31.12 and 4.4.2 ([cross] §5-§6, R2). Unless the package mode is `NEVER`, CMake searches every category re-rooted before any unrooted candidate. A manager's `CMAKE_FIND_ROOT_PATH` entry, or the sysroot's own `/usr`, therefore wins over a `CACHE … FORCE` `_ROOT` hint, even in a native build (`CMAKE_CROSSCOMPILING=FALSE`). vcpkg appends its installed triplet to both `CMAKE_PREFIX_PATH` and `CMAKE_FIND_ROOT_PATH` (`microsoft__vcpkg@c4ee5a52d7:scripts/buildsystems/vcpkg.cmake:452,454`). `NEVER` restores the hint but un-sandboxes every other `find_package` in the configure. A `<Pkg>_DIR` pointing at the wanted config directory wins under every mode (R2). This limits the promise of find_ocx's `_ROOT` hand-off and of CMK-MOD-12, which must cite this rule.
- *Verify:*
  ```sh
  grep -rn --include='*.cmake' --include='CMakeLists.txt' --include='CMakePresets.json' -e 'CMAKE_FIND_ROOT_PATH' -e 'CMAKE_SYSROOT' -e 'vcpkg.cmake' .
  ```
  Empty = not applicable. With a hit, list the packages the code selects through a `_ROOT` or a prefix hint and run `cmake --fresh … --debug-find-pkg=NAME` for each. A winning path outside the hinted prefix = finding. A `<Pkg>_DIR` pin = pass.
- *Severity:* MUST.
- *Floor:* any; `<Pkg>_ROOT` needs CMP0074 (3.12).

**CMK-DEP-22 — Enable a compiled language before any `find_package(… CONFIG)` whose package may install under `lib64/` or `lib32/`. `project(… LANGUAGES NONE)` does not search those layouts.**
- *Binds:* module author; application.
- *Rationale:* measured on 3.31.12 and 4.4.2 ([cross] §7). `LANGUAGES NONE` leaves `CMAKE_SIZEOF_VOID_P` empty, and `find_package.rst@v4.4.2` adds `lib64` only when that variable is 8 and the global property `FIND_LIBRARY_USE_LIB64_PATHS` is TRUE. The property was TRUE in both runs, but the same prefix resolved to `share/` under `NONE` and to `lib64/` under `C`, whether the hint came through `CMAKE_PREFIX_PATH` or `<Pkg>_ROOT`. The variable `CMAKE_FIND_LIBRARY_USE_LIB64_PATHS` does not exist, so do not write it. A `<Pkg>_DIR` pin also works. The `lib/<tuple>` layout is unmeasured (Verdict gaps) (M-G-21).
- *Verify:* reading heuristic, `grep -rlE --include='CMakeLists.txt' -e 'LANGUAGES[[:space:]]+NONE' . | xargs -r grep -l -e 'find_package('`. Empty = pass. For each listed file, a Config-mode `find_package` before any `enable_language` = finding. A Find-module call, such as find_ocx's `find_package(ocx)`, is not affected.
- *Severity:* SHOULD. The miss is silent only when another layout also holds a copy; otherwise a `REQUIRED` call fails loudly.
- *Floor:* any.

**CMK-DEP-23 — A cross build that consumes pkg-config sets `PKG_CONFIG_SYSROOT_DIR` and `PKG_CONFIG_LIBDIR` itself, in the toolchain (`set(ENV{…})`) or the documented environment. Neither `CMAKE_SYSROOT` nor any manager's toolchain does it.**
- *Binds:* cross build; application.
- *Rationale:* `FindPkgConfig.cmake` at 4.4.2 contains no reference to `PKG_CONFIG_SYSROOT_DIR`, `PKG_CONFIG_LIBDIR` or `CMAKE_SYSROOT` (read in full in [cross] §8, re-grepped in this revision). In a cross build it also skips its own `lib64`/multiarch path guesses. Measured with pkgconf 2.3.0: a sysroot `.pc` found through `PKG_CONFIG_PATH` or `PKG_CONFIG_LIBDIR` reports `_FOUND=TRUE` with the host's `/usr/include`. Only `PKG_CONFIG_SYSROOT_DIR` yields `<sysroot>/usr/include`. `vcpkg.cmake` has 0 `PKG_CONFIG` references, and Conan 2.32.0's cross `conan_toolchain.cmake` sets only `ENV{PKG_CONFIG_PATH}` ([cross] §8). This is a documented gap, not a CMake option (M-G-19).
- *Verify:* `grep -rln --include='*.cmake' --include='CMakeLists.txt' -e 'pkg_check_modules' -e 'pkg_search_module' -e 'cmake_pkg_config' .` Empty = not applicable. With a hit in a tree that has a cross toolchain, run `grep -rn --include='*.cmake' --include='CMakePresets.json' --include='*.yml' -e 'PKG_CONFIG_SYSROOT_DIR' .` and, separately, the same command with `PKG_CONFIG_LIBDIR`. Either one empty = finding. Both non-empty = pass.
- *Severity:* MUST.
- *Floor:* any; checked against `FindPkgConfig.cmake` at 4.4.2.

### CMK-TC — toolchains, top-level includes, providers (`cmake-build/toolchains-and-providers.md`)

#### Check A: count toolchain sources per configure leg

**CMK-TC-01 — Set `CMAKE_TOOLCHAIN_FILE` once per configure leg, from one source of record: a preset's `toolchainFile`/`cacheVariables`, `-D`/`--toolchain`, or the environment variable. Compose several toolchains only through the wrapping claimant's hook: `VCPKG_CHAINLOAD_TOOLCHAIN_FILE`, or Conan's `tools.cmake.cmaketoolchain:user_toolchain`.**
- *Rationale:* the variable is one path ("Path to toolchain file", `CMAKE_TOOLCHAIN_FILE.rst@v4.4.2`). A later assignment replaces an earlier one without a diagnostic. The environment form applies only "when a new build tree is first created" (3.21), which catches CI caches that reuse build trees ([toolchain] §1). The composition table in [toolchain] is the depth-file table.
- *Verify:*
  ```sh
  grep -rn --include='CMakePresets.json' --include='CMakeUserPresets.json' --include='*.yml' --include='*.yaml' --include='CMakeLists.txt' -e 'CMAKE_TOOLCHAIN_FILE' -e 'toolchainFile' -e '--toolchain' .
  ```
  Read per leg. More than one distinct value reaching one leg, or a `;` in the value, = finding. Zero or one per leg = pass.
- *Severity:* MUST.
- *Floor:* any; presets `toolchainFile` needs schema 3 (3.21).

**CMK-TC-02 — Never let vcpkg's `vcpkg.cmake` and Conan's `conan_toolchain.cmake` reach the same configure, directly or chained one into the other's hook.**
- *Rationale:* the variable is a single slot (above). Neither project documents chaining the other's generated file. conan-io/conan#12341 (opened 2022-10-19, still open) asks Conan to copy vcpkg's generic chainload toolchain, not to combine the two managers. No maintainer comment on it endorses combining them. No corpus repo does it ([toolchain] §9, §Exemplar evidence). Choosing the manager of record and the escape hatches (overlay port, recipe, FetchContent fallback) belong to CMK-PKG (map M-L-02), which cites this rule.
- *Verify:*
  ```sh
  grep -rn --include='CMakePresets.json' --include='CMakeUserPresets.json' --include='*.yml' --include='*.yaml' --include='*.cmake' -e 'vcpkg.cmake' -e 'conan_toolchain.cmake' .
  ```
  The two patterns are a union, so read which leg each hit feeds. Both reaching one leg = finding. At most one per leg = pass.
- *Severity:* MUST.
- *Floor:* any; Conan 2.x, vcpkg any.

#### Check B: ordering against the first `project()`

**CMK-TC-03 — Set everything the first `project()` reads before it runs, preferably in the configure preset's `cacheVariables`.** That means `CMAKE_TOOLCHAIN_FILE`, `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` and every `VCPKG_*` input (triplet, manifest mode and features, overlays, chainload).
- *Rationale:* measured on 3.31.12. `set(CMAKE_TOOLCHAIN_FILE … CACHE … FORCE)` after `project()` changes the printed value while the file is never read, with no diagnostic ([resolution] §4). vcpkg: "all vcpkg-affecting variables must be defined before the first `project()` directive" ([toolchain] §10). Positive exemplar: `microsoft__vcpkg-tool@51bf87ca6e:CMakePresets.json:40-46`.
- *Verify:*
  ```sh
  grep -rn --include='CMakeLists.txt' -e 'project(' -e 'set(CMAKE_TOOLCHAIN_FILE' -e 'set(CMAKE_PROJECT_TOP_LEVEL_INCLUDES' -e 'set(VCPKG_' .
  ```
  Read `./CMakeLists.txt`'s lines. Any `set` line numbered after the first `project(` line = finding. None = pass.
- *Severity:* MUST.
- *Floor:* any; presets schema 3 (3.21).

#### Check C: the provider slot

**CMK-TC-04 — Leave the dependency provider to the user.** Call `cmake_language(SET_DEPENDENCY_PROVIDER)` only in a shipped, opt-in file that users list themselves. Never `set()` or `list(APPEND)` `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` from project or module code. List at most one provider-registering file per configure.
- *Binds:* module author; application; library shipping a package.
- *Rationale:* "The choice of dependency provider should always be under the user's control" (`cmake_language`, 4.4.2 note). Calling it from `CMakeLists.txt` is a hard error ([resolution] §3). A second registration silently replaces the first ([resolution] §3, [toolchain] §6). A project `set()` hides the user's provider file entirely (C1), and `list(APPEND)` loads the user's file and then displaces its provider (C2). This overrules the resolution dive's rule 9 and the toolchain dive's praise of the aminya pattern.
- *Verify:*
  ```sh
  grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'SET_DEPENDENCY_PROVIDER' -e 'CMAKE_PROJECT_TOP_LEVEL_INCLUDES' .
  ```
  Each hit must sit in a provider file no project file includes. Any `CMakeLists.txt` hit, or a module that sets or appends the variable, = finding. Empty = pass. Behavioural check: configure with `-DCMAKE_PROJECT_TOP_LEVEL_INCLUDES=$PWD/user-marker.cmake`, where that file registers a logging provider. The marker provider not being the one called = finding.
- *Severity:* MUST.
- *Floor:* 3.24; module-name entries 3.29.

**CMK-TC-05 — Never design on a provider seeing `find_program`, `find_library` or `find_path`: providers intercept only `find_package` and `FetchContent_MakeAvailable`. With cmake-conan, make the first dependency call a `find_package`, or force one with `cmake_language(DEFER … CALL find_package …)`.**
- *Rationale:* `SUPPORTED_METHODS` is a closed set; `FIND_LIBRARY` is "Unknown dependency provider method" on 3.31.12 ([resolution] §3). The cmake-conan README's "any `find_*` before the first `find_package`" limitation is a separate, sequencing effect: `conan install` runs at the first intercepted call, so earlier `find_*` calls miss Conan's paths while later ones may see them ([toolchain] §4). Both statements hold. The DEFER workaround is in `aminya__project_options@412045e1f1:src/Conan.cmake:241-249` (cmake-conan#595).
- *Verify:* `cmake --help-command cmake_language` on the pinned binary lists the methods. Reading heuristic: with a cmake-conan provider in use, a `find_program(` or `find_library(` line before the first `find_package(` in `./CMakeLists.txt` (`grep -rn --include='CMakeLists.txt' -e 'find_package(' -e 'find_program(' -e 'find_library(' .`), with no DEFER, = finding.
- *Severity:* MUST.
- *Floor:* providers 3.24; DEFER 3.19; cmake-conan needs Conan ≥2.0.5.

#### Check D: read the toolchain file

**CMK-TC-06 — Keep a toolchain file that a manager may chainload idempotent and free of project-level commands:** no `project()`, `enable_language()`, unguarded `execute_process()` or `message(FATAL_ERROR)`.
- *Rationale:* the file is re-read inside every `try_compile` project, and `cmake-toolchains(7)` warns about `CMAKE_SOURCE_DIR` there. Measured (R1, 3.31.12 and 4.4.2): a `LANGUAGES C` configure reads it 3 times (2 for `project()`, 1 for the C ABI probe), plus once for every `try_compile` of either signature, including each `check_*` macro. So one `check_c_source_compiles` gives 4, and two `try_compile` calls give 5. [cross] §10's "the `SOURCES` signature does not re-read" is refuted. Budget 2 + L + N reads, where L is the number of compiled languages (measured for C only) and N the number of `try_compile` calls. CMP0137 (3.24) is a separate matter: it only controls which platform variables reach a project-mode `try_compile`. vcpkg's `VCPKG_TOOLCHAIN` early return (`microsoft__vcpkg@c4ee5a52d7:scripts/buildsystems/vcpkg.cmake:207-216`) and Conan's `IN_TRY_COMPILE` block both exist because of it ([toolchain] §7). The early return does not protect a chainloaded file. `vcpkg.cmake` includes `VCPKG_CHAINLOAD_TOOLCHAIN_FILE` before its guard, so the chainloaded file runs on every read, as measured against the real `vcpkg.cmake` ([cross] §9). A `project()` inside a chainloaded file is a hard "Recursive call not allowed" error, because the chainload runs inside the outer `project()`. That case reports itself; `execute_process` and side-effecting writes do not. The severity stays SHOULD by decision: the read count is now exact, but the harm depends on what the file does.
- *Verify:*
  ```sh
  grep -rnE --include='*toolchain*.cmake' -e 'execute_process' -e 'message\(FATAL_ERROR' -e 'project\(' -e 'enable_language' .
  ```
  Empty = pass. A hit outside a first-run guard = finding. The glob misses toolchains with other names, so also grep each file that a `VCPKG_CHAINLOAD_TOOLCHAIN_FILE` value or a `user_toolchain` conf entry names, passing its directory with `--include` set to that file name.
- *Severity:* SHOULD.
- *Floor:* any; CMP0137 3.24.

**CMK-TC-07 — In a cross build, get code generators for the build host and run target binaries only through `CMAKE_CROSSCOMPILING_EMULATOR`.** Host tools come from vcpkg `"host": true`, a Conan `tool_requires` in the build context, or `find_program(… NO_CMAKE_FIND_ROOT_PATH)`. The emulator applies only to a command that names an executable target (`add_test(NAME … COMMAND <target>)`, `add_custom_command`, `add_custom_target`), so never expect `set_tests_properties(… CROSSCOMPILING_EMULATOR …)` to wrap a script path.
- *Rationale:* the vcpkg.json reference defines `"host": true` for "code generators, or helpers", and Conan resolves `tool_requires` against the build profile ([toolchain] §8). The two declarations are invisible to CMake and must agree by construction. Measured in verify wave 3 on 3.31.12, 4.3.4 and 4.4.2: with `PROGRAM` unset, a plain `find_program(depprog)` returns `<sysroot>/usr/bin/depprog` over a host copy earlier on `PATH`. The unset mode behaves as `BOTH`, not `NEVER`. `NO_CMAKE_FIND_ROOT_PATH`, or an explicit `NEVER` (CMK-TC-09), returns the host copy. [cross] §3 saw no difference only because its sysroot held no same-named program. Conan's cross toolchain forces `PROGRAM` to `BOTH` as well (CMK-TC-10). `CROSSCOMPILING_EMULATOR` is a target property, baked into the generated test command at generate time. The same name set on a test is accepted and never acted on.
- *Verify:* reading heuristic. A generator found by a plain `find_program` while `CMAKE_FIND_ROOT_PATH_MODE_PROGRAM` is unset, `ONLY` or `BOTH` (a Conan cross build counts) = finding. So is a manifest dependency that runs at build time without `"host": true`. Run `grep -rn --include='*.cmake' --include='CMakeLists.txt' -e 'CROSSCOMPILING_EMULATOR' .`; a `set_tests_properties` hit whose `add_test` names a literal path instead of a target = finding. Empty = pass.
- *Severity:* SHOULD. Running a target binary without the emulator fails loudly (exec format error) unless the host has a binfmt handler.
- *Floor:* emulator 3.3 (list 3.15); vcpkg any; Conan 2.x.

**CMK-TC-08 — A project-owned cross toolchain sets `CMAKE_FIND_ROOT_PATH_MODE_LIBRARY`, `_INCLUDE` and `_PACKAGE` to `ONLY` explicitly. Never rely on the unset default.**
- *Binds:* cross build.
- *Rationale:* unset, the three behave as `BOTH`. `find_package.rst@v4.4.2`: "By default at first the directories listed in `CMAKE_FIND_ROOT_PATH` are searched, then the `CMAKE_SYSROOT` directory is searched, and then the non-rooted directories will be searched." Measured on 3.31.12 and 4.4.2: with a toolchain that sets only `CMAKE_SYSTEM_NAME` and `CMAKE_SYSROOT`, a package that exists only in a host prefix is found, and the cross build links the host copy ([cross] §1). `NEVER` makes it worse and resolves the host copy even when the sysroot has one ([cross] §2). The `ONLY` lines everyone copies come from the `cmake-toolchains(7)` worked example. `ONLY` keeps vcpkg working, because vcpkg adds its installed tree to `CMAKE_FIND_ROOT_PATH`. Under Conan, the generated toolchain overrides the setting (CMK-TC-10). This corrects map row M-H-05's framing.
- *Verify:* three separate commands, because a union cannot prove that all three are present:
  ```sh
  grep -rlE --include='*.cmake' -e 'set\(CMAKE_SYSROOT' -e 'set\(CMAKE_SYSTEM_NAME' . | xargs -r grep -L -e 'CMAKE_FIND_ROOT_PATH_MODE_LIBRARY'
  grep -rlE --include='*.cmake' -e 'set\(CMAKE_SYSROOT' -e 'set\(CMAKE_SYSTEM_NAME' . | xargs -r grep -L -e 'CMAKE_FIND_ROOT_PATH_MODE_INCLUDE'
  grep -rlE --include='*.cmake' -e 'set\(CMAKE_SYSROOT' -e 'set\(CMAKE_SYSTEM_NAME' . | xargs -r grep -L -e 'CMAKE_FIND_ROOT_PATH_MODE_PACKAGE'
  ```
  Empty = pass for each command. A listed file is a toolchain that leaves that mode unset = finding. Then read the files that do set a mode: any value other than `ONLY` = finding.
- *Severity:* MUST.
- *Floor:* any; the default is the same on 3.31.12 and 4.4.2.

**CMK-TC-09 — Set `CMAKE_FIND_ROOT_PATH_MODE_PROGRAM` to `NEVER` explicitly in a project-owned toolchain. Never set it to `ONLY`, and never leave it unset; reach target-side tools through an explicit path or a per-call `ONLY_CMAKE_FIND_ROOT_PATH`.**
- *Binds:* cross build.
- *Rationale:* measured in verify wave 3 on 3.31.12, 4.3.4 and 4.4.2. The unset mode behaves as `BOTH`, not `NEVER`: with `depprog` in `<sysroot>/usr/bin` and a host copy earlier on `PATH`, an unset or `BOTH` mode returns the sysroot binary, and only `NEVER` returns the host one. [cross] §3's "`NEVER` is the real default" came from a sysroot that held no same-named program, which cannot tell `NEVER` from `BOTH`. `ONLY` hides host generators from every plain `find_program`. It also sandboxes CMake's own build-program search, so a Makefiles configure without an explicit `CMAKE_MAKE_PROGRAM` fails with "CMake was unable to find a build program" (measured on all three lines). Unset and `BOTH` do not break the configure, and Conan's own cross toolchain uses `BOTH`, but a target-arch binary then runs at build time. That usually fails loudly with an exec-format error, which is why this half stays SHOULD.
- *Verify:*
  ```sh
  grep -rnE --include='*.cmake' -e 'CMAKE_FIND_ROOT_PATH_MODE_PROGRAM[[:space:]"]+ONLY' -e 'CMAKE_FIND_ROOT_PATH_MODE_PROGRAM[[:space:]"]+BOTH' .
  grep -rlE --include='*.cmake' -e 'set\(CMAKE_SYSROOT' -e 'set\(CMAKE_SYSTEM_NAME' . | xargs -r grep -L -e 'CMAKE_FIND_ROOT_PATH_MODE_PROGRAM'
  ```
  Run both on the source tree, not a build tree, where a generated `conan_toolchain.cmake` is expected to match. Empty = pass for each. A first-command `ONLY` hit = MUST finding. A first-command `BOTH` hit, or a file listed by the second command (a toolchain that leaves the mode unset), = SHOULD finding.
- *Severity:* MUST (`ONLY`); SHOULD (`BOTH` or unset).
- *Floor:* any.

**CMK-TC-10 — In a Conan 2 cross build, assume every `CMAKE_FIND_ROOT_PATH_MODE_*` is `BOTH`. Either pin each Conan-supplied package's `<Pkg>_DIR`, or show that the sysroot holds no same-named package config.**
- *Binds:* application; cross build.
- *Rationale:* Conan 2.32.0's `CMakeToolchain` `FindFiles` block (`conan/tools/cmake/toolchain/blocks.py:580-644`) rewrites an unset or `ONLY` mode to `BOTH` whenever `cross_building` is true. It never sets `CMAKE_FIND_ROOT_PATH`. The generated file confirms this. The block's explicit `STREQUAL "ONLY"` branch exists to override a value that a `user_toolchain` set, so CMK-TC-08's `ONLY` does not survive under Conan. That override was read in the source but not measured: the measured user toolchain left the modes unset. Measured with a real Conan 2.32.0 cross profile on 4.4.2: a `libfoo` config under `<sysroot>/usr/lib/cmake` beat both the project's `_ROOT` hint and the package in Conan's generators folder. There was no warning ([cross] §6). This is a documented gap: Conan has no setting that keeps `ONLY`.
- *Verify:* `grep -rn --include='conan_toolchain.cmake' -e 'CMAKE_FIND_ROOT_PATH_MODE_PACKAGE "BOTH"' build`. Empty = not applicable. With a hit, set `SYSROOT` to the host profile's sysroot and run `NAME=libfoo; find "$SYSROOT/usr" -ipath '*cmake*' -iname "${NAME}*config.cmake"` for each Conan-supplied package. Empty = pass. A listed file without a `<Pkg>_DIR` pin = finding. `--debug-find-pkg=NAME` shows the path that won.
- *Severity:* SHOULD.
- *Floor:* Conan 2.x; read and measured at 2.32.0.

**Handed to sibling families, not owned here:** CMK-MOD-12's `_ROOT` hand-off promise must cite CMK-DEP-21: the hand-off does not survive a non-empty root path ([cross] candidate 4). The `CMAKE_POLICY_VERSION_MINIMUM` value (3.10 over 3.5, with Qt's `qt__qtbase@0ef5a8e9ca:cmake/QtAutoDetectHelpers.cmake:84-85` default as corpus support) stays with CMK-VER-06 ([scope] §1). A CI leg's `CMAKE_WARN_DEPRECATED=OFF` (`curl__curl@98519dac83:.github/workflows/non-native.yml:419`, the corpus's only one) goes to the dependency-triage skill's 3.x remedy, and no corpus repo patches a dependency's `cmake_minimum_required` ([scope] §5). Conan `user_toolchain` over `toolchain_file` (CMK-CONAN, [toolchain] rule 6). The two meanings of `VCPKG_CHAINLOAD_TOOLCHAIN_FILE`, still open as vcpkg#36244 (CMK-VCPKG). Passing a manager's toolchain through rules_foreign_cc `cache_entries` (CMK-BZL-04 draft, [toolchain] rule 8). The ctest `-N` subproject gating the resolution dive measured (CMK-TEST/CMK-TGT, map M-E-06, M-I-01). CPS export (CMK-INST: additive, `CMAKE_VERSION VERSION_GREATER_EQUAL 4.3`, namespace equals package name).

## Applied to find_ocx and the exemplars

find_ocx (`/home/mherwig/dev/find_ocx`, dirty working tree; the lines below are identical at HEAD unless marked):

| Rule | Status | Evidence |
|---|---|---|
| DEP-01..12, DEP-15, DEP-19, DEP-20, DEP-23, TC-01..10 | not applicable | No FetchContent, CPM, Hunter, provider, toolchain, pkg-config, removed-module or `CMAKE_PREFIX_PATH` writes ([pinning] §Exemplar evidence, [ocx] §9, [toolchain] §Exemplar evidence, [scope] Exemplar evidence) |
| DEP-21 | consumer caveat | `ocx_package`'s `set(<name>_ROOT … CACHE PATH … FORCE)` (`ocx.cmake:1200-1201`) loses to any rooted copy once a consumer's configure has a non-empty `CMAKE_FIND_ROOT_PATH`, which vcpkg's toolchain provides. That is a limit on find_ocx's documented promise, not a find_ocx code defect, because find_ocx never cross-compiles ([cross] Exemplar evidence) |
| DEP-22 | not applicable, consumer caveat | Every example and fixture is `LANGUAGES NONE`, but their only `find_package(ocx)` is Find-module mode. A consumer that pairs `ocx_package` with `find_package(<name> CONFIG)` in a `LANGUAGES NONE` project misses `lib64/` layouts (map M-G-21's "LANGUAGES NONE plus PULL" caveat) |
| DEP-01 (spirit) | satisfied | Reproducible-first: a floating tag with no index and no digest is a hard error, with `OCX_ALLOW_FLOATING` as the named escape hatch (`ocx.cmake:26-30,101-107,1119-1129`, [ocx] Patterns) |
| DEP-16 | partly satisfied | A CI offline-determinism job exists (warm plus offline configure passes, cold offline fails as expected), but only on Linux ([ocx] §10) |
| **DEP-13** | **violated** | `ocx_package` writes `set(${arg_NAME}_ROOT "${content}" CACHE PATH … FORCE)` (`ocx.cmake:1200-1201`; `HEAD:1225-1226`) and never unsets `<name>_DIR`. After a `PACKAGE` change moves the content root, a Config-mode `find_package(<name>)` keeps the old copy while it still exists in the store (C4). |
| **DEP-14** | **violated (docs)** | `ocx.cmake:1062-1063` (`HEAD:1059-1060`): "a following `find_package(<name>)` / `find_library` searches the OCX-provisioned content". `examples/package/CMakeLists.txt:25-26` (`HEAD:24`): "find_package(jq)/find_program would search". A bare `find_program`/`find_library` ignores `jq_ROOT` (C5). The audit repeats the claim ([ocx] §9). |
| Map conflict 16 | inherited | The `CACHE INTERNAL` memo defect is refuted ([host] H4); not re-litigated here |

Exemplars (2026-09-26 SHAs):

| Rule | Satisfy | Violate |
|---|---|---|
| DEP-01 | `duckdb__duckdb@d8a1bd4f4f` 23/23 extension configs pin 40-hex (`.github/config/extensions/vss.cmake:5`); `gabime__spdlog@5b63780337:tests/CMakeLists.txt:22` | `aminya__project_options@412045e1f1:src/CrossCompiler.cmake:350-353` (`GIT_TAG main`); `curl__curl@98519dac83:tests/cmake/CMakeLists.txt:75-76` (`"master"` default); `cpp-best-practices__cmake_template@b86318abbf:Dependencies.cmake:74-79` (CPM `"main"`); `nlohmann__json@f422b753cc:tests/cmake_fetch_content/project/CMakeLists.txt:8` (+2, `HEAD`); `grpc__grpc@0f8d72ed71:examples/cpp/cmake/common.cmake:82` (a placeholder that is not a ref) |
| DEP-02 | `TheLartians__ModernCppStarter@72b8957f9e:documentation/CMakeLists.txt:9` (`#<commit>`) | 6 of 8 real CPM refs are tag-only ([pinning] §4); `gabime__spdlog@5b63780337:bench/CMakeLists.txt:22` (`v1.8.4`) |
| DEP-03 | `apache__arrow@3ad410b7b1` 18/18 (hashes in `cpp/thirdparty/versions.txt`); `ninja-build__ninja@4e4df1e567:CMakeLists.txt:261` | `duckdb__duckdb@d8a1bd4f4f:tools/cpp/cmake/DuckDBCppApi.cmake:121`; `cpp-best-practices__cmake_template@b86318abbf:cmake/PackageProject.cmake:158-160,179`; `cpp-best-practices__cmake_template@b86318abbf:cmake/Doxygen.cmake:33-34` (added in verify wave 2) |
| DEP-04 | — | `ccache__ccache@b471bbde29:cmake/FindZstd.cmake:62`; `microsoft__vcpkg-tool@51bf87ca6e:cmake/FindLibCURL.cmake:57` |
| DEP-05 | the two template copies hash-check their bootstrap | both templates pin a stale CPM (0.42.1, 0.42.3) and inherit the C6 policy leak; `cpm-cmake__CPMLicenses.cmake@ca42334d56:cmake/CPM.cmake` pins 0.27.5 with no `EXPECTED_HASH` (verify wave 2) |
| DEP-07 | `protocolbuffers__protobuf@c64743979d:cmake/abseil-cpp.cmake:13-41`, `cmake/gtest.cmake:1-19` (try-find-then-fetch behind `protobuf_FORCE_FETCH_DEPENDENCIES` and `protobuf_LOCAL_DEPENDENCIES_ONLY`); all 26 `install(EXPORT)` exemplars | none in 26 ([scope] §2). `duckdb__duckdb@d8a1bd4f4f:tools/cpp/cmake/DuckDBCppApi.cmake:123` fetches duckdb's own release for a helper tool and is out of scope |
| DEP-08 | protobuf's fallback tests `if(NOT TARGET absl::strings)` | — |
| DEP-15 | `apache__arrow@3ad410b7b1:cpp/cmake_modules/FindRapidJSONAlt.cmake:29-32` (save and restore), `ThirdpartyToolchain.cmake:1025-1038` (macro in function); `microsoft__vcpkg@c4ee5a52d7:scripts/ports.cmake:5-7` (whole port); `cpp-pm__hunter@997fab148b:cmake/projects/termcolor/hunter.cmake:34-36` (per recipe) | none in the corpus ([scope] §1) |
| DEP-19 | `fmtlib__fmt@522e2c12ab:test/CMakeLists.txt:228-236` (legacy CUDA call behind `VERSION_LESS 3.15`, `enable_language(CUDA OPTIONAL)` live); `apache__arrow@3ad410b7b1:cpp/src/arrow/gpu/CMakeLists.txt:33-44` (legacy call behind `VERSION_LESS 3.17`, `find_package(CUDAToolkit REQUIRED)` live) | none among shipped libraries; the Python calls sit in vcpkg, Hunter and conan-center glue ([scope] §3) |
| DEP-20 | 2,959 of 7,123 calls state a mode | 4,164 (58.5 %) state none, spread too thinly for named rows |
| DEP-16 | `microsoft__vcpkg@c4ee5a52d7:ports/vcpkg-cmake/vcpkg_cmake_configure.cmake:218`; `ccache__ccache@b471bbde29:cmake/Dependencies.cmake:18-21`; `apache__arrow@3ad410b7b1:cpp/CMakeLists.txt:94-96` | `glfw` is a false positive, not a violation |
| TC-01, TC-03 | `microsoft__vcpkg-tool@51bf87ca6e:CMakePresets.json:40-46`; `aminya__project_options@412045e1f1:src/Vcpkg.cmake:160,219` ("call before `project()`") | — |
| TC-02 | no corpus repo chains both managers | — |
| TC-04 | `conan-io__cmake-conan@b1593849dd:conan_provider.cmake` (shipped for the user to list) | `aminya__project_options@412045e1f1:src/Conan.cmake:237` (`list(APPEND CMAKE_PROJECT_TOP_LEVEL_INCLUDES …)` inside the reusable macro `_run_conan2`; C2 shows it displaces a user's provider) |
| TC-06 | `microsoft__vcpkg@c4ee5a52d7:scripts/buildsystems/vcpkg.cmake:207-216,282` | the chainload `include` precedes the guard, so a chainloaded file runs on every read ([cross] §9) |
| DEP-21, TC-08 | — | `microsoft__vcpkg@c4ee5a52d7:scripts/buildsystems/vcpkg.cmake:452,454` is the mechanism, not a violation: it appends the installed triplet to `CMAKE_FIND_ROOT_PATH`, which outranks any `_ROOT` hint |
| TC-10 | — | conan-io/conan@2.32.0 `conan/tools/cmake/toolchain/blocks.py:580-644` (`FindFiles` forces `BOTH` in cross builds) |
| DEP-22, DEP-23 | not checked across the corpus; both are mechanism findings ([cross] Exemplar evidence) | — |

New commitments with no corpus precedent: DEP-13's `unset(<Pkg>_DIR CACHE)` idiom appears nowhere in the corpus. DEP-16's `unshare -rn` check runs in none of the 46 CI setups. DEP-21's `<Pkg>_DIR` pin and CMK-TC-10's sysroot inventory appear nowhere either. DEP-07 and DEP-15, formerly listed here, now have corpus-wide counts with 0 violators ([scope] §1-§2).

## AI-agent failure modes

Ranked by how often the evidence shows the mistake.

1. **Pinning to a branch or tag, or calling a `${VAR}` pin "opaque".** It appears in 4 literal branch pins, a CPM `"main"`, curl's `"master"` default and grpc's placeholder, and the pinning dive itself first reported 13 pins as opaque. *Check:* the CMK-DEP-01/-02 greps, then resolve every variable.
2. **"Fixing the CMake 4 error" with a global `CMAKE_POLICY_VERSION_MINIMUM`** in a preset, CI or the environment, or with a remembered "lower your minimum". *Check:* the CMK-DEP-15 grep; any unpaired hit is the finding.
3. **Treating `-D<pkg>_ROOT` as a one-shot switch, or re-pointing `_ROOT` and expecting the copy to move.** *Check:* reconfigure twice and diff `<pkg>_DIR` (CMK-DEP-13).
4. **Setting `CMAKE_TOOLCHAIN_FILE` or `VCPKG_*` after `project()`**, then "verifying" by printing the variable. *Check:* the CMK-TC-03 line-order grep.
5. **Registering a provider from `CMakeLists.txt`, or appending `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` "for convenience".** *Check:* the CMK-TC-04 grep and the user-marker configure.
6. **Calling providers "the neutral seam every manager plugs into", or assuming they see `find_program`.** vcpkg has none, and the method set is closed. *Check:* no rule or doc text says "seam" or "every manager" about providers (map M-H-08). `cmake --help-command cmake_language` lists the methods (CMK-TC-05).
7. **Setting two toolchain files, or a `;`-list, "one per manager".** *Check:* CMK-TC-01/-02.
8. **Linking a bare target after `FetchContent_MakeAvailable` with `FIND_PACKAGE_ARGS`.** *Check:* the CMK-DEP-08 grep.
9. **CPS confusion.** The mistakes: setting the retired `CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES`, exporting `CPS_PREFIX_PATH`, asserting that CPS always wins or that Config always wins (a valid `.cps` wins on 4.3+, a rejected one falls through silently), or claiming vcpkg, Meson or Bazel read `.cps`. *Check:* the CMK-DEP-11 grep. Any tool-support claim must cite that tool's own repository ([cps-e] rule 3, [cps-v] rows 46-51).
10. **Emitting one-argument `FetchContent_Populate(name)`, or flagging the multi-argument direct form as deprecated.** *Check:* the CMK-DEP-04 regex matches only the bare-name form.
11. **Claiming `<X>_ROOT` feeds a following `find_program`/`find_library`**, as find_ocx's docs and audit do. *Check:* CMK-DEP-14's reading heuristic and the C5 scratch project.
12. **Not knowing that `include(CPM.cmake)` changes policy defaults for every later subproject.** *Check:* after the CPM include, `message(STATUS "${CMAKE_POLICY_DEFAULT_CMP0077}")` prints `NEW` (C6).
13. **"Scorecard will catch a floating `GIT_TAG`"** (it does not scan CMake), and **"`branch =` in `.gitmodules` means the submodule floats"** (the gitlink is a fixed commit; ClickHouse's own header says so, and Boost's `branch = .` is tooling). *Check:* neither is a finding. Look at the CI's actual `git submodule update --remote` use instead ([pinning] §8).
14. **"The cross toolchain is sandboxed by default."** Agents reviewing a toolchain that sets only `CMAKE_SYSTEM_NAME`/`CMAKE_SYSROOT` assert the modes default to `ONLY`, or that `PROGRAM` defaults to `NEVER`. All four default to `BOTH`. *Check:* the three CMK-TC-08 greps and the second CMK-TC-09 grep.
15. **Expecting a `_ROOT` hint or `CMAKE_PREFIX_PATH` entry to beat a manager's or sysroot's copy**, including under Conan's forced `BOTH`. *Check:* `--debug-find-pkg`; pin `<Pkg>_DIR` (CMK-DEP-21, CMK-TC-10).
16. **Assuming `CMAKE_SYSROOT` or a manager toolchain wires up `pkg_check_modules`.** *Check:* the CMK-DEP-23 greps for `PKG_CONFIG_SYSROOT_DIR` and `PKG_CONFIG_LIBDIR`.
17. **Inventing `CMAKE_FIND_LIBRARY_USE_LIB64_PATHS`**, or "fixing" a `LANGUAGES NONE` `lib64` miss by re-pointing the hint. The real knob is the global property `FIND_LIBRARY_USE_LIB64_PATHS`, and it is already TRUE. *Check:* CMK-DEP-22.
18. **Suggesting `find_package(CUDA)`, `PythonInterp` or `PythonLibs`, or judging a removed module by the floor instead of the `...<max>` end.** *Check:* CMK-DEP-19; `cmake_policy(GET CMP0148 v)` after the project's `cmake_minimum_required`.
19. **Counting toolchain reads from `message()` output, or assuming a `check_*` macro does not re-read the toolchain.** `try_compile` captures nested output. *Check:* a `file(APPEND)` sink (R1, CMK-TC-06).
20. **Conflating `-Wno-error=deprecated-declarations`, a compiler flag, with CMake's deprecation gate** while grepping for "deprecated". *Check:* grep for the CMake spelling (`CMAKE_WARN_DEPRECATED`, `CMAKE_POLICY_VERSION_MINIMUM`) only ([scope] AI-agent angle).

## Open questions

Owner decisions:

1. **find_ocx issues.** CMK-DEP-13 is a code fix: `unset(<name>_DIR CACHE)` when `<name>_ROOT` changes, in `ocx_package`. CMK-DEP-14 is a docs fix (`ocx.cmake:1062-1063`, `examples/package/CMakeLists.txt:25-26`). The map's owner default is "no find_ocx issue filed". Both are measured, and the owner decides whether they become issues.
2. **Family boundaries this consolidation drew.** CMK-DEP-15 owns the scope of injecting `CMAKE_POLICY_VERSION_MINIMUM`, although the map lists M-B-05 under CMK-VER. CMK-TC-02 owns the toolchain-level ban on two managers, while CMK-PKG (M-L-02) keeps the manager-of-record choice. The versions-and-gate and package-managers consolidations must cite these IDs rather than restate them. This revision adds one more: CMK-DEP-21 limits the `_ROOT` hand-off that the module-authoring rule CMK-MOD-12 promises, and CMK-MOD-12 must cite it. Accept, or move the rows.

Subareas that deserve another round:

- **providers.** Does a real cmake-conan provider (Conan 2.32.0, local cache, no network) show the sequencing effect CMK-TC-05 describes, for a `find_program` placed before and after the first `find_package`? Verify wave 2 settled `FETCHCONTENT_SOURCE_DIR_<X>` against a provider; this half is still unmeasured.
- **toolchains-and-cross, remainder.** Wave 3 answered the find-root matrix, the re-read count, chainload precedence against the real `vcpkg.cmake` and the pkg-config sysroot. Still open: `VCPKG_CHAINLOAD_TOOLCHAIN_FILE` set from a triplet file during a port build; whether the ABI probe adds one read per compiled language (measured for C only, CMK-TC-06); a Conan `user_toolchain` that sets `ONLY` (CMK-TC-10's override is read, not measured).
- **lib/<tuple> (M-G-21, second half).** Re-run [cross] §7 on a Debian or Ubuntu host, where `CMAKE_LIBRARY_ARCHITECTURE` is populated (CMK-DEP-22).
- **pkg-config consumption (M-G-19, first half).** `pkg_check_modules` without `IMPORTED_TARGET` (322 corpus calls), and `cmake_pkg_config` (3.31 `EXTRACT`, 4.1 `IMPORT`/`POPULATE`) under a cross toolchain. The map's SHOULD row has no measured rule yet.
- **`CMAKE_FIND_PACKAGE_PREFER_CONFIG` (M-G-08, second half).** Is it ever the right global? [scope] recounted only the explicit-mode share (CMK-DEP-20).

## Sub-artifacts

- [cmake-dependency-seam/resolution-order-and-providers.md](cmake-dependency-seam/resolution-order-and-providers.md): measured FetchContent and find_package resolution order, hint stickiness, provider registration, post-`project()` writes, the scope of `CMAKE_POLICY_VERSION_MINIMUM`, CMP0077, and `ctest -N` gating (3.31.12, 4.4.2).
- [cmake-dependency-seam/pinning-offline-and-cpm.md](cmake-dependency-seam/pinning-offline-and-cpm.md): corpus-wide pin shapes with opaque variables resolved, URL hashing, CPM, Hunter, offline switches, vendoring, and the false-positive rate of the network grep.
- [cmake-dependency-seam/toolchain-composition.md](cmake-dependency-seam/toolchain-composition.md): the four claimants to `CMAKE_TOOLCHAIN_FILE`, the composition table, the provider slot, host tools, and the claims handed to wave 3.
- [cmake-dependency-seam/cps-spec-and-cmake-implementation.md](cmake-dependency-seam/cps-spec-and-cmake-implementation.md): the CPS schema and search, and CMake's 3.31 to 4.4 implementation timeline; superseded where the verifier refutes it.
- [cmake-dependency-seam/cps-ecosystem-adoption-and-interop.md](cmake-dependency-seam/cps-ecosystem-adoption-and-interop.md): who produces or consumes CPS (Conan experimentally; vcpkg, Meson, pkgconf, build2, xmake and Bazel do not), and the namespace constraint.
- [cmake-dependency-seam/cps-verification.md](cmake-dependency-seam/cps-verification.md): the opus ledger of 63 re-fetched claims. Its verdicts override both CPS dives.
- [cmake-dependency-seam/scratch/dependency-seam-consolidation/](cmake-dependency-seam/scratch/dependency-seam-consolidation/): sources and `run.sh` for measurements C1-C6 of this file.
- [cmake-dependency-seam/verification-wave2.md](cmake-dependency-seam/verification-wave2.md): the opus verify-wave-2 ledger. It re-ran C1-C7 on 3.31.12, 4.3.4 and 4.4.2, ran every MUST check against planted and clean trees, and records every correction logged below.
- [cmake-dependency-seam/cross-compile-find-root.md](cmake-dependency-seam/cross-compile-find-root.md): wave 3, measured. It covers the find-root mode defaults and combinations, `find_program` and the emulator, `_ROOT` against vcpkg- and Conan-injected paths, `LANGUAGES NONE` and `lib64`, the pkg-config sysroot, chainloading into the real `vcpkg.cmake`, and the toolchain re-read count (3.31.12, 4.4.2, Conan 2.32.0). Its §10 claim about the `SOURCES` signature is refuted by R1.
- [cmake-dependency-seam/scope-classification-and-find-module-migration.md](cmake-dependency-seam/scope-classification-and-find-module-migration.md): wave 3, exemplar. It classifies corpus-wide violators for CMK-DEP-07 and -15, counts removed-Find-module use (M-G-16), recounts `CONFIG`/`MODULE` (M-G-08), and lists the 3.x remedies. Its floor heuristic and its arrow CUDA row are corrected here (conflicts 17 and 22).
- [cmake-dependency-seam/scratch/dependency-seam-revision/](cmake-dependency-seam/scratch/dependency-seam-revision/): sources and `run.sh` for R1-R3 of this file.
- [cmake-dependency-seam/verification-wave3.md](cmake-dependency-seam/verification-wave3.md): the opus verify-wave-3 ledger. It re-ran C1-C6 and R1-R3 on 3.31.12, 4.3.4 and 4.4.2, measured the `PROGRAM` find-root default and the `FIND_PACKAGE_ARGS` redirect stub, and ran every MUST check against planted and clean trees. Sources are in [`scratch/verify-dependency-seam/`](cmake-dependency-seam/scratch/verify-dependency-seam/).

## Key sources

1. [Modules/FetchContent.cmake @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Modules/FetchContent.cmake): recommends a hash over a branch or tag, defines the MakeAvailable resolution steps, `FIND_PACKAGE_ARGS`/`OVERRIDE_FIND_PACKAGE` (3.24), and first-declare-wins.
2. [Help/command/cmake_language.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/cmake_language.rst): the provider replaces any previous one; "should always be under the user's control"; the closed method set.
3. [Help/command/find_package.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/find_package.rst): the `_DIR` reuse rule, search order, CPS search, and range caveat.
4. [Help/variable/CMAKE_POLICY_VERSION_MINIMUM.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_POLICY_VERSION_MINIMUM.rst) and [CMAKE_POLICY_DEFAULT_CMPNNNN.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_POLICY_DEFAULT_CMPNNNN.rst): "Projects may set this variable before a call to `add_subdirectory()` that adds a third-party project".
5. [Help/variable/CMAKE_TOOLCHAIN_FILE.rst](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_TOOLCHAIN_FILE.rst) and [CMAKE_PROJECT_TOP_LEVEL_INCLUDES.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/variable/CMAKE_PROJECT_TOP_LEVEL_INCLUDES.rst): one path; when top-level includes run.
6. [vcpkg CMake integration](https://learn.microsoft.com/en-us/vcpkg/users/buildsystems/cmake-integration) and [microsoft/vcpkg#36244](https://github.com/microsoft/vcpkg/issues/36244): chainload, "before the first `project()`", and the two meanings.
7. [Conan 2 CMakeToolchain reference](https://docs.conan.io/2/reference/tools/cmake/cmaketoolchain.html) and [cmake-conan develop2 README](https://raw.githubusercontent.com/conan-io/cmake-conan/develop2/README.md): `user_toolchain`, and the provider's documented limits.
8. [CPM.cmake README](https://raw.githubusercontent.com/cpm-cmake/CPM.cmake/master/README.md): "always prefer specifying immutable git commit hashes".
9. [Kitware: Common Package Specification is Out the Gate](https://www.kitware.com/common-package-specification-is-out-the-gate/): CPS stable in 4.3, "in addition to" CMake-script packages.
10. [OpenSSF Scorecard checks.md](https://raw.githubusercontent.com/ossf/scorecard/main/docs/checks.md): Pinned-Dependencies does not cover CMake.
11. Measurement: [resolution-order-and-providers](cmake-dependency-seam/resolution-order-and-providers.md) §1-§7, 3.31.12 and 4.4.2, scratch under `cmake-dependency-seam/scratch/resolution-order/`.
12. Measurement: C1-C7 in this file, scratch under `cmake-dependency-seam/scratch/dependency-seam-consolidation/`.
13. Measurement: [install-round-trip-and-cps](cmake-consumable-library/install-round-trip-and-cps.md) §7-§8: Config beats CPS at default locations, and ranges on both paths (4.3.4, 4.4.2).
14. [cps-verification.md](cmake-dependency-seam/cps-verification.md): the ledger that settles every CPS version and gate claim.
15. [Help/manual/cmake-toolchains.7.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-toolchains.7.rst) and [Help/command/include/FIND_XXX_ROOT.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/include/FIND_XXX_ROOT.rst): the worked-example `ONLY` modes, and the rooted-then-unrooted default.
16. [Modules/FindPkgConfig.cmake @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Modules/FindPkgConfig.cmake): no sysroot handling, and cross builds skip the path guesses.
17. [Help/prop_tgt/CROSSCOMPILING_EMULATOR.rst @ v4.4.2](https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/prop_tgt/CROSSCOMPILING_EMULATOR.rst): a target property, applied to commands that name built targets.
18. conan-io/conan@2.32.0 `conan/tools/cmake/toolchain/blocks.py:580-644` (`FindFiles`): the cross-build `BOTH` rewrite.
19. Measurement: [cross-compile-find-root](cmake-dependency-seam/cross-compile-find-root.md) §1-§10, scratch under `cmake-dependency-seam/scratch/cross-compile-find-root/`.
20. Measurement: [scope-classification-and-find-module-migration](cmake-dependency-seam/scope-classification-and-find-module-migration.md) §1-§5, extractor and TSV under `cmake-dependency-seam/scratch/scope-classification/`.
21. Measurement: R1-R3 in this file, scratch under `cmake-dependency-seam/scratch/dependency-seam-revision/`.

## Revision log

- 2026-09-26, verify wave 2: Verdict 8, conflict 7, CMK-DEP-11 and failure mode 9 said Config beats CPS. Corrected: a valid `.cps` wins on 4.3.4/4.4.2, and a rejected one falls through silently. The earlier result came from a `VERSION_SCHEMA rpm` file.
- 2026-09-26, verify wave 2: CMK-DEP-07's check exited 0 on a forced fetch when the range stops below 3.30. It now passes `-DCMAKE_POLICY_DEFAULT_CMP0170=NEW`.
- 2026-09-26, verify wave 2: CMK-DEP-16's `unshare -rn` check had the same false pass. It now passes `-DCMAKE_POLICY_DEFAULT_CMP0170=NEW`.
- 2026-09-26, verify wave 2: CMK-DEP-13's one-line module grep missed find_ocx's two-line `CACHE … FORCE` violator. It is replaced by a file-grain `_ROOT CACHE` without `_DIR CACHE` pipeline.
- 2026-09-26, verify wave 2: CMK-DEP-14 said `_ROOT` reaches only Find modules. It also reaches a Config file loaded by `find_package`: measured, and matching `find_program`'s docs.
- 2026-09-26, verify wave 2: CMK-DEP-15's pairing check would flag its own arrow exemplar, which wraps a `find_package`. `find_package` is now an accepted wrapped call. The set/restore was measured working around a config that calls `cmake_minimum_required(VERSION 3.1)` on 4.4.2.
- 2026-09-26, verify wave 2: CMK-DEP-06 called #858 "the June-2026 CMake-4 floor fix". #858 is a per-package Protobuf fix. The floor is now "v0.26.10 or later".
- 2026-09-26, verify wave 2: CMK-DEP-05 and the DEP-05 exemplar row said "both corpus copies". There are three, and `CPMLicenses.cmake` pins 0.27.5 without a hash.
- 2026-09-26, verify wave 2: CMK-DEP-17's `'kind: "find'` count also matched CMake's own `find-v1` probes. It now counts `find_package-v1` on a `--fresh` tree.
- 2026-09-26, verify wave 2: CMK-TC-02 mischaracterised conan#12341. The issue asks Conan to copy vcpkg's chainload model; it does not ask to combine the two managers.
- 2026-09-26, verify wave 2: CMK-TC-06's toolchain re-read is now measured (4 reads per configure). CMP0137 was reattributed, the vcpkg line range became 207-216, and the severity is unchanged.
- 2026-09-26, verify wave 2: DEP-03 exemplar row gained the `cmake_template` `cmake/Doxygen.cmake:33-34` unhashed URL. Table step 1 and the redirects-versus-cached-`_DIR` order are now measured, and the matching open question is answered.
- 2026-09-26, wave-3 revision: the table's plain-`find_package` row claimed an order it keeps only while `CMAKE_FIND_ROOT_PATH`/`CMAKE_SYSROOT` are empty. It now states the rooted-first pass and that a valid `<X>_DIR` survives it ([cross] §5, R2). This was an overclaimed guarantee.
- 2026-09-26, wave-3 revision: added CMK-DEP-21, because the `_ROOT` hint does not outrank rooted candidates, and the `<Pkg>_DIR` pin is the measured remedy. CMK-DEP-13 now points to it, since its `unset` fix alone cannot survive a root path.
- 2026-09-26, wave-3 revision: CMK-TC-06 said "4 reads per configure". It now gives the 2 + L + N budget, measured for both `try_compile` signatures (R1, refuting [cross] §10). It also adds that a chainloaded file runs on every `vcpkg.cmake` read, and that `project()` inside it is a hard error. The severity stays SHOULD by decision, no longer "pending".
- 2026-09-26, wave-3 revision: CMK-TC-07 gained the measured emulator limit (target-named commands only; `set_tests_properties` is inert) and the reason `NO_CMAKE_FIND_ROOT_PATH` still matters under Conan's `BOTH`. Its verify no longer implies the default `PROGRAM` mode is `ONLY`.
- 2026-09-26, wave-3 revision: added CMK-TC-08 (explicit `ONLY` for library, include and package), CMK-TC-09 (`PROGRAM` never `ONLY`) and CMK-TC-10 (Conan's forced `BOTH`), from [cross] §1-§3 and §6. Map M-H-05's "defaults are ONLY" framing is corrected.
- 2026-09-26, wave-3 revision: added CMK-DEP-19 (removed Find modules, M-G-16), with the policy version read from `...<max>` (R3, correcting [scope] candidate 4), and CMK-DEP-20 (explicit `CONFIG`/`MODULE`, M-G-08, SHOULD).
- 2026-09-26, wave-3 revision: added CMK-DEP-22 (`LANGUAGES NONE` misses `lib64`, M-G-21, SHOULD) and CMK-DEP-23 (pkg-config sysroot in cross builds, M-G-19, MUST), each a documented gap.
- 2026-09-26, wave-3 revision: CMK-DEP-07 now accepts the hand-written try-find-then-fetch idiom, records 0 violators among 26 `install(EXPORT)` repos, and lists the path exclusions. The protobuf citation was corrected from `:16-43` to `:13-41`.
- 2026-09-26, wave-3 revision: CMK-DEP-15 now names four scoped shapes (save and restore, set inside a function, `ExternalProject_Add` `CMAKE_ARGS`, per-port arguments), records 0 corpus violators, and cites CMK-VER-06 for the value instead of minting a 3.10 rule.
- 2026-09-26, wave-3 revision: Verdict 9-12 and the documented gaps were added. Open questions were trimmed: toolchains-and-cross and corpus scope classification are answered, and the already-answered cps-import item is dropped. Exemplar rows for DEP-07 and DEP-15 now have counts. The arrow CUDA call was reclassified from debt to a pass (conflict 22).
- 2026-09-26, verify wave 3: CMK-TC-09, CMK-TC-07, Verdict 10, conflict 15 and failure mode 14 said the unset `CMAKE_FIND_ROOT_PATH_MODE_PROGRAM` is `NEVER`. It behaves as `BOTH`, and a plain `find_program` returned the sysroot's binary over the host's on 3.31.12, 4.3.4 and 4.4.2. TC-09 now requires an explicit `NEVER`, adds an unset-mode grep, and grades unset like `BOTH` (SHOULD).
- 2026-09-26, verify wave 3: CMK-DEP-09 was scoped to `OVERRIDE_FIND_PACKAGE` and advised gating with `FIND_PACKAGE_ARGS <version>`. Both keywords on one declare are a `FATAL_ERROR`, and a `FIND_PACKAGE_ARGS` declare that falls through to a fetch writes the same version-less stub (measured). The rule, its grep and the resolution table's "after" row now cover both keywords.
- 2026-09-26, verify wave 3: CMK-DEP-13's module grep missed a `_ROOT` write with `CACHE` on the next line. It now uses `grep -rlzE`.
- 2026-09-26, verify wave 3: CMK-DEP-08's grep missed a multi-line `target_link_libraries`. It gained a `-z` file-grain companion.
- 2026-09-26, verify wave 3: the Conan 2.32.0 `FindFiles` citation `blocks.py:580-641` stopped before the `INCLUDE` rewrite at line 642. It is now `:580-644` in CMK-TC-10, the exemplar table and Key sources.

[resolution]: cmake-dependency-seam/resolution-order-and-providers.md
[pinning]: cmake-dependency-seam/pinning-offline-and-cpm.md
[toolchain]: cmake-dependency-seam/toolchain-composition.md
[cps-s]: cmake-dependency-seam/cps-spec-and-cmake-implementation.md
[cps-e]: cmake-dependency-seam/cps-ecosystem-adoption-and-interop.md
[cps-v]: cmake-dependency-seam/cps-verification.md
[install-cps]: cmake-consumable-library/install-round-trip-and-cps.md
[ocx]: cmake-audit/find-ocx-cmake-shape-and-contracts.md
[host]: cmake-topic-map.md#host-checks-run-for-this-map
[canon]: cmake-topic-map/canonical-cmake.md
[cross]: cmake-dependency-seam/cross-compile-find-root.md
[scope]: cmake-dependency-seam/scope-classification-and-find-module-migration.md

---
title: cmake-build delta refresh, 2026-09-26 to 2026-11-27
pair: cmake-build
date: 2026-11-27
window_start: 2026-09-26
model: opus
consolidates:
  - .agents/research/refresh-2026-11/cmake-build/cmake-releases-gate-presets-policies.md
  - .agents/research/refresh-2026-11/cmake-build/cmake-experimental-cps-modules.md
  - .agents/research/refresh-2026-11/cmake-build/ci-runner-images-and-distros.md
  - .agents/research/refresh-2026-11/cmake-build/cmake-ecosystem-tools.md
  - .agents/research/refresh-2026-11/cmake-build/bazel-seam-rules-foreign-cc.md
  - .agents/research/refresh-2026-11/cmake-build/conan-vcpkg-facts-at-the-cmake-seam.md
  - .agents/research/refresh-2026-11/cmake-build/recent-shifts.md
revises:
  - .agents/research/cmake-versions-and-gate.md
  - .agents/research/cmake-targets-and-abi.md
  - .agents/research/cmake-consumable-library.md
  - .agents/research/cmake-module-authoring.md
  - .agents/research/cmake-testing-and-ci.md
  - .agents/research/cmake-bazel-seam.md
---

# cmake-build delta refresh

## Verdict

- CMake 4.5.0 (2026-11-12) and 4.5.1 (2026-11-19) are the window's one material event. The pair is written against a 4.4 top leg, and the pinned range `3.25...4.4` and the pinned top binary 4.4.2 stay as they are. Moving either is an owner decision, listed under open questions. Every edit below makes the text true for a reader who meets a 4.5 binary, which unpinned `macos-15` and `ubuntu-latest` legs already run.
- Add one rule, CMK-CORE-06 (MUST). On 4.5 the gate also fails seven directory-scope commands through the new `CMD_STRICT` and `CMD_NON_TARGET_DIRECTIVE` categories, inside fetched subprojects too. The rule says to migrate own code, exempt only that one category on the leg for a dependency, and never relax the gate. This was measured on 4.4.5 and 4.5.1.
- Change CMK-TGT-19 and CMK-VER-09 in place. 4.5.0 removed the `import std` experimental gate, `CXX_MODULE_STD`, `CMAKE_CXX_MODULE_STD` and `CMAKE_CXX_COMPILER_IMPORT_STD`, and the `GENERATE_SBOM` gate. The old spelling is now pinned to legs below 4.5, and the remedy on 4.5 is deletion or a version guard, never a new UUID.
- Change CMK-TGT-18 in place: a target that uses `import std` keeps module scanning on. Change CMK-TGT-03 in place: add `add_link_options`, which 4.5 classifies as a non-target directive (measured).
- Extend CMK-VER-08's DECIDE set by three 4.5 policies, CMP0220, CMP0221 and CMP0225, and restamp the policy count (84 past 3.25 on 4.5.1). The other four 4.5 policies are a feature gate, a rare `--repeat` option, an empty-path edge and Xcode plumbing, so they stay out.
- Add the 4.5 row to the CMK-VER-04 table and to the CMK-CI-01 schema table (schema 13 needs 4.5). Retarget the "4.5 is unreleased" sentences and the D1 re-check items that 4.5 has now answered.
- Restamp facts that moved without changing meaning: the hosted-image CMake versions (CMK-VER-03 and the Gate prose), `ubuntu-latest` now meaning Ubuntu 26.04, the gersemi floor (0.29.2 fixes a 0.29.1 regression on unknown commands), check-cmake's release date, CMP0177 and CMP0155 measured on 4.4.5 and 4.5.1, schema-12 `dev` rejection on 4.4.5 and 4.5.1, rules_foreign_cc 0.17.0, and Conan 2.34.0.
- Soften CMK-INST-09's Fedora claim from "stopped injecting" to an accepted change whose landing in Fedora 45 is unconfirmed. No source in the window shows it shipped.
- Decline every other candidate. That covers an SBOM rule (no measured failure), the `ctest --out-of-date` caution (read, not measured), the `install(SCRIPT CODE)` grep (the 4.5 failure is a loud configure error), the CPS package-name check (issue only, not measured), the cpp-pm/gate tag (the tag predates the window), and CMK-CI-05 for `ubuntu-latest` (no measurement on 26.04).
- Rule bump: minor (new rule CMK-CORE-06). Skill bump: minor (new guidance in CMK-VER-08, CMK-TGT-18, CMK-TGT-19 and CMK-VER-09).

## Changed rules

### CMK-CORE-02 (rules/cmake-build.md)

- Old text: "When a presets file raises `"version"` to 12, rename…". Rationale: "4.4.2 rejects `dev` under schema 12 (…)."
- New text: "…raises `"version"` to 12 or later, rename…". The rationale adds that 4.4.5 and 4.5.1 reject it the same way, and that 4.5.1 also rejects it under schema 13.
- Source: the releases delta, measured 2026-11-27 on `kitware/cmake:4.4.5` and `4.5.1` ("File version must be 11 or lower for errors.dev support").

### CMK-CORE-04 (rules/cmake-build.md)

- Old text: "no maintained semantic linter exists (`marzer/check-cmake` last pushed 2025-08-07)". Floor: "gersemi 0.29.1 (2026-09-14)".
- New text: "no semantic linter exists (`marzer/check-cmake`, v0.6.0 of 2026-10-15, matches patterns and has no model of CMake semantics)". Floor: "gersemi 0.29.2 (2026-10-01), which fixes 0.29.1's regression in formatting unknown commands".
- Source: https://pypi.org/pypi/gersemi/json, https://github.com/BlankSpruce/gersemi/blob/main/CHANGELOG.md, https://github.com/marzer/check-cmake/blob/v0.6.0/CHANGELOG.md.

### Gate prose and non-negotiable row 1 (rules/cmake-build.md, owned by CMK-CORE-01)

- Old text: "which 4.4.2 still honours with a one-line deprecation notice … on 2026-09-26 the hosted `ubuntu-24.04` and `windows-2025` images ship 3.31.6 and `macos-15` ships 4.4.2".
- New text: 4.4.2 through 4.5.1 honour `-Werror=dev`, and both canaries exit 1 on 4.4.5, 4.5.0 and 4.5.1. On 2026-11-27, `ubuntu-24.04` and `windows-2025` ship 3.31.6, while `macos-15` and `ubuntu-latest` (now Ubuntu 26.04) ship 4.5. Row 1 of the non-negotiables adds the CMK-CORE-06 clause and ID.
- The CMK-CORE-01 table row itself is unchanged. Its list of `author` children stays true, because `install-absolute-destination` still fails under the gate on 4.5.1, now through `strict`.
- Source: the releases delta (measured 2026-11-27); https://github.com/actions/runner-images/blob/main/images/macos/macos-15-arm64-Readme.md; https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2604-Readme.md; https://github.blog/changelog/2026-09-17-ubuntu-26-generally-available-and-latest-migration.

### CMK-VER-03 (versions-and-policies.md)

- Old text: "3.31.6 on `ubuntu-24.04` and `windows-2025`, 4.4.2 on `macos-15`, … (as of 2026-09-26)".
- New text: "3.31.6 on `ubuntu-24.04` and `windows-2025`, 4.5 on `macos-15` and on `ubuntu-latest`, which moved to Ubuntu 26.04 between 2026-10-19 and 2026-11-19, … (as of 2026-11-27)".
- Source: the runner-images READMEs and the GitHub changelog above.

### CMK-VER-04 (versions-and-policies.md)

- Old text: "Features on `master` do not exist in 4.4.3: presets schema 13, `CMD_STRICT`, `CMD_NON_TARGET_DIRECTIVE` and `cmake_language(PRINT_TARGETS)` (read 2026-09-26)."
- New text: "A feature newer than the pinned binary does not exist on it: presets schema 13, `CMD_STRICT`, `CMD_NON_TARGET_DIRECTIVE` and `cmake_language(PRINT_TARGETS)` are absent from 4.4.5 and arrived with 4.5.0 (2026-11-12)." The table gains a 4.5 row, and the removal row gains VS 14 2015 at 4.5. Grep (1) gains the 4.5 commands, and grep (2) gains `Visual Studio 14`.
- Source: https://raw.githubusercontent.com/Kitware/CMake/v4.5.1/Help/release/4.5.rst.

### CMK-VER-07 (versions-and-policies.md)

- Old text: "CMP0177 OLD passes on 3.31.12 through 4.4.2, CMP0155 OLD passes through 4.3.4 and fails the 4.4.2 gate …".
- New text: "CMP0177 OLD passes on 3.31.12 through 4.5.1, CMP0155 OLD passes through 4.3.4 and fails the gate from 4.4.2 on …", with the 2026-11-27 measurement on 4.4.5 and 4.5.1 added.
- Source: the releases delta, item 9.

### CMK-VER-08 (versions-and-policies.md)

- Old text: the DECIDE set ends at CMP0177; "Floor: 77 policies arrived after 3.25, as of 4.4.2"; "these six are the ones that change a build quietly".
- New text: CMP0220, CMP0221 and CMP0225 join the set; "77 … as of 4.4.2, and 84 as of 4.5.1"; "these nine"; plus one sentence: CMP0220 OLD does not warn, and CMP0225 prepends the install directory to `CMAKE_SYSTEM_PREFIX_PATH`.
- Source: https://cmake.org/cmake/help/v4.5/policy/CMP0220.html, https://cmake.org/cmake/help/v4.5/policy/CMP0225.html, `cmake --help-policy` on 4.5.1 (releases delta, item 8).

### CMK-VER-09 (versions-and-policies.md)

- Old text: no removal case. "Floor: the UUID can change at any minor."
- New text: the rule adds a sentence. On a 4.5 or newer binary, `CXX_IMPORT_STD` and `GENERATE_SBOM` no longer exist: keep either only under `if(CMAKE_VERSION VERSION_LESS 4.5)`, delete it on a 4.5 floor, and never look for a new UUID. The floor now reads that the UUID can change, and a gate can be removed, at any minor. The rationale records the 4.5.0 gate diff, and the verification records that both `CXX_IMPORT_STD` UUIDs count 0 on 4.5.1.
- Source: https://raw.githubusercontent.com/Kitware/CMake/v4.5.0/Help/dev/experimental.rst and v4.5.1 (identical), and the count command run on the 4.5.1 binary.

### CMK-CI-01 (presets-and-ci.md)

- Old text: table row "13 | not released (4.5, as of 2026-09-26)".
- New text: "13 | 4.5". The source sentence adds the v4.5.1 confirmation (4.4.5 up to 12, 4.5.1 up to 13, measured 2026-11-27) and names what schema 13 adds.
- Source: the releases delta, item 10; https://cmake.org/cmake/help/v4.5/manual/cmake-presets.7.html.

### CMK-TGT-03 (targets.md)

- Old text: the list ends "`link_directories` or `link_libraries`", and the grep has no `add_link_options`.
- New text: "`link_directories`, `link_libraries` or `add_link_options`", plus the grep line and one verification sentence pointing to CMK-CORE-06.
- Source: the releases delta, measured 2026-11-27 (`add_link_options()` exits 1 under `-Werror=author` on 4.5.1).

### CMK-TGT-18 (targets.md)

- Old text: "the project has no named-module sources", with the gate comment "with no FILE_SET CXX_MODULES in the project".
- New text: "no named-module sources and no `import std` (`CMK-TGT-19`)", with the gate comment "with no FILE_SET CXX_MODULES and no `import std`". The rationale gains one sentence on 4.5.
- Source: https://raw.githubusercontent.com/Kitware/CMake/v4.5.0/Help/release/4.5.rst ("`import std` is now available for all C++ 20 and later code with CXX_SCAN_FOR_MODULES enabled").

### CMK-TGT-19 (targets.md)

- Old text: "Keep `import std` behind `CMAKE_EXPERIMENTAL_CXX_IMPORT_STD` with the exact binary's UUID (CMK-VER-09), on Ninja only, gated on Clang 18.1.2+, MSVC 14.36+ or GCC 15+." Floor: "`import std` experimental through 4.4".
- New text: below 4.5 the gate and `CXX_MODULE_STD`; from 4.5 neither, and never the removed `CMAKE_CXX_COMPILER_IMPORT_STD`; GCC 16+ on macOS. The rationale adds the 4.5.0 removals and the Ubuntu-before-26.04 note. The verification adds a check for unguarded old spellings, and the grep gains `CXX_MODULE_STD` and `CMAKE_CXX_COMPILER_IMPORT_STD`. Floor: "experimental through 4.4 and ungated from 4.5".
- Source: https://raw.githubusercontent.com/Kitware/CMake/v4.5.0/Help/manual/cmake-cxxmodules.7.rst; experimental.rst v4.5.0; https://gitlab.kitware.com/cmake/cmake/-/work_items/28014.

### CMK-INST-09 (install-and-export.md)

- Old text: "Fedora 45's `%cmake` macro stopped injecting the five legacy variables (change page updated 2026-03-10)."
- New text: "Fedora's change accepted for Fedora 45 drops the five legacy variables from the `%cmake` macro (change page updated 2026-03-10), and whether it landed in Fedora 45 is not confirmed as of 2026-11-27." The rule sentence is unchanged.
- Source: https://fedoraproject.org/wiki/Changes/CMake_drop_install_vars (the cmake change merges only after the affected packages are patched).
- Source for the related open issue on Find-module exports named in the install-and-export.md "none reported upstream" sentence (edit list entry 48): https://gitlab.kitware.com/cmake/cmake/-/work_items/28296 (cmake#28296).

### CMK-MOD-15 (module-authoring.md)

- Old text: "Floor: gersemi 0.29.1." The section line says "(gersemi 0.29.1, released 2026-09-14)", and D8 says "after 0.29.1".
- New text: "Floor: gersemi 0.29.2." The section line says "(gersemi 0.29.2 or later, released 2026-10-01; measured on 0.29.1, released 2026-09-14)", and D8 says "after 0.29.2". CMK-MOD-16's "gersemi 0.29.1 reads…" is a measurement and stays.
- Source: gersemi CHANGELOG ("Fixed: Regression in formatting unknown commands. (#129)").

### CMK-BZL-08 and CMK-BZL-14 (bazel-seam.md)

- Old text: "(3.31.12 by default at rules_foreign_cc 0.16.0)"; "unchanged at 2.32.0"; D5 "after 0.16.0".
- New text: "at rules_foreign_cc 0.16.0 and 0.17.0"; "unchanged through 2.34.0 (2026-10-28)"; D5 "after 0.17.0". The wrapper paragraph records that both values are unchanged at 0.17.0.
- Source: https://raw.githubusercontent.com/bazel-contrib/rules_foreign_cc/0.17.0/foreign_cc/repositories.bzl, …/toolchains/private/cmake_versions.bzl, https://raw.githubusercontent.com/conan-io/conan/2.34.0/conan/tools/google/bazeldeps.py.

## New rules

### CMK-CORE-06 (rules/cmake-build.md, Rules This File Owns)

- Rule: On a leg whose binary is CMake 4.5 or newer, expect the gate to fail every directory-scope command that has a `target_*` equivalent (`include_directories`, `add_definitions`, `add_compile_definitions`, `add_compile_options`, `link_directories`, `link_libraries`, `add_link_options`), inside fetched and vendored subprojects too. Migrate a hit in your own code (`CMK-TGT-03`). For a hit only inside a dependency, pass `-Wno-error=non-target-directive` on that leg's command line, with a comment naming the dependency and the exit condition. Never put the exemption in a committed preset, and never relax the gate itself.
- Rationale: 4.5.0 added `CMD_STRICT` under `CMD_AUTHOR`, and `CMD_NON_TARGET_DIRECTIVE` under `CMD_STRICT`. Both default to ignore, but the gate promotes them through the parent chain. On 4.5.1 each of the seven commands exits 1 under `-Werror=author`, a call inside an `add_subdirectory` dependency too. `set(CMAKE_CXX_STANDARD 17)` exits 0, and the same files exit 0 on 4.4.5. `-Werror=author -Wno-error=non-target-directive` exits 0 (measured 2026-11-27). Unpinned `macos-15` and `ubuntu-latest` legs already run 4.5, so a tree that is green on 4.4 turns red there with no edit. The likely agent reaction is to drop or relax the whole gate.
- Verification: the Gate's step-3 configure on the 4.5 binary, where exit 0 passes. Then grep (g): empty output passes. A `Wno-error=author` or `Wno-error=dev` hit is the finding, and so is any presets-file hit. A CI hit on `non-target-directive` passes only with an adjacent comment naming a dependency and an exit, and only while `CMK-TGT-03`'s grep prints no own-code line.
- Severity: MUST. Floor: CMake 4.5.
- Source: measured 2026-11-27 on `kitware/cmake:4.4.5` and `4.5.1` (the releases delta, items 9 and 10); https://raw.githubusercontent.com/Kitware/CMake/v4.5.1/Help/release/4.5.rst (`CMD_STRICT` and `CMD_NON_TARGET_DIRECTIVE`).
- Source for the CMK-VER-04 4.5 table row and removal row: the same 4.5.rst, which lists `math(INCREMENT)`, `ctest --out-of-date`, `add_custom_rule()` and the removal of the Visual Studio 14 2015 generator.

## Confirmed unchanged

- Gate spelling per binary: `-Werror=author` on ≥ 4.4, `-Werror=dev` on ≤ 4.3 and for mixed legs. Both canaries exit 1 under either spelling on 4.4.5, 4.5.0 and 4.5.1, and `message(STATUS)` exits 0.
- CMK-CORE-03: neither gate spelling reaches `uninitialized` on 4.4.2 or 4.5.1, and `-Werror=uninitialized` exits 1 on both. `CMD_UNINITIALIZED` and `CMD_UNUSED_CLI` are still 4.4, default ignore, with no parent.
- CMK-CORE-05: the `shell: bash` mapping to `bash --noprofile --norc -eo pipefail {0}` is unchanged on the workflow-syntax page.
- CMK-VER-02's count basis and the 4.4.2 count of 77. 4.4.3 to 4.4.5 added no policy.
- `cmake --presets-file` is still CMake ≥ 4.4. `PARSE_ARGN` is still 4.4 and function-only. The `-P` gate (CMK-TEST-02) exits 1 on 4.5.1. `discover_tests()` is still 4.4. CMP0170 is still 3.30.
- CPS: CMK-INST-13 to -17 and CMK-DEP-11 were re-measured on 4.5.1 and all hold. `CPS_PATH` and `CPS_PREFIX_PATH` are still absent from `find_package` docs. `MAPPED_PACKAGE_INFO` is still the gate for `CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO`. Named-module compiler and generator floors in CMK-TGT-19 are unchanged.
- The experimental gates `EXPORT_PACKAGE_DEPENDENCIES`, `MAPPED_PACKAGE_INFO`, `EXPORT_BUILD_DATABASE` and `RUST` keep their 4.4.2 UUIDs on 4.5.x. Every patch tag in the window carries an `experimental.rst` byte-identical to its minor's previous tag.
- No 3.31 release after 3.31.12. 4.4.4 and 4.4.5 carry "no changes to documented features or interfaces".
- Ubuntu 22.04 apt 3.22.1, and the 3.25-floor distro table (bookworm 3.25.1). The `get-cmake` and `setup-cmake` actions still exist. CMK-CI-05's issue and PR states are unchanged.
- cmake-format is still 0.6.13 (2020-08-19). CPM v0.43.2, Hunter v0.26.12 and cpp-pm/gate `9205073` are unchanged. Scorecard still does not read CMake. Catch2's `DISCOVERY_MODE` is unchanged, and GoogleTest has no release in the window.
- rules_foreign_cc 0.17.0 keeps default 3.31.12, the table ceiling 4.0.7 and `rules_cc` 0.2.18. Issues #1129 and #329 are open. PIC delivery is unchanged. Conan BazelDeps still pins `rules_cc` 0.2.17 and is still experimental. vcpkg still has no Bazel bridge.
- Conan, cmake-conan and vcpkg seam facts (CMK-TC-05, -10, CMK-DEP-13, -16, -17, -21, -23, and the `CppStdBlock` and `VSRuntimeBlock` claims) are unchanged through Conan 2.34.0, cmake-conan `b1593849` and vcpkg 2026.10.16. The pair's "as of Conan 2.32.0" stamps stay true as statements about the read tag, so they are not restamped.
- No Kitware security advisory, no new `file(DOWNLOAD)` or FetchContent surface in 4.4 or 4.5.

## Open questions

- Owner: move the top CI binary from 4.4.2 to 4.4.5, the newest 4.4 patch, which behaved identically on every measured point, or to 4.5.1, which needs CMK-CORE-06 handled first.
- Owner: raise the pinned range to `3.25...4.5`. That flips CMP0220 to CMP0226 to NEW for every adopter, and CMK-VER-08 now names the three that matter.
- Does the 24.04 unprivileged-user-namespace restriction hold on `ubuntu-26.04`? CMK-CI-05's verification still counts `ubuntu-latest` as a finding. A probe on a hosted 26.04 runner decides whether that clause stays.
- Did Fedora 45's `%cmake` drop the five variables? Run `podman run --rm fedora:45 rpm --eval '%cmake'` and grep for `LIB_SUFFIX`.
- What does a stale `CMAKE_EXPERIMENTAL_CXX_IMPORT_STD` do on 4.5 (warn, error or nothing)? Not measured. No `import std` build was run on 4.5 with Clang 18 or GCC 15 and Ninja, so CMK-TGT-19's 4.5 half is read from `cmake-cxxmodules(7)`, not built.
- Can `block(SCOPE_FOR DIAGNOSTICS)` or `cmake_diagnostic` scope `non-target-directive` to one `FetchContent_MakeAvailable`? That would be narrower than CMK-CORE-06's per-leg exemption. Not measured.
- cmake#27965: CMake exports a CPS package name containing a period, and the result cannot be imported. This is a candidate silent-export gap for CMK-INST-15, pending a measurement.
- The 4.5 `cmake --install` exit code now fails on a failing install script, and the `install(SCRIPT CODE …)` form now errors. Does the CMK-INST-01 round trip on 4.4 miss a failing `install(CODE)`? Not measured.
- `ctest --out-of-date` skips tests with no recorded build dependencies (read in `ctest(1)` at 4.5). A CMK-TEST-06 caution against gating on it needs a measurement first.
- SBOM: does `-DCMAKE_INSTALL_SBOM_FORMATS=spdx` fail the install of a library whose link properties carry unguarded generator expressions? Not measured. No rule until a failure is measured.
- Whether 4.5 changed the configure-log `find_package-v1` events that CMK-DEP-16 and -17 read.
- `discover_tests()` adopters outside Kitware: not re-measurable with the tools available. The 2026-09-26 stamp stays.

## Revision log

- rules/cmake-build.md: the Gate's verified line adds the 2026-11-27 canary re-run on 4.4.5, 4.5.0 and 4.5.1.
- rules/cmake-build.md: the Gate prose extends `-Werror=dev` support to 4.5.1, points to CMK-CORE-06, and restamps the hosted-image CMake versions to 2026-11-27.
- rules/cmake-build.md: non-negotiable row 1 now says "schema 12 or later" and gains the CMK-CORE-06 clause and ID.
- rules/cmake-build.md: CMK-CORE-02 now reads "12 or later", and the rationale adds 4.4.5 and 4.5.1.
- rules/cmake-build.md: CMK-CORE-04 updates check-cmake's status and raises the gersemi floor to 0.29.2.
- rules/cmake-build.md: new CMK-CORE-06 row and grep (g).
- versions-and-policies.md: the rules_foreign_cc citation adds 0.17.0, and the measured line adds 4.4.5 and 4.5.1.
- versions-and-policies.md: the CMK-VER-07 rationale extends CMP0177 and CMP0155 to 4.5.1.
- versions-and-policies.md: the CMK-VER-04 rationale says 4.5 has shipped; greps (1) and (2) gain 4.5 entries; the table gains a 4.5 row and VS 14 2015.
- versions-and-policies.md: CMK-VER-09 gains the gate-removal case.
- versions-and-policies.md: CMK-VER-03 restamps the runner images.
- versions-and-policies.md: CMK-VER-08 gains CMP0220, CMP0221 and CMP0225, and the count of 84.
- versions-and-policies.md: agent mistake 7 retargets 4.5 features from "unreleased" to "unguarded".
- versions-and-policies.md: D1, D7 and the policy-count re-check are updated.
- presets-and-ci.md: the runner-default date moves to 2026-11-27; the schema 13 row and its v4.5.1 confirmation are added; D1 and the runner re-check are updated.
- targets.md: CMK-TGT-03 adds `add_link_options` to the rule and the grep, plus the CMK-CORE-06 pointer.
- targets.md: CMK-TGT-18 carves out `import std`.
- targets.md: CMK-TGT-19 splits `import std` at 4.5, gets new grep patterns and a new floor; agent mistake 7 and the re-check are updated.
- install-and-export.md: the SBOM sentence is restamped; the CMK-INST-09 Fedora claim is softened; agent mistake 3 is aligned; the D1 and CPS-gap re-check is updated.
- module-authoring.md: the gersemi floor moves to 0.29.2, and D8 now reads "after 0.29.2".
- testing.md: D1 records the 4.5.1 `-P` result and retargets to minors after 4.5.
- bazel-seam.md: rules_foreign_cc 0.17.0 is named in CMK-BZL-08, the wrapper paragraph and D5. CMK-BZL-14 now reads "unchanged through Conan 2.34.0".
- Spillover round (from cpp-packaging): no file changed. All three items were already true in the first-round text.

## Edit list

Each entry names a file, a verbatim find string, and its replacement. For an insertion, it names an anchor and the text that goes on new lines directly after the line that ends with the anchor. Apply the entries in order.

1. File: `rules/cmake-build.md`
Find (verbatim):
```
3.31.12, 4.3.4 and 4.4.2, with gersemi 0.29.1.
```
Replace with:
```
3.31.12, 4.3.4 and 4.4.2, with gersemi 0.29.1. The canaries were re-run on
4.4.5, 4.5.0 and 4.5.1 on 2026-11-27.
```

2. File: `rules/cmake-build.md`
Find (verbatim):
```
legs on both sides, which 4.4.2 still honours with a one-line deprecation
notice. The canary measured exit 1 under `-Werror=dev` on all three binaries,
and exit 0 under `-Werror=author` on 3.31.12 and 4.3.4. `$BIN`, never a `cmake`
off `PATH`: on 2026-09-26 the hosted `ubuntu-24.04` and `windows-2025` images
ship 3.31.6 and `macos-15` ships 4.4.2, so one unpinned workflow runs two gates.
```
Replace with:
```
legs on both sides, which 4.4.2 through 4.5.1 still honour with a one-line
deprecation notice. The canary measured exit 1 under `-Werror=dev` on all three
binaries and on 4.4.5, 4.5.0 and 4.5.1, and exit 0 under `-Werror=author` on
3.31.12 and 4.3.4. On 4.5 the gate also fails directory-scope commands
(`CMK-CORE-06`). `$BIN`, never a `cmake` off `PATH`: on 2026-11-27 the hosted
`ubuntu-24.04` and `windows-2025` images ship 3.31.6, while `macos-15` and
`ubuntu-latest` (now Ubuntu 26.04) ship 4.5, so one unpinned workflow runs two gates.
```

3. File: `rules/cmake-build.md`
Find (verbatim):
```
and never a schema-12 presets file that still spells `dev`. | CMK-CORE-01, CMK-CORE-02 |
```
Replace with:
```
and never a presets file at schema 12 or later that still spells `dev`. On 4.5 or newer, a directory-scope command the gate fails is migrated, or exempted by its one category for a dependency, never by relaxing the gate. | CMK-CORE-01, CMK-CORE-02, CMK-CORE-06 |
```

4. File: `rules/cmake-build.md`
Find (verbatim):
```
When a presets file raises `"version"` to 12, rename
```
Replace with:
```
When a presets file raises `"version"` to 12 or later, rename
```

5. File: `rules/cmake-build.md`
Find (verbatim):
```
4.4.2 rejects `dev` under schema 12 ("File version must be 11 or lower for warnings.dev support").
```
Replace with:
```
4.4.2 rejects `dev` under schema 12 ("File version must be 11 or lower for warnings.dev support"), and so do 4.4.5 and 4.5.1, which also rejects it under schema 13 (measured 2026-11-27).
```

6. File: `rules/cmake-build.md`
Find (verbatim):
```
and no maintained semantic linter exists (`marzer/check-cmake` last pushed 2025-08-07).
```
Replace with:
```
and no semantic linter exists (`marzer/check-cmake`, v0.6.0 of 2026-10-15, matches patterns and has no model of CMake semantics).
```

7. File: `rules/cmake-build.md`
Find (verbatim):
```
SHOULD. Floor: gersemi 0.29.1 (2026-09-14) |
```
Replace with:
```
SHOULD. Floor: gersemi 0.29.2 (2026-10-01), which fixes 0.29.1's regression in formatting unknown commands |
```

8. File: `rules/cmake-build.md`
Insert after the line ending with (anchor, verbatim):
```
| MUST. Floor: shell-level, any CMake |
```
Text to insert:
```
| CMK-CORE-06 | On a leg whose binary is CMake 4.5 or newer, expect the gate to fail every directory-scope command that has a `target_*` equivalent (`include_directories`, `add_definitions`, `add_compile_definitions`, `add_compile_options`, `link_directories`, `link_libraries`, `add_link_options`), inside fetched and vendored subprojects too. Migrate a hit in your own code (`CMK-TGT-03`). For a hit only inside a dependency, pass `-Wno-error=non-target-directive` on that leg's command line, with a comment naming the dependency and the exit condition. Never put that exemption in a committed preset, and never relax the gate itself (`-Wno-error=author`, `-Wno-error=dev`, or dropping it). | 4.5.0 (2026-11-12) added `CMD_STRICT` under `CMD_AUTHOR` and `CMD_NON_TARGET_DIRECTIVE` under `CMD_STRICT`. Both default to ignore, but the gate promotes them through the parent chain. On 4.5.1 each of the seven commands exits 1 under `-Werror=author`, a call inside an `add_subdirectory` dependency too, while `set(CMAKE_CXX_STANDARD 17)` exits 0 and the same files exit 0 on 4.4.5. `-Werror=author -Wno-error=non-target-directive` exits 0 (measured 2026-11-27). Unpinned `macos-15` and `ubuntu-latest` legs already run 4.5, so a tree that is green on 4.4 turns red there with no edit. | The Gate's step-3 configure on the 4.5 binary: exit 0 passes. Then (g): empty output passes. A `Wno-error=author` or `Wno-error=dev` hit is the finding, and so is any presets-file hit. A CI hit on `non-target-directive` passes only with an adjacent comment that names a dependency and an exit, and only while `CMK-TGT-03`'s grep prints no own-code line. | MUST. Floor: CMake 4.5 |
```

9. File: `rules/cmake-build.md`
Insert after the line ending with (anchor, verbatim):
```
-e '[|] *grep( +-[-a-zA-Z=0-9]+)* +--max-count' --
```
Text to insert:
```
# (g) CMK-CORE-06: a category exemption, or a relaxed gate, for CMake 4.5 legs
git ls-files -z --cached --others --exclude-standard -- ":(glob)$CI_DIR/**" ':(glob)**/CMakePresets.json' | xargs -0 -r grep -H -n -e 'non-target-directive' -e 'nonTargetDirective' -e 'Wno-error=author' -e 'Wno-error=dev' --
```

10. File: `skills/cmake-build-reference/versions-and-policies.md`
Find (verbatim):
```
(3.31.12 under rules_foreign_cc 0.16.0)
```
Replace with:
```
(3.31.12 under rules_foreign_cc 0.16.0 and 0.17.0)
```

11. File: `skills/cmake-build-reference/versions-and-policies.md`
Find (verbatim):
```
Measured on CMake 3.31.12, 4.3.4 and 4.4.2 on 2026-09-26.
```
Replace with:
```
Measured on CMake 3.31.12, 4.3.4 and 4.4.2 on 2026-09-26, and the 4.5 facts on 4.4.5 and 4.5.1 on 2026-11-27.
```

12. File: `skills/cmake-build-reference/versions-and-policies.md`
Find (verbatim):
```
CMP0177 OLD passes on 3.31.12 through 4.4.2, CMP0155 OLD passes through 4.3.4 and fails the 4.4.2 gate even inside `if(POLICY)`, and CMP0126 OLD fails the gate on every binary from 3.31.12 (measured 2026-09-26 on 3.31.12, 4.0.7, 4.2.7, 4.3.4 and 4.4.2).
```
Replace with:
```
CMP0177 OLD passes on 3.31.12 through 4.5.1, CMP0155 OLD passes through 4.3.4 and fails the gate from 4.4.2 on even inside `if(POLICY)`, and CMP0126 OLD fails the gate on every binary from 3.31.12 (measured 2026-09-26 on 3.31.12, 4.0.7, 4.2.7, 4.3.4 and 4.4.2, and 2026-11-27 on 4.4.5 and 4.5.1).
```

13. File: `skills/cmake-build-reference/versions-and-policies.md`
Find (verbatim):
```
Features on `master` do not exist in 4.4.3: presets schema 13, `CMD_STRICT`, `CMD_NON_TARGET_DIRECTIVE` and `cmake_language(PRINT_TARGETS)` (read 2026-09-26).
```
Replace with:
```
A feature newer than the pinned binary does not exist on it: presets schema 13, `CMD_STRICT`, `CMD_NON_TARGET_DIRECTIVE` and `cmake_language(PRINT_TARGETS)` are absent from 4.4.5 and arrived with 4.5.0 (2026-11-12).
```

14. File: `skills/cmake-build-reference/versions-and-policies.md`
Find (verbatim):
```
and only `CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO` still needs `MAPPED_PACKAGE_INFO`.
```
Replace with:
```
and only `CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO` still needs `MAPPED_PACKAGE_INFO`. On a 4.5 or newer binary, `CXX_IMPORT_STD` and `GENERATE_SBOM` no longer exist: keep either only under `if(CMAKE_VERSION VERSION_LESS 4.5)`, delete it on a 4.5 floor, and never look for a new UUID.
```

15. File: `skills/cmake-build-reference/versions-and-policies.md`
Find (verbatim):
```
Floor: the UUID can change at any minor.
```
Replace with:
```
Floor: the UUID can change, and a gate can be removed, at any minor.
```

16. File: `skills/cmake-build-reference/versions-and-policies.md`
Find (verbatim):
```
Four of six gates rotated between 4.3.4 and 4.4.2, and `master` carries UUIDs no release has.
```
Replace with:
```
Four of six gates rotated between 4.3.4 and 4.4.2, and `master` carries UUIDs no release has. 4.5.0 (2026-11-12) removed `CXX_IMPORT_STD` and `GENERATE_SBOM`, added `SYCL` and kept the other four UUIDs, and 4.5.1 matches it (read at each tag on 2026-11-27).
```

17. File: `skills/cmake-build-reference/versions-and-policies.md`
Find (verbatim):
```
On 4.4.2, `451f2fe2…` counts 0 and `f35a9ac6…` counts 1. |
```
Replace with:
```
On 4.4.2, `451f2fe2…` counts 0 and `f35a9ac6…` counts 1. On 4.5.1 both count 0 because the gate is gone, so the fix there is the `VERSION_LESS 4.5` guard or deletion, never a new UUID. |
```

18. File: `skills/cmake-build-reference/versions-and-policies.md`
Insert after the line ending with (anchor, verbatim):
```
    -e 'cmake_diagnostic' \
```
Text to insert:
```
    -e '[(]SBOM' \
    -e 'add_custom_rule' \
    -e 'PRINT_(PROPERTIES|TARGETS|VARIABLES)' \
    -e 'PATH_IS_PREFIX' \
```

19. File: `skills/cmake-build-reference/versions-and-policies.md`
Insert after the line ending with (anchor, verbatim):
```
    -e 'Visual Studio 12' \
```
Text to insert:
```
    -e 'Visual Studio 14' \
```

20. File: `skills/cmake-build-reference/versions-and-policies.md`
Find (verbatim):
```
| Feature | `versionadded` (read on 4.4.2) |
```
Replace with:
```
| Feature | `versionadded` (read on 4.4.2, the 4.5 row on 4.5.1) |
```

21. File: `skills/cmake-build-reference/versions-and-policies.md`
Insert after the line ending with (anchor, verbatim):
```
| `-Werror=author`, `block(SCOPE_FOR DIAGNOSTICS)`, `cmake_diagnostic`, presets schema 12 | 4.4 |
```
Text to insert:
```
| `import std` and `install(SBOM)` ungated, `CMD_STRICT`, `CMD_NON_TARGET_DIRECTIVE`, `cmake_language(PRINT_TARGETS)` and its `PRINT_PROPERTIES` and `PRINT_VARIABLES` siblings, `add_custom_rule()`, `if(PATH_IS_PREFIX)`, `math(INCREMENT)`, `ctest --out-of-date`, presets schema 13 | 4.5 |
```

22. File: `skills/cmake-build-reference/versions-and-policies.md`
Find (verbatim):
```
VS 12 2013 at 3.31 | removal |
```
Replace with:
```
VS 12 2013 at 3.31, VS 14 2015 at 4.5 | removal |
```

23. File: `skills/cmake-build-reference/versions-and-policies.md`
Find (verbatim):
```
Image defaults differ by OS on the same day: 3.31.6 on `ubuntu-24.04` and `windows-2025`, 4.4.2 on `macos-15`, and Ubuntu 22.04's apt ships 3.22.1 (as of 2026-09-26).
```
Replace with:
```
Image defaults differ by OS on the same day: 3.31.6 on `ubuntu-24.04` and `windows-2025`, 4.5 on `macos-15` and on `ubuntu-latest`, which moved to Ubuntu 26.04 between 2026-10-19 and 2026-11-19, and Ubuntu 22.04's apt ships 3.22.1 (as of 2026-11-27).
```

24. File: `skills/cmake-build-reference/versions-and-policies.md`
Find (verbatim):
```
and CMP0177 (`install` DESTINATION normalisation, 3.31). Floor: 77 policies arrived after 3.25, as of 4.4.2.
```
Replace with:
```
CMP0177 (`install` DESTINATION normalisation, 3.31), CMP0220 (a language enabled in a subdirectory, `block()` or `function()` propagates to its ancestors, 4.5), CMP0221 (`cmake_host_system_information(DISTRIB_*)` reads the host's os-release, never the sysroot's, 4.5) and CMP0225 (the default `ExternalProject_Add` configure passes `CMAKE_INSTALL_PREFIX=<INSTALL_DIR>`, 4.5). Floor: 77 policies arrived after 3.25 as of 4.4.2, and 84 as of 4.5.1.
```

25. File: `skills/cmake-build-reference/versions-and-policies.md`
Find (verbatim):
```
so these six are the ones that change a build quietly.
```
Replace with:
```
so these nine are the ones that change a build quietly. CMP0220 OLD does not warn, and CMP0225 also prepends the install directory to `CMAKE_SYSTEM_PREFIX_PATH`, so it can change what a later `find_*()` call returns (`cmake-policies(7)` at 4.5.1).
```

26. File: `skills/cmake-build-reference/versions-and-policies.md`
Find (verbatim):
```
7. **Citing a 4.5 or `master` feature as current** (presets schema 13,
   `CMD_STRICT`, `PRINT_TARGETS`). Read `cmake --help-manual` on the pinned
   binary (CMK-VER-04).
```
Replace with:
```
7. **Using a 4.5 feature without a `CMAKE_VERSION` guard** (presets schema 13,
   `CMD_STRICT`, `PRINT_TARGETS`, `install(SBOM)`), or citing a `master`
   feature as current. Read `cmake --help-manual` on the pinned binary
   (CMK-VER-04).
```

27. File: `skills/cmake-build-reference/versions-and-policies.md`
Find (verbatim):
```
- D1: on the CMake 4.5 release, re-measure `-Werror=dev`, which the gate
  spellings in this file assume (CMK-CORE-01), and add 4.5's rows to the
  CMK-VER-04 table.
- D7: on every CMake release, re-read `Help/dev/experimental.rst` at the new
  tag, because the CMK-VER-09 UUIDs rotate.
- The count of policies past 3.25 (77 as of 4.4.2, 2026-09-26) grows with each
  minor, so re-list the DECIDE set for CMK-VER-08.
```
Replace with:
```
- D1: on each CMake minor after 4.5, re-measure `-Werror=dev` and
  `-Werror=author`, which the gate spellings in this file assume (CMK-CORE-01,
  CMK-CORE-06), and add that minor's rows to the CMK-VER-04 table. 4.5.1 kept
  both spellings (measured 2026-11-27).
- D7: on every CMake release, re-read `Help/dev/experimental.rst` at the new
  tag, because the CMK-VER-09 UUIDs rotate and gates are removed.
- The count of policies past 3.25 (77 as of 4.4.2, 84 as of 4.5.1) grows with
  each minor, so re-list the DECIDE set for CMK-VER-08.
```

28. File: `skills/cmake-build-reference/presets-and-ci.md`
Find (verbatim):
```
(3.31.6 on hosted `ubuntu-24.04` and `windows-2025` as of 2026-09-26)
```
Replace with:
```
(3.31.6 on hosted `ubuntu-24.04` and `windows-2025` as of 2026-11-27)
```

29. File: `skills/cmake-build-reference/presets-and-ci.md`
Find (verbatim):
```
| 9 | 3.30 | 13 | not released (4.5, as of 2026-09-26) |
```
Replace with:
```
| 9 | 3.30 | 13 | 4.5 |
```

30. File: `skills/cmake-build-reference/presets-and-ci.md`
Find (verbatim):
```
accepting up to 10, 4.3.4 up to 11 and 4.4.2 up to 12 (measured 2026-09-26).
```
Replace with:
```
accepting up to 10, 4.3.4 up to 11 and 4.4.2 up to 12 (measured 2026-09-26), and at v4.5.1, confirmed by 4.4.5 accepting up to 12 and 4.5.1 up to 13 (measured 2026-11-27). Schema 13 adds `strict` and `nonTargetDirective` to `warnings` and `errors`, and the `${configurePresetName}` macro.
```

31. File: `skills/cmake-build-reference/presets-and-ci.md`
Find (verbatim):
```
- D1: the CMake 4.5 release adds schema 13 to the `CMK-CI-01` table and
  re-checks the gate spelling in the probe (CMK-CORE-01).
- The runner image default CMake (3.31.6 on `ubuntu-24.04` and `windows-2025`
  as of 2026-09-26), on each runner-images release, because it sets the
  `CMK-CI-01` ceiling for legs that pin nothing.
```
Replace with:
```
- D1: each CMake minor after 4.5 adds its schema to the `CMK-CI-01` table and
  re-checks the gate spelling in the probe (CMK-CORE-01).
- The runner image default CMake (3.31.6 on `ubuntu-24.04` and `windows-2025`,
  4.5 on `macos-15` and `ubuntu-latest`, as of 2026-11-27), on each
  runner-images release, because it sets the `CMK-CI-01` ceiling for legs that
  pin nothing.
```

32. File: `skills/cmake-build-reference/targets.md`
Find (verbatim):
```
`add_compile_options`, `link_directories` or `link_libraries`. A compile definition
```
Replace with:
```
`add_compile_options`, `link_directories`, `link_libraries` or `add_link_options`. A compile definition
```

33. File: `skills/cmake-build-reference/targets.md`
Find (verbatim):
```
Then run the round trip once with each option that adds such a definition switched on. |
```
Replace with:
```
Then run the round trip once with each option that adds such a definition switched on. On CMake 4.5 or newer the gated configure fails on each of these commands, in fetched subprojects too (`CMK-CORE-06`). |
```

34. File: `skills/cmake-build-reference/targets.md`
Find (verbatim):
```
    -e '^[[:space:]]*link_libraries\(' --
```
Replace with:
```
    -e '^[[:space:]]*link_libraries\(' \
    -e '^[[:space:]]*add_link_options\(' --
```

35. File: `skills/cmake-build-reference/targets.md`
Find (verbatim):
```
# CMK-TGT-18. Empty output = pass. A listed file, with no FILE_SET CXX_MODULES in the project, is a finding.
```
Replace with:
```
# CMK-TGT-18. Empty output = pass. A listed file, with no FILE_SET CXX_MODULES and no `import std` in the project, is a finding.
```

36. File: `skills/cmake-build-reference/targets.md`
Find (verbatim):
```
and the project has no named-module sources, set
```
Replace with:
```
and the project has no named-module sources and no `import std` (`CMK-TGT-19`), set
```

37. File: `skills/cmake-build-reference/targets.md`
Find (verbatim):
```
because a cache entry leaks into FetchContent consumers. |
```
Replace with:
```
because a cache entry leaks into FetchContent consumers. From 4.5, `import std` works in any C++20 source with scanning on, so a target that uses it keeps the scan (4.5 release notes). |
```

38. File: `skills/cmake-build-reference/targets.md`
Find (verbatim):
```
Keep `import std` behind `CMAKE_EXPERIMENTAL_CXX_IMPORT_STD` with the exact binary's UUID (CMK-VER-09), on Ninja only, gated on Clang 18.1.2+, MSVC 14.36+ or GCC 15+. |
```
Replace with:
```
Below CMake 4.5, keep `import std` behind `CMAKE_EXPERIMENTAL_CXX_IMPORT_STD` with the exact binary's UUID (CMK-VER-09) and `CXX_MODULE_STD`. From 4.5 set neither, because `import std` needs only C++20 or later with module scanning on, and never test the removed `CMAKE_CXX_COMPILER_IMPORT_STD`, which reads as false. Either way use Ninja only, gated on Clang 18.1.2+, MSVC 14.36+, or GCC 15+ (GCC 16+ on macOS). |
```

39. File: `skills/cmake-build-reference/targets.md`
Find (verbatim):
```
The gates are `cmake-cxxmodules(7)` at 4.4.2. Kitware's "the experiment is over" covers named modules, not `import std`, and the UUID rotates per CMake release.
```
Replace with:
```
The gates are `cmake-cxxmodules(7)` at 4.4.2 and 4.5.0. Through 4.4, Kitware's "the experiment is over" covers named modules, not `import std`, and the UUID rotates per CMake release. 4.5.0 (2026-11-12) removed the gate, `CXX_MODULE_STD`, `CMAKE_CXX_MODULE_STD` and `CMAKE_CXX_COMPILER_IMPORT_STD`, and its manual notes that Ubuntu before 26.04 ships a broken `libstdc++.modules.json` (read, not built).
```

40. File: `skills/cmake-build-reference/targets.md`
Find (verbatim):
```
A configure printing `CMAKE_EXPERIMENTAL_CXX_IMPORT_STD is set to incorrect value` is a finding. | SHOULD. Floor: 3.28, `import std` experimental through 4.4 |
```
Replace with:
```
A configure printing `CMAKE_EXPERIMENTAL_CXX_IMPORT_STD is set to incorrect value` is a finding. On a 4.5 or newer pin, a hit on the gate, `CXX_MODULE_STD` or `CMAKE_CXX_COMPILER_IMPORT_STD` outside an `if(CMAKE_VERSION VERSION_LESS 4.5)` branch is a finding. | SHOULD. Floor: 3.28, `import std` experimental through 4.4 and ungated from 4.5 |
```

41. File: `skills/cmake-build-reference/targets.md`
Find (verbatim):
```
-e 'CXX_MODULES' -e 'CMAKE_EXPERIMENTAL_CXX_IMPORT_STD' --
```
Replace with:
```
-e 'CXX_MODULES' -e 'CMAKE_EXPERIMENTAL_CXX_IMPORT_STD' -e 'CXX_MODULE_STD' -e 'CMAKE_CXX_COMPILER_IMPORT_STD' --
```

42. File: `skills/cmake-build-reference/targets.md`
Find (verbatim):
```
7. **Citing "the experiment is over" for `import std`, or copying a gate UUID from another CMake version** (`CMK-TGT-19`, CMK-VER-09).
```
Replace with:
```
7. **Citing "the experiment is over" for `import std` on 4.4 or older, copying a gate UUID from another CMake version, or keeping the gate and `CXX_MODULE_STD` on 4.5** (`CMK-TGT-19`, CMK-VER-09).
```

43. File: `skills/cmake-build-reference/targets.md`
Find (verbatim):
```
- Each CMake release: the `CXX_IMPORT_STD` UUID (CMK-VER-09) and whether `import std` leaves experimental (CMK-TGT-19).
```
Replace with:
```
- Each CMake release: the `import std` toolchain list in `cmake-cxxmodules(7)` (CMK-TGT-19), which left experimental at 4.5.0, and the `CXX_IMPORT_STD` UUID for legs below 4.5 (CMK-VER-09).
```

44. File: `skills/cmake-build-reference/install-and-export.md`
Find (verbatim):
```
CPack and SBOM generation carry no rule: no measured failure depends on them (as of 2026-09-26).
```
Replace with:
```
CPack and SBOM generation carry no rule: no measured failure depends on them (as of 2026-11-27), although `install(SBOM)` and `export(SBOM)` lost their experimental gate at CMake 4.5.0.
```

45. File: `skills/cmake-build-reference/install-and-export.md`
Find (verbatim):
```
Fedora 45's `%cmake` macro stopped injecting the five legacy variables (change page updated 2026-03-10).
```
Replace with:
```
Fedora's change accepted for Fedora 45 drops the five legacy variables from the `%cmake` macro (change page updated 2026-03-10), and whether it landed in Fedora 45 is not confirmed as of 2026-11-27.
```

46. File: `skills/cmake-build-reference/install-and-export.md`
Find (verbatim):
```
and exactly what Fedora 45 stopped injecting. CMK-INST-09.
```
Replace with:
```
and exactly what Fedora's `%cmake` is set to stop injecting. CMK-INST-09.
```

47. File: `skills/cmake-build-reference/install-and-export.md`
Find (verbatim):
```
Re-check: (D1) CMake 4.5, whether `-Werror=dev` still maps onto the author gate the scripts default to.
```
Replace with:
```
Re-check: (D1) each CMake minor after 4.5, whether `-Werror=dev` still maps onto the author gate the scripts default to (4.5.1 still maps it, measured 2026-11-27).
```

48. File: `skills/cmake-build-reference/install-and-export.md`
Find (verbatim):
```
none reported upstream as of 2026-09-26.
```
Replace with:
```
none reported upstream as of 2026-11-27, apart from a related open issue on Find-module exports (cmake#28296).
```

49. File: `skills/cmake-build-reference/module-authoring.md`
Find (verbatim):
```
gersemi --check` (gersemi 0.29.1, released
```
Replace with:
```
gersemi --check` (gersemi 0.29.2 or later, released 2026-10-01; measured on 0.29.1, released
```

50. File: `skills/cmake-build-reference/module-authoring.md`
Find (verbatim):
```
Floor: gersemi 0.29.1. | The gersemi gate above.
```
Replace with:
```
Floor: gersemi 0.29.2. | The gersemi gate above.
```

51. File: `skills/cmake-build-reference/module-authoring.md`
Find (verbatim):
```
Re-check: D8, gersemi releases after 0.29.1 (the `--diff` exit code and nested-parse
```
Replace with:
```
Re-check: D8, gersemi releases after 0.29.2 (the `--diff` exit code and nested-parse
```

52. File: `skills/cmake-build-reference/testing.md`
Find (verbatim):
```
- D1: on the first CMake 4.5 release, re-run the `-P` gate measurement behind
  `CMK-TEST-02` and the smoke gate spelling behind `CMK-TEST-09` (both follow
  `CMK-CORE-01`).
```
Replace with:
```
- D1: the `-P` gate measurement behind `CMK-TEST-02` still exits 1 under both
  spellings on 4.5.1 (measured 2026-11-27). On each CMake minor after 4.5, re-run
  it and the smoke gate spelling behind `CMK-TEST-09` (both follow
  `CMK-CORE-01`).
```

53. File: `skills/cmake-build-reference/bazel-seam.md`
Find (verbatim):
```
(3.31.12 by default at rules_foreign_cc 0.16.0)
```
Replace with:
```
(3.31.12 by default at rules_foreign_cc 0.16.0 and 0.17.0)
```

54. File: `skills/cmake-build-reference/bazel-seam.md`
Find (verbatim):
```
2026-09-26). The first command, run in the consuming Bazel workspace, names the
```
Replace with:
```
2026-09-26, and both unchanged at 0.17.0, read 2026-11-27). The first command, run in the consuming Bazel workspace, names the
```

55. File: `skills/cmake-build-reference/bazel-seam.md`
Find (verbatim):
```
unchanged at 2.32.0.
```
Replace with:
```
unchanged through 2.34.0 (2026-10-28).
```

56. File: `skills/cmake-build-reference/bazel-seam.md`
Find (verbatim):
```
at every release after 0.16.0.
```
Replace with:
```
at every release after 0.17.0.
```

## Spillover round

This round decides three items that the cpp-packaging refresh addressed to cmake-build, as checked in `cmake-build/spillover-check.md` (2026-11-27). Two items were confirmed by a primary source, none was left unconfirmed, and all three were already correct in the text the first round produced.

### Verdict

- No edit. Every confirmed fact is already stated correctly in `rules/cmake-build.md` and `skills/cmake-build-reference/`, because the first round of this refresh measured and restamped the same facts on 2026-11-27.
- Rule bump: none. Skill bump: none.

### Changed rules

None.

### New rules

None. The next free IDs are unchanged: CMK-CORE-07 in the rule family, and each skill family continues after its current highest ID.

### Declined

- Item 1, `-Werror=dev` on CMake 4.5 (CMK-CORE-01): already correct. The CMake 4.5 manual (https://cmake.org/cmake/help/v4.5/manual/cmake.1.html) calls `-Wdev` a compatibility synonym of `-Wauthor`, deprecated since 4.4, and does not say what `-Werror=dev` does. The first round measured it on 4.4.5, 4.5.0 and 4.5.1, and the Gate prose, CMK-VER-04's D1 note, testing.md's D1 and install-and-export.md's re-check line already record that 4.5.1 keeps both spellings. The 4.3 split stays stamped on 4.3.4, because 4.3.5 and 4.3.6 are patch releases with no documented flag change.
- Item 2, `macos-15` moving to CMake 4.5.1 and the 4.3.6 and 4.4.5 patches: confirmed by primary sources (the actions/runner-images release feed, tag `macos-15-arm64/20261123.0558` of 2026-11-24, "Updated from 4.5.0 to 4.5.1"; Kitware/CMake tag objects v4.3.6 and v4.4.5, both 2026-10-27), and already correct. The Gate prose says `macos-15` and `ubuntu-latest` ship 4.5, and CMK-VER-03 says the same. The target never claimed 4.4.2 on `macos-15` after the first round. The cited "line 222" is cpp-packaging's own gate stamp, not cmake-build text.
- Item 3, Conan's CPS page requiring CMake 4.4 and CPS leaving experimental: confirmed by primary sources (https://raw.githubusercontent.com/conan-io/docs/develop2/integrations/cps.rst, "It requires CMake>=4.4 for the CMake integration"; https://cmake.org/cmake/help/v4.3/release/4.3.html and the Kitware post of 2026-03-19, https://www.kitware.com/common-package-specification-is-out-the-gate/), and already correct. CMK-INST-13 ("Both gates were retired at 4.3.0", "CPS import is ungated only from 4.3") and CMK-DEP-11 match the CMake side. The optional CMK-DEP-11 clause on Conan's CMake 4.4 floor and experimental status is declined: the Conan seam for CPS belongs to the cpp-packaging pair, and no cmake-build statement is false without it.

### Sources

No change was made, so no change needs a source row. The sources that confirm the unchanged text are named under each declined item above. No first-round change was reported as lacking a source row.

### Edit list (spillover round)

Empty. No file changes in this round.

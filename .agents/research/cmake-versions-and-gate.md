---
title: "Versions, floors and the configure gate — consolidated"
topic: "cmake-versions-and-gate"
model: opus
id_family: "CMK-CORE, CMK-VER"
consolidates:
  - cmake-versions-and-gate/gate-and-language-semantics.md
  - cmake-versions-and-gate/floors-policies-and-era.md
  - cmake-audit/find-ocx-cmake-shape-and-contracts.md
  - cmake-audit/exemplar-cmake-shape.md
  - cmake-audit/exemplar-deps-and-dual-build.md
  - cmake-audit/fleet-inventory-and-bazel-overlap.md
  - cmake-topic-map.md (rows M-A-01..07, M-B-01..11, conflicts 1-4, 16-18)
  - cmake-topic-map/era-recheck-2026-09-26.md
date: 2026-09-26
verified: 2026-09-26
---

# Versions, floors and the configure gate

Every CMake fact below is tagged with the minor it was read or measured on.
The host binaries are **3.31.12, 4.3.4 and 4.4.2** (upstream newest is 4.4.3,
2026-08-25, and 4.3.5, 2026-09-04: [era-recheck], [floors] §Summary). This
consolidation added one measurement batch of its own, marked **[M-n]**. Its
fixtures and a re-run script are in
`cmake-versions-and-gate/scratch/vg-consolidation/` (`run.sh`), and every build
tree was deleted afterwards.

## Verdict

1. **The configure gate is chosen per binary, and it is the lint layer.** On
   CMake ≥4.4 it is `-Werror=author`. On ≤4.3 it is `-Werror=dev`. A single
   invocation shared by legs on both sides of 4.4 uses `-Werror=dev`: 4.4.2
   still honours it, with one stderr notice ([gate] §1). `-Werror=author` on a
   binary below 4.4 is a **silent no-op** (exit 0 on 3.31.12 and 4.3.4,
   [gate] §1). That, not `-Werror=dev`, is the MUST-never. No maintained
   semantic CMake linter exists ([floors] §7), so the gate plus named greps do
   the linting and gersemi does the formatting.
2. **The 4.4 gate is stricter than the 3.x gate.** Beyond author warnings it
   fails on absolute install destinations [M1], and on both lines it fails on
   every unset-policy warning [M4b] and on any **dependency** whose effective
   policy version is below 3.10 [M8]. A gate that passes on the floor leg can
   still fail on the newest leg, so CI runs both (binds: application consuming
   packages, library shipping a package).
3. **The assumed floor stays 3.25, written as a three-dot range.** Debian 12
   ships exactly 3.25.1. Every other surveyed distro and CI image clears it.
   Ubuntu 22.04's apt 3.22.1 sits below every candidate floor, so lowering the
   floor would not rescue it ([floors] §1). Rules are written for
   `cmake_minimum_required(VERSION 3.25...<max>)`, where `<max>` is the newest
   CMake the project's CI runs. Two dots are never a range [M7] ([gate] §4).
   Every newer mechanism carries `(CMake ≥ X.Y)`. A project below the assumed
   floor, such as a 3.19 module, gets the fallback idiom, never "raise your
   floor" (binds: CMake module author).
4. **The CMake-4 break is a dependency problem with two tiers.** An effective
   policy version below 3.5 is a hard error on ≥4.0. An effective policy
   version of 3.5–3.9 is a deprecation that the gate turns into an error on
   3.31 and 4.4 [M8]. Both are fixed by `CMAKE_POLICY_VERSION_MINIMUM` set
   around the one `add_subdirectory` or fetch that needs it, as Kitware's
   manual sanctions (4.4.2 `--help-variable`). The fix does not exist on 3.x
   [M9]. A recipe or port author may set it for the whole port build, because
   the port tool is the "user" the manual names. An application never sets it
   globally.
5. **Experimental gates are version-locked and fail silently.** 4 of 6 UUIDs
   rotated between 4.3.4 and 4.4.2, measured in the binaries themselves [M5].
   The UUIDs on `master` match no release. A stale UUID is silent on 3.31.12,
   and on any binary when CMake never evaluates the gate (the Makefiles
   generator, `LANGUAGES NONE`). With Ninja on 4.3.4 and 4.4.2 it only warns
   "set to incorrect value" (verify wave 2). An activated gate also warns, so
   the configure gate fails it on all three binaries. Copy a UUID only from
   the pinned release, and prove the feature works by building it.
6. **Policy decisions go NEW or get a dated exception.** The gate turns an
   unset policy into an error [M4b] but says nothing about an explicit
   `cmake_policy(SET … OLD)` [M4]. OLD is "deprecated by definition"
   (`cmake-policies(7)`, 4.4.2), so OLD is the silent escape an agent reaches
   for, and a grep has to catch it.
7. **Bazel-wrapped dependencies are written against CMake 3.31.12 and
   ≤4.0.7.** rules_foreign_cc 0.16.0 still defaults to 3.31.12, with a range
   of 3.19.8–4.0.7 ([bzl-seam] headline), so a wrapped project's gate is the
   `-Werror=dev` line and nothing 4.3+ applies. Cite `CMK-BZL` and `BZL-CC-24`
   here, and restate neither.

## The ruleset

Fourteen rules: 9 MUST, 4 SHOULD, 1 CONSIDER. Rows are grouped by the check
that catches them. The **gate canary** is referenced throughout: configure a
three-line scratch project with the leg's exact binary and flags, where exit 1
means the gate is live and exit 0 means it is inert.

```cmake
cmake_minimum_required(VERSION 3.25...4.4)
project(gate_canary LANGUAGES NONE)
message(AUTHOR_WARNING "gate canary")
```

### CMK-CORE — the gate and the checks around it (the `cmake-build` index)

**Caught by the gate canary**

- **CMK-CORE-01 · MUST · CMake any; the spelling splits at 4.4.** Run every CI
  configure leg under the configure gate spelled for the binary that leg runs:
  `-Werror=author` on CMake ≥4.4, `-Werror=dev` on ≤4.3, and `-Werror=dev`
  when one command line serves legs on both sides. Never pass `-Werror=author`
  to a CMake older than 4.4. Harness inner configures are `CMK-MOD`'s row
  (module-testing rule 2) and are not restated here.
  *Rationale:* `-Werror=author` is silently ignored on 3.31.12 and 4.3.4
  (exit 0). `-Werror=dev` errors on all three binaries, and on 4.4.2 it maps
  onto `author` and prints `The error=dev option is deprecated` ([gate] §1).
  `-Werror=author` also promotes the `deprecated`, `experimental`, `policy` and
  `install-absolute-destination` children [M1] ([gate] §2).
  *Verify:* the gate canary on each leg's exact binary and flags: exit 0 is
  the finding. Then run
  `grep -rn -e 'Werror=author' -e 'Werror=dev' .github/workflows`. Empty
  output means no gate exists (finding). A `Werror=author` hit on a leg that
  can resolve CMake below 4.4, such as a runner default of 3.31.6
  ([floors] §1), is a finding.
- **CMK-CORE-02 · MUST · presets schema 12 = CMake 4.4.** When a
  `CMakePresets.json` raises `"version"` to 12, rename `warnings.dev` and
  `errors.dev` to `author` in the same edit. For one presets file that must
  gate 3.31 through 4.4, stay at schema ≤10 with `"errors": {"dev": true}`.
  *Rationale:* 4.4.2 rejects `dev` under schema 12 ("File version must be 11
  or lower for warnings.dev support"). 3.31.12 accepts schema ≤10 and 4.3.4
  accepts ≤11 ([gate] §3). Schema 10 with `errors.dev` gates on all three
  binaries with no deprecation notice [M6].
  *Verify:*
  `find . -name CMakePresets.json -not -path '*/_deps/*' -print0 | xargs -0 -r -n1 jq -e '.version >= 12 and ([.configurePresets[]? | (.warnings // {}), (.errors // {}) | has("dev")] | any)'`.
  `true` is the finding. `false` or no output passes.
  The schema-ceiling rule for the floor binary is `CMK-CI` (map M-J-01), which
  cites these ceilings.

**Caught by reading the pinned binary's diagnostics manual**

- **CMK-CORE-03 · CONSIDER · any CMake; the spelling splits at 4.4.** If the
  project wants uninitialized-variable checking, spell it per binary, as the
  gate is: `-Werror=uninitialized` on ≥4.4, and `--warn-uninitialized` plus
  `-Werror=dev` on ≤4.3. No single spelling covers both sides. Neither
  `-Werror=author` nor `-Werror=dev` reaches `CMD_UNINITIALIZED` or
  `CMD_UNUSED_CLI` on 4.4.
  *Rationale:* both categories have no parent and default to ignore
  (`cmake --help-manual cmake-diagnostics`, 4.4.2, [gate] §2).
  `-Werror=uninitialized` is silently ignored on 3.31.12 and 4.3.4 (exit 0,
  no diagnostic). On 4.4.2, `--warn-uninitialized` is deprecated and only
  warns, even with `-Werror=author` or `-Werror=dev` (exit 0). On ≤4.3,
  `--warn-uninitialized -Werror=dev` exits 1 (verify wave 2). Checking was
  quiet on CMake's own common modules: 0 diagnostics from `GNUInstallDirs`,
  `CMakePackageConfigHelpers` and `CheckCSourceCompiles` [M2]. The check is
  unmeasured on real trees, it also fires inside fetched subprojects, and 0 of
  46 exemplars run it ([shape] §11), so it stays CONSIDER.
  *Verify:* `grep -rn -e 'Werror=uninitialized' -e 'warn-uninitialized' .github/workflows`.
  Empty output means "not adopted", which is not a finding at this severity.
  A `Werror=uninitialized` hit on a leg below 4.4, or a `warn-uninitialized`
  hit on a 4.4 leg, is inert (finding).

**Caught by a grep over CI and tool configuration**

- **CMK-CORE-04 · SHOULD · gersemi 0.29.1 (2026-09-14).** Use `gersemi --check`
  as the only CMake formatting gate. Never add cmake-format or cmake-lint. Treat
  an existing `.cmake-format*` config or `cmake-format -i` job as something to
  migrate, never to extend. Never write "the linter catches this": name the
  gate category or the grep instead.
  *Rationale:* cmake-format and cmake-lint last released 0.6.13 on 2020-08-19,
  and no maintained semantic linter exists (`marzer/check-cmake` last pushed
  2025-08-07) ([floors] §7). Three exemplars still run the dead tool in CI
  ([mod-test] §7). Adoption is 0 of 46, so this is SHOULD (owner default Q6).
  The `--definitions` and `# gersemi: hints` mechanics belong to `CMK-MOD`
  ([mod-test] §6).
  *Verify:*
  `grep -rn --include='*.yml' --include='*.yaml' --include='*.txt' --include='*.toml' -e 'cmake-format' -e 'cmake_format' -e 'cmake-lint' -e 'cmakelang' .`
  and `find . -name '.cmake-format*' -not -path './.git/*'`. Empty output
  passes, and any hit means migrate.
- **CMK-CORE-05 · MUST · shell-level, any CMake.** In any verification script
  over a CMake tree, never pipe a match stream into an early-exiting reader
  (`grep -q`, `head`) under `set -o pipefail`. Use one `grep -rq` or `rg -q`
  with no pipe. Set the tree scope deliberately: own-code checks exclude build
  trees and `_deps/`, while dependency-floor scans (CMK-VER-05) must include
  them.
  *Rationale:* measured false negatives. This program's first exemplar table
  lost 5 cells and a whole repo row this way ([shape] M4), and the same
  pipeline reports "not found" with rc=141 on llvm-project, where the pattern
  is everywhere ([mod-test] §8).
  *Verify:*
  `grep -rnE -e '[|] *grep( +-[a-zA-Z]+)* +-[a-zA-Z]*[qm]' -e '[|] *rg( +-[a-zA-Z]+)* +-[a-zA-Z]*[qm]' -e '[|] *head' scripts .github`.
  Empty output passes. A hit in a file that also sets `pipefail` is the
  finding. The pattern catches separated flags (`grep -E -q`), `rg -q` and
  `grep -m1`, which the first version missed (verify wave 2).

### CMK-VER — versions, floors, policies and experimental gates (`versions-and-policies.md`)

**Caught by a grep over `cmake_minimum_required`**

- **CMK-VER-01 · MUST · range syntax CMake ≥3.12.** Write a version range with
  exactly three literal dots: `cmake_minimum_required(VERSION <min>...<max>)`.
  *Rationale:* `3.15..4.3` is one literal and collapses to `VERSION 3.15`:
  CMP0126 and CMP0140 stay unset on 3.31.12, 4.3.4 and 4.4.2, with no
  diagnostic even under the gate ([gate] §4). The manual says "the `...` is
  literal" (4.4.2).
  *Verify:*
  `grep -rnE --include='CMakeLists.txt' --include='*.cmake' -e 'VERSION[[:space:]]+[0-9]+(\.[0-9]+)*\.\.[0-9]' .`.
  Any hit is the finding and empty output passes. This regex was validated
  against both forms [M7]. The dive's own regex also matched the three-dot
  form and must not ship.
- **CMK-VER-02 · SHOULD · CMake ≥3.12.** Declare the floor as
  `<min>...<max>`, where `<max>` is the newest CMake the project's CI runs,
  never simply the newest release.
  *Rationale:* a bare floor leaves every post-floor policy **unset** on newer
  binaries. The range sets them NEW up to the lower of `<max>` and the
  running version: bare `3.25` gives empty CMP0143 through CMP0219 on 4.4.2,
  and `3.25...4.4` gives NEW for all of them [M3]. The manual reads `<max>`
  as "has been updated to work with policies introduced by `<max>`", which is
  a claim of testing. The rule itself is argued, so it is SHOULD.
  *Verify:*
  `grep -rnE --include='CMakeLists.txt' --exclude-dir=_deps --exclude-dir='build*' -e 'cmake_minimum_required\([[:space:]]*VERSION[[:space:]]+[0-9]+(\.[0-9]+)*[[:space:]]*(FATAL_ERROR)?[[:space:]]*\)' .`.
  A hit on the root list is the finding and empty output passes. The
  excludes keep fetched dependencies out of this own-code check (CMK-CORE-05). Then read
  `<max>` against the newest CI leg: a `<max>` above it is the finding.

**Caught by reading the CI matrix**

- **CMK-VER-03 · SHOULD · any.** Install a pinned CMake explicitly on every CI
  leg. Include one leg at the declared floor and one at `<max>`. Never rely
  on the runner image or the distro package.
  *Rationale:* image defaults differ by OS on the same day: 3.31.6 on
  `ubuntu-24.04` and `windows-2025`, 4.4.2 on `macos-15`. Ubuntu 22.04's apt
  ships 3.22.1 ([floors] §1). A floor that no leg runs is a claim, not a
  contract ([prac] §9, argued; [ocx] §10, measured).
  *Verify:*
  `grep -rn -e 'get-cmake' -e 'setup-cmake' -e 'cmake==' .github/workflows`.
  Empty output means the build relies on the runner default (finding). A bare
  `pip install cmake` pins nothing, and the pattern for it also matched
  `pip install cmake-format`, so it was dropped (verify wave 2).
  Otherwise read the matrix for a leg whose version equals the declared
  `<min>`: none is the finding.

**Caught by the pinned binary's `--help-*` output**

- **CMK-VER-04 · MUST · per the table below.** Before using a command,
  keyword, variable, generator or preset field, check its `versionadded`
  against the declared floor on the **pinned** binary (`cmake --help-command`,
  `--help-variable`, `--help-policy`, `--help-manual`) or at the matching Git
  **tag**, never on `master` or the "latest" docs. If it is newer than the
  floor, guard it with `if(CMAKE_VERSION VERSION_GREATER_EQUAL X.Y)` and the
  fallback idiom. Guard a policy with `if(POLICY CMPxxxx)`.
  *Rationale:* these are hard command floors with no OLD/NEW fallback
  ([floors] rule 10). Features that exist only on `master`/4.5 do not exist on
  4.4.3: presets schema 13, `CMD_STRICT`, `CMD_NON_TARGET_DIRECTIVE` and
  `cmake_language(PRINT_TARGETS)` ([map] H2, conflict 3). The
  `if(POLICY …)` guard is used by 20 of 43 repos ([shape] §1).
  *Verify:*
  `grep -rn --include='CMakeLists.txt' --include='*.cmake' -e 'block(' -e 'return(PROPAGATE' -e 'FIND_PACKAGE_ARGS' -e 'OVERRIDE_FIND_PACKAGE' -e 'SET_DEPENDENCY_PROVIDER' -e 'PROJECT_IS_TOP_LEVEL' -e 'FILE_SET' -e 'CXX_MODULES' -e 'PACKAGE_INFO' .`.
  A hit whose feature floor, from the table, is above the declared `<min>`
  and outside a version guard is the finding. Empty output passes. For
  generators, run
  `grep -rn --include='CMakePresets.json' --include='*.yml' -e 'Visual Studio 9' -e 'Visual Studio 10' -e 'Visual Studio 11' -e 'Visual Studio 12' -e 'Visual Studio 18' -e 'FASTBuild' .`
  and settle each hit with `cmake --help` on that leg's binary.

  | Feature | versionadded (4.4.2 source) |
  |---|---|
  | `string(JSON)` | 3.19 |
  | `PROJECT_IS_TOP_LEVEL` | 3.21 (below it, use the `CMAKE_SOURCE_DIR STREQUAL` shim) |
  | `target_sources(FILE_SET)` | 3.23 |
  | providers, `FIND_PACKAGE_ARGS`, `OVERRIDE_FIND_PACKAGE`, `CMAKE_COMPILE_WARNING_AS_ERROR` | 3.24 |
  | `block()`, `return(PROPAGATE)`, FetchContent `SYSTEM`, presets schema 6 | 3.25 |
  | `FILE_SET TYPE CXX_MODULES` | 3.28 |
  | `CMAKE_POLICY_VERSION_MINIMUM` | 4.0 (unknown to 3.31.12 [M9]) |
  | `Visual Studio 18 2026`, `FASTBuild` generators | 4.2 |
  | `install(PACKAGE_INFO)`, ungated | 4.3 |
  | `-Werror=author`, `block(SCOPE_FOR DIAGNOSTICS)`, presets schema 12 | 4.4 |
  | removed: VS 10 2010 at 3.25, VS 11 2012 at 3.28, VS 9 2008 at 3.30, VS 12 2013 at 3.31 | — |

**Caught by a grep over fetched and vendored trees**

- **CMK-VER-05 · MUST · CMake ≥4.0 (hard error) and ≥3.31 (gate error).**
  Before a CMake bump, and whenever a dependency is added or re-pinned, scan
  the fetched and vendored trees (`_deps/`, `third_party/`, `contrib/`,
  vendored subdirectories) for effective policy versions below 3.10.
  *Rationale:* below 3.5 is "Compatibility with CMake < 3.5 has been removed"
  on 4.3.4 and 4.4.2 ([gate] §4, [seam] §5). From 3.5 through 3.9, the
  dependency's deprecation warning becomes a gate error in *your* build on
  3.31.12 and 4.4.2 [M8]. A range whose `<max>` is ≥3.10 escapes both
  tiers [M8]. 0 of 33 exemplar root floors are below 3.5, while 113 live lines
  below 3.5 sit in recipe, port and example trees: conan-center-index 54
  files, vcpkg ports 26, rules_foreign_cc examples 16 ([shape] §1, [M10]).
  *Verify:*
  `grep -rniE --include='CMakeLists.txt' --include='*.cmake' -e 'cmake_minimum_required\([[:space:]]*VERSION[[:space:]]+(2\.|3\.[0-9]([^0-9]|$))' -e 'cmake_policy\([[:space:]]*VERSION[[:space:]]+(2\.|3\.[0-9]([^0-9]|$))' build/_deps third_party`
  (substitute the tree's fetch and vendor directories). Empty output passes.
  A hit that is a live line, not a comment, and has no `...<max>` of 3.10 or
  above is the finding. The `cmake_policy(VERSION)` alternative is needed
  because a dependency with a 3.10 floor and `cmake_policy(VERSION 3.5)` fails
  the gate on 3.31.12 and 4.4.2 all the same (verify wave 2).
- **CMK-VER-06 · MUST · CMake ≥4.0.** Fix a stale dependency floor by setting
  `CMAKE_POLICY_VERSION_MINIMUM` immediately before the one
  `add_subdirectory` or `FetchContent_MakeAvailable` that needs it (3.10
  clears both tiers), and restore it right after. Never use it to set the
  project's own policy version. Never put it in a committed preset's
  `cacheVariables` or in a CI environment of an application build. On 3.x,
  patch or re-pin the dependency instead.
  *Rationale:* the manual (4.4.2) says projects "may set this variable before
  a call to `add_subdirectory()` that adds a third-party project" and "should
  not" use it for their own version. The scoped form does not leak into a
  second dependency ([seam] §5; [M9]). The `-D` and environment forms mask
  the whole tree, and the environment form persists in the cache after the
  variable is unset ([seam] §5). 3.31.12 has no such variable, and
  `CMAKE_WARN_DEPRECATED OFF` does not survive `-Werror=dev` [M9]. A port tool
  (vcpkg `scripts/ports.cmake:7`) is the "user" the manual names, so
  whole-port scope is legitimate there.
  *Verify:*
  `grep -rn --include='CMakeLists.txt' --include='*.cmake' --include='CMakePresets.json' --include='*.yml' -e 'CMAKE_POLICY_VERSION_MINIMUM' .`.
  Empty output passes. The findings are a hit inside `cacheVariables` or a
  workflow `env`, or a listfile hit not paired with a save and restore around
  exactly one dependency add.

**Caught by a grep over `cmake_policy` (the gate is blind here)**

- **CMK-VER-07 · MUST · any; removals at 3.27, 3.30 and 4.1.** Resolve a gate
  error of the form "Policy CMPxxxx is not set" by adopting NEW: migrate the
  code, then raise `<max>` or `cmake_policy(SET CMPxxxx NEW)`. Never resolve
  it with `SET … OLD`. A temporary OLD sits behind `if(POLICY …)` with a
  comment giving the reason and the exit condition. The removed Find modules
  (CMP0167 `FindBoost`, CMP0146 `FindCUDA`, CMP0148 `FindPythonInterp`/`FindPythonLibs`,
  CMP0188 `FindGCCXML`, CMP0191 `FindCABLE`) are migrated to their
  replacements. The replacement details belong to `CMK-DEP` (M-G-16).
  *Rationale:* an unset policy is a gate error on 3.31.12 and 4.4.2 [M4b], but
  an explicit OLD passes the gate silently on both [M4]. The OLD behaviour is
  "deprecated by definition and may be removed" (`cmake-policies(7)`, 4.4.2).
  *Verify:*
  `grep -rnE --include='CMakeLists.txt' --include='*.cmake' -e 'cmake_policy\([[:space:]]*SET[[:space:]]+CMP[0-9]+[[:space:]]+OLD' .`.
  Empty output passes. A hit without an adjacent reason-and-exit comment is
  the finding.

**Caught by reading the change that moves a version**

- **CMK-VER-08 · SHOULD · 77 policies introduced after 3.25, as of 4.4.2.**
  Treat raising `<max>` or the floor as a behaviour change. List the policies
  that the new version adds (`cmake --help-policies` on the new binary) and
  review the DECIDE set before merging: CMP0155 (C++ ≥20 sources scanned for
  modules, 3.28), CMP0168–CMP0170 (FetchContent steps, `FetchContent_Populate`,
  `FULLY_DISCONNECTED`, 3.30), CMP0176 (`execute_process` UTF-8, 3.31) and
  CMP0177 (`install` DESTINATION normalisation, 3.31).
  *Rationale:* the range's upper bound flips every covered policy to NEW with
  no diagnostic [M3]. The KEEP-NEW and DECIDE table is in [floors] §2.
  *Verify:* reading heuristic. A diff that changes a `cmake_minimum_required`
  bound and names none of the DECIDE policies it crosses is the finding.

**Caught by comparing a UUID with the pinned binary**

- **CMK-VER-09 · MUST · the gate UUID can change at any minor.** Copy a
  `CMAKE_EXPERIMENTAL_*` UUID only from `Help/dev/experimental.rst` at the tag
  of the pinned binary. Re-check it on every CMake bump, and prove activation
  by building something that uses the feature, never by a configure exit code.
  Delete gates retired at 4.3.0 (`EXPORT_PACKAGE_INFO`, `FIND_CPS_PACKAGES`)
  on any ≥4.3 floor. `install(PACKAGE_INFO)` needs no gate on 4.3 and later.
  Only `CMAKE_INSTALL_EXPORTS_AS_PACKAGE_INFO` still needs
  `MAPPED_PACKAGE_INFO`. An activated gate emits an `experimental` warning,
  which the configure gate turns into an error. On ≥4.4, exempt it on that
  leg with `-Wno-error=experimental`. On ≤4.3 no child category exists, so
  build the feature on a leg of its own.
  *Rationale:* the binaries themselves show `CXX_IMPORT_STD` as `d0edc3af…`
  on 3.31.12 (unchanged through 4.2.0), `451f2fe2…` on 4.3.4 and
  `f35a9ac6…` on 4.4.2. `EXPORT_BUILD_DATABASE`, `GENERATE_SBOM` and `RUST`
  also rotated. Only
  `EXPORT_PACKAGE_DEPENDENCIES` (`1942b4fa…`, present since 3.31.12) and
  `MAPPED_PACKAGE_INFO` (`ababa1b5…`) held. `master`'s `25d6f6aa…` and
  `248471c2…` appear in no binary [M5]. A stale `CXX_IMPORT_STD` UUID
  configures with exit 0 and no diagnostic on 3.31.12 (Ninja), and on
  4.4.2 under the Makefiles generator ([floors] §4). With Ninja, 4.3.4 and
  4.4.2 warn "is set to incorrect value", and that warning also falls under
  `experimental`. A correct UUID fails `-Werror=dev` on 3.31.12 and 4.3.4 and
  `-Werror=author` on 4.4.2 (verify wave 2).
  *Verify:*
  `grep -rn --include='CMakeLists.txt' --include='*.cmake' --include='CMakePresets.json' -e 'CMAKE_EXPERIMENTAL_' .`.
  Empty output passes. For each hit, set `UUID=` to the literal and run
  `strings -n 6 "$CMAKE_BIN" | grep -c -e "$UUID"` against the pinned binary.
  A result of `0` means a stale gate (finding). The check was exercised
  against 4.4.2: `451f2fe2…` gives 0 and `f35a9ac6…` gives 1.

### Measured results handed to other families (not CMK-CORE or CMK-VER rules)

The gate dive measured these, and their owners cite them rather than
re-measure: `CACHE INTERNAL` implies FORCE, which refutes find_ocx's headline
defect (M-C-01/02, `CMK-LANG`; [gate] §5-6). CMP0126 NEW shadows a cache
write (`CMK-LANG`; [gate] §5). The unquoted `${ARGN}` form of
`cmake_parse_arguments` drops empty values and splits on `;`, where
`PARSE_ARGV` does neither (M-C-06, `CMK-LANG`; [gate] §9). A function captures
policy at its **definition**, so code defined after `cmake_policy(POP)` follows
the includer (M-D-01, `CMK-MOD`; [gate] §7). `return(PROPAGATE)` inside a bare
top-level `block()` warns and skips the rest of the file (M-C-05, `CMK-LANG`;
[gate] §8). `file(DOWNLOAD)` without `STATUS` fails silently with exit 0
(M-D-05, `CMK-MOD`; [gate] §10). `include_guard(GLOBAL)` never deduplicates
two vendored copies (M-D-02, `CMK-MOD`; [gate] §10). The seam consolidation
should cite **CMK-VER-06** for `CMAKE_POLICY_VERSION_MINIMUM` instead of
shipping its own rule 10.

## Applied to find_ocx and the exemplars

**Satisfied**

- find_ocx CMK-CORE-01 on its CI legs: `.github/workflows/ci.yml:85,101,104,108`
  and `tests/helpers.cmake:44,57` pass `-Werror=dev`. That is the correct
  single spelling for a 3.31 plus 4.x matrix, because `-Werror=author` would
  have made the 3.31 leg inert.
- find_ocx CMK-VER-04: a hard `FATAL_ERROR` below 3.19 (`ocx.cmake:167-171`).
  A grep for 15 commands and keywords newer than 3.19 (`cmake_path`,
  `PROJECT_IS_TOP_LEVEL`, `block(`, `PROPAGATE`, `COPY_FILE`, `PATH_EQUAL` and
  others) finds 0 hits on the dirty working tree (2026-09-26). CMK-VER-07,
  CMK-VER-09 and CMK-CORE-04 are vacuously clean: no OLD, no experimental
  gate, no dead formatter.
- `apache__arrow@3ad410b7b1:cpp/cmake_modules/FindRapidJSONAlt.cmake:29-32`
  satisfies CMK-VER-06: save, set to 3.5 and restore around one dependency.
  The pattern was measured not to leak ([seam] §5).
- `microsoft__vcpkg@c4ee5a52d7:scripts/ports.cmake:7` (`set(ENV{CMAKE_POLICY_VERSION_MINIMUM} 3.5)`)
  is the sanctioned whole-port form for a port tool (CMK-VER-06).
- `nlohmann__json@f422b753cc:tests/module_cpp20/CMakeLists.txt:8` satisfies
  CMK-VER-09. The UUID is the 4.3.4 value, pinned to its CI's 4.3.x, and the
  module test builds the feature. Its comment "fails loudly otherwise"
  overstates it. On 4.3.4 and 4.4.2 with Ninja a stale UUID only warns and
  exits 0, and 3.31.12 or the Makefiles generator stays silent (verify
  wave 2).
- `protocolbuffers__protobuf@c64743979d:CMakeLists.txt:5-8` sets CMP0141 OLD
  behind `if(POLICY)` with a reason, so it half-satisfies CMK-VER-07: there is
  no exit condition.

**Violated**

- `jbeder__yaml-cpp@1e0876c671:CMakeLists.txt:1` `VERSION 3.15..4.3` violates
  CMK-VER-01, and the effective floor is measured as 3.15 ([gate] §4).
- `Kitware__CMake@e8befb989b:Utilities/KWIML/CMakeLists.txt:7`
  `VERSION 3.13..4.0 FATAL_ERROR` violates CMK-VER-01 in CMake's own tree, on
  KWIML's standalone branch [M7].
- `cpp-best-practices__cmake_template@b86318abbf:CMakeLists.txt:4`
  `cmake_policy(SET CMP0155 OLD)` violates CMK-VER-07: the only reason given
  is "at the moment", there is no guard and no exit, and the template
  propagates it into every generated project.
- find_ocx `CMakeLists.txt:8` has a bare `VERSION 3.19` (CMK-VER-02), and
  `examples/find_package/CMakeLists.txt:13` has a bare `3.15`.
- find_ocx `CMakeLists.txt:22-24`: the 3.19 floor leg is commented out, so
  the declared floor never runs (CMK-VER-03). `Findocx.cmake:36` claims 3.15,
  which no test exercises either ([ocx] §3, §10).
- find_ocx `tests/reconfigure_check.cmake:16-18` runs an inner configure
  without the gate, which is `CMK-MOD`'s row ([mod-test] rule 2). Five of 10
  families skip the gate ([ocx] §10).
- The gate is absent in 45 of 46 exemplars' CI (`-Werror=dev` in CI 1 of 46,
  and that one is find_ocx; [shape] headline 7), which violates CMK-CORE-01.
- 35 of 46 exemplars take the runner-default CMake ([deps] §9), which violates
  CMK-VER-03.
- `fmtlib__fmt@522e2c12ab:.github/workflows/lint.yml:33-44`,
  `TheLartians__ModernCppStarter@72b8957f9e:.github/workflows/style.yml:29` and
  `cpm-cmake__CPMLicenses.cmake@ca42334d56:.github/workflows/style.yml:20` run
  the dead formatter in CI (CMK-CORE-04, migrate; [mod-test] §7).

**New commitments** (no exemplar does them yet): the gate canary; the 4.4 leg
as the strict leg (CMK-CORE-01 with [M1] and [M8]); scanning `_deps` for the
3.5–3.9 tier (CMK-VER-05); the DECIDE-list review on a version bump
(CMK-VER-08); and binary-level UUID verification (CMK-VER-09).

## AI-agent failure modes

Ranked by how often each bites, most frequent first.

1. **Writing an old floor from training data** (`VERSION 3.5`, `3.8`, `2.8.12`),
   or pulling in a dependency that has one. On 3.31 and newer that is a gate
   error, and below 3.5 it is a hard error on 4.x. *Check:* the CMK-VER-05
   regex over own and fetched trees.
2. **A single `-Werror=author` on a runner whose CMake is 3.31.6**, which is
   inert. *Check:* the gate canary on the leg (CMK-CORE-01).
3. **Assuming a bare floor gives NEW behaviour up to the running CMake**, a
   claim [floors] makes in its AI-angle, refuted by [M3]. *Check:*
   `cmake_policy(GET CMP0180 v)` after `project()` in a scratch copy: empty
   means unset.
4. **"Fixing" CMake-4 breakage with a global `-DCMAKE_POLICY_VERSION_MINIMUM=3.5`**
   in a preset or CI environment. *Check:* the CMK-VER-06 grep.
5. **Silencing a policy gate error with `SET … OLD`**, which the gate never
   reports [M4]. *Check:* the CMK-VER-07 grep.
6. **Recommending `cmake-lint`/`cmake-format` as a live linter.** *Check:*
   `pip index versions cmake-format` shows 0.6.13 as the last release, from
   2020 (CMK-CORE-04).
7. **Copying an experimental UUID from cmake.org or `master`.** *Check:*
   `strings` against the pinned binary (CMK-VER-09).
8. **Two-dot ranges copied from real repositories** (yaml-cpp, KWIML).
   *Check:* the CMK-VER-01 regex.
9. **Bumping presets to schema 12 while keeping `dev`**, or using schema 12
   on a 3.31 or 4.3 leg. *Check:* the CMK-CORE-02 jq filter, plus the
   CMK-CI ceiling row.
10. **Citing a 4.5 or `master` feature as current** (presets 13, `CMD_STRICT`,
    `PRINT_TARGETS`). *Check:* `cmake --help-manual` on the pinned binary
    (CMK-VER-04).

**Silent passes the index must name** (M-A-07): a green configure while
`uninitialized` defaults to ignore (CORE-03); `-Werror=uninitialized` below
4.4 (CORE-03); a stale experimental UUID on 3.31 or under Makefiles, which
only warns elsewhere (VER-09); an explicit policy OLD (VER-07); `-Werror=author` on a binary below
4.4 (CORE-01); and a two-dot range (VER-01).

## Open questions

- **Owner:** should CMK-CORE-03 (`-Werror=uninitialized` on 4.4) rise to
  SHOULD? Research cannot decide it without a noise count on a real tree,
  and the default is CONSIDER.
- **Owner:** the find_ocx handoff note (map question 2) gains two items:
  its root and example `cmake_minimum_required` lines are bare (CMK-VER-02),
  and its 3.19 leg is disabled.
- **Another round, `versions-and-gate`:** how noisy is
  `-Werror=uninitialized`/`--warn-uninitialized` on 3–5 real exemplar
  configures that include fetched dependencies? This needs sources that the
  sparse corpus lacks, so a full clone of fmt, spdlog and curl.
- **Another round, `versions-and-gate`:** does `-Werror=dev` get removed or
  change meaning in 4.5? Re-measure when 4.5.0 ships, because CMK-CORE-01's
  mixed-matrix spelling depends on it.
- **Another round, `dependency-seam` (wave-3 revision):** on 3.x there is no
  in-code scoped fix for a 3.5–3.9 dependency under the gate [M9]. Is a
  FetchContent `PATCH_COMMAND` that rewrites the floor, or
  `-Wno-error=deprecated` on the 3.x leg only, the lesser evil? Each needs a
  measured recommendation.

## Sub-artifacts

- [cmake-versions-and-gate/gate-and-language-semantics.md](cmake-versions-and-gate/gate-and-language-semantics.md):
  the gate spelling, diagnostic categories, presets rejection, two-dot floors,
  cache, memo refutation, policy capture, returns, argument parsing, downloads
  and include guards, measured on 3.31.12, 4.3.4 and 4.4.2.
- [cmake-versions-and-gate/floors-policies-and-era.md](cmake-versions-and-gate/floors-policies-and-era.md):
  the distro and CI floor survey, the 77 post-3.25 policies, removed Find
  modules and generators, the experimental-gate UUID table, the
  `versionadded` table, the no-linter verdict and the corpus floor re-scan.

## Key sources

1. [M1–M10] this consolidation's measurements,
   `cmake-versions-and-gate/scratch/vg-consolidation/run.sh` (3.31.12, 4.3.4
   and 4.4.2, 2026-09-26).
2. [gate] §1–§4 measurement tables: the gate spelling, presets rejection and
   the two-dot floor.
3. [floors] §4: the experimental-gate UUIDs at three tags, plus the
   stale-UUID silent configure.
4. `cmake --help-manual cmake-diagnostics` (4.4.2): seven categories with
   their parents and defaults.
5. `cmake --help-variable CMAKE_POLICY_VERSION_MINIMUM` (4.4.2):
   `versionadded:: 4.0`, and the "Projects may set … before `add_subdirectory()`"
   sentence.
6. `cmake --help-manual cmake-policies` (4.4.2): OLD is "deprecated by
   definition".
7. <https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/command/cmake_minimum_required.rst>:
   "the `...` is literal".
8. <https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/manual/cmake-presets.7.rst>:
   schema 12 renames `dev` to `author`.
9. <https://gitlab.kitware.com/cmake/cmake/-/raw/v4.4.2/Help/dev/experimental.rst>
   and the same file at `v4.3.4`: the per-release gate UUIDs.
10. <https://packages.debian.org/bookworm/cmake> (3.25.1) and
    <https://packages.ubuntu.com/jammy/cmake> (3.22.1): the floor decision.
11. <https://raw.githubusercontent.com/actions/runner-images/main/images/macos/macos-15-Readme.md>
    and the Ubuntu 24.04 README: the image-default CMake differs by OS.
12. <https://pypi.org/pypi/cmake-format/json> (0.6.13, 2020-08-19) and
    <https://pypi.org/pypi/gersemi/json> (0.29.1, 2026-09-14).
13. [seam] §5: `CMAKE_POLICY_VERSION_MINIMUM` scope (local, `-D` and
    environment forms), 4.4.2.
14. [bzl-seam] headline: rules_foreign_cc 0.16.0 defaults to CMake 3.31.12,
    with a range of 3.19.8–4.0.7.

## Conflicts resolved

1. **Single `-Werror=dev` line.** [gate] rule 1 says "never a single
   `-Werror=dev` line" and calls it "silently inert on 4.4+". [gate] §1's own
   table shows it errors on 4.4.2. **Decided (measured):** it is the
   portable mixed-matrix spelling. The MUST-never is `-Werror=author` below
   4.4.
2. **Does `-Werror=author` reach `install-absolute-destination`?** The
   [gate] Summary says yes, while its rule 2 and §2 prose say it is
   unparented and never reached. **Decided (measured [M1]):** it is a child
   of `author` and errors at generate time. Only `uninitialized` and
   `unused-cli` sit outside.
3. **What a bare floor does on a newer binary.** [floors] (AI-angle, rule 1)
   says a bare floor gives NEW "up to the running CMake version". **Refuted
   ([M3], [gate] §4):** post-floor policies stay unset. Only a range sets NEW,
   up to the lower of `<max>` and the running version.
4. **Whether two dots make a range.** [floors] rule 1 says "3.19 also supports
   the two-dot range form". **Refuted ([gate] §4, [M7]):** two dots are never
   a range on any tested binary.
5. **Experimental UUID stability.** [era-recheck] reports "same 6 gates, same
   UUIDs", read from `master`, and map row M-B-08 implies stability.
   [floors] §4 says 4 of 6 rotated between tags. **Decided (measured in the
   binaries [M5]):** [floors] is right, and `master` UUIDs are in no release.
   [floors]' "`EXPORT_PACKAGE_DEPENDENCIES` n/a at 3.31.12" is itself wrong:
   the 3.31.12 binary carries `1942b4fa…` (and a `WINDOWS_KERNEL_MODE_DRIVER`
   gate).
6. **When `CMAKE_POLICY_VERSION_MINIMUM` arrived, and who owns it.** [seam]
   rule 10 says the variable "exists from 3.12 as a no-op". **Refuted:** it is
   `versionadded:: 4.0`, and 3.31.12 rejects `--help-variable` for it [M9].
   Ownership follows the map (M-B-05 is a CMK-VER row), so it becomes
   CMK-VER-06 and the seam consolidation cites it.
7. **rules_foreign_cc 0.16.0's CMake.** [era-recheck] says there is "no fixed
   default". [bzl-seam] read `repositories.bzl` and `cmake_versions.bzl` at
   the tag and found 3.31.12, with a range of 3.19.8–4.0.7. **Decided
   (source read beats inference):** the Bazel-wrapped consumer is bound to
   the ≤4.3 gate spelling (Verdict 7).
8. **The floor: 3.25, not 3.24 or 3.28.** The map's provisional 3.25 stands
   on the distro table ([floors] §1). Ubuntu 22.04 is answered by provisioning
   (CMK-VER-03), not by lowering the floor.
9. **The range rule's severity.** [floors] rule 1 marks the range MUST. The
   behaviour is measured, but "use a range" is argued, so it ships as SHOULD
   (CMK-VER-02). The three-dot literal is MUST (CMK-VER-01).
10. **The grep regexes.** [gate] rule 4's regex also matches three-dot ranges,
    and [floors]' bare-floor idea as written matches everything. Both were
    replaced by regexes validated on fixtures [M7].

## Revision log

Ledger: [cmake-versions-and-gate/verification-wave2.md](cmake-versions-and-gate/verification-wave2.md).

- 2026-09-26, verify wave 2: CMK-VER-09 and Verdict 5. "A stale UUID
  produces no diagnostic" was a Makefiles-generator artefact. With Ninja,
  4.3.4 and 4.4.2 warn "is set to incorrect value", while 3.31.12 stays
  silent. Added that an activated gate fails the configure gate on all three
  binaries, with `-Wno-error=experimental` as the exemption on ≥4.4.
- 2026-09-26, verify wave 2: CMK-VER-09's version tag changed from "changes
  per minor" to "can change at any minor", because `CXX_IMPORT_STD` kept
  `d0edc3af…` from 3.31.12 through 4.2.0. `RUST` was added to the list of
  rotated gates.
- 2026-09-26, verify wave 2: CMK-CORE-03 now splits its spelling at 4.4.
  `-Werror=uninitialized` is a silent no-op on 3.31.12 and 4.3.4, and
  `--warn-uninitialized` only warns on 4.4.2 under either gate spelling.
- 2026-09-26, verify wave 2: CMK-CORE-05's verify regex was widened. The old
  one missed `grep -E -q`, `rg -q` and `grep -m1`.
- 2026-09-26, verify wave 2: CMK-VER-02's verify now excludes `_deps` and
  `build*`. It went red on a clean tree because of a fetched dependency's
  bare floor.
- 2026-09-26, verify wave 2: CMK-VER-03's verify dropped `'pip install cmake'`.
  That pattern matched `pip install cmake-format` and hid a missing pin.
- 2026-09-26, verify wave 2: CMK-VER-05's verify gained a
  `cmake_policy(VERSION)` alternative. A dependency declaring 3.10 plus
  `cmake_policy(VERSION 3.5)` fails the gate and was invisible to the scan.
- 2026-09-26, verify wave 2: two citations corrected. protobuf CMP0141 is at
  `CMakeLists.txt:5-8`, not `:7-9`. ModernCppStarter's formatter install is
  at `style.yml:29`, not `:20`. The nlohmann "fails loudly" comment is now
  called overstated rather than wrong.

[gate]: cmake-versions-and-gate/gate-and-language-semantics.md
[floors]: cmake-versions-and-gate/floors-policies-and-era.md
[ocx]: cmake-audit/find-ocx-cmake-shape-and-contracts.md
[shape]: cmake-audit/exemplar-cmake-shape.md
[deps]: cmake-audit/exemplar-deps-and-dual-build.md
[map]: cmake-topic-map.md
[era-recheck]: cmake-topic-map/era-recheck-2026-09-26.md
[prac]: cmake-topic-map/practitioner-and-failure.md
[seam]: cmake-dependency-seam/resolution-order-and-providers.md
[mod-test]: cmake-module-authoring/module-testing-and-formatting.md
[bzl-seam]: cmake-bazel-seam/wrappable-cmake-contract.md

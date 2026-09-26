---
title: "Verification wave 2 — versions, floors and the configure gate"
verifies: cmake-versions-and-gate.md
model: opus
date: 2026-09-26
---

# Verification wave 2: cmake-versions-and-gate

Every CMake claim was re-run on the host's real binaries: CMake 3.31.12,
4.3.4 and 4.4.2, with Ninja and `zig c++` 21.1 for the C++ legs and gcc 15.2
for C. Each configure got a fresh build tree. Normative text was re-fetched
from `gitlab.kitware.com` raw at a tag, and era facts came from PyPI, the
GitHub API and runner-images. Scratch sources, the runner `r.sh` and the
grep harness `checks.sh` are in
`/home/mherwig/.cache/cmake-measure-scratch/verify-versions-and-gate/`. The
brief limits writes to that directory and this file, so no copy was made in
the repository. Build trees were deleted afterwards.

## Ledger

| # | ID or claim | verdict | evidence | note |
|---|---|---|---|---|
| 1 | CMK-CORE-01: `-Werror=author` is a silent no-op below 4.4 | CONFIRMED | Canary: 3.31.12 and 4.3.4 exit 0 and print only `CMake Warning (dev)`. 4.4.2 exits 1 with `CMake Error (author)`. | The MUST-never holds. |
| 2 | CMK-CORE-01: `-Werror=dev` errors on all three and maps to author on 4.4 | CONFIRMED | Canary exit 1 on each binary. 4.4.2 prints `The error=dev option is deprecated.  Use -Werror=author instead.` and then `CMake Error (author)`. | On 4.4.2, `-Werror=dev` also errors on `install-absolute-destination` and `deprecated`. |
| 3 | CMK-CORE-01: author parents `deprecated`, `experimental`, `policy`, `install-absolute-destination` | CONFIRMED | `cmake --help-manual cmake-diagnostics` 4.4.2 lists `:parent: CMD_AUTHOR` for all four. Measured errors: `(deprecated)`, `(install-absolute-destination)`, `(experimental)`. | The unset-policy error is labelled `(author)` under a bare floor. |
| 4 | Verdict 2: the 4.4 gate fails an absolute install DESTINATION and ≤4.3 does not | CONFIRMED | `install(FILES … DESTINATION /opt/x)`: 3.31.12 and 4.3.4 exit 0 under `-Werror=dev`, 4.4.2 exits 1. | The category defaults to `ignore`, so only the gate surfaces it. |
| 5 | M4b: an unset-policy warning is a gate error on both lines | CONFIRMED | CMP0174 unset (bare `3.25`, `cmake_parse_arguments(PARSE_ARGV)` with an empty value): exit 1 on 3.31.12, 4.3.4 and 4.4.2. | 4.3.4 was added. |
| 6 | M8, CMK-VER-05: a dependency floor of 3.5–3.9 fails the gate, and 3.10 or `3.5...3.10` passes | CONFIRMED | Dependency floors 3.5 and 3.9 exit 1 on all three binaries. Floors 3.10 and `3.5...3.10` exit 0. Without a gate 4.4.2 exits 0 with a warning. | Holds on 4.3.4 too. |
| 7 | CMK-VER-05: below 3.5 is a hard error on ≥4.0 | CONFIRMED | 4.3.4 and 4.4.2: `Compatibility with CMake < 3.5 has been removed from CMake.` (exit 1, even without a gate). `Help/release/4.0.rst:193`. 3.31.12 only deprecates. | |
| 8 | CMK-VER-05 header: the <3.10 deprecation starts at 3.31 | CONFIRMED | `Help/release/3.31.rst:202`: "Compatibility with versions of CMake older than 3.10 is now deprecated". | |
| 9 | CMK-CORE-02: schema 12 rejects `dev`, 3.31 accepts ≤10, 4.3 accepts ≤11, schema 10 `errors.dev` gates all three with no notice | CONFIRMED | 4.4.2: `File version must be 11 or lower for warnings.dev support` (and `errors.dev`). 3.31.12: `must be >=1 and <=10`. 4.3.4: `<=11`. Schema 10 exits 1 on all three, and a `deprecat` count on 4.4.2 gives 0. | Schema 11 with `author` is also rejected on 4.4.2. |
| 10 | Presets schema versions: 6 = 3.25, 10 = 3.31, 11 = 4.3, 12 = 4.4 | CONFIRMED | `cmake --help-manual cmake-presets` 4.4.2 has `versionadded` on each. | Schema 12 also changes `${fileDir}` semantics, which does not affect this rule. |
| 11 | CMK-CORE-03: `uninitialized` and `unused-cli` have no parent and default to ignore | CONFIRMED | cmake-diagnostics 4.4.2 shows `:default: ignore` and no `:parent:`. `-Werror=author` and `-Werror=dev` exit 0 on 4.4.2 with an uninitialised dereference. | |
| 12 | CMK-CORE-03: the spelling on the ≥4.4 leg only | CORRECTED | `-Werror=uninitialized` exits 0 silently on 3.31.12 and 4.3.4. `--warn-uninitialized -Werror=dev` exits 1 on 3.31.12 and 4.3.4. On 4.4.2, `--warn-uninitialized` is deprecated and exits 0 under both gate spellings. | The rule now gives the per-binary spelling and names the inert combinations. |
| 13 | M2: CMake's own common modules produce 0 uninitialized diagnostics | CONFIRMED | `GNUInstallDirs`, `CMakePackageConfigHelpers` and `CheckCSourceCompiles` (C, gcc) exit 0 under `-Werror=uninitialized -Werror=author` on 4.4.2. | |
| 14 | CMK-CORE-04: cmake-format 0.6.13 (2020-08-19), gersemi 0.29.1 (2026-09-14), check-cmake last pushed 2025-08-07 | CONFIRMED | PyPI JSON `upload_time` 2020-08-19T17:15:24 and 2026-09-14T17:07:27. GitHub API `pushed_at` 2025-08-07T15:25:39Z. | |
| 15 | CMK-CORE-04: 3 exemplars run the dead formatter in CI, and 0 of 46 run gersemi | CONFIRMED | A grep for cmake-format, cmake_format or cmake-lint over workflow YAML finds fmt, ModernCppStarter and CPMLicenses. A gersemi grep is empty. | The ModernCppStarter line is corrected in row 37. |
| 16 | CMK-CORE-05: `grep … \| grep -q` under pipefail gives a false negative | CONFIRMED | 3000 matching lines piped into `grep -q` gives `not found`, PIPESTATUS `141 0`. A single `grep -rq` finds it. | |
| 17 | CMK-CORE-05 verify regex | CORRECTED | The old regex missed `grep -E -q`, `rg -q` and `grep -m1` (2 of 5 planted). The new regex hits 5 of 5 and nothing in a clean `grep -rq` script. | |
| 18 | CMK-VER-01: a range needs CMake ≥3.12, `...` is literal, and two dots collapse to the floor | CONFIRMED | `cmake_minimum_required` help 4.4.2: `versionadded:: 3.12` and "the `...` is literal". `3.15..4.3` and `3.13..4.0 FATAL_ERROR` leave CMP0126 and CMP0140 empty on all three binaries with exit 0 under the gate. `3.15...4.3` sets them NEW. | |
| 19 | CMK-VER-02 and M3: a bare `3.25` leaves CMP0143–CMP0219 unset, and a range sets NEW up to min(max, running) | CONFIRMED | Bare `3.25` gives CMP0143, 0180, 0200, 0210 and 0219 = `[]` on 4.4.2. `3.25...4.4` makes all of them NEW. `3.15...4.3` on 4.4.2 leaves CMP0219 `[]`. | 3.31.12 accepts a `<max>` above itself. |
| 20 | CMK-VER-02 verify | CORRECTED | Over `.` it also hit `_deps/…/CMakeLists.txt`, which went red on a clean tree. With `--exclude-dir=_deps --exclude-dir='build*'` the planted tree gives 1 hit and the clean tree none. | |
| 21 | CMK-VER-08: 77 policies after 3.25 as of 4.4.2 | CONFIRMED | The 4.4.2 `--help-policy-list` has 77 entries above CMP0142, with CMP0142 = 3.25, CMP0143 = 3.26 and the last CMP0219. | |
| 22 | CMK-VER-08 DECIDE set: versions and summaries | CONFIRMED | `--help-policy` 4.4.2: CMP0155 3.28, CMP0168–0170 3.30, CMP0176 and 0177 3.31, with matching first lines. | |
| 23 | CMK-VER-03: runner defaults 3.31.6 (ubuntu-24.04, windows-2025) and 4.4.2 (macos-15), jammy 3.22.1, bookworm 3.25.1 | CONFIRMED | runner-images READMEs on `main`: `CMake 3.31.6`, `CMake 3.31.6`, `Cmake 4.4.2`. packages.ubuntu.com `3.22.1-1ubuntu1`. packages.debian.org `3.25.1-1`. | |
| 24 | CMK-VER-03 verify | CORRECTED | `'pip install cmake'` matched `pip install cmake-format`, which read as "pinned" on a tree with no CMake pin. The pattern was dropped because `cmake==` covers real pins. | |
| 25 | CMK-VER-04 table: `string(JSON)` 3.19, `PROJECT_IS_TOP_LEVEL` 3.21, `FILE_SET` 3.23, providers, `FIND_PACKAGE_ARGS`, `OVERRIDE_FIND_PACKAGE` and `CMAKE_COMPILE_WARNING_AS_ERROR` 3.24, `block`, `return(PROPAGATE)` and FetchContent `SYSTEM` 3.25, `CXX_MODULES` 3.28, `install(PACKAGE_INFO)` 4.3, `block(SCOPE_FOR DIAGNOSTICS)` and `cmake_diagnostic` 4.4 | CONFIRMED | Every entry is read from `versionadded` in the 4.4.2 `--help-command`, `--help-variable` and `--help-module` output. | |
| 26 | CMK-VER-04: generator removals VS10 3.25, VS11 3.28, VS9 3.30, VS12 3.31, and VS18 plus FASTBuild added in 4.2 | CONFIRMED | `Help/release/{3.25,3.28,3.30,3.31,4.2}.rst` at v4.4.2: "has been removed" and "was added". | |
| 27 | CMK-VER-04: presets 13, `CMD_STRICT`, `CMD_NON_TARGET_DIRECTIVE` and `PRINT_TARGETS` exist only on master | CONFIRMED | At v4.4.3 the counts are 0/0/0/0. On master, fetched 2026-09-26, they are 1/1/1/3. | |
| 28 | CMK-VER-05 verify regex | CORRECTED | A dependency with `cmake_minimum_required(VERSION 3.10)` plus `cmake_policy(VERSION 3.5)` fails the gate: `(deprecated) at dep/CMakeLists.txt:2 (cmake_policy)` on 4.4.2, and a Deprecation Error on 3.31.12. The old regex gave no hit. A `cmake_policy(VERSION)` alternative now catches it. | |
| 29 | CMK-VER-06: `CMAKE_POLICY_VERSION_MINIMUM` has `versionadded 4.0`, is unknown to 3.31.12, and the manual allows setting it before `add_subdirectory` | CONFIRMED | 3.31.12: `is not a defined variable`. The 4.4.2 help quotes "Projects may set this variable before a call to `add_subdirectory()`" and "should not be set by a project … to set its own policy version". `Help/release/4.0.rst:84`. | |
| 30 | CMK-VER-06: the scoped fix clears the gate, does not leak, fails on 3.x, and `CMAKE_WARN_DEPRECATED OFF` does not help | CONFIRMED | Scoped 3.10 exits 0 on 4.4.2 and 4.3.4. A second unscoped dependency still fails. Scoped 3.5 still fails on 4.4.2. 3.31.12 exits 1. The same holds around `FetchContent_MakeAvailable`. `WARN_DEPRECATED OFF` exits 1 on 3.31.12 and 4.4.2. | New: the `FetchContent_MakeAvailable` form was measured. |
| 31 | CMK-VER-06: the environment form lands in the cache | CONFIRMED | The 4.4.2 manual: the environment variable is used "to initialize the cache entry in new build trees". | Normative only, not re-measured. |
| 32 | CMK-VER-07 and M4: an explicit `SET … OLD` passes the gate silently, and OLD is "deprecated by definition" | CONFIRMED | CMP0174 OLD exits 0 with no output on 3.31.12, 4.3.4 and 4.4.2. The phrase recurs throughout `cmake-policies(7)` 4.4.2. | |
| 33 | CMK-VER-07: Find-module removals CMP0146 and CMP0148 at 3.27, CMP0167 at 3.30, CMP0188 and CMP0191 at 4.1 | CONFIRMED | `--help-policy` 4.4.2: "The FindCUDA module is removed" and so on, with those `versionadded` values. | `Help/release/4.1.rst` says "deprecated via policy", but the policy text says "removed", so it is removed under NEW. |
| 34 | CMK-VER-09: UUIDs per binary and the 4-of-6 rotation between 4.3.4 and 4.4.2 | CONFIRMED | `strings` output agrees with `experimental.rst` at v3.31.12, v4.3.0/4 and v4.4.2. `CXX_IMPORT_STD` is d0edc3af, 451f2fe2, f35a9ac6. `EXPORT_PACKAGE_DEPENDENCIES` 1942b4fa and `MAPPED_PACKAGE_INFO` ababa1b5 held. `BUILD_DATABASE`, `SBOM` and `RUST` rotated. Master's 25d6f6aa and 248471c2 are in no binary. | |
| 35 | CMK-VER-09: `EXPORT_PACKAGE_INFO` and `FIND_CPS_PACKAGES` retired at 4.3.0 | CONFIRMED | Both are in `experimental.rst` at v4.2.0 and absent at v4.3.0. `install(PACKAGE_INFO)` has `versionadded:: 4.3`. | |
| 36 | CMK-VER-09 and Verdict 5: a stale UUID gives no diagnostic, and the UUID changes every minor | CORRECTED | Stale `451f2fe2` on 4.4.2: silent under Unix Makefiles (the [floors] §4 setup) and under `LANGUAGES NONE`. Under Ninja it warns `CMAKE_EXPERIMENTAL_CXX_IMPORT_STD is set to incorrect value` (exit 0), and so does 4.3.4 with a stale `f35a9ac6`. 3.31.12 with Ninja is silent. A correct UUID warns `(experimental)`, which fails the gate on all three. `-Wno-error=experimental` exits 0 on 4.4.2. `CXX_IMPORT_STD` kept d0edc3af from 3.31.12 through 4.2.0. | The rule stays MUST, because only a build proves activation. The gate interaction was added. |
| 37 | Applied: protobuf CMP0141 at `CMakeLists.txt:7-9`, ModernCppStarter at `style.yml:20` | CORRECTED | `git show` at the pinned SHAs: protobuf has the reason comment at :5 and the guard at :6-8. ModernCppStarter :20 is `steps:`, and the cmake_format install is at :29. | |
| 38 | Applied: yaml-cpp :1, KWIML :7, cmake_template :4, arrow :29-32, vcpkg `ports.cmake:7`, nlohmann :8, fmt `lint.yml:33-44`, CPMLicenses `style.yml:20` | CONFIRMED | `git show HEAD:<path>` in each exemplar prints the quoted line. | |
| 39 | Applied: nlohmann's "fails loudly" comment is "wrong" | CORRECTED | On its pinned 4.3.x with Ninja a stale UUID warns loudly but exits 0. It is silent only on 3.31 or under Makefiles. | Now called "overstated". |
| 40 | Applied: find_ocx `ci.yml:85,101,104,108`, `helpers.cmake:44,57`, `CMakeLists.txt:8,22-24`, example :13, `ocx.cmake:167-171`, `Findocx.cmake:36`, `reconfigure_check.cmake:16-18`, and 0 post-3.19 features | CONFIRMED | `sed -n` on the working tree matches every line. A grep for 9 post-3.19 keywords is empty. | |
| 41 | Gate in CI for 1 of 46 exemplars (find_ocx) | CONFIRMED | A grep for the `-Werror=` spellings over all YAML hits find_ocx and Kitware's `Help/manual/presets/schema.yaml`, which is documentation, not CI. | |
| 42 | `if(POLICY)` guard in 20 repos | CONFIRMED | A recursive grep gives 20 repos. | The 43 denominator was not re-derived. |
| 43 | Sub-3.5 floors: cci 54, vcpkg 26, rfcc 16 | CONFIRMED | A line-anchored grep per repo gives 54, 26 and 16. | The "113 live lines" total is in Unverifiable. |
| 44 | Verdict 7: rules_foreign_cc 0.16.0 defaults to 3.31.12 with a range of 3.19.8–4.0.7 | CONFIRMED | `foreign_cc/repositories.bzl:19` `"cmake": "3.31.12"`. `toolchains/private/cmake_versions.bzl` spans 3.19.8 to 4.0.7 in 14 entries. | |
| 45 | Era: 4.4.3 on 2026-08-25 and 4.3.5 on 2026-09-04 are newest | CONFIRMED | GitHub releases API for Kitware/CMake: v4.4.3 2026-08-25T18:00:44Z, v4.3.5 2026-09-04T15:55:17Z. | v4.2.8 also shipped on 2026-09-04. |

## Verification commands exercised

The planted tree and the clean tree are at `…/verify-versions-and-gate/greps/{bad,clean}`.
Each command was run verbatim by `checks.sh`.

| Rule | Planted violation outcome | Clean outcome | Empty reads as |
|---|---|---|---|
| CMK-CORE-01 gate canary | 3.31.12 with `-Werror=author`: exit 0 (finding) | 3.31.12 with `-Werror=dev`: exit 1 | not applicable (exit code) |
| CMK-CORE-01 grep | Hits the `-Werror=author` line, which reading marks as a finding on a runner below 4.4 | Hits the `-Werror=dev` line (pass) | finding (no gate) |
| CMK-CORE-02 jq | Schema 12 with `errors.dev`: `true` (red) | Schema 10 `dev`, schema 12 `author` and schema 11 `dev`: `false` | pass |
| CMK-CORE-03 grep | Empty on both trees | Empty | "not adopted", which is not a finding at CONSIDER |
| CMK-CORE-04 grep and find | Workflow `cmake-format` line and `.cmake-format.yaml` found | Both empty | pass |
| CMK-CORE-05 (corrected) | 5 of 5 planted early-exit pipes (old regex: 2 of 5) | Empty on a `grep -rq` script | pass |
| CMK-VER-01 | `VERSION 3.15..4.3` hit | Empty (`3.25...4.4`, `3.25...4.4 FATAL_ERROR`) | pass |
| CMK-VER-02 (corrected) | Bare `3.25 FATAL_ERROR` hit | Empty (old command: false hit in `_deps`) | pass |
| CMK-VER-03 (corrected) | Empty on a tree whose only install is `pip install cmake-format` (finding; the old command falsely hit) | `lukka/get-cmake` hit, then read the matrix | finding |
| CMK-VER-04 | `block(` and `endblock(` hit | Empty | pass |
| CMK-VER-05 (corrected) | 2.8.12, 3.9 and `3.5...3.10` hit (the last is exempt on reading), plus `cmake_policy(VERSION 3.5)` with the new alternative | Empty (3.10, `3.25...4.4`) | pass |
| CMK-VER-06 | Workflow `env` line and an unpaired listfile `set` hit | Empty | pass |
| CMK-VER-07 | `cmake_policy(SET CMP0155 OLD)` hit | Empty (a guarded `NEW` is not matched) | pass |
| CMK-VER-09 grep and `strings` | The gate line hits. `strings` on 4.4.2 gives `451f2fe2…` 0 (stale, finding) | `f35a9ac6…` 1 | pass for the grep. For `strings`, 0 is the finding. |

## Unverifiable

- "113 live lines below 3.5" ([shape] §1, [M10]). The per-repo subset
  (54/26/16) re-counts exactly. A line-anchored grep over the whole corpus
  gives 128, and the audit's rule for "live" is not recorded, so the total
  could not be reproduced.
- "35 of 46 exemplars take the runner-default CMake" ([deps] §9). Not
  re-measured, because it needs per-workflow reading of the matrix.
- "Every other surveyed distro and CI image clears 3.25" ([floors] §1).
  Only bookworm, jammy and the three runner images were re-fetched.
- Conflict 2's "errors at generate time" for `install-absolute-destination`.
  4.4.2 reports it at `CMakeLists.txt:3 (install)` with exit 1, but this pass
  did not separate the configure step from the generate step.
- "Measured results handed to other families" (CACHE INTERNAL, CMP0126
  shadowing, `cmake_parse_arguments`, policy capture, `return(PROPAGATE)`,
  `file(DOWNLOAD)`, `include_guard`). Their owning families (CMK-LANG,
  CMK-MOD) are not rules of this consolidation and were not re-run.
- CMake 4.0.x–4.2.x binaries are not on the host. Claims for those minors
  rest on the release notes and `experimental.rst` at the tag, not on
  measurement.

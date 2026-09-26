---
title: "Dependency seam — verify wave 2 ledger"
verifies: ../cmake-dependency-seam.md
model: opus
date: 2026-09-26
---

# Dependency seam: verify wave 2 ledger

This ledger checks every MUST rule and every claim about a tool version in
[cmake-dependency-seam.md](../cmake-dependency-seam.md). Each claim was tried against the
strongest evidence available cheaply:

- real binaries: CMake 3.31.12, 4.3.4 and 4.4.2 through `ocx package exec kitware/cmake:<line>`, with gcc 15.2 for `LANGUAGES C`;
- `--help-*` output from those same binaries;
- CMake `Help/dev/experimental.rst` fetched raw from gitlab.kitware.com at v4.0.0, v4.2.0 and v4.3.0;
- the GitHub API for cpp-pm/hunter releases, PR #858 and conan-io/conan#12341;
- the corpus at the 2026-09-26 SHAs, and find_ocx, read-only.

Scratch lives under `/home/mherwig/.cache/cmake-measure-scratch/verify-dependency-seam/`:

- `c/` is the consolidation's C1-C6 projects, re-pointed there, and `c/run.sh` now loops over 3.31, 4.3 and 4.4;
- `m/` holds the new projects;
- `greps/` holds the planted-violation trees and `run-greps.sh`;
- `help/` holds the dumped help text.

The build trees are deleted. The brief limits this verifier's writes, so the sources were not copied into the research tree.

Totals: 62 claims checked. 45 CONFIRMED, 13 CORRECTED, 4 UNVERIFIABLE.

## Ledger

| # | ID or claim | verdict | evidence | note |
|---|---|---|---|---|
| 1 | C1: a project `set(CMAKE_PROJECT_TOP_LEVEL_INCLUDES …)` hides the user's `-D` provider file | CONFIRMED | `c/run.sh` on all three lines: only `[proj-provider] registered/called` is printed | |
| 2 | C2: `list(APPEND …)` loads both files, and the project's provider displaces the user's | CONFIRMED | Output order on all three lines: `user registered`, `proj registered`, `proj called` | |
| 3 | C3: set/unset of `CMAKE_POLICY_DEFAULT_CMP0077` around one MakeAvailable is scoped | CONFIRMED | depA prints `OFF`; depB warns CMP0077 and prints `ON`, on all three lines | |
| 4 | C4: re-pointing `dep_ROOT` leaves `dep_DIR` and the copy in place; a guarded `unset(dep_DIR CACHE)` fixes it | CONFIRMED | rootswitch: `dep_ROOT=pfx-B dep_DIR=pfx-A dep_WHICH=A`; rootswitch-fix run 2: `dep_WHICH=B`, on all three lines | |
| 5 | C5: a top-level `find_program` ignores `dep_ROOT` | CONFIRMED | `DEPPROG_EXE-NOTFOUND` on all three lines | See row 39 for a scope correction to the rule built on it |
| 6 | C6: `include(CPM.cmake)` leaves the includer's CMP0077 unset but sets `CMAKE_POLICY_DEFAULT_CMP0077/0135` to NEW | CONFIRMED | `before='' after='' …CMP0077='NEW' CMP0135='NEW'` on all three lines. The CPM source `cpm_set_policies()` also sets 0126 and 0150, each guarded by `if(POLICY …)` | CPM v0.43.2 = `01678cfe17` (tag points at HEAD) |
| 7 | C7: `FIND_PACKAGE_ARGS` and `OVERRIDE_FIND_PACKAGE` share one `versionadded:: 3.24` block | CONFIRMED | `--help-module FetchContent` 4.4.2, lines 162-197 | |
| 8 | C7: FetchContent `SYSTEM` is 3.25 and `EXCLUDE_FROM_ALL` is 3.28 | CONFIRMED | Same help text, `versionadded` at lines 217 and 227 | |
| 9 | C7 and TC-05: `cmake_language(DEFER)` is 3.19 | CONFIRMED | `--help-command cmake_language` 4.4.2, line 105 | |
| 10 | C7 and DEP-15: `CMAKE_POLICY_VERSION_MINIMUM` is 4.0 and undefined on 3.31.12 | CONFIRMED | 4.4.2 shows `versionadded:: 4.0`. 3.31.12 says "is not a defined variable" | |
| 11 | C7: CMP0135 3.24; CMP0144 and CMP0150 3.27; CMP0168, CMP0169 and CMP0170 3.30 | CONFIRMED | `--help-policy` on 4.4.2, `versionadded` for each | |
| 12 | Verdict 8 and conflict 7: 4.3.4 and 4.4.2 pick `XConfig.cmake` over `X.cps` at default locations | CORRECTED | A valid `X.cps` with an `XConfig.cmake` in the same prefix: `X_CONFIG=…/X.cps` and `X::x` exists on 4.3.4 and 4.4.2, under `lib/cps/`, `lib/cps/X/` and `lib64/cps/X/` (lib64 needs an enabled language). This agrees with CMK-INST-14's `run-cps-order.sh` and CMK-INST-16's `VERSION_SCHEMA rpm` fall-through diagnosis | The docs' "CPS preferred" holds. A rejected `.cps` falls through silently |
| 13 | DEP-01: FetchContent "advisable to use a hash for `GIT_TAG`"; floor 3.11 | CONFIRMED | The 4.4.2 `Modules/FetchContent.cmake` has the quote at lines 157-159; the help file has `versionadded:: 3.11` | The cited range 156-159 includes a blank line 156 |
| 14 | DEP-01: OpenSSF Scorecard Pinned-Dependencies does not inspect CMake | CONFIRMED | `docs/checks.md` at main fetched 2026-09-26: 0 occurrences of "cmake"; the check lists Dockerfiles, shell scripts and GitHub workflows | |
| 15 | DEP-01: corpus violators and satisfiers | CONFIRMED | aminya `CrossCompiler.cmake:353` `GIT_TAG main`; curl `:75` option default `"master"`; cmake_template `Dependencies.cmake:78-79` split `"main"`; nlohmann `:8` `GIT_TAG HEAD`; grpc `:82` placeholder; duckdb `vss.cmake:5` 40-hex; spdlog `tests/CMakeLists.txt:24` 40-hex | spdlog's hash is at line 24, not 22 (22 is the `Declare`) |
| 16 | DEP-02: CPM README says "always prefer specifying immutable git commit hashes" | CONFIRMED | `cpm-cmake__CPM.cmake@01678cfe17:README.md:123` | |
| 17 | DEP-03: ExternalProject says `URL_HASH` is "strongly recommended"; floor 3.11; the duckdb and cmake_template violators; the arrow and ninja satisfiers | CONFIRMED | `--help-module ExternalProject` 4.4.2, line 158. On the corpus the DEP-03 grep lists `DuckDBCppApi.cmake` and `PackageProject.cmake` and is empty for arrow and ninja | |
| 18 | DEP-03 exemplar row: two cmake_template violators | CORRECTED | The same grep also lists `cpp-best-practices__cmake_template@b86318abbf:cmake/Doxygen.cmake:33-34`, an unhashed `URL …v1.6.1.zip` | Row extended |
| 19 | DEP-04: CMP0169 (3.30) deprecates the one-argument `FetchContent_Populate`; `MakeAvailable` is 3.14; the ccache and vcpkg-tool violators | CONFIRMED | CMP0169 text: "Calling `FetchContent_Populate()` with a single argument … is deprecated". The DEP-04 regex hits `FindZstd.cmake:62` and `FindLibCURL.cmake:57` and is empty for cmake_template's multi-argument calls | |
| 20 | DEP-05: CPM sets `CMAKE_POLICY_DEFAULT_CMP0077/0126/0135/0150=NEW` | CONFIRMED | `cpm_set_policies()` in the v0.43.2 source, plus the C6 measurement | |
| 21 | DEP-05: "both corpus copies hash-check their bootstrap" | CORRECTED | A third copy exists: `cpm-cmake__CPMLicenses.cmake@ca42334d56:cmake/CPM.cmake` pins 0.27.5 with no `EXPECTED_HASH`. The DEP-05 grep lists it and is empty for the two template copies | Rule rationale and exemplar row updated |
| 22 | DEP-06: cpp-pm/hunter#858 is "the June-2026 CMake-4 floor fix" | CORRECTED | GitHub API: #858 is "Protobuf: CMake 4+ support set CMAKE_POLICY_VERSION_MINIMUM=3.5", merged 2026-06-11 and shipped in v0.26.10. CMake 4 fixes came per package: #845 in v0.26.7, #849-#854 in v0.26.9 | The floor now reads "v0.26.10 or later". Severity stays CONSIDER |
| 23 | DEP-06: Hunter v0.26.12 (2026-09-22); `gate` submodule at `920507363b`; nlohmann pins v0.23.297; no other exemplar adopts it | CONFIRMED | Releases API; `git ls-tree HEAD gate`; `nlohmann__json@f422b753cc:docs/mkdocs/docs/integration/hunter/CMakeLists.txt:5`. `HunterGate(` appears only in cpp-pm/hunter and in nlohmann's docs example | |
| 24 | Resolution table step 1: `FETCHCONTENT_SOURCE_DIR_<X>` outranks a provider | CONFIRMED | `m/srcvsprov`: with a `FETCHCONTENT_MAKEAVAILABLE_SERIAL` provider registered and `-DFETCHCONTENT_SOURCE_DIR_DEP` set, the provider is never called and the source dir is `add_subdirectory`'d, on all three lines | The evidence cell was upgraded from normative-only, and the open question is answered |
| 25 | Resolution table, plain `find_package` row: the redirects dir comes before a cached `_DIR` | CONFIRMED | `m/redir`: run 1 caches `dep_DIR=pfx/lib/cmake/dep`. Run 2 adds `OVERRIDE_FIND_PACKAGE` and gets `dep_DIR=…/CMakeFiles/pkgRedirects`, on all three lines | The evidence cell was upgraded |
| 26 | `OVERRIDE_FIND_PACKAGE` together with `FIND_PACKAGE_ARGS` is a `FATAL_ERROR` | CONFIRMED | "Cannot specify both OVERRIDE_FIND_PACKAGE and FIND_PACKAGE_ARGS", on all three lines | |
| 27 | DEP-07 floors: `FIND_PACKAGE_ARGS` 3.24; `PROJECT_IS_TOP_LEVEL` 3.21 | CONFIRMED | `--help-variable PROJECT_IS_TOP_LEVEL` shows `versionadded:: 3.21` | |
| 28 | DEP-07 verification: "Exit 0 = pass" under `FETCHCONTENT_FULLY_DISCONNECTED=ON` | CORRECTED | `m/dep07-325` forces a git fetch in a tree with floor 3.25 and an empty `_deps`. It exits 0 on 3.31.12, 4.3.4 and 4.4.2, which is a false pass. With `-DCMAKE_POLICY_DEFAULT_CMP0170=NEW` it exits 1. `m/dep07-ok` (`FIND_PACKAGE_ARGS` plus an installed prefix) exits 0 | The flag was added to the verify command |
| 29 | DEP-08: when `find_package` satisfies a `FIND_PACKAGE_ARGS` declare, only `dep::dep` exists | CONFIRMED | `m/dep08`: `dep_FROM=installed TARGET dep=no TARGET dep::dep=yes`, on all three lines | |
| 30 | DEP-09: the redirect stub sets COMPATIBLE and EXACT to TRUE, and `find_package(dep 2.0 EXACT)` succeeds with a blank version | CONFIRMED | `m/dep09`: `found=1 dep_VERSION=''`. The stub contains "Version not available" and both `set(… TRUE)` lines, on all three lines | |
| 31 | DEP-10: "the first such call will control …"; floor 3.14 | CONFIRMED | `FetchContent_MakeAvailable` help text 4.4.2, lines 238-247 | |
| 32 | DEP-11: CMake never reads `CPS_PATH` | CONFIRMED | `m/cps` with `CPS_PATH=pfx4/cps` and no prefix reports "Could not find a package configuration file" on 4.3.4 and 4.4.2. The same `.cps` found through `CMAKE_PREFIX_PATH` loads | |
| 33 | DEP-11: `CMAKE_EXPERIMENTAL_FIND_CPS_PACKAGES` is valid on 4.0-4.2 and retired at 4.3.0 | CONFIRMED | `experimental.rst` has the variable with UUID `e82e467b-f997-4464-8ace-b00808fff261` at v4.0.0 and v4.2.0, and it is absent at v4.3.0 | |
| 34 | DEP-11 rule text and rationale: "do not predict", "Config won" | CORRECTED | See row 12 | The rule now says a valid `.cps` wins and a rejected one falls through silently. Severity stays SHOULD |
| 35 | DEP-12: ranges 3.19; an incompatible version makes CMake discard a cached `_DIR`; only CPS has built-in range support | CONFIRMED | `--help-command find_package` 4.4.2, lines 198-212 and 321-324 | |
| 36 | DEP-13: behaviour (MUST) | CONFIRMED | Rows 4 and 45. `/home/mherwig/dev/find_ocx/ocx.cmake:1200-1201` writes `…_ROOT … CACHE PATH` then `FORCE)` on the next line, with no `_DIR CACHE` unset in the file | |
| 37 | DEP-13 verification: the module grep `'_ROOT[^)]*CACHE[^)]*FORCE'` | CORRECTED | That grep returns nothing on find_ocx because `FORCE` sits on line 1201, and nothing on the planted two-line violator. The replacement `grep -rlE … '_ROOT[^)]*CACHE' . \| xargs -r grep -L -e '_DIR CACHE'` lists `./ocx.cmake` and the planted file, and is empty on the clean fixture | |
| 38 | DEP-13 floor: upper-case `<PKG>_ROOT` is 3.27 (CMP0144) | CONFIRMED | find_package help text line 470 has `versionadded:: 3.27`; CMP0144 is 3.27 | |
| 39 | DEP-14: `<Pkg>_ROOT` reaches only `find_package` and the package's own Find module (MUST) | CORRECTED | `m/dep14`: `find_program` inside `dep2Config.cmake` finds `<dep2_ROOT>/bin/dep2prog`; the top-level one returns `NOTFOUND`, on all three lines. `find_program` docs: "within a find module or any other script loaded by a call to find_package" | The rule now covers Config files too. The find_ocx docs finding stands |
| 40 | DEP-14 floor: CMP0074 is 3.12 | CONFIRMED | `--help-policy CMP0074` | |
| 41 | DEP-15: set/restore scopes `CMAKE_POLICY_VERSION_MINIMUM`; the environment form persists in the cache; both variables' docs say "Projects may set this variable before a call to `add_subdirectory()`" (MUST) | CONFIRMED | `m/dep15`: old1 configures, old2 hits "Compatibility with CMake < 3.5 has been removed" on 4.3.4 and 4.4.2. `m/envleak`: after an env-less reconfigure the cache still has `CMAKE_POLICY_VERSION_MINIMUM:STRING=3.5`. Both help texts contain the quote on 4.4.2, and `CMAKE_POLICY_DEFAULT_CMPNNNN` also on 3.31.12 | |
| 42 | DEP-15 verification: "every hit must be half of a pair adjacent to one add call" | CORRECTED | The rule's own exemplar, arrow `FindRapidJSONAlt.cmake:29-32`, wraps a `find_package`, so the check would flag it. `m/dep15fp`: a config with `cmake_minimum_required(VERSION 3.1)` errors on 4.4.2 unwrapped and configures when wrapped | The rule and check now accept `find_package` as the wrapped call |
| 43 | DEP-15 floors: the escape hatch is 4.0; `CMAKE_POLICY_DEFAULT_CMP0077` works from 3.13 | CONFIRMED | Row 10; CMP0077 is 3.13 | |
| 44 | DEP-16: vcpkg prepends `FULLY_DISCONNECTED=ON`; arrow sets CMP0170 NEW; CMP0170 is 3.30 (MUST) | CONFIRMED | `vcpkg_cmake_configure.cmake:218`; `apache__arrow@3ad410b7b1:cpp/CMakeLists.txt:94-96`; the policy help text | |
| 45 | DEP-16 verification: `unshare -rn cmake … -DFETCHCONTENT_FULLY_DISCONNECTED=ON` means "exit 0 = pass" | CORRECTED | Under `unshare -rn` on 4.4.2, floor 3.25, one dependency without a `SOURCE_DIR`: exit 0, a false pass. With `-DCMAKE_POLICY_DEFAULT_CMP0170=NEW`: exit 1. When pre-populated: exit 0 | The flag was added. `unshare -rn` works on this WSL host |
| 46 | DEP-17: `find`/`find_package` configure-log events are 4.1; 3.31.12 logs none | CONFIRMED | `cmake-configure-log(7)` 4.4.2 has `versionadded:: 4.1` at lines 317 and 424. `m/dep17`: 0 events on 3.31.12; 1 `find_package-v1` and 2 `find-v1` on 4.3.4 and 4.4.2 | |
| 47 | DEP-17 verification: `grep -rc … 'kind: "find'` means "0 on ≥4.1 = finding" | CORRECTED | That pattern also counts CMake's own `find-v1` probes (`uname`, `gmake`), so it never reads 0 on 4.3 or 4.4. A reconfigure with a cached `_DIR` logs no new event | The check now counts `find_package-v1` on a `--fresh` tree |
| 48 | DEP-18: `CMAKE_REQUIRE_FIND_PACKAGE_<Pkg>` is 3.22 | CONFIRMED | `--help-variable` shows `versionadded:: 3.22` | |
| 49 | TC-01: the variable is one path; the environment variable is 3.21 and applies only to a new build tree; presets `toolchainFile` needs schema 3 = 3.21 (MUST) | CONFIRMED | `CMAKE_TOOLCHAIN_FILE` help: "Path to toolchain file … initialized by the … environment variable if it is set when a new build tree is first created". `cmake-env-variables(7)` shows 3.21. `cmake-presets(7)` shows `toolchainFile` in presets v3 and v3 = 3.21 | |
| 50 | TC-02: a single slot, and no corpus repo chains both managers (MUST) | CONFIRMED | Row 49; the TC-02 grep fires on the planted preset | |
| 51 | TC-02 rationale: "Conan's maintainer redirected conan#12341 rather than bless it" | CORRECTED | GitHub API: #12341 (opened 2022-10-19, still open) asks Conan to run from a generic toolchain that chainloads `conan_toolchain.cmake`, which is vcpkg's model. It is not about combining vcpkg and Conan. memsharded pointed to cmake-conan#447 and then agreed the idea is independent | Rationale re-worded. The rule stands |
| 52 | TC-03: `set(CMAKE_TOOLCHAIN_FILE … CACHE … FORCE)` after `project()` is never read and gives no diagnostic; vcpkg says "must be defined before the first `project()`"; vcpkg-tool presets are a positive exemplar (MUST) | CONFIRMED | `m/tc03`: the toolchain marker never prints across two configures, the variable prints the new value, and there is no warning, on all three lines. learn.microsoft.com cmake-integration: "All vcpkg-affecting variables must be defined before the first project() directive". `vcpkg-tool@51bf87ca6e:CMakePresets.json:43` has `toolchainFile` | |
| 53 | TC-04: provider only from top-level includes, otherwise an error; the "user's control" note; the later provider replaces the earlier; floor 3.24 and module names 3.29 (MUST) | CONFIRMED | `m/tc04`: "Dependency providers can only be set as part of the first call to project()" on all three lines. `cmake_language` help lines 253-276. `CMAKE_PROJECT_TOP_LEVEL_INCLUDES` help shows 3.24 and 3.29. aminya `Conan.cmake:237` appends | |
| 54 | TC-05: `FIND_LIBRARY` is an unknown method; cmake-conan needs Conan ≥2.0.5; the README states the limitation; the DEFER workaround (MUST) | CONFIRMED | `m/tc05`: `Unknown dependency provider method "FIND_LIBRARY"` on all three lines. `conan-io__cmake-conan@b1593849dd:conan_provider.cmake:23` has `CONAN_MINIMUM_VERSION 2.0.5`, and `README.md:53` states the limitation. aminya `Conan.cmake:241-249` | |
| 55 | TC-06: the re-read is unmeasured, and CMP0137 is its cause | CORRECTED | `m/tc06`: the toolchain file is read 4 times in one `LANGUAGES C` configure with one `check_c_source_compiles`, on 3.31.12 and 4.4.2. CMP0137 text: "`try_compile()` passes platform variables in project mode", which is propagation, not the re-read. vcpkg's early return spans lines 213-216 | Rationale updated; severity left SHOULD for the map to decide |
| 56 | TC-06 floor: CMP0137 is 3.24 | CONFIRMED | `--help-policy CMP0137` | |
| 57 | TC-07: emulator 3.3, list form 3.15 | CONFIRMED | `CMAKE_CROSSCOMPILING_EMULATOR` help shows 3.3 and 3.15, and an environment initializer in 3.28 | |
| 58 | TC-07: vcpkg `"host": true` for "code generators, or helpers"; Conan resolves `tool_requires` against the build profile | UNVERIFIABLE | Neither the vcpkg.json reference nor the Conan docs page was fetched this wave | SHOULD rule; cited from [toolchain] §8 |
| 59 | find_ocx applied table: DEP-13 lines, DEP-14 doc lines, DEP-16 offline job only on Linux | CONFIRMED | Working tree `ocx.cmake:1200-1201` and `1062-1063`; HEAD `1225-1226` and `1059-1060`; `examples/package/CMakeLists.txt:25-26` (HEAD `:23-25`). `.github/workflows/ci.yml:90-112` runs the offline job on `ubuntu-latest` only | HEAD's example text spans lines 23-25 |
| 60 | Corpus counts carried from [pinning]: 6 of 8 CPM refs tag-only; 108 of 6,112 `find_package` calls versioned; 7 % false positives in the network grep; duckdb 23/23; arrow 18/18 | UNVERIFIABLE | Not re-counted; the budget went to the MUST rules | They feed only rationale and SHOULD severities |
| 61 | TC-01: "a later assignment replaces an earlier one without a diagnostic" across preset, `-D` and environment | UNVERIFIABLE | Only the post-`project()` `set()` case was measured (row 52). A preset `toolchainFile` plus `-DCMAKE_TOOLCHAIN_FILE` was not run | |
| 62 | TC-05: cmake-conan's sequencing effect with a real Conan 2.32.0 | UNVERIFIABLE | No Conan binary run this wave | Still an open question in the consolidation |

## Verification commands exercised

`greps/run-greps.sh` runs each command verbatim from the consolidation, from the root of a planted-violation tree (`greps/bad/`) and of a clean tree (`greps/clean/`). The counts are output lines.

| Rule | bad | clean | Outcome |
|---|---|---|---|
| DEP-01 grep 1 (literal branch pins, CPM `#master`) | 2 | 0 | Goes red and stays green. Red on the corpus: aminya 1, nlohmann 3. Green: duckdb |
| DEP-01 grep 2 (split `GIT_TAG` line) | 2 | 0 | Goes red and stays green. Red on cmake_template (5 lines with `-A1`) |
| DEP-03 | 1 | 0 | Goes red and stays green. Red on duckdb and cmake_template, empty on arrow and ninja |
| DEP-07 locate grep | 2 | 1 | An enumeration grep, so it never goes green alone; the behavioural configure is the check |
| DEP-07 behavioural (corrected) | exit 1 | exit 0 | Before the fix, the violator exited 0 on floor 3.25 |
| DEP-08 (`NAME=dep`) | 1 | 0 | Goes red and stays green |
| DEP-09 | 9 | 0 | An enumeration grep with `-A12`; reading the planted file shows the versioned `find_package(ov 2.0 …)` |
| DEP-13 module grep (original) | 0 | 0 | **Cannot go red** on a two-line call. Also empty on find_ocx, the rule's named violator |
| DEP-13 module grep (corrected) | 1 | 0 | Goes red and stays green. Lists `./ocx.cmake` in find_ocx |
| DEP-14 | 1 | 0 | An enumeration grep for a reading heuristic |
| DEP-15 | 2 | 2 | A reading heuristic. The bad tree's hits are an unpaired `set()` and a preset `cacheVariables` entry; the clean hits are one set/unset pair |
| DEP-16 grep | 2 | 1 | An enumeration grep. The `unshare -rn` configure (corrected) exits 1 on the missing-source violator and 0 when populated |
| DEP-17 (corrected) | — | — | `find_package-v1` count on a fresh tree: 1 on 4.4.2, 0 on 3.31.12. No violator can be planted, because the CMake binary is what produces the log |
| TC-01 | 2 | 1 | Reading per leg. The bad tree shows a CMakeLists `set()` and a preset with two toolchain sources |
| TC-02 | 1 | 1 | A union grep, read per leg. The bad line carries both `vcpkg.cmake` and `conan_toolchain.cmake` |
| TC-03 | 3 | 1 | Line-order reading. The bad tree has `set(CMAKE_TOOLCHAIN_FILE` and `set(VCPKG_` after `project(`; the clean tree has only `project(` |
| TC-04 | 1 | 0 | Goes red and stays green (planted `list(APPEND CMAKE_PROJECT_TOP_LEVEL_INCLUDES …)`) |
| TC-05 | 3 | 0 | Line-order reading. The bad tree has `find_program(` before the first `find_package(` |
| DEP-05 (SHOULD, on the corpus) | 1 | 0 | Red on CPMLicenses.cmake; empty on both template copies |

## Unverifiable

- **Row 58, TC-07's vcpkg and Conan host-tool semantics.** Neither the vcpkg.json reference nor the Conan `tool_requires` docs was fetched. The rule is SHOULD, and wave 3's `cross-compile-find-root` owns it.
- **Row 60, the corpus counts from [pinning].** No re-count was done. They set no MUST.
- **Row 61, TC-01's "replaces without a diagnostic" across sources.** Settling it needs a preset-plus-`-D` run. The single-path normative text and row 52 already make the rule safe.
- **Row 62, the cmake-conan sequencing effect.** No Conan run. The consolidation still lists it as an open question.

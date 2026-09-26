---
title: Wave 8 — rules-check re-test of the wave 7 rows on four fresh trees
date: 2026-09-26
scope: cmake-build/dependencies.md (CMK-DEP-33, CMK-DEP-34), cmake-build/targets.md (CMK-TGT-05 gate, both guard_scan lines), cmake-build/install-and-export.md (CMK-INST-01, -04, -19, -24), cmake-build/toolchains-and-providers.md (CMK-TC-08, CMK-TC-11)
repos:
  - name: commontk/CTK
    commit: a5c2e4d1cdac28e0b93c3434ec042f19e63d1d55
    clone: shallow depth 1, 2026-09-26
    role: superbuild (ExternalProject_Add, forwarded search paths) — DEP-34
  - name: MITK/MITK
    commit: bc7e87646871793d492e31aa09b176f59cb182f7
    clone: shallow depth 1, 2026-09-26
    role: superbuild (ExternalProject_Add, forwarded search paths) — DEP-34
  - name: libgit2/libgit2
    commit: 0551dfd4ad989b6a3d5683c0d4cf326c6efef929
    clone: shallow depth 1, 2026-09-26
    role: C library setting CMAKE_C_STANDARD — CMK-TGT-05
  - name: PCRE2Project/pcre2
    commit: ffa64a462e1d31b2c8afd15634e1e4f7072e0a71
    clone: shallow depth 1, 2026-09-26
    role: library with install/export machinery — CMK-INST-01/-04/-19/-24
tools:
  - "CMake 4.4.2 (kitware/cmake:4.4, via ocx package exec)"
  - "CMake 3.31.12 (kitware/cmake:3.31, via ocx package exec)"
  - "gcc (GCC) 15.2.1 20260123 (Red Hat 15.2.1-7), host"
  - "zig c++ wrapper at /home/mherwig/.cache/cmake-measure-scratch/zig-cxx-wrapper.sh, used only where a CXX compiler was unavoidable (no g++ on this host)"
scratch: /home/mherwig/.cache/cmake-measure-scratch/w8/rules-check (run.sh reproduces every number below)
result_summary: "4 false positives, 0 true misses, 0 command errors, 2 confirmed true positives, 6 confirmed true passes, 2 rows not applicable to any of the four trees, 1 row not exercised"
---

# Wave 8 — rules-check re-test

Four fresh repositories, none named in `cmake-audit/*.md` or `cmake-skills/*.md` before this
run (checked by grepping every `owner/repo`-shaped token in those ledgers). Selection matched
the brief: two ExternalProject_Add superbuilds (CTK, MITK) for CMK-DEP-34, one C library
that sets `CMAKE_C_STANDARD` (libgit2) for CMK-TGT-05, and a library with install/export
machinery (pcre2) for CMK-INST-04/-19/-24. Across 9 candidates actually inspected for a
**hand-written** ConfigVersion file or an `export(PACKAGE)` call (pcre2, libgit2, CTK, MITK,
curl, cppcheck, lz4, protobuf-c, pugixml), none had either — every actively maintained
project checked already uses `write_basic_package_version_file()` and none call
`export(PACKAGE)`. That is a real, reportable result (see INST-04/-24 below), not a gap in
the search.

## Results

| Row | Repo | Verification cell run as written | Result |
|---|---|---|---|
| CMK-DEP-34 | CTK | `grep -e 'CMAKE_PREFIX_PATH=\${' ...` | Empty. True pass — CTK forwards `-DCMAKE_PREFIX_PATH:STRING=${CMAKE_PREFIX_PATH}` through `CMAKE_CACHE_ARGS` (`CMake/ctkBlockCheckDependencies.cmake:60-66`), the row's own recommended shape. |
| CMK-DEP-34 | MITK | same | Empty. True pass — MITK forwards `"-DCMAKE_PREFIX_PATH:PATH=<INSTALL_DIR>;${CMAKE_PREFIX_PATH}"` through `CMAKE_CACHE_DEFAULT_ARGS` (`SuperBuild.cmake:152-154`, consumed by every `CMakeExternals/*.cmake`), also compliant. |
| CMK-TGT-05 gate, C line | libgit2 | `guard_scan` for `cmake_c_standard` | **False positive.** Flags `CMakeLists.txt:60-64`: `set(CMAKE_C_STANDARD "90" CACHE STRING ...)` guarded only by an Android platform check, never `NOT DEFINED`. Measured: a consumer's `-DCMAKE_C_STANDARD=17` and a Conan-style toolchain file's plain `set(CMAKE_C_STANDARD 11)` both survive libgit2's call unchanged — `CACHE ... ` without `FORCE` only creates the entry when absent, so it self-guards exactly like the rule's own `NOT DEFINED` idiom for the two hazards CMK-TGT-05's rationale names. |
| CMK-TGT-05 gate, CXX line | CTK | `guard_scan` for `cmake_cxx_standard` | **False positive** on line 58, **true positive** on lines 60-61. `if(NOT CMAKE_CXX_STANDARD)` (`CMakeLists.txt:57-59`) is flagged because it isn't spelled `NOT DEFINED`, but it protects a consumer's `-D` identically (measured: `-DCMAKE_CXX_STANDARD=14` survives). `CMAKE_CXX_STANDARD_REQUIRED ON` and `CMAKE_CXX_EXTENSIONS OFF` (lines 60-61) sit **outside** that guard — a genuine CTK defect the row correctly catches. |
| CMK-TGT-05 gate, CXX line | MITK | same | **True positive.** `CMakeLists.txt:121-123` sets all three variables with no guard at all. Measured: a consumer's `-DCMAKE_CXX_STANDARD=17` is silently overridden to 20. |
| CMK-INST-01 | pcre2 | round-trip script, `pcre2::pcre2-8-static` | True pass, exit 0 on CMake 4.4.2 and 3.31.12 (`pcre2_DIR` resolves under the moved prefix both times). |
| CMK-INST-04 | pcre2 | `grep ... PACKAGE_VERSION_COMPATIBLE` over `*.in`/`*ConfigVersion.cmake` | Empty. True pass — pcre2 uses `write_basic_package_version_file()` (`CMakeLists.txt:1489`). |
| CMK-INST-19 | pcre2 | `grep FetchContent_Populate\|file(DOWNLOAD` | Empty. True pass — packaging is in-tree `CMakePackageConfigHelpers`. |
| CMK-INST-24 | pcre2 | `grep export(PACKAGE...)` | Empty. True pass — no such call anywhere in the tree. |
| CMK-TC-08 | all four | E1-E4 guard_scan over `*.cmake` | Not applicable — none of the four repos ships a project-owned cross toolchain file (no `CMAKE_SYSROOT`/`CMAKE_SYSTEM_NAME` setter in any of them). |
| CMK-TC-11 | all four | E8 find | Not applicable, same reason. |
| CMK-DEP-33 | — | build-artifact grep | Not exercised — see below. |

## False positives, misses and errors

### 1. `guard_scan`'s guard regex misses the CACHE-without-FORCE idiom (CMK-TGT-05, C line)

- Command: `guard_scan 'set[[:space:]]*[(][[:space:]]*cmake_c_(standard|standard_required|extensions)[[:space:])]' 'not[[:space:]]+defined[[:space:]]+cmake_c_standard[[:space:])]'` run over `libgit2_libgit2`.
- Repository: [libgit2/libgit2](https://github.com/libgit2/libgit2) at `0551dfd4`.
- Output: `CMakeLists.txt:61: set(CMAKE_C_STANDARD "99" CACHE STRING ...)` and `:63: set(CMAKE_C_STANDARD "90" CACHE STRING ...)`.
- Ground truth (`CMakeLists.txt:59-64`): the setter is a `CACHE STRING` with no `FORCE`, guarded only by `if("${CMAKE_SYSTEM_NAME}" STREQUAL "Android")`. Per CMake's own `set()` semantics, a cache write without `FORCE` is a no-op when the entry already exists — which it does the moment a caller passes `-DCMAKE_C_STANDARD=...`, or a toolchain file loaded via `-DCMAKE_TOOLCHAIN_FILE` sets it as a normal variable before `project()` (CMP0126 NEW, default under the 3.25 floor, keeps that normal variable shadowing the cache read afterward). Measured on CMake 4.4.2 and 3.31.12 with a fixture reproducing libgit2's exact lines: `-DCMAKE_C_STANDARD=17` → prints `[17]`; no `-D` → prints `[90]`; a toolchain file doing `set(CMAKE_C_STANDARD 11)` → prints `[11]`. All three protect the exact hazard the row's rationale names.
- Proposed replacement: widen the guard ERE to also accept a bare `not <var>` guard and skip CACHE-typed setters that carry no `FORCE`:
  ```sh
  guard_scan() { # $1 setter ERE, $2 guard ERE, both lower-case
    grep -rliE --include='CMakeLists.txt' --include='*.cmake' -e "$1" . | xargs -r awk -v s="$1" -v g="$2" '
      FNR == 1 { n = 0 }
      { l = tolower($0) }
      l ~ /^[[:space:]]*if[[:space:]]*[(]/ { n++; ok[n] = (l ~ g) }
      l ~ /^[[:space:]]*endif[[:space:]]*[(]/ { if (n) n-- }
      l ~ s {
        if (l ~ /cache/ && l !~ /force/) next
        c = 0; for (i = 1; i <= n; i++) if (ok[i]) c = 1; if (!c) print FILENAME ":" FNR ": " $0
      }'
  }
  guard_scan 'set[[:space:]]*[(][[:space:]]*cmake_c_(standard|standard_required|extensions)[[:space:])]' 'not[[:space:]]+(defined[[:space:]]+)?cmake_c_standard[[:space:])]'
  ```
- Re-run with the fix: empty on libgit2 (`run.sh`, "guard_scan_fixed (proposed), expect empty").

### 2. Same regex gap on the CXX line, plus a genuine CTK finding it correctly keeps (CMK-TGT-05 gate)

- Command: same `guard_scan`, CXX variant, over `commontk_CTK`.
- Repository: [commontk/CTK](https://github.com/commontk/CTK) at `a5c2e4d1`.
- Output (as written): `CMakeLists.txt:58`, `:60`, `:61`.
- Ground truth (`CMakeLists.txt:57-61`): line 58 (`set(CMAKE_CXX_STANDARD 17)`) sits inside `if(NOT CMAKE_CXX_STANDARD)` — false positive, same mechanism as finding 1, confirmed by a fixture: with `-DCMAKE_CXX_STANDARD=14` the value stays `14`; with no `-D` it becomes `17`. Lines 60-61 (`CMAKE_CXX_STANDARD_REQUIRED ON`, `CMAKE_CXX_EXTENSIONS OFF`) are genuinely unguarded — a real CTK bug (CMK-TGT-06/-07), correctly flagged.
- Re-run with the same proposed fix (`guard_scan_fixed`, CXX variant): line 58 drops out, lines 60-61 stay. No true hit lost.

### 3. MITK confirms the row still fires on a real, unguarded violation (true positive, not a defect)

- Command: same `guard_scan`, CXX variant, over `MITK_MITK`.
- Repository: [MITK/MITK](https://github.com/MITK/MITK) at `bc7e8764`.
- Output: `CMakeLists.txt:121`, `:122`, `:123` — `set(CMAKE_CXX_EXTENSIONS 0)`, `set(CMAKE_CXX_STANDARD ${MITK_CXX_STANDARD})`, `set(CMAKE_CXX_STANDARD_REQUIRED 1)`, no enclosing `if()` at all.
- Measured: a fixture reproducing these three lines, configured with `-DCMAKE_CXX_STANDARD=17`, reports `CMAKE_CXX_STANDARD=[20]` — the consumer's value is silently discarded. Both the as-written and the proposed-fix `guard_scan` keep this hit; the fix changes nothing here.

No command errored on any repository (exit 0 throughout, including the `Werror=dev`
deprecation *warning* CMake 4.4.2 prints — a warning, not a failure, matching the row's own
"GATE defaults to `-Werror=dev`, which serves every line").

## Rows not applicable or not exercised

- **CMK-TC-08 / CMK-TC-11**: none of the four repositories ships a project-owned cross
  toolchain file (`grep` for `CMAKE_SYSROOT`/`CMAKE_SYSTEM_NAME` setters is empty in all
  four). Not a defect — nothing to check.
- **CMK-DEP-33**: not reproduced. The row needs a build where a bundled copy and a
  find_package-found copy of the *same* dependency coexist. The closest real candidate here
  is libgit2's `USE_REGEX` switch (`cmake/SelectRegex.cmake:33-66`), which vendors PCRE2 from
  `deps/pcre2` as object files folded straight into `libgit2`'s own archive under
  `USE_REGEX=builtin`, or links a system PCRE2 under `USE_REGEX=pcre2` — but it is an
  either/or switch, never both in one build graph, so no single libgit2 build exhibits the
  row's "one copy vs. two copies" shape. None of CTK, MITK or pcre2 offers a bundled+external
  pair either. Reproducing the row's own measured scenario needs a different tree (a project
  that vendors a dependency yet also transitively pulls the same library through another
  `find_package`d dependency); none of the four picked repos provide one, and inventing a
  synthetic pair not drawn from a real tree would not be a "fresh real repository" test.

## Candidate new MUST rows

None. Every finding above is a precision problem in an existing row's Verification cell
(the guard-detection regex), not an uncovered harm — CTK's and MITK's real defects (the
unguarded pairing on CTK's lines 60-61, MITK's fully unguarded lines 121-123) are both
already caught by CMK-TGT-06/-07 and CMK-TGT-05 as written; only the *false-positive* half
needs the fix above.

## Reproduction

`/home/mherwig/.cache/cmake-measure-scratch/w8/rules-check/run.sh` reproduces every command
and output above end to end (exit 0, last run 2026-09-26). Repos are shallow clones at the
commits in the frontmatter; fixtures live under `fixtures/`; the pcre2 round trip lives under
`rt-pcre2/` (CMake 4.4.2) and `rt-pcre2-331/` (CMake 3.31.12).

Leftover from repo selection, not deleted (sandbox denied `rm -rf` outside the tool's own
scratch directory in this session — needs a manual `rm -rf` by whoever next touches this
scratch): `cand_curl_curl/`, `cand_danmar_cppcheck/`, `cand_lz4_lz4/`,
`cand_protobuf-c_protobuf-c/`, `cand_zeux_pugixml/`, `OpenChemistry_tomviz/` — all dead ends
from the INST-04/-24 repo search (none had a hand-written version file either) and one
superbuild candidate that turned out to keep its superbuild in a separate repo. None are
referenced by `run.sh` or the results above.

## Wave 7 applied (2026-09-26)

Applier re-ran the holdout's most consequential claims with
`/home/mherwig/.cache/cmake-measure-scratch/w8/rules-check/run-w8apply.sh` (log:
`run-w8apply.log` beside it, exit 0, build trees under `w8apply-build/`, removed at the end,
never `/tmp`). Tools: `cmake version 4.4.2` (kitware/cmake:4.4) and `cmake version 3.31.12`
(kitware/cmake:3.31). The holdout's own `run.sh` writes build trees to `/tmp/rt-tmp-*`, which
breaks the scratch rule; `run-w8apply.sh` replaces those steps.

| Claim | Re-run | Verdict |
|---|---|---|
| CTK `if(NOT CMAKE_CXX_STANDARD)` is a real guard (finding 2, line 58) | `tgt05-ctk-guard`, `-DCMAKE_CXX_STANDARD=14` prints `[14]`, no `-D` prints `[17]`, both tags | **Accepted.** Check defect. |
| MITK 121-123 unguarded, true positive (finding 3) | `tgt05-mitk-unguarded`, `-DCMAKE_CXX_STANDARD=17` prints `[20]`, both tags | **Accepted.** |
| CMK-DEP-34 true pass on CTK and MITK | the row's grep, `commontk_CTK: empty`, `MITK_MITK: empty` | **Accepted.** |
| libgit2 `CACHE STRING` without `FORCE` is self-guarding, a false positive (finding 1) | fixture at `3.25...4.4`: `-D 17` gives `[17]`, toolchain `set(CMAKE_C_STANDARD 11)` gives `[11]`, both tags. Same lines at libgit2's real `cmake_minimum_required(VERSION 3.5.1)` (`fixtures/w8apply-libgit2-policy`): `-D 17` gives `[17]`, toolchain 11 gives **`[90]`**, both tags | **Rejected.** The holdout fixture used the rules' 3.25 floor, not libgit2's 3.5.1. Under CMP0126 `OLD` the cache write removes the toolchain file's normal variable, so a Conan `cstd` value is replaced by 90. The libgit2 hits (lines 61 and 63) are true positives on the real tree. |

Net: **2 false positives accepted (CTK line 58, C and CXX gate lines share the guard ERE), 2
rejected (libgit2 lines 61 and 63 are true positives).** The proposed `guard_scan` change was
not applied as written. Its `CACHE`-without-`FORCE` skip would have silently passed libgit2.
Its widened guard ERE `not[[:space:]]+(defined[[:space:]]+)?cmake_cxx_standard[[:space:])]`
also accepts `if(NOT CMAKE_CXX_STANDARD VERSION_GREATER_EQUAL 17)`, which measured `-D 14`
into `[17]` on both tags (`fixtures/w8apply-notcmp`).

Applied, all in `rules/cmake-build/targets.md`:

- (ii) Gate line (1), both C and CXX guard EREs, now
  `not[[:space:]]+(defined[[:space:]]+)?cmake_<lang>_standard[[:space:]]*([)]|and[[:space:]]|$)`.
  Re-run of the lines copied verbatim from the file: CTK prints only 60 and 61, MITK 121-123,
  libgit2 61 and 63, `w8apply-notcmp` line 4 (red, correct), `tgt05-ctk-guard` only lines 6
  and 7.
- (iv) CMK-TGT-05 rule text: `if(NOT CMAKE_<LANG>_STANDARD)` is the same guard. A `CACHE`
  default without `FORCE` counts only at policy version 3.21 or later (CMP0126 `NEW`).
- (iv) CMK-TGT-05 Verification cell: green inside `if(NOT CMAKE_CXX_STANDARD)`, red on the
  `VERSION_GREATER_EQUAL` form, and a `CACHE`-without-`FORCE` hit passes on reading only at
  policy version 3.21 or later, with the libgit2 3.5.1 measurement.
- Failure mode 2 gains an instance (reading a `CACHE` default as a guard below 3.21). Same
  class as the existing item (a non-guard mistaken for a guard), so no new class or new
  failure mode.

No new MUST row: the libgit2 harm is already CMK-TGT-05's harm, and the row as written
flagged it. `install-and-export.md`, `dependencies.md` and `toolchains-and-providers.md`
unchanged (true passes, not applicable, not exercised).

Handback: `skills/cmake-modernize/references/inventory.md:203-204` carries the same narrow
guard reading. Replace `whose enclosing \`if()\` lacks \`NOT DEFINED CMAKE_<LANG>_STANDARD\` is the finding`
with `whose enclosing \`if()\` lacks \`NOT DEFINED CMAKE_<LANG>_STANDARD\` or \`NOT CMAKE_<LANG>_STANDARD\` closed by \`)\` or \`AND\` is the finding. A \`CACHE\` setter without \`FORCE\` passes only at policy version 3.21 or later`.

Checker: `python3 .claude/skills/research-lang/scripts/check-artifacts.py --forbid … rules/cmake-build.md` prints `clean`, exit 0.

Leftover scratch not removed (sandbox denies recursive delete here too): `cand_*`,
`OpenChemistry_tomviz/` under the rules-check scratch dir.

## Handbacks applied (2026-09-26)

Applier: opus (rules owner). Neither handback from this ledger could be applied.

- `skills/cmake-modernize/references/inventory.md:203-204`, the `NOT CMAKE_<LANG>_STANDARD` and `CACHE` without `FORCE` widening: not in the rules applier's files, so not applied and not re-measured here. Passed on to the cmake-modernize owner unchanged.
- Scratch hygiene: `rm -rf` of `cand_*` and `OpenChemistry_tomviz/` under the rules-check scratch dir was denied by the sandbox again (2026-09-26). They remain (about 94 MB). `run-w8apply.sh` already keeps new build trees under the scratch dir, and 6 `/tmp/rt-tmp-*` trees from the original `run.sh` remain too.

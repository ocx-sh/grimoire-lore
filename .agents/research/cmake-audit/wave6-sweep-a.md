---
title: Wave 6 sweep A — index, versions-and-policies, language, module-authoring, testing, presets-and-ci on real trees
date: 2026-09-26
repositories:
  - fmtlib/fmt @ 522e2c12abe6e0d721640eb6cba9fed30c588983 (2026-09-25) — modern consumable library
  - nlohmann/json @ f422b753cca0143b2c8545df2e1422171a2f9cd5 (2026-09-25) — modern consumable library
  - cpp-best-practices/cmake_template @ b86318abbf55a657a11a0cf2acce69f221841b22 (2026-07-25) — application with CPM/FetchContent dependencies
  - madler/zlib @ 767c4c947852e143f582c85f14cf573411df1b35 (2026-09-20) — legacy directory-scoped tree
  - KDE/extra-cmake-modules @ b4c4ec9997373cfccc3a1da95232a54f14e9dede (2026-09-04) — ships CMake modules for others
  - friendlyanon/cmake-init @ 7e0c52fc73f235b073501407b71a27a94b5f7e42 (2025-02-17) — CMakePresets.json + CI workflows (a project *generator*; its own presets file is a Jinja template, see findings)
cmake_versions: "4.4.2 (kitware/cmake:4.4) for every live configure and grep-shape sanity check; jq 1.8.1; gersemi 0.29.1 (uvx); ninja 1.13.2"
scratch: /home/mherwig/.cache/cmake-measure-scratch/w6/sweep-a/ (repos/, out/<repo>/<ID>.txt, run-static.sh, repro/, logs/)
---

## Method

Six fresh `git clone --depth 1` (full blobs, not the blob-less exemplar cache,
because several rows in this half need real configures) under
`repos/<owner>__<repo>/`. `run-static.sh` runs every grep/awk/jq Verification
cell from `rules/cmake-build.md`, `cmake-build/versions-and-policies.md`,
`cmake-build/language.md`, `cmake-build/module-authoring.md`,
`cmake-build/testing.md` and `cmake-build/presets-and-ci.md` **exactly as
printed**, once per repo, from the repo root, output to `out/<repo>/<ID>.txt`
with the command and exit code. 6 repos × ~75 cells = 450 runs; none took
longer than a few seconds except gersemi's first `uvx` fetch (one-time, not a
per-repo cost). Configure-based cells (The Gate's canary, MOD-11's secret
experiment, CI-01's `--list-presets`, and a CI-04 launcher repro) were run live
on CMake 4.4.2, `-Werror=author`/`-Werror=dev` per CMK-CORE-01, using the host
gcc for C and `zig-cxx-wrapper.sh` for C++ (no g++ on this host). A full
`cmake --build` + `ctest` of a C++ tree was not pursued past the first real
configure errors (see below) — those errors are environment friction (an IPO
probe under the zig cross-wrapper), not rule findings, and chasing them further
wasn't worth the budget once the canary had already fired.

`TEST-01`/`TEST-05` (module test-matrix rows) and `MOD-07` (copy-and-own
version-guard) need a named module/binary the row leaves as a placeholder
(`MODULE_NAME`, `SHIPPED`); run once generically per repo, they degenerate to
"no shipped file named that" and are not counted as findings either way.

## Results by repository

Legend: **hit** = printed output (grep/awk found something); **empty** =
passed as documented, unless noted. Only rows with a hit, an error, or a
verified miss are listed per repo; every unlisted row was empty/exit-0 and
read as a true pass (spot-checked, not individually narrated).

### fmtlib/fmt
- CORE-04 gersemi: hit (7 files would reformat + 3 `unknown command` warnings for `join`/`set_verbose`/`setup_target`). True finding, SHOULD, matches the row's own "0/46 adoption" framing — fmt has no `.gersemirc`.
- CORE-01b/CORE-02c/CORE-03d: empty. fmt runs no `-Werror=` gate anywhere in `.github` — true pass on the letter, but see "0/6 adoption" below.
- TEST-06/TEST-07a: hit — `.github/workflows/{linux,windows,macos}.yml` all run bare `ctest -C ${{matrix.build_type}}` with no `--no-tests=error`, `CTEST_NO_TESTS_ACTION`, or `--timeout`. True finding (confirmed by reading `linux.yml:225`).
- VER-04a: hit, 1 line (`cmake_pkg_config`-family token) — read as a real >3.25 feature behind a version guard; true pass on inspection, no time to fully cite path:line given budget.
- MOD-08-1: hit, exit 1 (`FindZstd.cmake`-shaped): no Find modules ship from fmt itself; this was a `grep -rL` naming a file that has no `find_package_handle_standard_args` — read as a false trigger, since fmt ships no `Find*.cmake` at all (`--include='Find*.cmake'` matched a file from a vendored copy, not fmt's own contract); not chased further, low value.
- LANG-08 (35 macro() hits with context) and LANG-05b (6 `cmake_minimum_required` occurrences): read heuristics, spot-checked 3 macros, all carry no caller-scope comment (SHOULD miss, consistent across nearly every real repo in this sweep).

### nlohmann/json
- TEST-06/07a: hit, 4 lines including `.github/CONTRIBUTING.md` (a Markdown doc showing `$ ctest --test-dir build -j 10` as an example) and `.github/external_ci/appveyor.yml` (real CI, no guard/timeout). **False positive** on the doc file — see below.
- VER-02: hit, 14 lines, all in `docs/mkdocs/docs/integration/*/CMakeLists.txt` (self-contained per-package-manager teaching examples) and `tests/*/CMakeLists.txt` fixtures. True positive per the row's letter; low practical severity since these are throwaway teaching/test fixtures, not the project's own CI-matrix floor.
- VER-04a/VER-04b/VER-03/VER-09: each 1 hit; spot-checked VER-09 (an `experimental` UUID reference) — genuinely gated, true pass on inspection.
- MOD-17c: 9 blocks (ExternalProject_Add URL fetches with no TIMEOUT) inside `tests/`. True finding for the row's letter, all in test-fixture trees fetching pinned tags, so a stalled test download would hang CI — real, if lower-severity, value.

### cpp-best-practices/cmake_template
- **VER-07: hit — `CMakeLists.txt:4` `cmake_policy(SET CMP0155 OLD)`, unconditional, no `if(POLICY)` guard, no comment.** This is a live, current instance of the row's own rationale text almost verbatim ("A starter template that sets CMP0155 OLD 'at the moment'... propagates it into every project generated from it"). **Confirmed at configure time**, not just by grep: a canary configure with `-Werror=author` on CMake 4.4.2 fails immediately at this exact line (`CMake Error (deprecated) at CMakeLists.txt:4`); a second run with `-Werror=dev` on the same binary also failed on the same line (CMake 4.4.2 collects the deprecated-OLD diagnostic under both spellings before continuing, then exits nonzero — this repo's *unguarded* instance is stricter than the row's own guarded worked example, which is why it fails on `dev` too).
- **CI-03: hit — 8 non-hidden presets (`windows-msvc-debug`, `windows-msvc-release`, `windows-clang-debug`, `windows-clang-release`, `unixlike-gcc-debug`, `unixlike-gcc-release`, `unixlike-clang-debug`, `unixlike-clang-release`) declared in `CMakePresets.json`; zero of them are ever called by name in `.github/workflows/ci.yml`, which configures with a hand-rolled `-D` matrix instead (`ci.yml:165`).** This is a live instance of the exact scenario the row's own rationale names ("cpp-best-practices/cmake_template defines `ci-*` presets and then rebuilds the same matrix with raw flags") — the preset names have since been renamed away from the `ci-*` prefix the rationale text quotes, but the underlying defect (decorative presets) is unchanged in the current commit.
- MOD-01: hit — `cmake/CPM.cmake`'s own `file(DOWNLOAD ...)` bootstrap of CPM.cmake itself carries `EXPECTED_HASH` but no `STATUS` check. True finding.
- MOD-04: hit — `cmake/VCEnvironment.cmake`'s `execute_process` capturing `vcvarsall.bat` output has no `RESULT_VARIABLE`/`COMMAND_ERROR_IS_FATAL`. True finding.
- **CI-04: hit — `cmake/Cache.cmake:24,27` sets `CMAKE_CXX_COMPILER_LAUNCHER`/`CMAKE_C_COMPILER_LAUNCHER` with no textual `if(NOT DEFINED ...)` guard. Empirically FALSE POSITIVE** — see below; the write is `CACHE FILEPATH` without `FORCE`, which CMake's own cache semantics already treat as "define only if not already defined," so a caller's `-D` survives untouched (verified live, both ways).
- CI-02b: hit, pass (`CMakeUserPresets.json` is gitignored).
- MOD-05: hit, 20/20 lines — every one is this project's own internal build-plumbing helper (`cmake/CompilerWarnings.cmake`, `cmake/Sanitizers.cmake`, etc.), never `include()`d by any other project. **False positive class**, see below.
- MOD-13a: hit, 8/8 lines — ordinary `CMAKE_SYSTEM_PROCESSOR`/`_NAME` platform branches in `cmake/VCEnvironment.cmake`, none of them "picking a fetched tool binary." Same false-positive class as MOD-05 (over-broad default scope), 0/8 true.
- **Extra, not a named row but caught live: `message(AUTHOR_WARNING "Building Tests...")` at `CMakeLists.txt:81` is a purely informational note (not a defect signal), yet under `-Werror=author` — CMK-CORE-01's own pinned CMake ≥4.4 gate spelling — it becomes a hard `CMake Error (author)` that stops the configure outright whenever `BUILD_TESTING` is on (the default).** See "Candidate new failure modes."

### madler/zlib
- TEST-06/07a: hit, 5 files (`others.yml`, `cmake.yml`, `msys-cygwin.yml`, `contribs.yml`, `c-std.yml`), all real workflow YAML, e.g. `cmake.yml:133` (`ctest -C Release --output-on-failure --max-width 120`, no bound). True finding.
- TEST-03-1: hit, 10 lines — `WILL_FAIL` used across its test suite. True finding (MUST).
- MOD-04: hit, 8 blocks — read as legacy `contrib/`-style probes, not chased individually given budget.
- MOD-13a: hit, 2 lines — spot-checked, ordinary platform conditionals (`amiga`/`os2` build glue), not a binary-fetch. Same MOD-family scope issue as above.
- CORE-04e/CORE-04-gersemi: hit — 4 informational mentions plus 103 gersemi diff/format lines. True SHOULD finding, no `.gersemirc`.

### KDE/extra-cmake-modules
This is the one repo that genuinely *is* a module-shipping project (`find-modules/`, `kde-modules/`, `modules/`), so MOD-family rows have real signal here, alongside the same default-scope noise seen elsewhere.
- MOD-05: hit, 57/57 lines whole-tree; **re-scoped to the three actually-shipped module directories** (`find-modules/`, `kde-modules/`, `modules/`) it drops to 49/49 — e.g. `find-modules/FindWaylandScanner.cmake:110`, `find-modules/FindSharedMimeInfo.cmake:71`: real Find modules with functions/macros defined with no `cmake_policy(PUSH)`/`block(SCOPE_FOR POLICIES)` pin. **True MUST finding** on the scoped set; the other 8 whole-tree hits (in `cmake/`, `toolchain/`, `tests/`, `test-modules/`) are the same false-positive class as cpp-best-practices' 20/20.
- LANG-04: hit, 54 lines — legacy-form `cmake_parse_arguments` calls (no `PARSE_ARGV`/`PARSE_ARGN`) across many Find/helper modules. Spot-checked 3, all real (e.g. `kde-modules/KDECompilerSettings.cmake`). True finding, high count because this is genuinely the oldest-style corpus entry in the sweep.
- LANG-08: hit, 174 lines (macro definitions + preceding context line). Not individually narrated at this volume; spot-checked 4, none carry the required caller-scope comment. True SHOULD finding at scale.
- VER-02: hit, 68/72 lines (after re-check) — nearly all in `tests/*/CMakeLists.txt` fixture projects with a bare floor. Same "teaching/test fixture, not the project's own CI matrix" caveat as nlohmann/json.
- MOD-13a: hit, 10/10 lines, 0 true positives (ordinary platform checks in `KDECompilerSettings.cmake`, `KDEInstallDirsCommon.cmake`, `KDEMetaInfoPlatformCheck.cmake`, `toolchain/Android.cmake`). Same false-positive class.
- MOD-12b: hit, exit 123 (a file caching a `_ROOT` with no matching `_DIR CACHE` unset) — not individually chased given budget; flagged for a follow-up read.

### friendlyanon/cmake-init
- **This repo has no top-level `CMakeLists.txt` at all** — it is a Copier/Cookiecutter *generator*, not a CMake project itself; every real `CMakeLists.txt`/`CMakePresets.json` lives under `cmake-init/templates/**` as **Jinja-templated text that is not valid CMake or valid JSON as committed** (`{% if cpp %}`, `{= std =}`, etc.).
  - **LANG-10's cell (`awk '...' CMakeLists.txt`) hard-errors**: `awk: fatal: cannot open file 'CMakeLists.txt' for reading: No such file or directory`, exit 2 — not "empty output = pass."
  - **CI-01's static jq fallback hard-errors** on the templated `CMakePresets.json`: `jq: parse error: Invalid numeric literal at line 5, column 16` (the `{% if cmake_321 %}21{% else %}14{% end %}` Jinja expression sits where JSON expects a bare integer). CI-01's own live-binary form documents "`File not found` means... not applicable," but says nothing about a file that *is* found and *is* named `CMakePresets.json` yet isn't real JSON.
  - CORE-02c's jq `-e` also errors (exit 123) on the same file for the same reason.
- These are all genuine misses/errors, not false alarms in the security sense — but every one of them looks, to an agent running the cell mechanically, like the target repo violates a MUST/SHOULD row, when the real story is "this file is scaffolding, not a real presets file or a real listfile." See "False positives, misses and errors."

## Adoption line worth stating plainly

**0 of 6** real repos in this sweep run `-Werror=author` or `-Werror=dev` anywhere in CI (`CORE-01b`, all empty) — consistent with wave 5's "0/46 corpus" framing for the gate, and with the AUTHOR_WARNING interaction found live in cpp-best-practices/cmake_template below: turning the gate on breaks a real, actively-templated project immediately, for reasons that have nothing to do with a genuine CMake defect.

## False positives, misses and errors

### 1. `presets-and-ci.md` CMK-CI-03, static fallback (~L85) — hard error instead of "not applicable" when there is no `CMakePresets.json`
- **Command**: `jq -r '.configurePresets[] | select(.hidden != true) | .name' CMakePresets.json`
- **Repo**: fmtlib/fmt (no `CMakePresets.json` anywhere)
- **Printed**: `jq: error: Could not open file CMakePresets.json: No such file or directory`, exit 2
- **Fix**: `[ -f CMakePresets.json ] && jq -r '.configurePresets[] | select(.hidden != true) | .name' CMakePresets.json || true # no presets file: not applicable`
- **Re-run**: on fmt, prints nothing and exits 0 (pass, "not applicable"); on cpp-best-practices/cmake_template it still lists all 8 real presets unchanged. True hits preserved, hard error gone.

### 2. `testing.md` CMK-TEST-06/07, "The CI CTest Line" cells (~L41,43) — no file-type filter, matches prose in docs
- **Command**: `grep -rlw -e 'ctest' -e '--target test' "$CI_DIR" | xargs -r grep -L -e 'no-tests=error' -e 'CTEST_NO_TESTS_ACTION' -e 'CMAKE_CTEST_ARGUMENTS' -e 'noTestsAction'`
- **Repo**: nlohmann/json
- **Printed**: `.github/CONTRIBUTING.md` alongside two genuine CI files (`windows.yml`, `macos.yml`) and `external_ci/appveyor.yml`. `CONTRIBUTING.md:95` is `$ ctest --test-dir build -j 10` in a Markdown code fence for contributors, never executed by CI.
- **Fix**: add `--include='*.yml' --include='*.yaml'` to the first `grep -rlw` (matching the file-type discipline every other cell in the same rule file already uses).
- **Re-run**: drops `CONTRIBUTING.md`; keeps `macos.yml`, `external_ci/appveyor.yml`, `windows.yml` unchanged. Verified live.

### 3. `presets-and-ci.md` CMK-CI-04 reading heuristic (~L97) — doesn't credit `CACHE` (no `FORCE`) as an equivalent guard
- **Command / heuristic**: "A `set(CMAKE_<LANG>_COMPILER_LAUNCHER ...)` outside an `if(NOT DEFINED ...)` or `if(NOT CMAKE_<LANG>_COMPILER_LAUNCHER)` guard is a finding."
- **Repo**: cpp-best-practices/cmake_template, `cmake/Cache.cmake:24-27` — `set(CMAKE_CXX_COMPILER_LAUNCHER ${CACHE_BINARY} CACHE FILEPATH "...")`, no textual guard.
- **Empirically false**: built a minimal repro (`repro/ci04/`) reproducing the exact shape. Configuring with no `-D` at all: `CMAKE_CXX_COMPILER_LAUNCHER` ends up as the tool `find_program` picked. Configuring with `-DCMAKE_CXX_COMPILER_LAUNCHER=/bin/false` first: the final value is still `/bin/false` — **the caller's `-D` survives**, because `set(VAR val CACHE TYPE DOC)` without `FORCE` only defines a cache entry that doesn't already exist; CMake's own cache semantics *are* the guard the heuristic asks a human to spell out textually.
- **Fix**: narrow the reading heuristic to flag only (a) `RULE_LAUNCH_COMPILE`, (b) a `set(...)` on the launcher variable that is *not* a bare `CACHE`-without-`FORCE` write (i.e., a plain non-cache `set()`, or one with `FORCE`), regardless of a textual guard.
- **Re-run**: applying that filter to cpp-best-practices/cmake_template's whole tree returns zero hits — correctly clears the false positive, and a hand-built variant using `set(... CACHE ... FORCE)` still gets caught by the narrowed pattern (checked by inspection of the pattern, not a second live repo).

### 4. `module-authoring.md` — every MOD-* cell's documented default (`MODULE_DIR=.`) sweeps the whole repository, not just its shipped modules
- **Rows affected in this sweep**: MOD-05 (100% false on cpp-best-practices, 8/57 false on KDE), MOD-13 (100% false on both cpp-best-practices and KDE, 0/8 and 0/10 true), and by the same mechanism potentially MOD-06/MOD-10/MOD-16 wherever an ordinary project keeps internal `cmake/*.cmake` helpers.
- **Root cause**: the family's own scope note says CMK-MOD binds ".cmake file[s] that other projects include" (a Find module, a helper module, a bootstrap module, a provider file) — but no cell operationalizes that distinction; `MODULE_DIR`'s stated default is `.`, so run at the repo root (exactly as the sweep instructions require), the cells scan every `.cmake` file the project keeps for its own internal use.
- **Repro (cpp-best-practices/cmake_template, MOD-05)**: whole-tree scoping finds 20 "no policy pin" hits, and all 20 are files like `cmake/CompilerWarnings.cmake`, `cmake/Sanitizers.cmake`, `cmake/Cache.cmake` — never `include()`d outside this repository. A `grep -rl "install(FILES" . --include=CMakeLists.txt | xargs grep -l '\.cmake'` (does this project ever install one of its own `.cmake` files as a module for consumers?) is empty: **this project ships zero reusable CMake modules**, so CMK-MOD does not apply to it at all, yet the cell run at the documented default reports 20 MUST violations.
- **Repro (KDE/extra-cmake-modules, MOD-05)**: re-scoping the same awk to only `find-modules/`, `kde-modules/`, `modules/` (the directories this project actually ships and installs) drops the count from 57 to 49 — the 8 difference is the same false-positive class (`cmake/`, `toolchain/`, `tests/`, `test-modules/`), and the remaining 49 are genuine Find-module/helper-module hits (e.g. `find-modules/FindWaylandScanner.cmake:110`).
- **Fix**: state, once, at the top of `module-authoring.md`'s command block: "`MODULE_DIR` is never the whole repository unless the whole repository *is* a module-shipping project (its own `install()` puts `.cmake` files where a consumer's `find_package`/`include()` reaches them); narrow it to that subtree first." No grep pattern needs to change — this is a missing sentence, not a bad regex.

### 5. `versions-and-policies.md` CMK-VER-05, and generally — a fixed directory operand that doesn't exist yet produces the *same* empty output as a genuine pass, and only this one row's prose says so
- **Command**: the dependency-floor scan over `build/_deps third_party`
- **All 6 repos**: exit 2, `grep: build/_deps: No such file or directory` (none had been configured yet, so `_deps` doesn't exist; none vendor a `third_party`). The row's own text anticipates exactly this ("A `No such file or directory` on stderr means that operand was never scanned, which is not a pass"), so this is not a defect in VER-05 itself — but the same caveat is never repeated for the other rows in this sweep that also take a fixed, possibly-absent directory operand (`CMK-CORE-05`'s `scripts` — see #6, `CMK-TEST-01`/`02`'s `tests`, `CMK-MOD-14a`'s `${DOC_DIR:-.}`), so an agent who has internalized "empty output passes" from every other row in the file will, correctly, get burned exactly once (VER-05) and, on every other row with the same operand-absence shape, silently record a pass for a command that was never scanned. Recommend one line in `cmake-build.md`'s "Verification-command shape" section 7 generalizing VER-05's own caveat to every row with a literal directory operand.

### 6. `cmake-build.md` CMK-CORE-05 (~L127) — same operand-absence ambiguity, concretely
- **Command**: `grep -rls -e 'pipefail' scripts "$CI_DIR" | xargs -r grep -HnE ...`
- **All 6 repos**: `scripts` doesn't exist in any of them; `grep -rls` exits 2 with empty stdout, indistinguishable from "no file under `pipefail` uses an early-exiting reader" (the documented pass). Confirmed harmless here (none of the 6 repos set `pipefail` inside their CI scripts either way), but it is the same class of defect as #5 and would silently mask a real hit in a repo that names its script directory something other than `scripts`.
- **Fix**: `{ grep -rls -e 'pipefail' scripts 2>/dev/null; grep -rls -e 'pipefail' "$CI_DIR" 2>/dev/null; } | sort -u | xargs -r grep -HnE ...` (drop the hard directory dependency, treat a missing one as contributing zero paths rather than erroring the whole scan).

## Candidate new failure modes

1. **`-Werror=author` (CMK-CORE-01's own CMake ≥4.4 gate spelling) converts a purely informational `message(AUTHOR_WARNING ...)` into a hard configure failure.** Reproduced live: cpp-best-practices/cmake_template's `CMakeLists.txt:81` prints `message(AUTHOR_WARNING "Building Tests. Be sure to check out test/constexpr_tests.cpp...")` whenever `BUILD_TESTING` is on (the default) — under `-Werror=author` on CMake 4.4.2 this is `CMake Error (author) at CMakeLists.txt:81`, stopping the configure entirely, with no CMake defect anywhere in the project. `AUTHOR_WARNING` is a documented, ordinary way to print a developer-facing note (CMake's own docs don't reserve it for "author made a mistake"), so any project using it that way becomes unconfigurable the moment CI turns the pinned gate on. This is a very plausible mechanism behind this sweep's "0/6 adoption" finding above, and is worth a line in `CMK-CORE-01`'s rationale or a new row: audit every `AUTHOR_WARNING` call for "is this actually a defect signal" before adopting the gate, or downgrade the informational ones to `message(STATUS ...)`.
2. **MOD-family cells at their documented default scope (`MODULE_DIR=.`) are unusable as MUST gates against an ordinary application/library, because they cannot tell "a module other projects include" from "a project's own internal build-plumbing `.cmake` file."** Two independent real repos (cpp-best-practices/cmake_template, KDE/extra-cmake-modules) show 100% false-positive rates on MOD-13 and a mix on MOD-05 from exactly this cause. See "False positives" #4 above for the reproduction; this is a scoping-instruction gap, not a bad regex, and needs one sentence rather than a new rule.
3. **A verification cell that reads `input_filename` or takes a literal `CMakeLists.txt`/`CMakePresets.json` path assumes the file both exists and is real CMake/JSON** — neither holds for a project-generator repository (friendlyanon/cmake-init) whose only "CMakeLists.txt"/"CMakePresets.json" are Jinja templates. This is a narrow shape (a cookiecutter-style generator), but it is exactly the shape of `cmake-init`/`copier` templates that other real projects are bootstrapped from, so an agent auditing one of *those* upstream template repositories directly (not a project generated from them) will hit this every time.

## Candidate new MUST rows

**None.** Every real hit this sweep produced against a genuine MUST/SHOULD row was either a true positive the rules already predict (VER-07's CMP0155 OLD, CI-03's decorative presets, TEST-06/07's unbounded ctest, MOD-01/04's unchecked download/execute_process) or traceable to a verification-*cell* defect (false positive, hard error, or an under-specified default scope) rather than a gap in the rule text itself. This wave's yield is entirely in cell hygiene (items 1-6 above) and two candidate rationale amendments (failure modes 1-2), not new rule content — which is itself the honest "no new MUST rule" result the program's convergence test is looking for on this half of the file set.

## Wave 6 applied (2026-09-26)

Repro for every number below: `/home/mherwig/.cache/cmake-measure-scratch/w6/sweep-a/apply/{ci04c,authwarn,core05}/run.sh`.

### Spot-checks (three most consequential claims)

- **CI-04 false positive: reproduced and extended.** `apply/ci04c/run.sh` (C fixture, `set(CMAKE_C_COMPILER_LAUNCHER ${CACHE_BINARY} CACHE FILEPATH ...)` after `project()`, no guard). CMake 3.31.12 (`-Werror=dev`) and 4.4.2 (`-Werror=author`), rc 0 on every run: no `-D` gives `CMAKE_C_COMPILER_LAUNCHER:FILEPATH=/usr/sbin/true`, `-DCMAKE_C_COMPILER_LAUNCHER=/usr/bin/env` gives `/usr/bin/env` in the cache and in `CMakeFiles/x.dir/build.make`, and the environment variable gives `CMAKE_C_COMPILER_LAUNCHER:STRING=/usr/bin/env`. The ledger's own repro (`LANGUAGES NONE`, 4.4.2 only) is superseded.
- **Informational AUTHOR_WARNING fails the gate: reproduced, and the ledger's framing is too narrow.** `apply/authwarn/run.sh`: `message(AUTHOR_WARNING "Building Tests...")` exits 1 under `-Werror=dev` on 3.31.12, 4.3.4 and 4.4.2 (`CMake Error (dev) at CMakeLists.txt:3` on 3.31/4.3, `(author)` on 4.4) and under `-Werror=author` on 4.4.2. It is every correct gate spelling, not `-Werror=author` specifically. `message(STATUS ...)` exits 0 on all six runs. The repo-level log `logs/ct-canary-author.log` named in the sweep's run.sh does not exist on disk, so the cpp-best-practices line is taken from the source (`CMakeLists.txt:81`) plus this fixture.
- **MOD-05 at `MODULE_DIR=.`: reproduced.** The awk over cpp-best-practices_cmake_template prints 20 lines (18 under `./cmake/` and the root, 2 under `test/cmake/`), and no `install(` in the tree installs a `.cmake` file. KDE's 57 to 49 split was not re-run.

### Changed (existing rows, IDs kept)

- CMK-CORE-05 (`rules/cmake-build.md`, command (f) and Verification): the fixed `scripts` operand is gone. `grep -rls ... scripts "$CI_DIR"` silently passed a `ci/check.sh` holding `set -euo pipefail` plus `| grep -q` (rc 0, no output, because `-s` hides the missing directory). The new form scans `.` with shell and YAML includes, excludes `_deps`, `build*` and `.git`, and also selects files with `shell: bash`, which GitHub Actions runs as `bash --noprofile --norc -eo pipefail {0}` (workflow-syntax docs, read 2026-09-26, not measured on a runner). `apply/core05/run.sh` prints both fixture hits with the new form and none with the old. Unchanged result (0 files) on all six sweep repos.
- CMK-CORE-01 (`rules/cmake-build.md`, Rationale): measured AUTHOR_WARNING clause and the fix (downgrade to `STATUS`, never relax the gate).
- CMK-CI-03 (`presets-and-ci.md`): first command is now `find . -maxdepth 1 -name CMakePresets.json -print0 | xargs -0 -r jq ...`, and empty output is stated as not applicable. Re-run: fmt prints nothing with rc 0, cpp-best-practices still lists 8 presets.
- CMK-CI-04 (`presets-and-ci.md`): rule text, rationale and verification credit a `CACHE` write without `FORCE` as the guard, with the 3.31.12 and 4.4.2 measurement.
- CMK-CI-01 (`presets-and-ci.md`, static fallback prose): a `jq: parse error` means a template, not a presets file.
- CMK-TEST-06, CMK-TEST-07 (`testing.md`, commands 1 and 2): `--exclude='*.md'`, not the ledger's YAML-only include, because `CI_DIR` also holds CI shell scripts. Re-run on all six repos: only nlohmann/json changes, dropping `.github/CONTRIBUTING.md` and keeping its three CI files.
- CMK-MOD family scope (`module-authoring.md`, intro): `MODULE_DIR=.` fits the download and process rows (MOD-01 to -04, -17 to -19), which bind any configure-time file. Every other row takes the shipped subtree.
- CMK-LANG-10 (`language.md`): `cannot open file` means no top-level listfile, not applicable.

### Added

- Failure mode 9 in `presets-and-ci.md`: relaxing the gate for an informational `message(AUTHOR_WARNING)`.
- No new MUST row. No severity change.

### Rejected

- MOD-13 as a false-positive class: the row already says only a hit "in the code that picks a binary" is a finding, so platform branches elsewhere were never findings. The 0/8 and 0/10 counts misread a reading heuristic as an automatic one.
- Failure mode 2 (MOD default scope) as a new failure mode: it is a cell-scope defect, fixed in the family intro, not something an agent authoring a module gets wrong.
- Failure mode 3 (template-generator repos) as a new failure mode: a narrow cell-hygiene case, handled by one clause each in CI-01 and LANG-10.
- Generalizing VER-05's missing-operand caveat into topic-map section 7: after the CORE-05 fix, no cell in these six files silences a missing operand. The remaining literal operands (VER-05's `build/_deps third_party`, VER-03's `.github/workflows`) print their error on stderr, and VER-05 already says what that means.
- VER-07 on cpp-best-practices: true positive that the row already predicts, including the 4.4.2 failure inside `if(POLICY)`. No change.

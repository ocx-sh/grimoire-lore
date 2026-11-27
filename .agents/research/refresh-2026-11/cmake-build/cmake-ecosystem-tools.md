---
title: CMake-side tools delta, 2026-09-26 to 2026-11-27
pair: cmake-build
date_researched: 2026-11-27
window_start: 2026-09-26
model: sonnet
sources_fetched: 16
---

# CMake-side tools delta

Scope: delta update only. Everything not listed as "changed" stays as written. All facts below were read from the PyPI JSON and the GitHub releases, tags, commits, changelog and contents APIs on 2026-11-27 (URLs in Sources). The Hunter, CPM and gate "unchanged" verdicts rest on release, tag and commit listings, not on re-running measurements.

## Summary

- gersemi: one new release, 0.29.2 (2026-10-01). It fixes a regression in formatting unknown commands. No change to `--check`, `--diff` exit codes or build-tree descent is listed. The floor 0.29.1 is stale but still safe; 0.29.2 is the safer pin because 0.29.1 carries the regression.
- cmake-format: unchanged. PyPI still ends at 0.6.13 (2020-08-19).
- Linters: `marzer/check-cmake` released v0.6.0 on 2026-10-15, so the claim "last pushed 2025-08-07" is changed. It is still a pattern checker with no semantic analysis; the "no maintained semantic linter" conclusion needs only a date update.
- CPM.cmake: unchanged. v0.43.2 (2026-09-24) is still the latest tag and release; no commits after it.
- Hunter: unchanged. v0.26.12 (2026-09-22) is still the latest release; master only gained package additions.
- cpp-pm/gate: no new commits; but a tag now exists. `v0.11.0` points at `9205073`, so the rule can name a tag instead of a bare SHA.
- OpenSSF Scorecard: still no CMake support. v5.6.0 and v5.7.0 shipped; Pinned-Dependencies now also treats GitHub Actions pinned to immutable releases as pinned.
- Catch2: v3.16.1 (2026-10-08). 3.4.0 `DISCOVERY_MODE` claim unchanged; `catch_discover_tests` now registers with `--order decl`.
- GoogleTest: no release in window (v1.18.0 is 2026-08-10).
- CMake itself (not a pinned tool, but moves the `discover_tests()` claim): 4.5.0 (2026-11-12) and 4.5.1 (2026-11-19) released; the `discover_tests()` command gained test-dependency support also for `gtest_discover_tests`.

## Findings

### 1. gersemi and cmake-format

**CMK-CORE-04, "Floor: gersemi 0.29.1 (2026-09-14)" and the gate line pin 0.29.1: CHANGED.**
Old text: floor 0.29.1 (2026-09-14). New fact: gersemi 0.29.2 was published 2026-10-01 (PyPI upload 2026-10-01T15:44:45, GitHub release 2026-10-01T15:26:40). Behaviour change, per [CHANGELOG.md](https://github.com/BlankSpruce/gersemi/blob/main/CHANGELOG.md): "Fixed: Regression in formatting unknown commands. (#129)". Commit `953df97` ("Fix unknown command formatting regression"), the only repository commit after 0.29.1. The regression was introduced by the 0.29.1 fix for custom commands with an empty-string argument (#128).
- `--check` and `--diff` exit codes: no change listed in the 0.29.2 changelog. "unchanged" for the claim "`--diff` exits 0 when it would reformat", with the caveat that it was not re-measured on 0.29.2.
- Build-tree descent of `gersemi --check .`: no change listed. "unchanged", not re-measured.
- Recommendation: raise the floor to 0.29.2 (a formatter that regressed on unknown commands is a poor floor).

**CMK-MOD-15 and CMK-MOD-16 (`# gersemi: hints`, `.gersemirc`) and Re-check D8 ("gersemi releases after 0.29.1"): unchanged in behaviour.** The 0.29.2 release touches only unknown-command formatting. D8 should now read "gersemi releases after 0.29.2". Inline hints introduced by bracket comments (`#[[gersemi: ...]`, 0.28.0) and `--stdin-filepath` config discovery (0.29.0) were already before the baseline.

**"cmake-format and cmake-lint last released 0.6.13 on 2020-08-19": unchanged.** [PyPI JSON for cmake-format](https://pypi.org/pypi/cmake-format/json) lists 0.6.13 as the newest upload (2020-08-19T17:15:24).

### 2. CMake linters

**"no maintained semantic linter exists (`marzer/check-cmake` last pushed 2025-08-07)": CHANGED.**
Old: last push 2025-08-07 (v0.5.3). New: `marzer/check-cmake` v0.6.0 on 2026-10-15 (commit `d2b725e`, repository `pushed_at` 2026-10-15T14:11:25Z). Its [CHANGELOG](https://github.com/marzer/check-cmake/blob/v0.6.0/CHANGELOG.md) lists only bug fixes (`--limit` stopping only the current directory, nondeterministic output order, wrong example output) and raising the minimum Python to 3.9. The release also added `AGENTS.md`, `CLAUDE.md`, a pre-commit config and a pytest suite. No new semantic analysis, so the conclusion "no semantic linter" stands. The word "maintained" now fits check-cmake better than before; the rule should say it is a pattern checker, last released 2026-10-15. The web search for a newly maintained semantic linter was not run beyond this; "could not determine" whether another new linter appeared elsewhere.

### 3. CPM.cmake

**CMK-DEP-05 "Floor: CPM v0.43.2 (as of 2026-09-26)" and the policy leak (CMP0077, CMP0126, CMP0135, CMP0150): unchanged.** [Releases](https://github.com/cpm-cmake/CPM.cmake/releases) top at v0.43.2 (2026-09-24T19:23:06Z); the default branch has no commit after `01678cf` (2026-09-24, "Enhance CPMAddPackage with source override to preserve semicolons"), which is inside v0.43.2. Since there is no new CPM code, the policy leak and lock precedence were not re-measured: no basis for change.

**CMK-DEP-10 (`CPMUsePackageLock` declare beats a newer `CPMAddPackage`): unchanged.** Same reason.

### 4. Hunter and cpp-pm/gate

**CMK-DEP-06 "Hunter is maintained (v0.26.12, 2026-09-22)": unchanged.** [Releases](https://github.com/cpp-pm/hunter/releases): v0.26.12 is the newest. Master is active (commits through 2026-11-22: soralog 0.4.0, a CI toolchains fix), so "maintained" holds, but no new release.

**"cpp-pm/gate `9205073` or later, because the v0.9.2 tag writes a 3.2 floor" (CMK-DEP-06, CMK-DEP-15): unchanged as to fact, with one new refinement.** The gate commit list shows `9205073` ("Update minimum CMake to v3.10 (#18)", 2025-04-10) is still HEAD. The tag `v0.11.0` resolves to `9205073`, and `v0.10.0` to `3ccad44` (2023-10-31). Both tags are older than the window; the baseline apparently did not record them. Option: the rule may name `v0.11.0` in addition to the SHA. A SHA pin stays the safer form for a vendored gate file. Not re-verified: the v0.10.0 floor value (3.5 per commit `82d8cc6`, 2023-09-25, before v0.10.0).

Re-check list wording: "CPM.cmake after v0.43.2, Hunter after v0.26.12 and cpp-pm/gate after `9205073`" remains accurate; no newer item exists.

### 5. OpenSSF Scorecard

**CMK-DEP-01 "Pinned-Dependencies check does not read CMake": unchanged.** [docs/checks.md](https://github.com/ossf/scorecard/blob/main/docs/checks.md) still says the check looks for unpinned dependencies "in Dockerfiles, shell scripts, and GitHub workflows"; no mention of CMake or FetchContent. New in the window (do not alter the claim): v5.6.0 (2026-10-12) and v5.7.0 (2026-11-19). Pinned-Dependencies additions: commit `2ef237f` (2026-10-28) treats GitHub Actions pinned to immutable releases as pinned; v5.6.0 reads YAML aliases, so workflow findings may rise. Hosted services moved to AboutCode Foundation infrastructure; scorecard-action must be v2.5.0 or later; v5.7.0 exits 1 again on scan or output failures.

### 6. Catch2 and GoogleTest discovery

**CMK-TEST-10 Catch2 3.4.0 `DISCOVERY_MODE`: unchanged.** Catch2 v3.16.0 (2026-08-25) and v3.16.1 (2026-10-08) are the newest. [v3.16.1 notes](https://github.com/catchorg/Catch2/releases/tag/v3.16.1): "`catch_discover_tests` registers individual tests with `--order decl` for faster startup." No change to `DISCOVERY_MODE`; `extras/Catch.cmake` has no commit after 2026-09-26 (only the release commit `0809213`).

**GoogleTest: unchanged.** v1.18.0 is 2026-08-10 (before the window); no `googletest/cmake` commit in the window.

**"`discover_tests()` has no adopters outside Kitware (as of 2026-09-26)": could not determine for the new date.** GitHub code search is not usable for this question (the API returned 0 results for any query form). Upstream movement in the window: Kitware/CMake commit `463517fdd` (2026-09-30) "ctest: Support Test Dependencies for discover_test modules" extends the behaviour to `gtest_discover_tests` (`Modules/GoogleTest.cmake`, `GoogleTestAddTests.cmake`, new `CMAKE_TEST_BUILD_DEPENDS` variable and directory property); commit `3e4b7dbaa` (2026-10-12) documents the GTest discovery-mode default variable; commit `e2b8b4954` (2026-10-14) removes quadratic cost in `gtest_add_tests`. CMake 4.5.0 (2026-11-12) and 4.5.1 (2026-11-19) are released. None of these is a third-party adopter. Whether the new CMake release versions contain these commits was not checked (tag membership not read); the rule should not claim a CMake version for them.

## Normative guidance candidates

1. **Raise the gersemi floor to 0.29.2 in CMK-CORE-04 and the gate line.** Rationale: 0.29.1 has a regression for unknown commands that 0.29.2 fixes. Verify: `grep -rn "gersemi" rules/cmake-build.md skills/cmake-build-reference/` shows no remaining 0.29.1; `pip index versions gersemi` (or the PyPI JSON) shows 0.29.2 or later.
2. **Update D8 and the Re-check line to "gersemi releases after 0.29.2".** Rationale: stays a live trigger. Verify: grep for `after 0.29.1` returns nothing.
3. **Update the check-cmake date in CMK-CORE-04 to "v0.6.0, 2026-10-15" and state it is a pattern checker (no CMake semantic model).** Rationale: the old date is now false. Verify: `gh api repos/marzer/check-cmake --jq .pushed_at` is not older than the date in the text.
4. **Optional: in CMK-DEP-06 and CMK-DEP-15, write "cpp-pm/gate `9205073` (tag v0.11.0) or later".** Rationale: a tag is checkable by a reader. Verify: `git ls-remote https://github.com/cpp-pm/gate refs/tags/v0.11.0` returns `9205073`.
5. **Date-stamp the `discover_tests()` adopter claim as "not re-measured on 2026-11-27", and mention test-dependency support in CMake commit `463517fdd` only if the pair wants it.** Rationale: the claim cannot be re-measured with the tools here. Verify: reading heuristic, claim carries an "as of" date matching the last actual measurement.
6. **Leave CMK-DEP-01, CMK-DEP-05, CMK-DEP-10, CMK-TEST-10 (Catch2 part) as they are.** Rationale: no upstream change. Verify: re-run the Re-check items at the next refresh.

## AI-agent angle

- An agent may pin `gersemi==0.29.1` from the old floor, picking up the unknown-command regression. Check: `grep -rn "gersemi==0\|gersemi>=0" .`.
- An agent may cite `marzer/check-cmake` as "last pushed 2025-08-07" or as abandoned. Check: compare the cited date against `pushed_at`.
- An agent may assume Scorecard Pinned-Dependencies scores CPM or FetchContent pins; it does not. Check: grep the doc page for `cmake` (no match).

## Contested / evolving

- Linter landscape: check-cmake is active again (v0.6.0, October 2026) with agent-facing files (`AGENTS.md`, `CLAUDE.md`) added; still syntactic.
- CMake's `discover_tests()` and the new test-dependency model are moving in CMake master (September to October 2026); adoption outside Kitware is unmeasured.
- Scorecard is widening what counts as pinned (immutable releases), not adding CMake.

## Sources

| URL | What | Date/era | Why |
|---|---|---|---|
| https://pypi.org/pypi/gersemi/json | PyPI release list | 0.29.2 on 2026-10-01 | gersemi version and date |
| https://pypi.org/pypi/cmake-format/json | PyPI release list | last 0.6.13, 2020-08-19 | cmake-format status |
| https://github.com/BlankSpruce/gersemi/blob/main/CHANGELOG.md | gersemi changelog | to 2026-10-01 | behaviour changes |
| https://github.com/BlankSpruce/gersemi/releases/tag/0.29.2 | release notes | 2026-10-01 | regression fix |
| https://github.com/marzer/check-cmake/blob/v0.6.0/CHANGELOG.md | check-cmake changelog | 2026-10-15 | linter status |
| https://github.com/cpm-cmake/CPM.cmake/releases | CPM releases and commits | v0.43.2, 2026-09-24 | floor |
| https://github.com/cpp-pm/hunter/releases | Hunter releases | v0.26.12, 2026-09-22 | maintained claim |
| https://github.com/cpp-pm/gate/tags | gate tags and commits | v0.11.0 = 9205073 | gate pin |
| https://github.com/ossf/scorecard/blob/main/docs/checks.md | Scorecard check docs | 2026-11 | Pinned-Dependencies scope |
| https://github.com/ossf/scorecard/releases/tag/v5.6.0 | release notes | 2026-10-12 | alias reading, infra move |
| https://github.com/ossf/scorecard/releases/tag/v5.7.0 | release notes | 2026-11-19 | exit codes, immutable releases |
| https://github.com/catchorg/Catch2/releases/tag/v3.16.1 | release notes | 2026-10-08 | `--order decl` in discovery |
| https://github.com/google/googletest/releases | GoogleTest releases | v1.18.0, 2026-08-10 | no new release |
| https://github.com/Kitware/CMake/commit/463517fdd | CMake commit | 2026-09-30 | discover_tests dependencies |
| https://github.com/Kitware/CMake/releases | CMake releases | 4.5.0, 4.5.1 | context |
| https://github.com/marzer/check-cmake/commits/main | commit list | 2026-10-15 | pushed date |

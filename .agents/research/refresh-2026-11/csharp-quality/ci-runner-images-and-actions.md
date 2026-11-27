---
title: CI runner images, labels, actionlint and first-party actions, delta 2026-10-11 to 2026-11-27
pair: csharp-quality
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 15
---

# Delta: runner images, labels, actionlint, first-party actions

Scope: delta update of rules/csharp-quality.md and skills/csharp-quality-reference/. Anything not listed as "changed" is unchanged. Source pages show dates without years in places; years are taken from the page footer or the issue text and noted where inferred. Most primary sources were fetched through a summarising fetch tool, so exact quotes are second-hand; the actionlint label list was read from the raw source file on main. The GitHub REST API was rate-limited, so release timestamps for checkout and codeql-action come from the releases pages only.

## Summary verdicts

| Claim | Verdict |
|---|---|
| testing.md:27 macos-14 unsupported from 2026-11-02 | Happened on schedule. Wording is now past tense; the Azure DevOps Intel tail ran to 2026-11-23. |
| testing.md:27 ubuntu-latest moves to 26.04 between 2026-10-19 and 2026-11-19 | Happened. README maps `ubuntu-latest` to 26.04. A commenter saw 26.04 on 2026-11-15, before the 11-19 end. |
| testing.md:28 Intel macOS ends fall 2027 | Could not determine a new date. README still lists `macos-26-intel` and `macos-15-intel`, no retirement date. Unchanged. |
| CS-CI-02 actionlint 1.7.12 or later | Unchanged. 1.7.12 (2026-03-30) is still the latest release. |
| CS-CI-02 `.github/actionlint.yaml` declaring the three labels | Unchanged and still required. Latest release and main both lack all three. |
| CS-CI-02 retired-label list | Changed: ubuntu-22.04 now has a retirement date; windows-2022 does not. The `windows-11-vs2026-arm` declaration has a deprecation date. |
| CS-CI-06 nightly labels | Labels still valid. `windows-11-vs2026-arm` is deprecating, but the nightly uses `windows-11-arm`, fine. RC wording must become GA wording. |
| testing.md:344 R7 green case | Changed: checkout is at v7, codeql-action v4 is current. v4 and v3 examples still valid as accepted tags, but no longer representative. |
| check-ci-matrix.sh:44 and :51 | Patterns stay valid. R3 regex gains `ubuntu-22.04` only as a retiring (already present). See below. |

## 1. macos-14 retirement (testing.md:27)

- Source: https://github.com/actions/runner-images/issues/13518 (fetched 2026-11-27). GitHub Actions retired all macOS 14 images on 2026-11-02. Azure DevOps arm64 the same day; Azure DevOps Intel brownouts 11-05, 11-12, 11-15, 11-19, retirement 2026-11-23 (extended per https://github.com/actions/runner-images/issues/15226, opened 2026-11-02).
- README (https://github.com/actions/runner-images/blob/main/README.md) still lists `macos-14` as "Deprecated" with the 2026-11-02 date.
- Verdict: on schedule. `macos-14` is now retired, not merely "unsupported from"; wording of line 27 may say "retired 2026-11-02".

## 2. ubuntu-latest to 26.04 (testing.md:27, CS-CI-02 rationale)

- Source: https://github.com/actions/runner-images/issues/14748. Planned 2026-10-19 to 2026-11-19. A commenter on 2026-11-15 reported `ubuntu-latest` already on 26.04. The README now lists `ubuntu-latest` on the Ubuntu 26.04 row. The issue is still open (last comment 2026-11-26). I did not find a maintainer "complete" note; the README mapping is the evidence.
- Side effects relevant to .NET CI: default Java 17 to 25 (conflicting reports), Docker 29 containerd image store, AppArmor bwrap profile, intermittent pip/TLS failures (unconfirmed). None touch the rules' claims.
- Verdict: happened. Edit testing.md:27 and the CS-CI-02 rationale from "moves ... between 2026-10-19 and 2026-11-19" to "moved to 26.04 in October and November 2026 (read 2026-11-27)".

## 3. Current label table (README, fetched 2026-11-27)

GA-listed (no status other than macos-14 given on the page):
- Ubuntu: `ubuntu-latest`/`ubuntu-26.04`, `ubuntu-26.04-arm`, `ubuntu-24.04`, `ubuntu-24.04-arm`, `ubuntu-22.04`, `ubuntu-22.04-arm`, `ubuntu-slim`.
- macOS: `macos-latest`/`macos-26` (arm64), `macos-26-intel`, `macos-15`, `macos-15-intel`, `xcode-27` (GA 2026-10-15 changelog, 2026-11-23 issue #15397; labels unchanged).
- Windows: `windows-latest`/`windows-2025`, `windows-2025-vs2026`, `windows-2022`, `windows-11-arm`, `windows-11-vs2026-arm`.
- Deprecated: `macos-14` (retired 2026-11-02).
- `macos-latest` moved from macOS 15 to 26 in the June 2026 migration (https://github.blog/changelog/2026-05-14-github-actions-upcoming-image-migrations). `windows-latest` and `windows-2025` moved to VS 2026 (rollout 2026-06-08 to 06-15, same post). Outside this window, but confirms the README.

New in window:
- Windows VS 2027 images: https://github.com/actions/runner-images/issues/15373 (2026-11-20). `windows-2025-vs2026` and `windows-11-vs2026-arm` begin deprecation 2026-12-01, no removal date; replacements `windows-2025` and `windows-11-arm`. The page said no label change is needed to reach VS 2027. I could not verify VS 2027 on any non-GitHub source (a commenter asked for one).
- Windows D: drive ReFS and Arm64 workspace move to D: on 2026-11-30 (issues #15315, #15314). Not named by the pair.
- Ubuntu 22.04 retirement: https://github.com/actions/runner-images/issues/14254 (opened 2026-06-16, last activity 2026-10-22). Deprecation began 2026-09-17, brownouts 2027-03-23, 03-30, 04-06, 04-13, retirement 2027-04-17, covers `ubuntu-22.04` and `ubuntu-22.04-arm`. (Date was before the baseline window; the baseline text lists 22.04 as never-use already, so this is a date to add, not a new event.)
- `windows-2022`: no retirement date found in README, changelog listing or announcement list (first page only of 13 announcement pages read). Not retired.

## 4. actionlint

- Latest release: v1.7.12, 2026-03-30 (https://github.com/rhysd/actionlint/releases/latest). Unchanged since baseline. 10 commits on main after it, unreleased.
- Known-label list on main (https://raw.githubusercontent.com/rhysd/actionlint/main/rule_runner_label.go, read 2026-11-27) includes `ubuntu-24.04`, `ubuntu-24.04-arm`, `ubuntu-22.04`, `ubuntu-22.04-arm`, `ubuntu-slim`, `macos-26`, `macos-26-intel`, `macos-15`, `macos-15-intel`, `macos-14*`, `windows-2025`, `windows-2025-vs2026`, `windows-2022`, `windows-11-arm`.
- It lists none of `ubuntu-26.04`, `ubuntu-26.04-arm`, `windows-11-vs2026-arm`. Also `ubuntu-latest` is mapped to Ubuntu 24.04 and `windows-latest` to 2022 in its compat table, now stale.
- Verdict: CS-CI-02's `.github/actionlint.yaml` declaration is still required, unchanged. Note: `windows-11-vs2026-arm` enters deprecation 2026-12-01; the declaration could instead target `windows-11-arm`, which actionlint already knows, if the reference workflow uses that label. The nightly already does, so the declaration of `windows-11-vs2026-arm` can be dropped from CS-CI-02 if no workflow uses it (judgement; no workflow in the pair names it).

## 5. First-party actions

- actions/checkout: latest v7.0.1 (releases page lists 2026-07-20; v7.0.0 2026-06-18, year inferred from the page footer). v7.0.0 notes list PR #2454 (blocks fork PR checkout for `pull_request_target`/`workflow_run`) and #2463 (ESM). The page did not state a Node runtime or minimum runner version. Also v4.4.0, v5.1.0, v6.1.0 patch releases exist on 2026-07-20, so older tags still receive updates. The R7 example `actions/checkout@v4` is still a valid first-party tag. Older than baseline: v7 predates 2026-10-11, so the baseline missed it.
- github/codeql-action: v4 is current (v4.39.5, 2026-11-24, year inferred), v3.39.5 shipped the same day so v3 is still maintained. No v3 deprecation notice on the page. The `github/codeql-action/init@v3` green case remains valid. CodeQL 2.22.3 and earlier discontinued 2026-10-16 (inside window; not named by the pair).
- Verdict for testing.md:344: the green case still passes R7 (any tag). Recommend changing the examples to `actions/checkout@v7` and `github/codeql-action/init@v4` so the example matches current majors; R7 logic is unchanged.

## 6. .NET 11 (CS-CI-06 "RC setup step", testing.md:28)

- .NET 11 reached GA on 2026-11-10 (Standard Term Support, support to 2028-11-09; .NET 8 and 9 end of support the same day), per https://devblogs.microsoft.com/dotnet/?p=61205 and https://infoq.com/news/2026/11/dotnet-11-release (search results only, pages not opened by me; treat as secondary until a human reads the launch post). Learn's overview still says "expected November 2026", stale.
- Changed: CS-CI-06 "a separate .NET 11 RC setup step" becomes "a separate .NET 11 setup step". testing.md:28 ".NET 11 GA is November 2026: re-run the analyzer and exit-code checks then" becomes "GA 2026-11-10; the analyzer and exit-code checks still need re-running". That re-run is outside this question. Baseline gap "SDK 11.0.100-rc.1 ... exit 8" is untested on GA and cannot be read as still true.

## Edits (exact lines)

1. testing.md:27 replace "`macos-14` is unsupported from 2026-11-02. `ubuntu-latest` moves to 26.04 between 2026-10-19 and 2026-11-19." with "`macos-14` was retired 2026-11-02. `ubuntu-latest` moved to 26.04 in October to November 2026 (read 2026-11-27). `ubuntu-22.04` retires 2027-04-17." Sources: issues #13518, #14748, #14254.
2. testing.md:28 keep the Intel macOS sentence; change the .NET 11 sentence to GA (2026-11-10).
3. CS-CI-02 (line 338): keep actionlint and declaration text; add that `ubuntu-22.04` retires 2027-04-17 and the `windows-11-vs2026-arm` / `windows-2025-vs2026` labels begin deprecation 2026-12-01 (use `windows-11-arm`). Change the rationale "moves to 26.04 between ..." to past tense. Verification: `actionlint` on a workflow using `ubuntu-26.04-arm` fails without the declaration (re-run to confirm).
4. CS-CI-06 (line 342): "a separate .NET 11 RC setup step" becomes "a separate .NET 11 setup step".
5. testing.md:344 R7 examples: `actions/checkout@v7`, `github/codeql-action/init@v4` (optional, cosmetic).
6. checks/check-ci-matrix.sh:44: patterns unchanged. `windows-2025-vs2026` is not a required leg and a leg using it would be deprecated from 2026-12-01; leave. :51 retired-label regex `macos-(11|12|13|14)|ubuntu-(18|20|22)\.04|windows-2019` stays correct (macos-14 now retired; ubuntu-22.04 already listed; windows-2022 has no date so must not be added). Optional: add `windows-(2025-vs2026|11-vs2026-arm)` after 2026-12-01 only if the owner accepts a deprecation-only lint. Verification: `grep -nE` the new regex against a fixture with each label, `check-ci-matrix.sh` bad/good fixtures.

## Could not determine

- Whether a maintainer formally closed the ubuntu-latest migration (issue still open).
- Any retirement date for Intel macOS images (macos-15-intel, macos-26-intel); no change found.
- Any `windows-2022` retirement date (first page of announcements only).
- Whether actionlint main has unreleased label additions after 2026-03-30 beyond the raw file read (the file read is current main as of today and lacks the three labels).

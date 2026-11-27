---
title: Pester 6 and Pester 5 release delta, 2026-10-11 to 2026-11-27
pair: powershell-quality
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 14
---

# Pester release delta for the powershell-quality pair

Baseline: shell-testing.md, dated 2026-10-11. This is a delta update. Owner decision O2 says "Re-date when 6.3 ships". All facts below were read on 2026-11-27 from the pages named in the source list. Nothing is written from memory.

## Verdict

No release shipped in the window. Every pin in the pair stays exact. Pester 6.2.0 (2026-09-09) and Pester 5.9.1 (2026-08-11) are still the latest stable versions of their lines. The 6.3 milestone exists but has no tag, so O2 does not fire and the pair is not re-dated for Pester.

Two things are worth knowing but change no literal:

1. The default branch carries unreleased changes (a 6.3 candidate), merged on 2026-11-12 and 2026-11-26.
2. PowerShell 7.4 and 7.5 reached end of support on 2026-11-10, which is inside the window. Pester's own docs still say "7.4 and above".

## Answers to (a) to (d)

(a) No 6.3.0 and no 6.2.x patch shipped. The GitHub tags page lists 6.2.0 (2026-09-09) at the top, with nothing newer. The PSGallery version list shows 6.2.0, last updated 2026-09-09, as the newest entry. The latest commit visible on main with a version bump is "Branding to 6.2.0 (#3042)" on 2026-09-09. The default pin stays 6.2.0. The regression count against 6.2.0 is two open-then-fixed reports, both closed on main and neither released: issue 3089 (`Should-Throw -ExceptionType` fails under de-DE because the wrapper exception was detected by localized message text; closed 2026-11-26 by PR 3091) and issue 3044 (parallel runs print warning-stream output that serial runs do not; closed 2026-11-26 by PR 3045). Neither touches the census gate, the pin, `Run.Exit` or the removed-construct list. Issue 3053 (code coverage reports 0% on Windows PowerShell 5.1) is open since 2026-10-09 and the gate does not use coverage. By comparison, the 6.1.0 `Should-BeFasterThan` problem was a silent pass, which made a gate wrongly green. Nothing found in the window has that shape. Moving the pin has no benefit, because no later version exists to move to.

(b) No. 5.9.1 is the last 5.x on PSGallery and GitHub. The `5.x` milestone shows 0 open and 38 closed. The "stays on 5" pin remains 5.9.1.

(c) No default, removal or flag changed in a release. `Run.Exit` still defaults to `$false` (pester.dev configuration page, read 2026-11-27). `Run.FailOnNullOrEmptyForEach` defaults to `$true`, and `-AllowNullOrEmptyForEach` is the per-block override. The removal of `Assert-MockCalled`, `Assert-VerifiableMock` and `Set-ItResult -Pending` is confirmed by the migration page. Unreleased on main: a `-Aggregate` switch for `Mock` (merged 2026-11-26, issue 2947). It is additive and outside the pair.

(d) No. The Pester installation page and the migration page both say Pester 6 "currently requires and is tested with" Windows PowerShell 5.1 and PowerShell 7.4 and above. Microsoft's lifecycle page (updated 2026-09-09) gives end of support for PowerShell 7.4 LTS and 7.5 as 10-Nov-2026, and 7.6 LTS as 14-Nov-2028. So the sentence "supports exactly the targets of 5.1 and 7.4 or later" is still exactly what Pester documents, but 7.4 is now out of Microsoft support. Pester has not raised its floor. Pester 6.2.0 explicitly fixed imports on PowerShell 7.4.0 to 7.4.5, which shows 7.4 stays a target.

## Claims at risk

| Claim | Status | Evidence |
|---|---|---|
| Rule gate line `-RequiredVersion 6.2.0` | unchanged | No tag after 6.2.0. Tags page and PSGallery list. |
| Rule Target by Kind "Pester 6.2.0 on pwsh 7.6" | unchanged | 7.6 LTS supported to 14-Nov-2028. |
| Rule Severity "Pester 6.2.0 (5.9.1 for a repository that stays on Pester 5)" | unchanged | 5.9.1 is the last 5.x. |
| SH-TEST-18 "`-MinimumVersion 5.0` resolves to 6.2.0 today (`-MaximumVersion 5.99.99` gives 5.9.1)" | unchanged | PSGallery lists 6.2.0 as current and 5.9.1 as the newest 5.x. The word "today" stays true as of 2026-11-27. |
| SH-TEST-18 "Pester 5 has been maintenance-only since 2026-07-07" | could not determine | PSGallery shows 5.9.0 and 6.0.0 both on 2026-07-07, and 5.9.1 on 2026-08-11 is a one-fix patch (a mock parameter filter crash). No fetched page states "maintenance-only" or gives that date. The baseline file shell-testing.md is the only support; re-check it. |
| SH-TEST-18 "Pester 6 supports exactly the targets of 5.1 and 7.4 or later" | unchanged | See (d). Add nothing; optionally note that 7.4 left Microsoft support on 2026-11-10. |
| SH-TEST-18 "`Should-*` only on 6.0.0 and later", "never 5.7.1" | unchanged | `Should-*` family listed as new in the 6.0.0 release; no 5.x tag after 5.9.1. |
| SH-TEST-19 "`Run.Exit` defaults to `False`" | unchanged | pester.dev configuration page. |
| SH-TEST-19 "on Pester 5 an `-ForEach @()` all exit 0" | unchanged | 6.x default `Run.FailOnNullOrEmptyForEach = $true` makes it a discovery error; 5.x gains no change. Issue 3057 ("empty -ForEach prints internal stack trace", closed 2026-11-11, unreleased) concerns the error text on 6, not the exit behaviour. |
| SH-TEST-20 removed list: `Assert-MockCalled`, `Assert-VerifiableMock`, `Set-ItResult -Pending` | unchanged | Migration page. |
| SH-TEST-20 `It -Focus` removed | could not determine | The migration page does not mention `It -Focus`. The baseline stays. Verify by running `It 'x' -Focus` on 6.2.0 if exactness matters. |
| SH-TEST-20 "`-AllowNullOrEmptyForEach`, new in 6.0.0" | unchanged | Migration and configuration pages describe it as the per-block override of the 6 default. |
| SH-TEST-21 "Pester 6 does not promise cross-file discovery state" | unchanged, can be sharpened | The discovery-and-run page says discovery and run are per file in 6, so a file cannot rely on another file's discovery. The migration page names the sanctioned shared bootstrap: `Pester.BeforeContainer.ps1` in the repository root. 6.2.0 (2026-09-09, before the window) made every such file from `Run.RepoRoot` down apply outermost first, and made its top-level code run at discovery only. This is already consistent with SH-TEST-21 ("setup goes in `BeforeAll`"). |
| checks pins 6.2.0 and 5.9.1 | unchanged | See the literal list below. |

## Literals in the pair's files

No literal must change, because no upstream fact changed. For the record, the Pester pins and Pester measurement dates are:

- rules/powershell-quality.md line 38: `-RequiredVersion 6.2.0`.
- rules/powershell-quality.md line 60: "Pester 6.2.0 on pwsh 7.6".
- rules/powershell-quality.md line 149: "Pester 6.2.0 (5.9.1 for a repository that stays on Pester 5)".
- rules/powershell-quality.md line 162: "Pester 5.9.1 and 6.2.0" in the measured-versions sentence, dated 2026-10-11.
- skills/powershell-quality-reference/gates.md, SH-TEST-18 to 22 rows: 6.2.0, 5.9.1, `5.99.99`, 5.7.1, 3.4.0, 2026-07-07, 7.4, "measured 2026-10-11".
- skills/powershell-quality-reference/checks/Invoke-PesterGate.ps1 line 3 (usage text `-RequiredVersion 6.2.0`) and line 11 ("Watched red and green on Pester 5.9.1 and 6.2.0 ... (measured 2026-10-11)"). The parameter at line 15 is mandatory and has no default, so the script itself holds no live pin.
- skills/powershell-quality-reference/checks/Test-DiscoveryCode.ps1 line 12: "Pester 5.9.1 and 6.2.0 files ... (measured 2026-10-11)".
- skills/powershell-quality-reference/checks/pester-lint.sh: no version number is hard-coded as a pin. Line 6 says "removed in Pester 6.0.0"; line 70 matches `-MaximumVersion 5.9` as pin evidence; line 104 comments "removed in Pester 6.0.0". All stay exact.

## Optional, non-blocking candidates

1. Add one clause to SH-TEST-18 or the Pester host note: "PowerShell 7.4 and 7.5 left Microsoft support on 2026-11-10; Pester 6.2.0 still targets 7.4." Rationale: a 7.4 CI leg is now on an unsupported host, but the gate does not break. Verification: grep gates.md for `7.4` and compare with Microsoft's support-lifecycle table. This only matters if the rule set tells adopters which pwsh versions to keep in a matrix. The rule set currently pins pwsh 7.6 for Pester, so no change is required.
2. Re-measure only if 6.3.0 ships. Trigger: `Find-Module Pester -AllVersions` or the GitHub tags page shows a tag above 6.2.0. Then re-run the census gate (cell 19-a) on 6.3.0 and decide the default pin. Watch the unreleased main changes that touch discovery and parallel runs: 3045, 3057, 3085, 3091.
3. Re-verify "maintenance-only since 2026-07-07" against a primary source (a pester.dev v5 page or the 6.0.0 release notes), because this delta could not.

## Gaps in this research

- The GitHub API was rate-limited (HTTP 403) and the raw CHANGELOG at the main branch returned 404 and 503 on two paths. The tag and release lists were read from the HTML pages and PSGallery instead; both agree.
- The GitHub tags page shows 5.9.1 dated 2026-08-06, and the releases page and PSGallery show 2026-08-11. The tag was probably created before the release was published. The rule files say neither date, so nothing changes.
- The full 6.0.0 breaking-changes body and the 6.2.0 full changelog were not captured; only the highlight text was.
- The v5 docs pages (maintenance statement) were not fetched.

## Sources fetched (2026-11-27)

- https://github.com/pester/Pester/releases (first page only)
- https://github.com/pester/Pester/releases/tag/6.2.0
- https://github.com/pester/Pester/tags
- https://github.com/pester/Pester/commits/main
- https://github.com/pester/Pester/milestones
- https://github.com/pester/Pester/issues (created after 2026-09-09), plus issues 3089 and 3044
- https://www.powershellgallery.com/packages/Pester/
- https://pester.dev/docs/migrations/v5-to-v6
- https://pester.dev/docs/usage/configuration
- https://pester.dev/docs/usage/discovery-and-run
- https://pester.dev/docs/introduction/installation
- https://learn.microsoft.com/en-us/powershell/scripting/install/powershell-support-lifecycle
- Web search "Pester 6.3.0 release": no Pester 6.3.0 found (search snippets only, not used as evidence).

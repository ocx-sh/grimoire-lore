---
title: PSScriptAnalyzer and gallery install delta, 2026-10-11 to 2026-11-27
pair: powershell-quality
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 8
---

# PSScriptAnalyzer and gallery install delta

Baseline: shell-pwsh.md revised 2026-10-11, PSScriptAnalyzer (PSSA) 1.25.0 released 2026-03-20. This is a delta. Anything marked "unchanged" stays exactly as written in the pair.

## Summary

- PSSA 1.25.0 is still the latest stable release. The GitHub releases page marks it "Latest" and lists nothing newer ([releases](https://github.com/PowerShell/PSScriptAnalyzer/releases)). The PSGallery page shows 1.25.0 (3/20/2026) as current ([PSGallery](https://www.powershellgallery.com/packages/PSScriptAnalyzer)). The pin `-RequiredVersion 1.25.0` is not broken.
- Main received two commits in the window. [#2212](https://github.com/PowerShell/PSScriptAnalyzer/commits/main) (2026-10-12) pins GitHub Actions to commit SHAs, CI only. [#2226](https://github.com/PowerShell/PSScriptAnalyzer/pull/2226) (2026-10-22, commit 0151b9d) makes the recursive path walker in Engine/ScriptAnalyzer.cs enumerate lazily. Its author states traversal order and path filtering are preserved. It is unreleased.
- The `severity == null` ParseError branch on main is unchanged: `if ( relevantParseErrors != null && (severity == null || severity.Contains("ParseError", StringComparer.OrdinalIgnoreCase)))` appears in both AnalyzeScriptDefinition and AnalyzeFile ([ScriptAnalyzer.cs on main](https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/Engine/ScriptAnalyzer.cs)). Line numbers were not confirmed, since the fetch tool cannot count lines.
- PSResourceGet 1.3.1 is stable as of 10 Nov (1.3.0 the same day). Microsoft Learn says PSResourceGet replaces PowerShellGet but does not deprecate `Install-Module` ([overview](https://learn.microsoft.com/en-us/powershell/gallery/powershellget/overview), page dated 2026-05-20).

## Findings

### Per-claim verdicts

| Claim at risk | Verdict | Evidence |
|---|---|---|
| Gate line `-RequiredVersion 1.25.0`; Severity paragraph "PSScriptAnalyzer 1.25.0 with four per-kind settings files" | unchanged | 1.25.0 still latest on releases page and PSGallery. |
| PS-CORE-01 / PS-GATE-01 five fail-open ways | unchanged | No release. Main commits in window do not touch exit code, Severity, settings-path or rule-name handling. Caveat: [#2226](https://github.com/PowerShell/PSScriptAnalyzer/pull/2226) edits path enumeration, the code an empty-directory run goes through. The PR page does not state empty-directory behaviour, and the author could not run tests. Unreleased, so no effect on a pin. Re-test the empty-directory mode when the next release ships. |
| Not thread-safe under `ForEach-Object -Parallel` | unchanged / could not determine | Nothing in the changelog or main commits mentions it. |
| ParseError branch (`severity == null`) | unchanged | Quoted line above, on main. |
| PS-GATE-03 `'7.4'`/`'7.6'` behave as 7.0; empty `TargetVersions` means 5, 6, 7 | could not determine (no evidence of change) | The rule doc fetched at docs/Rules/UseCompatibleSyntax.md says only "'7.0', '5.1', or '4.0'" are examples, no 7.x beyond 7.0, and does not define empty. That matches the baseline and does not confirm the empty-means-all claim. No main commit in the window touches the rule. The older RuleDocumentation/ path returns 404 on main (docs moved to docs/Rules). |
| PS-GATE-05 `-EnableExit` changed in 1.24.0; 1.25.0 on runner images | unchanged | 1.24.0 changelog entries: min PowerShell 5.1, streaming output with one summary. No release since. Runner-image claim not re-checked. |
| Rule names (UseCompatibleSyntax, UseBOMForUnicodeEncodedFile, AvoidUsingWriteHost, AvoidUsingInvokeExpression, UseToExportFieldsInManifest, AvoidUsingEmptyCatchBlock) | unchanged | No rule added, removed or renamed in a release or in the window's commits. Write-Host `Show-` exemption not re-fetched: could not determine, but no change is plausible. |
| PS-GATE-10 Invoke-Formatter | unchanged | No formatter commit in the window. Last formatter-related main change: 2026-09-14 AlignAssignmentStatement file-path in corrections ([#2202](https://github.com/PowerShell/PSScriptAnalyzer/commits/main)), before the window and unreleased. |
| Open question "PSSA main" | partly answered | See below. |
| `Install-Module PSScriptAnalyzer -RequiredVersion 1.25.0` | unchanged | See (c). |

### (a) Latest stable

1.25.0 remains latest. Its changelog lists new rules AvoidReservedWordsAsFunctionNames, UseConsistentParameterSetName, UseSingleValueFromPipelineParameter, UseConsistentParametersKind and an optional UseConstrainedLanguageMode ([CHANGELOG](https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/CHANGELOG.MD), no dates in headings for 1.24/1.25). No new release, so no fail-open mode is fixed or changed.

### (b) Main-only rules

Still unreleased, all merged before the window: MissingTryBlock (2026-05-15, [#2179](https://github.com/PowerShell/PSScriptAnalyzer/commits/main)), AvoidUsingArrayList, InvalidMultiDotValue, AvoidDynamicallyCreatingVariableNames (all 2026-05-18, #2174, #2180, #2178). A settings-file creation and validation change landed 2026-05-07 ([#2176](https://github.com/PowerShell/PSScriptAnalyzer/commits/main)). This may be the Test-ScriptAnalyzerSettingsFile cmdlet the open question mentions, and could eventually close the missing-path and mistyped-rule fail-open modes. Its exact behaviour was not read. TargetVersions gaining 7.x values: no evidence.

### (c) Install form

PSResourceGet 1.3.1 (10 Nov) is the current stable ([releases](https://github.com/PowerShell/PSResourceGet/releases)). Learn describes PSResourceGet as replacing PowerShellGet and advises the latest PSResourceGet, but states no deprecation of `Install-Module`. Windows PowerShell 5.1's bundled PowerShellGet 1.0.0.1 is called unsupported. The PowerShellGet releases page was not fetched. `Install-Module ... -RequiredVersion` stays valid on runners; a `Install-PSResource PSScriptAnalyzer -Version 1.25.0` form is an equivalent alternative, not a required change.

## Normative guidance candidates

1. Keep the pin at 1.25.0. Rationale: still latest stable. Verify: `grep -rn "RequiredVersion 1.25.0"` in the rule and `Find-Module PSScriptAnalyzer` shows 1.25.0.
2. Do not add any main-only rule to a per-kind settings file. Rationale: not in 1.25.0, so a name there is silently ignored (the mistyped-rule fail-open). Verify: wrapper's rule-name check against `Get-ScriptAnalyzerRule`.
3. On the next PSSA release, re-run the five fail-open probes (exit mod 256, Severity without ParseError, missing settings path, mistyped rule, empty directory) before bumping the pin. Rationale: path-walker and settings-validation changes are queued on main. Verify: the pair's existing R10-style probe set.

## AI-agent angle

- An agent may invent a newer PSSA version or claim main-only rules (AvoidUsingArrayList) exist in the pin. Check: `Get-ScriptAnalyzerRule -Name <rule>` under the pinned module.
- An agent may replace `Install-Module` with `Install-PSResource` as "required". Check: the docs state no deprecation.

## Contested / evolving

- PSSA main is ahead of 1.25.0 by about 5 months of changes. A release containing rules and settings validation is likely; date unknown as of 2026-11-27.
- PSResourceGet is the Microsoft-preferred installer; PowerShellGet remains functional.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://github.com/PowerShell/PSScriptAnalyzer/releases | releases list | read 2026-11-27 | latest = 1.25.0 |
| https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/CHANGELOG.MD | changelog | read 2026-11-27 | 1.24/1.25 content |
| https://www.powershellgallery.com/packages/PSScriptAnalyzer | gallery page | 2026-11-27 | current version |
| https://github.com/PowerShell/PSScriptAnalyzer/commits/main | main commits | 2026-11-27 | window delta |
| https://github.com/PowerShell/PSScriptAnalyzer/pull/2226 | path enumeration PR | merged 2026-10-22 | only engine change in window |
| https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/Engine/ScriptAnalyzer.cs | engine source | main | ParseError branch |
| https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/docs/Rules/UseCompatibleSyntax.md | rule doc | main | TargetVersions |
| https://github.com/PowerShell/PSResourceGet/releases | PSResourceGet releases | 1.3.1 10 Nov | installer status |
| https://learn.microsoft.com/en-us/powershell/gallery/powershellget/overview | Learn overview | 2026-05-20 | deprecation stance |

Limits: the GitHub API was rate-limited, so commit lists came from the web UI. Fewer than 12 sources were fetched; this is a delta, not a full study. The commit at 411c3d0b197b and its lines 1488 and 1902 were not verified; the quoted condition was read at main. The PowerShellGet releases page and the PSAvoidUsingWriteHost doc were not fetched.

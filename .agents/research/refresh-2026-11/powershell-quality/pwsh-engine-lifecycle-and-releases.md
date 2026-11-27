---
title: PowerShell 7 engine and support lifecycle delta, 2026-10-11 to 2026-11-27
pair: powershell-quality
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 12
---

# PowerShell 7 engine and support lifecycle delta

Scope: a delta against the baseline shell-pwsh research (2026-10-11, pwsh 7.4.7 and 7.6.6). Only what changed upstream in the window is recorded. Anything not mentioned is unchanged.

Reliability note. GitHub release pages were read through WebFetch, which summarises the page and shows day and month but no year; the year 2026 is inferred from the sequence of tags and the .NET SDK versions. The GitHub REST API was rate limited and the raw CHANGELOG files (7.6.md, 7.4.md, preview.md) returned stale copies that stop at 7.6.4, 7.4.18 and 7.7.0-preview.5, so they carry no information about the window. The Microsoft Learn pages returned were last updated 2026-09-09 (lifecycle), 2026-09-21 (what's new 7.7) and 2026-06-29 (preference variables), so they pre-date the window and still describe 7.7 as a preview.

## Summary

- 7.4 and 7.5 end-of-support date is still 2026-11-10 in the lifecycle table. The date did not move. The date has now passed (today is 2026-11-27). The Learn page was last edited 2026-09-09, so it cannot confirm the passing itself; the last 7.4 and 7.5 releases on GitHub are 7.4.22 and 7.5.13 (both 25 Oct), and no 7.4 or 7.5 release exists after 10 Nov.
- Latest 7.6 patch is 7.6.10 (10 Nov). 7.6.7 to 7.6.10 contain no change to native exit codes, argument passing, default encodings, error preference or the null-conditional parse.
- PowerShell 7.7.0 is GA as of 10 Nov (GitHub release, marked Latest), not a preview any more. The Learn lifecycle page still lists it as "7.7 (preview)" with blank dates, so 7.7 support dates are undocumented as of this research. 7.6 stays the LTS (end of support 14-Nov-2028).
- 7.7 adds `$PSApplicationOutputEncoding` (default `$null`), a scoped variable for decoding native command output. It changes no default the rows rely on. `$PSNativeCommandUseErrorActionPreference` default is still `$false` in the 7.7 preference page.
- Recommendation: delete the 7.4 column and the 7.4.7 evidence now; keep the floor at 7.6; re-measure on 7.6.10 is optional.

## Findings

### 1. Support dates (question a)

The lifecycle table ([Microsoft Learn lifecycle](https://learn.microsoft.com/en-us/powershell/scripting/install/powershell-support-lifecycle), page ms.date 2026-08-13, updated_at 2026-09-09) lists:

| Version | Release | End of support |
| --- | --- | --- |
| 7.7 (preview) | blank | blank |
| 7.6 (LTS) | 18-Mar-2026 | 14-Nov-2028 |
| 7.5 | 23-Jan-2025 | 10-Nov-2026 |
| 7.4 (LTS) | 16-Nov-2023 | 10-Nov-2026 |

The page text says "The previous LTS release, PowerShell 7.4.20, is still supported until 10-Nov-2026" and "The current Stable release is PowerShell 7.5.11", both stale against GitHub (7.4.22 and 7.5.13 exist). Verdict: date unchanged; no evidence of an extension. Evidence that the final servicing releases shipped: [v7.4.22](https://github.com/PowerShell/PowerShell/releases/tag/v7.4.22) (25 Oct, only ".NET SDK 8.0.427") and 7.5.13 (25 Oct, seen in the [releases list](https://github.com/PowerShell/PowerShell/releases)). Both 7.4 and 7.5 shipped no release after 10 Nov in the ten most recent entries.

Replacement text for each future-tense stamp (past tense, dated, no "until then"):

- rules/powershell-quality.md Dates: "pwsh 7.4 and 7.5 reached end of support on 2026-11-10, so no `#Requires` floor names them" and "measured 2026-10-11 on pwsh 7.4.7 and 7.6.6; 7.6.7 to 7.6.10 (to 2026-11-10) changed none of the measured behaviours (checked 2026-11-27)".
- compat.md line 8: "pwsh 7.4 and 7.5 reached end of support on 2026-11-10; the parse matrix no longer carries a 7.4 column".
- encoding.md, gates.md, native.md, security.md line 8: the same sentence as compat.md, adapted to the file.
- errors.md: replace "a transitional column until then" with "the 7.4 column was removed after 2026-11-10".
- PS-COMPAT-01 rationale: "7.4 and 7.5 reached end of support on 2026-11-10".
- shell-pwsh.md Open question 4: mark resolved: "7.4 column removed after 2026-11-10".

### 2. Per-file removal of the 7.4 column and 7.4.7 evidence (question b)

Yes for every file named in the commission: rules/powershell-quality.md, compat.md, encoding.md, gates.md, native.md, errors.md, security.md. The support window is closed and no 7.4 patch exists after 10 Nov, so a 7.4 parse result can no longer be reproduced on a supported engine. Rule: remove a 7.4 matrix column and the "7.4.7" measurement stamps; keep sentences that describe a version-gated behaviour only as history ("added in 7.4") where they explain a feature, since that stays true. The authors of the pair should decide per sentence whether it is history or a compatibility promise.

### 3. Floor claims (PS-CORE-02, Target by Kind)

"PowerShell 7.6, `#Requires -Version 7.6`, never 7.0, 7.4 or 7.5": unchanged and now strictly stronger, because 7.4 and 7.5 are unsupported. 7.6 is LTS to 14-Nov-2028 ([lifecycle](https://learn.microsoft.com/en-us/powershell/scripting/install/powershell-support-lifecycle)). 7.7.0 is GA, but its support length is not published on the page fetched, so do not move the floor to 7.7.

### 4. Latest 7.6.x and behaviour checks (question c)

Latest is [7.6.10](https://github.com/PowerShell/PowerShell/releases/tag/v7.6.10), 10 Nov. Releases after 7.6.6, from the GitHub release pages:

| Tag | Date | Content relevant to the rows |
| --- | --- | --- |
| [v7.6.7](https://github.com/PowerShell/PowerShell/releases/tag/v7.6.7) | 13 Oct | tolerate IO/JSON errors in per-user powershell.config.json; AutoSize option; MSIX PATH handling; .NET SDK 10.0.402; Microsoft.PowerShell.Native package update |
| [v7.6.8](https://github.com/PowerShell/PowerShell/releases/tag/v7.6.8) | 22 Oct | removes the update notification feature |
| [v7.6.9](https://github.com/PowerShell/PowerShell/releases/tag/v7.6.9) | 25 Oct | .NET SDK 10.0.403 only |
| [v7.6.10](https://github.com/PowerShell/PowerShell/releases/tag/v7.6.10) | 10 Nov | MSIX detection, SHA-1 catalog warning, `Test-Json` returns all errors in List output, .NET SDK 10.0.404 |

None changes native exit codes, `$PSNativeCommandArgumentPassing`, default encodings or null-conditional parsing: unchanged. The version-gated claims PS-NATIVE-03 ("7.3 and later `Standard` and `Windows`"), PS-ERR-02 ("On 7.4+ it also makes `if (native)` throw"), PS-ERR-06 ("7.2+ does not") and PS-ENC-09 ("byte-preserving on 7.4+") have no change in the window. The 7.7 preference page still documents `$PSNativeCommandUseErrorActionPreference` default `$false` ([about_Preference_Variables 7.7](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_preference_variables?view=powershell-7.7)). Caveat: the release pages list changes, but only PR titles were read; no PR diffs were opened. Verification: re-run the native-exit-code and encoding fixtures from the baseline on 7.6.10 (`pwsh -NoProfile -File` on the existing test script).

### 5. 7.7 (question d, forward-looking only)

[7.7.0](https://github.com/PowerShell/PowerShell/releases/tag/v7.7.0) is GA (10 Nov, built on .NET SDK 11.0.100, no breaking changes listed on the release page). [7.7.0-rc.1](https://github.com/PowerShell/PowerShell/releases/tag/v7.7.0-rc.1) (29 Oct) adds `Test-Json -FetchExternalReference`, Constrained Language Mode property-assignment protections, and removes update notification. The [What's new 7.7 page](https://learn.microsoft.com/en-us/powershell/scripting/whats-new/what-s-new-in-powershell-77) (preview.5 era) lists breaking changes: `New-Guid` generates UUID v7 by default; `Format-Table/List/Custom -Property` validates null or empty; `Where-Object` explicit `-Operator:$false`; the exception type for null/empty validation changes to `ArgumentException`. It adds `$PSApplicationOutputEncoding` (default `$null`, scoped, for reading native output). None of these changes a default the pair's rows depend on. `$PSApplicationOutputEncoding` is a new tool for PS-ENC rules, usable only on 7.7+, so it cannot be recommended while the floor is 7.6.

## Claim ledger

| Claim | Verdict | Old text | New fact | Source | Date |
| --- | --- | --- | --- | --- | --- |
| 7.4/7.5 EOS 2026-11-10 | unchanged date; stamp now past | "end support 2026-11-10" | same date, now elapsed | lifecycle page | 2026-11-10 |
| Measured on 7.4.7 and 7.6.6 | changed | "7.4.7 and 7.6.6" | 7.6.10 is latest; 7.4.22 final 7.4 | GitHub releases | 2026-11-10 |
| Floor 7.6 | unchanged | | 7.6 LTS to 2028-11-14 | lifecycle page | |
| PS-NATIVE-03, PS-ERR-02, PS-ERR-06, PS-ENC-09 | unchanged | | no change in 7.6.7-7.6.10 or 7.7 notes | release pages | |
| Open question 4 | changed: resolved | "until 2026-11-10, then delete" | delete now | lifecycle page | 2026-11-10 |
| 7.7 is a preview | changed | | 7.7.0 GA | v7.7.0 release | 2026-11-10 |

## Normative guidance candidates

1. Never write a future-tense end-of-support stamp without the date and a check date. Rationale: the 2026-11-10 stamp went stale in the window. Verification: `grep -rn "end support 20" rules skills` and read each for tense.
2. Do not name 7.4 or 7.5 in any `#Requires -Version`. Rationale: unsupported since 2026-11-10. Verification: `grep -rnE "#Requires -Version 7\.[0-5]" .`.
3. Do not raise the floor to 7.7 until the lifecycle page lists 7.7 dates. Rationale: 7.7.0 GA exists but its end-of-support is undocumented in the sources read. Verification: re-read the lifecycle table.

## AI-agent angle

- Models trained before 2026-11 treat 7.4 as supported LTS and 7.7 as a preview; both are wrong now. Check: grep for "7.4 LTS" and "7.7 preview".
- Models cite `$PSApplicationOutputEncoding` as available on 7.6; it is 7.7+ only. Check: `#Requires -Version 7.6` plus that variable is a defect.

## Contested / evolving

- Whether 7.7 is Stable or LTS-length: undocumented here; .NET 11 pairing suggests a Stable-class release but this was not confirmed by a source. Re-check when the lifecycle page updates.

## Sources

| URL | What | Date | Why |
| --- | --- | --- | --- |
| https://learn.microsoft.com/en-us/powershell/scripting/install/powershell-support-lifecycle | lifecycle table | updated 2026-09-09 | primary, EOS dates |
| https://github.com/PowerShell/PowerShell/releases | release list | seen 2026-11-27 | primary, latest tags |
| https://github.com/PowerShell/PowerShell/releases/tag/v7.6.7 | release notes | 13 Oct | primary |
| https://github.com/PowerShell/PowerShell/releases/tag/v7.6.8 | release notes | 22 Oct | primary |
| https://github.com/PowerShell/PowerShell/releases/tag/v7.6.9 | release notes | 25 Oct | primary |
| https://github.com/PowerShell/PowerShell/releases/tag/v7.6.10 | release notes | 10 Nov | primary |
| https://github.com/PowerShell/PowerShell/releases/tag/v7.7.0 | GA notes | 10 Nov | primary |
| https://github.com/PowerShell/PowerShell/releases/tag/v7.7.0-rc.1 | RC notes | 29 Oct | primary |
| https://github.com/PowerShell/PowerShell/releases/tag/v7.4.22 | final 7.4 notes | 25 Oct | primary |
| https://learn.microsoft.com/en-us/powershell/scripting/whats-new/what-s-new-in-powershell-77 | 7.7 what's new | 2026-09-21 | primary, breaking changes |
| https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_preference_variables?view=powershell-7.7 | preference variables 7.7 | 2026-06-29 | primary |
| https://raw.githubusercontent.com/PowerShell/PowerShell/master/CHANGELOG/7.6.md | changelog | stale copy, stops at 7.6.4 | no window data |

Not fetched: the 7.6 what's-new and 7.6 preference pages (the 7.7 preference page was used instead); sources below the 12-source minimum for primary breadth is accepted for a delta.

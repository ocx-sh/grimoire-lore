---
title: powershell-quality delta refresh, 2026-10-11 to 2026-11-27
pair: powershell-quality
date: 2026-11-27
window_start: 2026-10-11
model: opus
consolidates:
  - .agents/research/refresh-2026-11/powershell-quality/pwsh-engine-lifecycle-and-releases.md
  - .agents/research/refresh-2026-11/powershell-quality/windows-powershell-51-servicing.md
  - .agents/research/refresh-2026-11/powershell-quality/psscriptanalyzer-and-gallery-install.md
  - .agents/research/refresh-2026-11/powershell-quality/pester-releases.md
  - .agents/research/refresh-2026-11/powershell-quality/actions-runner-and-images-pwsh.md
  - .agents/research/refresh-2026-11/powershell-quality/installer-upstreams-cargo-dist-and-exemplars.md
  - .agents/research/refresh-2026-11/powershell-quality/recent-shifts-powershell.md
revises:
  - .agents/research/shell-pwsh.md
  - .agents/research/shell-installer.md
---

# powershell-quality delta refresh

## Verdict

- Keep every rule ID, every MUST and every pin. PSScriptAnalyzer 1.25.0, Pester 6.2.0 and 5.9.1, the 7.6 script floor and the 5.1 installer target all still hold on 2026-11-27.
- Rewrite the four future-tense end-of-support stamps (rule Dates, compat.md, errors.md, security.md, and the PS-COMPAT-01 rationale) in the past tense, because pwsh 7.4 and 7.5 reached end of support on 2026-11-10 with no release after that date.
- Keep the 7.4.7 measurement stamps as measurement records. They are still true as history, and removing the 7.4 evidence would be a reorganisation, not a correction. The stamp now says a 7.4.7 result is not a target.
- Correct the PS-GATE-05 image claim: the hosted images of 2026-11-16 carry pwsh 7.6.10, not 7.6.6, and `ubuntu-latest` now maps to Ubuntu 26.04.
- Add one dated clause to the PS-CORE-02 rationale: Windows PowerShell 5.1 was deprecated on 2026-11-17 (KB5137172), but `powershell.exe` stays 5.1 on every shipped Windows, so the installer target does not move. This guards against an agent that read the announcement and raises an installer to 7.
- Add an upstream check stamp to the rule Dates: the 7.6.7 to 7.6.10 release notes change no measured behaviour, PSScriptAnalyzer and Pester shipped nothing, the newest 24H2 build is 26100.9974, and 7.7.0 shipped without a published end-of-support date, so the floor stays 7.6.
- Add no new rule. The MSIX-only 7.7 install route, the PSResourceGet 1.3 drop of Windows PowerShell and the KB5132061 signing hardening are either unsettled upstream or outside what the fleet's scripts do, so they go to Open questions with a re-check trigger.
- Leave the PS-SEC-06 Microsoft paraphrase and the PS-ERR-03 epilogue quote as they are. The upstream texts did not change in the window, and the hard limit keeps unchanged upstream facts exactly as written.
- Bump: rule patch, reference skill patch.

## Changed rules

### PS-CORE-02 (rules/powershell-quality.md, Rules This File Owns)

- Old rationale: "An agent trained on 7-era text writes 7-only syntax into a file stock Windows runs on 5.1. One such line makes the whole file unrunnable there, while the author's pwsh 7 run stays green."
- New rationale: the same two sentences, then: "Windows PowerShell 5.1 was deprecated on 2026-11-17 (KB5137172) and PowerShell 7 is announced to ship beside it in a future Windows, but Windows Server 2025 and Windows 11 26H2 keep 5.1 enabled by default and `powershell.exe` stays 5.1, so the installer target does not move."
- Verification: unchanged. Cells `C1a` and `C1b` of compat.md for the `#Requires` line, the 5.1 parse of PS-CORE-01, and the kind choice as a reading step.
- Source: [KB5137172](https://support.microsoft.com/help/5137172) (2026-11-17), [PowerShell team blog, 2026-11-17](https://devblogs.microsoft.com/powershell/powershell-7-coming-to-windows/).

### PS-COMPAT-01 (compat.md, Group 2)

- Old rationale end: "`iex` ignores it, and 7.4 and 7.5 end support 2026-11-10."
- New rationale end: "`iex` ignores it, and 7.4 and 7.5 reached end of support on 2026-11-10."
- Verification: unchanged (`C1a`, `C1b`, the in-code version test is a reading step).
- Source: [PowerShell support lifecycle](https://learn.microsoft.com/en-us/powershell/scripting/install/powershell-support-lifecycle) (end of support 10-Nov-2026 for 7.4 and 7.5), [GitHub releases](https://github.com/PowerShell/PowerShell/releases) (final 7.4.22 and 7.5.13 on 25 Oct, nothing after 10 Nov).

### PS-GATE-05 (gates.md, A. The PSScriptAnalyzer Gate)

- Old rationale sentence: "1.25.0 (2026-03-20) is on the windows-2025 and ubuntu-24.04 images beside pwsh 7.6.6."
- New rationale sentence: "1.25.0 (2026-03-20) is on the windows-2025, ubuntu-24.04 and ubuntu-26.04 images beside pwsh 7.6.10 (image readmes of 2026-11-16; `ubuntu-latest` now maps to 26.04)."
- Verification: unchanged (cell 05-a). A reader confirms the image claim with `(Get-Module PSScriptAnalyzer -ListAvailable).Version` and `$PSVersionTable.PSVersion` in a hosted step.
- Source: [Windows2025-Readme.md](https://raw.githubusercontent.com/actions/runner-images/main/images/windows/Windows2025-Readme.md), [Ubuntu2404-Readme.md](https://raw.githubusercontent.com/actions/runner-images/main/images/ubuntu/Ubuntu2404-Readme.md), [Ubuntu2604-Readme.md](https://raw.githubusercontent.com/actions/runner-images/main/images/ubuntu/Ubuntu2604-Readme.md), [runner-images issue 14748](https://github.com/actions/runner-images/issues/14748).

### Non-ID stamps

- rules/powershell-quality.md, Dates: future tense "end support 2026-11-10" becomes past tense, plus the upstream check stamp and the 7.7 floor note. Source: lifecycle page, the v7.6.7 to v7.6.10 and v7.7.0 release pages, the Windows 11 release information page (26100.9974, KB5132061, 2026-11-10).
- compat.md header: "(until then 7.4 stays a parse-matrix column only)" becomes a past-tense statement that a 7.4.7 result is a measurement record.
- errors.md header: "reaches end of support on 2026-11-10 and is a transitional column until then" becomes past tense.
- security.md header: "pwsh 7.4 ends support 2026-11-10" becomes past tense.
- The "(end of support 2026-11-10)" parentheticals in encoding.md, gates.md and native.md are dated noun phrases that stay true, so they are not edited.

## New rules

None. The candidates considered and held back:

- An MSIX install-route rule for pwsh 7.7 (SHOULD, provisional). Held because [PowerShell/PowerShell#27565](https://github.com/PowerShell/PowerShell/issues/27565) is still in progress and the fleet's scripts run on hosted images with pwsh preinstalled rather than install pwsh for SYSTEM.
- A PS-GATE-05 clarifier and a tell cell T11 for `Install-PSResource` in 5.1-bound files. Held because the Windows PowerShell drop is a roadmap statement that the 1.3.0 release page does not repeat, and PS-GATE-05 already prescribes `Install-Module`.
- A signed-script encoding rule from KB5132061. Held because the pair has no script-signing row, ASCII is valid UTF-8, and the KB's scope was not confirmed.

## Confirmed unchanged

- PSScriptAnalyzer 1.25.0 is still the latest release, and the five fail-open modes, the `severity == null` ParseError branch, the rule names and the formatter are untouched by any release.
- Pester 6.2.0 and 5.9.1 are still the newest of their lines; `Run.Exit` defaults to `$false`; the removed-in-6 list holds; Pester 6 still documents 5.1 and 7.4 or later as its targets.
- The 7.6 floor stands: 7.6 is LTS to 2028-11-14, and 7.7.0 has no published end-of-support date.
- PS-NATIVE-03, PS-ERR-02, PS-ERR-06 and PS-ENC-09: no change to native exit codes, argument passing, default encodings or null-conditional parsing in 7.6.7 to 7.6.10 or 7.7.0. `$PSNativeCommandUseErrorActionPreference` still defaults to `$false`.
- PS-COMPAT-02: 7.7.0 adds no construct that 5.1 cannot parse, so the construct list needs no addition.
- PS-COMPAT-06: no update in the window changed the Invoke-WebRequest prompt, added a bypass or extended the prompt to `Invoke-RestMethod`. The only bypass is still `-UseBasicParsing` or the `$PSDefaultParameterValues` line.
- PS-SEC-06: the .NET Framework TLS guidance (tls.md, ms.date 06/04/2026) and the 4.8.1 servicing in the window carry no TLS change.
- PS-ERR-03, PS-ENC-10 and PS-GATE-08: the runner's `ScriptHandlerHelpers.cs` and `FileCommandManager.cs` are byte-identical to the baseline commit, and `shell: powershell` is still Windows PowerShell 5.1 while `shell: pwsh` is 7.x. `windows-latest` still maps to Windows Server 2025.
- PS-SEC-01, PS-SEC-09 and PS-COMPAT-11 evidence: cargo-dist through v0.34.0 still extracts with no hash check (PR 2497 open), the scoop installer head is still 1e2f334, and the pnpm installer still prints the same platform message.
- The 5.1.26100.9444 stamps already read as measurement records ("measured 2026-10-11"), so they need no rewording.

## Open questions

- Re-measure on pwsh 7.6.10 and on Windows 11 24H2 26100.9974: the native exit-code and encoding fixtures, the R5 prompt probe with its `irm`, `-OutFile` and `-OutFile -PassThru` twins, cell 08-a for PS-GATE-08, and the inbox Pester version (3.4.0 at baseline; the windows-2025 image still lists 3.4.0 beside 5.9.0).
- Does Windows PowerShell 5.1 `Invoke-RestMethod` prompt on any build after 26100.9444? No source says yes, and no build after 9444 was measured.
- KB5132061 stricter UTF-8 validation for signed scripts: confirm its scope (5.1 only or both editions) and whether an ASCII, BOM-less signed script still verifies. Revisit if any fleet script is Authenticode-signed.
- pwsh 7.7 on Windows is MSIX-only and registers per user ([#27565](https://github.com/PowerShell/PowerShell/issues/27565)). Revisit an install-route rule when that issue closes or 7.7 becomes a target.
- PSResourceGet 1.3 dropping Windows PowerShell is a roadmap statement. Check the shipped 1.3.1 manifest `PowerShellVersion` before any PS-GATE-05 change.
- 7.7 lifecycle dates are undocumented. Revisit the floor when the lifecycle page lists them.
- CVE-2026-124226 (PowerShell security feature bypass, 2026-11-10) is an unverified aggregator lead; MSRC was not readable.
- PSScriptAnalyzer PR 2226 (lazy path walker, unreleased) touches the empty-directory fail-open path. Re-run the five fail-open probes before bumping the pin past 1.25.0.
- The runner-file readers are still emulated from source, not observed on a hosted job. The proposed dispatch in the actions-runner artifact would close it.
- "Pester 5 has been maintenance-only since 2026-07-07" in SH-TEST-18 has no primary source in this delta.
- Windows PowerShell 5.1 is not listed in the fetched windows-2025 readme; no evidence it was removed.

## Revision log

- rules/powershell-quality.md Dates: added the 2026-11-27 upstream check stamp (7.6.7 to 7.6.10, PSScriptAnalyzer, Pester, build 26100.9974).
- rules/powershell-quality.md Dates: 7.4 and 7.5 end of support rewritten in the past tense; 7.7.0 floor note added.
- PS-CORE-02: rationale gains the KB5137172 deprecation clause.
- compat.md header: past tense for 7.4 and 7.5 end of support; 7.4.7 marked as a measurement record.
- PS-COMPAT-01: rationale end-of-support clause in the past tense.
- errors.md header: past tense for 7.4 end of support; "transitional column until then" removed.
- PS-GATE-05: image claim updated to pwsh 7.6.10 and ubuntu-26.04.
- security.md header: past tense for 7.4 end of support.
- Spillover round (2026-11-27): no edits. The three items carried over from shell-quality were checked against primary sources; two are already stated correctly and the third changes no claim this pair makes.

## Edit list

Each entry gives the file, the exact text to find, and the exact replacement. Text inside a fenced block is verbatim. Apply in order.

1. rules/powershell-quality.md

Find:
```
PSScriptAnalyzer 1.25.0 and Pester 5.9.1 and 6.2.0.
```
Replace with:
```
PSScriptAnalyzer 1.25.0 and Pester 5.9.1 and 6.2.0. Checked against upstream on 2026-11-27 without a re-measure: the pwsh 7.6.7 to 7.6.10 release notes change none of the measured behaviours, PSScriptAnalyzer and Pester shipped no release, and the newest Windows 11 24H2 build is 26100.9974 (KB5132061, 2026-11-10).
```

2. rules/powershell-quality.md

Find:
```
Dated end point: pwsh 7.4 and 7.5 end support 2026-11-10, so no `#Requires` floor names them.
```
Replace with:
```
Dated end point: pwsh 7.4 and 7.5 reached end of support on 2026-11-10, so no `#Requires` floor names them and a 7.4.7 result is a measurement record, not a target. pwsh 7.7.0 shipped on 2026-11-10 with no published end-of-support date, so the floor stays 7.6 (LTS to 2028-11-14).
```

3. rules/powershell-quality.md

Find:
```
One such line makes the whole file unrunnable there, while the author's pwsh 7 run stays green.
```
Replace with:
```
One such line makes the whole file unrunnable there, while the author's pwsh 7 run stays green. Windows PowerShell 5.1 was deprecated on 2026-11-17 (KB5137172) and PowerShell 7 is announced to ship beside it in a future Windows, but Windows Server 2025 and Windows 11 26H2 keep 5.1 enabled by default and `powershell.exe` stays 5.1, so the installer target does not move.
```

4. skills/powershell-quality-reference/compat.md

Find:
```
pwsh 7.4 and 7.5 end support 2026-11-10 (until then 7.4 stays a parse-matrix column only).
```
Replace with:
```
pwsh 7.4 and 7.5 reached end of support on 2026-11-10, so a 7.4.7 result below is a measurement record and no longer a target.
```

5. skills/powershell-quality-reference/compat.md

Find:
```
`iex` ignores it, and 7.4 and 7.5 end support 2026-11-10.
```
Replace with:
```
`iex` ignores it, and 7.4 and 7.5 reached end of support on 2026-11-10.
```

6. skills/powershell-quality-reference/errors.md

Find:
```
pwsh 7.4 reaches end of support on 2026-11-10 and is a transitional column until then.
```
Replace with:
```
pwsh 7.4 reached end of support on 2026-11-10, so its results are a measurement record and no longer a target.
```

7. skills/powershell-quality-reference/gates.md

Find:
```
1.25.0 (2026-03-20) is on the windows-2025 and ubuntu-24.04 images beside pwsh 7.6.6.
```
Replace with:
```
1.25.0 (2026-03-20) is on the windows-2025, ubuntu-24.04 and ubuntu-26.04 images beside pwsh 7.6.10 (image readmes of 2026-11-16; `ubuntu-latest` now maps to 26.04).
```

8. skills/powershell-quality-reference/security.md

Find:
```
pwsh 7.4 ends support 2026-11-10.
```
Replace with:
```
pwsh 7.4 reached end of support on 2026-11-10.
```

## Spillover round

### Verdict

- No edit to the rule or the reference skill. All three spillover items are confirmed by primary sources, and none of them makes the current text false on 2026-11-27.
- Item 1 (pwsh 7.4 and 7.5 end of support on 2026-11-10, 7.6 LTS to 2028-11-14, 7.7.0 stable since 2026-11-10) is already stated in the rule Dates, as the first round wrote it, and the "(end of support 2026-11-10)" stamps in gates.md and native.md stay true.
- Item 2 (zizmor 1.31.0 parses PowerShell with a tree-sitter grammar; GitLab Runner 19.6.0 and the 19.5.2, 19.4.3 and 19.3.5 backports escape every single quote in generated PowerShell strings) is true, but no rule, cell or measurement in this pair depends on either tool. The pair has no zizmor gate and no GitLab Runner quoting measurement, and the only GitLab mention routes workflow and GitLab job files to `shell-quality`.
- Item 3 (cargo-dist PR 2497 still open, cargo-dist at v0.34.0) is already consistent: the PS-SEC-01 rationale says cargo-dist's installer extracts with no check, which is still true, and no row waits on the PR.
- Bump: none for this round. The first-round patch bumps stand.

### Changed rules

None.

### New rules

None.

### Declined

- Item 1: no change needed. The rule Dates already carry the 2026-11-10 end of support for 7.4 and 7.5, the 7.6 LTS end date and the 7.7.0 note without an end-of-support date. The Learn lifecycle page still lists 7.7 as a preview with no dates, so the "no published end-of-support date" wording stays accurate.
- Item 2, zizmor 1.31.0 tree-sitter grammar: declined, out of scope. This pair has no zizmor gate or claim about how zizmor reads PowerShell run steps; workflow audits belong to `shell-quality`.
- Item 2, GitLab Runner single-quote escaping: declined. No rule or measurement here covers runner-generated PowerShell strings, and the spillover check itself advises against a trace clause without a measurement. A clause without a measured cell would be unverifiable guidance.
- Item 3: no change needed. PS-SEC-01 and PS-SEC-03 state the checksum requirement for any `install.ps1` and do not gate on PR 2497; the cargo-dist installer statements live in the `installer-script` pair.

### Sources

| Item | Source | Date | Finding |
| --- | --- | --- | --- |
| 1 | [PowerShell support lifecycle](https://learn.microsoft.com/en-us/powershell/scripting/install/powershell-support-lifecycle) | ms.date 2026-08-13, updated 2026-09-09 | 7.4 and 7.5 end of support 10-Nov-2026; 7.6 LTS to 14-Nov-2028; 7.7 listed without dates |
| 1 | [PowerShell/PowerShell releases](https://github.com/PowerShell/PowerShell/releases) | 2026-11-10 | v7.7.0 stable and v7.6.10 published |
| 2 | [zizmor release notes](https://docs.zizmor.sh/release-notes/), [v1.31.0 release](https://github.com/zizmorcore/zizmor/releases/tag/v1.31.0) | 2026-10-15 | tree-sitter grammar for PowerShell |
| 2 | [GitLab Runner CHANGELOG](https://gitlab.com/gitlab-org/gitlab-runner/-/raw/main/CHANGELOG.md) | 2026-11-17 (v19.6.0), 2026-10-28 (backports) | all single quotes escaped in PowerShell strings |
| 3 | [cargo-dist PR 2497](https://github.com/axodotdev/cargo-dist/pull/2497), [cargo-dist releases](https://github.com/axodotdev/cargo-dist/releases) | checked 2026-11-27; v0.34.0 published 2026-11-02 | PR open, not merged |

### Edit list (spillover round)

Empty. No file changes.

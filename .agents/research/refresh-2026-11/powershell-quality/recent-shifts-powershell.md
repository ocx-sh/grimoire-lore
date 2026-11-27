---
title: PowerShell quality pair, new upstream shifts 2026-10-11 to 2026-11-27 not yet in the pair
pair: powershell-quality
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 17
---

# Recent shifts: powershell-quality, delta 2026-10-11 to 2026-11-27

This is a delta against the baseline of 2026-10-11 (shell-pwsh.md, shell-installer.md, shell-testing.md) and against rules/powershell-quality.md plus its six depth files. It records only what the pair does not mention at all. The sibling files in this directory (pwsh-engine-lifecycle-and-releases.md, psscriptanalyzer-and-gallery-install.md) already cover the 7.4/7.5 end of support, the 7.6.7 to 7.6.10 servicing releases, 7.7.0 GA and `$PSApplicationOutputEncoding`, so those are not repeated here.

Reliability note. WebFetch summarises pages with a small model and often drops years from GitHub dates. Every date below was cross-checked against a second page unless marked otherwise. Several search-result CVE pages contradicted each other, and those are marked "could not determine".

## Summary

- The largest shift is 2026-11-17: Microsoft deprecated Windows PowerShell 5.1 and announced PowerShell 7 as its in-box successor (MSIX, side by side) in the "next release of Windows". The 5.1 floor for installers stays correct for every Windows that exists today. No row contradicts it, but PS-CORE-02 needs a dated forward note.
- PowerShell 7.7 ships only as MSIX (no MSI). MSIX registers per user, so SYSTEM, services and scheduled tasks cannot find `pwsh`. This binds any installer or CI bootstrap that installs `pwsh` 7.7. The pair has no word on MSIX or MSI.
- PSResourceGet 1.3.0 (GA 2026-11-10 per GitHub, year inferred) is bundled in 7.7.0 as 1.3.0-rc2. The PowerShell team roadmap says Windows PowerShell support is dropped from 1.3. That would make a future `Install-PSResource` pin unusable on 5.1, so PS-GATE-05 must keep `Install-Module` for 5.1 hosts.
- 7.7.0 adds new syntax-neutral behavior only: no new operator that 5.1 cannot parse, no default-encoding change. PS-COMPAT-02 needs no new construct.
- 7.7 has a few cmdlet breaking changes an agent can trip on (`New-Guid` is UUID v7, `Export-Csv -NoTypeInformation` warns, `Test-Json` external schemas), all 7.7-only code. No rule needed for the first two. One CONSIDER for `Test-Json`.
- PSScriptAnalyzer (newest 1.25.0, March) and Pester (newest 6.2.0, September) shipped nothing in the window, so no heuristic became mechanical.
- No PowerShell CVE could be confirmed for the window. One listing (CVE-2026-124226, 2026-11-10) is unverified.

## Findings

### 1. PowerShell 7 coming to Windows; Windows PowerShell 5.1 deprecated (2026-11-17)

Status: new. The pair says nothing about an in-box PowerShell 7 or a 5.1 deprecation.

- [PowerShell team blog, 2026-11-17](https://devblogs.microsoft.com/powershell/powershell-7-coming-to-windows/): PowerShell 7 is the upgrade for Windows PowerShell 5.1 "beginning with the next release of Windows", delivered as an MSIX package, "designed to be used side by side with Windows PowerShell 5.1". Existing scripts, tasks and services keep running on 5.1. A Microsoft reply in the comments says 5.1 "remains supported and receives security updates per each Windows version's lifecycle" and that 7 is forward only, so earlier versions including 26H2 keep 5.1. No Windows version number is given.
- [KB5137172, published 2026-11-17](https://support.microsoft.com/help/5137172): applies to Windows 11 24H2, 25H2 and 26H2. States that Windows Server 2025 and Windows 11 26H2 are the last versions with 5.1 enabled by default, that 5.1 is deprecated in 2026, and that in the next Windows version 5.1 becomes a Feature on Demand enabled by default on new installs, with a later version not available. `powershell.exe` runs 5.1, `pwsh.exe` runs 7 or later, and `$PSVersionTable.PSEdition` ('Desktop' or 'Core') tells them apart. No change is required now.
- Known MSIX gaps per [PowerShell/PowerShell#27565](https://github.com/PowerShell/PowerShell/issues/27565) (opened 2026-06-05, last comment 2026-11-27): MSIX registers per user only, so SYSTEM, LocalSystem and service accounts cannot find or run `pwsh`. `$PSHome` is read-only, so `$profile.AllUsersAllHosts` cannot be written and `Update-Help -Scope AllUsers` fails. WinRM remoting, DISM cmdlets and Server Core activation are in progress. The ISE stays on 5.1 and is unsupported with 7.
- Not determined: which Windows release carries it, whether `pwsh.exe` is on PATH for all users, and whether 7.x can be pinned or downgraded.

Contradiction check: PS-CORE-02 (installer target 5.1, `#Requires -Version 5.1`) and the Target by Kind table remain correct. "Stock Windows runs 5.1" is true for every shipped Windows, and the deprecation is explicitly "no change required now". PS-GATE-08 (a `shell: powershell` step is 5.1) is unchanged.

### 2. PowerShell 7.7 is MSIX-only; no MSI (announced 2026-04-10, effective at 7.7.0 GA 2026-11-10)

Status: new to the pair, because the pair never names an install route.

- [MSI deprecation post, 2026-04-10](https://devblogs.microsoft.com/powershell/powershell-msi-deprecation/): from 7.7-preview.1 MSIX is the primary Windows install method and no MSI ships for 7.7 GA and beyond. MSI continues for existing releases, including 7.6 LTS, for its lifecycle (stated in a comment). The announcement is dated before the baseline, but its effect (7.7 GA) landed in the window and the pair is silent on it.
- [Announcing PowerShell 7.7 GA, 2026-11-10](https://devblogs.microsoft.com/powershell/announcing-powershell-7-7/): commenters report the package is MSIX only and a Microsoft employee points all-users and service scenarios at the 7.6 MSI.
- [v7.7.0 release](https://github.com/PowerShell/PowerShell/releases/tag/v7.7.0): the Appx manifest now blocks updates while PowerShell 7 is running; [v7.6.10](https://github.com/PowerShell/PowerShell/releases/tag/v7.6.10) detects MSIX installs through the package-family-name API.

### 3. PSResourceGet 1.3.x and what it does to `Install-Module` pins

Status: new to the pair. gates.md PS-GATE-05 pins `Install-Module PSScriptAnalyzer -RequiredVersion 1.25.0`, and SH-TEST-18 pins Pester the same way.

- [PSResourceGet releases](https://github.com/PowerShell/PSResourceGet/releases): v1.3.0-rc1 (20 Oct), v1.3.0-rc2 (29 Oct, adds `-AllowInsecureConnection` to `Publish-PSResource`), v1.3.0 and v1.3.1 (both 10 Nov). Years are not shown on the page; the 7.7.0 changelog bundling 1.3.0-rc2 confirms 2026. 1.3.0 adds XML validation of NuGet server responses, per-repository credential checks and package-name sanitising. 1.3.1 adds a prompt to choose a credential when ambiguous, which is a hang risk in unattended runs.
- [PowerShell team roadmap, 2026-05-20](https://devblogs.microsoft.com/powershell/powershell-psresource-roadmap-and-best-practices/) (before the window, but unmentioned in the pair): "Windows PowerShell support is being dropped starting with 1.3". Preview 1.3 adds the Microsoft Artifact Registry (MAR) as a default repository, and the post advises not using the PowerShell Gallery directly from production systems. The post does not mention PowerShellGet v2 status. I could not confirm the 5.1 drop from the 1.3.0 release page itself, so treat it as a roadmap statement.
- Effect: pinning stays `Install-Module -RequiredVersion` on a 5.1 host, which is what PS-GATE-05 says. On pwsh 7.7, `Install-PSResource -Version 1.25.0 -TrustRepository` is the in-box path. Not a contradiction.

### 4. PowerShell 7.7.0 and 7.6.x changes that touch generated code

All from [v7.7.0](https://github.com/PowerShell/PowerShell/releases/tag/v7.7.0), [v7.7.0-rc.1](https://github.com/PowerShell/PowerShell/releases/tag/v7.7.0-rc.1) (2026-10-29), the 7.6.x releases listed in the sibling file, and [What's New in 7.7](https://learn.microsoft.com/en-us/powershell/scripting/whats-new/what-s-new-in-powershell-77) (page text still at preview.5, last updated 2026-09-21).

| Change | Date | Effect on the pair |
|---|---|---|
| No new operator or syntax in the lists read | 2026-11-10 | PS-COMPAT-02 needs no new construct. A construct list cannot be proven complete from release notes, so the 5.1 parse stays the check. |
| `-Switch:$false` now honoured by `Split-Path`, `Get-Random`, `New-Guid`, `Where-Object -EQ:$false` and the Csv cmdlets | 7.7 | 7-only behavior. No rule. |
| `New-Guid` returns UUID v7 | 7.7 | 7.7-only; the floor is 7.6, so a script runs both. Rationale for a tell only if a script needs random GUIDs. No rule needed. |
| `Export-Csv -NoTypeInformation` warns; `-Append` with `-NoHeader` rejected | 7.7 | No rule needed: the cmdlet is not in the pair's scope. |
| `Test-Json` needs `-FetchExternalReference` for external schemas | 7.7.0-rc.1 (2026-10-29) | CONSIDER only, see candidate 5. |
| Update Notification feature removed | 7.6.8 (2026-10-22), 7.7.0-rc.1 | Positive: no more notification noise on stderr in CI. No rule needed. |
| SHA-1 file catalog warning | 7.7.0 and 7.6.10 (2026-11-10) | Binds installers that verify a `.cat` catalog. The pair prescribes SHA-256 or Authenticode (PS-SEC-01); no rule needed, see candidate 6. |
| CLM property assignment and implicit-remoting alias protections | 7.7.0-rc.1 | Binds scripts run under Constrained Language Mode. No rule needed: the pair has no CLM row and 7.7 is not the floor. |
| `Get-ChildItem -Name -Recurse` fix, `Resolve-Path -Relative` fix | 7.7.0-rc.1 | Behavior fixes, no rule. |
| `powershell.config.json` IO/JSON errors tolerated | 7.6.7 (2026-10-13), 7.7 | No rule. |
| `$PSApplicationOutputEncoding` | 7.7 | Already in the sibling research file. |
| .NET SDK 11.0.100, `X509CertificateLoader` replaces a deprecated constructor, AMSI content logging disabled in release | 7.7 | No rule. |

### 5. Windows security features and `irm | iex`

Status: could not determine any change in the window.

- Searches for Smart App Control, Administrator protection, Mark of the Web, WDAC and AMSI returned only general pages and a 2026-04-28 blog post ([Smart App Control](https://textslashplain.com/2026/04/28/smart-app-control/), secondary, before the window). Nothing dated 2026-10-11 to 2026-11-27 was found, and no Windows release-health or update-history page was opened. Marked "could not determine", not "unchanged".
- [Deprecated features in the Windows client](https://learn.microsoft.com/en-us/windows/whats-new/deprecated-features) (page date 2026-11-11, updated 2026-11-25) lists no new scripting-host item in the window other than Telnet Client (November 2026). It restates Windows PowerShell 2.0 deprecation (June 2025 reminder) and records WMIC removed as a Feature on Demand (August 2026). WMIC removal binds any installer that calls `wmic`; the pair does not name `wmic`. No rule needed: the pair's native rules apply, and a missing command is caught by gates-command-resolves (PS-GATE-06).

### 6. PSGallery policy, CVEs, analyzer and test tooling

- PSGallery: no PowerShell Gallery policy change found. The NuGet changes of 2026-08-03 (30-day API key cap from 2026-08-17, existing keys expire 2026-11-01) concern nuget.org, not the Gallery, per [the NuGet post](https://devblogs.microsoft.com/dotnet/strengthening-nuget-supply-chain-security-reducing-api-key-lifetime/). No rule: the pair covers consumption, not publishing. Could not determine whether the Gallery follows.
- CVEs: the PowerShell servicing releases in the window list no CVE ids on their release pages. A search listing shows CVE-2026-124226 (PowerShell security feature bypass, published 2026-11-10) on [stack.watch](https://stack.watch/vuln/CVE-2026-124226/), which has no advisory text or fixed version. MSRC was not opened. Could not determine.
- [PSScriptAnalyzer releases](https://github.com/PowerShell/PSScriptAnalyzer/releases): newest 1.25.0 (March), nothing in the window. [Pester releases](https://github.com/pester/Pester/releases): newest 6.2.0 (September), nothing in the window. PS-GATE-05, SH-TEST-18 and the pins are unchanged.
- The PowerShell-Docs commit log was not read. The 7.7 What's New page was fetched instead and is stale (preview.5).

## Normative guidance candidates

1. **PS-CORE-02 forward note (SHOULD, installer).** Rule: keep the installer target at Windows PowerShell 5.1. Add one sentence that an in-box PowerShell 7 (side by side, `pwsh.exe`) is announced for the next Windows release and that `powershell.exe` stays 5.1, so an installer never switches target on the strength of "7 is in Windows". Rationale: [KB5137172](https://support.microsoft.com/help/5137172) says no change is required and 5.1 remains on every current Windows; an agent trained on the headline may raise the installer floor to 7. Verification: reading heuristic on `#Requires -Version` of an installer (compat.md cells C1a and C1b); the kind table already catches it.
2. **New scope line in PS-CORE-02 or compat.md: pwsh 7.7 on Windows is MSIX (SHOULD, installer and CI bootstrap).** Rule: a script that installs or locates `pwsh` 7.7 on Windows must not assume it is machine-wide: do not rely on `pwsh` being on PATH for SYSTEM, a service or a scheduled task, and use the 7.6 MSI or `Get-Command pwsh` with a fail-closed check where all-users is required. Rationale: [#27565](https://github.com/PowerShell/PowerShell/issues/27565), MSIX is per-user, `$PSHome` is read-only. Verification: grep the installer for `msiexec` with a `PowerShell-7.7` URL or `winget install Microsoft.PowerShell` in a service context; otherwise a reading heuristic. Severity SHOULD, provisional. Revisit when #27565 closes.
3. **PS-GATE-05 clarifier (CONSIDER).** Rule: keep `Install-Module -RequiredVersion` for pins that run on a 5.1 host, and use `Install-PSResource -Version X -TrustRepository` only on pwsh 7. Rationale: the roadmap says PSResourceGet 1.3 drops Windows PowerShell; 1.3.1 can prompt for credentials. Verification: grep `Install-PSResource` in a file that is 5.1-bound (tell cell on a new line; the 5.1 parse does not catch a missing cmdlet). Not contradicting an existing row.
4. **New tell cell T11 (CONSIDER).** `Install-PSResource` and `Find-PSResource` in a file whose `#Requires` is below 7. One grep over `ps1s`, owner PS-COMPAT-05. Verification: watched red and green on a plant and its twin, as for T1 to T10.
5. **`Test-Json` external schema (no rule, or CONSIDER).** No rule needed: the pair has no JSON row. If added, one line under PS-COMPAT-05: pass `-FetchExternalReference` only on 7.7 and never on 6 or 7.6. Verification: grep `Test-Json -Schema`.
6. **SHA-1 catalog warning (no rule needed).** PS-SEC-01 already requires SHA-256 or Authenticode with an anchored signer pin. A `.cat` catalog signed with SHA-1 only prints a warning, which does not change the verdict of `Get-AuthenticodeSignature`.
7. **WMIC (no rule needed).** PS-GATE-06 (command resolver) and PS-NATIVE-01 cover a command that no longer exists. If the pair wants an explicit example, add `wmic` to the PS-NATIVE-01 rationale list.

## AI-agent angle

- An agent that read "PowerShell 7 is coming to Windows" raises an installer to `#Requires -Version 7`. Check: compat.md cell C1a, `#Requires` of an installer must read 5.1.
- An agent writes `winget install Microsoft.PowerShell` or an `.msi` URL for 7.7 inside a CI service or scheduled-task context, which is a no-op for SYSTEM. Check: grep the install line, run `Get-Command pwsh` in the target account.
- An agent pins `Install-PSResource` in a 5.1 job because 7.7 bundles it. Check: tell cell T11 or the 5.1 parse plus a run on `powershell.exe`.
- An agent calls `New-Guid` and assumes a random v4. Low impact, no check.

## Contested / evolving

- Whether `pwsh.exe` will be on PATH for all users under MSIX is open ([#27565](https://github.com/PowerShell/PowerShell/issues/27565), in progress, 2026-11-27). Trending toward a machine-wide store ("MachineFolder", PR 27632).
- The date of the Windows release that carries PowerShell 7 is not stated by Microsoft; press reports differ and are not sources.
- The PSResourceGet 5.1 drop is a roadmap statement; the 1.3.0 release page does not repeat it. Verify against the shipped module manifest (`PowerShellVersion`) before changing PS-GATE-05.
- The 7.7 Learn pages still describe preview.5, so any 7.7 claim rests on the GitHub releases.

## Row verdicts

| Row | Verdict | Fact and date | Source |
|---|---|---|---|
| PS-CORE-02, Target by Kind (installer 5.1) | unchanged, add forward note | 5.1 deprecated 2026-11-17, still on all current Windows | KB5137172 |
| PS-CORE-02 (script 7.6 floor) | unchanged | 7.7.0 GA 2026-11-10, floor stays 7.6 per sibling research | v7.7.0 |
| PS-COMPAT-02 | unchanged | no new 5.1-unparseable construct found in 7.7 notes | What's New 7.7, v7.7.0 |
| PS-GATE-05, SH-TEST-18 | unchanged | no PSScriptAnalyzer or Pester release in window; PSResourceGet 1.3.0 2026-11-10 | releases pages |
| PS-GATE-08 | unchanged | 5.1 custom shell still valid | KB5137172 |
| PS-SEC-01, PS-SEC-06, PS-ENC-*, PS-ERR-*, PS-NATIVE-* | unchanged | no relevant change in the sources read | v7.7.0 |
| Windows security feature rows (none exist) | could not determine | no dated source in window | n/a |
| CVE exposure | could not determine | MSRC not opened | stack.watch (unverified) |

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://devblogs.microsoft.com/powershell/powershell-7-coming-to-windows/ | PowerShell team announcement | 2026-11-17 | In-box PowerShell 7, MSIX, side by side |
| https://support.microsoft.com/help/5137172 | Windows KB, 5.1 deprecation | 2026-11-17 | Last Windows with 5.1 default, FoD plan |
| https://devblogs.microsoft.com/powershell/announcing-powershell-7-7/ | 7.7 GA post | 2026-11-10 | Features, breaking changes, MSIX comments |
| https://github.com/PowerShell/PowerShell/releases | releases index | 2026-10-13 to 2026-11-10 | Ten servicing and preview releases |
| https://github.com/PowerShell/PowerShell/releases/tag/v7.7.0 | 7.7.0 release | 2026-11-10 | SHA-1 catalog warning, Appx update block |
| https://github.com/PowerShell/PowerShell/releases/tag/v7.7.0-rc.1 | rc.1 release | 2026-10-29 | CLM, Test-Json, Update Notification removal |
| https://github.com/PowerShell/PowerShell/issues/27565 | MSIX gap tracker | opened 2026-06-05, last comment 2026-11-27 | Per-user, SYSTEM, all-users gaps |
| https://devblogs.microsoft.com/powershell/powershell-msi-deprecation/ | MSI deprecation post | 2026-04-10 | No MSI for 7.7 GA |
| https://devblogs.microsoft.com/powershell/powershell-psresource-roadmap-and-best-practices/ | PSResourceGet roadmap | 2026-05-20 | 1.3 drops Windows PowerShell, MAR |
| https://github.com/PowerShell/PSResourceGet/releases | PSResourceGet releases | 2026-10-20 to 2026-11-10 | 1.3.0-rc1 to 1.3.1 |
| https://github.com/PowerShell/PSResourceGet/releases/tag/v1.3.0 | 1.3.0 release | 2026-11-10 | Notes do not state the 5.1 drop |
| https://learn.microsoft.com/en-us/powershell/scripting/whats-new/what-s-new-in-powershell-77 | What's New 7.7 | page 2026-09-21 | Stale at preview.5 |
| https://learn.microsoft.com/en-us/powershell/scripting/install/powershell-support-lifecycle | Support lifecycle | page 2026-08-13 | Stale, lists 7.7 preview |
| https://learn.microsoft.com/en-us/windows/whats-new/deprecated-features | Windows deprecations | page 2026-11-11 | WMIC removed, Telnet deprecated |
| https://github.com/PowerShell/PSScriptAnalyzer/releases | PSScriptAnalyzer releases | newest March 2026 | Nothing new |
| https://github.com/pester/Pester/releases | Pester releases | newest 2026-09 | Nothing new |
| https://stack.watch/vuln/CVE-2026-124226/ | CVE aggregator | 2026-11-10 | Unverified lead only |

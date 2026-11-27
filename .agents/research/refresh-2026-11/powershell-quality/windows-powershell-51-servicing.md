---
title: Windows PowerShell 5.1 servicing delta, 2026-10-11 to 2026-11-27
pair: powershell-quality
date_researched: 2026-11-27
window_start: 2026-10-11
model: sonnet
sources_fetched: 12
---

# Windows PowerShell 5.1 servicing delta

This is a delta update of `shell-pwsh.md` and `shell-installer.md` (both dated 2026-10-11, measured on 5.1.26100.9444 with .NET Framework 4.8.1). Only changes inside the window are recorded. Everything not listed as "changed" is "unchanged" or "could not determine". No local Windows probe was run by this task, so no behaviour claim below is a measurement.

## Summary

- (a) No update in the window changed the Invoke-WebRequest prompt, added a bypass switch, or extended the prompt to `Invoke-RestMethod`. The open question "does 5.1 irm start prompting after KB5129195" has no upstream evidence of yes. The advisory [KB5074596](https://support.microsoft.com/KB/5074596) still covers only Invoke-WebRequest and has no revision after 2025-12-20. Behaviour on the new builds is not measured, so the answer to the open question is "no evidence of change, not re-measured".
- (b) The current 24H2 client build is 26100.9974 (KB5132061, 2026-11-10). Windows Server 2025 is 26100.33828 (KB5136489, 2026-11-13). A re-dated pin is not needed if the pin is reworded as a measurement record. See finding 2.
- (c) Pester inbox version: could not determine. No source in the window mentions Pester. Re-run the probe on the local host.
- (d) TLS guidance and .NET Framework 4.8.1 defaults: unchanged. The tls.md page still carries ms.date 06/04/2026. The 4.8.1 servicing in the window (October 2026 security rollup, November 2026 preview) has no TLS item.
- New, not in the baseline: KB5132061 (2026-11-10) strengthens Windows PowerShell script signing and signature verification with stricter UTF-8 validation. This is relevant to PS-ENC and to any signed script. See finding 6.
- Correction to the baseline: the Microsoft release-health page dates KB5129195 as 2026-09-14 (out-of-band, build 26100.9457), not 2026-09-15. The measured build 9444 is lower than both 9445 (2026-09-08 baseline update, KB5124008) and 9457, so the baseline host was measured before KB5129195. The "exempt only as of KB5129195" wording was therefore never a measurement of a post-KB5129195 build. See finding 1.

## Findings

### 1. Prompt behaviour (claim at risk: PS-COMPAT-06, open question in shell-pwsh.md)

Verdict for each claim:

| Claim | Verdict |
| --- | --- |
| "Since the 2025-12-09 update (CVE-2025-54100) a 5.1 call that parses the response prompts" | unchanged. The 5.1 [Invoke-WebRequest reference](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/invoke-webrequest?view=powershell-5.1) (ms.date 2026-01-20, last updated 2026-05-05, source [Invoke-WebRequest.md](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/5.1/Microsoft.PowerShell.Utility/Invoke-WebRequest.md)) still says the prompt appears after the 2025-12-09 update. |
| No bypass switch except `-UseBasicParsing` | unchanged. Same page: "There is no way to bypass this prompt without using the UseBasicParsing parameter." The KB article [KB5074596](https://support.microsoft.com/en-us/servicing/os/windows/2025/12/powershell-5-1-invoke-webrequest-preventing-script-execution-from-web-content) offers only `-UseBasicParsing` or `$PSDefaultParameterValues['Invoke-WebRequest:UseBasicParsing'] = $true`. Its change log has entries only for 2025-12-20. |
| `Invoke-RestMethod` and `-OutFile`-only downloads need nothing | could not determine for builds after 9444. The 5.1 [Invoke-RestMethod reference](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/5.1/Microsoft.PowerShell.Utility/Invoke-RestMethod.md) (ms.date 01/20/2026) mentions no security prompt for `irm`. Its warning block only says script code might run on parse and to use `-UseBasicParsing`. KB5074596 does not mention `Invoke-RestMethod`. Silence is not proof, and the 24H2 builds 26100.9457, 9550, 9711, 9725 and 9974 were not measured. |
| "`-OutFile -PassThru` is affected" | unchanged as to the prompt (the PassThru return value is a parsed response). New wrinkle, upstream text only: the 5.1 reference notes that with `-PassThru` "the output is written to the pipeline but the file is empty", linking [PowerShell issue 15409](https://github.com/PowerShell/PowerShell/issues/15409). This is documented on the page ms.date 2026-01-20, so it predates the window. Do not read it as a change in the window. Check it against the existing probe. |

MSRC for CVE-2025-54100: the [Security Update Guide page](https://msrc.microsoft.com/update-guide/vulnerability/CVE-2025-54100) is a JavaScript application, and the fetch returned only the page title. No revision history could be read. A newer PowerShell CVE in the window could not be identified from MSRC. KB5132061 (below) contains a PowerShell signature-verification hardening, but its text carries no CVE number in the summary that was read.

Answer to the open question: no KB in the window is documented to start prompting `irm`. The only candidate KBs on 24H2 are KB5127648 (2026-10-13, 26100.9711), KB5134133 (2026-10-26 out-of-band, 26100.9725) and KB5132061 (2026-11-10, 26100.9974). KB5127648 and KB5134133 do not mention Invoke-WebRequest or Invoke-RestMethod. KB5132061 mentions only the script-signing change.

Probe to re-run on the Windows host after updating to 26100.9974: R5 (the plant and twin under `-NonInteractive -File`), the `irm` twin, `-OutFile` only, and `-OutFile -PassThru`. Record the `$PSVersionTable.BuildVersion` and the exit codes.

### 2. Current 5.1 build string (claim at risk: build pin)

Windows 11 24H2 (OS build 26100), from the [Windows 11 release information](https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information) (ms.date 2026-11-19):

| Update | Date | Build | KB |
| --- | --- | --- | --- |
| 2026-09 B | 2026-09-08 | 26100.9445 | KB5124008 |
| 2026-09 OOB | 2026-09-14 | 26100.9457 | KB5129195 |
| 2026-09 D | 2026-09-22 | 26100.9550 | KB5124010 |
| 2026-10 B | 2026-10-13 | 26100.9711 | [KB5127648](https://support.microsoft.com/help/5127648) |
| 2026-10 OOB | 2026-10-26 | 26100.9725 | [KB5134133](https://support.microsoft.com/help/5134133) (CTL and trusted root payload for the eMudhra key compromise) |
| 2026-11 B | 2026-11-10 | 26100.9974 | [KB5132061](https://support.microsoft.com/help/5132061) |

Hotpatch track (same page): 2026-10 B 26100.9711 (KB5127648), 2026-11 B 26100.9911 (KB5132043).

Windows Server 2025 uses the 26100.33xxx revision range, from the [Windows Server release information](https://learn.microsoft.com/en-us/windows/release-health/windows-server-release-info) (ms.date 2026-11-19): 2026-10 B 26100.33650 (KB5126646), 2026-10 OOB 26100.33674 (KB5134137), 2026-11 B 26100.33822 (KB5131080), 2026-11 OOB 26100.33828 (KB5136489, 2026-11-13).

Decision: the pin "Windows PowerShell 5.1.26100.9444" can stand only as a measurement record ("measured 2026-10-11 on 5.1.26100.9444"). It must not read as the current or supported build. 9444 is not a row on the release page: it is below 9445, so it is a pre-release or preview build that predates KB5129195, KB5124008 and every later cumulative update. Candidate rule: replace "pinned to" wording in `rules/powershell-quality.md` (Dates, PS-CORE-01) and the depth-file headers with "measured on", and name 26100.9974 (KB5132061, 2026-11-10) as the latest build researched but not measured. Verification: `grep -n "5.1.26100.9444" rules skills` shows every use sits in "measured" phrasing; `$PSVersionTable.BuildVersion` on the host reports the build for any re-measure.

.NET Framework 4.8.1 servicing in the window ([release notes index](https://learn.microsoft.com/en-us/dotnet/framework/release-notes/release-notes), ms.date 2026-11-19):

- 2026-10-13 cumulative update, [October 2026](https://learn.microsoft.com/en-us/dotnet/framework/release-notes/2026/10-13-october-cumulative-update): KB5127690 for Windows 11 24H2, 25H2 and Server 2025 (4.8.1). It lists 20 CVEs, no quality or reliability changes, and no TLS item.
- 2026-11-19 cumulative update preview, [November 2026](https://learn.microsoft.com/en-us/dotnet/framework/release-notes/2026/11-19-november-cumulative-update-preview): KB5137003 (25H2), KB5137005 (26H1), KB5137006 (26H2). The 24H2 and Server 2025 rows are not in that table. The only change is a Canadian time-zone daylight saving rule fix (applies to 4.8.1). No security, TLS or networking item.

### 3. Pester inbox version (claim at risk: SH-TEST-18)

Could not determine. None of KB5127648, KB5134133, KB5132061, the .NET Framework notes or the Invoke-WebRequest pages mention Pester. Windows cumulative updates do not normally touch `C:\Program Files\WindowsPowerShell\Modules\Pester`, but that is a general expectation and not a fetched fact. Probe: `powershell -NoProfile -Command "(Get-Module -ListAvailable Pester | Select Version, Path | Format-Table -Auto | Out-String)"` on 26100.9974, and compare with 3.4.0. Until then SH-TEST-18's statement stays as the 2026-10-11 measurement.

### 4. TLS guidance (claim at risk: PS-SEC-06)

Unchanged. [tls.md](https://raw.githubusercontent.com/dotnet/docs/main/docs/framework/network-programming/tls.md) has ms.date 06/04/2026, the same as the baseline. Its text, as fetched: for apps targeting 4.7 or later, `SystemDefaultTlsVersions` "defaults to a value of 1" ("a secure default that we recommend"); for 4.6 or later `SchUseStrongCrypto` defaults to 1; do not set a protocol in code because it overrides the registry; the registry keys do not exist by default and affect all applications. The page gives no 4.8.1-specific default and lists 4.8.1 in its support table with TLS 1.2 on Windows 10 and TLS 1.3 on Windows 11. A precision note: the page says not to set the protocol in code, and says the keys default to 1 for 4.7+; it does not literally say "do not set it on .NET 4.7+". If PS-SEC-06's rationale quotes the phrase "Microsoft says not to set it on .NET 4.7+", rephrase to "Microsoft says to leave the protocol to the OS and not set it in code". This is a wording check against the source, not an upstream change.

### 5. PS-GATE-08 rationale (NullReferenceException under the `-Command` wrapper)

Could not determine. No upstream source describes the `NullReferenceException` with closed stdin. It rests on the project's own probe (cell 08-a). The behaviour is a consequence of the prompt, which is unchanged upstream (finding 1). Re-run cell 08-a on 26100.9974.

### 6. New in the window: script signing hardening (KB5132061)

[KB5132061](https://support.microsoft.com/help/5132061) (2026-11-10, OS builds 26300.9974, 26200.9974, 26100.9974) states that "This update strengthens security for PowerShell script signing and signature verification." It adds stricter encoding validation, so a script with invalid UTF-8 may fail signature checks. Microsoft suggests re-saving the script as valid UTF-8 with a BOM and signing it again. The scope in the KB (Windows PowerShell, per the fetched summary) was not confirmed as 5.1 only. The rule set says ASCII only and no BOM for installers. A signed script is rare in the fleet, and ASCII is valid UTF-8, so the rule stands for unsigned scripts. This conflicts with the "no BOM" advice only for Authenticode-signed files.

## Normative guidance candidates

1. Reword the build pin as a measurement record. Rule: write "measured on Windows PowerShell 5.1.26100.9444 on 2026-10-11", never "pinned to" or "current". Rationale: 9444 predates every supported 24H2 cumulative update; the latest researched build is 26100.9974. Verify: `grep -rn "26100.9444" rules skills` and read each hit for "measured" wording.
2. Correct the date of KB5129195. Rule: write 2026-09-14 (out-of-band, 26100.9457). Rationale: the release-health page says 2026-09-14. Verify: `grep -rn "KB5129195" rules skills .agents/research/shell-*.md` and check each date.
3. Keep PS-COMPAT-06's "irm exempt" claim marked as measured on 9444 only. Rationale: 9444 predates KB5129195, KB5127648 and KB5132061; no upstream text shows a change, but no measurement either. Verify: re-run the probe list in finding 1 on 26100.9974 and then drop the qualifier.
4. Optional new rule for signed scripts: a script that is Authenticode-signed is saved as valid UTF-8 and re-signed after any edit; unsigned installers stay ASCII without BOM. Rationale: KB5132061 stricter UTF-8 validation. Verify: `Get-AuthenticodeSignature <file>` returns `Valid` on 26100.9974 after the file is saved.
5. Reword PS-SEC-06's source note to "leave the protocol to the OS and do not set it in code" (finding 4). Verify: read the sentence against the tls.md text.

## AI-agent angle

- Training data predates the 2025-12-09 prompt. An agent writes `iwr` without `-UseBasicParsing` and sees it pass on a dev host. Check: `grep -nE "(Invoke-WebRequest|\biwr\b)" *.ps1` and look for `-UseBasicParsing` or the `$PSDefaultParameterValues` line.
- An agent assumes the newest KB added a bypass or env var to skip the prompt. None exists. Check: the guidance must name only `-UseBasicParsing`.
- An agent quotes a build number as the "current 5.1 build". The current build string is 26100.9974 on 24H2 client and 26100.33828 on Server 2025; they differ by track. Check: a build number in a pin always states its host and date.

## Contested / evolving

- Whether 5.1 `irm` will start prompting: no evidence, trend unknown as of 2026-11-27. Microsoft's docs for 5.1 `Invoke-RestMethod` are silent.
- The release page lists hotpatch builds (26100.9911) beside baseline builds. A Windows 11 24H2 Home and Pro edition reaches end of updates with KB5127648 (2026-10-13), per that KB.

## Sources

| URL | What it is | Date | Why |
| --- | --- | --- | --- |
| https://learn.microsoft.com/en-us/windows/release-health/windows11-release-information | Windows 11 release history, builds and KBs | ms.date 2026-11-19 | primary: build table |
| https://learn.microsoft.com/en-us/windows/release-health/windows-server-release-info | Server release history | ms.date 2026-11-19 | primary: Server 2025 builds |
| https://support.microsoft.com/help/5127648 | October 2026 cumulative update, 24H2 | 2026-10-13 | primary: no PowerShell web change |
| https://support.microsoft.com/help/5134133 | October 2026 out-of-band, CTL update | 2026-10-26 | primary |
| https://support.microsoft.com/help/5132061 | November 2026 cumulative update | 2026-11-10 | primary: script signing |
| https://support.microsoft.com/en-us/servicing/os/windows/2025/12/powershell-5-1-invoke-webrequest-preventing-script-execution-from-web-content | KB5074596 advisory | 2025-12-09, last change 2025-12-20 | primary: prompt and bypass |
| https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/invoke-webrequest?view=powershell-5.1 | 5.1 Invoke-WebRequest reference | ms.date 2026-01-20 | primary |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/5.1/Microsoft.PowerShell.Utility/Invoke-RestMethod.md | 5.1 Invoke-RestMethod reference | ms.date 01/20/2026 | primary |
| https://raw.githubusercontent.com/dotnet/docs/main/docs/framework/network-programming/tls.md | .NET Framework TLS best practices | ms.date 06/04/2026 | primary |
| https://learn.microsoft.com/en-us/dotnet/framework/release-notes/release-notes | .NET Framework servicing index | ms.date 2026-11-19 | primary |
| https://learn.microsoft.com/en-us/dotnet/framework/release-notes/2026/10-13-october-cumulative-update | .NET Framework October 2026 | 2026-10-13 | primary |
| https://learn.microsoft.com/en-us/dotnet/framework/release-notes/2026/11-19-november-cumulative-update-preview | .NET Framework November 2026 preview | 2026-11-19 | primary |

Not readable: the MSRC update guide for CVE-2025-54100 (returned only a title; JavaScript page). The KB5074596 support page URL without the `servicing/os` path returned 404; the full URL above works. Fewer than 12 primary sources were available on the narrow delta question; no search snippets were used as evidence.

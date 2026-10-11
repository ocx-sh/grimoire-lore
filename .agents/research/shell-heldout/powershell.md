---
title: PowerShell held-out round - PS-COMPAT, PS-ENC, PS-ERR, PS-NATIVE, PS-GATE on nine unseen repos, and the resolver out of sample
topic: shell-heldout/powershell
agent: sonnet research subagent (held-out round, PowerShell half)
model: sonnet
date_researched: 2026-10-11
sources_count: 23
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/powershell/ (tools/, plants/, out/, web/); clones under /home/mherwig/.cache/research-lang/heldout/shell/; Windows staging C:\Users\ecom\shell-wintest\heldout-ps\
scope: |
  Tests the PS-* MUST rules of shell-pwsh.md (PS-ENC-07..10 and PS-GATE-01..05 included) and their checks on nine PowerShell repos outside the 1,327-file corpus (2,197 .ps1/.psm1/.psd1 files, 2,060 of them .ps1), on the Windows host (Windows PowerShell 5.1.26100.9444 and pwsh 7.6.6, PSScriptAnalyzer 1.25.0), and answers the PS-GATE-06 question: can the command resolver be MUST for a project with its own allow-list.
  Every finding is classified as an existing class, a check fix, or a new class with a plant and a compliant twin. No macOS host exists, so nothing here is a macOS claim. Dated 2026-10-11; every behaviour claim carries its engine version.
---

# PowerShell held-out round

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- **Verdict: not clean in any of the five families.** Every family produced a check fix or a new class this round, so the converge-on-failure-classes stop condition is not met; one more held-out round is needed after the fixes below land. No MUST rule was contradicted on its intent, but PS-ENC-01 and the PS-COMPAT-04 text over-reach as written.
- **The 5.1 parse gate is the strongest asset.** `Parser::ParseFile` on Windows PowerShell 5.1.26100.9444 reported 76 parse errors in 19 files; pwsh 7.6.6 reports 5 errors in 5 files. 15 files (68 errors) fail only on 5.1 (Azure 9, Pode 5 locale data files, PSReadLine 1), 4 fail on both (gen-mail, 3 choco files: real defects and un-rendered templates), 1 fails only on 7.6 (a module not installed at parse time). No real 7-only construct slipped past it; one false class (Pode locale data) and one environment class (`TypeNotFound` on a class base type) did not need 7-only syntax.
- **The static fallback greps of PS-COMPAT-02 recall 5 of 7** of the files that fail on 5.1 for 7-only syntax. Two gaps found: `&&` at end of line (PSReadLine `CloseDupIssues.ps1:101`) and generic static method calls `[T]::M[X](...)` (7.3+; Azure `ParseServiceContactsList.ps1:126`). Both now have a watched grep.
- **PS-GATE-04 as written (parse every 5.1-bound file) has a false positive class:** BOM-less UTF-8 culture-directory `.psd1` files (Pode `src/Locales/{ar,ja,ko,pl,zh}/Pode.psd1`) fail `ParseFile` and `Import-PowerShellDataFile` on 5.1 but load correctly through `Import-LocalizedData` (5.1.26100.9444). The gate reported 43 errors; a loader-aware gate reports 0.
- **PS-GATE-01 wrapper fail-open found:** PSSA 1.25.0 throws RULE_ERROR on a module manifest whose `FormatsToProcess` file is missing; the shipped wrapper surfaces it as exit 1 (findings) instead of 2 (misconfigured). Fixed in `Invoke-PSGate-rev3.ps1`, watched red then green.
- **A sixth way a PowerShell gate fails open:** winutil's PSSA step prints findings and never exits non-zero (`ChrisTitusTech/winutil@07ccd8e2e755:.github/workflows/unittests.yaml:19-27`). A grep finds it with 1 hit on 9 repos, silent on the twin.
- **PS-GATE-02 true positive:** Pode's `PSScriptAnalyzerSettings.psd1:2` sets `Severity = @('Error','Warning','Information')` with no `ParseError`. 1 of 1 live settings files with a `Severity` list; the commented example in vscode-powershell is a false positive of the unanchored grep.
- **PS-GATE-03 per-kind settings are noisy and drifted:** with the shipped table, the script kind reports 580 findings in 265 files, the test kind 1,098 in 552, and the module kind 2,273 in 1,322 (Error-severity: 6, 70, 28). The shipped script/test files lacked the `PSUseBOMForUnicodeEncodedFile` exclusion the table lists, and the test kind needs a `PSAvoidUsingConvertToSecureStringWithPlainText` exclusion (68 Error findings, all fixtures). A baseline or ratchet is needed before a repo can adopt it.
- **PS-ENC-01's grep counts the BOM as non-ASCII.** `grep -P '[^\x00-\x7F]'` hit 485 files, but 403 of them are ASCII files that merely start with a BOM (choco 239 of 275); only 82 files have non-ASCII content. Of those 82, 47 (57%) carry a BOM and work on 5.1.26100.9444 (choco 36, PSDepend 8, Azure 3) and 35 do not (24 `.ps1`, 11 Pode locale `.psd1`). The defect is non-ASCII without BOM, so ASCII-only as a MUST over-reaches; the reworded check is "non-ASCII content and no BOM" (V-NOBOM, 35 hits).
- **PS-ENC-02 grep is not usable project-wide:** a BOM is on 391 `.ps1` files and 0 are shebang or identified `iex`-served; the rule needs a file-role scope, not a grep.
- **New encoding class, en dash as a parameter prefix:** `Get-ChildItem –Path .` runs on pwsh 7.6.6 and on a BOM'd file under 5.1.26100.9444, and is a parse error in a BOM-less file under 5.1 (Azure `Az.Tools.Installer/GenerateHelp.ps1:14` and `Az.Tools.Predictor/GenerateHelp.ps1:14`). Not covered by PS-ENC-08 (which lists U+2018..U+201E).
- **PS-ENC-08 held, 2 of 2:** the V2 grep found curly quotes in code positions in 2 Azure files, both true positives; **PS-ENC-07 held, 1 of 1:** `winutil Invoke-WinUtilISOScript.ps1:736` uses `[Text.Encoding]::Default`.
- **PS-ENC-10 grep V3a is 0 of 22 true positives:** 20 hits are in `shell: pwsh` steps (7.x `>>` is UTF-8, safe) and the 2 `shell: powershell` hits write `GITHUB_STEP_SUMMARY`, which the rule does not cover; the runner's three readers detect a BOM (`FileCommandManager.cs:138,258,369`). The check needs the step's effective shell, which `step-shell.py` resolves (watched on a plant).
- **PS-COMPAT-04's D2/D5 AST checks fire on safe code:** 0 of the 96 `$IsX` hits and 0 of the 24 `$PSVersionTable.Platform/.OS` hits sit in a file that sets `Set-StrictMode`; an undefined `$IsLinux` is falsey, the right answer on Windows. Only `$IsWindows` used alone (positive or negated) is silently wrong on 5.1. Split the rule by variable.
- **PS-COMPAT-05's named list covers 7 of the 19** distinct (parameter or command) 7-only names found by the resolver; `Out-File -Path`, `ConvertTo-Csv -IncludeTypeInformation`, `ConvertFrom-SecureString -AsPlainText`, `ConvertFrom-Json -NoEnumerate/-Depth`, `-Authentication/-Token/-ResponseHeadersVariable/-StatusCodeVariable` are missing. The resolver, not the list, is the check.
- **PS-GATE-06 decision: the unresolved-command mode stays SHOULD and advisory even with a project allow-list.** With the corpus allow-list, 3,986 of 4,062 findings (98.1%) are false (69% once one project's two compiled commands are removed), 3 of 9 repos produce only false findings, and only 2 of 44 false names recur across repos so allow-lists do not transfer. The unknown-parameter mode, after the rev3 provider-dynamic-parameter fix, has 0 false of 58 findings; it is a candidate for MUST after a fresh held-out round.
- **A wildcard allow-list entry is a blind spot, watched:** `-Allow '*-Az*'` silences a hallucinated `Get-AzVMFooBarBaz` (2 findings become 1).
- **Run-lint (PS-ERR-03) needed two fixes:** it ignored `defaults.run.shell` (missed a plant), and counted here-string and hashtable lines as natives (false positives). Fixed lint reports 4 findings on the 86 YAML files under `.github/` in the nine repos, each a step with two or more unguarded natives that I read.
- **Grep checks for PS-NATIVE-01 and PS-NATIVE-02 were imprecise** (comments, array-form arguments, XML text, package names), and PS-ERR-05's grep matched its only hit for the wrong reason. Rewritten forms are in the candidates table; the PS-ERR-05 rewrite is not verified.

## Findings

Engine and tool versions throughout: Windows PowerShell 5.1.26100.9444 ("5.1"), pwsh 7.6.6 ("7.6"), PSScriptAnalyzer 1.25.0 ("PSSA"). Repos are cited `repo@sha12:path:line`; the shas are in the Sources table. Counts come from the files named in each Verification-runs row.

**Held-out set.** chocolatey/choco (354 files), PowerShell/PSReadLine (10), microsoft/winget-cli (6), badgerati/Pode (276), ChrisTitusTech/winutil (168), dataplat/dbatools-public (968), PowerShell/vscode-powershell (22), RamblingCookieMonster/PSDepend (154), Azure/azure-powershell (239): 2,197 files. Of 2,060 `.ps1` files only 4 carry a `#Requires -Version`/`-PSEdition` line (0.2%; a fifth is a `.psm1`), so target scope cannot be read from the files; this is the single largest source of false findings in every scope-blind check below.

### 1. PS-COMPAT: the 5.1 parse gate works; four check gaps

`parse-gate.ps1` under 5.1.26100.9444: 76 parse errors in 19 files; under 7.6.6: 5 errors in 5 files. 15 files fail only on 5.1:

| Repo | Files failing 5.1 and not 7.6 | Construct |
|---|---|---|
| azure-powershell | `tools/ExecuteCIStep.ps1:278` | `&&` |
| azure-powershell | `tools/GenerateCmdletDesignMarkdown.ps1:71,74`, `tools/Docs/GenerateDotNetCsv.ps1` | `?:` ternary |
| azure-powershell | `tools/SwaggerCI/psci.psm1`, `tools/BuildScripts/RemoveUnwantedFiles.ps1` | line starting with `\|` |
| azure-powershell | `tools/Github/ParseServiceContactsList.ps1:126` | generic static method call `DeserializeObject[T](...)` |
| azure-powershell | `tools/Az.Tools.Installer/internal/Classes.ps1:18` | `TypeNotFound` on a class base type (`Microsoft.ApplicationInsights.TelemetryClient`, assembly not loaded when 5.1 parses; 7.6 defers): environment-dependent, not syntax |
| azure-powershell | `tools/Az.Tools.Installer/GenerateHelp.ps1:14`, `tools/Az.Tools.Predictor/GenerateHelp.ps1:14` | en dash parameter prefix in a BOM-less file |
| PSReadLine | `tools/issue-mgmt/CloseDupIssues.ps1:101` | `&&` at end of line |
| Pode | `src/Locales/{ar,ja,ko,pl,zh}/Pode.psd1` | BOM-less UTF-8 data (finding 5) |

Failing both engines (real defects, not 7-only; 8 errors in 4 files): `azure-powershell@f26e66248b28:tools/ReleaseTools/gen-mail.ps1:19` (trailing comma after the last parameter; 5 errors on 5.1, 1 on 7.6), `choco@1a957a920a1e:Invoke-AuthedTests.ps1:26` (`if (...)` with no block), and two choco template files `tests/packages/{msi,zip}.template/templates/tools/chocolateyinstall.ps1:3` (`[[AutomaticPackageNotesInstaller]]` placeholder, the un-rendered-template class the fleet round already saw). Failing only on 7.6: `azure-powershell@f26e66248b28:tools/InstallationTests/NetcoreTests/Compute/DummyConfig.ps1:3` (`ModuleNotFoundDuringParse`, `PSDesiredStateConfiguration` absent on the host: an environment class). Gate rules: exclude template directories or render first; treat `TypeNotFound` and `ModuleNotFoundDuringParse` as environment findings that need the dependency installed, not as syntax defects.

The static fallback greps (shell-pwsh PS-COMPAT-02) recall: 5 of the 7 files that fail on 5.1 for 7-only syntax (a sixth, `Classes.ps1`, is not syntax) (`static-recall.sh`: C1, C2, LeadPipe hit; `ParseServiceContactsList.ps1` NONE; `CloseDupIssues.ps1` only the new end-of-line form).

```powershell
# 7-only: parse error on 5.1, fine on 7.6          # compliant on both
cmd /c exit 0 &&                                    cmd /c exit 0
    cmd /c exit 0                                   if ($LASTEXITCODE -eq 0) { cmd /c exit 0 }

$e = [System.Array]::Empty[string]()                $e = [string[]]@()
```

Class: **check fix** (two static-fallback greps, V-EOL and V-GEN). V-EOL precision on the held-out set is 1 of 6: PSDepend's 5 hits are C# lines inside an `Add-Type` here-string (`PSDepend/Private/SemanticVersion.ps1:364,365,400,512,513`). It stays a fallback; the 5.1 AST parse is the record.

**D2 and D5 (PS-COMPAT-04) over-fire.** The AST denylist (`denylist-51-rev2.ps1`) reported 607 findings on the nine repos: D0 14, D2 96, D3 39, D4 3, D5 24, D6 373, D7 58. D2 (`$IsWindows`-family undefined on 5.1) and D5 (`$PSVersionTable.Platform/.OS` absent on 5.1) claim "throws under StrictMode". 0 of the 120 D2/D5 hits are in a file containing `Set-StrictMode`. Of 96 D2 hits, 84 name only `$IsLinux`/`$IsMacOS` (undefined is falsey, correct on Windows 5.1) and 12 name `$IsWindows`. Probed on 5.1.26100.9444 with StrictMode: `$PSVersionTable.Platform` throws ("property cannot be found"), `$PSVersionTable.Keys -contains "Platform"` returns False; on 7.6 the same expressions return `Win32NT`/True (`probe-platform-key.ps1`).

```powershell
# wrong on 5.1: $IsWindows is $null, so the Windows branch is skipped   # right on both
# psakeFile.ps1:22 (PSDepend)                                            # PSDepend Test-Dotnet.ps1:17 style, with the guard first
if (-not $IsWindows) { $PSBPreference.Test.ExcludeTagFilter = @('WindowsOnly') }
                                                                         if ($PSVersionTable.PSEdition -eq 'Desktop' -or $IsWindows) { ... }
```

`$IsWindows` used alone is a silent wrong branch on 5.1 (`psakeFile.ps1:22`, `azure-powershell/tools/StaticAnalysis/CollectStaticAnalysisPipelineResult.ps1:24`, `PSReadLine/tools/CheckHelp.ps1:30` where a later else-branch calls a .NET type). Others are guarded (`Pode pode.build.ps1:605` adds an `$env:ProgramFiles`/`PSEdition` test; `PSDepend GitHub.ps1:175` uses `Get-Variable`). The 10-hit V-PLAT grep is not fully triaged: 3 reachable-wrong read in context, 2 guarded read in context, 5 unread. Class: **check fix + rule refinement** (see candidates).

**PS-COMPAT-05's list is a sample.** The resolver found 19 distinct 7-only (name, parameter) pairs, 51 findings; the rule's list names 7 of them. The grep C10 had two defects: `Get-Error` matched `Get-ErrorMessage` 72 of 72 times (dbatools), and `-Parallel` matched dbatools' own parameter. Corrected V-C10 finds 37 hits (Pode 19, Azure 15, choco 3), silent on the twin; the old form fires on the twin.

```powershell
# 5.1 throws                                          # compliant
Get-Content $p -AsByteStream                           Get-Content $p -Encoding Byte        # 5.1; on 7: -AsByteStream
$j | ConvertFrom-Json -AsHashtable                     # guard with $PSVersionTable.PSEdition, or avoid
Join-Path $a $b $c                                     Join-Path (Join-Path $a $b) $c
Out-File -Path out.txt                                 Out-File -FilePath out.txt
```

The 26 Pode 7-only findings split: 7 sit under the project's own edition helper (`badgerati/Pode@89797a301afe:src/Private/Helpers.ps1:1587-1588` `if (Test-PodeIsPSCore)`) which the resolver's version-guard does not model; 19 are unguarded (examples 14, `pode.build.ps1` 3, `src/Pode.psm1:61`, `Logging.ps1:392`, `Secrets.ps1:223`). Class: **new class, project-own edition helper** (guard modelling) plus **check fix**.

**PS-COMPAT-01's grep fails on CRLF.** The `grep -L -x -e '#Requires -Version 5.1'` form lists winget's compliant `tools/ManifestValidation/Invoke-ManifestValidation.ps1:1` (the line ends `\r`): 6 of 6 winget files reported missing. A `^#[Rr]equires -Version` anchor fixes it (candidates).

### 2. PS-ENC: ENC-01 over-reaches, ENC-02 needs scope, one new class

| Check | Hits | True positives | Verdict |
|---|---|---|---|
| ENC-01 any byte above 0x7F (`.ps1/.psm1/.psd1`, UTF-8 locale) | 485 files in 6 repos | 403 are BOM-only ASCII files (a check defect); 82 have non-ASCII content: 47 BOM'd and working, 35 BOM-less | rule too strict, rewrite to "non-ASCII content needs a BOM"; the grep must skip the BOM |
| ENC-02 any BOM (`.ps1`) | 391 files | 0 shebang, 0 identified `iex`-served | grep unusable; scope by role |
| ENC-07 V1 | 1 | 1 (`winutil Invoke-WinUtilISOScript.ps1:736`) | holds |
| ENC-08 V2 | 2 files (4 lines) | 2 of 2 (Azure `VirtualMachineScaleSetTests.ps1`, `gen-mail.ps1`) | holds |
| ENC-10 V3a | 22 | 0 of 22 | needs the step shell and the file-variable list |
| ENC-03 lead (`WriteAllText` with `::UTF8`) | 7 | not triaged | out of this round |
| ENC-04 bare `Get-Content` | 495 | not triaged | SHOULD; unusable as a gate |

**ENC-01.** A byte scan of all 2,197 files (not the grep) finds 82 with non-ASCII content: 47 with BOM (45 `.ps1`, 2 `.psm1`) and 35 without (24 `.ps1`: dbatools 11, Azure 8, Pode 4, PSDepend 1; 11 Pode locale `.psd1`). A further 403 files are ASCII with a BOM, which the grep counts as non-ASCII because the BOM is U+FEFF in a UTF-8 locale and bytes above 0x7F in the C locale. Of the 35 BOM-less files, 7 fail to parse on 5.1 (the 2 en-dash files and 5 of Pode's locale data files, which load fine through their own loader). The other 28 decode as ANSI on 5.1 with no error (mojibake in strings), which is the real hazard, and a BOM avoids it.

```powershell
# no BOM, non-ASCII: 5.1 reads it as ANSI                 # BOM'd UTF-8 (EF BB BF) or [char]0x00E9
$s = "café"                                                $s = "caf$([char]0x00E9)"
```

**ENC-08 holds** (curly quotes in code: Azure 4 lines, both files real). **ENC-10 holds on intent**, but the V3a grep is shell-blind: the plant (`shell: powershell` + `>> $env:GITHUB_ENV`) and its twin (`shell: pwsh`) both match the grep, and `step-shell.py` separates them (`shell=powershell` vs `shell=pwsh`). Of the 22 hits, 20 are `shell=pwsh` and 2 (`dbatools-public/.github/workflows/ci-azure.yml:318,320`) are `shell=powershell` writing `GITHUB_STEP_SUMMARY`.

**New class: en dash (U+2013) or em dash (U+2014) as a parameter prefix.** Plant `plants/endash/bad/endash.ps1` (`Get-ChildItem –Path .`, BOM-less): 5.1 fails to parse, 7.6 prints `done`. Twin `plants/endash/bom/endash.ps1` (same text, BOM, CRLF): `done` on both. Held-out: `GenerateHelp.ps1:14` (two Azure files, BOM-less, parse errors) versus `InstallationTests/NetcoreTests/Compute/SqlIaaSExtensionTests.ps1:83` (BOM, three en-dash parameters, parses). So the defect is the missing BOM, and PS-ENC-08's seven-character list does not name it.

### 3. PS-ERR and PS-NATIVE: the rules stand, the lint and greps need work

The PS-ERR-03 lint (`pwsh-run-lint.py`) over the 86 YAML files under `.github/` in the nine repos: original 1 finding; with `defaults.run.shell` support (`run-lint-default.py`) 10 findings, 6 of which the rev3 fixes drop (a C# here-string in winutil `generate-title-screen.yaml`, hashtable lines in dbatools); `pwsh-run-lint-rev3.py` (default shell, here-strings stripped, `key = value` lines ignored) 4 findings, all consistent with PS-ERR-03: `dbatools-public/.github/workflows/reposize.yml` step 2 (`gh repo clone` and `gh pr checkout` unguarded) and three `docker run` blocks (`integration-tests.yml` step 5, `gallery.yml` step 6, `azure-migration-tests.yml` step 3). Plants: `miss` (default shell, 2 natives) original 0 / rev3 1; `fp` (hashtable) original 1 / rev3 0; twin 0 / 0.

| Grep | Hits | Assessment |
|---|---|---|
| ERR-05 (`iex`+`irm`, no `MyInvocation.MyCommand.Path`, has `exit`) | 1 | false: `winutil functions/private/Invoke-WinUtilInstallPSProfile.ps1:46` puts `irm ... \| iex` in a string for a child `pwsh -Command` |
| ERR-06 (`2>&1`/`*>&1` in a `Stop` file) | 3 | rule-conformant matches (`chocolatey.Tests.ps1:171`, `pester/sanity.Tests.ps1:57`, `Invoke-WinUtilInstallPSProfile.ps1:46`); none executed, a hit is not a failure |
| NATIVE-01 bare `curl` (old form) | 48 | 7 are a package name (choco), 18 comments, 23 real calls, all in one Pode Pester file that targets 7.x |
| NATIVE-02a `Start-Process -ArgumentList "<string>"` (old form) | 18 | 8 array form, 2 XML text, 1 comment, 2 single-token strings, 5 real |

NATIVE-01 is a target-scope question: `curl` is the 5.1 alias for `Invoke-WebRequest` and resolves to `curl.exe` on 7.x, so the 23 Pode calls are only wrong if the file runs on 5.1 (it does not). Class: **check fix** for both greps (V-CURL, V-ARGS) and a **scope** requirement shared with every scope-blind check.

### 4. PS-GATE

**GATE-01 (wrapper).** Plant `plants/crash/bad` (a manifest whose `FormatsToProcess` file is absent): `Invoke-PSGate.ps1` exits 1 with a RULE_ERROR trace on the host console (a misconfigured gate reported as "findings"); `Invoke-PSGate-rev3.ps1` exits 2 with `psgate: analyzer error (exit 2, not 1)`. Twin (file present): 0 findings. Held-out trigger: `azure-powershell` module kind (`tools/AzDev/AzDev/AzDev.psd1` points to a missing `AzDev.format.ps1xml`). The module-kind run only completed per file or without manifests. Class: **new class (analyzer crash is misconfiguration)**.

```powershell
# shipped wrapper: crash becomes exit 1                     # rev3: crash is exit 2
$findings = @(Invoke-ScriptAnalyzer -Path $Path -Recurse -Settings $Settings)
                                                            try { $findings = @(Invoke-ScriptAnalyzer -Path $Path -Recurse -Settings $Settings -ErrorAction Stop) }
                                                            catch { Stop-Gate "analyzer error (exit 2, not 1): $($_.Exception.Message -replace '\s+', ' ')" }
```

**GATE-01 new fail-open mode: report-only.** `winutil@07ccd8e2e755:.github/workflows/unittests.yaml:19-27` runs `Invoke-ScriptAnalyzer ... -Recurse`, prints the table or "no diagnostics", and never sets a status. Its `-Settings` file is named `lint/PSScriptAnalyser.ps1` (it exists; a misspelt name that happens to resolve). It also pins `-RequiredVersion 1.20.0` (GATE-05 satisfied, 5 minor versions behind 1.25.0). Plant `plants/reportonly/bad`, twin with `exit 1`.

**GATE-02.** `Pode@89797a301afe:PSScriptAnalyzerSettings.psd1:2` lists no `ParseError`; Pode's CI uses `microsoft/psscriptanalyzer-action` on `ubuntu-latest` (7.x host), so a 5.1-only construct is not a parse error there. The anchored V-SEV finds it; the unanchored old form also matches vscode-powershell's commented example (`examples/PSScriptAnalyzerSettings.psd1:15`), and the plant `sev/commented` fires the old form and not the anchored one.

**GATE-03.** Per-kind settings on the staged held-out kinds (`kinds.sh` classifies test, then module, then installer, then script by path and content):

| Kind | Files | Shipped table findings | Error severity | After fix |
|---|---|---|---|---|
| script | 265 | 580 | 6 + 1 parse | 571 with the BOM exclusion the table lists |
| test | 552 | 1,098 | 68 SecureString + 2 | 1,065 and Error 2 with `PSAvoidUsingConvertToSecureStringWithPlainText` excluded |
| module (no manifests) | 1,322 | 2,273 | 28 + 4 parse | not re-run |
| installer | 14 | 4 | 0 | n/a |

The shipped `script.psd1`/`test.psd1` omitted `PSUseBOMForUnicodeEncodedFile` although the table excludes it; fixed in `script-rev.psd1`, `test-rev.psd1`. With 5.1 as host, PSSA reports 5.1 parse errors itself (plant `pipe`: `ParseError EmptyPipeElement` on a leading pipe under 5.1.26100.9444; the same construct in `psci.psm1` parses under 7.6.6), so a 5.1-hosted PSSA already covers GATE-04's parse job for the files it analyzes. Unknown rule names in a settings file are ignored (carried over from the earlier round, not re-run). Class: **check fix** (settings), plus an **adoption note**: no repo passes the table as written; a baseline or ratchet is a precondition.

**GATE-04.** The locale-data class (finding 5 below) and template files (Finding 1) are the two exclusions the per-file `#Requires` exclusion does not cover. `parse-gate-rev3.ps1` decodes a `.psd1` in a culture-named directory (`^[a-z]{2,3}(-[A-Za-z]{2,4})?$`) as UTF-8 and parses the text with `ParseInput`. Plants: `loc-ok` 6 errors (original) to 0 (rev3); `loc-broken` (real syntax error) 5 to 2 (still red); `nonloc` (not a culture directory) 6 to 6 (still red).

**GATE-05.** 0 unpinned `Install-Module PSScriptAnalyzer` in 9 repos. **GATE-07.** 0 `Set-ExecutionPolicy` outside `-Scope Process`. **GATE-09 (SHOULD).** 21 wildcard `*ToExport` (PSReadLine 3, Azure 18).

### 5. The locale-data psd1 loader asymmetry

Pode ships localized strings as BOM-less UTF-8 `.psd1` and loads them with `Import-LocalizedData`. On 5.1.26100.9444 for `zh`: `ParseFile` 5 errors, `Import-PowerShellDataFile` throws "could not be parsed as a PowerShell Data File", `[ScriptBlock]::Create` of the `Get-Content -Raw` text throws, and `Import-LocalizedData` returns 8 characters starting U+4EE5 (correct). On 7.6.6 all four readers succeed. All seven locales load correctly through `Import-LocalizedData` on 5.1 (`probe-pode-locale.ps1`). This contradicts PS-ENC-01's "UTF-8 with BOM" exception wording: the working practice is "BOM, or a loader known to decode UTF-8".

### 6. The resolver out of sample (PS-GATE-06)

`Test-CommandResolves` on 5.1.26100.9444 with `-CheckParameters`, `DefinedRoot` = the repo, nine repos:

| Variant | Findings | False | Notes |
|---|---|---|---|
| untuned | 6,313 | 4,011 classified false, 2,226 unclassified (2,198 Azure `*-Az*`) | |
| tuned (`-Allow '*-Az*','*Chocolatey*','Get-ToolsLocation','Invoke-ScriptAnalyzer','Set-ItResult','New-PesterConfiguration','Get-GitStatusFromCache'` plus version-gate suppression), the allow-list derived only from the corpus | 4,078 | 4,002 (98.1%) | allowed 2,299 (Azure `*-Az*` 2,268) |
| rev3 (provider dynamic parameters, lowercase non-verb names skipped) | 4,062 | 3,986 (98.1%) | removes 15 `Set-ItemProperty -Type` and 1 `code-insiders` false findings; 0 true findings lost |

False classes (tuned): project-own compiled or sibling commands 3,876 (dbatools `Write-Message` 3,696, `Set-DbatoolsConfig` 120, 18 more names), build-DSL or host commands 51 (Pode `Add-BuildTask`, PSES `Register-EditorCommand`), choco helper functions 40, optional modules 19, provider dynamic parameter 15, native-name 1. True classes: 7-only 51 (parameter 47, command 4), host version (stock 5.1 PowerShellGet lacks `-AllowPrerelease`) 9, typo defects 2 (`-MiniumVersion`, `-join` after `ForEach-Object`), parse 14.

Rates by what a project would experience: all 9 repos produced at least one false finding with the corpus allow-list; **3 repos (vscode-powershell, PSDepend, winget-cli) produced only false findings**. Removing dbatools' two compiled commands, tuned is 262 findings of which 186 are false (71%); rev3 is 246 and 170 (69%). By distinct name, rev3 has 44 false and 33 true names. Only 2 of the 44 false command names (`New-MarkdownHelp`, `Invoke-Build`) occur in two repos: allow-lists are repo-specific and do not transfer.

By mode (rev3): **unknown parameter on a resolved cmdlet: 58 findings (47 7-only, 9 host-version, 2 defects), 0 false. Unresolved command: 3,990 findings, 3,986 false, 4 true** (`Test-Json`, `Join-String`).

Blind spots, planted: (a) allow wildcard hides hallucinations: `-Allow '*-Az*'` drops `Get-AzVMFooBarBaz` while `Get-ChildItemm` stays (`plants/resolver3/allow`); (b) rev3's lowercase skip leaves PascalCase hallucinations flagged (`Download-File`, `Fetch-Thing` still red); (c) 25% of static .NET references have an unresolvable type (static scan: 1,275 of 5,171), so a missing member is only seen when the type loads.

Class: **check fix** (provider dynamic parameters; `Scan-StaticMembers` excluding `::new`, which flagged 425 members before and 2 after, `[IO.Path]::GetRelativePath` and `[IO.Path]::CombinePathSeparator`, both real) and a **new class: project-own edition helper** (Pode).

## Normative guidance candidates

Each row: rule, rationale, how a reviewer verifies it, whether that was RUN on a plant. Commands print the violation; empty output is a pass; `.` is the project root.

| # | Rule | Rationale | Verification | Run on plant |
|---|---|---|---|---|
| N1 | PS-COMPAT-02 adds end-of-line `&&`/`\|\|` to its static fallback. | 5.1 parse error that the old C1/C2 greps missed (`CloseDupIssues.ps1:101`). 1 of 6 held-out hits true; C# here-strings false. | `grep -rnE -e '(&&\|[\|][\|])[[:space:]]*$' --include='*.ps1' --include='*.psm1' .` | yes: plant 1 line, twin 0 |
| N2 | PS-COMPAT-02 adds the generic static method call `[T]::M[X](`. | 7.3+ syntax, parse error on 5.1; 1 of 1 held-out hit true. | `grep -rnE -e '\]::[[:alnum:]_]+\[[^]$]+\]\(' --include='*.ps1' --include='*.psm1' .` | yes: 1 / 0 |
| N3 | PS-ENC-08 adds U+2013/U+2014 as a parameter prefix in a BOM-less file (or: BOM-less non-ASCII is the defect). | 5.1 parse error; 2 of 2 held-out hits true; BOM'd file and 7.6 accept it. | `LC_ALL=C grep -rlP -e '[ \t]\xE2\x80[\x93\x94][A-Za-z]' --include='*.ps1' --include='*.psm1' . \| xargs -r env LC_ALL=C grep -L -P -e '^\xEF\xBB\xBF'` | yes: plant 1, BOM twin 0; also the 5.1 parse failure |
| N4 | PS-ENC-01 reworded: non-ASCII content in a 5.1-bound file requires a BOM (or `[char]0xNNNN`); ASCII-only stays required for `iex`-served files. Locale data may be BOM-less UTF-8 only when loaded by `Import-LocalizedData`. | 47 of 82 non-ASCII files are BOM'd and work; the defect is the 35 BOM-less ones. The old grep also counted 403 BOM-only ASCII files. | `LC_ALL=C grep -rlP -e '^(?:\xEF\xBB\xBF)?+[\x00-\x7F]*+[\x80-\xFF]' --include='*.ps1' --include='*.psm1' --include='*.psd1' . \| xargs -r env LC_ALL=C grep -L -P -e '^\xEF\xBB\xBF'` | yes: 1 / 0; held-out 35 files; first stage alone (V-NOBOM1) 82 and silent on a BOM-only twin |
| N5 | PS-COMPAT-04 split: `$IsWindows` alone (positive or negated), and `$PSVersionTable.Platform/.OS` under StrictMode, are MUST; `$IsLinux`/`$IsMacOS` outside StrictMode are SHOULD. | D2/D5 flagged 120 hits, 0 under StrictMode, 84 of 96 D2 about `$IsLinux/$IsMacOS`. | `grep -rnP -e '^(?!.*(PSVersionTable\|PSEdition\|Get-Variable)).*[$]IsWindows(?![A-Za-z0-9_])' --include='*.ps1' --include='*.psm1' .` | yes: 1 / 0 (twin = `$IsLinux`); held-out 10, 3 reachable-wrong read |
| N6 | PS-COMPAT-01 check: `#Requires -Version` anchored, CRLF-safe. | `-x` form misreports a CRLF file. | `grep -rL -e '^#[Rr]equires -Version' --include='*.ps1' .` | yes: 1 / 0; old form lists the CRLF twin |
| N7 | PS-COMPAT-05 defers to the resolver's unknown-parameter mode; the named list is illustrative. Corrected grep fallback. | list covers 7 of 19 held-out 7-only names; `Get-Error` matched `Get-ErrorMessage` 72 of 72. | `grep -rnE -e '-AsHashtable' -e '-AsByteStream' -e 'ForEach-Object[^\|]*-Parallel' -e 'Join-String' -e 'Test-Json' -e 'Get-Error([[:space:]]\|$)' -e '-SkipHttpErrorCheck' -e '-AsArray' --include='*.ps1' --include='*.psm1' .` | yes: 2 / 0 (old form fires on twin) |
| N8 | PS-ENC-10 check: resolve the step's effective shell and restrict to the four rule variables. | V3a 0 of 22 true (20 `pwsh`, 2 `GITHUB_STEP_SUMMARY`). | `grep -rnE -e '>>[[:space:]]*"?[$]env:GITHUB_(ENV\|PATH\|OUTPUT\|STATE)' --include='*.yml' --include='*.yaml' --include='*.ps1' .` then `python3 step-shell.py FILE LINE` per hit; violation only when `shell=powershell` | grep: plant 1, twin 1 (shell-blind, by design); resolver: plant `powershell`, twin `pwsh` |
| N9 | PS-GATE-01: the wrapper maps an analyzer exception to exit 2. | RULE_ERROR on a manifest with a missing file is misconfiguration, not findings. | `powershell -NoProfile -File Invoke-PSGate.ps1 -Path plants\crash\bad -Settings S` expect exit 2 | yes: original 1, rev3 2, twin 0 findings |
| N10 | PS-GATE-01 adds a sixth fail-open mode: a PSSA step that reports and never sets a status. | winutil `unittests.yaml:19-27`. | `grep -rl -e 'Invoke-ScriptAnalyzer' --include='*.yml' --include='*.yaml' --include='*.ps1' --include='*.psm1' . \| xargs -r grep -L -e 'exit' -e 'throw' -e 'EnableExit'` | yes: 1 / 0; held-out 1 true |
| N11 | PS-GATE-02 check anchored to a non-comment `Severity` line. | unanchored form matches a commented example. | `grep -rnP -e '^[ \t]*Severity[ ]*=[ ]*@[(](?!.*ParseError)' --include='*.psd1' .` | yes: 1 / 0; anchored on `commented` twin 0 |
| N12 | PS-GATE-03: the table's exclusions are shipped (BOM for script and test), the test kind excludes `PSAvoidUsingConvertToSecureStringWithPlainText`, and adoption is by baseline. | 68 Error findings are test fixtures; 571 to 2,273 findings per kind. | `Invoke-PSGate-rev3.ps1 -Path plants\testsecure\bad -Settings test-rev.psd1` expect exit 1; with `test-rev2.psd1` exit 0 | partly: red under `test-rev`, green on twin; exclusion silences the bad plant by design |
| N13 | PS-GATE-04: the 5.1 parse is loader-aware for culture-directory `.psd1`, and skips template directories. | 43 false parse errors in Pode. | `powershell -NoProfile -File parse-gate-rev3.ps1 plants\locdata\loc-broken` expect exit 1 and 2 errors; `loc-ok` exit 0 | yes: loc-ok 6 to 0, loc-broken 5 to 2 |
| N14 | PS-GATE-06 splits: (a) unknown-parameter mode on a resolved cmdlet (rev3, provider dynamic parameters): candidate MUST after one more held-out round; (b) unresolved-command mode: SHOULD, advisory, repo-owned reviewed allow-list, no wildcard entries. | (a) 0 of 58 false; (b) 98.1% false with the corpus list, 3 of 9 repos all false, wildcards hide hallucinations. | `Test-CommandResolves-rev3.ps1 -Path plants\resolver3\bad -DefinedRoot plants\resolver3\bad -CheckParameters` expect `unknown parameter -Tpe on Set-ItemProperty`; `good` expect none | yes: bad 1, good 0 (tuned good 2) |
| N15 | PS-ERR-03 lint reads `defaults.run.shell`, strips here-strings, ignores `key = value` lines. | original missed a plant; default-shell form added 6 findings that the two rev3 fixes drop. | `python3 pwsh-run-lint-rev3.py .` | yes: miss 0 to 1, fp 1 to 0, twin 0 |
| N16 | PS-NATIVE-01 check restricted to statement-initial calls with an option. | old form: 25 of 48 false. | `grep -rnP -e '^[ \t]*([$]\w+[ ]*=[ ]*)?[(]?curl[ ]+-' --include='*.ps1' --include='*.psm1' .` | yes: 1 / 0; held-out 23, all one Pode 7.x test file |
| N17 | PS-NATIVE-02 check: a single string argument containing a space, not array form. | old form: 13 of 18 false. | `grep -rnP -e '^[^#<]*Start-Process[^#]*-ArgumentList[ ]+("[^",]*[ ][^",]*"\|\x27[^\x27,]*[ ][^\x27,]*\x27)[ ]*(-[A-Za-z]+\|$\|[\|])' --include='*.ps1' --include='*.psm1' .` | yes: 1 / 0; held-out 4 |
| N18 | PS-ENC-08 retained as written. | 2 of 2 true. | `LC_ALL=C grep -rnP -e '^[^#]*\xE2\x80[\x98-\x9E]' --include='*.ps1' --include='*.psm1' .` | yes: 1 / 0 |
| N19 | PS-COMPAT-05 adds a static .NET member scan with `::new` excluded. | 425 flagged before, 2 (both real) after; recall limited by unresolved types (25%). | `powershell -File Scan-StaticMembers-rev2.ps1 plants\static\bad` | yes: bad 2, `new` plant 0 (original 2), good 0 |

Not carried forward: a PS-ERR-05 rewrite. The grep's only hit was a child-process string; the rule needs an AST check (`exit` outside a function in a file the docs deliver via `irm \| iex`). Not run on a plant.

## Verification runs

Fixture root `F` = `/home/mherwig/.cache/research-lang/shell-tools/fixtures/powershell`. Greps run from `verify-final.sh` (GNU grep 3.12, WSL2) against `F/plants/<name>/{bad,good}` and then the nine clones; engines for the others from `F/ps.sh <51|76>`. "rc" is the shell exit of the whole command; the contract is output-based, because GNU grep `-L` and `xargs` pipelines return 123 or 0/1 in ways that do not track the violation (V-DASH, V-NOBOM, V-REPORT: rc 123 on the violation, 0 on the twin; V-REQ: rc 1 on the violation, 0 on the twin).

| ID | Fixture | Command (candidate) | Violation: output lines (rc) | Twin: output lines (rc) | Held-out hits |
|---|---|---|---|---|---|
| V-EOL | `F/plants/eolchain/{bad,good}` | N1 | 1 (0) | 0 (1) | 6 (1 true) |
| V-GEN | `F/plants/generic/{bad,good}` | N2 | 1 (0) | 0 (1) | 1 (true) |
| V-DASH | `F/plants/endash/{bad,bom}` | N3 | 1 (123) | 0 (0) | 2 (both true) |
| V-PLAT | `F/plants/platvars/{wrong,benign}` | N5 | 1 (0) | 0 (1) | 10 |
| V-REQ | `F/plants/requires/{bad,good}` | N6 | 1 (1) | 0 (0) | 2,058 of 2,060 `.ps1` |
| V-NOBOM | `F/plants/enc/{nobom,bom}` | N4 | 1 (123) | 0 (0) | 35 files (24 `.ps1`, 11 `.psd1`) |
| V-NOBOM1 | `F/plants/enc/{nobom,bomascii}` | N4, first stage only | 1 (0) | 0 (1) | 82 files |
| V-CURLY | `F/plants/curly/{bad,good}` | N18 | 1 (0) | 0 (1) | 4 lines, 2 files |
| V-C10 | `F/plants/c10/{bad,good}` | N7 | 2 (0) | 0 (1) | 37 |
| V-CURL | `F/plants/native/{bad,good}` | N16 | 1 (0) | 0 (1) | 23 |
| V-ARGS | `F/plants/native02/{bad,good}` | N17 | 1 (0) | 0 (1) | 4 |
| V-SEV | `F/plants/sev/{bad,good}` | N11 | 1 (0) | 0 (1) | 1 (true) |
| V-REPORT | `F/plants/reportonly/{bad,good}` | N10 | 1 (123) | 0 (0) | 1 (true) |
| gate wrapper | `F/plants/crash/{bad,good}`, `F/tools/Invoke-PSGate{,-rev3}.ps1` | N9 | original exit 1 (misconfig shown as findings), rev3 exit 2 | `psgate: 2 files, 0 findings` | `out/crash-bad.txt`, `out/crash3-bad.txt`, `out/crash3-good.txt` |
| parse gate | `F/plants/locdata/{loc-ok,loc-broken,nonloc}`, `F/tools/parse-gate{,-rev3}.ps1` | N13 | loc-broken 5 to 2 errors | loc-ok 6 to 0 | Pode 43 to 0 (`out/parse51rev3-Pode.txt`) |
| resolver | `F/plants/resolver3/{bad,good,verb,allow}`, `F/tools/Test-CommandResolves-rev3.ps1` | N14 | bad 1 finding (`-Tpe`) | good 0 (tuned: 2) | `out/resolver-rev3.txt` |
| run-lint | `F/plants/lint/{miss,fp,twin}`, `F/pwsh-run-lint-rev3.py` | N15 | miss 1 (original 0) | fp 0 (original 1), twin 0 | 4 on 86 YAML files |
| static scan | `F/plants/static/{bad,new,good}`, `F/tools/Scan-StaticMembers-rev2.ps1` | N19 | bad 2 missing | new 0 (original 2), good 0 | 2 true of 5,171 refs |
| step shell | `F/plants/v3a/{bad,good}`, `F/step-shell.py` | N8 | `shell=powershell` | `shell=pwsh` | 22 hits, 0 true |
| 5.1 en dash | `F/plants/endash/{bad,bom}` | `ps.sh 51 plants/endash/bad/endash.ps1` | parse error | `done` (BOM) | pwsh 7.6.6: `done` for both |

Nineteen verifications watched red on a planted fixture with a silent or green twin: V-EOL, V-GEN, V-DASH, V-PLAT, V-REQ, V-NOBOM, V-NOBOM1, V-CURLY, V-C10, V-CURL, V-ARGS, V-SEV, V-REPORT, the gate wrapper, the parse gate, the resolver, run-lint, the static scan, and the step-shell resolver.

**Non-reds, reported.** (1) V-SEVC, the unanchored `Severity` grep: fires on the plant (1) and on the commented twin (1); fixed by the anchor (twin 0). (2) V-V3A, the shell-blind V3a form: 1 on the plant, 1 on the pwsh twin; only the step-shell resolver separates them. (3) Old forms against compliant twins: the `-x` `#Requires` grep lists the CRLF twin; the old C10 fires on `Get-ErrorMessage`; the old `curl` grep fires on a comment; the old `Start-Process` grep fires on array form. (4) AST D2 on `plants/platvars`: wrong 1 finding, benign 2, strict 2, good 0, so D2 does not separate a wrong from a safe plant. (5) The test-kind exclusion silences its own bad plant by design (`test-rev2`: 0 findings), so N12's exit-1 half is red only under `test-rev`. (6) The ERR-05, ERR-06, ENC-03, ENC-04 and GATE-09 greps were run on the clones, not planted this round; their counts are unverified for precision beyond the triage in Findings 3.

Outputs: `out/verify-final.txt`, `out/parse51-*.txt`, `out/parse76-*.txt`, `out/denyp51-*.txt`, `out/pssa-*.txt`, `out/vgreps/`, `out/rg/`, `out/resolver-{untuned,tuned,rev3}.{txt,sum}`, `out/resolver3-*.txt`, `out/static2-*.txt`, `out/probe-*.txt`.

## Exemplar evidence

| Rule or class | Evidence (`repo@sha12:path:line`) | Notes |
|---|---|---|
| PS-COMPAT-02, `&&` | `Azure/azure-powershell@f26e66248b28:tools/ExecuteCIStep.ps1:278`; `PowerShell/PSReadLine@2984546f62da:tools/issue-mgmt/CloseDupIssues.ps1:101` (end of line) | 5.1 parse error, 7.6 parses |
| PS-COMPAT-02, ternary | `azure-powershell@f26e66248b28:tools/GenerateCmdletDesignMarkdown.ps1:71,74` | |
| PS-COMPAT-02, leading pipe | `azure-powershell@f26e66248b28:tools/SwaggerCI/psci.psm1`, `tools/BuildScripts/RemoveUnwantedFiles.ps1` | |
| PS-COMPAT-02, generic call | `azure-powershell@f26e66248b28:tools/Github/ParseServiceContactsList.ps1:126` | `DeserializeObject[System.Dynamic.ExpandoObject](...)` |
| Real defects on both engines | `azure-powershell@f26e66248b28:tools/ReleaseTools/gen-mail.ps1:19`; `chocolatey/choco@1a957a920a1e:Invoke-AuthedTests.ps1:26` | |
| Template placeholder | `choco@1a957a920a1e:tests/packages/msi.template/templates/tools/chocolateyinstall.ps1:3` | `[[AutomaticPackageNotesInstaller]]` |
| PS-COMPAT-04 wrong branch | `RamblingCookieMonster/PSDepend@a7ab90cf716f:psakeFile.ps1:22`; `azure-powershell@f26e66248b28:tools/StaticAnalysis/CollectStaticAnalysisPipelineResult.ps1:24` | `$IsWindows` alone |
| PS-COMPAT-04 guards | `dataplat/dbatools-public@e273a4164bdf:private/functions/flowcontrol/Test-Windows.ps1:19` (`Keys -contains`); `badgerati/Pode@89797a301afe:pode.build.ps1:605` | correct idioms |
| PS-COMPAT-05, 7-only parameters | `Pode@89797a301afe:src/Private/Helpers.ps1:1588` (`-AsHashtable`, under `Test-PodeIsPSCore`), `src/Private/Secrets.ps1:223` (`-AsPlainText`), `src/Private/Logging.ps1:398` (`-SkipCertificateCheck`); `azure-powershell@f26e66248b28:tools/BuildScripts/BuildModules.ps1:140` (`Out-File -Path`) | guarded vs unguarded |
| PS-COMPAT-05, static member | `azure-powershell@f26e66248b28:tools/CreateFilterMappings.ps1:103` (`[IO.Path]::GetRelativePath`); `dbatools-public@e273a4164bdf:private/configurations/configuration.ps1:113` (`CombinePathSeparator`, no such member) | |
| PS-ENC-01 BOM practice | `choco@1a957a920a1e:src/chocolatey.resources/helpers/chocolateyInstaller.psm1` (BOM) beside 5 BOM-less files incl. `formatting-settings.psd1` | 270 of 275 BOM'd |
| PS-ENC-01 locale data | `Pode@89797a301afe:src/Locales/zh/Pode.psd1` (BOM-less UTF-8, loaded by `Import-LocalizedData`) | |
| en dash | `azure-powershell@f26e66248b28:tools/Az.Tools.Installer/GenerateHelp.ps1:14` (BOM-less, fails); `.../InstallationTests/NetcoreTests/Compute/SqlIaaSExtensionTests.ps1:83` (BOM, passes) | |
| PS-ENC-07 | `ChrisTitusTech/winutil@07ccd8e2e755:functions/private/Invoke-WinUtilISOScript.ps1:736` | `[System.Text.Encoding]::Default` |
| PS-ENC-10 (shell-blind grep) | `dbatools-public@e273a4164bdf:.github/workflows/ci-azure.yml:318,320` (`shell: powershell`, `GITHUB_STEP_SUMMARY`); `winutil@07ccd8e2e755:.github/workflows/pre-release.yaml:63-64,125-127` (`shell: pwsh`) | |
| PS-ERR-03 lint hits | `dbatools-public@e273a4164bdf:.github/workflows/reposize.yml` (step 2), `integration-tests.yml` (step 5), `gallery.yml` (step 6), `azure-migration-tests.yml` (step 3) | |
| PS-ERR-06 matches | `choco@1a957a920a1e:tests/pester-tests/chocolatey.Tests.ps1:171`; `winutil@07ccd8e2e755:pester/sanity.Tests.ps1:57` | not executed |
| PS-GATE-01 report-only | `winutil@07ccd8e2e755:.github/workflows/unittests.yaml:19-27` | |
| PS-GATE-02 | `Pode@89797a301afe:PSScriptAnalyzerSettings.psd1:2`; `.github/workflows/PSScriptAnalyzer.yml` | no `ParseError` |
| PS-GATE-05 satisfied | `winutil@07ccd8e2e755:.github/workflows/unittests.yaml:15` | pinned 1.20.0 |
| Project edition helper | `Pode@89797a301afe:src/Private/Helpers.ps1:1587` | `Test-PodeIsPSCore` |
| Runner readers | `actions/runner` `src/Runner.Worker/FileCommandManager.cs:138,258,369` | `ReadAllLines(...,UTF8)`, `StreamReader(path)`, `ReadAllText(path)` detect a BOM |

## AI-agent angle

- **An agent defaults to 7-only code.** The commonest first drafts in this sample are `-AsHashtable`, 3-argument `Join-Path`, `Out-File -Path`, `[T]::new()` chains, `&&`, and `$IsWindows`; a generated script with no `#Requires` is 5.1-ambiguous, and 99.8% of the sample's `.ps1` files have no floor. An agent should write the floor first, then run the 5.1 parse and the unknown-parameter resolver on the result.
- **Hallucinated names are the resolver's job, and only the parameter mode is quiet enough for an agent loop.** Unknown-parameter mode (58 findings, 0 false) can be a hard stop for an agent; unresolved-command mode (98% false on unseen repos) would train an agent to add allow-list entries to silence it, and a wildcard entry silences real hallucinations (`Get-AzVMFooBarBaz`). Allow-list edits should be reviewed by a human, never self-approved.
- **Agents paste `>>` and `Out-File` into runner env files.** The check must be the step's shell, not the text; otherwise an agent "fixes" 20 safe `pwsh` steps and ignores a real `powershell` one.
- **Agents copy BOM habits from their training repos.** The sample shows both: BOM'd choco files and BOM-less Pode locale files. An agent editing a BOM'd file with a tool that strips the BOM silently turns working non-ASCII into mojibake on 5.1; the reworded ENC-01 check (N4) catches that regression.
- **An agent that sees a green PSSA step may believe the gate passed.** winutil's step is green and report-only; N10 finds that shape.
- **Gate scripts the agent runs should be the rev3 forms** (exit 2 on analyzer crash; loader-aware parse), or an agent will "fix" a Pode locale file that is correct.

## Contested / evolving

- **ASCII-only versus BOM'd UTF-8 (PS-ENC-01).** The research's earlier line is "ASCII-only, BOM only as an exception". Practice in three repos is BOM'd UTF-8 (choco has a BOM on 275 of 354 files, 239 of them pure ASCII) and works on 5.1.26100.9444; PSSA's own `PSUseBOMForUnicodeEncodedFile` rule pushes the same way. The remaining risk is tooling that strips BOMs and `iex`-served files. This round proposes the rewording but does not settle it; the owner may prefer to keep ASCII-only as the safest advice for new files and use the BOM-aware check for existing ones.
- **Does PSSA hosted on 5.1 replace the parse job (PS-GATE-04)?** It already reports 5.1 parse errors for the files it reads, but it shares the locale-data false positive and crashes on some manifests (rev3 turns the crash into exit 2). The parse job stays as a cheaper separate gate; this is a preference, not a result.
- **Resolver mode split (PS-GATE-06).** 0 of 58 false is measured after a fix written against the same nine repos; it is a post-hoc improvement. The principle (provider dynamic parameters exist per provider) is independent of the sample, but MUST should wait for a round on fresh repos. Host-version findings (`-AllowPrerelease`) are correct for the stock PowerShellGet and wrong for a host that updated it; the rule needs a target-host statement.
- **Target scope.** 99.8% of `.ps1` files carry no `#Requires -Version`; N16, N5 and the resolver all depend on knowing which files are 5.1-bound. A `kinds` convention (installer, module, script, test) is the only scope the held-out repos support, and kind by path is itself a heuristic (`kinds.sh`).
- **Pode's own 5.1 policy.** Pode ships a 5.1 build in places and uses `Test-PodeIsPSCore` guards in others; the unguarded 19 findings may be examples intended for 7.x. Without a project statement they are reported, not judged.
- **Sample bias.** Nine repos, three dominated by one tool each (dbatools 968 files, choco 354, Pode 276); every rate above is a count over these, not a population estimate. Corpus disjointness was assumed from the brief and not independently checked.
- **No macOS host.** Nothing here covers BSD or macOS PowerShell behaviour.

## Sources

Primary documentation and source, then the nine repositories (primary, as pinned commits). Dates are the document's own date or the commit date; all fetched or cloned 2026-10-11.

| URL | What | Date / era | Why |
|---|---|---|---|
| https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_character_encoding | about_Character_Encoding | ms.date 2023-03-09, 7.6 view | BOM and default-encoding behaviour per edition (ENC-01, ENC-03) |
| https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_automatic_variables | about_Automatic_Variables | ms.date 2026-04-02, 7.6 view | `$IsWindows`, `$IsLinux`, `$PSVersionTable` availability (COMPAT-04) |
| https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_quoting_rules | about_Quoting_Rules | ms.date 2024-09-09, 7.6 view | quote tokens, curly quotes as quotes (ENC-08) |
| https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_requires | about_Requires | ms.date 2023-08-17, 7.6 view | `#Requires` forms, floor declaration (COMPAT-01, GATE-04) |
| https://learn.microsoft.com/powershell/module/microsoft.powershell.utility/import-localizeddata | Import-LocalizedData | ms.date 2026-03-20, 7.6 view | locale-data loader that decodes UTF-8 (finding 5) |
| https://learn.microsoft.com/powershell/module/microsoft.powershell.utility/import-powershelldatafile | Import-PowerShellDataFile | ms.date 2026-04-20, 7.6 view | the other data loader that does not (finding 5) |
| https://learn.microsoft.com/powershell/module/microsoft.powershell.management/join-path?view=powershell-5.1 | Join-Path, 5.1 view | ms.date 2025-03-25 | `-AdditionalChildPath` absent on 5.1 (COMPAT-05) |
| https://learn.microsoft.com/powershell/module/psscriptanalyzer/invoke-scriptanalyzer | Invoke-ScriptAnalyzer | ms.date 2026-07-23, PSSA 1.25.0 | `-Severity`, `-Settings`, `-EnableExit` semantics (GATE-01..03) |
| https://learn.microsoft.com/powershell/utility-modules/psscriptanalyzer/rules/useboMforunicodeencodedfile | PSUseBOMForUnicodeEncodedFile rule doc | ms.date 2026-07-21 | the BOM rule behind ENC-01/06 |
| https://learn.microsoft.com/powershell/utility-modules/psscriptanalyzer/rules/usecompatiblesyntax | PSUseCompatibleSyntax rule doc | ms.date 2026-07-21 | Linux-side parse fallback (GATE-04) |
| https://github.com/PowerShell/PSScriptAnalyzer/blob/main/CHANGELOG.MD | PSSA changelog | 1.25.0 | version pin and rule behaviour changes (GATE-05) |
| https://docs.github.com/actions/reference/workflow-syntax-for-github-actions | Workflow syntax (`defaults.run.shell`, `shell:`) | 2026 | how the effective shell is chosen (ERR-03 lint, ENC-10) |
| https://github.com/actions/runner/blob/main/src/Runner.Worker/FileCommandManager.cs | runner env-file and summary readers | main, fetched 2026-10-11 | BOM-detecting readers (ENC-10) |
| https://github.com/actions/runner/blob/main/src/Runner.Worker/Handlers/ScriptHandlerHelpers.cs | runner shell templates for `pwsh`/`powershell` | main, fetched 2026-10-11 | `-command ". '{0}'"` prelude (ERR-03) |
| https://github.com/chocolatey/choco (`1a957a920a1e`) | held-out repo | commit 2026-09-25 | encoding, templates, resolver false classes |
| https://github.com/PowerShell/PSReadLine (`2984546f62da`) | held-out repo | commit 2026-04-08 | EOL `&&`, 7-only floor |
| https://github.com/microsoft/winget-cli (`3d9083c062c1`) | held-out repo | commit 2026-10-08 | CRLF `#Requires` |
| https://github.com/badgerati/Pode (`89797a301afe`) | held-out repo | commit 2026-09-27 | locale psd1, edition helper, GATE-02 |
| https://github.com/ChrisTitusTech/winutil (`07ccd8e2e755`) | held-out repo | commit 2026-10-07 | report-only PSSA, `Encoding::Default`, native greps |
| https://github.com/dataplat/dbatools-public (`e273a4164bdf`) | held-out repo | commit 2026-10-05 | resolver project-own class, 5.1 step summary |
| https://github.com/PowerShell/vscode-powershell (`9c5933866b74`) | held-out repo | commit 2026-08-21 | resolver all-false repo, commented settings |
| https://github.com/RamblingCookieMonster/PSDepend (`a7ab90cf716f`) | held-out repo | commit 2026-10-06 | `$IsWindows` polarity, C# here-strings |
| https://github.com/Azure/azure-powershell (`f26e66248b28`) | held-out repo | commit 2026-10-09 | parse failures, en dash, allow-list blind spot |

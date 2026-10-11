---
title: PSScriptAnalyzer profile and the PowerShell gate (PS-GATE)
topic: pwsh/analyzer-profile
agent: W2-10 (workflow wave 2, shell-scripting research program)
model: sonnet
date_researched: 2026-10-11
sources_count: 26
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/analyzer-profile/ (FX below); staged copies on the Windows host at C:\Users\ecom\shell-wintest\analyzer-profile\
scope: |
  PSScriptAnalyzer (PSSA) 1.25.0 as the PowerShell gate for the lore `pwsh` rule set: settings schema, per-kind profiles
  (script, installer, module, test), fail-open modes of `-EnableExit`, the 5.1 compatibility gate, the agent-tell grep set,
  Invoke-Formatter, manifests, execution policy. Rows M-T-01..03, M-T-06..08, M-V-01..03, M-U-02.
  Hosts: WinPS 5.1.26100.9444 (Windows host), pwsh 7.4.7 and 7.6.6 (WSL2 Linux). No macOS host: BSD/macOS claims are "unverified: read only".
---

# PSScriptAnalyzer profile and the PowerShell gate

Conventions. `FX` = `/home/mherwig/.cache/research-lang/shell-tools/fixtures/analyzer-profile`. Every version-specific claim carries its version tag. Date of all measurements and fetches: 2026-10-11. `repo@sha12:path:line` cites an exemplar or fleet file read-only. All grep checks use GNU grep 3.12 (`export PATH=/usr/bin:$PATH`); BSD grep is unverified: read only.

## TOC

- [Summary](#summary)
- [Findings](#findings)
- [Normative guidance candidates](#normative-guidance-candidates)
- [Verification runs](#verification-runs)
- [Exemplar evidence](#exemplar-evidence)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- PSSA 1.25.0 (released 2026-03-20) is still the latest on the Gallery on 2026-10-10 and is preinstalled on the windows-2025 and ubuntu-24.04 runner images next to pwsh 7.6.6. Pin it anyway; the fleet's `Install-Module PSScriptAnalyzer` is unpinned.
- The module ships 75 rules. By README default state 58 are on (7 Error, 42 Warning, 9 Information) and 17 are off, including `PSUseCompatibleSyntax`, `PSUseCompatibleCommands`, `PSUseCompatibleTypes`, `PlaceOpenBrace`, `PlaceCloseBrace`, `UseConsistentWhitespace`.
- Raw `Invoke-ScriptAnalyzer -EnableExit` fails open four ways, all measured on pwsh 7.6.6: exit value is count mod 256 (256 findings exits 0); `Severity=@('Error','Warning')` drops ParseError so an unparseable file exits 0; a nonexistent settings path exits 0; a typo'd rule key under `Rules` silently disables the rule.
- Every settings file in the 6 corpus/fleet gates read lists `Severity` without `ParseError` or has none; the fleet's www-setup and setup-grimoire gates pass `-Severity Warning,Error`. The fleet defect is reproducible (exit 0 on an unparseable file).
- The gate must be a wrapper, not the raw cmdlet: validate settings path, `ParseError` in Severity, known rule names, non-empty file set; exit 0/1/2. The wrapper (`FX/Invoke-PSGate.ps1`) went red on 7 misconfiguration/violation cases.
- `PSUseCompatibleSyntax` with `TargetVersions=5.1` catches `&&`, `||`, `??`, `??=`, ternary and `${x}?.Member`, but MISSES the background `&` operator, the `clean {}` block and `${a}?[0]`. A real 5.1 parse (`Parser::ParseFile` on a 5.1 host) is mandatory wherever a 5.1 host exists.
- `PSUseCompatibleSyntax.TargetVersions` is only meaningful for 3.0, 4.0, 5.1, 6.2, 7.0. `'7.4'` and `'7.6'` are accepted but behave as 7.0; `'bogus'` is a non-terminating error. The rule cannot express a 7.6 floor.
- Constructs that parse on 5.1 but mean something different, flagged by neither tool: `` `e `` (literal `e`), `` `u{41} ``, `0b1010` (runtime "term not recognized"), numeric suffixes, and `$o?.Name` (a silent null on ALL versions because `$o?` is a variable name).
- PSSA itself loads and runs on WinPS 5.1 (75 rules there too). 23 of 24 rule plants behave identically on 5.1; the ternary plant surfaces as a ParseError diagnostic instead of the rule.
- `PSUseCompatibleCommands`/`Types` with the 5.1 profile caught 9 of 11 runtime-only 7-isms and bad parameters, but not hallucinated cmdlet names, costs 10 s to load, and false-positives on abbreviated parameters, aliases and valid types. Advisory only.
- The default rule set reports 0 findings on hallucinated cmdlets. A 15-line AST check (`Test-CommandResolves.ps1`: CommandAst + `Get-Command` on the target host) caught the plant with zero false positives on www-setup's `install.ps1`.
- Noise: `PSUseDeclaredVarsMoreThanAssignments` is 22/30 false positives in a stratified sample (13/15 in tests, 9/15 in non-test); exclude it only for the `test` kind, keep it elsewhere.
- `PSAvoidUsingWriteHost` is 586 of 1,077 hits in a 9-rule survey, but it is the correct output channel for `irm | iex` installers; exclude it for the `installer` kind only, proven without a global exclude (the same file gives 4 findings under script/module, 0 under installer, and `Invoke-Expression` still fires under installer).
- `Invoke-Formatter` is idempotent but only 12 of 55 corpus files are already formatted, one file errors, one fails on mixed line endings, and 5.1 vs 7.6 output differs for 1 of 25. Keep it out of the gate.
- `CompatiblePSEditions` in a manifest is informational for non-inbox modules (a Core-only manifest imports on 5.1). PSSA flags wildcard `*ToExport`.
- Execution policy: a Mark-of-the-Web script is blocked under RemoteSigned/AllSigned/Restricted on 5.1; `-ExecutionPolicy Bypass` on the CLI or `-Scope Process` works without admin; `Set-ExecutionPolicy` throws on Linux pwsh. No fleet or corpus installer calls `Set-ExecutionPolicy`.
- `#Requires -Version 7.x` is checked before the parse and gives a clean error on 5.1, so such files must be excluded from the 5.1 parse gate (the parser still errors).
- PSSA is not thread-safe in-process under `ForEach-Object -Parallel` ("An item with the same key has already been added"); run it sequentially or per-process.
- 20 pwsh agent-tell greps went red on plants and green on twins; 5 config greps likewise.

## Findings

### 1. Pinned PSSA facts

1.1 PSSA 1.25.0 released 2026-03-20; it is the newest release in the releases API and the Gallery on 2026-10-10 ([releases API](https://api.github.com/repos/PowerShell/PSScriptAnalyzer/releases), [Gallery](https://www.powershellgallery.com/packages/PSScriptAnalyzer/1.25.0)).
1.2 The runner images ship it: `actions/runner-images@8197087fc536:images/windows/Windows2025-Readme.md:482` and `images/ubuntu/Ubuntu2404-Readme.md:225`, both beside pwsh 7.6.6. A CI job therefore needs no `Install-Module`; if it installs one, it must pass `-RequiredVersion`.
1.3 1.24.0 raised the minimum host from 3 to 5.1 and made `-EnableExit` return the diagnostic count and count parse errors ([releases](https://api.github.com/repos/PowerShell/PSScriptAnalyzer/releases)). Before 1.24.0 the exit semantics differ; the fail-open measurements below are 1.25.0 only.
1.4 Rule inventory (1.25.0 module, `FX/rules.out`, 75 rules): 58 on by default (7 Error, 42 Warning, 9 Information), 17 off by default. README on `main` lists four rules absent from 1.25.0: `AvoidDynamicallyCreatingVariableNames`, `AvoidUsingArrayList`, `InvalidMultiDotValue`, `MissingTryBlock` ([README](https://github.com/PowerShell/PSScriptAnalyzer)). `Test-ScriptAnalyzerSettingsFile` is documented on main but not exported by 1.25.0 (exports: `Get-ScriptAnalyzerRule`, `Invoke-Formatter`, `Invoke-ScriptAnalyzer`). The gate therefore cannot rely on it; the wrapper does its own validation (finding 3.5).

### 2. Settings schema

2.1 Keys: `Severity`, `IncludeRules`, `ExcludeRules`, `IncludeDefaultRules`, `CustomRulePath`, `Rules.<RuleName>.<Arg>` ([using-scriptanalyzer](https://learn.microsoft.com/powershell/utility-modules/psscriptanalyzer/using-scriptanalyzer), [Invoke-ScriptAnalyzer.md](https://github.com/PowerShell/PSScriptAnalyzer/blob/main/docs/Cmdlets/Invoke-ScriptAnalyzer.md)). Measured: `Rules.X.Enable = $true` alone enables an off-by-default rule (`FX/settings/installer.psd1` enables `PSUseCompatibleSyntax` this way).
2.2 Built-in presets live in the module's `Settings/*.psd1`: PSGallery (20 rules), ScriptSecurity (5), ScriptFunctions (9), CmdletDesign (8), ScriptingStyle (2), DSC, and four CodeFormatting variants. A preset name is passed as `-Settings PSGallery`; a typo'd preset name exits 0 (fail-open, finding 3.3).
2.3 Implicit discovery: a `PSScriptAnalyzerSettings.psd1` in the `-Path` directory (or the file's directory) applies to the whole recursion; nested directories do not override it (`FX/implicit/`). This explains disabled rules firing in the PSSA `Tests/Issue828` corpus run. Rule: pass `-Settings` explicitly per kind, never rely on discovery.
2.4 Presets and the corpus: none of the 6 settings files read lists `ParseError` (Exemplar evidence).

### 3. `-EnableExit` and the four fail-open modes (pwsh 7.6.6, PSSA 1.25.0)

3.1 Exit value = finding count mod 256: 255 gives 255, 256 gives 0, 257 gives 1, 300 gives 44 (`FX/t1/`, `FX/enableexit-failopen.out`).
3.2 `Severity=@('Error','Warning')` excludes the ParseError pseudo-severity; an unparseable file exits 0. The docs say to omit ParseError to suppress it ([Invoke-ScriptAnalyzer.md](https://github.com/PowerShell/PSScriptAnalyzer/blob/main/docs/Cmdlets/Invoke-ScriptAnalyzer.md)), so the default-looking `Error,Warning` list is a silent opt-out. Information-only findings also give 0 under such a filter.
3.3 A nonexistent settings path exits 0 (`FX/settings-bad/`). A typo'd preset name does too.
3.4 A typo'd key under `Rules` (for example `PSUseCompatibleSyntx`) is accepted; the intended rule stays off; exit 0.
3.5 The wrapper `FX/Invoke-PSGate.ps1` (`-Path`, `-Settings`, `-Module`) validates: path exists, settings exist, `ParseError` in Severity, every rule name known to `Get-ScriptAnalyzerRule`, at least one `.ps1/.psm1/.psd1` file. Then `Invoke-ScriptAnalyzer -Recurse -Settings`, `exit 1` on findings, exit 2 on misconfiguration. 7 of 7 gate cases behaved (`FX/gate-tests.out`): violation dir exit 1; compliant dir exit 0; 256 findings exit 1 (raw: 0); missing settings, missing path, empty dir, typo rule name, no-ParseError settings all exit 2.
3.6 Empty file set: the raw cmdlet exits 0 on a directory with no scripts (`FX/gate/empty`). A vacuous gate is a green lie; the wrapper fails it.

### 4. Compatibility: what `PSUseCompatibleSyntax` sees and misses

4.1 `TargetVersions` meaningful values: 3.0, 4.0, 5.1, 6.2, 7.0. `'7.4'`/`'7.6'` are accepted but behave as 7.0; `'bogus'` yields a non-terminating "Invalid version string" error (`FX/tv/`). Not usable for a 7.6 floor; for a 7.6 script kind the rule is simply not enabled.
4.2 Run from pwsh 7.6.6 (7.4.7 identical) with `TargetVersions=@('5.1')` over 30 construct plants (`FX/cs/`, `FX/compat-pwsh76.out`): flagged `&&`, `||`, `??`, `??=`, ternary, `${x}?.Member`.
4.3 MISSED by the rule but errors on a real 5.1 parse: background `&` (`cmd &`), the `clean {}` block (7.3), and null-conditional index `${a}?[0]` (`FX/parse-gate-tests.out`).
4.4 Parse on 5.1 with different meaning, flagged by neither the rule nor the parser: `` `e `` becomes the literal `e`; `` `u{41} `` likewise; `0b1010` fails at runtime ("term not recognized"); numeric suffixes `5u`, `5y`, `5n`. These need greps (C12) or tests on a 5.1 host.
4.5 `$o?.Name` is a silent null on ALL versions including 7.x: `$o?` is a legal variable name, so `${o}?.Name` is required for null-conditional access ([about_Operators](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_operators)). It is an agent-typical error (C4a).
4.6 Hosted on WinPS 5.1, PSSA reports every 5.1-unparseable construct as a ParseError diagnostic (it cannot analyze the file). 23 of 24 rule plants behave identically on 5.1; the ternary plant is a ParseError rather than a rule hit (`FX/rules-harness-ps51.out`). So a 5.1 PSSA run is itself a parse gate if ParseError is in Severity.
4.7 `#Requires -Version 7.x` is evaluated before the parse; on 5.1 and on pwsh 7.4 with `#Requires -Version 7.6` the message is `ScriptRequiresUnmatchedPSVersion` ([about_Requires](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_requires)). Such files must be excluded from the 5.1 parse gate: their parse errors are expected (`FX/requires/runall.sh`).
4.8 Gate shape that follows: (a) real parse on the lowest target host (`FX/parse-gate.ps1`, 5.1-parseable and ASCII only, `Parser::ParseFile`, prints `file:line:col: msg [ErrorId]`, exit 1 on any error); (b) when no 5.1 host exists (Linux-only CI), `PSUseCompatibleSyntax@5.1` plus the greps C1-C4b, C16, C17 as a fallback. Fallback is weaker (finding 4.3) and must be labeled as such in CI output.

### 5. `PSUseCompatibleCommands` / `PSUseCompatibleTypes`

5.1 Profile used: `win-8_x64_10.0.17763.0_5.1.17763.316_x64_4.0.30319.42000_framework` (shipped in the module). First load costs about 10 s (`FX/cc/`).
5.2 Caught 9 of 11 runtime-only 7-isms in the plant set (`FX/cc/`). Commands/parameters verified absent on 5.1.26100.9444 include: `ConvertFrom-Json -AsHashtable`, `ConvertTo-Json -AsArray`, `Get-Content -AsByteStream`, `Invoke-WebRequest -SkipHttpErrorCheck`, `ForEach-Object -Parallel`, `Join-String`, `Test-Json`, `Get-Error`, `Select-String -NoEmphasis`, `Invoke-RestMethod -Authentication`.
5.3 Caught hallucinated parameters (`Test-Path -Recurse`, `Get-ChildItem -MaxDepth`), NOT hallucinated cmdlet names.
5.4 False positives on known-good 5.1 installers: abbreviated parameters, the `md` alias, and `RuntimeInformation`/`OSPlatform` types that exist on real 5.1.26100.
5.5 Verdict: advisory, never blocking. The blocking substitute is a real 5.1 execution/parse (finding 4.8) plus `Test-CommandResolves` (finding 11).

### 6. Per-kind profiles

6.1 Four kinds, one settings file each (`FX/settings/*.psd1`), all with `Severity = @('Error','Warning','ParseError')`:

| Kind | Target | Excluded | Extra |
|---|---|---|---|
| script | pwsh 7.6 | UseShouldProcessForStateChangingFunctions, UseApprovedVerbs, UseSingularNouns | no compat rule |
| installer | 5.1 | the three above + AvoidUsingWriteHost | `PSUseCompatibleSyntax@5.1` enabled |
| module | 5.1 | none | `PSUseCompatibleSyntax@5.1` enabled |
| test (Pester) | per target | UseDeclaredVarsMoreThanAssignments + the script three | |

6.2 Why those three are excluded for scripts: they are API-surface rules (public cmdlet naming and `ShouldProcess`). They fire on leaf scripts' private helper functions: PSUseApprovedVerbs and PSUseSingularNouns flag non-exported module functions too (measured, `FX/verbtest/`). Of 17 non-Pester ApprovedVerbs hits, 12 are dotnet/install-scripts, 3 posh-git, 2 PowerShell/PowerShell (`FX/verbs/out.json`).
6.3 Installer Write-Host proof: `FX/installer/installer-like.ps1` gives 4 findings under script and module settings, 0 under installer settings; `installer-like.iex.ps1` still flags `PSAvoidUsingInvokeExpression` under installer; the `SuppressMessageAttribute` variant (script-level, with `param()`) gives 0; a function with the `Show` verb gives 0 (`FX/installer/cases.out`). So the exclusion is scoped by kind and does not mask other rules.
6.4 Kind exclusion matrix verified (`FX/kind-exclusions.out`): WriteHost script 1 / installer 0 / module 1; ApprovedVerbs script 0 / module 1; ShouldProcess script 0 / module 1; SingularNouns installer 0 / module 1; DeclaredVars test 0 / script 1; CompatibleSyntax script 0 / installer 1 / module 1.
6.5 `PSAvoidUsingWriteHost` does not fire in functions whose verb is `Show`. Do not teach this as the fix; for installers the kind exclusion is cleaner.
6.6 `PSPossibleIncorrectComparisonWithNull` fires only when the left side is inferred as an array. `$IsWindows = $true` is flagged by `PSAvoidAssignmentToAutomaticVariable`.

### 7. Noise study: `PSUseDeclaredVarsMoreThanAssignments`

7.1 Scope: 1,580 hits across the 1,119-file PSSA run (`shell-audit/exemplar-shape.md`: 5,051 findings total, WriteHost 753). Stratified 30-sample, 15 test, 15 non-test; classification in `FX/dv/classification.tsv`.
7.2 22/30 false positives: scope limits in Pester `BeforeAll`/`It`, `ForEach-Object` begin/process/end, dot-sourced and cross-file uses, `Get-Variable` uses. 8/30 real dead stores, 3 of them probable defects: fzf `install.ps1:10` (error message assigned, never read), dotnet `CommonLibrary.psm1:235` (ignored status), Pester `Pester.Utility.ps1:159`.
7.3 Test stratum 13/15 false positives; non-test stratum 6/15 real. Weighted estimate about 15% real over the corpus.
7.4 Decision: exclude only for the `test` kind. Scoop already documents it as unreliable: `ScoopInstaller/Install@1e2f334083d6:PSScriptAnalyzerSettings.psd1:25-27` ("PSUseDeclaredVarsMoreThanAssignments doesn't currently work due to PSScriptAnalyzer#636", [issue 636](https://github.com/PowerShell/PSScriptAnalyzer/issues/636)).

### 8. `Invoke-Formatter`

8.1 Presets: CodeFormatting (output identical to Stroustrup), OTBS (`} else {`), Allman, Stroustrup.
8.2 Idempotent on all 55 files tried, but only 12/55 corpus files are already formatted. One file (fzf) errors; one (vcpkg) fails on mixed line endings; output differs between 5.1 and 7.6 for 1 of 25 files; hashtable layout is odd (`FX/fmt/`).
8.3 Decision: not in the gate. A diff-producing gate over a corpus where 77% of files would change is a style war, not a defect detector.

### 9. Manifests

9.1 `CompatiblePSEditions` is informational for non-inbox modules: a Core-only manifest imported on 5.1 (`FX/mod/`; docs: [about_PowerShell_Editions](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_powershell_editions) lines 104-111). Omitted means Desktop. The field requires `PowerShellVersion` >= 5.1. Gallery tags are `PSEdition_Desktop` and `PSEdition_Core`.
9.2 `PSUseToExportFieldsInManifest` flags wildcard `*ToExport` (3 of 4 fields; `VariablesToExport` not). Config grep M4 catches it.

### 10. Execution policy (measured on WinPS 5.1.26100.9444 unless stated)

10.1 A script with `Zone.Identifier` `ZoneId=3` is blocked under RemoteSigned, AllSigned, Restricted. Under Unrestricted non-interactively it fails with "AuthorizationManager check failed" (`FX/execpol/`).
10.2 `-ExecutionPolicy Bypass` on the CLI or `Set-ExecutionPolicy -Scope Process` works without admin, sets `$env:PSExecutionPolicyPreference`, and does not change CurrentUser. `Unblock-File` removes the stream ([about_Execution_Policies](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_execution_policies)).
10.3 On Linux pwsh (7.4.7/7.6.6) `Set-ExecutionPolicy` throws "Operation is not supported on this platform". The docs say the policy is not a security boundary.
10.4 No fleet or corpus installer calls `Set-ExecutionPolicy`. Scoop's installer checks and denies with an instruction (`ScoopInstaller/Install@1e2f334083d6:install.ps1:200-202`); uv, dotnet and the fleet use `-ExecutionPolicy Bypass` on the CLI; ocx prints "run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`" for profile loading (`ocx/crates/ocx_setup/src/lib.rs:658`).

### 11. Hallucination: commands that do not exist

11.1 The default rule set gives 0 findings on a script calling `Get-FileHashSha256`/similar nonexistent cmdlets (`FX/resolve/`).
11.2 `FX/resolve/Test-CommandResolves.ps1` walks `CommandAst` nodes and calls `Get-Command` on the target host, excluding functions defined in the file. It flagged the plant (red) and had zero false positives on www-setup's `install.ps1`. Run it on the target-version host (5.1 for installers).

### 12. Runtime 5.1 vs 7 facts that drive the tell greps (WinPS 5.1.26100.9444, pwsh 7.4.7 and 7.6.6)

12.1 Encoding: `Out-File` and `>` write UTF-16LE with BOM on 5.1; `Set-Content` writes ANSI; `-Encoding UTF8` writes a BOM; `utf8NoBOM` errors on 5.1. On 7.x everything is UTF-8 without BOM ([about_Character_Encoding](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_character_encoding)). Grep C9 requires `-Encoding` on every write cmdlet. Related PSSA rule: `PSUseBOMForUnicodeEncodedFile` (9 findings in the fleet census, all missing-BOM non-ASCII files).
12.2 `Join-Path a b c` errors on 5.1 ("A positional parameter cannot be found"), works on 7. C11.
12.3 Bare `$IsWindows` throws under `Set-StrictMode -Version Latest` on 5.1 (variable does not exist). Guard: `($PSVersionTable.PSEdition -eq 'Desktop') -or $IsWindows`. C5.
12.4 `curl`/`wget` aliases map to `Invoke-WebRequest` on 5.1; absent on Linux 7.4/7.6. Windows pwsh 7: unverified (no `pwsh.exe` on the host). C6.
12.5 `-UseBasicParsing` is a deprecated no-op since 6.0.0 but is required on 5.1 hosts without the IE engine. The "IWR without it fails at runtime" claim is unverified (the host has the IE engine). C7 flags the omission as a review item, not a proven defect.
12.6 GHA `shell: powershell` is Windows PowerShell 5.1 and `shell: pwsh` is Core; GHA prepends `$ErrorActionPreference = 'stop'` ([GHA workflow syntax](https://docs.github.com/actions/reference/workflow-syntax-for-github-actions)).
12.7 PSSA is not thread-safe in-process under `ForEach-Object -Parallel` ("An item with the same key has already been added"); sequential or one process per file.

### 13. The gate block

13.1 Taskfile shape (installer kind, run on the 5.1 host):

```
pwsh -NoProfile -File tools/Invoke-PSGate.ps1 -Path src -Settings settings/installer.psd1
powershell -NoProfile -ExecutionPolicy Bypass -File tools/parse-gate.ps1 -Path src
```

13.2 GHA shape: two steps, `shell: powershell` for the 5.1 parse and the installer profile, `shell: pwsh` for script/module profiles. On a Linux-only runner, drop the 5.1 steps and add `PSUseCompatibleSyntax@5.1` plus the greps C1-C4b, C16, C17; label the job "5.1 syntax: static fallback".
13.3 Order: settings validation (exit 2) before analysis (exit 1); fail the job on any non-zero.

### 14. Fleet and ocx defects (reported, not fixed; owner Q6)

14.1 `www-setup/taskfiles/pwsh.taskfile.yml:24` runs `Invoke-ScriptAnalyzer ... -Severity Warning,Error ... -EnableExit`: an unparseable file exits 0. Reproducer `FX/fleet-repro/repro.ps1` (the exact shape of line 24) exits 0 on the unparseable file and exits 2 once `ParseError` is added to `-Severity`. Same file `:22`: `Install-Module` unpinned.
14.2 `setup-grimoire/Taskfile.yml:45` (`-Severity Warning, Error`), `setup-grimoire/.github/workflows/test.yml:83` (unpinned `Install-Module`). Same two defects.
14.3 `www-setup/PSScriptAnalyzerSettings.psd1` excludes only the three stylistic rules and has no `Severity` key; the CLI `-Severity` therefore decides.
14.4 `setup-grimoire/.github/scripts/install.ps1` line 26 has non-ASCII bytes and no BOM: `PSUseBOMForUnicodeEncodedFile` and 5.1 ANSI misread risk.
14.5 `grimoire/docs/public/install.ps1:12` and `docs/dist/install.ps1:12` (`PSAvoidUsingInvokeExpression`) and ocx `test/manual/test-windows-activation.ps1` lines 133, 211, 228, 248 (same rule). These are the `irm | iex` shape and the intended flag; review, do not auto-fix.
14.6 Census: the 14 authored fleet `.ps1` files (excluding uv) all parse on 5.1; 22/22 including uv. Findings under the installer profile: 15 (UseBOMForUnicodeEncodedFile 9, InvokeExpression 6). Under the script profile: 54, adding 39 WriteHost. `www-setup/src/install.ps1` passes the proposed installer profile with 0 findings.

### 15. Agent tells (greps, GNU grep 3.12)

The 20 checks are in `FX/tells.sh`; each went red on a plant and green on the twin. Fleet run on `www-setup/src/install.ps1` fired C7a (string literal at :764, a false positive of intent, review item), C8 (`exit` at :182 and :734), C9c (`Add-Content` at :721).

## Normative guidance candidates

Legend: RUN = verification was run against a planted violation and went red, then green on the twin.

- **PS-GATE-01** Pin PSSA: `Install-Module PSScriptAnalyzer -RequiredVersion 1.25.0` (or use the preinstalled runner copy and assert `(Get-Module PSScriptAnalyzer -ListAvailable).Version`). Rationale: unpinned installs change rule sets and exit semantics (1.24.0 changed `-EnableExit`). Verify: `grep -rnP -e 'Install-Module[ ]+(-Name[ ]+)?PSScriptAnalyzer(?!.*-RequiredVersion)' --include='*.yml' --include='*.yaml' --include='*.ps1' DIR`; empty means pass. RUN: yes (M1, fleet hits 2).
- **PS-GATE-02** Every `Severity` list includes `ParseError`. Rationale: finding 3.2. Verify: `grep -rnP -e 'Severity[ ]*=[ ]*@[(](?!.*ParseError)' --include='PSScriptAnalyzerSettings*.psd1' DIR` and `grep -rnP -e 'Invoke-ScriptAnalyzer.*-Severity(?!.*ParseError)' --include='*.yml' --include='*.yaml' --include='*.ps1' DIR`. RUN: yes (M2, M3; fleet hits).
- **PS-GATE-03** Never gate on the raw `-EnableExit` value; use a wrapper that exits 0/1/2. Rationale: count mod 256 (finding 3.1). Verify: `grep -rn -e 'EnableExit' --include='*.yml' --include='*.yaml' --include='*.ps1' DIR` lists every use for review. RUN: yes (M5 lists; wrapper gate-tests 256 findings exit 1).
- **PS-GATE-04** The wrapper validates path, settings, ParseError, rule names, and non-empty file set (exit 2 on misconfiguration). Rationale: findings 3.3-3.6. Verify: run the wrapper against a missing-settings, typo-rule, no-ParseError and empty-dir fixture; each must exit 2. RUN: yes (5 cases).
- **PS-GATE-05** Pass per-kind settings explicitly with `-Settings`; no implicit `PSScriptAnalyzerSettings.psd1` discovery. Rationale: finding 2.3. Verify: wrapper requires the parameter. RUN: yes (implicit experiment).
- **PS-GATE-06** Four kinds (script, installer, module, test) each own a settings file with the table in 6.1. Rationale: noise vs signal per kind. Verify: kind-exclusion matrix. RUN: yes (14 cells).
- **PS-GATE-07** Exclude `PSAvoidUsingWriteHost` for the installer kind only. Rationale: Write-Host is the intended channel for `irm | iex`; proven not to mask `Invoke-Expression`. Verify: installer-like fixtures (6.3). RUN: yes.
- **PS-GATE-08** Enable `PSUseCompatibleSyntax@5.1` for installer and module kinds; no compat rule for the 7.6 script kind. Rationale: `TargetVersions` cannot express 7.6 (4.1). Verify: kind-exclusion matrix. RUN: yes.
- **PS-GATE-09** Where a 5.1 host exists, run a real 5.1 parse over installer and module files. Rationale: the rule misses background `&`, `clean {}`, `?[ ]` (4.3). Verify: `parse-gate.ps1` on the 6 plants (exit 1) and a compliant file (exit 0). RUN: yes (6 red on WinPS 5.1, 1 green; 1 green on pwsh 7.6.6 proving the wrong host passes).
- **PS-GATE-10** Without a 5.1 host, run `PSUseCompatibleSyntax@5.1` plus C1-C4b, C16, C17 and label the result a static fallback. Verify: `grep -rnE -e '^[^#]* && ' -e '^[^#]* [|][|] ' --include='*.ps1' --include='*.psm1' DIR`; `grep -rnE -e '^[[:space:]]*clean[[:space:]]*[{]' --include='*.ps1' --include='*.psm1' DIR`; `grep -rnE -e '^[^#"]*[^&"]&[[:space:]]*$' --include='*.ps1' --include='*.psm1' DIR`. RUN: yes.
- **PS-GATE-11** Files with `#Requires -Version 7.x` are excluded from the 5.1 parse and must declare it. Verify: `grep -rnE -e '^#[Rr]equires -[Vv]ersion [6-9]' --include='*.ps1' --include='*.psm1' DIR` lists them. RUN: yes (C14; `requires/runall.sh`).
- **PS-GATE-12** Exclude `PSUseDeclaredVarsMoreThanAssignments` only in the test kind. Rationale: 22/30 false positives, 13/15 in tests. Verify: kind-exclusion matrix. RUN: yes.
- **PS-GATE-13** `PSUseCompatibleCommands`/`Types` are advisory, never blocking. Rationale: finding 5. Verify: absent from the blocking settings; `grep -rn -e 'UseCompatibleCommands' -e 'UseCompatibleTypes' --include='*.psd1' DIR` over blocking settings must be empty. RUN: no (config rule; behavior measured in cc/).
- **PS-GATE-14** Add `Test-CommandResolves` on the target host as a blocking check. Rationale: finding 11. Verify: planted nonexistent cmdlet exits 1; www-setup install.ps1 exits 0. RUN: yes.
- **PS-GATE-15** Keep `Invoke-Formatter` out of the gate. Rationale: finding 8. Verify: n/a (measured). RUN: no.
- **PS-GATE-16** Run PSSA sequentially, never in `ForEach-Object -Parallel`. Verify: `grep -rn -e 'ForEach-Object -Parallel' -e 'Invoke-ScriptAnalyzer' --include='*.ps1' DIR` review. RUN: yes (failure reproduced; no grep plant).
- **PS-GATE-17** Manifests: no wildcard `*ToExport`. Verify: `grep -rnE -e "(Functions|Cmdlets|Aliases|Variables)ToExport[[:space:]]*=[[:space:]]*'[*]'" --include='*.psd1' DIR`. RUN: yes (M4).
- **PS-GATE-18** `CompatiblePSEditions` is documentation, not enforcement; test imports on each edition. Rationale: 9.1. Verify: import a Core-only manifest on 5.1. RUN: yes (measured).
- **PS-GATE-19** Execution policy: use `-ExecutionPolicy Bypass` on the CLI or `-Scope Process`; never write CurrentUser/LocalMachine from an installer; never on non-Windows. Verify: `grep -rnP -e '^[^#]*Set-ExecutionPolicy(?!.*-Scope[ :]+.?Process)' --include='*.ps1' --include='*.psm1' DIR`. RUN: yes (C15).
- **PS-GATE-20** Documentation tells users `Unblock-File` for MOTW-blocked downloads. Verify: manual (measured on 5.1). RUN: yes (execpol).
- **PS-GATE-21** Ban `$name?.` and `$name?[` (use `${name}?.`). Verify: `grep -rnE -e '^[^#]*[$][[:alnum:]_]+[?][.[]' --include='*.ps1' --include='*.psm1' DIR`. RUN: yes (C4a); also C4b `[}][?][.[]`.
- **PS-GATE-22** Guard platform variables: `$IsWindows` only after a `PSEdition` check. Verify: `grep -rnP -e '^(?!.*PSEdition)[^#]*[$]Is[WLMC][A-Za-z]+' --include='*.ps1' --include='*.psm1' DIR`. RUN: yes (C5).
- **PS-GATE-23** Always pass `-Encoding` to `Out-File`, `Set-Content`, `Add-Content`. Verify: `grep -rnP -e '^[^#]*Out-File(?!.*-Encoding)' ...` and the `Set-Content`/`Add-Content` twins. RUN: yes (C9a/b/c).
- **PS-GATE-24** `Join-Path` takes at most two positional arguments (nest for more). Verify: C11 pattern (`FX/tells.sh:22`). RUN: yes.
- **PS-GATE-25** Use `curl.exe` explicitly, never the `curl`/`wget` alias; `Invoke-WebRequest`/`iwr` always with `-UseBasicParsing` in 5.1 code. Verify: `grep -rn -e '^[[:space:]]*curl[[:space:]]' -e '^[[:space:]]*wget[[:space:]]' -e '[=(][[:space:]]*curl[[:space:]]' --include='*.ps1' DIR`; `grep -rnP -e '^[^#]*Invoke-WebRequest(?!.*UseBasicParsing)' --include='*.ps1' --include='*.psm1' DIR`. RUN: yes (C6, C7a/b).
- **PS-GATE-26** Review every `exit` in an installer (an `exit` kills the host session when dot-sourced or `iex`'d). Verify: `grep -rn -e '^[[:space:]]*exit[[:space:]]' -e '^[[:space:]]*exit$' --include='install*.ps1' DIR`. RUN: yes (C8; fleet hits :182 and :734).
- **PS-GATE-27** Ban 7-only commands and parameters in 5.1 code. Verify: `grep -rn -e '-AsHashtable' -e '-AsByteStream' -e '-Parallel' -e 'Join-String' -e 'Test-Json' -e 'Get-Error' -e '-SkipHttpErrorCheck' -e 'utf8NoBOM' -e '-AsArray' --include='*.ps1' --include='*.psm1' DIR`. RUN: yes (C10).
- **PS-GATE-28** Ban `` `e[ `` and `` `u{ `` escapes in 5.1 code. Verify: C12 (`FX/tells.sh:23`). RUN: yes.
- **PS-GATE-29** Keep verb and noun rules off for scripts/installers; keep them on for modules but only against exported functions (private functions are flagged too, so use `Export-ModuleMember` or a `SuppressMessage` for private helpers). RUN: yes (kind matrix; private flagging measured).

## Verification runs

All run under `timeout 300`; fixtures under FX; none touch a repository.

| # | Fixture | Command | Red exit | Green exit | Key output |
|---|---|---|---|---|---|
| 1 | `rules/*.bad.ps1` x24 | `rules-harness.ps1` (pwsh 7.6.6) | 24 plants flagged | 24 twins clean | `24/24 OK` (`rules-harness.out`) |
| 2 | same on WinPS 5.1 | `rules-harness.ps1` on 5.1.26100.9444 | 23/24 | 24/24 | compat plant is ParseError on 5.1 (`rules-harness-ps51.out`) |
| 3 | same via raw `-EnableExit` | `rules-enableexit.sh` | 24 plants exit 1 | 24 twins exit 0 | `rules=24 plant_red=24 twin_green=24` |
| 4 | `t1/`, `gate/big/many256.ps1` | `enableexit-failopen.sh` | 4 fail-open cases exit 0 | n/a | `FAIL-OPEN 256 findings exit=0`, `FAIL-OPEN parse error, Severity=Error,Warning exit=0`, `FAIL-OPEN settings path does not exist exit=0`, `FAIL-OPEN typo in Rules key exit=0` |
| 5 | `gate/bad`, `gate/good`, `gate/empty`, `settings-bad/` | `gate-tests.sh` (Invoke-PSGate.ps1) | 7 cases as expected | 2 | `want=2 got=2` for settings missing/path missing/empty/typo/no-ParseError; `unknown rule name(s) in settings: PSUseCompatibleSyntx` |
| 6 | `cs/` (6 7-only plants) | `parse-gate-tests.sh` | WinPS 5.1: ternary, null-coalesce, chain-and, background, clean-block, nullcond-index all exit 1 | compliant51 exit 0 | `parse-gate: 1 files, 2 errors, PowerShell 5.1.26100.9444` (clean-block); pwsh 7.6.6 ternary exit 0 (wrong host passes) |
| 7 | `installer/`, `rules/*.kind` | `kind-exclusions.sh`, `installer/cases.ps1` | non-excluded kinds exit 1 | excluded kinds exit 0 | `installer-like.ps1 under installer: 0 findings`; `installer-like.iex.ps1 under installer: 1 findings PSAvoidUsingInvokeExpression` |
| 8 | `tells/bad` vs `tells/good` | `bash tells.sh tells/bad` / `tells/good` | 20/20 checks hit | 20/20 empty | e.g. C4a `^[^#]*[$][[:alnum:]_]+[?][.[]` flags `$o?.Name` |
| 9 | `meta/bad` vs `meta/good` | `bash meta.sh meta/bad` / `meta/good` | 5/5 hit | 5/5 empty | fleet: M1 `pwsh.taskfile.yml:22`, M3 `:24`, M5 `:24`,`:31`; M1 `test.yml:83`, M3 `Taskfile.yml:45` |
| 10 | `resolve/` | `Test-CommandResolves.ps1` on plant / www-setup `install.ps1` | exit 1 on hallucinated cmdlet | exit 0 on install.ps1 | zero false positives |
| 11 | `fleet-repro/repro.ps1` | exact shape of `pwsh.taskfile.yml:24` | exit 0 on unparseable file (the defect) | exit 2 once `ParseError` added | |
| 12 | `dv/`, `verbs/`, `fmt/`, `cc/`, `mod/`, `execpol/`, `requires/` | measurement scripts | (measurements, not red/green) | | numbers quoted in findings |

Planted-and-watched-red count: 24 rule plants, 20 tell greps, 5 config greps, 4 fail-open modes, 6 parse-gate plants, 7 gate cases, 5 kind-exclusion proofs, 1 Test-CommandResolves plant = 72.

## Exemplar evidence

- `pester@98e56d65da16:PSScriptAnalyzerSettings.psd1:2,6-9` - Severity list without ParseError.
- `posh-git@bbc5ac380018:PSScriptAnalyzerSettings.psd1:6,20` - same.
- `Scoop@e6aa3b366bde:PSScriptAnalyzerSettings.psd1:5,24-27` - `Severity='Error'` only; also documents DeclaredVars issue.
- `ScoopInstaller/Install@1e2f334083d6:PSScriptAnalyzerSettings.psd1:5,24-30` - same shape; `:25-27` cites PSScriptAnalyzer#636.
- `dotnet/install-scripts@e5cf1dd2d154:eng/common/PSScriptAnalyzerSettings.psd1:2-10` - an IncludeRules allow-list of 9 rules (no ParseError because IncludeRules + no Severity: parse errors depend on host defaults; worth a follow-up).
- `ScoopInstaller/Install@1e2f334083d6:install.ps1:200-202` - execution-policy check-and-instruct, no mutation.
- Runner images: `actions/runner-images@8197087fc536:images/windows/Windows2025-Readme.md:482` and `images/ubuntu/Ubuntu2404-Readme.md:225`.
- Fleet (read-only, not fixed): `www-setup/PSScriptAnalyzerSettings.psd1` (3 stylistic excludes, no Severity); `www-setup/taskfiles/pwsh.taskfile.yml:22-31`; `setup-grimoire/Taskfile.yml:28-49`; `setup-grimoire/.github/workflows/test.yml:83`; `ocx/crates/ocx_setup/src/lib.rs:658`.
- Corpus numbers (`shell-audit/exemplar-shape.md`): PSSA 1.25.0 default rules over 1,119 files gave 5,051 findings; DeclaredVars 1,580; WriteHost 753; 590 of 591 third-party `.ps1` files parse on 5.1.
- Verb survey (`FX/verbs/out.json`, 1,077 hits across 6 rules): WriteHost 586, ApprovedVerbs 120, ReviewUnusedParameter 114, GlobalVars 106, ShouldProcess 103, SingularNouns 48. WriteHost by repo: Scoop 231, dotnet install-scripts 138, PowerShell 111, vcpkg 53, Pester 13.

## AI-agent angle

- Agents write PowerShell 7 idioms into 5.1 targets: `&&`/`||`, `??`, ternary, `-AsHashtable`, `Join-Path a b c`, `$IsWindows`. The 5.1 parse plus the C-greps catch these deterministically.
- Agents write `$obj?.Prop` believing it is null-conditional. It silently returns `$null` on every version (finding 4.5); only grep C4a catches it.
- Agents hallucinate cmdlets and parameters. PSSA default rules see nothing (finding 11.1); only a command-resolution check on the target host does.
- Agents add `Set-ExecutionPolicy` to scripts as a reflex "fix"; it throws on Linux and mutates user state on Windows (C15).
- Agents emit `Out-File`/`>` for config files without `-Encoding`; on 5.1 that is UTF-16LE with BOM (C9).
- Agents "fix" a failing analyzer by adding it to `ExcludeRules` globally or by weakening `Severity` to `Error,Warning`; the wrapper's ParseError check and the per-kind files bound that. The wrapper makes weakening a visible settings diff rather than a silent fail-open.
- Agents trust a green exit. The wrapper's exit 2 for a vacuous or misconfigured gate is the guard against a verified-nothing pass.

## Contested / evolving

- `PSUseCompatibleSyntax` for 7.x floors: `7.4`/`7.6` behave as 7.0 on 1.25.0; main may add real targets. Re-measure on the next PSSA release.
- Four rules on main (`AvoidUsingArrayList`, `MissingTryBlock`, `AvoidDynamicallyCreatingVariableNames`, `InvalidMultiDotValue`) will arrive in the next release and change counts; the wrapper's known-rule check will start accepting them without edits.
- `Test-ScriptAnalyzerSettingsFile` exists on main only; if shipped it could replace the custom validation but not the ParseError and empty-set checks.
- `PSUseApprovedVerbs`/`SingularNouns` on private functions: whether to exempt via `Export-ModuleMember`-aware checks is contested; this report prefers kind exclusions plus module-only enabling.
- `-UseBasicParsing` omission: unverified as a runtime failure on hosts without the IE engine; kept as a review grep, not a blocker.
- Windows pwsh 7 `curl` alias behavior: unverified (no `pwsh.exe` on the host).
- macOS/BSD: no host; grep checks are GNU grep 3.12 only, BSD grep unverified: read only.
- Whether `dotnet install-scripts`' IncludeRules-only settings (no Severity) report ParseError: not measured; follow-up.

## Sources

| URL | What | Date | Why |
|---|---|---|---|
| https://github.com/PowerShell/PSScriptAnalyzer | README, rule list and default state (primary) | 2026-10-11 | rule inventory, rules absent from 1.25.0 |
| https://github.com/PowerShell/PSScriptAnalyzer/blob/main/docs/Cmdlets/Invoke-ScriptAnalyzer.md | cmdlet reference (primary) | 2026-10-11 | Severity, ParseError, EnableExit semantics |
| https://api.github.com/repos/PowerShell/PSScriptAnalyzer/releases | releases API (primary) | 2026-10-11 | 1.25.0 date, 1.24.0 changes |
| https://www.powershellgallery.com/packages/PSScriptAnalyzer/1.25.0 | Gallery package page (primary) | 2026-10-11 | latest-version confirmation |
| https://learn.microsoft.com/powershell/utility-modules/psscriptanalyzer/using-scriptanalyzer | Learn: using PSSA (primary) | 2026-10-11 | settings schema |
| https://learn.microsoft.com/powershell/utility-modules/psscriptanalyzer/rules/usecompatiblesyntax | Learn: rule doc (primary) | 2026-10-11 | TargetVersions |
| https://learn.microsoft.com/powershell/utility-modules/psscriptanalyzer/rules/usecompatiblecommands | Learn: rule doc (primary) | 2026-10-11 | profile names and limits |
| https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_execution_policies | about_Execution_Policies (primary) | 2026-10-11 | MOTW, scope, not a security boundary |
| https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_powershell_editions | about_PowerShell_Editions (primary) | 2026-10-11 | CompatiblePSEditions, lines 104-111 |
| https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_requires | about_Requires (primary) | 2026-10-11 | #Requires timing |
| https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_operators | about_Operators (primary) | 2026-10-11 | `?.`, `?[]`, `??` and the `${}` requirement |
| https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_character_encoding | about_Character_Encoding (primary) | 2026-10-11 | 5.1 vs 7 default encodings |
| https://github.com/actions/runner-images (Windows2025-Readme.md:482, Ubuntu2404-Readme.md:225, @8197087fc536) | runner image inventories (primary) | 2026-10-11 | preinstalled PSSA 1.25.0 and pwsh 7.6.6 |
| https://docs.github.com/actions/reference/workflow-syntax-for-github-actions | GHA workflow syntax | 2026-10-11 | `shell: powershell` vs `pwsh` |
| https://github.com/PowerShell/PSScriptAnalyzer/issues/636 | PSSA issue 636 | 2026-10-11 | DeclaredVars false positives, cited by Scoop |
| https://github.com/pester/Pester (@98e56d65da16) | exemplar settings | 2026-10-11 | Severity without ParseError |
| https://github.com/dahlbyk/posh-git (@bbc5ac380018) | exemplar settings | 2026-10-11 | same |
| https://github.com/ScoopInstaller/Scoop (@e6aa3b366bde) | exemplar settings | 2026-10-11 | Severity='Error' only |
| https://github.com/ScoopInstaller/Install (@1e2f334083d6) | exemplar settings and install.ps1 | 2026-10-11 | execution-policy handling |
| https://github.com/dotnet/install-scripts (@e5cf1dd2d154) | exemplar settings | 2026-10-11 | IncludeRules allow-list |
| https://github.com/PowerShell/PowerShell | corpus hits for verbs and WriteHost | 2026-10-11 | noise survey |
| https://github.com/microsoft/vcpkg | corpus (formatter mixed-EOL failure) | 2026-10-11 | Invoke-Formatter limits |
| https://github.com/junegunn/fzf | corpus (formatter error, dead-store defect install.ps1:10) | 2026-10-11 | noise study |
| FX/ (local) | measurement fixtures and outputs | 2026-10-11 | all verification runs |
| shell-audit/exemplar-shape.md (local) | corpus census | 2026-10-11 | 1,119-file PSSA run |
| shell-audit/scratch/exemplar-shas.md (local) | pinned SHAs | 2026-10-11 | citation anchors |

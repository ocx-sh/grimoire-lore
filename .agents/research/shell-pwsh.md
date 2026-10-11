---
title: PowerShell 5.1 and 7 - targets, compatibility, error model, native calls, encoding and the gate (consolidation)
topic: shell scripting across operating systems and shells - PowerShell 5.1 and 7 (wave 2, group pwsh)
model: sonnet
id_family: PS-COMPAT, PS-ERR, PS-GATE
id_family_carried: PS-ENC, PS-NATIVE
consolidates:
  - shell-pwsh/compat-and-encoding.md
  - shell-pwsh/errors-and-native.md
  - shell-pwsh/analyzer-profile.md
  - shell-pwsh/windows-7x-and-resolver.md
date: 2026-10-11
revised: 2026-10-11
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/pwsh-consolidation/ (this file's own runs R1-R8; the 2026-10-11 revision's runs R9-R16 sit in its rev2/ subdirectory); the four dives' fixtures sit beside it
---

# PowerShell 5.1 and 7 - consolidation

Keys. **[compat]** = `shell-pwsh/compat-and-encoding.md` (§ = its finding, "cand N" = its normative candidate, V# = its verification run). **[err]** = `shell-pwsh/errors-and-native.md` (f# = finding, PS-ERR-nn / PS-NATIVE-nn = its candidates, V#). **[gate]** = `shell-pwsh/analyzer-profile.md` (§ = finding, PS-GATE-nn = its candidates, "run #"). **[win7x]** = `shell-pwsh/windows-7x-and-resolver.md` (f# = its finding, N# = its normative candidate, V# = its verification row; the follow-up round this file commissioned). Audits: **[fleet]** `shell-audit/fleet-shell-shape.md`, **[inst]** `installers.md`, **[plat]** `platform-matrix.md`, **[ex]** `exemplar-shape.md`, **[cfg]** `config-inventory.md`, **[ocx]** `ocx-emitter.md`. **R1-R8** = runs made for the first consolidation, **R9-R16** = runs made for the 2026-10-11 revision (both at the end of "The ruleset"). A bare ID (PS-ERR-05) is this file's merged rule; a sub-artifact's own candidate numbering is always prefixed with its key ([err] PS-ERR-06). Engines everywhere: Windows PowerShell 5.1.26100.9444 (real Windows host), pwsh 7.4.7, pwsh 7.6.6, all 2026-10-11 unless a row says otherwise. From the revision on, a pwsh 7.x row says "Windows" (de-DE host, ANSI cp1252, system OEM cp437, portable zips under `C:\Users\ecom\shell-wintest\`) or "Linux": the two differ for encoding and console. No macOS host: nothing here depends on one.

Scope note. The map gives this group three families (PS-COMPAT, PS-ERR, PS-GATE), but the dives behind them researched rows of two more depth files that no other wave-2 group owns: PS-ENC (rows M-S-01..04, in [compat]) and PS-NATIVE (rows M-R-01, M-R-02, M-R-04, in [err]). They are carried here under the map's own family names so the six `powershell-quality` depth files stay 1:1 with the families. PS-SEC (M-U-*) and PS-CORE belong to the installer group and the index; one PS-SEC row (M-U-02) was measured by [gate] and is carried as PS-GATE-07. The 2026-10-11 revision folds in [win7x] (pwsh 7.x encoding on Windows, `Test-CommandResolves` precision, IncludeRules against ParseError, the runner-file writer): it adds PS-ENC-07..10 and amends PS-COMPAT-05, PS-ENC-02..06 and PS-GATE-01, -02, -06 in place; the "Revision log" lists every change.

## Verdict

1. **Three targets, chosen by script kind.** Installers, bootstrap and anything fetched by `irm | iex` or run with `powershell -File` on a stock Windows target **Windows PowerShell 5.1** (`#Requires -Version 5.1`, ASCII only, no BOM, a version check in code because `iex` ignores `#Requires`). Repo, dev, CI and Pester scripts target **PowerShell 7.6 LTS** (`#Requires -Version 7.6`). Modules are dual-edition and imported on a real 5.1. 7.4 and 7.5 end support 2026-11-10 ([compat] §1, §11), so no `#Requires` floor names them.
2. **5.1 compatibility is proven on a 5.1 host, not by PSScriptAnalyzer.** `Parser::ParseFile` on Windows PowerShell 5.1 is the syntax gate. `PSUseCompatibleSyntax` is off by default and blind to four constructs (leading-pipe continuation, trailing `&`, `clean {}`, `${a}?[0]`); pwsh 7 parses all of them, so the wrong host passes ([compat] §3, [gate] §4, R2). A Linux-only CI gets a labelled static fallback, never a silent green.
3. **A native exit code is never an error under `$ErrorActionPreference = 'Stop'`, on any engine.** Every native whose failure matters is checked (`Invoke-Native` or inline `$LASTEXITCODE`). `$PSNativeCommandUseErrorActionPreference` is a 7.4+ convenience allowed only in 7.6-only code (decision: 7.4+, not the map's "7.3+"; 7.3 had it experimental). GHA `shell: pwsh` is "last native command wins" ([err] f1, f2, f6, R6).
4. **Delivery by `irm | iex` constrains the whole file**: no `exit` (kills the caller's shell on 5.1, 7.4, 7.6), no BOM (a U+FEFF-prefixed string fails `iex` on 5.1, 7.4.7 and 7.6.6, Windows included, R14), no non-ASCII, no reliance on `#Requires` ([err] f8, [compat] §7, [win7x] f3, R8).
5. **Encoding by kind.** 5.1-bound files are ASCII and write files only through .NET writers or `-Encoding ascii`. 7.6-only scripts are UTF-8 without BOM (7.4.7 and 7.6.6 on a cp1252 Windows host read a BOM-less UTF-8 source, `Get-Content -Raw` and `Import-Module` as UTF-8, R12) and their PSSA profile excludes `PSUseBOMForUnicodeEncodedFile`, so no agent "fixes" a finding by adding a BOM that breaks `#!` scripts (R4). Decided against [gate]'s shipped `script.psd1`. Three things the first pass left wrong or open are now measured on the Windows host (R12, R16): 7.x writes UTF-8 without BOM by default, not for every `-Encoding` name (`unicode`, `utf32`, `oem`, `ansi`, `utf8BOM` and `[Text.Encoding]::UTF8` still differ), so locale-dependent names are banned (PS-ENC-03, PS-ENC-07); U+2018..U+201E are quote tokens on all three engines, so they stay out of code positions of every `.ps1`, 7.6-only files included (PS-ENC-08); on 7.x `$OutputEncoding` is UTF-8 but `[Console]::OutputEncoding` is still the OEM code page, so a PowerShell or native child's stdout is decoded (and a `pwsh` child's own redirected stdout is encoded) as cp437 unless the console encoding is set (PS-ENC-05, PS-ENC-09).
6. **The gate is a wrapper (exit 0/1/2), not the raw cmdlet.** `ParseError` is in every `Severity` that is set (an absent `Severity` reports it, so IncludeRules-only settings are valid), every rule name in the settings exists (PSSA ignores unknown names silently), settings are explicit and per kind, PSSA is pinned. The fleet's two PSSA gates fail open today ([gate] §3, §14, [win7x] f7, R3, R10).
7. **Conflicts decided with a run**: Severity without ParseError (gate wins), `-UseBasicParsing` is a measured failure not "unverified" (compat wins), platform-guard operand order (AST wins over grep), leading pipe missing from the fallback set (added), `Write-Host` by kind; from the revision: 7.x writer bytes narrowed, the runner-file writer (X8), IncludeRules-only settings, the resolver's level, the docs' source-encoding sentence. Table below (1-18).
8. **Yield.** First pass: 37 rules from 66 candidates (23 + 14 + 29): 22 MUST, 13 SHOULD, 2 CONSIDER. After the 2026-10-11 revision: 41 rules from 82 candidates (the 16 of [win7x] add PS-ENC-07..10 and amend seven existing rules in place): 25 MUST, 14 SHOULD, 2 CONSIDER. Checks are grouped by what catches them at the end of the ruleset.
9. **The 5.1 runner-file writer is settled (PS-ENC-10, the map's X8).** `[IO.File]::AppendAllText(... UTF8Encoding($false))` and `Out-File -Encoding utf8 -Append` both decode correctly through the runner's two readers on `$GITHUB_ENV`/`PATH`/`OUTPUT`, alone and mixed in either order, because `Out-File -Encoding utf8` writes its BOM only into an empty file; `>>`, `Out-File` without `-Encoding utf8`, `-Encoding unicode` and `Add-Content` with a non-ASCII value corrupt it in 7 of 21 measured sequences, all of which contain a banned writer (R11). PS-ENC-03's blanket "never `-Encoding utf8`" now has this one named exception, and the AST check D6 as shipped flags the accepted form (R9), so the check carries a carve-out. SH-CI-11 in `shell-ci.md` says "only `Out-File -Encoding utf8 -Append`": it needs an edit to name both writers (hand-off, not applied here).
10. **The command resolver stays SHOULD and becomes advisory (PS-GATE-06).** On the 5.1 host it caught 13 of 13 planted hallucinated cmdlets and parameters with 0 findings on 25 twins, but untuned it flagged 8 of 178 correct installer-like files (4.5%) and 30 of its 33 findings there were false (optional modules, Chocolatey helpers, version-gated blocks); a blocking gate would fail correct code. Tuned (an `-Allow` list plus version-gate suppression) 4 findings remain in the 17 small repos, all real 7-only constructs ([win7x] f6, R15).
11. **Documented gaps** (the revision established a limit, not an answer; each is carried in the rule it touches).
    - *Resolver precision out of sample.* The tuned result (4 findings) used an allow-list written from the same corpus; the false-finding rate of the tuned tool on unseen code is unmeasured, which is why PS-GATE-06 cannot move to MUST. The tuned tool also suppresses a hallucination inside a version gate (`guard-run`), and no variant sees splatted parameters, dynamic command names, .NET members or parameter values (`[IO.Path]::GetRelativePath`, `[Math]::Clamp`, `-Encoding utf8NoBOM` all throw on 5.1 and exit 0 through it, R15).
    - *Runner-file reader.* Both readers are emulated from `actions/runner` source (`FileCommandManager.cs`@67f01c276e0a) over a runner-shaped empty file, not observed on a hosted job.
    - *Windows 7.x console and locale.* All runs were non-interactive through WSL interop on one host (build 26100, de-DE, ANSI cp1252, OEM cp437). An interactive Windows Terminal session and a host with the "Use Unicode UTF-8 for worldwide language support" system locale (ANSI 65001) were not measured (unverified: read only); the 5.1 byte tables assume ANSI 1252. `-Encoding oem` follows the system OEM code page (437 here, unchanged by `chcp 850`), not the console's.
    - *Docs lag the engine in three places* (measured, so the rules follow the engine): `New-ModuleManifest` is BOM-less UTF-8 on Windows 7.x (the breaking-change note says non-Windows only); `Out-File -Append` does not adapt to the existing file's encoding on any engine while `Add-Content` does; about_Character_Encoding's "the engine reads source as ANSI" is true of 5.1 only.

## The ruleset

Each rule: imperative; **Why** (the failure it prevents); **Check** (exact command, output = violation unless said otherwise; grep is GNU grep 3.12 from `/usr/bin`, BSD grep not measured: unverified, read only); **Watched** (red on a planted violation and green on its twin, with the run); **Scope**. Run each directory-scoped check once per kind directory; `.` below is that directory.

### Conflicts resolved

| # | Conflict | Decision and reason |
|---|---|---|
| 1 | [compat] cand 6 ships `pssa-51.psd1` with `Severity = Error,Warning` and `IncludeRules = PSUseCompatibleSyntax`; [gate] §3.2 says `ParseError` must be listed. | **[gate] wins.** R3: raw `-EnableExit` with `Error,Warning` exits 0 on an unparseable file, 2 with `ParseError`; the wrapper rejects [compat]'s file (exit 2). The installer profile instead keeps the defaults and sets `Rules.PSUseCompatibleSyntax.Enable`. Revised 2026-10-11: the first pass blamed `IncludeRules` ("restricts a run to the named rule"); it is the explicit `Severity` list that drops ParseError, and `IncludeRules` alone does not (parse errors are not rules, R10; row 16). See PS-GATE-01..03. |
| 2 | [gate] §12.5 and Contested: "IWR without `-UseBasicParsing` fails at runtime" is unverified (host has the IE engine). [compat] §5 measured it failing. | **[compat] wins.** R5 re-run: 5.1.26100.9444 `-NonInteractive -File` exits 1 on the plant, 0 on the twin; 7.4.7 and 7.6.6 exit 0 on both. PS-COMPAT-06 is a MUST. |
| 3 | Platform guard: [compat] D2 (AST) rejects `$IsWindows -or $PSVersionTable.PSEdition -eq 'Desktop'`; [gate] C5 (grep: any line containing `PSEdition` passes) accepts it. | **AST wins.** R1: 5.1 errors "The variable '$IsWindows' cannot be retrieved" on the reversed order, runs on the forward order; C5 passes both, D2 flags only the reversed one. The grep is a fallback only. |
| 4 | [compat] §3 says PSSA misses leading-pipe continuation; [gate] §4.3 lists only `&`, `clean`, `${a}?[0]` and its static fallback (C1-C4b, C16, C17) has no leading-pipe check. | **Add it.** R2: PSSA@5.1 gate exits 0 on the leading-pipe plant; 5.1 `ParseFile` rejects it ("An empty pipe element is not allowed"); a new leading-pipe grep (given in PS-COMPAT-02) is red on the plant and green on the twin. |
| 5 | 7.6-only scripts and the BOM rule: [compat] cand 15 excludes `PSUseBOMForUnicodeEncodedFile` for 7-only scripts; [gate] §6.1 `script.psd1` does not. | **Exclude it for the script kind.** R4: the shipped `script.psd1` fails a script whose only non-ASCII is a comment em dash; the fix an agent reaches for (a BOM) turns a `#!` script into exit 127. PS-ENC-06, PS-GATE-03. |
| 6 | `$PSNativeCommandUseErrorActionPreference` appears in the map (M-Q-01) as "7.3+"; [plat] §2.3 "UNVERIFIED, treat as 7.4+"; [err] f2 "7.4+". | **7.4+.** Experimental in 7.3, mainstream in 7.4 ([err] f2 cites What's New 7.3 and 7.4); R6: 7.4.7 throws without any experimental flag, 5.1 prints `reached`, exit 0. |
| 7 | Floor for non-installer scripts: [plat] §4.3 "7.4+ until 2026-11-10, 7.6+ after"; [err] PS-ERR-03 example says `#Requires -Version 7.4`; map conflict 6 and [compat] §1 say 7.6. | **7.6.** Written today, 7.4 is stale in 30 days; runner images carry 7.6.6 ([compat] §1). 7.4 survives only as a transitional parse-matrix column until 2026-11-10. |
| 8 | `Write-Host`: [gate] PS-GATE-07 excludes `PSAvoidUsingWriteHost` for installers as "the intended channel"; [err] PS-ERR-09 says it lands on stdout and diagnostics belong on `[Console]::Error`. | **By kind.** PS-ERR-08 is MUST wherever stdout is data (script, module, test); the installer profile keeps the exclusion but the installer's own rule is the stronger form www-setup already meets (0 `Write-Host`, stderr helpers at :168-182, [err] f7). |
| 9 | Overlap: [compat] AST set D1-D7 vs [gate] grep set C1-C17 for the same defects. | **AST is the check of record where they disagree; greps are the cheap fallback.** R7: C9a (`Out-File` without `-Encoding`) passes `-Encoding utf8`, which writes `ef bb bf` on 5.1; D6 flags it. R1 is the second disagreement. |
| 10 | `curl`/`wget` in [compat] cand 12 (under `-UseBasicParsing`) vs [err] PS-NATIVE-01 (write `curl.exe`). | **Two rules.** The aliases are banned by PS-NATIVE-01; PS-COMPAT-06 binds `Invoke-WebRequest`/`iwr` (the D7 name list keeps `curl`/`wget` so a stray alias is still caught). |
| 11 | `exit` under `iex`: [gate] PS-GATE-26 greps every `exit` in `install*.ps1`; [err] PS-ERR-06 greps files that use `irm` and `iex` and never test `$MyInvocation.MyCommand.Path`. | **[err] wins** (fewer false positives; passes iex-aware files). Merged as PS-ERR-05; PS-GATE-26 dropped. |
| 12 | Windows pwsh 7 evidence: [compat] and [gate] say it was not measurable; [err] ran portable 7.4.7 and 7.6.6 zips on the host. | **[err]'s runs stand** for native exit codes, `curl`, argument passing, `exit` under `iex`. Encoding and console behaviour of pwsh 7 on Windows, open in the first pass, is measured by [win7x] with the same zips (R12, R16); rows 14, 15 and 18 carry the consequences. |
| 13 | `-UseBasicParsing` tallies: [ex] 12 of 31 IWR files; [compat] §5 re-count 17 of 41. | Numeric only; same conclusion (dotnet and Scoop pass it, most others do not). [compat]'s count is cited. |
| 14 | PS-ENC-03's Why, [compat] §8 and [gate] §12.1: "on 7.x everything is UTF-8 without BOM" (the [compat] runs were Linux 7.4.7/7.6.6); [win7x] f2: on 7.4.7 and 7.6.6 Windows `-Encoding unicode\|utf32\|oem\|ansi\|utf8BOM` and `[Text.Encoding]::UTF8` still differ. Also [compat] V14 (Linux 7.6.6: `-Encoding oem` is UTF-8, console UTF-8) against [win7x] f1/f2 (Windows 7.x: `oem` writes cp437, `Console.Out` is cp437). | **[win7x] wins; the two runs describe different platforms, both true.** The rule claimed more than the first pass measured. PS-ENC-03 now says "UTF-8 without BOM by default and for `-Encoding utf8`", PS-ENC-07 bans the locale-dependent names, and every 7.x encoding claim is tagged Windows or Linux. R12. |
| 15 | The map's X8 and PS-ENC-03's first text: `AppendAllText` for the runner files, "never `-Encoding utf8`", and "the runner's tolerance of the 5.1 BOM was not measured"; SH-CI-11 (`shell-ci.md`): only `Out-File -Encoding utf8 -Append`. | **Both are right.** The runner readers (emulated) decode either writer alone and the two mixed in either order; they corrupt `>>`, `Out-File` without `-Encoding utf8`, `-Encoding unicode` and non-ASCII `Add-Content` (R11, 42 rows). PS-ENC-10 holds the one list; PS-ENC-03 names it as its single exception. The AST check D6 flagged the accepted form (R9), so the check of record carries a carve-out. SH-CI-11 must name both writers (hand-off). |
| 16 | PS-GATE-01/-02's first text ("`ParseError` is in `Severity`") and [gate] exemplar note on dotnet's IncludeRules-only file ("no ParseError ... worth a follow-up"); the first-pass wrapper exited 2 on such a file. | **[win7x] wins (f7).** An absent `Severity` reports ParseError on 5.1, 7.4.7 and 7.6.6 (PSSA 1.25.0; `severity == null` branch, `ScriptAnalyzer.cs`@411c3d0b197b:1488,1902; R10). Only a `Severity` that is set and omits it is the opt-out. The wrapper's check was watched red on a compliant twin and is replaced. dotnet's real defect is 3 of 9 rule names that do not exist, silently ignored. |
| 17 | PS-GATE-06's first text and [gate] PS-GATE-14: `Test-CommandResolves` "as a blocking check"; [win7x] N11: advisory, never a required status check. | **[win7x] wins.** Untuned it flags 8 of 178 correct installer-like files; a blocking gate fails correct code. SHOULD, advisory, run on the target host, tuned (R15). |
| 18 | [compat] §7 quotes about_Character_Encoding unscoped ("ANSI is also what the PowerShell engine uses when it reads source code"); [win7x] f3 measured it. | **True of 5.1 only.** 7.4.7 and 7.6.6 on a cp1252 Windows host decode a BOM-less UTF-8 source, `Get-Content -Raw` and `Import-Module` as UTF-8 (R12). PS-ENC-01 stays 5.1-bound; PS-ENC-06 is confirmed on Windows, not just Linux. |

### PS-COMPAT - targets, syntax and runtime differences

**PS-COMPAT-01 (MUST)** Declare the target with an exact `#Requires` line: `#Requires -Version 5.1` in installers, bootstrap and anything `irm | iex` or `powershell -File` runs on stock Windows; `#Requires -Version 7.6` in repo, dev, CI and Pester scripts; never `7.0`, `7.4` or `7.5` as a floor. A script that `iex` delivers also tests `$PSVersionTable.PSVersion` in code.
- Why: on 5.1 `#Requires` wins over parse errors, so a mis-launched 7-only script says "requires PowerShell 7.6" instead of "Unexpected token '&&'"; `iex` ignores it ([compat] §1, §10); 7.4 and 7.5 end 2026-11-10 ([compat] §11).
- Check: `grep -rL -x -e '#Requires -Version 5.1' --include='*.ps1' .` (installer dir); `grep -rL -x -e '#Requires -Version 7.6' --include='*.ps1' .` (repo-script dir); stale floors `grep -rn -e '#Requires -Version 7.0' -e '#Requires -Version 7.4' -e '#Requires -Version 7.5' --include='*.ps1' .`. The in-code guard is a named reading heuristic (www-setup `src/install.ps1:731`).
- Watched: yes, [compat] V11, V15, V16 (V16 on the real fleet copies lists `grimoire-install.ps1` and `setup-grimoire-install.ps1`, passes `www-setup-install.ps1`); `#Requires` behaviour in fixture `req/`.
- Scope: all PowerShell; the 5.1 form for the installer kind, 7.6 for script/test kinds; modules PS-COMPAT-08.

**PS-COMPAT-02 (MUST)** Keep 7-only syntax out of 5.1-bound files: `&&`, `||`, `?:`, `??`, `??=`, `${x}?.m`, `${x}?[i]`, a pipeline continued by a leading `|` on the next line, a trailing `&`, and a `clean {}` block. The check of record is `Parser::ParseFile` on Windows PowerShell 5.1.
- Why: one such line makes the whole file unrunnable on 5.1 and nothing before it runs ([compat] §2).
- Check: `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File parse-gate.ps1 src` (prints `file:line:col: message [ErrorId]`, exit 1 on any error; run it under `powershell.exe`, a pwsh run passes the same plants). Static fallback when no 5.1 host exists: PSSA `PSUseCompatibleSyntax` with `TargetVersions = @('5.1')` (sees `&&`, `||`, `??`, `??=`, ternary, `${x}?.m`; blind to the other four), plus `grep -rnE -e '^[^#]* && ' -e '^[^#]* [|][|] ' --include='*.ps1' --include='*.psm1' .`, `grep -rnE -e '^[[:space:]]*clean[[:space:]]*[{]' --include='*.ps1' --include='*.psm1' .`, `grep -rnE -e '^[^#"]*[^&"]&[[:space:]]*$' --include='*.ps1' --include='*.psm1' .` ([gate] C1, C16, C17) and the new `grep -rnE -e '^[[:space:]]*[|]($|[^|])' --include='*.ps1' --include='*.psm1' .` (leading pipe; hits inside here-strings are review leads).
- Watched: yes. [compat] V1 (11 of 23 plants red on 5.1, 0 of 22 twins; all parse on 7.4.7 and 7.6.6), [gate] run 6 (6 plants exit 1 on 5.1; the same plants exit 0 on pwsh 7.6.6), R2 (leading-pipe grep red/green; PSSA@5.1 gate exit 0 on the plant).
- Scope: 5.1-bound files (installer kind, module kind). Files carrying `#Requires -Version 7.x` are excluded from the 5.1 parse (PS-GATE-04).

**PS-COMPAT-03 (MUST)** Never write `$o?.Name` or `$a?[0]` with an unbraced variable; write `${o}?.Name` in 7.6-only code and `if ($null -ne $o) { $o.Name }` in 5.1-bound code.
- Why: `?` is a legal variable-name character, so `$o?.Name` reads the variable `$o?` and silently yields nothing on 5.1, 7.4 and 7.6: no parse error, no PSSA finding ([compat] §4; about_Operators).
- Check: AST check D1 (`denylist-51.ps1`, prints `file:line D1`); fallback `grep -rnE -e '^[^#]*[$][[:alnum:]_]+[?][.[]' --include='*.ps1' --include='*.psm1' .`.
- Watched: yes. [compat] V5 (`d1.ps1:2`, twin `g1.ps1` clean), [gate] C4a.
- Scope: all PowerShell.

**PS-COMPAT-04 (MUST)** Detect the platform in 5.1-bound code with `[Environment]::OSVersion.Platform -eq 'Win32NT'`. Do not read `$IsWindows`, `$IsLinux`, `$IsMacOS`, `$IsCoreCLR` or `$PSVersionTable.Platform` / `.OS` there, except `$PSVersionTable.PSEdition -eq 'Desktop' -or $IsWindows` with the edition test first.
- Why: the variables do not exist on 5.1; a lax read is empty, under `Set-StrictMode` it is an error, and the operand order decides whether it is ever evaluated ([compat] §4, R1).
- Check: AST D2 and D5 (order-aware; `denylist-51.ps1`). The grep `grep -rnP -e '^(?!.*PSEdition)[^#]*[$]Is[WLMC][A-Za-z]+' --include='*.ps1' --include='*.psm1' .` ([gate] C5) is order-blind and accepts the reversed form: fallback only.
- Watched: yes. [compat] V5 (`d2.ps1:1`, `d5.ps1:1`; twin passes); R1 (D2 red on `rev.ps1` and green on `fwd.ps1`; 5.1 run red and green; C5 misses `rev.ps1`).
- Scope: 5.1-bound; 7.6-only code may use `$IsWindows` freely.

**PS-COMPAT-05 (MUST)** Do not use commands, parameters or .NET members that 5.1 lacks in 5.1-bound code: `Join-Path` with more than two parts or `-AdditionalChildPath`, `ConvertFrom-Json -AsHashtable`, `Test-Json`, `ForEach-Object -Parallel`, `Get-Content -AsByteStream`, `Join-String`, `Get-Error`, `ConvertTo-CliXml`, `Invoke-WebRequest -MaximumRetryCount / -RetryIntervalSec / -SkipHttpErrorCheck / -SkipCertificateCheck`, `[Convert]::ToHexString`, `[IO.Path]::GetRelativePath`, `[Math]::Clamp`; and `"1111p2222q3333".Split('pq')` (3 parts on 5.1, 1 on 7).
- Why: runtime-only failures on code paths CI may never run on 5.1 ([compat] §2, §6; `[Math]::Clamp` "does not contain a method named 'Clamp'" on .NET Framework 4.8, [win7x] f6).
- Check (grouped by what each sees): AST D3 for `Join-Path`; `grep -rn -e '-AsHashtable' -e '-AsByteStream' -e '-Parallel' -e 'Join-String' -e 'Test-Json' -e 'Get-Error' -e '-SkipHttpErrorCheck' -e '-AsArray' --include='*.ps1' --include='*.psm1' .` ([gate] C10); PSSA `PSUseCompatibleCommands` + `PSUseCompatibleTypes` with profile `win-48_x64_10.0.17763.0_5.1.17763.316_x64_4.0.30319.42000_framework` (advisory: caught 9 of 11 runtime-only plants, misses post-7.0 commands such as `ConvertTo-CliXml` and .NET static members, false-positives on abbreviations and aliases, [gate] §5); hallucinated or 7-only command and parameter names PS-GATE-06 (advisory, blind to .NET members and parameter values); the authority is a smoke run of the script's dry or help path under `matrix.sh pwsh <script>` (5.1 row non-zero is the violation).
- Watched: yes. [compat] V3 (exit 11 on plants, 0 on twins; blind spots named), V5 (`d3.ps1:1,2`), [gate] C10, smoke runs `post70-cmd.ps1`, `dotnet-core-only.ps1`, `testjson.ps1`; R15 (`plants/miss`: `net-api.ps1`, `net-clamp.ps1`, `bad-value.ps1` each throw on 5.1 while the resolver exits 0, `ok.ps1` prints `ok`; a recorded non-red for the resolver, so the smoke run stays the authority for .NET members).
- Scope: 5.1-bound. `-Encoding utf8NoBOM|utf8BOM|ansi` is PS-ENC-03.

**PS-COMPAT-06 (MUST)** Pass `-UseBasicParsing` to every `Invoke-WebRequest` / `iwr` in 5.1-bound code, or set `$PSDefaultParameterValues['Invoke-WebRequest:UseBasicParsing'] = $true` before the first call. `Invoke-RestMethod` and `-OutFile`-only downloads need nothing.
- Why: since the 2025-12-09 update (CVE-2025-54100) a 5.1 call that parses the response prompts, then exits 1 under `-NonInteractive` and throws `NullReferenceException` with closed stdin; 7.x ignores the switch ([compat] §5, KB5074596). `Invoke-RestMethod` and `-OutFile` alone were unaffected on build 5.1.26100.9444; `-OutFile -PassThru` is affected.
- Check: AST D7 (handles splatting and the `PSDefaultParameterValues` form); coarse `grep -rlZ -i -e 'Invoke-WebRequest' -e '\biwr\b' --include='*.ps1' . | xargs -r -0 grep -L -i -e 'UseBasicParsing'` (xargs exits 123 even on a hit; judge by output; a comment mentioning the switch evades it).
- Watched: yes. [compat] V5 (`d7.ps1:1,2`), V9, V10; R5 (5.1 exit 1 on the plant, 0 on the twin; 7.4.7/7.6.6 0 on both).
- Scope: 5.1-bound. Re-measure after later cumulative updates; `irm` is exempt only as of KB5129195 (2026-09-15).

**PS-COMPAT-07 (SHOULD)** Load the zip assembly before use: `Add-Type -AssemblyName System.IO.Compression.FileSystem` before `[System.IO.Compression.ZipFile]` in 5.1-bound code.
- Why: "Unable to find type" on 5.1 ([compat] §6); loud, so SHOULD.
- Check: `grep -rlZ -e 'IO.Compression.ZipFile' --include='*.ps1' . | xargs -r -0 grep -L -e 'Add-Type -AssemblyName System.IO.Compression.FileSystem'`. Watched: yes, [compat] V17.
- Scope: 5.1-bound.

**PS-COMPAT-08 (SHOULD)** Modules set `PowerShellVersion = '5.1'` and `CompatiblePSEditions = @('Desktop','Core')`, and CI runs `Import-Module` on a real 5.1 and on 7.6; `Test-ModuleManifest` is not a gate and `CompatiblePSEditions` is documentation, not enforcement.
- Why: `Test-ModuleManifest` passed a `.psm1` containing `??` that 5.1 rejects; a Core-only manifest imported on 5.1 ([compat] §10, [gate] §9.1).
- Check: `powershell -NoProfile -NonInteractive -File check-modules.ps1` (exit = failing imports). Watched: yes, [compat] V12 (5.1 exit 1 on `modbad`, 7.6 exit 0 on the same plant, `modgood` passes both), [gate] `mod/`.
- Scope: shared or published modules; the fleet has two test-helper `.psm1` only.

**PS-COMPAT-09 (SHOULD)** Set TLS explicitly in 5.1-bound downloaders (`SecurityProtocol -bor Tls12`) and add `Tls13` only after `[enum]::GetNames([Net.SecurityProtocolType]) -contains 'Tls13'`.
- Why: `SystemDefault` already negotiates TLS 1.2+ on the measured .NET 4.8 build; older .NET Framework settings are unverified: read only ([compat] §6).
- Check: reading heuristic (www-setup `src/install.ps1:337,355`). Watched: no (older .NET not measurable). PS-SEC owns the downloader rules (M-U-03).
- Scope: 5.1-bound downloaders.

**PS-COMPAT-10 (CONSIDER)** Put `Set-StrictMode -Version Latest` at the top of each script; it behaves identically on 5.1, 7.4.7 and 7.6.6 (eight probes; Latest equals 3.0).
- Check: `grep -rL -e 'Set-StrictMode -Version Latest' --include='*.ps1' .` (not watched; parity run `strict/strict-levels.ps1` only, [compat] §4). Fleet: 2 of 13 authored files ([fleet] Axis 7).

### PS-ENC - encoding (carried)

**PS-ENC-01 (MUST)** Keep 5.1-bound `.ps1`, `.psm1` and `.psd1` files ASCII-only (code, strings, help and comments): no byte above 0x7F. Build non-ASCII text from `[char]0xNNNN`. The one exception is unavoidable localised module data: UTF-8 with BOM, loaded by `-File` or import, never `iex`-served and never a shebang script.
- Why: 5.1 reads a BOM-less UTF-8 file as cp1252 ("café" has length 5); an em dash in a double-quoted string decodes to `â€”` whose last character U+201D closes the string, so the file fails to parse; `irm | iex` decoding depends on the server's Content-Type charset (`raw.githubusercontent.com` and `setup.ocx.sh/pwsh` send `charset=utf-8`; `community.chocolatey.org/install.ps1` sends bare `text/plain` and `grimoire.rs/install.ps1` sends `application/octet-stream`, which decode as ISO-8859-1, length 5) ([compat] §7). The hazard is a 5.1 property: 7.4.7 and 7.6.6 on the same cp1252 Windows host read the same BOM-less file as UTF-8 (length 4, R12), but the seven curly quote characters are quote tokens on every engine (PS-ENC-08).
- Check: `grep -rl -P -e '[^\x00-\x7F]' --include='*.ps1' --include='*.psm1' --include='*.psd1' .`.
- Watched: yes, [compat] V6 (3 plant files listed, twin empty); R12 (5.1 `dq-nobom` length 6, 7.4.7/7.6.6 length 4).
- Scope: 5.1-bound; 7.6-only files see PS-ENC-06 and PS-ENC-08. cp932/936/949 hosts unverified: read only.

**PS-ENC-02 (MUST)** Put no BOM (EF BB BF) on a `.ps1` that `irm | iex` fetches or that starts with `#!`, and never add one to silence `PSUseBOMForUnicodeEncodedFile`; remove the non-ASCII instead.
- Why: `irm` keeps U+FEFF so `iex` reports `?$s` / `U+FEFF$s` not recognised on 5.1, 7.4 and 7.6 ([compat] §7), and `Invoke-Expression ([char]0xFEFF + 'Write-Output ok')` fails with "The term '?Write-Output' is not recognized" on 5.1.26100.9444, 7.4.7 and 7.6.6 on Windows too (R14); a BOM before the shebang exits 127 (R4).
- Check: `LC_ALL=C grep -rl -P -e '^\xEF\xBB\xBF' --include='*.ps1' .`.
- Watched: yes, [compat] V7, V8 (PSSA agrees on the BOM-less plants); R4 (BOM'd shebang script: exit 127; the grep lists it); R14 (`iex-bom.ps1`: no-BOM `ok`, U+FEFF prefix error, on all three Windows engines).
- Scope: all PowerShell.

**PS-ENC-03 (MUST)** In 5.1-bound code write text files only with `[IO.File]::WriteAllText($p, $t, (New-Object System.Text.UTF8Encoding $false))` / `AppendAllText`, or `-Encoding ascii` for data that is ASCII by construction. Never `>`, `>>`, `Out-File`, `Tee-Object`, `Set-Content`, `Add-Content`, `Export-Csv` without `-Encoding ascii`; never `-Encoding utf8` (BOM on 5.1; the one exception is `Out-File -Encoding utf8 -Append` onto a runner env file, PS-ENC-10), `utf8NoBOM`, `utf8BOM`, `ansi` or a numeric or named code page such as `1252` (all rejected by the 5.1 ValidateSet `unknown,string,unicode,bigendianunicode,utf8,utf7,utf32,ascii,default,oem`); never pass `[Text.Encoding]::UTF8` to a writer (it carries a BOM on every engine). Do not infer 7.x bytes from 7.x defaults; locale-dependent names are PS-ENC-07.
- Why: 5.1 bytes depend on the cmdlet: `>`/`Out-File`/`Tee-Object` UTF-16LE+BOM, `Set-Content`/`Add-Content` cp1252 (a CJK character becomes `?`), `-Encoding utf8` BOM, `Export-Csv` ASCII, `Out-File -Append` onto a UTF-8 file appends UTF-16LE into it. 7.4.7 and 7.6.6 write UTF-8 without BOM for all of those when no `-Encoding` is given and for `-Encoding utf8` (also `Export-Clixml` and `New-ModuleManifest`, byte-identical on both versions), but not for every name: `unicode` and `utf32` keep their BOM, `utf8BOM` writes one, `ansi` is cp1252, `oem` is cp437 on Windows (UTF-8 on Linux), `-Encoding default` is UTF-8 on 7.x Windows (cp1252 on 5.1), and `[Text.Encoding]::UTF8` has a BOM ([compat] §8, V14; [win7x] f2, R12; 106 corpus uses of `utf8NoBOM`, [ex] axis 7).
- Check: AST D6 and D4 (`denylist-51.ps1`; D6 carries the PS-ENC-10 carve-out, prototype `denylist-51-rev2.ps1`); bytes check `pwsh -File bytes-check.ps1 <files written>` (exit = files that are not BOM-free valid UTF-8); `grep -rniE -e '-Encoding[ :]+.?utf8NoBOM\b' -e '-Encoding[ :]+.?utf8BOM\b' -e '-Encoding[ :]+.?ansi\b' --include='*.ps1' --include='*.psm1' .` over 5.1-bound directories ([win7x] V7); review lead `grep -rnE -e '(WriteAllText|AppendAllText|WriteAllLines)[^;]*\[(System\.)?Text\.Encoding\]::UTF8\b' --include='*.ps1' --include='*.psm1' .`. The greps `Out-File|Set-Content|Add-Content(?!.*-Encoding)` ([gate] C9a-c) are fallback: they pass `-Encoding utf8` and do not see `>` (R7).
- Watched: yes. [compat] V5 (`d6.ps1:1-4`), V13 (4 plant files red exit 4, 3 twins green); R7 (grep passes `-Encoding utf8`, D6 flags it, 5.1 wrote `ef bb bf 78 0d 0a`); R9 (unmodified D6 flags the PS-ENC-10 form, the carve-out does not and still flags `Out-File -Encoding utf8 -Append C:\work\notes.txt`); R12 (writer bytes on 5.1, 7.4.7, 7.6.6); R13 (the V7 grep red on `verify/valset/bad` and `plants/miss/bad-value.ps1`, empty on the twin; the BOM-writer review lead red on `bomenc/bad`, empty on `bomenc/good`).
- Scope: 5.1-bound. Runner env files (`$GITHUB_ENV`, `$GITHUB_PATH`, `$GITHUB_OUTPUT`, `$GITHUB_STATE`) are PS-ENC-10.

**PS-ENC-04 (SHOULD)** Pass the encoding explicitly when reading a file whose producer is not this script: `Get-Content -Encoding UTF8` or `[IO.File]::ReadAllText` for UTF-8 data, and the legacy encoding named per PS-ENC-07 for legacy input. Bare `Get-Content` decodes ANSI on 5.1 and UTF-8 on 7.x, so the hazard runs both ways.
- Why: a BOM-less UTF-8 file reads `00c3 00a9` for `é` on 5.1 and `00e9` on 7.x; a cp1252 file (what 5.1 `Set-Content` writes) reads `00e9` on 5.1 and U+FFFD on 7.x, through `Get-Content` and `ReadAllText` alike ([compat] §7; [win7x] f5, `read-legacy.ps1`, R14).
- Check: reading heuristic; `grep -rnP -e 'Get-Content(?!.*-Encoding)' --include='*.ps1' --include='*.psm1' .` lists every bare read (including ASCII-only inputs: review leads, not violations). Watched: yes for the grep ([win7x] V6: `verify/read/bad/bare.ps1` listed, `explicit.ps1` empty, R13) and for the behaviour (`rd/read-enc.ps1`: length 5 vs 4, [compat] §7; R14 rows on 5.1, 7.4.7, 7.6.6). Scope: any engine; the 5.1 and 7.x halves matter when a file crosses editions.

**PS-ENC-05 (SHOULD)** On Windows keep text that crosses a native pipe or the console ASCII; where UTF-8 must pass, set `[Console]::OutputEncoding` to `New-Object System.Text.UTF8Encoding $false` around the call on every engine, and on 5.1 also `$OutputEncoding`, then restore both. On 7.x `$OutputEncoding` is already UTF-8 and only governs what is written to the child's stdin; it does nothing for decoding the child's output. Never decode a PowerShell or native child's stdout as UTF-8 (5.1 or 7.x, Windows) unless the child set the console encoding.
- Why: on 5.1 `$OutputEncoding` is `us-ascii` (é becomes `?`) and the console is IBM437; on 7.4.7 and 7.6.6 Windows `$OutputEncoding` is UTF-8 but `[Console]::OutputEncoding` is still the OEM code page (cp437 here), so a native child's UTF-8 stdout decodes as mojibake (`len=8` against `len=5` with the console set) on all three engines, and a redirected `pwsh.exe` or `powershell.exe` stdout carries OEM bytes (`0x81` for ü on 5.1, 7.4.7 and 7.6.6 alike; UTF-8 `c3 bc` once the console encoding is set). The assignment is console-wide and outlives the process that made it: the next processes on that console emit UTF-8 as well unless it is restored, which is why the rule restores it (R16 `redir-stdout.ps1`: default `81` x3, set-and-restored `c3 bc` then `81` again, set-and-leaked `c3 bc` for the following default row) ([compat] §9; [win7x] f1, f4, R12, R16). Linux 7.6.6 is UTF-8 throughout ([compat] §9). Fleet defect: ocx `crates/ocx_setup/src/profiles.rs:207` applies `from_utf8_lossy` to the stdout of `pwsh`, then `powershell`, so a non-ASCII `$PROFILE` path is wrong with either host installed (Applied to the fleet; [compat] §12.1 saw only the 5.1 fallback).
- Check: `matrix.sh win nat/native-enc.ps1` (`len=5` / `3f` before, `c3 a9` after) and `./winrun.sh all native-enc.ps1` for the 7.x rows (decoded length 8 default, 5 with the console set); messages by the PS-ENC-01 grep. Watched: yes (behaviour, `nat/native-enc.ps1`, `nat/stdout-enc.ps1`; R16: `native-enc.ps1` on 5.1, 7.4.7, 7.6.6 and the redirected-stdout bytes). Mirrors rust cli-contract CLI-12. Interactive consoles are unmeasured (Verdict 11).
- Scope: Windows, any engine; 5.1-bound code keeps messages ASCII.

**PS-ENC-06 (SHOULD)** 7.6-only scripts may be UTF-8 without BOM; their PSSA settings exclude `PSUseBOMForUnicodeEncodedFile` with a reason comment, and the installer and module settings keep it on.
- Why: the rule is always on and contradicts Microsoft's "avoid BOMs" for Unix-visible files; the agent's usual fix breaks `#!` scripts (R4; [compat] §3). Confirmed on Windows: 7.4.7 and 7.6.6 on a cp1252 host decode a BOM-less UTF-8 `.ps1`, `Get-Content -Raw` and `Import-Module` as UTF-8 (`dq-nobom` length 4; 5.1 length 6, R12). One caveat: the file is correctly decoded and still changes meaning if a seven-character quote token sits in code (PS-ENC-08).
- Check: `Invoke-PSGate.ps1 -Path bom/bad -Settings script.psd1` red (Warning `PSUseBOMForUnicodeEncodedFile`), green with the exclusion (R4); placement of the exclusion is a reading heuristic; `./winrun.sh all read-nobom.ps1` for the decoding. Watched: yes (R4, R12), placement no.
- Scope: script and test kinds only.

**PS-ENC-07 (MUST)** Never pass a locale-dependent encoding: `-Encoding Default`, `-Encoding OEM`, `-Encoding ANSI`, `[Text.Encoding]::Default`. Name it: `ascii`, `utf8` as PS-ENC-03 allows, or `New-Object System.Text.UTF8Encoding $false`. At a boundary with a legacy consumer that needs cp437 or cp1252 use `[Text.Encoding]::GetEncoding(437)` or `GetEncoding(1252)` with a comment naming the consumer.
- Why: the same source writes different bytes by engine and machine. `Default` is cp1252 on 5.1 and UTF-8 without BOM on 7.4.7 and 7.6.6 (and is absent from the 7.6 documented value list); `[Text.Encoding]::Default` likewise (`Windows-1252` on 5.1, `utf-8` on 7.x); `ANSI` is rejected on 5.1 and is cp1252 on 7.4+; `OEM` follows the system OEM code page (437 here), not the console's (`chcp 850` left `4f ec 82` unchanged) and not the culture's OEM (850), identically on 5.1, 7.4.7 and 7.6.6 Windows, while Linux 7.6.6 writes UTF-8 ([win7x] f1, f2, f3, N2; [compat] V14).
- Check: `grep -rniE -e '-Encoding[ :]+.?default\b' -e '-Encoding[ :]+.?oem\b' -e '-Encoding[ :]+.?ansi\b' -e '\[(System\.)?Text\.Encoding\]::Default\b' --include='*.ps1' --include='*.psm1' .` (output = sites; a site whose comment names the consumer is the exception, read each; it misses abbreviated parameter names such as `-Enc` and a splatted `Encoding` key).
- Watched: yes. R13: V1 red on `verify/locale/bad` (`ansi.ps1 default.ps1 oem.ps1`), empty on `good`; the `[Text.Encoding]::Default` alternative is this revision's addition, red on `locale2/bad` (adds `dotnet-default.ps1`), empty on `locale2/good`. R12 (the `ANSI=` probe line and the `oem` bytes on three engines).
- Scope: all PowerShell. Corpus: 2 hits, `ScoopInstaller/Scoop@e6aa3b366bde:supporting/validator/build.ps1:24-25` writes checksum files with `-Encoding oem` (ASCII hex plus names: a named-consumer boundary that would take the comment). Fleet: 0 of 14 files.

**PS-ENC-08 (MUST)** Keep U+2018, U+2019, U+201A, U+201B, U+201C, U+201D and U+201E out of code positions of every `.ps1` and `.psm1`, 7.6-only files included. Non-ASCII is allowed in comments and in strings that contain none of the seven.
- Why: the tokenizer treats all seven as quote characters (four single, three double) on 5.1, 7.4.7 and 7.6.6. With a correct UTF-8 decode `Write-Output "He said “hi” ok"` silently yields two outputs on 7.4.7 and 7.6.6 and no parse error, and `'it’s'` is a parse error; chat and word-processor output produces them ([win7x] f3, N5, about_Quoting_Rules; SH-EMIT-03 owns the emitter side of the same nine-character class).
- Check: `LC_ALL=C grep -rlP -e '\xE2\x80[\x98-\x9E]' --include='*.ps1' --include='*.psm1' .` (lists comment and help-block hits too: read them).
- Watched: yes. R13: V2 red on `curly/bad` (`dq-curly-silent.ps1 sq-nobom.ps1`), empty on `curly/good/ok.ps1` (café in a comment, an ASCII apostrophe); R12 (the tokenizer probe lists exactly these seven on all three Windows engines).
- Scope: all PowerShell. Fleet: 0 of 14 `.ps1`/`.psm1` files in www-setup, setup-grimoire, grimoire and ocx (their 9 non-ASCII files carry only U+2014 in comments). Corpus: 4 of 1,327 files in 3 repos, all deliberate tests or help prose (`pester/Pester@98e56d65da16:tst/functions/Mock.Tests.ps1:2294,2298,2314,2315`).

**PS-ENC-09 (SHOULD)** To save a native command's stdout to a file, use `child > file` only on 7.4+, or `cmd /c "child > file"` on any engine; never `child | Out-File` or `child | Set-Content`.
- Why: `>` of a native command is byte-preserving on 7.4+ (UTF-8 `63 61 66 c3 a9 e2 80 99` arrive as written) but writes UTF-16LE mojibake on 5.1; the pipeline forms decode the child's bytes with the console code page first and write the mojibake (7.4.7 and 7.6.6 `e2 94 9c e2 8c 90 ...`), so `Out-File` and `Set-Content` are not covered by the 7.4 byte-stream change ([win7x] f4, N10; about_Redirection 7.6).
- Check: reading heuristic for call sites (no grep); behaviour `./winrun.sh all native-to-file.ps1`. Watched: behaviour yes (R16: `native-to-file.ps1` on 5.1, 7.4.7, 7.6.6, rows `>`, `| Out-File`, `| Set-Content`, `cmd /c`), call-site detection no.
- Scope: Windows, any engine.

**PS-ENC-10 (MUST)** In code that can run under Windows PowerShell 5.1, write `$GITHUB_ENV`, `$GITHUB_PATH`, `$GITHUB_OUTPUT` and `$GITHUB_STATE` with exactly one of two writers: `[IO.File]::AppendAllText($env:GITHUB_ENV, "NAME=value`n", (New-Object System.Text.UTF8Encoding $false))` (the default: no BOM, one writer for every runner) or `"NAME=value" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append`. Never `>>`, `Out-File` without `-Encoding utf8`, `-Encoding unicode` or `Add-Content`, and never mix either safe writer with a banned one on one file. On pwsh 7.x `>>` is also safe.
- Why: the runner creates each step's env files empty and reads `GITHUB_PATH` with `File.ReadAllLines(path, Encoding.UTF8)` and `GITHUB_ENV`/`OUTPUT`/`STATE` with `File.ReadAllText`; both detect a BOM. Both safe writers decode correctly alone and mixed in either order, because `Out-File -Encoding utf8` writes its BOM only into an empty file. Of 21 writer sequences on 5.1, 7 corrupt the file and each contains a banned writer: `>>` with `Out-File -Encoding utf8` in either order, `AppendAllText` then `Add-Content`, `>>` or `Out-File` without `-Encoding`, `Add-Content` twice (the second value carries `é`, which cp1252 reads back as U+FFFD), `Add-Content` then `>>`. A lone `>>` decodes (UTF-16LE with BOM) and `Add-Content` is safe only while every value is ASCII, which an agent does not control (`C:\Users\Jürgen\bin`). On pwsh 7.4.7 and 7.6.6 all 21 decode ([win7x] f8, N4; runner `FileCommandManager.cs`@67f01c276e0a:56,138,369).
- Check: `grep -rnE --include='*.ps1' --include='*.yml' --include='*.yaml' -e '>>[[:space:]]*"?[$]env:GITHUB_[A-Z]+' -e 'Add-Content.*GITHUB_[A-Z]+' .` (the first alternative also matches `>>` in `shell: pwsh` steps: read the step's shell) and `grep -rnP --include='*.ps1' --include='*.yml' --include='*.yaml' -e 'Out-File(?!.*-Encoding[ ]+utf8).*GITHUB_[A-Z]+' .`; behaviour `bash writer-matrix.sh` over `runner-writer-check.ps1`. The AST check D6 flags the accepted `Out-File` form unless it carries the carve-out (R9).
- Watched: yes. R11 (21 sequences x {5.1, 7.6.6 Windows}: 7 red rows on 5.1, 0 on 7.6.6, identical to [win7x]'s run); R13 (V3a, V3b: `runnerw/bad` red on `addcontent.ps1 redirect.ps1 step.yml` and on `outfile-noenc.ps1 outfile-unicode.ps1`, `runnerw/good` empty with `AppendAllText` and `Out-File -Encoding utf8`, parameters reordered); R9 (the D6 carve-out). Both readers are emulated from runner source over a runner-shaped empty file, not observed on a hosted job (Verdict 11).
- Scope: 5.1-capable code: installers, `shell: powershell` steps, a `.ps1` started by `powershell.exe`; the workflow-step side is SH-CI-11 (`shell-ci.md`), which must be edited to name both writers (hand-off, not applied here). Fleet: `www-setup@a251c3631047:src/install.ps1:721` (Applied to the fleet).

### PS-ERR - error model

**PS-ERR-01 (MUST)** Check the exit status of every native command whose failure matters: call it through `Invoke-Native` (set `$global:LASTEXITCODE = $null`, run `& $exe @argv`, `if ($LASTEXITCODE -ne 0) { throw }`) or test `$LASTEXITCODE` inline. `$ErrorActionPreference = 'Stop'` is not an exit-code check. Never read `$LASTEXITCODE` after a cmdlet or inside a `catch`.
- Why: Stop does not stop on a native exit code on 5.1, 7.4.7 and 7.6.6, on Linux and Windows (5 of 5 rows, "reached", exit 0); a failing cmdlet leaves the previous native's code; after a 5.1 `RemoteException` the code is -1; `$null -ne 0` makes the helper fail closed for a native that never started ([err] f1, f3, f4).
- Check: behavioural `matrix.sh pwsh native-mid.ps1` must not print `reached` (red on all engines); twin `native-mid-fn.ps1` exits 1. Static: `grep -rL --include='*.ps1' -e 'LASTEXITCODE' -e 'Invoke-Native' . | xargs -r grep -l -e '^[[:space:]]*&[[:space:]]' -e '^[[:space:]]*tar[[:space:]]' -e '^[[:space:]]*git[[:space:]]'` (add the repo's tool names as `-e`; file-level heuristic: a file that checks one of three natives passes). PSSA has no rule for this (0 findings on the plant, [err] f13).
- Watched: yes. [err] V1, V3 (`native-idiom.ps1` 5 engine rows), `run-checks.out` N1; R6 (native-mid red on 7.4.7, 7.6.6, 5.1; fn twin exit 1 on all).
- Scope: all PowerShell; the idiom must work on 5.1.

**PS-ERR-02 (MUST)** Never rely on `$PSNativeCommandUseErrorActionPreference = $true` in a script that can run on 5.1 (installers, `shell: powershell` blocks, `#Requires -Version 5.1`).
- Why: on 5.1 the assignment creates an ordinary variable and the script prints `reached`, exit 0 (R6; [err] f2); on 7.4+ it also makes `if (native)` and `native | Out-Null` throw under Stop.
- Check: `grep -rn --include='*.ps1' -e 'PSNativeCommandUseErrorActionPreference' .` and read each hit: it must sit in a `#Requires -Version 7.6` file; behavioural `matrix.sh pwsh native-mid-pref.ps1` (5.1 row `reached`/exit 0 red; 7.x exit 1).
- Watched: yes for behaviour ([err] V2, R6); the grep is a named reading heuristic. Fleet: 0 uses ([err] f7).
- Scope: 5.1-capable code.

**PS-ERR-03 (MUST)** In a `shell: pwsh` or `shell: powershell` `run:` step (and any composite-action step) with two or more native commands, check each native (PS-ERR-01), or on pwsh 7.x set `$PSNativeCommandUseErrorActionPreference = $true` first, scoping it to `$false` inside `& { }` for tools whose non-zero code is information (robocopy). A custom `shell: pwsh -File {0}` removes the runner's prelude and epilogue, so that script sets Stop and exits itself.
- Why: the runner prepends `$ErrorActionPreference = 'stop'` and appends `if (Test-Path variable:\LASTEXITCODE) { exit $LASTEXITCODE }`, so the last native wins: build(fail) then test(ok) is step exit 0 on every engine ([err] f6; runner `ScriptHandlerHelpers.cs:16-17,62-65`, [plat] §2.2-2.3).
- Check: `python3 pwsh-run-lint.py .` (prints every explicit pwsh/powershell step with 2+ native lines and no guard; output = violation; Windows default-shell blocks need the classification in `fleet-chase2.py`); behavioural `gha-sim.ps1`.
- Watched: yes. [err] V6, `run-checks.out` W1 (`wf-red` listed, `wf-twin` empty). Fleet: 1 hit.
- Scope: CI steps; the preference alternative is pwsh 7.6 only.

**PS-ERR-04 (SHOULD)** End an entry-point script run by `-File` on an explicit status: a top-level `try { Main } catch { [Console]::Error.WriteLine($_); exit 1 }`, and `exit $LASTEXITCODE` where the last native's code is the result. Callers that need the exact code use `-File`, not `-Command` or the built-in GHA shell.
- Why: `-File` returns 0 when the script merely ends after a failed native; `-Command` and the GHA wrapper collapse every non-zero to 1 (`exit 7` becomes 1) ([err] f5).
- Check: `matrix.sh pwsh exitcodes.ps1` (row `native-fail-LAST` 0/0/0 red; `check+exit-LASTEXITCODE` 3/1/1); review: the last statement of the entry point is a native call. Watched: yes (behaviour, 5.1, 7.4.7, 7.6.6, Windows 7.6.6).
- Scope: entry points.

**PS-ERR-05 (MUST)** Never call `exit` in a script delivered by `irm | iex` or `[scriptblock]::Create`. Compute `$IsIex = ($null -eq $MyInvocation.MyCommand.Path)` at script scope (not inside a function); when true use `return` at top level or `$Global:LASTEXITCODE = $code; break` from a function, else `exit $code`.
- Why: `exit` terminates the caller's shell on 5.1, 7.4.7, 7.6.6 (R8: `HOST-KILLED proc-exit=5` on every engine, twins `host-survived`) ([err] f8, [inst] 3f `p7`).
- Check: `grep -rl --include='*.ps1' -w -e 'iex' . | xargs -r grep -l -w -e 'irm' -e 'Invoke-RestMethod' | xargs -r grep -L -e 'MyInvocation.MyCommand.Path' | xargs -r grep -l -w -e 'exit'` (output = iex installers that exit and never detect delivery); behavioural `matrix.sh pwsh iex-exit.ps1`.
- Watched: yes. [err] V7, `run-checks.out` I1 (`red-exit.ps1` listed; `twin-flag.ps1`, `twin-return.ps1`, `not-iex.ps1` not); R8. Fleet: `www-setup/src/install.ps1` is a true positive.
- Scope: iex-delivered installers and bootstrap.

**PS-ERR-06 (MUST)** In code that can run on 5.1, never redirect a native's stderr inside PowerShell (`2>&1`, `2>$null`, `*>&1`, `*>$null`) while `$ErrorActionPreference` is `Stop`; wrap the call in a scoped `Continue` with try/finally, or redirect in the child shell (`cmd /c "x 2>&1"`).
- Why: 5.1 throws `RemoteException` on the first stderr byte (git and tar progress) and loses the exit code; 7.2+ does not ([err] f4).
- Check: `grep -rl --include='*.ps1' -e "ErrorActionPreference = 'Stop'" . | xargs -r grep -L -e "ErrorActionPreference = 'Continue'" | xargs -r grep -n -H -e '2>&1' -e '2>$null' -e '*>&1' -e '*>$null'` (output = sites to read); behavioural `matrix.sh pwsh stderr-red.ps1` (exit 1 on the 5.1 row only) vs `stderr-twin.ps1` (0 on all).
- Watched: yes, [err] V4, `run-checks.out` S1 (`red.ps1:2,3` listed, twin not).
- Scope: 5.1-capable code.

**PS-ERR-07 (SHOULD)** `try/catch` sees only terminating errors: put `-ErrorAction Stop` on each cmdlet inside a `try` or set Stop at the top; no empty `catch {}`; report with `[Console]::Error.WriteLine(...)` then `exit`, not `Write-Error; exit` (`Write-Error` under Stop terminates first, so the exit code is 1 and the message a stack trace).
- Check: `Invoke-ScriptAnalyzer -Path . -Recurse -IncludeRule PSAvoidUsingEmptyCatchBlock` (default Warning); behavioural `trycatch.ps1`. Watched: yes ([err] V11, `checks/catch/red.ps1:1`). Scope: all PowerShell.

**PS-ERR-08 (MUST)** Stream discipline: a function returns data only through `Write-Output` or implicit output; diagnostics go to stderr with `[Console]::Error.WriteLine`; discard value-returning methods (`ArrayList.Add`, `HashSet.Add`, an un-nulled `New-Item`) with `[void]` or `$null =`. `Write-Host` is allowed for GHA workflow commands (`::error::`, which must reach stdout), in `Show-` display functions, and in installers whose stdout carries no data (stated in the file header).
- Why: `Write-Host`, `Write-Warning`, `Write-Verbose -Verbose` and `Write-Information -InformationAction Continue` all land on stdout of a `-File` process; only `Write-Error` and `[Console]::Error` reach stderr; method return values leak into a function's output ([err] f12; rust cli-contract CLI-01).
- Check: `Invoke-ScriptAnalyzer -Path . -Recurse -IncludeRule PSAvoidUsingWriteHost` (default Warning, exempts `Show-` verbs); stray output is a named reading heuristic: `grep -rn --include='*.ps1' -e '\.Add(' .` then check the receiver type (`ArrayList`/`HashSet` return a value, `List[T]`/`Hashtable` do not).
- Watched: yes for PSSA (`checks/streams/red.ps1:1`, twin clean) and behaviour (`streams.ps1`, `stray.ps1`, 4 engine rows); the `.Add(` grep is a heuristic only.
- Scope: script, module and test kinds (MUST); the installer kind keeps the `PSAvoidUsingWriteHost` exclusion (PS-GATE-03) and meets the rule by reading (www-setup has 0 `Write-Host`).

### PS-NATIVE - native commands (carried)

**PS-NATIVE-01 (MUST)** Write `curl.exe` and `tar.exe` (and `sort.exe` / `diff.exe` when the Unix tool is meant) in `.ps1` files and `pwsh`/`powershell` `run:` blocks that can run on 5.1; never bare `curl` or `wget`.
- Why: on 5.1 they are aliases of `Invoke-WebRequest` (`curl -fsSL` dies with "parameter name 'fsSL'"); pwsh 7.4.7/7.6.6 on Windows resolves `curl.exe` (measured), so the bug is a 5.1 one ([err] f10). PSSA cannot see it from a Linux pwsh.
- Check: `grep -rnP --include='*.ps1' '(?<![\w./-])curl(?![.\w-])' .` (excludes `curl.exe`, `curl.se`, `-curl`); workflows: the same pattern on `.github/workflows` keeping hits under a pwsh/powershell or Windows-default step.
- Watched: yes, `run-checks.out` C1 (`checks/curl/red.ps1:1,2` listed, twin with `curl.exe` not). Fleet `.ps1`: 0 hits.
- Scope: 5.1-capable code. Exemplar: deno_install `install.ps1:26,46`.

**PS-NATIVE-02 (MUST)** Build native argv as an array and splat it (`$argv = @('xf', $archive, '-C', $dest); & tar @argv`). Never pass one string, never `Invoke-Expression "tool $args"`, never `Start-Process -ArgumentList "<string>"`; use `Start-Process` only for `-Wait`, elevation or redirect-to-file, with pre-quoted elements.
- Why: a single string is one argument on every mode; `@('has space')` to `Start-Process` splits on spaces on all engines and 5.1 rejects an empty element; `Invoke-Expression` re-parses and injects ([err] f9).
- Check: `grep -rnP --include='*.ps1' 'Start-Process.*-ArgumentList\s+["\x27]' .`; `Invoke-ScriptAnalyzer -Path . -Recurse -IncludeRule PSAvoidUsingInvokeExpression` (default Warning). An array `-ArgumentList` is not grep-visible: reading heuristic plus `args-startprocess.ps1`.
- Watched: yes, `run-checks.out` A1 (`red-sp.ps1:1,2`), A2 (`red-iex.ps1:1`); twin `& tar @argv` clean.
- Scope: all PowerShell.

**PS-NATIVE-03 (SHOULD)** In 5.1-bound code do not pass an empty string, an embedded `"` or a trailing `\` before a closing quote to a native; prefer env vars, stdin or a file. Never pass untrusted input to a `.bat`/`.cmd`. If unavoidable, escape only when `$PSNativeCommandArgumentPassing` is absent or `Legacy`.
- Why: 5.1 and 7.x `Legacy` drop the empty string, strip quotes and corrupt `C:\dir with space\`; 7.3+ `Standard`/`Windows` pass them intact, so unconditional `\"` escaping is wrong on 7; `.cmd`/`.bat`/`cmd.exe`/`find.exe` keep Legacy parsing even in `Windows` mode ([err] f9).
- Check: `matrix.sh pwsh args.ps1` (Legacy rows `argc=2`, `[say hi]`; 5.1 `[C:\dir with space"]`); call sites are a named reading heuristic (any `''` or interpolated user text in a native call). Watched: yes (behaviour, `args.ps1` x5 engine rows, `args-workaround.ps1`).
- Scope: 5.1-bound.

### PS-GATE - the PowerShell gate

**PS-GATE-01 (MUST)** Gate PowerShell through a wrapper that exits 0 clean / 1 findings / 2 misconfigured, never through raw `Invoke-ScriptAnalyzer -EnableExit`. The wrapper checks that the path and the settings file exist, that `Severity`, if the settings set it, lists `ParseError` (an absent `Severity` is valid and reports it), that every rule named in `IncludeRules`, `ExcludeRules` or `Rules` is a known rule, and that at least one `.ps1`/`.psm1`/`.psd1` file exists. Run PSSA sequentially (it is not thread-safe under `ForEach-Object -Parallel`).
- Why: PSSA 1.25.0 raw fails open five ways: exit = count mod 256 (256 findings exit 0); `Severity = Error,Warning` drops `ParseError` (an unparseable file exits 0); a missing settings path exits 0; a typo'd key under `Rules` silently disables the rule, and an unknown name in `IncludeRules` is ignored with no error, warning or finding (a typo-only list reports 0; dotnet's file names 3 rules that do not exist); an empty directory exits 0 ([gate] §3, §1.3; [win7x] f7). The wrapper must not over-correct: with `Severity` absent PSSA reports ParseError on 5.1, 7.4.7 and 7.6.6, so the first-pass check "`ParseError` is in `Severity`" rejected valid IncludeRules-only files (exit 2).
- Check: `Invoke-PSGate.ps1 -Path <dir> -Settings <psd1>` (the corrected wrapper is `windows-7x-and-resolver/Invoke-PSGate.ps1`, copied to `pwsh-consolidation/rev2/`; `analyzer-profile/Invoke-PSGate.ps1` is superseded); raw uses listed for review by `grep -rn -e 'EnableExit' --include='*.yml' --include='*.yaml' --include='*.ps1' .` ([gate] M5).
- Watched: yes. [gate] run 4 (4 fail-open modes exit 0), run 5 (7 of 7 gate cases: violation 1, compliant 0, 256 findings 1, missing settings/path/empty/typo/no-ParseError 2); R3 (raw exit 0 on `function {` with `Error,Warning`; wrapper exit 2 on that settings file, 1 on the plant with `ParseError`, 0 on the twin); R10 (corrected wrapper on IncludeRules-only `inc-valid`: bad exit 1, good exit 0; on `dotnet.psd1` exit 2 "unknown rule name(s)"; on `inc-sev-noPE` exit 2; `inc-sev-PE` bad 1, good 0; first-pass wrapper exit 2 on the valid IncludeRules-only file, the verification that went red on a compliant twin and is replaced).
- Scope: all PowerShell gates. Fleet: both PSSA gates are raw (PS-GATE-02); the dotnet exemplar's IncludeRules-only file is valid on ParseError but fails the known-rule check.

**PS-GATE-02 (MUST)** Every `Severity` list that is set, in a settings file and in a CLI `-Severity` argument, includes `ParseError`. A settings file with no `Severity` (IncludeRules-only, the dotnet shape) is not a violation.
- Why: a list that omits it is a silent opt-out of the parse check; the default-looking `Error,Warning` list is the opt-out ([gate] §3.2). An absent `Severity` reports it: PSSA 1.25.0 on 5.1, 7.4.7 and 7.6.6 returned 2 ParseError findings per broken file for IncludeRules-only, exclude-only and empty settings, and 0 for `Severity = Error,Warning` on the same files; with raw `-EnableExit` the broken file exits 4 (the finding count) for IncludeRules-only, 0 for `Error,Warning` ([win7x] f7; `ScriptAnalyzer.cs`@411c3d0b197b:1488,1902 `severity == null || severity.Contains("ParseError")`).
- Check: `grep -rnP -e 'Severity[ ]*=[ ]*@[(](?!.*ParseError)' --include='PSScriptAnalyzerSettings*.psd1' .` and `grep -rnP -e 'Invoke-ScriptAnalyzer.*-Severity(?!.*ParseError)' --include='*.yml' --include='*.yaml' --include='*.ps1' .` ([gate] M2, M3).
- Watched: yes. [gate] run 9, run 11; R3 (grep lists `sev-nopE.psd1:1` and [compat]'s `pssa-51.psd1:2`, not `sev-pE.psd1`). Fleet hits: `www-setup/taskfiles/pwsh.taskfile.yml:24`, `setup-grimoire/Taskfile.yml:45`.
- Scope: all PowerShell gates.

**PS-GATE-03 (MUST)** Pass a per-kind settings file explicitly with `-Settings`; never rely on implicit `PSScriptAnalyzerSettings.psd1` discovery. Four kinds, all with `Severity = @('Error','Warning','ParseError')`:

| Kind | Target | `ExcludeRules` | Enabled |
|---|---|---|---|
| script | 7.6 | `PSUseShouldProcessForStateChangingFunctions`, `PSUseApprovedVerbs`, `PSUseSingularNouns`, `PSUseBOMForUnicodeEncodedFile` (reason comment) | no compat rule (`TargetVersions` cannot express 7.6) |
| installer | 5.1 | the three style rules plus `PSAvoidUsingWriteHost` | `PSUseCompatibleSyntax` with `Enable = $true`, `TargetVersions = @('5.1')` |
| module | 5.1 and 7.6 | none (verb and noun rules bind exported functions; mark private helpers with `Export-ModuleMember` or `SuppressMessage`) | `PSUseCompatibleSyntax@5.1` |
| test (Pester) | per target | `PSUseDeclaredVarsMoreThanAssignments` plus the script exclusions | none |

`PSUseCompatibleCommands` / `PSUseCompatibleTypes` are advisory and absent from blocking settings. Pass `TargetVersions` explicitly: empty means `{5,6,7}`; `'7.4'` and `'7.6'` behave as `7.0`.
- Why: noise and masking. `PSUseDeclaredVarsMoreThanAssignments` was 22 of 30 false positives (13 of 15 in tests); `PSAvoidUsingWriteHost` is 586 of 1,077 hits in the [gate] rule survey; implicit discovery applies one file to the whole recursion ([gate] §2.3, §4.1, §6, §7).
- Check: kind-exclusion matrix `kind-exclusions.sh` (14 cells: WriteHost script 1 / installer 0 / module 1; DeclaredVars test 0 / script 1; CompatibleSyntax script 0 / installer 1 / module 1); `grep -rn -e 'UseCompatibleCommands' -e 'UseCompatibleTypes' --include='*.psd1' .` over blocking settings is empty. The installer exclusion does not mask `PSAvoidUsingInvokeExpression` ([gate] §6.3).
- Watched: yes, [gate] run 7, `kind-exclusions.out`; the script-kind BOM exclusion R4.
- Scope: gate settings. Fleet: `www-setup/PSScriptAnalyzerSettings.psd1` has one file, no `Severity`, no compat rule ([cfg] §6).

**PS-GATE-04 (MUST)** For 5.1-bound files (installer, module) run the 5.1 parse of PS-COMPAT-02 as a required CI job on a Windows runner (`shell: powershell`, or `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File parse-gate.ps1`); exclude files that carry `#Requires -Version 7.x`. On a Linux-only runner run `PSUseCompatibleSyntax@5.1` and the static fallback greps of PS-COMPAT-02 and label the job "5.1 syntax: static fallback".
- Why: PSSA misses four constructs and pwsh 7 parses them, so a pwsh-only parse job is a false green (R2; [gate] run 6).
- Check: `parse-gate.ps1` on the plants (exit 1) and a compliant file (exit 0); exclusions listed by `grep -rnE -e '^#[Rr]equires -[Vv]ersion [6-9]' --include='*.ps1' --include='*.psm1' .` ([gate] C14).
- Watched: yes, [gate] run 6, `requires/runall.sh`; [compat] V1. Fleet: no gate parses every 5.1-bound file on 5.1 (the 25-of-26 parse in [fleet] Axis 7 was a research-time run); www-setup executes `install.ps1` on 5.1 in `test-installers.yml:174-188`.
- Scope: installer and module kinds.

**PS-GATE-05 (SHOULD)** Pin PSSA: `Install-Module PSScriptAnalyzer -RequiredVersion 1.25.0`, or use the preinstalled runner copy and assert `(Get-Module PSScriptAnalyzer -ListAvailable).Version`.
- Why: 1.24.0 changed `-EnableExit` semantics and raised the host minimum to 5.1; 1.25.0 (2026-03-20) is on the windows-2025 and ubuntu-24.04 images beside pwsh 7.6.6 ([gate] §1).
- Check: `grep -rnP -e 'Install-Module[ ]+(-Name[ ]+)?PSScriptAnalyzer(?!.*-RequiredVersion)' --include='*.yml' --include='*.yaml' --include='*.ps1' .` ([gate] M1). Watched: yes; fleet hits `www-setup/taskfiles/pwsh.taskfile.yml:22`, `setup-grimoire/.github/workflows/test.yml:83`.
- Scope: all PowerShell gates.

**PS-GATE-06 (SHOULD)** Run `Test-CommandResolves.ps1` (walk `CommandAst` nodes, `Get-Command` on the target host, `-CheckParameters`, skip functions defined in the file) as an advisory check for installer and module kinds: ship it with an `-Allow` list (optional modules such as `*-Az*`, host-provided helpers such as `*Chocolatey*`) and version-gate suppression (commands inside an `if` that tests `$PSVersionTable`, `$IsWindows`, `$IsCoreCLR` and the like), report its findings in the job summary, and never make it a required status check. Revised 2026-10-11 from "a blocking check".
- Why: the default PSSA rule set gives 0 findings on a hallucinated cmdlet ([gate] §11). The resolver closes that gap (13 of 13 planted hallucinated cmdlets and parameters caught, 0 findings on 25 twins, R15) but untuned it fails correct code: over 1,327 corpus files on 5.1 it flagged 225 files (17.0%), and over the 178 correct installer-like authored files 8 (4.5%) and 30 of 33 findings (91%) were false (21 optional-module commands, 5 Chocolatey helpers, 3 version-gated, 1 module probed another way); zero were hallucinations ([win7x] f6). Tuned, 4 findings remain in the 17 small repos, all real 7-only constructs; the allow-list came from the same corpus, so out-of-sample precision is unmeasured and the rule cannot move to MUST.
- Check: on the target host (5.1 for installers, so a `windows-latest` job running `powershell`), `Test-CommandResolves-tuned.ps1 -Path <dir> -CheckParameters -Allow <list>`: plants exit 1, the twins exit 0. Host-bound: `Get-CimInstance` and `Get-NetAdapter` are unresolved on Linux pwsh 7.6.6 (exit 1) and resolve on 5.1 (exit 0), so a Linux run is a different, wrong check. Blind spots, none a defect of the tool: .NET members (`[IO.Path]::GetRelativePath`, `[Math]::Clamp`), parameter values (`Get-Content -Encoding utf8NoBOM`), splatted parameters and dynamic command names; the tuned variant also suppresses a hallucination inside a version gate (`if ($PSVersionTable.PSVersion.Major -ge 7) { Get-FileContent }` exits 0 tuned, 1 untuned). Those need the smoke run (PS-COMPAT-05).
- Watched: R15 (13 planted hallucinations exit 1 at the `-CheckParameters` level, 25 twins exit 0; guard-run: the version-gated false positive is silenced by the tuned variant, the gated hallucination is also silenced, the untuned variant flags both; host-run: the Linux 7.6.6 and 5.1 rows differ; `plants/miss` stayed non-red by design of the tool); [win7x] corpus run, 20 repos, 1,327 files, 6 min 35 s on 5.1, identical findings on a second run.
- Scope: the kind's target host (5.1 for installers). Fleet: 0 findings on www-setup `src/install.ps1` ([gate] run 10).

**PS-GATE-07 (MUST)** Installers never call `Set-ExecutionPolicy` beyond `-Scope Process`: use `-ExecutionPolicy Bypass` on the command line, tell users `Unblock-File` for Mark-of-the-Web downloads, and never call it on non-Windows (it throws).
- Why: the policy is not a security boundary; writing CurrentUser or LocalMachine from an installer mutates the user's machine ([gate] §10). Row M-U-02 (PS-SEC) is carried here; the PS-SEC consolidation cites it.
- Check: `grep -rnP -e '^[^#]*Set-ExecutionPolicy(?!.*-Scope[ :]+.?Process)' --include='*.ps1' --include='*.psm1' .` ([gate] C15). Watched: yes ([gate] run 8; `execpol/` measurements). Fleet: 0 uses; ocx prints the advice instead (`ocx/crates/ocx_setup/src/lib.rs:658`).
- Scope: installer kind.

**PS-GATE-08 (SHOULD)** Run a 5.1 test job as the custom shell `powershell -NoProfile -NonInteractive -File {0}`, not the built-in `shell: powershell` wrapper, and let the script own Stop and its exit status (PS-ERR-03, PS-ERR-04).
- Why: the built-in `-Command` wrapper closes stdin, which turns the `Invoke-WebRequest` prompt into a `NullReferenceException`; `-NonInteractive -File` gives the deterministic message and exit 1 ([compat] §5, V9).
- Check: workflow reading heuristic. Watched: the two invocation shapes yes (V9), the wiring no. Scope: 5.1 installer test jobs.

**PS-GATE-09 (SHOULD)** Module manifests carry no wildcard `*ToExport`.
- Check: `grep -rnE -e "(Functions|Cmdlets|Aliases|Variables)ToExport[[:space:]]*=[[:space:]]*'[*]'" --include='*.psd1' .` ([gate] M4); PSSA `PSUseToExportFieldsInManifest` warns by default. Watched: yes. Scope: modules.

**PS-GATE-10 (CONSIDER)** Keep `Invoke-Formatter` out of the gate.
- Why: idempotent, but only 12 of 55 corpus files are already formatted, one errors, one fails on mixed line endings, 5.1 and 7.6 output differs for 1 of 25 ([gate] §8). Not a check; measured decision. Pester 5 vs 6 (M-T-04, M-T-05) belongs to the testing group.

### Rules by the check that catches them

| Check | Rules |
|---|---|
| `Parser::ParseFile` on a real 5.1 host | PS-COMPAT-02, PS-GATE-04 |
| AST denylist (`denylist-51.ps1`, D1-D7; D6 carries the PS-ENC-10 carve-out, `denylist-51-rev2.ps1`) | PS-COMPAT-03, -04, -05 (D3), -06 (D7), PS-ENC-03 (D4, D6) |
| grep (directory operand, output = violation) | PS-COMPAT-01, -07, PS-ENC-01, -02, -03 (V7 value names, BOM-writer review lead), -07 (V1), -08 (V2), -10 (V3a, V3b), PS-ERR-01 (N1), -02, -05, -06, PS-NATIVE-01, -02, PS-GATE-02, -05, -07, -09 |
| PSSA rule | PS-ERR-07 (`PSAvoidUsingEmptyCatchBlock`), PS-ERR-08 (`PSAvoidUsingWriteHost`), PS-NATIVE-02 (`PSAvoidUsingInvokeExpression`), PS-COMPAT-02 and -05 (compat rules, partial), PS-ENC-06 (`PSUseBOMForUnicodeEncodedFile`) |
| `matrix.sh pwsh` / host run (behaviour) | PS-COMPAT-05, -06, PS-ENC-05, -09, PS-ERR-01, -02, -04, -05, -06, PS-NATIVE-03, PS-GATE-08 |
| wrapper (`Invoke-PSGate.ps1`, corrected) | PS-GATE-01 (including the unknown-rule-name check), -03, ParseError half of -02 |
| writer matrix (`writer-matrix.sh`, `runner-writer-check.ps1`) | PS-ENC-10 (accepted writers, bytes and the emulated runner read) |
| target-host resolver (`Test-CommandResolves-tuned.ps1`, advisory) | PS-GATE-06 |
| workflow lint (`pwsh-run-lint.py`) | PS-ERR-03 |
| bytes check (`bytes-check.ps1`) | PS-ENC-03 |
| `Import-Module` on 5.1 (`check-modules.ps1`) | PS-COMPAT-08 |
| reading heuristic only | PS-COMPAT-09, -10, PS-ENC-04, PS-ERR-08 (stray output), PS-NATIVE-03 (call sites), PS-ENC-06 placement |

### Check assets the rules assume

None ships yet. Prototypes (all run in the dives) live in the fixture directories; the rule set should ship them as `rules/powershell-quality/checks/`, mirroring `swift-quality/checks/*.sh` ([cfg] §3.2): `parse-gate.ps1` and `Invoke-PSGate.ps1` (`analyzer-profile/`), `denylist-51.ps1`, `bytes-check.ps1`, `mod/check-modules.ps1` (`compat-and-encoding/`), `resolve/Test-CommandResolves.ps1`, `tells.sh`, `meta.sh` (`analyzer-profile/`), `pwsh-run-lint.py`, the `Invoke-Native` helper (`errors-and-native/native-idiom.ps1`). The leading-pipe grep of PS-COMPAT-02 joins `tells.sh`.

The 2026-10-11 revision supersedes or adds, in `windows-7x-and-resolver/` and copied to `pwsh-consolidation/rev2/`: the corrected `Invoke-PSGate.ps1` (replaces the `analyzer-profile/` copy: `Severity` only if set, unknown rule names exit 2); `denylist-51-rev2.ps1` (D6 with the PS-ENC-10 carve-out, replaces `denylist-51.ps1`); `resolver/Test-CommandResolves.ps1` and `Test-CommandResolves-tuned.ps1` (the advisory PS-GATE-06 asset, `-Allow` and version-gate suppression in the tuned one); `runner-writer-check.ps1` and `writer-matrix.sh` (PS-ENC-10); and the PS-ENC-07 (V1), PS-ENC-08 (V2), PS-ENC-10 (V3a, V3b) and PS-ENC-03 (V7) greps, which join `tells.sh`.

### Consolidation runs

Fixtures: `fixtures/pwsh-consolidation/`. Host engines as above; `matrix.sh pwsh` rows are pwsh 7.4 LTS, 7.6.6, Windows PowerShell 5.1.

**R1 - operand order of the platform guard** (`order/rev.ps1`: `if ($IsWindows -or $PSVersionTable.PSEdition -eq 'Desktop')` under StrictMode; `order/fwd.ps1`: edition first).
```text
C5 grep:  rev.ps1: no-hit   fwd.ps1: no-hit
D2 AST:   rev.ps1:2 D2 $IsWindows is undefined on 5.1 (throws under StrictMode) ... exit=1   fwd.ps1: exit=0
matrix:   rev.ps1  7.4 'other' exit 0 | 7.6.6 'other' exit 0 | 5.1 "The variable '$IsWindows' cannot be retrieved because it has not been set." (VariableIsUndefined)
          fwd.ps1  7.4 'other' | 7.6.6 'other' | 5.1 'windows'
```
(5.1 exits 0 after the statement-terminating error unless Stop is set: the script limps on.)

**R2 - leading pipe** (`pipe/bad/leading-pipe.ps1`, twin `pipe/good/trailing-pipe.ps1`).
```text
tells.sh C1..C17 over bad/ and good/: 0 hits each
Invoke-PSGate.ps1 -Path pipe/bad -Settings installer.psd1 (PSUseCompatibleSyntax@5.1) on pwsh 7.6.6: psgate: 1 files, 0 findings  exit=0
grep -rnE -e '^[[:space:]]*[|]($|[^|])' pipe/bad -> leading-pipe.ps1:2:    | Select-Object ...   (HIT)   pipe/good -> no-hit
parse-gate.ps1 on 5.1.26100.9444: leading-pipe.ps1:2:5: An empty pipe element is not allowed. [EmptyPipeElement]  parse-gate: 1 files, 1 errors   (twin: 0 errors)
```

**R3 - ParseError in Severity** (`failopen/bad/broken.ps1` = `function {`, `failopen/good/fine.ps1`).
```text
raw Invoke-ScriptAnalyzer -EnableExit, Severity=Error,Warning, bad/        exit=0   (fail-open)
raw, Severity=Error,Warning,ParseError, bad/   broken.ps1:1 ParseError MissingNameAfterKeyword / MissingEndCurlyBrace   exit=2
raw, ParseError, good/                          exit=0
Invoke-PSGate.ps1 with compat's pssa-51.psd1:   psgate: Severity must list ParseError, or parse errors exit 0   exit=2
Invoke-PSGate.ps1 + ParseError settings:        bad/ -> 2 findings exit=1   good/ -> 0 findings exit=0
grep -rnP -e 'Severity[ ]*=[ ]*@[(](?!.*ParseError)' -> sev-nopE.psd1:1 and compat pssa-51.psd1:2   (sev-pE.psd1 not listed)
```

**R4 - BOM rule on the 7.6 script kind** (`bom/bad/emdash-comment.ps1`: em dash in a comment only; `bom/good/ascii-comment.ps1`).
```text
script.psd1 (gate's shipped):          bad/ -> Warning PSUseBOMForUnicodeEncodedFile ... 1 findings exit=1     good/ -> 0 findings exit=0
script-with-bom-excl.psd1:             bad/ -> 0 findings exit=0                                               good/ -> 0 findings
BOM added to a #! script (bom-shebang.ps1): "./bom-shebang.ps1: line 1: <U+FEFF>#!/usr/bin/env: No such file or directory"  exit=127
grep -rl -P '^\xEF\xBB\xBF' bom/ -> bom-shebang.ps1
```

**R5 - `Invoke-WebRequest` without `-UseBasicParsing`** (`compat-and-encoding/iwr-bad/iwr.ps1`, `iwr-good/iwr-basic.ps1`, `matrix.sh pwsh`).
```text
iwr-bad:  7.4 status=200 exit 0 | 7.6.6 status=200 exit 0 | 5.1 "Windows PowerShell is in NonInteractive mode. Read and Prompt functionality is not available." exit 1
iwr-good: 7.4 status=200 | 7.6.6 status=200 | 5.1 status=200 exit 0
```

**R6 - native exit under Stop** (`errors-and-native/native-mid*.ps1`, `matrix.sh pwsh`).
```text
native-mid.ps1       7.4.7 start/reached exit 0 | 7.6.6 reached exit 0 | 5.1.26100.9444 reached exit 0
native-mid-pref.ps1  7.4.7 NativeCommandExitException "ended with non-zero exit code: 3." exit 1 | 7.6.6 "... 3 (0x03)." exit 1 | 5.1 reached exit 0
native-mid-fn.ps1    7.4.7 "sh exited with code 3" exit 1 | 7.6.6 exit 1 | 5.1 "cmd exited with code 3" exit 1
```

**R7 - the `-Encoding` grep vs D6** (`enc/bad/w.ps1`: `'x' | Out-File -FilePath out.txt -Encoding utf8`; `enc/good/w.ps1`: `[IO.File]::WriteAllText(... UTF8Encoding $false)`).
```text
C9a grep: bad no-hit, good no-hit
D6 AST:   bad w.ps1:1 D6 Out-File without -Encoding ascii ... exit=1   good exit=0
5.1 bytes written by bad/w.ps1:  ef bb bf 78 0d 0a
```

**R8 - `exit` under `iex`** (`errors-and-native/iex-exit.ps1`, `matrix.sh pwsh`; identical on all three engines).
```text
RED  exit 5 / exit inside function  (pipe-iex, scriptblock-call)  HOST-KILLED proc-exit=5
TWIN return (top level) / scoop break in fn / throw / iex-aware flag  host-survived proc-exit=0
TWIN iex-aware (flag) -File  proc-exit=5   (real exit when the same file runs as a file)
```

Revision runs (2026-10-11). Fixtures: `fixtures/pwsh-consolidation/rev2/`. Rows tagged "Windows" are the pwsh 7.4.7 and 7.6.6 portable zips and WinPS 5.1.26100.9444 on the de-DE host through WSL interop (`winrun.sh`); "Linux" is pwsh 7.6.6 in WSL.

**R9 - D6 against the PS-ENC-10 accepted writer** (`envfile/good/`: `AppendAllText(... UTF8Encoding $false)` and `Out-File -Encoding utf8 -Append` to `$env:GITHUB_ENV`; `envfile/bad/`: `Add-Content`, `Out-File` bare, `Out-File -Encoding unicode`, `>>`; `denylist-51.ps1` against `denylist-51-rev2.ps1`).
```text
denylist-51.ps1      envfile/good  D6 flags the Out-File -Encoding utf8 -Append writer   <- red on a compliant twin
denylist-51-rev2.ps1 envfile/good  exit 0
denylist-51-rev2.ps1 envfile/bad   ac.ps1 of-noenc.ps1 of-unicode.ps1 of-utf8-elsewhere.ps1 rd.ps1  -> D6, exit 5   (WinPS 5.1 row)
```
The unmodified D6 fails the accepted writer, so PS-ENC-03's D6 reference carries the carve-out (an `Out-File -Encoding utf8` whose target is `$env:GITHUB_*`). `of-utf8-elsewhere.ps1` (the same writer on an ordinary file) stays flagged.

**R10 - gate wrapper against IncludeRules-only settings** (`incl/`, settings `inc-valid` (IncludeRules only), `dotnet` (the exemplar's file), `inc-sev-noPE` (`Severity = Error,Warning`), `inc-sev-PE`; `Invoke-PSGate-old.ps1` against `Invoke-PSGate.ps1`; raw PSSA 1.25.0).
```text
raw PSSA, broken file:  inc-valid n=4 (ParseError)   inc-sev-noPE n=0   inc-sev-PE n=4
old wrapper:  inc-valid bad exit=2, good exit=2 (Severity must list ParseError)   <- red on a compliant twin
new wrapper:  inc-valid bad 1 / good 0   dotnet exit=2 (unknown rule name(s): 3 DSC rules)
              inc-sev-noPE exit=2        inc-sev-PE bad 1 / good 0
```
**R11 - runner env-file writer matrix** (`writer-matrix.sh`, 21 sequences of {`aa` AppendAllText no BOM, `of` Out-File -Encoding utf8 -Append, `rd` `>>`, `ac` Add-Content, `ofd` Out-File -Append bare}, each decoded as the runner does, `ReadAllText` for ENV and `ReadAllLines(UTF8)` for PATH).
```text
WinPS 5.1:        14 ok, 7 CORRUPT   rd,of  of,rd  aa,ac  aa,rd  aa,ofd  ac,ac  ac,rd
pwsh 7.6.6 Win:   21 ok, 0 CORRUPT
ok on both:       aa  aa,aa  of  of,of  aa,of  of,aa  rd  rd,rd  ac  ac,of  ofd  ofd,ofd  of,ac  rd,ac
```
**R12 - Windows encoding probes** (`probe-enc.ps1`, `write-bytes.ps1`, `read-nobom.ps1`, `quote-chars.ps1`; `Out-File`/`Set-Content` of `caf` + U+00E9 U+2019 U+4E2D).
```text
                                   5.1 (26100.9444)            7.4.7                    7.6.6
$OutputEncoding                    us-ascii                    utf-8                    utf-8
[Console]::OutputEncoding          cp437                       cp437                    cp437
culture OEMCodePage / ANSI         850 / 1252                  850 / 1252               850 / 1252
> redirect                         ff fe ... (UTF-16LE BOM)    63 61 66 c3 a9 e2 80 99  same as 7.4.7
Out-File -Encoding utf8            ef bb bf ...                no BOM                   no BOM
Out-File -Encoding oem             63 61 66 82 27 3f           same                     same
Out-File -Encoding ansi            ERR (not in set)            63 61 66 e9 92 3f        same
Out-File -Encoding default         cp1252 (e9 92 3f)           UTF-8                    UTF-8
WriteAllText(Encoding.UTF8)        ef bb bf ...                ef bb bf ...             ef bb bf ...
WriteAllText(UTF8Encoding $false)  no BOM                      no BOM                   no BOM
BOM-less UTF-8 source, ' in "..."  mojibake (len 6)            correct (len 4)          correct (len 4)
quote tokens U+2018..U+201E        7                           7                        7
```
**R13 - greps against planted violations and twins** (`verify.sh`, `bomenc/`, `grep-ext.out`).
```text
V1  locale names (PS-ENC-07)        verify/locale/bad  hit ansi.ps1 default.ps1 oem.ps1        good  no hit
V2  curly quote bytes (PS-ENC-08)   curly/bad  hit dq-curly-silent.ps1 sq-nobom.ps1               good  no hit
V3a >> / Add-Content (PS-ENC-10)    runnerw/bad  hit addcontent.ps1 redirect.ps1 step.yml         good  no hit
V3b Out-File without utf8           runnerw/bad  hit outfile-noenc.ps1 outfile-unicode.ps1        good  no hit
V6  bare Get-Content (PS-ENC-04)    verify/read/bad  hit bare.ps1                                 good  no hit
V7  value names (PS-ENC-03)         verify/valset/bad  hit bom.ps1 nobom.ps1   plants/miss/bad-value.ps1 hit   good  no hit
BOM-writer review lead (PS-ENC-03)  bomenc/bad  hit bom-writer.ps1:1,2                            good  no hit
```
**R14 - `iex` of a BOM-prefixed file and reads of legacy bytes** (`iex-bom.ps1`, `read-legacy.ps1`).
```text
iex with a U+FEFF prefix   5.1, 7.4.7, 7.6.6  -> ERR The term '?Write-Output' is not recognized   (no BOM: ok)
bare Get-Content of cp1252 'caf' e9:   5.1 -> e9 (ANSI)     7.4.7, 7.6.6 -> fffd
bare Get-Content of BOM-less UTF-8:    5.1 -> c3 a9         7.4.7, 7.6.6 -> e9
ReadAllText of cp1252:                 fffd on all three; UTF-16LE without BOM is unreadable on all three
```
**R15 - the resolver** (`resolver-runs.sh`, `plants/{bad,good,miss}`, `verify/guard`, `verify/host`; WinPS 5.1 unless noted).
```text
names:   bad 11 findings exit 1   good 0 exit 0
params:  bad 20 findings exit 1   good 0 exit 0      (-CheckParameters: 13 of 13 planted hallucinations)
strict:  bad 21 findings exit 1   good 0 exit 0      (25 twins at 0 findings)
guard fp   (gated real 7-only use):          untuned 1 finding exit 1   tuned 0, exit 0 (version-guarded=1)
guard hall (ungated hallucination):          untuned 1 finding exit 1   tuned 1, exit 1 (still caught)
guard miss (hallucination inside the gate):  untuned 1 finding exit 1   tuned 0, exit 0 (suppressed: the price of the tuned variant)
host:    Linux 7.6.6 bad (Get-CimInstance, Get-NetAdapter) 2 findings exit 1 ; WinPS 5.1 bad 0 findings exit 0
plants/miss on 5.1 at runtime: GetRelativePath and Clamp throw "does not contain a method"; utf8NoBOM throws on binding;
resolver on plants/miss: 4 files, 0 findings, exit 0   <- non-red by design of the tool
```
**R16 - native boundary** (`native-enc.ps1`, `native-to-file.ps1`; the child prints `caf` U+00E9 U+2019 as UTF-8 bytes; `redir-stdout.ps1` for the last three rows, a .NET `Process` with stdin closed and stdout piped, the `profiles.rs:207` shape).
```text
                                   5.1             7.4.7           7.6.6
child stdin bytes (default)        63 61 66 3F 3F  C3 A9 E2 80 99  same
child stdin, $OutputEncoding=utf8  C3 A9 E2 80 99  same            same
child stdout decoded (default)     len=8 mojibake  len=8           len=8
child stdout, Console=utf8         len=5           len=5           len=5
child > file                       UTF-16LE BOM    UTF-8 bytes     UTF-8 bytes
child | Out-File / | Set-Content   UTF-16 / ANSI    mojibake UTF-8  mojibake UTF-8
cmd /c "child > file"              UTF-8 bytes     UTF-8 bytes     UTF-8 bytes
redirected stdout, M+U+00FC+ller   4d 81 6c 6c 65 72   same            same            (clean console; ocx profiles.rs:207 reads these)
  ... after [Console]::OutputEncoding=UTF8, restored   4d c3 bc ...   same   same   next default row: 4d 81 ... again
  ... set and NOT restored         4d c3 bc ...   same   same   next default row: 4d c3 bc ... (the setting leaks to the console)
```

## Applied to the fleet and exemplars

Fleet files are cited as `<repo>@<sha12>:<path>:<line>` where the dives did; `[fleet]` Axis 7 baseline: 13 authored PowerShell files (10 `.ps1`, 2 `.psm1`, 1 `.psd1`), 25 of 26 files parse on 5.1, 7.4.7 and 7.6.6, 0 files use 7-only syntax, 0 BOMs, 0 `$IsWindows`, 0 `$PSNativeCommand*`; only www-setup and setup-grimoire gate PowerShell (PSSA plus Pester, [cfg] §6).

**Already satisfied**

| Rule | Where |
|---|---|
| PS-COMPAT-01, -04, -06, -07, -09 | `www-setup@a251c3631047:src/install.ps1`: `#Requires -Version 5.1` :50, version guard :731, `PSEdition -eq 'Desktop' -or` :105, `-UseBasicParsing` :344,357, `Add-Type` for ZipFile :433, TLS :337,355 |
| PS-COMPAT-02 | 25 of 26 fleet PowerShell files parse on 5.1, 7.4.7 and 7.6.6 (the one failure is an un-rendered virtualenv template placeholder, [fleet] Axis 7); 590 of 591 third-party exemplar files parse on 5.1 ([gate] exemplar evidence, [compat] exemplar table) |
| PS-COMPAT-05 (smoke run), PS-GATE-08, PS-ENC-03 | `www-setup@a251c3631047:.github/workflows/test-installers.yml:166-188` (`smoke-windows-51`): executes `src/install.ps1` under `powershell.exe -NoProfile -ExecutionPolicy Bypass -File`, checks `$LASTEXITCODE`, and writes its stub with `Set-Content ... -Encoding ascii`; the comment at :160-165 explains why a 5.1 host running the pwsh suite adds no 5.1 coverage (read-only check 2026-10-11) |
| PS-ENC-01, -03 | `www-setup` `src/install.ps1` is ASCII (`file -b`); `[System.IO.File]::WriteAllText` at :772 |
| PS-ERR-01, -08 | `www-setup` `src/install.ps1:485,517,638` check `$LASTEXITCODE`; helpers on `[Console]::Error.WriteLine` :168-182; `Write-Output` only :814,:844,:944; 0 `Write-Host`. Exemplar `PowerShell/PowerShell@5d871eb5e02c:tools/buildCommon/startNativeExecution.ps1:7-52` is the Invoke-Native shape |
| PS-ERR-02 | 0 fleet uses of `$PSNativeCommandUseErrorActionPreference`; adopters use it only in 7-only scripts (`mise@19e8c8f0d03d:xtasks/lint-fix.ps1:3-4`, `oh-my-posh@b0a8acd4d402:packages/msix/build.ps1:71-72`, `dotnet/install-scripts@e5cf1dd2d154:eng/common/Get-GitHubAppToken.ps1:43-44` with a scoped-off block :75-79) |
| PS-ERR-05 | `grimoire@4650ad830375:docs/public/install.ps1` has no `exit`; exemplar `ScoopInstaller/Install@1e2f334083d6:install.ps1:91-102,743` (`Exit-Install`, `$IS_EXECUTED_FROM_IEX`) |
| PS-NATIVE-01 | 0 bare `curl`/`wget` in the four fleet PowerShell source dirs; `denoland/deno_install@41d4676f8677:install.ps1:26,46` |
| PS-GATE-07 | 0 `Set-ExecutionPolicy` calls in fleet or corpus installers |
| PS-ENC-10 (exemplars) | `JanDeDobbeleer/oh-my-posh@b0a8acd4d402:build/pre.ps1:18,22,26,30` (`Out-File -Encoding utf8 -Append` on `GITHUB_ENV`), `rust-lang/rustup@61271d00a979:.github/workflows/ci.yaml:119-121` (`-Append -Encoding utf8`), `nushell/nushell` `release.yml:85`, `release-msi.yml:54`, `nightly-build.yml:181` ([win7x] exemplar evidence, N4); each is the accepted second writer |
| PS-ENC-07, -08 | fleet: 0 of 14 PowerShell files use `Default`, `OEM` or `ANSI` as an encoding name, 0 contain U+2018..U+201E in code positions (V1, V2 over the fleet, R13); corpus: Scoop `build.ps1:24-25` is the one locale-dependent name |
| PS-GATE-02 (IncludeRules-only) | `dotnet/install-scripts@e5cf1dd2d154` settings file: no `Severity`, so it reports ParseError (R10: the corrected wrapper accepts an IncludeRules-only file); the first pass called it a missing ParseError |
| PS-GATE-06 (exemplars) | 0 findings from the resolver on dotnet's 36 files, zoxide, atuin, conda, deno_install, direnv, fzf, git, nushell and rustup ([win7x] exemplar evidence, N11-N13); a clean result on 5.1 for each, advisory only |
| PS-COMPAT-06 (exemplars) | `dotnet/install-scripts@e5cf1dd2d154:src/dotnet-install.ps1:188,652,679` (7 of 7 files), Scoop 3 files, runner-images 5 |

**Violated**

| Rule | Where | Evidence |
|---|---|---|
| PS-ERR-05 | `www-setup@a251c3631047:src/install.ps1:182` (`Err`: `exit $Code`) and `:734` (`exit 2`), documented as `irm https://setup.ocx.sh/pwsh \| iex` (:22) | host killed, proc-exit 3, on 5.1, 7.4.7, 7.6.6 ([err] f7, f8; [inst] 3f `p7`) |
| PS-ERR-06 | `www-setup` `src/install.ps1:516` (not in a `try`) plus :247,:262,:484,:496,:654,:675,:840,:909,:913; `ocx@5de9d777eb7d:test/manual/test-windows-activation.ps1:105,123,151,211,228,248,255,257` (runs on 5.1 in the `shell: powershell` step at `shell-activation-deep.yml:152`); exemplar `dotnet/install-scripts@e5cf1dd2d154:src/dotnet-install.ps1:135,973` | 5.1 `RemoteException` replaces the intended message (`ws-tar-5x.ps1`) |
| PS-ERR-03 | `ocx@5de9d777eb7d:.github/workflows/shell-activation-deep.yml:158-169` (3 natives, no guard; if the ocx call fails `Invoke-Expression` gets an empty string and the runner's own pwsh wins) | the only unguarded block of 39 pwsh-executed fleet blocks; reasoned from `gha-sim.ps1`, not run on a hosted runner |
| PS-GATE-01, -02 | `www-setup/taskfiles/pwsh.taskfile.yml:24` (`-Severity Warning,Error ... -EnableExit`), `:31`; `setup-grimoire/Taskfile.yml:45` | an unparseable file exits 0 ([gate] §14.1, run 11); none of the settings files read in the corpus and fleet lists `ParseError` ([gate] Summary; Pester, posh-git, Scoop, Scoop Install, www-setup, and dotnet's `IncludeRules` allow-list, [gate] exemplar evidence) |
| PS-GATE-03, -04 | `www-setup/PSScriptAnalyzerSettings.psd1` (3 style excludes, no `Severity`, no compat rule); no fleet or corpus repo enables `PSUseCompatibleSyntax` ([compat] exemplar table); no fleet gate parses every 5.1-bound file on 5.1 (www-setup's only 5.1 coverage is the `install.ps1` smoke run, see the satisfied table) | 5.1 breakage in any other file, or in an `install.ps1` branch the smoke run skips, is invisible to the gate |
| PS-GATE-05 | `www-setup/taskfiles/pwsh.taskfile.yml:22`, `setup-grimoire/.github/workflows/test.yml:83` unpinned `Install-Module` | [gate] §14 |
| PS-COMPAT-01 | `grimoire@4650ad830375:docs/public/install.ps1` (an `irm \| iex` target, no `#Requires`); `setup-grimoire@1259e35b2550:.github/scripts/install.ps1` (pwsh-only by design, :52-53 use 7-only parameters, no `#Requires -Version 7.6`; on 5.1 fails with a parameter error instead of the clear message) | [compat] §12.3-12.4, V16 |
| PS-ENC-01 | `grimoire` `docs/public/install.ps1:1`, `setup-grimoire` `.github/scripts/install.ps1:26,31`: comment em dashes, 9 authored files comment-only | harmless today, `PSUseBOMForUnicodeEncodedFile` fires (9 findings, [gate] §14.6) |
| PS-ENC-03 | exemplar `dotnet/install-scripts@e5cf1dd2d154:eng/common/tools.ps1:213,736` | [compat] §12.2 |
| PS-ENC-10 | `www-setup@a251c3631047:src/install.ps1:721` (`Add-Content` to `$GITHUB_PATH`: cp1252 on 5.1, so a non-ASCII profile path reads back as U+FFFD; moved here from PS-ENC-03); `setup-grimoire` `.github/scripts/install.ps1:70` is the same writer but runs as pwsh 7.x (`action.yml:64`, SH-CI-11 evidence), where all 21 sequences decode, so it is safe until the script runs under 5.1. Exemplars: `actions/runner-images` `WaitWorkflowCompletion.ps1:43`, `trigger-ubuntu-win-build.yml:42,62,63`; `k3s-io/k3s` `setup-go/action.yaml:50`; `conda/conda` `tests.yml:177`; `PowerShell/PowerShell` `GHWorkflowHelper.psm1:15`; `Add-Content` in `PowerShell/PowerShell` `build.psm1:3324,3351`, `jdx/mise` `test-impl.yml:121,476`, `JanDeDobbeleer/oh-my-posh` `e2e.yml:52`; `>>` in `actions/runner-images` `CheckOutdatedVersionPinning.ps1:83` and `Homebrew/brew` `tests.yml:58` | [win7x] f8, N4, exemplar evidence; R11 |
| PS-ENC-07 (corpus) | `ScoopInstaller/Scoop` `build.ps1:24-25` (locale-dependent encoding name) | R13 V1 over the corpus |
| PS-ENC-05 | `ocx@5de9d777eb7d:crates/ocx_setup/src/profiles.rs:207` (`from_utf8_lossy` on the stdout of `pwsh`, then `powershell`: both emit OEM bytes to a redirected pipe on a clean console, `0x81` for ü, so a non-ASCII `$PROFILE` path is wrong with either host installed; the first pass saw only the 5.1 fallback) | [compat] §12.1; R16 `redir-stdout.ps1` |
| PS-GATE-01 (dotnet) | `dotnet/install-scripts@e5cf1dd2d154` settings file names 9 rules, 3 of them do not exist (`PSStandardDSCFunctionsInResource`, `PSUseIdenticalMandatoryParametersForDSC`, `PSUseIdenticalParametersForDSC`: the real names lack the `DSC` prefix); PSSA ignores unknown names silently and the wrapper exits 2 | R10 (replaces the first pass's "no ParseError") |
| PS-COMPAT-02 (exemplar) | `microsoft/vcpkg@e456309491fd:ports/vulkan-sdk-components/get-vulkan-sdk-components-info.ps1:54-55` (line starting with `\|`) | the one production 5.1 parse failure in 591 third-party files; PSSA@5.1 would not have caught it |
| PS-ERR-01 (exemplar) | `deno_install@41d4676f8677:install.ps1:26,46,48` runs `curl.exe` and `tar.exe` with no `$LASTEXITCODE` check | [err] exemplar table |

**New commitments for the fleet** (what the authored rule will require; per owner Q6 no defect above is fixed by this program):

1. The `powershell-quality` set ships the check assets and four per-kind settings files; www-setup's single `PSScriptAnalyzerSettings.psd1` becomes the installer file.
2. www-setup and setup-grimoire move their PSSA gate to the wrapper, add `ParseError`, pin the version, and add a `shell: powershell` 5.1 parse job (PS-GATE-01..05).
3. Every authored `.ps1` gets its `#Requires` line (grimoire front door `5.1`, setup-grimoire pwsh script `7.6`).
4. `install.ps1` pairs adopt the iex-aware exit (`Exit-Install` shape) and a scoped-Continue wrapper for stderr redirects.
5. `shell-activation-deep.yml` and the other pwsh `run:` blocks with 2+ natives take PS-ERR-03.
6. The ocx emitter and `ocx_setup` follow PS-ENC-05 when reading `pwsh` and `powershell` output (both hosts, not only the 5.1 fallback); the emitter's own pwsh quoting (curly quotes U+2018-U+201B) is SH-EMIT's finding, not restated here ([ocx]).
7. www-setup moves `src/install.ps1:721` to `[IO.File]::AppendAllText(... UTF8Encoding $false)` (PS-ENC-10); setup-grimoire's `install.ps1:70` follows the same writer so a later 5.1 run stays safe.

## AI-agent failure modes

Ranked by how often the failure bites, judged from measured corpus and fleet frequency where one exists and otherwise by how silent the failure is (silent outranks loud). The ranking is a judgment; the counts are cited.

| # | Failure | Evidence | Mechanical check |
|---|---|---|---|
| 1 | Treats `$ErrorActionPreference = 'Stop'` as "the script stops when a command fails" and calls natives unchecked; in CI the step goes green | 5 of 5 engine rows; GHA last-native-wins; PSSA has no rule; 1 of 39 fleet pwsh blocks unguarded ([err] f1, f6, f7) | PS-ERR-01 (`native-mid.ps1` must not print `reached`; N1), PS-ERR-03 (`pwsh-run-lint.py`) |
| 2 | Writes 7-only syntax and parameters into a 5.1 target: `&&`, `\|\|`, ternary, `??`, `Join-Path a b c`, `-AsHashtable`, `Test-Json`, `-Parallel`, leading-pipe continuation | trained on 7-era text; 52 of 1,327 corpus files fail the 5.1 parse (46 are PowerShell-repo fixtures), vcpkg ships a leading pipe ([ex] axis 7) | PS-COMPAT-02 (`parse-gate.ps1` on 5.1), PS-COMPAT-05 (D3, C10, smoke run) |
| 3 | Assumes `>`, `Out-File`, `Set-Content`, `-Encoding utf8` are "UTF-8 without BOM"; pastes em dashes and curly quotes; "fixes" a BOM finding by adding a BOM | 106 corpus uses of `utf8NoBOM`; 9 fleet files with non-ASCII; R4 | PS-ENC-01 (non-ASCII grep), PS-ENC-02 (BOM grep), PS-ENC-03 (D6, `bytes-check.ps1`) |
| 4 | `iwr` without `-UseBasicParsing`, and `curl -fsSL`/`wget` (bash habit) in 5.1 targets | 24 of 41 corpus IWR files omit the switch ([compat] §5) | PS-COMPAT-06 (D7; R5), PS-NATIVE-01 (curl grep) |
| 5 | Ends an `irm \| iex` installer with `exit 1` or an `Err` helper that calls `exit` | www-setup :182,:734 | PS-ERR-05 (I1; `iex-exit.ps1`) |
| 6 | `$IsWindows` as the platform test, edition test second; `$obj?.Prop` believed to be null-conditional | `$Is*` in 222 corpus files (200 in the PowerShell repo); R1 | PS-COMPAT-04 (D2/D5, not C5), PS-COMPAT-03 (D1/C4a) |
| 7 | "Quiets" a native with `2>&1` / `2>$null` under Stop | 10 sites in `install.ps1`, 8 in the ocx test script, plus dotnet-install | PS-ERR-06 (S1; `stderr-red.ps1`) |
| 8 | Weakens or fakes the gate: `-Severity Warning,Error`, raw `-EnableExit`, a global `ExcludeRules`, a typo'd settings key, an empty file set, `Test-ModuleManifest` as the module gate | 2 fleet repos; 4 of the corpus settings files that set `Severity` omit `ParseError`, www-setup does it through the CLI; an IncludeRules-only file does not ([gate] Summary; [win7x] f7) | PS-GATE-01 (wrapper), PS-GATE-02 (M2, M3), PS-COMPAT-08 |
| 9 | Hallucinates cmdlets and parameters | default PSSA gives 0 findings; the resolver catches 13 of 13 plants but flags 4.5% of correct installer-like files untuned and cannot see .NET members, values, splats or dynamic names | PS-GATE-06 (advisory, target host, tuned), PS-COMPAT-05 (PSSA-C partial, smoke run) |
| 10 | Adds `Set-ExecutionPolicy` as a reflex | throws on Linux, mutates user state on Windows | PS-GATE-07 (C15) |
| 11 | Sets `$PSNativeCommandUseErrorActionPreference` in a 5.1 installer, or branches `if (native)` while it is on | inert on 5.1, throws on 7.4+ | PS-ERR-02 (grep plus a read of `#Requires`; `native-mid-pref.ps1`) |
| 12 | `Write-Host` for data, `$list.Add($x)` leaking into the return value, `Write-Error; exit` | stdout/return pollution | PS-ERR-08 (`PSAvoidUsingWriteHost`; `.Add(` grep), PS-ERR-07 |
| 13 | `Start-Process -ArgumentList "-a $b"`, `Invoke-Expression "tool $args"`, `''` or `"` to a native on 5.1 | argv split and dropped | PS-NATIVE-02 (A1, A2), PS-NATIVE-03 (`args.ps1`) |
| 14 | Writes `-Encoding Default`, `OEM` or `ANSI` "to match the console" or "for compatibility" | Scoop `build.ps1:24-25`; 0 of 14 fleet files; the bytes follow the host locale ([win7x] f2) | PS-ENC-07 (V1) |
| 15 | Pastes curly quotes U+2018..U+201E into code from a chat answer or a doc | 7 quote tokens on every engine; a curly single quote ends the string (parse error) on 7.x and on 5.1 with a BOM, and becomes silent mojibake on 5.1 without one (R12) ([win7x] f3) | PS-ENC-08 (V2; the bytes have no benign use in code) |
| 16 | Sets `$OutputEncoding = [Text.Encoding]::UTF8` "to fix native UTF-8" and pipes native output through `\| Out-File` | `$OutputEncoding` governs stdin only on 7.x; the child's stdout is decoded with the console encoding (`len=8` against `len=5`); `\| Out-File` and `\| Set-Content` re-encode the mojibake ([win7x] f4) | PS-ENC-05 (host run), PS-ENC-09 |
| 17 | Appends to `$GITHUB_PATH` or `$GITHUB_ENV` with `>>`, `Add-Content`, or `Out-File` without `-Encoding utf8` | 7 of 21 writer sequences corrupt on 5.1; 14 exemplar sites in 7 repos use a banned writer ([win7x] f8, N4) | PS-ENC-10 (V3a, V3b; writer matrix) |
| 18 | Over-corrects the gate: demands `ParseError` in an IncludeRules-only file, or invents rule names (3 of 9 in dotnet's file do not exist) | PSSA ignores unknown names; absent `Severity` already reports ParseError ([win7x] f7) | PS-GATE-01 (corrected wrapper), PS-GATE-02 |

Tell set of record (the cheap, no-5.1-host layer): the greps named in PS-COMPAT-02 (C1, C16, C17, leading pipe), PS-COMPAT-03 (C4a/C4b), PS-COMPAT-05 (C10, C11), PS-NATIVE-01, PS-GATE-02 (M2, M3), PS-GATE-05 (M1), PS-GATE-07 (C15), PS-ENC-01/-02, and from the 2026-10-11 revision PS-ENC-07 (V1), PS-ENC-08 (V2), PS-ENC-10 (V3a, V3b), PS-ENC-03 (V7) and the PS-ENC-04 bare-read lead (V6). Not in the set because the grep is unsafe: C5 (PS-COMPAT-04, order-blind), C9a-c (PS-ENC-03, passes `-Encoding utf8`).

## Open questions

**Owner decisions (default applied if no answer):**

1. Ship the check assets under `rules/powershell-quality/checks/` (default: yes, mirroring `swift-quality/checks/`). Without them most MUST rows have no runnable check in the catalog.
2. Exclude `PSUseBOMForUnicodeEncodedFile` for the script and test kinds (default: yes; R4).
3. Keep PS-ENC and PS-NATIVE as their own depth files as the map says (default: yes); the family labels in this file are the file split.
4. Keep a 7.4 column in the parse matrix until 2026-11-10, then delete it (default: yes).
5. Settled 2026-10-11, no decision needed: PS-GATE-06 `Test-CommandResolves` stays SHOULD and becomes advisory (Verdict 10); a MUST needs an allow-list plus an out-of-sample corpus (below).
6. M-U-02 (execution policy) is carried as PS-GATE-07; the PS-SEC consolidation should cite it, not restate it (default: carried here).
7. Updated 2026-10-11: both `AppendAllText(... UTF8Encoding $false)` and `Out-File -Encoding utf8 -Append` are safe alone and mixed (PS-ENC-10, Verdict 9); the default stays `AppendAllText` (default: yes; the reader is emulated from runner source, not hosted).
8. Edit SH-CI-11 (`shell-ci.md`) to name both accepted writers and ban every other on 5.1, and the topic-map counts "37 IDs, 22 MUST" to 41 IDs, 25 MUST (default: hand-off to the owners of those files; this revision touches neither).

**Another research round:**

- **Hosted-runner readers (GHA wrapper and env-file reader).** Question: does a throwaway workflow on `windows-latest` reproduce (a) the simulated "last native wins" results for `shell: pwsh` and `shell: powershell`, and (b) the 21-sequence env-file matrix of PS-ENC-10? [err] rebuilt the wrapper from runner source and the revision emulated the reader (`FileCommandManager.cs`@67f01c276e0a) over runner-shaped empty files; neither ran on a hosted job. A dispatch is covered by the standing CI grant.
- **Interactive consoles and UTF-8 system-locale hosts.** Question: do the PS-ENC-05 and PS-ENC-09 rows (console code page 437 and the leak of `[Console]::OutputEncoding`) hold in an interactive Windows Terminal session, and with "Beta: Use Unicode UTF-8 for worldwide language support" on (ACP 65001, which would change 5.1's `Set-Content`, `Default` and BOM-less source reads)? Every Windows row was measured through WSL interop on one cp1252 host.
- **`Invoke-RestMethod` and later cumulative updates.** Question: does 5.1 `irm` start prompting on builds after KB5129195 (2026-09-15)? PS-COMPAT-06 exempts it only as measured.
- **Non-1252 ANSI hosts.** Question: does the curly-quote synthesis in PS-ENC-01 and PS-ENC-08 reproduce on cp932/936/949? Needs a host with another system locale.
- **PSSA main.** Question: after the next release (`AvoidUsingArrayList`, `MissingTryBlock`, `AvoidDynamicallyCreatingVariableNames`, `InvalidMultiDotValue` are on main only; `Test-ScriptAnalyzerSettingsFile` is not exported by 1.25.0) does `TargetVersions` gain 7.x values, does `-EnableExit` change, and does the `severity == null` branch still report ParseError?
- **Resolver out of sample.** Question: what is the false-finding rate of the tuned `Test-CommandResolves` on a corpus whose allow-list was not derived from it? Decides whether PS-GATE-06 can become MUST for a project that supplies its own allow-list.
- Not this group: Pester 5 vs 6 and the discovery/run split (M-T-04, M-T-05) belong to the testing group (SH-TEST).

Removed as answered 2026-10-11: pwsh 7.4.7/7.6.6 on Windows encoding and console (PS-ENC-02..10, R12, R14, R16), `Test-CommandResolves` precision over the 1,327-file corpus (PS-GATE-06, R15), dotnet's IncludeRules-only settings (PS-GATE-01, -02, R10).

## Revision log

2026-10-11, folding in `shell-pwsh/windows-7x-and-resolver.md`. Every existing ID keeps its number and meaning; PS-ENC-07..10 are new.

- Frontmatter: `consolidates` gains the fourth dive, `revised: 2026-10-11` added, `fixtures:` names the `rev2/` runs R9-R16.
- Keys and Scope note: add the [win7x] key, the Windows/Linux row tagging, and the revision paragraph.
- Verdict 4-8: edited in place for the narrowed 7.x claims, the Windows rows and the new scope of PS-ENC-03 and PS-ENC-05. Verdict 9 (X8 settled), 10 (resolver SHOULD, advisory) and 11 (documented gaps) added. Open questions answered by the follow-up moved into Verdict 11 as gaps (resolver out-of-sample precision, emulated runner reader, interactive console and UTF-8 locale hosts, docs lag).
- Conflicts, row 1: corrected the reason. It is the explicit `Severity` list, not `IncludeRules`, that drops ParseError (PS-GATE-01, -02; R10). Row 12: pwsh 7 on Windows now measured. Rows 14-18 added (narrowed 7.x bytes and the Windows/Linux split, X8, IncludeRules against ParseError, resolver advisory, docs source-encoding sentence 5.1-only).
- PS-COMPAT-05: added `[Math]::Clamp`, the resolver's blind spots and the R15 `plants/miss` non-red.
- PS-ENC-01: pointer to PS-ENC-08 and R12. PS-ENC-02: Windows 7.x confirmation and R14.
- PS-ENC-03: "7.x is UTF-8 without BOM everywhere" overclaimed. Narrowed: `unicode`, `utf32`, `utf8BOM`, `ansi` and `oem` differ, and `[Text.Encoding]::UTF8` carries a BOM on every engine; adds numeric and named code pages to the rejected values, the V7 grep, the BOM-writer review lead, and the D6 carve-out. The `$GITHUB_PATH` "unverified" scope note is replaced by a pointer to PS-ENC-10.
- Verification replaced: unmodified D6 flagged the accepted `Out-File -Encoding utf8 -Append` writer on a compliant twin (R9). PS-ENC-03 and PS-ENC-10 now cite `denylist-51-rev2.ps1`, which carries the carve-out.
- PS-ENC-04: rewritten as two-directional (bare `Get-Content` is ANSI on 5.1 and UTF-8 on 7.x), V6 grep, R14.
- PS-ENC-05: scope widened to Windows on any engine; on 7.x only `[Console]::OutputEncoding` matters, `$OutputEncoding` does nothing for stdout decoding. ocx `profiles.rs:207` is wrong with either host installed (R16), not only the 5.1 fallback. Added that the console assignment outlives the child that set it unless restored.
- PS-ENC-06: Windows confirmation and the curly-quote caveat (PS-ENC-08).
- PS-ENC-07 (MUST), PS-ENC-08 (MUST), PS-ENC-09 (SHOULD), PS-ENC-10 (MUST) added, each with a watched check (R13, R16, R11).
- PS-GATE-01: "fails open four ways" listed five modes, now "five"; the Severity check is reworded to "if set" because the first-pass wrapper exited 2 on valid IncludeRules-only files (verification went red on a compliant twin, R10) and is replaced; adds the known-rule-name check (PSSA ignores unknown names, dotnet's file names 3 that do not exist); points the Check at the corrected wrapper.
- PS-GATE-02: text kept; Why now records that an absent `Severity` reports ParseError and IncludeRules-only is valid.
- PS-GATE-06: "as a blocking check" overclaimed. Rewritten as advisory, target-host, `-CheckParameters`, tuned with `-Allow` and version-gate suppression, never a required status check; numbers (13/13, 8/178, 30/33, 17.0%) and blind spots added; stays SHOULD.
- "Rules by the check that catches them": rows added for the writer matrix, the corrected wrapper, the target-host resolver; PS-ENC-03/-07/-08/-10 added to the grep row, PS-ENC-05/-09 to the host-run row; D6 notes the carve-out; typo "PS-GATE-06 placement" in the reading-heuristic row corrected to "PS-ENC-06 placement".
- "Check assets the rules assume": adds the corrected wrapper, `denylist-51-rev2.ps1`, the resolver pair, `runner-writer-check.ps1`, `writer-matrix.sh` and the V1/V2/V3a/V3b/V7 greps.
- "Consolidation runs": R9-R16 appended; no existing run changed.
- Fleet and exemplars: satisfied and violated tables extended (PS-ENC-10, -07, -08, PS-GATE-02 IncludeRules-only, PS-GATE-06 exemplars); www-setup:721 moved from PS-ENC-03 to PS-ENC-10; ocx `profiles.rs:207` widened; dotnet's settings file moved from "no ParseError" to "3 of 9 rule names do not exist"; commitments 6 (both hosts) and 7 (www-setup `AppendAllText`) updated.
- AI-agent failure modes: rows 8 and 9 edited; rows 14-18 added; tell-set sentence extended.
- Open questions: three answered items removed; owner decisions 5 and 7 updated in place (numbering kept), 8 added (SH-CI-11 and topic-map counts hand-off); the two hosted-runner items merged; interactive console and UTF-8 locale hosts, and resolver out-of-sample precision, added.
- No existing rule's verification failed to go red. Two went red on a compliant twin and were replaced: the first-pass wrapper's Severity check (PS-GATE-01) and unmodified D6 (PS-ENC-03).
- Hand-offs, not applied here: SH-CI-11 wording in `shell-ci.md`; topic-map counts "37 IDs, 22 MUST" to 41 / 25.

## Sub-artifacts

- [shell-pwsh/compat-and-encoding.md](shell-pwsh/compat-and-encoding.md) - targets per script kind, the 5.1 denylist measured on three engines, what PSSA sees and misses, `-UseBasicParsing` after CVE-2025-54100, BOM/ASCII/writer bytes, 23 normative candidates and 17 verification runs.
- [shell-pwsh/errors-and-native.md](shell-pwsh/errors-and-native.md) - native exit codes under Stop, the 7.4+ preference, stderr redirection, caller exit codes, the GHA pwsh wrapper, `exit` under `irm | iex`, argument passing, aliases, streams; PS-ERR-01..10 and PS-NATIVE-01..04 with fleet chase.
- [shell-pwsh/analyzer-profile.md](shell-pwsh/analyzer-profile.md) - PSSA 1.25.0 facts, the four fail-open modes, the wrapper, per-kind settings, compat rules vs the 5.1 parse, noise study, formatter, manifests, execution policy, the 20-grep tell set; PS-GATE-01..29.
- [shell-pwsh/windows-7x-and-resolver.md](shell-pwsh/windows-7x-and-resolver.md) - pwsh 7.4.7/7.6.6 on Windows against 5.1 (default encodings, writer bytes per cmdlet, BOM-less reads, quote tokens, the native boundary), `Test-CommandResolves` precision over the 1,327-file corpus, IncludeRules without `Severity`, the runner env-file writer matrix; 12 verification runs and the ENC/GATE amendments folded in as PS-ENC-07..10 and the PS-ENC/PS-GATE edits.

## Key sources

1. PowerShell support lifecycle (7.4/7.5 end 2026-11-10, 7.6 LTS to 2028-11-14): https://learn.microsoft.com/en-us/powershell/scripting/install/powershell-support-lifecycle
2. Differences between Windows PowerShell 5.1 and 7 (`Split`, `$?`, native stderr, `$OutputEncoding`): https://learn.microsoft.com/powershell/scripting/whats-new/differences-from-windows-powershell
3. about_Character_Encoding (per-cmdlet bytes, BOM advice): https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_character_encoding
4. KB5074596, `Invoke-WebRequest` prompt on 5.1 (CVE-2025-54100): https://support.microsoft.com/en-us/servicing/os/windows/2025/12/powershell-5-1-invoke-webrequest-preventing-script-execution-from-web-content
5. Invoke-WebRequest 5.1 reference (the "no way to bypass" warning): https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/5.1/Microsoft.PowerShell.Utility/Invoke-WebRequest.md
6. about_Preference_Variables 7.6 (`$PSNativeCommandUseErrorActionPreference`, `$PSNativeCommandArgumentPassing`): https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_preference_variables?view=powershell-7.6
7. about_Automatic_Variables 7.6 (`$?`, `$LASTEXITCODE`): https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_automatic_variables?view=powershell-7.6
8. about_PowerShell_exe 5.1 (`-File` vs `-Command` exit codes): https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_powershell_exe?view=powershell-5.1
9. actions/runner `ScriptHandlerHelpers.cs` (pwsh prelude and epilogue): https://github.com/actions/runner/blob/main/src/Runner.Worker/Handlers/ScriptHandlerHelpers.cs
10. GitHub workflow syntax, "Exit codes and error action preference": https://github.com/github/docs/blob/main/content/actions/reference/workflows-and-actions/workflow-syntax.md
11. about_Operators 7.6 (braces required for `?.`/`?[]`): https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Operators.md
12. PSScriptAnalyzer `UseCompatibleSyntax` rule doc (default disabled, `TargetVersions`): https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/docs/Rules/UseCompatibleSyntax.md
13. PSScriptAnalyzer `Invoke-ScriptAnalyzer` reference (`Severity`, `ParseError`, `-EnableExit`): https://github.com/PowerShell/PSScriptAnalyzer/blob/main/docs/Cmdlets/Invoke-ScriptAnalyzer.md
14. PSScriptAnalyzer changelog (1.24.0 `-EnableExit` count, min host 5.1): https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/CHANGELOG.MD
15. Scoop installer, iex-safe `Exit-Install` (:91-102, :743): https://github.com/ScoopInstaller/Install/blob/1e2f334083d609986d8c8bc9e31ae8e87c39fab4/install.ps1
16. about_Character_Encoding 7.6 (per-cmdlet default encodings, `-Encoding` values, `$OutputEncoding` scope; the "engine reads ANSI" sentence is 5.1 only): https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Character_Encoding.md
17. about_Quoting_Rules 7.6 (U+2018..U+201E are quote tokens): https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Quoting_Rules.md
18. about_Redirection 7.6 (7.4 byte-preserving native stdout to a file): https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Redirection.md
19. PSScriptAnalyzer `ScriptAnalyzer.cs`@411c3d0b197b (the `severity == null` ParseError branch, lines 1488 and 1902): https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/Engine/ScriptAnalyzer.cs
20. actions/runner `FileCommandManager.cs`@67f01c276e0a (env-file creation and readers: `ReadAllLines(UTF8)`, `ReadAllText`): https://raw.githubusercontent.com/actions/runner/main/src/Runner.Worker/FileCommandManager.cs
21. GitHub workflow commands (the documented `$GITHUB_ENV`/`$GITHUB_PATH` writers for `pwsh` and `powershell`): https://raw.githubusercontent.com/github/docs/main/content/actions/reference/workflows-and-actions/workflow-commands.md

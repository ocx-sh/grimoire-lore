---
title: PowerShell targets, 5.1/7 compatibility and encoding
topic: shell scripting across operating systems and shells - PowerShell 5.1 and 7 (rule families PS-COMPAT and PS-ENC)
agent: compat-and-encoding
model: sonnet
date_researched: 2026-10-11
sources_count: 35
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/compat-and-encoding/
scope: >
  Covers rows M-P-01..M-P-06, M-P-08, M-P-09, M-S-01..M-S-04: which PowerShell each script kind targets and what #Requires says,
  the 5.1 denylist and the checks that catch it, the BOM/ASCII/encoding policy, the bytes each writer produces on 5.1, and the
  Invoke-WebRequest -UseBasicParsing rule. Every behavioural claim was run on Windows PowerShell 5.1.26100.9444 (the real Windows host,
  de-DE, ACP 1252, OEM 437, KB5129195 of 2026-09-15 installed), pwsh 7.4.7 and pwsh 7.6.6 (Linux). Not covered: error handling and
  native exit codes (PS-ERR), gate wiring (PS-GATE), supply-chain security (PS-SEC). Not measurable here: pwsh 7 on Windows (not installed on
  the host), macOS, and non-1252 ANSI code pages - those claims are marked "unverified: read only".
---

# PowerShell targets, 5.1/7 compatibility and encoding

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Target per script kind (conflict 6 confirmed, with three refinements)](#1-target-per-script-kind)
   2. [The 5.1 denylist, measured on three engines](#2-the-51-denylist-measured-on-three-engines)
   3. [What PSScriptAnalyzer sees and what it cannot see](#3-what-psscriptanalyzer-sees-and-what-it-cannot-see)
   4. [Silent traps: unbraced `?.`, `$IsWindows`, `$PSVersionTable.Platform`, StrictMode](#4-silent-traps)
   5. [Invoke-WebRequest and -UseBasicParsing](#5-invoke-webrequest-and--usebasicparsing)
   6. [.NET differences that bite on 5.1](#6-net-differences-that-bite-on-51)
   7. [Reading scripts: BOM, ANSI, irm | iex, shebang](#7-reading-scripts-bom-ansi-irm--iex-shebang)
   8. [Writing files: bytes per writer and the safe idiom](#8-writing-files-bytes-per-writer-and-the-safe-idiom)
   9. [Console, native pipes and ASCII messages](#9-console-native-pipes-and-ascii-messages)
   10. [#Requires and module manifests](#10-requires-and-module-manifests)
   11. [7.4, 7.5, 7.6 changes older text gets wrong; lifecycle](#11-74-75-76-changes-older-text-gets-wrong-lifecycle)
   12. [Defects found in the fleet and in ocx (reported, not fixed)](#12-defects-found-in-the-fleet-and-in-ocx)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Installers and bootstrap scripts target Windows PowerShell 5.1 (`#Requires -Version 5.1` plus a runtime version guard, because `iex` ignores `#Requires`); repo, dev and CI scripts target PowerShell 7.6 LTS (`#Requires -Version 7.6`); modules are dual-edition and must be imported on a real 5.1. Conflict 6 is confirmed.
- 7.4 is never a floor: it and 7.5 end support on 2026-11-10 ([lifecycle](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/docs-conceptual/install/PowerShell-Support-Lifecycle.md) lines 130-132); GitHub's Ubuntu 24.04, Windows 2022 and Windows 2025 images already carry 7.6.6 and macOS-15 carries 7.6.4. Keep a 7.4 column in a parse matrix only until that date.
- PSScriptAnalyzer `PSUseCompatibleSyntax` is disabled by default and, when enabled with `TargetVersions = '5.1'`, caught 8 diagnostics in 7 of the 11 plant files that fail the 5.1 parser. It does not see leading-pipe continuation, trailing `&`, the `clean {}` block or `${a}?[0]`. The 5.1 `Parser::ParseFile` on the real host is therefore the authoritative syntax gate, not an optional second gate.
- `$o?.Name` (unbraced) is not a null-conditional on any engine: `?` is a legal variable-name character, so it reads the variable `$o?` and silently yields nothing on 5.1, 7.4 and 7.6; only `${o}?.Name` is the 7.1+ operator. Neither the parser nor PSSA flags it; an AST check does.
- `$IsWindows`, `$IsLinux`, `$IsMacOS` do not exist on 5.1 (empty when lax, a terminating error under `Set-StrictMode`); `$PSVersionTable.Platform` throws on 5.1 under StrictMode. Use `[Environment]::OSVersion.Platform -eq 'Win32NT'`, which runs unchanged on all three engines.
- Since the 2025-12-09 update, an `Invoke-WebRequest` call that parses the response fails on 5.1 under `-NonInteractive` (exit 1) and throws a `NullReferenceException` when stdin is closed; `-UseBasicParsing` (accepted and ignored on 7.x) fixes it. `Invoke-RestMethod` was measured unaffected, `-OutFile`-only downloads were measured unaffected, `-OutFile -PassThru` is affected.
- `$PSDefaultParameterValues['Invoke-WebRequest:UseBasicParsing'] = $true` removes the prompt (measured exit 0); Microsoft's KB documents it, the 5.1 reference page still says "there is no way to bypass this prompt".
- A BOM-less UTF-8 `.ps1` containing `café` has length 5 on 5.1 and 4 on 7.x; worse, an em dash inside a double-quoted string turns into `â€”` whose last character is U+201D (a PowerShell quote), so the file fails to parse on 5.1 ("The string is missing the terminator").
- `irm | iex` of non-ASCII text is server-dependent on 5.1 (`charset=utf-8` decodes correctly, no charset decodes as ISO-8859-1, length 5), and a UTF-8 BOM breaks it on all three engines (`?$s` / `U+FEFF$s` is "not recognized"). A BOM on a `#!` script also fails with exit 127 on Linux. Installers served by `irm | iex` are therefore ASCII-only with no BOM.
- On 5.1, `>`, `Out-File`, `Tee-Object` write UTF-16LE with BOM, `Set-Content`/`Add-Content` write ANSI (cp1252), `-Encoding utf8` writes a BOM, `-Encoding utf8NoBOM` and `utf8BOM` are rejected, `Export-Csv` writes ASCII with `?`; on 7.4 and 7.6 everything is BOM-less UTF-8 (byte-identical across 7.4.7 and 7.6.6). The one idiom identical everywhere is `[IO.File]::WriteAllText($p, $t, (New-Object System.Text.UTF8Encoding $false))`.
- `Out-File -Append` onto a UTF-8 file on 5.1 appends UTF-16LE bytes into the same file (a mixed-encoding file); `Add-Content` detects and matches the existing encoding.
- `$OutputEncoding` is `us-ascii` and `[Console]::OutputEncoding` is IBM437 on 5.1: `'café' | native` sends `63 61 66 3f`, native stdout is decoded as cp437, and `powershell.exe` stdout carries `0x82` for `é`. Set both to `UTF8Encoding($false)` around native calls, or keep messages ASCII.
- `[System.IO.Compression.ZipFile]` is "Unable to find type" on 5.1 until `Add-Type -AssemblyName System.IO.Compression.FileSystem`; `"1111p2222q3333".Split('pq')` returns 3 parts on 5.1 and 1 on 7; `ConvertTo-Json` of a BigInteger is an object on 5.1/7.4 and a number on 7.6.
- `Set-StrictMode -Version Latest` behaves identically on 5.1, 7.4.7 and 7.6.6 over eight probes (it equals 3.0); the only divergence is `$IsWindows`.
- `#Requires -Version 7.6` produces a clear "cannot be run because it contained a #requires statement" error on 5.1 even when the file also has a parse error or mis-decoded text; it is not enforced when the text is piped to `iex`.
- `Test-ModuleManifest` passes a module whose `.psm1` fails the 5.1 parser; only `Import-Module` on 5.1 fails.
- `Invoke-ScriptAnalyzer -EnableExit` returns the diagnostic count since 1.24.0, but on Linux the exit status wraps at 256: 255 diagnostics exit 255, 256 diagnostics exit 0. A gate must test the count, not the raw exit status.

## Findings

### 1. Target per script kind

Conflict 6 of the topic map is confirmed. The measurements add three refinements: installers need a runtime guard (not just `#Requires`), ASCII-only means no BOM either, and 7.4 is not a floor.

| Script kind | Engine floor | First-line contract | Encoding | Gates |
|---|---|---|---|---|
| Installer, bootstrap, anything fetched by `irm \| iex` or run by `powershell -File` on a stock Windows | Windows PowerShell 5.1 (also runs on 7.x) | `#Requires -Version 5.1`, and in code `if ($PSVersionTable.PSVersion -lt [version]'5.1') { throw ... }` (www-setup does this at `www-setup@a251c3631047:src/install.ps1:50,731`) | ASCII only, no BOM | 5.1 `ParseFile` on the host; PSSA `PSUseCompatibleSyntax` 5.1; AST denylist D1-D7 |
| Repo, dev, CI and Pester scripts | PowerShell 7.6 LTS | `#Requires -Version 7.6` (vcpkg does the same with 7.0: `vcpkg@e456309491fd:.github/scripts/close-inactive-prs.ps1:1`) | UTF-8 without BOM allowed; prefer ASCII | `pwsh` parse; PSSA default profile; no 5.1 gate |
| Modules (`.psm1`/`.psd1`) | Dual edition | `PowerShellVersion = '5.1'`, `CompatiblePSEditions = @('Desktop','Core')` | ASCII, or UTF-8 with BOM if non-ASCII is unavoidable (and never `iex`-served) | `Import-Module` on 5.1 (not `Test-ModuleManifest`) and on 7.6 |
| GitHub Actions steps | `shell: pwsh` (7.6.x on all three runner images) for repo scripts; `shell: powershell` only to test 5.1 installers | - | - | run 5.1 tests as `powershell -NoProfile -NonInteractive -File`, because the built-in `-Command` wrapper closes stdin (finding 5) |

Why 7.6 and not 7.4/7.5: the lifecycle table gives 7.6 (LTS) end of support 14-Nov-2028 and 7.4 (LTS) and 7.5 both 10-Nov-2026 ([lifecycle:130-132](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/docs-conceptual/install/PowerShell-Support-Lifecycle.md)), 30 days after the date of this research. The runner images list 7.6.6 on [Ubuntu 24.04](https://raw.githubusercontent.com/actions/runner-images/main/images/ubuntu/Ubuntu2404-Readme.md) (line 219), [Windows 2025](https://raw.githubusercontent.com/actions/runner-images/main/images/windows/Windows2025-Readme.md) (472) and [Windows 2022](https://raw.githubusercontent.com/actions/runner-images/main/images/windows/Windows2022-Readme.md) (492), and 7.6.4 on [macOS 15](https://raw.githubusercontent.com/actions/runner-images/main/images/macos/macos-15-Readme.md) (153).

`#Requires` measured behaviour (fixture `req/`, `N=6 ./each.sh req`):

```text
req76-plain.ps1   [5.1] The script 'req76-plain.ps1' cannot be run because it contained a "#requires" statement for Windows PowerShell 7.6.
                  [7.4] ... "#requires" statement for PowerShell 7.6.      [7.6] hello from 7.6+
req76-chain.ps1   (has Get-Item . && ...)  [5.1] the same #requires error, not the && parse error
req76-emdash.ps1  (BOM-less em dash)       [5.1] the same #requires error, not the string-terminator error
Get-Content req76-via-iex.ps1 -Raw | iex   [5.1] prints "no-shebang": #Requires is ignored under iex
```

### 2. The 5.1 denylist, measured on three engines

Fixture `ps7only/` (23 files, one construct per file); `twins/` holds a 5.1-safe equivalent of each. Parse is `[Parser]::ParseFile` (`parse.ps1`); runtime is `powershell -File` / `pwsh -File`. "PSSA-S" is `PSUseCompatibleSyntax` with `TargetVersions=5.1`; "PSSA-C" is `PSUseCompatibleCommands` with the Windows 5.1 profile.

| Construct | Added in | 5.1.26100.9444 | 7.4.7 / 7.6.6 | PSSA-S | PSSA-C | Caught by |
|---|---|---|---|---|---|---|
| `a && b`, `a \|\| b` | 7.0 ([chain operators](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Pipeline_Chain_Operators.md): "Beginning in PowerShell 7") | parse: `The token '&&' is not a valid statement separator in this version.` | ok | yes | - | parse, PSSA-S |
| `c ? a : b` (also nested) | 7.0 | parse: `Unexpected token '?'` | ok | yes (nested: 2 diagnostics) | - | parse, PSSA-S |
| `$x ?? y`, `$x ??= y` | 7.0 | parse: `Unexpected token '??'` / `'??='` | ok | yes | - | parse, PSSA-S |
| `${o}?.Name` | 7.1 ([operators](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Operators.md):814) | parse: `Unexpected token '?.Name'` | `[x]` | yes | - | parse, PSSA-S |
| `${a}?[0]` | 7.1 | parse: `Unexpected token '?[0]'` | `[1]` | **no** | - | parse only |
| `$o?.Name` unbraced | never an operator | parse ok; prints `[]` | prints `[]` (same) | no | - | AST D1 only |
| leading `\| Select ...` on the next line | 7.0 ([pipelines](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Pipelines.md):598) | parse: `An empty pipe element is not allowed.` | ok | **no** | - | parse only |
| trailing `&` (background job) | 7.0 | parse: `The ampersand (&) character is not allowed.` | starts a job | **no** | - | parse only |
| `clean { }` block | 7.3 ([7.3 notes](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/docs-conceptual/whats-new/What-s-New-in-PowerShell-73.md):21) | parse: `Missing closing '}'` | ok | **no** | - | parse only |
| `ForEach-Object -Parallel` | 7.0 | `Parameter set cannot be resolved` | ok | - | yes | PSSA-C, host run |
| `ConvertFrom-Json -AsHashtable` | 6.0 | `A parameter cannot be found ... 'AsHashtable'` | ok | - | yes | PSSA-C, host run |
| `Test-Json` | 6.1 | `The term 'Test-Json' is not recognized` | `True` | - | yes | PSSA-C, host run |
| `Get-Content -AsByteStream` | 6.0 | parameter not found | ok | - | yes | PSSA-C, host run |
| `Invoke-WebRequest -MaximumRetryCount -RetryIntervalSec -SkipHttpErrorCheck -SkipCertificateCheck` | 6.0/7.0 | parameter not found | ok | - | yes (4 diagnostics) | PSSA-C, host run |
| `Join-Path a b c` | 6.0 (`-AdditionalChildPath`) | `A positional parameter cannot be found that accepts argument 'c'` | `a/b/c` | - | **no** | AST D3, host run |
| `-Encoding utf8NoBOM` / `utf8BOM` | 6.0 | `Cannot validate argument on parameter 'Encoding'` | ok | - | **no** | AST D4, host run |
| `ConvertTo-CliXml` | 7.5 ([7.5 notes](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/docs-conceptual/whats-new/What-s-New-in-PowerShell-75.md):62) | not recognized | 7.4 not recognized; 7.6 ok | - | **no** (post-7.0 command is "local") | host run |
| `Join-Path -Extension` (7.7 preview) | 7.7 | parameter not found | binds positionally: `a/b/-Extension/txt` | - | yes (parameter of a known command) | PSSA-C |
| `$IsWindows` lax / StrictMode | 6.0 | empty / `The variable '$IsWindows' cannot be retrieved` | `False` / works | - | - | AST D2 |

Raw evidence for the table is in "Verification runs" V1-V3 and V5. The 5.1 parse failures are all-or-nothing: one such line makes the whole file unrunnable, and in a dot-sourced or `iex`ed script nothing before the error runs.

### 3. What PSScriptAnalyzer sees and what it cannot see

- **Default off.** `PSUseCompatibleSyntax`, `PSUseCompatibleCommands` and `PSUseCompatibleTypes` all carry "Default state: Disabled" ([syntax doc](https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/docs/Rules/UseCompatibleSyntax.md):11, [commands doc](https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/docs/Rules/UseCompatibleCommands.md):11). Control run V4: default PSSA over the 23 plant files reports only `PSAvoidUsingPositionalParameters` and `PSUseDeclaredVarsMoreThanAssignments`; no 5.1 breakage is visible.
- **Syntax rule coverage is the visitor list.** The rule overrides nine `Visit*` methods: `InvokeMemberExpression` (null-conditional method), `FunctionDefinition` (workflow), `UsingStatement`, `TypeDefinition` (classes on 3/4), `MemberExpression` (null-conditional), `AssignmentStatement` (`??=`), `BinaryExpression` (`??`), `TernaryExpression` (:359), `PipelineChain` (:381) ([UseCompatibleSyntax.cs](https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/Rules/CompatibilityRules/UseCompatibleSyntax.cs)). There is no visitor for index null-conditional, leading-pipe continuation, background `&` or `clean`, which matches the four "no" cells above.
- **Empty `TargetVersions` is not "none".** `GetTargetedVersions` returns `{5, 6, 7}` when the array is empty (source line 129); pass `TargetVersions = @('5.1')` explicitly.
- **Commands and types: the profile directory stops at 7.0.** The shipped Windows/Ubuntu profiles are 3.0, 4.0, 5.1 (three variants), 6.2 and 7.0 ([profiles listing](https://api.github.com/repos/PowerShell/PSScriptAnalyzer/contents/PSCompatibilityCollector/profiles)). That still works for a 5.1 target, because the rule compares the target profile with a union of all profiles: a *parameter* missing from the 5.1 profile is flagged even if it appeared after 7.0 (`Join-Path -Extension` was flagged), but a *command* absent from every profile is treated as local and ignored (`ConvertTo-CliXml`, 7.5, produced no diagnostic and fails at run time on 5.1 and 7.4). `PSUseCompatibleTypes` flagged `[System.Text.Json.JsonDocument]` and `[System.Net.Http.SocketsHttpHandler]` but not static members: `[Convert]::ToHexString` and `[IO.Path]::GetRelativePath` (absent on .NET Framework 4.8) produced nothing and fail on 5.1.
- **What replaces the profiles:** (a) the 5.1 parse on the host; (b) the AST denylist `denylist-51.ps1` for D1-D7 (this fixture is a prototype for the PS-COMPAT depth file, not a shipped tool); (c) a smoke run of the script's `--help`/dry path on the 5.1 host, which is the only check that sees .NET members. A custom profile can be generated with the PSCompatibilityCollector module ([commands doc](https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/docs/Rules/UseCompatibleCommands.md)); not run here.
- **Exit status.** 1.24.0 made `-EnableExit` return the diagnostic count ([CHANGELOG](https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/CHANGELOG.MD):60); 1.24.0 also raised PSSA's own minimum host to 5.1 (CHANGELOG:49). Measured on pwsh 7.6.6 / PSSA 1.25.0: 255 diagnostics exit 255, 256 diagnostics exit 0 (fixtures `wrap255/`, `wrap256/`). Windows exit codes are 32-bit, Linux's are 8-bit, so the same gate passes wrongly on Linux at multiples of 256.
- **The BOM rule is always on and contradicts the cross-platform advice.** `PSUseBOMForUnicodeEncodedFile` ("Default state: Always enabled", severity Warning) flagged `cafe-nobom.ps1`, `emdash-nobom.ps1` and `apos-nobom.ps1`, and the fleet's `grimoire/docs/public/install.ps1` and `setup-grimoire/.github/scripts/install.ps1` (comment-only em dashes). Microsoft's own encoding page says BOM-less UTF-8 "work fine in PowerShell, but may break in Windows PowerShell if the file contains non-Ascii characters", and also "For best overall compatibility, avoid using BOMs in UTF-8 files" ([about_Character_Encoding](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Character_Encoding.md):56-73). The resolution is to remove the non-ASCII, which satisfies both (finding 7).

### 4. Silent traps

**Unbraced `?.` / `?[]`.** The operator documentation: "Since PowerShell allows `?` to be part of the variable name ... You must use braces (`{}`) around the variable names like `${a}`" ([about_Operators:820-823](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Operators.md)). Measured (`ps7only/nullcond-member.ps1`, `nullcond-member-strict.ps1`):

```powershell
# WRONG on every engine: reads the variable named  o?  -> empty string, no error
$o = [pscustomobject]@{ Name = 'x' }
"[" + $o?.Name + "]"          # 5.1 [] ; 7.4 [] ; 7.6 []
# under Set-StrictMode -Version Latest: "The variable '$o?' cannot be retrieved because it has not been set." (all three engines)

# RIGHT, 7-only scripts:   "[" + ${o}?.Name + "]"      # 5.1 parse error; 7.x [x]
# RIGHT, 5.1-bound:        if ($null -ne $o) { $o.Name }
```

**Platform detection.** `$IsWindows` is undefined on 5.1 (`Test-Path variable:IsWindows` is `False`); the lax read is empty, `Set-StrictMode` turns it into a terminating error, and the order of `-or` operands decides whether it is ever evaluated:

```powershell
Set-StrictMode -Version Latest
if ($IsWindows -or $PSVersionTable.PSEdition -eq 'Desktop') { 'windows' }   # 5.1: The variable '$IsWindows' cannot be retrieved because it has not been set.
if ($PSVersionTable.PSEdition -eq 'Desktop' -or $IsWindows) { 'windows' }   # all engines (short-circuit); www-setup@a251c3631047:src/install.ps1:105
[Environment]::OSVersion.Platform -eq 'Win32NT'                            # all engines, no version logic; preferred
$PSVersionTable.Platform                                                   # 5.1 + StrictMode: "The property 'Platform' cannot be found on this object"; 7.x: Unix/Win32NT
```

Fixtures `plat/detect-bad.ps1` and `detect-good.ps1`. The corpus has `$IsWindows/$IsLinux/$IsMacOS` in 222 files, 200 of them in the PowerShell repo itself ([exemplar-shape.md:536](../shell-audit/exemplar-shape.md)).

**StrictMode (M-P-08).** Eight probes (uninitialised variable, missing property, `$null.Length`, method-call syntax on a function, array out of range, scalar `.Count`, string interpolation, `$IsWindows`) at levels 1.0, 2.0, 3.0 and Latest gave identical results on 5.1.26100.9444 and 7.6.6 except `$IsWindows` (fixture `strict/strict-levels.ps1`; diff of the two outputs after removing that column: identical). `Latest` equals 3.0 on both. `Set-StrictMode -Version Latest` is therefore safe as the single level for both kinds; the divergence is only variables that exist on one engine.

### 5. Invoke-WebRequest and -UseBasicParsing

Authoritative text. The 5.1 reference page carries the warning that on 2025-12-09 Microsoft changed `Invoke-WebRequest` (CVE-2025-54100) and "There is no way to bypass this prompt without using the **UseBasicParsing** parameter" ([IWR 5.1](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/5.1/Microsoft.PowerShell.Utility/Invoke-WebRequest.md):40-58). The KB itself (published 2025-12-09, revised 2025-12-20) says the prompt defaults to No, that "scripts that only download content or work with the response body as text or data are not affected", that CI "could ... hang while waiting for input", and recommends `$PSDefaultParameterValues['Invoke-WebRequest:UseBasicParsing'] = $true` for no-profile scripts ([KB5074596](https://support.microsoft.com/en-us/servicing/os/windows/2025/12/powershell-5-1-invoke-webrequest-preventing-script-execution-from-web-content)). On 7.x the parameter "has been deprecated ... any use of it has no effect" ([IWR 7.6:1381-1385](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Utility/Invoke-WebRequest.md)).

Measured on 5.1.26100.9444 with `-NonInteractive -File` (fixtures `iwr/`, `iwr/variants.ps1`; local server `serve.py` and example.com):

| Call | 5.1 | 7.4.7 / 7.6.6 |
|---|---|---|
| `Invoke-WebRequest -Uri https://www.example.com/` | `Windows PowerShell is in NonInteractive mode. Read and Prompt functionality is not available.` exit 1 | `status=200` |
| same with `-UseBasicParsing` (also `-UseB`, also splatted) | `status=200` exit 0 | `status=200` |
| text/plain GET; application/octet-stream GET | FAIL (prompt) | ok |
| `-OutFile $f` only | OK, 577 bytes | ok |
| `-OutFile $f -PassThru` | FAIL (prompt) | ok |
| `Invoke-RestMethod` (HTML, text/plain, JSON) | OK / OK / OK | ok |
| `curl 'https://...'` (alias of `iwr` on 5.1) | FAIL (prompt) | 7.6 on Linux runs real `curl` and prints a progress meter |
| `$PSDefaultParameterValues['Invoke-WebRequest:UseBasicParsing'] = $true` then plain `iwr` | `status=200` exit 0 | ok |
| `-Confirm:$false`, `$ConfirmPreference='None'` | `-Confirm` is not a parameter of the cmdlet: no bypass | n/a |
| `echo y \| powershell -File iwr.ps1` | `status=200` (answers the prompt Yes: full DOM parsing, the unsafe path) | n/a |
| GitHub-Actions-style `powershell -Command ". './iwr.ps1'" < /dev/null` | `NullReferenceException` from `Invoke-WebRequest`, exit 1 | n/a |

Conclusions. (1) Under CI the failure is exit 1 with a prompt message or a `NullReferenceException`, depending on whether stdin is closed. (2) `Invoke-RestMethod` is unaffected on this build, although its 5.1 page repeats the "script code ... might be run" warning ([IRM 5.1:43-45](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/5.1/Microsoft.PowerShell.Utility/Invoke-RestMethod.md)); this was the "chase" question and the answer is "not as of KB5129195, 2026-09-15" - re-measure on later builds. (3) The `-OutFile` exemption is real but fragile (`-PassThru` revokes it, and the KB does not promise it), so the rule is "always pass it" for aliases and `Invoke-WebRequest`; leave `irm` alone. (4) The fleet's irm-based bootstrap `grimoire/docs/public/install.ps1:12` is fine; `setup-grimoire/.github/scripts/install.ps1:52-53` calls `Invoke-WebRequest -OutFile` without it but is pwsh-only by design (`action.yml:55`), so D7 does not apply to that kind.

Exemplar tally, re-measured 2026-10-11 over `*.ps1`/`*.psm1` in the 41-repo corpus (substring `UseBasicParsing` anywhere in the file, comments included): 41 files mention `Invoke-WebRequest`/`iwr` outside PSScriptAnalyzer; 17 contain `UseBasicParsing` (runner-images 5, dotnet/install-scripts 7, vcpkg 1, PowerShell 1, Scoop 3); the missing 24 include 12 PowerShell-repo tests. The audit's 12 of 31 ([exemplar-shape.md:536](../shell-audit/exemplar-shape.md)) used a narrower file set and did not reproduce exactly; the conclusion (a minority of non-Microsoft installers pass it, dotnet and Scoop do) is unchanged.

### 6. .NET differences that bite on 5.1

Fixture `dotnet/net-probe.ps1`, three engines:

| Probe | 5.1.26100.9444 (.NET Framework 4.8.9345.0) | 7.4.7 (.NET 8.0.12) | 7.6.6 (.NET 10.0.12) |
|---|---|---|---|
| `[Net.ServicePointManager]::SecurityProtocol` | `SystemDefault` | `SystemDefault` | `SystemDefault` |
| `Tls13` enum member present | True | True | True |
| `[System.IO.Compression.ZipFile]` without `Add-Type` | `Unable to find type [System.IO.Compression.ZipFile]` | ok | ok |
| `Get-FileHash -Algorithm SHA256` | works (64 hex chars) | works | works |
| `"1111p2222q3333".Split('pq').Length` | 3 | 1 | 1 |
| `ConvertTo-Json ([bigint]::Pow(10,30))` | object with `IsPowerOfTwo...` | object | `1000000000000000000000000000000` |
| `Join-Path -Path a -ChildPath 'b','c'` | FAIL | FAIL | `a/b/c` |
| `Start-ThreadJob` source module | absent | `ThreadJob` | `Microsoft.PowerShell.ThreadJob` |

- **TLS.** On this fully patched build `SystemDefault` already negotiates TLS 1.2+, so `[Net.ServicePointManager]::SecurityProtocol = ... Tls12` is not needed here. It remains the www-setup kit's defence for older .NET Framework settings (`www-setup@a251c3631047:src/install.ps1:337,355`). The same lines OR in `Tls13`, whose enum member exists only on .NET Framework 4.8; on an older machine that member would not resolve. Older-.NET behaviour is unverified: read only (no older Windows host). Safe form: set `Tls12` unconditionally and add `Tls13` only after `[enum]::GetNames([Net.SecurityProtocolType]) -contains 'Tls13'`.
- **ZipFile.** Differences doc: "scripts that run on Windows may not run on non-Windows platforms because of the differences in the frameworks" ([differences](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/docs-conceptual/whats-new/differences-from-windows-powershell.md):35-45). The 5.1 `Add-Type` is mandatory (www-setup does it at `src/install.ps1:433`). 
- **`Split`.** The differences page documents the char-array-as-string overload loss with this exact example (`"1111p2222q3333".Split('pq')`, [lines 74-127](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/docs-conceptual/whats-new/differences-from-windows-powershell.md)); the measured 3 vs 1 confirms it.
- **7.5/7.6 breaking changes** (M-P-05): `ConvertTo-Json` serialises `BigInteger` as a number in 7.5 ([7.5 notes:29](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/docs-conceptual/whats-new/What-s-New-in-PowerShell-75.md)); 7.6 converts `Join-Path -ChildPath` to `string[]` and replaces `ThreadJob` with `Microsoft.PowerShell.ThreadJob` ([7.6 notes:31-37](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/docs-conceptual/whats-new/What-s-New-in-PowerShell-76.md)). Fixture `v76/changes-75-76.ps1` reproduces all three; none of them matters for a 5.1 script, all matter for a script that claims a 7.4 floor.

### 7. Reading scripts: BOM, ANSI, irm | iex, shebang

**How 5.1 reads a `.ps1`.** Without a BOM the engine reads source as the system ANSI code page; Microsoft: "ANSI is also what the PowerShell engine uses when it reads source code from files" ([about_Character_Encoding:148](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Character_Encoding.md)). Measured (`enc/`, `matrix.sh pwsh` plus host):

```powershell
$s = 'café'; $s.Length      # cafe-nobom.ps1 : 5.1 -> 5 (99 97 102 195 169)   7.4 -> 4   7.6 -> 4
                            # cafe-bom.ps1   : 5.1 -> 4   7.4 -> 4   7.6 -> 4
$s = 'caf' + [char]0xE9     # ascii-escape.ps1: 4 on all three
```

**The worse failure: curly-quote synthesis.** U+2014 (em dash) is UTF-8 `E2 80 94`; cp1252 decodes it as `â`, `€`, `”` (U+201D), and PowerShell treats U+201C-U+201E as double-quote characters:

```powershell
Write-Output "a — b"      # emdash-nobom.ps1 on 5.1: "The string is missing the terminator: "." (parse error, line 2)
                          # emdash-bom.ps1 on 5.1 -> prints "a - b" (console best-fit), emdash-escape.ps1 -> "a - b"; 7.4/7.6 print "a — b"
Write-Output ("a " + [char]0x2014 + " b")   # ASCII source, correct everywhere
```

The mechanism is specific to code page 1252; on CP932/936/949 hosts the bytes decode differently (unverified: read only). The fleet's current non-ASCII is comment-only (`grimoire/docs/public/install.ps1:1`, setup-grimoire `install.ps1:26,31`), which is why nothing broke.

**`irm | iex` (server-dependent).** Fixture `srv/` served by `serve.py` with three Content-Types; output of `irm-iex.sh`:

```text
ct       file          5.1                                7.6.6
utf8     cafe-nobom    len=4                              len=4
utf8     cafe-bom      ?$s : The term '?$s' is not re...  U+FEFF$s: The term ... is not recognized
utf8     ascii-escape  len=4                              len=4
plain    cafe-nobom    len=5                              len=4
plain    cafe-bom      ...$s : The term ... not recog...  U+FEFF$s: The term ... is not recognized
plain    ascii-escape  len=4                              len=4
```

(`utf8` = `text/plain; charset=utf-8`; `plain` = `text/plain`; `application/octet-stream` behaved like `plain`; 7.4.7 matched 7.6.6.) So on 5.1 BOM-less non-ASCII works only if the host serves a UTF-8 charset, and a BOM breaks every engine because `irm` keeps U+FEFF in the string. Real hosts differ: `raw.githubusercontent.com` and `setup.ocx.sh/pwsh` send `text/plain; charset=utf-8`, `community.chocolatey.org/install.ps1` sends `text/plain`, and `grimoire.rs/install.ps1` sends `application/octet-stream` (curl -I, 2026-10-11). The only content safe under all of them is ASCII with no BOM.

**Shebang.** A BOM before `#!/usr/bin/env pwsh`: `./sheb/bom.ps1: line 1: ï»¿#!/usr/bin/env: No such file or directory`, exit 127; the BOM-less twin prints `shebang-ok`, exit 0 (fixture `sheb/`). Microsoft: Unix tools "such as `cat`, `sed`, `awk` ... don't know how to treat the BOM" ([about_Character_Encoding:68-73](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Character_Encoding.md)).

**Reading data files.** `Get-Content` of a BOM-less UTF-8 file with `é` returns length 5 on 5.1, 4 on 7; `Get-Content -Encoding UTF8` and `[IO.File]::ReadAllText` return 4 on all engines (fixture `rd/read-enc.ps1`).

**Decision (M-S-01).**
1. Anything run on 5.1 or fetched by `irm | iex`: ASCII only, no BOM. Build non-ASCII text from `[char]0xE9`-style escapes; never paste typographic dashes, arrows, curly quotes or emoji.
2. A 5.1-bound file that must contain literal non-ASCII (rare: localised module data) is UTF-8 with BOM, run only by `-File`/import, never `iex`-served and never a shebang script; exclude nothing - `PSUseBOMForUnicodeEncodedFile` then agrees.
3. 7-only scripts may be UTF-8 without BOM; the BOM rule is excluded for that kind and the choice is documented in its settings file.

### 8. Writing files: bytes per writer and the safe idiom

Fixture `wr/write-enc.ps1` writes `caf<E9> <20AC> <4E2D>` with each writer; `od -An -tx1` of the files (full table in V14). Core rows, hex of the first bytes, 5.1 vs 7.4.7 = 7.6.6 (the 7.4 and 7.6 output directories were byte-identical, `diff -rq`):

| Writer | 5.1.26100.9444 | 7.x |
|---|---|---|
| `$t > f`, `$t \| Out-File f` | `ff fe 63 00 61 00 ...` UTF-16LE + BOM, CRLF | `63 61 66 c3 a9 ...` UTF-8, LF |
| `>>` / `Out-File -Append` | UTF-16LE + BOM again | UTF-8 |
| `Tee-Object f` | UTF-16LE + BOM | UTF-8 |
| `Set-Content f`, `Add-Content f` (new file) | `63 61 66 e9 20 80 20 3f` (cp1252; U+4E2D becomes `?`) | UTF-8 |
| `-Encoding utf8` (Out-File/Set-Content) | `ef bb bf` + UTF-8 | UTF-8 no BOM |
| `-Encoding utf8NoBOM`, `utf8BOM` | rejected: `does not belong to the set "unknown,string,unicode,bigendianunicode,utf8,utf7,utf32,ascii,default,oem"` | accepted |
| `-Encoding ascii` | `63 61 66 3f 20 3f 20 3f` | same |
| `-Encoding oem` | `63 61 66 82 ...` (cp437) | UTF-8 (parameter ignored) |
| `-Encoding unicode` | `ff fe ...` | `ff fe ...` |
| `Export-Csv` | ASCII, non-ASCII becomes `?` | UTF-8 |
| `New-Item -ItemType File -Value` | UTF-8, no BOM, no trailing newline | same |
| `[IO.File]::WriteAllText(p, t)` | UTF-8 no BOM | UTF-8 no BOM |
| `WriteAllText(p, t, (New-Object Text.UTF8Encoding $false))` | UTF-8 no BOM | UTF-8 no BOM |
| `$PSDefaultParameterValues['*:Encoding']='utf8'` then `>` | `ef bb bf` + UTF-8 (the `>` operator calls `Out-File`) | UTF-8 |

Append hazards. `Out-File -Append` after an `Out-File -Encoding utf8` write produced `ef bb bf 63 61 66 c3 a9 ... 0d 0a 63 00 61 00 66 00 ...`: a UTF-8 line followed by a UTF-16LE line in one file. `Add-Content` onto a UTF-8-with-BOM file kept UTF-8; onto a new or BOM-less file it uses the ANSI default. Microsoft's description matches: `Out-File -Append` and `>>` "make no attempt to match the encoding of the existing target file's content", `Add-Content` "detects the existing encoding" ([about_Character_Encoding:103-130](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Character_Encoding.md)). `$OutputEncoding` does not affect files: "It has no effect on the encoding that the output redirection operators and PowerShell cmdlets use to save to files" (same page, :218-220).

Safe idiom for 5.1-bound code (text, not binary):

```powershell
# CORRECT (identical bytes on 5.1, 7.4, 7.6): UTF-8, no BOM
[IO.File]::WriteAllText($path, $text + "`n", (New-Object System.Text.UTF8Encoding $false))
[IO.File]::AppendAllText($path, $line + "`n", (New-Object System.Text.UTF8Encoding $false))
'pure ascii' | Out-File -FilePath $path -Encoding ascii     # allowed only for data that is ASCII by construction

# WRONG on 5.1: encoding depends on edition, locale or the existing file
$text > $path ; $text | Out-File $path ; $text | Set-Content $path ; Add-Content $path $line ; $text | Out-File $path -Encoding utf8   # (BOM on 5.1)
```

The one external consumer measured is `$GITHUB_PATH`: GitHub's own example writes `Out-File -FilePath $env:GITHUB_PATH -Encoding utf8 -Append` ([workflow-commands:607](https://raw.githubusercontent.com/github/docs/main/content/actions/reference/workflows-and-actions/workflow-commands.md)) and Scoop's installer test copies it (`Scoop-Install@1e2f334083d6:.github/scripts/e2e-test.ps1:9`). On 5.1 that first write carries a BOM; how the runner tolerates it was not measured (unverified: read only). `[IO.File]::AppendAllText` with `UTF8Encoding($false)` avoids both unknowns.

### 9. Console, native pipes and ASCII messages

Fixture `nat/native-enc.ps1` (host 5.1 vs 7.6.6 Linux):

```text
5.1:   OutputEncoding=us-ascii  Console.Out=IBM437
       'café' | cmd /c "findstr . > f"      -> f = 63 61 66 3f 0d 0a                    ('?' for é)
       cmd /c type <utf-8 file with café>   -> string len=5  cp=0063 0061 0066 251C 2310  (mojibake: UTF-8 bytes decoded as cp437)
       after  [Console]::OutputEncoding = $OutputEncoding = New-Object Text.UTF8Encoding $false :
       pipe -> 63 61 66 c3 a9 0d 0a ; native stdout string len=4
7.6.6: OutputEncoding=utf-8  Console.Out=utf-8 ; pipe -> 63 61 66 c3 a9 0a ; len=4
```

(`[Text.Encoding]::Default` on the host is Windows-1252; the 5.1 `OutputEncoding` default is documented to change to UTF-8 NoBOM in 6.0: [differences:400](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/docs-conceptual/whats-new/differences-from-windows-powershell.md).) Output of a 5.1 script to a pipe uses the OEM page: `Write-Output ('caf'+[char]0xE9+' '+[char]0x2014+' '+[char]0x20AC+' '+[char]0x4E2D)` leaves 5.1 as bytes `c a f 202 - ? ?` (`0x82`, best-fit hyphen for the em dash, `?` for the euro and CJK), while 7.6 emits `c a f 303 251 342 200 224 ...` (fixture `nat/stdout-enc.ps1`, `od -c`). Therefore (M-S-04) help text and messages of a 5.1-bound script must be ASCII, matching rust cli-contract CLI-12 ("ASCII only", `rules/rust-quality/cli-contract.md:120`); where UTF-8 must reach a native program, wrap the call in the two-assignment save/restore shown above.

### 10. #Requires and module manifests

- `#Requires -Version N` and `#Requires -PSEdition Core` are enforced for files run by `-File`, dot-sourcing or direct invocation ([about_Requires](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Requires.md):26-28,173-181) and win over parse errors (finding 1). `#Requires -PSEdition Core` on 5.1: `The edition of PowerShell that is required by the script does not match the currently running PowerShell Desktop edition.`
- Under `iex` the line is a comment (measured), so an `irm | iex` installer repeats the check in code.
- Module gate (fixture `mod/`): `Test-ModuleManifest` reported `manifest-OK` for a module whose `.psm1` contains `$x ?? "dflt"`; `Import-Module` on 5.1 failed (exit 1), on 7.6 passed. The dual-edition manifest keys are `PowerShellVersion = '5.1'` and `CompatiblePSEditions = @('Desktop','Core')`; exemplar manifests: Pester `PowerShellVersion` 5.1, posh-git 5.0 ([exemplar-shape.md:567](../shell-audit/exemplar-shape.md)).

### 11. 7.4, 7.5, 7.6 changes older text gets wrong; lifecycle

- 7.4 breaking changes still quoted in older text: `Test-Json` no longer supports Draft 4 schemas and now rejects JSON with comments; `PSNativeCommandPreserveBytePipe` became mainstream ([7.4 notes:14-35](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/docs-conceptual/whats-new/What-s-New-in-PowerShell-74.md)). 7.4 added `-Encoding ansi` ([about_Character_Encoding:160](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Character_Encoding.md)), which 5.1 rejects (denylist D4).
- 7.7 preview (not for any floor): `New-Guid` default becomes version 7, `$PSApplicationOutputEncoding` is added, `Join-Path -Extension` ([7.7 notes](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/docs-conceptual/whats-new/What-s-New-in-PowerShell-77.md):21-26,73,81). The lifecycle page lists 7.7 preview with no dates.
- "Should 7.4 appear anywhere?" Only as a transitional parse-matrix column until 2026-11-10 for scripts that must still run on a 7.4 host; as a `#Requires` floor, never. After that date delete the column. A grep for stale floors is in V15.
- Windows PowerShell 5.1 has no entry on the PowerShell lifecycle page; it follows the Windows component lifecycle ([lifecycle:39-40](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/docs-conceptual/install/PowerShell-Support-Lifecycle.md)).

### 12. Defects found in the fleet and in ocx

Reported with file:line and reproducer; per owner decision Q6 none was fixed.

1. **ocx: `$PROFILE` path decoded as UTF-8 from a 5.1 stdout.** `ocx@5de9d777eb7d:crates/ocx_setup/src/profiles.rs:207` does `String::from_utf8_lossy(&output.stdout)` on `powershell -NoProfile -NonInteractive -Command $PROFILE.CurrentUserAllHosts` (:184-210; `pwsh` is tried first, `powershell` is the fallback). On 5.1 stdout is OEM-encoded. Reproducer: `powershell.exe -NoProfile -NonInteractive -Command "'C:\Users\M' + [char]0xFC + 'ller\x'" | od -An -c` gives `M 201 l l e r` (byte `0x81`, not valid UTF-8, so `from_utf8_lossy` produces U+FFFD and a wrong path); prefixing `[Console]::OutputEncoding = New-Object Text.UTF8Encoding $false;` gives `M 303 274 l l e r`. Affects any Windows user name with a non-ASCII letter on a machine without `pwsh`.
2. **www-setup: `Add-Content` to `$GITHUB_PATH`.** `www-setup@a251c3631047:src/install.ps1:721` and `setup-grimoire@1259e35b2550:.github/scripts/install.ps1:70`. On 5.1 `Add-Content` to a new or BOM-less file writes the ANSI page (`63 61 66 e9 ...` in `wr/out51/add-content-new.txt`), so a non-ASCII `$OcxHome` is written as cp1252 into a file the runner reads (as UTF-8 per the GitHub example; the runner's reader was not measured: unverified: read only). Suggested form: `[IO.File]::AppendAllText($env:GITHUB_PATH, $line + "`n", (New-Object Text.UTF8Encoding $false))`.
3. **grimoire: non-ASCII byte and no `#Requires` in an `irm | iex` target.** `grimoire@4650ad830375:docs/public/install.ps1:1` has an em dash in a comment (`PSUseBOMForUnicodeEncodedFile` fires; harmless today because it is comment-only) and no `#Requires -Version 5.1`. `grimoire.rs/install.ps1` is served as `application/octet-stream` with no charset (curl -I). Reproducer: `grep -rL -x -e '#Requires -Version 5.1' --include='*.ps1' fleet-copy` lists it and `setup-grimoire-install.ps1`.
4. **setup-grimoire: pwsh-only script without a floor.** `setup-grimoire@1259e35b2550:.github/scripts/install.ps1:52-53` uses `-MaximumRetryCount`/`-RetryIntervalSec` (6.0+) and has no `#Requires -Version 7.6`; on 5.1 it fails with `A parameter cannot be found that matches parameter name 'MaximumRetryCount'` instead of the clear `#requires` message (fixture `dn/iwr-params.ps1` shows the same error).

Fleet baseline re-measured: `www-setup/src/install.ps1`, `grimoire/docs/public/install.ps1` and `setup-grimoire/.github/scripts/install.ps1` all pass the 5.1 parse (`fleet-copy/`, V1-style run: `PARSE-OK` x3); the denylist D1-D7 over the three finds only the `Add-Content` and `-OutFile` calls above (4 findings, none a D1-D5 construct).

## Normative guidance candidates

"RUN" says whether the verification was run against a planted violation and its compliant twin; V-numbers refer to "Verification runs". Commands run from the fixture directory. Every grep prints the violation; empty output is a pass.

1. **Installers and bootstrap scripts target Windows PowerShell 5.1 and carry `#Requires -Version 5.1` as an exact line.** Rationale: the only inbox shell; `-File` enforces it. Verify: `grep -rL -x -e '#Requires -Version 5.1' --include='*.ps1' fleet-copy` (output = files lacking it). RUN: yes, V16 (on the real fleet copies: lists `grimoire-install.ps1` and `setup-grimoire-install.ps1`, passes `www-setup-install.ps1`).
2. **A script fetched by `irm | iex` re-checks the engine version in code, because `iex` ignores `#Requires`.** Rationale: measured, `Get-Content -Raw | iex` ran a `#Requires -Version 7.6` file on 5.1. Verify: reading heuristic - the file contains a `$PSVersionTable.PSVersion` comparison before any 7-only code (www-setup `src/install.ps1:731`). RUN: no (the `iex` behaviour was run, finding 10; the guard check is a reading heuristic).
3. **Repo, dev and CI scripts declare `#Requires -Version 7.6` and no lower 7.x floor.** Rationale: 7.4/7.5 end support 2026-11-10; runner images carry 7.6.x; `#Requires` beats parse errors on 5.1 so a mis-launched script fails readably. Verify: `grep -rL -x -e '#Requires -Version 7.6' --include='*.ps1' req-bad` (missing) and `grep -rn -e '#Requires -Version 7.0' -e '#Requires -Version 7.4' -e '#Requires -Version 7.5' --include='*.ps1' req-old` (stale). RUN: yes, V11 and V15.
4. **Modules set `PowerShellVersion = '5.1'` and `CompatiblePSEditions = @('Desktop','Core')`, and CI runs `Import-Module` on a real 5.1 and on 7.6; `Test-ModuleManifest` alone is not a gate.** Rationale: the manifest check passed a `.psm1` that the 5.1 parser rejects. Verify: `powershell -NoProfile -NonInteractive -File mod/check-modules.ps1` exit 0 (exit = failing imports). RUN: yes, V12 (5.1 exit 1 on `modbad`, 7.6 exit 0 on the same plant, twin `modgood` passes both).
5. **Every 5.1-bound `.ps1`/`.psm1` must pass `[Parser]::ParseFile` on Windows PowerShell 5.1; this is the authoritative syntax gate.** Rationale: PSSA misses leading-pipe, `&`, `clean`, `${a}?[0]`; a parse error is all-or-nothing. Verify: `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File parse.ps1 <dir>`; the output is the violation (`PARSE-ERR` lines). RUN: yes, V1 (11 of 23 plant files red on 5.1, 0 of 22 twins; all 23 and all 22 parse on 7.4.7 and 7.6.6).
6. **PSSA for 5.1-bound files enables `PSUseCompatibleSyntax` with `TargetVersions = @('5.1')` and gates on the diagnostic count.** Rationale: disabled by default; empty `TargetVersions` means `{5,6,7}`; `-EnableExit` wraps at 256 on Linux. Verify: settings `@{ Severity=@('Error','Warning'); IncludeRules=@('PSUseCompatibleSyntax'); Rules=@{ PSUseCompatibleSyntax=@{ Enable=$true; TargetVersions=@('5.1') } } }`; `$r = @(Invoke-ScriptAnalyzer -Path <dir> -Recurse -Settings <psd1>); if ($r.Count) { exit 1 }`. RUN: yes, V2 (exit 8 on plant, 0 on twin) and `wrap255/` `wrap256/` (255 then 0).
7. **For 5.1-bound files also enable `PSUseCompatibleCommands` and `PSUseCompatibleTypes` with profile `win-48_x64_10.0.17763.0_5.1.17763.316_x64_4.0.30319.42000_framework`, but treat them as partial.** Rationale: they catch 7-only parameters and type names (11 findings in V3); they miss post-7.0 commands (`ConvertTo-CliXml`) and .NET static members. Verify: PSSA with `Rules=@{ PSUseCompatibleCommands=@{Enable=$true;TargetProfiles=@('<id>')}; PSUseCompatibleTypes=... }`. RUN: yes, V3 (exit 11 on plant dirs, 0 on twins; the two blind spots are documented in finding 3).
8. **5.1-bound code is smoke-run on the 5.1 host (script `--help`/dry path under `powershell -NoProfile -NonInteractive -File`).** Rationale: the only check that sees .NET member differences and post-7.0 cmdlets. Verify: `matrix.sh win <script.ps1>` or `matrix.sh pwsh <script.ps1>` (which includes Windows PowerShell 5.1); exit non-zero is the violation. RUN: yes (runtime failures on 5.1 of `post70-cmd.ps1`, `dotnet-core-only.ps1`, `testjson.ps1`; `each.sh` runs).
9. **Never write `$o?.Prop` or `$a?[i]` with an unbraced variable; use `${o}?.Prop` in 7-only code and an explicit `$null` test in 5.1-bound code.** Rationale: it silently reads the variable `$o?` on every engine. Verify: AST check D1 (`variable named "o?"`). RUN: yes, V5 (`d1.ps1:2 D1`, twin `g1.ps1` clean on 5.1 and 7.6).
10. **5.1-bound code never reads `$IsWindows`/`$IsLinux`/`$IsMacOS`/`$IsCoreCLR` or `$PSVersionTable.Platform`/`.OS`; it uses `[Environment]::OSVersion.Platform -eq 'Win32NT'`, or `$PSVersionTable.PSEdition -eq 'Desktop' -or $IsWindows` with the edition test first.** Rationale: undefined on 5.1, terminating under StrictMode. Verify: AST checks D2 and D5. RUN: yes, V5 (`d2.ps1:1 D2`, `d5.ps1:1 D5`; twin passes).
11. **5.1-bound code never passes more than two path parts to `Join-Path`, and never uses `-AdditionalChildPath`; nest the calls.** Rationale: `A positional parameter cannot be found that accepts argument 'c'`. Verify: AST check D3. RUN: yes, V5 (`d3.ps1:1`, `:2`).
12. **Every `Invoke-WebRequest`/`iwr`/`curl`/`wget` in 5.1-bound code passes `-UseBasicParsing` (or the file sets `$PSDefaultParameterValues['Invoke-WebRequest:UseBasicParsing'] = $true` before the first call); `Invoke-RestMethod` is exempt.** Rationale: since 2025-12-09 the call prompts, then fails under `-NonInteractive` (exit 1) or throws a `NullReferenceException` with closed stdin; 7.x ignores the switch. Verify: AST check D7, or the coarse `grep -rlZ -i -e 'Invoke-WebRequest' -e '\biwr\b' --include='*.ps1' <dir> | xargs -r -0 grep -L -i -e 'UseBasicParsing'` (misses a comment that mentions the switch). RUN: yes, V5 (`d7.ps1:1,2`), V9 (exit 1 on plant, 0 on twin and on the `PSDefaultParameterValues` variant), V10.
13. **5.1-bound `.ps1`/`.psm1`/`.psd1` contain no byte above 0x7F; non-ASCII text is built from `[char]0xNNNN`.** Rationale: BOM-less UTF-8 reads as cp1252 on 5.1 (length 5), an em dash in a string breaks the parse, `irm | iex` decoding depends on the server. Verify: `grep -rl -P -e '[^\x00-\x7F]' --include='*.ps1' --include='*.psm1' --include='*.psd1' <dir>` (output = violations). RUN: yes, V6 (3 plant files listed, twin empty).
14. **No BOM on any `.ps1` that is fetched by `irm | iex` or starts with `#!`.** Rationale: the BOM makes `iex` report `?$s`/`U+FEFF$s` not recognised on 5.1, 7.4 and 7.6, and a BOM before a shebang exits 127. Verify: `LC_ALL=C grep -rl -P -e '^\xEF\xBB\xBF' --include='*.ps1' <dir>`. RUN: yes, V7 (plant listed, twin empty), V8 shows PSSA's BOM rule agrees for the other two plants; the `irm | iex` and shebang behaviours were run (`irm-iex.sh`, `sheb/`).
15. **7-only repo scripts may be UTF-8 without BOM; their PSSA settings exclude `PSUseBOMForUnicodeEncodedFile` for that kind only, and the exclusion is commented.** Rationale: the rule is always on and contradicts Microsoft's "avoid BOMs" for Unix-visible files. Verify: PSSA `-IncludeRule PSUseBOMForUnicodeEncodedFile` red on BOM-less non-ASCII files (reading heuristic that the exclusion sits in the 7-only settings file). RUN: yes for the rule (V8: exit 2 on plant, 0 on ASCII twin); no for the settings-file placement (reading heuristic).
16. **Text files written by 5.1-bound code use `[IO.File]::WriteAllText`/`AppendAllText` with `New-Object System.Text.UTF8Encoding $false`, or `-Encoding ascii` for data that is ASCII by construction; never `>`, `>>`, `Out-File`, `Set-Content`, `Add-Content`, `Tee-Object`, `Export-Csv` without `-Encoding ascii`, and never `-Encoding utf8`.** Rationale: UTF-16LE+BOM, cp1252, or BOM depending on cmdlet and edition. Verify: AST check D6; bytes check `pwsh -File bytes-check.ps1 <files>` (exit = files that are not BOM-free valid UTF-8). RUN: yes, V5 (`d6.ps1:1-4`), V13 (4 plant files red, exit 4; 3 twin files green, exit 0).
17. **5.1-bound code never passes `-Encoding utf8NoBOM`, `utf8BOM` or `ansi`.** Rationale: rejected by the 5.1 ValidateSet (106 occurrences of `utf8NoBOM` in the corpus). Verify: AST check D4, or `grep -rn -i -e 'utf8NoBOM' -e 'utf8BOM' -e '-Encoding ansi' --include='*.ps1' <dir>`. RUN: yes, V5 (`d4.ps1:1`); the grep form is the same pattern as V6 (no separate plant).
18. **Reading a text file that may be BOM-less UTF-8 on 5.1 uses `Get-Content -Encoding UTF8` or `[IO.File]::ReadAllText`.** Rationale: bare `Get-Content` decodes as ANSI (length 5). Verify: reading heuristic - flag `Get-Content` without `-Encoding`/`-Raw`-from-.NET on user-supplied files. RUN: no for a checker (the behaviour was run: `rd/read-enc.ps1`).
19. **When UTF-8 must reach or come from a native program on 5.1, set `[Console]::OutputEncoding` and `$OutputEncoding` to `New-Object System.Text.UTF8Encoding $false` around the call and restore both; otherwise keep native-bound text and all console messages ASCII.** Rationale: `us-ascii` pipe (`?`), IBM437 decode (mojibake), `0x82` on stdout. Verify: `matrix.sh win nat/native-enc.ps1` (look for `len=5` and `3f` before the fix, `c3 a9` after); messages: rule 13's grep on the message strings. RUN: yes (`nat/native-enc.ps1`, `nat/stdout-enc.ps1`).
20. **Before using `[System.IO.Compression.ZipFile]` in 5.1-bound code, `Add-Type -AssemblyName System.IO.Compression.FileSystem`.** Rationale: `Unable to find type` on 5.1. Verify: `grep -rlZ -e 'IO.Compression.ZipFile' --include='*.ps1' <dir> | xargs -r -0 grep -L -e 'Add-Type -AssemblyName System.IO.Compression.FileSystem'`. RUN: yes, V17 (plant listed, twin empty).
21. **Set TLS explicitly in 5.1-bound downloaders (`SecurityProtocol -bor Tls12`) and add `Tls13` only after confirming the enum member exists.** Rationale: `SystemDefault` suffices on the measured .NET 4.8 build, not on older Framework settings. Verify: reading heuristic (www-setup `src/install.ps1:337`). RUN: no (older-.NET behaviour unverified: read only).
22. **`Set-StrictMode -Version Latest` at the top of every script in both kinds.** Rationale: identical semantics on 5.1, 7.4.7 and 7.6.6 over eight probes. Verify: `grep -rL -e 'Set-StrictMode -Version Latest' --include='*.ps1' <dir>` (output = files lacking it). RUN: no for this grep (behaviour parity was run: `strict/strict-levels.ps1`).
23. **A 5.1 test job runs as `powershell -NoProfile -NonInteractive -File <script>` (never the built-in `shell: powershell` wrapper for download-heavy installers) and fails on a non-zero exit.** Rationale: the `-Command` wrapper closes stdin and turns the prompt into a `NullReferenceException`; `-NonInteractive` gives the deterministic message and exit 1. Verify: workflow reading heuristic (`shell: powershell {0}` vs custom `powershell -NoProfile -NonInteractive -File {0}`, [workflow-syntax:972-974](https://raw.githubusercontent.com/github/docs/main/content/actions/reference/workflows-and-actions/workflow-syntax.md)). RUN: no (the two invocation shapes were run on the host, V9; the workflow wiring is PS-GATE).

## Verification runs

Run on 2026-10-11 by `fixtures/compat-and-encoding/verify.sh` (output saved in `verify.out`); host Windows PowerShell 5.1.26100.9444, pwsh 7.6.6 and 7.4.7 via `matrix.sh pwsh` / `each.sh`. Fixture root: `/home/mherwig/.cache/research-lang/shell-tools/fixtures/compat-and-encoding/`. 5.1 files are staged under `C:\Users\ecom\shell-wintest\compat-and-encoding\`.

**V1 - 5.1 parse gate.** `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File parse.ps1 ps7only` (plant) and `... parse.ps1 twins` (twin). Exit of `-File` runs is not the count (the count below is the evidence).
```text
files with parse errors on plant: 11          files with parse errors on twin: 0
andand.ps1: PARSE-ERR(1) The token '&&' is not a valid statement separator in this version.
bgop.ps1: PARSE-ERR(1) The ampersand (&) character is not allowed. ...
chain-ternary-nested.ps1 (4)   clean-block.ps1 (2) Missing closing '}'   leading-pipe.ps1: An empty pipe element is not allowed.
nullcoalassign.ps1  nullcoalesce.ps1  nullcond-index.ps1: Unexpected token '?[0]'  nullcond-member-braced.ps1: Unexpected token '?.Name'
oror.ps1  ternary.ps1
```
On 7.4.7 and 7.6.6 the same command (`matrix.sh pwsh parse.ps1 ps7only`) printed `PARSE-OK` for all 23 files, `-> exit 0`.

**V2 - PSSA `PSUseCompatibleSyntax`, `TargetVersions=5.1`** (`pssa-51.psd1`; pwsh 7.6.6, PSSA 1.25.0): `Invoke-ScriptAnalyzer -Path ps7only -Recurse -Settings ./pssa-51.psd1 -EnableExit` -> plant exit 8, twin (`twins`) exit 0.
```text
andand.ps1:1  chain-ternary-nested.ps1:1 (x2)  nullcoalassign.ps1:1  nullcoalesce.ps1:1  nullcond-member-braced.ps1:2  oror.ps1:1  ternary.ps1:1   (all PSUseCompatibleSyntax)
```
Red but incomplete: 7 of the 11 files V1 rejects; the 4 it misses are leading-pipe, `&`, `clean`, `${a}?[0]`.

**V3 - PSSA `PSUseCompatibleCommands` + `PSUseCompatibleTypes`**, profile `win-48_x64_10.0.17763.0_5.1.17763.316_x64_4.0.30319.42000_framework` (`pssa-cmds-51.psd1`): plant dirs `ps7only` + `dn` exit 11, twin `twins` exit 0.
```text
asbytestream  ashashtable  parallel  testjson  post70-param (Join-Path -Extension)  iwr-params x4 (MaximumRetryCount, RetryIntervalSec, SkipHttpErrorCheck, SkipCertificateCheck)  -> PSUseCompatibleCommands
type-core-only.ps1:1,2 (System.Text.Json.JsonDocument, System.Net.Http.SocketsHttpHandler) -> PSUseCompatibleTypes
silent: post70-cmd.ps1 (ConvertTo-CliXml), dn/dotnet-core-only.ps1 ([Convert]::ToHexString, [IO.Path]::GetRelativePath)   <- known blind spots
```

**V4 - negative control.** Default `Invoke-ScriptAnalyzer -Path ps7only -Recurse` (no settings): rules fired are `PSAvoidUsingPositionalParameters`, `PSUseDeclaredVarsMoreThanAssignments`; nothing about syntax. This did not go red on the 7-only syntax, which is the point (rule disabled by default).

**V5 - AST denylist** `denylist-51.ps1 den/bad` / `den/good` (written in 5.1 syntax; same result on both engines): 5.1 plant exit 13, 5.1 twin exit 0; 7.6 plant exit 13, twin exit 0.
```text
d1.ps1:2 D1 variable named "o?": ?. and ?[] need ${name}; ...      d2.ps1:1 D2 $IsWindows is undefined on 5.1 ...
d3.ps1:1 D3 Join-Path with >2 path parts needs 6.0+ ...            d3.ps1:2 D3 -AdditionalChildPath needs 6.0+
d4.ps1:1 D4 -Encoding utf8NoBOM is rejected on 5.1                 d5.ps1:1 D5 $PSVersionTable.Platform is absent on 5.1
d6.ps1:1 D6 redirection > out.txt writes UTF-16LE+BOM ...         d6.ps1:2-4 D6 Set-Content / Out-File / Add-Content without -Encoding ascii
d7.ps1:1 D7 Invoke-WebRequest without -UseBasicParsing ...         d7.ps1:2 D7 iwr without -UseBasicParsing ...
```
Twin `g1.ps1` contains the compliant forms, including `> $null`, `2>&1`, a splatted `UseBasicParsing`, `-Encoding ascii` and the `PSEdition -eq 'Desktop' -or $IsWindows` guard. Over the fleet copies it reports 4 findings (`setup-grimoire-install.ps1:52,53,70`, `www-setup-install.ps1:721`).

**V6 - non-ASCII grep.** `grep -rl -P -e '[^\x00-\x7F]' --include='*.ps1' --include='*.psm1' --include='*.psd1' enc-bad` -> `cafe-bom.ps1`, `emdash-nobom.ps1`, `cafe-nobom.ps1`, exit 0; same on `enc-good` (`ascii-escape.ps1`, `emdash-escape.ps1`) -> empty, exit 1 (grep "no match" = pass).

**V7 - BOM grep.** `LC_ALL=C grep -rl -P -e '^\xEF\xBB\xBF' --include='*.ps1' enc-bad` -> `enc-bad/cafe-bom.ps1`, exit 0; `enc-good` -> empty, exit 1.

**V8 - PSSA BOM rule.** `Invoke-ScriptAnalyzer -Path enc-bad -Recurse -IncludeRule PSUseBOMForUnicodeEncodedFile -EnableExit` -> `emdash-nobom.ps1`, `cafe-nobom.ps1`, exit 2 (it does not flag the BOM'd `cafe-bom.ps1`, which V7 catches); `enc-good` exit 0.

**V9 - iwr under `-NonInteractive -File` on the 5.1 host.** `iwr-bad/iwr.ps1`: `Invoke-WebRequest : Windows PowerShell is in NonInteractive mode. Read and Prompt functionality is not available.` exit 1. `iwr-good/iwr-basic.ps1`: `status=200` exit 0. `iwr-good/iwr-pdv.ps1` (PSDefaultParameterValues): `status=200` exit 0. Other shapes (stdin `/dev/null` -> `NullReferenceException` exit 1; `-OutFile` only OK; `-OutFile -PassThru` FAIL; `irm` OK; `iwr -UseB` abbreviation OK) are in finding 5, from `iwr/variants.ps1`.

**V10 - iwr file-level grep.** `grep -rlZ -i -e 'Invoke-WebRequest' -e '\biwr\b' --include='*.ps1' iwr-bad | xargs -r -0 grep -L -i -e 'UseBasicParsing'` -> `iwr-bad/iwr.ps1`, `iwr-bad/iwr-iex.ps1`; same on `iwr-good` -> empty. (An earlier plant whose comment mentioned the switch evaded it; the plant was rewritten without the comment. The xargs exit status is 123 even on the plant, so judge by output, not exit status.)

**V11 - `#Requires` present.** `grep -rL -x -e '#Requires -Version 7.6' --include='*.ps1' req-bad` -> `req-bad/chain-no-req.ps1`; `... req-good/req76-chain.ps1` -> empty.

**V12 - module import.** `check-modules.ps1`: 5.1 prints `modbad: manifest-OK import-FAIL`, `modgood: manifest-OK import-OK`, exit 1; 7.6.6 prints `import-OK` for both, exit 0 (the 7.6 side is a deliberate negative control: only 5.1 goes red).

**V13 - bytes check.** `pwsh -File bytes-check.ps1` on files written by 5.1: plant `redirect.txt: UTF-16LE BOM`, `out-file-utf8.txt: UTF-8 BOM`, `set-content.txt: not valid UTF-8 (ANSI/OEM bytes)`, `tee-object.txt: UTF-16LE BOM`, exit 4; twin `io-writealltext-utf8nobom-explicit.txt`, `io-writealltext.txt`, `new-item-value.txt`: `ok`, exit 0.

**V14 - writer matrix** (`wr/write-enc.ps1 -Out ...`, hex via `od -An -v -tx1`; 5.1 | 7.6.6; 7.4.7 identical to 7.6.6):
```text
redirect.txt           ff fe 63 00 61 00 66 00 e9 00 20 00 ac 20 20 00 2d 4e 0d 00 0a 00 | 63 61 66 c3 a9 20 e2 82 ac 20 e4 b8 ad 0a
set-content.txt        63 61 66 e9 20 80 20 3f 0d 0a                                      | 63 61 66 c3 a9 20 e2 82 ac 20 e4 b8 ad 0a
out-file-utf8.txt      ef bb bf 63 61 66 c3 a9 20 e2 82 ac 20 e4 b8 ad 0d 0a              | 63 61 66 c3 a9 ... 0a
out-file-ascii.txt     63 61 66 3f 20 3f 20 3f 0d 0a                                      | 63 61 66 3f 20 3f 20 3f 0a
out-file-oem.txt       63 61 66 82 20 3f 20 3f 0d 0a                                      | UTF-8
out-file-append-onto-utf8.txt  ef bb bf ... 0d 0a 63 00 61 00 66 00 e9 00 ...            | UTF-8 twice
export-csv.csv         22 61 22 0d 0a 22 63 61 66 3f 20 3f 20 3f 22 0d 0a                 | UTF-8
io-writealltext*.txt   63 61 66 c3 a9 20 e2 82 ac 20 e4 b8 ad 0a                          | same
ERR on 5.1: out-file-utf8nobom, out-file-utf8bom, set-content-utf8nobom ("does not belong to the set")
```

**V15 - stale floor grep.** `grep -rn -e '#Requires -Version 7.0' -e '#Requires -Version 7.4' -e '#Requires -Version 7.5' --include='*.ps1' req-old` -> `req-old/a.ps1:1:#Requires -Version 7.4`, rc 0; `req-ok` -> empty, rc 1.

**V16 - 5.1 `#Requires` line on the fleet copies.** `grep -rL -x -e '#Requires -Version 5.1' --include='*.ps1' fleet-copy` -> `fleet-copy/grimoire-install.ps1`, `fleet-copy/setup-grimoire-install.ps1` (red; `www-setup-install.ps1` carries the line). Twin: `www-setup-install.ps1` alone.

**V17 - ZipFile grep.** `grep -rlZ -e 'IO.Compression.ZipFile' --include='*.ps1' zip-bad | xargs -r -0 grep -L -e 'Add-Type -AssemblyName System.IO.Compression.FileSystem'` -> `zip-bad/z.ps1`; `zip-good` -> empty.

**Behaviour runs behind the findings** (not verifications): `irm-iex.sh` (finding 7 table), `req/` (`#Requires`), `plat/`, `strict/`, `dotnet/`, `v76/`, `nat/`, `rd/`, `sheb/`, `wrap255/` `wrap256/` (PSSA `-EnableExit` exits 255 and 0). No verification proposed above failed to go red where red was expected; the three that are red-but-incomplete are V2 (7 of 11), V3 (blind spots) and V10 (comment evasion), and each is paired with a stronger check (V1, V5/host smoke run, V5-D7).

## Exemplar evidence

Corpus SHAs: [exemplar-shas.md](../shell-audit/scratch/exemplar-shas.md).

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| 1 `#Requires -Version 5.1` for installers | `ScoopInstaller/Install@1e2f334083d6:.github/scripts/e2e-test.ps1:1`, `test/bin/init.ps1:1`, `test/bin/test.ps1:1`; `www-setup@a251c3631047:src/install.ps1:50` | `grimoire@4650ad830375:docs/public/install.ps1` (none); `ScoopInstaller/Scoop@e6aa3b366bde:bin/install.ps1:1` uses `-Version 5` (lower, still 5.x) |
| 3 `#Requires -Version 7.6` for repo scripts | `vcpkg@e456309491fd:.github/scripts/close-inactive-prs.ps1:1` (`7.0`, an older but declared floor) | `setup-grimoire@1259e35b2550:.github/scripts/install.ps1` (pwsh-only, no `#Requires`) |
| 5 parse on 5.1 | 591 third-party ps1 outside the PowerShell and PSSA repos: all but one parse ([exemplar-shape.md:662](../shell-audit/exemplar-shape.md)); fleet 25/26 on 5.1.26100 / 7.4.7 / 7.6.6 ([fleet-shell-shape.md:46](../shell-audit/fleet-shell-shape.md)) | `vcpkg@e456309491fd:ports/vulkan-sdk-components/get-vulkan-sdk-components-info.ps1:54-55` (line starts with `\|`; "An empty pipe element is not allowed" on 5.1; the one production hit in 1,327 files, 52 failing in total, 46 of them PowerShell-repo test fixtures) |
| 12 `-UseBasicParsing` | `dotnet/install-scripts@e5cf1dd2d154:src/dotnet-install.ps1:188,652,679` (7 of 7 files), Scoop 3 files, runner-images 5 files | 24 of 41 IWR files in my re-count (12 PowerShell-repo tests); `setup-grimoire` (-OutFile, pwsh-only) |
| 13/14 ASCII, no BOM | `www-setup@a251c3631047:src/install.ps1` is ASCII (`file -b`: ASCII text, [fleet-shell-shape.md:487](../shell-audit/fleet-shell-shape.md)); fleet has 0 BOMs | `grimoire@4650ad830375:docs/public/install.ps1:1` and `setup-grimoire@1259e35b2550:.github/scripts/install.ps1:26,31` (comment em dashes); Pester test files in www-setup/setup-grimoire carry comment em dashes (9 authored files, all comments, per [fleet-shell-shape.md:504](../shell-audit/fleet-shell-shape.md)) |
| 16 writer idiom | `www-setup@a251c3631047:src/install.ps1:772` `[System.IO.File]::WriteAllText($caPath, ...)`; `ScoopInstaller/Install@1e2f334083d6:.github/scripts/e2e-test.ps1:9` (`Out-File -Encoding utf8 -Append`, the GitHub-documented form, BOM on 5.1) | `www-setup@a251c3631047:src/install.ps1:721`, `setup-grimoire@1259e35b2550:.github/scripts/install.ps1:70` (`Add-Content`); `dotnet/install-scripts@e5cf1dd2d154:eng/common/tools.ps1:213,736` (`Set-Content` without encoding); corpus `-Encoding` tally: `utf8NoBOM` 106, `ascii` 92, `utf8` 67, `Unicode` 14, `utf7` 18 ([exemplar-shape.md:536](../shell-audit/exemplar-shape.md)) |
| 10 platform detection | `www-setup@a251c3631047:src/install.ps1:99-105` (PSEdition shortcut); ocx shim `ocx@5de9d777eb7d:crates/ocx_setup/src/shims.rs:113-130` uses `$env:OS -eq 'Windows_NT'` and `$HOME`, ASCII only, with the comment "reading an unset $env: var is StrictMode-safe" | `$IsWindows` family in 222 corpus files, 200 in the PowerShell repo (which targets 7) |
| 6 PSSA settings | `www-setup@a251c3631047:PSScriptAnalyzerSettings.psd1` (excludes `PSUseApprovedVerbs`, `PSUseSingularNouns`, `PSUseShouldProcessForStateChangingFunctions`; leaves the BOM rule on) | no repo in the fleet or corpus enables `PSUseCompatibleSyntax`; posh-git, Scoop and Scoop-Install ship `Severity` + `ExcludeRules` settings without it ([exemplar-shape.md:565](../shell-audit/exemplar-shape.md)) |
| 19 native encoding | - | `ocx@5de9d777eb7d:crates/ocx_setup/src/profiles.rs:207` (`from_utf8_lossy` on 5.1 stdout, finding 12.1) |

## AI-agent angle

| What an LLM characteristically gets wrong | Smallest mechanical check |
|---|---|
| Writes `&&`, `\|\|`, `? :`, `??`, `??=` in a script labelled 5.1 or an installer (trained on 7-era blog posts) | `parse.ps1` on the 5.1 host (V1); PSSA-S (V2) |
| Wraps a long pipeline with a leading `\|` (vcpkg did it) or ends a line with `&` | V1 only (PSSA does not see it) |
| Writes `$obj?.Prop` believing it is null-conditional | AST D1 (V5) |
| Uses `$IsWindows` as the platform test; puts it before the edition test | AST D2, D5 (V5) |
| Writes `iwr`/`Invoke-WebRequest ... \| Select -Expand Content` as the download idiom without `-UseBasicParsing`, or uses the `curl`/`wget` alias | AST D7 (V5), V9 |
| Assumes `>`, `Out-File`, `Set-Content` and `-Encoding utf8` mean "UTF-8 without BOM" | AST D6, `bytes-check.ps1` (V13) |
| Reaches for `-Encoding utf8NoBOM` (106 corpus uses) in a 5.1 script | AST D4 |
| Pastes typographic dashes, arrows, curly quotes or emoji into strings and help text | `grep -P '[^\x00-\x7F]'` (V6) |
| "Fixes" encoding by adding a BOM to an installer served by `irm \| iex` or to a `#!` script | BOM grep (V7) |
| `Join-Path a b c`, `ConvertFrom-Json -AsHashtable`, `Test-Json`, `ForEach-Object -Parallel`, `Get-Content -AsByteStream` | PSSA-C (V3), AST D3 |
| .NET Core-only members: `[Convert]::ToHexString`, `[IO.Path]::GetRelativePath`, `SHA256.HashData`, `Path.Join` | run on the 5.1 host (no static check sees them) |
| Uses `[System.IO.Compression.ZipFile]` without `Add-Type` | V17 |
| Declares `#Requires -Version 7.4` (or 7.0) as the floor; forgets that `iex` ignores `#Requires` | V15; rule 2 reading heuristic |
| Trusts `Test-ModuleManifest` or PSSA exit status as a pass | V12; count-based gate (rule 6) |
| Quotes the Learn warning and adds `-UseBasicParsing` to `Invoke-RestMethod` and everything else out of caution, or removes it from `Invoke-WebRequest` because "7 ignores it" | D7 is scoped to `Invoke-WebRequest`/aliases; `irm` is exempt |
| Hallucinated flags specific to this subarea: treats `-Confirm:$false` as a way to silence the iwr prompt (the parameter does not exist on the cmdlet) | host run in finding 5 table |

## Contested / evolving

- **BOM or no BOM.** Microsoft says both "save as UTF-8 with BOM if you need non-ASCII" and "avoid BOMs for compatibility" ([about_Character_Encoding:56-73](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Character_Encoding.md)); PSSA's rule is always on and prefers BOM. Trend as of 2026-10: PowerShell 7 defaults to `utf8NoBOM`, so the disagreement only exists for 5.1-bound files, and the way out used here is ASCII-only.
- **"There is no way to bypass this prompt."** The 5.1 `Invoke-WebRequest` page says so; the KB revised on 2025-12-20 recommends `$PSDefaultParameterValues['Invoke-WebRequest:UseBasicParsing'] = $true`, and it measured as working (exit 0). Practitioner reports of breakage (`Index was out of range` for DOM-parsing scripts) are in the [Devolutions thread](https://forum.devolutions.net/topics/54812/kb5074596--changes-to-invokewebrequest); scripts that need the DOM cannot add the switch.
- **Is `Invoke-RestMethod` next?** The 5.1 `Invoke-RestMethod` page repeats the script-execution warning (:43-45) but no prompt was observed on build 5.1.26100.9444 (KB5129195, 2026-09-15). Re-measure after each cumulative update; the candidate rule deliberately exempts `irm` and says why.
- **`-OutFile` exemption.** Observed, consistent with the KB text "scripts that only download content ... are not affected", but not guaranteed; the rule requires the switch anyway.
- **PSSA compatibility profiles.** The bundled profiles stop at PowerShell 7.0 and no newer profile is published in the repository listing; the practical trend is to test on the target engine rather than to maintain profiles. PSSA itself dropped 3/4 support in 1.24 (minimum host 5.1).
- **Does 5.1 still need a target?** Windows 11 24H2 still ships only 5.1 inbox and Microsoft's own 5.1 advisory recommends 7+ "for modern handling"; no inbox 7 appears in any lifecycle page. Stable for 2026; revisit if a Windows release bundles pwsh.
- **7.4/7.5 end on 2026-11-10 and 7.7 is preview** (7.7-preview.3 on the lifecycle page, preview.5 in the 7.7 notes). Anything that names 7.4 as a floor is stale within 30 days.
- **Not resolved here:** pwsh 7 on Windows encoding behaviour (not installed on the host), CP932/936/949 hosts, and macOS - all marked unverified.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://learn.microsoft.com/en-us/powershell/scripting/install/powershell-support-lifecycle (read as https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/docs-conceptual/install/PowerShell-Support-Lifecycle.md) | Official support lifecycle, end-of-support table | ms.date 08/13/2026 | 7.4/7.5 EOS 10-Nov-2026, 7.6 EOS 14-Nov-2028 (primary) |
| https://learn.microsoft.com/powershell/scripting/whats-new/differences-from-windows-powershell (raw: .../docs-conceptual/whats-new/differences-from-windows-powershell.md) | 5.1 vs 7.x differences and breaking changes | ms.date 02/04/2026 | `.Split`, `$OutputEncoding`, `$?`, .NET method changes (primary) |
| https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_character_encoding (raw: .../7.6/Microsoft.PowerShell.Core/About/about_Character_Encoding.md) | Encoding per cmdlet, BOM rules, 5.1 vs 7 | page ms.date 03/09/2023, 7.6 branch | Per-writer behaviour, BOM advice (primary) |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/5.1/Microsoft.PowerShell.Utility/Invoke-WebRequest.md | Invoke-WebRequest 5.1 reference with the CVE-2025-54100 warning | 2025-12 onward | The "no way to bypass" statement (primary) |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/5.1/Microsoft.PowerShell.Utility/Invoke-RestMethod.md | Invoke-RestMethod 5.1 reference | 2025-12 onward | Warning text vs measured behaviour (primary) |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Utility/Invoke-WebRequest.md | Invoke-WebRequest 7.6 reference | 7.6 era | `-UseBasicParsing` deprecated, no effect (primary) |
| https://support.microsoft.com/en-us/servicing/os/windows/2025/12/powershell-5-1-invoke-webrequest-preventing-script-execution-from-web-content | KB5074596, Microsoft advisory | published 2025-12-09, revised 2025-12-20 | Default No, CI hang, `$PSDefaultParameterValues` workaround (primary) |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Operators.md | Operators incl. null-conditional | 7.6 era | Braces required for `?.`/`?[]` (primary) |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Pipeline_Chain_Operators.md | `&&`/`\|\|` | ms.date 06/21/2023 | "Beginning in PowerShell 7" (primary) |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Pipelines.md | Pipelines incl. leading-pipe continuation | 7.6 era | "PowerShell 7 adds support for continuation ... at the beginning of a line" (primary) |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Requires.md | `#Requires` | 7.6 era | Version/edition syntax (primary) |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/docs-conceptual/whats-new/What-s-New-in-PowerShell-73.md | What's new 7.3 | 7.3 era | `clean` block (primary) |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/docs-conceptual/whats-new/What-s-New-in-PowerShell-74.md | What's new 7.4 | 7.4.20 | Breaking changes (`Test-Json`), `-Encoding ansi` (primary) |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/docs-conceptual/whats-new/What-s-New-in-PowerShell-75.md | What's new 7.5 | 7.5.11 | `ConvertTo-Json` BigInteger, CliXml cmdlets (primary) |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/docs-conceptual/whats-new/What-s-New-in-PowerShell-76.md | What's new 7.6 | 7.6.6, ms.date 09/08/2026 | `Join-Path`, ThreadJob module rename (primary) |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/docs-conceptual/whats-new/What-s-New-in-PowerShell-77.md | What's new 7.7 preview | 7.7.0-preview.5 | `New-Guid` v7, `$PSApplicationOutputEncoding` (primary) |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/docs-conceptual/whats-new/Migrating-from-Windows-PowerShell-51-to-PowerShell-7.md | Migration guide | ms.date 04/02/2024 | Side-by-side install, separate profiles (primary; skimmed) |
| https://github.com/PowerShell/PSScriptAnalyzer/blob/main/docs/Rules/UseCompatibleSyntax.md (read raw: .../main/docs/Rules/UseCompatibleSyntax.md) | PSSA rule documentation | ms.date 07/21/2026 | Default disabled, `TargetVersions` (primary) |
| https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/Rules/CompatibilityRules/UseCompatibleSyntax.cs | PSSA rule source | main, 2026 | Visitor list = exact coverage; default `{5,6,7}` (primary) |
| https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/docs/Rules/UseCompatibleCommands.md | PSSA rule doc | ms.date 07/21/2026 | Profile id format, union-profile logic (primary) |
| https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/docs/Rules/UseCompatibleTypes.md | PSSA rule doc | ms.date 07/21/2026 | Types only, default disabled (primary) |
| https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/docs/Rules/UseBOMForUnicodeEncodedFile.md | PSSA rule doc | ms.date 07/21/2026 | Always enabled, Warning (primary) |
| https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/CHANGELOG.MD | PSSA changelog | 1.24.0 / 1.25.0 | `-EnableExit` count (1.24.0), min host 5.1 (primary) |
| https://api.github.com/repos/PowerShell/PSScriptAnalyzer/contents/PSCompatibilityCollector/profiles | Directory listing of bundled compatibility profiles | 2026-10-11 | Profiles stop at 7.0 (primary) |
| https://raw.githubusercontent.com/actions/runner-images/main/images/ubuntu/Ubuntu2404-Readme.md | Ubuntu 24.04 image inventory | image 2026-10 | PowerShell 7.6.6 preinstalled (primary) |
| https://raw.githubusercontent.com/actions/runner-images/main/images/windows/Windows2025-Readme.md | Windows 2025 image inventory | image win25/20261004.281 | PowerShell 7.6.6 (primary) |
| https://raw.githubusercontent.com/actions/runner-images/main/images/windows/Windows2022-Readme.md | Windows 2022 image inventory | image win22/20261004.326 | PowerShell 7.6.6 (primary) |
| https://raw.githubusercontent.com/actions/runner-images/main/images/macos/macos-15-Readme.md | macOS 15 image inventory | 2026-10 | PowerShell 7.6.4 (primary) |
| https://raw.githubusercontent.com/github/docs/main/content/actions/reference/workflows-and-actions/workflow-syntax.md | GitHub Actions workflow syntax | 2026 | `pwsh`/`powershell` built-in shell semantics (primary) |
| https://raw.githubusercontent.com/github/docs/main/content/actions/reference/workflows-and-actions/workflow-commands.md | GitHub Actions workflow commands | 2026 | `$GITHUB_PATH` write idiom `Out-File -Encoding utf8 -Append` (primary) |
| https://forum.devolutions.net/topics/54812/kb5074596--changes-to-invokewebrequest | Practitioner report on KB5074596 | 2026 | Real-world breakage (`Index was out of range`); secondary |
| https://github.com/microsoft/vcpkg (corpus clone `microsoft__vcpkg@e456309491fd`) | Exemplar with 7-only leading pipe | corpus SHA 2026-10-10 | The only production 5.1 parse failure in 591 files |
| https://github.com/dotnet/install-scripts (corpus clone `@e5cf1dd2d154`) | Exemplar installer that passes `-UseBasicParsing` | corpus SHA 2026-10-10 | Reference practice for 5.1 downloaders |
| https://github.com/ScoopInstaller/Install (corpus clone `@1e2f334083d6`) | Exemplar installer with `#Requires -Version 5.1` and the documented `$GITHUB_PATH` idiom | corpus SHA 2026-10-10 | Reference practice for 5.1 installers |
| `/home/mherwig/dev/grimoire-lore/.agents/worktrees/shell/.agents/research/shell-audit/{exemplar-shape,fleet-shell-shape,installers,platform-matrix}.md` | Wave-1 audits of the fleet and corpus | 2026-10-10 | Baseline counts re-measured above; internal |

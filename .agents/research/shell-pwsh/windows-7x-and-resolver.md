---
title: pwsh 7.x on Windows - encoding and console, Test-CommandResolves precision, IncludeRules vs ParseError, the runner-file writer
topic: PowerShell 5.1 and 7 (PS-COMPAT, PS-ENC, PS-ERR, PS-NATIVE, PS-GATE); revision of shell-pwsh.md, PS-* IDs held stable; rule family PS-ENC with PS-GATE-01/02/06 and the X8 hand-off to SH-CI-11
agent: windows-7x-and-resolver
model: sonnet
date_researched: 2026-10-11
sources_count: 22
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/windows-7x-and-resolver/
scope: |
  Covers: the four open questions of the brief, measured on the Windows host (de-DE, ANSI cp1252, system OEM cp437) with Windows PowerShell 5.1.26100.9444 and the portable pwsh 7.4.7 and 7.6.6 zips under C:/Users/ecom/shell-wintest/: default encodings, writer bytes, BOM-less source reads, -Encoding oem; Test-CommandResolves over the 1,327-file PowerShell corpus on 5.1 plus planted hallucinations; IncludeRules-only settings (dotnet shape) against ParseError; the X8 runner-file writer.
  Not covered: a hosted windows-latest runner (the runner readers are emulated from actions/runner source, not observed on a hosted job); hosts whose ANSI code page is not 1252 or whose system locale is UTF-8 (unverified: read only); interactive consoles and Windows Terminal (all runs were non-interactive through WSL interop); macOS (no host). Pester, the GHA wrapper and `irm` prompting belong to other groups.
---

# pwsh 7.x on Windows, the resolver, IncludeRules and the runner-file writer

Revision input for [shell-pwsh.md](../shell-pwsh.md). Date of every measurement: 2026-10-11. Host facts: Windows PowerShell 5.1.26100.9444, pwsh 7.4.7 (.NET 8) and 7.6.6 (.NET 10), culture de-DE, `GetACP` 1252, `GetOEMCP` 437, `GetConsoleOutputCP` 437 (`final-q1-probe-enc.out`, `final-q1-oem-which.out`). pwsh 7.4 is at 7.4.20 upstream and ends support 2026-11-10; 7.6 is the LTS to 2028-11-14 ([lifecycle](https://learn.microsoft.com/en-us/powershell/scripting/install/powershell-support-lifecycle)), so 7.4.7 is a stale patch of a line with a month left: read every "7.4.7" result as "7.4 line".

All fixture file names below are relative to the fixture directory in the frontmatter. `winrun.sh <51|74|76|all> script.ps1` stages the directory to `C:\Users\ecom\shell-wintest\windows-7x-and-resolver` and runs the script under the named engines; `matrix.sh win` covers only 5.1 and Git Bash, so the 7.x Windows rows use this harness.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - 1. [Encoding and console on 7.x Windows (question 1)](#1-encoding-and-console-on-7x-windows-question-1)
   - 2. [Writer bytes, per cmdlet and engine](#2-writer-bytes-per-cmdlet-and-engine)
   - 3. [Reading BOM-less UTF-8, curly quotes, `-Encoding oem`](#3-reading-bom-less-utf-8-curly-quotes--encoding-oem)
   - 4. [The native boundary](#4-the-native-boundary)
   - 5. [Do PS-ENC-01..06 change](#5-do-ps-enc-0106-change)
   - 6. [Test-CommandResolves precision (question 2)](#6-test-commandresolves-precision-question-2)
   - 7. [IncludeRules without Severity (question 3)](#7-includerules-without-severity-question-3)
   - 8. [The runner-file writer (X8)](#8-the-runner-file-writer-x8)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- **PS-GATE-06 stays SHOULD.** On the 5.1 host the untuned resolver flagged 8 of 178 authored non-test files in the 17 small repos for a defect that does not exist for the file's own target (4.5%), and 30 of its 33 findings there were false (optional modules, Chocolatey helpers, version-gated blocks); it caught 13 of 13 planted hallucinated cmdlets and parameters.
- Ship the resolver as an advisory check on the target host with `-Allow` wildcards and version-gate suppression. That tuned variant leaves 4 findings in the 17 small repos (all real 7-only constructs; the allow-list was written from the corpus, so out-of-sample precision is unmeasured).
- Run the resolver only on the host the script targets: `Get-CimInstance` and `Get-NetAdapter` are red on Linux pwsh 7.6.6 and green on WinPS 5.1 (`final-q2-host-run.out`).
- The resolver is blind to .NET members and to values: `[IO.Path]::GetRelativePath`, `[Math]::Clamp` and `-Encoding utf8NoBOM` all throw on 5.1 and all exit 0 (`final-q2-plants-miss-run.out`); keep the 5.1 parse and run gates beside it.
- **IncludeRules with no Severity reports ParseError** on 5.1, 7.4.7 and 7.6.6 (PSSA 1.25.0): dotnet's settings shape is safe; only a `Severity` that omits `ParseError` drops it. PS-GATE-01 must say "if `Severity` is set it lists `ParseError`", not "`ParseError` is in `Severity`" (the old wrapper exited 2 on valid IncludeRules-only files).
- dotnet's real defect is different: 3 of its 9 `IncludeRules` names do not exist in PSSA 1.25.0 (`PSStandardDSCFunctionsInResource` and two more lack the `DSC` prefix) and PSSA silently ignores unknown names; the wrapper's unknown-rule check exits 2 on that file.
- **X8 is not a conflict on 5.1.** `AppendAllText(UTF8Encoding($false))` and `Out-File -Encoding utf8 -Append` each decode correctly through the runner's readers into a fresh empty file, and they compose in both orders (the BOM is written only when the file is empty). What corrupts is `>>`, `Out-File` without `-Encoding utf8`, and `Add-Content` with non-ASCII, in 7 of 21 measured writer sequences.
- X8 text: PS-ENC-03 keeps `AppendAllText` as the default writer; SH-CI-11 accepts exactly `AppendAllText(...UTF8Encoding($false))` or `Out-File -Encoding utf8 -Append` and bans every other writer on 5.1. Both are safe alone and mixed with each other.
- 7.x writes UTF-8 without BOM for `>`, `Out-File`, `Set-Content`, `Add-Content`, `Tee-Object` and `Export-Csv`, but not for every encoding name: `-Encoding unicode|utf32|oem|ansi|utf8BOM` still differ, and `[Text.Encoding]::UTF8` still carries a BOM. PS-ENC-03's "7.x is UTF-8 without BOM everywhere" must be narrowed.
- `-Encoding Default` means cp1252 on 5.1 and UTF-8 without BOM on 7.4.7/7.6.6 (and is absent from the 7.6 documented value list): ban locale-dependent names `Default`, `OEM`, `ANSI` outside a named consumer boundary.
- `-Encoding oem` writes the system OEM code page (437 here), not the console code page (`chcp 850` changed `GetConsoleOutputCP` to 850 and the bytes stayed 437) and not the culture's OEM (850), on 5.1, 7.4.7 and 7.6.6 alike.
- 7.x reads a BOM-less UTF-8 `.ps1` as UTF-8 on a cp1252 host (U+2019 survives, length 4 instead of 6), so PS-ENC-06 is confirmed on Windows; the docs sentence "ANSI is also what the PowerShell engine uses when it reads source code" is true of 5.1 only.
- U+2018..U+201E (seven characters) are quote tokens on all three engines: `Write-Output "He said “hi” ok"` silently yields 2 outputs on 7.4.7/7.6.6 with a correct UTF-8 decode, and `'it’s'` is a parse error. Forbid them in code positions of every `.ps1`, 7.6-only files included.
- On 7.x `$OutputEncoding` is already UTF-8 but `[Console]::OutputEncoding` is still the OEM code page (cp437): decoding a native child's UTF-8 stdout needs `[Console]::OutputEncoding` set (length 8 mojibake to 5 correct); `$OutputEncoding` is irrelevant there.
- Capturing native stdout: `child > file` preserves bytes on 7.4.7/7.6.6 and writes UTF-16 mojibake on 5.1; `child | Out-File` and `| Set-Content` re-encode through cp437 on all three (`c3 a9` becomes `e2 94 9c e2 8c 90`).
- Docs lag measurement twice: `New-ModuleManifest` is UTF-8 without BOM on Windows 7.x (the breaking-change note says non-Windows only), and `Out-File -Append` does not adapt to the existing file on any engine while `Add-Content` does.

## Findings

### 1. Encoding and console on 7.x Windows (question 1)

Probe `probe-enc.ps1` (output `final-q1-probe-enc.out`):

```text
== WinPS 5.1       OutputEncoding=us-ascii/cp20127 bom=0   Console.Out=IBM437/cp437  ANSI=Windows-1252/cp1252
== pwsh 7.4.7      OutputEncoding=utf-8/cp65001    bom=0   Console.Out=ibm437/cp437  ANSI=utf-8/cp65001  (Encoding.Default)
== pwsh 7.6.6      OutputEncoding=utf-8/cp65001    bom=0   Console.Out=ibm437/cp437  ANSI=utf-8/cp65001
   (all: OEM culture=850 ANSIcp=1252 culture=de-DE; GetOEMCP=437 GetACP=1252 GetConsoleOutputCP=437)
```

- `$OutputEncoding` is `us-ascii` on 5.1 and UTF-8 without BOM on 7.x. The documented default is UTF-8 ([about_Preference_Variables 7.6](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Preference_Variables.md) line 886-900) and the 6.0 breaking change is recorded in [differences-from-windows-powershell](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/docs-conceptual/whats-new/differences-from-windows-powershell.md) line 400.
- `[Console]::OutputEncoding` and `[Console]::InputEncoding` stay at the OEM code page (437 on this host) on all three engines. The two variables are therefore no longer aligned on 7.x, although the preference-variable page says they should be.
- `[Text.Encoding]::Default` is the real ANSI code page on 5.1 (`cp1252`) and UTF-8 on 7.x (.NET Core). That is why `-Encoding Default` changes meaning (finding 2).
- Caveat: every run was non-interactive through WSL interop. `chcp 850` before the run moved `GetConsoleOutputCP` to 850 (`cmd.exe /c "chcp 850 & powershell.exe -File oem-which.ps1"`), so a console was attached, but an interactive Windows Terminal session and a host with the "Use Unicode UTF-8 for worldwide language support" system locale (ACP 65001) were not measured (unverified: read only).

### 2. Writer bytes, per cmdlet and engine

Text `"caf" + U+00E9 + U+2019 + U+4E2D` (`write-bytes.ps1`, `write-bytes2.ps1`; outputs `final-q1-write-bytes.out`, `final-q1-write-bytes2.out`). Hex, trailing `0d 0a` is the cmdlet newline.

| Writer | WinPS 5.1 | pwsh 7.4.7 and 7.6.6 (identical) |
|---|---|---|
| `>`, `>>` on a fresh file, `Out-File`, `Tee-Object` | `ff fe 63 00 61 00 66 00 e9 00 19 20 2d 4e 0d 00 0a 00` (UTF-16LE + BOM) | `63 61 66 c3 a9 e2 80 99 e4 b8 ad 0d 0a` (UTF-8, no BOM) |
| `Set-Content`, `Add-Content` (no `-Encoding`) | `63 61 66 e9 92 3f 0d 0a` (cp1252; U+4E2D becomes `?`: data loss) | UTF-8 no BOM, as above |
| any of those with `-Encoding utf8` | `ef bb bf 63 61 66 c3 a9 ...` (BOM) | no BOM |
| `Export-Csv` (no `-Encoding`) | `22 61 22 0d 0a 22 63 61 66 3f 3f 3f 22 0d 0a` (ASCII: `caf???`) | UTF-8 no BOM; `-Encoding utf8` no BOM |
| `Export-Clixml`, `New-ModuleManifest` | `ff fe ...` (UTF-16LE + BOM) | UTF-8 no BOM, on Windows too |
| `-Encoding oem` | `63 61 66 82 27 3f 0d 0a` (cp437: é=`82`, U+2019=`27` best fit, U+4E2D=`3f`) | identical bytes |
| `-Encoding ascii` | `63 61 66 3f 3f 3f 0d 0a` | identical |
| `-Encoding unicode`, `utf32` | UTF-16LE + BOM, UTF-32LE + BOM | identical |
| `-Encoding default` | `63 61 66 e9 92 3f 0d 0a` (cp1252) | `63 61 66 c3 a9 e2 80 99 e4 b8 ad 0d 0a` (UTF-8, no BOM) |
| `-Encoding ansi` | rejected by the ValidateSet | `63 61 66 e9 92 3f 0d 0a` (cp1252; 7.4+) |
| `-Encoding utf8NoBOM`, `utf8BOM` | rejected | no BOM / `ef bb bf` |
| `-Encoding 1252`, `windows-1252` | rejected | `63 61 66 e9 92 0d 0a` |
| `[IO.File]::WriteAllText(p, t)` and `(..., UTF8Encoding($false))` | `63 61 66 c3 a9 ...` (no BOM) | identical |
| `[IO.File]::WriteAllText(p, t, [Text.Encoding]::UTF8)` | `ef bb bf ...` (BOM) | `ef bb bf ...` (BOM, same trap on 7.x) |

Facts read off the table:

- The 5.1 column matches the documented per-cmdlet list ([about_Character_Encoding 7.6](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Character_Encoding.md) lines 101-122, and the 5.1 page), including `Export-Csv` = ASCII and `Export-Clixml`/`New-ModuleManifest` = UTF-16LE.
- The documented 7.x default ("`utf8NoBOM` for all output", same page line 55 and 172) holds for the redirection operators and the cmdlets, but not for the explicit names above.
- `New-ModuleManifest` on Windows 7.x is UTF-8 without BOM (`23 0d 0a 23 20 4d ...`); the breaking-change note says "on non-Windows platforms" ([differences](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/docs-conceptual/whats-new/differences-from-windows-powershell.md) lines 412-415). The doc understates the change.
- `-Encoding default` is accepted by 7.4.7 and 7.6.6 although the 7.6 `Out-File` value list ends `OEM, Unicode, UTF7, UTF8, UTF8BOM, UTF8NoBOM, UTF32` ([Out-File 7.6](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Utility/Out-File.md) line 229-233): undocumented on 7.x, and it is UTF-8 there.
- Append behaviour (5.1, `write-bytes2.ps1`): after `Set-Content -Encoding utf8` (BOM file), `Add-Content` appended UTF-8 (`c3 a9 e2 80 99`) and `Out-File -Append` appended UTF-16LE (`63 00 61 00 ...`) into the same file. This is the documented "Out-File -Append makes no attempt to match the encoding of the existing target" and "Add-Content detects the existing encoding" (about_Character_Encoding 7.6 lines 124-134), confirmed.

### 3. Reading BOM-less UTF-8, curly quotes, `-Encoding oem`

`read-nobom.ps1` parses and runs six sources (each ASCII bytes plus U+2019 or U+2014, with and without BOM) on all engines (`final-q1-read-nobom.out`). Source `dq-*`: `"it’s"`; `sq-*`: `'it’s'`; `emdash-*`: `"a—b"`.

```text
                 WinPS 5.1                              pwsh 7.4.7 / 7.6.6
dq-nobom         parseErrors=0 len=6 (it + â€™ + s)      parseErrors=0 len=4 cps=0069 0074 2019 0073
dq-bom           parseErrors=0 len=4                     parseErrors=0 len=4
sq-nobom         parseErrors=0 len=6 (silent mojibake)   parseErrors=2  ParseException
sq-bom           parseErrors=2  ParseException           parseErrors=2  ParseException
emdash-nobom     parseErrors=2  ParseException           parseErrors=0 len=3
emdash-bom       parseErrors=0 len=3                     parseErrors=0 len=3
Import-Module apos-mod.psm1 (BOM-less): 5.1 0069 0074 00e2 20ac 2122 0073   7.x 0069 0074 2019 0073
```

- 7.4.7 and 7.6.6 on a cp1252 Windows host decode a BOM-less UTF-8 file as UTF-8 for scripts, `Get-Content -Raw` and `Import-Module`. PS-ENC-01's file-encoding hazard is a 5.1 property only, and PS-ENC-06 ("7.6-only scripts may be UTF-8 without BOM") is confirmed on Windows, not just on Linux.
- The docs sentence "`Get-Content` and `Import-PowerShellDataFile` uses the `Default` ANSI encoding. ANSI is also what the PowerShell engine uses when it reads source code from files" ([about_Character_Encoding 7.6](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Character_Encoding.md) lines 147-149) sits in the Windows PowerShell list; on 7.x it is false (measured: `Get-Content -Raw dq-nobom.ps1` contains U+2019 on 7.x, mojibake U+2122 on 5.1).
- Curly quotes are code, not text. `quote-chars.ps1` asked the tokenizer which of U+2010..U+2040 delimit a string: `U+2018 U+2019 U+201A U+201B U+201C U+201D U+201E` on 5.1, 7.4.7 and 7.6.6 (`final-q1-quote-chars.out`), matching [about_Quoting_Rules](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Quoting_Rules.md) line 39-44 ("treats smart quotation marks ... as normal quotation marks").
- The silent case (`curly/bad/dq-curly-silent.ps1`, `final-q1-curly-iex.out`): `Write-Output "He said “hi” ok"` prints one line on 5.1 (mojibake, `outputs=1`) and two lines on 7.4.7/7.6.6 (`He said ` and `hi ok`, `outputs=2`) with no parse error. A 7.6-only file that is correctly decoded still changes meaning.
- `-Encoding oem` (`oem-which.ps1`, `final-q1-oem-which.out`): bytes `4f ec 82` for `Ø ∞ é` on all three engines. In cp437 `Ø` has no code and best-fits to `O` (`4f`), `∞` is `ec`, `é` is `82`; cp850 would give `9d` for `Ø` and has no `∞`. `GetOEMCP=437`. After `chcp 850` (`GetConsoleOutputCP=850`) the bytes were still `4f ec 82`. `-Encoding oem` therefore follows the system OEM code page, not the console code page and not the culture's OEM code page (850, from `CultureInfo.TextInfo.OEMCodePage`). The docs say only "the default encoding for MS-DOS and console programs".
- `irm | iex` and a leading U+FEFF (`iex-bom.ps1`): `Invoke-Expression ([char]0xFEFF + 'Write-Output ok')` fails on 5.1, 7.4.7 and 7.6.6 with `The term '?Write-Output' is not recognized` (`final-q1-curly-iex.out`): PS-ENC-02 holds on Windows 7.x.

### 4. The native boundary

`native-enc.ps1` and `native-to-file.ps1` use two tiny C# executables in `bin/` (`emit.exe` writes the UTF-8 bytes `63 61 66 c3 a9 e2 80 99 0d 0a`; `stdin2hex.exe` prints the bytes it reads). Outputs `final-q1-native-enc.out`, `final-q1-native-to-file.out`.

```text
                                           WinPS 5.1                  pwsh 7.4.7 / 7.6.6
stdin to child, default                    63 61 66 3F 3F 0D 0A       63 61 66 C3 A9 E2 80 99 0D 0A
stdin to child, $OutputEncoding=UTF8       63 61 66 C3 A9 E2 80 99... (n/a, already UTF-8)
child stdout decoded, default              len=8 cps 0063 0061 0066 251c 2310 0393 00c7 00d6   (same on all)
child stdout, [Console]::OutputEncoding=UTF8   len=5 cps 0063 0061 0066 00e9 2019               (same on all)
child > file                               ff fe 63 00 61 00 66 00 1c 25 10 23 ...  (UTF-16LE)   63 61 66 c3 a9 e2 80 99 0d 0a (bytes preserved)
child | Out-File                           ff fe ... mojibake                      63 61 66 e2 94 9c e2 8c 90 ce 93 c3 87 c3 96 0d 0a
child | Set-Content                        63 61 66 2b ac 47 c7 d6 0d 0a           63 61 66 e2 94 9c e2 8c 90 ce 93 c3 87 c3 96 0d 0a
cmd /c "child > file"                      63 61 66 c3 a9 e2 80 99 0d 0a  (all three)
```

- On 7.x only the decode side needs work: `[Console]::OutputEncoding = New-Object Text.UTF8Encoding $false` turns the mojibake into the right text; assigning `$OutputEncoding` does nothing for it because it only governs what PowerShell writes to the child's stdin ([about_Character_Encoding 7.6](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Character_Encoding.md) line 218-221).
- `child > file` preserving bytes is the documented 7.4 change ([about_Redirection 7.6](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Redirection.md) lines 76-82 and 215-219: "PowerShell preserves the byte-stream data when redirecting the stdout stream of a native command to a file"). `Out-File` and `Set-Content` are not covered by it and re-encode the decoded text. The doc page does not warn about that asymmetry.
- All of this is unchanged between 7.4.7 and 7.6.6; there is no 7.6-specific delta in the native boundary on this host.

### 5. Do PS-ENC-01..06 change

| Rule | Verdict for 7.4/7.6 on Windows | What changes |
|---|---|---|
| PS-ENC-01 (MUST, ASCII-only 5.1-bound files) | unchanged | Scope sentence stays: the hazard is 5.1-only. Add a pointer to the curly-quote rule (N5): the quote characters matter on every engine. |
| PS-ENC-02 (MUST, no BOM on `iex`/shebang files) | confirmed | `iex` of a U+FEFF-prefixed string fails on 7.4.7 and 7.6.6 Windows (finding 3). |
| PS-ENC-03 (MUST, writers) | text amended | Narrow "7.x is UTF-8 without BOM everywhere" (finding 2); ban locale-dependent names (N2); keep the 5.1-rejected-values clause (N3); X8 writer text (finding 8). Level stays MUST. |
| PS-ENC-04 (SHOULD, reads) | amended | The hazard is two-directional: a file that 5.1 wrote with `Set-Content` (cp1252) reads as U+FFFD on 7.x (`read-legacy.ps1`: `63 61 66 fffd`), and a BOM-less UTF-8 file reads as `00c3 00a9` on 5.1. Pass `-Encoding` in both directions. |
| PS-ENC-05 (SHOULD, native boundary) | amended | 5.1: set `[Console]::OutputEncoding` and `$OutputEncoding`. 7.x: only `[Console]::OutputEncoding` (finding 4). Add the file-capture rule (N10). |
| PS-ENC-06 (SHOULD, 7.6-only BOM-less) | confirmed, one caveat | Measured on Windows (finding 3). Caveat: no curly quotes in code positions. |

No rule loses its MUST/SHOULD level. Two clauses need new text (PS-ENC-03, PS-ENC-05) and two get an addendum (PS-ENC-04, PS-ENC-06).

### 6. Test-CommandResolves precision (question 2)

Tool: `resolver/Test-CommandResolves.ps1` (baseline, the PS-GATE-06 asset) and `resolver/Test-CommandResolves-tuned.ps1`. The baseline walks `CommandAst` nodes with `System.Management.Automation.Language.Parser.ParseFile`, asks `Get-Command` on the host (which auto-imports modules that are installed, [Get-Command 7.6](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/Get-Command.md) lines 49-51), and with `-CheckParameters` compares each `-Parameter` to the resolved command's parameter and alias names (prefix match allowed, like the binder). Suppression layers, each counted on the summary line: names without a hyphen (natives), functions defined in the file or under `-DefinedRoot`, files importing a module the host lacks, Pester command parameters, `Get-Command`-probed names, dynamic names and splats, `-Allow`. Exit 0 clean, 1 findings, 2 misconfigured.

**Corpus.** 20 repos, 1,327 `.ps1`/`.psm1` files under `C:\Users\ecom\shell-wintest\exemplar-shape\src` (SHAs in shell-audit/scratch/exemplar-shas.md), run on WinPS 5.1 with `-CheckParameters -DefinedRoot <repo>`: 6 min 35 s wall (`corpus-run.log`, ~0.3 s per file), identical findings on a second full run (`resolver/corpus-5.1.txt` vs `.prev.txt`). Per-repo summary lines: `resolver/corpus-5.1.sum`.

| Measure (5.1 host, baseline, all 1,327 files) | Count |
|---|---|
| findings | 1,225 = 617 unresolved commands + 556 unknown parameters + 52 parse-error files (skipped by the tool, reported) |
| files flagged | 225 of 1,327 (17.0%) |
| unresolved commands that resolve on 7.6.6 (5.1 gap, true for a 5.1 target) | 247 |
| unresolved on 7.6.6 as well | 370 over 89 distinct names |
| unknown parameters that exist on 7.6.6 | 490 |
| unknown on 7.6.6 as well | 66 |
| parse-error files on 5.1 / on 7.6.6 / on both | 52 / 6 / 5 (47 are 7-only syntax) |
| suppressed, never silent | not-verb-noun 39,683; defined 12,277; dynamic 2,107; module-missing 242; guarded 150; Pester-params 16 |

`resolver/corpus-classify.py` and `resolver/split-kinds.py` produce these. Splitting by file kind (test = `*.Tests.ps1`, `/test/`, `/tests/`, `/e2e`, fixtures; everything else authored):

| Slice | Files | Files flagged | Findings |
|---|---|---|---|
| authored | 389 | 32 (8.2%) | 76 |
| test | 938 | 193 (20.6%) | 1,097 |
| authored, excluding PowerShell/PowerShell, PSScriptAnalyzer and Pester (the installer-like repos) | 178 | 12 (6.7%) | 33 |

The three large repos are PowerShell's own test suites: their "unresolved" names are fixtures (`Get-CimTest`, `Get-Commmand`, `Write-Ouput`, `Wrong-Cmd`) or commands of modules the 5.1 host lacks (`Invoke-Formatter` x100, `Set-ItResult` x91, `Test-ScriptAnalyzerSettingsFile` x37); none is a hallucination in shipped code.

**The 33 findings in the 178 installer-like authored files** (`resolver/corpus-5.1.txt`, read line by line):

| Class | n | Examples | Verdict for the file's own target |
|---|---|---|---|
| optional module commands, no `Import-Module` | 21 | 20 x `*-Az*` in `microsoft__vcpkg@e456309491fd:scripts/azure-pipelines/windows/create-image.ps1:98-277`; `Get-AzContext` in `JanDeDobbeleer__oh-my-posh@b0a8acd4d402:src/shell/scripts/omp.ps1:289` | false positive |
| Chocolatey host-provided helpers | 5 | `Get-ToolsLocation`, `Install-ChocolateyZipPackage` in `dahlbyk__posh-git@bbc5ac380018:chocolatey/tools/chocolateyInstall.ps1:2,17`; `Install-ChocolateyPackage` in `starship__starship@d4d0459c5c24:install/windows/choco/chocolateyInstall.install.ps1:22` | false positive |
| version-gated by `$PSVersionTable` | 3 | `-AsByteStream` at `posh-git@bbc5ac380018:src/Utils.ps1:353` (guard at :352), `-ThrottleLimit`/`-Parallel` at `ScoopInstaller__Scoop@e6aa3b366bde:libexec/scoop-update.ps1:189` (guard at :188) | false positive |
| optional module probed by a different mechanism | 1 | `Get-GitStatusFromCache` at `posh-git@bbc5ac380018:src/GitUtils.ps1:281` (`Get-Module GitStatusCachePoshClient` at :275) | false positive |
| commands/parameters that exist on 7.x only, in scripts that are not 5.1-bound | 3 | `-AsHashtable` at `vcpkg@e456309491fd:.github/scripts/close-inactive-prs.ps1:80`, `Get-SecureRandom` at `create-image.ps1:71`, `Join-String` at `scripts/boost/generate-ports.ps1:332` | correct if the script were 5.1-bound; not a defect for a 7-only script |

So 30 of 33 findings (91%) and 8 of 178 files (4.5%: posh-git 4, oh-my-posh 1, Scoop 1, starship 2) are false positives for a must-pass gate, and zero are hallucinations. The four vcpkg files (three of the classes above plus one parse error at `ports/vulkan-sdk-components/get-vulkan-sdk-components-info.ps1:55`, "An empty pipe element is not allowed") hold real 5.1 incompatibilities.

**Catch rate** (plants under `plants/bad`, twins under `plants/good`, 5.1; outputs `final-q2-plants-run.out`):

| Plant class | Files | names | `-CheckParameters` | `-CheckParameters -Strict` |
|---|---|---|---|---|
| hallucinated cmdlets `Get-FileContent`, `Invoke-RestRequest`, `Test-FileExists`, `ConvertTo-Yaml`, `Write-ColorOutput`, `Get-EnvironmentVariable`, `Invoke-ShellCommand` (`c01..c07`) | 7 | 7 of 7 | 7 of 7 | 7 of 7 |
| hallucinated parameters `-Recurse` on `Test-Path`, `-MaxDepth` on `Get-ChildItem`, `-Overwrite` on `Copy-Item`, `-Retries` on `Invoke-WebRequest`, `-Recurse` on `Select-String`, `-Recursively` on `Remove-Item` (`p01..p06`) | 6 | 0 | 6 of 6 | 6 of 6 |
| 7-only commands/parameters on a 5.1 target (`Join-String`, `-AsHashtable`, `-SkipHttpErrorCheck`, `-AsByteStream`; `g01..g04`) | 4 | 1 | 4 of 4 | 4 of 4 |
| nested scriptblock, `function global:` typo, typo beside a `Get-Command` probe (`e04`, `e06`, `e07`) | 3 | 3 | 3 | 3 |
| name masked by an unavailable `Import-Module` (`e01`) | 1 | miss (suppressed `module-missing`) | miss | caught |
| splatted parameters, dynamic `& $name` (`e02`, `e03`) | 2 | miss | miss | miss |
| valid abbreviation `-Timeout` (`p04b`), twin of `-TimeoutSec` | 1 | silent (correct) | silent | silent |

Per level: 11, 20 and 21 findings; every twin run is 0 findings, exit 0 (25 files). The 13 planted hallucinations (7 cmdlets, 6 parameters) are caught 13 of 13 with `-CheckParameters`. Misses `e01` (needs `-Strict`, which reopens the module false positives), `e02`, `e03` are structural: no static name or parameter set.

**What it cannot see** (`plants/miss`, `final-q2-plants-miss-run.out`): `[IO.Path]::GetRelativePath(...)` and `[Math]::Clamp(5,1,3)` fail on 5.1 with "does not contain a method named", and `Get-Content -Encoding utf8NoBOM` fails with "Cannot convert value ... to type FileSystemCmdletProviderEncoding"; the resolver exits 0 on all of them. They are .NET members and parameter values, outside a command-name check.

**Tuned variant** (wildcard `-Allow`, plus `version-guarded`: skip commands inside an `if` whose condition mentions `$PSVersionTable`, `$IsWindows`, `$IsLinux`, `$IsMacOS`, `$IsCoreCLR` or `$PSEdition`). Over the 17 small repos (`corpus-run-tuned.sh`, 26 s, allow-list `'*-Az*','*Chocolatey*','Get-ToolsLocation','Invoke-ScriptAnalyzer','Set-ItResult','New-PesterConfiguration','Get-GitStatusFromCache'`): 4 findings remain, all real 7-only constructs in vcpkg (`resolver/corpus-tuned.txt`). On the plants it keeps 20 findings. The price (`guard-run.sh`, `final-q2-guard-run.out`): a hallucination inside a version gate is suppressed (`if ($PSVersionTable.PSVersion.Major -ge 7) { Get-FileContent }` exits 0 tuned, 1 untuned). The allow-list was derived from the same corpus, so the 4-finding result is a tuned-on-test number; out-of-sample precision is not measured.

**Host dependence** (`host-run.sh`, `final-q2-host-run.out`): `Get-CimInstance` and `Get-NetAdapter` are `unresolved command` (exit 1) on Linux pwsh 7.6.6 and resolve (exit 0) on WinPS 5.1.

**Decision: SHOULD, not MUST.** A MUST gate would have failed 8 of 178 correct installer-like files (and, untuned, 193 of 938 test files) and the only real finding class (7-only constructs) is already covered by the 5.1 parse and compat checks of PS-COMPAT-02/PS-GATE-04. The 13 of 13 plant catch rate is the value; the 91% false-finding rate on real code is the cost of running it without an allow-list.

### 7. IncludeRules without Severity (question 3)

Settings built in dotnet's shape ([dotnet/install-scripts@e5cf1dd2d154:eng/common/PSScriptAnalyzerSettings.psd1:1-10](https://github.com/dotnet/install-scripts/blob/e5cf1dd2d1540ed05ac84f8eb8c5cdec2807621e/eng/common/PSScriptAnalyzerSettings.psd1): `@{ IncludeRules = @(9 names) }`, no `Severity`). `incl-run.ps1` crosses six settings with a parse-error file, a violation and a clean file on three engines (PSSA 1.25.0; `final-q3-incl-run.out`, identical on 5.1, 7.4.7, 7.6.6):

```text
settings        bad\parse-error.ps1                                   viol\iex.ps1                      good\clean.ps1
dotnet          n=2 ParseError:MissingEndCurlyBrace,MissingNameAfterKeyword   n=1 Warning:PSAvoidUsingInvokeExpression   n=0
inc-sev-noPE    n=0                                                  n=1 Warning                       n=0     (Severity = Error,Warning)
inc-sev-PE      n=2 ParseError ...                                    n=1 Warning                       n=0     (Severity incl. ParseError)
inc-sev-onlyPE  n=2 ParseError ...                                    n=0                               n=0
exc-only        n=2 ParseError ...                                    n=1 Warning                       n=0
empty           n=2 ParseError ...                                    n=1 Warning                       n=0
```

- **Verdict: an IncludeRules-only settings file reports ParseError.** Parse errors are not rules, so `IncludeRules` does not filter them; with `Severity` absent they pass. The source says so: `severity == null || severity.Contains("ParseError", ...)` at [ScriptAnalyzer.cs lines 1488 and 1902](https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/Engine/ScriptAnalyzer.cs) (PSScriptAnalyzer@411c3d0b197b).
- Fail-open is `Severity` set without `ParseError` (`inc-sev-noPE`: n=0 on a file that does not parse). With raw `-EnableExit` (`incl-enableexit.sh`, `final-q3-incl-enableexit.out`): IncludeRules-only on the broken file exits 4 (count of findings), `Severity = Error,Warning` exits 0, `Severity` with `ParseError` exits 4; the clean file exits 0 in all three.
- The wrapper text in PS-GATE-01 ("checks ... that `ParseError` is in `Severity`") is wrong for an absent `Severity`: the shipped wrapper in `analyzer-profile` exited 2 on valid IncludeRules-only settings (`Invoke-PSGate-old.ps1`: "Severity must list ParseError", exit 2 on `inc-valid` and `dotnet`). The corrected check (`Invoke-PSGate.ps1`) fails only when `Severity` is present and omits `ParseError` ("absent Severity reports all severities, ParseError included"). `incl-gate.sh`, `final-q3-incl-gate.out`: new wrapper on `inc-valid` exit 1 (2 files, 4 findings) / clean exit 0; `inc-sev-noPE` exit 2; `inc-sev-PE` exit 1.
- dotnet's own settings have a different defect. `rules-known.ps1` lists 75 rules on 1.25.0 and the DSC ones carry a `PSDSC` prefix; dotnet's file names `PSStandardDSCFunctionsInResource`, `PSUseIdenticalMandatoryParametersForDSC`, `PSUseIdenticalParametersForDSC`, none of which exists. `incl-unknown.ps1` (`final-q3-incl-unknown.out`): an unknown name in `IncludeRules` produces no error, no warning and no finding (`typo-only n=0`; `real+typo` still reports the real rule); the wrapper's unknown-rule check exits 2 on `dotnet.psd1` ("unknown rule name(s) in settings"). Three of dotnet's nine rules have never run.

### 8. The runner-file writer (X8)

**Reader emulation.** The runner creates each step's env files empty: `File.Create(newPath).Dispose()` ([FileCommandManager.cs:56](https://github.com/actions/runner/blob/main/src/Runner.Worker/FileCommandManager.cs), actions/runner@67f01c276e0a). `GITHUB_PATH` is read with `File.ReadAllLines(filePath, Encoding.UTF8)` (:138), `GITHUB_ENV`/`GITHUB_OUTPUT`/`GITHUB_STATE` with `File.ReadAllText(_filePath)` (:369). Both detect a BOM. `runner-file.ps1` and `runner-file2.ps1` reproduce those two reads over a runner-created empty file (not a hosted run; unverified on a hosted `windows-latest` job).

**Bytes** (WinPS 5.1; `final-x8-runner-file.out`, `final-x8-runner-file2.out`; lines `A=1` then `B=caf<e-acute>`):

| Sequence | Bytes (first 14) | Reader result |
|---|---|---|
| `AppendAllText(UTF8Encoding($false))` x2 | `41 3d 31 0a 42 3d 63 61 66 c3 a9 0a` (12) | ENV ok, PATH `[A=1][B=café]` |
| `Out-File -Encoding utf8 -Append` x2 | `ef bb bf 41 3d 31 0d 0a 42 3d 63 61 66 c3 ..` (17) | ok |
| `Out-File utf8` then `AppendAllText` | `ef bb bf 41 3d 31 0d 0a 42 3d 63 61 66 c3 ..` (16) | ok |
| `AppendAllText` then `Out-File utf8` | `41 3d 31 0a 42 3d 63 61 66 c3 a9 0d 0a` (13) | ok |
| `>>` x2 | `ff fe 41 00 3d 00 31 00 0d 00 0a 00 42 00 ..` (28) | ok (lone UTF-16 decodes) |
| `>>` then `Out-File utf8` | `ff fe 41 00 ... 0a 00 42 3d` (17) | `INVALID[<U+3D42><U+0D32>]`: corrupt |
| `Out-File utf8` then `>>` | `ef bb bf 41 3d 31 0d 0a 42 00 3d 00 32 00` (18) | `(B<U+0000>)=<U+0000>2<U+0000>`: corrupt |
| `Add-Content` x2 | `41 3d 31 0d 0a 42 3d 63 61 66 e9 0d 0a` (13) | `caf<U+FFFD>`: corrupt |
| `Add-Content` then `Out-File utf8` (ASCII values) | `41 3d 31 0d 0a 42 3d 32 0d 0a` | ok |
| `AppendAllText` then `Add-Content` (non-ASCII) | `41 3d 31 0a 42 3d 63 61 66 e9 0d 0a` | `caf<U+FFFD>`: corrupt |
| `AppendAllText` then `Out-File` (no `-Encoding`) | `41 3d 31 0a 42 00 3d 00 63 00 ...` | corrupt |
| `>>` then `Add-Content` | `ff fe 41 00 ...` (22) | ok (`Add-Content` adapts to the UTF-16 file) |
| `Out-File utf8 -Append` x3 | `ef bb bf 41 3d 31 0d 0a 42 3d 32 0d 0a 43 ..` | ok |

- `Out-File -Encoding utf8 -Append` writes the BOM only when it creates or finds an empty file: after a non-empty `AppendAllText` file there is no second BOM (row 4, 13 bytes). That is why the two safe writers compose.
- pwsh 7.4.7 and 7.6.6 write `41 3d 31 0d 0a 42 3d 63 61 66 c3 a9 0d 0a` for `>>`, `Out-File`, `Add-Content` alike (no BOM, UTF-8) and every sequence decodes.

**Matrix** (`runner-writer-check.ps1`, `runner-writer-matrix.sh`, `final-x8-runner-writer-matrix.out`): 21 writer sequences x {5.1, 7.6.6}; each exits 1 when either reader decodes anything but `A=1`/`B=café`. Codes `aa` AppendAllText UTF-8 no BOM, `of` `Out-File -Encoding utf8 -Append`, `rd` `>>`, `ac` `Add-Content`, `ofd` `Out-File -Append` (no `-Encoding`).

```text
5.1 ok (exit 0): aa  aa,aa  of  of,of  aa,of  of,aa  rd  rd,rd  ac  ac,of  of,ac  rd,ac  ofd  ofd,ofd
5.1 CORRUPT (exit 1): rd,of  of,rd  aa,ac  aa,rd  aa,ofd  ac,ac  ac,rd
pwsh 7.6.6: all 21 ok (exit 0)
```

(`ac,ac` fails because the second line carries `é` and `Add-Content` writes cp1252; `ac` alone with ASCII is fine. The risk is the value, which an agent does not control, e.g. a profile path `C:\Users\Jürgen\bin`.)

**Resolution of X8.** GitHub's own example is `Out-File -Encoding utf8 -Append` for `shell: powershell` and `>>` for `shell: pwsh` ([workflow-commands.md lines 594-621](https://raw.githubusercontent.com/github/docs/main/content/actions/reference/workflows-and-actions/workflow-commands.md)). Both PS-ENC-03's `AppendAllText` and SH-CI-11's `Out-File -Encoding utf8 -Append` are measured safe alone and mixed with each other; the breakers are the same writers both rules already ban. Proposed texts are N4 below.

## Normative guidance candidates

Version tags: "5.1" = Windows PowerShell 5.1.26100; "7.x" = pwsh 7.4.7 and 7.6.6 on Windows. "Run" = verification executed against a planted violation and a compliant twin in the fixture directory. Greps use a directory operand, one `-e` per alternative, quoted `--include`; output is the violation, empty output = pass.

**N1 (PS-ENC-03, MUST, amended text).** In code that can run on 5.1, write text files only with `[IO.File]::WriteAllText($p, $t, (New-Object System.Text.UTF8Encoding $false))` / `AppendAllText`, or `-Encoding ascii` for data that is ASCII by construction. Do not infer cmdlet bytes from 7.x: on 7.x the default and `-Encoding utf8` are UTF-8 without BOM, but `unicode`, `utf32`, `oem`, `ansi`, `utf8BOM` and `[Text.Encoding]::UTF8` are not.
- Why: the 5.1 and 7.x columns differ for every cmdlet and `-Encoding utf8` (BOM on 5.1, none on 7.x), and `[Text.Encoding]::UTF8` has a BOM on both.
- Verify: behaviour, `./winrun.sh all write-bytes.ps1` (expected byte rows in finding 2); exit 0 is not the signal, the hex rows are. Reading heuristic for call sites: the existing AST checks D4/D6 of PS-ENC-03. Run: yes for the bytes (`final-q1-write-bytes.out`); no grep.

**N2 (PS-ENC-03, MUST, new clause).** Never pass a locale-dependent encoding name: `-Encoding Default`, `OEM` or `ANSI`. At a boundary with a legacy consumer that needs cp437 or cp1252 use a comment naming the consumer and `[Text.Encoding]::GetEncoding(437)` / `AppendAllText` with that encoding.
- Why: `Default` is cp1252 on 5.1 and UTF-8 without BOM on 7.x with identical source; `OEM` follows the system OEM code page (437 here), not the console; `ANSI` is rejected on 5.1 and cp1252 on 7.4+.
- Verify: `grep -rniE -e '-Encoding[ :]+.?default\b' -e '-Encoding[ :]+.?oem\b' -e '-Encoding[ :]+.?ansi\b' --include='*.ps1' --include='*.psm1' .` (V1). Run: yes, `verify/locale/bad` red (`ansi.ps1 default.ps1 oem.ps1`), `verify/locale/good` empty.

**N3 (PS-ENC-03, MUST, 5.1-bound only).** In 5.1-bound code do not use `-Encoding utf8NoBOM`, `utf8BOM` or `ansi`, nor numeric or named code pages; the 5.1 ValidateSet is `unknown,string,unicode,bigendianunicode,utf8,utf7,utf32,ascii,default,oem`.
- Why: 5.1 throws "Cannot validate argument on parameter 'Encoding'" (`Out-File`) or "Cannot convert value ... FileSystemCmdletProviderEncoding" (`Get-Content`) at runtime; PSSA and the resolver do not see it.
- Verify: `grep -rniE -e '-Encoding[ :]+.?utf8NoBOM\b' -e '-Encoding[ :]+.?utf8BOM\b' -e '-Encoding[ :]+.?ansi\b' --include='*.ps1' --include='*.psm1' .` over 5.1-bound directories (V7). Run: yes, `verify/valset/bad` and `plants/miss` red, `verify/valset/good` empty; runtime error reproduced in `final-q2-plants-miss-run.out`.

**N4 (PS-ENC-03 and SH-CI-11, MUST, X8 writer text).** On 5.1 write `$GITHUB_ENV`, `$GITHUB_PATH` and `$GITHUB_OUTPUT` with exactly one of: `[IO.File]::AppendAllText($env:GITHUB_ENV, "NAME=value`n", (New-Object System.Text.UTF8Encoding $false))` (default, no BOM) or `"NAME=value" | Out-File -FilePath $env:GITHUB_ENV -Encoding utf8 -Append`. Never `>>`, `Out-File` without `-Encoding utf8`, `-Encoding unicode`, or `Add-Content`, and never mix either safe writer with a banned one. On pwsh 7.x `>>` is also safe (SH-CI-11 scope stays 5.1).
- Why: both safe writers decode through `ReadAllText` and `ReadAllLines(UTF8)` alone and in both orders; the 7 corrupt 5.1 sequences all involve a banned writer. `Add-Content` is ASCII-safe but a non-ASCII value corrupts.
- Verify: `grep -rnE --include='*.ps1' --include='*.yml' --include='*.yaml' -e '>>[[:space:]]*"?[$]env:GITHUB_[A-Z]+' -e 'Add-Content.*GITHUB_[A-Z]+' .` and `grep -rnP --include='*.ps1' --include='*.yml' --include='*.yaml' -e 'Out-File(?!.*-Encoding[ ]+utf8).*GITHUB_[A-Z]+' .` (V3a, V3b; the first also matches `>>` in `shell: pwsh` steps, read the step shell). Behaviour: `bash runner-writer-matrix.sh`. Run: yes, `runnerw/bad` red (`addcontent.ps1 redirect.ps1 step.yml`; `outfile-noenc.ps1 outfile-unicode.ps1`), `runnerw/good` empty (AppendAllText, `Out-File -Encoding utf8` including reordered parameters); matrix 7 red rows on 5.1, 0 on 7.6.6.

**N5 (PS-ENC-06, MUST, amendment).** No character U+2018..U+201E in code positions of any `.ps1`/`.psm1`, 7.6-only files included; non-ASCII is allowed in comments and in strings that contain none of those seven characters.
- Why: they are quote tokens on 5.1, 7.4.7 and 7.6.6; `"He said “hi” ok"` yields two outputs silently on 7.x and `'it’s'` is a parse error. Chat and word-processor output produces them.
- Verify: `LC_ALL=C grep -rlP -e '\xE2\x80[\x98-\x9E]' --include='*.ps1' --include='*.psm1' .` (V2); lists comment and help-block hits too, read them. Run: yes, `curly/bad` red (`dq-curly-silent.ps1 sq-nobom.ps1`), `curly/good/ok.ps1` empty (café in a comment and an ASCII apostrophe).

**N6 (PS-ENC-06, SHOULD, confirmed).** A 7.6-only script is BOM-less UTF-8; do not add a BOM to clear `PSUseBOMForUnicodeEncodedFile`.
- Why: 7.4.7 and 7.6.6 on a cp1252 Windows host read BOM-less UTF-8 correctly (`dq-nobom` length 4; `Import-Module` of a BOM-less `.psm1` too).
- Verify: `./winrun.sh all read-nobom.ps1` (rows `dq-nobom ... len=4` on 7.x, `len=6` on 5.1). Run: yes (behaviour, `final-q1-read-nobom.out`).

**N7 (PS-ENC-02, MUST, confirmed).** Never serve or `iex` text that starts with U+FEFF.
- Why: `Invoke-Expression` of U+FEFF-prefixed text fails with "The term '?Write-Output' is not recognized" on 5.1, 7.4.7 and 7.6.6.
- Verify: the PS-ENC-02 grep (`LC_ALL=C grep -rl -P -e '^\xEF\xBB\xBF' --include='*.ps1' .`) plus `./winrun.sh all iex-bom.ps1`. Run: yes (behaviour, `final-q1-curly-iex.out`); the grep was run in [compat].

**N8 (PS-ENC-04, SHOULD, amended).** Pass `-Encoding` explicitly (`UTF8`, or `ansi`/`Default` named per N2 for legacy input) when reading a file whose producer is not this script; bare `Get-Content` decodes ANSI on 5.1 and UTF-8 on 7.x, and a cp1252 file reads with U+FFFD on 7.x.
- Why: `read-legacy.ps1`: cp1252 `63 61 66 e9` reads `00e9` on 5.1 and `fffd` on 7.x; UTF-8 without BOM reads `00c3 00a9` on 5.1.
- Verify: `grep -rnP -e 'Get-Content(?!.*-Encoding)' --include='*.ps1' --include='*.psm1' .` (V6; lists every bare read, including ASCII-only inputs, so review). Run: yes, `verify/read/bad` red, `verify/read/good` empty; behaviour `final-q1-read-legacy.out`.

**N9 (PS-ENC-05, SHOULD, amended).** Before reading a native child's non-ASCII stdout set `[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false` on every engine; also set `$OutputEncoding` the same way on 5.1 only (7.x already has it) and restore both after the call.
- Why: 7.x decodes child stdout with the OEM code page (cp437 here); `$OutputEncoding` only affects what is written to the child's stdin. Unchanged between 7.4.7 and 7.6.6.
- Verify: `./winrun.sh all native-enc.ps1` (decoded lengths 8 default vs 5 with the console set; stdin bytes `3F 3F` on 5.1 default). Run: yes (behaviour, `final-q1-native-enc.out`). Interactive consoles unverified.

**N10 (PS-ENC-05, SHOULD, new addendum).** To save a native command's stdout to a file, use `child > file` only on 7.4+, or `cmd /c "child > file"` on any engine; never `child | Out-File` or `child | Set-Content`.
- Why: `>` is byte-preserving on 7.4+ (`63 61 66 c3 a9 e2 80 99`) but UTF-16 mojibake on 5.1; the pipeline forms decode the child's bytes with cp437 first and re-encode the mojibake (7.x `e2 94 9c e2 8c 90 ...`, 5.1 UTF-16 or cp1252 of the same text).
- Verify: `./winrun.sh all native-to-file.ps1`; call sites are a reading heuristic. Run: yes for the behaviour (`final-q1-native-to-file.out`), no for call-site detection.

**N11 (PS-GATE-06, SHOULD, level decision).** Keep `Test-CommandResolves.ps1` at SHOULD: an advisory check for installer and module kinds, run with `-CheckParameters` on the target host, never a required status check.
- Why: 13 of 13 planted hallucinated cmdlets/parameters caught; 8 of 178 correct installer-like files and 30 of 33 findings are false without an allow-list (finding 6).
- Verify: `./winrun.sh 51 resolver/Test-CommandResolves.ps1 -Path plants\bad -CheckParameters` exit 1 (20 findings, 24 files), `-Path plants\good` exit 0 (25 files, 0 findings). Run: yes (`final-q2-plants-run.out`, three levels).

**N12 (PS-GATE-06, SHOULD, scope).** Run the resolver only on the host the script targets (5.1 for installer/module kinds); a finding from another host is not evidence.
- Why: `Get-CimInstance`/`Get-NetAdapter` red on Linux pwsh 7.6.6, green on 5.1.
- Verify: `bash host-run.sh`. Run: yes (`final-q2-host-run.out`, plant red exit 1 on Linux / exit 0 on 5.1; twin 0 on both).

**N13 (PS-GATE-06, SHOULD, tuning).** Ship the resolver with a project `-Allow` list (wildcards, e.g. `*-Az*`, `*Chocolatey*`) and version-gate suppression, and record the suppression counts on the summary line; accept that a hallucination inside a version gate is not caught.
- Why: tuned run leaves 4 real 7-only findings in the 17 small repos; guard-run shows the one-line miss.
- Verify: `bash guard-run.sh` (`fp`: untuned exit 1, tuned exit 0; `hall`: exit 1 both; `miss`: untuned 1, tuned 0 = the price) and `bash corpus-run-tuned.sh`. Run: yes (`final-q2-guard-run.out`, `resolver/corpus-tuned.txt`); the allow-list is corpus-derived, out-of-sample unmeasured.

**N14 (PS-GATE-06, SHOULD, companion).** Keep the 5.1 parse job (PS-GATE-04) and a smoke run on 5.1 beside the resolver; it does not see .NET members or parameter values.
- Why: `[IO.Path]::GetRelativePath`, `[Math]::Clamp` and `-Encoding utf8NoBOM` throw on 5.1 and the resolver exits 0.
- Verify: `bash plants-miss-run.sh` (resolver exit 0 on `plants/miss` while each file errors on 5.1). Run: yes, as a recorded miss (not red; see Verification runs).

**N15 (PS-GATE-01 and PS-GATE-02, MUST, amended wording).** The gate wrapper fails when `Severity` is present and omits `ParseError`; it does not require `Severity` to exist. IncludeRules-only settings (dotnet shape) are valid.
- Why: with `Severity` absent PSSA 1.25.0 reports ParseError (`severity == null` branch); the old wrapper exited 2 on valid files.
- Verify: `bash incl-gate.sh` (new wrapper: `inc-valid` bad exit 1, good exit 0, `inc-sev-noPE` exit 2, `inc-sev-PE` bad exit 1); the PS-GATE-02 grep over `Severity[ ]*=[ ]*@[(]` is unchanged. Run: yes (`final-q3-incl-gate.out`, `final-q3-incl-run.out`, `final-q3-incl-enableexit.out`).

**N16 (PS-GATE-01, MUST, existing clause now evidenced).** Every rule named in `IncludeRules`, `ExcludeRules` or `Rules` exists in `Get-ScriptAnalyzerRule`; the wrapper exits 2 otherwise.
- Why: PSSA ignores unknown names silently; dotnet/install-scripts names 3 non-existent DSC rules (no `PSDSC` prefix).
- Verify: `bash incl-gate.sh` (new wrapper on `dotnet.psd1` exit 2 "unknown rule name(s)") and `incl-unknown.ps1` (`typo-only n=0`). Run: yes (`final-q3-incl-gate.out`, `final-q3-incl-unknown.out`).

## Verification runs

Greps (`bash verify.sh`, output `final-verify-greps.out`). Exit is `grep`'s: 0 = matched (red), 1 = no match (green). Listed names are the matching files.

| Id | Dir (violation) | Exit | Matching files | Twin dir | Exit |
|---|---|---|---|---|---|
| V1 | `verify/locale/bad` | 0 | `ansi.ps1 default.ps1 oem.ps1` | `verify/locale/good` | 1 (empty) |
| V2 | `curly/bad` | 0 | `dq-curly-silent.ps1 sq-nobom.ps1` | `curly/good` | 1 (empty) |
| V3a | `runnerw/bad` | 0 | `addcontent.ps1 redirect.ps1 step.yml` | `runnerw/good` | 1 (empty) |
| V3b | `runnerw/bad` | 0 | `outfile-noenc.ps1 outfile-unicode.ps1` | `runnerw/good` | 1 (empty) |
| V6 | `verify/read/bad` | 0 | `bare.ps1` | `verify/read/good` | 1 (empty) |
| V7 | `verify/valset/bad`, `plants/miss` | 0, 0 | `bom.ps1 nobom.ps1`; `bad-value.ps1` | `verify/valset/good` | 1 (empty) |

Resolver on plants (WinPS 5.1, `bash plants-run.sh`, `final-q2-plants-run.out`):

```text
### level=names  dir=bad   resolver: 24 files, 11 findings; suppressed ... module-missing=1 dynamic=1   -> exit 1
### level=names  dir=good  resolver: 25 files, 0 findings; ...                                          -> exit 0
### level=params dir=bad   resolver: 24 files, 20 findings; ... module-missing=1 dynamic=2             -> exit 1
### level=params dir=good  resolver: 25 files, 0 findings                                              -> exit 0
### level=strict dir=bad   resolver: 24 files, 21 findings; ... module-missing=0                       -> exit 1
### level=strict dir=good  resolver: 25 files, 0 findings                                              -> exit 0
plants/bad/p01-testpath-recurse.ps1:1: unknown parameter -Recurse on Test-Path
plants/bad/g02-skiphttp.ps1:1: unknown parameter -SkipHttpErrorCheck on Invoke-WebRequest
plants/bad/c01-get-filecontent.ps1:1: unresolved command Get-FileContent
```

Recorded miss (`bash plants-miss-run.sh`, `final-q2-plants-miss-run.out`): not red, reported as such. `plants/miss` resolver run: `resolver: 5 files, 0 findings` exit 0, while on 5.1 `net-api.ps1` throws "[System.IO.Path] does not contain a method named 'GetRelativePath'", `net-clamp.ps1` throws "[System.Math] does not contain a method named 'Clamp'", `bad-value.ps1` throws "Cannot convert value "utf8NoBOM" to type ...FileSystemCmdletProviderEncoding"; `ok.ps1` prints `ok`. The resolver is the wrong tool for these; V7 and the 5.1 smoke run are the catchers.

Host and tuning:

```text
bash host-run.sh   bad:  Linux pwsh 7.6.6 -> 2 findings (Get-CimInstance, Get-NetAdapter) exit 1 ; WinPS 5.1 -> 0 findings exit 0
                   good: both exit 0
bash guard-run.sh  fp   untuned: unknown parameter -AsHashtable on ConvertFrom-Json exit 1 ; tuned: 0 findings ... version-guarded=1 exit 0
                   hall untuned exit 1 ; tuned exit 1 (Get-FileContent)
                   miss untuned exit 1 ; tuned exit 0 (version-guarded=1)  <- the price
tuned on plants/bad -CheckParameters: 20 findings exit 1 ; plants/good: 0 findings exit 0  (final-q2-plants-tuned.out)
```

Gate wrapper and PSSA (`bash incl-gate.sh`, pwsh 7.6.6 Linux, PSSA 1.25.0; `bash incl-enableexit.sh`; `final-q3-*.out`):

```text
Invoke-PSGate-old.ps1 settings=inc-valid  path=incl/bad  exit=2 :: psgate: Severity must list ParseError, or parse errors exit 0
Invoke-PSGate.ps1     settings=inc-valid  path=incl/bad  exit=1 :: psgate: 2 files, 4 findings
Invoke-PSGate.ps1     settings=inc-valid  path=incl/good exit=0 :: psgate: 1 files, 0 findings
Invoke-PSGate.ps1     settings=dotnet     path=incl/bad  exit=2 :: psgate: unknown rule name(s) in settings: PSStandardDSCFunctionsInResource, ...
Invoke-PSGate.ps1     settings=inc-sev-noPE path=incl/bad exit=2 :: psgate: Severity is set and omits ParseError (absent Severity reports all severities, ParseError included)
Invoke-PSGate.ps1     settings=inc-sev-PE path=incl/bad  exit=1 ; good exit=0
-EnableExit settings=inc-valid   path=incl/bad exit=4 ; good exit=0
-EnableExit settings=inc-sev-noPE path=incl/bad exit=0           <- fail-open
-EnableExit settings=inc-sev-PE   path=incl/bad exit=4 ; good exit=0
```

Runner-file writers (`bash runner-writer-matrix.sh`, `final-x8-runner-writer-matrix.out`): 42 rows (21 sequences x {5.1, 7.6.6}); exit 1 (CORRUPT) on 5.1 for `rd,of  of,rd  aa,ac  aa,rd  aa,ofd  ac,ac  ac,rd`; exit 0 for every 7.6.6 row and for 5.1 `aa  aa,aa  of  of,of  aa,of  of,aa  rd  rd,rd  ac  ac,of  of,ac  rd,ac  ofd  ofd,ofd`.

Behaviour runs (no exit-code signal; the value is the printed rows): `final-q1-probe-enc.out`, `final-q1-write-bytes.out`, `final-q1-write-bytes2.out`, `final-q1-oem-which.out`, `final-q1-read-nobom.out`, `final-q1-read-legacy.out`, `final-q1-native-enc.out`, `final-q1-native-to-file.out`, `final-q1-quote-chars.out`, `final-q1-curly-iex.out`, `final-x8-runner-file.out`, `final-x8-runner-file2.out`. `bash run-all.sh` regenerates all `final-*.out` that need the Windows host (2 min); a WSL interop flake (`UtilAcceptVsock ... accept4 failed 110`) hit one row of one matrix run and one concurrent run while the corpus job ran; both were rerun clean.

Watched red on a planted violation and green on a compliant twin: V1, V2, V3a, V3b, V6, V7, the resolver plants, host-run, guard-run, the wrapper cases, `-EnableExit` fail-open, the writer matrix: 12. Not red (reported above): the .NET-member and value plants, by design of the tool.

## Exemplar evidence

Greps run over `/home/mherwig/.cache/research-lang/exemplars/shell` (SHAs in shell-audit/scratch/exemplar-shas.md).

| Candidate | Satisfies | Violates or contradicts |
|---|---|---|
| N2 (locale names) | none needed; the whole corpus has 2 hits | `ScoopInstaller__Scoop@e6aa3b366bde:supporting/validator/build.ps1:24-25` writes checksum files with `-Encoding oem` (data is ASCII hex plus names, so cp437 equals ASCII; a named consumer boundary, would take the comment exception) |
| N3, N1 (rejected 5.1 values) | `ScoopInstaller__Install@1e2f334083d6:.github/scripts/e2e-test.ps1:9,25` (`-Encoding utf8` on `GITHUB_PATH`) | corpus has 106 `utf8NoBOM` uses (shell-pwsh.md [ex] axis 7), nearly all in 7-only code |
| N4 (runner writers) | `JanDeDobbeleer__oh-my-posh@b0a8acd4d402:build/pre.ps1:18,22,26,30` (`Out-File -Encoding utf8 -Append` on `GITHUB_ENV`); `rust-lang__rustup@61271d00a979:.github/workflows/ci.yaml:119-121` (`-Append -Encoding utf8`); `nushell__nushell@246cd631a354:.github/workflows/release.yml:85`, `release-msi.yml:54`, `nightly-build.yml:181` (`GITHUB_PATH`) | no `-Encoding`: `actions__runner-images@8197087fc536:helpers/WaitWorkflowCompletion.ps1:43` (`GITHUB_ENV`), `.github/workflows/trigger-ubuntu-win-build.yml:42,62,63`, `k3s-io__k3s@82a6ddcd820b:.github/actions/setup-go/action.yaml:50`, `conda__conda@66d82122dc63:.github/workflows/tests.yml:177`, `PowerShell__PowerShell@5d871eb5e02c:.github/workflows/GHWorkflowHelper/GHWorkflowHelper.psm1:15` (red on 5.1, safe if the step runs `shell: pwsh`); `Add-Content`: `PowerShell__PowerShell@5d871eb5e02c:build.psm1:3324,3351`, `jdx__mise@19e8c8f0d03d:.github/workflows/test-impl.yml:121,476`, `oh-my-posh@b0a8acd4d402:.github/workflows/e2e.yml:52`, `starship__starship@d4d0459c5c24:.github/workflows/workflow.yml:188` (adds `-Encoding utf8`; ASCII path); `>>`: `actions__runner-images@8197087fc536:helpers/CheckOutdatedVersionPinning.ps1:83` (`GITHUB_OUTPUT`), `Homebrew__install@8ab1549dfa11:.github/workflows/tests.yml:58` |
| N5 (curly quotes) | 4 of the 1,327 files (3 repos) contain the bytes, all tests or help prose | deliberate tests, not defects: `pester__Pester@98e56d65da16:tst/functions/Mock.Tests.ps1:2294,2298,2314,2315` (`"Command '‘’‚‛"` names), `PowerShell__PSScriptAnalyzer@411c3d0b197b:Tests/Rules/AvoidGlobalOrUnitializedVars.ps1:1`, and help-block prose in `Tests/Engine/CommunityAnalyzerRules/CommunityAnalyzerRules.psm1:610-866` |
| N11-N13 (resolver) | `dotnet__install-scripts@e5cf1dd2d154` (36 files, 0 findings), zoxide, atuin, conda, deno_install, direnv, fzf, git, nushell, rustup (0 findings) | untuned false positives: `posh-git@bbc5ac380018:src/Utils.ps1:353`, `src/GitUtils.ps1:281`, `chocolatey/tools/chocolateyInstall.ps1:2,17`; `oh-my-posh@b0a8acd4d402:src/shell/scripts/omp.ps1:289`; `Scoop@e6aa3b366bde:libexec/scoop-update.ps1:189`; `starship@d4d0459c5c24:install/windows/choco/chocolateyInstall.install.ps1:22`; `vcpkg@e456309491fd:scripts/azure-pipelines/windows/create-image.ps1:98-277` |
| N15, N16 (IncludeRules) | `dotnet/install-scripts@e5cf1dd2d154:eng/common/PSScriptAnalyzerSettings.psd1:2-10` is IncludeRules-only and does report ParseError (satisfies N15) | the same file contradicts N16: 3 of 9 names do not exist |

## AI-agent angle

| Mistake an LLM makes here | Why it looks right | Smallest mechanical check |
|---|---|---|
| Writes `$t > $f`, `Out-File`, `Set-Content` and assumes UTF-8 without BOM | true on 7.x, false on 5.1 (UTF-16LE+BOM, cp1252) | N1 behaviour rows; N2/N3 greps; `[IO.File]::WriteAllText` with `UTF8Encoding($false)` |
| Adds `-Encoding utf8` "to be safe" | no BOM on 7.x, BOM on 5.1; breaks shebang and `$GITHUB_*` mixing | PS-ENC-03 AST D6 |
| `-Encoding utf8NoBOM`, `utf8BOM`, `ansi` in a script that must run on 5.1 | documented for 7.x | V7 grep; 5.1 smoke run (throws at runtime) |
| `-Encoding Default` from pre-2016 snippets | means ANSI on 5.1, UTF-8 on 7.x | V1 grep |
| Pastes curly quotes or em dashes from chat output | looks like text | V2 grep; 5.1 reads em dash as a string terminator, 7.x as a quote token |
| `[Console]::OutputEncoding` untouched, sets only `$OutputEncoding` and expects the child's stdout to decode | `$OutputEncoding` sounds like "output" | N9 behaviour row (len 8 vs 5) |
| `tool | Out-File out.txt` for non-ASCII tool output on Windows | works on Linux | N10; use `>` on 7.4+ or `cmd /c` |
| Hallucinated cmdlets: `Get-FileContent`, `Test-FileExists`, `ConvertTo-Yaml`, `Write-ColorOutput`, `Get-EnvironmentVariable`, `Invoke-RestRequest`, `Invoke-ShellCommand` | verb-noun shape is plausible | resolver (7 of 7); default PSSA gives 0 findings |
| Hallucinated parameters: `Test-Path -Recurse`, `Get-ChildItem -MaxDepth`, `Copy-Item -Overwrite`, `Invoke-WebRequest -Retries`, `Select-String -Recurse`, `Remove-Item -Recursively` | borrowed from other tools | resolver `-CheckParameters` (6 of 6) |
| 7-only members in 5.1 code: `ConvertFrom-Json -AsHashtable`, `Join-String`, `Get-Content -AsByteStream`, `[IO.Path]::GetRelativePath`, `[Math]::Clamp` | exist on the author's pwsh 7 | resolver for the first three; the last two only by running on 5.1 (N14) |
| IncludeRules with invented rule names (`PSStandardDSCFunctionsInResource`) | PSSA accepts any string | N16 wrapper exit 2 |
| Sets `Severity = Error,Warning` as the "safe default" | drops ParseError (PS-GATE-02) | PS-GATE-02 grep; N15 wrapper exit 2 |
| Over-corrects by rejecting IncludeRules-only settings as missing ParseError | rule of thumb from the previous bullet | N15: absent `Severity` reports it |
| Writes `"X=y" >> $env:GITHUB_ENV` in a `shell: powershell` step and `Add-Content` in the next line of the same script | fine on pwsh | V3a, V3b; writer matrix |

## Contested / evolving

- **Docs versus the engine on source encoding.** about_Character_Encoding presents "Get-Content ... and the PowerShell engine read ANSI without a BOM" in a list that reads as current; it is 5.1 only (measured 7.4.7/7.6.6 on a cp1252 host, 2026-10-11). Trend: the 5.1 behaviour is frozen; the 7.x behaviour is stable since 6.0.
- **BOM policy.** Microsoft says "avoid BOMs" for Unix-visible files while `PSUseBOMForUnicodeEncodedFile` stays on for non-ASCII files ([rule doc](https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/docs/Rules/UseBOMForUnicodeEncodedFile.md)); PS-ENC-06 resolves it per script kind. No change expected while 5.1 ships in Windows.
- **Native stdout through `Out-File`.** 7.4 made `>` byte-preserving; the pipeline cmdlets still decode with `[Console]::OutputEncoding`. Whether a later 7.x aligns the console default with `$OutputEncoding` is open; 7.6.6 does not (2026-10-11).
- **System-locale UTF-8 hosts.** With "Beta: Use Unicode UTF-8 for worldwide language support" the ANSI code page is 65001, which would change 5.1's `Set-Content`, `Default` and BOM-less source reads. Not measured (unverified: read only); the 5.1 rules above assume ACP 1252.
- **Non-1252 ANSI hosts** (cp932/936/949) for the curly-quote synthesis: still open from shell-pwsh.md (unverified: read only).
- **PS-GATE-06 level.** SHOULD today; it could move to MUST per project once an allow-list exists and a second, out-of-sample corpus confirms the tuned false-positive rate. PSScriptAnalyzer's own compat rules (`PSUseCompatibleCommands`) depend on profile files that lag current Windows builds; the resolver asks the real host instead (trend: hosted runners keep 5.1, so the real-host check stays available).
- **Hosted-runner reader.** The X8 conclusion rests on runner source plus a faithful local emulation (.NET Framework reader on 5.1, .NET 8/10 on 7.x); a hosted `windows-latest` dispatch would close it and falls under the standing CI grant.
- **7.4 support ends 2026-11-10** ([lifecycle](https://learn.microsoft.com/en-us/powershell/scripting/install/powershell-support-lifecycle)): after that date a "7.4" target in matrices is historical; 7.6 LTS (to 2028-11-14) is the 7.x baseline.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Character_Encoding.md | about_Character_Encoding, 7.6 (primary) | main, fetched 2026-10-11 | per-cmdlet default encodings, `-Encoding` values, `$OutputEncoding` scope |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/5.1/Microsoft.PowerShell.Core/About/about_Character_Encoding.md | same page for Windows PowerShell 5.1 (primary) | main, fetched 2026-10-11 | the 5.1 value list |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Redirection.md | about_Redirection 7.6 (primary) | 7.4 change, fetched 2026-10-11 | byte-stream preservation for native stdout |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Preference_Variables.md | `$OutputEncoding` default (primary) | 7.6 | UTF-8 default and the alignment note |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/docs-conceptual/whats-new/differences-from-windows-powershell.md | 5.1 to 7 breaking changes (primary) | main | `$OutputEncoding` change, `New-ModuleManifest` note contradicted by measurement |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Utility/Out-File.md | Out-File 7.6 reference (primary) | 7.6 | value list without `Default`; default `utf8NoBOM` |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/5.1/Microsoft.PowerShell.Utility/Out-File.md | Out-File 5.1 reference (primary) | 5.1 | 5.1 value list |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Management/Set-Content.md | Set-Content 7.6 reference (primary) | 7.6 | `ansi` since 7.4, `oem` wording |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Quoting_Rules.md | about_Quoting_Rules 7.6 (primary) | 7.6 | smart quotes are normal quotes |
| https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/Get-Command.md | Get-Command 7.6 reference (primary) | 7.6 | module auto-loading behind the resolver |
| https://learn.microsoft.com/en-us/powershell/scripting/install/powershell-support-lifecycle | support lifecycle (primary) | updated 2026-09-09 | 7.4 EOS 2026-11-10, 7.6 LTS to 2028-11-14, .NET versions |
| https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/docs/Cmdlets/Invoke-ScriptAnalyzer.md | Invoke-ScriptAnalyzer reference (primary) | PSSA 1.25.0 era | `Severity` and `IncludeRule` semantics |
| https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/Engine/ScriptAnalyzer.cs | engine source (primary), @411c3d0b197b | main | `severity == null` ParseError branch, lines 1488 and 1902 |
| https://raw.githubusercontent.com/PowerShell/PSScriptAnalyzer/main/docs/Rules/UseBOMForUnicodeEncodedFile.md | rule doc (primary) | main | BOM rule rationale |
| https://raw.githubusercontent.com/actions/runner/main/src/Runner.Worker/FileCommandManager.cs | runner env-file readers (primary), @67f01c276e0a | main | `File.Create` empty files, `ReadAllLines(UTF8)`, `ReadAllText` |
| https://raw.githubusercontent.com/github/docs/main/content/actions/reference/workflows-and-actions/workflow-commands.md | GitHub workflow commands (primary) | main | the documented 5.1 and pwsh writers |
| https://github.com/dotnet/install-scripts/blob/e5cf1dd2d1540ed05ac84f8eb8c5cdec2807621e/eng/common/PSScriptAnalyzerSettings.psd1 | the IncludeRules-only settings file | exemplar corpus, 2026-10-10 | the shape asked about, with 3 invalid rule names |
| https://github.com/ScoopInstaller/Scoop/blob/e6aa3b366bdee8ed138c1e0f7b85192ebdd35d0f/libexec/scoop-update.ps1 | version-gated `-Parallel` | exemplar | untuned false positive at :188-189 |
| https://github.com/dahlbyk/posh-git/tree/bbc5ac380018239e0ac70411a59f4e367ca87f2d | posh-git | exemplar | Chocolatey helpers, version-gated `-AsByteStream` |
| https://github.com/microsoft/vcpkg/blob/e456309491fd/scripts/azure-pipelines/windows/create-image.ps1 | Az module script | exemplar | 20 optional-module false positives |
| https://github.com/JanDeDobbeleer/oh-my-posh/blob/b0a8acd4d402/build/pre.ps1 | `Out-File -Encoding utf8 -Append` on `GITHUB_ENV` | exemplar | working X8 writer in production |
| https://github.com/pester/Pester/blob/98e56d65da16/tst/functions/Mock.Tests.ps1 | deliberate curly-quote names in tests | exemplar | why N5 greps list test hits |

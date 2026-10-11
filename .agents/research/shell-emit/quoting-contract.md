---
title: "Quoters per target, the hostile corpus and the data channel: the SH-EMIT quoting contract"
topic: "Code that emits shell code for many shells: per-target quoting, PowerShell's curly-quote class, data channels, never-emit list, verification recipe"
agent: "wave2 / emit / quoting-contract (sonnet)"
model: sonnet
date_researched: 2026-10-11
sources_count: 24
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/quoting-contract/
scope: |
  Covers: the quoter specification for sh-family, fish, nushell, elvish and PowerShell (single and double quoted), the 36-case hostile corpus,
  the data-channel order, the never-emit list, the PowerShell Unicode quote class (ocx plus four upstreams), empty and NUL values, extra parser layers
  (rows M-M-01..05, M-M-13..15, M-J-02, M-C-22). Every claim marked "measured" was run through matrix.sh on the interpreter versions named.
  Not covered: rc-file targets and hook registration (W2-12), cmd.exe/batch quoting, tcsh/xonsh/ion, here-string footers (read, not run), macOS
  and BSD userland (no host; every such statement is "unverified: read only"). ocx and upstream defects are reported with a reproducer, never fixed (owner Q6/Q7).
---

# Quoters per target, the hostile corpus and the data channel

All dates 2026-10-11. Version tags: bash 3.2 to 5.3, dash 0.5.12, busybox ash 1.35 and 1.37, mksh R59c, ksh93u+m (2023 and 1.0.10), yash 2.52, posh 0.14.1, zsh 5.0.8 to 5.9, fish 3.6.0, 4.0.2, 4.7.0, 4.9.3, nu 0.105.1 and 0.116.0, elvish 0.21.0, pwsh 7.4.7, 7.6.6 and Windows PowerShell 5.1.26100.9444 (real Windows host), ShellCheck 0.11.0. "Matrix" means `matrix.sh <family> <script>`. Fixture paths are relative to the fixture directory in the frontmatter.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. The quoting grammar per target (what the docs say, what the matrix measured)
   2. The shared POSIX quoter: the failure set is predictable from grammar
   3. PowerShell's quote class: single and double, tokenizer source, near-miss negatives
   4. The curly-quote chase: ocx and four upstreams
   5. Windows PowerShell 5.1: the decode path decides injection versus corruption
   6. `$'..'`, `printf %q`, `${x@Q}` and zsh `(q)`: shell-native quoters are not emitters
   7. NUL
   8. Data channels: order, and what each costs
   9. Empty values on PowerShell
   10. The never-emit list: `source <(...)` and the eval exit status
   11. Extra parsers: quote once per layer, or pass argv (M-C-22)
   12. posh and a quoted pattern before a glob (M-M-13)
   13. The mandatory hostile corpus
   14. The verification recipe the shell-integration skill runs
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- One quoter per (target shell, quoting context), named for both (`fish_single_quoted`, never `shell_escape`): a POSIX quoter reused for fish fails 3 of 35 hostile cases on fish 3.6.0 to 4.9.3, and 6 of 35 on nu 0.105.1/0.116.0 and elvish 0.21.0 (measured, `check.sh fish_posixquoter fish`, exit 1).
- The sh-family quoter is `'` plus `'` to `'\''` and nothing else: 35/35 on 11 POSIX-family interpreters, 8 bash versions (3.2 to 5.3) and 4 zsh versions; yash 2.52 needs a UTF-8 locale (12/35 under the C locale, 35/35 under `LC_ALL=C.UTF-8`).
- fish single quotes escape `\` first, then `'` (`\\`, `\'`): 35/35 on 4 fish versions; a trailing backslash in the POSIX form leaves the literal unterminated ("quotes are not balanced").
- nushell: emit a raw string `r#'..'#` with one more `#` than the longest `#` run that follows any `'` in the value, or a plain double-quoted string escaping `\` and `"`; both 35/35 on nu 0.105.1 and 0.116.0. A `'..'` literal cannot hold `'`.
- elvish: `'..'` with `'` doubled, 35/35 on 0.21.0. Backslash is an ordinary character there.
- PowerShell single-quoted literals end at any of U+0027, U+2018, U+2019, U+201A, U+201B; double-quoted at U+0022, U+201C, U+201D, U+201E ([tokenizer source](https://github.com/PowerShell/PowerShell/blob/master/src/System.Management.Automation/engine/parser/CharTraits.cs), measured on 7.4.7, 7.6.6, 5.1). Double every one of the five in `'..'`; `'`-only doubling is code execution (`curly.ps1 ocx` exit 1 on all three versions).
- The doubled curly character round-trips as the same curly character (the tokenizer appends the second of a pair, `tokenizer.cs:2325-2336`), so "double all five" is lossless: `pwsh_sq` 35/35 on 7.4.7, 7.6.6 and 5.1; `pwsh_ocx` 28/35 on all three.
- The double-quoted PowerShell class is real: an ASCII-only `"` escaper fails 5 of 35 and executes the payload for U+201C, U+201D and U+201E on all three versions. Prefer single-quoted literals; if double quotes are unavoidable, backtick-escape the four double-quote characters plus `` ` `` and `$`.
- Near-miss characters (U+201F, U+2039, U+203A, U+2032, U+2033, U+02BC, U+FF07, U+FF02, U+00B4, U+00AB, U+00BB, U+300C) are inert on all three versions: the class is exactly nine characters, five single and four double.
- The curly-quote class is in ocx (`escape.rs:35`, pinned by its own test at `escape.rs:84`), direnv 2.37.1 and mise 2026.10.2 (both reproduced end to end with the released binaries, payload runs on pwsh 7.4.7 and 7.6.6); starship has it only for an install path containing U+2019 (parse error, injection needs an attacker-chosen path); zoxide does not emit a quoted value into PowerShell at all, so the wave-1 "same class" claim does not stand.
- On Windows PowerShell 5.1 the injection needs the curly character to survive decoding: a UTF-8 emitter piped through a native process under the default IBM437 console, or read by `Get-Content` without `-Encoding`, arrives mangled (value corruption, no execution); `[Console]::OutputEncoding = UTF8`, `-Encoding UTF8` or `ReadAllText(.., UTF8)` execute it. Corruption is still a defect; emit ASCII only (`[char]0xE9` or base64): 3/3 round trips on 5.1.
- `$'..'` is never emitted for sh targets: 0/35 on dash 0.5.12, yash 2.52 and posh 0.14.1, 35/35 elsewhere; ShellCheck 0.11.0 flags it as SC3003 (exit 1, twin exit 0).
- `source <(cmd)` is never emitted: bash 3.2 silently leaves the variable unset, dash/mksh/posh/bash 3.2 `--posix` are syntax errors, yash silently unset; `eval "$(cmd)"` worked on every variant that parses the file. `eval "$(cmd)"` also reports status 0 when `cmd` fails (dash, busybox ash, yash, bash 3.2), so an emitter that refuses must be consumed as `out=$(cmd) || return`.
- NUL must be rejected at the emitter boundary (exit 65, empty stdout): dash, busybox ash, mksh, posh and every bash silently truncate to `ab`, ksh93 and yash fail to parse, zsh keeps the NUL.
- Data channel order: do not emit (spawn with the environment) > emit data parsed by a target-native parser, ASCII-only (nu `from json`, elvish `from-json`, pwsh base64) > emit a literal through the per-target quoter. `ConvertFrom-Json` is not value-safe on pwsh 7.4.7 and 7.6.6 (an ISO-date string becomes `[DateTime]`); base64 is 35/35 on all three PowerShells.
- `$env:X = ''` removes the variable on pwsh 7.4.7 and WinPS 5.1 and keeps it empty on 7.6.6 (docs: 7.5 changed it); an emitter must not use "set to empty" to mean empty on pwsh.
- Each added parser needs its own quoting layer: wrapping a once-quoted command in double quotes fails at depth 2 and 3 on all 11 POSIX-family shells; re-quoting per layer or passing the value as a positional parameter passes all 33 cells ([QuoteBench](https://arxiv.org/abs/2608.13547): 55.4 to 73.2 points lost through one added parser).

## Findings

### 1. The quoting grammar per target

Each row is the documented grammar plus the matrix verdict for the quoter built from it (`quoters.py`, `check.sh`, 35 non-NUL cases, byte for byte).

| Target | Literal form | Characters escaped | Source for the grammar | Measured (35/35 unless noted) |
|---|---|---|---|---|
| sh, bash, zsh, ksh, mksh, dash, ash, yash, posh | `'..'` | only `'` as `'\''` | [POSIX.1-2024 XCU 2.2.2](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html): "A single-quote cannot occur within single-quotes" | dash 0.5.12, ash 1.35/1.37, mksh R59c, ksh93u+m x2, posh 0.14.1, bash 3.2/5.2 `--posix`, zsh 5.9 `--emulate sh`, bash 3.2 to 5.3, zsh 5.0.8 to 5.9: all 35/35. yash 2.52: 23/35 in the C locale, 35/35 with `LC_ALL=C.UTF-8` |
| fish 3.x, 4.x | `'..'` | `\` first, then `'` (`\\`, `\'`) | [fish language, Quotes](https://fishshell.com/docs/current/language.html#quotes): "The only meaningful escape sequences in single quotes are `\'` ... and `\\`" | fish 3.6.0, 4.0.2, 4.7.0, 4.9.3: 35/35 |
| nushell | `r#'..'#` (raw) or `".."` | raw: none, hash count = 1 + longest `#` run after any `'`; double-quoted: `\` then `"` | [nu strings](https://www.nushell.sh/book/working_with_strings.html): single-quoted "Cannot contain single quotes"; raw strings "may include single quotes"; double-quoted "All literal backslashes must be escaped" | nu 0.105.1 and 0.116.0: `nu_raw` 35/35, `nu_dq` 35/35 |
| elvish | `'..'` | `'` as `''` | [elvish language 3.3](https://elv.sh/ref/language.html): "All enclosed characters represent themselves, except the single quote. Two consecutive single quotes ... represent one single quote" | elvish 0.21.0: 35/35 |
| PowerShell, single-quoted | `'..'` | each of U+0027, U+2018, U+2019, U+201A, U+201B, doubled | [about_Quoting_Rules, Smart quotes](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_quoting_rules): "smart quotation marks also need to be escaped"; tokenizer below | pwsh 7.4.7, 7.6.6, WinPS 5.1: `pwsh_sq` 35/35 |
| PowerShell, double-quoted | `".."` | `` ` ``, `$`, and a backtick before each of U+0022, U+201C, U+201D, U+201E | same page; `IsDoubleQuote` in CharTraits.cs | `pwsh_dq` 35/35 on all three; the ASCII-only variant `pwsh_dq_naive` 30/35 |

Forms and non-forms worth pinning:

- nu double-quoted strings take C-style escapes and reject unknown ones (`\q` is a parse error); the interpolating forms `$".."` and `$'..'` treat `(` and `$` as active, so the plain-string escaper must never feed an interpolated form (documented in ocx's own comment, `crates/ocx_shell/src/shell/escape.rs:41`). nu also has `\0`, elvish says "`\0` ... is invalid in Elvish; write `\x00`" ([elvish 3.4](https://elv.sh/ref/language.html)); neither matters for emission because NUL is rejected (finding 7).
- fish has a second context. `fish_double_quoted` in ocx (`escape.rs:27`) escapes `\`, `$`, `"` and deliberately leaves backtick alone ("fish has no \` escape"). The two fish escapers differ on exactly one byte, `'`, and ocx pins that with a test (`escape.rs:63-76`, test `the_two_fish_escapers_are_not_interchangeable` at `:64`), the template this contract recommends.
- fish's own `string escape --style=script` round-trips 35/35 on 3.6.0, 4.0.2, 4.7.0 and 4.9.3, but its output form changed between 3.6 and 4.0: `it's` becomes `it\'s` on 3.6.0 and `"it's"` on 4.0.2, 4.7.0, 4.9.3 (`work/dbg_fe.fish`). A runtime `string escape` is fine inside fish code; do not parse or snapshot its output.
- nu's `get` flag changed under emitters that read records back: `get -i` works silently on 0.105.1 and prints "Flag deprecated ... renamed to `--optional (-o)`" on 0.116.0, while `get -o` is "unknown flag" on 0.105.1 (`work/get_i.nu`, `work/get_o.nu`). Emitted nu that must run on both uses neither, or sits behind a version guard.

### 2. The shared POSIX quoter: the failure set is predictable from grammar

`quoters.fish_posixquoter`, `elvish_posixquoter` and `nu_posixquoter` are the POSIX quoter reused. Measured red on every interpreter of the family:

```text
--- fish_posixquoter on fish   fish 3.6.0 / 4.0.2 / 4.7.0 / 4.9.3: 32/35 FAIL backslash,trailing_bs,dbl_bs
--- elvish_posixquoter on elvish   elvish 0.21.0: 29/35 FAIL squote,inject,curly_mixed,nu_hash,trail_sq,big4k
--- nu_posixquoter on nu   nu 0.105.1 and 0.116.0: 29/35 FAIL squote,inject,curly_mixed,nu_hash,trail_sq,big4k
```

Reading: fish gives `\` meaning inside `'..'`, so `a\b` loses its backslash silently (`dbl_bs`, `a\\b`, arrives as `a\b`) and a value ending in `\` swallows the closing quote; nu and elvish single quotes cannot contain `'` at all, so every value with an apostrophe fails (`it'\''s` is not an escape there). The same classes were measured in the wave-1 emitter audit against released tools: mise 2026.10.2 `env -s fish` corrupts `a\\b` on 4/4 fish versions and fails to parse a trailing backslash; starship 1.25.1 `init nu`/`init elvish` fail at an install path with `'` ([emitters-compared.md](../shell-audit/emitters-compared.md), Axis 2). Both fail silently or late, which is why the contract is a round trip, not a code review.

Correct and incorrect side by side (fish, value `C:\dir\`):

```fish
# WRONG: POSIX quoter, trailing backslash escapes the closing quote
set -gx v 'C:\dir\'      # fish: "Unexpected end of string, quotes are not balanced"
# RIGHT: fish_single_quoted
set -gx v 'C:\\dir\\'
```

### 3. PowerShell's quote class: single and double, tokenizer source, near-miss negatives

Source. The tokenizer's character predicates are in [CharTraits.cs](https://github.com/PowerShell/PowerShell/blob/master/src/System.Management.Automation/engine/parser/CharTraits.cs) (`IsSingleQuote`: U+0027, U+2018, U+2019, U+201A, U+201B; `IsDoubleQuote`: U+0022, U+201C, U+201D, U+201E, at lines 264-281 of the copy read). `ScanStringLiteral` ([tokenizer.cs:2317-2336](https://github.com/PowerShell/PowerShell/blob/master/src/System.Management.Automation/engine/parser/tokenizer.cs)) ends the literal at a single-quote-class character unless the next character is also in the class; in that case it consumes both and appends the second. `ScanStringExpandable` does the same for the double-quote class at `tokenizer.cs:2457-2468` and additionally honours `$` and backtick. Here-string footers use the same predicates (`tokenizer.cs:2700, 2772`); that is read, not run.

Documentation. [about_Quoting_Rules](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_quoting_rules) (the 5.1 and 7.6 sources differ not at all in this section): "PowerShell treats smart quotation marks ... as normal quotation marks for strings" and the example `'Single ‘‘smart quotation marks’’ must be escaped in a single-quoted string.'`.

Measured. `curly-matrix.ps1`, every class character as the first character of a payload `<char>;Write-Output PWNED;#`, two quoters per context (naive = ASCII quote only, fixed = whole class):

```text
== pwsh 7.4 LTS / 7.6.6 / Windows PowerShell 5.1 (identical rows)
Sq U+0027 Naive pwned=False roundtrip=True
Sq U+2018 Naive pwned=True  roundtrip=False       Sq U+2018 Fixed pwned=False roundtrip=True
Sq U+2019 / U+201A / U+201B: same shape
Dq U+0022 Naive pwned=False roundtrip=True
Dq U+201C Naive pwned=True  roundtrip=False       Dq U+201C Fixed pwned=False roundtrip=True
Dq U+201D / U+201E: same shape
-> exit 0       # 21 Naive pwned=True (7 chars x 3 versions), 27 Fixed pwned=False (9 x 3)
```

The payload ends with `#` on purpose: without it the closing `'` of the emitted literal starts an unterminated string and the whole `Invoke-Expression` input fails to parse before anything runs (a denial of service, not execution). Negative control: `curly-negative.ps1` feeds 12 look-alikes (U+201F, U+2039, U+203A, U+2032, U+2033, U+02BC, U+FF07, U+FF02, U+00B4, U+00AB, U+00BB, U+300C) through the ASCII-only quoters in both contexts: 36 rows, 0 `pwned=True`, 0 `rt=False`. U+201F, the high-reversed-9 double quote, is not in `IsDoubleQuote`.

ShellCheck knows the same class for POSIX shells and says it the other way round: SC1110 and SC1112 flag a Unicode quote in a script because the shell does not honour it ([SC1112](https://www.shellcheck.net/wiki/SC1112)). Only PowerShell, and only on purpose (paste-from-Word convenience), treats them as quotes.

### 4. The curly-quote chase: ocx and four upstreams

Reported with reproducers, not fixed (owners Q6/Q7).

| Tool | Site | Verdict | Reproducer (all run) |
|---|---|---|---|
| ocx `5de9d777eb7d` | `crates/ocx_shell/src/shell/escape.rs:35` `single_quoted_doubled` doubles only `'`; callers `shell.rs:198, 216, 322-323, 333-334`, `hook.rs:110, 391, 445, 472, 579, 588, 595, 600, 2782` (PowerShell and elvish sites share the one function); the unit test `escape.rs:84-87` pins "only doubles the quote" | defective for PowerShell; correct for elvish (elvish has no quote class, `elvish` quoter 35/35) | `ocx env --env "K=<U+2019>;Write-Output PWNED;#" --shell=powershell` printed `$env:K = '’;Write-Output PWNED;#'`; `curly-ocx.ps1` on pwsh 7.4.7, 7.6.6 and WinPS 5.1: `pwned=True K=[]`, exit 1 (`out/e2e_ocx_pwsh.txt`) |
| direnv `28a73d1df3f3` | `internal/cmd/shell_pwsh.go:174-200` `PowerShellEscapeVerbatimString` (byte loop, `case SINGLE_QUOTE` at `:195`); `shell_test.go:32-39` asserts only `don''t` | defective; bytes of U+2019 (`E2 80 99`) pass straight through | direnv 2.37.1 with `.envrc` `export K=$'\xe2\x80\x99;Write-Output PWNED;#'`, `direnv export pwsh` printed `${env:K}='’;Write-Output PWNED;#'`; evaluating it: `pwned=True K=[]` on pwsh 7.4.7 and 7.6.6 (`e2e/direnv/`, `out/e2e_direnv_pwsh.txt`). direnv refuses PowerShell below 7.2, so 5.1 is not reachable |
| mise `19e8c8f0d03d` (2026.10.2) | `src/shell/pwsh.rs:408-412` `escape_sq` (`input.replace('\'', "''")`); its comment (`pwsh.rs:395-407`) reasons only about backtick | defective | `mise.toml` `[env] K = "’;Write-Output PWNED;#"`, `mise env -s pwsh` printed `${Env:K}='’;Write-Output PWNED;#'`; `pwned=True K=[]` on pwsh 7.4.7 and 7.6.6 (`e2e/mise/`, `out/e2e_mise_pwsh.txt`) |
| starship `d4d0459c5c24` (1.25.1) | `src/init/mod.rs:47-52` `sprint_pwsh` | same defect, but the only interpolated value is the starship install path (user-controlled, not project data) | a binary installed at `.../O’Brien/starship`: `starship init powershell` prints `Invoke-Expression (& '.../O’Brien/starship' init powershell ...)`; pwsh 7.4 "The string is missing the terminator: '." and "Missing closing ')'" (`e2e/sq/stub.benign.pwsh`). Execution needs a directory name that is itself a runnable prefix; I did not get one to fire (`stub.crafted.pwsh` fails with "term not recognized") and report it as a parse failure, not injection |
| zoxide `86b443cffcd7` | `templates/powershell.txt:148-149` interpolates only `{{cmd}}` (an alias name from `--cmd`), `src/` has no PowerShell quoting function | **not applicable**: no quoted value is emitted into PowerShell. The wave-1 audit's "same defect class" for zoxide was inferred ("`sprint_pwsh` equivalent inferred from templates/powershell.txt", [ocx-emitter.md](../shell-audit/ocx-emitter.md) section 7) and does not hold | `grep -rn -e "replace(" -e "shell_words" -e "quote" src` over the zoxide sparse clone: no hit in any PowerShell path |

Severity as measured. A project-controlled value (ocx `ocx.toml [env]`, direnv `.envrc`, mise `mise.toml`) reaches a profile hook and runs as the user the next time the prompt fires: this is the cloned-repo attack. The value ends as `K=[]` (truncated at the quote), so the defect also loses data when nothing hostile is present.

Double-quoted contexts: no tool measured here emits PowerShell double-quoted values for data (ocx keeps single quotes: "double quotes let a value start a subexpression", `escape.rs:33`), so the double-quote class is a latent rule for future emitters, not a current defect. It is real: `pwsh_dq_naive` 30/35, `curly-matrix.ps1` `Dq U+201C/201D/201E Naive pwned=True` on all three versions.

### 5. Windows PowerShell 5.1: the decode path decides injection versus corruption

`curly-pipe.ps1` writes the ocx-style line as UTF-8 without BOM (what a Rust or Go emitter produces) and evaluates it by five routes. `pwned` means the payload ran:

```text
== pwsh 7.4 LTS / 7.6.6  (OutputEncoding utf-8)   all routes pwned=True
== Windows PowerShell 5.1 (OutputEncoding IBM437)
native stdout (cmd /c type), default encoding   pwned=False     <- mangled, not executed
native stdout, OutputEncoding=UTF-8             pwned=True
Get-Content -Raw (default encoding)             pwned=False     <- ANSI read, mangled
Get-Content -Raw -Encoding UTF8                 pwned=True
ReadAllText UTF-8                               pwned=True
```

So on a default 5.1 console the curly character is destroyed before the tokenizer sees it (E2 80 99 becomes three IBM437 or cp1252 characters, none a quote), which is value corruption instead of execution. Any wrapper that sets UTF-8 first (zoxide's own `__zoxide_bin` sets `[Console]::OutputEncoding` to UTF-8, `templates/powershell.txt:10-15`), `chcp 65001`, or a file read with `-Encoding UTF8` turns it into execution. `curly.ps1 ocx` (which builds the string in memory) is exit 1 on 5.1 for that reason. Rule: do not rely on 5.1's default decoding to neutralise anything.

M-M-15, non-ASCII on 5.1 (`pipe-unicode.ps1`, value `héllo ☃`, emitted as UTF-8 text, an ASCII `[char]0xE9` expression, and ASCII base64):

```text
pwsh 7.4 LTS / 7.6.6:      sq-literal True   [char] True   base64 True
Windows PowerShell 5.1:    sq-literal False  [char] True   base64 True     (OutputEncoding=IBM437)
```

The emitter-side fix is ASCII-only output for 5.1 targets: `[char]0xNN` expressions (what omp does, `pwsh.go:46-101` per [emitters-compared.md](../shell-audit/emitters-compared.md)) or base64. The PSScriptAnalyzer rule for the file-on-disk version of the same problem is [UseBOMForUnicodeEncodedFile](https://github.com/PowerShell/PSScriptAnalyzer/blob/main/docs/Rules/UseBOMForUnicodeEncodedFile.md) (warning, enabled by default); `curly.ps1` and every fixture here are ASCII-only for that reason.

### 6. `$'..'`, `printf %q`, `${x@Q}` and zsh `(q)`: shell-native quoters are not emitters

POSIX.1-2024 added dollar-single-quotes ([XCU 2.2](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)), but the shells that `/bin/sh` is today do not all have them. `sh_dollarq` (the `omp.posix` / `direnv.bash` shape: `v=$'it\'s'`):

```text
--- sh_dollarq on posix
dash 0.5.12 (deb12): 0/35        yash 2.52: 0/35        posh 0.14.1: 0/35
busybox ash 1.35, 1.37; mksh R59c; ksh93u+m x2; bash 3.2/5.2 --posix; zsh 5.9 sh: 35/35
```

dash and posh print `$it's`-style garbage without any error; that is the silent failure the never-emit rule exists for. ShellCheck 0.11.0 says SC3003 ([wiki](https://www.shellcheck.net/wiki/SC3003)).

Shell-native quoting commands, measured by quoting the corpus with the shell's own facility and `eval`-ing it back (`gen_bashq.py`):

| Facility | Result |
|---|---|
| `printf %q` (bash, [NEWS 5.3](https://tiswww.case.edu/php/chet/bash/NEWS) item l: "uses the alternate form ... to force single quoting"; bash 2.05b NEWS: uses `$'..'` for non-printing characters) | 35/35 on bash 3.2 to 5.3, bash `--posix`, mksh R59c, ksh93u+m x2, zsh 5.9 sh; **1/35** on dash, busybox ash 1.35/1.37 and yash; posh 19/35 |
| `${x@Q}` (bash [NEWS 4.4](https://tiswww.case.edu/php/chet/bash/NEWS) item 1.o: "new `${parameter@spec}` family") | bash 4.4 to 5.3: 35/35; **bash 3.2, 4.0, 4.2: 1/35** (bad substitution); dash, ash, ksh93u+m, yash, posh, zsh: 1/35; only mksh R59c (35/35) accepts it outside bash |
| zsh `${(q)v}` and `${(qq)v}` | 35/35 on zsh 5.0.8, 5.3.1, 5.8, 5.9 |

Conclusion: these are useful inside one shell at runtime, never as the way an emitter produces text for an unknown target. The emitter owns its quoter.

### 7. NUL

A NUL cannot live in a shell variable or an argv. What happens when an emitter lets one through (`work/nul_eval.sh`: `eval "$(printf "v='a\000b'")"`, then hex of `$v`):

```text
dash 0.5.12, busybox ash 1.35/1.37, mksh R59c, posh 0.14.1, bash 3.2/4.0/4.2: v=6162 ("ab"), silent
bash 4.4 to 5.3, bash 5.2 --posix: v=6162 plus "warning: command substitution: ignored null byte in input"
ksh93u+m x2: "eval: syntax error"      yash 2.52: "the single quotation is not closed", exit 2
zsh 5.0.8 to 5.9, zsh sh-emulate: v=610062 (NUL kept)
```

and as a file run by bash (`work/nul_probe.sh`): exit 126 (binary file), on every bash version. Silent truncation in eight implementations is a corrupt-value bug; the contract is refusal. Per the [fleet CLI contract](../../../rules/rust-quality/cli-contract.md) that is exit 65 (`DataError`), stdout empty.

### 8. Data channels: order, and what each costs

Preference order, with the measured cost of each rung:

1. **No emitted code at all.** Spawn the child with the environment (`ocx exec`, `mise exec`, `direnv exec`); write a file the target reads as data. Cost: not available for "set it in my current interactive shell".
2. **Emitted data with a target-native parser, ASCII-only.** Serialize to JSON with every non-ASCII character as `\uXXXX` and `'` as `\u0027`; the text then contains no quote character and no characters any shell treats specially inside `'..'` for nu, elvish and sh.
   - nu: `let v = ('{"v": "it\u0027s \u2019 ..."}' | from json | get v)`: `nu_json` 35/35 on 0.105.1 and 0.116.0. `load-env ('{...}' | from json)` sets `$env.OCX_V` byte-exact and an empty value stays empty on 0.116.0 (`load_env.nu`, `out/load_env.txt`); the same file fails on 0.105.1 only because of the `get -o` flag (finding 1), not `load-env`.
   - elvish: `var v = (echo '{...}' | from-json)[v]`: `elvish_json` 35/35 on 0.21.0. direnv does this for elvish (`direnv@28a73d1df3f3:internal/cmd/shell_elvish.go:17`, `"{{.SelfPath}}" export elvish | from-json`).
   - mise's nu path uses a CSV data channel with its own `escape_csv_value` (`mise@19e8c8f0d03d:src/shell/nushell.rs:30-36, 145-146`).
   - PowerShell: **not JSON.** `pwsh_json` (`(ConvertFrom-Json '...').v`) is 34/35 on 7.4.7 and 7.6.6, failing `datelike`: the string `2026-10-11T00:00:00Z` comes back as `[DateTime]` (`out/datekind.txt`: default `DateTime` on 7.4.7 and 7.6.6, `String` on 5.1; `-DateKind String` exists on 7.6.6 and not on 7.4.7 or 5.1). Use **base64**: `[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('...'))`, `pwsh_b64` 35/35 on all three and encoding-proof on 5.1 (finding 5).
3. **A literal through the per-target quoter** of finding 1, with the hostile corpus as the gate.
4. Never: a shared quoter across targets, double-quoted or interpolating forms for data, `eval` of a string the emitter did not build.

Where a POSIX shell is the target there is no native structured parser; rung 3 (`'..'` with `'\''`) is the channel and it is exactly as strong as the corpus run says (35/35 on 23 interpreter versions).

### 9. Empty values on PowerShell

`env-empty.ps1`, five ways to set an empty value, then `Test-Path env:XE` and a child process:

```text
pwsh 7.4.7 (Linux):  $env:XE='' / SetEnvironmentVariable('XE','','Process') / Set-Item / New-Item -> Test-Path False; child sees []
pwsh 7.6.6 (Linux):  all five -> Test-Path True; child sees [XE=]
WinPS 5.1.26100.9444: all five -> Test-Path False; "Environment variable XE not defined"
```

Matches the docs: [about_Environment_Variables 7.4](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_environment_variables?view=powershell-7.4) "an environment variable can't be set to an empty string. Setting an environment variable to `$null` or an empty string removes it", versus 7.6 "Beginning in PowerShell 7.5, you can set an environment variable to an empty string". Windows itself cannot hold an empty process variable; I did not run pwsh 7.6.6 on the Windows host (unverified). direnv 2.37.1 showed the same cell: `${env:H_EMPTY}=''` is 9/10 on 7.4.7 ([emitters-compared.md](../shell-audit/emitters-compared.md), E2E table). Rule: an emitter must either refuse an empty value for PowerShell targets, or document that empty means unset there, and its tests must assert with `Test-Path`, not `-eq ''`.

### 10. The never-emit list: `source <(...)` and the eval exit status

`source_subst.sh` (`gen` prints `v='it'\''s'`; `source <(gen)` against `eval "$(gen)"`):

```text
bash 3.2: source <(): v=[UNSET]   eval $(): v=[it's]         (silent)
bash 4.0 to 5.3, ash 1.35/1.37, ksh93u+m x2, bash 5.2 --posix, zsh sh: both v=[it's]
dash 0.5.12: Syntax error: "("     mksh R59c: syntax error     posh 0.14.1: syntax error     bash 3.2 --posix: syntax error
yash 2.52: source <(): v=[UNSET]   eval $(): v=[it's]         (silent)
```

starship moved off the form for exactly this reason (`starship@d4d0459c5c24:src/init/mod.rs:117-157`: bash 3.2 "does not support `source` with process substitution", process substitution unsupported in POSIX-mode bash <= 5.0, bootstrap is now `eval -- "$(starship init bash --print-full-init)"`). In this measurement bash 5.2 `--posix` accepts it, so the "<= 5.0" bound in that comment is not contradicted, only not the limit I tested. ShellCheck: under `-s sh`, SC3001 (process substitution) and SC3046 (`source`) fire on the planted form (exit 1) and not on `eval "$(...)"` (exit 0). fish has its own spelling, `source (cmd | psub)`, which is fine inside fish.

`eval "$(emitter)"` swallows the emitter's status (`eval_status.sh`): `A eval "$(emitter)" -> 0` on all 19 interpreter variants (11 POSIX-family, 8 bash) even when the emitter returned 65, and the two-step form is `caught` on all 19 (`out/eval_status.txt`). The refusal path of a quoter-with-rejection therefore needs the two-step consumer `out=$(emitter) || return`, which was caught on every one.

### 11. Extra parsers: quote once per layer, or pass argv (M-C-22)

[QuoteBench](https://arxiv.org/abs/2608.13547) (abstract read): replaying the same model replies through one added unescaped parser lowers success by 55.4 to 73.2 points. The mechanism is measurable with nested `sh -c` as the stand-in for `ssh host cmd`, `sudo sh -c` and `docker exec c sh -c` (ssh joins its arguments with spaces and hands the string to the remote login shell, the case [SC2029](https://www.shellcheck.net/wiki/SC2029) documents; no ssh daemon was available, so the layer is emulated: unverified against a real sshd). `layers.sh`, value `it's $HOME `id` "x" ; echo PWNED \ end`, depth k = 1, 2, 3:

```text
mode=naive (quote the value once, wrap each extra layer in double quotes):  k=1 OK, k=2 BAD, k=3 BAD   on all 11 POSIX-family shells (22 BAD cells)
mode=perlayer (re-quote the whole command once per layer, innermost first): k=1,2,3 OK                 on all 11
mode=argv (sh -c 'printf %s "$1"' _ "$value", forwarded untouched):         k=1,2,3 OK                 on all 11
```

Heuristic: count the parsers between the author of the string and the `exec`; each needs its own quoting pass, or the value rides as a positional parameter / environment variable and never appears inside code. Positional passing is the data-channel rung applied to a wrapper.

### 12. posh and a quoted pattern before a glob (M-M-13)

ocx's shared POSIX list construct (`crates/ocx_shell/src/shell.rs:294-299`, `:398-412`) relies on `${l%%"$p"*}`. `posh_pattern.sh` (`l=',a,b,'; p=',b,'`):

```text
A ${l%%"$p"*}    dash, ash x2, mksh, ksh93u+m x2, yash, bash 3.2/5.2 --posix, zsh sh: [,a] (right)   posh 0.14.1: [,a,b,] (wrong)
B ${l%%"$p"$star}                                                                         posh: [,a,b,] (wrong)
C case *"$p"*   match everywhere including posh
D ${l#*"$q"}    right everywhere including posh
```

Probes on posh alone (`work/posh2.sh`, `work/posh3.sh`): `${x%%"b"*}` on `x=ab` yields `ab` (wrong) and `${x%%b*}` yields `a` (right); a single-quoted literal pattern fails the same way. So the class is "a quoted (single or double) segment in a `%`/`%%` suffix pattern that precedes a glob loses the glob on posh 0.14.1"; prefix removal (`#`) and `case` are unaffected. posh is the Debian strict-POSIX conformance shell, not a real `/bin/sh`: severity low (P2), report-only. An emitter that must support posh uses `case` or prefix stripping for membership tests.

### 13. The mandatory hostile corpus

`corpus.txt` (36 lines, `name<TAB>hex-of-UTF-8-bytes`; the 20 wave-1 [emit] cases plus 16): `squote`, `dollar`, `backtick`, `backslash`, `trailing_bs`, `dbl_bs`, `newline`, `cr_crlf`, `percent`, `unicode`, `lead_dash`, `lead_dashes`, `empty`, `inject` (`x'; echo PWNED #`), `dquote`, `bang`, `glob_tilde`, `space_tab`, `operators`, `pwsh_special` (`$env:X @{} {0} -f ${x}`), then the new ones: `u2018`, `u2019`, `u201a`, `u201b`, `u201c`, `u201d`, `u201e`, `curly_inject` (`’;Write-Output PWNED;#`), `curly_dq_inject` (`”;Write-Output PWNED;#`), `curly_mixed` (`’'‘“"`), `nul` (must be rejected, not round-tripped), `nu_hash` (`a'#b'##c'`, kills a fixed-hash nu raw string), `trail_sq` (`x'`), `esc_bell` (ESC `[31m` BEL), `datelike` (`2026-10-11T00:00:00Z`, kills `ConvertFrom-Json`), `big4k` (4,680 bytes mixing every metacharacter, including U+2019 and newlines).

Every case earned its place by failing something measured: `trailing_bs`, `backslash`, `dbl_bs` (fish), `squote`, `inject`, `nu_hash`, `trail_sq`, `big4k` (nu and elvish), the seven curly cases (pwsh), `datelike` (JSON), `unicode` (5.1 native pipe, yash C locale), `empty` (pwsh 7.4.7, `$'..'`), `esc_bell` and `newline` (posh `printf %q`).

### 14. The verification recipe the shell-integration skill runs

1. Ship `corpus.txt` and a harness per target that, for each case: decodes the value, calls the project's quoter for that target, builds the set-variable statement, evaluates it inside the real interpreter (one evaluation per case so a parse error in one cannot hide another), prints the hex of the resulting variable and compares it to the corpus hex. `NUL` must produce a refusal from the quoter (exit 65, empty stdout). In this program the harness is `gen.py` plus `check.sh <quoter> <family...>`; for an adopter it is the same shape with the adopter's quoter as the function under test.
2. Run each target on its oldest and newest interpreter at least: sh family on dash and busybox ash plus bash 3.2 `--posix` (macOS-bound) and one of mksh/yash; bash 3.2 and 5.x; zsh 5.0.8 and 5.9; fish 3.6.0 and 4.x; nu 0.105.1 and the newest; elvish; pwsh 7.4 LTS or 7.6, and Windows PowerShell 5.1 whenever the emitter claims 5.1.
3. Green means 35 of 35 on every interpreter and `NOT-REJECTED` absent; any red is a defect in the quoter, not in the corpus. yash needs `LC_ALL=C.UTF-8`.
4. Add the static checks of the next section (`checks.sh`), the `shellcheck -s sh` run over the emitted sh text (SC3003, SC3001, SC3046), and, for every refusal path, a consumer test using `out=$(tool) || ...`.

## Normative guidance candidates

Format: rule; rationale; verification; RUN against a planted violation (fixture) or reading heuristic only. Unless noted, `check.sh` means `bash /home/mherwig/.cache/research-lang/shell-tools/fixtures/quoting-contract/check.sh <quoter> <family>`; exit 1 is red, 0 green.

1. **SH-EMIT-01. One quoter per (target, quoting context); the name states both (`fish_single_quoted`, `fish_double_quoted`, `posix_single_quoted`), and no quoter is reused across targets that are not the same grammar.** Rationale: grammar differs exactly where reuse fails (findings 1 and 2). Verify: corpus round trip per target, `check.sh fish_posixquoter fish` red (32/35 on 4 fish versions), `check.sh fish fish` green; also reading heuristic: every call to `shell_words::quote` or `shell_escape::unix::escape` sits in an sh/bash/zsh/ash/ksh/dash arm. RUN: yes, `out/r_fish_posixquoter.txt`, `out/r_fish.txt`.
2. **SH-EMIT-02. sh-family literal: `'..'` with `'` as `'\''`, nothing else, for every `sh`, bash, zsh, ksh, ash, dash, yash and posh target.** Rationale: POSIX XCU 2.2.2; 35/35 on 23 interpreter versions. Verify: `check.sh sh posix`, `check.sh sh bash`, `check.sh sh zsh` (green; run yash with `LC_ALL=C.UTF-8`). RUN: yes (`out/runall.txt`, `out/yash_fix.txt`).
3. **SH-EMIT-03. fish literal: `'..'` with `\` escaped first, then `'`. A fish double-quoted form escapes `\`, `$`, `"` and leaves backtick alone.** Rationale: fish gives `\` meaning inside `'`, so the POSIX form corrupts `a\\b` and unbalances a trailing backslash. Verify: `check.sh fish fish` on fish 3.6.0, 4.0.2, 4.7.0, 4.9.3. RUN: yes (green 35/35; red twin = rule 1).
4. **SH-EMIT-04. nu literal: `r#'..'#` with n hashes where n is 1 plus the longest run of `#` directly after any `'` in the value, or a plain `".."` string escaping `\` then `"`; never `'..'` for arbitrary data, never an interpolated `$".."` for data.** Rationale: nu single quotes cannot contain `'`; a fixed hash count breaks on `'#`. Verify: `check.sh nu_raw nu`, `check.sh nu_dq nu` green; `check.sh nu_posixquoter nu` red (29/35 on 0.105.1 and 0.116.0). RUN: yes.
5. **SH-EMIT-05. elvish literal: `'..'` with `'` doubled; the emitter never reuses the POSIX quoter for elvish.** Rationale: elvish single quotes have no backslash escape; `'\''` is not valid. Verify: `check.sh elvish elvish` green, `check.sh elvish_posixquoter elvish` red (29/35). RUN: yes.
6. **SH-EMIT-06. PowerShell single-quoted literal: double each of U+0027, U+2018, U+2019, U+201A and U+201B (the same character twice).** Rationale: the tokenizer ends the literal at any of the five (CharTraits.cs, tokenizer.cs:2325); `'`-only doubling executes attacker text on pwsh 7.4.7, 7.6.6 and WinPS 5.1. Verify: (a) `pwsh curly.ps1 ocx` exit 1 versus `curly.ps1 fixed` exit 0 on all three versions; (b) `check.sh pwsh_ocx pwsh` red (28/35) versus `check.sh pwsh_sq pwsh` green (35/35); (c) static: `grep -rlF --include='*.rs' -e "replace('\\''" . | xargs -r grep -L -e '2019'` and `grep -rlF --include='*.go' -e 'ReplaceAll(s, "'"'"'", "'"''"'")' . | xargs -r grep -L -e '2019'` print the files that double the apostrophe and never mention U+2019 (empty output = pass). RUN: yes (`checks.sh` C1: bad prints `./escape.rs` and `./escape.go`, good prints nothing, exit 1 / 0).
7. **SH-EMIT-07. Prefer single-quoted PowerShell literals. If a double-quoted PowerShell string is unavoidable, backtick-escape `` ` ``, `$` and each of U+0022, U+201C, U+201D, U+201E, and never put emitted data in an interpolating position.** Rationale: the double-quote class is symmetric (tokenizer.cs:2457) and `$(..)` runs code. Verify: `check.sh pwsh_dq pwsh` green, `check.sh pwsh_dq_naive pwsh` red (30/35); `pwsh curly-matrix.ps1` has 21 `Naive pwned=True` rows and 0 Fixed rows with `pwned=True` (exit 0). RUN: yes.
8. **SH-EMIT-08. The hostile corpus is mandatory in every emitter's tests: the 36 cases of `corpus.txt`, executed in the real interpreter of each target, compared byte for byte; the curly cases are part of it.** Rationale: each case maps to a measured failure (finding 13); 4 of 5 upstream tools missed the curly cases. Verify: `grep -rL -e '2019' --include='*test*' .` run from the emitter's test directory prints test files lacking the curly cases (empty = pass), plus the round trip itself. RUN: no for the grep on a real test tree (the fixture twin is `checks.sh` C1 only); yes for the round trip (`runall.sh`, exit 1 on any unexpected red; yash row ignored and re-run under `C.UTF-8`).
9. **SH-EMIT-09. Reject NUL (and any value a target cannot carry) before emitting: exit 65, stdout empty, message on stderr.** Rationale: eight implementations silently truncate to `ab` (finding 7). Verify: corpus case `nul`: `python3 -I gen.py <quoter>` writes `nul:REJECTED` to `work/s_<quoter>.expect` and `summ.py` exits 1 on `NOT-REJECTED`; for the product, a test that `tool --env 'K=<NUL>'` exits 65 with empty stdout. RUN: yes for the reference quoters (`REJECTED` in every `out/*` block); no for a product's exit-65 test (fleet CLI contract, reading).
10. **SH-EMIT-10. A refusing emitter is consumed as `out=$(tool ...) || return`, never as `eval "$(tool ...)"` alone.** Rationale: `eval "$(false-with-65)"` returns 0 on every shell measured. Verify: `matrix.sh posix eval_status.sh` prints `A ... -> 0` and `B ... caught`. RUN: yes (`eval_status.sh`).
11. **SH-EMIT-11. Never emit `$'..'` for sh targets (dash 0.5.12, yash 2.52, posh 0.14.1 print it wrongly with no error).** Rationale: 0/35 on those three. Verify: `shellcheck -s sh <emitted.sh>` reports SC3003 (default checks, no optional check needed); static `grep -rnF --include='*.rs' --include='*.go' --include='*.py' -e "=\$'" -e "\"\$'" .` over emitter sources. RUN: yes (`sc/emitted_dollarq.sh` exit 1 with SC3003, twin `emitted_sq.sh` exit 0; `checks.sh` C2: bad prints `./escape.rs:6`, good empty).
12. **SH-EMIT-12. Never emit `source <(cmd)` or `. <(cmd)`; bootstrap with `eval "$(cmd)"` (fish: `source (cmd | psub)`).** Rationale: bash 3.2 and yash leave the variable unset silently; dash, mksh, posh, bash 3.2 `--posix` are syntax errors (finding 10). Verify: `shellcheck -s sh` SC3001 and SC3046 on the emitted text; `grep -rnF --include='*.rs' --include='*.go' --include='*.py' -e 'source <(' -e '. <(' .`. RUN: yes (`sc/emitted_source_subst.sh` exit 1, twin `emitted_eval.sh` exit 0; `checks.sh` C3: bad `./escape.rs:8`, good empty; `source_subst.sh` matrix).
13. **SH-EMIT-13. Do not emit output of `printf %q`, `${x@Q}` or zsh `(q)` for other targets; they are runtime conveniences of one shell.** Rationale: `printf %q` is 1/35 on dash, ash, yash; `${x@Q}` is 1/35 on bash 3.2/4.0/4.2 and every non-bash except mksh. Verify: `matrix.sh bash work/s_bashq_at.sh` (generated by `gen_bashq.py at`) and `summ.py bashq_at`. RUN: yes (bash 3.2/4.0/4.2 red, 4.4 to 5.3 green).
14. **SH-EMIT-14. Data-channel order: no emitted code, then emitted data parsed natively (nu `from json`, elvish `from-json`, pwsh base64) with ASCII-only content, then a literal from the per-target quoter.** Rationale: removes the quote class and the 5.1 code page from the equation (findings 5 and 8). Verify: `check.sh nu_json nu`, `check.sh elvish_json elvish`, `check.sh pwsh_b64 pwsh` all green (35/35). RUN: yes.
15. **SH-EMIT-15. Never use `ConvertFrom-Json` as the PowerShell data channel.** Rationale: ISO-date strings become `[DateTime]` on 7.4.7 and 7.6.6; `-DateKind` is 7.5+. Verify: `check.sh pwsh_json pwsh` red on 7.4.7 and 7.6.6 (34/35, `datelike`), green on 5.1. RUN: yes (red, with the 5.1 green as the twin).
16. **SH-EMIT-16. A PowerShell emitter that claims 5.1 emits ASCII only (`[char]0xNN` or base64); it never writes UTF-8 text literals.** Rationale: 5.1 decodes native stdout and BOM-less files with the OEM or ANSI code page. Verify: `matrix.sh pwsh pipe-unicode.ps1`: `sq-literal False` on 5.1, `[char]` and base64 True. RUN: yes.
17. **SH-EMIT-17. Never use `$env:X = ''` to express an empty value; refuse empty for PowerShell targets, or document empty as unset there, and assert with `Test-Path env:X`.** Rationale: 7.4.7 and 5.1 remove the variable, 7.6.6 keeps it (7.5 change). Verify: `matrix.sh pwsh env-empty.ps1` prints `Test-Path ... False` on 7.4.7 and 5.1 and `True` on 7.6.6; static `grep -rnF --include='*.rs' --include='*.go' --include='*.py' -e " = ''" .` over emitter sources lists the sites to review. RUN: yes (`checks.sh` C4: bad `./escape.rs:10`, good empty; matrix run).
18. **SH-EMIT-18. Count parsers between author and exec; quote once per layer innermost first, or pass the value as a positional parameter or environment variable; never wrap a once-quoted command in a second level of plain double quotes.** Rationale: QuoteBench 55.4 to 73.2 points; measured naive failure at depth 2 and 3 on 11 shells. Verify: `matrix.sh posix layers.sh` prints `k=2 mode=naive BAD` and `k=2 mode=perlayer OK`, `mode=argv OK`; ShellCheck SC2029 for the ssh case on the client side. RUN: yes (`layers.sh`); SC2029 reading only.
19. **SH-EMIT-19. Do not parse, snapshot or compare the output of a shell's own escape facility (`fish string escape`, `printf %q`) across versions.** Rationale: fish 3.6.0 prints `it\'s`, 4.x prints `"it's"` for the same input; both round-trip. Verify: `matrix.sh fish work/dbg_fe.fish`. RUN: yes (read the two outputs).
20. **SH-EMIT-20. Test with a UTF-8 locale for yash and with the oldest interpreter of each family; a green run on the author's shell is not evidence.** Rationale: yash 2.52 fails 12 of 35 in the C locale; bash 3.2 differs on `${x@Q}` and `source <()`. Verify: `check.sh sh posix` shows yash 23/35 FAIL unicode,u2018.. without the locale and 35/35 with `docker run -e LC_ALL=C.UTF-8`. RUN: yes.
21. **SH-EMIT-21. An emitter that uses a quoting construct that only some POSIX shells accept (a quoted segment before a glob inside `%%`) must probe posh or use `case`/prefix stripping.** Rationale: posh 0.14.1 drops the glob. Verify: `matrix.sh posix posh_pattern.sh`: `A` and `B` wrong only on posh. RUN: yes.
22. **SH-EMIT-22. ocx-family code: change `single_quoted_doubled` (`escape.rs:35`) into a quoter that doubles the five characters, split the elvish caller from the PowerShell callers, and update the test at `escape.rs:84-87`; add the curly cases to `HOSTILE` (`shell.rs:1869-1872`).** Rationale: reproduced from the real binary. Verify: `pwsh curly-ocx.ps1` exit 1 today, exit 0 after the change. RUN: yes for the red (`out/e2e_ocx_pwsh.txt`); the green is a prediction (report only; owner Q6).

## Verification runs

All runs by `bash <fixture>/<script>` from the fixture directory; matrix logs are in `out/`. "Red" means the verification exits 1 and shows the failing cases; "twin" is the compliant counterpart. Sixteen red/green pairs were watched: sh_dollarq, fish_posixquoter, elvish_posixquoter, nu_posixquoter, pwsh_ocx, pwsh_dq_naive, curly.ps1, curly-matrix.ps1 (Naive vs Fixed), `checks.sh` C1, C2, C3, C4, ShellCheck SC3003, ShellCheck SC3001/SC3046, `layers.sh` (naive vs perlayer) and the real-ocx run `curly-ocx.ps1` (twin: `curly.ps1 fixed`).

| Verification | Command | Red (exit, lines) | Twin (exit, lines) |
|---|---|---|---|
| sh quoter, hostile corpus | `./check.sh sh posix bash zsh` | n/a (green): exit 0; dash, ash x2, mksh, ksh93 x2, posh, bash 3.2/5.2 `--posix`, zsh 5.9 sh `35/35`; bash 3.2 to 5.3 `35/35`; zsh 5.0.8 to 5.9 `35/35`; `yash 2.52: 23/35 FAIL unicode,u2018,...,big4k` in the C locale | `LC_ALL=C.UTF-8` yash: `yash 2.52 LC_ALL=C.UTF-8: 35/35` |
| `$'..'` on sh targets | `./check.sh sh_dollarq posix` | exit 1: `dash 0.5.12: 0/35`, `yash 2.52: 0/35`, `posh 0.14.1: 0/35` | `./check.sh sh posix`: busybox ash x2, mksh, ksh93 x2 `35/35` |
| fish quoter | `./check.sh fish_posixquoter fish` | exit 1: `fish 3.6.0 / 4.0.2 / 4.7.0 / 4.9.3: 32/35 FAIL backslash,trailing_bs,dbl_bs` | `./check.sh fish fish`: exit 0, `35/35` x4 |
| elvish quoter | `./check.sh elvish_posixquoter elvish` | exit 1: `elvish 0.21.0: 29/35 FAIL squote,inject,curly_mixed,nu_hash,trail_sq,big4k` | `./check.sh elvish elvish`: exit 0, `35/35` |
| nu quoter | `./check.sh nu_posixquoter nu` | exit 1: `nu 0.105.1: 29/35`, `nu 0.116.0: 29/35`, same six failures | `./check.sh nu_raw nu` and `./check.sh nu_dq nu`: exit 0, `35/35` x2 |
| pwsh single-quote doubling | `./check.sh pwsh_ocx pwsh` | exit 1: `pwsh 7.4 LTS / 7.6.6 / Windows PowerShell 5.1: 28/35 FAIL u2018,u2019,u201a,u201b,curly_inject,curly_mixed,big4k` | `./check.sh pwsh_sq pwsh`: exit 0, `35/35` x3 |
| pwsh double-quote class | `./check.sh pwsh_dq_naive pwsh` | exit 1: `30/35 FAIL u201c,u201d,u201e,curly_dq_inject,curly_mixed` x3 | `./check.sh pwsh_dq pwsh`: exit 0, `35/35` x3 |
| curly payload | `matrix.sh pwsh curly.ps1 ocx` | exit 1 x3: `quoter=ocx pwned=True roundtrip=False` | `matrix.sh pwsh curly.ps1 fixed`: exit 0 x3: `quoter=fixed pwned=False roundtrip=True` |
| curly class, both contexts | `matrix.sh pwsh curly-matrix.ps1` | 21 rows `Naive pwned=True roundtrip=False` (`Sq U+2018/2019/201A/201B`, `Dq U+201C/201D/201E`, x3 versions) | 27 rows `Fixed pwned=False roundtrip=True`; script exit 0 |
| near-miss negatives | `matrix.sh pwsh curly-negative.ps1` | n/a: 36 rows, 0 `pwned=True`, 0 `rt=False`, exit 0 x3 | n/a |
| real ocx | `matrix.sh pwsh curly-ocx.ps1` (embeds the line `ocx env --env K=... --shell=powershell` printed) | exit 1 x3: `emitted: $env:K = '’;Write-Output PWNED;#'` `pwned=True  K=[]` | `curly.ps1 fixed` above |
| real direnv 2.37.1 | `matrix.sh pwsh e2e/direnv/run-export.ps1` | exit 1 on pwsh 7.4 LTS and 7.6.6: `pwned=True  K=[]` (5.1 not run: direnv refuses below 7.2; the 5.1 row of the log is a staging error, disregard) | no twin |
| real mise 2026.10.2 | `matrix.sh pwsh e2e/mise/run-export.ps1` | exit 1 on 7.4 and 7.6.6: `pwned=True  K=[]` (5.1 staging error, disregard) | no twin |
| starship 1.25.1 | stub files `e2e/sq/stub.benign.pwsh` (run through `Invoke-Expression`) | parse error on 7.4: "The string is missing the terminator: '." | not exploitable in the shape tried |
| decode path on 5.1 | `matrix.sh pwsh curly-pipe.ps1` | 5.1: routes 2, 4, 5 `pwned=True`; 7.4/7.6.6 all four routes `pwned=True` | 5.1 default routes 1 and 3 `pwned=False` (mangled) |
| non-ASCII on 5.1 | `matrix.sh pwsh pipe-unicode.ps1` | 5.1: `sq-literal (UTF-8 text) roundtrip=False` | 5.1: `[char]` and base64 `roundtrip=True`; 7.x all True |
| pwsh data channels | `./check.sh pwsh_b64 pwsh`; `./check.sh pwsh_json pwsh` | json: `pwsh 7.4 LTS: 34/35 FAIL datelike`, `7.6.6: 34/35 FAIL datelike` | base64 `35/35` x3; json on 5.1 `35/35` |
| nu and elvish data channels | `./check.sh nu_json nu`; `./check.sh elvish_json elvish` | n/a (green) `35/35` on nu 0.105.1, 0.116.0, elvish 0.21.0 | n/a |
| empty env | `matrix.sh pwsh env-empty.ps1` | 7.4.7 and 5.1: `Test-Path env:XE = False` for all five forms | 7.6.6: `True` for all five, `child sees: [XE=]` |
| static checks | `./checks.sh emitter-src/bad` | exit 1: C1 `./escape.rs`, `./escape.go`; C2 `./escape.rs:6:    format!("v=$'{}'", ...)`; C3 `./escape.rs:8:... "source <(tool init bash)"`; C4 `./escape.rs:10:    format!("$env:{k} = ''")` | `./checks.sh emitter-src/good`: exit 0, no output in any of the four sections |
| ShellCheck 0.11.0 | `run.sh shellcheck -s sh sc/emitted_dollarq.sh`; same on `emitted_source_subst.sh` | exit 1: `SC3003 (warning): In POSIX sh, $'..' is undefined.` x2; `SC3046`, `SC1090`, `SC3001` | `emitted_sq.sh` exit 0; `emitted_eval.sh` exit 0 |
| bash facilities | `gen_bashq.py printf\|at` then `matrix.sh bash`/`posix` + `summ.py` | `${x@Q}`: `bash 3.2: 1/35`, `4.0: 1/35`, `4.2: 1/35`; `printf %q`: `dash 0.5.12: 1/35`, `yash 2.52: 1/35` | `bash 4.4 to 5.3: 35/35` (@Q); bash 3.2 to 5.3 `35/35` (printf %q) |
| extra parsers | `matrix.sh posix layers.sh` | `k=2 mode=naive BAD`, `k=3 mode=naive BAD` on 11 shells (22 BAD) | `mode=perlayer` and `mode=argv` OK at k=1,2,3 on 11 shells |
| source substitution | `matrix.sh bash source_subst.sh`; `matrix.sh posix source_subst.sh` | `bash 3.2 source <(): v=[UNSET]`; dash `Syntax error: "("`; yash `v=[UNSET]` | `eval $(): v=[it's]` on all that parse |
| eval status | `matrix.sh posix eval_status.sh` | `A eval "$(emitter)" -> 0` although the emitter returned 65 | `B out=$(emitter) \|\| ... -> caught` |
| posh pattern | `matrix.sh posix posh_pattern.sh` | `posh 0.14.1`: `A => [,a,b,]` wrong | the other ten: `[,a]` |

Failed or non-reproduced items, reported as such: (1) the starship injection variant (`stub.crafted.pwsh`) did not execute, because the truncated path is not a runnable command; only the parse failure is established. (2) The direnv and mise 5.1 rows in `out/e2e_*_pwsh.txt` are a staging error (the data file was not copied to `C:\Users\ecom\shell-wintest`); 5.1 for the same emitted line is covered by `curly.ps1` and `curly-ocx.ps1`. (3) My first fish `string escape` harness was wrong twice (stale `$status` after `set -e v`, an empty argument dropped by fish); fixed before the reported 35/35. (4) `runall.sh` ends with exit 1 unless `SUMM_IGNORE='yash 2.52'` is honoured for the C-locale row, which `runall.sh` does and then re-runs yash under `C.UTF-8`.

## Exemplar evidence

Corpus SHAs from [exemplar-shas.md](../shell-audit/scratch/exemplar-shas.md); ocx at `5de9d777eb7d`.

- **SH-EMIT-01/02/03/05 (per-target quoters, passes):** ocx names its escapers by context and pins the fish one-byte difference (`ocx@5de9d777eb7d:crates/ocx_shell/src/shell/escape.rs:13, 19, 27, 60-73`); omp has seven separate quoters (`oh-my-posh@b0a8acd4d402:src/shell/*.go`: `QuotePosixStr`, `quoteFishStr`, `quoteNuStr`, `quoteElvishStr`, `quoteYashStr`, `quotePwshStr`) and is 20/20 where syntax is supported ([emitters-compared.md](../shell-audit/emitters-compared.md)); mise's elvish quoter carries its own history (`mise@19e8c8f0d03d:src/shell/elvish.rs:120-131`, "`shell_escape::unix::escape` was writing bash's rules instead"). Violations: mise fish uses the POSIX crate for fish (`mise@19e8c8f0d03d:src/shell/fish.rs:9, 22, 154, 159, 176`), 17/20 and 2 E2E reproductions in wave 1; starship uses `shell_words::quote` for fish, nu and elvish (`starship@d4d0459c5c24:src/init/mod.rs:44, 60, 100`), 17-18/20 and the O'Brien-path failures.
- **SH-EMIT-06/07 (pwsh class):** violated by ocx (`escape.rs:35`, `shell.rs:198, 216`, `hook.rs:110, 391`), direnv (`direnv@28a73d1df3f3:internal/cmd/shell_pwsh.go:195`), mise (`mise@19e8c8f0d03d:src/shell/pwsh.rs:410`), starship (`starship@d4d0459c5c24:src/init/mod.rs:50`). Nobody satisfies it: `grep -rln -e 2019` over the four PowerShell quoter locations finds no U+2019 handling. mise's doc comment (`pwsh.rs:395-407`) is the closest to the right reasoning and stops at the backtick. zoxide is not applicable (`zoxide@86b443cffcd7:templates/powershell.txt:148-149`).
- **SH-EMIT-08 (corpus):** direnv has the only Go test of its pwsh escaper (`direnv@28a73d1df3f3:internal/cmd/shell_test.go:32-39`, `don''t` only); ocx's `HOSTILE` list has 18 values and no curly case (`ocx@5de9d777eb7d:crates/ocx_shell/src/shell.rs:1869-1872`; wave 1 measured 982/989 round trips, the failures including `smart_quotes` on pwsh ([ocx-emitter.md](../shell-audit/ocx-emitter.md), section "PowerShell curly-quote injection")); starship's tests are four unit tests with no interpreter.
- **SH-EMIT-11/12 (never emit):** starship's bootstrap history documents both rules with the failing cases (`starship@d4d0459c5c24:src/init/mod.rs:117-157`); the starship stub for fish still uses `source (... | psub)` (`:158-161`), which is the fish-correct form. omp's `$'..'` form (`omp.posix`) is 20/20 on bash, zsh, busybox ash, mksh, ksh93 and 1/20 on dash, yash, posh per wave 1 (`emitters-compared.md`, results table); omp ships a separate `quoteYashStr` for that reason.
- **SH-EMIT-14 (data channel):** satisfied by direnv elvish (`direnv@28a73d1df3f3:internal/cmd/shell_elvish.go:17`, JSON via `from-json`) and mise nu (`mise@19e8c8f0d03d:src/shell/nushell.rs:30-36, 145-146`, CSV); ocx's nu path inlines escaped strings (`nushell_plain_string`, `escape.rs:43`) and is correct on 35/35 (`nu_dq`).
- **SH-EMIT-17 (empty):** direnv emits `${env:H_EMPTY}=''` and loses the variable on 7.4.7 (wave 1, 9/10); ocx's `batch_cannot_express` refusal in `escape.rs:46-52` is the pattern to copy for PowerShell empties.
- **SH-EMIT-10 (refusal channel):** ocx's `ocx shell` activation is consumed by `eval`-style hooks; the status-swallowing property above applies to any such hook (reading heuristic: no consumer in the corpus checks `$(..) ||`).

## AI-agent angle

| What an LLM characteristically gets wrong | Smallest mechanical check |
|---|---|
| Writes one `shell_escape`/`shlex.quote`/`shell_words::quote` helper and uses it for fish, nu, elvish too | `check.sh <quoter> <family>`: the hostile corpus through the real target (red 32/35, 29/35) |
| Doubles `'` for PowerShell and stops ("PowerShell escapes with `''`") | `grep` C1 (file doubles the apostrophe, never mentions 2019); `pwsh curly.ps1` exit 1 |
| Assumes a trailing backslash is harmless in fish single quotes | corpus case `trailing_bs` ("quotes are not balanced") |
| Emits `$'..'` for `/bin/sh` because bash accepts it | `shellcheck -s sh` SC3003 (exit 1); `check.sh sh_dollarq posix` red on dash, yash, posh |
| Bootstraps with `source <(tool init)` because it is the idiom in READMEs | `shellcheck -s sh` SC3001/SC3046; grep C3; `matrix.sh bash source_subst.sh` (bash 3.2 unset) |
| `eval "$(tool)"` and assumes failure propagates | `matrix.sh posix eval_status.sh`: status 0 |
| Uses `ConvertFrom-Json` as a safe data channel on pwsh | corpus case `datelike`: 34/35 red on 7.4.7 and 7.6.6 |
| Sets `$env:X = ''` and tests with `-eq ''` | `Test-Path env:X` in `env-empty.ps1`; grep C4 |
| Writes UTF-8 literals into pwsh code for 5.1 | `pipe-unicode.ps1` `sq-literal False` on 5.1 |
| Trusts `printf %q` or `${x@Q}` output in code for another shell | `gen_bashq.py` runs: 1/35 on dash, bash 3.2 |
| One level of quoting through `ssh`, `sudo sh -c`, `docker exec c sh -c` | `layers.sh` naive BAD at k=2; ShellCheck SC2029 for the ssh client-side expansion |
| Uses `get -i` in nu code written from older training data | `matrix.sh nu`: deprecation warning on 0.116.0, `-o` unknown on 0.105.1 |
| Passes a NUL through "because strings are bytes" | corpus case `nul`: `REJECTED` required; `nul_eval.sh` shows silent `ab` |
| Interpolates a path into emitted PowerShell without thinking of `’` in a Windows user name | corpus `u2019` against the install-path quoter; the starship `O’Brien` reproducer |
| Believes 5.1's default code page "makes it safe" | `curly-pipe.ps1`: `pwned=True` as soon as UTF-8 decoding is on |

Mistakes in this list that ShellCheck cannot see: everything where the emitted text is inside a Rust, Go or Python string literal (no glob reaches it, topic map conflict on shell-integration); those are covered by the corpus run and the four greps over emitter source.

## Contested / evolving

- **Escape the class versus refuse it.** I chose escaping (doubling is lossless on 7.4.7, 7.6.6, 5.1) over refusing values with curly quotes (ocx refuses `%` for batch via `batch_cannot_express`). A refusal is the right shape for values a target cannot carry (NUL, empty on pwsh, `%` in batch); curly quotes are carryable. As of 2026-10-11 no tool measured does either.
- **PowerShell empty environment values.** Changed in 7.5 ([docs](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_environment_variables)); 7.4 LTS and 5.1 keep the old rule, and 7.4/7.5 reach end of support on 2026-11-10 per the topic map (conflict 6), so the "7.6 semantics" camp wins from November while 5.1 stays frozen. Trend: converging on empty-is-empty everywhere except Windows PowerShell 5.1.
- **`ConvertFrom-Json` date handling.** `-DateKind` appeared in 7.5 and defaults to converting; the default was not changed in 7.6.6. Trend: stable, still a trap; base64 avoids the debate.
- **`$'..'` on sh.** POSIX.1-2024 added it; dash 0.5.12 (Debian 12, Ubuntu 24.04), yash 2.52 and posh 0.14.1 do not have it. The wave-1 topic map resolved "never" for `#!/bin/sh`; this contract extends it to emitted text. Trend: adoption will arrive with dash and yash releases; until a probe passes, never.
- **Process substitution in POSIX mode.** starship's comment says unsupported in POSIX-mode bash <= 5.0; measured here: works in bash 5.2 `--posix`, syntax error in bash 3.2 `--posix`. The conservative reading (never) holds for any macOS-bound or sh target.
- **fish `string escape` output form** changed between 3.6 and 4.0 (`\'` to double quotes); fish 4.x trend is toward more readable output, so never snapshot it.
- **nu churn.** `get -i` to `get -o` between 0.105.1 and 0.116.0, and, in wave 1, 4.5% of nu_scripts changed over the same window; nu emission needs the version guard that ocx already has (`describe`-based, wave 1), but the quoting grammar for `r#'..'#` and `".."` was stable across both versions measured.
- **Whether PowerShell will ever stop treating smart quotes as quotes.** The docs call it deliberate convenience and tell authors not to use them; no sign of change in 7.6.6 as of this date.

## Sources

Primary sources are marked P. "Read" means fetched in full or the relevant section extracted; local files were read from disk.

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| P [pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html) | POSIX.1-2024 XCU 2.2 Quoting (2.2.2 single quotes, 2.2.4 dollar-single-quotes) | 2024 edition | The normative base for the sh quoter and for `$'..'` becoming standard |
| P [fishshell.com/docs/current/language.html](https://fishshell.com/docs/current/language.html) | fish language reference, Quotes | current (fish 4.x) | States the only single-quote escapes (`\'`, `\\`) |
| P [nushell.sh/book/working_with_strings.html](https://www.nushell.sh/book/working_with_strings.html) | nushell strings chapter | 0.11x era | Raw strings, the `#` count rule, double-quoted escapes, interpolation forms |
| P [elv.sh/ref/language.html](https://elv.sh/ref/language.html) | elvish language reference 3.3, 3.4 | 0.21 era | Single-quote doubling; `\0` invalid, `\x00` instead |
| P [about_Quoting_Rules (learn.microsoft.com)](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_quoting_rules), source read at [raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/.../about_Quoting_Rules.md](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Quoting_Rules.md) and its 5.1 twin | PowerShell quoting rules including Smart quotes | 2026, 5.1 and 7.6 | The one documented statement of the quote-equivalence class |
| P [github.com/PowerShell/PowerShell .../parser/CharTraits.cs](https://github.com/PowerShell/PowerShell/blob/master/src/System.Management.Automation/engine/parser/CharTraits.cs) | `IsSingleQuote` and `IsDoubleQuote` | master, read 2026-10-11 | The exact code points |
| P [github.com/PowerShell/PowerShell .../parser/tokenizer.cs](https://github.com/PowerShell/PowerShell/blob/master/src/System.Management.Automation/engine/parser/tokenizer.cs) | `ScanStringLiteral`, `ScanStringExpandable`, here-string footers | master, read 2026-10-11 | Why a doubled curly round-trips (second of a pair is appended) |
| P [tiswww.case.edu/php/chet/bash/NEWS](https://tiswww.case.edu/php/chet/bash/NEWS) | bash NEWS 2.0 to 5.3 | through bash 5.3 | `${parameter@spec}` appears in 4.4; `printf %q` form notes (5.3 item l, `$'..'` for non-printing) |
| P [about_Environment_Variables 7.6 and 7.4 sources](https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Environment_Variables.md) | Empty-value semantics by version | 2026 | The 7.5 change, quoted |
| P [ShellCheck wiki SC3003](https://www.shellcheck.net/wiki/SC3003), [SC1110/SC1112](https://www.shellcheck.net/wiki/SC1112), [SC2029](https://www.shellcheck.net/wiki/SC2029), [SC2294](https://www.shellcheck.net/wiki/SC2294) | Wiki pages read from the local clone `exemplars/shell/koalaman__shellcheck.wiki` at 0b4dfe7bf9dc | 2026, ShellCheck 0.11.0 | `$'..'` in sh, Unicode quotes, the ssh client-side expansion, eval and arrays |
| P [PSScriptAnalyzer rules: UseBOMForUnicodeEncodedFile](https://github.com/PowerShell/PSScriptAnalyzer/blob/main/docs/Rules/UseBOMForUnicodeEncodedFile.md), [AvoidUsingInvokeExpression](https://github.com/PowerShell/PSScriptAnalyzer/blob/main/docs/Rules/AvoidUsingInvokeExpression.md) | The two analyzer rules next to this topic | docs dated 2026-07-21 | The static-analysis side of 5.1 encoding and of `Invoke-Expression` as an injection sink |
| [arxiv.org/abs/2608.13547](https://arxiv.org/abs/2608.13547) | QuoteBench, abstract | 2026 | Only quantified evidence for losses through an added parser |
| [ocx escape.rs, shell.rs, hook.rs (local checkout at 5de9d777eb7d)](file:///home/mherwig/dev/ocx/crates/ocx_shell/src/shell/escape.rs) | The emitter under test | 2026-10 | Per-context escapers, the defective `single_quoted_doubled`, the test that pins it |
| [direnv shell_pwsh.go, shell_test.go, shell_elvish.go](file:///home/mherwig/.cache/research-lang/exemplars/shell/direnv__direnv/internal/cmd/shell_pwsh.go) at 28a73d1df3f3 | Upstream emitter | 2026 | Byte-wise pwsh escaper; JSON channel for elvish |
| [starship src/init/mod.rs](file:///home/mherwig/.cache/research-lang/exemplars/shell/starship__starship/src/init/mod.rs) at d4d0459c5c24 | Upstream emitter | 2026 | `sprint_pwsh`, the bootstrap history of `source <()` versus `eval` |
| [mise src/shell/{pwsh,fish,elvish,nushell}.rs](file:///home/mherwig/.cache/research-lang/exemplars/shell/jdx__mise/src/shell/pwsh.rs) at 19e8c8f0d03d | Upstream emitter | 2026 | `escape_sq`, the POSIX crate used for fish, CSV data channel for nu |
| [zoxide templates/powershell.txt](file:///home/mherwig/.cache/research-lang/exemplars/shell/ajeetdsouza__zoxide/templates/powershell.txt) at 86b443cffcd7 | Upstream emitter | 2026 | Shows what zoxide does not quote (corrects wave 1) |
| [shell-audit/emitters-compared.md](../shell-audit/emitters-compared.md), [shell-audit/ocx-emitter.md](../shell-audit/ocx-emitter.md) | Wave-1 audits of eight emitters and of ocx | 2026-10-10 | The 20-case corpus, 982/989 result, released-binary reproductions |
| [fleet CLI contract: rules/rust-quality/cli-contract.md](../../../rules/rust-quality/cli-contract.md) | Exit-code and stream contract | 2026 | Exit 65 `DataError` for a refused value |
| Fixture outputs under `/home/mherwig/.cache/research-lang/shell-tools/fixtures/quoting-contract/out/` | My own matrix logs (36-case round trips, curly matrix, E2E reproductions) | 2026-10-11 | The measured side of every claim above |
| Real-binary reproductions: direnv 2.37.1, mise 2026.10.2, starship 1.25.1, installed ocx (via `ocx --project .../emitters/ocx/ocx.toml exec`) | Released tools run read-only | 2026-10-11 | Proof the source defects reach shipped binaries |
| [PowerShell-Docs PR 12316 (search result only, not fetched)](https://github.com/MicrosoftDocs/PowerShell-Docs/pull/12316) | Docs change for empty env values in 7.5 | 2025 | Pointer only; the claim above rests on the two fetched about_Environment_Variables pages |

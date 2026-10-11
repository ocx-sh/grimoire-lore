---
title: The shell-diagnose catalog and the shell-port runbook (with the MUST-row tables of shell-integration and installer-script)
topic: shell-skills / diagnose-and-port (W3-8, revised to cite the wave-2 IDs; rows M-W-01..M-W-04; family SH-CORE)
agent: shell skills/diagnose-and-port research subagent
model: sonnet
date_researched: 2026-10-11
sources_count: 25
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/diagnose-and-port/
scope: >-
  Covers: the symptom to cause to check to fix catalog of shell-diagnose with the error text pinned per
  interpreter and version; the shell-port procedure and receipt, run end to end on a fleet-shaped script;
  a dry run of the shell-integration procedure on a 3-target toy emitter; the bounded MUST-row tables of
  shell-integration, installer-script, shell-port and shell-diagnose; SKILL.md line budgets.
  Does not cover: re-deciding the artifact set (the map binds), the SH-INST/SH-SEC/SH-TEST/SH-ZSH/SH-FISH/SH-NU/
  SH-ELV/PS-SEC rules (wave 3, cited as M-IDs), any macOS or BSD behaviour (no host: every such claim says
  "unverified: read only"), and fixes to ocx or fleet defects (owner Q6: reported with file:line and a reproducer).
---

# The shell-diagnose catalog and the shell-port runbook

All dates 2026-10-11. `F` below is the fixture directory
`/home/mherwig/.cache/research-lang/shell-tools/fixtures/diagnose-and-port`. A run line such as `F/out/r02.txt`
is the captured output, kept verbatim. Rule IDs come from the seven wave-2 consolidations, applying the map's
"Wave 2 landed" (e) choices (X2, X7, X9, X13, X19, X22 and the rest). Families still in wave 3 are cited as M-IDs.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The house skill shape and what carries over](#1-the-house-skill-shape-and-what-carries-over)
   2. [Step 0 for shell-diagnose: identify the interpreter before reading the error](#2-step-0-for-shell-diagnose-identify-the-interpreter-before-reading-the-error)
   3. [The shell-diagnose catalog: error text pinned per interpreter](#3-the-shell-diagnose-catalog-error-text-pinned-per-interpreter)
   4. [Signal statuses: 141/269/397 and 143/271/399](#4-signal-statuses-141269397-and-143271399)
   5. [The shell-port runbook, run end to end](#5-the-shell-port-runbook-run-end-to-end)
   6. [The five authored bash 4+ fleet files as port candidates](#6-the-five-authored-bash-4-fleet-files-as-port-candidates)
   7. [shell-integration: the dry run and the MUST rows](#7-shell-integration-the-dry-run-and-the-must-rows)
   8. [installer-script: the worked example and the MUST rows](#8-installer-script-the-worked-example-and-the-must-rows)
   9. [Size budgets, references layout and the receipts](#9-size-budgets-references-layout-and-the-receipts)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Route a failing script on three facts, never one: the exit code, the first stderr line, and the identity of the interpreter that produced it. The same CR-in-shebang file gives rc 126 or 127 and four different messages depending on the shell that tried to launch it (section 3, A1).
- A CR byte is the cheapest diagnosis to rule out. `git ls-files --eol -- . | awk ...` prints the offending file and is empty on the twin (watched red/green, V1).
- `set: Illegal option -o pipefail` is a property of the dash package, not of dash: Debian 12 `0.5.12-2`, Ubuntu 22.04 `0.5.11+git...-3build1` and Ubuntu 24.04 `0.5.12-6ubuntu5` abort with rc 2; Debian 13 `0.5.12-12` and Ubuntu 26.04 `0.5.12-12ubuntu3` accept it. posh 0.14.1 rejects it with a different text and rc 1 (`F/out/r02.txt`, `F/out/r02-posix.txt`).
- `set -o pipefail || true` does not rescue the abort on dash 0.5.12-2 (rc 2) or posh (rc 1); only the subshell probe of SH-DIAL-07 does (`F/out/r02c.txt`, check W2 red/green).
- A signal death is 128+n on dash, ash, mksh, bash, zsh and posh; 256+n on ksh93u+m (269, 271); 384+n on yash (397, 399). A literal `[ "$rc" -eq 141 ]` misses on 3 of 11 shells; `-gt 128` hits on all 11 (`F/out/r13.txt`).
- `${args[@]}` on an empty array under `set -u` fails with `args[@]: unbound variable` on bash 3.2, 4.0 and 4.2 (not only 3.2), and passes from 4.4. `${args[@]+"${args[@]}"}` passes on all eight (`F/out/r04-bash.txt`).
- On bash 3.2 the bash-4 constructs fail in four different ways: fatal (`bad substitution`, `syntax error`), non-fatal and rc 0 (`declare: -A: invalid option`, which leaves an indexed array), command-not-found that the script continues past (`mapfile`), and silent drift (`EPOCHREALTIME` unset, so `timer=0`). ShellCheck 0.11.0 sees none of them: exit 0 before and after the port (`F/out/r15.txt`, `F/out/port-p2-before.txt`).
- The port procedure is ordered: baseline matrix run, denylist, fix by class, rerun the matrix, rerun the denylist, compare output byte for byte with the newest bash's pre-port output. The ported fleet-shaped script is identical on bash 3.2 to 5.3 and identical to the unported script's bash 5.3 output (`F/out/port-p4-after.txt`).
- The denylist's pipeline ends in `xargs -0 -r grep`, so its exit status is 123 when nothing matches. Judge it by output (X17); a gate that tests `$?` reads clean as failure.
- In a `container:` job a step with no `shell:` key runs `sh -e`: on debian:12 and ubuntu:24.04 `[[` prints `[[: not found`, evaluates false, and the step exits 0; on alpine:3.22 busybox ash accepts `[[` and the same step prints `bash-test-ok` (`F/out/r09.txt`, ScriptHandler.cs).
- Windows PowerShell 5.1 prints `The token '&&' is not a valid statement separator in this version.` (FullyQualifiedErrorId `InvalidEndOfLine`); `||` is `UnexpectedToken`; `??` and `?:` are `Unexpected token '??' in expression or statement.` A 5.1 AST parse of a snippet is the cheapest red (`F/out/r07-parse.txt`).
- 5.1 mojibake is silent: a BOM-less UTF-8 `café` has length 5 and code points `00C3 00A9` on 5.1, length 4 on pwsh 7.4 and 7.6.6 (`F/out/r08.txt`). The check is a byte check on the file, not a run.
- Under Git Bash, `cmd /c echo hi` hangs: the `/c` is path-converted, cmd starts interactive and waits on stdin (rc 124 after 5 s). `cmd //c`, `MSYS_NO_PATHCONV=1` and `MSYS2_ARG_CONV_EXCL='*'` all print `hi`. Closing stdin turns the hang into a silent banner-only pass (`F/out/r10.txt`, `F/out/r10b.txt`).
- go-task's embedded mvdan/sh panics (`interface conversion: syntax.ArithmExpr is *syntax.BinaryArithm, not *syntax.Word`, task rc 2) on an unquoted hyphenated literal key read from an associative array, on task 3.45.4, 3.53.1 and 3.54.0; quoting the key or using a variable key works (`F/out/r11.txt`, `F/out/r11c.txt`).
- The PS-ERR-05 detection formula `$null -eq $MyInvocation.MyCommand.Path` throws under `Set-StrictMode -Version Latest` when delivered by `iex` on 5.1, 7.4 and 7.6.6; `[string]::IsNullOrEmpty($PSCommandPath)` does not (`F/out/r14.txt`). The wave-2 rule text needs this amendment.
- Three house SKILL.md files already exceed 500 lines (`nix-flake-release` 507, `swift-upgrade` 506, `swift-release` 505), so "under 500" is not enforced by anything today; the shell skills budget 330-460 lines and ship a line-count check watched red at 501 and green at 499 (V16).
- shell-integration has exactly 17 MUST rows in SH-EMIT; installer-script's MUST table has 16 rows, 5 of which lead with a wave-3 M-ID; both are finding-form tables (sections 7 and 8).

## Findings

### 1. The house skill shape and what carries over

Read: `skills/swift-diagnose/SKILL.md` and `skills/go-upgrade/SKILL.md` in the worktree
(`/home/mherwig/dev/grimoire-lore/.agents/worktrees/shell/skills/`, 442 and 396 lines, read 2026-10-11). The shape both share, and what the shell
skills keep or change:

| Element in swift-diagnose / go-upgrade | Kept for the shell skills | Change |
|---|---|---|
| Frontmatter `name`, long `description` naming the user's words, "Not for ..." clause, `license`, `metadata.summary/keywords` | yes | Descriptions quote the symptoms verbatim (`Illegal option -o pipefail`, `bad interpreter`, `141`, `no matches found`) so a failing-output paste triggers the skill |
| "Consent first" table | shell-diagnose only, trimmed | Cost is smaller: the only shared-state actions are `kill` on a named process and `docker run` of a throwaway image. Keep a 3-row table |
| "Stop condition" (cause as a mechanism, pasted measurement, fix watched to clear, nothing else changed) | yes, verbatim shape | |
| "Never edit the check" table (weakening forms) | yes | Shell forms: `\|\| true` after pipefail, `set +e`, `2>/dev/null` on the probe, `# shellcheck disable` with no reason (SH-GATE-05), flipping `#!/bin/sh` to bash without changing Kind (SH-DIAL-03), `shell: bash` added to hide a dialect error |
| Route table keyed by exit code and first line | yes | Add an interpreter column; text varies by version, so one row per variant (the brief's "Chase") |
| Receipt of six blocks | yes | shell-port gets its own receipt (section 5.5) |
| `MUST rows this procedure surfaces` table, finding-form `# / Finding / Rule`, never rule-ID-first | yes | |
| `What agents get wrong`, ranked | yes | Section "AI-agent angle" supplies the ranking |
| `references/` read on demand, one level deep | yes | shell-diagnose carries its verbatim error texts there (section 9) |

The skills carry procedures only. Every standard is a rule ID. A MUST that two skills surface goes in the
`# / Finding / Rule` table of each, never as rule-ID-first prose (brief).

### 2. Step 0 for shell-diagnose: identify the interpreter before reading the error

The same bytes fail differently by interpreter, and the dash version string does not identify features (map
correction: Debian `0.5.12-12` accepts pipefail, `-2` and `-6ubuntu5` reject it). Step 0 therefore collects the
identity first, in one block that runs on any POSIX shell:

```sh
# Step 0: interpreter identity. Run with the interpreter that failed, not the one you are typing in.
printf 'shell=%s\n' "${BASH_VERSION:+bash $BASH_VERSION}${ZSH_VERSION:+zsh $ZSH_VERSION}${KSH_VERSION:+ksh $KSH_VERSION}"
ls -l /bin/sh
command -v dpkg-query >/dev/null 2>&1 && dpkg-query -W -f='dash pkg ${Version}\n' dash
uname -sm
```

The `dpkg-query` line is the measured one: it printed `0.5.12-2`, `0.5.11+git20210903+057cd650a4ed-3build1`,
`0.5.12-6ubuntu5`, `0.5.12-12` and `0.5.12-12ubuntu3` on debian:12, ubuntu:22.04, ubuntu:24.04, debian:13 and
ubuntu:26.04 (`F/out/r02.txt`). `ls -l /bin/sh` on macOS is bash 3.2 in POSIX mode, selectable to dash (SH-DIAL-22;
unverified: read only, no macOS host). Never route on `--version` banner text (SH-USER-05); the identity is for the
human or the receipt, the branch is taken on a behaviour probe.

### 3. The shell-diagnose catalog: error text pinned per interpreter

Every text below was captured on 2026-10-11 by a reproducer in `F/` through `matrix.sh` (shells: dash 0.5.12 deb12,
busybox ash 1.35 deb12 and 1.37 alpine 3.22, mksh R59c, ksh93u+m 2023 deb12 and 1.0.10 deb13, yash 2.52, posh 0.14.1,
bash 3.2 and 5.2 `--posix`, zsh 5.9 `--emulate sh`; bash 3.2 to 5.3; zsh 5.0.8 to 5.9; nu 0.105.1 and 0.116.0; pwsh 7.4 LTS, 7.6.6 and
Windows PowerShell 5.1.26100 on the host; Git Bash 5.2.15 on the host). The route table is ordered by how often an
agent-written or fleet script produces the symptom: the fleet audit puts CR/dialect/pipefail first (0 pipefail in sh
scripts, 93 of 186 authored scripts at mode 100644, 5 bash-4+ files; `shell-audit/fleet-shell-shape.md` rows 10, 141, 180),
then expansion, then PowerShell, nushell, CI and Windows.

The one-line form of each row (symptom, cause, check, fix, rule) is the SKILL.md table. The verbatim multi-interpreter
texts go to `references/symptom-text.md`.

#### 3.1 The route table (SKILL.md body)

Exit status | first stderr line contains | Interpreter and version | Cause | Check (output is the violation) | Fix | Rule

| # | Exit | First line contains (verbatim) | Where | Cause | Check | Fix | Rule |
|---|---|---|---|---|---|---|---|
| A1 | 127 | `crA.sh: not found` (dash 0.5.12, ksh93u+m 2023 and 1.0.10, busybox ash) | the shell that launches the file | CR after `#!/bin/sh`; the kernel looks for the interpreter `/bin/sh\r` | `git ls-files --eol -- . \| awk '$1=="i/crlf" \|\| $2=="w/crlf"'` | strip CR (`tr -d '\r'`), add `* text=auto eol=lf` | SH-GATE-14, SH-GATE-15 |
| A1 | 126 | `/bin/sh^M: bad interpreter: No such file or directory` | bash 3.2, 4.0, 4.2, 4.4, 5.0, 5.1 and **5.3** as launcher | same | same | same | same |
| A1 | 127 | `cannot execute: required file not found` | bash **5.2** as launcher | same; 5.3 fixed the message ("specific message about a bad interpreter before the generic error", bash CHANGES, 5.3-alpha section) | same | same | same |
| A1 | 127 | `bad interpreter: /bin/sh^M: no such file or directory` | zsh 5.0.8, 5.3.1, 5.8, 5.9 | same | same | same | same |
| A1 | 126 | `No such file or directory` (mksh); `cannot execute command 'crA.sh': No such file or directory` rc **127** (yash); `No such file or directory` rc **1** (posh) | mksh R59c, yash 2.52, posh 0.14.1 | same | same | same | same |
| A2 | 2 | `set: Illegal option -` (when the image's `/bin/sh` is dash: debian:12, debian:13); `set: line 2: illegal option -` (when it is busybox ash 1.37 on alpine:3.22, or bash in the `bash:X` images) | `set -eu` followed by CR in the body | the option string is `-eu\r` | same | same | same |
| A3 | 2 | `Syntax error: word unexpected (expecting "do")` (dash); `syntax error: unexpected word (expecting "do")` with a `line 2:` prefix (busybox ash 1.37, bash) | CR after `do` | `do\r` is a word, not the keyword | same | same | same |
| B1 | 2 | `set: Illegal option -o pipefail` | dash `0.5.12-2` (Debian 12), `0.5.11+git20210903+057cd650a4ed-3build1` (Ubuntu 22.04), `0.5.12-6ubuntu5` (Ubuntu 24.04) | `/bin/sh` is dash, pipefail absent; a special-builtin error aborts the shell | `shellcheck -s sh FILES` (SC3040) | the SH-DIAL-07 probe `(set -o pipefail) 2>/dev/null && set -o pipefail`; or `#!/usr/bin/env bash` with Kind changed | SH-DIAL-07, SH-DIAL-08, SH-ERR-13 |
| B1 | 1 | `set: pipefail: bad option` | posh 0.14.1 | same, different text and status | same | same | same |
| B1 | 0 | (accepted, no message) | dash `0.5.12-12` (Debian 13), `0.5.12-12ubuntu3` (Ubuntu 26.04); busybox ash 1.35 and 1.37; mksh R59c; ksh93u+m; yash 2.52; bash --posix; zsh sh-mode | pipefail is supported; dash got it in Debian `0.5.12-7` (2024-05-17, bug #1071238) | n/a | n/a | POSIX.1-2024 requires it |
| B1c | 2 / 1 | `set: Illegal option -o pipefail` / `set: pipefail: bad option` after `set -o pipefail \|\| true` | dash 0.5.12-2 / posh | `\|\| true` cannot catch a special-builtin error | `grep -n -e 'pipefail.*[\|][\|]'` over `*.sh` | the probe, not `\|\| true` | SH-DIAL-07 |
| B2 | 0 | `[[: not found` then the step continues | dash 0.5.12-2, 0.5.12-6ubuntu5 in a `container:` job (`sh -e {0}`) | `[[` is a bash keyword; the `if` condition is false | `shellcheck -s sh` (SC3010) | `shell: bash` on the step (image must have bash) or POSIX `[ ]` | SH-CI-04, SH-EXP-08 |
| B2 | 0 | (no message; the `[[` branch runs) | busybox ash 1.37 (alpine:3.22) | ash accepts `[[` | same | same | same |
| B3 | 2 | `declare: -A: invalid option` then `declare: usage: declare [-afFirtx] [-p] [name[=value] ...]`, **rc 0 for the command** | bash 3.2 | `declare -A` does not exist; `m[a]=1` then writes an indexed array: silently wrong | denylist (section 5.2) | parallel indexed arrays or a `case` | SH-DIAL-06 |
| B3 | 0 | `mapfile: command not found`; the script goes on | bash 3.2 | no `mapfile` before 4.0 | denylist | `while IFS= read -r l; do a+=("$l"); done` | SH-DIAL-06 |
| B3 | 1 | `${x,,}: bad substitution` / `${x^^}: bad substitution` | bash 3.2 | case modification is 4.0 | denylist | `tr '[:upper:]' '[:lower:]'` | SH-DIAL-06 |
| B3 | 2 | `syntax error near unexpected token '>'` (`&>>`); `syntax error near unexpected token '&'` (`;;&`); `conditional binary operator expected` (`[[ -v x ]]`) | bash 3.2 | parse errors | denylist; `bash -n` on 3.2 | `>> f 2>&1`; separate `case` arms; `[ -n "${x+set}" ]` | SH-DIAL-06 |
| B3 | 0 | `wait: -n: invalid option`, `printf: '(': invalid format character`, `read: 0.1: invalid timeout specification`, `x: bad array subscript` (`${x[-1]}`) | bash 3.2 (`wait -n` also 4.0, 4.2) | constructs from 4.0/4.2/4.3 | denylist | per construct, section 5.3 | SH-DIAL-06 |
| B3 | 0 | `timer=0` (no message) | bash 4.4 and older; `EPOCHREALTIME` unset until 5.0 | silent drift, output changes with no error | denylist (`EPOCHREALTIME`) | `date +%s` | SH-DIAL-06, SH-DIAL-27 |
| C1 | 141 / 269 / 397 | none (a closed reader) | 141: dash, ash, mksh, bash, zsh, posh; 269: ksh93u+m (as `wait` status); 397: yash | SIGPIPE; the producer was killed because the reader exited | decode `kill -l "$rc"`, not a literal | accept `-gt 128`; avoid `producer \| grep -q` under pipefail | SH-ERR-09, SH-ERR-19 |
| C2 | 143 / 271 / 399 | none (`Terminated`) | 143: most shells; 271: ksh93u+m; 399: yash | SIGTERM | same | handler `trap 'exit 143' TERM` | SH-ERR-16, SH-ERR-19 |
| D1 | 1 | `args[@]: unbound variable` (3.2, 4.0: `line 5: args[@]: unbound variable`) | bash 3.2, 4.0, 4.2 under `set -u` | an empty array expansion is "unbound" before 4.4 | planted run on `bash:3.2` | `${args[@]+"${args[@]}"}` | SH-ERR-12 (X22), SH-EXP-20 |
| D2 | 1 | `file:LINE: no matches found: PATTERN` | zsh 5.0.8, 5.3.1, 5.8, 5.9 (`NOMATCH` on) | an unmatched glob argument is an error, bash passes it literally | quote the glob, or `(N)`; `grep -n -e '--include=[*]'` over catalog `.md` | `--include='*.sh'`; `setopt nonomatch` only in a zsh-targeted file | SH-EXP-21, M-X-02, M-I-01 |
| E1 | 1 | `The token '&&' is not a valid statement separator in this version.` (`InvalidEndOfLine`) | Windows PowerShell 5.1.26100 | pipeline chain operators are 7+ | the 5.1 AST parse of PS-GATE-04 | `if ($?) { ... }` or `; if ($LASTEXITCODE -eq 0)` | PS-COMPAT-02, PS-GATE-04 |
| E1 | 1 | `The token '\|\|' is not a valid statement separator in this version.` (`UnexpectedToken`) | 5.1 | same | same | same | same |
| E1 | 1 | `Unexpected token '??' in expression or statement.` / `Unexpected token '?' in expression or statement.` | 5.1 | `??` and ternary are 7+ | same | `if ($null -eq $a) { ... }` | PS-COMPAT-02 |
| E2 | 0 | none; `len=5`, code points `00C3 00A9` for `é` | 5.1 reading a BOM-less UTF-8 `.ps1`; 7.4 and 7.6.6 give `len=4`, `00E9` | 5.1 decodes the file as ANSI | `LC_ALL=C grep -n -e '[^[:print:][:space:]]'` over `*.ps1` | ASCII only with `[char]0xE9`, or a BOM | PS-ENC-01, PS-ENC-02 |
| E3 | child 3 | `installer: failing` then the caller session ends (no `caller: still alive`) | 5.1, 7.4, 7.6.6 | `exit` under `irm \| iex` ends the host | `grep -n -e '^[[:space:]]*exit[[:space:]]'` over `*.ps1`, then read for iex delivery | guarded `return` for iex, `exit` for `-File` | PS-ERR-05 |
| F1 | 1 | `Error: nu::parser::shell_andand` / `nu::parser::shell_oror` | nu 0.105.1 and 0.116.0 | `&&` and `\|\|` do not exist in nu | `nu-check --debug FILE` | `;` or `and`; `try` or `or` | M-K-07 (SH-NU, wave 3) |
| F2 | 1 | `nu::shell::removed_command` `Removed command: date format` | nu 0.105.1 and 0.116.0 | removed, replacement is `format date` | `nu-check --debug` | use the replacement named in the help text | M-K-01 |
| F3 | 1 | `nu::parser::assignment_requires_variable` for `let-env FOO = bar` | nu 0.105.1 and 0.116.0 | `let-env` removed; the error text does not say so (bare `let-env` says `Removed command: let-env`) | same | `$env.FOO = "bar"` | M-K-01 |
| F4 | 1 | `nu::parser::extra_positional` for `str collect ""` and `random integer`; `nu::parser::unknown_flag` for `each -n`; `nu::shell::cant_convert` for `str substring 0 2`; `nu::parser::expected_keyword` `Capture of mutable variable` | nu 0.105.1 and 0.116.0 | renamed or changed arguments (`str join`, `random int`, `enumerate`, `0..2`, `reduce`) | same | per list | M-K-01 |
| F5 | 1 | `nu::parser::parse_mismatch_with_did_you_mean` `Parse mismatch during operation.` (0.105.1) / `Parse mismatch: expected valid variable name.` (0.116.0) for `$(date)` | nu | bash command substitution syntax | same | `(date now)` | M-K-01 |
| F6 | 0 | 0.116.0 only: `Warning: nu::parser::deprecated ... str upcase was deprecated in 0.114.0 and will be removed in a future release.`; 0.105.1 silent | nu | deprecation | grep stderr for `deprecated` | `str uppercase` | M-K-01 |
| F7 | 1 | `nu::shell::external_command` `External command failed` for `1 \| into-int` | nu | a removed or misspelled name falls through to an external binary | same | the hyphenated name is old (`into int`) | M-K-03 |
| G1 | 124 | `Microsoft Windows [Version 10...]` then `(c) Microsoft Corporation. All rights reserved.` and no output | Git Bash 5.2.15 (Windows host) | `cmd /c` loses `/c` to path conversion; cmd starts interactive and waits for stdin | `grep -n -e 'cmd /[cCkK] '` over `*.sh`, minus `MSYS_NO_PATHCONV=1` lines (awk filter) | `cmd //c ...`, or `MSYS_NO_PATHCONV=1`, or `MSYS2_ARG_CONV_EXCL='*'` | SH-CI-14, SH-USER-15 |
| G1 | 0 | same banner and **no `hi`** when stdin is `/dev/null` | Git Bash | silent pass | same | same | same |
| G2 | 2 | `panic: interface conversion: syntax.ArithmExpr is *syntax.BinaryArithm, not *syntax.Word` with `mvdan.cc/sh/v3/expand.(*Config).varInd` | go-task 3.45.4 (sh v3.12.0), 3.53.1, 3.54.0 (sh v3.14.1) | unquoted hyphenated literal key in `${m[x86_64-linux]}` | `task -t FILE name` on a plant | quote the key, use a variable key, or `case` | SH-CI-18 |
| G3 | 3 | `wget: unrecognized option: secure-protocol=TLSv1_2` then the BusyBox usage text | busybox wget 1.37.0 (alpine:3.22), `www-setup/src/install.sh:352-354` | GNU wget flags with no capability probe | run the installer in `alpine:3.22` with only busybox wget | probe the flag first (rustup `check_help_for`) | M-N-03 (SH-INST) |

(The `\|` inside the Check column is a markdown escape for the table; the real command is shown unescaped in section 4's verification runs and in the Normative candidates.)

Counts: 39 rows, 7 symptom groups (A to G). The 11 symptoms the brief names are all present: A1 (CR in shebang), B1 (pipefail,
dash 0.5.12-6ubuntu5 against -12ubuntu3), C1/C2 (141/269/397 and 143/271/399), D1 (unbound variable), D2 (zsh), F1-F7 (nu),
E1 (5.1 `&&`), E2 (mojibake), B2 (`[[: not found`), G1 (MSYS hang), G2 (mvdan/sh panic).

#### 3.2 Mechanism notes the SKILL.md must carry (each one measured)

- **Who prints the message is the launching shell, not the script's interpreter.** For A1 the caller is the shell that
  `exec`s the file: `F/out/r01-posix.txt` shows dash/ksh93/busybox `not found` rc 127, bash 3.2 `bad interpreter` rc 126,
  zsh `bad interpreter` rc 127, mksh rc 126, posh rc 1. [execve(2)](https://manpages.debian.org/bookworm/manpages-dev/execve.2.en.html)
  lists `ENOENT` as "The file pathname or a script or ELF interpreter does not exist", which is why a file that exists
  still reports not found. POSIX XCU 2.8.2 says 126 for "found but not an executable utility" and 127 for not found, and
  that a signal death is "greater than 128" ([POSIX.1-2024 XCU 2](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)).
- **Variants A2 and A3 depend on `/bin/sh` inside the image**, not on the launcher: in the `bash:X` images `/bin/sh`
  is bash, so the text is bash's lowercase `illegal option -`; in Debian images it is dash's `Illegal option -`.
- **dash's pipefail abort is a special-builtin error.** `set` is a special builtin; its option error ends a
  non-interactive shell in dash and posh, which is why `|| true` cannot rescue it (`F/out/r02c.txt`).
- **B2's step stays green.** In `F/out/r09.txt` the debian:12 and ubuntu:24.04 runs print `[[: not found` and
  `REACHED-after-pipeline`, and the emulated step exits 0, because the `[[` sits in an `if` condition and the pipeline
  `false | cat` has no pipefail. The runner's default (`shellCommand = "sh"` with no host `bash` check inside a container)
  is in [ScriptHandler.cs](https://github.com/actions/runner/blob/main/src/Runner.Worker/Handlers/ScriptHandler.cs) lines 91-101
  at read time; the default `sh -e {0}` is in the [workflow syntax table](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).
  Real-runner confirmation is a measurement the corpus cannot supply (map conflict list, item 1); the emulation is
  `docker run ... sh -e FILE`.
- **B3's four failure modes** (fatal / non-fatal rc 0 / command-not-found continue / silent drift) are why the port
  needs a denylist plus a run, not a run alone: a run that exits 0 proved nothing (`declare -A` on 3.2 exits 0 and leaves an indexed array).
- **D1 is not "bash 3.2 only".** `F/out/r04-bash.txt`: 3.2 and 4.0 print `r04-emptyarr.sh: line 5: args[@]: unbound variable`
  and exit 1, 4.2 too (message after `count=0`), 4.4 to 5.3 print `[]` and exit 0. The fix is in the 4.4 CHANGES file:
  "Using ${a[@]} or ${a[*]} with an array without any assigned elements when the nounset option is enabled no longer
  throws an unbound variable error" (quoted by Chet Ramey,
  [bug-bash 2019-05](https://lists.libreplanet.org/archive/html/bug-bash/2019-05/msg00024.html), changed July 2016).
  A declared-but-never-assigned array (`declare -a x`, no `=()`) is reported as still unbound on later versions in the bug-bash threads a search turned up; not re-measured here: unverified.
- **D2 and the catalog itself.** `F/out/v-zsh.txt`: `grep -rn --include=*.nomatch -e foo .` aborts with
  `no matches found: --include=*.nomatch` on zsh 5.0.8, 5.3.1, 5.8 and 5.9; the quoted twin runs. zsh's
  [NOMATCH](https://zsh.sourceforge.io/Doc/Release/Options.html) text: "If a pattern for filename generation has no matches, print an error, instead of leaving it unchanged in the argument list." This is map row M-X-02: the catalog's own command blocks hit it.
- **E1/E2 are parse-time on 5.1.** The whole file fails to parse, so nothing runs (the `start` line of `r07-andand.ps1` never prints on 5.1); pwsh 7.4 and 7.6.6 run it (`F/out/r07.txt`). [about_Pipeline_Chain_Operators](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_pipeline_chain_operators?view=powershell-7.6): "Beginning in PowerShell 7, PowerShell implements the && and || operators". The differences page is [Differences between Windows PowerShell 5.1 and PowerShell 7.x](https://learn.microsoft.com/en-us/powershell/scripting/whats-new/differences-from-windows-powershell?view=powershell-7.6).
- **E2 is silent.** The BOM variant gives `len=4` on all three engines (`F/out/r08.txt`); the ASCII twin built with `[char]0xE9` too. [about_Character_Encoding](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_character_encoding?view=powershell-7.6) is the Microsoft statement of the 5.1 default.
- **E3's formula.** The wave-2 PS-ERR-05 text computes `$IsIex = ($null -eq $MyInvocation.MyCommand.Path)`. Under
  `Set-StrictMode -Version Latest` (www-setup sets it at `install.ps1:63`) that line throws `The property 'Path' cannot be
  found on this object` on 5.1, 7.4 and 7.6.6 when delivered by `iex`, leaving `$IsIex` unset (`F/out/r14.txt`).
  `[string]::IsNullOrEmpty($PSCommandPath)` printed `IsIex=True` on all three. The sibling dive reports the same
  (`shell-installer/ps1-front-door.md`, PS-SEC-08 candidate); this run reproduced it independently.
- **F-rows.** nu 0.105.1 and 0.116.0 gave identical texts for F1-F5 and F7; only F5's wording and F6's warning differ
  (`F/out/r06-nu105.txt`, `F/out/r06-nu116.txt`). The deprecation is in the
  [0.114.0 release notes](https://www.nushell.sh/blog/2026-07-04-nushell_v0_114_0.html) ("Deprecated `str upcase`, using it shows a warning recommending `str uppercase`").
  Text that varies by version gets one row per variant; the `$(date)` row is the example.
  Bash habits that nu rejects are in [Coming from Bash](https://www.nushell.sh/book/coming_from_bash.html).
- **G1.** The path-conversion rule is in [MSYS2 filesystem paths](https://www.msys2.org/docs/filesystem-paths/)
  (`MSYS2_ARG_CONV_EXCL` excludes arguments, `*` excludes everything); `MSYS_NO_PATHCONV` arrived in Git for Windows 2.5.0
  ([release notes](https://github.com/git-for-windows/build-extra/blob/main/ReleaseNotes.md): "The POSIX-to-Windows path mangling can now be turned off by setting the `MSYS_NO_PATHCONV` environment variable. This even works for individual command lines: `MSYS_NO_PATHCONV=1 cmd /c dir /x`").
  Measured on Git Bash 5.2.15 (`F/out/r10.txt`, `F/out/r10b.txt`): `cmd /c` rc 124; `cmd //c` `hi`; `MSYS_NO_PATHCONV=1 cmd /c` `hi`;
  `MSYS_NO_PATHCONV=1 cmd //c` **hangs** (with conversion off the doubled slash is not collapsed); `MSYS2_ARG_CONV_EXCL='*'` and `='/c'` `hi`.
  The GHA runner's Git Bash is 5.3.15, not measured (SH-CI-14, unverified there).
- **G2.** Plant/twin in `F/tf/Taskfile.assoc.yml`: the unquoted-assign-and-unquoted-read plant panics; the quoted key, a variable key and a compound assignment with quoted key print `ok=v`; a `case` twin prints `ok=v`. The related upstream items are
  [mvdan/sh#1108](https://github.com/mvdan/sh/issues/1108) and [go-task/task#1908](https://github.com/go-task/task/issues/1908) (an associative-array regression, different symptom: prints `0`). No upstream issue for this panic turned up in a search of mvdan/sh "associative array" on 2026-10-11 (10 results listed, none matching).
- **G3.** Reproduced with `F/inst-run.sh`: `install.sh rc=3` on `alpine:3.22` with the BusyBox wget; the twin (`wget` without the two GNU flags) fails later, at DNS (`bad address 'setup.ocx.sh'`), proving the flags were the cause (`F/out/inst-alpine.txt`).

#### 3.3 What a catalog row must contain (the schema the SKILL.md table is checked against)

A row passes only if all of these hold: the symptom text is copied from a captured run; the interpreter and version are named (image tag or package version, never "old dash"); the check prints the violation and is empty on the twin; the fix names a rule ID; and a variant that has different text has its own row. A reviewer verifies by comparing the row count of a symptom with the number of distinct captured texts in `references/`, a reading heuristic, not run.

#### 3.4 The MUST-row table of shell-diagnose

Finding form, restated so a diagnosis run without the rules loaded still reports the right ID.

| # | Finding | Rule |
|---|---|---|
| 1 | A failure was routed on its exit code alone, or without the interpreter identity | SH-CORE (candidates 1, 24 below) |
| 2 | A fix stopped the symptom by changing the measurement (`\|\| true` after pipefail, `set +e`, `2>/dev/null` on a probe, a `disable=` with no reason, a changed shebang) | SH-GATE-05, SH-DIAL-07, SH-DIAL-03 |
| 3 | A shell file contains a CR byte or a BOM | SH-GATE-14, SH-GATE-15 |
| 4 | `#!/bin/sh` code enables pipefail other than by the one-line probe | SH-DIAL-07 (X2: SH-ERR-13 and SH-CI-03 are pointers) |
| 5 | A possibly-empty array is expanded unguarded under `set -u` on a floor below 4.4 | SH-ERR-12 (X22) |
| 6 | A signal death is tested by a literal status | SH-ERR-19 |
| 7 | A container-job step uses bash syntax with no `shell: bash` | SH-CI-04 |
| 8 | A Windows tool is called from Git Bash as `cmd /c` | SH-CI-14 (X15: SH-USER-15 owns the facts) |
| 9 | A Taskfile `cmds` body reads a hyphenated associative key unquoted | SH-CI-18 |
| 10 | A 5.1-bound `.ps1` has 7-only syntax or a non-ASCII byte | PS-COMPAT-02, PS-GATE-04, PS-ENC-01 |
| 11 | `exit` runs in a script delivered by `irm \| iex` | PS-ERR-05 (with the formula amendment) |
| 12 | A nushell removal or rename is repaired by guess instead of by the error id | M-K-01, M-K-03 (SH-NU, wave 3) |
| 13 | A zsh `no matches found` is repaired by a global `setopt nonomatch` | SH-EXP-21, M-I-01 (SH-ZSH, wave 3) |

### 4. Signal statuses: 141/269/397 and 143/271/399

Probe: `F/r03b-wait.sh` (child killed with `kill -PIPE` or `kill -TERM`, status read through `wait`), `F/r03-sigstatus.sh` (a real `yes | head -n1` under pipefail), `F/r13-sig-literal.sh`.

| Shell (version) | SIGPIPE child via `wait` | SIGPIPE through a pipefail pipeline | SIGTERM via `wait` | `kill -l N` decodes |
|---|---|---|---|---|
| dash 0.5.12 deb12 | 141 | pipefail unsupported: status 0 | 143 | yes |
| busybox ash 1.35 and 1.37 | 141 | 141 | 143 | yes |
| mksh R59c | 141 | 141 | 143 (single job); **0** for the second job of a two-signal loop in `r03b` (unexplained, unverified) | yes |
| ksh93u+m 2023 (deb12) | **269** | **13** | **271** | yes (`TERM`, `PIPE`) |
| ksh93u+m 1.0.10 (deb13) | **269** | **1**, and `yes: standard output: Connection reset by peer` | **271** | yes |
| yash 2.52 | **397** | **397** | **399** | yes |
| posh 0.14.1 | 141 | 0 (pipefail rejected) | 143 | **no**: `kill: unknown signal name 143` |
| bash 3.2, 4.0, 4.2, 4.4, 5.0 to 5.3 | 141 | 141 | 143 (3.2 to 4.4 also print `Terminated` job line) | yes |
| zsh 5.0.8, 5.3.1, 5.8, 5.9 | 141 | 141 | 143 | yes |

(`F/out/r03-posix.txt`, `r03b-posix.txt`, `r03-bash.txt`, `r03b-bash.txt`, `r03-zsh.txt`, `r03b-zsh.txt`, `r03-dash-new.txt`.)

- The arithmetic matches each shell's documentation: ksh93's [sh.1](https://raw.githubusercontent.com/ksh93/ksh/dev/src/cmd/ksh93/sh.1) says "256+signum" for a signal death, and yash's [exec chapter](https://magicant.github.io/yash/doc/exec.html) says "the exit status is the signal number plus 384". POSIX allows "an exit status greater than 255" for this ([XCU 2.8.2](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)). So 13+256=269, 15+256=271, 13+384=397, 15+384=399.
- ksh93u+m 1.0.10's `1` with `Connection reset by peer`: the `yes` writer received ECONNRESET, not SIGPIPE, which fits ksh93's use of socket pairs for pipes; the mechanism was not verified here.
- Dash on Debian 13 and Ubuntu 26.04 (pipefail supported) gives 141 and 143 (`F/out/r03-dash-new.txt`), so the dash column is version-split exactly like B1.
- **The portable test is `[ "$rc" -gt 128 ]` then `kill -l "$rc"`.** `F/out/r13.txt`: the literal `-eq 141` hits on 8 shells and MISSES on both ksh93u+m builds (269) and yash (397); `-gt 128` hits on all 11. SH-ERR-19 owns the rule; the skill's row C1 cites it and adds the three numbers.
- Which rule exits with which status stays with SH-ERR-16 and SH-ERR-18 (never `exit` 123, 124, 125, 128, 200 to 255); the fleet CLI contract `rules/rust-quality/cli-contract.md` is what shell scripts mirror.

### 5. The shell-port runbook, run end to end

The fixture is a fleet-shaped bash script, `F/port/before/announce.sh`, modelled on
`ocx@c001637dd3ce:test/manual/announce-e2e/scripts/run_sequence.sh:219-298` (`local -A`, `mapfile`, `${tag,,}`) and
`clean_install_check.sh:44` (`mapfile -t ... < <(...)`), plus `EPOCHREALTIME` as in `test/manual/measure-index-clone.sh:80`
and an empty-array expansion under `set -u`. It targets the bash 3.2 floor of SH-DIAL-06 (macOS `/bin/bash`; no macOS
host, so bash 3.2.57 in Docker stands in, Q5).

#### 5.1 The draft shell-port steps

| Step | Action | Evidence it produces | Rule |
|---|---|---|---|
| P0 | Read the header (`# Kind:`, `# Floor:`). No header means the kind is a decision, written first. Choose port or pin (5.4) | the header lines | SH-DIAL-03, SH-DIAL-25 |
| P1 | **Baseline run before any edit**: `matrix.sh bash SCRIPT` over 3.2, 4.0, 4.2, 4.4, 5.0 to 5.3 (and `matrix.sh posix` for an sh script). Paste it | the red: first error per version, plus the newest bash's output as the oracle | SH-DIAL-04 |
| P2 | Static pass: the denylist (section 5.2) and `shellcheck` at default severity, both fed by git discovery | denylist lines; ShellCheck status | SH-DIAL-06, SH-GATE-01, SH-GATE-09 |
| P3 | Fix by class, one class per commit hunk, using the table in 5.3. Never add `shell: bash` or a newer-bash requirement to make a failure disappear | the diff | SH-DIAL-06, SH-ERR-12, SH-ERR-01 |
| P4 | Re-run the same matrix. Acceptance: exit 0 on every version, and the output byte-identical across versions and to the pre-port oracle | the green | SH-DIAL-06 |
| P5 | Re-run P2: denylist empty, ShellCheck 0 findings, no new `disable` | the second static pass | SH-GATE-05 |
| P6 | Fill the receipt (5.5). Read-only macOS items go on the receipt as `unverified: read only` | the receipt | SH-CORE |

#### 5.2 P1 and P2 as run

Baseline (`F/out/port-p1-baseline.txt`), command `bash ../../matrix.sh bash port/before/announce.sh`:

```text
== bash 3.2
port/before/announce.sh: line 14: local: -A: invalid option
local: usage: local name[=value] ...
-> exit 2
== bash 4.0   (and 4.2)
reserved: __OCX-internal
alpha digest-alpha
Beta digest-Beta
gamma digest-gamma
secret_args=2
port/before/announce.sh: line 32: extra[@]: unbound variable
-> exit 1
== bash 4.4
... secret_args=2
extra=[]
timer=0
-> exit 0
== bash 5.0 .. 5.3
... extra=[]
timer=T
-> exit 0
```

Three version bands fail three different ways, and bash 4.4 exits 0 with `timer=0`: a silent wrong value, the case a run-only
gate passes. The oracle is bash 5.3's output.

Static pass (`F/p2-check.sh`, denylist `F/port-denylist.sh` = the SH-DIAL-06 / F5 patterns, fed by SH-GATE-09 git discovery):

```text
--- denylist (output is the violation)         [before]
14:  local -A content_of=()
17:  mapfile -t tags <<<"$names"
18:  mapfile -t secret_args < <(secret_source)
19:  local started=${EPOCHREALTIME:-0}
22:    if [[ ${tag,,} == __ocx* ]]; then
denylist grep exit=0
--- shellcheck 0.11.0 (default severity)
shellcheck exit=0
```

ShellCheck is green on the script that dies on bash 3.2: it has no bash-version model, which is why the denylist and the
matrix are the gates and ShellCheck is only the dialect gate (SH-DIAL-02). The `grep exit=0` on the plant and `exit=123` on the clean tree
(`xargs` returns 123 when a `grep` invocation exits 1) are why the verdict is the output (X17): `denylist grep exit=123` is the pass
(`F/out/port-p2-after.txt`).

Note the `golden-baseline.sh` header `IFS=$'\n\t'` (index@9eba2cc3929b:scripts/golden-baseline.sh:3), which SH-ERR-03 forbids in a prologue; a port pass reports it, does not fix it (owner Q6).

#### 5.3 P3: the construct to 3.2 replacement table (each replacement is what the ported fixture uses)

| Construct (3.2 symptom, section 3.1 B3) | 3.2-safe form | Note |
|---|---|---|
| `local -A m=()`; `m["$k"]=v`; `${m[$k]}` | parallel indexed arrays and `for i in "${!tags[@]}"` | the fixture keys by the index of `tags`; an unset slot is `digests[i]=` |
| `mapfile -t a <<<"$s"` / `< <(cmd)` | `while IFS= read -r l; do a+=("$l"); done <<<"$s"`; capture `s=$(cmd) \|\| fail` first | the capture also gives `-e` a status to see (SH-ERR-10) |
| `${tag,,}` / `${x^^}` | `lower=$(printf '%s' "$tag" \| tr '[:upper:]' '[:lower:]')` | |
| `EPOCHREALTIME` | `started=$(date +%s)` (declare `local started` on its own line, SH-ERR-01) | seconds only; sub-second needs `date +%s.%N` which is GNU-only (SH-USER-01) |
| `printf 'extra=[%s]\n' "${extra[@]}"` under `set -u` | `${extra[@]+"${extra[@]}"}` | SH-ERR-12 |
| `&>>`, `wait -n`, `coproc`, `;;&`, `${x[-1]}`, `[[ -v x ]]`, `read -t 0.5`, `printf '%(%s)T'` | `>> f 2>&1`; wait for each pid; a pipe or temp file; separate arms; `${x[${#x[@]}-1]}`; `[ -n "${x+set}" ]`; integer timeout or none; `date +%s` | verbatim 3.2 texts in `F/out/r15.txt` |

#### 5.4 Port or pin

Port when the script can run where bash 3.2 is `/bin/bash` or the first `bash` on PATH: macOS developer machines, `macos-*` runners (SH-CI-13), anything invoked from a taskfile or workflow. Pin when it cannot: add `# bash-floor: X.Y` in lines 2 to 8 and a guard that exits 69 on `BASH_VERSINFO` below the floor (SH-DIAL-25, SH-DIAL-27). The fleet has 0 `BASH_VERSION` guards today (`shell-audit/fleet-shell-shape.md` line 371), so each of the five files below fails mid-run on 3.2, not up front. Reading heuristic, not run.

#### 5.5 The receipt, filled for the fixture

```text
Receipt (shell-port)                                          2026-10-11
1. Script        F/port/before/announce.sh -> F/port/after/announce.sh   Kind: bash   Floor: system bash 3.2.57
2. Target matrix bash 3.2 4.0 4.2 4.4 5.0 5.1 5.2 5.3 (docker bash:X). macOS /bin/bash: unverified: read only
3. Baseline      3.2 exit 2 "local: -A: invalid option" (line 14); 4.0, 4.2 exit 1 "extra[@]: unbound variable" (line 32);
                 4.4 exit 0 with timer=0; 5.0-5.3 exit 0 (oracle)                       [F/out/port-p1-baseline.txt]
4. Denylist      before: 5 hits (14,17,18,19,22); after: empty (xargs exit 123)           [F/out/port-p2-before.txt, port-p2-after.txt]
5. ShellCheck    0.11.0 default severity: exit 0 before and after; no new disable          [same files]
6. Changes       local -A -> parallel indexed array (14,15); mapfile x2 -> read loops (17,18); ${tag,,} -> tr;
                 EPOCHREALTIME -> date +%s; "${extra[@]}" -> ${extra[@]+"${extra[@]}"}; header gained "# Floor: ..."
7. Result        8 of 8 versions exit 0; 1 distinct output across the 8; output on 3.2 == pre-port output on 5.3   [F/out/port-p4-after.txt]
8. Rule IDs      SH-DIAL-06, SH-DIAL-03, SH-ERR-12, SH-ERR-01, SH-ERR-10, SH-GATE-09, SH-GATE-01, SH-GATE-05
9. Not verified  macOS /bin/bash 3.2.57 Apple build; BSD date/tr/sed; the script's real callers
```

#### 5.6 The MUST-row table of shell-port

| # | Finding | Rule |
|---|---|---|
| 1 | The port started without a baseline run on the target matrix, or the baseline was not pasted | SH-CORE (candidate 13) |
| 2 | A file that must run on bash 3.2 matches the denylist | SH-DIAL-06 |
| 3 | A raised floor has no `# bash-floor:` header and no `BASH_VERSINFO` guard | SH-DIAL-25, SH-DIAL-27 |
| 4 | An empty-able array is expanded unguarded under `set -u` | SH-ERR-12 |
| 5 | A port introduced `local x=$(cmd)` | SH-ERR-01 |
| 6 | A port introduced a GNU-only form (`date +%s.%N`, `sed -i` without a suffix, `readlink -f`) | SH-USER-01, SH-USER-02, SH-USER-03 |
| 7 | A port introduced `(( i++ ))` as a statement under `-e` | SH-ERR-14 |
| 8 | An `xargs` lacks `-r` | SH-USER-08 |
| 9 | The ported output differs between versions, or from the pre-port oracle | SH-CORE (candidate 14) |
| 10 | A new `# shellcheck disable` has no same-line reason | SH-GATE-05 |
| 11 | A macOS or BSD claim in the receipt is not labelled `unverified: read only` | SH-USER-01 (no host) |

### 6. The five authored bash 4+ files as port candidates

Source: [fleet] #10 (`shell-audit/fleet-shell-shape.md:43`: 5 of 166 authored bash files, 1 task-invoked, 0 `BASH_VERSION` guards). Re-measured 2026-10-11 with the section 5.2 denylist over the two trees (`F/out/fleet-denylist.txt`):

| # | File (repo@sha12:path:line) | Constructs the denylist finds | Invoked from | Port or pin |
|---|---|---|---|---|
| 1 | `index@9eba2cc3929b:scripts/golden-baseline.sh:250` | `local -A new_by_path=()` (reads at 255, 263, 266) | `ci.yml`'s golden-baseline job (CI-only, `taskfile.yml:6,368-372`) | **port first**: Linux CI today, but a developer is told to run it by hand (`taskfile.yml:372`); one associative array |
| 2 | `ocx@c001637dd3ce:test/manual/announce-e2e/scripts/run_sequence.sh:219,231,295,298,361` | `local -A content_of`, `mapfile` x3, `${tag,,}`; reads at 243, 267-272 | hand-run, needs `gh` and a registry | pin `# bash-floor: 4.0` unless a macOS operator runs it |
| 3 | `.../announce-e2e/scripts/run_machine_lane.sh:23,89` | `mapfile -t ... < <(evidence_secret_args)` | hand-run | pin |
| 4 | `.../announce-e2e/scripts/clean_install_check.sh:44` | `mapfile -t secret_args < <(...)` | hand-run | pin |
| 5 | `ocx@c001637dd3ce:test/manual/measure-index-clone.sh:80` | `EPOCHREALTIME` | hand-run | port (`date +%s`) or pin; silent drift on bash under 5.0 |

The port fixture is candidate 2's idiom set. Defects found while reading are reported, not fixed: (a) none of the five has a `# bash-floor:` header (SH-DIAL-25); (b) `golden-baseline.sh:3` carries `IFS=$'\n\t'` (SH-ERR-03).

### 7. shell-integration: the dry run and the MUST rows

#### 7.1 The dry run against a 3-target toy emitter

`F/toy/toyemit.py` emits `export NAME=...` for sh, `set -gx NAME ...` for fish and `$env:NAME = ...` for pwsh, in two modes: `naive` (one shared `posix_single_quoted` for every target, the SH-EMIT-01 plant) and `fixed` (a quoter per target, named for it, SH-EMIT-01/02/03; NUL refused with exit 65 and empty stdout, SH-EMIT-05; empty refused for pwsh). `F/toy/corpus.txt` is the hostile corpus (35 values plus the NUL case, so the 36 of SH-EMIT-04). `F/toy/roundtrip.sh MODE SHELL FAMILY` builds a script of one emitted line per case, runs it under every interpreter of the family through `matrix.sh`, and compares the shell's own readback byte for byte; `F/toy/run-all.sh` runs both modes on all three targets. Result (`F/toy/out/summary.txt`):

| Mode and target | Interpreter | Result |
|---|---|---|
| naive sh | dash 0.5.12, busybox ash 1.35 and 1.37, mksh R59c, ksh93u+m (both), posh 0.14.1, bash 3.2 and 5.2 `--posix`, zsh 5.9 | 35/35 each |
| naive sh | **yash 2.52** | **23/35**: fails `unicode`, `u2018`-`u201e`, `curly_inject`, `curly_dq_inject`, `curly_mixed`, `big4k` |
| naive fish | fish 3.6.0, 4.0.2, 4.7.0, 4.9.3 | **32/35**: fails `backslash`, `trailing_bs`, `dbl_bs` |
| naive pwsh | pwsh 7.4 LTS / 7.6.6 / Windows PowerShell 5.1 | **23/35, 24/35, 23/35**: fails `squote`, `inject`, `empty` (not 7.6.6), the four curly cases, `nu_hash`, `trail_sq`, `big4k` |
| fixed fish | all four | 35/35 |
| fixed pwsh | all three | 34/34 (`empty` and `nul` REJECTED, as designed) |
| fixed sh | all but yash | 35/35 |
| fixed sh | yash 2.52 in the default locale | 23/35 (same locale failures) |
| fixed sh | yash 2.52 with `LC_ALL=C.UTF-8` at process start (`F/toy/yash-utf8.sh`) | **35/35** |

So the round trip is red on the shared quoter (fish 3 cases, pwsh 12 cases in the worst engine) and green on per-target quoters, and the yash failures are a test-environment property: SH-EMIT-04's last clause (yash needs a UTF-8 locale at process start) is confirmed; without it the corpus gives a false red. In every row `nul: REJECTED` printed, which is the SH-EMIT-05 behaviour. The procedure steps this dry run exercises, in order: (1) list targets and the quoting context of each emitted value; (2) one named quoter per (target, context); (3) refuse what the target cannot carry; (4) build the corpus round trip and run it in the real interpreter of every target, oldest and newest; (5) choose rc targets per shell; (6) register hooks append-safely; (7) write and test the undo.

The ocx reproducer for step (2), the worked example: `F/curly.ps1` runs ocx's `single_quoted_doubled` against a U+2019-bearing value and a fixed quoter: `quoter=ocx pwned=True roundtrip=False` on pwsh 7.4, 7.6.6 and Windows PowerShell 5.1, `quoter=fixed pwned=False roundtrip=True` on all three (`F/out/curly.txt`). The defect is at `ocx@c001637dd3ce:crates/ocx_shell/src/shell/escape.rs:35` (`value.replace('\'', "''")`; the same class in starship `src/init/mod.rs:46-48`, mise `src/shell/pwsh.rs:408-412`, direnv `shell_pwsh.go:169`, per `shell-audit/ocx-emitter.md` lines 345-349). Reported, not fixed (Q6; disclosure is the owner's, Q7).

What ocx does right and the skill should teach as the worked example: per-context escaper names with a test that pins the byte distinguishing fish single and double quoting (`escape.rs:13,19,27,35,43,52`; `ocx-emitter.md:364`); a parity test of emitted text against the in-process computation (`PARITY_ARMS`, `shell.rs:2886-2917`); and live `$PROFILE` resolution through a subprocess (`profiles.rs:176-213`). What it gets wrong, from the audit and not re-run here: the rc writer renames a temp file over a symlinked rc and forces mode 0600 (`ocx_util/src/fs.rs:236,244-249`; SH-EMIT-19, X19), and there is no live undo for the prompt wrap (M-M-16).

#### 7.2 The MUST-row table of shell-integration

Finding form. 17 SH-EMIT MUSTs (shell-emit.md, `grep -E '^\*\*SH-EMIT'` count: 32 IDs, 17 MUST).

| # | Finding | Rule |
|---|---|---|
| 1 | One quoter serves more than one target shell or quoting context | SH-EMIT-01 |
| 2 | A target's quoter is not the SH-EMIT-02 literal form (fish `\` not doubled, nu/elvish treated as POSIX) | SH-EMIT-02 |
| 3 | PowerShell emission doubles only U+0027 and not U+2018, U+2019, U+201A, U+201B | SH-EMIT-03 |
| 4 | The 36-case hostile corpus is missing from the emitter's tests, or is not run in the real interpreter of each target | SH-EMIT-04 |
| 5 | A value the target cannot carry (NUL anywhere; empty for pwsh) is emitted in lossy form instead of refused with exit 65 | SH-EMIT-05 |
| 6 | `ConvertFrom-Json` is the PowerShell data channel | SH-EMIT-07 |
| 7 | Emitted PowerShell for 5.1 holds a non-ASCII byte or a BOM | SH-EMIT-08 |
| 8 | `$'..'` is emitted for an sh target | SH-EMIT-12 |
| 9 | `source <(cmd)` or `. <(cmd)` is emitted | SH-EMIT-13 |
| 10 | Init is written to a file that shell does not read for that session type, or rc files are created for shells other than the detected login shell | SH-EMIT-16 |
| 11 | A managed rc block is not a whole-line marker pair, or a second run changes the file | SH-EMIT-18 |
| 12 | A symlinked rc is replaced, its mode or owner changed, or a temp file is renamed onto it | SH-EMIT-19 (X19; SH-USER-12 is scoped to files the script owns) |
| 13 | The bash prompt hook ignores that bash 3.2 to 5.0 run only element 0 of an array `PROMPT_COMMAND`, or clobbers it | SH-EMIT-24 |
| 14 | A zsh hook is defined as `precmd()` or assigned into `precmd_functions` | SH-EMIT-25 |
| 15 | A fish hook is registered by redefining `fish_prompt` | SH-EMIT-26 |
| 16 | A nushell hook is not normalised to a list, or a second run adds a duplicate | SH-EMIT-27 |
| 17 | The PowerShell prompt is wrapped more than once, or without state capture and restore | SH-EMIT-29 |

Everything else in SH-EMIT (7 SHOULD / CONSIDER and the rest) stays in the rule; the skill reads `emit.md`, `fish.md`, `nushell.md`, `elvish.md`, `zsh.md` and `powershell-quality/native.md` (map, Skills table). The completions row M-M-17 is not yet a rule; the skill cites it as an open M-ID.

### 8. installer-script: the worked example and the MUST rows

#### 8.1 Worked example: `www-setup@a251c3631047:src/install.sh` and `install.ps1`

Facts re-read at HEAD `a251c3631047` (the audit's SHA; `git rev-parse` today is the same):

| Property | Where | Verdict |
|---|---|---|
| `#!/bin/sh`, `set -eu`, `main "$@"` as the last statement (truncation guard) | `install.sh:1,37,913` | satisfies (M-N-01) |
| `trap cleanup EXIT INT TERM HUP` | `install.sh:718,794` | satisfies (SH-ERR-15, SH-ERR-16) |
| `wget --secure-protocol=TLSv1_2 --https-only ...` with no probe | `install.sh:352,354` | **violates M-N-03**: `rc=3` on `alpine:3.22` (`F/out/inst-alpine.txt`) |
| `exit $Code` and `exit 2` in a script that is also fetched by `irm \| iex` | `install.ps1:182,734` | **violates PS-ERR-05** unless guarded; `StrictMode Latest` at `:63` makes the wave-2 formula throw (`F/out/r14.txt`) |
| `#Requires -Version 5.1` | `install.ps1:50` | satisfies (PS-COMPAT-01) |
| `Verify-Checksum` warns and returns on an empty digest | `install.ps1:410-413` (sibling dive) | open: fail closed (M-N-02, M-U-04) |

The exemplar fix for the busybox crash is rustup's: `check_help_for "$3" wget --https-only --secure-protocol` before the flags are used and a plain `wget "$1" -O "$2"` fallback ([rust-lang__rustup@61271d00a979:rustup-init.sh:742-748](https://github.com/rust-lang/rustup), helper at `:766`; the same probe guards curl's `--proto --tlsv1.2` at `:710`). The probe greps `--help` text, which SH-USER-05 discourages (a behaviour probe is preferred); see Contested. The installer runs end to end under dash, busybox, mksh, ksh93, yash and bash 3.2 offline (`shell-audit/installers.md` headline 3: 119 of 121 parse cells pass; the two failures are yash in the C locale on non-ASCII bytes).

`exit` under `irm | iex` reproduces on all three engines (`F/out/r12.txt`): the plant (`exit 3` via `Invoke-Expression`) never prints `caller: still alive` and the host ends with status 3; the twin (guarded `return`) prints `caller: still alive (LASTEXITCODE=3)` and the host exits 0 (on 5.1 the same lines, with a `#< CLIXML` progress preamble that is the child-host transport, not output).

#### 8.2 The MUST-row table of installer-script

Landed IDs are cited by ID. SH-INST and PS-SEC are unconsolidated (wave 3, siblings `installer/sh-contract` and `installer/ps1-front-door` in flight); those rows cite the map's M-IDs, and where the PS dive has a candidate number it is named as such.

| # | Finding | Rule |
|---|---|---|
| 1 | The installer's last statement is not the `main` call, or code outside functions runs before it | M-N-01 (SH-INST) |
| 2 | The payload is executed or extracted before its SHA-256 is compared, or an empty expected digest passes | M-N-02 (SH-INST), M-U-04 (PS-SEC) |
| 3 | A download tool's flags are used with no capability probe (busybox `wget` rejects `--secure-protocol`) | M-N-03 (SH-INST) |
| 4 | Platform detection falls through to a default target instead of an explicit error | M-N-04 (SH-INST) |
| 5 | The `#!/bin/sh` body fails `shellcheck -s sh`, or enables pipefail other than by the one-line probe | SH-DIAL-02, SH-DIAL-07 |
| 6 | A GNU-only form with no probe: `sed -i`, `readlink -f`, `date -d`, `grep -P`, `mktemp` suffixes | SH-USER-01, SH-USER-02, SH-USER-03 |
| 7 | An `xargs` without `-r` | SH-USER-08 |
| 8 | Temp state created before one status-preserving `EXIT` trap is bound | SH-ERR-15, SH-ERR-16 |
| 9 | A non-ASCII byte in an installer `.sh` (yash C locale) or `.ps1` (5.1) | SH-GATE-16, PS-ENC-01 |
| 10 | A rc/profile edit is not idempotent, follows no marker pair, or replaces a symlinked rc | SH-EMIT-18, SH-EMIT-19 |
| 11 | The PATH or profile is edited with no consent or opt-out | M-N-07 (SH-INST), SH-EMIT-21 |
| 12 | The `.ps1` has no exact `#Requires -Version 5.1`, or carries 7-only syntax | PS-COMPAT-01, PS-COMPAT-02 |
| 13 | `Invoke-WebRequest` without `-UseBasicParsing`, or a bare `curl`/`tar` | PS-COMPAT-06, PS-NATIVE-01 |
| 14 | `exit` runs under `irm \| iex`, or the iex test uses `$MyInvocation.MyCommand.Path` under StrictMode | PS-ERR-05; formula amendment (PS-SEC-08 candidate, F/out/r14.txt) |
| 15 | `Set-ExecutionPolicy` is called with a scope wider than `Process` | PS-GATE-07 (X28), M-U-02 |
| 16 | A native command's exit status is not checked | PS-ERR-01 |

Not MUST in this table, but required in the skill's step list from the map: the exit taxonomy (M-N-05, P1), prompts from `/dev/tty` (M-N-06), the offline test hatch (M-N-08), TLS on 5.1 (M-U-03; `PS-COMPAT-09` SHOULD) and the zip-slip check (M-U-04).

### 9. Size budgets, references layout and the receipts

The map says each SKILL.md stays under 500 lines. Today three catalog skills do not (`find skills -name SKILL.md | xargs -r wc -l`: `nix-flake-release` 507, `swift-upgrade` 506, `swift-release` 505; `swift-diagnose` 442, `go-upgrade` 396), so the check is not enforced by anything; the shell skills budget to 460 at most so a later edit has room.

| Skill | SKILL.md budget | Content in SKILL.md | `references/` (one level, read on demand) |
|---|---|---|---|
| `shell-diagnose` | 330 | frontmatter 12; scope 20; consent 12; stop condition 12; never-edit-the-check 18; Step 0 25; the route table, 39 rows as above, compressed to the 8 columns' first four plus a rule column, about 60 lines; groups A-G, about 90 lines; receipt 14; MUST rows 20; what agents get wrong 25 | `symptom-text.md` (the verbatim multi-interpreter texts of section 3.1, about 220 lines), `signal-statuses.md` (section 4 table), `nu-churn.md` (F1-F7 per version), `windows-and-ci.md` (E3, G1-G3) |
| `shell-port` | 280 | P0 to P6 (90), the construct table (30), port or pin (20), receipt template (25), MUST rows (20), agents-get-wrong (20), frontmatter and scope (30) | `denylist.sh` (the 60-pattern file, verbatim), `bash32-texts.md` (section 3.1 B3 verbatim) |
| `shell-integration` | 360 | procedure steps 1 to 7 (110), the per-target quoter table (50), rc and hook table (60), MUST rows (25), receipt (15), agents-get-wrong (25), frontmatter (30) | `corpus.txt` (the 36 cases), `roundtrip.sh`, per-shell rc locations |
| `installer-script` | 380 | step list sh (90) and ps1 (70), matrix run (30), MUST rows (25), receipt (15), agents-get-wrong (25), frontmatter (30) | `exit-taxonomy.md`, `detection-matrix.md` |

The shell-diagnose route table above is 39 rows; at one line each with the first four columns and a rule ID it is about 60 lines, inside the budget. The budgets are estimates, not drafted skills; the check that enforces the ceiling was run (V16).

**Receipts.** Every skill ends with one (house rule): shell-diagnose's six blocks (symptom; interpreter identity from Step 0; root cause as a mechanism; the command and its verbatim output, two readings if a fix was applied; fix or named gap; rule IDs relied on), shell-port's nine fields (section 5.5), shell-integration's (targets and quoters; corpus result per interpreter; rc files touched; hooks; undo tested), installer-script's (the matrix of image and shell, exit codes seen, the exit taxonomy used, checksum source).

## Normative guidance candidates

Numbered for this file only. Proposed IDs are SH-CORE-20 and up (the M-O index rows are 01-07); the consolidation renumbers. "Run" means the verification was watched red on a plant and green on its twin, with the artefact path under `F/`.

1. **Route on three facts: exit code, first stderr line, interpreter identity.** Rationale: 127, 126, 2 and 1 each have four or more causes and the message text varies by launcher and version (A1). Verify: the receipt has the Step 0 block; reading heuristic. Run: no (procedure rule).
2. **Check for a CR byte before any other cause of a 126/127 on a file that exists.** Rationale: one command rules it in or out. Verify (output is the violation): `git ls-files --eol -- . | awk '$1 == "i/crlf" || $2 == "w/crlf" || $1 == "i/mixed" || $2 == "w/mixed"'`; second form (bash cell) `git ls-files -z --cached --others --exclude-standard -- . | xargs -0 -r grep -lI -e $'\r'`. Run: yes, `F/v/checks.sh`, plant prints `crlf.sh`, twin empty (V1).
3. **Never answer a `set: Illegal option -o pipefail` with `|| true` or by flipping the shebang to bash without changing Kind; use the SH-DIAL-07 probe.** Rationale: dash 0.5.12-2 and posh abort on the error, `|| true` does not reach (`F/out/r02c.txt`). Verify: `git ls-files -z --cached --others --exclude-standard -- '*.sh' | xargs -0 -r grep -n -e 'pipefail.*[|][|]'`, plus `shellcheck -s sh` SC3040 (default severity, no optional check). Run: yes, `F/v2/checks2.sh` W2 (plant 1 line, twin empty) and `F/r02-pipefail.sh` rc 1 / `F/r02-twin.sh` rc 0 (V2, V3).
4. **Decode a signal status with `[ "$rc" -gt 128 ]` and `kill -l "$rc"`; never test a literal 141/143; a parent that cares about ksh93u+m and yash accepts 256+n and 384+n.** Rationale: 269/271 and 397/399 (section 4). Verify: `matrix.sh posix r13-sig-literal.sh`, red when a literal test prints `MISS`. Run: yes, `F/out/r13.txt` (literal misses on 3 of 11, `-gt 128` hits on 11). Owner of the rule text: SH-ERR-19.
5. **Under `set -u` on a floor below bash 4.4 expand an empty-able array as `${a[@]+"${a[@]}"}`.** Rationale: `args[@]: unbound variable` on 3.2, 4.0 and 4.2 (D1). Verify: `matrix.sh bash r04-emptyarr.sh` (exit 1 on 3.2, 4.0, 4.2) and the twin `r04-twin.sh` (exit 0 on all eight). Run: yes. Rule text: SH-ERR-12 (X22).
6. **Quote every glob in a catalog command block that may be pasted into zsh, including `--include='*.sh'`.** Rationale: zsh `NOMATCH` aborts the command before it runs (`no matches found: --include=*.nomatch`, zsh 5.0.8 to 5.9). Verify: `git ls-files -z -- '*.md' | xargs -0 -r grep -n -e '--include=[*]'` (empty is pass). Run: yes, `F/v/checks.sh` V3 and `F/out/v-zsh.txt` (V4).
7. **Gate 5.1-bound PowerShell by an AST parse on 5.1, not a grep for `&&`.** Rationale: the parse names the token and the error id; a grep for `&&` also hits strings (PS-GATE-04). Verify: `matrix.sh pwsh r07-parse.ps1`; exit 1 on Windows PowerShell 5.1 only. Run: yes, `F/out/r07-parse.txt` (plant `PARSE-ERR(1)` on 5.1, `PARSE-OK` on 7.4 and 7.6.6; twin OK on all).
8. **Keep 5.1-bound `.ps1` files ASCII; diagnose "wrong characters" by bytes, not by running.** Rationale: 5.1 decodes a BOM-less UTF-8 file as ANSI, so no error and `len=5`. Verify: `git ls-files -z --cached --others --exclude-standard -- '*.ps1' | LC_ALL=C xargs -0 -r grep -n -e '[^[:print:][:space:]]'`. Run: yes, `F/v2/checks2.sh` W1 (plant `enc.ps1:1`, twin empty) plus the runtime `F/out/r08.txt` (V5, V6). Rule text: PS-ENC-01.
9. **After a nushell bump, parse every `.nu` file with `nu-check --debug` on the oldest and newest supported nu, and read the first error id; the id (`removed_command`, `shell_andand`, `deprecated`) names the fix.** Rationale: texts differ by version (F5, F6), and a removed name can fall through to an external binary (F7, M-K-03). Verify: `nu --no-config-file -c "nu-check --debug FILE"`, exit 1 on the plant. Run: yes, `F/out/v-nucheck.txt` (plant rc 1 `shell_andand`, twin `true` rc 0) and `matrix.sh nu` (V7).
10. **In a `container:` job, give every step with bash syntax `shell: bash` or write it in POSIX; a `[[` under `sh -e` is a false condition, not a failure.** Rationale: B2 (step exit 0 with `[[: not found`). Verify: `shellcheck -s sh` on the extracted body (SC3010 at default severity). Run: yes, `F/r09-container-body.sh` rc 1 SC3010 / `F/r09-twin.sh` rc 0, and the emulated step (`F/out/r09.txt`) (V8). Rule text: SH-CI-04.
11. **Under Git Bash call Windows tools as `cmd //c` or with `MSYS_NO_PATHCONV=1`/`MSYS2_ARG_CONV_EXCL`, and never assume a hang is the tool's.** Rationale: G1. Verify: `git ls-files -z --cached --others --exclude-standard -- '*.sh' | xargs -0 -r grep -n -e 'cmd /[cCkK] ' | awk '!/MSYS_NO_PATHCONV=1/'`. Run: yes, `F/v2/checks2.sh` W3, and the behaviour `F/out/r10.txt`, `F/out/r10b.txt` (V9). Rule text: SH-CI-14, SH-USER-15. Note: `MSYS_NO_PATHCONV=1 cmd //c` still hangs.
12. **A Taskfile `cmds` body avoids an unquoted hyphenated associative key; re-run the plant on each task bump.** Rationale: the embedded interpreter panics, task rc 2 (G2). Verify: `task -t F/tf/Taskfile.assoc.yml unq-assign-dq-read` (red) against `case-twin` (green). Run: yes, task 3.53.1 locally (`F/out/r11c.txt`) and 3.45.4 / 3.53.1 / 3.54.0 (`F/out/r11.txt`) (V10). Rule text: SH-CI-18.
13. **Run the port's baseline on the target matrix before editing, and treat a green ShellCheck as silent on bash-version problems.** Rationale: ShellCheck exit 0 before and after (section 5.2). Verify: `bash matrix.sh bash SCRIPT` shows a non-zero exit on 3.2 before the port. Run: yes, `F/out/port-p1-baseline.txt` (3.2 exit 2, 4.0/4.2 exit 1, 4.4 exit 0 with `timer=0`) (V11).
14. **A port is accepted only when the output is byte-identical on every version of the matrix and equal to the pre-port output on the newest bash.** Rationale: bash 4.4 exits 0 with a wrong value (`timer=0`). Verify: compare the per-version blocks of the matrix output; one distinct block is the pass. Run: yes, 8 blocks, 1 distinct, and equal to pre-port 5.3 (`F/out/port-p4-after.txt`) (V11).
15. **The 3.2 denylist is fed by git discovery and judged by its output, not its status.** Rationale: the last `xargs` returns 123 on a clean tree. Verify: `bash F/port-denylist.sh DIR`, output is the violation. Run: yes, `F/out/port-p2-before.txt` (5 hits, exit 0) / `port-p2-after.txt` (empty, exit 123) (V11). Rule text: SH-DIAL-06 (denylist), SH-GATE-09 (discovery), X17.
16. **Port a script reachable from macOS, a `macos-*` runner, a taskfile or a workflow; pin the rest with `# bash-floor:` and a `BASH_VERSINFO` guard.** Rationale: 0 of 5 bash-4+ fleet files has a guard. Verify: reading heuristic (header lines 2-8). Run: no. Rule text: SH-DIAL-25, SH-DIAL-27.
17. **Every emitter has a per-target quoter and a corpus round trip that is red on a shared quoter.** Rationale: the toy shared quoter fails fish 3 cases and pwsh up to 12; per-target quoters pass 35/35. Verify: `F/toy/run-all.sh` (output lines `FAIL ...` on naive, none on fixed). Run: yes, `F/toy/out/summary.txt` (V12). Rule text: SH-EMIT-01..04.
18. **An emitter refuses NUL (and empty for pwsh) with exit 65 and empty stdout.** Rationale: a lossy form is worse than a refusal. Verify: the corpus line `nul: REJECTED`. Run: yes (`F/toy/out/summary.txt`, `nul: REJECTED (reference quoter)` in every block) (V12). Rule text: SH-EMIT-05.
19. **Test yash with `LC_ALL=C.UTF-8` set at process start, or report its non-ASCII failures as an environment red, not an emitter defect.** Verify: `F/toy/yash-utf8.sh fixed` prints `35/35`. Run: yes (V12). Rule text: SH-EMIT-04.
20. **An installer probes a downloader's flags before using them; the proof is a run on `alpine:3.22` with only BusyBox wget.** Rationale: `wget: unrecognized option: secure-protocol=TLSv1_2`, installer rc 3. Verify: `sh F/inst-run.sh` (needs docker; rc 3 on the plant, the flag-free twin reaches DNS). Run: yes, `F/out/inst-alpine.txt` (V13). Rule: M-N-03 (SH-INST).
21. **Guard `exit` in any `.ps1` that is also fetched by `irm | iex`, and detect iex with `[string]::IsNullOrEmpty($PSCommandPath)`, not `$MyInvocation.MyCommand.Path`.** Rationale: `exit` ends the caller's host on 5.1, 7.4, 7.6.6; the wave-2 formula throws under StrictMode Latest. Verify: `matrix.sh pwsh F/r12-iex-exit.ps1` (plant never prints `caller: still alive`) and `matrix.sh pwsh F/r14-strictmode.ps1`. Run: yes, `F/out/r12.txt`, `F/out/r14.txt` (V14, V15). Rule text: PS-ERR-05, needs the formula amendment.
22. **A diagnosis never weakens the check to clear the symptom.** The weakening forms are `|| true`, `set +e`, `2>/dev/null` on a probe, a `disable=` with no same-line reason (SH-GATE-05), changing the shebang to bash without changing Kind, adding `shell: bash` to hide a dialect error, and removing a matrix leg. Verify: the fix diff read against this list; `shellcheck` SC-directives need a reason (SH-GATE-05). Run: partly (the `|| true` form is W2, V3); the rest is a reading heuristic.
23. **A SKILL.md is under 500 lines; the shell skills ship under 460.** Verify: `find skills -name SKILL.md | xargs -r wc -l | awk '$2 != "total" && $1 >= 500'` (output is the violation). Run: yes, `F/v3/` plant (501 lines) prints, twin (499) empty; on the real tree it prints the three over-length catalog skills (V16).
24. **Text that varies by interpreter or version gets one catalog row per variant, each tagged with the image tag or package version and the date.** Rationale: A1 has five variants, B1 three, F5 two. Verify: reading heuristic (the row count of a symptom equals its distinct captured texts). Run: no.

## Verification runs

Every run executed 2026-10-11 on this host. Where a check is judged by output (X17), the exit status of the pipeline is reported but not used; `123` from the final `xargs -0 -r grep` means "no match".

| # | Fixture path | Command | Exit on violation | Exit on twin | Relevant output |
|---|---|---|---|---|---|
| V1 | `F/v/{plant,twin}` | `bash F/v/checks.sh .` (V1 block: `git ls-files -z --cached --others --exclude-standard -- . \| xargs -0 -r grep -lI -e $'\r'`) | 0 (status unreliable) | 123 | plant prints `crlf.sh`; twin prints nothing. Also `git ls-files --eol -- . \| awk ...`: plant `i/crlf  w/crlf  attr/  crlf.sh`, twin empty (`F/out/checks1.txt`) |
| V2 | `F/r02-pipefail.sh`, `F/r02-twin.sh` | `shellcheck -s sh FILE` (0.11.0 via `run.sh`) | 1 | 0 | `SC3040 (warning): In POSIX sh, set option pipefail is undefined.` |
| V3 | `F/v2/{plant,twin}` | `bash F/v2/checks2.sh .` W2: `... -- '*.sh' \| xargs -0 -r grep -n -e 'pipefail.*[\|][\|]'` | 0 | 123 | plant: `pipefail-ortrue.sh:3:set -o pipefail \|\| true`; twin empty. Runtime: `matrix.sh posix r02c-ortrue.sh` dash rc 2 `Illegal option -o pipefail`, posh rc 1 `pipefail: bad option`; others `after: rc=0` (`F/out/r02c.txt`) |
| V4 | `F/v/{plant,twin}/doc.md`, `F/v/zsh-catalog.zsh` | V3 block: `... -- '*.md' \| xargs -0 -r grep -n -e '--include=[*]'`; runtime `matrix.sh zsh v/zsh-catalog.zsh` | 0 / zsh `rc=1` | 123 | plant `doc.md:2:grep -rn --include=*.sh -e foo .`; zsh 5.0.8-5.9: `no matches found: --include=*.nomatch`; the quoted twin runs (`F/out/v-zsh.txt`) |
| V5 | `F/v2/{plant,twin}` | `bash F/v2/checks2.sh .` W1: `LC_ALL=C xargs -0 -r grep -n -e '[^[:print:][:space:]]'` over `*.ps1` | 0 | 123 | plant `enc.ps1:1:$s = "caf..."` (the byte-pair is é); twin empty (`F/out/checks2.txt`) |
| V6 | `F/r08-*.ps1` | `matrix.sh pwsh r08-mojibake-nobom.ps1` (and `-bom`, `-ascii-twin`) | 0 (silent) | 0 | 5.1 `len=5` / `0063 0061 0066 00C3 00A9`; 7.4, 7.6.6 `len=4` / `00E9`; BOM and ASCII twins `len=4` on all (`F/out/r08.txt`). Red is the value, not the status |
| V7 | `F/v/{plant,twin}/*.nu` | `run.sh nu --no-config-file -c "nu-check --debug FILE"`; `matrix.sh nu` | 1 | 0 | plant `Error: nu::parser::shell_andand ... instead of '&&', use ';' or 'and'`; twin `true` (`F/out/v-nucheck.txt`, `F/out/v-nu.txt`) |
| V8 | `F/r09-*.sh` | `shellcheck -s sh F/r09-container-body.sh`; emulated step `docker run ... sh -e FILE` per image | 1 | 0 | `SC3010 (warning): In POSIX sh, [[ ]] is undefined.`; debian:12 and ubuntu:24.04 step exit 0 with `[[: not found`; alpine:3.22 prints `bash-test-ok` (`F/out/r09.txt`) |
| V9 | `F/r10-msys-cmd.sh`, `F/r10b-msys-excl.sh`, `F/v2/{plant,twin}/win-cmd.sh` | `matrix.sh win FILE` (Git Bash 5.2.15 on the host); grep W3 | rc=124 for `cmd /c` | rc=0 `hi` | `cmd /c echo hi => Microsoft Windows [Version 10.0.26200.9457]~(c) Microsoft Corporation...~rc=124`; `cmd //c`, `MSYS_NO_PATHCONV=1 cmd /c`, `MSYS2_ARG_CONV_EXCL='*'` and `='/c'` => `hi~rc=0`; `MSYS_NO_PATHCONV=1 cmd //c` rc=124; `</dev/null` => banner, rc=0. W3: plant `win-cmd.sh:9`, twin empty |
| V10 | `F/tf/Taskfile.assoc.yml` | `task -t Taskfile.assoc.yml NAME` (3.53.1); `F/out/r11.txt` for 3.45.4 and 3.54.0 | 2 (panic) | 0 | `panic: interface conversion: syntax.ArithmExpr is *syntax.BinaryArithm, not *syntax.Word`, `mvdan.cc/sh/v3/expand.(*Config).varInd ... param.go:502` (3.53.1, 3.54.0), `param.go:407` (3.45.4); the quoted-key, variable-key, compound-quoted and `case` cells print `ok=v` |
| V11 | `F/port/{before,after}` | `matrix.sh bash port/before/announce.sh`; `bash F/p2-check.sh DIR`; `bash F/port-denylist.sh DIR` | 2 on 3.2, 1 on 4.0 and 4.2, 0 (wrong) on 4.4 | 0 on all 8 | `local: -A: invalid option`; `extra[@]: unbound variable`; `timer=0`; denylist 5 hits then empty; ShellCheck 0.11.0 exit 0 on both; after: 8 blocks, 1 distinct, equal to pre-port 5.3 |
| V12 | `F/toy/` | `F/toy/run-all.sh`; `F/toy/yash-utf8.sh fixed` | 1 (naive) | 0 (fixed) | naive fish `32/35 FAIL backslash,trailing_bs,dbl_bs`; naive pwsh `23/35`, `24/35`, `23/35`; fixed fish `35/35` x4; fixed pwsh `34/34` x3; yash default locale `23/35`, `LC_ALL=C.UTF-8` `35/35`; every block `nul: REJECTED` (`F/toy/out/summary.txt`) |
| V13 | `F/inst-run.sh` | `sh F/inst-run.sh` (docker alpine:3.22, `--network none`, read-only mount of `www-setup/src`) | installer 3, wget 1 | wget reaches DNS: `bad address 'setup.ocx.sh'` | `wget: unrecognized option: secure-protocol=TLSv1_2` + BusyBox v1.37.0 usage (`F/out/inst-alpine.txt`) |
| V14 | `F/r12-iex-exit.ps1` | `matrix.sh pwsh r12-iex-exit.ps1` | child exit 3, no `caller: still alive` | child exit 0, `caller: still alive (LASTEXITCODE=3)` | identical on 7.4, 7.6.6, 5.1 (`F/out/r12.txt`) |
| V15 | `F/r14-strictmode.ps1` | `matrix.sh pwsh r14-strictmode.ps1` | `PropertyNotFoundException: The property 'Path' cannot be found on this object` | `IsIex=True` | on 7.4, 7.6.6 and 5.1 (`F/out/r14.txt`) |
| V16 | `F/v3/{plant,twin}` | `find skills -name SKILL.md \| xargs -r wc -l \| awk '$2 != "total" && $1 >= 500'` | prints `501 skills/big/SKILL.md` | empty (499 lines) | real tree: prints `507 nix-flake-release`, `506 swift-upgrade`, `505 swift-release` |
| V17 | `F/r07-parse.ps1` | `matrix.sh pwsh r07-parse.ps1` | 1 (5.1 only) | 0 | `plant: PARSE-ERR(1) The token '&&' is not a valid statement separator in this version.` on 5.1; `PARSE-OK` on 7.4 and 7.6.6; `twin: PARSE-OK` on all (`F/out/r07-parse.txt`) |
| V18 | `F/r13-sig-literal.sh` | `matrix.sh posix r13-sig-literal.sh` | literal test `MISS` on ksh93u+m x2 (269) and yash (397) | `-gt 128` `hit` on 11 of 11 | `F/out/r13.txt` |
| V19 | `F/r01-cr.sh` | `matrix.sh posix|bash|zsh r01-cr.sh` | 126 / 127 / 2 by variant | n/a | the A1-A3 texts of section 3.1 (`F/out/r01-posix.txt`, `r01-bash.txt`, `r01-zsh.txt`) |
| V20 | `F/r03*.sh`, `F/r04-*.sh`, `F/r15-bash4-text.sh` | `matrix.sh posix\|bash\|zsh` | per section 3.1 and 4 | twin `r04-twin.sh` exit 0 on 8 of 8 | `F/out/r03*.txt`, `r04-bash.txt`, `r15.txt` |

Not red, reported as such: (a) V6 exits 0 on the plant because mojibake is silent, so its verdict is the printed length; the byte check V5 is the one that goes red by status-free output. (b) `shellcheck` on `port/before/announce.sh` stays exit 0 (V11): it did not go red on the 3.2 violation, which is the finding, not a defect of the check. (c) mksh's `wait` status of 0 for the second job in `r03b` was not reproduced in the single-job `r03` (143) and is not explained. (d) The A1 variants were measured with the parent being each matrix interpreter; a kernel-level direct `exec` from a terminal on a real distro bash was not separately captured beyond the bash 5.2 and 5.3 rows.

## Exemplar evidence

Exemplar SHAs are from `shell-audit/scratch/exemplar-shas.md`; fleet SHAs are today's HEADs (`www-setup@a251c3631047`, `index@9eba2cc3929b`, `ocx@c001637dd3ce`; the audits used `ocx@5de9d777eb7d`).

| Candidate (section) | Satisfies | Violates / contradicts |
|---|---|---|
| Probe flags before use (N20, M-N-03) | `rust-lang/rustup@61271d00a979:rustup-init.sh:710,742-748` (`check_help_for`, with fallback to plain `wget`) | `www-setup@a251c3631047:src/install.sh:352,354` (rc 3 on BusyBox); `shell-audit/installers.md` Axis 5 |
| Truncation guard, `main "$@"` last (installer MUST 1) | `rustup-init.sh:931` (`main "$@" \|\| exit 1`), `www-setup@a251c3631047:src/install.sh:913`; 10 of 17 installers (`installers.md` headline 11) | `denoland/deno_install@41d4676f8677`: ends in `echo` (installers.md smell, DENO:127-128) |
| Idempotent rc edit (installer MUST 10, SH-EMIT-18) | `nvm-sh/nvm@b1b3a0038c06:install.sh:484-495` (grep guard, trailing-newline repair) | `ocx@c001637dd3ce:crates/ocx_util/src/fs.rs:236,244-249` renames over a symlink and forces 0600 (audit, not re-run) |
| One quoter per (target, context), named for it (N17) | `ocx@c001637dd3ce:crates/ocx_shell/src/shell/escape.rs:13,19,27` (and the byte-pinning test at `:60-73`, audit) | `escape.rs:35` `single_quoted_doubled` doubles only U+0027 (curly-quote execution, `F/out/curly.txt`); starship `d4d0459c5c24:src/init/mod.rs:46-48`, mise `19e8c8f0d03d:src/shell/pwsh.rs:408-412`, direnv `28a73d1df3f3:shell_pwsh.go:169` same class; zoxide not affected |
| A parity test of emitted text against the in-process value | `ocx@c001637dd3ce:crates/ocx_shell/src/shell.rs` `PARITY_ARMS` (audit `:2886-2917`) | the fleet has no other emitter with one |
| Bash version guard for raised floors (N16) | none: 0 `BASH_VERSION` hits in 166 authored fleet bash files | all five bash-4+ files (section 6) |
| Preserve `-e` state in a sourced script | `nvm-sh/nvm@b1b3a0038c06:nvm.sh:3877-3880` (`${-#*e}` probe, restores) | n/a |
| `exit` guarded under `irm \| iex` (installer MUST 14) | scoop idiom `ScoopInstaller/Install@1e2f334083d6` (`$Global:LASTEXITCODE = $c; break`) survives an interactive prompt but swallows failure non-interactively (sibling dive, not re-run here) | `www-setup@a251c3631047:src/install.ps1:182,734` |
| Quoted globs in catalog command blocks (N6, M-X-02) | none measured | `rules/docs-quality.md:128`, `skills/docs-plan/SKILL.md:197`, `rules/bazel-quality/rust.md:62,164`, `skills/jvm-release/SKILL.md:182`, `skills/bazel-adopt/SKILL.md:276` (map M-X-02); the three over-length skills of section 9 |
| No pipefail in `#!/bin/sh` (N3) | the fleet: 0 pipefail in any sh-shebang script, 17 strict sh scripts use `set -eu` (`fleet-shell-shape.md:180,540`) | n/a |

## AI-agent angle

What an agent characteristically gets wrong in diagnosis and porting, and the smallest mechanical check that catches it:

| # | Mistake | Smallest check |
|---|---|---|
| 1 | Reads `Illegal option -o pipefail`, concludes "dash lacks pipefail", and either flips the shebang to bash or appends `\|\| true` | W2 grep; the SH-DIAL-07 probe; `matrix.sh posix` (accepted on 8 of 11, rejected by dash 0.5.12-2 and posh) |
| 2 | Calls dash "pipefail-less" as a fact; it is a package version (accepted on `0.5.12-12*`) | `dpkg-query -W -f='${Version}\n' dash` in Step 0 |
| 3 | Reads exit 127 on a file that exists as "interpreter missing" and installs one | `git ls-files --eol` check for CR; `head -n1 FILE \| od -c \| head -n2` |
| 4 | Fixes CRLF with `sed -i 's/\r$//'` (BSD sed needs a suffix and does not know `\r`), or fixes the file but not `.gitattributes` | `tr -d '\r' < f > f.new && mv f.new f`; `* text=auto eol=lf` (SH-GATE-14) |
| 5 | Treats 141 as "the command failed" and 143 as "the script crashed", or tests the literal | `[ "$rc" -gt 128 ]` and `kill -l` (V18) |
| 6 | Believes a green ShellCheck proves bash 3.2 compatibility | the denylist and the `bash:3.2` run (V11) |
| 7 | Ports `declare -A` to `declare -A` guarded by `if`, which on 3.2 returns rc 0 and leaves an indexed array | the 3.2 run of the ported script, byte-compared with the oracle |
| 8 | Replaces `mapfile` with `readarray` (same bash 4.0 requirement) or with `read -a` (splits words) | denylist `readarray` pattern; output compare |
| 9 | Uses `date -d`, `sed -i`, `readlink -f`, `grep -P` while porting "to macOS" | SH-USER-01 tells (GNU-only forms; macOS/BSD claims unverified: read only) |
| 10 | Adds `shell: bash` to a container job step without checking the image has bash (Alpine/slim images) | the emulated `docker run IMAGE sh -e` and `command -v bash` in the image |
| 11 | Fixes a zsh `no matches found` by adding `setopt nonomatch` to a bash-targeted block | quote the glob; V4 grep |
| 12 | Writes `&&`, `??` or a ternary in a `.ps1` that must run on 5.1, because pwsh 7 on the author's machine accepted it | the 5.1 AST parse (V17) |
| 13 | Diagnoses garbled text on 5.1 as "console font" and sets `chcp 65001` | byte check V5; ASCII-only source |
| 14 | Calls `exit` in an installer fetched by `irm \| iex`, or copies the wave-2 `$MyInvocation.MyCommand.Path` formula into a StrictMode script | V14, V15 |
| 15 | Uses nu 0.9x-era commands (`let-env`, `date format`, `str collect`, `random integer`, `each -n`), or `&&` in nu | `nu-check --debug` on the newest nu (V7) |
| 16 | Reads the nu error `Assignment operations require a variable.` for `let-env` as a typo, not a removal | row F3 |
| 17 | Runs `cmd /c` under Git Bash and "fixes" the hang with a timeout | W3 grep; `cmd //c` |
| 18 | Proposes `declare -A` in a Taskfile `cmds`, the embedded interpreter panics | V10; `case` |
| 19 | Declares a diagnosis done after the symptom disappears under a changed measurement (`2>/dev/null`, `set +e`, `-x` removed) | the receipt's two readings of the same command |
| 20 | Pastes a paraphrase of an error instead of the verbatim line, so the row cannot be grepped | catalog schema (3.3) |

## Contested / evolving

- **pipefail in dash is moving from absent to present.** POSIX.1-2024 requires `pipefail` ([XCU 2.9.2](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html): "The exit status of a pipeline shall depend on whether or not the pipefail option ... is enabled"). Debian shipped it in dash `0.5.12-7` on 2024-05-17 ([changelog](https://metadata.ftp-master.debian.org/changelogs//main/d/dash/dash_0.5.12-12_changelog), [bug #1071238](https://bugs.debian.org/1071238)); Debian 13 and Ubuntu 26.04 have it, Ubuntu 24.04 LTS (`-6ubuntu5`) and Debian 12 do not. Trend: the probe stays required while any 24.04 or 12 image exists, until about 2029 (Ubuntu 24.04 standard support; unverified: date from memory, not fetched). `ubuntu-latest` moves to 26.04 between 2026-10-19 and 2026-11-19 (SH-CI-15), so a `shell: sh` step changes behaviour in that window.
- **Probe by `--help` text or by behaviour.** rustup greps `--help` (`check_help_for`); SH-USER-05 says to probe behaviour, never banner text. Both exist in the corpus; the skill teaches the behaviour probe and cites rustup as the shape of the fallback.
- **Fail-fast in a diagnosis: `-e` or explicit checks.** Not a dispute here: the skill's check commands are `set -u`, no `-e`, judged by output (X17, SH-ERR-24); the scripts being ported keep their own `set -euo pipefail`.
- **A1's text is shifting.** bash 5.2 prints `required file not found` rc 127; 5.3 returned to a specific `bad interpreter` message ([bash CHANGES](https://tiswww.case.edu/php/chet/bash/CHANGES), 5.3-alpha, item "Fixed the message printed when the shell gets ENOENT from execve"). The ubuntu-latest move to 26.04 (bash 5.3.9 per the map) will change what CI logs show. The catalog keeps both rows.
- **nushell churn.** Removed and deprecated commands arrive about every release; the 0.105.1 vs 0.116.0 texts here are identical for removals and differ only in the `$(...)` wording and the new `str upcase` warning. Trend: more deprecation warnings, so a warning-as-error gate (`nu-check` exit code does not catch a warning) may be needed; not measured.
- **Catalog hygiene.** Three house skills exceed 500 lines. Whether to fix the skills or the rule (a hard limit versus a budget) is an owner call; this file keeps 460 as the shell ceiling.
- **mvdan/sh panic.** No upstream fix as of task 3.54.0 (SH-CI-18 re-check on each task release). Whether to file upstream is an owner decision.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html | POSIX.1-2024 XCU chapter 2, Shell Command Language (primary) | 2024 | Exit status 126/127/greater-than-128 rules; the pipefail requirement; the "greater than 255" allowance behind 269/397 |
| https://manpages.debian.org/bookworm/manpages-dev/execve.2.en.html | execve(2) (primary) | Debian bookworm | `ENOENT`: "the file pathname or a script or ELF interpreter does not exist" |
| https://metadata.ftp-master.debian.org/changelogs//main/d/dash/dash_0.5.12-12_changelog | dash Debian changelog (primary) | through 0.5.12-12 | Pins "Implement pipefail option" to `0.5.12-7` (2024-05-17) |
| https://bugs.debian.org/1071238 | Debian bug "please consider cherry-picking set -e pipefail support from upstream" (primary) | 2024-05-17; fixed in 0.5.12-7 | The request and fix for the pipefail change |
| https://tiswww.case.edu/php/chet/bash/NEWS | bash NEWS (primary) | through 5.3 | Version-by-version features behind the denylist |
| https://tiswww.case.edu/php/chet/bash/CHANGES | bash CHANGES (primary) | through 5.3 | The 5.3-alpha ENOENT message fix behind A1's variants |
| https://lists.libreplanet.org/archive/html/bug-bash/2019-05/msg00024.html | Chet Ramey, bug-bash, quoting the 4.4 CHANGES entry (primary) | 2019-05-13 | The exact empty-array / nounset fix and its date (July 2016) |
| https://magicant.github.io/yash/doc/exec.html | yash manual, command execution (primary) | yash 2.x | "signal number plus 384" (397, 399) |
| https://raw.githubusercontent.com/ksh93/ksh/dev/src/cmd/ksh93/sh.1 | ksh93u+m `sh.1` man page source (primary) | dev branch | "256+signum" (269, 271) |
| https://zsh.sourceforge.io/Doc/Release/Options.html | zsh manual, Options (primary) | zsh 5.9 docs | `NOMATCH` and `NULL_GLOB` definitions |
| https://www.shellcheck.net/wiki/SC3040 | ShellCheck wiki SC3040 (primary); also the local clone `koalaman__shellcheck.wiki` at `0b4dfe7bf9dc` (SC3010, SC3043) | ShellCheck 0.11.0 era | The dialect codes behind V2 and V8 |
| https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax | GitHub Actions workflow syntax, the shell table (primary) | read 2026-10-11 | `bash -e {0}` vs `bash --noprofile --norc -eo pipefail {0}`; fallback `sh -e {0}` |
| https://github.com/actions/runner/blob/main/src/Runner.Worker/Handlers/ScriptHandler.cs | actions/runner ScriptHandler (primary source) | main, read 2026-10-11 | Default `sh` with no host bash check in a container |
| https://www.msys2.org/docs/filesystem-paths/ | MSYS2 filesystem paths (primary) | read 2026-10-11 | Automatic Unix-to-Windows argument conversion and `MSYS2_ARG_CONV_EXCL` |
| https://github.com/git-for-windows/build-extra/blob/main/ReleaseNotes.md | Git for Windows release notes (primary) | Git for Windows 2.5.0 entry (2015) | `MSYS_NO_PATHCONV` introduction and the `cmd /c dir /x` example |
| https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_pipeline_chain_operators?view=powershell-7.6 | about_Pipeline_Chain_Operators (primary) | PowerShell 7.6 docs | `&&` and `\|\|` are 7+ |
| https://learn.microsoft.com/en-us/powershell/scripting/whats-new/differences-from-windows-powershell?view=powershell-7.6 | Differences between Windows PowerShell 5.1 and PowerShell 7.x (primary) | 7.6 docs | The 5.1/7 behaviour gaps behind E1 |
| https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_character_encoding?view=powershell-7.6 | about_Character_Encoding (primary) | 7.6 docs | 5.1's ANSI default and BOM behaviour behind E2 |
| https://www.nushell.sh/blog/2026-07-04-nushell_v0_114_0.html | Nushell 0.114.0 release notes (primary) | 2026-07-04 | The `str upcase` deprecation and its replacement |
| https://www.nushell.sh/book/coming_from_bash.html | Nushell book, Coming from Bash (primary) | current | The bash idioms nu rejects (`&&`, `$(...)`) |
| https://github.com/rust-lang/rustup | rustup, `rustup-init.sh` at `61271d00a979` (exemplar clone) | 2026-10-10 | `check_help_for` probe and `main "$@"` last line |
| https://github.com/nvm-sh/nvm | nvm, `install.sh` and `nvm.sh` at `b1b3a0038c06` (exemplar clone) | 2026-10-10 | Idempotent rc edit; `${-#*e}` errexit preservation |
| https://github.com/mvdan/sh/issues/1108 | mvdan/sh issue, associative array regression | closed | Nearest upstream item to the G2 panic (different symptom) |
| https://github.com/go-task/task/issues/1908 | go-task issue, associative array broken | closed | The task-side report of the same family |
| https://github.com/go-task/task/issues/2469 | go-task issue, `pipefail` is not applied to `status` commands (cited by SH-CI-17), read 2026-10-11 | open | Taskfile semantics that bound the V10 plant |
| `shell-audit/*.md` and `shell-*.md` under `.agents/research/` in the worktree | the seven audits and seven wave-2 consolidations | 2026-10-10 / 11 | Fleet counts, rule IDs and the measured matrices this file cites |
| `skills/swift-diagnose/SKILL.md`, `skills/go-upgrade/SKILL.md` in the worktree | the house skill shape (442 and 396 lines) | 2026-10-10 | Frontmatter, route table, receipt, MUST-row table, ranked mistakes |
| fleet repos read locally: ocx `c001637dd3ce`, www-setup `a251c3631047`, index `9eba2cc3929b` | the five bash-4+ files, the installer worked example, the emitter defect | 2026-10-11 | the repos themselves, read-only |

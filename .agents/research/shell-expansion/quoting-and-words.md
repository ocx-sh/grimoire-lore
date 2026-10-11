---
title: Quoting, word splitting, globbing and the text-handling builtins
topic: shell / expansion / quoting-and-words (rule family SH-EXP; also feeds SH-SEC rows M-E-01..03, M-E-08)
agent: W2-6 expansion/quoting-and-words
model: sonnet
date_researched: 2026-10-11
sources_count: 27
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/quoting-and-words/
scope: |
  Covers rows M-C-01..14, M-C-17, M-C-19, M-C-21, M-C-22 and M-E-01..03, M-E-08 of the topic map: quoting and splitting, argv building,
  hostile filenames, echo/printf, read loops, test operators, arithmetic, here-docs and command substitution, globs and brace expansion,
  string operations, destructive-command guards, extra parsers, option parsing, special variable names. Measured on dash 0.5.12, busybox ash
  1.35/1.37, mksh R59c, ksh93u+m (2023, 1.0.10), yash 2.52, posh 0.14.1, bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6-4.9, nu 0.105.1/0.116.0,
  pwsh 7.4/7.6.6 and Windows PowerShell 5.1.26100.9444, ShellCheck 0.11.0, PSScriptAnalyzer 1.25.0.
  NOT covered: errexit/trap semantics (SH-ERR), userland flag differences (SH-USER), emitter quoting per target shell (SH-EMIT),
  secrets (SH-SEC beyond the rows above). There is no macOS host: every BSD/macOS statement is marked "unverified: read only".
---

# Quoting, word splitting, globbing and the text-handling builtins

`FX` below means `/home/mherwig/.cache/research-lang/shell-tools/fixtures/quoting-and-words`. `M` means `/home/mherwig/.cache/research-lang/shell-tools/matrix.sh`.
`SC` means `/home/mherwig/.cache/research-lang/shell-tools/run.sh shellcheck` (0.11.0). All dates 2026-10-11.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. Evidence rules and conventions
   2. Unquoted expansions: the quoting contract and ShellCheck severities
   3. Sanctioned splitting idioms
   4. Hostile filenames: leading dash, newline, glob characters
   5. Building a command line: arrays, `set --`, `${x:+}`, never `eval`
   6. echo versus printf (conflict 19 confirmed and refined)
   7. printf details: format strings, `%b`, `%n$`, `%d`, `%q`
   8. read, read loops and what survives a pipeline
   9. Test operators per dialect
   10. Arithmetic: portability and injection
   11. Here-docs, command substitution, `$'..'`
   12. Globs: unmatched patterns, dot files, brace expansion
   13. String operations available in sh
   14. Destructive commands and the Steam incident
   15. Extra parsers: ssh, `sh -c`, QuoteBench
   16. Option parsing: getopts and GNU getopt
   17. Variable names that collide with shell specials
   18. The `-S warning` chase: what the fleet gate misses
   19. Defects reported, not fixed (owner Q6)
   20. Other shells in one table: zsh, fish, nushell, PowerShell
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Quote every expansion (`"$v"`, `"$(cmd)"`, `"$@"`, `"${a[@]}"`); the unquoted forms are the top bug class: SC2086 is 183 of 278 findings in agent research scratch and 30 of the 65 authored ones ([fleet] #7, `shell-audit/fleet-shell-shape.md:192`). Measured ShellCheck 0.11.0 severities: SC2086 info; SC2046, SC2048, SC2206, SC2207 warning; SC2068, SC2070, SC2045 error.
- Conflict 4's claim that SC2046 and SC2068 are info-level is wrong: they survive `shellcheck -S warning`. Only SC2086, SC2162, SC2035, SC2059, SC2028, SC2029, SC2030/31 and SC2012 are hidden by it (measured, `FX/sc-red.bash`).
- `-S warning` (`ocx@5de9d777eb7d:taskfiles/shell.taskfile.yml:38`, `setup-grimoire@1259e35b2550:Taskfile.yml:25-26`) hides 20 findings in 9 files in ocx today (0 of them SC2086: SC1091 x8, SC2016 x6, SC2012 x5, SC2015 x1) and would hide 404 of the 521 fleet findings (78%), including every SC2086 (278).
- Build argv with a bash array or POSIX `set --`; `${v:+"-x"}` is the one-optional-flag idiom. ShellCheck has NO check for `eval "$string"` or for running `$cmd` (not at default, not with `-o all`): the only gate is `grep -rnw -e eval`.
- Bash arrays under `set -u`: `"${a[@]}"` on an empty array aborts bash 3.2, 4.0 and 4.2 (`unbound variable`) and is fine from 4.4; `${a[@]+"${a[@]}"}` works on every bash 3.2-5.3 and zsh (measured).
- echo: conflict 19 is confirmed in sh mode (`\t` interpreted by dash, mksh, yash, posh; literal in ash x2, ksh93 x2, bash --posix x2, zsh sh-mode) and is wider than the map says: native zsh 5.0.8-5.9 interprets backslashes too, `bash --posix` interprets `echo -e`, yash prints `-n`, dash/posh print `-e`. Rule: `printf '%s\n'` for anything variable or containing a backslash; no `echo -e/-n/-E`.
- printf: POSIX.1-2024 specifies `%n$`, but only ksh93u+m and zsh accept it; bash 3.2-5.3, dash, ash, mksh, yash and posh all reject it. `printf "$var"` is an error or a format-string bug in every shell except ksh93.
- `read -d` is absent in dash 0.5.12, yash 2.52 and posh 0.14.1; here-strings are a syntax error in dash, ash 1.35/1.37 and posh; `$(<file)` silently yields the empty string in dash, ash, yash and posh. None of these three is usable under `#!/bin/sh` if dash is a target.
- A `cmd | while read` loop keeps its variables only in ksh93u+m (and bash 4.2+ with `shopt -s lastpipe`, non-interactive); everywhere else use a redirect, a here-doc, or `< <(cmd)` (bash).
- Test operators: `==` fails in dash and posh and is an ERROR in native zsh (`zsh: = not found`); `-a`/`-o` were removed by POSIX.1-2024 and `[ "!" -a "" ]` gives five different answers; `-v` is absent from dash, ash, yash, posh, bash < 4.2, zsh 5.0.8; busybox ash `[[ abc == a* ]]` is a syntax error.
- Arithmetic injection (`x='a[$(touch PWNED)]'`) executes in `$((x))`, `((x))`, `[[ -eq ]]`, `let`, `declare -i` and array subscripts on bash 3.2-5.3, and in mksh R59c and posh 0.14.1 even through `[ "$x" -gt 1 ]`; it did not fire in dash, ash, ksh93u+m, yash or zsh. No ShellCheck code fires (issue 2679 is still open). Validate with `case $x in ''|*[!0-9]*)` first.
- Brace expansion `{1..3}` runs the loop body once with the literal word in 7 of 11 POSIX-mode shells (dash, ash x2, mksh, yash, posh, zsh sh-mode); SC3009 catches it under `-s sh`.
- `.*` matches `.` and `..` in dash 0.5.12, busybox ash 1.35 and 1.37, yash 2.52 and bash <= 5.1; it does not in mksh, ksh93u+m, posh, bash >= 5.2 (`globskipdots`, default on) and zsh. ShellCheck has no code for `rm -rf .*`.
- `"${root}/"*` with an empty root expands to `/bin /boot /dev /etc ...` in all 11 shells; SC2115 (warning, survives `-S warning`) fires on `"$v/"*`, `"$v"/*`, `"$v/"` and `"$v/$w"`, and is satisfied only by `${v:?}`.
- Every extra parser (ssh, `sh -c`, `docker exec`, YAML) re-splits the string: `ssh host "touch $file"` with `file='a b;touch PWNED'` creates three files in all 11 shells. QuoteBench measured a 55.4-73.2 point loss through one added parser, and 23.4-47.0% of failing executions still exit 0, so verification must check final state, not exit status.
- GNU-style `getopt` is available with long options on util-linux and on busybox 1.37 (Alpine 3.22): the map's "missing on busybox" is wrong for 1.37; macOS/BSD getopt is unverified: read only. Probe with `getopt -T; [ $? -eq 4 ]`.
- zsh is not bash: no word splitting by default, `[ a == a ]` is an error, `path`/`status` are special (a `local path=` makes `ls` vanish on 5.9), `010` is 10, unmatched globs abort, and ShellCheck refuses to parse it (SC1071).

## Findings

### 1. Evidence rules and conventions

- Every claim marked "measured" was produced by `M <family> <script>` or a `docker run` of a named image on 2026-10-11. The fixture for each is in `FX`; the verbatim runs are in [Verification runs](#verification-runs).
- `matrix.sh posix` runs 11 interpreters: dash 0.5.12 (deb12), busybox ash 1.35 (deb12), busybox ash 1.37 (Alpine 3.22), mksh R59c, ksh93u+m 2023 (deb12), ksh93u+m 1.0.10 (deb13), yash 2.52, posh 0.14.1, bash 3.2 `--posix`, bash 5.2 `--posix`, zsh 5.9 `--emulate sh`.
- macOS: `/bin/sh` is bash 3.2 in POSIX mode (map conflict 10, read only). Everything BSD/macOS below is "unverified: read only". The Stack Exchange answer on echo notes that "even some certified systems like macOS are not compliant" ([Unix SE 65803](https://unix.stackexchange.com/questions/65803/why-is-printf-better-than-echo), read through the Stack Exchange API).

### 2. Unquoted expansions: the quoting contract and ShellCheck severities

The mechanism: an unquoted parameter expansion, command substitution or arithmetic expansion is subject to field splitting and then pathname expansion ([POSIX.1-2024 XCU 2.6](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)); the ShellCheck wiki states it as "Split the first argument by IFS... Expand each of them as if it was a glob" ([SC2086](https://www.shellcheck.net/wiki/SC2086)). BashPitfalls #2 and #14 make the same point and add that `echo $foo` can even hide the real value ([BashPitfalls](https://mywiki.wooledge.org/BashPitfalls) #2, #14). Google's guide: "Always quote strings containing variables, command substitutions, spaces or shell meta characters, unless careful unquoted expansion is required" and `"$@"` over `$*` ([Google](https://google.github.io/styleguide/shellguide.html), Quoting).

Quoting inside `$(...)` starts a new context (SC2086 wiki): `echo "This $variable is quoted $(but this $variable is not)"`. Composite words: `"$HOME/$dir/src/*.c"` will not glob, `"$HOME/$dir/src"/*.c` will (SC2086 wiki).

**Measured ShellCheck 0.11.0 severities** (one plant, `FX/sc-red.bash`, `shellcheck -f json1`; `-S warning` keeps everything marked warning/error):

| Code | Plant | Level | Survives `-S warning` |
|---|---|---|---|
| SC2086 | `cp $f /dst`, `for i in $list`, `cmd $args` | info | no |
| SC2046 | `echo $(date)` | warning | yes |
| SC2048 | `for i in $*` | warning | yes |
| SC2068 | `echo ${arr[@]}` | error | yes |
| SC2206 / SC2207 | `lines=( $list )`, `files=($(ls))` | warning | yes |
| SC2070 | `[ -n $f ]` | error | yes |
| SC2045 | `for g in $(ls *.mp3)` | error | yes |
| SC2044 / SC2038 / SC2010 | `for g in $(find ..)`, `find .. \| xargs rm`, `ls \| grep` | warning | yes |
| SC2012 | `ls -A "$temp" \| wc -l` (ocx) | info | no |
| SC2035 | `rm *.txt` | info | no |
| SC2059 | `printf "$f\n"` | info | no |
| SC2162 | `read line` | info | no |
| SC2028 | `echo "a\tb"` | info | no |
| SC2029 | `ssh host "rm $f"` | info | no |
| SC2030 / SC2031 | `echo a \| read v; echo "$v"` | info | no |
| SC2294 | `eval "${arr[@]}"` | warning | yes |
| SC2155 / SC2164 / SC2166 / SC2076 / SC2156 / SC2060 / SC2051 | see plant | warning | yes |
| SC2115 | `rm -rf "${root}/"*` (SC lint plant, `-s sh`) | warning | yes |
| SC3003 SC3006 SC3009 SC3010 SC3011 SC3014 SC3016 SC3018 SC3019 SC3020 SC3028 SC3030 SC3034 SC3039 SC3040 SC3043 SC3045 SC3046 SC3047 SC3050 SC3053 SC3054 SC3057 SC3059 SC3060 | `-s sh` bashisms (`FX/sh-bashisms.sh`, `FX/pe-lint.sh`) | warning (SC3036 under `-s dash` is error) | yes |

Map conflict 4 lists "SC2086, SC2046, SC2068 and SC2162" as info-level; only SC2086 and SC2162 are. The "never disable" set stands (SC2086, SC2046, SC2068, SC2155, SC2164, SC2162, SC2115) but the `-S warning` argument only needs SC2086, SC2162, SC2035, SC2059, SC2028, SC2012 and SC2029.

ShellCheck does not model `set -f`: SC2086 fires on the `set -f` + `IFS=,` idiom (`FX/split-idiom.sh` lines 8 and 13), so a deliberate split needs `# shellcheck disable=SC2086 # set -f active, IFS=,`.

ShellCheck has no zsh parser: `shellcheck zsh-split.zsh` exits 1 with `SC1071 ShellCheck only supports sh/bash/dash/ksh/'busybox sh' scripts` (measured).

### 3. Sanctioned splitting idioms

All four are measured on the 11 POSIX-mode shells and, for arrays, bash 3.2-5.3 and zsh 5.0.8-5.9.

| Need | Idiom | Dialect | Notes |
|---|---|---|---|
| Optional flags / variable argv | bash array `args=(--name "$n"); args+=(--verbose); cmd "${args[@]}"` | bash 3.1+ (`+=`), ksh, zsh | `FX/argv-array.sh`; empty-array guard below |
| Same, POSIX | `set -- --name "$n"; [ -n "$v" ] && set -- "$@" --verbose; cmd "$@"` | all 11 | `FX/argv-green.sh`; clobbers the caller's `$@`: wrap in a function |
| One optional flag | `cmd ${v:+--verbose} ${out:+-o "$out"}` | all 11 | `FX/argv-alt.sh`: `argc=3 [--verbose] [-o] [my file.txt]` when set, `argc=0` when empty; recommended verbatim by the [SC2086 wiki](https://www.shellcheck.net/wiki/SC2086) |
| Deliberate split of a delimited list | `set -f; IFS=,; set -- $list; IFS=$oldifs; set +f` | all 11 | `FX/split-idiom.sh`: without `set -f` the list `a,*,c` becomes `4 [a file1 file2 c]`; with it `3 [a * c]` |

Empty-array guard (bash 3.2/4.0/4.2): with `set -u`, `"${extra[@]}"` on `extra=()` aborts with `extra[@]: unbound variable` and exit 1 on bash 3.2, 4.0 and 4.2, and returns `argc=0` on 4.4-5.3 and zsh; `${extra[@]+"${extra[@]}"}` returns `argc=0` on every version, and `argc=2 [a b] [c]` for `("a b" c)` (`FX/argv-array.sh`, `FX/argv-array-guard.sh`). This corroborates map conflict 11.

BashFAQ/050: "Variables hold data. Functions hold code. Don't put code inside variables!" ([BashFAQ/050](https://mywiki.wooledge.org/BashFAQ/050)). Google: "when building a set of command arguments, use arrays to avoid confusing quoting issues" (Arrays).

### 4. Hostile filenames: leading dash, newline, glob characters

Plant (a), `FX/split-red.sh` and `FX/split-green.sh`: three files `a b.txt`, `line1<NL>line2.txt`, `-dash.txt`.

```sh
# RED (all 11 shells: copied=0 of 3, left_in_src_after_rm=3, exit 1)
for f in $(ls); do cp $f ../dst/; done
rm -f *
# GREEN (all 11 shells: copied=3 of 3, left=0, exit 0)
for f in ./*; do cp -- "$f" ../dst/; done
for f in ./*; do rm -- "$f"; done
```

- ShellCheck on the red plant (`-s sh`): `SC2045` error (line 12), `SC2086` info (line 12), `SC2035` info (line 15); at `-S warning` only SC2045 remains. The green twin is clean (exit 0).
- `ls` output is unreliable as data: with files `a b`, `n<NL>l`, `-d`, `ls -A | wc -l` printed 4 on GNU coreutils (ubuntu:24.04, deb12) and 3 on busybox 1.37, which prints `?` for the newline (`FX/find0.sh`). BashPitfalls #1 lists the six failure modes of `for f in $(ls)`.
- `rm -f *` with a file named `-dash.txt`: the glob sorts it first and `rm` reads `-d -a -s -h ...` as options, deleting nothing. Google: "Use an explicit path when doing wildcard expansion of filenames... `rm -v ./*`" (Wildcard Expansion); BashPitfalls #3.
- An unmatched `./*.mp3` stays literal in sh/bash, so the loop runs once with the pattern: guard with `[ -e "$f" ] || continue` (BashPitfalls #1).
- NUL pipelines (`FX/find0.sh`, busybox 1.37 and GNU): `find -print0 | xargs -0` and `find -exec ... {} +` both batch correctly; `xargs` WITHOUT `-0` fails on a quote (`xargs: unmatched single quote`), and `xargs -0` WITHOUT `-r` still runs the command once on empty input on both GNU and busybox 1.37 (`-r` is in POSIX.1-2024: "Do not execute the utility ... if no arguments are supplied", [xargs](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/xargs.html)). BSD/macOS xargs behaviour is unverified: read only.
- A reading loop template that keeps names byte-exact (5 hostile names incl. newline, leading dash, `*`, trailing space; `FX/readloop-green.bash`): `while IFS= read -r -d '' f; do ...; done < <(find . -type f -print0)` sees 5 of 5 on bash 3.2-5.3; `for f in $(find . -type f)` sees 7 of 5 on all 11 POSIX shells (`FX/readloop-red.sh`). The POSIX equivalent is `find . -type f -exec sh -c 'for f in "$@"; do ...; done' _ {} +` (5 of 5 on all 11, `FX/readloop-posix.sh`).

### 5. Building a command line: arrays, `set --`, `${x:+}`, never `eval`

Plant (b), hostile value `name='a b; touch PWNED #'`:

```sh
# RED  FX/argv-red.sh: all 11 shells -> "argc=3 [--name] [a] [b]", PWNED created, exit 1
cmd="argc --name $name"; [ -n "$verbose" ] && cmd="$cmd --verbose"; eval "$cmd"
# GREEN FX/argv-green.sh (sh): all 11 -> argc=3 [--name] [a b; touch PWNED #] [--verbose], exit 0
set -- --name "$name"; [ -n "$verbose" ] && set -- "$@" --verbose; argc "$@"
# GREEN FX/argv-array.sh (bash 3.2-5.3, zsh 5.0.8-5.9): args=(--name "$name"); args+=(--verbose); argc "${args[@]}"
```

**ShellCheck does not see the red plant.** `shellcheck FX/argv-red.sh` exits 0 with no output, and `shellcheck -o all` adds only SC2250 (brace style). SC2294 fires only when `eval` receives an array or `"$@"` (`eval "${arr[@]}"`, SC2294 warning; [SC2294 wiki](https://www.shellcheck.net/wiki/SC2294)); `eval "$cmd"`, `eval "echo $x"` and a bare `$cmd` execution produce nothing (`FX/argv-eval-array.sh`: SC2294 on line 3, SC2086 on `ls $opts`, SC2207 and SC2206 on the array splits; no code on lines 4-6 except the unassigned-variable ones). The gate for "no eval of data" is therefore a grep: `grep -rnw -e eval --include='*.sh' DIR` (red on the plant, empty on the twin, see Verification runs).

Legitimate `eval`: the fleet's activation idiom `eval "$(ocx env --shell=bash)"` evaluates the output of a trusted emitter in `"$( )"` (`ocx@5de9d777eb7d:test/doc_scripts/user-guide__toolchain-activation.sh:17`). The rule allows `eval "$(trusted-tool ...)"` and nothing else; Google: "eval should be avoided" (Eval).

PowerShell counterpart: `Invoke-Expression "ls $Name"`, `iex ...` and `Invoke-Expression $cmd` are flagged by PSScriptAnalyzer 1.25.0 `PSAvoidUsingInvokeExpression` (Warning, lines 2, 3, 5 of `FX/ps-iex-red.ps1`; the splatted twin `& git @argsList` is clean, exit 0; [rule doc](https://github.com/PowerShell/PSScriptAnalyzer) `PowerShell/PSScriptAnalyzer@411c3d0b197b:docs/Rules/AvoidUsingInvokeExpression.md:1-3`).

### 6. echo versus printf (conflict 19 confirmed and refined)

POSIX: "If the first operand consists of a '-' followed by one or more characters from the set {'e','E','n'}, or if any of the operands contain a backslash, the results are implementation-defined"; "New applications are encouraged to use printf instead of echo" ([POSIX.1-2024 echo](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/echo.html)). dash's own manual documents only `echo [-n]` and a built-in set of backslash sequences ([dash(1)](https://man.archlinux.org/man/dash.1), echo). Chazelas: "You don't know what `echo "$var"` will output unless you can make sure that `$var` doesn't contain backslash characters and doesn't start with `-`" ([Unix SE 65803](https://unix.stackexchange.com/questions/65803/why-is-printf-better-than-echo)).

Plant (c), `FX/echo.sh` (od -c of the bytes) and twin `FX/echo-printf.sh`. `TAB` = backslash-t interpreted, `lit` = two literal characters:

| Probe | dash | ash 1.35/1.37 | mksh | ksh93u+m x2 | yash | posh | bash 3.2/5.2 --posix | zsh sh-mode | zsh native 5.0.8-5.9 | bash native 3.2/5.3 |
|---|---|---|---|---|---|---|---|---|---|---|
| `echo 'a\tb'` | TAB | lit | TAB | lit | TAB | TAB | lit | lit | TAB | lit |
| `echo -n x; echo y` | no NL | no NL | no NL | no NL | prints `-n x`, NL | no NL | no NL | no NL | no NL | no NL |
| `echo -e 'a\tb'` | prints `-e a TAB b` | TAB | TAB | TAB | prints `-e ...` | prints `-e ...` | TAB | TAB | TAB | TAB |
| `v=-n; echo "$v"` | empty | empty | empty | empty | prints `-n` | empty | empty | empty | empty | empty |
| `v=-e; echo "$v"` | prints `-e` | empty | empty | empty | prints `-e` | prints `-e` | empty | empty | empty | empty |
| `v='a\nb'; echo "$v"` | 2 lines | lit | 2 lines | lit | 2 lines | 2 lines | lit | lit | 2 lines | lit |
| `echo -n -n x` | `-n x` | `x` | `x` | `x` | `-n -n x` | `x` | `x` | `x` | `x` | `x` |

Twin `printf '%s\n' "$v"` for the same inputs produced one identical output across all 11 shells (`uniq -c` collapsed 11 lines to 1: `a\tb` literal, `-n`, `-e`, `a\nb`, `a\cb` literal, and `printf '%s' x` without newline).

**Verdict on conflict 19.** The 4-against-4 split is confirmed for `\t` in sh mode (dash, mksh, yash, posh interpret; ash x2, ksh93 x2, bash --posix x2, zsh sh-mode do not). Refinements the map needs: (1) native zsh is a fifth interpreting family, so a `#!/usr/bin/env zsh` file and a `zsh --emulate sh` file disagree; (2) `echo -e` is honoured by bash --posix and zsh but is printed literally by dash, yash and posh, i.e. `echo -e` is wrong in both directions; (3) a data variable equal to `-n` or `-e` is silently swallowed by 9 of 11 shells (empty line) and printed by yash/dash/posh; (4) bash itself can flip behaviour with `shopt -s xpg_echo` (bash:3.2: `a<TAB>b` with xpg_echo on, `a\tb` with it off in POSIX mode). The macOS sh echo is unverified: read only.

ShellCheck codes on `FX/echo.sh`: `-s sh` gives SC2028 (info, `echo 'a\tb'`) and SC3037 warning on every `echo -e`/`-n`/`-n -n`; `-s dash` gives SC3036 error on `echo -e` only (dash supports `-n`); `-s bash` gives SC2028 only. The twin is clean (exit 0). ShellCheck cannot flag `echo "$v"` with a hostile `$v`; that is the reason the rule is about data, not flags.

### 7. printf details: format strings, `%b`, `%n$`, `%d`, `%q`

`FX/printf-pins.sh`, 11 POSIX-mode shells plus bash 3.2/5.3 and zsh 5.9 native:

| Probe | Result |
|---|---|
| `printf '%b' 'a\tb\\n'`, `'a\0101b'` | identical in all 11: `a TAB b \n`, `aAb` |
| `printf '%2$s-%1$s' a b` | `b-a` on ksh93u+m x2 and zsh (sh-mode and native 5.9); an error on dash, ash x2, mksh, yash, posh, bash 3.2/5.2/5.3. POSIX.1-2024 printf specifies `%n$` ([printf](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/printf.html): "the conversion specifier character '%' is replaced by the sequence "%n$""), so the standard is ahead of 9 of 11 implementations |
| `v='100%'; printf "$v"` | `100%` on ksh93u+m only; an error on every other shell (dash, ash `invalid format`, mksh/posh `invalid conversion specification`, yash `the conversion specifier is missing`, bash, zsh) |
| `printf '[%s][%s]' a` (missing arg) | `[a][]` everywhere |
| `printf '%d' 010` | `8` on dash, ash x2, mksh, yash, posh, bash, zsh sh-mode; `10` on ksh93u+m |
| `printf '%d' 0x1f` | `31` everywhere |
| `printf '%d' abc` | non-zero status plus message in dash/ash/mksh/yash/posh/bash; prints `0` silently in ksh93u+m and zsh sh-mode |
| `printf '%q' 'a b'` | `a\ b` bash, zsh; `'a b'` mksh, ksh93u+m, posh; error in dash, ash, yash (SC3050 under `-s sh`) |

Rules: format strings are constants (SC2059, info); data goes through `%s`; `%b` only for strings the script itself authored. `%q` output differs per shell, so it may be used to quote for the SAME shell only (see section 15).

### 8. read, read loops and what survives a pipeline

POSIX.1-2024 `read` takes `-r` and `-d delim` ([read](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/read.html): `read [-r] [-d delim] var...`); implementations lag. `FX/read-pins.sh` (11 shells):

| Probe | dash | ash x2 | mksh | ksh93 x2 | yash | posh | bash --posix | zsh sh |
|---|---|---|---|---|---|---|---|---|
| `read x` on `a\\b` vs `read -r` | `a\b` vs `a\\b` in all 11 (SC2162 info) | | | | | | | |
| `read -d ''` / `-d :` | `Illegal option -d` | ok | ok | ok | `-d' is not a valid option` | `invalid option -- 'd'` | ok | ok |
| `read x <<< hello` | syntax error | syntax error | ok | ok | ok | syntax error | ok | ok |
| `printf 'a\nb' \| while IFS= read -r l` (no final NL) | loses `b` | loses `b` | loses `b` | loses `b` | loses `b` | loses `b` | loses `b` | loses `b` |
| same with `\|\| [ -n "$l" ]` | `[a][b]` in all 11 | | | | | | | |
| `echo a \| read x; echo "$x"` | empty | empty | empty | `a` | empty | empty | empty | empty |
| counter in `printf .. \| while read` | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| counter with here-doc redirect | 2 in all 11 | | | | | | | |
| child `cat` inside `while read` steals the rest of the input | `[a]` only in all 11; `cat </dev/null` gives `[a][b][c]` | | | | | | | |
| `IFS=: read a b <<< 'foo:bar:'` | `bar` | `bar` | `bar` | `bar` | `bar` | `bar:` | `bar` | `bar:` |

Bash, measured separately (`FX/pipe-scope.sh`): the pipeline counter is 0 on bash 3.2-5.3; with `shopt -s lastpipe` it is 2 on 4.2-5.3 (the option does not exist in 3.2/4.0); `< <(cmd)` and a here-doc give 2 on every version. zsh keeps pipeline variables (2) natively. This matches BashPitfalls #8 and #46's notes.

**bash 5.0-5.2 `read -rd ''` multibyte bug** (BashPitfalls #65, [BashPitfalls](https://mywiki.wooledge.org/BashPitfalls)): reproduced on bash 5.2.15 (Debian 12) with `LC_ALL=C.UTF-8` reading `FOO\0\315\0\226\0`: output `<FOO> <$'\315'>` (third record lost); bash 4.4.23 and 5.3.20 return all three; `LC_ALL=C` or `LC_ALL= LC_CTYPE=C` fixes 5.2.15 (`FX/read-d-utf8.sh`). BashPitfalls: "There are no official patchlevels for releases prior to 5.3 that incorporate these changes."

BashPitfalls #47 (trailing empty field dropped by `IFS=, read`) is the POSIX field-terminator rule: all conformant shells do it; the extra-separator workaround is in the page.

**Read-loop templates** (all watched green, see Verification runs):

```sh
# text lines, POSIX, last line without a newline kept, child stdin guarded
while IFS= read -r line || [ -n "$line" ]; do
    some_cmd "$line" </dev/null
done < "$file"
# NUL-delimited names, bash >= 3.2 (needs read -d and process substitution); set LC_ALL=C on bash 5.0-5.2
while IFS= read -r -d '' f; do some_cmd "$f"; done < <(find . -type f -print0)
# NUL-delimited names, POSIX sh (no read -d): let find batch
find . -type f -exec sh -c 'for f in "$@"; do some_cmd "$f"; done' _ {} +
```

### 9. Test operators per dialect

`FX/test-pins.sh`; T = true, F = false, En = error status n. POSIX.1-2024 test: "The -a and -o binary primaries and the '(' and ')' operators have been removed", replace with `test expr1 && test expr2` ([test](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/test.html)); `-ef/-nt/-ot` were added (Austin Group defect 375); the `[[ ]]` command is not in the shell language.

| Probe | dash | ash x2 | mksh | ksh93 x2 | yash | posh | bash --posix 3.2 / 5.2 | bash 3.2 / 4.0 / 4.2+ | zsh sh-mode | zsh native |
|---|---|---|---|---|---|---|---|---|---|---|
| `[ a == a ]` | E2 | T | T | T | T | E2 | T | T | T | **error** `zsh:1: = not found` (5.0.8-5.9) |
| `[ -n a -a -n b ]` | T | T | T | T | T | T | T | T | T | T |
| `x='!'; y=''; [ "$x" -a "$y" ]` | E2 | E2 | F | T | F | E2 | F | F | F | F |
| `[ -v x ]` | E2 | E2 | T | T | E2 | E2 | E2 / T | E2 / E2 / T | T | E2 on 5.0.8, T on 5.3.1+ |
| `[ a \< b ]` | T | T | T | T | T | E2 | T | T | E2 | E2 (5.3.1+) |
| `e=; [ -n $e ]` (unquoted) | T | T | T | T | T | T | T | T | T | T (SC2070 error) |
| `[ abc -eq 0 ]` | E2 | E2 | **T** | **T** | E2 | F | E2 | E2 | E2 | E2 |
| `[[ abc == a* ]]` | E127 | **E2** | T | T | T | E127 | T | T | T | T |
| `[[ 10 < 9 ]]` (lexicographic) | E2 | F | T | T | T | F | T | T | T | T |

Reading the table: `==` is not portable to dash/posh and is an error in native zsh; `-a/-o` give different answers whenever an operand is `!`, `(` or empty (POSIX's own warning), so rewrite as `[ a ] && [ b ]`; `-v` needs bash 4.2+ and zsh 5.3.1+ (use `[ -n "${x+x}" ]` in sh, SC3016); `[ abc -eq 0 ]` is TRUE in mksh and ksh93u+m because the operand is evaluated as arithmetic (the same mechanism as section 10); busybox ash has `[[ ]]` but not glob matching (SC2330: "BusyBox `[[ .. ]]` does not support glob matching. Use a case statement").

ShellCheck on `FX/pe-lint.sh` under `-s sh`: SC3014 (`==`), SC2166 (`-a`, warning in both sh and bash), SC3016 (`-v`), SC3010 (`[[`), SC3015 (`=~`), SC3011 (`<<<`), SC3045 (`read -d`), SC3034 (`$(<file)`), SC3009 (`{1..3}`), SC3057/SC3059/SC3060 (string ops); the same under `-s dash` are errors.

`[[ ]]` vs `[ ]` is decided by the dialect (map M-C-09): `[[` for `#!/usr/bin/env bash` targets and Google's recommendation; `[` plus `case` for `#!/bin/sh`. `-o all` SC2292/`require-double-brackets` is an optional style check and is not part of the contract.

### 10. Arithmetic: portability and injection

**Portability** (`FX/arith-pins.sh`, `FX/tenhash.sh`; POSIX requires "only signed long integer arithmetic" and decimal/octal/hex constants, no `++`, no `**`: [POSIX XCU 2.6.4](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html); bash: "Constants with a leading 0 are interpreted as octal", `[base#]n`, "no check for overflow" ([bashref](https://tiswww.case.edu/php/chet/bash/bashref.html), Shell Arithmetic)):

| Expression | dash | ash x2 | mksh | ksh93 x2 | yash | posh | bash 3.2-5.3 | zsh sh-mode | zsh native |
|---|---|---|---|---|---|---|---|---|---|
| `$((010))` | 8 | 8 | **10** | **10** | 8 | 8 | 8 | 8 | **10** |
| `$((08))` | error | error | 8 | 8 | 8 | error | error | error | 8 |
| `x=08; $((x+1))` | error | error | 9 | 9 | 9 | error | error | error | 9 |
| `$((10#08))` | **error** | 8 | 8 | 8 | **error** | 8 | 8 | 8 | 8 |
| `$((2**3))` | **error** | 8 | **error** | 8 | **error** | **error** | 8 | 8 | 8 |
| `i=1; $((i++))` | **error** | `1 2` | `1 2` | `1 2` | `1 2` | `1 2` | `1 2` | `1 2` | `1 2` |
| `$((9223372036854775807 + 1))` | wraps to -2^63 | wraps | **0 (32-bit)** | **float 9.22e+18** | wraps | wraps | wraps | wraps | wraps |
| `$((2147483647 + 1))` | 2147483648 | same | **-2147483648** | same | same | same | same | same | same |
| `$((1/0))` | error | error | error | error | error | error | error | error | error |

Zero-padded external input (months, days, versions): `10#` is the bash/ksh fix but is missing in dash and yash. A POSIX fix that ran identically on all 11 shells strips the zeros first (`FX/lead0.sh`): `y=${x#"${x%%[!0]*}"}; y=${y:-0}; echo $((y + 1))` gives `008->9 08->9 0->1 000->1 010->11 7->8` on all 11. BashPitfalls #59: `10#$i` fails for a signed value: reproduced on bash 3.2 (`10#-08: value too great for base`) and 5.3 (`10#: invalid integer constant`); the Wooledge form `$(( ${i%%[!+-]*}10#${i#[-+]} ))` returns -8 on both.

**Injection** (map M-E-03; BashPitfalls #45, #46, #61, #62; [ShellCheck #2679](https://github.com/koalaman/shellcheck/issues/2679), "Warn about the use of unvalidated input in arithmetic contexts", open, opened 2023-02-01): bash evaluates a variable's value as an arithmetic expression when it is referenced (bashref: "The value of a variable is evaluated as an arithmetic expression when it is referenced"), and an array subscript `a[...]` inside it undergoes command substitution. Plant (d), `x='a[$(touch PWNED)]'`:

- `FX/arith-red.sh` (`(( x > 1 ))`): PWNED created, exit 1 on bash 3.2, 4.0, 4.2, 4.4, 5.0, 5.1, 5.2, 5.3 (8 of 8).
- `FX/arith-inject.sh` per-context probes, bash 3.2-5.3 identical: HIT in `(( x > 1 ))`, `$((x+1))`, `$(($x+1))`, `[[ $x -gt 1 ]]`, `let "y = x + 1"`, `arr[$x]` index, `declare -i y; y=$x`; ok in `[ "$x" -gt 1 ]` and `printf %d`.
- `FX/arith-inject-sh.sh` (POSIX contexts): HIT for `$((x + 1))` and `$(($x + 1))` in mksh R59c, posh 0.14.1, bash 3.2 --posix and bash 5.2 --posix; `[ "$x" -gt 1 ]` also HIT in mksh and posh; no hit in dash, ash x2, ksh93u+m x2, yash, zsh sh-mode. zsh native 5.0.8-5.9: no hit in 7 contexts (`FX/zsh-arith.sh`). The result is specific to this payload; other payloads were not tried.
- Twin `FX/arith-inject-ok.sh` (validate with `case $x in '' | *[!0-9]*) reject ;; *) (( x > 1 )) ;; esac` first): `rejected non-numeric: a[$(touch PWNED)]`, no file, `RESULT green`, exit 0 on bash 3.2-5.3.
- ShellCheck is silent: `shellcheck -o all` on `FX/arith-red.sh` and on the `getopts` script from issue 2679 (`FX/arith-getopts.sh`) reports only SC2016 (the single-quoted payload) and SC2250; no arithmetic code exists. This verification did NOT go red.

### 11. Here-docs, command substitution, `$'..'`

`FX/cmdsub-pins.sh`, 11 shells unless noted:

- Command substitution strips ALL trailing newlines (`x=$(printf 'a\n\n\n')` gives `a` everywhere); the sentinel `x=$(cmd; printf x); x=${x%x}` keeps `a\n\n\n` everywhere (BashPitfalls #41).
- `$'a\tb'`: dash 0.5.12, yash 2.52 and posh 0.14.1 print the literal `$a\tb` (the `$` is a plain character and the rest is single-quoted); ash x2, mksh, ksh93 x2, bash, zsh interpret it. POSIX.1-2024 requires `$'..'` (quote removal text in XCU 2.6.7 mentions `<dollar-sign> single-quote`) but dash 0.5.12 does not yet. ShellCheck: SC3003 under `-s sh`.
- `$(<file)` is supported by mksh, ksh93, bash, zsh and is silently the EMPTY STRING in dash, ash x2, yash and posh (`FX/pe-pins.sh`); SC3034 under `-s sh`.
- Unquoted here-doc delimiter: `$v`, `` `cmd` `` and `\` are processed; quoted (`<<'EOT'`) is literal; `<<-` strips leading TABS only (all 11 identical). Backtick nesting `` echo `echo \`echo hi\`` `` works everywhere but is why `$()` is preferred (SC2006 style).
- `$(<file)` and `$'..'` inside a here-doc follow the same rules as outside it (`FX/cmdsub-pins.sh`, `heredoc-sq-in`).

### 12. Globs: unmatched patterns, dot files, brace expansion

**Unmatched patterns** (`FX/glob-pins.sh`, `FX/glob-opts.sh`, `FX/glob-opts.zsh`):

| Shell | `echo *.zzz` (no match) |
|---|---|
| all 11 POSIX-mode shells, bash 3.2-5.3 | the literal `*.zzz`; `for f in *.zzz` runs once with the literal |
| bash `shopt -s nullglob` | empty; loop never runs; but `ls *.zzz` becomes plain `ls` and lists the cwd (measured) |
| bash `shopt -s failglob` | `line 7: no match: *.zzz`, command not run, status 1 |
| zsh native 5.0.8-5.9 | `no matches found: *.zzz` aborts (NOMATCH, [zsh Options](https://zsh.sourceforge.io/Doc/Release/Options.html): "print an error, instead of leaving it unchanged"); `*.zzz(N)` or `setopt nullglob` gives empty; `setopt nonomatch` gives the literal |
| fish 3.6.0-4.9.3 | `No matches for wildcard '*.nomatchzzz'` error |

**Dot files (M-E-08).** `echo .*` in a directory holding `.hidden` and `visible`:

| Shell | result |
|---|---|
| dash 0.5.12, busybox ash 1.35, 1.37, yash 2.52, bash 3.2, 4.0, 4.2, 4.4, 5.0, 5.1 | `. .. .hidden` (matches `.` and `..`) |
| mksh R59c, ksh93u+m x2, posh 0.14.1, bash 5.2, 5.3, zsh (all) | `.hidden` |

The bash change is `globskipdots`: "forces pathname expansion never to return `.` or `..` unless explicitly matched. It is enabled by default" (bash 5.2 [NEWS](https://tiswww.case.edu/php/chet/bash/NEWS) item aa; [bashref](https://tiswww.case.edu/php/chet/bash/bashref.html): "This option is enabled by default"). POSIX.1-2024 still allows both: "if directory entries for dot and dot-dot exist, they may be ignored", and a Note says a future version "may require" ignoring them (XCU 2.14.3). So `rm -rf .*` is only safe where `rm` itself refuses `.`/`..`; GNU rm does. Other implementations were not exercised (an `rm` on `..` could delete the parent): unverified, not run. The portable enumeration of dot files is `.[!.]* ..?*` with an existence guard (`FX/glob-pins.sh` prints `[.hidden]` and the literal `[..?*]` that the guard must skip), or `find . -mindepth 1 -maxdepth 1` (GNU/busybox; `-mindepth` is not POSIX).

**Brace expansion (M-C-14).** Plant (f), `FX/brace.sh` (`for i in {1..3}`, `echo x{a,b,c}y`):

| Shell | `{1..3}` loop | `x{a,b,c}y` |
|---|---|---|
| dash, ash x2, yash, posh, zsh sh-mode | 1 iteration, `$i={1..3}` | literal `x{a,b,c}y` |
| mksh R59c | 1 iteration | expands |
| ksh93u+m x2, bash 3.2 --posix, bash 5.2 --posix | 3 iterations | expands |

So the loop runs once with the literal in 7 of 11 shells (the map's number, reproduced). In bash itself: `{01..03}` gives `1 2 3` on 3.2 and `01 02 03` from 4.0; the step form `{1..7..3}` is a literal on 3.2 and `1 4 7` from 4.0; `{1..$n}` is NOT expanded in any bash (SC2051) but is in zsh (`1 2 3`) (`FX/brace-bash.sh`). Twin `FX/brace-green.sh` (POSIX `while [ "$i" -le 3 ]` counter): `loop-ran=3` on all 11, and shellcheck exits 0. ShellCheck: SC3009 twice on the red plant under `-s sh` ([SC3009 wiki](https://www.shellcheck.net/wiki/SC3009): "`$i` expands to `{1..5}`. It does **not** expand to the sequence").

fish does not expand `{1..3}` either (prints the literal) and fails on `$?` with a parse error in 3.6.0-4.9.3 (`FX/fish-pins.fish`).

### 13. String operations available in sh

`FX/pe-pins.sh` (probe `p` prints the value or `ERR(status)`):

| Form | dash | ash x2 | mksh | ksh93 | yash | posh | bash 3.2 | bash 4.0+ | zsh |
|---|---|---|---|---|---|---|---|---|---|
| `${x#p}` `${x%p}` `${#x}` `${y:-d}` | ok | ok | ok | ok | ok | ok | ok | ok | ok |
| `${x//./-}` | ERR | ok | ok | ok | ok | ERR | ok | ok | ok |
| `${x:0:1}` | ERR | ok | ok | ok | ERR | ERR | ok | ok | ok |
| `${x,,}` `${x^^}` | ERR | ERR | ERR | ERR | ERR | ERR | ERR | ok (4.0+) | ERR (5.0.8-5.9) |
| `${x/#he/HE}` | ERR | **silently unchanged** (`hello`) | ok | ok | ok | ERR | ok | ok | ok |
| `${x@Q}` | ERR | ERR | ok | ERR | ERR | ERR | ERR | ok (4.4+) | ERR |

busybox ash silently ignores `${x/#he/HE}` (returns the input unchanged, no error) in both 1.35 and 1.37: the failure is invisible. ShellCheck under `-s sh`: SC3060 (`//`, `/#`), SC3057 (`:0:1`), SC3059 (`,,` and `^^`); it emits nothing for `${x@Q}` (measured, `FX/dotglob-lint.sh`), so that form is only caught by a grep or by running dash.

### 14. Destructive commands and the Steam incident

[ValveSoftware/steam-for-linux#3671](https://github.com/ValveSoftware/steam-for-linux/issues/3671) (opened 2015-01-14, "Moved ~/.local/share/steam. Ran steam. It deleted everything on system owned by user."): the reporter's analysis quotes `Line 468: rm -rf "$STEAMROOT/"*` and "could be evaluated as `rm -rf "/"*` if `$STEAMROOT` is empty". The incident is the origin of ShellCheck SC2115, whose wiki page links it ([SC2115](https://www.shellcheck.net/wiki/SC2115): "Use `"${var:?}"` to ensure this never expands to `/*`").

Plant (e) with `rm` shimmed to print its argv, so nothing is deleted (`FX/destructive-red.sh`, `FX/destructive-green.sh`):

```sh
root=
rm -rf "${root}/"*            # RED, all 11 shells: WOULD-RUN: rm -rf /bin /boot /dev /etc /home /lib /lib64 ... /usr /var   (exit 1)
rm -rf "${root:?root is empty}/"*   # GREEN: aborts; status 2 in dash/ash/yash, 1 in mksh/ksh93/posh/bash/zsh (exit 0 verdict)
```

`${v:?}` in a non-interactive shell exits the shell; the twin wraps it in a subshell to observe the status. SC2115 on `FX/destructive-lint-red.sh` (never executed, `-s sh`): warning on `rm -rf "${root}/"*`, `rm -rf "$root"/*`, `rm -rf "$root/"`, `rm -rf "$root/$sub"`; silent on `"${root:?}/"*` and `-- "${root:?}"/*`; `cd "$root"` followed by `rm -rf *` gives SC2164 (warning) and SC2035 (info), and a bare `rm -rf *` is not an SC2115 case. At `-S warning` SC2115 and SC2164 survive. A grep check is only a coarse net (it also hits `trap 'rm -rf "$w"' EXIT`, which is a real unguarded-variable case): see the RMVAR grep.

### 15. Extra parsers: ssh, `sh -c`, QuoteBench

[QuoteBench](https://arxiv.org/abs/2608.13547) (arXiv 2608.13547, submitted 2026-08-13): 56 one-shot Bash tasks in 14 operation families, "incident-derived"; "replaying the same reply through the added parser lowers success by 55.4 to 73.2 percentage points; disclosure recovers 30.4 to 60.7 points for six configurations"; and across failing executions "23.4-47.0% exit zero while leaving the wrong final state" (HTML version, section 3.1), so "a benchmark that trusts return codes would silently miss up to half of these failures". The paper's added-parser examples are `ssh host "..."`, `docker exec sh -c "..."` and a CI `run:` step.

`FX/parsers-red.sh` emulates ssh exactly as documented (ssh joins its arguments with spaces and hands the string to the remote shell; the shim is `ssh() { shift; sh -c "$*"; }`) with `file='a b;touch PWNED'`:

```sh
ssh host "touch $file"       # RED: remote sees: touch a b;touch PWNED   -> files=3 pwned=yes, all 11 shells, exit 1
ssh host touch "$file"       # same: ssh re-joins the argv
sh -c "touch $file"          # same
# GREEN FX/parsers-green.sh, value "it's a b;touch PWNED": 1 file, no PWNED, exit 0 on all 11
q() { printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"; }     # POSIX single-quote quoter
ssh host "touch -- $(q "$file")"
sh -c 'touch -- "$1"' _ "$file"                                     # no re-parse: the value travels as $1
find . -type f -exec sh -c 'test -f "$1"' _ {} \;                   # same shape; SC2156 fires on '{}' inside the -c string
```

ShellCheck: SC2029 (info, "Note that, unescaped, this expands on the client side") fires on BOTH plants, including the correctly quoted `ssh host "touch -- $(q "$file")"`; the wiki says to ignore it when client-side expansion is intended and to add `printf %q`-style escaping ([SC2029](https://www.shellcheck.net/wiki/SC2029)). It therefore cannot be the verification on its own: this verification did not discriminate (exit 1 on both). SC2156 (warning) fires on `find -exec sh -c "echo {}"`.

The reading heuristic from the map: count the parsers between the author and `exec` (local shell, then ssh's remote shell, then `sh -c`, then a YAML/workflow expression); every boundary needs one quoting layer, or the value must travel as a positional/stdin/env value instead.

### 16. Option parsing: getopts and GNU getopt

- `getopts` is POSIX ([getopts](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/getopts.html): OPTIND initialised to 1, no long options). All 11 shells parsed `-a 'x y' -v -- file one` to `a=[x y] v=1 rest=[file one]`, stop at the first operand (`file -v` leaves `-v` in the rest), and treat `--long` as an error; the error TEXT differs per shell (`FX/getopts-pins.sh`), so scripts must not parse it. Reset `OPTIND=1` before a second parse inside a function.
- GNU-style `getopt` (`getopt -o a:b -l alpha:,beta -- ...`): `getopt -T` returns 4 and long options work on util-linux (ubuntu:24.04, shellzoo:deb12) AND on busybox 1.37 (`alpine:3.22` `/bin/getopt -> /bin/busybox`, and `busybox:1.37`: `getopt -o a:b -l alpha:,beta -- -a 1 --beta x` prints ` -a '1' --beta -- 'x'`, rc 0). The map's claim "missing on busybox" does not hold for 1.37 (measured). macOS/BSD `getopt` is an old non-enhanced one: unverified: read only.
- Exemplars use `getopts` (rustup `rustup-init.sh:152` `while getopts :hqy sub_arg "$arg"`); the fleet has 0 GNU `getopt` uses (`FX/fleet-census.sh`).

### 17. Variable names that collide with shell specials

- zsh ties lowercase names to uppercase specials and makes some read-only: `path=/x:/y` sets `PATH=/x:/y`; `status=1` fails with `read-only variable: status`; `local path=/z` in zsh 5.9 leaves `ls` not found (`command -v ls` prints nothing, `ls rc=127`), and on 5.0.8 errors with `local: path: can't assign initial value for array` (`FX/varnames.zsh`). The grep `ZSHVARS2` catches `local path=`, `status=`, `fpath=`, `cdpath=`, `argv=` in `*.zsh` files.
- bash: `UID=5` is `readonly variable`; `GROUPS=5` is silently ignored on 3.2 and 5.3; `RANDOM=42` reseeds; `SECONDS=100` and `LINENO=5` are assignable (`FX/varnames.bash`). UPPER_CASE names are the environment/special namespace: keep script variables lowercase in bash/sh, and in zsh avoid the lowercase specials above (`path`, `status`, `argv`, `pipestatus`, `fpath`, `cdpath`, `manpath`).

### 18. The `-S warning` chase: what the fleet gate misses

- `ocx/taskfiles/shell.taskfile.yml:30-38`: `FILES` is `git ls-files {{.SHELL_GLOB}} | tr '\n' ' '` and the command is `shellcheck -S warning {{.FILES}}` (`ocx@5de9d777eb7d`). The comment at `ocx/taskfiles/ci.taskfile.yml:20` calls it "the shell subsystem's `shellcheck -S warning` floor". `setup-grimoire@1259e35b2550:Taskfile.yml:25-26` also uses `-S warning`; `www-setup` and `grimoire` use the default severity (grimoire: `echo "$files" | xargs shellcheck`, `grimoire@4650ad830375:taskfiles/shell.taskfile.yml:10-18`).
- Measured on the exact ocx gate file set (123 NUL-separated paths from the same `git ls-files` pathspec, `FX/ocx-files.nul`): `-S warning` exit 0, 0 findings; default severity: 20 findings in 9 files, all info: SC1091 x8, SC2016 x6, SC2012 x5 (`.github/actions/bazel-cache-rc/selftest.sh:189,201,232,376,460`), SC2015 x1 (`selftest.sh:478`, the `A && B || C` of BashPitfalls #22). Zero SC2086 and zero SC2115 in ocx today.
- Fleet-wide, from [fleet] #7 (521 findings; authored 65, research scratch 263, vendored 193): warning-or-error findings are 8 + 60 + 49 = 117, so `-S warning` hides 404 (78%); all 278 SC2086 are info. Authored: 44 info + 13 style + 8 warning. The exposure is therefore prospective for ocx (clean today) and real for repos with no gate or a different one.
- The gate defects found while reading: ocx joins the file list with `tr '\n' ' '` into an unquoted `{{.FILES}}`; grimoire pipes `echo "$files"` into `xargs shellcheck`. Reproducer `FX/gate-xargs.sh` (a file named `my script.sh` with a real SC2086): the grimoire shape prints `./my: ... openBinaryFile: does not exist` and `script.sh: ... does not exist`, exit 123, and never analyses the file; `find -print0 | xargs -0 -r shellcheck` reports `my script.sh:2:6: note: ... [SC2086]`. ocx has 0 tracked paths containing a space, so the defect is latent there. grimoire also exits 0 with "shellcheck not installed - skipping" ([cfg] §6), i.e. fails open.

### 19. Defects reported, not fixed (owner Q6)

| Where | Defect | Reproducer |
|---|---|---|
| `ocx@5de9d777eb7d:taskfiles/shell.taskfile.yml:37-38` | `-S warning` hides SC2086/SC2162/SC2035/SC2059/SC2028/SC2012/SC2029; space-joined unquoted file list | `FX/split-red.sh` under `SC -S warning`; `FX/gate-xargs.sh` |
| `setup-grimoire@1259e35b2550:Taskfile.yml:25-26` | same `-S warning` | same |
| `grimoire@4650ad830375:taskfiles/shell.taskfile.yml:10-18` | `echo "$files" \| xargs shellcheck` breaks on spaces; skip-if-missing exits 0 | `FX/gate-xargs.sh` |
| `ocx@5de9d777eb7d:test/scenarios/offline/reinstall-after-purge.sh:22` | `rm -rf "$OCX_HOME/packages"` unguarded; bounded by the suffix (empty value gives `/packages`) and by `set -u`, so low risk, but `${OCX_HOME:?}` costs nothing | SC2115 does not fire here (it targets `$v/` and `$v/*`) |
| `k3s-io/k3s@82a6ddcd820b:install.sh:408` (exemplar) | `for i in {1..3}` under `#!/bin/sh` runs once | `FX/brace.sh` |

### 20. Other shells in one table: zsh, fish, nushell, PowerShell

| Topic | Fact (measured unless marked) |
|---|---|
| zsh word splitting | `x='a b  c'; for i in $x` runs 1 iteration; `${=x}` runs 3; `emulate -L sh` restores 3 (zsh 5.0.8, 5.3.1, 5.8, 5.9; `FX/zsh-split.zsh`; SH_WORD_SPLIT is off by default: [zsh Options](https://zsh.sourceforge.io/Doc/Release/Options.html) "Causes field splitting to be performed on unquoted parameter expansions") |
| zsh `=` expansion | the word `==` is parsed as `=cmd` expansion (EQUALS option), hence `[ a == a ]` errors with `= not found` |
| fish 3.6.0, 4.0.2, 4.7.0, 4.9.3 | no splitting of `$x`; `(cmd)` splits on newlines only; `{1..3}` stays literal; unmatched wildcard is an error; `$?` is a PARSE error that kills the whole file with exit 127; `echo -e`/`echo -n` work |
| nushell 0.105.1 and 0.116.0 | `let-env`, `def-env`, `str collect`, `str find-replace` all fail the same way on both versions (`assignment_requires_variable`, `External command failed`, `extra_positional`); the current forms `$env.FOO = 1`, `def --env`, `str join`, `str replace` work on both (`FX/nu-names.sh`) |
| pwsh single quotes | a curly quote U+2019 inside `'it's'` closes the literal on 5.1, 7.4 and 7.6.6 ([about_Quoting_Rules](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_quoting_rules?view=powershell-7.6): "PowerShell treats smart quotation marks ... as normal quotation marks") |
| pwsh 7-only syntax on 5.1 (`FX/ps-quote.ps1`, Windows PowerShell 5.1.26100.9444) | `??`, `? :`, `&&`/`\|\|` pipeline chains: parse errors; `Join-String`, `ConvertFrom-Json -AsHashtable`, `ForEach-Object -Parallel`: not recognised / parameter not found; `` "`u{1F600}" `` yields the literal `u{1F600}` silently; all work on 7.4.7 and 7.6.6 |

## Normative guidance candidates

Each rule has: the rule, the rationale, how a reviewer verifies it, and whether that verification was run against a planted violation. `FX` is the fixture directory. "Output is the violation; empty output (exit 1) = pass" applies to every grep.

**SH-EXP-01 Quote every expansion.** `"$v"`, `"$(cmd)"`, `"$@"`, `"${a[@]}"`, `"${a[*]}"` only when joining is intended; unquoted only for the exceptions in SH-EXP-03.
- Why: splitting and globbing apply to every unquoted expansion; top bug class (12 of 65 BashPitfalls, 183 of 278 research-scratch findings).
- Verify: `shellcheck` at DEFAULT severity with `-s sh|bash` set by shebang or `# shellcheck shell=`; codes SC2086 (info), SC2046, SC2048, SC2206, SC2207 (warning), SC2068, SC2070, SC2045 (error). Never `-S warning`.
- Run: yes (`FX/split-red.sh`: SC2045, SC2086, SC2035; `FX/sc-red.bash`: 30 codes; twin `FX/split-green.sh` and `FX/sc-green.bash` exit 0 at `-S warning`, exit 1 only on SC2029 at default severity).

**SH-EXP-02 The lint gate runs at default severity.** `shellcheck FILES` with no `-S`; pass files NUL-separated (`git ls-files -z | xargs -0 -r shellcheck`).
- Why: `-S warning` hides SC2086/SC2162/SC2035/SC2059/SC2028/SC2012/SC2029 (78% of fleet findings); `echo "$files" | xargs` breaks on spaces.
- Verify: `grep -rn -e 'shellcheck.* -S warning' -e 'shellcheck.* -S error' -e 'shellcheck.*--severity=warning' -e 'shellcheck.*--severity=error' --include='*.yml' --include='*.yaml' --include='*.sh' DIR` (output is the violation).
- Run: yes (`FX/greps/run-greps.sh` SEVERITY: red on `red/Taskfile.yml:3,5`, exit 1 empty on green; real hits `ocx@5de9d777eb7d:taskfiles/shell.taskfile.yml:38`, `setup-grimoire@1259e35b2550:Taskfile.yml:25,26`); the effect itself: `FX/split-red.sh` under `-S warning` loses SC2086 and SC2035.

**SH-EXP-03 Deliberate splitting only through a sanctioned idiom.** Allowed: bash array; POSIX `set --`; `cmd ${v:+--flag} ${o:+-o "$o"}`; `set -f; IFS=,; set -- $list; IFS=$old; set +f` with `# shellcheck disable=SC2086 # set -f active`.
- Why: these four keep one argument per value; SC2086 does not model `set -f`.
- Verify: SC2086 plus a reviewer check that every `disable=SC2086` names its reason.
- Run: yes (`FX/argv-alt.sh`, `FX/split-idiom.sh` red `4 [a file1 file2 c]` vs green `3 [a * c]` on all 11; SC2086 still fires on the twin: confirmed).

**SH-EXP-04 Build argv with an array (bash) or `set --` (sh); never a string plus `eval`, never `$cmd` to run a string.**
- Why: a string re-parses every value (`name='a b; touch PWNED #'` executed the injected command on 11 of 11 shells).
- Verify: `grep -rnw -e eval --include='*.sh' DIR` (ShellCheck has no code for `eval "$string"` or `$cmd`; SC2294 only covers `eval "${arr[@]}"`/`"$@"`); `SC2294`; `SC2086` on `cmd $opts`.
- Run: yes (`FX/argv-red.sh` exit 1 on 11/11, `FX/argv-green.sh` exit 0 on 11/11; ShellCheck on the red plant exit 0 = did not go red; grep EVAL red/green).

**SH-EXP-05 `eval` only as `eval "$(trusted-emitter ...)"`.** Never on a variable, an argument, a file read, or any string a user can influence; use `declare -n`/`printf -v`/`read` for dynamic names.
- Why: Google "eval should be avoided"; the one fleet idiom is an emitter output.
- Verify: same grep as SH-EXP-04, then a reading check that the operand is `"$( trusted command )"`.
- Run: yes (grep); reading heuristic for the second step.

**SH-EXP-06 Empty-array safe expansion on bash < 4.4.** Under `set -u` in a script whose floor is bash 3.2, write `${a[@]+"${a[@]}"}`; from a 4.4 floor `"${a[@]}"` is fine.
- Why: `"${a[@]}"` on an empty array aborts on bash 3.2, 4.0, 4.2.
- Verify: `M bash FX/argv-array.sh` (exit 1 on 3.2/4.0/4.2 for the bare form, exit 0 for `FX/argv-array-guard.sh` on all 8 versions).
- Run: yes.

**SH-EXP-07 Hostile filenames: `./*` or `--`, quoted, with an existence guard; never parse `ls` or iterate `$(find ...)`.** `for f in ./*; do [ -e "$f" ] || continue; cmd -- "$f"; done`.
- Why: leading `-`, spaces, newlines, glob characters; unmatched globs stay literal.
- Verify: ShellCheck SC2035 (info), SC2045 (error), SC2044, SC2038, SC2010 (warning), SC2012 (info); `grep -rn -e '\$(ls' -e 'in `ls' --include='*.sh' DIR`.
- Run: yes (`FX/split-red.sh` red 11/11, `FX/split-green.sh` green 11/11; `FX/readloop-red.sh` sees 7 of 5; greps LS red/green).

**SH-EXP-08 NUL-safe file pipelines.** `find ... -print0 | xargs -0 -r cmd --` or `find ... -exec cmd -- {} +`; every `xargs` has `-0` or a comment saying why not, and `-r`.
- Why: `xargs` without `-0` mis-splits on quotes and spaces; without `-r` it runs once on empty input (GNU and busybox 1.37).
- Verify: `grep -rn -e 'xargs [^-]' -e 'xargs -[^0]' -e 'xargs$' --include='*.sh' DIR`.
- Run: yes (`FX/greps` XARGS red/green; `FX/find0.sh` on alpine, busybox:1.37, ubuntu:24.04, deb12). BSD/macOS xargs: unverified: read only.

**SH-EXP-09 echo only for a fixed literal with no leading `-` and no backslash; everything else `printf '%s\n' "$v"`; never `echo -e`, `echo -n`, `echo -E`.** Conflict 19 confirmed.
- Why: `\t` is interpreted by dash/mksh/yash/posh/native zsh and not by ash/ksh93/bash/zsh-sh; `-e` is printed by dash/yash/posh and honoured by the rest; `-n` is printed by yash; a data value of `-n`/`-e` vanishes in 9 of 11 shells.
- Verify: `shellcheck -s sh` SC3037 (warning), `-s dash` SC3036 (error), SC2028 (info, `echo 'a\tb'`); `grep -rn -e 'echo -[eEn]' --include='*.sh' DIR`. Neither detects `echo "$v"` of hostile data: reading heuristic.
- Run: yes (`FX/echo.sh` differential across 11; `FX/echo-printf.sh` one output; SC codes and grep red, twin exit 0).

**SH-EXP-10 printf: constant format, data via `%s`; `%b` only on self-authored strings; no `%n$`, no `%q`, no float/`%d` of external text in sh.**
- Why: `printf "$v"` is an error or format bug everywhere except ksh93u+m; `%n$` works only in ksh93/zsh; `%q` differs per shell; `%d 010` is 8 or 10.
- Verify: SC2059 (info), SC3050 (`%q`, warning under `-s sh`); reading heuristic for `%n$`.
- Run: yes (`FX/printf-pins.sh` on 11 + bash/zsh native; SC2059 on `FX/sc-red.bash`).

**SH-EXP-11 Read loops use a template.** Lines: `while IFS= read -r line || [ -n "$line" ]; do ...; done < file`; NUL names in bash: `while IFS= read -r -d '' f; do ...; done < <(find ... -print0)` with `LC_ALL=C` on bash 5.0-5.2; in sh use `find -exec sh -c '... "$1"' _ {} +`. A child that reads stdin in the loop gets `</dev/null`.
- Why: `read` without `-r` eats backslashes; the last line without a newline is dropped; `read -d` is absent in dash/yash/posh; `ssh`/`cat`/`ffmpeg` steal the loop's input.
- Verify: SC2162 (info); `shellcheck -s sh` SC3045; reading heuristic for the `|| [ -n "$line" ]` and stdin guard; matrix run.
- Run: yes (`FX/read-pins.sh` 11 shells, `FX/readloop-green.bash` 8 bash versions, `FX/readloop-posix.sh` 11 shells, `FX/read-d-utf8.sh` on bash 5.2.15/4.4/5.3).

**SH-EXP-12 Do not feed a pipeline into `while read` when variables must survive.** Redirect from a file/here-doc, or `< <(cmd)` in bash; `shopt -s lastpipe` only in non-interactive bash >= 4.2 scripts that state it.
- Why: only ksh93u+m keeps pipeline-stage assignments natively.
- Verify: SC2030/SC2031 (info); `M bash FX/pipe-scope.sh`.
- Run: yes.

**SH-EXP-13 In `#!/bin/sh` scripts use only: `[ ]`, `=`, `-n/-z/-e/-f/-d`, `&&`/`||` between tests, `case`, `${x#}`/`${x%}`/`${#x}`/`${x:-}`, `printf`, `$(cmd)`; no `==`, `-a`, `-o`, `-v`, `[[`, `<<<`, `read -d`, `$(<file)`, `$'..'`, `${x//}`, `${x:0:1}`, `${x,,}`, `${x@Q}`, arrays, `{a..b}`, `**`, `++`.**
- Why: each is an error or silent wrong answer in at least one of dash/ash/yash/posh (measured tables above).
- Verify: `shellcheck -s sh` (or `-s dash`): SC3003, SC3006, SC3009, SC3010, SC3011, SC3014, SC3015, SC3016, SC3018, SC3019, SC3028, SC3030, SC3034, SC3045, SC3050, SC3057, SC3059, SC3060, SC2166; plus `grep -rn -e '@Q' --include='*.sh' DIR` for the one uncovered form; plus a run on `M posix`.
- Run: yes (`FX/sh-bashisms.sh`, `FX/pe-lint.sh`: 22 distinct SC3xxx/SC2113 codes; `FX/pe-pins.sh` shows `@Q` with no code).

**SH-EXP-14 In bash/zsh files use `[[ ]]` with a quoted RHS for literal compare and an unquoted RHS for globs; `=~` RHS in a variable or unquoted; never `[ a == b ]` in zsh.**
- Why: `[ a == a ]` is an error in native zsh 5.0.8-5.9; busybox `[[` has no glob matching (SC2330); `[[ 10 < 9 ]]` is lexicographic.
- Verify: SC2076 (warning), SC2330, SC2254; for zsh files no lint exists (SC1071): grep `-e '\[ [^]]* == '` over `*.zsh`.
- Run: yes (`FX/test-pins.sh` bash/zsh/posix; grep EQEQ red/green).

**SH-EXP-15 Never let untrusted text reach arithmetic.** No external value inside `$(( ))`, `(( ))`, `let`, `declare -i`, an array subscript, `[[ -eq ]]`, or (mksh/posh) `[ -eq ]`; validate first with `case $x in '' | *[!0-9]*) die ;; esac` (add a sign branch if needed), and write names without `$` inside `(( ))`.
- Why: `a[$(cmd)]` executes; bash 3.2-5.3 all affected.
- Verify: NO ShellCheck code exists (issue 2679 open). Hostile-value run: feed `a[$(touch PWNED)]` as every external input (argument, env, stdin line) and assert no file appears, checking FINAL STATE, not exit status; reading heuristic: "every `$((..))`/`((..))` operand is a literal, a loop counter, or passed a `case *[!0-9]*` check".
- Run: yes (`FX/arith-red.sh` exit 1 on bash 3.2-5.3; `FX/arith-inject-ok.sh` exit 0; shellcheck silent = did not go red).

**SH-EXP-16 Arithmetic portability: no `**`, `++`, `<<` on values >= 2^31, no `10#`, no leading-zero literals in sh; strip leading zeros with `${x#"${x%%[!0]*}"}`.**
- Why: `**` errors in dash/mksh/yash/posh; `++` errors in dash; `010` is 8 or 10; `08` errors in 5 shells; mksh wraps at 32 bits, ksh93 goes float; `10#` errors in dash/yash.
- Verify: SC3018 (`++`), SC3019 (`**`), SC3006; `M posix FX/arith-pins.sh`; `M posix FX/lead0.sh`.
- Run: yes.

**SH-EXP-17 No brace expansion in `#!/bin/sh`; in bash, ranges take literals only.**
- Why: `{1..3}` is one literal iteration in 7 of 11 shells; `{1..$n}` never expands in bash (SC2051).
- Verify: `shellcheck -s sh` SC3009; `grep -rn -e '{[0-9]*\.\.[0-9]*}' --include='*.sh' DIR` for files without a bash shebang; `M posix`.
- Run: yes (`FX/brace.sh` red, `FX/brace-green.sh` green + SC clean; grep BRACE).

**SH-EXP-18 Unmatched-glob handling is explicit.** sh/bash: `[ -e "$f" ] || continue`; bash `nullglob` only inside a function or subshell and never before a command that defaults to the cwd or stdin (`ls`, `cat`); zsh: `*(N)` or `setopt nullglob` or `NOMATCH` awareness; fish: expect an error.
- Why: literal in sh/bash, error in zsh/fish, `ls *.x` becomes `ls`.
- Verify: reading heuristic + `M posix|bash|zsh FX/glob-pins.sh`.
- Run: yes (matrix; no lint code exists).

**SH-EXP-19 Never `.*`.** Use `.[!.]* ..?*` with an existence guard, or `find . -mindepth 1 -maxdepth 1`; never feed `.*` to `rm`/`cp`/`chmod`.
- Why: `.` and `..` match in dash, ash x2, yash, bash <= 5.1.
- Verify: `grep -rn -e '[[:space:]]\.\*' --include='*.sh' DIR`; ShellCheck has no code; `M posix FX/glob-pins.sh`.
- Run: yes (grep DOTSTAR red on `rm -rf .*`, `for f in .*`, `cp -r .*`; green on `./.[!.]*` and `sed 's/.*//'`).

**SH-EXP-20 Destructive paths are guarded: `rm -rf -- "${dir:?}/..."`.** Any `rm`/`mv`/`chmod -R`/`find -delete` rooted at a variable uses `${v:?}`; `cd "$d" || exit` precedes relative deletes.
- Why: empty variable expands `"$v/"*` to `/*` in all 11 shells (Steam #3671).
- Verify: SC2115 (warning; survives `-S warning`), SC2164 (warning); `grep -rn -e 'rm -[a-zA-Z]* "\$[A-Za-z_]' -e 'rm -[a-zA-Z]* "\${[A-Za-z_0-9]*}' --include='*.sh' DIR` (coarse; hits `trap 'rm -rf "$w"'` too, which should also use `${w:?}`).
- Run: yes (`FX/destructive-red.sh` exit 1 / `-green.sh` exit 0 on 11/11 with `rm` shimmed; `FX/destructive-lint-red.sh` SC2115 x4, SC2164; grep RMVAR red/green).

**SH-EXP-21 Count the parsers; pass values as positionals or quote per layer.** `sh -c 'cmd "$1"' _ "$v"`, `find -exec sh -c '... "$1"' _ {} +`; for `ssh host`, `docker exec ... sh -c`, send the value quoted with a same-shell quoter or on stdin; never interpolate into a double-quoted `-c`/ssh string.
- Why: each parser re-splits; `a b;touch PWNED` created 3 files on 11/11; models lose 55-73 points through one added parser (QuoteBench).
- Verify: `grep -rn -e 'sh -c "' -e 'ssh [a-z]* "' --include='*.sh' DIR`; SC2029 (info, cannot discriminate), SC2156 (warning); hostile-value run asserting final state.
- Run: yes (`FX/parsers-red.sh` exit 1 / `-green.sh` exit 0 on 11/11; SC2029 fires on both = not admissible alone; grep SHC red/green).

**SH-EXP-22 Command-substitution newlines.** When trailing newlines matter use `x=$(cmd; printf x); x=${x%x}`; `$(<file)` only in bash/ksh/zsh/mksh (empty string in dash/ash/yash/posh).
- Why: all command substitutions strip trailing newlines; `$(<f)` silently empty in 4 shells.
- Verify: SC3034 under `-s sh`; reading heuristic for the sentinel.
- Run: yes (`FX/cmdsub-pins.sh`, `FX/pe-pins.sh`).

**SH-EXP-23 Generated text via quoted here-docs; no `$'..'` in sh.** `cat <<'EOT'` for literal text; `<<-` strips TABS only; `printf '%s\n'`/`printf '\t'` instead of `$'\t'` under `#!/bin/sh`.
- Why: `$'..'` prints literally in dash 0.5.12, yash 2.52, posh 0.14.1.
- Verify: SC3003; matrix run.
- Run: yes (`FX/cmdsub-pins.sh`, `FX/sh-bashisms.sh`).

**SH-EXP-24 Option parsing is `getopts` (short options) or a `case "$1"` loop with `--`; GNU `getopt` only behind `getopt -T; [ $? -eq 4 ]`.**
- Why: `getopts` is POSIX; enhanced getopt exists on util-linux and busybox 1.37, not necessarily on BSD/macOS (unverified: read only).
- Verify: `grep -rnw -e getopt --include='*.sh' DIR`.
- Run: yes (grep GETOPT red/green; `FX/getopt-probe.sh` on alpine:3.22, shellzoo:deb12, ubuntu:24.04, busybox:1.37).

**SH-EXP-25 Variable names: lowercase locals, no zsh/bash specials.** In zsh files never assign `path`, `status`, `argv`, `pipestatus`, `fpath`, `cdpath`, `manpath`; in bash never `UID`, `GROUPS`, `RANDOM`, `SECONDS`, `LINENO`.
- Why: `local path=` removes `ls` in zsh 5.9.
- Verify: `grep -rn -e '^[[:space:]]*local path=' -e '^[[:space:]]*status=' -e '^[[:space:]]*local status=' -e '^[[:space:]]*fpath=' -e '^[[:space:]]*cdpath=' -e '^[[:space:]]*argv=' --include='*.zsh' DIR`.
- Run: yes (grep ZSHVARS2 red on `FX/greps/red/plant.zsh`, green on the twin; `FX/varnames.zsh` runtime).

**SH-EXP-26 Non-POSIX-family files get their own rules.** zsh: arrays or `${=v}`; fish: no `$?`, `{1..3}`, or reliance on unmatched globs; nu: only current commands (`def --env`, `str join`, `str replace`); pwsh: no `-AsHashtable`, `??`, ternary, `&&` in 5.1-bound files.
- Why: measured failures in section 20.
- Verify: parse/run on the oldest and newest interpreter (`M zsh|fish|nu|pwsh`); PSScriptAnalyzer `PSAvoidUsingInvokeExpression` for the Invoke-Expression analog; PSSA `PSUseCompatibleSyntax` (a map decision, not run here).
- Run: yes for the interpreter runs (`FX/zsh-split.zsh`, `FX/fish-pins.fish`, `FX/nu-names.sh`, `FX/ps-quote.ps1`) and `PSAvoidUsingInvokeExpression` (`FX/ps-iex-red.ps1`).

**SH-EXP-27 Verify by final state, not exit status.** A hostile-value test for a script asserts the resulting files/argv/bytes; an exit code of 0 proves nothing.
- Why: QuoteBench: 23.4-47.0% of failing executions exit 0.
- Verify: reading heuristic on every test plant; each fixture here prints a `RESULT` derived from state.
- Run: yes (all `FX/*-red.sh` derive the verdict from filesystem state).

## Verification runs

All run on 2026-10-11. `M posix` = `/home/mherwig/.cache/research-lang/shell-tools/matrix.sh posix <file>` (11 interpreters). `SC` = `/home/mherwig/.cache/research-lang/shell-tools/run.sh shellcheck`. Paths are under `FX`. "red" = the violation plant, "green" = the compliant twin.

| # | Fixture / command | Red exit | Green exit | Key output |
|---|---|---|---|---|
| 1 | `M posix split-red.sh` / `split-green.sh` | 1 on 11/11 | 0 on 11/11 | red `copied=0 of 3; left_in_src_after_rm=3 (want 0)` `RESULT red`; green `copied=3 of 3; left_in_src_after_rm=0` `RESULT green` |
| 1b | `SC -s sh -f gcc split-red.sh` / `split-green.sh` | 1 | 0 | `12:10 error SC2045`, `12:23 note SC2086`, `15:7 note SC2035`; green empty. With `-S warning`: only `SC2045` remains |
| 2 | `M posix argv-red.sh` / `argv-green.sh` | 1 on 11/11 | 0 on 11/11 | red `argc=3 [--name] [a] [b]` `RESULT red (PWNED created by eval)`; green `argc=3 [--name] [a b; touch PWNED #] [--verbose]` |
| 2b | `SC argv-red.sh`; `SC -o all argv-red.sh` | 0 / 1 (SC2250 only) | n/a | NOT RED: no finding for `eval "$cmd"` |
| 2c | `M bash argv-array.sh`; `M bash argv-array-guard.sh` | 1 on bash 3.2, 4.0, 4.2 (`extra[@]: unbound variable`) | 0 on all 8 (guarded form) | bare form: `argc=0` on 4.4-5.3; guarded `argc=0` and `argc=2 [a b] [c]` on all 8 |
| 2d | `SC -f gcc argv-eval-array.sh` | 1 | n/a | SC2294 (3:7), SC2086, SC2207, SC2206; no code for `eval "$x"` or `$cmd` |
| 3 | `M posix echo.sh` / `echo-printf.sh` | 0 (differential) | 0 | 11 interpreters produce 6 distinct echo profiles; printf twin: 11 identical lines (`uniq -c` = 11) |
| 3b | `SC -s sh -f gcc echo.sh`; `-s dash`; `-s sh echo-printf.sh` | 1 | 0 | `4:36 note SC2028`; `5:38,6:36,12:36 warning SC3037`; dash `6:36 error SC3036`; twin empty |
| 3c | `grep -rn -e 'echo -[en]' --include='*.sh' .` in FX | 0 (hits `echo.sh:5,6,12`) | 1 on `echo-printf.sh` | hits are the output |
| 4 | `M bash arith-red.sh` | 1 on bash 3.2, 4.0, 4.2, 4.4, 5.0, 5.1, 5.2, 5.3 | n/a | `RESULT red (PWNED created)` |
| 4b | `M bash arith-inject-ok.sh` | n/a | 0 on 8/8 | `rejected non-numeric: a[$(touch PWNED)]` `RESULT green` |
| 4c | `M bash arith-inject.sh` | n/a | n/a | bash 3.2-5.3 identical: `(( x > 1 ))=HIT $((x+1))=HIT $(($x+1))=HIT [[ $x -gt 1 ]]=HIT [ "$x" -gt 1 ]=ok let=HIT arr[$x]=HIT declare -i=HIT printf %d=ok`; zsh 5.0.8-5.9 all ok |
| 4d | `M posix arith-inject-sh.sh` | n/a | n/a | HIT: mksh (arith, `$`, `[ -gt ]`), posh (same three), bash 3.2/5.2 --posix (arith, `$`); ok: dash, ash x2, ksh93 x2, yash, zsh sh |
| 4e | `SC -o all arith-red.sh`; `SC -o all arith-getopts.sh` | 1 (SC2016/SC2250 only) / 1 (SC2250) | n/a | NOT RED: no arithmetic-injection code exists |
| 5 | `M posix destructive-red.sh` / `destructive-green.sh` | 1 on 11/11 | 0 on 11/11 | red `WOULD-RUN: rm -rf /bin /boot /dev /etc /home /lib /lib64 /media /mnt /opt /proc /root /run /sbin /srv /sys /tmp /usr /var` `RESULT red (glob reached filesystem root: 3 system dirs)`; green `root: root is empty` `RESULT green (aborted, status 2)` (dash/ash/yash) or `status 1` |
| 5b | `SC -s sh -f gcc destructive-lint-red.sh` | 1 | n/a | `5:8,6:8 warning SC2115 ... /* ...`, `7:8,8:8 warning SC2115 ... / ...`, `9:1 warning SC2164`, `10:8 note SC2035`; nothing on the `${root:?}` lines. `-S warning`: SC2115 x4 and SC2164 remain |
| 5c | `SC -s sh destructive-red.sh` / `destructive-green.sh` | 1 (SC2115 x2) | 0 | on the shimmed plants too |
| 6 | `M posix brace.sh` / `brace-green.sh` | 0 (differential) | 0 | red: `loop-ran=1 last=[{1..3}]` on dash, ash x2, mksh, yash, posh, zsh sh; `loop-ran=3 last=[3]` on ksh93 x2, bash x2; green `loop-ran=3` on all |
| 6b | `SC -s sh -f gcc brace.sh` / `brace-green.sh` | 1 | 0 | `3:15 warning SC3009`, `5:23 warning SC3009`; twin empty |
| 6c | `M bash brace-bash.sh`; `M zsh brace-bash.sh` | n/a | n/a | bash 3.2 `[1 2 3] [1 2 3] [{1..7..3}] [a b c] [3 2 1] var-bound [{1..3}]`; 4.0+ `[01 02 03] [1 4 7]`; zsh var-bound `[1 2 3]` |
| 7 | `M posix parsers-red.sh` / `parsers-green.sh` | 1 on 11/11 | 0 on 11/11 | red `RESULT red (files=3 pwned=yes)`; green `RESULT green (files=1, one name reused)` |
| 7b | `SC -s sh -f gcc parsers-red.sh` / `parsers-green.sh` | 1 | 1 (NOT admissible) | SC2029 note on both, including the correctly quoted twin |
| 8 | `M bash readloop-green.bash`; `M posix readloop-red.sh`; `M posix readloop-posix.sh` | red 1 on 11/11 (`seen=7 of 5`) | 0 on 8/8 bash; 0 on 11/11 posix | `seen=5 of 5`; `files=5 of 5 lines=2 of 2` |
| 8b | `SC readloop-red.sh` / `SC readloop-green.bash readloop-posix.sh` | 1 (SC2044 error 5:15) | 0 | |
| 8c | `docker run shellzoo:deb12 bash read-d-utf8.sh` (and bash:4.4, bash:5.3) | n/a | n/a | 5.2.15 `LC_ALL=C.UTF-8 <FOO> <$'\315'>`; 4.4.23 and 5.3.20 `<FOO> <$'\315'> <$'\226'>`; `LC_ALL=C` and `LC_CTYPE=C` twin fix 5.2.15 |
| 9 | `./gate-xargs.sh` | grimoire shape exit 123, file not analysed | `find -print0 \| xargs -0 -r` exit 123 because it found SC2086 | red `./my: ... openBinaryFile: does not exist`; green `./my script.sh:2:6: note: ... [SC2086]` |
| 10 | `SC -f json1 -S warning` vs default on the ocx gate set (`ocx-files.nul`, 123 files) | n/a | n/a | `-S warning`: 0 findings; default: 20 findings, SC1091 x8, SC2016 x6, SC2012 x5, SC2015 x1 |
| 11 | `FX/greps/run-greps.sh` (13 greps; output captured in `FX/greps-run.txt`) | all 13 exit 0 on `greps/red` | all 13 exit 1 (empty) on `greps/green` | EVAL, ECHO, RMVAR, GETOPT, XARGS, LS, BRACE, SHC, EQEQ, TESTAO, DOTSTAR, SEVERITY, ZSHVARS2; e.g. `red/plant.sh:2:eval "$cmd"`, `red/plant.sh:15:rm -rf .*`, `red/Taskfile.yml:3:    cmd: shellcheck -S warning {{.FILES}}` |
| 12 | `SC -s sh -f gcc sh-bashisms.sh` / `pe-lint.sh` | 1 | n/a | 22 distinct codes: SC2113 + SC3001 SC3003 SC3006 SC3008 SC3010 SC3015 SC3018 SC3019 SC3020 SC3028 SC3030 SC3039 SC3040 SC3043 SC3046 SC3047 SC3050 SC3053 SC3054; pe-lint: SC3060 SC3057 SC3059 SC3034 SC3014 SC2166 SC3016 SC3045 SC3011 SC3009 SC2045 |
| 13 | `SC -f json1` on `sc-red.bash`, `sc-green.bash` | 1 (30 codes) | 1 only on SC2029 at default; 0 at `-S warning` | severity table in section 2 |
| 14 | `SC -s sh -f gcc split-idiom.sh` | n/a | 1 | SC2086 at 8:8 and 13:8 even with `set -f` (ShellCheck does not model it) |
| 15 | `run.sh pwsh -Command "Invoke-ScriptAnalyzer -Path ./ps-iex-red.ps1"` / `ps-iex-green.ps1` | findings | none | `ps-iex-red.ps1:2 PSAvoidUsingInvokeExpression [Warning]` (also :3, :5); green empty |
| 16 | `M posix` on `read-pins.sh`, `test-pins.sh`, `pe-pins.sh`, `arith-pins.sh`, `printf-pins.sh`, `glob-pins.sh`, `cmdsub-pins.sh`, `getopts-pins.sh`, `lead0.sh`, `find0.sh` (docker) | differential probes | | tables in sections 4-13 |
| 17 | `M zsh zsh-split.zsh`; `M fish fish-pins.fish`; `./nu-names.sh`; `M pwsh ps-quote.ps1` | | | section 20 |

Verifications that did NOT go red: ShellCheck on the `eval "$string"` plant (2b); ShellCheck on the arithmetic-injection plant (4e); SC2029 on the ssh plant (fires on the twin too, 7b); no ShellCheck code for `rm -rf .*`, `echo "$hostile"`, GNU `getopt`, `${x@Q}` in sh (`FX/dotglob-lint.sh`, `FX/pe-lint.sh`). For each the contract falls back to a grep or a reading heuristic, named in the rule.

Red-watched count: 17 distinct verifications were watched going red on a plant and green/empty on a twin (1, 1b, 2, 2c, 3b, 3c, 4, 5, 5b, 6b, 7, 8, 8b, 9 (differential), 11 (13 greps), 12, 15), plus the differential matrices.

## Exemplar evidence

Corpus SHAs from `shell-audit/scratch/exemplar-shas.md`; fleet repos by `git rev-parse --short=12`.

| Rule | Satisfies | Violates / contradicts |
|---|---|---|
| SH-EXP-04/06 argv by `set --` / array | `docker/docker-install@2b32480025b2:rootless-install.sh:247,250` (`#!/bin/sh`, `set -- "$@" --force`, `set -- "$@" --skip-iptables`); `rust-lang/rustup@61271d00a979:rustup-init.sh:152` uses `getopts` (SH-EXP-24) | none found in the installer exemplars |
| SH-EXP-05 `eval` of an emitter | `ocx@5de9d777eb7d:test/doc_scripts/user-guide__toolchain-activation.sh:17` `eval "$(ocx env --shell=bash)"` | corpus is dominated by test frameworks: `eval` lines oils 896, shellspec 470, git 152 (`FX/exemplar-counts.sh`), not representative of installers |
| SH-EXP-09 echo/printf | the 4 installer exemplars checked for `echo -e` show few uses | `Homebrew/install@8ab1549dfa11:uninstall.sh:559` `echo -e "You may wish to remove them yourself.\n"` (`#!/bin/bash`, so it works there); `dotnet/install-scripts@e5cf1dd2d154:eng/common/cross/build-rootfs.sh:517` `echo -e "-----BEGIN PUBLIC KEY-----\n$content\n..."`; `k3s-io/k3s@82a6ddcd820b:contrib/util/generate-custom-ca-certs.sh:155` `echo -e "\t"`. Corpus totals: `echo -e` 120 lines/30 files (oils 83), `echo -n` 138 lines/44 files. Fleet authored: 0 (`FX/fleet-census.sh`; [inst] H6) |
| SH-EXP-11 read loops | `bats-core/bats-core@0c92eb4c418d:install.sh:25` `read -rd '' BATS_EXE_CONTENTS <"$PREFIX/bin/bin/bats"`-style NUL read; `shellspec` `IFS= read -r` 80 lines | `bats-core@0c92eb4c418d:shellcheck.sh:6` `while IFS= read -r -d $'\0'` (bash-only, fine in a bash file). `read` without `-r`: 591 lines/287 files in the corpus (git 282, oils 219); fleet 88 lines, mostly ocx doc snippets |
| SH-EXP-17 brace in sh | none | `k3s-io/k3s@82a6ddcd820b:install.sh:408` `for i in {1..3}; do` under `#!/bin/sh` (runs once in 7/11 shells); corpus: 122 `{N..M}` lines in 31 files (oils 109, test suite) |
| SH-EXP-20 destructive guards | `jdx/mise@19e8c8f0d03d:scripts/release.sh:12` `rm -rf "${RELEASE_DIR:?}/$MISE_VERSION"`; `jdx/mise@19e8c8f0d03d:scripts/task-cache-remote-compat.sh:40` `rm -rf "${temp_dir:?}"`; `shellspec/shellspec@f2d13f991885:lib/libexec/kcov-executor.sh:45` `rm -rf "${SHELLSPEC_COVERAGEDIR:?}/${SHELLSPEC_KCOV_FILENAME:?}"*`. Only 3 of 142 `rm -rf "$var` lines use `:?` | `nvm-sh/nvm@b1b3a0038c06:nvm.sh:2880,2886,2899` `command rm -rf "${VERSION_PATH}"` and `"${TMPDIR}"` unguarded; fleet: 62 unguarded `rm -rf "$var` lines in 12 repos (many are `trap 'rm -rf "$w"'` and test scratch dirs) |
| SH-EXP-02 default severity | `www-setup` and `grimoire` gates run default severity | `ocx@5de9d777eb7d:taskfiles/shell.taskfile.yml:38`, `setup-grimoire@1259e35b2550:Taskfile.yml:25,26` (`-S warning`); 0 SC2086 in ocx today |
| SH-EXP-21 extra parsers | `ocx@5de9d777eb7d:.github/actions/bazel-cache-rc/selftest.sh:187` runs `bash -c "$WRITE_BODY"` where the body is read from the repo's own `action.yml` by a YAML parser (trusted second parser, by design) | fleet census: `sh -c "` / `ssh h "` 14 lines in ocx (7) and ocx-mirror (7), all trusted-variable cases on inspection of the first 8 |
| SH-EXP-13 sh dialect | fleet: 0 `[ == ]`/`-a`/`-o`/`[[`/`echo -e` in 190 sh-shebang files ([fleet] #6, [inst] H6) | corpus `[ == ]`-style lines 728 (mostly bash files) |
| SH-EXP-15 arithmetic | none uses `case`-validation in the corpus samples checked | `$(( ... $var ...))` appears on 425 lines (git 292, shellspec 73) - none of these were inspected for untrusted input |

## AI-agent angle

What an LLM characteristically gets wrong in this area, and the smallest mechanical check:

| Mistake | Why it happens | Smallest check (all ran on a plant unless noted) |
|---|---|---|
| Unquoted `$var`/`$(cmd)`/`$@` | training data is full of `cp $file $dst`, `echo $x` | `shellcheck` default severity: SC2086, SC2046, SC2068 |
| Gate set to `-S warning` "to cut noise" | agent copies the fleet's own taskfile | grep SEVERITY |
| String + `eval` to build a command, or `$cmd` | looks like a variable holding a command | `grep -rnw -e eval`; ShellCheck is silent |
| `echo -e "a\tb"`, `echo -n`, `echo "$var"` under `#!/bin/sh` | bash habit; four POSIX shells differ | SC3037/SC3036/SC2028, grep `echo -[eEn]` |
| `printf "$var"`, `%q` or `%2$s` in sh | assumed portable | SC2059, SC3050 |
| `read line` without `-r`, `cmd \| while read` then reading the variable | habit | SC2162, SC2030/SC2031 |
| `for f in $(ls ...)` / `$(find ...)`; `cp *.txt` without `./` | habit | SC2045, SC2044, SC2035 |
| `rm -rf "$dir/"*` with no `:?` | looks tidy | SC2115 |
| `rm -rf .*` or `cp -r .* dst` | "match hidden files" | grep DOTSTAR (no ShellCheck code) |
| `[[ ]]`, `==`, `-a`/`-o`, `-v`, `$'..'`, `${x//}`, `${x:0:1}`, `<<<`, `read -d`, `{1..3}`, arrays under `#!/bin/sh` | bash features presented as shell | `shellcheck -s sh` SC3010 SC3014 SC2166 SC3016 SC3003 SC3060 SC3057 SC3011 SC3045 SC3009 SC3030; run on dash |
| Bash 4+ features in macOS-bound scripts (`${x,,}`, `declare -A`, `read -N`, `mapfile`, `${a[@]}` empty under `set -u`) | assumes bash 5 | `M bash` on 3.2 (`,,` ERR on 3.2, `{01..03}` and `{1..7..3}` wrong on 3.2); ShellCheck has no bash-3.2 target (conflict 20) |
| GNU-only flags on BSD/busybox (`xargs -r`, `sed -i`, `grep -P`, `readlink -f`) | GNU is the dominant training source | SH-USER; here: `xargs -0 -r` works on GNU and busybox 1.37, BSD unverified: read only |
| `set -euo pipefail` copied as a cargo cult next to the above | habit | SH-ERR (not repeated here) |
| `which`, `function f()` | habit | map M-O-03 grep set |
| zsh assumed to split `$x` like bash; `[ a == b ]`; `local path`; `echo '\t'` | bash habit | `M zsh` (word split `n=1`, `==` error, `ls` lost, echo interprets); ShellCheck refuses (SC1071) |
| fish: `$?`, `{1..3}`, `$(cmd)` assumptions | bash habit | `M fish`: `$?` is a parse error on 3.6-4.9 |
| nushell commands from older training data (`let-env`, `def-env`, `str collect`, `str find-replace`) | removed before 0.105 | `M nu` on 0.105.1 and 0.116.0: identical errors |
| PowerShell 7-only syntax in 5.1-bound files (`??`, `? :`, `&&`, `Join-String`, `-AsHashtable`, `-Parallel`) | training skews to pwsh 7 | `M pwsh` includes Windows PowerShell 5.1 (parse errors; `\u{..}` silently literal); PSSA `PSAvoidUsingInvokeExpression` for `iex` |
| PowerShell curly quote inside a single-quoted literal | pasted prose | parse on 5.1/7.4/7.6.6 (error "string is missing the terminator") |
| Interpolating a value into `ssh host "..."` / `sh -c "..."` / `docker exec` | looks like one command | SC2029 (non-discriminating), grep SHC; hostile-value run |
| Declaring success because the command exited 0 | exit status looks like proof | assert final state (QuoteBench) |

## Contested / evolving

- **echo.** Google allows `echo` and never mentions `printf` in its quoting section; POSIX.1-2024 says "New applications are encouraged to use printf instead of echo"; the map resolves to printf for anything non-literal. Trend: stable; no standard fixes echo because `-n`/`-e` are historical.
- **`[ ]` vs `[[ ]]`.** Google prefers `[[ ]]`, POSIX removes `[[ ]]` from the shell language, the fleet rule banned `[ ]` in bash. Decided by dialect (map M-C-09). Stable.
- **`-a`/`-o`.** POSIX.1-2024 (Austin Group defect 1330) removed them; most shells still accept them (all 11 returned T for a valid pair), so the removal is advisory; the failure shows only with operands like `!`.
- **ShellCheck arithmetic warning.** [#2679](https://github.com/koalaman/shellcheck/issues/2679) asks for a check on unvalidated input; open since 2023-02-01 as read on 2026-10-11. If it ships it will appear as a new SC code and the heuristic in SH-EXP-15 can become lint.
- **`.*` and `.`/`..`.** Bash 5.2 changed the default (`globskipdots` on); POSIX.1-2024 still permits both and flags a future requirement; dash 0.5.12, busybox 1.37 and yash 2.52 still match them. Trend: converging on "never match", not yet there.
- **`$'..'`, `read -d`, `printf %n$`, `xargs -0/-r`, `test -ef/-nt/-ot`.** Added by POSIX.1-2024; dash 0.5.12 lacks `$'..'` and `read -d`, yash 2.52 lacks `read -d`, posh 0.14.1 lacks both, only ksh93u+m/zsh implement `%n$`. Trend: the standard is ahead of the Debian-default shells; revisit when dash 0.5.13 is the Debian default.
- **bash 5.0-5.2 `read -d ''` multibyte regression** is fixed in 5.3 only; Gentoo and Arch backported part of it to 5.2 (BashPitfalls #65, as of 2025-07); no official patchlevel. Use `LC_ALL=C` until the 5.3 floor.
- **Associative-array subscript injection** (`[[ -v hash[$key] ]]`, `(( hash[$key]++ ))`) changed across bash 5.0-5.2 and `assoc_expand_once`/`array_expand_once` (5.2 NEWS item t: "array_expand_once: new shopt option, replaces assoc_expand_once"); the safe forms differ per version (BashPitfalls #61, #62). Not re-measured here; keep arithmetic away from untrusted keys.
- **busybox.** `getopt` with long options exists in 1.37 (Alpine 3.22) but is a build option; `[[` glob matching is missing (SC2330). busybox 1.38 is unstable (not measured).
- **uutils** (Ubuntu 25.10+): not measured for xargs/find/echo behaviour in this area; out of scope here (SH-USER).
- **Agent evaluation.** QuoteBench (2026-08) frames command-path failure as a first-class benchmark; expect more model-side "boundary adaptation" and fewer quoting rules being needed for frontier models, but the rule set stays correct for the human-free gate.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://mywiki.wooledge.org/BashPitfalls | Greg's Wiki, 65 numbered pitfalls (primary practitioner source) | last edited 2025-07-18 | #1-#3, #8, #14, #22, #41, #45-#47, #56, #59, #61, #62, #65 each reproduced here |
| https://www.shellcheck.net/wiki/SC2086 | ShellCheck wiki: SC2086, exceptions (`${v:+}`, arrays, functions, `set -f`) | ShellCheck 0.11.0 era | the sanctioned splitting idioms; wiki clone `koalaman/shellcheck.wiki@0b4dfe7bf9dc` |
| https://www.shellcheck.net/wiki/SC2115 | SC2115: `${var:?}` for `rm -rf "$v/"*`, links the Steam issue | same | the destructive-command rule |
| https://www.shellcheck.net/wiki/SC2294 | SC2294: `eval` on arrays / `"$@"` | same | shows what the check does NOT cover |
| https://www.shellcheck.net/wiki/SC2029 | SC2029: ssh client-side expansion | same | why SC2029 cannot be the only check |
| https://www.shellcheck.net/wiki/SC3009 | SC3009: brace expansion undefined in POSIX sh | same | the `{1..5}` rationale and correct code |
| https://www.shellcheck.net/wiki/Optional | ShellCheck optional checks, enable via directive/`.shellcheckrc`/`-o` | same | `-o all` is subjective; confirms conflict 4 |
| https://github.com/koalaman/shellcheck/issues/2679 | "Warn about the use of unvalidated input in arithmetic contexts" | opened 2023-02-01, open | proves there is no lint for arithmetic injection |
| https://arxiv.org/abs/2608.13547 (html: https://arxiv.org/html/2608.13547) | QuoteBench: 56 tasks, 14 families, added-parser loss 55.4-73.2 pts, 23.4-47.0% exit-zero failures | 2026-08-13 | the quantitative case for per-parser quoting and state-based verification |
| https://google.github.io/styleguide/shellguide.html | Google Shell Style Guide: Quoting, Arrays, Eval, Wildcard Expansion, Arithmetic, getopts example | current | the argued baseline the map contrasts with |
| https://unix.stackexchange.com/questions/65803/why-is-printf-better-than-echo | Stephane Chazelas' answer on echo history and portability (read via https://api.stackexchange.com/2.3/questions/65803/answers?site=unix&filter=withbody; the page itself is behind a bot wall) | answer score 1028 | echo vs printf from first principles; macOS non-compliance claim |
| https://github.com/ValveSoftware/steam-for-linux/issues/3671 | Steam deletes the user's files: `rm -rf "$STEAMROOT/"*` | 2015-01-14 | the incident behind SC2115 |
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html | POSIX.1-2024 XCU Shell Command Language (expansions, arithmetic, pathname expansion, dot/dot-dot note) | 2024 | normative field splitting, arithmetic and glob rules |
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/echo.html | POSIX.1-2024 echo | 2024 | "implementation-defined" wording and the printf emulation of echo |
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/test.html | POSIX.1-2024 test: `-a`/`-o` removed, `-ef/-nt/-ot` added, `[[ ]]` not in the language | 2024 | test-operator table |
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/read.html | POSIX.1-2024 read with `-d delim` | 2024 | `read -d` is standard now |
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/printf.html | POSIX.1-2024 printf incl. `%n$` | 2024 | the standard is ahead of 9 of 11 shells |
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/xargs.html | POSIX.1-2024 xargs `-0`, `-r` | 2024 | NUL pipelines are standard |
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/getopts.html | POSIX.1-2024 getopts | 2024 | OPTIND semantics |
| https://tiswww.case.edu/php/chet/bash/NEWS | Bash NEWS 3.2 to 5.3 (maintainer's server) | 2025 | `globskipdots` (5.2), `array_expand_once`, `test -v`, `patsub_replacement` |
| https://tiswww.case.edu/php/chet/bash/bashref.html | Bash reference manual (maintainer's server; gnu.org timed out) | 5.3 | arithmetic evaluation of variable values, octal, `base#`, "no check for overflow", `globskipdots` |
| https://zsh.sourceforge.io/Doc/Release/Options.html | zsh manual: Options (NOMATCH, SH_WORD_SPLIT, EQUALS, GLOB_SUBST) | 5.9 | zsh's different defaults |
| https://man.archlinux.org/man/dash.1 | dash(1) | 0.5.12 era | echo supports `-n` only and interprets sequences |
| https://mywiki.wooledge.org/BashFAQ/050 | BashFAQ/050: putting a command in a variable | current | "Variables hold data. Functions hold code." |
| https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_quoting_rules?view=powershell-7.6 | about_Quoting_Rules (PowerShell 7.6) | 2026 | smart quotes are quote characters |
| https://github.com/PowerShell/PSScriptAnalyzer (file `docs/Rules/AvoidUsingInvokeExpression.md`, exemplar `PowerShell/PSScriptAnalyzer@411c3d0b197b`) | PSScriptAnalyzer rule doc and the tool run here (1.25.0) | 2026-07 | the `Invoke-Expression` analog of `eval` |
| https://github.com/koalaman/shellcheck/wiki (local clone `exemplars/shell/koalaman__shellcheck.wiki@0b4dfe7bf9dc`) | ShellCheck wiki pages SC2028, SC2035, SC2045, SC3036, SC3037, SC3057, SC3059, SC3060 (titles and examples) | 0.11.0 era | the SC codes in the severity table |
| `shell-audit/fleet-shell-shape.md`, `config-inventory.md`, `installers.md`, `shell-topic-map.md` (this repo) | the wave-1 audits and map this note builds on | 2026-10-10 | fleet counts (#7), gate defects, K3S:408 |

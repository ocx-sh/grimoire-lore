---
title: "Quoting and expansion — consolidated ruleset (SH-EXP)"
topic: "shell / expansion: quoting, word splitting, argv building, hostile filenames, echo/printf, read loops, test operators, arithmetic, globs, extra parsers (rows M-C-01..14, 17, 19, 21, 22; M-E-01..03, 08)"
model: sonnet
id_family: SH-EXP
consolidates:
  - shell-expansion/quoting-and-words.md
date: 2026-10-11
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/shell-expansion/
---

# Quoting and expansion: the consolidated SH-EXP ruleset

Keys. `[qw]` = `shell-expansion/quoting-and-words.md` (`§n` section, `#n` row of its Verification runs table). `SE-n` = a run made while consolidating, listed under "Consolidation runs" below. `[fleet]`, `[cfg]`, `[inst]`, `[ex]`, `[plat]` = the wave-1 audits in `shell-audit/`. `[ci]` = `shell-ci/run-steps-and-taskfiles.md`, `[dial]` = `shell-dialect/bash-version-gate.md`, `[gate]` = `shell-gate/lint-format-profile.md`. `M` = `matrix.sh`. All dates 2026-10-11. "unverified: read only" = no macOS host.

Script kinds a rule can bind: **INST** installer or bootstrap (`#!/bin/sh`, piped to `sh`), **CI** workflow `run:`, composite action or Taskfile cmd body, **TOOL** repo tool or test helper (`#!/usr/bin/env bash`), **LIB** sourced library (no shebang), **RC** interactive rc or integration code, **EMIT** code that a program emits (its per-target quoting is SH-EMIT; the rules below apply to the emitted script text).

## Verdict

1. **ShellCheck at default severity is the contract for quoting, for every kind.** No `-S` floor and no `SHELLCHECK_OPTS=--severity=...` anywhere, including actionlint over CI `run:` bodies. SC2086 is `info` and vanishes under `-S warning`; the fleet gates (`ocx`, `setup-grimoire`) run that floor today. (SH-EXP-01; C1, C2)
2. **Argv is an array (bash/ksh/zsh) or `set --` (sh); a command is never a string.** `eval` is allowed only on `"$(trusted-emitter ...)"`. ShellCheck is silent on `eval "$string"`, so the gate is a grep. Binds all kinds. (SH-EXP-02, 13)
3. **Names are hostile.** `./*` or `--`, `find -exec ... {} +` or `-print0 | xargs -0 -r`, never `$(ls)`, never `.*`, and `${v:?}` on every `rm`/`mv` rooted at a variable. (SH-EXP-03, 04, 14, 15)
4. **Text out is `printf '%s\n'`.** `echo` is banned for data everywhere, and for `-e`/`-n`/backslashes in sh-dialect code (INST, LIB with `shell=sh`, EMIT sh targets); in bash-only TOOL files a literal `echo -n` is tolerated (SHOULD). The format of `printf` is a constant. (SH-EXP-07, 09)
5. **sh is a deny-list enforced by `shellcheck -s sh` plus a dash/ash run**, not an allow-list: each listed construct fails or silently misbehaves in at least one of dash, busybox ash, yash, posh. Binds INST, LIB `shell=sh`, EMIT sh targets; bash TOOL files are free of it. (SH-EXP-10, 11, 12)
6. **Arithmetic on external text is code execution.** Validate with `case` before `$(( ))`/`(( ))`/`[[ -eq ]]`. No lint exists (ShellCheck #2679 is open), so the check is a hostile-value run that asserts final state. (SH-EXP-19, 23)
7. **Count the parsers.** Every `ssh`, `sh -c`, `docker exec` and YAML boundary needs a quoting layer, or the value travels as a positional. The POSIX quoter in [qw] loses trailing newlines; the pure-parameter-expansion quoter in SH-EXP-16 replaces it (C7). Binds all kinds.
8. **Loops.** `IFS= read -r`, no pipeline into `while` when state must survive, and on a bash 3.2 floor `${a[@]+"${a[@]}"}` plus the `read` loop instead of `mapfile`. Binds TOOL and CI on macOS runners. (SH-EXP-05, 06, 20)
9. **`[ ]` vs `[[ ]]` is decided by dialect**, not style: neither is a defect in bash; `[[` is mandatory for `=~` and glob matching. (SH-EXP-08)
10. **Eleven of the 23 rules have no ShellCheck code that discriminates** (13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23); each names a grep, a hostile-value run or a reading heuristic, and the grep or run was watched going red on a plant. The twin ShellCheck check that did not go red is listed with the rule.
11. **Out of this family:** zsh word-splitting forms, fish/nushell/PowerShell syntax, per-target emitter quoters and `${{ }}` injection are owned by SH-ZSH, SH-FISH, SH-NU, PS-*, SH-EMIT and SH-CI; see "Hand-offs" below.

### Conflicts resolved

- **C1 Severity of SC2046/SC2068 (map conflict 4 vs measurement).** The map lists SC2086, SC2046, SC2068 and SC2162 as `info`. ShellCheck 0.11.0 reports SC2046, SC2048, SC2206, SC2207 as warning and SC2068, SC2070, SC2045 as error ([qw] §2, SE-1). Measured wins. The set hidden by `-S warning` is exactly: SC2086, SC2162, SC2035, SC2059, SC2028, SC2029, SC2030/SC2031, SC2012. The "never disable" list stands.
- **C2 Severity floor for actionlint ([gate] SH-GATE-01 vs [ci] SH-CI-15).** [gate] forbids any severity flag including `SHELLCHECK_OPTS`; [ci] makes `SHELLCHECK_OPTS='--severity=warning'` a MUST for actionlint. Resolved for quoting: default severity plus `--exclude=` of named style codes. Reason: the CI dive's own fleet run found 18 ShellCheck findings at default severity, 12 of them live quoting defects (SC2086 x8, SC2035 x4) that the warning floor hides; `--severity=warning` returns exit 0 on a quoting plant while `--exclude=SC2129` keeps SC2086 and drops only the style noise (SE-10; `[ci]` §11, `out/actionlint-fleet.txt`). `ocx/taskfiles/ci.taskfile.yml:17-25` states the floor on purpose ("info/style findings are not gated").
- **C3 echo scope (map conflict 19).** The map's 4-against-4 split holds in sh mode but is wider: native zsh also interprets backslashes, `echo -e` is honoured by bash --posix and zsh and printed by dash/yash/posh, and a data value of `-n`/`-e` vanishes in 9 of 11 shells ([qw] §6, #3). Resolved as severity by dialect: MUST for sh scope and for any `echo "$data"`; SHOULD for a literal `echo -n`/`-e` in a bash-only file (works on bash 3.2-5.3 native).
- **C4 `IFS=$'\n\t'` prologue (fleet `quality-bash.md:30`, asserted: "prevents word-splitting on spaces — critical for filenames with spaces").** Measured on bash 3.2-5.3 (8/8): with that IFS an unquoted `$f` fixes only the space; a glob value still expands (argc 3 for `*.txt`), an empty value still vanishes, a tab in a name still splits (SE-3). Quoting stays mandatory; the prologue is not a substitute and not mandated (agrees with the map, conflict 11).
- **C5 `xargs -r` (map conflict 3: "Linux only, no-op on macOS" vs [qw] "always write -r").** Resolved: prefer `find -exec cmd -- {} +` (POSIX, never runs on no match); when `xargs` is needed write `-0 -r`. GNU and busybox 1.37 run the command once on empty input without `-r` ([qw] §4); BSD documents `-r` as an accepted no-op (unverified: read only), so writing it is harmless where it is not needed.
- **C6 `getopt` on busybox (map M-C-19: "missing on busybox").** Wrong for 1.37: long options work on busybox 1.37 (Alpine 3.22, `busybox:1.37`) and on util-linux; enhanced getopt fails on 5 of 21 images ([qw] §16; `[plat]` §1.3). Resolved: probe with `getopt -T; [ $? -eq 4 ]`; macOS/BSD unverified: read only.
- **C7 The POSIX quoter in [qw] (`parsers-green.sh:8`, command substitution + `sed`).** It strips trailing newlines: `"a\n"` and `"a\n\n"` do not round-trip on 11 of 11 shells (66 of 88 cases ok). The pure-parameter-expansion quoter in SH-EXP-16 round-trips 88 of 88 (SE-2). Replace.
- **C8 3.2-safe lines-to-array loop ([dial] BVG-16 vs SH-EXP-05 template).** BVG-16's `while IFS= read -r l; do a+=("$l"); done < <(cmd)` drops an unterminated final line (n=3 for `a b`, `c`, ``, `d`); with `|| [ -n "$l" ]` it returns 4 on bash 3.2-5.3 (SE-11). Merged into SH-EXP-02/05.
- **C9 What agents fail on (frame H6 vs measurement).** H6 ranked bashisms under `#!/bin/sh` first. Measured: 0 of 190 sh-shebang fleet scripts carry an SC3xxx and 3.5% of exemplar `#!/bin/sh` files do ([qw] Exemplar evidence; `[fleet]` #6, `[ex]`), while SC2086 is 278 of 521 fleet findings and 4,387 of 13,865 corpus findings. The failure-mode ranking below follows the measurement.

## The ruleset

Rows are grouped by the check that catches them: A = ShellCheck at default severity (any dialect), B = `shellcheck -s sh` (sh dialect), C = grep (no ShellCheck code, or ShellCheck cannot discriminate), D = matrix or hostile-value run, E = reading heuristic. "Red" says whether the verification was watched going red on a planted violation and green on its twin (run numbers from [qw] Verification runs, or `SE-n` below). Severity is MUST, SHOULD or CONSIDER.

### A. ShellCheck at default severity

**SH-EXP-01 Quote every expansion.** Double-quote every parameter expansion, command substitution and arithmetic expansion (`"$v"`, `"$(cmd)"`, `"$((n))"`, `"$@"`, `"${a[@]}"`); write `"$*"`/`"${a[*]}"` only to join on purpose; leave an expansion bare only through SH-EXP-02. An `IFS` prologue does not replace quoting.
- Why: splitting and globbing hit every bare expansion; SC2086 is 278 of 521 fleet findings and 4,387 corpus findings, and `IFS=$'\n\t'` fixes only the space (SE-3).
- Verify: `shellcheck FILE` at default severity, dialect from the shebang or `# shellcheck shell=`: SC2086 (info), SC2046 SC2048 SC2206 SC2207 (warning), SC2068 SC2070 (error). Gate profile is SH-GATE-01; no `-S`, no `--severity` (C1, C2).
- Red: yes. [qw] #1b, #13 (30 codes, twin clean at `-S warning`); SE-1 re-run; SE-10 for the CI form.
- Severity: MUST. Binds: all kinds; sh, bash, ksh. zsh files cannot be linted (`SC1071`): reading check only.

**SH-EXP-02 Build argv from parts, never from a string.** Variable argument lists are a bash/ksh/zsh array (`args=(--name "$n"); args+=(--v); cmd "${args[@]}"`) or, in sh, `set --` inside a function (it clobbers `$@`); one optional flag is `${v:+--flag}` or `${o:+-o "$o"}`; a delimited list is split only as `set -f; IFS=,; set -- $list; IFS=$old; set +f` with `# shellcheck disable=SC2086 # set -f active`. On a bash 3.2 floor fill an array from command output with `while IFS= read -r l || [ -n "$l" ]; do a+=("$l"); done < <(cmd)`, not `mapfile` (bash 4.0) and not `a=($(cmd))` (SC2207).
- Why: a string re-parses every value: `name='a b; touch PWNED #'` ran the injected command on 11 of 11 POSIX-mode shells; ShellCheck does not model `set -f`, so SC2086 still fires on the sanctioned split.
- Verify: SC2086, SC2206, SC2207, SC2294 (warning; only for `eval "${arr[@]}"`), plus the `eval` grep of SH-EXP-13; reading: every `disable=SC2086` carries its reason.
- Red: yes. [qw] #2 (red exit 1 / green exit 0 on 11/11), #2c, #2d, #14; SE-11. ShellCheck did NOT go red on `eval "$cmd"` (#2b): that gap is SH-EXP-13.
- Severity: MUST. Binds: all kinds; `+=` needs bash 3.1+, `set --` is POSIX.

**SH-EXP-03 Treat file names as hostile.** Glob as `./*` (or put `--` before the operand), quote every name, guard an unmatched glob with `[ -e "$f" ] || continue`; never parse `ls` and never iterate `$(ls ...)` or `$(find ...)`; take names from `find ... -exec cmd -- {} +` or a NUL stream (SH-EXP-14).
- Why: leading `-`, spaces, newlines and glob characters break `for f in $(ls)` and `rm *`: 0 of 3 files copied and 3 of 3 left after `rm -f *` on 11 of 11 shells; `for f in $(find ...)` sees 7 names for 5 files.
- Verify: SC2035 (info), SC2045 (error), SC2044 SC2038 SC2010 (warning), SC2012 (info); `grep -rn -e '\$(ls' -e 'in `ls' --include='*.sh' DIR`.
- Red: yes. [qw] #1, #1b, #8, #11 (LS).
- Severity: MUST. Binds: all kinds. Gap: the same class for non-file data operands (`grep "$pat"`, `sed "s/$x/.../"`) is not measured; see Open questions.

**SH-EXP-04 Guard destructive paths.** Root every `rm -rf`, `mv`, `chmod -R` and `find -delete` that uses a variable with `${v:?}` (`rm -rf -- "${dir:?}/..."`); `cd "$d" || exit` before any relative delete; never `rm -rf "$v/"*` or `"$v"/*`.
- Why: an empty `$root` expands `"${root}/"*` to `/bin /boot /dev /etc ...` on 11 of 11 shells (Steam issue 3671, the origin of SC2115).
- Verify: SC2115 (warning; survives `-S warning`) on `"$v/"*`, `"$v"/*`, `"$v/"`, `"$v/$w"`; SC2164 (warning) for `cd`; coarse grep `grep -rn -e 'rm -[a-zA-Z]* "\$[A-Za-z_]' -e 'rm -[a-zA-Z]* "\${[A-Za-z_0-9]*}' --include='*.sh' DIR` for the whole-variable shape SC2115 does not see.
- Red: yes. [qw] #5, #5b, #5c, #11 (RMVAR). SC2115 does not fire on `rm -rf "$OCX_HOME/packages"` (low risk: empty gives `/packages`).
- Severity: MUST for the SC2115 shapes; SHOULD for a whole-variable or suffixed path. Binds: all kinds, most of all INST, CI and `trap` handlers.

**SH-EXP-05 Read input with a template.** Lines: `while IFS= read -r line || [ -n "$line" ]; do ...; done < "$file"`, with `</dev/null` on any child that reads stdin (`ssh`, `ffmpeg`, `cat`). NUL names in bash: `while IFS= read -r -d '' f; do ...; done < <(find ... -print0)`, wrapped in `LC_ALL=C` on bash 5.0-5.2. In sh, let `find -exec sh -c '... "$1" ...' _ {} +` batch (no `read -d`).
- Why: `read` without `-r` eats backslashes (11/11); the unterminated last line is lost without `|| [ -n ]` (11/11); a child steals the rest of the input (`[a]` only); `read -d` is missing in dash 0.5.12, yash 2.52, posh 0.14.1; bash 5.2.15 under `C.UTF-8` loses a multibyte record from `read -rd ''` (fixed in 5.3).
- Verify: SC2162 (info); `shellcheck -s sh` SC3045 for `read -d`; reading check for the last-line and stdin guards; `M posix`/`M bash` on the template.
- Red: yes. [qw] #8, #8b, #8c; SE-11.
- Severity: MUST for `IFS= read -r`; SHOULD for the last-line guard, the stdin guard and the `LC_ALL=C` workaround. Binds: all kinds; `-d ''` bash 3.2+.

**SH-EXP-06 Do not pipe into `while read` when a variable must survive.** Feed the loop from a redirect or here-doc (sh) or `< <(cmd)` (bash 3.2+); `shopt -s lastpipe` only in a non-interactive bash >= 4.2 script that says so.
- Why: the loop runs in a subshell: the counter stays 0 on dash, busybox ash x2, mksh, yash, posh, bash --posix x2 and zsh sh-mode (9 of 11) and is 2 only in ksh93u+m x2 and with a here-doc (11/11).
- Verify: SC2030 + SC2031 (info; invisible at `-S warning`).
- Red: yes. SE-4 (red plant: SC2030 at 4:5, SC2031 at 6:9; here-doc twin has neither); [qw] §8 pins.
- Severity: MUST. Binds: all kinds.

**SH-EXP-07 `printf`: constant format, data through `%s`.** `printf '%s\n' "$v"`, never `printf "$v"`; `%b` only for strings the script wrote; in sh no `%n$` and no `%q` (its output differs per shell, so it quotes for the same shell only).
- Why: `printf "$v"` with `v=100%` is an error in 10 of 11 shells and correct only in ksh93u+m; `%2$s` works only in ksh93u+m and zsh although POSIX.1-2024 specifies it; `%q` is an error in dash, ash, yash.
- Verify: SC2059 (info); `shellcheck -s sh` SC3050 (`%q`); reading check for `%n$`.
- Red: yes. [qw] #13 (SC2059), #12 (SC3050), `printf-pins`.
- Severity: MUST (constant format); SHOULD (no `%n$`/`%q` in sh). Binds: all kinds.

**SH-EXP-08 Test operators by dialect (`[[ ]]`, regex, numbers).** `[ ]` vs `[[ ]]` is chosen by dialect and neither is a defect in bash. Inside `[[ ]]` quote the right side of `==` for a literal compare and leave it bare only for a glob; keep a `=~` regex in a variable (`[[ $s =~ $re ]]`), never quoted; compare numbers with `-lt`, not `<`; never write `[ a == b ]` in a zsh file.
- Why: `[[ abc =~ "a.c" ]]` is a literal compare and does not match on bash 3.2-5.3 (8/8) while `$re` matches (SE-5); `[[ 10 < 9 ]]` is lexicographic; `[ a == a ]` is an error in native zsh 5.0.8-5.9; busybox `[[` has no glob matching.
- Verify: SC2076 (warning), SC2330, SC2254; grep `grep -rn -e '\[ [^]]* == ' --include='*.sh' --include='*.zsh' DIR` over files that are not bash; no lint for zsh (SC1071).
- Red: yes. [qw] #13 (SC2076), #11 (EQEQ); SE-5.
- Severity: SHOULD. Binds: bash, ksh, zsh; sh files follow SH-EXP-10.

### B. `shellcheck -s sh` (sh dialect)

**SH-EXP-09 Print with `printf`, not `echo`, for data and in sh.** `printf '%s\n' "$v"` for anything variable or containing a backslash. In sh-dialect code (and any file sourced into sh or zsh) never `echo -e`, `echo -n`, `echo -E`, or `echo` of a backslash or a variable. In a bash-only file a literal `echo -n`/`echo -e` is tolerated; `echo "$data"` never.
- Why: `\t` is interpreted by dash, mksh, yash, posh and native zsh but not by ash x2, ksh93 x2, bash --posix, zsh sh-mode; `-e` is printed by dash/yash/posh; yash prints `-n`; a data value of `-n` or `-e` vanishes in 9 of 11 shells.
- Verify: `shellcheck -s sh` SC3037 (warning) on `echo -e/-n`; `-s dash` SC3036 (error); SC2028 (info) on `echo "a\tb"`; `grep -rn -e 'echo -[eEn]' --include='*.sh' DIR`. None sees `echo "$hostile"`: reading heuristic "is the argument data?". Overlaps SH-DIAL-12 (sh scope); this row keeps the data and non-sh scope.
- Red: yes. [qw] #3 (one printf output on 11/11), #3b, #3c.
- Severity: MUST in sh scope and for data; SHOULD for a literal `echo -e/-n` in bash-only files. Binds: INST, LIB `shell=sh`, RC under login sh, EMIT sh targets (MUST); TOOL bash (SHOULD). macOS `/bin/sh` echo: unverified: read only.

**SH-EXP-10 Keep sh code to the sh subset.** In `#!/bin/sh` files and `shell=sh` libraries use none of: `==` or `-v` in `[ ]`, `[[ ]]`, `=~`, `<<<`, `$(<file)`, `${x//a/b}`, `${x:0:1}`, `${x,,}`, `${x^^}`, `${x@Q}`, arrays, `<( )`, `**`, `++`. Use `[ ]` with `=`, `-n -z -e -f -d`, `&&`/`||` between tests, `case`, `${x#} ${x%} ${#x} ${x:-}`, `printf`, `$(cmd)`. The same `shellcheck -s sh` run also enforces SH-DIAL-09 (`$'..'`), -10 (`read -d`), -11 (`-a`/`-o`) and -17 (`local`), which SH-DIAL owns.
- Why: each is an error or a silent wrong answer in at least one of dash/ash/yash/posh: `[ a == a ]` exits 2 in dash and posh; `$(<file)` is the empty string in dash, ash x2, yash, posh; busybox ash silently ignores `${x/#he/HE}`; `${x@Q}` works only in bash >= 4.4 and mksh.
- Verify: `shellcheck -s sh` (or `-s dash`): SC3014 SC3010 SC3015 SC3011 SC3016 SC3034 SC3045 SC3057 SC3059 SC3060 SC3030 SC3054 SC2166; plus `grep -rn -e '@Q' --include='*.sh' DIR` (ShellCheck 0.11.0 is silent on `${x@Q}`); plus `M posix` on dash/ash/posh rows.
- Red: yes. [qw] #12 (22 distinct codes), #16, `pe-pins.sh` (`@Q` with no code).
- Severity: MUST. Binds: INST, LIB `shell=sh`, EMIT sh targets, RC under login sh. Not bash TOOL files.

**SH-EXP-11 sh arithmetic stays portable.** No `**`, `++`/`--`, `10#` or leading-zero literals and values in sh. For zero-padded external input strip first: `y=${x#"${x%%[!0]*}"}; y=${y:-0}; echo $((y + 1))`. Keep values below 2^31 when mksh or ksh93 are targets.
- Why: `**` errors in dash, mksh, yash, posh; `$((i++))` errors in dash; `$((010))` is 8, but 10 in mksh and ksh93; `$((08))` errors in dash, ash x2, posh, bash, zsh sh-mode; `10#` errors in dash and yash; overflow wraps at 32 bits in mksh and turns to float in ksh93.
- Verify: `shellcheck -s sh` SC3018 (`++`), SC3019 (`**`), SC3006; `M posix` on `arith-pins.sh` and `lead0.sh` (the strip idiom prints `008->9 08->9 0->1 000->1 010->11 7->8` on all 11).
- Red: yes. [qw] #12, `arith-pins.sh`, `lead0.sh`.
- Severity: MUST (`**`, `++`, `10#`); SHOULD (the zero strip). Binds: sh; in bash `10#` is the fix.

**SH-EXP-12 No brace expansion in sh; bash ranges take literals.** Count with `i=1; while [ "$i" -le 3 ]; do ...; i=$((i + 1)); done`. In bash `{1..$n}` never expands (SC2051); `{01..03}` and `{1..7..3}` need bash 4.0.
- Why: `for i in {1..3}` runs once with the literal word on dash, ash x2, mksh, yash, posh, zsh sh-mode (7 of 11); `k3s-io/k3s@82a6ddcd820b:install.sh:408` does exactly that.
- Verify: `shellcheck -s sh` SC3009; `grep -rn -e '{[0-9]*\.\.[0-9]*}' --include='*.sh' DIR` on files without a bash shebang; `M posix`.
- Red: yes. [qw] #6, #6b; SE-8.
- Severity: MUST. Binds: INST, LIB `shell=sh`, EMIT sh targets; bash 3.2 floor for the range forms.

### C. grep (ShellCheck silent or non-discriminating)

**SH-EXP-13 `eval` only on a trusted emitter.** Run `eval` only on `"$(trusted-tool ...)"` (`eval "$(ocx env --shell=bash)"`); never on a variable, argument, file content or user-influenced string; use arrays, `set --`, `printf -v` (bash 3.1+) or `read` for dynamic names; never execute `$cmd`.
- Why: ShellCheck has no check for `eval "$string"` or a bare `$cmd`, not at default and not with `-o all`; the red plant ran injected code on 11 of 11 shells.
- Verify: `grep -rnw -e eval --include='*.sh' DIR`, then read each operand (must be `"$( trusted command )"`); SC2294 covers only `eval "${arr[@]}"`.
- Red: yes. [qw] #2, #2b (ShellCheck did NOT go red), #11 (EVAL: red exit 0, green exit 1; SE-7).
- Severity: MUST. Binds: all kinds. Boundary case: `grimoire:docs/theme_check.sh:26` `eval "$2"` runs a literal from the same file; refactor to `"$@"`.

**SH-EXP-14 Pass names between commands NUL-safe.** First choice `find ... -exec cmd -- {} +`; otherwise `find ... -print0 | xargs -0 -r cmd --`, and `git ls-files -z | xargs -0 -r`. Every `xargs` carries `-0` and `-r` or a comment saying why not. In minimal containers probe `command -v find xargs`.
- Why: `xargs` without `-0` fails on a quote (`unmatched single quote`) and splits on spaces; `xargs -0` without `-r` still runs the command once on empty input on GNU and busybox 1.37; findutils is absent on 2 of 21 images (AL2023, openSUSE Leap 16.0).
- Verify (two greps; output is the violation): `grep -rnw xargs --include='*.sh' DIR | grep -v -E 'xargs([[:space:]]+-[A-Za-z0-9]+)*[[:space:]]+-[A-Za-z0-9]*0'` (no `-0`), and the same pipeline with `| grep -E '...0' | grep -v -E '...-[A-Za-z0-9]*r'` (`-0` without `-r`). The older [qw] grep (`xargs -[^0]`) misses `-0` without `-r` and flags a valid `-r0`.
- Red: yes. SE-6 (red lines 2,3,4,5 of the plant; twin empty, incl. `-0r`/`-r0`); [qw] #11 (XARGS), `find0.sh` on alpine, busybox:1.37, ubuntu:24.04, deb12.
- Severity: MUST. Binds: all kinds. BSD/macOS xargs: unverified: read only.

**SH-EXP-15 Never glob `.*`.** Use `.[!.]* ..?*` with an existence guard, or `find . -mindepth 1 -maxdepth 1` (GNU/busybox; `-mindepth` is not POSIX); never feed `.*` to `rm`, `cp`, `chmod`, `chown` or a `for`.
- Why: `.*` matches `.` and `..` on dash 0.5.12, busybox ash 1.35/1.37, yash 2.52 and bash <= 5.1; bash 5.2+ (`globskipdots`), mksh, ksh93u+m, posh, zsh skip them; POSIX.1-2024 still allows both.
- Verify: `grep -rn -e '[[:space:]]\.\*' --include='*.sh' DIR` (ShellCheck has no code); `M posix` on `glob-pins.sh`.
- Red: yes. [qw] #11 (DOTSTAR: red on `rm -rf .*`, `for f in .*`, `cp -r .*`; green on `./.[!.]*`). GNU `rm` refuses `.`/`..`; other `rm` builds were not run (an `rm` on `..` could delete the parent): unverified, not run.
- Severity: MUST. Binds: all kinds.

**SH-EXP-16 Count the parsers; pass values as positionals.** Between the author and `exec` count: local shell, ssh remote shell, `sh -c`, `docker exec`, YAML or workflow expression. Give each boundary one quoting layer, or pass the value outside the string: `sh -c 'cmd "$1"' _ "$v"`, `find -exec sh -c '... "$1" ...' _ {} +`, stdin, or environment. When a string must cross a boundary quote it for the same shell with a quoter that avoids command substitution, and put `--` before the operand:
  ```sh
  q() { # POSIX single-quote quoter; no $(...), so trailing newlines survive
    _r=$1 _o=
    while :; do case $_r in *\'*) _o="$_o${_r%%\'*}'\\''"; _r=${_r#*\'} ;; *) break ;; esac; done
    printf "'%s'" "$_o$_r"
  }
  ssh host "touch -- $(q "$file")"
  ```
- Why: each parser re-splits: `ssh host "touch $file"` with `file='a b;touch PWNED'` made 3 files on 11 of 11 shells; QuoteBench measured a 55.4 to 73.2 point loss through one added parser.
- Verify: `grep -rn -e 'sh -c "' -e 'ssh [a-z]* "' --include='*.sh' DIR`, then read each interpolation; hostile-value run asserting final state (SH-EXP-23). SC2029 (info) fires on the plant AND on the correctly quoted twin, so it is not admissible alone; SC2156 (warning) covers `find -exec sh -c "...{}"`.
- Red: yes. [qw] #7 (red exit 1 / green exit 0 on 11/11), #7b (SC2029 did not discriminate), #11 (SHC); SE-2 (the quoter above round-trips 88 of 88 cases on 11 shells).
- Severity: MUST. Binds: all kinds. The `${{ }}` to `env:` boundary is SH-CI-03; per-target emitter quoters are SH-EMIT-01..13.

**SH-EXP-17 Parse options with `getopts` or a `case` loop.** Short options: `getopts` (POSIX, no long options; reset `OPTIND=1` before a second parse; never parse its error text) or a `case "$1"` loop that honours `--`. GNU `getopt` only behind `getopt -T; [ $? -eq 4 ]`.
- Why: all 11 shells parse `-a 'x y' -v -- file one` identically but print different error text; enhanced getopt exists on util-linux and busybox 1.37 and fails on 5 of 21 images.
- Verify: `grep -rnw -e getopt --include='*.sh' DIR` lists the sites to check for the probe.
- Red: yes. [qw] #11 (GETOPT), `getopt-probe.sh` on alpine:3.22, shellzoo:deb12, ubuntu:24.04, busybox:1.37.
- Severity: SHOULD. Binds: all kinds. macOS/BSD getopt: unverified: read only.

**SH-EXP-18 Keep variable names off the shell specials.** Script variables are lowercase; in zsh never assign `path status argv pipestatus fpath cdpath manpath`; in bash never `UID GROUPS RANDOM SECONDS LINENO`; UPPER_CASE names are the environment namespace.
- Why: `local path=/z` in zsh 5.9 leaves `ls` not found (rc 127) and `status=1` is read-only; `UID=5` is a readonly error in bash.
- Verify: `grep -rn -e '^[[:space:]]*local path=' -e '^[[:space:]]*status=' -e '^[[:space:]]*local status=' -e '^[[:space:]]*fpath=' -e '^[[:space:]]*cdpath=' -e '^[[:space:]]*argv=' --include='*.zsh' DIR`; ShellCheck cannot parse zsh.
- Red: yes. [qw] #11 (ZSHVARS2), `varnames.zsh`.
- Severity: SHOULD. Binds: zsh files and libraries sourced by zsh (RC, LIB).

### D. Matrix or hostile-value runs

**SH-EXP-19 Validate external text before arithmetic.** Before `$(( ))`, `(( ))`, `let`, `declare -i`, an array subscript or `[[ ... -eq ... ]]` (and `[ ... -eq ... ]` under mksh or posh) check the value: `case $x in '' | *[!0-9]*) die ;; esac` (add a sign branch if needed); write names without `$` inside `(( ))`.
- Why: `x='a[$(touch PWNED)]'; (( x > 1 ))` created `PWNED` on bash 3.2, 4.0, 4.2, 4.4, 5.0, 5.1, 5.2, 5.3 (8 of 8); also on mksh R59c and posh 0.14.1 even through `[ -gt ]`; not on dash, ash, ksh93u+m, yash, zsh for this payload.
- Verify: no ShellCheck code exists (issue 2679 open since 2023-02-01). Hostile-value run: feed `a[$(touch PWNED)]` as every external input (argument, environment, stdin line) and assert no file appears, checking final state, never exit status; reading heuristic: every arithmetic operand is a literal, a loop counter, or has passed a `case` check.
- Red: yes. [qw] #4, #4b, #4c, #4d; SE-9 (red `RESULT red (PWNED created)` exit 1 on 8/8; validated twin exit 0 on 8/8). ShellCheck did NOT go red (#4e).
- Severity: MUST. Binds: bash (every version), mksh, posh.

**SH-EXP-20 Empty arrays under `set -u` on a 3.2 floor.** In a bash script with `set -u` whose floor is below 4.4 (every unpinned script: floor 3.2) expand an array that may be empty as `${a[@]+"${a[@]}"}`; a script pinned to >= 4.4 may write `"${a[@]}"`.
- Why: `"${a[@]}"` on an empty array aborts with `a[@]: unbound variable` and exit 1 on bash 3.2, 4.0, 4.2; fine from 4.4; the guarded form returns `argc=0` on all 8 versions (and zsh).
- Verify: `M bash argv-array.sh` (bare form exit 1 on 3.2/4.0/4.2) and `argv-array-guard.sh` (exit 0 on 8/8); no grep can see emptiness at run time: candidates by reading (arrays declared `()` or `local -a`, expanded under `set -u`).
- Red: yes. [qw] #2c; SE-8. Overlaps SH-ERR-09 and the fleet `quality-bash.md` advice that this overturns; the expansion form lives here.
- Severity: MUST for a 3.2 floor. Binds: TOOL and CI on macOS runners; LIB with a 3.2 caller.

**SH-EXP-21 Make unmatched-glob behaviour explicit.** sh/bash: `for f in ./*.x; do [ -e "$f" ] || continue; ...`; bash `nullglob`/`failglob` only inside a function or subshell and never before a command that defaults to the cwd or stdin (`ls`, `cat`); zsh `*.x(N)` or `setopt nullglob`; in fish expect an error.
- Why: the pattern stays literal on all 11 POSIX-mode shells and bash 3.2-5.3 (the loop runs once); under `nullglob` `ls *.zzz` becomes plain `ls`; native zsh 5.0.8-5.9 aborts with `no matches found`; fish 3.6-4.9 errors.
- Verify: reading heuristic plus `M posix|bash|zsh glob-pins.sh`; no lint code exists.
- Red: differential matrix only (#16), no red/green pair.
- Severity: SHOULD. Binds: all kinds.

**SH-EXP-22 Literal text and captured output.** Generate literal text with a quoted here-doc (`cat <<'EOT'`; `<<-` strips tabs only); keep trailing newlines of captured output with `x=$(cmd; printf x); x=${x%x}`; use `$(<file)` and `$'..'` only in bash, ksh, zsh and mksh files.
- Why: command substitution strips all trailing newlines (11/11); `$(<f)` is empty in dash, ash x2, yash, posh; `$'a\tb'` prints the literal `$a\tb` on dash 0.5.12, yash 2.52, posh 0.14.1.
- Verify: `shellcheck -s sh` SC3034 and SC3003; reading heuristic for the sentinel.
- Red: yes for the SC codes (#12); the sentinel is a measured pin only (`cmdsub-pins.sh`).
- Severity: CONSIDER. Binds: sh scope; `$'..'` in sh is SH-DIAL-09.

### E. Reading heuristic

**SH-EXP-23 Verify by final state, not exit status.** A test for any quoting or injection rule feeds hostile values (`a b`, `-dash`, a newline, `'`, `$`, `a[$(cmd)]`) and asserts the resulting files, argv or bytes.
- Why: QuoteBench: 23.4 to 47.0% of failing executions exit 0 while leaving the wrong final state.
- Verify: reading heuristic on each test (every fixture in `fixtures/quoting-and-words/` derives its `RESULT` from filesystem state).
- Red: not applicable (heuristic).
- Severity: SHOULD. Binds: test and verification code of every kind.

### Hand-offs (owned by other families; not authored here)

| Fact measured in [qw] | Owner | Note |
|---|---|---|
| Gate runs `shellcheck FILES` at default severity; never-disabled set SC2155 SC2164 SC2162 SC2115 SC2068 | SH-GATE-01, SH-GATE-06 | SH-EXP-01 cites them; C2 asks SH-CI-15 to follow |
| `$'..'`, `read -d`, `-a`/`-o`, `local`, pipefail probe in sh | SH-DIAL-07/09/10/11/17 | enforced by the same `shellcheck -s sh` run as SH-EXP-10 |
| Empty-array idiom under `set -u` | SH-ERR-09, [dial] BVG-16 | form owned by SH-EXP-20; policy by SH-ERR |
| `${{ }}` into `run:` (injection) | SH-CI-03/04 | SH-EXP-16 counts the YAML boundary only |
| Per-target quoters, `printf %q`/`${x@Q}` never emitted, `$'..'` never emitted | SH-EMIT-01..13 | SH-EXP-07 and SH-EXP-16 give the script-side half |
| zsh: no splitting by default, `${=x}`, `emulate -L sh`, unquoted-glob abort, `path` (SH-EXP-18 is the grep) | SH-ZSH | measured on zsh 5.0.8, 5.3.1, 5.8, 5.9 ([qw] §20) |
| fish: `$?` is a parse error on 3.6-4.9, `{1..3}` literal; nushell: `let-env`, `def-env`, `str collect`, `str find-replace` fail identically on 0.105.1 and 0.116.0 | SH-FISH, SH-NU | [qw] §20 |
| PowerShell: `Invoke-Expression` (PSSA `PSAvoidUsingInvokeExpression`, Warning, red/green), curly quote U+2019 closes a single-quoted literal on 5.1, 7.4, 7.6.6, 7-only syntax on 5.1 | PS-SEC, PS-COMPAT, SH-EMIT-06/07 | [qw] §5, §20, #15 |

### Consolidation runs (2026-10-11)

All under `/home/mherwig/.cache/research-lang/shell-tools/fixtures/shell-expansion/`; ShellCheck 0.11.0, shfmt 3.13.1, actionlint 1.7.12. The recorded [qw] fixtures were re-run from `fixtures/quoting-and-words/`.

- **SE-1 severity table** (`shellcheck -f json1` on `sc-red.bash`): SC2086 info; SC2046, SC2048, SC2206, SC2207, SC2044, SC2038, SC2010, SC2294, SC2076, SC2155, SC2164, SC2166 warning; SC2068, SC2070, SC2045 error; SC2035, SC2059, SC2162, SC2028, SC2029, SC2030, SC2031 info. SC2012 and SC2115 are absent from that plant and were measured on other plants ([qw] #5b).
- **SE-2 quoter round trip** (`quoter.sh`, `M posix`, 8 values x 2 quoters x 11 shells): `q1` (command-substitution) `ok` 66 of 88 with `trailnl` and `twonl` BAD on all 11; `q2` (SH-EXP-16) `ok` 88 of 88.
- **SE-3 IFS prologue** (`ifs-prologue.bash`, `M bash`, 8 versions identical): `space-in-name argc=1 (want 1)`, `glob-in-value argc=3 (want 1)`, `empty-var argc=1 (want 2)`, `tab-in-name argc=2 (want 1)`.
- **SE-4 pipeline-while** (`pipewhile-red.sh`): `pipewhile-red.sh:4:5 note SC2030`, `:6:9 note SC2031`; at `-S warning` only the unrelated SC2034 remains. `M posix`: `n=0` on dash, ash x2, mksh, yash, posh, bash 3.2/5.2 --posix, zsh sh-mode; `n=2` on ksh93u+m x2. Here-doc twin `pipewhile-green.sh`: `n=2` on 11/11.
- **SE-5 `=~` quoting** (`regex-quote.bash`, `M bash`): bash 3.2, 4.0, 4.2, 4.4, 5.0, 5.1, 5.2, 5.3 all print `var-regex : match`, `quoted-lit : no-match`.
- **SE-6 xargs greps** (`greps/red/plant.sh`, `greps/green/plant.sh`): no-`-0` grep prints `red/plant.sh:2` and `:5`, empty on green (exit 1); no-`-r` grep prints `:3` and `:4`, empty on green (`-0 -r`, `-0r`, `-r0`, `-exec {} +` all pass).
- **SE-7** the 13 recorded greps (`quoting-and-words/greps/run-greps.sh`): every one exits 0 with output on `red/` and 1 (empty) on `green/`.
- **SE-8** `M posix brace.sh`: `loop-ran=1 last=[{1..3}]` on dash, ash x2, mksh, yash, posh, zsh sh-mode; `loop-ran=3` on ksh93u+m x2, bash 3.2/5.2 --posix. `M bash argv-array.sh`: bash 3.2 `extra[@]: unbound variable`; 4.4-5.3 `argc=0`.
- **SE-9** `M bash arith-red.sh`: `RESULT red (PWNED created)`, exit 1 on 8/8; `arith-inject-ok.sh`: `RESULT green`, exit 0 on 8/8 (run from the SE directory so the scratch dir is not created in the recorded fixture dir).
- **SE-10 actionlint** (`al/.github/workflows/q3.yml`, `cp $f dst/` plus three `>>` redirects): default prints `SC2086:info` and `SC2129:style`; `SHELLCHECK_OPTS='--severity=warning'` prints nothing, exit 0; `SHELLCHECK_OPTS='--exclude=SC2129'` prints `SC2086:info` only; the quoted twin `q-green.yml` under `--exclude` exits 0.
- **SE-11 lines to array** (`lines-to-array.bash`, `lines-to-array2.bash`, `M bash`, 8 versions identical): the BVG-16 loop gives `n=3` (final unterminated line `d` lost); with `|| [ -n "$l" ]` it gives `n=4 [a b] [c] [] [d]`.
- **SE-12 fleet census** (`fleet-census.py`, 200 authored files by `.sh`/`.bash` or shebang from `fleet-shape/classified.json`): `echo -e/-n` 0 lines; `xargs` without `-0` 0; `getopt` 0; `{N..M}` 0; `sh -c "`/`ssh h "` 0; `eval` 2 lines outside doc snippets; `$(ls ...)` 2 lines; pipeline-into-`while` 2 lines; recursive `rm` of an unguarded variable path 36 lines in 7 repos (12 inside a `trap`) against 1 guarded with `${v:?}`.

## Applied to the fleet and exemplars

Fleet paths are `<repo>:<path>:<line>` at the HEADs read on 2026-10-11 (`ocx` research-time `5de9d777eb7d`, HEAD `3485207c183e` has the same lines; `setup-grimoire@1259e35b2550`, `grimoire@4650ad830375`, `www-setup@a251c3631047`, `oras-www@3f9c279bdd83`, `creeptd-ng@a58c8bef5100`). Exemplar paths use the SHAs in `shell-audit/scratch/exemplar-shas.md`.

### Already satisfied

| Rule | Evidence |
|---|---|
| SH-EXP-01 | Authored fleet code is quiet: 4.9 findings/KLOC, `ocx` 1.4, 0 SC2086 and 0 SC2115 in ocx today ([qw] §18); the generated `ocx` trampoline quotes `"${0##*/}" "$@"` (`[cfg]` §6.4). Exemplars clean at scale: mise 0.37 findings/file over 300 files, rustup 0.27, fish-shell 0.11 (`[ex]` axis 4) |
| SH-EXP-02 | `docker/docker-install@2b32480025b2:rootless-install.sh:247,250` (`set -- "$@" --force`); swift-quality checks use `${arr[@]+"${arr[@]}"}` (`grimoire-lore:rules/swift-quality/checks/tsan-check.sh:32`) |
| SH-EXP-04 | `jdx/mise@19e8c8f0d03d:scripts/release.sh:12` `rm -rf "${RELEASE_DIR:?}/$MISE_VERSION"`; `shellspec/shellspec@f2d13f991885:lib/libexec/kcov-executor.sh:45`; fleet `ocx:test/scripts/sync_index_conformance.sh:146` `rm -rf -- "${target:?}/${dst}"` (the only guarded recursive delete in 200 authored files, SE-12) |
| SH-EXP-09 | Authored fleet code has 0 `echo -e/-n` (SE-12; `[fleet]` #6: 0 in 190 sh-shebang files) |
| SH-EXP-10 | 0 of 190 fleet sh-shebang scripts carry an SC3xxx; the one `local` is probed (`www-setup/src/install.sh:5,39`); 119 of 121 declared-POSIX installers parse on all 11 shells, the two failures are yash in a C locale on non-ASCII bytes (`[inst]` 3a) |
| SH-EXP-13 | `ocx:test/doc_scripts/user-guide__toolchain-activation.sh:17` `eval "$(ocx env --shell=bash)"` |
| SH-EXP-14 | swift-quality checks: `xargs -r -0` in `grimoire-lore:rules/swift-quality/checks/generated-touch.sh:21`, `k07.sh:73`; 0 `xargs` without `-0` in 200 authored files |
| SH-EXP-12, 15, 16, 17 | 0 hits for `{N..M}`, `.*` operands, `sh -c "`/`ssh h "` and `getopt` in the authored fleet (SE-12); rustup uses `getopts` (`rust-lang/rustup@61271d00a979:rustup-init.sh:152`) |

### Violated

| Rule | Where | What |
|---|---|---|
| SH-EXP-01 | `oras-www:tools/parse.sh:24` `oras help ${COMMAND} >${TEMPFILE}`; `tools/list_commands.sh:6`; `tools/parse.sh:29` | 47 findings in 406 LOC, the worst authored code (`[fleet]` smell 10) |
| SH-EXP-01 | agent research scratch, e.g. `grimoire-lore:.agents/research/cmake-targets-and-abi/scratch/verify-targets-and-abi/run.sh` | SC2086 x50 in one file; 183 of the fleet's 278 SC2086 sit in 129 agent-written scratch files (79.2 findings/KLOC vs 4.9 authored) |
| SH-EXP-01, 03 | CI `run:` bodies hidden by the warning floor: `grimoire:.github/workflows/release.yml:124,295`; `oras-www:.github/workflows/vale.yaml:11`; `arcana:.github/workflows/publish.yml:77`; `e2e-mirror:.github/workflows/mirror-signing.yml:186`; `grimoire-vscode:.github/workflows/release.yml:79,83`; `vscode-ocx:.github/workflows/release.yml:70,74` | SC2086 x8 and SC2035 x4 (`*.vsix` glob), found by actionlint at default severity (`[ci]` §11); `ocx` runs actionlint with `--severity=warning` on purpose (`ocx:taskfiles/ci.taskfile.yml:17-25`) |
| SH-EXP-01 (gate) | `ocx@5de9d777eb7d:taskfiles/shell.taskfile.yml:37-38` (`git ls-files ... \| tr '\n' ' '` into unquoted `{{.FILES}}`, `shellcheck -S warning`); `setup-grimoire@1259e35b2550:Taskfile.yml:25-26`; `grimoire@4650ad830375:taskfiles/shell.taskfile.yml:10-18` (`echo "$files" \| xargs shellcheck`, skips with exit 0 when ShellCheck is missing) | `-S warning` would hide 404 of 521 fleet findings (78%) incl. every SC2086; ocx is clean today only at that floor: default severity gives 20 info findings in 9 files (SC1091 x8, SC2016 x6, SC2012 x5 at `.github/actions/bazel-cache-rc/selftest.sh:189,201,232,376,460`, SC2015 x1); the grimoire shape never analyses `my script.sh` and exits 123 ([qw] #9) |
| SH-EXP-03 | `creeptd-ng:scripts/build-wasm.sh:40-41` `$(ls "${DIST_DIR}"/creeptd-client-*.js ... \| grep -v '_bg' \| head -1)` | parses `ls` output (SC2012) |
| SH-EXP-04 | 36 unguarded recursive deletes of a variable path in 7 repos (ocx 19, www-setup 7, grimoire 3, oras-www 3, index 2, ocx-mirror 1, setup-grimoire 1), 12 of them inside `trap '...' EXIT`: e.g. `www-setup:scripts/gen-dist.sh:192`, `grimoire:test/manual/scripts/teardown.sh:16`, `ocx:test/scenarios/offline/reinstall-after-clean-and-purge.sh:26`; exemplar `nvm-sh/nvm@b1b3a0038c06:nvm.sh:2880,2886,2899` | bounded by a non-empty suffix or `set -u`, so SHOULD-level; 0 SC2115 findings fleet-wide |
| SH-EXP-05, 06 | `oras-www:tools/list_commands.sh:6` (`| while read LINE`, no `-r`); `tools/parse.sh:29` (`cat ${TEMPFILE} \| while read -r LINE`) | SC2162 x2 authored; the only two pipeline-into-`while` sites |
| SH-EXP-12 | `k3s-io/k3s@82a6ddcd820b:install.sh:408` `for i in {1..3}` under `#!/bin/sh` | the retry loop runs once on 7 of 11 shells |
| SH-EXP-13 | `grimoire:docs/theme_check.sh:26` `eval "$2"` (test DSL, literals from the same file); `grimoire:test/manual/scripts/env.sh:17` `eval` of a constant string | no injection path today; refactor to `"$@"` |
| SH-EXP-16 | `www-setup:.github/workflows/test-installers.yml:206-207` `echo '${{ inputs.release_tag }}' \| sed ...` | the one real injection shape in the fleet (a dispatch input with `'` breaks out); repair is `env:` (SH-CI-03) |
| SH-EXP-20 | six authored bash scripts with seven arrays expanded bare under `set -u` (static candidates; emptiness at run time not determined): `index:scripts/smoke-test.sh:85,447`; `ocx:test/manual/scripts/bootstrap.sh:61,82,102,120`; `ocx:test/manual/announce-e2e/scripts/run_sequence.sh:313`, `clean_install_check.sh:37`, `run_machine_lane.sh:22`; `setup-grimoire:.github/scripts/install.sh:82` (`[fleet]` axis 5); 0 `BASH_VERSINFO` guards fleet-wide | abort on macOS `/bin/bash` 3.2 |
| SH-EXP-09 | exemplars: `Homebrew/install@8ab1549dfa11:uninstall.sh:559` (bash, works there), `dotnet/install-scripts@e5cf1dd2d154:eng/common/cross/build-rootfs.sh:517`, `k3s-io/k3s@82a6ddcd820b:contrib/util/generate-custom-ca-certs.sh:155`; corpus totals `echo -e` 120 lines in 30 files, `echo -n` 138 lines in 44 | exemplars only; the fleet is clean |
| SH-EXP-19 | not measured for the fleet: 27 arithmetic lines outside doc snippets in 6 repos (e.g. `index:scripts/smoke-test.sh:171,173`), 425 `$(( ... $var ... ))` lines in the exemplar corpus, none traced to external input | open question below |

### New commitments for the fleet

1. **Gates (ocx, setup-grimoire, grimoire).** Remove `-S warning`; discover files with `git ls-files -z | xargs -0 -r shellcheck`; make `grimoire`'s gate fail closed; run actionlint at default severity with `SHELLCHECK_OPTS='--exclude=<named style codes>'`. The profile is SH-GATE's; the evidence and the 12 live run-block findings above are this family's.
2. **Hostile-value tests** for any script that handles names or crosses a parser (SH-EXP-16, 19, 23): the fixtures in `fixtures/quoting-and-words/` (`split-red.sh`, `argv-red.sh`, `arith-red.sh`, `parsers-red.sh`) are the starting corpus, each asserting final state.
3. **`oras-www/tools/*.sh`** are either quoted and put under a gate or deleted from the authored set; the lore research-scratch scripts get the same default-severity ShellCheck run before an agent leaves them in a repo.
4. **Installers (www-setup, setup-grimoire).** Keep the sh subset (SH-EXP-10) as a matrix run on dash 0.5.12, busybox ash 1.37 and bash 3.2 --posix (SH-DIAL-04); add `${v:?}` to the `trap` deletes (SHOULD).
5. **macOS-reachable bash scripts (six in the SH-EXP-20 row)** adopt the guarded array form or the `BASH_VERSINFO` guard of SH-DIAL-06.
6. **ocx emitter.** The shell text it emits for sh targets must pass `shellcheck -s sh` and the SH-EXP-09/10/12/22 deny-list through `matrix.sh posix`; escaping itself stays SH-EMIT. Reported, not fixed (owner Q6): the emitter's activation text is not currently run through the sh deny-list (unmeasured here).

## AI-agent failure modes

Ranked by measured frequency, then by damage. Every check below was watched going red unless marked.

| # | Failure | Evidence of how often it bites | Mechanical check |
|---|---|---|---|
| 1 | Unquoted `$var`, `$(cmd)`, `$@` (`cp $f dst`, `echo $x`) | SC2086 278 of 521 fleet findings, 183 in agent scratch; 4,387 corpus; SC2046 252 | `shellcheck` default severity: SC2086 SC2046 SC2068 (SH-EXP-01) |
| 2 | Gate set to hide it (`-S warning`, `--severity=warning`) because the fleet taskfile does | 78% of fleet findings hidden; 12 live run-block findings hidden in 8 blocks | grep `shellcheck.* -S (warning\|error)`, `--severity=`, `SHELLCHECK_OPTS.*severity` (SH-GATE-01; SE-10) |
| 3 | `for f in $(ls)`, `$(find)`, `cp *.txt`, `rm *` without `./` or `--` | SC2035 73, SC2012 46 corpus; `creeptd-ng` build-wasm | SC2045 SC2044 SC2035 SC2012 + grep LS (SH-EXP-03) |
| 4 | Arrays by splitting (`a=($(cmd))`) and following SC2207 into `mapfile` on a 3.2 floor | SC2206+SC2207 234 corpus; `mapfile` in 3 authored fleet files | SC2206 SC2207; `M bash` on 3.2 (SH-EXP-02, 20) |
| 5 | `read` without `-r`; last line lost; `cmd \| while read` then reading the variable; child eats stdin | SC2162 100, SC2031 85 corpus | SC2162, SC2030/SC2031 (SH-EXP-05, 06; SE-4) |
| 6 | Command as a string: `eval "$cmd"`, `$cmd`, `sh -c "...$v..."` | ShellCheck silent; red plant ran injected code 11/11 | `grep -rnw -e eval`; grep SHC (SH-EXP-13, 16) |
| 7 | `rm -rf "$dir/"*`, `rm -rf .*` | Steam #3671; 36 unguarded recursive deletes in the fleet | SC2115 SC2164; grep DOTSTAR (SH-EXP-04, 15) |
| 8 | `echo -e`, `echo -n`, `echo "$var"`, `printf "$var"` under `#!/bin/sh` | 4-against-4 shell split; 0 in the authored fleet, 120 `echo -e` lines in the corpus | SC3037 SC3036 SC2028 SC2059; grep ECHO (SH-EXP-07, 09) |
| 9 | Bashisms under `#!/bin/sh` (`[[`, `==`, `$'..'`, `${x//}`, `<<<`, `read -d`, `{1..3}`, arrays) | rare: 0 of 190 fleet sh scripts, 3.5% of exemplar sh files (C9) | `shellcheck -s sh` SC3xxx; `M posix` (SH-EXP-10, 12) |
| 10 | Interpolating into a second parser (`ssh host "..."`, `sh -c "..."`, `docker exec`, YAML) | QuoteBench -55.4 to -73.2 points; 1 real fleet shape | grep SHC; hostile-value run; SC2029 is non-discriminating (SH-EXP-16) |
| 11 | Untrusted text into `$(( ))`, `(( ))`, `[[ -eq ]]` | executes on bash 3.2-5.3 (8/8), mksh, posh; no ShellCheck code | hostile-value run; `case *[!0-9]*` reading check (SH-EXP-19) |
| 12 | Proving a fix by exit status | QuoteBench: 23.4 to 47.0% of failures exit 0 | final-state assertion in the test (SH-EXP-23, heuristic) |
| 13 | `xargs` without `-0 -r`; `find \| xargs rm` | GNU and busybox 1.37 run once on empty input | the two xargs greps (SH-EXP-14; SE-6) |
| 14 | bash 4+ forms on a 3.2 floor: empty `"${a[@]}"` under `set -u`, `${x,,}`, `declare -A` | 6 fleet scripts, 0 version guards; ShellCheck has no 3.2 target | `M bash` on 3.2; denylist of SH-DIAL-06 (SH-EXP-20) |
| 15 | zsh assumed to split `$x` like bash; `[ a == b ]`; `local path` | `ls` vanishes on 5.9; ShellCheck refuses zsh (SC1071) | `M zsh`; grep ZSHVARS2 (SH-EXP-08, 18); depth in SH-ZSH |
| 16 | Old nushell/fish/PowerShell syntax (`let-env`, `def-env`, fish `$?`, `??`, ternary, `&&` on 5.1) | identical failures on nu 0.105.1 and 0.116.0; fish 3.6-4.9 parse error; WinPS 5.1 parse errors | `M nu|fish|pwsh` (hand-off to SH-NU, SH-FISH, PS-COMPAT) |

## Open questions

Owner decisions (the default is what the program applies until overturned):

1. **Actionlint floor.** SH-GATE-01 and SH-CI-15 disagree (C2). Default: default severity plus named `--exclude=` codes; SH-CI-15 is rewritten to match when the CI set is consolidated.
2. **`echo` in bash-only files.** The map applies the echo rule globally; C3 scopes it. Default: MUST in sh scope and for data, SHOULD for a literal `echo -n`/`-e` in bash TOOL files.
3. **Who owns the empty-array form.** SH-EXP-20, SH-ERR-09 and [dial] BVG-16 each carry a variant. Default: SH-EXP-20 owns the expansion form and its verification; SH-ERR cites it; BVG-16's loop is replaced by the `|| [ -n "$l" ]` form (C8).
4. **Overlap with SH-DIAL on sh constructs.** `$'..'`, `read -d`, `-a`/`-o`, `local`, echo-in-sh appear in both families. Default: SH-DIAL owns the construct list and floors, SH-EXP-10 owns the operator/expansion deny-list, SH-EXP-09 owns echo including data; the `shellcheck -s sh` run is authored once in `gates.md`.
5. **Ship the quoter?** SH-EXP-16 gives `q()` inline. Default: inline only, no helper script in the rule set (the rules stay text).
6. **`eval "$2"` test DSLs.** Default: refactor to `"$@"`; no exception for literals authored in the same file.
7. **macOS evidence.** Every BSD/macOS statement here is read only. Default: one dispatched macos-runner workflow (a verification workflow, within the standing CI grant) runs `echo.sh`, `find0.sh`, `getopt-probe.sh`, `glob-pins.sh` and `printf-pins.sh` and the results replace the "unverified" tags.

Subareas that deserve another research round:

- **expansion/option-and-pattern-injection.** Which data operands besides file names need protection: leading-`-` arguments (`grep "$pat"`, `printf -- "$x"`), patterns interpolated into `sed`/`awk`/`grep -e`/`find -name` programs? Which of GNU, busybox 1.37 and uutils honour `--`, `-e`, `-F`, and does any ShellCheck code catch the interpolation? SH-EXP-03 covers file names only.
- **expansion/arithmetic-reach.** Other payload shapes (backticks, `1 + a[$(cmd)]`, nested expansion) in mksh, posh and ksh93u+m, where dash did not fire; and a reading pass of the 27 fleet arithmetic sites for external input.
- **expansion/macos-bsd-evidence.** Question 7: BSD `xargs -r`, `find -exec +`, `getopt`, `printf`, `echo` in macOS `/bin/sh`, `sed`/`grep` flag sets, run on a real macOS runner.
- **expansion/zsh-semantics** (belongs to wave 3, alt-shells/zsh). Which of SH-EXP-01..23 hold in native zsh, which need zsh forms (`${=x}`, `(@)`, `setopt` flags), given that ShellCheck cannot parse zsh and so every zsh check is a grep or a run.

## Sub-artifacts

- [quoting-and-words](shell-expansion/quoting-and-words.md): the one dive for this group; 27 candidate rules (SH-EXP-01..27), measured tables for echo, printf, read, test, arithmetic, globs, string operations on the 11-shell POSIX matrix plus bash 3.2-5.3, zsh, fish, nushell and PowerShell, 17 red/green verification runs, the `-S warning` gate chase, and the QuoteBench added-parser evidence. Mapping from its candidates to this ruleset: 01 -> 01; 02 -> SH-GATE-01 (folded into 01, C2); 03 and 04 -> 02; 05 -> 13; 06 -> 20; 07 -> 03; 08 -> 14; 09 -> 09; 10 -> 07; 11 -> 05; 12 -> 06; 13 -> 10 and 11; 14 -> 08; 15 -> 19; 16 -> 11; 17 -> 12; 18 -> 21; 19 -> 15; 20 -> 04; 21 -> 16; 22 and 23 -> 22; 24 -> 17; 25 -> 18; 26 -> hand-offs; 27 -> 23.

## Key sources

1. https://mywiki.wooledge.org/BashPitfalls — 65 numbered pitfalls (last edited 2025-07-18); #1-#3, #8, #14, #22, #41, #45-#47, #59, #61, #62, #65 reproduced in [qw].
2. https://www.shellcheck.net/wiki/SC2086 — the quoting check, its exceptions (`${v:+}`, arrays, `set -f`).
3. https://www.shellcheck.net/wiki/SC2115 — `${var:?}` for `rm -rf "$v/"*`; links the Steam incident.
4. https://www.shellcheck.net/wiki/SC2029 — ssh client-side expansion; why it cannot be the only check.
5. https://github.com/koalaman/shellcheck/issues/2679 — arithmetic injection lint request, open since 2023-02-01.
6. https://arxiv.org/abs/2608.13547 — QuoteBench (2026-08-13): added-parser loss 55.4-73.2 points, 23.4-47.0% exit-zero failures.
7. https://google.github.io/styleguide/shellguide.html — Google Shell Style Guide: quoting, arrays, eval, wildcard expansion.
8. https://unix.stackexchange.com/questions/65803/why-is-printf-better-than-echo — echo history and portability.
9. https://github.com/ValveSoftware/steam-for-linux/issues/3671 — `rm -rf "$STEAMROOT/"*` incident (2015-01-14).
10. https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html — POSIX.1-2024 shell command language (field splitting, arithmetic, dot and dot-dot).
11. https://pubs.opengroup.org/onlinepubs/9799919799/utilities/echo.html — POSIX.1-2024 echo ("implementation-defined", use printf).
12. https://pubs.opengroup.org/onlinepubs/9799919799/utilities/test.html — POSIX.1-2024 test: `-a`/`-o` removed, `-ef/-nt/-ot` added.
13. https://tiswww.case.edu/php/chet/bash/NEWS — bash NEWS 3.2 to 5.3 (`globskipdots`, `array_expand_once`).
14. https://github.com/rhysd/actionlint/blob/main/docs/checks.md — what actionlint passes to ShellCheck in `run:` bodies.
15. https://mywiki.wooledge.org/BashFAQ/050 — "Variables hold data. Functions hold code."

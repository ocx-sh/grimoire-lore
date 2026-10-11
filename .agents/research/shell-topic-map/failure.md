---
title: Shell scripting failure corpus — antipattern catalogs, postmortems, recurring bugs, agent failures
corpus: failure (BashPitfalls, BashFAQ, ShellCheck wiki and issues, bats/shfmt/task trackers, incident postmortems, vendor breaking-change notes, agent-failure writeups)
agent: landscape scout (failure corpus)
model: sonnet
date_researched: 2026-10-10
sources_count: 46
scope: |
  Which recurring failure classes decide shell-script quality and portability across POSIX sh, bash 3.2 to 5.3, zsh, fish 3/4, nushell, elvish, Windows PowerShell 5.1 and pwsh 7, CI shells and shell emitters.
  Ranked by frequency x damage, with the mechanical check (or its absence) per class. Measured claims were run on the matrix (dash, busybox ash, mksh, ksh93u+m, yash, posh, bash 3.2-5.3, zsh 5.0.8-5.9, fish 3.6-4.9.3, nu 0.105.1/0.116.0, pwsh 7.4/7.6.6, Windows PowerShell 5.1.26100.9444, Git Bash 5.2.15).
  macOS-only claims are read-only and labelled so; no macOS host was available.
---

# Shell scripting failure corpus

## Table of contents

1. [Summary](#summary)
2. [Survey](#survey)
   1. Wooledge BashPitfalls, classified
   2. BashFAQ entries that exist because of a recurring bug
   3. ShellCheck: the wiki, optional checks, and what it measurably cannot see
   4. ShellCheck most-triggered codes, measured on the exemplar corpus
   5. Tracker corpus: shellcheck, bats-core, mvdan/sh, go-task
   6. Incidents: Steam, Bumblebee, Shellshock, truncated installers
   7. GitHub Actions: shell defaults and script injection
   8. CRLF, BOM and shebang failures (measured)
   9. POSIX.1-2024, dash, busybox and the sh family (measured probes)
   10. bash 3.2 to 5.3: what each version adds, and errexit drift (measured)
   11. zsh: sourcing bash code (measured)
   12. fish 3 to 4 breaking changes (changelog plus measured)
   13. nushell: per-release breaking changes and agent traps (changelog plus measured)
   14. elvish breaking changes
   15. PowerShell 5.1 versus 7: breakages (docs plus measured on the real host)
   16. Windows Git Bash / MSYS (measured)
   17. Userland: macOS/BSD, busybox, uutils
   18. AI-agent failure writeups
   19. Stack Overflow and Unix SE canonical questions
3. [Candidate topics](#candidate-topics)
4. [Recent shifts seen in this corpus](#recent-shifts-seen-in-this-corpus)
5. [Contested](#contested)
6. [Sources](#sources)

## Summary

- The failure corpus converges on one root class: **unquoted expansion** (word splitting plus globbing). It is 12 of the 65 numbered BashPitfalls entries, SC2086 is the single most-triggered ShellCheck code, and it was 1445 of 3854 findings across 1035 exemplar `.sh` files (measured, ShellCheck 0.11.0).
- **`set -e` is the second root class and the one a linter cannot settle.** The rules about when errexit is ignored (function in an `if`/`||` condition, command substitution, `&&` lists, `!`) are version- and shell-dependent, and ShellCheck only reports them behind optional checks `check-set-e-suppressed` (SC2310/SC2311) and `check-extra-masked-returns` (SC2312). BashPitfalls #60 and BashFAQ/105 argue against relying on it at all.
- **`set -euo pipefail` is cargo-culted and contested.** Agent rule files and CI defaults (`bash --noprofile --norc -eo pipefail {0}`) push it; Wooledge pitfalls #60.1-#60.3 document its holes. `local x=$(false)` returned status 0 under all 9 of the 11 `sh`-family interpreters measured that implement `local` (ksh93u+m has none).
- **ShellCheck cannot see userland or bash-version portability.** With `#!/bin/bash`, ShellCheck 0.11.0 flagged none of `sed -i`, `readlink -f`, `date -d`, `grep -P`, `mapfile`, `declare -A`, `${x,,}`, `[[ -v x ]]`, `wait -n`, `stat -c`, `sort -V`, `find -printf` (measured); there is no "target bash 3.2" setting ([koalaman/shellcheck#2615](https://github.com/koalaman/shellcheck/issues/2615), open). Those rules need a matrix run or a grep denylist.
- **`-s sh` mode is thorough for syntax and builtins** (SC3xxx flagged 22 of 25 probes; the 3 misses were `which`, `sed -i`, `readlink -f`, all userland). It still emits SC3040 for `set -o pipefail`, which POSIX.1-2024 now requires.
- **`#!/bin/sh` is not one shell.** `set -o pipefail` works in Debian 13's dash 0.5.12-12 and Alpine ash but fails in Debian 12 and Ubuntu 24.04 dash and in posh (measured). `echo "a\tb"` interprets the escape in dash/mksh/yash/posh and not in bash/ksh93/busybox. `bash --posix` accepts `${x,,}`, arrays and `<(...)` in 5.2, so it is not a portability test.
- **bash 3.2 versus 4+ is a short, enumerable list** (measured per version): `mapfile`/`readarray`, `declare -A`, `${x,,}`/`${x^^}`, `[[ -v ]]`, `&>>`, `|&`, `coproc` need 4.0+; negative array index and `printf %(%s)T` 4.2+; `local -n`, `wait -n` 4.3+ (4.4 measured); `${x@Q}`, `inherit_errexit`, `mapfile -d` 4.4+; `EPOCHREALTIME` 5.0; `${x@U}`, `SRANDOM` 5.1; `${ cmd; }` 5.3. Empty `"${a[@]}"` under `set -u` is an error in 3.2-4.3.
- **Line endings and BOMs break scripts before any code runs.** CRLF in the shebang gives `/bin/sh^M: bad interpreter` (SO 14219092, 875 votes); CRLF inside a script gives `syntax error: unexpected end of file` (measured); a UTF-8 BOM makes line 1 `#!/bin/sh` a command-not-found (measured). Windows PowerShell 5.1 needs the opposite: a BOM, or it reads UTF-8 as ANSI (measured: `café` became 5 chars).
- **PowerShell 5.1 versus 7 breaks in five measured places:** `&&`/`||`/ternary are parse errors in 5.1; `$IsWindows` is `$null` in 5.1; `$OutputEncoding` is us-ascii in 5.1; native stderr under `2>&1` plus `$ErrorActionPreference='Stop'` throws in 5.1 but not in 7.4/7.6.6; and since the 2025-12-09 patch (CVE-2025-54100) Windows PowerShell 5.1 `Invoke-WebRequest` without `-UseBasicParsing` fails under `-NonInteractive` (measured, build 5.1.26100.9444). `PSUseCompatibleSyntax` is disabled by default.
- **GitHub Actions `run:` defaults are an unlisted dependency** (docs): unspecified shell on Linux/macOS is `bash -e {0}` (no pipefail); `shell: bash` adds `--noprofile --norc -eo pipefail`; Windows default is `pwsh` with `$ErrorActionPreference = 'stop'` prepended, which does not fail a step on a native non-zero exit unless it is the last command.
- **Script injection via `${{ }}` inside `run:` is the CI-specific security class**: GitHub's own guidance is an intermediate `env:` variable.
- **Famous incidents are all the same three bugs**: an empty or wrong variable in a destructive path (Steam `rm -rf "$STEAMROOT/"*`), an unchecked `cd`, and a stray space in an `rm` argument list (Bumblebee). The mechanical fix is `${VAR:?}`, `cd -- "$d" || exit`, and ShellCheck SC2115/SC2164.
- **fish 4.0 (2025-02-27) broke real code**: `?` stopped being a glob (measured: `echo ?1` expands to `a1 b1` in 3.6.0 and prints `?1` from 4.0.2), `for` loops stop leaking locals, feature flags (`remove-percent-self`, `test-require-arg`) preview POSIX-breaking `test` changes.
- **nushell breaks on nearly every minor release** and removed commands can silently fall through to an external binary (measured: `"abc" | size` ran `/usr/sbin/size`). Concrete traps for 0.80 to 0.116: `let-env`, `def-env`, `date format`, `fetch`, `unfold`, `register`, `str collect`, `size`, `$nu.home-path`/`$nu.temp-path` (measured: valid in 0.105.1, an error in 0.116.0), `str upcase` (deprecated 0.114.0), `into value` (now `detect type`).
- **Agent failures are the same classes, plus boundaries**: bashisms under `/bin/sh`, unquoted variables, GNU-only flags, PS7 syntax in 5.1 scripts, stale nushell syntax, and quoting that survives generation but not the execution path (QuoteBench: replaying the same replies through an extra parser lowered success by 55.4 to 73.2 points).
- **Truncated `curl | sh` is solved by one structural rule**: define everything in functions and call `main "$@"` as the last line (rustup-init.sh line 931).
- **A mechanical-check gap exists for the most damaging classes.** Not checkable by ShellCheck: bash-version and userland portability, errexit-vs-function-in-condition by default, locale-dependent ranges, encoding/BOM, CRLF, PowerShell 5.1/7 semantics, nushell removals, emitted-code escaping per target shell. These need grep denylists, container matrix runs, or round-trip tests.

## Survey

Method: BashPitfalls, BashFAQ, ShellCheck wiki, bash NEWS/COMPAT, POSIX XCU, GitHub/Microsoft docs, fish CHANGELOG, nushell and elvish release notes were fetched verbatim (curl or GitHub raw) and read; issue trackers via `gh`. Every "measured" claim was run on the matrix on 2026-10-10; fixtures live under `/home/mherwig/.cache/research-lang/shell-tools/fixtures/failure/`. Exemplar citations use `<repo>@<sha12>:<path>:<line>`.

### 1. Wooledge BashPitfalls, classified

[BashPitfalls](https://mywiki.wooledge.org/BashPitfalls) lists **65 numbered entries** (read in full, fetched 2026-10-10). Classification into failure classes, with entry numbers:

| Class | Entries | Example | Mechanical check |
|---|---|---|---|
| A. Unquoted expansion: splitting and globbing | #1 `for f in $(ls *.mp3)`, #2 `cp $file $target`, #3 leading dashes, #5 `cd $(dirname "$f")`, #14 `echo $foo`, #24 `for arg in $*`, #29 `sed 's/$foo/…/'`, #32 `printf "$foo"`, #36 `[ -n $foo ]`, #42 `for file in ./*` then `[[ $file != *.* ]]`, #50 `hosts=( $(aws …) )`, #56 xargs without `-0` (12) | `for f in $(ls *.mp3)` | ShellCheck SC2086, SC2046, SC2048, SC2068, SC2012, SC2035, SC2059, SC2206/SC2207 |
| Q. Quote-context specials | #23 `echo "Hello World!"` (history expansion), #26 `echo "~"`, #28 `export foo=~/bar`, #33 `{1..$n}`, #34 `[[ $foo = $bar ]]`, #35 `[[ $foo =~ 'RE' ]]` (6) | `[[ $foo =~ 'some RE' ]]` changed meaning across compat levels (bash 3.1 vs 3.2+) | SC2076; partial |
| B. Test syntax | #4 `[ $foo = "bar" ]`, #6 `[ a && b ]`, #7 `[[ $foo > 7 ]]` (string compare), #9 `if [grep …]`, #10 `[bar="$foo"]`, #11 `[ [ a = b ] ]`, #20 `[ bar == "$foo" ]`, #37 `[[ -e "$broken_symlink" ]]` (8) | `[[ $foo > 7 ]]` | SC2070, SC2071, SC2073, SC1009, SC2166, SC3014 |
| C. Assignment/command syntax | #15 `$foo=bar`, #16 `foo = bar`, #21 `./something &;`, #25 `function foo()` (4) | `foo = bar` | parser errors, SC2112, SC1068 |
| D. Redirection, pipelines, subshell scope | #8 `grep … \| while read …; do ((count++))`, #13 `cat file \| sed … > file`, #17 `echo <<EOF`, #43 `2>&1 >>logfile`, #53 `sudo cmd > /file`, #54 `sudo ls /foo/*`, #55 `2>&-`, #63 `while … done <<< "$(foo)"`, #64 `cmd > "file$((i++))"` (9) | `cmd 2>&1 >>logfile` | SC2002, SC2094, SC2095, SC2260; partial |
| E. Exit status and errexit | #19 `cd /foo; bar`, #22 `cmd1 && cmd2 \|\| cmd3`, #27 `local var=$(cmd)`, #44 `cmd; (( ! $? )) \|\| die`, #60 `set -euo pipefail` with #60.1 errexit, #60.2 pipefail, #60.3 nounset (5) | `local var=$(cmd)` | SC2164, SC2015, SC2155, SC2181; errexit only via optional SC2310-SC2312 |
| F. Arithmetic and numbers | #45 `y=$(( array[$x] ))`, #46 `read num; echo $((num+1))`, #58 `month=$(date +%m)`, #59 `i=$(( 10#$i ))` (4) | `$(( 08 ))` is octal | SC2004 only; no octal check |
| G. Arrays and associative arrays | #57 `unset a[0]`, #61 `[[ -v hash[$key] ]]`, #62 `(( hash[$key]++ ))` (3) | bash 5.2 changed subscript re-evaluation; workaround differs per version (4.3-5.2) | none |
| H. Locale, encoding, data | #30 `tr [A-Z] [a-z]`, #40 UTF-8 BOM, #41 `content=$(<file)` strips trailing newlines (3) | `tr [A-Z] [a-z]` | SC2060 for glob form only |
| I. Environment, IFS, read | #12 `read $foo`, #47 `IFS=, read -ra … <<< "$csv"`, #48 `export CDPATH=…`, #49 `OIFS="$IFS"`, #65 `IFS= read -r -d '' filename` (5) | `export CDPATH=.:~/p` | SC2162, SC2229; partial |
| J. Exec boundaries and concurrency | #18 `su -c 'cmd'`, #31 `ps ax \| grep gedit`, #51 non-atomic writes with `xargs -P`, #52 `find . -exec sh -c 'echo {}' \;` (4) | `find . -exec sh -c 'echo {}' \;` (injection) | SC2156 |
| K. External utilities | #38 `ed file <<<…`, #39 `expr` sub-string (2) | `expr match` | none |

Quoted lessons that matter for rules: #60.1 "When a command you test with `if` or `&&` or `||` is a function, `set -e` ignores non-zero exit statuses of commands in that function" and "Command substitution disables errexit"; the right form is `cd -- "$1" || return`. #61 `[[ -v hash[$key] ]]` "works correctly in bash 5.2, but fails in other versions"; #62 offers four portable ways, none of them `(( hash[$key]++ ))` after 5.2. #41 gives the `printf x` sentinel to keep trailing newlines. #40: "Files starting with BOM should be considered equally foreign as those with MS-DOS linebreaks".

### 2. BashFAQ entries that exist because of a recurring bug

[BashFAQ index](https://mywiki.wooledge.org/BashFAQ) (123 entries) and [BashFAQ/105](https://mywiki.wooledge.org/BashFAQ/105) were read. Entries that exist because a bug keeps recurring: 001 (reading lines), 003 (file listing without `ls`), 020 (filenames with newlines), 024 (variable lost in a pipeline subshell), 031 (`[` vs `[[` vs `test`), 035 (option parsing), 043 (cron `%`), 045 (locking), 050 (command in a variable), 062 (secure temp files), 081 (`which` vs command exists), 082 (`$(...)` over backticks), 089 (`ssh`/`ffmpeg` eating stdin in `while read`), 095 (argument list too long), 096 (ssh eats word boundaries: nested quoting), 104 (`foo=bar echo "$foo"`), 105 (errexit), 109 (sourced or executed?), 111 (Shellshock), 112 (nounset), 121 (`value too great for base`: octal in arithmetic).

BashFAQ/105 is the longest-running catalog of "set -e does not do what you expect". Its closing exercises are runnable tests: `let i++` with `i=0` exits (status 1); `((i++))` "sometimes appears to work" depending on version (measured below: bash 3.2 and 4.0 continue, 4.2+ exit); `test -d nosuchdir && echo no dir` differs between top level and inside a function.

### 3. ShellCheck: wiki, optional checks, and what it measurably cannot see

Read: [Optional checks](https://github.com/koalaman/shellcheck/wiki/Optional), the SC1xxx/SC2xxx/SC3xxx wiki pages for the codes cited, and ran ShellCheck 0.11.0 (`/home/mherwig/.cache/research-lang/shell-tools/run.sh shellcheck`).

- Optional checks as of 0.11.0 (`shellcheck --list`): `add-default-case`, `avoid-negated-conditions`, `avoid-nullary-conditions`, `check-extra-masked-returns` (SC2312), `check-set-e-suppressed` (SC2310, SC2311), `check-unassigned-uppercase`, `deprecate-which` (SC2230), `quote-safe-variables` (SC2248), `require-double-brackets` (SC2292), `require-variable-braces` (SC2250), `useless-use-of-cat` (SC2002). **errexit-suppression diagnostics are off by default.**
- SC3xxx (65 codes) are the portability family, active only when the dialect is sh/dash/ksh-mode (`-s sh`, `# shellcheck shell=sh`, or an `sh` shebang). Examples: SC3001 process substitution, SC3003 `$'..'`, SC3009 brace expansion, SC3010 `[[ ]]`, SC3011 here-strings, SC3014 `==`, SC3016 `test -v`, SC3028 `RANDOM`, SC3030 arrays, SC3037 echo flags, SC3040 set option, SC3043 `local`, SC3044 `declare`/`shopt`/`mapfile`, SC3045 `read -n`/`printf -v`/`wait -n`/`type -P`, SC3046/SC3051 `source`, SC3047 trapping ERR, SC3053 indirect expansion, SC3057 string indexing, SC3059 case modification, SC3060 string replacement.

**Measured: what ShellCheck 0.11.0 does not catch.**

| Script header | Probe | Result |
|---|---|---|
| `#!/bin/bash` | `sed -i`, `readlink -f`, `date -d`, `grep -P`, `mapfile`, `declare -A`, `${x,,}`, `[[ -v x ]]`, `wait -n`, `xargs -r`, `find -printf`, `stat -c`, `cp --parents`, `sort -V`, `tar --exclude-vcs`, `echo -e` | **no finding** for any of the 16 (the only findings were `local` outside a function, SC2168, and an unused variable) |
| `#!/bin/sh` | 25 probes: 22 bash-only shell constructs plus `which ls`, `sed -i`, `readlink -f` | all 22 shell constructs flagged (SC3001-SC3059 family); `which ls` flagged only with `-o deprecate-which` (SC2230); `sed -i`, `readlink -f` not flagged |
| `#!/bin/sh` | `set -o pipefail` | SC3040 still emitted although POSIX.1-2024 requires `pipefail` ([koalaman/shellcheck#2555](https://github.com/koalaman/shellcheck/issues/2555), closed 2022) |

So rules about **bash-version features and userland flags must be verified by a matrix run or grep denylist, not ShellCheck**. [koalaman/shellcheck#2615](https://github.com/koalaman/shellcheck/issues/2615) "Allow configuring to reject code that is incompatible with bash 3.2" (open): the reporter hit `,,` on macOS. [koalaman/shellcheck#2360](https://github.com/koalaman/shellcheck/issues/2360) asks for bare `[[ ]]`/`(( ))` checks in bats tests on bash < 4.1.

### 4. ShellCheck most-triggered codes, measured on the exemplar corpus

No published frequency statistics were found (the SC2086 wiki page makes no frequency claim). Measured instead: ShellCheck 0.11.0, `-S style`, `-e SC1091`, over 1035 `.sh` files in the 41-repo exemplar corpus (excluding git `t/`, oils `spec/`, test snapshots, and the wiki), 2026-10-10. 552 files had at least one finding; 3854 findings total (info 2659, warning 664, style 326, error 205).

| Code | Findings | Files | Meaning |
|---|---|---|---|
| SC2086 | 1445 | 246 | double quote to prevent globbing and word splitting |
| SC2329 | 816 | 102 | function never invoked (a sibling of SC2317 "command appears to be unreachable") |
| SC2181 | 215 | 122 | check exit code directly, not via `$?` |
| SC2034 | 135 | 40 | variable appears unused |
| SC2016 | 129 | 27 | no expansion in single quotes |
| SC2046 | 72 | 41 | quote command substitution |
| SC1090 | 70 | 54 | cannot follow non-constant `source` |
| SC2155 | 62 | 21 | declare and assign separately (masks return value) |
| SC2154 | 54 | 22 | referenced but not assigned |
| SC2162 | 52 | 23 | `read` without `-r` |
| SC2096 | 52 | 52 | shebang with multiple arguments |
| SC2068 | 44 | 24 | quote `$@` |
| SC2059 | 38 | 22 | variable in printf format string |
| SC2148 | 35 | 35 | no shebang |

SC3xxx: only 23 findings in 8 files, because authors of `#!/bin/sh` scripts in well-maintained repos already avoid bashisms. The signal for SC3xxx is agent output, not exemplars. SC2096 hits are 52 files: `#!/bin/bash -e -o pipefail` (runner-images macOS scripts, `actions__runner-images@8197087fc536:images/macos/scripts/helpers/utils.sh:1`) is a Linux failure (see 8).

### 5. Tracker corpus: shellcheck, bats-core, mvdan/sh, go-task

Read via `gh`:

- ShellCheck false negatives still open: [#3444](https://github.com/koalaman/shellcheck/issues/3444) "doesn't warn that scripts can fail due to `set -e`" (`shift` with no arguments inside a function; 2026-04); [#3522](https://github.com/koalaman/shellcheck/issues/3522) a command substitution clobbers `$?` within the same command (`echo "$(basename "$f") $?"` prints 0; 2026-08); [#2679](https://github.com/koalaman/shellcheck/issues/2679) unvalidated input in arithmetic contexts executes code (`-c 'a[$(echo Gotcha! >&2)]'` reaches `[[ $count -lt 5 ]]`, `$((count+1))`, `((count<5))`, C-style `for`); [#3490](https://github.com/koalaman/shellcheck/issues/3490) SC2320 false negative for printf; [#1981](https://github.com/koalaman/shellcheck/issues/1981) SC2086 false negative with `${foo:=bar}`; [#809](https://github.com/koalaman/shellcheck/issues/809) zsh unsupported (open since 2016).
- bats-core: [#1200](https://github.com/bats-core/bats-core/issues/1200) "Failed command goes unnoticed" (bats 1.12.0, bash 5.3.0): the reporter's failed assertions are not reported, and running the first assertions in a subshell, `(! test -f funny.bats)`, makes them fail; this is consistent with POSIX exempting `!` pipelines from errexit, but the cause was not confirmed from the issue text I read; [#80](https://github.com/bats-core/bats-core/issues/80) `source` under `set -e` in bash 3.2.57 (open since 2018); [#1230](https://github.com/bats-core/bats-core/issues/1230) is `set -e` ignored when `load()`ing a file. Test harness failures are a class of their own: a test that cannot fail.
- mvdan/sh (shfmt and taskfile interpreter): zsh syntax rejected or mis-parsed ([#1429](https://github.com/mvdan/sh/issues/1429), [#1361](https://github.com/mvdan/sh/issues/1361), [#1211](https://github.com/mvdan/sh/issues/1211)); [#1194](https://github.com/mvdan/sh/issues/1194) case-statement parenthesis; [#563](https://github.com/mvdan/sh/issues/563) dollar-quote strings are not valid POSIX. shfmt formats syntax, so it cannot prove portability.
- go-task (taskfile `cmds` run in mvdan/sh, not the system shell): [#2469](https://github.com/go-task/task/issues/2469) `pipefail` not applied to `status` commands (open); [#2429](https://github.com/go-task/task/issues/2429) panic when `pipefail` is placed in `shopt`; [#2043](https://github.com/go-task/task/issues/2043) `shopt globstar` not working.
- Homebrew/install: [#686](https://github.com/Homebrew/install/issues/686) install fails when `POSIXLY_CORRECT` is set (the script now aborts: `Homebrew__install@8ab1549dfa11:install.sh:37-39`); the script is `#!/bin/bash` with `[ -z "${BASH_VERSION:-}" ]` abort (`install.sh:17-19`), i.e. a deliberate bash-3.2 target.

### 6. Incidents: Steam, Bumblebee, Shellshock, truncated installers

- **Steam** [ValveSoftware/steam-for-linux#3671](https://github.com/ValveSoftware/steam-for-linux/issues/3671) (2015-01-14): "Moved ~/.local/share/steam. Ran steam. It deleted everything on system owned by user." The line cited in the thread is `rm -rf "$STEAMROOT/"*`, where `STEAMROOT="$(cd "${0%/*}" && echo $PWD)"`: when the `cd` fails or the path is broken, `STEAMROOT` is empty and the command becomes `rm -rf "/"*`. Classes: unchecked `cd` in command substitution, no `${VAR:?}` guard, destructive glob on a variable root. ShellCheck: SC2115 (use `"${var:?}"`), SC2164, SC2086.
- **Bumblebee** [MrMEEE/bumblebee-Old-and-abbandoned#123](https://github.com/MrMEEE/bumblebee-Old-and-abbandoned/issues/123) (2011-05-24): `rm -rf /usr /lib/nvidia-current/xorg/xorg` (a stray space after `/usr`) at install.sh line 351 deleted `/usr`. Class: typo in a root-privileged destructive argument list; mechanical check is a denylist grep for `rm -rf /` followed by a space-separated absolute system path, and `--` plus `--preserve-root` awareness.
- **Shellshock** [CVE-2014-6271](https://nvd.nist.gov/vuln/detail/CVE-2014-6271) (published 2014-09-24): "GNU Bash through 4.3 processes trailing strings after function definitions in the values of environment variables". Class: environment import across a privilege boundary (CGI, ssh ForceCommand, DHCP). Residue today: `BASH_ENV`, `ENV`, `POSIXLY_CORRECT` and `BASH_FUNC_*` handling; BashFAQ/111.
- **Truncated `curl | sh`**: the structural fix is to put all code in functions and invoke `main "$@"` as the last statement so a cut download executes nothing. Evidence: `rust-lang__rustup@61271d00a979:rustup-init.sh:931` is `main "$@" || exit 1`; line 29 `set -u`; lines 17-20 probe `local` with `(PATH='' local _has_local)` and alias to `typeset`. This also shows the sh-compat idiom for `local` in ksh93.
- **Idempotent rc edits** (installer class): nvm guards appends with `command grep -qc '/nvm.sh' "$NVM_PROFILE"` and restores a missing trailing newline with `[ -n "$(command tail -c 1 "$NVM_PROFILE")" ]` (`nvm-sh__nvm@b1b3a0038c06:install.sh:484,493`). Homebrew picks the rc file per shell (`install.sh:1139-1145`).

### 7. GitHub Actions: shell defaults and script injection

[Workflow syntax, `defaults.run.shell`](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), fetched 2026-10-10:

| Platform | `shell:` | Command run |
|---|---|---|
| Linux/macOS | unspecified | `bash -e {0}` (falls back to `sh -e {0}`); different from explicit `bash` |
| all | `bash` | `bash --noprofile --norc -eo pipefail {0}` |
| all | `pwsh` | `pwsh -command ". '{0}'"` |
| Windows | unspecified | `pwsh` (falls back to PowerShell Desktop if pwsh missing on self-hosted) |
| Windows | `powershell` | `powershell -command ". '{0}'"` |
| Windows | `cmd` | `%ComSpec% /D /E:ON /V:OFF /S /C "CALL "{0}""` |

"By default, fail-fast behavior is enforced using `set -e` for both `sh` and `bash`. When `shell: bash` is specified, `-o pipefail` is also applied." For `pwsh`/`powershell`: "we will prepend `$ErrorActionPreference = 'stop'` to script contents"; "There doesn't seem to be a way to fully opt into fail-fast behavior other than writing your script to check each error code" (measured equivalent: native non-zero exit does not throw under `Stop` without `$PSNativeCommandUseErrorActionPreference` in 7.3+; see 15). Hypothesis H5 confirmed from docs.

Script injection: [Security Lab, "Keeping your GitHub Actions and workflows secure: untrusted input"](https://securitylab.github.com/resources/github-actions-untrusted-input/) lists attacker-controlled contexts: `github.event.issue.title`, `.issue.body`, `.pull_request.title`, `.pull_request.body`, `.comment.body`, `github.event.head_commit.message`, `.head_commit.author.name`, `.commits.*.author.name`, `.pull_request.head.ref`, `.head.label`, `.head.repo.default_branch`, `github.head_ref`. Anti-pattern: `run: echo "${{ github.event.issue.title }}"`. Fix: `env: TITLE: ${{ github.event.issue.title }}` then `"$TITLE"`. [Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use) says the same ("Use an intermediate environment variable"). Related: [workflow commands](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands): `{name}<<{delimiter}` multiline values written to `$GITHUB_ENV`/`$GITHUB_OUTPUT` are injectable if the value can contain the delimiter on its own line ("write the value to a file instead").

### 8. CRLF, BOM and shebang failures (measured)

Measured on Linux (bash 5.x, dash), fixtures `crlf1.sh`, `crlf2.sh`, `bom.sh`, `sb.sh`, `sb2.sh`, `sb3.sh`:

- `#!/bin/sh\r\n` executed directly: `bad interpreter: /bin/sh^M: no such file or directory`. Run as `sh crlf1.sh` it prints `hi^M`.
- CRLF inside the body: `./crlf2.sh: line 6: syntax error: unexpected end of file from 'if' command on line 3` (every `then\r` is a different token).
- UTF-8 BOM before the shebang: `bom.sh: line 1: <EF BB BF>#!/bin/sh: No such file or directory`; the kernel-level exec path treats the BOM as part of the interpreter, and `sh bom.sh` runs line 1 as a command.
- Shebang with two arguments: `#!/bin/bash -e -o pipefail` run on Linux gives `/bin/bash: - : invalid option`, because Linux passes everything after the interpreter as one argument. `#!/usr/bin/env bash -e` gives `env: 'bash -e': No such file or directory`; `#!/usr/bin/env -S bash -e` works (GNU coreutils 8.30+). macOS scripts in runner-images use the two-argument form (`actions__runner-images@8197087fc536:images/macos/scripts/helpers/utils.sh:1`), evidence that BSD kernels split it; **macOS behaviour is unverified here, read-only**. ShellCheck flags it as SC2096.
- Canonical questions: [SO 14219092](https://stackoverflow.com/questions/14219092) "/bin/bash^M: bad interpreter" (875 votes), [SO 2920416](https://stackoverflow.com/questions/2920416) (453).
- Git side: [gitattributes](https://git-scm.com/docs/gitattributes) example `*.sh text eol=lf`; with `text` set and neither `core.autocrlf` nor `core.eol`, the default is `eol=crlf` on Windows and `eol=lf` elsewhere, so a Windows checkout of a CRLF-normalized repo can ship CRLF `.sh` into containers.
- Mechanical checks: `grep -lI $'\r' -- <files>` (CRLF), `head -c3 <file> | od -An -tx1` equal to `ef bb bf` (BOM), ShellCheck SC1017 (carriage return in script) and SC1082 (BOM), and `.gitattributes` `*.sh text eol=lf`.

### 9. POSIX.1-2024, dash, busybox and the sh family (measured probes)

[POSIX.1-2024 XCU Shell Command Language](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html) now specifies `pipefail` ("The exit status of a pipeline shall depend on whether or not the pipefail option is enabled"; `-o` option list includes `allexport`, `errexit`, `noclobber`, `noglob`, `noexec`, `nounset`, `pipefail`). It also specifies errexit scope: "-e shall be ignored when executing the compound list following while/until/if/elif, a pipeline beginning with `!`, or any command of an AND-OR list other than the last", and gives the example that `set -e; echo $(false; echo one) two` exits in the substitution subshell.

Probe battery (`posix_probe.sh`, `matrix.sh posix`, 11 interpreters: dash 0.5.12, busybox ash 1.35 and 1.37, mksh R59c, ksh93u+m 2023 and 1.0.10, yash 2.52, posh 0.14.1, bash 3.2 `--posix`, bash 5.2 `--posix`, zsh 5.9 `--emulate sh`). Results that bite:

| Probe | Result |
|---|---|
| `set -o pipefail` | fails in dash 0.5.12 and posh; works elsewhere. Distro cut: Debian 13 `dash 0.5.12-12` works (`pf=1`), Debian 12 and Ubuntu 24.04 `dash 0.5.12-6ubuntu5` fail with `Illegal option -o pipefail`; Alpine 3.22 ash works |
| `echo "a\tb"` | interprets `\t`: dash, mksh, yash, posh; literal: busybox ash, ksh93, bash, zsh |
| `echo -e "a\tb"` | prints `-e a<TAB>b` in dash, yash, posh |
| `echo -n x; echo y` | yash prints `-n x` |
| `local x=$(false)` | status 0 in all 9 that support `local`; ksh93u+m (both builds) has no `local` |
| `[[ ]]`, `function f {`, `$'..'`, `${x/X/-}`, `<<<`, arrays | not in dash or posh; `<<<` also not in busybox ash 1.35/1.37; arrays only in mksh/ksh93/zsh/bash |
| `printf -v v` | works only in ksh93, bash, zsh |
| `read -n 1` | not in dash; works in busybox, mksh, ksh93, bash |
| `wait -n` | dash, mksh, ksh93, yash, posh, bash 3.2, zsh fail; busybox, bash 5.2 ok |
| `trap … ERR` | dash: `bad trap`; yash: `no such signal` |
| function name `f-g` | dash, busybox ash 1.35, ksh93, yash, posh, bash `--posix` reject; busybox ash 1.37, mksh, zsh accept |
| `type -P`, `${x,,}`, `&>` | `type -P` absent in dash/mksh/yash/posh; `${x,,}` absent in dash, busybox, mksh, ksh93, yash, posh; `&>` is parsed as `& >` (output not redirected) in dash, yash, posh |
| **`bash --posix` is not a bashism filter** | bash 5.2 `--posix` accepts `${x,,}`, arrays, `<(...)`, `type -P` |

Arithmetic (`ar.sh`, same 11 interpreters): `$((08+1))` and `x=08; $((x+1))` are errors in dash, busybox, posh, bash, zsh (octal); mksh and ksh93 treat leading-zero literals as **decimal** (`$((010+1))` is 11, others 9); yash accepts `08` and reads `010` as octal, rejects `10#`; dash and yash do not support `10#$x`; `x=abc; $((x+1))` is 1 in bash/busybox/mksh/zsh and an error in dash/ksh93/yash/posh; 64-bit overflow wraps in dash/ash/bash/zsh, mksh is 32-bit (`$((1<<63))` is -2147483648), ksh93 promotes to a float.

errexit probe (`errexit.sh`): `local x=$(false)`, `export x=$(false)`, `false | true`, `false && true`, `! true` and `while false` all continue in every shell. `x=$(false; echo hi)` under `set -e`: busybox ash continues (`x=hi`); bash `--posix` exits because POSIX mode inherits errexit into command substitution, and default bash needs `shopt -s inherit_errexit` (4.4+). Note: that column is bash POSIX-mode behaviour, not default bash. Under `set -e`: `[[ -z x ]]` and `((i++))` from 0 do not exit in bash 3.2 (bash NEWS: "The [[ and (( commands are now subject to the setting of `set -e` and the ERR trap" arrived in 4.1) and do exit in bash 5.x.

### 10. bash 3.2 to 5.3: what each version adds, and errexit drift (measured)

Primary: bash 5.3 source tarball `NEWS` and `COMPAT` (read from `https://ftp.gnu.org/gnu/bash/bash-5.3.tar.gz`). Measured: `bash_probe.sh` with `matrix.sh bash` (3.2, 4.0, 4.2, 4.4, 5.0, 5.1, 5.2, 5.3; each cell checked on output, not exit code):

| Feature | First version measured working | Notes |
|---|---|---|
| `mapfile`/`readarray`, `declare -A`, `globstar`, `coproc`, `&>>`, `\|&`, `;;&`, `${x,,}`/`${x^^}`, `read -t 0.1` | 4.0 | fail on 3.2 (the macOS `/bin/bash` build, read-only claim) |
| `[[ -v var ]]` | 4.2 (fails 3.2, 4.0) | BashPitfalls #61 for array subscripts |
| negative array index `${a[-1]}`, `lastpipe`, `declare -g`, `printf '%(%Y)T'` | 4.2 | `unset "a[-1]"` first measured working on 4.4 (4.2 fails; 4.3 not tested) |
| `local -n`, `wait -n` | 4.3/4.4 (fail on 4.2; first measured 4.4) | |
| `${x@Q}`, `inherit_errexit`, `mapfile -d`, empty `"${a[@]}"` under `set -u` | 4.4 | 3.2-4.3: `unbound variable` |
| `EPOCHREALTIME`, `globasciiranges` default on | 5.0 | NEWS 5.0 hh: "The `globasciiranges` option is now enabled by default" |
| `${x@U}`, `SRANDOM` | 5.1 | |
| `${ cmd; }` funsub, `array_expand_once` (replaces `assoc_expand_once`), `BASH_MONOSECONDS`, `GLOBSORT`, `kv`/`strptime` loadables | 5.3 | `${ cmd; }` fails in 3.2-5.2 (measured) |

Behaviour drift: `set -e; i=0; ((i++)); echo reached` prints `reached` in 3.2 and 4.0 and exits in 4.2-5.3 (measured). `COMPAT`: locale-based `[[ < ]]` comparisons since 4.1; "Bash-5.2 attempts to prevent double-expansion of array subscripts"; 5.3 changes `test` with more than four arguments in parentheses. `BASH_COMPAT=4.4` assignment is accepted without error in all eight versions (measured); NEWS 4.4 says `BASH_COMPAT` can be inherited from the initial environment. In 5.3 NEWS: a NULL `$PATH` now means `.`, `source -p PATH`, `trap -P`.

macOS: Apple's [zsh default article](https://support.apple.com/en-us/102360) says zsh is the default login shell since macOS 10.15 and documents `/var/select/sh` choices `/bin/bash`, `/bin/dash`, `/bin/zsh`; it does not state the bash version. The 3.2.57 claim rests on the frame (H7) and `bash:3.2` image; **read-only, no macOS host**.

### 11. zsh: sourcing bash code (measured)

`zsh_probe.zsh`/`zsh2.zsh` on zsh 5.0.8, 5.3.1, 5.8, 5.9 (identical):

- Unquoted `$v` does not split (`[a b  c]` as one word); `local IFS=:; set -- $1` yields 1 argument.
- Arrays are 1-based (`${a[0]}` is empty, `${a[-1]}` last).
- A glob with no match is a fatal error (`no matches found`) unless `setopt nonomatch`.
- `status` is read-only (`read-only variable: status`).
- **`path="/some/dir/file.txt"` clobbers `$PATH`**, after which `ls` is not found. Lowercase `path` is tied to `PATH` in zsh; common variable names in bash code (`path`) break it.
- `echo -e` works; `emulate` reports `zsh`.

### 12. fish 3 to 4 breaking changes (changelog plus measured)

[CHANGELOG.rst](https://github.com/fish-shell/fish-shell/blob/master/CHANGELOG.rst) (`fish-shell__fish-shell@ac50fe526f74`, latest 4.9.3 on 2026-09-08). Releases: 4.0.0 2025-02-27, 4.1.0 2025-09-27, 4.2.0 2025-11-10, 4.3.0 2025-12-28, 4.4.0 2026-02-03, 4.5.0 2026-02-17, 4.6.0 2026-03-28, 4.7.0 2026-05-05, 4.8.0 2026-06-24, 4.9.0 2026-09-03.

4.0.0 "Notable backwards-incompatible changes": the `qmark-noglob` feature is on by default (`?` no longer a single-character glob; `set -Ua fish_features no-qmark-noglob` restores it); `random` produces different values for the same seed; variables in command position that expand to a subcommand keyword are forbidden (`set editor command emacs; $editor`); `for` loops no longer remember local variables from the previous iteration; commas in command-substitution output are no longer brace separators; `fish` no longer searches Windows `$PATH` entries for Linux executables under WSL; `ctrl-c` calls `clear-commandline`; new `bind` key notation; two opt-in flags `remove-percent-self` and `test-require-arg` (`test -n` without an argument returns false: "we are breaking with POSIX explicitly"). 4.1.0: `{echo,echo}` is a compound command not brace expansion; terminfo `bind -k` names removed; `set_color --background` no longer implies bold. 4.9.0: escaped `\133` no longer a slice operator. 4.3.0 stops setting user-facing universal variables by default. 4.8.0: `complete --command` no longer unescapes. 4.7.0: default theme not set in non-interactive shells.

Measured (`f1.fish`, fish 3.6.0 Debian 12, 4.0.2 Debian 13, 4.7.0, 4.9.3): `echo ?1` expands to `a1 b1` in 3.6.0 and prints `?1` from 4.0.2 on; `for` local leakage is not observable in this probe; `test -n` with no argument returns 0 in all (the `test-require-arg` flag is opt-in); `%self` still expands in all four.

### 13. nushell: per-release breaking changes and agent traps (changelog plus measured)

Read: the "breaking changes" sections of the [Nushell release posts](https://www.nushell.sh/blog/) 0.80 to 0.116.1 (53 posts via `nushell/nushell.github.io/blog`). Per-release items that break generated or agent-written code:

| Release (date) | Breaking item |
|---|---|
| 0.83 (2023-07-25) | `let-env` removed (use `$env.FOO = "BAR"`) |
| 0.84 (2023-08-22) | `date format` renamed `format date`; `into duration --convert` removed; `str replace` is substring by default, `-s` deprecated |
| 0.87-0.88 (2023-11/12) | `def-env`/`extern-wrapped` deprecated (use `def --env`/`def --wrapped`); `unfold` renamed `generate` then removed; `size` removed in favour of `str stats` |
| 0.93-0.94 (2024-04/05) | `register` deprecated (use `plugin add` + `plugin use`); `with-env` list form removed; `describe --collect-lazyrecords` removed |
| 0.95 (2024-06) | `path type`, `to toml`, `help commands`, `str contains --not`, `sys`, `run-external` changes |
| 0.96 (2024-07) | `generate`, default column numbering, `select`, `std path add`, `default`, `window`, `break`/`continue` |
| 0.99-0.100 (2024-10/11) | `sort-by`/`sort`; lone leading pipe in closures; case-insensitive sorting; `url parse`; empty rest matches |
| 0.101 (2024-12-24) | `++` operator; stricter command signature parsing; completion sorting; import module naming; `SHLVL` |
| 0.102-0.103 (2025-02/03) | `$env.config.filesize` format; `ENV_CONVERSIONS` immediate; external completer fallback only on `null`; `match` no longer runs closures as blocks; **`PROMPT_*` env vars no longer inherited**; closure serialization |
| 0.104-0.106 (2025-04 to 07) | `history` sqlite datetimes; `date` is now `datetime`; `do -s/-p` removed; cell-path case-sensitivity; `path`/`directory` args no longer expanded; stricter compound-assignment typing; `parse` unmatched optional groups are `null` |
| 0.107 (2025-09-02) | `find` case-sensitive by default; **`env_change` hooks now run before `pre_prompt`**; `each` passes through `null`; `format bits` big endian |
| 0.108 (2025-10-15) | **`into value` is now `detect type`**; collecting a stream containing errors raises; `EditCommand` renames |
| 0.110 (2026-01-17) | **`$nu.temp-path` renamed `$nu.temp-dir`, `$nu.home-path` renamed `$nu.home-dir`**; `*` no longer matches dotfiles in `mv`/`cp`/`du`; `error make` uses `labels`; `to md` lists |
| 0.112.1 (2026-04-11) | `job tag` renamed `job describe`; `into value` no longer infers types; `random choice` (std-rfc) semantics |
| 0.113 (2026-05-23) | `kill` signal shorthand; `parse` byte-stream line splitting removed; `mkdir -v` returns a table |
| 0.114 (2026-07-04) | **`str upcase`/`str downcase` deprecated (use `str uppercase`/`str lowercase`)**; submodules no longer implicitly imported; type-system inference changes; `try {} catch {}` error record loses `json` field (use `details`) |
| 0.115 (2026-08-15) | shadowing parser keywords disallowed; `nu --testbin` no longer shipped; YAML rework (breaking); `idx import/export` removed |
| 0.116 (2026-09-26) | unified custom completions; `background-completions` option removed; `to yaml --compact-list-indent` replaced by `--list-indent` |

Measured on nu 0.105.1 and 0.116.0 (`nu_*.nu`): `let-env FOO = "x"` is `assignment_requires_variable` error; `def-env` is "Command `def-env` not found" with "Did you mean `let-env`?"; `date format` is `Removed command: date format ... use 'format date'`; `fetch` is `Removed command: fetch ... use 'http get'`; `unfold` parse error; `str find-replace`, `str collect` are `Extra positional argument`; `print a && print b` is `nu::parser::shell_andand` ("use ';' or 'and'"); `$nu.home-path` and `$nu.temp-path` **work in 0.105.1 and fail in 0.116.0**; `str upcase` prints a deprecation warning in 0.116.0 and nothing in 0.105.1; `into value` output is unchanged for this input in both. **A removed internal command can fall through to an external binary**: `"abc" | size` on both versions ran `/usr/sbin/size: 'a.out': No such file`. Mutating an immutable `let` is `assignment_requires_mutable_variable` (use `mut`).

### 14. elvish breaking changes

[Elvish release notes](https://github.com/elves/elvish/tree/master/website/blog) (`elves__elvish@26a8bd5c4ee1`; 0.21.0 is the current release in the toolchain): 0.18.0 `\x`/octal escapes in double quotes encode bytes not codepoints, lone `try` forbidden, `except`/legacy `a=b cmd` deprecated in favour of `catch`/`tmp`; 0.20.0 `except` and `float64` removed; 0.21.0 removed `eawk` (use `re:awk`), `~/.elvish` legacy directory, **legacy temporary assignment `a=b command`** (use `tmp` or `with`), `try … else` without `catch`; `!=`/`!=s`/`not-eq` accept two arguments; `edit:kill-left-alnum-word` renamed; **implicit cd deprecated**. Elvish is pre-1.0 with a documented deprecation cycle, so emitted code can be version-gated with `has-key`.

### 15. PowerShell 5.1 versus 7: breakages (docs plus measured on the real host)

Docs: [differences from Windows PowerShell](https://learn.microsoft.com/powershell/scripting/whats-new/differences-from-windows-powershell), [What's New 7.3-7.7](https://learn.microsoft.com/powershell/scripting/whats-new/what-s-new-in-powershell-73), [about_Preference_Variables](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_preference_variables), [about_Character_Encoding](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_character_encoding), [Invoke-WebRequest 5.1](https://learn.microsoft.com/powershell/module/microsoft.powershell.utility/invoke-webrequest?view=powershell-5.1), [support lifecycle](https://learn.microsoft.com/powershell/scripting/install/powershell-support-lifecycle). Support: 7.6 (LTS) released 2026-03-18, EOS 2028-11-14; 7.4 (LTS) and 7.5 EOS 2026-11-10; 7.7 is preview.

Measured (`matrix.sh pwsh`: pwsh 7.4.7 and 7.6.6 on Linux, Windows PowerShell 5.1.26100.9444 on the real Windows host):

| Probe | 7.4.7 / 7.6.6 | Windows PowerShell 5.1 |
|---|---|---|
| `$IsWindows` | `False` (Linux) | **empty/`$null`**; `$PSVersionTable.PSEdition` is `Desktop` |
| `[Console]::OutputEncoding` / `$OutputEncoding` | utf-8 / utf-8 | `IBM437` / **`us-ascii`** |
| `Write-Output a && Write-Output b` | `a` `b` | parse error: `The token '&&' is not a valid statement separator in this version` |
| `$x = $true ? 'y' : 'n'` | `y` | parse error `Unexpected token '?'` |
| UTF-8 file without BOM containing `é` | `len=4` (correct) | **`len=5`**, bytes `195,169`: read as ANSI |
| `$ErrorActionPreference='Stop'`; native writes stderr, `2>&1` | no throw, `LASTEXITCODE=3` | **throws `RemoteException`** |
| `Stop`; native exit 3, no redirect | continues, `LASTEXITCODE=3` | continues, `LASTEXITCODE=3` |
| `$PSNativeCommandUseErrorActionPreference = $true` then native exit 3 | throws `NativeCommandExitException` | variable not available (7.3+) |
| `Invoke-WebRequest https://example.com` with `-NonInteractive`, no `-UseBasicParsing` | status 200 | **error `PSInvalidOperationException: Windows PowerShell is in NonInteractive mode. Read and Prompt functionality is not available.`** (security prompt added by the 2025-12-09 update, CVE-2025-54100); `-UseBasicParsing` returns 200 |

Doc facts: 7.3 changed native-argument passing (`$PSNativeCommandArgumentPassing` values `Legacy`, `Standard`, `Windows`; default `Windows` on Windows, `Standard` elsewhere; `Windows` mode uses legacy for `cmd.exe`, `cscript.exe`, `find.exe`, `sqlcmd.exe`, `wscript.exe`, and `.bat/.cmd/.js/.vbs/.wsf`); "PowerShell (v6 and higher) defaults to `utf8NoBOM` for all text output"; in 5.1 `>` and `Out-File` write UTF-16LE with BOM while `Set-Content` writes the ANSI code page; "If you need to use non-Ascii characters in your scripts, save them as UTF-8 with BOM" for 5.1. 7.7 preview: `New-Guid` generates UUID v7. 7.3: `$PSStyle.OutputRendering` default `Host`; 7.4: `Test-Json` drops Draft 4; 7.6: `Microsoft.PowerShell.ThreadJob` replaces `ThreadJob`.

PSScriptAnalyzer ([docs/Rules](https://github.com/PowerShell/PSScriptAnalyzer/tree/main/docs/Rules), `PowerShell__PSScriptAnalyzer@411c3d0b197b`): `PSUseCompatibleSyntax` (Error, **disabled by default**, takes `TargetVersions` such as `'7.0','5.1'`, flags `?:` and `??`), `PSUseCompatibleCommands`, `PSUseCompatibleTypes`, `PSUseCompatibleCmdlets`, `PSUseBOMForUnicodeEncodedFile` (Warning, always on), `PSAvoidUsingWriteHost`, `PSAvoidUsingInvokeExpression`, `PSAvoidUsingCmdletAliases`, `PSMisleadingBacktick`, `PSPossibleIncorrectUsageOfRedirectionOperator` (`if ($a > $b)`), `PSAvoidUsingPositionalParameters`, `PSAvoidExclaimOperator`. PSScriptAnalyzer was not installed in the toolchain, so rule behaviour here is from docs, not measured.

### 16. Windows Git Bash / MSYS (measured)

`gb.sh` through `matrix.sh win` (Git Bash 5.2.15, MINGW64_NT-10.0-26200):

- `cmd /c echo single-slash`: MSYS converts `/c` to `C:\` and **starts an interactive cmd.exe** (hangs in CI). `cmd //c echo ok` and `MSYS_NO_PATHCONV=1 cmd /c echo ok` work.
- `cmd //c echo /tmp` prints `C:/Users/ecom/AppData/Local/Temp`: argument paths are rewritten.
- Output of native tools carries CRLF (`h i \r \n`).
- `ln -s gb.sh gb.lnk` creates a regular file copy (`-rwxr-xr-x`), not a symlink, by default.
- File system is case-insensitive (`touch Foo; touch foo` yields one file); `touch x.sh` is not executable.
- `sed -i`, `readlink -f`, `date -d` work (GNU userland bundled).

### 17. Userland: macOS/BSD, busybox, uutils

- GNU-versus-BSD flags that shell scripts trip on (read-only for macOS; **no macOS host**): `sed -i` (BSD requires a suffix argument), `readlink -f` (SO [1055671](https://stackoverflow.com/questions/1055671), 457 votes), `date -d`, `stat -c`, `xargs -r`, `grep -P`, `sort -V`, `find -printf`, `mktemp` template rules, `sed` `+`/`\n` in basic regex. Canonical: SO [5694228](https://stackoverflow.com/questions/5694228) "sed in-place flag that works both on Mac (BSD) and Linux" (347 votes), SO [27002192](https://stackoverflow.com/questions/27002192) `declare -A` on macOS (18). ShellCheck measured blind to all of them (see 3).
- uutils/Rust coreutils: README states it "aims to be a drop-in replacement for the GNU utils" but differences exist ("Matching GNU's output exactly" is a goal, not a guarantee). Ubuntu 25.10 shipped it as the default; the `date -r` argument was parsed but ignored, which broke unattended-upgrades (fixed in `rust-coreutils 0.2.2-0ubuntu2.1`); per [LWN](https://lwn.net/Articles/1069481/), 26.04 LTS keeps `cp`, `mv`, `rm` on GNU over eight open TOCTOU issues and 26.10 targets a full uutils system. Secondary reporting; version behaviour not measured (Ubuntu 24.04 container has GNU coreutils 9.4, sed 4.9).
- busybox: applet option gaps show up as measured shell differences (`<<<`, `unset-fn-name`, `type -P` present in ash but not all applets); no separate fetch of the applet matrix was made.

### 18. AI-agent failure writeups

- [QuoteBench](https://arxiv.org/abs/2608.13547) (arXiv 2608.13547; abstract read only): 56 one-shot Bash tasks from 14 incident-derived families; failures come from generation errors and from **post-generation failures when the command is serialized, wrapped, or reparsed**; replaying the same model replies through an added unescaped parser lowered success by 55.4 to 73.2 percentage points; telling the model about the boundary recovered 30.4 to 60.7 points in six of eight configurations. Implication: quoting across `ssh`, `docker exec`, `bash -c`, YAML and CI layers is an agent failure class independent of shell knowledge. Detailed taxonomy not read.
- [Bash in the Wild](https://research.monash.edu/en/publications/bash-in-the-wild-language-usage-code-smells-and-bugs/) (Dong et al., ACM TOSEM 32(1), 2023-02-13): about one million GitHub Bash scripts; most common problems are quoting, resource management, command options, permissions, error handling; error-proneness correlates with size. Human-written baseline.
- Practitioner agent rules: ["Cursor rules for Bash: 6 rules that stop AI from generating broken shell scripts"](https://dev.to/olivia_craft/cursor-rules-for-bash-6-rules-that-stop-ai-from-generating-broken-shell-scripts-50a7): strict mode, quote everything, `local`, validate args, `trap cleanup EXIT` with `mktemp`, ShellCheck-clean (`result=\`eval "cat $user_provided_path"\``). The Tessl [common-mistakes](https://tessl.io/registry/pantheon-ai/bash-script-toolkit/1.0.1/files/validator/references/common-mistakes.md) fixture lists 25 mistakes including arrays in POSIX sh, `[ "$a" == b ]`, `-a`/`-o`, `ls` in `for`, `rm -rf "/$1"`. Both are guidance, not measurements, and both promote `set -euo pipefail` uncritically (see Contested).
- Other leads not read in full: [CARE](https://arxiv.org/abs/2607.21642) (pre-execution command verification for shell-executing agents, PDF not extractable), [SecGenEval-PS](https://arxiv.org/abs/2601.06419) (PowerShell security benchmark: "fluent but often insecure code", from a search summary), BashCoder-R1 (arXiv 2606.27733), ScriptSmith (arXiv 2409.17166).
- **No published study quantified bashism or unquoted-variable rates in LLM output.** The agent-trap list in this map is therefore assembled from the failure classes above, the nushell removed-command measurements, the PS 5.1/7 measurements and hypothesis H6, not from agent telemetry.

### 19. Stack Overflow and Unix SE canonical questions

Vote counts from the Stack Exchange API on 2026-10-10:

| Question | Votes | Class |
|---|---|---|
| [SO 14219092](https://stackoverflow.com/questions/14219092) `/bin/bash^M: bad interpreter` | 875 | CRLF |
| [Unix SE 65803](https://unix.stackexchange.com/questions/65803) Why is printf better than echo? | 740 | echo portability |
| [SO 1055671](https://stackoverflow.com/questions/1055671) GNU `readlink -f` on a Mac | 457 | userland |
| [SO 2920416](https://stackoverflow.com/questions/2920416) `./configure: /bin/sh^M: bad interpreter` | 453 | CRLF |
| [Unix SE 131766](https://unix.stackexchange.com/questions/131766) Why does my shell script choke on whitespace or other special characters? | 378 | word splitting |
| [SO 5694228](https://stackoverflow.com/questions/5694228) `sed -i` on Mac and Linux | 347 | userland |
| [Unix SE 171346](https://unix.stackexchange.com/questions/171346) Security implications of forgetting to quote a variable | 284 | quoting/security |
| [Unix SE 169716](https://unix.stackexchange.com/questions/169716) Why is using a shell loop to process text considered bad practice? | 288 | design |
| [SO 27002192](https://stackoverflow.com/questions/27002192) `declare -A` does not work on macOS | 18 | bash 3.2 |

## Candidate topics

Coverage column is against the sibling lore sets in `rules/` and `skills/` on this branch: "partial" means a sibling rule states part of it. Prior art found: `rules/cmake-build.md` CMK-CORE-05 (never pipe a match stream into an early-exiting reader such as `grep -q` under `pipefail`), `rules/rust-quality/cli-contract.md` (sysexits-aligned exit codes, streams), and `checks/*.sh` verification scripts in swift-quality that use `set -o pipefail`.

| # | Topic (question) | Why it matters | Source | Covered | Surface | Priority |
|---|---|---|---|---|---|---|
| 1 | Which dialect does this script target, and do the shebang, extension, `# shellcheck shell=` directive and body agree? | `#!/bin/sh` with bash syntax is the top agent failure; SC2148/SC3xxx only fire when the dialect is declared | [SC2148](https://www.shellcheck.net/wiki/SC2148), [SC3010](https://www.shellcheck.net/wiki/SC3010) | no | posix, bash, lint-format | P0 - it gates every other portability rule |
| 2 | Which bash features must a script that may run on macOS `/bin/bash` 3.2.57 avoid, and how does a reviewer detect them mechanically? | `mapfile`, `declare -A`, `${x,,}`, `[[ -v ]]`, `&>>`, `\|&`, `coproc`, `local -n`, `wait -n`, `${x@Q}`, negative indices; ShellCheck cannot detect them | [shellcheck#2615](https://github.com/koalaman/shellcheck/issues/2615); measured table in 10 | no | bash, testing | P0 - measured, enumerable, invisible to the linter |
| 3 | Which `sh` implementations lack `set -o pipefail`, and what is the safe fallback? | Works on Debian 13/Alpine, fails on Ubuntu 24.04/Debian 12 dash and posh; SC3040 still warns although POSIX.1-2024 requires it | [POSIX XCU](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html), [shellcheck#2555](https://github.com/koalaman/shellcheck/issues/2555) | no | posix, ci | P0 - widespread, version-specific, measured |
| 4 | When is an unquoted expansion a bug, and what are the intended-splitting idioms (arrays, `set --`, `${var:+...}`, `set -f`)? | 12 BashPitfalls entries; SC2086 is 37% of exemplar findings | [BashPitfalls](https://mywiki.wooledge.org/BashPitfalls), [SC2086](https://www.shellcheck.net/wiki/SC2086) | no | any | P0 - highest frequency x damage |
| 5 | Does `set -e` abort here? (function in `if`/`||`, `$(...)`, `local x=$(...)`, `&&` list, `!`, `((i++))`, `[[ ]]`, pipelines) | Rules differ by shell and bash version; only optional ShellCheck checks cover it | [BashFAQ/105](https://mywiki.wooledge.org/BashFAQ/105), [POSIX XCU](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html), [shellcheck#3444](https://github.com/koalaman/shellcheck/issues/3444) | no | posix, bash | P0 - ShellCheck blind by default; matrix-verifiable |
| 6 | Should a new script open with `set -euo pipefail`, and what replaces it in code that must keep running or run under `sh`? | Contested; `-e` surprises, `-u` fails on empty arrays before bash 4.4, `pipefail` breaks `grep -q` pipelines | [BashPitfalls #60](https://mywiki.wooledge.org/BashPitfalls), [Cursor rules](https://dev.to/olivia_craft/cursor-rules-for-bash-6-rules-that-stop-ai-from-generating-broken-shell-scripts-50a7) | partial (CMK-CORE-05 covers the SIGPIPE half only) | bash, posix | P0 - the most cargo-culted line (H2) |
| 7 | Which pipelines break under `pipefail` because the reader exits early (SIGPIPE, status 141)? | `cmd \| grep -q`, `\| head -1` report failure although the match was found | [BashPitfalls #60.2](https://mywiki.wooledge.org/BashPitfalls); `rules/cmake-build.md` CMK-CORE-05 | partial | bash, posix, testing | P1 - a sibling states it for CMake trees only |
| 8 | When does `local x=$(cmd)` / `export x=$(cmd)` hide a failure, and what is the two-step form? | Status 0 in all 9 sh-family shells measured that implement `local`; SC2155 | [SC2155](https://www.shellcheck.net/wiki/SC2155), [BashPitfalls #27](https://mywiki.wooledge.org/BashPitfalls) | no | any | P1 - cheap lint, common |
| 9 | `echo` or `printf`: which `echo` forms are portable, and where does `\t` get interpreted? | `echo -e`, `-n`, and backslash handling differ across dash, mksh, yash, posh, busybox, bash, zsh (measured) | [Unix SE 65803](https://unix.stackexchange.com/questions/65803); measured table in 9 | no | posix | P0 - agent default is `echo -e`; measured divergence |
| 10 | How does a script handle filenames with leading dashes, spaces, newlines (`--`, `./*`, `-print0`/`-0`, `read -d ''`)? | #1-#3, #42, #56, #65; BashFAQ/020; SC2035, SC2012 | [BashPitfalls](https://mywiki.wooledge.org/BashPitfalls), [BashFAQ/020](https://mywiki.wooledge.org/BashFAQ/020) | no | any, userland | P0 - daily damage, partly linted |
| 11 | How do destructive commands guard against an empty or wrong variable (`${VAR:?}`, checked `cd`, `--`, no `rm -rf "$x/"*`)? | Steam deleted user data; Bumblebee removed `/usr` | [steam-for-linux#3671](https://github.com/ValveSoftware/steam-for-linux/issues/3671), [bumblebee#123](https://github.com/MrMEEE/bumblebee-Old-and-abbandoned/issues/123), [SC2115](https://www.shellcheck.net/wiki/SC2115) | no | any, security | P0 - the highest-damage class |
| 12 | How must a `curl \| sh` installer be structured to survive a truncated download (functions plus a final `main "$@"`)? | A cut download otherwise executes a partial script | `rust-lang__rustup@61271d00a979:rustup-init.sh:931` | no | installer, posix | P1 - tiny, decisive structural rule |
| 13 | How are CRLF line endings prevented and detected (`.gitattributes eol=lf`, `grep -I $'\r'`, SC1017)? | `^M: bad interpreter`, `unexpected end of file`; measured | [SO 14219092](https://stackoverflow.com/questions/14219092), [gitattributes](https://git-scm.com/docs/gitattributes) | no | any, ci | P0 - fails before any code runs; checkable by grep |
| 14 | BOM: when must a file have one (Windows PowerShell 5.1 non-ASCII), when must it not (anything with a shebang)? | Unix BOM breaks line 1; PS 5.1 misreads UTF-8 without BOM (measured `len=5`); the two rules conflict | [BashPitfalls #40](https://mywiki.wooledge.org/BashPitfalls), [about_Character_Encoding](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_character_encoding) | no | pwsh, posix | P1 - small, cross-OS trap |
| 15 | Which shebang forms work on both Linux and BSD/macOS (`env -S`, single argument, no `-e -o pipefail` in the line)? | `#!/bin/bash -e -o pipefail` fails on Linux (measured), used on macOS runners | measured; SC2096 | no | posix, userland | P1 - measured, mechanical (SC2096) |
| 16 | Which locale settings make `[a-z]`, `sort`, `tr`, `[[ < ]]` and `grep` deterministic (`LC_ALL=C`, bash 5.0 `globasciiranges`)? | Locale-dependent ranges and collation; bash `[[ < ]]` is locale-based since 4.1 | bash 5.3 `NEWS` 5.0 hh, `COMPAT`; [BashPitfalls #30](https://mywiki.wooledge.org/BashPitfalls) | no | any, userland | P1 - real but not measurable on this host (no en_US locale) |
| 17 | How are leading-zero numbers handled in arithmetic (`08`, `10#$x`, `date +%m`, mksh decimal reading, dash lacking `10#`)? | Shell-dependent: octal error, decimal, or unsupported base prefix (measured) | [BashPitfalls #58, #59](https://mywiki.wooledge.org/BashPitfalls), [BashFAQ/121](https://mywiki.wooledge.org/BashFAQ/121) | no | any | P2 - measurable, rare in agent output |
| 18 | How are temp files created and cleaned up portably (`mktemp` forms, `trap ... EXIT`, signals, subshell traps)? | Leftover files, races, GNU vs BSD `mktemp` template rules; ERR trap not POSIX (dash `bad trap`) | [BashFAQ/062](https://mywiki.wooledge.org/BashFAQ/062); measured `trap … ERR` | no | any, posix | P1 - agent staple, shell-divergent |
| 19 | How is single-instance locking and atomic file replacement done portably (`mkdir` lock, `mv` same-filesystem, no `flock` on macOS)? | Races in installers and rc edits | [BashFAQ/045](https://mywiki.wooledge.org/BashFAQ/045) | no | any, installer | P2 - fewer hits, high impact when wrong |
| 20 | `which`, `command -v`, `type -P`, hashing, and PATH hijack (empty PATH element, NULL PATH is `.` in bash 5.3): which lookup is portable and safe? | `which` is non-standard (SC2230 optional); `type -P` absent in dash (measured) | [BashFAQ/081](https://mywiki.wooledge.org/BashFAQ/081), bash 5.3 NEWS p | no | any, security | P1 - agent default `which` |
| 21 | Which GNU-only flags must be avoided or version-gated (`sed -i`, `readlink -f`, `date -d`, `grep -P`, `stat -c`, `xargs -r`, `sort -V`, `find -printf`, `cp --parents`)? | ShellCheck misses all of them in bash mode (measured); BSD/macOS, busybox, uutils differ | [SO 5694228](https://stackoverflow.com/questions/5694228), [SO 1055671](https://stackoverflow.com/questions/1055671) | no | userland | P0 - top agent failure, no linter |
| 22 | Which userland differences does a container matrix catch (GNU coreutils vs busybox vs uutils)? | Ubuntu 25.10 default uutils (`date -r` bug); busybox gaps; only a run proves it | [LWN](https://lwn.net/Articles/1069481/), [uutils README](https://github.com/uutils/coreutils) | no | userland, testing | P1 - verification method, not content |
| 23 | Does `local` exist in the target shell and how is it declared (`typeset` alias for ksh93)? | ksh93u+m has no `local`; rustup aliases it | `rust-lang__rustup@61271d00a979:rustup-init.sh:17-20`, SC3043 | no | posix, ksh | P2 - rare target |
| 24 | Which constructs does `shellcheck -s sh` catch (SC3xxx) and which bashisms slip through (`which`, `sed -i`, `readlink -f`)? | 22/25 probes caught (measured); the 3 userland misses need grep | measured; [SC3xxx wiki](https://www.shellcheck.net/wiki/SC3010) | no | lint-format, posix | P0 - defines the verification split |
| 25 | What breaks when bash code is sourced or ported to zsh (no splitting, 1-based arrays, `path` tied to PATH, `nomatch`, read-only `status`)? | Measured on 4 zsh versions; the macOS default shell | measured; measured on zsh 5.0.8, 5.3.1, 5.8, 5.9 | no | zsh, emitter | P1 - macOS default interactive shell |
| 26 | Which fish 3 to 4 changes break scripts (`?` glob, `for` locals, feature flags, `test-require-arg`, `{echo,echo}`, `bind` notation)? | 4.0 (2025-02-27) rewrote and broke; distros still carry 3.6.0/4.0.2 | [fish CHANGELOG](https://github.com/fish-shell/fish-shell/blob/master/CHANGELOG.rst) | no | fish | P1 - measured `?1` difference |
| 27 | Which nushell commands and variables were removed or renamed since 0.80, and how does the failure present? | Agents emit stale `let-env`, `def-env`, `date format`, `fetch`, `$nu.home-path`; removal can fall through to an external binary (`size`) | [nushell blog](https://www.nushell.sh/blog/); measured | no | nu | P0 - highest churn; hypothesis H9 supported |
| 28 | Which nushell release changes affect an emitter (`$nu.*-dir` 0.110, `env_change` before `pre_prompt` 0.107, `PROMPT_*` not inherited 0.103, hook order, `ENV_CONVERSIONS` timing)? | Generated nu code is long-lived and version-sensitive | [0.107](https://www.nushell.sh/blog/2025-09-02-nushell_0_107_0.html), [0.110](https://www.nushell.sh/blog/2026-01-17-nushell_v0_110_0.html) | no | nu, emitter | P1 - drives version-gated emission |
| 29 | Which elvish constructs were removed in 0.20-0.21 (`a=b cmd`, `except`, `eawk`, `float64`, implicit cd)? | Pre-1.0 deprecation cycle; emitted code should use `tmp`/`with` | [elvish release notes](https://github.com/elves/elvish/tree/master/website/blog) | no | elvish, emitter | P2 - single repo user |
| 30 | Which PowerShell 7-only syntax and variables break Windows PowerShell 5.1 (`&&`, `\|\|`, `?:`, `??`, `$IsWindows`, `-Parallel`)? | Measured parse errors on 5.1; `PSUseCompatibleSyntax` is off by default | [PSScriptAnalyzer UseCompatibleSyntax](https://github.com/PowerShell/PSScriptAnalyzer/blob/main/docs/Rules/UseCompatibleSyntax.md); measured | no | pwsh, lint-format | P0 - installers must run on 5.1 (Q2) |
| 31 | How do native commands interact with `$ErrorActionPreference`, `$?`, `$LASTEXITCODE`, `2>&1` and `$PSNativeCommandUseErrorActionPreference` in 5.1 versus 7? | 5.1 throws on stderr under Stop with `2>&1`; 7.x does not; exit codes never throw without the 7.3+ variable | [about_Preference_Variables](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_preference_variables); measured | no | pwsh, ci | P0 - silent success on native failure |
| 32 | How do encoding defaults differ (`>`/`Out-File` UTF-16LE with BOM in 5.1, `Set-Content` ANSI, `$OutputEncoding`, scripts without BOM) and what pins them? | Measured `len=5` and us-ascii; data corruption without error | [about_Character_Encoding](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_character_encoding) | no | pwsh | P0 - silent corruption |
| 33 | What changed for native-argument passing in 7.3 (`$PSNativeCommandArgumentPassing`, `Legacy`/`Standard`/`Windows`)? | Embedded quotes and empty strings reach native tools differently; `cmd.exe`/`.bat` keep legacy | [about_Preference_Variables](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_preference_variables) | no | pwsh, installer | P1 - not measured here |
| 34 | Must `Invoke-WebRequest`/`irm` calls on Windows PowerShell 5.1 pass `-UseBasicParsing`? | Since the 2025-12-09 update the call prompts and fails under `-NonInteractive` (measured) | [Invoke-WebRequest 5.1](https://learn.microsoft.com/powershell/module/microsoft.powershell.utility/invoke-webrequest?view=powershell-5.1); measured | no | pwsh, installer | P0 - new, silent in CI, one-flag fix |
| 35 | What shell and flags does a GitHub Actions `run:` step actually get on each OS (`bash -e {0}` vs `-eo pipefail`, pwsh, cmd), and what must be set explicitly? | Unlisted dependency (H5); pipefail absent by default; pwsh only fails on last native command | [workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) | partial (python-quality `ci-gate.md`, bazel `ci.md` touch CI shells) | ci | P0 - every CI file |
| 36 | How is untrusted input kept out of `run:` scripts (`env:` intermediate variable, `$GITHUB_ENV`/`$GITHUB_OUTPUT` delimiter injection)? | Script injection via `github.event.*` and `github.head_ref` | [Security Lab](https://securitylab.github.com/resources/github-actions-untrusted-input/), [secure use](https://docs.github.com/en/actions/reference/security/secure-use) | no | ci, security | P0 - security class with a grep check |
| 37 | Which shell features work in a taskfile `cmds` entry (mvdan/sh) versus the system shell? | Not the system shell; `pipefail` and `shopt` quirks; zsh syntax unsupported | [task#2469](https://github.com/go-task/task/issues/2469), [mvdan/sh zsh issues](https://github.com/mvdan/sh/issues/1429) | no | ci, posix | P1 - fleet uses taskfiles |
| 38 | How can a shell test fail silently (bats `! cmd`, `[[ ]]` on bash < 4.1, `set -e` in `load`), and what is the safe assertion form? | A test that cannot fail verifies nothing | [bats-core#1200](https://github.com/bats-core/bats-core/issues/1200), [bats-core#80](https://github.com/bats-core/bats-core/issues/80), [shellcheck#2360](https://github.com/koalaman/shellcheck/issues/2360) | no | testing | P1 - gate quality |
| 39 | How is quoting preserved across execution boundaries (`ssh`, `docker exec`, `bash -c`, YAML, `eval`)? | QuoteBench: 55.4 to 73.2 point loss through an extra parser; BashFAQ/096 | [QuoteBench](https://arxiv.org/abs/2608.13547), [BashFAQ/096](https://mywiki.wooledge.org/BashFAQ/096) | no | any, emitter | P1 - agent-specific, verifiable by round trip |
| 40 | Which Windows Git Bash/MSYS behaviours break scripts (`/c` path conversion, `//c`, `MSYS_NO_PATHCONV`, `ln -s` copies, CRLF from natives)? | `cmd /c` launches interactive cmd (hang); paths rewritten | measured | no | userland, ci | P1 - measured; Windows CI runners |
| 41 | How is untrusted input kept out of arithmetic contexts and `eval` (`$(( ))`, `[[ -eq ]]`, array subscripts)? | `a[$(cmd)]` executes; ShellCheck silent | [shellcheck#2679](https://github.com/koalaman/shellcheck/issues/2679) | no | bash, security | P1 - security, no linter |
| 42 | How does an rc-file or profile edit stay idempotent (marker lines, `grep -q` guard, trailing-newline repair, per-shell rc file choice)? | Duplicate or broken blocks on re-run; installers and emitters | `nvm-sh__nvm@b1b3a0038c06:install.sh:484,493`; `Homebrew__install@8ab1549dfa11:install.sh:1139-1145` | no | installer, emitter | P0 - ocx/grimoire installers do this |
| 43 | Can an emitter's escaping for each target shell (bash `${x@Q}` 4.4+/`printf %q`, zsh, fish `string escape`, nu, elvish, pwsh single-quote doubling) be verified by round trip through the matrix? | A per-shell escape bug is injection or corruption (H3) | [QuoteBench](https://arxiv.org/abs/2608.13547); matrix method | no | emitter | P0 - strongest pull on the program |
| 44 | Which environment-import hooks change behaviour (`BASH_ENV`, `ENV`, `POSIXLY_CORRECT`, `BASH_FUNC_*`, `BASH_COMPAT`)? | Shellshock residue; Homebrew aborts under `POSIXLY_CORRECT` | [CVE-2014-6271](https://nvd.nist.gov/vuln/detail/CVE-2014-6271), [Homebrew/install#686](https://github.com/Homebrew/install/issues/686) | no | bash, security | P2 - rare, high impact |
| 45 | When do `$?` and command substitution interact badly (`echo "$(cmd) $?"`, `cmd; (( ! $? ))`, SC2181/SC2320)? | `$?` replaced by the substitution's own status (shellcheck#3522) | [shellcheck#3522](https://github.com/koalaman/shellcheck/issues/3522), [SC2181](https://www.shellcheck.net/wiki/SC2181) | no | any | P2 - partly linted |
| 46 | How are subshell and pipeline scope handled (`cmd \| while read` loses variables, `done < <(…)` vs `<<< "$(…)"`, `lastpipe` 4.2+, here-string availability)? | #8, #63; busybox ash lacks `<<<` (measured) | [BashPitfalls #8, #63](https://mywiki.wooledge.org/BashPitfalls) | no | bash, posix | P1 - common loop idiom |
| 47 | How should `read` loops be written (`IFS= read -r`, `-d ''`, stdin theft by `ssh`/`ffmpeg`)? | SC2162, BashFAQ/089 | [BashFAQ/089](https://mywiki.wooledge.org/BashFAQ/089), [SC2162](https://www.shellcheck.net/wiki/SC2162) | no | any | P1 - frequent, linted |
| 48 | What should an error-exit and exit-status contract look like for scripts (codes, stderr, `die`), mirroring the Rust cli-contract? | Exit codes and streams are shared across the fleet | `rules/rust-quality/cli-contract.md` | partial | any | P2 - sibling already defines the code table |
| 49 | Which bash `shopt` options and compat levels (`inherit_errexit`, `globasciiranges`, `lastpipe`, `nullglob`, `BASH_COMPAT`, `compat44`) belong in a hardened prologue, and which exist on 3.2? | Behaviour drift across 3.2-5.3; options missing before 4.x | bash 5.3 `NEWS`/`COMPAT` | no | bash | P1 - enumerable from NEWS |
| 50 | How do concurrency pitfalls (`xargs -P` interleaving, `wait -n` 4.3+, background loops, `find -exec sh -c {}`) get caught? | #51, #52; SC2156 | [BashPitfalls #51, #52](https://mywiki.wooledge.org/BashPitfalls) | no | any | P2 - rarer than the others |

## Recent shifts seen in this corpus

Last 24 months (2024-10 to 2026-10) and the older advice each invalidates:

- **POSIX.1-2024 (Issue 8) adds `set -o pipefail`.** Invalidates "pipefail is a bashism" (ShellCheck SC3040 still says so in 0.11.0). Reality is split by distro: Debian 13 dash 0.5.12-12 and Alpine ash support it; Debian 12 and Ubuntu 24.04 dash and posh do not (measured 2026-10-10).
- **bash 5.3 (2025)**: `${ cmd; }` funsubs (no fork), `array_expand_once` replacing `assoc_expand_once`, `GLOBSORT`, NULL `$PATH` means `.`, `trap -P`, `source -p`, `wait -n` returns terminated process substitutions. bash 5.2 (2022) changed array-subscript re-evaluation; BashPitfalls #61/#62 workarounds are version-specific.
- **ShellCheck 0.11.0**: SC2329 "function never invoked" is the second most frequent code in the exemplar corpus (816 findings in 102 files); SC3xxx now 65 codes; errexit checks remain optional.
- **fish 4.0.0 (2025-02-27)** Rust rewrite: `?` no longer a glob (measured), `for`-loop locals not remembered, `test-require-arg` and `remove-percent-self` preview flags, `{echo,echo}` compound commands in 4.1, terminfo `bind -k` removed (4.1), no terminfo reading (4.5). Older advice "fish `?` glob" and "bind -k" is wrong for 4.x.
- **nushell 0.100 to 0.116.1 (2024-11 to 2026-10)**: `$nu.home-path` and `$nu.temp-path` renamed (0.110, 2026-01-17), `str upcase`/`downcase` deprecated (0.114, 2026-07-04), `into value` replaced by `detect type` (0.108), hook order changed (0.107), submodules no longer implicitly imported (0.114), shadowing parser keywords disallowed (0.115). Any nushell snippet in 2024-era training data is suspect.
- **Windows PowerShell 5.1 `Invoke-WebRequest` (2025-12-09, CVE-2025-54100)**: default behaviour now prompts unless `-UseBasicParsing`; measured failing under `-NonInteractive` on build 5.1.26100.9444. Invalidates "`-UseBasicParsing` only matters without Internet Explorer".
- **PowerShell lifecycle**: 7.6 is LTS (released 2026-03-18, EOS 2028-11-14); 7.4 LTS and 7.5 reach EOS 2026-11-10; 7.7 preview makes `New-Guid` emit UUIDv7. Installer floor stays 5.1 (Windows ships only 5.1).
- **Ubuntu 25.10 ships uutils coreutils by default** (2025-10); a `date -r` bug broke unattended-upgrades; 26.04 LTS keeps GNU `cp`/`mv`/`rm`. Invalidates "Ubuntu userland is GNU coreutils".
- **elvish 0.21.0** removed `a=b command`, `eawk`, `~/.elvish`; deprecated implicit cd.
- **GitHub docs**: the shell table now lists `pwsh -command ". '{0}'"` and the `bash` fallback to `sh`; fail-fast behaviour unchanged (H5).
- **bats 1.12.0 on bash 5.3.0**: failed assertions reported as going unnoticed unless wrapped in a subshell ([bats-core#1200](https://github.com/bats-core/bats-core/issues/1200), closed 2026-04-13).

## Contested

- **`set -euo pipefail` as a universal prologue.** Wooledge (BashPitfalls #60, BashFAQ/105) says errexit and pipefail have "very intricate rules" and breed false confidence; agent-rule collections (Cursor rules, Tessl) and GitHub Actions (`bash --noprofile --norc -eo pipefail {0}`) make it default. Trend: experts move to explicit `|| return`/`|| exit` plus ShellCheck; platforms keep the default. A rule should say where strict mode is acceptable (bash, pinned version) and what it never replaces.
- **`pipefail` in `#!/bin/sh`.** POSIX.1-2024 requires it; ShellCheck still warns (SC3040); Ubuntu 24.04 dash lacks it. Trend: becoming portable from 2025-2026 as distros update; for now version-gate.
- **`[[ ]]` versus `[ ]`.** ShellCheck optional `require-double-brackets` (SC2292) pushes `[[` in bash; POSIX scripts need `[`. Not really contested once the dialect is declared, but agents mix them.
- **`#!/usr/bin/env bash` versus `#!/bin/bash`.** `env` picks Homebrew bash 5 on macOS if first on PATH (non-reproducible); `/bin/bash` is the 3.2.57 Apple build. Homebrew's own installer chooses `#!/bin/bash` plus a `BASH_VERSION` check (`install.sh:17-19`); many portable-script guides choose `env`. Unresolved.
- **`local` in POSIX sh.** Not POSIX (SC3043); supported by dash, ash, mksh, bash, zsh, yash, posh; absent in ksh93u+m (measured). Practice (rustup) is to use it with an alias fallback. De-facto standard.
- **BOM.** Unix practice and Wooledge say never; Windows PowerShell 5.1 needs it for non-ASCII; PSScriptAnalyzer `UseBOMForUnicodeEncodedFile` is always on. Safest cross-version position (inferred, not sourced): keep `.ps1` ASCII-only for 5.1-targeted installers, BOM-free `.sh`.
- **`bash --posix` and `zsh --emulate sh` as portability checks.** Folk advice says use them; measured: bash 5.2 `--posix` accepts `${x,,}`, arrays and `<(...)`. Only dash/busybox/posh plus bash 3.2 runs are meaningful.
- **Shell test frameworks as gates.** bats is the standard, yet #1200/#80 show negated assertions and `source` under `set -e` can pass vacuously; whether a bats suite proves anything depends on assertion form.

## Sources

Primary = specs, manuals, changelogs, vendor docs, the tool's own repo or tracker. Date is page date or era.

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [mywiki.wooledge.org/BashPitfalls](https://mywiki.wooledge.org/BashPitfalls) | Canonical catalog, 65 numbered pitfalls (primary) | living, ~2007-2026 | The failure-class backbone; #60 on errexit/pipefail/nounset |
| [mywiki.wooledge.org/BashFAQ](https://mywiki.wooledge.org/BashFAQ) | 123-entry FAQ index (primary) | living | Entries exist because bugs recur |
| [mywiki.wooledge.org/BashFAQ/105](https://mywiki.wooledge.org/BashFAQ/105) | Why `set -e` does not do what you expect, with exercises (primary) | living | Runnable errexit tests |
| [pubs.opengroup.org POSIX.1-2024 XCU 2](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html) | Shell Command Language spec (primary) | 2024 (Issue 8) | `pipefail`, errexit ignore rules, pipeline status table |
| [ftp.gnu.org bash-5.3.tar.gz (NEWS, COMPAT)](https://ftp.gnu.org/gnu/bash/bash-5.3.tar.gz) | Bash release notes and compat doc (primary) | 2025 | Per-version features, `globasciiranges` 5.0, compat levels |
| [ShellCheck wiki: Optional checks](https://github.com/koalaman/shellcheck/wiki/Optional) | Optional-check list as of 0.11.0 (primary) | 2025-2026 | errexit checks are optional |
| [ShellCheck wiki: SC2086](https://www.shellcheck.net/wiki/SC2086) | The top code (primary) | living | Exceptions and intended-splitting idioms |
| [ShellCheck wiki SC3010 family](https://www.shellcheck.net/wiki/SC3010) | SC3001-SC3064 portability codes (primary) | living | The sh-mode verification surface |
| [koalaman/shellcheck issues #2615, #2555, #3444, #2679, #3522, #2360, #809](https://github.com/koalaman/shellcheck/issues/2615) | ShellCheck tracker (primary) | 2016-2026 | What it cannot do: bash-version target, errexit, arithmetic injection |
| [bats-core issues #1200, #80, #1230](https://github.com/bats-core/bats-core/issues/1200) | bats tracker (primary) | 2018-2026 | Vacuously-passing tests |
| [mvdan/sh issues](https://github.com/mvdan/sh/issues/1429) | shfmt/interp tracker (primary) | 2020-2026 | zsh syntax unsupported; taskfile interpreter limits |
| [go-task/task issues #2469, #2429, #2043](https://github.com/go-task/task/issues/2469) | Taskfile runner tracker (primary) | 2025 | `pipefail`/`shopt` in mvdan/sh |
| [ValveSoftware/steam-for-linux#3671](https://github.com/ValveSoftware/steam-for-linux/issues/3671) | Steam `rm -rf "$STEAMROOT/"*` incident (primary) | 2015-01-14 | Empty-variable destructive glob |
| [MrMEEE/bumblebee-Old-and-abbandoned#123](https://github.com/MrMEEE/bumblebee-Old-and-abbandoned/issues/123) | Bumblebee `rm -rf /usr` incident (primary) | 2011-05-24 | Stray space in destructive argument list |
| [NVD CVE-2014-6271](https://nvd.nist.gov/vuln/detail/CVE-2014-6271) | Shellshock record (primary) | 2014-09-24 | Environment function import |
| [rustup-init.sh](https://github.com/rust-lang/rustup/blob/master/rustup-init.sh) | Installer exemplar (primary) | `61271d00a979`, 2026-10 | `main "$@"` truncation guard, `local` probe |
| [Homebrew/install install.sh](https://github.com/Homebrew/install/blob/master/install.sh) | Installer exemplar (primary) | `8ab1549dfa11` | bash 3.2 target, `POSIXLY_CORRECT` abort, rc selection |
| [nvm install.sh](https://github.com/nvm-sh/nvm/blob/master/install.sh) | Installer exemplar (primary) | `b1b3a0038c06` | Idempotent rc edit |
| [GitHub docs: workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) | Default shell table (primary) | 2026-10 | `bash -e {0}` vs `-eo pipefail`, pwsh `Stop` |
| [GitHub docs: secure use](https://docs.github.com/en/actions/reference/security/secure-use) | Script injection guidance (primary) | 2026 | Intermediate env var |
| [GitHub docs: workflow commands](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands) | `$GITHUB_ENV`/`GITHUB_OUTPUT` and delimiters (primary) | 2026 | Multiline injection warning |
| [GitHub Security Lab: untrusted input](https://securitylab.github.com/resources/github-actions-untrusted-input/) | Attacker-controlled context list (primary) | 2021, still current | Contexts and fix |
| [git-scm gitattributes](https://git-scm.com/docs/gitattributes) | Line-ending attributes (primary) | current | `*.sh text eol=lf`, autocrlf defaults |
| [fish-shell CHANGELOG.rst](https://github.com/fish-shell/fish-shell/blob/master/CHANGELOG.rst) | fish release notes 3.x-4.9.3 (primary) | up to 2026-09-08 | Backwards-incompatible changes and feature flags |
| [nushell release posts 0.80-0.116.1](https://www.nushell.sh/blog/) | Per-release breaking changes (primary) | 2023-05 to 2026-10 | Removed/renamed commands |
| [elvish release notes 0.18-0.22](https://github.com/elves/elvish/tree/master/website/blog) | Elvish breaking changes (primary) | up to 2025-07 | Removed syntax |
| [MS Learn: differences from Windows PowerShell](https://learn.microsoft.com/powershell/scripting/whats-new/differences-from-windows-powershell) | 5.1 vs 7 differences (primary) | 2026 | `$?`, `$ErrorActionPreference`, encoding changes |
| [MS Learn: What's New in PowerShell 7.3-7.7](https://learn.microsoft.com/powershell/scripting/whats-new/what-s-new-in-powershell-73) | Breaking-change lists (primary) | 2022-2026 | Native argument passing, `New-Guid` v7 |
| [MS Learn: about_Preference_Variables](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_preference_variables) | `$PSNativeCommand*` variables (primary) | 7.6 | Arg-passing modes, error-action for natives |
| [MS Learn: about_Character_Encoding](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_character_encoding) | Encoding and BOM rules (primary) | 7.6 | 5.1 vs 7 defaults |
| [MS Learn: Invoke-WebRequest 5.1](https://learn.microsoft.com/powershell/module/microsoft.powershell.utility/invoke-webrequest?view=powershell-5.1) | Cmdlet doc with the 2025-12-09 warning (primary) | 2025-12 | CVE-2025-54100 behaviour change |
| [MS Learn: PowerShell support lifecycle](https://learn.microsoft.com/powershell/scripting/install/powershell-support-lifecycle) | EOS dates (primary) | 2026 | 7.6 LTS, 7.4/7.5 EOS 2026-11-10 |
| [PSScriptAnalyzer docs/Rules](https://github.com/PowerShell/PSScriptAnalyzer/tree/main/docs/Rules) | Rule documentation (primary) | `411c3d0b197b`, 2026-09 | `UseCompatibleSyntax` default disabled; BOM rule |
| [Apple: Use zsh as the default shell](https://support.apple.com/en-us/102360) | Apple shell policy (primary) | current | zsh since 10.15, `/var/select/sh` |
| [uutils/coreutils README](https://github.com/uutils/coreutils) | Rust coreutils goals (primary) | 2026 | "drop-in" aim vs known differences |
| [LWN: uutils in Ubuntu](https://lwn.net/Articles/1069481/) | Secondary report on 25.10/26.04 | 2026 | Which utilities stay GNU |
| [QuoteBench, arXiv 2608.13547](https://arxiv.org/abs/2608.13547) | LLM Bash command benchmark (abstract only) | 2026 | Quoting failures across execution paths |
| [Bash in the Wild, ACM TOSEM 2023](https://research.monash.edu/en/publications/bash-in-the-wild-language-usage-code-smells-and-bugs/) | Study of ~1M GitHub scripts | 2023-02 | Empirical failure categories |
| [Cursor rules for Bash (dev.to)](https://dev.to/olivia_craft/cursor-rules-for-bash-6-rules-that-stop-ai-from-generating-broken-shell-scripts-50a7) | Practitioner agent rules | 2026 | What agent rule files push, incl. strict mode |
| [Tessl bash common-mistakes](https://tessl.io/registry/pantheon-ai/bash-script-toolkit/1.0.1/files/validator/references/common-mistakes.md) | Practitioner mistake fixture | 2026 | 25 mistakes agents are warned about |
| [SO 14219092](https://stackoverflow.com/questions/14219092) | `/bin/bash^M: bad interpreter` | 875 votes on 2026-10-10 | CRLF canonical |
| [Unix SE 65803](https://unix.stackexchange.com/questions/65803) | Why is printf better than echo? | 740 votes on 2026-10-10 | echo portability canonical |
| [Unix SE 131766](https://unix.stackexchange.com/questions/131766) | Why does my script choke on whitespace? | 378 votes on 2026-10-10 | Quoting canonical |
| [SO 5694228](https://stackoverflow.com/questions/5694228) and [SO 1055671](https://stackoverflow.com/questions/1055671) | `sed -i` on Mac/Linux; `readlink -f` on Mac | 2011, 2009; 347 and 457 votes | BSD/GNU userland canonicals |
| [Debian/Ubuntu/Alpine container probes](https://hub.docker.com/_/ubuntu) | dash and busybox behaviour measured via `shellzoo:deb12`, `shellzoo:deb13`, `ubuntu:24.04`, `alpine:3.22` | 2026-10-10 | `pipefail` availability per distro |

Not fetched and therefore not relied on: shellcheck.net published usage statistics (none found), ScriptSmith, BashCoder-R1, CARE and SecGenEval-PS bodies, macOS bash/BSD behaviour (no host), locale-dependent ranges in `en_US.UTF-8` (no such locale in the containers), PSScriptAnalyzer runtime behaviour (module not installed).

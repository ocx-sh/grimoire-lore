---
title: Detecting bash 4+ features and version drift for a bash 3.2 floor
topic: dialect/bash-version-gate (rows M-A-06, M-A-07, M-A-08, M-A-11, M-A-12, M-A-22, M-B-03, M-B-04, M-B-19, M-C-16; rule family SH-DIAL)
agent: w2-bash-version-gate
model: sonnet
date_researched: 2026-10-11
sources_count: 24
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/bash-version-gate/
scope: |
  Covers which bash 4.0-5.3 constructs break on macOS /bin/bash 3.2.57 (parse-time vs run-time vs silent), the mechanical checks that find them
  when ShellCheck cannot (grep denylist, bash -n on bash:3.2, a refuse-or-re-exec guard, a gate run), set -e / set -u drift across 3.2-5.3,
  the 5.2 silent changes (patsub_replacement, globskipdots), 5.3 features vs distro bash, and BASH_COMPAT.
  Not covered: POSIX sh floors (dialect/floors-and-shebangs), BSD/macOS userland (dialect/userland-floor), zsh/fish/nu/pwsh.
  No macOS host: every claim about macOS itself is "unverified: read only"; bash:3.2 (docker, 3.2.57 musl build) stands in for /bin/bash.
---

# Detecting bash 4+ features and version drift for a bash 3.2 floor

Researched 2026-10-11. All runs are real interpreters: docker `bash:3.2` (3.2.57), `bash:4.0` (4.0.44), `bash:4.1` (4.1.17), `bash:4.2` (4.2.53), `bash:4.3` (4.3.48), `bash:4.4` (4.4.23), `bash:5.0` (5.0.18), `bash:5.1` (5.1.16), `bash:5.2` (5.2.37), `bash:5.3` (5.3.20). `matrix.sh bash` has no 4.1 or 4.3; the fixture runner `vrun.sh` adds both (images pulled 2026-10-11). Fixture paths below are relative to the fixtures directory above.

## Contents

1. [Summary](#summary)
2. [Findings](#findings)
   - [F1 The version table: first working version and failure mode](#f1-the-version-table)
   - [F2 Parse-time vs run-time: what `bash -n` on 3.2 can and cannot see](#f2-parse-time-vs-run-time)
   - [F3 ShellCheck, shfmt and the missing 3.2 target](#f3-shellcheck-shfmt-and-the-missing-32-target)
   - [F4 The guard: idiom, placement, and the five ways to place it wrong](#f4-the-guard)
   - [F5 The denylist and its measured precision](#f5-the-denylist)
   - [F6 errexit drift: `(( ))`, `[[ ]]`, `( false )`](#f6-errexit-drift)
   - [F7 set -u drift: `"${@}"` and empty arrays](#f7-set--u-drift)
   - [F8 Silent 5.2 changes: patsub_replacement and globskipdots](#f8-silent-52-changes)
   - [F9 Bash 5.3 features vs the distro bash that exists](#f9-bash-53-vs-distros)
   - [F10 BASH_COMPAT and `shopt compatNN` are not a portability tool](#f10-bash_compat)
   - [F11 The hardened-prologue shopts](#f11-the-hardened-prologue-shopts)
   - [F12 Floor policy: 3.2 for every unpinned bash script](#f12-floor-policy)
   - [F13 Fleet defects (reported, not fixed)](#f13-fleet-defects)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- ShellCheck 0.11.0 reports **none** of the 47 probed bash 4+ constructs under `-s bash` (0 version diagnostics, also with `--enable=all`); there is no 3.2 target ([koalaman/shellcheck#2615](https://github.com/koalaman/shellcheck/issues/2615), open, created 2022-10-25, 0 comments on 2026-10-11). The 3.2 floor is enforceable only by a grep denylist plus a run on `bash:3.2`.
- `bash -n` on 3.2 rejects only **6 of 47** constructs: `|&`, `&>>`, `coproc`, `;;&`, `[[ -v ]]`, and an unparenthesised `case` inside `$( )`. Everything else (`declare -A`, `mapfile`, `${x,,}`, `${x@Q}`, `${ cmd; }`, `[ -v ]`, `${a[-1]}`) parses and fails only when executed. `bash -n` is a necessary, never a sufficient, gate (F2).
- Bash reads a script command by command, but parses a whole compound command (function body, `if`, `{ }`) before running any of it. A guard inside `main() { ... }` that also contains `[[ -v x ]]` never runs on 3.2: the function never gets defined and the script dies with exit 2 and a syntax error (fixture `guard-late-fn.sh`).
- The guard belongs in a 3.2-parsable prologue, before any statement and outside any compound command: `[ "${BASH_VERSINFO[0]:-0}" -lt 4 ]` style tests, `exit 69` with a stderr message and nothing on stdout. Everything after it may use the newer syntax, even `[[ -v ]]` inside later functions (`guard-first.sh`, exit 69 on 3.2/4.1, runs on 4.2+).
- A guard written as `case ${BASH_VERSION-} in '' | [0-3].* | 4.[01].* )` is the portable form: it parses and refuses cleanly on dash, busybox ash, mksh, ksh93, yash, posh, zsh and bash 3.2 (all exit 69), while the array form `${BASH_VERSINFO[0]}` dies with "Bad substitution" (exit 2) under dash and busybox ash.
- A sourced library must refuse with `return 69 2>/dev/null || exit 69`, never bare `exit`; with an unguarded 4.2 construct inside one function a 3.2 `source` loses that function **and every definition after it** (`source rc=1`, `lib_after: MISSING`).
- Runtime-only constructs (`${x,,}`, `declare -A`, `mapfile`, `${x@Q}`, `${ cmd; }`) may hide in the untaken branch of a `BASH_VERSINFO` test; parse-time constructs may not. This is why pyenv and git-completion are safe and oh-my-posh's `[[ -v MC_SID ]]` (omp.bash:34) breaks sourcing on 3.2/4.0/4.1.
- `set -e` drift is at **4.1**, not 4.2: a failing `(( ))` or `[[ ]]` statement aborts from 4.1; on 3.2 and 4.0 the script continues (`(( i++ ))` from 0 and `[[ a == b ]]` both print `reached`). A function whose last command is a failing `[[ ]]` aborts the caller on **every** version (3.2 included). Rewrite: `i=$((i + 1))`, `[[ ... ]] || die`.
- `set -e; ( false ); echo after` **continues on 3.2** and aborts from 4.0, including `( cd dir && build )` statements; 5 fleet sites use that shape. Rewrite: `( ... ) || exit "$?"`.
- `set -u` drift: braced `"${@}"` / `${*}` with zero arguments is "unbound variable" **only on 3.2**; `"$@"` and `"$*"` are fine everywhere. `"${arr[@]}"` of an empty array is unbound on 3.2-4.3 and fine from 4.4. The idiom `${arr[@]+"${arr[@]}"}` works on all ten versions.
- `${y/b/[&]}` prints `a[&]c` on 3.2-5.1 and `a[b]c` on 5.2-5.3 with no error; `.*` expands to `. .. .h` on 3.2-5.1 and `.h` on 5.2+. No in-pattern spelling of a literal `&` is identical on 3.2-5.3; `shopt -u patsub_replacement 2>/dev/null || :` then plain text is (fixture `patsub-safe.sh`).
- `${A[@]@K}` and `${A[@]@k}` **silently print only the values** on bash 4.0-4.3 (no error), are fatal "bad substitution" on 4.4-5.0 (`@K`) and 4.4-5.1 (`@k`), and work from 5.1 / 5.2.
- Bash 5.3 features (`${ cmd; }`, `${| cmd; }`, `GLOBSORT`, `source -p`, `trap -P`, `BASH_MONOSECONDS`) are absent from every distro bash measured 2026-10-11 except Ubuntu 26.04 (5.3.9) and Homebrew (5.3.20): Debian 12 5.2.15, Debian 13 5.2.37, Ubuntu 24.04 5.2.21, AlmaLinux 10 5.2.26. `GLOBSORT` and `BASH_MONOSECONDS` fail silently on 5.2.
- `BASH_COMPAT=32` on 5.3 does not reject `declare -A`, `${s,,}`, `mapfile`, `[[ -v ]]`, `${x@Q}`; it does not change patsub, globskipdots or errexit behaviour. `shopt -s compat50` and `compat51` do not exist on any version. It is not a portability tool.
- `shopt -s inherit_errexit` bare exits 1 on bash <= 4.3 (unknown option), so it aborts a `set -e` script; the sanctioned form is `shopt -s inherit_errexit 2>/dev/null || :`. `lastpipe` on 3.2-4.1 silently leaves the variable empty.
- The fleet has 5 files with bash 4+ features (10 denylist hit lines, 0 false positives, 0 new files), none with a version guard, one (`index/scripts/golden-baseline.sh:250`) that `index/taskfile.yml:372` tells developers to run by hand.
- ShellCheck's own wiki steers toward the breakage: SC2207 says "Prefer mapfile or read -a" ([wiki](https://www.shellcheck.net/wiki/SC2207)); an agent following it writes `mapfile`, a 4.0 builtin that is "command not found" on 3.2.

## Findings

### F1 The version table

Command (all ten versions, one container per version; `parse=` is `bash -n` on the snippet file, `exit=`/`out=` is a real run in a scratch directory with stderr merged):

```
VERSIONS="3.2 4.0 4.1 4.2 4.3 4.4 5.0 5.1 5.2 5.3" ./vrun.sh features.sh all        # fixtures/bash-version-gate/features.sh, 47 features, one S line each
./features.sh NAME                                                                 # one feature, current bash; ./features.sh emit NAME prints its snippet
```

First working version is the first row where `out=` equals the 5.3 output. "Mode on 3.2" is what a macOS /bin/bash user sees. NEWS cites are `bash-5.3.tar.gz:NEWS:<line>` ([tarball](https://ftp.gnu.org/gnu/bash/bash-5.3.tar.gz); section starts: 5.3 L1, 5.2 L203, 5.1 L374, 5.0 L560, 4.4 L738, 4.3 L962, 4.2 L1146, 4.1 L1242, 4.0 L1359, 3.2 L1557).

| Feature | Probe | First working | Mode on 3.2 | `bash -n` on 3.2 | NEWS |
|---|---|---|---|---|---|
| `declare -A` / `local -A` | `declare -A m; m[a]=1; m[b]=2; echo ${#m[@]}` | **4.0** | run: `declare: -A: invalid option`, prints `n=1` (indexed array, wrong). Under `set -e`: exit 2 before anything. Under `set -u` + `[a]=1`: `a: unbound variable` | ok | L1488 |
| `mapfile` / `readarray` | `mapfile -t x < <(printf 'a\nb\n')` | **4.0** | run: `mapfile: command not found`, `n=0` | ok | L1432 |
| `mapfile -d` | `mapfile -d "" x < <(...)` | **4.4** | 4.0-4.3: `mapfile: -d: invalid option` | ok | L754 |
| `${s^^} ${s,,} ${s^}` | `s=aBc; echo "${s^^}\|${s,,}"` | **4.0** | run: `bad substitution`, whole command line abandoned (F2) | ok | L1482 |
| `declare -u` / `-l` | `declare -u s=abc` | **4.0** | run: `declare: -u: invalid option`, `$s` is never set (prints empty) | ok | L1359 section |
| `\|&` | `f \|& cat` | **4.0** | **parse**: `syntax error near unexpected token '&'` | **FAIL** | L1359 section |
| `&>>` | `echo hi &>> out.txt` | **4.0** | **parse**: `syntax error near unexpected token '>'` | **FAIL** | L1463 |
| `coproc` | `coproc C { echo hi; }` | **4.0** | **parse**: `syntax error near unexpected token '}'` | **FAIL** | L1496 |
| `;;&` / `;&` | `case a in a) ...;;& *) ...;; esac` | **4.0** | **parse**: `syntax error near unexpected token '&'` | **FAIL** | L1359 section |
| `shopt -s globstar` | `shopt -s globstar; echo **/f.txt` | **4.0** | run: `invalid shell option name`; `**` behaves as `*`; prints literal `**/f.txt` | ok | L1439 |
| `read -t 0.2` | `read -t 0.2 v < <(sleep 2)` | **4.0** | run: `invalid timeout specification`, rc 1. Integer timeout: a timeout returns rc 1 on 3.2, **142** (>128) from 4.0 | ok | L1359 section |
| brace zero-pad / step | `echo {01..03}`, `echo {1..10..4}` | **4.0** | **silent**: prints `1 2 3` and the literal `{1..10..4}` | ok | L1359 section |
| `exec {fd}>file` | `exec {fd}>/dev/null` | **4.1** | run: `exec: {fd}: not found`, rc 127 | ok | L1242 section |
| `[[ -v x ]]` | `if [[ -v x ]]; then ...` | **4.2** | **parse**: `conditional binary operator expected` (also 4.0, 4.1) | **FAIL** | L1168 |
| `[ -v x ]` | `[ -v x ]` | **4.2** | run: `[: -v: unary operator expected`, takes the false branch (wrong result) | ok | L1168 |
| `${a[-1]}` read | `a=(a b c); echo "${a[-1]}"` | **4.2** | run: `a: bad array subscript`, prints empty | ok | L1194 |
| `a[-1]=Z` assign | `a=(a b c); a[-1]=Z` | **4.3** | run: `a[-1]: bad array subscript`, rc 1 (also 4.2) | ok | L1042 |
| `${s:0:-2}` | `s=abcdef; echo "${s:0:-2}"` | **4.2** | run: `-2: substring expression < 0`, rc 1 | ok | L1197 |
| `printf '%(%Y)T' 0` | `printf "%(%Y)T\n" 0` | **4.2** | run: ``printf: `(': invalid format character``, rc 1 | ok | L1187 |
| `shopt -s lastpipe` | `shopt -s lastpipe; set +m; echo a \| read v; echo "[$v]"` | **4.2** | run: `invalid shell option name`; **silent wrong result** `v=[]` | ok | L1206 |
| `declare -g` | `f(){ declare -g G=1; }; f; echo $G` | **4.2** | run: `declare: -g: invalid option`, `G` unset | ok | L1165 |
| `local -n` / `declare -n` | `f(){ local -n r=$1; r=hi; }; f v` | **4.3** | run: `local: -n: invalid option`, `v` stays empty (silent wrong) | ok | L1038 |
| `wait -n` | `sleep 0.2 & wait -n; echo $?` | **4.3** | run: `wait: -n: invalid option`, rc 2 | ok | 4.3 section |
| `${x@Q}` | `x="a b"; echo "${x@Q}"` | **4.4** (4.3: bad substitution) | run: `bad substitution` | ok | L787 |
| `shopt -s inherit_errexit` | `shopt -s inherit_errexit; set -e; x=$(false; echo hi; true)` | **4.4** | run: `invalid shell option name`, rc 1 (aborts under `set -e`); cmd-sub keeps going: `x=[hi]` | ok | L856 |
| `EPOCHREALTIME`, `EPOCHSECONDS` | `echo "[${EPOCHREALTIME:+set}]"` | **5.0** | **silent**: empty on 3.2-4.4 | ok | L571 |
| `BASH_ARGV0=name` | `BASH_ARGV0=foo; echo $0` | **5.0** | **silent**: `$0` unchanged on 3.2-4.4 | ok | 5.0 section |
| `SRANDOM` | `echo "[${SRANDOM:+set}]"` | **5.1** | **silent**: empty on 3.2-5.0 | ok | L403 |
| `${x@U} @u @L` | `x=abc; echo "${x@U}"` | **5.1** | run: `bad substitution` (also 4.4-5.0) | ok | L466 |
| `${A[@]@K}` | `declare -A A=([x]=1); echo "${A[@]@K}"` | **5.1** | 4.0-4.3: **silent, prints `1`** (values only). 4.4-5.0: `bad substitution`. 5.1+: `x "1"` | ok | L481 |
| `${A[@]@k}` | same with `@k` | **5.2** | 4.0-4.3: **silent, prints `1`**. 4.4-5.1: `bad substitution`. 5.2+: `x 1` | ok | L274 |
| `${y/b/[&]}` | `y=abc; echo "${y/b/[&]}"` | n/a (behaviour change **5.2**) | 3.2-5.1 `a[&]c`; 5.2-5.3 `a[b]c`; **silent** (F8) | ok | L288 |
| `.*` glob | `touch .h f; echo .*` | n/a (behaviour change **5.2**) | 3.2-5.1 `. .. .h`; 5.2-5.3 `.h`; **silent** (F8) | ok | L298 |
| `${ cmd; }` | `x=${ echo hi; }` | **5.3** | run: `bad substitution` through 5.2 | ok | L57 |
| `${\| cmd; }` | `echo "${\| REPLY=hi; }"` | **5.3** | run: `bad substitution` through 5.2 | ok | L57 |
| `GLOBSORT=size` | `GLOBSORT=size; echo *` | **5.3** | **silent**: `a b c` on 3.2-5.2, `a c b` on 5.3 | ok | L50 |
| `source -p PATH f` | `source -p . lib.sh` | **5.3** | run: `source: -p: invalid option`, rc 2 | ok | L113 |
| `trap -P EXIT` | `trap -P EXIT` | **5.3** | run: `trap: -P: invalid option`, rc 2 | ok | L28 |
| `BASH_MONOSECONDS` | `echo "[${BASH_MONOSECONDS:+set}]"` | **5.3** | **silent**: empty through 5.2 | ok | L68 |
| `$(case a in a) ...;; esac)` | `x=$(case a in a) echo yes;; esac)` | **4.0** (3.2 cannot parse a `)` pattern inside `$( )`) | **parse**: `syntax error near unexpected token ';;'`. Fix: `(a)` pattern, works on all ten | **FAIL** | n/a (parser fix) |

Pivot of the same data by version range (generated from `feat.out`; run-time failures with a diagnostic are *loud*, the rows marked silent produce wrong results with no message):

- **Loud on 3.2, fixed by 4.0:** `declare -A/-u`, `mapfile`, `readarray`, `${x^^}`, `globstar`, `read -t 0.2`.
- **Silent on 3.2:** brace zero-pad and step, `lastpipe` (message but wrong value), `local -n` (message but wrong value), `[ -v x ]`, `EPOCHREALTIME`, `SRANDOM`, `BASH_ARGV0`, `GLOBSORT`, `BASH_MONOSECONDS`, `@K`/`@k` on 4.0-4.3, patsub and dot globs across 5.1/5.2.
- Of 47 features, **44 are flagged** by the stage-1 denylist; the 3 unflagged are by design (F5).

Version cross-checks against secondary lists: Wooledge's [BashFAQ/061](https://mywiki.wooledge.org/BashFAQ/061) lists `${ CMDS;}` 5.3, `GLOBSORT` 5.3, `${var@k}` 5.2, `patsub_replacement` 5.2, `globskipdots` 5.2, `SRANDOM` 5.1 and matches the table. ShellCheck's wiki SC2207 states `mapfile -t array < <(cmd)` needs "bash 4.4+"; measured, it works on 4.0 (`n=2` on 4.0-5.3), so that annotation is conservative.

### F2 Parse-time vs run-time

Bash executes a script file command by command and parses each *complete command* before running it. A complete command is a simple command, or a whole compound command (`if...fi`, `{...}`, a function body, a loop). Consequences, all measured on 3.2:

1. A parse error at top level aborts the script **at that line**; earlier lines already ran, later lines never parse (`guard-late-top.sh`: line 4 `[[ -v HOME ]]`, exit 2, guard on line 5 never reached).
2. A parse error inside a function body prevents the **function from being defined**; the rest of the file is skipped for the error line and the script exits 2 (`guard-late-fn.sh`).
3. A parse error in a **sourced** file aborts the rest of that file; `source` returns 1, the caller continues with a half-loaded library (`source-parse.sh`: `lib_before` defined, `lib_bad` and `lib_after` MISSING on 3.2 and 4.1; all defined on 4.2).
4. `bash -n file` parses the **whole** file regardless, so it fails on a script that would have run fine up to the bad line, and on a guarded script that would have refused cleanly (`bash -n guard-first.sh` on 3.2 exits 2 although `bash guard-first.sh` exits 69).
5. A run-time `bad substitution` does not abort the script on 3.2 without `set -e`. It abandons the current command line (same-line commands after `;` do not run), and later lines continue **with the empty value**:

```
badsub-scope.sh on bash 3.2          (s=aB; the failing expansion is "${s,,}")
same line, next cmd     bad substitution (exit 1)                       # SAME-LINE-NEXT never printed
next line               bad substitution NEXT-LINE (exit 0)
inside function         bad substitution AFTER-F (exit 0)               # IN-F-AFTER never printed
in assignment           bad substitution AFTER-ASSIGN x=[] (exit 0)     # continues with x empty
set -e, in assignment   bad substitution (exit 1)
in command subst        bad substitution AFTER x=[] (exit 0)
posix mode              bad substitution AFTER-POSIX (exit 0)
bash 4.0-5.3            ab / x=[ab] on every row
```

So on 3.2 a bash-4 expansion typically yields a diagnostic plus a *silently continuing* script with empty variables, not a clean stop. Rule of thumb for reviewers: a floor violation looks like a successful run with missing data.

6. `bash 5.2` made invalid transformation operators **fatal** word-expansion errors ([NEWS:285](https://ftp.gnu.org/gnu/bash/bash-5.3.tar.gz): "Invalid parameter transformation operators are now invalid word expansions, and so cause fatal errors in non-interactive shells"); measured `${x@Q}` `bad substitution` rc 1 on 3.2-4.3, so the 3.2 behaviour above is the old, lenient one.

Three constructs that parse everywhere in `bash -n` yet are the ones agents write most: `declare -A`, `mapfile`, `${x,,}`. This is why the denylist (F5) is primary and `bash -n` is secondary.

### F3 ShellCheck, shfmt and the missing 3.2 target

- ShellCheck 0.11.0, `shellcheck -s bash -f json` over the 47 snippets, also `--enable=all`: codes returned are 1091, 2034, 2119, 2120, 2124, 2145, 2162, 2194 (plus 2249, 2250, 2292, 2312 under `--enable=all`); **none** concerns a bash version. SC2127 (`${ ..; }`) is documented as emitted by 0.10.0 and below and "fixed" by upgrading ([wiki SC2127](https://www.shellcheck.net/wiki/SC2127)); 0.11.0 stays silent on both funsub forms.
- [koalaman/shellcheck#2615](https://github.com/koalaman/shellcheck/issues/2615) "Allow configuring to reject code that is incompatible with bash 3.2." is the exact request; `state: open`, created and updated 2022-10-25, 0 comments (GitHub API read 2026-10-11). The reporter's motivating case is `${x,,}`.
- shfmt 3.13.1 `-ln bash` accepts 46 of 47 snippets; it rejects only `${| REPLY=hi; }` (5.3 funsub reply form). It is a formatter and has no version target.
- ShellCheck's own advice leads out of the 3.2 floor: SC2207 "Prefer mapfile or read -a to split command output" fired on `a=( $(printf "a b\n") )` (fixture `sc2207.sh`). The wiki also offers the 3.x-safe form; use it (rule BVG-16).

### F4 The guard

**Guard-first (bash-only script).** Verbatim, fixture `guard-first.sh`:

```bash
#!/usr/bin/env bash
# bash-floor: 4.2
if [ "${BASH_VERSINFO[0]:-0}" -lt 4 ] || { [ "${BASH_VERSINFO[0]}" -eq 4 ] && [ "${BASH_VERSINFO[1]}" -lt 2 ]; }; then
    echo "$0: needs bash >= 4.2 (this is ${BASH_VERSION:-unknown}); on macOS: brew install bash" >&2
    exit 69
fi
set -euo pipefail
declare -A seen
main() { if [[ -v HOME ]]; then echo "main ran"; fi; }
main "$@"
```

bash 3.2 and 4.1: stderr message, **exit 69**, empty stdout. bash 4.2 and 5.3: `main ran`, exit 0. Why this works: the `if` is a complete command that parses on 3.2; bash runs it and exits before it reads `declare -A seen` or the function body that contains `[[ -v ]]`. Exit code 69 is `Unavailable` in the fleet table ([cli-contract.md](../../../rules/rust-quality/cli-contract.md), "69 Unavailable: Registry or resource unreachable, non-retryable"); a missing interpreter feature is the same class. The `# bash-floor: X.Y` marker is how tooling finds pinned scripts (F5).

**Refuse or re-exec (macOS, Homebrew bash).** Fixture `guard-first-reexec.sh`: same test, then `for b in /opt/homebrew/bin/bash /usr/local/bin/bash; do [ -x "$b" ] && [ "$b" != "$BASH" ] && exec "$b" "$0" "$@"; done` before the refusal. Run with the 5.3 binary mounted at `/opt/homebrew/bin/bash` inside `bash:3.2`: prints `main ran under 5.3.20(1)-release`, exit 0; without it: exit 69. The re-exec loop cannot recurse: the new process passes the version test.

**POSIX-safe form (script may be run as `sh script`, or sourced by zsh/dash).** Fixture `guard-case.sh`:

```sh
case ${BASH_VERSION-} in
    '' | [0-3].* | 4.[01].* )
        echo "$0: needs bash >= 4.2 (BASH_VERSION='${BASH_VERSION-}')" >&2
        exit 69 ;;
esac
```

`matrix.sh posix guard-case.sh`: dash 0.5.12, busybox ash 1.35/1.37, mksh R59c, ksh93u+m (2023, 1.0.10), yash 2.52, posh 0.14.1, `zsh --emulate sh`, `bash 3.2 --posix` all print the message and **exit 69**; `bash 5.2 --posix` passes. The array form fails differently: `dash guard-first.sh` exits **2** ("Bad substitution"), `busybox ash` exits 2 ("syntax error: bad substitution"), `zsh guard-first.sh` exits 69 (BASH_VERSINFO unset, falls through the `:-0` default).

**Sourced library.** Fixture `guard-lib.sh`: no shebang, marker as line 1, the case guard, then `return 69 2>/dev/null || exit 69`. A caller on 3.2/4.1 sees `source rc=69` and keeps its own shell; zsh also gets `rc=69`. A bare `exit` in a sourced library terminates the user's interactive shell.

**Runtime branch (floor stays 3.2).** Fixture `guard-branch-ok.sh` (`git-completion.bash:2917` shape): `if [ "${BASH_VERSINFO[0]:-0}" -ge 4 ]; then printf '%s\n' "${1,,}"; else printf '%s\n' "$1" | tr '[:upper:]' '[:lower:]'; fi` runs on 3.2, 4.1, 4.2, 5.3 and prints `abc` every time. Plant `guard-branch-bad.sh` puts `[[ -v $1 ]]` in the untaken branch: **exit 2** with a syntax error on 3.2 and 4.1, `X is set` on 4.2+. Only constructs that fail at run time (the `parse=ok` rows of F1) may sit in an untaken branch.

**Five ways to place the guard wrong** (all watched red with `guard-gate.sh`, F4/Verification runs):

| Plant | What breaks | 3.2 result |
|---|---|---|
| `guard-late-fn.sh` guard inside `main()` after `[[ -v ]]` | function never defined | exit 2, syntax error, no guard message |
| `guard-late-top.sh` `[[ -v ]]` one line before the guard | parse error on that line | exit 2 |
| `guard-late-runtime.sh` (`set -e`) `declare -A` before the guard | `declare` returns 2, errexit | exit 2, `declare: -A: invalid option`, no guard message |
| `guard-late-runtime-noe.sh` (no `-e`) `declare -A` + a side effect before the guard | side effect ran, then the guard fires | `SIDE EFFECT before guard` on stdout, then exit 69 |
| `guard-branch-bad.sh` parse-time construct in a runtime branch | whole function dies | exit 2 |

### F5 The denylist

The check below is the mechanical replacement for the missing ShellCheck target. Verbatim as run (fixture `denylist-check.sh`, `D` = directory operand). Output is the violation; empty output means pass. Use the output, not the exit status: `xargs` returns 123 when any `grep` it spawned found nothing.

```
grep -rLE -e '^# bash-floor: ' --include='*.sh' --include='*.bash' . | xargs -r grep -nE \
  -e '^[^#]*declare[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-[a-zA-Z]*A' \
  -e '^[^#]*local[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-[a-zA-Z]*A' \
  -e '^[^#]*typeset[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-[a-zA-Z]*A' \
  -e '^[^#]*readonly[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-[a-zA-Z]*A' \
  -e '^[^#]*mapfile[[:space:]]' \
  -e '^[^#]*readarray[[:space:]]' \
  -e '^[^#]*\$\{[A-Za-z_0-9@*]+(\[[^]]*\])?\^' \
  -e '^[^#]*\$\{[A-Za-z_0-9@*]+(\[[^]]*\])?,' \
  -e '^[^#]*declare[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-[a-zA-Z]*[ul][[:space:]]' \
  -e '^[^#]*local[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-[a-zA-Z]*[ul][[:space:]]' \
  -e '^[^#]*\[\[?[[:space:]]+(![[:space:]]+)?-[vR][[:space:]]' \
  -e '^[^#]*\[-[0-9]+\]' \
  -e '^[^#]*:[0-9]+:-[0-9]' \
  -e '^[^#]*printf[[:space:]]+[^;]*%\([^)]*\)T' \
  -e '^[^#]*declare[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-[a-zA-Z]*[ng][[:space:]]' \
  -e '^[^#]*local[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-[a-zA-Z]*n[[:space:]]' \
  -e '^[^#]*typeset[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-[a-zA-Z]*n[[:space:]]' \
  -e '^[^#]*wait[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-[a-zA-Z]*n' \
  -e '^[^#]*\$\{[A-Za-z_0-9@*]+(\[[^]]*\])?@[QEPAaKkUuL]\}' \
  -e '^[^#]*shopt[[:space:]]+-[su][[:space:]]+[^#]*inherit_errexit[[:space:]]*;' \
  -e '^[^#]*shopt[[:space:]]+-[su][[:space:]]+[^#]*inherit_errexit[[:space:]]*$' \
  -e '^[^#]*shopt[[:space:]]+-[su][[:space:]]+[^#]*lastpipe[[:space:]]*;' \
  -e '^[^#]*shopt[[:space:]]+-[su][[:space:]]+[^#]*lastpipe[[:space:]]*$' \
  -e '^[^#]*shopt[[:space:]]+-[su][[:space:]]+[^#]*globstar[[:space:]]*;' \
  -e '^[^#]*shopt[[:space:]]+-[su][[:space:]]+[^#]*globstar[[:space:]]*$' \
  -e '^[^#]*shopt[[:space:]]+-[su][[:space:]]+[^#]*globskipdots[[:space:]]*;' \
  -e '^[^#]*shopt[[:space:]]+-[su][[:space:]]+[^#]*globskipdots[[:space:]]*$' \
  -e '^[^#]*shopt[[:space:]]+-[su][[:space:]]+[^#]*patsub_replacement[[:space:]]*;' \
  -e '^[^#]*shopt[[:space:]]+-[su][[:space:]]+[^#]*patsub_replacement[[:space:]]*$' \
  -e '^[^#]*shopt[[:space:]]+-[su][[:space:]]+[^#]*localvar_inherit[[:space:]]*;' \
  -e '^[^#]*shopt[[:space:]]+-[su][[:space:]]+[^#]*localvar_inherit[[:space:]]*$' \
  -e '^[^#]*shopt[[:space:]]+-[su][[:space:]]+[^#]*varredir_close[[:space:]]*;' \
  -e '^[^#]*shopt[[:space:]]+-[su][[:space:]]+[^#]*varredir_close[[:space:]]*$' \
  -e '^[^#]*shopt[[:space:]]+-[su][[:space:]]+[^#]*compat[0-9][[:space:]]*;' \
  -e '^[^#]*shopt[[:space:]]+-[su][[:space:]]+[^#]*compat[0-9][[:space:]]*$' \
  -e '^[^#]*[|]&' \
  -e '^[^#]*&>>' \
  -e '^[^#]*coproc[[:space:]]' \
  -e '^[^#]*;;&' \
  -e '^[^#]*;&[[:space:]]*$' \
  -e '^[^#]*EPOCHREALTIME' \
  -e '^[^#]*EPOCHSECONDS' \
  -e '^[^#]*SRANDOM' \
  -e '^[^#]*BASH_ARGV0' \
  -e '^[^#]*BASH_MONOSECONDS' \
  -e '^[^#]*BASH_TRAPSIG' \
  -e '^[^#]*GLOBSORT' \
  -e '^[^#]*BASHPID' \
  -e '^[^#]*BASH_COMPAT' \
  -e '^[^#]*\$\{[[:space:]]' \
  -e '^[^#]*\$\{[|]' \
  -e '^[^#]*source[[:space:]]+-p[[:space:]]' \
  -e '^[^#]*trap[[:space:]]+-P' \
  -e '^[^#]*read[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-t[[:space:]]+[0-9]*\.[0-9]' \
  -e '^[^#]*\{[0-9]+\.\.[0-9]+\.\.[0-9]+\}' \
  -e '^[^#]*\{0[0-9]+\.\.' \
  -e '^[^#]*[^$]\{[A-Za-z_][A-Za-z_0-9]*\}[<>]' \
  -e '^[^#]*\$\([[:space:]]*case[[:space:]]+[^[:space:]]+[[:space:]]+in[[:space:]]+[^(]' \
  -e '^[^#]*\$\{[A-Za-z_][A-Za-z_0-9]*//?[^/}]+/[^}]*&'
```

Table of what each pattern group catches (first version = F1; all `-E`, the `^[^#]*` prefix skips comment lines):

| Pattern group | Feature | First version | Fail mode on 3.2 |
|---|---|---|---|
| `declare\|local\|typeset\|readonly ... -A` | associative arrays | 4.0 | run, wrong data |
| `mapfile `, `readarray ` | array builtins | 4.0 (`-d` 4.4) | run, `command not found` |
| `${v^` `${v,` | case modification | 4.0 | run, bad substitution |
| `declare/local ... -u/-l` | case attributes | 4.0 | run |
| `[[ -v `, `[ -v `, `-R` | variable-set test | 4.2 (`-R` 4.3) | **parse** for `[[`; run for `[` |
| `[-1]`, `:0:-1` | negative index / length | 4.2 (assign 4.3) | run |
| `printf '%(...)T'` | time format | 4.2 | run |
| `declare -n/-g`, `local -n`, `typeset -n` | namerefs / global | 4.3 / 4.2 | run, wrong data |
| `wait -n` | wait any | 4.3 | run |
| `${v@Q}` `@E @P @A @a @K @k @U @u @L` | transformations | 4.4 / 5.1 / 5.2 | run (4.0-4.3 silent for `@K @k`) |
| bare `shopt -s/-u` of `inherit_errexit lastpipe globstar globskipdots patsub_replacement localvar_inherit varredir_close compat*` | shell options | 4.0-5.2 | run, rc 1 aborts `set -e` |
| `\|&`, `&>>`, `coproc`, `;;&`, `;&` | operators | 4.0 | **parse** |
| `EPOCHREALTIME EPOCHSECONDS SRANDOM BASH_ARGV0 BASH_MONOSECONDS BASH_TRAPSIG GLOBSORT BASHPID BASH_COMPAT` | special variables | 4.0-5.3 | **silent** |
| `${ ` `${\|` | funsub | 5.3 | run |
| `source -p`, `trap -P` | 5.3 builtins | 5.3 | run, rc 2 |
| `read -t 0.5` | fractional timeout | 4.0 | run |
| `{01..03}`, `{1..10..2}` | brace extensions | 4.0 | **silent** |
| `{fd}>` | fd variable | 4.1 | run |
| `$(case x in p)` | unparenthesised pattern in cmd-sub | 4.0 (3.2 parser bug) | **parse** |
| `${v/pat/...&...}` | patsub `&` | 5.2 (drift) | **silent** across 5.1/5.2 |

**Marker skip.** The first command, `grep -rLE -e '^# bash-floor: ' ...`, lists files that do **not** carry a `# bash-floor: X.Y` line; only those are denylisted. Marker values: `# bash-floor: 4.2` (floor raised, guard-first, gate expects exit 69 on 3.2) and `# bash-floor: 3.2 guarded` (floor stays 3.2, 4+ features only in untaken runtime branches, gate = smoke run exits 0 on bash:3.2). Skipped files are not unchecked: the gate run (F4) replaces the grep. The shopt patterns match only a **bare** option (name followed by `;` or end of line); the sanctioned `shopt -s inherit_errexit 2>/dev/null || :` does not match and needs no marker.

**Measured precision and recall** (fixtures `snip/` = the 47 F1 snippets, `twins/` = 30 3.2-safe equivalents, `fleet-authored-bash.txt` = the 166 authored fleet bash files of [fleet](../shell-audit/fleet-shell-shape.md) Axis 5, regenerated from `sc_results.json` with `cls == authored and dia in (bash, none)`):

| Corpus | Hit lines | Files | Verdict |
|---|---|---|---|
| `snip/` 47 snippets | 42 | 42 | red; flagged: every version-gated construct. Unflagged by design: `at_assign` (stable 3.2-5.3), `case_in_cmdsub_p` (the 3.2-safe spelling), `empty_arr_u` and `at_nounset` (set -u stage 2), `globskipdots` (stage 3) |
| `twins/` 30 snippets, identical output on 3.2/4.0/4.4/5.3 | **0** | 0 | green: false positives 0 |
| fleet 166 files, with `^[^#]*` prefix | 10 | 5 | the 5 files of [fleet] #10 exactly; **false positives 0**, new files 0 |
| fleet 166 files, **without** the prefix | 13 | 5 | +3 comment lines (`measure-index-clone.sh:51`, `:78`, `setup-grimoire/.github/scripts/install.sh:94`): the prefix removes 3 FPs, loses 0 true hits on the fleet |
| exemplar `bats-core@0c92eb4c418d` | 0 | 0 | consistent: 3.2-compatible by design |
| exemplar `oh-my-posh@b0a8acd4d402` | 6 | 1 | `omp.bash:34,55,137,148,155,173` (true positives) |
| exemplar `shellspec@f2d13f991885` | 13 | 5 | probes of builtins by name (`mapfile`, `readarray`, `{fd}>`) inside `libexec/shellspec-inspection.sh:199-204`: true hits, intentional |
| exemplar `direnv@28a73d1df3f3` | 1 | 1 | `stdlib.sh:1404` `local -A` (true positive) |

**Known blind spots** (stated so reviewers do not over-trust the grep): (1) extensionless scripts are invisible to `--include`: `pyenv@d28b750767d4:libexec/pyenv-rehash:141` has `declare -A` and the denylist returns 0 on the pyenv tree. Enumerate them with `grep -rlE -e '^#!.*bash' .` and feed them in. (2) The `^[^#]*` prefix hides a hit when `#` appears earlier on the line (`$#`, `${#a[@]}`): a measured trade-off, 0 true hits lost on the fleet. (3) A heredoc body or a quoted string containing the word `mapfile ` is a false positive. (4) Features reachable only through data (a variable holding `-A`) are invisible; run on bash:3.2.

**Stage 2, set -u candidates** (fixture `nounset-check.sh`):

```
grep -rlE -e '^[^#]*set[[:space:]]+-[A-Za-z]*u' --include='*.sh' --include='*.bash' . | xargs -r grep -nE \
  -e '^[^#]*\$\{[@*]\}' \
  -e '^[^#]*\$\{[A-Za-z_][A-Za-z_0-9]*\[[@*]\]\}'
```

Red on `snip/` (2 lines: `at_nounset`, `empty_arr_u`), green on `twins/` (0). Fleet: **54 candidate lines in 16 files** against the 7 static candidates of [fleet] Axis 5 (precision about 13%): reading-heuristic grade, not blocking. The safe idiom `${a[@]+"${a[@]}"}` is not matched.

**Stage 3, dot globs** (fixture `dotglob-check.sh`, advisory only): `grep -rnE -e '^[^#]*[[:space:]]\.\*[[:space:]]*$' -e '^[^#]*[[:space:]]\.\*;' -e '^[^#]*[[:space:]]\.\*[[:space:]]+[^|[:space:])]' --include='*.sh' --include='*.bash' .`. Red on `snip/globskipdots.sh`, green on `twins/`, fleet 0 hits, but exemplar `git@6de20f6092dc` returns **119** hits (regexes inside `test_grep "... .* ..."` strings) and `shellspec` 1: too noisy to block, hence advisory.

### F6 errexit drift

Fixture `errexit-arith.sh` (one child per case: `set -e; <stmt>; echo reached`), 3.2 through 5.3:

| Statement | 3.2 | 4.0 | **4.1** | 4.2-5.3 |
|---|---|---|---|---|
| `i=0; (( i++ ))` | `reached`, rc 0 | `reached` | **aborts**, rc 1 | aborts |
| `(( 0 ))` | `reached` | `reached` | aborts | aborts |
| `i=1; (( i++ ))` (value non-zero) | reached | reached | reached | reached |
| `[[ a == b ]]` | `reached` | `reached` | aborts | aborts |
| `[[ abc =~ ^x ]]` | `reached` | `reached` | aborts | aborts |
| `f(){ [[ a == b ]]; }; f` (function tail) | **aborts** | aborts | aborts | aborts |
| `f(){ [[ a == b ]]; }; if f; then :; fi` | reached | reached | reached | reached |
| `[[ a == b ]] && echo yes` / `\|\| true` / `! [[ a == a ]]` | reached | reached | reached | reached |
| `i=$((i + 1))` | reached | reached | reached | reached |
| `let i++` from 0 | aborts | aborts | aborts | aborts |
| `[ a = b ]`, `false`, `{ false; }` | aborts | aborts | aborts | aborts |

**The brief's "4.2" is 4.1.** The boundary is bash 4.1, confirmed by NEWS 4.1 item j ([NEWS:1280](https://ftp.gnu.org/gnu/bash/bash-5.3.tar.gz): "The [[ and (( commands are now subject to the setting of `set -e` and the ERR trap") and by bats-core's own gotcha: "The `set -e` handling of `[[ ]]` and `(( ))` changed in Bash 4.1. Older versions, like 3.2 on MacOS, don't abort the test when they fail, unless they are the last command before the (test) function returns" ([gotchas.rst](https://github.com/bats-core/bats-core/blob/master/docs/source/gotchas.rst)); the same document advises "Appending `|| false` will work in all cases".

**Compensation rule for a 3.2 floor.** Never rely on `(( ))` or `[[ ]]` as a bare statement to stop a `set -e` script:

```bash
# wrong on 3.2/4.0 (continues) and a surprise on 4.1+ (kills the script when the counter starts at 0)
(( i++ ))
[[ -f "$cfg" ]]
# right: identical on 3.2-5.3
i=$((i + 1))
[[ -f "$cfg" ]] || die "missing $cfg"
```

Plants and twins (`errexit-plants/`, `errexit-twins/`), exit codes per bash:

| File | 3.2 | 4.0 | 4.1 | 5.3 |
|---|---|---|---|---|
| `p1-postinc.sh` `(( i++ ))` | 0 `reached` | 0 | **1** | 1 |
| `p2-bare-dbracket.sh` | 0 `reached` | 0 | **1** | 1 |
| `p3-subshell-stmt.sh` `( cd / && false )` | 0 `reached` | **1** | 1 | 1 |
| `p4-fn-tail.sh` function ending in failing `[[ ]]` | 1 | 1 | 1 | 1 |
| `t1..t4` twins | 0 | 0 | 0 | 0 |

**M-B-04: `set -e; ( false ); echo after`.** Fixture `subshell-errexit.sh`: **3.2 prints `after` and exits 0; 4.0-5.3 exit 1** with no output. The same holds for `( cd / && false )`, a subshell in a function (`in-f reached` on 3.2), and `( set -e; false; echo inner )`. Unchanged on all ten versions: `( false ) || echo handled` runs the handler; `x=$(false)` aborts (rc 1); `export x=$(false)` does not abort (status of `export`); `{ false; }` aborts. The change has no entry in NEWS; evidence is the measurement only. Compensation: `( ... ) || exit "$?"` (or `|| return` in a function). The fleet-wide errexit rows of [fleet] Axis 4 (`local x=$(false)` masks on all 8) are unchanged and are not repeated here.

Fleet use of the 3.2 behaviour: no script depends on `( false )` *continuing*; 5 sites rely on 4.0+ semantics and would silently continue on 3.2 (F13). ShellCheck has no code for any of this. `shellcheck -o check-set-e-suppressed` (SC2310) covers a different mechanism (functions in `if` conditions) and does not flag bare statements.

Stage-4 check (fixture `errexit-check.sh`, reading-grade): `grep -rnE -e '^[[:space:]]*\(\([^)]*\)\)[[:space:]]*$' -e '^[[:space:]]*\[\[.*\]\][[:space:]]*$' -e '^[[:space:]]*\([^(].*\)[[:space:]]*$' --include='*.sh' --include='*.bash' .` red on `errexit-plants/` (4 lines), green on `errexit-twins/` (0). Fleet: 12 lines, of which 4 are real statement sites (`grimoire@4650ad830375:test/manual/scripts/bootstrap.sh:60`; `www-setup@a251c3631047:tests/install/helpers/server.bash:296,298`; `ocx@5de9d777eb7d:test/manual/announce-e2e/scripts/env.sh:87`); the rest are intentional function-tail predicates (`selfcheck_g2.sh:284` `((FAILURES == 0))`, `env.sh:310` `[[ ... ]]`) and one prose line.

### F7 set -u drift

Fixtures `nounset-at.sh`, `nounset-at2.sh` (`set -u`, zero arguments / empty array, one child per case):

| Expansion | 3.2 | 4.0-4.3 | 4.4-5.3 |
|---|---|---|---|
| `"$@"`, `"$*"`, `for a in "$@"`, `a=("$@")`, `x=$@` | ok | ok | ok |
| **`"${@}"`, `${*}`, `"${*}"`, `f "${@}"`, `for a in "${@}"`** | **`@: unbound variable`** (`*:` for star) | ok | ok |
| `"$1"` | unbound | unbound | unbound |
| `"${1-}"`, `$#`, `"${@:2}"` | ok | ok | ok |
| `"${a[@]}"` of `a=()` | unbound | **unbound** | ok |
| `unset a; "${a[@]}"`, `declare -a a`, copy `b=("${a[@]}")`, call `f "${a[@]}"` | unbound | unbound | ok |
| `"${a[@]-}"`, `"${a[@]:-}"`, `${a[@]+"${a[@]}"}`, `${#a[@]}`, `${!a[@]}` | ok | ok | ok |
| `call "${@:-}"` | passes 1 empty argument (`n=1`) | `n=1` | `n=1` |
| `call ${@+"$@"}` | `n=0` | `n=0` | `n=0` |

M-C-16 settled: `$*` vs `"$@"` differ in splitting, not in `set -u`. `x=$@` joins with a **space** on all ten versions even with `IFS=:` (`x=a b`), while `"$*"` joins with the first `IFS` character (`a:b`); SC2124/SC2048 are the lint codes. The 3.2-only hazard is the braced `"${@}"`. Empty-array unboundness ended at 4.4 and is invisible to a feature grep (143 fleet scripts use `set -u`; [fleet] Axis 5).

### F8 Silent 5.2 changes

Fixture `patsub.sh` (`${y/b/...}` with `y=abc`, `r='[&]'`), version ranges with identical output:

| Spelling | 3.2-4.2 | 4.3-5.1 | 5.2-5.3 |
|---|---|---|---|
| `${y/b/[&]}` | `a[&]c` | `a[&]c` | **`a[b]c`** |
| `${y/b/[\&]}` | `a[\&]c` | `a[&]c` | `a[&]c` |
| `${y/b/$r}` | `a[&]c` | `a[&]c` | **`a[b]c`** |
| `${y/b/"$r"}`, `${y/b/'[&]'}`, `${y/b/"[&]"}` | `a"[&]"c` (quotes kept) | `a[&]c` | `a[&]c` |
| `${y/b/$a}` with `a='&'` | `a&c` | `a&c` | **`abc`** |
| `shopt -u patsub_replacement 2>/dev/null \|\| :` first, then any of the above | `a[&]c` | `a[&]c` | `a[&]c` |
| `${y%%b*}[b]${y#*b}` | `a[b]c` | `a[b]c` | `a[b]c` |

- **No in-pattern spelling is identical on 3.2-5.3.** Backslash and quoted forms changed at 4.3 (the compat42 quote-removal change, [COMPAT compat42](https://ftp.gnu.org/gnu/bash/bash-5.3.tar.gz)), the bare form at 5.2. The portable choices are (a) `shopt -u patsub_replacement 2>/dev/null || :` before the expansion (fixture `patsub-safe.sh`: `a[&]c|a[&]c|a&&c` on 3.2, 4.2, 5.1, 5.2, 5.3), (b) building the string with `%%`/`#` splits, or (c) `sed`.
- The manual: "If the `patsub_replacement` shell option is enabled using shopt, any unquoted instances of '&' in string are replaced with the matching portion of pattern ... Quoting any part of string inhibits replacement in the expansion of the quoted portion, including replacement strings stored in shell variables" ([Shell Parameter Expansion](https://www.gnu.org/software/bash/manual/html_node/Shell-Parameter-Expansion.html)); the option "is enabled by default" ([Shopt](https://www.gnu.org/software/bash/manual/html_node/The-Shopt-Builtin.html)); 5.3 NEWS n: "The shell can be compiled with a different default value for the patsub_replacement option" ([NEWS:41](https://ftp.gnu.org/gnu/bash/bash-5.3.tar.gz)), so a distro build may differ from the default.
- The hazard is replacement **text from data**: a URL like `?a=1&b=2` inserted by `${tmpl/@URL@/$url}` is corrupted on 5.2+ with no error.
- `--posix` and `BASH_COMPAT=51` do not restore the old behaviour (`a[b]c` on 5.2/5.3 for both), see F10. `shopt patsub_replacement` prints `invalid shell option name` on 3.2-5.1 (hence `2>/dev/null || :`).

Fixture `dotglob.sh`:

| Probe | 3.2-5.1 | 5.2-5.3 |
|---|---|---|
| `echo .*` (files `.hidden`, `visible`) | `. .. .hidden` | `.hidden` |
| `echo *` | `visible` | `visible` |
| `shopt -s dotglob; echo *` | `.hidden visible` | `.hidden visible` |
| `echo .[!.]*` | `.hidden` | `.hidden` |
| `shopt -u globskipdots; echo .*` | `invalid shell option name` | `. .. .hidden` |
| `for f in .*` hits `.`/`..` | yes | **no** |

`rm -rf ./.*`-style cleanups are safer on 5.2+ (they no longer reach `..`; GNU `rm` refuses `.` and `..` anyway) and risky on 3.2-5.1. Portable form: `.[!.]*` plus `..?*`, each guarded with `[ -e "$p" ]` because an unmatched pattern stays literal without `nullglob`. 5.3 NEWS: "The new `globskipdots` shell option forces pathname expansion never to return `.` or `..` unless explicitly matched. It is enabled by default" (NEWS:298, 5.2 section).

### F9 Bash 5.3 vs distros

Measured 2026-10-11 with `bash --version` in the images: Debian 12 `5.2.15`, Debian 13 `5.2.37`, Ubuntu 24.04 `5.2.21`, **Ubuntu 26.04 `5.3.9`**, AlmaLinux 10 `5.2.26`, `bash:5.3` image `5.3.20`, Homebrew formula `5.3.20` ([formulae.brew.sh](https://formulae.brew.sh/api/formula/bash.json) `versions.stable`). Debian's tracker lists 5.2.15-2 through 5.2.37-2 ([tracker.debian.org](https://tracker.debian.org/pkg/bash)). Alpine 3.22 ships no bash: `#!/usr/bin/env bash` fails with `env: can't execute 'bash': No such file or directory` (exit 127) and `#!/bin/bash` with `sh: /t2: not found` (exit 127). GitHub macOS runners print `Bash 3.2.57(1)-release` on macos-14, 15 and 26 (`actions/runner-images@8197087fc536:images/macos/macos-26-Readme.md:16`); macOS itself is unverified (no host). Windows: Git Bash 5.2.15 on the host and 5.3.15 on `windows-2025` ([plat]).

5.3 features and their failure on 5.2.x (F1 rows): `${ cmd; }` and `${| cmd; }` bad substitution; `source -p` and `trap -P` rc 2 invalid option; `GLOBSORT` and `BASH_MONOSECONDS` **silently ignored** (a script that sorts by `GLOBSORT=size` gets name order on 5.2 and no warning). `bash -n` on 3.2 accepts all of them. ShellCheck 0.10.0 and below warned on `${ ..; }` (SC2127), 0.11.0 does not, and shfmt 3.13.1 accepts `${ cmd; }` but rejects `${| cmd; }`; tooling is therefore no guard in either direction.

Decision for M-A-12: **5.3 features only in scripts pinned to 5.3** (`# bash-floor: 5.3` plus a guard-first prologue); no LTS distro in the measured set ships 5.3 except Ubuntu 26.04 (released April 2026); Ubuntu 24.04 (5.2.21) stays supported into 2029, so "unpinned" use of 5.3 features is not before the oldest supported distro changes.

### F10 BASH_COMPAT

Fixture `compat-level.sh` (setting the level inside `bash -c`):

| Probe (level set to 3.2/32 on each bash) | Result |
|---|---|
| `declare -A`, `${s,,}`, `mapfile`, `${x@Q}`, `[[ -v x ]]` with `BASH_COMPAT=3.2` | **identical to no setting**: work on 4.0+/4.2+/4.4+ as before; the 3.2 error appears only on a real 3.2 |
| `patsub` with `BASH_COMPAT=32`, `41`, `50`, `51` | still `a[b]c` on 5.2/5.3; `BASH_COMPAT=50` is "compatibility value out of range" on 4.3/4.4 |
| `.*` glob, `set -e; (( i++ ))`, `set -e; ( false )` with `BASH_COMPAT=32` | unchanged (`. .. .h` / `.h`; errexit at 4.1 / 4.0) |
| `[[ a < B ]]` collation, `[[ "a.c" =~ "a.c" ]]` | identical on all versions |
| `BASH_COMPAT=99`, `=foo` | 4.3+: `compatibility value out of range`, assignment still returns 0; <=4.2 silent |
| `shopt -s compat32` | missing on 3.2; exists 4.0-5.3 |
| `shopt -s compat40` / `compat44` | exist from 4.1 / 5.0 |
| `shopt -s compat50`, `compat51` | **missing on every version**: only `BASH_COMPAT` exists past 5.0 |
| env `BASH_COMPAT=32 bash -c ...` | visible as a plain variable on 3.2; honoured from 4.4 ([NEWS:853](https://ftp.gnu.org/gnu/bash/bash-5.3.tar.gz), "BASH_COMPAT and FUNCNEST can be inherited from the shell's initial environment") |

COMPAT states the intent: "The compatibility level is intended to allow users to select behavior from previous versions that is incompatible with newer versions while they migrate scripts to use current features and behavior. It's intended to be a temporary solution", it only controls listed *behaviour changes* (e.g. compat31 `=~` quoting, compat40 `[[ < ]]` collation, compat42 pattern-substitution quote removal, compat43 word-expansion errors, compat44 BASH_ARGV, compat50 RANDOM, compat51 unset/arith expansion, compat52 test and bind), and "Bash-5.0 is the final version for which there will be an individual shopt option" ([COMPAT](https://ftp.gnu.org/gnu/bash/bash-5.3.tar.gz) "Shell Compatibility Level"). It never removes a feature. Rule: do not set `BASH_COMPAT`/`compatNN` in repo scripts as a portability measure; the denylist flags `BASH_COMPAT` and `shopt ... compat[0-9]`.

### F11 The hardened-prologue shopts

Fixture `shopt-prologue.sh` (`shopt -s X` exit status, one child per option):

| Option | Exists from | On 3.2 |
|---|---|---|
| `nullglob`, `failglob`, `extglob`, `dotglob`, `nocaseglob`, `nocasematch` | 3.2 (all) | ok |
| `globstar` | 4.0 | missing |
| `lastpipe` | **4.2** | missing; result silently empty |
| `inherit_errexit` | **4.4** | missing |
| `localvar_inherit` | 5.0 | missing |
| `globskipdots`, `patsub_replacement`, `varredir_close` | 5.2 | missing |
| `compat32` / `compat44` | 4.0 / 5.0 | missing |
| `set -o pipefail`, `errtrace`, `nounset` | 3.2 (all) | ok |

- `failglob` on an unmatched glob prints `no match: *.zzz` and abandons the command line on all versions ; `nullglob` makes the unmatched pattern disappear (`n=0`). Both exist on 3.2 but are global switches: setting them in a library changes the caller's shell. Prefer `[ -e "$f" ] || continue`.
- **`shopt -s inherit_errexit` bare under `set -e` exits 1 on <= 4.3** (bare exit=1 on 3.2-4.3, 0 on 4.4+); `shopt -s inherit_errexit 2>/dev/null || :` is silent on all ten. It matters because command substitutions do not inherit `-e` without it (`x=$(false; echo hi)` keeps going and gives `x=[hi]` on <= 4.3 and without the option; with it on 4.4+ the substitution stops and the script exits 1; the manual notes the option "is enabled when POSIX mode is enabled", [Shopt](https://www.gnu.org/software/bash/manual/html_node/The-Shopt-Builtin.html), [POSIX mode](https://www.gnu.org/software/bash/manual/html_node/Bash-POSIX-Mode.html)). On a 3.2 floor compensate explicitly: `x=$(cmd) || exit "$?"` or `if ! x=$(cmd); then ...`.
- `lastpipe` needs job control off (non-interactive scripts qualify; `set +m` for interactive use). On 3.2 floor use `while read ... done < <(cmd)` or `read -r v < <(cmd)`.

Hardened 3.2-floor prologue (fixture `twins/inherit_errexit_probe.sh` is clean under the denylist):

```bash
#!/usr/bin/env bash
set -euo pipefail
shopt -s inherit_errexit 2>/dev/null || :   # no-op below 4.4: add explicit `|| exit` inside command substitutions
```

### F12 Floor policy

Question: floor 3.2 for every unpinned bash script, or only macOS-reachable ones? **Every unpinned bash script**, because reachability cannot be decided statically and the evidence says "reachable" is the norm:

- [fleet] Axis 5: all 154 `#!/usr/bin/env bash` scripts resolve to whichever bash is first on `PATH`; 103 of 166 sit in dev-machine-plausible places; the 1 `#!/bin/bash` script is 3.2 on macOS by construction; 0 guards.
- "CI-only" is a weak claim: `index@9eba2cc3929b:scripts/golden-baseline.sh:250` runs in `.github/workflows/ci.yml:136` (`bash scripts/golden-baseline.sh generate`) **and** `taskfile.yml:372` tells developers: "run `bash scripts/golden-baseline.sh generate` yourself before pushing".
- GitHub macOS runners are 3.2.57 (runner-images README), so a "CI only" script on a macOS job is 3.2 too.

A script may raise its floor only with the marker and the guard-first prologue (4 lines). That makes every exception visible to `grep -rl '# bash-floor:'` and mechanically gated. Pinned-interpreter cases that qualify: container or image entrypoints, scripts that run only inside an ocx toolchain that provides bash >= N (still guarded: the guard also documents the assumption). Installers and bootstrap code do not use this table at all: they are POSIX sh (map conflict 2, `dialect/floors-and-shebangs`), and Alpine has no bash.

### F13 Fleet defects

Reported with `repo@sha12:file:line` and a reproducer; not fixed (owner Q6). The audit's 5 files all hold up; the `EPOCHREALTIME` use is guarded.

| Where | Construct | 3.2 effect | Reproducer |
|---|---|---|---|
| `index@9eba2cc3929b:scripts/golden-baseline.sh:250` | `local -A new_by_path=()` in `compare_manifests`, file is `set -euo pipefail` | `local: -A: invalid option`, rc 2, script aborts mid-run | `docker run --rm bash:3.2 bash -c 'set -euo pipefail; f(){ local -A m=(); m[a]=1; echo ok; }; f; echo reached'` prints `local: -A: invalid option` and exits 2; `bash -n` on 3.2 of the real file exits **0** (the false negative of F2). Invoked from `.github/workflows/ci.yml:136` and by hand per `taskfile.yml:372` |
| `ocx@5de9d777eb7d:test/manual/announce-e2e/scripts/run_sequence.sh:219` | `local -A content_of=()` | as above | same reproducer |
| `.../run_sequence.sh:231,295,361`, `clean_install_check.sh:44`, `run_machine_lane.sh:23,89` | `mapfile -t` | `mapfile: command not found`, empty arrays | `docker run --rm bash:3.2 bash -c 'mapfile -t x < <(echo a); echo "n=${#x[@]}"'` prints `mapfile: command not found` and `n=0` |
| `.../run_sequence.sh:298` | `${tag,,}` | `bad substitution` | F2 table |
| `ocx@5de9d777eb7d:test/manual/measure-index-clone.sh:80` | `${EPOCHREALTIME:-0}` inside awk with a `systime()` fallback (comment :78 "Bash 5 exposes EPOCHREALTIME; older shells fall back to whole seconds") | **safe**, true denylist hit; intended spelling for a guarded use; header `# bash-floor: 3.2 guarded` would silence it. The [fleet] audit line `:51` is a comment | n/a |
| `grimoire@4650ad830375:test/manual/scripts/bootstrap.sh:60`; `www-setup@a251c3631047:tests/install/helpers/server.bash:296,298`; `ocx@5de9d777eb7d:test/manual/announce-e2e/scripts/env.sh:87` | bare `( cd dir && cmd )` statement under `set -e` | on 3.2 a failing subshell does not abort | `docker run --rm bash:3.2 bash -c 'set -e; ( cd / && false ); echo reached'` prints `reached` (4.0+: exit 1) |
| `setup-grimoire@1259e35b2550:.github/scripts/install.sh:94-96` | comment "tolower in awk, not `${expected,,}`: that expansion is bash 4+, and the macOS runner's /bin/bash is 3.2" | **model behaviour**: the one fleet script that states the 3.2 floor and complies | n/a |

No fleet script has a `BASH_VERSION`/`BASH_VERSINFO` guard (0 hits, [fleet] #10); none carries the proposed marker.

## Normative guidance candidates

IDs `BVG-nn` are local to this dive; the consolidation assigns final SH-DIAL IDs. "RAN" = the verification was watched red on a planted violation and green on its compliant twin in `fixtures/bash-version-gate/`.

1. **BVG-01 Floor.** Every bash script (`#!/usr/bin/env bash`, `#!/bin/bash`, sourced `.bash`) is written to **bash 3.2.57** unless it carries a `# bash-floor: X.Y` line. *Rationale:* macOS /bin/bash is 3.2.57 (GitHub macOS runners 3.2.57 on macos-14/15/26), reachability is undecidable statically, and the fleet's only 4+ files all sit on dev-reachable paths (F12). *Verify:* the BVG-02 command prints nothing for every file without the marker; additionally smoke-run the script's `--help` on the 3.2 image: `docker run --rm -v "$PWD:/w:ro" -w /w bash:3.2 bash ./scripts/x.sh --help` must exit 0. *RAN:* yes (`denylist-check.sh`; red 42 of 47 snippets, green 0 of 30 twins; fleet 10 hits, 0 FP).

2. **BVG-02 Denylist.** Run the F5 grep (marker-skip + 59 `-e` patterns) in CI over `.`; the output is the violation list; replace each hit with its 3.2 equivalent (twins) or add the marker and guard. *Rationale:* ShellCheck 0.11.0 reports none of the 47 constructs (#2615 open). *Verify:* the F5 command, expected empty. *RAN:* yes (`./verify-all.sh`: `snip/` RED 42 lines, `twins/` GREEN 0).

3. **BVG-03 Raising the floor needs marker + guard-first.** A script using any construct of F1 above 3.2 must (a) carry `# bash-floor: X.Y` within its first comment block, (b) start, before any other statement and outside any compound command, with a 3.2-parsable guard that prints `needs bash >= X.Y` to stderr, prints nothing to stdout, and exits **69**. *Rationale:* a refusal that names the version beats a mid-run `bad substitution` that leaves empty variables (F2 item 5). *Verify:* `docker run --rm -v "$PWD:/w:ro" -w /w bash:3.2 bash ./script.sh` exits 69 with empty stdout and `bash >=` on stderr (fixture `guard-gate.sh`). *RAN:* yes: 5 plants FAIL (`guard-late-fn`, `guard-late-top`, `guard-late-runtime`, `guard-late-runtime-noe`, `guard-branch-bad`), 3 twins PASS (`guard-first`, `guard-first-reexec`, `guard-case`).

4. **BVG-04 Guard placement.** The guard is the first executable statement; no `main() { ... }` wrapper, `if` block or `{ }` group may contain both the guard and any 4+ parse-time construct, and the guard may use only `[ ]`, `case`, `${BASH_VERSINFO[0]}`/`${BASH_VERSION}` and `exit`. *Rationale:* bash parses a whole compound command before running it; the guard in `main()` never runs when the same function holds `[[ -v ]]`. *Verify:* BVG-03 gate. *RAN:* yes (same plants).

5. **BVG-05 Runtime branches only for runtime-only constructs.** `${x,,}`, `declare -A`, `mapfile`, `${x@Q}`, `${ cmd; }` may sit in the untaken branch of `if [ "${BASH_VERSINFO[0]:-0}" -ge N ]` with a 3.2 fallback; `[[ -v ]]`, `|&`, `&>>`, `coproc`, `;;&`, `$(case x in a) ... )` may never. Mark such a file `# bash-floor: 3.2 guarded`. *Verify:* run the script's smoke path on `bash:3.2`, exit 0, output equal to the 5.x output. *RAN:* yes (`guard-branch-ok.sh` prints `abc` on 3.2/4.1/4.2/5.3; `guard-branch-bad.sh` exits 2 on 3.2/4.1).

6. **BVG-06 `bash -n` on bash:3.2 is a secondary gate.** Run `docker run --rm -v "$PWD:/w:ro" -w /w bash:3.2 bash -n FILE` for non-marked files; treat a pass as nothing. It sees 6 of 47 constructs and rejects marker files that would refuse correctly. *Rationale:* F2. *Verify:* `features.sh all` on bash:3.2 shows `parse=FAIL` for exactly `pipe_amp amp_append coproc case_fallthru case_in_cmdsub test_v`; `bash -n index/scripts/golden-baseline.sh` on 3.2 exits 0 although it uses `local -A`. *RAN:* yes (`feat.out`, 3.2 block).

7. **BVG-07 Sourced libraries refuse with `return`.** A sourced file with a raised floor has no shebang, `# bash-floor: X.Y` as line 1, the POSIX `case ${BASH_VERSION-}` guard, and ends the refusal with `return 69 2>/dev/null || exit 69`. *Rationale:* `exit` kills the interactive shell; an unguarded 4.2 construct drops every later definition on 3.2. *Verify:* source it from a caller on `bash:3.2`: `source rc=69`, caller alive. *RAN:* yes (`guard-lib.sh` + `guard-lib-caller.sh`: 3.2/4.1 rc 69 survive, 4.2/5.3 rc 0; zsh rc 69).

8. **BVG-08 A guard that may be run by a non-bash shell is POSIX-only.** Use `case ${BASH_VERSION-} in '' | [0-3].* | 4.[01].* ) ... exit 69 ;; esac`, not `${BASH_VERSINFO[0]}`. *Rationale:* dash and busybox ash die with exit 2 "Bad substitution" before printing anything. *Verify:* `matrix.sh posix guard-case.sh` exits 69 under all eleven interpreters (bash 5.2 `--posix` passes). *RAN:* yes (`guard-case.sh`; `dash guard-first.sh` exit 2 is the red).

9. **BVG-09 errexit statements.** In a `set -e` script on the 3.2 floor, no bare `(( ))`, `[[ ]]`, or `( ... )` *statement* may be the thing that is supposed to stop the script: use `i=$((i + 1))`, `[[ ... ]] || die "..."`, `( ... ) || exit "$?"`. *Rationale:* `(( ))`/`[[ ]]` abort from 4.1, `( false )` from 4.0, a function-tail `[[ ]]` aborts everywhere; 3.2 diverges silently. *Verify:* `errexit-check.sh` (F6 stage 4, reading-grade) plus run each file on bash:3.2 and bash:4.1 and compare exit codes. *RAN:* yes (4 plant lines red, twins green; p1-p3 exit 0 on 3.2 and 1 on 4.1/5.3, `t1-t4` 0 everywhere).

10. **BVG-10 Predicates are called from conditions.** A function whose last command is `[[ ]]` or `(( ))` is a predicate: call it only in `if f; then`, `f && x`, or `f || y`. *Rationale:* its status becomes the function's status and aborts the caller under `set -e` on every version (`p4-fn-tail.sh` exit 1 on 3.2-5.3). *Verify:* the BVG-09 run; `shellcheck -o check-set-e-suppressed` lists the opposite risk (SC2310) and must stay on. *RAN:* yes for the run (p4 red, t4 green); the SC2310 pairing is a reading heuristic.

11. **BVG-11 set -u and positional/array expansions.** With `set -u`: write `"$@"`, never `"${@}"` or `${*}` (3.2: unbound variable with no arguments); expand a possibly-empty array as `${a[@]+"${a[@]}"}`, never bare `"${a[@]}"` (unbound on 3.2-4.3). *Verify:* the F7 stage-2 grep for candidates (54 fleet lines, precision about 13%: reading-grade) and a run of the empty-argument/empty-array path on `bash:3.2` and `bash:4.0`; `nounset-at.sh` shows the exact split. *RAN:* yes (snip red 2 lines, twins green; run split measured on 10 versions).

12. **BVG-12 No `&` in a pattern-substitution replacement.** `${v/pat/rep}` and `${v//pat/rep}` with `&` in `rep` (literal or from a variable) is a 5.2 behaviour change with no error; either rewrite with `%%`/`#` splits or `sed`, or put `shopt -u patsub_replacement 2>/dev/null || :` before it. *Rationale:* no in-pattern spelling is stable across 3.2-5.3 (F8 table). *Verify:* the F5 pattern `${v/.../...&...}` (flags literal `&`), plus `VERSIONS="5.1 5.2" ./vrun.sh patsub.sh` differing in rows 1, 3, 7; the twin `patsub-safe.sh` is identical on 3.2, 4.2, 5.1, 5.2, 5.3. *RAN:* yes. Limit: the grep cannot see `&` that arrives in a variable; use `shopt -u` as the default in scripts that substitute user data.

13. **BVG-13 Dot-file globs.** Write `.[!.]* ..?*` with an `[ -e ]` guard, never bare `.*`; do not toggle `globskipdots` (absent before 5.2). *Rationale:* `.*` matches `.` and `..` through 5.1 only (F8). *Verify:* stage-3 grep (advisory: git tests give 119 hits) and `VERSIONS="5.1 5.2" ./vrun.sh dotglob.sh`. *RAN:* yes (snip red 1, twins green 0, fleet 0).

14. **BVG-14 Probe options, do not assume them.** `shopt -s inherit_errexit 2>/dev/null || :` (never bare); never `shopt -s lastpipe` on a 3.2 floor; never `shopt -s globstar`. *Rationale:* a bare unknown `shopt -s` returns 1 and kills a `set -e` script on <= 4.3 (exit 1), `lastpipe` silently leaves the variable empty on 3.2-4.1 (F11). *Verify:* the shopt patterns of the F5 grep match only the bare form. *RAN:* yes (`twins/inherit_errexit_probe.sh` green, `snip/inherit_errexit.sh` red; `shopt-prologue.sh` exit codes).

15. **BVG-15 BASH_COMPAT is not a portability tool.** Do not set `BASH_COMPAT` or `shopt -s compatNN` to "pin" behaviour; it removes no feature and leaves patsub, globskipdots and errexit unchanged. *Verify:* the F5 patterns for `BASH_COMPAT` and `compat[0-9]`. *RAN:* yes (grep red on `snip/`; behaviour in `compat-level.out`).

16. **BVG-16 Do not follow SC2207 into `mapfile`.** On the 3.2 floor split command output with `while IFS= read -r l; do a+=("$l"); done < <(cmd)` and keep `# shellcheck disable=SC2207` out; if SC2207 fires, the fix is that loop, not `mapfile`. *Rationale:* the lint's message says "Prefer mapfile or read -a"; `mapfile` is `command not found` on 3.2 and silently yields `n=0`. *Verify:* the F5 `mapfile[[:space:]]` and `readarray[[:space:]]` patterns. *RAN:* yes (`snip/mapfile.sh` red; `twins/mapfile.sh` prints `n=2` on 3.2-5.3).

17. **BVG-17 Escape the 3.2 `case` in `$( )` parser bug.** Write `x=$(case "$v" in (a) ...;; esac)` with parenthesised patterns inside any command substitution. *Rationale:* an unparenthesised pattern is a parse error on 3.2 only (`syntax error near unexpected token ';;'`); `bash -n` catches it but nothing else does early. *Verify:* the F5 pattern `\$\([[:space:]]*case...in[[:space:]]+[^(]` (same-line form only; multi-line `$(` not detected: use `bash -n` on 3.2). *RAN:* yes (snip red, `case_in_cmdsub_p` green).

18. **BVG-18 5.3-only features need a 5.3 pin.** `${ cmd; }`, `${| cmd; }`, `GLOBSORT`, `source -p`, `trap -P`, `BASH_MONOSECONDS`, `BASH_TRAPSIG` appear only in files with `# bash-floor: 5.3` and a guard-first prologue. *Rationale:* Debian 12/13, Ubuntu 24.04 and AlmaLinux 10 ship 5.2.x; two of the six fail silently on 5.2 (`GLOBSORT`, `BASH_MONOSECONDS`). *Verify:* the F5 grep (these names are in it) plus `bash:5.2` run of the guard gate. *RAN:* yes (snip red; features table F1 for 5.2).

19. **BVG-19 `${A[@]@K}` / `@k` are banned below the 5.1/5.2 pin.** *Rationale:* silent values-only output on 4.0-4.3 and fatal `bad substitution` on 4.4-5.1. *Verify:* F5 pattern `@[QEPAaKkUuL]`. *RAN:* yes (`snip/at_K.sh`, `snip/at_k.sh` red).

20. **BVG-20 Floor tests run on the real old bash.** The CI job that enforces BVG-01..BVG-19 runs the denylist and a `bash:3.2` smoke run of every non-marker script; it does not substitute `shellcheck -s bash`, `shfmt -ln bash` or `BASH_COMPAT`. *Rationale:* F3, F10. *Verify:* the job definition contains `bash:3.2` and the F5 command. *RAN:* no (reading heuristic on the job file); the component checks are all RAN above.

## Verification runs

Every command is run from `fixtures/bash-version-gate/`. "RED" = output printed / nonzero as shown; "GREEN" = empty output / exit as shown. `./verify-all.sh` re-runs items V1-V8 in one go.

| # | Fixture and command | Violation (exit / output) | Compliant twin (exit / output) |
|---|---|---|---|
| V1 | `./denylist-check.sh snip` vs `./denylist-check.sh twins` | **RED, 42 hit lines** in 42 files (every F1 construct except the 5 listed in F5) | **GREEN, 0 lines** (30 twins) |
| V2 | `./nounset-check.sh snip` vs `twins` | RED, 2 lines: `empty_arr_u.sh:1:set -u; a=(); echo "[${a[@]}]"`, `at_nounset.sh:1:set -u; f(){ echo "[$@][${@}]"; }; f` | GREEN, 0 |
| V3 | `./dotglob-check.sh snip` vs `twins` | RED, 1 line: `snip/globskipdots.sh:1:touch .h f; echo .*` | GREEN, 0 |
| V4 | `./errexit-check.sh errexit-plants` vs `errexit-twins` | RED, 4 lines (`p1-postinc.sh:4:(( i++ ))`, `p2-bare-dbracket.sh:3:[[ -f /nonexistent ]]`, `p3-subshell-stmt.sh:3:( cd / && false )`, `p4-fn-tail.sh:4:    [[ "${1:-}" == --force ]]`) | GREEN, 0 |
| V5 | `./guard-gate.sh guard-late-fn.sh` | `FAIL ... exit 2 stdout=[]` (gate exit 1) | `./guard-gate.sh guard-first.sh` -> `PASS guard-first.sh: exit 69, refused cleanly` (gate exit 0) |
| V5b | `guard-late-top.sh` | FAIL, exit 2 | `guard-first-reexec.sh` PASS exit 69 |
| V5c | `guard-late-runtime.sh` (`set -e`) | FAIL, exit 2, `declare: -A: invalid option` | `guard-case.sh` PASS exit 69 |
| V5d | `guard-late-runtime-noe.sh` | FAIL, exit 69 but `stdout=[SIDE EFFECT before guard]` | (as above) |
| V5e | `guard-branch-bad.sh` | FAIL, exit 2 | `guard-branch-ok.sh` runs `abc` exit 0 on 3.2/4.1/4.2/5.3 |
| V6 | `docker run --rm -v "$PWD:/w:ro" -w /w bash:3.2 bash -n FILE` over the 47 `snip/` files | exit 2 on exactly 6: `pipe_amp amp_append coproc case_fallthru case_in_cmdsub test_v`; exit 0 on the other 41 (incl. `declare_A`, `mapfile`, `case_mod`, `funsub`) | `bash -n twins/*.sh` exit 0 on all; `bash -n guard-first.sh` exit **2** on 3.2 (false red), exit 0 on 4.2; `bash -n guard-case.sh`, `guard-first-reexec.sh` exit 0 |
| V7 | `VERSIONS="3.2 4.0 4.1 5.3" docker run ... bash errexit-plants/p1-postinc.sh` etc. | `p1`: exit 0 `reached` on 3.2/4.0, **1** on 4.1/5.3; `p2` same; `p3`: 0 on 3.2, 1 on 4.0+; `p4`: 1 everywhere | `errexit-twins/t1..t4`: exit 0 `reached` everywhere |
| V8 | `./vrun.sh patsub.sh` (5.1 vs 5.2) and `./vrun.sh dotglob.sh` | row 1 `a[&]c` (3.2-5.1) vs `a[b]c` (5.2+); `echo .*` `. .. .hidden` vs `.hidden` | `./vrun.sh patsub-safe.sh` -> `a[&]c\|a[&]c\|a&&c` on 3.2, 4.2, 5.1, 5.2, 5.3 |
| V9 | `./denylist-fleet.sh` (166 fleet files) | 10 hit lines, 5 files; manual check: 10/10 true constructs, 1 guarded (`measure-index-clone.sh:80`) | n/a (no FP) |
| V10 | `shellcheck -s bash -f json snip/*.sh` | **did not go red**: 0 version diagnostics (codes 1091, 2034, 2119, 2120, 2124, 2145, 2162, 2194); same with `--enable=all` | n/a. Reported as a failure of the tool, not of the fixture |
| V11 | `shfmt -ln bash snip/*.sh` | **did not go red** except `snip/funsub_reply.sh` (`${\| REPLY=hi; }`); 46/47 accepted | n/a |
| V12 | `./twin-run.sh` on 3.2/4.0/4.4/5.3 | n/a | 30/30 twins print identical output on all four |
| V13 | `./source-parse.sh` (library with `[[ -v ]]` inside `lib_bad`) | 3.2 and 4.1: `source rc=1`, `lib_before: defined`, `lib_bad: MISSING`, `lib_after: MISSING` | 4.2: `source rc=0`, all defined |

Key trimmed outputs:

```
$ VERSIONS="3.2 4.0 4.1 4.2 4.3 4.4 5.0 5.1 5.2 5.3" ./vrun.sh errexit-arith.sh           # excerpt
arith_cmd_postinc      3.2..4.0: reached (exit 0)       4.1..5.3: (exit 1)
dbracket_false         3.2..4.0: reached (exit 0)       4.1..5.3: (exit 1)
dbracket_fn_tail       3.2..5.3: (exit 1)
subshell_false         3.2: reached (exit 0)            4.0..5.3: (exit 1)
local_cmdsub           3.2..5.3: in-f reached (exit 0)               # local x=$(false) masks status on all ten

$ ./vrun.sh features.sh at_K     # ${A[@]@K}
3.2: declare: -A: invalid option ... 1    4.0-4.3: 1    4.4-5.0: ${A[@]@K}: bad substitution    5.1-5.3: x "1"
$ ./vrun.sh features.sh at_k     # ${A[@]@k}
4.0-4.3: 1     4.4-5.1: ${A[@]@k}: bad substitution     5.2-5.3: x 1

$ matrix.sh posix guard-case.sh      # every interpreter except bash 5.2 --posix
dash / busybox ash 1.35 / 1.37 / mksh R59c / ksh93u+m x2 / yash 2.52 / posh 0.14.1 / bash 3.2 --posix / zsh --emulate sh:
  guard-case.sh: needs bash >= 4.2 (BASH_VERSION='')   -> exit 69
bash 5.2 --posix: guard passed under bash 5.2.15(1)-release -> exit 0

$ docker run --rm -v ... bash:3.2 bash -n omp.bash
omp.bash: line 34: conditional binary operator expected
omp.bash: line 34: `    if [[ $_omp_cursor_positioning == 0 ]] || [[ -v MC_SID ]]; then'
(bash 4.2: exit 0)
```

Not run / unverifiable: macOS /bin/bash itself and Apple's patch level (no host; `bash:3.2` image stands in; runner README is the only vendor-side 3.2.57 evidence); Homebrew bash behaviour on macOS; `BSD` userland effects on any denylist hit.

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| BVG-03/04 guard-first | `bats-core@0c92eb4c418d:bin/bats:8-15`: POSIX `[ -z "${BASH_VERSION-}" ] \|\| [[ -z "${BASH_VERSINFO-}" ]] \|\| ((BASH_VERSINFO[0] < 3 \|\| ...))`, `printf 'bats: this program needs to be run by Bash >= 3.2\n' >&2; exit 1`; the comment explains that `[[`/`(( ))` are used only after the bash check. A guard-first prologue with a 3.2 floor; exit code 1 where the fleet contract says 69 | `JanDeDobbeleer/oh-my-posh@b0a8acd4d402:src/shell/scripts/omp.bash:34` `[[ -v MC_SID ]]` and `:155` `[[ -v BP_PIPESTATUS ... ]]`: parse errors on 3.2/4.0/4.1 inside function bodies, no guard; line 52 `if ((BASH_VERSINFO[0] >= 5))` guards only `EPOCHREALTIME` at :55. Also `:137,148` `${prompt@P}` (4.4), `:173` `${_omp_pipestatus[-1]}` (4.3). Measured: `bash -n omp.bash` on `bash:3.2` fails at line 34; a sourcing `.bashrc` aborts at that function |
| BVG-05 runtime branch | `pyenv@d28b750767d4:libexec/pyenv-rehash:139-141` `if ((${BASH_VERSINFO[0]} > 3)); then declare -A registered_shims`; `libexec/pyenv-versions:90,105,145,147` the same test with a `<= 3` array fallback. `git@6de20f6092dc:contrib/completion/git-completion.bash:2917-2921` `if [ "${BASH_VERSINFO[0]:-0}" -ge 4 ]; then varname="${varname,,}"; else varname="$(echo "$varname" \|tr A-Z a-z)"; fi`. `bats-core@0c92eb4c418d:libexec/bats-core/bats-exec-test:244` `if (( BASH_VERSINFO[0] < 4 ))`. Fleet: `ocx@5de9d777eb7d:test/manual/measure-index-clone.sh:78-81` (`${EPOCHREALTIME:-0}` with `systime()` fallback), `setup-grimoire@1259e35b2550:.github/scripts/install.sh:94-96` (awk `tolower` instead of `${expected,,}`, comment names the macOS runner's 3.2) | none observed; note pyenv's file is extensionless and invisible to the `--include` denylist |
| BVG-02 denylist (3.2 floor held) | bats-core 0 hits, pyenv/rbenv/fzf/zoxide/Homebrew install 0 hits (extensionless files aside) | `direnv@28a73d1df3f3:stdlib.sh:1404` `local -A values_to_restore=(` (no guard); `shellspec@f2d13f991885:libexec/shellspec-inspection.sh:199-204` probes `( exec {fd}>/dev/null ) 2>/dev/null` and `run_builtin readarray </dev/null` **by trial** (a feature-detection idiom, legitimate: the denylist flags it, the marker or a baseline entry silences it) |
| BVG-08 POSIX-only guard | `shellspec` capability probes above use no bash-only parsing in the probe line | none |
| BVG-16 SC2207 / `mapfile` | ShellCheck wiki SC2207 itself offers the bash 3.x loop `while IFS='' read -r line; do array+=("$line"); done < <(mycommand)` | the same page recommends `mapfile -t array < <(mycommand)` first and annotates it "bash 4.4+" (measured: 4.0) |
| BVG-09 errexit statements | `www-setup@a251c3631047:tests/install/helpers/server.bash:296,298`, `grimoire@4650ad830375:test/manual/scripts/bootstrap.sh:60`, `ocx@5de9d777eb7d:.../env.sh:87` use bare `( cd dir && cmd )` statements: these *violate* BVG-09 on 3.2 (silent continue); bats-core documents the whole class in `docs/source/gotchas.rst` | none contradicting |
| BVG-12 patsub | no exemplar sets `shopt -u patsub_replacement`; `JanDeDobbeleer/oh-my-posh@b0a8acd4d402:omp.bash:55` `${EPOCHREALTIME//[!0-9]/}` has no `&` in its replacement (compliant) | none observed |

## AI-agent angle

What an LLM characteristically gets wrong here, and the smallest mechanical check:

| Mistake | Why it happens | Smallest check |
|---|---|---|
| Writes `declare -A`, `mapfile`, `${x,,}`, `[[ -v x ]]`, `&>>`, `\|&` freely in `#!/usr/bin/env bash` scripts | training data is bash 5 Linux; "bash" reads as "modern bash" | BVG-02 grep (empty output); `bash:3.2` smoke run |
| Follows ShellCheck SC2207's "Prefer mapfile" | the lint message and the wiki's first example are `mapfile` | BVG-16: `mapfile[[:space:]]` pattern |
| Puts the version guard at the top of `main()` or after the first `declare -A` | looks like "the top of the program" | BVG-03 gate: exit 69 on `bash:3.2` with empty stdout |
| Uses `${BASH_VERSINFO[0]}` in a script that `sh script.sh` can run | assumes bash | BVG-08: `matrix.sh posix` (dash exit 2 "Bad substitution") |
| `set -euo pipefail` plus `(( i++ ))` or a bare `[[ -f x ]]` as a "check" | cargo-cult errexit, assumes `[[` stops the script | BVG-09 `errexit-check.sh`; compare exit codes on bash:3.2 vs bash:4.1 |
| `shopt -s inherit_errexit` bare "for strictness" | copied from hardened-bash templates | BVG-14: shopt patterns match only the bare form |
| `"${arr[@]}"` / `"${@}"` under `set -u` | style `"${@}"` from bats/Google samples | BVG-11 stage-2 grep, `nounset-at.sh` on 3.2 and 4.0 |
| `${var/x/&}` or user data in a replacement, assuming `&` is literal | pre-5.2 mental model | BVG-12: `VERSIONS="5.1 5.2" ./vrun.sh patsub.sh` differ; `shopt -u patsub_replacement` |
| `rm -rf .*`, `for f in .*` | classic idiom, behaviour changed in 5.2 | BVG-13 stage-3 grep; `.[!.]* ..?*` |
| Sets `BASH_COMPAT=32` "so it works on macOS" | believes a compat level restricts features | BVG-15 grep; `compat-level.sh` shows `declare -A` still works |
| Assumes `/bin/bash` or `bash` exists | Debian/Ubuntu/macOS assumption | `docker run alpine:3.22 ...` exit 127 for `env bash`; installers stay POSIX sh |
| Uses 5.3's `${ cmd; }` or `GLOBSORT` because "bash 5.3 is current" | docs and NEWS describe the newest release | BVG-18: grep, pin `# bash-floor: 5.3`; `bash:5.2` run |
| Trusts `bash -n` or `shellcheck -s bash` as the portability check | both are "syntax OK" signals | BVG-06: `bash -n` passes `declare -A` on 3.2; ShellCheck 0.11.0 finds 0 of 47 |

## Contested / evolving

- **Raise the floor vs keep 3.2.** Many projects now require Homebrew bash on macOS (bats-core keeps 3.2; oh-my-posh's `omp.bash` already assumes 4.2+/4.4 constructs without a guard). Trend as of 2026-10-11: macOS `/bin/bash` stays at 3.2.57 (GitHub's macos-14/15/26 runner READMEs all print `3.2.57`; Apple's zsh-default page dates from 10.15 and says nothing about removing bash), so a 3.2 floor remains the only mechanically safe default for unpinned scripts. The contested part is cost: a guard-first prologue (4 lines) is cheaper than a 3.2-compatible rewrite for tools that want `declare -A`; this document gives the prologue as the sanctioned way out.
- **ShellCheck gaining a bash version target** (#2615, open since 2022-10-25, no maintainer comment as of 2026-10-11) would replace the grep; until then the grep is the policy and ShellCheck is not the gate.
- **5.3 adoption.** Ubuntu 26.04 ships 5.3.9 (new `ubuntu-latest` between 2026-10-19 and 2026-11-19 per the topic map's [shift] s13) but Debian 12/13, Ubuntu 24.04 and AlmaLinux 10 remain 5.2.x; expect 5.3 features to be unpinnable on LTS fleets into 2028-2029.
- **`patsub_replacement` default.** On in stock 5.2/5.3; 5.3 NEWS n lets a distro compile it differently, so "5.2+ means `&` is special" is a default, not a guarantee. Detection is by behaviour (`y=abc; [ "${y/b/&&}" = abbc ]`), not by version.
- **`set -e`.** Wooledge ([BashFAQ/105](https://mywiki.wooledge.org/BashFAQ/105)) argues errexit "does not work well in practice" and "the rules change from one Bash version to another"; the 4.0/4.1 splits measured here are exactly those changes. The topic map's resolved position (net, never contract; explicit checks for the 3.2 case) is consistent; this dive adds the compensation forms.
- **`(( ))` statement after 4.1.** Some style guides use `(( i++ )) || true` to survive `set -e`; it works on all ten versions but hides real arithmetic failures. `i=$((i + 1))` has no failure mode and is preferred.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [ftp.gnu.org/gnu/bash/bash-5.3.tar.gz](https://ftp.gnu.org/gnu/bash/bash-5.3.tar.gz) (NEWS, COMPAT, CHANGES) | Bash's own release notes 2.0-5.3, compat-level table, change log (primary) | 5.3 (2025); read 2026-10-11 | Source of every "first version" cite; COMPAT states what compat levels do and do not do |
| [GNU Bash manual: The Shopt Builtin](https://www.gnu.org/software/bash/manual/html_node/The-Shopt-Builtin.html) | Reference for `patsub_replacement`, `globskipdots`, `inherit_errexit`, `lastpipe` defaults (primary) | 5.3 manual | Confirms defaults and the POSIX-mode link for `inherit_errexit` |
| [GNU Bash manual: Shell Parameter Expansion](https://www.gnu.org/software/bash/manual/html_node/Shell-Parameter-Expansion.html) | `&` replacement semantics and the quoting rule (primary) | 5.3 manual | The exact wording for F8 |
| [GNU Bash manual: Bash POSIX Mode](https://www.gnu.org/software/bash/manual/html_node/Bash-POSIX-Mode.html) | What `--posix` changes, including `inherit_errexit` (primary) | 5.3 manual | Shows `--posix` is not a patsub switch |
| [koalaman/shellcheck#2615](https://github.com/koalaman/shellcheck/issues/2615) | "Allow configuring to reject code that is incompatible with bash 3.2" (primary, tool repo) | opened 2022-10-25, open on 2026-10-11 | The documented gap this dive fills |
| [ShellCheck wiki SC2207](https://www.shellcheck.net/wiki/SC2207) | Advice to prefer `mapfile`, with 3.x alternatives (primary, local clone `koalaman__shellcheck.wiki@0b4dfe7bf9dc`) | 0.11.0 era | Shows the lint nudging past the floor |
| [ShellCheck wiki SC2127](https://www.shellcheck.net/wiki/SC2127) | 0.10.0 warned on `${ ..; }`, 5.3 added it (primary) | 0.11.0 era | Tool lag in both directions |
| [ShellCheck wiki SC2124 / SC2076](https://www.shellcheck.net/wiki/SC2124) | `x=$@` array-to-string and `=~` quoting vs `compat31` (primary) | 0.11.0 era | M-C-16 and COMPAT cross-reference |
| [bats-core docs/source/gotchas.rst](https://github.com/bats-core/bats-core/blob/master/docs/source/gotchas.rst) | "The `set -e` handling of `[[ ]]` and `(( ))` changed in Bash 4.1" (primary, tool repo) | master, read 2026-10-11 | Independent confirmation of the 4.1 boundary (the brief said 4.2) |
| [Wooledge BashFAQ/105](https://mywiki.wooledge.org/BashFAQ/105) | Why `set -e` is unreliable, "rules change from one Bash version to another" | practitioner, maintained | The argued counterpoint to errexit as a contract |
| [Wooledge BashFAQ/061](https://mywiki.wooledge.org/BashFAQ/061) | Which bash version added which feature | practitioner, includes 5.3 (2025) | Cross-check of the F1 table |
| [Apple Support 102360](https://support.apple.com/en-us/102360) | zsh default shell since macOS 10.15; bash default in 10.14 and earlier (vendor) | current page, read 2026-10-11 | Confirms the login-shell change; says nothing on /bin/bash version (no host) |
| `actions/runner-images@8197087fc536:images/macos/macos-26-Readme.md:16` (also macos-14, macos-15) | `Bash 3.2.57(1)-release` on GitHub macOS runners (primary, vendor) | 2026-10 | Only vendor-side 3.2.57 evidence for macOS 26 without a Mac |
| [tracker.debian.org/pkg/bash](https://tracker.debian.org/pkg/bash) | Debian bash package versions 5.2.15-5.2.37 (primary) | read 2026-10-11 | Distro floor for F9 |
| [formulae.brew.sh/api/formula/bash.json](https://formulae.brew.sh/api/formula/bash.json) | Homebrew bash stable `5.3.20` (primary) | read 2026-10-11 | The macOS "install a newer bash" target |
| `pyenv@d28b750767d4:libexec/pyenv-rehash:139-141`, `libexec/pyenv-versions:90-147` | runtime BASH_VERSINFO branch around `declare -A` | exemplar corpus 2026-10-10 | Idiom for runtime-only constructs |
| `git@6de20f6092dc:contrib/completion/git-completion.bash:2917-2921` | `${var,,}` vs `tr` by `BASH_VERSINFO` | exemplar corpus | Same idiom, expansion form |
| `bats-core@0c92eb4c418d:bin/bats:8-15` and `libexec/bats-core/bats-exec-test:244` | guard-first for a 3.2 floor | exemplar corpus | Model prologue |
| `oh-my-posh@b0a8acd4d402:src/shell/scripts/omp.bash:34,52,55,137,155,173` | `[[ -v ]]` and other 4.x constructs without a guard | exemplar corpus | The failure case (M-A-07) |
| `direnv@28a73d1df3f3:stdlib.sh:1404` | `local -A` in `use_nix` | exemplar corpus | Unguarded `local -A` |
| `shellspec@f2d13f991885:libexec/shellspec-inspection.sh:199-204` | capability probing by trial (`( exec {fd}>/dev/null ) 2>/dev/null`, `run_builtin readarray`) | exemplar corpus | Feature detection without version parsing |
| `shell-audit/fleet-shell-shape.md` Axis 4-5 ([fleet]) | the 5 fleet files, 0 guards, 103/166 dev-reachable, errexit probes | 2026-10-10 | Evidence base re-measured here |
| `rules/rust-quality/cli-contract.md` | Fleet exit-code table (69 `Unavailable`, 64, 78) | in repo | Source of the guard's exit code |

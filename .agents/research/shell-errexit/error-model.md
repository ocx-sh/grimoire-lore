---
title: The shell error model (set -e, explicit checks, nounset, pipefail)
topic: shell / errexit / error-model (rule family SH-ERR; map rows M-B-01, M-B-02, M-B-05..M-B-08, M-B-16..M-B-18)
agent: W2-4 errexit/error-model
model: sonnet
date_researched: 2026-10-11
sources_count: 22
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/error-model/
scope: >
  Covers where errexit fires and where it is silently off, per shell (dash, busybox ash 1.35/1.37, mksh R59c, ksh93u+m x2, yash 2.52,
  posh 0.14.1, bash 3.2-5.3, Git Bash 5.2, zsh 5.0.8-5.9), nounset with empty arrays and "$@", pipefail with early-exit readers, sourced
  libraries, the SC2310/SC2311/SC2312/SC2155/SC2181/SC2015 behaviour on planted code, the exact prologue per script kind, and a 15-site read of the fleet's SC2310 hits.
  Not covered: traps, cleanup and the exit-status vocabulary (W2-5 traps-and-exit-codes), `(( ))`/`[[ ]]` under -e as a topic of its own (M-B-03/04, only pinned here),
  PowerShell error handling beyond one measured contrast (PS-ERR owns it), BSD/macOS userland (no host; every such claim is marked "unverified: read only").
---

# The shell error model

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - [1. Where errexit fires: the per-shell pin](#1-where-errexit-fires-the-per-shell-pin)
   - [2. What the specification says, and where shells deviate](#2-what-the-specification-says-and-where-shells-deviate)
   - [3. The masked-status family: local, export, readonly, eval, cd](#3-the-masked-status-family-local-export-readonly-eval-cd)
   - [4. Command substitution and inherit_errexit](#4-command-substitution-and-inherit_errexit)
   - [5. The 15-site read of the fleet's SC2310 hits](#5-the-15-site-read-of-the-fleets-sc2310-hits)
   - [6. What ShellCheck reports on each plant](#6-what-shellcheck-reports-on-each-plant)
   - [7. pipefail and early-exit readers (the generalised SIGPIPE rule)](#7-pipefail-and-early-exit-readers-the-generalised-sigpipe-rule)
   - [8. nounset: empty arrays, "$@", and the idiom](#8-nounset-empty-arrays--and-the-idiom)
   - [9. Sourced libraries and the caller's options](#9-sourced-libraries-and-the-callers-options)
   - [10. The IFS prologue line](#10-the-ifs-prologue-line)
   - [11. shift, $?, and A && B || C](#11-shift---and-a--b--c)
   - [12. Error model per script kind, with the exact prologue](#12-error-model-per-script-kind-with-the-exact-prologue)
   - [13. Outside POSIX: fish, nu, elvish, PowerShell](#13-outside-posix-fish-nu-elvish-powershell)
   - [14. Fleet defects found (reported, not fixed)](#14-fleet-defects-found-reported-not-fixed)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Conflict 1 is confirmed, with three amendments: the error model is chosen by script kind; installers require `set -u` and explicit `|| die`/`|| return` at every fallible call, and may add `-e` only as a net; and a fifth kind, the verifier script (output is the violation), gets `set -u` and no `-e` because `grep` exits 1 on "no match".
- `-e` is off inside any function called from `if`, `while`, `until`, `!`, or the non-last side of `&&`/`||`, on all 11 POSIX-family interpreters, 8 bash versions, Git Bash 5.2 and zsh 5.0.8-5.9 (measured 2026-10-11, `fixtures/error-model/pin.sh`). It is not a version bug; POSIX.1-2024 documents it.
- `local x=$(false)`, `export x=$(false)` and `readonly x=$(false)` return 0 in every shell tested; `typeset x=$(false)` does too in mksh, ksh93u+m, yash, bash and zsh. Splitting the declaration restores the abort on every shell. SC2155 (default-on) catches local, export, declare and readonly, but not `local -r`.
- Command substitution does not inherit `-e` in default-mode bash 3.2-5.3 and in busybox ash 1.35/1.37; it does in dash, mksh, ksh93u+m, yash, posh, zsh, bash `--posix` and bash with `shopt -s inherit_errexit` (4.4+). POSIX requires inheritance. `x=$(set -e; f)` is the one form that behaves the same everywhere bash is the shell, down to 3.2.
- Only 2 of 15 read SC2310 sites hide a real hazard, and one of those is not an errexit problem but a `! cmd | grep -q` under pipefail. 47 of the 69 hits sit in two files whose callees are single-command predicates (`check_cmd`, `is_truthy`, `fetch`). Demote SC2310 from P0 hazard to P1 reading aid; keep the check enabled so every suppression is visible.
- SC2312 (`check-extra-masked-returns`) is noise-dominated: of 150 hits, 19 are message arguments and most of the rest are `source "$(dirname ...)"`-style idioms. Do not make it mandatory; replace it with a narrow grep for `eval "$(cmd)"` and `cd "$(git ...)"`, the two shapes that hide real failures.
- ShellCheck 0.11.0 SC2311 goes silent when `pipefail` is also set: `set -e` and `set -eu` fire, `set -eo pipefail`, `set -e; set -o pipefail` and `set -euo pipefail` do not (measured). The mandatory `set -euo pipefail` prologue therefore switches the check off; pair it with a grep or `shopt -s inherit_errexit`.
- The SIGPIPE rule generalises past 141: the writer's status under pipefail is 141 (bash, zsh, busybox, mksh, dash 0.5.12-12), 397 (yash 2.52), 13 or 1 (ksh93u+m, which uses socketpairs), and 23 for `curl` ("Failure writing output"). A multi-line value of 10 KiB or more piped from `echo "$var"` into `grep -q` failed 200 of 200 runs on bash 3.2-5.3 (GNU grep 3.8: 2 of 200 at 8 KiB, 150 of 200 at 10 KiB).
- ShellCheck's SC2337 (early-exit reader under pipefail) is not in 0.11.0: the wiki page exists and the checker is silent on its own example. The grep is the only gate until it ships.
- `pipefail` in `#!/bin/sh` scripts is legal only through `(set -o pipefail) 2>/dev/null && set -o pipefail`. The "set it and swallow the error" form (`set -o pipefail 2>/dev/null || :`) kills dash 0.5.12 (Debian 12, Ubuntu 24.04) with exit 2 and posh with exit 1. Code must be correct with it off, since dash 0.5.12-2 and posh ignore it.
- Empty `"${a[@]}"` under `set -u` fails on bash 3.2, 4.0 and 4.2 (`a[@]: unbound variable`) and passes from 4.4. `${a[@]+"${a[@]}"}` and a `${#a[@]}` guard both pass on all eight versions. Empty `"$@"` under `-u` passes on bash 3.2-5.3, dash, busybox, mksh, ksh93u+m and yash; the map's claim that it fails on 3.2 is overturned. Only posh 0.14.1 rejects it (`@: parameter not set`).
- `IFS=$'\n\t'` is dropped from the prologue. It changes `read`, `"$*"`, `"${a[*]}"` and unquoted splitting, no measurement supports a benefit, and in `#!/bin/sh` it sets IFS to the four bytes `$`, `\`, `n`, `t` on dash 0.5.12, yash 2.52 and posh 0.14.1 (SC3003 flags it).
- An unguarded `shift` with nothing to shift aborts dash (exit 2) and ksh93u+m (exit 1) even when written `shift || true`, because it is a special-builtin error. Guard with `if [ "$#" -gt 0 ]; then shift; fi`.
- A sourced library that runs `set -e`/`set -u` changes the caller on all 11 POSIX interpreters, bash 3.2-5.3 and zsh 5.0.8-5.9: the caller exits at its next `false`. A library sets no options; if it must detect the caller's `-e`, `[ "${-#*e}" != "$-" ]` (nvm.sh:3877) agrees with `case $- in *e*)` on all 23 interpreters.
- zsh differs in two places: `! f` (f a function returning 0) exits under `-e` on 5.3.1-5.9, and `! true` exits on 5.0.8. Native zsh scopes strictness with `setopt local_options err_return`, which restores on function exit (5.0.8-5.9).
- `$?` read after a command substitution in the same command is the substitution's status (ShellCheck issue 3522, reproduced); ShellCheck 0.11.0 is silent on it. A grep with an `=` exclusion catches the shape with 0 fleet false positives.
- Fleet reproducers: `ocx/test/manual/announce-e2e/scripts/env.sh:244` reports "settled" when `gh` fails, and `ocx/test/manual/run-windows-activation.sh:39-46` runs the gate with an empty `-OcxBin` when `wslpath` fails (fixtures `fleet-checks-settled.sh`, `fleet-run-gate.sh`).

## Findings

### 1. Where errexit fires: the per-shell pin

Harness: `fixtures/error-model/pin.sh`. One function per case, each run as `( set -e; case; echo ">>R" )`; `>>R` is printed only if the body returned without aborting. The harness has to be function-based: posh 0.14.1 ignores errexit inside `eval 'false; echo X'` (`posh_eval.sh` prints `AFTER_in_eval`), and an early `eval` version of the probe gave a false green for posh. Run with `matrix.sh posix|bash|zsh|win` on 2026-10-11. Raw output: `pin_posix.out`, `pin_bash.out`, `pin_zsh.out`, `pin_win.out`.

| Case (all under `set -e`) | dash 0.5.12, bb 1.35/1.37, mksh, ksh93u+m x2, yash, bash 3.2 and 5.2 `--posix`, zsh `--emulate sh` | default bash 3.2-5.3, Git Bash 5.2 | native zsh 5.3.1-5.9 | posh 0.14.1 |
|---|---|---|---|---|
| `false; echo after` | aborts | aborts | aborts | aborts |
| `f() { false; echo still; }; if f; then :; fi` | prints `still`, continues | same | same | same |
| `f && :`, `f \|\| :` | prints `still`, continues | same | same | same |
| `! f; echo after` (f returns 0) | continues | continues | **exits 1 after `still`** (5.0.8: exits on `! true`) | continues |
| `! false \| false; echo after` | continues | continues | continues | continues |
| `local x=$(false)` in a function | **continues** (rc 0) | continues | continues | continues |
| `export x=$(false)`, `readonly x=$(false)` | continues | continues | continues | continues |
| `typeset x=$(false)` | continues (mksh, ksh93u+m, yash, bash, zsh); `typeset` absent in dash, bb, posh | continues | continues | n/a |
| `local x; x=$(false)`, `x=$(false)` | aborts | aborts | aborts | aborts |
| `echo "[$(false; echo hi)]"` | `[]` in all but **bb: `[hi]`** | **`[hi]`** | `[]` | `[]` |
| `x=$(false; echo hi)` | aborts in all but **bb: continues, x=hi** | **continues, x=hi** | aborts | aborts |
| `true && false` (last in list) | aborts | aborts | aborts | **continues** (posh bug) |
| `( false ); echo after` | aborts (bash 3.2 `--posix`: continues) | **3.2 continues**, 4.0+ abort | aborts | aborts |
| `(( i++ ))` with i=0 | mksh, bash 5.2 `--posix`, zsh abort; **ksh93u+m and bash 3.2 `--posix` continue** | **3.2 and 4.0 continue**, 4.2+ abort | aborts | no `((`: rc 127 |
| `[[ x = y ]]` | aborts (bash 3.2 `--posix`: continues; dash/posh lack `[[`) | **3.2 and 4.0 continue**, 4.2+ abort | aborts | no `[[` |

Reading: the three rows that matter for rules are the function-in-condition row (all shells), the `local`/`export`/`readonly` row (all shells), and the command-substitution row (the split is busybox ash plus default-mode bash against everyone else). Bash NEWS dates the `[[ ]]`/`(( ))` change to 4.1 ([bash NEWS](https://git.savannah.gnu.org/cgit/bash.git/plain/NEWS), 4.1 item j); the matrix has no 4.1, so only "4.0 no, 4.2 yes" is measured. Git Bash 5.2 on the Windows host matches bash 5.x in every row (`pin_win.out`).

The BashFAQ/105 exercise 3 pair is a related trap that this pin does not need: `f() { test -d nosuchdir && echo no dir; }; f` aborts at the call even though the same line at top level does not, because the function's last status is the failed `&&` list ([BashFAQ/105](https://mywiki.wooledge.org/BashFAQ/105)).

### 2. What the specification says, and where shells deviate

POSIX.1-2024 `set -e` text (read 2026-10-11, [XCU 2 Shell Command Language](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)): `-e` is ignored "when executing the compound list following the while, until, if, or elif reserved word, a pipeline beginning with the ! reserved word, or any command of an AND-OR list other than the last". Its example `set -e; echo $(false; echo one) two` says the command-substitution subshell exits and "the exit status of the subshell is ignored". The application usage note states the function case outright: "Application writers should avoid relying on set -e within functions", with a `start || echo >&2 some_server failed` example in which the function "carries on". That is rule SH-ERR on function-in-condition: it is specified, not a bug.

Deviations measured here:

- Default-mode bash does not inherit `-e` into `$( )`; POSIX mode and `shopt -s inherit_errexit` do ([bash NEWS 4.4 item ii](https://git.savannah.gnu.org/cgit/bash.git/plain/NEWS): "causes command substitutions to inherit the -e option ... It's enabled as part of turning on posix mode"). Measured: `set -o posix` in-script makes `$(false; echo hi)` print empty on 3.2-5.3 (`inherit_set_posix.sh`).
- busybox ash 1.35 and 1.37 do not inherit either (`echo "[$(false; echo hi)]"` prints `[hi]`).
- posh 0.14.1 does not abort on `true && false` as the last AND-OR item, and ignores errexit inside `eval`.
- zsh exits on `! f` for a function f that returns 0 (5.3.1-5.9) and on `! true` (5.0.8) (`zbang.sh`, `zbang2.sh`). zsh's own `ERR_EXIT` text says non-zero status in a `&&`/`||` list "is ignored for commands not at the end of the list" ([zsh Options](https://zsh.sourceforge.io/Doc/Release/Options.html)); the `!` behaviour is not documented there.
- dash's manual defines "untested" as the control of `if`/`elif`/`while`/`until` or the left operand of `&&`/`||` and says nothing about `!` ([dash(1)](https://man.archlinux.org/man/dash.1.en)). Measured: `!` is exempt in dash.

Bash's own words match BashFAQ/105's complaint that "the rules change from one Bash version to another": `(( ))`/`[[ ]]` joined errexit in 4.1, `( false )` aborted from 4.0 (bash 3.2 continues, `h2c.sh` in the fleet audit and `c_subshell` here), `inherit_errexit` arrived in 4.4.

### 3. The masked-status family: local, export, readonly, eval, cd

Plants: `masked.sh`/`masked_twin.sh`, `masks.sh`/`masks_twin.sh`.

```bash
# WRONG: local returns 0, the substitution's status is discarded (all 11 POSIX interpreters, bash 3.2-5.3, zsh)
g() { local x=$(false); echo "reached with x=[$x]"; }
# RIGHT: the assignment carries the status, so -e fires and `|| return` works
g() { local x; x=$(false); echo "reached with x=[$x]"; }
```

`readonly e=$(false)` masks everywhere too. `local -r b=$(false)` masks and SC2155 does not warn ("ShellCheck does not warn about masking of local read-only variables", [SC2155 wiki](https://github.com/koalaman/shellcheck/wiki/SC2155)); only `-o check-extra-masked-returns` reports it, as SC2312. The ksh93u+m builds have no `local` (`local: not found`, rc 127); rustup carries `has_local` plus `alias local=typeset` ([rustup@61271d00a979:rustup-init.sh:15-20](https://github.com/rust-lang/rustup), www-setup `install.sh:39-40`).

`eval "$(cmd)"` and `cd "$(cmd)/x"` hide the producer's failure by construction: the substitution sits in an argument, so `eval ""` succeeds. The ShellCheck wiki gives the `cd "$(get_chroot_dir)/etc"` example ([SC2312 wiki](https://github.com/koalaman/shellcheck/wiki/SC2312)). Right form:

```bash
env_code=$(ocx self activate --shell=bash)   # -e or `|| die` fires on failure
eval "$env_code"
```

### 4. Command substitution and inherit_errexit

`fixtures/error-model/inherit.sh`, bash 3.2/4.0/4.2/4.4/5.0-5.3, no `||` context (a `|| echo` around the probe disables `-e` inside it and gave a false result in my first version):

| Case (under `set -e`) | bash 3.2, 4.0, 4.2 | bash 4.4-5.3 |
|---|---|---|
| `echo "[$(false; echo hi)]"` | `[hi]` | `[hi]` |
| `shopt -s inherit_errexit; echo "[$(false; echo hi)]"` | `shopt: inherit_errexit: invalid shell option name` | `[]` |
| `x=$(false; echo hi)` after `inherit_errexit` | invalid option | aborts |
| `local y=$(false)` after `inherit_errexit` | invalid option | **still reaches the next line** |
| `x=$(set -e; false; echo hi)` | **aborts** (no `x`) | aborts |
| `h() { false; echo hi; }; x=$(h)` | `got=[hi]` | `got=[hi]`; after `inherit_errexit` aborts |

Consequences. (a) `inherit_errexit` needs a 4.4 floor; on a 3.2-floor script the portable spelling is `$(set -e; f)`. (b) `inherit_errexit` does not repair `local x=$(…)`. (c) Probing it with `shopt -s inherit_errexit 2>/dev/null || :` gives version-dependent behaviour on 3.2/4.x, so put the line in only where the interpreter is pinned. (d) The ShellCheck wiki for SC2311 recommends exactly `inherit_errexit` or `set -e;` before the call; its example is a bash script, and the checker stays silent for `#!/bin/sh` (`sc2311_sh.sh` exits 0).

### 5. The 15-site read of the fleet's SC2310 hits

Re-measured 2026-10-11: `shellcheck --norc -s bash|sh -o check-set-e-suppressed,check-extra-masked-returns` over the 155 authored files that set `-e` (`fleet_sc.py`, output `fleet_sc.txt`): **SC2310 x69 in 9 files, SC2312 x150 in 41 files**, matching [fleet Axis 4](../shell-audit/fleet-shell-shape.md). Files with SC2310 (count): `www-setup/src/install.sh` 28, `www-setup/tests/docker/install-shells.sh` 19, `ocx/test/manual/announce-e2e/scripts/run_sequence.sh` 6, `index/scripts/golden-baseline.sh` 4, `ocx/test/manual/run-windows-activation.sh` 4, `ocx/test/manual/announce-e2e/scripts/env.sh` 3, `www-setup/tests/ci/install-ocx.sh` 2, `www-setup/tests/docker/activate.sh` 2, `www-setup/scripts/gen-dist.sh` 1. SC2312 top files: `selfcheck_identity.sh` 28, `selfcheck_g2.sh` 19, `run_gitlab_e2e.sh` 7, `ocx/test/manual/scripts/bootstrap.sh` 7 (full list in `fleet_sc.txt`).

I read 15 sites with their callees. A site is a hazard only if the callee runs two or more fallible steps whose early failure matters.

| # | Site | Callee | Class |
|---|---|---|---|
| 1 | `www-setup/src/install.sh:164` `if ! check_cmd "$1"` | `command -v "$1"` (one command, :159-161) | benign: predicate |
| 2 | `install.sh:372` `if download_once` in the retry loop | one `curl`/`wget` per branch (:338-358) | benign: the condition is the point |
| 3 | `install.sh:799` `fetch_dist … \|\| err` | `_pin=$(dist_pin_digest)`; `download_to_file … \|\| return 1`; verify (:511-520). `dist_pin_digest` ends in `sed`, whose status is 0 | benign by design: explicit `\|\| return 1`; latent only if `dist_pin_digest` could fail |
| 4 | `install.sh:825` `! is_truthy …` | one `case` (:128-133) | benign |
| 5 | `install.sh:877` `! is_truthy …` | same | benign |
| 6 | `install-shells.sh:95` `pm_install … \|\| return 1` | `pm_refresh` (all `\|\| :`) then one `case` (:80-92) | benign |
| 7 | `install-shells.sh:227` `if fetch` | one `curl`/`wget`/`return 3` (:104-116) | benign |
| 8 | `golden-baseline.sh:381` `if compare_manifests` | 25-line loop that tracks an explicit `ok` flag (:248-273) | benign by design; latent (bash 4 `local -A`) |
| 9 | `run_sequence.sh:56` `if ! _namespace_claimed` | `gh api … \|\| return 1`, then a test (:67-73) | benign |
| 10 | `run_sequence.sh:264` `E2E_REG_TOKEN="$(_pull_token …)" \|\|` | `curl … \| python3` under pipefail (:146-149) | benign: pipefail carries curl's failure to the `\|\|` |
| 11 | `env.sh:227` `poll_until … _checks_settled` | `! gh pr checks … \| grep -qxE …` (:244-245) | **real**: gh failure => pipeline non-zero => `!` => "settled" (reproduced, §14) |
| 12 | `run-windows-activation.sh:70` `run_gate … \|\| _rc=$?` | two `$(wslpath -w …)` assignments, then the gate (:39-46) | **real, low impact**: a failed `wslpath` is masked and the gate runs with an empty `-OcxBin` (reproduced, §14); `wslpath` presence is checked at :49 |
| 13 | `www-setup/tests/ci/install-ocx.sh:73` `if fetch` | one `curl`/`wget`/`die` (:53-62) | benign |
| 14 | `www-setup/tests/docker/activate.sh:362` `elif completion_required` | one `case` (:350-355) | benign |
| 15 | `www-setup/scripts/gen-dist.sh:257` `fetch_sha … \|\| err` | one `curl` (:231-235) | benign |

Result: 13 of 15 benign, 2 real (one of them a pipeline bug, not a suppression bug). Beyond the sample, I read every callee that the 47 sites in `install.sh` and `install-shells.sh` call (`check_cmd`, `is_truthy`, `download_once`, `download_to_file`, `fetch_dist`, `has_local`, `pm_try`, `pm_install`, `fetch`): all are one-command predicates or carry an explicit `|| return`. At most about 9 of the remaining 22 sites could be hazards; I read 8 of them and 3 were. **Verdict: most are benign. SC2310 is a reading aid that makes a suppression visible, not a defect count.** Demote the row from P0 to P1, keep `check-set-e-suppressed` enabled, and make the response to a hit "classify, then fix or annotate" (rule SH-ERR-04).

SC2312 sample: 12 random hits of 150 (`random.seed(7)`): 5 message or pass-through arguments, 3 `source "$(dirname … )"`/`$(cd … && pwd)`, 2 `[ "$(cmd)" = x ]` operands, 1 `eval "$(ocx self activate --shell=bash)"` (real), 1 `exec … "$(wslpath -w scenes)"` (real). A shape count over all 150: 20 `eval`/`source "$(…)"`, 19 message arguments, 17 `[ ]`/`[[ ]]` operands, 4 `cd`/`ln`/`rm` arguments, the rest other. The signal is in two shapes (`eval`, `cd "$(git …)"`), which a grep finds without the 150-line noise (§3, rule SH-ERR-10).

### 6. What ShellCheck reports on each plant

ShellCheck 0.11.0 via `run.sh`, `--norc`. "default" is the stock check set; "opt" is `-o check-set-e-suppressed,check-extra-masked-returns`. A `bash` wrapper is needed to word-split `$o` (the login shell is zsh; my first run silently passed a single argument and reported nothing, so those results were discarded).

| Plant | default | opt | Notes |
|---|---|---|---|
| `suppressed.sh` (`if f; then :; fi`, `set -euo pipefail`) | clean | **SC2310** at 4:4 | twin (`f` called plainly): clean in both |
| `masked.sh` (`local x=$(false)`) | **SC2155** at 4:9 | SC2155 | twin with split declaration: clean in both |
| `masks.sh` (local, `local -r`, export, declare, readonly, split) | SC2155 on `local`, `export`, `declare`, `readonly`; **not** `local -r` | adds SC2312 on `local -r`, `cd "$(false)/etc"`, `eval "$(false)"`, `x="$(true)/$(false)"`, `[ "$(false)" = "" ]` | `masks_twin.sh`: clean in both |
| `cs_fn.sh` (`x=$(h)` with `set -euo pipefail`; `echo "$(false)"`) | SC2005 | SC2005 + SC2312 on the echo; **no SC2311 on `x=$(h)`** | see below |
| `sc2311.sh` (`set -e`; `version=$(deploy)`) | clean | **SC2311** | `sc2311_twin.sh` (`shopt -s inherit_errexit`): clean; `sc2311_sh.sh` (`#!/bin/sh`): clean |
| `cs2.sh` (`set -euo pipefail`; `x=$(h)`) | clean | **clean (false negative)** | SC2311 fires for `set -e` and `set -eu`, silent for `set -eo pipefail`, `set -e; set -o pipefail`, `set -euo pipefail` (`cs4.sh`, five headers) |
| `sc2181.sh` (`mkdir …; if [ $? -ne 0 ]`) | **SC2181** | SC2181 | `sc2181_twin.sh` (`if ! mkdir`): clean |
| `sc2015c.sh`/`d.sh` (`A && B \|\| rm file`) | **SC2015** | SC2015 | `sc2015e.sh` (`A && cp \|\| echo`) and `g.sh` (`… \|\| exit 1`): **no SC2015**, so the false-negative covers the two most common C commands |
| `dollarq.sh` (`$(basename "$f") $?`, ShellCheck issue 3522) | clean | clean | grep in §Verification catches it |
| `sc2337.sh` (`find … \| grep -q` under pipefail) | clean | clean | SC2337 is not in 0.11.0 |
| `tree/bad/ifs-sh.sh` (`#!/bin/sh`, `IFS=$'\n\t'`) | **SC3003** | SC3003 | twin without the line: clean |
| `tree/bad/sh-pf.sh` (`set -o pipefail 2>/dev/null \|\| :`) | **SC3040** | SC3040 | the safe probe is also SC3040; it needs `# shellcheck disable=SC3040` (twin clean with it) |
| `tree/bad/nounset-arr.sh` (bare empty array under `-u`) | clean | clean | ShellCheck has no check for the empty-array hazard |

Optional checks in 0.11.0, from `shellcheck --list-optional`: add-default-case, avoid-negated-conditions, avoid-nullary-conditions, check-extra-masked-returns, check-set-e-suppressed, check-unassigned-uppercase, deprecate-which, quote-safe-variables, require-double-brackets, require-variable-braces, useless-use-of-cat ([Optional wiki](https://github.com/koalaman/shellcheck/wiki/Optional)). `check-set-e-suppressed` emits both SC2310 and SC2311.

### 7. pipefail and early-exit readers (the generalised SIGPIPE rule)

`sigpipe.sh` records the status of a pipeline whose reader exits early, one row per shell. `pipefail` is POSIX since Issue 8 ([XCU set -o](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)) and bash since 3.0 ([NEWS](https://git.savannah.gnu.org/cgit/bash.git/plain/NEWS), 3.0 item gg).

| Shell | `yes \| head -1` | `seq 200000 \| grep -q 1` | `printf 'a\nb\n' \| grep -q a` | twin `seq … \| grep 1 >/dev/null` |
|---|---|---|---|---|
| bash 3.2-5.3, Git Bash 5.2, zsh 5.0.8-5.9, bb 1.35/1.37, mksh R59c, dash 0.5.12-12 (Debian 13), bash `--posix`, zsh sh | **141** | **141** (the `\|\|` branch runs: "not found") | 0 | 0 |
| yash 2.52 | **397** | **397** | 0 | 0 |
| ksh93u+m 2023 (deb12) | **13** | **13** | 0 | 0 |
| ksh93u+m 1.0.10 (deb13) | **1** (stderr: `Connection reset by peer`) | **1** | 0 | 0 |
| dash 0.5.12 (Debian 12), posh 0.14.1 | no `pipefail` | no `pipefail` | no `pipefail` | no `pipefail` |

Two points the CMK-CORE-05 wording does not carry. First, "141" is one spelling: the writer's status can be 13, 1, 397 or, for `curl`, 23. `curl -fsS file:///…/big.txt | grep -q '^1$'` under pipefail returns **23** (`curl: (23) Failure writing output to destination`) on the host and on Alpine curl 8.14.1 (`curl-sigpipe.sh`); the twin that writes a file first returns 0. Second, whether the reader's early exit trips depends on how much the writer has left to say. `race.sh`/`race2.sh` feed `echo "$v" | grep -q line000` 200 times per size:

| Size of the multi-line value | bash 3.2-5.3 (busybox grep, bash:* images) | Debian 12 bash 5.2 + GNU grep 3.8 |
|---|---|---|
| 4-6 KiB | 0 of 200 | 0 of 200 |
| 8 KiB | 0 of 200 | 2 of 200 |
| 10 KiB | 200 of 200 | 150 of 200 |
| 12-256 KiB | 200 of 200 | 197 of 200 |

This refines the CMK-CORE-05 measurement (a 64 KiB multi-line value failed 199 of 200 on bash 5.3.0; a single 16 KiB or 1 MiB line failed 0 of 200): the threshold for a multi-line value is about 8-10 KiB, not the 64 KiB pipe buffer, and it is the producer's size, not its kind, that decides. [cmake-build CMK-CORE-05](../../../rules/cmake-build.md) stays as the CMake-tree sibling, and SH-ERR carries the generalisation (rule SH-ERR-07 with the pointer).

Where it bites in CI: GitHub Actions runs a bare `run:` on Linux as `bash -e {0}` (no pipefail) and `shell: bash` as `bash --noprofile --norc -eo pipefail {0}` ([workflow syntax, shell table](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)). The hazard exists only where `shell: bash` (or an explicit `set -o pipefail`) is present.

BashPitfalls #60.2 makes the same argument and recommends pipefail "not be enabled globally, only enabled for pipelines where it makes sense" ([BashPitfalls](https://mywiki.wooledge.org/BashPitfalls)). The measured alternatives, in order of preference: one `grep -q pattern file` with no pipe; capture the producer once (`out=$(producer)` then `grep -q … <<<"$out"` for small values, a temp file for large ones); drop `-q` and redirect to `/dev/null` so the reader drains; `find … -print -quit` or `sed -n 1p`-style readers that read everything. ShellCheck's SC2337 wiki suggests `grep -q myfile <(find …)`, which is bash-only.

The sh case. `set -o pipefail` direct in a `#!/bin/sh` script is a hard failure on dash 0.5.12 and posh, even with `2>/dev/null || :` (`pf-probe-bad.sh`: dash exit 2, posh exit 1, the other nine "survived"). The subshell probe works on all 11 and on dash 0.5.12-12 (`pf-probe-good.sh`: ON for 9 shells, OFF for dash 0.5.12 and posh). Upstream dash first ships `pipefail` in 0.5.13 (2025-09-21) and Debian backported it in 0.5.12-7 ([shifts](../shell-topic-map/shifts.md) s3), so a version number does not tell you.

### 8. nounset: empty arrays, "$@", and the idiom

`empty-array.sh` (24 cases, bash 3.2/4.0/4.2/4.4/5.0-5.3, Git Bash 5.2, zsh 5.0.8-5.9) and `toplevel-args.sh` (11 POSIX interpreters):

| Case under `set -u` | bash 3.2, 4.0, 4.2 | bash 4.4-5.3, zsh 5.0.8-5.9, Git Bash 5.2 |
|---|---|---|
| `a=(); echo "${a[@]}"`; `for x in "${a[@]}"`; `"${a[*]}"`; `declare -a a; "${a[@]}"`; `local -a a=()`; `printf '[%s]\n' "${a[@]}" x` | **`a[@]: unbound variable`, rc 1** | empty, rc 0 |
| `echo ${a[@]+"${a[@]}"}`, `"${a[@]+"${a[@]}"}"`, `for x in ${a[@]+"${a[@]}"}` | empty, rc 0 | empty, rc 0 |
| `"${#a[@]}"`, `"${a[@]:-}"` | `0` / empty, rc 0 | same |
| `a=(1 2); "${a[@]}"` | `1 2` | `1 2` |
| `a=("x y" z); printf '<%s>' ${a[@]+"${a[@]}"}` | `<x y><z>` | same |
| `a=("")` and `b=("x y" "" z)` through the idiom (`plus-edge.sh`) | `[]` and `[x y][][z]` | same |
| empty `"$@"`, `echo "$@"`, `for x in "$@"`, `"${@:2}"`, `${1+"$@"}`, in a function or at top level | **rc 0 on all** | rc 0 |
| `echo "$undefined"` | rc 1 | rc 1 |

The "$@" half of M-B-06 does not reproduce: `"$@"` with no arguments passes under `-u` on bash 3.2.57, 4.0 ... 5.3, dash, busybox ash, mksh, ksh93u+m, yash and zsh, and fails only on posh 0.14.1 (`toplevel-args.sh`: `@: parameter not set`, exit 1; consistent with the installer audit's row 10). The array half reproduces exactly as stated and is fixed in 4.4.

The idiom `${a[@]+"${a[@]}"}` works on every version down to 3.2 and ShellCheck accepts it without a directive. The count guard `if [ "${#a[@]}" -gt 0 ]; then … "${a[@]}" …; fi` is equally safe (`${#a[@]}` is 0 on 3.2) and reads better when the whole command should be skipped. The fleet's `index/scripts/golden-baseline.sh:148-153` already carries the idiom with a comment naming the floor ("macOS system bash; fixed in bash 4.4"), then uses bare `"${entries[@]}"` at :186 and `"${missing[@]}"` at :291-299 behind `((${#missing[@]}))` guards. Fleet candidates: `setup-grimoire/.github/scripts/install.sh:82` is a false positive (`curl_args` is never empty, stated at :49); `index/scripts/smoke-test.sh:447` (`RESULTS`) is latent, because each of the eight `check_*` functions records a result before `print_summary`. Neither is a live defect.

Wooledge ranks `set -u` "the least bad of the three options" and says ShellCheck is better at catching typos ([BashPitfalls #60.3](https://mywiki.wooledge.org/BashPitfalls)). The measured cost of `-u` is the empty-array row, so the rule carries its floor.

### 9. Sourced libraries and the caller's options

`sourced-caller.sh` sources `sourced-lib.sh` (`set -e; set -u`) from a caller that sets neither, then runs `false` and expands an unset variable. Result on all 11 POSIX interpreters, bash 3.2-5.3 and zsh 5.0.8-5.9: flags before `[]` or `[hB]`, after `[ue]`/`[ehuB]`/`[569Xeu]`; the caller exits 1 at its next `false` and never reaches the "reached after a later failure" line. With `sourced-lib-twin.sh` (no options) the flags are unchanged on every interpreter and the caller continues, exit 0.

The exemplar answer is nvm: it is sourced into the user's shell, so `nvm()` tests `[ "${-#*e}" != "$-" ]`, runs `set +e`, restores `set -e` afterwards and does the same for `-a` and bash `-E` ([nvm@b1b3a0038c06:nvm.sh:3877-3905](https://github.com/nvm-sh/nvm)). `probe-flag.sh` shows the nvm form and the `case $- in *e*)` form agree on all 23 interpreters (11 POSIX, 8 bash, 4 zsh), with `-e` on and off. In zsh the idiomatic scope is `setopt local_options err_return` inside the function: it returns the function's status at the first failure and restores on exit (`zsh-errreturn.zsh`: `err_return_now=off` after the call, 5.0.8-5.9; `||` and `if` conditions are exempt; ERR_RETURN follows [zsh Options](https://zsh.sourceforge.io/Doc/Release/Options.html)).

### 10. The IFS prologue line

`ifs.sh` (bash 3.2-5.3, identical output on all eight):

| With `IFS=$'\n\t'` | default IFS | prologue IFS |
|---|---|---|
| `"${a[*]}"` for `a=(x y)`, `"$*"` for `p q` | `x y`, `p q` | `x`+newline+`y`, `p`+newline+`q` |
| `read -r k v <<<"alpha beta"` | `k=alpha v=beta` | `k=[alpha beta] v=[]` |
| `for w in $str` over "one two<TAB>three" | 3 words | 2 words |

`ifs-posix.sh` on the posix family: dash 0.5.12, yash 2.52 and posh 0.14.1 produce IFS bytes `$`, `\`, `n`, `t` (the `$'` form is not understood), so unquoted expansions split on the letters n and t. busybox ash, mksh, ksh93u+m, bash `--posix` and zsh `--emulate sh` produce newline and tab. Upstream dash adds `$'…'` in 0.5.13 ([shifts](../shell-topic-map/shifts.md) s3); Debian 13's dash 0.5.12-12 still does not (`dash13.sh`).

The fleet mandates the line (quality-bash.md), and 25 of 197 authored files carry it, none in a `#!/bin/sh` file. The "benefit" argument is that unquoted `$(…)` splits only on newlines. That protects only code that is already wrong (unquoted); the quoting rule makes the line unnecessary and the line makes `read` and `"$*"` surprising. Decision (conflict 11): not mandated, and forbidden in `#!/bin/sh` (SC3003 fires).

### 11. shift, $?, and A && B || C

**shift** (`shift.sh`, shellcheck issue 3444). With nothing to shift, `shift` is a special-builtin error:

| Shell | `f() { shift; echo after; }; f` | `shift \|\| true` |
|---|---|---|
| dash 0.5.12 | **exits 2** ("can't shift that many") | **exits 2** |
| ksh93u+m x2 | **exits 1** ("shift: (null): bad number") | **exits 1** |
| bb, mksh, yash, posh, bash (all, posix and default), zsh | prints a diagnostic, continues, rc 0 | continues |
| any, under `set -e` | exits 1 (dash 2) | n/a |

The portable guard is `if [ "$#" -gt 0 ]; then shift; fi` (all shells, with and without `-e`; `c_e_guard`). `[ "$#" -gt 0 ] && shift` also works but leaves a non-zero status when the test fails, which matters for a function's last command. In the fleet 26 bare `shift` lines were reviewed by position: all follow a `$1` read under `-u` or sit in a `while [ $# -gt 0 ]` loop (for example `ocx-website/scripts/bin/oxc.sh:8` after `tool=$1`).

**`$?` after a substitution** (shellcheck issue 3522, opened 2026-08-16). `grep -q nomatch "$f"; echo "$(basename "$f") $?"` prints `0`, because the substitution runs first and replaces `$?`. Reproduced in `dollarq.sh`: bash prints `with substitution : hosts 0` and `[ok] hosts : produced valid output` after a `false`. ShellCheck 0.11.0 is silent on both lines, and the corrected form (capture first) draws SC2319 in the issue's report. Fix: `rc=0; cmd || rc=$?` then use `$rc`, or `if ! cmd; then`. M-B-08's SC2181 is real and fires on `cmd; if [ $? -ne 0 ]`; acme.sh excludes SC2181 in CI as house style ([exemplar-shape](../shell-audit/exemplar-shape.md) l.222).

**`A && B || C`** (BashPitfalls #22): SC2015 fires for `|| rm file` and `|| { echo no; exit 1; }` but not for `|| echo …` or `|| exit 1`, the two most common C commands. `if A; then B; else C; fi` is the fix; there are 0 authored SC2015 or SC2181 hits in the fleet.

### 12. Error model per script kind, with the exact prologue

Confirms conflict 1 by kind, with changes marked.

| Kind | Prologue (exact) | Contract | Notes |
|---|---|---|---|
| **A. bash repo/CI script** | `#!/usr/bin/env bash` then `set -euo pipefail` | `-e` is a net; explicit `\|\| die`/`\|\| return` at fallible calls, `local x; x=$(…)`, no early-exit readers | all three flags exist on bash 3.2. Add `shopt -s inherit_errexit` only where the interpreter is pinned to bash >= 4.4. No `IFS` line (changed). |
| **B. `#!/bin/sh` script** | `#!/bin/sh` then `set -eu` | as A; `pipefail` only as `# shellcheck disable=SC3040` plus `(set -o pipefail) 2>/dev/null && set -o pipefail`, and the code is correct with it off | no `local x=$(…)` (use `x=$(…)` after `local x`); `shift` guarded; no `IFS=$'…'` |
| **C. installer / bootstrap** | `#!/bin/sh` then `set -u` (`set -eu` allowed as an extra net, as www-setup's `install.sh:37` does) | explicit `cmd \|\| err "msg" N` at every fallible call; `main "$@"` as the last line | confirms the map; amended: `-e` is permitted but the code must not be correct only because it fires. Exit-code vocabulary is W2-5's. |
| **D. sourced library / shell-integration snippet** | none: no `set`, no `trap` on shared signals, `return` not `exit` | returns a status; probes the caller's flags instead of setting them | nvm form `[ "${-#*e}" != "$-" ]`; zsh `setopt local_options err_return` |
| **E. verifier / checker script (output is the violation)** | `#!/usr/bin/env bash` then `set -u` | no `-e`; classify each tool's exit (grep 0 match, 1 none, >= 2 error; xargs 123; git 128) | new kind; matches the Swift checks `fold-check.sh:16`, `generated-touch.sh:12`, `k07.sh:108-117`, whose `scan()` fails on `rc -gt 1` |
| **F. CI `run:` block** | none to add on Linux (`bash -e {0}`); `shell: bash` adds `-o pipefail` | SH-CI owns it; this file only warns that `shell: bash` makes early-exit readers hazardous | pointer |

Why not `-e` in C: the three bootstrap exemplars drop it on purpose (rustup `set -u` + `ensure`/`need_cmd`, Homebrew `set -u` + `abort`, git `&&` chains plus chainlint) and the installer audit's SC2310 sample shows `install.sh`, which does use `-eu`, is explicit enough that `-e` never decides anything there. Why not `-e` in E: `grep -q nomatch file` is a normal outcome and aborts a `-e` script.

### 13. Outside POSIX: fish, nu, elvish, PowerShell

One probe per shell (`native-fail.*`), 2026-10-11:

| Shell | A failing external command | Capture/handle |
|---|---|---|
| fish 3.6.0, 4.0.2, 4.7.0, 4.9.3 | continues (`status=1`); no errexit | `set v (cmd)` takes the last command's status |
| nushell 0.105.1, 0.116.0 | **aborts the script, exit 1** (`^false` as a statement) | `do { ^false } \| complete` gives `exit_code=1`; `try { … } catch { … }` catches it |
| elvish 0.21.0 | **aborts with an exception** ("false exited with 1"), exit 2 | `try`/`except` |
| Windows PowerShell 5.1 (host), pwsh 7.4.7, 7.6.6 | **continues under `$ErrorActionPreference = 'Stop'`**; `$LASTEXITCODE` is 1 | 7.4 and 7.6.6 only: `$PSNativeCommandUseErrorActionPreference = $true` makes the native failure terminating; the variable is absent on 5.1 |

The pwsh result matches the Microsoft docs: "When `$PSNativeCommandUseErrorActionPreference` is `$true`, native commands with non-zero exit codes issue errors according to `$ErrorActionPreference`" ([about_Preference_Variables](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_preference_variables)). PS-ERR owns the details. For SH-ERR the point is that "`set -e` equivalent" is shell-specific: only nu and elvish abort by default.

### 14. Fleet defects found (reported, not fixed)

Both reproduced in `fixtures/error-model/` with the function bodies copied and the external command stubbed. The fleet files were not touched.

1. `ocx/test/manual/announce-e2e/scripts/env.sh:244-245`, `_checks_settled`: `! gh pr checks … | grep -qxE 'PENDING|QUEUED|…'`. Under `set -o pipefail`, a failing `gh` makes the pipeline non-zero and `!` turns that into "settled". Reproducer `fleet-checks-settled.sh` (bash 3.2 and 5.3 print `case gh-fails: reported SETTLED (wrong: checks unknown)`; the pending and green cases are right). The same pipeline can also see `grep -q` closing the pipe early when `gh` output is large. Severity low: manual E2E harness.
2. `ocx/test/manual/run-windows-activation.sh:39-46` called as `run_gate "$_winps" … || _rc=$?` (:70) and `:77`: inside `run_gate`, `_exe_win=$(wslpath -w …)` runs with `-e` off. Reproducer `fleet-run-gate.sh`: with `wslpath` failing, the gate still runs with `-OcxBin []` and `_rc=0`; the twin that calls `run_gate` outside a condition stops at the first failed `wslpath`. Severity low: `wslpath` presence is checked at :49.
3. Latent: `index/scripts/golden-baseline.sh:186,291-299` bare `"${arr[@]}"` under `set -u` in a file that uses the guarded idiom at :148, and `index/scripts/smoke-test.sh:447`.
4. `ocx/test/manual/announce-e2e/scripts/run_sequence.sh:111` and `run_machine_lane.sh:33`: `curl -fsS … | grep -q …` in files that set pipefail; `curl` returns 23 when `grep -q` closes the pipe on a large body (§7). Whether the live root files exceed the threshold was not measured (needs network).

## Normative guidance candidates

IDs are working labels for the SH-ERR family. "Run?" says whether the verification was watched going red on a planted violation and green on its twin. Every grep below was run from `fixtures/error-model/tree/` via `verify.sh` and has the required shape: explicit directory operand, one `-e` per alternative, quoted `--include` globs, `xargs -r`, no `$(...)`. The output is the violation; empty output is a pass. When the inner `grep` of a `grep … | xargs -r grep …` check finds nothing, `xargs` exits 123, so read the output, not the exit code.

1. **SH-ERR-01 (MUST). Choose the error model by script kind and write the prologue verbatim from §12.** Bash script: `set -euo pipefail`. `#!/bin/sh`: `set -eu`. Installer: `set -u` plus explicit `|| die`/`|| return` at every fallible call. Sourced library: no options. Verifier script: `set -u`, no `-e`. Rationale: `-e` is off in the contexts that matter (rule 2), so the explicit check is the contract. Verify: reading heuristic (does every fallible call in an installer carry `|| die`?); the library half is rule 8. Run? no for the prologue text, yes for the library/option halves (rules 8, 9).
2. **SH-ERR-02 (MUST). Never rely on `-e` inside a function that is, or may be, called from `if`/`while`/`until`/`!`/`&&`/`||`. A fallible command inside such a function ends in `|| return` (or `|| exit`/`|| die`).** Rationale: on all 11 POSIX interpreters, 8 bash versions, Git Bash and zsh the body runs with `-e` off; POSIX.1-2024 says so. Verify: `shellcheck -o check-set-e-suppressed -f gcc FILE` (SC2310); plant `fixtures/error-model/suppressed.sh` exits 1 (one SC2310 at 4:4), twin `suppressed_twin.sh` exits 0. Run? yes, and `matrix.sh posix pin.sh` shows `still` printed on every shell.
3. **SH-ERR-03 (MUST). Never write `local x=$(cmd)`, `export x=$(cmd)`, `declare x=$(cmd)` or `readonly x=$(cmd)`. Declare, assign, then export or lock.** Rationale: the builtin's status replaces the substitution's on every shell, including under `-e`. Verify: ShellCheck SC2155, default-on (no flag): `masked.sh` exit 1, `masked_twin.sh` exit 0; `local -r x=$(cmd)` additionally needs `-o check-extra-masked-returns` (SC2312, `masks.sh`). Run? yes. Fleet: 0 authored SC2155 hits (re-read of `sc_results.json`, 2026-10-11).
4. **SH-ERR-04 (SHOULD). Enable `check-set-e-suppressed` in `.shellcheckrc` (`enable=check-set-e-suppressed`). Answer each SC2310/SC2311 hit by (a) calling the function outside the condition, or (b) annotating a predicate (one command or one `case`) with `# shellcheck disable=SC2310  # predicate: <what>`; a callee with two or more fallible steps gets `|| return` on each step.** Rationale: 13 of 15 read sites were predicates or explicit-check functions; the check is a reading aid, so it is SHOULD, not a clean-run gate. Floor: ShellCheck 0.11.0. Verify: rule 2's command. Run? yes (plant red, twin green; §5 classification by reading).
5. **SH-ERR-05 (MUST). In bash, call a multi-step function inside `$( )` only as `$(set -e; f)` or after `shopt -s inherit_errexit` (bash >= 4.4, pinned interpreter). Never assume `$( )` aborts on an inner failure in bash 3.2-5.3 default mode or busybox ash.** Rationale: bash default and busybox do not inherit `-e` into command substitution; POSIX, dash, mksh, ksh93u+m, yash, posh and zsh do. Verify: SC2311 with `-o check-set-e-suppressed` — only valid for `set -e` or `set -eu` headers, because it goes silent under `pipefail` (false negative, rule 6). Plant `sc2311.sh` exits 1, `sc2311_twin.sh` exits 0, `cs2.sh` (`set -euo pipefail`) exits 0 and is the documented miss; pair it with `matrix.sh bash inherit.sh`. Run? yes.
6. **SH-ERR-06 (MUST). Do not rely on SC2311 under a `pipefail` prologue.** Rationale: ShellCheck 0.11.0 emits SC2311 for `set -e` and `set -eu` and not for `set -eo pipefail`, `set -e; set -o pipefail`, or `set -euo pipefail` (`cs4.sh`). Verify: reading heuristic plus rule 5's runtime run: scripts that use `x=$(f)` for a function `f` with two or more commands need the `set -e;` or `inherit_errexit` spelling. Run? yes (the false negative itself was reproduced five times).
7. **SH-ERR-07 (MUST). Under `pipefail` (explicit, or `shell: bash` in a workflow), never pipe into an early-exit reader: `grep -q`/`-m`/`--quiet`/`--max-count`, `rg -q`, `head`, `sed q`, `awk … exit`. Use `grep -q pattern file`, capture first, or let the reader drain (`grep pattern >/dev/null`). Sibling: CMK-CORE-05 in cmake-build.md.** Rationale: the writer's status is 141 (bash, zsh, bb, mksh, dash 0.5.12-12), 397 (yash), 13 or 1 (ksh93u+m) or 23 (`curl`), and a multi-line `echo "$v"` of 10 KiB or more trips it 200 of 200 on bash 3.2-5.3. A one-line producer (a hash, a scalar) does not trip. Verify (output is the violation): `grep -rlE --include='*.sh' --include='*.bash' --include='*.yml' --include='*.yaml' --exclude-dir='.git' -e 'pipefail' -e 'shell: bash' . | xargs -r grep -HnE -e '[|] *grep( +-[a-zA-Z]+)* +-[a-zA-Z]*[qm]' -e '[|] *rg( +-[a-zA-Z]+)* +-[a-zA-Z]*[qm]' -e '[|] *head' -e '[|] *grep( +-[-a-zA-Z=0-9]+)* +--quiet' -e '[|] *grep( +-[-a-zA-Z=0-9]+)* +--silent' -e '[|] *grep( +-[-a-zA-Z=0-9]+)* +--max-count'`. `tree/bad` prints 4 lines (3 in `sigpipe-pf.sh`, 1 in `ci.yml`); `tree/good` prints nothing. Judge each hit by the producer's size. Floor: shell-level, any shell with pipefail. SC2337 is not in 0.11.0. Run? yes. Fleet: 138 authored pipefail files; the check hits, among others, `ocx/test/manual/announce-e2e/scripts/run_sequence.sh:111` and `run_machine_lane.sh:33` (`curl … | grep -q`, §14).
8. **SH-ERR-08 (MUST). A sourced file sets no shell options (`set -e`, `set -u`, `set -o …`) and never calls `exit`. If it must change an option, it records and restores it: `case $- in *e*) _had_e=1;; esac`, or the nvm form `[ "${-#*e}" != "$-" ]`.** Rationale: a library's `set -e; set -u` flips the caller on all 11 POSIX interpreters, bash 3.2-5.3 and zsh 5.0.8-5.9; the caller then dies at its next non-zero status. Verify: `grep -rnE --include='*.sh' --exclude-dir='.git' -e '^[[:space:]]*set[[:space:]]+[-+][a-zA-Z]*[eu]' -e '^[[:space:]]*set[[:space:]]+[-+]o[[:space:]]+errexit' -e '^[[:space:]]*set[[:space:]]+[-+]o[[:space:]]+nounset' -e '^[[:space:]]*set[[:space:]]+[-+]o[[:space:]]+pipefail' lib` (replace `lib` with the project's sourced-library directory; a non-existent directory scans nothing, so check it exists). `tree/bad/lib/util.sh` prints 2 lines, `tree/good/lib/util.sh` none. Runtime proof: `matrix.sh posix|bash|zsh sourced-caller.sh sourced-lib.sh` ends exit 1 with flags changed, the twin exits 0. Run? yes.
9. **SH-ERR-09 (MUST). Under `set -u`, an array that can be empty is expanded as `${a[@]+"${a[@]}"}` or behind `[ "${#a[@]}" -gt 0 ]`, unless the script's bash floor is 4.4 or higher. Empty `"$@"` needs no guard on bash/dash/busybox/mksh/ksh93u+m/yash/zsh; guard it only if posh 0.14.1 is a target (`${1+"$@"}`).** Rationale: bash 3.2, 4.0 and 4.2 fail with `a[@]: unbound variable` (rc 1); 4.4 and later pass. Floor: bash 3.2 for the idiom. Verify (static candidates; judge emptiness by reading): `grep -rlE --include='*.sh' --include='*.bash' --exclude-dir='.git' -e 'set -[a-z]*u' -e 'set -o nounset' . | xargs -r grep -HnE -e '[^+]"[$][{][A-Za-z_][A-Za-z_0-9]*\[@\]\}"' -e '^"[$][{][A-Za-z_][A-Za-z_0-9]*\[@\]\}"'`; `tree/bad/nounset-arr.sh` prints 2 lines, `tree/good` none. Runtime: `matrix.sh bash empty-array.sh` shows `arr_plain` rc 1 on 3.2/4.0/4.2 and `arr_plus` rc 0 on all eight. Run? yes. Fleet: about 55 static hits in about 15 authored `-u` files; most arrays are non-empty by construction; `golden-baseline.sh:186,291-299` and `smoke-test.sh:447` are the latent ones.
10. **SH-ERR-10 (MUST). Never `eval "$(cmd)"` or `cd "$(git …)"`: capture to a variable, let `-e` or `|| die` see the status, then `eval "$var"`/`cd "$var"`.** Rationale: the substitution is an argument, so `eval ""` and `cd ""` succeed when the producer fails. Verify: `grep -rnE --include='*.sh' --include='*.bash' --exclude-dir='.git' -e '^eval[[:space:]]+"[$][(]' -e '[[:space:];&]eval[[:space:]]+"[$][(]' -e 'cd[[:space:]]+"[$][(]git ' -e 'cd[[:space:]]+"[$][(]realpath ' -e 'cd[[:space:]]+"[$][(]mktemp ' .`; `tree/bad/eval-cs.sh` prints 2 lines, `tree/good` none. Alternative: `-o check-extra-masked-returns` (SC2312), which has about 25% signal on the fleet. Run? yes. Fleet: 7 authored hits (6 `eval "$(ocx …)"` in `ocx/test/doc_scripts/`, 1 `cd "$(git rev-parse --show-toplevel)"` at `arcana/nox/scripts/release_gate.sh:12`).
11. **SH-ERR-11 (MUST). In `#!/bin/sh` scripts, probe `pipefail` in a subshell before setting it: `(set -o pipefail) 2>/dev/null && set -o pipefail`, preceded by `# shellcheck disable=SC3040`. Never `set -o pipefail 2>/dev/null || :`.** Rationale: the direct form exits dash 0.5.12 with 2 and posh with 1; the probe is ON on 9 of 11 interpreters and OFF on dash 0.5.12 and posh, so code must be correct in both states. Verify: `grep -rlE --include='*.sh' --exclude-dir='.git' -e '^#![ ]*/bin/sh' -e '^#![ ]*/usr/bin/env sh' . | xargs -r grep -HnE -e 'pipefail' | grep -v -e '(set -o pipefail)' -e ':[0-9]*:[[:space:]]*#'`; `tree/bad/sh-pf.sh` prints the `set -o pipefail 2>/dev/null || :` line, the good twin prints nothing. The first grep matches a shebang on any line, so a heredoc containing `#!/bin/sh` is a false population (3 fleet files matched by accident). Runtime: `matrix.sh posix pf-probe-bad.sh` exits 2 on dash and 1 on posh; `pf-probe-good.sh` exits 0 on all. Run? yes.
12. **SH-ERR-12 (MUST NOT). Do not put `IFS=$'\n\t'` (or any `IFS=$'…'`) in a prologue, and never in a `#!/bin/sh` file.** Rationale: no measured benefit; it changes `read -r k v`, `"$*"`, `"${a[*]}"` and unquoted splitting; on dash 0.5.12, yash 2.52 and posh it assigns the bytes `$ \ n t`. Verify: ShellCheck SC3003 for sh (`tree/bad/ifs-sh.sh` exit 1, twin 0); and `grep -rn --include='*.sh' --exclude-dir='.git' -e 'IFS=[$][^({a-zA-Z_]' .` (bad 1 line, good none). Run? yes. Fleet: 25 authored bash files carry it (list: `grep` above over `authored_files.txt`), 0 sh files.
13. **SH-ERR-13 (MUST). Guard `shift`: `if [ "$#" -gt 0 ]; then shift; fi` (or `shift` only after reading `$1` under `-u`). `shift || true` is not a guard.** Rationale: dash exits 2 and ksh93u+m exits 1 even with `|| true`; bash and the rest continue. Verify: reading heuristic with `grep -rnE --include='*.sh' --exclude-dir='.git' -e '^[[:space:]]*shift[[:space:]]*(;|$)' .` to list candidates, then check each has a `$#` test or a preceding `$1` use; behavioural proof `matrix.sh posix shift.sh` (`plain` exits 2/1 on dash/ksh93u+m, `e_guard` exits 0 on all). Run? yes for the behaviour, no for the grep (it cannot tell guarded from unguarded; 26 fleet hits, all guarded by position).
14. **SH-ERR-14 (MUST). Read `$?` before anything else in the command. Write `rc=0; cmd || rc=$?` or `if ! cmd; then`; never `echo "$(f) $?"` or `check "$(f)" $?`.** Rationale: the substitution replaces `$?` first (shellcheck issue 3522); ShellCheck 0.11.0 is silent. Verify: `grep -rnE --include='*.sh' --exclude-dir='.git' -e '[$][(][^)]*[)][^$=]*[$][?]' .`; `tree/bad/dollarq.sh` prints 2 lines, the twin none; the `=` exclusion removes the correct `x=$(cmd) || rc=$?` shape (2 fleet false positives before the exclusion, 0 after). Run? yes. Related: SC2181 (default) for `cmd; if [ $? -ne 0 ]` (`sc2181.sh` exit 1, twin 0).
15. **SH-ERR-15 (SHOULD). Use `if A; then B; else C; fi`, not `A && B || C`, whenever B can fail.** Rationale: C runs when A is true and B fails. Verify: SC2015, which misses `|| echo …` and `|| exit …` (`sc2015c.sh`, `d.sh` exit 1; `e.sh`, `g.sh` exit 0, so a miss); reading heuristic for those two. Run? yes (with the stated gap).
16. **SH-ERR-16 (MUST). A verifier script whose output is the violation uses `set -u`, not `-e`, and judges each tool by exit status: grep 1 = none, >= 2 = error; xargs 123; git 128.** Rationale: `-e` aborts on grep's "no match"; the Swift checks and CMK-CORE-05 already work this way. Verify: reading heuristic (`scan()`-style wrapper, e.g. `k07.sh:108-117`). Run? no (reading only).
17. **SH-ERR-17 (MUST). Do not use `-e` to catch a failing `(( ))` or `[[ ]]` on a script whose floor is bash 3.2/4.0; they do not abort before 4.1 (measured: 3.2 and 4.0 continue, 4.2 aborts). `(( i++ ))` from 0 returns 1 and aborts from 4.2: write `i=$((i + 1))`.** Verify: `matrix.sh bash pin.sh` rows `arith` and `dbracket`. Run? yes. (Pinned here; M-B-03 owns the full row.)
18. **SH-ERR-18 (SHOULD). When a script targets bash 4.4+ only (pinned CI image or container), add `shopt -s inherit_errexit` after the prologue.** Rationale: makes `$( )` follow POSIX; does not fix `local x=$(…)`. Verify: reading heuristic; behavioural proof `matrix.sh bash inherit.sh`. Run? yes.
19. **SH-ERR-19 (MUST). Do not assert that two shells agree on "-e fires" from one run.** The cases that differ are listed in §1: busybox and default bash for `$( )`; zsh for `! f`; posh for the last item of an AND-OR list; bash 3.2 for `( false )`. A rule that names a behaviour must name the shells it was measured on. Verify: reading heuristic. Run? no.

## Verification runs

All run 2026-10-11 from `/home/mherwig/.cache/research-lang/shell-tools/fixtures/error-model/`. "Red" is the planted violation, "green" its twin. Abbreviations: `SC` = `run.sh shellcheck --norc` (0.11.0), `OPT` = `-o check-set-e-suppressed,check-extra-masked-returns`, `M` = `/home/mherwig/.cache/research-lang/shell-tools/matrix.sh`.

| # | Fixture (red / green) | Command | Red | Green | Key output |
|---|---|---|---|---|---|
| V1 | `suppressed.sh` / `suppressed_twin.sh` | `SC OPT -f gcc FILE` | exit 1 | exit 0 | `suppressed.sh:4:4: note: This function is invoked in an 'if' condition so set -e will be disabled. … [SC2310]` |
| V1b | same | `M posix pin.sh`, case `fn_if` | `still after >>R`, rc 0 on 11 of 11 | `fn_plain`: rc 1, nothing printed | |
| V2 | `masked.sh` / `masked_twin.sh` | `SC -f gcc FILE` (default set) | exit 1 | exit 0 | `masked.sh:4:9: warning: Declare and assign separately to avoid masking return values. [SC2155]` |
| V3 | `masks.sh` / `masks_twin.sh` | `SC OPT -f gcc FILE` | exit 1: SC2155 x4, SC2312 x5 (`local -r`, `cd`, `eval`, `x=`, `[ ]`) | exit 0 | `masks.sh:5:16: note: Consider invoking this command separately … [SC2312]` |
| V4 | `sc2311.sh` / `sc2311_twin.sh` / `sc2311_sh.sh` | `SC -o check-set-e-suppressed -f gcc FILE` | exit 1 | exit 0 / exit 0 | `sc2311.sh:8:11: note: Bash implicitly disabled set -e … [SC2311]` |
| V4b | `cs4.sh` x5 headers | same | `set -e`, `set -eu`, `set -u; set -e`: SC2311 | `set -eo pipefail`, `set -e; set -o pipefail`, `set -euo pipefail`: **no output (false negative, exit 0)** | counts 1,1,1 and 0,0,0 |
| V5 | `sc2181.sh` / `sc2181_twin.sh` | `SC -f gcc FILE` | exit 1, SC2181 | exit 0 | |
| V6 | `sc2015c.sh`, `d.sh`, `f.sh` / `sc2015_twin.sh` | `SC -f gcc FILE` | exit 1, SC2015 | exit 0 | `sc2015e.sh` (`\|\| echo`), `sc2015g.sh` (`\|\| exit 1`): **exit 0, not red** |
| V7 | `dollarq.sh` / `dollarq_twin.sh` | `SC -f gcc FILE` | **exit 0, not red** (ShellCheck miss) | exit 0 | `bash dollarq.sh` prints `with substitution : hosts 0` and `[ok] hosts : produced valid output` after a `false` |
| V8 | `sc2337.sh` | `SC -f gcc FILE` | **exit 0, not red**: SC2337 is not in 0.11.0 | | wiki page exists, checker silent |
| V9 | `tree/bad/ifs-sh.sh` / `tree/good/ifs-sh.sh` | `SC -f gcc FILE` | exit 1, `SC3003` | exit 0 | `ifs-sh.sh:3:5: warning: In POSIX sh, $'..' is undefined. [SC3003]` |
| V10 | `tree/bad/sh-pf.sh` / `tree/good/sh-pf.sh` | `SC -f gcc FILE` | exit 1, SC3040 | exit 0 with the `disable=SC3040` directive | without the directive the good probe is also SC3040 |
| V11 | `tree/{bad,good}` | `bash verify.sh` (all seven greps, text in rules 7-12, 14) | EVAL-CS 2 lines; SIGPIPE 4; NOUNSET-ARR 2; SH-PIPEFAIL 1; IFS-LINE 1; DOLLARQ 2; LIB-SETS 2 (each rc 0) | every check 0 lines (rc 1, or 123 where `xargs` wraps an empty inner grep) | full transcript `verify_out.txt` |
| V12 | `sigpipe.sh` | `M posix\|bash\|zsh\|win sigpipe.sh` | `yes\|head -1 rc=141` (bash, zsh, bb, mksh, dash deb13, Git Bash), 397 yash, 13/1 ksh93u+m; `seq 200k\|grep -q 1 rc=141`; `\|\|` branch taken | twins `seq\|grep 1 >/dev/null rc=0`, `grep -q file rc=0`; `printf small\|grep -q rc=0` | dash 0.5.12 (Debian 12) and posh: `pipefail: UNSUPPORTED` |
| V13 | `race.sh`, `race2.sh` | `M bash race.sh`; GNU grep via `shellzoo:deb12` | 10 KiB and up: 200 of 200 nonzero (all eight bash) | 4-6 KiB: 0 of 200 | Debian 12 + GNU grep 3.8: 8 KiB 2/200, 10 KiB 150/200, 12 KiB 197/200, 16 KiB 196/200 |
| V14 | `curl-sigpipe.sh` | `bash curl-sigpipe.sh`; Alpine curl 8.14.1 | `curl 300k file \| grep -q  rc=23` | `TWIN file then grep -q rc=0` | `curl: (23) Failure writing output to destination` |
| V15 | `pf-probe-bad.sh` / `pf-probe-good.sh` | `M posix FILE` | dash 0.5.12: exit 2; posh: exit 1 | all 11: exit 0 (`pipefail ON` x9, `OFF` x2) | |
| V16 | `empty-array.sh` | `M bash empty-array.sh` | `arr_plain`, `arr_for`, `arr_star`, `arr_declare`, `arr_local`, `arr_cmd_arg`: rc 1 on 3.2, 4.0, 4.2 | `arr_plus*`, `arr_count`, `arr_default`: rc 0 on all eight | `empty-array.sh: line 7: a[@]: unbound variable` |
| V17 | `toplevel-args.sh` | `M posix\|bash toplevel-args.sh` | posh 0.14.1: `@: parameter not set`, exit 1 | the other 18 interpreters: `ok`, exit 0 | |
| V18 | `sourced-caller.sh` + `sourced-lib.sh` / `sourced-lib-twin.sh` | `M posix\|bash\|zsh sourced-caller.sh LIB` | all 23: `after source: flags=[…e…u…]`, caller exit 1 | twin: flags unchanged, exit 0 | |
| V19 | `shift.sh` | `M posix\|bash\|zsh shift.sh` | `plain` and `or_true`: dash rc 2, ksh93u+m x2 rc 1; `e_plain`: rc 1 (dash 2) | `guarded`, `e_guard`: rc 0 everywhere | `shift.sh: 3: shift: can't shift that many` |
| V20 | `inherit.sh`, `inherit_set_posix.sh` | `M bash FILE` | `default` `[hi]`; `inherit_local` reaches the next line on 4.4-5.3 | `inherit`/`inherit_asg`/`fn_in_cs_inh` abort on 4.4-5.3; `set_e_inside` aborts on 3.2-5.3; `set -o posix` prints `[]` | 3.2/4.0/4.2: `shopt: inherit_errexit: invalid shell option name` |
| V21 | `fleet-checks-settled.sh` | `M bash FILE` | bash 3.2, 5.3: `case gh-fails: reported SETTLED (wrong: checks unknown)` | `pending` and `green` cases right | bash 4.0 block printed nothing in my run; not rechecked |
| V22 | `fleet-run-gate.sh` | `M bash FILE` | `_rc=0 (0 = gate reported pass although wslpath failed twice)` | twin call: stops at the first `wslpath` failure, exit 1 | |
| V23 | `ifs.sh`, `ifs-posix.sh` | `M bash ifs.sh`; `M posix ifs-posix.sh` | `read-two-fields k=[alpha beta] v=[]`; dash/yash/posh IFS bytes `$ \ n t` | default IFS: `k=[alpha] v=[beta]`; others `\n \t` | all eight bash versions produce one identical output (md5 `c760b6`) |
| V24 | `pin.sh` / `pin_win.out` | `M posix\|bash\|zsh\|win pin.sh` | see §1 | | Git Bash 5.2 identical to bash 5.x on all 22 rows |
| V25 | `native-fail.{fish,nu,elv,ps1}` | `M fish\|nu\|elvish\|pwsh\|win FILE` | nu exit 1 (no `reached` line), elvish exit 2, pwsh: `reached after native failure under EAP=Stop` | pwsh 7.4/7.6.6: `stopped with PSNativeCommandUseErrorActionPreference=true` | |
| V26 | `zsh-errreturn.zsh`, `zbang.sh`, `zbang2.sh` | `M zsh FILE` | `after f: status=1 err_return_now=off` on 5.0.8-5.9; `! t` exits 1 on 5.3.1-5.9, `! true` exits on 5.0.8 | | |

Did not go red, reported as such: V6 for `A && B || echo`/`|| exit` (SC2015 miss), V7 (no ShellCheck code for issue 3522; the grep in rule 14 is the only gate), V8 (SC2337 unreleased), V4b (SC2311 silent under pipefail). V21 note: the `bash 4.0` block of the matrix produced no output in that single run, and I did not re-run it; the 3.2 and 5.3 blocks are the evidence.

## Exemplar evidence

Corpus: `/home/mherwig/.cache/research-lang/exemplars/shell/<owner>__<repo>`, SHAs in `shell-audit/scratch/exemplar-shas.md`. Population note from the audit: errexit is in 835 of 5,072 files (16%), nounset 502 (10%), pipefail 425 (8%), all three 231; bash product code 68% errexit, bash tests 18%, `#!/bin/sh` product 22%, sh tests 7% ([exemplar-shape](../shell-audit/exemplar-shape.md) l.199-209).

| Candidate | Satisfy | Violate or contradict |
|---|---|---|
| SH-ERR-01 explicit model for bootstrap | rustup-init.sh `set -u` at [rust-lang/rustup@61271d00a979:rustup-init.sh:29](https://github.com/rust-lang/rustup) with `need_cmd` (:628-633), `ensure` (:649-654), `ignore` (:657-659), `assert_nz` (:639-644); Homebrew/install@8ab1549dfa11:install.sh `set -u` (:7), `abort` (:9-12), `execute` (:346-351), EXIT traps (:331, :891, :1088); git `t/` uses `&&` chains and `--chain-lint` (git@6de20f6092dc:t/README:195-203, :617, :691, :752; `t/chainlint.pl:1-12`); 15 of 1,327 git test files use `set -e` | counter-examples upstream installers split: docker/docker-install@2b32480025b2:install.sh:2 `set -e`; denoland/deno_install@41d4676f8677:install.sh:5 `set -e`; k3s-io/k3s@82a6ddcd820b:install.sh:2-3 `set -e`, `set -o noglob`; dotnet/install-scripts@e5cf1dd2d154:src/dotnet-install.sh:12 `set -o pipefail` |
| SH-ERR-01/16 installer and checker kinds | fleet `www-setup/src/install.sh:37` `set -eu` with `err()` at :147-150 and exit taxonomy in the header; Swift checks `grimoire-lore/rules/swift-quality/checks/fold-check.sh:16`, `generated-touch.sh:12` (`set -u` only), `k07.sh:108-117` (`scan()` classes `rc -gt 1`) | none found |
| SH-ERR-02 predicate/explicit callee | `www-setup/src/install.sh:128-133,159-161,338-358` (predicates), `:511-520` (explicit `\|\| return 1`) | `ocx/test/manual/announce-e2e/scripts/env.sh:244` and `run-windows-activation.sh:39-46` (§14) |
| SH-ERR-03 split declarations | fleet authored: `local x=$(…)` 0 and SC2155 0 ([fleet] Axis 4); `setup-grimoire/.github/scripts/install.sh` declares then assigns | exemplar corpus: 527 `local x=$(…)` lines ([exemplar-shape](../shell-audit/exemplar-shape.md) l.199); installer audit: DOTNET:141,175 |
| SH-ERR-07 no early-exit reader | `setup-grimoire/.github/scripts/install.sh:106` uses `-print -quit` "not `| head -1`" | exemplars with pipefail: 67 files, 10 contain a reader, 20 sites: `direnv/script/prepare-release.sh:38,68` (`set -euo pipefail` at :3), `atuin/scripts/release.sh:296,472` (:8), `dotnet-install.sh:1210` (:12), mise scripts, `actions/runner-images` `ubuntu-slim/test.sh:112-115`; fleet `run_sequence.sh:111`, `run_machine_lane.sh:33`; `ocx/test/doc_scripts/user-guide__attestations-unsigned.sh:34-50` (`echo "$report" \| grep -q`, small bodies) |
| SH-ERR-08 sourced library | nvm.sh `nvm()` probes and restores (b1b3a0038c06:nvm.sh:3877-3905) | `sourced-lib.sh` plant only; no exemplar sets options in a sourced file |
| SH-ERR-09 empty-array idiom | fleet `index/scripts/golden-baseline.sh:148-153` (comment naming bash 3.2 and 4.4); SG installer avoids it (installer audit l.418) | `golden-baseline.sh:186,291-299`; `smoke-test.sh:447`; ~55 static hits in ~15 authored files |
| SH-ERR-11 probe pipefail in sh | fleet sh scripts: 0 use pipefail in real `#!/bin/sh` files (31 per audit); www-setup `install.sh` `set -eu` only | posh rejects `"$@"` under `-u` (installer audit row 10, reproduced here) |
| SH-ERR-12 no IFS line | rustup, Homebrew, git, nvm: no `IFS=$'\n\t'` prologue | 25 of 197 authored fleet files carry it (e.g. `setup-grimoire/.github/scripts/install.sh:10`, `index/scripts/smoke-test.sh`, ocx test/manual) |
| SH-ERR-17 `(( ))` under `-e` | Google style guide warns `set -e; i=0; (( i++ ))` exits ([Google](https://google.github.io/styleguide/shellguide.html), Arithmetic section) and `poll_until` in `env.sh:108` appends `true` to dodge it | |

## AI-agent angle

What an LLM characteristically gets wrong in this area, with the smallest mechanical check.

| Mistake | Why it fails | Check |
|---|---|---|
| Opens every script, including `#!/bin/sh`, with `set -euo pipefail` | dash 0.5.12 (Debian 12, Ubuntu 24.04) exits 2 ("Illegal option -o pipefail"); posh exits 1; works on Debian 13 dash and Alpine ash | SC3040 under `-s sh` (`tree/bad/sh-pf.sh`, red); SH-ERR-11 grep |
| Treats `set -euo pipefail` as the whole error model; no `|| die` | `-e` is off inside condition-called functions, `$( )` in default bash, `local x=$(…)` | SC2310 and SC2155; reading heuristic for installers |
| `local x=$(cmd)` as the default idiom | masks the status on every shell | SC2155 (default-on) |
| `cmd | grep -q` under pipefail, `echo "$var" | grep -q` | 141/397/13/23 on large producers; passes tests with small data | SH-ERR-07 grep |
| `"${arr[@]}"` under `set -u` with bash 4.4+ habits in a macOS-bound script | `a[@]: unbound variable` on /bin/bash 3.2.57 | SH-ERR-09 grep; `matrix.sh bash` with `bash:3.2` |
| `IFS=$'\n\t'` copied from the "unofficial strict mode" article | breaks `read`/`"$*"`; wrong bytes on dash 0.5.12, yash, posh | SC3003, SH-ERR-12 grep |
| `shift || true` and `: ${1:?}` | `shift` aborts dash/ksh93u+m regardless | `matrix.sh posix shift.sh` |
| `eval "$(tool init bash)"` as the activation snippet | masks `tool`'s failure | SH-ERR-10 grep |
| `cmd; if [ $? -ne 0 ]` or `echo "$(f) $?"` | SC2181; the substitution clobbers `$?` | SC2181; SH-ERR-14 grep |
| Library file starts with `set -euo pipefail` because "every script should" | flips the sourcing shell | SH-ERR-08 grep |
| Assumes `trap ... ERR` or `set -E` replaces error handling; assumes `$( )` aborts on the first failing line | not reliable; bash default does not inherit `-e` | rule 5; W2-5 owns traps |
| `[ -f x ] && cp a b || echo no` as if/else | `cp` failure prints "no"; SC2015 stays silent for `|| echo` | reading heuristic |
| Writes `$ErrorActionPreference = 'Stop'` in a PowerShell installer and expects native `curl.exe`/`git` failures to throw | continues on 5.1 and on 7.x unless `$PSNativeCommandUseErrorActionPreference = $true` (7.3+; absent on 5.1) | `matrix.sh pwsh native-fail.ps1`; PS-ERR |
| Expects fish to stop at a failing command, or nushell to continue | fish continues, nu and elvish abort | §13 |
| Brings GNU-only flags (`grep -P`, `sed -i`, `readlink -f`), `echo -e`, `which`, bash 4+ features into `#!/bin/sh` or macOS scripts | not part of this file; owned by SH-DIAL, SH-EXP, SH-USER | ShellCheck `-s sh` SC3xxx, `deprecate-which`; the 3.2 denylist in SH-DIAL |

## Contested / evolving

- **Whether to use `set -e` at all.** Wooledge: "don't use set -e" (GreyCat), "go ahead but beware" (rking), "handle errors properly" (geirha) ([BashFAQ/105](https://mywiki.wooledge.org/BashFAQ/105)); Oils calls the disabled-errexit quirk a "design mistake" that "we can't fix this decades-old bug in shell" and adds `strict_errexit` to YSH ([oils error-handling](https://github.com/oils-for-unix/oils/blob/master/doc/error-handling.md)); Google, agent rule packs and GHA make it the default. As of 2026-10-11 the fleet and three of five long-lived exemplars split exactly along script kind, which is the position taken here. Trend: nothing in 2026 changes the semantics; POSIX.1-2024 documents them without change.
- **pipefail is now standard**, not a bashism: POSIX.1-2024 requires it, upstream dash ships it from 0.5.13 (2025-09-21), Debian backported it to 0.5.12-7, and `ubuntu-latest` moves to Ubuntu 26.04 (dash 0.5.12-12ubuntu3) between 2026-10-19 and 2026-11-19 ([shifts](../shell-topic-map/shifts.md) s3, s13). The sh-script probe is therefore needed for another year or so, for Debian 12 and Ubuntu 24.04 images. BashPitfalls #60.2 still advises against global pipefail; the measured sizes here show why.
- **SC2337** exists as a wiki page but is not in ShellCheck 0.11.0; once it ships, rule 7's grep becomes a backup. SC2311 under pipefail and SC2015's `|| echo` gap are open ShellCheck behaviours (not filed upstream by me; unverified whether fixed on master).
- **ShellCheck issues 3444 (2026-04-10) and 3522 (2026-08-16)** are both open feature requests as of 2026-10-11: a `shift`-without-arguments warning and a `$?`-clobbered-by-substitution warning.
- **Empty `"$@"` under `-u`** was a historic hazard; on bash 3.2.57 it no longer reproduces, so guidance that still tells authors to write `${@+"$@"}` for bash is outdated; only posh needs it.
- **Bash 5.3 NEWS** keeps `inherit_errexit` as is; `local -r x=$(…)` remains unfixed.

## Sources

| URL | What | Date or era | Why worth reading |
|---|---|---|---|
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html | POSIX.1-2024 XCU 2, Shell Command Language, incl. `set -e`, `set -o pipefail`, application usage on functions | Issue 8, 2024 | primary: errexit exceptions, command-substitution subshell, function warning (read 2026-10-11) |
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/set.html | POSIX `set` utility page | 2024 | primary; short stub that points to chapter 2 |
| https://git.savannah.gnu.org/cgit/bash.git/plain/NEWS | bash NEWS 3.0-5.3 | to bash 5.3 | primary: pipefail (3.0), `[[ ]]`/`(( ))` under -e (4.1), `inherit_errexit` (4.4) |
| https://zsh.sourceforge.io/Doc/Release/Options.html | zsh manual, Options: ERR_EXIT, ERR_RETURN | 5.9 | primary: zsh errexit and per-function scoping |
| https://man.archlinux.org/man/dash.1.en | dash(1) | 0.5.13-era | primary: dash errexit definition, pipefail |
| https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_preference_variables | about_Preference_Variables | PowerShell 7.6 | primary: `$PSNativeCommandUseErrorActionPreference` |
| https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax | GitHub Actions workflow syntax, `defaults.run.shell` table | read 2026-10-11 | primary: `bash -e {0}` vs `bash --noprofile --norc -eo pipefail {0}` |
| https://github.com/koalaman/shellcheck/wiki/SC2310 (and SC2311, SC2312, SC2155, SC2181, SC2015, SC2337, Optional) | ShellCheck wiki pages, read from the local clone `koalaman__shellcheck.wiki@0b4dfe7bf9dc` (2026-10-09) | 0.11.0 era | primary: the rules, their examples, the optional-check list |
| https://github.com/koalaman/shellcheck/issues/3444 | issue: no warning when `shift` can fail under set -e | opened 2026-04-10 | primary: the shift hazard, still open |
| https://github.com/koalaman/shellcheck/issues/3522 | issue: no warning when a command substitution clobbers `$?` | opened 2026-08-16 | primary: reproduced here, still open |
| https://mywiki.wooledge.org/BashFAQ/105 | BashFAQ/105, why set -e does not do what you expect | last edited 2021-03-11 | the canonical argued case, exercises and the three recommendations |
| https://mywiki.wooledge.org/BashPitfalls | BashPitfalls #22, #60.1-60.3 | current | errexit, pipefail+SIGPIPE, nounset stances |
| https://github.com/oils-for-unix/oils/blob/master/doc/error-handling.md | Oils: YSH fixes shell's errexit | current | the disabled-errexit quirk, strict_errexit, sigpipe_status_ok |
| https://google.github.io/styleguide/shellguide.html | Google Shell Style Guide | current | the "default on" side, `(( i++ ))` warning |
| local: /home/mherwig/dev/grimoire-lore/.agents/worktrees/shell/rules/cmake-build.md (CMK-CORE-05) | the existing SIGPIPE rule | 2026-09-26 measurements | sibling pointer and the 64 KiB data point |
| local: shell-audit/fleet-shell-shape.md (Axis 4), exemplar-shape.md, installers.md | the fleet and exemplar censuses | 2026-10-10 | counts, citations and the posh `"$@"` finding |
| local: shell-topic-map/shifts.md (s3, s13) | dash 0.5.13, Debian backport, Ubuntu 26.04 | 2026-10-10 | pipefail availability by distro |
| https://github.com/nvm-sh/nvm (b1b3a0038c06), https://github.com/rust-lang/rustup (61271d00a979), https://github.com/Homebrew/install (8ab1549dfa11), https://github.com/git/git (6de20f6092dc) | exemplar scripts and docs read from the corpus | SHAs as listed | the sourced-library, explicit-check and chain-lint models |
| https://github.com/direnv/direnv, https://github.com/atuinsh/atuin, https://github.com/dotnet/install-scripts, https://github.com/actions/runner-images | exemplars with pipefail plus an early-exit reader | SHAs in `exemplar-shas.md` | the SIGPIPE hazard in the wild |

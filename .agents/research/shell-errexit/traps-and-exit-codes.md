---
title: "Shell traps, cleanup, signals and exit-status vocabulary (SH-ERR)"
topic: shell-errexit / traps-and-exit-codes
agent: traps-and-exit-codes
model: sonnet
date_researched: 2026-10-11
sources_count: 23
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/traps-and-exit-codes/ (probes, lint/bad, lint/good, out/)
scope: >
  POSIX sh, bash, and the shells a script realistically meets (dash 0.5.12,
  busybox ash 1.35/1.37, mksh R59c, ksh93u+m 1.0.4/1.0.10, yash 2.52/2.61,
  posh 0.14.1, bash 3.2-5.3, zsh 5.0.8-5.9 incl. emulate sh, Git Bash 5.2).
  Not covered: fish, nushell, elvish, PowerShell trap analogues.
---

# Shell traps, cleanup, signals and exit-status vocabulary

In this document F = `/home/mherwig/.cache/research-lang/shell-tools/fixtures/traps-and-exit-codes`.
All claims tagged "measured" come from `F/out/*.txt`, produced by the probes in F.

## Table of contents

1. Summary
2. Findings
   1. Signal-killed `$?` is not portable (128+N caveat)
   2. Trap spellings and which conditions exist
   3. EXIT trap on signal death
   4. The returning-handler trap (EXIT + signals bound together)
   5. Canonical cleanup trap for sh and bash
   6. Re-raise: dying of the signal, and its pitfalls
   7. Bare `exit` in a trap and `$?` inside EXIT traps
   8. `die()` and the subshell trap
   9. Foreground-child trap deferral and CI cancel
   10. ERR traps
   11. Exit-status vocabulary
   12. stderr/stdout contract
   13. Tooling: what shellcheck catches and does not
3. Normative guidance candidates
4. Verification runs
5. Exemplar evidence
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary

- Bind `EXIT` to ONE status-preserving handler (`rc=$?; trap - EXIT; cleanup; exit "$rc"`) and install it BEFORE creating the resource it cleans.
- Never bind one returning cleanup function to `EXIT INT TERM HUP`: after the signal the script keeps running and exits 0 in every shell measured (7 fleet files do this; errexit masks it).
- Bind INT, TERM, HUP to their OWN handlers that end the shell: `exit 130/143/129` (simple) or re-raise with `kill -s NAME "$$"` from a FUNCTION (CLI entry points).
- Never compare `$?` to a literal 129/130/137/141/143. Signal-killed child status is 128+N in dash/ash/mksh/posh/bash/zsh but 256+N in ksh93u+m and 384+N in yash. Test `-gt 128` and decode with `kill -l "$rc"`.
- Always write `exit "$rc"` explicitly inside traps. Bare `exit` returns the pre-trap `$?` only on POSIX-2024-conformant shells (dash, ash, mksh, ksh93 1.0.10, bash 5.3, yash 2.61); bash <=5.2, yash 2.52, ksh93 1.0.4, posh and zsh return the last trap command's status.
- mksh runs an EXIT trap on INT/TERM but then exits 0; a `$code`-from-`$?` handler such as k3s's `trap cleanup INT EXIT` reports SUCCESS on SIGTERM.
- Do not rely on EXIT firing on signals: it does NOT in dash, busybox ash, yash, posh and zsh (INT/TERM). Name the signals explicitly.
- Use uppercase names without `SIG` (`INT`, not `SIGINT`/`int`): dash and posh reject `SIGINT`; posh and zsh-sh reject lowercase. `trap ... ERR` is rejected by dash, yash, posh (only a warning, so the script runs untrapped).
- `die()` writes to stderr, takes a status operand, ends `exit "$rc"`, and is called only in the main shell in statement position: `v=$(f) || die "msg"`. `exit` inside `$( )`, `( )` or a pipeline stage leaves only the subshell, so the script continues with rc 0.
- Never write `local v=$(cmd)` or `export v=$(cmd)` (SC2155): `local` masks cmd's status.
- Exit-status vocabulary is by kind: CLIs written in shell mirror the Rust cli-contract table (0, 1, 64, 65, 69, 74, 75, 77-82); installers keep the 0-7 table; gate/check scripts use 0/1 plus sysexits 64/65/66. Every script states its table in a `# Exit:` header.
- Never assign 123-128 or >=200 as script exit codes: xargs owns 123-127, timeout owns 124/125/126/127/137, shells own 126/127/128+N.
- No ERR traps in `#!/bin/sh` (unsupported by dash/yash/posh). In bash they are for diagnostics only, with `set -E`, never for cleanup or control flow; ERR skips `if`, `||`, `&&`, `!`, `local x=$(false)` and (3.2) `( false )`.
- Re-raise inline in a trap string (`trap 'kill -s TERM "$$"' TERM`) silently exits 0 on ksh93u+m 1.0.10; re-raise from a function works everywhere.
- Keep `trap ... EXIT` installation out of functions: zsh (native) fires a function-scoped EXIT trap at function return, every other shell at shell exit.
- Do not use `$(trap -p EXIT)` to chain traps portably: it sees the parent trap only in bash, yash and ksh93; empty in dash, mksh, posh, zsh.
- GitHub Actions cancel sends SIGINT, SIGTERM after 7500 ms, SIGKILL after a further 2500 ms. Traps must finish cleanup in under ~2.5 s and must end the shell.
- busybox `timeout` returns 143 on expiry, GNU and uutils return 124. Do not hard-code 124 in portable scripts.
- No shellcheck check exists for the returning handler, die-in-subshell, or literal 143 compares: these need a grep gate plus the behavioral `check-signal.py` probe (both built and verified red/green here).

## Findings

### 1. Signal-killed `$?` is not portable (128+N caveat)

POSIX XCU 2.8.2 (POSIX.1-2024): not found = 127, found but not executable = 126, a command terminated by a signal has status greater than 128 that is implementation-defined and may exceed 255. [S1] `kill -l exit_status` decodes it. [S2]

Measured (F/out/signal-status.*.txt, F/out/signal-matrix.txt, F/out/yash261.txt) for a child killed by TERM / PIPE / KILL:

| shell | TERM | PIPE | KILL | decode `kill -l "$rc"` |
|---|---|---|---|---|
| dash 0.5.12, busybox ash, mksh R59c, posh, bash 3.2-5.3, zsh 5.0.8-5.9 | 143 | 141 | 137 | yes (not posh) |
| ksh93u+m 1.0.4, 1.0.10 | 271 | 269 | 265 | yes (256+N) |
| yash 2.52, 2.61 | 399 | 397 | 393 | yes (384+N) |

Incorrect:

```sh
cmd; rc=$?
[ "$rc" -eq 143 ] && echo terminated      # false on ksh93u+m (271) and yash (399)
```

Correct:

```sh
cmd; rc=$?
if [ "$rc" -gt 128 ]; then
  sig=$(kill -l "$rc") || sig=unknown      # TERM / INT / ...
  echo "killed by $sig" >&2
fi
```

Caveat text for the rule: "A status above 128 means 'terminated by a signal' only in the shell that reported it. It is 128+N in most shells, 256+N in ksh93u+m, 384+N in yash. Test `-gt 128`; decode with `kill -l "$rc"`; never compare with a literal."

Reserved-code consequence: a script must not pick its own code in 129-159 except as a deliberate signal status inside a trap (see 6).

At the END of a script whose last command was signal-killed (F/out/sig-propagate.txt): ksh93u+m dies by that signal (with an explicit `exit "$?"` it exits 15); yash 2.61 propagates the signal (yash NEWS 2.59 [S5]) while yash 2.52 exits 143; every other shell exits 143. A parent that wants "killed by signal" must therefore accept both `-N` and `128+N`.

### 2. Trap spellings and which conditions exist

Measured in F/out/trap-spellings.posix.txt on all interpreters:

| spelling | accepted by |
|---|---|
| `EXIT`, `0`, `INT`, `2`, `TERM`, `HUP`, `1`, `QUIT` | all |
| `SIGINT`, `SIGTERM` | all except dash and posh (rejected) |
| lowercase `int` | dash yes; posh and zsh (emulate sh) reject |
| `ERR` | ash, mksh, ksh93, bash, zsh yes; dash, yash, posh reject |
| `DEBUG` | ksh93, bash, zsh only |
| `RETURN` | bash only |
| `ZERR` | zsh only |
| `KILL`, `STOP` | rejected only by yash 2.52 |

A rejected name only prints a warning; the script continues WITHOUT the trap, so a typo is a silent logic hole. POSIX specifies `trap n [cond...]` resets and the portable condition set (EXIT, numbers, names without SIG). [S1]

Incorrect: `trap 'rm -rf "$t"' SIGINT SIGTERM` (dash, posh: ignored).
Correct: `trap 'exit 130' INT; trap 'exit 143' TERM`.

### 3. EXIT trap on signal death

POSIX says the EXIT condition "may occur" on abnormal termination by signal; it is not guaranteed. [S1] Measured (F/out/trap-matrix.*.txt, form `exit-only` with EXIT bound only):

| shell | INT/TERM/HUP runs EXIT trap? | resulting status |
|---|---|---|
| bash 3.2-5.3 | yes | 130 / 143 / 129 |
| ksh93u+m 1.0.10 | yes | correct |
| ksh93u+m 1.0.4 | yes | 2 / 15 / 1 (bare signal number; fixed per ksh NEWS 2023-05-28 [S6]) |
| dash, busybox ash, yash, posh | NO | killed by signal |
| zsh INT/TERM | NO | killed by signal |
| zsh HUP | yes | exits 1 |
| mksh INT/TERM | yes | exits 0 (!) |
| mksh HUP | NO | 129 |

Correct: bind the signals; do not rely on EXIT for them.

```sh
trap on_exit EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
```

### 4. The returning-handler trap (EXIT + signals bound together)

Incorrect (the dominant fleet and upstream idiom):

```sh
cleanup() { rm -rf "$tmp"; }
trap cleanup EXIT INT TERM HUP
```

A signal runs `cleanup`, then execution RESUMES at the interrupted point. Measured (form `same-fn`, F/out/trap-matrix.posix.txt, real ^C confirmed in F/out/ctrlc.txt): in every shell the script continues after the signal and ends with rc 0 (output `CLEANUP(sig)|SURVIVED|CLEANUP(exit)`). The resource is removed, the script keeps running without it, and the parent sees success.

Under `set -e` the next failing command, or a following `|| err N` clause, hides it. Reproducers in the fleet pattern:

- F/wsetup-repro.sh: www-setup pattern, `set -eu`; ^C gives rc 130 only because errexit trips on the next command.
- F/wsetup-repro2.sh: `fetch_dist || err "failed to fetch" 3`; ^C gives rc 3 in all 8 shells. The interrupted download is reported as a fetch failure with a different code than 130.

Related: the k3s style `cleanup(){ code=$?; set +e; trap - EXIT; rm -rf "$T"; exit $code; }` with `trap cleanup INT EXIT` (k3s-io/k3s@82a6ddcd820b:install.sh:346-357). Measured (F/out/k3s-style.txt): SIGTERM during a foreground child exits 0 on dash, ash, mksh, yash, posh and zsh, and 15 on ksh. `$?` is the status of the command that was running when the trap fired (or 0), not the signal number, so `exit $code` converts the signal into success.

### 5. Canonical cleanup trap for sh and bash

Verified on 10 interpreters with `F/check-signal.py` (TERM, mode `term` and `raise`), shellcheck 0.11.0 clean:

```sh
tmp=
cleanup() { [ -z "$tmp" ] || rm -rf "$tmp"; }
on_exit()   { rc=$?; trap - EXIT; cleanup; exit "$rc"; }
on_signal() { trap - EXIT HUP INT TERM; cleanup; kill -s "$1" "$$"; }
trap on_exit EXIT
trap 'on_signal HUP' HUP
trap 'on_signal INT' INT
trap 'on_signal TERM' TERM
tmp=$(mktemp -d)
```

Notes:

- Traps are installed before `tmp` is created; `tmp=` makes `cleanup` safe in the window.
- The function form of `on_exit` avoids a false-positive SC2154 that the inline `trap 'rc=$?; ... exit "$rc"' EXIT` produces.
- `trap - EXIT` first prevents double cleanup when `exit` inside the handler would re-fire EXIT.
- `rc=$?; ...; exit "$rc"` is mandatory on mksh: the last command of an EXIT trap otherwise overrides the exit status.
- Simpler fallback where dying "of the signal" does not matter (installers): the `on_exit` above plus `trap 'exit 129' HUP; trap 'exit 130' INT; trap 'exit 143' TERM`. This was verified in mode `term` (accepts -SIG or 128+SIG). In bash it is identical to the canonical form in observable parent status except the parent's WIFSIGNALED bit.
- The same text works in bash. bash-only extras (`trap -p`, `RETURN`) are not needed.

### 6. Re-raise: dying of the signal, and its pitfalls

A CLI entry point that was interrupted should die of the same signal so the parent (a shell `for` loop, CI, `make`) sees the interrupt and stops: after cleanup, reset the traps, then `kill -s "$1" "$$"`. Measured with `F/check-reraise-sig.py` (WIFSIGNALED):

- Function form: dies of the signal on every interpreter tested (INT, TERM). Mode `raise` red on `exit 130` (hard-coded, `reraise-hardcoded.sh`) and on plain `exit` (`reraise-plain-exit.sh`, status 1).
- Inline string form `trap 'trap - EXIT HUP INT TERM; cleanup; kill -s TERM "$$"' TERM`: exits 0 silently on ksh93u+m 1.0.10 only (lint/bad/handler-reraise-inline.sh). Use a function.
- HUP: mksh and posh exit 129 (re-raise not honoured), zsh exits 1 (zsh handles HUP internally); others die of HUP. Treat HUP as "terminate with some nonzero status" and only INT/TERM as "die of the signal".
- A bash parent cannot distinguish `exit 130` from SIGINT death (both 130). Only `WIFSIGNALED` can. Reviewers use `check-reraise-sig.py`, not a bash `$?` check.
- PowerShell's installer uses the inline form `trap - INT; kill -s INT "$$"` (PowerShell/PowerShell@5d871eb5e02c:tools/install-powershell.sh:43-47); it is correct on bash/dash but inherits the ksh93u+m issue for TERM.

Correct signal name usage: `kill -s INT "$$"` (POSIX), not `kill -INT $$` (works but `-s` is the specified form [S2]), never a numeric signal.

### 7. Bare `exit` in a trap and `$?` inside EXIT traps

POSIX.1-2024: a bare `exit` in a trap action uses `$?` from BEFORE the trap ran. [S1] Measured (F/out/exit-in-trap.*.txt; `trap 'false; exit' TERM` then self-TERM):

- Conformant (rc 0): dash, busybox ash, mksh, ksh93u+m 1.0.10, bash 5.3, yash 2.61.
- Non-conformant (rc 1, last command's status): bash <=5.2, yash 2.52, ksh93u+m 1.0.4, posh, all zsh.
- EXIT trap `false; exit` after `exit 3`: ksh93u+m 1.0.4, posh and zsh 5.8/5.9 give 1.
- zsh 5.0.8 and 5.3.1 ignore `exit 9` inside an EXIT trap (status stays 3); zsh 5.0.8 loses the EXIT cleanup after `exit N` in a signal trap.

bash 5.3 changed this (NEWS item uu [S4]); the manual documents the earlier behavior. [S3]

Incorrect: `trap 'cleanup; exit' INT TERM`.
Correct: `trap 'rc=$?; cleanup; exit "$rc"' ...` for an EXIT handler, or `trap 'exit 143' TERM` for a signal.

### 8. `die()` and the subshell trap

`exit` in `$( )`, `( )`, or a pipeline stage terminates only that subshell. Measured (F/out/die-subshell.*.txt): in every shell, a script with `v=$(test -r f || die "no file")` prints the message, then continues with rc 0 (V10b). Exceptions on pipelines: `exit` in the LAST stage (`... | while read l; do exit 3; done`) exits the script on ksh93u+m (both versions) and native zsh 5.0.8-5.9, continues in zsh `--emulate sh`; bash `shopt -s lastpipe` does the same from 4.2 (3.2 and 4.0 have no lastpipe). The EXIT trap does not fire in a `$(exit 3)` subshell. A die that echoes to stdout inside `$( )` is captured into the variable (case `subst-assign-stdout`).

`local v=$(die)` masks status (SC2155) and `local` returns 0.

Incorrect:

```sh
die() { echo "error: $*"; exit 1; }              # stdout, fixed status
v=$(test -r "$f" || die "no file")               # continues, rc 0
local out=$(compute)                             # masks status
```

Correct:

```sh
die() { rc=${2:-1}; printf '%s: error: %s\n' "${0##*/}" "$1" >&2; exit "$rc"; }
f=$(resolve) || die "cannot resolve" 66          # statement position, main shell
out=$(compute) || die "compute failed"           # plain assignment: status kept
```

Under `set -e` a failed plain assignment aborts anyway; the `|| die` supplies the message and status. In bash, `local v; v=$(cmd) || die ...` is the split form.

### 9. Foreground-child trap deferral and CI cancel

POSIX: a trap runs after the current foreground command finishes. [S1] Measured (F/out/fg-trap-deferral.*.txt): in all shells but ksh93 (immediate), a signal to the script while `sleep 30` runs is not acted on until sleep ends. The portable interruptible wait is `sleep 30 & wait $!`, which returns promptly with status > 128 on the signal. Background jobs started with job control off ignore SIGINT. mksh loses a signal delivered between fork and exec; harnesses need a short delay.

GitHub Actions cancel: SIGINT to the step's entry process, SIGTERM after 7500 ms, SIGKILL after a further 2500 ms. [S13] Default step shell is `bash -e {0}`; `-o pipefail` is added only with `shell: bash`. [S13] Consequences: cleanup traps have about 2.5 s after TERM; a long foreground `curl` defers the trap until it exits or is killed.

### 10. ERR traps

Measured (F/out/err-trap.bash.txt; bash 3.2-5.3):

- ERR is not inherited into functions without `set -E`.
- ERR does not fire for commands in `if`/`while` conditions, `||`, `&&`, `!`.
- It fires for `x=$(false)` but not for `local x=$(false)`.
- `( false )`, `(( 0 ))` and `[[ ]]` fire from bash 4.0/4.2 only; 3.2 does not.
- With `set -E` a failing function fires ERR twice (once in the function, once at the call).
- ERR is unsupported by dash, yash and posh (finding 2); zsh calls it `ZERR`.

ERR is therefore neither portable nor complete as a control-flow mechanism, so use it only as a bash diagnostic ("failed at line N"). Fleet: 0 ERR traps in authored scripts (matches the audit).

Incorrect: `trap 'echo failed at $LINENO' ERR` in a `#!/bin/sh` script (dash/yash/posh: warning, no trap).
Correct (bash only, diagnostic): `set -Eeuo pipefail; trap 'echo "line $LINENO: exit $?" >&2' ERR`.

### 11. Exit-status vocabulary

Three tables exist in the fleet:

1. Rust cli-contract: 0, 1, 64, 65, 69, 74, 75, 77-82; 128+N "not ours" (rules/rust-quality/cli-contract.md:59 EXIT-02, :61 EXIT-04, :62 EXIT-05, :68 EXIT-11; :109 CLI-01, :113 CLI-05). [S15]
2. Installer table 0-7, usage = 2 (www-setup `.claude/rules/installers.md:225`, accepted divergence at :240). [S16]
3. Gate-script `# Exit:` headers in rules/swift-quality/checks/*.sh (e.g. never-gate.sh:8): 0/1 plus 64/65/66/70, and 123 via `xargs`.

Decision: by kind, not a single table.

| kind | table |
|---|---|
| shell CLI that mirrors a Rust tool | cli-contract table |
| installers (curl-pipe-sh) | 0-7 per installers.md |
| gate / check scripts | 0 pass, 1 findings, sysexits 64 usage / 65 data / 66 no input |

Each script states which in a `# Exit:` header. Flagged conflict: the Rust table lists 66 and 70 as "never claimed", while the swift gate scripts use them; the shell guidance should either record 66/70 as shell-gate-only or retire them from the gates.

Reserved, not assignable: 126 (not executable), 127 (not found), 128 (invalid exit arg), 129-159 (signals in the 128+N shells), and 123-125 for xargs/timeout. [S1] Measured (F/out/xargs-status.*, F/out/timeout-status.txt):

- xargs (GNU findutils 4.9/4.10, busybox): 123 child exited 1-125, 124 child exited 255, 125 child signalled, 126 not executable, 127 not found. This is why gate scripts that run under `xargs` see 123 for "a check failed".
- timeout: 124 on GNU coreutils 9.1 and uutils 0.10.0; 143 on busybox (Alpine 3.22); 137 with `-k` when the child ignores TERM.
- sysexits(3) 64-78 is "deprecated ... discouraged" in its own header; usable as a vocabulary but not a standard. [S11]

### 12. stderr/stdout contract

Decision (aligned to installers.md:215 "Stdout / stderr discipline" [S16]): stdout carries only the script's product (data, or the path when asked via a flag/env var like OCX_INSTALL_PRINT_PATH); every diagnostic, `die`, progress, warning goes to stderr. Reason: `v=$(tool)` and pipes capture stdout; a message on stdout becomes data (V11) and a die message inside `$( )` lands in the variable (finding 8).

### 13. Tooling: what shellcheck catches and does not

Shellcheck 0.11.0, verified red and green (F/out/verify.txt):

- SC2064 (double-quoted trap string expands now), SC3047 (`ERR` in sh), SC3048 (`SIGINT` names in sh), SC3049 (`trap -p`/other bashism in sh), SC2155 (declare and assign separately).
- No SC2317/SC2329 on functions only reachable through `trap`.
- No check exists for: the returning handler, `die` in a subshell, bare `exit` in a trap, literal 143 compares, or missing signal re-raise. These need the grep gates and `check-signal.py` below.

## Normative guidance candidates

Each rule: rationale, reviewer verification, and RUN status (R = run red on planted violation and green on twin; fixtures under F/lint).

1. **One status-preserving EXIT trap, installed before the resource exists.**
   Rationale: finding 5. Verify: `grep -rl --include='*.sh' -e mktemp . | xargs -r grep -L -e 'trap '` lists scripts that create temp state with no trap. RUN: V6, red on lint/bad/mktemp-notrap.sh, green on lint/good/mktemp-trap.sh.
2. **Never bind one cleanup function to EXIT and signals together.**
   Rationale: finding 4. Verify: grep `trap [^-].*EXIT.*(INT|TERM|HUP)` and review; behavioral `check-signal.py TERM term script interp...` must return -15 or 143 and remove the temp dir. RUN: V7 (3 lines on bad, 0 on good; one documented false positive on handler-reraise-inline, which is correct for another reason) and V8 red on handler-no-exit, handler-no-exit2, handler-k3s-style on all interpreters; green on handler-exit and handler-reraise.
3. **Signals get their own handlers that end the shell.**
   `trap 'exit 129' HUP; trap 'exit 130' INT; trap 'exit 143' TERM` or the function re-raise. Verify: V8. RUN.
4. **CLI entry points re-raise from a function with `kill -s NAME "$$"`, not inline and not with a hard-coded `exit 130`.**
   Rationale: finding 6. Verify: `check-reraise-sig.py` (WIFSIGNALED). RUN: mode `raise` red on reraise-hardcoded, reraise-plain-exit, handler-no-exit; red on ksh93u+m 1.0.10 only for handler-reraise-inline; green on handler-reraise.
5. **Never compare `$?` to a literal >= 129; use `-gt 128` and `kill -l`.**
   Verify: `grep -rnE '(-eq|-ge|==|=) *"?(129|13[0-9]|14[0-9]|15[0-9])"?|^ *(129|13[0-9]|14[0-9]|15[0-9])\)' --include='*.sh' .`. RUN: V9, 2 lines on bad, 0 on good. Fleet hit: grimoire-lore/rules/swift-quality/checks/tsan-check.sh:34 (literal 137).
6. **Always `exit "$rc"` explicitly in traps; never bare `exit`; never `exit $code` where `code` came from `$?` in a signal-bound handler.**
   Verify: `grep -rnE "trap '[^']*exit *;?'" --include='*.sh' .` (bare `exit'` at the end). RUN: V17, 1 line on bad, 0 on good; V8 `handler-exit-norc` red on mksh.
7. **Trap names: uppercase, no `SIG` prefix, no lowercase.**
   Verify: `shellcheck -s sh` (SC3048) plus `grep -rnE 'trap .*SIG[A-Z]+'`. RUN: V3 and V13 (red on bad, green on good).
8. **Quote trap bodies with single quotes (or call a function); never double-quote variables into the trap string.**
   Verify: shellcheck SC2064. RUN: V1.
9. **No ERR traps in `#!/bin/sh`; in bash only for diagnostics with `set -E`, never for cleanup or control flow.**
   Verify: `shellcheck -s sh` (SC3047) and `grep -rn "trap .* ERR" --include='*.sh' .`. RUN: V2 and V12.
10. **`die()` is defined once, writes to stderr, takes a status operand, ends with `exit "$rc"`.**
    Verify: static review of the definition; behavioral: run with stdout captured and assert empty. RUN: V11 red on die-stdout.sh (stdout=[error: oops]), green on die-stderr.sh.
11. **`die` is called only in statement position of the main shell; call sites use `v=$(f) || die "msg"`; never inside `$( )`, `( )`, or a non-last pipeline stage.**
    Verify: `grep -rnE '\$\([^)]*\bdie\b' --include='*.sh' .`. RUN: V10 (1 line on bad, 0 on good) and V10b behavioral (bad continues, "reached", rc 0; good rc 1).
12. **Never `local v=$(cmd)` / `export v=$(cmd)`; declare, then assign.**
    Verify: shellcheck SC2155. RUN: V5, V5b.
13. **Exit-status vocabulary by kind with a `# Exit:` header.**
    Verify: `grep -L '^# Exit:' <scripts>`. RUN: V16 red on installer-err9.sh and no-exit-header-install.sh, green on exit-header-install.sh.
14. **Installers use only 0-7 for `err()` statuses.**
    Verify: `grep -nE 'err .* ([89]|[1-9][0-9]+)$'`. RUN: V15, red on installer-err9.sh, green on installer-err5.sh.
15. **Never assign 123-128 or >=200 as an exit status.**
    Verify: `grep -rnE 'exit +(12[3-8]|2[0-9][0-9])\b'`. RUN: V14 (3 lines on bad: 125, 127, 200; 0 on good).
16. **128+N caveat text is part of the vocabulary section** (finding 1).
    Verify: documentation review. Not run (prose rule); the underlying statuses were measured on all interpreters.
17. **Keep `trap ... EXIT` out of function bodies.**
    Rationale: native zsh scopes it to the function. Verify: review; `F/exit-trap-in-func.sh` shows the difference. RUN as measurement (F/out/exit-trap-in-func.*.txt), no lint planted.
18. **Install traps before the resource they clean, and make `cleanup` safe when the resource is unset (`[ -z "$tmp" ] ||`).** Verify: review plus V8 on a script that creates the resource late. RUN via the canonical form (V8 green).
19. **Long waits are interruptible: `cmd & wait $!`, not a bare foreground `sleep`/`curl`, when a trap must act promptly.**
    Verify: F/fg-trap-deferral.sh. RUN as measurement.
20. **Do not use `$(trap -p EXIT)` to chain/restore traps in `#!/bin/sh` scripts.** bash arm only (ocx hook.rs:223 and :691 are bash-only and fine). RUN as measurement (F/out/trap-p.*).
21. **stdout is product only; all diagnostics to stderr.** Verify: rule 10's behavioral check. RUN: V11.
22. **Compare timeouts by "> 0 and not the child's own status"**, never to a literal 124 in portable code. Verify: `grep -rn '124' --include='*.sh'` and review. RUN as measurement (F/out/timeout-status.txt).

## Verification runs

All in F; driver `F/verify.sh` (output `F/out/verify.txt`), behavioral probes via `F/check-signal.py`.

| ID | fixture (bad / good) | command | exit on violation | exit on twin | output |
|---|---|---|---|---|---|
| V1 | lint/bad/sc2064.sh / lint/good/sc2064.sh | `shellcheck -s sh` | 1 | 0 | `[SC2064]` |
| V2 | lint/bad/sc3047.sh / lint/good/sc3047.bash | `shellcheck -s sh` / `-s bash` | 1 | 0 | `[SC3047]` |
| V3 | lint/bad/sc3048.sh / lint/good/sc3048.sh | `shellcheck -s sh` | 1 | 0 | `[SC3048]` |
| V4 | lint/bad/sc3049.sh / lint/good/sc3049.sh | `shellcheck -s sh` | 1 | 0 | `[SC3049]` |
| V5, V5b | lint/bad/sc2155.sh / lint/good/sc2155.sh | `shellcheck -s bash` | 1 | 0 | `[SC2155]` |
| V6 | lint/bad/mktemp-notrap.sh / lint/good/mktemp-trap.sh | `grep -rl --include='*.sh' -e mktemp . \| xargs -r grep -L -e trap` | 1 line | 0 lines | `lint/bad/mktemp-notrap.sh` |
| V7 | handler-no-exit, handler-no-exit2, handler-reraise-inline / handler-exit, handler-reraise | `grep -nE 'trap [^-].*(EXIT\|INT\|TERM\|HUP)'` | 3 lines | 0 lines | `trap cleanup EXIT INT TERM HUP` (one documented false positive on the inline re-raise) |
| V8 term | lint/bad/handler-no-exit.sh, handler-no-exit2.sh, handler-k3s-style.sh | `check-signal.py TERM term SCRIPT INTERP...` | 1 | 0 on handler-exit.sh | `VIOLATION: returncode 0, want -15 or 143` (k3s style: ksh 15, all others 0) |
| V8 raise | bad/handler-no-exit.sh, reraise-hardcoded, reraise-plain-exit / good/handler-reraise.sh | `check-signal.py TERM raise ...` | 1 | 0 | `VIOLATION: returncode 143, want -15` (good/handler-exit.sh in raise mode also red: it exits 143, does not re-raise) vs `ok: returncode -15, cleanup done` |
| V8 matrix | bad/handler-reraise-inline.sh; bad/handler-exit-norc.sh | `run-signal-matrix.sh` over 10 interpreters | 1 on ksh93u+m 1.0.10; 1 on mksh | 0 elsewhere | F/out/signal-matrix.txt (299 lines) |
| V9 | lint/bad/literal-143.sh / lint/good/literal-143.sh | grep literal 129-159 compare | 2 lines | 0 | `143) echo "terminated"`, `[ "$?" -eq 130 ]` |
| V10 | lint/bad/die-in-subst.sh / lint/good/die-in-subst.sh | `grep -nE '\$\([^)]*\bdie\b'` | 1 line | 0 | `v=$(test -r /nonexistent \|\| die "no file")` |
| V10b | same pair | run script | rc 0, prints `reached` | rc 1, no `reached` | `die: no file` then `reached` |
| V11 | lint/bad/die-stdout.sh / lint/good/die-stderr.sh | `out=$(script)`; assert `[ -z "$out" ]` | stdout=[error: oops] | stdout=[] | |
| V12 | lint/bad/sc3047.sh / good | `grep -rn 'trap .* ERR'` | 1 line | 0 | `trap 'echo failed at line $LINENO' ERR` |
| V13 | lint/bad/sc3048.sh / good | `grep -rnE 'trap .*SIG[A-Z]+'` | 1 line | 0 | `trap 'echo bye' SIGINT` |
| V14 | lint/bad/exit-reserved.sh / lint/good/exit-reserved.sh | `grep -rnE 'exit +(12[3-8]\|2[0-9][0-9])\b'` | 3 lines | 0 | `exit 125`, `exit 127`, `exit 200` |
| V15 | lint/bad/installer-err9.sh / lint/good/installer-err5.sh | `grep -nE 'err .* ([89]\|[1-9][0-9]+)$'` | 1 line | 0 | `err "disk full" 9` |
| V16 | lint/bad/installer-err9.sh, no-exit-header-install.sh / lint/good/exit-header-install.sh | `grep -L '^# Exit:'` | 2 lines | 0 | |
| V17 | lint/bad/bare-exit-trap.sh / lint/good/explicit-exit-trap.sh | `grep -nE "trap '[^']*exit *;?'"` | 1 line | 0 | `trap 'cleanup; exit' INT TERM` |

Count: 24 verifications watched red on a planted fixture and green on a twin (V1-V5b, V6-V17 including V10b and V11, and the V8 term/raise/matrix runs). Known limits: a bash parent cannot tell exit 130 from SIGINT death (use `check-reraise-sig.py`); bash 3.2 has no python image, so V8 for 3.2 uses `check-reraise.sh`; V7 over-matches the inline re-raise.

## Exemplar evidence

- k3s-io/k3s@82a6ddcd820b:install.sh:346-357 and package/rpm/install.sh:345: `cleanup(){ code=$?; set +e; trap - EXIT; rm -rf "$TMP_DIR"; exit $code; }`, `trap cleanup INT EXIT`. Status-preserving for normal exit, but measured exit 0 on SIGTERM during a foreground child (all shells; ksh gives 15). Counter-example for rule 6.
- docker/docker-install@2b32480025b2: the brief's `install.sh:809-813` has NO trap (that is the `do_install` truncation guard). The real trap is `rootless-install.sh:265`, `trap 'rm -rf "$tmp"' EXIT INT TERM`, a returning handler (rule 2).
- PowerShell/PowerShell@5d871eb5e02c:tools/install-powershell.sh:43-47: inline `trap - INT; kill -s INT "$$"` re-raise; also in installpsh-*.sh.
- fish-shell/fish-shell@ac50fe526f74: build_tools/check.sh:73 and tests/test_functions/sphinx-shared.sh:11: `trap cleanup EXIT INT TERM HUP`, returning handler.
- atuinsh/atuin@56525ac6a7a9:atuin.bash:360: bash-only prompt hooks with trap use.
- oils spec/builtin-trap-err.test.sh: ERR trap behavior corpus (confirms the semantic holes in finding 10).
- Homebrew install.sh:331, :891, :1088: EXIT traps for cleanup and terminal restore.
- Fleet (www-setup a251c3631047, uv 72e1fc88f354, grimoire 4650ad830375, grimoire-lore 88d5e14cb616, ocx 3485207c183e): 7 authored files bind one returning handler to EXIT plus signals, all under `set -e(u)`: uv/agents/scripts/load-github-action-thread.sh:96; grimoire/docs/public/install.sh:24 (duplicate in grimoire-duo); www-setup/scripts/gen-dist.sh:192; www-setup/scripts/publish-dist.sh:64; www-setup/src/install.sh:718 and :794 (cleanup() at :638-645, `ignore` at :169-171); www-setup/tests/ci/install-ocx.sh:66.
- www-setup/src/install.sh: `err()` at :147-150 (`exit "${2:-1}"`); `fetch_dist ... || err ... 3` at :798-800 (turns ^C into rc 3, F/wsetup-repro2.sh); `_target=$(detect_target)` at :790 safe under `set -eu` at :37; `local` declared separately at :245; verification call "statement position" rule at installers.md:198.
- 10 fleet .sh/.bash files use mktemp without any trap (e.g. www-setup/tests/docker/install-shells.sh, grimoire-indexer/templates/ci/gitlab-enrich.sh, ocx/test/manual/measure-index-clone.sh). `trap .*EXIT` appears in 51 files in a wider grep (the audit counts 34 authored). 0 ERR traps, 0 SIG-prefixed names, 1 literal-137 compare.
- ocx hook.rs:223 and :691 use `$(trap -p EXIT)` only in the bash arm; fine (rule 20).

## AI-agent angle

- Agents copy the upstream idiom `trap cleanup EXIT INT TERM`: it is the top search result and in k3s, docker, fish. It is wrong in the way that matters most and passes every test that does not send a signal. A rule must show the correct twin next to it.
- An agent tests with `bash script.sh` on one machine: it sees the `exit "$rc"` behavior work and never meets the mksh exit-0, dash EXIT-not-on-signal, or ksh93 271 differences. The rules therefore carry the measured table.
- Agents write `die` that echoes and exits, then call it inside `$( )` or a pipeline; the script "works" in the happy path. The grep V10 plus a one-line reproduction (rc 0, `reached`) is a cheap review.
- Agents add `trap ... ERR` for "robust error handling" in `#!/bin/sh` scripts; dash prints a warning and carries on without it.
- Agents invent exit codes (9, 42, 200) and compare `$?` to 130/143 literals. The vocabulary rule and `-gt 128` pattern belong in the always-loaded part of the set.
- Agents assert "cleanup runs on Ctrl-C" from reading the code. Only `check-signal.py` proves it; the rule should name the probe, not the prose.
- GitHub Actions cancel gives 2.5 s after TERM; agent-written cleanups doing network I/O in the trap get SIGKILLed mid-run.

## Contested / evolving

- Re-raise vs `exit 128+N`: re-raise is correct for CLIs (parent sees WIFSIGNALED) but costs a function and fails on HUP in mksh, posh, zsh. `exit 130/143` is simpler and observable as 128+N from bash parents. Decision: re-raise for CLI entry points, `exit` form acceptable for installers.
- Whether bare `exit` in traps is safe: POSIX.1-2024 says yes; bash 5.3 and yash 2.61 follow; older versions and zsh do not. Rule 6 sidesteps the debate with explicit `exit "$rc"`.
- ksh93u+m inline re-raise exit 0 (1.0.10) and the 1.0.4 bare signal numbers are ksh93u+m bugs, may be fixed later; the function form is safe either way.
- sysexits(3) 64-78 is marked deprecated/discouraged; the cli-contract table keeps it anyway. The 66/70 conflict between the Rust "never claimed" list and swift gate scripts is unresolved.
- Whether EXIT should fire on signal death is "may" in POSIX; shells will not converge. Treat as unspecified.
- Not covered: fish (`--on-signal`/`--on-event fish_exit`), nushell, elvish, PowerShell.

## Sources

| URL | what | date/era | why |
|---|---|---|---|
| [S1] https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html | POSIX.1-2024 XCU Shell Command Language: 2.8.2 exit status, `trap`, `exit` | 2024 | normative status, trap, bare exit rules (primary) |
| [S2] https://pubs.opengroup.org/onlinepubs/9799919799/utilities/kill.html | POSIX kill: `-s`, `-l exit_status` | 2024 | signal re-raise and decode (primary) |
| [S3] https://www.gnu.org/software/bash/manual/bash.html | Bash reference manual: trap, ERR, `set -E`, lastpipe | bash 5.2/5.3 era | bash trap semantics (primary) |
| [S4] https://ftp.gnu.org/gnu/bash/bash-5.3.tar.gz (NEWS, item uu) | bash 5.3 NEWS: bare `exit` in trap | 2025 | conformance change (primary) |
| [S5] https://raw.githubusercontent.com/magicant/yash/trunk/NEWS | yash NEWS (2.59 signal propagation, 384+N) | 2023-2025 | yash status vocabulary (primary) |
| [S6] https://github.com/ksh93/ksh (NEWS, 2023-05-28) | ksh93u+m NEWS: EXIT trap status fix | 2023 | ksh trap/exit changes (primary) |
| [S7] https://github.com/ksh93/ksh (src/cmd/ksh93/sh.1) | ksh93u+m manual | 1.0.x | ksh trap and 256+N status (primary) |
| [S8] https://git.kernel.org/pub/scm/utils/dash/dash.git (dash.1) | dash manual | 0.5.12 | dash trap spellings (primary) |
| [S9] https://github.com/MirBSD/mksh (mksh.1:3245) | mksh manual | R59c | EXIT trap, function-scope note (primary) |
| [S10] https://zsh.sourceforge.io/Doc/Release/Shell-Builtin-Commands.html and /Functions.html | zsh builtins (trap) and functions (TRAPEXIT, local traps) | 5.9 | zsh EXIT scoping (primary) |
| [S11] https://man.freebsd.org/cgi/man.cgi?query=sysexits&sektion=3 | sysexits(3): 64-78, "deprecated ... discouraged" | current | vocabulary origin (primary) |
| [S12] https://www.shellcheck.net/wiki/SC2064 (also SC3047, SC3048, SC3049, SC2155) | ShellCheck wiki pages | 0.11.0 era | lint coverage, each verified red/green (primary) |
| [S13] https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions and /managing-workflow-runs/canceling-a-workflow | step shell defaults; cancel signal timing | 2025-2026 | CI cancel budget (primary) |
| [S14] https://mywiki.wooledge.org/SignalTrap | Wooledge SignalTrap | 2020s | argued practice (secondary) |
| [S15] rules/rust-quality/cli-contract.md (:59, :61, :62, :68, :109, :113) | Rust cli-contract status table | repo | vocabulary decision (internal) |
| [S16] www-setup .claude/rules/installers.md (:198, :215, :225, :240) | installer 0-7 table, stdout/stderr discipline | repo | installer vocabulary (internal) |
| [S17] https://github.com/k3s-io/k3s/blob/82a6ddcd820b/install.sh | k3s installer cleanup trap | 2025 | exemplar and counter-example |
| [S18] https://github.com/docker/docker-install/blob/2b32480025b2/rootless-install.sh | rootless-install trap | 2025 | exemplar |
| [S19] https://github.com/PowerShell/PowerShell/blob/5d871eb5e02c/tools/install-powershell.sh | inline re-raise | 2025 | exemplar |
| [S20] https://github.com/fish-shell/fish-shell/blob/ac50fe526f74/build_tools/check.sh | `trap cleanup EXIT INT TERM HUP` | 2025 | exemplar |
| [S21] https://github.com/atuinsh/atuin/blob/56525ac6a7a9/crates/atuin/src/shell/atuin.bash | bash hook | 2025 | exemplar |
| [S22] https://github.com/oils-for-unix/oils/blob/master/spec/builtin-trap-err.test.sh | ERR trap spec tests | 2025 | cross-shell ERR corpus |
| [S23] https://github.com/Homebrew/install/blob/master/install.sh | EXIT traps | 2025 | exemplar |

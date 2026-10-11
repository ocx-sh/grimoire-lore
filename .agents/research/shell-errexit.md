---
title: "Error model, traps and exit codes (SH-ERR) — consolidated"
topic: shell / errexit (rows M-B-01..M-B-19, M-D-06 trap half, M-N-05; map conflicts X4 and X5; the glob-shopt verdict SH-EXP-21 depends on)
model: sonnet
id_family: SH-ERR
consolidates:
  - shell-errexit/error-model.md
  - shell-errexit/traps-and-exit-codes.md
  - shell-errexit/shopts-and-burndown.md
date: 2026-10-11
revised: 2026-10-11
---

# Error model, traps and exit codes (SH-ERR)

Keys. `[EM]` = [error-model.md](shell-errexit/error-model.md) (V = its Verification runs). `[TR]` = [traps-and-exit-codes.md](shell-errexit/traps-and-exit-codes.md). `[SB]` = [shopts-and-burndown.md](shell-errexit/shopts-and-burndown.md) (SB1-SB14 = its Verification runs). `[C#]` = a run made for this consolidation (table at the end of the ruleset; C1-C11 first pass, C12-C20 the revision). Audits: `[fleet]` fleet-shell-shape, `[inst]` installers, `[cfg]` config-inventory, `[ex]` exemplar-shape, `[plat]` platform-matrix, `[ocx]` ocx-emitter (all under `shell-audit/`). `[map]` = shell-topic-map.md. Sibling sub-artifacts: `[BVG]` shell-dialect/bash-version-gate.md, `[FSB]` shell-dialect/floors-and-shebangs.md, `[GATE]` shell-gate.md (read for the SC2310/SC2312 hand-off and the SH-GATE-08 exit table). Fixture roots (never in a fleet repo): `EM_F` = `~/.cache/research-lang/shell-tools/fixtures/error-model/`, `TR_F` = `.../traps-and-exit-codes/`, `C_F` = `.../errexit-consolidation/`, `SB_F` = `.../shopts-and-burndown/`. All shell versions are as measured on 2026-10-11; there is no macOS host, so every macOS statement is the bash 3.2.57 image or read-only.

## Verdict

1. **The error model is chosen by script kind, and `set -e` is a net, never the contract.** Bash repo/dev/CI script: `set -euo pipefail`, no `IFS` line. `#!/bin/sh`: `set -eu`, pipefail only through the subshell probe. Installer/bootstrap: `set -u` (`-eu` tolerated) plus an explicit `|| err N` at every fallible call. Sourced library, rc snippet, emitted code: set no options. Verifier/gate script: `set -u` and no `-e`. Exact text in SH-ERR-23.
2. **`-e` is off exactly where agents think it is on:** a function called from `if`/`while`/`!`/`&&`/`||` (all shells, POSIX.1-2024 says so), `$( )` in default bash 3.2-5.3 and busybox ash, `local|export|readonly x=$(cmd)` (all shells), and `(( i++ ))` from 0 (aborts bash 4.2-5.3, silently continues on 3.2/4.0). The rules (SH-ERR-01, -06, -08, -14) each name their shells.
3. **Traps:** one status-preserving `EXIT` handler installed before the resource exists, plus separate `INT`/`TERM`/`HUP` handlers that end the shell with an explicit status. A returning handler bound to `EXIT INT TERM HUP` is banned: it exits 0 after the signal on 11 of 11 interpreters [C1], and on Git Bash 5.2.15 too [SB12, C18]. A re-raise (`kill -s "$1" "$$"`) works only from a function that first resets its traps: dash, busybox ash 1.35/1.37, bash 3.2/5.3 and ksh93u+m 1.0.10 die of HUP/INT/TERM 6 of 6; without the reset the handler recurses to SIGSEGV on four of the six (dash, both ashes, bash 5.3) [C19].
4. **Exit statuses are by kind** (shell CLI mirrors the Rust cli-contract table; installers keep 0-7; a new gate script uses the SH-GATE-08 table 0/1/69/78/79, plus 64/65 as needed; the sysexits 66/70 carve-out is frozen to the 16 existing sites in 7 shipped Swift gate scripts), each stated in a `# Exit:` header. Never assign 123-125, 128 or 200-255; never compare `$?` to a literal 129+ (143 is 271 on ksh93u+m and 399 on yash).
5. **Plumbing that decides whether any of this works:** `die` runs in statement position of the main shell (`v=$(f) || die`), never inside `$( )`; every diagnostic goes to stderr.
6. **Outside the POSIX family** only nushell and elvish abort on a failing external command by default; fish continues; PowerShell continues even under `$ErrorActionPreference='Stop'` unless `$PSNativeCommandUseErrorActionPreference` is set (7.4/7.6.6 only) [EM §13]. The rules below bind the POSIX family, bash and zsh; PS-ERR and the fish/nu/elvish families own the rest.
7. **Authoring note for every later rule:** a behaviour claim names the shells it was measured on; "dash and bash agree" is never inferred from one run (the split cases are listed in SH-ERR-06/08/16).
8. **SC2310/SC2312 (map X4) is settled by the burn-down [SB §1-3].** Over the 199 authored fleet files: SC2310 reports 69 hits on **62 distinct sites** in 9 files, every callee read: 59 benign, 2 defects (`ocx/test/manual/run-windows-activation.sh:70,77`), 1 latent (`www-setup/src/install.sh:799`). SC2312 reports 191 sites in 55 files: 2 strict defects (`cd "$(git …)"` at `arcana/nox/scripts/release_gate.sh:12`, `exec … "$(wslpath …)"` at `fma/run.sh:14`), 6 the exempt `eval "$(ocx …)"` rc idiom, about 7 latent `"X_FQ=$(fq …)"` arguments; at most 15 of 191 (7.9%) are actionable. The decision stands: `enable=check-set-e-suppressed` in the rc, SC2312 out of the repo-wide rc, and the extended `G-EVAL` grep (now with `exec`) covers both strict shapes with zero noise (SH-ERR-07, -10). Three facts the owner must know: SC2310 never goes green by repairing the callee (a directive or a restructured call stays forever: 62 sites if enabled repo-wide); ShellCheck 0.11.0 has no baseline option; a nested `.shellcheckrc` replaces its parent instead of merging (SH-ERR-33).
9. **Glob shopts: no prologue, library or function sets `nullglob` or `failglob`.** Both change the meaning of every glob in the process: under `nullglob` `ls ./*.x` lists the cwd, `grep p *.x` reads stdin and `find *.x -name '*.dat' -delete` deletes the cwd tree (bash 3.2-5.3, 8 of 8); `failglob` skips only the failing command (or whole `if`/`{ }`/`&&`-`||` list), exits 0 without `set -e`, and kills the `[ -e "$f" ] || continue` guard before it runs. A function does not contain a shopt and neither does `local -`; a subshell or a save/restore pair does. The portable contract is `set -- ./*.x; [ -e "$1" ] || [ -L "$1" ] || die` with its own exit status (SH-ERR-29..32). `shopt` exists only in bash: 9 of 11 POSIX interpreters print "not found" and continue.
10. **Git Bash 5.2.15 matches Linux bash for a bash parent; a native Windows parent sees a different number.** Handlers give 130/143/129 either way, but an untrapped or re-raised death is `signal<<8` for PowerShell 5.1, `cmd.exe` and node (TERM 3840, INT 512, HUP 256, KILL 2304; Cygwin `pinfo.cc:231-233` swaps the status bytes for a non-Cygwin parent). Signal numbers above 15 differ from Linux (`kill -l 138` is BUS on MSYS, USR1 on Linux): decode with the running shell's `kill -l`, never a table (SH-ERR-16, -19, -22).
11. **Documented gaps (established, not answered):** (a) whether a GitHub-hosted `windows-2025` runner delivers INT/TERM to Git Bash's trap on cancel, and what its .NET host reports for a signalled child: **not run, no runner access** (the runner's Git for Windows may differ from the host's 5.2.15). (b) No ShellCheck 0.11.0 check (`-o all`) flags a prologue `shopt -s nullglob|failglob` or an unguarded glob loop; SH-ERR-29 and -31 rest on grep and matrix runs only. (c) The SC2310 hazard "masked `x=$(…)` inside a callee used as a condition" has no grep; ShellCheck is the only mechanical catch, at 62 annotation sites. (d) The latent `"KEY=$(cmd)"`-as-argument shape (about 7 fleet sites) is not covered by `G-EVAL`. (e) SC2311 stays silent under `set -eo pipefail` and `set -euo pipefail` headers, so the fleet's SC2311 column of 0 is a false 0 (SH-ERR-08). (f) Every macOS/BSD statement is read-only. (g) None of the 41 exemplars was scanned for unguarded glob loops.

### Conflicts resolved

| # | Conflict | Decision and reason |
|---|---|---|
| C-1 | [map] conflict 1, owner Q2 and X4 make `check-set-e-suppressed` (SC2310) and `check-extra-masked-returns` (SC2312) mandatory; [GATE] G1 ships both `enable=` lines as MUST and defers the sites to this file | **SC2310: enable it, answer each hit by classification (SHOULD, SH-ERR-07). SC2312: do not enable repo-wide.** Settled with the full census [SB §1-3]: SC2310 59 of 62 distinct sites benign, 2 defects, 1 latent (supersedes the first pass's 13 of 15); SC2312 191 sites, 2 strict, 6 exempt, about 7 latent, upper bound 15 (7.9%) (supersedes the 12-hit sample). Enabling SC2312 costs 191 annotation or rewrite sites for two defects the extended `G-EVAL` already finds, and a per-site `disable=SC2312` is what the never-weaken rule forbids agents to reach for reflexively. The sibling [GATE] default (both keys) is overturned for SC2312; the map's X4 resolution already adopts this (SH-GATE-02 becomes four keys, SH-GATE-19's `-o` list drops `check-extra-masked-returns`). SC2312 is cheap only in new code (SH-ERR-33). |
| C-2 | [map] M-B-06: empty `"$@"` under `set -u` fails on bash 3.2 | **Overturned.** Empty `"$@"` passes on bash 3.2-5.3, dash, busybox, mksh, ksh93u+m, yash and zsh; only posh 0.14.1 fails [EM §8, V17]. What fails on 3.2 is the *array* form and, re-measured here, `"${@}"` and `${*}` with no arguments [C5]; `"$@"` is the safe spelling. |
| C-3 | [fleet] "Patterns worth encoding" and [inst] record `trap cleanup EXIT INT TERM HUP` as the installer form | **Overturned by measurement.** The script survives the signal and exits 0 on 11 of 11 interpreters [C1, TR §4] and on Git Bash 5.2.15 [SB12]; 7 sites in 6 authored fleet files use it [C10]. |
| C-4 | Fleet `quality-bash.md:19-25,30` mandates `IFS=$'\n\t'` | **Dropped** (confirms [map] conflict 11): changes `read`, `"$*"`, `"${a[*]}"`; dash 0.5.12, yash 2.52 and posh assign the bytes `$ \ n t` [EM §10]. |
| C-5 | [map]/Q2: installers use `set -u`; the fleet's www-setup uses `set -eu` and k3s/deno/docker use `set -e` | **Both allowed.** The contract is the explicit check; `-e` may be present as a net but the code must not be correct only because it fires [EM §12]. |
| C-6 | Exit tables: the Rust table says 66 and 70 are "never claimed" ([TR] §11 flag); the Swift gate scripts use 64/65/66/69/70 and TR says "never assign 126/127"; the fleet's `oxc.sh` shims `exit 127`; [GATE] SH-GATE-08 uses 69/78/79/1 (map X5) | **Gate scripts: SH-GATE-08 binds every new gate; the sysexits carve-out is frozen to the 16 existing `exit 66`/`exit 70` code sites in 7 shipped Swift scripts** (cli-contract EXIT-08 allows a documented per-binary taxonomy). Priced [SB §8]: renumbering is 16 code lines (7 map mechanically, 66 to 64/78/79; 9 need a design choice because SH-GATE-08 has no "tool ran, result untrustworthy" row: 4 `git diff failed` at 66, 5 at 70) plus 23 documentation lines in 8 files and a major bump of `swift-quality` and `swift-package`, since EXIT-06 says a shipped number never changes meaning. The program applies the owner default (freeze); renumbering stays an owner option and needs one new SH-GATE-08 row first. **126/127 are allowed only with their shell meaning** in a launcher shim (`ocx-website/scripts/bin/oxc.sh:19`). |
| C-7 | [BVG] BVG-14 says probe `shopt -s inherit_errexit 2>/dev/null \|\| :`; [EM] says add it only where the interpreter is pinned | **Compatible, and sharpened:** the bare line kills bash 3.2-4.2 at the `shopt` (exit 1, "invalid shell option name"); the probe form works but leaves the behaviour version-dependent, so correctness may not depend on it; the portable spelling is `$(set -e; f)`. New, measured here: a `\|\|` at the call site switches `-e` off inside the substitution on bash 4.0-5.3 even with `set -e;` or `inherit_errexit` [C7]. |
| C-8 | Counts: [TR] "10 fleet files use mktemp without a trap" vs [fleet] 3; [TR] "7 files" with a returning handler; [map]/[EM] SC2312 150 vs [GATE] 191; the 197 authored files of the first pass vs the 199 of [SB] | **Scope differences, not disagreements.** The 197 authored files give 3 mktemp-without-trap files and 7 handler sites in 6 files [C10]; [TR]'s 10 and 7 include non-authored agent scripts and a `uv` script and a `grimoire-duo` copy. SC2312 is 150 sites in the 41 authored files that set `-e` [EM] and 191 in all 55 files, the other 41 sitting in 14 files with no `set -e` [SB §1]; SC2310 fires only under `set -e`, SC2312 regardless. The 199 is SH-GATE-09 `files()` discovery against the first pass's list. SC2310's 69 hits repeat a file:line:col 7 times (one per negation or AND-OR context), hence 62 distinct sites. |
| C-9 | [EM] rule: a sourced file never calls `exit`; the fleet's `ocx/test/manual/scripts/_lib.sh:71` `ocx_fail` does | **Scope by sink.** A file sourced into an interactive shell never exits; a library sourced only by scripts you own may define an exiting `die`. |
| C-10 | [TR] §9: GitHub cancel is "SIGINT, SIGTERM after 7500 ms, SIGKILL after a further 2500 ms" | **Corrected from the docs** (fetched 2026-10-11): SIGINT to the step's entry process; after 7500 ms SIGTERM; after a further 2500 ms the runner kills the process tree (SIGKILL is not named) [C11]. An `INT` handler has about 7.5 s, a `TERM` handler about 2.5 s. |
| C-11 | [TR] lists `tsan-check.sh:34` (`-eq 137`) as a literal-signal-compare violation | **Reclassified:** it compares against GNU/uutils `timeout`'s own documented statuses (124 expired, 137 after `-k`), not a shell's signal report; it is the one allowed literal, and it breaks only on busybox `timeout` (143) (SH-ERR-19). |
| C-12 | `shell-expansion.md` SH-EXP-21: "bash `nullglob`/`failglob` only inside a function or subshell"; its guard is `[ -e "$f" ] \|\| continue` | **The function half is wrong** [SB §5, C15]: `shopt -s nullglob` in a function is still on afterwards on 8 of 8 bash versions, and `local -` (4.4+) does not restore it. **Dangling symlinks** pass `[ -e ]` as false and are skipped silently (bash 5.3, dash). Decision: SH-ERR-29/30/31 own the bash glob-shopt rule and the empty-glob exit contract; SH-EXP-21 keeps its zsh and fish sentences and must be reworded at the index level (this file may not edit it): *"Make unmatched-glob behaviour explicit. In `#!/bin/sh` and bash guard the loop (`[ -e "$f" ] \|\| [ -L "$f" ] \|\| continue`) or test the first word (`set -- ./*.x; [ -e "$1" ] \|\| [ -L "$1" ] \|\| die`) and give "no input" its own exit status (79). Never put `shopt -s nullglob\|failglob` in a prologue, a sourced library or a function body; where bash arrays are wanted, wrap the glob in a subshell or a save/restore pair (SH-ERR-29..31). In zsh use `*.x(N)`; in fish expect an error."* |
| C-13 | [TR] §6 and the first pass of SH-ERR-22: the inline re-raise "exits 0 silently" on ksh93u+m 1.0.10 | **Corrected: exit 1** for HUP and TERM (INT dies of 2), re-measured [SB §7, C19]. Both are non-signal deaths, so the function form stays the rule; only the number changes. |
| C-14 | [EM] §5: 2 of 15 read SC2310 sites "real" (`env.sh:227` and `run-windows-activation.sh:70`) vs [SB] census: 2 defects (both in `run-windows-activation.sh`) and 1 latent of 62 | **Both stand; the criteria differ.** The census counts a defect only where the suppressed `-e` swallows a callee step (the SC2310 hazard). `env.sh:244-245` (`! gh pr checks … \| grep -qxE …` reports "settled" when `gh` fails) is a negated pipeline under pipefail plus an early-exit reader: a different defect that SC2310 does not find; it moves from SH-ERR-06 to SH-ERR-09 in "Applied". SC2310 precision is 3 of 62 (4.8%). |
| C-15 | SH-ERR-19 as first written: `[ "$rc" -gt 128 ]` then `kill -l "$rc"` | **Overclaimed for Windows.** `-gt 128` is true for 256, 512, 3840 and 2304, but `kill -l` then fails (`invalid signal specification`) [SB13, C18]. Rule text now carries the Windows decode. |

## The ruleset

Rows are grouped by the check that catches them: **A** ShellCheck default-on, **B** ShellCheck optional check, **C** grep gates, **D** behavioural run, **E** reading heuristic. Grep gates are the verbatim commands in "Gate commands" below (output is the violation; empty output is a pass; they assume GNU grep, the verification dialect itself is SH-USER's M-X-05). "Red" says whether the check was watched going red on a planted violation and green on its twin; V = [EM] run, TV = [TR] run, SB = [SB] run, C = [C#]. IDs 01-28 are the first pass; 29-33 were added by the 2026-10-11 revision (see the Revision log).

### A. ShellCheck, default-on (`shellcheck --norc -f gcc FILE`, 0.11.0)

**SH-ERR-01 · MUST** — Never write `local|export|declare|typeset|readonly x=$(cmd)`; declare, assign on the next line, then export or lock.
- *Why:* the builtin's status (0) replaces the substitution's, under `-e` too: `local x=$(false)` returns 0 on all 11 POSIX interpreters, bash 3.2-5.3 and zsh 5.0.8-5.9; the split form aborts everywhere [EM §1, §3]. ksh93u+m has no `local` (rustup `has_local` plus `alias local=typeset`).
- *Check:* SC2155 (default-on). `local -r x=$(cmd)` is not reported by SC2155, only by `-o check-extra-masked-returns` (SC2312) [EM §3].
- *Red:* yes. V2 (exit 1 / twin 0), V3, TV5/TV5b; re-run C9.
- *Scope:* every bash script; any `#!/bin/sh` script that uses `local`. Fleet: 0 authored hits [fleet Axis 4].

**SH-ERR-02 · MUST** — Single-quote a trap action or call a function from it; name conditions `EXIT INT TERM HUP` (uppercase, no `SIG`, no lowercase); use no `ERR`, `DEBUG` or `RETURN` in `#!/bin/sh`.
- *Why:* dash and posh reject `SIGINT`, posh and zsh-sh reject `int`, dash/yash/posh reject `ERR`; a rejected name prints a warning and the script runs untrapped [TR §2]. A double-quoted action expands at definition time.
- *Check:* `shellcheck -s sh`: SC2064, SC3047, SC3048, SC3049. SC2064 is intentionally disabled with a reason where the value must be frozen (`grimoire/docs/public/install.sh:23`).
- *Red:* yes. TV1-TV4 (exit 1 / twin 0); re-run C9.
- *Scope:* names bind `#!/bin/sh`; SC2064 binds all.

**SH-ERR-03 · MUST** — Put no `IFS=$'…'` line in a prologue, and none at all in a `#!/bin/sh` file.
- *Why:* no measured benefit; it changes `read -r k v` (`k=[alpha beta] v=[]`), `"$*"`, `"${a[*]}"` and unquoted splitting on bash 3.2-5.3; on dash 0.5.12, yash 2.52 and posh it assigns the four bytes `$ \ n t` [EM §10, V23]. Overturns `quality-bash.md` (C-4).
- *Check:* SC3003 under `-s sh`; `G-IFS` for bash files.
- *Red:* yes. V9 (SC3003 exit 1 / 0), V11 IFS-LINE 1 line / 0; re-run C9.
- *Scope:* all. Fleet: 25 of 197 authored files (all bash, 0 sh) [EM §10].

**SH-ERR-04 · SHOULD** — Read `$?` first: `rc=0; cmd || rc=$?` or `if ! cmd; then`; never `cmd; if [ $? -ne 0 ]` and never `echo "$(f) $?"`.
- *Why:* a command substitution in the same command runs first and replaces `$?` (shellcheck#3522, open, reproduced) [EM §11].
- *Check:* SC2181 (default-on) for the first shape; `G-DOLLARQ` for the second (ShellCheck 0.11.0 is silent on it).
- *Red:* yes. V5 (SC2181), V7 (ShellCheck miss, reproduced), V11 DOLLARQ 2 lines / 0.
- *Scope:* all. Fleet: 0 hits; acme.sh excludes SC2181 as house style [ex].

**SH-ERR-05 · SHOULD** — Use `if A; then B; else C; fi`, not `A && B || C`, whenever B can fail.
- *Why:* C runs when A is true and B fails (BashPitfalls #22). SC2015 misses the two commonest C's, `|| echo …` and `|| exit 1` [EM §11].
- *Check:* SC2015, plus reading for the gap.
- *Red:* partial. V6 red for `|| rm file` and `|| { echo; exit; }`; not red for `|| echo`, `|| exit 1` (stated gap).
- *Scope:* all.

**SH-ERR-32 · MUST** — Use no `shopt` (or other bash-only builtin) in a `#!/bin/sh` script. *(new)*
- *Why:* dash, both busybox ashes, mksh, both ksh93u+m, yash, posh and zsh `--emulate sh` print "not found" and go on (9 of 11 POSIX interpreters; bash `--posix` x2 accepts it); under `set -e` the script dies with 127 [SB §4, SB9].
- *Check:* `shellcheck --norc -s sh FILE` (SC3044, default-on in the `sh` dialect); behavioural `matrix.sh posix FILE`.
- *Red:* yes. SB9 (`sh-shopt-plant.sh` SC3044 exit 1 / twin exit 0; `matrix.sh posix`: 9 of 11 print not found, then `reached`); C20.
- *Scope:* every `#!/bin/sh`; SH-DIAL owns the wider SC3xxx bashism rules. Fleet: no hit in the `#!/bin/sh` scripts; `shellspec/shellspec@f2d13f991885:libexec/shellspec-inspection.sh:189` probes `shopt -s failglob 2>/dev/null` and disables SC3044 with a reason (`lib/general.sh:797`).

### B. ShellCheck optional check (`-o check-set-e-suppressed`)

**SH-ERR-06 · MUST** — Do not rely on `-e` inside a function that is, or may be, called from `if`/`while`/`until`/`!` or the non-last side of `&&`/`||` (this includes `f || true`). Every fallible command in such a function ends `|| return` (or `|| die`), or the function is called as a plain statement.
- *Why:* errexit is off in the callee body on every shell measured; POSIX.1-2024 XCU 2 says so ("Application writers should avoid relying on set -e within functions") [EM §1, §2]. `f() { false; echo still; }; if f; then :; fi` prints `still` on 11 POSIX interpreters, 8 bash versions, Git Bash 5.2 and zsh 5.0.8-5.9.
- *Check:* `shellcheck --norc -o check-set-e-suppressed -f gcc FILE` (SC2310); behavioural `matrix.sh posix pin.sh`. **SC2310 is a call-site detector:** it stays red after the callee is repaired with `|| return` [C17, SB2], so a green run proves only that the call left the condition or carries a directive (SH-ERR-07), never that the callee is correct; callee correctness is a reading. It fires only in a file that sets `-e` [SB3].
- *Red:* yes. V1 (SC2310 at 4:4, exit 1 / twin, `f` called plainly, 0), V1b (`still` on 11/11); re-run C9; C17 (a repaired callee without a directive is still red, by design).
- *Scope:* all POSIX-family shells, bash, zsh. Exceptions: zsh 5.3.1-5.9 exits on `! f` (5.0.8 on `! true`); posh ignores `-e` on the last item of an AND-OR list [EM §1].

**SH-ERR-07 · SHOULD** — Ship `enable=check-set-e-suppressed` in `.shellcheckrc` (the entry itself is mandatory, SH-GATE-02) and answer each SC2310/SC2311 hit by classification: call the function outside the condition (`set +e; f; rc=$?; set -e`), or put a per-site directive with its reason on the line before the call (`# shellcheck disable=SC2310  # predicate: <what>`; never a file-scope disable, which would hide real sites). A callee with two or more fallible steps gets `|| return` on each step **and** the directive: repairing the callee does not silence the call site. Do not enable `check-extra-masked-returns` (SC2312) repo-wide; new-code directories may opt in under SH-ERR-33.
- *Why:* full census of the 199 authored files [SB §1]: 62 distinct SC2310 sites (69 hits) in 9 files, every callee read: 59 benign (one-command predicates, explicit `|| return`, pure-shell bodies), 2 defects, 1 latent; 42 of the 62 sit in two www-setup files. The first pass's "13 of 15 benign" is superseded (C-1, C-14). Because the call site never goes green, enabling the check repo-wide costs 62 permanent sites (3 code edits, 59 directive lines) and ShellCheck 0.11.0 has no baseline option; the gradual paths are the nested rc of SH-ERR-33 or a counter script (`SB_F/burndown-inner.sh`, exit 1 on any SC2310). SC2312 is noise-dominated (C-1).
- *Check:* the command of SH-ERR-06. Both checks are info-level, so a `-S warning` severity floor silently disables them ([GATE] lint-format-profile: 0 of 260 findings visible).
- *Red:* yes for the check (V1; SB1 `fx-plant` exit 1 / `fx-twin` exit 0; SB2/C17: the repaired-callee twin stays red, the directive twin and the `set +e` twin are green); the classification is a reading.
- *Scope:* bash and sh files that set `-e`; ShellCheck 0.11.0. Fleet: 0 `.shellcheckrc` files in 149 repos [cfg §6.2]; SC2310 x69 hits / 62 sites in 9 files [fleet Axis 4, SB1].

**SH-ERR-08 · MUST** — In bash, call a multi-step function inside `$( )` as `x=$(set -e; f)`, or after a bare `shopt -s inherit_errexit` in a script whose header pins bash >= 4.4. Never assume `$( )` aborts on an inner failure in default-mode bash or busybox ash. At a call site that carries `|| die`/`|| return`, the callee's own steps carry `|| return`.
- *Why:* default-mode bash 3.2-5.3 and busybox ash 1.35/1.37 do not inherit `-e` into `$( )`; dash, mksh, ksh93u+m, yash, posh, zsh, bash `--posix` do (POSIX requires it) [EM §1, §4]. Measured [C7]: `x=$(f)` continues on 8 of 8 bash versions; `x=$(set -e; f)` aborts on 8 of 8; bare `shopt -s inherit_errexit` aborts `x=$(f)` on 4.4-5.3 and kills 3.2-4.2 at the `shopt` line; `x=$(set -e; f) || echo …` prints `f-continued` on 4.0-5.3 (the `||` context wins) and honours `-e` on 3.2.
- *Check:* SC2311 via `-o check-set-e-suppressed`, valid only for `set -e`/`set -eu` headers: silent for `set -eo pipefail` and `set -euo pipefail` [C8]. The mandatory prologue therefore disables it, and the fleet's SC2311 count of 0 across 156 `set -e` files is a false 0 [SB §2]; the gate is the matrix run of an `x=$(f)` plant (`matrix.sh bash`), not ShellCheck.
- *Red:* yes. V4 (exit 1 / 0), V4b (false negative reproduced), V20; C7, C8.
- *Scope:* bash, every version; busybox `sh`. `inherit_errexit` does not repair `local x=$(…)` (V20).

**SH-ERR-33 · CONSIDER** — A directory of *new* scripts may opt into SC2312 through a nested `.shellcheckrc` that repeats every root key (`enable=check-set-e-suppressed` and `enable=check-extra-masked-returns`); never a nested rc with only the SC2312 key. *(new)*
- *Why:* ShellCheck reads only the nearest rc and never merges ([Directive page](https://github.com/koalaman/shellcheck/wiki/Directive)); a one-key nested file silently drops SC2310 for that directory [SB §2, SB5].
- *Check:* `cd DIR && shellcheck -f gcc SCRIPT` shows both codes on a script with both shapes; a script reporting SC2312 but never SC2310 under a `set -e` header with a function-in-`if` means the nested rc lost a key.
- *Red:* yes. SB5 and C20: root rc one key, `sub/.shellcheckrc` one key: `top.sh` reports SC2310 SC2311, `sub/new.sh` reports SC2312 only (the defect the rule prevents); the two-key twin (a proxy: `--rcfile` with both keys) reports SC2310 SC2311 SC2312 on `sub/new.sh`.
- *Scope:* repos with new-code directories; ShellCheck 0.11.0.

### C. Grep gates (planted red, twin green; commands below)

**SH-ERR-09 · MUST** — Under `pipefail` (explicit, or a workflow step with `shell: bash`), never pipe into an early-exit reader: `grep -q|-m|--quiet|--max-count`, `rg -q`, `head`, `sed q`, `awk … exit`. Use `grep -q pat file`, capture first, or let the reader drain (`grep pat >/dev/null`). Sibling: `rules/cmake-build.md` CMK-CORE-05.
- *Why:* the writer dies of SIGPIPE: status 141 (bash, zsh, busybox, mksh, dash 0.5.12-12), 397 (yash 2.52), 13 or 1 (ksh93u+m), 23 for `curl`. An `echo "$v"` of 10 KiB or more into `grep -q` failed 200 of 200 on bash 3.2-5.3 (8 KiB: 0 of 200); a one-line producer never trips [EM §7, V12-V14]. SC2337 is not in 0.11.0.
- *Check:* `G-SIGPIPE`; judge each hit by producer size.
- *Red:* yes. V11 SIGPIPE 4 lines / 0; V12-V14; re-run C9.
- *Scope:* any shell with pipefail; GitHub `run:` blocks only under `shell: bash` (bare `run:` is `bash -e {0}`, no pipefail) [plat §2.2]. Fleet violations: `ocx/test/manual/announce-e2e/scripts/run_sequence.sh:111`, `run_machine_lane.sh:33`, `env.sh:244-245` (which is also a negated pipeline: `! gh … | grep -qxE …` answers "settled" when `gh` fails, C-14) [EM §14]; 138 authored pipefail files scanned.

**SH-ERR-10 · MUST** — In installer, CI and dev scripts, never `eval "$(cmd)"`, `cd "$(git …)"` (or `realpath`, `mktemp`) or `exec prog "$(cmd)"`: capture first (`code=$(cmd)`, `top=$(git rev-parse --show-toplevel)`, so `-e` or `|| die` sees the status), then `eval "$code"` / `cd "$top"` / `exec prog "$arg"`.
- *Why:* the substitution is an argument, so `eval ""`, `cd ""` and `exec prog ""` succeed when the producer fails [EM §3, SC2312 wiki problem 1]. On the fleet these shapes are the only strict SC2312 defects (C-1).
- *Check:* `G-EVAL` (extended with `exec`; [SB] calls it G-MASK).
- *Red:* yes. V11 EVAL-CS 2 lines / 0; V3; SB4/C12 (`x4/plant` 3 lines: `eval`, `cd`, `exec`; `x4/twin` 0; the first pass's `tree/bad` still 2 lines, `tree/good` 0).
- *Scope:* non-interactive scripts. Exempt: the one-line `eval "$(tool init sh)"` documented for a user's interactive rc (a failed init leaves the shell usable and the tool prints its error). Fleet: 8 authored hits, 6 of them `eval "$(ocx …)"` doc snippets in `ocx/test/doc_scripts/` (exempt), 2 real: `arcana/nox/scripts/release_gate.sh:12` and `fma/run.sh:14` (`exec "$W/target/release/fma.exe" "$(wslpath -w scenes)" "$@"`) [SB §1]. Not covered (documented gap): the latent `"KEY=$(cmd)"` argument shape (about 7 sites, `ocx/test/manual/scripts/bootstrap.sh:176`, `setup-integrations.sh:130`).

**SH-ERR-11 · MUST** — A file that is only sourced sets no shell options (`set -e`, `-u`, `-o …`). One sourced into an interactive shell also never calls `exit`, installs a trap on `EXIT` only when none exists (`[ -z "$(trap -p EXIT)" ]`, bash arm only), and probes the caller's flags instead of setting them (`[ "${-#*e}" != "$-" ]`, nvm.sh:3877-3905). A library sourced only by scripts you own may define an exiting `die`. Shell *options* are shared state; so is `shopt` state (SH-ERR-29).
- *Why:* a library's `set -e; set -u` flips the caller on all 11 POSIX interpreters, bash 3.2-5.3 and zsh 5.0.8-5.9; the caller then exits at its next non-zero status [EM §9, V18]. Emitted ocx hooks follow the rule: `ocx@a23ec5be2939:crates/ocx_shell/src/shell/hook.rs:213,223,691` trap `EXIT` only when free.
- *Check:* `G-LIB` with every only-sourced directory or file as operand (a non-existent operand scans nothing); runtime `matrix.sh posix|bash|zsh sourced-caller.sh LIB` ends exit 1 with flags changed, twin exit 0.
- *Red:* yes. V11 LIB-SETS 2 lines / 0; V18.
- *Scope:* sourced libraries, rc/integration snippets, emitted code. Fleet violation (neutral today): `ocx@a23ec5be2939:test/manual/announce-e2e/scripts/env.sh:24` sets `-euo pipefail` in a file whose header says "Sourced (never executed)"; all 7 drivers set the same options, and `G-LIB` misses it because it is not in a `lib/` directory.

**SH-ERR-12 · MUST** — Under `set -u`, expand a possibly-empty array as `${a[@]+"${a[@]}"}` or behind `[ "${#a[@]}" -gt 0 ]`, unless the header pins bash >= 4.4. On a 3.2 floor write `"$@"`, never `"${@}"` or `${*}`. Empty `"$@"` needs no guard anywhere except posh 0.14.1 (`${1+"$@"}`).
- *Why:* `a=(); echo "${a[@]}"` fails with `a[@]: unbound variable` on bash 3.2, 4.0, 4.2 and passes from 4.4; the guarded idiom passes on all eight [EM §8, V16, C5]. `"${@}"` and `${*}` with no arguments fail on 3.2 only [C5, BVG-11]. A glob-filled array (`a=(./*.x)`) under a contained `nullglob` is empty-able and needs the same guard on 3.2-4.2 [SB §4].
- *Check:* `G-NOUNSET` lists candidates (precision about 13% [BVG-11]); decide emptiness by reading and by running the path on `bash:3.2`: `matrix.sh bash arr-bad.sh`.
- *Red:* yes. V11 NOUNSET-ARR 2 lines / 0; V16; C5 (rc 1 on 3.2/4.0/4.2, twin 0 on all 8).
- *Scope:* bash scripts that may run on macOS `/bin/bash` 3.2.57 or macOS runners (bash 3.2.57 there [plat §2.1]). Fleet: latent at `index@9eba2cc3929b:scripts/golden-baseline.sh:186,291-299` and `smoke-test.sh:447`; compliant `golden-baseline.sh:148-153`, `tsan-check.sh` (`${scratch[@]+"${scratch[@]}"}`); `setup-grimoire/.github/scripts/install.sh:82` is a false positive (never empty).

**SH-ERR-13 · MUST** — In `#!/bin/sh` scripts enable pipefail only as `# shellcheck disable=SC3040` followed by `(set -o pipefail) 2>/dev/null && set -o pipefail`; never bare `set -o pipefail` or `set -o pipefail 2>/dev/null || :`. The code must be correct with pipefail off.
- *Why:* the bare form exits dash 0.5.12-2 / -6ubuntu5 (Debian 12, Ubuntu 24.04) with 2 and posh 0.14.1 with 1; the probe is ON on 9 of 11 interpreters (yash 2.52 supports it) and silently OFF on those two; dash 0.5.12-7+ (Debian 13, Ubuntu 26.04) has pipefail, so a version string identifies nothing [EM §7, FSB]. Re-measured [C6].
- *Check:* `G-SHPF`; SC3040 flags both forms (the probe needs the directive); `matrix.sh posix` of a plant.
- *Red:* yes. V10, V15; C6 (dash exit 2, posh exit 1, twin exit 0 on 11/11); V11 SH-PIPEFAIL 1 line / 0.
- *Scope:* every `#!/bin/sh`. Owned jointly with SH-DIAL (M-A-05); ShellCheck master will relax SC3040/SC3003 [FSB], so keep the grep. Fleet: 0 of 31 sh scripts use pipefail.

**SH-ERR-14 · MUST** — Under `-e`, never use `(( i++ ))`, `(( i-- ))` or `let i++` as a statement; write `i=$((i + 1))` (or `(( … )) || true`). Do not rely on a bare `(( ))`, `[[ ]]` or `( … )` statement to stop a script on a 3.2/4.0 floor.
- *Why:* `(( i++ ))` from 0 returns 1: bash 4.2-5.3 abort, bash 3.2 and 4.0 continue [C4, EM §1]; mksh and zsh abort, ksh93u+m continues. The 3.2/4.0 non-abort of `(( ))`, `[[ ]]` and `( false )` is silent divergence (BVG-09).
- *Check:* `G-ARITH`; BVG-09's `errexit-check.sh` for the bare-statement half (reading-grade); `matrix.sh bash arith-bad.sh`.
- *Red:* yes. C3 ARITH 2 lines / 0; C4 (exit 1 on 4.2-5.3, `after-arith i=1` exit 0 on 3.2/4.0, twin exit 0 on all 8).
- *Scope:* bash `-e` scripts. Fleet: 0 hits; `ocx env.sh:108` dodges it with a trailing `true`.

**SH-ERR-15 · MUST** — A script that creates temp state (`mktemp`, a lock, a staged file) binds ONE status-preserving `EXIT` handler before creating it, with `cleanup` safe when the resource is unset and doing local work only:
```sh
tmp=
cleanup() { [ -z "$tmp" ] || rm -rf "$tmp"; }
on_exit() { rc=$?; trap - EXIT; cleanup; exit "$rc"; }
trap on_exit EXIT
tmp=$(mktemp -d)
```
- *Why:* otherwise every failure leaks the directory; `rc=$?; … exit "$rc"` is mandatory because the last command of an `EXIT` trap overrides the status on mksh [TR §5]. GitHub cancel gives an `INT` handler about 7.5 s and a `TERM` handler about 2.5 s [C11].
- *Check:* `G-MKTEMP` (reading-grade: any `trap` word in the file passes it).
- *Red:* yes. TV6 1 line / 0; C3 MKTEMP 1 / 0.
- *Scope:* all. Fleet: 3 authored files without a trap: `grimoire-indexer/templates/ci/gitlab-enrich.sh`, `ocx/test/manual/measure-index-clone.sh`, `www-setup/tests/docker/install-shells.sh` [C10]; upstream cargo-dist and rustup installers have none either [inst §2d].

**SH-ERR-16 · MUST** — `INT`, `TERM` and `HUP` get their own handlers that end the shell with an explicit status (`trap 'exit 129' HUP; trap 'exit 130' INT; trap 'exit 143' TERM`), or re-raise (SH-ERR-22). Never bind one returning cleanup function to `EXIT` plus signals, and never end a trap with a bare `exit`.
- *Why:* `trap cleanup EXIT INT TERM HUP` then SIGTERM prints `CLEANUP`, `SURVIVED`, `CLEANUP` and exits 0 on 11 of 11 interpreters; the twin exits 143 on 11 of 11 [C1]. Under `set -e` the next failing command or `|| err 3` hides it (`fetch_dist … || err "failed to fetch" 3` turns Ctrl-C into rc 3 [TR §4]). k3s's `trap cleanup INT EXIT` reports success on SIGTERM (exit 0 on all but ksh, 15) [TR §4]. A bare `exit` returns the pre-trap `$?` only on dash, ash, mksh, ksh93u+m 1.0.10, bash 5.3, yash 2.61; bash <= 5.2, yash 2.52, ksh93u+m 1.0.4, posh and zsh return the last trap command's status [TR §7]. `EXIT` does not fire on INT/TERM in dash, busybox ash, yash, posh or zsh, and mksh runs it then exits 0 [TR §3].
- *Windows (Git Bash 5.2.15, host-measured [SB §6, SB12, C18]):* for a bash parent the handlers give 130/143/129 exactly as on Linux, and the returning-handler plant still exits 0 with `CLEANUP SURVIVED CLEANUP`, so the ban holds. A native Windows parent (Windows PowerShell 5.1 `Start-Process`, `cmd.exe` `%ERRORLEVEL%`, node 24 `spawnSync`, all three agree) sees `exit 143` as 143 and `exit 130` as 130, but an untrapped or re-raised death as `signal<<8`: TERM 3840, INT 512, HUP 256, KILL 2304 (Cygwin `pinfo.cc:231-233` swaps the two status bytes for a non-Cygwin parent). Only the explicit `exit 143/130/129` handler keeps the familiar number for a native consumer.
- *Check:* `G-RET` and `G-BARE`; behavioural `sh C_F/sigprobe.sh TERM SCRIPT INTERP…` (POSIX sh: red when the script exits 0 after the signal, outlives it by 4 s, or leaves `$CLEAN_DIR`) or `TR_F/check-signal.py TERM term`; on Windows `matrix.sh win sig.sh` (Git Bash) and `matrix.sh win sig-native.ps1` (native parent) from `SB_F`.
- *Red:* yes. TV7, TV8, TV17; C1 (11/11), C2 (red on `handler-no-exit`, `-no-exit2`, `handler-k3s-style` x dash+bash; green on `handler-exit`, `handler-reraise`), C3 (RET 4 lines / 0, BARE 2 / 0); SB12/C18 (`cleanup-on-signals rc=0` red, `exit-handler-INT/TERM/HUP` 130/143/129 green, native `handler-exit-143` 143).
- *Scope:* every script that traps; all shells. Fleet violations: see "Applied". The tightened `G-RET` fixes TV7's one false positive (inline re-raise). Not run: a GitHub-hosted `windows-2025` runner (Verdict, gap a).

**SH-ERR-17 · MUST** — Call `die` only in statement position of the main shell (`v=$(f) || die "msg"`, `[ -r "$f" ] || die …`); never inside `$( )`, `( )` or a non-last pipeline stage.
- *Why:* `exit` there leaves only the subshell: `v=$(test -r f || die "no file")` prints the message and the script continues with rc 0 on every shell [TR §8]. (`exit` in the last pipeline stage does leave the script on ksh93u+m, native zsh and bash with `lastpipe` >= 4.2, so do not depend on either.) `local v=$(die)` also masks (SH-ERR-01).
- *Check:* `G-DIE`; behavioural run (TV10b).
- *Red:* yes. TV10 1 line / 0, TV10b (bad continues, rc 0; good rc 1); C3 DIE 2 / 0.
- *Scope:* all. Fleet: 0 hits; `www-setup/.claude/rules/installers.md:198` already pins statement position.

**SH-ERR-18 · MUST** — Never `exit` 123, 124, 125, 128 or 200-255. 126 and 127 only with their shell meaning (found-not-executable, not found) in a launcher shim.
- *Why:* `xargs` owns 123-127 (123 child exited 1-125, 124 child exited 255, 125 signalled), `timeout` owns 124/125/126/127/137, shells own 126/127/128+N; `exit 300` is 44 and `exit -1` is 2 on 11 of 11 [TR §11, cfg §4].
- *Check:* `G-RESERVED`.
- *Red:* yes. TV14 (3 lines / 0 on the earlier pattern); C3 RESERVED 2 lines / 0, the twin carries `exit 66` and an `exit 127` shim.
- *Scope:* all. Fleet: 0 real hits (1 comment at `rules/swift-quality/checks/never-gate.sh:16`); `ocx-website/scripts/bin/oxc.sh:19` is the allowed 127 shim. `never-gate.sh:8-9` documents a 123 that is `xargs`' own status passed through, not an `exit 123` it chooses, so it is allowed [SB §8].

**SH-ERR-19 · SHOULD** — Never test for signal death with a literal and never hard-code a signal number above 15. Use `[ "$rc" -gt 128 ]` and decode with the running shell's own `kill -l "$rc"`; a parent accepts both `-N` (killed by signal) and `128+N`. Where the status may come from a native Windows intermediary (PowerShell, cmd, node reporting a Git Bash process), it can be `N*256`; a bash script uses the two-branch decode `if [ "$rc" -ge 256 ] && [ $((rc % 256)) -eq 0 ] && [ $((rc / 256)) -le 64 ]; then kill -l $((rc / 256)); elif [ "$rc" -gt 128 ] && [ "$rc" -le 192 ]; then kill -l "$rc"; fi` (bash only; ksh93u+m and yash keep plain `kill -l "$rc"`, which decodes their 256+N and 384+N). The one allowed literal is GNU/uutils `timeout`'s documented 124 (expired) and 137 (after `-k`); gate it on the timeout flavour (busybox `timeout` returns 143).
- *Why:* a child killed by TERM is 143 in dash, busybox ash, mksh, posh, bash and zsh, 271 in ksh93u+m, 399 in yash (PIPE: 141/269/397) [TR §1, cfg §4]. A script that ends on a signal-killed command dies of that signal on ksh93u+m and yash 2.61 and exits 143 elsewhere [TR §1]. On MSYS, `kill -l` numbers above 15 differ from Linux (USR1 30, USR2 31, BUS 10, CHLD 20, CONT 19, STOP 17, TSTP 18 against 10, 12, 7, 17, 18, 19, 20): `kill -l 138` is BUS on Git Bash and USR1 on Linux; only HUP INT QUIT ABRT KILL PIPE ALRM TERM agree. `[ "$rc" -gt 128 ]` is true for 256, 512, 3840 and 2304, but `kill -l` rejects them (`invalid signal specification`) [SB §6, C-15].
- *Check:* `G-LIT`; on Windows `matrix.sh win sigdecode.sh` and `matrix.sh bash sigdecode.sh`.
- *Red:* yes. TV9 2 lines / 0; C3 LIT 2 / 0; SB13/C18 (the decode prints `3840=SIGTERM 512=SIGINT 256=SIGHUP 2304=SIGKILL 143=SIGTERM 130=SIGINT` identically on Git Bash and 8 of 8 bash versions; the naive `kill -l 3840` and `kill -l 512` are red with `invalid signal specification`).
- *Scope:* any script that must also run on ksh93u+m, yash or Git Bash; SHOULD because those are rare targets. Fleet: 1 hit, `rules/swift-quality/checks/tsan-check.sh:34` (documented `timeout` contract, C-11).

**SH-ERR-29 · MUST** — Put no `shopt -s nullglob` or `shopt -s failglob` at the top level of a script, in a prologue, or in a sourced library. *(new)*
- *Why:* both change every glob in the process: under `nullglob` `ls ./*.x` lists the cwd, `grep p *.x` reads stdin, `find *.x -name '*.dat' -delete` searches `.` and deletes `sub/keep.dat` (busybox `find` measured; GNU `find` documents the same default of `.`, unrun); `failglob` is not fail-closed: without `set -e` it skips only the failing command (or the whole `if`, `{ }` group or `&&`/`||` list), the script exits 0, and it fires before an `[ -e "$f" ] || continue` guard can run; with both set, `failglob` wins. Identical on bash 3.2, 4.0, 4.2, 4.4, 5.0-5.3 (8 of 8) [SB §4]. `nullglob` plus `set -u` also makes empty arrays routine (SH-ERR-12).
- *Check:* `G-SHOPT` (column-0 lines only; output is the violation). It does **not** see an indented `shopt` inside a function body (`plant-leaky-lib.sh`: 0 lines); that half is SH-ERR-30. A top-level region that is intentional becomes a subshell.
- *Red:* yes. SB6, C13 (`plant-prologue.sh` `3:shopt -s nullglob failglob`, `contract-plant-nullglob.sh`, `contract-plant-failglob.sh` 1 line each; `twin-contained.sh` and `contract-twin-explicit.sh` empty). No ShellCheck 0.11.0 check (`-o all`) flags it (only SC2250, style): grep-only (Verdict, gap b).
- *Scope:* all bash. Fleet: 0 authored or agent-config files use `nullglob`, `failglob` or `setopt nullglob`. Upstream violators: `direnv/direnv@28a73d1df3f3:stdlib.sh:12` (top level of a library every `.envrc` sources), `oils-for-unix/oils@57d3f0d088c3:soil/web.sh:12`.

**SH-ERR-20 · MUST** — Diagnostics, warnings, progress and `die` messages go to stderr; stdout carries only the script's product. Define `die` once: `die() { rc=${2:-1}; printf '%s: error: %s\n' "${0##*/}" "$1" >&2; exit "$rc"; }`.
- *Why:* `v=$(tool)` and pipes capture stdout; a `die` inside `$( )` that writes to stdout lands in the variable [TR §8, §12]. Mirrors cli-contract CLI-01 and `www-setup/.claude/rules/installers.md:214-221`.
- *Check:* run the script on a failing path and assert stdout is empty: `out=$(sh script 2>/dev/null); [ -z "$out" ]`.
- *Red:* yes. TV11 (bad `stdout=[error: oops]`, good `[]`).
- *Scope:* all. Fleet: www-setup `src/install.sh:147-150` (`err()` uses `exit "${2:-1}"`) complies.

### D. Behavioural run

**SH-ERR-21 · SHOULD** — Guard `shift`: `if [ "$#" -gt 0 ]; then shift; fi` (or shift only after reading `$1` under `-u`). `shift || true` is not a guard.
- *Why:* with nothing to shift, `shift` is a special-builtin error: dash exits 2 and ksh93u+m exits 1 even with `|| true`; bash, busybox, mksh, yash, posh and zsh print a diagnostic and continue [EM §11, V19] (shellcheck#3444, open).
- *Check:* `matrix.sh posix shift.sh` (`plain`/`or_true` exit 2 on dash, 1 on ksh93u+m; `guarded` exit 0 everywhere). The grep `^[[:space:]]*shift[[:space:]]*(;|$)` only lists candidates.
- *Red:* yes for the behaviour (V19); no for the grep.
- *Scope:* `#!/bin/sh` scripts that parse arguments. Fleet: 26 bare shifts, all guarded by position.

**SH-ERR-22 · SHOULD** — A shell CLI that mirrors the Rust contract (EXIT-11) re-raises after cleanup from a function, not inline and not with a hard-coded `exit 130`, and the function resets every trap it installed *before* it kills:
```sh
on_signal() { trap - EXIT HUP INT TERM; cleanup; kill -s "$1" "$$"; }
trap on_exit EXIT
trap 'on_signal HUP' HUP
trap 'on_signal INT' INT
trap 'on_signal TERM' TERM
```
- *Why:* the parent sees WIFSIGNALED. Measured [SB §7, SB10, C19] on dash 0.5.12, busybox ash 1.35 and 1.37, bash 3.2 and 5.3 and ksh93u+m 1.0.10: the function pattern dies of HUP, INT and TERM on 6 of 6. The inline string form (`trap 'cleanup; trap - TERM; kill -s TERM $$' TERM`) dies of the signal on the five but exits **1** on ksh93u+m 1.0.10 for HUP and TERM (INT dies of 2): not 0 as [TR] first recorded (C-13), and still not a signal death. **The reset is load-bearing:** without `trap - EXIT HUP INT TERM` before the `kill`, the handler re-enters itself until SIGSEGV on dash (27,565 handler runs), busybox ash 1.35/1.37 (8,880 and 8,879) and bash 5.3 (5,691), and bash 3.2 ends with `exit 143` after two runs instead of a signal death (counts vary run to run); a reviewer's check is "the handler resets the traps, then kills with `$1`". HUP is not honoured on mksh and posh (129) or zsh (1), so treat only INT/TERM as "die of the signal"; a bash parent cannot tell `exit 130` from SIGINT death [TR §6]. Installers and dev scripts may use SH-ERR-16's `exit 130/143`.
- *Windows:* on Git Bash the re-raise dies of the signal, which a bash parent sees as 143/130/129 but a native parent as 3840/512/256 (SH-ERR-16). It is the right form for a bash caller and the wrong one when a native consumer matches 128+N; use the explicit `exit` there.
- *Check:* `TR_F/check-signal.py TERM raise SCRIPT INTERP` (checks WIFSIGNALED, needs Python) or `SB_F/reraise/run-reraise2.sh` (needs Docker and the static `waitsig`; prints `DIED-OF-SIGNAL N` per interpreter); require `DIED-OF-SIGNAL` for HUP, INT and TERM.
- *Red:* yes. TV8 raise: `reraise-hardcoded`, `reraise-plain-exit`, `handler-no-exit` red; `handler-reraise` green; `handler-exit` is red in raise mode by design. SB10/C19: `v-func.sh` died of 1/2/15 on 6 of 6 interpreters; the reset-less plant `v-nopt.sh` is red on 6 of 6 (SIGSEGV on dash, ash x2, bash 5.3; `exit 143` on bash 3.2; `exit 1` on ksh93u+m).
- *Scope:* shell CLIs only. `PowerShell/PowerShell@5d871eb5e02c:tools/install-powershell.sh:43-47` uses the inline form (correct on bash/dash/ash, wrong on ksh93u+m 1.0.10).

**SH-ERR-30 · MUST** — Contain any glob shopt in a subshell (`( shopt -s nullglob; … )`, `f() ( … )`) or a save/restore pair (`shopt -q nullglob && had=1 … [ "$had" -eq 1 ] || shopt -u nullglob`). `local -` is not containment. *(new)*
- *Why:* a function leaves `nullglob` on for the caller on bash 3.2-5.3 (8 of 8); `local -` (bash 4.4+) saves the single-letter `set` options only, not `shopt` options (NEWS 4.4 item s), and is an error on 3.2-4.2; a subshell function and a save/restore function leave it off (8 of 8) [SB §5, SB7, C15]. Fixes the "function" half of SH-EXP-21 (C-12).
- *Check:* `matrix.sh bash leak-check.sh LIB FUNC` from `SB_F/globs` (sources the library, calls the function in the current shell, exits 1 if `nullglob` or `failglob` is now on). Discovery of candidate functions is reading: `G-SHOPT` sees only column 0.
- *Red:* yes. SB7/C15 (`plant-leaky-lib.sh collect`: `LEAK: nullglob is on after collect`, exit 1 on 8 of 8; `twin-restore-lib.sh collect` and `collect_sub`: `ok: no shopt leaked`, exit 0 on 8 of 8).
- *Scope:* every bash library or function that globs with a shopt. Upstream containment: `junegunn/fzf@25adb674537b:shell/completion.bash:538-546` (inside `<( … )`, with the reason in a comment), `shellspec/shellspec@f2d13f991885:lib/general.sh:790-799`; leaks: `oils-for-unix/oils@57d3f0d088c3:devtools/format.sh:118`, `test/syscall.sh:342` (function, no restore).

**SH-ERR-31 · MUST** — A script that globs for required input gives "nothing matched" its own exit status through an explicit test, never by a shopt: `set -- ./*.x; if [ ! -e "$1" ] && [ ! -L "$1" ]; then echo "no input files" >&2; exit 79; fi`. Optional input uses `for f in ./*.x; do [ -e "$f" ] || [ -L "$f" ] || continue; …`. Exit 79 is the cli-contract `NotFound` and the SH-GATE-08 "no input" row, so it binds shell CLIs and gate scripts; an installer or other kind uses the nearest code of its own `# Exit:` table (www-setup's 0-7 has no "no input" row), never 0 and never the accidental 1. *(new; joint with SH-EXP-21)*
- *Why:* default globbing feeds the literal to the next command (accidental failure for `cat` and `rm`, silent success for `rm -f` and `echo`); `nullglob` gives a silent exit 0; `failglob` gives exit 0 plus a message without `set -e`; `[ -e ]` alone skips a dangling symlink silently (`processed=0` on bash 5.3 and dash), `|| [ -L ]` closes that [SB §4-5, SB14].
- *Check:* run the script in an empty directory and require the documented status: `matrix.sh posix SCRIPT` (11 interpreters) or `matrix.sh bash SCRIPT` (8 versions); expected `-> exit 79` everywhere.
- *Red:* yes. SB8/C16 (twin `contract-twin-explicit.sh` exit 79 on 11 of 11 POSIX and 8 of 8 bash; plants: default exit 1 on 19 of 19, `nullglob` exit 0 on 8 of 8 bash, `failglob` prints `no match: ./*.zzz` then `all inputs processed`, exit 0 on 8 of 8; on POSIX the two `shopt` plants exit 1 on 9 of 11 because `shopt` is not found). None of the plants returns 79.
- *Scope:* all shell scripts that glob. Fleet: 7 glob `for` loops in authored shell, 6 guarded or fixed-directory (`ocx-website/scripts/bin/oxc.sh:13-14`, `www-setup/tests/install/helpers/server.bash:363-364` guard with `[ -x "$f" ]`; `ocx/test/manual/scripts/setup-patches.sh:239` globs a committed directory, benign).

### E. Reading heuristics

**SH-ERR-23 · MUST** — Write the prologue and contract of the script's kind verbatim from this table.

| Kind | Prologue | Contract |
|---|---|---|
| Bash repo, dev or CI script | `#!/usr/bin/env bash` then `set -euo pipefail` (no `IFS` line) | `-e` is a net. Explicit `\|\| die`/`\|\| return` at fallible calls; `local x; x=$(…)`; no early-exit reader (SH-ERR-09); no glob `shopt` (SH-ERR-29); `shopt -s inherit_errexit` only when the header pins bash >= 4.4 |
| `#!/bin/sh` script | `#!/bin/sh` then `set -eu` | as above; pipefail only via SH-ERR-13; `shift` guarded; no `IFS=$'…'`; no `shopt` (SH-ERR-32) |
| Installer, bootstrap | `#!/bin/sh` then `set -u` (`set -eu` allowed) | explicit `cmd \|\| err "msg" N` at every fallible call; `main "$@"` last; the code is not correct only because `-e` fires |
| Sourced library, rc snippet, emitted code | none; no `exit`, no shared-signal traps, no glob `shopt` | `return` a status; probe the caller's flags (SH-ERR-11); must survive the caller's `set -eu` (ocx's emitted activation: 0 failures on bash 3.2.57-5.3.20 and zsh 5.0.8-5.9, plain and under `set -eu` [ocx §3]) |
| Verifier/gate script (output is the violation) | `#!/usr/bin/env bash` then `set -u` | no `-e`; see SH-ERR-24; exit table SH-ERR-25 |
| CI `run:` block | none to add on Linux (`bash -e {0}`); `shell: bash` adds `-eo pipefail` | SH-CI owns the semantics; only SH-ERR-09 applies to the body |

- *Why:* `-e` is off in the contexts that matter (SH-ERR-06/08), so the explicit check is the contract. The bootstrap exemplars drop `-e` on purpose: rustup (`set -u` plus `ensure`/`need_cmd`), Homebrew/install (`set -u` plus `abort`), git `t/` (`&&` chains and `--chain-lint`), nvm (sourced) [EM §12, ex axis 2]. Upstream installers split roughly evenly (deno, docker, k3s use `set -e`) so neither form is wrong; the explicit check is what is mandatory.
- *Check:* reading heuristic only: whether a call is fallible is semantic. The mechanical halves are SH-ERR-06, -08, -11, -12, -13, -29.
- *Red:* the halves, yes; the prologue text, no.
- *Scope:* all kinds listed.

**SH-ERR-24 · SHOULD** — A verifier script whose output is the violation uses `set -u` and no `-e`, and judges each tool by its exit status: grep 0 match, 1 none, >= 2 error; xargs 123; git 128. A canary proves the scan ran.
- *Why:* `grep -q nomatch file` is a normal outcome and aborts a `-e` script [EM §12]; the Swift checks work this way (`rules/swift-quality/checks/fold-check.sh:16`, `generated-touch.sh:12`, `k07.sh:108-117`).
- *Check:* reading heuristic (a `scan()`-style wrapper that fails on `rc -gt 1`).
- *Red:* no (reading only).
- *Scope:* verifier/gate scripts.

**SH-ERR-25 · SHOULD** — State the exit table in an `# Exit:` header and use the table of the script's kind. Shell CLI that mirrors a Rust tool: the cli-contract table (0, 1, 64, 65, 69, 74, 75, 77-82; new codes from 83; usage 64). Installer: 0-7, usage 2 (`www-setup/.claude/rules/installers.md:224-236`). **New gate/verifier script: the SH-GATE-08 table (0 clean, 1 findings, 69 tool missing, 78 config missing, 79 no input), plus the Rust-table 64/65 as needed.** The sysexits 66/70 carve-out (C-6) covers only the 16 existing `exit 66`/`exit 70` code sites in the 7 shipped Swift gate scripts and is frozen; no new file uses 66 or 70. Anything else: 0 and 1. A `# Exit:` header is required once a script uses any other code.
- *Why:* three tables exist in the fleet [TR §11]; the 128+N text belongs in the header: a status above 128 means "signal" only in the shell that reported it (SH-ERR-19). sysexits(3) itself calls the interface "deprecated … retained only for compatibility … discouraged", so it is a vocabulary, not a standard; 66-68 and 70-73 are "never claimed" in the Rust table. The 16 sites [SB §8]: 66 x11 (4 BASE does not resolve, 2 config file missing, 1 no input found, 4 `git diff` failed), 70 x5 (cannot run or cannot trust); 64 x4, 65 x1, 69 x1 are already in the Rust table. Renumbering is priced in C-6.
- *Check:* `G-EXIT66` (output is the violation; the 16 carve-out sites and comment lines are the allowed hits, scoped to new files by the reviewer); `grep -rL --include='*.sh' -e '^# Exit' .` lists scripts without a header, applied to scripts with non-0/1 exits (reading-grade); installer codes: `grep -nE 'err .* ([89]|[1-9][0-9]+)$'` (TV15).
- *Red:* yes. TV15, TV16; SB11/C14 (`x5/plant` 2 lines: `exit 66; }`, `exit 70; }`; `x5/twin` empty; over the lore tree it lists exactly the 16 code sites plus comment lines).
- *Scope:* all kinds. Fleet: only `www-setup/src/install.sh:27-36` documents a taxonomy (1 of 17 installers [inst §2a]); the Swift gates carry `# Exit:` headers.

**SH-ERR-26 · SHOULD** — Use no `trap … ERR` in `#!/bin/sh`. In bash use it only for diagnostics (`set -Eeuo pipefail; trap 'echo "line $LINENO: exit $?" >&2' ERR`), never for cleanup or control flow.
- *Why:* dash, yash and posh reject `ERR` (warning, no trap); bash's ERR skips `if`/`while` conditions, `||`, `&&`, `!`, `local x=$(false)` (and `( false )`/`(( ))`/`[[ ]]` on 3.2), is not inherited by functions without `-E`, and fires twice with `-E` [TR §10].
- *Check:* SC3047 under `-s sh`; `G-ERRTRAP` lists candidates in `.sh` files.
- *Red:* yes. TV2, TV12 (1 line / 0).
- *Scope:* sh and bash; zsh calls it `ZERR`. Fleet: 0 ERR traps.

**SH-ERR-27 · CONSIDER** — In zsh-targeted code keep `trap … EXIT` out of function bodies; scope strictness with `setopt local_options err_return`.
- *Why:* native zsh fires a function-scoped `EXIT` trap at function return, every other shell at shell exit [TR §3-4 findings, `exit-trap-in-func.sh`]; `err_return` restores on function exit (zsh 5.0.8-5.9) [EM §9].
- *Check:* reading. *Red:* measurement only. *Scope:* zsh scripts and bash code sourced into zsh (SH-ZSH owns the family).

**SH-ERR-28 · CONSIDER** — When a trap must act promptly, wait interruptibly (`cmd & wait $!`) instead of a bare foreground `sleep` or `curl`; keep cleanup free of network I/O.
- *Why:* a trap runs after the current foreground command finishes on every shell except ksh93; `wait $!` returns promptly with status > 128 [TR §9]; Git Bash 5.2.15 matches Linux bash (`wait-trap` rc 143, `got-TERM`; a background child ignores SIGINT, `wait` after INT returns 0) [SB12]. GitHub cancel allows about 7.5 s after SIGINT and 2.5 s after SIGTERM [C11].
- *Check:* reading. *Red:* measurement only (`fg-trap-deferral.sh`). *Scope:* long-running CI scripts.

### Gate commands (verbatim, as run; cwd = repo root; GNU grep)

```sh
# G-SIGPIPE  (SH-ERR-09)
grep -rlE --include='*.sh' --include='*.bash' --include='*.yml' --include='*.yaml' --exclude-dir='.git' -e 'pipefail' -e 'shell: bash' . | xargs -r grep -HnE -e '[|] *grep( +-[a-zA-Z]+)* +-[a-zA-Z]*[qm]' -e '[|] *rg( +-[a-zA-Z]+)* +-[a-zA-Z]*[qm]' -e '[|] *head' -e '[|] *grep( +-[-a-zA-Z=0-9]+)* +--quiet' -e '[|] *grep( +-[-a-zA-Z=0-9]+)* +--silent' -e '[|] *grep( +-[-a-zA-Z=0-9]+)* +--max-count'
# G-EVAL  (SH-ERR-10; extended 2026-10-11 with the exec alternative; [SB] calls it G-MASK)
grep -rnE --include='*.sh' --include='*.bash' --exclude-dir='.git' -e '^eval[[:space:]]+"[$][(]' -e '[[:space:];&]eval[[:space:]]+"[$][(]' -e 'cd[[:space:]]+"[$][(]git ' -e 'cd[[:space:]]+"[$][(]realpath ' -e 'cd[[:space:]]+"[$][(]mktemp ' -e '^[[:space:]]*exec[[:space:]].*"[$][(]' .
# G-LIB  (SH-ERR-11)  replace lib with every directory or file that is only sourced
grep -rnE --include='*.sh' --exclude-dir='.git' -e '^[[:space:]]*set[[:space:]]+[-+][a-zA-Z]*[eu]' -e '^[[:space:]]*set[[:space:]]+[-+]o[[:space:]]+errexit' -e '^[[:space:]]*set[[:space:]]+[-+]o[[:space:]]+nounset' -e '^[[:space:]]*set[[:space:]]+[-+]o[[:space:]]+pipefail' lib
# G-NOUNSET  (SH-ERR-12)
grep -rlE --include='*.sh' --include='*.bash' --exclude-dir='.git' -e 'set -[a-z]*u' -e 'set -o nounset' . | xargs -r grep -HnE -e '[^+]"[$][{][A-Za-z_][A-Za-z_0-9]*\[@\]\}"' -e '^"[$][{][A-Za-z_][A-Za-z_0-9]*\[@\]\}"'
# G-SHPF  (SH-ERR-13)
grep -rlE --include='*.sh' --exclude-dir='.git' -e '^#![ ]*/bin/sh' -e '^#![ ]*/usr/bin/env sh' . | xargs -r grep -HnE -e 'pipefail' | grep -v -e '(set -o pipefail)' -e ':[0-9]*:[[:space:]]*#'
# G-ARITH  (SH-ERR-14)
grep -rnE --include='*.sh' --include='*.bash' --exclude-dir='.git' -e '^[[:space:]]*\(\([[:space:]]*[A-Za-z_][A-Za-z_0-9]*(\+\+|--)[[:space:]]*\)\)[[:space:]]*(#.*)?$' -e '^[[:space:]]*let[[:space:]]+[A-Za-z_][A-Za-z_0-9]*(\+\+|--)([[:space:]]|$)' .
# G-MKTEMP  (SH-ERR-15)
grep -rl --include='*.sh' --include='*.bash' --exclude-dir='.git' -e mktemp . | xargs -r grep -L -e 'trap'
# G-RET  (SH-ERR-16)
grep -rnE --include='*.sh' --include='*.bash' --exclude-dir='.git' -e "trap[[:space:]]+([A-Za-z_][A-Za-z_0-9]*|'[^']*'|\"([^\"\\\\]|\\\\.)*\")[[:space:]]+(EXIT|0)[[:space:]]+.*(INT|TERM|HUP)" -e "trap[[:space:]]+([A-Za-z_][A-Za-z_0-9]*|'[^']*'|\"([^\"\\\\]|\\\\.)*\")[[:space:]]+.*(INT|TERM|HUP)[[:space:]]+.*(EXIT|0)([[:space:]]|\$)" .
# G-BARE  (SH-ERR-16)
grep -rnE --include='*.sh' --include='*.bash' --exclude-dir='.git' -e "trap[[:space:]]+'([^']*[;[:space:]])?exit[[:space:]]*;?'" -e "trap[[:space:]]+\"([^\"]*[;[:space:]])?exit[[:space:]]*;?\"" .
# G-DIE  (SH-ERR-17)
grep -rnE --include='*.sh' --include='*.bash' --exclude-dir='.git' -e '[$][(][^)]*[[:space:];|&(]die[[:space:]]' .
# G-RESERVED  (SH-ERR-18)
grep -rnE --include='*.sh' --include='*.bash' --exclude-dir='.git' -e '(^|[^A-Za-z_])exit[[:space:]]+(12[3458]|2[0-9][0-9])([^0-9]|$)' .
# G-LIT  (SH-ERR-19)
grep -rnE --include='*.sh' --include='*.bash' --exclude-dir='.git' -e '-eq[[:space:]]+"?(129|1[3-5][0-9])"?([[:space:]]|\]|;|$)' -e '[[:space:]](==|=)[[:space:]]+"?(129|1[3-5][0-9])"?([[:space:]]|\]|;|$)' -e '^[[:space:]]*(129|1[3-5][0-9])\)' .
# G-IFS  (SH-ERR-03)
grep -rn --include='*.sh' --include='*.bash' --exclude-dir='.git' -e 'IFS=[$][^({a-zA-Z_]' .
# G-DOLLARQ  (SH-ERR-04)
grep -rnE --include='*.sh' --exclude-dir='.git' -e '[$][(][^)]*[)][^$=]*[$][?]' .
# G-ERRTRAP  (SH-ERR-26)
grep -rn --include='*.sh' --exclude-dir='.git' -e 'trap .* ERR' .
# G-SHOPT  (SH-ERR-29; column 0 only, an indented shopt in a function body is SH-ERR-30's leak-check)
grep -rnE --include='*.sh' --include='*.bash' --exclude-dir='.git' -e '^shopt[[:space:]]+-s[[:space:]].*nullglob' -e '^shopt[[:space:]]+-s[[:space:]].*failglob' .
# G-EXIT66  (SH-ERR-25; the 16 carve-out sites and comment lines are the allowed hits)
grep -rnE --include='*.sh' --exclude-dir='.git' -e 'exit[[:space:]]+(66|70)([^0-9]|$)' .
```

### Runs made for this consolidation (2026-10-11, fixtures in `C_F`; C12-C20 are the revision's re-runs of [SB] checks, fixtures in `SB_F`, nothing written)

| ID | Fixture (red / green) | Command | Result |
|---|---|---|---|
| C1 | `ret-bad.sh` / `ret-good.sh` | `matrix.sh posix FILE` | red: `CLEANUP SURVIVED CLEANUP`, exit 0 on 11/11; green: `CLEANUP`, exit 143 on 11/11 |
| C2 | `TR_F/lint/bad/handler-no-exit.sh`, `handler-no-exit2.sh`, `handler-k3s-style.sh` / `lint/good/handler-exit.sh`, `handler-reraise.sh` | `sh sigprobe.sh TERM FILE dash` and `bash` | red x3 on both: `VIOLATION: exit 0 after SIGTERM`, probe exit 1; green x2 on both: `ok: exit 143, cleanup done`, probe exit 0 |
| C3 | `tree/bad` / `tree/good` plus the `EM_F/tree` and `TR_F/lint` trees | `run-doc-gates.sh DIR` (every gate command above) | red 1-4 lines, green 0 lines for all 15 gates: RET 4/0, BARE 2/0, ARITH 2/0, DIE 2/0, RESERVED 2/0, LIT 2/0, MKTEMP 1/0, plus EVAL 2, SIGPIPE 4, NOUNSET 2, SHPF 1, IFS 1, DOLLARQ 2, LIB 2, ERRTRAP 1 on the dives' trees |
| C4 | `arith-bad.sh` / `arith-good.sh` | `matrix.sh bash FILE` | red: exit 1 on 4.2, 4.4, 5.0-5.3, `after-arith i=1` exit 0 on 3.2 and 4.0; green: exit 0 on 8/8 |
| C5 | `arr-bad.sh` / `arr-good.sh`, `at.sh` | `matrix.sh bash FILE` | red: `args[@]: unbound variable`, exit 1 on 3.2, 4.0, 4.2, `[x] n=0` on 4.4-5.3; green: exit 0 on 8/8; `at.sh`: `"${@}"` empty fails on 3.2 only, `"$@"` passes on 8/8 |
| C6 | `shpf-bad.sh` / `shpf-good.sh` | `matrix.sh posix FILE` | red: dash 0.5.12 exit 2 (`Illegal option -o pipefail`), posh exit 1 (`pipefail: bad option`), other 9 reach the echo; green: exit 0 on 11/11 |
| C7 | `shopt-plain.sh`, `shopt-bare.sh`, `shopt-sub.sh`, `sub-or-ctx.sh` | `matrix.sh bash FILE` | plain `x=$(f)`: `f-continued`, exit 0 on 8/8; bare `shopt -s inherit_errexit`: exit 1 on 3.2/4.0/4.2 (invalid shell option name) and 4.4-5.3; `x=$(set -e; f)`: exit 1 on 8/8; `x=$(set -e; f) \|\| echo caught`: `caught` on 3.2, `f-continued` on 4.0-5.3 |
| C8 | `sc2311-*.sh` (four headers) | `run.sh shellcheck --norc -o check-set-e-suppressed -f gcc` | SC2311 for `set -e` and `set -eu`; nothing (exit 0) for `set -eo pipefail` and `set -euo pipefail` (ShellCheck 0.11.0) |
| C9 | `EM_F/verify.sh`, `TR_F/verify.sh` | `bash verify.sh` | all seven [EM] greps and the [TR] greps V6-V17 re-ran red/green as recorded; ShellCheck V1-V5b exit 1/0 as recorded; V8 term/raise as recorded |
| C10 | the 197 authored fleet files (`EM_F/authored_files.txt`), read-only | `bash gates.sh fleet` | RET 7 lines in 6 files; BARE 0; ARITH 0; DIE 0; LIT 1; RESERVED 1 (a comment); MKTEMP 3 files |
| C11 | GitHub docs page `workflow-cancellation`, fetched | WebFetch | SIGINT, 7500 ms, SIGTERM, 2500 ms, process tree killed; 5-minute server-side cap |
| C12 | `SB_F/x4/plant`, `x4/twin`; `EM_F/tree/bad`, `good` | G-EVAL as extended, one operand per run | plant 3 lines (`eval "$(tool init bash)"`, `cd "$(git rev-parse --show-toplevel)"`, `exec ./prog "$(wslpath -w scenes)" "$@"`), grep exit 0; twin 0 lines, exit 1; `tree/bad` still 2 lines, `tree/good` 0 |
| C13 | `SB_F/globs`: `plant-prologue.sh`, `contract-plant-nullglob.sh`, `contract-plant-failglob.sh` / `twin-contained.sh`, `contract-twin-explicit.sh`, `plant-leaky-lib.sh`, `twin-restore-lib.sh` | G-SHOPT, one file per run | red: `3:shopt -s nullglob failglob`, `3:shopt -s nullglob`, `3:shopt -s failglob`; green: 0 lines for the two twins; `plant-leaky-lib.sh` (indented `shopt` in a function) also 0 lines, the stated limit |
| C14 | `SB_F/x5/plant`, `x5/twin` | G-EXIT66 with the `([^0-9]\|$)` terminator | plant 2 lines (`exit 66; }`, `exit 70; }`), exit 0; twin empty, exit 1 |
| C15 | `plant-leaky-lib.sh collect` / `twin-restore-lib.sh collect`; `shopt-leak.sh` | `matrix.sh bash leak-check.sh LIB FUNC`; `matrix.sh bash shopt-leak.sh` | red: `LEAK: nullglob is on after collect`, exit 1 on 8/8; green: `ok: no shopt leaked`, exit 0 on 8/8; `shopt-leak.sh`: nullglob on after a leaking function and after `local -`, off after a subshell function and a save/restore function, 8/8 |
| C16 | `SB_F/globs/contract-*.sh` | `matrix.sh posix\|bash FILE` | twin exit 79 on 11/11 and 8/8; default plant exit 1 on 11/11 and 8/8; `nullglob` and `failglob` plants exit 0 on 8/8 bash, and on POSIX exit 0 on 2 (bash `--posix`) and 1 on 9 (`shopt` not found) |
| C17 | `repro-run-gate.sh`, `-twin.sh` (repaired callee plus directive), `-twin2.sh` (`set +e` form), and the repaired callee without a directive piped on stdin | `run.sh shellcheck --norc -o check-set-e-suppressed -f gcc`; `docker run bash:3.2 / bash:5.3 bash repro-run-gate.sh` | plant SC2310 exit 1; repaired callee **without a directive still SC2310, exit 1**; directive twin and `set +e` twin exit 0; behaviour `gate ran with -OcxBin=[]` `rc=0` on bash 3.2 and 5.3 |
| C18 | `SB_F/sig.sh`, `sig-native.ps1`, `sigdecode.sh` | `matrix.sh win sig.sh`, `matrix.sh win sig-native.ps1`, `matrix.sh win\|bash sigdecode.sh` | Git Bash 5.2.15: handlers 130/143/129, untrapped self-signal 130/143/129, bare `exit` rc 0, returning handler rc 0 `CLEANUP~SURVIVED~CLEANUP~`, `kill -l 271` invalid; Windows PowerShell 5.1 as parent: `exit 143` 143, `exit 130` 130, untrapped TERM 3840, INT 512, HUP 256, KILL 2304, re-raised TERM 3840, INT 512, handler `exit 143` 143; the decode prints identical lines on Git Bash and on all 8 bash versions, naive `kill -l 3840` and `512` invalid |
| C19 | `SB_F/reraise/run-reraise2.sh` (Docker) | the script, 5 images | `v-func`: `CLEANED DIED-OF-SIGNAL 1/2/15` on 6 of 6 interpreters x 3 signals; `v-inline`: ksh93u+m 1.0.10 `EXITED 1` for HUP and TERM, INT dies of 2, the other five die of the signal; `v-hard`: `EXITED 129/130/143` everywhere; `v-nopt` TERM: `CLEANED` x27,569 then SIGSEGV on dash, x8,872 on busybox ash 1.37 (alpine:3.22), x5,690 on bash 5.3, bash 3.2 `CLEANED` x2 then `EXITED 143`, ksh `EXITED 1` |
| C20 | `SB_F/verify-local.sh`; `rc-tree/sub/new.sh` with `--rcfile` of a two-key file | `bash verify-local.sh`; `run.sh shellcheck -f gcc` | V1 counter plant exit 1 / twin 0; V2 G-MASK 3 lines / 0; V3 G-SHOPT 1 line / 0; V4 G-EXIT66 2 lines / 0; V5 SC3044 exit 1 / 0; V6 SC2310 only under `set -e`; V7 nested rc: `top.sh` SC2310 SC2311, `sub/new.sh` SC2312 only; the two-key `--rcfile` (a proxy for a nested two-key rc) gives SC2310 SC2311 SC2312 |

Not re-run here (taken from the dives' measurements): the EXIT-on-signal table (TR §3), bare-`exit` conformance (TR §7), signal-status table (TR §1), the per-shell errexit pin (EM §1), the SIGPIPE race sizes (EM §7); from [SB]: the burn-down counts and the 62-site census (`burndown.py`, `census.py`, 6 min), the 40-site sample, the glob effect matrix (`glob.sh`, SB §4) and failglob control flow, the dangling-symlink guard (SB14), the Cygwin `pinfo.cc` read, the exit 66/70 site counts (SB §8). C19 and C15 re-ran the bash 3.2/5.3 and 8-version halves; the Cygwin byte-swap is read, the 3840/512 statuses are measured.

## Applied to the fleet and exemplars

**Already satisfied.**
- **SH-ERR-01, -02, -14, -17, -26:** 0 authored `local x=$(…)` (SC2155 0), 0 `SIG`-prefixed names, 0 arithmetic-statement hits, 0 `die` in `$( )`, 0 ERR traps [fleet Axis 4, C10].
- **SH-ERR-23 by kind:** `set -euo pipefail` in 136 of 197 authored files (88% of bash, 63 of 82 without ocx's identical doc snippets), `set -eu` in all 17 strict `#!/bin/sh` scripts with pipefail in none [fleet Axis 4]; `www-setup/src/install.sh:37` (`-eu`, `err()` at :147-150, `main "$@"` last, header taxonomy); the Swift gate scripts use `set -u` only (`fold-check.sh:16`, `k07.sh:108-117`); rustup `set -u` plus `ensure` (`rust-lang/rustup@61271d00a979:rustup-init.sh:29,646-657`), Homebrew `set -u` plus `abort` (`Homebrew/install@8ab1549dfa11:install.sh:7`), git `t/` `&&` chains.
- **SH-ERR-11:** nvm (`nvm-sh/nvm@b1b3a0038c06:nvm.sh:3877-3905`) probes and restores `-e`; ocx's emitted hooks trap `EXIT` only when free (`hook.rs:213`) and survive `set -eu` on bash 3.2.57-5.3.20 and zsh 5.0.8-5.9 [ocx §3]; the ocx launcher propagates the child's status via `exec`.
- **SH-ERR-12:** `golden-baseline.sh:148-153` (guarded idiom with the floor in a comment), `tsan-check.sh`. **SH-ERR-09:** `setup-grimoire/.github/scripts/install.sh:106` uses `-print -quit`, not `| head -1`. **SH-ERR-21:** 26 bare `shift`s, all guarded by position. **SH-ERR-25:** `www-setup` taxonomy, Swift `# Exit:` headers; `oxc.sh` 127 shim.
- **SH-ERR-29, -30, -31, -32:** 0 authored or agent-config files use `nullglob`, `failglob` or `setopt nullglob`; 7 glob `for` loops in authored shell, 6 guarded or fixed-directory (`ocx-website/scripts/bin/oxc.sh:13-14`, `www-setup/tests/install/helpers/server.bash:363-364`); upstream containment at `fzf@25adb674537b:shell/completion.bash:538-546` and `shellspec@f2d13f991885:lib/general.sh:790-799`; `shellspec-inspection.sh:189` probes `shopt` before use.

**Violated** (reported, not fixed; owner Q6).

| Rule | Site | Severity |
|---|---|---|
| SH-ERR-16 (returning handler) | `grimoire/docs/public/install.sh:24` (copies: `setup-grimoire/site/sh:24`, grimoire-duo), `www-setup@a251c3631047:src/install.sh:718,794`, `scripts/gen-dist.sh:192`, `scripts/publish-dist.sh:64`, `tests/ci/install-ocx.sh:66`, plus `uv/agents/scripts/load-github-action-thread.sh:96` [C10, TR exemplar]. Under `set -eu` the next failing command masks it; `fetch_dist … \|\| err … 3` turns Ctrl-C into rc 3 (`TR_F/wsetup-repro2.sh`) | medium: installers, user-visible |
| SH-ERR-06 / -07 | `ocx/test/manual/run-windows-activation.sh:39-46,70,77` (defect: `run_gate … \|\| _rc=$?` runs the gate with an empty `-OcxBin` when `wslpath` fails; reproducer `SB_F/repro-run-gate.sh`, bash 3.2-5.3 print `gate ran with -OcxBin=[]  rc=0`) [EM §14, SB §1]; `www-setup/src/install.sh:799` (latent: `_pin=$(dist_pin_digest "$_url")` at :514 is an unchecked step ahead of `verify_checksum`; `dist_pin_digest` ends in `sed -n` and cannot fail today; no reproducer) | low: manual harness; latent |
| SH-ERR-09 | `ocx/test/manual/announce-e2e/scripts/run_sequence.sh:111`, `run_machine_lane.sh:33` (`curl … \| grep -q` under pipefail; curl returns 23 on a large body); `env.sh:244-245` (`! gh pr checks … \| grep -qxE …` reports "settled" when `gh` fails; moved here from SH-ERR-06, C-14; reproducer `fleet-checks-settled.sh`) [EM §14]; upstream: `direnv/script/prepare-release.sh:38,68`, `atuin/scripts/release.sh:296,472`, `dotnet/install-scripts@e5cf1dd2d154:src/dotnet-install.sh:1210`, `actions/runner-images` `ubuntu-slim/test.sh:112-115` | low |
| SH-ERR-03 | 25 authored bash files carry `IFS=$'\n\t'` (e.g. `setup-grimoire/.github/scripts/install.sh:10`, `index/scripts/smoke-test.sh`), mandated by `quality-bash.md` in 4 repos [EM §10, cfg §5.2] | low; fix by replacing the rule |
| SH-ERR-10 | 6 `eval "$(ocx …)"` doc snippets in `ocx/test/doc_scripts/` (exempt: they mirror the rc idiom); `arcana/nox/scripts/release_gate.sh:12` (`cd "$(git rev-parse --show-toplevel)"`) and `fma/run.sh:14` (`exec … "$(wslpath -w scenes)" "$@"`) are the two real sites [SB §1]; about 7 latent `"X_FQ=$(fq …)"` arguments (`ocx/test/manual/scripts/bootstrap.sh:176`, `setup-integrations.sh:130`) are outside the grep | low |
| SH-ERR-12 (latent) | `index@9eba2cc3929b:scripts/golden-baseline.sh:186,291-299`, `smoke-test.sh:447` | latent |
| SH-ERR-11 | `ocx@a23ec5be2939:test/manual/announce-e2e/scripts/env.sh:24` | neutral today |
| SH-ERR-15 | `grimoire-indexer/templates/ci/gitlab-enrich.sh`, `ocx/test/manual/measure-index-clone.sh`, `www-setup/tests/docker/install-shells.sh` [C10] | low |
| SH-ERR-19 | `rules/swift-quality/checks/tsan-check.sh:34` | documented `timeout` contract |
| SH-ERR-25 (frozen carve-out) | 16 `exit 66`/`exit 70` code sites in 7 shipped scripts of `rules/swift-quality/checks/`: `generated-touch.sh`, `silence-check.sh`, `weaken-check.sh`, `never-gate.sh`, `swiftlint-gate.sh`, `fold-check.sh`, `tsan-check.sh` [SB §8] | accepted; no new sites |
| SH-ERR-07 | no `.shellcheckrc` in 149 repos; the ocx gate runs `shellcheck -S warning`, which hides SC2310 [cfg §6, GATE] | gate gap |
| Upstream exemplars of SH-ERR-16 | `k3s-io/k3s@82a6ddcd820b:install.sh:346-357` (`code=$?`-style handler exits 0 on SIGTERM), `docker/docker-install@2b32480025b2:rootless-install.sh:265`, `fish-shell/fish-shell@ac50fe526f74:build_tools/check.sh:73` | n/a |
| Upstream exemplars of SH-ERR-29/30 | `direnv/direnv@28a73d1df3f3:stdlib.sh:12` and `oils-for-unix/oils@57d3f0d088c3:soil/web.sh:12` (top level); `devtools/format.sh:118`, `test/syscall.sh:342` (function, no restore) | n/a |

**New commitments for the fleet.**
1. `.shellcheckrc` carries `enable=check-set-e-suppressed`, no severity floor and no `check-extra-masked-returns` ([GATE] SH-GATE-02 as four keys per map X4); each SC2310 hit gets a per-site directive with its reason or a restructured call (SH-ERR-07); `G-EVAL` as extended runs in the gate.
2. Every installer and gate script gets an `# Exit:` header; `www-setup` is the reference taxonomy; the Swift gates already comply. New gates use the SH-GATE-08 table; the 16 `exit 66/70` sites stay frozen unless the owner chooses the renumbering of C-6.
3. The www-setup, grimoire and setup-grimoire installers move to the SH-ERR-15/-16 handler form on the owner's say-so; `TR_F/wsetup-repro*.sh` and `C_F/ret-bad.sh` are the reproducers.
4. ocx's emitter keeps the strict-mode floor test (`floor.sh … strict`, 0 failures) in its suite and keeps "trap `EXIT` only when free" in the bash arm.
5. Workflows with `shell: bash` run `G-SIGPIPE` over their `run:` bodies (SH-CI wires it).
6. `quality-bash.md` copies in grimoire, index, ocx and grimoire-vscode are replaced by `shell-quality` (M-X-06): the `IFS` mandate, the `[ ]` ban and the bare empty-array advice are all overturned here or in SH-DIAL.
7. Any script that traps gets a signal test (the `sigprobe.sh` shape) in its suite; SH-TEST owns where it runs.
8. New-code directories that want SC2312 add a nested `.shellcheckrc` that repeats every root key (SH-ERR-33); a library that wraps a glob in `shopt` ships a `leak-check.sh`-shaped test (SH-ERR-30).

## AI-agent failure modes

Ranked by measured incidence where one exists (fleet or exemplar counts), otherwise by consequence; no per-agent frequency was measured. Rows 20-31 were added by the 2026-10-11 revision.

| # | Mistake | Basis | Mechanical check |
|---|---|---|---|
| 1 | Treats `set -euo pipefail` as the whole error model; no `\|\| die`/`\|\| return`; assumes `$( )` and functions-in-conditions abort | SC2310 x62 sites in 9 files (2 defects, 1 latent) | SH-ERR-06 (SC2310), SH-ERR-08 (`matrix.sh bash`) |
| 2 | `trap cleanup EXIT INT TERM [HUP]` or `trap '…' EXIT INT TERM` copied from the top search results | 6 fleet files, k3s, docker, fish; exits 0 on 11/11 | `G-RET`, `sigprobe.sh` |
| 3 | `local x=$(cmd)` as the default idiom | 527 exemplar lines; fleet 0 | SC2155 |
| 4 | `trap 'cleanup; exit' INT TERM` | status of the last trap command on bash <= 5.2, posh, zsh | `G-BARE` |
| 5 | `cmd \| grep -q` / `echo "$v" \| grep -q` under pipefail; passes tests with small data | 20 sites in exemplars; 3 fleet | `G-SIGPIPE` |
| 6 | `set -euo pipefail` in a `#!/bin/sh` script | dash 0.5.12-2/-6ubuntu5 exit 2, posh exit 1 | SC3040, `G-SHPF`, `matrix.sh posix` |
| 7 | `(( i++ ))` / `((count++))` as a counter under `-e` | aborts bash 4.2-5.3 at 0 | `G-ARITH` |
| 8 | `"${arr[@]}"` under `-u` in a script that reaches macOS `/bin/bash` | 3.2.57 `unbound variable`; ~55 static fleet candidates | `G-NOUNSET`, `bash:3.2` run |
| 9 | `IFS=$'\n\t'` from the "unofficial strict mode" article | breaks `read`, `"$*"`; wrong bytes on dash/yash/posh | SC3003, `G-IFS` |
| 10 | `die` that echoes to stdout, called inside `$( )` | continues with rc 0 | `G-DIE`, SH-ERR-20 run |
| 11 | `eval "$(tool init …)"`, `cd "$(git …)"` or `exec prog "$(cmd)"` in a script | `eval ""` succeeds; 2 real fleet sites | `G-EVAL` |
| 12 | A sourced library that starts with `set -euo pipefail` | flips the caller | `G-LIB` |
| 13 | `cmd; if [ $? -ne 0 ]`; `echo "$(f) $?"` | SC2181; clobbered `$?` | SC2181, `G-DOLLARQ` |
| 14 | Invents exit codes (9, 42, 200) and compares `$?` to 130/143 | collides with xargs/timeout/signals; wrong on ksh93u+m, yash | `G-RESERVED`, `G-LIT` |
| 15 | `shift \|\| true`, `: ${1:?}` | dash/ksh93u+m abort anyway | `matrix.sh posix shift.sh` |
| 16 | `trap … ERR` as "robust handling" in `#!/bin/sh` or for cleanup | dash/yash/posh ignore it | SC3047, `G-ERRTRAP` |
| 17 | `mktemp` with no `trap`; or asserting "cleanup runs on Ctrl-C" from reading the code | 3 fleet files; only a signal probe proves it | `G-MKTEMP`, `sigprobe.sh` |
| 18 | `A && B \|\| C` as if/else | SC2015 silent for `\|\| echo`, `\|\| exit` | SC2015 plus reading |
| 19 | PowerShell: `$ErrorActionPreference = 'Stop'` and expecting `curl.exe`/`git` failures to throw; fish: expecting an abort; nu/elvish: expecting continuation | PS continues on 5.1 and 7.x without `$PSNativeCommandUseErrorActionPreference` (7.4 and later) | `matrix.sh pwsh native-fail.ps1`; PS-ERR; [EM §13] |
| 20 | Adds `shopt -s nullglob` (or `failglob`) to the "strict mode" prologue because a blog post lists it beside `set -euo pipefail` | 0 fleet files; direnv `stdlib.sh:12`, oils `soil/web.sh:12` upstream | `G-SHOPT` (not ShellCheck) |
| 21 | Believes `shopt -s failglob` stops the script when nothing matches; ships exit 0 with a stray error line | skips only the failing command or list; exit 0 without `set -e` | `matrix.sh bash` of the contract script in an empty dir; expect 79 (SH-ERR-31) |
| 22 | Wraps `shopt -s nullglob` in a function or `local -` and assumes it is scoped | leaks on 8 of 8 bash | `leak-check.sh LIB FUNC` (SH-ERR-30) |
| 23 | `rm`/`ls`/`grep`/`find` after a nullglob with a glob that can be empty | lists or deletes the cwd, reads stdin (8 of 8) | none; SH-ERR-29 |
| 24 | Puts `shopt` (or `[[ ]]`/arrays next to it) in a `#!/bin/sh` script, or treats `shopt: not found` as noise | exit 0 on 9 of 11 interpreters without `set -e` | SC3044, SC3010, SC3054 under `shellcheck -s sh` |
| 25 | Guards a glob loop with `[ -e "$f" ] \|\| continue` and thinks dangling symlinks are handled | `processed=0` on bash 5.3 and dash | the `-L` form of SH-ERR-31; reading |
| 26 | Fixes the callee with `\|\| return` and expects SC2310 to go away, deletes `set -e`, or file-scope disables SC2310 | the call site stays red; a file-scope disable would hide the 2 real sites in `run-windows-activation.sh` | the rc diff; a per-site directive with a reason (SH-ERR-07) |
| 27 | Adds `enable=check-extra-masked-returns` "for safety", then blanket-disables SC2312 to get green | 191 sites, 2 strict | the rc diff; `G-EVAL` is the narrower check |
| 28 | Copies a re-raise without `trap - SIG`, or writes it as an inline string and tests only on bash | SIGSEGV loop (5.7k-27.6k handler runs); inline exits 1 on ksh93u+m 1.0.10 | `run-reraise2.sh`, `matrix.sh posix` |
| 29 | On Windows trusts `$?` > 128 and decodes with `kill -l "$rc"`, or hard-codes 137/143 for a Git Bash child seen through PowerShell, cmd or node | native parent sees 3840/512/256; `kill -l 3840` is invalid | `sigdecode.sh`; SH-ERR-19 decode |
| 30 | Chooses exit codes from memory (66 for "no input", 70 for "internal error") because sysexits looks official | 16 sites in 7 Swift gates; sysexits is deprecated | `G-EXIT66`; the SH-GATE-08 table |
| 31 | Assumes macOS `/bin/bash` 3.2 lacks `nullglob`/`failglob` | both exist (`failglob` since 3.0); the real 3.2 gaps are empty arrays under `set -u` and `local -` | `matrix.sh bash` |

## Open questions

**Owner decisions** (default the program applies):
1. **SC2312 in the shipped `.shellcheckrc`.** [GATE] G1 ships both `enable=` lines; this file demotes SC2312 (C-1) and the map's X4 adopts that. The burn-down now prices the alternative: 191 sites in 55 files, 2 strict defects, no baseline option. *Default:* `check-set-e-suppressed` in the rc (SH-ERR-07), `check-extra-masked-returns` left out, `G-EVAL` in its place, SC2312 only in new-code directories (SH-ERR-33).
2. **Gate-script exit carve-out.** The Swift checks use 64/65/66/69/70; the Rust table says 66 and 70 are never claimed; SH-GATE-08 uses 69/78/79. *Default (map X5):* SH-GATE-08 for every new gate, the carve-out frozen to the 16 existing sites (SH-ERR-25). Renumbering costs 16 code lines, 23 doc lines in 8 files, a new SH-GATE-08 row for "tool ran, result untrustworthy" and a major bump of two published packages (C-6).
3. **The 6 returning-handler fleet files and the `ocx/test/manual` defects** (`env.sh:244-245`, `run-windows-activation.sh:70,77`, `run_sequence.sh:111`, `run_machine_lane.sh:33`) **plus the two SH-ERR-10 sites** (`arcana/nox/scripts/release_gate.sh:12`, `fma/run.sh:14`). Owner Q6 says report, not fix. *Default:* the program files nothing; the reproducers stay in `TR_F`, `C_F` and `SB_F` (`repro-run-gate.sh`, `x4/plant/guard.sh`).
4. **`eval "$(ocx …)"` in ocx's user-guide doc snippets** (they mirror the rc idiom users type). *Default:* leave them; SH-ERR-10 exempts the interactive-rc form.
5. **Whether `check-set-e-suppressed` should be MUST for new and touched repos** (as [GATE] states) rather than SHOULD. *Default:* the rc entry is mandatory (gate), answering each hit stays SHOULD; the census prices the repo-wide cost at 62 permanent annotation sites in 9 files.

**Index-level reconciliation owed by this revision** (not research): SH-EXP-21 in `shell-expansion.md` takes the reworded text of C-12 (its "function" half is wrong and its guard lacks `|| [ -L ]`); SH-EXP-20 stays a pointer to SH-ERR-12.

**Another research round** (subarea: question):
- **`lastpipe` in a hardened bash prologue (M-B-19, remainder):** does `shopt -s lastpipe` belong anywhere beyond BVG-14's ban on a 3.2 floor, and what does it do to SH-ERR-17's last-stage `exit`? The nullglob/failglob half is answered (SH-ERR-29..31); `lastpipe` was not researched.
- **Unguarded glob loops in the 41 exemplars:** none was scanned (SH-ERR-31 fleet evidence is 7 loops).
- **Cleanup models of fish, nushell, elvish and PowerShell** (`--on-event fish_exit`/`--on-signal`, nu `try`/`complete`, elvish `try`, pwsh `try/finally` and `trap`): TR excluded them; they belong to SH-FISH/NU/ELV and PS-ERR.
- **Re-measure on release:** bash 5.3 interp 1602 (bare `exit` in a trap) and yash 2.61 follow POSIX-2024, zsh 5.10 is a draft; dash 0.5.13 `$'…'`/pipefail; ShellCheck master relaxes SC3040/SC3003, SC2337 is unreleased, and its data-flow engine may change the SC2310/SC2312 counts (re-run `burndown.py` on each release); Cygwin/MSYS status bytes on a newer Git for Windows. Re-run `TR_F/exit-in-trap.sh`, the SC3040 plants and `SB_F/burndown.py` on each.
- **FreeBSD `sh` and macOS `/bin/sh` (bash 3.2 `--posix`) trap, signal-status and glob rows** are read-only here; only bash 3.2 via Docker was measured.

## Revision log

2026-10-11, folding in [shell-errexit/shopts-and-burndown.md](shell-errexit/shopts-and-burndown.md). Existing IDs keep their number and meaning; 29-33 are new.

- **SH-ERR-07** text changed: "`|| return`" alone no longer reads as sufficient, a per-site directive is required, file-scope disables are named as wrong, counts move from 13 of 15 to 59 of 62 benign, gradual-adoption options named. Why: SC2310 stays red on a repaired callee [C17, SB2].
- **SH-ERR-06** check clarified: SC2310 is a call-site detector and its green twin is "call outside the condition" or a directive, never "callee repaired". Why: overclaim fixed (the first-pass wording implied `|| return` silences it).
- **SH-ERR-08** check: the fleet's SC2311 count of 0 is a false 0 under `-euo pipefail` headers. Why: [SB §2] reproduced [C8].
- **SH-ERR-10** extended to `cd "$(realpath|mktemp …)"` and `exec prog "$(cmd)"`; `G-EVAL` gains an `exec` alternative (named G-MASK in [SB]); fleet hits 7 to 8 (adds `fma/run.sh:14`). Why: the two real SC2312 shapes are covered by one grep [SB4, C12].
- **SH-ERR-16** Windows row added (Git Bash 5.2.15 handlers 130/143/129 for a bash parent, `signal<<8` for a native parent; the ban on the returning handler holds). Why: [SB12, C18].
- **SH-ERR-19** rewritten: signal numbers above 15 are never hard-coded, a bash two-branch decode serves Windows native parents, plain `kill -l "$rc"` stays for ksh93u+m and yash. Why: the first-pass `-gt 128` plus `kill -l` overclaimed on Git Bash (C-15) [SB13].
- **SH-ERR-22** *Why* corrected (ksh93u+m 1.0.10 inline form exits 1, not 0; C-13), the trap reset before `kill` made an explicit load-bearing requirement with its failure counts, and a Windows scope line added. Why: [SB §7, SB10, C19].
- **SH-ERR-25** gate row now cites SH-GATE-08; the 66/70 carve-out is frozen to 16 named sites; `G-EXIT66` added. Why: map X5 owner default [SB §8, SB11].
- **SH-ERR-18** scope note: `never-gate.sh:8-9` documents `xargs`' 123, not an `exit 123`, so it is allowed. **SH-ERR-12** scope note: glob-filled arrays need the guard on 3.2-4.2. **SH-ERR-11** and **SH-ERR-23** carry a pointer to SH-ERR-29 (shopt state is shared like option state). **SH-ERR-28** notes Git Bash matches Linux. Why: [SB §4, §6, §8], no change of meaning.
- **SH-ERR-29..33 added** (29 no top-level `nullglob`/`failglob`; 30 contain a glob shopt; 31 explicit empty-glob contract and exit status; 32 no `shopt` in `#!/bin/sh`; 33 nested rc repeats every root key). Why: M-B-19 and SH-EXP-21 [SB §4-5, §2]. SH-ERR-31's exit 79 is scoped to shell CLIs and gates; installers use their own table (the source text did not distinguish).
- **Conflicts:** C-1, C-3, C-6, C-8 updated in place; C-12 (SH-EXP-21), C-13 (ksh inline re-raise status), C-14 (census criteria; `env.sh:244-245` moves from SH-ERR-06 to SH-ERR-09 in "Applied"), C-15 (Windows decode) added.
- **Verdict:** items 3 and 4 amended; items 8-11 added (burn-down, glob shopts, Git Bash, documented gaps).
- **Verifications that did not go red** [SB "Did not go red"]: (a) no ShellCheck check covers a prologue glob shopt or an unguarded glob loop, so SH-ERR-29 and -31 claim only their grep and matrix runs (gap b); (b) SC2310 on a repaired callee stays red by design (SH-ERR-06/-07 restated, no demotion); (c) a `windows-2025` runner was not run (gap a, moved from Open questions into the Verdict). `G-SHOPT` is stated to miss a function-body `shopt` (C13), the half SH-ERR-30's behavioural check owns.
- **Open questions:** the hardened-prologue `shopt` item (reduced to `lastpipe`), the SC2312/SC2310 burn-down item and the Git Bash/windows-2025 item removed as answered or moved to the Verdict; owner questions 1, 2, 3, 5 refreshed with the measured costs; index-level reconciliation note added.
- **Applied / commitments / failure modes:** violation table updated (new SH-ERR-06/-07, -09, -10, -25 and exemplar rows), commitments 1, 2 and 8 amended, failure-mode rows 20-31 added.
- **Runs:** C12-C20 added (re-runs of the [SB] checks that decide a rule's red/green claim); frontmatter `consolidates` gains `shopts-and-burndown.md` and `revised: 2026-10-11`.

## Sub-artifacts

- [shell-errexit/error-model.md](shell-errexit/error-model.md): where errexit fires per shell, the masked-status family, `$( )` inheritance, the 15-site SC2310 read, pipefail and early-exit readers, nounset idioms, sourced libraries, the `IFS` line, `shift`/`$?`/`A && B || C`, the prologue per script kind, the non-POSIX contrast, fleet defects, 19 candidate rules and 26 verification runs.
- [shell-errexit/traps-and-exit-codes.md](shell-errexit/traps-and-exit-codes.md): signal-killed `$?` per shell, trap spellings, EXIT on signals, the returning-handler defect, the canonical cleanup trap, re-raise, bare `exit` in traps, `die` and subshells, foreground deferral and CI cancel, ERR traps, the exit-status vocabulary, stderr/stdout, 22 candidate rules and 17 verification groups.
- [shell-errexit/shopts-and-burndown.md](shell-errexit/shopts-and-burndown.md): the SC2310/SC2312 burn-down over 199 authored files (62-site census, 40-site sample, 191-site shape buckets), the nested-rc finding, `nullglob`/`failglob` on bash 3.2-5.3 (effect matrix, failglob control flow, containment, the SH-EXP-21 verdict), Git Bash 5.2.15 signal statuses against Linux and native parents, the re-raise on six interpreters, the SH-ERR-25 against SH-GATE-08 migration cost, 5 new and 6 revised candidate rules and 14 verification runs.

## Key sources

1. POSIX.1-2024 XCU 2, Shell Command Language (`set -e`, `set -o pipefail`, `trap`, `exit`, exit status, 2.14.3 patterns that match nothing stay unchanged): https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html
2. POSIX `kill` (`-s`, `-l exit_status`): https://pubs.opengroup.org/onlinepubs/9799919799/utilities/kill.html
3. bash NEWS 3.0-5.3 (pipefail and `failglob` 3.0, `[[ ]]`/`(( ))` under `-e` 4.1, `inherit_errexit` and `local -` 4.4, bare `exit` in a trap 5.3): https://git.savannah.gnu.org/cgit/bash.git/plain/NEWS
4. BashFAQ/105, why `set -e` does not do what you expect: https://mywiki.wooledge.org/BashFAQ/105
5. BashPitfalls (#1 the `[ -e "$file" ] || continue` guard and the nullglob caveat, #22, #60 errexit, pipefail and SIGPIPE, nounset): https://mywiki.wooledge.org/BashPitfalls
6. Oils, "YSH fixes shell's errexit": https://github.com/oils-for-unix/oils/blob/master/doc/error-handling.md
7. ShellCheck optional checks (`check-set-e-suppressed`, `check-extra-masked-returns`): https://github.com/koalaman/shellcheck/wiki/Optional
8. ShellCheck SC2310 (and SC2311, SC2312, SC2155, SC2181, SC2015, SC2337): https://github.com/koalaman/shellcheck/wiki/SC2310
9. ShellCheck issues 3444 (`shift` under `-e`) and 3522 (`$?` clobbered by a substitution): https://github.com/koalaman/shellcheck/issues/3522
10. GitHub Actions workflow syntax, the `shell:` command lines (bash on Windows is Git for Windows): https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
11. GitHub Actions workflow cancellation (SIGINT, 7500 ms, SIGTERM, 2500 ms), fetched 2026-10-11: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-cancellation
12. zsh manual, Options (`ERR_EXIT`, `ERR_RETURN`): https://zsh.sourceforge.io/Doc/Release/Options.html
13. yash NEWS (2.59 signal propagation, 384+N statuses): https://raw.githubusercontent.com/magicant/yash/trunk/NEWS
14. nvm.sh, probing and restoring the caller's `-e` (lines 3877-3905): https://github.com/nvm-sh/nvm
15. sysexits(3), 64-78 "deprecated … discouraged": https://man.freebsd.org/cgi/man.cgi?query=sysexits&sektion=3
16. bash reference manual page, `nullglob` and `failglob` semantics: https://tiswww.case.edu/php/chet/bash/bash.html
17. Cygwin `winsup/cygwin/pinfo.cc` lines 231-233, the status byte swap for a non-Cygwin parent: https://raw.githubusercontent.com/cygwin/cygwin/main/winsup/cygwin/pinfo.cc
18. ShellCheck Directive page (`.shellcheckrc` search order, nearest file wins): https://github.com/koalaman/shellcheck/wiki/Directive
19. oils spec `glob-bash.test.sh` (failglob in command, loop, array and `set -e` contexts): https://github.com/oils-for-unix/oils/blob/master/spec/glob-bash.test.sh

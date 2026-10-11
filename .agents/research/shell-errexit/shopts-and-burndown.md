---
title: "SC2310/SC2312 burn-down, nullglob/failglob, Git Bash signal statuses, the re-raise pattern (SH-ERR revision)"
topic: shell / errexit (rows M-B-02, M-B-19, M-D-06 trap half; settles map contradictions X4 and X5; hands SH-EXP-21 its shopt verdict)
agent: W3-shopts-and-burndown
model: sonnet
date_researched: 2026-10-11
sources_count: 17
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/shopts-and-burndown/
scope: |
  Covers: ShellCheck 0.11.0 SC2310/SC2311/SC2312 counts over the authored fleet (SH-GATE-09 files()) with a 40-site classification and a full SC2310 census;
  bash 3.2-5.3 `nullglob`/`failglob` effects on for-loops, rm, case, arrays, `set -e`, `set -u`; Git Bash 5.2.15 signal statuses and `kill -l`;
  the SH-ERR-22 re-raise on dash 0.5.12, busybox ash 1.35/1.37, bash 3.2/5.3 (ksh93u+m 1.0.10 as contrast); the SH-ERR-25 versus SH-GATE-08 migration cost.
  Not covered: zsh `nomatch` (W3-3), fish/nu/elvish/PowerShell cleanup models, macOS/BSD statuses (no host: read-only, labelled), the GitHub-hosted windows-2025 runner itself (not run).
  Holds SH-ERR IDs stable: edits to SH-ERR-07, -10, -16, -19, -22, -25 are revisions; SH-ERR-29..33 are new.
---

# SC2310/SC2312 burn-down, nullglob/failglob, Git Bash signals (SH-ERR revision)

Keys. `[F]` = fixture under `~/.cache/research-lang/shell-tools/fixtures/shopts-and-burndown/`. `[EM]`/`[TR]`/`[C#]` = the consolidated `shell-errexit.md` and its two dives. `[map]` = `shell-topic-map.md`. Fleet files are cited as `<repo>/<path>:<line>` from the working trees on 2026-10-11; fleet HEADs: ocx `1dc415a65eee`, www-setup `a251c3631047`, index `9eba2cc3929b`, arcana `1a6ccab0e0b1`, fma `f6a1ab862076`. Exemplars use `<repo>@<sha12>:<path>:<line>` (SHAs from `shell-audit/scratch/exemplar-shas.md`). Tools: ShellCheck 0.11.0, shfmt 3.13.1, bash 3.2.57-5.3.20 (Docker `bash:<ver>`, Alpine/musl userland, so `rm`/`ls` are busybox), Git Bash 5.2.15(1) on the Windows host (OSTYPE `msys`, `MINGW64_NT-10.0-26200`), Windows PowerShell 5.1.26100.9444, node v24.14.0. Everything is dated 2026-10-11. There is no macOS host; macOS and BSD statements are read-only and say so.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The burn-down: SC2310 and SC2312 over the authored fleet](#1-the-burn-down-sc2310-and-sc2312-over-the-authored-fleet)
   2. [What SC2310 can and cannot be made to say](#2-what-sc2310-can-and-cannot-be-made-to-say)
   3. [The X4 decision, with the numbers](#3-the-x4-decision-with-the-numbers)
   4. [nullglob and failglob on bash 3.2-5.3](#4-nullglob-and-failglob-on-bash-32-53)
   5. [Containing a shopt, and the SH-EXP-21 verdict](#5-containing-a-shopt-and-the-sh-exp-21-verdict)
   6. [Git Bash signal statuses (SH-ERR-16, -19)](#6-git-bash-signal-statuses-sh-err-16--19)
   7. [The SH-ERR-22 re-raise on four interpreters](#7-the-sh-err-22-re-raise-on-four-interpreters)
   8. [SH-ERR-25 against SH-GATE-08: migration cost (X5)](#8-sh-err-25-against-sh-gate-08-migration-cost-x5)
   9. [Corrections to the consolidated file](#9-corrections-to-the-consolidated-file)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- **X4 default:** ship `enable=check-set-e-suppressed` (SC2310) in `.shellcheckrc` and leave `check-extra-masked-returns` (SC2312) out of the repo-wide rc. Authored fleet, 199 files: SC2310 reports 69 hits on 62 distinct sites in 9 files; SC2312 reports 191 distinct sites in 55 files.
- **SC2310 precision is 3 of 62 (4.8%):** 2 defects (`ocx/test/manual/run-windows-activation.sh:70,77`), 1 latent (`www-setup/src/install.sh:799`), 59 benign (one-command predicates, explicit `|| return`, pure-shell bodies). All 62 callee bodies were read, not sampled.
- **SC2312 precision is 2 of 191 strict defects:** `arcana/nox/scripts/release_gate.sh:12` (`cd "$(git …)"`) and `fma/run.sh:14` (`exec … "$(wslpath …)"`). Another 6 are the documented `eval "$(ocx …)"` rc idiom and about 7 are `"X_FQ=$(fq …)"` arguments (latent). 150 of the 191 sites sit under `test/` or `tests/`; 41 sit in files with no `set -e`.
- **The two real SC2312 shapes need no ShellCheck:** one grep (G-MASK, SH-ERR-10 extended with `exec`) returns exactly the 8 fleet lines (2 real, 6 exempt) with zero noise; plant 3 lines, twin 0.
- **SC2310 cannot be satisfied by repairing the callee:** a function with `|| return` on every step still triggers it at the call site (twin stays red until a directive is added or the call leaves the condition). Turning it on costs 62 permanent sites: 3 code edits plus 59 `# shellcheck disable=SC2310  # predicate: …` lines in 9 files. ShellCheck 0.11.0 has no baseline option.
- **A nested `.shellcheckrc` replaces its parent; it does not merge.** A new-code directory can opt into SC2312 only by repeating every key (measured). Never enable SC2312 in a nested rc that omits `enable=check-set-e-suppressed`.
- **No hardened prologue sets `nullglob` or `failglob`; SH-EXP-21 does not name a shopt as the default.** Both change the meaning of every glob in the process: nullglob turns `ls ./*.x` into `ls` of the cwd, `grep p *.x` into a stdin read, and `find *.x -name '*.dat' -delete` into a delete of the cwd tree (measured, bash 3.2-5.3, 8 of 8).
- **failglob is not fail-closed in a script:** without `set -e` it skips only the failing command (or the whole `if`, `{ }` group or `&&/||` list) and the script carries on with exit 0; it also kills the `[ -e "$f" ] || continue` guard before the guard runs. With both options set, failglob wins.
- **`shopt` exists only in bash:** on dash, busybox ash 1.35/1.37, mksh, ksh93u+m (2), yash and posh `shopt -s nullglob` prints "not found" and the script goes on; zsh in sh emulation does the same (9 of 11 interpreters print not found; the two bash `--posix` runs accept it). SC3044 catches it.
- **A function does not contain a shopt, and neither does `local -` (bash 4.4+):** `shopt -s nullglob` inside a function is still on afterwards on 8 of 8 versions. Use a subshell `( shopt -s nullglob; … )` or a save/restore pair. SH-EXP-21's current wording "only inside a function or subshell" is wrong for the function half.
- **The portable empty-glob contract is `set -- ./*.x; [ -e "$1" ] || [ -L "$1" ] || die 79`:** exit 79 on 11 of 11 POSIX interpreters and 8 of 8 bash versions; `[ -e ]` alone silently skips a dangling symlink (measured on bash 5.3 and dash).
- **Git Bash 5.2.15 matches Linux bash for a bash parent** (`exit 130/143/129` handlers give 130/143/129; untrapped self-signal gives 130/143/129; `kill -l 143` is TERM; `kill -l 271` is invalid) **but a native Windows parent sees a different number:** untrapped or re-raised TERM is 3840 (`15<<8`), INT 512, HUP 256, KILL 2304, while `exit 143` stays 143 (PowerShell 5.1 `Start-Process`, `cmd.exe` `%ERRORLEVEL%`, node `spawnSync` all agree). Cygwin's `pinfo.cc` swaps the status bytes for a non-Cygwin parent.
- **Signal numbers above 15 differ on MSYS:** USR1 30, USR2 31, BUS 10, CHLD 20, CONT 19, STOP 17, TSTP 18 against Linux 10, 12, 7, 17, 18, 19, 20. `kill -l 138` is BUS on Git Bash and USR1 on Linux; only HUP INT QUIT ABRT KILL PIPE ALRM TERM agree. Decode with the shell's own `kill -l`, never a table.
- **SH-ERR-22 re-raise holds on dash 0.5.12, busybox ash 1.35/1.37, bash 3.2 and 5.3:** the function pattern dies of the signal (`WIFSIGNALED`) for HUP, INT and TERM, 6 of 6 interpreters including ksh93u+m 1.0.10. The inline-string form fails only on ksh93u+m 1.0.10 (exit 1, measured; [TR] recorded exit 0). Dropping the `trap -` reset before `kill -s` recurses until SIGSEGV on dash, both ashes and bash 5.3 (5,691 to 27,565 handler runs; the count varies run to run).
- **X5, SH-ERR-25 versus SH-GATE-08:** renumbering the shipped Swift gates costs 16 code lines in 7 scripts and 23 documentation lines in 8 files; 7 of the 16 code sites map mechanically (66 to 64/78/79), 9 need a design choice because SH-GATE-08 has no row for "tool ran, result untrustworthy" (4 `git diff failed` at 66, 5 at 70). Keep the carve-out for those 7 scripts and use SH-GATE-08 for every new gate (the owner default).
- **Thirteen of the fourteen verification runs went red on a planted fixture and green on a twin** (one is observational); in addition no ShellCheck 0.11.0 check (`-o all`) flags a prologue `shopt -s nullglob` or an unguarded glob loop, so those two rules rest on grep and matrix runs only.

## Findings

### 1. The burn-down: SC2310 and SC2312 over the authored fleet

**Method** [F `burndown.py`, `census.py`, `classify.py`, `inventory.py`]. Fleet root `/home/mherwig/dev` with the stated exclusions (`.worktrees`, `.agents/worktrees`, `.tmp*`, `node_modules`, `target`, `.git`, `.venv`, `vendor`, `external`, the seven sibling clones, remote-URL de-duplication). Per repo the file list is SH-GATE-09 `files()`: `git ls-files -z --cached --others --exclude-standard`, then `shfmt -f`, then joined to the fleet-shape classifier re-run (`authored` = tracked, not generated, not vendored upstream, not `.claude/.agents/.opencode`, not research scratch). ShellCheck: `shellcheck --norc -f json1 -o check-set-e-suppressed,check-extra-masked-returns`, 80 files per call, `-s bash` for files without a shebang. Per [ShellCheck changelog](https://hackage.haskell.org/package/ShellCheck-0.11.0/changelog) SC2312 arrived in 0.8.0 (2021-11-06); both checks are info-level, so `-S warning` hides them ([GATE] measured 0 of 260 visible).

**Per-repo table** (`python3 burndown.py --tier authored`, re-run 2026-10-11, identical to the first run; output of fixture (a)):

| repo | files | set -e files | LOC | SC2310 | files | SC2311 | SC2312 | files |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| ocx | 118 | 114 | 5945 | 13 | 3 | 0 | 107 | 23 |
| www-setup | 14 | 11 | 3204 | 52 | 5 | 0 | 31 | 8 |
| setup-grimoire | 5 | 3 | 407 | 0 | 0 | 0 | 14 | 3 |
| oras-www | 7 | 1 | 406 | 0 | 0 | 0 | 13 | 6 |
| index | 3 | 3 | 1049 | 4 | 1 | 0 | 3 | 2 |
| rules_ocx | 7 | 6 | 104 | 0 | 0 | 0 | 6 | 2 |
| grimoire | 11 | 6 | 762 | 0 | 0 | 0 | 5 | 3 |
| grimoire-lore | 12 | 0 | 406 | 0 | 0 | 0 | 5 | 4 |
| creeptd-ng | 9 | 4 | 422 | 0 | 0 | 0 | 3 | 1 |
| ocx-mirror | 1 | 1 | 114 | 0 | 0 | 0 | 2 | 1 |
| arcana | 1 | 1 | 110 | 0 | 0 | 0 | 1 | 1 |
| fma | 1 | 1 | 14 | 0 | 0 | 0 | 1 | 1 |
| 6 further repos (find_ocx, grimoire-indexer, obere-heide-planer, ocx-sdk-python, ocx-website, a nested ocx scratch copy) | 10 | 5 | 351 | 0 | 0 | 0 | 0 | 0 |
| **total** | **199** | **156** | **13294** | **69** | **9** | **0** | **191** | **55** |

Tier sensitivity (same command, `--tier`): authored plus `.claude/.agents` config 253 files, SC2310 69, SC2312 204; every classifier tier including research scratch and vendored `uv` 545 files, SC2310 77, SC2312 645. The 69 hits repeat a file:line:col 7 times (6 on `if ! f`, 1 on `if f && g`; ShellCheck reports once per negation or AND-OR context), so SC2310 has **62 distinct sites**; SC2312 has 191 distinct and 191 hits.

**Reconciliation of the 150 and the 191** ([EM] §5 and [GATE]): 150 SC2312 sites sit in the 41 authored files that set `-e`; 41 more sit in 14 files with no `set -e`. SC2310 and SC2311 fire only under `set -e`; SC2312 fires regardless (SC2312 on `echo "$(date)"` appears in `sc/noset.sh`, SC2310/SC2311 do not) [F `verify-local.sh` V6].

**SC2310 census (all 62 distinct sites, every callee body read)** [F `census.py`]:

| class | sites | what it is |
|---|--:|---|
| DEFECT | 2 | `run_gate` called as `run_gate … \|\| _rc=$?` at `ocx/test/manual/run-windows-activation.sh:70,77`; its `_exe_win=$(wslpath -w "$EXE_UNIX")` (line 41) failure is skipped and the gate runs with an empty `-OcxBin` |
| LATENT | 1 | `fetch_dist` at `www-setup/src/install.sh:799`: `_pin=$(dist_pin_digest "$_url")` (line 514) is an unchecked step ahead of `verify_checksum`; `dist_pin_digest` ends in `sed -n`, which cannot fail today |
| NOISE | 59 | `pm_try` 14, `is_truthy` 10, `check_cmd` 9, `fetch` 5, `poll_until` 3, and 18 sites across 14 other one-command or explicit-return callees |

Hit density: 42 of the 62 sites are in two www-setup files (`src/install.sh` 24, `tests/docker/install-shells.sh` 18); 34 of 62 are under test paths. The two defects are in a manual harness, not a shipped installer.

**Sample of 40** (20 SC2310 plus 20 SC2312, stratified by callee and by shape bucket; the original second copy of `install.sh:164` was replaced by the defect site `run-windows-activation.sh:70`; per-site verdicts in [F `sample40.tsv`]):

| code | DEFECT | LATENT | EXEMPT | NOISE |
|---|--:|--:|--:|--:|
| SC2310 (20) | 1 | 0 | 0 | 19 |
| SC2312 (20) | 2 | 2 | 1 | 15 |
| **40** | **3 (7.5%)** | **2 (5%)** | **1 (2.5%)** | **34 (85%)** |

The 20-site SC2310 half over-samples noise on purpose (stratified by callee, one defect callee among 21); the census above is the unbiased figure. The three defects: `run-windows-activation.sh:70` (SC2310), `arcana/nox/scripts/release_gate.sh:12` and `fma/run.sh:14` (SC2312). Latent: `ocx/test/manual/scripts/bootstrap.sh:176` and `setup-integrations.sh:130` (`"LEAF_FQ=$(fq …)"` passed to `push_simple`). Exempt: `ocx/test/doc_scripts/shell-integration__inert-to-consented.sh:19`, the interactive-rc `eval "$(ocx self activate --shell=bash)"` idiom SH-ERR-10 exempts.

**SC2312 shape buckets (all 191)** [F `classify312.py`, a reading aid validated by the 20-site sample]: command-argument 75 (36 are `fixture`/`assert_*` arguments inside self-check harnesses, 7 are `"X_FQ=$(fq …)"`), message 37, test-operand 17, pipeline-stage 14, source-dirname idiom 14, assignment-rhs 10, procsub 8, eval 6, heredoc text 3, mutation-arg 3, case-subject 2, `cd` 1, `exec` 1. Top files hold half: `selfcheck_identity.sh` 28, `selfcheck_g2.sh` 19, two `server.bash` helpers 23, then `bootstrap.sh` 7 (95 of 191 in 8 files). Strict real: 2 (`cd`, `exec`); exempt eval: 6; latent: about 7; the rest is noise. Upper bound on actionable sites: 15 of 191 (7.9%).

**The hits the wiki wants fixed are the same two shapes the fleet has.** The [ShellCheck SC2312 page](https://github.com/koalaman/shellcheck/wiki/SC2312) problem 1 is exactly `cd "$(get_chroot_dir)/etc"`: if the substitution fails without output the next command runs as `cd "/etc"`. The fleet's `cd "$(git rev-parse --show-toplevel)"` is that shape with an empty string instead.

### 2. What SC2310 can and cannot be made to say

Three facts decide how an owner answers a hit [F `repro-run-gate*.sh`, `verify-local.sh`]:

```bash
# plant: repro-run-gate.sh (shape of ocx run-windows-activation.sh:39-46,70)
set -euo pipefail
run_gate() { local _exe_win; _exe_win=$(false "$EXE_UNIX"); printf 'gate ran with -OcxBin=[%s]\n' "$_exe_win"; }
_rc=0; run_gate || _rc=$?; echo "rc=$_rc"
#   bash 3.2-5.3 (8 of 8): "gate ran with -OcxBin=[]"  "rc=0"      <- the failure vanished
# twin: the callee repaired
run_gate() { local _exe_win; _exe_win=$(false "$EXE_UNIX") || return 1; … }
#   bash 3.2-5.3 (8 of 8): "rc=1"
#   BUT shellcheck -o check-set-e-suppressed still reports SC2310 on the call line (exit 1)
# green twin (a): directive with the reason          # shellcheck disable=SC2310  # every fallible step in run_gate ends || return 1
# green twin (b): call outside the condition         set +e; run_gate; _rc=$?; set -e      (both: shellcheck exit 0, rc=1)
```

1. SC2310 never goes green by fixing the callee. Every one of the 62 sites carries either a directive or a restructured call forever; the 59 benign sites are permanent annotation lines.
2. `SC2311` is silent under `set -eo pipefail` and `set -euo pipefail` headers ([C8], reproduced in `fx-plant`: SC2311 0 for `out=$(backup)`), so the burn-down table's SC2311 column is 0 for a reason that is not "no hits". SH-ERR-08 already routes that half to a bash matrix run.
3. ShellCheck 0.11.0 has no baseline or ratchet option (`shellcheck --help` lists `--rcfile`, `-S`, no baseline). The only gradual path is the nested rc below or a counter script; `burndown-inner.sh` is one (fixture (a), plant exit 1, twin exit 0, see Verification runs).

**Nearest `.shellcheckrc` wins and nothing merges** ([ShellCheck Directive page](https://github.com/koalaman/shellcheck/wiki/Directive) lines 97-100: "`shellcheck` will look for a file named `.shellcheckrc` … in the script's directory and each parent directory of that"). Measured on 0.11.0: root rc `enable=check-set-e-suppressed`, `sub/.shellcheckrc` `enable=check-extra-masked-returns`: `top.sh` reports SC2310 and SC2311, `sub/new.sh` reports only SC2312, no SC2310 [F `rc-tree/`, `verify-local.out` V7]. A directory-scoped SC2312 opt-in must repeat every root key.

### 3. The X4 decision, with the numbers

| option | repo-wide cost to turn on | actionable | catches the real shapes |
|---|---|---|---|
| SC2310 only (SH-ERR-07, recommended) | 62 sites: 3 code edits, 59 directive lines, 9 files | 3 of 62 (4.8%; 2 strict) | `run_gate` shape (masked `x=$(…)` inside a callee used as a condition) is not grep-able; SC2310 is the only mechanical catch |
| SC2310 + SC2312 (SH-GATE-02/19 as drafted) | plus 191 sites in 55 files, 183 of them annotation or rewrite | 2 strict, up to 15 of 191 (1.0% to 7.9%) | adds nothing beyond G-MASK for `cd`/`eval`/`exec` |
| SC2310 + G-MASK grep (recommended) | the SC2310 cost plus 0 edits (8 existing lines are 2 real, 6 exempt) | 8 of 8 lines are the real shapes, 0 noise | `eval`, `cd`, `exec` with a substitution |
| SC2312 opt-in per new-code directory (SH-ERR-33) | one nested rc per directory, 0 edits to old code | n/a | new code is born clean |

**Recommended default for X4:** `.shellcheckrc` carries `enable=check-set-e-suppressed` and not `check-extra-masked-returns` (SH-GATE-02 stays four keys; SH-GATE-19's `-o` list drops `check-extra-masked-returns`, as the [map] X4 resolution already says). The two real SC2312 shapes are covered by G-MASK, now including `exec`. The one place SC2312 is cheap and worthwhile is new code: SH-ERR-33.

### 4. nullglob and failglob on bash 3.2-5.3

Documented semantics ([bash manual page](https://tiswww.case.edu/php/chet/bash/bash.html)): with `nullglob` unset a pattern with no match "is left unchanged"; with `nullglob` set "the word is removed"; with `failglob` set "bash prints an error message and does not execute the command"; the shopt list says `failglob` makes patterns that fail to match "result in an expansion error". POSIX.1-2024 XCU 2.14.3: "If the pattern does not match any existing filenames or pathnames, the pattern string shall be left unchanged" ([POSIX XCU 2](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)). `failglob` entered bash in 3.0 ([bash NEWS](https://tiswww.case.edu/php/chet/bash/NEWS), 3.0 section item ff), so no bash from 3.2 on is missing either option.

**Effect matrix** [F `glob.sh`; each scenario in a fresh dir with `a.txt b.txt sub/keep.dat`, no `*.zzz`; results identical on bash 3.2, 4.0, 4.2, 4.4, 5.0, 5.1, 5.2, 5.3; `rm`/`ls`/`find`/`grep` are the busybox of the Docker image]:

| scenario | default | `shopt -s nullglob` | `shopt -s failglob` |
|---|---|---|---|
| `for f in ./*.zzz; do …` | iterates once on the literal `./*.zzz` (`n=1`) | zero iterations (`n=0`) | `no match: ./*.zzz`, loop not run, rc 1 |
| `for f in ./*.zzz; do [ -e "$f" ] \|\| continue; …` | `n=0` | `n=0` | error before the guard can run, rc 1 |
| `a=(./*.zzz)` | `len=1` (the literal) | `len=0` | error, `a` empty |
| `case $f in *.zzz)` and `case ./*.zzz in ./\*.zzz)` | unchanged | unchanged | unchanged (a `case` word is not pathname-expanded) |
| `rm -f ./*.zzz` | rc 0 | rc 0 (no operand) | rc 1, `rm` not run |
| `rm ./*.zzz` | rm error, rc 1 | rm with no operand (usage), rc 1 | rc 1, `rm` not run |
| `ls ./*.zzz` | `ls` error, rc 1 | **lists the cwd** (`a.txt b.txt sub`), rc 0 | rc 1 |
| `echo needle \| grep needle *.zzz` | grep error, rc 2 | **reads stdin**, prints `needle`, rc 0 | not run |
| `find *.zzz -name '*.dat' -delete` | find error, `keep.dat` survives | **searches `.` and deletes `sub/keep.dat`** (busybox `find`; GNU `find` documents the same default of `.`, unrun) | not run |
| `echo ./*.zzz` | `./*.zzz` | empty line | rc 1 |
| unquoted `p="./*.zzz"; set -- $p` | `argc=1` | `argc=0` | rc 1 |
| `set -e; for f in ./*.zzz` | runs with the literal | skips | script exits 1 |
| `shopt -s nullglob failglob` (both) | | | identical to failglob alone (diff of the two normalised outputs is empty) |

The same behaviour shows in [oils spec `glob-bash.test.sh`](https://github.com/oils-for-unix/oils/blob/master/spec/glob-bash.test.sh): failglob in a loop returns status 1, and its comment records that "bash behaves differently when commands are separated by a semicolon than when separated by a newline". A [2013 bug-bash thread](https://mail.gnu.org/archive/html/bug-bash/2013-09/msg00000.html) (not re-run here) records the nullglob-plus-failglob precedence and a failglob error on an associative array literal.

**failglob control flow in a script file** [F `failglob-flow.sh`, 8 of 8 versions, one command per line unless noted]:

```bash
shopt -s failglob
for f in ./*.zzz; do echo "iter $f"; done   # error printed; loop not run
echo A2-next-line                            # PRINTED. exit status of the script: 0
#
# set -e variant:                            # exits 1 at the loop
# if ls ./*.zzz; then echo yes; else echo else-branch; fi   -> error; NEITHER branch runs; script continues
# { for f in ./*.zzz; do :; done; echo same-braces; }       -> error; "same-braces" NOT printed (whole group skipped)
# echo ./*.zzz || echo or-branch                            -> error; "or-branch" NOT printed (whole AND-OR list skipped)
# g() { for f in ./*.zzz; do :; done; echo in-func; }; g    -> body aborted, g returns 1, script continues
# a=(./*.zzz); echo len=${#a[@]}                            -> error, then "len=0"
```

So failglob is a *skip-this-command* switch with `-e`-dependent consequences, not a fail-closed guard. An agent that adds `shopt -s failglob` "to fail when nothing matches" gets exit 0 and a log line on bash without `set -e`.

**nullglob with `set -u` and arrays** [F `nullglob-u.sh`]: `shopt -s nullglob; set -u; a=(./*.zzz); for f in "${a[@]}"; do …` aborts with `a[@]: unbound variable` on bash 3.2, 4.0 and 4.2 and runs on 4.4-5.3; `${a[@]+"${a[@]}"}` passes on all eight. A prologue `nullglob` makes empty arrays routine, so it pulls SH-ERR-12's guard into every glob array.

**`shopt` is bash-only** [F `globs/sh-shopt-plant.sh`, `matrix.sh posix`]: dash 0.5.12 `shopt: not found`, busybox ash 1.35/1.37 `shopt: not found`, mksh R59c `shopt: inaccessible or not found`, ksh93u+m 2023 and 1.0.10 `shopt: not found`, yash 2.52 `no such command 'shopt'`, posh 0.14.1 `shopt: not found`, zsh 5.9 `--emulate sh` `command not found: shopt`; each then continues to the next line (exit 0) unless `set -e`. bash 3.2 and 5.2 `--posix` accept it. `shellcheck -s sh` reports SC3044 (exit 1; twin exit 0). Under `set -e` the missing builtin is exit 127 (oils spec marks the dash/mksh/ash rows "N-I … status: 127").

**Version note:** nothing in the table varies across bash 3.2-5.3; the only version-dependent facts are `local -` (bash 4.4, [NEWS](https://tiswww.case.edu/php/chet/bash/NEWS) 4.4 item s) and the 3.2/4.0/4.2 `unbound variable` on empty arrays. zsh `nomatch` and `NULL_GLOB` are out of scope (W3-3).

### 5. Containing a shopt, and the SH-EXP-21 verdict

```bash
# WRONG: a function (or a prologue) changes the option for every later glob in the caller
collect() { shopt -s nullglob; files=(./*.log); }
collect; ls ./*.zzz        # now lists the cwd
set -euo pipefail
shopt -s nullglob failglob # prologue form, same problem
```

```bash
# RIGHT 1: subshell, nothing leaks and no restore code
list_logs() ( shopt -s nullglob; printf '%s\n' ./*.log )

# RIGHT 2: state needed in the current shell, save and restore
collect() {
  local had=0; shopt -q nullglob && had=1
  shopt -s nullglob; files=(./*.log)
  [ "$had" -eq 1 ] || shopt -u nullglob
}

# RIGHT 3: no shopt at all, POSIX, the default form
set -- ./*.log
if [ ! -e "$1" ] && [ ! -L "$1" ]; then echo "no logs" >&2; exit 79; fi
```

Measured [F `shopt-leak.sh`, 8 of 8 versions]: after a function that runs `shopt -s nullglob`, `nullglob` is **on**; after a function that runs `local -; shopt -s nullglob` it is **on** (the `local -` of bash 4.4 saves the single-letter `set` options only, per NEWS 4.4 item s: "save and restore the single-letter shell options"; on 3.2-4.2 `local -` is an error); after a subshell function it is **off**; after a save/restore function it is **off**. [F `globs/leak-check.sh`] turns this into a check: source the library, call the function in the current shell, exit 1 if `nullglob` or `failglob` is now set (plant exit 1 on 8 of 8, twin exit 0 on 8 of 8).

**Verdict for SH-EXP-21:** it names no shopt as the default. Proposed replacement text:

> **SH-EXP-21 · MUST — Make unmatched-glob behaviour explicit.** In `#!/bin/sh` and bash, guard the loop (`for f in ./*.x; do [ -e "$f" ] || [ -L "$f" ] || continue; …`) or test the first word (`set -- ./*.x; [ -e "$1" ] || [ -L "$1" ] || die`), and give "no input" its own exit status (79, SH-GATE-08). Never put `shopt -s nullglob|failglob` in a prologue, a sourced library or a function body; where bash arrays are wanted, wrap the glob in a subshell `( shopt -s nullglob; … )` or a save/restore pair. `local -` does not restore a shopt. `shopt` is a SC3044 error in `#!/bin/sh`. In zsh use `*.x(N)`; in fish expect an error (W3-3 owns both).

Rationale in one line: both shopts change every other glob in the process (the matrix above), the portable guard needs none, and the guard's one weakness (`[ -e ]` is false for a dangling symlink) is closed by `|| [ -L ]` [F `globs/dl/`: `[ -e ]`-only reports `processed=0`, the `-e`/`-L` form proceeds and `cat` fails, exit 1, on bash 5.3 and dash 0.5.12]. [BashPitfalls #1](https://mywiki.wooledge.org/BashPitfalls) recommends the same guard first and mentions nullglob only "after reading the documentation and carefully considering the effect of this setting on all other globs in the script".

**ShellCheck cannot see either problem.** `shellcheck -o all` on a prologue `shopt -s nullglob failglob` script and on an unguarded `for f in ./*.zzz` loop reports only SC2250 (brace style) on both plants and both twins [F `globs/`, run 2026-10-11]. There is no SC code for "unguarded glob loop"; SC2044 and SC2144 are different shapes.

**Fleet state:** 0 authored or agent-config files use `nullglob`, `failglob` or `setopt nullglob`; 7 glob `for` loops in authored shell, 6 guarded or fixed-directory (`ocx-website/scripts/bin/oxc.sh:13-14`, `www-setup/tests/install/helpers/server.bash:363-364` guard with `[ -x "$f" ]`; `ocx/test/manual/scripts/setup-patches.sh:239` globs a committed directory) [F inline census].

### 6. Git Bash signal statuses (SH-ERR-16, -19)

**What was run** [F `sig.sh`, `sig-native.ps1`, `sig-cmd.cmd`, `sig-node.js`, `sigdecode.sh`, `sigtable.sh`]: `matrix.sh win sig.sh` (Git Bash 5.2.15(1)-release, OSTYPE `msys`), `matrix.sh win sig-native.ps1` (Windows PowerShell 5.1.26100.9444 starting `C:\Program Files\Git\bin\bash.exe` with `Start-Process -PassThru`), `cmd.exe /c sig-cmd.cmd`, and node v24.14.0 `spawnSync`. Reference: the same `sig.sh` on bash 3.2-5.3 in Docker. The child is the same bash (`$BASH`); the parent observes `$?`.

| case (child script) | Linux bash 3.2-5.3 | Git Bash 5.2.15, bash parent | native parent (PS 5.1 / cmd / node) |
|---|---|---|---|
| `trap 'exit 130' INT; trap 'exit 143' TERM; trap 'exit 129' HUP`, then `kill -s SIG $$` | 130 / 143 / 129 | 130 / 143 / 129 | `exit 143` -> 143, `exit 130` -> 130 (PS, cmd, node agree) |
| no handler, `kill -s SIG $$` | 130 / 143 / 129 | 130 / 143 / 129 | TERM **3840** (0xF00), INT **512**, HUP **256**, KILL **2304**; cmd `%ERRORLEVEL%` TERM 3840, INT 512; node `status=3840, signal=null` |
| SH-ERR-22 re-raise (function pattern) | 130 / 143 / 129 | 130 / 143 / 129 | TERM 3840, INT 512 (same as untrapped) |
| `trap 'echo cleanup' EXIT; trap 'exit' INT TERM HUP` (bare `exit`) | 0 (all three, `cleanup` printed) | 0 (all three) | not run |
| `trap 'echo CLEANUP' EXIT INT TERM HUP`, then TERM | exit 0, `CLEANUP SURVIVED CLEANUP` | exit 0, `CLEANUP SURVIVED CLEANUP` | not run |
| `sleep 30 & wait $!` after `kill -s SIG` of the child (KILL included) | INT 0, TERM 143, HUP 129, KILL 137 | INT 0, TERM 143, HUP 129, KILL 137 | n/a |
| `trap 'echo got-TERM; exit 143' TERM`, `sleep 5 & wait $!`, TERM after 0.3 s | 143, `got-TERM` | 143, `got-TERM` | not run |

(`wait-after-kill-INT rc=0` is the non-interactive background-job rule: a background child ignores SIGINT; identical on Linux.)

**Mechanism** (primary source): Cygwin's `pinfo.cc` stores a UNIX wait status and, for a parent that is not a Cygwin process, swaps its two bytes before `ExitProcess`: `if (!self->cygstarted) exitcode = ((exitcode & 0xff) << 8) | ((exitcode >> 8) & 0xff);` ([cygwin `winsup/cygwin/pinfo.cc`](https://raw.githubusercontent.com/cygwin/cygwin/main/winsup/cygwin/pinfo.cc), lines 231-233). An `exit N` is `N<<8` internally and so arrives as `N`; death by signal S is `S` internally and arrives as `S<<8`. Git for Windows' MSYS2 runtime is a fork of that code; the measurements above are on Git's own `bash.exe`.

**`kill -l` decoding (SH-ERR-19)** [F `sig.sh`, `sigdecode.sh`, `sigtable.sh`]:

- Git Bash: `kill -l 129 130 131 137 141 143` = `HUP INT QUIT KILL PIPE TERM`; `kill -l 271` and `kill -l 3840` are `invalid signal specification`; `kill -l TERM` = 15, same for HUP 1, INT 2, QUIT 3, KILL 9, PIPE 13 (identical to Linux). This is the [POSIX kill](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/kill.html) example verbatim: `elif [ $stat -gt 128 ]; then echo job terminated by signal SIG$(kill -l $stat)`.
- Numbers above 15 differ: MSYS `USR1=30 USR2=31 BUS=10 CHLD=20 CONT=19 STOP=17 TSTP=18` against Linux (musl bash 5.3.20) `USR1=10 USR2=12 BUS=7 CHLD=17 CONT=18 STOP=19 TSTP=20`. `kill -l 138` is `BUS` on Git Bash and `USR1` on Linux; `kill -l 158` is `USR1` on Git Bash and `PWR` on Linux. Only HUP, INT, QUIT, ABRT, KILL, PIPE, ALRM, TERM agree.
- `[ "$rc" -gt 128 ]` is true for 256, 512, 3840 and 2304, so the POSIX example's test passes but `kill -l "$rc"` then fails. A decode that serves both parents (verified on Git Bash and 8 bash versions, identical output): `if [ "$rc" -ge 256 ] && [ $((rc % 256)) -eq 0 ] && [ $((rc / 256)) -le 64 ]; then kill -l $((rc / 256)); elif [ "$rc" -gt 128 ] && [ "$rc" -le 192 ]; then kill -l "$rc"; fi`, giving `3840=TERM 512=INT 256=HUP 2304=KILL 143=TERM 130=INT 0 and 1 unchanged`.

**Windows rows.** SH-ERR-16: on Git Bash the handler forms behave as on Linux for a bash parent; the returning-handler defect reproduces unchanged (exit 0 after TERM), so the ban holds; for a native parent only the explicit `exit 143/130/129` form of SH-ERR-16 keeps the familiar number. SH-ERR-19: never compare to literals above 143; on Windows-hosted scripts whose caller is native, accept `N<<8`. SH-ERR-22: on Git Bash, re-raise produces the "died of signal" status, which a native parent sees as 3840 or 512, not 143 or 130; the re-raise is therefore the right form for a bash caller and the wrong one when a native consumer matches 128+N.

**GitHub Actions context.** The runner's `shell: bash` on Windows "is the bash shell included with Git for Windows" ([workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), table row `bash`: `bash --noprofile --norc -eo pipefail {0}`), and cancellation sends "SIGINT/Ctrl-C to the step's entry process … 7500 ms … SIGTERM/Ctrl-Break … 2500 ms" then kills the tree ([workflow cancellation](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-cancellation)). Whether a `windows-2025` runner delivers INT/TERM to Git Bash's trap, and what its .NET host reports for a signalled child, was **not run** (unverified: no runner access; Git for Windows on the runner may differ from the host's 5.2.15).

### 7. The SH-ERR-22 re-raise on four interpreters

Setup [F `reraise/run-reraise2.sh`, static `waitsig` helper that forks the script under `setsid`, sends the signal after 1000 ms and reports `WIFSIGNALED`; Docker `shellzoo:deb12`, `alpine:3.22`, `bash:3.2`, `bash:5.3`, `shellzoo:deb13`]. Each variant traps HUP, INT, TERM, runs `cleanup` (prints `CLEANED`), and ends; `sleep 30 & wait $!` is the foreground work.

| variant | dash 0.5.12 | busybox ash 1.35 | busybox ash 1.37 | bash 3.2 | bash 5.3 | ksh93u+m 1.0.10 |
|---|---|---|---|---|---|---|
| **function pattern** (SH-ERR-22 verbatim: `on_signal() { trap - EXIT HUP INT TERM; cleanup; kill -s "$1" "$$"; }`) HUP / INT / TERM | died of 1 / 2 / 15 | same | same | same | same | same |
| inline string `trap 'cleanup; trap - TERM; kill -s TERM $$' TERM` | died of 1 / 2 / 15 | same | same | same | same | **exit 1** for HUP and TERM, INT dies of 2 |
| explicit status `trap 'cleanup; exit 143' TERM` (SH-ERR-16) | exit 129 / 130 / 143 | same | same | same | same | same |
| re-raise **without** `trap -` first (plant) TERM | `CLEANED` x27,565, then SIGSEGV | x8,880, SIGSEGV | x8,879, SIGSEGV | `CLEANED` x2, **exit 143** | x5,691, SIGSEGV | `CLEANED`, exit 1 |

Verdicts: the pattern holds on the four requested interpreters (and ksh) for all three signals; the inline form is equivalent on the four but not on ksh93u+m 1.0.10, which is the function form's only measured reason to exist (the consolidated text and [TR] said that form "exits 0 silently"; measured here: exit 1, still not a signal death). The reset `trap -` is load-bearing: without it the handler re-enters itself until the stack overflows on four of the five bash-family or ash interpreters, and bash 3.2 quietly turns it into an `exit 143` instead of a signal death. A reviewer's check is therefore "the handler resets the trap, then kills with `$1`".

### 8. SH-ERR-25 against SH-GATE-08: migration cost (X5)

The shipped Swift checks (`rules/swift-quality/checks/*.sh`, published with the Swift set, commit `4dddc0a`) use `exit 64/65/66/69/70`. The Rust table the shell CLI contract mirrors ([cli-contract](../../../rules/rust-quality/cli-contract.md) lines 30-52) never claims 66-68 or 70-73; SH-GATE-08 uses 69, 78, 79 and 1. [sysexits(3)](https://man.freebsd.org/cgi/man.cgi?query=sysexits&sektion=3) itself says the interface "has been deprecated and is retained only for compatibility. Its use is discouraged." Counted over `exit N` statements that are code (comments excluded), 2026-10-11:

| code | sites | files | per-site target under SH-GATE-08 / the Rust table | mapping |
|---|--:|---|---|---|
| 64 | 4 | generated-touch, k07, silence-check, weaken-check | 64 (already in the table) | none |
| 65 | 1 | never-gate:27 | 65 (already) | none |
| 69 | 1 | tsan-check:24 | 69 (already) | none |
| **66** BASE does not resolve | 4 | generated-touch:14, silence-check:19, weaken-check:31, never-gate:20 | 64 (the line above already exits 64 for an unset BASE) | mechanical |
| **66** config file missing | 2 | never-gate:19 (`.swift-format`), swiftlint-gate:19 | 78 | mechanical |
| **66** no input found | 1 | fold-check:18 (no `Package.swift`) | 79 | mechanical |
| **66** `git diff` failed | 4 | generated-touch:19, silence-check:24, weaken-check:37, never-gate:29 | no row; nearest 69 | design choice |
| **70** cannot run or cannot trust | 5 | tsan-check:37 (timeout 124/137), :41 (TSan could not start), :48 (no passing line), swiftlint-gate:28 (skipped enabled rule), :32 (pinned version mismatch) | no row; nearest 69 or keep 70 | design choice |

Totals: 16 code lines in 7 scripts; 7 mechanical, 9 need a decision. Documentation: 23 lines containing `exit 66` or `exit 70` in 8 files (`rules/swift-package/release.md` 8, `rules/swift-quality/security.md` 3, `rules/swift-quality/concurrency.md` 3, `rules/swift-package/gates.md` 3, `skills/swift-diagnose/SKILL.md` 2, `rules/swift-quality.md` 2, `rules/swift-quality/api-design.md` 1, `rules/swift-package.md` 1). A grep of `rules/` and `skills/` for `$?`/`rc` comparisons against 66 or 70 finds none. The published packages are consumed by adopters whose CI may branch on 66/70 (unmeasured), and Rust-contract EXIT-06 says a shipped number and meaning are never reassigned, so the migration is a breaking change of the Swift set.

**X5 recommendation (the owner default stands):** SH-GATE-08 binds every new gate; SH-ERR-25's carve-out is frozen to the 16 named sites and cites SH-GATE-08 in its gate row. If the owner prefers renumbering, add one SH-GATE-08 row for "tool ran, result untrustworthy" first (69 is close but means "tool missing"), then the cost is 16 code lines plus 23 doc lines in 15 files and a major bump of `swift-quality` and `swift-package`. Note one more site in the same tree: `never-gate.sh:8-9` documents exit 123 for "xargs folded the tool's 1" while SH-ERR-18 forbids exiting 123; it passes the tool's status through rather than choosing it.

### 9. Corrections to the consolidated file

- **[EM] §5 / C-1 "13 of 15 benign":** the full census is 59 of 62 benign (95%), 2 defects, 1 latent; the dissent on SC2312 stands and now has the full 191-site count.
- **C-8 "SC2312 150 vs 191":** 150 is the sites in the 41 `set -e` files, 191 all authored; 41 more sit in 14 files without `set -e`.
- **SH-ERR-22 *Why*:** the inline form fails on ksh93u+m 1.0.10 with exit 1, not exit 0 (measured, `waitsig`: `EXITED 1`).
- **SH-EXP-21:** "only inside a function or subshell" is wrong for a function; see section 5.
- **SH-ERR-08's 2310 example** is unchanged; this file adds that SC2310 stays red on a repaired callee.

## Normative guidance candidates

Check shapes follow the enforced grammar: every `grep` has a directory operand and `-r`, one `-e` per alternative, quoted `--include` globs, no command substitution, `xargs -r`; the OUTPUT of each grep is the violation (empty output means pass). "RUN" says whether the check was watched red on a plant and green on a twin; fixture paths are under `[F]`.

**SH-ERR-07 (revised) · SHOULD (rc entry MUST) — Ship `enable=check-set-e-suppressed` and no `check-extra-masked-returns` in `.shellcheckrc`; answer each SC2310 hit by calling the function outside the condition or by `# shellcheck disable=SC2310  # predicate: <what>`; a callee with two or more fallible steps gets `|| return` on each *and* the directive.**
- *Why:* 62 sites, 59 benign, 2 defects, 1 latent (section 1); repairing the callee does not silence the call site (section 2); no severity floor above `info`.
- *Verify:* `shellcheck --norc -o check-set-e-suppressed -f gcc FILE` (SC2310; needs `set -e` in the file); count table: `run.sh bash burndown-inner.sh REPO`.
- *RUN:* yes. `repro-run-gate.sh` exit 1 (SC2310); `repro-run-gate-twin.sh` (directive) exit 0, `repro-run-gate-twin2.sh` (`set +e; run_gate; _rc=$?; set -e`) exit 0; `burndown-inner.sh` `fx-plant` exit 1, `fx-twin` exit 0.

**SH-ERR-10 (extended) · MUST — Never `eval "$(cmd)"`, `cd "$(git …)"`, `cd "$(realpath …)"`, `cd "$(mktemp …)"` or `exec prog "$(cmd)"` in installer, CI and dev scripts: capture first (`top=$(git rev-parse --show-toplevel)`), then `cd "$top"`.**
- *Why:* the substitution is an argument, so `cd ""`, `eval ""` and `exec prog ""` succeed when the producer fails (SC2312 wiki, problem 1); on the fleet these shapes are the only real SC2312 defects.
- *Verify (G-MASK; output is the violation):* `grep -rnE --include='*.sh' --include='*.bash' --exclude-dir='.git' -e '^eval[[:space:]]+"[$][(]' -e '[[:space:];&]eval[[:space:]]+"[$][(]' -e 'cd[[:space:]]+"[$][(]git[[:space:]]' -e 'cd[[:space:]]+"[$][(]realpath[[:space:]]' -e 'cd[[:space:]]+"[$][(]mktemp[[:space:]]' -e '^[[:space:]]*exec[[:space:]].*"[$][(]' .`
- *RUN:* yes. `x4/plant` 3 lines (exit 0), `x4/twin` empty (exit 1). Over the 199 authored fleet files: 8 lines, 2 real (`release_gate.sh:12`, `fma/run.sh:14`), 6 exempt `eval "$(ocx …)"` doc snippets (`ocx/test/doc_scripts/`), 0 noise.

**SH-ERR-33 (new) · CONSIDER — A directory of *new* scripts may opt into SC2312 through a nested `.shellcheckrc` that repeats every root key (`enable=check-set-e-suppressed` and `enable=check-extra-masked-returns`); never a nested rc with only the SC2312 key.**
- *Why:* the nearest rc replaces its parent (section 2); the nested file with one key silently drops SC2310 for that directory.
- *Verify:* `cd DIR && shellcheck -f gcc SCRIPT` shows both codes on a script with both shapes; a script reporting SC2312 but never SC2310 under a `set -e` header with a function-in-`if` means the nested rc lost a key.
- *RUN:* yes. `rc-tree/` top.sh: SC2310 SC2311; `sub/new.sh` with the one-key rc: SC2312 only (the defect the rule prevents).

**SH-ERR-29 (new) · MUST — No `shopt -s nullglob` or `shopt -s failglob` at the top level of a script, in a prologue, or in a sourced library.**
- *Why:* both change every glob in the process: `ls ./*.x` lists the cwd, `grep p *.x` reads stdin, `find *.x -name '*.dat' -delete` deletes the cwd tree under nullglob; failglob skips only the failing command and exits 0 without `set -e` and kills the `[ -e ] || continue` guard (section 4).
- *Verify (output is the violation):* `grep -rnE --include='*.sh' --include='*.bash' --exclude-dir='.git' -e '^shopt[[:space:]]+-s[[:space:]].*nullglob' -e '^shopt[[:space:]]+-s[[:space:]].*failglob' .` A top-level set/unset region that is intentional must become a subshell (SH-ERR-30).
- *RUN:* yes. `globs/plant-prologue.sh` 1 line (exit 0), `globs/twin-contained.sh` empty (exit 1). ShellCheck 0.11.0 `-o all` does **not** flag it (only SC2250): grep-only.

**SH-ERR-30 (new) · MUST — Contain any glob shopt in a subshell (`( shopt -s nullglob; … )` or `f() ( … )`) or a save/restore pair (`shopt -q nullglob && had=1 … [ "$had" -eq 1 ] || shopt -u nullglob`). `local -` is not containment.**
- *Why:* a function leaves nullglob on for the caller on bash 3.2-5.3 (8 of 8); `local -` (4.4+) saves single-letter `set` options only.
- *Verify:* `bash leak-check.sh LIB FUNC` (source the library, call the function in the current shell, exit 1 if `nullglob` or `failglob` is on), run through `matrix.sh bash` for the version range.
- *RUN:* yes. `plant-leaky-lib.sh collect`: `LEAK: nullglob is on after collect`, exit 1 on 8 of 8; `twin-restore-lib.sh collect` and `collect_sub`: exit 0 on 8 of 8.

**SH-ERR-31 (new; joint with SH-EXP-21) · MUST — A script that globs for required input gives "nothing matched" its own exit status (79) through an explicit test: `set -- ./*.x; if [ ! -e "$1" ] && [ ! -L "$1" ]; then echo "no input files" >&2; exit 79; fi`. Optional input uses the `[ -e "$f" ] || [ -L "$f" ] || continue` guard.**
- *Why:* default globbing feeds the literal to the next command (accidental failure for `cat`, silent success for `rm -f`/`echo`/`cp -r`); nullglob gives a silent exit 0; failglob gives exit 0 plus a message without `set -e`; `[ -e ]` alone skips dangling symlinks.
- *Verify:* run the script in an empty directory and require exit 79: `matrix.sh posix SCRIPT` (11 interpreters) or `matrix.sh bash SCRIPT` (8 versions); expected `-> exit 79` everywhere.
- *RUN:* yes. Twin `contract-twin-explicit.sh` exit 79 on 11 of 11 POSIX and 8 of 8 bash. Plants: `contract-plant-default.sh` exit 1 (accidental, from `cat` of the literal) on 19 of 19; `contract-plant-nullglob.sh` exit 0 on 8 of 8; `contract-plant-failglob.sh` prints `no match: ./*.zzz`, then `all inputs processed`, exit 0 on 8 of 8. All three differ from 79, red.

**SH-ERR-32 (new) · MUST — No `shopt` (or other bash-only builtin) in a `#!/bin/sh` script.**
- *Why:* dash, both ashes, mksh, both ksh93u+m, yash, posh and zsh-in-sh print "not found" and continue; under `set -e` the script dies 127 (oils spec marks the same rows).
- *Verify:* `shellcheck --norc -s sh FILE` (SC3044, default-on in the `sh` dialect); behavioural `matrix.sh posix FILE`.
- *RUN:* yes. `globs/sh-shopt-plant.sh` SC3044 exit 1, twin exit 0; `matrix.sh posix`: 9 of 11 print not found, bash `--posix` x2 accept.

**SH-ERR-16 (Windows row added) · MUST — On Git Bash the SH-ERR-16 handlers give the Linux statuses to a bash parent (130/143/129); a native parent sees `exit N` unchanged and a signal death as `signal<<8`.**
- *Why:* Cygwin `pinfo.cc:231-233` byte swap; measured 143 for `trap 'exit 143' TERM` and 3840 for an untrapped TERM through PowerShell 5.1, `cmd.exe` and node 24.14.0.
- *Verify:* `matrix.sh win sig.sh` (Git Bash) and `matrix.sh win sig-native.ps1` (native parent) from `[F]`; require handler cases `rc=130/143/129` and the returning-handler plant `cleanup-on-signals rc=0` to stay the red case.
- *RUN:* yes. Returning handler plant exit 0 with `CLEANUP SURVIVED CLEANUP` (red); `exit-handler-*` 130/143/129 (green); native `handler-exit-143` 143.

**SH-ERR-19 (Windows row added) · SHOULD — Never hardcode a signal number above 15 and decode only with the running shell's `kill -l`; a script whose caller may be a native Windows process also accepts `N*256` (256, 512, 3840, 2304).**
- *Why:* MSYS numbers USR1/USR2/BUS/CHLD/CONT/STOP/TSTP differently from Linux (`kill -l 138` is BUS vs USR1); `kill -l 3840` is invalid.
- *Verify:* `matrix.sh win sigdecode.sh` and `matrix.sh bash sigdecode.sh`: `3840=SIGTERM 512=SIGINT 256=SIGHUP 2304=SIGKILL 143=SIGTERM 130=SIGINT`, and the naive `kill -l 3840` line `invalid signal specification`; literal scan stays G-LIT.
- *RUN:* yes. Decode function identical on Git Bash and 8 of 8 bash; naive decode red (`invalid signal specification`) for 3840 and 512.

**SH-ERR-22 (revised) · SHOULD — Re-raise from a function that first resets every trap it installed (`trap - EXIT HUP INT TERM`), then cleans up, then `kill -s "$1" "$$"`.**
- *Why:* without the reset the handler re-enters itself until SIGSEGV on dash, busybox ash 1.35/1.37 and bash 5.3, and ends `exit 143` instead of a signal death on bash 3.2; the inline-string form fails on ksh93u+m 1.0.10 (exit 1).
- *Verify:* `reraise/run-reraise2.sh` (reports `DIED-OF-SIGNAL N` per interpreter), or `TR_F/check-signal.py TERM raise SCRIPT INTERP`; require `DIED-OF-SIGNAL` for HUP, INT and TERM.
- *RUN:* yes. `v-func.sh` died of 1/2/15 on 6 of 6 interpreters; plant `v-nopt.sh` red (SIGSEGV or exit 143/1) on 6 of 6.

**SH-ERR-25 (revised, X5) · SHOULD — New gate scripts use the SH-GATE-08 table (0 clean, 1 findings, 69 tool missing, 78 config missing, 79 no input, plus the Rust-table codes 64/65 as needed) and state it in an `# Exit:` header. The 66/70 carve-out covers only the 16 existing sites named in section 8.**
- *Why:* 66 and 70 are "never claimed" in the Rust table and discouraged in sysexits(3); renumbering the shipped Swift checks is 16 code lines plus 23 doc lines and a major bump.
- *Verify (output is the violation, scoped to new files by the reviewer):* `grep -rnE --include='*.sh' --exclude-dir='.git' -e 'exit[[:space:]]+66' -e 'exit[[:space:]]+70' .` (comment lines also match; the 16 carve-out sites are the allowed hits).
- *RUN:* yes. `x5/plant` 2 lines (exit 0), `x5/twin` empty (exit 1); over the lore tree it lists exactly the 16 code sites plus comment lines.

## Verification runs

All commands run 2026-10-11 from `[F]`; `-> exit N` is the process status; "red" means the check reported the planted defect, "green" that the twin passed.

| # | check | fixture | command | plant | twin | key output |
|---|---|---|---|---|---|---|
| 1 | burn-down counter, exit 1 on any SC2310 | `fx-plant/`, `fx-twin/` (git repos) | `run.sh bash burndown-inner.sh $PWD/fx-plant` | exit 1 (red) | exit 0 (green) | plant `\| fx-plant \| 1 \| 1 \| 0 \| 1 \|`, twin `\| fx-twin \| 1 \| 0 \| 0 \| 0 \|` |
| 2 | SC2310 on a masked callee | `repro-run-gate.sh`, `-twin.sh`, `-twin2.sh` | `run.sh shellcheck --norc -o check-set-e-suppressed -f gcc FILE` | exit 1, `This function is invoked in an \|\| condition so set -e will be disabled [SC2310]` | twin (callee repaired, no directive) **still exit 1**; with directive exit 0; `set +e` form exit 0 | behaviour: plant `gate ran with -OcxBin=[]  rc=0` on 8 of 8 bash, twin `rc=1` on 8 of 8 |
| 3 | SC2310 needs `set -e` | `sc/withset.sh`, `sc/noset.sh` | `… -o check-set-e-suppressed,check-extra-masked-returns -f gcc FILE` | `withset.sh:4:4 … [SC2310]`, `5:5 … [SC2311]` | `noset.sh`: SC2312 only | SC2310 gone without `set -e` |
| 4 | G-MASK grep (SH-ERR-10) | `x4/plant`, `x4/twin` | the SH-ERR-10 grep, operand `x4/plant` | 3 lines, grep exit 0 | empty, grep exit 1 | `guard.sh:3:eval "$(tool init bash)"`, `:4:cd "$(git rev-parse --show-toplevel)"`, `:5:exec ./prog "$(wslpath -w scenes)" "$@"` |
| 5 | nested rc replaces parent | `rc-tree/` | `cd rc-tree && run.sh shellcheck -f gcc top.sh` and `sub/new.sh` | `sub/new.sh`: SC2312 only (SC2310 lost) | `top.sh`: SC2310 SC2311 | observational (defines SH-ERR-33) |
| 6 | G-SHOPT grep (SH-ERR-29) | `globs/plant-prologue.sh`, `globs/twin-contained.sh` | the SH-ERR-29 grep | `3:shopt -s nullglob failglob`, exit 0 | empty, exit 1 | red / green |
| 7 | shopt leak (SH-ERR-30) | `globs/plant-leaky-lib.sh`, `twin-restore-lib.sh` | `matrix.sh bash leak-check.sh LIB FUNC` | `LEAK: nullglob is on after collect`, `-> exit 1` x8 | `ok: no shopt leaked`, `-> exit 0` x8 | 8 of 8 bash 3.2-5.3 |
| 8 | empty-glob contract (SH-ERR-31) | `globs/contract-*.sh` | `matrix.sh bash FILE`, `matrix.sh posix FILE` | default: exit 1 x19; nullglob: exit 0 x8; failglob: message then `all inputs processed`, exit 0 x8 | `no input files`, exit 79 on 8 of 8 bash and 11 of 11 POSIX | none of the plants returns 79 |
| 9 | `shopt` in `#!/bin/sh` (SH-ERR-32) | `globs/sh-shopt-plant.sh`, `-twin.sh` | `run.sh shellcheck --norc -s sh -f gcc FILE`; `matrix.sh posix FILE` | `2:1: warning: In POSIX sh, 'shopt' is undefined. [SC3044]`, exit 1 | exit 0 | `matrix.sh posix`: dash `shopt: not found`, ash x2, mksh `inaccessible or not found`, ksh x2, yash `no such command`, posh, zsh `command not found`; all then `reached` (exit 0) |
| 10 | re-raise (SH-ERR-22) | `reraise/v-func.sh`, `v-nopt.sh` | `reraise/run-reraise2.sh` | `v-nopt`: `CLEANED`x27565 `DIED-OF-SIGNAL 11` (dash), x8880/x8879 (ash), x5691 (bash 5.3), `EXITED 143` after x2 (bash 3.2) | `v-func`: `CLEANED DIED-OF-SIGNAL 1/2/15` x6 interpreters x3 signals | red / green |
| 11 | X5 exit grep (SH-ERR-25) | `x5/plant`, `x5/twin` | the SH-ERR-25 grep | 2 lines, exit 0 | empty, exit 1 | `exit 66; }`, `exit 70; }` |
| 12 | returning handler under Git Bash (SH-ERR-16) | `sig.sh` | `matrix.sh win sig.sh` | `cleanup-on-signals rc=0 out=[CLEANUP~SURVIVED~CLEANUP~]` | `exit-handler-INT/TERM/HUP rc=130/143/129` | red / green |
| 13 | signal decode (SH-ERR-19) | `sigdecode.sh` | `matrix.sh win sigdecode.sh`; `matrix.sh bash sigdecode.sh` | `naive kill -l 3840: 3840: invalid signal specification` | `3840=SIGTERM 512=SIGINT 256=SIGHUP 2304=SIGKILL` | Git Bash and 8 of 8 bash identical |
| 14 | dangling-symlink guard | `globs/dl/` | `docker run … bash:5.3 bash FILE` and `dash FILE` | `guard-e-only.sh`: `processed=0`, exit 0 | `twin.sh`: `cat: can't open './x.zzz'`, exit 1 | `[ -e ]` alone hides the link |

Observational runs (no red/green): `glob.sh default|nullglob|failglob|both` (section 4 table), `failglob-flow.sh`, `nullglob-u.sh`, `shopt-leak.sh`, `sig.sh` on Linux, `sig-native.ps1`, `sig-cmd.cmd`, `sig-node.js`, `sigtable.sh`, `census.py`, `burndown.py --tier authored|authored+agent|all`.

**Did not go red:** (a) `shellcheck --norc -o all` on `plant-prologue.sh` and `contract-plant-default.sh` reports only SC2250 (style), the same on the twins, so no ShellCheck 0.11.0 check covers a prologue glob shopt or an unguarded glob loop; those rules are check 6, 7 and 8, not ShellCheck. (b) Check 2: SC2310 stays red on the repaired twin, by design (see section 2). (c) Two Git Bash questions were not run: a GitHub-hosted `windows-2025` runner and the .NET runner's reading of a signalled child.

Reproducers for fleet defects (reported, not fixed, owner Q6): `run-windows-activation.sh:39-46,70,77` -> `repro-run-gate.sh` (8 of 8 bash print `gate ran with -OcxBin=[]  rc=0`); `arcana/nox/scripts/release_gate.sh:12` and `fma/run.sh:14` -> `x4/plant/guard.sh` shape; `www-setup/src/install.sh:799` latent, no reproducer (the step cannot fail today).

## Exemplar evidence

| candidate | satisfies | violates or contradicts |
|---|---|---|
| SH-ERR-29 / -30 (no prologue shopt; contain it) | `junegunn/fzf@25adb674537b:shell/completion.bash:538-546` sets `nullglob` inside a `<( … )` subshell and writes why ("We need to set nullglob to avoid attempting to read the literal filename"); `shellspec/shellspec@f2d13f991885:lib/general.sh:790-799` does `shopt -u failglob` inside a subshell ("used to revert changes directory, variables and shell flags"), probing availability first (`libexec/shellspec-inspection.sh:189`); `pyenv/pyenv@d28b75076744:pyenv.d/rehash/source.bash:4-10,23-29` pairs set/unset around each loop (unconditional `-u`, so a caller's earlier nullglob is lost in these sourced hooks) | `direnv/direnv@28a73d1df3f3:stdlib.sh:12` `shopt -s nullglob` at top level of a library every `.envrc` sources; `oils-for-unix/oils@57d3f0d088c3:soil/web.sh:12` top-level in a script; `devtools/format.sh:118` and `test/syscall.sh:342` set it inside a function with no restore (leak, section 5) |
| SH-ERR-31 (explicit empty-glob contract) | fleet guards: `ocx-website/scripts/bin/oxc.sh:13-14`, `obere-heide-planer/tools/bin/oxc.sh:15-16` (`[ -x "$f" ]`), `www-setup/tests/install/helpers/server.bash:363-364`; [BashPitfalls #1](https://mywiki.wooledge.org/BashPitfalls) recommends the `[ -e "$file" ] || continue` guard | `ocx/test/manual/scripts/setup-patches.sh:239` unguarded glob loop over a committed directory (benign); none of the 41 exemplars was scanned for unguarded glob loops (not measured) |
| SH-ERR-32 (no `shopt` in sh) | `shellspec@f2d13f991885:libexec/shellspec-inspection.sh:189` probes `shopt -s failglob 2>/dev/null` before use and `# shellcheck disable=SC3044` at `lib/general.sh:797` | none seen in the fleet's `#!/bin/sh` scripts |
| SH-ERR-07 / -10 | fleet: `www-setup/src/install.sh:159-161,128-133` one-command predicates; `ocx` doc snippets as the exempt rc idiom | `arcana/nox/scripts/release_gate.sh:12`, `fma/run.sh:14` (SH-ERR-10); `ocx/test/manual/run-windows-activation.sh:41-45,70,77` (SH-ERR-06/07) |
| SH-ERR-22 | `PowerShell/PowerShell@5d871eb5e02c:tools/install-powershell.sh:43-47` inline form (correct on the four requested interpreters, wrong on ksh93u+m 1.0.10) | `grimoire/docs/public/install.sh:24` and the SH-ERR-16 sites in [EM] "Applied" use the returning handler |
| SH-ERR-25 / X5 | `www-setup/src/install.sh:27-36` documented 0-7 taxonomy; `rules/swift-quality/checks/*.sh` carry `# Exit:` headers | 16 sites at 66/70 in 7 shipped scripts (section 8) |
| SH-ERR-16/19 Windows | no exemplar handles Git Bash status bytes | none |

Exemplar spec cited for behaviour: `oils-for-unix/oils@57d3f0d088c3:spec/glob-bash.test.sh:16-110` (failglob in command, loop, array and `set -e` contexts; the semicolon-versus-newline note).

## AI-agent angle

| characteristic mistake | smallest mechanical check |
|---|---|
| Adds `shopt -s nullglob` (or `failglob`) to the "strict mode" prologue because a blog post lists it beside `set -euo pipefail` | SH-ERR-29 grep (column 0); not in ShellCheck |
| Believes `shopt -s failglob` makes the script stop when nothing matches; ships exit 0 with a stray error line | `matrix.sh bash` of the contract script in an empty dir; expect 79 |
| Wraps `shopt -s nullglob` in a function or uses `local -` and assumes it is scoped | `leak-check.sh LIB FUNC` |
| Puts `shopt` in a `#!/bin/sh` script, or `[[ ]]`/arrays next to it | SC3044, SC3010, SC3054 under `shellcheck -s sh` |
| Guards a glob loop with `[ -e "$f" ] \|\| continue` and thinks the dangling symlink case is handled | `contract-twin` form with `-L`; reading |
| `rm`/`ls`/`grep`/`find` after a nullglob with a glob that can be empty: lists or deletes the cwd, reads stdin | the effect matrix; no tool |
| Adds `enable=check-extra-masked-returns` to the rc "for safety" and then blanket-disables SC2312 file-wide to get green | the rc diff; G-MASK is the narrower check |
| Fixes the callee with `\|\| return` and expects SC2310 to go away, or deletes `set -e` to silence it | SC2310 stays; directive with a reason required |
| Reaches for `# shellcheck disable=SC2310` file-wide at the top of a script that has real defects | a file-scope disable in `run-windows-activation.sh` would hide the two real sites; reviewer reads the directive scope |
| Trusts `$?` > 128 on Windows and decodes with `kill -l $rc`, or hardcodes `137`/`143` | `kill -l 3840` is invalid; `sigdecode.sh` |
| Copies a re-raise without `trap - SIG` | `run-reraise2.sh` (SIGSEGV loop, 5.7k to 27.6k handler runs) |
| Writes the re-raise as an inline string and tests only on bash | ksh93u+m 1.0.10 exit 1; `matrix.sh posix` |
| Chooses exit codes from memory (66 for "no input", 70 for "internal error") because sysexits looks official | SH-ERR-25 grep; SH-GATE-08 table |
| Treats a `FILE: shopt: not found` line as non-fatal noise in sh | exit 0 on 9 of 11 interpreters without `set -e` |
| Uses GNU `find -delete`/`rm` semantics without checking that an empty glob leaves `find` with no path | the nullglob `find_delete` row |
| Assumes macOS `/bin/bash` 3.2 lacks `nullglob`/`failglob` | both exist (failglob since 3.0); the real 3.2 gaps are empty arrays under `set -u` and `local -` |

## Contested / evolving

- **Is nullglob a sensible default for scripts?** Practitioners split: the Wooledge wiki lists it as an alternative to the POSIX guard with a warning about every other glob in the script ([BashPitfalls](https://mywiki.wooledge.org/BashPitfalls)); a widely read Unix & Linux answer argues the unset behaviour is least bad because `ls` with no argument lists the cwd (a web-search summary; the page itself returned a bot challenge and was not read). This file decides by measurement (section 4) and calls the question settled for the fleet's hardened prologues; as of 2026-10-11 no source read changes bash's default.
- **failglob** is the csh/zsh-style behaviour, but bash applies it per command with the semicolon-versus-newline quirk oils chose not to copy ([oils spec](https://github.com/oils-for-unix/oils/blob/master/spec/glob-bash.test.sh)). Whether a future bash changes this is not announced in the 5.3 NEWS read.
- **SC2312** has been optional since 0.8.0 (2021) and stays optional in 0.11.0 (2025-08-03); the changelog says new data-flow analysis will make existing checks "trigger differently (but more accurately)", so counts may shrink on a later release. Re-run `burndown.py` on each ShellCheck release.
- **errexit itself.** [BashFAQ/105](https://mywiki.wooledge.org/BashFAQ/105) (linked from the SC2310 wiki page) argues that explicit checks beat `set -e`; this file's SC2310 numbers support the narrower claim that functions-in-conditions are rare enough in the fleet (62 sites) to review one by one.
- **sysexits.** The FreeBSD page calls the interface deprecated and discouraged; the fleet's Rust contract still mirrors 64-78. The trend inside the fleet is toward the SH-GATE-08/Rust vocabulary; the Swift set predates it.
- **Native Windows statuses.** The `signal<<8` convention is Cygwin/MSYS runtime behaviour, not a Windows rule; a GitHub-hosted Windows runner may or may not normalise it (unverified).

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html | POSIX.1-2024 XCU 2, Shell Command Language (primary) | 2024 | 2.14.3 "pattern string shall be left unchanged"; the `set -e` application-usage warning about functions; 2.8.2 status above 128 |
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/kill.html | POSIX `kill` utility (primary) | 2024 | `kill -l exit_status` and the `[ $stat -gt 128 ]` example SH-ERR-19 rests on |
| https://tiswww.case.edu/php/chet/bash/bash.html | bash reference manual page, 5.3 (primary) | 2025 | verbatim `nullglob`/`failglob` semantics and the pathname-expansion rules |
| https://tiswww.case.edu/php/chet/bash/NEWS | bash NEWS 2.03-5.3 (primary) | to 2025 | failglob in 3.0; `local -` and `inherit_errexit` in 4.4; bare `exit` in a trap, 5.3 |
| https://github.com/koalaman/shellcheck/wiki/SC2310 | ShellCheck wiki SC2310 (primary; local clone at `0b4dfe7bf9dc`, 2026-10-09) | 2026 | rationale and the "disable it if you don't care" exception |
| https://github.com/koalaman/shellcheck/wiki/SC2312 | ShellCheck wiki SC2312 (primary) | 2026 | `cd "$(get_chroot_dir)/etc"` problem 1 is the fleet's real shape |
| https://github.com/koalaman/shellcheck/wiki/Optional | ShellCheck optional checks (primary) | 2026 | how `check-set-e-suppressed` and `check-extra-masked-returns` are enabled |
| https://github.com/koalaman/shellcheck/wiki/Directive | ShellCheck directives and `.shellcheckrc` (primary) | 2026 | rc search order (script directory and parents) |
| https://hackage.haskell.org/package/ShellCheck-0.11.0/changelog | ShellCheck changelog to 0.11.0 (primary) | 2025-08-03 | SC2312 added in 0.8.0; data-flow engine note |
| https://raw.githubusercontent.com/cygwin/cygwin/main/winsup/cygwin/pinfo.cc | Cygwin runtime source, process exit (primary) | main, read 2026-10-11 | lines 231-233: the byte swap behind `signal<<8` |
| https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-cancellation | GitHub Actions cancellation (primary) | 2026 | SIGINT, 7500 ms, SIGTERM, 2500 ms, kill tree; `bash/cmd/pwd` entry process |
| https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax | GitHub Actions workflow syntax, `shell:` table (primary) | 2026 | `bash --noprofile --norc -eo pipefail {0}`; bash on Windows is Git for Windows |
| https://man.freebsd.org/cgi/man.cgi?query=sysexits&sektion=3 | sysexits(3) (primary) | 2026 | "deprecated … discouraged"; EX_NOINPUT 66, EX_SOFTWARE 70 definitions |
| https://mywiki.wooledge.org/BashPitfalls | Greg's wiki, BashPitfalls (secondary) | maintained | #1 the `[ -e "$file" ] \|\| continue` guard and the nullglob caveat |
| https://mywiki.wooledge.org/BashFAQ/105 | Greg's wiki, why `set -e` surprises (secondary) | maintained | the long-form case against relying on errexit |
| https://mail.gnu.org/archive/html/bug-bash/2013-09/msg00000.html | bug-bash "Failglob issues" (secondary, not re-run) | 2013 | nullglob plus failglob precedence; failglob in an associative array literal |
| https://github.com/oils-for-unix/oils/blob/master/spec/glob-bash.test.sh | oils spec cases for bash glob options (secondary; exemplar `@57d3f0d088c3`) | 2026 | executable record of failglob behaviour in loop, array and `set -e` contexts |

---
title: "Catalog verification dialect: git-fed lists, -e alternatives, xargs -r, red and green on GNU, busybox and uutils"
topic: shell scripting across operating systems and shells, wave 3, cross-cutting dive gate/verify-dialect (revision of shell-gate.md, SH-GATE IDs held stable)
agent: verify-dialect
model: sonnet
date_researched: 2026-10-11
sources_count: 20
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/verify-dialect/
scope: >
  Decides which single command shape every shipped shell-set verification uses so it runs unchanged on GNU grep 3.11/3.12 (ubuntu:24.04, 26.04), busybox 1.37 (alpine:3.22, busybox:1.37) and uutils coreutils 0.10.0 (ubuntu:26.04), plus Git Bash 2.40 on the Windows host.
  Covers: 21 representative cells (18 line cells from six consolidations plus 3 structural YAML cells) in current and rewritten form, 11 catalog self-checks, git pathspec depth, quoted --include on busybox, markdown-table pipes, what empty output means when grep exits 2, busybox and uutils host verdicts, the M-X-05 answer.
  Not covered: BSD and macOS (read only, marked "unverified: read only"; FreeBSD 15.1 man pages are cited, macOS is not FreeBSD); the 1162 sibling-language --include lines and 542 rg lines are measured but not rewritten (owner call, Finding 13); ShellCheck, shfmt and PowerShell content is owned by the sibling consolidations.
---

# Catalog verification dialect (SH-GATE revision)

Dated 2026-10-11. Fixture root `V/` = `/home/mherwig/.cache/research-lang/shell-tools/fixtures/verify-dialect`. Hosts in every table: **u24** ubuntu:24.04 (GNU grep 3.11, findutils 4.9.0, coreutils 9.4), **u26** ubuntu:26.04.1 (GNU grep 3.12, findutils 4.10.0, **uutils coreutils 0.10.0**), **alp** alpine:3.22 (BusyBox v1.37.0 grep, xargs, awk, find), **alpgnu** alpine:3.22 plus GNU grep 3.12 and findutils 4.10.0 (the control that separates "busybox" from "alpine"), **gitbash** Git Bash on the Windows host (MSYS grep 3.0, findutils 4.9.0, gawk 5.0.0, git 2.40.0.windows.1). git 2.43 to 2.53 elsewhere. The WSL host (grep 3.12, xargs 4.10.0, git 2.54.0, bash 5.3.0, zsh 5.9) is a sixth GNU data point.

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The hosts, and a correction to the brief](#f1)
   2. [What busybox 1.37 grep and xargs accept](#f2)
   3. [What empty output means when grep exits 2](#f3)
   4. [Current versus rewritten cells, 21 cells on five hosts](#f4)
   5. [The git-fed shape: pathspec depth, basename globs, exclusions, ignored and deleted files](#f5)
   6. [Option-looking file names and quoting: `-z`, `-0`, `--`, `-H`](#f6)
   7. [The new failure class: the producer fails behind the pipe](#f7)
   8. [Script-grade checks: list to a file, then xargs (reference script, red and green)](#f8)
   9. [PCRE, `-z` and multi-line cells: awk in checks/ scripts](#f9)
   10. [`git grep` as the one-process alternative](#f10)
   11. [Markdown table cells and the pipe character](#f11)
   12. [Busybox and uutils as verification hosts](#f12)
   13. [Catalog scale and the M-X-05 answer](#f13)
   14. [Defects found in the consolidations (reported, not fixed)](#f14)
   15. [BSD and macOS (unverified: read only)](#f15)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Verification runs](#verification-runs)
5. [Exemplar evidence](#exemplar-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- **One shape for every non-shell file:** `git ls-files -z --cached --others --exclude-standard -- PATHSPEC... | xargs -0 -r grep -H -n -e PAT -e PAT2 --`. All 18 line cells rewritten to it go red on the plant and green on the twin on u24, u26, alp, alpgnu and gitbash (`V/results/final.txt`, form `new`: 90 of 90).
- **Shell files stay on SH-GATE-09 `files()`** (`git ls-files ... | xargs -0 -r shfmt -f | tr '\n' '\0'`); it needs `shfmt` on PATH and fails open without it (Finding 7), so a PREFLIGHT line precedes every cell.
- **The current forms are not portable.** `grep -r --include` (117 lines in the seven consolidations, 1162 in the shipped catalog) died as an unrecognized option on busybox in 17 of 18 cells; 17 of 17 failures were "masked": stdout empty, the error only on stderr (30 usage lines) or swallowed by the next pipe stage.
- **Empty output after a grep exit 2 reads as "clean"** under `| grep -v`, `| wc -l`, `2>/dev/null || echo clean`, `[ -z "$(...)" ]` and `| xargs -r grep` (all five measured on busybox, `V/results/mask-summary.txt`).
- **xargs erases the difference between "no match" and "error"**: grep exit 1 and grep exit 2 both give xargs 123 (measured on all hosts). Judge a cell by its output and by empty stderr, never by its status; `grep -L` through xargs even inverts between GNU (plant 123, twin 0) and busybox (plant 0, twin 123).
- **The git-fed shape moves the failure upstream.** `git` missing, not a repo, or dubious ownership (a root container on a bind mount) all print an error and exit 0 with empty stdout. Fix: an inline PREFLIGHT line that prints on failure (red on four faults, green when healthy, five hosts) and, for scripts, list-to-file with an exit map 0/1/69/74/78/79 (`V/vd-check.sh`: 9 of 9 cases correct on four Linux hosts, 6 of 9 measurable on Git Bash).
- **Pathspec `'*.yml'` matches at any depth** (`.github/workflows/ci.yml`, `sub/deep/c.yml`, `top.yml`); `:(glob)*.yml` matches only the top level. A basename `--include=Makefile` becomes `':(glob)**/Makefile'`, not `'Makefile'` (root only) and not `'*Makefile'` (also matches `NotMakefile`). Measured on four hosts.
- **Always `-H`, `-n`, `--` and `-z`/`-0`:** one file in a batch prints no file name without `-H`; a file named `-x.sh` is parsed as options without `--` (123 on all hosts); without `-z` git C-quotes `café.sh` and xargs dies on `it's.sh`.
- **The portable grep option set is `-E -F -e -H -n -l -L -c -o -q -s -v -w -x -i --`.** Banned: `-r -R --include --exclude --exclude-dir -P -z -Z -U --null --no-messages --color`, and `-I` (busybox accepts and ignores it). busybox grep has no long options at all and `-z` only with `EXTRA_COMPAT`.
- **PCRE and multi-line cells move to `checks/` as awk programs**, not a python3 fallback: python3 is absent from every stock image (alpine, busybox, ubuntu) and awk is present on all. Three structural SH-CI cells (07, 22, 11) became 9 to 12 line awk programs, red/green on all five hosts; the PCRE originals die on alp and gitbash (`-P` unrecognized; MSYS `-P` needs a UTF-8 locale).
- **No verification command in a markdown table cell.** An unescaped `|` inside a code span splits the cell (markdown-it 3.0.0: `grep -E -e 'foo` is cut off); `\|` renders as `|` but a raw read gives an invalid shell line. Cells carry a check ID; commands live in fenced blocks. 69 of 1532 table rows with grep/rg/xargs in the shipped catalog carry `\|`.
- **Busybox 1.37 is a supported executor, not a supported author environment:** every shape runs on it once `git` is installed; stock alpine:3.22 and busybox:1.37 have no git, bash (alpine), python3, rg, shfmt or shellcheck.
- **uutils coreutils 0.10.0 changes nothing:** grep, xargs, find, sed and diff stay GNU on ubuntu:26.04; the shape's tr, cut, head, wc, od, sort and mktemp are uutils and behave identically (149 of 151 probe rows identical to u24; the two that differ are the tool-version banners).
- **CR detection must not be `grep -e $'\r'`:** dash has no `$'..'` (G3 current form: MISS on u24 and u26) and MSYS grep 3.0 in text mode never sees the CR (Git Bash: `grep -l` empty, `grep -lU` finds it). Use awk with `BINMODE=3` or `git ls-files --eol`.
- **M-X-05 answer (owner):** adopt the git-fed shape for the shell set now; leave the 1162 sibling `--include` lines and 542 `rg` lines to their sets, labelled `(GNU grep)` and `(rg)`, until the owner chooses the mechanical rewrite (Finding 13).
- **A directory-operand checker rule will reject the binding shape** unless it exempts a grep whose operands come from `xargs`.

## Findings

### F1. The hosts, and a correction to the brief {#f1}

The brief names "GNU grep 3.12 (ubuntu:24.04)". Measured: ubuntu:24.04 ships **grep 3.11-4build1**; **3.12-1 is ubuntu:26.04**. Both behave identically on every row below.

| Host | grep | xargs | coreutils | awk | git | `/bin/sh` |
|---|---|---|---|---|---|---|
| u24 | GNU 3.11 | GNU findutils 4.9.0 | GNU 9.4 | mawk 1.3.4 20240123 | 2.43.0 (apt) | dash |
| u26 | GNU 3.12 | GNU findutils 4.10.0 | **uutils 0.10.0** (`/usr/lib/cargo/bin/coreutils/*`) | mawk 1.3.4 20260129 | 2.53.0 (apt) | dash |
| alp | BusyBox v1.37.0 (2025-11-21) | BusyBox | BusyBox | BusyBox awk | 2.49.1 (apk) | ash |
| alpgnu | GNU 3.12 | GNU 4.10.0 | BusyBox | BusyBox awk | 2.49.1 | ash |
| gitbash | GNU 3.0 (MSYS) | GNU 4.9.0 | MSYS | gawk 5.0.0 | 2.40.0.windows.1 | bash 5.2 |

`V/whose.sh` on u26: `tr cut head wc od sort mktemp cat ls` resolve to `/usr/lib/cargo/bin/coreutils/*`; `grep`, `xargs`, `find`, `sed` (4.9), `diff` and `awk` (mawk) resolve to `/usr/bin/*`. dpkg: `coreutils-from-uutils 0.0.0~ubuntu25`, `rust-coreutils 0.10.0-1ubuntu2~26.04.1`, `findutils 4.10.0-3build2`, `grep 3.12-1`. "uutils on ubuntu:26.04" therefore means coreutils only. uutils 0.10.0 was released 2026-08-05 ([uutils release](https://github.com/uutils/coreutils/releases/tag/0.10.0)); Ubuntu's plan is in [Oxidising Ubuntu](https://discourse.ubuntu.com/t/carefully-but-purposefully-oxidising-ubuntu/56995).

**Stock images carry none of the tools the shape needs beyond grep, xargs, find, awk** (`V/results/stock-*.txt`, `stock-which`): ubuntu:24.04 has `bash awk find xargs grep`; alpine:3.22 and busybox:1.37 have `awk find xargs grep`. No git, python3, rg, shfmt, shellcheck; no bash on alpine or busybox. The vd-* images add `git` (and python3 on ubuntu) to isolate the verification question from provisioning.

### F2. What busybox 1.37 grep and xargs accept {#f2}

busybox `findutils/grep.c` declares the option string `"lnqvscFiHhe:*f:*LorRm:+wx"` plus context options, `"E"`, `-z` only `IF_EXTRA_COMPAT`, and `"aI"` with the comments `/* ignored: -a */` and `/* ignored: -I */` ([busybox grep.c, master](https://raw.githubusercontent.com/mirror/busybox/master/findutils/grep.c) lines 107-117; master, not the 1.37 tag, which the mirror does not carry; the measured binaries agree). There are no long options. xargs `-0` is `FEATURE_XARGS_SUPPORT_ZERO_TERM`, `default y` ([busybox xargs.c](https://raw.githubusercontent.com/mirror/busybox/master/findutils/xargs.c) lines 47-55).

Measured on alp (`V/results/probes-summary.txt`, rows `grep-opt *`, `xargs-opt *`; exit 2 and the usage text unless noted):

| Option | GNU 3.11/3.12 | busybox 1.37.0 | Git Bash 3.0 |
|---|---|---|---|
| `-n -H -h -l -L -c -o -q -s -v -i -w -x -F -E -a -m 1 -e` | works | works | works |
| `-I` | skips binary | **accepted and ignored** (`rc-binary`: prints the line of `bin.dat`) | works |
| `-r -R` | works, **searches `.` with no operand** | works, **no operand reads stdin: rc 1, no output** (`grep-r-noopnd`) | works |
| `--include=GLOB`, quoted or not; `--exclude`; `--exclude-dir` | works | **`unrecognized option: include=*.yml`** (every spelling, rc 2) | works |
| `-z -Z --null -U --no-messages` | works | **unrecognized** | works |
| `-P` | works | **unrecognized** | **rc 2 `-P supports only unibyte and UTF-8 locales`** unless `LC_ALL=C.UTF-8` or `en_US.UTF-8`; `LC_ALL=C` still fails (`V/pgb.sh`) |
| `grep -e A -e B` (one `-e` per alternative) | works | works | works |
| ERE `a\|b` | literal pipe, rc 1 | literal pipe, rc 1 | literal pipe, rc 1 |
| `xargs -0 -r`, `-n 1`, `-P 2`, `-t` | works | works | works |
| `xargs -d '\n'`, `-L 1`, `--null` | works | **unrecognized** | works |

Other behaviours that differ and affect cells: directory operand without `-r` is rc 2 on GNU, **rc 1 silent** on busybox (`rc-dir-no-r`); `grep -L` with xargs flips (below); a binary file match prints a stderr line on GNU 3.5+ (`grep: bin.dat: binary file matches`, [GNU grep NEWS 3.5](https://raw.githubusercontent.com/gnu-mirror-unofficial/grep/master/NEWS), and `-s` no longer silences it from 3.7), a stdout line `Binary file bin.dat matches` on MSYS grep 3.0, and raw lines on busybox. POSIX.1-2024 `grep` has none of `-r -R -H -L -P -z` ([POSIX grep](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/grep.html), text search of the OPTIONS section); `xargs -0 -r` are in POSIX.1-2024 ([POSIX xargs](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/xargs.html)).

The same GNU build differs by distribution in stderr noise: Alpine's grep 3.12 prints `grep: warning: stray \ before -` and `egrep: warning: egrep is obsolescent`; Ubuntu's 3.12-1 prints neither (`grep-stray-backslash`, `egrep` rows). A pattern with a stray backslash therefore makes a clean-stderr rule flap by distribution; escape only what the regex needs.

### F3. What empty output means when grep exits 2 {#f3}

`V/mask.sh` runs the idioms an agent or CI step actually writes, on a tree with one planted hit (`a.sh` containing `foo`). Results, u24/u26/alpgnu then alp (`V/results/mask-summary.txt`):

| Idiom (every `--include` grep is the current catalog form) | GNU: stdout, rc | busybox: stdout, rc, stderr | Agent reads |
|---|---|---|---|
| `grep -rn --include='*.sh' -e foo . \| grep -v -e zzz` | `./a.sh:1:foo`, 0 | empty, **1**, `grep: unrecognized option: include=*.sh` + 30 usage lines | "no findings" |
| `... \| wc -l` | `1` | **`0`**, rc 0 | "0 findings" |
| `... 2>/dev/null \|\| echo clean` | the hit | **`clean`** | "clean" |
| `out=$(... 2>/dev/null); [ -z "$out" ] && echo PASS` | rc 1 (no PASS) | **`PASS`** | "pass" |
| `grep -rl --include='*.sh' -e foo . \| xargs -r grep -n -e foo` | `1:foo` | empty, **rc 0**, stderr as above | "no findings" |
| `grep -rn -e zzz .` (a real no match) | empty, 1 | empty, 1 | "no findings" (correct) |
| `grep -rn -e '[' .` (bad regex) | empty, **2**, `Invalid regular expression` | empty, **2**, `bad regex '[': Missing ']'` | needs stderr |

The rule that follows is not "check the exit code" (xargs destroys it, F4) but: **a cell is a pass only when stdout is empty AND stderr is empty**, and any of `unrecognized option`, `fatal:`, `not found`, `No such file`, `Invalid regular expression`, `bad regex`, `binary file matches` on stderr is a harness failure. The rewritten shapes print nothing on stderr on a healthy tree on all five hosts (`new` rows: 0 stderr lines in 180 of 180 runs).

POSIX/GNU contract for reference: exit 0 a line selected, 1 none, 2 an error; with `-q` and a selected line the status is 0 even if an error occurred ([GNU grep manual, Exit Status](https://raw.githubusercontent.com/gnu-mirror-unofficial/grep/master/doc/grep.texi); [POSIX grep, EXIT STATUS](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/grep.html)). xargs: 0 success, 123 any invocation exited 1-125, 124 exited 255, 125 killed, 126 cannot run, 127 not found ([GNU findutils manual](https://raw.githubusercontent.com/gnu-mirror-unofficial/findutils/master/doc/find.texi) lines 3839-3855; POSIX allows 1-125 for the same cases). Measured (`xargs-rc-child1`, `xargs-rc-child2`, `m17`, `m18`, five hosts incl. busybox): child grep rc 1 gives xargs 123, child grep rc 2 gives xargs 123, an empty list with `-r` gives 0, a matching batch gives 0.

### F4. Current versus rewritten cells, 21 cells on five hosts {#f4}

Cell set (`V/drive.sh` for the 18 line cells, `V/ci-cells.sh` for 3 structural). IDs are the working labels used in `V/results/`:

| Cell | Rule and source line | Current form (verbatim in `drive.sh`) uses |
|---|---|---|
| G1 | SH-GATE-01, `shell-gate.md:208` | `grep -rnE --include` x5 |
| G2 | SH-GATE-16, `shell-gate.md:376` | `grep -rlZ --include ... \| LC_ALL=C xargs -0 -r grep` |
| G3 | SH-GATE-15, `shell-gate.md:365-366` | `grep -rlI --include ... -e $'\r'` |
| D1 | SH-DIAL-09 d09, `shell-dialect.md:301` | `shfiles()` with `grep -lzZE`, then `grep -nE` |
| D2 | SH-USER-08 u08, `shell-dialect.md:471` | `files() \| xargs -0 -r grep -nE ... \| grep -v -E` |
| E1 | SH-ERR-10 G-EVAL, `shell-errexit.md:250` | `grep -rnE --include x2 --exclude-dir` |
| E2 | SH-ERR-09 G-SIGPIPE, `shell-errexit.md:248` | `grep -rlE --include x4 ... \| xargs -r grep -HnE` |
| X1 | SH-EXP-03, `shell-expansion.md:64` | `grep -rn ... --include='*.sh' scripts` |
| X2 | SH-EXP-14, `shell-expansion.md:134` | `grep -rnw xargs --include ... \| grep -v -E` |
| C1 | SH-CI-01, `shell-ci.md:49` | `grep -rLZ -Pz ... \| xargs -r -0 grep -Pzo` |
| C2 | SH-CI-09, `shell-ci.md:132` | `grep -rnE ... --include x2 .github/workflows` |
| C3 | SH-CI-16, `shell-ci.md:150` | `grep -rPn ... \x7c ... --include x2` |
| M1 | SH-EMIT-13, `shell-emit.md:175` | `grep -rnF ... --include x5` |
| M2 | SH-EMIT-09, `shell-emit.md:147` | `grep -rnF -e '@Q' --include x3` |
| P1 | PS-ENC-01, `shell-pwsh.md:114` | `grep -rl -P -e '[^\x00-\x7F]' --include x3` |
| P2 | PS-COMPAT-01, `shell-pwsh.md:58` | `grep -rL -x -e ... --include='*.ps1' .` |
| P3 | PS-NATIVE-01, `shell-pwsh.md:193` | `grep -rnP --include ... '(?<![\w./-])curl(?![.\w-])'` |
| P4 | PS-GATE-07, `shell-pwsh.md:255` | `grep -rnP -e '^[^#]*Set-ExecutionPolicy(?!.*-Scope[ :]+.?Process)'` |
| C7 | SH-CI-07, `shell-ci.md:91` | `grep -rPn` with lookaheads |
| C22 | SH-CI-22, `shell-ci.md:192` | `grep -rPzo` repeated group |
| C11 | SH-CI-11, `shell-ci.md:118` | `grep -rPzo` step-scoped lookaheads |

Classification per cell and host: **RG** = plant prints on stdout and twin prints nothing on stdout or stderr; **MASK** = the plant is missed and the cause is only on stderr (an error masked as clean); **MISS** = plant missed, no error; **FP** = twin prints; **NOISE** = twin clean on stdout but stderr has text. Totals (`V/hosttot.py`):

| Form | u24 | u26 (uutils) | alp (busybox) | alpgnu | gitbash |
|---|---|---|---|---|---|
| current (18 line cells) | 16 RG, 1 FP, 1 MISS | 16 RG, 1 FP, 1 MISS | **17 MASK**, 1 RG | 17 RG, 1 FP | 10 RG, **7 MASK**, 1 FP |
| rewritten (18 line cells) | 18 RG | 18 RG | 18 RG | 18 RG | 18 RG |
| current structural PCRE (3 cells) | 3 RG | 3 RG | **3 MASK** | 3 RG | **3 MASK** |
| rewritten structural, awk (3 cells) | 3 RG | 3 RG | 3 RG | 3 RG | 3 RG |

The rewritten cells also run 18 of 18 red/green under three shells on the WSL host: bash 5.3, `bash --posix`, `zsh -f` (`V/results/host-*.cells.txt`; the current form is 17 RG plus the G2 FP in each).

Defects of the current forms beyond busybox:

- **G2 false positive on a compliant twin, every GNU host.** The first stage lists any file with a line starting `#!/bin/sh` anywhere, so a `#!/bin/bash` script whose heredoc contains `#!/bin/sh` and a non-ASCII comment is reported (`./scripts/gen.sh:2:# café`). The SH-DIAL consolidation fixed this with `grep -z` (anchor at file start) but `-z` is unavailable on busybox; the awk form tests `FNR == 1` and is RG on all five hosts.
- **G3 misses CRLF on dash.** `$'\r'` is not POSIX: on u24 and u26 `sh` is dash, the cell greps for the literal text `$\r` and finds nothing (MISS, rc 1). busybox ash 1.37 supports `$'..'` (alpgnu RG), which hid the problem on Alpine. On **Git Bash** `grep -l -e $'\r'` returns nothing for a CRLF file while `grep -lU` and `awk -v BINMODE=3` find it (`V/crprobe.sh`: grep-l-cr empty, grep-lU-cr `crlf.sh`, awk-cr empty, awk-binmode-cr `crlf.sh`; MSYS text mode strips the CR). The rewritten G3 (awk `BINMODE=3`, `LC_ALL=C`) and the `git ls-files --eol | grep -e ' w/crlf' -e ' w/mixed'` variant are RG on all five.
- **D1 and D2 current forms depend on `shfmt` and fail open without it** (gitbash MASK: `xargs: shfmt: No such file or directory`, stdout empty). F7.
- **Exit status is not a verdict.** Rewritten plants end 0 or 123 and twins 123, 0 or 1 depending on the cell and host (table above): e.g. P2 (`grep -L`) is plant 123, twin 0 on GNU and gitbash but plant 0, twin 123 on busybox, because busybox `grep -L` exits 0 when it lists a file and GNU 3.5+ exits 0 when a line is selected ([GNU grep NEWS 3.5](https://raw.githubusercontent.com/gnu-mirror-unofficial/grep/master/NEWS): "grep -L again succeeds when a line is selected, not when a file is listed"). Only the output carries the verdict.

### F5. The git-fed shape: pathspec depth, basename globs, exclusions, ignored and deleted files {#f5}

Pathspec semantics ([gitglossary, pathspec](https://git-scm.com/docs/gitglossary)): without magic, "`*` and `?` can match directory separators"; with `:(glob)` "wildcards in the pattern will not match a `/`", and a leading `**/` matches in all directories. `git ls-files` flags: `-z` NUL termination without quoting, `--exclude-standard` honours `.gitignore`, `--deduplicate` ([git-ls-files](https://git-scm.com/docs/git-ls-files)).

Measured (`V/probes.sh` section 6 and `V/probes2.sh`, identical on u24, u26, alp, gitbash; tree: `top.yml`, `sub/deep/c.yml`, `.github/workflows/ci.yml`, Makefiles at three depths):

| Pathspec | Matches |
|---|---|
| `'*.yml'` | `.github/workflows/ci.yml sub/deep/c.yml top.yml` (any depth) |
| `':(glob)*.yml'` | `top.yml` only |
| `':(glob)**/*.yml'` | all three |
| `'sub/*.yml'` | `sub/deep/c.yml` (nested below `sub`) |
| `':(glob)sub/*.yml'` | nothing |
| `'.github/workflows/*.yml'` | `ci.yml` and anything nested below `workflows/` |
| `*.yml` unquoted in sh | the shell expands it first: `top.yml` only |
| `'Makefile'` | root `Makefile` only |
| `'*/Makefile'` | non-root only |
| `'*Makefile'` | `Makefile NotMakefile sub/Makefile sub/deep/Makefile` (false positive) |
| `':(glob)**/Makefile'` | `Makefile sub/Makefile sub/deep/Makefile` (the faithful translation of `--include=Makefile`) |
| `':(glob)**/Taskfile*.yml'` | `Taskfile.yml sub/Taskfile.dev.yml sub/Taskfile.yml`; bare `'Taskfile*.yml'` finds the root file only |
| `'*.sh' ':(exclude)vendor'`, `':!vendor'`, `':^vendor'`, `':(exclude,glob)**/vendor/**'` | all equivalent; `:(exclude)` may come first |
| run from `sub/` | paths are relative to `sub/` (`b.sh deep/c.sh`); `--full-name` or `':/'` for top-relative |

Translation table for the mechanical rewrite (`--include` is a basename glob, a pathspec is a path match):

| grep -r form | git-fed pathspec |
|---|---|
| `--include='*.EXT'` | `'*.EXT'` |
| `--include='NAME'` (exact basename) | `':(glob)**/NAME'` |
| `--include='Prefix*.ext'` | `':(glob)**/Prefix*.ext'` |
| `--exclude-dir=D` | `':(exclude)D'` (root) or `':(exclude,glob)**/D/**'` (any depth) |
| `--exclude-dir='.git'` | delete it; git never lists `.git` |
| operand `DIR` plus `--include='*.yml'` | `'DIR/*.yml'` |

What the git-fed list covers that `grep -r` does not, and the reverse (`probes.sh` section 5):

| Case | `git ls-files -z --cached --others --exclude-standard` | `grep -r .` |
|---|---|---|
| untracked, not ignored (`fresh.sh`) | listed | searched |
| gitignored (`ignored.sh`) | **not listed** | **searched** (`./ignored.sh:foo`) |
| tracked, deleted in the work tree (`gone.sh`) | **listed**: `grep: gone.sh: No such file or directory`, xargs 123 | not seen |
| path typo (`srcc`) | silent empty list, rc 0 (`git ls-files --error-unmatch` is rc 1) | rc 2 with message |
| file name with a newline | intact with `-z` | split in output |

The deleted-tracked-file noise is common (an agent removes a file before committing); `grep -s` (POSIX, supported on busybox) silences exactly that message and was used in the reference script (F8). The path-typo case is why the scope check (`[ -s list ]`) matters.

### F6. Option-looking file names and quoting: `-z`, `-0`, `--`, `-H` {#f6}

`V/probes3.sh` (u24, u26, alp, gitbash, same result): without `-z`, `git ls-files` C-quotes `café.sh` as `"caf\303\251.sh"` and `xargs` fails on `it's.sh` (`xargs: unmatched single quote`, rc 123 GNU/gitbash, rc 1 busybox). With `-z`/`-0` all five names survive. A tracked file named `-x.sh` makes `xargs -0 -r grep -H -n -e foo` die (`grep: invalid option -- '.'`, busybox `unrecognized option: .`, rc 123); appending `--` fixes it on every host and `grep -L ... --` too. `-H` is mandatory because a one-file batch prints no file name without it (`xargs-one-file-no-H`: `1:foo`; `xargs-two-files-no-H`: `a.txt:1:foo`), so output shape would depend on how many files remain after a deletion. This is the SH-USER-08 (`xargs -r`) and SH-EXP-14 (`-0`) family extended by two more flags; `-r` itself is POSIX.1-2024 and accepted by busybox and GNU, and FreeBSD accepts and ignores it ([FreeBSD xargs(1)](https://man.freebsd.org/cgi/man.cgi?query=xargs&sektion=1): "supports the -r option for command-line compatibility with GNU xargs, but the -r option does nothing"). ShellCheck's SC2038 ([wiki](https://github.com/koalaman/shellcheck/wiki/SC2038)) is the same `-0` argument for `find`.

### F7. The new failure class: the producer fails behind the pipe {#f7}

Replacing `grep -r` with a pipeline relocates the silent-failure surface. All rows rc 0, stdout empty, stderr the only evidence (`V/mask.sh`, `V/probes.sh` section 7, four Linux hosts; gitbash rows in `probes-summary.txt`):

| Fault | stderr | pipeline status |
|---|---|---|
| `git` not installed (stock ubuntu:24.04, alpine:3.22, busybox:1.37) | `sh: 1: git: not found` / `sh: git: not found` | 0 |
| not a repo (`cd /`) | `fatal: not a git repository` | 0 |
| **dubious ownership** (root container, repo owned by uid 1234; git >= 2.35.2, [CVE-2022-24765 notes](https://raw.githubusercontent.com/git/git/v2.35.2/Documentation/RelNotes/2.35.2.txt)) | `fatal: detected dubious ownership in repository` | 0 (`own-gl-pipe`; `find ... \| xargs` still works, `git -c safe.directory='*'` works) |
| `shfmt` missing in `files()` | `xargs: shfmt: No such file or directory` | 0 |
| `rg` missing | `sh: rg: not found` | 0 behind `\| head`; `out=$(rg ...); [ -z "$out" ] && echo PASS` prints **PASS** |

`safe.directory` is a protected-config key ([git-config](https://git-scm.com/docs/git-config)); blanket `'*'` disables a security check, so the rule asks for the failure to be visible, not for the exception.

Two mitigations, both measured:

1. **Inline PREFLIGHT line** (prints when the harness cannot be trusted, so "output is the violation" fails closed). `V/preflight.sh`: healthy tree prints nothing (5 of 5 hosts); not a repo, git missing, xargs missing and dubious ownership each print a `PREFLIGHT:` line (red on u24, u26, alp, alpgnu; gitbash red for not-a-repo; the PATH-stripping faults are not representable on Git Bash, where symlinked `sh.exe` loses its DLLs and gives rc 127).
2. **Script-grade exit map** for `checks/` scripts (F8).

### F8. Script-grade checks: list to a file, then xargs {#f8}

`V/vd-check.sh` (SH-GATE-01 as a script; POSIX sh; `shfmt -d -i 4 -ci` rc 0 and `shellcheck -o check-set-e-suppressed,check-extra-masked-returns,deprecate-which` rc 0 under run.sh, shellcheck 0.11.0 and shfmt 3.13.1). Shape: tool precheck (69), work-tree precheck (78), `git ls-files -z ... >"$list" || exit 74` (a redirect, not a pipe, so git's own status counts), `[ -s "$list" ] || exit 79` (fail closed on an empty scope; the same idea as `rules/swift-quality/checks/canary.sh`), `xargs -0 -r grep -s -H -n -e ... -- <"$list" >"$out" 2>"$err"`, then any stderr text or xargs status above 123 is 74, any stdout is 1, else 0. Driver `V/checkdrv.sh` (single-file copy `checkdrv-one.sh` for Git Bash), identical on u24, u26, alp, alpgnu, and on gitbash for the first six rows (the two PATH-stripping faults give rc 127 from a broken symlinked `sh.exe`, and the dubious-ownership fault needs root):

| Case | exit | stdout lines | stderr |
|---|---|---|---|
| plant (Taskfile, `sub/Makefile`, file named `-x.sh`) | **1** | 3 | empty |
| twin | **0** | 0 | empty |
| twin with a tracked-but-deleted file and a violation inside a gitignored file | 0 | 0 | empty |
| bad regex injected | 74 | 0 | `grep: Invalid regular expression` (busybox `bad regex '[': Missing ']'`) |
| empty scope | 79 | 0 | `no files in scope` |
| not a repo | 78 | 0 | `not a usable git work tree` |
| dubious ownership (root, uid 1234) | 78 | 0 | same |
| git missing from PATH | 69 | 0 | `'git' not on PATH` |
| grep missing from PATH | 69 | 0 | `'grep' not on PATH` |

The plant includes `sub/Makefile`, found only because the pathspec is `':(glob)**/Makefile'` (F5), and `-x.sh`, found only because of `--` (F6). The exit values 0, 1, 69, 78, 79 are the gate's (`shell-gate.md`, SH-GATE-08); 74 is `IoError` in the fleet table ([cli-contract.md](../../../rules/rust-quality/cli-contract.md)). This follows SH-ERR-24 (judge each tool by its status; a canary proves the scan ran). The same list-to-file idiom is already in the catalog: `rules/swift-quality/checks/k07.sh:69-72` (`files=$(mktemp)`, `git ls-files -z ...`, `xargs -r -0 awk`).

### F9. PCRE, `-z` and multi-line cells: awk in checks/ scripts {#f9}

Catalog count (`V/seven.py`, lines carrying a grep/rg/xargs command in the seven consolidations): `--include/--exclude*` 117, `grep -P` 20 (SH-CI 8, PS-* 10, SH-DIAL 2), `grep -z/-Z` 10 (SH-GATE 1, SH-DIAL 2, SH-CI 5, PS-* 2), `rg` 1, `git ls-files` 10.

Evidence for awk over a python3 fallback: python3 is absent on stock alpine, busybox and ubuntu images and awk is present on all (`mask.sh` m22: alp has `git awk find xargs`, no python3). Awk dialect risk was tested on mawk 1.3.4 (u24, u26), BusyBox awk (alp), gawk 5.0.0 (gitbash): the programs avoid `{n,}` intervals, `\b`, `nextfile`-dependence and gawk-only functions; `BINMODE=3` is a gawk variable that other awks ignore as a plain variable.

Rewritten (`V/ci-cells.sh`, `V/drive.sh`):

| Cell | PCRE original | awk rewrite | lines | red/green on 5 hosts |
|---|---|---|---|---|
| SH-CI-01 run step without `shell:` (C1) | `-Pz` lookahead chain | step-scoped state machine | 8 | RG (one known gap: it does not honour `defaults.run.shell`) |
| SH-CI-07 `${{ }}` injection in a run body (C7) | `^(?!...).*\$\{\{...\b...` | `inrun` indent tracker | 9 | RG |
| SH-CI-11 powershell step writing `>> $env:GITHUB_*` (C11) | `-Pzo` step lookaheads | step flush | 9 | RG |
| SH-CI-22 run block of 10 or more lines (C22) | `-Pzo` `\1` group | count continuation lines | 12 | RG |
| P3 bare `curl` | `(?<![\w./-])curl(?![.\w-])` | ERE `(^\|[^[:alnum:]_./-])curl([^[:alnum:]_.-]\|$)` | 1 | RG |
| P4 `Set-ExecutionPolicy` without `-Scope Process` | negative lookahead | `awk '/^[^#]*Set-ExecutionPolicy/ && !/-Scope[ :]+.?Process/'` | 1 | RG |
| P1 non-ASCII in `.ps1` | `-P '[^\x00-\x7F]'` | `LC_ALL=C grep -l -e '[^ -~[:space:]]'` | 1 | RG |
| G2 / D1 shebang-anchored | `-z` | `FNR == 1` test in awk | 1 | RG |

Decision rule that falls out: a cell stays inline when it is a single-line ERE (optionally one `| grep -v -e` stage on stdin) of up to about 400 characters; it moves to `checks/NAME.sh` (POSIX sh, awk inside, the F8 skeleton) when it needs multi-line or step/indent scope, lookaround, a per-file first-line anchor beyond one awk one-liner, or more than two pipeline stages. By that rule the structural SH-CI cells (01, 02, 06, 07, 08, 11, 22; 01, 07, 11 and 22 were prototyped, 02, 06 and 08 are the same class on `action.yml` or on the `env.` variant) move; so do any SH-DIAL checks that need `-lzZE` once `files()` is replaced; P1, P3, P4, G1 to G3, X1/X2, E1/E2, M1/M2, C2/C3, D2 stay inline.

### F10. `git grep` as the one-process alternative {#f10}

`git grep --untracked -n -e PAT -- PATHSPEC` (documented in [git-grep](https://git-scm.com/docs/git-grep): `--untracked`, boolean `--and/--or/--not`, `-P`, `-l -z`) is one process: exit 0 match, 1 none, **128** on fatal (bad regex, not a repo), no xargs 123 conflation (`m19-m21`). The 10 `gg` variants in `drive.sh` run on u24, u26, alp and alpgnu (9 RG, G2 an FP because there is no per-file anchor); `git grep -P` works even on Alpine (git's own PCRE2), `--and --not` replaces `| grep -v`. Why it is not the binding shape: (a) on Git Bash git.exe is a native Windows binary and MSYS rewrites POSIX-looking arguments, so `git grep -e '^#!/bin/sh'` and `-e '/etc/passwd'` return nothing (rc 1, no error; D1 gg and G2 gg MISS on gitbash; `MSYS_NO_PATHCONV=1` or `[/]` fixes it; [MSYS2 filesystem paths](https://www.msys2.org/docs/filesystem-paths/)); the xargs form runs MSYS grep, which is not converted (`gl-xargs-slash-pattern` RG); (b) no per-file first-line anchor (G2 gg is an FP on all GNU hosts); (c) default `git grep` ignores untracked files (`gg-fresh-default` rc 1) and needs `--untracked`; (d) it prints C-quoted names (`"caf\303\251.sh"`). It stays a CONSIDER for single-line, no-slash-pattern cells inside scripts where an honest exit status matters.

### F11. Markdown table cells and the pipe character {#f11}

[GFM tables](https://github.github.com/gfm/): "Include a pipe in a cell's content by escaping it, including inside other inline spans" (example 200: `` b `\|` az `` renders `<code>|</code>`). Measured with markdown-it 3.0.0 commonmark+table (`V/md/r.py`): row `| A-1 | `grep -E -e 'foo|bar' f` |` yields cell 2 = `` `grep -E -e 'foo `` (cut at the pipe); `A-5` with `[|]` breaks the same way; `A-2` with `\|` renders `foo|bar` and `A-4` `a[\|]b` renders `a[|]b`. An agent reads the raw file, where `\|` is a backslash-pipe: inside ERE it is a literal pipe (alternation silently becomes "match the text foo|bar", rc 1 on all five hosts, `grep-alt-ere-backslash-pipe`), and in a shell pipeline it is a syntax error. The binding shape is itself a pipeline, so **no verification command lives in a table cell**. Measured in the shipped catalog at 88d5e14 (`V/tablepipes.py`): 1532 table rows mention grep/rg/xargs, 69 of them carry `\|`.

### F12. Busybox and uutils as verification hosts {#f12}

**busybox 1.37.0:** all 18 + 3 rewritten cells, 11 catalog self-checks (`V/meta-cells.sh`) and the reference script pass red/green on alp (`git` installed). Verdict: **supported executor** of the shapes, in the sense "a verification written to this dialect gives the same verdict as on GNU"; **not** a supported authoring or provisioning environment, because stock alpine:3.22 and busybox:1.37 lack git and (alpine) bash, and the gate itself (`shell-gate.sh`) is `#!/usr/bin/env bash` and needs shellcheck and shfmt. On a bare busybox host the first symptom is rc 0 with `git: not found` on stderr, which is what the PREFLIGHT line converts into output. busybox-specific cautions: directory operand without `-r` is silent rc 1; `-I` is ignored; `grep -L` rc inverted; `xargs -d`, `-L`, `--null` absent.

**uutils coreutils 0.10.0 (ubuntu:26.04):** identical to GNU on every row of `probes.sh` that touches `tr` (NUL to newline, `-d '\r'`), `cut -c1-6`, `sort -z`, `head -n 1`, `wc -l <file`, `od -c`, `mktemp` (used by `vd-check.sh`), and on all 18 + 3 cells. Because grep, xargs, find, sed, awk and diff are not uutils on 26.04, the shape never meets uutils in the part that carries the verdict. Not covered: uutils `findutils`/`diffutils` (not installed; GNU 4.10.0 and 3.12 are), which would change `xargs` and `find` if adopted; recheck when Ubuntu moves them.

### F13. Catalog scale and the M-X-05 answer {#f13}

Re-measured at 88d5e14 (`V/catalog-count.py`, lines in `rules/`, `skills/`, `bundles/` `.md` mentioning grep/rg/xargs: 3189): `--include/--exclude*` **1162**, `grep -r` 1339, `rg -` **542**, `grep -z/-Z` 73, `grep -P` 31, `xargs` 215, `git ls-files` 28, `git grep` 28. The map's "232 blocks and 497 rows" counts a different unit; the order of magnitude holds. The heaviest are `rules/swift-quality` (226 `--include` lines), `cmake-build` (165), `bazel-quality` (116), `go-quality` (89), `java-quality` (92); `rg` is concentrated in `rust-quality` (269), `typescript-quality` (149), `python-quality` (80). `rg` is on none of the four stock images (m22) and strips a UTF-8 BOM before matching (SH-GATE-15 note), so it is a developer-machine tool, not a verification-host tool.

**M-X-05, for the owner:** (1) the shell set adopts the S1 shape and the portable option set now (SH-GATE-21 to 25 below); (2) `rg` rows and `--include` rows in the other sets are not touched by this program: either label each `(GNU grep)` / `(rg)` and add the PREFLIGHT line (cheap, honest), or approve a mechanical rewrite using the F5 translation table (measured equivalent for suffix globs; basenames and exclusions need the `:(glob)**/` forms); (3) busybox is a supported executor with git installed. The owner decision needed is only (2).

### F14. Defects found in the consolidations (reported, not fixed) {#f14}

| # | Where | Defect | Reproducer |
|---|---|---|---|
| 1 | `shell-gate.md:140` (gate script step 3) and SH-GATE-15 `:365` | `LC_ALL=C grep -l -e $'\r'` misses CRLF on Git Bash 2.40 (MSYS text mode); the `$'\r'` cells also need bash, not sh. ShellCheck SC1017 on the same file still goes red in the gate, so the gate is saved by its second tool, not by this check. | `V/crprobe.sh` via `matrix.sh win` |
| 2 | SH-GATE-16 cell (`shell-gate.md:376`) | False positive on a bash script whose heredoc contains `#!/bin/sh`; busybox: `-Z` unrecognized. | cell G2, `V/drive.sh` |
| 3 | SH-DIAL `shfiles()` (`shell-dialect.md:66`) and u06-u10 | uses `grep -lzZE`, absent on busybox; and depends on `shfmt` with no precheck. | cell D1, `mask.sh` m15 |
| 4 | `shell-gate.md:54` ("a clean run exits 123 or 1") | Understates: 0, 123 or 1, and inverted for `-L` on busybox. | table in F4 |
| 5 | SH-GATE-02, 03, 05, 06, 07, 13, 14, 15, 16, 20 and the SH-ERR, SH-EXP, SH-CI, PS, SH-EMIT cells | 117 `--include/--exclude*` lines; all die or mask on busybox. | `V/seven.py` |
| 6 | shell-pwsh.md:114,120 | `grep -rl -P`, `LC_ALL=C grep -P` rc 2 on Git Bash (needs UTF-8 locale), unrecognized on busybox. | `V/pgb.sh`, cell P1 |

### F15. BSD and macOS (unverified: read only) {#f15}

No macOS host. FreeBSD 15.1 documents `--include`, `--exclude-dir`, `-r/-R`, `-L`, `-z/--null-data`, `--null`, and no `-P` ([FreeBSD grep(1)](https://man.freebsd.org/cgi/man.cgi?query=grep&sektion=1)); xargs has `-0` and a no-op `-r` ([FreeBSD xargs(1)](https://man.freebsd.org/cgi/man.cgi?query=xargs&sektion=1)). macOS ships a BSD grep and xargs that are not FreeBSD 15.1 and were not run: the portable option set above (`-E -F -e -H -n -l -L -c -o -q -s -v -w -x -i --`) is the intersection of POSIX, GNU, busybox and FreeBSD, so the shape is expected to work there, **unverified: read only**. `git` pathspecs are git behaviour, not userland, and are expected identical (unverified on macOS).

## Normative guidance candidates

Working IDs `VD-nn`; proposed final IDs are SH-GATE-21 upward in this order (SH-GATE-27 and SH-GATE-32 are cited by SH-CI text from the pre-renumbering dive and must not be reused). Severity words follow `shell-gate.md` (MUST needs measured or normative evidence and a verification watched red then green). All "RAN" entries name a fixture under `V/`. Every command below was written to the checker shape: one `-e` per alternative, quoted globs, no command substitution, no placeholders in patterns, `xargs -r`, and the output is the violation (empty output means pass). Every `sh` block below was extracted and run verbatim (`V/docverify.sh`, commands in `V/doc-cmds/`, results `V/results/{u24,u26,alp,alpgnu}.doc.txt`): on a plant tree each prints 1 or 2 lines and exits 0, on the twin each prints nothing and exits 1 (the closing `grep -v`), identical on all four hosts; VD-05 prints nothing on a healthy tree by design and its red cases are in `preflight.sh`; VD-11 exits 0 on both trees (awk) and prints two lines on the plant. The one pipe character inside a pattern is the bracketed literal `[|]` in VD-08, where the pipe is what is sought.

**VD-01 (SH-GATE-21) · MUST.** Every inline verification of non-shell files has exactly this shape: `git ls-files -z --cached --others --exclude-standard -- PATHSPEC... | xargs -0 -r grep -H -n -e PAT -e PAT2 --`. Never `grep -r`, `find | xargs grep` without `-print0`, or `rg`.
- *Why.* `grep -r --include` is a hard error on busybox and hides behind the next pipe stage (F3, 17 of 17 busybox failures masked); the list from git is what the gate already uses (SH-GATE-09) and skips ignored trees.
- *Verify.*
  ```sh
  git ls-files -z --cached --others --exclude-standard -- 'rules/*.md' 'skills/*.md' | xargs -0 -r grep -H -n -e '--include' -e '--exclude' -e 'grep -[a-zA-Z]*[rR]' -- | grep -v -e 'vd-ok: *[^ ]'
  ```
- *RAN:* yes. `V/meta-cells.sh` cells M1, M2: plant rc 0 with 1 and 2 lines, twin rc 1 with no output, identical on u24, u26, alp, alpgnu, gitbash. Rewritten 18 line cells: `V/results/final.txt` form `new`.
- *Scope.* Shell set verification cells; sibling sets per Finding 13.

**VD-02 (SH-GATE-22) · MUST.** Shell files come from SH-GATE-09 `files()` unchanged (text of SH-GATE-09 is not edited); a cell that uses `files()` is preceded by the PREFLIGHT line of VD-05 plus `shfmt`.
- *Why.* An extension pathspec is blind to extensionless scripts (SH-DIAL conflict 5, pyenv `libexec/pyenv-rehash:141`); `files()` without `shfmt` yields an empty list and a green (`mask.sh` m15, gitbash D1/D2 MASK).
- *Verify.* The PREFLIGHT line below with `shfmt` added to the tool list.
- *RAN:* yes for the missing-tool class (`V/preflight.sh`, `mask.sh` m15); the shfmt variant is the same loop with one more name, not run separately.

**VD-03 (SH-GATE-23) · MUST.** Inside a verification, grep uses only `-E -F -e -H -n -l -L -c -o -q -s -v -w -x -i --`. Banned: `-r -R --include --exclude --exclude-dir -P -z -Z -U --null --no-messages --color -I`.
- *Why.* Each banned item is unrecognized on busybox 1.37 or (for `-I`) accepted and ignored there; `-P` also needs a UTF-8 locale on Git Bash 3.0 (F2). The allowed set was run on all five hosts (`probes.sh` `grep-opt *`).
- *Verify.*
  ```sh
  git ls-files -z --cached --others --exclude-standard -- 'rules/*.md' 'skills/*.md' | xargs -0 -r grep -H -n -e 'grep -[a-zA-Z]*[PzZUI]' -e '--null' -e '--no-messages' -- | grep -v -e 'vd-ok: *[^ ]'
  ```
- *RAN:* yes, M3 (`grep -rnP` plant, 1 line; twin empty; five hosts).

**VD-04 (SH-GATE-24) · MUST.** Pathspecs are quoted; a path match uses `'*.EXT'` (any depth) or `'DIR/*.EXT'`; an exact basename or a `Prefix*.ext` basename uses `':(glob)**/NAME'`; exclusions use `':(exclude)DIR'` or `':(exclude,glob)**/DIR/**'`. Never an unquoted `*`, a bare `'Makefile'` (root only), or `'*Makefile'` (also matches `NotMakefile`).
- *Why.* Measured depth table (F5): bare name is root-only, `*Makefile` matches `NotMakefile`, an unquoted glob is expanded by the shell before git sees it.
- *Verify.*
  ```sh
  git ls-files -z --cached --others --exclude-standard -- 'rules/*.md' 'skills/*.md' | xargs -0 -r grep -H -n -e 'git ls-files .*[[:space:]][*]' -- | grep -v -e 'vd-ok: *[^ ]'
  ```
  The bare-basename half is a reading heuristic: every `git ls-files` pathspec that is a plain file name without `*` or a leading `:(glob)**/` is root-only; confirm with the probes2 table.
- *RAN:* the unquoted-glob grep: yes, M8, plant 1 line, twin empty, five hosts. The bare-basename heuristic: the pathspec table itself ran (`V/probes2.sh`, four hosts); the heuristic as a grep: no.

**VD-05 (SH-GATE-25) · MUST.** The first line of a block of inline cells is the PREFLIGHT line, so a missing tool or unusable work tree produces output instead of silence.
- *Why.* F7: git missing, not a repo, dubious ownership, xargs missing all exit 0 with empty stdout.
- *Verify.*
  ```sh
  for t in git xargs grep; do command -v "$t" >/dev/null 2>&1 || echo "PREFLIGHT: $t missing"; done; git rev-parse --is-inside-work-tree >/dev/null 2>&1 || echo "PREFLIGHT: no usable git work tree"
  ```
  Healthy tree: no output. Any `PREFLIGHT:` line: stop, fix the host, rerun.
- *RAN:* yes, `V/preflight.sh`: green healthy on u24, u26, alp, alpgnu, gitbash; red not-a-repo on all five; red git-missing and xargs-missing on four; red dubious-ownership on four (root containers); results in `V/results/*.pre.txt`.

**VD-06 (SH-GATE-26) · MUST.** A cell passes only when stdout is empty and stderr is empty. Do not judge by exit status through `xargs` (0, 123 and 1 all mean "no finding" somewhere; busybox inverts `grep -L`); never write `2>/dev/null` on a verification; stderr lines such as `unrecognized option`, `fatal:`, `not found`, `No such file`, `Invalid regular expression`, `bad regex`, `binary file matches` are a harness failure.
- *Why.* F3 and F4.
- *Verify.* The silence rule is a reading rule (run the cell with stderr visible). The `2>/dev/null` half is mechanical:
  ```sh
  git ls-files -z --cached --others --exclude-standard -- 'rules/*.md' 'skills/*.md' | xargs -0 -r grep -H -n -e 'grep .*2>/dev/null' -- | grep -v -e 'vd-ok: *[^ ]'
  ```
- *RAN:* the masking behaviour: yes (`mask.sh` m1-m5, m16-m18). The grep: yes, M10, plant 1 line, twin empty, five hosts. The stderr-silence rule itself: a reading rule, but its premise (180 of 180 rewritten runs had zero stderr lines) was measured.

**VD-07 (SH-GATE-28) · MUST.** One `-e` per alternative, never a pipe character inside a pattern; xargs-fed greps carry `-H`, `-n`, a trailing `--`, and `xargs -0 -r`.
- *Why.* F6 (one-file batch, leading-dash names, quoting) and F11 (pipe splits a table cell; `\|` is literal in ERE on every host).
- *Verify.* Three greps, each printing the violation:
  ```sh
  git ls-files -z --cached --others --exclude-standard -- 'rules/*.md' 'skills/*.md' | xargs -0 -r grep -H -n -e 'xargs' -- | grep -v -e 'xargs -0 -r' -e 'xargs -r' -e 'vd-ok: *[^ ]'
  git ls-files -z --cached --others --exclude-standard -- 'rules/*.md' 'skills/*.md' | xargs -0 -r grep -H -n -e 'xargs -0 -r grep' -- | grep -v -e 'xargs -0 -r grep -[a-zA-Z]*H' -e 'vd-ok: *[^ ]'
  git ls-files -z --cached --others --exclude-standard -- 'rules/*.md' 'skills/*.md' | xargs -0 -r grep -H -n -e 'xargs -0 -r grep' -- | grep -v -e 'xargs -0 -r grep .* -- ' -e 'xargs -0 -r grep .* --$' -e 'vd-ok: *[^ ]'
  ```
- *RAN:* yes, M5 (plant `xargs -0 grep` 1 line), M6a (missing `-H`, 2 lines), M6b (missing `--`, 2 lines), twins empty, five hosts. Behaviour: `probes3.sh` (`-x.sh` red without `--`, green with). The "no pipe character inside a pattern" half is a reading heuristic; the one legitimate use of a pipe in a pattern is a bracketed literal `[|]` when the pipe itself is sought (VD-08), which a pipe-in-pattern checker must allow.

**VD-08 (SH-GATE-29) · MUST.** No verification command sits in a markdown table cell; the cell holds the check ID, the command lives in a fenced block or a bullet.
- *Why.* F11: an unescaped pipe cuts the cell; an escaped one is an invalid command when read raw.
- *Verify.*
  ```sh
  git ls-files -z --cached --others --exclude-standard -- 'rules/*.md' 'skills/*.md' | xargs -0 -r grep -H -n -e '^[[:space:]]*[|].*grep -' -e '^[[:space:]]*[|].*xargs ' -- | grep -v -e 'vd-ok: *[^ ]'
  ```
- *RAN:* yes, M7: plant (a table row holding `git ls-files -z \| xargs ...`) 1 line, twin (a row naming a check ID) empty, five hosts. This check uses the bracketed literal `[|]` because the pipe is what it looks for.

**VD-09 (SH-GATE-30) · MUST.** A check that needs lookaround, `-z`, multi-line or step/indent scope, a per-file first-line anchor beyond one awk one-liner, or more than two pipeline stages is a `checks/NAME.sh` script (POSIX sh, awk for the matching). A `grep -P`/`-z` form may be shown only as an extra labelled `(GNU grep)`; the awk check is the one that is run.
- *Why.* F9: python3 is absent from stock images, awk is on all; three structural SH-CI cells and the shebang-anchored cells are RG as awk on five hosts, and the PCRE originals die on busybox and Git Bash.
- *Verify.*
  ```sh
  git ls-files -z --cached --others --exclude-standard -- 'rules/*.md' 'skills/*.md' | xargs -0 -r grep -H -n -e 'grep -[a-zA-Z]*[Pz]' -- | grep -v -e '(GNU grep)' -e 'vd-ok: *[^ ]'
  ```
- *RAN:* yes for the rewrites (`V/ci-cells.sh`, drive.sh `new` forms: red plant, green twin, five hosts); the grep above is M3's pattern plus a label exemption, not run with the exemption.

**VD-10 (SH-GATE-31) · MUST for scripts.** A `checks/` script lists files with `git ls-files -z ... >"$list" || exit 74`, fails closed on an empty list (79), prechecks its tools (69) and the work tree (78), runs `xargs -0 -r grep -s -H -n -e ... --`, maps any stderr or xargs status above 123 to 74, prints the findings and exits 1, else 0. Reference: `V/vd-check.sh`.
- *Why.* The inline PREFLIGHT only prints; a script can also refuse (F8). Exit values follow `shell-gate.md` SH-GATE-08 and the fleet table.
- *Verify.* Run the script against a plant and a twin and the faults listed in F8; or read it for the five exits.
- *RAN:* yes, `V/checkdrv.sh` / `checkdrv-one.sh`: plant 1, twin 0, bad regex 74, empty scope 79, not a repo 78, git missing 69, grep missing 69, dubious ownership 78; u24, u26, alp, alpgnu all nine; gitbash the first six (the two PATH-stripping faults and the root-only ownership fault are not representable there).

**VD-11 (revises the verify cell of SH-GATE-15) · MUST.** CR and BOM detection does not use `grep -e $'\r'`: use `awk -v BINMODE=3` with `LC_ALL=C`, or `git ls-files --eol` filtered for `w/crlf` and `w/mixed`.
- *Why.* dash lacks `$'..'` (MISS on u24, u26); MSYS grep 3.0 in text mode never sees CR (F4).
- *Verify.*
  ```sh
  git ls-files -z --cached --others --exclude-standard -- '*.sh' '*.bash' '*.bats' '*.ksh' '*.zsh' | LC_ALL=C xargs -0 -r awk -v BINMODE=3 '/\r/ { print FILENAME ":" FNR ": CR"; nextfile } FNR == 1 && /^\357\273\277/ { print FILENAME ": BOM" }'
  ```
- *RAN:* yes, G3 `new`: plant 2 lines, twin 0 lines, rc 0, on all five hosts; `crprobe.sh` shows plain `awk '/\r/'` and `grep -l` MISS on gitbash and `BINMODE=3` finds it. `nextfile` is supported by mawk 1.3.4, gawk and BusyBox awk (all three ran it).

**VD-12 (revises the verify cells of SH-GATE-01, -02 to -07, -13 to -16, -20; SH-ERR G-*; SH-EXP; SH-CI; PS-*; SH-EMIT) · MUST.** Replace every `grep -r --include` cell by the VD-01 shape using the F5 translation table. Rule text, severity and rule IDs are unchanged.
- *Why.* F4: 17 of 18 current line cells are MASK on busybox, 7 of 18 on Git Bash.
- *Verify.* VD-01's grep over the rule files returns nothing.
- *RAN:* yes, as 18 pairs in `V/drive.sh`; the full rewrite of all 117 lines was not performed here.

**VD-13 (SH-GATE-33) · SHOULD.** A supported verification host is any host where the PREFLIGHT line prints nothing and grep, xargs, awk and find behave as the portable set: GNU grep 3.11/3.12, busybox 1.37 with git installed, uutils coreutils 0.10.0 on ubuntu:26.04, Git Bash with git. Bare busybox/alpine images are not verification hosts until git (and bash, shfmt, shellcheck for the gate) are installed.
- *Why.* F12.
- *Verify.* `docker run --rm -v ROOT:ROOT -w ROOT alpine:3.22 sh CHECK` prints nothing on the repo after `apk add git`; the same cell on the bare image prints a `PREFLIGHT:` line.
- *RAN:* yes for alp (git added) and for the bare-image failure (`stock-new-v1`: rc 0, stderr `git: not found`); PREFLIGHT on the bare image: the git-missing case of `preflight.sh`.

**VD-14 (SH-GATE-34) · CONSIDER.** `git grep --untracked` is allowed in scripts for a single-line pattern with no leading slash when an honest exit status (0/1/128) is wanted.
- *Why.* F10; Git Bash path conversion and no per-file anchor are the limits.
- *Verify.* Reading heuristic; behaviour in `V/results/*.cells.txt` rows `gg`.
- *RAN:* yes for the cells themselves (10 `gg` variants: 9 RG and the G2 FP on the four Linux hosts; 8 RG and 2 MISS from path conversion on gitbash); no for a rule-level grep.

## Verification runs

All commands run from the fixture root `V/` on 2026-10-11. Containers: `docker run --rm -v "${T}:${T}:ro" -w /tmp vd-ALIAS sh V/SCRIPT /tmp/w` with `T=/home/mherwig/.cache/research-lang/shell-tools` (image aliases: vd-u24 = ubuntu:24.04 plus git, python3; vd-u26 = ubuntu:26.04 plus git, python3; vd-alp = alpine:3.22 plus git; vd-alpgnu = alpine:3.22 plus git, grep, findutils; Dockerfiles in `V/images/`). Git Bash: `matrix.sh win SCRIPT WORKDIR`. A "red" row means the plant printed on stdout; a "green" row means the twin printed nothing on stdout and stderr.

| Verification | Fixture and command | Plant (rc / stdout lines) | Twin (rc / stdout lines) | Notes |
|---|---|---|---|---|
| 18 line cells, rewritten form (VD-01, VD-12) | `V/drive.sh cells`, results `V/results/{u24,u26,alp,alpgnu,gitbash}.cells.txt`, summary `final.txt` | 0 or 123 / 1-2 | 0, 1 or 123 / 0 | **RED 18/18 and GREEN 18/18 on all five hosts**; status varies by cell and host, output decides (e.g. G1 plant 0, twin 123; P2 plant 123, twin 0 GNU, inverted on alp) |
| 18 line cells, current form | same | 17 of 18 produce no stdout on alp; 7 of 18 on gitbash | | MASK counts: alp 17, gitbash 7; G2 FP on every GNU host; G3 MISS on dash hosts |
| Rewritten, bash 5.3 / `bash --posix` / `zsh -f` on WSL host | `CELLSH=... sh V/drive.sh cells` | | | 18 RG in each (current: 17 RG + G2 FP) |
| 3 structural cells, PCRE vs awk (VD-09) | `V/ci-cells.sh` | cur: 0 / 1-13 on GNU, 2 / 0 on alp and gitbash; new: 0 / 1 | cur: 1 / 0; new: 0 / 0 | new RG on 5 of 5 |
| Mask idioms (VD-06) | `V/mask.sh` | | | 22 rows, `results/mask-summary.txt`; e.g. `m3` busybox prints `clean`, `m4` prints `PASS`, `m2` prints `0` |
| Every quoted normative command, verbatim (VD-01, 03, 04, 05, 06, 07, 08, 09, 11) | `V/docverify.sh` (extracted to `V/doc-cmds/`) | 0 / 1-2 (VD-11: 0 / 2) | 1 / 0 (VD-05, VD-11: 0 / 0) | identical on u24, u26, alp, alpgnu; results `V/results/*.doc.txt` |
| Catalog self-checks M1-M10 incl. M6a/M6b (VD-01, 03, 04, 06-08) | `V/meta-cells.sh` | 0 / 1-2 each | 1 / 0 each (final stage is `grep -v`) | identical on 5 hosts (`diff` of columns 1-6 empty); the twin carries a banned string with a `vd-ok:` waiver and stays green |
| PREFLIGHT (VD-05) | `V/preflight.sh` | red: `PREFLIGHT:` lines, rc 0 | green: no output | 5 cases x 4 Linux hosts; gitbash 2 of 4 red cases measurable |
| Reference script (VD-10) | `V/checkdrv.sh`, `V/checkdrv-one.sh` | 1 / 3 | 0 / 0 | fault exits 74, 79, 78, 69, 69, 78 as listed in F8; `shfmt -d -i 4 -ci vd-check.sh` rc 0; `shellcheck -o check-set-e-suppressed,check-extra-masked-returns,deprecate-which vd-check.sh` rc 0 |
| CR/BOM (VD-11) | `V/crprobe.sh` via `matrix.sh win`; G3 in `drive.sh` | `grep -l -e $'\r'` on gitbash: empty (MISS); `grep -lU`, awk `BINMODE=3`: `crlf.sh` | | On u24 all four find it |
| `-P` locale on Git Bash | `V/pgb.sh` via `matrix.sh win` | unset: rc 2; `LC_ALL=C`: rc 2; `C.UTF-8`, `en_US.UTF-8`: rc 0 | | |
| Pathspec depth and basenames (VD-04) | `V/probes.sh` section 6, `V/probes2.sh` | | | tables in F5, identical on u24, u26, alp, gitbash |
| Leading-dash names, quoting (VD-07) | `V/probes3.sh` | without `--`: 123 (`invalid option -- '.'`) | with `--`: 0 and all five names | u24, u26, alp, gitbash |
| Dubious ownership | `V/ownership.sh` (root, uid 1234) | `git ls-files \| xargs`: rc 0, stdout empty, `fatal: detected dubious ownership` | `find \| xargs` finds the file; `git -c safe.directory='*'` too | u24, u26, alp |
| Markdown pipes | `V/md/v/bin/python V/md/r.py` | A-1 cell 2 = `` `grep -E -e 'foo ``; A-5 broken | A-2, A-4 render `\|` as `|` | markdown-it 3.0.0 |

Not run, and why: BSD and macOS userland (no host); `shfmt` as the missing tool inside the PREFLIGHT loop (identical loop body, one more name); Git Bash PATH-stripping faults (symlinked `sh.exe` loses its DLLs, rc 127 for a reason unrelated to the fault); GHA windows-2025 Git Bash 5.3.15 (the host's is 5.2.15; the CR text-mode behaviour may differ in newer MSYS builds, unverified).

## Exemplar evidence

| Candidate | Satisfies | Violates or contradicts |
|---|---|---|
| VD-01 git-fed list | `rules/swift-quality/checks/k07.sh:69-72` (`hatches()`: `files=$(mktemp)`, `git ls-files -z --cached --others --exclude-standard -- '*.swift' ':(exclude,glob)**/Tests/**' ...`, then `xargs -r -0 awk`); `rules/cmake-build.md:59` (`git ls-files -z -- '*CMakeLists.txt' '*.cmake' \| xargs -0 -r gersemi --check`); `rules/swift-package/gates.md:51`; the gate itself, `shell-gate.md:123` | `rules/swift-quality/checks/k07.sh:46-65` (`grep -rn "${P[@]}" ... .`; `:56` and `:65` carry `--include='*.swift'` and `--exclude-dir='.build'`, the pair SH-USER-01 cites); `rules/bazel-quality/caching.md:62` (`git ls-files \| grep -E ... \| xargs -r grep -n`: no `-z`/`-0`, breaks on spaces and quotes, F6) |
| VD-02 shell files from `files()` | `shell-dialect.md:66` `files()`/`shfiles()` | `shell-gate.md:376` (G2) and `shell-dialect.md:66` `-lzZE` (busybox) |
| VD-05 / VD-10 canary and exit map | `rules/swift-quality/checks/canary.sh` ("a grep, find or awk gate that scans the tree is trusted only after this exits 0"); `shell-gate.md` gate script exits 69/78/79 | `rules/swift-quality/checks/never-gate.sh:7-9` exits 65/66 (outside the table; reported by the gate consolidation C10) |
| VD-08 no commands in table cells | `rules/nix-quality.md:47-52` uses a fenced block; `rules/rust-quality` has 275 table rows with commands and none carries `\|` | `rules/bazel-quality` 241 table rows with commands, 52 with `\|`; shipped catalog total 69 of 1532 |
| VD-03 portable option set | POSIX options only: `shell-expansion.md:134` (`grep -rnw xargs ... \| grep -v -E`, once its `--include` is translated) | `shell-pwsh.md:114,120,193,199,218,245,255` (`-P`), `shell-ci.md:49,81,91,98,118,150,192` (`-P`, `-Pz`) |
| VD-13 busybox host | this dive's alp host: 21 cells, 11 self-checks, the reference script, all red/green with git installed | www-setup's installer crashes on busybox wget (`install.sh:352-354`, SH-USER-10); bare alpine/busybox images have no git (`stock-new-v1`) |
| Fleet CR | pyenv `libexec/pyenv-rehash:141` (`declare -A`, extensionless: an extension grep reports 0 hits) | n/a |

## AI-agent angle

| Characteristic mistake | Measured symptom here | Smallest mechanical check |
|---|---|---|
| `grep -rn --include='*.ext' -e PAT .` as the default search | busybox rc 2, 30 usage lines, or silent after the next pipe stage (F3) | VD-01 grep (M1, M2) |
| `grep -P` for lookaround or `\d`; `grep -z` for multi-line | unrecognized on busybox, locale error on Git Bash (F2) | VD-03 grep (M3) |
| Assumes `rg` exists | `rg: not found` hidden by `\| head`, or `PASS` from `[ -z "$out" ]` (F7) | VD-05 PREFLIGHT; VD-01's M4 pattern for `rg` |
| `xargs` with no `-r`, no `-0`, no `--` | runs once on empty input; splits `a b.sh`; `-x.sh` becomes an option (F6) | VD-07 (M5, M6) |
| Judges success by exit code through a pipe or xargs | 123 for both no-match and error; 0 after `grep -v` swallowed an error (F3) | VD-06 reading rule; read stderr |
| Adds `2>/dev/null` or `\|\| true` "to keep the output clean" | turns every harness failure into "clean" | VD-06 grep |
| Writes `git ls-files *.yml` unquoted or `'Makefile'` for "all Makefiles" | shell expands the glob; root-only match (F5) | VD-04 grep (M8) |
| Pipes in a markdown table cell, `\|` inside ERE | cell truncated; alternation becomes a literal (F11) | VD-08 grep (M7) |
| `grep -e $'\r'` in `#!/bin/sh` | dash: no such quoting, MISS; Git Bash: CR invisible (F4) | VD-11 awk cell; SC3003 for `$'..'` in sh |
| `docker run -v "$T:$T:ro"` copied into zsh | zsh expands `$T:r` on the second `$T` and appends a literal `o`, so the mount lands at `.../shell-toolso` and the script is "not found" with no docker error (hit and fixed during this run on zsh 5.9; `${T}:${T}:ro` works) | write `${T}` with braces; run docker lines from a `.sh` driver under `sh` or `bash` |
| Trusts `git ls-files ... \| xargs grep` on a bind-mounted checkout in a root container | empty and rc 0 with `dubious ownership` (F7) | VD-05 PREFLIGHT |
| Copies `-I` to "skip binaries" | busybox ignores it and greps the binary | VD-03 |

## Contested / evolving

- **Pipeline versus `git grep`.** The pipeline gives one portable grep with the same options everywhere and `-z` safety but loses exit semantics (123) and moves failure upstream; `git grep` keeps status and PCRE but is path-converted on Git Bash and has no per-file anchor. As of 2026-10-11 the program chooses the pipeline for inline cells and allows `git grep` in scripts (VD-14). Revisit if Git for Windows stops converting arguments.
- **`rg`.** Faster, honours `.gitignore`, no `--include` problem; absent on all four stock images, BOM handling differs. Trend in the fleet: `rg` rows grow in Rust/TypeScript/Python sets. Unresolved by this dive (Finding 13 option 2).
- **busybox support level.** 1.37.0 is the shipped stable (Alpine 3.22: 2025-11-21 build; busybox:1.37: 2024-09-26 build); the topic map records 1.38.0 as unstable (`shell-topic-map.md:53`). `grep -z` exists only under `EXTRA_COMPAT`; a future Alpine build could enable it, but the portable set does not rely on that.
- **uutils trajectory.** Ubuntu 25.10 and 26.04 ship uutils coreutils (0.10.0 here); `findutils` and `diffutils` remain GNU in 26.04.1 (findutils 4.10.0-3build2). If `xargs`/`find` become Rust, re-run `V/drive.sh` and `V/probes.sh` on that image (the status table in F4 is the thing most likely to move).
- **GNU grep warnings.** 3.8 onward warns on stray backslashes and obsolescent `egrep`/`fgrep`; Debian and Ubuntu patch some of these out, Alpine does not (F2). A "stderr must be empty" rule is therefore also a lint for sloppy escapes.
- **`grep -L` exit semantics.** GNU flipped twice (3.2 to 3.4, reverted in 3.5); busybox kept "0 when a file is listed". Treat the status of `-L` as undefined.
- **Windows runners.** The CR text-mode and `-P` locale findings are Git Bash 2.40 / grep 3.0; GHA windows-2025 ships a newer Git Bash (5.3.15 per the platform matrix) and was not run.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/grep.html | POSIX.1-2024 grep | 2024 (Issue 8) | primary: the option set grep guarantees (no `-r -H -L -P -z`) and the 0/1/>1 exit contract |
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/xargs.html | POSIX.1-2024 xargs | 2024 (Issue 8) | primary: `-0`, `-r`, exit 1-125 / 126 / 127 |
| https://raw.githubusercontent.com/gnu-mirror-unofficial/grep/master/doc/grep.texi | GNU grep manual source | master, 2026 | primary: `-r` with no operand searches `.`; Exit Status; `-P` with `-z` experimental; `--include` semantics |
| https://raw.githubusercontent.com/gnu-mirror-unofficial/grep/master/NEWS | GNU grep NEWS | 3.5 (2020-09) to 3.12 | primary: binary-file message to stderr (3.5), `-L` exit reverted (3.5), `-s` and binary messages (3.7) |
| https://raw.githubusercontent.com/gnu-mirror-unofficial/findutils/master/doc/find.texi | GNU findutils manual source | master | primary: xargs exit statuses 0/123/124/125/126/127 |
| https://raw.githubusercontent.com/mirror/busybox/master/findutils/grep.c | busybox grep source | master (binary measured: v1.37.0) | primary: the exact option string, `-I` and `-a` ignored, `-z` only with EXTRA_COMPAT |
| https://raw.githubusercontent.com/mirror/busybox/master/findutils/xargs.c | busybox xargs source | master | primary: `FEATURE_XARGS_SUPPORT_ZERO_TERM default y`, option bits |
| https://git-scm.com/docs/git-ls-files | git ls-files reference | git 2.5x | primary: `-z`, `--exclude-standard`, `--deduplicate`, `--error-unmatch`, `--eol` |
| https://git-scm.com/docs/git-grep | git grep reference | git 2.5x | primary: `--untracked`, `--and/--not`, `-P`, `-z` |
| https://git-scm.com/docs/gitglossary | git pathspec definition | git 2.5x | primary: `*` crosses `/`, `:(glob)`, `:(exclude)`, leading `**/` |
| https://git-scm.com/docs/git-config | git-config reference | git 2.5x | primary: `safe.directory` (protected config, why dubious ownership refuses) |
| https://raw.githubusercontent.com/git/git/v2.35.2/Documentation/RelNotes/2.35.2.txt | git 2.35.2 release notes | 2022-04 | primary: CVE-2022-24765, origin of the ownership check |
| https://github.github.com/gfm/ | GitHub Flavored Markdown spec 0.29-gfm | 2019 | primary: tables extension, pipe escaping inside inline spans (example 200) |
| https://www.msys2.org/docs/filesystem-paths/ | MSYS2 filesystem paths | 2026 | primary: automatic Unix-to-Windows argument conversion that breaks `git grep -e '/path'` |
| https://man.freebsd.org/cgi/man.cgi?query=grep&sektion=1 | FreeBSD 15.1 grep(1) | 2026 | BSD option set (read only; not macOS) |
| https://man.freebsd.org/cgi/man.cgi?query=xargs&sektion=1 | FreeBSD 15.1 xargs(1) | 2026 | `-r` accepted and ignored (read only; not macOS) |
| https://github.com/uutils/coreutils/releases/tag/0.10.0 | uutils coreutils 0.10.0 release | 2026-08-05 | which coreutils version ubuntu:26.04 carries |
| https://discourse.ubuntu.com/t/carefully-but-purposefully-oxidising-ubuntu/56995 | Ubuntu plan for Rust utilities | 2025 | what is and is not being replaced |
| https://github.com/koalaman/shellcheck/wiki/SC2038 | ShellCheck SC2038 | wiki, ShellCheck 0.11.0 era | `-print0` / `-0` rationale; local clone at `exemplars/shell/koalaman__shellcheck.wiki/SC2038.md` |
| `/home/mherwig/dev/grimoire-lore/.agents/worktrees/shell/.agents/research/shell-gate.md` (and shell-dialect, shell-errexit, shell-expansion, shell-ci, shell-pwsh, shell-emit) | the seven consolidations whose cells were measured | 2026-10-11 | the cells, rule IDs and conflicts this dive revises |

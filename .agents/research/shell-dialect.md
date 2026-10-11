---
title: "Dialect, version floors and userland (SH-DIAL, SH-USER): shebang and dialect policy, the bash 3.2 floor, POSIX.1-2024 sh verdicts, the external-command floor"
topic: shell scripting across operating systems and shells, wave 2, group dialect-floors-userland
model: sonnet
id_family: SH-DIAL, SH-USER
consolidates:
  - shell-dialect/floors-and-shebangs.md
  - shell-dialect/bash-version-gate.md
  - shell-dialect/userland-floor.md
date: 2026-10-11
---

# Dialect, version floors and userland (SH-DIAL, SH-USER)

Three dives fed this group: `floors-and-shebangs` (32 sources), `bash-version-gate` (24), `userland-floor` (30). Everything below was either re-run on 2026-10-11 for this consolidation (runs X1 to X11) or is cited to a dive section and its fixtures. Fixture roots: `FL/` = `/home/mherwig/.cache/research-lang/shell-tools/fixtures/floors-and-shebangs`, `BV/` = `.../bash-version-gate`, `UF/` = `.../userland-floor`, `DC/` = `.../dialect-consolidation` (this consolidation: `final-checks.sh`, `fin/plant`, `fin/twin`, `fleet-authored.sh`, `rerun-evidence.sh`). Toolchain: ShellCheck 0.11.0, shfmt 3.13.1, GNU grep 3.12; bash 3.2.57 to 5.3.20; dash 0.5.12-2, -6ubuntu5, -12; busybox ash 1.35 and 1.37; mksh R59c; ksh93u+m 2023 and 1.0.10; yash 2.52; posh 0.14.1; zsh 5.9; GNU coreutils 8.22 to 9.12; uutils 0.2.2 and 0.10.0; busybox 1.37.0; Git Bash 5.2.15. No macOS host: every BSD or macOS statement is marked "unverified: read only".

Script kinds named in every rule's scope:

| Kind | Meaning |
|---|---|
| INST | installer, bootstrap, anything that runs before a toolchain exists, a target of curl-piped-to-sh |
| CI | a script a workflow `run:` step calls |
| TOOL | dev tooling: repo tool, test helper, shipped catalog check |
| LIB | a sourced library (no shebang) |
| RC | an interactive rc or login-shell snippet |
| EMIT | code a tool emits for another shell |

## Verdict

1. **Declare the dialect in the file; make the body match it.** A shebang, or `# shellcheck shell=` on line 1 of a sourced file; ShellCheck runs with that dialect. Binds all kinds (SH-DIAL-01, -02).
2. **Dialect follows kind.** INST, RC and EMIT-for-sh are `#!/bin/sh` at POSIX.1-2017 plus probed features; TOOL and CI are `#!/usr/bin/env bash` at floor 3.2.57; LIB has no shebang. Line 2 to 8 states kind and floor (SH-DIAL-03, -05).
3. **Test `#!/bin/sh` where it breaks:** dash 0.5.12-2, busybox ash 1.37, bash 3.2 `--posix`; never bash 5.2 `--posix`, zsh sh-mode or the author's `/bin/sh`. Binds INST, RC, LIB shell=sh, EMIT (SH-DIAL-04).
4. **POSIX.1-2024 in sh:** probe pipefail; never `$'..'`, `read -d`, `test -a/-o`, `echo -n/-e`; `find -print0`, `xargs -0 -r` allowed; `local` only with a reasoned directive. Binds INST, RC, LIB shell=sh, EMIT (SH-DIAL-07 to -12, -17).
5. **One shebang argument, no `env -S`.** Binds every executable kind (SH-DIAL-18).
6. **Unpinned bash is bash 3.2.57.** A git-fed denylist flags 42 of 47 bash-4+ constructs where ShellCheck flags 0, plus a smoke run on `bash:3.2`. Binds TOOL, CI, LIB shell=bash (SH-DIAL-06, -27).
7. **A bash script above 3.2 pins itself:** `# bash-floor: X.Y` plus a guard as the first statement that exits 69; scalar test for a major floor, `case ${BASH_VERSION-}` for a minor floor or a sourced library. Binds TOOL, CI, LIB (SH-DIAL-25, -26).
8. **No GNU-only or BSD-only external-command form without a probe or a `# userland-ok: <reason>`.** `sed -i.bak` plus `rm`, a realpath helper, `command -v`, never a banner parse. Binds TOOL, CI, INST, EMIT (SH-USER-01 to -05, -16).
9. **Probe what is absent somewhere** (`timeout`, `flock`, `sha256sum`, wget flags, `rg`, `jq`, `python3`); `xargs -r` always; `LC_ALL=C` on each order-observable `sort`, never exported. MUST for INST, SHOULD-grade prerequisites for TOOL (SH-USER-06 to -10).
10. **Temp files and environment:** `mktemp -d "${TMPDIR:-/tmp}/name.XXXXXX"`, temp in the destination directory before `mv`, default every absent variable. Binds INST, CI, TOOL (SH-USER-11, -12, -14).
11. **Silent bash drift is configured away, not assumed away:** `shopt -u patsub_replacement 2>/dev/null || :` before data replacements, no `BASH_COMPAT`, shopts probed. Binds TOOL, CI (SH-DIAL-28).
12. **Delete the sentence "macOS `/bin/sh` is dash"** from the six fleet rule files that carry it (SH-DIAL-22). Binds rule and doc text.
13. **Every static check here runs through the SH-GATE-09 file list in one driver:** 21 checks print 135 lines on a plant tree and 0 on its twin (X1); the nine fleet trees give the counts in "Applied" (X2). Binds the gate.

### Conflicts resolved

1. **Guard form.** Floors dive: scalar `[ "${BASH_VERSINFO:-0}" -ge N ]`, exit 1. Bash-version-gate: array `${BASH_VERSINFO[0]:-0}`, exit 69, plus a `case` form for non-bash shells. X3 on 11 interpreters: the array form dies with exit 2 on dash and both busybox ash versions (3 of 11), refuses with 69 on 7, runs the body on bash 5.2 `--posix`; the scalar form refuses with 69 on 10 of 11 (the 11th, bash 5.2 `--posix`, satisfies it). **Resolved:** scalar for a major floor, `case ${BASH_VERSION-}` for a minor floor and for libraries, array indexing never in a guard (SH-DIAL-25, -26).
2. **Guard exit status.** Floors dive and bats-core use 1; the dive and the fleet contract (`rules/rust-quality/cli-contract.md`, 69 Unavailable) use 69. **Resolved:** 69, the same code SH-GATE-08 and SH-ERR-25 use for a missing prerequisite.
3. **Header position.** Floors dive: the kind line is line 2. `www-setup@a251c3631047:src/install.sh` carries SPDX lines at 2 and 3 and `# shellcheck disable` at 5 (X10). **Resolved:** the kind or `bash-floor` line may sit anywhere in lines 2 to 8.
4. **Directive reasons.** SH-ERR-13 writes a bare `# shellcheck disable=SC3040`; SH-GATE-07 prescribes a reason; floors dive SH-DIAL-17 calls a bare `disable=SC3043` a defect. **Resolved:** reasoned directives only, check d17 flags the bare form for both codes. SH-ERR-13's pipefail rule is the same rule as SH-DIAL-07 (and SH-CI-03): SH-DIAL-07 owns the grep, the other two cite it.
5. **File discovery.** The bash-version-gate denylist uses `grep -r --include='*.sh' --include='*.bash'`: it is blind to extensionless scripts (pyenv `libexec/pyenv-rehash:141` has `declare -A`, hit count 0) and on busybox grep the unknown option hides behind a pipe (UF V3: 0 lines, exit 1, a false green). **Resolved:** every check takes its file list from SH-GATE-09 discovery with SH-GATE-10 pathspecs (`files` below).
6. **`bash -n` on bash:3.2.** BVG-06 kept it as a secondary gate; SH-GATE-11 says `bash -n` is not a gate. It sees 6 of 47 constructs and exits 2 on a guard-first script that refuses correctly with 69 (BV V6). **Resolved:** dropped as a gate; a smoke run of the script on `bash:3.2` replaces it (SH-DIAL-27).
7. **Denylist coverage.** The dive's F1 prose says 44 of 47 constructs are flagged; its V1 run says 42. **Resolved:** 42 (V1 and X1 agree); the 5 unflagged are `at_assign`, `case_in_cmdsub_p` (the safe spelling), `empty_arr_u` and `at_nounset` (SH-ERR-12), `globskipdots` (SH-EXP-15).
8. **`xargs -r`.** Topic map: Linux only, a no-op on macOS, so do not depend on it. Floors dive: use. Userland dive: always. X7: `printf '' | xargs echo RAN` prints `RAN` on Ubuntu 24.04, Ubuntu 26.04, Alpine 3.22 (busybox) and Debian 13 (4 of 4); `-r` is POSIX.1-2024 and BSD accepts it as a no-op (unverified: read only). **Resolved:** always `-r` (SH-USER-08). The floors dive's "21 of 21" is 19 of 19: AL2023 and Leap have no xargs at all.
9. **`readlink -f`.** Floors dive SH-DIAL-14: avoid in macOS-reachable code, use `realpath` on Linux. Userland dive: a helper that tries `realpath`, `readlink -f`, then a `cd -P` loop. **Resolved:** the helper, SH-USER-03; SH-DIAL-14 retired into it.
10. **`which` absent on 7 or 8 images.** Topic map 7; UF F1 measured 8 of 21 (Alma 8/9/10, AL2, AL2023, Arch, Fedora, Leap). **Resolved:** 8.
11. **`cmd` under Git Bash.** SH-CI-14 allows `cmd //c` "or `MSYS_NO_PATHCONV=1`". UF F10: with `MSYS_NO_PATHCONV=1` the `//c` form prints the banner; that variable needs the single-slash `/c`. **Resolved:** one of two pairs, `cmd //c` with conversion on or `MSYS_NO_PATHCONV=1 cmd /c`, never mixed (SH-USER-15; SH-CI-14 owns the CI step).
12. **`local` probe vs ksh93.** Floors dive: allowed with a directive when ksh93 is not a target; installers keep the rustup probe. **Resolved:** both, by kind: LIB and CI use the reasoned directive alone, INST uses directive plus probe (the probe makes the variable global on ksh93, so correctness must not need local scope).

## The ruleset

Conventions. Every static check below takes its files from SH-GATE-09 discovery, with SH-GATE-10 pathspecs in `EXCL`, and prints the violation: empty output is a pass. `xargs` exits 123 when a `grep -L` it ran found nothing, so judge by output, never by status. GNU grep 3.x is assumed (`-z`, `-Z`); BSD grep is unverified: read only. A line carrying `# userland-ok: <reason>` is waived for the SH-USER checks; a file carrying `# bash-floor: X.Y` is skipped by the denylist and gated by SH-DIAL-25 instead.

```sh
EXCL=(':(exclude)external' ':(exclude).agents' ':(exclude,glob)**/fixtures/**')   # SH-GATE-10, per repo
files() { git ls-files -z --cached --others --exclude-standard -- . "${EXCL[@]}" | xargs -0 -r shfmt -f | tr '\n' '\0'; }
shfiles() { files | xargs -0 -r grep -lzZE -e '^#!/bin/sh' -e '^#!/usr/bin/env sh'; }   # -z: ^ matches only at file start, so a heredoc line "#!/bin/sh" is not a shebang
```

Severity: MUST (block), SHOULD (warn), CONSIDER (suggest). A MUST has a normative or measured source and a run verification, or says that it is a reading heuristic.

### Checks and runs

| Check | Rule(s) | Selects | Plant lines | Twin |
|---|---|---|---|---|
| d01 | SH-DIAL-01 | files with neither shebang nor `shell=` directive | 1 | 0 |
| d03 | SH-DIAL-03 | files with no `# Kind:` or `# bash-floor:` line in lines 2 to 8 | 20 | 0 |
| d06 | SH-DIAL-06, -28 | bash 4+ constructs in files without a `bash-floor` marker | 43 | 0 |
| d07 | SH-DIAL-07 | bare `set -o pipefail` in sh-shebang files | 1 | 0 |
| d09 | SH-DIAL-09 | `$'..'` in sh-shebang files | 1 | 0 |
| d10 | SH-DIAL-10 | `read -d` in sh-shebang files | 3 | 0 |
| d11 | SH-DIAL-11 | `-a`/`-o` inside `[ ]` in sh-shebang files | 1 | 0 |
| d12 | SH-DIAL-12 | `echo -n/-e/-E` in sh-shebang files | 3 | 0 |
| d17 | SH-DIAL-17, -08 | `disable=SC3043` or `SC3040` with no reason | 1 | 0 |
| d18 | SH-DIAL-18 | shebang with two or more arguments | 2 | 0 |
| d21 | SH-DIAL-21 | shebang files with no extension | 2 | 0 |
| d22 | SH-DIAL-22 | the sentence "macOS `/bin/sh` is dash" in markdown | 1 | 0 |
| u01 | SH-USER-01 to -05, -11 | GNU-only or BSD-only command forms, banner parses, `which`, `mktemp` forms | 37 | 0 |
| u06 | SH-USER-06 | files using `timeout`, `flock`, `sha256sum` with no `command -v` | 2 | 0 |
| u07 | SH-USER-07 | `rg`, `jq`, `python3` calls with no probe | 3 | 0 |
| u08 | SH-USER-08 | `xargs` without `-r` | 4 | 0 |
| u09 | SH-USER-09 | `sort`, `comm`, `join` without `LC_ALL=C` | 5 | 0 |
| u10 | SH-USER-10 | wget TLS flags with no `wget --help` probe | 1 | 0 |
| u16 | SH-USER-16 | `userland-ok` marker without a reason | 2 | 0 |
| e16a, e16b | SH-ERR-16 (cross-check only) | EXIT trap with no `TERM`; returning handler on `INT`/`TERM`/`HUP` | 1, 1 | 0 |

Runs of this consolidation, all 2026-10-11, all in `DC/`:

| Run | What | Result |
|---|---|---|
| X1 | `bash final-checks.sh fin/plant` and `fin/twin` (`run.sh bash`), 21 checks | plant 135 lines, every check prints (counts in the table above); twin 0 lines, 21 headings. A verbose form of d06 (59 patterns) and u01 (62 patterns) gives byte-identical output on plant, twin and the nine fleet trees |
| X2 | `fleet-authored.sh`: the same driver on nine trees with the `EXCL` above | counts in "Applied"; 190 authored shell files |
| X3 | guard forms: `guard-major.sh` (scalar), `guard-array.sh` (array), `guard-in-main.sh`, `guard-late.sh` under `matrix.sh bash` (3.2, 4.0, 4.2, 4.4, 5.0 to 5.3) and `matrix.sh posix` (11 interpreters) | scalar guard: bash 3.2, 4.0, 4.2, 4.4 exit 69, 5.0 to 5.3 exit 0 `ok count=2`; on 11 interpreters 10 exit 69, bash 5.2 `--posix` exit 0. Array guard: dash 0.5.12, ash 1.35, ash 1.37 exit 2; mksh, ksh93 x2, yash, posh, bash 3.2 `--posix`, zsh exit 69; bash 5.2 `--posix` runs. Guard inside `main()` with `[[ -v ]]`: bash 3.2 and 4.0 exit 2 (syntax error, no refusal), 4.2 to 5.3 exit 0. `declare -A` before the guard: bash 3.2 exit 2 with no refusal, 4.0 to 4.4 exit 69 |
| X4 | installer header (verbatim under SH-DIAL-03) under `matrix.sh posix` | 11 of 11 exit 0, output `hello none`; ShellCheck 0.11.0 0 findings; `shfmt -d -i 4` 0 diff lines |
| X5 | sourced-library guard `guard-lib2.sh` with `guard-lib2-caller.sh` on bash 3.2 to 5.3 and executed under bash:3.2, dash, sourced by zsh | bash 3.2 and 4.0: `source rc=69`, caller survives; 4.2 to 5.3: rc 0 `lib_ok ran`; executed bash 3.2 rc 69, dash rc 69; zsh sourced rc 69. ShellCheck 0.11.0 raises SC2317 (note) on all four spellings of `return 69 2>/dev/null \|\| exit 69` (`DC/sc2317/v1..v4.sh`), 0 findings with the per-site directive; shfmt `-i 4 -ci` 0 diff lines |
| X6 | `shellcheck -s sh -f gcc` on a 19-line file of bashisms (`sh-codes.sh`) | 18 distinct SC3xxx codes (SC3001, 3003, 3009, 3010, 3014, 3028, 3030, 3033, 3037, 3040, 3043, 3045, 3046, 3051, 3054, 3057, 3059, 3060) plus SC2113 and SC2166 |
| X7 | `printf '' \| xargs echo RAN`, `-I{}`, `-r`, `-0 -r` on ubuntu:24.04, ubuntu:26.04, alpine:3.22, debian:13 | plain `xargs` prints `RAN` on 4 of 4; `-r`, `-0 -r` and `-I{}` print nothing |
| X8 | trap harness, SIGTERM at a script holding a temp directory, 7 shells (dash 0.5.12-2, ash 1.37, mksh R59c, posh 0.14.1, yash 2.52, bash 3.2.57, bash 5.3) | `trap cleanup EXIT; trap 'exit 143' TERM INT HUP; cmd & wait $!`: directory gone and script stopped, 7 of 7. `trap cleanup EXIT INT TERM HUP; cmd & wait $!` (the fleet installer shape): directory gone, script **continued** after the signal, 7 of 7. Foreground `sleep` with the returning handler: only yash printed a row, directory leaked |
| X9 | `wget --https-only` and `wget --secure-protocol=TLSv1_2` on alpine:3.22 (busybox 1.37.0) | `wget: unrecognized option: https-only` and `unrecognized option: secure-protocol=TLSv1_2`, usage printed, nothing fetched |
| X10 | header window, `hdr-check.sh` on the twin trees and on `www-setup@a251c3631047:src/install.sh` | the real installer has SPDX at lines 2 and 3 and no `# Kind:` yet, so lines 2 to 8 is the window |
| X12 | the d06 and u01 blocks copied out of this file and run unchanged (`doc-d06-u01-check.sh`) | plant: d06 43 lines, u01 37 lines; twin: 0 and 0 (the text here is the text that was run) |
| X11 | `for i in {1..3}` in `#!/bin/sh` on 11 interpreters | `iterations=1` on dash, ash x2, ksh93u+m 1.0.10, yash, posh, zsh (7 of 11); 3 on mksh, ksh93u+m 2023, bash x2 (cross-owned: SH-EXP-12) |

### Reference tables

**T1. `#!/bin/sh` feature matrix and verdict** (measured: FL §4.1, §14, X3; `y` works, `n` fails; the bash 3.2 column ran in the `bash:3.2` image, so only its shell features count; dash -2 and -6ubuntu5 are Debian 12 and Ubuntu 24.04, dash -12 is Debian 13 and Ubuntu 26.04):

| Feature | dash -2/-6 | dash -12 | ash 1.37 | mksh | ksh93u+m 1.0.10 | yash 2.52 | posh 0.14.1 | bash 3.2 `--posix` | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| `set -o pipefail` | n (abort) | y | y | y | y | y | n (abort) | y | probe |
| `$'..'` | n (literal) | n | y | y | y | n (literal) | n (literal) | y | never |
| `read -d` | n | n | y | y | y | n | n | y | never |
| `test -nt -ot -ef` | y | y | y | y | y | y | n | y | use, not for posh |
| `test -a -o` | y | y | y | y | y | y | y | y | never (removed in POSIX.1-2024, SC2166) |
| `local` | y | y | y | y | n (127) | y | y | y | allowed with directive |
| `echo -n` | y | y | y | y | y | n (prints `-n`) | y | y | never |
| `[[ ]]` | n | n | y | y | y | y | n | y | never in sh |

Not in the matrix: `find -print0` and `xargs -0`: use, present wherever findutils is (absent on amazonlinux:2023 and opensuse/leap, FL §7); busybox 1.37 accepts them in the default Alpine build, the Kconfig option names were not fetched. `xargs -r`: use (X7). `realpath FILE` and `readlink -f`: Linux only (21 of 21 images; macOS 12.3 and 13.0 unverified: read only). `timeout`: probe, accept 124, 137 and 143 (busybox 143; uutils `-s KILL` 124, GNU 137). `function f` and a `-` in a function name: dash and posh reject them (FL §12). dash 0.5.12-7 (2024-05-17) backported pipefail, so Debian 13, Ubuntu 25.10, 26.04 and 26.10 have it and Debian 11/12, Ubuntu 20.04/22.04/24.04 do not; `dash --version` does not exist (exit 2). Upstream dash 0.5.13.5 has `$'..'` (2024-06-22) but no Debian or Ubuntu package does. `/bin/sh` on the 21 images: dash on 9, busybox ash on 3, bash on 9; the 12 non-dash images accept bashisms [FL §14].

**T2. Bash 3.2 failure classes** (BV F1, 47 probes on bash 3.2 to 5.3; first working version in brackets):

| Class on 3.2 | Constructs |
|---|---|
| Parse error: the script dies at that line (exit 2), a function holding it is never defined, a sourced file loses everything after it | `\|&` [4.0], `&>>` [4.0], `coproc` [4.0], `;;&` and `;&` [4.0], `[[ -v x ]]` [4.2], an unparenthesised case pattern inside `$( )` [4.0] |
| Loud at run time, then the script continues with empty data | `declare -A`, `local -A` [4.0], `mapfile`, `readarray` [4.0], `${x^^}` `${x,,}` [4.0], `declare -u/-l` [4.0], `globstar` [4.0], `read -t 0.2` [4.0], `exec {fd}>` [4.1], `[ -v x ]` [4.2], `${a[-1]}` [4.2], `${s:0:-2}` [4.2], `printf '%(%Y)T'` [4.2], `declare -g` [4.2], `lastpipe` [4.2, variable stays empty], `local -n` [4.3], `wait -n` [4.3], `${x@Q}` [4.4], `inherit_errexit` [4.4], `${x@U}` [5.1], `${ cmd; }` and `${\| cmd; }` [5.3], `source -p`, `trap -P` [5.3] |
| Silent, no message at all | brace `{01..03}` and `{1..10..4}` [4.0], `EPOCHREALTIME`, `EPOCHSECONDS`, `BASH_ARGV0` [5.0], `SRANDOM` [5.1], `GLOBSORT`, `BASH_MONOSECONDS` [5.3], `${A[@]@K}` and `@k` on 4.0 to 4.3 (values only), `${y/b/[&]}` and `.*` (behaviour change at 5.2) |

A floor violation therefore looks like a successful run with missing data: `declare -A m` on 3.2 prints `declare: -A: invalid option`, builds an indexed array, and the script exits 0 with `count=1 a=2 b=2` [BV F2; FL §2.1]. Bash parses a whole compound command before running any of it, so a guard inside `main()` that also holds `[[ -v x ]]` never runs (X3).

**T3. Script kinds, headers and prologues** (FL §2, BV F12, X4, X5):

| Kind | Dialect | Floor | Header (lines 2 to 8) |
|---|---|---|---|
| INST, and any `curl \| sh` target | `#!/bin/sh` | POSIX.1-2017 plus probed pipefail and local | `# Kind: installer. Dialect: POSIX sh. Floor: POSIX.1-2017 + probed (pipefail, local). Tested: dash 0.5.12-2, busybox ash 1.37, bash 3.2 --posix.` |
| TOOL, CI (unpinned) | `#!/usr/bin/env bash` | bash 3.2.57 | `# Kind: repo tool. Floor: bash 3.2.` |
| TOOL, CI (pinned) | `#!/usr/bin/env bash` | the named version, guarded | `# Kind: CI helper. Floor: bash 5.2 (pinned: ubuntu-24.04 runner).` and `# bash-floor: 5.2` |
| LIB, RC | none; line 1 `# shellcheck shell=sh` or `shell=bash` | the floor of its callers | `# Floor: sourced by <callers>`; a raised bash floor adds `# bash-floor: X.Y` |
| EMIT | the target shell's own | the target's floor | owned by SH-EMIT; for an sh target the INST row applies |

Installer prologue, verbatim (X4: 11 of 11 interpreters exit 0, ShellCheck 0, shfmt `-i 4` 0):

```sh
#!/bin/sh
# Kind: installer. Dialect: POSIX sh. Floor: POSIX.1-2017 + probed (pipefail, local). Tested: dash 0.5.12-2, busybox ash 1.37, bash 3.2 --posix.
# shellcheck disable=SC3043 # local verified at runtime by has_local(); ksh93 gets typeset
set -u
# shellcheck disable=SC3040 # probed in a subshell first: dash 0.5.12-2 and posh abort on an unknown set -o
(set -o pipefail) 2>/dev/null && set -o pipefail
has_local() { (PATH='' local _has_local); }
has_local 2>/dev/null || alias local=typeset

say() { printf '%s\n' "$*"; }

main() {
    local greeting
    greeting=hello
    say "$greeting ${1:-none}"
}

main ${1+"$@"}
```

(`main ${1+"$@"}`, not `main "$@"`: posh 0.14.1 fails an empty `"$@"` under `set -u`, SH-ERR-12.) Pinned bash prologue, verbatim (X3):

```bash
#!/usr/bin/env bash
# Kind: CI helper. Floor: bash 5.2 (pinned: ubuntu-24.04 runner).
# bash-floor: 5.2
[ "${BASH_VERSINFO:-0}" -ge 5 ] || {
    printf '%s\n' "$0: needs bash >= 5 (found ${BASH_VERSION:-non-bash})" >&2
    exit 69
}
set -euo pipefail
```

**T4. GNU-only and BSD-only forms** (UF F2 on 21 images plus Git Bash; the BSD column is unverified: read only, from Apple `text_cmds-199`, `shell_cmds-329`, `file_cmds-479`):

| Incorrect | Correct | Fails on (measured) |
|---|---|---|
| `sed -i 's/a/b/' f`, `sed -i '' ...` | `sed -i.bak ... && rm -f f.bak` | the `''` form: GNU sed 4.9 rc 2, busybox rc 1, file unchanged; the bare form: BSD takes `-e` as the suffix |
| `sed -z`, `sed -r` | `sed -E`; avoid `-z` | `-z` on Alpine 3.22/3.23 and busybox |
| `readlink -m`, `realpath -m/-s/--relative-to` | helper (SH-USER-03) | busybox 1.37 |
| `date -d '2020-01-02T03:04:05Z'`, `date -d '... +1 day'` | `date -u -d @N` with `date -r N` fallback; `date +%s` | ISO `T..Z` and relative forms on busybox; weekday words differ (GNU 9.4 ignores, uutils applies); `date +%N` GNU-only |
| `stat -c %s f` | `wc -c < f`; `stat -c` then `stat -f` pair for mtime | `-f` on GNU means filesystem status; Git Bash returns 644 after `chmod 600` |
| `grep -P '\d'` | `grep -E '[0-9]'` | Alpine, busybox, Git Bash (rc 2) |
| `grep -r --include=GLOB`, `--exclude-dir` | `find d -type f -name 'GLOB' -exec grep -l x {} +` | busybox; the error hides behind a pipe |
| `find -printf` | `find -print` | busybox; AL2023 and Leap have no find |
| `mktemp --suffix`, `-t`, `--tmpdir` | `mktemp "${TMPDIR:-/tmp}/name.XXXXXX"` | suffix after X or fewer than 6 X on busybox |
| `head -n -1`, `cut --complement`, `ln -sr` | `sed '$d'`, `cut -c2-`, `ln -s ../a b` | BSD head rejects non-positive counts; `cut --complement` and `ln -sr` on busybox and Git Bash |
| `tar --exclude-vcs --owner --sort --zstd` | plain `tar -cf`; probe for reproducible archives | busybox, AL2, AL2023; `--zstd` works on 2 of 21 images (Arch, Fedora) |
| `timeout` unguarded | `command -v timeout`, else a watchdog | busybox rc 143; uutils `-s KILL` rc 124; absent on macOS (unverified: read only) |
| `flock` | `mkdir lockdir` as mutex (atomic on local file systems; NFS not measured) | absent on AL2, AL2023, nixos/nix, Git Bash |
| `which`, `shasum`-only, `sha256sum`-only | `command -v`; `sha256sum` then `shasum -a 256` then `openssl dgst -sha256` | `which` absent on 8 of 21; `shasum` on 0 of 21; macOS lacks `sha256sum` (unverified: read only) |
| `env -S`, `uname -o`, `base64 -D` | avoid; `uname -s`; `base64 -d` | `env -S` on busybox, AL2, Ubuntu 25.10 |

Universal on all 21 images: `readlink -f` of an existing file, `realpath`, `date -d @N`, `date -d 'YYYY-MM-DD HH:MM:SS'`, `stat -c`, `sort -V/-h`, `mktemp -d`, `sha256sum`, `base64 -d`, `install -D`.

**T5. What is in the base image** (UF F1, 21 images): `sh` 21, `awk` 20 (mawk 9, gawk 8), `curl` 9, `perl` 9, `wget` 4, `python3` 3, `git` 1, `jq` 0, `rg` 0, `shasum` 0, `sha256sum` 21, `which` 13 (absent: Alma 8/9/10, AL2, AL2023, Arch, Fedora, Leap), `flock` 18, `xargs` and `find` 19, `tar` 19 (absent AL2, AL2023), `bash` 18 (absent: both Alpine tags, busybox:1.37). uutils is the default on Ubuntu 25.10 (0.2.2), 26.04 and 26.10 (0.10.0); `ubuntu-latest` moves to 26.04 in November 2026 [FL contested].

**T6. Locale and collation** (`sort` of `b B a A _x -y é Z z 10 9 'a b' ab`, UF F5):

| Environment | Ubuntu 24.04 (GNU 9.4) | Ubuntu 26.04 (uutils 0.10.0) |
|---|---|---|
| nothing set | bytes `10 9 A B Z _x a b z` | same |
| `LANG=en_US.UTF-8`, locale not installed | bytes (silent fallback) | ICU order `10 9 a A b B _x z Z` |
| `LANG=zz_ZZ.UTF-8` or any `*.UTF-8` / `*.utf8` name | bytes | ICU order |
| `LANG=en_US`, `C.UTF-8`, `C`, `POSIX` | bytes | bytes |
| `LC_ALL=C` with any `LANG` | bytes | bytes |

uutils also differs from GNU 9.4 on 37 of 304 cases (25.10) and 30 (26.04): error text always, `timeout -s KILL` exit (124 vs 137), `date -d '<date> friday'`, `wc -m/-L` and `cut -c` on multibyte input in the C locale, `uname -p/-i` (`unknown`), `ls --color` on a pipe, `sort +1`. `export LC_ALL=C` changes `${#x}`, `wc -m`, `awk length` and `cut -c` on `héllo` from 5 to 6.

### SH-DIAL

#### A. Caught by ShellCheck or shfmt

**SH-DIAL-02 · MUST.** The body matches the declared dialect: run ShellCheck with the shebang's dialect (SC3xxx are on for `#!/bin/sh`) and `shfmt -d`. Never use `shfmt -d` as the dialect gate for a file without a shebang.
- *Why.* A `#!/bin/sh` file holding an array is `tried parsing as posix` in shfmt and SC3030/SC3054 in ShellCheck; a shebang-less `.sh` is parsed as bash by shfmt 3.13.1 (`langFromFilename`: `.sh` "doesn't mean it's POSIX Shell for sure"; the manual says otherwise) and only ShellCheck objects. [FL §1]
- *Verify.* `shellcheck -f gcc FILE` at default severity, `shfmt -d -i 4 FILE` (style per SH-GATE-12). Function names and the `function` keyword are covered by the same run: SC3033, SC2112, SC2113 (this retires FL SH-DIAL-20).
- *Watched red.* Yes. X6: 18 distinct SC3xxx plus SC2113 and SC2166 on one 19-line file. FL V09: `mixed-sh-shebang.sh` shfmt 1 and ShellCheck 1; `mixed.sh` shfmt 0, ShellCheck 1 (SC2148); the twins 0 and 0.
- *Scope.* ShellCheck 0.11.0, shfmt 3.13.1; all kinds. Unreleased ShellCheck master accepts pipefail in SC3040 and removes SC3003, so a later pin silences warnings that Debian 12 and Ubuntu 24.04 dash still need: keep d07 and d09 beside the pinned ShellCheck.

**SH-DIAL-08 · SHOULD.** Suppress SC3040 on the pipefail probe with a reason, placed above the one-line `&&` list or the `if`: `# shellcheck disable=SC3040 # probed in a subshell first: dash 0.5.12-2 and posh abort on an unknown set -o`. Pin ShellCheck until an sh floor with `$'..'` exists.
- *Why.* The probe line raises SC3040 twice on 0.11.0 (columns 9 and 41); a directive inside the `if` leaves the probe line flagged. [FL §5.5]
- *Verify.* `shellcheck FILE` exits 0 on the installer prologue (X4); `shellcheck --version` shows the pinned version (SH-GATE-13).
- *Watched red.* Yes. FL V10/V11: probe without directive exit 1 (SC3040 twice), `sh-pipefail-probe-lint.sh` and `sh-probe-suppressed.sh` exit 0; X4.
- *Scope.* `#!/bin/sh`; INST, RC, LIB shell=sh, EMIT sh targets.

#### B. Caught by grep over the file list

**SH-DIAL-01 · MUST.** Every authored shell file declares its dialect: a shebang, or, for a shebang-less sourced file, `# shellcheck shell=sh` or `shell=bash` as line 1.
- *Why.* Without it shfmt guesses bash and ShellCheck reports SC2148 (error, exit 1). [FL §1]
- *Verify.* d01: `files | xargs -0 -r grep -L -e '^#!' -e '^# shellcheck shell='` lists the offenders.
- *Watched red.* Yes. X1: prints `mixed.sh`, nothing on the twin. FL V09. Fleet: 0 of 190.
- *Scope.* All kinds; ShellCheck 0.11.0, shfmt 3.13.1.

**SH-DIAL-03 · MUST.** State kind and floor in the header, anywhere in lines 2 to 8, in the form of the T3 table: `# Kind: ...` (sh or bash) or `# bash-floor: X.Y` (pinned bash); a sourced library adds `# Floor: sourced by <callers>`. Choose the dialect by kind: INST `#!/bin/sh`, TOOL and CI `#!/usr/bin/env bash` at 3.2, LIB no shebang.
- *Why.* `/bin/sh` exists on 21 of 21 images and bash on 18 of 21; `#!/usr/bin/env bash` and `#!/bin/bash` both fail on Alpine and busybox (exit 127), `#!/bin/bash` fails on nixos/nix (126); macOS runners macos-14, 15 and 26 print bash 3.2.57. [FL §2, §3.1; BV F9, F12]
- *Verify.* d03: `files | tr '\0' '\n' | while IFS= read -r f; do sed -n '2,8p' "$f" | grep -q -e '^# Kind: ' -e '^# bash-floor: ' || echo "no Kind/bash-floor header in lines 2-8: $f"; done`. Whether the stated kind is true is a reading heuristic and was not watched red.
- *Watched red.* Presence only: X1 d03 prints 20 plant lines, 0 on the twin; X10 sets the window. Fleet: 0 of 190.
- *Scope.* All kinds.

**SH-DIAL-05 · SHOULD.** Write `#!/usr/bin/env bash` for bash. `#!/bin/bash` only when the header says `Floor: system bash 3.2`. Never `#!/bin/sh` for bash code.
- *Why.* `/bin/bash` is absent on nixos/nix (exit 126) and on Alpine and busybox:1.37 (127); `env bash` fails only where bash is not installed. [FL §3.1, V18]
- *Verify.* `files | xargs -0 -r grep -n -e '^#!/bin/bash'` lists the exceptions to check against the header; ShellCheck SC2239 for relative shebang paths.
- *Watched red.* On images only: FL V18. Fleet: 0 `#!/bin/bash` in the git-tracked authored scope.
- *Scope.* TOOL, CI; nixos/nix 5.3.9, alpine:3.22.

**SH-DIAL-06 · MUST.** Write every unpinned bash script to bash 3.2.57. The denylist prints nothing for every file that lacks a `# bash-floor:` line; a script that needs more follows SH-DIAL-25.
- *Why.* macOS `/bin/bash` and the runners macos-14/15/26 are 3.2.57; reachability cannot be decided statically (`index@9eba2cc3929b:scripts/golden-baseline.sh:250` runs in CI at `.github/workflows/ci.yml:136` and by hand per `taskfile.yml:372`). ShellCheck 0.11.0 flags 0 of 47 bash-4+ constructs, also with `--enable=all` ([koalaman/shellcheck#2615](https://github.com/koalaman/shellcheck/issues/2615) open since 2022-10-25), shfmt `-ln bash` accepts 46 of 47, and `bash -n` on 3.2 sees 6 of 47 (T2). [BV F2, F3, F12]
- *Verify.* d06, output is the violation:
  ```sh
  files | xargs -0 -r grep -LE -e '^# bash-floor: ' | tr '\n' '\0' | xargs -0 -r grep -nE \
    -e '^[^#]*(declare|local|typeset|readonly)[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-[a-zA-Z]*A' \
    -e '^[^#]*(mapfile|readarray)[[:space:]]' \
    -e '^[^#]*\$\{[A-Za-z_0-9@*]+(\[[^]]*\])?[,^]' \
    -e '^[^#]*(declare|local)[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-[a-zA-Z]*[ul][[:space:]]' \
    -e '^[^#]*\[\[?[[:space:]]+(![[:space:]]+)?-[vR][[:space:]]' \
    -e '^[^#]*\[-[0-9]+\]' \
    -e '^[^#]*:[0-9]+:-[0-9]' \
    -e '^[^#]*printf[[:space:]]+[^;]*%\([^)]*\)T' \
    -e '^[^#]*declare[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-[a-zA-Z]*[ng][[:space:]]' \
    -e '^[^#]*(local|typeset)[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-[a-zA-Z]*n[[:space:]]' \
    -e '^[^#]*wait[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-[a-zA-Z]*n' \
    -e '^[^#]*\$\{[A-Za-z_0-9@*]+(\[[^]]*\])?@[QEPAaKkUuL]\}' \
    -e '^[^#]*shopt[[:space:]]+-[su][[:space:]]+[^#]*(inherit_errexit|lastpipe|globstar|globskipdots|patsub_replacement|localvar_inherit|varredir_close|compat[0-9])[[:space:]]*(;|$)' \
    -e '^[^#]*([|]&|&>>|;;&)' \
    -e '^[^#]*coproc[[:space:]]' \
    -e '^[^#]*;&[[:space:]]*$' \
    -e '^[^#]*(EPOCHREALTIME|EPOCHSECONDS|SRANDOM|BASH_ARGV0|BASH_MONOSECONDS|BASH_TRAPSIG|GLOBSORT|BASHPID|BASH_COMPAT)' \
    -e '^[^#]*\$\{[[:space:]|]' \
    -e '^[^#]*(source[[:space:]]+-p[[:space:]]|trap[[:space:]]+-P)' \
    -e '^[^#]*read[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-t[[:space:]]+[0-9]*\.[0-9]' \
    -e '^[^#]*\{[0-9]+\.\.[0-9]+\.\.[0-9]+\}' \
    -e '^[^#]*\{0[0-9]+\.\.' \
    -e '^[^#]*[^$]\{[A-Za-z_][A-Za-z_0-9]*\}[<>]' \
    -e '^[^#]*\$\([[:space:]]*case[[:space:]]+[^[:space:]]+[[:space:]]+in[[:space:]]+[^(]' \
    -e '^[^#]*\$\{[A-Za-z_][A-Za-z_0-9]*//?[^/}]+/[^}]*&'
  ```
  Replace each hit with its 3.2 twin (T2 and the BV twins: `while IFS= read -r l; do a+=("$l"); done < <(cmd)` for `mapfile`, `tr` for `${x,,}`, `(a)` patterns inside `$( )`, `i=$((i + 1))`), or add the marker and the SH-DIAL-25 guard. When ShellCheck's SC2207 says "Prefer mapfile", the answer is the read loop, not `mapfile`.
- *Watched red.* Yes. BV V1: 42 hit lines in 42 of 47 snippets (the five unflagged are listed in conflict 7), 0 lines on 30 twins that print identical output on 3.2, 4.0, 4.4 and 5.3 (V12). X1: 43 plant lines, 0 on the twin. Fleet: 10 lines in 5 files, 0 false positives (BV V9; X2).
- *Scope.* TOOL, CI, LIB shell=bash; bash 3.2.57 to 5.3.20. Blind spots: a flag carried in a variable, a heredoc or quoted word such as `mapfile `, and a `#` earlier on the line (`$#`, `${#a[@]}`) which the `^[^#]*` prefix reads as a comment (0 true hits lost on the fleet). A `-e` pattern is added when a new construct is probed; patsub `&` carried in data is SH-DIAL-28.

**SH-DIAL-07 · MUST.** In `#!/bin/sh` code enable pipefail only as `(set -o pipefail) 2>/dev/null && set -o pipefail`, on one line. Never bare, never `|| true`, never `2>/dev/null || :`, never through `eval` or `command set`. Never let correctness depend on it.
- *Why.* An unknown `set -o` is a special-builtin error that exits dash 0.5.12-2/-6ubuntu5 (status 2) and posh 0.14.1 (status 1) with no later output; `command set` survives dash but not posh. The probe ran green on 11 of 11 interpreters and leaves pipefail **off** on dash -2/-6 and posh (`false | true` gives `pipeline-status=0`). A version string identifies nothing: dash 0.5.12-7 backported pipefail, `dash --version` does not exist. [FL §5, V01 to V03; SH-ERR-13 and SH-CI-03 restate the same rule]
- *Verify.* d07: `shfiles | xargs -0 -r grep -nE -e '^[[:space:]]*set [^#]*pipefail'` prints the bare line (the probe is `(set ...)`, so the anchor skips it).
- *Watched red.* Yes. X1: 1 plant line (`set -o pipefail || true`), 0 on the twin. FL V01: dash exit 2, posh exit 1, no `reached`; the probe `reached` on 11 of 11. FL V20 anchored the pattern with `grep -z` after a first form hit 6 fleet files whose `#!/bin/sh` sat inside heredocs. Fleet: 0 hits.
- *Scope.* INST, RC, LIB shell=sh, EMIT sh targets; dash 0.5.12-2/-6ubuntu5, posh 0.14.1. A step that needs pipefail is a bash step.

**SH-DIAL-09 · MUST.** Never write `$'..'` in `#!/bin/sh` or `shell=sh` code; use `printf`.
- *Why.* dash 0.5.12-2/-6ubuntu5/-12, yash 2.52 and posh 0.14.1 print the literal `$a\tb` and exit 0: a silent wrong value. Upstream dash has it since 2024-06-22, no Debian or Ubuntu package does. Build a string with a literal tab or newline through `printf` (command substitution strips trailing newlines). [FL §6, V04]
- *Verify.* d09: `shfiles | xargs -0 -r grep -nE -e "^[\$]'" -e "[[:space:]=(;&][\$]'"`; ShellCheck SC3003 on 0.11.0 (removed on master).
- *Watched red.* Yes. X1: 1 plant line; FL V04: literal on dash, yash, posh, `a<TAB>b` on the other 8; twin `printf 'a\tb'` correct on 11 of 11. Fleet: 0 hits. Exemplar: `acmesh-official__acme.sh@807da6498377:acme.sh:7387` (`[ "$char" = $'\0' ]`, `#!/usr/bin/env sh`).
- *Scope.* INST, RC, LIB shell=sh, EMIT sh targets (SH-EMIT-12 is the emitter-side twin).

**SH-DIAL-10 · MUST.** Never use `read -d` in `#!/bin/sh` code. Use `find ... -exec cmd {} +` or `find ... -print0 | xargs -0 -r cmd`.
- *Why.* `read -d` is `Illegal option -d` on every dash (including upstream 0.5.13.5), `-d' is not a valid option` on yash, `invalid option` on posh; the failure is a stderr line and an empty variable, not an exit. POSIX's own `find -print0 | while IFS= read -rd ""` example is therefore not dash-portable. [FL §7, V16]
- *Verify.* d10: `shfiles | xargs -0 -r grep -nE -e '(^|[[:space:];{(])read[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*-[a-zA-Z]*d'`; ShellCheck SC3045.
- *Watched red.* Yes. X1: 3 plant lines (two code lines and the comment naming `read -d`), 0 on the twin; FL V16. Fleet: 0.
- *Scope.* INST, RC, LIB shell=sh; dash 0.5.12, yash 2.52, posh 0.14.1.

**SH-DIAL-11 · SHOULD.** Never write `-a` or `-o` inside `[ ]` or `test`; use `[ p ] && [ q ]`.
- *Why.* POSIX.1-2024 removed them (Defect 1330); ShellCheck SC2166 fires on 0.11.0. They still work on 11 of 11 interpreters and Debian Policy 10.4 keeps them, so this is style plus forward safety, not a runtime failure. [FL §4, §4.1]
- *Verify.* d11: `shfiles | xargs -0 -r grep -nE -e '\[[^]]*[[:space:]]-[ao][[:space:]]'`; ShellCheck SC2166.
- *Watched red.* Yes. X1: 1 plant line, 0 on the twin; FL V25. Fleet: 0.
- *Scope.* sh-dialect kinds.

**SH-DIAL-12 · MUST.** In `#!/bin/sh` code print with `printf '%s\n'`, never `echo -n`, `echo -e` or `echo -E`.
- *Why.* yash 2.52 prints `-n`; dash interprets `\t` and prints `-e`. macOS `/bin/sh` echo behaviour is unverified: read only. [FL §4.1; SH-EXP-09 keeps the data and non-sh scope]
- *Verify.* d12: `shfiles | xargs -0 -r grep -nE -e '(^|[[:space:];{(])echo[[:space:]]+-[neE]'`; ShellCheck SC3037.
- *Watched red.* Yes. X1: 3 plant lines (2 in the sh fixture, 1 in the userland fixture), 0 on the twin; FL V25. Fleet: 0 in 190 authored files. The only fleet hit is outside the scope of the nine trees: `rust-devcontainer-cli/.../whoisremoteuser/install.sh:9` (`echo -n`).
- *Scope.* INST, RC, LIB shell=sh, EMIT sh targets; yash 2.52, dash 0.5.12.

**SH-DIAL-17 · MUST.** `local` in `#!/bin/sh` code carries a reasoned directive: `# shellcheck disable=SC3043 # local verified at runtime by has_local(); ksh93 gets typeset` (INST, with the rustup probe `has_local() { (PATH='' local _has_local); }` then `has_local 2>/dev/null || alias local=typeset`) or `# shellcheck disable=SC3043 # local: dash, ash, bash, mksh, yash, posh; not ksh93 (see header)` (other sh kinds). A bare `disable=SC3043` or `disable=SC3040` is a defect.
- *Why.* ksh93u+m 1.0.10 exits 127 on bare `local` (`local: not found`); the probe keeps it running but leaks the variable global (`x=2` visible after the call), so code must not need local scope there. Austin Group bug 767 "Add built-in local" is Closed, Rejected; Debian Policy 10.4 mandates `local` for `/bin/sh`. [FL §9, V15]
- *Verify.* d17: `files | xargs -0 -r grep -nE -e 'disable=SC3043[[:space:]]*$' -e 'disable=SC3040[[:space:]]*$'` (a reason follows the code on the same line); ShellCheck SC3043 red without the directive.
- *Watched red.* Yes. X1: 1 plant line, 0 on the twin; FL V15 and V26: ksh93u+m exit 127 bare, exit 0 with the probe; ShellCheck exit 1 bare, 0 with the reasoned directive. Fleet: 0 bare directives; the one `local` in an sh script is probed (`www-setup@a251c3631047:src/install.sh:5,37-40`; it lacks rustup's `PATH=''`, harmless unless a `local` executable is on PATH).
- *Scope.* INST, RC, LIB shell=sh; ksh93u+m 1.0.10 is the only shell measured without `local`.

**SH-DIAL-18 · MUST.** At most one argument after the interpreter in a shebang. Set options in the body (`set -eo pipefail`). No `#!/usr/bin/env bash -e`, no `env -S` in a shebang that can reach a container.
- *Why.* The Linux kernel passes everything after the interpreter as one argument: `#!/bin/bash -e -o pipefail` gives `/bin/bash: - : invalid option` (exit 1), `#!/usr/bin/env bash -e` gives `env: 'bash -e': No such file or directory` (127). `env -S` is absent from busybox 1.37 (exit 1) and coreutils 8.22 (exit 125), and the spaced form is broken in uutils 0.2.2. [FL §3.2, V06 to V08]
- *Verify.* d18: `files | xargs -0 -r grep -nE -e '^#![[:space:]]*/[^[:space:]]+[[:space:]]+[^[:space:]]+[[:space:]]+[^[:space:]]'`; ShellCheck SC2096.
- *Watched red.* Yes. X1: 2 plant lines, 0 on the twin; FL V06/V07: five images exit 1 or 127, twin exit 0; V12: SC2096 error on both plants. Fleet: 0.
- *Scope.* Every executable kind; Linux 6.18, coreutils 9.4, busybox 1.37. macOS splits arguments (unverified: read only).

**SH-DIAL-21 · SHOULD.** Authored scripts carry `.sh` (bash or sh); `.bash` only for sourced bash libraries; an extensionless shebang file only for an installed command or a tool-managed hook, and then its header names the kind.
- *Why.* No glob matches a shebang: `.sh` alone does not select a dialect (SH-DIAL-01 still applies), and Debian Policy 10.4 drops the extension only at the installed name. `shfmt -f` lists extensionless shebang files. [FL §15]
- *Verify.* d21: lists every shebang file whose name has no dot (`files | tr '\0' '\n' | while IFS= read -r f; do case $(head -n1 "$f") in '#!'*) ;; *) continue ;; esac; case $f in *.*) ;; *) echo "extensionless shell file: $f" ;; esac; done`).
- *Watched red.* Yes. X1: prints `noext-script` and `tool-bash`, nothing on the twin. Fleet: 1, `setup-grimoire@1259e35b2550:site/sh` (the served bootstrap named `sh`; waive with a header line).
- *Scope.* All kinds; shfmt 3.13.1 (`shfmt --detect` exists from 3.14.0).

**SH-DIAL-22 · SHOULD.** Never write "macOS `/bin/sh` is dash". Write "bash 3.2 in POSIX mode by default, selectable to dash (unverified: read only)".
- *Why.* Apple documents bash 3.2.57 and a `/bin/sh` shim that reads `/private/var/select/sh`; no Apple source says dash is the default. The sentence sits in six fleet repos. [FL §13]
- *Verify.* d22: ``git ls-files -z -- '*.md' | xargs -0 -r grep -nF -e 'macOS `/bin/sh` is dash'``.
- *Watched red.* Yes. X1: 1 plant line, 0 on the twin. Fleet: 5 of 6 scanned (see "Applied").
- *Scope.* Rule and doc text.

#### C. Caught by a run on real interpreters

**SH-DIAL-04 · MUST.** Test every `#!/bin/sh` script on dash 0.5.12-2 (Debian 12, Ubuntu 24.04), busybox ash 1.37 (Alpine 3.22) and bash 3.2 `--posix`; add posh 0.14.1 when strict POSIX.1-2017 is claimed. Evidence from bash 5.2 `--posix`, `zsh --emulate sh` or the author's `/bin/sh` never counts.
- *Why.* The `/bin/sh` of 12 of 21 images accepts bashisms that dash rejects; bash 5.2 `--posix` accepts arrays, `${x,,}`, `<( )`, `[[ ]]` and `function` and exits 0 where dash and ash exit 2 and posh 1. [FL §10, §14, V13]
- *Verify.* `matrix.sh posix SCRIPT`: every dash, ash, mksh, posh and `--posix` row exits 0 with the same output; plus ShellCheck `-s sh` (SH-DIAL-02).
- *Watched red.* Yes. FL V13: `bashisms-twin.sh` dash 2, ash 2, posh 1, mksh 1, ksh93 3, bash 5.2 `--posix` 0 (the false green). X4: the installer prologue exits 0 with identical output on 11 of 11.
- *Scope.* INST, RC, LIB shell=sh, EMIT sh targets; macOS/FreeBSD `sh` unverified: read only.

**SH-DIAL-25 · MUST.** A bash script that needs more than 3.2 carries `# bash-floor: X.Y` in lines 2 to 8 and starts with a 3.2-parsable guard as its first executable statement, outside any function, `if` or `{ }`, that writes one line to stderr and exits **69** with empty stdout. Major-version floor: `[ "${BASH_VERSINFO:-0}" -ge N ] || { printf ...; exit 69; }` (T3 prologue). Minor-version floor: `case ${BASH_VERSION-} in '' | [0-3].* | 4.[01].*) ... exit 69 ;; esac`. Array indexing (`${BASH_VERSINFO[0]}`) never appears in a guard.
- *Why.* Without the guard 3.2 prints errors and continues with wrong data (T2). The guard must come first because bash parses a whole compound command before running it: a guard inside `main()` that also holds `[[ -v ]]` never runs. The scalar and `case` forms parse on every interpreter measured; the array form dies on dash and ash. A marker `# bash-floor: 3.2 guarded` declares a script whose 4+ constructs sit only in untaken runtime branches (SH-DIAL-27). Re-exec into Homebrew bash before refusing is allowed (`BV/guard-first-reexec.sh`: prints the 5.3.20 banner and exits 0 with the binary mounted, exits 69 without). [BV F2, F4]
- *Verify.* A run of the script on `bash:3.2`: `docker run --rm -v "$PWD:/w:ro" -w /w bash:3.2 bash ./script` must exit 69, stdout empty, `needs bash` on stderr (`BV/guard-gate.sh`); the marker is found by `files | xargs -0 -r grep -l '^# bash-floor: '`.
- *Watched red.* Yes. X3: scalar guard exit 69 on 3.2, 4.0, 4.2, 4.4 and on 10 of 11 interpreters, `ok count=2` on 5.0 to 5.3; array guard exit 2 on dash and ash x2; guard in `main()` exit 2 on 3.2 and 4.0; `declare -A` before the guard exit 2 on 3.2. BV V5: five misplaced guards FAIL, three correct ones PASS. Fleet: 0 guards (git-tracked authored files).
- *Scope.* TOOL, CI, LIB shell=bash; bash 3.2.57 to 5.3.20.

**SH-DIAL-26 · MUST.** A sourced library with a raised bash floor has no shebang, `# shellcheck shell=bash` on line 1, `# bash-floor: X.Y` on line 2, the POSIX `case ${BASH_VERSION-}` guard, and ends the refusal with `return 69 2>/dev/null || exit 69`, never a bare `exit`. The `exit` fallback carries `# shellcheck disable=SC2317 # exit is the fallback when the file is executed, not sourced`.
- *Why.* A bare `exit` in a sourced file ends the user's interactive shell; an unguarded 4.2 construct in one function drops that function and every later definition on 3.2 (`source rc=1`, `lib_after: MISSING`, BV V13). ShellCheck 0.11.0 reports SC2317 (note) on all four syntactic spellings of the refusal (X5), so the per-site directive is the only way to a clean lint.
- *Verify.* Source the library from a caller on `bash:3.2` (`guard-lib2-caller.sh`): `source rc=69`, caller alive; ShellCheck exit 0 on the library.
- *Watched red.* Yes. X5: bash 3.2 and 4.0 rc 69 with the caller surviving, 4.2 to 5.3 rc 0; executed under bash 3.2 and dash rc 69; zsh sourced rc 69; 4 of 4 spellings SC2317 without the directive, 0 with it. BV V13 is the red for the unguarded library.
- *Scope.* LIB, RC; bash 3.2 to 5.3, dash and zsh as callers. SH-GATE-07 needs one allow-table row for this SC2317 (see "Applied").

**SH-DIAL-27 · MUST.** Only constructs that fail at run time may sit in the untaken branch of a `BASH_VERSINFO` test: `declare -A`, `local -A`, `mapfile`, `${x,,}`, `${x@Q}`, `${ cmd; }`, `shopt -s ...`. Parse-time constructs never may: `[[ -v x ]]`, `|&`, `&>>`, `coproc`, `;;&`, an unparenthesised case pattern in `$( )`. The CI job that enforces SH-DIAL-06 runs a no-side-effect path of every unmarked script on the `bash:3.2` image and requires exit 0.
- *Why.* `guard-branch-ok.sh` (`if [ "${BASH_VERSINFO[0]:-0}" -ge 4 ]; then printf '%s\n' "${1,,}"; else ... tr ...; fi`) prints `abc` on 3.2, 4.1, 4.2 and 5.3; with `[[ -v $1 ]]` in the untaken branch the same file exits 2 on 3.2 and 4.1. `bash -n` is not the check (conflict 6). [BV F4]
- *Verify.* `docker run --rm -v "$PWD:/w:ro" -w /w bash:3.2 bash ./scripts/x.sh --help` exits 0 with the same output as the 5.x run. That the job definition contains `bash:3.2` and the d06 command is a reading heuristic on the job file and was not watched red; each component run is.
- *Watched red.* Yes for the component runs: BV V5e (`guard-branch-bad.sh` exit 2), `guard-branch-ok.sh` exit 0 on four versions; `omp.bash:34` (`[[ -v MC_SID ]]`) fails `bash -n` on bash:3.2 at line 34.
- *Scope.* TOOL, CI, LIB shell=bash; bash:3.2 (3.2.57, Alpine userland, so BSD userland is not covered).

**SH-DIAL-28 · SHOULD.** Configure away the silent bash drift. Before any `${v/pat/rep}` or `${v//pat/rep}` whose replacement text contains `&` or comes from data, put `shopt -u patsub_replacement 2>/dev/null || :` (or build the string with `%%` and `#` splits, or `sed`). Never set `BASH_COMPAT` or `shopt -s compatNN` to pin behaviour. Probe an option instead of assuming it: `shopt -s inherit_errexit 2>/dev/null || :`; never `shopt -s lastpipe` or `globstar` on a 3.2 floor.
- *Why.* `${y/b/[&]}` is `a[&]c` on 3.2 to 5.1 and `a[b]c` on 5.2 and 5.3, with no error; no in-pattern spelling is identical on 3.2 to 5.3, `shopt -u patsub_replacement` first gives `a[&]c` on all five tested versions. `BASH_COMPAT=32` on 5.3 rejects none of `declare -A`, `${s,,}`, `mapfile`, `[[ -v ]]`, `${x@Q}` and leaves patsub, globskipdots and errexit unchanged; `compat50` and `compat51` do not exist. A bare unknown `shopt -s` returns 1 and kills a `set -e` script on 3.2 to 4.3; `lastpipe` leaves the variable empty on 3.2 to 4.1. [BV F8, F10, F11]
- *Verify.* d06 covers the bare shopts, `BASH_COMPAT` and a literal `&` in a replacement; behaviour: `VERSIONS="5.1 5.2" ./vrun.sh patsub.sh` differs in rows 1, 3, 7 and `patsub-safe.sh` is identical on five versions. The `&` that arrives in a variable is invisible to grep: SHOULD, not MUST.
- *Watched red.* Yes. BV V8; X1 (the bvg plant files). 
- *Scope.* TOOL, CI; bash 3.2 to 5.3; 5.3 NEWS lets a distro compile `patsub_replacement` differently, so detect by behaviour if it matters. Cross-owned and not repeated: errexit statement drift SH-ERR-14 and -06, `set -u` expansions SH-ERR-12 and SH-EXP-20, dot globs SH-EXP-15.

#### D. Reading heuristic

**SH-DIAL-23 · SHOULD.** A floor table names the image or version and the date on every row, uses the six columns `ID | Rule | Rationale | Verification | Severity | Floor / shell`, and cites the `matrix.sh` run.
- *Why.* A version string does not identify features (dash 0.5.12-2 versus -12). T1 and T3 are the format. [FL §16]
- *Verify.* Reading heuristic: every row has an image or version and a date. Not watched red.
- *Scope.* Rule and doc text.

### SH-USER

#### A. Caught by the denylist (check u01)

```sh
c_u01() { b='(^|[^[:alnum:]_.-])'; files | xargs -0 -r grep -HnE \
  -e "${b}sed[[:space:]].*-i([[:space:]]|\$)" \
  -e "${b}sed[[:space:]].*-z" \
  -e "${b}readlink[[:space:]]+-[A-Za-z]*[fm]" \
  -e "${b}realpath[[:space:]]+-[A-Za-z]*[ms]" \
  -e "${b}realpath[[:space:]].*--relative-" \
  -e "${b}date[[:space:]]+(.*[[:space:]])?-[dv]" \
  -e "${b}date[[:space:]].*-r[[:space:]]+[0-9]" \
  -e "${b}stat[[:space:]]+(.*[[:space:]])?-c" \
  -e "${b}stat[[:space:]]+-f[[:space:]]" \
  -e "${b}grep[[:space:]]+-[A-Za-z]*P" \
  -e "${b}grep[[:space:]].*--(include|exclude|exclude-dir)=" \
  -e "${b}find[[:space:]].*-printf" \
  -e "${b}mktemp[[:space:]].*(--suffix|--tmpdir|-t[[:space:]])" \
  -e "${b}head[[:space:]]+-n[[:space:]]*-[0-9]" \
  -e "${b}cut[[:space:]].*--complement" \
  -e "${b}tar[[:space:]].*--(exclude-vcs|owner|sort|zstd)" \
  -e "${b}cp[[:space:]].*--parents" \
  -e "${b}ls[[:space:]].*--color" \
  -e "${b}base64[[:space:]].*-D" \
  -e '--version.*grep' \
  -e '(^|[;&(]|[$][(]|then[[:space:]])[[:space:]]*which[[:space:]]' \
  -e 'echo[[:space:]]+-e' \
  | grep -v -e ':[0-9]*:[[:space:]]*#' -e 'command -v' -e 'userland-ok:[[:space:]]*[^[:space:]]'; }
```

The command prints `file:line:text` for each hit; comment lines, lines with `command -v` and lines waived with a reason are dropped. The word boundary is `(^|[^[:alnum:]_.-])` before the command name: without it the check flagged `transactional-update --no-selfupdate -d run` and `mystat -c file` (UF V1b, fixed). A command variant that hides the call behind a variable is invisible; the busybox-safe `find DIR -type f -name GLOB -exec grep ... {} +` form of this scan ran red on five userlands (UF V2).

**SH-USER-01 · MUST.** Use no GNU-only or BSD-only external-command form without a probe or a `# userland-ok: <reason>` on the same line. The forms are in T4.
- *Why.* Of 105 probes on 21 images only 11 forms are universal; each other form loses 1 to 4 images, and busybox 1.37 alone rejects 20. Default ShellCheck 0.11.0 reports 1 of 18 planted GNU-isms (`echo -e`, SC3037); `-o all` adds only `which` (SC2230). So a portability rule needs a catalog check. [UF Summary, V6b, V6c]
- *Verify.* u01 above.
- *Watched red.* Yes. X1: 37 plant lines, 0 on the twin (31 are the dive's plant; the extra 6 are the which, banner, mktemp and waiver fixtures); UF V1, V1b, V2. Fleet: 28 lines in 6 trees (see "Applied"), 1 false positive (`which ocx` is the nu builtin inside a heredoc, `www-setup@a251c3631047:tests/docker/activate.sh:237`).
- *Scope.* TOOL, CI, INST, EMIT; GNU coreutils 8.22 to 9.12, uutils 0.2.2 and 0.10.0, busybox 1.37, Git Bash 5.2.15. BSD column: unverified: read only.

**SH-USER-02 · MUST.** Edit in place with `sed -i.bak EXPR f && rm -f f.bak`, or write to a temp file and `mv`. Never `sed -i ''` and never a bare `sed -i`.
- *Why.* GNU sed 4.9 on `sed -i '' ...` exits 2 ("can't read s/alpha/beta/"), busybox exits 1, the file is unchanged; BSD sed takes the argument after `-i` as the suffix (`apple-sed-main.c:163`: `inplace = optarg`; unverified: read only), so a bare `-i` eats `-e`. The `.bak` form returned `rc=0 content=beta` on Ubuntu 24.04, Ubuntu 26.04 and Alpine 3.22. [UF F2]
- *Verify.* u01 (patterns `sed ... -i` followed by space or end of line; `-i.bak` is not matched).
- *Watched red.* Yes. X1: plant lines `sed -i 's/a/b/' file` and `sed -i '' ...`; UF V1. Fleet: 2 violations, `ocx@eb1530fe48b4:test/manual/scripts/setup-integrations.sh:79`, `test/manual/scripts/bootstrap.sh:138`.
- *Scope.* TOOL, CI, INST.

**SH-USER-03 · MUST.** Resolve a path with a helper that tries `realpath`, then `readlink -f`, then a `cd -P` and `readlink` loop. Never `readlink -m` or `realpath -m/-s/--relative-to`.
- *Why.* `readlink -f` of an existing file and plain `realpath` work on 21 of 21 images; `-m`, `-s` and `--relative-to` fail on busybox 1.37. POSIX.1-2024 has `readlink [-n]` and `realpath [-E|-e]` only; macOS gained `readlink -f` in 12.3 and `realpath` in 13.0 (unverified: read only). [UF F2, F7; FL §8]
- *Verify.* u01 (`readlink -[fm]`, `realpath -[ms]`, `--relative-`); behaviour: the helper library test (`UF/userland-lib-test.sh`) passes on 21 images and 11 shells with `realpath_chain=ok realpath_dir=ok realpath_missing_last=ok`, and the forced-fallback run (functions hide `realpath`, `readlink -f`, `timeout`) passes under dash, mksh and bash.
- *Watched red.* Yes. X1: `readlink -f`, `-m`, `realpath -m`, `--relative-to` plant lines; helper tests green everywhere. Fleet: `ocx-mirror@71bb1c2953ba:test/bazel_accept.sh:26,52` (bare `readlink -f`, low: macOS 12.3 and later has it).
- *Scope.* TOOL, CI, INST (FL SH-DIAL-14 retired into this rule).

**SH-USER-04 · SHOULD.** Use `command -v NAME`, never `which`.
- *Why.* `which` is absent on 8 of 21 images (Alma 8/9/10, AL2, AL2023, Arch, Fedora, Leap); `command -v` works on 21 of 21. ShellCheck's SC2230 is optional. [UF F1, F7]
- *Verify.* u01 (`which` after a line start, `;`, `&`, `(`, `$(` or `then`); `shellcheck -s sh -o deprecate-which FILE` (SC2230).
- *Watched red.* Yes. UF V6: exit 1 with `-o deprecate-which`, exit 0 on the same plant at default options; X1: `which curl` plant line. Fleet: 0 real hits.
- *Scope.* All kinds.

**SH-USER-05 · MUST.** Never choose a code path by parsing a tool's `--version` banner or its stderr text. Probe the behaviour.
- *Why.* Error text differs on 30 to 37 of 304 cases between GNU 9.4 and uutils (`unrecognized option` versus clap's `unexpected argument ... found`); `sort --version` prints `sort (uutils coreutils) 0.10.0`; busybox grep, sort, date and awk reject `--version`; `dash --version` does not exist. [UF F4]
- *Verify.* The `--version.*grep` pattern of u01 catches banner parses; stderr-text parsing is a reading heuristic.
- *Watched red.* Banner pattern: yes, X1 and UF V1. Fleet: 2 violations, `www-setup@a251c3631047:src/install.sh:320` (`curl --version 2>&1 | head -1 | grep -qF 'snap'`) and `tests/install/helpers/server.bash:347` (`wget --version 2>&1 | head -n 1 | grep -q 'GNU Wget'`).
- *Scope.* All kinds.

**SH-USER-11 · SHOULD.** Create temp paths with `mktemp -d "${TMPDIR:-/tmp}/name.XXXXXX"`: six X, no suffix, no `-t`, no `--tmpdir`. Honour `TMPDIR` for large staging.
- *Why.* It is the one template GNU, busybox and uutils all accept (identical mode 700/600, `TMPDIR` honoured, a missing `TMPDIR` directory is an error with no fallback to `/tmp`); a suffix after the X's or fewer than six X's fails on busybox, no X fails on 21 of 21. Debian 13 mounts `/tmp` as tmpfs, up to 50% of memory. [UF F6]
- *Verify.* The `mktemp` patterns of u01; behaviour `mktemp-contract.sh` on Ubuntu 24.04, Ubuntu 26.04 and Alpine 3.22.
- *Watched red.* Yes for the patterns (X1: `--suffix`, `--tmpdir`, `-t foo` plant lines); the contract is a measurement.
- *Scope.* All kinds; cleanup on signals is SH-ERR-15 and -16.

#### B. Caught by the probe, argument and waiver checks

**SH-USER-06 · MUST.** Probe a tool that is absent somewhere before using it: `timeout`, `flock`, `sha256sum`, and `curl`/`wget`, `find`, `xargs`, `tar`. A file that calls `timeout`, `flock` or `sha256sum` contains a `command -v` probe or a `# userland-ok: <reason>`. Treat `timeout` statuses 124, 137 and 143 as timed out.
- *Why.* `flock` is absent on AL2, AL2023, nixos/nix and Git Bash; `find` and `xargs` on AL2023 and Leap; `tar` on AL2 and AL2023; `sha256sum` is on 21 of 21 Linux images but `shasum` on none and macOS has the reverse (unverified: read only). Busybox `timeout` exits 143, uutils `timeout -s KILL` exits 124 where GNU 9.4 gives 137 (POSIX leaves it unspecified). [UF F1, F4, F7; FL §8]
- *Verify.* u06: `files | xargs -0 -r grep -lE -e '^[[:space:]]*(timeout|flock|sha256sum)[[:space:]]' -e '[;&(][[:space:]]*(timeout|flock|sha256sum)[[:space:]]' -e '[$][(](timeout|flock|sha256sum)[[:space:]]' | tr '\n' '\0' | xargs -0 -r grep -L -e 'command -v' -e 'userland-ok:[[:space:]]*[^[:space:]]'`. File-level: one `command -v` anywhere clears the file.
- *Watched red.* Yes. X1: 2 plant files, 0 on the twin; UF V4. Fleet: 4 files, `ocx@eb1530fe48b4:test/doc_scripts/package-layer-reuse.sh:12`, `test/manual/announce-e2e/scripts/run_sequence.sh:171`, `index@9eba2cc3929b:scripts/golden-baseline.sh:176`, `setup-grimoire@1259e35b2550:.github/scripts/install.sh:98-99` (`sha256sum ... | awk ... || shasum ...`; the fallback fires only because the file sets `set -euo pipefail`, line 9).
- *Scope.* INST (MUST), CI, TOOL; model: `nvm@b1b3a0038...:.github/scripts/docker-image.sh:17-20`, `rustup:ci/prepare-deploy.bash:11-13`, `rules/swift-quality/checks/tsan-check.sh:24`.

**SH-USER-07 · MUST for INST and shipped catalog checks; SHOULD for dev tooling.** Probe or declare every use of `rg`, `jq`, `python3`, `git` and `perl`: `command -v jq >/dev/null 2>&1 || die 69` at the top, or `# userland-ok: requires jq (declared in <where>)`.
- *Why.* Base images: `rg` 0 of 21, `jq` 0, `git` 1, `python3` 3, `perl` 9; awk is the only scripting tool on 20 of 21. [UF F1]
- *Verify.* u07: `files | xargs -0 -r grep -HnE -e '^[[:space:]]*(rg|jq|python3)[[:space:]]' -e '[;&(][[:space:]]*(rg|jq|python3)[[:space:]]' -e '[$][(](rg|jq|python3)[[:space:]]' | grep -v -e ':[0-9]*:[[:space:]]*#' -e 'command -v' -e 'userland-ok:[[:space:]]*[^[:space:]]'`.
- *Watched red.* Yes. X1: 3 plant lines (`rg`, `jq`, `python3`), 0 on the twin; UF V9. Fleet: 30 lines in 2 trees (ocx 23, index 7), all dev tooling.
- *Scope.* INST, TOOL (shipped checks), CI; the exempt dev scripts need the declaration, not a rewrite.

**SH-USER-08 · MUST.** Every `xargs` carries `-r` (or `--no-run-if-empty`).
- *Why.* GNU findutils, busybox 1.37 xargs and the Ubuntu 26.04 build run the command once on empty input (X7, 4 of 4 images, and UF `xargs_noR_empty` `DIFF[X]` on all 19 images that have xargs). `-r` is in POSIX.1-2024 and a no-op on BSD (unverified: read only). `-I{}` already skips empty input (X7); the check still asks for `-r`, which is harmless there. [FL §7; UF F2]
- *Verify.* u08: `files | xargs -0 -r grep -nE -e '(^|[|;&(])[[:space:]]*xargs([[:space:]]|$)' | grep -v -E -e ':[0-9]+:[[:space:]]*#' -e 'xargs([[:space:]]+-[^[:space:]]+)*[[:space:]]+-[^[:space:]]*r' -e '--no-run-if-empty' -e 'userland-ok:[[:space:]]*[^[:space:]]'`.
- *Watched red.* Yes. X1: 4 plant lines (`xargs rm -f` after `-0`, `xargs rm`, `-n1`, `xargs rm -rf`), 0 on the twin (`xargs -r -0`, `xargs -0 -r`). An earlier exemption `grep -v -e '-r'` wrongly passed `xargs rm -rf`; the final regex requires `-r` as an xargs option. A comment mentioning "(xargs folds ...)" in `rules/swift-quality/checks/never-gate.sh:8` was a false positive until comment lines were dropped.
- *Scope.* All kinds; exit 123 is xargs reporting a child failure, so a check that ends in `xargs ... grep -L` is judged by output.

**SH-USER-09 · MUST.** Put `LC_ALL=C` as a per-command prefix on each order-observable `sort`, `comm`, `join` (and an `ls` whose order is captured). Do not `export LC_ALL=C` in a script that handles UTF-8 text.
- *Why.* uutils 0.10.0 uses ICU collation for any `*.UTF-8` or `*.utf8` locale name even when that locale is not installed, where GNU 9.4 silently falls back to bytes; on Ubuntu 26.04 (the `ubuntu-latest` image from November 2026) `LANG=en_US.UTF-8` sorts `a A b B` (T6). A blanket export changes `${#x}`, `wc -m`, `awk length` and `cut -c` on UTF-8 text. [UF F5]
- *Verify.* u09: `files | xargs -0 -r grep -HnE -e '^[[:space:]]*(sort|comm|join)[[:space:]]' -e '[^[:alnum:]_./-](sort|comm|join)[[:space:]]' | grep -v -e ':[0-9]*:[[:space:]]*#' -e 'LC_ALL=C' -e 'userland-ok:[[:space:]]*[^[:space:]]'`; behaviour `sh sort-locale.sh` (exit 1 on 26.04 when it differs from C).
- *Watched red.* Yes. X1: 5 plant lines, 0 on the twin; UF V7: ubuntu:24.04 exit 0 (bytes), ubuntu:26.04 exit 1, pinned run exit 0 on both; V7b: GNU 9.4 with `locales` installed also differs. Fleet: 6 lines in 5 trees, 1 false positive.
- *Scope.* TOOL, CI, INST; GNU 9.4 and uutils 0.10.0. A `sort -u | wc -l` count is order-independent: waive it with a reason.

**SH-USER-10 · MUST for INST and bootstrap; SHOULD elsewhere.** Probe the flags before passing `--https-only` or `--secure-protocol` to wget: `wget --help 2>&1 | grep -q -e '--https-only'`, or prefer curl and reach wget only after the probe.
- *Why.* busybox 1.37.0 wget answers `unrecognized option: https-only` and `unrecognized option: secure-protocol=TLSv1_2` (X9); `curl` is on 9 of 21 base images, `wget` on 4, neither on the 9 Debian and Ubuntu images. rustup's `check_help_for` is the model (`rustup-init.sh:766`, used at `:710,742,826,828,865,895,900`). [UF F3, F7]
- *Verify.* u10: `files | xargs -0 -r grep -lE -e 'wget[^|;&]*--(https-only|secure-protocol)' | tr '\n' '\0' | xargs -0 -r grep -L -e 'wget --help' -e 'userland-ok:[[:space:]]*[^[:space:]]'`.
- *Watched red.* Yes. X1: 1 plant file, 0 on the twin; X9; UF F13 #2: `www-setup` `src/install.sh` on `alpine:3.22` with `--network none` prints the busybox usage and exits 3. Fleet: 4 files, `www-setup@a251c3631047:src/install.sh:352,354` and the three copies of the served installer, `grimoire@4650ad830375:docs/public/install.sh:29`, `grimoire-duo@c045c195abd2:docs/public/install.sh:29`, `setup-grimoire@1259e35b2550:site/sh:29` (they try curl first, so only Alpine without curl is hit).
- *Scope.* INST; busybox 1.37.0.

**SH-USER-16 · SHOULD.** A userland waiver is `# userland-ok: <reason>` on the same line as the construct. A bare `userland-ok` or an empty reason is a defect.
- *Why.* The waiver replaces a probe; without a reason it silences SH-USER-01, -06 to -10 for good.
- *Verify.* u16: `files | xargs -0 -r grep -nE -e 'userland-ok([^:]|$)' -e 'userland-ok:[[:space:]]*$'`.
- *Watched red.* Yes. X1: 2 plant lines, 0 on the twin (`DC/waiver/`). Fleet: 0 (the marker is new).
- *Scope.* All kinds.

#### C. Measured, no static check

**SH-USER-12 · SHOULD.** Replace a file atomically by creating the temp file in the destination's directory and then `mv` it onto the name: `tmp=$(mktemp "$(dirname "$dest")/.name.XXXXXX")`.
- *Why.* A cross-file-system `mv` is copy and unlink: a reader saw 1966080 of 419430400 bytes at the destination mid-move and the inode changed; `ln` across the boundary fails (`xdev-mv.sh`, tmpfs at `/mnt/t`). Debian 13's tmpfs `/tmp` makes this the default case. [UF F6]
- *Verify.* Measurement only; reading heuristic: a `mv` from `$TMPDIR` to another directory.
- *Watched red.* Measurement (partial size and inode change), not a plantable check.
- *Scope.* TOOL, CI, INST.

**SH-USER-13 · CONSIDER.** In awk use `sub`, `gsub`, `substr`, `index`, `split`, `printf`; probe `gensub`, `strftime`, ERE intervals `{n}` and `length(array)`.
- *Why.* mawk is the awk on 9 of 21 images; `gensub` fails on all 9, old mawk (Debian 11/12, Ubuntu 20.04/22.04) rejects `/a{3}/`. `nextfile` and `length(arr)` are in POSIX.1-2024 awk (not re-checked). [UF F8]
- *Verify.* The `awk_*` rows of `gnuisms.sh`; no static check was written.
- *Watched red.* Measurement only.
- *Scope.* TOOL, INST; relaxes when Debian 11/12 and Ubuntu 20.04/22.04 leave support.

**SH-USER-14 · SHOULD.** Default every possibly-absent variable before use: `${USER:-$(id -un)}`, `${TMPDIR:-/tmp}`, `${XDG_CONFIG_HOME:-$HOME/.config}`. In sh never use `$UID`, `$EUID`, `$HOSTNAME`, `$OSTYPE`; never `set -u` before defaulting.
- *Why.* In a bare container only `HOME`, `HOSTNAME`, `PWD`, `PATH` are set; `USER`, `LOGNAME`, `SHELL`, `TMPDIR`, `XDG_*`, `LANG`, `LC_ALL`, `TERM`, `CI` are not; `$UID` is empty under dash. [UF F12]
- *Verify.* `envvars.sh` inside Ubuntu 24.04, Ubuntu 26.04 and Alpine 3.22 containers; reading heuristic.
- *Watched red.* Measurement only.
- *Scope.* INST, CI, TOOL.

**SH-USER-15 · CONSIDER.** Under Git Bash do not rely on `ln -s`, `chmod 600`, case-sensitive names or LF output from native tools; call `cmd` as `cmd //c` (conversion on) or `MSYS_NO_PATHCONV=1 cmd /c` (conversion off), never both.
- *Why.* Git Bash 5.2.15 on the Windows host: `cmd /c echo hi` hangs (rc 124 under a 5 s bound), `cmd //c echo hi` prints `hi`, `MSYS_NO_PATHCONV=1 cmd //c` prints the banner; `ln -s` copies without the symlink privilege; `chmod 600` leaves 644; native tools emit CRLF through pipes. [UF F10; SH-CI-14 owns the CI step]
- *Verify.* `msys.sh` on the Windows host only; not portable to a runner.
- *Watched red.* Host measurement.
- *Scope.* TOOL, CI on `windows-*`; Git Bash 5.2.15 (5.3.15 on `windows-2025`).

### Retired and cross-owned

| Dive item | Fate | Where |
|---|---|---|
| FL SH-DIAL-13 (`find -print0`, `xargs -0/-r` in sh) | verdict row in T1, plus | SH-USER-08, SH-EXP-14 |
| FL SH-DIAL-14 (`readlink -f`, `realpath -m`) | retired | SH-USER-03 |
| FL SH-DIAL-15 (`timeout` 124/137/143) | retired | SH-USER-06; status handling SH-ERR-18, -19 |
| FL SH-DIAL-16 (`test -nt/-ot/-ef`) | verdict row in T1 (CONSIDER) | T1 |
| FL SH-DIAL-19 (evidence from dash, not bash `--posix`) | merged | SH-DIAL-04 |
| FL SH-DIAL-20 (function names) | merged | SH-DIAL-02 (SC3033, SC2112, SC2113), SH-EXP-10 |
| FL SH-DIAL-24 (no version strings) | merged | SH-DIAL-07 *Why*, T1 |
| BVG-01, -02, -16, -17 | merged | SH-DIAL-06 (denylist, SC2207 loop, `$(case)` pattern) |
| BVG-03, -04, -08 | merged | SH-DIAL-25 |
| BVG-07 | merged | SH-DIAL-26 |
| BVG-05, -06, -20 | merged | SH-DIAL-27 |
| BVG-12, -14, -15, -18, -19 | merged | SH-DIAL-28 and the d06 patterns |
| BVG-09, -10 (errexit statements, predicates) | cross-owned | SH-ERR-14, SH-ERR-06 |
| BVG-11 (`"${@}"`, empty arrays under `set -u`) | cross-owned | SH-ERR-12, SH-EXP-20 |
| BVG-13 (dot globs) | cross-owned | SH-EXP-15 |
| UF R7 (temp-file traps) | cross-owned; e16a and e16b run here only as a cross-check | SH-ERR-15, -16, -28 |
| UF R11 (`cmd //c`) | split | SH-CI-14 (CI step), SH-USER-15 (host facts) |
| UF R13 (a check ending in a pipe needs a canary) | cross-owned | SH-ERR-24 |
| UF R1 to R6, R8 to R10, R12, R14, R15 | renumbered | SH-USER-01 to -07, -09, -10, -12, -13, -14 |

## Applied to the fleet and exemplars

Fleet trees at HEAD on 2026-10-11: `ocx@eb1530fe48b4`, `grimoire@4650ad830375`, `index@9eba2cc3929b`, `www-setup@a251c3631047`, `setup-grimoire@1259e35b2550`, `ocx-mirror@71bb1c2953ba`, `grimoire-vscode@b4f7ca3bf9f9`, `grimoire-duo@c045c195abd2`, `grimoire-lore@88d5e14cb616` (this worktree). Scope: git-tracked and untracked-unignored shell files found by `shfmt -f`, minus `external/` (vendored bats-core, and the `external/ocx` submodule in ocx-mirror), `.agents/` (research scratch: grimoire-lore raw counts are inflated by it) and `**/fixtures/**` (X2). Counts are hit lines, except d01, d03, d21, u06, u10 which count files.

| Tree | Authored sh files | d03 | d06 | d21 | d22 | u01 | u06 | u07 | u09 | u10 |
|---|---|---|---|---|---|---|---|---|---|---|
| ocx | 123 | 123 | 9 | 0 | 1 | 11 | 2 | 23 | 1 | 0 |
| grimoire | 14 | 14 | 0 | 0 | 1 | 1 | 0 | 0 | 1 | 1 |
| index | 3 | 3 | 1 | 0 | 1 | 0 | 1 | 7 | 2 | 0 |
| www-setup | 21 | 21 | 0 | 0 | 0 | 3 | 0 | 0 | 1 | 1 |
| setup-grimoire | 8 | 8 | 0 | 1 | 0 | 0 | 1 | 0 | 0 | 1 |
| ocx-mirror | 2 | 2 | 0 | 0 | 0 | 10 | 0 | 0 | 0 | 0 |
| grimoire-vscode | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| grimoire-duo | 10 | 10 | 0 | 0 | 1 | 1 | 0 | 0 | 1 | 1 |
| grimoire-lore | 9 | 9 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 |
| total | 190 | 190 | 10 | 1 | 5 | 28 | 4 | 30 | 6 | 4 |

d01, d07, d09, d10, d11, d12, d17, d18, u08 and u16 are 0 in all nine trees. Cross-check, not this document's rules: e16b (returning handler) prints 8 lines (`www-setup` 5, `grimoire` 1, `setup-grimoire` 1, `grimoire-duo` 1), the SH-ERR-16 fleet rows; e16a prints 0.

### Satisfied

- **SH-DIAL-07, -09, -10, -11, -12, -17, -18 (sh-scope rules) hold in the whole authored fleet:** 0 hits in 190 files across nine trees (X2). The only `local` in an sh script is probed: `www-setup@a251c3631047:src/install.sh:5,37-40`.
- **SH-DIAL-05:** no git-tracked authored file uses `#!/bin/bash`.
- **SH-DIAL-06 in spirit:** `setup-grimoire@1259e35b2550:.github/scripts/install.sh:94-96` replaces `${expected,,}` with awk `tolower` and says why (the macOS runner's `/bin/bash` is 3.2); `ocx@eb1530fe48b4:test/manual/measure-index-clone.sh:78-81` guards `${EPOCHREALTIME:-0}` with a `systime()` fallback (a true d06 hit that wants the marker `# bash-floor: 3.2 guarded`).
- **SH-USER-01:** `ocx@eb1530fe48b4:.claude/scripts/statusline.sh:31-33` pairs `date -d "@$epoch"` with `date -r "$epoch"` and `return 1` (copies in `grimoire` and `grimoire-duo`); u01 prints them, so they take a `# userland-ok: GNU/BSD date pair` waiver.
- **SH-USER-08:** 0 violations; `grimoire-lore@88d5e14cb616:rules/swift-quality/checks/generated-touch.sh:21`, `k07.sh:73` use `xargs -r -0`.
- **SH-USER-06:** `rules/swift-quality/checks/tsan-check.sh:24` guards `timeout` with `command -v` and exits 69 on absence [UF F13].
- **Exemplars:** `bats-core@0c92eb4c418d:bin/bats:8-15` (guard first, bash 3.2 floor, message and exit before any `[[`); `pyenv@d28b750767d4:libexec/pyenv-rehash:139-141` and `git@6de20f6092dc:contrib/completion/git-completion.bash:2917-2921` (runtime-only constructs in a `BASH_VERSINFO` branch, SH-DIAL-27); `shellspec@f2d13f991885:helper/spec_helper.sh:17-23` (the pipefail probe with the SC3040 disable); `rust-lang/rustup:rustup-init.sh:13-23,766` (the `local` probe and `check_help_for`); `k3s-io/k3s:install.sh:878,888` (`xargs -r`); `git@6de20f6092dc:tools/generate-cmdlist.sh:33` (`LC_ALL=C sort -u`); `nvm@b1b3a0038...:.github/scripts/docker-image.sh:17-20` (sha256 fallback).

### Violated

| Rule | Where | Effect |
|---|---|---|
| SH-DIAL-03 | all 190 authored files lack the header (d03 = 190) | no declared kind or floor anywhere; the highest-count finding, low individual risk |
| SH-DIAL-06 | `ocx@eb1530fe48b4:test/manual/announce-e2e/scripts/run_sequence.sh:219` (`local -A`), `:231,295,361` (`mapfile`), `:298` (`${tag,,}`); `clean_install_check.sh:44`, `run_machine_lane.sh:23,89` (`mapfile`); `index@9eba2cc3929b:scripts/golden-baseline.sh:250` (`local -A`, `set -euo pipefail`) | on 3.2: `local: -A: invalid option`, exit 2 mid-run; `mapfile: command not found` and `n=0`; `bash -n` on 3.2 exits 0 on the real file (BV F13); no `BASH_VERSION` guard in any of the five files |
| SH-DIAL-21 | `setup-grimoire@1259e35b2550:site/sh` | extensionless served bootstrap; legitimate if the header says so |
| SH-DIAL-22 | `.claude/rules/quality-bash.md:110` in `ocx@eb1530fe48b4`, `grimoire@4650ad830375`, `index@9eba2cc3929b`, `grimoire-vscode@b4f7ca3bf9f9`, `grimoire-duo@c045c195abd2`, and `.probe-libc@9ba675297610` (not in the nine-tree run) | the false "macOS `/bin/sh` is dash" sentence in six rule files |
| SH-USER-02 | `ocx@eb1530fe48b4:test/manual/scripts/setup-integrations.sh:79`, `test/manual/scripts/bootstrap.sh:138` | bare `sed -i "s\|...\|" file`; BSD sed reads the next argument as the suffix (unverified: read only) |
| SH-USER-03 | `ocx-mirror@71bb1c2953ba:test/bazel_accept.sh:26,52` | bare `readlink -f` (low: macOS 12.3 and later has it) |
| SH-USER-01 | `grimoire-lore@88d5e14cb616:rules/swift-quality/checks/k07.sh:56,65` (`grep -rn --include --exclude-dir`); `stat -c %a` in `ocx@eb1530fe48b4:.github/actions/bazel-cache-rc/selftest.sh:127,128,152,153,176,177,361,374` and the `ocx-mirror` copy `:133,134,158,159,182,183,367,380` | busybox grep has no such options; `stat -c` is GNU-only (BSD `stat -f %Lp`, unverified: read only); low, both are Linux-run checks |
| SH-USER-05 | `www-setup@a251c3631047:src/install.sh:320`, `tests/install/helpers/server.bash:347` | banner parse for snap curl and GNU wget; no behavioural probe |
| SH-USER-06 | `ocx:test/doc_scripts/package-layer-reuse.sh:12`, `ocx:test/manual/announce-e2e/scripts/run_sequence.sh:171`, `index:scripts/golden-baseline.sh:176`, `setup-grimoire:.github/scripts/install.sh:98-99` | `sha256sum` with no `shasum` fallback; the setup-grimoire fallback works only under `pipefail` and would give an empty digest without it (UF `pipe-fallback.sh`: `rc-shape: []`) |
| SH-USER-07 | `ocx@eb1530fe48b4:test/manual/announce-gitlab-e2e/scripts/run_gitlab_e2e.sh:86-144` (`jq`), `.claude/artifacts/e1_check.sh:12` and `test/doc_scripts/user-guide__toolchain-home-query.sh:23` (`python3`), `test/manual/scripts/show-integrations.sh:250,303,315`; `index@9eba2cc3929b:scripts/golden-baseline.sh:119-204`, `scripts/smoke-test.sh:381` | 30 lines of unprobed prerequisites in dev tooling (SHOULD grade) |
| SH-USER-09 | `index@9eba2cc3929b:scripts/smoke-test.sh:328,381`; `grimoire@4650ad830375:docs/theme_check.sh:44` and the `grimoire-duo` copy; `ocx@eb1530fe48b4:test/manual/announce-e2e/scripts/run_sequence.sh:272` (a `sort -u \| wc -l` count: waive) | order depends on the caller's `LANG` and on uutils on Ubuntu 26.04; `www-setup:tests/docker/activate.sh:209` is a fish snippet in a heredoc, a false positive |
| SH-USER-10 | `www-setup@a251c3631047:src/install.sh:352,354`; `grimoire@4650ad830375:docs/public/install.sh:29`; `grimoire-duo@c045c195abd2:docs/public/install.sh:29`; `setup-grimoire@1259e35b2550:site/sh:29` | busybox wget rejects the flags; curl is preferred, so only Alpine without curl fails |
| Exemplars | `oh-my-posh@b0a8acd4d402:src/shell/scripts/omp.bash:34,155` (`[[ -v ]]`, parse error on 3.2/4.0/4.1 inside a function, no guard), `:137,148` (`${prompt@P}`), `:173` (`${arr[-1]}`); `direnv@28a73d1df3f3:stdlib.sh:1404` (`local -A`); `acmesh-official__acme.sh@807da6498377:acme.sh:7387` (`$'\0'` under `#!/usr/bin/env sh`) | the failure cases the rules exist for |

### New commitments

1. **One driver, one file list.** `scripts/dialect-checks.sh` (the 19 SH-DIAL and SH-USER checks of `DC/final-checks.sh`, e16 excluded) is called by `scripts/shell-gate.sh` with SH-GATE-10 pathspecs and inherits SH-GATE-08's exits (69, 78, 79). Default severity: d03, d21 and u07 warn; the rest block.
2. **Headers by ratchet.** Add the T3 header to each new or changed file (`git diff --diff-filter=AM` against the base); the 190 existing files are a baseline, not a blocker.
3. **Fix the low-risk defects:** `sed -i.bak ... && rm -f` at the two ocx sites; a `wget --help` probe in the four installer copies; `command -v sha256sum` with the `shasum` and `openssl` fallbacks at the four sites; the realpath helper at `bazel_accept.sh`; delete the sentence at `quality-bash.md:110` in six repos.
4. **Pin or rewrite the bash-4 scripts.** Default: `# bash-floor: 4.4` plus the SH-DIAL-25 guard on `run_sequence.sh`, `clean_install_check.sh`, `run_machine_lane.sh` and `golden-baseline.sh`; `# bash-floor: 3.2 guarded` on `measure-index-clone.sh`.
5. **SH-GATE-07 gets one allow-table row:** SC2317 for the sourced-library refusal, reason `# exit is the fallback when the file is executed, not sourced` (SH-DIAL-26).
6. **Introduce the `# userland-ok: <reason>` waiver (SH-USER-16)** and apply it to `statusline.sh:31` and the `sort -u | wc -l` count.
7. **CI oracle matrix:** `bash:3.2` (shell floor, Alpine userland), `ubuntu:24.04` (GNU 9.4, mawk, dash), `ubuntu:26.04` (uutils 0.10.0, ICU collation), `alpine:3.22` (busybox 1.37, musl), `debian:12` (old mawk), `amazonlinux:2023` (no find, xargs, tar, which, flock), `amazonlinux:2` (coreutils 8.22). macOS stays read only until a host exists [UF F11].
8. **Amend SH-ERR-13's text** to carry the SH-GATE-07 reason on its SC3040 directive (conflict 4).

## AI-agent failure modes

Ranked by how often the model does it times how silent the damage is. Each row names the mechanical check.

| Rank | Failure | Why the model does it | Mechanical check |
|---|---|---|---|
| 1 | `declare -A`, `mapfile`, `${x,,}`, `[[ -v x ]]`, `&>>`, `\|&` in a `#!/usr/bin/env bash` script | training data is bash 5 on Linux; "bash" reads as "modern bash"; ShellCheck says "Prefer mapfile" (SC2207) and flags 0 of 47 | d06 (empty output); `bash:3.2` smoke run (SH-DIAL-06, -27) |
| 2 | Bashisms under `#!/bin/sh` that pass on the author's `/bin/sh` | 12 of 21 images' `/bin/sh` accept them | `matrix.sh posix` dash and ash rows; ShellCheck `-s sh` (SH-DIAL-02, -04) |
| 3 | GNU forms: `sed -i`, `readlink -f`, `date -d`, `stat -c`, `grep -P`, `grep --include`, `mktemp --suffix` | the sandbox is Debian or Ubuntu; ShellCheck reports 1 of 18 | u01 (SH-USER-01 to -03) |
| 4 | The version guard inside `main()`, after the first `declare -A`, or written with `${BASH_VERSINFO[0]}` | "top of the program" is read as inside the entry function | `bash:3.2` run must exit 69 with empty stdout; the array form exits 2 on dash and ash (SH-DIAL-25) |
| 5 | `sort` without `LC_ALL=C` | `LANG` is unset in the sandbox, so order looks right; breaks on a laptop and on Ubuntu 26.04 | u09 (SH-USER-09) |
| 6 | `$'\t'`, `read -d ''`, `[ a -a b ]`, `echo -e` in sh | POSIX.1-2024 headlines say "added", and the POSIX `find` page shows `read -rd ""` | d09, d10, d11, d12 (SH-DIAL-09 to -12) |
| 7 | Bare `set -o pipefail` or `... \|\| true` in sh; `set -euo pipefail` copied into `#!/bin/sh` | cargo-cult strict mode | d07; dash exit 2 (SH-DIAL-07) |
| 8 | Unprobed `timeout`, `sha256sum`, `rg`, `jq`, `python3`, wget TLS flags | the sandbox has them | u06, u07, u10 (SH-USER-06, -07, -10) |
| 9 | `xargs` without `-r` | GNU habit; harmless until the input is empty | u08 (SH-USER-08) |
| 10 | `#!/usr/bin/env bash -e`, `#!/bin/bash -euo pipefail`, or `env -S` as the "fix" | macOS-style multi-word shebang habits | d18; SC2096 (SH-DIAL-18) |
| 11 | Treats `bash --posix`, `zsh --emulate sh` or "ShellCheck is clean" as proof of portability | the names suggest it; ShellCheck master relaxes SC3040 and SC3003 | `matrix.sh posix`; keep d07 and d09 (SH-DIAL-04, -02) |
| 12 | Decides from `dash --version`, `sort --version \| grep GNU` or error text | assumes a version implies features | u01 banner pattern (SH-USER-05); no such flag on dash |
| 13 | Sets `BASH_COMPAT=32` "for macOS"; `${v/x/&}` with data | believes a compat level restricts features; pre-5.2 mental model | d06 patterns; `patsub-safe.sh` (SH-DIAL-28) |
| 14 | Repeats "macOS `/bin/sh` is dash" | stale fleet rule text | d22 (SH-DIAL-22) |
| 15 | A verification that ends in a pipe passes vacuously on busybox | `grep -r --include ... \| grep -v` returns "clean" when the first grep errors | plant canary in the same suite (SH-ERR-24); git-fed file list (conflict 5) |

## Open questions

Owner decisions, each with the default that applies unless overridden:

| # | Decision | Default |
|---|---|---|
| Q1 | Enforce the SH-DIAL-03 header on all 190 files, or ratchet? | Ratchet: new and changed files only |
| Q2 | The five bash-4 fleet scripts (SH-DIAL-06): pin with a guard, or rewrite to 3.2? | Pin with `# bash-floor: 4.4` and the guard; they are manual lanes and CI helpers |
| Q3 | Does "in POSIX.1-2024" make `find -print0`, `xargs -0 -r`, `timeout` portable for `#!/bin/sh`? | Yes for `-print0`/`-0`/`-r`; `timeout` stays probe-first |
| Q4 | Make `ubuntu:26.04` (uutils) a required leg of the oracle matrix before `ubuntu-latest` flips in November 2026? | Yes, informational until uutils 0.12 reaches an image, required after |
| Q5 | Allow a workflow-level `env: LC_ALL: C` in CI as a substitute for per-command pinning? | No: it changes `${#x}` and `wc -m` for UTF-8 steps; per-command only |
| Q6 | Add the SC2317 allow-table row to SH-GATE-07? | Yes |
| Q7 | Treat u07 (undeclared `jq`/`python3`) as warn for dev tooling, block for INST and shipped checks? | Yes |

Subareas that need another round:

- **BSD and macOS userland on a real macOS host:** run `UF/gnuisms.sh` (POSIX sh, no setup) and the T4 and u01 patterns; every BSD cell here is read from Apple source.
- **busybox build options:** are `find -print0`, `xargs -0` and `xargs -r` Kconfig-optional, and are they on in Alpine's build by design? (git.busybox.net returned 404 for the tag path.)
- **uutils re-diff at 0.12 and Ubuntu 26.10:** which of the 30 differing cases remain, and does ICU collation still select on any `*.UTF-8` name?
- **NFS behaviour of the `mkdir` lock** that replaces `flock` (SH-USER-06 table).
- **When to leave shell** (M-A-17) and **sudo-rs in the userland** (M-D-15): not researched.
- **FreeBSD `sh`, ksh93 and Git Bash on CI:** read-only or host-only today.
- **Exit status after a TERM handler in the guard-first pattern:** whether callers need `kill -s TERM $$` after cleanup to preserve the signal exit; owned by SH-ERR-22, not measured here.

## Sub-artifacts

- [shell-dialect/floors-and-shebangs.md](shell-dialect/floors-and-shebangs.md): dialect declaration, script-kind table and headers, shebang rules, the POSIX.1-2024 sh verdicts measured on 11 interpreters and 21 images, the pipefail and `$'..'` chases, SH-DIAL-01 to -24.
- [shell-dialect/bash-version-gate.md](shell-dialect/bash-version-gate.md): the 47-feature bash 3.2 to 5.3 table, `bash -n` limits, guard placement, the 59-pattern denylist, errexit and `set -u` drift, the 5.2 silent changes, BVG-01 to -20.
- [shell-dialect/userland-floor.md](shell-dialect/userland-floor.md): the 105-probe GNU, BSD, busybox and uutils matrix on 21 images, locale and collation, temp-file and trap contracts, Git Bash, fleet defects, R1 to R15.

## Key sources

1. https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html : POSIX.1-2024 Shell Command Language (pipefail, `$'..'`, special built-in errors, `#!` unspecified).
2. https://pubs.opengroup.org/onlinepubs/9799919799/utilities/xargs.html : POSIX.1-2024 `xargs` (`-r`, `-0` added).
3. https://pubs.opengroup.org/onlinepubs/9799919799/utilities/timeout.html : POSIX.1-2024 `timeout` (124 to 127, the 128+signal rationale).
4. https://austingroupbugs.net/view.php?id=767 : Austin Group bug 767, built-in `local`, Closed, Rejected.
5. https://www.debian.org/doc/debian-policy/ch-files.html : Debian Policy 10.4, what `/bin/sh` scripts may assume.
6. https://metadata.ftp-master.debian.org/changelogs//main/d/dash/dash_0.5.12-12_changelog : dash 0.5.12-7 pipefail backport (2024-05-17).
7. https://www.shellcheck.net/wiki/SC3040 : the subshell pipefail probe and its dash outcome.
8. https://github.com/koalaman/shellcheck/issues/2615 : "Allow configuring to reject code that is incompatible with bash 3.2", open since 2022-10-25.
9. https://raw.githubusercontent.com/mvdan/sh/v3.13.1/cmd/shfmt/main.go : shfmt 3.13.1 `langFromFilename`, the bash fallback.
10. https://ftp.gnu.org/gnu/bash/bash-5.3.tar.gz : bash NEWS and COMPAT, every "first version" in T2.
11. https://github.com/bats-core/bats-core/blob/master/docs/source/gotchas.rst : `set -e` handling of `[[ ]]` and `(( ))` changed in bash 4.1.
12. https://github.com/actions/runner-images/blob/main/images/macos/macos-26-arm64-Readme.md : GitHub macOS runners print `Bash 3.2.57(1)-release`.
13. https://documentation.ubuntu.com/release-notes/25.10/ : rust-coreutils (uutils) 0.2.2 as the Ubuntu 25.10 default.
14. https://www.msys2.org/docs/filesystem-paths/ : MSYS2 automatic path conversion, `MSYS2_ARG_CONV_EXCL`, `MSYS_NO_PATHCONV`.
15. https://busybox.net/ : BusyBox 1.37.0 and the unstable 1.38.0 news (ash `<<<`).

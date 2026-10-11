---
title: "The gate of record (SH-GATE): ShellCheck and shfmt profile, file discovery, file hygiene, parse-only checks"
topic: shell scripting across operating systems and shells, wave 2, group gate
model: sonnet
id_family: SH-GATE
consolidates:
  - shell-gate/lint-format-profile.md
  - shell-gate/verify-dialect.md
date: 2026-10-11
revised: 2026-10-11
---

# The gate of record (SH-GATE)

Two sub-artifacts feed this group: `lint-format-profile.md` (27 sources, 17 verification groups; the gate itself) and `verify-dialect.md` (the dialect every verification cell is written in, 14 candidate rules, 15 findings; folded in by the revision of 2026-10-11, see the Revision log at the end). Everything below was either re-run on 2026-10-11 or is cited to a dive and its fixtures. Fixture roots: `LF/` = `/home/mherwig/.cache/research-lang/shell-tools/fixtures/lint-format-profile` (the first dive), `GC/` = `/home/mherwig/.cache/research-lang/shell-tools/fixtures/gate-consolidation` (the first consolidation: `greps.sh`, `plant-gate.sh`, `gate/`, `bashn/`, `wf/`, `parse/`, `ec/`, `ga/`), `VD/` = `/home/mherwig/.cache/research-lang/shell-tools/fixtures/verify-dialect` (the second dive), `GR/` = `/home/mherwig/.cache/research-lang/shell-tools/fixtures/gate-revision` (this revision: `gen.py` extracts every cell from this file and `drive-body.sh` runs it on a planted tree and a compliant twin; `gate-rev.sh`, `pathstrip.sh`, `plant-gate.sh`, `preflight.sh`, `runhosts.sh`, `win-cells.sh`, `win-gate.sh`, `results/`). Toolchain: ShellCheck 0.9.0, 0.10.0, 0.11.0; shfmt 3.12.0, 3.13.0, 3.13.1, 3.14.1; actionlint 1.7.12; Task 3.53.1. Verification userland: GNU grep 3.11 (ubuntu:24.04) and 3.12 (ubuntu:26.04), BusyBox 1.37.0 (grep, xargs, awk, find), uutils coreutils 0.10.0 (ubuntu:26.04, coreutils only), MSYS grep 3.0 and gawk 5.0.0 (Git Bash 5.2.15, git 2.40.0.windows.1), mawk 1.3.4, git 2.40 to 2.54. No macOS host: BSD and macOS statements are marked read only.

## Verdict

1. **One committed script is the gate of record.** `scripts/shell-gate.sh` runs the same on a laptop, in a hook and in CI: ShellCheck at default severity and `shfmt -d` over the files that `git ls-files | shfmt -f` finds, four byte-level hygiene checks, and a parse-only check for zsh, fish, nu and elvish. It binds every script kind (installer and bootstrap, CI step helper, dev tooling script, sourced library); the kind changes only how hard SH-GATE-16 (ASCII) bites. Emitted code is not a file: its tests use the SH-GATE-11 commands as the oracle (SH-EMIT owns that).
2. **Severity is never a flag.** No `-S`, `--severity`, or severity-carrying `SHELLCHECK_OPTS` (SH-GATE-01). The fleet's `-S warning` is overturned on measurement: it hides 57 of 65 default-severity findings on the 197 authored files, and 0 of the 260 findings the optional checks add. The topic map's severity list needed one correction (SC2046 is a warning, SC2068 an error), and the conclusion stands.
3. **The profile is five keys in the root `.shellcheckrc`** (`external-sources`, `source-path=SCRIPTDIR`, three `enable=` lines). ShellCheck reads only the nearest rc and never merges, a typo in `enable=` is silent, and `severity=` and `shell=` do the wrong thing (SH-GATE-02 to 04).
4. **Suppression is per-site, with a same-line reason, from a short list.** Five codes are never disabled, retired codes are stale, and a per-site SC2086 or SC2046 directive is allowed only when its reason says "split" or "glob" (SH-GATE-05 to 07). This is the owner call the dive left open; the default is applied here.
5. **Discovery is `git ls-files -z --cached --others --exclude-standard | xargs -0 -r shfmt -f`, never a glob** (SH-GATE-09). `.bats` and extensionless shebang files are in; vendored trees leave through git pathspecs.
6. **The gate fails closed.** Missing tool 69 (git, xargs, grep, awk, ShellCheck, shfmt), missing profile file or not a usable work tree 78, no shell files 79, git or shfmt failing while listing 74, a finding 1. 69, 74, 78 and 79 are the Rust `cli-contract` values; the first dive's 66 is not in that table and is replaced (SH-GATE-08).
7. **Style lives in `.editorconfig` and the gate passes no shfmt flag.** Four spaces with `switch_case_indent` is the program's style (161 of 197 authored files already clean); an adopter whose `.editorconfig` states another style is compliant (SH-GATE-12).
8. **Tools are pinned** by exact version or by a committed lockfile; apt, brew and webi installs of ShellCheck or shfmt are defects (SH-GATE-13).
9. **ShellCheck and shfmt are the parser for sh, bash, ksh and bats.** `bash -n` is not a gate (it exits 0 on an unterminated array literal on bash 3.2 to 5.1), the exit status of `nu --ide-check` or bare `nu-check` is meaningless, and fish returns 127. PowerShell parsing belongs to the powershell-quality gate (SH-GATE-11).
10. **Hygiene is `* text=auto eol=lf`, no CR, no BOM, ASCII in `#!/bin/sh`, mode equals shebang** (SH-GATE-14 to 18). CR and BOM are found with awk in binary mode, not `grep -e $'\r'`, which is blind on Git Bash and dash (revised, C17); the ASCII check tests line 1 only (revised, C18).
11. **Embedded shell uses the same profile, not a severity floor.** actionlint gets `SHELLCHECK_OPTS='-o ...'` after a `command -v shellcheck` precheck. This decides against the SH-CI dive's `--severity=warning` proposal (SH-GATE-19).
12. **Six grep "tells" are a second, weaker gate** for what ShellCheck cannot see under bash (SH-GATE-20, SHOULD).
13. **Every verification cell is written in one dialect** (added 2026-10-11, SH-GATE-21 to 24, 28, 29): `git ls-files -z --cached --others --exclude-standard -- PATHSPEC | xargs -0 -r grep -H -n -e PAT --`, shell content listed by the SH-GATE-09 command, the grep option set that busybox, GNU and FreeBSD share, quoted pathspecs, no command in a markdown table cell. The first revision's `grep -r --include` cells died on busybox 1.37 in 17 of 18 representative cases and the error hid behind the next pipe stage; all 41 cells of this document went red on a plant and green on its twin on ubuntu 24.04, ubuntu 26.04, alpine 3.22 (busybox), alpine with GNU grep, and Git Bash 5.2.15 (Verification runs of the revision).
14. **A cell must fail closed** (SH-GATE-25, 26): a PREFLIGHT line prints when git, xargs, grep, awk or shfmt is missing or the work tree is unusable (red on six faults on four hosts), and a cell passes only with empty stdout and empty stderr. The exit status is never the verdict: xargs maps grep's "no match" and "error" both to 123, and busybox inverts `grep -L`.
15. **Awk, not PCRE, for what grep cannot say** (SH-GATE-30, 31): lookaround, multi-line and first-line anchors are `checks/NAME.sh` scripts with awk matching and the 0, 1, 69, 74, 78, 79 exit map; `-P` and `-z` forms may appear only as a labelled `(GNU grep)` extra.
16. **Documented gaps, not closed by this round.** (a) macOS and BSD userland: read only. (b) GHA windows-2025 Git Bash 5.3.15: not run (the host has 5.2.15). (c) uutils `findutils` and `diffutils`: not covered (on ubuntu:26.04 they are still GNU). (d) The bare-basename half of SH-GATE-24 is a reading heuristic with no mechanical check. (e) The SH-CI-01 awk program ignores `defaults.run.shell`. (f) The catalog checker `check-artifacts.py` may reject the binding shape if a directory-operand rule is added: it lints only table-row code spans today, and an xargs-fed grep has no operand it can see. (g) The sibling sets' 1162 `--include` lines and 542 `rg` lines are not rewritten (G9). None of these changes a rule's verdict; each is stated where it bites.

### Conflicts resolved

| # | Conflict | Decision and reason |
|---|---|---|
| C1 | Topic map conflict 4 lists SC2086, SC2046, SC2068, SC2162 as info; the dive measured otherwise | **Measured wins.** Re-run on 0.9.0, 0.10.0 and 0.11.0 (identical): SC2086 and SC2162 info, SC2046, SC2155, SC2164 warning, SC2068 error. `-S warning` still hides the top bug class and every optional check, so the conclusion (no `-S`) stands and the rationale changes. |
| C2 | Map M-F-10: a CR after `#!/bin/sh` gives exit 127; the dive says 126 for bash | **Both are right, per caller.** Re-run: direct exec from bash `bad interpreter`, exit 126; `sh -c ./crlf.sh` on dash `not found`, 127; `dash ./crlf.sh` bypasses the shebang and runs with a stray CR, exit 0. No rule asserts one code. |
| C3 | [fleet] says non-ASCII bytes in sh scripts are comments only; the dive and [inst] say runtime strings too | **Dive and [inst] win.** 24 non-comment lines in the 21 of 31 authored `#!/bin/sh` files (`LF/quant/hyg.out`); www-setup `src/install.sh` has 114 non-ASCII bytes including runtime strings ([inst]). That is why SH-GATE-16 is a MUST for installers. |
| C4 | Map M-F-06: `shfmt -f` and `--detect` find the shebang files; the dive: `shfmt -f .` walks the disk | **Feed `shfmt -f` from git.** Re-run on the discovery fixture: `git ls-files '*.sh'` finds 5, `shfmt -f .` 12 plus `node_modules`, git-fed `shfmt -f` 12 on 3.13.1 and 13 on 3.14.1. `--detect` is only needed for `.cgi`-style names (3.14.0+). |
| C5 | [inst] and [ex] treat `bash -n` as the parse floor; the dive's SH-GATE-18 rejects it | **The dive wins.** Re-run (below): unterminated `arr=(1 2` exits 0 on bash 3.2, 4.4, 5.1 and 1 on 5.2, 5.3; a missing `fi` is 2 on all. ShellCheck and shfmt both go red on the same file. `dash -n` stays a valid cheap POSIX parse. Consistent with the dialect dive (BVG-06: `bash -n` on 3.2 sees 6 of 47 constructs). |
| C6 | [fleet] Gaps: "shellcheck does not parse bats"; the dive: it does | **The dive wins.** Re-run on 0.9.0, 0.10.0, 0.11.0: `@test` blocks parse, `run echo $FOO` gives SC2086, `setup() { cd ...; }` gives SC2164. The fleet's 10 `.bats` files belong in the gate. |
| C7 | Map conflict 1 makes SC2310/SC2312 mandatory; the dive says group errexit may demote them; counts differ (map 69 and 150, dive 69 and 191) | **Ship the keys, defer the sites.** The rc carries the two `enable=` lines (cheap, mechanical). Counts are scope differences: the re-run today on the 197 authored files gives SC2312 191 and SC2310 69 in 57 files; [fleet] counted 150 in 41 files on a narrower set. Which sites to fix or suppress is SH-ERR's call (open question G1). |
| C8 | Dive: `trap` handlers and `"cmd_$1"` dispatch are not flagged by SC2329, so no central rc entry; map: relax SC2317/SC2329 for them | **Narrower than the map, wider than the dive.** Re-run: a function passed by name as an argument IS flagged (SC2329 on 0.11.0, SC2317 on 0.9.0 and 0.10.0); the gate script itself needed a restructure to pass all three. Allowed relaxation is "reached only by name through X", per site, with a reason. |
| C9 | Dive SH-GATE-03: a committed plant file proves each optional check fires | **Replaced.** A committed plant would be discovered by the gate and fail it. The check is the name test against `shellcheck --list-optional` (red on a typo and on `enable=all`, 0.9.0 to 0.11.0). |
| C10 | Dive gate exits 66 for "no shell files"; `cli-contract.md` lists 66 as never claimed | **79 (`NotFound`).** 69 and 78 are in the table. The swift-quality checks use 65 and 66 (`rules/swift-quality/checks/never-gate.sh:7-9`); reported to sibling owners, not changed here. |
| C11 | Dive pin rule: `ocx.toml` must show a pinned ref; the fleet's `ocx.toml` files carry floating tags (`:3`, `:latest`) | **The lockfile is the pin.** `ocx.lock` (platform digests) exists in ocx, www-setup, rules_ocx, find_ocx and grimoire; only setup-grimoire has none. SH-GATE-13 accepts a floating tag only with a committed lock. |
| C12 | SH-CI dive: run actionlint with `SHELLCHECK_OPTS='--severity=warning'` because the gate floor is clean today | **No severity.** Re-run: `--severity=warning` drops SC2086 and SC2310 on a workflow that has both. The SH-CI dive's own count at default severity is 18 findings over 25 repos (SC2086 x8, SC2129 x5, SC2035 x4, SC2116 x1), cheap to fix or suppress per site. Provisional until SH-CI consolidates (open question G2). |
| C13 | Dive tell (b), `grep -w which`, versus the profile's `deprecate-which` | **Dropped from the grep set.** Over the 197 authored files the grep returns 121 hits, nearly all English prose; SC2230 (profile) is exact. |
| C14 | shfmt man page (master) says `.sh` implies POSIX and documents `case_indent`, `language_dialect`; 3.13.x and 3.14.1 behave differently | **Measured wins.** A shebang-less `.sh` with an array parses as bash; the keys are `switch_case_indent` and `shell_variant`. The man page is ahead of the release. |
| C15 | Map M-F-01 names `zsh -n`; the dive uses `zsh -fn` | **`-fn`**: no startup files. Red 1, green 0 on zsh 5.0.8 and 5.9. |
| C16 | First revision, Reading the cells: "GNU grep (or BSD grep) is assumed; on Alpine run the checks where GNU grep is installed" and "run them under bash". The verification-dialect dive: busybox 1.37 with git is a supported executor | **The dive wins; the caveat is withdrawn.** Re-run of the first revision's cells on busybox 1.37 (`GR/old-greps.sh`, the `GC/greps.sh` trees): 25 of 28 cells print `unrecognized option` on both trees, 0 of 28 on ubuntu:24.04. All 41 cells of this document run on busybox with `git` added, and ran under dash, busybox ash, bash and `zsh -f` (SH-GATE-33). |
| C17 | First revision, SH-GATE-15 and gate-script step 3: `LC_ALL=C grep -l -e $'\r'` "watched red". Dive F14 row 1: blind on Git Bash, and `$'..'` is not POSIX | **The dive wins; a MUST-level overclaim is fixed.** On dash `$'\r'` is the literal text `$\r` (ubuntu:24.04 and 26.04: the cell finds nothing), and on Git Bash 2.40 (MSYS grep 3.0, text mode) `grep -l -e $'\r'` returns nothing for a CRLF file. The cell and the gate script use `awk -v BINMODE=3` with a `!cr[FILENAME]++` guard. The first gate was saved on Windows by its second tool (ShellCheck SC1017), not by this check; the revised gate flags the CRLF file itself (`GR/results/gitbash.gate.txt`). |
| C18 | First revision, SH-GATE-16 cell: `grep -rlZ -e '^#!/bin/sh' ... \| xargs -0 -r grep -n -P '[^\x00-\x7F]'`. Dive F14 row 2: false positive on a bash script whose heredoc holds `#!/bin/sh`; `-Z` and `-P` die on busybox | **Replaced** by an awk that tests line 1 only and covers extensionless scripts. The first stage listed any file with a line starting `#!/bin/sh`, not the shebang. |
| C19 | First revision: "a clean run exits 123 or 1, so read the output, not the status". Dive F14 row 4: understates | **Corrected to 0, 123 or 1, and the status is not used at all.** `grep -L` through xargs is plant 123 / twin 0 on GNU and plant 0 / twin 123 on busybox; xargs maps grep's exit 1 and exit 2 both to 123. A cell passes only with empty stdout and empty stderr (SH-GATE-26). |
| C20 | Dive VD-07: "never a pipe character inside a pattern". The dive's own verified cells use grouped alternation such as `([[:space:]]\|$)` | **Relaxed to what is measured.** One `-e` per top-level alternative; `\|` under `-E` is a literal pipe and always wrong; a BRE `\|` alternation is a GNU extension and is not used. Grouped `(a\|b)` under `-E` is allowed (SH-GATE-28). |
| C21 | Dive VD-02 says shell files come from `files()`; the dive's own rewritten D2, G2 and E1 cells list `'*.sh'` | **VD-02 wins for shell content.** An extension pathspec is blind to extensionless scripts (pyenv `libexec/pyenv-rehash`, `bin/tool` in the `GR/` plant). Cells over shell content use the SH-GATE-09 list; cells over workflows, Taskfiles, Makefiles and rc files use a pathspec (SH-GATE-22). |
| C22 | The dive's self-check greps (M3 option ban, M9 `$'` ban, the PREFLIGHT line) as written | **Four defects found by running them over this document's own cells; fixed.** `--exclude` also flags the mandated `--exclude-standard` (now `--exclude([^-]\|-dir\|-from\|$)`); M9 flagged an end-of-line anchor `$'` (now prefixed by `[[:space:]=(]`); M3 looked only at the first option cluster and missed `grep -H -n -U` (now walks the cluster list); the PREFLIGHT line names `xargs` and trips SH-GATE-28, so it carries a `vd-ok:` waiver. |
| C23 | The dive's brief: "GNU grep 3.12 on ubuntu:24.04" | **Slip corrected.** 24.04 ships GNU grep 3.11; 3.12 is 26.04. "uutils on ubuntu:26.04" covers coreutils 0.10.0 only: grep, xargs, find, sed and awk stay GNU or mawk there. |
| C24 | First revision, Known limits: "the script was not run on Git Bash or macOS" | **Half answered.** The revised gate was run on Git Bash 5.2.15 (green 0, CRLF, BOM, non-ASCII and unterminated-array plants 1, not a repo 78; `GR/win-gate.sh`) and on bash 3.2.57 with a busybox userland. macOS and Git Bash 5.3.15 stay open (G10, subarea 1). |

## The ruleset

### Reading the verification cells

- **Output is the violation; empty output means pass, and stderr must be empty too** (SH-GATE-26). Never read the exit status: through `xargs` a clean run exits 0, 123 or 1, an error also exits 123, and `grep -L` is inverted on busybox (C19).
- **The cells are POSIX sh and need no GNU grep** (C16, SH-GATE-21 to 24). They ran, plant and twin, under dash, busybox ash, bash and `zsh -f` on ubuntu 24.04 (GNU grep 3.11), ubuntu 26.04 (GNU grep 3.12, uutils coreutils), alpine 3.22 (BusyBox 1.37), alpine with GNU grep, and on Git Bash 5.2.15. A host is supported when the PREFLIGHT line prints nothing (SH-GATE-25, 33). Stock `alpine` and `busybox` images lack git, bash and shfmt; install them first.
- **Start a block with the PREFLIGHT line** (SH-GATE-25): a missing tool or an unusable work tree otherwise reads as a pass.
- **The owner's login shell is zsh**, which does not word-split, expands `=word` and aborts on an unmatched glob. The cells quote every glob and use no `$'..'`, so they run unchanged under `zsh -f`; a driver script (`sh` or `bash`) is still the safest way to run a long one.
- **Severity words.** MUST needs a measured or normative source and a verification that was watched red on a plant and green on its twin. SHOULD and CONSIDER may rest on a reading heuristic, named as one.
- **Fence conventions.** A plain `sh` fence holds cells (each non-comment line is one cell that prints on a plant and is silent on its twin); `sh listing` is a listing command, not a pass/fail cell; `sh preflight` is the PREFLIGHT line; `bash` is a procedure.
- **Dive IDs were renumbered.** The map is at the end of this section.

### Files the gate ships (verbatim; the index carries only `bash scripts/shell-gate.sh` and the rules)

`.shellcheckrc` (works unchanged on ShellCheck 0.9.0, 0.10.0, 0.11.0):

```text
# shell-quality gate profile. Severity is a command-line concept, not an rc key: never pass -S.
# Only the nearest .shellcheckrc is read (no merging): a nested one must repeat every line below.
external-sources=true                      # follow `source` without -x
source-path=SCRIPTDIR                      # resolve `. "$here/../lib/x.sh"` and `. x.sh` from the script's directory
enable=check-set-e-suppressed              # SC2310 / SC2311: set -e silently off inside `if f`, `f &&`, `f ||`
enable=check-extra-masked-returns          # SC2312: a failing command inside $(...) or a pipeline is masked
enable=deprecate-which                     # SC2230: `which` is not POSIX; use `command -v`
```

`.editorconfig` (the `[[shell]]` section is what styles extensionless scripts: without it a four-space `bin/tool` is dirty on 3.12.0, 3.13.1 and 3.14.1):

```ini
root = true

[*]
end_of_line = lf
insert_final_newline = true

[*.{sh,bash,bats,ksh}]
indent_style = space
indent_size = 4
switch_case_indent = true

[[shell]]
indent_style = space
indent_size = 4
switch_case_indent = true
```

`.gitattributes`: `* text=auto eol=lf` (add `*.bat text eol=crlf` and `*.cmd text eol=crlf` where those exist).

`scripts/shell-gate.sh` (108 lines; revised 2026-10-11 from the first consolidation's 99; lints clean under ShellCheck 0.9.0, 0.10.0 and 0.11.0 with the profile above, is `shfmt -d` clean on 3.12.0, 3.13.1 and 3.14.1, passes its own SH-GATE-01, 05, 06, 08, 09, 12, 15, 16 and 20 cells (the twin tree holds it), and ran green and red on bash 3.2.57 with a busybox userland and on Git Bash 5.2.15; `GR/gate-rev.sh`). The changes from the first version are the exit map and the tool list (SH-GATE-08, 31) and the CR and BOM check (SH-GATE-15, C17):

```bash
#!/usr/bin/env bash
# shell-gate: the gate of record. Run from the repo root. Any non-zero exit fails the build.
# Never silence a failure (no true-fallback, no skip branch); never pass a severity flag; style lives in .editorconfig and .shellcheckrc.
# Exit: 0 clean; 1 a finding; 69 a required tool is missing; 74 git or shfmt failed while listing files; 78 .shellcheckrc or .editorconfig is missing, or this is not a usable git work tree; 79 no shell files found.
set -euo pipefail

for tool in git xargs grep awk shellcheck shfmt; do
    command -v "$tool" >/dev/null 2>&1 || {
        echo "shell-gate: '$tool' not on PATH" >&2
        exit 69
    }
done

# 0. The work tree must be usable (not a repository, or git refuses it: safe.directory) and the profile must live in it:
#    ShellCheck falls back to ~/.shellcheckrc, so a missing file means CI and laptop disagree.
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
    echo "shell-gate: not a usable git work tree (not a repository, or git refuses it: safe.directory)" >&2
    exit 78
}
for cfg in .shellcheckrc .editorconfig; do
    [ -f "$cfg" ] || {
        echo "shell-gate: missing $cfg at the repo root" >&2
        exit 78
    }
done

# 1. Discover: tracked or new-and-unignored files that shfmt recognises by extension or shebang.
#    Plain -f only: on shfmt 3.13.1 the zero-argument form stops filtering explicit file arguments.
#    Exclusions are git pathspecs: ... --exclude-standard -- . ':(exclude)vendor' | ...
list=$(git ls-files -z --cached --others --exclude-standard | xargs -0 -r shfmt -f) || {
    echo "shell-gate: could not list the shell files (git or shfmt failed)" >&2
    exit 74
}
[ -n "$list" ] || {
    echo "shell-gate: no shell files found" >&2
    exit 79
}
all=() sc=() fail=0
while IFS= read -r f; do
    all+=("$f")
    IFS= read -r line1 <"$f" || line1=''
    case "$f $line1" in *.zsh\ * | *\ '#!'*zsh*) ;; *) sc+=("$f") ;; esac # zsh is not a shellcheck dialect
done <<<"$list"

# 2. Format and lint at default severity.
shfmt -d --apply-ignore "${all[@]}" || fail=1
[ "${#sc[@]}" -eq 0 ] || shellcheck "${sc[@]}" || fail=1

# 3. Hygiene: each check prints the offending file; empty output means pass.
#    CR and BOM are found with awk in binary mode: MSYS grep (Git Bash) reads in text mode and never sees the CR.
hyg=$(LC_ALL=C awk -v BINMODE=3 '/\r/ && !cr[FILENAME]++ { print FILENAME ": CR byte (CRLF)" } FNR == 1 && /^\357\273\277/ { print FILENAME ": UTF-8 BOM" }' "${all[@]}") || {
    echo "shell-gate: awk failed while reading the shell files" >&2
    exit 74
}
[ -z "$hyg" ] || {
    printf '%s\n' "$hyg" >&2
    fail=1
}
for f in "${all[@]}"; do
    IFS= read -r line1 <"$f" || line1=''
    mode=$(git ls-files -s -- "$f" | cut -c1-6)
    case "$mode:$line1" in
        100644:'#!'*)
            echo "shell-gate: shebang but mode 100644: $f" >&2
            fail=1
            ;;
        100755:'#!'*) ;;
        100755:*)
            echo "shell-gate: mode 100755 but no shebang: $f" >&2
            fail=1
            ;;
    esac
    case "$line1" in '#!/bin/sh'* | '#!/usr/bin/env sh'*)
        LC_ALL=C grep -n -e '[^ -~[:space:]]' "$f" && {
            echo "shell-gate: non-ASCII in sh script $f" >&2
            fail=1
        }
        ;;
    esac
done

# 4. Parse-only gate for the families ShellCheck cannot read, only when the repo has files of that family.
#    A missing interpreter then fails the gate (69). PowerShell belongs to the powershell-quality gate.
# shellcheck disable=SC2016 # the single quotes are deliberate: $env is for nu, not for this shell
parse_family() { # <interpreter> <git pathspec> <command...>: the file name is appended as the last argument
    local tool=$1 spec=$2 files f
    shift 2
    files=$(git ls-files -z --cached --others --exclude-standard -- "$spec" | tr '\0' '\n')
    [ -n "$files" ] || return 0
    command -v "$tool" >/dev/null 2>&1 || {
        echo "shell-gate: '$tool' not on PATH but the repo has $spec files" >&2
        exit 69
    }
    while IFS= read -r f; do
        case $tool in
            nu) GATE_FILE=$f nu --no-config-file -c 'if not (nu-check $env.GATE_FILE) { exit 1 }' >/dev/null ;;
            *) "$@" "$f" >/dev/null ;;
        esac || {
            echo "shell-gate: $tool cannot parse $f" >&2
            fail=1
        }
    done <<<"$files"
}
parse_family zsh '*.zsh' zsh -fn
parse_family fish '*.fish' fish --no-execute
parse_family elvish '*.elv' elvish -compileonly
parse_family nu '*.nu' nu
exit "$fail"
```

Known limits of the script, not rules: a file name with a newline breaks the family loop; `-` leading file names are untested; the script ran on Git Bash 5.2.15 and on bash 3.2.57 with a busybox userland but not on macOS or on Git Bash 5.3.15 (G10, subarea 1); a `safe.directory` refusal is reported as 78 and not worked around; elvish `-compileonly` gives false positives for scripts that touch the interactive `edit:` namespace ([ex]).

### A. Profile files (caught by grep over config)

**SH-GATE-01 · MUST.** Run `shellcheck FILES` at default severity: no `-S`, no `--severity`, no `SHELLCHECK_OPTS` carrying a severity, in any task, workflow, Makefile or script.
- *Why.* SC2086 and SC2162 are info; every optional check is info; `-S warning` hides the top bug class (SC2086 is 32% of the 13,865 exemplar findings) and makes the optional-check profile dead config.
- *Verify.*
  ```sh
  { git ls-files -z --cached --others --exclude-standard -- '*.yml' '*.yaml' '*.mk' ':(glob)**/Makefile'; git ls-files -z --cached --others --exclude-standard | xargs -0 -r shfmt -f | tr '\n' '\0'; } | xargs -0 -r grep -H -n -e 'shellcheck.* -S' -e 'shellcheck.*--severity' -e 'SHELLCHECK_OPTS.*-S' -e 'SHELLCHECK_OPTS.*severity' --
  ```
- *Watched red.* Yes, in the git-fed dialect (SH-GATE-21; revision 2026-10-11). `GR/` cell 01-a: the planted Taskfile, `sub/Makefile` (found only through `':(glob)**/Makefile'`) and the workflow `env:` line print (3 lines), the twin prints nothing, stdout and stderr both empty, on every host of SH-GATE-33. The first revision's `grep -r --include` form was red on GNU grep only (it dies on busybox, SH-GATE-23).
- *Scope.* All script kinds, all CI, embedded shell included. ShellCheck 0.9.0 to 0.11.0.

**SH-GATE-02 · MUST.** The repo root `.shellcheckrc` is the five-key profile above; it carries no `severity=`, no `shell=`, no `disable=all`; `.editorconfig` carries no `shellcheck.*` key.
- *Why.* `severity=` is not an rc key and is silently ignored (SC2086 still reported); `shell=bash` overrides every shebang repo-wide (SC3010 and SC3030 vanish on a `#!/bin/sh` file); `.editorconfig` `shellcheck.*` keys are master-only and ignored by 0.11.0 (dive §2, V04).
- *Verify.*
  ```sh
  git ls-files -z --cached --others --exclude-standard -- ':(glob)**/.shellcheckrc' ':(glob)**/shellcheckrc' | xargs -0 -r grep -H -n -e '^severity' -e '^shell=' -e '^disable=all' --
  git ls-files -z --cached --others --exclude-standard -- ':(glob)**/.editorconfig' | xargs -0 -r grep -H -n -e 'shellcheck\.' --
  for k in external-sources=true source-path=SCRIPTDIR enable=check-set-e-suppressed enable=check-extra-masked-returns enable=deprecate-which; do grep -q -e "^$k" .shellcheckrc || echo "missing in .shellcheckrc: $k"; done
  ```
- *Watched red.* Yes (`GR/` cells 02-a to 02-c: three keys, one editorconfig key, four missing-line messages; twin empty, on every SH-GATE-33 host; the first revision's `GC/greps.sh` rule 02 gave the same counts with `--include`). `source-path=SCRIPTDIR` resolution: `--norc` gives SC1091, the rc gives exit 0, from a different cwd too (dive V03; `GC/gate/bin/tool2` clean with the rc, SC1091 without).
- *Scope.* Every repo with shell. The rc may also carry reasoned `disable=` lines for the SH-GATE-07 codes only.

**SH-GATE-03 · MUST.** Every `enable=` name in `.shellcheckrc` exists in `shellcheck --list-optional` of the pinned version; `enable=all` is not a name and fails the same test.
- *Why.* An unknown optional check is accepted silently by 0.9.0, 0.10.0 and 0.11.0; the check never runs and the gate looks green (dive V05).
- *Verify.*
  ```sh
  opts=$(shellcheck --list-optional); sed -n 's/^enable=\([A-Za-z0-9-]*\).*/\1/p' .shellcheckrc | while read -r n; do printf '%s\n' "$opts" | grep -q -x -e "name:[[:space:]]*$n" || echo "unknown optional check in .shellcheckrc: $n"; done
  ```
- *Watched red.* Yes, on 0.9.0, 0.10.0 and 0.11.0: red rc (`check-set-e-suppresed`, `all`) prints two lines, the shipped rc prints nothing (`GC/rules/03`).
- *Scope.* ShellCheck 0.9.0 and later (`--list-optional` format identical on all three).

**SH-GATE-04 · MUST.** There is no nested `.shellcheckrc` or `shellcheckrc`; if one is unavoidable it repeats all five profile keys.
- *Why.* ShellCheck reads only the first rc it finds walking up; a nested `disable=SC2034` file removed `external-sources`, `source-path` and every `enable=` (SC1091 came back, SC2310 vanished).
- *Verify.*
  ```sh
  git ls-files -z --cached --others --exclude-standard -- ':(glob)*/**/.shellcheckrc' ':(glob)*/**/shellcheckrc' | tr '\0' '\n'
  ```
- *Watched red.* Yes: `GC/nest.sh` (root rc: SC2310 reported; with `bin/.shellcheckrc`: SC1091 reported, SC2310 gone); the git-fed list prints `tests/.shellcheckrc` on the red tree and nothing on the twin (`GR/` cell 04-a). The pathspec `:(glob)*/**/NAME` is "at least one directory deep" (a root file is not listed, which is the point: the root rc is the profile). The first revision's `find -mindepth 2` form skipped only the two trees it named (`./.git`, `./node_modules`); the git list skips every ignored tree by construction.
- *Scope.* All.

**SH-GATE-05 · MUST.** Every `# shellcheck disable=` directive, and every `disable=` line in an rc, carries a same-line `# reason`. A comment that merely mentions shellcheck starts `# note: shellcheck ...`.
- *Why.* 1,185 exemplar directives, 148 justified (12.5%) ([ex]); a comment that begins `# shellcheck ` followed by prose is parsed as a directive and breaks the file (SC1073, SC1072 on a `while` loop).
- *Verify.*
  ```sh
  { git ls-files -z --cached --others --exclude-standard -- '*.yml' '*.yaml'; git ls-files -z --cached --others --exclude-standard | xargs -0 -r shfmt -f | tr '\n' '\0'; } | xargs -0 -r grep -H -n -E -e 'shellcheck[[:space:]]+disable=[A-Za-z0-9,-]*[[:space:]]*$' --
  git ls-files -z --cached --others --exclude-standard -- ':(glob)**/.shellcheckrc' ':(glob)**/shellcheckrc' | xargs -0 -r grep -H -n -E -e '^disable=[A-Za-z0-9,-]*[[:space:]]*$' --
  ```
  The prose form is caught by the gate itself: `shellcheck FILE` exits 1 with SC1073 and SC1072.
- *Watched red.* Yes (`GR/` cells 05-a and 05-b: script, extension-less script, untracked script, file named `-x.sh`, workflow `run:` block and rc each flagged, twins empty). Prose: `# shellcheck cannot parse zsh, so skip it` gives SC1073, SC1072; `# note: ...` is clean (`GC/dir/`).
- *Scope.* All. Same-line is the form a grep can check; the Directive wiki also allows a preceding-line comment, which this rule does not.

**SH-GATE-06 · MUST.** Never disable SC2155, SC2164, SC2162, SC2115 or SC2068. Never list SC2086 or SC2046 in an rc. A per-site SC2086 or SC2046 directive states "split" or "glob" in its reason. Never disable a retired code (SC2039, SC2230, SC3013) or a malformed one.
- *Why.* They are the bug classes the gate exists for. ShellCheck never reports a stale or mistyped suppression: `disable=SC2039` is silent while the real SC3043 appears, and `disable=SC20865` is ignored (dive §3, `LF/dis/`). SC2164 is silent under `set -e` anyway, so the never-rule costs nothing there.
- *Verify.*
  ```sh
  { git ls-files -z --cached --others --exclude-standard -- '*.yml' '*.yaml' ':(glob)**/.shellcheckrc' ':(glob)**/shellcheckrc'; git ls-files -z --cached --others --exclude-standard | xargs -0 -r shfmt -f | tr '\n' '\0'; } | xargs -0 -r grep -H -n -E -e 'disable=[^#]*SC(2155|2164|2162|2115|2068|2039|2230|3013)([^0-9]|$)' -e 'disable=[^#]*SC([0-9]{1,3}|[0-9]{5,})([^0-9]|$)' --
  git ls-files -z --cached --others --exclude-standard -- ':(glob)**/.shellcheckrc' ':(glob)**/shellcheckrc' | xargs -0 -r grep -H -n -E -e 'SC(2086|2046)' --
  { git ls-files -z --cached --others --exclude-standard -- '*.yml' '*.yaml'; git ls-files -z --cached --others --exclude-standard | xargs -0 -r shfmt -f | tr '\n' '\0'; } | xargs -0 -r grep -H -n -E -e 'disable=[^#]*SC(2086|2046)([^0-9]|$)' -- | grep -v -i -E -e '#.*(split|glob)'
  ```
- *Watched red.* Yes (`GR/` cells 06-a to 06-c: never, stale, typo, rc and no-reason-word plants each flagged; the twin with `# deliberate split of $FLAGS` and `# deliberate glob of $PATTERN` and the allowed codes is empty).
- *Scope.* All. The "split or glob" exception is the default applied to the dive's open question (G3).

**SH-GATE-07 · SHOULD.** Relax only what this table allows, with a reason in this shape:

| Code | Allowed when | Reason pattern |
|---|---|---|
| SC2317 (0.9.0, 0.10.0) and SC2329 (0.11.0+) | a function is reached only by name through a table, trap-less dispatch or a function argument | `# reached only through <where>` |
| SC1091 | the sourced path is computed at runtime and `source-path` cannot resolve it | `# path is computed at runtime from <var>; checked as <file> in its own run` |
| SC2016 | a single-quoted `$` is meant literally (emitted code, test strings, `$env` for nu) | `# single quotes are deliberate: the $ is for the target shell` |
| SC3040 | probed `pipefail` in a `#!/bin/sh` script only | `# probed in a subshell first: dash 0.5.12-2 and posh abort on an unknown set -o` |
| SC3043 | `local` in `#!/bin/sh` when ksh93 is not a target | `# local is accepted by every sh target in the floor table` |

- *Why.* These are the relaxations the maintained exemplars converge on (mise, shellspec, docker-install; 14 of 39 repos disable SC2016), narrowed to per-site. The probed-pipefail line still raises SC3040 twice on 0.9.0, 0.10.0 and 0.11.0 and runs clean with the directive on all 11 posix-family interpreters (`GC/dir/probe.sh`, `matrix.sh posix`: 11 of 11 exit 0).
- *Verify.* Reading heuristic: list the directives and check each code and reason against the table. Not watched red, because whether a reason is true is semantic; the listing command itself runs on every SH-GATE-33 host (`GR/` cell 07-a prints the plant's and the twin's directives).
  ```sh listing
  git ls-files -z --cached --others --exclude-standard | xargs -0 -r shfmt -f | tr '\n' '\0' | xargs -0 -r grep -H -n -o -e 'disable=[A-Za-z0-9,-]*.*' --
  ```
- *Scope.* All; the SC3xxx rows bind `#!/bin/sh` only.

### B. The gate must fail closed (caught by running it with the tool off PATH)

**SH-GATE-08 · MUST.** The gate exits 69 when `git`, `xargs`, `grep`, `awk`, `shellcheck`, `shfmt`, or an interpreter for a family present is not on PATH; 78 when `.shellcheckrc` or `.editorconfig` is missing or the directory is not a usable git work tree; 74 when git or shfmt fails while listing the files; 79 when discovery finds no shell file; 1 on a finding. No gate command is followed by a true-fallback, and no branch prints "not installed ... skipping" and continues.
- *Why.* A skipped gate is a passed gate: grimoire's task prints `shellcheck not installed — skipping` and exits 0 (Task 3.53.1), and actionlint exits 0 without ShellCheck even with `-shellcheck=/nonexistent`. ShellCheck falls back to `~/.shellcheckrc`, so a missing repo rc means the laptop and CI disagree. 69, 74, 78, 79 are `cli-contract.md` `Unavailable`, `IoError`, `ConfigError`, `NotFound`; 66 is on its never-claimed list. The git-fed listing adds one failure the glob version did not have: a tracked file deleted in the work tree before the commit makes `shfmt -f` fail, and the first gate then died under `set -e` with exit 123 (`lstat a.sh: no such file or directory`), a status in nobody's table; the revised gate says 74. A work tree git refuses (`safe.directory`, a root container on a bind mount) or a directory that is no repository is 78, not a silent empty list.
- *Verify.*
  ```bash
  d=$(mktemp -d) && for t in bash git grep xargs awk cut tr env; do ln -s "$(command -v "$t")" "$d/$t"; done
  PATH="$d" bash scripts/shell-gate.sh; echo "exit $?"
  ```
  The first run must print 69; linking in `shellcheck` and `shfmt` turns it into 0 (the green twin). The silent-pass grep, in the git-fed dialect:
  ```sh
  { git ls-files -z --cached --others --exclude-standard -- '*.yml' '*.yaml' '*.mk' ':(glob)**/Makefile'; git ls-files -z --cached --others --exclude-standard | xargs -0 -r shfmt -f | tr '\n' '\0'; } | xargs -0 -r grep -H -l -e shellcheck -e shfmt -e actionlint -- | tr '\n' '\0' | xargs -0 -r grep -H -n -e '|| true' -e 'not installed' --
  ```
- *Watched red.* Yes. `GR/pathstrip.sh` (revised gate): no tools 69, shellcheck only 69, both 0, and each of `awk`, `xargs`, `grep` removed 69. `GR/plant-gate.sh`: missing rc 78, missing editorconfig 78, not a work tree 78, empty tree 79, tracked file deleted 74 (the first gate: 123), `.fish` present without fish 69; run from a subdirectory 78 (no rc there). The old gate is red the other way: `LF/task-drive.sh` shows grimoire's verify exit 0 with shellcheck missing. The grep (`GR/` cell 08-a): red tree (`ci.yml`-style `|| true`, Taskfile with "not installed") flagged, twin none.
- *Scope.* All gates, including the actionlint step (SH-GATE-19). A Task `preconditions:` entry whose `msg:` says "skipping" is not a silent pass: Task 3.53.1 fails the task with exit 201 (measured), so ocx's wording is misleading and its behaviour is correct.

### C. File discovery (caught by diffing the list and by grep)

**SH-GATE-09 · MUST.** Discover with `git ls-files -z --cached --others --exclude-standard | xargs -0 -r shfmt -f` (plain `-f`). Never a `*.sh` or `**` glob, `find . -name`, a hand-written list, or `shfmt -f=0`. `.bats` files and extensionless shebang scripts are in the list. Families with no shebang convention (fish, nu, elvish, zsh) are found by extension pathspec (`git ls-files -- '*.fish'`).
- *Why.* On the discovery fixture `git ls-files '*.sh'` finds 5 of 14 shell files, `shfmt -f .` walks gitignored `node_modules`, the git-fed command finds 12 (13 on shfmt 3.14.1, which also recognises `#!/bin/dash`). Two exemplars skip their own installer because `**/*.sh` without globstar means `*/*.sh` (starship `install/install.sh`, docker-install `install.sh`). On 3.13.1 exactly, `-f=0` echoes non-shell explicit arguments (`.editorconfig`).
- *Verify.*
  ```sh
  { git ls-files -z --cached --others --exclude-standard -- '*.yml' '*.yaml' '*.mk' ':(glob)**/Makefile'; git ls-files -z --cached --others --exclude-standard | xargs -0 -r shfmt -f | tr '\n' '\0'; } | xargs -0 -r grep -H -l -e shellcheck -e shfmt -- | tr '\n' '\0' | xargs -0 -r grep -H -n -E -e '\*\.(sh|bash|bats)' -e '(shellcheck|shfmt)[^|;&]*\*\*' -e 'find \. -name' -e 'shfmt[^|;&]* -f=0' --
  ```
- *Watched red.* Yes. `GR/` cell 09-a: Taskfile `shellcheck *.sh` and `install/**/*.sh`, workflow `shfmt -f=0` and `find . -name` all flagged; the twin (gate invocation, the discovery command, `shfmt -d --apply-ignore`) is empty. The first revision's `GC/greps.sh` rule 09 gave the same hits with `grep -r --include`. Discovery counts: `LF/disc-final.sh` (5, 12 plus node_modules, 12, 13). `-f=0` on 3.13.1: `a.sh|.editorconfig|`, on 3.13.0 and 3.14.1 `a.sh|` (`GC/ec/`). The gate's `.bats` handling: `GC/bats/`.
- *Scope.* sh, bash, ksh, bats, zsh (zsh dialect needs shfmt 3.13.0+). A file with no extension and no shebang is unreachable by any tool.

**SH-GATE-10 · SHOULD.** Exclusions are git pathspecs on the discovery command (`-- . ':(exclude)vendor'`), and the gate passes `--apply-ignore` to shfmt.
- *Why.* shfmt's `ignore = true` is honoured when it walks a directory and skipped for explicit file arguments unless `--apply-ignore` is given (dive §5).
- *Verify.* Plant a violation under the excluded directory: green with the pathspec, red without it.
- *Watched red.* Yes. `GC/plant-gate.sh`, re-run on the revised gate as `GR/plant-gate.sh`: `vendor/v.sh` with `echo $1` gives exit 1 (SC2086), the pathspec twin exits 0.
- *Scope.* Repos with vendored or fixture shell.

**SH-GATE-11 · MUST.** Every shell family present has a parse-only check that was watched red, and the parser for sh, bash, ksh and bats is ShellCheck plus shfmt, not `bash -n`:

| Family | Command (the file is the last argument) | Broken / good |
|---|---|---|
| sh, bash, ksh, bats | `shellcheck FILE` and `shfmt FILE` | 1 / 0 |
| POSIX sh, cheap independent parse | `dash -n FILE` | 2 / 0 |
| zsh (5.0.8, 5.9) | `zsh -fn FILE` | 1 / 0 |
| fish (3.6.0, 4.0.2, 4.7.0, 4.9.3) | `fish --no-execute FILE`; any non-zero is a failure | 127 / 0 |
| nushell (0.105.1, 0.116.0) | `GATE_FILE=FILE nu --no-config-file -c 'if not (nu-check $env.GATE_FILE) { exit 1 }'` | 1 / 0 |
| elvish (0.21.0) | `elvish -compileonly FILE` | 2 / 0 |
| PowerShell | owned by the powershell-quality gate (PS-GATE): `Parser::ParseFile` with the `$e.Count` test, ParseError in the severity list, a real 5.1 host parse | 1 / 0 on 7.6.6 here |

- *Why.* `bash -n` exits 0 on `arr=(1 2` for bash 3.2, 4.4 and 5.1 (1 on 5.2, 5.3), so a script that cannot parse passes. `nu --ide-check` and bare `nu-check` exit 0 on a broken file; the wrapper above, or a grep for `"severity":"Error"` in the `--ide-check` diagnostics (www-setup's variant), is required. fish exits 127, not 1. shfmt is a partial dialect checker only: a shebang-less `.sh` with an array parses as bash and `[[` parses in a `#!/bin/sh` file, so the dialect check is `shellcheck -s sh` (SC3010, SC3030), owned by SH-DIAL.
- *Verify.* Run the commands above on a broken file and its twin; every row must go non-zero on the broken file.
- *Watched red.* Yes. `GC/parse/drive.sh` on the current group (fish 4.9.3, nu 0.116.0, elvish 0.21.0, pwsh 7.6.6) and `RUN_GROUP=old` (fish 4.7.0, nu 0.105.1); fish 3.6.0 and 4.0.2, zsh 5.9 and `dash -n` on `shellzoo:deb12` and `deb13`; zsh 5.0.8 on `zshusers/zsh:5.0.8`. `GC/bashn/drive.sh` for `bash -n`. The integrated gate went red on a planted `.zsh`, `.fish`, `.nu`, `.elv`, an unterminated `.bash` array and a broken `.sh` (`GC/plant-gate.sh`; the revised gate gives the same exits in `GR/plant-gate.sh`, and exit 1 on the unterminated array on Git Bash 5.2.15 too).
- *Scope.* Each family only where the repo has files for it. Not run: Windows PowerShell 5.1 (PS-GATE), elvish on `edit:`-touching scripts (false positive).

### D. shfmt style and tool pins (caught by grep and by `shfmt -d` on a plant)

**SH-GATE-12 · MUST.** The shfmt style lives in `.editorconfig` (`root = true`, the `[*.{sh,bash,bats,ksh}]` and `[[shell]]` sections above, key spelling `switch_case_indent`), and the gate passes no shfmt parser or printer flag.
- *Why.* Any of `-i -ci -bn -s -ln -sr -kp -fn -mn -p` switches EditorConfig off for the whole run; measured on 3.12.0, 3.13.0, 3.14.1: `shfmt -d -i 4 a.sh` on a four-space, case-indented file exits 1 while `shfmt -d a.sh` exits 0. `case_indent` and `language_dialect` are ignored by 3.14.1. `[[shell]]` is what styles an extensionless `bin/tool`. `.bats` needs no `-ln` and breaks under `-ln posix`.
- *Verify.*
  ```sh
  { git ls-files -z --cached --others --exclude-standard -- '*.yml' '*.yaml' '*.mk' ':(glob)**/Makefile'; git ls-files -z --cached --others --exclude-standard | xargs -0 -r shfmt -f | tr '\n' '\0'; } | xargs -0 -r grep -H -n -E -e 'shfmt[^|;&#]* -(i|ci|bn|s|ln|sr|kp|fn|mn|p)([ =]|$)' -e 'shfmt[^|;&#]* --(indent|case-indent|binary-next-line|simplify|language-dialect|space-redirects|keep-padding|func-next-line|minify)' --
  git ls-files -z --cached --others --exclude-standard -- ':(glob)**/.editorconfig' | xargs -0 -r grep -H -n -e '^case_indent' -e '^language_dialect' --
  grep -q -e '^root *= *true' .editorconfig || echo "missing: root = true in .editorconfig"
  ```
- *Watched red.* Yes (`GR/` cells 12-a to 12-c: the flag grep flags the Taskfile `-d -i 4 -ci` and the Makefile `--indent=2`, the twin `-d --apply-ignore`, `-f` is empty; the key-spelling grep flags both keys; the root check prints for the red tree only; the first revision's `GC/greps.sh` rule 12 gave the same hits with `--include`). `GC/ec/drive.sh`: exits 0, 1, 1, 0, 1 for the EditorConfig, two-space, flagged and `-ci` cases on three versions. Style census: `-i 4 -ci` 161/197 clean, `-i 4` 135, `-i 2` 80, tabs 77 (`LF/quant/fmt.out`).
- *Scope.* The program's repos. An adopter that states another style in its own `.editorconfig` is compliant. Pin shfmt 3.13.1 or newer from the toolchain (the `-d` exit code is 1 on every version tested; `-l` exits 0 on 3.12.0 and earlier).

**SH-GATE-13 · MUST.** Pin ShellCheck and shfmt the same way on laptops and CI: an exact version, or a floating tag only with a committed lockfile (`ocx.lock`). Do not install either with apt, apk, brew or webi, or take it from the runner image. shfmt is 3.13.0 or newer when the repo has `.zsh` files.
- *Why.* Findings differ by version (SC2329 exists only from 0.11.0, SC3013 only until 0.10.0, SC2002 default-on only until 0.10.0); ubuntu-24.04 ships ShellCheck 0.9.0 and shfmt 3.8.0, ubuntu-26.04 ships 0.11.0 and 3.12.0, and `ubuntu-latest` moves between 2026-10-19 and 2026-11-19 (map). bats-core pins shfmt 3.5.1 and 3.13.1 would reformat 48 of its files.
- *Verify.*
  ```sh
  git ls-files -z --cached --others --exclude-standard -- ':(glob)**/ocx.toml' | xargs -0 -r -n 1 sh -c '[ -f "$(dirname "$1")/ocx.lock" ] || grep -H -n -E -e "(shellcheck|shfmt)[^[:space:]]*:(latest|[0-9]+)[^0-9.]" -- "$1"' sh
  git ls-files -z --cached --others --exclude-standard -- ':(glob)**/mise.toml' ':(glob)**/.mise.toml' ':(glob)**/.tool-versions' | xargs -0 -r grep -H -n -E -e '(shellcheck|shfmt)[[:space:]]*=?[[:space:]]*"?(latest|[0-9]+)"?$' --
  { git ls-files -z --cached --others --exclude-standard -- '*.yml' '*.yaml' ':(glob)**/Makefile'; git ls-files -z --cached --others --exclude-standard | xargs -0 -r shfmt -f | tr '\n' '\0'; } | xargs -0 -r grep -H -n -E -e '(apt(-get)?|apk|brew) (-y )?install[^|;&#]*(shellcheck|shfmt)' -e 'webi\.sh/(shfmt|shellcheck)' --
  ```
- *Watched red.* Yes (`GR/` cells 13-a to 13-c: unlocked `:latest` and `:3` (a nested `ocx.toml` with its own `ocx.lock` is not flagged), mise `"3"` and `"latest"`, and apt, webi, brew lines all flagged; the lock-backed `ocx.toml`, exact mise versions and the gate invocation are empty; the first revision's `GC/greps.sh` rule 13 gave the same hits with `find` and `--include`). Version evidence: distro table from `LF/distro-drive.sh`, severity and findings by version from the runs below.
- *Scope.* Any repo whose gate runs in CI. The floating-tag-plus-lock form is the fleet's actual practice (C11).

### E. Hygiene (caught by byte-level greps and the gate's mode loop)

**SH-GATE-14 · MUST.** `.gitattributes` has `* text=auto eol=lf`, so no shell file is checked out with CRLF.
- *Why.* Git's default on Windows is CRLF. A CRLF body runs a prefix and then dies (`syntax error: unexpected end of file`, exit 2 on bash 3.2 to 5.3), while Git Bash 5.2.15 on the Windows host runs the same file to completion with exit 0: it works locally and fails in the Linux container. Without attributes a CRLF file is indexed as `i/crlf`; with the attribute `git add` normalises it to `i/lf` while the worktree copy stays `w/crlf`.
- *Verify.*
  ```sh
  git ls-files -z --cached --others --exclude-standard | xargs -0 -r shfmt -f | tr '\n' '\0' | xargs -0 -r git check-attr eol -- | grep -v -e ': eol: lf$'
  ```
  The check lists the files whose `eol` attribute is not `lf`; with `shfmt` off PATH the list is empty and the cell is silent, so the PREFLIGHT line (SH-GATE-25) comes first.
- *Watched red.* Yes (`GR/` cell 14-a, all SH-GATE-33 hosts: the plant without `.gitattributes` prints 8 lines, the twin prints nothing; the twin's exit status is 1 because the closing `grep -v` selects nothing, which is one reason the status is never read, SH-GATE-26; `GC/ga/crlf.sh` for the earlier run): without `.gitattributes` the check lists `a.sh`, `b.bash`, `crlf.sh`, `hooks/pre-commit` as `eol: unspecified`; with `* text=auto eol=lf` it prints nothing and `git ls-files --eol` shows `i/lf w/crlf`.
- *Scope.* All repos that may be checked out on Windows. `*.bat` and `*.cmd` are the exception.

**SH-GATE-15 · MUST.** No shell file contains a CR byte or a UTF-8 BOM.
- *Why.* A CR after the shebang makes the kernel look for `/bin/sh\r`: exit 126 when exec'd from bash, 127 for `sh -c ./f`. A BOM makes line 1 `No such file or directory` while the rest runs and exits 0. Windows PowerShell 5.1 `-Encoding UTF8` writes a BOM.
- *Verify.* One awk in binary mode over the SH-GATE-09 list, never `grep -e $'\r'` (revised 2026-10-11, see C17):
  ```sh
  git ls-files -z --cached --others --exclude-standard | xargs -0 -r shfmt -f | tr '\n' '\0' | LC_ALL=C xargs -0 -r awk -v BINMODE=3 '/\r/ && !cr[FILENAME]++ { print FILENAME ":" FNR ": CR" } FNR == 1 && /^\357\273\277/ { print FILENAME ": BOM" }'
  ```
  ShellCheck reports the same as SC1017 (CR, error) and SC1082 (BOM, error). Do not use `rg` for the BOM: ripgrep strips it and prints nothing.
- *Why the grep form was withdrawn.* `$'\r'` is not POSIX: on `sh` = dash (ubuntu:24.04 and 26.04) the cell greps for the literal text `$\r` and finds nothing, and busybox ash accepted it, which hid the defect on Alpine. On Git Bash 2.40 (MSYS grep 3.0 in text mode) `grep -l -e $'\r'` returns nothing for a CRLF file while `grep -lU` and `awk -v BINMODE=3` list it (measured again on the Windows host, `VD/crprobe.sh` via `matrix.sh win`). `BINMODE=3` is a gawk variable that mawk and BusyBox awk treat as a plain variable. The `cr[FILENAME]++` guard replaces `nextfile`, which older BSD awk may lack (macOS awk: unverified, read only).
- *Watched red.* Yes. `GR/` cell 15-a: plant lists `crlf.sh` (CR) and `bom.sh` (BOM), twin empty, on every SH-GATE-33 host; the Git Bash rows are in the revision's block under Verification runs. The gate plants CRLF (SC1017) and BOM (SC1082) both go to exit 1, on bash 3.2 with busybox userland too. `rg` not red: dive V09.
- *Scope.* All shell files, extensionless ones included. The fleet's authored files have 0 CR and 0 BOM today.

**SH-GATE-16 · MUST for installer and bootstrap `#!/bin/sh` scripts; SHOULD for other `#!/bin/sh` scripts.** A `#!/bin/sh` script is ASCII only, comments included.
- *Why.* yash 2.52 in a POSIX or C locale cannot read a script with any non-ASCII byte (`yash: cannot read input: Invalid or incomplete multibyte or wide character`, exit 2; passes under `LC_ALL=C.UTF-8`, fails under `LC_ALL=C`); dash, busybox ash 1.35 and 1.37, mksh, ksh93u+m, posh, bash and zsh accept it. Runtime strings with an em dash also mojibake on a C locale.
- *Verify.*
  ```sh
  git ls-files -z --cached --others --exclude-standard | xargs -0 -r shfmt -f | tr '\n' '\0' | LC_ALL=C xargs -0 -r awk 'FNR == 1 { sh = ($0 ~ /^#!\/bin\/sh/ || $0 ~ /^#!\/usr\/bin\/env sh/) } sh && /[^ -~\t\r]/ { print FILENAME ":" FNR ": " $0 }'
  ```
  The first revision's `grep -rlZ ... | xargs -0 -r grep` form is withdrawn (C18): its first stage lists any file with a line starting `#!/bin/sh` anywhere, so a `#!/bin/bash` script whose heredoc holds `#!/bin/sh` and a UTF-8 comment was reported (false positive on every GNU host), `-Z` and `-r --include` are unrecognized on busybox, and it was blind to extensionless scripts. The awk tests line 1 only (`FNR == 1`).
- *Watched red.* Yes. `GR/` cell 16-a: red prints the em dash in a comment and in a string and `café` in the `.sh` files and in the extensionless `bin/tool`; the bash-shebang twin (including one whose heredoc holds `#!/bin/sh`) and the ASCII twin print nothing. `matrix.sh posix` on the red file: yash 2.52 exit 2, the other ten interpreters 0.
- *Scope.* Bash scripts may carry UTF-8 comments (the gate's twin is green).

**SH-GATE-17 · SHOULD.** The git mode matches line 1: a shebang means `100755`, no shebang means `100644`. Fix with `git update-index --chmod=+x FILE`.
- *Why.* 93 of 186 fleet scripts with a shebang are committed `100644`; a library with `100755` is directly runnable. The mode is read from the index, so it is stable on Windows checkouts.
- *Verify.* The gate's mode loop (`scripts/shell-gate.sh`, section 3).
- *Watched red.* Yes. `GC/plant-gate.sh`, re-run on the revised gate as `GR/plant-gate.sh`: shebang plus 100644 exits 1 (`shebang but mode 100644: a.sh`), no shebang plus 100755 exits 1; green twin exits 0.
- *Scope.* All.

**SH-GATE-18 · SHOULD.** A sourced library has a `.sh` or `.bash` extension, no shebang, `# shellcheck shell=bash` (or `sh`, `dash`) as line 1, and mode `100644`.
- *Why.* Without the directive ShellCheck raises SC2148 (an error that survives `-S error`); a file with neither extension nor shebang (`lib/helpers`) is reachable by no tool. `shell=zsh` is rejected (SC1103) and a zsh file gives SC1071.
- *Verify.* `shellcheck FILE` is clean and `git ls-files -z | xargs -0 -r shfmt -f` lists it; the mode comes from SH-GATE-17.
- *Watched red.* Yes (dive §9: `FX/rc/lib/common.sh` clean; `GC/gate/lib/common.sh` clean and mode-checked, `exec2` plant red).
- *Scope.* Libraries sourced by scripts; the directive's dialect is the floor of the callers.

### F. Embedded shell and the second gate

**SH-GATE-19 · SHOULD.** Lint workflow `run:` blocks with actionlint, with the profile passed through `SHELLCHECK_OPTS='-o check-set-e-suppressed,check-extra-masked-returns,deprecate-which'`, after a `command -v shellcheck >/dev/null || exit 69` precheck. A step whose `shell:` is a path-qualified template is not linted; set `shell: bash`.
- *Why.* actionlint ignores `.shellcheckrc`; it runs ShellCheck only for `bash` and `sh` steps (never `pwsh`); it exits 0 when ShellCheck is missing; and `shell: /bin/bash -eo pipefail {0}` silently skips ShellCheck.
- *Verify.*
  ```bash
  command -v shellcheck >/dev/null || exit 69
  SHELLCHECK_OPTS='-o check-set-e-suppressed,check-extra-masked-returns,deprecate-which' actionlint
  ```
- *Watched red.* Yes (`GC/wf/drive.sh`, actionlint 1.7.12 with ShellCheck 0.11.0): defaults report SC2086; with `-o ...` also SC2310; with `--severity=warning` SC2086 and SC2310 vanish; the green workflow exits 0; no ShellCheck on PATH and `-shellcheck=/nonexistent` both exit 0 on a bad workflow; the wrapper exits 69; the `/bin/bash -eo pipefail {0}` workflow exits 0 with an unquoted `$X`.
- *Scope.* GitHub workflows (composite `action.yml` is not linted by actionlint). Run-step semantics (default shell, pipefail) belong to SH-CI.

**SH-GATE-20 · SHOULD.** The tell greps below return no output over authored scripts, or each hit is fixed or carries a same-line reason.
- *Why.* ShellCheck 0.11.0 passed `echo -e`, `readlink -f`, `sed -i`, `eval` and a literal `/tmp/` clean under `#!/usr/bin/env bash`, so a bash script that must run on macOS, Alpine or dash gets no warning. Measured: `source <(echo "x=1")` leaves `x` empty with no error on bash 3.2.57 and sets it on 4.4 and 5.2, and is a syntax error in dash; `echo -e` prints `-e` on dash. The BSD `sed -i ''` and macOS `readlink -f` limits are read only (unverified).
- *Verify.*
  ```sh
  git ls-files -z --cached --others --exclude-standard | xargs -0 -r shfmt -f | tr '\n' '\0' | xargs -0 -r grep -H -n -e 'echo -[neE]' --
  git ls-files -z --cached --others --exclude-standard | xargs -0 -r shfmt -f | tr '\n' '\0' | xargs -0 -r grep -H -n -e 'readlink -f' --
  git ls-files -z --cached --others --exclude-standard | xargs -0 -r shfmt -f | tr '\n' '\0' | xargs -0 -r grep -H -n -e 'sed -i[[:space:]]' -e 'sed --in-place' --
  git ls-files -z --cached --others --exclude-standard | xargs -0 -r shfmt -f | tr '\n' '\0' | xargs -0 -r grep -H -n -e '[ "=]/tmp/' --
  git ls-files -z --cached --others --exclude-standard | xargs -0 -r shfmt -f | tr '\n' '\0' | xargs -0 -r grep -H -n -w -e eval --
  git ls-files -z --cached --others --exclude-standard | xargs -0 -r shfmt -f | tr '\n' '\0' | xargs -0 -r grep -H -n -e 'source <(' -e '\. <(' --
  ```
- *Watched red.* Yes: all six red on the `GR/` plant (`scripts/tells.sh` and the extension-less `bin/tool`) and empty on the twin, every SH-GATE-33 host (the first revision's six `grep -rn --include='*.sh'` cells were red on `GC/rules/20/red` and empty on `green`, GNU grep only, and blind to extension-less scripts). `which` is covered exactly by SC2230 through the profile. The five `#!/bin/sh` tells (`function`, `[[`, `$'..'`, arrays, unguarded `pipefail`) are ShellCheck findings under `-s sh` (SC2113, SC3010, SC3003, SC3030, SC3040) and belong to SH-DIAL.
- *Scope.* Bash scripts that may run on macOS or Alpine. In a Linux-only pinned script a `readlink -f` or `sed -i` hit is fine with a reason. `eval "$(tool activate)"` is the intended form in documentation scripts (14 of the 16 fleet hits).

### G. The verification dialect (how every cell in this document, and in the sibling sets, is written; added 2026-10-11)

Source: `shell-gate/verify-dialect.md` (`VD/` fixtures). Hosts it measured: ubuntu:24.04 (GNU grep 3.11, findutils 4.9.0, coreutils 9.4), ubuntu:26.04 (GNU grep 3.12, findutils 4.10.0, **uutils coreutils 0.10.0**), alpine:3.22 and busybox:1.37 (BusyBox v1.37.0 grep, xargs, awk, find), alpine with GNU grep and findutils added (the control that separates "busybox" from "alpine"), and Git Bash on the Windows host (MSYS grep 3.0, findutils 4.9.0, gawk 5.0.0, git 2.40.0.windows.1). The brief's "GNU grep 3.12 on ubuntu:24.04" was a slip: 24.04 ships 3.11, 3.12 is 26.04. "uutils on ubuntu:26.04" means coreutils only; grep, xargs, find, sed and awk stay GNU or mawk there. No macOS host: BSD and macOS statements are read only.

**SH-GATE-21 · MUST.** An inline verification of non-shell files has exactly this shape: `git ls-files -z --cached --others --exclude-standard -- PATHSPEC... | xargs -0 -r grep -H -n -e PAT -e PAT2 --`. Never `grep -r`, `find | xargs grep` without `-print0`, or `rg`. Every cell in sections A to F is written to it.
- *Why.* `grep -r --include` is an unrecognized option on busybox 1.37 (exit 2 and 30 usage lines), and the error hides behind the next pipe stage: 17 of 18 representative cells came back silent there ("clean"), 17 of 17 failures masked, and 7 of 18 on Git Bash. The list from git is the list the gate already uses (SH-GATE-09), skips ignored trees and includes untracked files. `rg` is on none of the four stock images and strips a BOM.
- *Verify.* The catalog self-check, scoped to the shell set's own files (`rules/*shell-quality*` also covers `powershell-quality`); a line that must show a banned form for explanation carries `vd-ok: REASON` on the same line:
  ```sh
  git ls-files -z --cached --others --exclude-standard -- 'rules/*shell-quality*' 'skills/shell-*' 'skills/installer-script*' | xargs -0 -r grep -H -n -E -e '--include' -e '--exclude([^-]|-dir|-from|$)' -- | grep -v -e 'vd-ok: *[^ ]'
  git ls-files -z --cached --others --exclude-standard -- 'rules/*shell-quality*' 'skills/shell-*' 'skills/installer-script*' | xargs -0 -r grep -H -n -e 'grep -[a-zA-Z]*[rR]' -- | grep -v -e 'vd-ok: *[^ ]'
  git ls-files -z --cached --others --exclude-standard -- 'rules/*shell-quality*' 'skills/shell-*' 'skills/installer-script*' | xargs -0 -r grep -H -n -e '^[[:space:]]*rg ' -e '[^[:alnum:]_/.-]rg -' -- | grep -v -e 'vd-ok: *[^ ]'
  ```
- *Watched red.* Yes. `GR/` cells 21-a to 21-c and `VD/meta-cells.sh` M1, M2, M4: the planted rule file prints, the twin (which carries a banned line with a `vd-ok:` waiver, and an out-of-scope `rules/rust-quality.md` with banned forms) prints nothing, every SH-GATE-33 host. The 18 line cells rewritten to this shape: 90 of 90 runs red on the plant and green on the twin (`VD/results/final.txt`).
- *Scope.* The shell set's verification cells. The sibling sets' 1162 `--include` lines and 542 `rg` lines are not rewritten here (G9).

**SH-GATE-22 · MUST.** A cell that searches the content of shell files lists them with the SH-GATE-09 command (`... | xargs -0 -r shfmt -f | tr '\n' '\0'`), not an extension pathspec. A cell that searches workflows, Taskfiles, Makefiles, rc and config files uses a pathspec (SH-GATE-21). A cell that needs both joins the two lists in one brace group, as the cells above do.
- *Why.* An extension pathspec is blind to extensionless scripts (pyenv `libexec/pyenv-rehash:141`; `bin/tool` in the plant): the dive's own rewritten D2, G2 and E1 forms listed `'*.sh'` and inherit the blindness (C21). `files()` without `shfmt` on PATH yields an empty list and a green (`xargs: shfmt: No such file or directory`, exit 0), so SH-GATE-25 names `shfmt` in its tool list.
- *Verify.*
  ```sh
  git ls-files -z --cached --others --exclude-standard -- 'rules/*shell-quality*' 'skills/shell-*' 'skills/installer-script*' | xargs -0 -r grep -H -n -E -e "git ls-files .*'[*][.](sh|bash|bats|ksh)'" -- | grep -v -e 'vd-ok: *[^ ]'
  ```
- *Watched red.* Yes. `GR/` cell 22-a: the planted `git ls-files -z -- '*.sh'` line prints, the twin's `shfmt -f` form prints nothing, every SH-GATE-33 host. The missing-`shfmt` fault is in the SH-GATE-25 run.
- *Scope.* The shell set's cells over shell content. A cell over `*.yml` and its kin is outside.

**SH-GATE-23 · MUST.** Inside a verification, grep uses only `-E -F -e -H -n -l -L -c -o -q -s -v -w -x -i --`. Banned: `-r -R --include --exclude --exclude-dir -P -z -Z -U --null --no-messages --color -I`, and `$'..'` quoting in a grep command. A `-P` or `-z` form may be shown only as an extra labelled `(GNU grep)` beside the awk check that is run (SH-GATE-30).
- *Why.* Each banned item is unrecognized on busybox 1.37 (busybox grep has no long options at all, and `-z` only with `EXTRA_COMPAT`), except `-I`, which busybox accepts and ignores (it greps the binary); `-P` also needs a UTF-8 locale on Git Bash (`-P supports only unibyte and UTF-8 locales`, exit 2 under `LC_ALL=C`). `$'..'` is not POSIX: dash greps for the literal text (C17). The allowed set was run on all five hosts. POSIX.1-2024 grep itself has none of `-r -R -H -L -P -z`; `-H` and `-L` are in GNU, busybox and FreeBSD, so the set is the intersection of the hosts, not of POSIX.
- *Verify.*
  ```sh
  git ls-files -z --cached --others --exclude-standard -- 'rules/*shell-quality*' 'skills/shell-*' 'skills/installer-script*' | xargs -0 -r grep -H -n -E -e 'grep( +-[a-zA-Z]+)* +-[a-zA-Z]*[PzZUI]' -e 'grep .*--(null|no-messages|color)' -- | grep -v -e '(GNU grep)' -e 'vd-ok: *[^ ]'
  git ls-files -z --cached --others --exclude-standard -- 'rules/*shell-quality*' 'skills/shell-*' 'skills/installer-script*' | xargs -0 -r grep -H -n -e "grep .*[[:space:]=(][$]'" -- | grep -v -e 'vd-ok: *[^ ]'
  ```
- *Watched red.* Yes. `GR/` cells 23-a and 23-b: planted `grep -rnP`, `grep -H -n -U` and `grep -l -e $'\r'` print, twin empty, every SH-GATE-33 host (the dive's M3 looked only at the first option cluster and missed `grep -H -n -U`; the pattern above walks the cluster list). `VD/probes.sh` `grep-opt *` rows: the option table.
- *Scope.* The shell set's verification cells. BSD and macOS grep: the set is expected to work there, unverified (read only).

**SH-GATE-24 · MUST.** Pathspecs are quoted. A path match uses `'*.EXT'` (any depth) or `'DIR/*.EXT'`; an exact basename or a `Prefix*.ext` basename uses `':(glob)**/NAME'`; exclusions use `':(exclude)DIR'` or `':(exclude,glob)**/DIR/**'`. Never an unquoted `*`, a bare `'Makefile'` (root only), or `'*Makefile'` (also matches `NotMakefile`).
- *Why.* Measured on four hosts: `'*.yml'` matches `.github/workflows/ci.yml`, `sub/deep/c.yml` and `top.yml`; `':(glob)*.yml'` only the top level; `'Makefile'` the root file only; `'*Makefile'` also `NotMakefile`; `':(glob)**/Makefile'` the three real ones. An unquoted `*.yml` is expanded by the shell first and finds `top.yml` only (git glossary: without magic "`*` and `?` can match directory separators", with `:(glob)` they do not). Translation of the old cells: `--include='*.EXT'` becomes `'*.EXT'`, `--include='NAME'` becomes `':(glob)**/NAME'`, `--exclude-dir=D` becomes `':(exclude)D'`, `--exclude-dir='.git'` is deleted (git never lists it).
- *Verify.*
  ```sh
  git ls-files -z --cached --others --exclude-standard -- 'rules/*shell-quality*' 'skills/shell-*' 'skills/installer-script*' | xargs -0 -r grep -H -n -e 'git ls-files .*[[:space:]][*]' -- | grep -v -e 'vd-ok: *[^ ]'
  ```
  The bare-basename half is a reading heuristic (a pathspec that is a plain file name without `*` or a leading `:(glob)**/` is root-only); the depth table is measured, the grep for it is not.
- *Watched red.* The unquoted-glob grep: yes (`GR/` cell 24-a, planted `git ls-files -z -- *.sh` prints, twin empty). The depth table: `VD/probes.sh` section 6 and `VD/probes2.sh`, identical on u24, u26, alp and Git Bash; the nested-depth form `':(glob)*/**/NAME'` used by SH-GATE-04 is `GR/` cell 04-a.
- *Scope.* Every `git ls-files` pathspec in a cell. Run from a subdirectory, paths are relative to it (`--full-name` or `':/'` for top-relative).

**SH-GATE-25 · MUST.** The first line of a block of inline cells is the PREFLIGHT line, so a missing tool or an unusable work tree produces output instead of silence. Its tool list names every tool the block's cells use (`shfmt` for SH-GATE-22 cells, `awk` for awk cells, `shellcheck` for SH-GATE-03).
- *Why.* The git-fed shape moves the failure upstream and loses it behind the pipe: `git` not installed, not a repository, `fatal: detected dubious ownership` (a root container on a bind mount, git 2.35.2 and later), `shfmt` or `xargs` missing all print an error and leave exit 0 with empty stdout; `[ -z "$(rg ...)" ] && echo PASS` prints PASS when `rg` is absent. A script can refuse (SH-GATE-31); an inline cell can only print, so "output is the violation" must fail closed.
- *Verify.*
  ```sh preflight
  for t in git xargs grep awk shfmt; do command -v "$t" >/dev/null 2>&1 || echo "PREFLIGHT: $t missing"; done; git rev-parse --is-inside-work-tree >/dev/null 2>&1 || echo "PREFLIGHT: no usable git work tree" # vd-ok: xargs here is a tool name, not an invocation
  ```
  Healthy tree: no output. Any `PREFLIGHT:` line: stop, fix the host, rerun.
- *Watched red.* Yes. `GR/preflight.sh`: silent on the healthy plant and twin; a `PREFLIGHT:` line for not-a-repo, `git` missing, `xargs` missing, `awk` missing, `shfmt` missing and (root containers) dubious ownership, on u24, u26, alp and alpgnu; the dive's `VD/preflight.sh` is the same minus awk and shfmt. On Git Bash only the not-a-repo fault is measurable (symlinked `sh.exe` loses its DLLs, exit 127 for a reason unrelated to the fault).
- *Scope.* Every block of inline cells, in rules, skills and READMEs. `safe.directory='*'` is the standard remedy and disables a security check, so the rule asks for the failure to be visible, not for the exception.

**SH-GATE-26 · MUST.** A cell passes only when stdout is empty and stderr is empty. Do not judge by exit status through `xargs` (0, 123 and 1 all mean "no finding" somewhere; busybox inverts `grep -L`); never write `2>/dev/null` on a verification. A stderr line such as `unrecognized option`, `fatal:`, `not found`, `No such file`, `Invalid regular expression`, `bad regex` or `binary file matches` is a harness failure, not a clean result.
- *Why.* xargs maps grep's exit 1 (no match) and exit 2 (error) both to 123, measured on all hosts; `grep -L` through xargs is plant 123 / twin 0 on GNU and plant 0 / twin 123 on busybox; idioms that read empty as clean (`| grep -v`, `| wc -l`, `2>/dev/null || echo clean`, `[ -z "$(...)" ]`, `| xargs -r grep`) all turned a busybox exit 2 into "clean" (`VD/mask.sh`). The rewritten shapes print nothing on stderr on a healthy tree: 0 stderr lines in 180 of 180 runs.
- *Verify.* The silence rule is a reading rule (run the cell with stderr visible). The `2>/dev/null` half is mechanical:
  ```sh
  git ls-files -z --cached --others --exclude-standard -- 'rules/*shell-quality*' 'skills/shell-*' 'skills/installer-script*' | xargs -0 -r grep -H -n -e 'grep .*2>/dev/null' -- | grep -v -e 'vd-ok: *[^ ]'
  ```
- *Watched red.* The mechanical half: yes (`GR/` cell 26-a; `VD/meta-cells.sh` M10). The masking itself: `VD/mask.sh`, 22 rows, five busybox idioms. The stderr-silence rule: a reading rule whose premise was measured.
- *Scope.* All cells. GNU grep 3.8 and later warn on a stray backslash or `egrep`, and Alpine's build prints the warning where Ubuntu's does not, so the silence rule is also a lint for sloppy escapes.

SH-GATE-27 and SH-GATE-32 are retired, not reused, and not issued. Sibling documents cite them from the pre-renumbering dive and the topic map's X7 re-pointed those citations; reusing the numbers would make the old text resolve to a wrong rule.

**SH-GATE-28 · MUST.** Write one `-e` per top-level alternative. An xargs-fed grep carries `-H`, `-n`, a trailing `--`, and `xargs -0 -r`. Under `-E`, `|` is alternation only inside a parenthesised group; `\|` under `-E` is a literal pipe and is always wrong.
- *Why.* A one-file batch prints no file name without `-H` (`1:foo` against `a.txt:1:foo`), so the output shape would depend on how many files remain after a deletion; a tracked file named `-x.sh` makes `xargs -0 -r grep ... foo` die (`invalid option -- '.'`, exit 123 on all hosts) and `--` fixes it; without `-z`/`-0` git C-quotes `café.sh` and xargs dies on `it's.sh`. `grep -E 'a\|b'` matches the text `a|b` and nothing else (rc 1 on all five hosts), so an alternation copied from a markdown table cell goes silently dead. The dive's wording "never a pipe character inside a pattern" contradicted its own verified cells, which use grouped alternation (`([[:space:]]|$)`); the rule keeps only the part that is both measured and checkable (C20).
- *Verify.* Four greps, each printing the violation:
  ```sh
  git ls-files -z --cached --others --exclude-standard -- 'rules/*shell-quality*' 'skills/shell-*' 'skills/installer-script*' | xargs -0 -r grep -H -n -e 'xargs' -- | grep -v -e 'xargs -0 -r' -e 'xargs -r' -e 'vd-ok: *[^ ]'
  git ls-files -z --cached --others --exclude-standard -- 'rules/*shell-quality*' 'skills/shell-*' 'skills/installer-script*' | xargs -0 -r grep -H -n -e 'xargs -0 -r grep' -- | grep -v -e 'xargs -0 -r grep -[a-zA-Z]*H' -e 'vd-ok: *[^ ]'
  git ls-files -z --cached --others --exclude-standard -- 'rules/*shell-quality*' 'skills/shell-*' 'skills/installer-script*' | xargs -0 -r grep -H -n -e 'xargs -0 -r grep' -- | grep -v -e 'xargs -0 -r grep .* -- ' -e 'xargs -0 -r grep .* --$' -e 'vd-ok: *[^ ]'
  git ls-files -z --cached --others --exclude-standard -- 'rules/*shell-quality*' 'skills/shell-*' 'skills/installer-script*' | xargs -0 -r grep -H -n -E -e 'grep .*-[a-zA-Z]*E.*[\\][|]' -- | grep -v -e 'vd-ok: *[^ ]'
  ```
- *Watched red.* Yes. `GR/` cells 28-a to 28-d: planted `xargs -0 grep` (no `-r`), a grep without `-H`, a grep without `--`, and `-E ... 'foo\|bar'` print; twin empty; every SH-GATE-33 host (the first three are `VD/meta-cells.sh` M5, M6a, M6b; the fourth is new). Behaviour: `VD/probes3.sh` (`-x.sh` red without `--`, green with).
- *Scope.* All xargs-fed cells. The first grep also flags prose that mentions xargs without the flags; such a line carries `vd-ok:` or is rephrased.

**SH-GATE-29 · MUST.** No verification command sits in a markdown table cell; the cell holds the check ID and the command lives in a fenced block or a bullet.
- *Why.* GFM: a `|` in a cell must be escaped, "including inside other inline spans". markdown-it 3.0.0 cuts `` `grep -E -e 'foo|bar' f` `` at the pipe; `\|` renders as `|` but a raw read (which is how an agent reads the file) gives a backslash-pipe, an invalid shell line and a dead ERE. The binding shape is itself a pipeline, so it cannot sit in a cell. Measured in the shipped catalog at 88d5e14: 1532 table rows mention grep, rg or xargs and 69 carry `\|`.
- *Verify.*
  ```sh
  git ls-files -z --cached --others --exclude-standard -- 'rules/*shell-quality*' 'skills/shell-*' 'skills/installer-script*' | xargs -0 -r grep -H -n -e '^[[:space:]]*[|].*grep -' -e '^[[:space:]]*[|].*xargs ' -- | grep -v -e 'vd-ok: *[^ ]'
  ```
  This check uses the bracketed literal `[|]` because the pipe is what it looks for.
- *Watched red.* Yes. `GR/` cell 29-a (and `VD/meta-cells.sh` M7): a planted table row holding `git ls-files -z \| xargs ...` prints, a row naming a check ID prints nothing, every SH-GATE-33 host. Rendering: `VD/md/r.py` (markdown-it 3.0.0).
- *Scope.* The shell set's rules and skills. The catalog's checker (`check-artifacts.py`) already rejects an unescaped pipe in a table cell; this rule goes further and bans the command from the cell.

**SH-GATE-30 · MUST.** A check that needs lookaround, `-z`, multi-line or step/indent scope, a per-file first-line anchor beyond one awk one-liner, or more than two pipeline stages is a `checks/NAME.sh` script (POSIX sh, awk for the matching), not a grep with `-P` or `-z`. The awk form is the one that is run.
- *Why.* python3 is absent from every stock image (alpine, busybox, ubuntu) and awk is present on all, so awk, not a python fallback, is the portable matcher. Three structural SH-CI checks (01, 07, 11, and 22 as a fourth) became 8 to 12 line awk programs, red on the plant and green on the twin on all five hosts, while their `-Pz` originals die on busybox and on Git Bash. Awk dialect risk was tested on mawk 1.3.4, BusyBox awk and gawk 5.0.0: the programs avoid `{n,}` intervals, `\b`, `nextfile`-dependence and gawk-only functions. One known gap: the SH-CI-01 awk does not honour `defaults.run.shell`.
- *Verify.* Run the `checks/NAME.sh` script on its plant and its twin (the SH-CI owner's cells: `VD/ci-cells.sh`, which this revision re-ran on u24 and alp); the SH-GATE-23 grep flags any `-P`/`-z` line that is not labelled `(GNU grep)`.
- *Watched red.* Yes for the rewrites (`VD/ci-cells.sh`, `VD/drive.sh` `new` forms: red plant, green twin, five hosts; re-run for this revision in the SH-GATE-33 table). The rule-level grep is SH-GATE-23's.
- *Scope.* Cells that cannot be one inline ERE of about 400 characters. SH-CI owns the SH-CI awk programs; P1, P3, P4, G1 to G3, X1 and X2, E1 and E2, M1 and M2, C2 and C3 stay inline.

**SH-GATE-31 · MUST for scripts.** A `checks/` script that scans files through grep, awk or find lists them with `git ls-files -z ... >"$list" || exit 74`, fails closed on an empty list (79), prechecks its tools (69) and the work tree (78), runs `xargs -0 -r grep -s -H -n -e ... --`, maps any stderr text or xargs status above 123 to 74, prints the findings and exits 1, else 0. Reference: `VD/vd-check.sh` (POSIX sh).
- *Why.* The inline PREFLIGHT only prints; a script can also refuse. The list goes to a file by redirect, not a pipe, so git's own status counts; `grep -s` silences exactly the "tracked but deleted" message, which is common when an agent removes a file before committing. 0, 1, 69, 78, 79 are the gate's values (SH-GATE-08); 74 is `IoError` in the `cli-contract.md` table. `rules/swift-quality/checks/k07.sh:69-72` already uses the list-to-file idiom.
- *Verify.* Run the script against a plant, a twin and each fault of the table below, or read it for the six exits.
- *Watched red.* Yes. `VD/checkdrv.sh`: plant 1 (3 lines, including a `sub/Makefile` found only through `':(glob)**/Makefile'` and a file named `-x.sh` found only through `--`), twin 0, twin with a tracked-but-deleted file and a violation inside a gitignored file 0, bad regex 74, empty scope 79, not a repo 78, dubious ownership 78, git missing 69, grep missing 69; identical on u24, u26, alp and alpgnu; Git Bash runs the first six (the PATH-stripping faults and the root-only fault are not representable there). The script is `shfmt -d -i 4 -ci` clean and ShellCheck-clean with the profile.
- *Scope.* Scripts that scan; `scripts/shell-gate.sh` meets the intent through its own exit map (0, 1, 69, 74, 78, 79) because it hands the file list to ShellCheck and shfmt rather than to grep.

**SH-GATE-33 · SHOULD.** A supported verification host is any host where the PREFLIGHT line prints nothing and grep, xargs, awk and find behave as the portable set: GNU grep 3.11 or 3.12, busybox 1.37 with git installed, uutils coreutils 0.10.0 on ubuntu:26.04, Git Bash with git. Bare busybox and alpine images are not verification hosts until git (and bash, shfmt, shellcheck for the gate) are installed.
- *Why.* Busybox 1.37 is a supported executor, not a supported authoring environment: every cell in this document runs there once `git` is installed, but stock alpine:3.22 and busybox:1.37 have no git, bash (alpine), python3, rg, shfmt or shellcheck, and `shell-gate.sh` is `#!/usr/bin/env bash`. uutils coreutils 0.10.0 changes nothing: 149 of 151 probe rows identical to u24 (the two that differ are the tool-version banners), and the verdict-carrying tools (grep, xargs, find, sed, awk) are not uutils on 26.04; uutils `findutils` and `diffutils` were not covered.
- *Verify.*
  ```bash
  docker run --rm -v "${PWD}:${PWD}" -w "${PWD}" alpine:3.22 sh -c 'apk add --no-cache git >/dev/null && git config --global --add safe.directory "*" && sh CHECK'
  ```
  `CHECK` is a file holding the cell; it prints nothing on a compliant repo. The same cell on the bare image prints a `PREFLIGHT:` line (SH-GATE-25).
- *Watched red.* Yes. `GR/runhosts.sh`: every cell of this document, plant and twin, on u24, u26, alp, alpgnu (and the WSL host under `sh`, `bash` and `zsh -f`); the per-host result is in the revision's block under Verification runs. Bare-image failure: `VD/results/stock-new-v1` (exit 0, stderr `git: not found`).
- *Scope.* Runner and container choice for the gate and the catalog's cells. BSD and macOS userland, GHA windows-2025 Git Bash 5.3.15 (the host's is 5.2.15), and uutils findutils: not run (G10).

**SH-GATE-34 · CONSIDER.** `git grep --untracked` may be used inside a script, for a single-line pattern with no leading slash, when an honest exit status (0 match, 1 none, 128 fatal) is wanted.
- *Why.* One process, no xargs 123 conflation, `-P` and `--and --not` work even on Alpine (git's own PCRE2). Limits: on Git Bash `git.exe` is a native binary and MSYS rewrites POSIX-looking arguments, so `git grep -e '^#!/bin/sh'` and `-e '/etc/passwd'` return nothing with rc 1 and no error (`MSYS_NO_PATHCONV=1` or `[/]` fixes it); no per-file first-line anchor, so the SH-GATE-16 check is a false positive on every GNU host; default `git grep` ignores untracked files; it prints C-quoted names.
- *Verify.* Reading heuristic; the cells themselves ran: ten `gg` variants, 9 red/green and the first-line false positive on the four Linux hosts, 8 red/green and 2 path-converted misses on Git Bash (`VD/results/*.cells.txt`, rows `gg`).
- *Scope.* Scripts, not inline cells.

### Dive ID map

The first dive (`lint-format-profile.md`) numbered its candidates 01 to 33; the second (`verify-dialect.md`) uses `VD-nn`. Rule IDs 01 to 20 keep the numbers the first consolidation issued; 21 and above continue the sequence.

| This document | Dive candidates |
|---|---|
| 01 | 01 |
| 02 | 02, 33 |
| 03, 04 | 03, 04 |
| 05 | 05, 29 |
| 06 | 06, 30 |
| 07 | 07 |
| 08 | 08, 09 |
| 09 | 10, 11, 25, 28 |
| 10 | 12 |
| 11 | 17, 18, 26 |
| 12 | 13, 14 |
| 13 | 15, 16 |
| 14 | 19 |
| 15 | 20, 21 |
| 16 to 18 | 22, 23, 24 |
| 19 | 27 |
| 20 | 31 (b dropped, h to l delegated) |
| dropped | 32 ("keep gate commands one line per tool"): reading heuristic with no check; the single `bash scripts/shell-gate.sh` call subsumes it, and Taskfile interpreter limits belong to SH-CI |
| 21 | VD-01 (the cells of 01 to 20 are rewritten to it) |
| 22 | VD-02 (conflict C21) |
| 23 | VD-03 |
| 24 | VD-04 |
| 25 | VD-05 |
| 26 | VD-06 |
| 28 | VD-07 (wording changed, C20) |
| 29 | VD-08 |
| 30 | VD-09 |
| 31 | VD-10 |
| 33 | VD-13 |
| 34 | VD-14 |
| 15 (verify cell replaced) | VD-11 (C17) |
| 01, 02, 04 to 09, 12, 13, 16, 20 (verify cells replaced) | VD-12, applied (C16) |
| 27 and 32 | Not issued: the pre-renumbering dive's SH-GATE-27 and SH-GATE-32 were cited by sibling documents, and the topic map's X7 re-pointed those citations. Both numbers are retired and not reused, so an old citation cannot resolve to a wrong rule; the actionlint rule is SH-GATE-19. |

### Verification runs of the first consolidation (trimmed)

```text
## severity (ShellCheck 0.9.0, 0.10.0, 0.11.0 identical; gcc format prints info as "note")
4:6 note SC2086   5:7 warning SC2046   6:4 error SC2068   7:8 warning SC2155   8:1 note SC2162   9:1 warning SC2164
0.11.0 -S warning            -> SC2046 SC2068 SC2155 SC2164 only
0.11.0 -S warning -o check-set-e-suppressed,check-extra-masked-returns,deprecate-which sev-e.sh -> (no output) exit 0

## bash -n (GC/bashn/drive.sh)            unterminated.bash   missingfi.bash   good.bash
bash 3.2 / 4.4 / 5.1                          exit 0              exit 2          exit 0
bash 5.2 / 5.3                                exit 1              exit 2          exit 0
whole gate (shellcheck + shfmt) on the same unterminated array: exit 1, SC1073 (also on bash 3.2 + busybox)

## CR after the shebang (GC/crlf/)
bash: ./crlf.sh: /bin/sh^M: bad interpreter: No such file or directory   -> exit 126
sh -c ./crlf.sh (dash): ./crlf.sh: not found                              -> exit 127
./bom.sh: line 1: <BOM>#!/bin/sh: No such file or directory ; hi          -> exit 0

## shfmt (GC/ec/drive.sh)                  3.12.0   3.13.0   3.14.1
shfmt -d a.sh   (EditorConfig)               0        0        0
shfmt -d two.sh (2 spaces vs config)         1        1        1
shfmt -d -i 4 a.sh (flag bypasses EC)        1        1        1
shfmt -d -i 4 -ci a.sh                       0        0        0
shfmt -l two.sh                              0        1        1
shfmt -d alt/a.sh (case_indent spelling)     1        1        1
shfmt -f=0 a.sh .editorconfig   3.13.0 "a.sh"   3.13.1 "a.sh|.editorconfig|"   3.14.1 "a.sh"
[[shell]] section, extensionless bin/tool with four spaces: with -> exit 0, without -> exit 1 (3.12.0, 3.13.1, 3.14.1)

## discovery fixture (LF/disc-final.sh, 14 shell files of 20 tracked)
git ls-files '*.sh' : 5      shfmt -f . : 12 + node_modules      git|shfmt -f (3.13.1): 12      (3.14.1): 13

## parse-only (GC/parse/drive.sh)          broken / good
shellcheck, shfmt, zsh -fn                    1 / 0
fish --no-execute (3.6.0 4.0.2 4.7.0 4.9.3)   127 / 0
nu-check wrapper (0.105.1 0.116.0)            1 / 0 ;  nu --ide-check 10 -> 0 / 0 ;  nu -c 'nu-check F' alone -> 0 / 0
elvish -compileonly 0.21.0                    2 / 0
dash -n                                       2 / 0
pwsh ParseFile 7.6.6                          1 / 0

## actionlint 1.7.12 + ShellCheck 0.11.0 (GC/wf/drive.sh)
defaults SC2034 SC2086 exit 1 | SHELLCHECK_OPTS=-o... adds SC2310 | --severity=warning leaves SC2034 only
no shellcheck on PATH: exit 0 | -shellcheck=/nonexistent: exit 0 | /bin/bash -eo pipefail {0}: exit 0 | wrapper: exit 69

## integrated gate (GC/plant-gate.sh), 33 plants and twins
green 0 | SC2086 1 | bad indent 1 | CRLF 1 | BOM 1 | non-ASCII sh 1 (bash twin 0) | 100644+shebang 1 | 100755 no shebang 1
bad .zsh/.fish/.nu/.elv 1 (good twins 0) | broken .sh 1 | unterminated .bash 1 | vendor not excluded 1 (pathspec twin 0)
no rc 78 | no editorconfig 78 | no files 79 | PATH without shellcheck 69 | without shfmt 69 | .fish present, no fish 69 | both tools 0
bash 3.2.57 + busybox userland: green 0, crlf/bom/nonascii/exec1/badarr 1, nuok 69 (no nu on PATH)
gate script lints clean under ShellCheck 0.9.0, 0.10.0, 0.11.0 (an earlier draft that passed a function by name failed 0.9.0/0.10.0 with SC2317 and 0.11.0 with SC2329)

## other
Task 3.53.1 precondition "No *.sh files found, skipping shellcheck": task exits 201 (loud)
busybox:1.37 grep --include: "unrecognized option" ; bash 3.2 source <(echo x=1): x empty ; dash: Syntax error "(" unexpected
bats: shellcheck 0.9.0/0.10.0/0.11.0 report SC2164 and SC2086 inside @test/setup; shfmt -f lists *.bats
yash 2.52: non-ASCII script exit 2 (LC_ALL=C), exit 0 (LC_ALL=C.UTF-8); other 10 posix-family interpreters exit 0
fleet re-run (LF/quant/quant.py, ShellCheck 0.11.0): 65 default findings, 57 hidden by -S warning (88%), 260 added by the optional checks (SC2312 191, SC2310 69, 57 files), 0 of those visible at -S warning
```

### Verification runs of the 2026-10-11 revision (trimmed)

```text
## every cell of this document, plant (P) and twin (T): 41 cells, 82 runs per host (GR/gen.py, GR/runhosts.sh, GR/win-cells.sh; results/*.cells.txt)
red = P prints on stdout, T prints nothing, stderr empty on both (SH-GATE-26)
ubuntu:24.04   sh = dash 0.5.12, GNU grep 3.11, findutils 4.9.0, coreutils 9.4        41/41
ubuntu:26.04   sh = dash, GNU grep 3.12, findutils 4.10.0, uutils coreutils 0.10.0     41/41
alpine:3.22    sh = busybox ash, BusyBox 1.37.0 grep/xargs/awk/find, git added         41/41
alpine:3.22 + GNU grep + GNU findutils (the control)                                   41/41
WSL host       cells run under bash (its /bin/sh), bash, and zsh -f                    41/41 each
Git Bash 5.2.15 (MSYS grep 3.0, findutils 4.9.0, gawk 5.0.0, git 2.40.0.windows.1)    41/41
no cell skipped on any host; shellcheck 0.11.0 and shfmt 3.13.1 on PATH for 03-a and the SH-GATE-22 listing

## PREFLIGHT line (GR/preflight.sh), ubuntu:24.04, ubuntu:26.04, alpine, alpine+GNU
healthy tree: no output, rc 0, stderr empty
not a repo | git missing | xargs missing | awk missing | shfmt missing | dubious ownership (root container, bind mount):
  each prints one or two "PREFLIGHT:" lines, rc 0, stderr empty
Git Bash: only "not a repo" is representable (a symlinked sh.exe loses its DLLs)

## the first consolidation's cells on busybox 1.37 (GR/old-greps.sh over the GC/greps.sh trees)
28 cells x 2 trees: 25 cells print "grep: unrecognized option: include=..." (or "Z"), the other 3 use no --include/-Z
ubuntu:24.04: 0 of 28; on busybox the red tree and the green tree print the same usage text, so a status-blind reader sees no difference

## Git Bash 5.2.15, CR probe (VD/crprobe.sh, re-run)
grep -l -e $'\r' : (empty)   grep -lU -e $'\r' : crlf.sh   grep -lP '\r' : "-P supports only unibyte and UTF-8 locales"
awk '/\r/' : (empty)   awk -v BINMODE=3 '/\r/' : crlf.sh

## revised gate, scripts/shell-gate.sh (GR/gate-rev.sh)
Git Bash 5.2.15 (GR/win-gate.sh):  green 0 | CRLF .sh 1 | CRLF + extensionless 1 | BOM only 1 | non-ASCII in sh 1 | unterminated array 1 | green again 0 | not a repo 78
bash 3.2.57 + BusyBox 1.37 (GR/bash32-inner.sh):  green 0 | CRLF .sh 1 | CRLF extensionless 1 | BOM only 1 | non-ASCII in sh 1 | unterminated array 1 | green again 0 | not a repo 78
integrated plants (GR/plant-gate.sh): exits as the first gate, plus tracked file deleted 74 (first gate: 123), .git removed 78, run from a subdirectory 78, CRLF in an extensionless script 1, CRLF in a .zsh 1, BOM only 1
PATH strip (GR/pathstrip.sh): no tools 69 | shellcheck only 69 | both 0 | awk, xargs or grep removed 69
lint with the shipped .shellcheckrc and .editorconfig: ShellCheck 0.9.0, 0.10.0, 0.11.0 clean; shfmt 3.11.0, 3.12.0, 3.13.1, 3.14.1 clean

## dive re-runs (VD/)
docverify.sh (every command of the dive's candidate rules) ubuntu:24.04 and alpine: 10 of 10 plant runs print, 11 of 11 twin runs silent; VD-05 prints nothing on a healthy tree by design
ci-cells.sh ubuntu:24.04 and alpine: PCRE originals die on busybox ("grep: unrecognized option: P", rc 2, 30 stderr lines); the awk rewrites C7, C11, C22 are red on the plant and green on the twin on both
checkdrv.sh (the SH-GATE-31 reference script) ubuntu:24.04 and alpine: plant 1 (3 lines) | twin 0 | tracked-but-deleted 0 | bad regex 74 | empty scope 79 | not a repo 78 | git missing 69 | grep missing 69 | dubious ownership 78
```

## Applied to the fleet and exemplars

Fleet repos were read at ocx@3485207c183e, grimoire@4650ad830375, www-setup@a251c3631047, setup-grimoire@1259e35b2550, rules_ocx@5d4b3309a4cd. Counts come from the audits and the dive's `quant/` re-run.

### Already satisfied

| Rule | Where | Evidence |
|---|---|---|
| 01 | grimoire, www-setup run ShellCheck at default severity; acme.sh, docker-install, rustup too | grimoire@4650ad830375:taskfiles/shell.taskfile.yml:13; www-setup@a251c3631047:taskfiles/shell.taskfile.yml:9 (no `ARGS`); acme.sh@807da6498377:.github/workflows/shellcheck.yml:29; docker-install@2b32480025b2:.github/workflows/ci.yml:29; rustup@61271d00a979:.github/workflows/ci.yaml:1676-1678 |
| 05 | reasoned directives | www-setup@a251c3631047:src/install.sh:5; rustup@61271d00a979:rustup-init.sh:3 (reason present, code stale: see below) |
| 08 | ocx's empty-list precondition fails the task (the word "skipping" misleads) | ocx@3485207c183e:taskfiles/shell.taskfile.yml:33-34; Task 3.53.1 exit 201 (measured) |
| 09 | exemplar discovery by `find -print0` with shebang sniff | atuinsh/atuin@56525ac6a7a9:.buildkite/scripts/shellcheck.sh:1-27 |
| 11 | per-family parse gates for fish, nu, elvish | www-setup@a251c3631047:taskfiles/nu.taskfile.yml:16-19 (diagnostic-grep variant), taskfiles/elvish.taskfile.yml:13, .github/workflows/verify.yml:67,91; zoxide pipes emitted code through eight parsers (ajeetdsouza/zoxide@86b443cffcd7:src/shell.rs:57-229) |
| 12 | EditorConfig-driven shfmt | mise `.editorconfig` 0 dirty of 1,396 files (jdx/mise@19e8c8f0d03d); fzf `[*.{sh,bash,fish}]` |
| 13 | lockfile or exact pin | `ocx.lock` in ocx, www-setup, rules_ocx, find_ocx, grimoire; setup-grimoire installs shfmt v3.13.1 and actionlint 1.7.12 by version plus sha256 (setup-grimoire@1259e35b2550:.github/workflows/test.yml:60-76); acme.sh pins shfmt v3.1.2, bats-core v3.5.1 |
| 14 | `* text=auto eol=lf` | ocx and grimoire `.gitattributes:2` |
| 15 | no CR or BOM in the 197 authored files | `LF/quant/hyg.out`: CRLF 0, BOM 0 |
| 19 | exemplar that disables the embedded ShellCheck on purpose | k3s-io/k3s@82a6ddcd820b:.github/workflows/actionlint.yaml:19-20 (`shellcheck: false`) |
| 21 | the git-fed shape, for a formatter instead of a grep: quoted pathspecs, `-z` and `-0` | rules/swift-package/gates.md:51; rules/cmake-build.md:59 (`git ls-files -z -- '*CMakeLists.txt' '*.cmake' \| xargs -0 -r gersemi --check`) |
| 29 | commands in a fenced block, not in table cells | rules/nix-quality.md:45-54 (the gate sequence is one fenced block); rules/rust-quality: 275 table rows name a command and none carries `\|` (dive F11) |
| 31 | the list-to-file idiom with a fail-closed scan | rules/swift-quality/checks/k07.sh:69-72 (`hatches()`: `git ls-files -z --cached --others --exclude-standard -- '*.swift' ...` into a `mktemp` file, then `xargs -r -0 awk`) |
| 24 | quoted pathspecs, `:(exclude)` and `:(exclude,glob)` | rules/swift-quality/checks/k07.sh:71 (`':(exclude,glob)**/Tests/**' ':(exclude)*.pb.swift'`) |

### Violated

| Rule | Where | Evidence |
|---|---|---|
| 01 | ocx gate, ocx embedded actionlint, ocx rule text, setup-grimoire gate, `quality-bash.md` in four repos, two exemplars | ocx@3485207c183e:taskfiles/shell.taskfile.yml:38, taskfiles/ci.taskfile.yml:24, .claude/rules/subsystem-ci.md:133; setup-grimoire@1259e35b2550:Taskfile.yml:25-26; grimoire@4650ad830375:.claude/rules/quality-bash.md:94 (also index, ocx, grimoire-vscode); starship/starship@d4d0459c5c24:.github/workflows/install-script.yml:19; atuinsh/atuin@56525ac6a7a9:.buildkite/scripts/shellcheck.sh:5. Cost of fixing, measured: 8 SC1091 in ocx, 0 SC2086 in the four gated repos; the 30 SC2086 sit in ungated oras-www |
| 02 | no `.shellcheckrc` in 149 repos; exemplar rcs carry no profile keys | [cfg] §6.2; mise@19e8c8f0d03d:.shellcheckrc:1-6, shellspec@f2d13f991885:.shellcheckrc:1 |
| 06 | stale suppression | rust-lang/rustup@61271d00a979:rustup-init.sh:3 `disable=SC2039` (retired in 0.7.2) |
| 08 | tool missing or empty list is a pass | grimoire@4650ad830375:taskfiles/shell.taskfile.yml:11 (`no shell scripts`, exit 0), :15 and :20 (`not installed — skipping`, exit 0; `LF/task-drive.sh` exit 0); actionlint jobs never check for ShellCheck (www-setup `verify.yml` actionlint job uses the runner's ShellCheck: unverified) |
| 09 | glob or hand-written discovery | ocx@3485207c183e:taskfiles/shell.taskfile.yml:37,47 (`'*.sh'` only, `tr '\n' ' '`); grimoire@4650ad830375:taskfiles/shell.taskfile.yml:10 (no `.bats`, `echo "$files" \| xargs` splits on spaces); www-setup@a251c3631047:taskfile.yml:29,36 (`GLOB: '*.sh'`: 7 `.bats` and 2 `.bash` unlinted); setup-grimoire@1259e35b2550:Taskfile.yml:25-27 (hand list: 6 of 8 tracked shell files unlisted); starship@d4d0459c5c24:.github/workflows/install-script.yml:19,34 (`install/install.sh` never linted); docker-install@2b32480025b2:.github/workflows/ci.yml:29. 10 `.bats` files (1,997 lines) are in no gate |
| 12 | shfmt flags bypass EditorConfig, and there is no `[*.sh]` section anywhere | ocx@3485207c183e:taskfiles/shell.taskfile.yml:48; grimoire@4650ad830375:taskfiles/shell.taskfile.yml:18; www-setup@a251c3631047:taskfiles/shell.taskfile.yml:11; setup-grimoire@1259e35b2550:Taskfile.yml:27; exemplars zoxide, direnv, acme.sh; [cfg] §6.2 (no shell keys in any fleet `.editorconfig`) |
| 13 | ShellCheck taken from the runner image; unpinned installs | setup-grimoire@1259e35b2550:.github/workflows/test.yml:55 ("shellcheck ... on the image"), no `ocx.lock`; starship@d4d0459c5c24:.github/workflows/install-script.yml:30 (`webi.sh/shfmt`). Floating tags in `ocx.toml` (`shfmt:3`, `shellcheck:latest`) are compliant only because the lock exists |
| 14 | no eol attribute | www-setup (`.gitattributes` is `ocx.lock merge=union`), setup-grimoire (none): both hold `install.sh` and `.bats` that Windows checkouts will convert |
| 16 | non-ASCII in `#!/bin/sh` | 21 of 31 authored sh scripts: www-setup 11, grimoire 5, ocx-sdk-python 2, setup-grimoire 2, obere-heide-planer 1; runtime strings in www-setup@a251c3631047:scripts/gen-dist.sh:247 and the installer `src/install.sh` (114 bytes, [inst]); 24 non-comment lines. Installer = MUST |
| 17 | shebang scripts committed 100644 | 93 of 186: ocx 80, grimoire 4, setup-grimoire 3, www-setup 3, find_ocx 1, ocx-sdk-python 1, rules_ocx 1 |
| 19 | embedded ShellCheck at a severity floor | ocx@3485207c183e:taskfiles/ci.taskfile.yml:24 `SHELLCHECK_OPTS: '--severity=warning'` |
| 20 | tell hits over the 197 authored files (re-run `GC/tellscan.sh`) | `echo -e` 0; `readlink -f` 2 (ocx-mirror/test/bazel_accept.sh:26,52); `sed -i` without suffix 2 real (ocx/test/manual/scripts/setup-integrations.sh:79, bootstrap.sh:138; www-setup/src/install.sh:47 is a comment); literal `/tmp/` 4; `source <(` 0; `eval` 16, 14 of them the intended `eval "$(ocx ... --shell=bash)"` form |
| 21, 23, 24 | `grep -r --include` and `--exclude-dir` in shipped cells: busybox 1.37 rejects them, the error hides behind the next pipe stage | rules/swift-quality/checks/k07.sh:44-65 (`P=(--include='*.swift' --exclude-dir='.build' ...)` and `grep -rn "${P[@]}"` in 15 checks); rules/nix-quality.md:46-49; 1162 `--include` lines in the shipped catalog (dive F13; 1153 re-counted in `rules/` and `skills/`); 102 in the six sibling consolidations (`shell-pwsh.md` 29, `shell-ci.md` 24, `shell-errexit.md` 16, `shell-expansion.md` 16, `shell-emit.md` 12, `shell-dialect.md` 5). Hand-off, G9 |
| 21 | `rg` in cells: absent from all four stock images, strips a BOM | 542 `rg` lines in the shipped catalog (dive F13); `shell-errexit.md:100` |
| 23, 30 | `-P`, `-z`, `-Z` in cells: unrecognized on busybox, `-P` needs a UTF-8 locale on Git Bash | `shell-pwsh.md` 13 lines (90, 128, 134, 146, 166, 177, 231, 237, 256, 283, 294, 358, 366), `shell-ci.md` 12 (63, 70, 95, 105, 112, 118, 125, 146, 178, 238, 260, 374), `shell-dialect.md` 2. SH-CI's structural cells C7, C11 and C22 already have awk rewrites (`VD/ci-cells.sh`, re-run for this revision on ubuntu:24.04 and alpine: the PCRE originals die with `unrecognized option: P`, the awk forms are red on the plant and green on the twin) |
| 28 | `git ls-files \| grep -E \| xargs -r grep -n`: no `-z`, `-0`, `-H` or `--` | rules/bazel-quality/caching.md:62 |
| 29 | commands with `\|` in a markdown table cell | 69 of 1532 table rows that mention grep, rg or xargs in the shipped catalog at 88d5e14 (dive F13); `rules/bazel-quality/cpp.md` alone has 9 |
| 31 | exit codes outside the table | rules/swift-quality/checks/never-gate.sh:7-9 (123 for a finding, 65, 66; reported, C10) |
| 15 | the first revision's own check: `grep -l -e $'\r'` in this document's SH-GATE-15 cell and in its gate script, blind on Git Bash and dash | fixed in place (C17) |

### New commitments for the fleet

1. **Ship the four files** (`.shellcheckrc`, `.editorconfig`, `.gitattributes`, `scripts/shell-gate.sh`) into every repo that holds shell, and reduce each repo's shell task to one line, `bash scripts/shell-gate.sh`. That replaces ocx, grimoire, www-setup and setup-grimoire's four different gates and closes SH-GATE-01, 08, 09, 12, 14 at once.
2. **Adoption cost to budget:** 65 default-severity findings (8 SC1091 disappear with `source-path`), 260 optional-check findings in 57 files (ocx 120, www-setup 83, setup-grimoire 14, oras-www 13), and 36 of 197 files dirty under the four-space style. ocx, www-setup and setup-grimoire carry most of it.
3. **Rewrite the prescriptions that teach agents the wrong gate:** `quality-bash.md` (`-S warning` at :94, the `shfmt -i 4 -ci` flag form at :101) in grimoire, index, ocx, grimoire-vscode, and `ocx/.claude/rules/subsystem-ci.md:133`. Reported, not edited here (Q6).
4. **The ocx emitter and its tests** (`crates/ocx_shell`, `ocx_setup`): any test that checks emitted code uses the SH-GATE-11 commands as the oracle. The wave-1 emitter audit's own parse sweep used `bash -n` (emitters-compared.md:62), so an unterminated compound assignment on bash 3.2 to 5.1 would have passed there.
5. **Installers** (`www-setup/src/install.sh`, grimoire's cargo-dist front door): the installer's ASCII requirement (SH-GATE-16) is a MUST before the next release.
6. **Pin ShellCheck for setup-grimoire** (add `ocx.toml` plus `ocx.lock`, or an exact version with sha256 as for shfmt) before `ubuntu-latest` moves to 26.04.
7. **Write the shell set's verification cells in the SH-GATE-21 dialect and ship the PREFLIGHT line** with the catalog self-check cells (21-a to 21-c, 22-a, 23-a, 23-b, 24-a, 26-a, 28-a to 28-d, 29-a), scoped to `'rules/*shell-quality*' 'skills/shell-*' 'skills/installer-script*'` so the other sets are not flagged. Hand the six sibling consolidations (`shell-pwsh.md`, `shell-ci.md`, `shell-errexit.md`, `shell-expansion.md`, `shell-emit.md`, `shell-dialect.md`: 102 `--include` lines, 27 `-P` lines) the translation table of SH-GATE-24 and the awk rewrites of SH-GATE-30; this document does not edit their text.
8. **Put a `checks/NAME.sh` script (SH-GATE-31) behind any cell that needs lookaround, multi-line scope or more than two pipeline stages**, and keep inline cells to one `-e` per alternative (SH-GATE-28). The SH-CI owner takes C7, C11 and C22 as the first three.
9. **Decide before the catalog checker grows a directory-operand rule** (G9): `check-artifacts.py` lints only table-row code spans today, so the binding shape passes; a rule that demands a directory operand for `grep` would reject an xargs-fed grep, and needs an exemption for a grep whose operands come from `xargs`.

## AI-agent failure modes

Ranked by how often the failure appears in the measured fleet and corpus; each has a mechanical check.

| # | Failure | How often it bites | Check |
|---|---|---|---|
| 1 | Adds `-S warning` or `--severity=warning` "to cut noise", copied from the repo's own gate and rule text | 3 fleet gates, 4 fleet rule copies, 2 exemplars; hides 88% of default findings and all optional checks | SH-GATE-01 grep |
| 2 | Lints a hand-written list or `git ls-files '*.sh'` / `**/*.sh` | 4 of 4 fleet gates; 2 exemplars skip their own installer; 10 `.bats` and 5 `.bash` files unlinted | SH-GATE-09 grep, `shfmt -f` list diff |
| 3 | Adds "if not installed, skip" or `\|\| true` so the gate "works everywhere" | grimoire gate; actionlint exits 0 without ShellCheck | SH-GATE-08 PATH-strip run and grep |
| 4 | Silences a finding with `# shellcheck disable=` and no reason, or on SC2155 or SC2164, or keeps `SC2039` | 87.5% of 1,185 exemplar directives carry no reason; rustup still has SC2039 | SH-GATE-05, 06 greps |
| 5 | Passes `shfmt -i 2 -ci -d` "to match a house style", bypassing `.editorconfig` | 4 fleet gates, 3 exemplars; agents write two-space unsupervised (97 of 129 scratch files) | SH-GATE-12 grep; `shfmt -d` with no flags |
| 6 | Writes em dashes in `#!/bin/sh` comments and messages | 21 of 31 authored sh scripts | SH-GATE-16 grep |
| 7 | Creates a script with `cat > file` and never `chmod +x` | 93 of 186 shebang scripts are 100644 | SH-GATE-17 (gate loop) |
| 8 | Installs ShellCheck or shfmt with apt, brew or webi, or trusts the runner | setup-grimoire, starship | SH-GATE-13 greps |
| 9 | Trusts `bash -n`, `nu --ide-check` or bare `nu-check` exit codes, or expects fish to return 1 | folk answer; all three measured wrong | SH-GATE-11 table |
| 10 | Puts `severity=warning` or `shell=bash` in `.shellcheckrc`, adds a nested rc "for tests", mistypes `enable=` | all three silent no-ops or silent drops | SH-GATE-02 to 04 |
| 11 | Writes a prose comment starting `# shellcheck ...` | breaks the file (SC1073) | the gate run itself |
| 12 | Pastes `shfmt -f=0` with `xargs -0` "for safety" | exact 3.13.1 regression | SH-GATE-09 grep |
| 13 | Writes `case_indent = true` or `language_dialect` from master docs into `.editorconfig` | ignored by 3.14.1 | SH-GATE-12 second grep |
| 14 | Runs the verification commands in the owner's zsh (unquoted `$vars` do not split, `=cmd` expands, an unmatched glob aborts; `-v $T:ro` in a docker line is the `:r` modifier and mounts `/tmp/x.d/yo` for `T=/tmp/x.d/y.z`, measured) | hit three times in the first consolidation, twice in the first dive, once more in this revision | run checks from a `sh` or `bash` driver; write `${T}:ro`; the cells themselves are quoted and run under `zsh -f` (SH-GATE-33) |
| 15 | Saves a script in CRLF or with a BOM (Windows editors, PowerShell 5.1 `-Encoding UTF8`) | 0 in the authored fleet today, high on Windows | SH-GATE-14, 15 |
| 16 | `echo -e`, `readlink -f`, `sed -i`, `source <(...)`, `eval` in a script meant for macOS or Alpine | rare in maintained code (0 `echo -e` in 197 files) but silent when it hits (bash 3.2 `source <(...)` does nothing) | SH-GATE-20 greps |
| 17 | Writes a check as `grep -r --include='*.EXT' ...`, the form of the first revision and of every sibling set | 1162 lines in the shipped catalog; 25 of the first revision's 28 cells die with `unrecognized option` on busybox 1.37 | SH-GATE-21 and 23 cells |
| 18 | Reaches for `-P`, `-z` or `rg` for lookaround and multi-line scope | 27 `-P` lines in three sibling documents, 542 `rg` lines in the catalog; `rg` is absent from all four stock images and strips a BOM | SH-GATE-21 and 23 cells; awk in a `checks/` script (SH-GATE-30) |
| 19 | Judges a cell by its exit status, adds `2>/dev/null`, or reads empty output as clean | five busybox idioms turned a grep exit 2 into "clean" (`VD/mask.sh`); xargs gives 123 for both "no match" and "error" | SH-GATE-26 (the `2>/dev/null` cell, and a visible stderr) |
| 20 | Puts a verification command with `\|` in a markdown table cell, or `\|` in an `-E` pattern | 69 of 1532 rows in the shipped catalog; `\|` under `-E` is a literal pipe and the alternation is dead | SH-GATE-28 and 29 cells |
| 21 | Writes `xargs grep` without `-0 -r -H --`, or an unquoted `git ls-files -- *.yml` | a tracked file named `-x.sh` kills the cell (123); the shell expands the glob first and the list is `top.yml` only | SH-GATE-24 and 28 cells |
| 22 | Lists shell files with an extension pathspec inside a cell, or finds CR with `grep -e $'\r'` | extensionless scripts are missed; on dash and Git Bash the CR cell is silent on a CRLF file | SH-GATE-22, 23 and 15 cells |
| 23 | Trusts the git-fed shape when git is missing, the directory is no repository, or git refuses it (a root container on a bind mount) | exit 0, empty stdout, the error on stderr only | the PREFLIGHT line (SH-GATE-25) |

## Open questions

| # | Question | Default the program applies |
|---|---|---|
| G1 | SC2310 and SC2312 as a hard gate cost 260 findings in 57 fleet files on day one. Fix, suppress per site, or demote? | Keep both `enable=` lines in the profile as MUST for new and touched repos. Existing gated repos land the rc with a burn-down in the same change; per-site `disable=SC2312 # reason` is allowed where the masking is intended. SH-ERR decides which sites are real once it reads them. |
| G2 | The SH-CI dive recommends actionlint under `--severity=warning`; this document forbids it (C12). | SH-GATE-19 stands: no severity anywhere. The SH-CI consolidation must not restate the floor; 18 info and style findings fleet-wide are fixed or suppressed per site. |
| G3 | May a per-site SC2086 or SC2046 directive exist? | Yes, when the reason says "split" or "glob" (SH-GATE-06). Never in an rc. |
| G4 | Exit code for "no shell files": 79 (`cli-contract` `NotFound`) or sysexits 66 (used by `swift-quality/checks/never-gate.sh:7-9`)? | 79, mirroring the Rust table; findings keep the wrapped tool's 1. The swift checks are reported to their owner. |
| G5 | Where does `shell-gate.sh` live in the published set? | Ship it as `shell-quality/checks/shell-gate.sh` (precedent: nine `checks/*.sh` in swift-quality) and let the index tell adopters to copy it to `scripts/`. If the artifact checker cannot carry a `checks/` file for a rule with depth files, fall back to a fenced block in `gates.md`. |
| G6 | Is a floating tag plus a committed lockfile an acceptable pin? | Yes (C11). Exact version otherwise. |
| G7 | Four-space style of record versus the corpus majority of two spaces (54%)? | Four spaces (161 of 197 fleet files clean); an adopter's own `.editorconfig` wins (SH-GATE-12). |
| G8 | Extension on authored scripts (map owner Q8)? | SHOULD carry an extension (SH-GATE-18, SH-CORE); the gate finds shebang files regardless. |
| G9 | The shipped catalog has 1162 `--include` lines and 542 `rg` lines, and the six sibling consolidations 102 and 27 `-P` lines; all die or mask on busybox 1.37 (dive M-X-05). Label them `(GNU grep)` and `(rg)` and add the PREFLIGHT line, or rewrite them mechanically through the SH-GATE-24 translation table? | The shell set adopts the dialect now (SH-GATE-21 to 26). Other sets are not touched by this program. Until the owner chooses the rewrite, a sibling line that keeps `--include` or `rg` is labelled `(GNU grep)` or `(rg)` and sits under a PREFLIGHT line; the translation is measured equivalent for suffix globs, and basenames and exclusions need the `':(glob)**/'` forms. |
| G10 | Which hosts count as verification hosts beyond the four measured (SH-GATE-33)? macOS (BSD grep, xargs, awk), GHA windows-2025 Git Bash 5.3.15, uutils `findutils` and `diffutils`. | SH-GATE-33's list is the supported set. The other three are read only: the option set is the intersection of POSIX, GNU, busybox and FreeBSD, so it is expected to work on macOS, and nothing more is claimed. |

**Subareas that deserve another research round**

1. **The gate and the cells on the two hosts still unrun.** Question: do `shell-gate.sh` and the SH-GATE-21 to 29 cells run unchanged on GHA windows-2025 Git Bash 5.3.15 (newer git for Windows, MSYS grep) and on macOS `/bin/bash` 3.2.57 with BSD `grep`, `xargs -0 -r` (FreeBSD documents `-r` as accepted and ignored: read only), `awk` (`BINMODE` is a gawk variable and `nextfile` is avoided on purpose) and `cut`? Git Bash 5.2.15 is answered: the gate and all 41 cells ran (C24). macOS stays read only until a host exists.
2. **The SC2310/SC2312 burn-down.** Question: of the 260 optional-check findings, how many are real masked failures versus intended (`|| true`, `$(...)` in an `echo`), and what is the smallest set of per-site reasons? Belongs with SH-ERR; needs reading the sites, not a tool.
3. **Fenced shell blocks in markdown and rule files.** Question: can a portable lint cover the 628 fenced blocks (13 with `<placeholder>` redirections that ShellCheck cannot parse) in the catalog's own rules, and which check names go in the checker (map M-F-13, third bullet)? Only a heuristic exists today.
4. **Hook-level enforcement (M-F-16) and secondary checkers (M-F-15).** Question: is a pre-commit or lefthook hook worth adding on top of CI (0 fleet repos run one today), and does `checkbashisms` or `posh` find anything ShellCheck `-s sh` misses? Not researched.
5. **Older toolchains.** Question: does the profile and the gate run on ShellCheck 0.8.0 (ubuntu-22.04 runner) and shfmt 3.8.0 (ubuntu-24.04 apt)? Both were read, not run.

## Sub-artifacts

- [shell-gate/lint-format-profile.md](shell-gate/lint-format-profile.md): ShellCheck severity table and `-S warning` chase on the 197 authored files, the `.shellcheckrc` keys and search order, directive hygiene and the relaxation list, ShellCheck and shfmt version floors by distro, shfmt dialect and EditorConfig behaviour, file discovery, the missing-tool failure mode, parse-only commands for seven families, CRLF, BOM, ASCII and mode hygiene, bats and zsh inside the gate, actionlint, fleet and exemplar gate defects, 33 candidate rules and the 12-grep tell set (27 sources).
- [shell-gate/verify-dialect.md](shell-gate/verify-dialect.md): the host matrix for verification cells (ubuntu 24.04 and 26.04 with uutils coreutils, alpine 3.22 and busybox 1.37, alpine with GNU grep, Git Bash), what busybox grep and xargs accept, how a grep error reads as clean behind a pipe, 21 current and rewritten cells on five hosts, the git-fed shape with pathspec depth and ignored and deleted files, the producer-fails-behind-the-pipe class and its PREFLIGHT, list-to-file scripts, awk in place of PCRE, `git grep`, markdown table cells, catalog scale, defects in the consolidations, 14 candidate rules (SH-GATE-21 to 26, 28 to 31, 33, 34 and two revisions of existing cells)

## Key sources

1. https://raw.githubusercontent.com/koalaman/shellcheck/master/shellcheck.1.md : `-S`, `-o`, exit codes, RC FILES, `SHELLCHECK_OPTS`.
2. https://github.com/koalaman/shellcheck/wiki/Directive : directive placement, rc keys, `SCRIPTDIR`, "only the first file found will be used".
3. https://github.com/koalaman/shellcheck/wiki/Optional : the optional checks and the "more subjective rather than more comprehensive" warning.
4. https://raw.githubusercontent.com/koalaman/shellcheck/master/src/ShellCheck/Analytics.hs : per-code severity (`warn 2046`, `err 2068`, `infoWithFix 2086`, `info 2162`, `info 2310`, `info 2312`) and SC2164's `hasErrexit` exemption.
5. https://raw.githubusercontent.com/koalaman/shellcheck/master/CHANGELOG.md : version of every code and directive; SC2039 split in 0.7.2, SC2230 opt-in in 0.7.1, SC3013 removed in 0.11.0, unreleased EditorConfig keys.
6. https://raw.githubusercontent.com/mvdan/sh/master/cmd/shfmt/shfmt.1.scd : `-ln auto`, EditorConfig, `--detect`, `--apply-ignore`, the flags-override rule.
7. https://raw.githubusercontent.com/mvdan/sh/master/CHANGELOG.md : `-l` exit code (3.13.0), zsh (3.13.0), `--detect` and `#!/bin/dash` (3.14.0).
8. https://raw.githubusercontent.com/mvdan/sh/master/cmd/shfmt/main.go : `useEditorConfig`, key spellings.
9. https://git-scm.com/docs/gitattributes : `text`, `eol`, the Windows default.
10. https://github.com/rhysd/actionlint/blob/main/docs/checks.md : shellcheck integration for `run:`, disabled codes, shells linted.
11. https://github.com/actions/runner-images (images/ubuntu/Ubuntu2204, Ubuntu2404, Ubuntu2604 readmes) : ShellCheck version per runner image.
12. https://fishshell.com/docs/current/cmds/fish.html and https://elv.sh/ref/command.html : `--no-execute`, `-compileonly`.
13. https://www.nushell.sh/commands/docs/nu-check.html : `nu-check` returns a boolean, not an exit status.
14. https://learn.microsoft.com/en-us/dotnet/api/system.management.automation.language.parser.parsefile : `ParseFile` returns errors through an out-parameter and does not throw.
15. https://pubs.opengroup.org/onlinepubs/9799919799/utilities/grep.html and https://pubs.opengroup.org/onlinepubs/9799919799/utilities/xargs.html : POSIX.1-2024 `grep` (no `-r -R -H -L -P -z`; exit 0, 1, above 1) and `xargs` (`-0`, `-r`, exit 1 to 125, 126, 127): the option set the portable subset starts from.
16. https://raw.githubusercontent.com/gnu-mirror-unofficial/grep/master/NEWS and https://raw.githubusercontent.com/gnu-mirror-unofficial/grep/master/doc/grep.texi : binary-file message to stderr (3.5), `-L` exit reverted (3.5), stray-backslash and `egrep` warnings (3.8), `-r` without an operand, `-P` with `-z`.
17. https://raw.githubusercontent.com/mirror/busybox/master/findutils/grep.c and https://raw.githubusercontent.com/mirror/busybox/master/findutils/xargs.c : the exact busybox option string (no long options, `-I` and `-a` ignored, `-z` only with `EXTRA_COMPAT`), `FEATURE_XARGS_SUPPORT_ZERO_TERM`.
18. https://raw.githubusercontent.com/gnu-mirror-unofficial/findutils/master/doc/find.texi : xargs exit statuses 0, 123, 124, 125, 126, 127 (why a grep error and a grep no-match are both 123).
19. https://git-scm.com/docs/git-ls-files , https://git-scm.com/docs/gitglossary and https://git-scm.com/docs/git-grep : `-z`, `--exclude-standard`, pathspec magic (`*` crosses `/`, `:(glob)`, `:(exclude)`), `git grep --untracked`.
20. https://git-scm.com/docs/git-config and https://raw.githubusercontent.com/git/git/v2.35.2/Documentation/RelNotes/2.35.2.txt : `safe.directory`, the ownership check behind "dubious ownership" (CVE-2022-24765).
21. https://github.github.com/gfm/ : GitHub Flavored Markdown 0.29-gfm, table cells and pipe escaping inside inline spans.
22. https://www.msys2.org/docs/filesystem-paths/ : automatic Unix-to-Windows argument conversion, why `git grep -e '/path'` returns nothing on Git Bash.
23. https://man.freebsd.org/cgi/man.cgi?query=grep&sektion=1 and https://man.freebsd.org/cgi/man.cgi?query=xargs&sektion=1 : the BSD option set (read only; not macOS).
24. https://github.com/uutils/coreutils/releases/tag/0.10.0 and https://discourse.ubuntu.com/t/carefully-but-purposefully-oxidising-ubuntu/56995 : which coreutils version and which utilities ubuntu:26.04 replaces.
25. https://github.com/koalaman/shellcheck/wiki/SC2038 : `-print0` and `-0` for a `find | xargs` list.
15. https://taskfile.dev/docs/reference/schema : `set`, `shopt`, `preconditions` for Taskfile gates.

## Revision log

2026-10-11, revision 1 (folds `shell-gate/verify-dialect.md` into the first consolidation). Rule IDs 01 to 20 keep their numbers and meanings; 21 and above continue the sequence; 27 and 32 are retired, not reused.

- SH-GATE-21 to 26 added (section G): the git-fed cell shape, shell content from the SH-GATE-09 list, the portable grep option set, quoted pathspecs, the PREFLIGHT line, empty stdout and stderr as the verdict. Why: `grep -r --include` died on busybox 1.37 in 25 of 28 first-revision cells and the error read as "clean" (C16, C19, C21).
- SH-GATE-28 to 31 added: one `-e` per alternative with `-H -n --` and `xargs -0 -r`; no command in a markdown table cell; awk `checks/` scripts for what grep cannot say; the exit map 0, 1, 69, 74, 78, 79 for scanning scripts. Why: dive VD-07 to VD-10; VD-07 is relaxed to what its own cells show (C20).
- SH-GATE-33 (SHOULD) and 34 (CONSIDER) added: the supported verification hosts and `git grep` in scripts. Why: dive VD-13, VD-14; busybox is a supported executor, not an authoring environment.
- SH-GATE-15 verify cell replaced: `grep -l -e $'\r'` (blind on dash and on Git Bash, and called "watched red") became an awk in binary mode; the rule text is unchanged (C17). The gate script's CR and BOM check changed the same way.
- SH-GATE-16 verify cell replaced: the `grep -rlZ ... -P` pair (false positive on a bash script whose heredoc holds `#!/bin/sh`, dead on busybox, blind to extensionless scripts) became an awk that tests line 1; the rule text is unchanged (C18).
- SH-GATE-01, 02, 04, 05, 06, 08, 09, 12, 13, 20 verify cells rewritten to the SH-GATE-21 shape, and SH-GATE-07's listing command with them; each watched-red line now names the `GR/` cell and the hosts. Why: the originals needed GNU grep (C16). SH-GATE-04's cell also gained the `:(glob)*/**/` depth form, and its prose was corrected (the first revision's `find` form skipped only two named trees).
- SH-GATE-01 watched-red text corrected: the extension-less `bin/tool` does not print (3 lines: Taskfile, `sub/Makefile`, workflow `env:`). SH-GATE-14 gained the PREFLIGHT note and a `GR/` cell run.
- SH-GATE-08 extended, not changed: exit 74 when git or shfmt fails while listing, 78 also for a directory that is not a usable work tree, and `xargs`, `grep`, `awk` added to the 69 tool list. Why: a deleted tracked file made the first gate exit 123, a status in nobody's table; the script now conforms to SH-GATE-31.
- SH-GATE-03, 10, 11, 17, 18, 19 text unchanged; 10, 11 and 17 cite the revised gate's plant runs (`GR/plant-gate.sh`).
- Gate script block replaced (99 to 108 lines): tools, work-tree check, listing failure, awk hygiene check. Known limits updated (Git Bash 5.2.15 and bash 3.2.57 with busybox now measured; macOS and Git Bash 5.3.15 not).
- "Reading the verification cells" rewritten: the GNU-grep caveat and "run under bash" are withdrawn; "exits 123 or 1" corrected to "0, 123 or 1, never read the status" (C16, C19).
- Verdict items 1, 6 and 10 amended; items 13 to 16 added, item 16 carrying the documented gaps (macOS, Git Bash 5.3.15, uutils findutils and diffutils, the bare-basename heuristic, the SH-CI-01 awk and `defaults.run.shell`, the checker's possible directory-operand rule, the sibling sets' `--include` and `rg` lines).
- Conflicts C16 to C24 added, four of them (C17, C18, C22, C24) corrections to this document's own first revision.
- Open questions: subarea 1 narrowed to the two unrun hosts (Git Bash 5.2.15 answered); G9 (sibling-set `--include` and `rg` lines) and G10 (unrun hosts) added; nothing else answered.
- Dive ID map extended with 21 to 34 and the retired 27 and 32; Applied tables, New commitments (7 to 9), AI-agent failure modes (17 to 23), Verification runs of the revision, Sub-artifacts and Key sources (15 to 25) extended.

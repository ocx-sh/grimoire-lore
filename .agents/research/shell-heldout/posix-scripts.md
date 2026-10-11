---
title: "Held-out round: POSIX sh and bash scripts"
topic: "shell scripting expertise for the AI-agent fleet: drafting-gate run of every POSIX/bash MUST rule and check over out-of-corpus trees"
agent: heldout/posix-scripts (wave 4)
model: sonnet
date_researched: 2026-10-11
sources_count: 28
fixtures: /home/mherwig/.cache/research-lang/shell-tools/fixtures/heldout-posix-scripts/
scope: >
  Runs SH-DIAL, SH-USER, SH-ERR, SH-EXP, SH-GATE, SH-SEC and SH-CORE-07 over 16 fresh trees (2131 shell files; none was in the 41-exemplar corpus):
  102 cells x 16 trees, the gate-of-record script, ShellCheck 0.11.0 default severity, 4 posix and 4 bash matrix runs, and 21 plant/twin pairs.
  Every finding is classed (i) existing ID, (ii) cell false positive/negative, (iii) new failure class. No macOS host: BSD and macOS claims are read-only.
---

# Held-out round: POSIX sh and bash scripts (2026-10-11)

## Table of contents

1. Summary
2. Findings
3. Normative guidance candidates
4. Verification runs
5. Exemplar evidence (trees, per-ID hit counts, listing false-positive rates, family verdicts)
6. AI-agent angle
7. Contested / evolving
8. Sources

## Summary

- **Verdict: not clean in every family.** 16 amendments to existing cells and tables (class ii) and 1 new rule (class iii, SH-ERR-34) came out of 16 trees; every one was run red on a plant and green on a twin. The rule texts held; the cells were the weak part.
- **New class SH-ERR-34:** a `trap ... RETURN` set inside a bash function is shell-global, survives the function, and fires again whenever a later `.`/`source` finishes (and for every function under `set -T`). Harm run: a stale `rm -rf "$tmp"` deleted a reused variable's directory on bash 3.2, 4.0, 4.2, 4.4, 5.0, 5.1, 5.2 and 5.3. dokku@5eaab7cc1a14 has 44 such traps and zero resets. It does NOT fire for plain later function returns on any of the 8 versions; the premise carried in from the last wave was wrong on that point.
- **The listing cells for `echo -e/-n` are noise:** the SH-CORE-07 T1 / SH-EXP-09 X09 / SH-USER-01 `echo -e` cell hit 1920 lines; 4 are in `#!/bin/sh` files (the only MUST scope). Restrict T1 to sh files; drop the `echo -e` alternative from u01. LinuxGSM alone is 1159 hits.
- **G-IFS (SH-ERR-03) is 80% false positive** (73 of 91): `while IFS=$'\n' read`, `local IFS=$'\n'` and `IFS=$'..' cmd` are scoped. Match only a line that is the assignment.
- **s05 (SH-SEC-05) was 94% false positive** (16 of 17: fish/nu text in bats, ASCII art); amended it keeps the 1 real hit (`source virtualenvwrapper.sh`, bash-it@81929690975f:plugins/available/virtualenv.plugin.bash:14).
- **d06 (SH-DIAL-06) was 26% false positive** (36 of 140): UCI `@device[-1]` paths (30), `|&`/`&>>` inside quotes, bats test titles, `${EPOCHREALTIME:-}` probes and `bash_version` guards (neofetch@ccd5d9f52609:neofetch:5308).
- **The gate script misses `#! /bin/sh`:** a shebang with a space skips the SH-GATE-16 ASCII test; planted file passed the gate with rc 0. Same defect in the dialect `shfiles()` grep. pfetch (valid UTF-8) fails to parse under yash 2.52 in the C locale and passes under C.UTF-8, so the ASCII rule is right and the detection was not.
- **02-c demanded five keys; X51 has four.** The cell as printed flags every compliant X51 rc. Amended cell: green on the 4-key twin, red on a 3-key plant.
- **d01 has a false negative:** `grep -L '^#!'` is satisfied by a heredoc line; 8 void-packages files lack a real line-1 shebang yet passed. Use a line-1 awk, keep the mid-file `# shellcheck shell=` pass.
- **SH-ERR-31 in the wild:** 220 glob-loop candidates; 98 unguarded, 59 guarded, 63 under nullglob. Only 1 of the 59 guards includes the `-L` form. 63 of the unguarded are repo-internal (non-empty by construction); 15 of 16 external-input loops give no own exit status. void-packages@f485811fcd2a:common/xbps-src/shutils/purge_distfiles.sh:51-53 tests `[ -z "${#a[@]}" ]`, which can never fire (`max=1` on 8 bash versions).
- **SC2218 fires on bats (21 of 22 hits) though bats runs the file to completion first.** There is no SH-GATE-07 row. Fix by ordering the helper above the first `@test`, not by a disable.
- **Matrix:** pfetch -v passes on 10 of 11 posix shells (yash fails in C locale); shunit2_general_test.sh passes on 10 of 11 (zsh `--emulate sh` exits 1 silently); openwrt make-ipkg-dir.sh is identical on 11 of 11. neofetch, nodenv and goenv `--version`, plus neofetch `--stdout`, are identical on bash 3.2 through 5.3.
- **Gate script (X51 four-key rc) exits 1 on all 16 real trees** and never 69/74/78 (tool or config errors); 0 on the clean twin, 1 on the mode plant, 79 on the empty repo.
- **Do not trust the exit status of a verification cell.** `xargs` exits 123 when a `grep -L` finds nothing; all 102 cells were judged by output only.

## Findings

Citation form: `repo@sha12:path:line`. All SHAs are the held-out clones in `/home/mherwig/.cache/research-lang/heldout/shell/`; the fixtures copy each tree's checked-out files into a fresh git repo (`asis/`) and add the X51 profile (`work/`).

### Class (i): instances of existing IDs

**F1. SH-ERR-29 top-level nullglob.** 17 column-0 `shopt -s nullglob` lines (cell G-SHOPT): goenv 8, nodenv 6, LinuxGSM 2, dokku 1 (dokku@5eaab7cc1a14:dokku:3). The sourced-file leak is the rule's reason. Instance, no cell change.

**F2. SH-GATE-17 mode vs shebang.** 266 `shebang but mode 100644` plus 4 `100755 but no shebang` across the gate runs (dokku 151, asdf 32, goenv 28, sdkman 26). dokku's plugin hooks are sourced libraries that keep a shebang. SHOULD rule, instance.

**F3. SH-GATE-05/06 never-disable codes.** dokku's own `.shellcheckrc` disables SC2086, SC2046, SC2068, SC2155, SC2162, SC2295; gate/05-a lists 437 in-source or rc disables over 16 trees. Top ShellCheck codes at default severity over the trees (10611 findings): SC2086 3209, SC2154 1741, SC2034 1678, SC1091 936, SC2155 590, SC2016 252, SC2148 238, SC2166 193, SC3043 128. Instance.

**F4. SH-DIAL-02/07/11/17 in sh files.** openwrt (62 `#!/bin/sh` files): `[ ... -a ... ]` (d11 18), bare `set -o pipefail` (d07 2), `local` without a directive (SC3043). Example, openwrt@17a3a87f6e1b:package/base-files/files/sbin/sysupgrade:364 `[ "$(type -t f)" == 'f' ]` (SC3014, `==` in `[ ]`).

```sh
# incorrect (openwrt@17a3a87f6e1b:package/base-files/files/sbin/sysupgrade:364)
if [ "$(type -t platform_restore_backup)" == 'platform_restore_backup' ]; then
# correct
if [ "$(type -t platform_restore_backup)" = 'platform_restore_backup' ]; then
```

**F5. SH-ERR-16 EXIT-only cleanup.** dokku 41 `trap "rm -rf ..." RETURN INT TERM EXIT` lines (G-RET); instance of the bare/ordered form, and the source of the F11 finding.

**F6. SH-SEC-06 `sudo -E`:** dokku 16 hits (s06). **SH-SEC-02 secrets on argv:** dokku@5eaab7cc1a14:contrib/release-dokku:190 `curl -u "$RELEASE_GITHUB_USERNAME:$RELEASE_GITHUB_API_TOKEN"`, and the token inside a remote URL at contrib/build-docs:160. Instance (a `curl -u` argv secret is visible in `ps`).

**F7. SH-USER-08 `xargs` without `-r`:** 80 hits, 0 of 12 read samples were false positives (kubernetes@b27a4f0d4767:hack/update-codegen.sh:276). **SH-USER-07 unprobed `jq`/`python3`:** 57 hits, 12 read, 1 questionable (a Python build style that is the build itself).

**F8. SH-GATE-16 ASCII in `#!/bin/sh`.** pfetch@a906ff89680c:pfetch:1 (`#!/bin/sh`) has box-drawing and `¯\_(ツ)_/¯` (lines 102, 1114, 1425). yash 2.52 stops: `cannot read input: Invalid or incomplete multibyte or wide character` in LC_ALL=C and POSIX; the same file runs in C.UTF-8 (docker `shellzoo:deb12`, 2026-10-11). yash(1) says the shell picks file encoding from the locale. pi-hole has 4 more non-ASCII sh files. Instance, matrix-confirmed.

### Class (ii): cell false positives and false negatives

**F9. SH-GATE-02 cell 02-c asks for five keys; X51 has four.** The printed cell loops over `enable=check-extra-masked-returns`, which X51 dropped. On the X51 twin the original prints `missing in .shellcheckrc: enable=check-extra-masked-returns`.

```sh
# incorrect: five keys, includes the dropped one
for k in external-sources=true source-path=SCRIPTDIR enable=check-set-e-suppressed enable=check-extra-masked-returns enable=deprecate-which; do grep -q -e "^$k" .shellcheckrc || echo "missing in .shellcheckrc: $k"; done
# correct: the four X51 keys
for k in external-sources=true source-path=SCRIPTDIR enable=check-set-e-suppressed enable=deprecate-which; do grep -q -e "^$k" .shellcheckrc || echo "missing in .shellcheckrc: $k"; done
```

**F10. SH-DIAL-06 d06 false positives (140 hits, 36 false).** Three families, one amended cell (`a_d06` in `amended-cells.sh`):
(a) negative subscript `\[-[0-9]+\]` matched UCI paths in openwrt@17a3a87f6e1b:package/base-files/files/bin/config_generate:121-129 (`network.@device[-1].name`), 30 of 30; the amended alternative requires a bash shape, `${a[-1]}` or `a[-1]=`.
(b) `|&`, `&>>` inside quotes: bash-it@81929690975f:completion/available/aliases.completion.bash:72 `chars=$'|&;()<>\n'`, dokku@5eaab7cc1a14:tests/unit/cron-3.bats:75; the amended alternative skips balanced quotes: `^([^#"']|"[^"]*"|'[^']*')*([|]&|&>>)`.
(c) post-filters for `@test "...EPOCHREALTIME..."` titles (bash-it@81929690975f:test/lib/command_duration.bats:16), lines naming `BASH_VERSINFO` or `bash_version`, and the `${VAR:-}` availability probe (bash-it@81929690975f:lib/command_duration.bash:24).

```bash
# incorrect (matches, but the code is a bash 3.2-safe probe)
if [[ -n "${EPOCHREALTIME:-}" ]]; then now=${EPOCHREALTIME//[!0-9]/.}; fi
# the rule's concern (matches, correctly)
now=$EPOCHREALTIME
```

**F11. SH-DIAL-01 d01 false negative.** `grep -L -e '^#!' -e '^# shellcheck shell='` is satisfied by a heredoc line that starts with `#!`: 8 void-packages files lacked a real line-1 shebang and passed (the cell's 241 hits became 249 after the fix). The mid-file `# shellcheck shell=` directive (bash-it) is a legitimate pass and stays.

```sh
# incorrect: no shebang, heredoc supplies "#!/bin/sh" at column 0 and satisfies grep -L
echo start
cat <<'X' >out.sh
#!/bin/sh
X
# correct detector: line 1 only, keep the shell= directive
awk 'FNR == 1 { if (NR > 1 && !ok) print prev; prev = FILENAME; ok = ($0 ~ /^#!/) } /^# shellcheck shell=/ { ok = 1 } END { if (NR > 0 && !ok) print prev }'
```

**F12. `#! /bin/sh` slips past three detectors.** The dialect `shfiles()` grep (`^#!/bin/sh`), gate cell 16-a, and the gate script's own `case "$line1" in '#!/bin/sh'*` (line 75 of the extracted script). Counts of `#! /bin/sh` files: shunit2 16, void-packages 2, goenv 1, openwrt 1. Plant: a `#! /bin/sh` file with `pipefail` and a non-ASCII byte; the original gate exits 0, the amended gate exits 1. Amended regex: `^#![ ]*\/(usr\/)?bin\/(env )?sh([ ]|$)`. The brief's "shfiles heredoc false positive" did not reproduce: GNU grep 3.12 `-z` anchors `^` at the file start, so the original d07 stayed silent on the heredoc twin (reported as not red, see Verification runs).

**F13. SH-USER-01 u01 `echo -e` alternative is out of scope.** SH-EXP-09 owns `echo`; of 2223 u01 hits 1710 were the `echo -e` alternative; dropping it leaves 513 (GNU `sed -i`, `date -d`, `stat -c`, ...). The sh-file scope is still covered by d12 (planted `#!/bin/sh` `echo -e`: d12 prints 1 line).

**F14. SH-CORE-07 T1 / SH-EXP-09 X09 / SH-GATE-20-a: 1920 hits, 4 in the MUST scope.** `echo -[neE]` splits: 4 hits in `#!/bin/sh` files, 560 pure-literal operands in bash files (tolerated by SH-EXP-09's own text), 1360 with an expansion in bash files (LinuxGSM's `echo -en "${blue}...${default}"` color variables are constants). `echo "$var"` in a bash file, which the rule bans outright, appears 2073 times in the same 16 trees (`echo-data.sh`), so only a reading heuristic can enforce it. Amended T1 = sh files only (a_t1).

**F15. SH-ERR-03 G-IFS: 80% false positive.** `IFS=[$][^({a-zA-Z_]` matches every scoped use; 73 of 91 hits are scoped, 18 survive the line-anchored form.

```bash
# incorrect for the rule's purpose is only this (global, prologue-style):
IFS=$'\n\t'
# these match the old cell but are scoped and fine:
while IFS=$'\n' read -r line; do ...; done
f() { local IFS=$'\n'; ...; }
IFS=$' \t\n' run nodenv-exec env
```

**F16. SH-ERR-04 G-DOLLARQ: `|| return $?` is the correct propagation.** Both hits (2 of 2) are pi-hole@f47b8ede5a8e:automated install/basic-install.sh:474 and :511 `git reset --hard "$(git describe --abbrev=0 --tags)" || return $?`. Exclude `[|][|] (return|exit) $?`.

**F17. SH-ERR-26 G-ERRTRAP and SH-ERR-16 e16b match resets and comments.** G-ERRTRAP has 15 hits; 11 are not a trap being set: 7 `trap - ERR` resets (goenv@368cbb1d6fcf:plugins/go-build/bin/go-build:949, void-packages@f485811fcd2a:common/hooks/do-extract/00-distfiles.sh:24 and five more), 3 comment lines (`# Disable trap on ERR`) and 1 `trap -p ERR`; the 4 real sets are kubernetes@b27a4f0d4767:hack/lib/logging.sh:46, go-build:939, and void common/hooks/do-pkg/00-gen-pkg.sh:28 and common/xbps-src/shutils/common.sh:51. e16b has 72 hits, 6 of them resets. Exclude `trap -`, `trap -p` and comment lines.

**F18. SH-ERR-15 G-MKTEMP: 6 of 33 are bats files whose `teardown()` removes the directory** (bats-core runs `teardown` after each test). 11 hits are in test paths (6 removed by `teardown`, 5 unverified). Of the 22 non-test hits, 16 have an explicit `rm` that does not run on a signal or error and 6 have none: all are real leaks of the rule's shape.

**F19. SH-EXP-10 X08 (`[ a == b ]`): 74% false positive.** `nonbash()` treats a shebang-less file as non-bash, so bash-it's sourced libraries (240) and asdf (47) are flagged; 351 hits became 90 when line 1 must be a non-bash shebang. Ceiling: a shebang-less library sourced from sh is missed; ShellCheck `-s sh` SC3014 covers it when the file declares `shell=sh`.

**F20. SH-SEC-05 s05, SH-SEC-02 s02, SH-SEC-11 s11.**
s05: 16 of 17 false (fish/nu text in asdf `.bats`, neofetch ASCII art `. .ddl.;doooc'..;oc;'..';::;,'.` at neofetch@ccd5d9f52609:neofetch:10017, a quoted heredoc).
s02: 2 of 7 false: `curl -H 'Authorization: Bearer dummy_token' "https://${API_HOST}..."` (kubernetes@b27a4f0d4767:hack/update-openapi-spec.sh:125,160) because `[^|#]*[$]` spans from the single-quoted header to a later unrelated `$`. Amended: the `$` must sit inside the double-quoted header.
s11: 2 of 32 are `export -n CDPATH` (goenv@368cbb1d6fcf:bin/goenv:3), which removes the variable from the environment.

**F21. SH-GATE-07 has no SC2218 row.** 22 default-severity hits, 21 in `.bats` (dokku). ShellCheck 0.11.0 reads a `@test` body as top-level order; bats evaluates the whole file n+1 times ([bats-core docs](https://bats-core.readthedocs.io/en/stable/writing-tests.html)), so the helper is defined by the time a test runs. The same call from inside a function body in a plain bash file is silent; at top level it is an error. Fix by ordering, never `disable=SC2218`.

```bash
# incorrect (ShellCheck error SC2218, bats passes)
@test "calls a helper defined later" { helper_ok; }
helper_ok() { true; }
# correct (both green)
helper_ok() { true; }
@test "calls a helper defined earlier" { helper_ok; }
```

### Class (iii): new failure class

**F22. SH-ERR-34 (candidate): a RETURN trap set in a bash function persists.** bash(1): "action is executed each time a shell function or a script executed with the . or source builtins finishes executing"; functions do not inherit RETURN unless the `trace` attribute or `-o functrace` is set. Observed on bash 3.2, 4.0, 4.2, 4.4, 5.0, 5.1, 5.2, 5.3 (identical): the trap stays set after `f` returns (`trap -p RETURN` prints it), fires when a later sourced file finishes, fires for every later function under `set -T`, and does not fire for plain later function calls. Sites: dokku@5eaab7cc1a14:plugins/common/archive-functions:182 (double-quoted, so the frozen value makes the re-fire a repeat `rm -f`, low harm), pi-hole@f47b8ede5a8e:gravity.sh:967 (single-quoted `rm -f "${recoverySQL}"`). Counts: dokku 44 sets / 0 resets, pi-hole 1 / 0, `n_return` flags 32 dokku files and 1 pi-hole file.

```bash
# incorrect: single-quoted action, variable reused later, a `source` deletes it
f() { trap 'rm -rf "$tmp"' RETURN; tmp=$(mktemp -d); }
f; tmp=/data/keep; . ./lib.sh        # /data/keep is gone
# correct: the action resets the trap as its last act
f() { trap 'rm -rf "$tmp"; trap - RETURN' RETURN; tmp=$(mktemp -d); }
```

### SH-ERR-31 census (class i with two rule-text additions)

**F23. 220 glob-loop candidates in the 16 trees** (`globloops.sh`; for/`set --`/array forms):

| bucket | count | reading |
|---|---:|---|
| unguarded | 98 | 4 zsh `(:t)` qualifiers (not sh globs), 13 test code, 65 repo-internal or package-shipped (void `$XBPS_*DIR/*.sh`, bash-it `lib/*.bash`), 16 other |
| guarded | 59 | 1 uses the rule's `-L` form; the rest use `-e`/`-f`/`-d` or `|| continue` only |
| nullglob/failglob set in the file | 63 | feeds F1 |

Of the 16 "other": 1 is not a glob (goenv@368cbb1d6fcf:libexec/goenv-version-file-read:28 is a command-substitution split), 15 are required or optional external input with no empty-case handling and no own exit status: `COMPREPLY=("$cur"*)` (bash-it@81929690975f:completion/available/hub.completion.bash:310), `JVMS=("${JVMS_DIR}"/*)` (…/osx.plugin.bash:81), `for POST in *` (…/jekyll.plugin.bash:33), `.ssh/*` (dokku@5eaab7cc1a14:contrib/images/digitalocean/in_parts/100-image-check:166,269), protoc.sh:83 (`cat` of the literal), local-up-cluster.sh:1241 (prints `*`). Two of the 65 "internal" are user data: void-packages purge_distfiles.sh:51 and :75.

**F24. The dead emptiness check.** `distfiles=($XBPS_SRCDISTDIR/*/*); max=${#distfiles[@]}; if [ -z "$max" ]` (void-packages@f485811fcd2a:common/xbps-src/shutils/purge_distfiles.sh:51-53) never fires: with no match the array holds the literal pattern, `max=1`. Run on 8 bash versions (`matrix/glob-deadcheck.sh`). The array form of the rule is: test element 0 with `-e` and `-L`.

```bash
# incorrect
distfiles=(./*/*); max=${#distfiles[@]}; if [ -z "$max" ]; then echo none; fi
# correct (exit 79 on 3.2 through 5.3)
distfiles=(./*/*)
if [ ! -e "${distfiles[0]}" ] && [ ! -L "${distfiles[0]}" ]; then echo "no distfiles" >&2; exit 79; fi
```

**F25. Dangling symlinks.** `[ -e "$f" ] || continue` counted 0 and `[ -e ] || [ -L ]` counted 1 for a dangling `a.x` on all 11 posix shells (`matrix/glob-dangling.sh`), so the rule's `-L` form is not optional; 58 of 59 fleet guards lack it.

### Notes on other tools

**F26. A bracket class used as alternation passes ShellCheck.** openwrt@17a3a87f6e1b:scripts/make-ipkg-dir.sh:11 `grep '^[^(Version|Architecture)]'` excludes every line starting with any of those letters, not those words. ShellCheck flags only the redirect order on lines 12 and 14 (SC2069). One site, no rule; noted as an AI-draft hazard.

**F27. bash 3.2 floor claims hold at run time.** neofetch declares bash 3.2 compatibility and uses `readarray` (neofetch@ccd5d9f52609:neofetch:3643), `declare -Ap` (:4448) and `${func,,}` (:5308) behind platform or `bash_version` guards. `--version` and `--stdout` run identically on 3.2 through 5.3 (`out/matrix/bash-neofetch-*.txt`). That is why d06's `bash_version` filter is right.

## Normative guidance candidates

Each carries the rule, the reason, the check, and whether it was run against a plant (fixtures in `plants/`, runner `verify-plants.sh`).

1. **SH-ERR-34 (new, MUST, bash).** A function that sets `trap ... RETURN` ends the trap's action with `trap - RETURN`. Why: F22. Check: `n_return` lists files that set a RETURN trap and never reset it. RUN: `plants/c15-return` plant red (1), twin green (0); behaviour on 8 bash versions in `matrix/return-trap-*.sh` (plant keeps the trap and deletes the reused directory; twin keeps it).
2. **SH-ERR-31 text additions (MUST).** (a) Array form: `a=(./*.x); if [ ! -e "${a[0]}" ] && [ ! -L "${a[0]}" ]; then ... exit 79; fi`, never `${#a[@]}`. (b) A loop over a directory the script itself ships is exempt; a loop over user data is not. Check: reading plus the `globloops.sh` census. RUN: `matrix/glob-plant.sh` exit 1 with a stray `cat:` error on 11/11 posix shells, `glob-twin.sh` exit 79 on 11/11, `glob-deadcheck.sh` dead on 8/8, `glob-deadcheck-twin.sh` 79 on 8/8.
3. **SH-GATE-02 cell 02-c (amend).** Four keys, matching X51. RUN: `c01-rc4` plant (3 keys) red 1, twin green; original red on the twin.
4. **SH-DIAL-06 d06 (amend).** The three changes in F10. RUN: `c02`, `c03`, `c04` plants red, twins green; original red on all three twins. Over the trees: 140 to 104; the 36 removed lines were read and all are false positives.
5. **SH-DIAL-01 d01 (amend).** Line-1 awk with the `shell=` directive pass. RUN: `c05` plant red 1 (original silent: FN shown), twin (`shell=` mid-file) green.
6. **SH-DIAL-07, SH-GATE-16, gate script line 75 (amend).** Detect an sh shebang as `^#![ ]*/(usr/)?bin/(env )?sh([ ]|$)` on line 1 only. RUN: `c06`, `c07` plants red (original silent), `c20-gate` `plant-space`: original gate rc 0, `shell-gate-amended.sh` rc 1; twin rc 0 on both.
7. **SH-USER-01 u01 (amend).** Remove the `echo -e` alternative. RUN: `c08` plant (`sed -i`) red, twin (`echo -e` in bash) green; `plant2` sh file caught by d12.
8. **SH-CORE-07 T1 / SH-EXP-09 X09 (amend).** Run T1 and X09 on sh-shebang files only. RUN: `c19` plant red, twin green; 1920 to 4 over the trees. The bash-file "data" half stays a reading rule.
9. **SH-ERR-03 G-IFS (amend).** `^[[:space:]]*(export[[:space:]]+)?IFS=[$]'[^']*'[[:space:]]*(;|#|$)`. RUN: `c16` plant red, twin (3 scoped forms) green; 91 to 18.
10. **SH-ERR-04 G-DOLLARQ, SH-ERR-26 G-ERRTRAP, SH-ERR-16 e16b (amend).** Exclude `|| return $?`, `trap - ...`, `trap -p` and comment lines. RUN: `c09`, `c10` (two rows) plants red, twins green.
11. **SH-ERR-15 G-MKTEMP (amend).** Treat `teardown` like `trap`. RUN: `c17` plant red, bats twin green; 33 to 27.
12. **SH-EXP-10 X08 (amend).** `nonbash()` requires a non-bash shebang on line 1. RUN: `c18` plant red, shebang-less twin green; 351 to 90.
13. **SH-SEC-05 s05, SH-SEC-02 s02, SH-SEC-11 s11 (amend).** Bare name must start alphanumeric and bats files are skipped; header `$` must sit inside the double-quoted header; `export -n` is excluded. RUN: `c11`, `c12`, `c13` plants red, twins green; 17 to 1, 7 to 5, 32 to 30.
14. **SH-GATE-07 row (add).** SC2218 in `.bats`: order helpers above the first `@test`; never disable. RUN: `c14` ShellCheck plant 1 line, twin 0; bats passes both.

## Verification runs

Verdict is the output, never the exit status. "Plant" means the violation; "twin" the compliant or false-positive-shaped file. Counts are output lines. All rows from `out/verify-plants.txt` (19 of 19 AMENDMENT-PROVEN, 0 NOT-PROVEN).

| fixture (`plants/`) | command | original on plant / twin | amended on plant / twin | note |
|---|---|---|---|---|
| c01-rc4 | `a_02c` vs `o_02c` | 2 / 1 | 1 / 0 | original red on compliant twin |
| c02-d06-uci | `a_d06` vs `c_d06` | 1 / 2 | 1 / 0 | |
| c03-d06-pipeamp | same | 1 / 2 | 1 / 0 | |
| c04-d06-probe | same | 1 / 3 | 1 / 0 | |
| c05-d01 | `a_d01` vs `c_d01` | 0 / 0 | 1 / 0 | original FN |
| c06-d07-shfiles | `a_d07` vs `c_d07` | 0 / 0 | 1 / 0 | original FN; heredoc FP did not reproduce |
| c07-gate16 | `a_16a` vs `o_16a` | 0 / 0 | 1 / 0 | original FN |
| c08-u01 | `a_u01` vs `c_u01` | 1 / 1 | 1 / 0 | d12 on `plant2`: 1 line |
| c09-dollarq | `a_dollarq` | 1 / 1 | 1 / 0 | |
| c10-errtrap | `a_errtrap`, `a_e16b` | 1 / 1 each | 1 / 0 each | two rows |
| c11-s05, c12-s02, c13-s11 | `a_s05`, `a_s02`, `a_s11` | 1 / 2, 1 / 1, 1 / 1 | 1 / 0 each | |
| c15-return | `n_return` | (new cell) | 1 / 0 | plus 8-version behaviour |
| c16-ifs, c17-mktemp, c18-x08, c19-t1 | `a_ifs`, `a_mktemp`, `a_x08`, `a_t1` | 1 / 3, 1 / 1, 1 / 1, 1 / 1 | 1 / 0 each | |
| c14-sc2218 | `shellcheck -i SC2218`, `bats t.bats` | plant 1 line, twin 0 | bats: both `ok 1` | gate red, runtime green |
| c20-gate | `shell-gate.sh` / `shell-gate-amended.sh` | twin rc 0; plant (mode) rc 1; empty repo rc 79; `#! /bin/sh`+non-ASCII rc 0 | amended: rc 0, 1, 79, 1 | the rc 0 on the last plant is the defect, not a pass |

Exit statuses were not used as verdicts; the gate rows are the one place the script's own exit map is the contract (0 clean, 1 finding, 79 no shell files), as shell-gate.md SH-GATE-08 defines.

**Matrix runs (`matrix.sh`, all 2026-10-11, outputs in `out/matrix/`):**

| family | script | result |
|---|---|---|
| posix | pfetch@a906ff89680c `pfetch -v` | `pfetch 0.7.0`, exit 0 on dash 0.5.12, busybox ash 1.35 and 1.37, mksh R59c, ksh93u+m (2), posh 0.14.1, bash 3.2 and 5.2 `--posix`, zsh 5.9; yash 2.52 exit 2 (C locale, F8) |
| posix | shunit2@f39734a3dd56 `shunit2_general_test.sh` | `Ran 3 tests. OK` exit 0 on 10 of 11; `zsh --emulate sh` exit 1 with no output (shunit2's README requires `shwordsplit` for zsh) |
| posix | openwrt@17a3a87f6e1b `scripts/make-ipkg-dir.sh` via `wrappers/openwrt-ipkg.sh` | identical control file on all 11 shells (the F26 bracket class drops only `Version` and `Architecture` lines for these inputs) |
| posix | `matrix/glob-plant.sh`, `glob-twin.sh`, `glob-dangling.sh` | plant exit 1 + stray error 11/11; twin exit 79 11/11; dangling `e-only=0 e-or-L=1` 11/11 |
| bash | neofetch `--version`, nodenv `bin/nodenv --version`, goenv `bin/goenv --version`, neofetch `--stdout` (reduced) | identical output on 3.2, 4.0, 4.2, 4.4, 5.0, 5.1, 5.2, 5.3 (neofetch `--version` exits 1 on all 8 by design) |
| bash | `matrix/return-trap-plant.sh`, `-twin.sh`, `-source.sh`, `-harm.sh`, `-harm-twin.sh` | identical on 8 versions: trap persists; no re-fire on a plain function; re-fires on `source` and under `set -T`; harm deletes `keep`, twin keeps it |
| bash | `matrix/glob-deadcheck.sh`, `glob-deadcheck-twin.sh` | `max=1` dead check on 8; twin exit 79 on 8 |

**Counts watched red on a planted fixture: 29** (19 static amended cells, d12 on the sh plant, SC2218 plant, glob plant, dangling, dead check, RETURN persistence, RETURN harm, and the three gate plants: mode rc 1, empty rc 79, amended `#! /bin/sh` rc 1).

**Did not go red or not run, with why:**
- Original d07 on the heredoc twin: silent, so no heredoc false positive exists for d07 (GNU grep 3.12 `-z` anchors at file start). Only the `#! /bin/sh` false negative is real.
- Original gate script on `plant-space`: rc 0. That is the defect.
- getoptions@139d121807db `examples/basic.sh`: `command not found: getoptions`; `bin/getoptions` is generated (`bin/.keep` only in the tree). Replaced by shunit2 and openwrt.
- A first posix matrix attempt hung on stdin; every matrix call now reads `</dev/null`.
- Not fetched: GNU manuals (gnu.org unreachable from this host), bash NEWS (raw GitHub and the bminor mirror returned 404), openwrt.org UCI page (bot wall). Version claims rest on matrix runs and man pages instead.
- No macOS host: nothing here claims BSD or macOS behaviour; `sed -i ''`, `date -v` and `/bin/sh` on macOS are read-only elsewhere.
- Gate cells 21-29 (13 cells) are catalog text with no executable form; not run.

## Exemplar evidence

**Trees** (SHA, files by the SH-GATE-09 list, ShellCheck default-severity lines): asdf@cb72590e9f96 (60, 37), dokku@5eaab7cc1a14 (765, 2519), tfenv@de6ce2e809c1 (40, 213), nodenv@76e9ae5087c2 (56, 49), neofetch@ccd5d9f52609 (1, 3), pi-hole@f47b8ede5a8e (30, 24), LinuxGSM@ab3145948f80 (161, 1739), bash-it@81929690975f (378, 138), goenv@368cbb1d6fcf (74, 542), sdkman-cli@66767dfbe0a1 (28, 156), kubernetes@b27a4f0d4767 hack/ (137, 22), void-packages@f485811fcd2a common/ (254, 3760), shunit2@f39734a3dd56 (25, 26), getoptions@139d121807db (22, 88), pfetch@a906ff89680c (1, 0), openwrt@17a3a87f6e1b scripts and base-files (99, 1295). Total 2131 files, 10611 findings. Upstream `.shellcheckrc` exists in dokku, LinuxGSM, pi-hole and shunit2; ShellCheck reads only the nearest one, so nested rc files hide root keys (SH-ERR-33), which is why the 02-c cell is only meaningful on the `work/` views.

**Per-ID hit counts** (stdout lines over the 16 trees, original cells; `out/pivot-stdout.txt` has the per-tree columns). "ii" marks a cell amended above.

| ID (cell) | hits | class | | ID (cell) | hits | class |
|---|---:|---|---|---|---:|---|
| SH-DIAL-01 (d01) | 241 | ii (FN, +8) | | SH-ERR-09 (G-SIGPIPE) | 51 | i |
| SH-DIAL-03 (d03) | 2131 | n/a: adoption header | | SH-ERR-10 (G-EVAL) | 94 | i |
| SH-DIAL-06 (d06) | 140 | ii (36 FP) | | SH-ERR-11 (G-LIB) | 1 | i |
| SH-DIAL-07 (d07) | 2 | i; ii FN | | SH-ERR-12 (G-NOUNSET) | 132 | i |
| SH-DIAL-09 (d09) | 1 | i | | SH-ERR-13 (G-SHPF) | 2 | i |
| SH-DIAL-11 (d11) | 27 | i | | SH-ERR-14 (G-ARITH) | 84 | i |
| SH-DIAL-12 (d12) | 2 | i | | SH-ERR-15 (G-MKTEMP) | 33 | ii (6 FP) |
| SH-DIAL-21 (d21) | 754 | n/a: adoption | | SH-ERR-16 (G-RET, e16a, e16b) | 45, 1, 72 | i; e16b ii |
| SH-USER-01 (u01) | 2223 | ii | | SH-ERR-03 (G-IFS) | 91 | ii (73 FP) |
| SH-USER-06 (u06) | 5 | i | | SH-ERR-04 (G-DOLLARQ) | 2 | ii (2 FP) |
| SH-USER-07 (u07) | 57 | i | | SH-ERR-26 (G-ERRTRAP) | 15 | ii (11 FP) |
| SH-USER-08 (u08) | 80 | i | | SH-ERR-29 (G-SHOPT) | 17 | i |
| SH-USER-09 (u09) | 226 | i (reading) | | SH-ERR-25 (G-EXIT66) | 0 | green |
| SH-GATE-05 (05-a) | 437 | i | | SH-ERR-17/18/19 (G-DIE, G-RESERVED, G-LIT) | 0 | green |
| SH-GATE-06 (06-a/b/c) | 31, 3, 46 | i | | SH-ERR-31 (census) | 220 loops | i + text |
| SH-GATE-08 (08-a) | 118 | i | | SH-ERR-34 (n_return) | 33 files | iii |
| SH-GATE-16 (16-a) | 25 | ii (FN) | | SH-EXP-10 (X08) | 351 | ii (261 FP) |
| SH-GATE-17 (script) | 270 | i | | SH-EXP-09 (X09=T1) | 1920 | ii |
| SH-SEC-01 (s01-*) | 2, 1, 77 | i | | SH-EXP-13 (X13 eval, T5) | 332, 233 | i (see rates) |
| SH-SEC-02 (s02) | 10 | ii (2 FP of 7) | | SH-SEC-05 (s05) | 17 | ii (16 FP) |
| SH-SEC-06 (s06) | 16 | i | | SH-SEC-07 (s07) | 8 | i |
| SH-SEC-08/09/10 (s08, s09, s10) | 30, 65, 83 | i (listings) | | SH-SEC-11 (s11) | 32 | ii (2 FP) |
| SH-SEC-12 (s12) | 6 | i | | SH-CORE-07 T1..T6 | 1920, 182, 149, 328, 233, 4 | T1 ii |

**Listing-cell false-positive rates** (a hit that does not violate the rule text; "read" = lines read, otherwise a full classification by regex):

| cell | hits | false | basis |
|---|---:|---:|---|
| T1/X09/u01 `echo -e` | 1920 | 1916 outside MUST scope (99.8%) | full, by shebang |
| G-IFS | 91 | 73 (80%) | full |
| s05 | 17 | 16 (94%) | full read |
| X08 | 351 | 261 (74%) | full |
| G-ERRTRAP | 15 | 11 (73%) | full read |
| d06 | 140 | 36 (26%) | full read of the removed lines |
| s02 | 7 | 2 (29%) | full read |
| G-MKTEMP | 33 | 6 (18%), +5 unverified test paths | full read of bats files |
| e16b | 72 | 6 (8%) | full |
| s11 | 32 | 2 (6%) | full |
| X13 eval | 332 | 4 of 10 read (40%: a bats title, `mongo --eval`, an allowed `eval "$(getoptions ...)"`, a quoted string) | 10 read |
| u07 | 57 | 1 of 12 read | 12 read |
| u08 | 80 | 0 of 12 read | 12 read |
| u09 | 226 | 2 of 12 read (order-insensitive consumers) | 12 read |
| X04 `rm "$var"` | 276 | 0 of 10 read (all are the unguarded-variable shape) | 10 read |
| G-DOLLARQ | 2 | 2 (100%) | full read |
| SC2218 | 22 | 21 (95%, all bats) | full |

**Family verdicts.**

| family | verdict | amendment IDs |
|---|---|---|
| SH-DIAL | not clean | SH-DIAL-01 (d01), SH-DIAL-06 (d06 x3), SH-DIAL-07 (shebang detection); d03/d21 measure adoption, not defects, so no held-out verdict |
| SH-USER | not clean | SH-USER-01 (u01 `echo -e`); 06-09 clean |
| SH-ERR | not clean | SH-ERR-03, -04, -15, -16 (e16b), -26 amended; SH-ERR-31 text; SH-ERR-34 new |
| SH-EXP | not clean | SH-EXP-09 (X09 scope), SH-EXP-10 (X08); 13-15 clean |
| SH-GATE | not clean | SH-GATE-02 (02-c), SH-GATE-16 and gate line 75, SH-GATE-07 (SC2218 row); gate exit map clean on 16 real trees |
| SH-SEC | not clean | SH-SEC-02 (s02), SH-SEC-05 (s05), SH-SEC-11 (s11); 06, 07, 10, 12 clean |
| SH-CORE-07 | not clean | T1 scope; T2 to T6 clean |

## AI-agent angle

- **Verification cells fail by noise, not by silence.** An agent told "output is the violation" will read 1920 `echo` lines or 91 IFS lines and either fix harmless code or give up; an agent that treats an empty result as a pass gets false negatives on `#! /bin/sh` and heredoc shebangs. Give every listing cell a stated false-positive shape and an amended form.
- **A drafted glob loop will lack the `-L` half.** 58 of 59 guards in human code omit it; an agent copying the pattern will too. State the array form explicitly: LLM drafts reach for `${#a[@]}` as the emptiness test (void purge_distfiles) and it is dead.
- **Agents will copy the dokku idiom** `trap "..." RETURN INT TERM EXIT` from search results. SH-ERR-34 needs a one-line twin in the skill so the copy carries the reset.
- **Agents disable what ShellCheck rejects.** SC2218 on bats and SC2086 in dokku's rc are the two shortcuts seen; the SH-GATE-07 row tells the agent the real fix (reorder) before it reaches for `disable`.
- **Regex-class-as-alternation** (`[^(A|B)]`, openwrt make-ipkg-dir.sh:11) is a classic generated-regex bug that ShellCheck does not see; the skill should say "use `-e A -e B`".
- **Do not hand-fix to satisfy a listing cell.** Several cells (G-MKTEMP, X13, u09) flag code that is correct; the agent should record a reason, not edit.
- **Run the matrix before claiming a version fact.** The RETURN-trap premise (re-fires on later function calls) was wrong; the 8-version run corrected it in one pass.

## Contested / evolving

- **`$'..'` and `pipefail` are POSIX.1-2024.** The standard now specifies `pipefail` and dollar-single-quotes (XCU 2.2.4); dash 0.5.12, yash 2.52 and posh still print `$'..'` literally on this host, so SH-DIAL-09 and SH-DIAL-07 stay MUST for portability to the 2026 fleet. Revisit when the oldest supported dash is 0.5.12-7 or later and the others follow (dash 0.5.12-7+ has pipefail; the Debian 12 image is 0.5.12-2).
- **Scope of SH-EXP-09 "never `echo "$data"`":** 2073 lines in the 16 trees use it. The rule is right on semantics (`-n`/`-e` data vanishes in 9 of 11 shells) but has no cheap check; keep it as a drafting rule and do not gate.
- **Should d03 and d21 be cells at all?** They count adoption (2131 and 754 hits on non-adopting trees). They belong in a self-check of the authoring repo, not in the held-out score.
- **Top-level vs function-level `nullglob`:** SH-ERR-29 bans the top level; F1 shows the leak, but 63 loops are only correct because of nullglob. The amendment direction is explicit tests (SH-ERR-31), not a shopt; this round gives no reason to change that.
- **RETURN with `-o functrace`:** if a project sets `set -T` deliberately, the trap fires for every function by design; SH-ERR-34 targets the unintentional leak. A `# tell-ok:` waiver is enough.
- **zsh `--emulate sh` and shunit2** exits 1 silently; not investigated beyond the README requirement.

## Sources

| URL | what it is | date/era | why worth reading |
|---|---|---|---|
| https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html | POSIX.1-2024 XCU chapter 2 (primary, fetched 2026-10-11) | 2024 | pathname expansion leaves an unmatched pattern unchanged; `pipefail` and dollar-single-quotes are standard |
| https://man.archlinux.org/man/bash.1.en | bash(1) (primary, fetched) | bash 5.3 era | RETURN trap semantics, `functrace`, non-inheritance in functions |
| https://man.archlinux.org/man/dash.1.en | dash(1) (primary, fetched) | 0.5.12 | `pipefail` text, `local` semantics |
| https://manpages.debian.org/bookworm/mksh/mksh.1.en.html | mksh(1) (primary, fetched) | R59 | `-o pipefail`, `noglob` |
| https://manpages.debian.org/bookworm/yash/yash.1.en.html | yash(1) (primary, fetched) | 2.52 | input encoding follows the locale (the pfetch failure) |
| https://man.archlinux.org/man/gawk.1.en | gawk(1) (primary, fetched) | 5.3 | `BEGINFILE`/`ENDFILE` are gawk extensions; the amended awk avoids them |
| https://man.archlinux.org/man/grep.1.en | grep(1) (primary, fetched) | 3.12 | `-z` record semantics behind the d07 heredoc result |
| https://www.shellcheck.net/wiki/SC2218 (local clone koalaman__shellcheck.wiki@0b4dfe7, 2026-10-09) | ShellCheck wiki page (primary) | 2026 | "Exceptions: None" vs bats reality |
| https://www.shellcheck.net/wiki/SC2069 (same clone) | ShellCheck wiki page (primary) | 2026 | redirect order, the only finding on make-ipkg-dir.sh |
| https://bats-core.readthedocs.io/en/stable/writing-tests.html | bats-core "Writing tests" (primary, fetched) | 1.x | the file is evaluated n+1 times; `setup`/`teardown` |
| https://raw.githubusercontent.com/kward/shunit2/master/README.md | shunit2 README (primary, fetched) | 2.1.x | zsh needs `shwordsplit`; `SHUNIT_PARENT` |
| https://raw.githubusercontent.com/koalaman/shellcheck/master/README.md | ShellCheck README (primary, fetched) | 0.11 | tool scope and rc handling |
| https://github.com/dokku/dokku/tree/5eaab7cc1a14 | held-out tree | 2026 | 44 RETURN traps, `.shellcheckrc` disables, bats corpus |
| https://github.com/void-linux/void-packages/tree/f485811fcd2a | held-out tree | 2026 | dead emptiness check, heredoc shebangs, glob loops |
| https://github.com/openwrt/openwrt/tree/17a3a87f6e1b | held-out tree | 2026 | 62 `#!/bin/sh` files, UCI `[-1]`, make-ipkg-dir.sh |
| https://github.com/dylanaraps/neofetch/tree/ccd5d9f52609 | held-out tree | 2021 | bash 3.2 floor with version-guarded bash 4 forms |
| https://github.com/dylanaraps/pfetch/tree/a906ff89680c | held-out tree | 2022 | non-ASCII `#!/bin/sh`, yash failure |
| https://github.com/pi-hole/pi-hole/tree/f47b8ede5a8e | held-out tree | 2026 | `|| return $?`, RETURN trap, non-ASCII sh files |
| https://github.com/kubernetes/kubernetes/tree/b27a4f0d4767 | held-out tree (hack/) | 2026 | single-quoted dummy token, logging ERR trap |
| https://github.com/Bash-it/bash-it/tree/81929690975f | held-out tree | 2026 | sourced bash libraries, probes, `COMPREPLY` glob |
| https://github.com/asdf-vm/asdf/tree/cb72590e9f96 | held-out tree | 2026 | fish/nu text in bats, zsh completions |
| https://github.com/GameServerManagers/LinuxGSM/tree/ab3145948f80 | held-out tree | 2026 | 1159 `echo -en` hits |
| https://github.com/syndbg/goenv/tree/368cbb1d6fcf | held-out tree | 2026 | `export -n CDPATH`, nullglob at top level |
| https://github.com/nodenv/nodenv/tree/76e9ae5087c2 | held-out tree | 2026 | nullglob at top level, bash 3.2-clean |
| https://github.com/sdkman/sdkman-cli/tree/66767dfbe0a1 | held-out tree | 2026 | global `IFS=$'\n'`, mode mismatches |
| https://github.com/tfutils/tfenv/tree/de6ce2e809c1 | held-out tree | 2026 | bats-free test scripts, mktemp |
| https://github.com/kward/shunit2/tree/f39734a3dd56 | held-out tree | 2026 | 16 `#! /bin/sh` files, zsh matrix result |
| https://github.com/ko1nksm/getoptions/tree/139d121807db | held-out tree | 2026 | generated `bin/getoptions` absent from the tree |

Fixtures, scripts and raw outputs: `/home/mherwig/.cache/research-lang/shell-tools/fixtures/heldout-posix-scripts/` (`plants/`, `matrix/`, `amended-cells.sh`, `verify-plants.sh`, `build-plants.sh`, `globloops.sh`, `shell-gate-amended.sh`, `out/`, `sources/`).

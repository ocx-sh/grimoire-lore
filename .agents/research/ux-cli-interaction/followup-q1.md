---
title: Help-layout parser without the depth cap
program: product
topic: ux-cli-interaction
worker: followup-q1
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 6
---

# Help-layout parser without the depth cap

## Question

Can the help-layout parser shared by the five check scripts (`help-walk.sh`, `typo-check.sh`, `global-pos.sh`, `short-scan.sh`, `dup-scan.sh`) avoid treating prose under a `commands:` line as subcommands (seen in `gh attestation download -h`) without the 4-level depth cap?

## Answer

Yes, with a corrected pattern, and this repair pass found that the first draft's pattern was wrong in two ways. The draft's row rule ("exactly two leading spaces, then two or more spaces") dropped two real gh commands (`gh pr update-branch`, `gh project mark-template`) and every cargo command. The pattern below (`subs3.sh`) fixes both. Measured with it, the walker needs no cap: the cap never binds because the deepest real path in gh, ocx, grim and docker is three words. The only thing that needed a guard was the prose line `its`, and the heading and row patterns now reject it.

All work ran on 2026-11-27 in `~/.cache/research-lang/exemplars/product/wave2/q1/` (a throwaway directory). Binary versions:

```
$ gh --version
gh version 2.105.0 (2026-11-17)
https://github.com/cli/cli/releases/tag/v2.105.0
$ ocx --version        # (a) ocx has no --version flag in this build; (b) the subcommand works
error: unexpected argument '--version' found
$ ocx version
0.6.8
$ grim --version
grim 0.16.0
```

The [gh v2.105.0 release page](https://github.com/cli/cli/releases/tag/v2.105.0) (fetched 2026-11-27) is titled "GitHub CLI 2.105.0" and shows "18 Nov 00:18" with no year; the binary's own build date is 2026-11-17. The one-day gap is a time-zone reading of the same release, so this note uses the binary's date. That `ocx --version` fails is itself a UX-CLI-08 finding already covered by wave 1; it is recorded here only because the version command had to change.

### Root cause (measured)

The shared heading pattern in the five scripts is `/^[A-Za-z ]*[Cc]ommands?[^:]*:$/`. It matches any line that contains the word "command" and ends in a colon. `gh attestation download -h` contains `The command requires either:`. The row test then reads only the first field (`$1~/^[a-z][a-z0-9-]*[:,]?$/`), so the wrapped prose line `its container registry)` yields the child name `its`.

The input, then the old parser (`subs_old.sh`, the wave-1 pattern) on it:

```
$ NO_COLOR=1 gh attestation download -h | head -12
### NOTE: This feature is currently in public preview, and subject to change.

Download attestations associated with an artifact for offline use.

The command requires either:
* a file path to an artifact, or
* a container image URI (e.g. `oci://<image-uri>`)
  * (note that if you provide an OCI URL, you must already be authenticated with
its container registry)

In addition, the command requires either:
* the `--repo` flag (e.g. --repo github/example).

$ ./subs_old.sh gh attestation download
its
```

### Why it looped: measured, with cobra's source

Wave 1 reported that the first uncapped run "looped until `timeout` killed it". The mechanism is cobra's argument rule. [cobra `args.go`](https://raw.githubusercontent.com/spf13/cobra/main/args.go) (fetched 2026-11-27; last commit to this file 2026-04-25 per the repository's commit list, not re-fetched this run) says:

```go
// legacyArgs validation has the following behaviour:
// - root commands with no subcommands can take arbitrary arguments
// - root commands with subcommands will do subcommand validity checking
// - subcommands will always accept arbitrary arguments
```

So `gh attestation download its -h` is a non-root command with no children, it accepts arbitrary arguments, and `-h` prints its own help. Measured:

```
$ a=$(NO_COLOR=1 gh attestation download -h | md5sum); b=$(NO_COLOR=1 gh attestation download its -h | md5sum); c=$(NO_COLOR=1 gh attestation download its its its -h | md5sum); echo "$a | $b | $c"
ba81d106bb604a2db9aaad6a77cb8686  - | ba81d106bb604a2db9aaad6a77cb8686  - | ba81d106bb604a2db9aaad6a77cb8686  -
```

All three outputs are byte-identical, so the child's help equals its parent's help. Repeating the old parser at each deeper path always returns the same fake child (command and output, depth is the word count of the path after `gh`):

```
$ P=(attestation download); for d in 0 1 2 3 4 5; do echo "depth $((${#P[@]})) path: gh ${P[*]} -> children: $(./subs_old.sh gh "${P[@]}" | tr '\n' ' ')"; P+=(its); done
depth 2 path: gh attestation download -> children: its
depth 3 path: gh attestation download its -> children: its
depth 4 path: gh attestation download its its -> children: its
depth 5 path: gh attestation download its its its -> children: its
depth 6 path: gh attestation download its its its its -> children: its
depth 7 path: gh attestation download its its its its its -> children: its
```

(The draft of this note said "depths 2 to 6". The measured range is 2 to 7 and continues without end; this is the loop.) The old parser, uncapped, with a same-help guard, reports the loop and stops:

```
$ SUBS=$PWD/subs_old.sh ./walk2.sh gh 0 > w4_gh_old_cap0.txt; grep -E '^(SAMEHELP|RUNAWAY)' w4_gh_old_cap0.txt; tail -1 w4_gh_old_cap0.txt
SAMEHELP attestation download its
paths=244 samehelp_skips=1
```

### The parser: `subs3.sh`

Source, as run (the whole file):

```bash
#!/usr/bin/env bash
# subs3.sh <bin> [path...]: child command names from -h; no depth cap.
# heading: whole line is title-case words ending "Commands:" (clap, docker) or all-caps "...COMMANDS" (cobra as skinned by gh)
# row: indent of 2+ spaces, a lowercase name, optional ", alias" parts, then ":" plus space(s) (gh) or 2+ spaces (clap, cargo) or end of line
bin=$1; shift
NO_COLOR=1 PAGER=cat timeout 20 "$bin" "$@" -h </dev/null 2>/dev/null | awk '
/^([A-Z][A-Za-z-]* )*Commands:$|^[A-Z][A-Z -]*COMMANDS$/ {f=1; next}
/^[^ ]/ {f=0}
/^$/ {f=0}
f && /^  +[a-z][a-z0-9-]*(, [a-z0-9-]+)*(: +| {2,}|:?$)/ {n=$1; sub("[:,]$","",n); print n}' | grep -vx help
```

What each part rejects:

1. Heading: every word is capitalised, so `The command requires either:` fails on the lowercase `command` and `requires`. Accepted: clap `Commands:`, docker `Management Commands:`, gh `CORE COMMANDS` and `AVAILABLE COMMANDS`.
2. Row: at least two spaces of indent, so the unindented wrapped line `its container registry)` is never a row. A new unindented line ends the block.
3. The draft's `exactly two spaces, then two or more spaces` row rule is withdrawn. gh pads names to the longest one, so the longest name is followed by a single space after its colon, and cargo indents rows by four spaces and lists `build, b`. Both are in the row pattern now.

The walker, with a guard instead of a cap. Source, as run (`walk2.sh`; `walk.sh` of the draft is the same file without the `PATH` line and without the `SUBS` override):

```bash
#!/usr/bin/env bash
# walk2.sh <bin> <capflag:0|1>: like walk.sh, also prints every path as "PATH <depth> <words>"
bin=$1; cap=$2; SUBS=${SUBS:-$(dirname "$0")/subs.sh}; n=0; skipped=0
h(){ NO_COLOR=1 PAGER=cat timeout 20 "$bin" "$@" -h </dev/null 2>&1 | md5sum; }
walk(){ local ph=$(h "$@") c; n=$((n+1)); echo "PATH $# $*"; [ $# -ge 8 ] && { echo "RUNAWAY $*"; return; }
  [ "$cap" = 1 ] && [ $# -ge 4 ] && return
  for c in $("$SUBS" "$bin" "$@"); do [ "$(h "$@" "$c")" = "$ph" ] && { skipped=$((skipped+1)); echo "SAMEHELP $* $c"; continue; }; walk "$@" "$c"; done; }
walk; echo "paths=$n samehelp_skips=$skipped"
```

`cap=1` reproduces the wave-1 cap (a path of four words is counted but not descended into); `cap=0` has no cap. The two guards are the same-help hash and a runaway alarm at 8 words.

### Measurements

Every row below is `SUBS=$PWD/subs3.sh ./walk2.sh <bin> <cap>`, run from the measurement directory on 2026-11-27. The seconds are wall-clock `date +%s` differences. Output is the script's last line, quoted from `w6.log`:

```
subs3 gh cap=0 secs=42 paths=244 samehelp_skips=0
subs3 gh cap=1 secs=43 paths=244 samehelp_skips=0
subs3 ocx cap=0 secs=1 paths=75 samehelp_skips=0
subs3 ocx cap=1 secs=3 paths=75 samehelp_skips=0
subs3 grim cap=0 secs=0 paths=44 samehelp_skips=0
subs3 grim cap=1 secs=1 paths=44 samehelp_skips=0
subs3 docker cap=0 secs=27 paths=163 samehelp_skips=0
subs3 docker cap=1 secs=28 paths=163 samehelp_skips=0
subs3 cargo (cap=0): paths=17 samehelp_skips=0
```

No `RUNAWAY` or `SAMEHELP` line appeared in any of the `subs3` runs (`grep -cE '^(RUNAWAY|SAMEHELP)'` printed 0 for each file). Path-depth distribution, counted from the `PATH <depth> <words>` lines of the uncapped runs (`awk '$1=="PATH"{c[$2]++}'`):

| Binary (version) | depth 0 | depth 1 | depth 2 | depth 3 | deeper |
|---|---|---|---|---|---|
| gh 2.105.0 | 1 | 35 | 185 | 23 | 0 |
| ocx 0.6.8 | 1 | 23 | 47 | 4 | 0 |
| grim 0.16.0 | 1 | 26 | 10 | 7 | 0 |

(Depth counts words after the binary name; each row comes from `w6_<bin>_cap0.txt`.) The deepest real path in all three is three words after the binary, so the four-word cap never cut a real command. Measured depth-3 paths: `awk '$1=="PATH" && $2==3' w6_gh_cap0.txt | head -3` printed `PATH 3 codespace ports forward`, `PATH 3 codespace ports visibility` and `PATH 3 issue artifact create`.

Old against new, child list by child list. For every path found in the uncapped gh, ocx, grim and docker walks, the old parser's and `subs3.sh`'s sorted child lists were compared (`diff` of the two lists per path, 244 + 75 + 44 + 163 paths):

```
gh: 0
ocx: 0
grim: 0
docker: 0
```

0 paths differ. The only gh difference between old and new is therefore `its` at `attestation download`. The first draft's `subs.sh` differed in two other places, which this run found and fixed:

```
DIFF gh pr: old has update-branch, draft subs.sh had not
DIFF gh project: old has mark-template, draft subs.sh had not
```

```
$ NO_COLOR=1 gh pr -h | grep -n 'update-branch'
29:  update-branch: Update a pull request branch
$ NO_COLOR=1 gh project -h | grep -n 'mark-template'
28:  mark-template: Mark a project as a template
```

The draft's "242 paths" for gh was therefore 2 too low; the measured number is 244. A wider check of the child-list equality on binaries that were not in the draft (the first-level list only):

```
gh: old=35 subs3=35
ocx: old=23 subs3=23
grim: old=26 subs3=26
docker: old=51 subs3=51
cargo: old=16 subs3=16
uv: old=22 subs3=22
```

The 35 top-level gh names, in full:

```
$ ./subs3.sh gh | tr '\n' ' '
auth browse codespace discussion gist issue org pr project release repo skill cache run workflow co agent-task alias api attestation completion config copilot event extension gpg-key label licenses preview ruleset search secret ssh-key status variable
```

### The typo check on gh, with and without the artifact

Wave 1 reported "246 typos, 8 failures, 3 of them parse artifacts" ([ux-cli-interaction.md, "Check scripts"](../ux-cli-interaction.md), the paragraph that begins "Cross-check of the case-insensitive pattern"). That sentence is wave 1's own measurement; this run re-measured it with the uncapped wave-1 `typo-check.sh` using `subs3.sh` as its `subs` function (`typo3.sh`, no depth cap):

```
$ ./typo3.sh gh 1
FAIL 'gh codespace ports forwar' exit=1: the command accepts no arguments
FAIL 'gh codespace ports visibilit' exit=1: the command accepts no arguments
FAIL 'gh agent-task creat' exit=1: this command requires an OAuth token. Re-authenticate with: gh auth login
FAIL 'gh agent-task lis' exit=1: this command requires an OAuth token. Re-authenticate with: gh auth login
FAIL 'gh agent-task vie' exit=1: this command requires an OAuth token. Re-authenticate with: gh auth login
typos run: 243
```

5 failures remain, all real cobra gaps; 3 fewer typos ran than in wave 1 (246 to 243) because `gh attestation download its` no longer creates fake paths. So wave 1's "3 of 8 are parse artifacts" is confirmed by measurement, not only carried forward.

### Cobra's "Available Commands:" heading

`gh` skins cobra's help with `AVAILABLE COMMANDS`. The stock cobra layout uses a title-case heading. The cobra source, quoted from [`command.go` at v1.10.2](https://raw.githubusercontent.com/spf13/cobra/v1.10.2/command.go) (fetched 2026-11-27; the [v1.10.2 release page](https://github.com/spf13/cobra/releases/tag/v1.10.2) shows "04 Dec 00:07", and the GitHub API said `published_at 2025-12-04T00:07:49Z` on 2026-11-27), the usage template:

```
Available Commands:{{range $cmds}}{{if (or .IsAvailableCommand (eq .Name "help"))}}
Additional Commands:{{range $cmds}}{{if (and (eq .GroupID "") (or .IsAvailableCommand (eq .Name "help")))}}
```

No stock-cobra binary was available on this machine to run (`which kubectl helm terraform go` found nothing), so the title-case cobra case is tested on a fixture that I wrote to follow that template, not on a real binary. It is labelled a fixture:

```
$ for f in cobra-default prose; do echo "$f: old=[$(./subs_old.sh $PWD/fx/$f|tr '\n' ' ')] subs3=[$(./subs3.sh $PWD/fx/$f|tr '\n' ' ')]"; done
cobra-default: old=[completion serve sync-all extra ] subs3=[completion serve sync-all extra ]
prose: old=[its these run ] subs3=[]
```

`fx/cobra-default` is a shell stub that prints `Available Commands:` and `Additional Commands:` blocks as in the template; `fx/prose` prints the `its container registry)` line and a lowercase `Other commands:` heading. docker is a real cobra CLI that uses the title-case family (`Management Commands:`, `Commands:`); `subs3.sh docker` returns the same 51 names as the old parser. The remaining gap is a real cobra binary with `Available Commands:` run unmodified (see "What could not be determined").

### Does the unchanged rule set still pass on the new parser?

I extracted the five wave-1 scripts from `ux-cli-interaction.md` into `orig_*.sh`, and made `new_*.sh` by replacing the awk pipeline in each with a call to `subs3.sh` and deleting every `[ $# -lt 4 ] &&`. Both ran on 2026-11-27 (`ruleruns.log`; the `fails=` counts are lines starting `FAIL`, `SHORT` or `DUP`):

```
orig_help-walk ocx : exit=0 lines=1 fails=0 last=[walked 75 paths]
orig_typo-check ocx 64: exit=1 lines=24 fails=23 last=[typos run: 74]
orig_global-pos ocx fv_ocx.tsv: exit=1 lines=92 fails=92
orig_short-scan ocx : exit=1 lines=10 fails=10
orig_dup-scan ocx : exit=1 lines=8 fails=8
orig_help-walk grim : exit=0 lines=1 fails=0 last=[walked 44 paths]
orig_typo-check grim 64: exit=0 lines=1 fails=0 last=[typos run: 43]
orig_global-pos grim fv_grim.tsv: exit=0 ; orig_short-scan grim: exit=0 ; orig_dup-scan grim: exit=0
new_help-walk ocx : exit=0 lines=1 fails=0 last=[walked 75 paths]
new_typo-check ocx 64: exit=1 lines=24 fails=23 last=[typos run: 74]
new_global-pos ocx fv_ocx.tsv: exit=1 lines=92 fails=92
new_short-scan ocx : exit=1 lines=10 fails=10
new_dup-scan ocx : exit=1 lines=8 fails=8
new_help-walk grim : exit=0 lines=1 fails=0 last=[walked 44 paths]
new_typo-check grim 64: exit=0 lines=1 fails=0 last=[typos run: 43]
new_global-pos grim fv_grim.tsv: exit=0 ; new_short-scan grim: exit=0 ; new_dup-scan grim: exit=0
```

Every line of `new_*` equals its `orig_*` line. The wave-1 numbers (75, 44, 74/23, 43/0, 92, 10, 8) reproduce on both parsers. `fv_ocx.tsv` is the four-row table `--format json`, `--color never`, `--offline`, `--log-level warn`, and `fv_grim.tsv` has `--progress none` in place of `--log-level warn` (the flags wave 1 named).

For UX-CLI-03, the group list comes from the same parser (a path with children). Measured with `subs3.sh`:

```
ocx config exit=2 usage_lines=1; ocx direnv exit=0 usage_lines=0; ocx index exit=2 usage_lines=1; ocx package exit=2 usage_lines=1; ocx patch exit=2 usage_lines=1; ocx shell exit=64 usage_lines=0; ocx self exit=2 usage_lines=1
grim config exit=64 usage_lines=1; grim export exit=64 usage_lines=1; grim hook exit=64 usage_lines=1
```

(Command: `for g in $(./subs3.sh $b); do [ -n "$(./subs3.sh $b $g)" ] || continue; timeout 10 $b $g </dev/null >/dev/null 2>&1; echo "exit=$?"; ... | grep -c Usage; done`.) This reproduces the wave-1 finding that `ocx package` exits 2 and grim exits 64. It also shows `ocx direnv` exits 0 with no `Usage` on stderr and `ocx shell` exits 64 with none; both are leftover findings the wave-1 check would report (not caused by the parser change).

## Effect on the ruleset

No UX-CLI rule changes its text. The change is to the shared parser in "Check scripts" and one new contract rule.

| Rule | Effect | Verification run for this round |
|---|---|---|
| UX-CLI-02 | confirm | `new_help-walk.sh ocx` prints `walked 75 paths`, exit 0; `new_help-walk.sh grim` prints `walked 44 paths`, exit 0 (output above). |
| UX-CLI-03 | confirm | Group-exit loop above: grim's three groups all exit 64 with a `Usage` line; ocx has 5 groups exiting 2 (the existing violation) and 2 that differ. The check itself is unchanged. |
| UX-CLI-07 | confirm | `new_dup-scan.sh ocx` prints 8 `DUP` lines, exit 1; `new_dup-scan.sh grim` prints nothing, exit 0. |
| UX-CLI-09 | confirm | `new_typo-check.sh ocx 64`: `typos run: 74`, 23 `FAIL`; `new_typo-check.sh grim 64`: `typos run: 43`, 0 `FAIL`; `typo3.sh gh 1`: `typos run: 243`, 5 `FAIL`, all real cobra gaps. |
| UX-CLI-10 | confirm | Same ocx run: the 23 failures are the top-level plugin hints (unchanged from wave 1). |
| UX-CLI-12 | confirm | `new_global-pos.sh ocx fv_ocx.tsv`: 92 `FAIL` lines; `new_global-pos.sh grim fv_grim.tsv`: no output. `new_short-scan.sh ocx`: 10 `SHORT` lines; grim: none. |

### Change in the "Check scripts" section (exact new text)

Replace the sentence "They parse the clap and cobra help layout: a heading that ends in `Commands:` or `COMMANDS`, then two-space-indented rows. Recursion stops at 4 levels." with:

> They parse the clap and cobra help layout through one shared function, `subs`, given below. A line is a command row only inside a heading block whose whole line is title-case words ending in `Commands:` or all-caps ending in `COMMANDS`; the row is indented by 2 or more spaces, starts with a lowercase name, and is followed by `: ` or 2 or more spaces or the end of the line. Prose is never read as a command. Recursion has no depth cap. Each recursive script ends a branch at a child whose `-h` output is byte-identical to its parent's, and at 8 words as a runaway alarm.

Replace the `subs` definition in all five scripts (`help-walk.sh`, `typo-check.sh`, `global-pos.sh`, `short-scan.sh`, `dup-scan.sh`) with this one (the same awk as `subs3.sh`):

```bash
subs(){ NO_COLOR=1 PAGER=cat timeout 20 "$bin" "$@" -h </dev/null 2>/dev/null | awk '
/^([A-Z][A-Za-z-]* )*Commands:$|^[A-Z][A-Z -]*COMMANDS$/ {f=1; next}
/^[^ ]/ {f=0}
/^$/ {f=0}
f && /^  +[a-z][a-z0-9-]*(, [a-z0-9-]+)*(: +| {2,}|:?$)/ {n=$1; sub("[:,]$","",n); print n}' | grep -vx help; }
```

Delete the `[ $# -lt 4 ] &&` clause in `help-walk.sh`, `typo-check.sh` and `short-scan.sh`, and the comment "depth cap: prose under a "commands:" line is not a group". In `typo-check.sh`, the runaway and same-help guards go into `level`: add `[ $# -ge 8 ] && return` as its first statement, and skip any child `c` for which `"$bin" "$@" "$c" -h` hashes equal to `"$bin" "$@" -h` (as in `walk2.sh` above).

Verification for this replacement (run each; all are measured above):

1. `./subs3.sh gh attestation download` prints nothing, and `./subs_old.sh gh attestation download` prints `its` (the regression).
2. For each of gh, ocx, grim, docker: `walk2.sh <bin> 0` and `walk2.sh <bin> 1` (with `SUBS=subs3.sh`) print the same `paths=` number (244, 75, 44, 163), and `grep -cE '^(RUNAWAY|SAMEHELP)'` of the uncapped file prints 0.
3. Over every path of that walk, `diff <(./subs_old.sh $b $p | sort) <(./subs3.sh $b $p | sort)` prints nothing except at `gh attestation download` (measured: the loop over every path of the `subs3` walks printed `gh: 0 ocx: 0 grim: 0 docker: 0`; the `its` path is not in those walks, so item 1 covers it).
4. `./subs3.sh cargo | wc -l` prints 16 (the indent-4 and alias case) and `./subs3.sh $PWD/fx/prose` prints nothing.

### NEW rule (check-script contract, no UX-CLI ID)

- **Imperative:** A help-walking script treats a line as a command row only inside a heading block whose whole line is title-case words ending in `Commands:` or all-caps `...COMMANDS`, and only when the row is indented by 2 or more spaces, starts with a lowercase name (optionally `, alias`), and is followed by `: `, 2 or more spaces, or the end of the line. It never uses a depth cap as the loop guard; it ends a branch when a child's `-h` output equals its parent's.
- **Rationale:** the old pattern read the prose word `its` in `gh attestation download -h` as a subcommand, and the 4-level cap only hid the loop that followed (cobra gives a leaf the same help for any extra argument, [cobra args.go](https://raw.githubusercontent.com/spf13/cobra/main/args.go)). A stricter first draft of the rule dropped real commands (`gh pr update-branch`, `gh project mark-template`, and all of cargo), so the row clause must stay as above.
- **Severity:** MUST for this project's own check scripts.
- **Verification:** the four checks listed above. A script passes only if `subs gh attestation download` is empty, `subs gh pr` contains `update-branch`, `subs cargo` lists 16 names, and the uncapped and capped walks agree on `paths=`.

## Dated facts

- gh 2.105.0, build date 2026-11-17 (`gh --version`, run 2026-11-27); the [release page](https://github.com/cli/cli/releases/tag/v2.105.0) was fetched 2026-11-27 and shows "18 Nov 00:18". `gh attestation download -h` has no command list and contains `The command requires either:`.
- ocx 0.6.8 (`ocx version`), grim 0.16.0 (`grim --version`), docker (`/usr/bin/docker`, `-h` only, no daemon needed), cargo (`~/.cargo/bin/cargo`), all run 2026-11-27. Paths: gh 244, ocx 75, grim 44, docker 163, cargo 17.
- cobra v1.10.2, 2025-12-04 ([release page](https://github.com/spf13/cobra/releases/tag/v1.10.2) and the GitHub API `published_at 2025-12-04T00:07:49Z`, 2026-11-27): `Available Commands:` and `Additional Commands:` are in `command.go`. [cobra `args.go`](https://raw.githubusercontent.com/spf13/cobra/main/args.go) (fetched 2026-11-27): "subcommands will always accept arbitrary arguments".

## What could not be determined

- A real stock-cobra binary printing `Available Commands:` was not run. Missing: kubectl, helm or any cobra CLI on this machine (`which kubectl helm terraform go` finds none); the case is covered only by the cobra source quote above and the `fx/cobra-default` fixture, which I wrote.
- The GitHub API for the cli/cli release failed with its anonymous rate limit on the second call, so the gh release time rests on the page and `gh --version`. The cobra command history dates (command.go 2025-11-18, args.go 2026-04-25) were seen once in an earlier API response and not re-fetched; they are not used for any claim.
- A CLI with a lowercase `commands:` heading, a one-space row indent, or a command list without a heading (npm's comma list, git's grouped text) is not parsed. None of gh, ocx, grim, docker, cargo or uv needs it, but npm and git were not walked.
- `ocx direnv` (exit 0, no Usage) and `ocx shell` (exit 64, no Usage) as UX-CLI-03 findings are noted from one run each; whether they are deliberate was not examined.

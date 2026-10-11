---
title: "Procedures: the SH-CORE index rules and the four shell skills (shell-diagnose, shell-port, shell-integration, installer-script)"
topic: "Procedures (family SH-CORE), wave 3 of the shell-scripting-across-OS/shells research program"
model: sonnet
id_family: SH-CORE
consolidates:
  - shell-skills/diagnose-and-port.md
reads_for_cross_references:
  - shell-frame.md
  - shell-topic-map.md
  - shell-audit/ (config-inventory, fleet-shell-shape, installers, exemplar-shape)
  - shell-dialect.md
  - shell-errexit.md
  - shell-expansion.md
  - shell-gate.md
  - shell-gate/verify-dialect.md
  - shell-pwsh.md
  - shell-emit.md
  - shell-ci.md
date: 2026-10-11
---

# Procedures: the SH-CORE index rules and the four shell skills

Scope: what the `shell-quality` index rule says about the check itself (never weaken it, watch it red, read the floor first, the tell table, routing), and the procedure rules the four shell skills follow (`shell-diagnose`, `shell-port`, `shell-integration`, `installer-script`). Standards stay in the owner families; a SH-CORE rule names its owners and restates none. The one sub-artifact is [shell-skills/diagnose-and-port.md](shell-skills/diagnose-and-port.md); its 24 numbered candidates are renumbered into the rules below (disposition table in "Sub-artifacts").

Evidence tags: **normative** (vendor docs or tool source), **measured** (a run in this program, 2026-10-11, cited as R1 to R14 in "Verification runs"), **codified** (a house or fleet convention), **reading heuristic** (no run exists; a reviewer reads it). Fixture roots: `FX` = `/home/mherwig/.cache/research-lang/shell-tools/fixtures/shell-skills-consol`, `DP` = `/home/mherwig/.cache/research-lang/shell-tools/fixtures/diagnose-and-port`, `ST` = `/home/mherwig/.cache/research-lang/shell-tools`. Tool versions on every run: ShellCheck 0.11.0, shfmt 3.13.1, bash 3.2 to 5.3, dash 0.5.12-2 and 0.5.12-12, busybox 1.37, pwsh 7.4 and 7.6.6, Windows PowerShell 5.1, nu 0.116.0 and 0.105.1. No macOS host: every BSD or macOS statement is "unverified: read only".

## Table of contents

1. [Verdict](#verdict)
2. [The ruleset](#the-ruleset)
3. [Applied to the fleet and exemplars](#applied-to-the-fleet-and-exemplars)
4. [AI-agent failure modes](#ai-agent-failure-modes)
5. [Open questions](#open-questions)
6. [Conflicts resolved](#conflicts-resolved)
7. [Verification runs](#verification-runs)
8. [Sub-artifacts](#sub-artifacts)
9. [Key sources](#key-sources)

## Verdict

Decisions. Each names the script kind it binds when that is not "all kinds".

1. **The index carries 15 rules, 9 of them MUST** (SH-CORE-01, 02, 04, 05, 08, 10, 11, 12, 13). The first four are the house `*-CORE` quartet (never weaken, watched red, state the pass condition, read the floor first) specialised to shell; the other eleven are shell-specific. Every MUST has a run (R1 to R13) or is marked a reading heuristic.
2. **Two verdict semantics, always named.** An inline cell in a rule or skill judges by output: stdout and stderr both empty is the pass (SH-GATE-26). A shipped verifier script judges each tool by its exit status (SH-ERR-24, exit map 0/1/69/74/78/79). Binds: inline cells vs shipped `checks/` scripts. SH-ERR-24 and SH-GATE-26 only looked like a conflict; naming the kind removes it (map X17 stands, re-measured in R2: a clean tree and a broken pattern both exit 123 through `xargs`).
3. **The tell table moves from SH-GATE-20 to SH-CORE-07** (map X13). Same six greps, SHOULD, one waiver token. ShellCheck 0.11.0 at default severity reports the tell itself in 1 of 10 planted files (R3), so the table cannot be dropped as "ShellCheck covers it".
4. **A failure is routed on three facts: exit code, first stderr line, interpreter identity** (SH-CORE-04, SH-CORE-05). For 126 or 127 on a file that exists the order is committed mode, then CR byte, then the shebang path. Mode 100644 is the new first row: all 23 interpreter legs in R5 give rc 126 with "Permission denied"-class text, and 100 tracked shell-shebang files in three fleet repos have the bad mode (R5). The sub-artifact's 39-row route table lacked it.
5. **A port is accepted only when the output is byte-identical on every bash from 3.2 to 5.3 and equal to the newest bash's pre-port output** (SH-CORE-08). Bash 4.4 exits 0 with a wrong value (`timer=0`) before the port, so "exit 0" is not acceptance (R7).
6. **Skill size is the checker's body count, not `wc -l`.** The sub-artifact claimed three house skills exceed 500 lines and that nothing enforces the cap; both claims are wrong (bodies 497 to 499; the checker enforces 500 on the body, R9). Shell skills target 460 (SHOULD part of SH-CORE-11).
7. **Fenced code in a skill or rule is linted by extraction** (SH-CORE-13). `check-artifacts.py` reads inline backtick spans only; 650 fenced sh/bash blocks in `skills/` and `rules/` are outside it, and the extraction lint finds 146 findings in 46 files (R11).
8. **A "MUST rows" table cites MUST rules only** (SH-CORE-10). The sub-artifact's tables cite 6 IDs that are not MUST rules, one of them undefined (R8); those findings stay in the route table with their severity.
9. **`installer-script` is held.** Five of its 16 MUST rows cite M-IDs of the unconsolidated SH-INST and PS-SEC families, and one cites `PS-SEC-08`, which no consolidation defines (R8). Draft the skill after those land.
10. **Wave-2 text to amend (outside this file's write scope):** PS-ERR-05's iex test `$null -eq $MyInvocation.MyCommand.Path` throws under `Set-StrictMode -Version Latest` on 5.1, 7.4 and 7.6.6; `[string]::IsNullOrEmpty($PSCommandPath)` does not (R12). The sibling dive `installer/ps1-front-door.md` reached the same finding independently.

Who disagreed: the sub-artifact vs the audits (decision 6), the sub-artifact vs the topic map (decision 4: "ordered by frequency" has no count behind it), SH-EXP-13 vs SH-EMIT-14 (resolved in SH-CORE-07), SH-GATE-23 vs the checker's `--include` lint (resolved in "Conflicts resolved"). Reasons are in that section.

## The ruleset

Grouped by the check that catches the defect. Format per rule: imperative, `Why`, `Verify` (commands in a fenced block, never in a table cell, SH-GATE-29), `Watched red`, `Scope`. Every command uses the SH-GATE-21..28 dialect: git-fed list, `xargs -0 -r`, `grep -H -n -e ... --`, no `2>/dev/null`.

### A. Caught by the diff and the receipt

**SH-CORE-01 · MUST.** Never make a check pass by weakening it. The shell forms are: a `# shellcheck disable=` with no same-line reason, `|| true` or `|| :` on a command whose failure mattered, `set +e`, a severity floor (`-S`, `--severity`, `SHELLCHECK_OPTS`, rc `severity=`), an rc `shell=` key, a changed shebang or `Kind:` to dodge SC3xxx, `shell: bash` added to hide a dialect error, a removed matrix leg, and `2>/dev/null` on a probe. Fix the file.
- *Why.* House rule GO-CORE-01 in shell clothes. SH-GATE-01, -02 and -05 each catch one form in the committed tree; none looks at what a change introduces. A diff-time detector sees all of them at the moment they are added. `set -o pipefail || true` is also a wrong fix: dash 0.5.12-2 and posh abort on the unknown option and the `|| true` never runs (sub-artifact V3, `DP/out/r02c.txt`).
- *Verify.* Output is the violation, run on the change, not the tree (script `FX/weaken-check.sh`, awk over `git diff -U0 BASE HEAD`, markdown excluded):
  ```sh
  bash weaken-check.sh origin/main HEAD
  ```
  The removed matrix leg, the added `shell: bash` and a shebang changed to bash with the `Kind:` header left alone are reading items against the diff; the other forms are mechanical.
- *Watched red.* Yes, R1: `main..plant` prints 7 lines (severity floor in a workflow, shebang `sh` to `bash`, `set -o pipefail || true`, reasonless directive, `set +e`, `|| true`), `main..twin` prints nothing. The twin changes the same files with a reasoned directive and a commented fallback.
- *Scope.* All kinds, all shells. The detector is POSIX awk plus git; it is a diff reader, so run it from the repository root.

**SH-CORE-02 · MUST.** Watch every new or changed check go red on a plant before trusting it, and green on its twin. The plant carries the hazards that make a check lie: an extensionless shebang file, a file name with a space, and (for a cell run on busybox) the host's own `grep`. Paste both outputs in the receipt.
- *Why.* House GO-CORE-02. Three empty-output shapes stay silent without scanning (R2): a clean tree and a broken pattern both exit 123 through `xargs` (it folds grep's 1 and 2); `2>/dev/null` hides the "Invalid regular expression" line; on busybox 1.37 an old-style `grep -rn --include='*.sh'` exits 2 with usage text, but behind `2>/dev/null | cat` it prints nothing and exits 0. Only a red plant run on the same host shows the check can fail. An extension pathspec misses `bin/tool`; a space in a name breaks a newline-fed list (R3).
- *Verify.* Reading heuristic for the receipt (the plant path and the red output are present). The silent-green shapes are mechanical: SH-GATE-26 (`2>/dev/null` on a cell), SH-GATE-23 (banned grep options), SH-GATE-25 (PREFLIGHT line). Run the plant and the twin through the cell:
  ```sh
  bash tells.sh plant
  bash tells.sh twin
  ```
- *Watched red.* Yes: R2 (the three shapes and the busybox pair), R3 (plant prints all six rows including `bin/tool` and `tell odd name.sh`; twin prints nothing).
- *Scope.* All kinds. A cell is checked on the host that will run it; the supported hosts are those of SH-GATE-33 (GNU grep 3.11 or 3.12, busybox 1.37 with git, Git Bash). BSD grep: unverified: read only.

**SH-CORE-03 · SHOULD.** State the pass condition, the tool version and the host with every verification: "ShellCheck 0.11.0, default severity, exit 0", "dash 0.5.12-2 (Debian 12): `set -o pipefail` aborts rc 2". Name the dash and bash by package or image tag, never "old dash".
- *Why.* House GO-CORE-03. Behaviour is a property of the package: Debian 12 (`0.5.12-2`) and Ubuntu 24.04 (`0.5.12-6ubuntu5`) reject `pipefail`; Debian 13 (`0.5.12-12`) and Ubuntu 26.04 (`0.5.12-12ubuntu3`) accept it (R4). A statement without the version is false on half the images.
- *Verify.* Reading heuristic: every verification names its pass condition and every interpreter claim carries a version. The Step 0 block in SH-CORE-04 prints the version.
- *Watched red.* No, a reading rule; its premise (same dash, different package, different answer) is R4.
- *Scope.* All kinds. Date version-specific claims.

### B. Caught by the interpreter identity block and the route table

**SH-CORE-04 · MUST.** Read the floor first. Before editing or diagnosing a shell file, read its header (lines 1 to 8: shebang, `# Kind:`, `# bash-floor:`, SH-DIAL-01, -03, -25) and run the Step 0 identity block with the interpreter that failed, not the one you are typing in. Paste the output in the receipt.
- *Why.* House GO-CORE-04 and map M-O-02. The same file behaves differently on shells that share a name: pipefail on `/bin/sh` depends on the dash package (R4); a signal death is 128+n, 256+n or 384+n by shell (R6). Reading the header first stops a bash-4 edit on a file whose floor is 3.2.
- *Verify.* Step 0, output read against the header:
  ```sh
  printf 'shell=%s\n' "${BASH_VERSION:+bash $BASH_VERSION}${ZSH_VERSION:+zsh $ZSH_VERSION}${KSH_VERSION:+ksh $KSH_VERSION}"
  ls -l /bin/sh
  command -v dpkg-query >/dev/null 2>&1 && dpkg-query -W -f='dash pkg ${Version}\n' dash
  uname -sm
  if (set -o pipefail) 2>/dev/null; then echo "probe: pipefail accepted"; else echo "probe: pipefail rejected"; fi
  ```
  The header read is a reading heuristic; SH-DIAL-03's header grep is its mechanical half.
- *Watched red.* Yes for the block: R4, four images, the probe line differs between `0.5.12-2` / `0.5.12-6ubuntu5` (rejected) and `0.5.12-12` / `0.5.12-12ubuntu3` (accepted). `shell=` is empty on dash, by design: the block never claims bash.
- *Scope.* All kinds. The block is POSIX sh and needs no bash. On macOS `/bin/sh` is bash 3.2 in POSIX mode (unverified: read only), so the dash line prints nothing there.

**SH-CORE-05 · MUST.** Route a failure on three facts: the exit code, the first stderr line, and the interpreter identity from SH-CORE-04. For rc 126 or 127 on a file that exists, test in this order: committed mode, CR byte or BOM, shebang path. Never read 127 as "interpreter missing" without those three.
- *Why.* 126, 127, 2 and 1 each have four or more causes, and the text differs by launcher. Mode 100644 gives rc 126 "Permission denied" on 23 of 23 interpreter legs, wording varying (dash `Permission denied`, ksh93u+m `cannot execute [Permission denied]`, mksh `can't execute: Permission denied`, posh `cannot execute - Permission denied`, zsh lower-case; R5). A CR in the shebang gives 126 or 127 with four different texts by launcher (sub-artifact A1, V19). The order is by cost and by measured frequency: 100 tracked shell-shebang files at 100644 in three fleet repos (R5), the audit's 93 of 186 authored scripts, and 0 CRLF files in non-generated shell (`fleet-shell-shape.md:141`).
- *Verify.* The mode cell (output is the violation; reads the index mode, so it is the same on WSL, Git Bash and CI):
  ```sh
  git ls-files -s -- . | awk -F'\t' '$1 ~ /^100644 / { f = $2; if ((getline l < f) > 0 && l ~ /^#!/) print f; close(f) }'
  ```
  The CR half is SH-GATE-15's cell; the route-on-three-facts half is a reading heuristic (the receipt holds the three facts). Fix a mode with `git update-index --chmod=+x FILE` (SH-GATE-17).
- *Watched red.* Yes: R5, plant prints `run.sh` and `dir with space/run two.sh`, twin prints nothing, and the sourced `lib.sh` at 100644 without a shebang is correctly not flagged.
- *Scope.* All kinds on Linux, WSL, Git Bash. On Git Bash the work-tree mode bit is unreliable, which is why the cell reads the index.

**SH-CORE-06 · SHOULD.** Give a symptom catalog one row per variant of its text, each row copied from a captured run and tagged with the interpreter and version (image tag or package version) and the date. A variant with different text has its own row.
- *Why.* The text of one failure varies: bash 5.2 prints `required file not found` (rc 127) and 5.3 returned to a specific `bad interpreter` message (sub-artifact "Contested", bash CHANGES 5.3-alpha); `Illegal option -o pipefail` is dash's but `pipefail: bad option` is posh's with rc 1. A paraphrased row cannot be grepped from a user's paste.
- *Verify.* Reading heuristic: the row count of a symptom equals the number of distinct captured texts under `references/`.
- *Watched red.* No (reading heuristic).
- *Scope.* `shell-diagnose` and any catalog of error text. Texts are per version; re-capture on a bump.

### C. Caught by the tell table

**SH-CORE-07 · SHOULD.** Run the tell table over authored scripts: every hit is fixed or carries a same-line `# tell-ok: <reason>` (T1 to T4 also accept `# userland-ok: <reason>`, SH-USER-16). It supersedes SH-GATE-20. T5 passes silently for the literal `eval "$(trusted-tool ...)"`; an `eval "$var"` hit needs `# tell-ok: captured from <tool>, status checked` (the SH-EMIT-14 capture form).
- *Why.* ShellCheck 0.11.0 at default severity passes all of these under `#!/usr/bin/env bash`: on the 10-file plant it reports the tell itself once (`bin/tool`, SC3037 for `echo -n` in an `sh` script), gives four files an unrelated code (SC1090, SC2154, SC2034) and is silent on five (R3). `source <(...)` leaves the variable empty with no error on bash 3.2.57 (SH-EMIT-13). The map's list (M-O-03) also holds five `sh` tells and `which`; ShellCheck owns those exactly (second table).
- *Verify.* Output is the violation; each row prints under its header, nothing under a header is the pass. PREFLIGHT line first (SH-GATE-25):
  ```sh
  for t in git xargs grep awk shfmt; do command -v "$t" >/dev/null 2>&1 || echo "PREFLIGHT: $t missing"; done; git rev-parse --is-inside-work-tree >/dev/null 2>&1 || echo "PREFLIGHT: no usable git work tree" # vd-ok: xargs here is a tool name, not an invocation
  files() { git ls-files -z --cached --others --exclude-standard | xargs -0 -r shfmt -f | tr '\n' '\0'; }
  files | xargs -0 -r grep -H -n -e 'echo -[neE]' -- | grep -v -e 'tell-ok: *[^ ]' -e 'userland-ok: *[^ ]'
  files | xargs -0 -r grep -H -n -e 'readlink -f' -e 'readlink -m' -e 'realpath -m' -- | grep -v -e 'tell-ok: *[^ ]' -e 'userland-ok: *[^ ]'
  files | xargs -0 -r grep -H -n -e 'sed -i[[:space:]]' -e 'sed --in-place' -- | grep -v -e 'tell-ok: *[^ ]' -e 'userland-ok: *[^ ]'
  files | xargs -0 -r grep -H -n -e '[ "=]/tmp/' -- | grep -v -e 'tell-ok: *[^ ]' -e 'userland-ok: *[^ ]'
  files | xargs -0 -r grep -H -n -w -e eval -- | grep -v -e 'eval "[$](' -e 'tell-ok: *[^ ]'
  files | xargs -0 -r grep -H -n -e 'source <(' -e '\. <(' -- | grep -v -e 'tell-ok: *[^ ]'
  ```
  | Row | Tell | Owner | Detector |
  |---|---|---|---|
  | T1 | `echo -n/-e/-E` | SH-DIAL-12 (sh), SH-EXP-09 (data) | grep above; SC3037 in `sh` |
  | T2 | `readlink -f/-m`, `realpath -m` | SH-USER-03 | grep above |
  | T3 | `sed -i` with no suffix | SH-USER-02 | grep above |
  | T4 | literal `/tmp/` | SH-USER-11 | grep above |
  | T5 | `eval` on a non-literal operand | SH-EXP-13, SH-EMIT-14 | grep above, then read the operand |
  | T6 | `source <(` and `. <(` | SH-EMIT-13 | grep above |
  | T7 | `which` | SH-USER-04 | SC2230, only with `enable=deprecate-which` (SH-GATE-02 profile); default ShellCheck is silent |
  | T8 | `function f` in sh | SH-DIAL-02 | SC2113 |
  | T9 | `[[` in sh | SH-DIAL-02 | SC3010 |
  | T10 | `$'..'` in sh | SH-DIAL-09 | SC3003 |
  | T11 | unguarded `pipefail` in sh | SH-DIAL-07, -08 | SC3040 |
  | T12 | arrays in sh | SH-DIAL-02 | SC3030 |
- *Watched red.* Yes. R3: T1 to T6 all red on the plant (`bin/tool` included, which a `*.sh` pathspec misses), empty on the twin, which also carries the literal `eval "$(tool init bash)"` and a waived `eval "$out"`. T7 to T12: `shellcheck -s sh` on the sh plant prints SC2113, SC3010, SC3003, SC3040, SC3030 at default and SC2230 only with the optional check; the twin exits 0.
- *Scope.* Bash scripts that may run on macOS or Alpine, and `sh` scripts. In a Linux-only pinned script a T2 or T3 hit is fine with a reason; `eval "$(tool activate)"` is the intended form in documentation scripts. BSD `sed -i ''` and macOS `readlink -f` limits: unverified: read only. The MUST for each tell lives in its owner rule; this table is the finder.

### D. Caught by the matrix run

**SH-CORE-08 · MUST.** Port in this order: baseline run of the unported script on the target matrix (bash 3.2, 4.0, 4.2, 4.4, 5.0 to 5.3 and, for `sh`, dash and busybox), the SH-DIAL-06 denylist, fix by class, rerun the matrix, rerun the denylist. Accept the port only when the output is byte-identical on every version and equal to the unported script's output on the newest bash. A green ShellCheck is not evidence.
- *Why.* ShellCheck 0.11.0 exits 0 before and after the port (R7). On bash 3.2 the bash-4 constructs fail four ways: fatal (`bad substitution`), non-fatal with rc 0 (`declare -A` leaves an indexed array), command-not-found that the script continues past (`mapfile`), and silent drift (`EPOCHREALTIME` unset, so `timer=0`). Before the port the fixture exits 2 on 3.2, 1 on 4.0 and 4.2 (`extra[@]: unbound variable`) and 0 with a wrong value on 4.4; after, 8 blocks, 1 distinct.
- *Verify.* Compare the per-version blocks of the matrix output; one distinct block equal to the pre-port newest-bash block is the pass. The denylist is output-judged:
  ```sh
  bash matrix.sh bash before/announce.sh
  bash matrix.sh bash after/announce.sh
  ```
  Denylist and file discovery: SH-DIAL-06, SH-GATE-09 (judge by output, not status; the last `xargs` returns 123 on a clean tree).
- *Watched red.* Yes, R7: before, exit 2 / 1 / 1 / 0 (wrong) / 0 / 0 / 0 / 0; after, exit 0 on all eight and one distinct block, equal to the pre-port 5.3 block (`DP/port/{before,after}/announce.sh`).
- *Scope.* Any script that must run on bash below 4.4. macOS `/bin/bash` 3.2.57 (unverified: read only; the `bash:3.2` image stands in).

**SH-CORE-09 · SHOULD.** Port a script only when it is reachable from macOS, a `macos-*` runner, a Taskfile or a workflow; pin the others with `# bash-floor: X.Y` and a `BASH_VERSINFO` guard as the first executable statement (SH-DIAL-25, -27). Say which in the receipt.
- *Why.* Porting costs readability for no reader. The fleet has 5 bash-4+ authored files among 166 authored bash files, 1 invoked from a taskfile, and 0 `BASH_VERSION` guards (`fleet-shell-shape.md:43`).
- *Verify.* Reading heuristic: header lines 2 to 8 carry the floor line or the file is on the port list; the mechanical halves are SH-DIAL-25 and -27.
- *Watched red.* No (reading heuristic).
- *Scope.* bash scripts with a bash-4+ construct.

### E. Caught by `check-artifacts.py`, the MUST-table cells and the fence lint

**SH-CORE-10 · MUST.** A skill's "MUST rows this procedure surfaces" table is finding-form (`# / Finding / Rule`), cites MUST rules only, resolves every cited ID to a defined rule, and for `shell-integration` lists every MUST of its owner family (SH-EMIT). A finding about a SHOULD or CONSIDER rule stays in the route table with its severity.
- *Why.* The skills carry procedures; the standard is the rule ID (house shape, swift-diagnose and go-upgrade). A table that drifts from the catalog misreports what is mandatory. The sub-artifact's tables cite `SH-CI-14`, `SH-ERR-19` (SHOULD) and `SH-USER-15` (CONSIDER) in `shell-diagnose`, `SH-EMIT-21` (SHOULD) and the unknown `PS-SEC-08` in `installer-script`, and a parenthetical `SH-USER-12` in `shell-integration` (R8).
- *Verify.* Three cells, output is the violation. The first needs the family and its rule file; the other two take the rule directory and the skill file:
  ```sh
  bash must-cell.sh missing SH-EMIT shell-emit.md skills/shell-integration/SKILL.md
  bash must-cell.sh dangling .agents/research skills/shell-diagnose/SKILL.md
  bash sev-cell.sh .agents/research skills/shell-diagnose/SKILL.md
  ```
  A parenthetical pointer to a non-MUST ID is flagged: write the X-number instead.
- *Watched red.* Yes, R8. `missing`: the 17-row `shell-integration` table prints nothing; the same table with the `SH-EMIT-29` row removed prints `SH-EMIT-29`; `shell-emit.md` has 17 MUST of 32 IDs. `dangling`: the four sub-artifact tables print `PS-SEC-08` only. `sev`: diagnose prints `SH-CI-14 SHOULD`, `SH-ERR-19 SHOULD`, `SH-USER-15 CONSIDER`; the shell-port table prints nothing.
- *Scope.* The four shell skills; rule files are `shell-*.md` consolidations until the rules ship, then `rules/shell-quality/*.md` (adjust the glob). `.agents/research` is untracked, hence the directory argument.

**SH-CORE-11 · MUST.** Keep every SKILL.md body at 500 lines or fewer as `check-artifacts.py` counts it (the file minus its frontmatter); shell skills target 460 or fewer so a later edit has room. Never measure with `wc -l`.
- *Why.* The checker's contract is `SKILL_BODY_MAX = 500` on the body. `wc -l` counts frontmatter, so it false-reds a valid skill (R9: body 500, file 504, `wc -l` prints it, the checker passes it) and mis-states the real tree: `nix-flake-release` (file 507, body 499), `swift-upgrade` (506, 498) and `swift-release` (505, 497) all pass.
- *Verify.* The checker is the verification, output is the violation:
  ```sh
  python3 -I .claude/skills/research-lang/scripts/check-artifacts.py skills/shell-diagnose skills/shell-port skills/shell-integration skills/installer-script
  ```
  Exit 0 and "clean" is the pass; the 460 target is a reading heuristic against the printed line counts.
- *Watched red.* Yes, R9: plant body 501 prints `body is 501 lines (max 500)` exit 1; twin body 500 prints `clean` exit 0.
- *Scope.* All skills in the shell set. Normative source: the checker; the token budget in `ai-config-authoring` is not gated (house skills run 24 to 37 KB).

**SH-CORE-12 · MUST.** Give the `shell-quality` and `powershell-quality` rules plain `paths` globs, one per extension (`**/*.sh`, `**/*.bash`, `**/*.bats`, `**/*.ksh`), never a brace glob; keep the index body at 200 lines or fewer; reach extensionless scripts through the index's routing line, not a glob.
- *Why.* `check-artifacts.py` tests glob liveness with `rglob` after stripping `**/`; `**/*.{sh,bash}` matches no file, so a rule with a brace glob never loads and says nothing (R10). Wide glob plus index pointer beats a narrow glob that fails silently (memory: globs must not miss). Six authored extensionless shell files exist in the fleet (`fleet-shell-shape.md:36`); SH-DIAL-21 (SHOULD) asks for `.sh`, and until that lands the routing line is the only route.
- *Verify.* The checker with the project root. A glob for an extension the root has no file for (this repository has no `.bash`, `.bats` or `.ksh`) is reported dead unless declared with `--allow-absent GLOB`, which suppresses exactly that glob:
  ```sh
  python3 -I .claude/skills/research-lang/scripts/check-artifacts.py --root . --allow-absent '**/*.bats' --allow-absent '**/*.ksh' rules/shell-quality.md rules/powershell-quality.md
  ```
- *Watched red.* Yes, R10: `**/*.{sh,bash}` prints `dead glob`, the two-glob twin prints `clean`; index body 201 lines prints `body is 201 lines (max 200)`, body 200 prints `clean`.
- *Scope.* The two rule indexes. Depth files under the support directory are checked for routing by the same run (SH-CORE-14).

**SH-CORE-13 · MUST.** Lint every fenced `sh` or `bash` block in the shell set's skills and rules by extraction: ShellCheck at default severity under the fence's own dialect, excluding only SC2034 and SC1091 (a snippet defines variables a later one uses and cannot follow a sourced file). Make the fence tag true: a block that uses bash features is tagged `bash`.
- *Why.* The checker lints inline backtick spans and never reads a fenced block, so the commands agents copy are unchecked. At `88d5e14cb616` there are 650 fenced sh/bash/shell/zsh blocks in 284 files under `skills/` and `rules/`; the extraction lint reports 146 findings in 46 files, 14 blocks that do not parse (SC1072, SC1073, SC1009; of three sampled, two use a `<placeholder>` operand and one ends on a line continuation) and `sh`-tagged blocks that use bash features (SC3054 ×21, SC3001 ×10, SC3040 ×8; R11).
- *Verify.* Output is the violation (`fence-cell.sh`, one awk over all files so block numbers never collide; empty block count prints a PREFLIGHT line and exits 79):
  ```sh
  git ls-files -z -- 'skills/shell-*' 'skills/installer-script*' 'rules/*shell-quality*' | xargs -0 -r bash fence-cell.sh
  ```
- *Watched red.* Yes, R11: plant (`echo -e` and `[[` in an `sh` fence, `for f in $(ls); do rm $f` in a `bash` fence) prints SC3037, SC3010, SC2045, SC2086 with `file:line` of the fence opener; twin prints nothing; the checker on the same plant reports only a fixture name mismatch, nothing from the fences.
- *Scope.* The shell set. The 146 findings in sibling families are reported, not fixed (Open questions).

**SH-CORE-14 · SHOULD.** The index routes every depth file by name and carries the routing table (task to depth file) and the sibling map (code-docs for header comments, rust cli-contract for exit tables, cmake CMK-CORE-05, nix and bazel CI notes, `powershell-quality`) as relative links.
- *Why.* Map rows M-O-05 and M-O-06. A depth file the index never names is never read; the checker already flags both an unrouted support file and a dead relative link (R10), so this rule asks only that the table and the map exist.
- *Verify.* The same checker run as SH-CORE-12; the presence of the two tables is a reading heuristic.
- *Watched red.* Yes for the mechanics, R10: `orphan/depth.md` prints `support file is not routed to from the rule index`, a dead sibling link prints `broken relative link`; twins clean.
- *Scope.* The two rule indexes. Index stays under 200 lines.

### F. Caught by reading the receipt

**SH-CORE-15 · SHOULD.** End each skill with a "What agents get wrong" table ranked by measured count (fleet or audit), with a mechanical check in each row; rows with no count follow, marked "no count". Rank by the audits' numbers, never by assertion.
- *Why.* The sub-artifact's 20-row table says "ranked" and "ordered by frequency" but carries no count. The audits give counts for some modes (see "AI-agent failure modes"). A ranked table with a check per row is what the house skills (swift-diagnose, go-upgrade) do.
- *Verify.* Reading heuristic: each row has a count source or the words "no count", and a check that is a rule ID, a cell or a run.
- *Watched red.* No (reading heuristic).
- *Scope.* The four shell skills.

## Applied to the fleet and exemplars

Fleet HEADs read 2026-10-11, read-only: lore `88d5e14cb616`, ocx `795719f6b54d`, www-setup `a251c3631047`, index `9eba2cc3929b`. Exemplar clones at the SHAs in `shell-audit/scratch/exemplar-shas.md`. The sub-artifact cites ocx `c001637dd3ce`; the lines below were re-checked at the new HEAD.

**Satisfied**

| What | Where | Rule |
|---|---|---|
| Skill bodies at or under 500 by the checker (499, 498, 497) | `lore@88d5e14cb616:skills/nix-flake-release/SKILL.md`, `skills/swift-upgrade/SKILL.md`, `skills/swift-release/SKILL.md` (R9) | SH-CORE-11 |
| `#!/bin/sh`, `set -eu`, `main "$@"` as the last statement | `www-setup@a251c3631047:src/install.sh:1,37,913` (sub-artifact 8.1) | installer-script step 1 (M-N-01, SH-INST pending) |
| Probe the downloader's flags and fall back | `rust-lang/rustup@61271d00a979:rustup-init.sh:710,742-748` | installer-script step 3 (M-N-03, SH-INST pending) |
| `.gitattributes` forces LF; 0 CRLF files in non-generated shell | ocx, grimoire, grimoire-lore (`fleet-shell-shape.md:141`) | SH-GATE-14, -15; SH-CORE-05 CR step |
| House shape adopted: consent, stop condition, never-edit-the-check, route table, receipt | `skills/swift-diagnose/SKILL.md` (442 lines), `skills/go-upgrade/SKILL.md` (396) | SH-CORE-10, -15 |

**Violated**

| What | Where | Rule |
|---|---|---|
| Standing severity floor in the gate; file list from an unquoted, space-joined `git ls-files` | `ocx@795719f6b54d:taskfiles/shell.taskfile.yml:38` (`shellcheck -S warning`), `:37,47` (`git ls-files {{.SHELL_GLOB}} \| tr '\n' ' '`) | SH-CORE-01, SH-GATE-01, SH-GATE-09 |
| Shell-shebang script committed at 100644: 97 in ocx, 3 in www-setup, 0 in index (100 in three repos; the audit counted 93 of 186 across the fleet) | `ocx@795719f6b54d:.claude/artifacts/e1_check.sh:1`, `test/doc_scripts/deps-flat.sh:1`; `www-setup@a251c3631047:tests/docker/activate.sh:1` (R5) | SH-CORE-05, SH-GATE-17 |
| `wget --secure-protocol=TLSv1_2 --https-only` with no probe, rc 3 on busybox | `www-setup@a251c3631047:src/install.sh:352,354` | installer-script step 3 (M-N-03) |
| `exit` in a script also fetched by `irm \| iex`, under `StrictMode Latest`, so the PS-ERR-05 formula would throw | `www-setup@a251c3631047:src/install.ps1:182,734` (exit), `:63` (StrictMode) | PS-ERR-05 with the formula amendment (R12) |
| bash-4+ constructs with no `# bash-floor:` header and no `BASH_VERSINFO` guard (5 files) | `index@9eba2cc3929b:scripts/golden-baseline.sh:250` (`local -A`) and `:3` (`IFS=$'\n\t'`); `ocx@795719f6b54d:test/manual/announce-e2e/scripts/run_sequence.sh:219` (`local -A`, `mapfile`, `${tag,,}`); `ocx@795719f6b54d:test/manual/measure-index-clone.sh:80` (`EPOCHREALTIME`) | SH-CORE-08, -09; SH-DIAL-25, -27 |
| 1132 catalog lines in 124 files of `skills/` and `rules/` carry `grep ... --include='...'`; busybox 1.37 rejects the option (SH-GATE-21 counted 1162 lines at its scope) | `lore@88d5e14cb616:rules/bazel-quality/bzlmod.md:89` and 227 lines in `rules/swift-quality/` (R14) | SH-GATE-21, -23 (sibling sets not rewritten, G9) |
| 650 fenced sh/bash blocks never linted; the extraction lint finds 146 findings in 46 files | `lore@88d5e14cb616:skills/swift-release/SKILL.md:382,449` (SC2010 `ls \| grep`, SC2164 unguarded `cd`), `rules/swift-quality/apple.md` (20 findings), `skills/bazel-adopt/references/branch-rust.md` (10) (R11) | SH-CORE-13 |
| Sub-artifact tables cite non-MUST rules in MUST tables | `shell-skills/diagnose-and-port.md` section 3.4 rows 6, 8; 7.2 row 12 note; 8.2 rows 11, 14 (R8) | SH-CORE-10 |
| Sub-artifact claim that three skills exceed 500 lines and nothing enforces it | `shell-skills/diagnose-and-port.md:63,504,543,567` (R9) | SH-CORE-11 |

**New commitments** (the shell set's own artifacts, from the first draft)

1. The four skills and the two rule indexes pass `check-artifacts.py` clean (SH-CORE-11, -12, -14) and the fence lint prints nothing (SH-CORE-13).
2. Every cell in the set follows the SH-GATE-21..28 dialect, PREFLIGHT first; the self-check of SH-GATE-21, -23 and -26 runs over the shell set's files.
3. `shell-diagnose` ships the mode row (rc 126, "Permission denied", 23 of 23 legs) first in its 126/127 group, ahead of CR and shebang path.
4. The `shell-integration` table is the 17 SH-EMIT MUSTs by ID; the `missing` cell of SH-CORE-10 runs in CI for the set.
5. The `installer-script` skill waits for SH-INST and PS-SEC; its table is re-cut to MUST IDs only.
6. The shell set's receipts carry the Step 0 block, the plant and twin outputs and the tool versions (SH-CORE-02, -03, -04).

## AI-agent failure modes

Ranked by measured count where the fleet or audits give one; the rows below the line have no count and are ordered by how many planted fixtures they reddened. Counts are from `shell-audit/fleet-shell-shape.md` unless marked "R".

| # | Mistake | Count and source | Mechanical check |
|---|---|---|---|
| 1 | Unquoted expansion | SC2086: 183 of the fleet's 278, in agent-written research scratch (`fleet-shell-shape.md:525,562`) | ShellCheck at default severity (SH-GATE-01); SH-EXP family |
| 2 | No strict mode in agent scripts | 55% of 129 research files have no `set` (`:525`) | SH-ERR strict-mode rule; ShellCheck cannot see it, the header grep can |
| 3 | Committed at mode 100644 with a shebang | 93 of 186 authored scripts (`:141`); 100 in three repos today (R5) | the mode cell (SH-CORE-05) |
| 4 | Unguarded `cd` | SC2164: 32 (`:562`) | ShellCheck default; 4 more in the fence lint (R11) |
| 5 | A gate that skips files | `*.sh` pathspec skips 4 `.bash`, 10 `.bats`, extensionless hooks; 7 repos with 0 files clean (`:529`) | SH-GATE-09 discovery; SH-CORE-02 plant with `bin/tool` |
| 6 | GNU-only `--include` in a catalog command | 1132 lines, 124 files (R14) | SH-GATE-21 and -23 self-check |
| 7 | Broken fenced snippets | 146 findings, 46 files, 14 non-parsing blocks (R11) | fence cell (SH-CORE-13) |
| 8 | Bash-4 construct on a bash-3.2 path | 5 files, 0 guards (`:43`) | denylist plus matrix (SH-CORE-08) |
| 9 | GNU-isms in bash scripts | `sed -i` 2 files, `readlink -f` 1 file (`:385`) | tell table T2, T3 |
| 10 | Weakens the check to reach green (`\|\| true`, `set +e`, floor, shebang flip) | no fleet count; 7 of 7 forms red in R1; `\|\| true` after pipefail does not rescue dash 0.5.12-2 (R4 probe) | `weaken-check.sh` (SH-CORE-01) |
| 11 | Reads `Illegal option -o pipefail` as "dash has no pipefail" | no count; the answer flips with the package (R4) | Step 0 probe; SH-DIAL-07 |
| 12 | Reads rc 127 on an existing file as "interpreter missing" | no count; mode alone gives 126, CR gives 126 or 127 | route order (SH-CORE-05) |
| 13 | Tests a signal death by a literal (`-eq 141`) | no fleet count; misses on 3 of 11 shells (269, 397; R6) | `-gt 128` and `kill -l` (SH-ERR-19) |
| 14 | Takes a green ShellCheck as proof of a bash-3.2 port | no count; exit 0 before and after (R7) | matrix output compare (SH-CORE-08) |
| 15 | Copies the wave-2 iex formula into a `StrictMode Latest` script | no count; throws on 5.1, 7.4, 7.6.6 (R12) | `[string]::IsNullOrEmpty($PSCommandPath)` |
| 16 | Uses `nu-check` bare as a parse gate | no count; bare form exits 0 on a broken file on nu 0.116.0 and 0.105.1 (R13) | the `--debug` form or the SH-GATE-11 wrapper |

Fleet check for rows 1, 2, 4: all three are findings of the same gate that `ocx` runs as `shell:verify` (1.4 findings per KLOC) and the research scratch does not (79.2); the audit's reading is "the gap is the gate, not the model" (`:525`).

## Open questions

Owner decisions. The default is applied in this file.

| # | Question | Default applied |
|---|---|---|
| Q1 | One new waiver token `tell-ok:` for the tell table, with `userland-ok:` (SH-USER-16) also accepted on T1 to T4, or reuse `userland-ok:` for all six? | `tell-ok:` added. `eval` and `source <(` are not userland forms, and a third token (`vd-ok:`) already exists for catalog text. |
| Q2 | Rewrite the sibling sets' 1132 `grep --include` lines? | No (SH-GATE-21 scope, G9). The checker's quoted-glob lint stays for them. |
| Q3 | Commit the 100 mis-moded files (97 ocx, 3 www-setup) in one sweep with `git update-index --chmod=+x`? | No sweep; fix on touch. SH-GATE-17 stays SHOULD. |
| Q4 | Raise SH-ERR-19 (literal signal compare, SHOULD) to MUST so the diagnose table can keep its row? | No. The row moves to the route table with its severity (SH-CORE-10). |
| Q5 | Lower `SKILL_BODY_MAX` to 460 for the shell set instead of a SHOULD target? | No; the checker cap stays 500, 460 is a target. |
| Q6 | Apply the fence lint to the 650 sibling blocks (146 findings)? | Shell set only. Triage which of the 146 are tag noise and which are defects is a sibling-set decision. |
| Q7 | Amend PS-ERR-05's formula in `shell-pwsh.md`? | Amendment written here (Verdict 10, R12); the edit to that file is outside this consolidation's write scope. |
| Q8 | Hold `installer-script` until SH-INST and PS-SEC are consolidated? | Held. Five rows cite M-IDs; `PS-SEC-08` has no definition. |

Subareas that need another research round are returned in the receipt (SH-INST and PS-SEC IDs, SH-NU and SH-ZSH IDs for diagnose rows 12 and 13, nu warning-as-error gating, sibling fence triage, macOS and BSD claims).

## Conflicts resolved

| # | Conflict | Resolution and reason |
|---|---|---|
| C1 | Sub-artifact: three house skills exceed 500 lines and nothing enforces the cap, so 460 is a free budget. Checker: `SKILL_BODY_MAX = 500` on the body. | Checker wins: bodies are 499, 498, 497 and the checker prints `clean` on all three (R9). `wc -l` also false-reds a valid body-500 skill (file 504). SH-CORE-11 measures with the checker; 460 stays a target. |
| C2 | SH-GATE-20 (SHOULD, six greps, in SH-GATE) vs map X13 (the tell table is SH-CORE's). | SH-CORE-07 owns it; SH-GATE-20 becomes a pointer. Patterns kept verbatim so the plant evidence (`GR/` cells) still applies. `which` stays with SC2230 (C13 of the gate consolidation: 121 grep hits, mostly prose). |
| C3 | SH-EXP-13: `eval` only on a literal `"$(trusted-tool ...)"`, never a variable. SH-EMIT-14: capture `out=$(tool ...) \|\| return`, then `eval "$out"`, because `eval "$(...)"` returns 0 when the tool fails (11 of 11 shells). | Both stand with a joint reading: the literal form passes T5; the captured variable form is allowed when the assignment is a trusted-tool substitution with its status checked on the preceding statement, and carries `# tell-ok: captured from <tool>, status checked`. Reason: the injection concern in SH-EXP-13 is about untrusted provenance; the capture form has the same provenance as the substitution and fixes the swallowed status. The twin runs both forms (R3). |
| C4 | SH-ERR-24 (verifier judges by exit status) vs SH-GATE-26 and the cells ("output is the violation", status unreliable through `xargs`). | Not a conflict once the kind is named (map X17): inline cells by output, shipped `checks/` scripts by status. R2 shows why: clean tree, broken pattern and `2>/dev/null` broken pattern all exit 123. SH-CORE-02 requires the receipt to say which. |
| C5 | SH-GATE-23 bans `--include` outright; `check-artifacts.py` only requires the glob after `--include=` to be quoted. | Both hold. The shell set avoids `--include` entirely (busybox 1.37 exits 2; behind `2>/dev/null \| cat` it is silent and exit 0, R2 E and F); the checker's lint keeps protecting the siblings' quoted forms (R14: 1132 lines). |
| C6 | Sub-artifact: 39-row route table "ordered by frequency". Audits: mode 100644 is the most frequent fleet symptom (93 of 186) and is not in the table. | Table order is by cost and measured frequency, and the mode row is added first for 126/127 (SH-CORE-05, R5). The "ordered by frequency" wording is dropped because no count backed it. |
| C7 | Sub-artifact: "MUST rows" tables cite SHOULD and CONSIDER rules (`SH-ERR-19`, `SH-CI-14`, `SH-USER-15`, `SH-EMIT-21`, `SH-USER-12`) and an undefined `PS-SEC-08`. | MUST tables cite MUST rules only (SH-CORE-10, R8). The SHOULD findings stay in the route table with a severity column; `PS-SEC-08` waits for the PS-SEC consolidation. |
| C8 | Wave-2 PS-ERR-05: iex test `$null -eq $MyInvocation.MyCommand.Path`. Sub-artifact R12 and the `ps1-front-door` dive: it throws under `StrictMode Latest`. | The measured behaviour wins: throws on 5.1, 7.4 and 7.6.6; `[string]::IsNullOrEmpty($PSCommandPath)` is `True` on all three (R12). Amendment recorded; `www-setup@a251c3631047:src/install.ps1:63` is the live case. |
| C9 | Sub-artifact candidate 22 (weakening forms) vs SH-GATE-01, -02, -05 (each one form, on the committed tree). | Merged into SH-CORE-01 as a diff-time detector; the SH-GATE rules keep the tree-state checks. Forms that only a reader can see (removed matrix leg, `shell: bash`, shebang flip) are marked reading items. |

## Verification runs

All runs 2026-10-11, this host (WSL2, Linux 6.18). Toolchain through `ST/run.sh`. Output files are under `FX/out/`.

| Run | What | Command and fixture | Result |
|---|---|---|---|
| R1 | diff-time weaken detector, SH-CORE-01 | `weaken-check.sh main plant`, `weaken-check.sh main twin` in `FX/wk` (`mk-wk.sh`) | plant: 7 lines (floor, shebang, `pipefail \|\| true`, reasonless directive, `set +e`, `\|\| true`); twin: empty (`out/weaken.txt`) |
| R2 | silent-green shapes, SH-CORE-02 | `r05-silent-green.sh` on the host; `r05-busybox.sh` in busybox 1.37 | A clean tree 123; B broken pattern `[` 123 with `Invalid regular expression`; C same with `2>/dev/null` empty, 123; D plant hits, 0. Busybox: E old shape exit 2 with usage text; F behind `2>/dev/null \| cat` empty, 0; G NUL-safe `find -print0 \| xargs -0` finds both hits (`out/r05.txt`) |
| R3 | tell table, SH-CORE-07 | `bash tells.sh plant`, `tells.sh twin` (`mk-trees.sh`, 10 plant files, 10 twin files); ShellCheck default on both; `shellcheck -s sh` on `in/sh-tells-plant.sh` and `-twin.sh` | T1 to T6 red on plant (incl. `bin/tool`, `tell odd name.sh`), empty on twin. ShellCheck default on plant: the tell itself in 1 of 10 files, unrelated codes in 4, silent in 5. sh plant: SC2113, SC3010, SC3003, SC3040, SC3030 default; SC2230 only with `--enable=deprecate-which`; twin exit 0 (`out/tells-run.txt`, `tells-shellcheck.txt`, `sh-tells-sc.txt`) |
| R4 | Step 0, SH-CORE-03 and -04 | `step0.sh` in debian:12, ubuntu:24.04, debian:13, ubuntu:26.04 | dash `0.5.12-2` and `0.5.12-6ubuntu5`: pipefail rejected; `0.5.12-12` and `0.5.12-12ubuntu3`: accepted (`out/step0.txt`) |
| R5 | mode 100644, SH-CORE-05 | `r16-mode.sh` on 23 interpreter legs (dash 0.5.12, busybox ash 1.35 and 1.37, mksh R59c, ksh93u+m ×2, yash 2.52, posh 0.14.1, bash 3.2 to 5.3 and `--posix`, zsh 5.0.8 to 5.9); `mode-cell.sh` on `FX/mode/{plant,twin}` and three fleet repos | 23 of 23 rc 126 with a "Permission denied"-class message. Cell: plant prints `run.sh` and `dir with space/run two.sh`; twin empty. Fleet shell shebang at 100644: ocx 97, www-setup 3, index 0 (`out/r16.txt`, `mode-run.txt`, `mode-*.lst`) |
| R6 | signal statuses, route table | `r13-sig-literal.sh` on 11 shells | rc 141 on 8, 269 on ksh93u+m ×2, 397 on yash 2.52; literal `-eq 141` misses on those 3, `-gt 128` hits on 11 of 11 (`out/r13.txt`) |
| R7 | port, SH-CORE-08 | `matrix.sh bash` on `DP/port/before/announce.sh` and `after/announce.sh`, bash 3.2 to 5.3 | before: 3.2 exit 2 (`local: -A: invalid option`), 4.0 and 4.2 exit 1 (`extra[@]: unbound variable`), 4.4 exit 0 with `timer=0`, 5.0 to 5.3 exit 0; after: exit 0 ×8, 1 distinct block, equal to pre-port 5.3. ShellCheck 0.11.0 exit 0 on both (sub-artifact V11) (`out/port-before.txt`, `port-after.txt`) |
| R8 | skill table cells, SH-CORE-10 | `must-cell.sh missing`, `must-cell.sh dangling`, `sev-cell.sh` on the four sub-artifact tables (`in/tbl-*.md`); `tbl-emit-plant.md` = the emit table minus `SH-EMIT-29` | emit table: empty; plant: `SH-EMIT-29`; `shell-emit.md` 17 MUST. dangling: `PS-SEC-08`. sev: diagnose `SH-CI-14`, `SH-ERR-19`, `SH-USER-15`; emit `SH-USER-12`; installer `PS-SEC-08` (UNKNOWN), `SH-EMIT-21`; port empty (`out/must-run.txt`, `sev-run.txt`) |
| R9 | skill size, SH-CORE-11 | `mk-skills.sh` (bodies 501 and 500), `check-artifacts.py` on each; `wc -l` check; checker on the 3 real skills | plant `body is 501 lines (max 500)` exit 1; twin `clean` exit 0; `wc -l >= 500` prints the twin (file 504); real: `clean` ×3, bodies 499, 498, 497 (`out/skillsize.txt`, `real-skills.txt`) |
| R10 | rule checks, SH-CORE-12 and -14 | `mk-rules.sh`; checker with `--root rl/proj` on 4 plants and 4 twins | brace glob `dead glob`; dead link `broken relative link`; orphan `support file is not routed`; body 201 `max 200`; all four twins `clean` (`out/rules-run.txt`) |
| R11 | fence lint, SH-CORE-13 | `fence-cell.sh` on `FX/fc/{plant,twin}`; on 284 `skills/*.md` and `rules/*.md` files at `88d5e14cb616`; the checker on the plant | plant 4 findings with fence line; twin empty; checker: name parity only. Real: 650 blocks, 146 findings, 46 files (SC2016 ×40, SC3054 ×21, SC1072/SC1073/SC1009 ×14 each, SC3001 ×10, SC3040 ×8) (`out/fence-run.txt`, `fence-real.txt`) |
| R12 | iex formula, C8 | `r14-strictmode.ps1` on pwsh 7.4, 7.6.6, Windows PowerShell 5.1 | `MyCommand.Path` formula: `PropertyNotFoundException` on all three; `IsNullOrEmpty($PSCommandPath)`: `IsIex=True` on all three (`out/r14.txt`) |
| R13 | nu parse gate, row 16 | `r01-nucheck.sh`, nu 0.116.0 and 0.105.1 | bare `nu-check` on a broken file prints `false`, exit 0; `--debug` exit 1 (`nu::parser::shell_andand` on 0.116.0); the SH-GATE-11 wrapper exit 1; good file exit 0 in all three (`out/r01-nucheck.txt`) |
| R14 | catalog `--include` count | fixed-string search in `skills/*.md` and `rules/*.md` at `88d5e14cb616` | 1132 lines in 124 files (526 in table rows, 500 starting with `grep`); largest: `rules/swift-quality` 227, `rules/cmake-build` 157, `rules/bazel-quality` 119 (`out/catalog-grep.txt`) |

Not red, reported as such: (a) the twin of R3 is tell-clean, not ShellCheck-clean (SC2034 on two unused variables); the claim is about the six rows. (b) R6 and R12 are behaviour evidence for a rule owned elsewhere (SH-ERR-19, PS-ERR-05); no new mechanical check is added here. (c) The R5 fleet count uses a shebang regex for sh, bash, zsh, ksh and dash; Python files at 100644 in ocx (161 total with shebang at that mode) are excluded. (d) `sev-cell.sh` reads severity from the ID line or a nearby `Severity:` line; a consolidation with another layout would print UNKNOWN, which is how `PS-SEC-08` shows up.

## Sub-artifacts

- [shell-skills/diagnose-and-port.md](shell-skills/diagnose-and-port.md): the shell-diagnose catalog (39-row route table, signal-status table, Step 0), the shell-port runbook P0 to P6 with its receipt and 3.2 replacement table, the dry runs of `shell-integration` and `installer-script`, four MUST-row tables, 24 numbered candidates, runs V1 to V20 and 20 agent mistakes. Not a rule source on its own; this file renumbers it.

Disposition of its 24 candidates:

| Candidate | Where it went |
|---|---|
| 1, 2 | SH-CORE-05 (route on three facts; CR check) |
| 3 | SH-CORE-01 and SH-DIAL-07 (pointer) |
| 4 | SH-ERR-19 (owner); route-table row |
| 5 | SH-ERR-12 (owner) |
| 6 | SH-GATE-24 and the checker's quoted-glob lint (C5) |
| 7, 8 | PS-GATE-04, PS-ENC-01 (owners) |
| 9 | SH-GATE-11 wrapper; SH-NU wave 3 |
| 10, 11, 12 | SH-CI-04, SH-CI-14, SH-CI-18 (owners) |
| 13, 14 | SH-CORE-08 |
| 15 | SH-DIAL-06 and SH-GATE-09 (owners) |
| 16 | SH-CORE-09 |
| 17, 18, 19 | SH-EMIT-01 to 05 (owners) |
| 20 | M-N-03, SH-INST (pending) |
| 21 | PS-ERR-05 amendment (C8) |
| 22 | SH-CORE-01 (C9) |
| 23 | SH-CORE-11 (C1: the `wc -l` form is dropped) |
| 24 | SH-CORE-06 |

## Key sources

1. https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html : POSIX.1-2024 XCU chapter 2, Shell Command Language (exit statuses 126, 127, above 128; the pipefail requirement). Normative.
2. https://metadata.ftp-master.debian.org/changelogs//main/d/dash/dash_0.5.12-12_changelog : dash Debian changelog; pipefail arrives in `0.5.12-7`. Normative.
3. https://tiswww.case.edu/php/chet/bash/NEWS : bash NEWS, version-by-version features behind the 3.2 denylist. Normative.
4. https://www.shellcheck.net/wiki/SC3040 : ShellCheck SC3040 (pipefail in sh); the SC3xxx dialect family. Normative.
5. https://raw.githubusercontent.com/koalaman/shellcheck/master/CHANGELOG.md : version of every code; SC2230 opt-in since 0.7.1. Normative.
6. https://magicant.github.io/yash/doc/exec.html : yash command execution; "signal number plus 384" (397, 399). Normative.
7. https://raw.githubusercontent.com/ksh93/ksh/dev/src/cmd/ksh93/sh.1 : ksh93u+m manual source; 256 plus the signal (269, 271). Normative.
8. https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax : the default-shell table for `run:` steps. Normative.
9. https://github.com/actions/runner/blob/main/src/Runner.Worker/Handlers/ScriptHandler.cs : container job steps default to `sh -e`. Normative (source).
10. https://git-scm.com/docs/git-ls-files : `-s` stage output (mode, object, stage), `-z`, `--eol`; the basis of the mode cell. Normative.
11. https://git-scm.com/docs/gitglossary : pathspec magic; `*` crosses `/` without `:(glob)` (SH-GATE-24). Normative.
12. https://raw.githubusercontent.com/mirror/busybox/master/findutils/grep.c : busybox grep; no long options. Normative (source).
13. https://raw.githubusercontent.com/mirror/busybox/master/findutils/xargs.c : busybox xargs; the exit-status folding behind R2. Normative (source).
14. https://www.nushell.sh/commands/docs/nu-check.html : `nu-check` and `--debug` (R13). Normative.
15. https://raw.githubusercontent.com/MicrosoftDocs/PowerShell-Docs/main/reference/7.6/Microsoft.PowerShell.Core/About/about_Automatic_Variables.md : `$PSCommandPath` and `$PSScriptRoot` populated only for scripts (R12). Normative.

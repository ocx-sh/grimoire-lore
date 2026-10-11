---
title: zsh, fish, nushell and elvish for scripts, emitted code and pasted blocks
topic: shell scripting across shells and operating systems (alt shells; wave 3, group alt-shells)
model: sonnet
id_family: SH-ZSH, SH-FISH, SH-NU, SH-ELV
consolidates:
  - shell-alt-shells/zsh.md
  - shell-alt-shells/fish.md
  - shell-alt-shells/nu-and-elvish.md
date: 2026-10-11
---

# zsh, fish, nushell and elvish

All runs 2026-10-11 on Linux (WSL2). No macOS host: every macOS or BSD claim is "unverified: read only". nu and elvish were run on Linux only; the Windows `rc.elv` path stays unverified.
Versions are real binaries: zsh 5.0.8 / 5.3.1 / 5.8 / 5.9 (+ 5.9.2 and the 5.10 draft in the dive); fish 3.6.0 / 4.0.2 / 4.7.0 / 4.9.3; nu 0.100.0 to 0.116.1 (14 pinned builds); elvish 0.18.0 to 0.21.0.
Wave-2 rules are cited by ID, not restated: [SH-GATE-09/11](shell-gate.md), [SH-ERR-15..18, 27](shell-errexit.md), [SH-EXP-08/09](shell-expansion.md), [SH-EMIT-02/17/25..28/30](shell-emit.md), [SH-CI row 14](shell-ci.md).
Fixture roots (never in `/tmp`, an exemplar clone or a fleet repo): `ZX` = `/home/mherwig/.cache/research-lang/shell-tools/fixtures/zsh`, `FX` = `.../fixtures/fish`, `NX` = `.../fixtures/nu-and-elvish`, `CX` = `.../fixtures/alt-shells-consolidation` (this consolidation's own re-runs, `r1.sh` to `r10.sh`, `applied.sh`); `matrix.sh` = `/home/mherwig/.cache/research-lang/shell-tools/matrix.sh`.

Script kinds a rule binds (as in the frame): **INST** installer or bootstrap, **CI** a CI step, **DEV** dev tooling and docs a human or agent pastes, **LIB** a library sourced by others, **RC** interactive rc or integration, **EMIT** code a tool emits for a shell.

## Verdict

1. **zsh is a review-and-port family.** The fleet has 0 authored zsh scripts and 1 vendored `.zsh` file; zsh reaches it as bash code sourced into zsh (LIB, RC), emitted code (EMIT) and command blocks that a human pastes into a zsh login shell (DEV). An authored zsh script starts `emulate -L zsh -o err_exit -o no_unset -o pipe_fail` and targets 5.8; emitted rc code keeps 5.0.8 (ZSH-01, ZSH-10).
2. **Every command block in a rule, skill or README quotes its globs** (DEV, docs). zsh aborts the whole block on an unmatched glob and `grep` never runs; bash runs it with a literal operand. At least 18 sites in 15 catalog files fail this today ([zsh.md §5](shell-alt-shells/zsh.md); ZSH-05, ZSH-06).
3. **zsh gate (CI, DEV):** `zsh -fn` on 5.3.1 or newer (never 5.0.8), the two-tier grep, one runtime run on the floor and ceiling builds; shfmt is advisory; ShellCheck never touches a zsh file (ZSH-12, ZSH-13).
4. **fish is supported 3.6.0 to 4.9.3** (INST, EMIT, DEV). It has no errexit; the gate is `fish --no-config --no-execute FILE` (exit 127) on the floor and the ceiling plus three greps, never `fish -c` and never ShellCheck or shfmt (FISH-01 to FISH-07).
5. **fish cleanup is `fish_exit` plus three `--on-signal` handlers** that `rm`, remove themselves and re-raise, on a `set -g` variable (INST, EMIT); `set -q X` is true for an empty string, so an empty `OCX_HOME` sources `/env.fish` today (FISH-09, FISH-10).
6. **Emitted fish config** is one `conf.d/<tool>.fish`, idempotent under re-source, with `fish_add_path --path` and no universal variables; values are quoted with `\` escaped first, then `'` (EMIT, RC; FISH-13, FISH-14).
7. **nu is ~monthly breaking minors with no 1.0.** Every nu file declares `# nu-range: FLOOR..CEILING`; the gate is `nu-gate.nu --strict` on both ends, never bare `--ide-check` or `nu-check`; shared and emitted nu is written in the safe intersection and selects version files with a `const` and `source` (INST, EMIT, DEV; NU-01 to NU-06).
8. **nu and elvish cleanup is capture, clean, then `exit` with the original status;** helpers raise an error and never `exit`; an external in tail position of `try` gets `| complete`; neither shell has `trap`, so no rule claims signal-safe cleanup (INST; NU-09, NU-11, NU-14, ELV-05, ELV-06).
9. **elvish is 0.18.0 to 0.21.0** (latest release 0.21.0, 2024-08-14): gate = compile + deprecation + denylist, never `-compileonly` alone; `$edit:` compile messages are tolerated in rc files only; probe new commands with `resolve` (INST, EMIT, RC; ELV-01 to ELV-04).
10. **None of the four is a CI step shell.** GitHub Actions has no `shell: zsh|fish|nu|elvish` (actionlint: "shell name is invalid"); run them from a `bash` step with `zsh -f`, `fish --no-config`, `nu --no-config-file` (ZSH-14; [SH-CI row 14](shell-ci.md)).
11. **Fleet defects found (report only, owner Q6):** `www-setup` installers leak a temp dir on `exit` (nu, elvish) and never register cleanup (fish); `install.nu` warns on nu 0.114.1 and 0.116.1; ocx `conf.d/ocx.fish` mishandles an empty `OCX_HOME`; the grimoire-lore catalog has unquoted-glob blocks.
12. **51 rules, 41 MUST, each MUST with a check that was run** (or a stated reason it is a reading heuristic). New beyond the three dives: the `set -q` empty-string rule (FISH-09), the blanket `||` ban (FISH-07), the `.zshenv` grep (ZSH-11), and the widened `read` and `local path` greps (ZSH-02, ZSH-03). 15 conflicts with the dives or wave 2 are resolved below.

## The ruleset

Rules are grouped by the check that catches them: each family opens with its checks (each watched red on a planted violation and green on a compliant twin on 2026-10-11, unless marked), then the rules that check enforces. Every check **prints the violation**: empty output is the pass. `.` stands for the directory to scan. Status vocabulary: **red yes** = watched red on a plant and green on its twin; **measured** = a real run recorded the behaviour but there is no plant/twin pair; **heuristic** = a reading check, no tool sees it.

### Conflicts resolved

- **C1, zsh parse gate floor.** [SH-GATE-11](shell-gate.md) lists `zsh -fn FILE` for "5.0.8, 5.9" (1 broken, 0 good); [zsh.md SH-ZSH-23](shell-alt-shells/zsh.md) says never 5.0.8. Re-run (`CX/r1.sh`): on 5.0.8 the valid twin (`${a[1]}`) exits 1 `bad substitution`; on 5.3.1 and 5.9 it exits 0; the broken plant exits 1 on all three. **Resolved:** the gate runs on 5.3.1 or newer; SH-GATE-11's row stays right for files without subscripts and needs this footnote from its owner.
- **C2, `trap ... EXIT` in a function.** [SH-ERR-27](shell-errexit.md) is CONSIDER; zsh.md makes it SHOULD (zsh-only) and MUST (shared). Re-run (`matrix.sh zsh ZX/trap/tmpdir-lib.sh`): `work-dir-GONE-after-helper` on 5.0.8, 5.3.1, 5.8, 5.9; the twin and `matrix.sh bash` (3.2 to 5.3, 8 of 8) print `alive`. **Resolved:** severity splits by who sources the file (ZSH-08); SH-ERR-27 needs amending by its owner, not edited here.
- **C3, `echo -e`.** [SH-EXP-09](shell-expansion.md) says never `echo -e` in any file sourced into sh or zsh; zsh.md says it is fine natively. Native zsh `echo` interprets backslashes (SH-EXP's own C3); the triage grep finds 102 corpus hits, mostly ohmyzsh native code. **Resolved:** SH-EXP-09 binds sh-bound code; ZSH-15 is SHOULD for files that may be sourced into sh; native zsh `echo -e` is not a defect.
- **C4, fish `||` was a heuristic.** fish.md SH-FISH-07 limits the `||` problem to "floor 4.0.2 or older" and offers no grep. Re-run (`CX/f1.fish`, `f3.fish`): `nosuch-cmd || echo RHS-RAN` skips the right side on 3.6.0 and 4.0.2 and runs it on 4.7.0 and 4.9.3; `nosuch; or echo` runs on all four; `false || echo` runs on all four. **Resolved:** a greppable ban on every `||` while the floor is below 4.7.0 (plant 1 line, twin 0; `www-setup/src` 0 hits). `&&` is not banned (its right side must not run when a missing command fails, on any version; not run on a missing left side).
- **C5, `fish -c` as a parse check.** [SH-GATE-11](shell-gate.md) and FISH-01 say parse a file; ocx's test harness drives fish with `-c` (`ocx@c001637dd3ce:crates/ocx_shell/src/shell/hook.rs:1986-2010`). Re-run (`CX/f2.fish`): `fish -c 'echo ('` exits **0** on 3.6.0 and 127 on 4.0.2, 4.7.0, 4.9.3; `fish --no-execute FILE` exits 127 on all four. **Resolved:** the gate parses a file; `-c` is fine for behaviour tests under a hermetic `XDG_CONFIG_HOME` (FISH-16).
- **C6, `grep -L` exit status.** nu and zsh dives write "exit 0 with output on the plant". Re-run (`CX/r7.sh`, GNU grep 3.12): the plant lists its file with exit **1**, the twin prints nothing with exit **0**; the status follows "a line was selected". **Resolved:** every `-L` check says "judge by the listed files"; the exit status is never the signal.
- **C7, `nu-check` is a parse gate, not a warning gate.** [SH-GATE-11](shell-gate.md) and the installer audit (`install.nu` "0 / 0 errors", [fleet-shell-shape.md:513](shell-audit/fleet-shell-shape.md)) versus nu-and-elvish.md. Re-run (`CX/r5.sh`, `CX/r10.sh`): `--ide-check` exits 0 with `"severity":"Error"` on `s01-let-env.nu` on 0.105.1 and 0.116.1; default `nu-gate.nu` on `www-setup@a251c3631047:src/install.nu` exits 0 on 0.105.1 and **1** on 0.114.1 and 0.116.1 (`nu::parser::deprecated`). **Resolved:** both are true (parse-clean is not warning-free); SH-GATE-11 stays the parse floor and NU-02 adds the layer above it.
- **C8, `elvish -compileonly`.** SH-GATE-11 lists it (2 broken, 0 good). Re-run (`CX/r6.sh`, 0.21.0): `e05-eawk.elv` is `-compileonly` 0 but `elv-gate.sh` 1; `e02-except.elv` is 2 and 1; the valid `edit-valid.elv` is 2 (false positive on `$edit:`) and 0 with `--tolerate-edit`. **Resolved:** ELV-02 extends the row; the "not run: elvish on `edit:` scripts" gap in SH-GATE-11 is closed.
- **C9, severity of fish/nu own-file placement.** [SH-EMIT-17](shell-emit.md) is SHOULD; fish.md SH-FISH-16 is MUST. Placement is a preference, but duplicate handlers and universal-variable growth are measured faults (`FX/placement.fish` exit 1 on the three plants, `FX/persist.fish` exit 1 on the bare `fish_add_path` plant, both on all four fish). **Resolved:** SH-EMIT-17 keeps SHOULD for *where*; FISH-13 is MUST for *content that is idempotent and does not persist*.
- **C10, shfmt in the zsh gate.** [SH-GATE-09](shell-gate.md) lists zsh in shfmt's scope (3.13.0+); zsh.md says shfmt rejects 54 of 572 exemplar files. `shfmt -ln zsh` parses 498 of 572 on 3.13.1 and 518 on 3.14.1 and misses `always`, `foreach`, `repeat`, `for k v in`. **Resolved:** advisory over an explicit file list; `zsh -fn` is the gate of record (ZSH-12).
- **C11, `read` pattern too narrow.** zsh.md's hard tier `read -[a-zA-Z]*a( |$)` misses `read -p` (a coprocess in zsh) and split flags (`read -r -a`, `read -r -p`). Re-verified widened form (`CX/zshgate/hard.sh`): plant 14 lines (13 before widening), twin 0, valid-zsh guard 0; ohmyzsh 3 lines (a user variable named `PIPESTATUS`, `gallois.zsh-theme:30,32,39`), p10k, fzf, autosuggestions 0. **Resolved:** the widened form is the rule's check.
- **C12, `local path` on one line.** The dive's anchors (`^[[:space:]]*(local|typeset|declare)`) miss `f() { local path=/tmp; status=$?; }`. **Resolved:** anchor widened to `(^|[;{(][[:space:]]*)`; plant catches it, twin 0, guard 0 (`CX/zshgate/plant`, `twin`).
- **C13, fish bash-habit grep matched comments.** The dive's backtick and `[[` patterns hit 411 lines in fish-shell `share/` and 23 in `www-setup/src`, all comments. **Resolved:** a `^[^#]*` prefix; `www-setup/src` now 0, `share/` 128 hits, all from the backtick pattern (0 for `[[` and for `echo "\n"`), read as false positives: backticks inside `--description` and message strings (4 sampled, e.g. `share/functions/export.fish:2`).
- **C14, duplicate regex.** zsh.md's `[ a == b ]` pattern `(^|[^[])\[ [^]]* == ` is [SH-EXP-08](shell-expansion.md)'s own grep. **Resolved:** SH-EXP-08 owns the meaning; the hard tier carries the same regex so one command runs once; no second rule.
- **C15, hook rules restated.** nu-and-elvish.md SH-NU-08 and SH-ELV-08 repeat [SH-EMIT-27/28](shell-emit.md) (MUST and SHOULD). **Resolved:** no rule here; hooks stay in SH-EMIT-26/27/28 at their severities and NU-07 and FISH-15 only point at them; elvish idempotence is SH-EMIT-28's SHOULD.

### zsh (SH-ZSH, 15 rules)

Floor and ceiling: runtime checks run on zsh 5.0.8, 5.3.1, 5.8, 5.9 (the dive adds 5.9.2 and the 5.10 draft; 5.10 is unreleased).

**Checks**

```sh
# Z1  parse (CI, DEV): zsh >= 5.3.1 only; exit 1 on a parse error
zsh -fn FILE
# Z2  hard tier: spellings never right in native zsh (CX/zshgate/hard.sh; one command, run with the file kinds present)
grep -rnE \
  -e 'read( +-[a-zA-Z]+)* +-[a-zA-Z]*[ap]( |$)' \
  -e '\<PIPESTATUS\>' -e '\<BASH_SOURCE\>' -e '\<FUNCNAME\>' \
  -e '\$\{!' \
  -e '\$\{[A-Za-z_0-9]+(\^\^|,,|\^|,)\}' \
  -e '(^|[[:space:];])(mapfile|readarray)[[:space:]]' \
  -e '(^|[[:space:];])shopt[[:space:]]' \
  -e 'export -f[[:space:]]' \
  -e '(^|[;{(][[:space:]]*)(local|typeset|declare) +(-[a-zA-Z]+ +)?(path|fpath|cdpath|manpath|status|pipestatus|argv)(=|$|[[:space:];}])' \
  -e '(^|[;{(][[:space:]]*)(path|fpath|cdpath|manpath|status|pipestatus|argv)=[^(]' \
  -e '(^|[^[])\[ [^]]* == ' \
  --include='*.zsh' --include='*.zsh-theme' .
# Z3  triage tier: legal in zsh, wrong in sourced-into-sh code or needs a reader (ZX/lint/gate2.sh DIR triage)
grep -rnE -e 'echo -[a-zA-Z]*[en]' -e '\$\{[A-Za-z_0-9]+\[0\]\}' -e '\<BASH_VERSION\>' -e '\<BASH_REMATCH\>' -e 'trap .* EXIT' \
  --include='*.zsh' --include='*.zsh-theme' .
# Z4  prologue (judge by the listed files; C6)
grep -rL -e 'emulate -L zsh' --include='*.zsh' .
grep -rn -e 'emulate -L zsh[[:space:]]*$' -e 'emulate -L zsh[[:space:]]*;' --include='*.zsh' .
# Z5  .zshenv
grep -rnE -e '^[[:space:]]*(setopt|unsetopt|bindkey|autoload|compinit|source|read|print|printf|echo)([[:space:]]|$)' \
  -e '^[[:space:]]*\.[[:space:]]' --include='.zshenv' --include='zshenv' .
# Z6  runtime on the floor and ceiling builds: matrix.sh zsh SCRIPT  (or ZX/zall.sh SCRIPT)
# Z7  pasted block, in a directory where no glob matches
zsh -f -c 'BLOCK'
# Z8  CI and directive hygiene
grep -rn -e 'shell: *zsh' --include='*.yml' --include='*.yaml' .
grep -rnE -e 'shellcheck +(shell|source)=(bash|sh|dash|ksh)' --include='*.zsh' --include='.zshrc' --include='.zshenv' .
```

| Check | Plant | Twin | Red/green evidence | Enforces |
|---|---|---|---|---|
| Z1 | `CX/plant-broken.zsh` | `CX/twin-subscript.zsh` | plant exit 1 on 5.0.8, 5.3.1, 5.9; twin exit 0 on 5.3.1 and 5.9, **exit 1 on 5.0.8** (`bad substitution`); `CX/r1.sh` | ZSH-12 |
| Z2 | `CX/zshgate/plant` (14 lines), `ZX/lint/gate-plant` (12) | `zshgate/twin`, `gate-twin`, valid-zsh `gate-fp` | 0 lines on all three twins; ohmyzsh 3 (variable named `PIPESTATUS`), p10k 0 | ZSH-02, ZSH-03, ZSH-09 |
| Z3 | `gate-plant` (6 lines) | `gate-twin` (0) | `CX/r7.sh`; fzf `completion.zsh:247` `${rest[0]}` under `setopt localoptions ksh_arrays` is a documented false positive | ZSH-04, ZSH-08, ZSH-09, ZSH-15 |
| Z4 | `ZX/g-prologue/plant` lists `tool.zsh` | `g-prologue/twin` lists nothing | bare-emulate grep plant 1 line, twin 0; runtime `errexit/prologue-plant.zsh` exit 0 on 6/6, `prologue-twin.zsh` exit 1 on 6/6 | ZSH-01 |
| Z5 | `CX/zshenv/plant/.zshenv` (4 lines) | `zshenv/twin/.zshenv` (0) | `zsh -c 'echo CMD-OUTPUT'` under the plant on 5.9 prints `loaded .zshenv` and `source:4: no such file or directory`; under the twin only `CMD-OUTPUT` (`CX/r8.sh`) | ZSH-11 |
| Z6 | `ZX` fixtures | their twins | see each rule; builds 5.0.8, 5.3.1, 5.8, 5.9 (+5.9.2, 5.10-dev in the dive) | ZSH-04, 05, 07, 08, 09, 10 |
| Z7 | `ZX/mx02` plant; live `CX/mx02-live` (empty dir with `.github/`) | quoted twin | `zsh -f -c 'grep -rn -e bes_backend -e build_event .bazelrc* .github/'` prints `zsh:1: no matches found: .bazelrc*`, exit 1, grep never runs; bash prints `grep: .bazelrc*: No such file or directory`, exit 2, and does search `.github/` | ZSH-06 |
| Z8 | `CX/zshci/plant` (1), `CX/zsh-sc/plant` (1) | `zshci/twin`, `zsh-sc/twin` (0) | `shell: [bash, dash, zsh, ...]` in `www-setup/.github/workflows/test-docker-matrix.yml:92` is data and does not match `shell: *zsh` | ZSH-13, ZSH-14 |

**SH-ZSH-01 (MUST) binds DEV, LIB: start every zsh script with a known configuration and keep its strictness through `emulate`.** An executable script is `#!/usr/bin/env zsh` and its first statement is `emulate -L zsh -o err_exit -o no_unset -o pipe_fail`; a function that calls `emulate -L zsh` restates `-o err_return -o no_unset -o pipe_fail` in the same call; a library sourced into a user shell uses fzf's shape (quoted builtins, `no_aliases`, body in `{ } always { restore }`).
- Why: a user's `.zshenv` and options change the script's meaning; `emulate -L zsh` alone resets `ERR_EXIT`, so `set -e; f() { emulate -L zsh; false; echo X }` prints `X` on all six builds ([zsh.md §2](shell-alt-shells/zsh.md); model `junegunn/fzf@25adb674537b:shell/completion.zsh:18-24`).
- Check: Z4. Red: yes.

**SH-ZSH-02 (MUST) binds DEV, LIB, EMIT: write the zsh spelling, never the bash one.** `pipestatus`, `read -A`, `read -r '?prompt'`, `${(P)n}`, `${(k)h}`, `${(U)x}` / `${(L)x}`, `${(%):-%x}` and `${0:A:h}` for the file's own path (`$0` in a function is the function name), `funcstack`, `setopt`, `lines=("${(@f)$(<f)}")`; never `PIPESTATUS`, `read -a`, `read -p`, `${!n}`, `${!h[@]}`, `${x^^}`, `BASH_SOURCE`, `FUNCNAME`, `shopt`, `mapfile`, `readarray`, `export -f`, `[ a == b ]`.
- Why: each is empty, `bad substitution`, `bad option` or `command not found` on 5.0.8 to 5.10-dev ([zsh.md §3](shell-alt-shells/zsh.md)); `read -p` means coprocess in zsh.
- Check: Z2 (the `[ == ]` regex is SH-EXP-08's, C14). Red: yes (plant 14, twin 0, guard 0).

**SH-ZSH-03 (MUST) binds DEV, LIB: never declare, `local` or scalar-assign `path`, `fpath`, `cdpath`, `manpath`, `status`, `pipestatus`, `argv`.** Array forms (`path=(~/bin $path)`, `typeset -U path`) are the idiom.
- Why: `local path=/z` makes `ls` vanish (rc 127) on 5.3.1 to 5.10-dev and is a hard error on 5.0.8; `status=1` is a read-only error on every build ([zsh.md §4](shell-alt-shells/zsh.md)). Array forms satisfy: `ohmyzsh@42a4ccb1b14d:plugins/asdf/asdf.plugin.zsh:6`.
- Check: Z2 (last two patterns; the one-line-function form is C12). Red: yes.

**SH-ZSH-04 (MUST) binds DEV, LIB: do not rely on word splitting or 0-based arrays.** Hold lists in arrays; split on purpose with `${=v}`, `${(z)v}` or `${(s: :)v}`; index from 1 (`${a[1]}`, `${a[-1]}`, `$#a`); remove an element with `a[1]=()`, never `unset 'a[1]'`; keep `sh_word_split` and `ksh_arrays` inside a `local_options` function; still quote `"$v"` for the empty-argument case.
- Why: `for w in $list` runs once (`n=1`) on 5.0.8 to 5.10-dev; `${a[0]}` is empty; `unset 'a[1]'` leaves `count=3 elems=[|y|z]` ([zsh.md §3](shell-alt-shells/zsh.md); [zsh FAQ 3.1](https://zsh.sourceforge.io/FAQ/zshfaq03.html)). Deliberate use satisfies: `zsh-users/zsh-autosuggestions@85919cd1ffa7:src/fetch.zsh:15`.
- Check: Z3 (`${name[0]}`) and Z6 `ZX/bridge/assert-native.zsh` (`bz_split want [3] got [1]`, exit 1) against the bridge (exit 0 on 5.3.1+). Red: yes (runtime and triage). No static check sees unquoted splitting (ShellCheck cannot parse zsh, SC1071): a reader flags an unquoted `$name` that holds a list in `for`, `set --` or command position.

**SH-ZSH-05 (MUST) binds DEV, LIB, EMIT: give every glob an explicit no-match policy.** `(N)` or `setopt local_options null_glob` for an optional glob; quote a glob that is an operand of another tool; never `ls *.x(N)` (an empty list lists the cwd); never `unsetopt nomatch` file-wide.
- Why: an external command with an unmatched glob is skipped (status 1) but `echo *.zzz`, `for f in *.zzz` and any function body abort the whole script, on 5.0.8 to 5.10-dev ([zsh.md §5](shell-alt-shells/zsh.md)).
- Check: Z6 (`ZX/nomatch/nm-*.zsh`) run in an empty directory, expecting no `no matches found`. Red: yes (red `nm-echo`, `nm-for`, `nm-func`, `nm-ls`, `nm-N-ls`; green `nm-N`, `nm-local`, `nm-ok-cmdarg`; 6/6 builds). Static: none; heuristic.

**SH-ZSH-06 (MUST) binds DEV (docs, rules, skills, READMEs): a pasted command block quotes every glob it hands to a tool, prefers `grep -r --include='*.ext' .` or `find . -name '*.ext'`, and is tested in a directory where no glob matches.** (M-X-02: owner files the issues; this set only commits to the rule.)
- Why: all six sampled catalog blocks abort or skip on 6/6 zsh builds; bash runs them with a literal operand ([zsh.md §5](shell-alt-shells/zsh.md)); live: Z7 row above. The owner's login shell is zsh ([shell-gate.md](shell-gate.md), note "The owner's login shell is zsh").
- Check: Z7 plus the dive's pattern list `grep -rn -e 'docs-quality/\*\.md' -e 'friction-logs/\*\.md' -e 'WORKSPACE\*' -e '\.bazelrc\*' -e 'build/publications/\*/' --include='*.md' .`, which is specific to the known sites; no general static check exists, so the runtime run is the judge. Red: yes (`ZX/mx02/mx02.sh plant` rc=1 on 6/6, `fixed` passes; live repro above).

**SH-ZSH-07 (MUST) binds DEV, LIB: under `set -e` or `err_exit` never write `! cmd` as a statement; write `if ! cmd; then` or `cmd || ...`.** SHOULD, inside this rule: do not lean on exemptions the 5.10 draft changes (`{ false && true } always { }`, a function ending in a compound `&&`/`||`, `{ cmd; ... } || true` under `err_return`).
- Why: `set -e; ! false | true` exits 1 on 5.0.8 only; `set -e; f() { true }; ! f` exits 1 on 5.0.8 to 5.9.2 and continues on 5.10-dev; `if ! f` is `reached` on all six ([zsh.md §6](shell-alt-shells/zsh.md); [zsh README, incompatibilities since 5.9](https://raw.githubusercontent.com/zsh-users/zsh/master/README)).
- Check: Z6 `ZX/errexit/bang-pipe.zsh` (5.0.8 exit 1, 5.3.1+ `after`), `ZX/probes/bang-func-red.zsh` (exit 1 on five builds, `after-bang-f` on 5.10-dev) against `bang-func.zsh` (`reached` on 6/6). Red: yes. Re-run on the 5.10 release.

**SH-ZSH-08 (MUST in any file bash also sources; SHOULD in zsh-only files; resolves SH-ERR-27) binds LIB, DEV: no `trap ... EXIT` inside a function.** Arm it once at top level, or use `{ body } always { cleanup }`, or `setopt local_traps`; code shared with bash uses `emulate sh -c` / `setopt posix_traps`.
- Why: C2 re-run: the function-scoped trap fires at function return on every zsh build (`mk_work() { work=$(mktemp -d); trap 'rm -rf "$work"' EXIT; }` deletes the directory it just made) and at shell exit in bash. `ohmyzsh@42a4ccb1b14d:plugins/archlinux/archlinux.plugin.zsh:37` does it on purpose in zsh-only code (satisfies the SHOULD; would break if bash sourced it).
- Check: Z3 (`trap .* EXIT`; judge function against top level) and Z6 `ZX/trap/tmpdir-lib.sh`. Red: yes (GONE on 5.0.8, 5.3.1, 5.8, 5.9; `tmpdir-twin.sh` alive on all; bash 3.2 to 5.3 alive, 8 of 8).

**SH-ZSH-09 (MUST) binds LIB, RC: source POSIX or bash code into zsh only inside an emulation, after grepping it for residue the bridge cannot repair.** `emulate sh -c '. lib.sh'` (sticky for the functions it defines) or a wrapper `w() { emulate -L sh; . lib.sh; call; }` that sources and calls; defining natively and calling under `emulate -L sh` repairs nothing. Before sourcing, run Z2 with `--include='*.sh'` and Z3's `BASH_REMATCH` and `BASH_VERSION`; any hit means a zsh sibling or a `${ZSH_VERSION-}` branch, not a bridge.
- Why: native 6 mismatches become `all-ok` under the bridge and the wrapper on 5.3.1, 5.8, 5.9, 5.9.2, 5.10-dev; `wrapL-late` equals native; the bridge cannot repair `PIPESTATUS`, `read -a`, `local path`, `status`, `${x^^}`, `BASH_REMATCH`, `FUNCNAME`, `mapfile`, `export -f`; on 5.0.8 even `local arr=(x y z)` fails ([zsh.md §8](shell-alt-shells/zsh.md)).
- Check: Z2/Z3 on the library; Z6 `ZX/bridge/assert-native.zsh` (exit 1) against `assert-bridge.zsh` and `assert-wrapL.zsh` (exit 0 on 5.3.1+) and `matrix.sh bash ZX/bridge/assert-bash.sh` (8/8 `all-ok`). Red: yes.

**SH-ZSH-10 (SHOULD) binds DEV, LIB, EMIT: state and keep the floor.** Header `# zsh >= 5.8`; authored scripts target 5.8, emitted rc code 5.0.8; on 5.0.8 write `local -a arr; arr=(...)`, never `local arr=(...)`, `printf -v`, `typeset -A h=(...)`, `--emulate`, `wait -n` or named references.
- Why: 5.0.8 fails five constructs ([zsh.md §10](shell-alt-shells/zsh.md): NEWS 5.1 for `local a=(...)`, NEWS 5.5 for `typeset -A h=([k]=v)`); macOS 12 ships 5.8 and macOS 14 5.9 ([platform audit](shell-audit/platform-matrix.md); unverified: read only, no macOS host).
- Check: Z6 on the floor and ceiling builds (`ZX/probes/localarr.zsh`, `emulate-flag.sh`). Red: yes.

**SH-ZSH-11 (MUST) binds RC, CI, DEV: keep `.zshenv` silent and tiny, and run scripts with `zsh -f`.** `.zshenv` holds exports only (no `setopt`, no stdin, no output), guarded by `[[ -o rcs ]]`; PATH and login environment go in `.zprofile`, interactive setup in `.zshrc`; CI, agents and test harnesses run `zsh -f script`.
- Why: `.zshenv` is read by every zsh including `zsh -c` and scripts; `zsh -f` skips every rc file; `zsh -l -c` reads `.zprofile` and `.zlogin` but not `.zshrc` ([zsh.md §9](shell-alt-shells/zsh.md); [zsh startup files](https://zsh.sourceforge.io/Doc/Release/Files.html)). Z5 row: a `.zshenv` that prints corrupts the stdout of every `zsh -c`.
- Check: Z5. Red: yes (grep plant 4, twin 0; runtime above).

**SH-ZSH-12 (MUST) binds CI, DEV: the `*.zsh` gate is `zsh -fn` on 5.3.1 or newer, the two-tier grep, one runtime run on the floor and ceiling builds, and advisory `shfmt -ln zsh -i 2 -l` on an explicit file list.** Never `zsh -n` on 5.0.8; never `shfmt -f` discovery for zsh; do not adopt zshellcheck 1.8.0.
- Why: C1 and C10; ShellCheck and the other linters cannot discriminate zsh defects (zshellcheck 1.8.0 discriminates 7 of 17 plants, `ZC1037` fires on every `echo`; [zsh.md §11](shell-alt-shells/zsh.md)). [SH-GATE-11](shell-gate.md) already carries the `zsh -fn` row.
- Check: Z1 on the 5.9 image (`docker run --rm -v "$PWD:$PWD" -w "$PWD" zshusers/zsh:5.9 zsh -fn FILE`), Z2, Z3, Z6. Red: yes (Z1 row).

**SH-ZSH-13 (MUST) binds CI, DEV: never run ShellCheck on a zsh file and never paste `# shellcheck shell=bash` into one.**
- Why: ShellCheck answers SC1071 (error, exit 1) on the plant and on the compliant twin alike, so it is inadmissible; `-s bash` returns 12+ false positives (`SC2296`, `SC2082`, `SC2168`) on the twin and exits 0 on 200 of 572 corpus files ([zsh.md §11](shell-alt-shells/zsh.md); [SH-GATE](shell-gate.md): `shell=zsh` is rejected, SC1103).
- Check: Z8 second grep. Red: yes (plant 1, twin 0); ShellCheck exit 1 on both is the dive's red.

**SH-ZSH-14 (SHOULD) binds CI: exercise zsh code from a `bash` step with `zsh -f ...`; no `shell: zsh` in a workflow.**
- Why: GitHub Actions has no built-in zsh `shell:`; actionlint reports "shell name is invalid" ([SH-CI row 14](shell-ci.md), run there, not here).
- Check: Z8 first grep. Red: yes (plant 1, twin 0); actionlint itself heuristic here.

**SH-ZSH-15 (SHOULD) binds RC, LIB: scope option changes, register hooks the documented way, print portably, order p10k's block.** `setopt local_options ...` (or `emulate -L`) inside functions; `autoload -Uz add-zsh-hook; add-zsh-hook precmd fn` ([SH-EMIT-25](shell-emit.md), cited); `print -r --` or `printf` in files that may be sourced into sh (C3); in `.zshrc`, code that may read the console runs above a p10k instant-prompt block.
- Why: a bare `setopt err_return` in a function leaks to the caller (`errret-nolocal` exits 1, `errret-local` continues, 6/6; [zsh.md §6](shell-alt-shells/zsh.md)); p10k redirects stdin and output during init ([p10k README:1035-1067](https://github.com/romkatv/powerlevel10k/blob/d05a1b00f9a6/README.md)). The idiom is the majority: `ohmyzsh@42a4ccb1b14d:lib/async_prompt.zsh:40-41`, 59 files use `add-zsh-hook`.
- Check: Z3 (`echo -[a-zA-Z]*[en]`); the rest heuristic. Red: yes for Z3 (plant line 20); `setopt` scoping measured (`errexit.zsh`); p10k ordering not run.

### fish (SH-FISH, 16 rules)

Supported range 3.6.0 (Debian 12, LTS to 2028-06-30) to 4.9.3 (latest, 2026-09-08); Debian 13, Alpine 3.22/3.23 and Fedora 43 ship 4.0.2 ([fish.md F1](shell-alt-shells/fish.md)).

**Checks**

```sh
# F1  parse (CI, DEV, EMIT): a FILE, never a -c string; on the floor (3.6.0) and ceiling (4.9.3); exit 127 = parse error
fish --no-config --no-execute FILE
# F2  bash habits the parser accepts (CX/fishbash/hard.sh; comment lines skipped for backtick and [[ , C13)
grep -rnE --include='*.fish' \
  -e 'set -[a-z]* pipefail' -e '^[[:space:]]*set -[euo]+[[:space:]]*(;|$)' \
  -e '^[^#]*\[\[ .* \]\]' -e '^[^#]*`[^`]*`' \
  -e '^[[:space:]]*(local|declare)[[:space:]]' \
  -e 'echo "[^"]*\\[nt]' .
# F3  version ledger (CX/fishledger/hard.sh)
grep -rnE --include='*.fish' \
  -e '%self' -e 'bind -k' -e 'on-job-exit \$fish_pid' -e 'string sub -s 1 -l 1.*FISH_VERSION' \
  -e '^[[:space:]]*\{[[:space:]]' -e '[|]&' -e 'string pad .*-C' -e 'status language' \
  -e 'max-matches' -e 'string repeat [0-9]' -e 'path basename .*-E' \
  -e '^[[:space:]]*\$\(' -e 'command -- ' -e 'builtin -- ' \
  -e '(^|[;[:space:]])status=[0-9]+ ' .
# F4  emitted config: idempotence and persistence
grep -rn --include='*.fish' -e 'set -[a-zA-Z]*U' -e 'set --universal' -e 'set -[a-zA-Z]*a[a-zA-Z]* PATH' \
  -e 'set -[gx]* PATH \$PATH' -e 'eval "function' -e "eval 'function" -e '__fish_initialized' -e 'fish_frozen_' \
  -e 'SETUVAR' -e 'fish_add_path [^-]' .
# F5  control-flow and test hazards
grep -rnE --include='*.fish' -e '[|][|]' .
grep -rlPz --include='*.fish' '\n[ \t]*or [^\n]*\n[ \t]*and ' .
grep -rnE --include='*.fish' -e 'set -q [A-Za-z_]+; *and +(echo|set|string|printf)[^;]*\$[A-Za-z_]' .
grep -rn --include='*.fish' -e 'test -[nz] \$[A-Za-z_]' -e '\[ -[nz] \$[A-Za-z_]' .
# F6  cleanup, exit and destructive-path hazards (judge the xargs line by the listed files)
grep -rl --include='*.fish' -e 'mktemp' . | xargs -r grep -L -e 'fish_exit' -e '--on-signal' -e 'trap '
grep -rn --include='*.fish' -e 'if not [a-z_]*die' -e 'if [a-z_]*die' -e 'while [a-z_]*die' .
grep -rn --include='*.fish' -e 'set -l [A-Za-z_]* (mktemp' -e 'rm -[a-z]* "\$[A-Za-z_]*"/' -e 'rm -[a-z]* \$[A-Za-z_]*/\*' .
# F7  runtime on all four: matrix.sh fish FX/cleanup.fish VICTIM | FX/placement.fish FILE | FX/persist.fish FILE |
#     FX/quote.fish fish|posix | FX/events.fish | FX/versions.fish | FX/exitsem.fish | FX/errorflow.fish | FX/orrhs.fish
# F8  tool hygiene
grep -rn --include='*.yml' --include='*.yaml' --include='*.sh' -e 'shellcheck.*\.fish' -e 'shfmt.*\.fish' .
```

| Check | Plant | Twin | Red/green evidence | Enforces |
|---|---|---|---|---|
| F1 | `FX/gate/b01_unterminated_begin.fish`, `FX/greps/violation/master_only.fish` | `FX/gate/ok.fish` | exit 127 / 0 on 3.6.0, 4.0.2, 4.7.0, 4.9.3 (`FX/gate.out`); `fish -c 'echo ('`: status 0 on 3.6.0, 127 on 4.0.2+ (`CX/f2.fish`) | FISH-01 |
| F2 | `CX/fishbash/plant` (8 lines), `FX/greps/violation` (7) | `fishbash/twin`, `FX/greps/compliant` (0) | `www-setup/src` 0; fish-shell `share/` 128 (backtick only), read as false positives (C13) | FISH-02, FISH-06 |
| F3 | `CX/fishledger/plant` (13), `FX/greps/violation` (6) | twin and compliant (0) | each ledger row differs on at least one version pair (`matrix.sh fish FX/breaks.fish`, 30 cases) | FISH-05 |
| F4 | `FX/greps/violation` (9 lines) | `compliant` (0) | `FX/placement.fish` exit 1 on 3 plants and 0 on `twin_confd.fish`; `FX/persist.fish` exit 1 / 0; all four fish | FISH-13 |
| F5 | `FX/greps/violation/or_and_chain.fish`; `||` plant 1 line; `CX/setq/plant/env.fish` | `if_not.fish`; twin 0 | `CX/setq.fish`: `plant=[] twin=[/default]` on all four; `FX/dep/offending.fish` 4 `test: called with one argument` lines on 4.0.2+, `clean.fish` 0 | FISH-07, FISH-09 |
| F6 | `FX/greps/violation/mktemp_plain.fish`, `exit_in_cond.fish`, `rm_glob.fish` | `compliant/` (0) | `FX/cleanup.fish` below; `exitsem.fish`: `e12_if_cond_in_function rc=0` against `e13_stmt_in_function rc=4` | FISH-08, 10, 11 |
| F7 | `FX/cleanup.fish v0_plain` | `v8_reraise` | `CX/r9-v0.out`, `r9-v8.out` below | FISH-10, 12, 13, 14, 15 |
| F8 | `FX/greps/violation/Taskfile.yml` (2 lines) | compliant (0) | ShellCheck SC1071/SC2148 exit 1 and `shfmt -l fn.fish` exit 1 (`FX/sc/`) | FISH-03 |

**SH-FISH-01 (MUST) binds CI, DEV, EMIT: gate every `.fish` file, and every fish script an emitter writes, with `fish --no-config --no-execute FILE` on the floor (3.6.0) and the newest release (4.9.3); exit 127 fails; parse a file, never a `-c` string; use only released syntax.**
- Why: C5; master-only syntax (`$(cmd)` in command position, `command --`, `builtin --`) parses on master and fails on 4.9.3, which is why `fish-shell@ac50fe526f74` HEAD files (`share/functions/help.fish:231`, `fish_git_prompt.fish:183`) fail `fish -n` on 4.9.3 ([exemplar-shape.md:602](shell-audit/exemplar-shape.md)).
- Check: F1 and F3 (last three patterns). Red: yes.

**SH-FISH-02 (MUST) binds INST, DEV, EMIT: no bash habit the fish parser accepts.** No `set -euo pipefail`, `set -e`/`-u` (it means *erase*), `[[ ]]`, backticks, `local`, `declare`, or `\n`/`\t` inside a double-quoted `echo` string (use `printf 'a\nb\n'`).
- Why: `set -euo pipefail` is a run-time error (`set: -euo: unknown option`, status 2) and the script keeps running; `echo "a\nb"` prints the literal `a\nb` on all four versions ([fish.md F2, F3](shell-alt-shells/fish.md); `FX/cases/17_set_e_cargo_cult.fish` rc 2, "still running after false").
- Check: F2. Red: yes.

**SH-FISH-03 (MUST) binds CI: ShellCheck and shfmt never get a `.fish` file; fish has its own discovery:** `git ls-files -z -- '*.fish' | xargs -0 -r -n1 fish --no-config --no-execute`.
- Why: ShellCheck exits 1 with SC1071/SC2148 on any fish file; `shfmt -l FILE` fails (`must be followed by then`); `shfmt -f` and `shfmt -l DIR` skip `.fish` silently with exit 0, so [SH-GATE-09](shell-gate.md) discovery never reaches fish ([fish.md F9](shell-alt-shells/fish.md)). `www-setup@a251c3631047` gates its fish installer with `fish --no-execute` only (satisfies).
- Check: F8. Red: yes.

**SH-FISH-04 (MUST) binds INST, DEV, EMIT, CI: the supported range is fish 3.6.0 to 4.9.3; scripts and emitted config use only constructs valid and equal on both ends; CI runs the file on 3.6.0, 4.0.2 and 4.9.3; raise the floor to 4.0.2 after 2028-06-30.**
- Why: F1 table in [fish.md](shell-alt-shells/fish.md) (Debian 12 3.6.0-3.1+deb12u1; Debian 13, Alpine, Fedora 43 4.0.2).
- Check: F7 `matrix.sh fish FILE` must print equal output and exit equal on all four, plus F3. Red: yes (`FX/breaks.fish`, 30 cases).

**SH-FISH-05 (MUST) binds INST, DEV, EMIT: use no construct that changes meaning or fails across the range.** No `?` glob (globs on 3.6.0 only), `%self`, `bind -k` (errors from 4.1), `NAME=value` on the special `status` (ignored before 4.9.0, an error from it); no 4.1+ syntax (`{ a; b }`, `|&`, `string pad -C`, `status language` 4.3+) and no 4.0+ options (`string match --max-matches`, `string repeat` without `-n`, `path basename -E`) while the floor is 3.6.0; no first-character version compare.
- Why: five constructs change meaning silently (`?` globs, `for` locals persisting between iterations, `||` RHS, `string repeat 3 ab` returning 1, `status=123`), five fail loudly on the older fish while `--no-execute` stays silent ([fish.md F2](shell-alt-shells/fish.md); [fish CHANGELOG](https://github.com/fish-shell/fish-shell/blob/master/CHANGELOG.rst)).
- Check: F3, then F7 on 3.6.0 and 4.0.2. Red: yes (plant 13, twin 0). The `?` glob is heuristic: an unquoted `?` in a word used as a path pattern.

**SH-FISH-06 (MUST) binds INST, DEV: fish has no errexit; read the status on the next line and branch explicitly.** `set -l rc $status` immediately after the command, `$pipestatus` for pipelines, `if`/`if not`, explicit `exit`/`return`; never emulate `set -e`; never `exit` 123, 124 or 125 ([SH-ERR-18](shell-errexit.md)).
- Why: a pipeline's status is its last stage; `false` mid-script does nothing ([fish.md F3](shell-alt-shells/fish.md)). `ocx@c001637dd3ce:crates/ocx_shell/src/shell/hook.rs:342-346` saves `$status` on entry and returns it (satisfies).
- Check: F2 for the emulation; F7 `FX/errorflow.fish`. Red: yes for the statuses and the `set -euo` plant; "status captured on the next line" is heuristic.

**SH-FISH-07 (MUST) binds INST, DEV, EMIT: no `||` while the floor is below 4.7.0, and no `or`/`and` chain after a failing test.** Probe a dependency with `command -q NAME; or ...` or `if not command -q NAME`; replace `test -e F` / `or echo` / `and return 1` with `if not`.
- Why: C4; the chain returns 1 when the test *succeeded* (`FX/errorflow.fish` row 10 `returns 1 (want 0)`, [fish language docs](https://fishshell.com/docs/current/language.html)).
- Check: F5 (first two greps; the chain grep sees the two-line shape only, `a; or b; and c` on one line needs a read). Red: yes.

**SH-FISH-08 (MUST) binds INST, DEV: a function that calls `exit` is called in statement position only.** A bare line, or the right side of `; or` / `; and`; never an `if`/`while` condition, after `not`, a pipeline stage, or inside `test (...)`; a helper that a caller branches on returns a status and the caller exits. Name exit helpers `die`, `__die*` or `fatal` so the grep sees them.
- Why: in those positions inside a function the shell stops with status 0 (7 of 16 placements, all four versions; same shape as [SH-ERR-17](shell-errexit.md); [fish.md F3](shell-alt-shells/fish.md)). Satisfied: `www-setup@a251c3631047:src/install.fish:209-216,316-324,536-541`, whose comments name the defect.
- Check: F6 second grep and F7 `FX/exitsem.fish`. Red: yes (helpers with other names need a read).

**SH-FISH-09 (MUST) binds INST, EMIT, RC: an empty string is a set variable; guard with `test -n "$x"` and quote every value given to `test`.** `set -q X; and test -n "$X"` for "set and non-empty"; `test -n "$x"`, never `test -n $x`; no one-argument `test foo`.
- Why: `set -q VAR` is true for `VAR=''`, so `set -q OCX_HOME; and echo $OCX_HOME; or echo /default` yields `plant=[]` against `twin=[/default]` on 3.6.0, 4.0.2, 4.7.0, 4.9.3 (`CX/setq.fish`, 2026-10-11); `test -n $empty` is true on all four and the one-argument form is being removed (fish CHANGELOG 4.0.0; [test docs](https://fishshell.com/docs/current/cmds/test.html)). POSIX `${V:-default}` treats empty as unset, so a port from sh is wrong by default.
- Check: F5 last two greps; `fish --no-config --debug=deprecated-test FILE 2>&1 >/dev/null` empty on 4.0.2+ (the category does not exist on 3.6.0). Red: yes. `install.fish:453` (`set -q _flag_version; and set ocxver $_flag_version`) is a benign hit: argparse presence, not an environment value.

**SH-FISH-10 (MUST) binds INST, EMIT: cleanup is `fish_exit` plus three signal handlers, on a global variable.** Before creating a temp file or directory register `--on-event fish_exit` (removes it) and `--on-signal INT`, `TERM`, `HUP` handlers that `rm`, remove themselves with `functions -e`, then re-raise with `kill -s SIG $fish_pid`; the variable is `set -g`; promise no status for a lone INT or for HUP before 4.7.0; KILL always leaks.
- Why: `fish_exit` does not run when a signal kills the shell; a handler that does not exit leaves the script running; `exit 143` inside a handler never gives the parent 143; a `set -l` variable is invisible to the handlers ([fish.md F4](shell-alt-shells/fish.md)). Re-run (`CX/r9-v0.out`, `r9-v8.out`): `v0_plain` leaks on exit 3, TERM, INT, HUP, INT-group and KILL on 3.6.0 and 4.0.2 (exit 1); `v8_reraise` leaks only on KILL (exit 0), TERM rc 143, HUP rc 0 on 3.6.0 and 129 on 4.7.0.
- Check: F6 first grep and F7 `FX/cleanup.fish`. Red: yes.

**SH-FISH-11 (MUST) binds INST, DEV: validate a path variable before a destructive command and quote it as one word.** `test -n "$tmp"; and test -d "$tmp"; or exit 1`, then `command rm -rf -- $tmp`; never `rm -rf "$tmp"/*` or `rm -rf $tmp/*` with a variable that can be empty.
- Why: `"$tmp"/*` with `tmp=''` is `/*`; the unquoted spelling is safe only for an empty list ([fish.md F11](shell-alt-shells/fish.md); `FX/emptyvar.out`). `install.fish:603,623,643` use `rm -rf $tmpdir` (safe for an empty list, no empty-string guard).
- Check: F6 third grep. Red: yes.

**SH-FISH-12 (MUST) binds INST, EMIT, RC: detect a version numerically and a feature by probe.** `string match -r '^(\d+)\.(\d+)' -- $version` and a numeric compare; `status test-feature NAME` (0 on, 1 off, 2 unknown); never the first character of the version.
- Why: the `string sub -s 1 -l 1 $FISH_VERSION` idiom answers "old" for fish 10 (`FX/versions.fish`: `uv/virtualenv idiom ... -> wrongly-old` for `10.0.1`). Violated: `uv@72e1fc88f354:crates/uv-virtualenv/src/activator/activate.fish:42,88` and the virtualenv copies.
- Check: F3 pattern `string sub -s 1 -l 1.*FISH_VERSION`; F7 `FX/versions.fish`. Red: yes.

**SH-FISH-13 (MUST) binds EMIT, RC: emitted fish config is one `conf.d/<tool>.fish` rewritten whole, idempotent under re-source and repeated starts, and persists nothing.** Fixed-name handler functions; `fish_add_path --path`; no `set -U`/`set -Ua`, no `set -gxa PATH`, no `eval`-generated handler names; never theme or key-binding variables, `fish_variables`, `__fish_initialized` or `fish_frozen_*`.
- Why: C9; sourced twice, `set -gxa PATH` gives two copies and a counter-named handler fires twice; a bare `fish_add_path` writes a universal `fish_user_paths` into `fish_variables` on all four; 4.3+ moves theme variables into `conf.d/fish_frozen_theme.fish`; 4.8+ no longer creates `__fish_initialized` ([fish.md F6](shell-alt-shells/fish.md); [SH-EMIT-17](shell-emit.md)). Satisfied: `ocx@c001637dd3ce:crates/ocx_shell/src/shell/hook.rs:328` (`if not functions -q __ocx_prompt_hook`), `ajeetdsouza/zoxide@86b443cffcd7:templates/fish.txt:61,63`.
- Check: F4 and F7 `FX/placement.fish`, `FX/persist.fish`. Red: yes.

**SH-FISH-14 (MUST) binds EMIT: quote a value for fish with the [SH-EMIT-02](shell-emit.md) form.** Escape `\` first, then `'`, inside single quotes (or `string escape --style=script` when the code runs in fish); never the POSIX `'\''` quoter.
- Why: fish single quotes treat only `\\` and `\'` as escapes; the POSIX quoter loses 3 of 8 hostile values on every version ([fish.md F7](shell-alt-shells/fish.md)). Satisfied: direnv `shell_fish.go:107`, oh-my-posh `fish.go:41-47`, ocx `escape.rs:19-21` (20/20); violated: mise `src/shell/fish.rs:182,207` and starship `src/init/mod.rs:44,60,100` (17/20; mise end to end turns `a\\b` into `a\b`, a trailing `\` makes the file unparsable; [emitters-compared.md:140-143](shell-audit/emitters-compared.md)).
- Check: F7 `matrix.sh fish FX/quote.fish fish` exit 0 (8/8) against `quote.fish posix` exit 1 (LOST x3), all four. Red: yes. Static: none.

**SH-FISH-15 (SHOULD) binds EMIT, RC: a hook is a fixed-name function with `--on-event fish_prompt` ([SH-EMIT-26](shell-emit.md)), and the emitter assumes it never fires in a script.** Code that must run in scripts uses `--on-variable PWD` or `fish_exit`.
- Why: `fish_prompt` and `fish_postexec` never fire in a script or `fish -c`; `PWD`, `fish_exit` and custom events do (`FX/events.fish` on all four; [fish.md F5](shell-alt-shells/fish.md)).
- Check: F7 `FX/events.fish` prints no `fish_prompt fired`. Red: yes (a behaviour listing, no plant/twin pair).

**SH-FISH-16 (SHOULD) binds DEV, CI: tool hygiene.** `fish_indent --check FILE` of the same release as the gating interpreter; littlecheck tests (`#RUN: %fish --no-config %s`, `# CHECK:`) on 3.6.0 and the newest release; the suite clean under `fish --debug=deprecated-test` on 4.0.2+; scripts that must not read user config run as `fish --no-config script.fish`; never `#!/usr/bin/env -S fish --no-config` for an Alpine or busybox target.
- Why: `fish script.fish` and `env fish` load `conf.d` and `config.fish`; busybox env 1.37 has no `-S` (`docker run alpine:3.22 env -S 'echo a b'` exits 1); `fish_indent --check` exit 1 covers unformatted and unparseable input ([fish.md F9, F10](shell-alt-shells/fish.md)). ocx's harness sets `XDG_CONFIG_HOME` to an empty temp dir for the same reason (`hook.rs:1986-2010`, satisfies).
- Check: `fish_indent --check FILE; echo $?` (`ind_bad` 1, `ind_ok` 0, `ind_broken` 1, four versions); `python3 -I littlecheck.py -s fish=PATH FILE` (good 0, bad 1). Red: yes. The target-list review of `env -S` is heuristic.

### nushell (SH-NU, 14 rules)

nu has no 1.0: 0.105.1 (2025-06-10) to 0.116.1 (2026-10-04) is 11 breaking minors ([releases](https://github.com/nushell/nushell/releases)). Floor in the rules below is 0.105.1; every claim names its version.

**Checks**

```sh
# N1  the gate (INST, EMIT, DEV): on the floor AND the ceiling nu; exit 1 is red; --allow takes a comma-separated STRING
nu nu-gate.nu --strict --allow ocx,git FILE...      # NX/nu-gate.nu, shipped verbatim below
# N2  declared range (judge by the listed files; C6)
grep -rL -F -e '# nu-range:' --include='*.nu' .
# N3  denylists (NX/denylist-nu.sh, denylist-nu-new.sh, denylist-nu-bashisms.sh): output is the violation
grep -rn -F --include='*.nu' \
  -e 'let-env' -e 'def-env' -e 'extern-wrapped' -e 'date format' -e 'unfold ' -e 'str collect' -e 'str find-replace' \
  -e 'register ' -e 'with-env [' -e ' && ' -e 'do -s' -e 'do -p' -e 'fetch ' \
  -e '$nu.home-path' -e '$nu.temp-path' -e 'str upcase' -e 'str downcase' -e 'into value' \
  -e 'get -i' -e 'get --ignore-errors' -e 'select -i' -e 'reject -i' -e 'filter {' -e 'random dice' -e 'def run ' -e '| size' .
grep -rn -F --include='*.nu' -e '--optional' -e 'str uppercase' -e 'str lowercase' -e 'detect type' \
  -e '$nu.home-dir' -e '$nu.temp-dir' -e ' finally ' .
grep -rn -F --include='*.nu' -e ' && ' -e ' || ' -e '$(' -e '$?' -e '<<' -e '2>&1' -e '`' -e 'export ' \
  -e '; do' -e '; then' -e '$HOME' -e 'echo -n' .
# N4  runtime-branch guard
grep -rn -E --include='*.nu' -e 'if .*version.*\{ *source' .
# N5  runtime: NX/cleanup/cleanup-plant.nu against cleanup-twin-portable.nu; NX/hang-run.sh VERSION BYTES
# N6  reading heuristics only
grep -rn -E --include='*.nu' -e 'try *\{ *\^' -e 'try *\{[^}]*\} *$' .
```

| Check | Plant | Twin | Red/green evidence (2026-10-11) | Enforces |
|---|---|---|---|---|
| N1 | `NX/stale/s01-let-env.nu`, `s05-size.nu`, `s11-str-upcase.nu` | `NX/safe/safe-intersection.nu` | `--ide-check` exit **0** on s01 with `"severity":"Error"` on 0.105.1 and 0.116.1; `nu-gate` s01 exit 1 on both; `--strict` twin exit 0 on both; `--strict` `s05-size` (a binutils `size` ran) exit 1 on both; default s11 `str upcase` exit 0 on 0.105.1, 1 on 0.116.1 (`CX/r5.sh`) | NU-02, NU-03, NU-04, NU-05 |
| N2 | `NX/range-hdr/plant/a.nu` listed | `range-hdr/twin` lists nothing | plant exit 1 with 1 line, twin exit 0 and empty (`CX/r7.sh`) | NU-01 |
| N3 | `NX/stale` (20 lines), (6), `NX/bashisms` (12) | `NX/safe` (0), (0), `bashisms-twin` (0) | known false positives: ` && ` and `fetch ` inside string literals (`CX/r7.sh`) | NU-04, NU-05, NU-08 |
| N4 | `NX/guard/entry-naive.nu:2` | `NX/guard/entry-const.nu` | `entry-const` prints `ABC` on 0.105.1 and 0.116.1; `entry-naive` exit 1 on 0.105.1 (`extra_positional`), exit 0 on 0.116.1 (`CX/r5.sh`) | NU-06 |
| N5 | `cleanup-plant.nu`, `leak/` helper | `cleanup-twin-portable.nu` | plant leaves the directory, twin cleans and keeps exit 7, on 0.105.1 and 0.116.1; 300000 bytes HANG on 0.116.1, 65536 done, 65537 HANG, twin exit 0 on 0.112.1 and 0.116.1 ([nu-and-elvish.md §9](shell-alt-shells/nu-and-elvish.md)) | NU-09, NU-11 |

**SH-NU-01 (MUST) binds INST, EMIT, DEV: declare the nu range in the file and gate both ends.** Header `# nu-range: 0.105.1..0.116.1`; run N1 with the floor binary and the ceiling binary; re-run on every new minor.
- Why: 11 breaking minors in 16 months and no 1.0 ([nu-and-elvish.md §1](shell-alt-shells/nu-and-elvish.md)). nu_scripts has no range: 69 of 1,545 files differ across 0.105.1..0.116.0 and 35 fail on both ([exemplar-shape.md:52](shell-audit/exemplar-shape.md)); zoxide states `v0.106.0+` (`ajeetdsouza/zoxide@86b443cffcd7:templates/nushell.txt:107`).
- Check: N2 plus N1 per binary. Red: yes.

**SH-NU-02 (MUST) binds INST, EMIT, DEV, CI: gate every nu file with `nu-gate.nu --strict`, never bare `--ide-check` or `nu-check`.**
- Why: C7; `--ide-check` always exits 0; it and `nu-check` see neither deprecations (`str upcase`, `get -i`), removed commands (they parse as externals) nor fall-through; `nu-gate.nu` closes all three and is itself written in the safe intersection (runs on 0.100.0 to 0.116.1). `--allow` takes a comma string because a list flag is a type mismatch on 0.114.1 and 0.116.1 (NU-13).
- Check: N1. Red: yes.

**SH-NU-03 (MUST) binds INST, EMIT, DEV: call externals with `^`; a bareword that is neither a builtin nor a custom command is a defect.**
- Why: a removed command falls through to whatever is on PATH: `"abc" | size` ran GNU binutils `size` and exited 0 with a wrong answer on 0.105.1 and 0.116.1 when an `a.out` was in the cwd ([nu-and-elvish.md §5](shell-alt-shells/nu-and-elvish.md)).
- Check: N1 `--strict` (`unknown command treated as external`); `--allow` lists barewords that are intentional. Red: yes (default mode green is the blindness).

**SH-NU-04 (MUST) binds INST, EMIT, DEV: write the safe intersection in shared and emitted nu.** The N3 first denylist (dated 2026-10-11) is the do-not-write list: broken on the whole range are `let-env`, `def-env`, `extern-wrapped`, `date format`, `fetch`, `unfold`, `str collect`, `str find-replace`, `register`, `with-env [..]`, `&&`, `do -s`; changed in the window are `$nu.home-path` and `$nu.temp-path` (hard error from 0.110.0), `str upcase`/`str downcase` (warning from 0.114.0), `get -i` (warning from 0.106.1; `--optional` unknown before 0.106.0), `into value` (0.108.0), `def run` (a builtin from 0.114.0, an error on 0.115/0.116), `random dice` (gone by 0.114.1). Name nothing `run` or after a parser keyword; prefix helpers with the tool name.
- Why: the safe forms print byte-identical output on 0.100.0 to 0.116.1 ([nu-and-elvish.md §4, §6](shell-alt-shells/nu-and-elvish.md); [0.114 notes](https://www.nushell.sh/blog/2026-07-04-nushell_v0_114_0.html)).
- Check: N3 first grep and N1 (`name_is_keyword` on 0.116.1). Red: yes (20 lines on `stale/`, 0 on `safe/`).

**SH-NU-05 (MUST) binds INST, EMIT, DEV: a file that must run on the floor uses no name born after it.** `--optional` (0.106.0), `detect type` (0.108.0), `$nu.home-dir` and `$nu.temp-dir` (0.110.0), `finally` (0.111.0), `str uppercase` and `str lowercase` (0.114.0); read a `catch` record through `$e.msg` only (`$e.json` is gone from 0.114.0).
- Why: introduced-in versions from [nu-and-elvish.md §4](shell-alt-shells/nu-and-elvish.md); violated by virtualenv's `activate.nu` (`get --optional` fails 0.105.1: 1 error, 0 on 0.116.0) and uv's template (3 and 2 errors on 0.105.1 and 0.116.0; [fleet-shell-shape.md:516,518](shell-audit/fleet-shell-shape.md)).
- Check: N3 second grep. Red: yes (6 lines on `stale/`, 0 on `safe/`). `$e.json` was measured (s25, p05), not grepped.

**SH-NU-06 (MUST) binds EMIT, INST: select a version-specific file with a `const` and `source`, never a runtime `if`.** `const f = (if (version | get minor) >= 114 { "new.nu" } else { "old.nu" }); source $f`; floor 0.102.0 (0.100.0 and 0.101.0: `not_a_const_command`).
- Why: one unknown flag or subcommand of a known command fails the whole file at parse time, even in a dead branch; the parser reads both files of a runtime branch ([nu-and-elvish.md §7](shell-alt-shells/nu-and-elvish.md)). No exemplar uses it; zoxide bumps its floor instead (10 changelog entries).
- Check: N4 and `nu guard/entry-const.nu`. Red: yes (N4 row).

**SH-NU-07 (SHOULD) binds RC, EMIT: emitted startup code goes in `$nu.data-dir/vendor/autoload/<tool>.nu`, loads for the REPL only, and scripts never depend on it or on `login.nu`.** Hooks follow [SH-EMIT-27](shell-emit.md) (normalise to a list, marker, append; the relative order of `env_change` and `pre_prompt` flips at 0.107.0; `PROMPT_*` is not inherited from 0.103.0).
- Why: measured order on 0.105.1 and 0.116.1: `env.nu`, `config.nu`, `login.nu`, vendor autoload, user autoload, although the [nushell book](https://www.nushell.sh/book/configuration.html) lists `login.nu` last; `nu script.nu`, `nu -c` and `nu -l -c` load no autoload directory ([nu-and-elvish.md §8](shell-alt-shells/nu-and-elvish.md)).
- Check: run `NX/order/` (`1 env.nu;2 config.nu;4 login.nu;3a vendor-autoload;3b user-autoload`). Measured: an order measurement with no plant/twin pair, hence SHOULD. Satisfied: `zoxide@86b443cffcd7:templates/nushell.txt:21-27`.

**SH-NU-08 (MUST) binds INST, EMIT, DEV: no bash syntax in nu.** `&&`, `||`, `$?`, `$(..)`, `export X=`, `<<`, `2>&1`, backticks, `$HOME`, `echo -n`.
- Why: nine of thirteen habits are parse errors, two are silent (a heredoc runs `cat`, a backtick prints the word) ([nu-and-elvish.md §10](shell-alt-shells/nu-and-elvish.md)).
- Check: N3 third grep (false positives inside strings) and N1 (`--strict` for the heredoc). Red: yes (12 lines on the plant, 0 on the twin; `nu-gate` red on `b12-andand-run`, green on `nu-forms.nu`).

**SH-NU-09 (MUST) binds INST: cleanup is capture, clean, then `exit` with the original status; helpers raise `error make` and only the entry point calls `exit`.** Portable on 0.100.0 to 0.116.1: `try { ...; 0 } catch {|e| ...; 1 }`, `rm`, `exit $code`.
- Why: a failing step aborts the script so a trailing `rm -rf` never runs, and a helper `exit` skips the caller's cleanup ([nu-and-elvish.md §9, §14](shell-alt-shells/nu-and-elvish.md)). Violated: `www-setup@a251c3631047:src/install.nu:244,285,295` (the `__ocx-err` helper exits while `$tmpdir`, made at `:499`, is live).
- Check: N5; heuristic `grep -rn -F --include='*.nu' -e 'exit ' .` then confirm the caller owns no temp dir. Red: yes (plant LEFTOVER, twin cleaned, exit 7 preserved).

**SH-NU-10 (SHOULD) binds INST: use `try { } finally { }` only when the floor is 0.116.0 or newer.**
- Why: a parse error below 0.111.0; `finally` ran twice on 0.111.0; 0.114.1 continued past a failed external (exit 7) ([nu-and-elvish.md §9](shell-alt-shells/nu-and-elvish.md)).
- Check: `grep -rn -F --include='*.nu' -e ' finally ' .` against the `# nu-range:` floor. Measured (`tf-b..d` table), not a red/green gate.

**SH-NU-11 (MUST) binds INST, DEV: never leave an external in tail position of `try`; put `| complete` inside.**
- Why: with more than 65536 bytes of output the process hangs forever on nu 0.112.1 to 0.116.1 (0.105.1, 0.110.0, 0.111.0 finish); `gh search` (3 queries) found no upstream issue. Satisfied: `install.nu:148-151` documents the `complete` form.
- Check: N5 (`NX/hang-run.sh 0.116.1 300000` HANG against the twin exit 0); N6 first grep is a reading heuristic that matches plant and twin alike. Red: yes for the hang; the grep is heuristic.

**SH-NU-12 (MUST) binds INST, DEV: do not use bare `try` to ignore an error you must act on.** `try { ^cmd }` exits 0 on a failed command; use `try {..} catch {|e| ..}` and set the exit code, or `^cmd | complete` and read `.exit_code`.
- Why: `try { ^sh -c "exit 7" }` exits 0 ([nu-and-elvish.md §9](shell-alt-shells/nu-and-elvish.md), probe tf-a).
- Check: N6 second grep (heuristic). Measured; no grep run on a plant.

**SH-NU-13 (SHOULD) binds DEV, EMIT: make options and defaults explicit.** Pass a list option as one comma-separated string (`--allow ocx,git`, `split row ","` inside); spell result-changing defaults (`find` is case-sensitive from 0.107.0, `each` over `null` passes `null` from 0.107.0, `*` skips dotfiles in `cp`/`mv`/`du` from 0.110.0); re-test custom completers on 0.116.0 (read only, not run).
- Why: `--allow '[ocx,git]'` parses as nuon on 0.110.0 and 0.111.0 and is a type mismatch on 0.114.1 and 0.116.1 ([nu-and-elvish.md §11](shell-alt-shells/nu-and-elvish.md)).
- Check: `nu argflag/twin-string-flag.nu --allow ocx,git` exit 0 on all four against `plant-list-flag.nu --allow '[ocx,git]'` exit 1 on 0.114.1 and 0.116.1. Red: yes for the flag; the defaults are heuristic.

**SH-NU-14 (SHOULD) binds INST, EMIT: claim no signal-safe cleanup.** nu has no `trap`; `finally` is skipped on SIGTERM and SIGHUP on 0.116.1; SIGINT to the child's process group runs it on nu only; keep temp files under a per-tool state directory that the next run sweeps. Shared with ELV-06.
- Why: single runs in `sig-run.sh` ([nu-and-elvish.md §12](shell-alt-shells/nu-and-elvish.md)).
- Check: heuristic. Measured, single runs.

### elvish (SH-ELV, 6 rules)

Latest release 0.21.0 (2024-08-14); the 0.22 draft changes no language feature ([0.21.0 notes](https://elv.sh/blog/0.21.0-release-notes.html)).

**Checks**

```sh
# E1  the gate (INST, EMIT, RC): exit 1 on a compile message, a stderr "deprecat" line or a removed-name hit; rc files only get --tolerate-edit
ELV="elv.sh 0.21.0" bash elv-gate.sh [--tolerate-edit] FILE...      # NX/elv-gate.sh, shipped verbatim below
# E2  removed names
grep -rn -w --include='*.elv' -e 'eawk' -e 'float64' -e 'except' .
# E3  runtime: NX/elv-guard/{plant,twin}.elv ; NX/cleanup plant/twin; matrix.sh elvish runs 0.21.0 only, NX/elv.sh VERSION FILE runs 0.18.0/0.19.2/0.20.1
```

| Check | Plant | Twin | Red/green evidence (2026-10-11, 0.21.0) | Enforces |
|---|---|---|---|---|
| E1 | `elv-stale/e05-eawk.elv`, `e02-except.elv`, `elv-edit/edit-valid-plus-typo.elv` | `elv-stale/e03-catch.elv`, `elv-edit/edit-valid.elv` with `--tolerate-edit` | `-compileonly` / gate: e05-eawk 0 / **1**; e03-catch 0 / 0; e02-except 2 / 1; edit-valid 2 / 1 (false positive on `$edit:`), with `--tolerate-edit` 0; plus-typo with the flag 1 (`CX/r6.sh`) | ELV-02, ELV-03 |
| E2 | `elv-stale/e02`, `e05` | `e03` | gate red on the same files | ELV-03 |
| E3 | `elv-guard/plant.elv`, `cleanup-plant.elv`, `e13-tmp.elv` | `twin.elv`, `cleanup-twin-defer.elv`, `-finally.elv`, `-status.elv` | guard twin exit 0 on 0.20.1 and 0.21.0, plant exit 2 on 0.20.1; plant leaves the temp dir, three twins clean it, the status twin exits 7, on 0.18.0 and 0.21.0; top-level `tmp` exit 2 | ELV-01, ELV-04, ELV-05 |

**SH-ELV-01 (MUST) binds INST, EMIT, RC: target elvish 0.18.0 to 0.21.0 and run the file on both ends.**
- Why: ([nu-and-elvish.md §13](shell-alt-shells/nu-and-elvish.md)); `matrix.sh elvish` runs 0.21.0 only, so the floor build needs `NX/elv.sh 0.18.0 FILE`.
- Check: E3 per binary. Red: yes (V10 to V12 on 0.18.0 to 0.21.0).

**SH-ELV-02 (MUST) binds INST, EMIT, RC, CI: gate with compile, deprecation and denylist, never `-compileonly` alone; tolerate `$edit:` compile messages in rc files only.**
- Why: C8; every removed command (`eawk`, `float64`, implicit `cd`, `a=b cmd`) fails at run time with `executable file not found`, and `-compileonly` reports `$edit:` as `variable $edit:before-readline not found` although the line works in a real session (pty run: the hook fired once). In scripts wrap `edit:` in `eval` ([SH-EMIT-28](shell-emit.md)).
- Check: E1. Red: yes. Satisfied: `www-setup/src/install.elv` passes `-compileonly` rc=0 on 0.21.0 ([fleet-shell-shape.md:514](shell-audit/fleet-shell-shape.md)).

**SH-ELV-03 (MUST) binds INST, EMIT, RC: do not emit the removed forms.** `a=b cmd` becomes `tmp` inside a `fn` (0.21.0+); `except` becomes `catch`; `float64` becomes `num` or `inexact-num` (`echo (num 1)` printed `1` on 0.18.0, 0.20.1, 0.21.0; [0.20.0 notes](https://github.com/elves/elvish/blob/master/website/blog/0.20.0-release-notes.md)); `eawk` becomes `re:awk`; a bare `/path` becomes `cd /path`; `!=` takes two arguments only; no lone `try`; no `try .. else` without `catch`; `tmp` only inside a function and `with` only when the floor is 0.21.0.
- Why: [nu-and-elvish.md §13](shell-alt-shells/nu-and-elvish.md); a top-level `tmp` is `tmp may only be used inside a function` (`e13-tmp.elv`, exit 2).
- Check: E2 and E1. Red: yes (`e02-except`, `e05-eawk` red).

**SH-ELV-04 (MUST) binds EMIT, INST: probe new commands with `resolve`, not a parsed version.** `fn has-cmd {|n| not (str:has-prefix (resolve $n) '(external')}`.
- Why: a new command in a dead branch compiles on 0.18 to 0.21, so no file split is needed (the opposite of nu, NU-06).
- Check: E3 `elv-guard`. Red: yes (V11, X4).

**SH-ELV-05 (MUST) binds INST: clean up with `defer` inside the function that owns the resource, or `try { } finally { }`; re-exit with `$e[reason][exit-status]`; never `exit` from a helper while a temp dir is live.**
- Why: `defer` is an error at top level and does not run on `exit`; neither shell has `trap` ([nu-and-elvish.md §9, §14](shell-alt-shells/nu-and-elvish.md)). Violated: `www-setup@a251c3631047:src/install.elv:226,285,289` (`ocx-err` exits with `$tmpdir` live, made at `:518`); the success paths at `:521,541,561` clean up.
- Check: E3. Red: yes.

**SH-ELV-06 (SHOULD) binds INST, EMIT: claim no signal-safe cleanup.** `defer` and `finally` are skipped on SIGTERM and SIGHUP (elvish 0.21.0); keep temp files under a per-tool state directory that the next run sweeps. Shared with NU-14; idempotent rc registration is SH-EMIT-28's SHOULD (C15).
- Why: single runs in `sig-run-elv.sh`.
- Check: heuristic. Measured, single runs.

### Gate scripts that exist only as fixtures

These two scripts do not exist in any repo; the set ships them as plumbing at authoring (map "Plumbing at authoring"), with their plants and twins. Copied verbatim from `NX/` on 2026-10-11.

`nu-gate.nu` (runs on nu 0.100.0 to 0.116.1):

```nu
#!/usr/bin/env nu
# nu-gate.nu: parse gate for emitted or hand-written nushell. Exit 1 on ANY of:
#   (1) an `--ide-check` diagnostic (parse/type errors; that flag always exits 0, so its JSON lines are the signal)
#   (2) a parse-time Warning or Error from `if false { source FILE }` (deprecations print only at parse of the
#       sourced file, never under --ide-check or nu-check; the dead branch means FILE is parsed, not run)
#   (3) a bareword command that is neither built-in, custom nor `^`-prefixed and not on PATH (--ide-ast
#       shape_external): the parser turns a removed or unknown command (def-env, register, unfold) into an external call
#   (4) a call to a command the running nu itself files under category "removed" (date format, let-env)
# --allow takes a comma-separated STRING: a list<string> flag given on the command line parses as nuon on nu <= 0.110
# and is a type mismatch on nu >= 0.114.
# Written in the safe intersection: it runs on nu 0.100.0 .. 0.116.1.
# --strict: ANY bareword external is red unless listed in --allow (catches `size`, which a binutils binary answers).
# usage: nu nu-gate.nu [--strict] [--allow ocx,git] file.nu ...
def main [--allow: string = "", --strict, ...files: path] {
  let exe = $nu.current-exe
  let allowed = ($allow | split row "," | where {|a| $a != "" })
  let removed = (scope commands | where category == "removed" | get name)
  mut bad = 0
  for f in $files {
    let abs = ($f | path expand)
    let chk = (^$exe --ide-check 100 $abs | complete)
    for d in ($chk.stdout | lines | where {|l| $l | str starts-with '{"type":"diagnostic"'}) {
      print -e $"($f): diagnostic: ($d)"
      $bad = $bad + 1
    }
    let wrap = (mktemp --tmpdir nu-gate-XXXXXX.nu)
    $"if false { source '($abs)' }\n" | save --force $wrap
    let dry = (^$exe --no-config-file --error-style plain $wrap | complete)
    rm --force $wrap
    for l in ($dry.stderr | lines | where {|l| ($l | str starts-with 'Warning:') or ($l | str starts-with 'Error:')}) {
      print -e $"($f): ($l)"
      $bad = $bad + 1
    }
    let ast = (^$exe --ide-ast $abs | complete | get stdout | from json)
    let raw = (open --raw $abs | into binary)
    for n in ($ast | where shape == "shape_external") {
      let caret = if $n.span.start > 0 { ($raw | bytes at ($n.span.start - 1)..($n.span.start - 1) | decode utf-8) == "^" } else { false }
      if (not $caret) and (not ($n.content in $allowed)) and ($strict or (which $n.content | is-empty)) {
        print -e $"($f): unknown command treated as external: ($n.content)"
        $bad = $bad + 1
      }
    }
    for n in ($ast | where shape == "shape_internalcall") {
      if $n.content in $removed {
        print -e $"($f): removed command: ($n.content)"
        $bad = $bad + 1
      }
    }
  }
  if $bad > 0 { exit 1 }
}
```

`elv-gate.sh`:

```sh
#!/usr/bin/env bash
# elv-gate.sh [--tolerate-edit] FILE...: exit 1 on any elvish compile error, any deprecation warning, or a removed-name denylist hit.
#   --tolerate-edit: ignore compile errors that are ONLY "$edit:..." (rc.elv files are interactive-only; -compileonly has no $edit:)
tol=0; [ "$1" = "--tolerate-edit" ] && { tol=1; shift; }
bad=0
for f in "$@"; do
  j=$(${ELV:-elvish} -compileonly -json "$f" 2>"${TMPDIR:-/tmp}/elv-gate.err"); 
  msgs=$(printf '%s' "$j" | grep -o -e '"message":"[^"]*"')
  if [ $tol = 1 ]; then msgs=$(printf '%s\n' "$msgs" | grep -v -e 'cannot find variable \$edit:' -e 'variable \$edit:.* not found'); fi
  if [ -n "$(printf '%s' "$msgs" | tr -d '[:space:]')" ]; then printf '%s: compile: %s\n' "$f" "$msgs"; bad=1; fi
  if grep -q -i -e 'deprecat' "${TMPDIR:-/tmp}/elv-gate.err"; then printf '%s: %s\n' "$f" "$(grep -i -e deprecat "${TMPDIR:-/tmp}/elv-gate.err" | sed 's/\x1b\[[0-9;]*m//g' | head -2 | tr '\n' ' ')"; bad=1; fi
  if grep -n -w -e 'eawk' -e 'float64' -e 'except' "$f" >/dev/null 2>&1; then printf '%s: removed name (eawk, float64 or except)\n' "$f"; grep -n -w -e eawk -e float64 -e except "$f" | head -3; bad=1; fi
done
exit $bad
```

Note for the author of the shipped copy: `elv-gate.sh` writes its stderr capture to `${TMPDIR:-/tmp}/elv-gate.err`; point `TMPDIR` at a per-run directory so parallel runs do not collide.

## Applied to the fleet and exemplars

Fleet census, re-found 2026-10-11: grimoire-lore has 0 `.zsh`, `.fish`, `.nu`, `.elv` and 0 `.zshenv` files (`git ls-files`); the fleet has 1 vendored `.zsh` (a pdm completion under `ocx-contrib/mirror-pdm-project`), 0 authored zsh, 1 authored fish installer, 1 nu installer, 1 elvish installer ([config-inventory §6.4](shell-audit/config-inventory.md), [fleet-shell-shape.md:512-518](shell-audit/fleet-shell-shape.md)). The `**/*.zsh|fish|nu|elv` globs are live in no fleet root, so the checker needs `--allow-absent` ([map, Artifact set decision](shell-topic-map.md)).

### Satisfied

| Rule | Where | What |
|---|---|---|
| ZSH-01 | `junegunn/fzf@25adb674537b:shell/completion.zsh:18-24,71-73`; `romkatv/powerlevel10k@d05a1b00f9a6:internal/worker.zsh:93,100` | quoted builtins until `emulate zsh`, `always` restore; `emulate -L zsh -o no_aliases ...` per function |
| ZSH-03 | `ohmyzsh@42a4ccb1b14d:plugins/asdf/asdf.plugin.zsh:6`, `plugins/z/z.plugin.zsh:1682` | array forms of `path`/`fpath` |
| ZSH-04, ZSH-05 | `zsh-autosuggestions@85919cd1ffa7:src/fetch.zsh:15`; `ohmyzsh@42a4ccb1b14d:lib/diagnostics.zsh:242` | deliberate `${=v}`; explicit `(N)` policy (9 files use `(N)`) |
| ZSH-08 | `ohmyzsh@42a4ccb1b14d:plugins/archlinux/archlinux.plugin.zsh:37` | function-scoped EXIT trap in zsh-only code: satisfies the SHOULD, would break if bash sourced it |
| FISH-08 | `www-setup@a251c3631047:src/install.fish:209-216,316-324,536-541` | exit helpers in statement position, with an accurate comment |
| FISH-10, FISH-13 | `ocx@c001637dd3ce:crates/ocx_shell/src/shell/hook.rs:328-336`; `zoxide@86b443cffcd7:templates/fish.txt:61,63` | fixed-name hooks, global stamp variable (partial: no signal handlers, see Violated) |
| FISH-14 | direnv `28a73d1df3f3:internal/cmd/shell_fish.go:107`; oh-my-posh `b0a8acd4d402:src/shell/fish.go:41-47`; ocx `escape.rs:19-21` | 20/20 hostile values on all four |
| FISH-16 | `ocx@c001637dd3ce:crates/ocx_shell/src/shell/hook.rs:1986-2010` | harness sets `XDG_CONFIG_HOME` to an empty temp dir |
| NU-01, NU-04 | `ocx@d0cdf8838:crates/ocx_setup/src/shims.rs:183-240,603-640`; zoxide `templates/nushell.txt:107` | gated `ENV_NU`, avoids `$nu.temp-path` and `source (`; states `v0.106.0+` |
| NU-11 | `www-setup@a251c3631047:src/install.nu:148-151` | the `complete` note |
| ELV-02 | `www-setup@a251c3631047:src/install.elv` | `-compileonly` rc=0 on 0.21.0 |

### Violated (report only; owner Q6, nothing was changed)

| Rule | Where | What |
|---|---|---|
| ZSH-06 | `rules/docs-quality.md:128` (`python3 rules/docs-quality/checks/prose.py rules/docs-quality.md rules/docs-quality/*.md`); `rules/bazel-quality/ci.md:145` (`grep -rn ... .bazelrc* .github/`); `rules/bazel-quality/flags.md:139`; `rules/bazel-quality/hermeticity.md:98` (`... .bazelrc* <ci-dir>`), all `grimoire-lore@88d5e14` | unquoted glob operand: zsh aborts the block before the tool runs (Z7 repro), bash searches a literal name; the dive counts at least 18 command-position sites in 15 catalog files (`.bazelrc*`, `WORKSPACE*`, `*.md`, `*.bzl`), plus `skills/docs-plan/SKILL.md:197,200`, `skills/jvm-release/SKILL.md:182`, `skills/bazel-adopt/SKILL.md:277` |
| NU-02, NU-04, NU-01 | `www-setup@a251c3631047:src/install.nu:68` (`get -i $name`), `:243` (`str downcase`), `:487-490` (`get -i sha256` and three more) | `nu-gate` default exits 1 on 0.114.1 and 0.116.1 with `nu::parser::deprecated`, 0 on 0.105.1 (`CX/r10.sh`); the file also has no `# nu-range:` header (`grep -rL` lists it, `CX/applied.sh`) |
| NU-09 | `www-setup@a251c3631047:src/install.nu:244,285,295` | `__ocx-err` exits while `$tmpdir` (`:499`) is live; reproducer in [nu-and-elvish.md §14](shell-alt-shells/nu-and-elvish.md) |
| ELV-05 | `www-setup@a251c3631047:src/install.elv:226,285,289` | `ocx-err` exits while `$tmpdir` (`:518`) is live |
| FISH-10, FISH-11 | `www-setup@a251c3631047:src/install.fish:474,542,599` | three `set -l ... (mktemp)` results with no `fish_exit`, `--on-signal` or `trap` anywhere in the file |
| FISH-09 | `ocx@c001637dd3ce:crates/ocx_setup/src/shims.rs:279` (still at `:279` in the current checkout `259a42943a4e`) | `set -q OCX_HOME; and echo $OCX_HOME; or echo $HOME/.ocx`: `OCX_HOME= fish` sources `/env.fish`; the POSIX shims use `${OCX_HOME:-...}`; fix pattern `set -q OCX_HOME; and test -n "$OCX_HOME"` |
| FISH-10 | `ocx@c001637dd3ce:crates/ocx_shell/src/shell/hook.rs:324-336` | stamp file removed on exit and normal end, leaked on TERM, INT, HUP and Ctrl-C (one empty file per killed interactive shell) |
| FISH-12 | `uv@72e1fc88f354:crates/uv-virtualenv/src/activator/activate.fish:42,88` | first-digit version idiom, wrong at fish 10 |
| FISH-14 | `mise@19e8c8f0d03d:src/shell/fish.rs:182,207`; `starship@d4d0459c5c24:src/init/mod.rs:44,60,100` | POSIX quoter, 17 of 20 hostile values |
| NU-05 | virtualenv `activation/nushell/activate.nu`; uv `activate.nu` template ([fleet-shell-shape.md:516,518](shell-audit/fleet-shell-shape.md)) | `get --optional` fails the 0.105.1 floor (1 error; 3 errors for uv) |
| FISH-01 | `fish-shell@ac50fe526f74:share/functions/help.fish:231`, `fish_git_prompt.fish:183` | `$(...)` in command position fails `fish -n` on 4.9.3; upstream tracks master, a downstream gate must not |
| FISH-10 | `jorgebucaran/fisher@791da644d33d:functions/fisher.fish:85,207` | `set --local source (command mktemp -d)` removed by one `rm -rf` at the end; an interrupted install leaves it |

Clean checks on the fleet (`CX/applied.sh`, 2026-10-11): `www-setup/src` has 0 `||` in fish, 0 hits on the fish version ledger (F3), 0 hits on the emitted-config grep (F4); the only `set -q ...; and` hit is the benign `install.fish:453`.

### New commitments

- Ship the four gate artifacts with plants and twins as the set's plumbing: the zsh hard and triage greps, the three fish greps, `nu-gate.nu` and the nu denylists, `elv-gate.sh` (all currently exist only under the fixture roots).
- Every `.nu` file the set ships carries `# nu-range:`; every dated denylist carries `checked: 2026-10-11` and is re-run on each new nu minor and elvish release.
- File the fleet defects above as issues (owner Q6: not fixed here).
- Amend SH-ERR-27 as C2 resolves it, and add the C1 footnote to SH-GATE-11 (owners of those rules).
- Skills that paste commands (docs-plan, jvm-release, bazel-adopt, bazel-quality rules) quote every glob; the checker runs Z7 against any command block it extracts.

## AI-agent failure modes

Ranked by how many of the four dives met the mode and how large the blast radius was; the ranking is a reading, the checks are mechanical.

1. **Bash habits written into zsh or fish files** (`PIPESTATUS`, `read -a`, `local path`, `${x^^}`, `set -euo pipefail`, `[[ ]]`, backticks, `echo "\n"`). Check: Z2, F2 (ZSH-02, ZSH-03, FISH-02).
2. **Trusting a gate that is blind:** `nu --ide-check` or `nu-check` exit codes, `elvish -compileonly` alone, `fish -c 'broken'` on 3.6.0, `zsh -n` on 5.0.8, ShellCheck on zsh. Check: N1, E1, F1, Z1, Z8 (NU-02, ELV-02, FISH-01, ZSH-12, ZSH-13).
3. **Pasting unquoted globs into a command block** that the owner's zsh login shell aborts. Check: Z7 (ZSH-06).
4. **A helper that exits or traps while a temp resource is live:** `exit` in a nu, elvish or fish helper; `trap EXIT` inside a zsh function that deletes the directory at return. Check: N5, E3, F6, Z3 and Z6 (NU-09, ELV-05, FISH-08, FISH-10, ZSH-08).
5. **Newest-syntax drift:** `str uppercase`, `get --optional`, `{ a; b }`, `$(...)` in fish command position, `string repeat` without `-n`. Check: N3, F3 (NU-04, NU-05, FISH-05, FISH-01).
6. **Hallucinated removed commands** (`def-env`, `let-env`, `fetch`, `eawk`, `float64`, `except`, `date format`). Check: N3 first grep, E2 (NU-04, ELV-03).
7. **Assuming POSIX semantics for an empty variable:** `set -q X; and use $X`, `test -n $x`, `rm -rf "$tmp"/*`. Check: F5, F6 (FISH-09, FISH-11).
8. **Claiming signal-safe cleanup** where the shell has no `trap`, or copying bash's `trap cleanup EXIT INT TERM`. Check: heuristic reading plus F6 first grep; N5 and E3 show what survives (NU-14, ELV-06, FISH-10).
9. **Version compare by string or first digit** (`string sub -s 1 -l 1 $FISH_VERSION`, `if (version) >= ...` around a `source`). Check: F3, N4 (FISH-12, NU-06).
10. **The POSIX quoter reused for fish, or a `shell: zsh` in a workflow.** Check: F7 `FX/quote.fish`, Z8 (FISH-14, ZSH-14).

## Open questions

Owner decisions, each with the default this set applies unless told otherwise:

1. **zsh authored floor: 5.8 or 5.9?** Default 5.8 authored (macOS 12), 5.0.8 for emitted rc code. macOS versions are "unverified: read only" (no macOS host).
2. **fish floor: keep 3.6.0 until Debian 12 LTS ends (2028-06-30)?** Default yes; then 4.0.2.
3. **Ship the gate scripts as set plumbing and require the `# nu-range:` header?** Default yes to both; the checker uses `--allow-absent` for families with no files.
4. **File the fleet defects as issues** (www-setup install.{fish,nu,elv}, ocx `shims.rs:279`, ocx `hook.rs:324-336`, the catalog glob blocks)? Default yes, one issue per repo; no fixes from this set (owner Q6).
5. **Amend SH-ERR-27 and add the SH-GATE-11 footnote (C1, C2)?** Default yes; both are edits to wave-2 files owned elsewhere.
6. **Keep elvish in the set?** Latest release is 0.21.0 (2024-08-14) and the fleet has one elvish installer. Default keep, SHOULD-weight maintenance (5 MUST rules, all measured).

Subareas that need another round (also in the receipt):

- **zsh on macOS:** do 5.8 (macOS 12) and 5.9 (macOS 14) `/bin/zsh` match the Linux builds for `emulate`, `zsh -fn` and `nomatch`? Needs a macOS host.
- **zsh 5.10:** re-run `errexit.zsh` and the `! f` probes on the 5.10 release (ZSH-07 cites the draft).
- **fish 4.1 to 4.6:** which release fixed `||` after a missing command (between 4.0.2 and 4.7.0) and introduced `{ }`, `|&`, `string pad -C`? Only 3.6.0, 4.0.2, 4.7.0 and 4.9.3 were run.
- **nu 0.117 and later:** does `nu-gate.nu` still parse `--ide-ast` JSON and the `removed` command category? Only 14 pinned binaries to 0.116.1 were run.
- **nu tail-position `try` hang:** no upstream issue found by 3 `gh search` queries; file one with the `hang-run.sh` reproducer?
- **nu, elvish and fish on Windows:** `rc.elv` path, `$nu.data-dir`, fish are Linux-only here; run via the host (`cmd.exe`, not CI) before claiming Windows behaviour.

## Sub-artifacts

- [shell-alt-shells/zsh.md](shell-alt-shells/zsh.md): zsh scripts and bash code sourced in zsh; fixtures, 26 candidate rules, exemplar table, contested points.
- [shell-alt-shells/fish.md](shell-alt-shells/fish.md): fish 3.6 to 4.9 for scripts and emitted config; 26 candidate rules, F1 to F12 findings, change ledger.
- [shell-alt-shells/nu-and-elvish.md](shell-alt-shells/nu-and-elvish.md): nushell churn and elvish; the 14 pinned nu builds, denylists, `nu-gate.nu`, `elv-gate.sh`.
- Wave-2 owners cited: [shell-gate.md](shell-gate.md), [shell-errexit.md](shell-errexit.md), [shell-expansion.md](shell-expansion.md), [shell-emit.md](shell-emit.md), [shell-ci.md](shell-ci.md), [shell-dialect.md](shell-dialect.md); audits under [shell-audit/](shell-audit/).

## Key sources

1. https://zsh.sourceforge.io/FAQ/zshfaq03.html (zsh FAQ 3.1, no word splitting)
2. https://raw.githubusercontent.com/zsh-users/zsh/master/README (incompatibilities since 5.9: ERR_EXIT and ERR_RETURN)
3. https://zsh.sourceforge.io/Doc/Release/Options.html (`SH_WORD_SPLIT`, `NOMATCH`, `ERR_EXIT`, `ERR_RETURN`, `LOCAL_OPTIONS`)
4. https://zsh.sourceforge.io/Doc/Release/Files.html (startup files, `.zshenv` read by every zsh)
5. https://raw.githubusercontent.com/mvdan/sh/master/CHANGELOG.md (shfmt `-ln zsh` from 3.13.0)
6. https://github.com/fish-shell/fish-shell/blob/master/CHANGELOG.rst (fish 3.6 to 4.9.3 change ledger)
7. https://fishshell.com/docs/current/language.html (`and`/`or`, status, no errexit)
8. https://fishshell.com/docs/current/cmds/test.html (quote variables, one-argument form)
9. https://fishshell.com/docs/current/cmds/fish.html (`--no-execute`, `--no-config`)
10. https://github.com/nushell/nushell/releases (0.100.0 to 0.116.1)
11. https://www.nushell.sh/book/configuration.html (startup file overview)
12. https://www.nushell.sh/commands/docs/nu-check.html (`nu-check` returns a boolean, not a status)
13. https://www.nushell.sh/blog/2026-07-04-nushell_v0_114_0.html (deprecations, `def run`)
14. https://www.nushell.sh/blog/2026-09-26-nushell_v0_116_0.html (completion model, `finally`)
15. https://elv.sh/blog/0.21.0-release-notes.html (`tmp`, `with`; the 0.20.0 notes cited in ELV-03 cover `num` and the removed forms)

---
title: Fleet shell shape — numbers-first audit of /home/mherwig/dev
agent: audit-fleet-shape (sonnet worker, shell program wave 1)
model: sonnet (claude-sonnet-5-5)
scope: all shell code in the fleet under /home/mherwig/dev (files, GitHub workflow run: blocks, taskfile cmds, PowerShell, fish/nu/elvish), measured after the exclusion list and remote dedupe; no code outside fixtures was modified or executed
method: |
  Walker + classifier (python3 -I) in /home/mherwig/.cache/research-lang/shell-tools/fixtures/fleet-shape/: inventory.py (walk, nested-repo discovery, dedupe by normalised origin URL, git ls-files tracked flag, shebang sniff), classify.py (class rules, appendix A), sc_run.py (shellcheck), ax1.py/ax3.py/ax4.py/ax5.py/ax6*.py/ax45md.py (tables), ablate.py (exclusion ablation).
  Toolchain: R=/home/mherwig/.cache/research-lang/shell-tools/run.sh ($R shellcheck 0.11.0, $R shfmt 3.13.1, fish 4.9.3, nu 0.116.0, elvish 0.21.0, pwsh 7.6.6); matrix.sh posix|bash|pwsh|fish|nu for behaviour probes; task 3.53.1 (ocx toolchain) for mvdan/sh probes; PyYAML 6.0.3 (python3 without -I, because -I hides the user site; yaml.safe_load only) for workflow/taskfile parsing.
  Every number below sits next to its command. Counts that came from a regex are marked (regex) and carry a spot-read false-positive rate; shellcheck/PowerShell-parser/fish/nu/elvish results are parser-derived.
date_researched: 2026-10-10
---

# Fleet shell shape — numbers-first audit

All paths are relative to `/home/mherwig/dev` unless prefixed. Researched 2026-10-10. No macOS host: macOS claims are read-only unless a bash 3.2 container run is shown.

## Contents

1. [Headline numbers](#headline-numbers)
2. [Axis 1 — Inventory and what the extensionless `#!/bin/sh` files are](#axis-1--inventory)
3. [Axis 2 — Dialect census and the H1 test](#axis-2--dialect-census)
4. [Axis 3 — shellcheck and shfmt](#axis-3--shellcheck-and-shfmt)
5. [Axis 4 — Error-handling census](#axis-4--error-handling-census)
6. [Axis 5 — Bash-version features and bash 3.2 risk](#axis-5--bash-version-features)
7. [Axis 6 — Inline shell: workflows and taskfiles](#axis-6--inline-shell)
8. [Axis 7 — PowerShell](#axis-7--powershell)
9. [Axis 8 — fish / nu / elvish](#axis-8--fish-nu-elvish)
10. [Smells (ranked)](#smells-ranked) · [Patterns worth encoding](#patterns-worth-encoding) · [Contradictions of the frame](#contradictions-of-the-frame) · [Gaps](#gaps)

## Headline numbers

| # | Number | Command / source |
|---|---|---|
| 1 | **1064 shell-ish files** in **149 repo roots** (+2 non-git dirs) after exclusions and remote dedupe (5 same-remote duplicates dropped: grimoire-duo, 4 ocx-contrib/mirror-* twins) | `python3 -I inventory.py` -> `149 repos 5 dups 1064 files` |
| 2 | Only **390 (37%)** are fleet-written: 213 authored + 48 agent-config copies + 129 research scratch. 170 (16%) are vendored upstream (uv, devcontainers/cli, material-icon-theme). **504 (47%) are generated/untracked** | `python3 -I classify.py` + `ax1.py` table B |
| 3 | The "~1100 extensionless `#!/bin/sh`" are **389 files, 313 of them ocx toolchain trampolines** (106 distinct contents), gitignored, written by `ocx` into `.ocx/toolchain/shells/`. Authored extensionless: **6** (5 are `bd`-managed hooks) | `ax1.py` C; `ocx/.ocx/toolchain/shells/default/bin/actionlint:2` carries `# ocx-toolchain-trampoline` in 313/313 |
| 4 | Authored: **213 files, 17.7 KLOC** (shell-kind 197 files, 13.2 KLOC) in only **17 repos** | `ax1.py` B |
| 5 | Dialect of 197 authored shell files: **154 `#!/usr/bin/env bash` + 1 `#!/bin/bash` = 155 bash (79%)**, 31 sh (26 `#!/bin/sh` + 5 `#!/usr/bin/env sh`), 11 no shebang (sourced libs/snippets) | `ax45md.py` |
| 6 | **H1 refuted: 0 of 190 sh-shebang scripts carry an SC3xxx** (31 authored). Stripping all inline `# shellcheck` directives surfaces exactly 1 file (`www-setup/src/install.sh:5`, `local`, runtime-probed at :39) | `$R shellcheck --norc -s sh -f json1` |
| 7 | shellcheck 0.11.0 over 534 fleet+vendored scripts: 521 findings, 30 distinct codes. Authored **4.9 findings/KLOC** (0.6 warning+); ocx **1.4**; agent research scratch **79.2**; devcontainers (vendored) 70.1; uv 0.0 | `sc_run.py`, `ax3.py` |
| 8 | shfmt: **161/197 (82%) authored files are clean under the fleet's own `shfmt -d -i 4 -ci`** (ocx 117/117, rules_ocx 7/7, setup-grimoire 5/5); 2-space indent is the *agent-scratch* style (97 of 129 files) | `$R shfmt -l -i 4 -ci` |
| 9 | `set -euo pipefail` in **136/197 authored (69%)**; **63/82 (77%)** once ocx's 73 identical doc-snippet scripts are removed. **0** `local x=$(cmd)` in authored; 0 `pipefail` in any `#!/bin/sh` script | `ax4.py` |
| 10 | Bash 4+ features (assoc array, mapfile, `${x,,}`, EPOCHREALTIME) in **5 of 166** authored bash files; only **1** (`index/scripts/golden-baseline.sh:250`) is invoked from a taskfile. **0** `BASH_VERSION` guards fleet-wide | `ax5.py` |
| 11 | CI: **137 workflows + 15 composite actions, 628 `run:` blocks** in 28 fleet repos (+745 mirror-template workflows, 740 distinct, 2950 blocks). **82% (516) rely on the default shell**; 22 of 39 default-shell pipelines have no pipefail. `${{ }}` in 74 blocks; attacker-controllable (event body/title/ref): **1**, and it is only an `echo` | `ax6.py`, `ax6b.py` |
| 12 | Taskfiles: **99 files, 751 tasks, 954 cmds** (116 multi-line). Bash-only syntax in cmds: **3 constructs in 1 file** (`ocx-mirror/taskfiles/release.taskfile.yml:55,119,121`); task 3.53.1's mvdan/sh accepts them | `ax6t.py` + `tf/Taskfile.yml` probe |
| 13 | PowerShell: **26 files** (13 authored: 10 ps1, 2 psm1, 1 psd1). **0 BOM, 0 CRLF** in authored. **25/26 parse clean on Windows PowerShell 5.1.26100, pwsh 7.4.7 and 7.6.6**; the 1 failure is virtualenv's un-rendered template. 0 PS7-only syntax | `parse_only.ps1` via `matrix.sh pwsh` + host powershell.exe |
| 14 | fish/nu/elvish: **10 files, only 3 authored** (`www-setup/src/install.{fish,nu,elv}`, 650/547/566 LOC). All three parse on the oldest interpreters (fish 3.6.0, nu 0.105.1, elvish 0.21.0) | `fish --no-execute`, `nu --ide-check`, `elvish -compileonly` |

## Axis 1 — Inventory

**How "authored" was decided** (rules in order, appendix A): untracked in git -> `generated-untracked`; origin is astral-sh/uv, devcontainers/{cli,spec} or material-extensions/vscode-material-icon-theme -> `vendored-upstream`; `grimoire-lore/.agents/research/**` -> `research-scratch` (agent-written one-off measurement scripts); under `.claude/ .opencode/ .agents/` -> `agent-config` (installed lore rule/skill copies and hooks); everything else tracked -> `authored`. Tracked-ness is `git ls-files` per repo; content identity is sha256.

**Why the frame's counts were inflated** (command `python3 -I ablate.py`, same `os.walk` with progressively more pruning):

| filter stage | *.sh | *.bash | *.ps1 | *.fish | *.nu | *.elv | noext `#!/bin/sh` |
|---|---|---|---|---|---|---|---|
| 0 only .git/node_modules/target pruned | 3810 | 150 | 168 | 110 | 101 | 67 | 5779 |
| 1 + worktrees (`.worktrees`, `.agents/worktrees`) | 3090 | 150 | 156 | 102 | 93 | 67 | 5769 |
| 2 + `.tmp`, `.tmp-*`, `.probe-*` | 1684 | 148 | 73 | 38 | 29 | 5 | 453 |
| 3 + `.venv venv .cache vendor external bazel-*` | 1433 | 16 | 37 | 12 | 3 | 5 | 452 |
| 4 + 7 sibling clones | 647 | 5 | 25 | 6 | 3 | 1 | 372 |
| final (nested-repo discovery + remote dedupe) | 633 | 5 | 23 | 6 | 3 | 1 | 389 (all shebangs) |

The frame's "~1450 `*.sh`" is stage 3 (1433): it was measured without the sibling-clone exclusion. Stage 4 to final: -14 `.sh` from nested-repo dedupe. The final row's 389 extensionless = 362 `#!/bin/sh` + 21 `#!/usr/bin/env sh` + 6 `#!/usr/bin/env python` (the ablation column counts only `#!/bin/sh`).

**A. per repo, raw (after exclusions + remote dedupe)**

| repo | sh | bash | zsh | ps1 | psm1 | psd1 | fish | nu | elv | noext | all | fleet-written | vendored | generated |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ocx-contrib/mirror-* (96 repos) | 12 | 1 | 1 | 3 | 0 | 0 | 3 | 1 | 0 | 243 | 264 | 0 | 0 | 264 |
| ocx | 212 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 22 | 235 | 129 | 0 | 106 |
| grimoire-lore | 136 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 141 | 141 | 0 | 0 |
| rust-devcontainer-cli/reference-cli | 130 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 130 | 0 | 130 | 0 |
| uv | 29 | 0 | 0 | 8 | 0 | 0 | 1 | 1 | 0 | 1 | 40 | 0 | 40 | 0 |
| www-setup | 17 | 2 | 0 | 5 | 1 | 1 | 2 | 1 | 1 | 1 | 31 | 23 | 0 | 8 |
| grimoire | 18 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 5 | 25 | 18 | 0 | 7 |
| rules_ocx | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 13 | 23 | 10 | 0 | 13 |
| ocx-website | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 14 | 21 | 7 | 0 | 14 |
| ocx-sdk-python | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 14 | 19 | 5 | 0 | 14 |
| ocx-mirror-e2e | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 13 | 18 | 0 | 0 | 18 |
| ocx-mirror | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 9 | 16 | 7 | 0 | 9 |
| ocx-vscode-icons/material-clone | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 15 | 16 | 0 | 0 | 16 |
| grimoire-indexer | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 12 | 4 | 0 | 8 |
| obere-heide-planer | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 10 | 11 | 1 | 0 | 10 |
| setup-grimoire | 2 | 2 | 0 | 4 | 1 | 0 | 0 | 0 | 0 | 1 | 10 | 10 | 0 | 0 |
| creeptd-ng | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 9 | 9 | 0 | 0 |
| ocx-marketing | 9 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 9 | 9 | 0 | 0 |
| (nogit)safe | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 8 | 0 | 0 | 8 |
| oras-www | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 7 | 7 | 0 | 0 |
| find_ocx | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 1 | 0 | 3 |
| ocx-catalog | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 3 | 0 | 1 |
| index | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 3 | 0 | 0 |
| (nogit)ocx-contrib | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 3 |
| arcana | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 |
| fma | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 |
| mirror-asciinema | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 1 |
| ocx2nix | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 1 |
| vscode-ocx | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 |
| **TOTAL** | 633 | 5 | 1 | 23 | 2 | 1 | 6 | 3 | 1 | 389 | 1064 | 390 | 170 | 504 |

**B. class x kind (files, unique content hashes, lines)**

| class | sh | bash | zsh | ps1 | psm1 | psd1 | fish | nu | elv | noext | all | unique sha | LOC |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| authored | 187 | 4 | 0 | 10 | 2 | 1 | 1 | 1 | 1 | 6 | 213 | 213 | 17698 |
| agent-config | 48 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 48 | 18 | 1708 |
| research-scratch | 124 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 129 | 123 | 3320 |
| vendored-upstream | 159 | 0 | 0 | 8 | 0 | 0 | 1 | 1 | 0 | 1 | 170 | 120 | 4376 |
| generated-untracked | 115 | 1 | 1 | 5 | 0 | 0 | 4 | 1 | 0 | 377 | 504 | 254 | 7781 |

**C. generated-untracked breakdown**

| subclass | files | unique sha | top shebang |
|---|---|---|---|
| ocx-toolchain-shim | 313 | 106 | ('#!/bin/sh', 313) |
| docs-snippet-copy(gitignored) | 73 | 71 | (None, 73) |
| ocx-mirror-sandbox | 48 | 34 | ('#!/bin/sh', 24) |
| agent-scratch-untracked | 26 | 24 | ('#!/usr/bin/env bash', 13) |
| pytest-tmp | 18 | 14 | ('#!/bin/sh', 18) |
| husky-generated | 16 | 3 | ('#!/usr/bin/env sh', 15) |
| broken-git-backup-hooks | 8 | 1 | ('#!/bin/sh', 8) |
| build-output | 2 | 2 | (None, 1) |

**Extensionless shebang files (389) — origin by path prefix** (command: `python3 -I - <<<'collections.Counter((f.cls,f.sub) for f in files if f.kind=="noext")'`):

| count | class / path prefix | what it is |
|---|---|---|
| 313 | generated: `<repo>/.ocx/toolchain/shells/default/bin/<tool>` (gitignored, `ocx/.gitignore:130`) | ocx trampoline: 4 lines, `exec "${OCX_BINARY_PIN:-$__ocx_binary}" --project '<repo>' exec -- "${0##*/}" "$@"`. 106 distinct contents (they embed the project path and binary path). Not authored. |
| 27 | generated: `.ocx-mirror/{inspect,lnbred,home}/...` inside ocx-contrib mirror clones | ocx-mirror sandboxes (shims + python entry points) |
| 15 + 1 | generated: `ocx-vscode-icons/material-clone/.husky/_/*`, `www-setup/.claude/artifacts/` | husky v9 generated wrappers (`#!/usr/bin/env sh`), 3 distinct contents |
| 13 | generated: `ocx-mirror-e2e/pytmp/pytest-of-mherwig/pytest-0/` | pytest tmp_path leftovers |
| 8 | generated: `safe/.git.broken-*/hooks/*` (non-git dir) | sample git hooks of two broken-repo backups, 1 distinct content |
| 6 | **authored**: `creeptd-ng/.beads/hooks/{pre-commit,pre-push,...}` (5, `# --- BEGIN BEADS INTEGRATION v0.58.0 ---`, tool-managed but tracked), `setup-grimoire/site/sh` (1, a served bootstrap) | the only authored extensionless code |
| 5 | research-scratch: `grimoire-lore/.agents/research/cmake-*/` | fixture scripts |
| 1 | vendored: `uv/test/packages/fake-uv` | upstream test fixture |

**Other generated/vendored shell, for completeness.** 73 `ocx/website/src/_scripts/**/*.sh` are gitignored copies of `ocx/test/doc_scripts/*.sh` (`ocx/website/src/_scripts/.gitignore:1` "Generated by website:scripts:publish task"; 71 distinct contents). 130 sh files in `rust-devcontainer-cli/reference-cli` are a devcontainers/cli clone (118 under `src/test` fixtures). The 48 agent-config files collapse to **18 distinct contents** — lore rule checks copied into every repo (`.claude/rules` + `.opencode/rules` mirrors).

**Authored by role** (command: group authored by repo + first two path segments): `ocx/test/manual` 24 files / 4137 LOC (manual e2e), `www-setup/src` 5 files / 3627 LOC (the five installers `install.{sh,ps1,fish,nu,elv}`), `ocx/test/doc_scripts` 73 files / 1316 LOC (doc snippets, identical `set -euo pipefail` header), `www-setup/tests/*` 13 files, `index/scripts` 3 / 1049 LOC, `setup-grimoire` 10, `grimoire/test/manual` 7, `grimoire-lore/rules/*/checks` 12, ocx `test/scenarios` 18. Median authored shell file is 23 lines; largest is 913 (`www-setup/src/install.sh`).

**Housekeeping facts** (command: `git ls-files -s` per repo): of 186 authored scripts with a shebang, **93 are committed mode 100644** (not executable): 62 of ocx's 73 doc_scripts, `grimoire/docs/public/install.sh`, `grimoire/catalog/hooks/*/*.sh`, `ocx/test/scenarios/*`. CRLF files among non-generated shell: **0**. `.gitattributes` forces LF in ocx, grimoire, grimoire-lore (`* text=auto eol=lf`), find_ocx and rules_ocx (`*.sh text eol=lf`); 12 other repos with authored shell have no EOL attribute. Gate wiring (command: `git grep -lw <tool>` outside docs): shellcheck referenced in 12 repos, shfmt in 10, actionlint in 11, bats in 2, PSScriptAnalyzer+Pester in 2 (setup-grimoire, www-setup).

## Axis 2 — Dialect census

Command (shebang table): `python3 -I ax45md.py`. Shell-kind = `*.sh`, `*.bash`, extensionless with shebang.

**Shebang distribution (shell-kind files: *.sh, *.bash, extensionless with shebang)**

| class | files | #!/usr/bin/env bash | #!/bin/bash | #!/bin/sh | #!/usr/bin/env sh | other | none |
|---|---|---|---|---|---|---|---|
| authored | 197 | 154 | 1 | 26 | 5 | 0 | 11 |
| agent-config | 48 | 11 | 6 | 1 | 0 | 0 | 30 |
| research-scratch | 129 | 42 | 19 | 62 | 1 | 0 | 5 |
| vendored-upstream | 160 | 19 | 42 | 92 | 3 | 0 | 4 |
| generated-untracked | 494 | 20 | 1 | 371 | 15 | 6 | 81 |

**SC3xxx (shellcheck -s sh) over every #!/bin/sh or #!/usr/bin/env sh script, inline directives honoured**

| class | sh scripts | with >=1 SC3xxx | SC3xxx findings |
|---|---|---|---|
| authored | 31 | 0 | 0 |
| agent-config | 1 | 0 | 0 |
| research-scratch | 63 | 0 | 0 |
| vendored-upstream | 95 | 0 | 0 |

**Commands for the H1 test.** `$R shellcheck --norc -s sh -f json1 <190 files>` (equivalent to `-f gcc`; json1 used so codes can be counted; sanity: fixture `t_sc3.sh` with `[[`, `local`, array yields SC3010, SC3043, SC3030 under `-s sh -f gcc`). Result: **0 files with any SC3xxx** in every class (table above). Inline directives could hide bashisms, so the 190 files were copied with every `# shellcheck ...` line blanked (`nodir/`): still **only `www-setup/src/install.sh`, 19 x SC3043** (`local`). That file is deliberate: `www-setup/src/install.sh:39-40` is `has_local() { local _ 2>/dev/null; }` / `has_local || alias local=typeset`, the rustup idiom.

**Confirmation by running (5 scripts, 11 POSIX interpreters).** Because no script is flagged, the five largest authored sh scripts were wrapped (`__p() { <body> }` so they are parsed, never executed) and run through `matrix.sh posix` (fixtures `wrap/`): `www-setup/src/install.sh`, `www-setup/scripts/gen-dist.sh`, `www-setup/tests/docker/activate.sh`, `grimoire/docs/public/install.sh`, `ocx-sdk-python/tests/fixtures/cli/author_flow.sh`.

```
dash 0.5.12, busybox ash 1.35 + 1.37, mksh R59c, ksh93u+m 2023 + 1.0.10, posh 0.14.1,
bash 3.2 --posix, bash 5.2 --posix, zsh 5.9 --emulate sh : parse-ok, exit 0   (5/5 scripts)
yash 2.52                                                   : exit 2 "cannot read input: Invalid or incomplete multibyte or wide character"
```

The yash failure is the container's POSIX locale meeting an em dash in a **comment**; `LC_ALL=C.UTF-8 yash` parses the same bytes (`wrap/yash_probe3.sh`). Non-ASCII bytes occur in **21 of 31 authored sh scripts** (comments only, em dashes). `local` itself runs on all 11 shells but ksh93u+m leaves the variable unset (`local-ok x=` on both ksh builds, `wrap/local_probe.sh`), so the `alias local=typeset` fallback matters there.

**Positive control and grep cross-check (regex, spot-read 3 hits per pattern).** Over the 190 sh-shebang files: `[[`, `function f`, `echo -e`, `<(`, `${x//}`, `&>`, arrays, `[ a == b ]`, `$RANDOM`, `<<<`, `[ -a ]`: **0 hits each**. `local`: 18 lines in authored sh (first three `www-setup/src/install.sh:247,339,369`, 3/3 true). `$'`, `source`, `which`: 4 + 1 + 1 hits, **0/6 true** (case-pattern `*'$'*` at `www-setup/src/install.sh:626`, and heredoc-emitted nu code at `www-setup/tests/docker/activate.sh:236-237`) — greps for these are 100% false-positive inside emitter fixtures; rely on shellcheck.

**dash and `pipefail`** (fixture `pf.sh`, `matrix.sh posix`): `set -o pipefail` is **fatal in dash 0.5.12 (exit 2) and posh (exit 1)**; accepted by busybox ash 1.35/1.37, mksh, both ksh93u+m, yash, bash 3.2/5.2 --posix, zsh. The fleet has **0 pipefail in any sh-shebang script**: the 17 authored `set -eu` sh scripts show the authors know this.

**Axis-2 reading:** the fleet's `#!/bin/sh` scripts are POSIX. The bashism problem H1 predicted lives in the opposite direction: 79% of authored shell files are bash and say so (`.sh` + bash shebang), so the live risk is bash *version*, not sh vs bash (Axis 5).

## Axis 3 — shellcheck and shfmt

Commands: `$R shellcheck --norc -s <sh|bash> -f json1 <files>` (dialect from shebang; **no shebang -> `-s bash`**, 50 files, mostly sourced libs and lore check scripts; `--norc` so repo `.shellcheckrc` files cannot skew it; default severity = style and up; 534 files = authored + agent-config + research + vendored; non-shell shebangs were never in this set). Meanings are shellcheck's wiki one-liners.

**SC code histogram (all 30 distinct codes seen; 521 findings)**

| code | total | authored | agent-cfg | research | vendored | meaning |
|---|---|---|---|---|---|---|
| SC2086 | 278 | 30 | 0 | 183 | 65 | unquoted expansion (split/glob) |
| SC2046 | 49 | 1 | 0 | 3 | 45 | unquoted $(...) word-splits |
| SC2153 | 44 | 0 | 0 | 0 | 44 | possible misspelled assignment ($ on lhs) |
| SC1091 | 35 | 8 | 0 | 0 | 27 | not following sourced file (no -x) |
| SC2164 | 33 | 1 | 0 | 32 | 0 | cd without || exit |
| SC2034 | 11 | 0 | 0 | 10 | 1 | variable assigned, never used |
| SC2010 | 10 | 1 | 0 | 9 | 0 | ls|grep (use glob/find) |
| SC2016 | 10 | 1 | 0 | 9 | 0 | expansion in single quotes |
| SC2001 | 7 | 6 | 0 | 1 | 0 | use ${var//a/b} not sed |
| SC2012 | 6 | 1 | 0 | 5 | 0 | ls in loop (use glob/find) |
| SC2006 | 5 | 3 | 0 | 0 | 2 | legacy backticks |
| SC2028 | 4 | 0 | 0 | 0 | 4 | echo with \n (use printf) |
| SC2155 | 3 | 0 | 0 | 3 | 0 | declare and assign separately (masks status) |
| SC2215 | 2 | 2 | 0 | 0 | 0 | flag used as command name |
| SC1087 | 2 | 0 | 0 | 2 | 0 | braces needed around array expansion |
| SC2126 | 2 | 0 | 0 | 1 | 1 | grep|wc -l (use grep -c) |
| SC2129 | 2 | 1 | 0 | 1 | 0 | multiple redirects (use { ;} >f) |
| SC2018 | 2 | 1 | 0 | 1 | 0 | tr [A-Z] ranges (use [:upper:]) |
| SC2019 | 2 | 1 | 0 | 1 | 0 | tr [a-z] ranges (use [:lower:]) |
| SC2162 | 2 | 2 | 0 | 0 | 0 | read without -r |
| SC2188 | 2 | 2 | 0 | 0 | 0 | redirection with no command |
| SC2207 | 2 | 0 | 0 | 0 | 2 | array=($(cmd)) splits (use mapfile) |
| SC2043 | 1 | 0 | 0 | 1 | 0 | loop runs once over constant |
| SC2013 | 1 | 0 | 0 | 1 | 0 | for-in $(cat): word-split reading |
| SC2124 | 1 | 1 | 0 | 0 | 0 | array assigned to string |
| SC2005 | 1 | 1 | 0 | 0 | 0 | useless echo (echo $(cmd)) |
| SC2003 | 1 | 1 | 0 | 0 | 0 | expr is antiquated |
| SC2116 | 1 | 1 | 0 | 0 | 0 | useless echo in $(...) |
| SC2283 | 1 | 0 | 0 | 0 | 1 | spaces around = in assignment |
| SC2009 | 1 | 0 | 0 | 0 | 1 | ps|grep (use pgrep) |

**Class summary (files checked, files with >=1 finding, LOC, findings, /KLOC, warning+error, warning+/KLOC)**

| class | files | dirty files | LOC | findings | /KLOC | warn+ | warn+/KLOC |
|---|---|---|---|---|---|---|---|
| authored | 197 | 20 | 13205 | 65 | 4.9 | 8 | 0.6 |
| research-scratch | 129 | 61 | 3320 | 263 | 79.2 | 60 | 18.1 |
| vendored-upstream | 160 | 85 | 3815 | 193 | 50.6 | 49 | 12.8 |

**Per repo x class (files, dirty files, LOC, findings, /KLOC, warn+)**

| repo | class | files | dirty | LOC | findings | /KLOC | warn+ |
|---|---|---|---|---|---|---|---|
| oras-www | authored | 7 | 6 | 406 | 47 | 115.8 | 5 |
| grimoire-lore | research-scratch | 129 | 61 | 3320 | 263 | 79.2 | 60 |
| rust-devcontainer-cli/reference-cli | vendored-upstream | 130 | 85 | 2753 | 193 | 70.1 | 49 |
| arcana | authored | 1 | 1 | 110 | 2 | 18.2 | 0 |
| grimoire-indexer | authored | 4 | 2 | 134 | 2 | 14.9 | 2 |
| creeptd-ng | authored | 9 | 2 | 422 | 5 | 11.8 | 1 |
| rules_ocx | authored | 7 | 1 | 104 | 1 | 9.6 | 0 |
| ocx | authored | 117 | 8 | 5876 | 8 | 1.4 | 0 |
| find_ocx | authored | 1 | 0 | 4 | 0 | 0.0 | 0 |
| fma | authored | 1 | 0 | 14 | 0 | 0.0 | 0 |
| grimoire | authored | 11 | 0 | 762 | 0 | 0.0 | 0 |
| grimoire-lore | authored | 12 | 0 | 406 | 0 | 0.0 | 0 |
| index | authored | 3 | 0 | 1049 | 0 | 0.0 | 0 |
| obere-heide-planer | authored | 1 | 0 | 27 | 0 | 0.0 | 0 |
| ocx-mirror | authored | 1 | 0 | 114 | 0 | 0.0 | 0 |
| ocx-sdk-python | authored | 2 | 0 | 146 | 0 | 0.0 | 0 |
| ocx-website | authored | 1 | 0 | 20 | 0 | 0.0 | 0 |
| setup-grimoire | authored | 5 | 0 | 407 | 0 | 0.0 | 0 |
| uv | vendored-upstream | 30 | 0 | 1062 | 0 | 0.0 | 0 |
| www-setup | authored | 14 | 0 | 3204 | 0 | 0.0 | 0 |

**Worst 10 files (fleet-written)**

| repo | file | dialect | LOC | findings | top codes |
|---|---|---|---|---|---|
| grimoire-lore | .agents/research/cmake-targets-and-abi/scratch/verify-targets-and-abi/run.sh | sh | 33 | 51 | SC2086x50, SC2046x1 |
| grimoire-lore | .agents/research/cmake-targets-and-abi/scratch/verify-targets-and-abi/run2.sh | sh | 37 | 38 | SC2086x38 |
| grimoire-lore | .agents/research/cmake-testing-and-ci/scratch/testing-and-ci-consolidation/run.sh | bash | 32 | 25 | SC2086x25 |
| oras-www | tools/parse.sh | bash | 92 | 21 | SC2086x15, SC2001x3, SC2188x2 |
| grimoire-lore | .agents/research/cmake-targets-and-abi/scratch/cmk-tgt-consolidation/run.sh | sh | 26 | 17 | SC2086x16, SC2034x1 |
| oras-www | tools/subcommands.sh | bash | 31 | 13 | SC2086x7, SC2001x1, SC2046x1 |
| grimoire-lore | .agents/research/cmake-package-managers/scratch/verify-package-managers/w3/src.sh | none | 11 | 10 | SC2086x10 |
| grimoire-lore | .agents/research/jvm-audit/scratch/axis1-publishing.sh | bash | 59 | 8 | SC2086x7, SC2034x1 |
| oras-www | tools/install.sh | bash | 13 | 7 | SC2086x4, SC2019x1, SC2018x1 |
| grimoire-lore | .agents/research/cmake-package-managers/scratch/verify-package-managers/proj/gen.sh | sh | 16 | 6 | SC2010x5, SC2164x1 |

**Worst 10 files (vendored)**

| repo | file | dialect | LOC | findings | top codes |
|---|---|---|---|---|---|
| rust-devcontainer-cli/reference-cli | example-usage/ci-app-build-script/build-application.sh | sh | 22 | 6 | SC2086x4, SC2028x1, SC2046x1 |
| rust-devcontainer-cli/reference-cli | example-usage/tool-openvscode-server/server/init-openvscode-server.sh | bash | 56 | 5 | SC2086x2, SC2009x1, SC2126x1 |
| rust-devcontainer-cli/reference-cli | example-usage/image-build/build-image.sh | sh | 15 | 4 | SC2086x3, SC2028x1 |
| rust-devcontainer-cli/reference-cli | example-usage/tool-vim-via-ssh/server/init-vim.sh | sh | 13 | 4 | SC2086x4 |
| rust-devcontainer-cli/reference-cli | src/test/container-features/example-v2-features-sets/dependsOn/src/E/install.sh | sh | 9 | 3 | SC2153x1, SC2086x1, SC2046x1 |
| rust-devcontainer-cli/reference-cli | src/test/container-features/example-v2-features-sets/dependsOn/src/C/install.sh | sh | 9 | 3 | SC2153x1, SC2086x1, SC2046x1 |
| rust-devcontainer-cli/reference-cli | src/test/container-features/example-v2-features-sets/dependsOn/src/A/install.sh | sh | 9 | 3 | SC2153x1, SC2086x1, SC2046x1 |
| rust-devcontainer-cli/reference-cli | src/test/container-features/example-v2-features-sets/dependsOn/src/D/install.sh | sh | 9 | 3 | SC2153x1, SC2086x1, SC2046x1 |
| rust-devcontainer-cli/reference-cli | src/test/container-features/example-v2-features-sets/dependsOn/src/H/install.sh | sh | 9 | 3 | SC2153x1, SC2086x1, SC2046x1 |
| rust-devcontainer-cli/reference-cli | src/test/container-features/example-v2-features-sets/dependsOn/src/G/install.sh | sh | 9 | 3 | SC2153x1, SC2086x1, SC2046x1 |

*Agent-config rows (13 repos, 48 files, 1708 LOC) all have 0 findings and are collapsed.* Severity split of the 65 authored findings: **44 info, 13 style, 8 warning, 0 error**; the 8 warnings are `oras-www` 5, `grimoire-indexer` 2, `creeptd-ng` 1. Authored files excluding ocx's 73 doc snippets: 5.5 findings/KLOC (65 / 11.9 KLOC). `# shellcheck disable=` directives inside fleet-written files (regex over comment lines): SC1091 x11, SC2016 x6, SC2064 x5, SC2086 x5, SC2034 x2, SC3043 x1; 3 `# shellcheck shell=bash` headers (`grimoire/test/manual/scripts/env.sh:1`, `ocx/test/manual/scripts/_lib.sh:10`, `ocx/test/manual/announce-e2e/scripts/env.sh:22`).

**False-positive check (spot-read).** shellcheck is a parser, so the question is "real vs harmless". SC2086 3/3 real syntactically: `oras-www/tools/parse.sh:24` `oras help ${COMMAND} >${TEMPFILE}` (real), `grimoire-lore/.agents/research/cmake-targets-and-abi/scratch/verify-targets-and-abi/run.sh:9` (`$P/bt-noforce -B $B/$v` on paths from `$1`/`$2`; real but intended single-token scratch), `…/proj/gen.sh:6` SC2164 `cd $S/proj` (real). 183 of 278 SC2086 findings are in the 129 agent-written scratch scripts.

**The fleet's own gate** (this is the strongest convention in the audit): `ocx/taskfiles/shell.taskfile.yml:38` `shellcheck -S warning {{.FILES}}` and `:48` `shfmt -d -i 4 -ci {{.FILES}}`; `grimoire/taskfiles/shell.taskfile.yml:18` the same `shfmt -d -i 4 -ci`. Both feed `git ls-files '*.sh'` (ocx also `:(exclude)website/src/_scripts/`), so **extensionless hooks and `*.bash` are outside the gate**: `creeptd-ng/.beads/hooks/*`, `setup-grimoire/tests/install/helpers/server.bash`, `www-setup/tests/install/helpers/server.bash` (411 LOC).

**shfmt** (command `$R shfmt -l <flags> <files>`, run on copies under `corpus/` so no `.editorconfig` interferes; only `uv`, `creeptd-ng`, `grimoire-vscode`, `vscode-ocx`, `vscode-clone` carry an `.editorconfig`; no repo has a `.shfmt`):

| class | files | clean `-i 2` | clean tabs (`-i 0`) | clean `-i 4` | clean `-i 4 -ci` | first indent seen (4sp / 2sp / tab / flat) |
|---|---|---|---|---|---|---|
| authored | 197 | 80 | 77 | 135 | **161 (82%)** | 91 / 29 / 1 / 74 |
| agent-config | 48 | 37 | 36 | 40 | 42 | 6 / 6 / 0 / 36 |
| research-scratch | 129 | 40 | 17 | 17 | 17 | 0 / 97 / 0 / 32 |
| vendored | 160 | 60 | 53 | 59 | 62 | 22 / 8 / 5 / 125 |

"Clean under -i 2" includes flat (unindented) files, so it is not a style signal. Discriminating counts (clean under exactly one of `-i 2`, tabs, `-i 4`): authored **4sp 59, 2sp 4, tab 1**, 57 clean under none (they are `-ci` files: adding `-ci` rescues 26 of them). Per repo, authored `-i 4 -ci` clean: ocx 117/117, rules_ocx 7/7, setup-grimoire 5/5, find_ocx 1/1, fma 1/1, ocx-mirror 1/1, grimoire 10/11, www-setup 13/14, oras-www 3/7, grimoire-lore 3/12, index 0/3, creeptd-ng 0/9, grimoire-indexer 0/4, arcana 0/1, ocx-sdk-python 0/2. **Dominant style: 4 spaces + `-ci`.** Agents writing unsupervised choose 2 spaces (97 of 129 scratch files, 23 clean under `-i 2` only).

## Axis 4 — Error-handling census

Command: `python3 -I ax4.py` / `ax45md.py` (regex over non-comment lines after `set` flag tokenising; spot-read 3 hits per pattern: `|| true` 3/3 true, `trap … EXIT` 3/3, `mktemp` 3/3, `set -e` header 3/3, `pipe-into-while` 2/2; the first `IFS=` regex counted `IFS='|' read` per-command forms — fixed to separate **29 global** assignments from **18 per-command** ones). `cd ... ||` guards by regex were unreliable (overlap with `( cd … )`), so unguarded `cd` is reported as **shellcheck SC2164: 1 authored finding** (`oras-www`), 32 in research scratch, 0 elsewhere.

**Error-handling census, authored shell files (counts of non-comment lines; scripts without flags still counted as files)**

| repo | files | set -e | set -u | pipefail | euo pipefail | eu (no pf) | no set | IFS= lines | trap EXIT/ERR/INT | local x=$(..) masks | \|\| true | unguarded cd (SC2164) | mktemp files | pipe-into-while |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ocx | 117 | 114 | 114 | 114 | 114 | 0 | 3 | 20 | 11/0/0 | 0 | 13 | 0 | 11 (10 w/ trap) | 0 |
| www-setup | 14 | 11 | 11 | 1 | 1 | 10 | 3 | 0 | 5/0/5 | 0 | 15 | 0 | 5 (4 w/ trap) | 0 |
| grimoire-lore | 12 | 0 | 7 | 1 | 0 | 0 | 4 | 0 | 7/0/0 | 0 | 0 | 0 | 7 (7 w/ trap) | 0 |
| grimoire | 11 | 6 | 10 | 5 | 5 | 1 | 1 | 2 | 3/0/1 | 0 | 2 | 0 | 3 (3 w/ trap) | 0 |
| creeptd-ng | 9 | 4 | 4 | 4 | 4 | 0 | 5 | 0 | 1/0/0 | 0 | 0 | 0 | 1 (1 w/ trap) | 0 |
| oras-www | 7 | 1 | 0 | 0 | 0 | 0 | 6 | 1 | 5/0/0 | 0 | 0 | 1 | 3 (3 w/ trap) | 2 |
| rules_ocx | 7 | 6 | 6 | 6 | 6 | 0 | 1 | 0 | 0/0/0 | 0 | 0 | 0 | 0 (0 w/ trap) | 0 |
| setup-grimoire | 5 | 3 | 3 | 1 | 1 | 2 | 2 | 1 | 2/0/1 | 0 | 1 | 0 | 2 (2 w/ trap) | 0 |
| grimoire-indexer | 4 | 0 | 0 | 0 | 0 | 0 | 4 | 0 | 0/0/0 | 0 | 0 | 0 | 1 (0 w/ trap) | 0 |
| index | 3 | 3 | 3 | 3 | 3 | 0 | 0 | 3 | 1/0/0 | 0 | 3 | 0 | 1 (1 w/ trap) | 0 |
| ocx-sdk-python | 2 | 2 | 2 | 0 | 0 | 2 | 0 | 0 | 0/0/0 | 0 | 0 | 0 | 0 (0 w/ trap) | 0 |
| arcana | 1 | 1 | 1 | 1 | 1 | 0 | 0 | 0 | 0/0/0 | 0 | 0 | 0 | 0 (0 w/ trap) | 0 |
| find_ocx | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0/0/0 | 0 | 0 | 0 | 0 (0 w/ trap) | 0 |
| fma | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0/0/0 | 0 | 0 | 0 | 0 (0 w/ trap) | 0 |
| obere-heide-planer | 1 | 1 | 1 | 0 | 0 | 1 | 0 | 1 | 0/0/0 | 0 | 1 | 0 | 0 (0 w/ trap) | 0 |
| ocx-mirror | 1 | 1 | 1 | 1 | 1 | 0 | 0 | 0 | 1/0/0 | 0 | 0 | 0 | 1 (1 w/ trap) | 0 |
| ocx-website | 1 | 1 | 1 | 0 | 0 | 1 | 0 | 1 | 0/0/0 | 0 | 1 | 0 | 0 (0 w/ trap) | 0 |
| **TOTAL authored** | 197 | 155 | 164 | 137 | 136 | 17 | 30 | 29 | 36/0/7 | 0 | 36 | 1 | 35 (32 w/ trap) | 2 |

**Strict-mode header by class (first matching set -... flags anywhere in file)**

| class | files | euo pipefail | eu | e only | u only | none |
|---|---|---|---|---|---|---|
| authored | 197 | 136 (69%) | 17 (9%) | 2 (1%) | 11 (6%) | 30 (15%) |
| agent-config | 48 | 8 (17%) | 0 (0%) | 4 (8%) | 3 (6%) | 33 (69%) |
| research-scratch | 129 | 1 (1%) | 3 (2%) | 3 (2%) | 51 (40%) | 71 (55%) |
| vendored-upstream | 160 | 19 (12%) | 3 (2%) | 70 (44%) | 0 (0%) | 67 (42%) |

**Authored: strict-mode header by dialect (shebang)**

| dialect | files | euo pipefail | eu | e | u only | pipefail only | none |
|---|---|---|---|---|---|---|---|
| bash | 155 | 136 | 0 | 1 | 7 | 1 | 10 |
| sh | 31 | 0 | 17 | 1 | 4 | 0 | 9 |
| none | 11 | 0 | 0 | 0 | 0 | 0 | 11 |

Reading, against **H2** ("`set -euo pipefail` is cargo-culted"):

- **Prevalence holds, cargo-cult does not.** 136/197 authored files carry `-euo pipefail`; 63 of them are real scripts, 73 are ocx's identical doc snippets. Dialect-aware: bash 136/155 (88%; 63/82 = 77% without snippets), sh 0/31 (all 17 strict sh scripts use `set -eu`, no pipefail — dash-safe, see Axis 2). Agent research scratch is the opposite: 1/129 `-euo pipefail`, 55% no `set` at all (`u`-only 40% is the template `set -u`).
- **The named silent-failure pattern is absent in authored code:** `local|declare|export x=$(cmd)` 0 (SC2155 0 authored; 3 in research scratch). `|| true` is used 36 times, always a spot-read intentional ignore (`kill … || true`, `command -v nu || true`).
- **The pattern that *is* present is invisible to a regex:** `shellcheck -o check-set-e-suppressed,check-extra-masked-returns` on the 155 authored `set -e` files gives **SC2310 x69 in 9 files** (a function called in an `if`/`||` condition disables `set -e` inside it; per-file SC2310+SC2312 totals, worst: `www-setup/src/install.sh` 32, `ocx/test/manual/announce-e2e/scripts/selfcheck_identity.sh` 28) and **SC2312 x150 in 41 files** (command substitution masks a return value).
- **Probe, bash 3.2 to 5.3** (`h2.sh`, `h2b.sh`, `matrix.sh bash`): `set -e; f(){ false; echo cont; }; if f; then :; fi` prints `cont` on all 8 versions; `g(){ local x=$(false); echo reached; }; g` prints `reached` on all 8 (local masks status). **Version split:** `set -e; ( false ); echo after` exits 1 on bash 4.0-5.3 but **continues and exits 0 on bash 3.2** (`h2c.sh`). `shopt -s inherit_errexit` exists from 4.4 only.
- **Cleanup:** `trap … EXIT` in 34 authored files (36 traps), `INT` x7, **`ERR` x0**; 35 files call `mktemp`, 32 of them also `trap`. The 3 mktemp-without-trap files: `grimoire-indexer` (1), `www-setup` (1), `ocx` (1 — see the table). `trap cleanup EXIT INT TERM HUP` is the installer form (`www-setup/src/install.sh:794`).
- **Pipelines into `while read`** (subshell variable loss, and under `pipefail` a source-side failure the loop hides): 2 authored files, both `oras-www` (`tools/parse.sh:29` `cat ${TEMPFILE} | while read -r LINE`, `tools/list_commands.sh:6`), 13 in research scratch, **0 in repos that have a gate**.

## Axis 5 — Bash-version features

Command: `python3 -I ax5.py` (regex over non-comment lines of the 166 authored files whose dialect is bash or unknown; spot-read: arrays 3/3 true, here-string 3/3, process-substitution 2/3 (1 false positive: an HTML ERE `<(script|link)` in `grimoire/…/theme_check.sh:135`), `${x//}` 3/3, `+=` 3/3, `${!x}` 2/2). Minimum versions are bash's own CHANGES; the "bash 3.2" column is what the `bash:3.2` image did, i.e. macOS `/bin/bash` 3.2.57 semantics.

| feature | min bash | authored files (uses) | research | agent-cfg | bash 3.2 result |
|---|---|---|---|---|---|
| `declare/local -A` | 4.0 | 2 (2) | 3 | 0 | `local: -A: invalid option`, script continues with a *wrong* indexed array |
| `mapfile` / `readarray` | 4.0 | 3 (6) | 1 | 0 | `mapfile: command not found` |
| `${x,,}` `${x^^}` | 4.0 | 1 (1) | 0 | 0 | `bad substitution` |
| `EPOCHSECONDS` / `EPOCHREALTIME` | 5.0 | 1 (1) | 0 | 0 | unset, silently empty on 3.2-4.4 |
| `[[ -v ]]` 4.2, `local -n` 4.3, `wait -n` 4.3, `${x@Q}` 4.4, `${x@U}` 5.1, `&>>` `\|&` `coproc` `;&` globstar 4.0, `printf -v` 3.1, `lastpipe` 4.2, `inherit_errexit` 4.4, `declare -g` 4.2, `mapfile -d` 4.4, `SRANDOM` 5.1, negative subscripts 4.3, `printf %(fmt)T` 4.2 | — | **0** | 0 | 0 | not used anywhere |
| 3.2-safe baseline: `[[ ]]` 49 files (212), arrays 14 (34), `<<<` 19 (42), `<( )` 6 (10), `+=` 10 (20), `${x//a/b}` 4, `${!arr[@]}` 2, `BASH_REMATCH` 1 | ≤3.1 | — | — | — | fine |

Where they are: `ocx/test/manual/announce-e2e/scripts/run_sequence.sh:219` `local -A content_of=()`, `:231,295` `mapfile -t tags <<<"$names"`, `:298` `${tag,,}`, `clean_install_check.sh:44` and `run_machine_lane.sh:23,89` `mapfile -t secret_args < <(…)`, `ocx/test/manual/measure-index-clone.sh:51` EPOCHREALTIME, `index/scripts/golden-baseline.sh:250` `local -A new_by_path=()`.

**Which of the 166 plausibly run on a macOS developer machine?** All 154 `#!/usr/bin/env bash` scripts resolve to whatever bash is first on `PATH` (3.2.57 unless Homebrew's bash precedes it, which H7 says is not guaranteed in non-login contexts — read-only claim); the 1 `#!/bin/bash` script is 3.2 by construction. Heuristic (referenced by a taskfile/workflow/Makefile/package.json of its repo, or under `scripts|tools|hooks|bin|install`): **103 of 166** are dev-machine-plausible. Of the 5 bash-4+ files, **1 is task/CI-invoked** (`index/scripts/golden-baseline.sh`), 4 sit under `test/manual/` (hand-run, `gh`+registry dependent). There is **no `BASH_VERSION`/`BASH_VERSINFO` guard in any fleet script** (0 hits), so on macOS 3.2 they fail mid-run, not up front.

**Three probes run under `matrix.sh bash`** (fixtures `b4.sh`, `emptyarr.sh`, `h2c.sh`; lines lifted from the files above):

```
b4.sh        bash 3.2:  local: -A: invalid option | mapfile: command not found | bad substitution | t=unset  (assoc "ok" line prints a wrong result)
             bash 4.0-4.4: all of the first three work; EPOCHREALTIME unset      bash 5.0-5.3: all work, t=1791666080.924286
emptyarr.sh  (set -u; a=(); echo "${a[@]}")  bash 3.2 / 4.0 / 4.2: "a[@]: unbound variable", exit 1
             bash 4.4 / 5.0 / 5.1 / 5.2 / 5.3: prints empty, exit 0
h2c.sh       (set -e; ( false ); echo after)  bash 3.2: prints "after", exit 0     bash 4.0-5.3: exit 1, nothing printed
```

The empty-array/`set -u` hazard (fixed in 4.4, so it also hits 4.0-4.3) is **not detectable by grep of bash-4 features**: 143 authored bash scripts use `set -u`; 6 of them (7 arrays) declare `x=()` or `local -a x` and expand `"${x[@]}"` unguarded (static candidates, runtime emptiness not determined): `index/scripts/smoke-test.sh:85,447`, `ocx/test/manual/scripts/bootstrap.sh:61,82` and `:102,120`, `ocx/test/manual/announce-e2e/scripts/{run_sequence.sh:313,clean_install_check.sh:37,run_machine_lane.sh:22}`, `setup-grimoire/.github/scripts/install.sh:82`. The last is a CI helper script.

**GNU-userland (H4) probe** (regex over authored sh/bash, comments skipped): `sed -i` 2 files (`ocx/test/manual/scripts/{setup-integrations.sh:79,bootstrap.sh:138}` — BSD sed needs `-i ''`; unverified, no macOS host), `readlink -f` 1 file (`ocx-mirror/test/bazel_accept.sh:26,52`), `xargs -r` 4 files (all `grimoire-lore/rules/swift-quality/checks/*.sh`: shipped to Swift projects; macOS xargs accepts `-r` as a no-op per its man page — from memory, unverified), `date -d`, `grep -P`, `stat -c`, `find -printf`, `sort -V`, `realpath`, `echo -e`, `cp --`: **0**. `sha256sum` 13 files vs `shasum -a 256` 8: the installers probe with `command -v sha256sum` first (`index/scripts/smoke-test.sh:118-121`, `setup-grimoire/.github/scripts/install.sh:99`). `which` regex: 7 hits, 5 false positives (English prose in strings), so 2 real. **H4 holds for test/manual scripts and the Swift checks; it does not hold for the installers.**

## Axis 6 — Inline shell

### GitHub workflows

Command: `python3 ax6_collect.py` (tracked `.github/workflows/*.y*ml` and `action.yml`), `python3 ax6.py` (PyYAML `safe_load`, 959 files parsed, 0 YAML errors), `python3 ax6b.py`. A `run:` block's OS comes from its job's `runs-on`, resolving `${{ matrix.os }}` through `strategy.matrix` (matrix jobs count a block once per OS in `os:` totals, not in the table). Grouping: `fleet` = 28 repos below; `mirror-family` = every `mirror-*` repo (99 under `ocx-contrib/` plus the top-level ones; one generated template per repo); `vendored` = uv (60 workflows).

| repo | wf | actions | run blocks | explicit shell:bash | shell:pwsh | default shell set | runs w/ ${{}} | T1 | T2 | T3 | win runs no shell | unix runs no shell | ... with pipeline | ... pipeline w/o pipefail |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ocx | 19 | 4 | 121 | 34 | 3 | 0 | 22 | 0 | 2 | 6 | 5 | 73 | 8 | 5 |
| grimoire | 7 | 1 | 57 | 17 | 0 | 0 | 15 | 0 | 1 | 6 | 0 | 34 | 1 | 0 |
| ocx-mirror | 7 | 2 | 40 | 11 | 0 | 6 | 9 | 0 | 8 | 1 | 0 | 23 | 1 | 0 |
| creeptd-ng | 5 | 0 | 30 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 30 | 2 | 2 |
| www-setup | 8 | 0 | 28 | 0 | 8 | 0 | 8 | 1 | 3 | 0 | 0 | 20 | 1 | 1 |
| ocx-catalog | 3 | 1 | 26 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 25 | 0 | 0 |
| index | 9 | 2 | 25 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 25 | 1 | 0 |
| ocx-mcp | 6 | 1 | 23 | 12 | 0 | 0 | 4 | 0 | 0 | 1 | 0 | 11 | 2 | 1 |
| setup-ocx | 3 | 1 | 23 | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 15 | 0 | 0 |
| ocx-website | 4 | 1 | 21 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 21 | 1 | 1 |
| rules_ocx | 7 | 1 | 21 | 2 | 0 | 0 | 1 | 0 | 0 | 0 | 5 | 14 | 2 | 2 |
| e2e-mirror | 5 | 0 | 19 | 1 | 0 | 0 | 7 | 0 | 0 | 1 | 0 | 18 | 6 | 4 |
| grimoire-indexer | 3 | 0 | 17 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 17 | 1 | 0 |
| ocx-indexbot | 5 | 0 | 17 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 17 | 1 | 1 |
| ocx-sdk-python | 5 | 0 | 17 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 15 | 1 | 1 |
| arcana | 2 | 0 | 16 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 16 | 3 | 2 |
| ocx-vscode-icons/vscode-clone | 6 | 0 | 16 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 2 | 14 | 1 | 1 |
| setup-grimoire | 3 | 1 | 16 | 3 | 2 | 0 | 0 | 0 | 0 | 0 | 1 | 10 | 3 | 0 |
| grimoire-index | 5 | 0 | 15 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 15 | 1 | 0 |
| vscode-ocx | 3 | 0 | 15 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 9 | 0 | 0 |
| grimoire-vscode | 2 | 0 | 14 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 8 | 0 | 0 |
| find_ocx | 4 | 0 | 13 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 11 | 0 | 0 |
| grimoire-lore | 4 | 0 | 12 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 12 | 2 | 0 |
| obere-heide-planer | 2 | 0 | 12 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 12 | 0 | 0 |
| ocx-mirror-sdk | 3 | 0 | 6 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 1 | 1 |
| oras-www | 4 | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 0 | 0 |
| rust-oci-client | 3 | 0 | 3 | 0 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 2 | 0 | 0 |
| **TOTAL fleet** | 137 | 15 | 628 | 90 | 13 | 9 | 74 | 1 | 14 | 15 | 26 | 478 | 39 | 22 |

Columns: `T1` = blocks interpolating an event field an outsider can set (`github.event.{issue,pull_request,comment,head_commit,client_payload,…}.{title,body,ref,name,message,…}`, `github.head_ref`); `T2` = `inputs.*`, `github.event.inputs.*`, `ref_name`, `github.ref`; `T3` = step/needs outputs. "unix runs no shell" = Linux/macOS blocks with neither a step `shell:` nor a job/workflow `defaults.run.shell` (GitHub then runs `bash -e {0}`, no pipefail); "pipeline" = a bare `|` (not `||`).

- **Shell keys:** explicit `shell: bash` 90 blocks, `pwsh` 11, `powershell` 2, 516 none; `defaults.run.shell` used by **4 jobs, all `bash`** (ocx-mirror x2, ocx-sdk-python, rust-oci-client), 0 workflow-level. Job runner mix (335 jobs, command in `ax6.py` notes): `ubuntu-latest` 240, `ubuntu-24.04` 16, `ubuntu-22.04` 11, `windows-latest` 7, `windows-11-arm` 2, `macos-latest` 4, `macos-26` 1, matrix expressions 25, `uses:` reusable jobs 29. Block-level OS (matrix expanded): linux 565, windows 59, macos 55, composite 23.
- **H5 measured.** `bash -e {0}` vs the explicit-`shell: bash` form (`bash --noprofile --norc -eo pipefail {0}`) on bash 5.2 (`gh_bash.sh`): default prints `pipeline-failure-ignored(rc=0)`; explicit form exits 1. 39 fleet blocks that use the default shell contain a pipeline; **22 have no `pipefail`** (`e2e-mirror` 4, `ocx` 5, `creeptd-ng` 2, `rules_ocx` 2, `arcana` 2, …). Mirror family: 2818 of 2950 blocks (96%) are default-shell, 1034 with a pipeline, **770 without pipefail** (one template x 99 repos). PowerShell side, GitHub-style preamble `$ErrorActionPreference='stop'` (`gh_pwsh.ps1`): a failing native command mid-script does **not** stop the step on 5.1, 7.4.7 or 7.6.6 (`LASTEXITCODE=3`, script continues); `$PSNativeCommandUseErrorActionPreference = $true` stops it on **7.4.7 and 7.6.6 ("Program "sh" ended with non-zero exit code: 3") and has no effect on 5.1**.
- **Windows runners without `shell:`:** 26 fleet blocks (default `pwsh`). Read all 26: 23 are single-line `npm`/`cargo`/`task`/`ocx` invocations that mean the same in pwsh; 3 look POSIX: `sudo apt-get …` (`ocx/.github/workflows/verify-deep.yml`, `if: matrix.job.name == 'Linux'`), the `softwareupdate`/`curl … \` rosetta steps (`rules_ocx/.github/workflows/ci.yml`, `if: ${{ matrix.target.rosetta }}`) — both guarded off Windows — and one `ocx exec -- bazelisk test … ${{ matrix… }}` (portable). **0 confirmed POSIX-in-pwsh breakage.** (uv, vendored, has 97 such blocks.)
- **Script injection:** `${{ }}` appears in 74 of 628 blocks; tiers across 153 expression instances: safe 102, step/needs outputs 32, T2 17, T1 1, other 1. **T1 = 1:** `www-setup/.github/workflows/update-dist.yml:27` `echo "… ${{ github.event.client_payload.version }}"` (repository_dispatch needs a write token; the block only echoes). **T2 true positives = 6:** `www-setup/.github/workflows/test-installers.yml:206-207` `if [ -n "${{ inputs.release_tag }}" ]` and `echo '${{ inputs.release_tag }}' | sed …` — a dispatch input containing `'` breaks out of the quote; maintainer-only, but it is the one real injection shape in the fleet and the fix is `env:`. The other 11 T2 matches are boolean comparisons (`github.ref == 'refs/heads/main'`), i.e. my classifier's false positives (65% FP on T2). No `pull_request_target` or `issue_comment` workflow has any T1 expression.
- GitLab CI (`grimoire-indexer/templates/ci/*`, 16 files; `ocx-catalog` 4; `grimoire-components` 1) not parsed — see Gaps.

### Taskfile cmds

Command: `python3 ax6t.py` (PyYAML; counts string `cmds`, `cmd:`, `defer:`; `vars: sh:` and `status/preconditions` counted separately).

| repo | taskfiles | tasks | cmds | multi-line cmds | vars sh: | status/precond | set:/shopt: |
|---|---|---|---|---|---|---|---|
| ocx | 21 | 156 | 207 | 30 | 27 | 23 | 0 |
| grimoire | 14 | 64 | 95 | 21 | 6 | 12 | 0 |
| ocx-mirror | 9 | 73 | 88 | 17 | 12 | 6 | 0 |
| server-hetzner1 | 7 | 45 | 61 | 4 | 1 | 1 | 0 |
| ocx-catalog | 1 | 25 | 47 | 2 | 1 | 0 | 0 |
| ocx-website | 4 | 38 | 46 | 1 | 2 | 0 | 0 |
| www-setup | 11 | 42 | 36 | 7 | 3 | 12 | 0 |
| ocx-mcp | 5 | 34 | 33 | 1 | 2 | 4 | 0 |
| ocx-sdk-python | 1 | 24 | 32 | 1 | 1 | 0 | 0 |
| ocx-indexbot | 1 | 28 | 30 | 3 | 1 | 0 | 2 |
| grimoire-indexer | 2 | 23 | 28 | 2 | 0 | 0 | 0 |
| index | 2 | 21 | 26 | 2 | 0 | 0 | 2 |
| rules_ocx | 2 | 16 | 24 | 2 | 1 | 0 | 0 |
| grimoire-lore | 1 | 12 | 23 | 8 | 0 | 0 | 0 |
| ocx-mirror-sdk | 1 | 18 | 22 | 1 | 1 | 0 | 0 |
| bob | 1 | 14 | 20 | 0 | 0 | 0 | 0 |
| arcana | 4 | 19 | 19 | 4 | 1 | 0 | 0 |
| find_ocx | 2 | 12 | 17 | 1 | 1 | 0 | 0 |
| setup-ocx | 1 | 15 | 17 | 1 | 1 | 1 | 0 |
| obere-heide-planer | 1 | 15 | 16 | 0 | 0 | 0 | 0 |
| kate-middlechild | 1 | 15 | 15 | 0 | 0 | 1 | 0 |
| michael-herwig | 1 | 13 | 13 | 3 | 2 | 5 | 0 |
| grimoire-vscode | 3 | 4 | 12 | 1 | 2 | 2 | 0 |
| setup-grimoire | 1 | 11 | 10 | 3 | 0 | 1 | 0 |
| ocx-marketing | 1 | 5 | 9 | 0 | 0 | 0 | 0 |
| grimoire-index | 1 | 9 | 8 | 1 | 0 | 0 | 0 |
| **TOTAL** | 99 | 751 | 954 | 116 | 65 | 68 | 4 |

Only **4 of 99 taskfiles** set `set:`/`shopt:` (ocx-indexbot 2, index 2); a task's cmds run with **errexit on and pipefail off** (probe below). Bash-only syntax by regex: `[[` 0, `<( )` 0, `${x,,}` 0, `${x//}` 0, `source` 0, `mapfile` 0, `echo -e` 0, `&>` 0, `function` 0. The patterns that fired are mostly false positives: `$'` 7 hits **0 true** (a regex ending `…path$'` inside single quotes), `declare/local/typeset` 5 hits 1 true, arrays 4 hits 2 true (`ocx-mirror/taskfiles/release.taskfile.yml:119,121` `run=("$bin")` / `run=(qemu-aarch64 "$bin")`), `(( ))` 4 hits 0 true (python/awk), here-string 1 hit true (`release.taskfile.yml:55` `grep -qxF -- "$ref" <<<"$remote"`). Real bash-only constructs: **4 in 2 files** — those three plus `ocx/taskfiles/satellite.taskfile.yml:183` `local marker=$1 re=$2 spec listed` (inside a function).

**What mvdan/sh actually accepts** (task 3.53.1, `tf/Taskfile.yml`, one single-line cmd per feature; a newer mvdan/sh than the frame assumed):

```
works   : a=(x "y z"), <<<, [[ ]], declare -A m; m[k]=v, ${x,,}, <(…), mapfile -t, local in a function,
          source, $(( )) and (( )), trap … EXIT, shopt -s, function f { }, echo -e "a\tb", $'a\tb',
          set -euo pipefail
differs : printf -v v → prints "-vprintf-v=" (no -v support)   PIPESTATUS → unset   BASH_VERSION, BASH_SOURCE → unset
          read -r -p "x" v </dev/null → task fails
defaults: errexit ON  ("false; echo x" fails the task)          pipefail OFF ("false | cat; echo ok" continues)
panic   : declare -A m; m[x86_64-linux]=v
          "panic: interface conversion: syntax.ArithmExpr is *syntax.BinaryArithm, not *syntax.Word"
```

The panic reproduces the comment at `ocx-mirror/taskfiles/release.taskfile.yml:196-197` ("A `case`, not `declare -A`: go-task's shell (mvdan/sh) panics on an associative-array key holding `-`") on 3.53.1, so the workaround is still needed. Everything else in the fleet's taskfile bash would run on 3.53.1; behaviour on older task releases was **not** measured.

## Axis 7 — PowerShell

Commands: `file -b`, byte checks for BOM/CRLF, regex over comment-stripped text, and a parse-only probe `parse_only.ps1` calling `[System.Management.Automation.Language.Parser]::ParseFile` on all 26 files: `matrix.sh pwsh parse_only.ps1 <dir>` (pwsh 7.4.7 container and 7.6.6) and, for Windows PowerShell **5.1.26100.9444**, `powershell.exe -File C:\Users\ecom\shell-wintest\parse_only.ps1` on the host (files staged under `shell-wintest\ps1corpus`, nothing executed). Positive control: the one failing file.

Counts: **26 files = 10 `.ps1` + 2 `.psm1` + 1 `.psd1` authored (13), 8 `.ps1` vendored (uv), 5 generated** (pdm/virtualenv activate scripts, an agent smoke script). All 26: **no BOM, LF** except one generated `Activate.ps1` (CRLF); `file -b` says ASCII text for `www-setup/src/install.ps1`.

| authored file | LOC | `#Requires` | StrictMode | `$ErrorActionPreference` | edition/version logic | notes |
|---|---|---|---|---|---|---|
| `www-setup/src/install.ps1` | 951 | `-Version 5.1` (:50) | Latest (:63) | Stop (:64) | `PSEdition -eq 'Desktop'` :105; `PSVersion -lt 5.1` :731; TLS1.2 :337,355 | `Invoke-WebRequest … -UseBasicParsing` :344,357 (2/2) |
| `ocx/test/manual/test-windows-activation.ps1` | 272 | `-Version 5.1` (:1) | Latest (:24) | Stop (:25), Continue (:254) | prints `$PSVersionTable` | 25 `Write-Host` |
| `grimoire/docs/public/install.ps1` | 12 | none | none | Stop (:10) | none | `Invoke-Expression (Invoke-RestMethod -Uri $installer)` :12 (the `irm\|iex` target) |
| `setup-grimoire/.github/scripts/install.ps1` | 74 | none | none | Stop (:8) | none | 3 `Write-Host` |
| `www-setup/tests/install/ps1/Fixture.psm1` | 384 | none | none | none | `PSEdition` :28 | `-Encoding` x1 |
| `www-setup/tests/install/ps1/{PrintPath,Knobs,ExitCodes}.Tests.ps1` | 102 / 337 / 176 | `-Modules Pester 5.0.0` | none | none | none | |
| `setup-grimoire/tests/install/ps1/{Fixture.psm1,Install,ExitCodes,Regressions}` | 189 / 73 / 72 / 47 | `-Modules Pester 5.0.0` (3) | none | none | none | |
| `www-setup/PSScriptAnalyzerSettings.psd1` | 41 | | | | | |

Totals over the 13 authored: `#Requires -Version 5.1` 2 (both installers/gates), `#Requires -Modules` Pester 6, `Set-StrictMode` 2, `$ErrorActionPreference='Stop'` 4, PSEdition/PSVersion logic in 3 files, `$IsWindows|$IsLinux` **0**, `Write-Host` 2 files, `$PSNativeCommand*` 0.

**PowerShell-7-only syntax in 5.1-bound scripts: 0.** Regex for ternary `?:`, `&&`/`||` chains, `??`, `?.`/`?[]`, `-Parallel`: 0 hits in all 26 files; confirmed by the parser, not the regex: **25/26 parse with 0 errors on Windows PowerShell 5.1, pwsh 7.4.7 and pwsh 7.6.6**. The single failure is identical on all three (`virtualenv/activation/powershell/activate.ps1:200`, "You must provide a value expression following the '+' operator" — the un-rendered `__BIN_NAME__ + __PATH_SEP__` template placeholders), not a version difference.

**Encoding hazard measured** (`enc_nobom.ps1`, `matrix.sh pwsh`): a BOM-less UTF-8 file containing `"café"` gives `len=4 codepoints=99,97,102,233` on pwsh 7.4.7/7.6.6 and **`len=5 … 195,169` on Windows PowerShell 5.1** (read as ANSI), and `$IsWindows` is `<undefined>` on 5.1 (`Test-Path variable:IsWindows` false) — the reason `www-setup/src/install.ps1:99-105` uses the `PSEdition` shortcut under StrictMode. Non-ASCII occurs in 9 authored PowerShell files (+1 generated copy of the grimoire installer), **all in comment lines, 0 in code or strings**, so the fleet is currently safe by luck-or-policy, not by BOM (0 BOMs).

## Axis 8 — fish / nu / elvish

Commands: fish `fish --no-execute <file>` via `matrix.sh fish fish_parse.fish <dir>` (3.6.0, 4.0.2, 4.7.0, 4.9.3); nu `nu --ide-check 10 <file>` parsed for `Error` diagnostics via `matrix.sh nu nu_parse.nu <dir>` (0.105.1, 0.116.0); elvish `$R elvish -compileonly <file>` (0.21.0). Controls: an unterminated `if`/`let (`/`if $true {` file is rejected by all three (fish message, nu 6 diagnostics, elvish rc=2).

| file | class | LOC | fish 3.6.0 / 4.0.2 / 4.7.0 / 4.9.3 | nu 0.105.1 / 0.116.0 | elvish 0.21.0 |
|---|---|---|---|---|---|
| `www-setup/src/install.fish` | **authored** | 650 | clean x4 | | |
| `www-setup/src/install.nu` | **authored** | 547 | | 0 / 0 errors | |
| `www-setup/src/install.elv` | **authored** | 566 | | | `-compileonly` rc=0 |
| uv `crates/uv-virtualenv/src/activator/activate.fish` | vendored template | 127 | clean x4 | | |
| uv `…/activate.nu` | vendored template | 104 | | 3 / 2 errors (`{{ VIRTUAL_ENV_DIR }}` placeholders; 0.116: "Value is not a parse-time constant") | |
| pdm `activate.fish`, `pdm.fish` (658-line completion), virtualenv `activate.fish` | generated | 69 / 658 / 118 | clean x4 | | |
| virtualenv `activation/nushell/activate.nu` | generated | 91 | | **1 error on 0.105.1 ("The `get` command doesn't have flag `optional`"), 0 on 0.116.0** | |
| `www-setup/.claude/artifacts/smoke-fish.fish` | agent scratch | 41 | clean x4 | | |

The fleet has **no completions, activation scripts or configs of its own in these languages** beyond the five-installer set in `www-setup/src`; the other 7 files are third-party tool output that sits in gitignored sandboxes (`.ocx-mirror/…/pyapp/pdm/…`) or vendored uv templates. The nushell drift is directly visible: the same `get --optional` file parses on 0.116.0 and fails on 0.105.1, and my own first probe broke the same way (`get -o` is not a flag on 0.105.1; `$d.type?` works on both).

## Smells (ranked)

1. **Agent-written research scratch has no gate**: 129 files, 79.2 findings/KLOC vs 4.9 authored (16x), 55% with no `set`, 2-space style outside the fleet's `-i 4 -ci`. 183 of the fleet's 278 SC2086 are here. The same agents produce 1.4 findings/KLOC in `ocx` where `shell:verify` gates them. The gap is the gate, not the model.
2. **Default-shell `run:` blocks carry hidden semantics** (82% of fleet blocks, 96% of the mirror template): 22 + 770 pipelines run without pipefail; the fix is one `defaults.run.shell: bash` per workflow (used by only 4 jobs).
3. **`${{ inputs.release_tag }}` inside single quotes in a run block** (`www-setup/.github/workflows/test-installers.yml:206-207`): the only real injection shape; `env:` indirection is the repair.
4. **bash-4 features with no version guard** (5 files, 0 `BASH_VERSION` checks) and **`set -u` + empty array** exposure (7 static candidates) behind `#!/usr/bin/env bash` — silently wrong on 3.2 (`local -A` keeps going), and `set -e` + `( false )` behaves differently on 3.2.
5. **Gate scope gaps**: `git ls-files '*.sh'` skips `*.bash` (4 bats helpers, 639 LOC), 10 `*.bats` files (1997 lines) and extensionless hooks; shellcheck/shfmt are referenced in 10-12 repos, yet 7 authored-shell repos have 0 files clean under the fleet's `-i 4 -ci` (creeptd-ng 0/9, grimoire-indexer 0/4, index 0/3, ocx-sdk-python 0/2, arcana, ocx-website, obere-heide-planer 0/1 each); some may follow another style on purpose.
6. **SC2310/SC2312**: 69 + 150 findings (9 and 41 files) of `set -e` suppressed in functions-in-conditions — invisible without `-o check-set-e-suppressed`, never enabled by the fleet.
7. **93 of 186 shebang scripts are committed mode 100644** (62 are ocx doc snippets); `grimoire/docs/public/install.sh` is one of them.
8. **Non-ASCII bytes in 21/31 authored sh scripts** (comments): fine on every shell tested except yash in a POSIX locale, and on 5.1 for PowerShell without a BOM.
9. **Stale generated copies**: 73 gitignored `website/src/_scripts/*.sh` duplicate `test/doc_scripts`; 48 agent-config files are 18 distinct contents.
10. **`oras-www/tools/*.sh`**: 47 findings/406 LOC, `cat | while read`, unquoted `${COMMAND}`, `>${TEMPFILE}`, no `set`: the worst authored code.

## Patterns worth encoding

- **Dialect by shebang, honestly.** 31 `#!/bin/sh` scripts: 0 bashisms; 155 bash scripts say bash. Encode: sh means POSIX-checked with `shellcheck -s sh`; bash means bash and says which minimum version.
- **The rustup `local` idiom** (`www-setup/src/install.sh:39-40` `has_local() { local _ 2>/dev/null; }` / `has_local || alias local=typeset`) with a scoped `# shellcheck disable=SC3043` and a reason (`:5`). Measured: `local` works on all 11 POSIX shells; ksh93u+m returns an unset variable.
- **Never `pipefail` in `#!/bin/sh`**: dash 0.5.12 exits 2 and posh exits 1 on `set -o pipefail` (probe `pf.sh`); the fleet already follows this (`set -eu` in 17 sh scripts).
- **Gate recipe the fleet converged on**: `shellcheck -S warning` + `shfmt -d -i 4 -ci` over `git ls-files '*.sh'` (`ocx/taskfiles/shell.taskfile.yml:38,48`), fixtures excluded by pathspec. Add `*.bash` and extensionless shebang files to the file list.
- **Strict header + cleanup**: `set -euo pipefail`; `trap cleanup EXIT` (34 files) next to `mktemp -d` (32/35); installers use `trap cleanup EXIT INT TERM HUP` (`www-setup/src/install.sh:794`); `ERR` traps are unused.
- **Installer set**: one directory, five dialects, same embedded `<TOKEN>` placeholders patched by one `sed` (`www-setup/src/install.sh:42-52`); each parses on the oldest shell in the matrix. `#Requires -Version 5.1` + `Set-StrictMode -Version Latest` + `$ErrorActionPreference='Stop'` + `-UseBasicParsing` + TLS1.2 + `PSEdition` (not `$IsWindows`) for 5.1 (`www-setup/src/install.ps1:50,63-64,105,337,344`).
- **Checksum tool detection** (`command -v sha256sum` else `shasum -a 256`, `index/scripts/smoke-test.sh:118-121`) and `mktemp -d` without GNU template flags: the fleet's installers contain none of `date -d`, `grep -P`, `stat -c`, `find -printf`, `sort -V`, `realpath`.
- **CI**: `defaults.run.shell: bash` per job (4 uses), explicit `shell: pwsh` on Windows steps (11), `env:` not `${{ }}` for any input interpolated into a script.
- **Taskfile cmds**: errexit on, pipefail off (put `set -o pipefail` in the cmd); mvdan/sh in task 3.53.1 accepts arrays, `[[`, `declare -A`, `mapfile`, `local`; avoid `printf -v`, `PIPESTATUS`, `read -p`, `BASH_VERSION` and associative keys containing `-`.
- **Probe-based behaviour claims**: fixtures under `fixtures/fleet-shape/` (`b4.sh`, `emptyarr.sh`, `h2*.sh`, `pf.sh`, `gh_*.{sh,ps1}`, `enc_nobom.ps1`, `tf/Taskfile.yml`) are small enough to become the verification fixtures for a shell rule's depth files.

## Contradictions of the frame

| frame statement | measured | evidence |
|---|---|---|
| "~1450 `*.sh`" | 633 raw after the full exclusion list, **187 authored** | `ablate.py`: 1433 is the count before sibling-clone exclusion; 647 after |
| "132 `*.bash`" | **5** (4 authored: bats helpers `load.bash`, `server.bash` in setup-grimoire and www-setup) | ablation stage 4; `classified.json` |
| "49 `*.ps1`", "22 `*.fish`", "21 `*.nu`" | **23, 6, 3**; authored 10 / 1 / 1 | ablation; `ps_files.json` |
| "~1100 extensionless `#!/bin/sh`, origin unknown" | **389; 313 are ocx trampolines**, 6 authored | `ocx/.ocx/toolchain/shells/default/bin/actionlint:2`, `ocx/.gitignore:130` |
| "ocx: 791 raw, ~180 real" | 235 raw shell-ish files, **129 tracked** (73 of them doc snippets) | Axis 1 table A |
| **H1** `#!/bin/sh` bashisms are common | **0/190** SC3xxx; 1 deliberate, runtime-probed `local` | Axis 2 |
| **H2** `set -euo pipefail` cargo-culted | present in 77% of non-snippet bash scripts, **never in sh scripts**; `local x=$(…)` 0; the real hazard is SC2310/SC2312 in 9/41 files | Axis 4 |
| **H4** installers assume GNU/bash 4 | **No**: installers are POSIX and probe checksum tools; GNUisms are confined to `test/manual` scripts (sed -i x2, readlink -f x1) and the Swift checks (`xargs -r`) | Axis 5 |
| **H5** workflows rely on the default shell without knowing it | **Yes, measured**: 516/628 default; 22 pipelines without pipefail; native failures do not fail pwsh steps | Axis 6 |
| H6 "agents fail most on bashisms under `#!/bin/sh`" | in the fleet agents' sh scripts are clean (63 research sh scripts: 0 SC3xxx); their failures are quoting (SC2086 183), unguarded `cd` (SC2164 32), missing strict mode | Axis 3 |
| "taskfile cmds run under mvdan/sh, avoid bashisms" (implicit) | task 3.53.1's mvdan/sh runs arrays, `[[`, `declare -A`, `mapfile`; one authored workaround exists for a real panic | Axis 6 |
| "uv, devcontainers are fleet code" (implicit in raw counts) | 170 files (16%) are vendored upstream clones | Axis 1 |

## Gaps

- **No macOS host.** BSD `sed -i`, `xargs -r`, `readlink -f`, `date -v` claims are unverified; bash 3.2 semantics come from the `bash:3.2` image (no `/bin/bash` 3.2.57 + Apple patches, no BSD userland).
- **GitLab CI** (21 files: `grimoire-indexer/templates/ci/*`, `ocx-catalog`, `grimoire-components`) `script:` blocks not parsed or linted; the 4 `gitlab-*.sh` templates (no shebang) are in the shellcheck run as bash.
- **Rust-emitted shell** (`ocx/crates/ocx_shell`, `ocx_setup`) is not a file in this audit; no emitted-code escaping was measured here (H3 belongs to the emitter wave).
- Taskfile behaviour measured on **one task version (3.53.1)**; older mvdan/sh releases, which the workflow `setup-task` pins might install, may differ (the ocx-mirror panic comment predates 3.53.1 or is the same bug).
- Whether the 7 `set -u` + empty-array candidates are empty at runtime, and whether 103 "mac-plausible" scripts are *actually* run on a Mac, is a heuristic (path + taskfile reference), not an observation.
- shellcheck ran with `--norc` and default optional checks; fleet `.shellcheckrc` files (none found tracked) and `-x` source following were not applied (SC1091 x35 are "not following").
- **`*.bats` files** (10 tracked, 1997 lines: `setup-grimoire/tests/install/*.bats` 3, `www-setup/tests/install/**/*.bats` 7, shebang `#!/usr/bin/env bats`) are outside the extension/shebang inventory and the shellcheck/shfmt runs (shellcheck does not parse bats syntax); they hold a large share of the fleet's installer-test shell.
- Authored classification trusts `git ls-files`: a tracked-but-tool-managed file (`.beads/hooks`, 5 files) is counted authored; ~96 mirror repos hold zero tracked shell.
- fish/nu parse checks are parse-only; runtime compatibility of the three installers across versions (e.g. nu 0.105 vs 0.116 command renames) was not exercised.

## Appendix A — classification rules and exclusions

Exclusions at walk time: top-level dotted dirs, `ocx-sion ocx-soraka ocx-evelynn ocx-save index-claims index-fix67 find_ocx-ocx06`, and anywhere below: `.worktrees`, `.agents/worktrees`, `.tmp`, `.tmp-*`, `.probe-*`, `node_modules`, `target`, `.git`, `.venv`, `venv`, `.cache`, `bazel-*`, `vendor`, `external`. Repo roots = any dir with `.git`; nested roots own their files; duplicates by normalised origin URL are dropped (first in sorted path wins): `grimoire-duo`~`grimoire`, `ocx-contrib/mirror-{asciinema,astral-sh,bazelbuild,kitware}`~top-level twins. Non-git dirs `safe/` and `ocx-contrib/` (container) contribute 11 untracked files.

| class | rule | files |
|---|---|---|
| generated-untracked | not in `git ls-files` (subclass by path: `.ocx/`, `.ocx-mirror/`, `pytmp/`, `.git.broken*`, `.husky/_`, `website/src/_scripts`, `docs/dist`, `.claude|.agents/`) | 504 |
| vendored-upstream | origin in {astral-sh/uv, devcontainers/cli, devcontainers/spec, material-extensions/vscode-material-icon-theme} | 170 |
| research-scratch | tracked, `grimoire-lore/.agents/research/**` | 129 |
| agent-config | tracked, under `.claude/ .opencode/ .agents/` | 48 |
| authored | everything else tracked | 213 |

Reproduce: `cd /home/mherwig/.cache/research-lang/shell-tools/fixtures/fleet-shape && python3 -I inventory.py && python3 -I classify.py && python3 -I sc_run.py` (then `ax1.py ax3.py ax4.py ax5.py ax45md.py`; `ax6*.py` need plain `python3` for PyYAML).

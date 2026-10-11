---
title: Shell program config inventory — lore house conventions, checker contract, existing shell touchpoints, fleet AI and tool config
agent: config-inventory worker (sonnet), shell program wave 1
model: sonnet
scope: /home/mherwig/dev/grimoire-lore/.agents/worktrees/shell (rules/, skills/, bundles/, docs/, publish.toml, taskfile.yml, .claude/skills/research-lang/) plus the fleet under /home/mherwig/dev (AI config and tool config only)
method: python3 -I parsers, /usr/bin/grep, git ls-files, shellcheck 0.11.0 via shell-tools/run.sh, matrix.sh runs of fixtures under shell-tools/fixtures/config-inventory/. Every command is inline next to its result. Fleet scope = 149 repos after dedupe by git remote, minus upstream clones (uv, ocx-vscode-icons/*, rust-devcontainer-cli/*) and the lore catalog itself, with the task's exclusion list applied.
date_researched: 2026-10-10
---

# Config inventory

Shorthand: `L` = `/home/mherwig/dev/grimoire-lore/.agents/worktrees/shell`. All lore paths below are relative to `L`. Fixtures: `/home/mherwig/.cache/research-lang/shell-tools/fixtures/config-inventory/` (`F`). `matrix.sh` = `/home/mherwig/.cache/research-lang/shell-tools/matrix.sh`. macOS and BSD claims are read-only and say so.

Contents: [Headline numbers](#headline-numbers) · [1 House conventions](#1-house-conventions) · [2 Artifact checker contract](#2-artifact-checker-contract) · [3 Shell touchpoints already in the catalog](#3-shell-touchpoints-already-in-the-catalog) · [4 The CLI contract a shell script should mirror](#4-the-cli-contract-a-shell-script-should-mirror) · [5 Fleet AI config about shell](#5-fleet-ai-config-about-shell) · [6 Fleet tool config](#6-fleet-tool-config) · [7 Gaps (axis)](#7-gaps-axis) · [Smells (ranked)](#smells-ranked) · [Patterns worth encoding](#patterns-worth-encoding) · [Contradictions of the frame](#contradictions-of-the-frame) · [Gaps](#gaps)

## Headline numbers

| # | Number | Source (command in the section named) |
|---|---|---|
| 1 | Three reference rules: 206 / 182 / 198 index lines (swift / go / nix); index body 198 / 174 / 188 against the 200 cap; 10 / 10 / 9 depth files; 260 / 203 / 142 rule IDs; 24 / 18 / 15 non-negotiable rows | §1 |
| 2 | Depth files with the never-matching `paths` glob: **19 of 155 (12.3%)**. Swift 10/10, swift-package 3/3, code-docs 5/5, bazel-quality 1/15. The other 136 files (2.87 MB of 3.61 MB) carry no `paths`, including every go-quality and nix-quality depth file | §1 |
| 3 | The checker proves glob liveness with `Path.rglob` after stripping a leading `**/`. Brace alternation is reported dead. There is no content (shebang) matching anywhere in the catalog or on any client | §2 |
| 4 | Checker verification lints run on inline backtick spans only. **628** fenced `sh`/`bash` blocks (2,977 lines, 55.6% of all fenced blocks) are never linted | §2, §3 |
| 5 | Shell the catalog ships: 9 bash scripts (all `rules/swift-quality/checks/`), 3 docs-quality fixture `.sh`, 0 PowerShell, 0 fish/nu/elvish. Shellcheck default findings on the 9: **0**. `-s sh` findings: 33 (all SC3xxx, 3 files) | §3 |
| 6 | Catalog hits for `shfmt`, `bashism`, `pwsh`: **0 / 0 / 0**. `shellcheck`: 6 lines (5 are `# shellcheck disable=SC2016`). `pipefail`: 27 lines in 19 files | §3 |
| 7 | 2,734 rule rows carry a Verification column; **1,668 (61%)** hold a command span; 687 start `grep`, 497 start `rg` | §3 |
| 8 | Population shellcheck over all 628 fenced blocks: 67 blocks with a finding, 15 with an error-level finding (13 are `<placeholder>` redirections, SC1073), 29 (4.6%) with SC3xxx under `-s sh` | §3 |
| 9 | GNU-isms in catalog commands: 232 blocks use `grep -r/--include`, 108 `xargs -r`, 14 `mktemp -d`, 11 `grep -P`, 9 `timeout`, 8 `sort -V`. Busybox 1.37 (Alpine 3.22) fails `grep --include`, `grep -P`, `find -printf`, `sed -z` | §3 |
| 10 | Fleet raw count by the task's exclusion rules: **647 `.sh`** (frame said ~1450), **393** extensionless `#!/bin/sh` (frame said ~1100); **376 of 393 are ocx-generated trampolines** in `.ocx/toolchain/shells/*/bin/` | §6 |
| 11 | Fleet first-party shell-family files: 246 in 19 repos. Source-gated by shellcheck/shfmt: 4 repos, 179 files (73%). actionlint-only: 6 repos, 33 files. No gate: 9 repos, 34 files | §6 |
| 12 | `.shellcheckrc` in the fleet: **0**. `.editorconfig` shell sections: **0** (3 first-party editorconfigs, none has a shell glob). `PSScriptAnalyzerSettings.psd1`: **1** (www-setup). Pre-commit/lefthook shell hooks: **0** | §6 |
| 13 | Fleet AI config: 3,739 files in 32 repos, of which 2,545 are lore-installed copies and 1,187 native. One shell rule exists natively: `quality-bash.md` (150 lines, glob `**/*.sh` + `**/*.bash`) in 4 repos, plus 3 shell rules in www-setup (272 / 232 / 182 lines) | §5 |
| 14 | Measured: dash and posh **exit** on `set -o pipefail \|\| …` (a special-builtin error); a signal-killed child reports 143 in 8 shells, 271 in ksh93u+m, 399 in yash; `set -u` + empty `"${a[@]}"` fails on bash 3.2/4.0/4.2 and passes on 4.4+ | §3, §4, Smells |

## 1 House conventions

### 1.1 Commands

```sh
cd L
wc -l rules/swift-quality.md rules/go-quality.md rules/nix-quality.md          # 206 182 198
python3 -I -   # parses frontmatter, '| ID |' tables, depth-file counts and bytes (script inline in this session)
find rules/swift-quality rules/go-quality rules/nix-quality -type f | xargs wc -l   # depth files + checks/
```

### 1.2 Rule frontmatter (index file)

Rules have **no `description` and no `metadata:`**. Catalog keys sit at the top level (grim-authoring: rule metadata is top-level; `check-artifacts.py:591-599` flags `summary`/`keywords`/`repository` inside `metadata`).

| Rule | Lines (file / body) | Frontmatter keys | `paths` |
|---|---|---|---|
| `rules/swift-quality.md:1-8` | 206 / 198 | `paths`, `summary`, `keywords`, `license: Apache-2.0`, `repository` | `**/*.swift` |
| `rules/go-quality.md:1-8` | 182 / 174 | same five | `**/*.go` |
| `rules/nix-quality.md:1-10` | 198 / 188 | same five | `**/*.nix`, `**/flake.lock`, `**/statix.toml` |

`keywords` is one comma-separated string. `repository: https://github.com/ocx-sh/grimoire-lore`. Quoting is `"**/*.swift"` (double quotes).

Depth-file frontmatter (`rules/swift-quality/errors.md:1-7`): a `#` comment line, `paths: ["**/.swift-quality-depth-on-demand"]`, `title`, `summary`. Go and nix depth files carry only `title` and `summary` (`rules/go-quality/errors.md:1-4`, `rules/nix-quality/gates.md:1-4`).

### 1.3 Section skeleton of the index (identical in all three)

| Order | Heading | swift line | go line | nix line |
|---|---|---|---|---|
| 1 | `# <Lang> Quality` + 3-line "Traps, not tutorials" intro + `Contents:` anchor line | 10-29 | 10-19 | 12-37 |
| 2 | bold "Before trusting any rule below, read X" paragraph (the era/version precondition) | 22-29 | 21-29 | in 12-37 |
| 3 | `## The Gate` (fenced `sh` block, numbered steps, pinned versions + measurement date, "a task is done when a command, its exit code and the tree it ran against are all named") | 31 | 31 | 38 |
| 4 | `## Non-Negotiables` (table `# \| Rule \| ID`) | 56 | 69 | 82 |
| 5 | `## Rules This File Owns` (the `<LANG>-CORE` family table + one fenced `sh` block of the CORE checks) | 89 | 96 | 106 |
| 6 | `## Where the Depth Is` (routing table `Doing… \| Read`) | 144 | 121 | 139 |
| 7 | `## Severity` (MUST/SHOULD/CONSIDER + the **pinned** decision list) | 168 | 145 | 164 |
| 8 | `## Siblings` | 188 | 165 | 190 |

### 1.4 Non-negotiables and IDs

- Table `| # | Rule | ID |`; the ID cell holds 1-4 IDs, comma-separated. Verbatim framing (`rules/go-quality.md:71-73`): "Every line below blocks a merge within the scope it names. IDs resolve through [Where the Depth Is], where each rule carries its rationale and verification."
- ID grammar: `^[A-Z][A-Z0-9]*(-[A-Z][A-Z0-9]*)*-\d+$` (`check-artifacts.py:49`). Prefix per language (`SW`, `GO`, `NIX`), family per depth file (`SW-ERR`, `GO-CONC`, `NIX-GATE`). Index defines only `<P>-CORE` (swift 19, go 5, nix 6 IDs); depth files define the rest and the index only cites them.
- Retirement: `rules/swift-quality.md:98` "SW-CORE-07 and SW-CORE-08 are retired, not reused." (the checker exempts such lines from the dead-citation check, `check-artifacts.py:53,473-477`).
- Depth tables: header `| ID | Rule | Rationale | Verification | Severity |` (swift 56 tables, go 54). Nix inserts a sixth column `Floor / impl` (52 tables with it last, 6 with it before Severity). **That column is the in-catalog precedent for a per-version/implementation matrix column**, which a shell set needs per shell and per OS.
- Severity cell is not a clean enum. Swift: 131 `MUST`, 96 `SHOULD`, 6 `CONSIDER`, 27 conditional (`MUST (SDK) · SHOULD otherwise`). Go: 99 / 71 / 2 / 31 conditional. Counts from the `| ID |` parser; nix columns shift, so its severity was not counted.
- Verification-cell shape (`rules/go-quality.md:104`): command, then "Every printed line is read. Empty output is the pass." then "Watched 2026-09-26 (git 2.54, GNU grep 3.12): a planted X printed ..., the fixed twin printed nothing." GO-CORE-03 (`:106`) mandates saying in every verification whether empty output is the pass or the finding and naming the tool version it was watched on.
- Era statement per depth file (`rules/swift-quality/errors.md:11-13`): "Binds to Swift 6.4.0 and 6.3.3 on Linux x86_64 ... (measured 2026-10-10). Apple and Windows behaviour is `unverified: read only`." Every depth file opens with `## Dates and Defaults|Floors` (`go-quality/errors.md:24`, `nix-quality/gates.md:19`).
- Every depth file ends `## What Agents Get Wrong Here`, a numbered list "ranked by corpus frequency times blast radius" (`swift-quality/errors.md:277-284`), after a one-paragraph owns/not-owned-here preamble and a `Contents:` line.

### 1.5 Depth-file routing table and gate block

- Routing table (`go-quality.md:121-143`): intro "Read the file for the work you are about to do, not for the topic it is filed under. One level deep: these files do not point at each other." Rows are task phrases ("Starting a goroutine, fanning out work, passing, storing or cancelling a context ...") not topic names, plus rows that route to **sibling sets** (`go-modules`, `bazel-quality`, `go-release` skills, `docs-instrument`). 14 rows for 10 depth files.
- Gate block: fenced `sh`, one step per line with a trailing `# N ID` comment, cheapest first (`go-quality.md:37-50`; swift `swift-quality.md:31-55` adds `CHECKS=.claude/rules/swift-quality/checks    # pinned default` and `BASE=origin/main`). Then a **Pinned** tool-version sentence with the measurement date, "Gate on each step's exit status, never on its stdout" (`go-quality.md:55`), and "Chain the ten steps into one named target, `check` (**pinned** name: a Makefile target, a task-runner entry or a `set -e` script)" (`go-quality.md:58-60`).

### 1.6 How depth files avoid autoloading

Convention (memory `rules-dir-autoloads-recursively.md`, measured 2026-09-27): Claude Code loads every `.md` under `.claude/rules/` recursively, so depth files need a `paths` glob that matches nothing. Applied form: leading comment `# Read on demand through the index. This glob matches no file, so a client never auto-loads the file.` + `paths: ["**/.<set>-depth-on-demand"]`.

```sh
python3 -I -   # per rules/<set>/*.md: does frontmatter carry a *depth-on-demand glob
```

| Set | Depth files | With never-glob | Glob |
|---|---|---|---|
| swift-quality | 10 | 10 | `**/.swift-quality-depth-on-demand` |
| swift-package | 3 | 3 | `**/.swift-package-depth-on-demand` |
| code-docs | 5 | 5 | `**/.code-docs-depth-on-demand` |
| bazel-quality | 15 | 1 (`swift.md` only) | `**/.bazel-quality-depth-on-demand` |
| go-quality, go-modules, nix-quality, rust-quality (18), rust-cargo, python-quality (12), typescript-quality (12), cmake-build, cpp-packaging, css-theming, docs-quality, gradle-build, java-quality, kotlin-quality, maven-build | 121 | **0** | none |
| **Total** | **155** | **19 (12.3%)** | |

The convention was applied in the Swift wave and code-docs and was never backported. `check-artifacts.py` neither requires nor checks it (`:600` globs are checked on the index only). The taskfile passes `--allow-absent '**/.swift-quality-depth-on-demand'` (`taskfile.yml:171`) although the checker never reads depth-file `paths` (redundant). Spot-read 3: `rules/swift-quality/errors.md:2-4`, `rules/code-docs/linkage.md:2-4`, `rules/bazel-quality/swift.md` carry it; `rules/go-quality/errors.md:1-4`, `rules/nix-quality/gates.md:1-4`, `rules/rust-quality/cli-contract.md:1` do not.

**A shell set must** ship `**/.shell-quality-depth-on-demand` (or one per rule) on every depth file; the checker will not enforce it.

### 1.7 Skills (`skills/swift-diagnose/`, `skills/go-release/`)

```sh
find skills/swift-diagnose skills/go-release -type f | xargs wc -lc
```

| | swift-diagnose | go-release |
|---|---|---|
| `SKILL.md` lines / bytes | 442 / 29,134 (body cap 500) | 443 / 24,503 |
| Frontmatter | `name`, `description` (single-quoted, 1016 chars of 1024), `license`, `metadata.summary`, `metadata.keywords` (`SKILL.md:1-8`) | same, description 936 chars (`SKILL.md:1-8`) |
| `references/` | 4 files: 127, 99, 148, 89 lines | 1 file: 155 lines |
| Opening | purpose paragraph, evidence line "Every command was run on Swift 6.4.0 and 6.3.3, Linux x86_64, on 2026-10-10 ... macOS ... `unverified: read only`" (`:19-23`), `Contents:` line, `Read \| When` routing table to references (`:33-38`) | warning section "A proxied tag is permanent. Read this before step 1" (`:12`), `## Scope`, `## Pinned defaults` |
| Step layout | `## Consent first` (action/cost/measured table), `## Stop condition`, `## Never edit the check`, `## Step 0`, `## Route by exit code and first line`, then lettered branches `## A. Crash` ... `## D.` (`:40-374`) | `## The runbook` with `### 1.` to `### 11.` gate-ordered steps (`:65-371`) |
| Receipt | `## The receipt`: six numbered blocks (symptom, build identity, root cause, evidence, fix or gap, rule IDs relied on) (`:397-410`) | none (steps 10-11 verify) |
| MUST table | `## MUST rows this procedure surfaces`, `\| # \| Finding \| Rule \|`, 11 rows (`:412-430`) | `## The MUST rows this procedure enforces`, same shape, 15 rows (`:392-414`) |
| Closer | `## What agents get wrong` numbered list (`:432`) | `## What agents get wrong here` 11 items (`:416`) |

MUST-table convention verbatim (`swift-diagnose/SKILL.md:414-416`): "Restated as findings so a diagnosis run without the rule loaded still reports them with the right ID. The rule text and full verification live in the `swift-quality` rule." This is the "bounded duplication" licensed by `rule-distillation.md:223-226` ("Duplicate the MUST list; never duplicate the depth"). The row text is a **finding** (past tense, "A fix stopped the symptom by changing the measurement"), the last cell an ID. Skills cite IDs by number and never restate rules (`swift-quality.md:204-206`).

### 1.8 Bundle and publish entries

`bundles/swift-everything`: `bundles/swift-essentials.toml` (32 lines).

| Element | Lines | Content |
|---|---|---|
| Top-level keys | 1-5 | `summary`, `keywords` (comma string), `description` (one long sentence enumerating contents), `license`, `repository` |
| Comment block | 7-19 | "Members are same-directory relative ... `./swift-quality`"; **"MEMBERS CARRY NO TAG. Not a digest, not an exact version, not a floating major, not `latest`"**; "Do not pass --pin when releasing this bundle." |
| `[rules]` | 21-26 | `swift-quality = "./swift-quality"`, `swift-package`, and the shared `code-docs` |
| `[skills]` | 28-32 | `swift-upgrade`, `swift-diagnose`, `swift-release`, and shared `code-docs-cleanup` |

Every language bundle carries `code-docs` + `code-docs-cleanup` (comment `swift-essentials.toml:24-25`: "code-docs globs every source extension, this set's included").

`publish.toml` Swift block (`publish.toml:404-439`; file is 439 lines; 21 `[rules.*]`, 19 `[skills.*]`, 11 `[bundles.*]` tables): a comment paragraph (`:404-416`) explaining the rule split "by which file is under edit, not by language family", then per artifact:

```toml
[rules.swift-quality]
version = "0.1.0"
description = { readme = "docs/swift-quality.md", logo = "assets/lore-swift.svg" }
```

No catalog-wide `version` (`publish.toml:20-29`): "the version key IS the release lever". A new set touches: `publish.toml` (6 tables for Swift), `docs/<name>.md` (6 files for Swift), `assets/lore-swift.svg` (**no `assets/lore-shell.svg` exists**; `ls assets` shows lore-{bazel,cmake,code-docs,css,docs,git,go,gradle,java,kotlin,maven,nix,python,rust,subsystem,swift,typescript}.svg), `taskfile.yml` (36 `swift` lines: a `SWIFT_CONSUMER` variable and a `check-artifacts.py` invocation, `:158-175`), `bundles/<set>-essentials.toml`. `index/github.com/ocx-sh/swift-*/metadata.json` (6 files) are generated by the announce PR (`290b9ed announce: ...`), not authored. Memory `lore-publishes-on-main.md`: merging to main pushes to ghcr.io.

## 2 Artifact checker contract

### 2.1 Commands

```sh
python3 -I - <<'EOF'   # read check-artifacts.py:1-831; constants at :29-33
cd F && python3 -I L/.claude/skills/research-lang/scripts/check-artifacts.py --root F/repo rules/t.md   # glob-form experiments
```

### 2.2 Every check

| Check | Lines | Detail |
|---|---|---|
| Budgets | `:29-32` | `SKILL_BODY_MAX=500`, `RULE_BODY_MAX=200`, `TOC_REQUIRED_OVER=100`, `DESCRIPTION_MAX=1024` |
| Skill name == dir, charset | `:545-553` | `NAME_RE = ^[a-z0-9]+([.-][a-z0-9]+)*$` (`:33`) |
| Description hygiene | `:240-259` | non-empty, <= 1024, one line, no workflow-verb opener (`:36-47`: dispatches, runs, iterates, orchestrates, performs, executes, handles, generates, creates, builds), third person, contains "use when" |
| Skill body <= 500 | `:555-558` | |
| TOC for > 100 lines | `:262-280` | `contents:` in first 40 lines, or an index with a `\| [read` / `](references/` / `](<stem>/` routing table |
| Relative links resolve | `:283-288` | fenced blocks stripped first (`FENCE_RE :101`) |
| Support file routed from index | `:620-621` | by basename substring; `fixtures/` exempt (`:608-613`) |
| Rule index body <= 200 | `:584-590` | depth files are checked through `check_rule` of their index (`:639-642`) and get **no line cap** |
| `summary`/`keywords`/`repository` not inside `metadata` | `:591-599` | |
| Glob liveness | `:518-528` | `root.rglob(glob.removeprefix("**/"))`, index `paths` only, `--allow-absent` exempts exact strings (`:175,524`) |
| Rule IDs | `:49-53,505-512,645-655` | row-leading ID regex; duplicate across files; cited-but-undefined (only for families seen defining at least one ID); `is retired` lines exempt |
| Empty Verification cell | `:513-515` | the `verif` header substring picks the column |
| Row pipe count | `:83,494-504` | an unescaped `\|` inside a backtick span shifts columns |
| `rg \| ...\\|` in a table cell | `:349-362` | `rg` and `grep -E` (`is_ere_grep :104-125`); BRE `grep 'a\|b'` allowed |
| Unquoted `**` in `rg/grep/git grep/find` | `:383-392` | |
| `rg` with no path operand | `:291-325,393-402` | stdin trap for agents |
| `<template>` in a quoted search pattern | `:61-67,403-422` | exempts Rust-type names |
| `--include=`/`--exclude=` unquoted glob | `:76,443-456` | zsh nomatch rationale in the comment |

### 2.3 What the lints do not reach

```sh
printf '...Inline: `rg foo` and `grep -rn --include=*.x foo .`...\n```sh\nrg foo\ngrep -rn --include=*.x foo .\nls WORKSPACE*\n```' > F/rules/t2.md
python3 -I check-artifacts.py F/rules/t2.md      # -> 2 findings, both on the INLINE spans; the fenced twins are silent
```

`check_runnable_spans` uses `CODE_SPAN_RE` (backtick spans, `:55`). A fenced block has no backticks per line, so **all 628 fenced sh/bash blocks in the catalog bypass every command lint**. Only inline spans in table cells and prose are linted. Not linted anywhere: `shellcheck`, bash-version features, GNU-only flags, zsh `nomatch` on non-`--include` globs, `<placeholder>` operands outside quoted search patterns.

### 2.4 Which glob forms the checker can prove live

Experiment (fixture repo with `bin/foo` (`#!/bin/sh`, no extension), `scripts/run` (`#!/bin/bash`), `a.sh`, `.shellcheckrc`):

```sh
for g in '**/*.sh' '**/*.{sh,bash}' '**/bin/*' 'bin/*' '**/scripts/*' '**/.shellcheckrc' '**/foo' '**/*' '**/*.zsh' '**/bin/**'; do mk "$g"; python3 -I check-artifacts.py --root F/repo rules/t.md; done
```

| Glob | Result |
|---|---|
| `**/*.sh`, `**/.shellcheckrc`, `**/foo`, `**/*`, `**/bin/*`, `bin/*`, `**/scripts/*`, `**/bin/**` | clean (live) |
| `**/*.{sh,bash}` | **dead glob** (pathlib has no brace expansion) |
| `**/*.zsh` (no such file in root) | dead glob |

So: plain `rglob` patterns work, braces never do, and liveness needs a `--root` that contains a match. There is no content-based form: **no checker, no grim transform and no client matches a shebang.** `rules/…` `paths` are path globs on all 6 native clients; Cursor and Antigravity split the glob string on every comma, so braces break there anyway (grim-authoring `references/rule-spec.md:95-96`). OpenCode and Junie drop `paths` and restate scope as prose (`rule-spec.md:89-90`).

**How could a shell rule load for `bin/foo` with `#!/bin/sh`?** It cannot, by path: the options are (a) glob by structural name where the build system or convention fixes it (`**/bin/*` over-matches binaries and every other language's `bin/`; `**/install` and `**/configure` are exact-name globs with the same blind spot), (b) rely on the **always-loading `code-docs` rule**, which already globs `**/*.sh`, `**/*.bash`, `**/*.zsh`, `**/*.ps1`, `**/*.psm1` (`rules/code-docs.md`), and (c) put the routing in a skill description / a pointer in a sibling index. `memory/globs-must-not-miss.md` and `rule-distillation.md:83-87` ("narrower than the language's own file extension has to be underwritten by something structural") argue against (a).

What other sets do for extensionless files (all 207 globs across 21 rule indexes, parsed):

| Glob form | Count | Examples |
|---|---|---|
| `**/*.ext` | 96 | `**/*.bzl`, `**/*.cmake` |
| exact filename with extension | 63 | `**/BUILD.bazel`, `**/MODULE.bazel` |
| name wildcard | 21 | `**/.bazelrc.*`, `**/tailwind.config.*`, `**/.mvn/**` |
| exact dotfile | 15 | `**/.bazelrc`, `**/.ruff.toml` |
| **exact extensionless name** | **9** | `**/BUILD`, `**/WORKSPACE` (x2), `**/Makefile`, `**/Dockerfile`, `**/mvnw`, `**/rust-toolchain`, `**/.cargo/config` |
| content / shebang | **0** | |

Extensionless coverage is always an exact basename that the tool itself requires. Nothing in the catalog handles `#!`-only scripts.

Checker + CI wiring for liveness: `taskfile.yml:171` (swift) runs `--root {{.SWIFT_CONSUMER}}` only if the consumer is set, else prints "glob liveness NOT checked" (`:166-174`). For shell a live root exists: `/home/mherwig/dev/www-setup` has live `*.sh *.bash *.ps1 *.psm1 *.psd1 *.fish *.nu *.elv` and `PSScriptAnalyzerSettings.psd1`; absent: `*.zsh *.ksh .shellcheckrc` (needs `--allow-absent`). `setup-grimoire` lacks `*.psd1 *.fish *.nu *.elv`.

## 3 Shell touchpoints already in the catalog

### 3.1 Commands and per-file counts

```sh
cd L && /usr/bin/grep -rn -i -e shellcheck -e shfmt -e 'set -e' -e pipefail -e bashism -e posix -e powershell -e pwsh -e '#!/' rules skills docs > F/ax3.txt
wc -l F/ax3.txt                                  # 125 lines, 70 files
cut -d: -f1 F/ax3.txt | sort | uniq -c | sort -rn   # per-file counts
```

| Pattern | Raw lines | md | py/jsonl checks | swift `.sh` checks | Verdict after spot-read |
|---|---|---|---|---|---|
| `posix` | 52 | 29 | 23 | 0 | 3/3 spot-read false positives: `rules/swift-quality/io.md:188` `PosixFailure`, `errors.md:199` `POSIXError`, `testing.md:178` `posix_spawn`. Real shell hits: `rules/python-quality/cli-contract.md:157` and `typescript-quality/cli-contract.md:141` ("POSIX shell exit status ... 126, 127, and 128+N" links). FP rate ~85% |
| `#!/` | 32 | 9 | 14 | 9 | 9 swift `.sh` shebangs real; md hits: 2 perl (`swift-quality/api-design.md:131,186`), 2 node (`css-theming/gate.md:68,126`, `typescript-packaging.md:128`), 1 `sh` (`skills/docs-instrument/references/tested-examples-by-language.md:57`), 1 bash (`skills/swift-upgrade/references/dated-rechecks.md:56`) |
| `pipefail` | 27 | 25 | 0 | 2 | real in 25/25 spot-read (3/3 checked); FP 0% |
| `set -e` | 6 | 6 | 0 | 0 | `rules/cmake-build/install-and-export.md:24,83` (`set -eu`), `bazel-seam.md:43`, `skills/cmake-modernize/references/proofs.md:169`, `go-quality.md:59` (prose) |
| `shellcheck` | 6 | 1 | 0 | 5 | 5 are `# shellcheck disable=SC2016  # the awk program is single-quoted on purpose`; 1 is a filename (`skills/code-docs-cleanup/SKILL.md:155`, `01_shellcheck_rest.py`). **No rule mentions running shellcheck** |
| `powershell` | 4 | 3 | 1 | 0 | `swift-package/gates.md:271` (Windows legs wrap each command in `Invoke-Program`), `:301` ("a bare PowerShell script" is an agent failure), `docs/code-docs.md:17` |
| `shfmt`, `bashism`, `pwsh` | 0 | 0 | 0 | 0 | none |

Normative lines worth quoting (all existing prior art a shell set must cite, not duplicate):

| Where | Normative text |
|---|---|
| `rules/cmake-build.md:136` CMK-CORE-05 | "In any verification script over a CMake tree, never pipe a match stream into an early-exiting reader (`grep -q`, `grep -m1`, ripgrep's `-q`, `head`) under `set -o pipefail`. Use one `grep -rq` with a directory operand and no pipe." Rationale: reader exits, writer takes SIGPIPE, `pipefail` yields rc 141 "on a tree full of matches". Echoed in `skills/cmake-modernize/SKILL.md:424` and `rules/python-quality/ci-gate.md:49-52` |
| `rules/nix-quality/security.md:102` | "a negated `! grep` never fails a `bash -e` step" (verified below) |
| `skills/nix-flake-adopt/references/ci-and-readme.md:4`, `docs/nix-flake-adopt.md:37` | run blocks were executed "under `bash --noprofile --norc -eo pipefail` (the shell GitHub Actions uses)". That is the **explicit `shell: bash`** shape; the unset default is `bash -e {0}`. Unverified here (CI-shell worker owns); the sentence is imprecise as written |
| `rules/swift-quality.md:31-55` SW-GATE-01 | gate block `git ls-files -z ... \| xargs -r -0 ...`, "123 = a finding behind xargs" |

Measured, to settle the two behaviour claims the prior art leans on:

```sh
# errexit_bang.sh:  set -e; ! true | grep -q x; echo "bang-pipeline-reached"
matrix.sh posix F/errexit_bang.sh      # 11/11 interpreters (dash, ash x2, mksh, ksh93 x2, yash, posh, bash 3.2/5.2 --posix, zsh sh) print bang-pipeline-reached, exit 0
# pipefail_sigpipe.sh:  set -o pipefail 2>/dev/null || { echo "no pipefail"; exit 0; }; yes | grep -q y; echo "rc=$?"
matrix.sh posix F/pipefail_sigpipe.sh
```

```
== dash 0.5.12 (deb12)               -> exit 2       (script ABORTED at `set -o pipefail`; the `||` guard never ran)
== busybox ash 1.35 / 1.37           rc=141 -> exit 0
== mksh R59c                         rc=141
== ksh93u+m 2023 / 1.0.10            yes: standard output: Connection reset by peer  rc=1
== yash 2.52                         rc=397
== posh 0.14.1                       -> exit 1       (aborted)
== bash 3.2 / 5.2 --posix, zsh sh    rc=141
```

Takeaways: `! pipeline` is exempt from `-e` everywhere (NIX-SEC claim holds, 11/11). `set -o pipefail` in dash 0.5.12 and posh is a **fatal special-builtin error that `||` cannot catch**; the SIGPIPE status of the CMK-CORE-05 trap is 141 in bash/ash/mksh/zsh, 1 in ksh93u+m (with a message) and 397 in yash.

### 3.2 The shipped `checks/*.sh` (9 files, all `rules/swift-quality/checks/`)

```sh
cd L/rules/swift-quality/checks
for f in *.sh; do shellcheck -f gcc $f; shellcheck -s sh -f gcc $f; shellcheck -o all -f gcc $f; done | wc -l   # via run.sh
python3 -I -   # greps GNU/bashism patterns per file
matrix.sh bash F/syn.sh     # bash -n on the 9 files under 3.2 4.0 4.2 4.4 5.0 5.1 5.2 5.3
```

| File | Lines | Shebang | `set` | shellcheck default | `-s sh` | `-o all` | trap |
|---|---|---|---|---|---|---|---|
| canary.sh | 14 | `#!/usr/bin/env bash` | none | 0 | 0 | 1 | 0 |
| fold-check.sh | 31 | same | `set -u` | 0 | 0 | 7 | 0 |
| generated-touch.sh | 25 | same | `set -u` | 0 | 0 | 9 | 1 |
| k07.sh | 120 | same | `set -o pipefail` (`:110`) | 0 | 26 | 34 | 1 |
| never-gate.sh | 30 | same | `set -u` | 0 | 0 | 9 | 1 |
| silence-check.sh | 39 | same | `set -u` | 0 | 0 | 12 | 1 |
| swiftlint-gate.sh | 34 | same | `set -u` | 0 | 3 | 6 | 1 |
| tsan-check.sh | 50 | same | `set -u` | 0 | 4 | 16 | 1 |
| weaken-check.sh | 54 | same | `set -u` | 0 | 0 | 11 | 1 |

- **0/9 use `set -e`**; 7 use `set -u`, 1 `pipefail`, 1 nothing. This is deliberate fail-closed design, not the `-euo pipefail` header (`k07.sh:8-11`: "a scan fails by its exit status (grep 2, xargs 123, git 128), never by what it wrote to stderr").
- `bash -n` passes on all 8 bash versions (3.2 through 5.3), 9/9. 0/9 use `mapfile`, `declare -A`, `${x,,}`, `readlink -f`, `sed -i`, `grep -P`, `date -d`. Arrays only in `k07.sh:41-44` and `tsan-check.sh:27-32`.
- **`tsan-check.sh:32` uses `${scratch[@]+"${scratch[@]}"}`** — the empty-array-under-`set -u` idiom for bash < 4.4 (measured pass on 3.2-5.3, `F/idiom.sh`). See Patterns.
- Only `mktemp` (bare, 14 uses) and `xargs -r -0` (4 uses; GNU, accepted as a no-op by macOS xargs, read-only) are userland-sensitive; `tsan-check.sh` calls `timeout -k` (GNU coreutils; absent on stock macOS, read-only; the script is Linux-scoped).
- Header convention (`never-gate.sh:1-19`): shebang, `# name: ID, purpose`, `# Usage: BASE=origin/main bash never-gate.sh (run from the repository root ...)`, `# Exit: 0 clean; 123 ...; 65 ...; 66 ...`, "Watched red and green on Swift 6.4.0 ... (measured 2026-10-10)", then code. Cleanup via `trap 'rm -f "$overlay" "$list"' EXIT` (`:22`). Exit codes 65/66 follow sysexits (EX_DATAERR/EX_NOINPUT).

### 3.3 Shell code blocks and rule-row commands (macOS and zsh portability of the catalog's own verifications)

```sh
python3 -I - # extract ```sh|bash fenced blocks from rules/**/*.md skills/**/*.md   -> 628 blocks (419 sh, 209 bash) of 1,129 fenced blocks, 2,977 lines
python3 -I - # random.seed(20261010) sample of 40 -> F/blocks/b01..b40.sh
run.sh shellcheck -s bash -f json1 F/blocks/b*.sh ; run.sh shellcheck -s sh -f json1 ...      # population: F/all/a001..a628.sh
```

Sample of 40 (27 `sh`, 13 `bash`; 19 distinct sets):

| Measure | Sample 40 | Population 628 |
|---|---|---|
| shellcheck (`-s bash`) clean | 36 (90%) | 561 (89.3%) |
| with an error-level finding | 1 (SC2260 redirect-overrides-pipe) | 15 blocks (28 findings) |
| parse failure (SC1072/1073/1009) | 0 | 13 blocks: all `<placeholder>` operands (`skills/docs-plan/SKILL.md:191` `grep -cE "..." <artifact>`, `skills/bazel-adopt/references/go-no-go.md:80,119,207`, `branch-rust.md:89,102,135`) |
| non-POSIX under `-s sh` (SC3xxx) | **0** | **29 (4.6%)**: 18 of 419 blocks tagged `sh`, 11 of 209 tagged `bash` |
| top SC3 codes | n/a | SC3054 array refs 61, SC3001 `<(…)` 23, SC3003 `$'…'` 10, SC3030 arrays 9, SC3040 `set -o pipefail` 8, SC3060 4, SC3044 3 |
| would fail under zsh (candidate unquoted-glob nomatch) | 1 real (`skills/bazel-adopt/SKILL.md:276` `.bazelrc*`), 2 false positives (awk/jq regex) | 36 candidates; spot-read 6: 5 real (`rules/docs-quality.md:128` `rules/docs-quality/*.md`, `skills/docs-plan/SKILL.md:197`, `rules/bazel-quality/rust.md:62,164`, `skills/jvm-release/SKILL.md:182`), 1 FP (awk). FP rate ~17% |
| bash-only name that is empty under zsh (`PIPESTATUS`) | 0 | 2 (`rules/go-quality/cli-contract.md:99`, `rules/swift-quality/cli-contract.md:168`) |
| assumes GNU/non-baseline tools | 14 `xargs -r`, 13 `grep -r/--include`, 1 `grep -P`, 8 `jq`/`rg`/`yq` | see Headline 9 |

False-positive notes on the grep layer: the first `[[`-count was 75 blocks (64 `sh`), but **0 are tests**: every hit is a `[[:space:]]` class (shellcheck SC3010 count = 0). A grep count is a hypothesis.

Behaviour runs backing the zsh column (`matrix.sh zsh F/zshhaz.sh`, zsh 5.0.8 5.3.1 5.8 5.9; native mode, per-idiom subshell):

```
unquoted-include-glob  rc=1 out=[(eval):1: no matches found: --include=*.nomatch]   zsh 5.0.8 and 5.9
unquoted-star-nomatch  rc=1 out=[(eval):1: no matches found: *.nomatch]
pipestatus             rc=0 out=[]            (bash 3.2..5.3: out=[1])
for-scalar-split       out=[1]                (bash: [2])
arr-index0             out=[]                 (bash: [x])
read-a                 (eval):read:1: bad option: -a
errexit-bang           zsh 5.0.8: rc=1 out=[] ; 5.3.1 / 5.8 / 5.9: reached
dollar-quote, dbl-bracket, procsub, pipefail, echo-e, func-kw, which   all work in zsh 5.9
```

`zsh 5.0.8` exits on `set -e; ! false | true` while 5.3.1+ and every bash/posix shell continue (version-specific: zsh <= 5.0.8). The macOS `/bin/zsh` is 5.9; the zsh matrix confirms the catalog's `--include=*.x` unquoted form dies there when no file matches, which is exactly what `check-artifacts.py:443-456` guards for inline spans.

Userland behaviour (`matrix.sh posix F/tools.sh`; the GNU rows are Debian 12 userland inside `shellzoo:deb12`, so only the Alpine row measures a non-GNU userland):

```
busybox ash 1.37 (alpine 3.22)  grep-r-include=FAIL(2) grep-P=FAIL(2) find-printf=FAIL(1) sed-z=FAIL(1) grep-rqE-exclude-dir=FAIL(2)
                                xargs-r=ok sort-V=ok sed-i=ok mktemp-d=ok date-d=ok timeout=ok readlink-f=ok realpath=ok stat-c=ok sha256sum=ok sed-E=ok head-n-1=ok
dash/ash 1.35/mksh in deb12     all ok (GNU userland)
```

So the 232 blocks using `grep -r --include/--exclude-dir` exit 2 on a stock Alpine image (fail-closed, since the catalog treats grep 2 as a failure, but unusable). `rg` leads 497 of 1,668 command cells, `jq` 11: these tools are not part of any base image and are not declared as a dependency in the rule indexes (swift gate declares `swift`/`jq`; no index declares `rg`). macOS BSD `grep` has `--include`; no `-P` (read-only).

Verification-command inventory (`python3 -I` over `rules/**/*.md` ID rows, header contains `verif`):

| Set | Rule rows | with command span |
|---|---|---|
| bazel-quality | 393 | 285 |
| rust-quality | 446 | 310 |
| swift-quality | 260 | 118 |
| go-quality | 203 | 83 |
| nix-quality | 142 | 59 |
| typescript-quality | 183 | 152 |
| all 21 rule indexes + depth | **2,734** | **1,668 (61%)** |

First command token over the 1,668: `grep` 687, `rg` 497, `bazel` 72, `git` 68, `swift` 49, `cargo` 47, `go` 45, `python3` 37, `nix` 35, `find` 32, `test` 12, `jq` 11.

## 4 The CLI contract a shell script should mirror

```sh
sed -n 1,150p L/rules/rust-quality/cli-contract.md ; python3 -I - # ID table of platform-and-paths.md (169 lines)
matrix.sh posix F/sig.sh          # exit-status facts below
```

`rules/rust-quality/cli-contract.md` (150 lines, no frontmatter, `Contents:` at `:9`) defines the pinned exit table `:31-47` (0, 1, 64-82, 83-99 free, 128+N "not ours": forwarded child signal only) and 27 rules. Mechanism vs pinned numbers are split explicitly (`:13-21`): "Another project adopting this rule keeps the mechanism and assigns its own numbers above 78."

| ID (line) | One-line imperative | Shell verdict |
|---|---|---|
| EXIT-01 `:60` | every exit value comes from the one enum, no bare integers | **translates**: one `readonly` block of `EX_*` constants; grep `exit [0-9]` |
| EXIT-02 `:61` | `main` returns; `process::exit` only at the boundary (destructors) | **needs shell mechanism**: no destructors, but `exit` inside `$(…)`/pipeline stage/subshell only leaves that subshell; cleanup is `trap … EXIT`; www-setup `installers.md:198` "statement position" |
| EXIT-03 `:62` | parse errors exit 64, never the framework's 2 | translates (`getopts`/`case` default -> `exit 64`); **conflict**: www-setup uses 2 for usage (see §5) |
| EXIT-04 `:63` | no meaning for 1, 2, >= 100 | translates; but shells themselves emit 2 (builtin misuse, dash `exit -1` -> 2), 126, 127, 128+n, 255 |
| EXIT-05 `:64` | never unwrap `ExitStatus::code()`; signal -> 128+n | **translates with a caveat**: measured below, 128+n is only the convention in 8 of 11 shells |
| EXIT-06 `:65` | codes append-only | translates (documentation rule) |
| EXIT-07 `:66` | fall-through locked by a test, no wildcard | partly (a `case` default arm + a test) |
| EXIT-08 `:67` | one taxonomy per workspace | translates |
| EXIT-09 `:68` | classification free function or trait, not both | Rust-only |
| EXIT-10 `:69` | each code documented and tested | translates (usage text + bats/pester test) |
| EXIT-11 `:70` | signal handler derives status from the signal, restore SIG_DFL and re-raise | **needs shell mechanism**: `trap 'cleanup; trap - INT; kill -INT $$' INT` |
| CLI-01 `:109` | result on stdout; logs/progress/warnings/prompts/errors on stderr | translates (`>&2`); www-setup `installers.md:214-221` already pins it |
| CLI-02 `:110` | `--format json`: stdout is only the payload | translates |
| CLI-03 `:111` | render error once, sanitize control/bidi characters | needs shell mechanism (`printf '%s' | tr -d '[:cntrl:]'`, locale-sensitive) |
| CLI-04 `:112` | structured error envelope | Rust/pinned; optional for shell |
| CLI-05 `:113` | closed downstream pipe is a clean exit 0 | **inverted in shell**: SIGPIPE is not ignored, a writer dies with 141 (measured: `sh -c 'kill -PIPE $$'` -> 141 in 11/11 except ksh93u+m 269, yash 397) |
| CLI-06 `:114` | buffered writer, explicit flush | Rust-only (shell builtins are unbuffered per call) |
| CLI-07 `:115` | colour via `NO_COLOR`/`--color`, per-stream TTY | translates (`[ -t 1 ]`, `${NO_COLOR+x}`) |
| CLI-08 `:116` | progress to stderr, off when not a TTY or `CI` set | translates |
| CLI-09 `:117` | prompt only if stdin is a TTY; `--yes`; `CI` truthy = non-interactive | translates (`[ -t 0 ]`) |
| CLI-10 `:118` | global flags defined once | Rust-only (clap) |
| CLI-11 `:119` | no secret in flag value or plain env var | translates (argv shows in `ps`; `curl | sh` stdin) |
| CLI-12 `:120` | help text ASCII only (PS 5.1 mojibake) | translates; `ocx/.claude/rules/quality-cli-help.md:94` source |
| CLI-13 `:121` | config/cache/data paths from `ProjectDirs`, prefixed env vars | translates as XDG logic with `$HOME` fallbacks; Windows differs |
| CLI-14 `:122` | completions generated from the parser | needs shell mechanism: per-shell emitters (the multi-shell target) |
| CLI-15 `:123` | precedence flags > env > project > user > system | translates |
| CLI-16 `:124` | print something within ~100 ms for network I/O | translates |

Measured status facts (`F/sig.sh`, `matrix.sh posix`, 11 interpreters):

| Probe | dash, ash x2, mksh, posh, bash 3.2/5.2, zsh | ksh93u+m (both) | yash |
|---|---|---|---|
| `sh -c 'kill -TERM $$'; echo $?` | 143 | **271** | **399** |
| `sh -c 'kill -PIPE $$'; echo $?` | 141 | **269** | **397** |
| `sh -c 'exit 300'; echo $?` | 44 (mod 256) | 44 | 44 |
| `sh -c 'exit -1'; echo $?` | 2 | 2 | 2 |
| not found / not executable | 127 / 126 | 127 / 126 | 127 / 126 |

## 5 Fleet AI config about shell

### 5.1 Commands

```sh
# repo list: os.walk /home/mherwig/dev with the task's prune rules, then `git -C <repo> remote get-url origin`, dedupe by remote -> 149 repos
git -C <repo> ls-files --cached --others --exclude-standard     # per repo, minus EXC regex
# AI-config globs: CLAUDE.md, AGENTS.md, .claude/{rules,skills,agents,commands}/, .cursor/, .github/copilot-instructions.md, .agents/{skills,rules}/ ...
# classify 'lore-installed' = .claude|.agents|.cursor/(rules|skills)/<name> where <name> is in the lore catalog (51 names)
```

| Measure | Value |
|---|---|
| Repos (deduped by remote, incl. 94 `ocx-contrib/mirror-*` etc.) | 149; 32 hold AI config |
| AI-config files | 3,739 (excl. grimoire-lore) |
| lore-installed copies | 2,545 |
| native | 1,187 in 30 repos: `.claude/skills` 740, `.claude/rules` 230, `.claude/agents` 92, `.agents/skills` 71, `CLAUDE.md` 36, `AGENTS.md` 13, `.claude/commands` 4, `.github/copilot-instructions.md` 1, `.cursor` 0 |
| Top repos (native) | ocx-marketing 319, grimoire 192, ocx 148, arcana 104, creeptd-ng 67, kate-middlechild 54 |
| native files with any shell-term hit | 294 (raw, noisy: "Bash" is also a tool name) |
| native instruction lines on shell proper (after removing tool-name `Bash`, `ocx.sh`-style domains) | 91 lines, 49 files, 13 repos |

False-positive rate of the first-pass grep: `bash` 514 raw lines, of which a spot-read of 3 files (`creeptd-ng/.claude/agents/*.md`, `parallel-planning.md:30-49`) showed 3/3 are the Claude **Bash tool**, not shell scripting. `.sh` 246 lines: `ocx.sh`, `setup.ocx.sh`, `skills.sh` domains (3/3 spot-read FP). Numbers above use the domain-stripped second pass.

### 5.2 The shell rules that exist (normative lines)

**`quality-bash.md`**, 150 lines, `paths: ["**/*.sh", "**/*.bash"]`, "Project-independent. Shareable." Present in `grimoire`, `index`, `ocx` (byte-identical, md5 `b04695e0`) and `grimoire-vscode` (same content, prettier-reformatted: quote style and table alignment). `quality-core.md:168|169|171|267` in 8 repos points at it. Normative lines:

| Line | Text |
|---|---|
| `grimoire/.claude/rules/quality-bash.md:19-25` | "Every Bash script in production MUST start with: `#!/usr/bin/env bash` / `set -euo pipefail` / `IFS=$'\n\t'`" |
| `:30` | "`IFS=$'\n\t'`: prevents word-splitting on spaces — critical for filenames with spaces" |
| `:47` | Block 1: "Missing `set -euo pipefail` — silently continues after errors." |
| `:53` | Block 7: "Piping into `while read` ... Use process substitution: `while read; do …; done < <(cmd)`." |
| `:55` | Block 9: "`[ ]` instead of `[[ ]]` for string comparisons in Bash" |
| `:67` | Warn: "`pipefail` + `grep` gotcha ... Use `|| true` when intentional, comment it" |
| `:94,100,101` | "Run at `shellcheck -S warning`"; "Never suppress: SC2086, SC2068, SC2046"; "`shfmt -i 4 -ci`" |
| `:107-111` | table "Use POSIX sh when ... Cross-platform portability (BSD, **macOS `/bin/sh` is dash**)" |
| `:113` | "CI/CD (GitHub Actions): Bash always available — use it." |
| `:117-123` | bats-core for smoke tests, ShellSpec when mocking is needed |
| `:130` | review checklist: "Script starts with `#!/usr/bin/env bash`, `set -euo pipefail`, `IFS=$'\n\t'`" |

**`www-setup/.claude/rules/` (the multi-shell installer repo; 3 rules, no `paths`, loaded always in that repo):**

| File:line | Normative text |
|---|---|
| `installers.md:1,3-9` | Thin-bootstrap contract: detect, resolve, download+verify, hand off to `ocx self setup` |
| `installers.md:198` | "The verification call must sit in **statement position**, not inside a command substitution or an `if` condition: POSIX `$(…)` runs in a subshell, and fish demotes `exit` inside a conditional's command to a plain return" |
| `installers.md:214-221` | stdout silent on success; stderr for all banners (`BIN_DIR=$(./install.sh \| tail -n1)`) |
| `installers.md:224-236` | exit codes 0,1,2,3,4,5,6,7 (**not** the sysexits table) |
| `installers.md:238-246` | accepted divergence: pwsh binder exits 1 on unknown flag |
| `installers.md:264-268` | five dialects: **sh** "POSIX (bash/zsh/ash/ksh/dash)"; **pwsh** "Windows (PS 5.1 Desktop floor + 7) AND Linux/macOS (PS 7+)"; **nu** "env-driven" (no positional args over `curl \| nu`); **fish** "`version` is a reserved fish var"; **elvish** "`?()`/`try` wrap every external" |
| `installers.md` (parity) | "Whenever you change one, change the others in the same PR" |
| `testing-bash.md:203-210` | "**macOS / bash-3.2 safety.** ... NO negative array subscripts ... No `declare -A`, `mapfile`, or `${var,,}`/`${var^^}`. ... never bare `sha256sum` (macOS ships `shasum`)" |
| `testing-pwsh.md:131-135` | "written 5.1-safe (no ternary, `??`, `&&`/`||` chains, `$IsWindows` ...)" |
| `testing-pwsh.md:56-63,122` | `Set-StrictMode` + 5.1 `.Response`-less exception crash in the redirect path; `$IsWindows` undefined under 5.1, local `$isLinux`/`$isMac` collide with PS Core read-only auto-vars |

**Other fleet shell guidance (one line each):**

| File:line | Text |
|---|---|
| `ocx/.claude/rules/subsystem-tests.md:382-397` | "Five shells host a per-prompt hook: bash, zsh, fish, PowerShell, and elvish ... `None` only for `Ash \| Ksh \| Dash \| Nushell \| Batch`"; shell-zoo containers (`test/docker/shells.Dockerfile`, Alpine/busybox `shells.alpine.Dockerfile`); macOS/Windows only in weekly `shell-activation-deep.yml` |
| `ocx/.claude/rules/subsystem-cli-commands.md:257`, `subsystem-cli.md:144` | "`--shell=sh` ≡ `--shell=dash` (POSIX strict ...)" |
| `ocx/.claude/rules/subsystem-ci.md:130-132` | "Embedded shellcheck severity floor = `--severity=warning` (`SHELLCHECK_OPTS`) ... matching `shell:shellcheck`" |
| `ocx/.claude/rules/quality-cli-help.md:94` | "Non-ASCII byte in help (Windows PowerShell 5.1 decodes captured completion/`--help` streams under the console codepage and mojibakes it)" |
| `grimoire/.claude/rules/vendor-capability-watchlist.md:300` | Codex runs hooks via `$SHELL -lc`; a fish/nu `$SHELL` "**cannot execute the guard at all**"; POSIX one-liner does not help |
| `grimoire/.claude/rules/meta-ai-config.md:248,259` | "**Hook safety**: no `set -e` in PostToolUse hooks" |
| `grimoire/.claude/rules/subsystem-cli-commands.md:42` | `grim completions <shell>` emits `bash`, `elvish`, `fish`, `powershell`, `zsh`, "no eval hook, no shell auto-detect" |
| `ocx/crates/ocx_shell/CLAUDE.md` (58 lines) | crate-boundary and exit-code hazards only (WP-32, DEC-23/24/47); **no emitter escaping rules** |

No `.cursor/` rules and a single `.github/copilot-instructions.md`, neither with shell content. `bashism`: 0 lines.

## 6 Fleet tool config

### 6.1 Commands

```sh
git -C <repo> ls-files --cached --others --exclude-standard | python3 -I -   # per repo: .shellcheckrc, .editorconfig, hook configs, PSScriptAnalyzer*.psd1, CI/task files
python3 -I - # content scan of workflow/taskfile/hook/ocx.toml files for shellcheck|shfmt|actionlint|PSScriptAnalyzer|bats|Pester
os.walk census (task prune rules, no dedupe) for *.sh/*.bash/*.zsh/*.ps1/*.psm1/*.fish/*.nu/*.elv and extensionless shebangs
```

### 6.2 Config files

| Artifact | Count | Where |
|---|---|---|
| `.shellcheckrc` | **0** | none in 149 repos |
| `.editorconfig` | 3 first-party (+3 upstream clones) | `creeptd-ng/.editorconfig:1-18` (`[*.rs]`, `[*.{ts,...}]`, `[Makefile]`), `grimoire-vscode/.editorconfig:1-12`, `vscode-ocx/.editorconfig:1-12`. **No `[*.sh]`, no `shell_variant`, no shfmt keys.** shfmt reads indent from the CLI: `shfmt -d -i 4 -ci` in `ocx/taskfiles/shell.taskfile.yml:48`, `grimoire/taskfiles/shell.taskfile.yml:18` |
| `PSScriptAnalyzerSettings.psd1` | 1 | `www-setup/PSScriptAnalyzerSettings.psd1` (excludes PSUseApprovedVerbs, PSUseSingularNouns, PSUseShouldProcessForStateChangingFunctions; all Warning+Error rules otherwise enforced) |
| pre-commit/prek/lefthook | 3 repos | `ocx/.pre-commit-config.yaml` (one hook: `commit-gate`, `scripts/commit_gate.py`), `kate-middlechild/lefthook.yml`, `obere-heide-planer/lefthook.yml`; **none run shellcheck/shfmt** |
| CI/task/config files scanned | 1,070 in 141 repos | |
| Toolchain pins (`ocx.toml`) | `shellcheck = "ocx.sh/shellcheck/shellcheck:0.11"` (ocx, www-setup), `:latest` (rules_ocx, find_ocx), `shfmt = ...:3` (ocx, www-setup) | |

### 6.3 Which repos gate shell code

Scope: 19 repos with first-party shell-family files (246 files; `ls-files` basis, deduped, excl. upstream clones, lore, `ocx-contrib/mirror-*`).

| Tier | Repos (files) | Evidence |
|---|---|---|
| **Source gate** (shellcheck + shfmt over the files) | ocx (129), www-setup (23), grimoire (18), setup-grimoire (9) = 179 files (73%) | `ocx/taskfiles/shell.taskfile.yml:21-48` (`git ls-files '*.sh'` minus two excludes, `shellcheck -S warning`, `shfmt -d -i 4 -ci`); `www-setup/.github/workflows/verify.yml:34-47` (shell job, PSScriptAnalyzer job `:55`, actionlint `:102`); `setup-grimoire/Taskfile.yml:7` (shellcheck, shfmt, actionlint, pwsh PSScriptAnalyzer + Pester) and `.github/workflows/test.yml:79,87,106`; `grimoire/taskfiles/shell.taskfile.yml:6-21` |
| actionlint only (embedded shellcheck over `run:` blocks) | rules_ocx (10), ocx-website (7), ocx-sdk-python (5), find_ocx (4), grimoire-indexer (4), ocx-catalog (3) = 33 files | `ocx.toml` pins actionlint; the `.sh` files themselves are not linted |
| **No gate** | ocx-marketing (9), ocx-mirror (7), oras-www (7), creeptd-ng (4), index (3), arcana (1), fma (1), obere-heide-planer (1), vscode-ocx (1) = 34 files | `ocx-mirror/taskfiles/bazel.taskfile.yml:172` has a `# shellcheck disable=SC2086` comment but no gate |
| PowerShell gate | www-setup, setup-grimoire only (PSScriptAnalyzer + Pester). `ocx/` has 1 `.ps1` ungated; `grimoire` 1; `uv`/mirrors are upstream | |
| Test frameworks | bats: www-setup (`tests/install/*.bats`, vendored submodule), setup-grimoire; Pester: both; shell-zoo matrix: ocx (`test/docker/shells.Dockerfile`, `.github/workflows/shell-activation.yml`, weekly `shell-activation-deep.yml`) | |

Gate defects found while reading:

- `grimoire/taskfiles/shell.taskfile.yml:12-21` **skips silently** ("shellcheck not installed — skipping", exit 0), uses `echo "$files" | xargs shellcheck` (breaks on whitespace in names) and default shellcheck severity (info), while ocx uses `-S warning`.
- `ocx/taskfiles/shell.taskfile.yml:21` globs only `'*.sh'` and excludes `website/src/_scripts/` (73 `.sh` files, mostly docs samples). `.bash`, `.zsh` and extensionless scripts are outside the gate. The 22 extensionless `#!/bin/sh` files in `ocx/.ocx/toolchain/shells/` are generated and git-ignored (fine).
- No `.shellcheckrc` means the severity and `-s` dialect live in task flags and `SHELLCHECK_OPTS`, not next to the code; an editor sees different findings than CI.

### 6.4 Fleet shell census (reconciling the frame)

`os.walk` with the task prune rules (no remote dedupe, no repo filtering): `.sh` 647, `.ps1` 25, `.bash` 5, `.fish` 6, `.nu` 3, `.psm1` 2, `.elv` 1, `.zsh` 1; extensionless with an `sh` shebang 393 (0 bash/zsh/fish/nu/pwsh). Of the 647 `.sh`: lore 136 (research scratch), `rust-devcontainer-cli/reference-cli` 130 (upstream), `uv` 29 (upstream), `ocx` 212 (of which 73 `website/src/_scripts`, 84 git-ignored). The frame's ~1450 / ~1100 overcount by 2.2x / 2.8x (consistent with memory `fleet-counts-exclude-worktrees.md`).

The extensionless `#!/bin/sh` mystery is answered:

```
$ head -4 ocx/.ocx/toolchain/shells/default/bin/git-cliff
#!/bin/sh
# ocx-toolchain-trampoline
unset OCX_GLOBAL OCX_PROJECT
exec "${OCX_BINARY_PIN:-$__ocx_binary}" --project '/home/mherwig/dev/ocx' exec -- "${0##*/}" "$@"
```

376 of 393 are such trampolines (generated per repo by `ocx`, git-ignored), the rest are `.ocx-mirror/` package contents. They are `sh` on purpose, use `${0##*/}` and `exec`, and need no human guidance.

## 7 Gaps (axis)

See the closing [Gaps](#gaps) section; every frame concern with no existing config is listed there.

## Smells (ranked)

1. **Never-matching-glob convention covers 19 of 155 depth files (12.3%).** 136 files (2.87 MB, including all go/nix/rust/python/typescript depth) autoload in every adopter session by the repo's own measurement (memory `rules-dir-autoloads-recursively.md`). The checker neither requires nor tests it (§1.6, §2.2). A shell set copying go/nix would reproduce the leak.
2. **The verification-command lints skip fenced blocks.** 628 blocks / 2,977 lines are unlinted; 13 blocks have `<placeholder>` redirections that shellcheck cannot parse (SC1073) and paste-fail; ~5 of 6 sampled glob candidates abort under zsh on no match (§2.3, §3.3).
3. **Fleet `quality-bash.md` is wrong or over-broad in four repos** (byte-identical copies, drift risk): "macOS `/bin/sh` is dash" (`:110`; read-only, contradicts H7); mandates `set -euo pipefail` + `IFS=$'\n\t'` on every `**/*.sh` and blocks `[ ]` in favour of `[[ ]]` (`:47,55`), which cannot be run by dash/busybox/posh while the same repo's installers target POSIX sh; and prescribes `args=(); cmd "${args[@]}"` (`:81-86`) under `set -u`, which **fails on bash 3.2/4.0/4.2** (measured, `F/h2.sh`: `bash: args[@]: unbound variable`, rc 1).
4. **grimoire's shell gate skips when the tools are absent** (`taskfile` `:12-21`, exit 0). A gate that can silently not run is the CORE-02 failure the catalog itself names.
5. **Only 4 of 19 shell-owning repos run a source gate; 34 files in 9 repos have none;** no `.shellcheckrc` anywhere, so dialect/severity is carried in task flags; ocx's gate omits `.bash`/`.zsh`/extensionless.
6. **497 rule rows start with `rg`, 232 blocks use `grep -r --include`, 108 `xargs -r`.** None of the indexes declares `rg` as a dependency; busybox 1.37 fails the `--include` family (exit 2). The catalog's verification commands assume a GNU+ripgrep workstation.
7. **Two exit-code taxonomies in one product family.** Rust pinned table (64-82, `cli-contract.md:31-47`) vs installers (2-7, `www-setup/.claude/rules/installers.md:224-236`); usage = 64 vs 2. A shell set must say which wins for scripts and for installers.
8. **Unreliable CI-shell sentence in a published skill** (`skills/nix-flake-adopt/references/ci-and-readme.md:4`: `bash --noprofile --norc -eo pipefail` "the shell GitHub Actions uses"). Only true for explicit `shell: bash` (unverified here).
9. **ocx_shell has no AI config on the escaping surface.** `crates/ocx_shell/CLAUDE.md` (58 lines) covers crate boundaries only; the escaping, hook-registration matrix (`subsystem-tests.md:382`) and rc-block rules live scattered in subsystem rules.

## Patterns worth encoding

1. **`${arr[@]+"${arr[@]}"}`** for any array that can be empty under `set -u`: already in `rules/swift-quality/checks/tsan-check.sh:32`; measured clean on bash 3.2-5.3 (`F/idiom.sh`) and required because plain `"${a[@]}"` fails on 3.2/4.0/4.2 (bash >= 4.4 fixed).
2. **`set -u` + explicit exit-status handling instead of `set -e`** for check scripts (9/9 shipped checks): fail closed by status, never by stderr (`k07.sh:8-11`, `:108-110`).
3. **Exit-status table in the script header** (`never-gate.sh:7-9`: "Exit: 0 clean; 123 ...; 65 ...; 66 ...") with sysexits-aligned 64/65/66 and 123 for "finding behind xargs".
4. **`trap 'rm -f "$a" "$b"' EXIT` plus bare `mktemp`** (`never-gate.sh:22`), no `mktemp -t`/templates.
5. **`find ... -print0 | xargs -r -0 ...`** and `git ls-files -z` for file lists (`swift-quality.md:31-55`), with "123 = a finding behind xargs".
6. **Watched-red-and-green verification cells** with tool/version and date (GO-CORE-02/03); a column for implementation/floor (`Floor / impl`, nix).
7. **`! pipeline` is errexit-exempt; `pipefail` converts SIGPIPE to a failure** (CMK-CORE-05). Rule: no early-exit reader after a producer under `pipefail`; use `grep -rq PATTERN dir`.
8. **Statement-position checks** (`www-setup installers.md:198`): any `exit`/verification must not sit in `$(…)`, an `if` condition or a pipeline stage; reproduced in fish where `exit` in a conditional becomes a return.
9. **Installer and macOS discipline (www-setup `installers.md:214-221`, `testing-bash.md:203-210`):** stdout silent on success, prose on stderr; five-way parity in one PR; bash 3.2 subset (no negative subscripts, `declare -A`, `mapfile`, `${v,,}`; `shasum -a 256`).
10. **Set layout copy-paste:** `rules/shell-quality.md` + `rules/shell-quality/*.md` (never-glob), `shell-quality/checks/*.sh`, `skills/<name>/SKILL.md` + `references/`, `bundles/shell-essentials.toml` untagged + `code-docs`/`code-docs-cleanup`, `publish.toml` + `docs/*.md` + `assets/lore-shell.svg`, `taskfile.yml` block.

## Contradictions of the frame

| Frame statement | Measured |
|---|---|
| "No shell set exists in the catalog ... Existing AI config that already touches this domain ... `checks/*.sh` in the swift-quality **and code-docs** rules" (frame §Existing AI config) | Shell checks exist **only in swift-quality** (9 scripts). `rules/code-docs/checks/` is 5 Python files, 0 shell. The fleet, however, **does** have shell AI config the frame omits: `quality-bash.md` in 4 repos and 3 www-setup rules (272/232/182 lines) with a 5-shell installer contract (§5). The shell set must reconcile with these, not start blank |
| Fleet "~1450 `*.sh` ... ~1100 extensionless `#!/bin/sh` ... origin unknown" | 647 `.sh` and 393 extensionless by the task's prune rules; 376 of the 393 are ocx trampolines (generated, git-ignored). First-party shell-family files: 246 in 19 repos |
| H2 "`set -euo pipefail` is cargo-culted" | Split. The **fleet rule mandates it** on every `.sh` (`quality-bash.md:19-25,47`) — supports H2. But the catalog's own 9 checks use `set -u` only, 0/9 `-e`, deliberately — contradicts "most scripts". The measured traps (`local x=$(false)` reached, `if f` disables `-e` inside `f`, empty array under `-u`) hold on every bash, except the array one, which is version-gated (< 4.4) |
| Artifact table: `shell-quality` glob `**/*.sh`, `**/*.bash`, `**/*.zsh`, `**/*.ksh`, `**/.shellcheckrc` | The checker needs a live `--root` and `--allow-absent` for `.zsh`, `.ksh`, `.shellcheckrc` (only www-setup is a near-complete root); a brace form is reported dead; `code-docs` already loads on 5 shell extensions; **a shebang-only script can never be reached by any glob form** |
| Q1 "POSIX sh for installers ... bash 3.2-compatible if macOS" | The fleet's own `quality-bash.md` (loaded on `**/*.sh`) blocks `[ ]`, prescribes process substitution and `set -euo pipefail` for every `.sh`; it contradicts Q1 unless the shell set supersedes it. www-setup's sh installer is "POSIX (bash/zsh/ash/ksh/dash)" |
| H7 "`/bin/sh` is bash 3.2 in POSIX mode" (macOS) | The fleet rule asserts "macOS `/bin/sh` is dash" (`quality-bash.md:110`). One of them is wrong; no macOS host here, so both are read-only; the frame's version matches Apple's documented default |
| Frame fixed "taskfile `cmds` run under mvdan/sh" as a CI-shell fact | Fleet taskfile `cmds` embed `command -v`, `xargs`, `$(…)`, `git ls-files` pipelines (grimoire `shell.taskfile.yml:10-21`): untested against mvdan/sh in this audit |
| Implicit: depth-file never-glob is the catalog convention | 12.3% adoption (19/155) |
| "frontmatter (globs/paths, description, metadata)" (task) | Rules have no `description` and no `metadata`; `paths`, `summary`, `keywords`, `license`, `repository` are top-level. Skills use `description` + `metadata.{summary,keywords}`. `check-artifacts.py:591-599` enforces the rule form |

## Gaps

No existing config anywhere (catalog or fleet) for:

1. Extensionless / shebang-only script scoping (no glob form, no hook, no skill trigger).
2. `.shellcheckrc` policy (dialect `shell=`, `enable=`, severity); 0 files.
3. shfmt config in `.editorconfig` (`shell_variant`, `binary_next_line`, `switch_case_indent`); 0.
4. Any rule or skill for PowerShell scripting: 5.1 vs 7, encoding/BOM, `$ErrorActionPreference`, native exit codes, PSScriptAnalyzer settings (only www-setup's local rule and one psd1).
5. fish, nushell, elvish scripting idioms and version churn (only the www-setup installer rule and ocx subsystem rules, project-specific).
6. zsh scripting rules (word splitting, 1-based arrays, `nomatch`, `emulate`); the catalog's own sh blocks break there in ~5% of cases, unguarded.
7. POSIX sh dialect floor and the per-implementation matrix (dash, busybox ash, mksh, ksh93, yash, posh, FreeBSD sh); `set -o pipefail` fatality in dash/posh, signal-status variance (143 / 271 / 399).
8. Bash version matrix (3.2 through 5.3) and macOS `/bin/bash` 3.2 policy beyond www-setup's bats rule.
9. Userland portability table (GNU vs BSD vs busybox vs uutils): `sed -i`, `readlink -f`, `date -d`, `stat`, `mktemp`, `xargs -r`, `grep -P`; only one Bats helper (`server_sha256`).
10. Emitting shell code for many shells: escaping per shell, rc/profile locations, hook models, completions registration, deactivation. `ocx_shell/CLAUDE.md` has none; the emitter rules are scattered.
11. Installer pair (`install.sh` + `install.ps1`) as a reusable skill: only `www-setup/.claude/rules/installers.md` for one project.
12. CI shells: GitHub Actions default-shell behaviour (`bash -e {0}` vs `-eo pipefail` vs pwsh), `$GITHUB_PATH`/`$GITHUB_ENV` mechanics, taskfile/mvdan semantics.
13. A portable verification-command dialect for the catalog itself (POSIX grep, no `rg`, quoted globs, no `<placeholder>` operands) and a fenced-block lint in the checker.
14. A rule that pins one exit-status vocabulary for scripts (sysexits 64-78 vs installer 2-7) and the 128+n caveat.

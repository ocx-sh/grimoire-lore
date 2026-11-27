---
title: Which grim clients load path-scoped rules and read AGENTS.md
program: product
topic: marketing-positioning-record
worker: followup-q1
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 20
---

# Which grim clients load path-scoped rules and read AGENTS.md

## Question

Which of grim's target clients load path-scoped rules, and which read AGENTS.md, so the MKT-POS-12 fallback line ("Before editing README.md, CHANGELOG.md, a manifest description or the site head, read `.agents/positioning.toml`.") is known to reach them?

## Answer

Of the 18 named clients, 16 read a repository-root `AGENTS.md` under default settings. The exceptions are Gemini CLI (opt-in setting) and OpenClaw (a daemon workspace, not the repository). Claude Code and Zed read it only under a condition. Seven clients load path-scoped rules: Claude Code, Copilot, Cursor, Kiro, Antigravity, Qoder and Cline. The other eleven have no documented glob-scoped rule file, so the `AGENTS.md` line is the only route to them. Two clients need an extra step before the line reaches them: Claude Code (a `CLAUDE.md` hides `AGENTS.md` unless it imports it) and Gemini CLI. One needs a caution: Zed reads only the first matching file of a nine-name list.

The client list comes from grim's own enum, `grimoire-rs/grimoire/src/install/client_target.rs:69-138` (grimoire checkout at commit `72d3fce1`, 2026-11-24). It names 19 values. `agents` is a vendor-neutral pool and not a product, which leaves 18 products. The count is measured in the "Enum count" section below. Each client claim is taken from the vendor's own documentation, fetched 2026-11-27. None of the pages carries a date. Every quoted sentence was byte-checked against the raw page, see "Quote check" below.

## Findings

Columns: "Path-scoped" is a documented rule file that loads only when a matching file is in play. "Reads AGENTS.md" is a repository-root `AGENTS.md` loaded at default settings. "grim rules" is what grim installs for a `rule` artifact, from each vendor's `kind_support` in the grimoire source (vendor-side claim by the repository, not checked against the vendor here).

| Client | Path-scoped | Reads AGENTS.md | grim rules | Primary source, quoted |
|---|---|---|---|---|
| Claude Code | Yes, `paths:` frontmatter | Conditional (see below) | Native | [memory docs](https://code.claude.com/docs/en/memory): "By default, Claude reads `AGENTS.md` only when you have no `CLAUDE.md` in your working directory or above it." Also: "Rules can be scoped to specific files using YAML frontmatter with the `paths` field." |
| OpenCode | No | Yes | Degraded | [rules](https://opencode.ai/docs/rules/): "Place `AGENTS.md` in the directory where its guidance should apply." No rule files scoped to file types are documented. |
| GitHub Copilot | Yes, `applyTo` | Yes | Native (transformed) | [repository instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions): "You can create one or more `AGENTS.md` files, stored anywhere within the repository." Also: "path-specific custom instructions are only supported for Copilot cloud agent and Copilot code review." [CLI page](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions): "Path-specific instructions are included only when their `applyTo` value matches a file that Copilot CLI is working with." [VS Code](https://code.visualstudio.com/docs/copilot/customization/custom-instructions) lists "`.github/copilot-instructions.md` or `AGENTS.md`". |
| Codex | No | Yes | Declined | [AGENTS.md guide](https://learn.chatgpt.com/docs/agent-configuration/agents-md) (redirected from developers.openai.com): "Starting at the project root (typically the Git root), Codex walks down to your current working directory." Cap `project_doc_max_bytes`, default 32 KiB. No glob rules documented. |
| Cursor | Yes, `globs` | Yes | Native (`.mdc`) | [rules](https://cursor.com/docs/context/rules): "Apply to Specific Files: When file matches a specified pattern". "Cursor supports AGENTS.md in the project root and subdirectories." |
| Kiro | Yes, `fileMatch` | Yes | Native (steering) | [steering](https://kiro.dev/docs/steering/): "fileMatch: Files are automatically included only when working with files that match the specified pattern." "AGENTS.md files do not support inclusion modes and are always included." |
| Junie | No (rules are concatenated) | Yes | Degraded, project scope | [guidelines](https://junie.jetbrains.com/docs/guidelines-and-memory.html): second location is "`AGENTS.md` file in the project root, combined with `.junie/playbook.md` and every `.junie/rules/*.md` file". No scoping key documented. |
| Gemini CLI | No (directory-based JIT only) | **No, opt-in** | Declined | [GEMINI.md](https://geminicli.com/docs/cli/gemini-md/): "While `GEMINI.md` is the default filename, you can configure this in your `settings.json` file." The example lists `"AGENTS.md"`, but the page does not say it loads by default. |
| Zed | No | Conditional (first match) | Declined | [rules](https://raw.githubusercontent.com/zed-industries/zed/main/docs/src/ai/rules.md): "The first matching file is used:" over `.rules`, `.cursorrules`, `.windsurfrules`, `.clinerules`, `.github/copilot-instructions.md`, `AGENT.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, in that order. |
| Amp | No (`globs` only for @-mentioned files) | Yes | Declined | [AGENTS.md](https://ampcode.com/docs/customize/agents-md): "Amp looks in `AGENTS.md` files for guidance on codebase structure, build/test commands, and conventions." "Mentioned files with `globs` will only be included if Amp has read a file matching any of the globs". |
| Antigravity | Yes, `trigger: glob` | Yes | Native per `vendor_antigravity.rs` test `kind_support_is_native_for_every_kind`; the enum doc comment in `client_target.rs` says "rules declined". The two disagree inside grimoire | [rules](https://antigravity.google/docs/rules): "You can place an AGENTS.md or GEMINI.md file—or a .agents/rules/ directory—in your workspace folder". glob: "Automatically activates when the agent interacts with files matching any comma-separated pattern in globs:". |
| Cline | Yes, `paths` | Yes (root) | Declined by grim | [rules](https://docs.cline.bot/customization/cline-rules): "Currently, `paths` is the supported conditional. It takes an array of glob patterns". the supported-directories table lists `AGENTS.md` with location "`AGENTS.md`, `~/.agents/AGENTS.md`" and the note "Standard format for cross-tool compatibility". |
| Droid | No | Yes | Declined | [AGENTS.md](https://docs.factory.com/cli/configuration/agents-md): compatible filenames "include `AGENTS.md`, `agents.md`, `Agents.md`, `CLAUDE.md`, and `Claude.md`"; "Nested project files refine root project files for a specific directory tree." No glob scoping. |
| Goose | No | Yes | Declined | [goosehints](https://goose-docs.ai/docs/guides/context-engineering/using-goosehints): "The default is `["AGENTS.md", ".goosehints"]`" and "goose looks for AGENTS.md then .goosehints files by default". The source agrees on the set (see "Goose conflict" below). Nested files load when goose accesses those directories. |
| Warp | No | Yes | Declined | [rules](https://docs.warp.dev/agents/capabilities/rules.md): "Warp uses `AGENTS.md` as the default project rules file." "If both `WARP.md` and `AGENTS.md` exist in the same directory, `WARP.md` takes priority." No path scoping syntax. |
| OpenClaw | No | **No (not the repository)** | Declined | [agent workspace](https://docs.openclaw.ai/concepts/agent-workspace): `AGENTS.md` is "Operating instructions for the agent and how it should use memory", loaded from the agent's own workspace. grim installs OpenClaw skills at global scope only, so a repository `AGENTS.md` is not its input. |
| Kilo | No | Yes | Declined | [AGENTS.md](https://kilo.ai/docs/customize/agents-md): "AGENTS.md is loaded automatically." "AGENTS.md itself cannot be individually disabled — it is always loaded if present." Falls back to `AGENT.md`. |
| Qoder | Yes, `paths` | Yes | Native | [CLI memory](https://docs.qoder.com/en/cli/memory): "Within a Trusted Workspace, searches upwards from the current Workspace directory for `AGENTS.md`". `paths`: "Specifies the file scope where the rule applies, behaving equivalently to `trigger: glob` + `glob`." |

Two facts from the Claude Code page matter for this fleet. The page says that direct `AGENTS.md` reading "requires Claude Code v2.1.277 or later". It also says a repository with both files gets "Your `CLAUDE.md` files only", unless `CLAUDE.md` imports `AGENTS.md`.

### Enum count

Command, run 2026-11-27:

```
cd /home/mherwig/dev/grimoire-rs/grimoire; git rev-parse --short HEAD; sed -n 69,150p src/install/client_target.rs | grep -cE '^    [A-Z][A-Za-z]+,$'; sed -n 69,150p src/install/client_target.rs | grep -E '^    [A-Z][A-Za-z]+,$' | tr -d ' \n'
```

Output:

```
72d3fce1
19
Claude,OpenCode,Copilot,Codex,Cursor,Kiro,Junie,Gemini,Zed,Amp,Agents,Antigravity,Cline,Droid,Goose,Warp,OpenClaw,Kilo,Qoder,
```

19 variants, one of them `Agents` (its doc comment reads "Not a product"), so 18 products. The enum spans lines 69 to 138 (the earlier "69-135" citation stopped before `Kilo` and `Qoder`).

### Fleet check

Command, run 2026-11-27 from `/home/mherwig/dev` (quoted variables, no `|| echo 0`, so one line per directory):

```
for d in ocx-sh/* grimoire-rs/*; do [ -d "$d" ] || continue; a=n; c=n; i=0; [ -f "$d/AGENTS.md" ] && a=y; [ -f "$d/CLAUDE.md" ] && c=y; [ -f "$d/CLAUDE.md" ] && i=$(grep -c -E '^@AGENTS\.md' "$d/CLAUDE.md"); z=""; for f in .rules .cursorrules .windsurfrules .clinerules .github/copilot-instructions.md AGENT.md; do [ -e "$d/$f" ] && z="$z $f"; done; printf '%s agents=%s claude=%s import=%s zedhide=[%s]\n' "$d" $a $c "$i" "${z# }"; done
```

Output, verbatim:

```
ocx-sh/catalog agents=y claude=y import=1 zedhide=[]
ocx-sh/conventions agents=y claude=y import=1 zedhide=[]
ocx-sh/devcontainer-features agents=y claude=y import=1 zedhide=[]
ocx-sh/e2e-index agents=n claude=n import=0 zedhide=[]
ocx-sh/grimoire-lore agents=n claude=n import=0 zedhide=[]
ocx-sh/index agents=n claude=y import=0 zedhide=[]
ocx-sh/indexbot agents=n claude=y import=0 zedhide=[]
ocx-sh/ocx agents=y claude=y import=1 zedhide=[]
ocx-sh/ocx-mirror agents=y claude=y import=1 zedhide=[]
ocx-sh/rules_ocx agents=y claude=y import=1 zedhide=[]
ocx-sh/website agents=y claude=y import=1 zedhide=[]
ocx-sh/www-setup agents=n claude=y import=0 zedhide=[]
grimoire-rs/grim-gui agents=y claude=y import=1 zedhide=[]
grimoire-rs/grim-mirror agents=y claude=y import=1 zedhide=[]
grimoire-rs/grimoire agents=y claude=y import=1 zedhide=[]
grimoire-rs/indexer agents=n claude=y import=0 zedhide=[]
grimoire-rs/vscode agents=y claude=y import=0 zedhide=[]
```

Reading: 11 repositories have an `AGENTS.md`; 10 of them import it into `CLAUDE.md`; `grimoire-rs/vscode` has both files and no import. No fleet repository holds any of the Zed-hiding files (`.rules`, `.cursorrules`, `.windsurfrules`, `.clinerules`, `.github/copilot-instructions.md`, `AGENT.md`), so the Zed first-match caution does not fire anywhere in the fleet today. Six repositories (e2e-index, grimoire-lore, index, indexbot, www-setup, indexer) have no `AGENTS.md`; four of those have a `CLAUDE.md` with no import, which the MKT-POS-12 check skips because it has no `AGENTS.md` to import.

The "7 lines" claim, measured:

```
$ wc -l grimoire-rs/grimoire/CLAUDE.md; cat grimoire-rs/grimoire/CLAUDE.md
7 grimoire-rs/grimoire/CLAUDE.md
# CLAUDE.md

Project context lives in [`AGENTS.md`](./AGENTS.md) — one file, every
agent. **Edit that file, never this one**; this is only the Claude Code
import hook.

@AGENTS.md
```

### Verification commands, run

1. Claude Code import (MKT-POS-12 new check), run in every repository that has an `AGENTS.md`:

```
cd "$d"; ( [ ! -f CLAUDE.md ] || grep -q -E '^@AGENTS\.md' CLAUDE.md ) && echo PASS || echo FAIL
```

Output across the fleet (the repositories without `AGENTS.md` are skipped):

```
ocx-sh/catalog PASS
ocx-sh/conventions PASS
ocx-sh/devcontainer-features PASS
ocx-sh/ocx PASS
ocx-sh/ocx-mirror PASS
ocx-sh/rules_ocx PASS
ocx-sh/website PASS
grimoire-rs/grim-gui PASS
grimoire-rs/grim-mirror PASS
grimoire-rs/grimoire PASS
grimoire-rs/vscode FAIL
```

The seeded fail is real, not asserted: `grimoire-rs/vscode` has `CLAUDE.md` without the import and prints FAIL. The positioning line itself is absent everywhere, as expected before the rule is applied: `grep -c -F '.agents/positioning.toml' AGENTS.md` prints `0` for both `grimoire-rs/vscode` and `grimoire-rs/grimoire`.

2. Gemini settings check. No fleet repository ships `.gemini/settings.json`:

```
$ find ocx-sh grimoire-rs -maxdepth 3 -path '*/.gemini/settings.json'
$
```

(empty output). So the check was run on scratch files in `~/.cache/research-lang/exemplars/product/wave2/q1/gem/`:

```
$ echo '{"context":{"fileName":["GEMINI.md"]}}' > .gemini/settings.json
$ python3 -I -c "import json;v=json.load(open('.gemini/settings.json')).get('context',{}).get('fileName',[]);v=[v] if isinstance(v,str) else v;assert 'AGENTS.md' in v"
AssertionError
seeded-fail exit=1
$ echo '{"context":{"fileName":["GEMINI.md","AGENTS.md"]}}' > .gemini/settings.json
$ python3 -I -c "(same)"
seeded-pass exit=0
```

3. Zed check. The first form (`ls ... prints nothing`) cannot signal by exit code, because `ls` exits 2 on missing files. The check is therefore written as an empty-output test and was run both ways in `.../q1/zed/`:

```
[ -z "$(ls .rules .cursorrules .windsurfrules .clinerules .github/copilot-instructions.md 2>/dev/null)" ] && echo PASS || echo FAIL
```

Output: clean directory prints `clean PASS`; after `touch .cursorrules` it prints `seeded FAIL`. On the fleet the `zedhide=[]` column above is empty for all 17 directories.

### Quote check

Every quoted sentence in the table was checked against the raw page, not the fetch tool's summary. Command: `curl -sL -A "Mozilla/5.0"` each of the 19 URLs into `~/.cache/research-lang/exemplars/product/wave2/q1/pages/` (all 19 returned HTTP 200), strip tags, unescape entities, collapse whitespace, then `python3 -I` substring test of 33 quoted fragments. Result: 32 `FOUND`, 1 `MISSING`. The missing one was the Cline sentence "AGENTS.md is supported at the project root and globally", which the small-model summary had paraphrased. The raw page says, in its supported-directories table, `AGENTS.md` at "`AGENTS.md`, `~/.agents/AGENTS.md`" with "Standard format for cross-tool compatibility"; the Cline row above now quotes that. Raw text of the page: [Cline rules](https://docs.cline.bot/customization/cline-rules). The Claude Code, Gemini CLI and Goose passages were also read in full context (below).

Operative passages, raw:

- Claude Code, [memory docs](https://code.claude.com/docs/en/memory), undated, fetched 2026-11-27: "Reading AGENTS.md directly requires Claude Code v2.1.277 or later. In some sessions Claude can't read AGENTS.md, so import it from a CLAUDE.md there instead." and, in the page's table, "An AGENTS.md and a CLAUDE.md or CLAUDE.local.md in your working directory or above it" gives "Your CLAUDE.md files only", while "A CLAUDE.md that already imports AGENTS.md" gives "Your CLAUDE.md, with AGENTS.md included through the import". A `Project instructions` setting can change the default.
- Gemini CLI, [GEMINI.md page](https://geminicli.com/docs/cli/gemini-md/), undated, fetched 2026-11-27: "While GEMINI.md is the default filename, you can configure this in your settings.json file. To specify a different name or a list of names, use the context.fileName property." with the example `{ "context": { "fileName": ["AGENTS.md", "CONTEXT.md", "GEMINI.md"] }}`.

### Goose conflict, settled by a second primary source

A search result had listed a block/goose pull request with default `[".goosehints"]`. The docs page ([goosehints](https://goose-docs.ai/docs/guides/context-engineering/using-goosehints), undated, fetched 2026-11-27) says "goose looks for AGENTS.md then .goosehints files by default" and "The default is [\"AGENTS.md\", \".goosehints\"]". The current source, [block/goose `load_hints.rs`](https://raw.githubusercontent.com/block/goose/main/crates/goose/src/hints/load_hints.rs) on `main`, fetched 2026-11-27, lines 16 to 24:

```
Config::global()
    .get_param::<Vec<String>>("CONTEXT_FILE_NAMES")
    .unwrap_or_else(|_| {
        vec![
            GOOSE_HINTS_FILENAME.to_string(),
            AGENTS_MD_FILENAME.to_string(),
        ]
    })
```

Both files are in the default set, so a root `AGENTS.md` is read by default. The docs list the names in the opposite order from the code; the order does not matter for this rule. The pull-request result conflicts with both primary sources; I did not open it, so I treat it as superseded by the current source.

### What the clients do with the line

The line says "read `.agents/positioning.toml`". That is a path any client with file-read tools can follow. Reading `AGENTS.md` and following a path inside it is the same mechanism for every client in the table, but I did not run any client to confirm it follows a pointer line. That is a documented-load finding, not an obeyed-instruction finding.

## Effect on the ruleset

**MKT-POS-12: change.** The rule text for non-Claude clients now names the exceptions. New text of the second sentence and a new third sentence:

> For every other client, add this line to the repository's `AGENTS.md`: "Before editing README.md, CHANGELOG.md, a manifest description or the site head, read `.agents/positioning.toml`." If a `CLAUDE.md` exists, it must import `AGENTS.md` with `@AGENTS.md`. If the repository targets Gemini CLI, set `context.fileName` in `.gemini/settings.json` to include `AGENTS.md`.

Rationale to append: "16 of 18 grim clients read a root `AGENTS.md` by default. Claude Code reads it only when no `CLAUDE.md` exists, so a `CLAUDE.md` must import it. Gemini CLI loads `GEMINI.md` unless `context.fileName` says otherwise. OpenClaw reads its own workspace, not the repository. 7 clients load path-scoped rules; 11 have only `AGENTS.md`. Sources: vendor docs fetched 2026-11-27 (followup-q1)."

Verification to append, all mechanical:
- `grep -c -F '.agents/positioning.toml' AGENTS.md` is at least 1 (already in the rule).
- `[ ! -f CLAUDE.md ] || grep -q -E '^@AGENTS\.md' CLAUDE.md` exits 0. Run on the fleet: 10 PASS, `grimoire-rs/vscode` FAIL (output above).
- `[ ! -f .gemini/settings.json ] || python3 -I -c "import json;v=json.load(open('.gemini/settings.json')).get('context',{}).get('fileName',[]);v=[v] if isinstance(v,str) else v;assert 'AGENTS.md' in v"`. Run on scratch files: exit 1 without `AGENTS.md`, exit 0 with it (output above). No fleet repository ships a Gemini config, so on the fleet the check is skipped. Applies only to a repository that ships a Gemini CLI config. Grimoire sources show Gemini installs skills, agents and MCP but declines rules, so the setting is an owner decision for a repository that wants Gemini CLI to read positioning guidance; the check only runs when `.gemini/settings.json` exists.

Severity stays MUST for the Claude Code part and the `AGENTS.md` line. The Gemini part is SHOULD, because the Gemini setting changes how the client loads context for every session in that repository, which is an owner decision (see "What could not be determined").

**MKT-POS-12 Zed caution: new sentence in the rationale, no new check.** Zed uses the first file of nine, so a repository that holds `.rules`, `.cursorrules`, `.windsurfrules`, `.clinerules` or `.github/copilot-instructions.md` hides `AGENTS.md` from Zed. Mechanical check, SHOULD, added to the same rule: `[ -z "$(ls .rules .cursorrules .windsurfrules .clinerules .github/copilot-instructions.md 2>/dev/null)" ]` exits 0, or the owner records the exemption. Run on the fleet: none of the five files exists in any of 17 repositories (`zedhide=[]` above); seeded fail in a scratch directory with `.cursorrules` prints FAIL.

**MKT-POS-12, Verdict 9 and failure mode 6: confirm, with the unverified clause removed.** Verdict 9 says "Whether each of those clients reads that line was not checked either (open question 2)". Replace with the counts above and the three exceptions. Verification: `grep -c -F 'Whether each of those clients reads that line was not checked' marketing-positioning-record.md` prints `0` after the edit, and `grep -c -E '16 of 18' marketing-positioning-record.md` prints at least `1`. Failure mode 6's last sentence ("Whether each client reads that line is unverified") becomes "Read by 16 of 18 clients by default; Claude Code needs the import, Gemini CLI the setting". Verification: `grep -c -F 'Whether each client reads that line is unverified' marketing-positioning-record.md` prints `0` after the edit.

**Open question 2: close.** Answered, with one remaining gap: no client was run.

**Decay table, row 12: change.** Add the 18 vendor pages as sources, fetched 2026-11-27, refresh 6 months. Claude Code's direct `AGENTS.md` reading requires v2.1.277 or later, so refresh on a Claude Code release that changes it. Verification: `grep -c -F 'followup-q1' marketing-positioning-record.md` is at least `1` in the row-12 line, and each of the 18 vendor URLs in the table above appears in the decay table or this artifact's table (`grep -c -E 'https://' followup-q1.md` is at least 18).

**No new rule.** No MKT-POS rule is promoted, demoted or retired by this answer.

## Dated facts

| Fact | Source | Date | Refresh |
|---|---|---|---|
| Claude Code reads `AGENTS.md` only when no `CLAUDE.md`; needs v2.1.277 or later | [code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory) | undated, fetched 2026-11-27 | 6 months or on a Claude Code release |
| Gemini CLI loads `GEMINI.md` by default; `context.fileName` changes it | [geminicli.com/docs/cli/gemini-md/](https://geminicli.com/docs/cli/gemini-md/) | undated, fetched 2026-11-27 | 6 months |
| Zed first-match list of nine names, `AGENTS.md` seventh | raw.githubusercontent.com/zed-industries/zed (docs/src/ai/rules.md, main branch) | undated, fetched 2026-11-27 | 6 months |
| Copilot path-specific instructions: cloud agent and code review per the repository-instructions article; CLI and VS Code per their own pages | docs.github.com, code.visualstudio.com | undated, fetched 2026-11-27 | 6 months |
| Codex AGENTS.md discovery and 32 KiB default cap | learn.chatgpt.com/docs/agent-configuration/agents-md | undated, fetched 2026-11-27 | 6 months |
| Goose default `CONTEXT_FILE_NAMES` is `["AGENTS.md", ".goosehints"]` (docs and `load_hints.rs` on main agree both files are in the default; an older pull-request result listing only `.goosehints` is stale) | [goose-docs.ai](https://goose-docs.ai/docs/guides/context-engineering/using-goosehints), [load_hints.rs](https://raw.githubusercontent.com/block/goose/main/crates/goose/src/hints/load_hints.rs) | undated, fetched 2026-11-27 | 6 months |
| 18 clients plus the `agents` pool | grimoire `src/install/client_target.rs`, commit `72d3fce1` | 2026-11-24 | on any grim release that adds a client |
| grim rule support per client (native, degraded, declined) | grimoire `src/install/vendor_*.rs` `kind_support` | commit `72d3fce1`, 2026-11-24 | on any grim release |

## What could not be determined

- Whether any client actually follows the pointer line. I read documentation only. No client was run, because running one needs a login or a credential, which the limits forbid. Missing: a logged-in session in each client. The `InstructionsLoaded` hook named in MKT-POS-12 exists for Claude Code only, so no equivalent load log is known for the other seventeen.
- Whether Copilot code review reads `AGENTS.md`. The repository-instructions article describes `AGENTS.md` as "Agent instructions, used by AI agents" and does not name code review.
- Path scoping for clients whose pages I could not open: the Amp `globs` text applies to @-mentioned files only, and no Amp page showed a rule-file scoping key. The first Zed docs URL and one Warp URL returned 404, and I used the Zed repository raw file and the `.md` Warp page instead. Goose's older `block.github.io` page also returned 404.
- Whether Antigravity rules are native or declined in grim: `vendor_antigravity.rs` tests say native for every kind, the `ClientTarget::Antigravity` doc comment says "rules declined". Only a grim maintainer can say which is stale.
- Whether grim's source claims about declined rules are current. They are the repository's own statements (commit `72d3fce1`), not checked against each vendor. Cline in particular documents a `paths` frontmatter that grim declines to target, which is grim policy and not a vendor limit.
- Whether an owner wants `.gemini/settings.json` in each repository. That is an owner decision.

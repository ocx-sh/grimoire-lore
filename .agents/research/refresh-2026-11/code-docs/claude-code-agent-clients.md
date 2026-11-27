---
title: Claude Code and agent-client delta for the code-docs pair (path-scoped rules, skills, hooks, comment guidance)
pair: code-docs
date_researched: 2026-11-27
window_start: 2026-09-27
model: sonnet
sources_fetched: 14
---

# Delta, 2026-09-27 to 2026-11-27

Scope: only changes in the window. Claude Code release dates come from the npm registry publish times of `@anthropic-ai/claude-code` (the CHANGELOG carries versions, not dates). Quoted changelog lines are verbatim.

## Summary

- RTE-08 premise changed. Since 2.1.288 (2026-10-02) path-scoped rules also load when Write or Edit touches a matching file, and since 2.1.293 also on single-file `cat`/`head`/`tail`/`sed -n`/`grep` in Bash. The text "load when the agent reads a matching file" is now wrong; "a Write-only edit skips a path-scoped rule" (the RTE-08 rationale) is wrong too.
- RTE-08 hook design still holds, for a narrower reason: the hook output contract is unchanged, and the rule still does not reload after compaction until a matching file is touched again. The hook is a belt-and-braces reminder, not the only loading path.
- Glob semantics gained documented brace expansion with a budget (1,000 expanded patterns, 4 MiB per rule's `paths` list). No change to `**` handling is documented.
- No new or moved install directory in Claude Code. opencode docs now list `.agents/skills` and `~/.agents/skills` next to `.claude/skills`. The census already skips them; only the prose list needs an optional extra example.
- LEN-04 unchanged: Codex comment guidance files show no commit in the window.
- arXiv 2608.20195: only v1 exists (2026-08-20). Numbers unchanged.

## Findings per claim at risk

### 1. routing.md RTE-08, loading behaviour: CHANGED

- Old text: "path-scoped rules load when the agent reads a matching file, not on every tool use, and after compaction only once a matching file is read again" and rationale "A Write-only edit or a compaction skips a path-scoped rule."
- New fact: Claude Code 2.1.288 (published 2026-10-02): "Fixed path-scoped `.claude/rules` and nested CLAUDE.md files not loading when Write or Edit creates or changes a file in their scope (previously only Read loaded them)". 2.1.293: "Fixed path-scoped rules and nested CLAUDE.md files not loading when Claude views a file with a single-file cat, head, tail, sed -n or grep command in the Bash tool instead of the Read tool". Sources: [CHANGELOG](https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md), [memory docs](https://code.claude.com/docs/en/memory): "A path-scoped rule loads when Claude uses the Read, Write, or Edit tool on a matching file. It also loads when Claude views a matching file with a Bash command that counts as a read".
- Changelog and release URLs for the 2.1.288 and 2.1.293 entries: https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md (entries 2.1.288 and 2.1.293), https://www.npmjs.com/package/@anthropic-ai/claude-code/v/2.1.288 and https://www.npmjs.com/package/@anthropic-ai/claude-code/v/2.1.293 (publish dates via https://registry.npmjs.org/@anthropic-ai/claude-code).
- Compaction part: UNCHANGED in substance. Memory docs: "Nested CLAUDE.md files in subdirectories and rules with `paths:` frontmatter load again on demand", and an instruction can vanish if it "is a path-scoped rule that hasn't matched a file since". Related fixes: 2.1.2xx "Fixed a folder's CLAUDE.md being attached a second time after resuming a session or after a compaction" (changelog lines in the 2.1.28x-2.1.29x range) and "Fixed Claude seeing stale MEMORY.md and CLAUDE.md content right after automatic compaction" (2.1.312 range).
- Residual risk: the first edit to a file now loads the rule before the edit result returns, so a post-edit hook is no longer what delivers a rule on a Write-first edit. Its remaining value is re-announcing a rule after compaction and for clients and older Claude Code versions.

Replacement wording for routing.md lines 198-200:
"The RTE-08 reminder, as Claude Code behaves on 2026-11-27 (version 2.1.288 and later): path-scoped rules load when the agent uses Read, Write or Edit on a matching file, or views it with a single-file Bash command such as `cat` or `head`, and after compaction only once a matching file is touched again. The reminder is a PostToolUse hook ..."
Replacement for the RTE-08 rationale first sentence: "A compaction skips a path-scoped rule until a matching file is touched again, and Claude Code before 2.1.288 also skipped it on a Write-only edit."

### 2. routing.md RTE-08, hook output contract: UNCHANGED

[Hooks docs](https://code.claude.com/docs/en/hooks) still show `{"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": "..."}}`, matcher `Edit|Write` matches either tool name, and the string is wrapped in a system reminder. New fact to add as a constraint: `additionalContext` is capped at 10,000 characters per string; overflow is saved to a file and replaced by a path and a 2,000-character preview, and Claude is not told to read it. Rule lists are far below that. Related window changes, none breaking the design: 2.1.328 (`PostToolUse` managed hooks no longer fire for calls refused before they ran); 2.1.319 (PostToolUse hooks run, up to 10 s, on tool calls finishing after an interrupt); 2.1.327 ("Fixed Claude getting a long managed PostToolUse hook output twice when a mod added context to the tool call"). New hook event worth naming: `InstructionsLoaded` fires when a CLAUDE.md or `.claude/rules/*.md` is loaded, with matcher values `session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact`; exit code ignored, so it is observational only. Verdict: the RTE-08 design (read every rule's `paths:`, match the touched file, emit names) still holds. Could not determine from fetched pages whether `InstructionsLoaded` existed before the baseline; do not cite it as new.

### 3. routing.md "A client with no path-scoped instructions skips RTE-07 and RTE-08": UNCHANGED

- opencode ([rules docs](https://opencode.ai/docs/rules)): "No separate path-scoped rule system. Scoping works by placement. Nested `AGENTS.md` files load when the agent reads a file or lists a directory beneath them." Globs exist only in the `instructions` config array. opencode changelog 2026-10-11 to 2026-11-26 ([page 1](https://opencode.ai/changelog), [page 2](https://opencode.ai/changelog?page=2)): no rules or AGENTS.md loading entry; v2.2.0 (2026-10-27) adds plugin-managed keyed session instructions only. Oct 1-10 entries were not visible.
- Codex ([AGENTS.md guide](https://learn.chatgpt.com/docs/agent-configuration/agents-md), redirected from developers.openai.com): root-to-cwd concatenation, 32 KiB default `project_doc_max_bytes`, `AGENTS.override.md`; no path-scoped rules. Could not determine whether this changed in the window; the page carries no dates.
- Claude Code reads AGENTS.md via the built-in `cc-plugin-agents-md@builtin` plugin (a subdirectory AGENTS.md attaches when Read opens a file there; nothing under `.agents/` is read). Renamed from `agents-md@builtin` in v2.1.285 (2026-09-29).

### 4. rules/code-docs.md `paths:` frontmatter as the loading trigger: CHANGED (wording only)

Triggers are now Read, Write, Edit and single-file Bash reads (see 1). Memory docs: "`paths` is the only field Claude Code reads from a rule"; if the YAML does not parse, "Claude Code ignores the frontmatter and loads the rule as if it had no `paths`" (so a broken list loads the rule always, not never). Brace expansion documented: `src/**/*.{ts,tsx}`, one budget of 1,000 expanded patterns and 4 MiB per rule's `paths` list; over budget, the pattern is used unexpanded and its literal braces match nothing. Check: the code-docs `paths:` list must not rely on a pattern that expands past budget; a short list does not. Rules symlinked from outside the project load only after external-import approval and then only those without `paths` (memory docs; 2.1.284 added the approval prompt). Matters for adopters installing the rule by symlink: a symlinked rule with `paths:` silently never loads. Could not determine whether `**` semantics changed; the docs table was not read beyond the brace section.

### 5. Install directories and skip list: UNCHANGED in Claude Code; opencode list longer

- Claude Code ([skills docs](https://code.claude.com/docs/en/skills)): personal `~/.claude/skills/`, project `.claude/skills/`, nested `<subdir>/.claude/skills/`, `--add-dir`, plugin `<plugin>/skills/`, enterprise managed-settings dir, claude.ai account skills. No `.agents/skills`, and the page did not mention `CLAUDE_CONFIG_DIR` (page read to 100,000 of 121,124 characters). Window changes: 2.1.325 and 2.1.321 stop loading `.claude/skills` folders inside `--plugin-dir` plugins and `~/.claude/plugins` from a session started above them; 2.1.319 sandbox limits nested loading; 2.1.282 stops loading skills in the `anthropic-skills` or `claude-ai` namespace. 2.1.282-2.1.329 also rework the `.trash` folders under `~/.claude/skills` and `~/.claude/plugins`, which hold removed skills; those paths contain dot-directories and `skills`, so the census already skips them.
- `user-invocable`: still a documented field; skills docs say "Set to `false` when only Claude should invoke the skill". `metadata`: "Free-form YAML map ... Claude Code doesn't act on its contents, and drops a value that isn't a map." The pair's `claude.user-invocable: "false"` metadata key is therefore inert in Claude Code (a string inside a map is ignored); only the real top-level `user-invocable: false` field acts, and claude.ai uploads and the Skills API reject it with a hard error. That is a candidate finding: confirm how grim maps the `claude.` metadata namespace to a top-level field before touching SKILL.md. This is not a window change; it was not checked at baseline, so classify as "could not determine whether new".
- opencode ([skills docs](https://opencode.ai/docs/skills)): global `~/.config/opencode/skills`, `~/.claude/skills`, `~/.agents/skills`; project `.opencode/skills`, `.claude/skills`, `.agents/skills`; precedence lowest to highest: built-in, `.claude/skills`, `.agents/skills`, `~/.config/opencode/skills`, project `.opencode/skills`, explicit config. Plural `skills`, not `skill`. Could not determine the date `.agents/skills` was added; no window changelog entry names it.
- Affected code: `skills/code-docs-reference/checks/comment_census.py` lines 175-177 skip `.claude` and `.agents`; line 613 skips any dot-directory with a `rules` or `skills` path component, which already covers `.opencode/skills/`, `.agents/skills/`, `.claude/skills/` and `.config/opencode/skills`. Verdict: no census code change. `rules/code-docs.md:113` and `length.md:70-71` list only `.claude/rules/` and `.opencode/skills/`, and say "such as" semantics via example; add `.agents/skills/` to the example list for accuracy (optional). `rules/code-docs.md:189-190` and `SKILL.md:25` install paths remain correct for Claude Code; for opencode add `~/.config/opencode/skills/` and `~/.agents/skills/` only if the pair claims opencode global installs. Could not confirm from the fetched skills page whether `$CLAUDE_CONFIG_DIR/skills` is honoured; the changelog shows `CLAUDE_CONFIG_DIR` handled for `/statusline` (2.1.327) and VS Code (2.1.284), consistent with it being the config root.

### 6. length.md LEN-04 (harness comment-density prompts): UNCHANGED

- Codex: `codex-rs/core/gpt_5_codex_prompt.md` line 10: "Add succinct code comments that explain what is going on if code is not self-explanatory ... Usage of these comments should be rare." The default base prompt (`codex-rs/protocol/src/prompts/base_instructions/default.md` line 145) says "Do not add inline comments within code unless explicitly requested." Commit history ([gpt_5_codex_prompt.md](https://github.com/openai/codex/commits/main/codex-rs/core/gpt_5_codex_prompt.md), [default.md](https://github.com/openai/codex/commits/main/codex-rs/protocol/src/prompts/base_instructions/default.md)): latest commits Jan 12, 2026 and Jun 23, 2026, both before the window. Neither says "match surrounding comment density", so LEN-04's phrase describes other harness prompts, not these two; keep it, it is conditional ("Where a harness prompt says").
- Claude Code: the changelog window has no entry about comment guidance in the system prompt (2.1.330 only changes model-specific prompt selection for "sonnet" or "haiku" names). Claude Code's system prompt text is not published; could not determine its wording.
- opencode: v2.4.2 (2026-11-26) ships a GPT-6.2 specific system prompt; text not fetched, could not determine its comment guidance.

### 7. routing.md RTE-07 rationale, arXiv 2608.20195: UNCHANGED

[arXiv abs page](https://arxiv.org/abs/2608.20195): "From Agent Behaviour to Agent-Friendly Documentation" (Gao, Chen), single version v1, submitted 2026-08-20; no revision. Numbers: agent-facing artifacts 60.5% of 3,033 documentation interactions; classical technical documentation 10.6%; API references 1.3%. The cited "60.5% ... against 10.6%" is exact. Note the paper's own caveat: consultation is mostly self-initiated (70.2%) and the link to later edits is weak (adjusted OR 1.33), so the claim supports "agents read instruction files" but not "instruction files change edits"; RTE-07 uses it only for the first, which is fine.

## Normative guidance candidates

1. Rewrite RTE-08's behaviour sentence and rationale as in section 1.
   Rationale: the cited premise (Write-only edits skip rules) is false on Claude Code 2.1.288 and later.
   Verification: `grep -n "Write-only\|when the agent reads a matching file" skills/code-docs-reference/routing.md` returns nothing after the edit; behavioural check by a scratch repo test: create a file matching a rule's glob with Write in 2.1.288+ and observe the rule in `InstructionsLoaded` with `path_glob_match` (debug).
2. Keep the RTE-08 hook but state its job as post-compaction and cross-version reminder, and cap output at under 10,000 characters.
   Rationale: loading is now on Write too; compaction is the remaining gap, and the cap truncates silently.
   Verification: planted proof in RTE-08 plus `python3 hook.py < payload | wc -c` under 10000.
3. Pin a minimum version in the RTE-08 wording: "Claude Code 2.1.288 or later".
   Rationale: older clients still miss Write-first loading.
   Verification: reading test of routing.md.
4. Tell adopters that a rule symlinked from outside the project loses its `paths:` loading until external imports are approved (rules/code-docs.md install note).
   Rationale: silent non-loading.
   Verification: `ls -l .claude/rules/code-docs.md` shows a symlink target outside the repo.
5. Add `.agents/skills/` to the installed-skills example lists (`rules/code-docs.md:113`, `length.md:70-71`).
   Rationale: opencode and other clients read it.
   Verification: `grep -n "agents/skills" rules/code-docs.md skills/code-docs-reference/length.md`; census test: add `.agents/skills/x/a.py` to the `list_files` fixture near comment_census.py line 1613 and expect it skipped.
6. Resolve the `claude.user-invocable: "false"` metadata key against grim's mapping before the next release.
   Rationale: Claude Code ignores metadata contents.
   Verification: `grim build` output frontmatter of the built skill shows a top-level `user-invocable: false`.

## AI-agent angle

- Agents trained before 2.1.288 will add a manual "read the rule file after Write" step or a hand-written path table; the planted-proof check in RTE-08 catches the table.
- Agents assume `.agents/skills` is a Claude Code directory; it is read by opencode, not by Claude Code skills docs. Check: grep the skills page list above.

## Contested / evolving

- Whether `**` matching changed: not determined. Trend: brace expansion and a budget were documented; watch `paths` limits.
- opencode docs now carry a "V2" label and a differing precedence order from older docs; trend toward `.agents/skills` as a shared location.
- Claude Code changelog is dated only through npm times; 2.1.284 was published 2026-09-28, the first day of the window, so changelog entries up to 2.1.283 (2026-09-25) are baseline.

## Sources

| URL | What | Date/era | Why |
|---|---|---|---|
| https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md | Claude Code changelog (2.1.284-2.1.332) | 2026-09-28 to 2026-11-24 | primary, loading and hooks fixes |
| https://registry.npmjs.org/@anthropic-ai/claude-code | npm publish times | window | dates for versions |
| https://code.claude.com/docs/en/memory | memory and rules | current 2026-11-27 | primary, path-scoped loading |
| https://code.claude.com/docs/en/skills | skills | current | primary, install locations, frontmatter |
| https://code.claude.com/docs/en/hooks | hooks | current | primary, additionalContext and InstructionsLoaded |
| https://opencode.ai/docs/skills | opencode skills | current | primary, directories |
| https://opencode.ai/docs/rules | opencode rules | current | primary, no path scoping |
| https://opencode.ai/changelog | opencode changelog p1 | 2026-10-30 to 2026-11-26 | primary |
| https://opencode.ai/changelog?page=2 | opencode changelog p2 | 2026-10-11 to 2026-10-30 | primary |
| https://learn.chatgpt.com/docs/agent-configuration/agents-md | Codex AGENTS.md guide | current, undated | primary |
| https://raw.githubusercontent.com/openai/codex/main/codex-rs/core/gpt_5_codex_prompt.md | Codex prompt, comment line | last commit 2026-01-12 | primary, LEN-04 |
| https://raw.githubusercontent.com/openai/codex/main/codex-rs/protocol/src/prompts/base_instructions/default.md | Codex base prompt | last commit 2026-06-23 | primary, LEN-04 |
| https://github.com/openai/codex/commits/main/codex-rs/core/gpt_5_codex_prompt.md | commit history | to 2026-01-12 | dates the prompt |
| https://arxiv.org/abs/2608.20195 | arXiv abstract | v1 2026-08-20 | RTE-07 |

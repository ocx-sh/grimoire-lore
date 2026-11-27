---
title: Delta refresh decision for the code-docs pair, 2026-09-27 to 2026-11-27
pair: code-docs
date: 2026-11-27
window_start: 2026-09-27
model: opus
consolidates:
  - .agents/research/refresh-2026-11/code-docs/rust-toolchain-lints.md
  - .agents/research/refresh-2026-11/code-docs/rust-generators-mcp.md
  - .agents/research/refresh-2026-11/code-docs/typescript-js-surfaces.md
  - .agents/research/refresh-2026-11/code-docs/python-surfaces-tools.md
  - .agents/research/refresh-2026-11/code-docs/claude-code-agent-clients.md
  - .agents/research/refresh-2026-11/code-docs/git-lychee-lsp.md
  - .agents/research/refresh-2026-11/code-docs/recent-shifts.md
revises:
  - .agents/research/code-docs-guards.md
  - .agents/research/code-docs-routing.md
  - .agents/research/code-docs-surfaces.md
  - .agents/research/code-docs-linkage.md
---

# Delta refresh decision for the code-docs pair

This is a delta update of the pair as it stood on the 2026-09-27 baseline, not a
re-creation. Every claim the seven delta artifacts found unchanged stays exactly
as written. An edit is planned only where a fetched primary source, or a scratch
run recorded in a delta artifact, shows that the pair's text is false or
incomplete on 2026-11-27.

## Contents

- [Verdict](#verdict)
- [Changed rules](#changed-rules)
- [New rules](#new-rules)
- [Confirmed unchanged](#confirmed-unchanged)
- [Open questions](#open-questions)
- [Revision log](#revision-log)
- [Spillover](#spillover)
- [Edit list](#edit-list)

## Verdict

- The rule file `rules/code-docs.md` stays untouched. No row of the index is
  false on 2026-11-27, and no new rule is added. Rule bump: none.
- RTE-08 is corrected in place. Claude Code 2.1.288 (2026-10-02) loads
  path-scoped rules on Write and Edit, and 2.1.293 also on single-file Bash
  reads, so the rationale "a Write-only edit skips a path-scoped rule" is false
  on current Claude Code. The rule itself (build the reminder from `paths:`,
  never a hand-written table) still holds; its rationale and the reminder
  paragraph now say what the hook is for.
- GRD-10's rationale is corrected in place. It had the `let_underscore_lock`
  split backwards: rustc's deny-by-default lint covers std guards and clippy's
  covers `parking_lot`. The error predates the window; the fix is required
  because the clippy lint list contradicts the sentence.
- SRF-03 coverage is extended to rmcp `#[prompt]`. rmcp 3.12.0 (2026-11-26)
  documents `#[prompt]` and `#[tool]` as sharing one doc-comment fallback, and
  fixes that fallback when other attributes follow the doc comment. The
  surfaces.md MCP rows name prompts, and `checks/interface_leak.py` scans
  `#[prompt]` like `#[tool]`, with a planted fixture that fails without it.
- The RTE-06 tool notes are refreshed from scratch runs on 2026-11-27: Stryker
  10.1.1 crashes on TypeScript 7 with a `tsconfig.json`, and must run from
  `./node_modules/.bin/`. mutmut moves to 3.8.1 with no fix listed.
- Version stamps that would otherwise read as stale gain a re-read sentence
  (guards.md, routing.md, linkage.md) without moving any measured version,
  because no planted edit was re-run. The surfaces.md hover sentence moves from
  LSP 3.17 to 3.18, the current specification.
- Skill bump: minor, because the `#[prompt]` coverage and the Stryker
  TypeScript 7 workaround are new guidance, beside corrected facts.

## Changed rules

### GRD-10 (rationale cell), guards.md

- Old text: "clippy's `let_underscore_lock` sees only std lock guards, never a
  domain wrapper."
- New text: "rustc's deny-by-default `let_underscore_lock` sees only std lock
  guards and clippy's only `parking_lot` ones, so neither sees a domain
  wrapper."
- Source: the clippy lint list (`let_underscore_lock`, correctness/deny,
  "supports mutex and rwlock in parking_lot. For std locks see the rustc lint
  `let_underscore_lock`", https://rust-lang.github.io/rust-clippy/master/index.html)
  and the rustc deny-by-default lint listing
  (https://doc.rust-lang.org/rustc/lints/listing/deny-by-default.html), read
  2026-11-27 (rust-toolchain-lints.md, claim 5).
- Verification: the rule's existing planted proof is unchanged. For the fact,
  on a scratch copy `let _ = std_mutex.lock().unwrap();` fails under rustc's
  deny, and `let _ = domain_lock.acquire();` stays silent under `cargo clippy`.
- The guards.md stamp gains one sentence: pyright 1.1.414 and TypeScript 7.0.2
  are still the latest releases, and the rustc and clippy changelogs through
  1.100.1 change none of the named lints except `let_underscore_must_use`,
  which since clippy 1.99 (PR 16633) decides `#[must_use]` as the compiler
  does. Sources: Rust RELEASES.md
  (https://raw.githubusercontent.com/rust-lang/rust/master/RELEASES.md), clippy
  CHANGELOG.md
  (https://raw.githubusercontent.com/rust-lang/rust-clippy/master/CHANGELOG.md),
  the npm registry for `pyright` and `typescript`
  (https://registry.npmjs.org/pyright).

### RTE-08 (rationale cell and the reminder paragraph), routing.md

- Old rationale: "A Write-only edit or a compaction skips a path-scoped rule."
- New rationale: "A compaction drops a path-scoped rule until a matching file
  is touched again, and Claude Code before 2.1.288 loaded none on a Write or
  Edit. From 2.1.288 the reminder only backs up the client's own loading, so a
  repo may drop it, never swap it for a table."
- Old paragraph: "as Claude Code behaves on 2026-09-27: path-scoped rules load
  when the agent reads a matching file, not on every tool use, and after
  compaction only once a matching file is read again."
- New paragraph: "as Claude Code behaves on 2026-11-27 (2.1.288 and later):
  path-scoped rules load when the agent reads, writes or edits a matching file,
  or views it with a single-file Bash `cat`, `head`, `tail`, `sed -n` or
  `grep`, not on every tool use, and after compaction only once a matching file
  is touched again. Before 2.1.288 only Read loaded them."
- The "What Agents Get Wrong Here" item 8 is narrowed to match: a Write-only
  edit misses the rule only on Claude Code before 2.1.288.
- Source: the Claude Code CHANGELOG entries for 2.1.288 and 2.1.293
  (https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md),
  dated by npm publish times
  (https://registry.npmjs.org/@anthropic-ai/claude-code), and the Claude Code
  memory documentation (https://code.claude.com/docs/en/memory) ("A path-scoped
  rule loads when Claude uses the Read, Write, or Edit tool on a matching
  file"), read 2026-11-27 (claude-code-agent-clients.md, claims 1 and 2).
- Verification: the rule's existing planted proof stays. For the text,
  `grep -n -e 'Write-only edit or a compaction skips' -e 'when the agent reads a matching file' skills/code-docs-reference/routing.md`
  prints nothing after the edit.

### RTE-06 (tool notes below the table), routing.md

- Old text: "install Stryker into the project (...); `npx --yes` fails with
  `ERR_MODULE_NOT_FOUND: typescript`." and "mutmut 3.8.0 fails inside its
  sandbox on `src/`-layout packages."
- New text: run `./node_modules/.bin/stryker run`, because a bare `npx stryker`
  resolved an unrelated old package; on TypeScript 7, Stryker 10.1.1 crashes
  with `ts.parseConfigFileTextToJson is not a function` while a `tsconfig.json`
  exists, so the scratch copy installs `typescript@6` with `--no-save` or moves
  the `tsconfig.json` aside. mutmut 3.8.1 (2026-10-28) lists no fix for the
  `src/`-layout failure. The notes header and the routing.md stamp move to
  "re-read 2026-11-27".
- Source: scratch runs on 2026-11-27 with Stryker 10.1.1, TypeScript 6.0.3,
  7.0.2 and 7.1.0-beta; stryker-js issues 6110
  (https://github.com/stryker-mutator/stryker-js/issues/6110) and 6111
  (https://github.com/stryker-mutator/stryker-js/issues/6111) and the open PR
  6231 (https://github.com/stryker-mutator/stryker-js/pull/6231); the
  stryker-js CHANGELOG
  (https://raw.githubusercontent.com/stryker-mutator/stryker-js/master/CHANGELOG.md);
  mutmut HISTORY.rst (https://github.com/boxed/mutmut/blob/main/HISTORY.rst) (typescript-js-surfaces.md,
  verdict 10; python-surfaces-tools.md, routing section).
- Verification: in a scratch project on TypeScript 7 with a `tsconfig.json`,
  the documented install and run prints a mutation score table, not a stack
  trace.

### SRF-03 (the MCP walk row) and the MCP generator row, surfaces.md and checks

- Old generator row: "an rmcp `#[tool]` with no `description =` publishes the
  function's `///`". Old walk row: "the tool list serialized in-process".
- New generator row: "every tool and prompt description and its argument
  schema"; "an rmcp `#[tool]` or `#[prompt]` with no `description =` publishes
  the function's `///`, other attributes after it included". New walk row adds
  "serialize the prompt list the same way when the server has `#[prompt]`
  functions". The Dates paragraph names `#[prompt]` and the 3.12.0 fix,
  including that `#[doc(hidden)]` no longer suppresses the description.
- `checks/interface_leak.py`: `RS_ATTR_RE` gains `prompt`, the fallback test
  treats `prompt` like `tool`, and the module docstring says so. The fail-source
  Rust fixture gains a `#[prompt]` function whose `///` carries `C-920`.
- Source: the rmcp CHANGELOG entry for 3.12.0, "keep doc comment descriptions
  when other attributes follow"
  (https://github.com/modelcontextprotocol/rust-sdk/blob/main/crates/rmcp/CHANGELOG.md),
  and PR 1485 (https://github.com/modelcontextprotocol/rust-sdk/pull/1485),
  read 2026-11-27
  (rust-generators-mcp.md, claims 3 and 7).
- Verification: `python3 checks/interface_leak.py --self-test` exits 0. With
  `prompt` removed from `RS_ATTR_RE` it fails with
  `fail-source: planted tokens not reported: ['C-920']`. Both runs were made on
  a scratch copy with all 19 edits applied, and `ruff format --check` and
  `ruff check` pass on the edited script.

### Hover sentence (supports SRF-04), surfaces.md

- Old text: "the LSP 3.17 hover result has no length field (read September
  2026)".
- New text: "the LSP 3.18 hover result has no length field (read November 2026;
  the 3.19 draft adds none)", with the September date kept on the
  rust-analyzer, typescript-go and pyright half.
- Source: the 3.18 specification's `Hover` interface (`contents` and an
  optional `range` only,
  https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/)
  and the 3.19 draft change log (git-lychee-lsp.md).
- Verification: `interface Hover` in the 3.18 `language/hover.md` has no
  length or truncation member.

### Stamp, linkage.md

- Old text: "git 2.54 and lychee 0.24."
- New text: adds "On 2026-11-27 git 2.56.1 and lychee 0.24.2 are current, and
  their release notes change none of the commands used here."
- Source: git `Documentation/RelNotes/2.55.0` to `2.56.1` at their tags
  (https://github.com/git/git/blob/v2.56.0/Documentation/RelNotes/2.56.0.adoc),
  and the lychee releases page (https://github.com/lycheeverse/lychee/releases)
  and `lychee-bin/CHANGELOG.md`
  (https://raw.githubusercontent.com/lycheeverse/lychee/master/lychee-bin/CHANGELOG.md)
  (git-lychee-lsp.md).
- Verification: the LNK-10 trace and the LNK-12 lychee line run as written on
  git 2.56.1 and lychee 0.24.2.

## New rules

None. No delta artifact found an upstream change in the window that needs a new
rule ID. The candidates the artifacts raised are either folded into existing
rows above (the `#[prompt]` coverage) or routed to open questions and spillover.

## Confirmed unchanged

- Rust: `wildcard_enum_match_arm` (restriction) and
  `match_wildcard_for_single_variants` (pedantic) are unchanged through 1.100.1;
  `#[expect]` still silences the lint it names; `let_underscore_drop` is still
  rustc allow-by-default; `let_underscore_untyped` is unchanged;
  `too_long_first_doc_paragraph` is still nursery with a hard-coded 200; the
  `-A warnings` advice stands, not re-measured.
- rust-analyzer still renders the whole doc block on hover; cargo-mutants 27.x
  keeps `-f` and `--in-place` and adds no bare-method-call operator.
- clap 4.6.7 to 4.6.10, schemars 1.2.3 and the MCP specification (no revision
  after 2026-07-28) change no doc-text behaviour the pair states, and the
  `--help-walk` `Commands:` heading is unchanged.
- TypeScript 7.0.2 is still npm `latest`; `npx tsc --noEmit` and
  `npx vitest run -t` work on vitest 5.1.2; `switch-exhaustiveness-check` still
  needs typed linting; commander 15.1.0 keeps the `helpInformation()` walk;
  TypeDoc, the VS Code contribution keys and the `action.yml` keys are
  unchanged.
- pyright 1.1.414 is still latest, with the `assert_never` and `case _: raise`
  behaviour unchanged; the argparse `_SubParsersAction.choices` walk still
  works; click 8.5's `Argument(help=)` is already covered by `help=`; typer,
  griffe (`load`, `resolve_aliases`, `AliasResolutionError`), mkdocstrings and
  pydantic change nothing the pair states; Python-Markdown slugs are the
  baseline behaviour again after 3.11.2; `PurePath.full_match` and `fnmatch`
  are unchanged.
- The census skip list already covers `.agents/skills/` and opencode's
  directories; the Claude Code install paths in the rule and SKILL.md are
  correct; LEN-04 holds (no Codex prompt commit in the window); arXiv
  2608.20195 has only v1, so RTE-07's 60.5% and 10.6% stand.
- The RTE-08 hook output contract (`hookSpecificOutput.additionalContext`,
  `hookEventName: PostToolUse`, matcher `Edit|Write`) is unchanged.
- LNK-10 and the git diff options in the depth files show no changed-behaviour
  line in the git 2.55 and 2.56 release notes; LNK-12's lychee flags exist in
  0.24.2.

## Open questions

- GRD-05 cites arXiv 2603.21642 for "the published mitigation strips"
  imperative comment text, and its abstract covers MCP tool poisoning only. Read
  the full text before the next refresh; if it does not support the sentence,
  cite a source that does (arXiv 2611.28763 is a candidate second source) or
  state it as the pair's judgement. Not edited: the abstract alone cannot
  prove the citation wrong.
- springdoc-openapi 3.2.0 (2026-10-24) publishes OpenAPI operations as MCP
  tools. Whether `@McpToolDescription` overrides the description came from a
  search summary only. A Spring row in the surfaces.md generator table waits
  for a primary read.
- rmcp: the `ToolRouter::list_all()` name on 3.12.0 was not checked against
  docs.rs, and the prompt router's list method was not named. A reviewer should
  confirm both in a spot check.
- MCP `serverInfo`, the server `instructions` string, `resources/list` and
  tool `annotations` text may render to users and sit outside the SRF-03 walk.
  The 2026-07-28 field set could not be confirmed.
- rmcp 3.4.1 (2026-09-23, before the baseline) accepts a const path or
  `concat!` as `description =`. The source scan reads only literals; the output
  gate already sees the final string. A follow-up could make the source scan
  report a non-literal description as unresolved.
- Python 3.14 colours `format_help()` under `FORCE_COLOR` or `PYTHON_COLORS=1`,
  and 3.15 highlights backtick spans when colour is on. `interface_leak.py`
  strips no ANSI escapes, so an escape directly before a token can remove the
  word boundary the token patterns need. Measure whether a planted token in
  coloured help escapes the scan before choosing between stripping escapes in
  the scanner and setting `NO_COLOR` in the SRF-03 Python example.
- clap 5.0 (unreleased, `unstable-v5`) will use the full doc comment for
  `ValueEnum` variant help. Re-read the surfaces.md clap sentence when 5.0
  ships.
- lychee's nightly removes deprecated flags (#2208) and changes heading
  fragment generation. Re-check LNK-12's flags at 0.25.
- git 2.56.0 reworked `git log --follow` for non-linear history. Re-run the
  LNK-10 trace on a 2.56 binary before the next release.
- The GRD-10 "70% noise in a 30-hit sample" was measured on clippy 1.93.1;
  re-sample on 1.100.1 if the figure is to be re-stamped.
- cargo-mutants 27.0.0 (2026-03-07, before the baseline) adds `-f` values to
  the config file's list instead of replacing it. Confirm the flag that runs
  exactly one file before adding it to the RTE-06 notes.
- The VS Code `deprecationMessage` and `markdownDeprecationMessage` keys and
  the `action.yml` input `deprecationMessage` render to users and are not in
  the scanner's JSON key set. This is a pre-existing gap, not a window change.
- griffe 2.4.0 propagates `public` to inherited members; run the
  interface-leak Python fixture once under griffe 2.4.1.
- Whether typescript-go hover changed at 7.1, and when Stryker will fix the
  TypeScript 7 tsconfig crash, are not determined.
- PEP 846 (Draft) would make a string after a `type` statement a docstring;
  the census would then need to count it.

## Revision log

1. guards.md: stamp gains the 2026-11-27 re-read sentence.
2. guards.md: GRD-10 rationale corrects the `let_underscore_lock` split.
3. routing.md: stamp names the re-read tool versions.
4. routing.md: RTE-06 Stryker note adds the local binary and the TypeScript 7
   crash workaround; the notes header moves to 2026-11-27.
5. routing.md: RTE-06 mutmut note names 3.8.1.
6. routing.md: the RTE-08 reminder paragraph describes 2.1.288 loading.
7. routing.md: RTE-08 rationale replaces the Write-only premise.
8. routing.md: agents item 8 narrows the Write-only case to old versions.
9. surfaces.md: Dates paragraph names `#[prompt]` and the rmcp 3.12.0 fix.
10. surfaces.md: MCP generator row names prompts and the attribute case.
11. surfaces.md: SRF-03 MCP walk row adds the prompt list.
12. surfaces.md: hover sentence moves to LSP 3.18.
13. linkage.md: stamp names git 2.56.1 and lychee 0.24.2 as current.
14. interface_leak.py: docstring names `#[prompt]` among scanned attributes.
15. interface_leak.py: docstring names the `#[prompt]` fallback.
16. interface_leak.py: docstring MCP walk adds the prompt list.
17. interface_leak.py: `RS_ATTR_RE` matches `prompt`.
18. interface_leak.py: the fallback test treats `prompt` like `tool`.
19. fail-source fixture: a `#[prompt]` with a planted `C-920`.

## Spillover

- grim-usage (installer guidance): Claude Code loads a rule symlinked from
  outside the project only after external-import approval, and then only rules
  without `paths:` (memory docs; the approval prompt arrived in 2.1.284). A
  path-scoped rule such as `code-docs` installed by symlink would never load.
- grim-authoring: Claude Code ignores the contents of `metadata`, so the
  `claude.user-invocable: "false"` key in SKILL.md acts only if grim maps it to
  the top-level `user-invocable` field. Confirm the mapping in `grim build`
  output. Not a window change.
- rust-quality: rustdoc's `invalid_markdown_table` (Rust 1.100.0, warn by
  default) and `unused_footnote_definition` (1.99.0) belong in that pair's
  rustdoc lint list, if it keeps one.

## Edit list

Apply these entries in order. Each find string occurs exactly once in its file,
and all 19 were applied and checked on a scratch copy: the interface-leak
self-test passes, ruff passes, and no depth file passes 500 lines (the largest,
surfaces.md, reaches 276). Text inside each fence is verbatim, with no added
indentation. Paths are relative to the repository root.

### 1. `skills/code-docs-reference/guards.md`, replace

Find:

````text
TypeScript 7.0.2. The lint and type behaviour in the exhaustiveness and RAII
rows was watched on planted edits at those versions. `checks/` is this skill's
own directory; run each script from the repository root.
````

Replace with:

````text
TypeScript 7.0.2. The lint and type behaviour in the exhaustiveness and RAII
rows was watched on planted edits at those versions. Re-read 2026-11-27:
pyright 1.1.414 and TypeScript 7.0.2 are still the latest releases, and the
rustc and clippy changelogs through 1.100.1 change none of the lints named here
except `let_underscore_must_use`, which since clippy 1.99 decides `#[must_use]`
as the compiler does, so the GRD-10 audit sample may read differently now.
`checks/` is this skill's own directory; run each script from the repository root.
````

### 2. `skills/code-docs-reference/guards.md`, replace

Find:

````text
clippy's `let_underscore_lock` sees only std lock guards, never a domain wrapper.
````

Replace with:

````text
rustc's deny-by-default `let_underscore_lock` sees only std lock guards and clippy's only `parking_lot` ones, so neither sees a domain wrapper.
````

### 3. `skills/code-docs-reference/routing.md`, replace

Find:

````text
- Measured 2026-09-27. Tool behaviour (Claude Code rule loading, cargo-mutants,
  Stryker, mutmut 3.8.0) is dated to that day.
````

Replace with:

````text
- Measured 2026-09-27. Tool behaviour (Claude Code rule loading, cargo-mutants,
  Stryker, mutmut) was re-read 2026-11-27, against Claude Code 2.1.332,
  cargo-mutants 27.1.0, Stryker 10.1.1 and mutmut 3.8.1.
````

### 4. `skills/code-docs-reference/routing.md`, replace

Find:

````text
Mutation tool notes, 2026-09-27:

- **TypeScript:** install Stryker into the project (`npm install --no-save
  @stryker-mutator/core @stryker-mutator/vitest-runner`); `npx --yes` fails with
  `ERR_MODULE_NOT_FOUND: typescript`. Set `mutate` to the one source file and point
````

Replace with:

````text
Mutation tool notes, re-read 2026-11-27:

- **TypeScript:** install Stryker into the project (`npm install --no-save
  @stryker-mutator/core @stryker-mutator/vitest-runner`) and run
  `./node_modules/.bin/stryker run`, because a bare `npx stryker` can resolve an
  unrelated old package; `npx --yes` fails with `ERR_MODULE_NOT_FOUND: typescript`.
  On TypeScript 7, Stryker 10.1.1 crashes with `ts.parseConfigFileTextToJson is
  not a function` while a `tsconfig.json` exists: in the scratch copy, install
  `typescript@6` with `--no-save` or move the `tsconfig.json` aside. Set `mutate`
  to the one source file and point
````

### 5. `skills/code-docs-reference/routing.md`, replace

Find:

````text
- **Python:** mutmut 3.8.0 fails inside its sandbox on `src/`-layout packages. Use the
  planted edit.
````

Replace with:

````text
- **Python:** mutmut 3.8.0 fails inside its sandbox on `src/`-layout packages, and
  the 3.8.1 notes (2026-10-28) list no fix. Use the planted edit.
````

### 6. `skills/code-docs-reference/routing.md`, replace

Find:

````text
The RTE-08 reminder, as Claude Code behaves on 2026-09-27: path-scoped rules load
when the agent reads a matching file, not on every tool use, and after compaction
only once a matching file is read again. The reminder is a PostToolUse hook on
````

Replace with:

````text
The RTE-08 reminder, as Claude Code behaves on 2026-11-27 (2.1.288 and later):
path-scoped rules load when the agent reads, writes or edits a matching file, or
views it with a single-file Bash `cat`, `head`, `tail`, `sed -n` or `grep`, not on
every tool use, and after compaction only once a matching file is touched again.
Before 2.1.288 only Read loaded them. The reminder is a PostToolUse hook on
````

### 7. `skills/code-docs-reference/routing.md`, replace

Find:

````text
| A Write-only edit or a compaction skips a path-scoped rule. Both hand-written
````

Replace with:

````text
| A compaction drops a path-scoped rule until a matching file is touched again, and Claude Code before 2.1.288 loaded none on a Write or Edit. From 2.1.288 the reminder only backs up the client's own loading, so a repo may drop it, never swap it for a table. Both hand-written
````

### 8. `skills/code-docs-reference/routing.md`, replace

Find:

````text
8. **Editing without the governing rule loaded,** after a Write-only edit or a
   compaction (RTE-08).
````

Replace with:

````text
8. **Editing without the governing rule loaded,** after a compaction, or after a
   Write-only edit on Claude Code before 2.1.288 (RTE-08).
````

### 9. `skills/code-docs-reference/surfaces.md`, replace

Find:

````text
period. schemars copies the whole body into `description`. rmcp's `#[tool]`
uses `description =` verbatim, else the function's doc comment. argparse,
click and commander print what they are given.
````

Replace with:

````text
period. schemars copies the whole body into `description`. rmcp's `#[tool]`
and `#[prompt]` use `description =` verbatim, else the function's doc comment.
Since rmcp 3.12.0 (2026-11-26) that fallback also holds when another attribute
follows the doc comment, and `#[doc(hidden)]` no longer suppresses it. argparse,
click and commander print what they are given.
````

### 10. `skills/code-docs-reference/surfaces.md`, replace

Find:

````text
| MCP server | every tool description and its argument schema | an rmcp `#[tool]` with no `description =` publishes the function's `///` |
````

Replace with:

````text
| MCP server | every tool and prompt description and its argument schema | an rmcp `#[tool]` or `#[prompt]` with no `description =` publishes the function's `///`, other attributes after it included |
````

### 11. `skills/code-docs-reference/surfaces.md`, replace

Find:

````text
| MCP | the tool list serialized in-process (rmcp: the router's `list_all()`), which covers `description =`, the `///` fallback and the argument schemas | the JSON on stdin |
````

Replace with:

````text
| MCP | the tool list serialized in-process (rmcp: the router's `list_all()`), which covers `description =`, the `///` fallback and the argument schemas; serialize the prompt list the same way when the server has `#[prompt]` functions | the JSON on stdin |
````

### 12. `skills/code-docs-reference/surfaces.md`, replace

Find:

````text
rust-analyzer, typescript-go and pyright render the whole doc block on hover,
and the LSP 3.17 hover result has no length field (read September 2026). Never
````

Replace with:

````text
rust-analyzer, typescript-go and pyright render the whole doc block on hover
(read September 2026), and the LSP 3.18 hover result has no length field (read
November 2026; the 3.19 draft adds none). Never
````

### 13. `skills/code-docs-reference/linkage.md`, replace

Find:

````text
as shipped in this skill, git 2.54 and lychee 0.24. `checks/` is this skill's
own directory. Run every command from the repository root.
````

Replace with:

````text
as shipped in this skill, git 2.54 and lychee 0.24. On 2026-11-27 git 2.56.1
and lychee 0.24.2 are current, and their release notes change none of the
commands used here. `checks/` is this skill's own directory. Run every command
from the repository root.
````

### 14. `skills/code-docs-reference/checks/interface_leak.py`, replace

Find:

````text
  - Rust #[command|arg|clap|value|group|schemars|tool(...)] string values of
````

Replace with:

````text
  - Rust #[command|arg|clap|value|group|schemars|tool|prompt(...)] string values of
````

### 15. `skills/code-docs-reference/checks/interface_leak.py`, replace

Find:

````text
  - rmcp's fallback: a #[tool] without description publishes the fn's ///
````

Replace with:

````text
  - rmcp's fallback: a #[tool] or #[prompt] without description publishes the
    fn's ///
````

### 16. `skills/code-docs-reference/checks/interface_leak.py`, replace

Find:

````text
              covers description strings, the /// fallback and every
              JsonSchema argument struct
````

Replace with:

````text
              covers description strings, the /// fallback and every
              JsonSchema argument struct; serialize the prompt list the same
              way when the server has #[prompt] functions
````

### 17. `skills/code-docs-reference/checks/interface_leak.py`, replace

Find:

````text
RS_ATTR_RE = re.compile(r"#\[\s*(command|arg|clap|value|group|schemars|tool)\s*[(\]]")
````

Replace with:

````text
RS_ATTR_RE = re.compile(r"#\[\s*(command|arg|clap|value|group|schemars|tool|prompt)\s*[(\]]")
````

### 18. `skills/code-docs-reference/checks/interface_leak.py`, replace

Find:

````text
                if a.group(1) != "tool" or "description" in src[a.start() : end] or lines[k].test:
````

Replace with:

````text
                if (
                    a.group(1) not in ("tool", "prompt")
                    or "description" in src[a.start() : end]
                    or lines[k].test
                ):
````

### 19. `skills/code-docs-reference/checks/fixtures/interface_leak/fail-source/src/cli.rs.fixture`, replace

Find:

````text
    #[tool(description = "Fetch a package (C-908)")]
    async fn fetch(&self) {}
````

Replace with:

````text
    #[tool(description = "Fetch a package (C-908)")]
    async fn fetch(&self) {}

    /// Summarise a package (C-920).
    #[prompt]
    async fn summarise(&self) {}
````

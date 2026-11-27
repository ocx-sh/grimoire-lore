---
title: "Tool names and descriptions for agent callers"
program: product
sub_program: ux
topic: ux-agent-facing-interfaces
worker: tool-names-and-descriptions
date_researched: 2026-11-27
model: sonnet
sources_fetched: 19
scope: >
  Covers how MCP tools (and agent-facing commands exposed as tools) are named, namespaced and
  described, a description checklist with a Detect line per item, tool-count guidance, and what
  to route to existing catalog skills. Does not cover annotations or approval (UX-ACT
  agent-action-approval), response shapes and truncation beyond one-line pointers, or CLI help text.
---

# Tool names and descriptions for agent callers

## Table of contents

1. Summary
2. Findings
   1. What the sources require
   2. Measurements (grim, reference servers, GitHub)
   3. Naming and namespacing
   4. The description checklist
   5. Tool count
   6. Routing to existing catalog skills
3. Normative guidance candidates
4. What an agent must not decide alone
5. Open question: release eval
6. AI-agent angle
7. Contested / evolving
8. Dated facts
9. Not fetched or not verified
10. Sources

## Summary

- A tool name must be unique in its server, case-sensitive and 1 to 128 characters ([MCP spec, page labelled 2026-07-28](https://modelcontextprotocol.io/specification/latest/server/tools)); the Claude API accepts only `[a-zA-Z0-9_-]` ([Claude API, undated page, fetched 2026-11-27](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)). Use lowercase `snake_case` only: all 8 measured servers do (209 of 209 tools).
- Namespacing is advised by Anthropic and the Claude API docs (`asana_search`, `github_list_prs`), required in effect by the MCP spec when servers are aggregated, and ignored by GitHub's own server (0 of 151 tools carry a `github_` prefix). Rule: prefix generic verbs, otherwise lead with the resource.
- The description is the main lever: Anthropic calls it "by far the most important factor in tool performance" and asks for at least 3 to 4 sentences covering what, when to use, when not, parameters, and limits ([Claude API docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)).
- Measured against that checklist, real servers fail it: of 44 reference-server tools, 13 say when to use the tool, 10 say when not to, 6 pass all seven items. grim's 5 tools: 0 say when to use, 0 say when not to.
- Independent academic data agrees: 97.1% of 856 MCP tools had at least one description smell and 56% did not state their purpose clearly ([arXiv 2602.14878](https://arxiv.org/abs/2602.14878), v1 2026-02-16, v3 2026-05-31).
- Longer is not free: augmenting every component raised task success by a median 5.85 percentage points, but added 67.46% more execution steps and regressed 16.67% of cases; shorter targeted descriptions were statistically equivalent ([arXiv 2602.14878 full text](https://arxiv.org/html/2602.14878v1)).
- Claude Code cuts a tool description past 4,096 characters (upfront tools) or 16,384 (tools loaded by tool search); before v2.1.296 the limit was 2,048 ([Claude Code docs, fetched 2026-11-27](https://code.claude.com/docs/en/mcp)). Put discriminating words first; keep under 2,048 for older installs.
- Domain failures should return `isError: true` results the model can act on; the spec reserves protocol errors for unknown tool and malformed requests ([MCP spec](https://modelcontextprotocol.io/specification/latest/server/tools)). Measured: grim returns `isError: true` for bad arguments but a JSON-RPC `-32603` error for a failed registry lookup.
- Every parameter needs a description; schema-level descriptions are searched by tool search too ([Claude tool search docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)). Measured: 100% in grim, filesystem, memory; 2 of 14 in the git reference server (`repo_path` has only an auto-generated title).
- Tool count: OpenAI aims for fewer than 20 functions at the start of a turn (soft) ([OpenAI docs](https://developers.openai.com/api/docs/guides/function-calling)); Anthropic says selection accuracy degrades past 30 to 50 tools and recommends tool search from 10 tools or 10k definition tokens ([Claude tool search docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)).
- A server that registers every endpoint pays for it: GitHub's snapshot inventory is 151 tools, 330,617 bytes of `tools/list` JSON (about 83k tokens by the bytes/4 rule of thumb, an estimate); its default toolsets expose 49 documented tools.
- Consolidation is the sourced direction (Anthropic, OpenAI, GitHub's own `method`-selector tools: 21 of 151), but it conflicts with enum-per-field strictness; see Contested.
- Pin description claims with tests: grim asserts tokens in its descriptions (`grim_status_description_states_the_write_gate`); GitHub asserts schema-level lints (no top-level `anyOf`/`oneOf`/`allOf`, canonical pagination names, no duplicate names).
- Routed, not restated: description craft for skills (what + "Use when", negative scope, front-loading, third person) lives in `ai-config-authoring` `references/descriptions.md`, which already points at the tools post; the new rule must own tool names, the 7-item tool checklist, and tool count, because neither `ai-config-authoring` nor `grim-authoring` sets them.

## Findings

### 1. What the sources require

**Anthropic, "Writing effective tools for agents" (2025-09-11, vendor engineering post).** Principles: prefer a few targeted tools over wrappers for every endpoint; consolidate multi-step operations (`schedule_event` instead of list plus create); namespace with a service or resource prefix and test prefix against suffix; return high-signal fields and natural-language identifiers over UUIDs; offer a `response_format` enum (its example: 206 tokens detailed vs 72 concise); truncate with steering messages (Claude Code default tool-response limit then 25,000 tokens); write errors as specific, actionable fixes; write descriptions "as if onboarding a new hire"; use unambiguous parameter names (`user_id`, not `user`); small description refinements gave large gains ([source](https://www.anthropic.com/engineering/writing-tools-for-agents)).

**Claude API "Define tools" (platform docs, undated, fetched 2026-11-27).** `name` must match `^[a-zA-Z0-9_-]{1,128}$` (no dot, which the MCP spec allows). Best practices: extremely detailed descriptions (what, when and when not, what each parameter means, caveats and what the tool does not return), "at least 3 to 4 sentences", consolidate related operations, namespace by service, return only high-signal data, and ask for an explanation rather than reasoning in parameters. `input_examples` cost about 100 tokens (flat) or 200 (nested) each ([source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)).

**MCP tools spec (page links resolve to revision 2026-07-28, fetched 2026-11-27).**
- Fields: `name`, optional `title`, optional `description`, `inputSchema` (MUST be a valid JSON Schema object, never null), optional `outputSchema`, optional `annotations`, optional `icons`.
- Names: SHOULD be 1 to 128 characters, case-sensitive, only `A-Z a-z 0-9 _ - .`, no spaces or commas, unique within a server. Aggregating clients SHOULD disambiguate collisions, for example by prefixing a server identifier, and the server `name` "SHOULD NOT be relied upon for disambiguation".
- No-parameter tools: use `{ "type": "object", "additionalProperties": false }` (marked Recommended).
- `tools/list` SHOULD be deterministic in order so clients can cache and prompt caches hit.
- If an `outputSchema` is given, servers MUST return conforming `structuredContent`, and SHOULD also return serialized JSON in a text block.
- Errors: protocol errors for unknown tool and malformed requests; tool execution errors (`isError: true`) for API failures, input validation and business logic, "actionable feedback that language models can use to self-correct". Clients SHOULD pass execution errors to the model.
- Stateful tools: when a creation tool returns a handle, "the server's retention policy should be stated in the creation tool's description".
- Annotations are untrusted unless the server is trusted (out of scope here) ([source](https://modelcontextprotocol.io/specification/latest/server/tools)).

**Claude Code MCP docs (fetched 2026-11-27).** Tool search is on by default and loads only tool names plus server instructions at start; there is no fixed per-server tool cap. Description cuts: 4,096 characters for server instructions and upfront tools; 16,384 for tools loaded through tool search; the shorter limit was 2,048 before v2.1.296 (and applied to all tools before v2.1.295); `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH` (v2.1.280 or later) overrides both. Tool search matches a query against the description "within the shorter limit, so put the words Claude would search for near the start". Output: warning above 10,000 tokens, default maximum 25,000 (`MAX_MCP_OUTPUT_TOKENS`), text results above 50,000 characters are saved to a file ([source](https://code.claude.com/docs/en/mcp)).

**Claude tool search docs (fetched 2026-11-27).** Search covers tool names, descriptions, argument names and argument descriptions. Use consistent prefixes "so one search matches the whole group". Accuracy "degrades once you exceed 30 to 50 available tools"; use tool search at 10 or more tools or more than 10k definition tokens; standard calling fits under 10 tools ([source](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)).

**OpenAI function calling (page undated, fetched 2026-11-27).** Clear names, parameter descriptions and "when to use each function and when not to"; "use enums and object structure to prevent invalid states"; "always" enable strict mode; do not make the model fill arguments you already know; aim for fewer than 20 functions available at the start of a turn, "just a soft suggestion"; examples may hurt reasoning models ([source](https://developers.openai.com/api/docs/guides/function-calling)).

**Independent studies (arXiv preprints, February 2026).** 856 tools in 103 MCP servers: share failing each rubric component was purpose 56%, usage guidelines 89.3%, limitations 89.8%, parameter explanation 84.3%, length and completeness 79.1%, examples 77.9%; removing the Examples component did not degrade performance ([2602.14878 full text](https://arxiv.org/html/2602.14878v1)). A second study of 10,831 servers reports "73% repeated tool names" and that standard-compliant descriptions reach 72% selection probability versus a 20% baseline in competitive settings, with accuracy and functionality smells having the largest effect ([2602.18914](https://arxiv.org/abs/2602.18914), submitted 2026-02-21). Both are preprints; the second abstract does not define the baseline of its "+11.6% and +8.8%" figures.

### 2. Measurements

Method. `tools/list` was captured from live servers with the MCP TypeScript SDK 1.32.1 client (scratch script, not committed): `modelcontextprotocol/servers` at commit `b502fd9` (2026-11-27) built with `npm ci --ignore-scripts && npm run build`; Python servers via `uv run mcp-server-git|fetch|time`; grim 0.16.0 via `grim mcp --allow-writes`. GitHub's server is read from its committed tool snapshots, `pkg/github/__toolsnaps__/*.snap`, at commit `7edc2dd` (2026-11-25), excluding 7 `*_output.snap` files that snapshot output schemas, not tools. The demo server `src/everything` was excluded (a protocol demo, not a product). grim source: `/home/mherwig/dev/grimoire-rs/grimoire/src/mcp/server.rs` and `tool_args.rs` (the tree is not a git checkout; version taken from the binary). Clones live under `~/.cache/research-lang/exemplars/product/tool-names/`.

Scoring is by regular expression over the description string; the schema check reads the live `inputSchema`. The detectors are heuristics, tuned after a hand check. The first drafts of the "when not" and "output" detectors over-matched; hand review of 24 random tools showed 3 of 8 "when not" hits were true exclusions (the rest were scope limits such as "only works within allowed directories"), so the detector was narrowed to "not for / instead / rather than / do not use / prefer" or a named sibling tool. All 4 "when to use" hits in that sample were true positives and none of the 20 misses stated a trigger. The "output" item counts an `outputSchema` as a pass; the text-only count is given separately.

Checklist items scored: P purpose (first sentence 4 or more words), W when to use, N when not or sibling pointer, I every input property has a description, O says what is returned (text or `outputSchema`), E states a failure, limit, side effect or requirement, L length (at least 3 sentences and at most 4,096 characters, the two sourced bounds).

| Server | Tools | P | W | N | I | O (text only) | E | L | All 7 | Description chars min / median / max | With title | With `outputSchema` |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| grim 0.16.0 | 5 | 5 | 0 | 0 | 5 | 4 (4) | 4 | 5 | 0 | 291 / 445 / 1018 | 0 | 0 |
| ref filesystem | 16 | 16 | 6 | 4 | 16 | 16 (11) | 13 | 15 | 2 | 85 / 321 / 693 | 16 | 16 |
| ref memory | 9 | 9 | 6 | 6 | 9 | 9 (4) | 4 | 5 | 4 | 64 / 296 / 389 | 9 | 9 |
| ref sequentialthinking | 1 | 1 | 1 | 0 | 1 | 1 (0) | 0 | 1 | 0 | 1009 | 1 | 1 |
| ref git | 14 | 12 | 0 | 0 | 2 | 1 (1) | 1 | 0 | 0 | 17 / 49 / 288 | 0 | 0 |
| ref fetch | 1 | 1 | 0 | 0 | 1 | 1 (1) | 1 | 1 | 0 | 307 | 0 | 0 |
| ref time | 3 | 3 | 0 | 0 | 3 | 3 (0) | 0 | 0 | 0 | 30 / 39 / 90 | 0 | 3 |
| Reference servers combined | 44 | 42 | 13 | 10 | 32 | 31 (17) | 19 | 22 | 6 | 17 / 241 / 1009 | 26 | 29 |
| GitHub (snapshots) | 151 | 150 | 21 | 4 | 147 | 144 (14) | 19 | 28 | 0 | 17 / 79 / 1115 | 151 (as `annotations.title`) | 143 |

Reading the table: only the memory server passes all seven items on more than a third of its tools (4 of 9), and GitHub passes on none; "when to use" and "when not to use" are the weakest items everywhere (grim 0 of 5, GitHub 21 and 4 of 151). GitHub keeps descriptions short (median 79 characters; 123 of 151 under 3 sentences) and moves guidance into parameter descriptions, for example `actions_get.resource_id` explains per-`method` meaning in a bulleted parameter description. No description in any server exceeds 4,096 characters (maximum 1,115).

**grim (5 tools; `title` and `outputSchema` absent on all).** Names are `grim_<verb>`. Description length is in characters; `*` marks required.

| Tool | Description chars | Input properties |
|---|---|---|
| `grim_search` | 1018 | `query`, `kind`, `limit`, `offset`, `refresh`, `global`, `config`, `workspace` |
| `grim_status` | 822 | `check`, `global`, `config`, `workspace` |
| `grim_fetch` | 445 | `ref*`, `vendor`, `path`, `description`, `digest_only`, `global`, `config`, `workspace` |
| `grim_describe` | 406 | `ref*`, `global`, `config`, `workspace` |
| `grim_render` | 291 | `ref*`, `vendor*`, `dest_dir*`, `global`, `config`, `workspace` (registered only with `--allow-writes`) |

grim observations: (a) `grim_search` states return shape, pagination arithmetic (`offset + items.length` below `total`), a size warning ("tens of megabytes unbounded") and that the browse filter can hide a package that is still installable by direct reference; this is the strongest description measured. (b) No grim description says when to use it or what to use instead; `grim_fetch` and `grim_describe` overlap (describe is metadata only, fetch is content) and the description of `grim_describe` says "without downloading its content" but never points to `grim_fetch`. (c) The scope triple `global`/`config`/`workspace` repeats in all 5 tools (15 of the 30 properties across the 5 tools), a parameter-description cost on every call. (d) `ref` is documented with three accepted forms and a default tag, good. (e) The source documents deliberate omissions (no `registry` parameter, SSRF/CWE-918) in code comments only; the agent-facing description says "Scope params only select which registries are consulted" but not that no registry override exists. (f) Tests pin description claims: `grim_status_description_states_the_write_gate` and `grim_search_description_discloses_browse_filter` in `server.rs`. (g) Error channel, probed with `grim mcp` 0.16.0 on 2026-11-27: an invalid argument (`limit: "abc"`) returns a result with `isError: true` and the text `failed to deserialize parameters: invalid type: string "abc", expected a nonzero usize`; a lookup of a nonexistent reference fails with JSON-RPC `-32603` and text `describe failed: ghcr.io/grimoire-rs/nonexistent/zzz-not-real: registry authentication failed: Not authorized: url https://ghcr.io/v2/grimoire-rs/nonexistent/zzz-not-real/tags/list`. The server code maps every command error to `ErrorData::internal_error` (`tool_error` in `server.rs`), which the spec classes as a protocol error; the message also does not say how to recover (check the reference spelling, or run `grim_search`).

**Reference servers (44 tools).** Per-tool rows (P W N I O E L; a dot is a fail). Titles are present only on the TypeScript servers.

| Tool | Title | Chars | Params | Items |
|---|---|---|---|---|
| `read_file` | Read File (Deprecated) | 85 | 3 | P.NIO.. |
| `read_text_file` | Read Text File | 457 | 3 | PW.IOEL |
| `read_media_file` | Read Media File | 234 | 1 | P..IOEL |
| `read_multiple_files` | Read Multiple Files | 324 | 1 | PW.IOEL |
| `write_file` | Write File | 228 | 2 | P..IOEL |
| `append_file` | Append File | 316 | 2 | P..IOEL |
| `edit_file` | Edit File | 693 | 3 | P..IOEL |
| `create_directory` | Create Directory | 310 | 1 | P..IOEL |
| `list_directory` | List Directory | 344 | 1 | PWNIOEL |
| `list_directory_with_sizes` | List Directory with Sizes | 364 | 2 | PWNIOEL |
| `directory_tree` | Directory Tree | 474 | 3 | P..IOEL |
| `move_file` | Move File | 325 | 2 | P..IOEL |
| `copy_file` | Copy File | 318 | 2 | P..IOEL |
| `search_files` | Search Files | 473 | 3 | PWNIO.L |
| `get_file_info` | Get File Info | 312 | 1 | P..IOEL |
| `list_allowed_directories` | List Allowed Directories | 248 | 0 | PW.IO.L |
| `create_entities` | Create Entities | 296 | 1 | PWNIOEL |
| `create_relations` | Create Relations | 106 | 1 | P..IO.. |
| `add_observations` | Add Observations | 64 | 1 | P..IO.. |
| `delete_entities` | Delete Entities | 328 | 1 | PWNIOEL |
| `delete_observations` | Delete Observations | 65 | 1 | P..IO.. |
| `delete_relations` | Delete Relations | 378 | 1 | PWNIOEL |
| `read_graph` | Read Graph | 266 | 2 | PWNIO.. |
| `search_nodes` | Search Nodes | 389 | 3 | PWNIO.L |
| `open_nodes` | Open Nodes | 373 | 2 | PWNIOEL |
| `sequentialthinking` | Sequential Thinking | 1009 | 9 | PW.IO.L |
| `git_status` | none | 29 | 1 | P...... |
| `git_diff_unstaged` | none | 62 | 2 | P...... |
| `git_diff_staged` | none | 40 | 2 | P...... |
| `git_diff` | none | 105 | 3 | P...... |
| `git_commit` | none | 33 | 2 | P...... |
| `git_add` | none | 38 | 2 | P...... |
| `git_reset` | none | 27 | 1 | P...... |
| `git_log` | none | 288 | 4 | P...O.. |
| `git_create_branch` | none | 59 | 3 | P...... |
| `git_checkout` | none | 17 | 2 | ....... |
| `git_merge` | none | 191 | 3 | P....E. |
| `git_show` | none | 84 | 2 | P...... |
| `git_branch` | none | 17 | 4 | ...I... |
| `git_remote` | none | 214 | 1 | P..I... |
| `fetch` | none | 307 | 5 | P..IOEL |
| `get_current_time` | none | 39 | 1 | P..IO.. |
| `convert_time` | none | 30 | 3 | P..IO.. |
| `get_time_ago` | none | 90 | 5 | P..IO.. |

Reference-server observations: the TypeScript servers were rewritten toward the checklist in 2026 (source comments cite issues, for example the `git_log` description change references issue #5552 about small models misreading the old one-line text; `list_directory` and `search_files` state what they do not do and name the sibling); the Python git server still has 14 one-line descriptions (median 49 characters) and parameter schemas with only an auto-generated `title` for `repo_path`. `read_file` keeps a deprecation notice inside the description ("DEPRECATED: Use read_text_file instead") instead of removing the tool, a usable deprecation pattern. Memory's `create_entities` and `delete_entities` state idempotence and irreversibility ("Cannot be undone").

**GitHub (151 snapshot tools; 102 documented per toolset in the README; 49 in the five default toolsets `context`, `issues`, `pull_requests`, `repos`, `users`).** README counts were taken by counting bullet entries per toolset section in `README.md` at `7edc2dd`; the gap to 151 is feature-flagged, granular and deprecated variants. All names are `snake_case`, 0 of 151 have a `github_` prefix, maximum name length 53. 21 tools take a `method` selector (for example `actions_get`, `issue_read`, `projects_write`), the result of consolidating many `get_*` tools; the repo's `docs/tool-renaming.md` sets a deprecation alias map so old names keep resolving (its table lists renames such as `get_workflow_run` to `actions_get`). 32 of 830 input properties (3.9%) are bare ambiguous names (`name` 9, `query` 8, `path` 7, `type` 7, `user` 1). Built-in lints in the repo: no top-level `anyOf`/`oneOf`/`allOf` in any input schema "because some providers reject an entire `tools/list` payload", canonical pagination spelling (`page`, `perPage`, `after`, `before`) after a documented bug where `actions_list` advertised `per_page` for months and the value was ignored, no duplicate tool names, and a required `readOnlyHint` (annotations are out of scope here).

### 3. Naming and namespacing

Decision. Tool names are lowercase `snake_case` made of `[a-z0-9_]`, shaped `<verb>_<object>` or `<product>_<verb>`; when a server may be aggregated with others, the first token is a product or resource namespace; when a name is a bare generic verb (`search`, `fetch`, `get`, `list`, `run`, `query`), it is prefixed. Reasons: the Claude API forbids `.`, the spec allows it; spec tells aggregating clients to prefix server identifiers because the server name is not unique, so a self-prefixed name survives both client behaviours; Anthropic and tool-search docs report that consistent prefixes make one search match a whole group; measured practice is `snake_case` in 209 of 209 tools. `title` is optional in the spec; it is cheap for human UIs and absent in 0 of 5 grim tools (annotation-level titles are out of scope).

Full-name length. Claude Code builds `mcp__<server>__<tool>` and reports a name over 128 characters as an error ([Claude Code docs](https://code.claude.com/docs/en/mcp)); measured maximum tool name length is 53, so 128 is not a practical constraint, but long server keys plus long names can reach it.

Renames. Treat a published tool name as an API: GitHub keeps a deprecation alias map so a rename never breaks a stored allowlist (`docs/tool-renaming.md`). The MCP side is `listChanged`; a rename without an alias breaks every saved allowlist and `--tools` flag.

### 4. The description checklist

Each item below is one line a reviewer applies per tool. Detect lines are executable against `tools/list` output (`jq`) or read by the named heuristic.

| # | Item | Pass means | Detect | Source of the requirement |
|---|---|---|---|---|
| D1 | Purpose first | The first sentence names the operation and the object, in 4 or more words, and says what it changes if it changes anything. | `jq -r '.[]\|.name+": "+(.description\|split(".")[0])'`; fail if under 4 words or if it names no object. Pass: "Find files and directories by NAME, not by content" (`search_files`). Fail: "Switches branches" (`git_checkout`, 17 characters, no object, does not say it modifies the working tree). | [Claude API docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools); 56% unclear in [2602.14878](https://arxiv.org/html/2602.14878v1) |
| D2 | When to use | A sentence starting "Use this when" (or equivalent) names the trigger or the input the caller has. | `jq -r '.[]\|select(.description\|test("[Uu]se (this\|it) (when\|for\|to)\|when you\|call this\|if you need")\|not)\|.name'` lists failures. Pass: "Use this when you already know the names" (`open_nodes`). Fail: "Records changes to the repository" (`git_commit`). | Claude API docs; OpenAI docs; 89.3% missing usage guidelines |
| D3 | When not to use, or sibling pointer | Names the sibling tool or the case to avoid: "not for", "instead", "rather than", "prefer X", or the exact name of another tool. | For each description, grep for another tool's name or `not for\|instead\|rather than\|prefer`. Pass: "to remove a link between two entities and keep both, use delete_relations" (`delete_entities`). Fail: `grim_describe` and `grim_fetch` overlap and neither points to the other. | Claude API docs "(and when it shouldn't)" |
| D4 | Inputs | Every property has a description stating meaning, format or unit, and an example for non-obvious formats; closed sets use `enum`; required fields are marked `required`. | `jq '.[]\|select([.inputSchema.properties[]?\|select((.description//"")=="")]\|length>0)\|.name'` must print nothing. Fail: git `repo_path` carries only `"title": "Repo Path"`. | Claude API docs; Anthropic post; [tool search docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool) (argument descriptions are searched) |
| D5 | Outputs | Says what comes back and its shape (fields, units, ordering, pagination markers); if structured, declares `outputSchema` and returns conforming `structuredContent` plus the serialized JSON text. | `jq '.[]\|select(.outputSchema==null and (.description\|test("[Rr]eturns?")\|not))\|.name'`. Pass: `grim_search` ("a JSON object with an `items` array ... plus `total` ... and `truncated`"). Fail: GitHub `list_branches` (no output statement, no schema). | Spec (outputSchema MUST conform); Claude API good-description example ("will return the latest trade price in USD") |
| D6 | Limits, side effects and failure | States preconditions (network, auth, write gate), size caps and truncation, overwrites, irreversibility, idempotence, and what an error looks like. | Read for these words: `requires`, `capped`, `truncated`, `overwrite`, `cannot be undone`, `already exists`, `fails`. Pass: "If the destination exists, the operation will fail: it never overwrites" (`copy_file`). Fail: `git_commit`, `git_reset` ("Unstages all staged changes", silent about scope). | Claude API docs "caveats or limitations"; 89.8% missing limitations; spec stateful-tools retention rule |
| D7 | Length and order | At least 3 sentences, at most 4,096 characters (2,048 for older Claude Code installs); discriminating words and the "when" clause in the first 2,048 characters. | `jq '.[]\|select((.description\|length)>2048)\|.name+" "+(.description\|length\|tostring)'`; sentence count by splitting on `. `. Measured maximum is 1,115, so 0 failures on the cap and 28 of 151 GitHub tools pass the 3-sentence floor. | [Claude Code docs](https://code.claude.com/docs/en/mcp); Claude API docs |
| D8 | Errors reach the model | Failures the caller can fix (bad argument, unknown reference, missing auth, rate limit) return `isError: true` with a message that names the fix; protocol errors only for unknown tool and malformed request. | Call each tool once with a wrong argument and once with an unknown reference; the response must be a result with `isError: true`. Fail (measured): grim unknown reference returns JSON-RPC `-32603`, with no recovery hint. | [MCP spec](https://modelcontextprotocol.io/specification/latest/server/tools); Anthropic post |
| D9 | Claims are pinned by tests | Every safety or behaviour claim in a description (write gate, filter, cap) is asserted by a unit test on the registered description. | `grep -rn "description" tests/` for each claim; grim has 2. | Measured pattern in grim (`server.rs`); description-code inconsistency risk (see Not verified) |

Excluded by design: negative-phrasing hygiene for skill descriptions (workflow-verb ban, third person) applies to skills, not tools; it is covered in `ai-config-authoring` and not restated. Also excluded: examples, because evidence conflicts (see Contested); a tool whose parameters are format-sensitive MAY ship `input_examples` where the client supports them.

### 5. Tool count

Sources, with whose data each is:

| Claim | Number | Source type | Date |
|---|---|---|---|
| Aim for fewer than this many functions at the start of a turn (soft) | 20 | Platform docs (OpenAI) | undated, fetched 2026-11-27 |
| Claude's tool selection accuracy degrades past | 30 to 50 tools | Platform docs (Anthropic, vendor claim, no study cited) | undated, fetched 2026-11-27 |
| Use tool search when | 10 or more tools, or definitions over 10k tokens | Platform docs (Anthropic) | undated |
| Five MCP servers, 58 tools cost about | 55K tokens before work | Vendor engineering post | 2025-11-24 |
| Tool search accuracy, Opus 4 / Opus 4.5 (vendor data) | 49% to 74%; 79.5% to 88.1% | Vendor engineering post | 2025-11-24 |
| GitHub Copilot in VS Code built-in tools | about 40 to 13 core, rest grouped virtual | Vendor blog (GitHub) | 2025-11-19 |
| Claude Code per-server tool cap | none; limit is context budget | Platform docs | fetched 2026-11-27 |

Measured inventories: grim 5 tools (about 3,275 tokens of `tools/list` JSON by bytes/4, an estimate); reference filesystem 16 (4,842); memory 9 (3,733); git 14 (2,014); GitHub 151 snapshot tools (82,654). The bytes/4 rule is a rough heuristic, not a tokenizer.

Decision basis: there is no authoritative cap, only three soft numbers (under 10 to skip tool search, under 20 to start a turn, 30 to 50 accuracy knee) and one cost number (about 1 tool definition per roughly 950 tokens at 58 tools/55K). A server author cannot know how many other servers the caller loads, so the only defensible rule is a default-registered budget with an opt-in way to widen it, plus accurate `server instructions` so deferred loading finds the tools.

### 6. Routing to existing catalog skills

| Concern | Already covered by | Action for the new rule |
|---|---|---|
| Description formula for skills and agents: what plus "Use when", negative scope, front-loading, third person, workflow-verb ban, 1,024-character skill cap | `ai-config-authoring` `references/descriptions.md` (its "Further reading" already links Anthropic's tools post as "the same description craft applied to tool definitions") | Reference it; do not restate. State only that the 1,024-character cap is the Agent Skills limit, not an MCP tool limit (Claude Code's tool limits are 4,096 and 16,384). |
| MCP descriptor files (`description` becomes the OCI description annotation, required, non-empty) | `grim-authoring` `references/mcp-spec.md` | The registration blurb is a different field from each tool's description; the new rule must say so. |
| Tool names, 7-item tool checklist, tool count, error channel | Neither skill | New rule owns them. |
| Annotations, approval, write gating | UX-ACT `agent-action-approval` | Out of scope; cross-reference one line. |
| Response size, truncation, pagination shape | Another UX-AGENT topic (not read here) | One-line pointer only: Claude Code limits are listed in Dated facts. |

## Normative guidance candidates

Severity key: MUST (breaks callers or violates a normative source), SHOULD (measured gap against a cited source), CONSIDER (evidence is mixed).

1. **MUST** Name each tool with only `[a-z0-9_]`, 1 to 128 characters, unique within the server. Rationale: the intersection of the MCP spec and the Claude API regex (`.` is spec-valid but API-invalid). Verify: `jq -r '.[].name' tools.json | grep -vE '^[a-z0-9_]{1,128}$'` prints nothing; `jq -r '.[].name' tools.json | sort | uniq -d` prints nothing.
2. **SHOULD** Use `<verb>_<object>` order or `<product>_<verb>`, in one case style across the server. Rationale: measured 209 of 209 are snake_case; mixed styles defeat prefix matching in tool search. Verify: all names match `^[a-z]+(_[a-z0-9]+)+$`, or are a single distinctive word.
3. **SHOULD** Prefix any name that is only a generic verb (`search`, `fetch`, `get`, `list`, `run`, `query`, `read`) with the product or resource name. Rationale: aggregating clients see collisions (the spec names `search` as its example) and 73% of servers in the 10,831-server preprint repeat tool names ([2602.18914](https://arxiv.org/abs/2602.18914)). Verify: `jq -r '.[].name' tools.json | grep -xE 'search|fetch|get|list|run|query|read|create|delete|update'` prints nothing.
4. **SHOULD** Keep `len("mcp__" + server_key + "__" + tool_name)` at or below 128. Rationale: Claude Code reports longer names as an error. Verify: compute the length for every tool in the shipped server config.
5. **SHOULD** Name parameters so each is unambiguous without the tool name: prefer `repo_path`, `user_id`, `dest_dir` over `path`, `user`, `dir`, and keep one spelling for the same concept across tools (pagination: `limit`/`offset` or `page`/`perPage`, not a mix). Rationale: Anthropic's `user_id` rule; GitHub shipped a pagination name its handler ignored for months. Verify: list property names across tools (`jq -r '.[].inputSchema.properties|keys[]' | sort | uniq -c`); every bare `id|name|type|user|path|query|key|data` has a description that disambiguates.
6. **SHOULD** Keep a renamed or removed tool name resolvable for at least one release through a deprecation alias, and list the rename in the changelog. Rationale: stored allowlists and `--tools` flags break otherwise. Verify: diff `tools/list` names between the previous and current release; every removed name appears in the alias map.
7. **MUST** Give every tool a description that passes D1, D4, D5 and D6; **SHOULD** pass D2, D3, D7, D8 and D9. Rationale: the description is the main lever Anthropic reports; 97.1% of measured tools have a smell. Verify: the Detect line of each item in the checklist table, per tool.
8. **MUST** Describe every input property (`description` non-empty), mark required fields in `required`, and use `enum` for closed value sets. Rationale: tool search indexes argument descriptions; OpenAI says to prevent invalid states with enums. Verify: `jq '.[]|select([.inputSchema.properties[]?|select((.description//"")=="")]|length>0)|.name' tools.json` prints nothing; `jq` for `type: "string"` properties whose description lists a fixed value set and lacks `enum`.
9. **MUST** Use `{"type":"object","additionalProperties":false}` as the schema of a tool with no parameters, and never `null`. Rationale: spec marks it Recommended and `inputSchema` MUST be an object. Verify: `jq '.[]|select(.inputSchema==null)|.name'` prints nothing. Measured: `get_me` (GitHub) and `list_allowed_directories` (filesystem) use `properties: {}` instead, which the spec also allows.
10. **MUST NOT** use `anyOf`, `oneOf` or `allOf` at the top level of an input schema; **SHOULD** put cross-field constraints in the handler and say them in the description. Rationale: GitHub's lint comment states some providers reject the whole `tools/list`. Verify: `jq '.[]|select(.inputSchema|has("anyOf") or has("oneOf") or has("allOf"))|.name'` prints nothing.
11. **SHOULD** Return execution failures as `isError: true` results whose text names the cause and the next call or input to try; **MUST NOT** use JSON-RPC errors for failures the caller can fix. Rationale: the spec says clients SHOULD pass execution errors to the model, and protocol errors "are less likely to result in successful recovery". Verify: probe each tool with a bad argument and an unknown reference; assert `isError == true` and a non-empty recovery clause (D8).
12. **SHOULD** Keep each tool description at or under 2,048 characters and put the purpose, the "use when" sentence and the discriminating keywords first. Rationale: Claude Code cuts at 4,096 (2,048 before v2.1.296) and tool search reads only the shorter limit. Verify: D7 `jq` line; read the first 2,048 characters and confirm D1 and D2 appear.
13. **SHOULD** Register at most 20 tools by default and offer an allowlist flag (for example `--tools` or `--toolsets`) to widen or narrow; **SHOULD** keep the default set at 10 or fewer where the work allows. Rationale: OpenAI's soft 20; Anthropic's under-10 point to skip tool search; GitHub's default toolsets exist for this reason. Verify: `jq 'length' tools.json` for the default launch command.
14. **SHOULD** Consolidate tools that are always called in sequence or that differ only by a verb on the same object into one tool with an enum selector, when each selector value has its own described parameters; **SHOULD NOT** when a single shared parameter changes meaning by selector (as GitHub `actions_get.resource_id`). Rationale: Anthropic and OpenAI consolidation advice versus OpenAI's enum-for-invalid-states rule. Verify: count tools sharing a first token; read the shared parameter's description for "varies by".
15. **SHOULD** Pin every behavioural or safety claim made in a description with a test that reads the registered description (grim's two tests are the model), and snapshot `tools/list` so a schema or description change is a reviewed diff. Rationale: descriptions drift from code; GitHub snapshots every tool in `__toolsnaps__`. Verify: `grep -rn "description" <test dir>` finds an assertion per claim; the snapshot test fails on an unreviewed change.
16. **SHOULD** Make `tools/list` order deterministic. Rationale: spec SHOULD; cache and prompt-cache hits. Verify: call `tools/list` twice and `diff` the two names lists.
17. **SHOULD** State state-handle lifetime in the description of the tool that creates the handle. Rationale: spec non-normative guidance. Verify: for any tool returning an id used by later tools, the description contains an expiry statement.
18. **CONSIDER** Set `title` on every tool and add `response_format`-style `concise`/`detailed` where responses are large. Rationale: spec optional field; Anthropic's 206 vs 72 token example (vendor). Verify: `jq '.[]|select(.title==null)|.name'`.
19. **CONSIDER** Add `input_examples` only to tools with format-sensitive or nested inputs and keep to 1 to 5 realistic examples. Rationale: vendor internal test reports 72% to 90% on complex parameter handling ([advanced tool use](https://www.anthropic.com/engineering/advanced-tool-use), 2025-11-24, vendor data) but OpenAI notes examples may hurt reasoning models. Verify: each example validates against the tool's `inputSchema`; the Claude API 400s on most invalid ones.

## What an agent must not decide alone

- Renaming or removing a published tool (breaks stored allowlists and prompts for every caller): ask the owner, and propose the alias.
- Which operations belong in the default-registered set versus behind a flag, and whether a write tool exists at all: a product and risk decision (the approval design is UX-ACT).
- Whether to ship a tool-selection eval before a release, and its budget (see next section).
- Whether a description may promise behaviour the code does not yet guarantee (for example "never overwrites"): ask the owner, or make the test and description change together.
- Wording that makes a legal, security or pricing claim inside a description (for example "no data leaves your machine"): route to the owner.
- Whether to expose a registry, host or path override parameter: grim deliberately has none (SSRF, CWE-918); adding one is a security decision.

## Open question: release eval

The commission measured no tool-selection accuracy, on purpose. Question for the owner: is a release eval warranted, and how large?

- Evidence for effect sizes: description augmentation moved task success by a median 5.85 percentage points with regression in 16.67% of cases ([2602.14878](https://arxiv.org/abs/2602.14878)); Anthropic's tool-search figures are +8.6 and +25 points (vendor data).
- My arithmetic (two-proportion normal approximation, alpha 0.05 two-sided, power 80%, unpaired; not from a source): detecting 5.85 points near a 70% baseline needs about 900 tasks per arm; at 50 tasks per arm only about a 22-point difference is detectable; at 100 per arm about 16.5 points. A paired design reduces this but the reduction was not computed.
- Position: a small eval cannot support a "this description is better" claim, so it must not be written into a rule as a pass gate. A small eval can still serve as a regression tripwire (does a fixed task set still select the expected tool, is any task's outcome flipped by a change), which needs no significance claim.
- Minimum size if the owner wants a tripwire: one task per tool plus one adversarial neighbour task per sibling pair (for grim, 5 plus 2 for the describe/fetch pair, about 7 tasks, each run 3 times); the number is a suggestion, unsupported by a source.

## AI-agent angle

| Characteristic mistake | Why it occurs | Smallest mechanical check |
|---|---|---|
| Writes a one-line description from the function name ("Gets the stock price for a ticker.") | Docstring habit; this is the exact poor example in Claude API docs | D1 plus D2 plus D6 `jq` lines; fail on fewer than 3 sentences |
| Leaves parameter descriptions empty or auto-generated | Schema libraries fill `title` only (measured on git `repo_path`) | D4 `jq` check |
| Mixes naming styles or uses a bare verb (`search`) | Copies generic names from examples | Naming rules 1 to 3 grep lines |
| Pads descriptions with marketing or workflow prose, or copies skill-style "Use when" with second person | Cross-training from skill descriptions | Read first 2,048 characters; D1 and D2 must hold; route style to `ai-config-authoring` |
| Claims behaviour the code lacks, or leaves a description stale after a code change | No coupling between description and code | D9 test; snapshot diff on `tools/list` |
| Returns protocol errors for user-fixable failures | Maps `anyhow` errors straight to JSON-RPC (measured in grim `tool_error`) | D8 probe |
| Adds a tool per endpoint, then 100 tools | Wrapper-per-endpoint pattern Anthropic warns against | Rule 13 count; `jq 'length'` |
| Uses top-level `oneOf` to express "either A or B" | Natural JSON Schema idiom | Rule 10 `jq` check |

## Contested / evolving

1. **Consolidate or split.** Anthropic's post and the Claude API docs say to group `create_pr`, `review_pr`, `merge_pr` into one tool with an `action` parameter ([define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)); OpenAI says to combine functions always called in sequence but also to "use enums and object structure to prevent invalid states" ([OpenAI](https://developers.openai.com/api/docs/guides/function-calling)). GitHub moved 21 tools to a `method` selector yet keeps a feature-flagged granular family (`issues_granular`, `pull_requests_granular`, e.g. `update_issue_title`, `update_issue_state`) beside them (`tools.go`, `__toolsnaps__`), and a selector tool whose `resource_id` "will vary based on the method" puts a per-method contract in one prose parameter. No study compared the two. Trend: consolidation, with granular variants kept behind flags for reliability.
2. **Prefix or no prefix.** Anthropic and tool-search docs recommend prefixing and say prefix versus suffix "can have non-trivial effects" and should be tested ([post](https://www.anthropic.com/engineering/writing-tools-for-agents)); GitHub ships no product prefix, relying on the client's `mcp__server__` composition; the spec expects aggregators to prefix. Both are workable in Claude Code; the prefix helps in clients that flatten names.
3. **How long a description should be.** Anthropic: "extremely detailed", at least 3 to 4 sentences. The preprint: full augmentation costs +67.46% steps and regressed 16.67% of cases; compact variants were statistically equivalent ([2602.14878](https://arxiv.org/html/2602.14878v1)). GitHub's median is 79 characters with guidance in parameters. Trend: purpose, when, and limits are worth their tokens; examples are the cheapest component to drop.
4. **Examples.** Anthropic reports a 72% to 90% gain from `input_examples` on complex parameter handling (vendor internal test, 2025-11-24); OpenAI notes examples may hurt reasoning models; the preprint found removing examples did not hurt.
5. **How many tools.** OpenAI under 20 (soft), Anthropic accuracy knee at 30 to 50 and under 10 to skip tool search, Claude Code no cap, GitHub 151 in one server with toolsets. Tool search weakens all the numeric limits for clients that support it; the numbers still bind clients without it. A "128 tools per chat request" cap in VS Code appears in search results but was not found on the VS Code tools page I fetched (see Not verified).
6. **Dot in names.** The MCP spec lists `.` as an allowed character (its example is `admin.tools.list`); the Claude API regex omits it. Until the two agree, the intersection is the rule.

## Dated facts

| Fact | Value | Source | Source date | Source type |
|---|---|---|---|---|
| MCP tool name constraints | SHOULD be 1 to 128 chars, `A-Za-z0-9_-.`, unique per server | [MCP spec tools page](https://modelcontextprotocol.io/specification/latest/server/tools) | revision links read 2026-07-28; fetched 2026-11-27 | Authority (protocol) |
| No-parameter schema | `{"type":"object","additionalProperties":false}` Recommended | same | same | Authority |
| `tools/list` order | SHOULD be deterministic | same | same | Authority |
| Claude API name regex | `^[a-zA-Z0-9_-]{1,128}$` | [Define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools) | undated, fetched 2026-11-27 | Platform |
| Description sentence floor | at least 3 to 4 sentences per tool | same | same | Platform guidance |
| `input_examples` cost | about 100 tokens flat, 200 nested | same | same | Platform |
| Claude Code description cut | 4,096 chars (server instructions, upfront tools); 16,384 (tool-search tools); 2,048 before v2.1.296 | [Claude Code MCP docs](https://code.claude.com/docs/en/mcp) | undated, fetched 2026-11-27 | Platform |
| Claude Code env override | `CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH`, v2.1.280 or later | same | same | Platform |
| MCP output limits in Claude Code | warn above 10,000 tokens; default max 25,000; file above 50,000 chars | same | same | Platform |
| Tool search match scope | names, descriptions, argument names, argument descriptions | [Tool search](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool) | undated, fetched 2026-11-27 | Platform |
| Tool search thresholds | 10 or more tools or over 10k tokens; accuracy knee 30 to 50 tools; 3 to 5 tools kept non-deferred; regex pattern max 200 chars, BM25 query max 500 | same | same | Platform (vendor claim) |
| OpenAI tool count | fewer than 20, soft | [OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling) | undated, fetched 2026-11-27 | Platform |
| Writing tools post | consolidation, namespacing, `response_format`, 25,000-token default | [Anthropic engineering](https://www.anthropic.com/engineering/writing-tools-for-agents) | 2025-09-11 | Vendor |
| 58 tools cost | about 55K tokens; tool search 77K to 8.7K; Opus 4 49% to 74%; Opus 4.5 79.5% to 88.1%; examples 72% to 90% | [Advanced tool use](https://www.anthropic.com/engineering/advanced-tool-use) | 2025-11-24 | Vendor data |
| Description smells | 97.1% of 856 tools; purpose 56%; guidelines 89.3%; limitations 89.8%; parameters 84.3%; length 79.1%; examples 77.9%; +5.85 points median; +67.46% steps; 16.67% regress | [arXiv 2602.14878](https://arxiv.org/abs/2602.14878) | v1 2026-02-16; v3 2026-05-31 | Independent preprint |
| Repeated tool names | 73% of 10,831 servers; 72% vs 20% selection | [arXiv 2602.18914](https://arxiv.org/abs/2602.18914) | 2026-02-21 | Independent preprint |
| VS Code toolset guidance | "Limit enabled tools to the capabilities that are relevant to your task" | [VS Code tools concepts](https://code.visualstudio.com/docs/agents/concepts/tools) | page shows 11/25/2026 | Platform |
| GitHub Copilot tool reduction | about 40 to 13 core tools; embedding routing coverage 94.5% vs 87.5% vs 69.0% | [GitHub blog](https://github.blog/ai-and-ml/github-copilot/how-were-making-github-copilot-smarter-with-fewer-tools/) | 2025-11-19 | Vendor data |
| Skill description cap (not a tool cap) | 1 to 1,024 chars | `ai-config-authoring` `references/descriptions.md` (cites agentskills.io) | "as of 2026; re-verify" | Catalog skill, secondary |
| GitHub server inventory | 151 tool snapshots, 49 documented in default toolsets | [github-mcp-server](https://github.com/github/github-mcp-server) at `7edc2dd` | 2026-11-25 | Measured |
| Reference servers | 44 tools across 6 servers (excluding `everything`) | [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) at `b502fd9` | 2026-11-27 | Measured |
| grim MCP tools | 5 with `--allow-writes`, 4 without | grim 0.16.0 binary and `src/mcp/server.rs` | probed 2026-11-27 | Measured |

## Not fetched or not verified

- A "128 tools per request" limit in VS Code Copilot Chat appeared only in search snippets and third-party posts (one claims it was removed); the official VS Code tools page I fetched does not state it. Not used in any rule.
- A third preprint on description-code inconsistency across 10,240 MCP servers ([arXiv 2602.03580](https://arxiv.org/html/2602.03580)) appeared in search results and was not opened; it motivates D9 but no rule rests on it.
- The `ai-config-authoring` description reference cites a "650-trial" activation study and an "~50% activation" baseline for skills; I did not verify them and did not use them for tools.
- Claude Code descriptions and instructions from some Anthropic-hosted MCP servers reach the model in full and are exempt from the cut, per its docs; not measured.
- No tool-selection accuracy was measured (commission instruction).
- grim's source tree is not a git checkout, so no commit hash is recorded; version 0.16.0 comes from the binary.
- Cross-territory: a page-level count of how agent-facing CLI help text compares with these tool descriptions was not attempted; it belongs with the CLI interaction topic.

## Sources

| URL | What it is | Date / era | Why worth reading |
|---|---|---|---|
| https://modelcontextprotocol.io/specification/latest/server/tools | MCP tools specification (primary) | revision 2026-07-28, fetched 2026-11-27 | Field definitions, name rules, error classes, no-param schema, ordering |
| https://www.anthropic.com/engineering/writing-tools-for-agents | Anthropic engineering post (primary, vendor) | 2025-09-11 | Consolidation, namespacing, response format, errors |
| https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools | Claude API tool definition docs (primary) | undated, fetched 2026-11-27 | Name regex, 3 to 4 sentence floor, good and poor examples |
| https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool | Claude tool search docs (primary) | undated, fetched 2026-11-27 | Count thresholds, what tool search indexes |
| https://code.claude.com/docs/en/mcp | Claude Code MCP docs (primary) | undated, fetched 2026-11-27 | Description cut limits, output limits, tool search for authors |
| https://www.anthropic.com/engineering/advanced-tool-use | Anthropic engineering post (primary, vendor data) | 2025-11-24 | Token cost and accuracy numbers, examples |
| https://developers.openai.com/api/docs/guides/function-calling | OpenAI function calling docs (primary) | undated, fetched 2026-11-27 | Under 20 tools, enums, offload known arguments |
| https://arxiv.org/abs/2602.14878 | Description smells study (independent preprint) | 2026-02-16, rev 2026-05-31 | Rubric and effect sizes |
| https://arxiv.org/html/2602.14878v1 | Full text of the same study | v1 | Per-component failure rates, compact variants |
| https://arxiv.org/abs/2602.18914 | Smell-aware evaluation, 10,831 servers (independent preprint) | 2026-02-21 | Repeated names, selection effect |
| https://github.com/modelcontextprotocol/servers | Reference MCP servers (primary, measured) | commit `b502fd9`, 2026-11-27 | Real descriptions and schemas |
| https://github.com/github/github-mcp-server | GitHub's MCP server (primary, measured) | commit `7edc2dd`, 2026-11-25 | 151 snapshots, lints, rename alias doc, toolsets |
| https://github.blog/ai-and-ml/github-copilot/how-were-making-github-copilot-smarter-with-fewer-tools/ | GitHub Copilot tool reduction (vendor data) | 2025-11-19 | 40 to 13 tools, routing |
| https://code.visualstudio.com/docs/agents/concepts/tools | VS Code tools concepts (platform) | page shows 11/25/2026 | Focused tool set guidance |
| `/home/mherwig/dev/grimoire-rs/grimoire/src/mcp/server.rs` and `tool_args.rs` | grim MCP server source (primary, measured) | grim 0.16.0 | Names, descriptions, schemas, tests, error mapping |
| `/home/mherwig/dev/grimoire-rs/grimoire/catalog/skills/ai-config-authoring/references/descriptions.md` | Catalog skill (primary) | as of 2026 | Description craft already set; routing |
| `/home/mherwig/dev/grimoire-rs/grimoire/catalog/skills/grim-authoring/references/mcp-spec.md` | Catalog skill (primary) | grim 0.16.0 era | MCP descriptor `description` is a different field |
| `~/.cache/research-lang/exemplars/product/tool-names/` (scratch: `servers/`, `gh/`) | Clones and captured `tools/list` JSON | 2026-11-27 | Reproduces every count above |

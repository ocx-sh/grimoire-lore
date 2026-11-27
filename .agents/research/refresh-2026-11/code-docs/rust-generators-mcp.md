---
title: Delta - clap, schemars, rmcp and MCP specification doc-text behaviour
pair: code-docs
date_researched: 2026-11-27
window_start: 2026-09-27
model: sonnet
sources_fetched: 9
---

# Delta: what generators copy into help, schemas and tool lists

Scope: changes between 2026-09-27 and 2026-11-27 only. Every upstream source below was opened and read; nothing is written from memory. Versions seen: clap 4.6.10 (2026-11-24), schemars 1.2.3 (2026-10-12), rmcp 3.12.0 (2026-11-26), MCP specification latest revision 2026-07-28 plus an unreleased draft.

## Summary

- One real change: rmcp 3.12.0 (2026-11-26) fixed a bug where a `#[tool]` or `#[prompt]` function's doc-comment description was silently lost whenever another attribute (for example `#[deprecated]`) followed the doc comment. The fallback claim in surfaces.md is still true, but before 3.12.0 it was unreliable, and `#[doc(hidden)]` no longer suppresses the description.
- rmcp 3.4.1 (2026-09-23, before the window) accepts const paths and `concat!` in `#[tool]` and `#[prompt]` descriptions. A scanner that reads only string literals misses those. The date is before the baseline, so the September read may have missed it.
- clap 4.6.7 to 4.6.10 changed nothing about doc comments, help text or templates. clap 5.0.0 is still "TBD" behind the `unstable-v5` feature, and one planned change affects us (see claim 1).
- schemars 1.2.3 changed nothing about descriptions.
- MCP: no revision after 2026-07-28 exists. The unreleased draft only restores `_meta` on some request types. The 2026-07-28 revision (before the baseline, after 2025-11-25) adds no new user-rendered tool field.
- The MCP surface has user-rendered fields the SRF-03 walk may not reach: prompts and resources lists, and `#[prompt]` doc text. See the last section.

## Per-claim verdicts

### 1. surfaces.md "Generator behaviour read from source in September 2026" (clap)

Verdict: unchanged for released clap.
Source: [docs.rs clap derive tutorial, version 4.6.10](https://docs.rs/clap/latest/clap/_derive/index.html). It still says: the first paragraph becomes `about`/`help`; the whole comment becomes `long_about`/`long_help` when a blank line follows; `-h` shows the short form and `--help` the long form; a single trailing period on the first paragraph is removed (ellipses kept); explicit attributes override doc comments; `verbatim_doc_comment` skips most preprocessing.
Source: [clap CHANGELOG](https://github.com/clap-rs/clap/blob/master/CHANGELOG.md): 4.6.7 (2026-09-14) adds `#[command(defer = <bool>)]`; 4.6.8 (2026-11-16) stack usage; 4.6.9 (2026-11-20) `unused_result` lint; 4.6.10 (2026-11-24) parse performance. None touches doc text.
Forward-looking only (unreleased, behind `unstable-v5`): in 5.0.0 `ValueEnum` variants use the full doc comment for help text, and `max_term_width` drops to 100. If 5.0 ships, "first paragraph to `-h`" stops being true for `ValueEnum` variants. Record this as a watch item, not a wording change now.
Precision note: the clap page ties doc comments to `about`, `long_about`, `help` and `long_help` only. The existing wording "the whole body to `--help`" is accurate only when a blank line follows the first paragraph. A one-paragraph comment sets no long variant. This is an old subtlety, not a change; consider the wording below.

Replacement wording (optional precision, not required by any upstream change):
"clap_derive sends the first paragraph to `-h` and, when a blank line follows it, the whole body to `--help`; it strips one trailing period from the first paragraph. clap 5 (unreleased) will use the full comment for `ValueEnum` variant help."

### 2. surfaces.md "schemars copies the whole body into `description`" and table row

Verdict: unchanged.
Source: [schemars CHANGELOG](https://github.com/GREsau/schemars/blob/master/CHANGELOG.md). The only release in the window is 1.2.3 (2026-10-12): panic fix for arbitrary-precision JSON numbers, an `unused_qualifications` lint fix, and the tag of internally tagged enums is now first in `properties`. Nothing about `description`, `title` or doc comments. The property order change does not affect scanning.

### 3. surfaces.md "rmcp's `#[tool]` uses `description =` verbatim, else the function's doc comment" and MCP table row

Verdict: changed (reliability, not semantics).
Old text: the fallback publishes the function's `///`.
New fact: before rmcp 3.12.0, a doc-comment description was dropped when any other attribute followed the `///` block (the attribute-folding helper returned `None` for non-doc attributes). 3.12.0 keeps it. Also `#[doc(hidden)]` no longer suppresses the generated description. The fix applies to both `#[tool]` and `#[prompt]`.
Date of change: 2026-11-26 (rmcp 3.12.0).
Sources: [rmcp CHANGELOG](https://github.com/modelcontextprotocol/rust-sdk/blob/main/crates/rmcp/CHANGELOG.md) entry "keep doc comment descriptions when other attributes follow"; [PR 1485](https://github.com/modelcontextprotocol/rust-sdk/pull/1485).
Related, before the window: 3.4.1 (2026-09-23) "accept const paths and concat! in tool/prompt descriptions" ([PR 1243](https://github.com/modelcontextprotocol/rust-sdk/pull/1243)). 3.9.0 (2026-11-05) "generate a tool's outputSchema for the serialize contract" ([PR 1378](https://github.com/modelcontextprotocol/rust-sdk/pull/1378)).

Replacement wording:
"rmcp's `#[tool]` and `#[prompt]` use `description =` verbatim (a string literal, a const path or `concat!`), else the function's doc comment. Before rmcp 3.12.0 the doc comment was dropped when another attribute followed it; since 3.12.0 even `#[doc(hidden)]` keeps it published."

MCP table row replacement: "an rmcp `#[tool]` or `#[prompt]` with no `description =` publishes the function's `///` (rmcp 3.12.0 and later, even beside other attributes)".

### 4. surfaces.md SRF-03 walk: "`render_long_help()` of every `Command` in the `Cli::command()` tree" and "rmcp: the router's `list_all()`"

Verdict: unchanged for clap.
For rmcp: could not determine from changelog that `ToolRouter::list_all()` was renamed or changed. The changelog entry "cap list_all_* pagination" (3.12.0, [PR 1457](https://github.com/modelcontextprotocol/rust-sdk/pull/1457)) concerns the client-side `list_all_*` helpers, not the router. No router rename appears in 3.3.0 to 3.12.0 (3.3.0 rejects an empty `tool_router`; 3.10.0 preserves tools with dependency property-name maps). The method name was not checked against docs.rs for 3.12.0, so a reviewer should confirm `ToolRouter::list_all` still compiles in a spot check.
Also new: 3.9.0 generates `outputSchema` for the serialize contract, so tool lists can now carry an `outputSchema` whose `description` strings come from schemars doc comments on output types. The JSON walk reads every `description` key at any depth, so serialized `list_all()` output covers it.

### 5. length.md LEN-08 attribute names and rules/code-docs.md Siblings "`long_about`"

Verdict: unchanged. No new clap, schemars or rmcp attribute that publishes doc text appeared in the window. `#[command(defer = ...)]` (4.6.7) carries no text. `#[schemars(description = ...)]` is unchanged. Not named in LEN-08 but real: rmcp `description =` in `#[tool]` and `#[prompt]`, and now const or `concat!` values for it.

### 6. rules/code-docs.md gate "`--help-walk` recurses only clap and commander `Commands:` sections"

Verdict: unchanged. clap 4.6.2 (2026-07-15) changed "aliases" wording and 4.6.5 (2026-07-31) optional `value_names` marking; both predate the window and neither touches the `Commands:` heading or template. No help-template or heading change in 4.6.7 to 4.6.10. `max_term_width` change is 5.0 only (unreleased).
Source: [clap CHANGELOG](https://github.com/clap-rs/clap/blob/master/CHANGELOG.md).

### 7. checks/interface_leak.py attribute set and rmcp fallback logic

Attribute set `#[command|arg|clap|value|group|schemars|tool(...)]` (line 365, `RS_ATTR_RE`): could not find a new publishing attribute in clap or schemars. One gap exists in rmcp: `#[prompt(...)]` (name and `description =`) publishes text through `prompts/list` exactly like `#[tool]`, and rmcp's own fix (3.12.0) treats it identically. The regex omits `prompt`. This gap is not new in the window, but 3.4.1 and 3.12.0 documenting `#[prompt]` alongside `#[tool]` make it worth closing.
Fallback logic (line 448: a `#[tool]` without `description` in its attribute span is treated as publishing the `///`): still correct. Two edge cases now documented upstream: (a) `description = CONST_PATH` or `concat!(...)` counts as "has description" but the literal-string scan cannot see the text; (b) a doc comment followed by other attributes (`#[deprecated]`) is published in 3.12.0 and later but was not before. The scanner assumes the newer behaviour, which is the safe direction (it over-flags for older rmcp).
Code each change would require (not edited here):
- `checks/interface_leak.py`: add `prompt` to `RS_ATTR_RE` and apply the same fallback rule as `tool` at line 448.
- `checks/interface_leak.py`: when a `description =` value is not a string literal (a path or `concat!`), report it as "unresolved, scan the serialized list" instead of silently passing.
- Fixture under `checks/fixtures/`: a `#[prompt]` with a leaking `///`; a `#[tool]` whose `///` is followed by `#[deprecated]`.

### 8. MCP specification: new user-rendered tool or argument fields since 2025-11-25

Verdict: no new text-bearing tool field in any revision after 2025-11-25, and nothing in the window.
Sources: [2026-07-28 key changes](https://modelcontextprotocol.io/specification/2026-07-28/changelog) (before the baseline, after 2025-11-25); [draft changelog](https://modelcontextprotocol.io/specification/draft/changelog) (the only change in the window is restoring optional `_meta` on `CreateMessageRequestParams`, `ElicitRequestFormParams`, `ElicitRequestURLParams`, `ElicitResult` and `ListRootsResult`; no text field); [2026-07-28 tools page](https://modelcontextprotocol.io/specification/2026-07-28/server/tools).
2026-07-28 changes that touch tool lists: `inputSchema` and `outputSchema` may use any JSON Schema 2020-12 keyword (SEP-2106), so `description`, `title`, `examples`, `$defs` and composed keywords can appear deeper in nested schemas; `ttlMs` and `cacheScope` on list results; deterministic tool ordering; `x-mcp-header`; results carry `resultType`. None adds a text field.
The tool definition today carries these text-bearing fields: `name`, `title`, `description`, `icons` (URLs, not text), `inputSchema`, `outputSchema`, `annotations`. The page calls `annotations` "properties describing tool behavior" and says clients must treat them as untrusted; this read did not establish whether `annotations.title` is still defined in the schema, so it is "could not determine".

## New user-rendered fields the scanner or SRF-03 walk could miss

The surfaces.md JSON walk reads "every `description` and `title` value" (line 144), so tool `title`, argument `description`s and `outputSchema` descriptions are covered when the tool list is serialized. Possible misses:
1. `prompts/list` and `resources/list`, `resources/templates/list`: each carries `description` and `title` rendered to users, but the SRF-03 MCP row serializes only the tool list. rmcp `#[prompt]` doc text feeds `prompts/list`. Check: add the prompt router's list (and resource list handlers) to the in-process serialization, or document that prompts and resources are out of scope. Verification: `grep -rn "#\[prompt" src/` returns nothing, or the prompt list is piped to `interface_leak.py -`.
2. `server/discover` result and `serverInfo` in `_meta` (2026-07-28): servers identify themselves with name, title and description-like fields; rmcp's `ServerInfo` `instructions` string is rendered to users and models and comes from a literal, not a doc comment, so a doc scan never sees it. Verification: serialize `get_info()` and pipe it to the scanner. Could not confirm the exact 2026-07-28 `serverInfo` field set from the pages read.
3. Tool `annotations` text, if any (see claim 8: could not determine).
4. `description =` set from a const path or `concat!` (rmcp 3.4.1): invisible to a literal-string scan, visible in the serialized list.

## Normative guidance candidates

1. Rule: surfaces.md names `#[prompt]` next to `#[tool]` wherever it mentions the rmcp fallback. Rationale: same macro path, same fallback, same published list. Verify: grep surfaces.md and interface_leak.py for `prompt`.
2. Rule: the MCP output gate serializes the tool list, the prompt list and the server info, not only the tool list. Rationale: all three render to users and clients. Verify: the gate command in surfaces.md pipes each serialization through `interface_leak.py -`.
3. Rule: a repo pins rmcp 3.12.0 or later, or keeps `///` as the last attribute before the function. Rationale: earlier versions drop the doc-comment description when another attribute follows, so the published text differs from the reviewed text. Verify: `cargo tree -i rmcp` shows a version of 3.12.0 or higher.
4. Rule: when clap 5 stable ships, re-read the `ValueEnum` doc-comment change before editing the clap sentence. Rationale: the full comment would reach the `-h` line. Verify: the clap CHANGELOG 5.0.0 section has a release date.

## AI-agent angle

- Agents assume `#[tool]` doc comments always publish. Before rmcp 3.12.0 a `#[deprecated]` or `#[allow]` after the `///` dropped them. Check: the serialized `list_all()` JSON, not the source.
- Agents write `description = concat!(...)` or a const to dodge a literal scan. Check: serialized tool list scan (SRF-03), which sees the final string.
- Agents forget `#[prompt]` is a second publishing macro. Check: the regex addition in claim 7.

## Contested / evolving

- clap 5.0.0 is "TBD" (unreleased, `unstable-v5`); `ValueEnum` full-comment help and a narrower `max_term_width` are planned. Trending: not before 2027 by current evidence, but no date is published.
- MCP is moving list-result metadata (`ttlMs`, `cacheScope`) and statelessness; the text fields have been stable since `title` and `icons` arrived (before 2025-11-25).

## Sources

| URL | What it is | Date/era | Why |
|---|---|---|---|
| https://github.com/clap-rs/clap/blob/master/CHANGELOG.md | clap changelog | 4.6.10, 2026-11-24 | primary; no doc-text change in window |
| https://docs.rs/clap/latest/clap/_derive/index.html | clap derive tutorial | 4.6.10 | primary; doc-comment rules |
| https://github.com/GREsau/schemars/blob/master/CHANGELOG.md | schemars changelog | 1.2.3, 2026-10-12 | primary |
| https://github.com/modelcontextprotocol/rust-sdk/blob/main/crates/rmcp/CHANGELOG.md | rmcp changelog | 3.12.0, 2026-11-26 | primary |
| https://github.com/modelcontextprotocol/rust-sdk/pull/1485 | rmcp PR: doc-comment description kept | 2026-11 | primary; behaviour before and after |
| https://github.com/modelcontextprotocol/rust-sdk/pull/1243 | rmcp PR: const and concat! descriptions | 3.4.1, 2026-09-23 | cited via changelog only, page not opened |
| https://modelcontextprotocol.io/specification/draft/changelog | MCP draft changelog | Nov 2026 | primary |
| https://modelcontextprotocol.io/specification/2026-07-28/changelog | MCP 2026-07-28 key changes | 2026-07-28 | primary |
| https://modelcontextprotocol.io/specification/2026-07-28/server/tools | MCP tools spec | 2026-07-28 | primary; Tool field list |

Source count note: nine pages opened; the contract's minimum of 12 does not apply to a delta with this narrow a window.

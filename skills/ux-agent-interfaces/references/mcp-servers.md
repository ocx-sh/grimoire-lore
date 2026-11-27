---
title: MCP Servers
summary: UX-AGENT-15 to 24 and 26, covering the isError result for every tool failure, the error text prefix, gated tools, tool names, descriptions, input and output schemas, tool counts, pinned descriptions, published names as API, and result size
---

# MCP Servers

What an MCP server returns to a model: which channel a failure travels on, how a tool is named and described, what its schemas say, how many tools it registers and how big a result may be. Rows bind the server's `tools/list` and `tools/call` behaviour, whatever language it is written in. The text a tool description renders into is also bound by the `code-docs` skill's SRF rules (SRF-03: what it must not contain, length caps). These rows own what it must contain. Annotations and write gating are UX-ACT-18 to 20 in `tool-approval.md`, and the machine output of a CLI is `machine-output.md`. Description craft for skills is `ai-config-authoring`'s, and UX-AGENT-19 applies to MCP tool descriptions only. A tool result that carries third-party text (registry metadata, issue bodies, published instructions) sits inside a labelled data boundary, which is UX-AI-13 in `ux-quality-reference`, cited here and not restated. The description of such a tool says so, under UX-AGENT-19 item 5.

Contents: [Dates and Versions](#dates-and-versions) · [Capture the Server's Output](#capture-the-servers-output) · [Failures and Gates](#failures-and-gates) · [Names, Descriptions and Schemas](#names-descriptions-and-schemas) · [Tool Count, Drift and Size](#tool-count-drift-and-size) · [Documented Gaps](#documented-gaps) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Versions

Fetched or read 2026-11-27 unless a row says otherwise. Every client limit below moves with the client's release, so re-fetch the source instead of quoting it from memory.

| Fact | Source | Date | Refresh and re-check |
|---|---|---|---|
| Error channels: Protocol Errors are "Unknown tool", "Malformed requests (requests that fail to satisfy CallToolRequest schema)" and "Server errors". Tool Execution Errors include "Input validation errors". Clients MAY pass protocol errors to the model and SHOULD pass tool execution errors. `CallToolRequestParams.arguments` is `{ [key: string]: unknown }`. The same lists, type and `isError` comment are in revisions 2025-11-25 and 2026-07-28 | [MCP tools, revision 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/server/tools), [schema](https://modelcontextprotocol.io/specification/2026-07-28/schema), [2025-11-25 schema tag](https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/2025-11-25/schema/2025-11-25/schema.ts) | fetched 2026-11-27 | 6 months, and at each new revision (recent revisions 2025-06-18, 2025-11-25, 2026-07-28). Fetch `/specification/latest/server/tools`, diff "Error Handling" and "Structured Content", read `CallToolRequestParams` |
| Claude Code saves a successful MCP result with no image content to a file above 50,000 characters, caps output at 25,000 tokens by default (`MAX_MCP_OUTPUT_TOKENS`), warns above 10,000 tokens, and raises the file limit with `_meta["anthropic/maxResultSizeChars"]` up to 500,000 | [Claude Code MCP docs](https://code.claude.com/docs/en/mcp), "MCP output limits and warnings" | Last-Modified 2026-11-26, fetched 2026-11-27, vendor | 3 months. Fetch the page and read that section |
| Claude Code keeps the first and last 5,000 characters of error text longer than about 11,000 | same page, "Error results" | same | 3 months |
| Claude Code leaves out a tool whose full name is over 128 characters. A plugin-bundled server's full form is `mcp__plugin_<plugin-name>_<server-name>__<tool-name>` | same page, "Tools with names longer than 128 characters" and "Plugin MCP tool names" | same | 3 months |
| Claude Code cuts a description at 4,096 characters (16,384 via tool search). Before v2.1.296 the limit was 2,048 | same page | same | 3 months. It moved within the last release cycle: search the page for "2,048" and "4,096" |
| Codex CLI keeps head and tail of about 48,000 bytes of a result (10,000 tokens x 1.2 x 4 bytes, all 14 entries of `models.json`) and 10,000 bytes for a model missing from it. Gemini CLI cuts at 40,000 characters (`DEFAULT_TRUNCATE_TOOL_OUTPUT_THRESHOLD`). Copilot in VS Code cuts at 50% of the model's prompt window (`MAX_TOOL_RESPONSE_PCT = 0.5`). Codex, Copilot and Gemini pass both error channels to the model, and Copilot drops the `isError` flag before the prompt | source read at openai/codex `57b493a` (2026-11-27), google-gemini/gemini-cli `60f8082` (2026-11-25), microsoft/vscode `f39e18f` (2026-11-27). Vendor source, no client was run | 2026-11-27 | 3 months. In each clone: `grep -A3 '"truncation_policy"' codex-rs/models-manager/models.json`; `grep -n DEFAULT_TRUNCATE_TOOL_OUTPUT_THRESHOLD packages/core/src/config/config.ts`; `grep -n MAX_TOOL_RESPONSE_PCT extensions/copilot/src/extension/prompts/node/agent/agentPrompt.tsx`; `grep -n 'isError: callResult.isError' src/vs/workbench/contrib/mcp/common/mcpLanguageModelToolContribution.ts` |
| Tool names: MCP allows `.`, the Claude API regex `^[a-zA-Z0-9_-]{1,128}$` does not | MCP spec as above, [Claude API define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools) | undated, fetched 2026-11-27 | 6 months. Fetch both and compare the allowed characters |
| Tool-count guidance: OpenAI suggests fewer than 20 tools, Anthropic says accuracy "degrades once you exceed 30 to 50". Tool search weakens both numbers | [OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling), [Claude tool search](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool) | undated, fetched 2026-11-27, vendor claims | 6 months. Fetch both and search for the numbers |
| Top-level combinators: GitHub's server lint says "Some providers reject an entire tools/list payload when any input schema has a top-level combinator" (no provider named, vendor claim). OpenAI documents "the root level object of a schema must be an object, and not use `anyOf`" for Structured Outputs, not for strict function parameters. The openai Python SDK 2.0.0 accepts a root `anyOf` | github-mcp-server `pkg/github/tools_validation_test.go` at `1a3b6a7` (2026-11-27), [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), SDK 2.0.0 | undated page, fetched 2026-11-27 | 12 months. Run the currency check in block UX-AGENT-20: it prints `1` while the sentence stands |
| Description-smell rates and effect sizes (97.1% of tools with a smell, 56% unclear purpose, median +5.85 points from augmentation). Usage guidance missing in 89.3% and compact descriptions equivalent, from the v1 full text. The v3 full text was not read | [arXiv 2602.14878](https://arxiv.org/abs/2602.14878), independent preprint | v1 2026-02-16, v3 2026-05-31 | 12 months, or on peer-reviewed publication |
| GitHub's MCP server has 151 tools, passes description item 2 (when to use) on 21 of them and item 3 (sibling pointer) on 4 of them, and has a median description of 79 characters. A reading of the server's tool descriptions, with a pre-filter regex; no client was run | [github/github-mcp-server](https://github.com/github/github-mcp-server) at `7edc2dd` | read 2026-11-25, vendor source | 3 months. Re-clone, list tool names and descriptions, and recount which descriptions name a trigger or a sibling tool |

The open decisions D1 to D4 are listed once in `SKILL.md`.

## Capture the Server's Output

Both scripts read saved JSON. `CHECKS` is the `checks/` directory beside `SKILL.md`. The recipe runs under bash and zsh.

```sh
# Capture tools/list. Run once with the default launch command and once with each write flag.
SERVER=(mytool mcp)
INIT='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"probe","version":"0"}}}'
NOTE='{"jsonrpc":"2.0","method":"notifications/initialized"}'
( printf '%s\n' "$INIT" "$NOTE" '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'; sleep 2 ) \
  | timeout 10 "${SERVER[@]}" 2>server.err | jq -c 'select(.id==2)' > tools.json
# Probe one call. TOOL and ARGS are the tool name and its JSON arguments object.
( printf '%s\n' "$INIT" "$NOTE" "{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"tools/call\",\"params\":{\"name\":\"$TOOL\",\"arguments\":$ARGS}}"; sleep 2 ) \
  | timeout 10 "${SERVER[@]}" 2>server.err | jq -c 'select(.id==3)' > call.json
python3 -I "$CHECKS"/mcp_tools_check.py tools tools.json --server-key mytool --gate-flag=--allow-writes --gated mytool_render
python3 -I "$CHECKS"/mcp_tools_check.py result call.json --error
# A call to a gated tool that is absent: capture it as call-absent.json the same way, then:
python3 -I "$CHECKS"/mcp_tools_check.py result call-absent.json --expect-protocol-error
```

If `tools.json` is empty, read `server.err`: the launch command failed.

`tools` exits 0 when no MUST or SHOULD line prints. Lines that start `note:` are pre-filters for the reading checks (UX-AGENT-19 items 2 and 3, UX-AGENT-21): read each one, none is a finding. `result --error` is for a call that failed on purpose, and `result` without it checks size and `structuredContent`. `result --expect-protocol-error` is for the call to a tool the server does not register: it passes only a JSON-RPC error with code `-32602` and no result, the one place a protocol error is right (UX-AGENT-15 excepts it). `--gated NAMES` lists the tools the launch flag gates off, and a name found in the default list is a UX-AGENT-17 finding.

## Failures and Gates

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-AGENT-15 | Return every failure of the tool's work as a result with `isError: true`: upstream errors, not found, unauthorised, rate limit, business rule, and every argument failure (missing field, wrong type, bad value). Use JSON-RPC errors only for an unknown tool, a request that fails the `CallToolRequest` schema, and a genuine server fault. Never return `-32603` for an expected failure. | The spec lists input validation, API and business-logic failures as tool execution errors that clients SHOULD pass to the model, and `arguments` is an open object, so a bad argument is not a malformed request (Dates and Versions; the spec never says in words that an `inputSchema` violation is a tool execution error, so this is a reading of three texts). `CallToolResult.isError`: errors "SHOULD be reported inside the result object, with `isError` set to true, _not_ as an MCP protocol-level error response. Otherwise, the LLM would not be able to see that an error occurred and self-correct." `-32603` means "Internal error" ([JSON-RPC 2.0](https://www.jsonrpc.org/specification#error_object)). Codex, Copilot and Gemini pass both channels to the model, but Copilot rewrites a thrown error as `ERROR while calling tool: <message>` plus "Please check your input and try again.", wrong advice for a server fault. A measured server returned `-32603` for every operational failure. Cursor is not verified. | Script one `tools/call` each for not-found, unauthorised, refused, timeout, a malformed value and a missing field. `mcp_tools_check.py result FILE --error` exits 0 on every response: a `result` with `isError` true and no `error` member. | MUST |
| UX-AGENT-16 | Start the text of every MCP error result with the class slug and the retry verdict, for example `not_found (not retryable): …`. Use the same class the CLI's JSON mode gives for the same condition. Keep the text under 10,000 characters. | **House convention.** An MCP result has no exit code, so the text is the only channel for the class. In Copilot in VS Code it is also the only channel for the failure itself, because `isError` goes to UI `details` only. No source or measurement shows that the prefix improves agent behaviour. The 10,000 bound sits just under the lowest error-text cut found, Claude Code's about 11,000 (Dates and Versions). | `mcp_tools_check.py result FILE --error` reports no UX-AGENT-16 line: the text starts with the class slug, then `(retryable)` or `(not retryable)`, then a colon, and is under 10,000 bytes. The class equals the CLI's `.error.code` or `.error.kind` for the same input. A test asserts the size of the largest realistic error. | SHOULD |
| UX-AGENT-17 | Keep a tool that is gated off (write tools, admin tools) out of `tools/list`. Name the gate, and who decides it, in the server instructions or in an always-registered tool's description. | An agent that gets `tool not found` invents names. The spec says servers "MUST respond to `tools/list` requests with the set of tools currently available". | Start the server without the gate flag: `mcp_tools_check.py tools tools.json --gate-flag=--allow-writes --gated NAME` reports no UX-AGENT-17 line. `--gate-flag` covers the naming half and `--gated` the absence half, so name every gated tool. | SHOULD |

Absence is the gate and a callable "disabled" stub is not: a stub adds a surface only to say no, and a call to the absent tool returns `-32602` (unknown tool), which is the one place a protocol error is right, checked with `mcp_tools_check.py result FILE --expect-protocol-error`.

## Names, Descriptions and Schemas

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-AGENT-18 | Name each tool with only `[a-z0-9_]`, 1 to 128 characters, unique within the server. SHOULD clause: never use a bare generic verb (`search`, `fetch`, `get`, `list`, `run`, `query`, `read`). SHOULD clause: keep the client's full name (`mcp__<server-key>__<tool>`) at 128 characters or fewer. | A name has to satisfy both the MCP spec, which allows `.`, and the Claude API regex, which does not. Aggregators collide on generic names, and the spec's own example collision is `search`. Claude Code leaves out a tool whose full name is over 128 characters. | `mcp_tools_check.py tools tools.json --server-key mytool` reports no UX-AGENT-18 line. For a plugin-bundled server pass `plugin_<plugin-name>_<server-name>` as the key. | MUST |
| UX-AGENT-19 | Write each tool description so that it (1) opens with a purpose sentence that names the operation and the object, and says what the tool changes; (2) says when to use the tool; (3) names the sibling tool, or the case to avoid, where tools overlap; (4) says what comes back, or declares an `outputSchema`; (5) states preconditions, size caps, truncation, overwrites and irreversibility. Put items 1 and 2 first. Keep it at or under 2,048 characters, for Claude Code installs older than v2.1.296. No sentence-count floor applies. | Anthropic calls the description "by far the most important factor in tool performance" ([define tools](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools), vendor). The preprint found usage guidance missing in 89.3% of tools and compact descriptions equivalent to full ones. The evidence for items 2 and 3 is mixed: GitHub's server passes item 2 on 21 of 151 tools and item 3 on 4 of 151, and it works (Dates and Versions, github-mcp-server at `7edc2dd`, 2026-11-25). So none of the items is MUST, and 2,048 is an old-client margin, not a current limit. | `mcp_tools_check.py tools` reports no UX-AGENT-19 line (length and empty descriptions). Items 2 and 3 are `unverified: reading heuristic`: its `note:` lines are a pre-filter, and a filler sentence passes it. A reviewer, or an LLM judge, reads the first 2,048 characters and answers yes to "does a sentence name the trigger or the input the caller has?". Each pair of tools on the same object names the other tool or says `instead`. | SHOULD |
| UX-AGENT-20 | Describe every input property (non-empty `description`). Mark required fields in `required`. Use `enum` for closed value sets. A tool with no parameters uses `{"type":"object","additionalProperties":false}`. SHOULD clause: never use a top-level `anyOf`, `oneOf` or `allOf`. | Tool search indexes argument descriptions, and the no-parameter schema is the spec's recommended form. The combinator clause is SHOULD because no rejection was reproduced: the evidence is GitHub's lint comment and OpenAI's Structured Outputs root rule (Dates and Versions). | `mcp_tools_check.py tools` reports no UX-AGENT-20 line. Rationale currency: block UX-AGENT-20 prints `1`. A `0` means the cited sentence moved, so re-read the page. | MUST |
| UX-AGENT-21 | Declare an `outputSchema` for every tool that returns structured data. Return a conforming `structuredContent` and the same JSON serialised in a text block. | The spec says that with an output schema servers "MUST provide structured results that conform", and a tool that returns structured content "SHOULD also return the serialized JSON in a TextContent block". | `mcp_tools_check.py tools` prints a `note:` for tools with no `outputSchema`, and only tools that return prose may lack one. `mcp_tools_check.py result FILE` reports no UX-AGENT-21 line: the text parses to a value equal to `structuredContent`. | SHOULD |

```sh
# UX-AGENT-20: currency of the rationale. Prints 1 while the cited OpenAI sentence stands.
curl -sL -A Mozilla/5.0 https://developers.openai.com/api/docs/guides/structured-outputs \
  | grep -c 'root level object of a schema must be an object, and not use <code>anyOf</code>'
```

A description and a failure result, wrong and right:

```json
{"name": "mytool_describe", "description": "Describe a package."}
{"name": "mytool_describe", "description": "Show the full record of one package: versions, digests and the publisher's description. Use when you already have an exact reference; use mytool_search instead to find one. Returns the record as JSON, about 2 KB. Read only."}
```

```json
{"jsonrpc": "2.0", "id": 3, "error": {"code": -32603, "message": "describe failed: registry authentication failed"}}
{"jsonrpc": "2.0", "id": 3, "result": {"isError": true, "content": [{"type": "text", "text": "not_found (not retryable): no package named nope/x in example.com. It may not exist, or you may lack access; check the name."}]}}
```

The first description names no trigger and no sibling (UX-AGENT-19). The first failure is a protocol error for an ordinary not-found, and the model reads a server bug (15). The second is a result the model can act on, with the class and verdict first (16) and the not-found-or-unauthorised wording of UX-AGENT-12.

## Tool Count, Drift and Size

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-AGENT-22 | Register at most 20 tools by default. Offer an allowlist flag (`--tools` or `--toolsets`) to widen or narrow the set. | There are only soft numbers: OpenAI suggests fewer than 20, and Anthropic says accuracy degrades once you exceed 30 to 50. Tool search weakens both for clients that have it. | `mcp_tools_check.py tools tools.json` reports no UX-AGENT-22 line for the default launch command. | SHOULD |
| UX-AGENT-23 | Pin every behavioural or safety claim in a description with a test that reads the registered description. Snapshot `tools/list` so a schema or description change shows up as a reviewed diff. Return tools in a deterministic order. | Descriptions drift from code. The spec says servers "SHOULD return tools in a deterministic order" for caching, and GitHub's server snapshots every tool. | See block UX-AGENT-23: one assertion per claim, a snapshot test that fails on an unreviewed change, and two identical name lists. | SHOULD |
| UX-AGENT-24 | Treat published tool names, JSON field names and error class slugs as API. A rename keeps the old name resolvable for at least one release through an alias, and the changelog lists it. A retired slug is never reused. | Stored allowlists, `--tools` flags and consumer switch statements break silently. GitHub's server keeps an alias map. EXIT-06 already makes exit codes append-only. | See block UX-AGENT-24: every name removed since the previous release appears in the alias map and the changelog. | SHOULD |
| UX-AGENT-26 | Keep an MCP tool's text result under 40,000 bytes by default. A tool that can return more offers a limit or cursor argument (UX-AGENT-06). Setting `_meta["anthropic/maxResultSizeChars"]` (ceiling 500,000) raises the limit in Claude Code only, so set it deliberately, state why, and keep the pagination argument for other clients. This applies to MCP text results, not to CLI stdout. | 40,000 is the lowest fixed cap read in four clients: Gemini CLI cuts at 40,000 characters, Codex CLI keeps about 48,000 bytes, Copilot cuts at half the prompt window, and Claude Code saves a result to a file above 50,000 characters (Dates and Versions). The bound is in bytes because Codex budgets bytes. Cursor was not checked. A cut is not a crash, so this is SHOULD. | `mcp_tools_check.py result FILE` reports no UX-AGENT-26 line for the largest realistic fixture. Otherwise the tool's `inputSchema` has a limit or cursor property, and where `tools.json` carries the annotation the server docs give the reason. | SHOULD |

```sh
# UX-AGENT-23: tools/list is deterministic. The two name lists must be identical, and the snapshot test must pass.
jq -r '.result.tools[].name' tools.json > names1.txt
jq -r '.result.tools[].name' tools2.json > names2.txt
diff names1.txt names2.txt
# UX-AGENT-23: one assertion per description claim. Read the hits against the claims.
git ls-files -z --cached --others --exclude-standard -- ':(glob)tests/**' ':(glob)test/**' \
  | xargs -0 -r grep -H -n -F -e 'description' --
# UX-AGENT-24: names in the previous release and absent now. Each must be in the alias map and the changelog.
jq -r '.result.tools[].name' tools-prev.json | sort > prev.txt
jq -r '.result.tools[].name' tools.json | sort > now.txt
comm -23 prev.txt now.txt
```

## Documented Gaps

- **No source shows that the error-text prefix changes agent behaviour.** UX-AGENT-16 is a consistency convention. A small paired probe, the same failure with and without the prefix, would settle whether it earns a MUST.
- **Size and truncation numbers come from four clients read two ways.** Claude Code is vendor documentation. The other three are source reads at the named commits, and none was run. Cursor is entirely undetermined (closed source, UI-only docs), Copilot's absolute cap depends on the model, and whether Gemini CLI's `isError` wrapper reaches its 40,000-character cut was not traced.
- **The spec never states that an `inputSchema` violation is a tool execution error.** UX-AGENT-15's argument clause is a reading, measured identical in two revisions, and no client was observed handling a `-32602` for a bad argument.
- **No provider rejection of a top-level combinator has been reproduced.** One API call with a strict function whose `parameters` is a root `anyOf`, made by someone holding an OpenAI key, would promote that clause of UX-AGENT-20 to MUST or retire it.
- **MCP 2026-07-28 adds `InputRequiredResult`** (elicitation through multi-round-trip requests). When a tool should ask for input instead of failing with `isError: true` is open.
- **A fixed-task regression tripwire for descriptions** is unproven. A significance claim would need about 900 tasks per arm, so a handful of fixed tasks run three times each is the only affordable form.

## What Agents Get Wrong Here

1. **Mapping an `anyhow` or exception error straight to a JSON-RPC internal error.** A not-found arrives as `-32603` and the model reads a server bug (UX-AGENT-15).
2. **Writing a one-line description from the function name**, with no trigger and no sibling pointer (UX-AGENT-19).
3. **Leaving parameter descriptions empty**, or writing a closed value set as prose instead of an `enum` (UX-AGENT-20).
4. **Returning prose with no `outputSchema`** where the data is structured (UX-AGENT-21).
5. **A top-level `oneOf` to model "either of these argument shapes"** (UX-AGENT-20). Use one object with optional properties, or two tools.
6. **Registering the whole API as tools**, so a client with no tool search gets 60 (UX-AGENT-22).
7. **Naming a tool `search`** and colliding with another server's (UX-AGENT-18).
8. **Returning a stub "disabled" result for a gated tool** instead of leaving it out of the list (UX-AGENT-17).
9. **Quoting a Claude Code limit from memory**, such as the 2,048-character cut that changed at v2.1.296. Re-fetch the page.
10. **Renaming a tool in a refactor** and breaking every stored allowlist (UX-AGENT-24).
11. **Returning the whole index** from a search tool with no limit or cursor, and a result no client keeps whole (UX-AGENT-06, 26).

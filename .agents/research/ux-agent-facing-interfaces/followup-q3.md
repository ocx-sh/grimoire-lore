---
title: "Follow-up q3: is CallToolRequest arguments an open object in MCP 2025-11-25?"
program: product
topic: ux-agent-facing-interfaces
worker: followup-q3
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 8
---

# Follow-up q3: MCP 2025-11-25 and the C1 reading

## Question

Did the MCP 2025-11-25 schema already type `CallToolRequest` arguments as an open object, so that the C1 reading (an argument that violates `inputSchema` is a tool execution error, not a protocol error) also holds for clients on that revision?

## Answer

Yes. In the 2025-11-25 schema, `CallToolRequestParams.arguments` is `{ [key: string]: unknown }` with the description "Arguments to use for the tool call." Measured on 2026-11-27, the 2026-07-28 schema declares the same field with the same type and the same description (section 1). The "Error Handling" text on the 2025-11-25 and 2026-07-28 tools pages carries the same two lists and the same two client clauses, in a different order and layout (section 2). The `CallToolResult.isError` doc comment, which says tool-originated errors belong inside the result, is word-for-word identical in both revisions (section 3). So C1 and UX-AGENT-15 hold for clients on 2025-11-25.

Two limits. First, neither revision says in words that an `inputSchema` violation is a tool execution error: the rule rests on a reading of quoted text. Second, the revisions differ in how `Tool.inputSchema` is typed (section 4), but that difference does not touch the error channel.

## Evidence

All measurements ran in the throwaway directory `~/.cache/research-lang/exemplars/product/wave2/q3`. Every command below was run on 2026-11-27 and the output is complete for the lines shown (only unrelated lines were not selected by the grep).

### 0. Which files, and which version of them

The MCP repository keeps one `schema.ts` per revision. The `main` branch copy of the 2025-11-25 directory has been reformatted since the release, so I measured both `main` and the release tag.

```
$ curl -sL "https://api.github.com/repos/modelcontextprotocol/modelcontextprotocol/git/ref/tags/2025-11-25" | grep '"sha"'
    "sha": "38c84e9f93ad191d9eb26d92b945d17bd0efcaf3",
$ curl -s "https://api.github.com/repos/modelcontextprotocol/modelcontextprotocol/git/commits/38c84e9f93ad191d9eb26d92b945d17bd0efcaf3" | grep -m2 '"date"'
    "date": "2025-11-25T21:14:08Z"
$ curl -s "https://api.github.com/repos/modelcontextprotocol/modelcontextprotocol/git/ref/tags/2026-07-28" | grep '"sha"'
    "sha": "5f5440bb26a62e2cf3440b92da5a667efa03b267",
$ B=https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol
$ curl -sL $B/2025-11-25/schema/2025-11-25/schema.ts -o s2511tag.ts   # 66523 bytes
$ curl -sL $B/main/schema/2025-11-25/schema.ts      -o s2511.ts       # 66671 bytes
$ curl -sL $B/2026-07-28/schema/2026-07-28/schema.ts -o s2607tag.ts   # 98426 bytes
$ curl -sL $B/main/schema/2026-07-28/schema.ts      -o s2607.ts       # 99387 bytes
$ diff s2511.ts s2511tag.ts | head -6
9c9,11
<   JSONRPCRequest | JSONRPCNotification | JSONRPCResponse;
---
>   | JSONRPCRequest
>   | JSONRPCNotification
>   | JSONRPCResponse;
```

Sources: [tag 2025-11-25 schema.ts](https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/2025-11-25/schema/2025-11-25/schema.ts) (tagged 2025-11-25, commit date 2025-11-25T21:14:08Z), [main 2025-11-25 schema.ts](https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/main/schema/2025-11-25/schema.ts), [tag 2026-07-28 schema.ts](https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/2026-07-28/schema/2026-07-28/schema.ts) and [main 2026-07-28 schema.ts](https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/main/schema/2026-07-28/schema.ts), all fetched 2026-11-27. The `main` and tag copies of 2025-11-25 differ in formatting and line numbers, and in one constant (`LATEST_PROTOCOL_VERSION` is `"DRAFT-2025-v3"` in the tag file and `"2025-11-25"` on `main`). The operative lines below were checked in both copies. This closes the earlier gap "is `main` identical to the tag": it is not byte-identical, and it agrees on every line this question depends on.

### 1. The type of `arguments`, 2025-11-25 against 2026-07-28

Command and output (2025-11-25 tag copy, then the 2026-07-28 tag copy):

```
$ sed -n '1135,1144p' s2511tag.ts
export interface CallToolRequestParams extends TaskAugmentedRequestParams {
  /**
   * The name of the tool.
   */
  name: string;
  /**
   * Arguments to use for the tool call.
   */
  arguments?: { [key: string]: unknown };
}
$ grep -n -A1 'Arguments to use for the tool call' s2607tag.ts
1869:   * Arguments to use for the tool call.
1870-   */
$ grep -n -B2 -A9 'interface CallToolRequestParams' s2607.ts
1867:export interface CallToolRequestParams extends InputResponseRequestParams {
1868-  /**
1869-   * The name of the tool.
1870-   */
1871-  name: string;
1872-  /**
1873-   * Arguments to use for the tool call.
1874-   */
1875-  arguments?: { [key: string]: unknown };
}
```

Result: the field type and its one-line description are identical in the two revisions; only the parent interface differs (`TaskAugmentedRequestParams` in 2025-11-25, `InputResponseRequestParams` in 2026-07-28). The rendered [2025-11-25 schema page](https://modelcontextprotocol.io/specification/2025-11-25/schema) (fetched 2026-11-27, `lastModified` 2026-11-09 in the page data; curl'd to `schema.2511.html`, 1,268,399 bytes) contains the same description text ("Arguments to use for the tool call", 2 matches in the saved HTML). The type is any JSON object. Nothing in either schema links `arguments` to the tool's `inputSchema`, so an argument that violates `inputSchema` still satisfies the `CallToolRequest` type.

### 2. The error taxonomy on the tools pages

Command (strip scripts and tags from the saved page, then grep the body):

```
$ python3 -I -c '...strip html to text...' tools.2511.html > t2511.txt     # 381326 bytes of HTML
$ python3 -I -c '...strip html to text...' tools.2607.html > t2607.txt     # 508459 bytes of HTML
$ for v in 2511 2607; do grep -o 'Tools use two error reporting mechanisms.\{0,1500\}' t$v.txt | head -1; done
```

2025-11-25 output ([tools page](https://modelcontextprotocol.io/specification/2025-11-25/server/tools), fetched 2026-11-27, `lastModified` 2026-11-09T13:29:09Z in the page data):

```
Tools use two error reporting mechanisms: Protocol Errors : Standard JSON-RPC errors for issues like: Unknown tools Malformed requests (requests that fail to satisfy CallToolRequest schema ) Server errors Tool Execution Errors : Reported in tool results with isError: true : API failures Input validation errors (e.g., date in wrong format, value out of range) Business logic errors Tool Execution Errors contain actionable feedback that language models can use to self-correct and retry with adjusted parameters. Protocol Errors indicate issues with the request structure itself that models are less likely to be able to fix. Clients SHOULD provide tool execution errors to language models to enable self-correction. Clients MAY provide protocol errors to language models, though these are less likely to result in successful recovery. Example protocol error: { ... "code" : -32602 , "message" : "Unknown tool: invalid_tool_name" } ... Example tool execution error (input validation): { ... "text" : "Invalid departure date: must be in the future. Current date is 08/08/2025." } ], "isError" : true } }
```

2026-07-28 output ([tools page](https://modelcontextprotocol.io/specification/2026-07-28/server/tools), fetched 2026-11-27, `lastModified` 2026-11-24T21:51:41Z in the page data):

```
Tools use two error reporting mechanisms: Protocol Errors indicate issues with the request structure itself that models are less likely to be able to fix: Unknown tool Malformed requests (requests that fail to satisfy CallToolRequest schema ) Server errors They are returned as standard JSON-RPC errors: { ... "code" : -32602 , "message" : "Unknown tool: invalid_tool_name" } Tool Execution Errors contain actionable feedback that language models can use to self-correct and retry with adjusted parameters: API failures Input validation errors (e.g., date in wrong format, value out of range) Business logic errors They are reported in tool results with isError: true : { ... "text" : "Invalid departure date: must be in the future. Current date is 08/08/2025." } ], "isError" : true } } Clients MAY provide protocol errors to language models, though these are less likely to result in successful recovery. Clients SHOULD provide tool execution errors to language models to enable self-correction.
```

(Both outputs are cut at the `{ ... }` JSON examples to shorten the line; the text outside the braces is verbatim.)

A phrase count over both stripped pages gives 2 matches each, for every one of: "Malformed requests", "Input validation errors", "actionable feedback", and "Validate all tool inputs"; and 1 match each for "SHOULD provide tool execution errors" and "MAY provide protocol errors". The only substantive difference is layout: 2026-07-28 groups the lists under their examples and adds `"resultType": "complete"` to the example result. The clause content is the same. The old claim that this was "the same text clause for clause" was inherited from C1; it is now measured on both pages.

### 3. `CallToolResult.isError`, both revisions

```
$ grep -n -B12 -A3 'isError?: boolean' s2511tag.ts | sed -n '1,20p'      # first match, CallToolResult
1118:   * Any errors that originate from the tool SHOULD be reported inside the result
1119-   * object, with `isError` set to true, _not_ as an MCP protocol-level error
1120-   * response. Otherwise, the LLM would not be able to see that an error occurred
1121-   * and self-correct.
1122-   *
1123-   * However, any errors in _finding_ the tool, an error indicating that the
1124-   * server does not support tool calls, or any other exceptional conditions,
1125-   * should be reported as an MCP error response.
$ grep -n -A5 'Any errors that originate' s2607tag.ts | head -7
1828:   * Any errors that originate from the tool SHOULD be reported inside the result
1829-   * object, with `isError` set to true, _not_ as an MCP protocol-level error
1830-   * response. Otherwise, the LLM would not be able to see that an error occurred
1831-   * and self-correct.
```

Sources: the [2025-11-25 tag schema.ts](https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/2025-11-25/schema/2025-11-25/schema.ts) and the [2026-07-28 tag schema.ts](https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/2026-07-28/schema/2026-07-28/schema.ts), fetched 2026-11-27. The 2026-07-28 text was read this time (`main` copy, lines 1829 to 1840, matches the tag copy, with the same wording and the closing "However, any errors in _finding_ the tool ... should be reported as an MCP error response."). The sentence also appears on the rendered [2025-11-25 schema page](https://modelcontextprotocol.io/specification/2025-11-25/schema): "Any errors that originate from the tool SHOULD be reported inside the result object, with isError set to true, not as an MCP protocol-level error response. Otherwise, the LLM would not be able to see that an error occurred and self-correct."

This is a SHOULD with its reason stated, identical in both revisions. It supports C1 more directly than the "Malformed requests" reading does.

### 4. `Tool.inputSchema` and `ToolUseContent.input`

```
$ grep -n -B2 -A6 'inputSchema: {' s2511tag.ts
1258:  inputSchema: {
1259-    $schema?: string;
1260-    type: "object";
1261-    properties?: { [key: string]: object };
1262-    required?: string[];
1263-  };
$ grep -n 'inputSchema: {' s2607tag.ts
1997:  inputSchema: { $schema?: string; type: "object"; [key: string]: unknown };
$ grep -n 'input: { \[key' s2511tag.ts
1849:  input: { [key: string]: unknown };
$ grep -n -B1 'input: { \[key' s2607.ts
2438-   * The arguments to pass to the tool, conforming to the tool's input schema.
2439:  input: { [key: string]: unknown };
```

In 2025-11-25 ([tag schema.ts](https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/2025-11-25/schema/2025-11-25/schema.ts), line 1258, fetched 2026-11-27) `Tool.inputSchema` is a JSON Schema object with `type: "object"`, `properties?` and `required?`, and the doc comment is "A JSON Schema object defining the expected parameters for the tool." In 2026-07-28 ([tag schema.ts](https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/2026-07-28/schema/2026-07-28/schema.ts), line 1997) it is `{ $schema?: string; type: "object"; [key: string]: unknown }`, an open object; its doc comment adds that the schema defaults to JSON Schema 2020-12 and may carry `x-mcp-header` annotations (seen on the `main` copy, lines 2004 to 2011). That is a real change between the revisions, but it widens what a server may declare. It does not change the type of `arguments`, and it does not make an `inputSchema` violation a malformed request.

The only text that relates arguments to a schema is `ToolUseContent.input` in the sampling section. [2025-11-25 tag schema.ts](https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/2025-11-25/schema/2025-11-25/schema.ts) (line 1849, preceded by "The arguments to pass to the tool, conforming to the tool's input schema.") and [2026-07-28 main schema.ts](https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/main/schema/2026-07-28/schema.ts) (lines 2437 to 2439) both say so. This is a sampling-side type (a model asking the client to run a tool), not `CallToolRequest`.

### 5. The security sentence

The measured phrase count in section 2 shows "Validate all tool inputs" twice on each tools page. The surrounding text on the [2025-11-25 tools page](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) (fetched 2026-11-27): "Security Considerations Servers MUST : Validate all tool inputs Implement proper access controls Rate limit tool invocations Sanitize tool outputs". The [2026-07-28 tools page](https://modelcontextprotocol.io/specification/2026-07-28/server/tools) has the same four items. The sentence tells the server to validate. It does not say on which channel a validation failure goes. The taxonomy (section 2) and the `isError` comment (section 3) decide that.

## Boundary of the finding

- The spec still does not say in words "an `inputSchema` violation is a tool execution error". The conclusion is the reading of: the open `arguments` type (section 1), the two quoted taxonomy lists (section 2), and the `isError` SHOULD (section 3). All three are measured on both revisions.
- This follow-up shows what the spec text says. It does not show what each client does with a `-32602` on a bad argument. A client on 2025-11-25 may still drop a protocol error ("MAY provide protocol errors"), which is the reason to return `isError: true`.
- The probe in the consolidation (R4) already showed that grim returns a missing-field failure as `isError: true` (correct) and a malformed reference as `-32603` (incorrect under both revisions).

## Effect on the ruleset

| Rule | Effect | Exact new text | Verification |
|---|---|---|---|
| UX-AGENT-15 | confirm, edit to Rationale only (severity MUST, rule text unchanged) | In the Rationale cell, replace "Spec, revision 2026-07-28, "Error Handling" (fetched 2026-11-27, quoted in C1)" with "Spec, revisions 2025-11-25 and 2026-07-28, "Error Handling" (fetched 2026-11-27, quoted in C1; both revisions carry the same Protocol Errors and Tool Execution Errors lists and the same two client clauses)". Append to the Rationale cell: "`CallToolResult.isError`, identical in both revisions: "Any errors that originate from the tool SHOULD be reported inside the result object, with `isError` set to true, _not_ as an MCP protocol-level error response. Otherwise, the LLM would not be able to see that an error occurred and self-correct." ([2025-11-25 schema](https://modelcontextprotocol.io/specification/2025-11-25/schema), [2026-07-28 schema](https://modelcontextprotocol.io/specification/2026-07-28/schema))". | Rule check, unchanged: script `tools/call` for not-found, unauthorised, refused, timeout, a malformed value and a missing field; every response is a `result` with `isError == true` and no `error` member. Edit check, new: `rg -c 'revisions 2025-11-25 and 2026-07-28' ux-agent-facing-interfaces.md` is at least 1 and `rg -c 'Spec, revision 2026-07-28, "Error Handling"' ux-agent-facing-interfaces.md` is 0; the appended quote is correct if `rg -F 'with `isError` set to true' ux-agent-facing-interfaces.md` matches and the same words appear in `grep -n -A5 'Any errors that originate' schema.ts` of both revisions. |
| C1 (Conflicts resolved) | confirm, edit | Replace the last sentence "The 2025-11-25 schema was not re-read." with: "Re-read 2026-11-27 against the [2025-11-25 tag](https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/2025-11-25/schema/2025-11-25/schema.ts) and the [2026-07-28 tag](https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/2026-07-28/schema/2026-07-28/schema.ts): both type `arguments?: { [key: string]: unknown }` with the description "Arguments to use for the tool call.", both carry the same `CallToolResult.isError` comment, and the 2025-11-25 [tools page](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) has the same Protocol Errors and Tool Execution Errors lists. The reading holds on both revisions." | `rg -c 'The 2025-11-25 schema was not re-read' ux-agent-facing-interfaces.md` is 0; `rg -c 'The reading holds on both revisions' ux-agent-facing-interfaces.md` is 1. Correctness: `curl -sL <2025-11-25 tag url> \| grep -c 'arguments?: { \[key: string\]: unknown }'` is at least 1 and the same on the 2026-07-28 tag URL. |
| Verdict point 7 | confirm, small edit | After "The reason is in the spec text, fetched for this revision (quoted under C1)." append: "The same lists and the same open `arguments` type are in revision 2025-11-25, so the verdict holds for clients on either revision." | `rg -c 'holds for clients on either revision' ux-agent-facing-interfaces.md` is 1. Correctness is the same two curl-and-grep checks as the C1 row. |
| Revision log | add one line | "UX-AGENT-15, Verdict 7, C1: the 2025-11-25 text was read and measured on 2026-11-27 (followup-q3). `arguments`, the Error Handling lists and `CallToolResult.isError` are the same as in 2026-07-28. `Tool.inputSchema` is typed open in 2026-07-28 and closed (`properties?`, `required?`) in 2025-11-25; this does not change the rule." | `rg -c 'followup-q3' ux-agent-facing-interfaces.md` is at least 1. |
| UX-AGENT-05, 09, 16 | none | Not touched. | none needed |

No new rule. No promotion or demotion: UX-AGENT-15 is already MUST, and its evidence now covers both revisions.

One note for the consolidation's revision log: the correctable-errors dive (E8) read the 2025-11-25 spec as putting schema failures on the protocol channel. The same revision's text, measured here, does not support that reading. The dive's own statement that the question was "not resolved by the spec text read here" is the accurate one.

## Dated facts

| Fact | Source | Date |
|---|---|---|
| `CallToolRequestParams.arguments?: { [key: string]: unknown }`, "Arguments to use for the tool call." Same in 2025-11-25 and 2026-07-28. | [2025-11-25 tag schema.ts](https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/2025-11-25/schema/2025-11-25/schema.ts) (66,523 bytes, line 1143), [2026-07-28 tag schema.ts](https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/2026-07-28/schema/2026-07-28/schema.ts) (98,426 bytes, around line 1869); rendered [2025-11-25 schema page](https://modelcontextprotocol.io/specification/2025-11-25/schema) | fetched 2026-11-27; tag 2025-11-25 commit dated 2025-11-25T21:14:08Z; schema page `lastModified` 2026-11-09 |
| Protocol Errors: unknown tool(s), malformed requests (fail `CallToolRequest` schema), server errors. Tool Execution Errors: API failures, input validation errors, business logic errors. Clients SHOULD pass tool execution errors to the model and MAY pass protocol errors. Same in both revisions. | [2025-11-25 tools page](https://modelcontextprotocol.io/specification/2025-11-25/server/tools), [2026-07-28 tools page](https://modelcontextprotocol.io/specification/2026-07-28/server/tools) | fetched 2026-11-27; `lastModified` 2026-11-09 and 2026-11-24 |
| `CallToolResult.isError` SHOULD: tool-originated errors go "inside the result object", "_not_ as an MCP protocol-level error response". Identical in both revisions. | [2025-11-25 tag schema.ts](https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/2025-11-25/schema/2025-11-25/schema.ts) (line 1118), [2026-07-28 tag schema.ts](https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/2026-07-28/schema/2026-07-28/schema.ts) (line 1828) | fetched 2026-11-27 |
| `Tool.inputSchema`: 2025-11-25 `{ $schema?; type: "object"; properties?; required? }`; 2026-07-28 `{ $schema?; type: "object"; [key: string]: unknown }`. | same two tag files (lines 1258 and 1997) | fetched 2026-11-27 |
| `ToolUseContent.input: { [key: string]: unknown }`, "conforming to the tool's input schema". Sampling type only. | same 2025-11-25 tag file (line 1849); [2026-07-28 main schema.ts](https://raw.githubusercontent.com/modelcontextprotocol/modelcontextprotocol/main/schema/2026-07-28/schema.ts) (line 2439) | fetched 2026-11-27 |
| Security Considerations: "Servers MUST: Validate all tool inputs", plus access controls, rate limits, output sanitising. Same in both revisions. | [2025-11-25 tools page](https://modelcontextprotocol.io/specification/2025-11-25/server/tools), [2026-07-28 tools page](https://modelcontextprotocol.io/specification/2026-07-28/server/tools) | fetched 2026-11-27 |
| "Tool names SHOULD be between 1 and 128 characters in length (inclusive)." Same in both revisions; context only. | [2025-11-25 tools page](https://modelcontextprotocol.io/specification/2025-11-25/server/tools), section "Tool Names"; [2026-07-28 tools page](https://modelcontextprotocol.io/specification/2026-07-28/server/tools) | fetched 2026-11-27 |
| Release tags: 2025-11-25 is commit `38c84e9f93ad191d9eb26d92b945d17bd0efcaf3` (2025-11-25T21:14:08Z); 2026-07-28 is `5f5440bb26a62e2cf3440b92da5a667efa03b267`. | GitHub API: [git/ref/tags/2025-11-25](https://api.github.com/repos/modelcontextprotocol/modelcontextprotocol/git/ref/tags/2025-11-25), [git/ref/tags/2026-07-28](https://api.github.com/repos/modelcontextprotocol/modelcontextprotocol/git/ref/tags/2026-07-28) | fetched 2026-11-27 |

Not vendor data: the MCP specification is the protocol's own normative text.

## What could not be determined

- Whether any shipping client on 2025-11-25 shows a `-32602` argument failure to the model. This needs a client run or its source. I ran no client, so "clients MAY drop protocol errors" stays a statement of the spec's permission, not of observed behaviour.
- The pages carry no publication date. The revision string in the URL, the tag commit date (2025-11-25) and the Mintlify `lastModified` values are the only dates available.
- The 2026-07-28 rendered schema page was not fetched; the 2026-07-28 schema evidence is the raw `schema.ts` at the tag and at `main`, and the 2026-07-28 tools page. The two `schema.ts` copies agree on every operative line.

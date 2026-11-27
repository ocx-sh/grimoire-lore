---
title: "Follow-up q0: do non-Claude MCP clients pass isError text and protocol errors to the model, and where do they truncate?"
program: product
topic: ux-agent-facing-interfaces
worker: followup-q0
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 12
---

# Follow-up q0: non-Claude MCP clients, error channels and truncation

Question (from `ux-agent-facing-interfaces.md`, Open question 2): do Codex, Copilot in VS Code, Cursor and Gemini CLI pass `isError` text and protocol errors to the model, and where do they truncate? UX-AGENT-15 (channel choice), UX-AGENT-16 (error text bound) and UX-AGENT-26 (result size) rested on Claude Code alone.

Repair pass: every source claim below now carries a GitHub permalink (full commit SHA plus line range) or a docs URL with the page's own date, and every read or measurement shows the command and its raw output. The Copilot reading was redone against the repository the code lives in today (see "Copilot in VS Code").

## Answer

Three of four clients were read in source and all three show the model both channels. Cursor is closed source and its docs are silent. That is a documented gap, not a pass.

| Client | `isError: true` result reaches model? | Protocol error (thrown) reaches model? | Truncation of results | Truncation of error text |
|---|---|---|---|---|
| Codex CLI | Yes, as a function-call output with `success: false`. | Yes. The error string becomes an `is_error: true` text result and takes the same path. | Default 10,000 tokens (14 of 14 `truncation_policy` entries in `models.json`), times 1.2, about 48,000 bytes at 4 bytes per token. Keeps head and tail, drops the middle, adds `Warning: truncated output (original token count: N)`. | Same budget. No branch on error. |
| Copilot in VS Code | Yes, as plain content. The `isError` flag goes only to UI `details`. The model gets no failure marker. | Yes, as `ERROR while calling tool: <message>` plus the fixed suffix `Please check your input and try again.` | 50% of the model's max prompt tokens (`MAX_TOOL_RESPONSE_PCT = 0.5`), through a prompt-tsx `TokenLimit`. | Same path as successes. |
| Gemini CLI | Yes, wrapped: `MCP tool '<name>' reported tool error for function call: <args JSON> with response: <response JSON>`. | Yes. A thrown error is caught in `mcp-client.ts` and returned as `{error:{message,isError:true}}`, then wrapped the same way. | 40,000 characters (`DEFAULT_TRUNCATE_TOOL_OUTPUT_THRESHOLD`) on the default path. Full text saved to a file; a truncated view is sent. | Not truncated: `truncateOutputIfNeeded` is not called on the error path. |
| Cursor | Not determined | Not determined | Not determined | Not determined |

Claude Code, for comparison (documented, not source-read): a successful result over 50,000 characters is saved to a file; error text over about 11,000 characters keeps its first 5,000 and last 5,000 characters.

## Evidence

Clones are in `~/.cache/research-lang/exemplars/product/wave2/q0/` (codex, gemini-cli, vscode, vcc) and `~/.cache/research-lang/exemplars/product/wave2/q0-repair2/` (vscode2, docs pages). Source is vendor code and describes the revision named. Links are permalinks.

### Codex (openai/codex at `57b493a648aa44547f5debf6e3344fcd2b2af529`, commit date 2026-11-27)

```
$ git -C ~/.cache/research-lang/exemplars/product/wave2/q0/codex log -1 --format='%H %cI'
57b493a648aa44547f5debf6e3344fcd2b2af529 2026-11-27T12:43:46+00:00
```

Channel mapping, [`codex-rs/protocol/src/models.rs#L2465-L2498`](https://github.com/openai/codex/blob/57b493a648aa44547f5debf6e3344fcd2b2af529/codex-rs/protocol/src/models.rs#L2465-L2498):

```
$ grep -n "pub fn from_result\|fn from_error_text\|is_error: Some(true)\|pub fn success\|success: Some(self.success())" codex-rs/protocol/src/models.rs
2465:    pub fn from_result(result: Result<Self, String>) -> Self {
2472:    pub fn from_error_text(text: String) -> Self {
2479:            is_error: Some(true),
2484:    pub fn success(&self) -> bool {
2496:                success: Some(self.success()),
2507:                        success: Some(self.success()),
2521:            success: Some(self.success()),
$ sed -n '2465,2487p' codex-rs/protocol/src/models.rs
    pub fn from_result(result: Result<Self, String>) -> Self {
        match result {
            Ok(result) => result,
            Err(error) => Self::from_error_text(error),
        }
    }
    pub fn from_error_text(text: String) -> Self {
        Self {
            content: vec![serde_json::json!({ "type": "text", "text": text, }) ],
            structured_content: None,
            is_error: Some(true),
            meta: None,
        }
    }
    pub fn success(&self) -> bool {
        self.is_error != Some(true)
    }
```

(Blank lines and one line's formatting compressed; the line numbers above are from the grep.) A thrown error and an `isError` result both end as a content item plus `success: Some(false)`.

Unparseable arguments, [`codex-rs/core/src/mcp_tool_call.rs#L183`](https://github.com/openai/codex/blob/57b493a648aa44547f5debf6e3344fcd2b2af529/codex-rs/core/src/mcp_tool_call.rs#L183):

```
$ grep -n "from_error_text(format" codex-rs/core/src/mcp_tool_call.rs
183:                result: CallToolResult::from_error_text(format!("err: {e}")),
```

Truncation on one path for success and error, [`codex-rs/core/src/tools/context.rs#L257-L280`](https://github.com/openai/codex/blob/57b493a648aa44547f5debf6e3344fcd2b2af529/codex-rs/core/src/tools/context.rs#L257-L280):

```
$ grep -n "truncate_function_output_payload\|with_serialization_allowance" codex-rs/core/src/tools/context.rs
26:use codex_utils_output_truncation::truncate_function_output_payload;
27:use codex_utils_output_truncation::with_serialization_allowance;
213:        Some(with_serialization_allowance(self.truncation_policy).token_budget())
277:        truncate_function_output_payload(
279:            with_serialization_allowance(self.truncation_policy),
$ sed -n '257,268p' codex-rs/core/src/tools/context.rs
        let wall_time_seconds = self.wall_time.as_secs_f64();
        let header = format!("Wall time: {wall_time_seconds:.4} seconds\nOutput:");
        match &mut payload.body { ... }          (header prepended to text or content items)
```

`response_payload` has no `is_error` branch between the header and the call at line 277.

Allowance, header and head-and-tail, [`utils/output-truncation/src/lib.rs#L48-L74`](https://github.com/openai/codex/blob/57b493a648aa44547f5debf6e3344fcd2b2af529/codex-rs/utils/output-truncation/src/lib.rs#L48-L74) and [`utils/string/src/truncate.rs#L6-L40`](https://github.com/openai/codex/blob/57b493a648aa44547f5debf6e3344fcd2b2af529/codex-rs/utils/string/src/truncate.rs#L6-L40):

```
$ grep -n "policy \* 1.2\|Warning: truncated output" codex-rs/utils/output-truncation/src/lib.rs
51:    policy * 1.2
70:        "Warning: truncated output (original token count: {original_token_count})\nTotal output lines: {total_lines}\n\n"
$ grep -n "APPROX_BYTES_PER_TOKEN: usize\|truncated…" codex-rs/utils/string/src/truncate.rs
6:const APPROX_BYTES_PER_TOKEN: usize = 4;
38:        marker: format!("…{removed_tokens} tokens truncated…"),
53:    assemble_truncated_output(left, right, &format!("…{removed_chars} chars truncated…"))
$ sed -n '28,39p' codex-rs/utils/string/src/truncate.rs
pub fn plan_token_truncation(s: &str, max_tokens: usize) -> Option<TextTruncation> {
    let max_bytes = approx_bytes_for_tokens(max_tokens);
    if s.len() <= max_bytes { return None; }
    let (left_budget, right_budget) = split_budget(max_bytes);
    let removed = s.floor_char_boundary(left_budget)..s.ceil_char_boundary(s.len() - right_budget);
    ...
```

Per-model budgets, [`codex-rs/models-manager/models.json`](https://github.com/openai/codex/blob/57b493a648aa44547f5debf6e3344fcd2b2af529/codex-rs/models-manager/models.json) and the fallback, [`model_info.rs#L128`](https://github.com/openai/codex/blob/57b493a648aa44547f5debf6e3344fcd2b2af529/codex-rs/models-manager/src/model_info.rs#L128):

```
$ grep -c '"truncation_policy"' codex-rs/models-manager/models.json
14
$ grep -A3 '"truncation_policy"' codex-rs/models-manager/models.json | grep -E 'mode|limit' | paste - - | sort | uniq -c
      1         "limit": 10000,	        "mode": "tokens"
     13         "mode": "tokens",	        "limit": 10000
$ grep -n "bytes(/\*limit\*/ 10_000)" codex-rs/models-manager/src/model_info.rs
128:        truncation_policy: TruncationPolicyConfig::bytes(/*limit*/ 10_000),
```

All 14 entries are `tokens` / 10000 (the two lines differ only in key order). 10,000 tokens x 1.2 x 4 bytes is 48,000 bytes. The fallback for an unknown model is 10,000 bytes, a much lower cap.

Docs: the Codex MCP page ([learn.chatgpt.com/docs/extend/mcp](https://learn.chatgpt.com/docs/extend/mcp?surface=cli), `Last-Modified: Thu, 26 Nov 2026 17:40:55 GMT`, fetched 2026-11-27) says `tools.<tool>.output_token_limit` is a "Positive token budget for one tool's output, before the standard 20% serialization allowance. Overrides the model's default output truncation budget for that tool." The text `isError` does not appear on the page:

```
$ grep -n -i "output_token_limit\|isError\|truncat" cx.txt
1283:tools.<tool>.output_token_limit
1286:model’s default output truncation budget for that tool.
1636:output_token_limit = 
$ curl -sI -m 20 https://developers.openai.com/codex/mcp | grep -iE '^(HTTP|location|date)'
HTTP/2 308
date: Fri, 27 Nov 2026 13:17:00 GMT
location: https://learn.chatgpt.com/docs/extend/mcp?surface=cli
$ curl -sI -m 20 https://learn.chatgpt.com/docs/extend/mcp | grep -iE '^(HTTP|last-modified)'
HTTP/2 200
last-modified: Thu, 26 Nov 2026 17:40:55 GMT
```

### Copilot in VS Code

Current location. The standalone repository `microsoft/vscode-copilot-chat` is archived and its last push was 2026-05-20; the code now lives in `microsoft/vscode` under `extensions/copilot`:

```
$ curl -s -m 20 https://api.github.com/repos/microsoft/vscode-copilot-chat | grep -E '"archived"|"pushed_at"'
  "pushed_at": "2026-05-20T10:23:40Z",
  "archived": true,
$ curl -s -m 20 "https://api.github.com/repos/microsoft/vscode/contents/extensions/copilot/src/extension/prompts/node/agent/agentPrompt.tsx" | grep -E '"name"|"sha"'
  "name": "agentPrompt.tsx",
  "sha": "ef7f92fedb3844189167ba31413f04be8c5c632e",
$ git clone -q --depth 1 --filter=blob:none --sparse https://github.com/microsoft/vscode.git vscode2 && cd vscode2 && git sparse-checkout set extensions/copilot/src/extension/prompts/node && git log -1 --format='%H %cI'
f39e18fe98e794bccc2de9ed95e898b4406b6301 2026-11-27T13:02:32+00:00
```

This closes the earlier gap "whether the vscode-copilot-chat clone is current": it was not, and the constants were re-read at `f39e18fe98e794bccc2de9ed95e898b4406b6301` (2026-11-27):

```
$ F=extensions/copilot/src/extension/prompts/node
$ grep -n "ERROR while calling tool\|toolErrorSuffix =" $F/panel/toolCalling.tsx
237:const toolErrorSuffix = '\nPlease check your input and try again.';
699:		return { result: textToolResult(`ERROR while calling tool: ${errorMessage}${toolErrorSuffix}`) };
$ grep -n "MAX_TOOL_RESPONSE_PCT\|maxToolResultLength =" $F/agent/agentPrompt.tsx
91:const MAX_TOOL_RESPONSE_PCT = 0.5;
155:		const maxToolResultLength = Math.floor(this.promptEndpoint.modelMaxPromptTokens * MAX_TOOL_RESPONSE_PCT);
$ grep -n "<TokenLimit" $F/panel/toolCalling.tsx
943:			return <TokenLimit max={this.props.truncate}>{await super.onTSX(part)}</TokenLimit>;
$ grep -rn "isError" $F | head -5
(no output)
```

Permalinks: [`toolCalling.tsx#L237`](https://github.com/microsoft/vscode/blob/f39e18fe98e794bccc2de9ed95e898b4406b6301/extensions/copilot/src/extension/prompts/node/panel/toolCalling.tsx#L237), [`#L699`](https://github.com/microsoft/vscode/blob/f39e18fe98e794bccc2de9ed95e898b4406b6301/extensions/copilot/src/extension/prompts/node/panel/toolCalling.tsx#L699), [`#L943`](https://github.com/microsoft/vscode/blob/f39e18fe98e794bccc2de9ed95e898b4406b6301/extensions/copilot/src/extension/prompts/node/panel/toolCalling.tsx#L943), [`agentPrompt.tsx#L91`](https://github.com/microsoft/vscode/blob/f39e18fe98e794bccc2de9ed95e898b4406b6301/extensions/copilot/src/extension/prompts/node/agent/agentPrompt.tsx#L91), [`#L155`](https://github.com/microsoft/vscode/blob/f39e18fe98e794bccc2de9ed95e898b4406b6301/extensions/copilot/src/extension/prompts/node/agent/agentPrompt.tsx#L155). The suffix is added to every thrown error, including server faults. No `isError` reference exists anywhere in the prompt-building code, so a flag cannot reach the prompt there.

The MCP-to-model conversion is in the workbench: [`src/vs/workbench/contrib/mcp/common/mcpLanguageModelToolContribution.ts#L280`](https://github.com/microsoft/vscode/blob/f39e18fe98e794bccc2de9ed95e898b4406b6301/src/vs/workbench/contrib/mcp/common/mcpLanguageModelToolContribution.ts#L280) and [`#L333`](https://github.com/microsoft/vscode/blob/f39e18fe98e794bccc2de9ed95e898b4406b6301/src/vs/workbench/contrib/mcp/common/mcpLanguageModelToolContribution.ts#L333):

```
$ grep -n "isError: callResult.isError\|!callResult.structuredContent" src/vs/workbench/contrib/mcp/common/mcpLanguageModelToolContribution.ts
280:			isError: callResult.isError === true,
333:				if (isForModel && !callResult.structuredContent) {
$ sed -n '276,281p' (same file)
		const details: Mutable<IToolResultInputOutputDetails> = {
			input: JSON.stringify(invocation.parameters, undefined, 2),
			output: [],
			isError: callResult.isError === true,
		};
```

`isError` is written into `details` (UI). Line 333 pushes each text block to `result.content` for the model, and skips text blocks when `structuredContent` is present (the structured value is sent instead). Nothing in the model-facing content records the flag. The same file was read at `3a01a7e4a6fbcc3f80d089aa3629601f924357d8` (2026-11-27) with identical line numbers.

Docs: the VS Code MCP page ([code.visualstudio.com/docs/agent-customization/mcp-servers](https://code.visualstudio.com/docs/agent-customization/mcp-servers), `ms.date` 11/25/2026, fetched 2026-11-27) has no occurrence of `isError` or `truncat`. The old URL `/docs/copilot/customization/mcp-servers` answers `HTTP/2 301` with `location: /docs/agent-customization/mcp-servers`.

### Gemini CLI (google-gemini/gemini-cli at `60f8082b14ffa7f10b608270232f3f57b5abbec8`, commit date 2026-11-25)

```
$ git -C .../q0/gemini-cli log -1 --format='%H %cI'
60f8082b14ffa7f10b608270232f3f57b5abbec8 2026-11-25T17:59:29+00:00
$ grep -n "reported tool error\|function isMCPToolError" packages/core/src/tools/mcp-tool.ts
459:      }' reported tool error for function call: ${safeJsonStringify(
$ sed -n '455,470p' packages/core/src/tools/mcp-tool.ts
    if (this.isMCPToolError(rawResponseParts)) {
      const errorMessage = `MCP tool '${
        this.serverToolName
      }' reported tool error for function call: ${safeJsonStringify(
        functionCalls[0],
      )} with response: ${safeJsonStringify(rawResponseParts)}`;
      return {
        llmContent: errorMessage,
        returnDisplay: `Error: MCP tool '${this.serverToolName}' reported an error.`,
        error: { message: errorMessage, type: ToolErrorType.MCP_TOOL_ERROR },
      };
    }
```

[`mcp-tool.ts#L455-L470`](https://github.com/google-gemini/gemini-cli/blob/60f8082b14ffa7f10b608270232f3f57b5abbec8/packages/core/src/tools/mcp-tool.ts#L455-L470). The error text contains the call arguments and the full response JSON.

Thrown errors, [`mcp-client.ts#L1628-L1645`](https://github.com/google-gemini/gemini-cli/blob/60f8082b14ffa7f10b608270232f3f57b5abbec8/packages/core/src/tools/mcp-client.ts#L1628-L1645):

```
$ grep -n "isError: true" packages/core/src/tools/mcp-client.ts
1638:                isError: true,
$ sed -n '1629,1641p' packages/core/src/tools/mcp-client.ts
    } catch (error) {
      // Return error in the format expected by DiscoveredMCPTool
      return [ { functionResponse: { name: call.name, response: { error: {
                message: error instanceof Error ? error.message : String(error),
                isError: true, } } } } ];
```

Truncation runs on the success and cancelled paths only, [`scheduler/tool-executor.ts`](https://github.com/google-gemini/gemini-cli/blob/60f8082b14ffa7f10b608270232f3f57b5abbec8/packages/core/src/scheduler/tool-executor.ts#L476):

```
$ grep -n "createErrorResponse\|truncateOutputIfNeeded" packages/core/src/scheduler/tool-executor.ts
210:  private async truncateOutputIfNeeded(
476:        await this.truncateOutputIfNeeded(call, toolResult?.llmContent);
541:      await this.truncateOutputIfNeeded(call, toolResult.llmContent);
603:    const response = this.createErrorResponse(
625:  private createErrorResponse(
```

Line 476 is the cancelled branch with partial output and line 541 the success branch (corrects the earlier text, which called both "success"). `createErrorResponse` (line 625, response `{ error: error.message }`) never calls `truncateOutputIfNeeded`. Whether the `isError` wrapper above arrives through line 541 (it returns `llmContent`) was not traced; if it does, the long wrapper is subject to the 40,000-character cut. See "What could not be determined".

Threshold and default path, [`config.ts#L487`](https://github.com/google-gemini/gemini-cli/blob/60f8082b14ffa7f10b608270232f3f57b5abbec8/packages/core/src/config/config.ts#L487), [`config.ts#L1214`](https://github.com/google-gemini/gemini-cli/blob/60f8082b14ffa7f10b608270232f3f57b5abbec8/packages/core/src/config/config.ts#L1214), [`settingsSchema.ts#L1769`](https://github.com/google-gemini/gemini-cli/blob/60f8082b14ffa7f10b608270232f3f57b5abbec8/packages/cli/src/config/settingsSchema.ts#L1769), [`toolDistillationService.ts#L63`](https://github.com/google-gemini/gemini-cli/blob/60f8082b14ffa7f10b608270232f3f57b5abbec8/packages/core/src/context/toolDistillationService.ts#L63):

```
$ grep -n "DEFAULT_TRUNCATE_TOOL_OUTPUT_THRESHOLD =" packages/core/src/config/config.ts
487:export const DEFAULT_TRUNCATE_TOOL_OUTPUT_THRESHOLD = 40_000;
$ grep -n "enabled: params.contextManagement" packages/core/src/config/config.ts
1214:enabled: params.contextManagement?.enabled ?? false,
$ grep -n "truncateToolOutputThreshold" packages/cli/src/config/settingsSchema.ts
1769:      truncateToolOutputThreshold: {
$ grep -n "thresholdChars" packages/core/src/context/toolDistillationService.ts
63:    const thresholdChars = maxTokens * 4;
```

Context management is off by default (`?? false`), so the 40,000-character legacy path is the default. This closes the earlier gap. The setting's description reads "Maximum characters to show when truncating large tool outputs. Set to 0 or negative to disable truncation."

Docs: [geminicli.com/docs/tools/mcp-server](https://geminicli.com/docs/tools/mcp-server/) (page text "Last updated: Oct 6, 2026"; HTTP `last-modified` 2026-10-16; fetched 2026-11-27) has no `isError` and no truncation passage for results (its one "truncated" hit is about tool-name length: "Names longer than 63 characters are truncated with middle replacement"). It states a request timeout default of 600,000 ms.

### Cursor

[cursor.com/docs/mcp](https://cursor.com/docs/mcp) (served from the redirect of `/docs/context/mcp`: `HTTP/2 308`, `location: /docs/mcp`; no date on the page and no `last-modified` header; fetched 2026-11-27):

```
$ grep -n -i "crashes or times out" -A3 cu.txt | head -5
1242:What happens if an MCP server crashes or times out?
1244:Cursor shows an error message in chat
1245:The tool call is marked as failed
```

The page says nothing about what the model receives, and gives no size limit. Cursor's client is closed source. No claim about Cursor is made.

### Claude Code (the baseline, fetched this pass)

[code.claude.com/docs/en/mcp](https://code.claude.com/docs/en/mcp) (`Last-Modified: Thu, 26 Nov 2026 19:20:40 GMT`, fetched 2026-11-27, vendor documentation):

```
$ sed -n '3938,3944p' cc.txt
, Claude Code saves a successful result with no image content to a file once it’s longer than 50,000 characters, whatever its token count. Setting
MAX_MCP_OUTPUT_TOKENS
 doesn’t change this threshold
Error results
: when a tool returns a result marked
isError: true
, Claude receives the result’s text as the tool’s error message. Error text longer than about 11,000 characters keeps only its first 5,000 and last 5,000 characters, with a marker between them that says how many characters were removed
$ sed -n '3954p' cc.txt | cut -c1-300
If you’re building an MCP server, you can allow individual tools to return results larger than the default persist-to-disk threshold of 50,000 characters by setting
```

Two different mechanisms, so the earlier wave-2 reading that Claude Code "keeps head and tail" for results was wrong: head-and-tail applies to error text only. Successful results above 50,000 characters are saved to a file, not cut.

## Reading

1. Channel: no client examined drops protocol errors. Codex, Copilot and Gemini all wrap a thrown error as an error result for the model. UX-AGENT-15's choice of `isError` still holds because it keeps the server's own text intact: Copilot appends "Please check your input and try again.", which is wrong advice for a server fault, and Gemini wraps the text in a long sentence with the call arguments.
2. Copilot gives the model no failure flag for an `isError` result. The text alone must say it failed. That supports the class-first prefix of UX-AGENT-16. It is a source reading, not a measurement of model behaviour; Open question 6 stands.
3. Truncation: on errors Claude Code keeps first 5,000 and last 5,000 characters of text over about 11,000. On results Claude Code spills to a file over 50,000 characters, Gemini saves to a file and sends a truncated view over 40,000 characters, Codex cuts the middle at about 48,000 bytes, and Copilot cuts at half the prompt window by a method not read. Two clients (Claude Code errors, Codex) drop the middle, so the class, verdict and next step belong at the start, and nothing the agent needs belongs in the middle.
4. Size: the smallest fixed result cap among the read clients is Gemini's 40,000 characters, then Codex at about 48,000 bytes (but 10,000 bytes for a model missing from `models.json`), then Claude Code at 50,000 characters. A server that targets 50,000 is truncated by Gemini and Codex.
5. Error-text bound: Claude Code's documented cut starts at about 11,000 characters, the lowest error-text cut found. Gemini and Codex do not cut error text below their result caps. So a 10,000-character bound keeps error text intact in every client read. It is a bound chosen just under the lowest documented cut, not a figure any vendor recommends.

## Effect on the ruleset

**UX-AGENT-15: confirm, verification extended.** Text unchanged. Rationale addition: "Codex, Copilot in VS Code and Gemini CLI each pass both an `isError` result and a thrown protocol error to the model (source at the SHAs in followup-q0, 2026-11-27); Cursor is unverified. Copilot drops the `isError` flag before the prompt, so the text must state the failure itself." New verification clause, added to the existing probe: for each probe, `jq -e '.result.isError == true and (.result.content[0].text | test("^[a-z_]+ \\((retryable|not retryable)\\): "))'` exits 0. A server that passes only the flag half would look correct in Claude Code and unmarked in Copilot.

**UX-AGENT-16: change.** New text:

> Start the text of every MCP error result with the class slug and the retry verdict, for example `not_found (not retryable): …`. Put everything the caller must act on in the first 2,000 characters. Use the same class the CLI's JSON mode gives for the same condition. Keep the text under 10,000 characters and keep call arguments out of it.

Rationale addition: "Claude Code keeps only the first 5,000 and last 5,000 characters of error text over about 11,000 ([docs](https://code.claude.com/docs/en/mcp), 2026-11-26), so 10,000 is a bound just under the lowest documented cut found; Codex cuts the middle of any output at about 48,000 bytes. Copilot sends no failure flag to the model, so the text alone must say it failed. Gemini CLI wraps error text with the full call arguments and does not truncate on its error path, so arguments in the text are repeated back. Cursor was not checked." Severity stays SHOULD. Verification gains: `jq -r '.result.content[0].text | .[0:2000]'` on each probe contains the class slug and `retryable` or `not retryable`, and `jq -r '.result.content[0].text' | wc -c` is under 10000 on the largest realistic error.

**UX-AGENT-26: change.** New text:

> Keep an MCP tool's text result under 40,000 characters by default. If a larger result is needed, set `_meta["anthropic/maxResultSizeChars"]` (ceiling 500,000) deliberately, state why, and offer a pagination argument for clients that truncate. This applies to MCP text results, not to CLI stdout.

Rationale: "Claude Code saves a result above 50,000 characters to a file ([docs](https://code.claude.com/docs/en/mcp), 2026-11-26). Gemini CLI's default is 40,000 characters (`config.ts#L487`, 2026-11-25). Codex's is 10,000 tokens x 1.2, about 48,000 bytes, and 10,000 bytes for a model missing from `models.json` (2026-11-27). Copilot uses 50% of the model's prompt window. The lowest fixed cap read is 40,000." Severity stays SHOULD. Verification: `jq -r '.result.content[0].text' | wc -c` on the largest realistic fixture is under 40,000, or the pagination argument exists and the docs give the reason.

**UX-AGENT-06: confirm.** A truncated middle (Codex) or a truncated view (Gemini) hides rows silently, which strengthens the case for the `total` and `truncated` fields. No text change.

**UX-AGENT-25: no change.**

**Decay table.** Add a row for UX-AGENT-16 and 26: "Non-Claude client caps: Codex 10,000 tokens per model entry, Gemini 40,000 characters, Copilot 50% of prompt window", sources above, refresh 3 months, re-check with `grep -A3 '"truncation_policy"' codex-rs/models-manager/models.json`, `grep -n DEFAULT_TRUNCATE_TOOL_OUTPUT_THRESHOLD packages/core/src/config/config.ts` and, in `microsoft/vscode`, `grep -n MAX_TOOL_RESPONSE_PCT extensions/copilot/src/extension/prompts/node/agent/agentPrompt.tsx`.

**New rule: none.** "Do not rely on the `isError` flag alone" is carried by the extended UX-AGENT-15 verification and the class-first prefix.

## Dated facts

| Fact | Source | Date |
|---|---|---|
| Codex: `Err` becomes an `is_error: true` text result; budget 10,000 tokens x 1.2; 4 bytes per token; 14 of 14 model entries 10,000 tokens | [openai/codex@57b493a6](https://github.com/openai/codex/tree/57b493a648aa44547f5debf6e3344fcd2b2af529), files above | commit 2026-11-27 |
| Codex per-tool override `tools.<tool>.output_token_limit`; `developers.openai.com/codex/mcp` answers 308 to this page | [learn.chatgpt.com/docs/extend/mcp](https://learn.chatgpt.com/docs/extend/mcp?surface=cli) | last-modified 2026-11-26 |
| Copilot: `ERROR while calling tool:` plus suffix; 50% of prompt tokens; code moved to `microsoft/vscode` `extensions/copilot`; old repo archived | [microsoft/vscode@f39e18fe](https://github.com/microsoft/vscode/tree/f39e18fe98e794bccc2de9ed95e898b4406b6301); GitHub API for `microsoft/vscode-copilot-chat` | commit 2026-11-27; old repo last push 2026-05-20 |
| VS Code: `isError` goes to UI `details` only | [mcpLanguageModelToolContribution.ts#L280](https://github.com/microsoft/vscode/blob/f39e18fe98e794bccc2de9ed95e898b4406b6301/src/vs/workbench/contrib/mcp/common/mcpLanguageModelToolContribution.ts#L280) | commit 2026-11-27 |
| VS Code MCP docs silent on `isError` and truncation | [code.visualstudio.com/docs/agent-customization/mcp-servers](https://code.visualstudio.com/docs/agent-customization/mcp-servers) | ms.date 2026-11-25 |
| Gemini CLI: error wrapped with args and response, not truncated on the error path; default cap 40,000 characters; context management off by default | [google-gemini/gemini-cli@60f8082b](https://github.com/google-gemini/gemini-cli/tree/60f8082b14ffa7f10b608270232f3f57b5abbec8), files above | commit 2026-11-25 |
| Gemini MCP docs silent on `isError` and result truncation | [geminicli.com/docs/tools/mcp-server](https://geminicli.com/docs/tools/mcp-server/) | updated 2026-10-06 |
| Cursor docs: failed call marked failed, no model-side detail | [cursor.com/docs/mcp](https://cursor.com/docs/mcp) | undated; fetched 2026-11-27 |
| Claude Code: result over 50,000 characters saved to a file; error text over about 11,000 characters keeps first and last 5,000 | [code.claude.com/docs/en/mcp](https://code.claude.com/docs/en/mcp) (vendor) | last-modified 2026-11-26 |

## What could not be determined

- **Cursor, everything.** Closed-source client; its docs state only UI behaviour. Needed: a Cursor install with a probe MCP server returning `isError` and a thrown error, plus a way to read the model-side tool message. That needs a logged-in client, which this follow-up may not use.
- **Copilot's absolute cap.** It is half of `modelMaxPromptTokens`, which depends on the model. Needed: the value for the model in use. How `TokenLimit` cuts (head, tail or middle) was not read; it lives in the `@vscode/prompt-tsx` package, not fetched.
- **Gemini error path length.** Whether the `isMCPToolError` wrapper (which embeds the full response JSON) reaches `truncateOutputIfNeeded` at `tool-executor.ts:541` was not traced. If so, an error over 40,000 characters is cut. The 10,000-character bound avoids it either way.
- **Model behaviour.** Nothing here measures what a model does with any of these texts. Whether the prefix changes behaviour is still Open question 6.
- **Actual runs.** All findings are source reads and documentation. No client was run against a live probe server, so a build that differs from the cloned commit could behave differently.

---
title: Does any client change approval behaviour on readOnlyHint true (follow-up q1)
program: product
topic: ux-consequential-actions
worker: followup-q1
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 18
---

# Does any client change approval behaviour when a server sets readOnlyHint: true?

Question: from the Open questions of [ux-consequential-actions.md](../ux-consequential-actions.md): does Claude Code or VS Code change its approval behaviour for a tool with `readOnlyHint: true`? The answer settles the benefit of UX-ACT-20.

## Answer

- **Claude Code 2.1.332: no.** Measured. A tool with `readOnlyHint: true`, a tool with no annotations and a tool that lies (hint true) were all denied the same way in default mode.
- **VS Code: yes, it skips the pre-run confirmation.** Read from source, not run. At commit `75901b0` of microsoft/vscode (main, 2026-11-27), an MCP tool with `readOnlyHint: true` gets no confirmation title, and a tool without a title is not prompted. Other consequences are in the table below.
- **Codex CLI and ChatGPT developer mode also key approval on the hint** (vendor docs and a merged PR, section 3). Claude Code is the outlier.
- So UX-ACT-20's benefit is real in VS Code, Codex CLI and ChatGPT developer mode, and absent in Claude Code. The same fact turns a wrong `readOnlyHint: true` into a prompt bypass in VS Code. That strengthens the "truthfully" half of the rule more than the "explicitly" half.

## 1. Claude Code, measured

Tool: `claude --version` printed `2.1.332 (Claude Code)`. Setup in `~/.cache/research-lang/exemplars/product/wave2/ux-consequential-actions-q1/`: `srv.py` is a 40-line stdio MCP server with three tools. Each call appends a line to a marker file in `work/`. Full contents, printed with `cat srv.py; cat mcp.json` in the scratch directory:

```python
import sys, json, os
MARK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "work")
def tool(name, desc, ann):
    t = {"name": name, "description": desc, "inputSchema": {"type":"object","properties":{"x":{"type":"string"}},"required":[]}}
    if ann is not None: t["annotations"] = ann
    return t
TOOLS = [
 tool("ro_hinted", "Return the word hello. Read only.", {"readOnlyHint": True, "destructiveHint": False, "openWorldHint": False}),
 tool("plain", "Return the word hello. No annotations.", None),
 tool("liar_hinted", "Writes a marker file then returns hello.", {"readOnlyHint": True}),
]
for line in sys.stdin:
    try: m = json.loads(line)
    except Exception: continue
    mid, meth = m.get("id"), m.get("method")
    if meth == "initialize":
        r = {"protocolVersion": m["params"]["protocolVersion"], "capabilities": {"tools": {}}, "serverInfo": {"name": "q1", "version": "0"}}
    elif meth == "tools/list":
        r = {"tools": TOOLS}
    elif meth == "tools/call":
        n = m["params"]["name"]
        if n == "liar_hinted":
            open(os.path.join(MARK, "liar_ran.txt"), "a").write("ran\n")
        else:
            open(os.path.join(MARK, n + "_ran.txt"), "a").write("ran\n")
        r = {"content": [{"type": "text", "text": "hello"}]}
    else:
        if mid is None: continue
        r = {}
    if mid is not None:
        sys.stdout.write(json.dumps({"jsonrpc":"2.0","id":mid,"result":r})+"\n"); sys.stdout.flush()
```

`mcp.json`:

```json
{"mcpServers":{"q1":{"command":"python3","args":["/home/mherwig/.cache/research-lang/exemplars/product/wave2/ux-consequential-actions-q1/srv.py"]}}}
```

| Tool | Annotations sent in `tools/list` |
|---|---|
| `ro_hinted` | `{"readOnlyHint": true, "destructiveHint": false, "openWorldHint": false}` |
| `plain` | none |
| `liar_hinted` | `{"readOnlyHint": true}`; its code writes a marker file |

Command (prompt first, as the earlier dive learned, because `--allowedTools` is variadic; default permission mode; no allow rules; run from `work/`):

```
claude -p "Call the MCP tools ro_hinted, plain and liar_hinted of server q1 once each, then say done." --strict-mcp-config --mcp-config ../mcp.json --output-format json --max-turns 6 </dev/null
```

Output, exit code 0, `permission_denials` field of the JSON result:

```
mcp__q1__ro_hinted   tool_input {}
mcp__q1__plain       tool_input {}
mcp__q1__liar_hinted tool_input {}
```

The model's text said "all three calls (`ro_hinted`, `plain`, `liar_hinted`) were blocked at the permission prompt, so none of them ran". `ls work/` printed nothing, so no marker file exists and no tool ran. The server was reachable, since the model addressed all three tools by name.

Reading: Claude Code 2.1.332 treats the hinted read tool exactly like the unannotated tool. This agrees with the earlier measurement using grim, which had no annotations ([agent-action-approval.md 2.2, 2.4](agent-action-approval.md)). Limits: one version, default mode only, `-p` headless. Auto mode, `plan` and the desktop app were not run. The auto-mode classifier "sees only user messages and tool calls" ([Anthropic, 2026-03-25, vendor data](https://www.anthropic.com/engineering/claude-code-auto-mode), re-fetched 2026-11-27: "The classifier sees only user messages and the agent's tool calls" and "we strip out Claude's own messages and tool outputs"; the page does not mention annotations), so it could in principle see the tool name only; whether it sees annotations was not tested.

Docs: the [permissions page](https://code.claude.com/docs/en/permissions) (fetched 2026-11-27, undated; the table lists "Read-only | File reads, Grep" as built-in tool types and no MCP annotation) and the [MCP page](https://code.claude.com/docs/en/mcp) (fetched 2026-11-27, first 100,000 of 178,344 characters read, undated) contain no `readOnlyHint`, `destructiveHint` or `annotations` match. The feature request [anthropics/claude-code#30142](https://github.com/anthropics/claude-code/issues/30142) (opened 2026-03-02) asked for a server-declared read/write flag so that 80+ read tools need no individual allow entries. It was closed as not planned by a bot on 2026-03-30 and locked on 2026-04-08. It has no maintainer reply, and it never mentions `readOnlyHint`, so it is weak evidence, but it is consistent with the measurement.

Stronger, from the issue tracker (search page `https://github.com/anthropics/claude-code/issues?q=readOnlyHint`, fetched 2026-11-27; only titles and dates were read, not bodies, so this is title-level evidence): [#87452](https://github.com/anthropics/claude-code/issues/87452) "Permission engine should process MCP ToolAnnotations hints (`readOnlyHint`, `destructiveHint`, etc.)", closed stale 2026-09-21, so the request was made and not implemented; [#83886](https://github.com/anthropics/claude-code/issues/83886) asked to surface annotations in PreToolUse hook input (closed stale 2026-10-06); [#90058](https://github.com/anthropics/claude-code/issues/90058) and [#78085](https://github.com/anthropics/claude-code/issues/78085) say read-only hinted tools are blocked in plan mode (closed 2026-10-27 and 2026-09-04); [#109845](https://github.com/anthropics/claude-code/issues/109845) (open, 2026-11-14) "MCP tools with `readOnlyHint: true` run serially over HTTP instead of in parallel", which implies Claude Code reads the hint for scheduling.

## 2. VS Code, read from source

Method: `git clone --depth 1 https://github.com/microsoft/vscode.git` into the scratch directory; `git log -1 --format='%H %cI'` printed `75901b0190e2e749402a268f45a240823ec4e9e2 2026-11-27T12:56:00+00:00`. Command: `grep -rn "readOnlyHint" src --include='*.ts' | grep -v /test/`. Output (the 29 lines under `src/vs/platform/agentHost/node/shared/*ServerTools.ts` are VS Code's own built-in agent-host tools declaring annotations on themselves, each of the form `annotations: { readOnlyHint: true|false[, destructiveHint: true] },`, and are collapsed to one line here; every other line is verbatim):

```
src/vs/platform/mcp/common/modelContextProtocol.ts:1655:		readOnlyHint?: boolean;
src/vs/platform/mcp/common/modelContextProtocol.ts:1661:		 * (This property is meaningful only when `readOnlyHint == false`)
src/vs/platform/mcp/common/modelContextProtocol.ts:1671:		 * (This property is meaningful only when `readOnlyHint == false`)
src/vs/platform/agentHost/node/codex/protocol/generated/v2/ThreadItem.ts:101:	mcpAppUi: McpAppUi | null, pluginId: string | null, readOnlyHint: boolean | null, result: ...
src/vs/platform/agentHost/node/shared/{artifactServerTools,sessionMoveTools,agentFeedbackServerTools,agentMergeServerTools,artifactIntegrationServerTools,sessionServerTools}.ts: 29 lines (collapsed)
src/vs/platform/agentHost/node/copilot/copilotBuiltinAgents.ts:153:	const readOnlyClientTools = clientTools.filter(tool => tool.annotations?.readOnlyHint === true).map(tool => toSdkClientToolName(tool.name)).sort();
src/vs/platform/agentHost/common/state/protocol/channels-session/state.ts:711:	readOnlyHint?: boolean;
src/vs/workbench/contrib/mcp/common/mcpLanguageModelToolContribution.ts:156:					canRequestPreApproval: !tool.definition.annotations?.readOnlyHint,
src/vs/workbench/contrib/mcp/common/mcpLanguageModelToolContribution.ts:234:			if (!tool.definition.annotations?.readOnlyHint) {
```

Two other readers exist: `copilotBuiltinAgents.ts:153` filters client tools by the hint to build a list for the Copilot SDK (agent-host path; what it does with the list was not read), and the Codex `ThreadItem.ts` is a generated protocol type. So the only consumer on the workbench MCP-tool confirmation path is [`src/vs/workbench/contrib/mcp/common/mcpLanguageModelToolContribution.ts`](https://github.com/microsoft/vscode/blob/75901b0190e2e749402a268f45a240823ec4e9e2/src/vs/workbench/contrib/mcp/common/mcpLanguageModelToolContribution.ts) (vendor source, commit above). Lines 149-157, 229-243:

```ts
canRequestPreApproval: !tool.definition.annotations?.readOnlyHint,
canRequestPostApproval: !!tool.definition.annotations?.openWorldHint,
...
let confirm: IToolConfirmationMessages | undefined;
if (!isSandboxedServer) {
    confirm = {};
    if (!tool.definition.annotations?.readOnlyHint) {
        confirm.title = new MarkdownString(localize('msg.title', "Run {0}", title));
        confirm.message = new MarkdownString(tool.definition.description, ...);
        confirm.disclaimer = mcpToolWarning;
        confirm.allowAutoConfirm = true;
    }
    if (tool.definition.annotations?.openWorldHint) {
        confirm.confirmResults = true;
    }
}
```

Whether a call prompts is decided in `src/vs/workbench/contrib/chat/browser/tools/languageModelToolsService.ts`. Command in the same clone: `grep -n "confirmationMessages?.title\|Confirm tool execution\|isEligibleForAutoApproval\|eligibleForAutoApproval" src/vs/workbench/contrib/chat/browser/tools/languageModelToolsService.ts`. Output:

```
723:				if (preparedInvocation?.confirmationMessages?.title) {
762:				if (preparedInvocation?.confirmationMessages?.title && !autoConfirmed) {
931:			if (!preparedInvocation?.confirmationMessages?.title) {
1039:			&& !preparedInvocation?.confirmationMessages?.title;
1045:		if (!isAlwaysClassifyTool && !preparedInvocation?.confirmationMessages?.title) {
1117:		const isEligibleForAutoApproval = this.isToolEligibleForAutoApproval(tool.data);
1120:		if (!isEligibleForAutoApproval && !prepared?.confirmationMessages?.title) {
1129:				title: localize('defaultToolConfirmation.title', 'Confirm tool execution'),
1136:		if (!isEligibleForAutoApproval && prepared?.confirmationMessages?.title) {
1141:		if (prepared?.confirmationMessages?.title) {
1145:				prepared.confirmationMessages.allowAutoConfirm = isEligibleForAutoApproval;
```

Decisive lines, printed with `sed -n '723,724p;762,763p;1117,1120p'` on the same file (lines 762-763 abbreviated):

```ts
723:	if (preparedInvocation?.confirmationMessages?.title) {
724:		if (!IChatToolInvocation.executionConfirmedOrDenied(toolInvocation) && !autoConfirmed) {
762:	if (preparedInvocation?.confirmationMessages?.title && !autoConfirmed) {
763:		const result = await this._dialogService.confirm({ message: renderAsPlaintext(...title), detail: ... });
1117:	const isEligibleForAutoApproval = this.isToolEligibleForAutoApproval(tool.data);
1119:	// Default confirmation messages if tool is not eligible for auto-approval
1120:	if (!isEligibleForAutoApproval && !prepared?.confirmationMessages?.title) {
```

Reading: the confirmation wait (723) and the dialog (762) run only when `confirmationMessages.title` is set, so a tool with no title is not prompted by this path. A default title "Confirm tool execution" is injected (1120-1129) only when `!isEligibleForAutoApproval`, the organisation-policy case (`chat.tools.eligibleForAutoApproval`), so policy overrides the hint. A second gate at lines 1030-1050 applies a risk-assessment ("Autopilot") classifier only to calls that would otherwise show a confirmation, plus self-approving tools (`run_in_terminal`, `fetch`), so a title-less MCP tool is not classified either. The lines before 1030 (the classifier's other entry conditions) were not read, so "not classified" is a reading, not a run.

| Annotation on an MCP tool | VS Code behaviour at commit `75901b0` |
|---|---|
| `readOnlyHint: true` (server not sandboxed) | No pre-run confirmation title is set, so the call runs without a prompt. The "always allow this tool" pre-approval control is not offered (`canRequestPreApproval` false), because nothing needs pre-approving. |
| `readOnlyHint` unset or false | Prompt "Run {tool}" with the tool description and a disclaimer; auto-confirm may be remembered. |
| `openWorldHint: true` | `confirmResults` is set, so the result is shown for approval before it goes to the model, and the post-approval control is offered. This holds even when `readOnlyHint` is true. |
| `annotations.title` | Used as the display name. |
| Server marked sandboxed (`isSandboxedServer`) | `confirm` is never populated, so no MCP confirmation is built at all. |
| Organisation policy makes the tool ineligible for auto-approval | A default "Confirm tool execution" prompt appears anyway (lines 1118-1131), so policy overrides the hint. |

The docs do not state this. The [approvals page](https://code.visualstudio.com/docs/agents/run/approvals) and the [agent tools page](https://code.visualstudio.com/docs/agents/agent-tools) (both footer-dated 11/25/2026, fetched 2026-11-27) never mention `readOnlyHint`; the second says only "Your permission level, runtime decisions, and saved approvals affect whether a call needs review." No third-party post about VS Code behaviour is relied on; the conclusion rests on the source above. The result is source-derived: no running VS Code build was driven, so a runtime override that is not in these files is possible. The default Manual permission level is assumed.

Consequence for the spec: MCP says "clients MUST consider tool annotations to be untrusted unless they come from trusted servers" ([latest, spec version 2026-07-28](https://modelcontextprotocol.io/specification/latest/server/tools), fetched 2026-11-27; Tool section: "For trust & safety and security, clients **MUST** consider tool annotations to be untrusted unless they come from trusted servers."). The VS Code code reads the hint from every non-sandboxed server with no trust check on that path. A user's decision to install a server may count as the trust signal; the MCP blog says exactly that: "most clients still treat installation itself as the trust signal" ([MCP blog, 2026-03-16](https://blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/)). That post also says `readOnlyHint: true` from a trusted server "might be auto-approved" and that "no MCP client lets users filter tools by annotation values, and none surface annotations as context in approval prompts". The VS Code source shows the second claim is outdated for VS Code on the first point (it keys the prompt on the hint), though the hint is still not shown in the prompt.

## 3. Other clients (fetched in the repair pass, 2026-11-27)

| Client | What the source says | Source |
|---|---|---|
| ChatGPT developer mode | "Read-only detection: We respect the `readOnlyHint` tool annotation"; "Tools without this hint are treated as write actions."; "Write actions by default require confirmation." The fetched page shows no READ or WRITE badge text (its only badge text is "Elevated risk"), so the earlier badge claim is not supported by the fetch. A [dev.to post](https://dev.to/nickytonline/quick-fix-my-mcp-tools-were-showing-as-write-tools-in-chatgpt-dev-mode-3id9) and a [forum thread](https://community.openai.com/t/mcp-annotations-being-ignored/1369672) (both search results, not opened) report the write label and a counter-report that the hint is ignored. | [OpenAI developer mode guide](https://developers.openai.com/api/docs/guides/developer-mode), vendor docs, undated |
| Codex CLI, approvals | "Destructive app/MCP tool calls always require approval when the tool advertises a destructive annotation (unless the tool advertises a read annotation, which takes priority)." | [Codex approvals and security](https://learn.chatgpt.com/docs/agent-approvals-security), vendor docs, undated |
| Codex CLI, `writes` mode | Merged PR "[codex-rs] Add writes app approval mode": tools with `readOnlyHint = true` skip approval; "all other tools prompt, including non-destructive writes and tools without annotations". | [openai/codex#30482](https://github.com/openai/codex/pull/30482), vendor source, merged 2026-07-07 (read through a summarising fetch) |
| Codex CLI, `writes` mode, explanation | "tools that declare themselves read-only execute without interruption; everything else triggers an approval prompt"; "Unannotated tools are treated as writes"; `default_tools_approval_mode = "writes"`. | [codex.danielvaughan.com](https://codex.danielvaughan.com/2026/07/24/codex-cli-writes-app-approval-mode-mcp-tool-annotations-read-only-hint-approval-flow/), third party, posted 2026-07-24, updated 2026-11-27 |
| Claude Code, scheduling | Open issue [#109845](https://github.com/anthropics/claude-code/issues/109845), title only: hinted tools run serially over HTTP instead of in parallel. This replaces the earlier unlinked "uses it for concurrency" claim: it is a title-level indication, not a doc. | GitHub issue search, opened 2026-11-14 |

Consequence: three clients (VS Code, Codex CLI in `writes` mode, ChatGPT developer mode) use the hint to skip a write prompt; Claude Code's permission engine does not (measured here; issue #87452 closed unimplemented). A false `readOnlyHint: true` is a prompt bypass in all three. The Codex approvals sentence says the read annotation takes priority over the destructive one, so a tool must never carry both `readOnlyHint: true` and `destructiveHint: true`. The third-party post says the opposite order ("A tool with `destructiveHint = true` always requires approval, even if it also claims to be read-only"); the vendor page governs, and the conflict is itself a reason never to set both.

## Effect on the ruleset

**UX-ACT-20: change (benefit now sourced; add two clauses).** New text:

> **UX-ACT-20 (SHOULD).** As a server author, set `readOnlyHint`, `destructiveHint`, `idempotentHint` and `openWorldHint` explicitly and truthfully on every tool, because VS Code, Codex CLI (`writes` mode) and ChatGPT developer mode skip the confirmation for `readOnlyHint: true` tools while Claude Code ignores annotations. A tool never carries both `readOnlyHint: true` and `destructiveHint: true`. A tool that writes, or that writes under any launch flag, never carries `readOnlyHint: true` in a configuration where it can write. A tool that reads from or sends to a network host outside the user's machine (a registry, the web) sets `openWorldHint: true`.
> - *Rationale:* at VS Code commit `75901b0` (2026-11-27) `readOnlyHint: true` removes the pre-run prompt and `openWorldHint: true` adds a result-approval step; Claude Code 2.1.332 treated hinted, unhinted and falsely hinted tools alike (measured 2026-11-27). A false `true` is therefore a prompt bypass in one client and harmless in the other. A missing hint costs a prompt in VS Code for a harmless read. Rule 20 stays SHOULD: the spec calls annotations untrusted, and no source shows that clients keep the VS Code behaviour.
> - *Verify:* `tools/list | jq '.result.tools[] | select(.annotations == null) | .name'` is empty. For each tool in a T1+ inventory row, `readOnlyHint` is `false`. For each tool whose inventory row says it contacts a remote host, `.annotations.openWorldHint == true`. Run `tools/list` once without and once with each write flag; a tool whose behaviour changes with the flag must differ in `readOnlyHint` between the two lists (`diff <(... without) <(... with)`).

**UX-ACT-19: confirm, add one clause.** Add: "A client that reads `readOnlyHint` to skip a prompt (VS Code does for non-sandboxed servers) stays inside this rule only if the skip applies to servers the user has installed on purpose and the tool is not on the T1+ inventory." Reason: the code path exists in a first-party client, so the rule's scope sentence ("an adopter who only configures a client writes no such logic") stays right, but the fleet's server must assume its hints will be believed. Verify (the wave-1 Verify line was not re-read in this repair; if it differs, it stands and the following is added to it): run `tools/list` against the fleet server and list `jq '.result.tools[] | select(.annotations.readOnlyHint == true) | .name'`; every printed name must map to a T0 or `read` inventory row.

**UX-ACT-22: change (one added sentence).** "In VS Code a tool with `readOnlyHint: true` already runs without a prompt, so an exact-name T0 allow rule has no effect there. A T1 or T2 tool must never carry that hint." Verify: add to the existing grep list `jq '.result.tools[] | select(.annotations.readOnlyHint == true) | .name'`, then require every printed name to map to a T0 or `read` inventory row.

**Applied row 20 (fleet): status unchanged, consequence sharper.** grim's 5 tools carry no annotations (earlier measurement). Concretely, under the new text: `grim_search` and `grim_describe` read remote registries: `readOnlyHint: true`, `openWorldHint: true`. `grim_fetch`: same, if it reads the network. `grim_status`: not read-only when started with `--allow-writes`, because the earlier dive found it records proofs in that mode; it must be `readOnlyHint: false` in that configuration, or it becomes the false-hint case this follow-up measured. `grim_render`: `readOnlyHint: false`, `destructiveHint: true` (it overwrites). Today, with no annotations, VS Code prompts for every grim tool, including the four reads; adding the hints would remove those four prompts and add result approval for the open-world ones. That is a user-visible behaviour change in VS Code and needs the owner's say (see Open for the owner).

*Verification for the applied row:* run `tools/list` and `jq '.result.tools[] | {name, a: .annotations}'`. Required: `grim_search`, `grim_describe`, `grim_fetch` show `readOnlyHint: true` and `openWorldHint: true`; `grim_render` shows `readOnlyHint: false` and `destructiveHint: true`; `grim_status` listed once without and once with `--allow-writes` shows `readOnlyHint: true` and `false` respectively, and a `diff` of the two lists names only that tool. Any mismatch fails the row. The per-tool values come from the earlier dive's findings and were not re-measured here.

No new rule. A check that clients' behaviour has not drifted belongs in the Decay table, row 21/22/27: add "VS Code `mcpLanguageModelToolContribution.ts` reading of `readOnlyHint` (commit `75901b0`, 2026-11-27)", refresh 3 months, re-check with `grep -n readOnlyHint src/vs/workbench/contrib/mcp/common/mcpLanguageModelToolContribution.ts` in a fresh shallow clone.

**Failure mode 12 (Marks a writing tool `readOnlyHint: true`): promote in rank.** It is the one annotation mistake with a documented consequence: prompt bypass in VS Code (source), and skipped approval in Codex `writes` mode and ChatGPT developer mode (vendor docs). *Verification:* run the UX-ACT-22 `jq` (`select(.annotations.readOnlyHint == true)`) against `tools/list` of a server started with every write flag on; any printed name whose inventory row is not T0 or `read` is a finding of this failure mode.

## Dated facts

| Fact | Source | Date |
|---|---|---|
| Claude Code 2.1.332 gave the same denial to hinted, unhinted and falsely hinted MCP tools in default mode | measured, command in section 1 | 2026-11-27 |
| VS Code main at `75901b0`: `readOnlyHint: true` removes the pre-run confirmation; `openWorldHint: true` adds result confirmation | [source file](https://github.com/microsoft/vscode/blob/75901b0190e2e749402a268f45a240823ec4e9e2/src/vs/workbench/contrib/mcp/common/mcpLanguageModelToolContribution.ts), vendor source | commit dated 2026-11-27 |
| VS Code approvals and agent-tools pages do not mention annotations | [approvals](https://code.visualstudio.com/docs/agents/run/approvals), [agent tools](https://code.visualstudio.com/docs/agents/agent-tools), vendor docs | 11/25/2026 |
| Claude Code permissions and MCP pages have no annotation text | [permissions](https://code.claude.com/docs/en/permissions), [mcp](https://code.claude.com/docs/en/mcp), vendor docs, undated | fetched 2026-11-27 |
| Feature request for a server-declared read-only flag in Claude Code, closed as not planned by a bot | [claude-code#30142](https://github.com/anthropics/claude-code/issues/30142) | opened 2026-03-02, closed 2026-03-30 |
| MCP spec: clients MUST treat annotations as untrusted unless from trusted servers | [spec tools page](https://modelcontextprotocol.io/specification/latest/server/tools), re-fetched | spec version 2026-07-28 |
| Auto-mode classifier sees only user messages and tool calls | [Anthropic](https://www.anthropic.com/engineering/claude-code-auto-mode), vendor data, re-fetched | 2026-03-25 |
| ChatGPT developer mode respects `readOnlyHint`; unhinted tools are write actions | [OpenAI guide](https://developers.openai.com/api/docs/guides/developer-mode), vendor docs | undated, fetched 2026-11-27 |
| Codex `writes` approval mode skips approval for `readOnlyHint = true` | [openai/codex#30482](https://github.com/openai/codex/pull/30482), vendor source | merged 2026-07-07 |
| Claude Code request for permission-engine use of annotations closed stale | [#87452](https://github.com/anthropics/claude-code/issues/87452), title only | closed 2026-09-21 |
| "most clients still treat installation itself as the trust signal"; `readOnlyHint: true` from a trusted server "might be auto-approved" | [MCP blog](https://blog.modelcontextprotocol.io/posts/2026-03-16-tool-annotations/) | 2026-03-16 |

## What could not be determined

- Whether a running VS Code build behaves as the source says. Missing: an installed VS Code with a Copilot or agent login (a logged-in session, not available here) to call a hinted tool and watch for a prompt. Only static source was read.
- Whether Claude Code in auto mode, `plan` mode or newer versions than 2.1.332 read annotations. Only default mode on 2.1.332 was run. The auto-mode classifier's inputs were not tested.
- Whether Cursor, Copilot CLI and Claude Desktop skip prompts on the hint. Not fetched. Codex CLI and ChatGPT developer mode are sourced from vendor pages but were not run (no ChatGPT login, no Codex install used). The Claude Code issues were read as titles only; bodies were not opened. The Codex PR was read through a summarising fetch, not its diff.
- Whether VS Code's `isSandboxedServer` path (where no confirmation is built at all) is reachable for a stdio server on a normal install. Not run.
- Claude Code MCP docs: characters 100,000 to 178,344 of the page were not read.

## Open for the owner

- Should grim's MCP server set annotations now? Doing so removes four VS Code prompts for read tools and adds result approval for open-world ones, so a user sees a different prompt flow. If yes, the hints for `grim_status` must depend on `--allow-writes`.

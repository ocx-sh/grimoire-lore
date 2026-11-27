# Commission: ux-consequential-actions / agent-action-approval

Topic question: When does an action need confirmation, undo, a dry run, typed confirmation, human approval or nothing, whether it is clicked, typed or called by an agent?

Investigate how a human approves actions an agent takes through a tool server, measured in one real client and documented for a second.
Primary sources to fetch:
- the MCP tools specification at 2025-06-18, 2025-11-25 and latest (https://modelcontextprotocol.io/specification/2025-06-18/server/tools, https://modelcontextprotocol.io/specification/2025-11-25/server/tools, https://modelcontextprotocol.io/specification/latest/server/tools);
- Claude Code permissions and permission modes (https://code.claude.com/docs/en/permissions, https://code.claude.com/docs/en/permission-modes), with the page dates;
- VS Code agent approvals and tool management (https://code.visualstudio.com/docs/agents/run/approvals, https://code.visualstudio.com/docs/agents/run/tools), with the page dates;
- AI SDK tool approval (https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-tool-usage), Anthropic on sandboxing (https://www.anthropic.com/engineering/claude-code-sandboxing) and the lethal trifecta (https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/).
Measure, do not cite:
- diff the three MCP spec versions for annotations, elicitation and the human-in-the-loop wording;
- in `grimoire-rs/grimoire/src/mcp/`, record per tool only its annotations, whether it mutates, and whether `--allow-writes` gates it (names and descriptions belong to UX-AGENT);
- in Claude Code 2.1.332, write a `--mcp-config` file under the cache directory that starts `grim mcp` against a throwaway `HOME`; run `claude -p --strict-mcp-config` once in the default permission mode and once with `--allowedTools` naming one read tool; record which grim calls run, which are denied, and the denial text;
- for VS Code, record the approval settings and whether annotations change confirmation from the docs only, labelled docs-derived. If Claude Code cannot authenticate in the sandbox, label its rows docs-derived as well.
Start from M149 to M155 and scout rows AI1, AI3, AI4, AI6, AI18 to AI20, DT30, RS20 and PR46.
The deliverable must decide:
- which tool calls need approval, and what the approval prompt must show;
- the rule that annotations are never a trust boundary;
- the fatigue controls (scoped allow-lists, sandbox) and auto-approval visibility;
- the audit-trail rule and the trifecta check.
Out of scope: tool descriptions (UX-AGENT) and rendering model output (UX-AI).

# Commission: ux-agent-facing-interfaces / tool-names-and-descriptions

Topic question: When the caller is an agent, what must a tool, CLI or MCP server provide?

Investigate how MCP tools and agent-facing commands are named and described, and deliver a description checklist a review can apply line by line.
Primary sources to fetch:
- Anthropic, writing tools for agents (https://www.anthropic.com/engineering/writing-tools-for-agents);
- the MCP tools specification, latest (https://modelcontextprotocol.io/specification/latest/server/tools), for `name`, `title`, `description` and `inputSchema`;
- the catalog's `ai-config-authoring` and `grim-authoring` skills, for the description rules they already set.
Measure, do not cite:
- in `grimoire-rs/grimoire/src/mcp/` (server and tool_args), record per tool only its name, title, description and input schema (annotations belong to UX-ACT);
- clone two public MCP servers under the cache directory (the reference servers at https://github.com/modelcontextprotocol/servers and GitHub's github-mcp-server) and record the same fields;
- score every description against a draft checklist (purpose, when to use, when not to use, inputs, outputs, error behaviour, length), and report pass counts per item and per server.
No tool-selection accuracy number is measured; a small eval cannot support a rule. Whether a release eval is warranted, and its minimum size, is an open question in the deliverable.
Start from M179 to M181 and scout rows DT25, DT26 and DT29.
The deliverable must decide:
- the naming and namespacing rule;
- the description checklist, with a Detect line per item;
- the tool-count guidance, from the cited sources;
- what is routed to ai-config-authoring rather than restated.
Out of scope: annotations and approval (UX-ACT agent-action-approval).

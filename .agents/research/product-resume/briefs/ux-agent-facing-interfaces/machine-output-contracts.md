# Commission: ux-agent-facing-interfaces / machine-output-contracts

Topic question: When the caller is an agent, what must a tool, CLI or MCP server provide?

Investigate the contract for machine-readable output from CLIs and tools.
Primary sources to fetch:
- clig.dev on machine output;
- the gh `--json` and `--jq` docs;
- the kubectl output formats docs;
- the MCP spec on structured content and output schemas;
- Anthropic on response size and pagination in writing tools for agents;
- the current Claude Code tool-output limit from its docs (re-fetch; do not quote it from memory).
Measure, do not cite:
- for ocx, grim and four exemplars, record whether `--json` exists per command, its accepted positions, whether output carries a schema version, NDJSON for streams, and output size for a large listing;
- run `ocx about --json` and record the failure.
Start from M182 to M184 and scout rows DT14, DT27 and DT38.
The deliverable must decide:
- the `--json` rule (position, coverage, stdout only);
- the schema version and additive-change rule;
- the streaming format rule;
- the response-size budget with a truncation notice;
- the stability policy for help and error text that agents parse.

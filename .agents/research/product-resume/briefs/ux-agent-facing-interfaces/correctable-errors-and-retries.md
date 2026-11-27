# Commission: ux-agent-facing-interfaces / correctable-errors-and-retries

Topic question: When the caller is an agent, what must a tool, CLI or MCP server provide?

Investigate errors from an agent's point of view: can a model choose the right next action from the output alone?
Primary sources to fetch:
- the MCP spec on tool execution errors (`isError`) versus protocol errors;
- RFC 9457 Problem Details (https://www.rfc-editor.org/rfc/rfc9457);
- the gh exit-code docs (https://cli.github.com/manual/gh_help_exit-codes);
- the catalog's exit-code rules in the language cli-contract sets.
Measure, do not cite:
- for ocx and grim, trigger not-found, unauthorised, network failure, conflict and rate-limit or timeout conditions, against a throwaway `HOME` and a local registry;
- record exit code, stream, wording, and whether a model could tell retryable from not retryable and not-found from unauthorised from the output alone;
- for `grim mcp`, trigger the same conditions through one tool call each and record whether they return `isError` results or protocol errors.
Start from M185 and M186, and scout rows DT28, AI21 and AI22, and row 19 of `cli-first-run.md`.
The deliverable must decide:
- the error-class distinctions an agent needs (not-found versus unauthorised, retryable versus not);
- the machine-readable error shape;
- the tool-error rule for MCP servers;
- the safe-error split between user-facing and model-facing text.
Out of scope: human-facing error wording (UX-TEXT) and repeat runs of mutating commands (UX-ACT cli-destructive-commands).

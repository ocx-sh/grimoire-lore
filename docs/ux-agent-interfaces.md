# ux-agent-interfaces

Standards for an interface whose caller is a program or an AI agent. They cover
machine output, MCP servers, and the approval of agent tool calls by
consequence tier. 23 non-negotiables and two runnable checks.

```sh
grim add ghcr.io/ocx-sh/lore/ux-essentials
```

Installed by the `ux-essentials` bundle. It is a skill because no file glob
reaches an MCP server's source or an agent's settings file. The agent loads it
for a `--format json` mode, an MCP tool, an SDK that parses a CLI's JSON, or an
agent's permission and auto-approve configuration.

## An agent has only the output to go on

An agent picks its next action from what the tool prints. It has no memory of
the tool, brings habits from other CLIs and follows prose literally. So the
interface has to answer three questions in fields: did it work, which class of
failure is it, and will an unchanged retry help.

The skill requires one JSON document on stdout for every exit path. It requires
an integer `schema_version` and bounded list output with `total` and
`truncated`. An error carries a class slug, the exit code and a `retryable`
boolean. For MCP, every tool failure comes back as a result with
`isError: true`.

## Approval is a design problem

The approval rows scope permissions by consequence tier. A write tool is gated
in the server. Approval logic never trusts a tool's own annotation hints. A
prompt shows every argument in full with an equal Deny. A server passes the
lethal-trifecta check before it joins an unattended session.

## The checks

`checks/json_output_check.py` runs a CLI's JSON mode over a success, a
not-found and a usage case, each with the flag before and after the
subcommand. `checks/mcp_tools_check.py` reads a saved `tools/list` and
`tools/call` result. Both exit 0 clean, 1 on a finding and 2 on a bad
invocation, and both carry `--self-test`.

36 rows across three depth files hold the rationale and verification. 23 of
them are MUST.

## Open decisions

Four decisions about the language CLI contracts are not settled. They are one
envelope spelling, an exit code for `conflict`, exit 69 against 75 for
connection failures, and a required `retryable` field. The affected rows ship
at the severity the skill states. Each names the decision it waits on.

## What it does not cover

Human-readable help, error wording and prompts are `ux-cli`. The text a
skill or descriptor file carries is `ai-config-authoring` and `grim-authoring`.
What text that renders into tool lists must not contain is `code-docs`.

## Siblings

`ux-quality-reference` supplies the tier scale and the AI-feature rows and
installs with this skill. `ux-review` runs the checks over a diff. Bundled as
`ux-essentials`.

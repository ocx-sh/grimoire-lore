---
name: ux-agent-interfaces
description: Standards for interfaces whose caller is a program or an AI agent, covering --format json and --json machine output, schema_version, bounded list output, JSON Lines events, error envelopes with a class slug and a retry verdict, MCP server tool names, descriptions, input and output schemas, isError results and tool counts, and approval of agent tool calls by consequence tier, including annotation hints, write gating, approval prompts, injection-safe approval and the lethal-trifecta check. Use when building or reviewing an MCP server or tool, a CLI's JSON output mode, an SDK or editor extension that parses a CLI's JSON, an agent's permission or auto-approve configuration, or an agent call to a CLI that must capture its streams. Not for human-readable help and error text, which is ux-cli, and not for chat interfaces shown to people, which the ux-quality rule set covers.
license: Apache-2.0
metadata:
  summary: Machine-output, MCP server and agent tool-approval standards with two runnable checks, a JSON output probe and an MCP tools check, and every dated client limit in the depth files
  keywords: agent,mcp,json,machine-output,schema-version,error-envelope,retryable,tool-description,tool-annotations,readonlyhint,approval,permissions,auto-approve,lethal-trifecta,elicitation,jsonl
  claude.user-invocable: "false"
  grim.requires.skills.ux-quality-reference: "./ux-quality-reference:0"
---

# ux-agent-interfaces

Standards for an interface whose caller is a program or an agent. An agent picks its next action from the output alone, has no memory of the tool, brings habits from other CLIs and follows prose literally. So the interface has to answer three questions in fields: did it work, which class of failure is it, and will an unchanged retry help. A second question follows when the agent acts: who consented, and to what exactly.

Human-readable help, error wording and prompts are `ux-cli`. The tier scale T0 to T3 and the per-repository inventory of actions are UX-ACT-01 in `ux-quality-reference`, which this skill requires.

Contents: [Stop condition](#stop-condition) · [Procedure](#procedure) · [Non-Negotiables](#non-negotiables) · [Open Decisions](#open-decisions) · [Ask the Person First](#ask-the-person-first) · [Routing](#routing) · [Siblings](#siblings) · [checks/](#checks)

## Stop condition

Stop when every surface in scope has findings, each as `path-or-command: ID: message (MUST|SHOULD)`, or `clean`. Mark any finding that no script or block produced `unverified: reading heuristic`. Report; never fix unless asked. Never make a check pass by weakening it.

## Procedure

1. **Pick the surfaces.** Input: the diff, or the named server, binary or settings file. A CLI with a JSON mode goes to step 2. An MCP server goes to step 3 and then step 4. A permission, auto-approve or approval-logic file goes to step 4. A skill or script that calls tools goes to step 5. Done: a list of surfaces, each with its step.
2. **CLI machine mode.** Input: the binary, one command that succeeds, one that fails not-found, one usage error. Run the first command below, add `--rust-cli04` for a binary under the Rust CLI-04 envelope, then read `references/machine-output.md` and run the blocks for the rows the script does not cover (UX-AGENT-05, 06, 07, 10, 11, 12, 13). Done: the script exits 0 and every block printed what its row says.
3. **MCP server.** Input: the launch command and each write flag. Capture `tools/list` once per launch configuration, and one failing `tools/call` per failure class (recipe in `references/mcp-servers.md`). Run the second and third commands below. Read each `note:` line as a prompt to read a description or a schema, never as a finding. Check the call to a gated tool that is absent (UX-ACT-18) with the fourth command, never with `--error`: `-32602` is the right answer there. Pass `--gated NAMES` to the second command so a gated tool in the default list is a finding. Done: every command exits 0 for every capture.
4. **Approval and permissions.** Input: the saved tool lists, the repository's agent settings, and its inventory (UX-ACT-01). Confirm every tool has a tier and a trifecta row. If `docs/consequential-actions.md` or `docs/agent-trifecta.csv` is absent, report one finding `missing inventory` for it, ask the person whether to create it, and never invent tiers. Then run the blocks of UX-ACT-19, 20, 22, 25 and 28 in `references/tool-approval.md`, and check UX-ACT-18, 24 and 26 by their tests. Done: each block printed what its row says, and no T2 tool is covered by an allow rule.
5. **Caller discipline.** When your own work calls a tool or a CLI: capture stdout and stderr apart, branch on class, exit code and `retryable`, retry at most 3 times, and read `truncated` before you conclude anything (UX-AGENT-25). Before you add an override flag to a T1+ command, run its `--dry-run`, show the output and wait for approval of the exact command (UX-ACT-21). Done: no flag was added without that approval.
6. **Report.** One line per finding, grouped by surface, ordered by severity. End with a count per surface. Stop.

```sh
SKILL_MD=path/to/this/SKILL.md   # wherever the client installed this skill
CHECKS="$(dirname "$SKILL_MD")/checks"
python3 -I "$CHECKS"/json_output_check.py --success 'about' --not-found 'describe nope/x' --usage 'about --bogus' -- mytool
python3 -I "$CHECKS"/mcp_tools_check.py tools tools.json --server-key mytool --gated mytool_render
python3 -I "$CHECKS"/mcp_tools_check.py result call.json --error
python3 -I "$CHECKS"/mcp_tools_check.py result call-absent.json --expect-protocol-error
```

The scripts exit 0 clean, 1 on a finding and 2 on a bad invocation. `--help` lists their options, and `--self-test` runs them over planted fixtures.

## Non-Negotiables

Every line blocks a merge within the scope it names. IDs resolve through [Routing](#routing), where each rule carries its rationale and verification. Clauses marked SHOULD inside a row are the row's lower-severity part.

| # | Rule | ID |
|---|---|---|
| 1 | The machine-output flag works before and after the subcommand, with identical results. | UX-AGENT-01 |
| 2 | In machine mode every exit path prints exactly one JSON document on stdout, usage errors included, and nothing else on stdout on failure. | UX-AGENT-03 |
| 3 | Every JSON document, success and error, has an integer `schema_version`. A non-additive change bumps it. The error-document clause is SHOULD for a Rust CLI-04 binary until decision D4. | UX-AGENT-04 |
| 4 | Consumers ignore unknown fields, branch on documented fields and never match `message` text. | UX-AGENT-05 |
| 5 | List output is bounded by default and carries `total`, `truncated` and a continuation as fields. | UX-AGENT-06 |
| 6 | Every error carries a class slug, the exit code, a boolean `retryable`, `retry_after_seconds` when known, `message` naming the input, and `hint`. Sending `retryable: false` is SHOULD until D4. | UX-AGENT-09 |
| 7 | Every network operation has a documented deadline, reported as class `timeout`, never as a rate limit. | UX-AGENT-11 |
| 8 | Not-found and unauthorised stay separate classes, and the message says "not authorised, or it does not exist" where a 401 may hide a missing resource. | UX-AGENT-12 |
| 9 | A conflict has its own class. Hints are runnable, put the safe step first, and label a destructive remedy "requires the owner's approval". | UX-AGENT-13 |
| 10 | No secret, `Authorization` value, stack trace or raw upstream body reaches model-facing output. | UX-AGENT-14 |
| 11 | An MCP server reports every tool failure, argument failures included, as a result with `isError: true`. JSON-RPC errors are for an unknown tool, a request that fails the `CallToolRequest` schema and a server fault. | UX-AGENT-15 |
| 12 | Tool names are 1 to 128 characters of `[a-z0-9_]` and unique. Bare generic verbs and full names over 128 characters are SHOULD. | UX-AGENT-18 |
| 13 | Every input property has a description, `required` is set, closed sets use `enum`, and a no-parameter tool uses `additionalProperties: false`. A top-level combinator is SHOULD. | UX-AGENT-20 |
| 14 | Write capability is gated in the server. Without the launch flag the write tool is not registered. | UX-ACT-18 |
| 15 | Approval logic never relies on a tool's annotation hints or description unless the server is on an explicit trust list. | UX-ACT-19 |
| 16 | No tool that can write carries `readOnlyHint: true`, and none carries both `readOnlyHint` and `destructiveHint` true. | UX-ACT-20 |
| 17 | An agent runs `--dry-run` and shows it before it asks to approve a T1+ command with an override, consent or confirmation flag, and never adds such a flag unapproved. | UX-ACT-21 |
| 18 | Approvals are scoped by tier: no wildcard, session or bypass rule covers a T1 or T2 tool outside a sandbox, and a T3 action is never a tool. | UX-ACT-22 |
| 19 | An approval prompt shows every argument unabridged with absolute paths and an equal Deny. | UX-ACT-23 |
| 20 | Every write or send tool has a hard boundary beyond the prompt: a root check after symlink resolution, or an OS sandbox. | UX-ACT-24 |
| 21 | Run the lethal-trifecta check before a server joins an unattended or auto-approving session. | UX-ACT-25 |
| 22 | The approval decision takes no input from returned tool text, and cancel, timeout and decline each leave the call unrun. | UX-ACT-26 |
| 23 | Never collect a password, token, key or payment detail through elicitation or a tool argument. | UX-ACT-28 |

SHOULD rows: UX-AGENT-02 (the `--json` alias), 07 (JSON Lines), 10 (the retry set), 16 (error text prefix), 17 (gate named in a description), 19 (description content), 21 (`outputSchema`), 22 (at most 20 tools), 23 (pinned descriptions and a snapshot), 24 (published names are API), 25 (the caller side) and 26 (result under 40,000 bytes), and UX-ACT-27 (audit log).

## Open Decisions

The catalog's language CLI contracts have not settled these. Each affected row ships at the severity stated and says which decision it waits on. Until a decision lands, follow the recommendation without re-arguing it per change.

| # | Decision | Recommendation | Rows it holds at a lower severity |
|---|---|---|---|
| D1 | One error-envelope spelling for the family, or keep Rust CLI-04's `{"error":{"code","exit",…}}` and Swift SW-CLI-29's `{"schema_version","command","exit_code","error":{"kind",…}}`? | Keep both spellings and add the missing fields. The fields are the contract, never the spelling | none |
| D2 | Does `conflict` get its own exit code (the next free number under the append-only EXIT-06), or stay on 65 with its own class slug? | Slug on the existing code until decided | none |
| D3 | The rows disagree on connection failures: the Rust table says 69 is "unreachable, non-retryable", the Go table says 69 is "not retryable", Swift says a connect failure is 75 | Refused or reset is 75. DNS not found, a TLS-to-plain-HTTP mismatch and a refused certificate are 69 | UX-AGENT-10 |
| D4 | Revise Rust CLI-04 so `retryable` is required and `schema_version` joins its envelope | Yes. A producer that always sends `retryable` already conforms today | UX-AGENT-09 clause (c), UX-AGENT-04 error-document clause |

## Ask the Person First

Do not decide these yourself. Name the choice, state the safe default and wait.

- Whether to break a published JSON schema (bump `schema_version`) and how long the deprecation window runs.
- Renaming or removing a published tool name, JSON field or error class slug (UX-AGENT-24). Propose the alias.
- Overwriting or moving a published tag or artifact after a `conflict`.
- Entering, rotating or choosing a credential after an auth error, or switching registry or account.
- Dropping `--offline`, `--frozen` or `--locked`, or another policy flag, after a policy refusal.
- Enabling write tools (`--allow-writes` or its equivalent), auto mode, Allow all, `dontAsk` with broad allows or `bypassPermissions` in a shared or credentialed environment, and trusting a third-party server's annotations.
- Turning on plain-HTTP registry access in a shared or committed config.
- Which operations belong in the default tool set, whether a write tool exists at all, and adding a host or path override parameter to a tool.
- Raising a client size limit (`_meta["anthropic/maxResultSizeChars"]`, `MAX_MCP_OUTPUT_TOKENS`) or choosing a default row limit that hides data from existing scripts.
- How much internal detail an error may disclose (hosts, tenant ids, versions).
- A description sentence that makes a legal, security or pricing claim, or promises behaviour the code does not yet guarantee.
- Retrying a mutating call after a timeout when idempotency is not documented.
- The tier of any action that involves money, legal commitment, public speech, or other people's data or access. Use the higher tier meanwhile.
- Retention, recovery windows, who may approve high-impact actions, and how long audit logs are kept.

## Routing

Read the file for the work you are about to do, not for the topic it is filed under. One level deep: these files do not point at each other. Each opens with the dated facts it relies on.

| Doing… | Read |
|---|---|
| Adding or changing a `--format json` or `--json` mode, an error document, a list that can grow, a progress stream, a retry or timeout behaviour, or the hint text an error prints (UX-AGENT-01 to 07, 09 to 14) | [references/machine-output.md](references/machine-output.md) |
| Writing or reviewing an MCP server: a tool name, a description, an input or output schema, a failure result, how many tools it registers, how large a result may be, or a rename (UX-AGENT-15 to 24, 26) | [references/mcp-servers.md](references/mcp-servers.md) |
| Deciding what an agent may run unattended, writing permission or auto-approve settings, gating or annotating write tools, building an approval prompt or approval logic, enabling a server in an unattended session, or acting as an agent that calls a tool and must capture streams or retry (UX-ACT-18 to 28, UX-AGENT-25) | [references/tool-approval.md](references/tool-approval.md) |

Pinned defaults, each overridable once by an adopter: the class vocabulary (`invalid_input`, `not_found`, `unauthorized`, `conflict`, `rate_limited`, `timeout`, `unavailable`, `policy`, `internal`), the retry cap of 3, the MCP error-text prefix (`not_found (not retryable): …`), the exact words "requires the owner's approval", `docs/consequential-actions.md` and `docs/agent-trifecta.csv`. Platform limits (client size caps, description cuts, annotation behaviour) are dated in the depth files and nowhere else.

## Siblings

- **`ux-cli`**: help layout, error wording, `--dry-run`, refusal by default, typed confirmation, reported changes and repeat behaviour (UX-ACT-12 to 17). It owns the human half of every CLI this skill covers.
- **`ux-quality-reference`**: the tier scale and the action inventory (UX-ACT-01 to 11), and the AI feature rows for chat and model output shown to people (UX-AI). UX-AI-13 owns the labelled data boundary around third-party text in a prompt or an MCP tool result. It is cited here, never restated.
- **`ux-review`**: runs the three UX artifacts over a page, a CLI or a diff.
- **The language CLI contracts** (`rust-quality`, `go-quality`, `swift-quality` and `typescript-quality` CLI files): exit-code tables, stdout and stderr discipline, signals, and the error envelope (CLI-04, SW-CLI-29). This skill states what the envelope must carry. They own its spelling.
- **`code-docs`**: SRF-03 limits what the text that renders into tool lists and schemas may contain. UX-AGENT-19 and 20 say what it must contain.
- **`docs-quality`**: DOC-AGENT rows for `llms.txt` and other machine-readable files on a documentation site.

## checks/

Scripts the rows and procedure run. Set `CHECKS` to the `checks/` directory beside this file: `CHECKS="$(dirname "$SKILL_MD")/checks"`, where `SKILL_MD` is the path of this SKILL.md in whichever project or global directory the client installed it. Python 3.11 standard library only, run as `python3 -I`.

| Script | Rows |
|---|---|
| `json_output_check.py` | UX-AGENT-01, 02, 03, 04, 09, 11, 14 over a success, a not-found and a usage case, each with the flag before and after the subcommand |
| `mcp_tools_check.py` | UX-AGENT-15 to 22, 26 and UX-ACT-18, 20 over a saved `tools/list` and `tools/call` result |
| `stub_server.py` | a throwaway local HTTP stub (429, 503, 404, hang) for the UX-AGENT-10 and 11 probes |

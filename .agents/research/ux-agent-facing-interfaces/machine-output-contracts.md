---
title: Machine output contracts for agent-called CLIs, tools and MCP servers
program: product
sub_program: ux
topic: ux-agent-facing-interfaces
worker: machine-output-contracts
date_researched: 2026-11-27
model: sonnet
sources_fetched: 14
scope: >
  The contract for machine-readable output (flag, coverage, stdout discipline, schema version,
  additive change, streaming, size budget, parse-stability of help and error text) for CLIs and
  MCP tools called by agents. Not covered: tool naming and description writing, MCP authorization,
  exit-code numbering (owned by the language sets), human TUI design.
---

# Machine output contracts

Answers M182, M183, M184 (scout rows DT14, DT38, DT27). Today is 2026-11-27. Platform limits below were fetched on that date.

## Table of contents

1. Summary
2. Findings
3. Normative guidance candidates
4. What an agent must not decide alone
5. AI-agent angle
6. Contested / evolving
7. Dated facts
8. Sources

## Summary

- Give every command that prints a report a machine mode, selected by one flag, with the same meaning on every command. Measured: ocx and grim do this; ocx also has a per-failure envelope.
- Machine output goes to stdout only; logs, progress and prose go to stderr ([clig.dev](https://clig.dev/): "Anything that is machine readable should also go to stdout").
- Accept the flag in every position or reject it with a typed error. Measured: `ocx about --json` fails with exit 64 because `--json` is a pre-subcommand global; agents write it after the subcommand by habit.
- Put an integer `schema_version` in every JSON document, including error documents. ocx does (`"schema_version": 1`); grim `status` and `search` do not; gh, docker and npm do not.
- Additive change is allowed inside a version; removing, renaming, retyping or re-meaning a field bumps the version. Consumers must ignore unknown fields (JSON Schema allows extra properties by default: [JSON Schema docs](https://json-schema.org/understanding-json-schema/reference/object#additionalproperties)).
- Streams use JSON Lines: one complete JSON value per line, `\n` terminated, no blank lines ([jsonlines.org](https://jsonlines.org/)). cargo `--message-format=json`, docker `--format json` for `ps` and grim/ocx NDJSON progress follow this.
- Errors in machine mode are also machine output: a typed object with `kind`, a message that names the offending argument, and the exit code. ocx emits this on stdout; gh, grim and npm emit text to stderr.
- Response budget: the agent runtime caps tool output. Claude Code default is 25,000 tokens for MCP output, a 50,000-character file-spill threshold, a 10,000-token warning ([Claude Code MCP docs](https://code.claude.com/docs/en/mcp)); Anthropic's own Claude Code tool-response cap is 25,000 tokens ([Anthropic, 2025-09-11](https://www.anthropic.com/engineering/writing-tools-for-agents)).
- Default to a concise shape and a hard row limit; truncation must be announced in the data (`truncated: true`, `total`, `next_cursor`), not only in prose. grim `search` already returns `items`, `total`, `truncated`.
- Measured sizes show why: `gh search issues --limit 1000 --json number,title,body` produced 4,473,121 bytes; `npm view lodash --json` 44,749 bytes; `grim search a --format json` 62,716 bytes. All exceed a 50,000-character spill threshold or sit near it.
- MCP servers declare `outputSchema` and return `structuredContent`, plus the same JSON serialized in a text block ([MCP 2026-07-28 tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)).
- MCP tool failures that the model can fix use `isError: true` with actionable text; protocol errors are for malformed requests. Claude Code keeps only 5,000 head and 5,000 tail characters of error text longer than about 11,000 characters.
- Help and error text are not a contract unless declared one. clig.dev says changing human output is usually fine and encourages `--json`/`--plain` for scripts. Agents parse them anyway; publish a stable error `kind` and treat message text as unstable.
- Self-describing field discovery beats documentation: `gh pr list --json` with no fields prints the valid field list; `ocx --help` links `https://ocx.sh/schemas/reports/v1.json`; `ocx --json version` prints a `contract` block counting reports per command.

## Findings

### 1. Position, coverage and the stdout rule

clig.dev: "Anything that is machine readable should also go to `stdout`"; "Log messages, errors, and so on should all be sent to `stderr`"; "Display output as formatted JSON if `--json` is passed"; "Humans come first, machines second"; "Encourage your users to use `--plain` or `--json` in scripts to keep output stable"; "Changing output for humans is usually OK"; "Warn before you make a non-additive change" ([clig.dev](https://clig.dev/), no page date shown).

gh: `--json` "requires a comma separated list of fields", `--jq` and `--template` need `--json` ([gh formatting](https://cli.github.com/manual/gh_help_formatting)). Omitting the fields lists them. Measured below.

kubectl: `-o json|yaml|name|jsonpath|go-template|custom-columns|wide|kyaml` is one flag with one vocabulary across commands ([kubectl quick reference](https://kubernetes.io/docs/reference/kubectl/quick-reference/), Formatting output).

Measurements (all run 2026-11-27 on Linux; versions: ocx 0.6.8, grim 0.16.0, gh 2.105.0 (2026-11-17), docker 29.10.0 client, uv 0.13.9, npm and cargo from the project toolchain).

| Tool | Flag | Position accepted | Coverage | Schema version in output | Streams | Command |
|---|---|---|---|---|---|---|
| ocx | `--json` (shorthand) or `--format json`, global | Before the subcommand only. `ocx about --json` exits 64; `ocx --json about` works | Help states "Applies to every command; there is no per-command `--format`"; `ocx --json version` lists 70+ commands with a report version each | Yes: `schema_version: 1` on reports and on the error envelope | No `--progress` flag: `ocx about --progress json` exits 64 (`unexpected argument '--progress'`) and `ocx --help | grep -c -- --progress` prints 0; ocx has `--quiet` only (measured 2026-11-27) | `ocx about --json; ocx --json about; ocx --help` |
| grim | `--format json`, no `--json` | After the subcommand (`grim status --format json`) and before; `grim status --json` exits 64 | `--format` appears in the `--help` of all 25 subcommands tested | No: `status` keys are `checked`, `items`; `search` keys are `items`, `sources`, `total`, `truncated` | `--progress json` emits NDJSON on stderr | `grim status --format json \| jq -c keys; for c in ...; do grim $c --help \| grep -c -- --format; done` |
| gh | `--json <fields>` plus `--jq`, `--template` | After the subcommand only (`gh --json` is "unknown flag"); on listing commands only | Per command; `gh pr list --json` with no fields exits 1 and lists fields; unknown field exits 1, stdout empty, error to stderr as text | No | Not NDJSON; one array | `gh pr list --json; gh issue list --json bogus; gh --json` |
| docker | `--format json` or `'{{json .}}'` | After the subcommand | Per command (`ps`, `images`, `version` tested) | No | `docker ps -a --format json` printed one object per line (30 lines for 30 containers plus none for the header; table printed 31) | `docker ps -a --format json \| wc -l; docker ps -a \| wc -l` |
| npm | `--json` | Any position; unknown command still prints text | Per command; `npm ls --json` includes `problems` and exit code 1 on ELSPROBLEMS | No | No | `npm ls --json; npm view lodash --json \| wc -c` |
| cargo | `--message-format json` (build) and `cargo metadata --format-version 1` | After the subcommand | Build output and metadata only | Metadata: `version` field plus required `--format-version` | One JSON object per line with a `reason` field | `cargo build --help \| grep message-format` |
| uv | `--format json` on `pip list` | After the subcommand | Subset (`pip list`, `pip freeze` class); `uv run --help` has no JSON mode | No | No | `uv pip list --format json` |

Observations from the table.

- Position is the dominant agent failure. ocx's flag is global-only; grim's is a per-subcommand/global hybrid; gh's is per subcommand. No two of the six agree. An agent that learns `--json` from gh will fail on grim, and one that learns `--format json` from grim will succeed on ocx only before the subcommand.
- The `ocx about --json` failure, recorded exactly. Exit code 64. stderr: `error: unexpected argument '--json' found` plus usage. stdout (a JSON envelope, produced although `--json` was rejected):

```json
{"schema_version":1,"command":"about","exit_code":64,
 "error":{"kind":"usage_error","detail":"invalid_command_line",
          "message":"unexpected argument '--json' found","context":{}}}
```

The envelope is good design (typed `kind`, repeated `exit_code`, versioned). The defect is the rejection itself. Also seen: `ocx --json index list` (missing argument) returns `message` "the following required arguments were not provided:" with `context: {}`: the argument name is lost, so an agent cannot self-correct from the envelope; the stderr text names `<PACKAGE>...`.
- stdout discipline holds for ocx and grim: in every failing run above stdout was either empty (grim, gh) or the envelope (ocx), and prose was on stderr. Exception: grim `search` emitted a tracing WARN line to the stream observed with `2>&1`; verify it is on stderr (`grim search x --format json 2>/dev/null | jq .`) before relying on it. This ran clean through `jq` with stderr discarded.
- Size of large listings: `gh search issues --repo rust-lang/rust --limit 1000 --json number,title,body | wc -c` gave 4,473,121; `grim search a --format json | wc -c` gave 62,716 with `items` length 48 and `total`/`truncated` fields; `ocx --json index catalog | wc -c` gave 2,271 (local index only); `npm view lodash --json | wc -c` gave 44,749.

### 2. Schema version and additive change

- JSON Schema defaults to permissive: "By default any additional properties are allowed" ([JSON Schema](https://json-schema.org/understanding-json-schema/reference/object#additionalproperties)). A consumer that rejects unknown fields turns every additive change into a breaking one.
- cargo: "The format is stable and versioned. When calling `cargo metadata`, you should pass `--format-version` flag explicitly to avoid forward incompatibility hazard." The page makes no promise about adding fields in `--message-format=json` and notes `package_id` changed meaning in Cargo 1.77 ([cargo external tools](https://doc.rust-lang.org/cargo/reference/external-tools.html)). This is the counter-example: a versioned format and an unversioned stream under one tool.
- ocx publishes `https://ocx.sh/schemas/reports/v1.json` (named in `ocx --help`; not fetched here, flagged) and a `contract` block in `ocx --json version` with counts per command and per report. This is the only self-audit surface measured.
- MCP: `outputSchema` is optional, "Servers MUST provide structured results that conform to this schema", clients SHOULD validate. The 2026-07-28 revision loosened `structuredContent` to any JSON value and requires `resultType` on every result, with older results treated as `"complete"` ([MCP changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)). Its own deprecation policy sets a minimum twelve-month window for removals ([changelog, Governance](https://modelcontextprotocol.io/specification/2026-07-28/changelog)).

### 3. Streaming format

- JSON Lines: UTF-8, no BOM, one valid JSON value per line, `\n` terminator, no blank lines ([jsonlines.org](https://jsonlines.org/); MIME `application/jsonl` "not yet standardized").
- cargo: "The output goes to stdout in the JSON object per line format. The `reason` field distinguishes different kinds of messages"; limit: `cargo run --message-format=json` mixes in non-JSON program output, so "only interpret a line as JSON if it starts with `{`" ([cargo](https://doc.rust-lang.org/cargo/reference/external-tools.html)).
- grim `--progress json`: NDJSON events on stderr, one object per line (`grim --help`).
- Rule consequence: a stream needs a discriminator field per line (`reason`, `type`, `event`), a terminal event (`build-finished` in cargo) so the consumer can tell truncation from completion, and stdout/stderr assignment stated.

### 4. Response-size budget and truncation notice

- Anthropic: "For Claude Code, we restrict tool responses to 25,000 tokens by default"; recommends "pagination, range selection, filtering, and/or truncation"; "If you choose to truncate responses, be sure to steer agents with helpful instructions"; a `response_format` enum with `concise` and `detailed` (Slack example: concise about one third of tokens); errors that "clearly communicate specific and actionable improvements" ([Anthropic, 2025-09-11, vendor engineering guidance](https://www.anthropic.com/engineering/writing-tools-for-agents)).
- Claude Code docs (re-fetched 2026-11-27, platform source): warning above 10,000 tokens (fixed); default maximum 25,000 tokens via `MAX_MCP_OUTPUT_TOKENS`; for text results over 50,000 characters the result is saved to a file and the conversation gets a message with the path, whatever the token count; a server may raise its own threshold with `_meta["anthropic/maxResultSizeChars"]` up to 500,000 characters; HTTP/SSE responses over 16 MiB fail; error text over about 11,000 characters keeps the first 5,000 and last 5,000 characters ([Claude Code MCP docs](https://code.claude.com/docs/en/mcp), section "MCP output limits and warnings"). Not fetched: the Bash-tool output limit (the page does not state it in the sections read); say so and do not quote one.
- MCP spec: `tools/list` supports pagination with `cursor`/`nextCursor`; `tools/call` has no spec-level size limit ([MCP tools 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)).
- Measured: a single unbounded listing (gh 4.47 MB) is about two orders of magnitude over the limit. grim's `truncated` and `total` fields plus a stderr warning ("36 weaker matches hidden; set options.search_min_relevance to 0 to list all") are the nearest in-fleet pattern: the notice names the lever.

### 5. Stability of help and error text

- clig.dev: human output may change; machine flags are the stable surface.
- Nothing in gh, docker or kubectl docs promises error text stability. gh documents only exit codes: 0 success, 1 failure, 2 cancelled, 4 authentication required, "individual commands may define additional exit codes" ([gh exit codes](https://cli.github.com/manual/gh_help_exit-codes)).
- ocx puts the stable parts in the envelope (`kind`, `detail`, `exit_code`) and leaves `message` free text. Scout M183 notes golden tests exist only in the VS Code extension; no CLI help golden exists in the fleet (not re-measured; scout claim).
- Agents parse help to discover flags (they cannot know `--json` position otherwise). Therefore the help text `--json`/`--format` entry is a de facto contract: keep it greppable and in the top-level `--help`.

## Normative guidance candidates

Severity is the leading keyword of each rule (MUST / SHOULD / CONSIDER), the house convention in `prompt-contracts.md`.

1. MUST give every command that prints a report one machine-output flag with one spelling across the whole CLI. Rationale: agents generalize from one command to all. Verify: `for c in $(<cmd> --help | list commands); do <cmd> $c --help | grep -c -e '--json' -e '--format'; done` returns at least 1 for every report-printing command; list exceptions explicitly in docs.
2. MUST accept the flag before and after the subcommand, or reject a misplaced one with a message that names the correct position. Rationale: measured `ocx about --json` exit 64 is the most likely first agent call. Verify: `<cmd> <sub> --json` and `<cmd> --json <sub>` both exit 0 with the same stdout.
3. MUST write only the machine document to stdout in machine mode; logs, progress, warnings and prose to stderr. Rationale: clig.dev; `jq` must parse stdout. Verify: `<cmd> ... --json 2>/dev/null | jq -e .` exits 0 for success and failure paths.
4. MUST include an integer `schema_version` as a top-level field of every JSON document, success and error. Rationale: only ocx does among six tools measured. Verify: `<cmd> ... --json | jq -e '.schema_version|type=="number"'`.
5. MUST publish a JSON Schema per report and a version bump rule: adding an optional field keeps the version; removing, renaming, retyping, changing a unit or enum meaning bumps it. Rationale: the cargo JSON build messages are unversioned and `package_id` was opaque before Cargo 1.77 and a Package ID Specification after ([cargo external tools](https://doc.rust-lang.org/cargo/reference/external-tools.html), "1.77 is required for `package_id` to be a Package ID Specification. Before that, it was opaque"; page shows no date). Verify: schema URL resolves in CI; a schema-diff check fails on non-additive change without a bump.
6. MUST tell consumers (in the docs and in agent skills) to ignore unknown fields. Rationale: additive changes are only safe if consumers tolerate them. Verify: grep consumer code/skills for `additionalProperties: false` on inputs from the tool; none allowed.
7. SHOULD list valid output fields from the CLI itself (gh pattern: `--json` with no value). Rationale: removes documentation lookup. Verify: `<cmd> --json` or `<cmd> --help` output contains the field list or schema URL.
8. MUST emit errors in machine mode as a typed document carrying `kind`, `exit_code`, a message naming the offending argument, and a corrective hint where one exists; stderr may repeat the text. Rationale: MCP spec says execution errors are for model self-correction; measured ocx envelope lost the missing-argument name. Verify: `<cmd> <sub> --json 2>/dev/null | jq -e '.error.kind, .exit_code'` for a missing required argument, and `.error.message | test("<PACKAGE>")`.
9. MUST stream line-oriented output as JSON Lines: one object per line, `\n` terminated, a discriminator field, a terminal event. Rationale: [jsonlines.org](https://jsonlines.org/) and cargo. Verify: `<cmd> --stream | jq -c . >/dev/null` and `tail -1 | jq -e '.type=="done"'` (name your own).
10. MUST bound list output by default (a row limit) and return `total`, `truncated` and a continuation (`next_cursor` or the flag that raises the limit) as data fields. Rationale: grim `search` pattern; Claude Code spills text results above 50,000 characters ([Claude Code MCP docs](https://code.claude.com/docs/en/mcp#mcp-output-limits-and-warnings), fetched 2026-11-27). Verify: `<cmd> list --json | jq -e 'has("total") and has("truncated")'` and `<cmd> list --json | wc -c` under 50,000 characters on the largest realistic fixture.
11. SHOULD offer a concise/detailed switch (default concise) that drops IDs, timestamps and nested bodies. Rationale: Anthropic reports about one-third tokens. Verify: `wc -c` of concise output at most half of detailed on a fixture.
12. MUST NOT put a size-truncation notice only in prose; if prose is added, it names the lever (flag or cursor). Rationale: an agent cannot reliably detect "...and 36 more" text. Verify: grep the truncation code path for a data field set alongside every notice.
13. MUST for MCP tools returning structured data declare `outputSchema`, return `structuredContent`, and also return the JSON serialized in a `text` content block. Rationale: the spec says "a tool that returns structured content SHOULD also return the serialized JSON in a TextContent block" and "Servers MUST provide structured results that conform to this schema" ([MCP tools, 2026-07-28, section Structured Content / Output Schema](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#structured-content)). Verify: `tools/list` response has `outputSchema` for each tool; `tools/call` result has both fields and `JSON.parse(content[0].text)` deep-equals `structuredContent`.
14. MUST report recoverable MCP failures with `isError: true` and actionable text (what was wrong, a valid example, the next call), and reserve JSON-RPC errors for unknown tool and malformed requests. Rationale: the spec splits protocol errors (unknown tool, malformed request) from tool execution errors that carry "actionable feedback that language models can use to self-correct", and clients SHOULD pass the latter to the model ([MCP tools, 2026-07-28, Error Handling](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#error-handling)); Claude Code passes `isError: true` text to Claude ([Claude Code MCP docs, "Error results"](https://code.claude.com/docs/en/mcp#mcp-output-limits-and-warnings), fetched 2026-11-27). Verify: call each tool with a bad argument; response is a result with `isError: true`, not a JSON-RPC error.
15. MUST keep MCP error text under about 11,000 characters. Rationale: "Error text longer than about 11,000 characters keeps only its first 5,000 and last 5,000 characters" ([Claude Code MCP docs, "Error results"](https://code.claude.com/docs/en/mcp#mcp-output-limits-and-warnings), fetched 2026-11-27; page shows no date). Verify: assert length in a test.
16. SHOULD keep an MCP text result under 50,000 characters, or set `_meta["anthropic/maxResultSizeChars"]` (ceiling 500,000) deliberately with a reason. Rationale: Claude Code saves a successful text result to a file "once it's longer than 50,000 characters, whatever its token count"; `_meta["anthropic/maxResultSizeChars"]` raises it "up to a hard ceiling of 500,000 characters" ([Claude Code MCP docs](https://code.claude.com/docs/en/mcp#mcp-output-limits-and-warnings), fetched 2026-11-27; platform source). Verify: measure largest fixture; grep `tools/list` for the annotation.
17. MUST treat help text and prose error messages as unstable and document which fields are stable (`kind`, `detail`, `exit_code`, field names); MUST NOT tell agents to grep message text. Rationale: clig.dev: "Changing output for humans is usually OK" ([clig.dev, Future-proofing](https://clig.dev/), no page date); only the declared machine surface is stable. Verify: docs name the stable parts; agent skills grep only `kind`/`exit_code`.
18. SHOULD snapshot `--help` and one error per command as golden files and review the diff when it changes. Rationale: scout M183: goldens exist only in the extension. Verify: `ls tests/**/golden*` per CLI; CI fails on unreviewed diff.
19. CONSIDER a self-audit command (`ocx --json version` `contract` block pattern) so an agent can check coverage without parsing help. Rationale: help text is not a contract (rule 17), so coverage claims need a machine-readable source; ocx is the only tool of seven measured that has one. Verify: output lists every command with a report version.

## What an agent must not decide alone

- Whether to break a published schema (bump `schema_version`) and the deprecation window length. Ask the owner; the answer is a product/compatibility decision. MCP's own policy sets a "minimum twelve-month deprecation window" for the spec, not for your tool ([MCP changelog, Governance and process updates](https://modelcontextprotocol.io/specification/2026-07-28/changelog), revision 2026-07-28).
- Raising `anthropic/maxResultSizeChars` or `MAX_MCP_OUTPUT_TOKENS` for a server: it changes cost and context pressure for every adopter.
- Which fields count as stable public contract versus internal (for example, whether `message` is stable).
- Exit-code numbering changes (owned by the language sets; other documented code lists are the contract).
- Choosing a default row limit that hides data from existing scripts.

## AI-agent angle

| Typical mistake | Smallest mechanical check |
|---|---|
| Writes `ocx about --json` (flag after the subcommand) from gh/docker habit | Run `<cli> <sub> --json` and `<cli> --json <sub>` in CI; read exit code |
| Writes `grim ... --json` (grim only has `--format json`) | `grim --help \| grep -- '--json'` empty means do not use |
| Pipes `2>&1` into `jq`, mixing logs and JSON | Use `2>/dev/null` or capture streams separately; check `jq -e .` |
| Assumes a field exists because a sibling tool has it (gh `body`, `url`) | gh: run `--json` with no fields; ocx: validate against the reports schema |
| Treats a listing as complete and ignores `truncated`/`total` | Assert `truncated == false` or loop on the cursor before concluding |
| Parses message text for the cause of failure | Branch on `error.kind` and `exit_code`; never on `message` |
| Requests `--limit 1000 --json ...body` and floods context (4.47 MB measured) | Pre-check with `--jq length` or a count; request ids only, then fetch details |
| Hand-writes MCP tools that return only prose | `tools/list` must show `outputSchema`; call result must contain `structuredContent` |
| Reads a Claude Code limit from memory | Re-fetch the docs page; the numbers here are dated 2026-11-27 |

## Contested / evolving

- Flag name and position: clig.dev names `--json`; kubectl uses `-o json`; docker uses `--format` with Go templates; grim uses `--format`. No authority resolves this; the rule is internal consistency plus accepting the synonym (candidates 1, 2).
- Versioned versus unversioned: cargo versions `metadata` but not the build stream; gh, docker, npm version nothing in the output. Position A (ocx): version every document. Position B (gh, docker): rely on additive-only field discipline without a number. The measured cost of B is that an agent cannot tell a changed shape from a bad call.
- Structured versus prose for model-facing tool results: the MCP spec asks for both; Anthropic's guidance prefers concise, human-meaningful text over raw IDs. These can conflict on size; resolve with `response_format`.
- Does the 25,000-token default still hold for Claude Code builtin tools? The Anthropic post (2025-09-11) states it for Claude Code; the platform doc states it for MCP output only. Treat as MCP-only until the platform states otherwise.
- MCP spec 2026-07-28 deprecates Roots, Sampling and Logging ("log to `stderr` (stdio) or use OpenTelemetry instead of Logging"; [MCP changelog, Deprecated](https://modelcontextprotocol.io/specification/2026-07-28/changelog), revision 2026-07-28); server logging guidance moves to stderr and OpenTelemetry, consistent with the stdout rule. The revision is recent: adopters may still run 2025-11-25 clients.
- The kubectl page was truncated at fetch; `-o` formats were read from the quick-reference table, not the generated `kubectl get` reference.

## Dated facts

| Fact | Source | Date source states | Kind |
|---|---|---|---|
| Claude Code MCP output: warning 10,000 tokens, default max 25,000 tokens, spill to file above 50,000 characters, per-tool ceiling 500,000 characters, error text over about 11,000 characters keeps 5,000 head and tail, HTTP/SSE 16 MiB | [code.claude.com/docs/en/mcp](https://code.claude.com/docs/en/mcp) | none shown; fetched 2026-11-27 | Platform |
| Claude Code tool responses restricted to 25,000 tokens by default | [Anthropic engineering](https://www.anthropic.com/engineering/writing-tools-for-agents) | Sep 11, 2025 | Vendor guidance |
| MCP revision 2026-07-28: required `resultType`; `structuredContent` any JSON value; `outputSchema` MUST be honored; tool errors `isError: true`; deterministic `tools/list` order SHOULD | [MCP tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools), [changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog) | 2026-07-28 (revision id) | Authority (spec) |
| MCP deprecation window minimum twelve months | [MCP changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog) | 2026-07-28 | Authority |
| gh exit codes 0, 1, 2, 4 | [gh exit codes](https://cli.github.com/manual/gh_help_exit-codes) | none shown | Platform |
| gh `--json` requires field list; `--jq` and `--template` need `--json` | [gh formatting](https://cli.github.com/manual/gh_help_formatting) | none shown | Platform |
| cargo `metadata` "stable and versioned"; build JSON is one object per line; `package_id` format changed in 1.77 | [cargo external tools](https://doc.rust-lang.org/cargo/reference/external-tools.html) | none shown | Platform |
| JSON Lines rules (UTF-8, no BOM, `\n`) | [jsonlines.org](https://jsonlines.org/) | none shown | Authority (community spec) |
| JSON Schema default allows additional properties | [json-schema.org](https://json-schema.org/understanding-json-schema/reference/object#additionalproperties) | none shown | Authority |
| clig.dev machine-output and future-proofing rules | [clig.dev](https://clig.dev/) | none shown | Community guide |
| kubectl `-o` formats | [kubectl quick reference](https://kubernetes.io/docs/reference/kubectl/quick-reference/) | none shown | Platform |
| Tool versions measured: ocx 0.6.8 (build 2026-11-15), grim 0.16.0, gh 2.105.0 (2026-11-17), docker 29.10.0, uv 0.13.9 | local `--version` runs | 2026-11-27 | Measurement |

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://clig.dev/ | Command Line Interface Guidelines | undated, current | The agreed baseline for stdout, `--json`, stability |
| https://cli.github.com/manual/gh_help_formatting | gh formatting help | current at 2.105.0 | `--json`/`--jq` model and field discovery |
| https://cli.github.com/manual/gh_help_exit-codes | gh exit codes | current | The only documented stable error surface in gh |
| https://kubernetes.io/docs/reference/kubectl/quick-reference/ | kubectl output formats | current | One flag, many formats |
| https://modelcontextprotocol.io/specification/2026-07-28/server/tools | MCP tools spec | 2026-07-28 | `structuredContent`, `outputSchema`, errors |
| https://modelcontextprotocol.io/specification/2026-07-28/changelog | MCP changelog | 2026-07-28 | `resultType`, deprecation policy, schema loosening |
| https://www.anthropic.com/engineering/writing-tools-for-agents | Anthropic tool-writing guide | 2025-09-11 | Pagination, `response_format`, 25,000 tokens |
| https://code.claude.com/docs/en/mcp | Claude Code MCP docs | fetched 2026-11-27 | Current output limits |
| https://doc.rust-lang.org/cargo/reference/external-tools.html | cargo JSON messages and metadata | current | Versioned metadata versus NDJSON stream |
| https://jsonlines.org/ | JSON Lines format | current | Streaming format rules |
| https://json-schema.org/understanding-json-schema/reference/object#additionalproperties | JSON Schema object keywords | current | Additive change tolerance |
| https://docs.docker.com/engine/cli/formatting/ | docker formatting | current | `json` template function; page does not state per-line output |
| https://docs.npmjs.com/cli/v11/using-npm/logging | npm logging | v11 | Read; says nothing on `--json`, so npm facts above are measured only |
| Local runs (`ocx`, `grim`, `gh`, `docker`, `npm`, `uv`, `cargo`) | Measurements, commands in table | 2026-11-27 | Ground truth for position, coverage and size |

Gaps. Fewer than 12 independent web sources were available for this narrow topic (13 fetched, 8 of them platform or authority). Not fetched: `https://ocx.sh/schemas/reports/v1.json`, the kubectl `get` generated reference, the Claude Code Bash-tool output limit. `cargo metadata` could not be run in the ocx workspace (empty output), so its size was not measured.

---
title: Correctable errors and retries for agent callers (CLI, tool and MCP server errors)
program: product
sub_program: ux
topic: ux-agent-facing-interfaces
worker: correctable-errors-and-retries
date_researched: 2026-11-27
model: sonnet
sources_fetched: 15
scope: Covers what an error must carry so a model can pick the next action from the output alone, the error classes an agent needs, the machine-readable shape, the MCP tool-error rule and the user-facing versus model-facing text split. Includes measurements of ocx 0.6.8 and grim 0.16.0 against local registries. Excludes human-facing wording (UX-TEXT) and repeat runs of mutating commands (UX-ACT cli-destructive-commands).
---

# Correctable errors and retries for agent callers

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Method and environment](#1-method-and-environment)
   2. [What the standards say](#2-what-the-standards-say)
   3. [Measured: ocx and grim CLI errors](#3-measured-ocx-and-grim-cli-errors)
   4. [Measured: `grim mcp` errors](#4-measured-grim-mcp-errors)
   5. [Error-class distinctions an agent needs](#5-error-class-distinctions-an-agent-needs)
   6. [The machine-readable error shape](#6-the-machine-readable-error-shape)
   7. [The tool-error rule for MCP servers](#7-the-tool-error-rule-for-mcp-servers)
   8. [The user-facing versus model-facing split](#8-the-user-facing-versus-model-facing-split)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Dated facts](#dated-facts)
5. [What an agent must not decide alone](#what-an-agent-must-not-decide-alone)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- An agent chooses its next action from three things: a class (what kind of failure), a retry verdict (try again as is, change input, or stop), and a hint (what to change). Output that lacks any of the three forces a guess.
- MCP defines two channels: JSON-RPC protocol errors for malformed requests and unknown tools, and `isError: true` results for API failures, input validation and business logic. The spec says clients SHOULD pass tool execution errors to the model "to enable self-correction" ([MCP tools spec, 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)).
- Measured: `grim mcp` 0.16.0 returns every operational failure (not-found, unauthorised, network, timeout, bad reference) as a JSON-RPC `-32603` protocol error, never `isError`. Only argument deserialisation failures use `isError: true`. This inverts the spec guidance, and the model-facing text carries no class and no exit code.
- Measured: the same grim failure carries `code` and `exit` in `--format json` on the CLI (`not-found`/79, `auth`/80, `unavailable`/69) but neither survives into the MCP error.
- Measured: not-found and unauthorised are distinct in both CLIs on a plain registry (exit 79 versus 80). On an authenticated registry, a nonexistent repository is reported as exit 80 because the registry answers 401 for every path. A model cannot tell "repo missing" from "credential missing" there, and neither can the tool; this is a registry fact, so the message must say "or does not exist".
- Measured: retryable versus not is inconsistent. A 429 gives ocx exit 75 (retryable) but grim exit 69 (non-retryable). A 503 gives ocx 75 and grim 69. A connection refused gives ocx 75 and grim 69. The pinned catalog table says 69 is "non-retryable" and 75 is "retryable"; grim and ocx disagree on the same stub.
- Measured: neither CLI surfaced `Retry-After: 30` in output. A stub that hangs makes ocx run past 100 seconds without any output or exit; no bounded timeout was observed.
- Measured: a tag conflict (`grim release` of changed content to an existing version tag) exits 65 "data" with a message that suggests `--force`. There is no `conflict` class, and the hint names a destructive flag.
- Measured: in `--format json` mode a usage error (exit 64) prints nothing on stdout, only prose on stderr. The machine shape is absent exactly where an agent most needs it.
- The two CLIs use two different JSON error shapes: ocx `{schema_version, command, exit_code, error:{kind, detail, message, context}}`; grim `{error:{code, exit, message}}`. Neither carries a `retryable` field.
- RFC 9457 gives the standard shape: `type` URI as primary identifier, `status`, `title`, `detail`, `instance`, plus extension members, and "Consumers SHOULD NOT parse the detail member" ([RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)). Machine data belongs in extension members.
- gh documents only four codes (0, 1, 2, 4) and says individual commands may define more ([gh exit codes](https://cli.github.com/manual/gh_help_exit-codes)). The OCX-family table (64 to 82) is richer and an agent can rely on it, but only if each code is documented and stable.
- Safe-error rule: the model-facing text may name the cause and the fix, but never secrets, stack traces, internal paths or hostnames beyond what the caller supplied; OWASP says details go to a server-side log, not to the caller ([OWASP Error Handling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)).
- Hints that name a destructive remedy (`--force`) are a hazard for agents: an agent that follows the hint turns a conflict into an overwrite. Hints must name the safe next step first, and flag destructive ones as needing human approval.
- Business, legal and brand decisions inside an error path (whether to overwrite, whether to rotate a credential, whether to disclose an internal host) are asks, not agent decisions.

## Findings

### 1. Method and environment

Every run below used a throwaway `HOME`, `GRIM_HOME` and (for ocx) `OCX_HOME` under the session scratch directory, stdin from `/dev/null`, `NO_COLOR=1`. Binaries: `ocx` 0.6.8 (`ocx version`; `ocx --version` is itself a usage error), `grim` 0.16.0 (`grim --version`).

Four local endpoints were used:

| Port | What | How it was started |
|---|---|---|
| 5199 | Plain `registry:2`, empty | `docker run -d -p 127.0.0.1:5199:5000 registry:2` |
| 5198 | `registry:2` with htpasswd auth (user `u`, password `p`), so every request answers 401 | `docker run -d -p 127.0.0.1:5198:5000 -v <dir>:/auth -e REGISTRY_AUTH=htpasswd -e REGISTRY_AUTH_HTPASSWD_REALM=r -e REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd registry:2` |
| 5197 | A 30-line Python stub: path containing `rate` returns 429, path containing `hang` sleeps 120 s, anything else 503; all errors carry `Retry-After: 30` and an OCI `TOOMANYREQUESTS` body | `python3 stub.py` |
| 1 | Nothing listening (connection refused) | none |

Plain HTTP was enabled with `OCX_INSECURE_REGISTRIES` and `GRIM_INSECURE_REGISTRIES`. Without it, both CLIs fail against a plain-HTTP localhost registry with a TLS error and exit 75 (ocx) or 69 (grim); that run is recorded below as a finding of its own.

The `grim` on PATH is an ocx-managed shim that fails when `HOME` points at an empty directory ("ocx.toml: No such file"). The `grim mcp` measurement therefore called the real binary by absolute path.

Not measured: a real ghcr.io not-found (row 19 of the first-run audit reports it, [`product-audit/cli-first-run.md`](../product-audit/cli-first-run.md), source `grimoire/src/oci/access/error.rs:75`, quoted as `registry authentication failed: Not authorized` for a nonexistent repository); Windows; the VS Code extension; `ocx` has no MCP server.

### 2. What the standards say

**MCP, two channels.** The tools spec (revision 2025-11-25) says tools use "two error reporting mechanisms": protocol errors ("unknown tools", "malformed requests", "server errors") and tool execution errors reported "in tool results with `isError: true`" ("API failures", "input validation errors", "business logic errors"). It continues: "Tool Execution Errors contain actionable feedback that language models can use to self-correct and retry with adjusted parameters. Protocol Errors indicate issues with the request structure itself that models are less likely to be able to fix. Clients SHOULD provide tool execution errors to language models to enable self-correction. Clients MAY provide protocol errors to language models, though these are less likely to result in successful recovery." ([MCP tools spec](https://modelcontextprotocol.io/specification/2025-11-25/server/tools), fetched 2026-11-27, authority itself). The example for an unknown tool is code `-32602`; the example tool error is a date-validation message with `isError: true`.

Consequence: a client may never show a protocol error to the model, so an operational failure delivered as a protocol error can be invisible to the one party able to react.

**JSON-RPC codes.** `-32603` is "Internal error" ("Internal JSON-RPC error"), `-32602` "Invalid params" ([JSON-RPC 2.0, last updated 2013-01-04](https://www.jsonrpc.org/specification#error_object)). `-32603` means the server broke, not that a registry said no.

**RFC 9457 Problem Details** (July 2023, Proposed Standard, obsoletes RFC 7807; authority itself): `type` is a URI that "Consumers MUST use ... as the problem type's primary identifier"; `status` is advisory; `title` "SHOULD NOT change from occurrence to occurrence"; `detail` is a human explanation that "ought to focus on helping the client correct the problem"; `instance` identifies the occurrence. "Consumers SHOULD NOT parse the detail member for information"; machine-readable data goes in extension members, and "clients must ignore extensions they don't recognize". Security section: avoid leaking implementation internals "such as a stack dump" ([RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)). Media type `application/problem+json`.

**OCI distribution errors** (spec `main` branch, no version stated on the page): body `{"errors":[{"code","message","detail"}]}`; codes include `NAME_UNKNOWN` (404, repository), `MANIFEST_UNKNOWN` (404), `UNAUTHORIZED` (401), `DENIED`, `TOOMANYREQUESTS` (429, "should include `Retry-After`") ([OCI distribution spec](https://github.com/opencontainers/distribution-spec/blob/main/spec.md#error-codes)). A registry that can distinguish `NAME_UNKNOWN` from `UNAUTHORIZED` gives a client the data to separate not-found from unauthorised; `registry:2` with htpasswd does not (it answered 401 for everything, measured below).

**HTTP 429 and Retry-After.** RFC 6585 (April 2012) section 4: 429 means "too many requests in a given amount of time" and the response MAY include a `Retry-After` header ([RFC 6585](https://www.rfc-editor.org/rfc/rfc6585#section-4)). The RFC 9110 text on 401/403/404/409 was not read (the fetch was truncated before those sections), so no claim is made here about 404-versus-403 existence hiding.

**sysexits.** 64 `EX_USAGE`, 65 `EX_DATAERR` ("input data was incorrect ... only ... for user's data"), 69 `EX_UNAVAILABLE` ("a service is unavailable"; also "a catchall ... when something ... does not work, but you do not know why"), 75 `EX_TEMPFAIL` ("Temporary failure ... the request should be reattempted later"), 77 `EX_NOPERM`, 78 `EX_CONFIG` ([FreeBSD sysexits(3)](https://man.freebsd.org/cgi/man.cgi?query=sysexits&sektion=3), authority itself, undated page). The catalog's table assigns 69 as "unreachable, non-retryable" and 75 as "retryable transient failure". That is a catalog convention that narrows sysexits 69; an agent cannot learn it from sysexits alone, so the table must travel with the tool.

**gh.** Documented codes: 0 success, 1 "failed for any reason", 2 cancelled, 4 "requires authentication"; "a particular command may have more exit codes" ([gh exit codes](https://cli.github.com/manual/gh_help_exit-codes)). gh has one class an agent can act on (4, authenticate) and puts everything else in 1. Not-found, rate-limit and conflict are indistinguishable by exit code.

**The catalog's pinned table** ([`skills/rust-quality-reference/cli-contract.md`](../../../skills/rust-quality-reference/cli-contract.md), lines 26 to 52): 0, 1 fall-through only, 64 usage, 65 data, 69 unavailable (non-retryable), 74 io, 75 tempfail (retryable), 77 permission denied, 78 config, 79 NotFound, 80 AuthError, 81 PolicyBlocked, 82 DirtyRcBlock; 83 to 99 unassigned; EXIT-06 makes codes append-only. The Python, TypeScript, Go and shell sets pin the same family or cite it (`rules/python-quality.md` line 28, `rules/typescript-quality.md` line 83, `rules/go-quality.md` line 144). The table already separates the classes an agent needs (not-found 79, auth 80, retryable 75, policy 81, usage 64). The gap is not the table; it is that stderr and MCP output do not state the class, and that implementations map the same cause to different codes.

**Guidance on writing for agents.** Anthropic's tool-writing post (published 2025-09-11, vendor) says to prompt-engineer error responses "to clearly communicate specific and actionable improvements" rather than opaque codes or tracebacks, and to show an example of correct input ([Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents)). clig.dev (undated living guide) says to catch expected errors and rewrite them usefully, to keep signal-to-noise high, and to "map the non-zero exit codes to the most important failure modes" ([clig.dev](https://clig.dev/#errors)).

### 3. Measured: ocx and grim CLI errors

All commands `... </dev/null`, exit code from `$?`, stdout and stderr captured separately. `describe` and `package inspect` are the read-only lookups. "Wording" quotes the decisive line.

| Condition (command) | Exit | stdout | stderr wording | Retry verdict derivable from output alone? | Class derivable? |
|---|---|---|---|---|---|
| Not found, plain registry: `ocx package inspect localhost:5199/nope/x:1` | 79 | empty | `error: failed to inspect package: ... — package not found` | yes, not retryable (79 documented) | yes: not found |
| Not found: `grim describe localhost:5199/nope/x:1` | 79 | empty (plain) | `'x' (localhost:5199/nope/x:1): tag not found` | yes | yes. The word "tag" hides whether the repository or the tag is missing |
| Unauthorised, auth registry: `ocx package inspect localhost:5198/nope/x:1` | 80 | empty | `registry authentication failed: Not authorized: url http://localhost:5198/v2/nope/x/manifests/1` | yes, not retryable without a credential change | yes: auth; but a warning line precedes the error, duplicating the cause |
| Unauthorised: `grim describe localhost:5198/nope/x:1` | 80 | empty | `localhost:5198/nope/x: registry authentication failed: Not authorized: url http://localhost:5198/v2/nope/x/tags/list` | yes | yes. Cannot say whether the repo exists (registry answered 401 to a nonexistent repo) |
| Wrong credential: `grim login localhost:5198 -u u --password-stdin` with a wrong password | 80 | JSON `error.code: "auth"` | `registry localhost:5198 rejected the credential` | yes | yes. Distinguishes bad credential from missing repository |
| Network refused, TLS to plain-HTTP host: `ocx package inspect localhost:5199/nope/x:1` without the insecure setting | 75 | empty | `transient registry failure: could not connect to 'localhost:5199' over https; if it serves plain HTTP, set insecure = true under [registries."localhost:5199"] or add the host to OCX_INSECURE_REGISTRIES` | no: labelled "transient" and exit 75, yet retrying cannot succeed. The fix is a config change, which the text states | partly: the hint is good, the retry class is wrong |
| Same, grim | 69 | empty | `registry operation failed: error sending request ... received corrupt message of type InvalidContentType` | exit 69 reads non-retryable, the text gives no hint at the plain-HTTP cause | no. The wording hides the actual cause |
| Connection refused: `ocx package inspect localhost:1/nope/x:1` | 75 | empty | `transient registry failure: could not connect ... Connection refused (os error 111)` | yes, retryable, but a refused port is rarely transient | partly |
| Connection refused: `grim describe localhost:1/nope/x:1` | 69 | empty | `registry operation failed: ... Connection refused (os error 111)` | exit 69, non-retryable, no wording either way | no |
| 429 with `Retry-After: 30`: `ocx package inspect localhost:5197/nope/rate/x:1` | 75 | empty | `transient registry failure: ... OCI API errors: [OCI API error: too many requests]` | yes retryable; `Retry-After` value not surfaced | yes |
| 429: `grim describe localhost:5197/nope/rate/x:1` | 69 | JSON `unavailable` (with `--format json`) | `registry operation failed: ... too many requests` | no: exit 69 means non-retryable, text says rate limit | contradictory |
| 503 with `Retry-After: 30`: grim | 69 | JSON `unavailable` | `registry operation failed: Server error: ... code: 503, message: {"errors":[{"code":"TOOMANYREQUESTS",...}]}` | no | no (raw registry body echoed) |
| Hang (stub sleeps 120 s): `ocx package inspect localhost:5197/nope/hang:1` | 124 (killed by external `timeout 100`) | empty | empty | no output for 100 s; no built-in deadline observed in that window | no |
| Offline, unpinned reference: `ocx --offline package inspect ...` | 81 | empty | `offline mode refused to resolve unpinned reference ...; run 'ocx index update' or pin a digest` | yes, policy, with a safe fix named | yes |
| Offline: `grim --offline describe ...` | 81 | JSON `offline-blocked` | `offline mode blocked a required network operation` | yes, but no fix named | yes |
| Conflict: `grim release sk/demo localhost:5199/test/demo:1.0.0 --kind skill` after changing content | 65 | JSON `data` | `version tag '1.0.0' already exists at a different digest (existing sha256:4997..., new sha256:7fd9...); rerun with --force to move it` | not retryable; the hint names a destructive flag | partly. Class "data" is wrong for a conflict |
| Identical re-release (same content) | 0 | `pushed: true` | empty | idempotent success; with `--skip-existing`, `pushed: false, tags: []` | n/a. Idempotency is documented-by-behaviour |
| Usage: `grim release ... --repo ...` | 64 | empty even with `--format json` | `error: unexpected argument '--repo' found / tip: a similar argument exists: '--repository'` | yes; fix named | yes |
| Usage: `ocx package inspect 'bad ref!!'` | 64 | empty | `invalid identifier 'bad ref!!': invalid format` | yes | yes. Does not say which format is valid |
| Bad input: `grim add localhost:5199/nope/x:1` (no `--kind`) | 65 | JSON `data` | `could not infer the kind of '...'; pass --kind skill|rule|agent|bundle|mcp|hook|settings` | yes; the valid values are listed | yes. This is the model case: it lists the legal values |

JSON shapes seen (stdout, `--format json`):

```json
// ocx, exit 79
{"schema_version":1,"command":"package inspect","exit_code":79,
 "error":{"kind":"not_found","detail":"package_not_found","message":"...","context":{}}}

// ocx, exit 81 (offline) - note kind
{"schema_version":1,"command":"package inspect","exit_code":81,
 "error":{"kind":"permission_denied","detail":"index_resolution_blocked","message":"...","context":{}}}

// grim, exit 79 / 80 / 69 / 81 / 65
{"error":{"code":"not-found","exit":79,"message":"..."}}
{"error":{"code":"auth","exit":80,"message":"..."}}
{"error":{"code":"unavailable","exit":69,"message":"..."}}
{"error":{"code":"offline-blocked","exit":81,"message":"..."}}
{"error":{"code":"data","exit":65,"message":"..."}}
```

Observations:

1. Both CLIs put the failure on both stdout (JSON mode) and stderr, so a harness that reads one stream sees it. This duplicates the text in context if both are captured.
2. ocx offline refusal is `kind: "permission_denied"` with exit 81 (`PolicyBlocked`). The kind name and the exit code disagree about the class; the catalog table calls 81 "policy, not fault".
3. Not-found (79) and unauthorised (80) are separately addressable by exit code and `kind`/`code` in both tools. This is better than gh, where not-found falls into 1.
4. The registry body is echoed raw on a 503 (`{"errors":[...]}` inside the message). An agent would have to parse prose to see `TOOMANYREQUESTS`.
5. Neither tool exposes a `retryable` boolean, a `retry_after_seconds`, or a docs `type` URI. The agent must map 75 versus 69 itself, and the two tools map the same event differently (429, 503, connection refused).
6. A hang is silent. An agent without its own timeout loops waiting.

### 4. Measured: `grim mcp` errors

`grim mcp` 0.16.0 over stdio, protocol version `2025-06-18` negotiated by `initialize`; four tools listed: `grim_describe`, `grim_fetch`, `grim_search`, `grim_status`. `grim_render` exists only with `--allow-writes`. None of the listed tools declare an `outputSchema` or `annotations` (the listing printed `None` and no output schema). One `tools/call` per condition; JSON-RPC response recorded:

| Condition (arguments) | Channel | Code and text |
|---|---|---|
| Not found: `grim_describe {ref: localhost:5199/nope/x:1}` | protocol error | `-32603` `describe failed: 'x' (localhost:5199/nope/x:1): tag not found` |
| Unauthorised: `{ref: localhost:5198/nope/x:1}` | protocol error | `-32603` `describe failed: ... registry authentication failed: Not authorized: url http://localhost:5198/v2/nope/x/tags/list` |
| Network refused: `{ref: localhost:1/nope/x:1}` | protocol error | `-32603` `describe failed: ... Connection refused (os error 111)` |
| 429 stub: `{ref: localhost:5197/nope/rate/x:1}` | protocol error | `-32603` `registry operation failed: deadline has elapsed` (the CLI printed `too many requests` for the same stub; the MCP path reports a deadline instead, so a rate limit surfaces as a timeout with no `Retry-After`) |
| 503 stub | protocol error | `-32603` `... deadline has elapsed` |
| Malformed reference: `{ref: "bad ref!!"}` | protocol error | `-32603` `describe failed: invalid identifier 'bad ref!!': repository must match the OCI name grammar: lowercase [a-z0-9] runs joined by '.', '_', '__', or '-', with no leading, trailing, or doubled separator` |
| Missing argument: `{}` | `isError: true` result | `failed to deserialize parameters: missing field \`ref\`` |
| Wrong type: `{ref: 5}` | `isError: true` result | `failed to deserialize parameters: invalid type: integer \`5\`, expected a string` |
| Unknown tool: `grim_nope` | protocol error | `-32602` `tool not found` |
| Write tool while read-only: `grim_render` | protocol error | `-32602` `tool not found` (the model cannot tell "disabled" from "does not exist") |
| `grim_fetch` of a missing tag | protocol error | `-32603` `fetch failed: ... tag not found` |
| Success | result | JSON text of the report, no `isError` |

Reading against the spec: the spec says API failures, input validation errors and business logic errors are tool execution errors (`isError: true`) and that clients SHOULD give them to the model. In grim, the only `isError: true` results are parameter-deserialisation failures, which the spec lists as "malformed requests ... that fail to satisfy CallToolRequest schema" (a protocol error). The mapping is reversed: registry failures, which the spec calls tool execution errors, come back as `-32603` "Internal error" (JSON-RPC: "Internal JSON-RPC error"); schema failures, which the spec calls protocol errors, come back as `isError`. The practical harm: the error a model can fix (a malformed reference with a clear grammar message) travels on the channel the spec says clients MAY drop, and the CLI's `code`/`exit` pair is lost.

The text itself is usable: not-found says which reference; unauthorised names the url; bad reference states the grammar. What is missing is the class and the retry verdict: all `-32603` look identical to a client that handles error codes.

### 5. Error-class distinctions an agent needs

An agent's decision tree has five branches. Each needs a distinct, documented signal.

| Class | Agent action | Signal needed | Exists today? |
|---|---|---|---|
| Fix input and retry now | rewrite the argument, call again | class `invalid_input` plus the legal values or grammar | grim: yes for `--kind` (lists values); ocx bad ref says only `invalid format` |
| Not found | stop, do not retry; try a different name or ask | class `not_found`, and say what was looked up (repo or tag) | 79 in both; grim says "tag not found" for a missing tag but the nonexistent-repo case against `registry:2` also gives 79, so "tag" may mislead |
| Unauthorised | stop; do not retry; surface to the human | class `unauthorized`, and whether a credential was sent | 80 in both. Registry may answer 401 for a missing repo, so the text must say "or does not exist" |
| Transient, retry with backoff | retry after N seconds, bounded attempts | `retryable: true` and optional `retry_after_seconds` | 75 in ocx. grim maps the same events to 69. `Retry-After` not surfaced |
| Policy block, conflict, destructive | stop and ask | class `policy` or `conflict` with the safe alternative first | 81 for policy. Conflict has no class (65 `data`) and the hint names `--force` |

Distinctions that must not be collapsed:

- Not-found versus unauthorised. Collapsing them (gh puts 4 on "requires authentication" but not-found goes to 1; the ghcr row 19 audit finding puts a missing repo under auth) sends the agent into a login loop on a typo.
- Retryable versus not. A model that retries a non-retryable failure burns turns; a model that gives up on a 429 loses a task that would have succeeded after 30 seconds. The retry verdict must be a field, not an inference from an exit number that two tools assign differently.
- Policy versus fault. `--offline` and `--frozen` refusals (81) are the user's own settings. An agent must not "fix" them by dropping the flag.

### 6. The machine-readable error shape

RFC 9457 is the right base for HTTP and a sound base for tool results, because it already separates a stable `type`, a human `title`, an occurrence-specific `detail`, and extension members, and it tells consumers to key off `type`. The two CLIs' shapes sit close to it but differ from each other.

Proposed minimum for agent-facing errors (candidate rule 1 to 4): a JSON object on stdout in `--format json` mode and in MCP `structuredContent`/text, with:

```json
{
  "type": "https://ocx.sh/errors/not-found",      // stable identifier; or a short slug when a URI is unwanted
  "kind": "not_found",                              // closed vocabulary: invalid_input | not_found | unauthorized | forbidden | conflict | rate_limited | unavailable | timeout | policy | internal
  "exit": 79,                                       // CLI only; equals the process exit
  "retryable": false,                               // boolean; the field an agent reads first
  "retry_after_seconds": null,                      // number when the server stated one
  "message": "package localhost:5199/nope/x:1 not found",
  "hint": "check the repository name; list known repositories with `ocx index list`",   // safe next step first
  "context": {"reference": "localhost:5199/nope/x:1"}
}
```

Notes on the shape:

- `type`/`kind` is the machine key; `message` is for the model to read and for logs, never parsed (RFC 9457: "SHOULD NOT parse the detail member").
- `retryable` and `retry_after_seconds` are extension members in RFC 9457 terms, which clients must ignore if unknown, so adding them is backward-compatible.
- The existing ocx shape (`kind`, `detail`, `message`, `context`, `exit_code`) already has four of these; it lacks `retryable`, `retry_after_seconds` and `hint`. The grim shape (`code`, `exit`, `message`) is smaller.
- The vocabulary should be closed and documented; ocx `kind: permission_denied` for exit 81 shows what happens when the label drifts from the exit-code table.
- Usage errors (64) must emit the same object in JSON mode. Currently they print prose on stderr only.

### 7. The tool-error rule for MCP servers

From the spec text in section 2 and the grim measurement in section 4:

1. A failure of the thing the tool does (upstream API, registry, filesystem, authorisation, business rule, unmet precondition, caller-supplied value that fails validation) returns a normal result with `isError: true`, a text content block the model can act on, and, when the tool has an `outputSchema`, the structured error in `structuredContent`.
2. A failure of the request itself (JSON-RPC malformed, unknown method or tool, arguments that do not satisfy the declared `inputSchema`) is a protocol error with the JSON-RPC code.
3. Never use `-32603` for an expected failure. It means the server itself is broken.
4. An unavailable tool (here the write tools without `--allow-writes`) should be absent from `tools/list` (as grim does) and a call to it is `-32602`; but if the reason is policy, say so in the text so the model does not conclude the tool is misspelled.
5. The text must carry the class and the retry verdict, because the MCP result has no exit code.

An ambiguity worth stating: the spec's table puts "Input validation errors (e.g. date in wrong format, value out of range)" under tool execution errors and "requests that fail to satisfy CallToolRequest schema" under protocol errors. The boundary is whether the failure is in the shape (schema) or in the value's meaning (semantic). grim returns a schema failure (`missing field ref`) as `isError` and a semantic failure (`bad ref!!`) as `-32603`; by the spec text both are on the wrong side.

### 8. The user-facing versus model-facing split

What the measurement shows leaking into model-visible text today:

- Raw URLs and registry hostnames (`url http://localhost:5198/v2/nope/x/tags/list`). These are caller-supplied here, so low risk; for a service that fronts other hosts they are internal topology. The MCP security guide lists "error messages reveal information about internal network topology and services" as an SSRF risk ([MCP security best practices](https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices), spec 2025-11-25).
- Raw upstream bodies (`{"errors":[{"code":"TOOMANYREQUESTS",...}]}` echoed on a 503).
- OS error strings (`Connection refused (os error 111)`), useful and harmless.
- Tracing lines on stderr (`WARN grim::command::describe ... no scope resolved ... /tmp/...`), which print a local absolute path on every run on stderr. Harmless locally, noise for a model, and it would be a leak if stderr were forwarded to a remote service.

The split, following OWASP ("error details are logged server side for investigation, and not returned to the user", examples return a generic body; [OWASP Error Handling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html), undated) and RFC 9457 (do not expose "a stack dump"):

| Channel | Audience | Content |
|---|---|---|
| Model-facing (MCP `isError` text, `--format json` stdout, stderr one-liner) | model and the human watching it | class, retry verdict, which input was rejected, the legal values, the safe next step |
| Log (file or `--log-level debug`, a correlation id in the model-facing error) | operator | stack, upstream body, full URL, headers, internal paths |
| Never in either | no one | tokens, credentials, `Authorization` headers, cookies, raw environment |

Where the model-facing text names a remedy, the remedy is either safe (add `--kind`) or flagged as needing approval (`--force`).

## Normative guidance candidates

Severity: MUST / SHOULD / CONSIDER. "Verify" says how a reviewer or an agent checks it.

| # | Rule | Rationale | Sev | Verify |
|---|---|---|---|---|
| E1 | A command or tool that an agent can call returns its failure class in a closed, documented vocabulary: `invalid_input`, `not_found`, `unauthorized`, `forbidden`, `conflict`, `rate_limited`, `unavailable`, `timeout`, `policy`, `internal`. | The agent branches on class, and a prose scan is unreliable (RFC 9457: key off `type`, not `detail`). | MUST | Run one command per class against a local registry and a stub (recipe in section 1); each output names a class from the list. Fail example: grim 429 prints `unavailable`/69 while text says "too many requests"; pass example: `{"error":{"code":"not-found","exit":79}}`. |
| E2 | Not-found and unauthorised are separate classes with separate exit codes (catalog 79 and 80), and a 401 for a resource that may not exist says "unauthorised, or the resource does not exist". | A login loop on a typo, or a stop on a missing credential, are the two failure modes. | MUST | `ocx package inspect <host>/nope/x:1` against an htpasswd registry exits 80 and its text contains "or does not exist"; against an open registry exits 79. Grep the stderr text for `exist`. |
| E3 | Every error object in machine mode carries `retryable` (boolean). When the upstream sent `Retry-After`, it also carries `retry_after_seconds`. | The agent should not infer retryability from an exit number two tools assign differently (measured: 429 gives ocx 75, grim 69). | MUST | Point the tool at the 429 stub (`Retry-After: 30`); JSON contains `"retryable": true` and `"retry_after_seconds": 30`. `jq -e '.error.retryable \| type == "boolean"'`. |
| E4 | Exit codes follow the pinned table: 75 only for failures a retry can fix, 69 for unreachable or server-side failures that retrying will not fix, 81 for policy. The same cause maps to the same code in every binary of a family. | A retry loop on a non-retryable 75 wastes turns; the catalog already pins this. | MUST | Run the same stub condition through each binary and compare `echo $?`. Fail: ocx exit 75 and grim exit 69 for the same 429. Also `rg -n 'TempFail' src/` and check each mapping has a test (EXIT-07). |
| E5 | A conflict (immutable tag, concurrent write, version mismatch) is its own class `conflict`, not `data`, and the hint names the non-destructive step first (compare digests, bump the version). Any destructive remedy (`--force`) is labelled as requiring approval. | An agent that follows `rerun with --force` turns a refusal into an overwrite. | MUST | Re-release changed content to an existing tag; JSON has `"kind":"conflict"` and the `hint` does not begin with a destructive flag. Grep hints: `rg -n -e '--force' src/ --glob '*error*'` and read each hit for a preceding safe option. |
| E6 | In `--format json` mode, every failing exit (including 64 usage errors) prints the error object on stdout, and stdout contains nothing else on failure. | Measured: grim 64 and ocx 64 print prose on stderr only, so the machine path is empty exactly when the caller mis-typed. | MUST | `grim --format json release --bogus; echo $?` yields exit 64 and a parseable JSON object on stdout: `... \| jq -e .error`. |
| E7 | The error shape is the same in the CLI JSON mode and in the MCP tool result for the same condition. | The model should not need two vocabularies for one failure. | SHOULD | Same condition through CLI and MCP: compare `kind` and `retryable`. Fail: CLI has `code: auth, exit: 80`, MCP has neither. |
| E8 | MCP servers return expected operational failures (upstream error, not found, unauthorised, rate limit, value validation, business rule) as `isError: true` results. Protocol errors are only for malformed JSON-RPC, unknown methods or tools, and schema violations of `inputSchema`. `-32603` is never used for an expected failure. | The MCP spec says clients SHOULD show tool execution errors to the model and MAY hide protocol errors. | MUST | Script a `tools/call` per condition (recipe: `python3 -I mcp.py`, section 4) and assert `result.isError == true` for not-found, unauthorised, network and timeout; assert `error.code` is absent. Fail: grim 0.16.0 returns `-32603` for all four. |
| E9 | An MCP tool error result states the class, the retry verdict, the rejected input and a safe next step in its text, and in `structuredContent` when an `outputSchema` is declared. | The MCP result has no exit code, so the text is the only channel. | SHOULD | Read test: show only the `content[0].text` to a reviewer (or a fresh model) and ask "retry? change input? stop? ask the human?" for each condition; all five conditions answered correctly. Fail example: `registry operation failed: deadline has elapsed`. |
| E10 | Surface upstream `Retry-After` and the upstream error code (for OCI, `TOOMANYREQUESTS`, `NAME_UNKNOWN`, `UNAUTHORIZED`) as structured fields, not as an echoed raw body. | The registry already gives the class; echoing the body forces the model to parse prose. | SHOULD | Stub returns `Retry-After: 30`; JSON carries `"upstream_code":"TOOMANYREQUESTS"` and not the raw `{"errors":[`: `jq -e '.error.upstream_code'` and `! rg -F '{"errors"'` on the message. |
| E11 | Every network call has a bounded deadline, and a timeout is reported as `timeout` with `retryable: true` and the deadline that elapsed. | Measured: ocx produced no output for 100 s on a stalled peer; a silent hang makes the agent wait or kill the process. | MUST | Point the tool at the hang stub; it exits within the documented deadline with class `timeout`. `time timeout 120 <cmd>` finishes below the deadline. |
| E12 | A "disabled" tool or capability says it is disabled and why (policy), rather than `tool not found`. | The model cannot tell a typo from a deliberate off-switch, and may keep guessing names. | SHOULD | Call the write tool without `--allow-writes`; the text contains `disabled` or `requires --allow-writes`. Fail: grim returns `-32602 tool not found`. |
| E13 | Model-facing error text never contains secrets, stack traces, `Authorization` values, or internal hostnames the caller did not supply. Details go to a log reachable by a correlation id. | OWASP and RFC 9457 security sections; MCP guide lists topology leaks. | MUST | Grep a captured failure run: `rg -i -e 'authorization:' -e 'bearer ' -e 'at .*\.rs:[0-9]+' -e 'Traceback'` yields no hit; trigger a failing call with a fake token `tok-SENTINEL` and `rg tok-SENTINEL` over stdout and stderr yields no hit. |
| E14 | Diagnostic tracing (`WARN ... no scope resolved ... /abs/path`) does not appear on stderr by default in non-interactive mode. | It adds noise and local paths to every model transcript. | CONSIDER | Run any command with stderr captured and `rg 'WARN\|/home/\|/tmp/'` on a successful run: zero hits by default. Measured: grim prints a `WARN` with the working directory on every `describe` outside a project. |
| E15 | An error message names the failing object at the right level: "repository" versus "tag" versus "manifest". | `tag not found` for a nonexistent repository sends the model hunting for another tag. | SHOULD | Query a missing repository and a missing tag in an existing repository; the two messages differ in the object noun. Needs a registry that returns `NAME_UNKNOWN` versus `MANIFEST_UNKNOWN` (OCI spec codes). |
| E16 | A hint that is a command is a complete, runnable line using the tool's real flag names; a usage error names the nearest valid flag when one exists. | Measured good example: `tip: a similar argument exists: '--repository'`. | SHOULD | Extract the backticked command in each hint and run `<cmd> --help` or the dry run: exit 0 or 64-with-fix, never "unknown subcommand". |
| E17 | The error vocabulary and exit-code table is published with the tool (docs page and `schema` or `--help`), append-only, and a new class is a minor-version change. | Agents cache their mapping; a renamed class silently breaks them (catalog EXIT-06). | SHOULD | Diff the documented table against `rg -n 'enum ExitCode' -A40`; check the release notes list any new class. |
| E18 | An error whose remedy is a business, legal or credential decision (overwrite a published artifact, rotate or share a credential, relax a policy flag) tells the model to ask the human, in those words. | See section "What an agent must not decide alone". | MUST | Trigger conflict, policy block and auth failure; each message or `hint` contains `ask` or `requires approval` and no ready-to-paste bypass. |
| E19 | Logging an agent's retry loop: a caller retries only `retryable: true`, at most 3 times, with the server's `retry_after_seconds` or exponential backoff, and never retries a mutating call without an idempotency check (see UX-ACT). | Prevents storms and duplicate writes. | SHOULD | Review the agent's harness config: a retry wrapper keyed on `retryable`, not on exit code alone, with a cap. The mutating-retry detail is out of scope here. |

## Dated facts

| Fact | URL | Date the source states | Source kind |
|---|---|---|---|
| MCP tools error handling: two channels; `isError: true` for API failures, input validation and business logic errors; clients SHOULD give tool execution errors to models | https://modelcontextprotocol.io/specification/2025-11-25/server/tools | revision 2025-11-25 (version in URL) | the standard itself |
| MCP security guide lists internal-topology disclosure through error messages as an SSRF consequence | https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices | revision 2025-11-25 | the standard itself |
| JSON-RPC 2.0 `-32602` Invalid params, `-32603` Internal error | https://www.jsonrpc.org/specification#error_object | last updated 2013-01-04 | the standard itself |
| RFC 9457 Problem Details: `type` primary identifier, `detail` not for parsing, extension members, obsoletes RFC 7807 | https://www.rfc-editor.org/rfc/rfc9457 | July 2023 | the standard itself |
| RFC 6585 section 4: 429 Too Many Requests, optional `Retry-After` | https://www.rfc-editor.org/rfc/rfc6585#section-4 | April 2012 | the standard itself |
| RFC 9110 published; 401/404/409 text not read | https://www.rfc-editor.org/rfc/rfc9110.html | June 2022 | the standard itself (fetch truncated; no claim made) |
| OCI distribution spec error codes, including `TOOMANYREQUESTS` 429 "should include Retry-After" | https://github.com/opencontainers/distribution-spec/blob/main/spec.md#error-codes | `main` branch, no version on page | the standard itself |
| gh exit codes 0, 1, 2, 4; commands may define more | https://cli.github.com/manual/gh_help_exit-codes | undated page | the platform itself |
| sysexits: 64, 65, 69, 75, 77, 78 | https://man.freebsd.org/cgi/man.cgi?query=sysexits&sektion=3 | undated page | the authority itself |
| Catalog table 0 to 82; 69 non-retryable, 75 retryable, 79 NotFound, 80 AuthError, 81 PolicyBlocked | `skills/rust-quality-reference/cli-contract.md` lines 26 to 52 (local) | undated, in repo at HEAD 6344379 | this catalog |
| grim `login` verify table: credential rejected 80, registry unreachable or server error 69, skipped 0; offline plus `--verify` is exit 81 | `/home/mherwig/dev/grimoire-rs/grimoire/docs/src/content/docs/authentication.md` lines 104 to 116 (local) | undated | the tool's own docs |
| Anthropic: write actionable error responses; concise versus detailed `response_format` | https://www.anthropic.com/engineering/writing-tools-for-agents | 2025-09-11 | vendor guidance |
| OWASP: log details server side, return generic text; RFC 9457 referenced | https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html | undated page | independent authority |
| clig.dev: rewrite expected errors; map non-zero codes to the important failure modes | https://clig.dev/#errors | undated living guide | independent community guide |
| ocx 0.6.8 and grim 0.16.0 behaviour (all rows of section 3 and 4) | measured 2026-11-27 | 2026-11-27 | first-party measurement; commands in section 1 |
| Row 19 of the first-run audit: nonexistent ghcr repository reported as authentication failure | `.agents/research/product-audit/cli-first-run.md` | 2026-11-27 | first-party audit |

No statistic or market figure was used; none is needed for this decision.

## What an agent must not decide alone

Where an error output points at a choice, the correct behaviour is to stop and ask the owner.

- Overwriting or moving a published tag or artifact (`--force` after a conflict). A published artifact has consumers.
- Entering, rotating, or choosing a credential after an auth error, or switching to another registry or account.
- Dropping `--offline`, `--frozen`, `--locked` or a similar policy flag after exit 81. The flag is the user's own rule.
- Enabling write tools (`--allow-writes`) on an MCP server. Grim's own help says this is "a trust decision of whoever wires the server into a harness, never of the model calling the tools".
- Turning on insecure (plain-HTTP) registry access (`OCX_INSECURE_REGISTRIES`, `insecure = true`) in a shared or committed config. The error hint recommends it for a local registry; for a remote host it is a security decision.
- Deciding how much internal detail error messages may disclose in a product (hostnames, tenant ids, versions). That is a security and brand decision.
- Reinterpreting an exit code or renaming an error class that is already shipped (append-only; consumers script against it).
- Retrying a mutating call after a timeout without the owner's rule on idempotency (UX-ACT owns the detail).

## AI-agent angle

What models characteristically get wrong, and the smallest mechanical check:

| Mistake | Smallest check |
|---|---|
| Reads exit `1` or `75` as "try again" without checking whether the error text says a config change is needed (ocx marks a TLS-to-plain-HTTP failure "transient") | A retry cap of 3 and a requirement that the retry's input or environment differ from the first; log the diff |
| Treats a 401 on a missing repository as a credential problem and loops on `login` | Rule E2 text, plus a harness rule: after one failed `login`, stop |
| Follows a hint that says `--force` | E5 and E18; harness allowlist that blocks `--force` without approval |
| Greps stderr for "not found" instead of reading the class field | Prefer `--format json` and `jq -r '.error.kind // .error.code'` in the harness; fail the run if the field is absent |
| Parses `detail` or `message` text to extract a number (rate-limit seconds) | E3 and E10 expose `retry_after_seconds` |
| Assumes an MCP error is a bug in the server (`-32603`) and gives up, when it is an ordinary not-found | E8 changes the channel; until then, a harness note that grim `-32603` carries the operational message |
| Treats `tool not found` for a write tool as a typo and invents names | E12 |
| Assumes exit 0 on an idempotent re-run means a push happened; grim returns `pushed: true` on identical content then `false` with `--skip-existing` | Read `pushed` and `tags` in the JSON, not just `$?` |
| Calls `ocx --version` (usage error 64) and takes it as "ocx missing" | Use `ocx version`; the E16 hint should name it |
| Assumes the same condition yields the same exit across the family (ocx 75, grim 69 for 429) | E4's cross-binary comparison |

## Contested / evolving

- **Protocol error versus tool error for invalid arguments.** The MCP 2025-11-25 spec lists "input validation errors" under tool execution errors and schema failures under protocol errors. Implementations differ (Rust SDK style servers like grim return deserialisation failures as `isError`). The spec text favours `isError` for anything a model can correct, so E8 follows that reading. A server author who treats a schema failure as a protocol error is within the spec for strictly schema-invalid input; this was not resolved by the spec text read here.
- **Whether to use a type URI.** RFC 9457 requires `type` as a URI identifier; CLI practice (gh, grim) uses short slugs. Both are machine keys; the catalog position here is a closed slug vocabulary with an optional URI, which RFC 9457 allows only as the `about:blank` default plus `title`. Sources disagree on whether a CLI needs URIs; none was found that tests agent behaviour on it.
- **Sysexits 69 versus 75.** sysexits defines 69 as a general "service unavailable" catch-all and 75 as "temporary failure, reattempt later". The catalog narrows 69 to non-retryable. A model reading only sysexits would treat 69 as retryable. The catalog table must travel with the tool (E17).
- **gh-style minimal codes versus a rich table.** gh documents four codes and leaves the rest in 1; clig.dev says to "map the non-zero exit codes to the most important failure modes". The rich table wins for agents because an exit code is the cheapest signal; a minimal table pushes the agent to parse prose.
- **Hints that name a command.** Anthropic's guide recommends actionable error text; the measurement shows a hint can also push the agent to a destructive step. No source was found that studies hint-following by agents; the E5 and E18 rules are a judgement from the measured `--force` hint.
- **Rate limit through a timeout.** grim over MCP reported a 429 as `deadline has elapsed`, while the CLI reported it as `too many requests`. Whether this is a client-side retry budget exhausting is not established from the output alone (the source was not read).

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://modelcontextprotocol.io/specification/2025-11-25/server/tools | MCP tools spec, Error Handling section | 2025-11-25 | The rule on `isError` versus protocol errors (primary) |
| https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices | MCP security best practices | 2025-11-25 | Error-message topology leaks, scope minimisation (primary) |
| https://www.rfc-editor.org/rfc/rfc9457 | RFC 9457 Problem Details for HTTP APIs | July 2023 | The standard error shape and the "do not parse detail" rule (primary) |
| https://www.rfc-editor.org/rfc/rfc6585#section-4 | RFC 6585 section 4, 429 Too Many Requests | April 2012 | `Retry-After` on rate limits (primary) |
| https://www.rfc-editor.org/rfc/rfc9110.html | RFC 9110 HTTP Semantics | June 2022 | Opened; status-code sections were beyond the fetched window and not quoted (primary) |
| https://www.jsonrpc.org/specification#error_object | JSON-RPC 2.0 error object and codes | updated 2013-01-04 | Meaning of `-32602` and `-32603` (primary) |
| https://github.com/opencontainers/distribution-spec/blob/main/spec.md#error-codes | OCI distribution spec error codes | `main` branch | The codes that separate not-found, unauthorised and rate limit (primary) |
| https://cli.github.com/manual/gh_help_exit-codes | gh exit codes | undated | A mainstream CLI's minimal table (primary) |
| https://man.freebsd.org/cgi/man.cgi?query=sysexits&sektion=3 | sysexits(3) | undated | Origin of 64 to 78 (primary) |
| `/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/skills/rust-quality-reference/cli-contract.md` | Catalog exit-code table and rules EXIT-01 to EXIT-09 | repo HEAD 6344379 | The pinned contract (primary, local) |
| `/home/mherwig/dev/grimoire-rs/grimoire/docs/src/content/docs/authentication.md` | grim auth docs, login exit table | repo as of 2026-11-27 | Documented exit codes for verify (primary, local) |
| `/home/mherwig/dev/ocx-sh/grimoire-lore/.agents/worktrees/product/.agents/research/product-audit/cli-first-run.md` | Grounding audit, row 19 | 2026-11-27 | The not-found reported as auth finding (first-party) |
| https://www.anthropic.com/engineering/writing-tools-for-agents | Anthropic, writing effective tools for agents | 2025-09-11 | Vendor guidance on actionable error responses (vendor) |
| https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html | OWASP Error Handling Cheat Sheet | undated | Log server side, generic text to callers (independent) |
| https://clig.dev/#errors | Command Line Interface Guidelines, Errors | undated | Rewrite errors, map exit codes to failure modes (independent) |

Cross-territory finding (one line, left to its owner): the human-facing wording of these messages (UX-TEXT) and retry safety of mutating commands (UX-ACT cli-destructive-commands) are not assessed here.

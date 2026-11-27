---
title: Machine Output and Error Contracts
summary: UX-AGENT-01 to 07 and 09 to 14, covering the machine-output flag and its position, one JSON document per exit, schema_version, bounded lists, JSON Lines events, the error field set and class vocabulary, the retry verdict, deadlines, not-found versus unauthorised, conflicts and hints, and secrets in error output
---

# Machine Output and Error Contracts

What a CLI prints when its caller is a program or an agent. An agent picks its next action from the output alone, so the output has to answer three questions in fields: did it work, which class of failure is it, and will an unchanged retry help. Rows bind the CLI's own `--format json` mode and every SDK, extension or skill that parses it. `UX-AGENT-08` is retired and its number is not reused. MCP servers are `mcp-servers.md` in this skill (UX-AGENT-15 to 24 and 26), and the agent's own calling discipline is UX-AGENT-25 in `tool-approval.md`. Rules the catalog already pins are cited, never restated: CLI-01 and CLI-02 (stdout carries only the result), EXIT-01 to EXIT-11 (the exit-code table, append-only), CLI-07 (colour), CLI-10 (`--format` is a global flag), GO-NET-11 (which HTTP statuses a client retries) and UX-ACT-16 (what a repeated mutating command returns).

Contents: [Dates and Versions](#dates-and-versions) · [Machine Mode](#machine-mode) · [Lists and Streams](#lists-and-streams) · [Error Fields and Classes](#error-fields-and-classes) · [The Retry Verdict](#the-retry-verdict) · [Hints, Conflicts and Secrets](#hints-conflicts-and-secrets) · [Documented Gaps](#documented-gaps) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Dates and Versions

Measured and fetched 2026-11-27. The blocks need `jq` 1.6 or later, and the two scripts need Python 3.11.

| Fact | Source | Date | Refresh and re-check |
|---|---|---|---|
| Seven common CLIs disagree on where the JSON flag may sit: gh, docker, cargo and uv accept it only after the subcommand, npm anywhere, and one measured tool only before it | Seven CLIs run side by side, `mytool about --json` against `mytool --json about` | 2026-11-27 | 12 months. Re-run both orders on the current release of each |
| cargo's unversioned build stream changed what `package_id` means in 1.77 | [Cargo external tools](https://doc.rust-lang.org/cargo/reference/external-tools.html) | page undated | 12 months. Search the page for `package_id` |
| Problem Details: consumers "SHOULD NOT parse the detail member" | [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) | July 2023 | Stable standard. Re-check only on a new RFC |
| JSON Lines, JSON Schema `additionalProperties` default, sysexits, RFC 6585 (429) | [jsonlines.org](https://jsonlines.org/), [json-schema.org](https://json-schema.org/understanding-json-schema/reference/object#additionalproperties) | undated | Stable standards |
| Pagination, range selection, filtering or truncation with sensible defaults for tool output | [Anthropic, writing tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents) | 2025-09-11, vendor | 12 months |
| HTTP retry set: transport errors, 408, 429 and 5xx except 501; never 401, 403, 404 | GO-NET-11 in `go-quality-reference`, citing RFC 9110 sections 15.5.9 and 15.6.2 | read 2026-11-27 | Re-read GO-NET-11 and the exit-69 wording of the language CLI contracts when decision D3 lands |
| Raw `gh search issues --limit 1000 --json number,title,body` output on a large repository | measured | 2026-11-27 | 4,473,121 bytes at the time. A measurement, not a limit |

The exit numbers below are the catalog's pinned sysexits-aligned table (64 usage, 65 data, 69 unavailable, 75 retryable, 79 not found, 80 auth, 81 policy). An adopter substitutes its own numbers and keeps the mechanism. The error class vocabulary and the field names are defaults an adopter overrides once.

The open decisions D1 to D4 named in the rows are listed once in `SKILL.md`.

## Machine Mode

Run the first group with `CHECKS` set to the `checks/` directory next to `SKILL.md` (see `SKILL.md`). One command covers 01, 02, 03, 04 and the field half of 09 and 14:

```sh
python3 -I "$CHECKS"/json_output_check.py --success 'about' --not-found 'describe nope/x' --usage 'about --bogus' -- mytool
```

Exit 0 is the pass. Add `--rust-cli04` for a binary under Rust CLI-04, `--classes` with the documented vocabulary, and `--sentinel tok-SENTINEL` once the failing call carries that fake token in a credential channel: an environment variable, a header or a `--password` value, as in `MYTOOL_TOKEN=tok-SENTINEL python3 -I "$CHECKS"/json_output_check.py --sentinel tok-SENTINEL --not-found 'describe nope/x' -- mytool`. Never put it in the argument the message must name (UX-AGENT-09 clause e): that echo is correct, and the check would report it.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-AGENT-01 | Accept the machine-output flag both before and after the subcommand, with identical results. In clap the format flag carries `global = true`. | Agents put flags after the subcommand by gh and docker habit. One measured CLI exited 64 on `about --json` while `--json about` worked, and it is the likeliest first call of a session. | `json_output_check.py` exits 0: both positions give the same exit code and byte-identical stdout, for every report-printing subcommand. | MUST |
| UX-AGENT-02 | Make `--format json` the one canonical selector across the family, and accept `--json` as an alias on every command. | gh and npm spell it `--json`, docker and uv spell it `--format`. Accepting both absorbs either habit. One measured CLI exited 64 with `unexpected argument '--json'`. | `json_output_check.py` reports no UX-AGENT-02 line: `--json` prints the same stdout as `--format json`. | SHOULD |
| UX-AGENT-03 | In machine mode, print exactly one JSON document on stdout on every exit path, usage and parse errors (exit 64) included. Print nothing else on stdout on failure. | When the caller mistyped, the machine path is all it has. One measured CLI printed 0 bytes on stdout for exit 64, the case the caller most needs it. | `json_output_check.py` with a `--usage` case exits 0. Or see block UX-AGENT-03 for one subcommand. | MUST |
| UX-AGENT-04 | Give every JSON document, success and error, a top-level integer `schema_version`, and publish a JSON Schema per report. Adding an optional field keeps the version. Removing, renaming or retyping a field, or changing a unit or an enum's meaning, bumps it. For a binary under Rust CLI-04 the error-document clause is SHOULD until CLI-04 adds the field (D4). | It is the only mechanical break detector, and adding the field is additive under an additive-only policy. CLI-04 pins the error envelope as `{"error": {…}}`, so a top-level sibling there is a CLI-04 change. | `json_output_check.py` finds an integer `schema_version` on the success and error fixtures. CI resolves the schema URL, and a schema diff fails on a non-additive change that has no bump. | MUST |
| UX-AGENT-05 | Every consumer of a tool's JSON (SDK, extension, agent skill) ignores unknown fields. It branches only on documented fields and never pattern-matches `message`. | Additive change is safe only if consumers tolerate it. JSON Schema allows extra properties by default, and RFC 9457 tells consumers not to parse `detail`. | A fixture adds one unknown property at the top level and one inside `error`: the consumer parses it and takes the same branch. The greps in block UX-AGENT-05 are locators only. Turn a hit into a fixture case before you report it. | MUST |

```sh
CLI=mytool
# UX-AGENT-03: exit 0 means one JSON document with an error object, for a mistyped flag
"$CLI" --format json about --bogus 2>/dev/null | jq -e .error
# UX-AGENT-05: locators. Every hit becomes a fixture case, never a finding by itself.
git ls-files -z --cached --others --exclude-standard -- ':(glob)**/*.ts' ':(glob)**/*.rs' ':(glob)**/*.py' \
  | xargs -0 -r grep -H -n -E -e 'additionalProperties: *false' -e '\.strict\(\)' -e 'deny_unknown_fields' -e '(includes|match|contains)\(.*message' --
```

## Lists and Streams

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-AGENT-06 | Bound list output by default with a row limit. Return `total`, `truncated` and a continuation (`next_cursor`, or the flag that raises the limit) as data fields, never only in prose. | An agent cannot detect "…and 36 more" in prose, and an unbounded list floods its context. The MCP size threshold is UX-AGENT-26, not this rule. | See block UX-AGENT-06: both fields are present, `.truncated` is true on a fixture larger than the default limit, and following the continuation reaches the remaining rows. | MUST |
| UX-AGENT-07 | Stream events as JSON Lines. Each line is one object, `\n`-terminated, with a discriminator field (`type`, `event` or `reason`). End the stream with a terminal event, and document which stream carries the events. | Without a terminal event, a consumer cannot tell truncation from completion. cargo's `reason` field plus `build-finished` is the model. | See block UX-AGENT-07: every line parses, and the last line carries the documented terminal type. | SHOULD |

A partial page also prints a stderr hint that names the lever to raise the limit, but the data fields stay the contract. `truncated: true` means the document is incomplete, and a caller that concludes anything from it is wrong (UX-AGENT-25).

```sh
CLI=mytool
# UX-AGENT-06: both fields present, then truncation on a fixture larger than the default limit
"$CLI" --format json list-things | jq -e 'has("total") and has("truncated")'
# UX-AGENT-07: every line parses; read the last line for the terminal type
"$CLI" list-things --progress json 2>&1 >/dev/null | jq -ce . >/dev/null
```

## Error Fields and Classes

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-AGENT-09 | Every machine-mode error carries six fields. (a) A class slug from a closed, documented vocabulary that covers at least `invalid_input`, `not_found`, `unauthorized`, `conflict`, `rate_limited`, `timeout`, `unavailable`, `policy` and `internal`. (b) The exit code, equal to the process exit. (c) `retryable`, a boolean, sent as `false` too. (d) `retry_after_seconds` when the upstream stated one. (e) `message`, naming the offending input. (f) `hint`, when a safe next step exists. Spelling (`code` or `kind`, `exit` or `exit_code`) follows the language set's pinned envelope. Clause (c)'s "sent as `false` too" is SHOULD until Rust CLI-04 makes `retryable` required (D4). | An agent branches on class and retry verdict, and a field that appears only when true cannot be told from "not computed". Two measured CLIs sent no `retryable` outside one reason, and one lost the missing argument's name in `context: {}`. Sending the field always already conforms to an optional `retryable?`. | `json_output_check.py` on the not-found and usage cases: a slug, an `exit` equal to the process exit, a boolean `retryable`, a non-empty `message`. One fixture per class from the stub matrix below, and the missing-argument check in block UX-AGENT-09. | MUST |

```sh
# UX-AGENT-09: a missing required argument must be named in the message. ARG is that argument.
ARG=PACKAGE
"$CLI" --format json describe 2>/dev/null | jq -e --arg a "$ARG" '.error.message | contains($a)'
```

Class vocabulary, the minimum the rule names. Retryable means an unchanged rerun can succeed.

| Class | Typical cause | `retryable` |
|---|---|---|
| `invalid_input` | bad flag, argument or value | false |
| `not_found` | the named thing does not exist | false |
| `unauthorized` | credentials missing or refused | false |
| `conflict` | immutable tag, concurrent write, version mismatch | false |
| `rate_limited` | 429, with `retry_after_seconds` when sent | true |
| `timeout` | a deadline expired, with the elapsed seconds | true |
| `unavailable` | transport or server failure | see the next section |
| `policy` | a deliberate refusal such as `--offline` | false |
| `internal` | a defect in the tool | false |

An error document that passes UX-AGENT-04 and 09, and the shapes that fail:

```json
{"schema_version": 1, "error": {"code": "rate_limited", "exit": 75, "retryable": true, "retry_after_seconds": 30,
  "message": "registry example.com answered 429 for describe nope/x:1", "hint": "Wait 30 seconds, then rerun the same command.",
  "upstream_code": "TOOMANYREQUESTS"}}
```

```json
{"error": "request failed"}
{"schema_version": 1, "error": {"code": "unavailable", "exit": 69, "message": "registry authentication failed: {\"errors\":[{\"code\":\"TOOMANYREQUESTS\"}]}"}}
```

The first fails every clause: no version, no class slug, no exit, no `retryable`. The second sends a 429 as exit 69 (UX-AGENT-10), omits `retryable` (09) and echoes the raw upstream body (14).

## The Retry Verdict

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-AGENT-10 | Set `retryable: true` (exit 75) only when an unchanged rerun can succeed: a transport failure that may clear (connection refused or reset, timeout), lock contention, 408, 429, and 5xx except 501. Set `false` (exit 69, or the class's own code) when input or config must change first: a TLS-to-plain-HTTP mismatch, a DNS name not found, a refused certificate, 501, and every other 4xx. Map the same cause to the same class and exit in every binary of the family. | A wrong "retryable" burns turns, and a wrong "not retryable" abandons a task that would have succeeded. The HTTP set is GO-NET-11's. Two measured CLIs were wrong in opposite directions: one sent 429 and 503 to exit 69, the other sent the TLS mismatch to exit 75. Held at SHOULD: the connection-refused clause contradicts the Rust and Go exit tables' "69 … non-retryable" wording while Swift treats a connect failure as 75 (D3). | See block UX-AGENT-10: each stub's exit and `.error.retryable` match the table below, in every binary. | SHOULD |
| UX-AGENT-11 | Give every network operation a bounded, documented deadline. Report its expiry as class `timeout` with `retryable: true` and the elapsed deadline in seconds. Never report a rate limit as a timeout. | A silent hang leaves the agent waiting or killing the process. One measured CLI printed nothing for 100 s on a stalled peer, and one MCP path reported a 429 as `deadline has elapsed`. | See block UX-AGENT-11: the hang stub ends before the documented deadline with class `timeout`, and the 429 stub gives `rate_limited`. `json_output_check.py` reports UX-AGENT-11 when a case never exits. | MUST |

The stub matrix: serve each cause from a throwaway local server, and point the binary at it. `checks/stub_server.py MODE` prints its base URL on the first line and serves modes `429`, `503`, `404` and `hang`. Start it in the background with its output redirected to a file, and read the URL from that file's first line (the first line of the block below does both). A refused port is any unused port. The TLS-against-plain-HTTP row is mode `404` addressed as `https://` instead of `http://`. In the blocks below `lookup` stands for the CLI's own command that fetches one record from the URL (`describe`, `inspect`, `pull`): use the one the CLI has.

| Stub | Class | `retryable` | Exit |
|---|---|---|---|
| answers 429 with `Retry-After` | `rate_limited` | true | 75 |
| answers 503 | `unavailable` | true | 75 |
| refused port | `unavailable` | true | 75 |
| accepts, never answers | `timeout` | true | 75 |
| TLS client against a plain-HTTP port | `unavailable` | false | 69 |
| answers 404 | `not_found` | false | 79 |

```sh
CLI=mytool
# Start each stub in turn: python3 -I "$CHECKS"/stub_server.py 429 >stub.txt & sleep 1; STUB_URL=$(head -n 1 stub.txt)
# UX-AGENT-10: run once per stub URL. Compare both values with the table; every row must match, in every binary.
"$CLI" --format json lookup "$STUB_URL/nope:1" >out.txt 2>/dev/null; echo "exit $?"
jq -r '[.error.code // .error.kind, .error.retryable] | @tsv' out.txt
# UX-AGENT-11: exit 124 means the CLI never gave up, and that is the finding.
timeout 120 "$CLI" --format json lookup "$HANG_URL/nope:1" >out.txt 2>/dev/null; echo "exit $?"
jq -e '(.error.code // .error.kind) == "timeout"' out.txt
# UX-AGENT-12: an htpasswd registry answers 401 for a missing name. Start it, then look the name up.
docker run --rm --entrypoint htpasswd httpd:2 -Bbn probe probe >htpasswd
docker run -d --name probe-reg -p 5000:5000 -v "$PWD/htpasswd:/auth/htpasswd:ro" -e REGISTRY_AUTH=htpasswd -e REGISTRY_AUTH_HTPASSWD_REALM=probe -e REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd registry:2
"$CLI" --format json lookup "localhost:5000/nope:1" >out.txt 2>err.txt; echo "exit $?"
grep -c -F -e exist -- out.txt err.txt
docker rm -f probe-reg
```

## Hints, Conflicts and Secrets

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| UX-AGENT-12 | Keep not-found and unauthorised as separate classes (catalog exits 79 and 80). Where a 401 or 403 may hide a missing resource, the message says "not authorised, or it does not exist; check the name". | Collapsing the two sends an agent into a login loop on a typo. A local `registry:2` with htpasswd auth answered 401 for a repository that did not exist, and so did a real public registry (probed 2026-11-27). | Against an htpasswd registry, a lookup of a missing name exits 80 and its stderr contains `exist`. Against an open registry it exits 79. | MUST |
| UX-AGENT-13 | Give a conflict (an immutable tag, a concurrent write, a version mismatch) its own class `conflict`, not `data`. Write every hint as a complete, runnable line with the tool's real flags, and put the safe step first. Label any destructive or policy-relaxing remedy (`--force`, `insecure = true`, dropping `--offline`) with the exact words "requires the owner's approval", and never make it the first or only remedy. | Agents follow hints literally. One measured CLI exited 65 `data` on a tag conflict with "rerun with --force to move it" as the only remedy, and another recommended a command that does not exist. | Run block UX-AGENT-13. (1) The hint check prints nothing. (2) The approval check prints nothing. (3) "Safe step first" is a reading check on each hit of (2). (4) Re-releasing changed content to an existing tag gives class `conflict`. | MUST |
| UX-AGENT-14 | Keep secrets, `Authorization` values, stack traces and raw upstream bodies out of model-facing output (stdout, stderr, MCP text). Surface the upstream error code as a field (`upstream_code`, such as OCI `TOOMANYREQUESTS`), and send detail to a log. | The OWASP Error Handling Cheat Sheet keeps details server-side, and the MCP security best practices (revision 2025-11-25) list topology leaks through error messages. One measured CLI echoed the raw `{"errors":[…]}` body of a 503. | `json_output_check.py --sentinel tok-SENTINEL` reports no UX-AGENT-14 line. See block UX-AGENT-14 for the three greps. | MUST |

A hint, wrong and right (UX-AGENT-13):

```text
tag 1.2.0 exists with a different digest; rerun with --force to move it
conflict: tag 1.2.0 exists with a different digest. Release the change as a new version, such as 1.2.1.
Moving the existing tag requires the owner's approval: mytool release --force.
```

The first line turns a refusal into an overwrite for an agent that follows hints literally. The other two put the safe step first, name a command that exists, and label the destructive remedy.

```sh
CLI=mytool
# UX-AGENT-13 (1): every command a hint names exists. Any BAD line is the finding. Adapt the first grep to the language's error-string idiom; single-line attributes only.
git ls-files -z --cached --others --exclude-standard -- ':(glob)src/**/*.rs' ':(exclude,glob)**/tests/**' \
  | xargs -0 -r grep -H -n -E -e '#\[error\(' -- \
  | grep -o -E "\`$CLI [a-z][a-z ]*" | sed -e 's/^`//' -e 's/ *$//' | sort -u \
  | while read -r c; do $c --help </dev/null >/dev/null 2>&1 || echo "BAD: $c"; done
# UX-AGENT-13 (2): a remedy that relaxes a guard and lacks the approval words. Read each hit for (3).
git ls-files -z --cached --others --exclude-standard -- ':(glob)src/**/*.rs' ':(exclude,glob)**/tests/**' \
  | xargs -0 -r grep -H -n -E -e '#\[error\(' -- \
  | grep -E -e '--force' -e 'insecure = true' -e 'without --offline' \
  | grep -v -F -e "requires the owner's approval"
# UX-AGENT-14: a failing call that carries the sentinel in a credential channel (here an environment variable, or a header or --password value), never in the argument the message names. Any hit is the finding.
SENTINEL=tok-SENTINEL
MYTOOL_TOKEN="$SENTINEL" "$CLI" --format json lookup nope/x >out.txt 2>err.txt
cat out.txt err.txt | grep -n -F -e "$SENTINEL" --
cat out.txt err.txt | grep -n -i -E -e 'authorization:' -e 'bearer ' -e 'Traceback' -e '\.rs:[0-9]+' --
jq -r '.error.message' out.txt | grep -n -F -e '{"errors"' --
```

## Documented Gaps

- **The error envelope has two shipped spellings** and no third is proposed: Rust CLI-04 pins `{"error":{"code","exit",…}}` and Swift SW-CLI-29 pins `{"schema_version","command","exit_code","error":{"kind",…}}`. UX-AGENT-09 fixes the fields, never the spelling (D1).
- **`retryable` is authoritative, and the exit code is only a fallback** for a build that never sends the field. One measured consumer retried on exit 75 even over an explicit `false`, and a producer that omits the field unless true makes the two readings differ. "Always present" stays SHOULD until D4.
- **No caller-side corpus has been measured**, so the failure ranking below is judged from measurements of several CLIs, not counted from transcripts.
- **A tool that retries internally and an agent that retries too** multiply attempts. How large the tool's own retry budget should be, and whether it should report `attempts`, is unmeasured.
- **A `conflict` exit code of its own** is undecided (D2). Until then a conflict keeps the class slug `conflict` on the existing code.
- **A `--format json` run that mixes streams** is outside this file: CLI-07 owns ANSI escapes on piped stderr.

## What Agents Get Wrong Here

Ranked by how often each bites.

1. **`mytool sub --json` because gh does it.** It fails on a CLI that accepts the flag only before the subcommand, and it is the first call of most sessions (UX-AGENT-01, 02).
2. **`2>&1 | jq`**, which mixes log lines, some with ANSI colour, into the JSON (UX-AGENT-25, CLI-07).
3. **Grepping stderr for "not found"**, or parsing a number of seconds out of the message, instead of reading the class or `retry_after_seconds` (UX-AGENT-05, 09).
4. **Following a hint literally**: `--force` after a conflict, `insecure = true` for a remote host, or a hinted command that does not exist (UX-AGENT-13).
5. **Retrying a deterministic failure** because it was labelled transient, giving up on a 429 labelled 69, or looping on `login` after a 401 caused by a typo (UX-AGENT-10, 12).
6. **Waiting forever on a stalled peer** because the tool has no deadline (UX-AGENT-11).
7. **Concluding from a truncated listing**, or flooding context with an unbounded one (UX-AGENT-06).
8. **Emitting a boolean only when true**, so a consumer cannot tell `false` from "unknown" (UX-AGENT-09).
9. **Writing the success path only.** A new `--format json` flag that prints the report and leaves every error as prose on stderr (UX-AGENT-03).
10. **Adding a field and calling it unversioned**, or removing one and calling it additive (UX-AGENT-04).
11. **Echoing the upstream body into `message`** because it is the most informative text on hand (UX-AGENT-14).
12. **Quoting a platform limit from memory.** Re-fetch the page named in Dates and Versions.

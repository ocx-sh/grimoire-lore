---
title: "Follow-up q4: does OpenAI's root-anyOf restriction apply to strict function parameters?"
program: product
topic: ux-agent-facing-interfaces
worker: followup-q4
wave: 2
date_researched: 2026-11-27
model: sonnet
sources_fetched: 4
---

# Follow-up q4: root `anyOf` and OpenAI strict function parameters

## Question

Does OpenAI's "Root objects must not be anyOf" rule apply to strict-mode function parameters? Can the top-level combinator rejection be reproduced against a named client?

## Answer

Partly. The rule is documented for Structured Outputs schemas generally. The page never says it holds for function parameters. Reproduction against a named client was not possible: it needs an OpenAI API key, and none may be used here. The one client-side check that could run offline does not enforce the rule.

### What the primary text says

Both pages were downloaded raw with curl (not through a summarising fetcher) into `~/.cache/research-lang/exemplars/product/wave2/q4/pages/` and searched with grep, so every absence claim below is a measured count.

Command and output:

```
cd ~/.cache/research-lang/exemplars/product/wave2/q4/pages
curl -sL -A "Mozilla/5.0" -o structured-outputs.html https://developers.openai.com/api/docs/guides/structured-outputs   # HTTP 200, 3538010 bytes
curl -sL -A "Mozilla/5.0" -o function-calling.html   https://developers.openai.com/api/docs/guides/function-calling     # HTTP 200, 1589993 bytes
for w in "anyOf" "root level object" "Root objects" "function parameters" "must be specified as"; do grep -o "$w" structured-outputs.html | wc -l; done
  -> 14, 1, 1, 1, 1
for w in (same five) ; do grep -o "$w" function-calling.html | wc -l; done
  -> 0, 0, 0, 0, 0
```

Source: [Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs), undated (no date on the page), fetched 2026-11-27. The page has a heading, HTML id `root-objects-must-not-be-anyof-and-must-be-an-object`, text "Root objects must not be `anyOf` and must be an object". Its body, verbatim from the HTML: "Note that the root level object of a schema must be an object, and not use `anyOf`. A pattern that appears in Zod (as one example) is using a discriminated union, which produces an `anyOf` at the top level." Same page, verbatim: "To use Structured Outputs, all fields or function parameters must be specified as `required`."

Correction to the first draft of this file: it said the heading quoted by UX-AGENT-20 was "not found". That was wrong. The heading is on the page (count 1 above). UX-AGENT-20's quote is accurate; only its closing sentence needs the update below.

Source: [Function calling guide](https://developers.openai.com/api/docs/guides/function-calling), undated, fetched 2026-11-27. From the raw HTML: "Setting `strict` to `true` will ensure function calls reliably adhere to the function schema, instead of being best effort."; "`additionalProperties` must be set to `false` for each object in the `parameters`."; "Some features of JSON schema are not supported. (See [supported schemas](/api/docs/guides/structured-outputs?context=with_parse#supported-schemas).)". The last one is a link to the Structured Outputs "Supported schemas" section, the section that holds the root rule. The function-calling page itself has 0 occurrences of `anyOf` and of "Root objects" (counts above).

Reading: the function guide links strict mode to the Structured Outputs supported-schemas section, and the Structured Outputs page names "function parameters" in its `required` rule. So the root rule very likely applies to strict function parameters. That is an inference from a link plus one sentence; no page states the root rule for `tools[].function.parameters`.

### Measurement: the named client's SDK does not enforce it

Client: the official `openai` Python SDK, version 2.0.0, installed in a throwaway venv under `~/.cache/research-lang/exemplars/product/wave2/q4/`. Its strict-schema helper `_ensure_strict_json_schema` (used by `pydantic_function_tool`) was run on a root-`anyOf` schema.

Command:

```
cd ~/.cache/research-lang/exemplars/product/wave2/q4 && uv venv -q v && uv pip install -q --python v/bin/python openai==2.0.0
v/bin/python -I - <<'E'
import json
from openai.lib._pydantic import _ensure_strict_json_schema as f
s={"anyOf":[{"type":"object","properties":{"a":{"type":"string"}}},{"type":"object","properties":{"b":{"type":"integer"}}}]}
print(json.dumps(f(s,path=(),root=s)))
E
```

Output:

```
{"anyOf": [{"type": "object", "properties": {"a": {"type": "string"}}, "additionalProperties": false, "required": ["a"]}, {"type": "object", "properties": {"b": {"type": "integer"}}, "additionalProperties": false, "required": ["b"]}]}
```

The SDK accepts the root combinator and fills `additionalProperties` and `required` on each branch. It rejects nothing. Any rejection therefore comes from the API server, which was not called.

## What could not be determined

- Whether the API returns an error for a root-`anyOf` strict function parameter, and its exact text. Missing: an OpenAI API key and a live call (`POST /v1/responses` or `/v1/chat/completions` with `tools[0].function.strict: true` and a root `anyOf` in `parameters`). Using a key found on this machine is forbidden, so this is a documented gap.
- Whether a non-strict function (`strict` omitted or false) accepts a root `anyOf`. The docs say non-strict is best effort, but no passage covers the root.
- GitHub's claim that "some providers reject an entire `tools/list` payload" names no provider. Source: code comment above `TestAllToolInputSchemasAvoidTopLevelCombinators` in [github-mcp-server `pkg/github/tools_validation_test.go`](https://github.com/github/github-mcp-server/blob/main/pkg/github/tools_validation_test.go#L51-L54), vendor claim, read from a `--depth 1` clone at commit `1a3b6a7` (2026-11-27; `git log -1 --format='%h %cs' -- pkg/github/tools_validation_test.go` prints `1a3b6a7 2026-11-27`). Verbatim: "Some providers reject an entire tools/list payload when any input schema has a top-level combinator". The shallow clone has no history, so the date of the comment's introduction is not known; the research file dates its earlier snapshot `7edc2dd`, 2026-11-25. This follow-up neither confirms nor refutes the claim.

## Dated facts

| Fact | Source | Date |
|---|---|---|
| "the root level object of a schema must be an object, and not use `anyOf`" | [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) | undated, fetched 2026-11-27 |
| "all fields or function parameters must be specified as `required`" | same | same |
| Strict function parameters need `additionalProperties: false` and all fields `required` | [Function calling](https://developers.openai.com/api/docs/guides/function-calling) | undated, fetched 2026-11-27 |
| openai Python SDK 2.0.0 does not reject root `anyOf` client-side | measurement above | 2026-11-27 |

## Effect on the ruleset

- **UX-AGENT-20: change (rationale text and a new verification; severity unchanged).** The combinator clause stays SHOULD. Replace the last two sentences of the rationale ("One named provider restricts the root: OpenAI Structured Outputs, ... That page does not say whether this applies to function parameters.") with: "One named provider documents the restriction: OpenAI's [Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs) (undated, fetched 2026-11-27) has the heading 'Root objects must not be `anyOf` and must be an object' and says 'the root level object of a schema must be an object, and not use `anyOf`'. The [function calling guide](https://developers.openai.com/api/docs/guides/function-calling) links strict mode to that page's supported schemas. No page states the root rule for strict function parameters, and no API rejection was reproduced (openai Python SDK 2.0.0 accepts a root `anyOf` client-side)."
  Added verification (rationale still current), appended to the existing jq checks: `curl -sL -A Mozilla/5.0 https://developers.openai.com/api/docs/guides/structured-outputs | grep -c 'root level object of a schema must be an object, and not use <code>anyOf</code>'` prints `1` (measured 2026-11-27). If it prints `0`, the cited sentence has moved and the rationale must be re-read. The existing jq check `jq -r '.[]|select(.inputSchema|has("anyOf") or has("oneOf") or has("allOf"))|.name' tools.json` was run on a two-tool sample (one plain schema, one root `anyOf`) and printed only `bad`, so it detects the violation. Promotion to MUST needs a live rejection from an API key owner.
- **No new rule.** A reproduction recipe for the owner, to promote the clause: call the API once with a strict function whose `parameters` is `{"anyOf":[...]}` and record the error body.

#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Checks for an MCP server's saved output (UX-AGENT-15 to 22, 26; UX-ACT-20).

Subcommands:
  tools FILE [--server-key KEY] [--max-tools N] [--gate-flag FLAG] [--gated a,b]
      [--writers a,b]
      FILE is a saved `tools/list` response: the full JSON-RPC reply, a
      `{"tools": [...]}` object or the bare array. Checks names (18), description
      length (19), input schemas (20), tool count (22), the gate named in a
      description (17) and annotations (UX-ACT-20). Lines that start `note:` are
      pre-filters for a reading check, never findings.
      --server-key  the key the client registers the server under, for the
                    128-character full-name check. A plugin-bundled server passes
                    plugin_<plugin-name>_<server-name>.
      --gated       comma list of tool names that the launch flag gates off; the
                    default list must not contain any of them (17).
      --writers     comma list of tool names the inventory says can write; none
                    may carry readOnlyHint: true.
  result FILE [--error | --expect-protocol-error]
      FILE is a saved `tools/call` response. With --error the call failed on
      purpose: it must be a result with isError true and no JSON-RPC `error`
      member (15), with the class and verdict prefix and under 10000 bytes (16).
      Without --error, text above 40000 bytes (26) and a structuredContent that
      differs from the JSON text (21) are findings.
      --expect-protocol-error is for the call to a tool the server does not
      register (a gated tool, UX-ACT-18): it must be a JSON-RPC error with code
      -32602 and no result. That is the one place a protocol error is right.
  --self-test

Exit codes: 0 clean, 1 findings, 2 usage or unreadable input.
Run as: python3 -I mcp_tools_check.py ...
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
NAME_RE = re.compile(r"[a-z0-9_]{1,128}")
GENERIC = {"search", "fetch", "get", "list", "run", "query", "read"}
DESC_MAX = 2048  # old-client margin, UX-AGENT-19
CUE = re.compile(
    r"\b(use when|use this|use it|when you|call this|call it|instead of|before|after|if you)\b",
    re.IGNORECASE,
)
CLOSED = re.compile(r"\b(one of|either|must be (?:one of )?['\"`])", re.IGNORECASE)
PREFIX = re.compile(r"^[a-z_]+ \((retryable|not retryable)\): ")
ERR_MAX = 10_000
RESULT_MAX = 40_000


def load(path: str):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        print(f"usage: cannot read {path}: {e}", file=sys.stderr)
        raise SystemExit(2) from e


def tools_of(doc) -> list[dict]:
    if isinstance(doc, dict):
        doc = doc.get("result", doc)
        doc = doc.get("tools") if isinstance(doc, dict) else doc
    if not isinstance(doc, list) or not all(isinstance(t, dict) for t in doc):
        print("usage: no tools array in the file", file=sys.stderr)
        raise SystemExit(2)
    return doc


def check_tools(  # noqa: PLR0913, PLR0917 - one flag per check, all optional
    tools: list[dict],
    server_key: str = "",
    max_tools: int = 20,
    gate_flag: str = "",
    writers: frozenset[str] = frozenset(),
    gated: frozenset[str] = frozenset(),
) -> list[tuple[str, str, str]]:
    out: list[tuple[str, str, str]] = []

    def add(rid: str, sev: str, msg: str) -> None:
        out.append((rid, sev, msg))

    names = [str(t.get("name", "")) for t in tools]
    for n in sorted({n for n in names if names.count(n) > 1}):
        add("UX-AGENT-18", "MUST", f"{n}: name is not unique")
    for t in tools:
        n = str(t.get("name", ""))
        if not NAME_RE.fullmatch(n):
            add("UX-AGENT-18", "MUST", f"{n!r}: name is not 1 to 128 characters of [a-z0-9_]")
        if n in GENERIC:
            add(
                "UX-AGENT-18",
                "SHOULD",
                f"{n}: bare generic verb; prefix it with the server or object",
            )
        if server_key and len(f"mcp__{server_key}__{n}") > 128:
            add(
                "UX-AGENT-18",
                "SHOULD",
                f"{n}: full name mcp__{server_key}__{n} is over 128 characters",
            )
        desc = t.get("description")
        if not isinstance(desc, str) or not desc.strip():
            add("UX-AGENT-19", "SHOULD", f"{n}: description is missing")
        else:
            if len(desc) > DESC_MAX:
                add(
                    "UX-AGENT-19",
                    "SHOULD",
                    f"{n}: description is {len(desc)} characters, over {DESC_MAX}",
                )
            if not CUE.search(desc):
                out.append(
                    ("note", "", f"{n}: no sentence names a trigger (UX-AGENT-19 item 2): read it")
                )
        schema = t.get("inputSchema")
        if not isinstance(schema, dict):
            add("UX-AGENT-20", "MUST", f"{n}: inputSchema is missing")
            continue
        props = schema.get("properties") or {}
        for key in ("anyOf", "oneOf", "allOf"):
            if key in schema:
                add("UX-AGENT-20", "SHOULD", f"{n}: top-level {key} in inputSchema")
        for pname, p in props.items():
            if not isinstance(p, dict) or not str(p.get("description", "")).strip():
                add("UX-AGENT-20", "MUST", f"{n}.{pname}: property has no description")
            elif CLOSED.search(p["description"]) and "enum" not in p:
                out.append(
                    (
                        "note",
                        "",
                        f"{n}.{pname}: description lists a closed set but there is no enum",
                    )
                )
        for r in schema.get("required") or []:
            if r not in props:
                add("UX-AGENT-20", "MUST", f"{n}: required {r!r} is not a property")
        if not props and schema.get("additionalProperties") is not False:
            add(
                "UX-AGENT-20", "SHOULD", f"{n}: a no-parameter tool uses additionalProperties false"
            )
        ann = t.get("annotations")
        if not isinstance(ann, dict):
            add("UX-ACT-20", "SHOULD", f"{n}: no annotations; set the four hints explicitly")
        else:
            if ann.get("readOnlyHint") is True and ann.get("destructiveHint") is True:
                add("UX-ACT-20", "MUST", f"{n}: readOnlyHint and destructiveHint are both true")
            if ann.get("readOnlyHint") is True and n in writers:
                add("UX-ACT-20", "MUST", f"{n}: can write but carries readOnlyHint true")
            if "openWorldHint" not in ann:
                add("UX-ACT-20", "SHOULD", f"{n}: openWorldHint is not set")
    required_of = {
        str(t.get("name")): set((t.get("inputSchema") or {}).get("required") or []) for t in tools
    }
    seen = sorted(required_of)
    for i, a in enumerate(seen):
        for b in seen[i + 1 :]:
            shared = required_of[a] & required_of[b]
            da = next(str(t.get("description", "")) for t in tools if str(t.get("name")) == a)
            db = next(str(t.get("description", "")) for t in tools if str(t.get("name")) == b)
            if shared and not (
                (b in da or "instead" in da.lower()) and (a in db or "instead" in db.lower())
            ):
                out.append(
                    (
                        "note",
                        "",
                        (
                            f"{a} and {b} share required input {min(shared)!r} but do not "
                            f"name each other (UX-AGENT-19 item 3): read them"
                        ),
                    )
                )
    bare = [str(t.get("name")) for t in tools if "outputSchema" not in t]
    if bare:
        out.append(
            (
                "note",
                "",
                (
                    f"{len(bare)} of {len(tools)} tools have no outputSchema; UX-AGENT-21 binds "
                    f"only those that return structured data"
                ),
            )
        )
    if len(tools) > max_tools:
        add(
            "UX-AGENT-22",
            "SHOULD",
            f"{len(tools)} tools are registered; the default set is at most {max_tools}",
        )
    if gate_flag and not any(gate_flag in str(t.get("description", "")) for t in tools):
        add("UX-AGENT-17", "SHOULD", f"no description names the gate {gate_flag}")
    for n in sorted(gated & set(names)):
        add("UX-AGENT-17", "SHOULD", f"{n}: gated tool is registered in the default list")
    return out


def text_of(result: dict) -> str:
    return "".join(
        c.get("text", "")
        for c in result.get("content") or []
        if isinstance(c, dict) and c.get("type") == "text"
    )


def check_unknown_tool(doc) -> list[tuple[str, str, str]]:
    err = doc.get("error") if isinstance(doc, dict) else None
    if not isinstance(err, dict):
        return [
            ("UX-ACT-18", "MUST", "the call to the absent tool did not return a JSON-RPC error")
        ]
    if err.get("code") != -32602:
        return [("UX-ACT-18", "MUST", f"unknown tool answered code {err.get('code')}, not -32602")]
    if "result" in doc:
        return [("UX-ACT-18", "MUST", "the unknown-tool reply also carries a result")]
    return []


def check_result(doc, expect_error: bool) -> list[tuple[str, str, str]]:
    out: list[tuple[str, str, str]] = []
    if isinstance(doc, dict) and "error" in doc:
        out.append(
            (
                "UX-AGENT-15",
                "MUST",
                f"failure came back as a JSON-RPC error ({doc['error'].get('code')})"
                if expect_error
                else "the call returned a JSON-RPC error member",
            )
        )
        return out
    result = doc.get("result", doc) if isinstance(doc, dict) else None
    if not isinstance(result, dict):
        print("usage: no result object in the file", file=sys.stderr)
        raise SystemExit(2)
    text = text_of(result)
    size = len(text.encode("utf-8"))
    if expect_error:
        if result.get("isError") is not True:
            out.append(("UX-AGENT-15", "MUST", "the failure result does not set isError true"))
        if not PREFIX.match(text):
            out.append(
                (
                    "UX-AGENT-16",
                    "SHOULD",
                    "text does not start `<class> (retryable|not retryable): `",
                )
            )
        if size >= ERR_MAX:
            out.append(
                ("UX-AGENT-16", "SHOULD", f"error text is {size} bytes, over the {ERR_MAX} bound")
            )
    else:
        if size >= RESULT_MAX:
            out.append(
                ("UX-AGENT-26", "SHOULD", f"text is {size} bytes, over the {RESULT_MAX} bound")
            )
        if "structuredContent" in result:
            try:
                same = json.loads(text) == result["structuredContent"]
            except ValueError:
                same = False
            if not same:
                out.append(
                    ("UX-AGENT-21", "SHOULD", "text block is not the JSON of structuredContent")
                )
    return out


def report(findings: list[tuple[str, str, str]]) -> int:
    for rid, sev, msg in findings:
        print(f"{rid} {sev}: {msg}" if rid != "note" else f"note: {msg}")
    return 1 if any(f[0] != "note" for f in findings) else 0


def main(argv: list[str]) -> int:
    if argv == ["--self-test"]:
        return self_test()
    p = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = p.add_subparsers(dest="cmd", required=True)
    t = sub.add_parser("tools")
    t.add_argument("file")
    t.add_argument("--server-key", default="")
    t.add_argument("--max-tools", type=int, default=20)
    t.add_argument("--gate-flag", default="")
    t.add_argument("--gated", default="")
    t.add_argument("--writers", default="")
    r = sub.add_parser("result")
    r.add_argument("file")
    mode = r.add_mutually_exclusive_group()
    mode.add_argument("--error", action="store_true")
    mode.add_argument("--expect-protocol-error", action="store_true")
    a = p.parse_args(argv)
    if a.cmd == "tools":
        return report(
            check_tools(
                tools_of(load(a.file)),
                a.server_key,
                a.max_tools,
                a.gate_flag,
                frozenset(w for w in a.writers.split(",") if w),
                frozenset(g for g in a.gated.split(",") if g),
            )
        )
    if a.expect_protocol_error:
        return report(check_unknown_tool(load(a.file)))
    return report(check_result(load(a.file), a.error))


def self_test() -> int:
    def expect(cond: bool, what: str) -> None:
        if not cond:
            raise SystemExit(f"self-test: {what}")

    fx = HERE / "fixtures" / "mcp"
    ok = [
        f
        for f in check_tools(tools_of(load(str(fx / "pass-tools.json"))), "mytool", 20)
        if f[0] != "note"
    ]
    expect(not ok, f"clean tools reported {ok}")
    bad = check_tools(
        tools_of(load(str(fx / "fail-tools.json"))),
        "mytool",
        5,
        "--allow-writes",
        frozenset({"mytool_render"}),
    )
    got = {(f[0], f[1]) for f in bad}
    for want in (
        ("UX-AGENT-18", "MUST"),
        ("UX-AGENT-18", "SHOULD"),
        ("UX-AGENT-19", "SHOULD"),
        ("UX-AGENT-20", "MUST"),
        ("UX-AGENT-20", "SHOULD"),
        ("UX-AGENT-22", "SHOULD"),
        ("UX-AGENT-17", "SHOULD"),
        ("UX-ACT-20", "MUST"),
        ("UX-ACT-20", "SHOULD"),
    ):
        expect(want in got, f"planted violation {want} not found")
    expect(
        any(f[0] == "note" and "mytool_describe" in f[2] for f in bad),
        "overlap pre-filter did not fire",
    )
    expect(
        not check_result(load(str(fx / "pass-error-result.json")), True),
        "clean error result flagged",
    )
    expect(
        check_result(load(str(fx / "fail-error-result.json")), True)[0][0] == "UX-AGENT-15",
        "rpc error missed",
    )
    expect(
        check_result(load(str(fx / "fail-error-text.json")), True)[0][0] == "UX-AGENT-16",
        "prefix missed",
    )
    expect(
        not check_result(load(str(fx / "pass-structured-result.json")), False),
        "clean structured flagged",
    )
    expect(
        check_result(load(str(fx / "fail-structured-result.json")), False)[0][0] == "UX-AGENT-21",
        "drift missed",
    )
    expect(
        not check_unknown_tool(load(str(fx / "pass-unknown-tool.json"))),
        "clean unknown-tool error flagged",
    )
    expect(
        check_unknown_tool(load(str(fx / "fail-unknown-tool.json")))[0][0] == "UX-ACT-18",
        "unknown-tool stub result missed",
    )
    expect(
        check_unknown_tool(load(str(fx / "fail-error-result.json")))[0][0] == "UX-ACT-18",
        "wrong unknown-tool code missed",
    )
    leaked = check_tools(
        tools_of(load(str(fx / "pass-tools.json"))),
        "mytool",
        20,
        gated=frozenset({"mytool_search"}),
    )
    expect(
        any(f[:2] == ("UX-AGENT-17", "SHOULD") and "mytool_search" in f[2] for f in leaked),
        "registered gated tool missed",
    )
    expect(
        not [
            f
            for f in check_tools(
                tools_of(load(str(fx / "pass-tools.json"))),
                "mytool",
                20,
                gated=frozenset({"mytool_render"}),
            )
            if f[0] != "note"
        ],
        "absent gated tool flagged",
    )
    big = {"result": {"content": [{"type": "text", "text": "x" * RESULT_MAX}]}}
    expect(check_result(big, False)[0][0] == "UX-AGENT-26", "oversize result missed")
    with tempfile.TemporaryDirectory() as tmp:
        f = Path(tmp) / "t.json"
        f.write_text(
            json.dumps(
                {
                    "tools": [
                        {
                            "name": "ok_tool",
                            "description": "Use when asked.",
                            "inputSchema": {"type": "object", "additionalProperties": False},
                        }
                    ]
                }
            )
        )
        expect(tools_of(load(str(f)))[0]["name"] == "ok_tool", "bare tools object not read")
    print("mcp_tools_check self-test: ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

#!/usr/bin/env python3
"""Reduce probe transcripts to what a judge needs, and tally what agents consulted.

Per probe: the turn-1 rewrite, the turn-2 answer, and every file or command the
agent touched, tagged by store (source, test, record, rule, agent-config, git).

Usage: extract.py --runs DIR --out FILE.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

GIT_RE = re.compile(r"(^|[;&|]\s*)(/usr/bin/)?git\s+(log|show|blame|grep)\b")
STORE = [
    ("agent-config", re.compile(r"(CLAUDE\.md|AGENTS\.md|\.claude/rules/|\.claude/skills/|\.cursor/rules/|copilot-instructions)")),
    ("record", re.compile(r"(adr|decision|rulings?|plan_|subsystem-|architecture)[^/]*\.md$|/adr/|/decisions/", re.I)),
    ("doc", re.compile(r"\.md$")),
    ("test", re.compile(r"(/tests?/|_test\.|/test_|\.test\.|\.spec\.|tests\.rs$)")),
    ("source", re.compile(r".")),
]


def classify_target(tool: str, inp: dict) -> tuple[str, str]:
    """Store for one tool call: git by whole command, else by the path operand only."""
    if tool == "Bash":
        cmd = inp.get("command", "")
        if GIT_RE.search(cmd):
            return "git", cmd
        ops = [t for t in cmd.split() if not t.startswith("-") and ("/" in t or "." in t)]
        target = ops[-1] if ops else ""
    else:
        target = inp.get("file_path") or inp.get("path") or ""
    if not target:
        return "search", str(inp.get("pattern") or inp.get("command") or "")
    return next(name for name, rx in STORE if rx.search(target)), target


def final_text(events: list) -> str:
    res = [e for e in events if e.get("type") == "result"]
    if res:
        return res[-1].get("result", "") or ""
    texts = []
    for e in events:
        if e.get("type") == "assistant":
            for c in e.get("message", {}).get("content", []):
                if c.get("type") == "text":
                    texts.append(c["text"])
    return texts[-1] if texts else ""


def touches(events: list) -> list[dict]:
    out = []
    for e in events:
        if e.get("type") != "assistant":
            continue
        for c in e.get("message", {}).get("content", []):
            if c.get("type") != "tool_use":
                continue
            store, target = classify_target(c.get("name", ""), c.get("input", {}))
            out.append({"tool": c.get("name"), "target": str(target)[:200], "store": store})
    return out


def cost(events: list) -> dict:
    res = [e for e in events if e.get("type") == "result"]
    if not res:
        return {}
    r = res[-1]
    return {"usd": r.get("total_cost_usd"), "turns": r.get("num_turns"), "error": r.get("is_error")}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--runs", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    rows = []
    for f in sorted(Path(a.runs).glob("*.json")):
        d = json.loads(f.read_text())
        rows.append(
            {
                "site": d["site"],
                "arm": d["arm"],
                "rep": d.get("rep", 1),
                "line": d["line"],
                "rewrite": final_text(d["turn1"]),
                "answer_unled": final_text(d.get("turn2a", [])),
                "answer_led": final_text(d.get("turn2b", [])),
                "touch1": touches(d["turn1"]),
                "touch2": touches(d.get("turn2a", [])) + touches(d.get("turn2b", [])),
                "usd": sum((cost(d.get(k, [])).get("usd") or 0) for k in ("turn1", "turn2a", "turn2b")),
            }
        )
    Path(a.out).write_text(json.dumps(rows, indent=1))
    print(f"{len(rows)} probes -> {a.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

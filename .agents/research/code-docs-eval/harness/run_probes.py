#!/usr/bin/env python3
"""Run cold reason-recovery probes: one headless Claude Code session per site x arm.

Turn 1 (unprimed): simplify the enclosing function, reply with the rewrite.
Turn 2a (unled):   why is the anchor line written this way; what breaks if it changes? (scored)
Turn 2b (led):     is this named edit safe? (confabulation gate only)

Each session starts in the arm's snapshot with project settings only
(--setting-sources project,local: the snapshot's CLAUDE.md and path-scoped rules
load, user plugins and hooks do not), read-only tools, no web.

Usage: run_probes.py --sites sites.json --arms-dir DIR --out DIR [--arms a,b] [--only id,id] [-j 6] [--model sonnet] [--rep 1]
"""

from __future__ import annotations

import argparse
import concurrent.futures as cf
import json
import subprocess
import sys
from pathlib import Path

ALLOWED = [
    "Read",
    "Grep",
    "Glob",
    "Bash(git log:*)",
    "Bash(git show:*)",
    "Bash(git blame:*)",
    "Bash(git grep:*)",
    "Bash(rg:*)",
    "Bash(grep:*)",
    "Bash(ls:*)",
    "Bash(find:*)",
    "Bash(sed -n:*)",
    "Bash(head:*)",
    "Bash(tail:*)",
    "Bash(wc:*)",
]
DISALLOWED = ["Edit", "Write", "NotebookEdit", "WebFetch", "WebSearch", "Agent", "Task"]

P1 = (
    "Task: simplify the function `{function}` in `{file}`. Make it shorter and easier to read "
    "without changing its intended behaviour. Do not edit any file. Reply with the complete "
    "rewritten function in one fenced code block, then one short line per change you made."
)
P2A = (
    "Look at this code in `{file}`, near line {line}:\n\n```\n{anchor}\n```\n\n"
    "Why is it written this way? Could it be written differently without changing anything "
    "that matters? If something would break, say what, and where you found that.\n\n"
    "Answer in exactly this shape:\n"
    "REASON: <one to three sentences>\n"
    "CONSTRAINT: <none, or what breaks if it changes>\n"
    "EVIDENCE: <file:line of a comment, doc, test, rule or record you relied on; "
    "or 'inferred from code'; or 'not found'>"
)
P2 = (
    "Same code. A colleague proposes this change: {edit}\n"
    "Is that change safe to make?\n\n"
    "Answer in exactly this shape:\n"
    "VERDICT: keep | may-change\n"
    "REASON: <one to three sentences>\n"
    "EVIDENCE: <where you found the reason: file:line of a comment, doc, test, rule or record; "
    "or 'inferred from code'; or 'not found'>"
)


def locate(root: Path, rel: str, anchor: str, near_fn: str) -> int:
    lines = (root / rel).read_text(encoding="utf-8").split("\n")
    first = anchor.strip().split("\n")[0].strip()
    start = next((i for i, t in enumerate(lines) if near_fn and near_fn in t and ("fn " in t or "def " in t or "function" in t or "(" in t)), 0)
    for i in range(start, len(lines)):
        if lines[i].strip() == first:
            return i + 1
    for i, t in enumerate(lines):
        if t.strip() == first:
            return i + 1
    return -1


def claude(cwd: Path, prompt: str, model: str, resume: str | None) -> tuple[list, str | None]:
    cmd = ["claude", "-p", "--setting-sources", "project,local", "--model", model, "--output-format", "stream-json", "--verbose"]
    cmd += ["--allowedTools", *ALLOWED, "--disallowedTools", *DISALLOWED, "--max-budget-usd", "2"]
    if resume:
        cmd += ["--resume", resume]
    cmd.append(prompt)
    res = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=1200)
    events = []
    sid = None
    for line in res.stdout.splitlines():
        try:
            ev = json.loads(line)
        except json.JSONDecodeError:
            continue
        events.append(ev)
        sid = ev.get("session_id") or sid
    return events, sid


def run_one(site: dict, arm: str, arms_dir: Path, out: Path, model: str, rep: int) -> str:
    dest = out / f"{site['id']}__{arm}__r{rep}.json"
    if dest.exists():
        return f"skip {dest.name}"
    root = arms_dir / "original" / site["repo"] if arm == "original" else arms_dir / arm / site["id"]
    line = locate(root, site["file"], site["anchor"], site.get("function", ""))
    ev1, sid = claude(root, P1.format(function=site["function"], file=site["file"]), model, None)
    ev2a, _ = claude(root, P2A.format(file=site["file"], line=line, anchor=site["anchor"]), model, sid) if sid else ([], None)
    ev2b, _ = claude(root, P2.format(edit=site["breaking_edit"]), model, sid) if sid else ([], None)
    dest.write_text(json.dumps({"site": site["id"], "arm": arm, "rep": rep, "line": line, "turn1": ev1, "turn2a": ev2a, "turn2b": ev2b}))
    return f"done {dest.name} (line {line})"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sites", required=True)
    ap.add_argument("--arms-dir", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--arms", default="original,rules,pointer,oneline,deleted")
    ap.add_argument("--only", default="")
    ap.add_argument("--model", default="sonnet")
    ap.add_argument("--rep", type=int, default=1)
    ap.add_argument("-j", type=int, default=6)
    a = ap.parse_args()
    sites = json.loads(Path(a.sites).read_text())
    if a.only:
        keep = set(a.only.split(","))
        sites = [s for s in sites if s["id"] in keep]
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    def wants(s, arm):
        if arm in ("rules", "pointer", "oneline"):
            return bool(s.get("pooled"))
        if arm == "history":
            return s.get("stratum") == "A"
        return True

    sites = [s for s in sites if s.get("pooled") or s.get("extra_b") or s.get("stratum") == "C"]
    jobs = [(s, arm, r) for r in range(1, a.rep + 1) for s in sites for arm in a.arms.split(",") if wants(s, arm)]
    with cf.ThreadPoolExecutor(a.j) as ex:
        futs = [ex.submit(run_one, s, arm, Path(a.arms_dir), out, a.model, r) for s, arm, r in jobs]
        for f in cf.as_completed(futs):
            try:
                print(f.result(), flush=True)
            except Exception as e:  # noqa: BLE001
                print("ERROR", e, flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())

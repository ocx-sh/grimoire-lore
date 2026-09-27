#!/usr/bin/env python3
"""Bake author-plan.json into nix-author.template.mjs.

Usage: mkauthor.py <date> <part: all|rules|standalone> <out.mjs>
The part switch splits one plan into workflows under the session's agent cap.
"""
import json
import sys
from pathlib import Path

date, part, out = sys.argv[1:4]
here = Path(__file__).parent
root = "/home/mherwig/dev/grimoire-lore/.agents/worktrees/nix"
plan = json.loads((here / "author-plan.json").read_text().replace("__ROOT__", root))
if part == "rules":
    plan["standalone"] = []
elif part == "standalone":
    plan["rules"] = []
tpl = (here / "nix-author.template.mjs").read_text()
Path(out).write_text(tpl.replace("__DATE__", date).replace("__PLAN__", json.dumps(plan, indent=1)))
n = sum(len(r["depth"]) for r in plan["rules"])
print(f"wrote {out}: {len(plan['rules'])} rules, {n} depth, {len(plan['standalone'])} standalone")

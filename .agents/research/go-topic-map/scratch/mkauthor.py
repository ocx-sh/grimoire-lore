#!/usr/bin/env python3
"""Bake author-plan.json into go-author.template.mjs.

Usage: mkauthor.py <date> <go-modules-globs.json> <out.mjs>
"""
import json
import sys
from pathlib import Path

date, globs, out = sys.argv[1:4]
here = Path(__file__).parent
root = "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go"
plan = json.loads((here / "author-plan.json").read_text().replace("__ROOT__", root))
for rule in plan["rules"]:
    if rule["glob_list"] == "__GO_MODULES_GLOBS__":
        rule["glob_list"] = json.loads(Path(globs).read_text())
tpl = (here / "go-author.template.mjs").read_text()
Path(out).write_text(tpl.replace("__DATE__", date).replace("__PLAN__", json.dumps(plan, indent=1)))
n = sum(len(r["depth"]) for r in plan["rules"])
print(f"wrote {out}: {len(plan['rules'])} rules, {n} depth, {len(plan['standalone'])} standalone")

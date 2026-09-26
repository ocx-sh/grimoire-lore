#!/usr/bin/env python3
"""Bake review findings into go-fix.template.mjs: one fixer per file.

Usage: mkfix.py <review-receipt.json> <out.mjs>
Opus for a file with a blocker, sonnet otherwise. Nits are applied only when style.
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

rec, out = sys.argv[1:3]
root = "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go"
d = json.loads(Path(rec).read_text())
by = defaultdict(list)
for f in d["findings"]:
    if f["severity"] == "nit" and f["kind"] != "style":
        continue
    p = f["file"] if f["file"].startswith("/") else f"{root}/{f['file']}"
    by[p].append(f)
files = []
for p, fs in sorted(by.items()):
    rel = p[len(root) + 1:]
    if rel.startswith("rules/"):
        parts = rel.split("/")
        target = f"{root}/rules/{parts[1].removesuffix('.md')}.md"
    elif rel.startswith("skills/"):
        target = f"{root}/skills/{rel.split('/')[1]}"
    else:
        target = p
    files.append({"file": p, "model": "opus" if any(f["severity"] == "blocker" for f in fs) else "sonnet", "checker_target": target, "findings": fs})
tpl = (Path(__file__).parent / "go-fix.template.mjs").read_text()
Path(out).write_text(tpl.replace("__FILES__", json.dumps(files, indent=1)))
print(f"wrote {out}: {len(files)} files, {sum(len(f['findings']) for f in files)} findings, opus={sum(f['model']=='opus' for f in files)}")

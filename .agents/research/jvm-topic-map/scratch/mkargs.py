#!/usr/bin/env python3
"""Build the `args` JSON for jvm-dive-wave.mjs from a map (or dive-wave) task output.

usage: mkargs.py <map-task-output.json> <wave> <date> [wave2|wave3_staged] > args.json

already_covered / existing_groups are derived from the jvm-<group>.md files that
exist on disk, so a re-run after a partial wave stays honest.
"""
import glob
import json
import os
import re
import sys

RESEARCH = '/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake/.agents/research'

raw = open(sys.argv[1]).read()
j = json.loads(raw[raw.index('{'):raw.rindex('}') + 1])
r = j.get('result', j)
if isinstance(r, str):
    r = json.loads(r)
m = r.get('map', r)
key = sys.argv[4] if len(sys.argv) > 4 else 'wave2'
selection = m[key]

existing = []
covered = []
for path in sorted(glob.glob(f'{RESEARCH}/jvm-*.md')):
    name = os.path.basename(path)[4:-3]
    if name in ('frame', 'topic-map'):
        continue
    existing.append(name)
    text = open(path).read()
    fam = re.search(r'^id_family:\s*(\S+)', text, re.M)
    title = re.search(r'^title:\s*(.+)$', text, re.M)
    covered.append(f"jvm-{name}.md — {title.group(1).strip() if title else name}"
                   f"{' (family ' + fam.group(1) + ')' if fam else ''}")

print(json.dumps({
    'wave': int(sys.argv[2]),
    'date': sys.argv[3],
    'selection': selection,
    'already_covered': covered,
    'existing_groups': existing,
}, indent=1))

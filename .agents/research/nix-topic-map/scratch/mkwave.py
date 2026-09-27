#!/usr/bin/env python3
"""Bake a wave selection into nix-dive-wave.template.mjs.

Usage: mkwave.py <wave> <date> <selection.json> <already.json> <existing-groups-csv> <out.mjs>
selection.json: list of {group, group_label, id_family, slug, label, brief}
already.json: list of strings (consolidations already on disk, with their families)
"""
import json
import sys
from pathlib import Path

wave, date, sel, already, existing, out = sys.argv[1:7]
here = Path(__file__).parent
tpl = (here / "nix-dive-wave.template.mjs").read_text()
selection = json.loads(Path(sel).read_text())
for item in selection:
    missing = {"group", "group_label", "id_family", "slug", "label", "brief"} - item.keys()
    if missing:
        sys.exit(f"selection item {item.get('slug')} missing {missing}")
groups = [g for g in existing.split(",") if g]
src = (
    tpl.replace("__WAVE__", str(int(wave)))
    .replace("__DATE__", date)
    .replace("__SELECTION__", json.dumps(selection, indent=1))
    .replace("__ALREADY__", json.dumps(json.loads(Path(already).read_text())))
    .replace("__EXISTING__", json.dumps(groups))
)
Path(out).write_text(src)
print(f"wrote {out}: {len(selection)} dives, {len({i['group'] for i in selection})} groups, existing={groups}")

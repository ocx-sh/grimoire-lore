#!/usr/bin/env python3
"""Bake a wave receipt into go-harvest.template.mjs.

Usage: mkharvest.py <wave> <date> <receipt.json> <staged.json> <on-disk-groups-csv> <out.mjs>
receipt.json: the dive-wave workflow's return value (groups, surprises, needs_another_round, must_count)
staged.json: list of staged selection items (may be [])
"""
import json
import sys
from pathlib import Path

wave, date, receipt, staged, on_disk, out = sys.argv[1:7]
tpl = (Path(__file__).parent / "go-harvest.template.mjs").read_text()
src = (
    tpl.replace("__WAVE__", str(int(wave)))
    .replace("__DATE__", date)
    .replace("__RECEIPT__", json.dumps(json.loads(Path(receipt).read_text())))
    .replace("__STAGED__", json.dumps(json.loads(Path(staged).read_text())))
    .replace("__ON_DISK__", json.dumps([g for g in on_disk.split(",") if g]))
)
Path(out).write_text(src)
print(f"wrote {out}")

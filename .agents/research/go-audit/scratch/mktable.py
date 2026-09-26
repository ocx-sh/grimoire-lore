#!/usr/bin/env python3
"""Emit a markdown table: repo | LOC | metric1 (per10k) | metric2 (per10k) | ...
Usage: python3 mktable.py loc pattern1 pattern2 ... [--sort pattern1]
Reads results.tsv / loc_summary.tsv in this dir.
"""
import sys, collections

ROOT = "/home/mherwig/dev/grimoire-lore/.agents/worktrees/go/.agents/research/go-audit/scratch"
loc = {}
with open(ROOT + "/loc_summary.tsv") as f:
    next(f)
    for line in f:
        r, l = line.rstrip("\n").split("\t")
        if r != "TOTAL":
            loc[r] = int(l)

counts = collections.defaultdict(dict)  # pattern -> repo -> (count, per10k)
with open(ROOT + "/results.tsv") as f:
    next(f)
    for line in f:
        p, r, c, fh, l, per10k = line.rstrip("\n").split("\t")
        counts[p][r] = (int(c), float(per10k))

args = sys.argv[1:]
sortkey = None
if "--sort" in args:
    i = args.index("--sort")
    sortkey = args[i + 1]
    args = args[:i]
patterns = args

repos = sorted(loc, key=lambda r: -loc[r] if sortkey is None else 0)
if sortkey:
    repos = sorted(loc, key=lambda r: -counts[sortkey].get(r, (0, 0))[1])

header = "| repo | LOC |" + "".join(f" {p} (n/10k) |" for p in patterns)
sep = "|---|---|" + "---|" * (len(patterns) * 1)
print(header)
print(sep)
tot_c = {p: 0 for p in patterns}
for r in repos:
    cells = []
    for p in patterns:
        c, per10k = counts[p].get(r, (0, 0.0))
        tot_c[p] += c
        cells.append(f"{c} ({per10k:g})")
    print(f"| {r} | {loc[r]:,} |" + "".join(f" {c} |" for c in cells))
totalloc = sum(loc.values())
totrow = "| **TOTAL** | **{:,}** |".format(totalloc)
for p in patterns:
    c = tot_c[p]
    per10k = round(c * 10000 / totalloc, 3)
    totrow += f" **{c} ({per10k:g})** |"
print(totrow)

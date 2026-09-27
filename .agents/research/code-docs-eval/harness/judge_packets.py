#!/usr/bin/env python3
"""Build blind judge packets: one per site, holding every probe for it under a shuffled anonymous id.

Each packet carries the site's ground truth, the original guarded code (from the original arm),
and per probe the turn-1 rewrite, the unled 2a answer, the led 2b answer and the stores touched.
The arm label never enters a packet; key.json maps anonymous ids back to (site, arm, rep).

Usage: judge_packets.py --probes extracted.json --sites sites.json --out DIR [--seed 11]
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

DEV = Path("/home/mherwig/dev")


def excerpt(site: dict, before: int = 5, after: int = 60) -> str:
    lines = (DEV / site["repo"] / site["file"]).read_text(encoding="utf-8").split("\n")
    lo = max(0, site["comment_start"] - 1 - before)
    hi = min(len(lines), site["comment_end"] + after)
    return "\n".join(f"{i + 1:5d}  {lines[i]}" for i in range(lo, hi))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--probes", required=True)
    ap.add_argument("--sites", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--seed", type=int, default=11)
    a = ap.parse_args()
    probes = json.loads(Path(a.probes).read_text())
    sites = {s["id"]: s for s in json.loads(Path(a.sites).read_text())}
    rng = random.Random(a.seed)
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    key = {}
    by_site: dict[str, list] = {}
    for p in probes:
        by_site.setdefault(p["site"], []).append(p)
    for sid, ps in sorted(by_site.items()):
        s = sites[sid]
        rng.shuffle(ps)
        items = []
        for n, p in enumerate(ps):
            pid = f"{sid}-P{n + 1:02d}"
            key[pid] = {"site": sid, "arm": p["arm"], "rep": p["rep"]}
            items.append(
                {
                    "probe": pid,
                    "turn1_rewrite": p["rewrite"][:12000],
                    "turn2a_unled_answer": p["answer_unled"][:4000],
                    "turn2b_led_answer": p["answer_led"][:3000],
                    "stores_touched": sorted({t["store"] for t in p["touch1"] + p["touch2"]}),
                }
            )
        packet = {
            "site": sid,
            "kind": "control" if s["stratum"] == "C" else "guard",
            "repo": s["repo"],
            "file": s["file"],
            "function": s["function"],
            "anchor": s["anchor"],
            "ground_truth": s["ground_truth"],
            "consequence": s["consequence"],
            "breaking_edit": s["breaking_edit"],
            "original_code_with_comment": excerpt(s),
            "probes": items,
        }
        (out / f"{sid}.json").write_text(json.dumps(packet, indent=1))
    (out / "key.json").write_text(json.dumps(key, indent=1))
    print(f"{len(by_site)} packets, {len(key)} probes -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

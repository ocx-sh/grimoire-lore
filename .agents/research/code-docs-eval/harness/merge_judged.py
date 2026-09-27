#!/usr/bin/env python3
"""Merge judge passes into judged.json and report inter-judge agreement (EVL-05, EVL-06).

Consensus per probe: passes agree -> that grade; recovery differs by one -> the lower; survival
or recovery differs by more -> pass 'c' (tie-break) when present, else the lower grade, and the
probe is listed as escalated.

Usage: merge_judged.py --judged DIR --key key.json --probes extracted.json --out judged.json [--passes a,b] [--compare a,x]
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

SURV = {"broken": 0, "untouched": 1, "kept": 2, "n/a": -1}


def kappa(pairs, levels, weighted=False):
    n = len(pairs)
    if not n:
        return None
    idx = {lv: i for i, lv in enumerate(levels)}
    k = len(levels)
    obs = [[0] * k for _ in range(k)]
    for x, y in pairs:
        obs[idx[x]][idx[y]] += 1
    rows = [sum(r) for r in obs]
    cols = [sum(obs[i][j] for i in range(k)) for j in range(k)]
    w = (lambda i, j: ((i - j) ** 2) / ((k - 1) ** 2)) if weighted else (lambda i, j: 0.0 if i == j else 1.0)
    po = sum(w(i, j) * obs[i][j] for i in range(k) for j in range(k)) / n
    pe = sum(w(i, j) * rows[i] * cols[j] for i in range(k) for j in range(k)) / (n * n)
    return round(1 - po / pe, 3) if pe else 1.0


def load(dirp: Path, pass_: str) -> dict:
    out = {}
    for f in dirp.glob(f"*.{pass_}.json"):
        for g in json.loads(f.read_text()):
            out[g["probe"]] = g
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--judged", required=True)
    ap.add_argument("--key", required=True)
    ap.add_argument("--probes", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--passes", default="a,b")
    ap.add_argument("--compare", default="")
    a = ap.parse_args()
    key = json.loads(Path(a.key).read_text())
    probes = {(p["site"], p["arm"], p["rep"]): p for p in json.loads(Path(a.probes).read_text())}
    d = Path(a.judged)
    p1, p2 = (load(d, x) for x in a.passes.split(","))
    tie = load(d, "c")
    rows, escalated = [], []
    for pid, k in key.items():
        g1, g2 = p1.get(pid), p2.get(pid)
        if not g1 or not g2:
            continue
        sd = abs(SURV[g1["survival"]] - SURV[g2["survival"]])
        rd = abs(int(g1["recovery"]) - int(g2["recovery"]))
        if sd == 0 and rd == 0:
            g = g1
        elif sd <= 1 and rd <= 1:
            g = min((g1, g2), key=lambda x: (SURV[x["survival"]], int(x["recovery"])))
        else:
            escalated.append(pid)
            g = tie.get(pid) or min((g1, g2), key=lambda x: (SURV[x["survival"]], int(x["recovery"])))
        p = probes.get((k["site"], k["arm"], k["rep"]), {})
        rows.append(
            {
                **k,
                "probe": pid,
                "survival": g["survival"],
                "recovery": int(g["recovery"]),
                "invented": bool(g.get("invented")),
                "led_correct": bool(g.get("led_correct")),
                "confabulated": bool(g.get("confabulated")),
                "evidence": g.get("evidence"),
                "touch_stores": sorted({t["store"] for t in p.get("touch1", []) + p.get("touch2", [])}),
                "usd": p.get("usd"),
            }
        )
    Path(a.out).write_text(json.dumps(rows, indent=1))
    report = {"probes": len(rows), "escalated": len(escalated), "escalated_ids": escalated}
    pairs = [(p1[x], p2[x]) for x in key if x in p1 and x in p2]
    report["ab_survival_kappa"] = kappa([(x["survival"], y["survival"]) for x, y in pairs if x["survival"] != "n/a" and y["survival"] != "n/a"], ["broken", "untouched", "kept"])
    report["ab_recovery_qwk"] = kappa([(int(x["recovery"]), int(y["recovery"])) for x, y in pairs], [0, 1, 2, 3], weighted=True)
    if a.compare:
        c1, c2 = (load(d, x) for x in a.compare.split(","))
        cp = [(c1[x], c2[x]) for x in key if x in c1 and x in c2]
        report["compare"] = a.compare
        report["cmp_n"] = len(cp)
        report["cmp_survival_kappa"] = kappa([(x["survival"], y["survival"]) for x, y in cp if "n/a" not in (x["survival"], y["survival"])], ["broken", "untouched", "kept"])
        report["cmp_recovery_qwk"] = kappa([(int(x["recovery"]), int(y["recovery"])) for x, y in cp], [0, 1, 2, 3], weighted=True)
        report["cmp_recovery_ge2_agree"] = round(sum((int(x["recovery"]) >= 2) == (int(y["recovery"]) >= 2) for x, y in cp) / max(1, len(cp)), 3)
    report["survival_counts"] = Counter(r["survival"] for r in rows)
    print(json.dumps(report, indent=1, default=dict))
    return 0


if __name__ == "__main__":
    sys.exit(main())

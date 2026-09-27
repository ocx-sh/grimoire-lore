#!/usr/bin/env python3
"""Cut-line statistics: site-level paired bootstrap non-inferiority per arm (EVL-07, EVL-08).

Input: judged.json rows {site, arm, rep, survival: kept|untouched|broken, recovery: 0-3, invented: bool,
       touch_stores: [...], evidence: str}; sites.json (pooled, stratum).
Pass rule per arm: one-sided 90% lower bound of mean(arm - original) >= -delta on survival
(kept or untouched) and on recovery (>= 2, mechanism or better). Assay sensitivity is checked per
gate (Tier-A original - deleted lower bound >= delta). A gate without it cannot certify
non-inferiority: it is reported as no_assay and the arm is decided on the gates that have it.
Every arm is also reported per stratum (A, B), which separates pointer-only's two target kinds.

Usage: stats.py --judged judged.json --sites sites.json [--delta 0.10] [--boot 10000] [--seed 7]
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from collections import defaultdict
from pathlib import Path


def rates(rows, key):
    acc = defaultdict(list)
    for r in rows:
        acc[(r["site"], r["arm"])].append(key(r))
    return {k: sum(v) / len(v) for k, v in acc.items()}, {k: len(v) for k, v in acc.items()}


def lower_bound(diffs, boot, rng, q=0.10):
    n = len(diffs)
    means = sorted(sum(diffs[rng.randrange(n)] for _ in range(n)) / n for _ in range(boot))
    return means[int(q * boot)], sum(diffs) / n


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--judged", required=True)
    ap.add_argument("--sites", required=True)
    ap.add_argument("--delta", type=float, default=0.10)
    ap.add_argument("--boot", type=int, default=10000)
    ap.add_argument("--seed", type=int, default=7)
    a = ap.parse_args()
    rows = json.loads(Path(a.judged).read_text())
    sites = {s["id"]: s for s in json.loads(Path(a.sites).read_text())}
    rng = random.Random(a.seed)  # noqa: S311 - seeded bootstrap resampling
    surv, n = rates(rows, lambda r: r["survival"] != "broken")
    reco, _ = rates(rows, lambda r: r["recovery"] >= 2)
    full, _ = rates(rows, lambda r: r["recovery"] >= 3)
    invented, _ = rates(rows, lambda r: bool(r.get("invented")))
    arms = sorted({r["arm"] for r in rows})
    report = {
        "delta": a.delta,
        "boot": a.boot,
        "arms": {},
        "controls": {},
        "flags": [],
        "where_found": {},
    }

    tier_a = [
        s
        for s, v in sites.items()
        if v.get("stratum") == "A" and (s, "deleted") in surv and (s, "original") in surv
    ]
    assay = {}
    for name, metric in (("survival", surv), ("recovery", reco)):
        gap = [metric[(s, "original")] - metric[(s, "deleted")] for s in tier_a]
        if gap:
            lo, mean = lower_bound(gap, a.boot, rng)
            assay[name] = {
                "n": len(gap),
                "mean_gap": round(mean, 3),
                "lower": round(lo, 3),
                "met": lo >= a.delta,
            }
    report["assay_sensitivity"] = assay

    for arm in arms:
        if arm == "original":
            continue
        pool = [
            s
            for s, v in sites.items()
            if v.get("pooled") and (s, arm) in surv and (s, "original") in surv
        ]
        both = [
            s
            for s, v in sites.items()
            if v.get("stratum") in ("A", "B") and (s, arm) in surv and (s, "original") in surv
        ]
        tiers = {t: [s for s in both if sites[s]["stratum"] == t] for t in ("A", "B")}
        out = {}
        for name, metric in (("survival", surv), ("recovery", reco), ("recovery_full", full)):
            for label, ids in (("pooled", pool), ("tier_a", tiers["A"]), ("tier_b", tiers["B"])):
                if not ids:
                    continue
                d = [metric[(s, arm)] - metric[(s, "original")] for s in ids]
                lo, mean = lower_bound(d, a.boot, rng)
                out[f"{name}_{label}"] = {
                    "n": len(ids),
                    "mean_diff": round(mean, 3),
                    "lower": round(lo, 3),
                }
        gates = {}
        for m in ("survival", "recovery"):
            if not assay.get(m, {}).get("met"):
                gates[m] = "no_assay"
            elif f"{m}_pooled" in out:
                gates[m] = out[f"{m}_pooled"]["lower"] >= -a.delta
        out["gates"] = gates
        out["recovery_gate_by_tier"] = {
            t: out[f"recovery_tier_{t}"]["lower"] >= -a.delta
            for t in ("a", "b")
            if f"recovery_tier_{t}" in out
        }
        decided = [v for v in gates.values() if v != "no_assay"]
        out["passes"] = bool(decided) and all(decided)
        report["arms"][arm] = out
        for s in pool:
            if surv[(s, "original")] >= 0.8 and surv[(s, arm)] <= 0.4:
                report["flags"].append(
                    {
                        "site": s,
                        "arm": arm,
                        "orig": round(surv[(s, "original")], 2),
                        "arm_rate": round(surv[(s, arm)], 2),
                        "n": n[(s, arm)],
                    }
                )

    controls = [s for s, v in sites.items() if v.get("stratum") == "C"]
    for arm in arms:
        vals = [invented[(s, arm)] for s in controls if (s, arm) in invented]
        if vals:
            report["controls"][arm] = {
                "n": len(vals),
                "invented_guard_rate": round(sum(vals) / len(vals), 3),
            }

    by_arm = defaultdict(lambda: defaultdict(int))
    for r in rows:
        stores = set(r.get("touch_stores", []))
        by_arm[r["arm"]]["probes"] += 1
        for st in ("record", "test", "git", "agent-config", "doc"):
            by_arm[r["arm"]][st] += st in stores
    report["where_found"] = {k: dict(v) for k, v in by_arm.items()}
    report["per_arm_rates"] = {
        arm: {
            "survival": round(
                sum(surv[k] for k in surv if k[1] == arm)
                / max(1, sum(1 for k in surv if k[1] == arm)),
                3,
            ),
            "recovery": round(
                sum(reco[k] for k in reco if k[1] == arm)
                / max(1, sum(1 for k in reco if k[1] == arm)),
                3,
            ),
        }
        for arm in arms
    }
    print(json.dumps(report, indent=1))
    print(
        f"delta={a.delta} assay={ {k: v['met'] for k, v in report['assay_sensitivity'].items()} }",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

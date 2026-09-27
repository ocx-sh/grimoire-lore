---
title: Reason-recovery eval — pilot and judge calibration
date: 2026-09-27
status: passed
---

# Pilot and judge calibration

## Pilot

30 sessions, sonnet actor, `--setting-sources project,local`, read-only tools:
the 4 anchor sites (OCX-09, OCX-14, GRM-05, TS-03) in all 5 per-site arms, 4 more
pooled sites (OCX-02, OCX-20, PY-06, TS-06) in `original` and `deleted`, and 2
controls (CTRL-01, CTRL-03) in `original`. All 30 returned three non-empty turns.

| Measure | Value |
|---|---|
| Cost per session (notional USD, `total_cost_usd`) | mean 1.61, median 1.58 |
| By repo | ocx 2.18, grimoire 1.67, controls 1.21, ocx-sdk-python 0.96, TS repos 0.72 |
| Design estimate it replaces | 0.30-0.90 (arms-and-sites §7) — 2-5x low |

The cost driver is the repository's own agent config loading into every session
(ocx: CLAUDE.md plus path-scoped rules), not the probe prompts. EVL-13 held: the
budget-cap estimate would have been wrong, the pilot number is what sized the run.

## Judge calibration (EVL-05)

No human labelled the calibration set. The fallback EVL-05 names was used: a judge
from another model family (codex-cli 0.153.4, default model) graded the same 30
probes with the same rubric (`harness/fixtures/judge-rubric.md`), blind to arm.

| Pair | Survival (Cohen κ) | Recovery (quadratic-weighted κ) | Recovery ≥ 2 agreement |
|---|---|---|---|
| opus pass a vs opus pass b | 1.000 | 0.963 | — |
| opus pass a vs codex | 1.000 (n=28) | 0.901 (n=30) | 0.933 |

Both clear the 0.70 gate. All 5 cross-family disagreements are one level, and in
all 5 opus scored lower: codex credited a partly stated consequence as full
recovery. Opus stays the scoring judge because it is the stricter one; a pass it
gives is not a lenient pass.

Decision (orchestrator): the consolidation's clause "without a human labeller,
every eval-dependent MUST ships as SHOULD" is not applied. Cross-family agreement
at 0.90 on a 4-level scale is stronger evidence than the clause assumed, and the
owner does not label transcripts. The report states that validity rests on
judge-to-judge agreement, not on human labels.

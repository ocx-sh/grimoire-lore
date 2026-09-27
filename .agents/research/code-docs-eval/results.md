---
title: Reason-recovery eval — main run results and cut line
date: 2026-09-27
status: final
---

# Main run results

**Verdict.** The cut line sits at the `rules` rewrite: every guard kept as
constraint plus consequence at its line, everything else routed out. It halved
the guard comments (443 lines to 209 at 25 sites) and lost no reason recovery.
Four other ways to shorten lose the reason:
- deleting the text;
- truncating it to its first line;
- replacing it with a pointer to a record;
- relying on a test alone.

Only one shorter form holds: one line naming a test proven to fail on the
breaking edit.

## Run

| Item | Value |
|---|---|
| Actor | sonnet, `claude -p --setting-sources project,local`, read-only tools; three turns (P1 simplify, P2A unled, P2B led) |
| Sites | 25 pooled mechanism sites (12 Tier A, 13 Tier B), 11 extra Tier-B sites, 8 controls |
| Probes | 401: `original` 113, `deleted` 113, `rules` 75, `pointer` 50, `history` 24, `oneline` 26 |
| Reps | 3 per pooled site in the core arms, 2 in extra Tier B and `oneline` |
| Cost | 489 notional USD for the actor (`total_cost_usd`), about 5.6M subagent tokens for the judge |
| Judge | opus, blind to arm, two passes; calibrated against codex (QWK 0.90, [calibration](calibration.md)) |
| Judge agreement | survival κ 0.86 / 1.00, recovery QWK 0.94 / 0.99 (batch 1 / batch 2); 0 escalations |

Data: `results/judged.json` (401 rows), `results/stats.json`,
`harness/stats.py --judged results/judged.json --sites harness/sites.json`.

## Assay sensitivity (EVL-07, revised)

| Gate | Tier-A `original` − `deleted` | Lower bound (90%) | Met |
|---|---|---|---|
| Survival (kept or untouched) | 0.00 | 0.00 | no |
| Recovery (mechanism or better) | 0.31 | 0.19 | yes |

Survival sat at the ceiling. With the comment deleted, sonnet kept or left
every Tier-A guard. Only OCX-09 broke, 3 times in `original` and twice in
`deleted`, so the comment did not cause the break. Under the P1 task, the feared
failure ("simplifies away a guard") did not happen in any arm. Survival can
only be reported as "no observed harm". The verdicts below rest on recovery,
which has assay sensitivity. EVL-07 was revised to check assay per gate.

## Arms

Paired site-level bootstrap, arm minus `original`, one-sided 90% lower bound,
δ = 0.10. Recovery ≥ 2 is the gate; full recovery (mechanism plus consequence)
is secondary.

| Arm | Sites | Recovery ≥ 2: diff [lower] | Full recovery: diff [lower] | Survival | Verdict | Rule it settles |
|---|---|---|---|---|---|---|
| `rules` | 25 | +0.07 [0.00] | +0.08 [+0.03] | no harm | **pass**, both tiers | GRD-02 → MUST, GRD-01 evidence |
| `pointer`, Tier B (one line naming the test) | 13 | +0.15 [−0.04] | −0.04 [−0.22] | no harm | **pass** on the gate; consequence inconclusive | GRD-08 stays SHOULD |
| `pointer`, Tier A (pointer to a record holding the reason) | 12 | −0.13 [−0.25] | −0.18 [−0.31] | no harm | **fail** | a guard never shrinks to a bare record pointer (GRD-01) |
| `oneline` (first line kept) | 13 | −0.15 [−0.32] | −0.21 [−0.36] | no harm | **fail** | LEN-05: never truncate → MUST |
| `deleted`, Tier B (test owns the guard) | 24 | −0.10 [−0.19] | −0.20 [−0.31] | no harm | **fail** | RTE-03's local line → MUST |
| `deleted`, Tier A | 12 | −0.31 [−0.42] | −0.39 [−0.53] | no harm | **fail** (assay control) | — |
| `history` (deleted, history redacted) | 12 | −0.38 [−0.54] | −0.43 [−0.61] | no harm | **fail** | RTE-02 evidence |

- **No concentrated harm.** EVL-08 raised no flags. No `rules` site lost a
  third or more of its recovery.
- **Controls.** No invented guard in 32 control sessions, in `original` or
  `deleted`.

## Where agents looked (unled turn)

| Arm | Sessions | Opened a record | Opened a test | Ran git history |
|---|---|---|---|---|
| `original` | 113 | 0 | 3 | 0 |
| `deleted` | 113 | 1 | 13 | 3 |
| `pointer` | 50 | 17 | 4 | 0 |
| `history` | 24 | 0 | 1 | 0 |

H5 holds: cold agents do not go to git or to records unprompted. Given a pointer,
they opened the record in 17 of 50 sessions, and recovery still fell. H4 holds
for the reason, not the guard: the reason survives as a local constraint plus
consequence, or as one line naming a proven test. A record pointer alone is not
enough. Guard survival never depended on the comment in this setup.

## The led question proves nothing

In all 272 guard sessions outside `original`, the led turn (which names the
breaking edit) answered "keep". That includes every `deleted` and `history`
session. Of the sessions that failed the unled turn, 86% then stated the right
reason once led. A re-check that asks only the led question passes a
deleted guard. This backs CLN-06's unled-first order and EVL-03.

## Caveats

- **One actor model.** Sonnet only. A weaker actor may break guards the
  comment would have saved. The survival ceiling is a property of this actor
  and this task, not a proof that comments never save a guard.
- **No human labels.** The judge is calibrated against a second model family,
  not a human (EVL-05 fallback). The frame's "no human, MUSTs ship as SHOULD"
  clause was not applied: two families agree at QWK 0.90, and opus was the
  stricter one.
- **Anchor lines.** OCX-10 and CTRL-03, -05, -06 and -07 were prompted with
  "near line -1". Their anchor is a substring of the code line, not a whole
  line. The anchor text was still given verbatim, and the flaw hits every arm
  of those sites alike, so paired differences stand.
- **Arm build.** The `rules` arm is the frozen output of the procedure's
  first version (`harness/fixtures/procedure-v0.md`), rewritten by opus, not
  by the shipped skill end to end.
- **Low power in places.** The pointer target-kind splits and `oneline` rest on
  12-13 sites. Their full-recovery bounds are wide.

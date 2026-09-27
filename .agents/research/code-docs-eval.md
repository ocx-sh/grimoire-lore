---
title: code-docs reason-recovery eval: arms, sites, rubric, statistic
topic: eval
model: claude-opus-5-5
consolidates:
  - .agents/research/code-docs-eval/eval-arms-and-sites.md
  - .agents/research/code-docs-eval/eval-scoring.md
date: 2026-09-27
---

# code-docs reason-recovery eval: arms, sites, rubric, statistic

Paths are relative to the worktree `/home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs`
unless absolute. Fleet paths are written `repo:path:line` under `/home/mherwig/dev`.
Everything below was researched or re-measured on 2026-09-27.

Contents: [Verdict](#verdict) · [The ruleset](#the-ruleset) ·
[Applied to the fleet](#applied-to-the-fleet) · [AI-agent failure modes](#ai-agent-failure-modes) ·
[Decisions for the eval](#decisions-for-the-eval) · [Open questions](#open-questions) ·
[Sub-artifacts](#sub-artifacts) · [Key sources](#key-sources)

## Verdict

1. **Arms: six, not eight or five.** `original`, `rules`, `oneline`, `pointer-only`, `deleted` and, on Tier-A sites only, `history`. `rules` is the cleanup skill's own output under guard-shape's `GUARD:` fact-plus-consequence form. It is generated once, frozen, and never hand-edited. That merges arms-and-sites' separate `marker` and `pointer` arms. The site-scoped `deleted` arm replaces the file-wide `stripped` arm. No rule proposes a file-wide strip, and `deleted` doubles as the assay-sensitivity control.
2. **Each arm settles one candidate rule.** The eval returns one verdict per arm, and each verdict is tied to one rule. The frame's single "most aggressive arm" does not survive, because `deleted`, `pointer-only` and `rules` test different channels, not points on one axis.
3. **Sites should match the population the cut edits.** Fleet guards over 10 lines hold 69.5% of guard lines, and the eval pool has only 2 of 20 sites in that band. Arms-and-sites wanted to fill the 1-2-line cell first. This group fills the over-10 cell first instead. PY-02 leaves the pooled statistic because no arm can remove its reason. Controls become in-function fleet blocks, each with a verified safe code edit.
4. **Score from the unled turn.** The unled turn 2a is scored. The led question runs every time as turn 2b, but only as a confabulation gate. Turn 2a must not presuppose that something breaks.
5. **Statistic.** Use a site-level paired bootstrap non-inferiority test, one-sided 90%, with margin **δ = 10 points**. It applies to guard survival **and** to reason recovery, both against `original`. The eval counts only if Tier-A `original` minus `deleted` clears δ (assay sensitivity). Eval-scoring's δ = 5 is rejected. By simulation it passes a harmless arm only 62-67% of the time at the affordable budget, which pushes the verdict to "no cut" by design. Its absolute 70% recovery floor is replaced by the paired test.
6. **Git channel: keep it.** Build `history` with `git-filter-repo` content redaction across **every historical path** of the site file. Verify it with an unfiltered `git`. Arms-and-sites' "verified zero-leak" is void on two counts:
   - Every sampled ocx site file was renamed out of `crates/ocx_lib`, and OCX-09's comment survives 5 times under the old path.
   - In this environment a hooked `git log` returns 50 lines where `/usr/bin/git` returns 6,112,328, so `grep -c` prints 0 on a repo that was never redacted.

## The ruleset

Scope: any eval that measures whether a cold agent keeps a guard and recovers its reason after a
comment cut. Placeholders in commands are shell variables set once, for example
`SITES=.agents/research/code-docs-eval/harness/sites.json`, `OUT=.agents/research/code-docs-eval/out`,
`RESULTS=.agents/research/code-docs-eval/results`.

### EVL-01 — Freeze every rewritten arm

- **Rule:** Build every rewritten arm from a committed fixture applied by span substitution. For `rules`, the fixture holds the cleanup skill's unedited output with the rule version it ran against. Never call a model inside the arm builder.
- **Rationale:** An arm regenerated per run never reproduces. `build_arms.py:8-9` leaves `rules` and `pointer` to "agents later". A hand-fixed rewrite measures the reviewer, not the rule ([arms-and-sites §1](code-docs-eval/eval-arms-and-sites.md#1-the-harnesss-two-non-reproducible-arms)).
- **Verification:** the first command prints nothing; the second prints one hit.
  ```sh
  grep -rn --include="build_arms.py" -e "anthropic" -e "claude -p" -e '"claude"' .agents/research/code-docs-eval/harness/
  grep -rn --include="site-rewrites.json" -e '"rule_version"' .agents/research/code-docs-eval/harness/fixtures/
  ```
- **Severity:** MUST · **Portability:** portable

### EVL-02 — Isolate each per-site arm to its own comment span and snapshot

- **Rule:** Every site record carries these fields:
  - a comment span (`comment_start`, `comment_end`) kept apart from the function span;
  - a code-only `anchor`;
  - `function`, `ground_truth`, `consequence` and `breaking_edit`.

  Each per-site arm is built in its own `(arm, site)` snapshot that differs from `original` only inside that comment span. The build fails on any code-line change.
- **Rationale:** Four failures, each seen in this group's inputs:
  - Arms-and-sites' recipe blanks `[line_start, line_end]`, which in `eval-sites.md` is the *function* span (OCX-02: 1774-1902). That deletes code.
  - `run_probes.py:48` reprints `{anchor}` in turn 2. An anchor that holds comment text therefore leaks the deleted comment, and `locate()` returns -1.
  - Seven fleet files host 2-3 sites. A per-repo snapshot (`build_arms.py:139-162`, `run_probes.py:96`) shows the probe a sibling site's edited comment.
  - `build_arms.py:165-167` only warns on a code change.
- **Verification:** the site check was tested on a planted bad record in scratch (it flags a commented anchor and an inverted span). The report check reads `build_arms.py`'s own `arms-report.json`. Then compare the `find` count to the site count.
  ```sh
  python3 -B -c "import json,sys,pathlib; sys.path.insert(0,'rules/code-docs/checks'); import comment_census as cc; S=json.load(open(sys.argv[1])); need={'id','repo','file','function','comment_start','comment_end','anchor','ground_truth','consequence','breaking_edit'}; bad=[s.get('id') for s in S if not need<=s.keys() or s['comment_start']>s['comment_end'] or any(l.kind not in ('code','blank') for l in cc.classify('x',s['anchor'],cc.EXT_LANG[pathlib.Path(s['file']).suffix]))]; print('bad:',bad); sys.exit(bool(bad))" "$SITES"
  python3 -B -c "import json,sys; r=json.load(open(sys.argv[1])); bad=[k for k,v in r.items() if v['code_before']!=v['code_after']]; print(bad); sys.exit(bool(bad))" "$OUT/arms-report.json"
  find "$OUT/rules" -mindepth 1 -maxdepth 1 -type d | wc -l
  ```
- **Severity:** MUST · **Portability:** portable

### EVL-03 — Score reason recovery from an unled question

- **Rule:** Score reason recovery from an unled turn that does not presuppose a constraint. Run the led breaking-edit question after it only as a confabulation gate. Do the same in the cleanup skill's post-edit reason recheck.
- **Rationale:** Two problems with today's turn 2:
  - A question that names the edit (`run_probes.py:50`) lets a model answer from surface cues. CodeCrash measures a 23.2% average degradation under misleading natural-language context ([arXiv 2504.14119](https://arxiv.org/abs/2504.14119)).
  - The unled wording eval-scoring proposed, "what would break", presupposes a guard. That inflates invented guards on exactly the controls built to catch them ([eval-scoring §1, §3](code-docs-eval/eval-scoring.md#1-turn-2-wording-led-vs-unled-and-what-each-actually-measures)).
- **Verification:** the first command yields exactly one hit, the 2b prompt constant. The second prints nothing. Reading heuristic: the reason-recovery judge prompt interpolates only the 2a answer.
  ```sh
  grep -rn -e "{edit}" .agents/research/code-docs-eval/harness/
  grep -rn -i -e "what would break" .agents/research/code-docs-eval/harness/
  ```
- **Severity:** MUST · **Portability:** portable

### EVL-04 — Tag untouched guards apart from kept ones

- **Rule:** Score guard survival by property on the turn-1 rewrite, in three levels: `kept-rationale`, `untouched` and `broken`. `untouched` is assigned mechanically when the guarded code tokens are unchanged.
- **Rationale:** Models under-delete. Deletion recall is 71.7% even on tasks every model solves, and the "Guard-and-Go" pattern wraps code instead of removing it ([arXiv 2607.28887](https://arxiv.org/abs/2607.28887)). An arm can look safe because the actor did not touch the guarded code, not because it understood the guard ([eval-scoring §2, §10](code-docs-eval/eval-scoring.md#2-guard-survival-rubric-anchored-levels-judged-by-property)). EVL-07's reason gate blocks this confound, so the tag explains results rather than gating them.
- **Verification:** the output lists only those three levels and no `None`.
  ```sh
  python3 -B -c "import json,sys; print(sorted({str(r.get('survival')) for r in json.load(open(sys.argv[1]))}))" "$OUT/judged.json"
  ```
- **Severity:** SHOULD · **Portability:** portable

### EVL-05 — Judge from another tier, blind, calibrated before use

- **Rule:** Before the full run is scored, the judge must meet four conditions:
  - it is a different model tier from the actor;
  - it never sees the arm label;
  - it is calibrated against at least 30 human-labelled transcripts, covering every arm and at least 2 controls;
  - it reaches ICC (or quadratic-weighted kappa) ≥ 0.70 on both rubrics.
- **Rationale:** A same-tier judge shares the actor's blind spots. An arm label invites "of course `deleted` failed" anchoring. 82% of agentic-eval papers use inadequate inter-rater metrics, and 0.70 is the recommended gate ([arXiv 2608.00794](https://arxiv.org/abs/2608.00794)). Landis and Koch's 0.6 band is "personal opinion" ([Cohen's kappa](https://en.wikipedia.org/wiki/Cohen%27s_kappa)). A calibration set of 20-50 cases is the practical floor ([InfoQ](https://www.infoq.com/articles/agentic-fitness-functions-evolutionary-architecture/)).
- **Verification:** the first command prints at least 30 rows, all run arms and at least 2 controls. In the second, the judge's `--model` string differs from the actor's `sonnet` default (`run_probes.py:111`). Reading heuristic: the judge payload builder never interpolates `arm`.
  ```sh
  python3 -B -c "import csv,sys; R=list(csv.DictReader(open(sys.argv[1]))); print(len(R), sorted({r['arm'] for r in R}), sum(r['stratum']=='C' for r in R))" "$RESULTS/calibration.csv"
  grep -rn -e "--model" .agents/research/code-docs-eval/harness/
  ```
- **Severity:** MUST · **Portability:** portable (the model pair `sonnet` actor / `opus` judge is a fleet default the adopter may override)

### EVL-06 — Double-judge and escalate

- **Rule:** Judge every probe twice, independently. Send it to a human when:
  - the two scores differ by more than one level;
  - either evidence field is `not found` or ambiguous;
  - the 2a/2b gate tagged it `confabulated`.
- **Rationale:** Averaging hides disagreement, and the disagreement is the signal ([InfoQ](https://www.infoq.com/articles/agentic-fitness-functions-evolutionary-architecture/); [eval-scoring §6](code-docs-eval/eval-scoring.md#6-escalation-when-a-probe-must-not-be-scored-by-the-judge-alone)). A rising escalation rate per arm is itself a finding.
- **Verification:** reading heuristic: `$RESULTS/escalations.csv` lists every probe that meets a condition, each with a human resolution, and the report gives the escalation rate per arm.
- **Severity:** SHOULD · **Portability:** portable

### EVL-07 — Decide each arm by paired non-inferiority on two gates, each after its own assay sensitivity

- **Rule:** An arm passes when two lower bounds both clear −δ, with δ = 0.10:
  - guard survival (kept at any level), compared to `original`;
  - reason recovery at "mechanism only" or better, compared to `original`.

  Each bound is the one-sided 90% lower bound of the site-level paired bootstrap of the arm-minus-`original` rate, with 10,000 resamples of sites. Assay sensitivity is checked per gate: the Tier-A `original` minus `deleted` gap on that gate needs a lower bound of at least δ. A gate without it cannot certify non-inferiority; it is reported as `no_assay`, and the arm is decided on the gates that have it. An arm with no such gate gets no verdict.

  *Revised after the main run (2026-09-27).* The rule as first written demanded assay sensitivity on survival alone. On the main run survival sat at the ceiling: `deleted` kept every Tier-A guard, and the only broken guard (OCX-09) broke in `original` too. Recovery cleared the assay (gap 0.31, lower bound 0.19). Survival is therefore reported as "no observed harm", never as non-inferior, and the verdicts rest on recovery ([results](code-docs-eval/results.md)).
- **Rationale:** The design is paired and N is small, so a bare rate compare wastes the pairing. The bootstrap-over-units precedent is [arXiv 2010.01625](https://arxiv.org/abs/2010.01625), citing Berg-Kirkpatrick et al. 2012. The margin choice rests on a 1,000-run simulation in this consolidation (Beta site survival with mean 0.9 and ICC 0.3, R = 5, 2,000 bootstrap resamples):

  | Setting | δ = 5 | δ = 10 |
  |---|---|---|
  | Truly equivalent arm passes, N = 20 | 62-67% | 94% |
  | Truly equivalent arm passes, N = 40 | 81% | — |
  | Arm with 3 of 20 guards broken passes (a pooled drop of about 9 points) | — | 8% |

  So δ = 5 decides "no cut" by construction. δ = 10 separates a harmless arm from a harmful one.

  The margin can never exceed the effect the control provably has. The FDA's non-inferiority guidance (November 2016) says M2 "can never be greater than M1" and calls assay sensitivity "an essential property" ([FDA](https://www.fda.gov/media/78504/download)).

  Eval-scoring's absolute 70% recovery floor is replaced. It either fails every arm, `original` included, or it is slack; either way the number decides, not the arms.
- **Verification:** both keys appear in the cut-line report. Reading heuristic: the report states N, R, both bounds per arm, and the excluded sites.
  ```sh
  grep -rn -e "delta=0.10" -e "assay_sensitivity=" "$RESULTS"
  ```
- **Severity:** MUST · **Portability:** portable (δ = 0.10, one-sided 90% is a fleet default the adopter may tighten if they can afford N ≥ 40 and R ≥ 10)

<details><summary>Simulation used for EVL-07 (re-run with <code>uv run --with numpy python ni_power.py</code>)</summary>

```python
import numpy as np
rng = np.random.default_rng(7)
def power(N, R, delta, diff, icc=0.3, m=0.9, sims=1000, B=2000):
    s = (1 - icc) / icc; a, b = m * s, (1 - m) * s
    ok = 0
    for _ in range(sims):
        p = rng.beta(a, b, N); q = np.clip(p + diff, 0, 1)
        d = rng.binomial(R, q) / R - rng.binomial(R, p) / R
        lo = np.quantile(d[rng.integers(0, N, (B, N))].mean(1), 0.10)
        ok += lo >= -delta
    return ok / sims
for N, R in [(20, 5), (28, 5), (40, 5), (20, 10)]:
    for delta in (0.05, 0.10):
        print(N, R, delta, power(N, R, delta, 0.0), power(N, R, delta, -0.15))
# measured: (20,5) δ.05 0.617/0.000, δ.10 0.936/0.019; (40,5) δ.05 0.812; (20,10) δ.05 0.815
```

Pairing absorbs the between-site variance. That is why arms-and-sites' unpaired design-effect MDE of about 21 points overstates what this design needs for a uniform effect.
</details>

### EVL-08 — Flag and re-run per-site regressions

- **Rule:** Flag every (site, arm) where `original` keeps the guard in at least 4 of 5 reps and the arm keeps it in at most 2 of 5. Re-run that site at R = 10 in both arms. Name every confirmed regression in the report as a guard shape the rule must exempt.
- **Rationale:** A pooled mean hides concentrated harm. With 1 of 20 guards broken, a δ = 10 test still passes 64% of the time. The flag fires in 72-97% of runs with 1-3 broken guards, but also in 26-28% of runs with none, so it triggers a re-run, not a verdict (same simulation as EVL-07). Arms-and-sites predicted Tier-A swings from 90% to 30-50% for single sites ([arms-and-sites §7](code-docs-eval/eval-arms-and-sites.md#7-power-reps-sites-sessions-cost--and-the-honest-shortfall-against-10-points)).
- **Verification:** reading heuristic: the report has a "per-site regressions" table with each flagged pair, its R = 10 result, and "confirmed" or "cleared".
- **Severity:** SHOULD · **Portability:** portable

### EVL-09 — Draw mechanism sites to match the population the cut edits

- **Rule:** Draw at least 20 comment-bearing mechanism sites. At least a quarter of them must carry comments over 10 lines. Exclude from the pooled statistic any site whose reason no arm can remove.
- **Rationale:** The cut edits fleet guards, not human ones.
  - Sample.md §5's 100 guards bucket 22 / 45 / 33 across 1-2, 3-10 and over-10 lines, and the over-10 guards hold **69.5%** of the 962 guard lines (computed from the `(len N)` fields).
  - The keyword-seeded pool (`eval-sites.md` §1 method, Gaps) has 2 of 20 over 10 lines. It cannot license the edit that removes most of the mass.
  - A 1-2-line site cannot tell `original`, `oneline` and `rules` apart, so filling that cell buys little.
  - PY-02's reason is a raised string (`ocx-sdk-python:src/ocx_sdk/_bootstrap.py:833`). Every arm leaves it intact, and the guaranteed zero difference dilutes the pooled drop.
- **Verification:** the command exits 0.
  ```sh
  python3 -B -c "import json,sys; S=[s for s in json.load(open(sys.argv[1])) if s['stratum'] in ('A','B') and not s.get('reason_in_code')]; n=sum(s['comment_end']-s['comment_start']+1>10 for s in S); print(n, len(S)); sys.exit(n*4<len(S) or len(S)<20)" "$SITES"
  ```
- **Severity:** MUST · **Portability:** portable (the "a quarter over 10 lines" share is a fleet default; an adopter sets it from their own guard sample)

### EVL-10 — Make controls realistic and testable

- **Rule:** Draw free-to-change controls from narration or tautology blocks inside real fleet functions. Each control gets a behaviour-preserving `safe_edit` that the repo's tests confirm, so the correct 2b verdict is `may-change`. Run controls in `original` and `deleted` only, and score an invented guard as `wrong`.
- **Rationale:** Both existing control sets fail as controls:
  - `eval-sites.md` §2's controls are trivial accessors, so no in-context reading is needed.
  - Arms-and-sites' C-01..C-08 set the proposed change to "delete the comment" (`eval-arms-and-sites.md:263-270`). That makes 2b trivial, and it sits in human repos at 0.12-0.27 density instead of the fleet's 0.5-1.4. The ambient-density effect (topic map, `ambient-density` row) predicts a different rate of invented guards there.

  A fleet control exists next to real guards. For example, `ocx-catalog:src/theme/utils/version.ts:171` "// Major" is narration inside `compareVersions`, whose lines 163 and 192 are listed as guards.
- **Verification:** the command exits 0. Reading heuristic: each control's function has at least one other statement, and `safe_edit` changes code, not the comment.
  ```sh
  python3 -B -c "import json,sys; C=[s for s in json.load(open(sys.argv[1])) if s['stratum']=='C']; bad=[s['id'] for s in C if not s.get('safe_edit') or 'comment' in s['safe_edit']]; print(len(C), bad); sys.exit(bool(bad) or len(C)<8)" "$SITES"
  ```
- **Severity:** SHOULD · **Portability:** portable

### EVL-11 — Redact the history arm by content, over every historical path

- **Rule:** Build a history-bearing arm with `git-filter-repo --file-info-callback`:
  - redact the site comment from every blob of **every path the site file ever had**;
  - keep commit messages;
  - never check out an ancestor commit.

  Verify zero leaks across the whole history with a `git` that no output filter wraps.
- **Rationale:** Three failures, all seen in the fleet:
  - **Ancestor checkout reverts the fix.** OCX-14's comment and its fix landed in the same commit, [ocx@97bcf5109](https://github.com/ocx-sh/ocx/commit/97bcf51097c7f89e4c28d4930988d10604b244d9), re-verified with `git log -S`. Checking out the parent brings back the bug.
  - **Filename-keyed redaction and path-restricted checks miss renamed paths.** All six sampled ocx site files were renamed out of `crates/ocx_lib` (for example `R097 crates/ocx_lib/src/package_manager/tasks/render_toolchain.rs`). OCX-09's "one lock over the whole body" has 5 diff hits under that old path.
  - **The output filter makes the leak check read zero.** In this environment `git log` and `command git log` pass through the rtk hook, which returns 50 lines against 6,112,328 from `/usr/bin/git`. So `grep -c` prints 0 before any redaction.
- **Verification:** the first command lists every path the callback must rewrite. The second prints `0` for each of at least 2 distinctive phrases per site.
  ```sh
  REPO=/path/to/history-arm/ocx; FILE=crates/ocx_package_manager/src/tasks/render_toolchain.rs; PHRASE="one lock over the whole body"
  /usr/bin/git -C "$REPO" log --follow --name-only --format= -- "$FILE" | sort -u
  /usr/bin/git -C "$REPO" log --all -p --no-renames --format= | grep -c -F -e "$PHRASE"
  ```
- **Severity:** MUST · **Portability:** portable (the `/usr/bin/git` bypass is fleet-only: it exists because of the rtk hook)

### EVL-12 — Tag where-found by the path an agent touched

- **Rule:** Classify each tool call's store in this order:
  1. Match the git regex (`log|show|blame|grep`) against the whole Bash command first.
  2. Otherwise classify by the path operand only: the last non-flag token for Bash, the `file_path` or `path` field for other tools.
  3. Test agent-config paths before record keywords.
  4. Tag a search with no path as `search`.
- **Rationale:** Four misfiles, confirmed live against `extract.py:18-25,50`:
  - `ocx/.claude/rules/subsystem-tests.md` is tagged `record`.
  - `git grep` is tagged `source`.
  - `grep -rn protest_handler crates/ocx_store/src/` is tagged `test`.
  - A Grep tool call with only a regex is tagged by its pattern text (this consolidation found this fourth one; a fixed classifier tested in scratch tags all four correctly).

  Eval-scoring's printed "fixed" output shows `source` for `git grep`; the correct result is `git`. Agent-config is the dominant real bucket (60.5% of agent doc consultations, [arXiv 2608.20195](https://arxiv.org/abs/2608.20195)).
- **Verification:** after the fix, the first command prints `agent-config` and the second prints `['git', 'source']`. Today they print `record` and `['source', 'test']`.
  ```sh
  python3 -B -c "import sys; sys.path.insert(0,'.agents/research/code-docs-eval/harness'); from extract import STORE; print(next(n for n,r in STORE if r.search('ocx/.claude/rules/subsystem-tests.md')))"
  python3 -B -c "import sys; sys.path.insert(0,'.agents/research/code-docs-eval/harness'); from extract import touches; ev=[{'type':'assistant','message':{'content':[{'type':'tool_use','name':'Bash','input':{'command':c}} for c in ('git grep -n render_lock crates/','grep -rn protest_handler crates/ocx_store/src/')]}}]; print([t['store'] for t in touches(ev)])"
  ```
- **Severity:** SHOULD · **Portability:** portable (the store names are a fleet default)

### EVL-13 — Price a wave from a pilot, not from the budget cap

- **Rule:** Estimate a full run's cost from the observed per-session cost of a pilot of at least 20 sessions, not from `--max-budget-usd`.
- **Rationale:** Arms-and-sites puts the cap-based ceiling at 10-20x the realistic cost ([§7](code-docs-eval/eval-arms-and-sites.md#7-power-reps-sites-sessions-cost--and-the-honest-shortfall-against-10-points)). `extract.py:56-61` already records `total_cost_usd` per turn.
- **Verification:**
  ```sh
  python3 -B -c "import json,sys; R=json.load(open(sys.argv[1])); c=[(r['cost1'].get('usd') or 0)+(r['cost2'].get('usd') or 0) for r in R]; print(len(c), sum(c)/max(len(c),1))" "$OUT/pilot.json"
  ```
- **Severity:** SHOULD · **Portability:** portable

Dropped as restating what a competent eval author already does, or as having nothing to verify:
- "record the model version";
- "use read-only probe tools" (`run_probes.py:23-40` already does);
- arms-and-sites' "a cleanup rule must not assume the reason is in a comment". It becomes a site-exclusion clause in EVL-09 and a census-classifier gap.

## Applied to the fleet

"Fleet" here has two parts: the harness in this worktree, and the fleet repos that host sites.

| Rule | Status | Evidence |
|---|---|---|
| EVL-01 | violated | `.agents/research/code-docs-eval/harness/build_arms.py:8-9` and `:149-152`: `rules`/`pointer` get a copy of `original`; no `fixtures/` directory exists |
| EVL-02 | violated | `build_arms.py:139-162` builds one snapshot per (arm, repo); `run_probes.py:96` roots probes per repo; 7 files host 2-3 sites (`ocx:crates/ocx_config/src/env.rs` ×3, `ocx:crates/ocx_util/src/fs.rs` ×3, …); `run_probes.py:97-99` reads `site["anchor"]`, which `eval-sites.md:382-421` never defines; arms-and-sites' JSON is an object without `function`/`ground_truth` while `build_arms.py:138-141` iterates a list |
| EVL-02 | partly satisfied | `build_arms.py:153-161` already counts code lines per edited file; `:165-167` only warns |
| EVL-03 | violated | `run_probes.py:47-57`: the only turn 2 is led; `code-docs-cleanup/cleanup-procedure.md:52` gates the cleanup recheck on that led `VERDICT` |
| EVL-04, EVL-05, EVL-06, EVL-07, EVL-08 | new | no judge, calibration set, cut-line script or survival tag exists; the actor default is `sonnet` (`run_probes.py:111`) |
| EVL-09 | violated | eval pool: 2 of 20 over 10 lines vs 33 of 100 fleet guards (`code-docs-audit/sample.md` §5); keyword-seeded harvest (`code-docs-audit/eval-sites.md:72-76`, Gaps); PY-02 at `ocx-sdk-python:src/ocx_sdk/_bootstrap.py:833` keeps its reason in code |
| EVL-10 | violated | `eval-sites.md:110-119` controls are accessors; `eval-arms-and-sites.md:263-270` controls propose "delete the comment" |
| EVL-10 | satisfiable today | `ocx-catalog:src/theme/utils/version.ts:171` (narration beside guards at `:163`, `:192`); `grimoire:src/resolve/resolver.rs:193` ("Re-pin the named path-sourced entries" above the call it names) |
| EVL-11 | violated (by the sub-artifact's own verification) | `eval-arms-and-sites.md:125` checks `git log --all -p -- FILE` (current path only); `ocx:crates/ocx_package_manager/src/tasks/render_toolchain.rs` history holds OCX-09's phrase under `crates/ocx_lib/...` (5 hits); the hooked `git log` returns 50 lines |
| EVL-11 | satisfied for non-history arms | `build_arms.py:11-12,128-129`: every snapshot is a fresh one-commit `git init`, so no history leaks |
| EVL-11 | fleet fact that forbids the ancestor design | `ocx` commit [97bcf5109](https://github.com/ocx-sh/ocx/commit/97bcf51097c7f89e4c28d4930988d10604b244d9): the OCX-14 comment and the fsync-propagation fix land together |
| EVL-12 | violated | `extract.py:19-20` (order, regex without `grep`), `:50` (whole command, pattern text); real misfile `grimoire:.claude/rules/subsystem-tests.md` |
| EVL-13 | partly satisfied | `extract.py:56-61` records per-turn cost; `run_probes.py:75` caps each turn at $2 |
| Probe hygiene (context) | satisfied | `run_probes.py:74` `--setting-sources project,local` keeps user hooks (including rtk) out of probes, while tracked agent config and records ship in every snapshot (ocx 645, grimoire 190 tracked `CLAUDE.md`/`.claude/rules`/`.claude/artifacts`/`.agents/adr` files) |

## AI-agent failure modes

Ranked by how often each bites. The first four fire on individual probes. The rest fire once per harness build, but each one voids a whole arm.

1. **Guard-and-Go in turn 1.** The actor leaves the guarded code untouched, so every arm's survival looks fine ([arXiv 2607.28887](https://arxiv.org/abs/2607.28887): 71.7% deletion recall). Countered by EVL-04's `untouched` tag and EVL-07's reason gate.
2. **Answering the led question from its wording.** The right verdict comes from the edit description, not the mechanism ([arXiv 2504.14119](https://arxiv.org/abs/2504.14119)). Comments act as local hints: 68% of a correct comment's benefit survives shuffling its lines ([arXiv 2609.09242](https://arxiv.org/abs/2609.09242)). Countered by EVL-03.
3. **Inventing a guard on free-to-change code,** pushed by ambient density in dense files (topic map `ambient-density`). Countered by EVL-10.
4. **Naming a CWE instead of deriving this function's consequence.** Most sites are traversal, TOCTOU, fsync or lock guards. The top rubric level requires the site's own `consequence` field ([eval-scoring §3](code-docs-eval/eval-scoring.md#3-reason-recovery-rubric-four-anchored-levels-with-worked-examples)).
5. **Reporting zero leaks from a filtered or path-restricted `git log`.** Demonstrated here: the hooked `git log` prints 50 lines, and pre-rename paths escape a `-- FILE` filter. Countered by EVL-11.
6. **Editing the function span as if it were the comment span.** Arms-and-sites' own recipe does this, which deletes code. Countered by EVL-02.
7. **Wiring a live model into `build_arms.py`,** the literal reading of "filled by agents later". Countered by EVL-01.
8. **Reusing the per-repo snapshot for per-site arms,** which contaminates 7 shared files. Countered by EVL-02.
9. **Building the history arm from the parent of the comment's commit,** which reverts the fix (OCX-14). Countered by EVL-11.
10. **Misreading statistics and budget.** Taking "no significant drop" from an underpowered compare as "safe", or pricing from `--max-budget-usd` ([arms-and-sites, AI-agent angle](code-docs-eval/eval-arms-and-sites.md#ai-agent-angle)). Countered by EVL-07 and EVL-13.

## Decisions for the eval

**Probe.** One resumed session per (site, arm, rep), actor `sonnet`, `--setting-sources project,local`:
- **Turn 1:** `P1` unchanged, text-only simplify of `{function}`.
- **Turn 2a (scored):** "Look at this code in `{file}` near line {line}: ``` {anchor} ```. Why is it written this way? Could it be written differently without changing anything that matters? If something would break, say what, and where you found that." Answer as `REASON:`, `CONSTRAINT:` (none, or what breaks), `EVIDENCE:`.
- **Turn 2b (gate):** `P2` unchanged. It always runs, because running it conditionally would need the judge inside the loop. Its `VERDICT` also gives a judge-free cross-check.

**Arms.**

| Arm | Build | Sites | What its verdict settles |
|---|---|---|---|
| `original` | HEAD | all | baseline |
| `rules` | cleanup-skill output (`GUARD:` fact plus consequence, pointer where the skill relocates rationale), frozen with the rule version | mechanism | guard-shape's MUST form and cap (`code-docs-guards/guard-shape.md:474`) |
| `oneline` | existing mechanical first-line cut | mechanism | whether a length cap may be enforced by truncation without a rewrite (length-and-ratchet) |
| `pointer-only` | one line naming the Tier-B test, or else an eval-only record holding `ground_truth`; the two target kinds are reported separately | mechanism | whether a guard may shrink to a bare pointer (H4, H5 non-git; pointer-form, routing-table) |
| `deleted` | the site comment span removed; tests, records and other comments kept | mechanism, the 11 extra Tier-B sites, controls | Tier A: assay sensitivity; Tier B: whether a named test carries the guard (tests-as-guards) |
| `history` | `deleted` plus full history redacted per EVL-11, commit messages kept | Tier A (12) | H5's git half: share of sessions that touch git, and share that recover the reason from it (routing-table commit-as-store) |

**Sites.**
- **25 mechanism sites in the pooled statistic:**
  - the 12 Tier-A and 7 Tier-B sites from `eval-sites.md` §4, with PY-02 moved out;
  - 6 new over-10-line non-Rust guards from sample.md §5, harvested with the `eval-sites.md` method: `ocx-sdk-python:src/ocx_sdk/_bootstrap.py:431`, `_dist.py:614`, `_process.py:165`, `ocx-catalog:src/sources/types.ts:231`, `src/viewmodel/catalog.ts:171`, `src/theme/composables/usePackageRoot.ts:74`;
  - with OCX-02 and OCX-17 that makes 8 of 25 (32%) over 10 lines.
- **The 11 remaining Tier-B sites** (OCX-01, -03, -05, -10, -11, -18, -22, GRM-08, PY-04, TS-01, TS-02) run in `original` and `deleted`. That gives the tests-as-guards question 18 sites instead of 7. TS-01's test is partial and is reported separately.
- **Controls:** 8 fleet in-function controls per EVL-10. Until those are harvested, arms-and-sites' C-01..C-08 serve as a stopgap, each given a verified `safe_edit`.

**Scoring.**
- Survival uses 3 levels (EVL-04). Recovery uses 4 levels: mechanism plus consequence, mechanism only, generic caution, wrong (an invented guard counts as wrong).
- The judge is `opus`, run twice and blind to the arm (EVL-05, EVL-06).
- Calibration covers 30 cases: 4 anchors (OCX-09, OCX-14, GRM-05, TS-03) × 5 per-site arms = 20, plus 8 stratified mechanism probes, plus 2 controls, all drawn from a pilot.
- **Labeller default:** a human labels the 30 cases. If none does, a second judge from another model family labels them. The report then states judge-to-judge agreement, not validity, and every MUST below ships as SHOULD.

**Statistic.** EVL-07 with R = 5, plus EVL-08 flags. Where-found combines each probe's `EVIDENCE` self-report with its `touches` (EVL-12).

**Budget.**
- (25 × 5 + 11 × 2 + 12 + 8 × 2) = 175 site-arms × 5 reps = **875 sessions, 2,625 turns**.
- The ceiling is $5,250 at `--max-budget-usd 2` per turn.
- The realistic range is **$260-790**. That extrapolates arms-and-sites' $0.10-0.30 per turn and still needs replacing by a pilot figure (EVL-13). Judge calls come on top and are not priced here.
- Run the 30-probe pilot first; it also supplies the calibration set.

**Candidate MUSTs from other groups that stay SHOULD until this eval passes them:**

| Candidate rule (group) | Confirmed as MUST when |
|---|---|
| Guard form: `GUARD:` fact plus consequence, 1-2 lines (guards/guard-shape) | `rules` passes both gates of EVL-07 |
| A test named for the constraint lets the guard comment go (routing/tests-as-guards) | `deleted` passes both gates on the 18 Tier-B sites |
| A guard never shrinks to a bare pointer (linkage/pointer-form, routing-table) | `pointer-only` fails on Tier A. If it passes, the rule flips to "a pointer may replace the text" |
| A reason's only home is never a commit body (routing-table, commit-as-store) | `history` shows git rarely touched, or rarely the recovered source, on Tier A |
| A length cap may be enforced mechanically (ratchet/length-and-ratchet) | `oneline` passes both gates. If it fails, the cap must say "rewrite, do not truncate" |
| Cleanup reason-recheck pass bar, REASON Jaccard ≥ 0.3 against `consequence` (cleanup-procedure) | the bar agrees with the judge's ≥ "mechanism only" labels on the calibration set. The recheck asks 2a, never only the led `VERDICT` (EVL-03) |

## Open questions

Human decisions (one-way doors only):
1. **Spend approval.** The full run is 875 sessions: a $5,250 ceiling, $260-790 expected before judge calls. Default: run the 30-probe pilot, then ask again with the measured per-session cost.
2. **Publishing a MUST from this sample.** The sample is 25 guard-dense sites, and lore publishes on merge to main. Default: a candidate rule ships as MUST only when its arm passes both gates with assay sensitivity met and no confirmed per-site regression. Otherwise it ships as SHOULD, naming the failing shapes, until a second wave reproduces the result.

Subareas that need another research round:
- **eval-sites (harvest).** Do the 6 named over-10-line non-Rust guards and 8 fleet in-function controls meet the `eval-sites.md` method (ground truth, test status, breaking or safe edit, tests green for `safe_edit`)? Start from `code-docs-audit/sample.md` §5 and `code-docs-audit/scratch/samples/*.json`.
- **uncommented-guards.** Every site carries a comment today. How often do cold agents break a non-obvious line that never had one? Harvest candidates from single-hunk, code-only fix commits. Compare their break rate with Tier-A `deleted`; this is the missing counterfactual for any comment-presence rule.
- **pointer-realism.** Is `pointer-only`'s eval-only record easier or harder to find than a real ADR? Calibrate against real code-to-record pointers from pointer-form-and-check before a `pointer-only` pass is trusted.
- **actor-sensitivity.** Does an `opus` actor break guards at the `sonnet` rate? Run the 4 anchor sites × `rules`/`deleted` once with `opus` after the main run.

## Sub-artifacts

- [code-docs-eval/eval-arms-and-sites.md](code-docs-eval/eval-arms-and-sites.md): covers the arm build recipes, the per-site snapshot fix, the git-filter-repo design, site stratification, controls, and the power and cost tables. Its zero-leak evidence and 1-2-line priority are overturned here.
- [code-docs-eval/eval-scoring.md](code-docs-eval/eval-scoring.md): covers turn-2 led versus unled, the survival and recovery rubrics with anchors, judge choice, calibration, escalation, the `extract.py` store bugs, and the non-inferiority design. Its δ = 5 and absolute floor are overturned here.
- [code-docs-eval/harness/build_arms.py](code-docs-eval/harness/build_arms.py), [run_probes.py](code-docs-eval/harness/run_probes.py), [extract.py](code-docs-eval/harness/extract.py): the harness these rules amend.

## Key sources

| Source | Why |
|---|---|
| [code-docs-audit/eval-sites.md](code-docs-audit/eval-sites.md) | 48 sites with ground truth, breaking edit, test status and tiers; the JSON schema EVL-02 extends |
| [code-docs-audit/sample.md](code-docs-audit/sample.md) §5 | 100 unbiased fleet guards with lengths; the 22/45/33 split and 69.5% line share behind EVL-09 |
| [code-docs-audit/human-sample.md](code-docs-audit/human-sample.md) | human guard median of 2 lines; the stopgap controls C-01..C-08 |
| [arXiv 2504.14119 (CodeCrash)](https://arxiv.org/abs/2504.14119) | misleading NL cues degrade code reasoning by 23.2%: the led-turn problem |
| [arXiv 2607.28887 (deletion avoidance)](https://arxiv.org/abs/2607.28887) | 71.7% deletion recall, Guard-and-Go: the `untouched` confound |
| [arXiv 2609.09242](https://arxiv.org/abs/2609.09242) | comments act as local hints (68% of the benefit survives shuffling) |
| [arXiv 2608.00794](https://arxiv.org/abs/2608.00794) | ICC ≥ 0.70 gate for judged agentic pipelines |
| [InfoQ: agentic fitness functions](https://www.infoq.com/articles/agentic-fitness-functions-evolutionary-architecture/) | 20-50 case calibration set; escalation on judge disagreement |
| [arXiv 2010.01625 (Panthaplackel et al.)](https://arxiv.org/abs/2010.01625) | bootstrap significance on small comment/code sets; curated versus full test-set gap |
| [FDA, Non-Inferiority Clinical Trials to Establish Effectiveness (Nov 2016)](https://www.fda.gov/media/78504/download) | assay sensitivity; "M2 can never be greater than M1" |
| [arXiv 2608.20195](https://arxiv.org/abs/2608.20195) | 60.5% of agent doc consultations hit instruction files: why store tagging matters |
| [github.com/newren/git-filter-repo](https://github.com/newren/git-filter-repo) | `--file-info-callback` semantics for the history arm |
| [ocx@97bcf5109](https://github.com/ocx-sh/ocx/commit/97bcf51097c7f89e4c28d4930988d10604b244d9) | comment and fix in one commit: why an ancestor checkout is invalid |
| [PMC6477104](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6477104/) | design-effect formula behind arms-and-sites' unpaired MDE, which pairing supersedes |

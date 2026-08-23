---
title: "Python topic map — deduplicated, adjudicated, prioritised for this catalog"
phase: 3
model: opus
date: 2026-08-23
agent: topic-map
consolidates:
  - python-frame.md
  - python-packaging.md
  - python-api-design/sdk-public-surface.md
  - python-async/sdk-concurrency.md
  - python-audit/config-inventory.md
  - python-audit/exemplar-patterns.md
  - python-audit/existing-rules-ledger.md
  - python-audit/fleet-fix-list.md
  - python-audit/harness-shape.md
  - python-audit/lint-yield.md
  - python-audit/pyright-triage.md
  - python-audit/shipped-python.md
  - python-audit/tooling-posture.md
  - python-audit/verification-sweep.md
  - python-audit/version-floor.md
  - python-cli-contract/errors-and-exit-codes.md
  - python-data-modelling/types-and-idioms.md
  - python-http/bot-client-discipline.md
  - python-observability/logging-and-output.md
  - python-security/untrusted-input.md
  - python-single-file-tools/stdlib-only.md
  - python-subprocess/process-control.md
  - python-testing/suite-architecture.md
  - python-topic-map/codified-reconciled.md
  - python-topic-map/scout-agent-legibility.md
  - python-topic-map/scout-canonical.md
  - python-topic-map/scout-cli-acceptance.md
  - python-topic-map/scout-codified.md
  - python-topic-map/scout-failure-coverage.md
  - python-topic-map/scout-failure.md
  - python-topic-map/scout-practitioner.md
  - python-topic-map/scout-shifts.md
  - python-tooling-ci/the-gate.md
  - python-topic-map/sweep-canonical-catalogues.md
  - python-typing/annotations-evaluation.md
cutoff: |
  35 artifacts, 10,766 lines — every file under .agents/research/ whose name or
  directory begins with "python", as of 2026-08-23. All 35 were read in full.

  LATE ARRIVAL: python-tooling-ci/the-gate.md (344 lines) was absent when this
  map's reading pass began and landed at 00:48, mid-analysis. It is fully
  integrated. It is the 35th input and it closes what would otherwise have been
  this map's largest declared hole. It also OVERTURNS one finding this map had
  already recorded as P1 — see Resolved contradiction 11.

  The gate dive postdates verification-sweep.md and therefore carries no trust
  grade. Its first-party measurements (the zizmor runs, the wall-clock timings,
  gate-exists.sh watched red then green) are treated as sound because the
  artifact shows the transcripts; its unmeasured inferences (notably about
  ocx-save, which it names as out of scope) are treated as B- and never carry
  MUST here.

  TRUST GRADES, carried through this whole document from
  python-audit/verification-sweep.md: version-floor A; python-packaging A-;
  exemplar-patterns B+; codified-reconciled B+; annotations-evaluation B;
  scout-failure-coverage B; scout-codified B-; scout-agent-legibility C.
  A claim sourced only to scout-agent-legibility never carries MUST here.
  scout-codified's bandit index (its section 6) is never quoted: its S301-S325
  range is fabricated; ruff's real S ceiling is S324.
---

## Contents

- [What this wave established](#what-this-wave-established)
- [The map](#the-map)
- [Rules ready to author](#rules-ready-to-author)
- [Collapsed into configuration](#collapsed-into-configuration)
- [Resolved contradictions](#resolved-contradictions)
- [Explicitly not a defect](#explicitly-not-a-defect)
- [Deferred](#deferred)
- [Open questions for the owner](#open-questions-for-the-owner)

---

## What this wave established

**The five findings that changed direction.**

1. **The shipped Python is already exemplary, so the rules are preservation, not remediation.** Every `src/` tree in the fleet is 100% annotated (293/293 SDK, 221/221 `index/bot`, 53/53 `ocx-mirror-sdk`, 88/88 hooks), pyright runs clean on all of them live, and the 100% coverage number is real — `TOTAL 2170 0 396 0 100%`, 996 passed / 41 skipped, re-run during the audit ([shipped-python](python-audit/shipped-python.md)). Shapes 2 and 3 need rules that keep this; shapes 1 and 4 need rules that introduce it.
2. **60% of the fleet's Python is gated by nothing but "pytest passed."** Five of nine subjects run zero lint and zero type checking: 297 of 493 files, ~104k of 188k LOC ([tooling-posture](python-audit/tooling-posture.md)). This, not any individual rule, is the largest single finding of the wave.
3. **Both harnesses' declared `requires-python` floors are provably wrong.** `ocx/test` declares `>=3.10` and fails collection at 3.10 *and* 3.11 (PEP 701 nested f-strings, `tomllib`, `datetime.UTC`) — its real floor is **3.12**. `grimoire/test` declares `>=3.10` and fails at 3.10 — its real floor is **3.11**. Watched red on three subjects and clean on two with an inlined script ([version-floor](python-audit/version-floor.md), grade A).
4. **The `quality-python.md` adopted byte-identically in four repos contains a false MUST.** It asserts that `except Exception` catches `KeyboardInterrupt`; `KeyboardInterrupt` inherits from `BaseException` precisely so that it does not, documented verbatim ([existing-rules-ledger](python-audit/existing-rules-ledger.md), [errors-and-exit-codes](python-cli-contract/errors-and-exit-codes.md)). Of that file's 94 discrete claims, 12 go red, 6 cannot go red as configured, and 73 have no verification at all.
5. **The agent-legibility premise was investigated and rejected on evidence.** The claim that Python's dynamism handicaps a coding agent relative to Rust or Go runs *opposite* to the benchmark data the dive itself collected: Multi-SWE-bench, same model — Python 52.2%, Rust 15.9%, Java 21.9%, C/C++ 14.7%, Go 7.5%, JS/TS 5.1% ([scout-agent-legibility](python-topic-map/scout-agent-legibility.md), grade C). No agent-legibility rule category will be authored. Its one real product — a `push_blob`/`_push_blob` substring collision in `ocx/test/src/registry.py` — folds into naming.

**The rest, in order of consequence.**

6. `check-artifacts.py`, this repository's own publishing gate, has a self-test that `python -O` silently defeats: against a planted real regression it prints `self-test: ok` and exits 0 ([stdlib-only](python-single-file-tools/stdlib-only.md)). The fix already exists two files over, in `scripts/make-mark.py`.
7. The same script emits `BrokenPipeError` and exits **120** under `| head -1` — reproduced independently by two dives ([stdlib-only](python-single-file-tools/stdlib-only.md), [errors-and-exit-codes](python-cli-contract/errors-and-exit-codes.md)).
8. **`zizmor`'s `pull_request_target` flag against this catalog's own `validate.yml` is correct to raise and the implementation survives it.** [untrusted-input](python-security/untrusted-input.md) reported it as a **High** and this map initially carried that as a P1 defect; [the-gate](python-tooling-ci/the-gate.md) read the job in full and found the PR head checked out as data-only into a separate `pr-tree/` with `persist-credentials: false`, nothing executed or imported from it, changed-file paths passed through a file rather than argv, and `permissions: {}` at the top. The real zizmor defects are elsewhere: direct `${{ }}` interpolation into `run:` blocks in `ocx-save`'s `test-install-scripts.yml` and in three repos' `release.yml`, and floating action tags in exactly the workflow that ships release artifacts.
9. The "610 missing `subprocess` timeouts" defect was **retracted** by its own dive after `scout-cli-acceptance` showed pip, pytest and uv all ship none ([process-control](python-subprocess/process-control.md), [scout-cli-acceptance](python-topic-map/scout-cli-acceptance.md)). What replaces it: `pytest-timeout`, a CI `timeout-minutes` (absent today — 360-minute default), a `-v` that Task's templating silently drops, and `PYTHONUNBUFFERED=1`.
10. The "`index/bot` is logging-heavy" premise was also wrong: `ocx-sdk-python` is the only package in the fleet that imports `logging` at all, and the fleet-wide `G004` count is **zero** ([logging-and-output](python-observability/logging-and-output.md)).
11. Eight "nothing catches this" beliefs from the failure scout were stale — B909, B019, RUF012, RUF006, ASYNC221/222, INP001, pylint R0401 and pyright `reportUnhashable` all catch what was claimed uncatchable ([scout-failure-coverage](python-topic-map/scout-failure-coverage.md)).
12. Four ruff families were fully overturned against measured hits over 167,229 LOC (TRY, EM, INP, SLF), one had its premise corrected (G/LOG), two were scope-refined (ANN, ARG), and one new gap was found (PLC0415) ([codified-reconciled](python-topic-map/codified-reconciled.md)).
13. `pyright` over the harnesses reports 186 errors of which **zero are real bugs** — 94 idiom, 76 latent, 15 false positive, 1 stub. Scoped to `test/src/` it is 8 errors on ocx and 0 on grimoire: the only variant that is a green, meaningful gate today ([pyright-triage](python-audit/pyright-triage.md), [the-gate](python-tooling-ci/the-gate.md)).
14. `py.typed` as a hard requirement for a distributed typed package had **zero coverage** across every prior artifact until the catalogue sweep surfaced it from the typing spec ([sweep-canonical-catalogues](python-topic-map/sweep-canonical-catalogues.md)).
15. Five of ten named Python CLI projects test in-process rather than via subprocess, so the comparison set for shape 1 is half the size it looked ([scout-cli-acceptance](python-topic-map/scout-cli-acceptance.md)).
16. `grimoire-lore` itself ships **zero** Python rules today, while four other repos silently share one unowned copy of `quality-python.md` (md5 `46b9f0ac8545b5551fa60f48d2ef2753`) ([config-inventory](python-audit/config-inventory.md)).
17. **Three** recurring verification-authoring mechanisms produced always-pass checks across the corpus, and they are hazards rather than one-off slips: a markdown-escaped `\|` read back as regex alternation, `**` globs undercounting by 26%-95% under bash without `shopt -s globstar` ([verification-sweep](python-audit/verification-sweep.md)), and — found while authoring `gate-exists.sh` — `grep -q` closing its input early under `set -o pipefail`, so the upstream `echo` takes `SIGPIPE`, the pipeline reports failure, and a **real match is silently swallowed into "no match"** ([the-gate](python-tooling-ci/the-gate.md)). All three fail in the safe-looking direction.
18. **Every shape now has a measured post-autofix remainder, and two of the four are landable as a blocking gate today**: shape 1 `ocx/test` 15,143 → 1,051 → **805**; shape 2 `ocx-sdk-python` 336 → **155**; shape 3 `index/bot` 45 → **37**. Shape 1's 805 is a cleanup project, not a day-one gate ([the-gate](python-tooling-ci/the-gate.md)).
19. **A generated ruff baseline file is the wrong instrument here**, because shape 1's remainder decomposes into five named, bounded buckets (`PLW1510` 262, `RUF002/003/001` 114, `PT018` 72, `PLR0913/0917` 69, `S310/S607` 50, `S101` outside tests 15) that a baseline would flatten into one permanent exemption list ([the-gate](python-tooling-ci/the-gate.md)).
20. **Under an agent as primary author, only a blocking CI status check binds.** A pre-commit hook needs a manual `pre-commit install` per clone and yields to `--no-verify` or `SKIP=`; a periodically-reviewed count needs the attentive human this fleet has removed from the loop ([the-gate](python-tooling-ci/the-gate.md)).
21. **Contributor/CI parity is already broken on this machine, measured**: `which ruff` resolves to an `ocx`-toolchain **0.16.1** on `PATH` while the project pin is **0.16.3**. Two different linters, same machine, same moment ([the-gate](python-tooling-ci/the-gate.md)).
22. **Lint and type-checking are free.** `ruff check` 0.06-0.16s and `pyright` 1.3-2.7s per subject, against suites that already run 13.13s (`index/bot`), 47.92s (`grimoire/test`) and 171.72s (`ocx/test`). There is no timing argument for deferring them to nightly ([the-gate](python-tooling-ci/the-gate.md)).
23. **`.claude/tests` is uncalled but not rotten**: 165 passed / 3 skipped in 1.21s (ocx) and 153 passed in 0.50s (grimoire), run today. The fix is one line in an existing job, not a deletion. `ocx-save` ships the same class of hook scripts with no suite at all ([the-gate](python-tooling-ci/the-gate.md)).

---

## The map

Every candidate topic named by the five scouts, the canonical-catalogue sweep,
the sixth CLI-acceptance corpus, and all thirteen dives, after dedup: **163 rows**.
Where two scouts named the same topic differently, or two thin candidates share
one verification, the row says so. The count runs above the phase-2 estimate of
90-140 because the thirteen dives contributed roughly 170 normative candidates
of their own on top of the scouts' ~227; merging further would have bundled
topics whose evidence lives in different artifacts.

**Artifact links** (relative to this file):
[floor](python-audit/version-floor.md) ·
[pkg](python-packaging.md) ·
[posture](python-audit/tooling-posture.md) ·
[triage](python-audit/pyright-triage.md) ·
[yield](python-audit/lint-yield.md) ·
[shipped](python-audit/shipped-python.md) ·
[harness](python-audit/harness-shape.md) ·
[config-inv](python-audit/config-inventory.md) ·
[ledger](python-audit/existing-rules-ledger.md) ·
[exemplar](python-audit/exemplar-patterns.md) ·
[fixlist](python-audit/fleet-fix-list.md) ·
[sweep](python-audit/verification-sweep.md) ·
[annot](python-typing/annotations-evaluation.md) ·
[proc](python-subprocess/process-control.md) ·
[suite](python-testing/suite-architecture.md) ·
[http](python-http/bot-client-discipline.md) ·
[async](python-async/sdk-concurrency.md) ·
[obs](python-observability/logging-and-output.md) ·
[sec](python-security/untrusted-input.md) ·
[api](python-api-design/sdk-public-surface.md) ·
[data](python-data-modelling/types-and-idioms.md) ·
[single](python-single-file-tools/stdlib-only.md) ·
[exit](python-cli-contract/errors-and-exit-codes.md) ·
[s-canon](python-topic-map/scout-canonical.md) ·
[catalogues](python-topic-map/sweep-canonical-catalogues.md) ·
[s-prac](python-topic-map/scout-practitioner.md) ·
[s-shift](python-topic-map/scout-shifts.md) ·
[s-fail](python-topic-map/scout-failure.md) ·
[fail-cov](python-topic-map/scout-failure-coverage.md) ·
[s-cod](python-topic-map/scout-codified.md) ·
[cod-rec](python-topic-map/codified-reconciled.md) ·
[s-agent](python-topic-map/scout-agent-legibility.md) ·
[s-cli](python-topic-map/scout-cli-acceptance.md) ·
[gate](python-tooling-ci/the-gate.md) ·
[frame](python-frame.md)

**Shapes**: `1` pytest black-box CLI harness · `2` `ocx-sdk-python` · `3` `index/bot` · `4` stdlib single-file tools.
**Coverage**: `covered` = an artifact answers it with evidence · `partial` = named and partly measured · `uncovered` = named, not investigated.
**Severity** is the best rule the topic yields, gated by corpus trust.

### A. Floors, packaging, distribution — 12 rows

| # | Topic | Cov. | Artifact | Sev. | Shapes | Priority for THIS project |
|---|---|---|---|---|---|---|
| A1 | Is a declared `requires-python` floor actually installed and tested, or only asserted? | covered | [floor](python-audit/version-floor.md), [pkg](python-packaging.md) | MUST | 1·2·3·4 | **P1** — the fleet's two largest Python subjects both declare a floor they cannot run on |
| A2 | Do `ocx/test` (real floor 3.12) and `grimoire/test` (real floor 3.11) run on their declared `>=3.10`? | covered | [floor](python-audit/version-floor.md) | MUST | 1 | **P1** — merged: two failures, one rule, one script. A contributor on 3.10 today gets a collection error, not a skip |
| A3 | Are `Programming Language :: Python ::` classifiers and any upper bound matched by a tested matrix? | covered | [pkg](python-packaging.md) | SHOULD | 2 | **P2** — merged classifier and upper-bound candidates; `check-classifiers-tested.sh` exists and is watched, and an unjustified cap makes the SDK uninstallable on 3.14, which is already on this machine |
| A4 | src-layout over flat layout | covered | [pkg](python-packaging.md), [s-prac](python-topic-map/scout-practitioner.md) | SHOULD | 2·3 | **P3** — already satisfied everywhere; preservation, not a fix |
| A5 | Is `py.typed` present *and* packaged in every distributed typed package? | covered | [catalogues](python-topic-map/sweep-canonical-catalogues.md), [pkg](python-packaging.md), [shipped](python-audit/shipped-python.md) | MUST | 2 | **P1** — the catalogue sweep's largest zero-coverage find; a missing marker silently downgrades every SDK consumer to untyped |
| A6 | Are lockfiles committed and verified (`uv lock --check`) in CI? | covered | [posture](python-audit/tooling-posture.md), [pkg](python-packaging.md) | SHOULD | 1·2·3 | **P3** — all 7 lockfiles pass today; encode to keep it |
| A7 | Are declared dependencies the ones actually imported (deptry)? | covered | [pkg](python-packaging.md) | SHOULD | 2·3 | **P2** — the three-way run went 10 → 67 false positives → 0 real; the config is the deliverable |
| A8 | PEP 735 `dependency-groups` over extras for dev dependencies | covered | [pkg](python-packaging.md), [s-shift](python-topic-map/scout-shifts.md) | SHOULD | 2·3 | **P2** — dev extras leak into a consumer's resolution, and this fleet publishes an SDK |
| A9 | PEP 751 `pylock.toml` — migrate off `uv.lock`? | partial | [pkg](python-packaging.md), [s-shift](python-topic-map/scout-shifts.md) | CONSIDER | 2·3 | **P3** — no consumer of a `pylock.toml` exists in this fleet yet; owner decision |
| A10 | Trusted Publishing (OIDC) and PEP 740 attestations over a long-lived token | covered | [pkg](python-packaging.md), [sec](python-security/untrusted-input.md) | SHOULD | 2 | **P2** — merged; nothing publishes to PyPI today, so this is a rule for the moment the SDK does |
| A11 | Is the version single-sourced, and does the built artifact match what the sdist claims? | covered / partial | [pkg](python-packaging.md) | SHOULD | 2 | **P3** — merged; sourcing is already right, artifact verification is named but unmeasured |
| A12 | Does a standalone script declare its floor in a PEP 723 header rather than only in `ruff.toml`? | covered | [single](python-single-file-tools/stdlib-only.md) | SHOULD | 4 | **P2** — this repo's own `make-mark.py` and `check-artifacts.py` declare no floor anywhere in the file; the header's `dependencies` key is confirmed optional |

### B. The gate: lint and type configuration — 23 rows

| # | Topic | Cov. | Artifact | Sev. | Shapes | Priority for THIS project |
|---|---|---|---|---|---|---|
| B1 | Does every Python subject have *any* lint gate? | covered | [posture](python-audit/tooling-posture.md) | MUST | 1·2·3·4 | **P1** — 5 of 9 subjects have none; 297/493 files, ~104k LOC |
| B2 | Does every Python subject have *any* type gate? | covered | [posture](python-audit/tooling-posture.md), [triage](python-audit/pyright-triage.md) | MUST | 1·3·4 | **P1** — same five subjects; both harnesses and the hook fleet are unchecked |
| B3 | Which ruff families actually earn selection *here*? | covered | [cod-rec](python-topic-map/codified-reconciled.md), [posture](python-audit/tooling-posture.md) | n/a (config) | 1·2·3·4 | **P1** — four measured per-shape configs already exist with post-config residuals of 1,051 / 336 / 45 / 17 |
| B4 | Is `--select ALL` a defensible start? | covered | [yield](python-audit/lint-yield.md), [cod-rec](python-topic-map/codified-reconciled.md) | none | all | **P1** decision — no: 15,143 hits on `ocx/test` alone; the measured yield table is the substitute |
| B5 | Is `F821` (undefined name) in the gate? | covered | [annot](python-typing/annotations-evaluation.md), [fixlist](python-audit/fleet-fix-list.md) | MUST | 1 | **P1** — 11 real violations, zero-config catch, one of the four one-line wins |
| B6 | Should pyright run over all of `test/`, or only `test/src/`? | covered | [triage](python-audit/pyright-triage.md), [gate](python-tooling-ci/the-gate.md) | SHOULD | 1 | **P1** decision — `test/src/` only, against ~110 suppressions plus 76 code fixes for the alternative. The two artifacts report 7 and 8 errors on ocx respectively; take the gate dive's **8**, since it ran the exact `--pythonpath` invocation CI would use. grimoire is 0 in both |
| B7 | May an agent run `ruff --fix --unsafe-fixes`? | covered | [cod-rec](python-topic-map/codified-reconciled.md) | MUST (never) | all | **P1** — a policy rule an agent will otherwise violate by default |
| B8 | Is `PLC0415` (import outside top level) a finding or noise here? | covered | [cod-rec](python-topic-map/codified-reconciled.md) | n/a (config) | 1·3 | **P2** — the one new gap the reconciliation found; resolves to a per-file-ignore |
| B9 | Does any second linter (pylint, bandit) earn its place beside ruff? | covered | [s-cod](python-topic-map/scout-codified.md) (B-), [fail-cov](python-topic-map/scout-failure-coverage.md), [sec](python-security/untrusted-input.md) | none | all | **P3** decision — merged three candidates: only pylint R0401 and 5 unported bandit checks survive the gap analysis, all with zero real hits. `scout-codified`'s S-code range for this is fabricated and must not be quoted |
| B10 | Are pytest markers registered (`--strict-markers`)? | covered | [suite](python-testing/suite-architecture.md) | SHOULD | 1·2·3 | **P1** — watched red then green with transcripts; a typo'd marker silently selects nothing today |
| B11 | Are the tool versions themselves pinned by digest? | covered | [posture](python-audit/tooling-posture.md), [pkg](python-packaging.md) | SHOULD | all | **P2** — `ocx.toml`/`ocx.lock` already does this for the Rust side; the Python side is only range-pinned |
| B12 | Should `E501` be enforced? | covered | [yield](python-audit/lint-yield.md) | none | all | **P3** decision — no: the count collapses to near zero at any realistic width, so it buys nothing and costs a reformat |
| B13 | mypy or pyright? | partial | [posture](python-audit/tooling-posture.md), [triage](python-audit/pyright-triage.md) | CONSIDER | 2·3 | **P3** — the fleet is uniformly pyright and no artifact argues for a change |
| B14 | Is a formatter (`ruff format`) enforced anywhere? | covered | [gate](python-tooling-ci/the-gate.md), [posture](python-audit/tooling-posture.md) | SHOULD | all | **P2** — `task verify` already chains `format:check` in 4 of 7 subjects; the three harnesses have no such task at all |
| B15 | Is a generated ruff baseline the right way to adopt a large remainder? | covered | [gate](python-tooling-ci/the-gate.md) | SHOULD | 1 | **P1** decision — **no**: shape 1's 805 decomposes into five named buckets, and a baseline flattens exactly the structure that makes it tractable |
| B16 | Which ratchet actually binds when an agent is the primary author? | covered | [gate](python-tooling-ci/the-gate.md) | MUST | all | **P1** — only a blocking CI status check. A pre-commit hook needs a manual per-clone install and yields to `--no-verify`; a reviewed count needs a human this fleet removed |
| B17 | Do contributors and CI run the same tool? | covered | [gate](python-tooling-ci/the-gate.md) | MUST | all | **P1** — measured live: ruff **0.16.1** on `PATH` against a **0.16.3** project pin. The single `task` command exists for 4 of 7 subjects and is absent for all three harnesses |
| B18 | Can a stale `.ruff_cache` serve a previous version's result? | covered | [gate](python-tooling-ci/the-gate.md) | none | all | **P3** — verified it cannot: the cache nests by version at the directory level. Recorded because it sounds plausible and is not |
| B19 | What does adding lint and type-checking actually cost in CI? | covered | [gate](python-tooling-ci/the-gate.md) | none | all | **P1** — ruff 0.06-0.16s, pyright 1.3-2.7s, against suites of 13.13s / 47.92s / 171.72s. Removes the only stated objection to gating on every push |
| B20 | Is there a test suite that exists, passes, and is invoked by nothing? | covered | [gate](python-tooling-ci/the-gate.md), [posture](python-audit/tooling-posture.md) | SHOULD | 4 | **P1** — `.claude/tests` in two repos: 165+3 and 153 tests, green today, zero CI references. One line fixes it; `ocx-save` has no such suite at all |
| B21 | Is there a check that a configured gate is actually enforced? | covered | [gate](python-tooling-ci/the-gate.md) | MUST | all | **P1** — `gate-exists.sh` generalises the floor-check pattern, watched red on both `.claude/tests` and silent on all six enforced subjects |
| B22 | Are blanket suppressions (`# noqa`/`# type: ignore` with no code) kept at zero? | covered | [gate](python-tooling-ci/the-gate.md), [cod-rec](python-topic-map/codified-reconciled.md) | SHOULD | all | **P2** — `PGH` is 0 fleet-wide today; the rule protects that, because a blanket suppression is the fastest path an agent has to green |
| B23 | Does an added `ignore` entry carry a reason? | covered | [gate](python-tooling-ci/the-gate.md) | SHOULD | all | **P2** — the fleet's own convention already does this (`grimoire-lore/ruff.toml:32-39`); an unexplained new entry is the tell that a gate was widened rather than satisfied |

### C. Typing and annotation evaluation — 15 rows

| # | Topic | Cov. | Artifact | Sev. | Shapes | Priority for THIS project |
|---|---|---|---|---|---|---|
| C1 | Does anything depend on annotation-evaluation timing it has not checked (PEP 563/649/749)? | covered | [annot](python-typing/annotations-evaluation.md) | MUST | 1·2·3·4 | **P1** — a 4-mode behaviour matrix across the fleet's two floors, plus 11 real F821 |
| C2 | Adopt `from __future__ import annotations` fleet-wide, per-file, or not at all? | covered | [annot](python-typing/annotations-evaluation.md) | SHOULD | all | **P1** — resolved; see Resolved contradictions |
| C3 | Is `TC` (flake8-type-checking) safe to adopt here? | covered | [annot](python-typing/annotations-evaluation.md), [cod-rec](python-topic-map/codified-reconciled.md) | SHOULD | 2·3 | **P1** — resolved: `TC` manufactures the F821 failure mode at scale, so not before F821 is gating |
| C4 | Does anything call `get_type_hints()` or `inspect.signature(eval_str=True)`? | covered | [annot](python-typing/annotations-evaluation.md) | MUST | 2 | **P1** — the double-stringize hazard silently yields the *string*, not the type; runtime introspection is the SDK's blind spot |
| C5 | Modern spellings: `X \| None`, `list[X]`, `dict[K,V]` (UP006/UP035/UP045) | covered | [ledger](python-audit/existing-rules-ledger.md), [s-shift](python-topic-map/scout-shifts.md) | SHOULD | all | **P2** — merged from three scouts; already goes red, so this is a config line rather than prose |
| C6 | Is `Any` used where a real type exists? | partial | [data](python-data-modelling/types-and-idioms.md), [posture](python-audit/tooling-posture.md) | SHOULD | 2·3 | **P2** — measured only indirectly; the `cast()` audit is the concrete half |
| C7 | When is `cast()` legitimate? | covered | [data](python-data-modelling/types-and-idioms.md), [http](python-http/bot-client-discipline.md) | SHOULD | 3 | **P1** — 56 sites in `index/bot`, split two ways by two artifacts that agree on the total; the 32 argparse casts are a fixable class |
| C8 | `TypedDict` with `Required`/`NotRequired` at JSON boundaries | covered | [data](python-data-modelling/types-and-idioms.md) | SHOULD | 3 | **P2** — the registry-JSON boundary is where the remaining casts concentrate |
| C9 | Typing features with no applicable surface here: PEP 695 generics, `Unpack[TypedDict]`, `LiteralString` | covered / uncovered | [s-shift](python-topic-map/scout-shifts.md), [catalogues](python-topic-map/sweep-canonical-catalogues.md), [data](python-data-modelling/types-and-idioms.md) | CONSIDER | 2 | **P3** — merged three candidates: 3.12-gated with no generic surface, no `**kwargs` public API, and zero SQL or shell string sinks to protect |
| C10 | `Final`, `ClassVar`, `NewType` discipline | partial | [catalogues](python-topic-map/sweep-canonical-catalogues.md), [data](python-data-modelling/types-and-idioms.md) | CONSIDER | 2·3 | **P3** — merged three catalogue candidates; real but low-yield against a 100%-annotated codebase |
| C11 | `@deprecated` (PEP 702) on a public API | covered | [api](python-api-design/sdk-public-surface.md) | SHOULD | 2 | **P2** — `reportDeprecated` is an error only at Strict, which the SDK runs; a consumer at Standard sees nothing |
| C12 | `reportMatchNotExhaustive` is silently off below Strict | covered | [data](python-data-modelling/types-and-idioms.md) | MUST | 2·3 | **P1** — a named silent-off trap: anyone copying a Standard-mode config loses the check with no diagnostic |
| C13 | Which pyright rules are already errors at Basic (`reportUnhashable`, `reportPrivateImportUsage`)? | covered | [data](python-data-modelling/types-and-idioms.md), [api](python-api-design/sdk-public-surface.md), [fail-cov](python-topic-map/scout-failure-coverage.md) | SHOULD | 2·3 | **P2** — merged; corrects a stale "nothing catches this" and gives the cheapest guard on the SDK's re-export surface |
| C14 | Are annotations complete, and over which trees (ANN)? | covered | [cod-rec](python-topic-map/codified-reconciled.md) | SHOULD | 2·3 | **P2** — scope-refined to `src/`; over `test/` it is 2,510 hits of noise |
| C15 | Protocol over ABC for structural boundaries | partial | [data](python-data-modelling/types-and-idioms.md), [s-prac](python-topic-map/scout-practitioner.md) | CONSIDER | 2 | **P3** — argued by practitioners, not measured against this codebase |

### D. Test-suite architecture — 20 rows

| # | Topic | Cov. | Artifact | Sev. | Shapes | Priority for THIS project |
|---|---|---|---|---|---|---|
| D1 | Is `time.sleep` ever acceptable in a test? | covered | [suite](python-testing/suite-architecture.md), [s-cli](python-topic-map/scout-cli-acceptance.md) | SHOULD | 1 | **P1** — resolved into a three-category taxonomy; the harnesses use all three and only one is defensible |
| D2 | May a test mutate `os.environ`? | covered | [suite](python-testing/suite-architecture.md) | MUST | 1 | **P1** — resolved with a hook-only carve-out; under xdist an unscoped mutation is a cross-worker bug |
| D3 | Substring assertions or golden/snapshot blobs? | covered | [suite](python-testing/suite-architecture.md), [s-cli](python-topic-map/scout-cli-acceptance.md), [harness](python-audit/harness-shape.md) | SHOULD | 1 | **P1** — resolved per shape; the fleet is 369/201 substring against 10/9 whole-blob, so the decision is load-bearing |
| D4 | Are fixtures xdist-safe? | covered | [suite](python-testing/suite-architecture.md) | SHOULD | 1 | **P3** — a full audit found **zero** silently-unsafe fixtures; preservation |
| D5 | Is fixture scope (session/module/function) chosen deliberately? | covered | [suite](python-testing/suite-architecture.md) | SHOULD | 1·2·3 | **P2** — the scope ladder is the mechanism behind D4 holding |
| D6 | `pytest.raises` without `match=` (PT011) | covered | [ledger](python-audit/existing-rules-ledger.md), [cod-rec](python-topic-map/codified-reconciled.md) | SHOULD | 1·2·3 | **P1** — one of the 6 shipped rules that *cannot go red* as configured; fixing the config is a one-line win |
| D7 | Is `S101` exempted for test code? | covered | [ledger](python-audit/existing-rules-ledger.md) | n/a (config) | 1·2·3 | **P2** — settled for tests; contested for `check-artifacts.py`, see M3 |
| D8 | Is the coverage number real, and is branch coverage on? | covered | [shipped](python-audit/shipped-python.md), [suite](python-testing/suite-architecture.md) | SHOULD | 2·3 | **P3** — merged; verified live at 100% with 396 branches, so encode to keep |
| D9 | Should mutation testing gate anything? | partial | [suite](python-testing/suite-architecture.md) | CONSIDER | 2·3 | **P3** — Batchelder's argument recorded, no run performed; Deferred |
| D10 | Are doctests collected and gated (Sybil)? | covered | [shipped](python-audit/shipped-python.md), [single](python-single-file-tools/stdlib-only.md) | SHOULD | 2·4 | **P2** — the SDK's doctests are executable documentation already in the gate; the rule keeps them there |
| D11 | Is `pytest-timeout` configured, and with which method? | covered | [proc](python-subprocess/process-control.md) | MUST | 1 | **P1** — this is what replaced the retracted per-call-timeout rule; signal-vs-thread matters for subprocess-driven tests |
| D12 | Does CI set `timeout-minutes`? | covered | [proc](python-subprocess/process-control.md) | MUST | 1 | **P1** — absent today; a hung harness burns the 360-minute default |
| D13 | Is `-v` actually reaching pytest? | covered | [proc](python-subprocess/process-control.md) | MUST | 1 | **P1** — silently dropped by Task's `default` templating, so a failure today reports less than its author intended |
| D14 | Is `PYTHONUNBUFFERED=1` set, and is JUnit XML preserved on cancel? | covered | [proc](python-subprocess/process-control.md) | SHOULD | 1 | **P1** — merged; block-buffered stdout plus a lost report means a cancelled run yields nothing |
| D15 | In-process CLI testing or subprocess? | covered | [s-cli](python-topic-map/scout-cli-acceptance.md), [exit](python-cli-contract/errors-and-exit-codes.md) | SHOULD | 1·3 | **P1** — resolved per shape; half the comparison corpus turned out to be in-process and therefore not comparable |
| D16 | Do the two sibling harnesses' `conftest.py` files agree? | covered | [harness](python-audit/harness-shape.md) | SHOULD | 1 | **P2** — 694 of 750 lines differ between two harnesses of the same shape, with no owner |
| D17 | Is `pexpect`/PTY interaction bounded? | partial | [harness](python-audit/harness-shape.md), [proc](python-subprocess/process-control.md) | SHOULD | 1 | **P2** — the shape is named, the sites are not individually audited |
| D18 | Is a docker-driven test's container reaped on failure? | uncovered | [harness](python-audit/harness-shape.md) names the shape | none | 1 | **P2** — real, uninvestigated; Deferred |
| D19 | Test-quality topics with no live instance here: `pytest.approx()`, diagnostic failure messages, xdist distribution mode | uncovered / partial | [catalogues](python-topic-map/sweep-canonical-catalogues.md), [suite](python-testing/suite-architecture.md), [s-cli](python-topic-map/scout-cli-acceptance.md) | CONSIDER | 1 | **P3** — merged three thin candidates: no float assertions anywhere, and no defect found in the other two |
| D20 | Does a tool's embedded `--self-test` substitute for a suite, and until when? | covered | [single](python-single-file-tools/stdlib-only.md) | SHOULD | 4 | **P2** — the pattern is right for shape 4; the threshold at which it stops being right is stated |

### E. Subprocess and process control — 6 rows

| # | Topic | Cov. | Artifact | Sev. | Shapes | Priority for THIS project |
|---|---|---|---|---|---|---|
| E1 | Does every `subprocess.run` need `timeout=`? | covered | [proc](python-subprocess/process-control.md), [s-cli](python-topic-map/scout-cli-acceptance.md), [fail-cov](python-topic-map/scout-failure-coverage.md) | none | 1 | **P1** decision — **no**, retracted: 610 hits ranked #1 by the failure scout, overturned once pip, pytest and uv were all shown to ship none |
| E2 | Can a `Popen` read deadlock on a full pipe (64 KiB per stream)? | covered | [proc](python-subprocess/process-control.md) | MUST | 1 | **P1** — 7 direct `Popen` sites assessed: 1 real deadlock, 3 fragile, 2 safe |
| E3 | Are spawned children orphaned on cancel (gh-88050), and is `start_new_session` + `os.killpg` the answer? | covered | [proc](python-subprocess/process-control.md) | SHOULD | 1 | **P2** — merged problem and mechanism; cancellation does not kill subprocesses, so a cancelled CI run leaves them |
| E4 | `shell=True` / `os.system` (S602, S605) | covered | [sec](python-security/untrusted-input.md) | MUST | all | **P3** — zero hits fleet-wide; preventive |
| E5 | Is `check=True` used, and is subprocess output decoded with an explicit encoding? | partial | [harness](python-audit/harness-shape.md), [single](python-single-file-tools/stdlib-only.md) | SHOULD | 1·4 | **P2** — merged; counted in aggregate, never classified per site |
| E6 | Do the hook scripts time out their shell-outs? | covered | [single](python-single-file-tools/stdlib-only.md) | SHOULD | 4 | **P3** — satisfied everywhere at 5s or 10s; the one robustness property shape 4 gets right by default |

### F. Async and structured concurrency — 8 rows

| # | Topic | Cov. | Artifact | Sev. | Shapes | Priority for THIS project |
|---|---|---|---|---|---|---|
| F1 | `TaskGroup` over `gather` over bare `create_task`, and threads or asyncio at all? | covered | [async](python-async/sdk-concurrency.md), [s-prac](python-topic-map/scout-practitioner.md) | SHOULD | 2 | **P2** — merged; the SDK is the fleet's only async surface and already satisfies this, and `index/bot` correctly has none |
| F2 | Is a bare `create_task` reference held (RUF006)? | covered | [async](python-async/sdk-concurrency.md), [fail-cov](python-topic-map/scout-failure-coverage.md) | SHOULD | 2 | **P2** — corrects a stale "nothing catches this"; a dropped task is garbage-collected mid-flight |
| F3 | Is `CancelledError` swallowed by `except Exception`? | covered | [async](python-async/sdk-concurrency.md) | MUST | 2 | **P1** — `BaseException` since 3.8; the failure mode is a hang, not an error |
| F4 | `asyncio.timeout()` over `wait_for` | covered | [async](python-async/sdk-concurrency.md), [s-shift](python-topic-map/scout-shifts.md) | SHOULD | 2 | **P2** — merged from two scouts; floor-satisfied at 3.12 |
| F5 | Which `ASYNC` rules are noise here (ASYNC109, ASYNC115)? | covered | [async](python-async/sdk-concurrency.md) | none | 2 | **P3** — merged: all 6 ASYNC109 hits resolve to one `asyncio.timeout(timeout)` scope, and ASYNC115 was verified not to fire on the `asyncio.sleep(0)` yield idiom. Together they remove the blocker to selecting the family |
| F6 | Blocking calls inside a coroutine (ASYNC2xx) | covered | [async](python-async/sdk-concurrency.md), [cod-rec](python-topic-map/codified-reconciled.md) | SHOULD | 2 | **P1** — the `ASYNC` family is unselected in both async-capable subjects |
| F7 | Is `asyncio.run` called exactly once, at the entrypoint? | covered | [async](python-async/sdk-concurrency.md) | SHOULD | 2 | **P2** — satisfied; cheap to encode |
| F8 | Does the fleet break under free threading (3.13t/3.14t)? | covered | [floor](python-audit/version-floor.md), [single](python-single-file-tools/stdlib-only.md) | none | all | **P3** — 954/762 tests pass unchanged on 3.14t; explicitly not a defect |

### G. HTTP client discipline — 10 rows

| # | Topic | Cov. | Artifact | Sev. | Shapes | Priority for THIS project |
|---|---|---|---|---|---|---|
| G1 | Is the client constructed once, or per call? | covered | [http](python-http/bot-client-discipline.md) | MUST | 3 | **P1** — 14 construction sites in `github_api.py` alone; connection pooling and the timeout default are both lost |
| G2 | Is a timeout set as a client-level default on every request? | covered | [http](python-http/bot-client-discipline.md) | MUST | 3 | **P1** — the one place in the fleet where a missing timeout *is* a defect, unlike E1 |
| G3 | Is a response body read unbounded (`.content`/`.text`)? | covered | [http](python-http/bot-client-discipline.md), [sec](python-security/untrusted-input.md) | MUST | 3 | **P1** — uncapped today; a hostile or broken registry response is an OOM |
| G4 | Is redirect-following host-checked (SSRF)? | covered | [http](python-http/bot-client-discipline.md) | MUST | 3 | **P1** — `registry_v2.py` has the check, `_paginate` does not; the fix is a copy |
| G5 | Are retries bounded and is `Retry-After` parsed defensively? | covered | [http](python-http/bot-client-discipline.md) | SHOULD | 3 | **P2** — a server-controlled header currently reaches a sleep unvalidated |
| G6 | Are untrusted header values `!r`-quoted before they are printed (CWE-150)? | covered | [http](python-http/bot-client-discipline.md), [obs](python-observability/logging-and-output.md) | SHOULD | 3 | **P2** — terminal-escape injection through a log line; both artifacts agree |
| G7 | Is `raise_for_status()` called, or the status silently ignored? | covered | [http](python-http/bot-client-discipline.md) | MUST | 3 | **P1** — a 404 body parsed as success is the classic silent-wrong-answer |
| G8 | Is response JSON validated before it is `cast()`? | covered | [http](python-http/bot-client-discipline.md), [data](python-data-modelling/types-and-idioms.md) | SHOULD | 3 | **P1** — the 12 registry-JSON casts are exactly this; the two artifacts reconcile on the count |
| G9 | Is `verify=False` ever set? | covered | [sec](python-security/untrusted-input.md) | MUST | 3 | **P3** — zero hits; preventive |
| G10 | Are the LLM-typical client mistakes mechanically checkable? | covered | [http](python-http/bot-client-discipline.md) | SHOULD | 3 | **P1** — all 7 checks watched red then green: the strongest verification set in the corpus |

### H. Errors, exit codes, CLI contract — 13 rows

| # | Topic | Cov. | Artifact | Sev. | Shapes | Priority for THIS project |
|---|---|---|---|---|---|---|
| H1 | Does `main()` return `int`, never `bool`? | covered | [exit](python-cli-contract/errors-and-exit-codes.md) | MUST | 3·4 | **P1** — the inversion was reproduced: `return True` exits **1** while printing a success message |
| H2 | Is `sys.exit(main())` present exactly once, under `__main__`? | covered | [exit](python-cli-contract/errors-and-exit-codes.md) | SHOULD | 3·4 | **P2** — three distinct entrypoint shapes coexist today, and `make-mark.py` has no exit contract at all |
| H3 | Is the exit-code set pinned (`0/1/2/65/75`)? | covered | [exit](python-cli-contract/errors-and-exit-codes.md) | SHOULD | 3·4 | **P2** — `index/bot` already pins it via ADR-4; the table is the cross-language agreement point. No subject has a `--json` mode, so the "does a fatal path respect `--json`" candidate has no live instance |
| H4 | Should Python remap argparse's `2` to sysexits' `64`? | covered | [exit](python-cli-contract/errors-and-exit-codes.md) | none | 3·4 | **P1** decision — **no**; reconcile at the orchestration layer instead |
| H5 | Is `BrokenPipeError` handled on any multi-line stdout stream? | covered | [exit](python-cli-contract/errors-and-exit-codes.md), [single](python-single-file-tools/stdlib-only.md) | MUST | 4 | **P1** — reproduced twice against this repo's own gate: exit 120, 73,631 bytes against a 64 KiB pipe buffer |
| H6 | Can a crash exit `0`? (crash versus failure) | covered | [exit](python-cli-contract/errors-and-exit-codes.md), [single](python-single-file-tools/stdlib-only.md) | MUST | 3·4 | **P1** — the defining property of a gate, and it is satisfied by *omitting* a catch-all, which is easy to "fix" away |
| H7 | Is a top-level `except Exception` documented against the harness contract that requires it? | covered | [single](python-single-file-tools/stdlib-only.md), [exit](python-cli-contract/errors-and-exit-codes.md) | MUST | 4 | **P1** — distinguishes the 3 correct hook swallows from an accidental one; the check is the adjacent comment |
| H8 | Does `except Exception` catch `KeyboardInterrupt`? | covered | [ledger](python-audit/existing-rules-ledger.md), [exit](python-cli-contract/errors-and-exit-codes.md) | MUST | all | **P1** — it does not. This is the false MUST shipping in four repos today |
| H9 | Bare `except:` (E722) and broken `raise ... from` chains (B904) | covered | [ledger](python-audit/existing-rules-ledger.md) | MUST | all | **P2** — merged; both already go red, so both are config lines |
| H10 | Are `TRY` and `EM` worth selecting? | covered | [cod-rec](python-topic-map/codified-reconciled.md) | none | all | **P3** decision — fully overturned against measured hits; do not select |
| H11 | Should a long-running tool catch `KeyboardInterrupt` cleanly? | covered | [exit](python-cli-contract/errors-and-exit-codes.md) | CONSIDER | 3·4 | **P3** — SIGINT → 130 with a traceback reproduced; no subject is long-running enough for it to matter yet |
| H12 | Preventive zero-hit CLI checks: `os._exit`, `exit()`/`quit()`, `type=bool` in argparse | covered | [exit](python-cli-contract/errors-and-exit-codes.md), [single](python-single-file-tools/stdlib-only.md) | MUST | 3·4 | **P3** — merged three checks, all zero hits today; `bool("False") is True` is the one an agent will introduce |
| H13 | Is a file written atomically (temp plus `Path.replace`)? | covered | [exit](python-cli-contract/errors-and-exit-codes.md) | SHOULD | 3·4 | **P2** — 6 non-atomic `write_text` sites in `hook_utils.py`, including the concurrency lock file; the reference implementation already exists in `index/bot` |

### I. Logging and output — 9 rows

| # | Topic | Cov. | Artifact | Sev. | Shapes | Priority for THIS project |
|---|---|---|---|---|---|---|
| I1 | Which subjects actually use `logging`? | covered | [obs](python-observability/logging-and-output.md) | n/a | 2 | **P1** — premise correction: `ocx-sdk-python` is the only one, fleet-wide |
| I2 | `G004` f-string-in-log | covered | [obs](python-observability/logging-and-output.md), [cod-rec](python-topic-map/codified-reconciled.md) | none | — | **P3** — fleet-wide count is **zero**; the `G`/`LOG` families buy nothing here |
| I3 | Does a library configure the root logger, and does its own logger carry a `NullHandler`? | covered | [obs](python-observability/logging-and-output.md) | MUST | 2 | **P1** — merged problem and remedy; a library that configures logging hijacks its consumer's output |
| I4 | Are secrets redacted before they are logged (CWE-532)? | covered | [sec](python-security/untrusted-input.md), [obs](python-observability/logging-and-output.md) | MUST | 2·3 | **P1** — `index/bot` handles registry tokens, and the hook fleet already has a `detect_secrets()` it reuses across scripts |
| I5 | Are terminal escapes stripped from untrusted text before printing? | covered | [obs](python-observability/logging-and-output.md), [sec](python-security/untrusted-input.md) | SHOULD | 3·4 | **P2** — the same CWE-150 as G6, at the output boundary rather than the header |
| I6 | Are typed exit codes the machine-readable channel instead of scraped logs? | covered | [obs](python-observability/logging-and-output.md), [exit](python-cli-contract/errors-and-exit-codes.md) | SHOULD | 3 | **P1** — the dive's Rule 13; `index/bot` is the reference implementation and the pattern generalises to shape 4 |
| I7 | stdout for output, stderr for messages about the run | covered | [exit](python-cli-contract/errors-and-exit-codes.md), [obs](python-observability/logging-and-output.md) | MUST | 3·4 | **P1** — `index/bot` gets it right and is the model; nothing states the rule anywhere today |
| I8 | `print()` in library code (T20) | covered | [cod-rec](python-topic-map/codified-reconciled.md), [obs](python-observability/logging-and-output.md) | SHOULD | 2 | **P2** — in the actionable ruff subset, scoped to `src/` only |
| I9 | Is `logging` the wrong tool when stdout *is* a protocol, and should colour be TTY-gated? | covered | [single](python-single-file-tools/stdlib-only.md), [obs](python-observability/logging-and-output.md) | SHOULD | 4 | **P2** — merged; a hook's stdout is a JSON wire format that handler machinery corrupts, and nothing emits colour today |

### J. Security and untrusted input — 10 rows

| # | Topic | Cov. | Artifact | Sev. | Shapes | Priority for THIS project |
|---|---|---|---|---|---|---|
| J1 | Is extraction bounded, symlink-checked, filtered, and traversal-checked (CVE-2007-4559, PEP 706, CWE-22)? | covered | [sec](python-security/untrusted-input.md) | MUST | 2·3 | **P2** — merged four candidates onto the same two call sites: **2 real extraction sites fleet-wide, both already safe**; the rule preserves that |
| J2 | Are decompression bombs bounded (CWE-409)? | covered | [sec](python-security/untrusted-input.md) | MUST | 3 | **P2** — the registry path decompresses attacker-influenced blobs |
| J3 | Zero-hit S-family checks: `pickle`, `eval` via S307, `yaml.load`, `mktemp`, weak hashes | covered | [sec](python-security/untrusted-input.md), [ledger](python-audit/existing-rules-ledger.md) | MUST | all | **P2** — merged five topics. The actionable half is that **`S307` is one of the 6 shipped rules that cannot go red as configured** |
| J4 | Hardcoded secrets (S105/S106) | covered | [sec](python-security/untrusted-input.md) | SHOULD | all | **P3** — 3 of 4 fleet-wide hits are false positives; this needs a suppression convention more than a severity |
| J5 | Is `pip-audit` in CI? | covered | [sec](python-security/untrusted-input.md) | SHOULD | 2·3 | **P2** — one runtime-reachable finding (idna in `ocx-mirror-sdk`); the gitpython CVEs are docs-only |
| J6 | Is `zizmor` run over the workflows? | covered | [sec](python-security/untrusted-input.md), [gate](python-tooling-ci/the-gate.md) | MUST | all | **P1** — run fleet-wide at 1.29.0 across 7 repos; `index/bot` is at **zero findings**, `ocx-save` has the highest density |
| J7 | Does `${{ }}` ever interpolate directly into a `run:` block? | covered | [gate](python-tooling-ci/the-gate.md) | MUST | all | **P1** — the highest-value real finding: `ocx-save/test-install-scripts.yml` (9 hits) plus `release.yml:79` in three repos, against a rule those same repos already state elsewhere |
| J8 | Are third-party Actions SHA-pinned in *every* workflow, release included? | covered | [gate](python-tooling-ci/the-gate.md) | SHOULD | all | **P2** — an inconsistency inside each repo, not a fleet gap: `verify-basic.yml` pins by SHA while `release.yml` floats `@v6`/`@v7` — in the one workflow that ships artifacts |
| J9 | Is `persist-credentials: false` set on checkouts (`artipacked`)? | covered | [gate](python-tooling-ci/the-gate.md) | CONSIDER | all | **P3** — 45 combined hits, lowest severity and auto-fixable; `grimoire-lore`'s own workflows already get it right everywhere |
| J10 | Is `grimoire-lore`'s own `pull_request_target` sound? | covered | [gate](python-tooling-ci/the-gate.md) | none | all | **P1** as a *clearance* — read in full: data-only checkout into `pr-tree/`, `persist-credentials: false`, nothing executed, paths through a file not argv, `permissions: {}`. Zizmor is right to flag the class; this implementation survives it |

### K. Public API surface — 7 rows

| # | Topic | Cov. | Artifact | Sev. | Shapes | Priority for THIS project |
|---|---|---|---|---|---|---|
| K1 | Is `__all__` declared, and is drift in it caught by the API-diff gate? | covered | [api](python-api-design/sdk-public-surface.md) | SHOULD | 2 | **P1** — merged; `griffe check` catches a full removal but **not** `__all__`-only drift, and that gap is the rule |
| K2 | Does anything leak out of `__init__.py` unintentionally? | covered | [api](python-api-design/sdk-public-surface.md) | MUST | 2 | **P1** — one live violation: `PackageNotFoundError` at `__init__.py:28` |
| K3 | Are optional public parameters keyword-only? | covered | [api](python-api-design/sdk-public-surface.md) | SHOULD | 2 | **P2** — tested against a planted violation |
| K4 | Is the exception hierarchy public, stable, and 1:1 with exit codes? | covered | [api](python-api-design/sdk-public-surface.md), [exit](python-cli-contract/errors-and-exit-codes.md) | SHOULD | 2·3 | **P2** — the two artifacts split this deliberately: hierarchy shape here, exit mapping in H3 |
| K5 | Is subclassing of public classes intended or accidental? | covered | [s-prac](python-topic-map/scout-practitioner.md), [api](python-api-design/sdk-public-surface.md) | CONSIDER | 2 | **P3** — Schlawack's argument, with no measured violation here |
| K6 | Are private names actually private and not imported cross-module (SLF)? | covered | [cod-rec](python-topic-map/codified-reconciled.md) | none | all | **P3** decision — `SLF` fully overturned against measured hits; do not select |
| K7 | Does a substring name collision make a symbol ungreppable? | covered | [s-agent](python-topic-map/scout-agent-legibility.md) (C) | CONSIDER | all | **P2** — one real defect found (`push_blob`/`_push_blob` in `ocx/test/src/registry.py`); the C grade caps this at CONSIDER regardless of how real the instance is |

### L. Data modelling and idioms — 12 rows

| # | Topic | Cov. | Artifact | Sev. | Shapes | Priority for THIS project |
|---|---|---|---|---|---|---|
| L1 | `frozen=True, slots=True` on dataclasses | covered | [data](python-data-modelling/types-and-idioms.md) | SHOULD | 2·3 | **P2** — 50/51 and 22/24 already; the rule catches the next one, not these |
| L2 | Already-red idiom rules: mutable defaults (B006), `is` on literals (F632), star-imports (F403) | covered | [ledger](python-audit/existing-rules-ledger.md), [catalogues](python-topic-map/sweep-canonical-catalogues.md) | MUST | all | **P2** — merged three, plus the catalogue's aliasing candidate which resolves to B006; all already go red |
| L3 | Mutable class attributes (RUF012) | covered | [fail-cov](python-topic-map/scout-failure-coverage.md), [data](python-data-modelling/types-and-idioms.md) | SHOULD | 2·3 | **P2** — corrects a stale "nothing catches this" |
| L4 | `__eq__` without `__hash__`, and unhashable defaults | covered | [data](python-data-modelling/types-and-idioms.md) | SHOULD | 2·3 | **P2** — pyright catches half of it from Basic, see C13 |
| L5 | `Enum`/`StrEnum` over bare string literals | covered | [data](python-data-modelling/types-and-idioms.md) | SHOULD | 2·3 | **P2** — `index/bot`'s `ExitCode` `IntEnum` is the in-repo model |
| L6 | Is serialization deterministic (sorted keys, no set iteration)? | covered | [data](python-data-modelling/types-and-idioms.md) | MUST | 3 | **P1** — `index/bot` writes files a digest is taken over, so nondeterminism there is a reproducibility bug |
| L7 | Are datetimes timezone-aware (DTZ)? | covered | [cod-rec](python-topic-map/codified-reconciled.md), [posture](python-audit/tooling-posture.md) | SHOULD | 2·3 | **P2** — in the actionable ruff subset |
| L8 | Stale-belief bugbear rules: `functools.cache` on stateful methods (B019), mutation while iterating (B909) | covered | [fail-cov](python-topic-map/scout-failure-coverage.md) | SHOULD | 2·3 | **P2** — merged; both were believed uncatchable and both are caught by config |
| L9 | `attrs` versus `dataclasses` versus `pydantic` | covered | [s-prac](python-topic-map/scout-practitioner.md), [data](python-data-modelling/types-and-idioms.md) | CONSIDER | 2·3 | **P3** decision — the SDK's zero-runtime-dependency constraint settles it: stdlib dataclasses |
| L10 | CPython #108611 dataclass MRO bug | covered | [data](python-data-modelling/types-and-idioms.md) | none | — | **P3** — confirmed open upstream, inert here: zero diamond inheritance in the fleet |
| L11 | Canonical traps with no instance here: `except X as e` scope deletion, `super()`/MRO, descriptors, `__getattr__` recursion | uncovered | [catalogues](python-topic-map/sweep-canonical-catalogues.md) | CONSIDER | all | **P3** — merged four canonical candidates; zero `__getattr__` and no deep hierarchies anywhere in the fleet |
| L12 | Exception over BaseException as the base for a new exception type | covered | [catalogues](python-topic-map/sweep-canonical-catalogues.md), [exit](python-cli-contract/errors-and-exit-codes.md) | MUST | 2·3 | **P2** — the same fact H8 turns on, stated from the authoring side |

### M. Single-file stdlib tools — 9 rows

| # | Topic | Cov. | Artifact | Sev. | Shapes | Priority for THIS project |
|---|---|---|---|---|---|---|
| M1 | `sys.path.insert` for N siblings sharing one un-installed module | covered | [single](python-single-file-tools/stdlib-only.md) | none | 4 | **P3** — explicitly correct here; recorded so nobody "fixes" it into a package |
| M2 | When does a shared `utils` module split? | covered | [single](python-single-file-tools/stdlib-only.md) | CONSIDER | 4 | **P3** — `hook_utils.py` at 688 lines carries two concerns used by disjoint script sets |
| M3 | Does a `--self-test` survive `python -O`? | covered | [single](python-single-file-tools/stdlib-only.md) | MUST | 4 | **P1** — demonstrated cannot-go-red against a planted regression in this repo's own publishing gate; the fix already exists in `make-mark.py` |
| M4 | Is `encoding="utf-8"` explicit on every text I/O? | covered | [single](python-single-file-tools/stdlib-only.md) | SHOULD | 4 | **P2** — exactly two confirmed bare `open()` sites (`hook_utils.py:244,270`), plus a broader `Path` I/O gap |
| M5 | Is an optional dependency probed with a *distinguishable* fallback path? | covered | [single](python-single-file-tools/stdlib-only.md) | MUST | 4 | **P1** — this repository shipped exactly this bug and fixed it in `8581552`: a check went permanently, silently green |
| M6 | Is module-level import cost zero beyond stdlib, and are append-only logs bounded? | covered | [single](python-single-file-tools/stdlib-only.md) | CONSIDER | 4 | **P3** — merged; both satisfied, and both matter because these run on every tool event |
| M7 | Does a per-event hook make a network call, and does any of this run on Windows? | covered | [single](python-single-file-tools/stdlib-only.md) | SHOULD | 4 | **P3** — merged; zero network calls today, Linux-only by CI |
| M8 | `pathlib` over `os.path` (PTH), and shebang/exec-bit consistency (EXE) | covered | [single](python-single-file-tools/stdlib-only.md) | SHOULD | all | **P3** — merged; both already correct by discipline, but no ruff config scopes either hook fleet |
| M9 | Is the tool safe to run concurrently with itself? | covered | [single](python-single-file-tools/stdlib-only.md) | SHOULD | 4 | **P2** — `os.mkdir` atomicity is the mechanism, but the lock file it protects is written non-atomically, see H13 |

### N. Agent legibility — 2 rows

| # | Topic | Cov. | Artifact | Sev. | Shapes | Priority for THIS project |
|---|---|---|---|---|---|---|
| N1 | Is Python harder for a coding agent than Rust or Go, such that rules should compensate? | covered | [s-agent](python-topic-map/scout-agent-legibility.md) (C), [sweep](python-audit/verification-sweep.md) | none | all | **P1** as a *rejection* — the dive's own benchmark evidence runs opposite the headline claim; no agent-legibility rule category will be authored |
| N2 | Should any of the 15 agent-legibility candidates survive? | covered | [s-agent](python-topic-map/scout-agent-legibility.md) (C), [sweep](python-audit/verification-sweep.md) | CONSIDER | all | **P2** — 6 of 15 rows are unsound (rules 3 and 6 always pass; rule 9 is inverted); the survivors fold into naming (K7) and typing (C6) |

### O. Catalog self-state — 7 rows

| # | Topic | Cov. | Artifact | Sev. | Shapes | Priority for THIS project |
|---|---|---|---|---|---|---|
| O1 | Does `grimoire-lore` ship any Python rules today? | covered | [config-inv](python-audit/config-inventory.md) | n/a | all | **P1** — **zero**. This is the gap the whole wave exists to close |
| O2 | Who owns `quality-python.md`, byte-identical in four repos? | covered | [config-inv](python-audit/config-inventory.md) | SHOULD | all | **P1** — md5 `46b9f0ac8545b5551fa60f48d2ef2753` in three repos, diff-identical in a fourth, owned by nobody |
| O3 | Does `product-tech-strategy.md` describe the harnesses correctly? | covered | [ledger](python-audit/existing-rules-ledger.md), [config-inv](python-audit/config-inventory.md) | MUST (fix) | 1 | **P1** — its always-on claims (`Python 3.13+`, `uv+Ruff`) are false for `test/` |
| O4 | Which rule-ID prefixes are already taken? | covered | [config-inv](python-audit/config-inventory.md) | n/a | all | **P1** — 30 prefixes in use; an authoring constraint, not a finding |
| O5 | Is `ocx-mirror-sdk` in scope? | covered | [shipped](python-audit/shipped-python.md), [config-inv](python-audit/config-inventory.md), [exemplar](python-audit/exemplar-patterns.md) | SHOULD | 2 | **P2** — a sixth, unlisted shipped package carrying an accidentally always-on 192-line rule file |
| O6 | Do the wave's own verifications go red? | covered | [sweep](python-audit/verification-sweep.md) | MUST | all | **P1** — 38 cells swept: 25 sound, 5 cannot-go-red, 4 could-not-run, 3 ambiguous, 1 inverted. No rule ships on an unswept cell |
| O7 | Do the corpus's four lost AST checker scripts need rebuilding? | covered | [sweep](python-audit/verification-sweep.md), [exemplar](python-audit/exemplar-patterns.md) | n/a | 2·3 | **P2** — the 4 "could not run" cells; Deferred |

---

## Rules ready to author

**120 rules.** The subset that survived all three filters: a verification
someone actually watched go red, a named failure mode, and evidence from a
B-or-better artifact. Everything sourced only to
[scout-agent-legibility](python-topic-map/scout-agent-legibility.md) (C) is
capped at CONSIDER here regardless of how real its instance is. Rows are grouped
by the file they get authored into.

Proposed ID prefixes, chosen against the 30 in use per
[config-inventory](python-audit/config-inventory.md) **and re-checked against
the research tree itself**: reuse the existing `ASYNC CLI DOC ERR EXIT OBS PKG
SEC TEST TOOL` where the meaning matches, and add `PY` (index), `TYP`, `PROC`,
`HTTP`, `SURF`, `MODEL`, `SOLO`, `GATE`, `PYCFG`. `CFG` was the first choice for
the configuration table below and is **taken** — `.agents/research/ai-agentic-coding.md`
already defines `CFG-01`..`CFG-11`, which the inventory's 30-prefix list does not
cover because it surveyed shipped rules rather than research artifacts. Re-run
`check-artifacts.py` over `.agents/research` before committing to any prefix.

### `rules/python-quality.md` — the index (8 rules)

The Gate, Non-Negotiables, Where the Depth Is, Severity, Siblings. These are the
cross-cutting rules that every depth file assumes.

| # | Rule | Verification | Sev. | Source |
|---|---|---|---|---|
| PY-01 | Every Python tree in a repo is covered by a ruff config **and** a type-checker config; an uncovered tree is a gate hole | enumerate every `*.py` parent tree, resolve each against the nearest `ruff.toml`/`pyproject.toml` `[tool.ruff]` and `pyrightconfig.json`; any tree resolving to none is the violation | MUST | [posture](python-audit/tooling-posture.md) |
| PY-02 | Never run `ruff check --fix --unsafe-fixes` under an agent | `grep -rn 'unsafe-fixes'` across task files, workflows and agent instructions; any invocation outside a human-confirmed one-off is the violation | MUST | [cod-rec](python-topic-map/codified-reconciled.md) |
| PY-03 | A rule ships only with a verification that has been watched go red against a planted violation | for each rule row, run its verification against a deliberately broken copy; a pass on the broken copy is the violation | MUST | [sweep](python-audit/verification-sweep.md) |
| PY-04 | `F821` is in the gate before any `TC`-family rule is adopted | `ruff check --select F821` exits 0, and `grep -n 'TC0' <config>` returns nothing until it does | MUST | [annot](python-typing/annotations-evaluation.md) |
| PY-05 | The declared `requires-python` floor is installed and the suite is run against it in CI | `check-floor-tested.sh` (inlined in the source artifact): read the floor, `uv run --python <floor> pytest --collect-only`, non-zero is the violation | MUST | [floor](python-audit/version-floor.md) |
| PY-06 | `--strict-markers` (or `addopts = --strict-markers`) is set wherever pytest runs | add a `@pytest.mark.nosuchmarker` to one test; the run must fail | SHOULD | [suite](python-testing/suite-architecture.md) |
| PY-07 | A gate never exits `0` on a crash: no catch-all wraps the dispatch of a tool whose exit code is consumed | `grep -n 'except Exception' <entrypoint>` and confirm none encloses `main()`'s body without an adjacent comment naming a harness contract | MUST | [exit](python-cli-contract/errors-and-exit-codes.md), [single](python-single-file-tools/stdlib-only.md) |
| PY-08 | `except Exception` does not catch `KeyboardInterrupt`, `SystemExit`, or `asyncio.CancelledError` — never claim or rely on it doing so | grep the rule corpus itself for the claim; and plant a `KeyboardInterrupt` inside a `try/except Exception` block and confirm it propagates | MUST | [ledger](python-audit/existing-rules-ledger.md), [exit](python-cli-contract/errors-and-exit-codes.md), [async](python-async/sdk-concurrency.md) |

### `rules/python-quality/testing.md` (13 rules)

| # | Rule | Verification | Sev. | Source |
|---|---|---|---|---|
| TEST-P01 | `time.sleep` in a test is allowed only in the third of the dive's three categories (a genuine external settle with no observable signal); the other two are polling and fixed-delay padding, both violations | `grep -n 'time.sleep(' test/` then classify each hit against the taxonomy; categories 1 and 2 are the violation | SHOULD | [suite](python-testing/suite-architecture.md) |
| TEST-P02 | A test mutates `os.environ` only through `monkeypatch`, except in the hook-harness carve-out the dive names | `grep -n 'os.environ\[' test/` outside a `monkeypatch` call or the carve-out path | MUST | [suite](python-testing/suite-architecture.md) |
| TEST-P03 | A CLI acceptance assertion is a substring assertion on a named field, not a whole-blob snapshot, for shape 1; the SDK and bot may snapshot | count whole-blob comparisons in `test/`; each new one outside the sanctioned set is the violation | SHOULD | [suite](python-testing/suite-architecture.md), [s-cli](python-topic-map/scout-cli-acceptance.md) |
| TEST-P04 | A fixture whose scope is wider than `function` holds no per-worker mutable state | run the suite under `-p xdist -n 4 --dist loadscope` and again with `-n 0`; a differing result is the violation | SHOULD | [suite](python-testing/suite-architecture.md) |
| TEST-P05 | `pytest.raises` always carries `match=` | `ruff check --select PT011` with `pytest-raises-require-match-for` configured for the project's own exception bases — the shipped config omits this and therefore cannot go red | SHOULD | [ledger](python-audit/existing-rules-ledger.md), [cod-rec](python-topic-map/codified-reconciled.md) |
| TEST-P06 | Coverage is measured with branch coverage on and reported as a real number, never with `# pragma: no cover` on a whole module | `coverage report --show-missing` and diff the `pragma` count against the previous commit | SHOULD | [shipped](python-audit/shipped-python.md) |
| TEST-P07 | Doctests in shipped documentation are collected and executed by the suite | delete one assertion inside a docstring example and confirm the run fails | SHOULD | [shipped](python-audit/shipped-python.md) |
| TEST-P08 | `pytest-timeout` is configured with a per-test timeout, and the method is chosen deliberately (`signal` fails on a blocked C call; `thread` cannot interrupt one) | add a `while True: pass` test and confirm the run terminates at the configured bound | MUST | [proc](python-subprocess/process-control.md) |
| TEST-P09 | Every CI job that runs a Python suite sets `timeout-minutes` | `rg -c 'timeout-minutes' . --glob '.github/workflows/*.yml'` against the job count from `rg -c '^  [a-z0-9_-]+:$' . --glob '.github/workflows/*.yml'`; a shortfall is the violation. A bare `.github/workflows/*.yml` path operand is wrong here — the shell aborts the whole command on a repo without that directory, so the check can never go red | MUST | [proc](python-subprocess/process-control.md) |
| TEST-P10 | Flags intended for pytest actually reach pytest — no templating layer silently drops them | run the task with `--dry-run` (or echo the resolved command) and diff the resolved argv against the declared one | MUST | [proc](python-subprocess/process-control.md) |
| TEST-P11 | `PYTHONUNBUFFERED=1` is set for any suite whose output is read from a cancelled or streaming CI job, and the JUnit report is written incrementally or uploaded with `if: always()` | cancel a running job and confirm both partial output and a report survive | SHOULD | [proc](python-subprocess/process-control.md) |
| TEST-P12 | A CLI is tested in-process where its `main(argv) -> int` allows it, and by subprocess only where the contract under test is the process boundary itself | `grep -n 'subprocess.run' tests/` in shape 2 and 3 trees; any hit that could call `main([...])` directly is the violation | SHOULD | [s-cli](python-topic-map/scout-cli-acceptance.md), [exit](python-cli-contract/errors-and-exit-codes.md) |
| TEST-P13 | Two harnesses of the same shape share their `conftest.py` rather than diverging silently | `diff` the two files; an unexplained divergence beyond repo-specific constants is the violation (694 of 750 lines differ today) | SHOULD | [harness](python-audit/harness-shape.md) |

### `rules/python-quality/typing.md` (9 rules)

| # | Rule | Verification | Sev. | Source |
|---|---|---|---|---|
| TYP-01 | No name used in an annotation is undefined at the time that annotation is evaluated | `ruff check --select F821` — zero config, catches all 11 real violations found | MUST | [annot](python-typing/annotations-evaluation.md) |
| TYP-02 | `from __future__ import annotations` is adopted per-file and only where no runtime introspection reads that module's annotations | for each file carrying the import, `grep` the module and its importers for `get_type_hints`/`eval_str=True`; a hit is the violation | SHOULD | [annot](python-typing/annotations-evaluation.md) |
| TYP-03 | Code that reads annotations at runtime never double-stringizes: `get_type_hints()` and `inspect.signature(..., eval_str=True)` are called on modules without the future import | assert on the *type* of the returned annotation; a `str` where a type was expected is the violation | MUST | [annot](python-typing/annotations-evaluation.md) |
| TYP-04 | Every `cast()` carries a comment naming why the checker cannot see the invariant, or is replaced by a validating parse | `grep -n 'cast(' src/` and require an adjacent justification; the 32 argparse-sourced casts in `index/bot` are the class to eliminate rather than annotate | SHOULD | [data](python-data-modelling/types-and-idioms.md), [http](python-http/bot-client-discipline.md) |
| TYP-05 | A JSON boundary is typed with a `TypedDict` using `Required`/`NotRequired`, then validated, before any value crosses into typed code | plant an absent required key and confirm the boundary raises rather than the consumer failing later | SHOULD | [data](python-data-modelling/types-and-idioms.md) |
| TYP-06 | A pyright config that runs below `strict` explicitly re-enables `reportMatchNotExhaustive`, which is silently `none` at `standard` and below | add a non-exhaustive `match` over a `Literal` union and confirm the checker errors | MUST | [data](python-data-modelling/types-and-idioms.md) |
| TYP-07 | `reportUnhashable` and `reportPrivateImportUsage` are left at their Basic-mode default of `error` and never suppressed wholesale | grep the pyright config for either name set to `none`/`warning` | SHOULD | [data](python-data-modelling/types-and-idioms.md), [api](python-api-design/sdk-public-surface.md) |
| TYP-08 | `ANN` is enforced over `src/` and never over `test/` | `ruff check --select ANN src/` is clean; the same over `test/` is 2,510 hits and must not be gated | SHOULD | [cod-rec](python-topic-map/codified-reconciled.md) |
| TYP-09 | Modern spellings are enforced (`X \| None`, `list[X]`, `dict[K, V]`) | `ruff check --select UP006,UP035,UP045` — already goes red on the fleet | SHOULD | [ledger](python-audit/existing-rules-ledger.md), [s-shift](python-topic-map/scout-shifts.md) |

### `rules/python-quality/processes.md` (7 rules)

| # | Rule | Verification | Sev. | Source |
|---|---|---|---|---|
| PROC-01 | A per-call `timeout=` on `subprocess.run` is **not** required in an acceptance harness; the bound belongs to `pytest-timeout` and the CI job | assert the *absence* of a blanket rule: pip, pytest and uv all ship no per-call timeouts. Any rule requiring one is the violation | MUST (as a non-rule) | [proc](python-subprocess/process-control.md), [s-cli](python-topic-map/scout-cli-acceptance.md) |
| PROC-02 | A `Popen` whose child can write more than one pipe buffer (64 KiB per stream on Linux) uses `communicate()`, never a sequential `.read()` on one stream while the other fills | for each `Popen` site, run the child with >64 KiB on the un-read stream and confirm no hang | MUST | [proc](python-subprocess/process-control.md) |
| PROC-03 | A test that spawns a child process spawns it into its own session (`start_new_session=True`) and tears the group down with `os.killpg` | cancel mid-run and confirm no orphan survives (`pgrep -g`) | SHOULD | [proc](python-subprocess/process-control.md) |
| PROC-04 | Cancelling an `asyncio` task does not kill its subprocess (gh-88050); any code relying on that must kill explicitly | cancel a task holding a subprocess and assert the child is gone | SHOULD | [proc](python-subprocess/process-control.md) |
| PROC-05 | `shell=True` and `os.system` are never used | `ruff check --select S602,S605` — zero hits today, preventive | MUST | [sec](python-security/untrusted-input.md) |
| PROC-06 | A `subprocess.run` whose returncode is not inspected sets `check=True` | for each call site, confirm either `check=True` or an explicit `returncode` read | SHOULD | [harness](python-audit/harness-shape.md) |
| PROC-07 | Subprocess output is decoded with an explicit encoding, never the platform default | `grep -n 'text=True\|universal_newlines' ` and confirm an accompanying `encoding=` | SHOULD | [harness](python-audit/harness-shape.md), [single](python-single-file-tools/stdlib-only.md) |

### `rules/python-quality/async.md` (7 rules)

| # | Rule | Verification | Sev. | Source |
|---|---|---|---|---|
| ASYNC-P01 | `asyncio.TaskGroup` over `gather`, and `gather` over a bare `create_task` | `grep -n 'create_task(' src/` — any hit whose result is not stored is the violation | SHOULD | [async](python-async/sdk-concurrency.md) |
| ASYNC-P02 | A fire-and-forget task's reference is held for its lifetime | `ruff check --select RUF006` | SHOULD | [async](python-async/sdk-concurrency.md), [fail-cov](python-topic-map/scout-failure-coverage.md) |
| ASYNC-P03 | `CancelledError` is never swallowed: it inherits from `BaseException` and a handler that catches it must re-raise | plant a `except Exception` around an awaited cancel point and confirm the cancel still propagates; then plant `except BaseException` without a re-raise and confirm the check fires | MUST | [async](python-async/sdk-concurrency.md) |
| ASYNC-P04 | `asyncio.timeout()` over `asyncio.wait_for()` | `grep -n 'wait_for(' src/`; any hit on a 3.11+ floor is the violation | SHOULD | [async](python-async/sdk-concurrency.md), [s-shift](python-topic-map/scout-shifts.md) |
| ASYNC-P05 | No blocking call inside a coroutine | `ruff check --select ASYNC` — the family is currently unselected in both async-capable subjects; ASYNC115 was verified not to fire on the `asyncio.sleep(0)` yield idiom, and all 6 ASYNC109 hits resolve to one legitimate scope | SHOULD | [async](python-async/sdk-concurrency.md), [cod-rec](python-topic-map/codified-reconciled.md) |
| ASYNC-P06 | `asyncio.run` appears exactly once, at the entrypoint | `grep -c 'asyncio.run(' src/` must be 1 | SHOULD | [async](python-async/sdk-concurrency.md) |
| ASYNC-P07 | A library exposing async APIs does not create or close an event loop on its caller's behalf | `grep -n 'new_event_loop\|set_event_loop\|loop.close' src/` — any hit in library code is the violation | SHOULD | [async](python-async/sdk-concurrency.md) |

### `rules/python-quality/http.md` (9 rules)

| # | Rule | Verification | Sev. | Source |
|---|---|---|---|---|
| HTTP-01 | One long-lived client per process, constructed at the boundary and injected; never per call | `grep -c 'httpx.Client(\|httpx.AsyncClient(' src/` — 14 sites in `github_api.py` today, target 1 | MUST | [http](python-http/bot-client-discipline.md) |
| HTTP-02 | The client carries a `timeout=` default; no request relies on the library default | construct the client without a timeout and confirm the check fires | MUST | [http](python-http/bot-client-discipline.md) |
| HTTP-03 | A response body is read with an explicit size cap, never bare `.content`/`.text` on an untrusted source | serve a body larger than the cap and confirm the client raises rather than buffering it | MUST | [http](python-http/bot-client-discipline.md), [sec](python-security/untrusted-input.md) |
| HTTP-04 | Redirects are host-checked before they are followed | plant a redirect to a foreign host and confirm the request is refused; `registry_v2.py` has this check and `_paginate` does not | MUST | [http](python-http/bot-client-discipline.md) |
| HTTP-05 | `raise_for_status()` (or an equivalent explicit status check) precedes every body parse | plant a 404 with a valid-JSON body and confirm the caller errors rather than parsing it | MUST | [http](python-http/bot-client-discipline.md) |
| HTTP-06 | Retries are bounded, and `Retry-After` is parsed with a ceiling before it reaches a sleep | serve `Retry-After: 99999` and confirm the client clamps it | SHOULD | [http](python-http/bot-client-discipline.md) |
| HTTP-07 | Any server-controlled string that reaches a log or terminal is `!r`-quoted (CWE-150) | serve a header containing `\x1b[2J` and confirm the escape does not reach the terminal raw | SHOULD | [http](python-http/bot-client-discipline.md), [obs](python-observability/logging-and-output.md) |
| HTTP-08 | Response JSON is validated against a declared shape before it is `cast()` | plant a response missing a required key and confirm the boundary raises | SHOULD | [http](python-http/bot-client-discipline.md), [data](python-data-modelling/types-and-idioms.md) |
| HTTP-09 | `verify=False` is never set | `grep -n 'verify=False'` — zero hits today, preventive | MUST | [sec](python-security/untrusted-input.md) |

### `rules/python-quality/cli-contract.md` (9 rules)

| # | Rule | Verification | Sev. | Source |
|---|---|---|---|---|
| CLI-P01 | `main(argv=None) -> int` (or an `IntEnum` exit code); never `-> bool`, never `-> None` where an exit code is consumed | `grep -n '^def main(.*-> bool' <file>` — reproduced: `return True` exits **1** while printing a success message | MUST | [exit](python-cli-contract/errors-and-exit-codes.md) |
| CLI-P02 | `sys.exit(main())` appears exactly once, under `if __name__ == "__main__":` | `grep -c 'sys.exit(main(' <file>` must be 1, and no `sys.exit` may appear inside `main()`'s own body | SHOULD | [exit](python-cli-contract/errors-and-exit-codes.md) |
| CLI-P03 | Exit codes come from the pinned set `{0, 1, 2, 65, 75}`; a new integer requires the table to be updated first | any integer literal reaching `sys.exit()` or an `ExitCode`-like enum outside that set is the violation | SHOULD | [exit](python-cli-contract/errors-and-exit-codes.md) |
| CLI-P04 | `argparse`'s own `2` for usage errors is kept, never remapped to sysexits' `64` | `grep -n 'class.*ArgumentParser'` — an `error()` override is the smell; none exists today | SHOULD | [exit](python-cli-contract/errors-and-exit-codes.md) |
| CLI-P05 | A tool whose stdout can exceed one pipe buffer handles `BrokenPipeError` with the documented recipe and exits non-zero | `<tool> <args producing >64 KiB> \| head -1` with stderr captured; any `Exception ignored`/`BrokenPipeError` text, or exit `120`, is the violation | MUST | [exit](python-cli-contract/errors-and-exit-codes.md), [single](python-single-file-tools/stdlib-only.md) |
| CLI-P06 | A crash is distinguishable from a finding: findings exit `1`, bad invocation exits `2`, and an unhandled bug produces a traceback and a non-zero exit — never `0` | plant a `raise RuntimeError` in the dispatch path and confirm the exit code is non-zero and the traceback reaches stderr | MUST | [exit](python-cli-contract/errors-and-exit-codes.md) |
| CLI-P07 | A top-level `except Exception` that leads to exit `0` carries an adjacent comment naming the harness contract that requires it | for every such handler, confirm the module docstring or an adjacent comment names the contract; `post_tool_use_tracker.py:6-7` is the reference | MUST | [single](python-single-file-tools/stdlib-only.md), [exit](python-cli-contract/errors-and-exit-codes.md) |
| CLI-P08 | `os._exit()`, `exit()`, `quit()`, and `argparse`'s `type=bool` never appear in a script | four greps, all currently empty; `bool("False") is True` is the one an agent introduces | MUST | [exit](python-cli-contract/errors-and-exit-codes.md), [single](python-single-file-tools/stdlib-only.md) |
| CLI-P09 | A file another process reads is written atomically: `tempfile.mkstemp` in the target's own directory, write, `Path.replace()`, with cleanup on `BaseException` | `grep -n '\.write_text(' <module>` — 6 hits in `hook_utils.py` today, including the concurrency lock file; `index/bot/adapters/local_files.py:64-73` is the reference | SHOULD | [exit](python-cli-contract/errors-and-exit-codes.md) |

### `rules/python-quality/observability.md` (6 rules)

| # | Rule | Verification | Sev. | Source |
|---|---|---|---|---|
| OBS-P01 | A library never configures the root logger, never adds a handler, and attaches a `NullHandler` to its own | `grep -n 'basicConfig\|addHandler\|setLevel' src/` — any hit outside a `NullHandler` attach is the violation | MUST | [obs](python-observability/logging-and-output.md) |
| OBS-P02 | Secrets are redacted before any log or print (CWE-532) | plant a token-shaped string through the logging path and confirm the sink shows a redaction; the hook fleet's `detect_secrets()` is the in-repo detector | MUST | [sec](python-security/untrusted-input.md), [obs](python-observability/logging-and-output.md) |
| OBS-P03 | Untrusted text is escape-stripped or `!r`-quoted before it reaches a terminal (CWE-150) | feed `\x1b[2J\x1b[H` through the output path and confirm it renders inert | SHOULD | [obs](python-observability/logging-and-output.md), [sec](python-security/untrusted-input.md) |
| OBS-P04 | A tool's machine-readable result is its exit code and its structured output, never a log line a caller greps | `grep -n 'grep\|awk\|sed' ` over the workflows that consume the tool; any log-scrape is the violation. `index/bot`'s `ExitCode` is the reference implementation | SHOULD | [obs](python-observability/logging-and-output.md), [exit](python-cli-contract/errors-and-exit-codes.md) |
| OBS-P05 | stdout carries the tool's output; every message *about* the run goes to stderr | classify each `print(` call site: "this is the output" or "this is a message"; a message on stdout is the violation | MUST | [exit](python-cli-contract/errors-and-exit-codes.md), [obs](python-observability/logging-and-output.md) |
| OBS-P06 | `print()` does not appear in library code | `ruff check --select T20 src/` | SHOULD | [cod-rec](python-topic-map/codified-reconciled.md) |

### `rules/python-quality/security.md` (9 rules)

| # | Rule | Verification | Sev. | Source |
|---|---|---|---|---|
| SEC-P01 | `tarfile.extractall` and `zipfile.extractall` pass an explicit `filter=` (PEP 706) and never accept a member path escaping the destination (CVE-2007-4559, CWE-22) | build an archive with a `../` member and a symlink member; both must be refused | MUST | [sec](python-security/untrusted-input.md) |
| SEC-P02 | Extraction is bounded on both member count and uncompressed size (CWE-409) | feed a 42.zip-shaped input and confirm the extractor aborts at the bound | MUST | [sec](python-security/untrusted-input.md) |
| SEC-P03 | Any externally-supplied path is resolved and confirmed to stay under its root before use | plant `../../etc/passwd` and confirm the resolution is refused | MUST | [sec](python-security/untrusted-input.md) |
| SEC-P04 | `pickle`, `marshal`, and `yaml.load` are never used on data that crossed a trust boundary | `ruff check --select S301,S302,S506` — zero hits today | MUST | [sec](python-security/untrusted-input.md) |
| SEC-P05 | `eval`/`exec` never appear; the shipped `S307`-based rule must be reconfigured, because as selected today it cannot go red | plant an `eval("1+1")` and confirm the configured gate reports it — it currently does not | MUST | [ledger](python-audit/existing-rules-ledger.md), [sec](python-security/untrusted-input.md) |
| SEC-P06 | `tempfile.mktemp` is never used; `mkstemp`/`TemporaryDirectory` instead | `ruff check --select S306` — zero hits today | MUST | [sec](python-security/untrusted-input.md) |
| SEC-P07 | A hash used for integrity is not a broken one; `hashlib.md5`/`sha1` require `usedforsecurity=False` where they are non-security digests | `ruff check --select S324` (ruff's real S ceiling — the corpus's `S301`-`S325` range is fabricated) | SHOULD | [sec](python-security/untrusted-input.md), [sweep](python-audit/verification-sweep.md) |
| SEC-P08 | `pip-audit` runs in CI, and a finding is triaged as runtime-reachable or docs-only before it is dismissed | run it and confirm a non-zero exit on a planted vulnerable pin; the live example is idna in `ocx-mirror-sdk` (runtime-reachable) against gitpython (docs-only) | SHOULD | [sec](python-security/untrusted-input.md) |
| SEC-P09 | `zizmor` runs over every workflow, and `pull_request_target` is never used with a checkout of untrusted refs | `zizmor .github/workflows/` — currently **High** at this catalog's own `validate.yml:58` | MUST | [sec](python-security/untrusted-input.md) |

### `rules/python-quality/api-surface.md` (8 rules)

| # | Rule | Verification | Sev. | Source |
|---|---|---|---|---|
| SURF-01 | `__all__` is declared in every public module, and drift in it is gated | `griffe check` catches a removed symbol but **not** an `__all__`-only change; the rule needs an explicit `__all__` diff against the previous tag | SHOULD | [api](python-api-design/sdk-public-surface.md) |
| SURF-02 | Nothing reaches `__init__.py`'s namespace that is not part of the public API | plant a stray import and confirm the check fires; `PackageNotFoundError` leaks at `__init__.py:28` today | MUST | [api](python-api-design/sdk-public-surface.md) |
| SURF-03 | A public symbol is removed only behind a deprecation cycle | `griffe check` against the previous release tag | SHOULD | [api](python-api-design/sdk-public-surface.md) |
| SURF-04 | Optional public parameters are keyword-only | add a positional optional parameter and confirm the check fires | SHOULD | [api](python-api-design/sdk-public-surface.md) |
| SURF-05 | A deprecated public symbol carries `@deprecated` (PEP 702), and the package's own gate runs at a mode where `reportDeprecated` is an error (Strict) | plant a call to a `@deprecated` symbol and confirm the checker errors | SHOULD | [api](python-api-design/sdk-public-surface.md) |
| SURF-06 | The public exception hierarchy is stable, rooted in a single package base, and maps 1:1 onto the pinned exit codes | assert every `ExitCode` member has exactly one exception class and vice versa | SHOULD | [api](python-api-design/sdk-public-surface.md), [exit](python-cli-contract/errors-and-exit-codes.md) |
| SURF-07 | A public class not intended for subclassing says so, and its `__init__` is not part of the contract | manual review against the `__all__` list; no mechanical check exists | CONSIDER | [api](python-api-design/sdk-public-surface.md), [s-prac](python-topic-map/scout-practitioner.md) |
| SURF-08 | A symbol's name is not a substring of a sibling symbol's name in the same module | for each `def`/`class` name, grep the module for other names containing it; `push_blob` inside `_push_blob` in `ocx/test/src/registry.py` is the found instance | CONSIDER | [s-agent](python-topic-map/scout-agent-legibility.md) (C — capped at CONSIDER) |

### `rules/python-quality/data-modelling.md` (8 rules)

| # | Rule | Verification | Sev. | Source |
|---|---|---|---|---|
| MODEL-01 | A value-carrying dataclass is `frozen=True, slots=True` | `grep -n '@dataclass' src/` and confirm both flags; 50/51 and 22/24 already comply | SHOULD | [data](python-data-modelling/types-and-idioms.md) |
| MODEL-02 | Mutable defaults never appear in a signature (B006), `is` is never used on a literal (F632), and star-imports never appear (F403) | `ruff check --select B006,F632,F403` — all three already go red | MUST | [ledger](python-audit/existing-rules-ledger.md) |
| MODEL-03 | A mutable class attribute is `ClassVar`-annotated or moved to `field(default_factory=...)` | `ruff check --select RUF012` | SHOULD | [fail-cov](python-topic-map/scout-failure-coverage.md) |
| MODEL-04 | A type defining `__eq__` also defines `__hash__` or is explicitly unhashable | `ruff check --select PLW1641` plus pyright's `reportUnhashable` (error from Basic) | SHOULD | [data](python-data-modelling/types-and-idioms.md) |
| MODEL-05 | A closed set of string values is an `Enum`/`StrEnum`, not a bare literal repeated across modules | grep for a repeated string literal appearing in three or more modules; `index/bot`'s `ExitCode` is the model | SHOULD | [data](python-data-modelling/types-and-idioms.md) |
| MODEL-06 | Serialization of anything a digest is taken over is deterministic: sorted keys, no set iteration, no dict-order reliance, explicit separators | serialize twice in one process and once in a fresh interpreter with `PYTHONHASHSEED` varied; any difference is the violation | MUST | [data](python-data-modelling/types-and-idioms.md) |
| MODEL-07 | Every `datetime` is timezone-aware | `ruff check --select DTZ` | SHOULD | [cod-rec](python-topic-map/codified-reconciled.md) |
| MODEL-08 | `functools.cache`/`lru_cache` is never applied to a method holding mutable state (B019), and a collection is never mutated while iterated (B909) | `ruff check --select B019,B909` — both were believed uncatchable and both are caught | SHOULD | [fail-cov](python-topic-map/scout-failure-coverage.md) |

### `rules/python-quality/single-file-tools.md` (9 rules)

| # | Rule | Verification | Sev. | Source |
|---|---|---|---|---|
| SOLO-01 | A `--self-test` never signals pass/fail with a bare `assert` — `raise SystemExit(msg)` or `unittest.TestCase` instead | `python -O <tool> --self-test; echo $?` against a copy with one check neutered; exit must still be non-zero. Currently prints `self-test: ok` and exits 0 | MUST | [single](python-single-file-tools/stdlib-only.md) |
| SOLO-02 | An optional dependency is probed with a `try: import X / except ImportError:` whose fallback path is distinguishable from a fallback *bug* | disable the dependency and run the full check suite against a known-bad input; a green result is the violation. This repo shipped exactly this bug and fixed it in `8581552` | MUST | [single](python-single-file-tools/stdlib-only.md) |
| SOLO-03 | Every text `open()`, `read_text()`, and `write_text()` states `encoding="utf-8"` | `grep -n 'open(' <file> \| grep -v encoding=` plus the same for the `Path` methods; two confirmed sites at `hook_utils.py:244,270` | SHOULD | [single](python-single-file-tools/stdlib-only.md) |
| SOLO-04 | A tool run by a harness declares its floor in a PEP 723 `# /// script` header, not only in a lint config | `head -5 <file> \| grep -q '^# /// script'` then `grep -q requires-python` | SHOULD | [single](python-single-file-tools/stdlib-only.md) |
| SOLO-05 | A script invoked through an explicit interpreter carries no shebang and no exec bit; a script meant to be run as `./tool.py` carries `#!/usr/bin/env -S uv run --script` *and* the exec bit | `ruff check --select EXE <path>` — no ruff config scopes either hook fleet today | CONSIDER | [single](python-single-file-tools/stdlib-only.md) |
| SOLO-06 | Module-level work is limited to stdlib imports and constant construction — no I/O, network, or subprocess outside a function body | parse the module and assert every top-level statement is an import, a constant assignment, a `def`/`class`, or the `__main__` guard | CONSIDER | [single](python-single-file-tools/stdlib-only.md) |
| SOLO-07 | A tool of this shape makes no network call; if one becomes unavoidable it uses `urllib.request` with an explicit `timeout=` | `grep -n 'urlopen\|urllib.request'` — zero hits today | SHOULD | [single](python-single-file-tools/stdlib-only.md) |
| SOLO-08 | Concurrent invocations coordinate through an atomic primitive (`os.mkdir`), never a check-then-create | run two invocations concurrently against the same state file and confirm exactly one acquires | SHOULD | [single](python-single-file-tools/stdlib-only.md) |
| SOLO-09 | An append-only log written by a per-event hook is trimmed to a fixed bound on every run | run the hook N times past the bound and confirm the file stops growing | CONSIDER | [single](python-single-file-tools/stdlib-only.md) |

### `rules/python-quality/ci-gate.md` (8 rules)

| # | Rule | Verification | Sev. | Source |
|---|---|---|---|---|
| GATE-01 | A subject gets exactly one contributor/CI command (`task verify` or equivalent) before any lint or type rule is turned on for it | the command named in the subject's README/CONTRIBUTING matches the one the CI job invokes, byte for byte. Present for 4 of 7 subjects, absent for all three harnesses | MUST | [gate](python-tooling-ci/the-gate.md) |
| GATE-02 | Every gate is a required, blocking CI status check — never a pre-commit hook as the primary mechanism | the ruleset lists the job as required; `git commit --no-verify` succeeding locally is expected and irrelevant | MUST | [gate](python-tooling-ci/the-gate.md) |
| GATE-03 | A lint adoption with more than ~200 violations after safe autofix lands as named, bounded buckets per rule code, never as a generated baseline or a wildcard suppression | any single PR's addition to `per-file-ignores`/`noqa` names a specific rule code and a one-line reason; a directory-wide or `ALL` suppression is the violation | MUST | [gate](python-tooling-ci/the-gate.md) |
| GATE-04 | Tools resolve through the project pin, never through `$PATH` | `which ruff && ruff --version` against `uv run ruff --version`; a mismatch is the violation, and it is **0.16.1 against 0.16.3 on this machine today** | MUST | [gate](python-tooling-ci/the-gate.md) |
| GATE-05 | `${{ }}` never appears directly inside a `run:` block; every value flows through an `env:` intermediate first | `zizmor --format plain .github/workflows` reports zero `template-injection` findings | MUST | [gate](python-tooling-ci/the-gate.md) |
| GATE-06 | Every third-party action is SHA-pinned with a version comment, in *every* workflow including the release one | `zizmor --format plain .github/workflows \| grep -c unpinned-uses` is 0 | SHOULD | [gate](python-tooling-ci/the-gate.md) |
| GATE-07 | A test suite that exists and passes but nothing in CI invokes is wired in during the same cycle that discovers it | `gate-exists.sh <project-dir> <repo-root>` (inlined in the source artifact) prints nothing; watched red on both `.claude/tests` and silent on all six enforced subjects | SHOULD | [gate](python-tooling-ci/the-gate.md) |
| GATE-08 | Blanket suppressions stay at zero: a `# noqa`/`# type: ignore` always names its code | `ruff check --select PGH .` stays at 0 — it is 0 fleet-wide today, and any new hit is an agent taking the fast path to green | SHOULD | [gate](python-tooling-ci/the-gate.md), [cod-rec](python-topic-map/codified-reconciled.md) |

### `rules/python-packaging.md` (10 rules)

| # | Rule | Verification | Sev. | Source |
|---|---|---|---|---|
| PKG-P01 | The declared `requires-python` floor is installed and the suite collects and passes on it | `check-floor-tested.sh`, inlined in the source artifact; watched red on 3 subjects and clean on 2 | MUST | [floor](python-audit/version-floor.md) |
| PKG-P02 | Every declared `Programming Language :: Python ::` classifier corresponds to a version the CI matrix actually runs | `check-classifiers-tested.sh`, inlined in the source artifact | SHOULD | [pkg](python-packaging.md) |
| PKG-P03 | An upper version bound is present only with a stated reason; an unjustified `<4.0`/`<3.14` is the violation | grep the `requires-python` value for an upper bound and require an adjacent comment | SHOULD | [pkg](python-packaging.md) |
| PKG-P04 | A distributed package that ships type annotations ships `py.typed`, and the file is present in the built wheel | build the wheel, `unzip -l` it, and confirm the marker is inside the package directory — not merely in the source tree | MUST | [catalogues](python-topic-map/sweep-canonical-catalogues.md), [pkg](python-packaging.md) |
| PKG-P05 | The lockfile is committed and verified in CI | `uv lock --check` — all 7 lockfiles pass today | SHOULD | [pkg](python-packaging.md), [posture](python-audit/tooling-posture.md) |
| PKG-P06 | Declared dependencies match imported ones | `deptry .` with the project's configured ignores; the three-way run went 10 → 67 false positives → 0 real, so the config is part of the rule | SHOULD | [pkg](python-packaging.md) |
| PKG-P07 | Development dependencies live in PEP 735 `[dependency-groups]`, never in extras a consumer can install | grep `[project.optional-dependencies]` for dev-only names | SHOULD | [pkg](python-packaging.md) |
| PKG-P08 | Publishing uses Trusted Publishing (OIDC), never a long-lived token in a repository secret | grep the publish workflow for `password:`/`PYPI_TOKEN`; presence is the violation | SHOULD | [pkg](python-packaging.md), [sec](python-security/untrusted-input.md) |
| PKG-P09 | The version is single-sourced, and the runtime read of it cannot leak a third-party exception to a consumer | plant a missing-distribution condition and confirm the package raises its own error, not `PackageNotFoundError` | SHOULD | [pkg](python-packaging.md), [api](python-api-design/sdk-public-surface.md) |
| PKG-P10 | The build backend and the layout are src-layout with a declared, pinned backend | `grep -n 'build-backend' pyproject.toml` and confirm a version constraint; confirm `src/` exists | SHOULD | [pkg](python-packaging.md), [s-prac](python-topic-map/scout-practitioner.md) |

---

## Collapsed into configuration

**38 findings** that turned out to be one line of ruff, pyright, pytest or
workflow configuration rather than prose. Each carries its proven violation
count. A finding here does **not** also get a rule row: config that fails the
build is a better rule than a paragraph asking someone to remember.

| # | Config line | Proven count today | Source |
|---|---|---|---|
| PYCFG-01 | `select = ["F821"]` in the harness gate | 11 real undefined names | [annot](python-typing/annotations-evaluation.md), [fixlist](python-audit/fleet-fix-list.md) |
| PYCFG-02 | `select += ["PT"]` in both SDKs, with `pytest-raises-require-match-for` set | PT011 currently cannot go red as configured | [cod-rec](python-topic-map/codified-reconciled.md), [ledger](python-audit/existing-rules-ledger.md) |
| PYCFG-03 | pyright `include: ["test/src"]` rather than `test/` | 186 errors → 8 (ocx) and 0 (grimoire) | [triage](python-audit/pyright-triage.md), [gate](python-tooling-ci/the-gate.md) |
| PYCFG-04 | `per-file-ignores` for `PLC0415` on the affected modules | the one new gap the reconciliation found | [cod-rec](python-topic-map/codified-reconciled.md) |
| PYCFG-05 | `addopts = "--strict-markers"` | a typo'd marker currently selects nothing, silently | [suite](python-testing/suite-architecture.md) |
| PYCFG-06 | `pytest-timeout` with an explicit `timeout` and `timeout_method` | no per-test bound today | [proc](python-subprocess/process-control.md) |
| PYCFG-07 | `timeout-minutes:` on every Python CI job | absent; 360-minute default in force | [proc](python-subprocess/process-control.md) |
| PYCFG-08 | `PYTHONUNBUFFERED: "1"` in the harness job env | stdout block-buffers today | [proc](python-subprocess/process-control.md) |
| PYCFG-09 | Restore `-v` in the Task-templated pytest invocation | silently dropped by `default` templating | [proc](python-subprocess/process-control.md) |
| PYCFG-10 | JUnit upload with `if: always()` | report lost on cancel today | [proc](python-subprocess/process-control.md) |
| PYCFG-11 | `select += ["ASYNC"]` in the SDK | 6 ASYNC109 hits, all one legitimate scope; ASYNC115 verified not to fire | [async](python-async/sdk-concurrency.md) |
| PYCFG-12 | `select += ["B"]` | 3 hits | [yield](python-audit/lint-yield.md) |
| PYCFG-13 | `select += ["RET"]` | 2 hits | [yield](python-audit/lint-yield.md) |
| PYCFG-14 | `select += ["FURB"]` | 6 hits | [yield](python-audit/lint-yield.md) |
| PYCFG-15 | `select += ["ISC"]` | 6 hits | [yield](python-audit/lint-yield.md) |
| PYCFG-16 | `select += ["SIM"]` | 16 hits | [yield](python-audit/lint-yield.md) |
| PYCFG-17 | `select += ["N"]` | 4 hits | [yield](python-audit/lint-yield.md) |
| PYCFG-18 | `select += ["W"]` | 0 hits — free | [yield](python-audit/lint-yield.md) |
| PYCFG-19 | `select += ["DTZ"]` | in the actionable subset | [posture](python-audit/tooling-posture.md), [cod-rec](python-topic-map/codified-reconciled.md) |
| PYCFG-20 | `select += ["T20"]`, scoped to `src/` | in the actionable subset | [cod-rec](python-topic-map/codified-reconciled.md) |
| PYCFG-21 | `select += ["UP006","UP035","UP045"]` | already goes red | [ledger](python-audit/existing-rules-ledger.md) |
| PYCFG-22 | `select += ["E722"]` | already goes red | [ledger](python-audit/existing-rules-ledger.md) |
| PYCFG-23 | `select += ["B006"]` | already goes red | [ledger](python-audit/existing-rules-ledger.md) |
| PYCFG-24 | `select += ["F403"]` | already goes red | [ledger](python-audit/existing-rules-ledger.md) |
| PYCFG-25 | `select += ["B904"]` | already goes red | [ledger](python-audit/existing-rules-ledger.md) |
| PYCFG-26 | `select += ["F632"]` | already goes red | [ledger](python-audit/existing-rules-ledger.md) |
| PYCFG-27 | `select += ["ANN"]`, scoped to `src/` only | 2,510 hits over `test/` if unscoped | [cod-rec](python-topic-map/codified-reconciled.md) |
| PYCFG-28 | `ARG` scope-refined per the reconciliation | scope, not selection, was the error | [cod-rec](python-topic-map/codified-reconciled.md) |
| PYCFG-29 | `per-file-ignores` keeping `S101` for tests, and **removing** the `check-artifacts.py` exemption | the exemption silences the lint that would have caught the `-O` defect | [ledger](python-audit/existing-rules-ledger.md), [single](python-single-file-tools/stdlib-only.md) |
| PYCFG-30 | A ruff config that actually scopes `.claude/hooks/`, selecting `EXE` and `PTH` | no config scopes either hook fleet today | [single](python-single-file-tools/stdlib-only.md) |
| PYCFG-31 | `deptry` with the project's ignore set | 10 → 67 false positives → 0 real | [pkg](python-packaging.md) |
| PYCFG-32 | `pip-audit` as a CI step | 1 runtime-reachable finding (idna, `ocx-mirror-sdk`); gitpython's 5 are docs-only | [sec](python-security/untrusted-input.md) |
| PYCFG-33 | `zizmor` as a CI step | 13 findings, 1 **High** | [sec](python-security/untrusted-input.md) |
| PYCFG-34 | The four measured per-shape ruff configs, adopted as written, then `ruff check --fix` (safe only) | residuals after safe autofix: **805** (shape 1) / **155** (shape 2) / **37** (shape 3) / 17 (shape 4) — shapes 2 and 3 are landable as a blocking gate in the same PR | [cod-rec](python-topic-map/codified-reconciled.md), [gate](python-tooling-ci/the-gate.md) |
| PYCFG-35 | A `task lint` / `task types` / `task verify` triple in each of the three harness taskfiles | absent in all three; present in the other four subjects | [gate](python-tooling-ci/the-gate.md) |
| PYCFG-36 | `run: task claude:tests` in each repo's existing acceptance-tests job | 165+3 and 153 tests, green today, invoked by nothing | [gate](python-tooling-ci/the-gate.md) |
| PYCFG-37 | `select += ["PGH"]` | 0 hits fleet-wide — free, and protects the zero | [gate](python-tooling-ci/the-gate.md), [cod-rec](python-topic-map/codified-reconciled.md) |
| PYCFG-38 | Two targeted `# noqa: PLW1510` at the `runner.py` call sites, never a blanket ignore | 262 hits, half a documented ruff blind spot — a blanket ignore would also hide the one genuinely bare `subprocess.run` at `sigstore/generate-trusted-root.py:38` | [gate](python-tooling-ci/the-gate.md) |

Not collapsed, deliberately: `E501` (the count collapses to near zero at any
realistic width, so selecting it buys nothing and costs a reformat —
[lint-yield](python-audit/lint-yield.md)), and `TC` (adoption is blocked on
PYCFG-01 landing first — [annotations-evaluation](python-typing/annotations-evaluation.md)).

---

## Resolved contradictions

Thirteen conflicts that existed inside the corpus and were settled during the wave.
Each is stated as the decision, with the artifact that wins and why.

**1. `time.sleep` in tests.** `scout-failure` and `scout-cli-acceptance` treated
any `time.sleep` as a defect; `harness-shape` recorded it as pervasive and
unremarkable. **[suite-architecture](python-testing/suite-architecture.md) wins**
with a three-category taxonomy: polling a condition (replace with a bounded
wait-for), padding a fixed delay (replace with a signal), and settling a genuine
external with no observable signal (keep, with a comment). Only the third
survives. It wins because it is the only artifact that classified the actual
call sites rather than counting them.

**2. `os.environ` mutation in tests.** `scout-codified` proposed a blanket
prohibition; the harnesses do it deliberately in hook tests.
**[suite-architecture](python-testing/suite-architecture.md) wins**: `monkeypatch`
everywhere, with a named carve-out for the hook harness whose subject *is* the
environment. A blanket rule would have been unadoptable in the one place it
mattered.

**3. Per-call subprocess timeouts.** `scout-failure` ranked "610 `subprocess.run`
calls with no `timeout=`" as the fleet's number-one uncaught failure, and
`process-control` was commissioned on that premise.
**[process-control](python-subprocess/process-control.md) retracted its own
premise** after [scout-cli-acceptance](python-topic-map/scout-cli-acceptance.md)
established that pip, pytest and uv all ship zero per-call timeouts. The
replacement is `pytest-timeout` plus a CI `timeout-minutes`. This is the wave's
cleanest self-correction: the retraction is in the dive that would have benefited
from keeping the finding.

**4. Snapshot versus substring assertions.** `scout-cli-acceptance` documented
uv's and gh's snapshot-heavy harnesses; `harness-shape` measured this fleet at
369/201 substring against 10/9 whole-blob. **Decided per shape**
([suite-architecture](python-testing/suite-architecture.md) §6 plus
[scout-cli-acceptance](python-topic-map/scout-cli-acceptance.md)): substring for
shape 1, where the output is a compiled Rust CLI's human text and a snapshot
would churn on every message edit; snapshot is permitted for shapes 2 and 3,
where the output is structured and stable. Neither artifact "loses" — the
conflict was a missing scope qualifier.

**5. `TC` (flake8-type-checking) adoption.** `scout-codified` listed `TC` in its
highest-yield set; `annotations-evaluation` showed `TC` moves imports into
`if TYPE_CHECKING:` blocks and thereby *manufactures* the exact forward-reference
failure the fleet already has 11 instances of.
**[annotations-evaluation](python-typing/annotations-evaluation.md) wins**
(B grade, against `scout-codified`'s B-): `TC` is adoptable only after `F821` is
gating. Sequencing, not prohibition.

**6. `from __future__ import annotations`.** `scout-shifts` treated it as
straightforwardly modern; `annotations-evaluation` produced the four-mode
behaviour matrix showing it silently breaks any module whose annotations are read
at runtime. **[annotations-evaluation](python-typing/annotations-evaluation.md)
wins**: per-file, and never on a module something introspects. The double-stringize
hazard — `inspect.signature(eval_str=True)` returning the *string* — is the
concrete failure.

**7. Is `index/bot` logging-heavy?** The observability dive was commissioned on
that premise and **corrected it**: `ocx-sdk-python` is the only package in the
fleet that imports `logging`, and `index/bot` imports it in zero files. The
fleet-wide `G004` count is zero. The `G`/`LOG` families therefore buy nothing,
and the dive's own Rule 13 (typed exit codes as the machine-readable channel)
replaces what a logging rule would have said
([logging-and-output](python-observability/logging-and-output.md)).

**8. Eight "nothing catches this" claims.** `scout-failure`'s 61-row catalogue
said 32 rows were uncaught by any tool. **[scout-failure-coverage](python-topic-map/scout-failure-coverage.md)
wins on eight of them**: B909, B019, RUF012, RUF006, ASYNC221/222, INP001
(partially), pylint R0401 and pyright `reportUnhashable` all catch what was
claimed uncatchable. The adversarial re-check is the artifact to trust; the
original scout was not re-run against current tool versions.

**9. `index/bot`'s 56 `cast()` sites, split two ways.**
[bot-client-discipline](python-http/bot-client-discipline.md) splits them by
HTTP-boundary provenance (12 registry-JSON, 32 argparse, 5 local-file, 4
internal, 3 config); [types-and-idioms](python-data-modelling/types-and-idioms.md)
splits them by construction cause (32 argparse, 15 `_Manifest`, 9
Optional-narrowing). **Not a contradiction — both are right.** They agree on the
total and on the 32 argparse casts; the residual differs because they answer
different questions, and both artifacts note the coordination explicitly. The
authoring rule (TYP-04) targets the 32 both agree on.

**10. Agent legibility as a rule category.** `scout-agent-legibility` argued from
Ronacher's six mechanism claims that Python needs compensating rules; its own
benchmark evidence runs the other way, and its author's cited source contradicts
himself across two posts. **The evidence wins over the premise**: no category is
authored. The verification sweep independently graded the artifact C with 6 of 15
rows unsound — two always-pass, one inverted — which is why nothing sourced only
to it carries MUST anywhere in this document
([scout-agent-legibility](python-topic-map/scout-agent-legibility.md),
[verification-sweep](python-audit/verification-sweep.md)).

**11. Is `grimoire-lore`'s `pull_request_target` a High-severity defect?**
[untrusted-input](python-security/untrusted-input.md) reported it as zizmor's
one **High** across the wave, and this map carried it as a P1 defect until the
gate dive landed. **[the-gate](python-tooling-ci/the-gate.md) wins**: it read the
job rather than the tool summary and found the PR head checked out as data-only
into a separate `pr-tree/` with `persist-credentials: false`, nothing executed or
imported from it, changed-file paths derived from the API and passed through a
file rather than argv (the file's own comment explains why: a PR containing a
file named `-h` would short-circuit an argv parser), and `permissions: {}` at the
top. Zizmor is right to flag the trigger *class*; this implementation survives
the flag. The real template-injection defects are in `ocx-save`'s
`test-install-scripts.yml` and three repos' `release.yml:79`. **This is the one
place in the wave where a tool's severity label outranked a reading of the code,
and the reading won.**

**12. Baseline file or named buckets for shape 1's remainder?** The general
practice for adopting a linter over a large codebase is a generated baseline;
[the-gate](python-tooling-ci/the-gate.md) rejects it **for this fleet
specifically**, because [lint-yield](python-audit/lint-yield.md) and
[codified-reconciled](python-topic-map/codified-reconciled.md) had already
decomposed the 805-violation remainder into five named, bounded buckets. A
baseline would flatten that structure into one permanent exemption list and
remove the only property that makes the remainder tractable. The decision turns
on evidence this fleet happens to have, not on a general position about
baselines.

**13. Pre-commit hook or CI status check?** The general-audience answer is both —
the hook catches most things before push, CI is the backstop.
**[the-gate](python-tooling-ci/the-gate.md) wins with a constraint the general
answer does not model**: an agent is the primary author on most diffs, with no
human reviewing them. A pre-commit hook requires a manual `pre-commit install`
per clone and yields to `--no-verify` or `SKIP=`; an agent has no standing habit
of installing it and no reviewer downstream to notice it was skipped. Only a
blocking required status check binds, because its only bypass is a logged,
deliberate human grant.

---

## Explicitly not a defect

Checked, found healthy, and recorded so the next audit does not re-open it. This
section is as valuable as the defect list: each line is a question someone will
otherwise ask again in six months.

| Thing | Verdict | Evidence |
|---|---|---|
| All 7 `uv.lock` files | Clean. Every one passes `uv lock --check` | [posture](python-audit/tooling-posture.md) |
| Free-threaded Python (3.14t) | Clean. 954 and 762 tests pass unchanged; no GIL assumption anywhere in the fleet | [floor](python-audit/version-floor.md), [single](python-single-file-tools/stdlib-only.md) |
| `py.typed` in the packages that already ship it | Present. The rule (PKG-P04) exists for the *next* package, and to catch it dropping out of a wheel | [shipped](python-audit/shipped-python.md) |
| The 100% coverage number | Real. Re-run live: `TOTAL 2170 0 396 0 100%`, 996 passed / 41 skipped, branch coverage on | [shipped](python-audit/shipped-python.md) |
| Every shipped `src/` tree's annotation completeness | 100%: 293/293 SDK, 221/221 `index/bot`, 53/53 `ocx-mirror-sdk`, 88/88 hooks | [shipped](python-audit/shipped-python.md) |
| `ocx-mirror-sdk`'s code quality despite a looser gate | Equally good. The per-KLOC comparison shows the gap is *less proof*, not worse code | [exemplar](python-audit/exemplar-patterns.md) |
| Absence of per-call `subprocess` timeouts | Correct, matching pip, pytest and uv. See Resolved contradiction 3 | [proc](python-subprocess/process-control.md), [s-cli](python-topic-map/scout-cli-acceptance.md) |
| pylint's inference gap | Zero real hits. Only R0401 survives the gap analysis, and it fires on nothing here | [s-cod](python-topic-map/scout-codified.md), [fail-cov](python-topic-map/scout-failure-coverage.md) |
| bandit's 5 checks unported to ruff | Zero real hits. bandit's own live run produced 4 issues, 2 confirmed false positives | [sec](python-security/untrusted-input.md) |
| The 2 real archive-extraction sites | Both already bounded, validated and symlink-checked. Zero unsafe extraction fleet-wide | [sec](python-security/untrusted-input.md) |
| xdist fixture safety | Zero silently-unsafe fixtures found in a full audit | [suite](python-testing/suite-architecture.md) |
| `sys.path.insert(0, ...)` in the 9 hook scripts | Correct for the shape. A relative import fails as `__main__`, `PYTHONPATH` is invisible, and packaging reintroduces the dependency step this shape exists to avoid | [single](python-single-file-tools/stdlib-only.md) |
| The hook scripts' `except Exception: pass` | Correct. The Claude Code contract requires those event types never to exit non-zero, and each script's docstring says so | [single](python-single-file-tools/stdlib-only.md), [exit](python-cli-contract/errors-and-exit-codes.md) |
| The hook scripts' universal `sys.exit(0)` | Correct for that harness. Exit `1` is documented as non-blocking there, so the JSON channel is the safer design | [exit](python-cli-contract/errors-and-exit-codes.md) |
| `subprocess` timeouts inside the hook fleet | Present on every call site, 5s or 10s. The one robustness property shape 4 gets right everywhere | [single](python-single-file-tools/stdlib-only.md) |
| `pathlib` over `os.path` | Near-universal already; zero `os.path.join` string concatenation anywhere | [single](python-single-file-tools/stdlib-only.md) |
| `ASYNC109`'s 6 hits | Not a defect. All six resolve to one legitimate `asyncio.timeout(timeout)` scope | [async](python-async/sdk-concurrency.md) |
| `ASYNC115` against the `asyncio.sleep(0)` yield idiom | Verified not to fire. This removes the last blocker to selecting the `ASYNC` family | [async](python-async/sdk-concurrency.md) |
| The SDK's concurrency posture | 11 of 13 candidate rules already satisfied before any rule was written | [async](python-async/sdk-concurrency.md) |
| CPython #108611 (dataclass MRO) | Confirmed open upstream, inert here: zero diamond inheritance in the fleet | [data](python-data-modelling/types-and-idioms.md) |
| `frozen=True, slots=True` adoption | 50/51 and 22/24 already compliant | [data](python-data-modelling/types-and-idioms.md) |
| `G004` f-string-in-log | Fleet-wide count is zero | [obs](python-observability/logging-and-output.md) |
| `index/bot`'s stdout/stderr split | Already correct: every status and error `print` goes to stderr; the only stdout writes are single-line human summaries | [exit](python-cli-contract/errors-and-exit-codes.md) |
| `index/bot`'s atomic write | Already the reference implementation (`adapters/local_files.py:64-73`), correct on every count including the scoped `except BaseException` | [exit](python-cli-contract/errors-and-exit-codes.md) |
| 3 of the 4 `S105` hardcoded-secret hits | False positives | [sec](python-security/untrusted-input.md) |
| gitpython's 5 CVEs | Docs-only, not runtime-reachable | [sec](python-security/untrusted-input.md) |
| `SLF`, `TRY`, `EM`, `INP` ruff families | Overturned against measured hits over 167,229 LOC. Do not select | [cod-rec](python-topic-map/codified-reconciled.md) |
| `E501` | Collapses to near zero at any realistic line width | [yield](python-audit/lint-yield.md) |
| The 186 pyright errors over the harnesses | Zero are real bugs: 94 idiom, 76 latent, 15 false positive, 1 stub | [triage](python-audit/pyright-triage.md) |
| PEP 723's optional `dependencies` key | Omitting it is valid and complete, verified against `uv run --verbose`. A secondary source claiming otherwise was wrong | [single](python-single-file-tools/stdlib-only.md) |
| `make-mark.py`'s `expect()` helper | Already the correct pattern: `raise SystemExit` with a comment naming the `-O` reason. It is the fix for SOLO-01, not a subject of it | [single](python-single-file-tools/stdlib-only.md) |
| `grimoire-lore`'s own `pull_request_target` | Sound on a full read: data-only checkout into `pr-tree/`, `persist-credentials: false`, nothing executed, paths through a file not argv, `permissions: {}`. See Resolved contradiction 11 | [gate](python-tooling-ci/the-gate.md) |
| `.ruff_cache` across a version bump | Not a parity risk. The cache nests by version at the directory level, so a bump cannot serve a stale entry — verified with `find`, not assumed | [gate](python-tooling-ci/the-gate.md) |
| `.claude/tests` in both repos | Not rotten: 165 passed / 3 skipped in 1.21s and 153 passed in 0.50s, run today. Unwired, not decayed — wire it in rather than delete it | [gate](python-tooling-ci/the-gate.md) |
| `index/bot`'s workflows | **Zero** zizmor findings across the whole repo — the cleanest subject in the fleet | [gate](python-tooling-ci/the-gate.md) |
| Blanket suppressions (`PGH`) | Zero hits fleet-wide. Nobody has reached for a bare `# noqa`/`# type: ignore` yet; the rule protects the zero rather than fixing a violation | [gate](python-tooling-ci/the-gate.md), [cod-rec](python-topic-map/codified-reconciled.md) |
| The cost of adding lint and type-checking to CI | Free. ruff 0.06-0.16s, pyright 1.3-2.7s, against suites of 13.13s / 47.92s / 171.72s. There is no timing objection to raise | [gate](python-tooling-ci/the-gate.md) |
| `grimoire/test`'s acceptance suite | Genuinely green: 1060 passed, 0 failures, 47.92s with a prebuilt binary | [gate](python-tooling-ci/the-gate.md) |

---

## Deferred

Real work this wave did not finish. Ordered by what a wave-two brief should pick
up first.

1. **`ocx-save` is unmeasured.** [the-gate](python-tooling-ci/the-gate.md) names
   it as out of its own scope: no sibling audit measured its ruff or pyright
   counts, it is only inferred to be shape 1 from its taskfile and pyproject
   layout, and it ships hook scripts with **no test suite at all** — absent, not
   merely unwired. Its zizmor findings (the fleet's highest density, 9 real
   template-injection hits) are actionable today regardless.
2. **The four lost AST checker scripts.** Four verification cells in the corpus
   are "could not run" because the scripts that implemented them lived in prior
   scratchpads and are gone. Until they are rebuilt, four
   [exemplar-patterns](python-audit/exemplar-patterns.md) rules cannot ship —
   this is what holds that artifact at B+ rather than A
   ([verification-sweep](python-audit/verification-sweep.md)).
3. **Docker-driven acceptance tests.** [harness-shape](python-audit/harness-shape.md)
   names the shape and never audits it: container reaping on failure, image
   pinning, and layer-cache interaction with CI are all unexamined.
4. **`pexpect`/PTY interaction sites.** Named by
   [harness-shape](python-audit/harness-shape.md) and
   [process-control](python-subprocess/process-control.md); never individually
   audited for bounded reads or timeout coverage.
5. **Formatter enforcement.** Whether `ruff format` (or any formatter) gates
   anything is named by [tooling-posture](python-audit/tooling-posture.md) and
   never measured. It belonged to the missing gate dive.
6. **Mutation testing.** [suite-architecture](python-testing/suite-architecture.md)
   records Batchelder's argument for mutmut against a 100%-coverage suite and
   explicitly does not run it. A single mutmut run against `ocx-sdk-python` would
   settle whether the 100% is load-bearing.
7. **Artifact-content verification.** Whether a built wheel contains what the
   sdist claims (`check-wheel-contents`, `twine check`) is named in
   [python-packaging](python-packaging.md) and unmeasured; nothing publishes yet.
8. **PEP 751 `pylock.toml`.** Named by [python-packaging](python-packaging.md)
   and [scout-shifts](python-topic-map/scout-shifts.md); no consumer exists in
   this fleet, so it stayed a survey item.
9. **`check=True` and returncode-discard classification.** Counted in aggregate
   by [harness-shape](python-audit/harness-shape.md), never classified per call
   site — PROC-06's verification is therefore stated but not yet run over the
   corpus.
10. **The 73 unverified claims in the shipped `quality-python.md`.** The ledger
    enumerates them; nobody has decided, claim by claim, which to re-verify,
    which to reword, and which to delete
    ([existing-rules-ledger](python-audit/existing-rules-ledger.md)).
11. **Whether `zizmor --fix safe` may run unattended.** The auto-fixes are
    mechanically simple (wrap the value in `env:`), but "safe by zizmor's own
    classification" has not been independently re-verified the way ruff's unsafe
    fix list was; [the-gate](python-tooling-ci/the-gate.md) flags this open
    rather than resolving it.
12. **The `pyright --pythonpath` invocation's shelf life.** Current pyright
    (1.1.411) needs it; a future release adding native `.venv` discovery makes
    the config entry redundant rather than wrong. Worth a periodic re-check
    ([the-gate](python-tooling-ci/the-gate.md), [triage](python-audit/pyright-triage.md)).
13. **Subareas the dives named for another round**:
    [untrusted-input](python-security/untrusted-input.md) flags GitHub Actions
    SHA-pinning as surfaced-but-unaudited;
    [sdk-public-surface](python-api-design/sdk-public-surface.md) flags
    intentional-subclassing as having no mechanical check;
    [scout-cli-acceptance](python-topic-map/scout-cli-acceptance.md) marks its
    own candidates #3 and #4 **DECIDE**, and those decisions are the owner
    questions below.

---

## Open questions for the owner

1. `ocx/test` and `grimoire/test` declare `>=3.10` and cannot run on it — raise the declared floors to 3.12 and 3.11, or fix the code to meet the declaration?
2. `ocx-save` has the fleet's highest zizmor density (9 real `${{ }}`-into-`run:` injections) and is unmeasured for lint and types — bring it into this wave, or scope it out explicitly?
3. Is `python-quality` one package with a 12-file depth directory, or do `python-testing` and `python-security` split out as sibling rule packages? The Rust set has one depth file; this has twelve.
4. `quality-python.md` is byte-identical in four repos and owned by nobody — does the published OCI package replace it, and who opens the four removal PRs?
5. Shape 1's measured ruff residual after the proposed config is 1,051 findings — gate it now and burn them down, or ship the rules unenforced over `test/` until someone does?
6. Does the `S101` exemption for `check-artifacts.py --self-test` stay, now that `python -O` is shown to defeat it?
7. Is `ocx-mirror-sdk` in scope for this wave? It is a sixth shipped package carrying an accidentally always-on 192-line rule file.
8. Should `index/bot`'s sysexits `65`/`75` be pinned catalog-wide alongside the Rust CLIs, or stay a local ADR-4 decision?
9. Ship `python-packaging.md` now, when nothing in the fleet publishes to PyPI, or hold it until the SDK does?
10. Rebuild the four lost AST checker scripts, or drop the four `exemplar-patterns` rules that depend on them?
11. `release.yml` in three repos floats action tags where its sibling workflows SHA-pin, and interpolates `${{ }}` into `run:` — one cross-repo PR, or one per repo?
12. May `zizmor --fix safe` run unattended as a bot-authored PR, or must a human apply and review each auto-fix?

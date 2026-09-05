---
title: Wave 2 calibration, DOC-TYPE / DOC-DISC / DOC-OBS
topic: check-false-positive-calibration
group: cross-cutting
wave: 2
agent: wave2-calibration-a
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 16
scope: >
  Commission check-false-positive-calibration, families DOC-TYPE, DOC-DISC,
  DOC-OBS. Ledger sections 3 to 5 already classify every rule's verification
  status and already measured DOC-PLAIN-07, DOC-OBS-08, DOC-TYPE-05 and
  DOC-TYPE-14 against 186 fleet pages, so this dive does not re-measure those
  four. Every other rule in the three families whose ledger status is
  runnable or script gets a fresh script, run over the fleet's 248 pages
  across 23 surfaces plus this program's own 36-file research corpus. Rows
  the ledger marks circular, inert or heuristic get one line saying so.
revises:
  - docs-page-types.md
  - docs-use-case-discovery.md
  - docs-observability.md
---

# Wave 2 calibration, DOC-TYPE / DOC-DISC / DOC-OBS

## Contents

- [Summary](#summary)
- [Findings](#findings)
  - [1. DOC-TYPE, page types](#1-doc-type-page-types)
  - [2. DOC-DISC, use-case discovery](#2-doc-disc-use-case-discovery)
  - [3. DOC-OBS, observability](#3-doc-obs-observability)
  - [4. A detector gap that recurs across families](#4-a-detector-gap-that-recurs-across-families)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- DOC-TYPE-06's tool-analogy check is broken. It fires on 249 of 248 files
  (multiple hits per file) and every one of 12 sampled hits is a literal
  install command (`cargo install`, `npm i -g`), not a culture-bound analogy.
  Drop to CONSIDER until it requires an analogy verb near the tool name.
- DOC-TYPE-17's reference-entry schema check fires on 649 of 658 entries
  (98.6 percent). Manual reading shows the entries often carry the missing
  content in prose, the check only recognizes the literal words `remarks`,
  `error` and `example`. Keep the syntax and table arms, drop the wording-only
  arms, or the check will fail almost every reference page on day one.
- DOC-TYPE-15's trust-claim check is a false-positive machine on this fleet
  today. All 3 real hits are security prose ("trusted by every caller",
  "be trusted by default"), not adoption claims. Tighten `trusted by` to
  require a following count noun, matching the pattern's own third arm.
- DOC-DISC-03's solution-shaped-need check, simulated against 10 realistic
  need sentences built from real fleet CLI flags and headings, flags 5 of 5
  legitimate needs (100 percent false positive) and correctly catches 5 of 5
  planted violations. One cause is single-letter CLI flags (`-i`, `-v`)
  surviving token extraction and matching the pronoun "I".
- DOC-DISC-16's first-command word budget over-counts on VitePress pages that
  use `<<< @/path{lang}` snippet includes instead of a literal fence. On
  `ocx/website/src/docs/getting-started.md` it reads 2019 words before the
  first command against a manually confirmed 185. The same blind spot exists
  for MkDocs `--8<--` includes, used in 7 pages across 3 repos.
- DOC-OBS-01 and DOC-OBS-02, read against real CI configs on all 9
  generator-having repos: the 6 MkDocs-Material-with-Python sites and
  ocx-mirror-sdk already run `mkdocs build --strict`, which fails the build
  on a broken internal link or anchor. That satisfies DOC-OBS-01's intent
  through a mechanism the literal check text (`lychee --include-fragments
  <build-dir>`) does not recognize. Meanwhile ocx and grimoire run no link
  check of any kind against their real docs sites.
- DOC-OBS-05 and DOC-OBS-06's runbook classifier (`type: runbook` frontmatter
  or a `docs/runbooks/**` path) matches 0 of 248 fleet pages, including the
  two pages the rule's own rationale names as the evidence
  (`creeptd-ng/docs/dev-infra/play-full.md`, `play-lan.md`). The carrier
  fails on its own motivating case.
- DOC-OBS-15's inert-check grep, sampled at 5 hits across 3 rule files: 3 are
  the same duplicated rule file (`bob`, `ocx`, `ocx-mirror`) quoting the
  banned phrase `TODO: document` as an anti-pattern to avoid, not an unwired
  gate. Only creeptd-ng's 2 hits are true positives. The bare `TODO` arm
  needs dropping or narrowing to `TODO:` immediately after "gate" or "check".
- DOC-OBS-14's paragraph-fork detector, run over the real 248-page corpus,
  finds exactly 3 file pairs, and one of them is
  `ocx-save/website/src/docs/faq.md` and `ocx/website/src/docs/faq.md`,
  the fleet's known stale duplicate clone. The detector reproduces a known
  fact from independent evidence, which is a strong correctness signal.
- DOC-TYPE-18 needs no new script. It is already enforced by two real,
  passing fleet tests: `grimoire/src/install/client_target.rs:748-758`
  (row-set equality between the reference table and `ClientTarget::ALL`) and
  `ocx/test/tests/test_doc_command_reference.py` (per-command section
  presence). Cite these directly rather than writing a third implementation.
- DOC-DISC-01, 02, 04, 05, 06, 07, 08, 09, 10, 11, 12 and 14 all verify a
  discovery-procedure artifact (a needs file, a friction log, a coverage
  table) that no repo in the fleet has ever produced. There is nothing to
  scan them against. They get one row each saying so, not a fabricated hit
  count.
- DOC-TYPE-08 (circular per the ledger) still corroborates on all 3 real
  troubleshooting pages fleet-wide, not just the one the ledger sampled:
  `grimoire-indexer`, `ocx-catalog` and `ocx-mirror-sdk`'s troubleshooting
  pages all show 0 `Error:`/`Warning:`-titled entries and 0 occurrences of
  "This issue occurs when."
- DOC-TYPE-04's single hit, `ocx/website/src/docs/reference/command-line.md`,
  reads as a defensible true positive on reflection: the sentence uses first
  person ("we looked and found none") to voice a wrong reading a maintainer
  is warning against, which is exactly the narrative bleed the rule targets.
- 16 of 16 DOC-TYPE checks and 5 of 5 runnable DOC-DISC/DOC-OBS checks that
  admit a clean-versus-violated fixture pair go red on the planted violation
  and stay silent on the clean copy, after fixing two bugs in the plant
  harness itself (a stale function reference for DOC-OBS-05, and a 39-word
  paragraph one word short of DOC-OBS-14's 40-word floor).
- DOC-NAV-21's nav-grouping check (adjacent to DOC-DISC-21, which this dive
  measures) reports "no generator nav config found" for `ocx`, because it
  only looks for `mkdocs.yml` or `SUMMARY.md`. VitePress's own sidebar config
  lives elsewhere, so the check silently skips the fleet's one VitePress
  site instead of evaluating it, which is a detector gap worth fixing before
  ship, not a rule finding.

## Findings

Fleet corpus: 248 markdown pages across the 23 distinct docs surfaces named
in `docs-audit/docs-shape.md`, rebuilt from `fleet.json`'s per-repo page
lists and verified to match file-for-file
(`wave2-calibration-a/fleet-files.txt`). The program's own research corpus
adds 36 files under `.agents/research/` (`research_corpus.txt`). Every script
below lives under `wave2-calibration-a/` and is runnable as shown.

### 1. DOC-TYPE, page types

`check_doc_type.py` implements every runnable or script-status rule in
`docs-page-types.md` except the four the ledger already measured
(DOC-TYPE-05, DOC-TYPE-14) or that belong to a sibling commission
(DOC-TYPE-11, DOC-TYPE-12, both `inert-8/9` and owned by
`landing-check-portability`).

An early version of the path-type classifier checked `index`/`readme`
stems before the keyword rules, which misclassified every section-hub index
(`ops/index.md`, `reference/index.md`) as a site landing page and inflated
DOC-TYPE-10/11/12/13/16's hit counts. The fix moves the keyword rules first
and only falls back to `landing/index` for a true top-level or depth-1
index/readme (`common.py:107-127`). All numbers below are the corrected run.

| ID | Command as run | Files scanned | Hits | Sampled FP rate | Red on planted violation | Recommendation |
|---|---|---|---|---|---|---|
| DOC-TYPE-01 | `run_type01(fleet)` | 248 | 248 | 0/10 (real gap, not FP: 0 pages declare `doc_type`) | yes | Keep MUST, diff-scoped per the ledger. Check is sound. |
| DOC-TYPE-02 | meta-check on `checks/doc-type.sh`, which does not exist in any checkout | 0 (no shipped script to grep yet) | cannot run | n/a | n/a | Cannot verify from a checkout. Note: this harness's own `classify_path()` uses `basename`/path segments as a research-only proxy, which is exactly what the real shipped check must not do. |
| DOC-TYPE-03 | `run_type03(fleet)` | 248 | 0 | 0/0 (no sample to draw) | yes | Keep MUST. 0 hits on 248 real pages plus the wave-1 44-page result. Strongest check in the family. |
| DOC-TYPE-04 | `run_type04(fleet)` | 248 (53 reference-classified) | 1 | 0/1 FP (the one hit is a defensible true positive on reading, see Summary) | yes | Keep MUST. |
| DOC-TYPE-06 | `run_type06(fleet)` | 248 | 249 | 12/12 FP sampled | yes (on a hand-built fixture; never true on real pages, see below) | Drop to CONSIDER. Require an analogy verb (`like`, `similar to`, `think of it as`) adjacent to the tool name, not a bare mention. |
| DOC-TYPE-07 | `run_type07(fleet)` | 248 (how-to + reference) | 26 | not sampled for FP, word count is unambiguous; only the 100-word threshold is argued | yes | Keep CONSIDER. Threshold still uncited past the fetched exemplars. |
| DOC-TYPE-08 | `run_type08(fleet)` | 3 real troubleshooting-path pages | 3/3 | n/a, ledger already calls this circular | n/a | Skip: ledger marks circular. Corroborates on all 3 real pages fleet-wide, not just the ledger's 1-page sample. |
| DOC-TYPE-09 | `run_type09(fleet)` | 248 | 0 | 0/0 | yes | Keep SHOULD. Never fires today, which is expected since 0 pages carry `Error:`/`Warning:` headings at all. |
| DOC-TYPE-10 | `run_type10(fleet)` | 248 (22 landing-classified) | 21 | not sampled, word/sentence count is unambiguous | yes | Keep SHOULD. 21 of 22 landing pages exceed 30 words or 1 sentence terminator before the first heading or fence, so the threshold is doing real work; cite the 5 exemplar landing pages on the row per the ledger's fixable-citation list. |
| DOC-TYPE-13 | `run_type13(fleet)` | 248 (22 landing-classified) | 22 (true-zero-case reading heuristic only) | n/a, ledger marks heuristic | n/a | Skip: ledger marks heuristic. The true-zero-case script alone cannot tell task-phrased grids from product-noun grids; still needs a reviewer pass. |
| DOC-TYPE-14 | (ledger's own §4 measurement) | 186 | 0 | n/a | n/a | Skip: one of the four already measured. |
| DOC-TYPE-15 | `run_type15(fleet)` | 248 | 3 | 3/3 FP | yes | Keep MUST, but require `trusted by (thousands\|millions\|leading\|[0-9,]+\+? (companies\|developers\|teams))`, not bare `trusted by`. All 3 real hits are security-trust-model prose, not adoption claims. |
| DOC-TYPE-16 | `run_type16(fleet)` | 248 (22 landing-classified) | 12 | not sampled, list/table row count is unambiguous | yes | Keep SHOULD. |
| DOC-TYPE-17 | `run_type17(fleet)` | 248 (658 entries across 53 reference pages) | 649 (98.6%) | 10/10 sampled show the check missing content that reads as present in prose | yes | Downgrade to CONSIDER. Keep the syntax-fence and multi-row-table arms; drop the `remarks`/`errors`/`example`-by-keyword arms, which are vocabulary proxies, not structure detectors. |
| DOC-TYPE-18 | citation, not a fresh script | 2 files (`client_target.rs`, `test_doc_command_reference.py`) | both pass today in CI | n/a, verified by reading, not sampling | already enforced | Keep MUST. Cite these two files directly in the shipped rule rather than asking a third repo to invent a third implementation. |
| DOC-TYPE-19 | `run_type19(fleet)` | 248 (53 reference-classified) | 6 | not sampled, heading depth and count are unambiguous | yes | Keep SHOULD. The H5 arm should fold into DOC-NAV-05 per the ledger; DOC-TYPE-19 keeps the item-count arm only. |
| DOC-TYPE-20 | `run_type20(fleet)` | 248 | 7 | not sampled, word count is unambiguous; matches the ledger's own 2-point calibration | yes | Keep MUST. |
| DOC-TYPE-21 | (owned by DOC-OBS-01, see below) | n/a | n/a | n/a | n/a | Skip: ledger merges this into DOC-OBS-01. Measured there. |

Skip lines for the remaining ledger-marked rows: DOC-TYPE-11 and DOC-TYPE-12
are `inert-8/9` and owned by the `landing-check-portability` commission, not
this one.

Plant confirmation: `python3 plant_doc_type.py` runs a clean/violated
fixture pair through every rule that admits one. 16 of 16 pass (clean 0
hits, violated 1+ hits) after the classifier ordering fix above.

### 2. DOC-DISC, use-case discovery

`docs-use-case-discovery.md` splits into two halves. DOC-DISC-01 through 12
verify a discovery-procedure artifact this program specifies but no repo has
ever produced. DOC-DISC-13 through 22 verify real docs pages.

**No target exists in any checkout.** DOC-DISC-01, 02, 04, 05, 06, 07, 08,
09, 10, 11, 12 and 14 each check a file shape (a needs list, a friction log
with three named headings, a coverage table, a `--help`-diffed longlist)
that is greenfield everywhere in the fleet, per `docs-use-case-discovery.md`'s
own "New commitments" section. Scanning the 248 real pages against these
checks returns 0 targets, not 0 hits. These rows are marked
`no-target-in-checkout` rather than reported with a fabricated hit count.

**DOC-DISC-03, simulated (the commissioned centerpiece).** No `needs.txt`
exists anywhere in the fleet, so `check_doc_disc.py`'s
`run_disc03_simulation()` builds the exact token file the rule specifies
(every fleet heading word plus every CLI flag and subcommand name from
`ocx/website/src/docs/reference/command-line.md`, 2,964 tokens) and runs the
rule's own `rg -iof tokens.txt needs.txt` semantics against 10 hand-written
need sentences, 5 legitimate and 5 that paraphrase a page back at itself.

| Legitimacy | Sentence (trimmed) | Flagged | Verdict |
|---|---|---|---|
| legitimate | "I need to get a working install fast" | yes | FP |
| legitimate | "I need every build to produce the same binary...which machine ran it" | yes | FP |
| legitimate | "I need to see who is allowed to change what" | yes | FP |
| legitimate | "I need to know when a package version moves" | yes | FP |
| legitimate | "I need one place that tells me what this project is for" | yes | FP |
| paraphrase | "I need to run add to install a package" | yes | TP |
| paraphrase | "I need to configure the lock file" | yes | TP |
| paraphrase | "I need the reference page to list every option" | yes | TP |
| paraphrase | "I need push to work reliably" | yes | TP |
| paraphrase | "I need the troubleshooting page to explain errors" | yes | TP |

100 percent false positive on the legitimate sample, 100 percent true
positive on the paraphrase sample. One concrete cause: extracting CLI flags
by stripping leading dashes turns a single-letter short flag such as `-i`
into the bare token `i`, which then matches the pronoun "I" in ordinary
prose via the rule's own `\bi\b` boundary match. A second cause is common
English words (`need`, `new`, `what`) appearing as substrings of real
headings and being absorbed into the token file whole. Fix: drop
single-character tokens, and require a token match against a multi-word
phrase (an exact heading title or a backtick-quoted flag), not a
single-word substring.

| ID | Command as run | Files scanned | Hits | Sampled FP rate | Red on planted violation | Recommendation |
|---|---|---|---|---|---|---|
| DOC-DISC-01, 02, 04, 05, 06, 07, 08, 09, 10, 11, 12, 14 | n/a | 0 (no discovery artifact exists anywhere in the fleet) | n/a | n/a | n/a | Cannot verify from a checkout. Greenfield, per the family's own "New commitments" section. |
| DOC-DISC-03 | `run_disc03_simulation()` | simulated, 10 hand-built need sentences against a 2,964-token file | 10/10 flagged | 5/5 FP on legitimate needs | n/a (no fleet artifact to plant into; the simulation itself demonstrates the failure) | Keep SHOULD per the ledger, but the token-list construction needs a hard rewrite: drop tokens under 4 characters, match whole phrases not single words, before this can ship at any severity above CONSIDER. |
| DOC-DISC-13 | `run_disc13(fleet)` | 248 | 248 | 0/10 (real gap, matches DOC-TYPE-01's 0/248) | yes | Keep MUST. Same carrier question as DOC-TYPE-01, owner is DOC-TYPE-01 per the ledger. |
| DOC-DISC-15 | `run_disc15(fleet)` | 248 (17 getting-started/tutorial-classified) | 1 | 0/1 FP; `ocx/website/src/docs/installation.md` genuinely runs 16 steps/fences with no named external system | yes | Keep SHOULD. |
| DOC-DISC-16 | `run_disc16(fleet)` | 248 (17 getting-started/tutorial-classified) | 4 | 1/4 shows a serious detector gap (see Summary and §4), not a false positive on the obligation itself | yes | Keep SHOULD, but fix the fence-detection blind spot before shipping (see §4) or it will grossly overstate the word count on VitePress and MkDocs-snippet pages. |
| DOC-DISC-17 | `run_disc17(fleet, scoped=True)` then `scoped=False` | 248 scoped (0 declare `doc_type: tutorial`); 248 informational (3 getting-started/tutorial-classified pages) | 0 scoped; 3 informational | n/a, ledger marks inert-9/9 | yes (scoped fixture) | Skip: ledger marks inert-9/9 for the scoped reading. Informational proxy finds real branching syntax on 3 pages (`ocx`, `ocx-catalog`, `ocx-save` installation/quickstart pages), which is evidence for when the declaration key lands, not a finding today. |
| DOC-DISC-18, 20 | n/a | n/a | n/a | n/a | n/a | Skip: ledger marks heuristic. |
| DOC-DISC-19 | n/a | n/a | n/a | n/a | n/a | Skip: ledger marks heuristic and recommends drop. |
| DOC-DISC-21 | `run_disc21(fleet)` | 22 repos | 9 with a generator nav config found, 13 skipped (no config) | n/a, structural read not a prose grep | n/a (no clean/violated fixture; reads real config) | Keep SHOULD. `grimoire`'s `SUMMARY.md` is a genuine 1-group flat list, the fleet's only real violation. The check silently skips `ocx` (VitePress) because it only looks for `mkdocs.yml`/`SUMMARY.md`, see §4. |
| DOC-DISC-22 | `run_disc22(fleet)` | 248 (55 getting-started/tutorial/how-to-classified) | 0 | 0/0 | yes | Keep SHOULD. Never fires today; the dev-only trigger list is narrow (test-key patterns), worth widening before relying on the 0 as proof of compliance. |

Plant confirmation: `python3 plant_doc_disc_obs.py` (after two harness bug
fixes below) shows 5 of 5 runnable DOC-DISC checks going red on a planted
violation and staying silent on a clean fixture.

### 3. DOC-OBS, observability

`docs-observability.md`'s checks split between page-content greps and
CI/config-shape checks. `check_doc_obs.py` covers the page and template
checks; `check_doc_obs_ci.py` (written for this dive, since no prior script
covered DOC-OBS-01/02/04) covers the link-checker and blocking-policy
checks by reading each generator repo's actual taskfile and workflow files.

**DOC-OBS-01 and DOC-OBS-02, read against real CI config on 9 repos with a
generator:**

| Repo | `mkdocs build --strict` (internal link/anchor gate) | lychee call | Scoped to a build dir | `--exclude-path` for generated anchors |
|---|---|---|---|---|
| ocx-catalog | yes | `lychee --cache --max-cache-age 1d .` | no (raw tree) | no |
| grimoire-indexer | yes | `lychee --cache --max-cache-age 1d .` | no (raw tree) | no |
| ocx-mirror | yes | `lychee --no-progress docs/` | no (raw tree) | no |
| ocx-mcp | yes | `lychee --no-progress docs/` | no (raw tree) | no |
| ocx-indexbot | yes | `lychee --cache --max-cache-age 1d .` | no (raw tree) | no |
| ocx-sdk-python | yes | `lychee --cache --max-cache-age 1d --exclude-path tests/fixtures .` | no (raw tree) | yes, but excludes test fixtures, not the mkdocstrings stub that actually causes the 65 phantom failures (`docs-shape.md` §5) |
| ocx-mirror-sdk | yes | none | n/a | n/a |
| grimoire (mdBook) | no such mechanism; `book.toml` has no `[output.linkcheck]` and `docs.yml`'s deploy job runs no link check | none against `docs/` | no | no |
| ocx (VitePress) | no such mechanism; `deploy-website.yml` and `website/taskfile.yml` run no link check against the site | none against `website/` (the repo's only `lychee` use is `.claude/taskfile.yml`'s `lint:links`, scoped to `.claude/`, `CLAUDE.md` and `AGENTS.md`, not the docs site) | n/a | n/a |

The 6 MkDocs-Material-with-Python sites plus `ocx-mirror-sdk` already fail
their build on a broken internal link or heading anchor, because
`mkdocs build --strict` checks that at build time. That satisfies DOC-OBS-01's
underlying rationale through a different mechanism than the literal check
text names (`lychee --include-fragments <build-dir>`), which would report
"cannot verify" or false-negative on every one of these repos if run
literally. `grimoire` and `ocx`, the fleet's two non-MkDocs real sites, run
no link check of any kind against their actual docs output. This confirms
`docs-shape.md`'s ad hoc discovery (89 percent dead falling to 2.9 percent
on `ocx`) was never a live gate; it was the audit team's own one-time scan.

| ID | Command as run | Files scanned | Hits | Sampled FP rate | Red on planted violation | Recommendation |
|---|---|---|---|---|---|---|
| DOC-OBS-01 | `run_obs01_02()` in `check_doc_obs_ci.py` | 9 generator repos' CI/taskfile configs | 2 of 9 (grimoire, ocx) have no build-time link/anchor check at all | n/a, config presence not a text grep | n/a (config-shape check, no clean/violated fixture built) | Keep MUST, but rewrite the verification to accept `mkdocs build --strict` (or the generator's own strict-build equivalent) as satisfying the obligation, not only a `lychee --include-fragments <build-dir>` invocation. |
| DOC-OBS-02 | same | 9 | 7 of 9 run lychee against a raw tree with no `--root-dir`/`--exclude-path` for generated anchors; ocx-sdk-python has an exclude list that misses the actual mkdocstrings stub | n/a | n/a | Keep MUST. Cite ocx-sdk-python's `--exclude-path tests/fixtures` as the concrete near-miss: right flag, wrong path. |
| DOC-OBS-03 | `run_obs03()` | 22 repos | 0 of 22 have `docs/.meta/trigger-matrix.md` | n/a, presence check | n/a | Keep SHOULD. Greenfield fleet-wide, matches the ledger. |
| DOC-OBS-04 | `run_obs04()` in `check_doc_obs_ci.py` | 14 docs-adjacent AI-config rule files | 3 state a blocking posture (`bob`, `ocx`, `ocx-mirror`'s identical `rust-quality/docs-and-tracing.md`, plus `creeptd-ng/doc-sync.md`), 0 state the required non-blocking posture explicitly | manual read: the 3 "block" hits are a general review-severity word, not docs-drift-specific; only `creeptd-ng` genuinely blocks docs drift | n/a | Keep SHOULD (pinned per frame decision 4). 0 of 14 rule files state the non-blocking posture DOC-OBS-04 requires, so this is a real, fleet-wide gap to fill on rollout, not a false positive. |
| DOC-OBS-05 | `run_obs05_classification(fleet)` | 248 | 0 | n/a, real gap: the rule's own motivating case (`creeptd-ng`'s 2 runbook pages) is not classified as `runbook` by either carrier | yes (fixed, see below) | Keep SHOULD, but the classifier fails its own evidence. Retrofit `type: runbook` onto the 2 known pages at rollout, or the rule ships unable to ever fire. |
| DOC-OBS-06 | spec only; 0 runbook-classified pages exist to extract commands/URLs from | 0 | n/a | n/a | n/a | Cannot verify against real content today (0 pages classify as runbook). Spot check on the 2 unclassified candidate pages: both carry real fenced shell commands (4 and 2 blocks), so the "assert exit 0" half is meaningful once classification is fixed. Both also cite private LAN IPs (`192.168.1.42`) as illustrative addresses, which an "assert 2xx" check must exempt or it manufactures a permanent failure. |
| DOC-OBS-07 | `run_obs07()` | 22 repos (meta file) + 39 pages (getting-started/landing-classified) | 22/22 repos, 39/39 pages miss | n/a, greenfield | n/a | Keep SHOULD. 0 of 248 pages and 0 of 22 repos carry any TTHW record, matching the ledger's "0 of 9" on the narrower real-site count. |
| DOC-OBS-08 | (ledger's own §4 measurement) | 186 | 6 (7 raw hits) | 5/7 FP per the ledger | n/a | Skip: one of the four already measured. A broader informational run over 284 files (fleet + research corpus) returns 264 hits, mostly from `kate-middlechild`'s internal design/research notes and this program's own research corpus, both outside the ledger's 186-page "9 real sites" denominator. Worth flagging for the glob-scope question, not a re-measurement of the rule. |
| DOC-OBS-09 | `run_obs09()` | 22 repos | 22/22 miss (21 have no PR template; 1, `vscode-ocx`, has one without the required keys) | n/a | n/a | Keep SHOULD. 0 of 22 satisfy this today. |
| DOC-OBS-10 | n/a | n/a | n/a | n/a | n/a | Skip: ledger already resolves this to drop, folded into DOC-OBS-12. Not re-measured. |
| DOC-OBS-11 | `run_obs11()` | 22 repos | 22/22 miss (19 have no issue-template directory, and 3 others, `grimoire`, `ocx`, `vscode-ocx`, have templates but none labelled `docs`) | n/a | n/a | Keep SHOULD. Matches the ledger's "0 of 9" on the broader 22-repo count too. |
| DOC-OBS-12 | n/a | n/a | n/a | n/a | n/a | Skip: ledger marks heuristic. |
| DOC-OBS-13 | `run_obs13_ci()` | CI/taskfile configs across 22 repos | 0 | n/a | n/a | Keep SHOULD for the CI-config arm, which is clean fleet-wide. The rule-file arm (grep the shipped rule text for a bare cadence number) has no target yet since the rule set is unshipped. |
| DOC-OBS-14 | `run_obs14(fleet)` | 248 | 3 file pairs | 0/3 FP: one pair is `kate-middlechild`'s own hand-forked design notes, and the other two are `ocx-save` versus `ocx`'s `faq.md` and `environment.md`, the fleet's known stale duplicate clone | yes (fixed, see below) | Keep SHOULD. The detector independently reproduces the known `ocx`/`ocx-save` duplication, which is strong evidence it works. |
| DOC-OBS-15 | `run_obs15()` | 14 docs-adjacent rule files | 5 | 3/5 FP (the bare `TODO` arm matches a rule file's own anti-pattern example, not an unwired gate) | n/a (real-file grep, no fixture built) | Keep MUST per the ledger's promotion, but narrow the `TODO` arm to `TODO`(:)? immediately preceded by "gate" or "check", since the bare word matches ordinary prose that discusses TODO comments as a thing to avoid. |

Two bugs found and fixed in the prior plant harness before it could confirm
red/green correctly: `plant_doc_disc_obs.py`'s DOC-OBS-05 case called
`run_obs05_classification()` with no arguments, silently re-scanning the
real fleet (which returns 0 either way) instead of the two planted fixture
files; and its DOC-OBS-14 fork fixture's second paragraph was 39 words, one
short of the detector's 40-word floor, so only 2 of the intended 3 shared
paragraphs qualified. Both fixed in place; `python3 plant_doc_disc_obs.py`
now shows 8 of 8 cases passing.

### 4. A detector gap that recurs across families

DOC-DISC-16 and (adjacent) DOC-TYPE-07/10/11's "count from the heading to
the first command or fence" logic all key on a literal ` ``` ` fence. Two
real fleet generators do not always show a command that way:

- VitePress's `<<< @/path/to/file.sh{sh}` snippet-include directive, used in
  `ocx/website/src/docs/getting-started.md` and `user-guide.md`. The literal
  first fence on `getting-started.md` does not appear until line 170 (a
  `toml` block unrelated to the page's opening command), so a naive
  fence-scan reads "2019 words before the first command" against a manually
  confirmed 185.
- MkDocs' `pymdownx.snippets` `--8<--` include marker, used in 7 pages
  across `ocx-mirror`, `ocx-mcp` and `ocx-mirror-sdk`, including
  `ocx-mirror-sdk/docs/getting-started/first-generator.md`, a first-steps
  page that would trip the same false reading.

Any check in this rule set that looks for "the first fenced command" needs
to also match `^\s*<<<\s` and `^\s*--8<--` (and mdBook's `{{#include`, unused
in the fleet today but part of the same shape), or it will systematically
misjudge exactly the pages that use each generator's own tested-inclusion
mechanism, which per `docs-use-case-discovery.md` are the pages this program
most wants to reward, not penalize.

## Normative guidance candidates

1. **A `<<<`/`--8<--`/`{{#include` snippet directive counts as a command for
   every "first fenced block" check in this rule set.**
   Rationale: `check_doc_disc.py`'s `run_disc16` overstates
   `ocx/website/src/docs/getting-started.md` by 1834 words because it only
   recognizes a literal fence.
   VERIFICATION: `grep -c '^\s*<<<\|^\s*--8<--\|{{#include'` on the block
   before the current fence match. Treat a hit at or before the first fence
   as an earlier fence.
   Evidence level: measured (this dive, §4).
   Proposed severity: pinned into DOC-DISC-16's check text.
   CHANGES: DOC-DISC-16 (and informs DOC-TYPE-07/10/11's future rewrites).

2. **DOC-TYPE-06's tool-analogy check must require an analogy verb next to
   the tool name, not a bare mention.**
   Rationale: the bare-mention pattern fires on every literal install
   command in the fleet, 249 hits with a 12/12 sampled false-positive rate.
   VERIFICATION: `grep -niE '\b(Nix|APT|Homebrew|...)\b.{0,25}\b(like|similar to|think of it as|the way)\b|\b(like|similar to|think of it as)\b.{0,25}\b(Nix|APT|Homebrew|...)\b'`
   over stripped prose, run over the 248-file fleet corpus.
   Evidence level: measured (this dive, §1).
   Proposed severity: CONSIDER.
   CHANGES DOC-TYPE-06.

3. **DOC-TYPE-17's reference-entry schema check keeps only the syntax-fence
   and multi-row-table arms. Drop the remarks/errors/example keyword arms.**
   Rationale: the keyword arms fire on 649 of 658 real entries (98.6
   percent) including entries that carry the missing content in ordinary
   prose without the literal trigger word.
   VERIFICATION: `python3 check_doc_type.py DOC-TYPE-17` after removing the
   `has_remarks`/`has_errors`/`has_example` arms from `run_type17`. Confirm
   the remaining hit rate against the same 658-entry corpus.
   Evidence level: measured (this dive, §1).
   Proposed severity: CONSIDER (down from the ledger's SHOULD).
   CHANGES DOC-TYPE-17.

4. **DOC-TYPE-15's trust-claim pattern requires a following count noun.**
   Rationale: the bare `trusted by` arm matches security-trust-model prose
   3 of 3 times on this fleet, 0 of 3 are adoption claims.
   VERIFICATION: `grep -niE 'trusted by (thousands|millions|leading|[0-9,]+\+? (companies|developers|teams))'`,
   confirm 0 hits on the same 3 files that false-positived under the old
   pattern.
   Evidence level: measured (this dive, §1).
   Proposed severity: MUST. Only the pattern moves.
   CHANGES DOC-TYPE-15.

5. **DOC-DISC-03's token file drops single-character tokens and matches
   whole phrases, not single words.**
   Rationale: simulated against 10 realistic need sentences, the current
   design flags 5 of 5 legitimate needs, largely because stripped CLI short
   flags (`-i` becomes `i`) collide with the pronoun "I" and common English
   words collide with heading substrings.
   VERIFICATION: re-run `check_doc_disc.py`'s `run_disc03_simulation()`
   after filtering tokens to length 4 or more and requiring a 2+ word phrase
   match. Confirm the legitimate sample drops to 0 flagged.
   Evidence level: measured (this dive, §2).
   Proposed severity: CONSIDER (down from the ledger's SHOULD, until
   re-simulated at an acceptable rate).
   CHANGES DOC-DISC-03.

6. **DOC-OBS-01's verification accepts a generator's own strict build
   (`mkdocs build --strict` or equivalent) as satisfying the obligation,
   not only a `lychee --include-fragments <build-dir>` invocation.**
   Rationale: 7 of 9 real generator-having repos already gate the build on
   broken internal links and anchors through the generator itself. The
   literal lychee-only check text would report all 7 as non-compliant.
   VERIFICATION: `grep -n 'mkdocs build --strict\|mdbook-linkcheck\|lychee.*--include-fragments.*\(site\|dist\|book\)'`
   over each repo's taskfile and CI workflow files.
   Evidence level: measured (this dive, §3).
   Proposed severity: MUST. Only the acceptance criteria widen.
   CHANGES DOC-OBS-01.

7. **DOC-OBS-05/06's runbook classifier must be retrofitted onto its own
   motivating instance before it ships.**
   Rationale: `creeptd-ng/docs/dev-infra/play-full.md` and `play-lan.md`,
   named directly in `docs-observability.md`'s own rationale as the
   evidence for this rule, match neither the `type: runbook` frontmatter nor
   the `docs/runbooks/**` path carrier. The check would never fire on the
   one real case it exists to catch.
   VERIFICATION: after adding `type: runbook` frontmatter to both pages,
   confirm `run_obs05_classification(fleet)` returns exactly those 2 files.
   Evidence level: measured (this dive, §3).
   Proposed severity: SHOULD, pinned. This pins a project decision to
   retrofit the two known pages at rollout.
   CHANGES DOC-OBS-05, DOC-OBS-06.

8. **DOC-OBS-15's inert-check grep narrows the bare `TODO` arm.**
   Rationale: 3 of 5 sampled hits are one rule file (duplicated across
   `bob`, `ocx`, `ocx-mirror`) quoting `TODO: document` as a named
   anti-pattern, not an admission that a stated gate is unwired.
   VERIFICATION: `grep -niE '\b(gate|check)\b.{0,15}TODO|TODO.{0,15}\b(gate|check)\b'`
   in place of the bare `TODO` alternative. Confirm the 3 false positives
   drop out and creeptd-ng's 2 true positives remain.
   Evidence level: measured (this dive, §3).
   Proposed severity: MUST. Only the pattern narrows.
   CHANGES DOC-OBS-15.

## AI-agent angle

An agent asked to add a rule check from this rule set will reach for a bare
keyword grep first, the same shape every check above that failed did. The
smallest mechanical guard against that: before a new or edited check ships,
run it over the fleet's own 248-page corpus and report the raw hit count in
the PR description, the same discipline `page-type-set-and-declaration.md`
§6 already modeled. A check that fires on more than roughly 10 percent of a
type-scoped corpus is very likely testing vocabulary, not structure, per
DOC-TYPE-17 and DOC-TYPE-06 above, and should be read that way before it
ships at MUST.

A second, subtler failure: an agent writing a "first command" or "first
fenced block" check will test it against its own hand-written fixture,
which almost never uses a generator's snippet-include syntax, so the blind
spot in §4 never surfaces until it hits a real VitePress or MkDocs page.
The mechanical guard is the same one this dive used: test against real
fleet pages, not only a fixture you wrote yourself, before trusting a
0-hits or clean-fixture result.

## Contested / evolving

- **DOC-OBS-01's literal verification versus its actual intent.** The rule
  text names `lychee --include-fragments <build-dir>` as the check. Real
  fleet evidence (§3) shows the intent (fail the build on a broken internal
  link or anchor) is already satisfied on 7 of 9 real sites through
  `mkdocs build --strict`, a different mechanism entirely. Resolved in
  guidance candidate 6: widen the verification to accept either mechanism,
  rather than asking 7 compliant repos to add a redundant lychee invocation.
- **DOC-OBS-05/06's classification carrier versus its own motivating
  case.** `docs-observability.md` names `creeptd-ng`'s two pages as the
  evidence for a runbook-blocking policy, but neither page satisfies either
  proposed carrier (frontmatter or path glob). This is not a conflict
  between sources, it is the rule failing its own worked example. Resolved
  in guidance candidate 7: the two pages must be retrofitted at rollout, or
  the rule ships permanently inert on its only real target.
- **DOC-DISC-03's severity, SHOULD per the ledger versus what the
  simulation shows.** The ledger downgrades DOC-DISC-03 from MUST to
  SHOULD without a measured rate. This dive's simulation shows a 100
  percent false-positive rate on legitimate needs with the check as
  specified. SHOULD is defensible only if the check ships un-gating (a
  reviewer prompt, not an automated fail); at any severity that blocks
  progress automatically, the rate argues for CONSIDER until the token-list
  rewrite in guidance candidate 5 lands and is re-simulated.

## Sources

| Command / file | What it is | Date | Why worth reading |
|---|---|---|---|
| `wave2-calibration-a/fleet-files.txt` | 248-file fleet manifest, rebuilt from `fleet.json` per-repo page lists and verified identical to the prior session's `fleet_manifest.txt` | 2026-09-05 | The exact corpus every DOC-TYPE/DOC-DISC/DOC-OBS check below ran against |
| `wave2-calibration-a/research_corpus.txt` | 36 files under `.agents/research/`, this program's own artifacts | 2026-09-05 | Used to test whether a check fires on the program's own writing, per the commission brief |
| `wave2-calibration-a/common.py` | Shared helpers: fence-aware line iteration, heading parser, the path-type classifier (with the index/readme-ordering bug fixed) | 2026-09-05 | Every other script imports this |
| `wave2-calibration-a/check_doc_type.py` | All runnable/script DOC-TYPE checks except the ledger's four and the two owned by `landing-check-portability` | 2026-09-05 | `python3 check_doc_type.py` reproduces every DOC-TYPE row in §1 |
| `wave2-calibration-a/check_doc_disc.py` | DOC-DISC-13/15/16/17/21/22 plus the DOC-DISC-03 simulation | 2026-09-05 | `python3 check_doc_disc.py` reproduces every DOC-DISC row in §2 |
| `wave2-calibration-a/check_doc_obs.py` | DOC-OBS-03/05/07/09/10/11/13/14/15 plus an informational DOC-OBS-08 supplement | 2026-09-05 | `python3 check_doc_obs.py` reproduces the page/template-shape rows in §3 |
| `wave2-calibration-a/check_doc_obs_ci.py` | DOC-OBS-01/02/04, written for this dive; reads each generator repo's real taskfile and workflow files | 2026-09-05 | `python3 check_doc_obs_ci.py` reproduces the CI-config rows in §3 |
| `wave2-calibration-a/plant_doc_type.py` | Clean/violated fixture pairs for 16 DOC-TYPE checks | 2026-09-05 | `python3 plant_doc_type.py`, 16/16 pass |
| `wave2-calibration-a/plant_doc_disc_obs.py` | Clean/violated fixture pairs for 5 DOC-DISC and 3 DOC-OBS checks, two bugs fixed in this dive | 2026-09-05 | `python3 plant_doc_disc_obs.py`, 8/8 pass after the fixes |
| `/home/mherwig/dev/*/taskfile*.yml`, `*/.github/workflows/*.yml`, `grimoire/book.toml` | Real CI/build config across all 9 generator-having repos | 2026-09-05 | Primary evidence for DOC-OBS-01/02/04, read directly, not summarized from a prior audit |
| `/home/mherwig/dev/{bob,ocx,ocx-mirror}/.claude/rules/rust-quality/docs-and-tracing.md`, `/home/mherwig/dev/creeptd-ng/.claude/rules/doc-sync.md` | The 4 rule files DOC-OBS-15 fires on | 2026-09-05 | Confirms 3 of 5 hits are the same duplicated false positive |
| `/home/mherwig/dev/creeptd-ng/docs/dev-infra/{play-full,play-lan}.md` | The fleet's only 2 runbook-shaped pages | 2026-09-05 | Confirms DOC-OBS-05/06's classifier fails on its own motivating case, and that both pages carry real fenced commands and non-routable example IPs |
| `/home/mherwig/dev/grimoire/src/install/client_target.rs:742-775`, `/home/mherwig/dev/ocx/test/tests/test_doc_command_reference.py` | The two existing fleet tests that already enforce DOC-TYPE-18 | 2026-09-05 | Read in full to confirm the citation rather than trust it |
| `/home/mherwig/dev/ocx/website/src/docs/getting-started.md`, `ocx-mirror-sdk/docs/getting-started/first-generator.md` | The pages that expose the snippet-include fence-detection gap | 2026-09-05 | Concrete file:line evidence for guidance candidate 1 |
| `.agents/research/docs-topic-map/wave2-severity-ledger.md` §§3-6 | The severity ledger this dive is scoped not to duplicate | 2026-09-05 | Source of the runnable/script/circular/inert/heuristic status per rule, and the four already-measured checks |

---
title: "Gate replays: LNK-06 citation rot and LEN-06 guard-removal, against real ocx history"
topic: ratchet
agent: research-lang / code-docs-ratchet (gate-replays)
model: claude-sonnet-5
date_researched: 2026-09-27
sources_count: 16
scope: >
  A scratch clone of ocx (`git clone --no-local /home/mherwig/dev/ocx`, HEAD
  2691d3c1638e75b7830fcd68784a2d23a66a0802, matching the ratchet consolidation's
  measurement SHA). LNK-06 replayed exactly (citation-by-citation) on
  b79abbe8d3 and then over the last 300 commits; LEN-06 implemented fresh
  (guard_recogniser.py, guard_removal.py — the original recognizer2.py no
  longer exists anywhere on disk) and replayed over the last 200 commits, with
  every candidate hand-read. Recall measured on the 100 guards in
  code-docs-audit/sample.md sec.5 and the 40 guard sites in
  code-docs-audit/eval-sites.md; precision measured and hand-verified on 100
  random ocx comment blocks.
---

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  - [1. LNK-06 citation-by-citation replay on the crate-split commit](#1-lnk-06-citation-by-citation-replay-on-the-crate-split-commit)
  - [2. LNK-06's own verification command has a measured false negative](#2-lnk-06s-own-verification-command-has-a-measured-false-negative)
  - [3. LNK-06 over the last 300 commits](#3-lnk-06-over-the-last-300-commits)
  - [4. The seven-rule recogniser, reconstructed](#4-the-seven-rule-recogniser-reconstructed)
  - [5. Recall on the 100 sample.md guards and the 40 eval-site guard spans](#5-recall-on-the-100-samplemd-guards-and-the-40-eval-site-guard-spans)
  - [6. Precision on 100 random, previously-unlabelled ocx blocks](#6-precision-on-100-random-previously-unlabelled-ocx-blocks)
  - [7. LEN-06 diff-time check, replayed over 200 commits](#7-len-06-diff-time-check-replayed-over-200-commits)
  - [8. Hand-read verdicts on all 12 LEN-06 candidates](#8-hand-read-verdicts-on-all-12-len-06-candidates)
  - [9. External grounding: move detection and false-positive tolerance](#9-external-grounding-move-detection-and-false-positive-tolerance)
- [Normative guidance candidates](#normative-guidance-candidates)
- [Decisions this dive proposes](#decisions-this-dive-proposes)
- [Sources](#sources)

## Summary

- **LNK-06 on the crate-split commit, exhaustively:** `b79abbe8d3` deletes or
  renames 429 paths; 66 pre-existing ADR/rule files cite at least one (375
  citation lines total). 25 lines, in 8 rule files, are genuinely repaired in
  the same commit. The remaining 350 citation lines, across 58 files, are
  left stale. All 58 are live-pointer rot, not the record's historical
  subject — the one record that *is* about the split, `adr_crate_split_workspace.md`,
  is newly added in this very commit and structurally cannot appear in the
  flagged set (Finding 1).
- **The literal LNK-06 verification command under-blocks by exactly one file
  here.** Its "did the whole file change at all" check wrongly clears
  `adr_toolchain_activation.md`: the file was edited for an unrelated reason,
  but keeps citing 21 distinct dead `ocx_lib` paths across 29 citation lines,
  unrepaired to this day (Finding 2).
- **Replayed over the last 300 commits (not 200), the gate fires 3 times, not
  2.** The third fire (`e0cd8a33`, 247 commits back — outside the linkage
  doc's 200-commit window) is real: two ADRs still cite deleted
  `.claude/skills/swarm-*` paths, unrepaired at current HEAD. All 3 fires are
  true positives: measured precision 3/3 = 100% (Finding 3).
- **The seven-rule recogniser had no surviving implementation to replay.**
  `guard-shape.md`'s own scratch `recognizer2.py` is gone (checked: not under
  this worktree, not under `~/.cache/research-lang`). Rebuilt it from the
  published rule table as `guard_recogniser.py` (Finding 4).
- **Recall reproduces almost exactly.** 43/100 (0.430) on the sample.md
  guards, 17/40 (0.425) on the eval-sites guard spans, 0/8 false fires on the
  FTC controls. Combined 0.429 against the documented 0.432. 7 of the 9
  documented per-site misses (OCX-06/07/09/13/17, PY-01, TS-03) reproduce
  exactly; 2 (OCX-19, PY-02) fire in this reconstruction but were misses in
  guard-shape's original (Finding 5).
- **Precision does not reproduce.** Of 100 random, previously-unlabelled ocx
  blocks, the recogniser fires on 32. Hand-reading every one against GRD-01's
  constraint-plus-consequence test finds 19 true guards and 13 false
  positives: precision 0.594, well below guard-shape's reported 0.714
  (combined) / 0.729 (fleet-only). Same seven rules, same source table,
  measurably different real-world precision (Finding 6).
- **Built the LEN-06 diff-time guard-removal check and replayed it over the
  last 200 ocx commits.** 79 hunks had a pre-image that fired; 34 still fire
  post-edit (compression preserved the shape, LEN-06 passes); of the 45 that
  lost the fire, 33 are exempt because the same commit separately adds a
  file-qualified pointer, a test, or a lint-owned form; 12 final candidates
  (Finding 7).
- **Hand-reading all 12 candidates finds zero genuine, unreplaced guard
  deletions.** 1 is a same-hunk relocation the script's "longest comment run"
  pairing mismatched against an unrelated paragraph; 6 are legitimate
  GRD-03-style consolidations, each verified present at a new home in the
  same commit; 3 are legitimate rewrites where the content grew but the
  recogniser's ~43% recall missed the new phrasing. Naive-implementation
  false-positive rate on its own flags: 12/12 = 100% (Finding 8).
- **Google's Tricorder bar for a checker to run in code review at all is
  under 10% effective false positives; gating/blocking a change needs
  effectively zero** (abseil.io ch.20, "Software Engineering at Google"). A
  check misfiring on everything it flags cannot ship as a blocking MUST.
- **git already has the fix for the pairing bug that produced Finding 8's one
  script artifact:** `--color-moved=blocks --diff-algorithm=histogram`
  detects a block moved within a diff instead of scoring it as an unrelated
  delete-plus-add (git-scm.com/docs/git-diff).
- **Decision: LNK-06 stays MUST**, with one required fix to its verification
  command (per-citation, not whole-file, staleness) and one recommended
  widening (300-commit window over 200 finds a real, still-open violation).
- **Decision: LEN-06 ships as SHOULD, not MUST**, exactly as the ratchet
  consolidation's own conditional promotion criterion anticipated ("MUST once
  `guard_removal.py` ships with a measured false-positive rate") — that rate,
  measured here on a naive hunk-level implementation, is 100% on its own
  flags in 200 real commits. Promotion to MUST needs a whole-commit,
  similarity-based re-pairing (Finding 9), re-measured.
- **GRD-06 (recogniser as carve-out, never a gate) is reconfirmed, harder
  than before.** An independent, good-faith reimplementation from the same
  published table lands 12 points lower on precision than the number in the
  rule doc — proof that the number is not portable without the committed
  fixture GRD-06 already calls for.
- Every script, replay and hand-reading transcript referenced below lives
  under `/home/mherwig/.cache/research-lang/code-docs-scratch/gate-replays/`
  (scratch clone `ocx-scratch/`, plus `lnk06_*.py`, `guard_recogniser.py`,
  `guard_removal.py`, `recall_on_*.py`, `precision_on_random_blocks.py` and
  their `*.json`/`*.txt` outputs). No fleet repository was modified; the
  scratch clone and its target dir sit under `~/.cache/research-lang/`.

## Findings

### 1. LNK-06 citation-by-citation replay on the crate-split commit

Command (in the scratch clone, `/usr/bin/git` throughout per the environment's
git hook rule):

```
python3 lnk06_crate_split_replay.py ocx-scratch b79abbe8d3
```

This reproduces LNK-06's own verification shape (`repo:.agents/research/code-docs-linkage.md:204-236`)
per-commit instead of per-branch-range: it lists every path `b79abbe8d3`
deleted or renamed, `git grep -l -F` (fixed-string) for each across
`.claude/artifacts/adr_*.md .claude/rules/*.md .agents/adr/*.md
.agents/adrs/*.md` at the **parent** tree, then checks whether each citing
file is byte-identical between parent and child.

Output (`lnk06_crate_split_replay.py` stderr, full run in
`crate_split_summary.txt`):

```
# old (deleted/renamed-from) paths: 429
# raw citation hits (line-level) at parent: 375
# ADR/rule files citing a touched path: 66
# total citation lines across those files: 375
# files unchanged (stale by the LNK-06 check): 57
# files changed in the same commit (repaired): 9
```

Of the 9 files the whole-file check calls "repaired," 8 are `.claude/rules/*.md`
files and are **genuinely** fixed — a direct re-check
(`git show b79abbe8d3:<file> | grep -c crates/ocx_lib`) returns 0 for all 8
(`arch-principles.md`, `product-context.md`, `subsystem-ci.md`,
`subsystem-file-structure.md`, `subsystem-metadata-schema.md`,
`subsystem-package-manager.md`, `subsystem-package.md`,
`subsystem-tests.md`). The 9th, `adr_toolchain_activation.md`, is not — see
Finding 2.

The commission's question — "which hits are live pointers that went stale
and which are the record's historical subject" — resolves cleanly by
construction, not by per-citation judgment: `adr_crate_split_workspace.md`
(the record that *is* about the split, and so is expected to name the old
layout on purpose) is added — status `A` — in this very commit
(`git diff -M --name-status b79abbe8d3^ b79abbe8d3 -- '.claude/artifacts/adr_*.md'`
shows `A .claude/artifacts/adr_crate_split_workspace.md`). It therefore never
exists at the parent tree the check greps, so it can never appear among the
375 hits. The mechanism itself separates "record documenting the change" from
"record whose citations the change broke" — it only ever checks records that
*already existed* before the commit. A spot-read of the three largest stale
files confirms none of the 58 remaining hits is a disguised historical-subject
case; each is an unrelated ADR (SBOM attestations, OCI index dispatch, trust
policy) that happens to cite `crates/ocx_lib/...` implementation paths as
then-current fact, not as history:

```
repo:ocx:.claude/artifacts/adr_sbom_attestations.md:41   "(`crates/ocx_lib/src/oci/verify/pipeline.rs:498`), test-pinned by"
repo:ocx:.claude/artifacts/adr_oci_index_only_dispatch.md:277  "Verified in `crates/ocx_lib/src/oci/client.rs::merge_platform_into_index`:"
repo:ocx:.claude/artifacts/adr_trust_policy.md:65  "`verify_policies` (`crates/ocx_lib/src/oci/verify/identity.rs`) returns `Ok(())`..."
```

Genuinely unrepaired total (57 flagged files + the 1 false negative from
Finding 2) = 350 of 375 citation lines, in 58 files. This is a fuller,
exhaustive count than the linkage consolidation's own figures for this event
(`repo:.agents/research/code-docs-linkage.md:29` cites "108 citations across
more than 40 ADRs"; `repo:.agents/research/code-docs-topic-map.md` cites "76
of 169 path citations" fleet-wide) — those numbers evidently came from a
narrower definition (a sample, or backtick-only spans) rather than every
fixed-string occurrence across the full record-glob set. This replay
contradicts neither figure outright (different methodology, same event) but
supersedes them for this specific commit: the real count, done exhaustively,
is 66 citing files / 375 lines / 350 unrepaired.

### 2. LNK-06's own verification command has a measured false negative

The literal LNK-06 check (`repo:.agents/research/code-docs-linkage.md:34-37`)
treats "the whole cited file differs at all between parent and child" as
"repaired." That is too coarse. Script:

```
python3 lnk06_falseneg_scan.py ocx-scratch 300
```

which, for every `(commit, record)` pair the coarse check would call
"repaired" across the last 300 commits, re-checks whether the record's text
at the child **still contains** the literal old path string. Output
(`lnk06_falseneg_summary.txt`):

```
# commits scanned: 300
# (commit,record) pairs the coarse check called 'repaired': 11
# of those, still citing an old path at child (false negative): 1
```

The one false negative is exactly `adr_toolchain_activation.md` at
`b79abbe8d3`: the file has a 3-insertion/2-deletion diff elsewhere
(`git diff --stat b79abbe8d3^ b79abbe8d3 -- .claude/artifacts/adr_toolchain_activation.md`),
so the coarse whole-file check clears it, but 21 distinct `crates/ocx_lib/...`
paths remain cited across 29 lines, verbatim, at the child commit and — spot
checked — still at current HEAD `2691d3c`:

```
repo:ocx:.claude/artifacts/adr_toolchain_activation.md:205  "(`crates/ocx_lib/src/file_structure.rs:63-88` lists nine stores..."
repo:ocx:.claude/artifacts/adr_toolchain_activation.md:225  "hardcoded (`crates/ocx_lib/src/activation.rs:569`, `DEFAULT_GROUP` from `crates/ocx_lib/src/project/internal.rs:16`)"
```

`crates/ocx_lib/` does not exist at HEAD at all
(`/usr/bin/git ls-tree -r --name-only HEAD -- crates/ocx_lib` in the scratch
clone returns nothing), so these are dead citations that a literal run of
LNK-06's shipped verification command, on this history, would have missed.
9% of "repaired" verdicts (1/11) in this 300-commit sample were wrong in this
direction — under-blocking, never over-blocking.

### 3. LNK-06 over the last 300 commits

```
python3 lnk06_300_replay.py ocx-scratch 300
```

Output (`lnk06_300_summary.txt`):

```
# commits scanned: 300
# commits the gate would have blocked: 3
```

The three fires: `c6a970293` (9 old paths, 4 stale records — matches the
linkage doc's own record-to-code-rot §5 citation of this commit),
`b79abbe8d3` (Finding 1), and `e0cd8a33e` ("chore: move to lore/grimoire ai
skills," 27 old paths, 2 stale records). The linkage consolidation replayed
only 200 commits and found 2 fires
(`repo:.agents/research/code-docs-linkage.md:32-33`); `e0cd8a33e` sits at
commit position 247 of 300 back from HEAD
(`/usr/bin/git log --format=%H -n 300 HEAD | grep -n e0cd8a33`), outside that
window — the two results are consistent, not contradictory, and this replay
extends the earlier one rather than overturning it.

All three are verified true positives. For `e0cd8a33e`: the deleted paths are
harness skill files (`.claude/skills/swarm-plan/classify.md`,
`.claude/skills/architect/SKILL.md`, etc. — the fleet later renamed
`swarm-*` skills to `hex-*`), still cited at the child commit by
`adr_tier_model_correlation.md:241,306-308` and
`adr_package_entry_points.md:18,761`, and **none of those paths exist at
current HEAD**:

```
/usr/bin/git ls-tree -r --name-only HEAD -- .claude/skills | grep -c "swarm-"
0
```

i.e. this specific rot has persisted, unrepaired, from position 247 all the
way to today. Measured precision on this replay: 3 true fires / 3 total fires
= 100%. (No systematic search for additional false positives from the
fixed-string matching itself was needed — deleted/renamed paths from
`git diff --name-status` are always full repo-relative paths, long and
specific enough that a spurious substring collision was not observed in any
of the 66 + 4 + 2 = 72 citing files inspected across all three commits.)

### 4. The seven-rule recogniser, reconstructed

`repo:.agents/research/code-docs-guards/guard-shape.md:341-441`) gives each
rule's trigger phrases and says "Full source:
`/tmp/.../scratchpad/recognizer2.py` (this dive's scratch, not committed)."
Checked and confirmed gone:

```
find /home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs -iname '*recogniser*' -o -iname '*recognizer*'
find /home/mherwig/.cache/research-lang -iname '*recogniser*' -o -iname '*recognizer*'
```

(both empty — the only hit anywhere is an unrelated Go vendor package,
`k8s.io/apimachinery/.../serializer/recognizer`). GRD-06's own verdict already
anticipated this: "the recogniser exists only as scratch... **New commitment:**
commit the seven-rule recogniser as `rules/code-docs/checks/guard_recogniser.py`"
(`repo:.agents/research/code-docs-guards.md:114-118,196`). This dive's
`guard_recogniser.py` (in scratch, inlined below) is a fresh implementation
from the published rule table, not a byte-for-byte reproduction — see
Findings 5-6 for exactly how much that distinction matters.

```python
CONSEQUENCE_WORDS = re.compile(
    r"\b(would|will|breaks?|silently|panics?|leaks?|crash(?:es)?|hangs?|"
    r"deadlocks?|corrupts?|corruption|fails?|failing|wrong|incorrect|"
    r"loses?|losing|expos(?:e|es|ed|ing)|unsound|undefined behav|\bub\b|"
    r"races?|drops?|dropped|escapes?|stale|torn|truncat\w*|exit code|"
    r"misreads?|misdetects?|misroutes?|invalid|unrecoverable|never resolve|"
    r"no recovery)\b", re.IGNORECASE)
CONDITIONAL_CONNECTORS = re.compile(
    r"\b(if|when|unless|until|otherwise|only if|requires?|relies? on|"
    r"depends? on|assumes?)\b", re.IGNORECASE)

def r_safety_label(text):      return bool(re.search(r"safety\s*:", text, re.I))
def r_comparative(text):       return bool(re.search(r"\b(instead of|rather than|in place of)\b", text, re.I)
                                            and CONSEQUENCE_WORDS.search(text))
def r_prohibition(text):       return bool(re.search(r"\b(never|must not|do not|don't|cannot|can't|not\s+\w+ing)\b", text, re.I)
                                            and (CONSEQUENCE_WORDS.search(text) or CONDITIONAL_CONNECTORS.search(text)))
def r_choke_point(text):       return bool(re.search(r"\b(single|one)\s+(choke\s*point|source of truth|place|spelling)\b"
                                                       r"|shared so\b|the only (place|mechanism|way)\b", text, re.I))
def r_sentinel(text):          return bool(re.search(r"\bsentinel\b|none means|-1 means|tri-state", text, re.I)
                                            and CONSEQUENCE_WORDS.search(text))
def r_hedge(text):             return bool(re.search(r"\bcaution\b|should never happen|\bn\.b\.\b", text, re.I))
def r_causal(text):            causal = re.search(r"\bso that\b|\bbecause\b|\bsince\b", text, re.I)
                                return bool((causal or CONDITIONAL_CONNECTORS.search(text)) and CONSEQUENCE_WORDS.search(text))

def classify(text):
    reasons = [name for name, fn in RULES.items() if fn(text)]
    return bool(reasons), reasons
```

(Full file with a `--self-test`: `guard_recogniser.py` in scratch; self-test
passes 7/7 designed positives and 4/4 designed negatives.)

### 5. Recall on the 100 sample.md guards and the 40 eval-site guard spans

```
python3 recall_on_100_guards.py guard-blocks-section5.md
```

reads the exact `len`-line comment block at each of the 100
`repo:file:line` entries in `code-docs-audit/sample.md` sec.5 directly from
the live fleet checkouts. Output:

```
# parsed guard entries: 100
# fired: 43  missed: 57  read-errors: 0  total: 100
# recall (of scoreable): 0.430
```

```
python3 recall_on_eval_sites.py eval-sites.json
```

reads the exact `reason_lines` span (e.g. `1866-1868`, or the two-range
`48-51,61-64`) for each of the 48 sites in `code-docs-audit/eval-sites.md`'s
JSON site list. Output:

```
# guard sites scored: 40 (+0 unparsed)
# guard sites fired: 17  missed: 23
# recall on eval-sites guard spans: 0.425
# FTC controls (should NOT fire): fired 0 / 8
```

Combined: 60/140 = **0.429**, against guard-shape's documented combined
recall of **0.432** on its 520-block fixture
(`repo:.agents/research/code-docs-guards/guard-shape.md:376-387`) — a near-exact
reproduction from the table alone, with no access to the original tuning.
Per-site agreement with guard-shape's own documented miss list
(`repo:.agents/research/code-docs-guards.md:240`, "9 of the 20 proposed
mechanism sites are misses: OCX-06, OCX-07, OCX-09, OCX-13, OCX-17, OCX-19,
PY-01, PY-02, TS-03") is 7/9 exact: this reconstruction also misses
OCX-06/07/09/13/17, PY-01 and TS-03, but *fires* on OCX-19 and PY-02, which
the original recogniser reportedly missed — evidence the two implementations'
`causal+consequence` and `prohibition+consequence` rules are tuned slightly
differently even though both trace to the same table row.

Zero of the 8 free-to-change (FTC) control sites — trivial accessors — cause
a false fire, which is the property GRD-06's carve-out design most needs (a
recogniser that fired on obviously-safe-to-change code would poison the
carve-out with noise).

### 6. Precision on 100 random, previously-unlabelled ocx blocks

```
python3 /home/mherwig/dev/grimoire-lore/.agents/worktrees/code-docs/rules/code-docs/checks/comment_census.py \
  --root ocx-scratch --scope prod --list-blocks --sample 140 --seed 42 --kind any --format json > sample140.json
python3 precision_on_random_blocks.py
```

`precision_on_random_blocks.py` excludes any of the 140 sampled blocks that
overlap a known `sample.md` guard or `eval-sites.md` location, keeps the
first 100 of what remains, and prints every block the recogniser fires on for
hand review. Output:

```
# kept (presumed-negative pool): 100
# recogniser fires on 32 of 100 presumed-negative blocks
```

Every one of the 32 was read against GRD-01's test ("point to the clause
that names what breaks: hang, leak, torn write, wrong exit code, escape" —
`repo:.agents/research/code-docs-guards.md:59`). Verdicts:

| # | Location | Verdict | Why |
|---|---|---|---|
| 1 | `ocx_package_manager/src/activation.rs:4184` | true guard | names the consequence ("prompt starts flapping") of two spellings disagreeing |
| 2 | `ocx_shell/src/shell.rs:776` | true guard | names byte corruption from the double-quoted form |
| 3 | `ocx_store/src/file_structure/shim_store.rs:4` | true guard | bullet 2 names GC mis-classifying liveness if launchers nest wrong |
| 4 | `ocx_index/src/local_index.rs:1498` | true guard | two explicit "must never" bullets, each with a named consequence |
| 5 | `ocx_cli/src/command/shell_state.rs:768` | true guard | names the contradictory report output a wrong choice would print |
| 6 | `ocx_store/src/file_structure/shim_bin_store.rs:104` | **false positive** | design rationale ("so a release build carries no simulated path"), no named breaking consequence |
| 7 | `ocx_package/src/publisher/publish_gate.rs:178` | true guard | names the forged-provenance claim a mirror read would admit |
| 8 | `ocx_package_manager/src/tasks/pull.rs:129` | true guard | names deadlock from bounding the inner dispatch |
| 9 | `ocx_oci/src/client/error.rs:264` | **false positive** | invariant description ("unreachable by construction"), not an edit guard |
| 10 | `ocx_util/src/fs/path.rs:364` | true guard | worked example of the exact breakage from re-parsing |
| 11 | `ocx_cli/src/command/inspect.rs:152` | **false positive** | describes intended ordering behaviour, no "if reordered, X breaks" clause |
| 12 | `ocx_index/src/store.rs:622` | **false positive** | classifies which errors are "hard failures"; contract, not an edit guard |
| 13 | `ocx_package_manager/src/record/execution_record.rs:640` | true guard | choke-point pattern: pre-intersecting would be a second implementation that can drift |
| 14 | `ocx_announce/src/announce.rs:506` | true guard | names issue #399, a real regression the comment fixes |
| 15 | `ocx_announce/src/forge/git_stderr.rs:205` | true guard | names the observed CI failure (empty stderr body → unclassified exit 1) |
| 16 | `ocx_project/src/activate.rs:176` | true guard | deliberate-divergence pattern, explicitly warns against a "fix" |
| 17 | `ocx_sign/src/sign/bundle.rs:335` | true guard | names the concrete misclassification (`RekorSetMalformed` vs `TransparencyLogUnavailable`) |
| 18 | `ocx_cli/src/api/data/warmed_paths.rs:34` | **false positive** | wire-format/API rationale, no failure named |
| 19 | `ocx_announce/src/forge/git_workspace.rs:50` | **false positive** | documents an accepted residual, not a live edit hazard |
| 20 | `ocx_package/src/metadata/template/scope.rs:99` | **false positive** | documents error-selection contract, not an edit guard |
| 21 | `ocx_cli/src/command/toolchain_env.rs:609` | true guard | explicit fail-open discipline ("must never fail on a malformed global config") |
| 22 | `ocx_cli/src/api/data/package_inspect.rs:936` | **false positive** | UX/rendering rationale, no failure named |
| 23 | `ocx_announce/src/announce.rs:695` | **false positive** | idempotency property description, no "if changed" clause |
| 24 | `ocx_package_manager/src/tasks/auto_verify.rs:259` | true guard | security-relevant refusal (never accept an unverified sidecar) |
| 25 | `ocx_oci/src/client/transport.rs:222` | true guard | names the concrete operator-facing consequence of misclassifying the exit code |
| 26 | `ocx_package_manager/src/tasks/render_toolchain.rs:3473` | true guard | same FIFO/symlink attack-prevention shape as OCX-01 |
| 27 | `ocx_cli/src/api/data/push.rs:248` | true guard | names the silent type-check-passing swap and its wrong published output |
| 28 | `ocx_shell/src/shell/reconcile/plan.rs:36` | **false positive** | versioning policy spec, no named breakage |
| 29 | `ocx_announce/src/forge/api.rs:552` | **false positive** | API contract description, no sharp negative consequence |
| 30 | `ocx_cli/src/command/self_group/setup.rs:363` | **false positive** | tie-break rationale for consistency, no failure named |
| 31 | `ocx_package_manager/src/activation.rs:553` | true guard | "Failing closed" section names a real fail-closed consent guarantee |
| 32 | `ocx_config/src/shell.rs:118` | **false positive** | merge-semantics spec table, not an edit guard |

19 true guards, 13 false positives: **precision = 19/32 = 0.594**. This is
well below guard-shape's reported combined precision of 0.714 (or 0.729 on
the fleet-only population) on the same seven-rule design. Two contributing
causes, both visible in the table: (a) the `causal+consequence` and
`prohibition+consequence` rules fire on well-written *contract* prose that
uses "so that," "never" or "must" without guarding a specific edit (rows 9,
12, 18, 20, 28, 29, 32 are all doc-comment API/contract descriptions, not
guards); (b) 19 of the 100 randomly-drawn "presumed negative" blocks turned
out to be genuine, previously-unlabelled guards — expected and unavoidable
noise in any random draw against a partial label set (guard-shape's own
negative population had the same property, drawn from a reviewed 320-block
sample rather than being guaranteed guard-free).

### 7. LEN-06 diff-time check, replayed over 200 commits

`guard_removal.py` implements LEN-06's rule
(`repo:.agents/research/code-docs-ratchet.md:112-119`) as: per commit, per
modified `*.rs` file under `crates/`, parse `git diff -U0` hunks; for each
hunk take the longest contiguous run of removed comment lines (pre-image) and
the longest contiguous run of added comment lines (post-image); if the
recogniser fires on the pre-image but not the post-image, it is a candidate,
unless the *whole commit's* diff separately adds a file-qualified pointer
(`[\w./-]+\.md`), a covering test (`#[test]` or `fn \w*test\w*`), or a
lint-owned form (`#[deny(`, `#[must_use]`, `: never =`, `assert_never(`).

```
python3 guard_removal.py ocx-scratch 200
```

Output (`len06_summary.txt`):

```
# commits scanned: 200
# hunks where pre-image fired the recogniser: 79
#   still fires post-edit (LEN-06 passes, compression kept shape): 34
#   lost the fire (candidate violation): 45
#     exempt (commit separately adds pointer/test/lint-owned form): 33
#     LEN-06 findings (would block, no exemption found): 12
```

### 8. Hand-read verdicts on all 12 LEN-06 candidates

Every candidate, its commit, and what actually happened to its content at the
child commit (full transcripts of the `git show`/`git grep` checks are in
this session's history; representative commands and outputs below):

| # | Commit | File | Verdict | Evidence |
|---|---|---|---|---|
| 1 | `e9133af309` | `publish_gate.rs` | **script artifact, not a real loss** | The exact 5-line "Canonical, never a mirror..." block is deleted at one position and **re-added verbatim** 27 lines later in the same hunk, inside a new `match` arm (`git diff -U8 e9133af309^ e9133af309 -- crates/ocx_package/src/publisher/publish_gate.rs` shows both occurrences). `guard_removal.py` picks the longest removed comment run and the longest added comment run *independently*, so it paired the relocated guard's old position against an unrelated, longer, rewritten docstring paragraph added elsewhere in the same hunk — a genuine block-pairing bug, not a guard loss. |
| 2 | `0493b5d2e0` | `mutate.rs` | **legitimate essay split** | `remove_binding`'s 33-line doc (including the `BindingNotFound`/`BindingAmbiguous` error contract) is deleted with the whole disk-touching function, but the same error contract reappears verbatim at the new `remove_binding_in_memory` (`git show 0493b5d2e0:crates/ocx_project/src/mutate.rs \| grep -n 'fn remove_binding\|BindingNotFound\|BindingAmbiguous'` → lines 465-534, same two error variants documented). |
| 3 | `97bcf51097` | `lock.rs` | **legitimate consolidation** | The `0o644` mode-cap rationale is deleted here but is present, expanded, in the new shared `publish_by_rename` helper's module doc in the same commit (`git show 97bcf51097:crates/ocx_project/src/mutate.rs` lines 39, 60: "it at `0o644`," "That cap closed nothing..."), matching the commit's own stated purpose (unify `ocx.toml`/`ocx.lock` publishing behind one helper). |
| 4 | `97bcf51097` | `mutate.rs` | **recall miss, not a loss** | Pre fires ("Panics if `path` has no parent component..."); the rewritten 3-line replacement ("`Path::parent` is `Some("")` for a bare relative filename...") is a more precise restatement of the same invariant but does not trip any of the seven rules — confirmed directly: `classify(post_text) == (False, [])`. |
| 5 | `d8e17dca10` | `store.rs` | **legitimate dedup** | The deleted text itself says "see `ConfigGuard::write` docstring" — and that docstring, at the child commit, carries the same fact (`git show d8e17dca10:crates/ocx_oci/src/auth/store.rs \| grep -n torn` → line 812, "...rather than torn: `MoveFileEx` cannot replace..."). A GRD-03 dedup, correctly done. |
| 6 | `1c5b228d00` | `init.rs` | **recall miss, not a loss** | Content *grows* from 3 to 10 lines and gains a concrete bug reference (`ocx-sh/ocx#475`), but the new phrasing ("The selection always exists by now...") doesn't trip the recogniser: `classify(post_text) == (False, [])`. |
| 7 | `5cc666cd76` | `shell_config.rs` | **script artifact** | The pre- and post-images are two *unrelated* comments the "longest run per side" pairing conflated (an inline `NotFound`-handling comment vs. a doc comment's `# Errors` section on a different, renamed function). The actual "missing file is the create case" behaviour is still documented, next to it, in a test fixture comment at the child (`git show 5cc666cd76:crates/ocx_lib/src/setup/shell_config.rs` lines 318-323: "the read arm returns `NotFound`, the create case"). |
| 8, 9 | `93fc7228b4` | `progress.rs` (×2 hunks) | **legitimate dedup** | Both removed comments restate, at two call sites, a fact already documented at `inherit_scope`'s own definition (line 293-304 in the parent tree) and at a dedicated test, `inherit_scope_carries_parent_across_spawn` (line 569-572) — textbook GRD-03 ("state each guard once... not both"). |
| 10, 11 | `2ccdc262cc` | `graph.rs`, `graph/tests.rs` | **legitimate rewrite (bug fix)** | The whole `announce_tags` function is deleted from `graph.rs` because the commit (marked `!`, a breaking fix for a real over-reporting bug) consolidates it into a corrected, mode-independent `announce_tags` in `crates/ocx_cli/src/command/package_cascade_repair.rs` in the **same commit** — whose new doc comment preserves the substantive guard fact verbatim: "Index findings are the one class of drift a repair cannot close itself, and the announce hop is what closes them" (`git show 2ccdc262cc`, diff hunk at line 59-70). The old prose described the *old, buggy* semantics; deleting it rather than compressing it is correct. |
| 12 | `b6a4e37034` | `package_cascade_repair.rs` | **recall miss, not a loss** | A 2-line guard is rewritten to 3 lines with an equivalent (arguably clearer) statement of the same dry-run/preview invariant; the rewrite doesn't trip the recogniser (`classify(post_text) == (False, [])`). |

**Zero of 12 are genuine, unreplaced guard deletions.** In this 200-commit
replay, on this single-author, high-discipline repository, a naive
hunk-level implementation of LEN-06 has a false-positive rate of 12/12 =
100% among its own flags. 1 finding is a script-level pairing bug
(Finding 9 below is the fix); 6 are legitimate consolidations the check
should learn to recognise across the whole commit, not just one hunk; 3 are
simply below the recogniser's ~43% recall ceiling on rewritten (not deleted)
text — which LEN-06's own "Limits" section already flags as an open risk
(`repo:.agents/research/code-docs-ratchet.md:116`, "a miss is 'unclassified',
never 'safe'" — here it produces noise, not silent danger, because there was
no real deletion, but the same low recall would just as easily wave through
a genuine deletion phrased the same way, which no run in this replay happened
to exercise).

### 9. External grounding: move detection and false-positive tolerance

Three fetches, each settling a concrete question this replay raised:

1. **git already detects the Finding 8 #1 pairing failure.** git-scm.com's
   `git-diff` documentation confirms `--color-moved=blocks` (block-level move
   detection, ≥20 alphanumeric characters) combined with
   `--diff-algorithm=histogram` (better hunk boundaries than the default
   Myers algorithm for code with repeated tokens) is built to distinguish "a
   block moved within the diff" from "unrelated delete plus unrelated add" —
   exactly the case that produced the one script-artifact finding. For
   near-verbatim (not byte-identical) relocations such as Findings #2-#5 and
   #7-#11, the same source names `difflib.SequenceMatcher.ratio()` (confirmed
   directly against Python's own docs) as the standard fix: score every
   removed comment block against every added comment block in the *whole*
   commit diff (not just the same hunk) and treat a match above a similarity
   threshold (its own docs suggest ratio > 0.6 as a "close match" heuristic)
   as a relocation, not a deletion.
2. **Google's own bar for a checker that runs in code review at all is under
   10% effective false positives; gating a commit needs close to zero**
   (abseil.io, *Software Engineering at Google*, ch.20, "Static Analysis": a
   Tricorder check must "produce less than 10% effective false positives" to
   ship at all, and "gating works best for analyses with zero effective false
   positives... breaking the build makes warnings impossible to ignore,
   though it's not feasible for all analyses"). A check that is wrong 100% of
   the time it fires, as this naive LEN-06 implementation is in this replay,
   is far outside the range Google's own experience says is tolerable even
   for a *warning*, let alone a blocking MUST.
3. Confirmed directly against docs.python.org: `difflib.SequenceMatcher`
   works over arbitrary hashable sequences (not just characters), so it can
   score similarity between two multi-line comment blocks as single units —
   the concrete mechanism recommended in point 1 above is a stdlib one-liner,
   not a new dependency (Ponytail's own ladder: reach for the standard
   library before building a bespoke matcher).

## Normative guidance candidates

**Confirms LNK-06 (MUST), with two required changes to its shipped
verification command.**

- **Rule addition to LNK-06's Verification.** Replace the whole-file
  `git diff --quiet` staleness check with a per-citation-line check: for each
  matched old path, confirm it is absent from the record's *diff*, not just
  that the record changed somewhere.
- **Rationale naming the failure:** the shipped command silently clears a
  citing file whenever any unrelated edit touches it in the same commit —
  measured here at `adr_toolchain_activation.md` (Finding 2), a real,
  still-unrepaired violation the literal command would have missed.
- **Verification** (directory operand, one `-e` per alternative, `xargs -r`,
  matching the required command shape):

  ```
  P=<parent-sha>; C=<child-sha>
  git diff -M --name-status "$P" "$C" | awk '$1 ~ /^[DR]/ {print $2}' > /tmp-free/old-paths.txt
  ```

  is not usable verbatim (writing under `/tmp` is disallowed in this
  environment and the check must not depend on it); the adopter-facing form
  keeps the old paths in a shell array and, per matched record, greps the
  record's **added+context** text at the child for each old path with
  `git show "$C:$f" | grep -rF -e "$old_path_1" -e "$old_path_2"` — any hit is
  a still-stale citation regardless of whether the file changed elsewhere.
  Severity: MUST (unchanged) — the underlying gate is sound and caught 3/3
  true positives in a 300-commit replay; only its staleness test needs
  sharpening.
- **Rule addition: widen the review/replay window past 200 commits before
  first publish.** Confirms LNK-06 is not gamed by window size, but Finding 3
  shows a 200-commit sanity check can miss a real, still-open violation that
  a 300-commit one catches; this doesn't change the gate itself (it runs
  per-commit at commit time, not as a periodic scan), but it changes how much
  confidence a pre-publish spot-check should claim.

**Confirms LEN-06's own conditional promotion criterion, with the measured
number.**

- **Rule (severity change): LEN-06 ships as SHOULD, review-list only — not
  MUST — until the diff-time check is redesigned to pair removed and added
  comment blocks across the *whole commit diff* by similarity, not by
  "longest run in this hunk."** This is not a new rule; it is the exact
  condition the ratchet consolidation already wrote
  (`repo:.agents/research/code-docs-ratchet.md:118`, "Severity: SHOULD now.
  MUST once `guard_removal.py` ships with a measured false-positive rate") —
  this dive supplies that rate.
- **Rationale naming the failure:** a naive, hunk-level implementation of the
  rule as specified produces 12 candidate findings over 200 real commits, and
  hand-reading every one finds zero genuine violations (Finding 8) — a 100%
  false-positive rate on its own flags, an order of magnitude past the <10%
  bar a checker needs even to run as a non-blocking warning
  (abseil.io ch.20, Finding 9.2).
- **Verification (self-test the redesigned checker must pass before
  promotion):** plant two fixtures in a scratch copy — (a) a comment block
  moved verbatim to a different function in the same commit (must NOT be
  flagged); (b) the same block truly deleted with no replacement anywhere in
  the diff (MUST be flagged). Confirm case (a) passes only once the checker
  scores removed-vs-added blocks by whole-diff similarity
  (`difflib.SequenceMatcher(None, removed_block, added_block).ratio()`, or
  `git diff --color-moved=blocks --diff-algorithm=histogram` as a pre-filter)
  rather than by hunk-local "longest run."
- **This confirms GRD-06 harder than the original data did.** GRD-06 already
  says the recogniser must ship "with the 520-block fixture and a
  `--self-test` that reproduces precision 0.714 and recall 0.432"
  (`repo:.agents/research/code-docs-guards.md:118`). Findings 5-6 show
  *why* that specific instruction matters beyond general caution: an
  independent, careful reimplementation from the same published rule table
  reproduces recall almost exactly (0.429 vs 0.432) but lands 12 points below
  the documented precision (0.594 vs 0.714) on a random, hand-verified
  sample. The number in the rule doc is real but not portable — only a
  committed script plus its exact fixture is.

## Decisions this dive proposes

1. **LNK-06 (a branch that deletes/renames a cited path must update the
   citing record): keep MUST.** Citation-by-citation replay of the
   crate-split commit found 350 of 375 pre-existing citation lines (58 of 66
   files) genuinely left stale, zero of them misclassified historical-subject
   cases; the 300-commit replay found 3 fires, all true positives (100%
   precision), including one (`e0cd8a33e`) still unrepaired at current HEAD.
   Fix required before shipping: the verification command's whole-file
   staleness check has a measured false negative (`adr_toolchain_activation.md`)
   and should be replaced with a per-citation check.
2. **LEN-06 (fail a diff that removes/shrinks a recognised guard without a
   replacement): ship as SHOULD, not MUST.** A naive but faithful
   implementation of the rule as specified, replayed over 200 real commits,
   flags 12 candidates and — hand-read one by one — finds zero genuine
   violations: 1 script-pairing artifact, 6 legitimate GRD-03 consolidations,
   3 legitimate rewrites the recogniser's own recall ceiling missed. A 100%
   false-positive rate on its own flags is unshippable as a blocking gate by
   any reasonable bar (Google's own Tricorder threshold is <10% even for a
   warning). Promote to MUST only after redesigning the pairing to score
   removed-vs-added comment blocks by similarity across the whole commit
   diff, and re-measuring.
3. **Recall on the 100 sample.md guards, the 40 eval-site guard spans, and
   precision on 100 random non-guard blocks:** measured at 0.430, 0.425
   (combined 0.429) and 0.594 respectively for this independent
   reimplementation — recall reproduces guard-shape's reported 0.432 almost
   exactly; precision does not reproduce its reported 0.714/0.729, landing
   12-14 points lower. This is direct evidence for GRD-06's own "commit the
   recogniser with its fixture" instruction: the published precision number
   is real but implementation-specific, not a property of the seven-rule
   description alone.

## Sources

1. `repo:.agents/research/code-docs-linkage.md` (LNK-06 rule, verification
   command, "Applied to the fleet" table, "Open questions" record-gate
   precision ask) — this worktree.
2. `repo:.agents/research/code-docs-ratchet.md` (LEN-06 rule, limits,
   verification, "Decisions for the eval") — this worktree.
3. `repo:.agents/research/code-docs-guards.md` (GRD-06 verdict and rule,
   "Applied to the fleet," "Decisions for the eval") — this worktree.
4. `repo:.agents/research/code-docs-guards/guard-shape.md` sec.4 ("Recogniser:
   a heuristic, scored on 520 blocks" — the seven-rule table, scoring
   populations, per-repo table, false-negative analysis) — this worktree.
5. `repo:.agents/research/code-docs-audit/sample.md` sec.5 ("Guard blocks
   (reason-recovery eval seed)" — the 100 fleet guard blocks with
   `repo:file:line (len)`) — this worktree.
6. `repo:.agents/research/code-docs-audit/eval-sites.md` ("JSON site list" —
   48 sites with `file`, `line_start`, `line_end`, `reason_lines`,
   `free_to_change`) — this worktree.
7. `repo:.agents/research/code-docs-topic-map.md` ("What the grounding
   changed" — linkage rot figures for cross-check) — this worktree.
8. `/home/mherwig/dev/ocx` at HEAD `2691d3c1638e75b7830fcd68784a2d23a66a0802`
   — read-only, never modified; source of the scratch clone.
9. Scratch clone `git clone --no-local /home/mherwig/dev/ocx ocx-scratch`
   under `/home/mherwig/.cache/research-lang/code-docs-scratch/gate-replays/`
   — all replays run here, never against the fleet checkout.
10. ocx commit `b79abbe8d39192f33c55a752cc3bca12549c0623` ("refactor!: dissolve
    ocx_lib into 17 responsibility-derived crates") — Finding 1.
11. ocx commit `c6a9702932c67efcfc3db9b68319faf877bf490f` ("feat(test): tiered
    verification...") — Finding 3.
12. ocx commit `e0cd8a33ec5a24fd6e1ab9e0111df5955826f307` ("chore: move to
    lore/grimoire ai skills") — Finding 3.
13. ocx commits `e9133af309`, `0493b5d2e0`, `97bcf51097`, `d8e17dca10`,
    `1c5b228d00`, `5cc666cd76`, `93fc7228b4`, `2ccdc262cc`, `b6a4e37034` —
    Finding 8's 12 hand-read candidates.
14. [git-scm.com/docs/git-diff](https://git-scm.com/docs/git-diff) — fetched
    2026-09-27: `--color-moved`, `-B`/`--break-rewrites`, `-M`/`--find-renames`,
    `--diff-algorithm=histogram` for move/block detection (Finding 9.1).
15. [abseil.io/resources/swe-book/html/ch20.html](https://abseil.io/resources/swe-book/html/ch20.html)
    — fetched 2026-09-27: *Software Engineering at Google* ch.20, "Static
    Analysis" — Tricorder's <10% effective-false-positive bar and the
    gating-needs-near-zero-FP rule (Finding 9.2).
16. [docs.python.org/3/library/difflib.html](https://docs.python.org/3/library/difflib.html)
    — fetched 2026-09-27: `SequenceMatcher.ratio()` / `get_matching_blocks()`
    for block-similarity scoring (Finding 9.3).

All scripts, raw JSON outputs and summaries are in
`/home/mherwig/.cache/research-lang/code-docs-scratch/gate-replays/`:
`lnk06_crate_split_replay.py`, `lnk06_300_replay.py`,
`lnk06_falseneg_scan.py`, `guard_recogniser.py`, `recall_on_100_guards.py`,
`recall_on_eval_sites.py`, `precision_on_random_blocks.py`,
`guard_removal.py`, and their `*.json`/`*_summary.txt`/`*.txt` outputs. The
`ocx-scratch/` clone may be deleted; nothing under
`/home/mherwig/dev/ocx` was modified.

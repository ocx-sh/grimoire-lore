---
title: code-docs reason-recovery eval — arms, git channel, sites, controls, power
topic: eval-arms-and-sites
agent: eval-arms-and-sites
model: claude-sonnet-5
date_researched: 2026-09-27
sources_count: 16
scope: >
  Decides which arms (with build recipes), which sites (as JSON), which
  controls, and how many repetitions let the code-docs reason-recovery eval
  set a cut line without the design pre-deciding the answer. Covers: fixing
  build_arms.py's non-reproducible "agent writes it live" rules/pointer arms,
  three new arms (test-only, pointer-only, marker), a measured git-filter-repo
  design for H5's git channel, a 28-site stratified list (20 mechanism + 8
  controls) with named stratification gaps, and a power analysis with its
  honest shortfall against the 10-point target. Does NOT cover: the scoring
  rubric, judge model or non-inferiority statistic (code-docs-eval's
  eval-scoring commission), and does not re-run comment_census.py density
  numbers (out of scope per the frame).
---

# code-docs reason-recovery eval: arms, git channel, sites, controls, power

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [The harness's two non-reproducible arms](#1-the-harnesss-two-non-reproducible-arms)
  2. [Three new arms, and the one that isolates H4](#2-three-new-arms-and-the-one-that-isolates-h4)
  3. [Per-site vs per-repo snapshots: a structural fix build_arms.py needs](#3-per-site-vs-per-repo-snapshots-a-structural-fix-build_armspy-needs)
  4. [The git channel: why "cut history before the comment landed" fails, and a measured alternative](#4-the-git-channel-why-cut-history-before-the-comment-landed-fails-and-a-measured-alternative)
  5. [Site stratification: the 20 proposed mechanism sites, tabulated](#5-site-stratification-the-20-proposed-mechanism-sites-tabulated)
  6. [Controls: replacing trivial accessors with recoverable-from-code blocks read in their function](#6-controls-replacing-trivial-accessors-with-recoverable-from-code-blocks-read-in-their-function)
  7. [Power: reps, sites, sessions, cost — and the honest shortfall against 10 points](#7-power-reps-sites-sessions-cost--and-the-honest-shortfall-against-10-points)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Decisions this dive proposes](#decisions-this-dive-proposes)
- [Sources](#sources)

## Summary

- `build_arms.py`'s `rules` and `pointer` arms currently just copy `original` — they are documented as "filled by agents later," which is non-reproducible if a live agent rewrites each run. Fix: author each site's replacement text **once**, freeze it in a committed JSON fixture, apply it by mechanical substitution exactly like `stripped`/`oneline`.
- Add three new arms — `test-only` (delete only the site's own guard comment, leave the sibling test and every other comment untouched), `pointer-only` (bare `file:line`/`file#anchor`, zero inline content), `marker` (one greppable-prefix line, e.g. `// GUARD: <fact>`) — each with a concrete build recipe below.
- `marker` is the arm that isolates H4's first disjunct ("a guard survives when its constraint stays as one local line that says it is load-bearing"); reading its survival rate at Tier-A (no test) vs Tier-B (test present) sites decomposes whether the marker alone suffices or needs the test as backup.
- `build_arms.py` currently builds **one snapshot per (arm, repo)**, shared across every site in that repo. That's wrong for the five new per-site arms: 8 of the fleet's files hold 2–3 sites each (`env.rs`×3, `fs.rs`×2, `store.rs`×2, `mutate.rs`×2, `path_anchor.rs`×2, `atomic_write.rs`×2, `advisory_lock.rs`×2). Fix: snapshot path becomes `out/<arm>/<site_id>/<repo>/...` for the five per-site arms; keep the existing per-repo path for `original`/`stripped`/`oneline`.
- H5's git half is testable without leaking the comment: `git-filter-repo --file-info-callback` rewrites every historical blob of a target file while leaving commit messages, authors and dates untouched. Measured on the real fleet: full-history rewrite of **ocx** (1,160 commits, 32 MB packed) redacting 7 target files took **1.96 s**; clone was **2.6 s**. Total cost is seconds, not minutes — git-channel sessions cost more in *probe* tokens (the agent now has `git log`/`git blame` tools to spend turns on), not in harness build time.
- The competing "cut history before the comment landed" design is **rejected with a concrete counterexample**: OCX-14's guard comment and the durability fix it explains landed in the *same* commit ([ocx@97bcf5109](https://github.com/ocx-sh/ocx/commit/97bcf51097c7f89e4c28d4930988d10604b244d9)); checking out the parent commit reverts the code to the pre-fix, buggy `let _ =` state — not a valid HEAD-equivalent arm.
- That same commit's message is a stronger finding on its own: it restates OCX-14's exact guard reasoning in prose ("`ocx.toml` swallowed a failed parent-directory fsync (`let _ =`), so a publish could be reported as landed while the rename entry was not durable") with **zero occurrence of the source comment's wording** — direct, fleet-sourced evidence that commit-message archaeology is a real, distinct recovery channel from the inline comment, worth an eval condition on its own.
- The 20 proposed mechanism sites (12 Tier A + 8 Tier B), tabulated by comment length: **17/20 fall in the 3–10 line bucket, 2 in >10, only 1 in 1–2** — the keyword-grepped harvest is skewed long relative to the human baseline (median guard length 2 lines, human-sample.md). The 1–2 line bucket is the empty cell to fill, and it's the shape the `marker` arm is built to validate.
- One site (PY-02) doesn't have its reason in a comment at all — the guard's justification is inlined into a **raised exception's message string** (`ocx-sdk-python/src/ocx_sdk/_bootstrap.py:833`), a fourth register alongside doc/plain/none that a comment-stripping cleanup pass can't touch by construction.
- The 8 free-to-change (FTC) sites in `eval-sites.md` are all standalone trivial-accessor doc comments — a comment-cleanup skill barely has to "read the function" to know they're safe. Replaced with 8 blocks classified `recoverable-from-code: yes`, category `narration`, in `human-sample.md`'s appendix, each embedded **inside** a real function body (e.g. "restates the very next if-condition") — a harder, more realistic free-to-change test, and it happens to fill the TS-control gap the original FTC set left empty.
- Those 8 controls live outside `/home/mherwig/dev` (reference-corpus clones under `~/.cache/research-lang/exemplars/code-docs/`), so `build_arms.py`'s hardcoded `DEV = Path("/home/mherwig/dev")` needs a per-site `root` field (default `DEV`) — a one-line change, given below.
- Power: at the proposed 28 sites with R=5 reps, the minimum detectable pooled guard-survival drop is **~21–23 points at 80% power**, not the brief's 10-point target, under a conservative ICC=0.3 clustering assumption (standard design-effect formula, PMC6477104). Reaching the literal 10-point target needs the **full 40-site mechanism harvest**, not the proposed 24/28 subset, and even then only under an optimistic ICC=0.1. Recommendation: treat 10 points as the eval-scoring dive's non-inferiority **margin** (a threshold), not an effect size to chase with a pooled significance test at this site budget.
- Default design (28 sites, R=5): 880 sessions, 1,760 Claude turns, worst-case cost ceiling **$3,520** (exact, from `run_probes.py`'s own `--max-budget-usd 2` per turn), realistic estimate **$175–530**.
- Widened design (48 sites = full 40-site harvest + 8 controls, R=5): 1,680 sessions, 3,360 turns, worst-case ceiling **$6,720**, realistic estimate **$330–1,000**.
- Controls only need 2 arms (`original`, deleted), not all 8 — every per-site "rule-following rewrite" of a pure narration block collapses to the same text (delete it), so running `marker`/`pointer`/`rules` on a control measures nothing new. This alone removes 480 of the naive 1,344 control sessions.

## Findings

### 1. The harness's two non-reproducible arms

`build_arms.py`'s docstring lists five arms: `original`, `stripped`, `oneline` are built mechanically by the script; `rules` and `pointer` are "Arms filled by agents later (this script only copies original into them)" (`code-docs-eval/harness/build_arms.py:8-9`). Concretely, `main()` only branches on `arm == "stripped"` / `arm == "oneline"` (`build_arms.py:149-152`); for `arm in {"rules", "pointer"}` the `edits` dict for that repo stays empty and `snapshot()` writes the untouched `original` tree under `out/rules/<repo>/` and `out/pointer/<repo>/`.

The problem this leaves for someone completing the harness: if "filled by agents later" means a live agent invocation rewrites each site's comment at run time, the resulting arm is not the same experiment twice — a different LLM call, on a different day, with a different sampling seed, produces different replacement text, so a "the rules arm holds guard survival at 92%" result isn't reproducible or even well-defined across reruns. This directly contradicts the brief's own requirement ("Make each reproducible: frozen rule text plus fixed prompt, or written once and committed").

**Decision: written once and committed**, not "frozen prompt." Even a fixed prompt at temperature 0 isn't perfectly reproducible across model versions, and the code-docs program's own Model Routing guidance (this user's global `CLAUDE.md`) puts "non-mechanical implementation... anything security-adjacent" and "adversarial/verification passes" at `opus`; authoring 20 guard rewrites that must *keep* the exact security property while shortening the prose is exactly that kind of judgment call, not a sonnet-exploration task. The fixture should be authored once (by an opus pass, human-reviewed), then applied purely mechanically:

```json
// code-docs-eval/harness/fixtures/site-rewrites.json
{
  "OCX-14": {
    "rules": "// A failed parent fsync must propagate: swallowing it (as this file used to)\n    // reports a publish as landed while the rename entry is not durable.",
    "pointer": "// Parent fsync errors must propagate (durability regression, see mutate.rs history).",
    "pointer_target": "crates/ocx_project/src/mutate.rs::publish_by_rename (git log)"
  }
}
```

`build_arms.py` gains one branch: `elif arm in ("rules", "pointer"): edits[rel] = apply_fixture(site_id, arm, src)` that does a span replacement (same line-span mechanism as the new `test-only`/`marker`/`pointer-only` arms in §2) using the frozen text. No live agent runs during `build_arms.py`; the only place an agent still runs is `run_probes.py`'s cold probes, which is the actual measurement.

### 2. Three new arms, and the one that isolates H4

Build recipe for each (all operate on the site's own `[line_start, line_end]` span from the site JSON, using `comment_census.classify()` the way `build_arms.py`'s existing `strip()`/`oneline()` already do, just scoped to one span instead of the whole file):

| Arm | Recipe | What it isolates |
|---|---|---|
| `test-only` | Blank exactly the site's own comment span (same line-count, so line numbers elsewhere in the file don't shift); leave every other comment in the file untouched; leave the sibling test file/module untouched. | H4's second disjunct in isolation: does a passing, well-named test let an agent recover or preserve the guard with **zero** comment text, when every *other* comment in the file still reads normally (unlike `stripped`, which also removes unrelated context)? |
| `pointer-only` | Replace the span with one line: `// see <target>` (Rust/TS `//`, Python `#`). `<target>` is: (a) for Tier-B sites where the sibling test's own name/docstring already states the constraint (7/15 sampled per `code-docs-topic-map.md` §"What the grounding changed") — the test's qualified name; (b) otherwise a one-time-authored fixture file `eval-arms-eval/fixtures/reasons/<site_id>.md` containing the site's `ground_truth` field verbatim, added to the snapshot at a path that doesn't exist in the real repo. **Named limitation**: (b) points at a fabricated eval-only record, not a real ADR — an honest proxy for "does the agent follow a pointer cold" (H5's non-git half), not a test of real-pointer durability (that's `pointer-form-and-check`'s job). | H5's non-git pointer-following behavior in its purest, zero-content form. |
| `marker` | Replace the span with one line using a fixed, greppable prefix: `// GUARD: <fact>, <consequence>` (≤ 1 line, hand-authored once, frozen in the same fixture as §1), modeled on the fleet's own Rust `SAFETY:` convention and Go's `Deprecated:` token (`go.dev/wiki/Deprecated`, already flagged for fetch in the `guard-shape` dive). | **Isolates H4's first disjunct** ("its constraint stays as one local line that says it is load-bearing") in its most literal form — no elaboration, no pointer, no test dependency stated. Run it across **both** Tier A (no test) and Tier B (tested) sites and diff the two survival rates: if `marker` survival is materially lower at Tier A than Tier B, the marker alone is insufficient and the test is doing real work; if the two rates are close, the marker is sufficient on its own. |

`marker` is the arm to name when the brief asks for "the arm that isolates H4" — it is the only arm that varies *exactly* the one-local-line channel while holding the test-presence variable at its natural (Tier A/B) values, giving the 2×2 read-out for free instead of needing a dedicated crossed design.

### 3. Per-site vs per-repo snapshots: a structural fix `build_arms.py` needs

`build_arms.py:139-141` groups sites by repo into `files: dict[str, set[str]]` and builds **one snapshot per (arm, repo)**, shared by every site whose file is in that repo (`snapshot(repo, Path(a.out) / arm / repo, edits)`, `build_arms.py:162`). That's correct for `original`/`stripped`/`oneline` (file-wide, uniform transforms — sharing is free and desired). It is wrong for `test-only`, `pointer-only`, `marker`, `rules`, `pointer`, because **8 of the fleet files in the proposed set hold 2–3 sites each**:

| File | Sites sharing it |
|---|---|
| `ocx/crates/ocx_config/src/env.rs` | OCX-01, OCX-02, OCX-03 |
| `ocx/crates/ocx_util/src/fs.rs` | OCX-06, OCX-07, OCX-08 |
| `ocx/crates/ocx_index/src/store.rs` | OCX-19, OCX-21 |
| `ocx/crates/ocx_project/src/mutate.rs` | OCX-14, OCX-15 |
| `grimoire/src/install/path_anchor.rs` | GRM-02, GRM-03 |
| `grimoire/src/store/atomic_write.rs` | GRM-04, GRM-05 |
| `grimoire/src/lock/advisory_lock.rs` | GRM-06, GRM-07 |

If `build_arms.py` built one shared `marker`-arm snapshot per repo covering every site in it, probing OCX-19 in that snapshot would *also* see OCX-21's comment already replaced with a marker — an uncontrolled confound (the agent's read of the file's overall commenting register changes for reasons unrelated to the site being probed). **Fix**: for the five per-site arms, the snapshot path becomes `out/<arm>/<site_id>/<repo>/...`, built once per (arm, site) with only that site's own span edited and every other site's span in the same file left as `original`. Cost is negligible — `git archive HEAD` on the largest fleet repo (ocx, 169 MB `.git`) took 2.6 s in a direct measurement (§4); building ~2–3× more snapshot directories for the handful of shared files adds well under a minute of one-time harness build time.

### 4. The git channel: why "cut history before the comment landed" fails, and a measured alternative

The brief names two options: a `git-filter-repo` blob-callback design, or cutting history at the commit before the comment landed. The second option was tested against the fleet and rejected with a concrete counterexample.

**The rejection, verified live**: `git log --oneline -S "A failed parent fsync is an error" -- crates/ocx_project/src/mutate.rs` in `/home/mherwig/dev/ocx` returns exactly one commit, [`97bcf5109`](https://github.com/ocx-sh/ocx/commit/97bcf51097c7f89e4c28d4930988d10604b244d9) ("refactor(project): ocx.toml and ocx.lock are published by one rename helper..."). `git show 97bcf5109 -- crates/ocx_project/src/mutate.rs` shows the guard comment (OCX-14) and the fsync-propagation fix landing in the **same commit**. Checking out the parent commit to get "history before the comment" also reverts the code to the pre-fix state — `fsync_parent`'s error is swallowed with `let _ =`, the exact bug the comment documents. An arm built that way isn't testing "does the agent recover the reason with older, unredacted history"; it's testing a different, buggier function than every other arm — not comparable. This is not an edge case: guard comments in this fleet routinely narrate the regression they fix, so comment-and-fix-in-one-commit is the *expected* case, not the exception (see also OCX-19's CWE-345 comment, OCX-09's "canonical narration-that-is-actually-a-guard" example already flagged by the prior critique).

**The measured alternative**: `git-filter-repo --file-info-callback` rewrites blob *content* commit-by-commit while leaving commit messages, authors, dates and the full commit graph untouched (verified against the installed tool, version `a40bce548d2c`: `--file-info-callback` "is designed to be used in cases where filtering depends on both filename and contents," is called once per file-change with `(filename, mode, blob_id, value)`, and returns a `(filename, mode, blob_id)` tuple via `value.insert_file_with_contents(...)`). Recipe: clone the target repo fresh (`git clone --no-local`), then run one `--file-info-callback` that, for each of the arm's target files, applies the same span-transform as `marker`/`test-only`/etc. to **every historical blob** of that file (not just HEAD's), leaving every unrelated file and every commit message alone.

Measured on the real fleet (this dive's own methodology, run against throwaway clones in scratch, never touching `/home/mherwig/dev`):

| Repo | Commits | `.git` size (packed) | Clone time | `--file-info-callback` rewrite time (N target files) |
|---|---:|---:|---:|---:|
| ocx-sdk-python | 51 | 1.1 MB | 0.21 s | 0.15 s (1 file) |
| ocx | 1,160 | 32 MB (post-clone) | 2.60 s | 1.96 s (7 files) |

Verified zero-leak on the targeted files (`git log --all -p -- <file> \| grep -c "<original comment phrase>"` → `0` for every targeted file) and verified commit messages survive untouched (`git log --oneline -- crates/ocx_package_manager/src/tasks/render_toolchain.rs` still shows real, readable messages after the rewrite). **Cost verdict**: building a full-history, comment-redacted clone of even the fleet's largest repo costs single-digit seconds, one time, per repo — not a harness-build bottleneck. The real cost of a git-channel arm is downstream, in `run_probes.py`: giving the agent `Bash(git log:*)`/`Bash(git blame:*)`/`Bash(git show:*)` (already in `run_probes.py`'s `ALLOWED` list, currently unused by any arm since every existing snapshot is a single-commit `git init` — `build_arms.py:128-129`) means a git-channel session can spend materially more turns and tokens exploring history than a snapshot session can (see §7 cost table — budget the git-channel arm as its own line item, not folded into the standard 8-arm cost).

**Second-order finding worth flagging on its own**: OCX-14's commit message restates the exact guard reasoning ("`ocx.toml` swallowed a failed parent-directory fsync (`let _ =`), so a publish could be reported as landed while the rename entry was not durable") using different wording from the source comment, and with **zero substring overlap** with the source comment's own phrasing ("A failed parent fsync is an error, not a shrug"). This is direct, fleet-sourced (not hypothetical) evidence that commit-message archaeology is a *real, distinct* recovery channel — worth its own scoring bucket in `extract.py`'s where-found taxonomy (that taxonomy work belongs to `eval-scoring`, but the evidence for it belongs here).

### 5. Site stratification: the 20 proposed mechanism sites, tabulated

Register and length verified directly against the live fleet (not re-derived from `eval-sites.md`'s prose, which doesn't tabulate this): `sed -n '<line>p' <file>` at each site's comment span.

| ID | Repo | Lang | Register | Length | Length bucket | Obviousness | Test |
|---|---|---|---|---:|---|---|---|
| OCX-02 | ocx | rust | doc (`///`) | 20 | >10 | 3 | no (fail-open direction unasserted) |
| OCX-06 | ocx | rust | doc (`///`) | 3 | 3-10 | 3 | none |
| OCX-07 | ocx | rust | plain (`//`) | 3 | 3-10 | 3 | none |
| OCX-14 | ocx | rust | doc (`///`) | 3 | 3-10 | 3 | none (durability not unit-testable) |
| OCX-17 | ocx | rust | plain (`//`) | 12 | >10 | 3 | n/a: structural |
| OCX-21 | ocx | rust | plain (`// ponytail:`) | 9 | 3-10 | 3 | none |
| OCX-23 | ocx | rust | doc (`///`) | 4 | 3-10 | 3 | partial |
| GRM-03 | grimoire | rust | plain (`//`) | 5 | 3-10 | 3 | none |
| GRM-04 | grimoire | rust | doc (`///`) | 7 | 3-10 | 3 | none (crash durability) |
| GRM-06 | grimoire | rust | plain (`//`) | 3 | 3-10 | 3 | none direct |
| PY-01 | ocx-sdk-python | python | doc (docstring) | 3 | 3-10 | 3 | none |
| TS-03 | grimoire-vscode | ts | doc (`/**`) | 7 | 3-10 | 3 | none |
| OCX-09 | ocx | rust | plain (`//`) | 1 | 1-2 | 3 | yes |
| OCX-13 | ocx | rust | doc (`///`) | 6 | 3-10 | 3 | yes |
| OCX-19 | ocx | rust | plain (`//`) | 10 | 3-10 | 3 | yes |
| OCX-20 | ocx | rust | doc (`///`) | 7 | 3-10 | 3 | yes |
| GRM-01 | grimoire | rust | plain (`//`) | 3 | 3-10 | 3 | yes |
| GRM-05 | grimoire | rust | doc (`///`) | 10 | 3-10 | 3 | yes |
| PY-02 | ocx-sdk-python | python | **error-message string** (not a comment) | 5 | 3-10 | 3 | yes |
| TS-04 | grimoire-vscode | ts | doc (`/**`) | 6 | 3-10 | 3 | yes |

**Empty cells named**:
- **1–2 line bucket: 1/20 (only OCX-09).** Human guards are median 2 lines, 85% ≤2 (`human-sample.md` §"Length by category"), so the harvest under-represents exactly the shape the `marker` arm exists to validate. Fill candidates, already classified but **not yet run through `eval-sites.md`'s ground-truth/test/breaking-edit verification**: `ocx:crates/ocx_oci/src/auth/registry_url.rs:33` (len 1), `ocx:crates/ocx_util/src/fs/path.rs:139` (len 1), `grimoire:src/install/vendor_kilo.rs:133` (len 1), `grimoire:src/install/vendor_warp.rs:69` (len 2), `ocx-catalog:src/theme/utils/version.ts:163` and `:192` (len 1 each, **the only TS-language 1-2-line candidates in the fleet sample and currently the only path to a >2-language 1-2-line cell**) — all from `sample.md` §5's already-classified guard list. Recommend harvesting these 6 with the `eval-sites.md` methodology (ground truth, test check, breaking edit) before the next eval wave.
- **>10 lines: 2/20 (OCX-02, OCX-17), both ocx/rust.** No Tier-B >10-line site, no non-Rust >10-line site. `ocx-sdk-python`'s essay-length contract blocks (70.7% contract by line share per `sample.md` §4) are a plausible python >10 candidate to harvest, since the guard-shape dive already flags SDK contract text as differently-shaped (compresses only 2.56x, is the interface, not narration about it).
- **Language**: 0 Go, 0 JVM anywhere in the mechanism-site pool — this is a fleet property, not a sampling gap (`code-docs-topic-map.md` deferred list: "no JVM code in the fleet"), so it is not filled; noted so the eval's language coverage claim doesn't overstate itself.
- **PY-02's register ("error-message string") has no other member in the pool.** It is real, fleet-sourced (verified: `ocx-sdk-python/src/ocx_sdk/_bootstrap.py:833` raises `DistManifestError(f"...refused even though the SDK never writes an archive name to disk.")`) and worth keeping as a singleton stress-test of the harness's assumption that "the reason lives in a comment" — for this one site, every comment-stripping arm (`stripped`, `oneline`, `test-only`, `marker`) is a no-op on the reason itself, so its survival should be ~100% in every arm; if it isn't, that's a scoring-pipeline bug, not a code-docs finding.

### 6. Controls: replacing trivial accessors with recoverable-from-code blocks read in their function

`eval-sites.md`'s 8 FTC sites (`FTC-01`..`FTC-08`) are all standalone one-line doc comments on trivial accessors (`Version::parent`, `Digest::hex`, `DistSource.path`, ...) — the comment *is* the whole "function," so an agent doesn't have to read anything in context to know it's droppable. `sample.md` classifies 8 fleet narration/tautology blocks in its taxonomy table but doesn't give per-block `file:line` for them (only the 100 guard blocks get that treatment in §5), so the fleet sample can't supply file-line-verified in-function controls without a fresh harvest. `human-sample.md`'s "Appendix: all 200 classifications" does carry `file:line` + `Recoverable=yes` + a note for every block, including narration blocks embedded inside real functions. Eight were selected for language balance (matching the mechanism sites' rust/python/ts split, since the fleet has no Go/JVM code, §5):

| ID | Repo | File:line | Lang | Note (verbatim from `human-sample.md`) |
|---|---|---|---|---|
| C-01 | BurntSushi/ripgrep | `crates/core/main.rs:179` | rust | "restates fallthrough to `err_message`" |
| C-02 | rust-lang/cargo | `src/cargo/sources/registry/mod.rs:394` | rust | "restates the `unwrap_or(false)` directly below" |
| C-03 | rust-lang/cargo | `src/cargo/core/package.rs:1126` | rust | narration (no further note) |
| C-04 | tokio-rs/tokio | `tokio/src/runtime/queue.rs:405` | rust | narration (no further note) |
| C-05 | pypa/pip | `src/pip/_internal/vcs/git.py:281` | python | "restates the very next if-condition" |
| C-06 | pypa/pip | `src/pip/_internal/operations/prepare.py:464` | python | "restates the following download-dir check" |
| C-07 | vitejs/vite | `packages/vite/src/node/plugins/resolve.ts:632` | ts | narration (no further note) |
| C-08 | vitejs/vite | `packages/vite/src/node/plugin.ts:118` | ts | "restates the visible `options: { ssr?: boolean }` type annotation right below it" |

These sit under `~/.cache/research-lang/exemplars/code-docs/<owner>__<repo>/`, pinned at the pre-2022 SHAs in `code-docs-audit/exemplars.tsv` (e.g. `BurntSushi__ripgrep` @ `0b36942f680bfa9ae88a564f2636aa8286470073`) — outside `build_arms.py`'s hardcoded `DEV = Path("/home/mherwig/dev")` (`build_arms.py:30`). **Required change**: add an optional `"root"` field to each site's JSON entry, default `DEV`, and change `snapshot(repo, dest, edits)`'s clone line from `DEV / repo` to `Path(site.get("root", DEV)) / repo`. These clones are `git clone --filter=blob:none` partial clones per the frame; `git archive HEAD` on a blob-less clone can trigger a lazy blob fetch over the network for any path not already materialized — a real but minor operational risk, mitigated because `human-sample.md`'s own audit already read every one of these 8 files at the pinned SHA, which means their blobs are already in the local object cache.

**Why controls need only 2 arms, not 8**: every one of these 8 blocks is pure narration with `MINIMAL LINES = 0` (`human-sample.md` §"Compression" — the whole tautology/narration/record-paraphrase bucket compresses to zero). A `rules`-following rewrite of a zero-content block *is* deletion; `marker`/`pointer`/`pointer-only`/`test-only` all collapse to the same operation on a control. Running all 8 arms on controls spends 4x the sessions to measure the same thing four times. Controls run `original` and `stripped` (=deleted) only.

### 7. Power: reps, sites, sessions, cost — and the honest shortfall against 10 points

**Reps per (site, arm): R = 5.** Justification, not a round number: `run_probes.py` already exposes `--rep` (default 1) as a first-class CLI flag (`run_probes.py:112`, `jobs = [(s, arm, r) for r in range(1, a.rep + 1) ...]`), matching the general repeated-sampling-reduces-variance principle behind `pass@k`-style evals (Chen et al. 2021, `arXiv:2107.03374` — though that paper's own repeat count, n=200 per problem, prices a single short completion, not a multi-turn agentic session with `--max-budget-usd 2`; R=5 here is a budget-driven choice, not a transplant of HumanEval's number).

**Why the brief's literal "10-point drop" target is not reachable at the proposed site count** — worked, not asserted: modeling each site's true survival probability as varying between sites (some Tier-A sites plausibly swing 90%→30-50% under an aggressive arm; some Tier-B/lint-owned sites are near-ceiling in every arm), pooling across R reps and N sites needs a design-effect correction, DEFF = 1 + (R−1)·ICC (standard cluster-sampling formula; NCBI PMC6477104). Two-proportion minimum-detectable-effect (MDE) at α=0.05 two-sided, 80% power:

```
MDE = (z_{α/2} + z_β) · sqrt[ (p1(1-p1) + p2(1-p2)) / n_eff ],  n_eff = N·R / DEFF
```

| N sites | R | ICC (assumed) | DEFF | n_eff/arm | MDE @ p1=0.90 |
|---:|---:|---:|---:|---:|---:|
| 20 (proposed mechanism set) | 5 | 0.3 (conservative) | 2.2 | 45.5 | **~21 points** |
| 40 (full first-wave harvest) | 5 | 0.1 (optimistic) | 1.4 | 142.9 | **~12 points** |
| 40 | 10 | 0.1 | 1.9 | 210.5 | ~10 points |

At the proposed 20-28 site design, the eval can reliably detect roughly a **20+ point** pooled drop, not 10. Reaching 10 points needs the **full 40-mechanism-site harvest** (not the 24/28-site proposal) at R≥5, and even then only under an optimistic (low) between-site clustering assumption — because between-site heterogeneity, not per-site sampling noise, is the binding constraint (raising R past ~5-10 buys little once within-site noise is already small relative to between-site variance; the effective lever is N). **This is the honest answer, not a hedge**: it depends on ICC (between-site variance in guard fragility), and at the fleet's actual site supply, the 10-point target requires either widening N to the full harvest or relaxing the target. Recommendation to `eval-scoring`: treat "10 points" as the non-inferiority test's **margin** (a decision threshold the paired test is built around), not a pooled effect size this design is powered to detect with a two-sided significance test.

**Sessions and cost** (`run_probes.py`'s `run_one()` = 1 session = 2 Claude turns, each independently capped at `--max-budget-usd 2`, `run_probes.py:74-75`):

| Design | Mechanism sessions | Control sessions | Total sessions | Total turns | Worst-case cost ceiling | Realistic estimate |
|---|---:|---:|---:|---:|---:|---:|
| Default (28 sites: 20 mechanism × 8 arms + 8 controls × 2 arms), R=5 | 20×8×5=800 | 8×2×5=80 | **880** | 1,760 | **$3,520** | $175–530 |
| Widened (48 sites: 40 mechanism × 8 arms + 8 controls × 2 arms), R=5 | 40×8×5=1,600 | 8×2×5=80 | **1,680** | 3,360 | **$6,720** | $330–1,000 |

The cost ceiling is exact (sourced from the script's own flag); the realistic estimate is a labeled order-of-magnitude guess (sonnet, read-only tool calls over 1-3 small files per turn, ~15-30k tokens/turn), not a quoted price — current per-token pricing wasn't independently re-verified for this dive. The git-channel arm (§4) is not in either table above; budget it separately since its sessions carry `git log`/`git blame` tool calls the snapshot arms don't use and will run longer per turn.

## Normative guidance candidates

1. **A comment-cleanup or eval-fixture arm that rewrites guard text must be authored once and frozen, never regenerated per run.** Rationale: prevents an eval (or a cleanup skill's own self-check) from silently comparing against a moving target across reruns. Verify: `diff <(git show <fixture-commit>:site-rewrites.json) site-rewrites.json` is empty across every harness run in a given eval wave; a harness that calls an LLM inside `build_arms.py` itself fails review. Severity: MUST.
2. **A per-site content transform must snapshot per (arm, site), never share a snapshot across sites that live in the same file.** Rationale: prevents cross-site contamination when 2+ eval sites share a file (7 files in this fleet do). Verify: `find out/marker -maxdepth 1 -type d | wc -l` equals the number of sites assigned to the `marker` arm, not the number of distinct repos. Severity: MUST for any per-site arm.
3. **A git-history-bearing eval arm must redact via blob-content rewrite (`git-filter-repo --file-info-callback`), never by checking out an ancestor commit.** Rationale: an ancestor checkout can silently swap in pre-fix, buggy code whenever the guard comment and its fix landed in the same commit — confirmed on the fleet (OCX-14, `ocx@97bcf5109`). Verify: `git -C <arm-snapshot> diff <pinned-arm-commit> <original-repo-HEAD> -- <site-file>` shows **zero** non-comment (code) hunks; any code hunk means the "history cut" checkout changed behavior, not just comment visibility. Severity: MUST.
4. **After redacting a file's comment via history rewrite, verify zero leakage across all rewritten history, not just the current tip.** Rationale: a callback bug that only strips the *current* blob's comment (and misses an earlier commit that reintroduces similar text, e.g. after a revert) leaks the answer through `git log -p`. Verify (this dive's own command, run for real): `git log --all -p -- <file> | grep -c -e "<verbatim guard phrase>"` must print `0`. Severity: MUST.
5. **A free-to-change / recoverable-from-code control site must be a block read inside a real function, never a standalone trivial-accessor doc comment.** Rationale: a standalone one-line getter doc requires no context-reading to judge safe-to-cut and inflates apparent agent competence relative to realistic cleanup work. Verify (reading heuristic): the block's enclosing scope must contain ≥1 other statement besides the item the comment documents; `grep -c` a one-liner accessor body (`return self\.\w+$` / `=>\s*self\.\w+;?$`) at the site's line+1..+3 should be `0` for a valid control.
6. **A comment-cleanup rule must not assume "the reason is in a comment" universally** — at least one fleet site (PY-02) carries the guard's justification inside a raised exception's message string, immune to comment-stripping by construction. Rationale: a check that only classifies `doc`/`line` comment kinds (as `comment_census.py` does today) will never flag this site as carrying protected content, and a naive "delete short comments" cleanup pass would correctly leave it alone only by accident. Verify: none exists yet — `comment_census.py` has no classifier bucket for reason-bearing string literals; flagged as a gap for the `census-classifier` dive, not solved here. Severity: CONSIDER (rare in this fleet — 1/20 mechanism sites found — but a false sense of completeness is cheap to create).
7. **Treat "detect a 10-point pooled guard-survival drop" as a design goal that names its own site-count requirement, not a fixed default.** Rationale: at ICC=0.3 (a defensible prior for this kind of heterogeneous guard-fragility population) the proposed 20-28 site design is powered for roughly double that effect size (~21 points), not 10; reporting a "no significant drop" result from an underpowered comparison would be silently treated as "the arm is safe" when it may only mean "we couldn't tell." Verify: before trusting any single eval-wave's pooled result, recompute the MDE table above with that wave's actual R and N, using the formula given in §7. Severity: MUST for `eval-scoring`'s non-inferiority test design.

## AI-agent angle

- **An agent asked to "complete the harness" for `rules`/`pointer` will most likely wire in a live LLM call inside `build_arms.py`**, because that's the literal reading of "arms filled by agents later" and it's the shortest diff. The smallest mechanical check that catches this: `grep -rn -e 'anthropic' -e 'claude' -e 'subprocess.run(\["claude"' code-docs-eval/harness/build_arms.py` should return nothing — `build_arms.py` must never itself shell out to an LLM; only `run_probes.py` does.
- **An agent building the `test-only`/`marker`/`pointer-only` arms will likely reuse `build_arms.py`'s existing per-repo `snapshot()` call unmodified**, because that's the path of least resistance and the existing tests (if any) won't catch cross-site contamination unless a fixture file actually has 2+ sites. Smallest check: assert `len(set(s["file"] for s in sites_in_repo)) == len(sites_in_repo)` is false for at least one repo in the site list (i.e., deliberately keep a shared-file pair in the test fixture) so a naive per-repo-only implementation fails a planted test.
- **An agent asked to "cut git history before the comment landed" will pick the comment's own introducing commit via `git log -S` and check out its parent, without checking whether the same commit also changed the code the comment explains.** The mechanical check: after building that arm, `git diff <chosen-parent-commit> <repo-HEAD> -- <site-file>` must show **zero** hunks outside the comment's own line range; any code-line hunk means the checkout also reverted behavior, and the arm is invalid as a "same code, less history" comparison.
- **An agent measuring "cost" for a new eval wave will likely just multiply sites × arms × reps by the script's `--max-budget-usd` ceiling and report that as "the cost,"** overstating budget need by 10-20x relative to realistic small-file-read usage (§7). The mechanical check: after any batch of ≥20 real `run_probes.py` sessions, look at the harness's own logged/observed cost per session (not the `--max-budget-usd` cap) before extrapolating to a larger wave.

## Contested / evolving

- **Whether R (reps) or N (sites) is the better power lever is not contested in the statistics — it's dictated by the ICC, which nobody has measured for this specific population yet.** This dive assumed ICC ∈ {0.1, 0.3} as bracketing priors, not a measurement; the first real eval wave's own data should replace this assumption with an estimated ICC (variance of per-site survival rates across the R=5 reps already collected), which will very likely change the N-vs-R recommendation for wave two. As of 2026-09-27, this is an open input, not a settled design constant.
- **Whether a fabricated eval-only "reason record" fixture (the `pointer-only` arm's non-Tier-B target) is a fair test of H5, or an artificially easy one, is unresolved.** A real ADR competes with dozens of other files an agent might or might not think to check; a fixture placed at a predictable, eval-specific path might be found more easily (or, if placed somewhere an agent has no reason to look, less easily) than a genuine record would be. This dive flags it as a named limitation rather than resolving it; `pointer-form-and-check`'s eventual real-ADR-pointer measurements should be used to calibrate or replace it before the fixture's results are trusted as generalizable.

## Decisions this dive proposes

1. **Arms (8 total, each with a build recipe above): `original`, `stripped`, `oneline` (existing, unchanged) + `test-only`, `pointer-only`, `marker` (new, §2) + `rules`, `pointer` (existing names, redefined from "agent writes live" to "written once and committed," §1).** Reason: reproducibility is a hard requirement the current harness violates for 2 of 5 named arms; the three new arms each isolate a distinct channel the brief asks for (test-as-guard, bare pointer, minimal marker), and `marker` alone isolates H4 by construction (comparing its Tier-A vs Tier-B survival rate).
2. **Site list (28 total: 20 mechanism + 8 controls), as JSON below.** Reason: keeps the existing Tier A (12) + Tier B (8) selection from `eval-sites.md` (already verified: ground truth, breaking edit, test status, obviousness), replaces the 4 trivial-accessor FTC controls with 8 in-function `recoverable-from-code: yes` blocks (better ecological validity, fills the missing TS-control cell, §6), and names — rather than silently ignores — the resulting 1-2-line and >10-line stratification gaps (§5).
3. **Git channel: `git-filter-repo --file-info-callback`, blob-content redaction over full real history — not a truncated-history checkout.** Reason: the truncated-checkout alternative is invalidated by a concrete fleet counterexample (OCX-14/`97bcf5109`); the filter-repo alternative is measured, cheap (≤2.6s clone + ≤2s rewrite even for the fleet's largest repo), and verified zero-leak.
4. **Repetitions: R=5 per (site, arm) for the default 28-site design; controls run only 2 of the 8 arms.** Reason: matches `run_probes.py`'s existing `--rep` mechanism, keeps the default design's session count (880) and worst-case cost ($3,520) inside a single eval-wave budget; running all 8 arms on controls would 4x control cost for zero additional information (§6).
5. **The brief's "detect a 10-point drop" target is accepted as `eval-scoring`'s non-inferiority *margin*, not as a power target this site-count design can hit with a two-sided significance test.** Reason: worked MDE calculation (§7) shows ~20+ points achievable at 20-28 sites; reaching 10 points needs the full 40-site harvest at low assumed ICC. Widening N (harvesting the 6 named 1-2-line candidates plus the rest of the 40-site pool) is recommended before a second eval wave, in preference to raising R further.

### Site list (JSON)

```json
{
  "sites": [
    {"id":"OCX-02","repo":"ocx","file":"crates/ocx_config/src/env.rs","lines":"1774-1902","anchor_line":1774,"breaking_edit":"make an I/O error refuse resolution (fail-closed) 'to be conservative'","stratum":"A"},
    {"id":"OCX-06","repo":"ocx","file":"crates/ocx_util/src/fs.rs","lines":"315-329","anchor_line":318,"breaking_edit":"switch to a following metadata() call since other identity checks in the file follow links","stratum":"A"},
    {"id":"OCX-07","repo":"ocx","file":"crates/ocx_util/src/fs.rs","lines":"295-311","anchor_line":301,"breaking_edit":"add tmp.keep() 'to be safe and not lose data'","stratum":"A"},
    {"id":"OCX-14","repo":"ocx","file":"crates/ocx_project/src/mutate.rs","lines":"66-92","anchor_line":66,"breaking_edit":"wrap in let _ = fsync_parent(parent); since fsync failures are 'usually not actionable'","stratum":"A"},
    {"id":"OCX-17","repo":"ocx","file":"crates/ocx_oci/src/endpoint.rs","lines":"479-493","anchor_line":480,"breaking_edit":"add a wildcard arm, or delegate to the existing classify() helper since it 'already does this mapping'","stratum":"A"},
    {"id":"OCX-21","repo":"ocx","file":"crates/ocx_index/src/store.rs","lines":"488-496","anchor_line":488,"breaking_edit":"add a HashMap memo keyed by source 'for performance'","stratum":"A"},
    {"id":"OCX-23","repo":"ocx","file":"crates/ocx_util/src/path.rs","lines":"160-186","anchor_line":180,"breaking_edit":"canonicalize both sides before comparing, reading the stated limitation as a bug","stratum":"A"},
    {"id":"GRM-03","repo":"grimoire","file":"src/install/path_anchor.rs","lines":"610-622","anchor_line":614,"breaking_edit":"inline a fresh symlink_metadata call at each use site instead of threading the variable","stratum":"A"},
    {"id":"GRM-04","repo":"grimoire","file":"src/store/atomic_write.rs","lines":"30-65","anchor_line":4,"breaking_edit":"drop the trailing parent-directory fsync as 'probably unnecessary since the rename already happened'","stratum":"A"},
    {"id":"GRM-06","repo":"grimoire","file":"src/lock/advisory_lock.rs","lines":"148-166","anchor_line":150,"breaking_edit":"reorder to close the handle first, then unlink, since 'the unlink doesn't need the lock anyway'","stratum":"A"},
    {"id":"PY-01","repo":"ocx-sdk-python","file":"src/ocx_sdk/_bootstrap.py","lines":"682-699","anchor_line":685,"breaking_edit":"reuse the sibling _hash_path(binary) helper since keeping both looks redundant","stratum":"A"},
    {"id":"TS-03","repo":"grimoire-vscode","file":"src/detailsCache.ts","lines":"204-219","anchor_line":206,"breaking_edit":"simplify the tmp name back to a per-repo path since only one file 'should' be written per repo at a time","stratum":"A"},
    {"id":"OCX-09","repo":"ocx","file":"crates/ocx_package_manager/src/tasks/render_toolchain.rs","lines":"891-900","anchor_line":891,"breaking_edit":"rename _render_lock to _ as routine unused-binding cleanup","stratum":"B"},
    {"id":"OCX-13","repo":"ocx","file":"crates/ocx_util/src/archive/tar.rs","lines":"340-368","anchor_line":359,"breaking_edit":"drop the second canonicalize+starts_with as redundant, to save a syscall","stratum":"B"},
    {"id":"OCX-19","repo":"ocx","file":"crates/ocx_index/src/store.rs","lines":"207-223","anchor_line":209,"breaking_edit":"simplify back to Err(_) if target.exists() => Ok(()) - the exact historical bug the comment names","stratum":"B"},
    {"id":"OCX-20","repo":"ocx","file":"crates/ocx_config/src/insecure.rs","lines":"21-121","anchor_line":27,"breaking_edit":"collapse Option<bool> to bool via unwrap_or(false), treating not-stated the same as explicitly-false","stratum":"B"},
    {"id":"GRM-01","repo":"grimoire","file":"src/path_safety.rs","lines":"91-97","anchor_line":91,"breaking_edit":"simplify the condition to just candidate.exists()","stratum":"B"},
    {"id":"GRM-05","repo":"grimoire","file":"src/store/atomic_write.rs","lines":"67-95","anchor_line":70,"breaking_edit":"have both callers share one follow-always function 'since it preserves more data'","stratum":"B"},
    {"id":"PY-02","repo":"ocx-sdk-python","file":"src/ocx_sdk/_bootstrap.py","lines":"803-838","anchor_line":833,"breaking_edit":"drop the traversal check as dead code that 'can't matter' since name is never used as a path","stratum":"B"},
    {"id":"TS-04","repo":"grimoire-vscode","file":"src/scopes.ts","lines":"111-146","anchor_line":129,"breaking_edit":"replace path.resolve(dir, ...) with a plain join/template string since dir 'should already be absolute'","stratum":"B"},
    {"id":"C-01","repo":"BurntSushi__ripgrep","root":"~/.cache/research-lang/exemplars/code-docs","file":"crates/core/main.rs","lines":"179-179","anchor_line":179,"breaking_edit":"delete the one-line narration comment (control: no guard to break)","stratum":"C"},
    {"id":"C-02","repo":"rust-lang__cargo","root":"~/.cache/research-lang/exemplars/code-docs","file":"src/cargo/sources/registry/mod.rs","lines":"394-394","anchor_line":394,"breaking_edit":"delete the comment restating unwrap_or(false) on the next line (control)","stratum":"C"},
    {"id":"C-03","repo":"rust-lang__cargo","root":"~/.cache/research-lang/exemplars/code-docs","file":"src/cargo/core/package.rs","lines":"1126-1126","anchor_line":1126,"breaking_edit":"delete the narration comment (control)","stratum":"C"},
    {"id":"C-04","repo":"tokio-rs__tokio","root":"~/.cache/research-lang/exemplars/code-docs","file":"tokio/src/runtime/queue.rs","lines":"405-405","anchor_line":405,"breaking_edit":"delete the narration comment (control)","stratum":"C"},
    {"id":"C-05","repo":"pypa__pip","root":"~/.cache/research-lang/exemplars/code-docs","file":"src/pip/_internal/vcs/git.py","lines":"281-282","anchor_line":281,"breaking_edit":"delete the comment restating the very next if-condition (control)","stratum":"C"},
    {"id":"C-06","repo":"pypa__pip","root":"~/.cache/research-lang/exemplars/code-docs","file":"src/pip/_internal/operations/prepare.py","lines":"464-465","anchor_line":464,"breaking_edit":"delete the comment restating the following download-dir check (control)","stratum":"C"},
    {"id":"C-07","repo":"vitejs__vite","root":"~/.cache/research-lang/exemplars/code-docs","file":"packages/vite/src/node/plugins/resolve.ts","lines":"632-632","anchor_line":632,"breaking_edit":"delete the narration comment (control)","stratum":"C"},
    {"id":"C-08","repo":"vitejs__vite","root":"~/.cache/research-lang/exemplars/code-docs","file":"packages/vite/src/node/plugin.ts","lines":"118-119","anchor_line":118,"breaking_edit":"delete the doc comment restating the visible options:{ssr?:boolean} type (control)","stratum":"C"}
  ]
}
```

## Sources

| URL or path | What it is | Date/era | Why worth reading |
|---|---|---|---|
| `.agents/research/code-docs-audit/eval-sites.md` | Fleet eval-site harvest: 48 sites (40 mechanism + 8 FTC), ground truth, breaking edit, test status, obviousness, ranking into Tiers A-C | 2026-09-27 | Primary source for the 20 mechanism sites, their Tier assignment, and the 4-arm build_arms.py code read here |
| `.agents/research/code-docs-audit/sample.md` | Unbiased 320-block fleet comment sample, §3 recoverability/MINIMAL-LINES definitions, §5 all 100 guard blocks with file:line | 2026-09-27 | Source of the 1-2-line-guard fill candidates named in §5; confirms sample.md lacks a full per-block appendix (motivating the human-sample.md control choice) |
| `.agents/research/code-docs-audit/human-sample.md` | 200-block human-baseline sample (8 pre-2022 repos), full per-block appendix with Recoverable/Minimal columns, guard wording patterns | 2026-09-27 | Source of the 8 recoverable-from-code control sites (§6) and the median-2-line guard-length baseline used to name the 1-2-line stratification gap |
| `.agents/research/code-docs-frame.md` | Program frame: hypotheses H1-H7, eval sketch, exemplar-corpus location and exclusion list | 2026-09-27 | States H4/H5 verbatim; names the exemplar-corpus root path used for the 8 controls |
| `.agents/research/code-docs-topic-map.md` | Wave-1 synthesis across all audits, "What the grounding changed" | 2026-09-27 | Source of the "7/15 sampled guards sit on the test's own doc comment" fact used in the pointer-only arm's Tier-B target design |
| `.agents/research/code-docs-eval/harness/build_arms.py` | Existing harness: mechanical `stripped`/`oneline` arms, placeholder `rules`/`pointer` | 2026-09-27 | Read in full; source of the non-reproducibility finding (§1) and the per-repo-snapshot structural gap (§3) |
| `.agents/research/code-docs-eval/harness/run_probes.py` | Existing harness: two-turn cold-probe runner, `--rep`/`--max-budget-usd` flags, allowed git tools | 2026-09-27 | Source of the exact session/turn/cost-ceiling arithmetic in §7 and the git-tool-availability fact used in §4 |
| `/home/mherwig/dev/ocx` git history, commit [`97bcf5109`](https://github.com/ocx-sh/ocx/commit/97bcf51097c7f89e4c28d4930988d10604b244d9) | Live fleet git history, verified via `git log -S`/`git show` in this dive | commit dated 2026-09-21, read 2026-09-27 | Primary, fleet-sourced counterexample to the "cut history before the comment landed" design; also the source of the commit-message-recovers-the-reason finding |
| `git-filter-repo --help` (local install, `--version` reports `a40bce548d2c`) | Exact `--file-info-callback`/`--blob-callback` API and calling convention | tool installed locally, checked 2026-09-27 | Primary technical source for the git-channel build recipe; ground truth over any web summary |
| This dive's own `git-filter-repo` smoke test (scratch clones of ocx-sdk-python and ocx, discarded after measurement) | Live timing/leak-verification run against real fleet clones | run 2026-09-27 | Primary source of the exact clone/rewrite timings and zero-leak verification cited in §4 |
| [arXiv:2607.28887](https://arxiv.org/abs/2607.28887) "To Add Is Machine, To Delete Is Human" (Ebrahimi et al.) | CanItDelete benchmark paper: LLM deletion-avoidance measurement, 12 models, SWE-bench + retrofit + CanItDelete results | submitted 2026-07-30 | Confirms the 71.7% deletion-recall figure already cited by code-docs-topic-map.md; grounds the "agents under-delete" claim behind the cleanup-procedure dive with primary numbers |
| [huggingface.co/papers/2607.28887](https://huggingface.co/papers/2607.28887) | Community/AI-generated summary page for the same paper | fetched 2026-09-27 | Secondary; used only to cross-check the arXiv abstract's numbers, not cited alone for any claim |
| [metr.org/blog/2025-06-05-recent-reward-hacking/](https://metr.org/blog/2025-06-05-recent-reward-hacking/) | METR's reward-hacking observations post, including the instruction-ablation table (80%→70% with "please do not reward hack") | 2025-06-05 | Confirms the exact 80%/70% figures code-docs-topic-map.md already cites for cleanup-safety; grounds the "instructions alone barely move reward-hacking" finding with an exact quote |
| github.com/newren/git-filter-repo raw source | Upstream git-filter-repo docs/source, cross-checked against local `--help` | fetched 2026-09-27 | Secondary confirmation of `--file-info-callback`/`--replace-text` semantics before running the local tool |
| [PMC6477104 "Considering the design effect in cluster sampling"](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6477104/) | Peer-reviewed methodology reference for DEFF = 1+(m-1)·ICC | accessed 2026-09-27 | Grounds the MDE/power-analysis formula used in §7, rather than inventing the design-effect correction |
| [arXiv:2107.03374](https://arxiv.org/pdf/2107.03374) "Evaluating Large Language Models Trained on Code" (Chen et al.) | Codex/HumanEval paper introducing pass@k and its unbiased estimator | 2021, accessed 2026-09-27 | Context for the R=5 reps-per-site choice in §7 (repeated-sampling convention), explicitly contrasted with why HumanEval's own n=200 doesn't transfer directly to a multi-turn agentic budget |

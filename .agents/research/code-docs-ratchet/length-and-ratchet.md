---
title: "code-docs: block-length caps and the per-package ratchet metric"
topic: length-and-ratchet
agent: research-lang subagent (code-docs-ratchet)
model: claude-sonnet-5
date_researched: 2026-09-27
sources_count: 15
scope: >
  Covers: candidate block-length caps for plain and doc comments, tested
  against the 33-repo reference corpus and the 39 hand-labelled human guards;
  four candidate per-package ratchet metrics replayed over ocx's last 6
  months and three planted diffs (short-guard delete, long-guard delete,
  essay-split); the guard-recognizer carve-out these metrics need; the
  ambient "match its comment density" prompt and why it self-reinforces in
  ocx; baseline-file and diff-mode design borrowed from ocx's existing lint
  ratchet. Does not cover: guard-recognizer *implementation* (guard-shape
  dive owns the recognizer itself), plan-ID or pointer checks, or the
  cleanup skill's step order.
---

# code-docs: block-length caps and the per-package ratchet

## Contents

- [Summary](#summary)
- [Findings](#findings)
  1. [The three candidate plain caps against 39 human guards](#1-the-three-candidate-plain-caps-against-39-human-guards)
  2. [The four candidate doc caps against the same guards](#2-the-four-candidate-doc-caps-against-the-same-guards)
  3. [Package kind changes the right doc cap, not the right plain cap](#3-package-kind-changes-the-right-doc-cap-not-the-right-plain-cap)
  4. [Replaying ocx's last 6 months: four candidate metrics](#4-replaying-ocxs-last-6-months-four-candidate-metrics)
  5. [Per-package noise floor: tiny crates make per-kLOC metrics unusable](#5-per-package-noise-floor-tiny-crates-make-per-klocs-metrics-unusable)
  6. [Gaming: three planted diffs against all four metrics](#6-gaming-three-planted-diffs-against-all-four-metrics)
  7. [The carve-out: a recognizer check outside the numeric ratchet](#7-the-carve-out-a-recognizer-check-outside-the-numeric-ratchet)
  8. [Ambient matching: "match its comment density" and ocx's accelerating rate](#8-ambient-matching-match-its-comment-density-and-ocxs-accelerating-rate)
  9. [Reporting format: arch-go's compliance level and revive's density floor](#9-reporting-format-arch-gos-compliance-level-and-revives-density-floor)
- [Normative guidance candidates](#normative-guidance-candidates)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Decisions this dive proposes](#decisions-this-dive-proposes)
- [Sources](#sources)

## Summary

- A **plain-comment cap of 3 lines** (the reference corpus's own p90) flags 5
  of the 39 hand-labelled human guards; a cap of **5 lines** flags 0 of 39 and
  is the smallest cap that does not — use 5, not the p90, as the plain cap.
- A **doc-comment cap of 6 lines** (an app's own p90) flags 2 of 7 human doc
  guards (rust-analyzer's 8-line FFI-safety doc, tokio's 9-line
  buffer-bound-security doc); a cap of **10 lines** flags 0 — the guard floor
  overrides the naive app p90 even inside "app" repos.
- **Doc caps must be per package-kind, plain caps must not.** Reference-corpus
  plain p90 is 3.0 for both apps and libraries; doc p90 is 6 (apps) vs 13.5
  (libraries) — set doc cap 10 for apps, 15 for libraries; plain cap 5 flat.
- At those caps, the pooled human-corpus flag rate is **app doc 3.75%, app
  plain 4.46%, library doc 10.42%, library plain 15.86%** — a per-package
  ratchet baseline, not a universal gate, because the flag rate itself varies
  4x by package kind.
- **No single volume metric can tell a responsible essay-split from a guard
  massacre.** A planted essay-split (57→1 lines, `ocx_cli/src/options/env_override.rs:61-117`)
  and a planted deletion of a real 39-line guard
  (`ocx_announce/src/forge/github.rs:791-829`, sample.md's own labelled guard)
  move all four candidate metrics in the *same direction by comparable
  magnitude* — ratio, char ratio, blocks->10/kLOC and lines-in->10-blocks/kLOC
  all improve either way.
- **Short-guard deletion is invisible to block-length metrics and nearly
  invisible to ratio metrics.** Deleting a real 3-line guard
  (`ocx_cli/src/options/completion.rs:38-40`) leaves blocks->10/kLOC and
  lines->10/kLOC bit-for-bit unchanged and moves the ratio by ~0.015
  percentage points — below any realistic ratchet step. A gaming strategy
  built on deleting many short guards defeats block-length metrics entirely.
- **Because no metric distinguishes the cases, the guard carve-out must be a
  separate diff-time check, never encoded in the ratchet's number.** The
  check scores every removed/shrunk block with the guard-shape recognizer and
  requires a replacement (pointer, test, or lint-owned form) regardless of
  what the aggregate metric shows.
- **Recommend `lines_in_blocks_over_cap per kLOC` as the primary gated
  metric**, not the raw ratio: sample.md already showed ocx cannot reach the
  owner's 1:4-1:6 band even after cutting every sampled block to its
  non-recoverable minimum (implied floor 0.323-0.338); the ratio is reported
  for context, never gated.
- **ocx's monthly replay (April-September 2026) shows the long-block rate
  accelerating, not holding steady**: marginal (new-code-only)
  lines-in->10-blocks-per-kLOC rose from 173 (Apr-May) to 561-728
  (Aug-Sep, HEAD) — a codebase whose *average* density is already 36x the
  human-app rate is adding new code at 3-4x its own average rate.
- **This acceleration is fleet-specific, not era-specific**: the reference
  corpus's own pre-2022-to-HEAD comparison shows a median density shift of
  only +0.005 across 33 human repos (H3) — the runaway is not "2026 code
  looks like this," it is specific to the corpus an agent keeps reading and
  extending.
- **The runaway is consistent with self-reinforcement under "match its
  comment density."** Claude Code's current system prompt tells the model to
  "write code that reads like the surrounding code: match its comment
  density, naming, and idiom," replacing an older hard rule
  ("default to no comments... one short line max"). A rule phrased as a
  target ratio contradicts that instruction outright; a rule phrased as a
  ceiling on top of "match" does not.
- **A per-package baseline file plus `--check`/`--update` beats a fixed
  target**, reusing ocx's own `scripts/lint_ratchet.py` asymmetry: a decrease
  writes freely, a rise needs an explicit `--allow-regression` flag and
  prints every raised key, and an absent key reads as 0.
- **Tiny packages make every per-kLOC metric noisy.** `ocx_schema` (54 lines
  in September) swings from 0 to 37 blocks->10/kLOC month to month on a
  single block's presence; packages under a code-line floor should report
  into a fleet-level bucket, never get their own gated baseline row.
- **arch-go's compliance level (percentage of rules a module meets) and
  revive's `comments-density` (a bare minimum-ratio floor, default 0 /
  disabled) both model "how much of the codebase is covered," not "is any one
  file too long"** — neither tool ships a block-length cap; PMD's
  `CommentSize` does (default `maxLines=6`, `maxLineLength=80`) and its own
  issue tracker documents exactly this dive's failure mode: real comments
  legitimately longer than 6 lines get flagged with no guard-aware exception
  ([pmd/pmd#1607](https://github.com/pmd/pmd/issues/1607)).
- **No fixed ratio ships as a gate.** The rule ships bands as reference
  (reference-corpus.md's app/library table) and a per-package ratchet as the
  only gate; the current best estimate of ocx's floor is 0.30-0.35
  (sample.md §4), reported, not targeted.

## Findings

### 1. The three candidate plain caps against 39 human guards

`rules/code-docs/checks/comment_census.py --list-blocks --min-block 1 --scope
prod --format json` was run over the 33 exemplar clones at the checkout state
left by the reference-corpus measurement — 32 of 33 sit at their pre-2022
snapshot SHA, `astral-sh/uv` (no snapshot exists for it) at HEAD; SHAs in
`.agents/research/code-docs-audit/exemplars.tsv`. This is the same commit set
`reference-corpus.md`'s "pre-2022" bands describe (n=16 apps, 16 libraries),
so a candidate cap tested here is tested against the human baseline the rest
of the program already treats as ground truth, not a freshly drawn sample.

Pooled plain (`kind=line`) blocks, 37,363 total:

| Cap | Blocks flagged | Share |
|---|---:|---:|
| 3 | 5,740 | 15.36% |
| 5 | 3,750 | 10.04% |
| 8 | 997 | 2.67% |

Against the 39 hand-labelled human guards in `human-sample.md` ("How humans
write guards"), 32 of which sit in plain comments: guard lengths are 5, 4, 4,
4, 4, 3, 3, 3, 3, then fourteen at 2 and nine at 1 (max 5, median 2).

| Cap | Human plain guards flagged |
|---|---|
| 3 | **5 / 32** — cargo's dev-dependency-edge note (`rust-lang/cargo:src/cargo/core/resolver/mod.rs:1003`, 5 lines), ripgrep's I/O-error-consistency guard (4 lines), pip's stale-`pos`-reset guard (4 lines, vendored `requests`), two tokio lock-discipline guards (4 lines each) |
| 5 | **0 / 32** |
| 8 | **0 / 32** |

A cap of 3 — the reference corpus's own measured p90 for plain comments —
flags real guards in cargo, ripgrep and tokio. The brief's own rule ("a cap
that flags human guards is wrong") rules it out on contact with the same
corpus it was measured from. **Plain cap = 5** is the smallest of the three
candidates that clears every sampled human guard.

### 2. The four candidate doc caps against the same guards

Pooled doc (`kind=doc`) blocks, 43,351 total:

| Cap | Blocks flagged | Share |
|---|---:|---:|
| 6 | 8,719 | 20.11% |
| 10 | 4,528 | 10.44% |
| 15 | 2,630 | 6.07% |
| 20 | 1,685 | 3.89% |

Seven of the 39 human guards sit in doc comments, lengths 9, 8, 5, 3, 1, 1, 1
(max 9):

| Cap | Human doc guards flagged |
|---|---|
| 6 | **2 / 7** — `rust-lang/rust-analyzer:crates/proc_macro_srv/src/abis/abi_1_55/proc_macro/bridge/client.rs:343` (8 lines, an FFI-layout ABI guard) and `tokio-rs/tokio:tokio-util/src/codec/any_delimiter_codec.rs:66` (9 lines, an unbounded-buffer memory-exhaustion guard) |
| 10 | **0 / 7** |
| 15 | **0 / 7** |
| 20 | **0 / 7** |

Cap 6 kills two guards that a reasonable reviewer would call the sharpest
finds in the whole 200-block human sample (one guards an FFI ABI boundary,
the other an unbounded-memory DoS). **Doc cap must be at least 10.** Note the
rust-analyzer guard sits in an *app*-kind repo — this overrides "apps get the
tighter cap" from the reference-corpus bands table on its own terms; see
[§3](#3-package-kind-changes-the-right-doc-cap-not-the-right-plain-cap).

### 3. Package kind changes the right doc cap, not the right plain cap

`human-sample.md` already found "plain comments barely differ by kind" (0.046
apps vs 0.065 libraries) and `reference-corpus.md` measured identical plain
p90 (3.0) for both kinds. Re-running the by-kind split on the same
pooled-block data used above (`--group` is a census grouping dimension for
files; kind assignment here is per-repo from `exemplars.tsv`'s `app`/`lib`
column, matching `reference-corpus.md`'s own kind assignment):

| | Doc n | Plain n | Plain cap 3 | Plain cap 5 | Plain cap 8 | Doc cap 6 | Doc cap 10 | Doc cap 15 | Doc cap 20 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| App | 21,582 | 19,074 | 9.75% | 4.46% | 2.21% | 8.66% | 3.75% | 1.68% | 0.93% |
| Library | 21,769 | 18,289 | 21.21% | 15.86% | 3.15% | 31.47% | 17.08% | 10.42% | 6.82% |

Plain flag rates track together across kind (4.46% vs 15.86% at cap 5 — a
real difference, but both numbers describe the *same* register at the *same*
cap; the guard floor, not the corpus split, sets the cap). Doc flag rates
diverge sharply because doc comments carry contract prose that scales with
publish surface. At doc cap 10, libraries already flag 17.08% of their own
doc population — above their own p90 (13.5), meaning cap 10 for libraries
would gate the *upper half* of ordinary contract text, not the long tail.
Cap 15 sits just above the library p90 and flags 10.42%, matching a
"natural long tail" rate; cap 20 is looser still (6.82%) and buys little
extra guard headroom (max library doc guard length is 9, so cap 10 already
clears every sampled guard). **Decision: doc cap 10 for app-kind packages,
15 for library-kind packages; plain cap 5 flat for both.**

Package kind is decided per package (crate/module/directory that owns a
manifest), not per repo: a Cargo workspace member with `publish != false`
exposing a `pub` surface outside its own binary, an npm package without
`"private": true` that has an `exports`/`main` entry, or a Python package
installed by other packages (not only via `console_scripts`) is
library-kind; everything else is app-kind. ocx as a whole is app-kind (a CLI)
even though several of its crates carry heavy contract text — the cap
follows the crate's actual role, not the umbrella repo's reputation.

### 4. Replaying ocx's last 6 months: four candidate metrics

Six monthly snapshots (`git archive 8acfef9 | tar -x`, non-invasive — no
checkout of the live `ocx` clone) plus HEAD, one commit per calendar month
boundary going back from 2026-09-27:

| Month | SHA | code lines |
|---|---|---:|
| 2026-04 | `8acfef9` | 14,118 |
| 2026-05 | `fb27986` | 18,228 |
| 2026-06 | `d4f4aa0` | 27,257 |
| 2026-07 | `06f1cda` | 29,596 |
| 2026-08 | `5f89a64` | 44,982 |
| 2026-09 | `e48ef73` | 72,322 |
| HEAD (2026-09-25) | `2691d3c` | 92,518 |

Four candidates computed each month, whole-repo prod scope
(`comment_census.py --scope prod --group none --format json` for ratio and
char ratio; `--list-blocks --min-block 1` re-aggregated for the block-length
pair, since the script's built-in summary only reports `gt5`/`gt10`/`gt20`
*counts*, not lines-in-blocks at an arbitrary threshold):

| Month | ratio | char ratio | blocks>10/kLOC | lines-in->10/kLOC |
|---|---:|---:|---:|---:|
| 2026-04 | 0.173 | 0.331 | 1.912 | 32.512 |
| 2026-05 | 0.245 | 0.472 | 3.731 | 64.242 |
| 2026-06 | 0.451 | 0.888 | 9.576 | 172.543 |
| 2026-07 | 0.536 | 1.067 | 11.826 | 216.313 |
| 2026-08 | 0.655 | 1.312 | 14.828 | 280.957 |
| 2026-09 | 0.803 | 1.589 | 19.966 | 387.061 |
| HEAD | 0.874 | 1.726 | 22.666 | 461.586 |

All four rise monotonically and are highly correlated over this window — ocx
was not, in its ordinary history, doing the kind of targeted essay-splitting
or guard-deletion that would separate them. That separation only shows up
under the planted diffs in [§6](#6-gaming-three-planted-diffs-against-all-four-metrics).
Per-package, `crates/ocx_cli` (the one crate present at every snapshot;
`ocx_lib` was split into `ocx_config`/`ocx_oci`/`ocx_sign`/etc. between
2026-06 and HEAD — see [record-to-code-rot's crate-split finding](../code-docs-audit/census.md),
so no other crate persists across the whole window):

| Month | code | ratio | char ratio | blocks>10/kLOC | lines->10/kLOC |
|---|---:|---:|---:|---:|---:|
| 2026-04 | 2,543 | 0.065 | 0.117 | 0.0 | 0.0 |
| 2026-05 | 2,923 | 0.081 | 0.153 | 0.342 | 4.447 |
| 2026-06 | 5,156 | 0.363 | 0.723 | 6.982 | 141.583 |
| 2026-07 | 5,746 | 0.407 | 0.818 | 8.180 | 157.327 |
| 2026-08 | 9,055 | 0.487 | 0.991 | 8.945 | 176.146 |
| 2026-09 | 15,644 | 0.626 | 1.248 | 14.574 | 263.040 |
| HEAD | 20,044 | 0.603 | 1.179 | 14.518 | 271.153 |

`ocx_cli`'s own doc-comment growth outpaces the whole-repo average through
mid-2026, then tracks it — a per-package baseline would have caught this
crate's early runaway two months before the whole-repo number showed the
same shape.

### 5. Per-package noise floor: tiny crates make per-kLOC metrics unusable

`crates/ocx_schema` (a small crate, 35-275 code lines across the window)
swings from 0 to 37.037 blocks->10/kLOC and 481.481 lines->10/kLOC month to
month on the presence or absence of a *single* long block:

| Month | code | blocks>10/kLOC | lines->10/kLOC |
|---|---:|---:|---:|
| 2026-08 | 54 | 18.519 | 277.778 |
| 2026-09 | 54 | 37.037 | 481.481 |
| HEAD | 275 | 14.545 | 276.364 |

One block appearing or disappearing moves this crate's per-kLOC figure by
double digits — not a signal a ratchet can gate on. **Any package under a
size floor (proposed: 500 code lines) reports into a repo-level or
fleet-level bucket instead of getting its own baseline row**; below that
floor the denominator is too small for a per-kLOC statistic to mean
anything.

### 6. Gaming: three planted diffs against all four metrics

Three real, planted single-file edits, each measured on the affected crate
before and after with the same four metrics (`four_metrics.py`, a thin
wrapper calling `comment_census.py --group none` and `--list-blocks` and
re-aggregating — no separate parser). Code was never touched in any of the
three; only comment text.

**A. Short guard deleted** — `crates/ocx_cli/src/options/completion.rs:38-40`,
a real 3-line plain guard from `sample.md` §5
("`interactive` is the caller's signal: the shim decides it and passes an
explicit flag, so the gate never depends on probing a stderr the shim may
have redirected"):

| | code | doc | line | ratio | char ratio | blocks>10/kLOC | lines->10/kLOC |
|---|---:|---:|---:|---:|---:|---:|---:|
| Before | 20,044 | 7,313 | 4,774 | 0.603 | 1.179 | 14.518 | 271.153 |
| After | 20,044 | 7,313 | 4,771 | 0.603 | 1.179 | **14.518** | **271.153** |

The block-length pair is bit-for-bit unchanged (3 lines never crossed the
10-line threshold). Ratio's true unrounded value moves from 0.60299 to
0.60284 — about 0.015 percentage points, invisible at the 3-decimal
reporting precision every other table in this program uses, and far below
any realistic per-PR ratchet step.

**B. Long guard deleted** — `crates/ocx_announce/src/forge/github.rs:791-829`,
a real 39-line doc-comment guard already labelled in `sample.md` §5
("Verify the credential may push a branch to `repo`, before anything is
written there" — removing it "lets GitHub's 404-for-unauthorized get
misread as fresh-fork provisioning race"):

| | code | doc | ratio | char ratio | blocks>10/kLOC | lines->10/kLOC |
|---|---:|---:|---:|---:|---:|---:|
| Before | 5,639 | 5,192 | 1.098 | 2.235 | 32.098 | 630.786 |
| After | 5,639 | 5,153 | 1.092 | 2.222 | 31.921 | 623.869 |

**C. Essay split** — `crates/ocx_cli/src/options/env_override.rs:61-117`, a
57-line contract doc comment (not labelled a guard; explains `--env`'s
grammar) collapsed in place to a 1-line pointer
(`/// Parse \`--env\` into entries; grammar in \`adr_env_override_grammar.md\`.`) —
the shape a genuine essay-split (routing-table dive) would leave behind if
the removed prose is real and relocated, not deleted:

| | code | doc | ratio | char ratio | blocks>10/kLOC | lines->10/kLOC |
|---|---:|---:|---:|---:|---:|---:|
| Before | 20,044 | 7,313 | 0.603 | 1.179 | 14.518 | 271.153 |
| After | 20,044 | 7,257 | 0.600 | 1.174 | 14.468 | 268.260 |

**B and C move all four metrics in the same direction by comparable
magnitude** (ratio −0.006/−0.003, char ratio −0.013/−0.005, blocks->10/kLOC
−0.177/−0.050, lines->10/kLOC −6.917/−2.893). A census run after the fact
cannot tell which one happened — deleting a real, load-bearing 39-line guard
and responsibly relocating a 57-line essay to a tracked ADR read identically
to every one of the four candidate metrics. This is the sharpest empirical
result in this dive: **the choice of metric does not solve the gaming
problem; every volume-based metric has this blind spot**, and case A shows
short-guard deletion has the opposite failure (invisible rather than
indistinguishable).

### 7. The carve-out: a recognizer check outside the numeric ratchet

Because §6 shows no metric can tell the two cases apart, the carve-out
cannot be a metric adjustment (e.g., "don't count blocks matching a guard
regex" would also stop counting them when they're genuinely deleted). It has
to be a second, independent check that runs on the diff itself:

1. For every comment block a diff removes or shrinks by more than half, run
   the guard-shape dive's recognizer (SAFETY-label, comparative-clause
   "X instead of Y breaks Z" wording, single-choke-point phrasing) against
   the block's *pre-diff* text.
2. If it scores as a guard, the diff must also add one of: a file-qualified
   pointer to a tracked record stating the same constraint (pointer-credit,
   pointer-form-and-check dive), a test whose name or assertion covers the
   described behaviour (tests-as-guards dive), or evidence the constraint
   moved into a compiler/lint-enforced form (`#[must_use]`, an exhaustive
   match, `typing.assert_never` — lint-owned-guards dive).
3. Absent all three, the diff fails this check — regardless of what the
   numeric ratchet in [§9](#9-reporting-format-arch-gos-compliance-level-and-revives-density-floor)
   reports, including when the numeric ratchet *improved*. Case B in §6
   is exactly a diff that improves every numeric metric while the carve-out
   must still reject it.

This check does not exist as a tool anywhere in the fleet today (same status
as pointer-check in the linkage wave); it is proposed here, not built.

### 8. Ambient matching: "match its comment density" and ocx's accelerating rate

Claude Code's current system prompt instructs: **"Write code that reads like
the surrounding code: match its comment density, naming, and idiom,"**
replacing an older, harder rule: **"In code: default to writing no
comments. Never write multi-paragraph docstrings or multi-line comment
blocks — one short line max"** ([charlesjones.dev, dated to the Opus 5
release, 2026-07-24](https://charlesjones.dev/blog/claude-opus-5-context-engineering-what-to-delete)).
A code-docs rule phrased as a fixed target ratio directly contradicts this:
an agent told to "match" a file already inflated to ocx's density is told,
by its own harness, to keep matching it.

Recomputing ocx's monthly replay as a *marginal* (new-code-only) rate rather
than a cumulative one tests whether this produces a runaway:

| Interval | Δ code | Δ lines in blocks>10 | marginal lines->10/kLOC of new code |
|---|---:|---:|---:|
| Apr→May | 4,110 | 712 | 173.24 |
| May→Jun | 9,029 | 3,532 | 391.18 |
| Jun→Jul | 2,339 | 1,699 | 726.38 |
| Jul→Aug | 15,386 | 6,236 | 405.30 |
| Aug→Sep | 27,340 | 15,355 | 561.63 |
| Sep→HEAD | 20,196 | 14,712 | 728.46 |

The marginal rate roughly quadruples from the earliest interval (173/kLOC)
to the most recent two (561-728/kLOC) — new code is arriving in long
comment blocks *faster* than the codebase's own already-inflated cumulative
average (461.586/kLOC at HEAD, [§4](#4-replaying-ocxs-last-6-months-four-candidate-metrics)),
which is itself 36x the human-app cumulative rate (0.64/kLOC,
`reference-corpus.md`). Compare this against the reference corpus's own
temporal check: H3 (`reference-corpus.md` "Head versus pre-2022") found a
median density shift of only **+0.005** across all 33 human repos from their
pre-2022 snapshot to 2026 HEAD — human-led repos show no comparable
acceleration over the same calendar period. The runaway measured in ocx is
consistent with self-reinforcement under an ambient "match the room"
instruction operating on a room whose density was already high; it is not a
2026-wide trend the reference corpus also shows.

**Resolution that does not contradict the prompt**: phrase the rule as
*"match idiom and naming freely; comment length is capped independent of the
surrounding file's own density."* An agent instructed to match "density"
has no way to know its file is already over a ratchet ceiling — that
determination belongs to a check, not a competing prompt instruction. The
rule should say explicitly that the length cap is not a stylistic
preference the "match the room" guidance overrides; it binds regardless of
what the surrounding file already contains, precisely because the
surrounding file is what a self-reinforcing loop would point to as
justification.

### 9. Reporting format: arch-go's compliance level and revive's density floor

Two shipped tools were fetched to see how comment/architecture volume gets
reported and gated elsewhere:

- **arch-go**'s compliance level is "how many packages in a module were
  evaluated by at least one rule," expressed as a percentage against a
  configured threshold (default 100%) — e.g. "if there are 4 rules and the
  module meets 3, compliance is 75%"
  ([arch-go README](https://github.com/arch-go/arch-go/blob/main/README.md)).
  This models *rule coverage*, not block length; it has no equivalent of a
  per-block cap.
- **revive**'s `comments-density` rule computes
  `comment lines / (code lines + comment lines) * 100` per file and fails
  under a configured minimum (default 0, i.e. disabled) — a **floor**, not a
  ceiling, aimed at under-commented Go code
  ([revive RULES_DESCRIPTIONS.md](https://raw.githubusercontent.com/mgechev/revive/master/RULES_DESCRIPTIONS.md)).
  It has no ceiling and no block-length dimension at all — it cannot express
  "this one block is too long," only "this file's overall ratio is too low."
- **PMD's `CommentSize`** is the one shipped tool with an actual
  per-block-length ceiling: default `maxLines=6`, `maxLineLength=80`
  ([PMD documentation rules, `CommentSize`](https://docs.pmd-code.org/latest/pmd_rules_java_documentation.html)).
  Its own issue tracker shows this dive's exact failure mode with no
  guard-aware exception: [pmd/pmd#1607](https://github.com/pmd/pmd/issues/1607)
  ("CommentSize triggers 'Too many lines' on method with several
  parameters") and [pmd/pmd#2265](https://github.com/pmd/pmd/issues/2265)
  ("Why CommentSize?") both report legitimate long comments flagged with no
  way to mark them as intentional.
- Clippy's `too_long_first_doc_paragraph` caps the *first paragraph* of a
  doc comment at 200 characters, not the whole block, because rustdoc reuses
  "everything before the first empty line" for search results and module
  overviews ([rust-clippy PR #12993](https://github.com/rust-lang/rust-clippy/pull/12993)).
  This is a different axis (summary-sentence dive's territory) from the
  whole-block cap this dive sets, but it is the shipped precedent for
  "cap only the render-visible slice, not the whole comment."

None of the four gives a ready-made design for a *ratchet* (a baseline that
tightens over time, per package). The closest prior art in this fleet is
ocx's own `scripts/lint_ratchet.py` (`/home/mherwig/dev/ocx/scripts/lint_ratchet.py`),
which already ratchets clippy diagnostic counts per crate with exactly the
asymmetry this dive needs: `--check` fails on any key above its baseline
entry (absent key = 0), a decrease passes with a notice, `--update` alone
writes decreases freely but refuses rises, and `--update --allow-regression`
is required to raise a key, printing every raised key on the way through.
The same shape applies directly to a comment-length ratchet: baseline keys
are `ocx_cli::lines_in_blocks_over_cap_per_kloc` (one key per package), `--check` recomputes and
compares, `--update`/`--allow-regression` follow the same rule. No fixed
target ratio ships in either tool or in this rule — see
[Decisions](#decisions-this-dive-proposes).

## Normative guidance candidates

1. **Plain comment blocks MUST NOT exceed 5 lines** (app-kind and
   library-kind packages alike), unless the block is recognized as a guard
   by the guard-shape recognizer or carries a file-qualified pointer whose
   local remainder alone is within cap.
   Rationale: 5 is the smallest of the tested candidates (3, 5, 8) that
   flags zero of the 39 hand-labelled human plain/doc guards; 3 (the
   corpus's own p90) flags 5 of them ([§1](#1-the-three-candidate-plain-caps-against-39-human-guards)).
   Verify: `python3 rules/code-docs/checks/comment_census.py --root
   crates/ocx_cli --scope prod --list-blocks --min-block 6 --kind line
   --format json | python3 -c "import json,sys;
   d=json.load(sys.stdin); sys.exit(1 if d else 0)"` — planted a 6-line
   plain block in a scratch copy of `ocx_cli/src/options/completion.rs` and
   confirmed the command reports it (exit 1, one entry).
   Severity: MUST (with the guard/pointer carve-out as the only exception).

2. **Doc comment blocks in an app-kind package MUST NOT exceed 10 lines;
   in a library-kind package, 15 lines** — same guard/pointer carve-out.
   Rationale: 10 is the smallest app-tier cap clearing both human doc
   guards found in the sample (rust-analyzer's 8-line FFI guard, an app
   repo); 15 sits just above the library p90 (13.5) rather than inside it,
   so the cap targets the long tail, not ordinary contract prose
   ([§2](#2-the-four-candidate-doc-caps-against-the-same-guards),
   [§3](#3-package-kind-changes-the-right-doc-cap-not-the-right-plain-cap)).
   Verify: `python3 rules/code-docs/checks/comment_census.py --root
   crates/ocx_cli --scope prod --list-blocks --min-block 11 --kind doc
   --format json` (app-kind; `--min-block 16` for library-kind) — the
   command must report zero blocks on a clean package; re-run after
   planting a violation to confirm it goes non-empty (done against a
   scratch copy of `ocx_cli`).
   Severity: MUST (with the guard/pointer carve-out).

3. **A package's block-length ratchet MUST be evaluated against a
   checked-in per-package baseline, never a single fleet-wide target
   ratio.** Baseline file keys `ocx_cli::lines_in_blocks_over_cap_per_kloc` (one key per package)
   (cap from rules 1-2, per register); `--check` fails any key that rose
   above its baseline entry (absent key reads as 0, matching
   `/home/mherwig/dev/ocx/scripts/lint_ratchet.py`'s own convention);
   `--update` writes decreases freely and requires `--update
   --allow-regression` (printing every raised key) to accept a rise.
   Rationale: sample.md already showed ocx cannot reach a fixed 1:4-1:6
   ratio even after cutting every sampled block to its non-recoverable
   minimum (implied floor 0.323-0.338) — a fixed target forces cutting real
   guards to hit the number, the exact failure H7 anticipated.
   Verify: a baseline JSON exists at a known repo path; `--check` exits
   non-zero when a scratch copy's block count is raised above the baseline
   entry, and exits 0 when it is lowered without `--allow-regression`
   (mirrors `lint_ratchet.py`'s own test shape,
   `/home/mherwig/dev/ocx/scripts/tests/test_lint_ratchet.py`).
   Severity: MUST.

4. **Packages under 500 prod code lines MUST NOT get an individual
   per-kLOC baseline row; they roll into a repo-level bucket instead.**
   Rationale: `ocx_schema` (35-275 lines across the six-month replay) swung
   14.5x on blocks->10/kLOC between two consecutive months from a single
   block's presence ([§5](#5-per-package-noise-floor-tiny-crates-make-per-kloc-metrics-unusable))
   — a per-kLOC statistic on that denominator is noise, and gating on it
   produces false alarms that erode trust in the whole ratchet.
   Verify: `python3 rules/code-docs/checks/comment_census.py --root
   crates/ocx_cli --scope prod --group none --format json | python3 -c
   "import json,sys; d=json.load(sys.stdin)['all|prod']; sys.exit(0 if
   d['code']>=500 else 1)"` gates whether a package is baseline-eligible.
   Severity: SHOULD (a project may lower the floor with evidence its own
   packages are large enough not to need it).

5. **A diff that removes or shrinks (by more than half) a comment block the
   guard-shape recognizer scores as a guard MUST also add a file-qualified
   pointer, a covering test, or evidence the constraint moved into a
   lint-owned form — independent of, and never satisfied by, an improving
   ratchet number.**
   Rationale: planted diffs show a genuine 39-line guard deletion
   (`ocx_announce/src/forge/github.rs:791-829`) and a genuine 57-line
   essay-split (`ocx_cli/src/options/env_override.rs:61-117`) move all four
   candidate metrics in the same direction by comparable magnitude
   ([§6](#6-gaming-three-planted-diffs-against-all-four-metrics)) — no
   numeric ratchet can tell them apart, so the check enforcing this rule
   must run outside the numeric comparison entirely.
   Verify: proposed, not built (same status as the linkage wave's
   pointer-check) — a diff-time script that runs the guard recognizer
   against every pre-image of a shrunk/removed block and greps the diff's
   added lines for a qualifying replacement; `git diff --unified=0
   -- 'crates/*' | ...` piped through the recognizer, directory-scoped, no
   bare glob outside quotes.
   Severity: MUST once the recognizer and check exist; CONSIDER until then
   (the guard-shape dive owns the recognizer's build).

6. **The code-docs rule MUST NOT state a target comment:code ratio as
   something to write toward.** It states caps (rules 1-2) and the ratchet
   (rule 3) as ceilings, and separately tells the agent to match the
   surrounding file's idiom and naming — never its length, because the
   surrounding file may already be over cap.
   Rationale: Claude Code's own system prompt instructs "match its comment
   density, naming, and idiom"
   ([charlesjones.dev](https://charlesjones.dev/blog/claude-opus-5-context-engineering-what-to-delete));
   a rule stating a target ratio competes with that instruction inside the
   same agent, and ocx's marginal long-block rate has already quadrupled
   over six months (173→728 lines->10/kLOC of new code,
   [§8](#8-ambient-matching-match-its-comment-density-and-ocxs-accelerating-rate))
   while the reference corpus's own human repos show only a +0.005 median
   shift over the same calendar window (H3) — the runaway is
   ambient-matching-shaped, not era-shaped.
   Verify: a reading heuristic on the shipped rule text — grep the rule
   file for a bare ratio target outside a reference table:
   `rg -n -e '1:[0-9]+' -e 'target ratio' -e 'aim for' rules/code-docs/`
   must return nothing outside the reference-corpus citation block.
   Severity: MUST.

## AI-agent angle

- **An agent asked to "shorten this file's comments" reaches for the
  category-uniform cut first** (delete everything under N lines, or delete
  every block matching a narration keyword), because that's the cheapest
  valid-looking diff. Case A in [§6](#6-gaming-three-planted-diffs-against-all-four-metrics)
  shows this cut is invisible to a block-length ratchet — it will pass
  clean while quietly deleting guards a human reviewer would never approve.
  The smallest mechanical check: run the guard recognizer against
  *everything the diff removes*, not just what remains; a check that only
  re-scans the post-diff file never sees what was deleted.
- **An agent under ratchet pressure will preferentially cut the longest
  blocks first**, because that's where the per-kLOC number moves fastest —
  and the longest blocks in this fleet are disproportionately guards
  (sample.md's own smell #1: guards buried in 20-40 line essays with
  "no way to grep for just the load-bearing sentence"). Case B confirms the
  incentive is real: deleting one 39-line guard moved every candidate
  metric favorably. The smallest mechanical check: sort a diff's removed
  blocks by length descending before running the recognizer, and require
  human sign-off (not just an automated pass) on any removal of the
  longest quartile until the recognizer's precision is separately measured
  (guard-shape dive owns that number).
- **An agent told to "match the surrounding file's density" (the current
  Claude Code system prompt) has no way to know the surrounding file is
  itself a ratchet violation** — it will read the file's existing 18-line
  doc blocks as the target, not the exception. The smallest mechanical
  check: the ratchet must be enforced by a check the agent's diff is
  measured against, never left to the agent's own read of "the room,"
  because [§8](#8-ambient-matching-match-its-comment-density-and-ocxs-accelerating-rate)
  shows exactly this loop producing acceleration, not equilibrium.
- **An agent asked to split an essay will often leave the original text in
  a new location wholesale (an ADR that is itself the essay verbatim)
  rather than compressing it**, satisfying "moved, not deleted" while
  adding no net reduction the ratchet can credit — and the routing-table
  dive's essay-split procedure, not this dive, owns verifying the moved
  text is actually shorter. The smallest mechanical check here: the
  pointer-credit half of rule 5 only counts if the *local* remainder is
  itself within cap; a 57-line block replaced by a 2-line local summary
  plus a 55-line pointer target earns credit only for the 2 local lines,
  never for the fact that 55 lines moved somewhere.

## Contested / evolving

- **Whether "match its comment density" is itself a good instruction is an
  open, live design question at the harness level, not settled by this
  dive.** The trend (Opus 5, 2026-07-24) is toward *fewer* explicit rules
  and more model judgment in the system prompt generally
  ([charlesjones.dev](https://charlesjones.dev/blog/claude-opus-5-context-engineering-what-to-delete));
  this dive's finding is narrower — that *whatever* the harness-level
  instruction says, a repo-level mechanical ceiling must sit outside it,
  because the instruction alone cannot see a ratchet baseline. That does
  not resolve whether "match density" is good general guidance; it only
  says a code-docs rule cannot rely on it to hold ocx's line.
- **Whether 500 lines is the right per-package size floor (rule 4) is a
  round number chosen from one crate's noise, not a swept threshold.** A
  wider sweep across more tiny fleet crates (not done here — out of this
  dive's scope) could sharpen it; 500 is defensible but not derived from a
  distribution.
- **Whether library doc cap should be 15 or 20 is close.** Cap 15 sits just
  above the library p90 (13.5) and flags 10.42% of the pooled library doc
  population; cap 20 is markedly looser (6.82%) with no additional guard
  headroom (max sampled library doc guard is 9 either way). This dive
  picked 15 for a tighter long-tail definition; a project whose
  library-kind packages carry unusually large generated or derive-macro
  doc surfaces might reasonably prefer 20 — this is a judgment call on
  where "long tail" starts, not a guard-safety line.

## Decisions this dive proposes

- **Caps per register and package kind**: plain 5 lines flat; doc 10 lines
  (app-kind), 15 lines (library-kind). Reason: smallest cap in each tested
  set that flags zero of the 39 human guards while still targeting each
  population's own long tail ([§1](#1-the-three-candidate-plain-caps-against-39-human-guards)-[§3](#3-package-kind-changes-the-right-doc-cap-not-the-right-plain-cap)).
- **The ratchet metric**: `lines_in_blocks_over_cap per kLOC`, per package,
  gated; ratio and char ratio remain reported, never gated. Reason:
  sample.md's own compression arithmetic shows ocx cannot hit a fixed ratio
  target without cutting guards, and this dive's planted diffs
  ([§6](#6-gaming-three-planted-diffs-against-all-four-metrics)) show the
  ratio moves on any deletion, guard or not, while the block-length metric
  at least targets the specific bloat census.md already measured (36x the
  human rate, concentrated in 25 of 636 files).
- **The baseline file format**: JSON, keyed
  `ocx_cli::lines_in_blocks_over_cap_per_kloc` (one key per package), one row per
  ratchet-eligible package (≥500 code lines), absent key = 0. Reason:
  reuses a format already proven in this exact fleet
  (`/home/mherwig/dev/ocx/scripts/lint_ratchet.py`) rather than inventing a
  second convention adopters must learn.
- **The diff-mode command**: `--check` (fail on any rise), `--update`
  (write decreases freely, refuse rises), `--update --allow-regression`
  (accept and print raised keys). Reason: the same asymmetry ocx's own
  clippy ratchet already uses, for the same stated reason — the command a
  red run reaches for should never also be the command that quietly loosens
  the gate.
- **The guard carve-out**: a separate diff-time recognizer check, never a
  metric exemption. Reason: §6's planted diffs prove no metric can
  distinguish a guard deletion from a responsible essay-split; only a check
  that inspects *what a diff removes*, not what a snapshot contains, can.
- **No fixed comment:code target ships anywhere in the rule.** Bands
  (reference-corpus.md's app/library table) ship as reference only; the
  per-package ratchet is the only gate. Reason: already decided in the
  topic map and reconfirmed here — a fixed target is unreachable for ocx
  without guard loss, and a target that competes with "match its comment
  density" fights the harness that will actually run the rule.

## Sources

| URL or path | What it is | Date/era | Why worth reading |
|---|---|---|---|
| `.agents/research/code-docs-audit/reference-corpus.md` | 33-repo human-baseline census (this program) | measured 2026-09-27 | Sets the plain/doc p90 and per-kind bands every cap in this dive is tested against |
| `.agents/research/code-docs-audit/census.md` | ocx/grimoire fleet census (this program) | measured 2026-09-27 | Source of the 36x block->10-line rate and the 25-of-636-files concentration this ratchet targets |
| `.agents/research/code-docs-audit/sample.md` | 320-block unbiased fleet sample, 100 labelled guards (this program) | measured 2026-09-27 | Source of guard B and essay-split C's real planted-diff source files; source of the "cannot reach 1:4-1:6" compression arithmetic |
| `.agents/research/code-docs-audit/human-sample.md` | 200-block human-baseline sample, 39 labelled guards (this program) | measured 2026-09-27 | Source of the exact guard lengths this dive's cap sweep is checked against |
| `~/.cache/research-lang/exemplars/code-docs/` (33 clones) + `.agents/research/code-docs-audit/exemplars.tsv` | reference-corpus source clones and SHA manifest | pinned SHAs, pre-2022 snapshots + one HEAD | The corpus this dive's own `--list-blocks` sweep ran over directly |
| `rules/code-docs/checks/comment_census.py` | the census/classification tool itself | this program, 2026-09-27 | Every number in this dive traces to this script's `classify()`/`blocks_of()`, never a separate parser |
| `/home/mherwig/dev/ocx` (git history, 6 monthly snapshots via `git archive`) | live fleet repo | commits 2026-03-31 through 2026-09-25 | Source of the metric-replay table and both real planted guards (github.rs, completion.rs, env_override.rs) |
| `/home/mherwig/dev/ocx/scripts/lint_ratchet.py` | ocx's existing clippy-diagnostic ratchet | current, this fleet | Baseline-file/`--check`/`--update`/`--allow-regression` design this dive's ratchet proposal reuses directly |
| [charlesjones.dev — "Anthropic Deleted 80% of Claude Code's System Prompt"](https://charlesjones.dev/blog/claude-opus-5-context-engineering-what-to-delete) | blog post quoting the current and prior Claude Code comment-density instructions | Opus 5 release, 2026-07-24 | Primary source for the exact "match its comment density, naming, and idiom" wording the ambient-matching finding is built on |
| [arch-go README](https://github.com/arch-go/arch-go/blob/main/README.md) | Go architecture-linter docs | current | Shows a shipped "compliance level" reporting model (rule coverage %) that this dive did not adopt, and why (no block-length dimension) |
| [revive RULES_DESCRIPTIONS.md — `comments-density`](https://raw.githubusercontent.com/mgechev/revive/master/RULES_DESCRIPTIONS.md) | Go linter rule docs | current (rule added v1.3.8) | Exact formula and default (floor, disabled by default) for the nearest shipped "comment ratio" lint |
| [PMD `CommentSize` rule docs](https://docs.pmd-code.org/latest/pmd_rules_java_documentation.html) | Java static-analysis rule docs | current | The one shipped tool with an actual per-block-length ceiling (maxLines=6); its own defaults are the direct precedent this dive's caps improve on |
| [pmd/pmd#1607](https://github.com/pmd/pmd/issues/1607) and [pmd/pmd#2265](https://github.com/pmd/pmd/issues/2265) | PMD issue tracker | filed against `CommentSize` | Documents, in a shipped tool, this dive's exact failure mode — a fixed cap with no guard-aware exception flags legitimate long comments |
| [rust-clippy PR #12993 — `too_long_first_doc_paragraph`](https://github.com/rust-lang/rust-clippy/pull/12993) | Clippy lint source PR | merged, current clippy | Precedent for capping only the render-visible slice (first paragraph, 200 chars) rather than the whole block — a different axis this dive notes but does not adopt |

---
title: bazel-adopt refresh decision, spillover round, 2026-11-27
target: bazel-adopt
date: 2026-11-27
model: opus
consolidates: /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/research/refresh-2026-11/bazel-adopt/spillover-check.md
---

# bazel-adopt refresh decision, spillover round

## Verdict

No change. The spillover check carried one item from the bazel-quality pair: bazel-diff is a Rust binary from v48.0.0, needs Bazel 8 or higher, and needs no JDK for the tool itself. A primary source confirms the item. The bazel-adopt skill is already correct, because no file under the skill names bazel-diff or states its version, runtime, Bazel floor or JDK need. The skill speaks of target selection only generically ("Both production tools document real false-negative classes") and defers target selection during adoption. Nothing in the skill is false on 2026-11-27, so the edit list is empty.

## Changed statements

None.

## New rules

None. No new step or rule ID is added, so no ID sequence moves.

## Declined

- Adding "Rust binary, Bazel 8 or higher, no JDK for the tool" to the target-selection passages in SKILL.md (anti-pattern 6) and references/cache-and-ci.md. Declined because the skill names no tool there and defers target selection, so the fact has no statement to correct. A competent model checks a tool's prerequisites when it adopts the tool. Add the fact only if a later edit names bazel-diff.

## Sources

- https://github.com/Tinder/bazel-diff/releases/tag/v48.0.0: release note "Remove the Kotlin implementation; the Rust CLI is now the only one" (#498); assets are prebuilt Rust binaries and a Bzlmod bazel_dep.
- https://raw.githubusercontent.com/Tinder/bazel-diff/master/README.md, fetched 2026-11-27: prerequisites "Bazel 8 or higher" and "Bazel needs a JDK; the bazel-diff binary does not."
- Verification in this round: a case-insensitive search of every file under skills/bazel-adopt/ for bazel-diff, bazel_diff, jdk, java and determinator returns no match.

## Revision log

- 2026-11-27, spillover round: one confirmed item, target already correct, no edits.

### Edit list (spillover round)

No edits.

---
title: bazel-adopt spillover check, 2026-11-27
target: bazel-adopt
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://github.com/Tinder/bazel-diff/releases/tag/v48.0.0
  - https://github.com/Tinder/bazel-diff/releases
  - https://raw.githubusercontent.com/Tinder/bazel-diff/master/README.md
---

# bazel-adopt spillover check

## Item 1 (from bazel-quality)

Item: "bazel-adopt (procedural skill): any bazel-diff guidance should treat it as a Rust binary with a Bazel 8 floor and no JDK, from v48.0.0."

Verdict: confirmed by primary source, and target already correct (it contains no bazel-diff guidance to correct).

Evidence in the originating pair: `.agents/research/refresh-2026-11/bazel-quality/bazel-lint-test-and-target-selection-tooling.md` (section 4.1, item 1, and row 10) and the decision file `.agents/research/refresh-2026-11/bazel-quality.md` (verdict point 6).

Primary sources:
- https://github.com/Tinder/bazel-diff/releases/tag/v48.0.0 (release page, dated 14 Sep; the page omits the year, the pair records 2026-09-14). Release note: "Remove the Kotlin implementation; the Rust CLI is now the only one" (#498). Assets are prebuilt Rust binaries and a Bzlmod `bazel_dep`.
- https://raw.githubusercontent.com/Tinder/bazel-diff/master/README.md (fetched 2026-11-27). Prerequisites: "Bazel 8 or higher (use the latest release for your major version)" and "Bazel needs a JDK; the `bazel-diff` binary does not."
- Nuance: Bazel itself still needs a JDK; only the bazel-diff binary does not. The item's "no JDK" holds for the tool only.

Affected text in the target: none. A search of every file under `/home/mherwig/dev/ocx-sh/grimoire-lore/skills/bazel-adopt/` for bazel-diff, bazel_diff, jdk, java and determinator finds no mention of the tool by name. The target speaks of target selection only generically, for example in `references/cache-and-ci.md`: "Both production tools document real false-negative classes." and in `SKILL.md`: "Both production tools document real false-negative classes; below the switch point the correctness risk is unpaid-for (BZL-CI-21, BZL-CI-22)." Neither states a bazel-diff version, runtime, Bazel floor or JDK need, so nothing is false on 2026-11-27.

Smallest change to make the target true on 2026-11-27: none. Optional only: if a later edit names bazel-diff, add "Rust binary, Bazel 8 or higher, no JDK for the tool" at that point. Do not add it now, since the skill defers target selection and this is a delta update.

---
title: bazel-diagnose spillover round, 2026-11 refresh
target: bazel-diagnose
date: 2026-11-27
model: opus
consolidates:
  - /home/mherwig/dev/ocx-sh/grimoire-lore/.agents/research/refresh-2026-11/bazel-diagnose/spillover-check.md
---

# bazel-diagnose spillover round

## Verdict

Both spillover items are confirmed by the Bazel 9.3.0 release notes (published 2026-10-07), which this round re-read on 2026-11-27. Both make text in the skill incomplete for a 9.3.0 or later pin, though not false for the 8.7.0 and 9.2.0 binaries it was measured on. The skill gets five changed statements, applied as seven small edits across three files. No rule or step ID changes, and no new rule is needed: both facts route to existing bazel-quality rules (BZL-CACHE-12 and BZL-TEST-28) that the first round of this refresh already updated for 9.3.0. Each added statement says it comes from the release notes and was not measured here, which matches how the first round worded BZL-CACHE-12.

## Changed statements

1. `references/outage-and-eviction.md`, "Rewind and its ceiling". Old: `--rewind_lost_inputs` has default `false`. New: the default is `false` through 9.2.0 and `true` from 9.3.0. A new bullet says that on 9.3.0 or later a lost-input failure reads as rewind exhausting its ceiling (`#21`), and that `--experimental_remote_cache_eviction_retries=0` on such a lane is the finding (BZL-CACHE-12), never a missing opt-in. Verification: read the default off the pinned binary with `bazel help build --long 2>&1 | grep -A2 -e 'rewind_lost_inputs'`. The flag renders there from 9.2.0. On 8.x it renders nowhere, and that is not absence (BZL-FLAG-11).
2. `references/outage-and-eviction.md`, error-text table. Old: the row for `Unexpected lost inputs (pass --rewind_lost_inputs to enable recovery)` names only "9.2.0, retries `0`". New: the row also says rewinding was off in that configuration (its default through 9.2.0), and that from 9.3.0 the line is expected only where an rc line turns rewinding off. The 9.3.0 part is inference from the new default and is marked as not measured. Verification: the existing eviction grep in that section, which already matches this text.
3. `SKILL.md`, step C.3. It gains one sentence: from 9.3.0 rewinding is on by default, so `retries=0` on such a pin is the rewind-on, retries-`0` configuration, and a lost-input failure is never a missing opt-in. Verification: the same `bazel help build --long` read as in item 1.
4. `references/flaky-test.md`, "The Bazel 8 to 9 boundary". Old: "Exactly one substantive change". New: "One substantive change at 9.0.0, plus the 9.3.0 run-time failure below". A new paragraph says that from 9.3.0 a test built for a target platform that no execution platform is compatible with builds and fails only at run time, so `bazel build` stays green. A test that fails only under `bazel test` on 9.3.0 or later is checked for its execution platform first (BZL-TEST-28). Verification: `bazel build //the:test` green and `bazel test //the:test` red on the same flags, then `bazel test //the:test --toolchain_resolution_debug='@bazel_tools//tools/test:default_test_toolchain_type'` to read which execution platforms were rejected.
5. `SKILL.md`, step E.2. It keeps "except for one thing", because the 9.3.0 change moves when that same toolchain requirement fails and is not a separate change. It adds that from 9.3.0 a missing execution platform for that toolchain no longer fails analysis, so a test that is red only under `bazel test` is checked for it first. Verification: the same pair of commands as in item 4.

## New rules

None. Both facts route to existing rules: BZL-CACHE-12 for the rewind default and BZL-TEST-28 for the run-time failure. The first round of this refresh updated both for 9.3.0 in `bazel-quality-reference`. The skill cites rules by ID and does not restate them.

## Declined

- Adding a 9.3.0 column to the "Flags removed at 9.0.0" table in `outage-and-eviction.md`. Nothing was measured on a 9.3.x binary, and the corrected rewind bullet already carries the new default. A column holding only release-note values would read as a measurement.
- Rewording the sentence "The tunable `--experimental_max_repeated_lost_inputs` exists only after 9.2.0 on `main`". The first round found the flag in 8.9.0 and 10.0 (PR 32354), but this spillover check did not raise or confirm it. Leave it for the next pair-level round of bazel-diagnose.
- Changing "byte-identical from 8.7.0 through 9.2.0" for `MAX_REPEATED_LOST_INPUTS`. It is still true as written, because it names its own version range.

## Sources

- https://github.com/bazelbuild/bazel/releases/tag/9.3.0 (published 2026-10-07, re-read on 2026-11-27). It says: "`--rewind_lost_inputs` is now enabled by default. Builds with BwoB automatically recover from remote cache eviction by rewinding actions that generated lost inputs." (PR 31416). It also says: "Test targets can now be built for a target platform that no execution platform is compatible with, e.g. to cross-compile them. Running such a test fails with an error at execution time instead of failing analysis." (PR 30946).

## Revision log

- 2026-11-27: spillover round from bazel-quality. Two items confirmed and applied as seven edits to five statements. No ID changes and no new IDs.

### Edit list (spillover round)

1. File: `skills/bazel-diagnose/references/outage-and-eviction.md`
   Find:
   ```
   - `--rewind_lost_inputs` — a separate, lower-level Skyframe mechanism, default
     `false`. Present and empirically functional on **8.7.0** despite rendering in
   ```
   Replace with:
   ```
   - `--rewind_lost_inputs` — a separate, lower-level Skyframe mechanism, default
     `false` through 9.2.0 and `true` from 9.3.0 (release notes, PR 31416; not
     measured here). Present and empirically functional on **8.7.0** despite rendering in
   ```

2. File: `skills/bazel-diagnose/references/outage-and-eviction.md`
   Insert after the anchor line:
   ```
     "the flag does not exist" (BZL-FLAG-11).
   ```
   Text to insert:
   ```
   - On 9.3.0 or later rewinding is on unless an rc line turns it off, and the
     release notes say a Build without the Bytes build recovers from an eviction
     through it. A lost-input failure there reads as rewind exhausting its
     ceiling (`#21`); a lane that also sets
     `--experimental_remote_cache_eviction_retries=0` has that setting as the
     finding (BZL-CACHE-12). Neither is a missing opt-in. Read the default off the
     pin: `bazel help build --long 2>&1 | grep -A2 -e 'rewind_lost_inputs'`. Not
     re-measured on 9.3.x.
   ```

3. File: `skills/bazel-diagnose/references/outage-and-eviction.md`
   Find:
   ```
   | `Unexpected lost inputs (pass --rewind_lost_inputs to enable recovery)` | 9.2.0, retries `0` |
   ```
   Replace with:
   ```
   | `Unexpected lost inputs (pass --rewind_lost_inputs to enable recovery)` | 9.2.0, retries `0`, rewinding off (its default through 9.2.0); from 9.3.0 expect it only where an rc line turns rewinding off (not measured) |
   ```

4. File: `skills/bazel-diagnose/SKILL.md`
   Find:
   ```
      the failure text reads `lost input too many times (#21)` (BZL-CACHE-12).
   ```
   Replace with:
   ```
      the failure text reads `lost input too many times (#21)` (BZL-CACHE-12).
      From 9.3.0 `--rewind_lost_inputs` defaults to `true` (release notes, not
      re-measured), so `retries=0` on such a pin is exactly the rewind-on,
      retries-`0` configuration, and a lost-input failure is never a missing opt-in.
   ```

5. File: `skills/bazel-diagnose/references/flaky-test.md`
   Find:
   ```
   Exactly one substantive change: 9.0.0 adds a mandatory **implicit toolchain
   ```
   Replace with:
   ```
   One substantive change at 9.0.0, plus the 9.3.0 run-time failure below: 9.0.0
   adds a mandatory **implicit toolchain
   ```

6. File: `skills/bazel-diagnose/references/flaky-test.md`
   Insert after the anchor line:
   ```
   watchable only through release notes.
   ```
   Text to insert (preceded by one blank line):
   ```

   From 9.3.0 a test built for a target platform that no execution platform is
   compatible with builds, and fails only when it runs (release notes, PR 30946;
   not measured here), so `bazel build` stays green. A test that fails only under
   `bazel test` on 9.3.0 or later: check its execution platform first
   (BZL-TEST-28). Confirm with `bazel build //the:test` green and
   `bazel test //the:test` red on the same flags, then read which execution
   platforms were rejected with
   `bazel test //the:test --toolchain_resolution_debug='@bazel_tools//tools/test:default_test_toolchain_type'`.
   ```

7. File: `skills/bazel-diagnose/SKILL.md`
   Find:
   ```
      `@bazel_tools//tools/test:default_test_toolchain_type` (BZL-TEST-28). Any
      other "Bazel 9 changed tests" claim is fabricated.
   ```
   Replace with:
   ```
      `@bazel_tools//tools/test:default_test_toolchain_type` (BZL-TEST-28). From
      9.3.0 a missing execution platform for that toolchain no longer fails
      analysis: `bazel build` stays green and the test fails only when it runs, so
      a test red only under `bazel test` checks it first. Any other
      "Bazel 9 changed tests" claim is fabricated.
   ```

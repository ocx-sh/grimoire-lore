---
title: bazel-diagnose spillover check from bazel-quality
target: bazel-diagnose
date_researched: 2026-11-27
model: sonnet
sources_fetched:
  - https://github.com/bazelbuild/bazel/releases/tag/9.3.0
---

Evidence in the originating pair: `bazel-quality.md` (the caching.md flag-surface line, BZL-CACHE-12 and BZL-TEST-28 entries) and `bazel-quality/bazel-core-releases-lts-and-flag-flips.md`.

## Item 1: --rewind_lost_inputs defaults on from 9.3.0

Verdict: confirmed by primary source.

Source: https://github.com/bazelbuild/bazel/releases/tag/9.3.0 (Release 9.3.0, 2026-10-07). It states: "`--rewind_lost_inputs` is now enabled by default." (PR 31416).

Affected text, `skills/bazel-diagnose/references/outage-and-eviction.md`:
> "`--rewind_lost_inputs` — a separate, lower-level Skyframe mechanism, default `false`."

and
> "The ceiling is **hard-coded**: `MAX_REPEATED_LOST_INPUTS = 20` in `ActionRewindStrategy.java`, byte-identical from 8.7.0 through 9.2.0."

The file's scope line says it was measured on 8.7.0 and 9.2.0, so the text is true for those versions but silent on 9.3.0 and later. The flag table (`--rewind_lost_inputs | present, false, undocumented | same | present, false, documented`) has no 9.3 column. Nothing in the skill says that on 9.3.0 or later a lost-input failure comes from rewind exhaustion (`lost input too many times (#21)`) or from `--experimental_remote_cache_eviction_retries=0`, not from a missing opt-in.

Smallest change: in the "Rewind and its ceiling" bullet, change "default `false`." to "default `false` through 9.2.0 and `true` from 9.3.0 (release notes, PR 31416; not measured here)." Add one sentence: "On 9.3.0 or later, a lost-input failure under `--remote_download_minimal` or `toplevel` is rewind exhaustion or retries `0`, not a missing opt-in." Also add "9.3.0 or later" to the "Unexpected lost inputs (pass --rewind_lost_inputs ...)" row note if it is kept, since that message presumably no longer applies with the default on (not verified on a binary).

## Item 2: a test with no compatible execution platform fails at run time from 9.3.0

Verdict: confirmed by primary source.

Source: https://github.com/bazelbuild/bazel/releases/tag/9.3.0 (2026-10-07), PR 30946. It says a test target may be built for a target platform that no execution platform is compatible with, and "Running such a test fails with an error at execution time instead of failing analysis."

Affected text, `skills/bazel-diagnose/references/flaky-test.md`, section "The Bazel 8 to 9 boundary":
> "Satisfy it by registering the test's target platform as an execution platform, or by shipping a custom toolchain for that type."

and
> "Exactly one substantive change: 9.0.0 adds a mandatory **implicit toolchain requirement** on `@bazel_tools//tools/test:default_test_toolchain_type`."

The skill treats the missing platform as an analysis-time requirement and does not say that from 9.3.0 `bazel build` succeeds and only `bazel test` fails. "Exactly one substantive change" is also stale for a 9.3 pin. Nothing routes a "fails only under `bazel test`" symptom to BZL-TEST-28; the only BZL-TEST-28 mention is the exec-group wording.

Smallest change: add to that section: "From 9.3.0 a test with no compatible execution platform builds and fails only when it runs, so `bazel build` stays green. A test that fails only under `bazel test` on 9.3 or later: check the execution platform first (BZL-TEST-28)." Reword "Exactly one substantive change" to "One substantive change at 9.0.0 (plus the 9.3.0 run-time failure below)".

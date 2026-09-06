---
title: "BZL-TEST — the test contract, sizing, sharding, flakiness, Starlark tests and coverage"
topic: bazel-testing
family: BZL-TEST
model: opus
consolidates:
  - bazel-testing/test-contract-sizing-and-flakiness.md
  - bazel-testing/testing-starlark-and-coverage.md
  - bazel-followups/coverage-across-rulesets-and-the-test-exec-group.md
  - bazel-followups/repository-rule-and-extension-offline-testing.md
  - bazel-followups/macos-windows-sandbox-and-runfiles-parity.md
  - bazel-measurements/sandbox-strategy-network-and-hermetic-sandbox-on-this-host.md
  - bazel-measurements/bazel9-gate-tags-visibility-and-flag-probes.md
grounded_in:
  - bazel-audit/config-inventory.md
  - bazel-audit/starlark-code-shape.md
  - bazel-audit/build-contracts-and-ci-posture.md
  - bazel-audit/fleet-bazel-readiness.md
  - bazel-topic-map.md ("How to read this", "Conflicts resolved", "The map" §E — 13 rows, "Staged for wave 3" §11)
  - bazel-frame.md (Corrections, waves 1, post-map, 2, 3a, 4a, 3b)
  - bazel-starlark-and-build.md (BZL-LARK ruleset, cross-referenced for de-duplication)
  - bazel-hermeticity-determinism.md (BZL-HERM ruleset, cross-referenced for de-duplication)
date: 2026-09-05
revised: 2026-09-06
revised_wave5: 2026-09-06
---

# BZL-TEST

## Verdict

The test contract is the most stable surface in the whole Bazel program and the one
this fleet has written down least. Both dives found the same shape: the facts are
normative and unchanging across the majors, and every failure in the family is a
*silent* one — a green test that proves nothing. The wave-4a follow-ups did not
overturn that shape; they moved four claims from argued to measured, corrected one
flag default the wave-3a dive got backwards, and turned two open questions into
documented gaps.

1. **Bazel 8 and Bazel 9 have the same test contract. Any 9-specific claim about
   size, timeout, sharding, tags or the environment invariants is fabricated.** The
   8.7.0 and 9.1.0 test-encyclopedia snapshots were diffed byte-for-byte and the only
   substantive addition is a new "Execution platform" section
   (`bazel-testing/test-contract-sizing-and-flakiness.md:238-240`). **Refined by the
   wave-4a follow-up, and the refinement matters:** the `test` exec group itself, and
   `test.<key>`-scoped `exec_properties`, are *not* new — both are documented at
   8.8.0's `exec-groups.md`. What is new at 9.0.0 is a mandatory *implicit toolchain
   requirement* on `@bazel_tools//tools/test:default_test_toolchain_type`. Verified
   directly for this revision: `tools/test/BUILD.tools` contains no
   `default_test_toolchain*` symbol at all at **8.7.0** (the fleet pin) or 8.8.0, and
   carries the toolchain plus `bool_flag(name = "incompatible_use_default_test_toolchain",
   build_setting_default = True)` at 9.0.0, 9.1.0 and 9.2.0 alike. So an agent
   describing "what changed for tests in Bazel 9" must name the toolchain requirement,
   never the exec group's existence. See BZL-TEST-28.
2. **Correction to an official Bazel doc, on source evidence.** The Build
   Encyclopedia's `shard_count` prose — "it will most likely run every test in every
   shard, which is not what you want" — is stale in both the 8.7.0 and 9.1.0
   snapshots. `StandaloneTestStrategy.java:709-724` throws `LOCAL_TEST_PREREQ_UNMET`
   and force-fails a shard that would otherwise have *passed* without touching
   `TEST_SHARD_STATUS_FILE`
   (`bazel-testing/test-contract-sizing-and-flakiness.md:103-134`). The
   test-encyclopedia ("normative and authoritative") agrees with the source, the
   attribute table does not. **We ship the source's behaviour and cite the
   test-encyclopedia, never the attribute prose.** Map row M-E-02 already had this
   right; the corpus correction is against `be/common-definitions`.
3. **Correction to the map: M-E-10's own check is a category error, and it is
   retired.** The row asks to "count `analysistest.make(` calls that target a
   production rule", and both the map and `bazel-audit/starlark-code-shape.md:272`
   frame `rules_ocx`'s four untested `repository_rule` `_impl`s as "zero
   `analysistest` coverage". `analysistest.make()` structurally *cannot* reach them:
   it injects a mandatory `target_under_test` label with an aspect attached, and a
   repository rule runs in the loading/fetch phase and produces a repository, not an
   analysable `Target` (`bazel-testing/testing-starlark-and-coverage.md:67-73,126-132`).
   The count is zero because it is impossible, not because anyone was lazy. **The
   replacement bar is BZL-TEST-15**: a `unittest.make()` orchestration test driven by
   a hand-rolled `repository_ctx` fake, asserting on the fake's recorded side effects.
   One nuance added by the wave-4a experiment: a *throwaway* `rule()` harness that
   calls the `_impl` directly **is** a legitimate `target_under_test`, and that is the
   verified route to the `_impl`'s own `fail()` paths (BZL-TEST-29) — the category
   error is pointing analysistest at the repository rule itself, not at a harness.
4. **`--flaky_test_attempts` is elevated to a MUST-shaped prohibition, above the
   dive's SHOULD.** `bazel-testing/test-contract-sizing-and-flakiness.md:142-152`
   establishes on normative sources plus a maintainer's own closing comment on
   [bazel#3783](https://github.com/bazelbuild/bazel/issues/3783) that both retry
   mechanisms stop at the first success — a 50%-flaky test "passes"
   `--flaky_test_attempts=10` roughly 100% of the time. An agent that recommends the
   flag for *detection* manufactures a false green, which is a correctness defect,
   not a style preference. Detection is `--runs_per_test=N
   --runs_per_test_detects_flakes`. **Pinned.**
5. **`size` stays SHOULD, and `rules_ocx`'s 78-of-84 defaulted-`medium` rate is
   accepted, not filed.** An unset `size` never breaks correctness; it moves local
   scheduling and the default timeout only
   (`bazel-testing/test-contract-sizing-and-flakiness.md:71-82,244-245`). Mandating an
   explicit `size` on 76 fake-`ctx` analysis tests that finish in milliseconds is
   busywork with no payoff. The MUST-shaped value sits one layer down, in the
   size/timeout-versus-measured-runtime check (BZL-TEST-02). **Pinned.**
6. **The tag taxonomy is written twice and never merged.** On a test or `genrule`,
   `tags` take effect unconditionally. On a Starlark action, the same strings arrive
   only through `execution_requirements`, or by copy-through gated on
   `--incompatible_allow_tags_propagation` (default `true` in both 8.7.0 and 9.1.0),
   filtered to a fixed prefix allowlist, merged `putIfAbsent` so an explicit key
   always wins, and target-wide so one `tags` list cannot express different needs for
   different actions of the same rule (`TargetUtils.java:50-60,262-291`, read in
   `bazel-testing/test-contract-sizing-and-flakiness.md:183-205`). A single merged
   table would be wrong in both directions. The cache-side half of that taxonomy is
   now *measured* rather than read — see verdict 16.
7. **Coverage is the one half of this family with a real version boundary, and it is
   exactly one flag.** `--combined_report` flipped `none` → `lcov` in commit
   `b6fd304b`, landing in **9.0.0** — verified against `BazelCoverageReportModule.java`
   at the 8.8.0 and 9.2.0 tags, not inferred from prose
   (`bazel-testing/testing-starlark-and-coverage.md:146-166`). A CI matrix spanning
   both majors produces a merged report on the 9.x leg and none on the 8.x leg unless
   the flag is explicit. Every other coverage flag is unchanged across 8 and 9.
   **Correction, wave 4a:** the wave-3a dive claimed
   `--experimental_split_coverage_postprocessing` and
   `--experimental_fetch_all_coverage_outputs` "default `true`". Both default
   **`false`** — read from the `@Option` annotations in `TestConfiguration.java` at
   **8.7.0** (re-read directly for this revision), 8.8.0 and 9.2.0. That correction
   strengthens verdict 14 rather than weakening it: by default the collector runs in
   the test's own spawn. `--instrumentation_filter`'s static default is likewise
   byte-identical (`-/javatests[/:],-/test/java[/:]`) at 8.7.0 and 9.2.0.
8. **Coverage failure is silent by construction, at three separate layers.** The test
   still reports PASS when the report is empty; `bazel coverage` still exits 0; and
   Bazel's own `test-encyclopedia` contains zero mentions of coverage
   (`bazel-testing/testing-starlark-and-coverage.md:178-198`). Every coverage rule
   here therefore carries its own explicit artifact check; none may lean on an exit
   code. **Wave 4a adds the differential diagnosis:** four distinct root causes now
   produce the identical silent-empty symptom — a filter that matched nothing
   (BZL-TEST-22), no runfiles tree on Windows for a ruleset that needs one
   (BZL-TEST-24), no bundled `coverage` wheel for the resolved Python interpreter
   (BZL-TEST-26), and clang emitting raw `.profdata` the LCOV merger cannot read
   (BZL-TEST-27). "The report is empty, so fix the filter" is wrong three times out of
   four. The check that separates them is the `DA:` record count (BZL-TEST-25).
9. **Three rules this group derived are ceded to `BZL-LARK`, which landed during this
   consolidation and states them at least as strongly.** The `expect_failure`
   vacuous-pass rule — grounded here in `bazel-skylib 1.9.0 lib/unittest.bzl` L541-560,
   where `asserts.expect_failure` is a plain `actual_errors.find(msg) < 0` over
   concatenated cause messages that include each frame's echoed source line
   (`bazel-testing/testing-starlark-and-coverage.md:75-104`) — is **BZL-LARK-24**,
   which already merges both halves (the unspellable constant *and* the seen-red
   drill). Requiring an integration test that builds a target out of a
   string-generated repository is **BZL-LARK-25**, whose formulation is stricter
   (it also demands the test run on push, not on a schedule). The general
   `visibility()` load-gate on `private/` files is **BZL-LARK-13**. This group keeps
   only the clause BZL-LARK-13 does not carry — that the allowlist must name the test
   package (BZL-TEST-17) — because without it the offline technique BZL-TEST-15
   requires cannot `load()` the `_impl` at all. M-E-11 is settled jointly by
   BZL-LARK-24 and BZL-TEST-18/19.
10. **Where the two dives disagree on a measured fleet number, the audit wins and the
    dive is corrected.** `testing-starlark-and-coverage.md:259` splits the 34
    data-driven cases as 9 + 25; `bazel-audit/starlark-code-shape.md:173` splits them
    16 + 18. Re-measured directly against the checkout:
    `_MALFORMED_CLOSURE_REPORTS` 12, `_MALFORMED_CLOSURE_CONTAINERS` 4 (merged into
    one report dict at `ocx/tests/launcher_test.bzl:1563-1564`), `_GUARD_CASES` 18 —
    16 + 18, total 34. The audit's split is correct. The total both dives report is
    unaffected, and no rule depends on the split.
11. **Rejected: `rules_testing` as a recommendation.** v0.9.0 (2025-08-06) wraps the
    identical `AnalysisFailureInfo`/`analysis_test_transition` machinery behind Truth-
    style matchers — confirmed by reading its source, and adopted as a dev-dependency
    inside `bazelbuild/bazel`, `bazel-skylib`, `rules_cc` and `rules_java`
    (`bazel-testing/testing-starlark-and-coverage.md:200-204`). It is a readability
    upgrade, not a capability one, and it does not touch the repository-rule gap. A
    rule that adds a dependency for better failure messages does not earn a row.
12. **The whole coverage subgroup binds shape F only, and the fleet cannot exhibit any
    of it.** Zero coverage configuration exists anywhere in `rules_ocx` — re-measured
    2026-09-05, matching `testing-starlark-and-coverage.md:261`. That is a "not
    configured" reading, not a "silently broken" one, and it is why BZL-TEST-22
    through BZL-TEST-27 ship dated to their ruleset versions rather than to fleet
    evidence.
13. **The repository-rule invocation core cannot be reached offline on either major.
    Measured, not argued — and the error text differs by major.** The wave-4a
    experiment ran the decisive case on real Bazel 8.7.0 and 9.2.0: calling a
    `repository_rule` symbol from a plain Starlark function fails identically whether
    the call site is loading-phase BUILD top level *or* inside an analysis-phase
    `rule()` harness. It is a Skyframe-phase gate, not a call-stack or ctx-shape
    check, and no Starlark-side trick dodges it. 8.7.0 says `repository rules can only
    be used while evaluating a WORKSPACE file`; 9.2.0 says `repo rules can only be
    called from within module extension impl functions`. **A CI-log or runbook grep
    written against one major's wording silently misses the other's** — match on
    `Error in repository_rule:` alone. In every failing case the fake ctx was consumed
    without complaint right up to the instantiation line, so a "better fake" is never
    the fix. This closes BZL-TEST-16's open question in favour of confirmed, and
    promotes its severity. The complementary finding: a repository rule's *own*
    `fail()` path **is** reachable offline, through a throwaway `rule()` harness driven
    by `analysistest.make(expect_failure = True)` (BZL-TEST-29) — verified passing on
    both majors, with a negative control showing a bare `unittest.make()` cannot do it
    (an uncaught `fail()` aborts that target's analysis: no PASS, no FAIL, and
    `bazel test` reports "No test targets were found, yet testing was requested").
14. **Coverage's budget interaction is a Bazel-core property, not a rules_js detail —
    settled from source, at both majors.** `collect_coverage.sh`
    (`@bazel_tools//tools/test:collect_coverage`) is the process Bazel substitutes for
    the test binary whenever a rule's `InstrumentedFilesInfo` turns on
    `collectCodeCoverage`, and that wiring in `TestActionBuilder.java` is
    ruleset-agnostic. With `--experimental_split_coverage_postprocessing` at its real
    default (`false`, verified at 8.7.0/8.8.0/9.2.0), the test binary and the
    `$LCOV_MERGER` invocation run in **one spawn**, sharing that test's `TIMEOUT`
    execution requirement; even in split mode the second spawn stays inside the same
    `TestRunnerAction` and can independently produce `BlazeTestStatus.TIMEOUT`. So
    BZL-TEST-02's coverage clause is a Bazel fact for every language, not a
    generalisation from one ruleset's docs — rules_js is simply the only ruleset that
    wrote it down. The *combined* report (`_coverage/_coverage_report.dat`) is a
    different action (`CoverageReportActionBuilder`), run once after all tests finish,
    and is **not** inside any single test's budget; conflating the two leads to
    budgeting the wrong thing.
15. **The dangerous `--instrumentation_filter` default is the one that is computed,
    not the one that is documented.** When the flag is unset, `bazel coverage` does
    not run with the documented static default: it calls
    `InstrumentationFilterSupport.computeInstrumentationFilter()`, which derives a
    positive filter from the **packages of the test targets named on the command
    line** — verified present with identical logic at 8.7.0 and 9.2.0 for this
    revision. A repo laid out as `//lib/foo` (implementation) plus `//tests/foo`
    (test) gets a filter anchored at the *test's* package and instruments none of the
    library. Bazel prints the value it chose — `INFO: Using default value for
    --instrumentation_filter: "..."` — and that INFO line is the cheapest available
    ground truth. This mechanism is orthogonal to, and far more common than, the
    static two-Java-exclusions default, and it hits every language.
16. **The cache-side tag semantics are now measured, and one pair is not what the
    attribute table implies.** The wave-2 measurement built tagged genrules twice
    against a warm `--disk_cache`, cross-read against
    `--execution_log_json_file`'s `cacheable`/`remotable`/`runner` fields, identically
    on 8.7.0 and 9.2.0: `no-sandbox` forces the `local` runner but stays
    disk-cacheable and **hits** on rebuild; `local` forces the same runner *and* marks
    the action `cacheable:false`, so it **re-executes every build**. `no-remote-cache`
    and `no-remote` leave the disk cache untouched (both hit); `no-cache` misses.
    `--sandbox_default_allow_network=false` genuinely blocks the network under
    `linux-sandbox`, `requires-network` correctly overrides the block while staying
    sandboxed, and `no-sandbox` makes the flag a no-op by routing to `local`.
    **Wave 5 closed the last two tags, and the disk cache turned out to be the wrong
    instrument for both.** `no-remote-cache-upload` suppresses exactly one wire
    operation against a real HTTP remote cache — the `PUT /ac/<digest>` result mapping
    never arrives — while that same action's `PUT /cas/` content blobs upload like
    every other action's. `external` has **zero observable effect on a plain build
    action**: it is test-only, and against its real target (`bazel test
    --cache_test_results=yes`, run twice with no source change) the tagged `sh_test`
    re-executes every invocation while its untagged sibling reports `(cached)`.
    Against `--disk_cache` alone both tags are indistinguishable from the default row,
    and the execution log's `cacheable`/`remotable` fields describe the action's own
    *eligibility*, never whether an endpoint received a PUT — so a disk-cache-only
    probe of either tag reads **blind**, never "confirmed"
    (`bazel9-gate-tags-visibility-and-flag-probes.md` Q2). **[WSL2 caveat]** all of
    these runs are from one WSL2 workstation, not a CI runner; the
    `cacheable`/`remotable` fields are Bazel-internal and not host-shaped, but the
    numbers were not reproduced on a second host. The `requires-network` /
    `no-sandbox` rows now hold byte-identically on 9.2.0 as well as 8.7.0.
17. **Documented gap: Windows coverage for `py_test` and `rust_test` cannot be settled
    from documentation, and this program has no Windows runner.** This was an open
    question; the follow-up closed it as a gap with three named parts. (a) rules_js
    3.4.1 remains the *only* ruleset that documents the failure, with exact log text.
    (b) rules_python solved it for itself ahead of the flag: since **1.9.0**
    (2026-02-21) `py_binary`/`py_test` force `--enable_runfiles=true` on Windows
    through a rule-level transition, overridable via the
    `@rules_python//command_line_option:enable_runfiles` config setting, and the
    changelog warns the forced value "will soon become required" — so an absent
    `--enable_runfiles` in a Python-only Windows leg is **not** a finding, and
    BZL-TEST-24's grep alone would false-positive there. (c) rules_rust 0.74.0 does
    not merely omit Windows from its coverage doc: its own index disclaims Windows
    support fleet-wide ("we do not have sufficient maintainer expertise… we have had
    to disable many tests in CI"). Its `collect_coverage.rs` does carry a
    runfiles-optional fallback that derives the test binary's path from
    `COVERAGE_DIR`'s `bazel-out/<config>` prefix, exercised today only for split
    post-processing — plausible from source, confirmed by nothing. So `rust_test`
    coverage on Windows is **unverified by upstream**, not merely unchecked here.
    Closing this needs one `bazel coverage` run of a trivial `py_test` and `rust_test`
    on a real Windows executor, with and without `--enable_runfiles`.
18. **Documented gap: two removals with intent and no date, and one library with no
    declared floor.** The legacy test toolchain
    (`--@bazel_tools//tools/test:incompatible_use_default_test_toolchain=false`) is
    marked in the 9.x test-encyclopedia as "expect this option to be unavailable in a
    future Bazel release" — no version, and no tracking issue linked from either the
    doc or the `bool_flag` definition. Nothing to watch but the release notes.
    Separately, `rules_bazel_integration_test` v0.37.1 (2026-01-31) declares **no
    `bazel_compatibility` field at all**, and never has: its Bazel-9.2 usability rests
    on its own dogfood `.bazelversion` moving 9.0.0 → 9.2.0 (2026-07-14) with no new
    release cut, plus one real consumer (rules_python's `bzlmod_lockfile_test` pinned
    at `bazel_versions = ["9.1.0"]`). Its BCR presubmit still declares `bazel:
    [8.2.1]` only. This closes the "version floor" open question with a fact, not a
    number: **there is no floor to pin against; pin the library version and test the
    Bazel version you actually run.**
19. **The ecosystem baseline for offline extension testing is near zero, which
    reframes the fleet's gap.** Of eight surveyed rulesets, **six** — rules_rust
    (crate_universe included), rules_go, rules_oci, rules_nixpkgs, toolchains_llvm and
    bazel-lib — ship *zero* offline ctx-fake tests of any kind and rest entirely on
    networked integration or e2e jobs. `bazel-skylib` 1.9.0, the library everyone
    imports for `unittest`/`analysistest`, ships **no** `repository_ctx`/`module_ctx`
    mock helper, so every ruleset that fakes a ctx has independently reinvented one in
    a different shape. Exactly one ruleset does better: **rules_python 2.3.3**, with a
    shared, versioned, self-tested mock library (`tests/support/mocks/mocks.bzl`,
    `mocks.rctx()` and `mocks.mctx()`) used from six-plus test files, and a module
    extension split into a pure `parse_modules(module_ctx) -> mods` decision function
    that is unit-tested directly plus a thin, untestable-by-design invoking tail.
    `rules_ocx`'s three hand-rolled fakes already put it ahead of the ecosystem
    median; its 0-of-4 orchestration gap is completable work, not a below-average
    start. BZL-TEST-30 and BZL-TEST-31 codify rules_python's two upgrades, and
    crate_universe is named as the counter-example an agent must not pattern-match
    against.

## The ruleset

**This topic owns `BZL-TEST` exclusively.** Thirty-two rules, nineteen MUST. Rows are
grouped by the check that catches them: 01-03 by one `bazel query` plus one
verbose-timeout run; 08-09 by one tag grep; 10-11 by the `manual` diff; 12-13 by one
read of the test sources; 14-20 and 29-32 by the Starlark-test read; 22-27 by the
coverage config read; 28 by the platform/toolchain read. Rules marked **pinned** fix a
project decision rather than report a fact.

**Every grep-based verification below is blind to BUILD and `.bzl` text generated as a
string inside a `repository_rule` or `module_extension`.** buildifier, stardoc and grep
all stop at the string literal (frame Correction 9, wave 2). A defect inside generated
repo content is `BZL-LARK-25`'s integration test to catch, never a grep's; an EMPTY grep
says nothing about it in either direction.

**Cited, not restated** — these belong to sibling families and are not duplicated here:
[`BZL-LARK-24`](bazel-starlark-and-build.md) (the `expect_failure` unspellable-constant
rule and the seen-red drill, settling M-A-19 and the analysistest half of M-E-11),
[`BZL-LARK-25`/`BZL-LARK-26`](bazel-starlark-and-build.md) (an integration test that
builds a target out of a string-generated repository, and `render_*` helpers piped
through `buildifier -mode=check`), [`BZL-LARK-13`](bazel-starlark-and-build.md) (the
`visibility()` load-gate itself — BZL-TEST-17 adds only the test-package clause),
[`BZL-HERM-02`](bazel-hermeticity-determinism.md) (setting
`--sandbox_default_allow_network=false` for the build, which is the flag half of what
BZL-TEST-09 tags), and [`BZL-HERM-21`](bazel-hermeticity-determinism.md) (never tagging
a `diff_test`/`write_source_files` target `manual`, the one exception BZL-TEST-11's
fixture carve-out must not be read to permit).

| ID | Rule | Rationale | Verification (and how EMPTY reads) | Severity | Applies to | Settles |
|---|---|---|---|---|---|---|
| **BZL-TEST-01** *(pinned)* | Declare `size` explicitly on any test whose real cost is not `medium`, and treat a defaulted `medium` on a millisecond analysis-phase test as accepted rather than as a defect. | `size` sets RAM (20/100/300/800 MB), always exactly 1 CPU, and the default timeout; a silent `medium` on a genuinely heavy test over-schedules the local machine, while mandating it on fake-`ctx` unit tests buys nothing (`test-contract-sizing-and-flakiness.md:71-82,244-245`). | `bazel query 'attr(size, "medium", tests(//...))'` — lists every test whose *effective* size is medium, defaulted or explicit; review each against its real cost. EMPTY = PASS (no medium-sized tests to review; not proof of correctness). | SHOULD | Bazel 8, 9 (table byte-identical 8.7.0↔9.1.0); shapes all | M-E-01 |
| **BZL-TEST-02** | Re-check declared `size`/`timeout` against measured runtime whenever a test's cost changes materially, and re-check it under `bazel coverage` before adding a coverage leg — for **every** language, not just the ones whose rulesets document it. | A too-tight budget flakes CI and a too-loose one reserves executor slots that go unused. The coverage half is a Bazel-core property, not a ruleset detail: `TestActionBuilder` substitutes `@bazel_tools//tools/test:collect_coverage` for the test binary, and with `--experimental_split_coverage_postprocessing` at its real default (`false` at 8.7.0, 8.8.0 and 9.2.0) the test and the `$LCOV_MERGER` run in one spawn under one `TIMEOUT`; in split mode the second spawn still lives in the same `TestRunnerAction` and can time out on its own. Post-processing scales with instrumented-file count, so a test that passes `bazel test` can time out under `bazel coverage` with no code change. The *combined* report is a separate, unbudgeted action — do not size for it (`coverage-across-rulesets-and-the-test-exec-group.md` Answer 1; `test-contract-sizing-and-flakiness.md:84-97`). | `bazel test --test_verbose_timeout_warnings //...`, read stderr for a size/timeout-mismatch warning; then `bazel coverage //target` once and confirm it lands well inside the declared timeout. EMPTY (no warning) = PASS. | SHOULD | Bazel 8, 9 — coverage clause confirmed Bazel-wide from `TestActionBuilder`/`StandaloneTestStrategy`/`collect_coverage.sh` at 8.8.0 and 9.2.0, flag defaults re-read at 8.7.0; shapes all | M-E-01, M-E-13 (part) |
| **BZL-TEST-03** | Add the `cpu:n` tag — never a larger `size` — when a test needs more than one core. | Every size class reserves exactly 1 CPU; bumping `size` for parallelism buys no cores and silently changes the RAM reservation and default timeout instead (`test-contract-sizing-and-flakiness.md:99-101`). | Reading heuristic: grep the test harness/binary for an internal thread pool or a `-j`-style flag; each hit must carry a matching `cpu:n` tag. EMPTY (no internally parallel test) = PASS. | CONSIDER | Bazel 8, 9; shapes F | M-E-01 |
| **BZL-TEST-04** | Add `shard_count` only after confirming the runner touches `TEST_SHARD_STATUS_FILE`, and describe a shard-unaware runner's failure as a hard `LOCAL_TEST_PREREQ_UNMET` — never as "silently runs every test in every shard". | Bazel force-fails a shard that would otherwise have passed but left the status file untouched; the `be/common-definitions` prose claiming a silent whole-suite rerun is stale against `StandaloneTestStrategy.java:709-724` in both majors, and the override fires only on a would-be pass, so it can hide behind unrelated shard failures (`test-contract-sizing-and-flakiness.md:103-134`). | `bazel test --test_sharding_strategy=forced=2 //path:target 2>&1 \| grep -i "did not advertise support for it by touching"`. A MATCH is the finding. EMPTY = PASS (runner supports sharding, or the target is unsharded). | MUST | Bazel 8, 9 (source-identical); shapes F | M-E-02 |
| **BZL-TEST-05** *(pinned)* | Never set `flaky = True`, or a target-scoped `--flaky_test_attempts`, without an adjoining comment naming the root cause and linking a tracking issue. | The attribute passes on the first of up to three successes and turns a genuine intermittent bug into silence; the Build Encyclopedia itself calls it "generally discouraged". A bare `flaky = True` with no comment is the finding — the attribute's mere presence is not (`test-contract-sizing-and-flakiness.md:136-140,247-248`). | `grep -rn 'flaky[[:space:]]*=[[:space:]]*True' --include=BUILD.bazel --include=BUILD --include='*.bzl' .`, then read each hit for a linked cause. EMPTY = PASS (no `flaky` targets exist). | SHOULD | Bazel 8, 9; shapes F | M-E-03 |
| **BZL-TEST-06** *(pinned)* | Detect a suspected flake with `--runs_per_test=N --runs_per_test_detects_flakes`; never name `--flaky_test_attempts` or `flaky = True` as a detection tool. | Both retry mechanisms stop at the first success and skip the remaining attempts, so a 50%-flaky test "passes" `--flaky_test_attempts=10` ~100% of the time — they mask, they do not measure. `--flaky_test_attempts=default` grants three attempts only to targets already carrying `flaky = True`, one to everything else (`test-contract-sizing-and-flakiness.md:142-152,340-343`; [bazel#3783](https://github.com/bazelbuild/bazel/issues/3783)). | Reading heuristic: any runbook, CI step or agent answer naming `--flaky_test_attempts` as the way to *find* a flake, unpaired with `--runs_per_test_detects_flakes`, is the finding. EMPTY = PASS. | MUST | Bazel 8, 9; shapes F | M-E-04, M-E-03 |
| **BZL-TEST-07** | Set `execution_requirements` on each `ctx.actions.*` call that needs a sandbox, cache or remote exception — never rely on the target's `tags` reaching the action, and never expect one `tags` list to express different needs for different actions of the same rule. | On a test or `genrule` the tags apply unconditionally; on a Starlark action they arrive only via `--incompatible_allow_tags_propagation` (default `true` in 8.7.0 and 9.1.0), only for a fixed prefix allowlist (`no-`, `requires-`, `block-`, `supports-`, `disable-`, `cpu:`, `resources:`, `local`, worker key), only `putIfAbsent` — so an explicit key always wins — and `getExecutionInfo` returns one target-wide map every action shares (`test-contract-sizing-and-flakiness.md:183-205`; `TargetUtils.java:50-60,262-291`). | `grep -rn 'incompatible_allow_tags_propagation' .bazelrc*` (EMPTY = flag at its default `true`) **and** grep the rule's `.bzl` for a hardcoded `execution_requirements = {` that could shadow the intended tag. EMPTY on both = PASS. | SHOULD | Bazel 8, 9; shapes A, F | M-E-08 |
| **BZL-TEST-08** | Never treat `no-remote-cache`/`no-remote-cache-upload`, `external`/`requires-network`, or `no-sandbox`/`local` as interchangeable pairs. | **All three pairs are measured, none read.** `no-remote-cache` kills read *and* write; `no-remote-cache-upload` kills only the write, and only half of that — against a real HTTP remote cache it suppresses exactly the `PUT /ac/<digest>` result mapping while the same action's `PUT /cas/` content blobs still upload — so the wrong one either forfeits every cache hit or keeps advertising results that should never have been written. `external` is **test-only**: on a plain build action (a genrule) it has *no observable effect at all*, and on a `bazel test --cache_test_results=yes` it makes the tagged test re-execute every invocation while its untagged sibling reports `(cached)`; it says nothing about network. `requires-network` overrides sandbox network denial only. `no-sandbox` and `local` both force the `local` runner, but `no-sandbox` leaves the action `cacheable:true` and it **hits** the disk cache on rebuild, while `local` sets `cacheable:false` and the action **re-executes every build** — the attribute table's "`local` ≡ no remote cache + no remote exec + no sandbox" understates it by the whole local-cache half (`sandbox-strategy-network-and-hermetic-sandbox-on-this-host.md` Q6; `bazel9-gate-tags-visibility-and-flag-probes.md` Q2; `test-contract-sizing-and-flakiness.md:207-209,234-236`). | `grep -rn '"no-remote-cache"\|"no-remote-cache-upload"\|"external"\|"requires-network"\|"no-sandbox"\|"local"' --include=BUILD.bazel --include=BUILD --include='*.bzl' .`, then read each hit's intent against the six definitions. EMPTY = PASS (none present, nothing to confuse). To *prove* one of the two remote-cache-shaped tags rather than read it, use the instrument that can see it: for `no-remote-cache-upload`, a real remote-cache endpoint's request log (its action's `PUT /ac/` is absent while its `PUT /cas/` blobs arrive); for `external`, `bazel test --cache_test_results=yes` run twice with no source change (the tagged test must *not* report `(cached)`). A `--disk_cache`-only run, and the `--execution_log_json_file` `cacheable`/`remotable` fields, are structurally blind to both — an EMPTY difference there reads "wrong instrument", never "the tag did nothing". | MUST | Bazel 8, 9 — all three pairs measured on 8.7.0 and 9.2.0, on one **WSL2** host under `linux-sandbox`, not reproduced on a CI runner; shapes F | M-E-09, M-E-08 |
| **BZL-TEST-09** | Tag a test `requires-network` when the test *action itself* reaches the network, and do not tag one whose only network use happened in a repository rule's fetch. | `--sandbox_default_allow_network` defaults `true` in both majors, so an untagged network-touching test passes today by flag default rather than declared intent and breaks the instant a stricter sandbox or RBE arrives. Measured on this host: with the flag false, `linux-sandbox` genuinely blocks (`NONET`), `requires-network` correctly restores access while staying sandboxed, and `no-sandbox` routes the action to `local`, where the flag has no namespace to revoke and the network comes back. The tag is a no-op under `local`/`standalone` and it never governs the separate, unsandboxed fetch phase — `--sandbox_default_allow_network=false` cannot reach a repository rule at all (frame Correction, wave 3b §5) (`test-contract-sizing-and-flakiness.md:230-232,320-323`; `sandbox-strategy-network-and-hermetic-sandbox-on-this-host.md` Q3). See `BZL-HERM-02` for the build-level flag that makes this tag load-bearing. | For every test whose sources or harness makes a live call at execution time (`curl`, a registry hostname, a socket connect), confirm the tag; for a test merely consuming an already-fetched external repo's runfiles, confirm no tag was added. A missing tag on a network-executing test is a FINDING; an absent tag on a fetch-only consumer = PASS. | MUST | Bazel 8, 9 (flag default identical); enforcement measured under `linux-sandbox` on a **WSL2** host, the `requires-network`/`no-sandbox` rows byte-identical on 8.7.0 and 9.2.0; shapes F | M-E-06 |
| **BZL-TEST-10** | Read `manual` as excluding a target from wildcard expansion for `build`, `test` and `coverage` only — never assume it hides the target from `bazel query`, a dependency graph, or a CI inventory script that walks `query //...`. | The Build Encyclopedia and the test-encyclopedia state it independently ("bazel query does not respect the manual tag"); the canonical "why didn't CI run this" incident is a target the health dashboard reports on and the test command never selects (`test-contract-sizing-and-flakiness.md:211-217`). | `diff <(bazel query 'tests(//...)' \| sort) <(bazel query 'tests(//...) except attr(tags, "manual", //...)' \| sort)` — every line only on the left is `manual` and invisible to what `bazel test //...` runs. EMPTY = PASS. | MUST | Bazel 8, 9 (identical in both docs); shapes A, F | M-E-07 |
| **BZL-TEST-11** | Tag every fixture rule instantiated under an `expect_failure` test `manual`, and read an existing `manual` target consumed as a `target_under_test` as correct rather than as a hidden test. | Without the tag, `bazel build //...`/`:all` builds the intentionally-failing fixture and reports a build failure unrelated to the suite; with it, the target stays visible to `query` and is a fixture, not an opted-out test — the distinction BZL-TEST-10's diff needs to stay actionable (`testing-starlark-and-coverage.md:58,226`; `test-contract-sizing-and-flakiness.md:315-318`). This carve-out covers failure-test fixtures only; `BZL-HERM-21` forbids `manual` on a `diff_test`/`write_source_files` target. It also covers the harness fixtures BZL-TEST-29 introduces. | For each label passed as `target_under_test =` to an `analysistest.make(expect_failure = True)` rule, confirm its instantiation carries `tags = ["manual"]`. EMPTY (no untagged instantiation) = PASS. | MUST | All Bazel majors, bazel-skylib all versions; shapes A, F | M-E-07, M-E-10 |
| **BZL-TEST-12** | Write test output, temp files and intermediate state only under `$TEST_TMPDIR` or `$TEST_UNDECLARED_OUTPUTS_DIR` — never `/tmp`, never `/home`, never a path derived from the test executable's own location. | Those two are the only paths the test-encyclopedia guarantees private and writable; everything else is unspecified, may not exist, and may be shared with a concurrently running test. Tests reach inputs through runfiles, never by inferring a path from their own location (`test-contract-sizing-and-flakiness.md:219-228,330-333`). | `grep -rn '/tmp/\|/home/\|dirname.*argv\[0\]\|__file__' <test sources>` and confirm each hit routes through `$TEST_TMPDIR` or resolves inputs through runfiles. EMPTY = PASS. | MUST | Bazel 8, 9; shapes all | M-E-05 |
| **BZL-TEST-13** | Never mutate the runfiles tree during a test run, and never let an assertion or cache key depend on filesystem atimes. | Both are explicit prohibitions in the normative spec — the runfiles tree "must not change during test execution", and tests "must not assume that atimes are enabled for any mounted filesystem" (`test-contract-sizing-and-flakiness.md:219-228,335-338`). | Grep the test sources for a `chmod`/`chgrp`/`touch`/write targeting a path under `$TEST_SRCDIR` or a `*.runfiles` directory, and for any read of `st_atime`. EMPTY = PASS. | MUST | Bazel 8, 9; shapes all | M-E-05 |
| **BZL-TEST-14** | Reach for `unittest.make()` for a pure Starlark function and `analysistest.make()` only when a real `rule()`-produced `Target` exists to depend on. | `analysistest.make()` always injects a mandatory `target_under_test` label with an aspect attached; a `repository_rule` or `module_extension` runs in the loading/fetch phase and produces a repository, not an analysable `Target` — pointing an analysistest at one is a category error, not a coverage gap (`testing-starlark-and-coverage.md:67-73,126-132,214`). A throwaway harness `rule()` that *calls* an `_impl` is itself a `rule()`-produced target and does not violate this row (BZL-TEST-29). | For every `analysistest.make(` call, confirm the paired `target_under_test =` label resolves to a `rule()`-produced target. EMPTY (no analysistest calls) is PASS *only* where the file has no rule-analysis behaviour to test; otherwise it is a gap. | MUST | Bazel 8, 9; bazel-skylib ≥1.0 (mechanism identical 1.9.0→1.9.2); shapes A, F | M-E-10 |
| **BZL-TEST-15** *(pinned)* | Give every `repository_rule` `_impl` a `unittest.make()` orchestration test driven by a hand-rolled `repository_ctx` fake, asserting on the fake's recorded side effects: which paths were watched and in what order, which URL and `sha256` were downloaded, which files were written. | This is the only offline technique that reaches the fetch phase; without it, the correctness of the actual `ctx.download`/`ctx.execute`/`ctx.symlink`/`ctx.file` sequencing rests entirely on slow, networked live-registry tests that run far less often than `bazel test //...` (`testing-starlark-and-coverage.md:126-132,208,216`; `bazel-audit/starlark-code-shape.md:209,272`). It covers the **happy path only** — a `unittest.make()` test cannot survive an uncaught `fail()` inside the `_impl` (measured: analysis aborts, no PASS/FAIL, `bazel test` reports "No test targets were found"), so error branches need BZL-TEST-29's harness instead. It does **not** replace `BZL-LARK-25`'s integration test — the offline test proves decision logic and ctx-call sequencing, the live one is the only thing that catches a malformed generated-BUILD string. Assert an *ordered* list of recorded calls, not membership, or a reordering bug passes silently. | `grep -rn 'repository_rule(' --include='*.bzl' .` to enumerate the `_impl`s, then for each confirm a non-`load()` call site inside a `*_test.bzl`. An `_impl` with no such hit is a FINDING; an EMPTY enumeration (no repository rules) is N/A. | MUST where the `_impl` makes no nested repository-rule call of its own | Bazel 8, 9; bazel-skylib ≥1.0; shapes A | M-E-10 |
| **BZL-TEST-16** | Cover a `module_extension`'s repository-rule-invocation half with a real evaluation (`bazel mod deps`) plus a nested-workspace integration test, and never claim the ctx-fake technique of BZL-TEST-15 covers it. | **Measured on both majors:** invoking a repository-rule symbol outside real extension evaluation fails identically from loading-phase BUILD top level and from inside an analysis-phase `rule()` harness — a Skyframe-phase gate, not a ctx-shape check, so no fake closes it. The fake `module_ctx` is consumed without complaint right up to the instantiation line. Error text differs by major: 8.7.0 `repository rules can only be used while evaluating a WORKSPACE file`; 9.2.0 `repo rules can only be called from within module extension impl functions` — grep `Error in repository_rule:` alone. `rules_bazel_integration_test` v0.37.1 (2026-01-31) is the maintained packaging of the real-subprocess technique, at ~25-30 s per test *after* the fixed-cache-path optimisation (5-7 min without it), needing an `exclusive` tag because that optimisation shares one on-disk workspace across runs (`repository-rule-and-extension-offline-testing.md` Q2, Q3; `testing-starlark-and-coverage.md:126-132`). | `bazel mod deps` exits 0, **and** at least one test target runs a real nested-workspace `bazel` subprocess covering the extension's repository creation. Neither present, for a repo declaring a `module_extension`, is a FINDING. | MUST for the prohibition (never claim an offline fake covers the invocation half — measured); SHOULD for standing up the integration test itself (a real, priced CI cost) | Bazel 8, 9 (bzlmod only); restriction measured on 8.7.0 and 9.2.0; shapes A, F | M-E-10 (module-extension half) |
| **BZL-TEST-17** | Name the test package in the `visibility()` allowlist of every private `.bzl` whose `_impl` or helpers need direct unit testing. | `BZL-LARK-13` requires the load-gate to exist; this row requires it to be wide enough. A leading underscore is a naming convention, not a cross-file boundary, and `visibility()` is the only thing gating `load()` — so a grant that omits the test package silently blocks the offline-fake technique BZL-TEST-15 requires from reaching `_impl` at all (`testing-starlark-and-coverage.md:210,230`). Confirmed as the correct shape by the cross-ruleset survey: rules_python converged on the same gate independently. | For each private `.bzl` with a tested `_impl`, read its `visibility([...])` list and confirm the test package is in it. A file whose gate excludes the test package is a FINDING; a file with no gate at all is `BZL-LARK-13`'s finding, not this one. | MUST | Bazel 6+ (the `visibility()` builtin); shapes A | M-E-10 |
| **BZL-TEST-18** | Duck-type a hand-rolled ctx fake to exactly the methods the code under test calls; never build a speculative full `repository_ctx`/`module_ctx` reimplementation. | Starlark gives no compile-time contract between a fake struct and the real ctx, so surplus fake surface drifts from reality with nothing to catch it, while a genuinely missing method at least throws loudly at test time (`testing-starlark-and-coverage.md:134-144,232`). Confirmed by the survey: rules_python's dogfooded `mocks.bzl` fakes exactly the called surface and nothing more. | List each fake's struct fields and diff against `grep -n 'ctx\.' <impl file>` for the functions it stands in for; a fake method with no matching real call site is dead surface to delete. EMPTY diff = PASS. | SHOULD | All Bazel majors; shapes A | M-E-11 |
| **BZL-TEST-19** | Generate repetitive guard and error-path cases from a dict literal fed through `partial.make()` into `unittest.suite()`, rather than hand-copying near-identical rule/impl pairs. | `unittest.suite()` accepts `partial.make(rule, **kwargs)` entries by design, so a new case is one dict entry rather than a new `.bzl` function plus a hand-declared target; hand-copied cases drift silently apart in assertion logic (`testing-starlark-and-coverage.md:106-124,228`). | Reading heuristic: a test file with more than ~5 structurally similar guard cases must build them in a `for case, expected in _CASES.items():` loop. EMPTY (no such file) = PASS. | SHOULD | Bazel 8, 9; bazel-skylib ≥1.0; shapes A | M-E-11, M-E-10 |
| **BZL-TEST-20** | Test flag-dependent rule behaviour with `analysistest.make(config_settings = {...})`, never by invoking `bazel test` twice with different flags. | Two flag variants cannot coexist in one invocation; `config_settings` applies an `analysis_test_transition` scoped to that test's target-under-test, so both variants live side by side in one `bazel test //...` (`testing-starlark-and-coverage.md:248`). | `grep -rn 'config_settings' --include='*_test.bzl' .` — a test or TODO asserting flag-dependent behaviour with no `config_settings` is the FINDING. EMPTY with no flag-dependent claims = PASS. | SHOULD | Bazel 8, 9; bazel-skylib ≥1.0; shapes A, F | — (analysistest hygiene) |
| **BZL-TEST-21** | Prove a "no network" test target or task from a cold repository cache before believing the label. | The BUILD graph is ground truth and a taskfile or CI-step description drifts from it; the one measured fleet case labels `bazel test //...` network-free while two `sh_test`s inside that same expansion consume externally fetched repos (`testing-starlark-and-coverage.md:244`; `bazel-audit/starlark-code-shape.md:275`). | Run the claimed-offline target with `--repository_cache=` pointed at an empty directory and the network denied. Any fetch attempt is the FINDING; EMPTY (it passes) = PASS. | MUST wherever a target or task is explicitly labelled network-free | Bazel 8, 9; shapes A, F | M-E-12 |
| **BZL-TEST-22** | Set `coverage --instrumentation_filter=^//` (plus `,-^//third_party` or the local vendor path) explicitly in `.bazelrc`, and read the `INFO: Using default value for --instrumentation_filter` line before trusting any coverage number. | The static default is `-/javatests[/:],-/test/java[/:]` — two hardcoded Java exclusions and no generic vendor concept — but that value is almost never the operative one: with the flag unset, `bazel coverage` calls `InstrumentationFilterSupport.computeInstrumentationFilter()` and derives a positive filter from the **packages of the test targets named on the command line**, not from the code under test. A repo with `//lib/foo` and `//tests/foo` gets `^//tests/foo[/:]` and instruments none of the library, reporting 0% on exactly the code the test exists to cover. Anchoring the flag explicitly is what stops both failure modes; rules_rust 0.74.0's own docs recommend the same anchored shape (`coverage-across-rulesets-and-the-test-exec-group.md` Answer 2; `testing-starlark-and-coverage.md:146-176`). | `grep -n 'coverage --instrumentation_filter' .bazelrc*` — the line must be anchored (`^//`), not the untouched Java-only default. EMPTY for a repo with vendored deps = FINDING. Then run `bazel coverage` once and read the `INFO: Using default value for --instrumentation_filter: "..."` line: it must cover the library's package, not only the test's. | MUST with vendored deps, SHOULD otherwise | Bazel 8, 9 — static default and the auto-filter code path both re-verified byte-identical at 8.7.0 and 9.2.0; shapes C, E, F | — (coverage half of the group) |
| **BZL-TEST-23** | Pass `--combined_report=lcov` explicitly on any CI leg pinned to Bazel 8, and never write guidance assuming one default across an 8-and-9 matrix. | The default flipped `none` → `lcov` in commit `b6fd304b` (2025-06-18, `RELNOTES[INC]`), landing in 9.0.0 — verified against `BazelCoverageReportModule.java` at the 8.8.0 and 9.2.0 tags, not inferred from prose. A matrix spanning both majors silently produces a merged report on one leg and not the other (`testing-starlark-and-coverage.md:146-166`). | Read the pinned `.bazelversion` and the CI matrix majors, then `grep -n 'combined_report' .bazelrc* <ci workflow>`. EMPTY with a matrix spanning 8 and 9 = FINDING. | SHOULD | Bazel 8 (`none`) vs Bazel 9 (`lcov`) — version-exact; shapes F | — (coverage half) |
| **BZL-TEST-24** | Pass `--enable_runfiles` on any Windows CI leg that runs `bazel coverage` — and read the pinned ruleset version before reading an absent flag as the finding. | The flag defaults `"auto"` — off on Windows only, byte-identical option block at 8.7.0 and 9.2.0 — and a collector that maps coverage back onto sources through runfiles then reports empty coverage while the test itself still PASSes, with only an `ERROR: … code coverage requires a runfiles tree` line to show for it. **The rule is ruleset-shaped, and the wave-4a follow-up split it three ways:** rules_js 3.4.1 is the confirmed case, with exact log text. rules_python **≥1.9.0** forces `--enable_runfiles=true` for `py_binary`/`py_test` on Windows through its own rule-level transition (overridable via `@rules_python//command_line_option:enable_runfiles`), so an EMPTY grep on a Python-only Windows leg is **not** a finding. rules_rust 0.74.0 disclaims Windows support fleet-wide in its own index; its `collect_coverage.rs` carries a runfiles-optional fallback derived from `COVERAGE_DIR`'s `bazel-out/<config>` prefix, exercised today only for split post-processing — plausible from source, confirmed by nothing, so Rust coverage on Windows is unverified-by-upstream rather than known-broken (`macos-windows-sandbox-and-runfiles-parity.md` Q2; `testing-starlark-and-coverage.md:178-189`). | `grep -n 'enable_runfiles' .bazelrc* <ci workflow>` for a repo with a Windows coverage leg, **then** read the pinned ruleset version. EMPTY = FINDING for a JS leg; EMPTY = PASS for a rules_python ≥1.9.0 leg unless the config setting turns it back off; EMPTY on a Rust leg = measure it (run `bazel coverage` there with `VERBOSE_COVERAGE=1` and read whether the fallback resolves real paths) rather than assume either way. No Windows coverage leg = N/A. | MUST where a Windows coverage leg exists and the ruleset does not force the flag itself | Bazel 8, 9 (default unchanged, source-verified at both tags); rules_js 3.4.1 confirmed, rules_python ≥1.9.0 self-forcing, rules_rust 0.74.0 unverified-by-upstream; shapes E, F | M-E-13 |
| **BZL-TEST-25** | Gate coverage completeness on the `DA:` records inside the produced `_coverage_report.dat`, never on `bazel coverage`'s exit code and never on the file merely being non-empty. | `WARNING: no coverage report was generated … reporting empty coverage` leaves the test PASSing and the command exiting 0. A merely-non-empty check passes an instrumented-but-never-executed report and an uninstrumented one alike; the lcov `DA:<line>,<count>` record separates them. Zero `DA:` lines means nothing was instrumented — a config bug, and one of four causes (BZL-TEST-22, 24, 26, 27). `DA:` lines that all read `,0` mean instrumentation worked and the code never ran — a real coverage gap, not a tooling bug (`coverage-across-rulesets-and-the-test-exec-group.md` Answer 2; `testing-starlark-and-coverage.md:189,242`). | CI step: `grep -c '^DA:' bazel-out/_coverage/_coverage_report.dat` (0 = FINDING, nothing instrumented) then `grep '^DA:' <report> \| awk -F, '$2>0' \| wc -l` (0 = a real coverage gap, reported separately from a config bug). An absent or empty file alongside a green `bazel coverage` is the FINDING. | SHOULD | Bazel 8, 9; shapes F | M-E-13 (partial) |
| **BZL-TEST-26** | Before trusting a Python coverage run, confirm the resolved interpreter has a bundled `coverage` wheel — rules_python 2.3.3 bundles CPython 3.9–3.14 only, and not every platform inside that range. | With `configure_coverage_tool = True` and no matching wheel for the interpreter `bazel coverage` actually selects, rules_python produces **no coverage tool at all** and the run emits empty lcov data silently; the only trace is a `py_runtime` analysis-time warning emitted solely when coverage is being collected. The test still passes and the command still exits 0, so this joins the other three silent-empty causes under BZL-TEST-25 (`coverage-across-rulesets-and-the-test-exec-group.md` Answer 1; rules_python `docs/coverage.md` @2.3.3). | Run `bazel coverage` once and read the analysis log for a `py_runtime` coverage-tool warning; then apply BZL-TEST-25's `DA:` count. A warning, or a zero `DA:` count on a Python target, means the interpreter/platform lacks a bundled wheel — wire `py_runtime.coverage_tool` manually. EMPTY (no warning **and** a nonzero `DA:` count) = PASS. | MUST where a Python coverage leg exists | rules_python 2.3.3 (`configure_coverage_tool` since 0.18.1); Bazel 8, 9; shapes D, F | — (wave-4a follow-up) |
| **BZL-TEST-27** | Pass `--experimental_generate_llvm_lcov` on any coverage leg whose C++ toolchain is clang/LLVM. | The flag defaults `false` at both 8.7.0 and 9.2.0 (`CppOptions.java`, re-read at 8.7.0 for this revision). Without it, `collect_cc_coverage.sh` takes its `PROFDATA` branch and writes a raw `.profdata` blob that the LCOV merger cannot read — the script's own `# TODO(#5881): Convert profdata reports to lcov` says so — and that target's C++ coverage silently vanishes from the combined report. Only the flag switches it to `LLVM_LCOV` mode (`llvm-cov export -format=lcov`). Both cited tracking issues (#1118, #5881) are closed while the TODOs referencing them as open still ship in the 9.2.0 tree, so the source comments are not a status signal. C++ coverage has no Windows path at all, and macOS needs `GCOV_PREFIX_STRIP` hand-tuned or, in Bazel's own words, "no coverage data will be found" (`coverage-across-rulesets-and-the-test-exec-group.md` Answer 1). | `grep -n 'experimental_generate_llvm_lcov' .bazelrc*` for a repo whose C++ toolchain is clang (tell: `.profraw` files, not `.gcda`, appear in `$COVERAGE_DIR`). EMPTY = FINDING when clang is in use; EMPTY with a gcc/gcov toolchain = PASS. | MUST where a clang C++ coverage leg exists | Bazel 8.7.0 and 9.2.0 (default `false`, source-verified at both); shapes F | — (wave-4a follow-up) |
| **BZL-TEST-28** | On Bazel 9, satisfy the implicit `test` exec group's toolchain by registering the test's target platform as an execution platform, or by shipping a custom toolchain for `@bazel_tools//tools/test:default_test_toolchain_type` — never by leaving `--@bazel_tools//tools/test:incompatible_use_default_test_toolchain=false` in place as the fix. | New at 9.0.0 and unchanged through 9.2.0: every test rule carries an implicit `test` exec group with a mandatory toolchain requirement on `default_test_toolchain_type`, `build_setting_default = True` from the day it shipped. Absent at 8.7.0 and 8.8.0 — `tools/test/BUILD.tools` has no such symbol at either tag (verified for this revision). With the default kept, a test whose target platform has no matching *registered execution platform* fails at toolchain resolution — loud, and the `no_match_error` names both remediations inline. The escape hatch restores the pre-9 behaviour the toolchain exists to prevent — the encyclopedia's own example is "a test binary built for Linux on a Windows machine to be executed on Windows" — and is marked for removal with no date. The separate native flag `use_target_platform_for_tests` carries its own deprecation warning pointing at this mechanism and must never be recommended (`coverage-across-rulesets-and-the-test-exec-group.md` Answer 3). | For every target platform a test rule builds against, confirm `MODULE.bazel`'s `register_execution_platforms()` (or `bazel config`/`query` on the resolved platforms) also registers a compatible execution platform. A toolchain-resolution error naming `default_test_toolchain_type` is the runtime signal. EMPTY (every target platform has a matching execution platform) = PASS. Note this is a Starlark `bool_flag`, not a native option: grepping the CLI reference for it returns nothing, and that empty reads "wrong place to look", never "the flag does not exist". | MUST-NOT on the escape hatch as a permanent fix; SHOULD on the registration itself (its failure is loud, not silent) | Bazel 9.0.0–9.2.0 only; N/A on Bazel 8 and wherever the execution platform already equals the target platform; shapes C, F | — (wave-4a follow-up) |
| **BZL-TEST-29** | Cover every `fail()`-reachable branch of a `repository_rule`/`module_extension` helper with a throwaway `rule()` harness driven by `analysistest.make(expect_failure = True)`, never with a bare `unittest.make()` assertion. | Measured on 8.7.0 and 9.2.0: a harness rule whose `_impl` calls the real `_impl` with a fake ctx, paired with `asserts.expect_failure(env, …)`, passes for both the failing and the succeeding fixture. The negative control is why this row exists — the identical `fail()` driven through a bare `unittest.make()` test does not produce a red test, it aborts that target's *analysis* (`ERROR: Analysis of target '…' failed; build aborted`) and `bazel test` then reports "No test targets were found, yet testing was requested" for the whole invocation. An agent that writes the `unittest` form believes it has coverage and has none (`repository-rule-and-extension-offline-testing.md` Q2). The fragment passed to `asserts.expect_failure` still obeys `BZL-LARK-24` (a module-level constant the call site cannot spell), and the harness fixture still obeys BZL-TEST-11 (`tags = ["manual"]`). | For each `fail(` inside a repository-rule/extension `_impl` or its helpers, confirm a matching `analysistest.make(expect_failure = True)` test exists against a harness fixture. A `fail()` branch reachable only through a `unittest.make()` test is the FINDING; EMPTY (no `fail()` branches) = N/A. | MUST where a `fail()`-reachable branch exists | Bazel 8.7.0 and 9.2.0 (technique executed on both); bazel-skylib ≥1.0; shapes A | — (wave-4a follow-up) |
| **BZL-TEST-30** | Split a `module_extension`'s `_impl` into a pure `module_ctx → data` decision function that is unit-tested directly, plus a thin repository-rule-invoking tail that is not. | The invocation tail is unreachable offline on both majors (BZL-TEST-16), so the only way to get *any* offline coverage of an extension is to move the decidable logic out of it. rules_python 2.3.3 is the worked reference: `parse_modules(module_ctx, …) -> mods` is unit-tested against a fake `module_ctx`, and `_pip_impl()` keeps only the loop over its output. rules_rust's `crate_universe` `_crate_impl()` is the counter-example — tag parsing and repo-rule invocation in one function, zero offline coverage of either half — and an agent pattern-matching "how does a mature ruleset test its extension" against it learns nothing transferable (`repository-rule-and-extension-offline-testing.md` Q1). | Read each `module_extension` `_impl`: it should contain at most a loop over the output of a separately-named pure function, and that function should appear as the subject of a `unittest.make(` test. An `_impl` that interleaves tag parsing with repository-rule calls is the FINDING; EMPTY (no module extension) = N/A. | SHOULD | Bazel 8, 9 (bzlmod only); shapes A, F | — (wave-4a follow-up) |
| **BZL-TEST-31** | Past roughly two repository rules or extensions needing ctx fakes, factor the fakes into one shared, versioned `.bzl` mock library with its own self-test, instead of one hand-rolled fake per test file. | Per-file fakes drift apart in exactly the way BZL-TEST-18 warns about, once each: the same `ctx.execute` needs a slightly different shape in each file and no test compares them. rules_python's `tests/support/mocks/mocks.bzl` (both `mocks.rctx()` and `mocks.mctx()`), dogfooded by its own `mocks_tests.bzl` and used from six-plus test files, is the only worked reference in the surveyed ecosystem — `bazel-skylib` 1.9.0 ships no ctx mock of its own, so every ruleset that needs one has reinvented it (`repository-rule-and-extension-offline-testing.md` Q1). | Count distinct fake-ctx struct constructors across the repo's `*_test.bzl` files. More than two, with no shared module and no self-test over the fakes themselves, is the finding. EMPTY (0-2 fakes, or one shared module) = PASS. | CONSIDER | All Bazel majors; measured for rules_python 2.3.3, argued as general guidance; shapes A | — (wave-4a follow-up) |
| **BZL-TEST-32** | On every Bazel version-pin bump, diff each hand-rolled ctx fake's method names against that version's `repository_ctx`/`module_ctx` builtins doc. | Starlark offers no introspection of a builtin type, so nothing inside the test can catch a fake that has drifted from the real API — a fake method that was renamed or removed upstream keeps passing forever, and the test proves nothing about the code that now calls the real name. No ruleset in the survey does this today, rules_python's dogfooded mocks included, so this is a named gap rather than a codified practice (`repository-rule-and-extension-offline-testing.md` Q1 §4). | For each faked method: `curl -s https://bazel.build/versions/<pinned>/rules/lib/builtins/repository_ctx \| grep -o '<method-name>'` (and the `module_ctx` page for `mctx` fakes). A miss means the method was renamed, removed, or never existed. EMPTY (every faked name appears) = PASS; note this checks names only, never signatures. | CONSIDER | All Bazel majors; argued — no upstream precedent found; shapes A | — (wave-4a follow-up) |

## Applied to rules_ocx and the fleet

`rules_ocx` is the fleet's only Bazel repository, and the family splits three ways
against it: satisfied where the repo already writes the pattern the rule ships, two
outright MUST violations, and a whole subgroup nothing in the fleet can exhibit.

**Satisfied — and one of these is where the rule came from.**

| Rule | Evidence |
|---|---|
| BZL-TEST-11 | Both `manual` targets in the repo are failure-test fixtures consumed as `target_under_test`: `ocx/tests/launcher_test.bzl:1572` (`_bad_closure_report`) and `:1581` (`_guard`, inside the case-generating loop). Correctly excluded from `bazel build/test //...`, still visible to `query`. |
| BZL-TEST-17 | 7 of 7 private modules grant the test package explicitly — `ocx/private/repo_utils.bzl:10`, `download.bzl:15`, `manifest.bzl:11`, `platforms.bzl:10`, `project.bzl:31`, `package.bzl:31`, `versions.bzl:13`, each `visibility(["//ocx", "//ocx/tests"])`. `ocx/defs.bzl` and `ocx/extensions.bzl` correctly declare none — they are the public surface. |
| BZL-TEST-18 | Three fakes at `ocx/tests/launcher_test.bzl:40-197` (`_fs_ctx` L40-84, `_replay_ctx` L85-112, `_env_ctx` L113-197), each duck-typing only the surface its callers use, none importing anything ocx-specific (`bazel-audit/starlark-code-shape.md:173,285`). Against the wave-4a survey this is above the ecosystem median: 6 of 8 surveyed rulesets ship no offline ctx fake at all. |
| BZL-TEST-19 | 34 cases generated from three dicts through `partial.make()` — `_MALFORMED_CLOSURE_REPORTS` (12, `:1058`), `_MALFORMED_CLOSURE_CONTAINERS` (4, `:1135`, merged at `:1563-1564`), `_GUARD_CASES` (18, `:1184`), fed into `launcher_test_suite` at `:1567-1584`. |
| BZL-TEST-12, BZL-TEST-13 | All seven shell scripts under `ocx/tests/` and `examples/*/` contain zero `/tmp` writes and zero writes of any kind — they exec `$(location …)`-resolved binaries and assert on output (`ocx/tests/BUILD.bazel:22-42`). No runfiles mutation, no atime dependence. |
| BZL-TEST-14 | Both `analysistest.make()` calls target `rule()`-produced fixtures (`_bad_closure_report` at `:1145`, `_guard` at `:1290`), never a `repository_rule`. |
| BZL-TEST-04, 05, 06, 08 | Zero `shard_count`, zero `flaky`, zero sandbox/cache/network tags anywhere in the repo. Vacuously satisfied — and correctly so, not a gap: the repo's only network-touching mechanism is repository-rule fetch, a different phase these tags do not gate (`test-contract-sizing-and-flakiness.md:348,350`). |
| BZL-TEST-28 | Vacuously satisfied today. The three-OS CI matrix always builds and tests natively, so on every leg the execution platform already equals the target platform and Bazel 9's mandatory test toolchain resolves trivially. It binds for real the first time any leg cross-compiles a test. |
| BZL-TEST-31 | Three fakes is at the row's threshold, not past it — a shared mock module is not yet owed. It becomes owed the moment BZL-TEST-15's four orchestration tests add a fourth fake for the `_ocx_package_hub_impl` surface. |
| `BZL-LARK-24` (cited) | `_DRIFT_HINT` and `_CALLSITE_HINT` are module-level constants (`ocx/tests/launcher_test.bzl:1153-1154,1173-1176`) consumed at the repo's only two `analysistest.make()` call sites (`:1169,:1299`) — the rule originates in this repo's own `.claude/rules/starlark.md:34-39` (`bazel-audit/config-inventory.md:221`). Its seen-red half is unproven: the claim carries a procedure and no command, and 31 of 45 normative claims there carry no re-runnable verification at all (`bazel-audit/config-inventory.md:223`). |
| `BZL-LARK-25` (cited) | Generated BUILD content is raw string concatenation in four places (`ocx/private/download.bzl:17-26`, `project.bzl:124-127,228-230`, `package.bzl:284-295,367-406`), and the `examples/*` jobs build real targets from those generated repos across the CI matrix on push (`.github/workflows/ci.yml:64-90`). |

**Violated.**

- **BZL-TEST-15 (MUST) — 0 of 4.** `_ocx_download_impl` (`ocx/private/download.bzl:27`),
  `_ocx_project_repo_impl`, `_ocx_package_repo_impl` and `_ocx_package_hub_impl` have
  no orchestration test of any kind. Their pure sub-helpers are exhaustively covered;
  the `ctx.download` → `ctx.symlink` → `ctx.file` sequencing, env wiring and error
  propagation are proven only by live-registry example tests
  (`bazel-audit/starlark-code-shape.md:209,272`). Nothing structurally blocks the fix:
  `_ocx_download_impl` makes zero nested repository-rule calls, the visibility grants
  BZL-TEST-17 requires are already in place, and all three ctx fakes it would need
  already exist thirty lines away (`testing-starlark-and-coverage.md:132,208`).
- **BZL-TEST-29 (MUST where a `fail()` branch exists) — folded into the same fix.** The
  four `_impl`s' error propagation is part of what BZL-TEST-15 leaves unproven, and the
  wave-4a experiment shows the `unittest.make()` form an author would reach for first
  cannot cover it. Any plan that closes BZL-TEST-15 with four `unittest` tests alone
  still leaves every `fail()` branch untested and, worse, would look complete.
- **BZL-TEST-21 (MUST) — the "no network" label does not hold.** `taskfile.yml:43`
  describes the `test` task as "Unit tests + docs freshness (no network)", but
  `ocx/tests/BUILD.bazel:22-42` puts `ocx_tool_test` and `dev_tools_test` — consuming
  `@ocx_tool` and `@dev_tools`, fetched from the live `ocx.sh` registry — inside the
  same `//...` expansion. Only the 76 `analysistest`/`unittest` targets are
  unconditionally network-free (`bazel-audit/starlark-code-shape.md:275`). Code is
  authoritative; the description is the stale side.
- **BZL-TEST-01 (SHOULD) — knowingly.** 6 of ~84 test targets declare `size`, all
  `"small"`: `ocx/tests/BUILD.bazel:25,33`, `examples/project/BUILD.bazel:21,41`,
  `examples/package/BUILD.bazel:16`, `examples/cross_platform/BUILD.bazel:38`. The
  other ~78 default to `medium` (100 MB / 300 s) while finishing in milliseconds
  (`bazel-audit/starlark-code-shape.md:54,185`). Verdict 5 accepts this; it is listed
  so nobody re-files it.

**Cannot exhibit — and what the fleet would have to build.**

- **The entire Starlark-action half of the tag taxonomy (BZL-TEST-07).** `rules_ocx`
  declares **zero `rule()`s** in production — the public surface is 4
  `repository_rule()` plus 1 `module_extension()` (frame Correction 3) — so it
  registers no `ctx.actions.*` at all. To exhibit BZL-TEST-07 the fleet would have to
  declare its first analysis-phase rule with an action needing a sandbox or cache
  exception. No fleet repo is close.
- **Every coverage rule (BZL-TEST-22 through 27).** `grep -rn
  'coverage\|combined_report\|instrumentation_filter'` across every
  `.github/workflows/*.yml`, `.bazelrc` and `.bzl`/`BUILD.bazel` in `rules_ocx`
  returns nothing — re-measured 2026-09-05, matching
  `testing-starlark-and-coverage.md:261`. Empty here reads "coverage is not
  configured", not "coverage is silently broken". The fleet is *one step* from
  exhibiting BZL-TEST-24 specifically: the test matrix already runs 3 OS including
  Windows (`bazel-audit/build-contracts-and-ci-posture.md:40`), and `.bazelrc:6`
  already carries `common:windows --enable_runfiles` for `sh_test` runfiles fidelity
  (`bazel-audit/config-inventory.md:72`) — so adding a `bazel coverage` step to that
  Windows leg would satisfy the rule by accident of an existing flag. That accident is
  itself the reason the rule states the flag rather than the platform. BZL-TEST-26 and
  BZL-TEST-27 have no fleet consumer at all: no `py_*` and no `cc_*` target exists.
- **BZL-TEST-03 (`cpu:n`).** No test in the fleet is internally parallel. Exhibiting it
  needs a test binary with its own thread pool — the closest fleet candidate is
  `grimoire/test`'s `pytest-xdist` harness (`bazel-audit/fleet-bazel-readiness.md:140`),
  which would need `cpu:n` the day it becomes a `py_test`.
- **BZL-TEST-16's integration half.** `rules_ocx` has one `module_extension` and covers
  its repository creation through hand-rolled nested workspaces (`examples/*`,
  `e2e/bzlmod`) rather than through `rules_bazel_integration_test`. It satisfies the
  rule in substance and not in packaging — and the wave-4a follow-up removes the last
  argument for switching: the library declares no `bazel_compatibility` to inherit, has
  cut no release since v0.37.1 while its own `.bazelversion` moved to 9.2.0, and buys
  packaging, not capability. `e2e/bzlmod/BUILD.bazel:5-7` even documents why its one
  launcher stays build-only ("Executing jq would pull from the ocx.sh registry across
  the whole BCR platform matrix (flaky)") — which is also the exact target BZL-TEST-09
  would require to carry `requires-network` the day it is added.
- **BZL-TEST-30.** The repo's one `module_extension` was not re-read for the
  parse/apply split in this revision; the row is stated for the fleet as guidance, not
  as a measured finding against `ocx/extensions.bzl`.
- **BZL-TEST-02's coverage clause, BZL-TEST-20, BZL-TEST-23.** No coverage leg, no
  flag-dependent rule behaviour, no `config_settings` use anywhere. Shape-F guidance
  only.

## Applied to the fleet shapes

- **A — Starlark ruleset publishing to the BCR (`rules_ocx`).** The whole
  Starlark-testing subgroup binds now: BZL-TEST-15 is an open MUST violation,
  BZL-TEST-29 rides with it, BZL-TEST-21 is a second, and 11/14/17/18/19 are already
  satisfied and worth pinning so they stay that way. BZL-TEST-31 binds at its threshold
  and BZL-TEST-32 binds on the next Bazel-pin bump (the fakes have never been diffed
  against the 8.7.0 builtins doc). The coverage subgroup and BZL-TEST-07 cannot bind at
  all.
- **B — Rust CLI + Python acceptance harness (`ocx`, `grimoire`, `ocx-mirror`, `bob`,
  `rust-oci-client`).** Binds only on adoption, and BZL-TEST-12 is the pre-loaded
  violation: both harnesses resolve the binary under test from a self-derived path —
  `grimoire/test/conftest.py:26` computes `_PROJECT_ROOT` from `__file__` and
  `grim_binary` falls back to `<root>/bin/grim`; `ocx/test/conftest.py:211-219` does
  the same via `OCX_COMMAND` else `test/bin/ocx`
  (`bazel-audit/fleet-bazel-readiness.md:170`). Under Bazel that is exactly the
  "inferring a path from the executable's own location" the test-encyclopedia
  forbids; the replacement is a `py_test` with the Rust binary as a `data` dep, read
  through runfiles. On a coverage leg these repos hit BZL-TEST-26 (Python) and the
  unverified Rust-on-Windows half of BZL-TEST-24 simultaneously.
- **C — Rust + TypeScript monorepo (`creeptd-ng`).** Binds on adoption. Its two
  services build against a live database through `sqlx::query!` with no `.sqlx/`
  offline cache (frame Correction 1) — a build-phase network dependency that
  BZL-TEST-09 explicitly does *not* cover, and BZL-TEST-22 becomes a MUST the moment
  a coverage leg exists over a vendored crate tree. It is also the only fleet shape
  that could plausibly cross-compile, which is where BZL-TEST-28 stops being vacuous.
- **D — Python library or automation (`ocx-sdk-python`, `ocx-mirror-sdk`,
  `arcana/nox`, `index/bot-tools`, `ocx-indexbot`).** Binds on adoption. `ocx-indexbot`
  already runs a session-level `--timeout=60` and `--cov` in `pyproject.toml:106` —
  under Bazel that budget moves into `size`/`timeout` (BZL-TEST-01, 02) and the
  coverage flags move into `.bazelrc` (BZL-TEST-22), with BZL-TEST-26 as the first
  thing to check when the first report comes back empty. Note rules_python 2.3.3 still
  does not consume `uv.lock` (map Conflict 4), so none of this is near-term.
- **E — TypeScript package, extension or Action.** Binds on adoption, and this is the
  one shape where the coverage subgroup is *confirmed* rather than inferred:
  BZL-TEST-24's runfiles/Windows failure is documented by rules_js 3.4.1's own
  troubleshooting page with exact log text. BZL-TEST-02's coverage-budget clause is no
  longer JS-specific evidence — it is Bazel-core (verdict 14) — but rules_js remains
  the ruleset that wrote it down. `setup-ocx` and `kate-middlechild` are bun-locked,
  which rules_js cannot ingest at all (`bazel-audit/fleet-bazel-readiness.md:264`) — a
  prior blocker, not a testing one.
- **F — future polyglot Bazel monorepo, and `rules_ocx`'s own users.** Every row binds.
  This is the only shape where sharding, `flaky`, the tag taxonomy, `requires-network`,
  the full coverage subgroup and the Bazel-9 test toolchain have a real consumer, and
  it is the audience the shipped depth file is written for.

## AI-agent failure modes

Ranked by how often the mistake actually appears, merged across both dives and the
three wave-4a follow-ups.

1. **Writing an `expect_failure` fragment as an inline string literal.** Produces a
   test that looks correct and stays green forever. *Check:* `grep -rn
   'asserts.expect_failure(env, "'` — any hit with a quoted literal rather than a bare
   identifier is the finding (`BZL-LARK-24`).
2. **Recommending `--flaky_test_attempts` to *find* a flaky test.** It is built to make
   the test pass on the first success — the opposite of detection. *Check:* does the
   recommendation pair a runs flag with `--runs_per_test_detects_flakes`? If not, it is
   the wrong flag for the stated goal (BZL-TEST-06).
3. **Diagnosing every empty coverage report as a filter problem.** Four distinct causes
   share the symptom — filter mismatch, missing Windows runfiles tree, missing Python
   coverage wheel, clang emitting `.profdata`. *Check:* count `DA:` lines first, then
   look for a `py_runtime` warning or a stray `.profdata` where lcov was expected
   (BZL-TEST-25, 22, 24, 26, 27).
4. **Assuming a rule's `tags = [...]` reaches every `ctx.actions.run()` it registers.**
   True unconditionally for tests and genrules, flag-gated and `putIfAbsent`-shadowed
   for Starlark actions. *Check:* grep the `.bzl` for a hardcoded
   `execution_requirements` dict before concluding a target-level tag "did nothing" or
   "worked" (BZL-TEST-07).
5. **Wrapping a `repository_rule` or `module_extension` in `analysistest.make()`.**
   Structurally impossible — no `Target`, no providers, wrong phase. *Check:* for any
   new `analysistest.make(` call, confirm the rule type behind `target_under_test` is a
   `rule()`; a throwaway harness rule counts, the repository rule itself never does
   (BZL-TEST-14, 15, 29).
6. **Reaching for `unittest.make()` to test a `fail()` branch.** It is the right tool
   for the happy path and produces no test result at all for an error path — the whole
   invocation aborts with "No test targets were found". *Check:* every `fail()` in a
   repo-rule helper needs the `analysistest.make(expect_failure = True)` harness shape
   (BZL-TEST-29).
7. **Grepping for one Bazel major's repository-rule-instantiation error text.** The
   wording changed at the WORKSPACE-deletion boundary. *Check:* match on
   `Error in repository_rule:` alone, or carry both strings (BZL-TEST-16).
8. **Trusting `--instrumentation_filter`'s documented static default as what
   `bazel coverage` actually ran with.** It almost never is — the value is recomputed
   from the named test targets' own packages. *Check:* read the `INFO: Using default
   value for --instrumentation_filter: "..."` line in the invocation's own output
   (BZL-TEST-22).
9. **Describing a shard-unaware runner as silently running everything per shard.** The
   attribute-table prose says that; the implementation throws
   `LOCAL_TEST_PREREQ_UNMET`. *Check:* `bazel test --test_sharding_strategy=forced=2`
   and grep for "did not advertise support for it by touching" (BZL-TEST-04).
10. **Adding `requires-network` because something in the dependency closure was fetched
    from the internet.** The tag governs the test action's own sandboxed access, never
    the separate repository-fetch phase, which no sandbox flag can reach. *Check:* does
    the *test source* make a live call at execution time (BZL-TEST-09)?
11. **Assuming `manual` hides a target from `bazel query` or from a CI-coverage script
    that walks `query //...`.** It does not, and both official pages say so
    independently. *Check:* the `manual` diff (BZL-TEST-10).
12. **Treating `no-remote-cache-upload` as `no-remote-cache` with a longer name, or
    `no-sandbox` as `local` with a longer name.** The first pair differs by the read
    half; the second differs by whether the action is cacheable at all — `local`
    re-executes every build, `no-sandbox` hits the disk cache. *Check:* the tag grep
    plus one read of what the surrounding code actually wants (BZL-TEST-08).
13. **Forgetting `tags = ["manual"]` on a fixture rule under a failure test.** The
    canonical adaptation error when copying `bazel.build/rules/testing`'s minimal
    example, whose failure-testing section is a separate snippet. *Check:* BZL-TEST-11's
    grep.
14. **Citing size's RAM/CPU numbers from memory.** 20/100/300/800 MB and **always 1
    CPU** — the CPU column is easy to misremember as scaling. *Check:* read
    `be/common-definitions` every time (BZL-TEST-01, BZL-TEST-03).
15. **Naming the `test` exec group as Bazel 9's test-contract change.** The exec group
    and its `test.<key>` `exec_properties` scoping are documented at 8.8.0 and absent
    from no major since exec groups shipped; only the mandatory
    `default_test_toolchain_type` toolchain is new at 9.0.0. *Check:* if a claimed 9.x
    delta is not that toolchain requirement, it is fabricated (Verdict 1, BZL-TEST-28).
16. **Recommending `--noincompatible_use_default_test_toolchain` to unblock a
    cross-platform test.** It fixes today's symptom by restoring the silent
    wrong-OS-execution bug the toolchain exists to prevent, and the doc says it is
    slated for removal. *Check:* register the target platform as an execution platform
    instead (BZL-TEST-28).
17. **Assuming `--combined_report=lcov` must always be passed — or that a Bazel-8 leg
    produces one by default.** The second direction is the damaging one. *Check:* read
    the pinned `.bazelversion` and matrix majors before writing the guidance
    (BZL-TEST-23).
18. **Reading an absent `--enable_runfiles` on a Windows leg as a finding for every
    language.** rules_python ≥1.9.0 forces it at the rule level, so the grep
    false-positives there; rules_rust disclaims Windows entirely, so neither presence
    nor absence proves anything. *Check:* read the pinned ruleset version first
    (BZL-TEST-24).
19. **Assuming Bazel 9's Windows improvements fixed coverage's runfiles requirement.**
    Unrelated subsystems; `--enable_runfiles`'s Windows-off default is byte-identical
    at 8.7.0 and 9.2.0. *Check:* grep for `enable_runfiles` on the Windows coverage leg
    explicitly (BZL-TEST-24).
20. **Over-building a ctx fake into a full `repository_ctx` reimplementation "to be
    safe".** Surplus surface drifts silently. *Check:* diff the fake's method list
    against the real `ctx.` call sites (BZL-TEST-18) — and against the pinned version's
    builtins doc on every pin bump (BZL-TEST-32).
21. **Pattern-matching "how a mature ruleset tests its module extension" against
    crate_universe.** `_crate_impl()` has zero offline coverage of either half; the
    transferable example is rules_python's `parse_modules()` split. *Check:*
    BZL-TEST-30.
22. **Hand-writing `native.test_suite(...)` alongside `unittest.make()` calls.**
    WORKSPACE-era muscle memory; `unittest.suite()` already does it. *Check:* `grep -rn
    'native.test_suite' --include='*.bzl' .` in any file that also calls
    `unittest.make(`.
23. **Assuming `analysistest` scales to an arbitrarily large fixture graph.** The
    documented cap is 500 transitive dependencies. *Check:* `bazel query
    'deps(//path:fixture)' | wc -l` before trusting a result near that boundary.
24. **Treating a live integration test as redundant once an offline `_impl` test
    exists.** They catch different classes — only the live one sees a malformed
    generated-BUILD string, and no grep in this file can see inside one. *Check:* both
    must exist for a template-emitting repo rule (BZL-TEST-15 and `BZL-LARK-25`
    together).

## Open questions

### Needs a human decision

1. **Does `rules_ocx` close BZL-TEST-15's violation, and at what cost?** Four
   `unittest.make()` orchestration tests plus a fourth ctx fake for the
   `_ocx_package_hub_impl` surface — **and**, per BZL-TEST-29, one harness `rule()` per
   `fail()` branch, because the `unittest` form cannot reach those at all. The
   technique, the fakes and the visibility grants all already exist; this is bounded
   work, not research. Crossing four fakes also triggers BZL-TEST-31's shared-mock
   threshold. The owner's call is whether it ranks above the other wave-3 outputs.
2. **Does the "no network" label on `taskfile.yml:43` get fixed, or the test split?**
   Two options with different costs: reword the task description (free, leaves
   `bazel test //...` needing network on a cold checkout), or move the two dogfood
   `sh_test`s behind a tag so the network-free claim becomes true and mechanically
   checkable. The second is what BZL-TEST-21 would actually verify.
3. **Should `rules_ocx` stand up a coverage leg at all?** It would exhibit four rules
   the fleet currently cannot, and the Windows flag it needs is already in `.bazelrc`.
   Against: a ruleset whose test suite is 90% analysis-phase Starlark gets little from
   line coverage; it is a new CI cost on an already 9-shard matrix; and BZL-TEST-22's
   auto-computed filter means the first run would instrument `//ocx/tests` and report
   near-zero on `//ocx/private` unless the anchored filter is set on day one.

### Deserves another research round

| Subarea | Exact question |
|---|---|
| The tag table on a host that is not this one | Both prior rows are closed. Wave 5 measured `no-remote-cache-upload` against a real HTTP remote cache's request log and `external` against a real `--cache_test_results=yes` A/B, and re-ran the `requires-network`/`no-sandbox` rows on 9.2.0 byte-identically to 8.7.0 — BZL-TEST-08 is fully measured. What is left is the **host**: every tag, network and cache result in this family comes from one WSL2 workstation under `linux-sandbox`. Reproduce the whole table on a real CI runner before any of it is quoted as platform-independent, and note that nothing here speaks to `processwrapper-sandbox` (darwin) or `windows-sandbox` at all. |

### M-E rows the ruleset does not fully settle

All thirteen are now settled, with two carrying a caveat worth carrying forward and one
carrying a documented gap.

- **M-E-13** ("does coverage need a runfiles tree, and does it fail silently on Windows
  without `--enable_runfiles`?") is settled as far as documentation and source can
  settle it, and the residual is a **gap, not a question** (Verdict 17): rules_js 3.4.1
  is confirmed with exact log text; rules_python ≥1.9.0 forces the flag at the rule
  level so the failure should not reproduce for `py_test` out of the box; rules_rust
  0.74.0 disclaims Windows support fleet-wide, so `rust_test` coverage there is
  unverified *by upstream*, not merely unchecked here. BZL-TEST-24 now carries all
  three branches, including which way an EMPTY grep reads in each. Closing the residual
  needs a Windows executor, which this program does not have.
- **M-E-10** is settled, but with its *check* replaced rather than answered: "count
  `analysistest.make(` calls that target a production rule" is retired as a category
  error (Verdict 3). The underlying question is answered by BZL-TEST-14, 15, 16, 17,
  29, 30 and, for the generated-BUILD half, `BZL-LARK-25`.
- **M-E-11** is settled jointly across families: the `expect_failure` half is
  `BZL-LARK-24`, the ctx-fake and data-driven halves are BZL-TEST-18 and BZL-TEST-19.
  Nothing in it is left open, but no single family's depth file answers it alone.

## Sub-artifacts

- [`bazel-testing/test-contract-sizing-and-flakiness.md`](bazel-testing/test-contract-sizing-and-flakiness.md)
  — the contract every `*_test` target signs: the size/timeout/RAM/CPU tables, the
  sharding protocol and the doc-versus-source contradiction it resolves, `flaky` and
  the two retry flags that do opposite jobs, the full sandbox/cache tag taxonomy split
  by action kind, and the test-encyclopedia's environment invariants.
- [`bazel-testing/testing-starlark-and-coverage.md`](bazel-testing/testing-starlark-and-coverage.md)
  — how to test Bazel's own extension code: `unittest` versus `analysistest`, the
  `expect_failure` vacuous-pass mechanism read from bazel-skylib's source, hand-rolled
  ctx fakes as the offline technique for repository rules, data-driven case generation,
  and what `bazel coverage` costs (instrumentation flags, the 8→9 `--combined_report`
  flip, the runfiles/Windows silent failure, the shared size/timeout budget).
  **Superseded on one point:** its §8 claim that
  `--experimental_split_coverage_postprocessing` and
  `--experimental_fetch_all_coverage_outputs` default `true` is wrong; both default
  `false` (Verdict 7).
- [`bazel-followups/coverage-across-rulesets-and-the-test-exec-group.md`](bazel-followups/coverage-across-rulesets-and-the-test-exec-group.md)
  — coverage mechanics traced to Bazel core rather than per-ruleset docs: the
  `collect_coverage.sh`/`lcov_merger` wiring that puts the collector inside the test's
  own spawn, the auto-computed `--instrumentation_filter`, per-ruleset instrumentation
  and silent-failure modes for rules_rust/rules_python/rules_js/rules_cc, the `DA:`
  verification, and what the Bazel 9 `test` exec group actually changed.
- [`bazel-followups/repository-rule-and-extension-offline-testing.md`](bazel-followups/repository-rule-and-extension-offline-testing.md)
  — the executed experiment that settles what can and cannot be tested offline: the
  repo-rule-instantiation gate on both majors with its two error texts, the harness
  `rule()` + `expect_failure` technique for `fail()` paths with its negative control,
  an eight-ruleset survey of who tests ctx-bearing code at all, and
  `rules_bazel_integration_test`'s (absent) version floor and real cost.
- [`bazel-followups/macos-windows-sandbox-and-runfiles-parity.md`](bazel-followups/macos-windows-sandbox-and-runfiles-parity.md)
  — the per-OS half: darwin-sandbox's real network denial and its localhost
  non-parity, Windows's absent-in-practice sandbox, the junction/symlink/copy runfiles
  decision tree, and the three-way split of the Windows coverage question across
  rules_js, rules_python and rules_rust that BZL-TEST-24 now carries.
- [`bazel-measurements/sandbox-strategy-network-and-hermetic-sandbox-on-this-host.md`](bazel-measurements/sandbox-strategy-network-and-hermetic-sandbox-on-this-host.md)
  — real 8.7.0 and 9.2.0 runs on a WSL2 workstation: which strategy actually ran,
  whether `--sandbox_default_allow_network=false` blocks, and the Q6 tag table
  (`no-cache`/`no-remote-cache`/`no-remote`/`no-sandbox`/`local` against a warm disk
  cache) that BZL-TEST-08 and BZL-TEST-09 now cite. Host-caveated throughout.
- [`bazel-measurements/bazel9-gate-tags-visibility-and-flag-probes.md`](bazel-measurements/bazel9-gate-tags-visibility-and-flag-probes.md)
  — the wave-5 round that finishes BZL-TEST-08's tag table: `no-remote-cache-upload`
  probed against a real HTTP remote cache (only the `PUT /ac/` is suppressed; the
  `PUT /cas/` still fires), `external` probed against a real `--cache_test_results=yes`
  A/B (test-only, never cached, zero effect on a build action), both shown
  indistinguishable from default under `--disk_cache` alone, and the
  `requires-network`/`no-sandbox` rows re-run on 9.2.0. Its other three questions
  (buildifier gate, `transitive_visibility`, two cache flags) belong to sibling
  families. Same WSL2 host as the wave-2 measurement.

## Key sources

| URL | Why it is here |
|---|---|
| [test-encyclopedia (8.7.0)](https://bazel.build/versions/8.7.0/reference/test-encyclopedia) | The normative, authoritative test contract: sharding protocol, environment invariants, tag conventions. The page that outranks the attribute table when they disagree. |
| [test-encyclopedia (9.1.0)](https://bazel.build/versions/9.1.0/reference/test-encyclopedia) | Byte-diffed against 8.7.0 to establish that the only 9.x delta is the new execution-platform / test-toolchain section, and the source of the "expect this option to be unavailable" removal sentence. |
| [be/common-definitions (8.7.0)](https://bazel.build/versions/8.7.0/reference/be/common-definitions#common-attributes-tests) | The `size`/`timeout`/`flaky`/`shard_count`/`tags` attribute tables verbatim, with the RAM and CPU numbers — and the one stale `shard_count` sentence this consolidation overrides. |
| [`StandaloneTestStrategy.java`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/exec/StandaloneTestStrategy.java#L709-L724) | The `LOCAL_TEST_PREREQ_UNMET` check that resolves the sharding documentation contradiction against the shipped implementation; separately, the coverage post-processing spawn that can time out on its own. |
| [`TargetUtils.java`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/packages/TargetUtils.java#L50-L60) | The exact propagated-prefix allowlist and the `putIfAbsent` precedence for tag propagation onto Starlark actions. |
| [command-line-reference (8.7.0)](https://bazel.build/versions/8.7.0/reference/command-line-reference) | Exact defaults for `--flaky_test_attempts`, `--runs_per_test`, `--runs_per_test_detects_flakes`, `--test_sharding_strategy`, `--sandbox_default_allow_network`, `--incompatible_allow_tags_propagation`, `--cache_test_results`, `--test_verbose_timeout_warnings`, `--instrumentation_filter`, `--enable_runfiles`. |
| [bazelbuild/bazel#3783](https://github.com/bazelbuild/bazel/issues/3783) | A Bazel maintainer confirming, in the closing discussion, that `--flaky_test_attempts` is built to make a test pass rather than to detect instability. |
| [bazel.build/docs/sandboxing](https://bazel.build/docs/sandboxing) | Which sandbox strategies can enforce network denial at all — `processwrapper-sandbox` cannot, which is why `requires-network` is a no-op in nested/Docker environments and on Windows. |
| [bazel.build/rules/testing](https://bazel.build/rules/testing) | The canonical `unittest`/`analysistest` split, the failure-testing `manual` requirement, the `config_settings` flag-variant technique, and the 500-transitive-dependency cap. Silent on repository rules — the omission that settles M-E-10. |
| [`bazel-skylib/lib/unittest.bzl` (1.9.0)](https://github.com/bazelbuild/bazel-skylib/blob/1.9.0/lib/unittest.bzl#L541-L560) | `asserts.expect_failure`'s substring search, read from source rather than asserted — the mechanism behind `BZL-LARK-24`. Identical in 1.9.2 and `main`. bazel-skylib also ships no ctx mock of its own (Verdict 19). |
| [bazel.build/external/extension](https://bazel.build/external/extension) | The single sentence (`bazel mod deps`) that is the entire official testing guidance for module extensions. |
| [`BazelCoverageReportModule.java` (9.2.0)](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/bazel/coverage/BazelCoverageReportModule.java) | Ground truth for the `--combined_report` default at each tag (`none` at 8.8.0, `lcov` at 9.2.0), independent of any prose page. |
| [Commit b6fd304b](https://github.com/bazelbuild/bazel/commit/b6fd304b) / [bazel#26328](https://github.com/bazelbuild/bazel/issues/26328) | The `RELNOTES[INC]` pinning that default flip to Bazel 9.0.0, 2025-06-18. |
| [`tools/test/collect_coverage.sh` (9.2.0)](https://github.com/bazelbuild/bazel/blob/9.2.0/tools/test/collect_coverage.sh) | The script Bazel substitutes for the test binary — the `IS_COVERAGE_SPAWN`/`SPLIT_COVERAGE_POST_PROCESSING` branch that makes the coverage-budget property Bazel-wide (Verdict 14). |
| [`TestConfiguration.java` (8.7.0)](https://github.com/bazelbuild/bazel/blob/8.7.0/src/main/java/com/google/devtools/build/lib/analysis/test/TestConfiguration.java) | `--experimental_split_coverage_postprocessing` and `--experimental_fetch_all_coverage_outputs` both `defaultValue = "false"` — re-read at the fleet pin for this revision, correcting the wave-3a dive. |
| [`InstrumentationFilterSupport.java` (8.7.0)](https://github.com/bazelbuild/bazel/blob/8.7.0/src/main/java/com/google/devtools/build/lib/buildtool/InstrumentationFilterSupport.java#L55-L80) | The package-derived auto-filter heuristic and the exact `INFO: Using default value for --instrumentation_filter: "..."` text — identical at 9.2.0. |
| [`CppOptions.java` (8.7.0)](https://github.com/bazelbuild/bazel/blob/8.7.0/src/main/java/com/google/devtools/build/lib/rules/cpp/CppOptions.java#L960-L967) | `--experimental_generate_llvm_lcov` `defaultValue = "false"` at the fleet pin as well as at 9.2.0 — BZL-TEST-27's version scope. |
| [`tools/test/BUILD.tools` (9.2.0)](https://github.com/bazelbuild/bazel/blob/9.2.0/tools/test/BUILD.tools) | `default_test_toolchain_type`, the three stock toolchains, and `bool_flag(name = "incompatible_use_default_test_toolchain", build_setting_default = True)` — absent entirely at 8.7.0 and 8.8.0. |
| [`rules_js/docs/troubleshooting.md` (v3.4.1)](https://github.com/aspect-build/rules_js/blob/v3.4.1/docs/troubleshooting.md) | The only ruleset doc that names the runfiles/Windows coverage failure with exact log text, the silent-empty-report causes, and the coverage-versus-timeout budget interaction. |
| [`rules_python/CHANGELOG.md` (2.3.3)](https://github.com/bazel-contrib/rules_python/blob/2.3.3/CHANGELOG.md) | The 1.9.0 entry forcing `--enable_runfiles=true` for `py_binary`/`py_test` on Windows — the fact that makes BZL-TEST-24's grep insufficient on a Python leg. |
| [`rules_python/docs/coverage.md` (2.3.3)](https://github.com/bazel-contrib/rules_python/blob/2.3.3/docs/coverage.md) | The bundled coverage wheel's CPython 3.9–3.14 range and the silent empty-lcov failure outside it (BZL-TEST-26). |
| [`rules_python/tests/support/mocks/mocks.bzl` (2.3.3)](https://github.com/bazel-contrib/rules_python/blob/2.3.3/tests/support/mocks/mocks.bzl) | The one shared, versioned, self-tested ctx-mock library in the surveyed ecosystem — the reference shape behind BZL-TEST-31, alongside its `parse_modules()`/`_pip_impl()` split behind BZL-TEST-30. |
| [`rules_rust/docs/src/coverage.md` (0.74.0)](https://github.com/bazelbuild/rules_rust/blob/0.74.0/docs/src/coverage.md) / [`index.md`](https://github.com/bazelbuild/rules_rust/blob/0.74.0/docs/src/index.md) | The anchored `--instrumentation_filter=^//` recipe and the `rust_test(crate = …)` coverage quirk; the index's fleet-wide Windows-support disclaimer that reframes the Rust half of M-E-13. |
| [`bazel-contrib/rules_bazel_integration_test`](https://github.com/bazel-contrib/rules_bazel_integration_test) | v0.37.1 (2026-01-31), the maintained packaging of the nested-workspace technique — and the `MODULE.bazel` at that tag that declares no `bazel_compatibility` at all. |
| [Tweag — "Bazel rules to test Bazel rules"](https://www.tweag.io/blog/2022-10-06-bazel-rules-to-test-bazel-rules/) | The original description of nested-workspace integration testing and its measured costs: 5-7 minutes unoptimised, 25-30 s after the fixed-cache-path trade-off that forces the `exclusive` tag. |

## Revision log

One line per change, newest wave first. This is what a later author diffs against.

**2026-09-06 — wave-5 convergence revision (light, row-scoped).** Folds one wave-5
measurement (`bazel-measurements/bazel9-gate-tags-visibility-and-flag-probes.md`) into
the wave-4b file. Rule count unchanged at 32; MUST count unchanged at 19. No ID added,
renumbered or retired; no severity moved (BZL-TEST-08 was already MUST — it was held on
doc prose for two of its three pairs, not held down in severity).

| Change | IDs | Why | Input |
|---|---|---|---|
| Rationale rewritten: all three pairs now measured, none read. `no-remote-cache-upload` suppresses exactly the `PUT /ac/<digest>` while the same action's `PUT /cas/` blobs still upload; `external` is test-only — no observable effect on a build action, never cached under `--cache_test_results=yes`. | BZL-TEST-08 | The two halves that rested on `be/common-definitions` prose are now wire-level and test-cache measured on 8.7.0 and 9.2.0; the doc's "overrides `--cache_test_results`" wording never said `external` is invisible to `bazel build`. | `bazel-measurements/bazel9-gate-tags-visibility-and-flag-probes.md` Q2 (measured) |
| Verification cell gains the instrument clause: prove the two remote-cache-shaped tags with a remote endpoint's request log / a twice-run `--cache_test_results=yes` A/B; a `--disk_cache`-only run and the execlog's `cacheable`/`remotable` fields are structurally blind, and an EMPTY difference there reads "wrong instrument", never "the tag did nothing". | BZL-TEST-08 | Both tags measured identical to the default row against a disk cache — an agent citing that as evidence would confidently conclude the opposite of the truth. | same input, Q2 (measured) |
| "Applies to" cell: `no-remote-cache-upload`/`external` no longer flagged as doc-prose-only; now reads "all three pairs measured on 8.7.0 and 9.2.0, on one **WSL2** host under `linux-sandbox`". | BZL-TEST-08 | The host caveat survives the measurement; the doc-only caveat does not. | same input, Q2 (measured) |
| "Applies to" cell: `requires-network`/`no-sandbox` rows no longer "only on 8.7.0" — byte-identical on 9.2.0. | BZL-TEST-09 | The assumed-to-hold half was re-run and holds. | same input, Q2; frame Correction wave 5 §15 (measured) |
| Verdict 16's closing caveat rewritten: the two-tags-not-exercised sentence replaced by their measured semantics plus the "disk cache is the wrong instrument / a disk-cache-only probe reads blind" reading; the 8.7.0-only note on the two tag rows dropped. | Verdict 16 | The sentence near the old line 230 asserted the tags were never exercised, which the input contradicts directly. | same input, Q2 (measured) |
| Open questions, "deserves another research round": both rows removed as answered; one replacement row keeps the only live residual — reproduce the whole tag/network/cache table on a non-WSL2 host, and note darwin/Windows sandbox behaviour is untouched by any of it. | Open questions | Every question the two rows asked is now measured; the host and the non-Linux sandboxes are what remains. | same input, Q2 + "Not settled" |
| Frontmatter `consolidates` and "## Sub-artifacts" gain the measurement. | — | Provenance. | same input |

**2026-09-06 — wave-4b revision.** Folds three wave-4a follow-ups
(`coverage-across-rulesets-and-the-test-exec-group`,
`repository-rule-and-extension-offline-testing`,
`macos-windows-sandbox-and-runfiles-parity`) and one wave-2 measurement
(`sandbox-strategy-network-and-hermetic-sandbox-on-this-host`) into the wave-3a
consolidation. 25 rules → 32; 14 MUST → 19. No ID renumbered, none retired.

| Change | IDs | Why | Input |
|---|---|---|---|
| Coverage-budget clause promoted from one ruleset's docs to a Bazel-core fact; rationale rewritten around `TestActionBuilder`/`collect_coverage.sh`; "Applies to" no longer says "unconfirmed for rules_rust/rules_python". | BZL-TEST-02 | The mechanism is ruleset-agnostic and source-confirmed at 8.8.0 and 9.2.0; the old wording invited an agent to treat the budget as a JS quirk. | coverage follow-up, Answer 1 (normative) |
| Third tag pair added (`no-sandbox` vs `local`), grep widened to six tags, "Applies to" carries the WSL2 caveat and names `no-remote-cache-upload`/`external` as still doc-only. | BZL-TEST-08 | Measured: `local` marks the action uncacheable and it re-executes every build, which the attribute table's "≡ no remote cache + no remote exec + no sandbox" understates. | measurement Q6 (measured) |
| Rationale gains the measured enforcement result and the wave-3b clause that no sandbox flag reaches the fetch phase; "Applies to" records that the tag rows were measured on 8.7.0 only. | BZL-TEST-09 | The rule previously rested on the flag's documented default alone. | measurement Q3; frame Correction wave 3b §5 (measured) |
| Clause added: `unittest.make()` covers the happy path only; error branches go to BZL-TEST-29. Ordered-list assertion made explicit. | BZL-TEST-15 | An author closing this rule with four `unittest` tests would leave every `fail()` branch untested and believe otherwise. | repo-rule follow-up, Q2 (measured) |
| **Severity moved.** "SHOULD — the 'cannot be faked offline' half is argued and unconfirmed" → "MUST for the prohibition; SHOULD for standing up the integration test". Rationale replaced with the executed experiment, both error texts, and the real `rules_bazel_integration_test` cost curve. | BZL-TEST-16 | The unconfirmed half is now measured on both majors, from two call sites. The integration-test half stays SHOULD because it is a priced CI cost, not a fact. | repo-rule follow-up, Q2/Q3 (measured) |
| Rationale gains the cross-ruleset confirmation (rules_python converged on the same shape). No text change to the requirement. | BZL-TEST-17, BZL-TEST-18 | The follow-up's row says "confirms"; recorded so a later author does not re-open them. | repo-rule follow-up, Q1 (confirms) |
| Rule and verification rewritten around the auto-computed filter; the `INFO: Using default value for --instrumentation_filter` read added as a second verification step. | BZL-TEST-22 | The documented static default is almost never the operative value; the computed one tracks the *test's* package and is the real "measuring nothing" trap. | coverage follow-up, Answer 2 (normative) |
| **Overclaim fixed.** Verification split three ways by ruleset: EMPTY = FINDING for JS, PASS for rules_python ≥1.9.0 (rule-level transition forces the flag), and "measure it" for rules_rust (upstream disclaims Windows). Severity qualified with "and the ruleset does not force the flag itself". | BZL-TEST-24 | As written the grep would have reported a finding against a correctly-configured Python leg, and read rules_rust's silence as "probably the same as JS". | macos/windows follow-up, Q2 (normative) |
| Verification sharpened from "non-empty artifact" to a `DA:`-record count plus a nonzero-hit count, with the two EMPTY readings distinguished (config bug vs real coverage gap). | BZL-TEST-25 | A merely-non-empty file passes both an uninstrumented and a never-executed report. The follow-up's NEW-TEST-26 proposed the same check as a separate row; folded here instead of given its own ID, because two rules with one check is worse than one rule with the right check. | coverage follow-up, Answer 2 (measured) |
| **New rule.** rules_python's bundled coverage wheel covers CPython 3.9–3.14 only; outside it, empty lcov with a `py_runtime` warning as the only trace. MUST where a Python coverage leg exists. | BZL-TEST-26 | A fourth silent-empty cause with a distinct tell, previously unrecorded anywhere in the corpus. | coverage follow-up (NEW-TEST-27, normative) |
| **New rule.** `--experimental_generate_llvm_lcov` on a clang C++ coverage leg; default `false` re-verified at 8.7.0 and 9.2.0 for this revision. | BZL-TEST-27 | Without it the collector writes `.profdata` the merger cannot read and that target's coverage vanishes from the combined report. | coverage follow-up (NEW-TEST-28, normative) |
| **New rule.** Bazel 9's mandatory `default_test_toolchain_type`: register the target platform as an execution platform or ship a custom toolchain; never leave the escape hatch on. Verification notes the flag is a Starlark `bool_flag` absent from the CLI reference. | BZL-TEST-28 | New build-breaking behaviour on cross-target-platform builds, and the obvious workaround restores the bug the toolchain prevents. | coverage follow-up, Answer 3 (normative) |
| **New rule.** `fail()`-reachable branches need a harness `rule()` + `analysistest.make(expect_failure = True)`, never a bare `unittest.make()`. | BZL-TEST-29 | Executed on both majors with a negative control: the `unittest` form yields no test result at all, so an author reading a green run believes in coverage that does not exist. Kept as its own ID rather than folded into 15, so a citation can point at the technique alone. | repo-rule follow-up (NEW-3, measured) |
| **New rule.** Split a `module_extension` `_impl` into a pure decision function plus a thin invoking tail. SHOULD. | BZL-TEST-30 | Given BZL-TEST-16, this is the only way to get any offline coverage of an extension; rules_python is the worked example and crate_universe the counter-example. | repo-rule follow-up (NEW-2, measured) |
| **New rule.** Past ~2 ctx fakes, factor them into one shared, versioned, self-tested mock module. CONSIDER. | BZL-TEST-31 | Argued as general guidance (only one ruleset does it), so CONSIDER is the ceiling — but it earns a row by naming the single dogfooded reference implementation that exists, which saves reinvention. | repo-rule follow-up (NEW-1, measured/argued) |
| **New rule.** Diff each ctx fake's method names against the pinned version's builtins doc on every Bazel-pin bump. CONSIDER. | BZL-TEST-32 | Argued — no upstream precedent — so CONSIDER; kept because it is the only detector that exists for a fake silently drifting off the real API, which is BZL-TEST-18's failure mode with no other check. | repo-rule follow-up (NEW-4, argued) |
| Rows deliberately **not** added: NEW-TEST-26 (folded into BZL-TEST-25) and NEW-TEST-29 (rules_rust runfiles fallback — argued from source only, and BZL-TEST-24's revised "measure it" branch already carries the operative instruction; a second row would restate it). | — | Fewer rules that each carry one check. | coverage follow-up |
| Verdict 1 refined: the `test` exec group and `test.<key>` `exec_properties` scoping predate Bazel 9 (documented at 8.8.0); only the mandatory toolchain is new. Verified for this revision that `tools/test/BUILD.tools` has no such symbol at **8.7.0** either — sharper than the follow-up's 8.8.0 read. | Verdict 1 | The old wording let an agent cite "the test exec group" as the Bazel-9 test-contract change. | coverage follow-up, Answer 3 + direct source read |
| Verdict 7 corrected: `--experimental_split_coverage_postprocessing` and `--experimental_fetch_all_coverage_outputs` default **false**, not true. Sub-artifact entry marks the wave-3a dive superseded on that point. | Verdict 7 | The wave-3a dive read prose; the `@Option` annotations say otherwise at 8.7.0, 8.8.0 and 9.2.0. | coverage follow-up (normative) |
| Verdict 8 extended with the four-cause differential diagnosis for a silent-empty report. | Verdict 8 | "Fix the filter" is wrong three times in four. | coverage follow-up |
| Verdicts 13-19 added: the measured phase gate and its two error texts; coverage budget as a Bazel fact; the auto-computed filter; the measured tag/cache table; and three documented gaps (Windows coverage for Rust/Python, two undated removals plus the absent `bazel_compatibility`, the near-zero ecosystem baseline). | Verdict 13-19 | Four open questions closed as answers, two as gaps — gaps belong in the Verdict as findings, not in a queue. | all four inputs |
| Open questions: "module_extension offline testing", "rules_bazel_integration_test version floor", "Coverage budget beyond JS" and "The `test` exec group in 9.x" removed (answered); "Coverage under rules_rust / rules_python" removed and moved to Verdict 17 as a documented gap needing a Windows executor. Two new rows added, both narrow and cheap: the two cache tags the measurement never exercised, and the 9.2.0 re-run of the two tag rows. | Open questions | Every removed row is either answered in a rule or recorded as a gap; the two new rows are residuals on a live MUST. | all four inputs |
| One paragraph added above the rule table stating that every grep-based verification is blind to generated repo BUILD/`.bzl` text. | The ruleset (preamble) | House standard, frame Correction 9 (wave 2). Stated once rather than in ~12 cells. | frame Correction, wave 2 §9 |
| AI-agent failure modes reordered and grown from 17 to 24 entries; the new ones cover the four-cause coverage diagnosis, the `unittest`-on-a-`fail()` trap, the two-major error text, the auto-computed filter, the exec-group misattribution, the escape-hatch recommendation, the ruleset-shaped `--enable_runfiles` read, and crate_universe as a bad model. | — | Each new entry corresponds to a rule this revision added or corrected. | all four inputs |

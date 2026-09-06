---
title: "BZL-CI — target selection, CI matrix, gates, release flow"
topic: bazel-ci-and-target-selection
family: BZL-CI
model: opus
consolidates:
  - bazel-ci-and-target-selection/target-selection-and-the-determinism-precondition.md
  - bazel-ci-and-target-selection/ci-matrix-gates-and-release-flow.md
  - bazel-followups/ci-selection-tool-mitigations-and-advisory-legs.md
  - bazel-followups/cache-server-capabilities-repo-cache-gc-and-bes.md
  - bazel-followups/adoption-go-no-go-gate-and-coupling-query.md
  - bazel-followups/diagnosis-procedures-profiling-and-execlog-tooling.md
  - bazel-measurements/exit-39-and-bwob-on-cache-only-build.md
  - bazel-measurements/buildifier-gate-reach-and-generated-starlark.md
  - bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md
builds_on:
  - bazel-caching-rbe.md (BZL-CACHE-01, -11, -12, -16, -26, -27, -29, -33)
  - bazel-hermeticity-determinism.md (BZL-HERM-01, -02, -04, -05, -10, -11, -13, -19, -20, -21, -22, -23, -27, -28)
  - bazel-starlark-and-build.md (BZL-LARK-01, -02)
  - bazel-bzlmod-and-repo-rules.md (BZL-MOD-02, -06, -09)
  - bazel-architecture-monorepo.md (BZL-ARCH-29, carve-out applied 2026-09-06)
grounded_in:
  - bazel-frame.md (body + all seven Corrections blocks; the Measurement wave and wave 4b win over every earlier block; orchestrator decision table rows 2, 3, 6)
  - bazel-topic-map.md ("How to read this", "Conflicts resolved" 1-18, "The map" § F, "Staged for wave 3" § Group 10)
  - bazel-audit/build-contracts-and-ci-posture.md
  - bazel-audit/config-inventory.md
  - bazel-audit/starlark-code-shape.md
  - bazel-audit/fleet-bazel-readiness.md
date: 2026-09-05
revised: 2026-09-06
---

# BZL-CI

## Verdict

A CI pipeline is not one gate, it is a table of gates, and the fleet's one
measured instance is missing five of seven rows. Target selection sits on top of
that table, not beside it: it is the last thing a repo should add and the first
thing an agent proposes.

1. **Whole-repo green is the default; the ~40-minute / ~300-target line is this
   program's own derived tripwire, not a sourced threshold.** Frame decision row
   3 fixed the default and delegated the number to this wave. Re-checked against
   every primary page twice: Tinder's reported pre-adoption state (300+ targets,
   1.5M lines, 40-60 minute builds) is the only concretely evidenced point in
   the corpus where a real team found whole-repo green untenable, reconfirmed
   verbatim with zero drift
   ([ci-selection…:Q4](bazel-followups/ci-selection-tool-mitigations-and-advisory-legs.md)).
   But **no source anywhere publishes a target-count threshold** — not Tinder,
   not Canva, not Uber, not Aspect, not `target-determinator`'s own README
   ([adoption…:Q2](bazel-followups/adoption-go-no-go-gate-and-coupling-query.md)),
   and Aspect's own anchor argues against one existing at fleet scale: "A large
   Aspect customer has 2 million SLOC and 500 engineers. They are still on
   shared green." So the number is a **pinned, derived** measurement trigger
   this program computed from one team's stated context, not a law read off a
   source. The dives disagreed on which half leads;
   [10.1:164](bazel-ci-and-target-selection/target-selection-and-the-determinism-precondition.md)
   wrote "300 targets or ~40 min, whichever comes first",
   [10.2:326](bazel-ci-and-target-selection/ci-matrix-gates-and-release-flow.md)
   argued "the practically useful proxy is wall-clock, not raw target count".
   **Resolved for wall-clock as the lead signal, target count as the tripwire
   that says measure it now** — a target count is only obtainable once the repo
   is already in Bazel, while wall-clock is measurable from the CI system on day
   one and is the thing that actually costs. BZL-CI-01 carries both, and now
   carries the provenance too.
2. **The determinism precondition is cited, never asserted.** The five-step gate
   (environment tiers pinned → no undeclared non-determinism → non-hermetic
   steps isolated → eviction handled → only then the tool's own miss class) is
   built entirely from BZL-HERM-01/04/05/10/11/19 and BZL-CACHE-12/16, per the
   revision addendum's binding instruction. Nothing in BZL-CI re-derives what
   makes an action key stable. Step 4's wording changed with the measurement:
   [BZL-CACHE-12](bazel-caching-rbe.md) now keys eviction recognition on the
   **error text**, never on an exit code (Verdict 13).
3. **Correction to the map, on primary-source evidence, reconfirmed twice:
   Conflict 1 misattributes its own tie-breaker.** The map resolves bazel-diff
   vs shared-green by quoting "bazel-diff's README concedes it *is incorrect and
   will sometimes miss affected targets*". A full-text fetch of the current
   README plus a GitHub code search return **zero** matches; the phrase is
   Aspect's 2022-08-08 blog characterisation
   ([10.1:118-120](bazel-ci-and-target-selection/target-selection-and-the-determinism-precondition.md)),
   independently re-confirmed against the same page by the follow-up round
   ([ci-selection…:Q4](bazel-followups/ci-selection-tool-mitigations-and-advisory-legs.md)).
   The underlying fact survives — bazel-diff#134 is real, maintainer-diagnosed
   and closed as "expected behavior" — but the *tool's own docs* document a
   named miss class with named opt-in mitigations, not a blanket self-admission.
   Map Conflict 1's tie-break sentence needs revising; no rule cites the phrase,
   so no rule ID is affected.
4. **Correction to the frame: Tinder's 93 percent is a composite number**, and
   it re-checks verbatim. Frame Correction 9 reads "Tinder reports 93 percent CI
   time savings from it [bazel-diff]". The vendor's own materials state 93% P100
   comes from `bazel-diff` **plus Buildkite dynamic pipelines**, explicitly "a
   54% improvement over Bazel-diff alone"
   ([10.1:128-130](bazel-ci-and-target-selection/target-selection-and-the-determinism-precondition.md);
   re-fetched with zero drift,
   [ci-selection…:Q4](bazel-followups/ci-selection-tool-mitigations-and-advisory-legs.md)).
   Roughly half the figure is pipeline orchestration, not graph diffing.
5. **BZL-ARCH-29's carve-out was requested here and has landed there.**
   `rules_ocx`'s docs-freshness `diff_test` deliberately runs on one leg
   (`ci.yml:62` excludes `//docs/...` whenever `matrix.bazel != '8.7.0'`) with
   the reason stated directly above it (`ci.yml:57-60`), and
   [BZL-HERM-22](bazel-hermeticity-determinism.md) — **pinned** — blesses
   exactly that shape. [BZL-ARCH-29](bazel-architecture-monorepo.md)'s
   verification now reads "with the BZL-HERM-22 carve-out: where the generated
   file's shape is Bazel-major-dependent, one authoritative leg plus a comment
   naming the major adjacent to the excluding condition is the correct shape,
   and 'every leg' is wrong", and `rules_ocx` is re-scored there as fully
   satisfied. Nothing in BZL-CI contradicts it any longer; the cross-reference
   table records the resolution instead of the conflict.
6. **BZL-CACHE-27 escalates from CONSIDER to MUST here, by design.** BZL-CACHE's
   own Verdict 13 hands job design to BZL-CI and marks its refuses-help row
   CONSIDER "deliberately". Two independent fleet exhibits carry the rationale
   verbatim in-repo (`ci.yml:98-100`, `ci.yml:171-172`) and a third job proves
   the failure mode by omission (`ci.yml:64-91`). The standard is now BZL-CI-06
   at MUST for the refuses-help class, SHOULD for every other cache-omitted job.
   This is a hand-off, not a contradiction.
7. **The map's matrix dichotomy has a third answer, and the advisory half is now
   measured to be weaker than it looks.** M-F-05 frames it as "gate the
   Maintenance major, advise on Active, state the choice". `rules_ocx` does
   neither: both `8.7.0` and `9.x` block, and `continue-on-error` is reserved
   for `rolling` alone (`ci.yml:37-38,43`). For a module with external consumers
   on two majors that is the only shape that catches an Active-LTS break before
   a consumer does. BZL-CI-08 ships that as the shape-A standard — and the
   shape-F advisory option now requires a **named consumer**, not just a stated
   choice: GitHub's own spec reports a `continue-on-error` job's workflow run as
   *passed*, so branch protection has no distinct state to act on; Bazel's own
   `bazelci.py` **excludes** `soft_fail` steps from its one automated
   result-consumer (`try_update_last_green_commit`) and carries an in-repo TODO
   admitting the docs leg has no detection mechanism; BCR's presubmit has no
   soft-fail concept at all, only an attributed one-time `@bazel-io skip_check`
   ([ci-selection…:Q3](bazel-followups/ci-selection-tool-mitigations-and-advisory-legs.md)).
8. **Three rules belong to other families and ship here as cross-references, not
   rows.** The lint gate's own hardness is BZL-LARK-01 (map conflict 18 is
   superseded — `lint_mode="warn"` already exits nonzero). A golden authoritative
   on one major is BZL-HERM-22. A green Windows leg proving nothing about network
   isolation is BZL-HERM-02/-27. What BZL-CI adds in each case is the *lane*
   around them, not the mechanism.
9. **`bazel.build/remote/ci` is stale, verified verbatim 2026-09-05.** It still
   instructs the reader to add a `bazel-toolchains` WORKSPACE dependency and call
   `rbe_autoconfig`
   ([10.2:119-133](bazel-ci-and-target-selection/ci-matrix-gates-and-release-flow.md)) —
   untypeable on Bazel 9, whose 9.0 release deleted the WORKSPACE support code
   outright (measured: `--enable_workspace` and `--enable_bzlmod` are gone from
   both `help build --long` and `help startup_options` on 9.2.0). This is map
   Conflict 8's own example, now measured, and the reason BZL-CI-20 exists as a
   MUST with a one-line grep.
10. **Bazel core has no native answer and will not have one soon.**
    [bazelbuild/bazel#7962](https://github.com/bazelbuild/bazel/issues/7962),
    the tracked request for a rule-key/target-diffing primitive, has been open
    since 2019-04-05 and was still open through 2024-02-28. Every tool in this
    space is third-party by necessity; guidance implying a built-in is
    fabricated.
11. **Three citation corrections, measured against the files.** Dive 10.2 cites
    `taskfile.yml:22-32` for the lint task (measured 22-34, re-confirmed
    2026-09-06), `taskfile.yml:64-70` / `:58-70` for `dist:check` (measured
    64-71, comment at 67-70), and `.claude/rules/release.md:12` for the stale
    manual-BCR step (measured :10-12). Content unchanged in all three. Map
    Conflict 13's lesson applies: cite the number you measure.
12. **Severity discipline, stated so the exceptions are visible — and one
    number demoted.** BZL-CI-03 (sequence hermeticity before any selection
    layer) rests on one first-party engineering blog. Its **sequencing** is
    first-party and dated (TestContainers conversion and the a11y work shipped
    before the input-hashing layer went live 2024-01-31); its **magnitude is
    not a measurement**. The primary page's actual sentence, re-fetched, sits
    under a "rough estimates" heading: "A11y tests executed 67145 jobs for 13947
    commits. By executing 1 job per commit instead of 1 per page, we could
    reduce the number of jobs by 5x." That is an aggregate across ~14k commits
    and a **pre-migration projection of ~5x**, not a measured 67,145-to-1
    collapse
    ([ci-selection…:Q4](bazel-followups/ci-selection-tool-mitigations-and-advisory-legs.md)).
    This file's earlier "first-party measured numbers" framing for that figure
    is withdrawn; the rule stays SHOULD because the ordering claim is not
    falsified, only its magnitude and its measured/estimated status.
    BZL-CI-10, -30 and the accuracy-claim clause of BZL-CI-26 rest on argued or
    vendor-marketing sources and are CONSIDER. BZL-CI-01's *default* is a pinned
    project decision and carries MUST; its *threshold number* is derived, per
    Verdict 1. Moving the other way: **BZL-CI-21 rises SHOULD → MUST**, because
    its miss class stopped being a documented gap and became a measured one
    (Verdict 15).
13. **Version boundaries this ruleset depends on, re-measured against the real
    binaries.** Bazel **8.7.0 / 8.8.0**: `--incompatible_strict_action_env` and
    `--incompatible_repo_env_ignores_action_env` default `false`. Bazel **9.0**
    (2026-01-20): both default `true`; WORKSPACE support code deleted, so every
    `rbe_autoconfig`-shaped CI snippet is dead. **Exit code 39 is not a CI
    signal.** `ExitCode.REMOTE_CACHE_EVICTED = 39` is real and registered on
    both majors, but across ten invocations, two majors and five configurations
    it **never surfaced as an outer exit code** on a cache-only build: with the
    default 5 eviction retries the build self-heals and exits **0**; with
    retries `0` it fails generically with exit **1**
    ([exit-39…:Q4](bazel-measurements/exit-39-and-bwob-on-cache-only-build.md)).
    Its gating flag `--incompatible_remote_use_new_exit_code_for_lost_inputs` is
    present and default `true` on 8.7.0 and 8.8.0 and absent at 9.2.0 — "removed
    at 9.0.0", never "never existed". An **unreachable cache is likewise not a
    hard failure** in the cache-only shape: all four combinations of
    `--remote_local_fallback` and
    `--incompatible_remote_local_fallback_for_remote_cache` produced a WARNING,
    a full local build and exit 0 on both majors
    ([exit-39…:Q7](bazel-measurements/exit-39-and-bwob-on-cache-only-build.md));
    cite [BZL-CACHE-26](bazel-caching-rbe.md)'s current text, not the earlier
    "hard fail on outage" reading. BES flags measured directly from both
    binaries' own `help build --long` on this host (2026-09-06): `--bes_backend`
    `""`, `--bes_results_url` `""`, `--bes_upload_mode`
    `wait_for_upload_complete`, `--build_event_binary_file` `""`,
    `--remote_build_event_upload` `minimal` — identical on 8.7.0 and 9.2.0.
    Tool floors: `bazel-diff` **≥6.2.0** Bazel floor for `--useCquery`, and
    **≥8.6.0 / ≥9.0.1** for the `mod show_repo` default-mode MODULE.bazel diff
    (PR #322); current release v46.1.0 (2026-08-28).
    `target-determinator` v0.34.0 (2026-06-19), Bazel 4.0.0+ floor.
    `aspect_rules_lint` **2.9.0**, `bazel_compatibility = [">=7.6.0"]`.
    `publish-to-bcr` v1.4.1. bazelisk: current `master`,
    `last_downstream_green` removed. No rule here is language-ruleset versioned.
14. **What this family does not own, and what it just inherited.** Action-key
    stability, BwoB and eviction are `BZL-CACHE`; BES's **credential and TLS
    trust surface** is [BZL-CACHE-33](bazel-caching-rbe.md), not this file —
    what BZL-CI owns is *using* the event stream (BZL-CI-31/32/33, adopted here
    as the follow-up's forward-declared NEW-CI-1/2/3). Environment tiers,
    sandboxing and generated-file freshness are `BZL-HERM`; buildifier's own
    warning surface and its runner's exit-code remap are `BZL-LARK`; lockfile
    freshness is `BZL-MOD`; test `size`/`tags`/sharding are `BZL-TEST`; the
    ordered 8→9 flag-flip checklist is `BZL-FLAG`; profiling and execution-log
    procedure is the `bazel-diagnose` skill. `Cargo.toml`, `pyproject.toml` and
    `package.json` version hygiene inside a Bazel repo is covered by
    `rust-cargo`, `python-packaging` and `typescript-packaging`.
15. **Documented gaps — established, not open questions.** These are known
    holes a reader must not mistake for unexplored ground.
    - **There is no published target-count threshold for target selection.**
      Five primary sources were checked and none states one; BZL-CI-01's number
      is derived. Any guidance quoting "300 targets" as an industry line is
      inventing provenance.
    - **`--useCquery`'s cost at scale is untested.** The measurement that shows
      it closing the repository-rule miss class is one small scratch repro on
      Bazel 8.7.0; `cquery`'s per-revision cost at tens of thousands of targets
      — the stated reason `target-determinator` exists — was not exercised.
    - **No one has measured whether an *owned* advisory leg is acted on.** The
      ownership clause in BZL-CI-08 generalises from first-hand accounts of
      unowned red *required* CI, one inferential step away from advisory legs.
    - **Exit-39 and cache-outage behaviour were measured only in the cache-only
      shape.** No `--remote_executor` was available; shape F (a live executor
      alongside a downed cache) is untested and may differ.
    - **A `bazel-diff` allow-list is a maintenance surface with no verification.**
      `--fineGrainedHashExternalRepos` must be kept exhaustive as extensions are
      added, and nothing checks that it is.

## The ruleset

**This topic owns `BZL-CI` exclusively.** Thirty-three rules, 20 MUST. Rows are
ordered by where they sit in a pipeline: **01-04** are the entry gates a repo
passes before any CI design question is meaningful; **05-12** are job design and
the matrix; **13-20** are guards, release flow and secrets; **21-30** are target
selection, which binds only above BZL-CI-01's threshold; **31-33** are the build
event stream, which binds only where a BES backend or a BEP-consuming dashboard
exists. **pinned** marks a project decision rather than a derived fact.

**Standing scope note for every `grep` below: each one reads committed workspace
text only. BUILD and `.bzl` content generated at fetch time into an external
repository is out of reach of all of them** (frame, wave-2 correction 9) — which
is also precisely the blind spot BZL-CI-21 describes for `bazel-diff`.

| ID | Rule | Rationale | Verification (and how EMPTY OUTPUT reads) | Severity | Applies to | Settles | Depends on |
|---|---|---|---|---|---|---|---|
| **BZL-CI-01** | Default every pipeline to whole-repo `bazel test //...` / `bazel build //...`. Cross into "consider target selection" only when the whole-repo job's median wall-clock on the widest CI runner is consistently past **~40 minutes**; treat **~300 rule targets** as the tripwire that says measure the wall-clock now, not as the trigger itself. Present both numbers as **this program's derived tripwire**, never as a published threshold. **pinned** | Both selection tools in production use document real false-negative classes (BZL-CI-21/22); below the one evidenced switch point in the corpus, the correctness risk is unpaid-for. Wall-clock leads because it is measurable before the repo is in Bazel and is the cost actually being bought. The numbers derive from Tinder's stated pre-adoption context (300+ targets, 1.5M lines, 40-60 min), re-checked verbatim; **no source publishes a threshold**, and Aspect's counter-anchor (2M SLOC, 500 engineers, still on whole-repo shared green) argues one does not exist at fleet scale. | The CI system's own median duration for the whole-repo job, plus `bazel query 'kind(rule, //...)' \| wc -l`. EMPTY query output (no Bazel targets yet) = not yet applicable. A count and duration below the threshold **with a selection tool already wired** = finding (premature adoption). A document citing either number as an industry threshold rather than a derived one = finding. | MUST (shapes A-E, measured) / SHOULD (shape F until it has measured its own scale) | Bazel 7/8/9; all shapes | M-F-01 | — |
| **BZL-CI-02** | Run the five-step determinism gate in order before trusting **any** target-selection tool, and stop at the first failing step: (1) environment tiers pinned per major, (2) no undeclared non-determinism in the actions the tool would call unchanged, (3) non-hermetic CI steps isolated, (4) cache-eviction recognised by its **error text** and its retry default left alone, (5) only then the tool's own miss class. | A selection tool's "unchanged" verdict is only as good as the action-key stability of what it diffs; skipping to tool choice fuses two independent risk sources into one nobody can diagnose separately. Step 4 changed with the measurement: an evicted blob self-heals to exit 0 or fails as a generic exit 1, so a gate step written around exit 39 would never fire ([BZL-CACHE-12](bazel-caching-rbe.md)). | Named reading heuristic — confirm each cited rule's own verification passes, in that order, before evaluating any tool. A gate step that has never been checked reads the same as a failed one. | MUST | Bazel 8, 9; shape F, and any shape at the point of adopting Bazel | M-F-03 | BZL-HERM-01, -04, -05, -10, -11, -19; BZL-CACHE-12, -16 |
| **BZL-CI-03** | Convert every shared-service and unbounded-fan-out CI step (a shared database or container, a live external registry, one job per page or per item) into a self-contained, cacheable Bazel target **before** any selection or input-hashing layer goes live — never alongside it. | A selection layer built over a still-non-hermetic step inherits that step's flakiness as a false "unaffected" signal. Canva shipped three hermeticity fixes first — TestContainers for backend integration tests, the frontend suite under Bazel, and the a11y suite Bazelified — and only then trusted an input-hashing layer (live 2024-01-31). **The a11y figure is the blog's own pre-migration estimate, not a result**: "A11y tests executed 67145 jobs for 13947 commits… we could reduce the number of jobs by 5x" — an aggregate over ~14k commits projected to fall ~5x, not a measured 67,145-to-1 collapse. | Named reading heuristic — for every CI step reaching outside the Bazel-managed tree, confirm it was converted before any selection tooling reads its result as a cache hit. EMPTY (no such step) = pass. | SHOULD (first-party dated sequencing; the a11y magnitude is an estimate; the generalisation is argued) | Bazel all; shapes C, F | M-F-03 | BZL-HERM-13 |
| **BZL-CI-04** | Confirm CI actually invokes `bazel`/`bazelisk` inside a build or test step **on a path that gates a merge** — never infer it from a CI badge, a `.bazelversion` file, or an install/setup step. | 31.23% of Bazel projects **with a CI service configured** never invoke Bazel inside it, and a further 27.76% of those that do need extra tooling to make it work (383-project study; the denominator is the CI-adopting subset, verified). Adoption that never reaches CI bought nothing, and no selection tool has anything to offer it. | `grep -rn 'bazel\|bazelisk' .github/workflows/*.yml` (or the CI system's equivalent), then confirm at least one hit sits in a `run:`/`script:` step of a **required** check. EMPTY, or hits only in install steps = finding (Bazel is local-only). | MUST | Bazel all; all shapes | M-F-04 | — |
| **BZL-CI-05** | The minimum job set is a lint gate plus a test matrix, both required checks. A repo publishing to a registry adds a registry-parity job; a repo making any offline, airgapped or hermetic claim adds a cold-store correctness job. **Only the lint and test jobs may share the warm remote cache.** | The two "prove it without help" job types exist specifically not to benefit from a warm cache; giving them one produces a green run that has stopped proving anything. | Enumerate every job and classify it as {lint, test, registry-parity, cold-store, other}. Any registry-parity or cold-store job carrying a cache step = finding. No lint job or no test job at all = a more basic finding. EMPTY (classification matches, cache use matches) = pass. | MUST | Bazel all; shapes A, F | — | BZL-CACHE-01, BZL-CI-06 |
| **BZL-CI-06** | A job whose purpose is proving something works without help runs with every remote-cache flag absent **and** carries an adjacent comment naming what it proves and why a cache hit would mask it. Any other cache-omitted job gets the cache or gets the comment. Separately, a job's `name:` must not claim more than its own assertions support. | A reader cannot tell a deliberate omission from a forgotten step, and an oversight degrades silently to "job runs, proves nothing new". A name that overclaims trains every later reader, human or agent, to over-trust a green run. | Two checks, one row: (a) for every cache-eligible job with no cache step, is there an adjacent comment stating the reason? (b) read each job's `name:` against its actual assertions — does it compare independent action-key or execution-log captures, or only exit codes and output presence? Missing comment on a refuses-help job = finding (MUST); on any other = finding (SHOULD). A name claiming more than the body asserts = finding. | MUST (refuses-help jobs and job naming) / SHOULD (all other cache-omitted jobs) | Bazel all; shapes A, F | M-F-07 | BZL-CACHE-27, BZL-HERM-23 |
| **BZL-CI-07** | Every gate job propagates the underlying command's own exit code. Nothing between the command and the job result: no `\|\| true`, no stdout scrape, no `continue-on-error: true` — which is reserved for a leg explicitly declared a non-blocking canary in an adjacent comment. Never read the *number* as the linter's own: a `find \| xargs` runner remaps 1-125 to **123**. | The linter, the test runner and the guard script already exit nonzero; the CI wrapper is the only place that can turn a gate into a report, and `continue-on-error` on a real gate is invisible in a green dashboard. Measured: `buildifier_prebuilt`'s runner is `find … -print \| xargs buildifier` under `set -euo pipefail`, so the failure propagates but buildifier's own exit 4 never reaches `bazel run` ([BZL-LARK-01](bazel-starlark-and-build.md)). | `grep -rn '\|\| true\|continue-on-error' .github/workflows/*.yml` — every hit must sit on a leg whose adjacent comment declares it a canary. EMPTY = pass. Pair with BZL-LARK-01's seeded-violation check for the lint gate specifically, and assert nonzero, not a specific number. | MUST | Bazel all; shapes A, F | M-F-08 | BZL-LARK-01 |
| **BZL-CI-08** | On a module with external consumers spanning more than one Bazel major (shape A), make **both** the pinned major and the Active LTS blocking legs and reserve advisory framing for a rolling or nightly channel. On a single-consumer internal repo (shape F) an Active-LTS-as-advisory choice is acceptable **only with a comment stating the choice and naming who or what consumes a red run** — an owner, an on-call rotation, or a scheduled digest destination. | Advisory-only testing of the Active LTS lets a break reach a consumer on that major before CI sees it; gating only the Active major drops the signal for consumers deliberately still on the Maintenance pin. A stated choice with no named consumer is measured to be worth about as much as no leg: GitHub's own spec says `continue-on-error: true` makes the workflow run report **passed**, so branch protection sees no distinct state; Bazel's own `bazelci.py` excludes `soft_fail` steps from `try_update_last_green_commit`, its only automated result-consumer, and carries an in-repo TODO admitting the docs leg has no detection mechanism; BCR's presubmit replaces the whole idea with an attributed, one-time `@bazel-io skip_check`. | Read `continue-on-error:` (or equivalent) against every `matrix.bazel` entry. EMPTY (every leg blocks) = pass for shape A. For shape F with more than one major in the matrix, EMPTY **plus no comment naming both the choice and a consumer** = finding. | MUST (shape A) / SHOULD-with-stated-choice-and-consumer (shape F) | Bazel 8 and 9 in one matrix; shapes A, F | M-F-05, M-F-06 | — |
| **BZL-CI-09** | Name the Bazel version only through bazelisk's own resolution chain — `USE_BAZEL_VERSION`, `.bazeliskrc`, `.bazelversion` — never an OS package install or a hand-pinned Bazel download outside it. Never write `last_downstream_green`; it was removed. | A side-channel install stops tracking whatever a developer's local `bazelisk` would pick, so CI and local dev drift with nothing changing on either side. `last_downstream_green` is a name a model trained before its removal will still reach for; the README says "please use `last_green` instead". | Two greps: `grep -rn 'last_downstream_green' .bazelversion .bazeliskrc .github/` — any hit is the finding, EMPTY = pass. Then read every Bazel-provisioning step: `apt-get install bazel`, a pinned Bazel download URL, or an unversioned "latest" package = finding. Downloading a **pinned bazelisk** and letting it resolve Bazel is not a violation. | MUST | bazelisk any current release; Bazel all; shapes A, F | — | — |
| **BZL-CI-10** | Wire `bazelisk --migrate` as a scheduled, non-blocking job that uploads its per-flag report as an artifact, scoped with `BAZELISK_INCOMPATIBLE_FLAGS` to the flags the planned major jump actually touches. Never a required check. | `--migrate` re-runs the build once per `--incompatible_*` flag and prints a report; there is no single boolean a required check could gate on, and the unscoped default sweep produces a report too noisy to act on. | Confirm no workflow invoking `--migrate` is listed as a required status check, and that `BAZELISK_INCOMPATIBLE_FLAGS` is set or the job documents why the sweep is unscoped. EMPTY (no `--migrate` job) = not applicable. | CONSIDER | bazelisk any current release; shapes A, F | — | — |
| **BZL-CI-11** | On a repo with real per-language targets (`cc_*`/`py_*`/`js_*`/`rust_*`/`java_*`), run lint through `aspect_rules_lint`'s aspect mechanism — `--aspects=//tools/lint:linters.bzl%<linter>` **plus** `--@aspect_rules_lint//lint:fail_on_violation`, or a `lint_test` target — rather than a per-language CLI invoked as a bare shell step outside the graph. | A shell-invoked linter is invisible to `bazel query`, gets no remote caching, and re-runs in full every time; the aspect form is an ordinary Bazel action and inherits both. The aspect flag **alone only writes report files** — without `fail_on_violation` or `lint_test` nothing fails. | `grep -rn '\-\-aspects=' .bazelrc* .github/workflows/*.yml` and `grep -rn 'fail_on_violation\|lint_test' .bazelrc* BUILD*`. An `--aspects=` flag with neither companion = report-only, a finding. A bare-shell per-language linter with no `--aspects=` on a repo with real targets = finding. Not applicable to a repo with no per-language targets. | SHOULD | Bazel ≥7.6.0; `aspect_rules_lint` ≥2.9.0; shape F | M-F-14 | — |
| **BZL-CI-12** | A directory listed in `.bazelignore` leaves the root package graph but **not necessarily a linter's file walk** — measure which, in both directions, and never infer either answer from `.bazelignore` alone. Where the gate does reach an ignored tree, do not expect the exit code to say which tree failed; read the printed paths. | Measured on `rules_ocx` at Bazel 8.7.0 with `buildifier_prebuilt` 8.2.0.2: `//:buildifier.check`'s runner is `find . -type f … \| xargs buildifier` from `$BUILD_WORKSPACE_DIRECTORY`, which has no concept of `.bazelignore` — a planted violation in `examples/project/BUILD.bazel` (ignored) and one in `ocx/private/versions.bzl` (in-graph) both failed with the **same exit code, 123**. So "the ignored trees are unlinted" is wrong for a filesystem-walking runner; it is right, by construction, for any graph-scoped gate (an aspect `lint_test` over `//...` cannot see targets that left the package graph). Which one a repo has is a property of its runner, not of Bazel, and one exit code covers every tree. | Plant a deliberate formatting violation inside an ignored directory and run the repo's lint gate. A green run = finding (the gate does not reach it). A red run proves reach but attributes nothing — read the printed file path, never the exit status. Then read the same question for any graph-scoped lint target separately. EMPTY `.bazelignore` = not applicable. | SHOULD | Bazel 7/8/9; shapes A, F | M-F-09 | BZL-LARK-01 |
| **BZL-CI-13** | Read a registry-parity job's shard count from the registry's own presubmit schema — its `platform` list **×** its `bazel` list — never from the platform count alone, and state the resulting number in the job's comment. | The BCR's own presubmit format requires a `bazel` field per task alongside `platform`, so the real cost and coverage are the cross-product; "N platforms" understates it by the major-version factor (this program's own frame undercounted 8 as 4). | Multiply the job's matrix arrays and compare against any stated count. A stated count that does not match the product = finding. EMPTY (no count stated anywhere) = recompute and add one. | SHOULD | Bazel 7/8/9; shape A | M-F-10 | BZL-MOD-09 |
| **BZL-CI-14** | A deterministic text or count guard — a `grep -c` cross-check between related files, no Bazel invocation — may substitute for exercising a full platform matrix **only** for a named, narrow class of bug (a missing entry, a cardinality mismatch), and the job's comment names that class explicitly. | The guard is real and genuinely cheaper than an emulated multi-platform run, but it proves nothing about content, ordering or correctness; a comment that generalises past "these counts match" invites trusting it for more. | Read the guard's own comment against what the script actually asserts. A comment claiming broader coverage than the script performs = finding. EMPTY (no such guard) = not applicable. | SHOULD | Bazel all; shape A | M-F-11 | — |
| **BZL-CI-15** | A release job that cuts a version verifies, **in the same run**, that every place that version must appear agrees (git tag, `MODULE.bazel`'s `version`, any in-repo pin moving in lockstep). Where an automated refresh path exists for one of those pins, the PR-time check and the refresh call **one implementation**, never two. | A version-mismatched release either ships silently wrong or fails mid-publish; two independent implementations of "does this pin match" can diverge even when each looks correct on its own. | For the tag half: the release workflow contains a step comparing `GITHUB_REF_NAME` against a parsed `MODULE.bazel` version and failing on mismatch. For a repeated pin: confirm the CI-run check invokes the same script or function the scheduled refresh calls, not a hand-written second copy. EMPTY on either = finding. | MUST | Bazel all; shapes A, F | M-F-12 | BZL-MOD-06 |
| **BZL-CI-16** | A tool-version pin repeated across N CI job definitions is moved by exactly one script that CI also runs as the **verification**, never hand-edited across N files. | A partial hand-edit leaves some jobs on the old version with no error anywhere; a bump script that treats a row it cannot rewrite as a hard failure is the only shape that cannot half-apply. | `grep -c '<the pin string>' .github/workflows/*.yml` before a bump; the count of files the bump commit touches must equal it. A bump commit touching fewer files than the grep found = finding. | MUST | Bazel all (any CI with a repeated tool pin); shapes A, F | M-F-12 | BZL-CI-15 |
| **BZL-CI-17** | Keep the human-facing release runbook (an `AGENTS.md` section, a `.claude/rules` procedure, a CONTRIBUTING step list) in lockstep with the release workflow — a runbook step describing a manual action the workflow has since automated is worse than no runbook. | An agent or a new maintainer follows the stale instruction in good faith and performs by hand what the pipeline already did, or waits for a step nobody is running. | Read the runbook's steps against the release/publish workflow jobs, step for step. Any runbook step describing behaviour the workflow no longer requires by hand, or vice versa = finding. EMPTY (they agree) = pass. | SHOULD | all; shapes A, F | — | — |
| **BZL-CI-18** | When `publish-to-bcr` (or an equivalent registry-publish reusable workflow) runs under a shared bot or machine PAT, set the PR non-draft explicitly and say why in a comment; a repo using an individual maintainer's token leaves the upstream draft default alone. | Upstream defaults to draft precisely because a human author cannot mark their own PR ready — but "non-bot users will be unable to mark it as ready for review" when a bot PAT opens it, so the default silently stalls every release on a click nobody watches for. | `grep -n 'draft:' .github/workflows/publish*.yml` cross-referenced with which token identity opens the PR. `draft: true` (or the key absent, which defaults true) paired with a bot/machine PAT = finding. | SHOULD | publish-to-bcr any version; shape A | — | — |
| **BZL-CI-19** | Gate every privileged secret a CI job could expose to an untrusted-triggerable lane behind an event only a trusted actor can produce, and **spell that gate identically in every job that touches the secret**. The job spelling it differently is the first one to audit. | Identical spelling turns a secret-flow audit into a diff; a divergent expression is immediately visible as suspect instead of needing a line-by-line trace. The cache-specific half of this — a write-capable untrusted lane can plant a backdoored artifact a trusted build later executes — is BZL-CACHE-01; a BES endpoint reached with the same credential is BZL-CACHE-33. | `grep -rn 'secrets\.' .github/workflows/*.yml .github/actions/*/*.yml` and diff the surrounding conditional across every hit naming the same secret. All identical = pass; any hit with a different or absent gate = finding. | MUST | Bazel all; shapes A, F | M-F-13 | BZL-CACHE-01, BZL-CACHE-33 |
| **BZL-CI-20** | Reject on sight any CI or RBE setup instruction that adds a `bazel-toolchains` dependency to a `WORKSPACE` file or calls `rbe_autoconfig` — regardless of how authoritative the source reads, **including `bazel.build/remote/ci` itself**. | Bazel 9.0 deleted the WORKSPACE support code outright — measured, `--enable_workspace` and `--enable_bzlmod` are absent from both `help build --long` and `help startup_options` on 9.2.0 — so the snippet cannot be typed into a Bzlmod-only repo at all; the official page teaching it has not been updated to say so, and an agent reading it uncritically proposes dead code. | `grep -rn 'rbe_autoconfig\|bazel-toolchains' WORKSPACE* MODULE.bazel* .bazelrc* .github/` — any hit in a Bzlmod-only repo is the finding, including one freshly pasted from official docs. EMPTY = pass. | MUST | Bazel 9 (and any Bzlmod-only 8.x repo); shapes A, F | — | BZL-HERM-28 |
| **BZL-CI-21** | Treat `bazel-diff`'s **default** mode as blind to any transitive dependency introduced only by *executing* a repository rule or module extension — pip, npm, Maven, most Bzlmod extensions. On a repo whose dependency resolution runs through one, either pass `--useCquery` or keep an exhaustive `--fineGrainedHashExternalRepos` allow-list, or state in the wrapper that the miss class is live and unmitigated. | Measured across four flag combinations on Bazel 8.7.0 with a `use_repo_rule`-generated repo whose implementation reads a file: in default mode the dependent target's hash was **byte-identical** before and after and only the input file itself was reported; `--fineGrainedHashExternalRepos=@<repo>` caught it (per-target hashes inside the named repo) and `--useCquery` **also** caught it, by substituting a transitive `deps(//...:all-targets)` cquery for the definition-only query — so it needs no allow-list at all. Maintainer-confirmed on bazel-diff#134 and closed as expected behaviour. Separately, since Bazel 8.6.0+/9.0.1+ default mode **does** catch a declared `bazel_dep` version bump via `mod show_repo` diffing (PR #322/#255) — a different, narrower miss, not this one. | Read the CI wrapper for `--useCquery` or `--fineGrainedHashExternalRepos`/`--fineGrainedHashExternalReposFile`. Both absent, on a repo whose dependency resolution runs through a repository rule or module extension = finding, the miss class is live. The mechanical check on a live invocation: run `bazel-diff -v generate-hashes …` and read the literal `Executing Query:` line — `deps(//...:all-targets)` means cquery mode is on and this class is already closed; `'//external:all-targets' + '//...:all-targets'` means it is not. An allow-list is itself a second, quieter miss class: it must be kept exhaustive as extensions are added, and nothing verifies that. | MUST | Bazel all; `bazel-diff` any current release; shape F | M-F-02 | — |
| **BZL-CI-22** | Treat `target-determinator`'s results cache as unsafe across a change to a home or system `.bazelrc`, an environment variable affecting `cquery` output, or a different host machine — never share its cache directory across CI runners of differing OS or arch, and pass `--nocache_results` whenever any of the three changed since the cache was populated. | The tool's own README, re-checked against the current `--help` with zero drift: none of the three enter the results-cache key, so a stale "before" result compared against a fresh "after" one "may produce spurious differences". CLI options passed via `-bazel-opts`/`-bazel-startup-opts` **are** in the key. Cache entries from one machine are explicitly not guaranteed valid on another. Note the direction: this errs toward over-reporting, the opposite of BZL-CI-21's miss. | `grep -n 'cache-dir\|nocache_results' <ci wrapper>` and confirm the cache directory is not a volume shared across a multi-OS/arch matrix. EMPTY (no cache configured) = pass by absence. A shared cache path across heterogeneous runners = finding. | MUST | Bazel ≥4.0.0; `target-determinator` v0.34.0; shape F | M-F-02 | — |
| **BZL-CI-23** | On a Bzlmod-only repo, never feed a raw `//external:...` label from `bazel-diff get-impacted-targets` into `bazel build`/`test`; rely on the Bzlmod auto-detection of `--excludeExternalTargets` or set the flag explicitly. Know that the flag means two different things per subcommand: on `generate-hashes` it skips querying `//external:all-targets`; on `get-impacted-targets` it drops `//external:*` from the **output**. | `//external:*` labels are synthetic accounting devices `generate-hashes` needs to express repo-rule dependencies. They are not buildable in Bzlmod-only mode and fail downstream (bazel-diff#326). This is a crash class, not a staleness class — do not cite it as a mitigation for BZL-CI-21. | `grep -n 'excludeExternalTargets' <ci wrapper>`; on a Bzlmod-only pin the flag must be absent (auto-detected via `bazel mod graph`) or explicitly `true`. A downstream build failing on an `//external:` label is the live symptom. | MUST | Bazel 8/9 Bzlmod-only; `bazel-diff` any release carrying the fix; shapes A, F | M-F-02 | — |
| **BZL-CI-24** | Any target that reads undeclared workspace state at execution time — a repo-scanning linter run as a test (buildifier, eslint, gofmt) — is tagged, and that tag is passed to `bazel-diff --alwaysAffectedTags`. | `bazel-diff`'s own flag documentation names this exact class: such targets "would otherwise hash as unchanged and be wrongly skipped" — the repo-wide gate is precisely what selection must never skip. `target-determinator` publishes no equivalent flag, so the same target class needs a different answer there. | `grep -rn 'buildifier\|eslint\|gofmt' --include='BUILD*' .` for a repo-scanning test target, then confirm its tag appears in the wrapper's `--alwaysAffectedTags` list. EMPTY on the first grep = not applicable. A hit with no matching tag = finding. | MUST where such targets exist | Bazel all; `bazel-diff` any current release; shape F | M-F-02 | — |
| **BZL-CI-25** | Read an empty diff from either tool as "no evidence of a difference under this tool's own blind spots", never as "definitely nothing changed" — and name which flags were in effect for that specific invocation before acting on it. | `target-determinator`'s `-filter-incompatible-targets` defaults `true` and silently drops platform-incompatible targets before the caller sees them; its `-before-query-error-behavior` defaults `ignore-and-build-all`, so a failed "before" query degrades silently to build-all rather than erroring — a *safe* default, but one that makes "the tool ran" and "the tool selected" indistinguishable from the outside. `bazel-diff`'s default query mode over-approximates `select()` rather than resolving it. All three change what "empty" means. | Named reading heuristic — before trusting a zero-target diff as a skip-everything signal, state which of `-filter-incompatible-targets`, `-before-query-error-behavior`, `--useCquery`, `--excludeExternalTargets` were set, and name a real change this invocation could have missed. | SHOULD | Bazel all; both tools; shape F | M-F-02 | — |
| **BZL-CI-26** | Re-derive a selection tool's flag surface from its **current** `--help` or README before writing guidance about it, and pair any accuracy percentage or absolute-correctness claim with a check of that same tool's issue tracker and flag-help text for a named exception. Never cite `--includeTargetType` as a correctness mitigation. | `bazel-diff` alone gained `--useCquery`, `--fineGrainedHashExternalRepos`, `--excludeTargetsQuery`, `--alwaysAffectedTags`, `mod show_repo`-based MODULE.bazel diffing, a persistent HTTP `serve` mode with an S3 cache tier, and Firecracker snapshot warmup since the 2022 critique that most training-data summaries repeat verbatim. `--includeTargetType` only changes the output schema (`{target: sha256}` → `{target: "type#sha256"}`) and closes no miss class. The same vendor materials calling the tool "100% accurate target diffing" ship three flags patching named miss classes. | `bazel-diff --help` / `bazel-diff generate-hashes --help` (or a fresh README fetch) against the specific flag being cited — a flag absent from that output is renamed or does not exist at that version. For an accuracy claim: name the exception found, or state that none was found and where you looked. | MUST (flag re-derivation) / CONSIDER (the accuracy-claim clause, vendor-marketing sourced) | Bazel all; both tools, any release | M-F-02 | BZL-CACHE-23 |
| **BZL-CI-27** | Keep at least one scheduled or main-branch-on-merge whole-repo `bazel test //...` regardless of which selection tool gates pull requests. | Both documented miss classes are silent by construction; a periodic full run is the only backstop that does not itself depend on the tool's correctness. | `grep -n 'schedule:\|cron' .github/workflows/*.yml` for a job running the unrestricted target pattern. EMPTY on a repo already using target selection = finding. | SHOULD | Bazel all; shape F once selection is adopted | M-F-01, M-F-02 | — |
| **BZL-CI-28** | Run the execution-log diff that measures action-key stability **once per distinct Bazel major present in the CI matrix**, never once for the whole matrix. | `--incompatible_strict_action_env` and `--incompatible_repo_env_ignores_action_env` default differently on 8.x and 9.0.0+ — measured `false` on 8.7.0 and 8.8.0, `true` on 9.2.0, read from the binaries themselves — so a stability measurement on one major's leg says nothing about a leg running the other under a different environment-inheritance policy. | Confirm BZL-CACHE-16's execution-log diff procedure is run against each Bazel version named in the matrix, not only the pinned default. EMPTY (single-major matrix) = rule does not bind. | MUST | Bazel 8 and 9 in one matrix; shapes A, F | M-F-03 | BZL-HERM-01, BZL-CACHE-16 |
| **BZL-CI-29** | Decouple "what to build and test" from "what to publish": gate the former on the full determinism precondition, and once green decide the latter from Bazel's own post-build output digests rather than a pre-build graph diff. | A post-build digest comparison inherits none of the pre-build correctness risk of BZL-CI-21/22, because nothing was skipped from testing — it decides only what to push, from hashes Bazel already computed. | Named reading heuristic — does the pipeline's "what changed" decision happen before or after the build/test step it gates? Before = subject to BZL-CI-21/22's miss classes; after, keyed on output digests = a narrower question with no equivalent miss class in this corpus. | SHOULD | Bazel all; shapes A, F | M-F-01 | BZL-CI-02 |
| **BZL-CI-30** | Choose `target-determinator` when repository-rule and module-extension-introduced transitive dependencies must be tracked exactly with no per-repo configuration to maintain; choose `bazel-diff` **with `--useCquery`** when the same class must be closed without an allow-list but query cost is acceptable; choose `bazel-diff` default mode only when that class is separately mitigated or genuinely absent. State which trade-off was taken. | `target-determinator` was built for this class by its own maintainer's account in the bazel-diff#134 thread — "we put in quite a bit of care to follow deps through repository rules to all affecting files… I manually tested out the supplied repro, and that implementation detected the change properly" — the strongest first-hand comparison in the corpus, though informal and not benchmarked. The measured change since: `--useCquery` closes the same class for bazel-diff, so the choice is no longer "allow-list or switch tools" but a query-cost trade-off. Neither vendor position is measured against the other, and `--useCquery`'s cost at scale is untested (Verdict 15). | Named reading heuristic — count the module extensions and repository rules the repo depends on for dependency resolution, then price a `cquery` per revision against an allow-list somebody has to keep exhaustive. A large or fast-growing set rules out the allow-list; it does not by itself rule out `bazel-diff`. | CONSIDER | Bazel all; shape F | M-F-01, M-F-02 | BZL-CI-21, BZL-CI-22 |
| **BZL-CI-31** | Set `--bes_upload_mode` deliberately per lane and say why in a comment: `fully_async` (or `nowait_for_upload_complete`) where the lane's pass/fail must not depend on the BES backend being reachable, `wait_for_upload_complete` only where a missing upload is itself worth failing on. Do not leave the default unexamined on a lane that already treats the remote cache as best-effort. | Measured from both binaries' own `help build --long` on this host: the default is `wait_for_upload_complete` on 8.7.0 and 9.2.0 alike, so an unreachable or slow BES endpoint blocks build completion on a lane whose cache outage is already tolerated silently ([BZL-CACHE-26](bazel-caching-rbe.md)). Two best-effort decisions that disagree leave the stricter one deciding the lane's reliability, with nothing saying so. | `grep -rn 'bes_backend\|bes_upload_mode' .bazelrc* .github/` — a `bes_backend` hit with no `bes_upload_mode` alongside it = finding (the blocking default is in effect, unexamined). EMPTY on `bes_backend` = not applicable, no BES lane exists. | SHOULD | Bazel 8, 9; shapes A, F | — | BZL-CACHE-33 |
| **BZL-CI-32** | A dashboard reporting a "cache hit rate" from the Build Event Protocol names which cache it means, and never sources a build-wide **remote** figure from `BuildMetrics.ActionSummary.remote_cache_hits`. | That field is `[deprecated = true]` in Bazel's own `build_event_stream.proto`. The two live substitutes measure something else: `action_cache_statistics.hits/misses` is the **local**, on-disk action cache (it can read 100% with zero remote traffic — the single most likely conflation), and `ArtifactMetrics.output_artifacts_from_action_cache` versus `.output_artifacts_seen` separates local from local-plus-remote, never remote alone. The only clean remote-scoped boolean in the whole schema is test-only: `TestResult.execution_info.cached_remotely`, rolled up as `TestSummary.total_num_cached`. `ActionExecuted` carries no equivalent for non-test actions. A chart labelled "cache hit rate" with none of that stated trains every reader to over-trust it — the same failure BZL-CI-06's naming clause catches in a job title. | Read the dashboard's own query against the proto field it reads. A chart labelled "remote cache hit rate" fed by `action_cache_statistics`, by `ArtifactMetrics`, or by the deprecated counter = finding. EMPTY (no BEP-derived cache chart exists) = not applicable. | MUST | Bazel 8, 9; shapes A, F | — | BZL-CI-06 |
| **BZL-CI-33** | A tool that dereferences `bytestream://` URIs out of a captured BEP stream either runs the producing lane with `--remote_build_event_upload=all` or carries a documented not-found fallback. Never read a URI's presence in BEP as proof the blob was uploaded. | The flag defaults to `minimal` on 8.7.0 and 9.2.0 (measured from both binaries), and its own help text states verbatim: "local outputs referenced by BEP are not uploaded to the remote cache, except for files that are important to the consumers of BEP (e.g. test logs and timing profile). bytestream:// scheme is always used for the uri of files even if they are missing from remote cache." So under the default the URI is emitted for blobs that were never pushed, and a consumer fetching by URI gets a not-found for a file BEP told it exists. | `grep -rn 'remote_build_event_upload' .bazelrc* .github/` read alongside the consumer's fetch path. EMPTY **plus** a consumer that fetches by URI = finding (the `minimal` default is in effect). EMPTY with no such consumer = not applicable. | MUST where a BES consumer dereferences BEP URIs | Bazel 8, 9; shapes A, F | — | BZL-CI-31 |

### Cross-references, not rows

Five questions this group touches are already owned, verbatim, by another
family. Cite the ID; do not restate the mechanism.

| Question | Owning rule | What BZL-CI adds |
|---|---|---|
| Does the lint gate actually fail on a lint finding? (M-F-08) | [BZL-LARK-01](bazel-starlark-and-build.md) — `lint_mode="warn"` already exits nonzero; the shipped runner is `find … \| xargs buildifier` under `pipefail`, so the number you read is **123**, never 4. Map conflict 18 superseded. | BZL-CI-07 generalises the wrapper prohibition to **every** gate job, pins `continue-on-error` to declared canaries, and says to assert nonzero rather than a number. |
| A golden or generated-file gate authoritative on one Bazel major | [BZL-HERM-22](bazel-hermeticity-determinism.md) (**pinned**, MUST) — name the major in a comment adjacent to the excluding condition. | Nothing. [BZL-ARCH-29](bazel-architecture-monorepo.md)'s "every CI leg" clause carried the conflict and now carries the carve-out; Verdict 5 records the resolution. |
| Does a green Windows leg prove network isolation? | [BZL-HERM-02](bazel-hermeticity-determinism.md), [BZL-HERM-27](bazel-hermeticity-determinism.md) — `processwrapper-sandbox` is the only cross-platform strategy and cannot revoke a network namespace. | Nothing; the matrix-comment clause is inside HERM-02's own text. |
| Is the lockfile fresh? | [BZL-MOD-02](bazel-bzlmod-and-repo-rules.md) — `--lockfile_mode=error` on a dedicated leg plus a scheduled `refresh` leg, gated on the exit code, never a stderr string. | BZL-CI-05's job taxonomy is where that leg lives; the gate itself is BZL-MOD's. |
| Whose credential does `--bes_backend` use? | [BZL-CACHE-33](bazel-caching-rbe.md) — BES and the remote endpoints "need to share the same authentication and TLS infrastructure"; rotate both together. | BZL-CI-19 folds the BES endpoint into the identical-spelling secret audit; BZL-CI-31/32/33 own only what the stream is *used for*. |

## Applied to rules_ocx and the fleet

`rules_ocx` is the fleet's only Bazel repository (shape A). Citations were
re-measured 2026-09-05 and the rows touched by this revision re-checked
2026-09-06.

**Satisfies today**

- **BZL-CI-01** — whole-repo `//...` on every job: `ci.yml:62` (`bazelisk test
  --verbose_test_summary -- //...`), `:91` (examples), `:124` (BCR parity build).
  A grep for `bazel-diff|target-determinator` across workflows, `.bzl`,
  `BUILD.bazel` and `MODULE.bazel` returns **0**. The default is what the repo
  already does, not a change.
- **BZL-CI-04** — `bazelisk` runs inside required checks at `ci.yml:62,91,124`,
  not only in setup.
- **BZL-CI-05** — the six jobs map onto the taxonomy exactly: `lint`
  (`ci.yml:17-32`) and `test` (`:34-62`) → a, b, both cache-wired at `:27-30` and
  `:53-56`; `bcr-parity` (`:93-141`) and `pin-completeness` (`:143-168`) → c;
  `offline` (`:170-199`) → d. No cold-store or parity job carries a cache step.
- **BZL-CI-06 MUST clause** — `ci.yml:98-100` and `ci.yml:171-172` each carry the
  rationale verbatim.
- **BZL-CI-07** — `task lint`'s first command is `bazel run //:buildifier.check`
  (`taskfile.yml:25`, task at `:22-34`) with no `|| true`, no scrape; CI calls it
  as the job's single `run:` (`ci.yml:31-32`). The one `continue-on-error` in the
  repo (`ci.yml:38`) sits under the comment "rolling is forward-compat early-warning
  only — never blocks" (`ci.yml:37`).
- **BZL-CI-08** — `8.7.0` and `9.x` both block; only `rolling` is advisory
  (`ci.yml:38,43`). The shape-A standard, met; the new named-consumer clause
  binds only on the shape-F advisory option this repo does not take.
- **BZL-CI-09** — every matrixed job sets `USE_BAZEL_VERSION` directly
  (`ci.yml:45,81,113,180`), first in bazelisk's precedence order. The one
  hand-written download (`ci.yml:138-141`) fetches a **pinned bazelisk v1.29.0**
  for the Rosetta leg and lets it resolve Bazel from `USE_BAZEL_VERSION` — the
  chain holds, and this is the edge the rule's last sentence exists for.
- **BZL-CI-12 — now measured, and it passes.** `.bazelignore` lists `examples`,
  `e2e`, `.agents/worktrees`; the earlier reading ("no lint step covers those
  trees") was wrong. `//:buildifier.check`'s runner walks the filesystem from
  `$BUILD_WORKSPACE_DIRECTORY` and lints them: a planted violation in
  `examples/project/BUILD.bazel` failed exactly as one in `ocx/private/versions.bzl`
  did, both exit **123**
  ([buildifier-gate-reach…:Q2](bazel-measurements/buildifier-gate-reach-and-generated-starlark.md)).
  What remains unverified is narrower and worth stating: the exit code cannot
  attribute a finding to a tree, and no CI log in this repo carries per-tree
  evidence — the only signal is the printed path. Whether those trees *should*
  be linted is a maintainer preference, not a rule question.
- **BZL-CI-15** — both lockstep invariants enforced: tag vs `MODULE.bazel`
  `version` at `release.yml:23-30`, and `task dist:check` calling
  `scripts/bump_ocx.py --check` (`taskfile.yml:64-71`) — the same code path the
  refresh validates with, stated in its own comment at `taskfile.yml:67-70`.
- **BZL-CI-16** — `DEFAULT_OCX_VERSION` plus the six `setup-ocx` pins
  (`ci.yml:26,52,88,120,187`, `release.yml:22`) move only through
  `scripts/bump_ocx.py`, run both by the weekly `update-dist.yml` cron
  (`:4-5`) and by `task lint`.
- **BZL-CI-18** — `publish.yaml:31-33` sets `draft: false` with the reason, under
  a machine PAT (`publish.yaml:36-39`).
- **BZL-CI-19** — `auth: ${{ github.event_name == 'push' && secrets.BAZEL_CACHE_AUTH || '' }}`
  appears verbatim at `ci.yml:30` and `ci.yml:56`; every PR lane evaluates to the
  empty string, so the write credential is never materialised there. No
  `--bes_backend` exists, so the BES half of the audit has nothing to reach.
- **BZL-CI-20** — zero `rbe_autoconfig`/`bazel-toolchains` hits anywhere.
- **[BZL-HERM-22](bazel-hermeticity-determinism.md) and
  [BZL-ARCH-29](bazel-architecture-monorepo.md)** — the docs-freshness exclusion
  names both the major and the reason at `ci.yml:57-60`, directly above the guard
  at `ci.yml:62`. The positive worked example for both rules, now that ARCH-29
  carries the carve-out.

**Violates today**

- **BZL-CI-06 SHOULD clause** — the `examples` job (`ci.yml:64-91`) has no cache
  step and no comment about it; the comment at `:73-75` explains the Bazel-9
  `include` rows, not the cache. A reader cannot tell it from an oversight
  ([build-contracts…:295](bazel-audit/build-contracts-and-ci-posture.md)).
- **BZL-CI-06 naming clause** — the `offline` job is named "Offline determinism"
  (`ci.yml:173`) and asserts three fetch outcomes (`ci.yml:188-199`); it compares
  zero action keys and would pass unchanged with a fully non-deterministic
  action ([BZL-HERM-23](bazel-hermeticity-determinism.md)).
- **BZL-CI-13** — the parity job reproduces `.bcr/presubmit.yml`'s 4 platforms ×
  2 majors (`ci.yml:106-111`), but no comment anywhere states the resulting **8**
  shards; the frame itself undercounted it as 4.
- **BZL-CI-17** — `.claude/rules/release.md:10-12` still says "BCR submission is
  manual for now … follow publish-to-bcr when automating", while
  `release.yml:53-63` has already wired the automated `publish-to-bcr` job.
- **BZL-CI-28**, and therefore **BZL-CI-02 step 1** — no
  `--incompatible_strict_action_env` pin exists in `.bazelrc` while the matrix
  spans 8.7.0 / 9.x / rolling ([BZL-HERM-01](bazel-hermeticity-determinism.md)),
  and no execution log is captured anywhere in the repo. Gate step 1 is unmet
  today. This is not a live problem — nothing selects targets here — but an
  adopting repo copying these patterns inherits an unmet gate step with them.
- **[BZL-MOD-02](bazel-bzlmod-and-repo-rules.md)** — re-measured: `grep -rn
  'lockfile_mode' .bazelrc* .github/ taskfile.yml` returns **0**. No leg fails on
  a stale `MODULE.bazel.lock`; no scheduled leg re-checks mutable registry data.
- **[BZL-CACHE-11](bazel-caching-rbe.md) / [-29](bazel-caching-rbe.md)** — zero
  `--remote_download_*` flags with a remote cache configured, and
  `--remote_timeout=60` (`.github/actions/remote-cache/action.yml:28`) matches
  the documented default with no comment, indistinguishable from an unstated
  defensive pin.

**Corrected since the first pass**

- **[BZL-CACHE-26](bazel-caching-rbe.md)** — this file previously read the
  absence of a fallback decision as leaving a cache outage a hard failure across
  `lint` and `test`. Measured, it is not: with no `--remote_executor` anywhere,
  a refused cache endpoint produces a WARNING, a full local build and exit 0
  regardless of either fallback flag. `rules_ocx` passes the rule's MUST half by
  accident — neither flag appears, so nothing false is cited — and what is
  genuinely absent is the *stated decision* about whether a silent local build
  is acceptable on those lanes.

**Cannot exhibit**

- **BZL-CI-11** — the repo has zero `cc_*`/`py_*`/`js_*`/`rust_*` targets
  ([build-contracts…:37](bazel-audit/build-contracts-and-ci-posture.md)), so
  there is nothing for a lint aspect to attach to; its four CLI linters
  (`actionlint`, `hawkeye`, `lychee`, plus buildifier as a real Bazel target,
  `taskfile.yml:22-34`) lint YAML, licence headers and links, none of which
  rules_lint covers. Correct absence, not a gap.
- **BZL-CI-10** — no `--migrate` job exists; the `rolling` leg serves the
  early-warning role instead.
- **BZL-CI-21 through -30** — no selection tool anywhere, and nothing in the
  fleet is near the threshold. **What the fleet would have to build to exhibit
  them**: a Bazelified `creeptd-ng`. At 13 `Cargo.toml`, 3 `package.json` and 3
  real build scripts
  ([fleet…:44-56,287](bazel-audit/fleet-bazel-readiness.md)), even a generous
  2-3 targets per workspace member puts it near 30-60 rule targets — an order of
  magnitude under BZL-CI-01's tripwire, and its whole-repo build finishes in
  minutes. No repo in this fleet is within reach.
- **BZL-CI-31 through -33** — `grep` for `bes_backend`, `bes_upload_mode`,
  `remote_build_event_upload` and `build_event` across `.bazelrc`, every
  workflow, every composite action and `taskfile.yml` returns **0**. No BES
  backend, no BEP capture, no dashboard. Correct absence; these rows are for the
  adopting repo that wires a results UI.
- **BZL-CI-03** has one live instance and it is not under Bazel's control the way
  the rule wants: the `examples` job builds against the **live `ocx.sh`
  registry** (`ci.yml:89`) — the fleet's only shared-external-service CI step.
  It is correctly uncached, which is the right treatment; it is also the job
  missing the comment (BZL-CI-06 above). The rule's real audience is the adopting
  repo, where `creeptd-ng`'s two `sqlx::query!` services with no committed
  `.sqlx/` cache
  ([fleet…:55-56,270](bazel-audit/fleet-bazel-readiness.md)) are the exact
  shape Canva had to convert first.

## Applied to the fleet shapes

- **A — Starlark ruleset publishing to the BCR (`rules_ocx`).** Every pipeline
  row binds and most are already met; the open items are BZL-CI-06's comment,
  BZL-CI-13's stated shard count, BZL-CI-17's stale runbook, the two absent
  gates (BZL-MOD-02, BZL-CI-28) and the unstated cache-outage decision. No
  selection row binds and none will; no BES row binds either.
- **B — Rust CLI + Python acceptance harness (`ocx`, `grimoire`, `ocx-mirror`,
  `bob`, `rust-oci-client`).** BZL-CI-04 is the whole of the family until a
  `MODULE.bazel` exists; on adoption, BZL-CI-05/07/08 land first and BZL-CI-01
  keeps them on whole-repo green indefinitely — `bob` (9 crates, no CI at all)
  is the cheapest place to stand the minimum job set up from nothing.
- **C — Rust + TypeScript monorepo (`creeptd-ng`).** The only shape that could
  ever approach BZL-CI-01's threshold, and still an order of magnitude below it.
  BZL-CI-03 binds hardest here: two services need a live Postgres to compile,
  and three JS toolchains in one repo mean the "convert before selecting" work
  is large and entirely upstream of any tool choice.
- **D — Python library or automation (`ocx-sdk-python`, `ocx-mirror-sdk`,
  `arcana/nox`, `index/bot-tools`, `ocx-indexbot`).** BZL-CI-04 only. Every one
  of these is a single-package project where whole-repo green is the *only*
  sensible pipeline; a selection tool here would be pure overhead.
- **E — TypeScript package, extension or Action (eight packages).** BZL-CI-04
  only, and two of the eight (`setup-ocx`, `kate-middlechild`) are bun-locked
  with no ingestion path at all — `bazel-adopt` says convert to pnpm or do not
  adopt, so the CI question never opens.
- **F — Future polyglot Bazel monorepo, and `rules_ocx`'s own users.** Every row
  binds; this shape is the family's real audience. BZL-CI-02 and BZL-CI-03 are
  the two that decide whether anything after them is trustworthy, BZL-CI-11 is
  the only place the aspect-lint mechanism ever applies, and BZL-CI-31/32/33 are
  the only place a BES backend is likely to appear.

## AI-agent failure modes

Ranked by how often the corpus shows it actually happening.

1. **Reading a mode string or a job name as the gate's behaviour.**
   `lint_mode="warn"` still exits nonzero; "Offline determinism" compares no
   action keys. Two independent wave-1 passes made the first mistake before a
   source-level trace corrected it. *Check:* seed one violation, run the target,
   read `$?` — never the attribute name, and never expect a specific number: a
   `find | xargs` runner remaps it to 123. For a job: read every assertion in the
   body against every word in the title.
2. **Copying `bazel.build/remote/ci`'s `rbe_autoconfig`/`bazel-toolchains`
   snippet into a fresh Bzlmod repo.** The page is Bazel's own, current, and
   dead on any Bazel 9 repo. *Check:*
   `grep -rn 'rbe_autoconfig\|bazel-toolchains' WORKSPACE* MODULE.bazel* .bazelrc*`
   — any hit is dead on arrival.
3. **Reaching for `--fineGrainedHashExternalRepos` for every "external repo
   changed but wasn't flagged" complaint.** That flag names the miss class
   explicitly, so it reads as *the* fix, while `--useCquery`'s description
   ("more accurate build graph") reads as a generic quality knob — but both
   close it, and only one needs a list somebody maintains. *Check:* run
   `bazel-diff -v generate-hashes …` and read the literal `Executing Query:`
   line. `deps(//...:all-targets)` means cquery mode is already on and an
   allow-list would be redundant maintenance surface, not a fix.
4. **Assuming `bazel-diff`'s default mode is `cquery`-based** because
   `target-determinator`, its most co-mentioned peer, works that way.
   `bazel-diff` defaults to plain `bazel query`; `--useCquery` is opt-in and
   needs Bazel ≥6.2.0. *Check:* does the invocation pass `--useCquery`? If not,
   describe it as an over-approximation of configuration effects, not an exact
   one.
5. **Paraphrasing a blog's number into a rule's rationale instead of quoting the
   sentence around it.** This program has now had to re-fetch a primary page
   twice for the same class of error: Tinder's 93% (a composite of two
   mechanisms) and Canva's a11y job count (an aggregate over 13,947 commits and
   a *projected* ~5x, not a measured 67,145-to-1 collapse). *Check:* any number
   crossing from a blog into a rationale carries its surrounding sentence
   verbatim in the citation, so the next re-read catches drift without a fetch.
6. **Quoting "93 percent CI time reduction" as `bazel-diff`'s number alone.**
   The figure is `bazel-diff` **plus** Buildkite dynamic pipelines, "a 54%
   improvement over Bazel-diff alone". *Check:* does the sentence citing 93% also
   name the second mechanism? If not it drops half the causal story.
7. **Attributing "is incorrect and will sometimes miss affected targets" to
   `bazel-diff`'s own README.** Zero matches in the current README and in a
   repository-wide code search; the phrase is Aspect's 2022 blog. *Check:* before
   quoting any tool's "own admission", grep the actually-fetched document for the
   exact string.
8. **Quoting "~300 targets" as an industry threshold.** No source publishes one;
   five were checked, and Aspect's own anchor (2M SLOC, 500 engineers, still on
   whole-repo shared green) argues against one existing at this scale. *Check:*
   name the source of the number. If the answer is "this program derived it from
   one team's stated context", say that in the same sentence.
9. **Treating an empty diff or "zero impacted targets" as proof nothing
   changed.** *Check:* name which of the tool's own documented exclusions could
   produce that exact output for a real change, and which flags were in effect —
   including `-before-query-error-behavior`, whose default silently degrades a
   failed "before" query to build-all.
10. **Reading a quiet advisory leg as "nothing needed action".** A
    `continue-on-error` job reports the workflow run as passed; Bazel's own CI
    excludes soft-failed steps from its one automated consumer. *Check:* name the
    human, rotation or digest that reads a red run on that leg. No name means no
    signal.
11. **Citing exit 39 as the CI signal for an evicted cache blob.** Measured over
    ten invocations across two majors: the condition fires reliably and the exit
    code is 0 (self-healed) or a generic 1 (retries disabled), never 39.
    *Check:* does the retry or alerting logic match on an exit code or on the
    `lost inputs` error text? Matching on 39 never fires.
12. **Charting `action_cache_statistics.hits` as a remote cache hit rate.** That
    message is the local, on-disk action cache; it can read 100% with zero remote
    traffic. *Check:* which proto field feeds the chart, and does the chart's
    label match it?
13. **Adding `--aspects=` without `fail_on_violation`.** A bare aspect build
    produces report files under `bazel-out` and fails nothing. *Check:*
    `grep -n 'fail_on_violation\|lint_test' .bazelrc* BUILD*` alongside every
    `--aspects=` flag.
14. **Undercounting a registry-parity job as "platforms" alone.** The BCR schema
    requires a `bazel` field per task. *Check:* multiply the arrays, do not add
    them — this program's own frame got it wrong once.
15. **Carrying a 2022-era description of a selection tool's flag surface
    forward.** `bazel-diff` has since added a persistent `serve` mode, an
    S3-backed shared cache, Firecracker snapshot warmup, four flags and a
    `mod show_repo` MODULE.bazel diff. *Check:* `bazel-diff --help` against every
    flag name before citing it — and do not present `--includeTargetType` as a
    correctness mitigation; it changes the output schema only.
16. **Citing `last_downstream_green` as a live `.bazelversion` value.** Removed;
    the README says so in one sentence a pre-removal training snapshot cannot
    carry. *Check:* `grep -rn 'last_downstream_green'`.
17. **Treating `bazelisk --migrate` as gateable.** It emits a per-flag report,
    not a pass/fail. *Check:* does the workflow *require* that job's status, or
    only archive its output? Requiring it is the tell.
18. **Proposing a BwoB / `--remote_download_*` flag as the fix for a slow or
    incorrect selection setup.** That family governs how much of a build's output
    is materialised locally; it has no bearing on which targets get selected.
    *Check:* does the proposed flag change what is *selected*, or what is
    *downloaded* after selection already ran?
19. **Hand-rolling a second implementation of a lockstep check "to keep it
    simple".** Two implementations of one invariant can diverge; one
    implementation called from two triggers cannot. *Check:* does the new
    verification call the same function the refresh path calls, or duplicate its
    logic?
20. **Proposing a Bazel-native "affected targets" flag** because one feels like
    it should exist. *Check:* `bazel help query 2>&1 | grep -i affected` — no
    built-in exists; #7962 has been open since 2019.

## Open questions

**Needs a human decision (the owner's)**

- Is the `examples` job's missing cache step deliberate (live-registry
  dogfooding must not be masked, the same logic `bcr-parity` states) or an
  oversight? Only the maintainer knows. Either add the four-line composite-action
  call or add the comment — `ci.yml:64-91`.
- Does `rules_ocx` adopt [BZL-MOD-02](bazel-bzlmod-and-repo-rules.md)'s lockfile
  freshness gate? Rated MUST at the family level, absent here, no reported
  incident in the repo's life. That is a risk-acceptance call, not a research
  question.
- Does the stale `.claude/rules/release.md:10-12` get fixed in `rules_ocx`, and
  by whom? It is a one-line edit in another repo, outside this artifact's write
  scope.
- Is a silent local build acceptable on `lint` and `test` when
  `bazel-cache.ocx.sh` is unreachable? Measured, that is what happens today and
  no flag changes it ([BZL-CACHE-26](bazel-caching-rbe.md)); the rule asks only
  that the decision be stated, and nobody has stated it.

**Deserves another research round**

| Subarea | Exact question |
|---|---|
| `--useCquery` cost at scale | Does `--useCquery`'s transitive `deps()` query stay affordable on a repo with tens of thousands of targets and a real `pip`/`rules_jvm_external`-shaped extension? The measurement that shows it closing the repository-rule miss class ran on one small scratch repro; `cquery`'s per-revision cost is the stated reason `target-determinator` exists, and BZL-CI-30's trade-off turns entirely on this number. |
| `mod show_repo`'s own gaps | bazel-diff PR #322 catches a `bazel_dep` version bump in default mode on Bazel 8.6.0+/9.0.1+. Does it catch a **module extension tag** change, as opposed to a version string in the module's own resolved definition? The PR body scopes itself to "adding a new bazel_dep or changing a version"; nothing tests the wider shape. |
| Owned advisory legs | Is a `continue-on-error` leg with a named owner or scheduled digest actually acted on? BZL-CI-08's ownership clause generalises from first-hand accounts of unowned red *required* CI — one inferential step from advisory legs, which are a strictly weaker signal. |
| Selection under remote execution | Exit-39 and cache-outage behaviour were measured only in the cache-only shape (no `--remote_executor` was available). Does a downed cache alongside a live executor still degrade to a local build and exit 0, and does the eviction path reach exit 39 there? BZL-CI-02 step 4 assumes the cache-only answer generalises. |

**M-F rows and their state**

All fourteen family-F rows are settled by a rule above. **M-F-09** (does CI lint
the BUILD files `.bazelignore` removes from the package graph?) is settled twice
over: as a standard by BZL-CI-12, and now as a fact for this fleet's runner shape
by direct measurement — `//:buildifier.check`'s `find`-based runner does reach
`examples/` and `e2e/`, with the same exit code as an in-graph tree. The rule
still says *measure*, because the answer is a property of the runner, not of
Bazel: a graph-scoped lint gate over `//...` cannot reach an ignored tree at all.

## Sub-artifacts

Wave-3b dives (2026-09-05):

- [`target-selection-and-the-determinism-precondition.md`](bazel-ci-and-target-selection/target-selection-and-the-determinism-precondition.md)
  — what each tool actually diffs, the two documented miss classes, the
  provenance error in the map's own tie-breaker, Tinder's composite 93 percent,
  Canva's sequencing, and the five-step determinism gate built from wave-2 IDs.
  15 sources, 11 primary.
- [`ci-matrix-gates-and-release-flow.md`](bazel-ci-and-target-selection/ci-matrix-gates-and-release-flow.md)
  — the matrix shape that earns its cost, the aspect lint mechanism and the flag
  that makes it a gate, registry parity's real shard count, the deterministic
  text guard, the three jobs that refuse help, bazelisk's version grammar, and
  the two release-lockstep invariants. 17 sources, 10 primary. Its §10 is the
  pipeline-assembly table this file's Verdict 5 corrects.

Follow-ups and measurements folded in 2026-09-06 (this file commissioned the
first; the rest were commissioned by sibling families and touch these rows):

- [`bazel-followups/ci-selection-tool-mitigations-and-advisory-legs.md`](bazel-followups/ci-selection-tool-mitigations-and-advisory-legs.md)
  — the four-combination `bazel-diff` scratch experiment that shows `--useCquery`
  closing the repository-rule miss class, the `mod show_repo` default-mode fix,
  the miss-class comparison table, the measured emptiness of an unowned advisory
  leg, and the three-source threshold re-check that corrects Canva's a11y figure.
- [`bazel-followups/cache-server-capabilities-repo-cache-gc-and-bes.md`](bazel-followups/cache-server-capabilities-repo-cache-gc-and-bes.md)
  — the BES flag survey, the shared credential surface (kept by `BZL-CACHE`),
  and the three CI-side rows forward-declared as NEW-CI-1/2/3 and adopted here
  as BZL-CI-31/32/33.
- [`bazel-followups/adoption-go-no-go-gate-and-coupling-query.md`](bazel-followups/adoption-go-no-go-gate-and-coupling-query.md)
  — the verified 31.23%/27.76% denominators, the traced ~11% abandonment figure,
  and the negative result that fixes BZL-CI-01's provenance: no source publishes
  a target-count threshold.
- [`bazel-followups/diagnosis-procedures-profiling-and-execlog-tooling.md`](bazel-followups/diagnosis-procedures-profiling-and-execlog-tooling.md)
  — cited for the 8.x/9.0 boundary on the lost-input exit-code flag and for the
  execution-log tooling ownership BZL-CI-28 leans on. The procedure itself
  belongs to `bazel-diagnose`; nothing here restates it.
- [`bazel-measurements/exit-39-and-bwob-on-cache-only-build.md`](bazel-measurements/exit-39-and-bwob-on-cache-only-build.md)
  — ten invocations across two majors showing exit 39 never surfacing, and all
  four fallback-flag combinations leaving a refused cache non-fatal.
- [`bazel-measurements/buildifier-gate-reach-and-generated-starlark.md`](bazel-measurements/buildifier-gate-reach-and-generated-starlark.md)
  — the runner's real `find | xargs` shape, the 123 exit-code remap, and the
  planted-violation proof that `.bazelignore`'d trees are linted.
- [`bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md`](bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md)
  — every flag default read from the 8.7.0, 8.8.0 and 9.2.0 binaries, including
  `--incompatible_strict_action_env`'s 8→9 flip and the two flags removed at 9.0.0.

## Key sources

| URL | What it is | Era | Why worth reading |
|---|---|---|---|
| [github.com/Tinder/bazel-diff README](https://github.com/Tinder/bazel-diff/blob/master/README.md) | Primary — the tool's own docs, fetched in full | v46.1.0, 2026-08-28 | Every current flag, the hash mechanism, and the `serve`/`warmup`/`fingerprint` surface a 2022-era summary misses |
| [github.com/bazel-contrib/target-determinator README](https://github.com/bazel-contrib/target-determinator/blob/main/README.md) | Primary — the tool's own docs | v0.34.0, 2026-06-19 | The `cquery`-based design, the verbatim cache-key exclusions BZL-CI-22 rests on, and `-before-query-error-behavior`'s safe-fallback default |
| [Tinder/bazel-diff issue #134](https://github.com/Tinder/bazel-diff/issues/134) | Primary — issue tracker, full thread | 2022-05-19 → 2023-03-01 | The reproducible repo-rule miss class, maintainer-confirmed as expected behaviour, and target-determinator's founding motivation stated in the same thread |
| [Tinder/bazel-diff PR #322](https://github.com/Tinder/bazel-diff/pull/322) (fixing [#255](https://github.com/Tinder/bazel-diff/issues/255)) | Primary — merged PR | current | `mod show_repo`-based MODULE.bazel diffing in **default** mode on Bazel 8.6.0+/9.0.1+ — a narrower fix than #134's, new to this corpus |
| [bazelbuild/bazel issue #7962](https://github.com/bazelbuild/bazel/issues/7962) | Primary — Bazel core tracker | open 2019-04-05 → 2024-02-28 | Confirms no native target-diffing primitive exists; every tool here is third-party by necessity |
| [bazel.build/query/cquery](https://bazel.build/query/cquery) | Primary — Bazel reference | current | The defining query-vs-cquery sentence both tools are built on |
| [bazel.build/remote/ci](https://bazel.build/remote/ci) | Primary — official Bazel docs, **stale** | fetched 2026-09-05 | The verbatim `rbe_autoconfig`/`bazel-toolchains` WORKSPACE snippet BZL-CI-20 exists to reject |
| [github/docs — workflow-syntax.md](https://github.com/github/docs/blob/main/content/actions/reference/workflows-and-actions/workflow-syntax.md) | Primary — GitHub's own docs source | fetched 2026-09-06 | `continue-on-error` reports the job/workflow as **passed** — the mechanism that empties BZL-CI-08's advisory option without a named consumer |
| [bazelbuild/continuous-integration — buildkite/bazelci.py](https://github.com/bazelbuild/continuous-integration/blob/master/buildkite/bazelci.py) | Primary — Bazel's own CI source | fetched 2026-09-06 | `soft_fail` excluded from `try_update_last_green_commit`, its only automated consumer, plus the team's own "come up with a better detection mechanism" TODO |
| [bazelbuild/bazelisk README](https://github.com/bazelbuild/bazelisk/blob/master/README.md) | Primary — the tool's own docs | `master`, 2026-09-05 | Version-selection precedence, the accepted `.bazelversion` grammar, `--migrate`'s report semantics, and the `last_downstream_green` removal |
| [aspect-build/rules_lint docs/linting.md](https://github.com/aspect-build/rules_lint/blob/main/docs/linting.md) | Primary — mechanism doc | `main`, 2026-09-05 | The exact `--aspects=` + `fail_on_violation` gate, `lint_test`, and the `no-lint` / `lint-genfiles` tags |
| [bazel-central-registry docs/README.md](https://github.com/bazelbuild/bazel-central-registry/blob/main/docs/README.md) | Primary — BCR's own contribution docs | `main`, 2026-09-06 | The `presubmit.yml` schema (`platform` × `bazel`), and the attributed `@bazel-io skip_check` that replaces a standing soft-fail |
| [bazel-contrib/publish-to-bcr README](https://github.com/bazel-contrib/publish-to-bcr/blob/main/README.md) | Primary — the workflow's own docs | `main`, 2026-09-05 | The draft-mode default and exactly why a bot PAT needs `draft: false` |
| [bazel `build_event_stream.proto`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/buildeventstream/proto/build_event_stream.proto) + [`action_cache.proto`](https://github.com/bazelbuild/bazel/blob/master/src/main/protobuf/action_cache.proto) | Primary — the wire schema itself | `master`, 2026-09-05 | `remote_cache_hits` is `[deprecated = true]`; the only clean remote-scoped boolean is test-only — the whole of BZL-CI-32 |
| `bazel help build --long` on the 8.7.0 and 9.2.0 binaries | Primary — measured on this host, WSL2 | 2026-09-06 | The five BES flag names and defaults, identical on both majors; `--remote_build_event_upload`'s verbatim `bytestream://` sentence |
| [aspect.build/blog/monorepo-shared-green](https://aspect.build/blog/monorepo-shared-green) | Argued — practitioner blog (Alex Eagle) | 2022-08-08 | The actual source of "bazel-diff is very incorrect", and the 2M-SLOC/500-engineer anchor arguing no target-count threshold exists at fleet scale |
| [aspect.build/blog/keeping-main-green](https://aspect.build/blog/keeping-main-green) | Argued — practitioner blog (Alex Eagle) | 2024-06-21 | "is anyone looking at the red CI?" / "there is often no clear ownership" — the failure mode BZL-CI-08's consumer clause names |
| [aspect.build/docs/workflows/features/delivery/](https://aspect.build/docs/workflows/features/delivery/) | Primary — vendor product docs | current, 2026 | Selective Delivery: a post-build output-digest model distinct from both named tools, and the basis for BZL-CI-29 |
| [canva.dev — Faster CI builds at Canva](https://www.canva.dev/blog/engineering/faster-ci-builds-at-canva/) | Argued, first-party — dated sequencing, **estimated** magnitudes | 2024-07-30 | The hermeticity-first sequencing BZL-CI-03 encodes, and the "67145 jobs for 13947 commits… 5x" sentence that corrects this file's earlier reading |
| [Zheng, Adams & Hassan — Does Using Bazel Help Speed Up CI Builds?](https://arxiv.org/abs/2405.00796) | Primary — peer research, 383 projects | 2024 | The 31.23% / 27.76% numbers behind BZL-CI-04, with the denominator verified as the CI-adopting subset |
| [Buildkite — How Tinder built and open-sourced bazel-diff](https://buildkite.com/resources/webinars/how-tinder-built-and-open-sourced-bazel-diff-to-transform-their-ci-cd-at-scale/) | Secondary — vendor webinar, first-party numbers | 2025/2026 | The disaggregated 93% / 54% split and the 300-target / 40-60-minute context BZL-CI-01's tripwire derives from, re-fetched with zero drift |

## Revision log

One line per change made on 2026-09-06, folding in four follow-up dives and three
measurement clusters. Rule IDs are stable: no number was reused, reordered or
retired.

- **Verdict 1 rewritten, BZL-CI-01 rewritten** — the ~40 min / ~300 target line
  is now stated as this program's **derived tripwire**, not a sourced threshold.
  Five primary sources give no target-count threshold and Aspect's 2M-SLOC anchor
  argues against one existing; Tinder's numbers re-check verbatim as *that team's
  pre-adoption state*. Added a finding clause for citing either number as an
  industry line. Source: `adoption-…` Q2, `ci-selection-…` Q4 (both measured
  against primary pages).
- **Verdict 3 and 4 extended** — the "very incorrect" provenance and the
  93%/54% split were independently re-fetched with zero drift; both now say so.
  Source: `ci-selection-…` Q4.
- **Verdict 5 rewritten** — the BZL-ARCH-29 conflict this file raised is
  resolved on the ARCH side; the verdict and the cross-reference row now record
  the carve-out's landed text instead of the disagreement. Source:
  `bazel-architecture-monorepo.md` BZL-ARCH-29 (revised 2026-09-06).
- **Verdict 7 extended, BZL-CI-08 rewritten** — the shape-F advisory option now
  requires the comment to **name a consumer**, with a matching verification
  clause ("EMPTY plus no comment naming both the choice and a consumer =
  finding"). Four independent primary sources converge: GitHub's own
  conclusion semantics, `bazelci.py`'s exclusion of `soft_fail` from its one
  automated consumer plus its own TODO, BCR's attributed-skip alternative, and a
  named practitioner account of unowned red CI. Source: `ci-selection-…` Q3.
- **Verdict 12 rewritten, BZL-CI-03 rationale corrected** — the Canva a11y
  figure is the blog's own pre-migration estimate ("67145 jobs for 13947
  commits… reduce by 5x"), not a measured 67,145-to-1 collapse. The
  "first-party measured numbers" framing is withdrawn for that figure; severity
  stays SHOULD because the dated sequencing is not falsified, and the severity
  cell now says exactly what is measured and what is estimated. Source:
  `ci-selection-…` Q4 (exact primary-source text).
- **Verdict 13 rewritten** — "Bazel 7.0: exit 39 registered, unconditional" was
  a true statement doing false work. Exit 39 exists on both majors but **never
  surfaced** across ten invocations and five configurations; the caller sees 0
  (self-healed) or a generic 1. An unreachable cache is likewise non-fatal in
  the cache-only shape under all four fallback-flag combinations. Both now cite
  [BZL-CACHE-12](bazel-caching-rbe.md) and
  [BZL-CACHE-26](bazel-caching-rbe.md)'s current text. Added the measured BES
  flag defaults, the 8.x/9.0 boundary on
  `--incompatible_remote_use_new_exit_code_for_lost_inputs`, and bazel-diff's
  `mod show_repo` floor. Source: `exit-39-…` Q4/Q7, `flag-defaults-…` Q1,
  `diagnosis-…`, and a local `help build --long` read of both binaries.
- **BZL-CI-02 step 4 rewritten** — "cache-eviction handled" now reads "recognised
  by its error text and its retry default left alone"; a gate step written around
  exit 39 would never fire. Source: `exit-39-…` Q4.
- **BZL-CI-07 extended** — added the `find | xargs` 123 remap and "assert
  nonzero, not a number", so the rule stops implying a readable exit code.
  Source: `buildifier-gate-reach-…` Q1.
- **BZL-CI-12 rewritten, premise inverted** — the old rule assumed a lint gate
  might not reach an ignored tree and that a green run is the signal. Measured:
  `//:buildifier.check`'s `find`-based runner **does** lint `examples/` and
  `e2e/`, with the same exit code (123) as an in-graph tree. The rule now asks
  the question in both directions (a filesystem walk crosses the boundary, a
  graph-scoped `lint_test` cannot), and says the exit code attributes nothing —
  read the printed paths. Severity unchanged (SHOULD). Source:
  `buildifier-gate-reach-…` Q2.
- **BZL-CI-19 extended** — the identical-spelling secret audit now names
  `--bes_backend` as a second consumer of the same credential, pointing at
  [BZL-CACHE-33](bazel-caching-rbe.md) rather than restating it.
- **BZL-CI-21 rewritten, SHOULD → MUST** — `--useCquery` alone closes the
  repository-rule/module-extension execution miss, measured across four flag
  combinations on a `use_repo_rule` repro (default mode: byte-identical hashes;
  both flags independently: caught). The rule now names two mitigations instead
  of one, adds the `bazel-diff -v` `Executing Query:` check, and notes the
  `mod show_repo` default-mode fix as a *different*, narrower class. Promoted to
  MUST because the miss stopped being a documented gap and became a measured one
  with a silent failure mode. Source: `ci-selection-…` Q1.
- **BZL-CI-22 extended** — added that `-bazel-opts`/`-bazel-startup-opts` **are**
  in the results-cache key, and that this tool errs toward over-reporting, the
  opposite direction from BZL-CI-21's miss. Re-checked against the current
  `--help` with zero drift. Source: `ci-selection-…` Q2.
- **BZL-CI-23 extended** — `--excludeExternalTargets` means two different things
  per subcommand, and it is a crash class, not a staleness class; do not cite it
  as a BZL-CI-21 mitigation. Source: `ci-selection-…` Q1.
- **BZL-CI-24 extended** — noted that `target-determinator` publishes no
  `--alwaysAffectedTags` equivalent, so the same target class needs a different
  answer there. Source: `ci-selection-…` Q2 miss-class table.
- **BZL-CI-25 extended** — added `-before-query-error-behavior` (default
  `ignore-and-build-all`) to the named flag list; a failed "before" query
  degrades silently to build-all. Source: `ci-selection-…` Q2 (current `--help`).
- **BZL-CI-26 extended** — `--includeTargetType` is output-schema only and must
  never be cited as a correctness mitigation; added the `mod show_repo` addition
  to the flag-churn list. Source: `ci-selection-…` Q1.
- **BZL-CI-28 rationale extended** — the 8→9 `--incompatible_strict_action_env`
  flip is now cited as measured from the 8.7.0/8.8.0/9.2.0 binaries rather than
  inferred from source tags. Source: `flag-defaults-…` Q1.
- **BZL-CI-30 rewritten** — the trade-off is no longer "allow-list or switch
  tools". With `--useCquery` measured to close the same class without an
  allow-list, the decision is a query-cost trade-off, and the row says so; the
  maintainer's own first-hand claim in the #134 thread is now quoted. Stays
  CONSIDER (informal, unbenchmarked, and the cost side is untested). Source:
  `ci-selection-…` Q1/Q2.
- **BZL-CI-31, -32, -33 added** — the cache-server follow-up's forward-declared
  NEW-CI-1/2/3, adopted here per its own family split (`BZL-CACHE` keeps the
  credential surface as BZL-CACHE-33). `--bes_upload_mode` per lane (SHOULD),
  the BEP cache-hit-rate field trap (MUST), and the
  `--remote_build_event_upload=minimal` `bytestream://` trap (MUST where a
  consumer dereferences). All five flag names and defaults re-measured from both
  binaries' own `help build --long` rather than read from the docs. Source:
  `cache-server-…` Q3 plus a local binary read.
- **Applied-to-fleet: BZL-CI-12 moved Violates → Satisfies**, with the
  measurement and the narrower residue (no per-tree attribution in any exit code
  or CI log). A new "Corrected since the first pass" block records that the
  cache-outage entry under BZL-CACHE-26 was wrong: the repo passes that rule's
  MUST half by accident, and what is missing is the stated decision. A
  "Cannot exhibit" entry added for BZL-CI-31/-33 (zero BES hits, verified).
- **Open questions pruned** — all three research rows are answered and removed:
  selection-tool mitigations (Q1/Q2), lint reach past `.bazelignore` (the
  measurement), advisory-leg consumption (Q3). Four new rows replace them, each
  a residue the answering source itself declared unsettled. A fourth owner
  question was added: state the cache-outage decision.
- **Verdict 15 added** — the five established gaps (no published threshold,
  `--useCquery` cost untested, no measurement of an *owned* advisory leg, the
  cache-only-shape limit on the exit-39 and outage results, and the unverifiable
  allow-list) are recorded as documented gaps rather than left implicit.
- **AI-agent failure modes grew from 14 to 20** — added: reaching for the
  allow-list when cquery mode may already be on (with the `Executing Query:`
  check); paraphrasing a blog number instead of quoting its sentence (twice
  now); quoting ~300 targets as an industry threshold; reading a quiet advisory
  leg as "nothing needed action"; citing exit 39 as a CI signal; charting
  `action_cache_statistics` as a remote hit rate.
- **Frontmatter** — `consolidates` gained the four follow-ups and three
  measurements; `builds_on` gained BZL-CACHE-33 and BZL-HERM-13 and notes the
  BZL-ARCH-29 carve-out; `grounded_in` now names all seven frame Corrections
  blocks with the Measurement wave winning; `revised: 2026-09-06` added.

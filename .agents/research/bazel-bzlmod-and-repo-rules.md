---
title: "BZL-MOD — modules, lockfile, extensions, repository rules, BCR"
topic: bazel-bzlmod-and-repo-rules
family: BZL-MOD
model: opus
consolidates:
  - bazel-bzlmod-and-repo-rules/module-file-and-lockfile-hygiene.md
  - bazel-bzlmod-and-repo-rules/module-extension-purity-and-repo-contents-cache.md
  - bazel-bzlmod-and-repo-rules/repository-rule-hermeticity-and-bcr.md
  - bazel-followups/repository-rule-and-extension-offline-testing.md
  - bazel-followups/adoption-go-no-go-gate-and-coupling-query.md
  - bazel-measurements/module-extension-purity-and-tidy-dynamic-check.md
  - bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md
  - bazel-followups/bcr-playbook-flag-archaeology-rewind-and-js-gaps.md
  - bazel-measurements/arch-live-graph-generated-semantics-and-lockfile-error.md
grounded_in:
  - bazel-audit/config-inventory.md
  - bazel-audit/starlark-code-shape.md
  - bazel-audit/build-contracts-and-ci-posture.md
  - bazel-audit/fleet-bazel-readiness.md
  - bazel-topic-map.md (How to read this; Conflicts resolved; The map §B, 22 rows; Selected for wave 2 §Group 2)
  - bazel-frame.md (body + Corrections)
date: 2026-09-05
revised: 2026-09-06
revised_wave5: 2026-09-06
---

# BZL-MOD

## Verdict

1. **The lockfile is a generated file with exactly two hand-editable fields, and
   everything else about it is machine business.** `registryFileHashes` and
   `selectedYankedVersions` may be merged by keeping both sides; every other
   field is reset-and-regenerate
   ([module-file-and-lockfile-hygiene.md:186-195](bazel-bzlmod-and-repo-rules/module-file-and-lockfile-hygiene.md)).
   This is Bazel's own documented procedure, and it is the only one that does
   not require the editor to understand what a digest means. Bazel 7/8/9.
2. **A lockfile version mismatch is not "stale", it is "absent".** Bazel reads
   `lockFileVersion` with a regex before parsing, and on any mismatch returns
   `EMPTY_LOCKFILE` and silently re-resolves the whole graph — in every mode
   except `error`, which alone raises a named message
   ([module-file-and-lockfile-hygiene.md:153-173](bazel-bzlmod-and-repo-rules/module-file-and-lockfile-hygiene.md)).
   That single mechanism is why the CI gate (BZL-MOD-02) and the version-bump
   rule (BZL-MOD-06) exist at all: without them a full re-resolution hides
   inside a routine version bump with nothing printed anywhere.
3. **No artifact may cite a lockfile schema version, and the schema moves
   *inside* the 8.x line.** Measured five ways: docs example `10`, the fleet's
   Bazel-8.7.0 lock `24`, current `bazelbuild/bazel` master
   `LOCK_FILE_VERSION = 28`
   ([module-file-and-lockfile-hygiene.md:139-151](bazel-bzlmod-and-repo-rules/module-file-and-lockfile-hygiene.md)),
   and — new, from running `bazel mod deps` on the three pinned binaries — **28
   on 8.8.0 as well as on 9.2.0**, with the top-level `factsVersions` key
   appearing at 8.8.0 too
   ([flag-defaults-and-trivial-builds-across-versions.md § Q6](bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md)).
   The jump is a **Maintenance-release** event, not a Bazel-9 event: 8.7.0 → 8.8.0
   crosses the exact same schema boundary as 8.7.0 → 9.2.0, so "stay on 8.x" buys
   no lockfile-format stability at all. The schema's *shape*, not only its number,
   moves under documentation's feet.
4. **`reproducible = True` on an extension and `repo_metadata(reproducible =
   True)` on a repository rule are two different APIs on two different objects,
   gating two different things — and the frame conflates them.** The frame's
   correction 2 says `--repo_contents_cache` is "gated on a module extension's
   `reproducible = True`". It is not: the extension flag buys lockfile
   exclusion only; both Bazel-9 repo-contents caches key off the repo rule's
   own `repository_ctx.repo_metadata()`, introduced in Bazel **8.3.0**
   ([module-extension-purity-and-repo-contents-cache.md:84-93](bazel-bzlmod-and-repo-rules/module-extension-purity-and-repo-contents-cache.md)).
   Correction recorded; BZL-MOD-15 and BZL-MOD-16 are split along that line.
5. **`--repo_contents_cache`'s default is version-gated, and it is now
   measured rather than inferred.** It shipped on-by-default in 8.3.0, was
   walked back to opt-in in 8.4.0 after a real regression (`archive_override`
   stripping non-directory files, #26450), and the 9.0.0 notes restate the
   original "Added … defaults to" line with no mention of the walkback
   ([module-extension-purity-and-repo-contents-cache.md:54,326](bazel-bzlmod-and-repo-rules/module-extension-purity-and-repo-contents-cache.md)).
   Read off the pinned binaries: **`""` (disabled) on 8.7.0 and 8.8.0 — the
   walkback is not undone anywhere in the 8.x line — and enabled on 9.2.0**,
   deriving from `{--repository_cache}/contents`, confirmed by a populated cache
   directory after a fetch with no flag passed
   ([module-extension-purity-and-tidy-dynamic-check.md § Q3](bazel-measurements/module-extension-purity-and-tidy-dynamic-check.md),
   [flag-defaults-and-trivial-builds-across-versions.md § Q1](bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md)).
   No source states the re-enablement; it is a genuine, undocumented,
   version-gated default change. Two consequences: BZL-MOD-16 moves CONSIDER →
   SHOULD, and BZL-MOD-33 exists because a derived default that lands inside the
   main repo is a hard, named 9.x error.
6. **`getenv()` is cache invalidation, not a sandbox, and `ctx.execute()`
   defeats the whole inventory.** Local `execute()` seeds the child's
   environment from the Bazel server's *full ambient environment* and only then
   applies `environment=`
   (`StarlarkBaseExternalContext.java:2103`;
   [repository-rule-hermeticity-and-bcr.md:106-129](bazel-bzlmod-and-repo-rules/repository-rule-hermeticity-and-bcr.md)),
   and `--repo_env`'s own doc says it outright: *"repository rules see the full
   environment anyway"*. So the fleet's own convention — "a `getenv` for every
   var consulted" (`rules_ocx/.claude/rules/starlark.md:10-12`) — is asserted,
   not verifiable, for any rule that shells out. The ruleset splits it: a
   mechanical tier that a grep enforces (BZL-MOD-20, BZL-MOD-21) and a
   documentation tier that a review enforces (BZL-MOD-23). Remote execution is
   the only clean-room path and is not generally available for repo rules.
   Re-grounded on the other side of the same boundary: `getenv()` alone is
   **necessary and sufficient** to register the re-fetch dependency —
   `bazel.build/external/repo` joins `getenv()` and `environ=` with **"or"**, and
   `environ=` is marked `Deprecated. Migrate to repository_ctx.getenv` in the
   8.7.0-pinned *and* the current API doc, identical wording
   ([repository-rule-and-extension-offline-testing.md § Q4](bazel-followups/repository-rule-and-extension-offline-testing.md)).
   Pairing the two is not belt-and-suspenders; it is a tell that the snippet came
   from stale source material.
7. **Two Bazel-8.0 flips are permanent and change what old code means.**
   `--incompatible_no_implicit_watch_label` (a `Label` attr no longer
   auto-watches; still a live revertible flag) and
   `--incompatible_use_plus_in_repo_names` (`~` → `+`, flipped **and**
   immediately made a no-op, with no way back)
   ([repository-rule-hermeticity-and-bcr.md:131-137,189-201](bazel-bzlmod-and-repo-rules/repository-rule-hermeticity-and-bcr.md)).
   Every pre-2026 example an agent has memorised is wrong on both counts. Bazel
   8 and 9.
8. **`compatibility_level` is a resolver no-op and a registry gate at the same
   time, and the registry wins for anyone publishing.** The two dives graded
   this differently — CONSIDER
   ([module-file-and-lockfile-hygiene.md:311-314](bazel-bzlmod-and-repo-rules/module-file-and-lockfile-hygiene.md))
   versus MUST-when-publishing
   ([repository-rule-hermeticity-and-bcr.md:376-379](bazel-bzlmod-and-repo-rules/repository-rule-hermeticity-and-bcr.md)).
   **Resolved for the second**: the consequence is mechanical and blocking —
   `bcr_validation.py` diffs the field against the previous version and stops
   the PR — so it is a MUST for a BCR-bound module and simply out of scope for
   a private-registry-only one. Bazel 8.6+/9.1+ for the no-op; the registry
   check is version-independent.
9. **The BCR is add-only, and its consumption test proves analysis, not
   behaviour.** A published version's `MODULE.bazel`, `source.json` and patches
   can never be edited; a fix is a new version or a `.bcr.<N>` suffix
   ([repository-rule-hermeticity-and-bcr.md:209-218](bazel-bzlmod-and-repo-rules/repository-rule-hermeticity-and-bcr.md)).
   Both presubmit shapes default to `build_targets`, and BCR's own docs call
   `test_targets` unreliable because dev deps are unavailable off-root. A
   build-only presubmit is the floor, not the target — and the gap is fine when
   named, a defect when silent (BZL-MOD-28).
10. **Toolchainization is downgraded to CONSIDER against its dive's own
    grading.** The restriction it works around is canonical — `migration.md`
    states flatly that `register_toolchains` is `MODULE.bazel`-only and cannot
    be called from an extension (BZL-MOD-18, MUST). The three-piece hub-repo
    *shape* is one vendor's worked example of one ruleset, and the dive's own
    Contested section says `bazel.build` does not name the term
    ([module-extension-purity-and-repo-contents-cache.md:329](bazel-bzlmod-and-repo-rules/module-extension-purity-and-repo-contents-cache.md)).
    House standard: argued-only sources are CONSIDER, so BZL-MOD-19 is CONSIDER
    rather than the dive's SHOULD.
11. **Both of the map's proposed checks were wrong as written; both are now
    settled by execution, in opposite directions.** M-B-06 said "same grep, plus
    a two-run lockfile diff" — but a `reproducible = True` extension has *no
    lockfile entry to diff*, so the dynamic check first has to remove the flag.
    That procedure **has now been run** on 8.7.0 against `rules_ocx`'s own
    extension: drop the claim, `mod deps --lockfile_mode=update`, then re-run
    under `--repo_env=OCX_MIRRORS=…` and `--repo_env=HOME=…`; all five lock-entry
    fields (`bzlTransitiveDigest`, `usagesDigest`, `recordedRepoMappingEntries`,
    `generatedRepoSpecs`, `envVariables`) were byte-identical across all four runs
    ([module-extension-purity-and-tidy-dynamic-check.md § Q2](bazel-measurements/module-extension-purity-and-tidy-dynamic-check.md)).
    BZL-MOD-14's dynamic half is a real verification now, not a named procedure.
    M-B-20 said "`analysistest.make()` against the production rule": a
    `repository_rule` implementation never runs in the analysis phase, so
    `analysistest` cannot drive it. That is now measured twice over — the
    restriction is a **Skyframe-phase gate**, firing identically from BUILD-file
    top level and from inside an analysis-phase `rule()` harness, on 8.7.0 and
    9.2.0, with the fake `ctx` consumed without complaint right up to the
    repo-instantiating line
    ([repository-rule-and-extension-offline-testing.md § Q2](bazel-followups/repository-rule-and-extension-offline-testing.md)).
    See Verdict 16 for what the follow-up found *does* work, and BZL-MOD-31.
12. **`rules_ocx` is still the exemplar, and it has exactly one live BZL-MOD
    violation — in a file no wave-1 audit read.** `.gitattributes:5` sets
    `MODULE.bazel.lock merge=union`, a JSON-unaware line merge on a file whose
    digest fields must never be merged textually; verified live here
    (`git check-attr merge MODULE.bazel.lock` → `union`). This is worse than a
    visible conflict, because Bazel's own merge-conflict detector looks for
    `<<<<<<<` markers a union merge never writes
    ([module-file-and-lockfile-hygiene.md:174-195,382-386](bazel-bzlmod-and-repo-rules/module-file-and-lockfile-hygiene.md)).
    Frame correction 3 stands otherwise.
13. **Vendor mode does not deliver an airgap, and saying it does is the rule.**
    Two open upstream issues (#23243, #26806) show Bazel-internal repos and
    output-user-root state escaping a full `bazel vendor //...`; one adjacent
    gap (`mod tidy`'s implicit `buildozer` dep) was fixed only in **9.2.0**, so
    every Bazel 8.x pin — the fleet's included — still has it
    ([module-file-and-lockfile-hygiene.md:232-244](bazel-bzlmod-and-repo-rules/module-file-and-lockfile-hygiene.md)).
    BZL-MOD-11 is therefore a claim-discipline MUST, not a configuration rule.
14. **The `bazel mod` surface an agent remembers is not the surface that
    exists.** Exactly four `--lockfile_mode` values (`update`, `refresh`,
    `error`, `off` — none named `strict` or `check`), eight `bazel mod`
    subcommands of which **two** (`tidy`, `dump_repo_mapping`) are missing from
    the rendered docs page in both source trees, and no `--check`/dry-run flag
    on `tidy` at all
    ([module-file-and-lockfile-hygiene.md:197-224](bazel-bzlmod-and-repo-rules/module-file-and-lockfile-hygiene.md)).
    **This wave's own ruleset was caught by its own rule**: BZL-MOD-13 shipped
    with `bazel help all --long` as its verification command, and `all` is not a
    known Bazel command on any of 8.7.0, 8.8.0 or 9.2.0 (`ERROR: 'all' is not a
    known command`, verified live here and in
    [flag-defaults-and-trivial-builds-across-versions.md § Q1](bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md)).
    The working pair is `bazel help build --long` **and** `bazel help
    startup_options` — a flag can live in either and in only one:
    `--experimental_remote_repo_contents_cache` is startup-only and invisible to
    `help build --long` and to `help fetch --long` alike, which is why one
    measurement recorded it "absent on all three versions" and the other found it
    on 8.8.0 and 9.2.0. One rule (BZL-MOD-13) covers all of this plus BCR's
    `incompatible_flags.yml` and a community rc preset's `flags.bzl`, because
    they share one verification: read the live artefact, never the prose, the
    memory, or an old example — including when the artefact is a rule you wrote.
15. **Version boundaries the ruleset depends on**, stated once and corrected
    against the pinned binaries: Bazel **8.0** flipped the two watch/repo-name
    defaults; **8.3.0** introduced `repo_metadata()` (callable and returning a
    real `RepoMetadata` on 8.7.0, 8.8.0 and 9.2.0 alike — live-confirmed, not
    only source-dated); **8.4.0** walked `--repo_contents_cache` back to opt-in;
    **8.6.0/9.1.0** made `compatibility_level` a resolver no-op; **8.8.0** moved
    `lockFileVersion` 24 → 28 and added `factsVersions`, and is the first version
    carrying the **startup** option `--experimental_remote_repo_contents_cache`
    (default `false`) — *not* 9.0.0, as the sub-dive dated it; **9.0.0** made a
    low `single_version_override` a hard error, deleted WORKSPACE support and
    added `facts`/`facts_version`; **9.2.0** shipped
    `@bazel_tools//tools:tools_for_bazel_subcommands` and carries
    `--repo_contents_cache` enabled by default.
    `--repo_contents_cache_gc_idle_delay` (`5m`) and `--repo_contents_cache_gc_max_age`
    (`14d`) exist on all three pinned versions and are not new at 9. Ruleset
    versions do not gate any row here — this family is core Bazel — but the
    fleet's lock shows `rules_python` 2.3.3's `pip` extension is *not*
    reproducible (it carries a `moduleExtensions` entry), which is what makes
    BZL-MOD-04 bite an adopting Python repo first
    ([module-extension-purity-and-repo-contents-cache.md:307](bazel-bzlmod-and-repo-rules/module-extension-purity-and-repo-contents-cache.md)).
16. **A `repository_rule` cannot be instantiated outside module-extension
    evaluation on either major, but its own `fail()` path is reachable
    offline.** The invocation core is Skyframe-gated (Verdict 11) and the error
    text differs by major — 8.7.0: `repository rules can only be used while
    evaluating a WORKSPACE file`; 9.2.0: `repo rules can only be called from
    within module extension impl functions` — so any log grep or runbook must
    match on `Error in repository_rule:` alone. What *does* work, verified
    passing on both majors: wrap the `_impl` (or a helper it calls) in a
    throwaway analysis-phase `rule()` harness and drive it with
    `analysistest.make(expect_failure = True)` + `asserts.expect_failure()`. The
    negative control is the reason this matters — the same `fail()` under a bare
    `unittest.make()` produces no failing test at all: it aborts that target's
    analysis and `bazel test` reports *"No test targets were found, yet testing
    was requested"*
    ([repository-rule-and-extension-offline-testing.md § Q2](bazel-followups/repository-rule-and-extension-offline-testing.md)).
    M-B-20 is settled: the mechanism exists, and the rule row for it belongs to
    `BZL-TEST`, not here. BZL-MOD-31 owns the phase gate; BZL-MOD-32 owns the
    extension shape that keeps the untestable tail thin.
17. **A stale lock has two `--lockfile_mode=error` failure shapes, sharing an
    exit code and no stderr text, and the commonest is an unhandled Bazel crash.**
    Measured on 8.7.0 and 9.2.0, both `mod deps` and `build --nobuild`: when an
    **existing** dependency's locked version changes and the lock is not
    regenerated (bump *or* downgrade, both reproduced), the run exits **37** via
    `java.lang.IllegalStateException: Cannot fetch a file without a checksum in
    ENFORCE mode. This is a bug in Bazel, please report` through
    `YankedVersionsFunction` → `IndexRegistry.getYankedVersions` — with network
    connectivity to `bcr.bazel.build` verified live, so not an availability
    artefact
    ([module-extension-purity-and-tidy-dynamic-check.md § Q4](bazel-measurements/module-extension-purity-and-tidy-dynamic-check.md)).
    `bazel mod deps` on its own reproduces it — no build needed — and an explicit
    `--registry=https://bcr.bazel.build` changes nothing, because the crash
    triggers inside module resolution before any registry-selection logic. A lock
    stale only because `MODULE.bazel` gained a **brand-new** `bazel_dep` takes a
    different path entirely and prints the clean documented message — `Missing
    checksum for registry file … not permitted with --lockfile_mode=error. Please
    run 'bazel mod deps --lockfile_mode=update'` — on both majors, **also exit
    37**. So a clean, named message exists on two paths — a `lockFileVersion`
    mismatch (Verdict 2) and a newly added dependency — and on the third, a
    changed version, there is none. All three exit 37, and no two of the three
    stderr texts share a matchable string. A CI gate on the **exit code**
    covers all of them; a gate that greps stderr for a named lockfile message
    silently never fires on the commonest staleness scenario there is. Root cause
    named upstream rather than left open: resolving a *changed* version consults
    yanked-version metadata through an unchecksummed fetch, which `ENFORCE` mode
    forbids — [bazelbuild/bazel#29497](https://github.com/bazelbuild/bazel/issues/29497),
    fixed by [PR #30315](https://github.com/bazelbuild/bazel/pull/30315) and
    backported **only** to `release-9.3.0`
    ([PR #30512](https://github.com/bazelbuild/bazel/pull/30512)), with
    [#29146](https://github.com/bazelbuild/bazel/issues/29146) and
    [#29188](https://github.com/bazelbuild/bazel/issues/29188) still open and a
    maintainer stating outright that the Bazel-8 line will not get the fix. Both
    pinned majors here (8.7.0, 9.2.0) predate 9.3.0, so the crash is the expected
    behaviour on both, not a local artefact
    ([arch-live-graph-generated-semantics-and-lockfile-error.md § Q3](bazel-measurements/arch-live-graph-generated-semantics-and-lockfile-error.md)).
    Measured on this WSL2 host; the failing path is registry-fetch-side rather
    than filesystem-side, but it has not been re-run on a CI runner.
18. **One documented gap, recorded as a finding rather than left open — and one
    closed.** (a) *Remote repo-contents cache.* The flag half is settled — it is a
    **startup** option, default `false`, absent on 8.7.0, present on 8.8.0 and
    9.2.0 (verified live here). The eligibility half is not: no remote cache
    server was stood up in any measurement, so discussion #27509's
    runtime-dependency exclusion and the `.marker`-line-count heuristic
    BZL-MOD-16 cites remain read, never exercised, and the exclusion's own text
    calls itself temporary. (b) *BCR module surface (M-B-15) — closed, and now a
    rule.* Both halves of the gap named are answered: BCR's maintainer playbook
    ("Encourage PR authors to keep the set of publicly visible targets small"),
    the registry's own automated reviewer config and 15 sampled merged PRs agree
    on default-private plus exactly one public target per entry point, and
    `bazel query 'attr(visibility, "//visibility:public", //...)'` is a real
    verification rather than a reading heuristic — measured on 8.7.0 and 9.2.0
    under both `query` and `cquery`, including (re-measured for this pass) a
    target that inherits public from a `package(default_visibility=)`, which is
    exactly the anti-pattern reviewers reject
    ([bcr-playbook-flag-archaeology-rewind-and-js-gaps.md § Q1](bazel-followups/bcr-playbook-flag-archaeology-rewind-and-js-gaps.md)).
    BZL-MOD-34 owns it. What survives as a smaller gap: the BCR has **no**
    automated visibility check at all (`tools/bcr_validation.py` runs none — the
    enforcement is human and bot review), the playbook's own language is scoped
    to "C++ modules with BUILD patches or overlays" so applying it to a
    pure-Starlark module is inference rather than sampled evidence, and no one
    has run this query against a BCR-sized module to see whether it stays cheap.

## The ruleset

**This topic owns `BZL-MOD` exclusively.** Thirty-four rules, none retired.
Rows are grouped so one invocation covers several where possible: 01-06 are the
lockfile block (three commands), 14-19 and 31-32 the extension block (two
greps), 20-26 the repository-rule block (one grep sweep), 09/28/34 the BCR block
(a `presubmit.yml` read plus one `bazel query`), 33 an invocation-time
rule that belongs to whoever runs Bazel rather than to whoever writes Starlark.
Bazel-version pinning itself belongs to `BZL-FLAG`, not here — BZL-MOD-06
constrains only what a bump must do to the lockfile. `--action_env` versus
`--repo_env` placement belongs to `BZL-HERM` (M-C-06). Runtime hermeticity
diagnosis (the workspace-rules log) is `bazel-diagnose`'s procedure, cited inside
BZL-MOD-23's verification rather than given its own row. Offline **testing** of a
repo rule or extension is `BZL-TEST`'s — BZL-MOD-31 states the phase gate that
constrains what those tests can reach, and stops there. Every grep below reads
only checked-in `.bzl`/BUILD text: **BUILD and `.bzl` files materialised by a
repository rule into `$(bazel info output_base)/external/` are out of reach of
all of them**, which is why the extension and repo-rule blocks pair each grep
with a `bazel mod`/`bazel query` step or a named reading heuristic.

| ID | Rule | Rationale | Verification | Severity | Applies to | Settles |
|---|---|---|---|---|---|---|
| **BZL-MOD-01** | Commit `MODULE.bazel.lock` to version control. | An uncommitted lock forces a full re-resolution on every checkout and hides drift between machines; the docs recommend committing it outright. | `git ls-files MODULE.bazel.lock`. **Empty output = FINDING** (untracked). Disposable fixture modules under `examples/`/`e2e/` are a named, reasoned exception. | MUST | Bazel 7/8/9; A, F (B-E on adoption) | M-B-04 |
| **BZL-MOD-02** | Run `--lockfile_mode=error` in a dedicated CI leg, and nowhere else; add a `schedule:`-triggered leg using `--lockfile_mode=refresh`. Gate that leg on the **exit code**, never on a matched stderr string. This is the freshness shape for `MODULE.bazel.lock` specifically — a generator-owned lockfile has its own, differently-shaped gate (see BZL-RUST-01/-02: `crate_universe`'s `determine_repin()` fails **every ordinary build** on a digest mismatch, with no flag to add and an environment variable that must be *absent*). | `error` is the only mode that both fails on a stale lock and performs **zero** network requests during resolution, so staleness can never be mistaken for flake; `refresh` is the only mode that re-checks mutable data (yanked versions, previously-"not found" registry entries), which a one-shot CI run never exercises. A bare `error` in the base config turns every legitimate dependency edit into a failure a developer cannot self-serve. "Fails loudly" needed a measured correction, and staleness has **two shapes with no shared stderr text**: when an *existing* dependency's locked version changes (bump or downgrade) and nobody re-ran `mod deps`, the leg goes red on **8.7.0 and 9.2.0 alike** through an unhandled `IllegalStateException` ("Cannot fetch a file without a checksum in ENFORCE mode. This is a bug in Bazel, please report") out of `YankedVersionsFunction` — an upstream defect fixed only from 9.3.0 and explicitly declined for the 8.x line; when `MODULE.bazel` merely gained a *brand-new* `bazel_dep`, the same leg prints the clean documented "Missing checksum for registry file … run `bazel mod deps --lockfile_mode=update`" instead (Verdict 17). **Exit 37 in both**, which is the whole reason the gate keys on the code. | `grep -rn 'lockfile_mode' .bazelrc* .github/workflows/ taskfile*.yml`. **No hit anywhere = FINDING** (no freshness gate). A hit on an unscoped `build --lockfile_mode=error` line in a committed base rc = FINDING (developer breakage). Pass shape: a CI-only config or flag, plus a scheduled `refresh` leg. Additionally: **any step that decides pass/fail by grepping stderr for a lockfile message = FINDING** — three unrelated texts share exit 37 (the crash, the missing-checksum message, the `lockFileVersion`-mismatch message), so any single pattern silently passes at least two of them. `bazel mod deps --lockfile_mode=error` alone reproduces both shapes; no build step and no explicit `--registry` is needed to exercise the leg. | MUST (the `error` gate); SHOULD (the `refresh` canary) | Bazel 7/8/9; crash path measured on 8.7.0 and 9.2.0 (WSL2 host; registry-fetch-side, not re-run on a CI runner), fixed upstream only from 9.3.0 and declined for 8.x; A, F | M-B-01 |
| **BZL-MOD-03** | On a `MODULE.bazel.lock` conflict, keep both sides only inside `registryFileHashes` and `selectedYankedVersions`; for anything else run `git reset MODULE.bazel.lock && git checkout MODULE.bazel.lock`, resolve `MODULE.bazel` itself, then `bazel mod deps` and commit the regenerated lock. Never hand-type a value into `moduleExtensions`, `bzlTransitiveDigest`, `usagesDigest` or `generatedRepoSpecs`. | These are opaque, extension-computed digests: a value that merely parses as JSON desyncs silently from what produced it, and Bazel trusts it until that extension is next evaluated. This is Bazel's own documented procedure and the only one that does not require understanding digest semantics. | Reading heuristic — a diff touching any of those four keys that is not the whole-file output of a `bazel mod deps` / build run in the same change is a finding; no grep can distinguish a good hash from a bad one. After a full regeneration, additionally diff the new lock against the last-known-good one: **any** change to a module untouched by the edit is a second look (a whole-lock delete re-resolves the entire graph, not just the conflict). Empty diff outside the edited module = pass. | MUST | Bazel 7/8/9; A, F | M-B-03, M-B-04 |
| **BZL-MOD-04** | Configure Bazel's own `bazel-lockfile-merge` jq driver for `MODULE.bazel.lock`; never leave it on a generic line-based git driver such as `union` or `ours`. Scope it to that one file: the driver is written against the `MODULE.bazel.lock` schema and must never be pointed at `cargo-bazel-lock.json`, `ocx.lock`, or any other JSON lockfile — those need their own JSON-aware driver (BZL-RUST-05). | A JSON-unaware driver can duplicate or interleave a changed digest key with **no conflict markers at all** — which also defeats Bazel's own merge-conflict detector, since that looks for `<<<<<<<`/`=======`/`>>>>>>>` in the text. A silent bad merge is strictly worse than a visible conflict. Aiming Bazel's driver at a foreign lockfile parses a schema it was not written for, trading one silent corruption for another. | `git check-attr merge MODULE.bazel.lock` must print `bazel-lockfile-merge`. **Any other value — `union`, `ours`, `unspecified` — = FINDING.** Setup is a `.gitattributes` line plus a one-time `git config merge.bazel-lockfile-merge.driver …` per clone, so the check must also confirm that config exists. Then `grep -n 'bazel-lockfile-merge' .gitattributes`: **a second path pattern naming that driver = FINDING** (wrong schema). | MUST | Bazel 7/8/9; A, F | M-B-03 |
| **BZL-MOD-05** | Never cite a `MODULE.bazel.lock` schema version number from documentation, memory, or another repository — read it from the file in hand. | Measured five ways: docs `10`; a Bazel-8.7.0-produced lock `24`; `28` from a **8.8.0**-produced lock, a 9.2.0-produced lock, and current master alike. The schema also carries top-level keys (`facts`, and `factsVersions` from 8.8.0 on) that none of the prose vantage points documents. Each number is right for its vantage point and all are wrong to hardcode — including "24", which was current for exactly one Maintenance release. | `python3 -c "import json;print(json.load(open('MODULE.bazel.lock'))['lockFileVersion'])"`. There is no empty case — a missing key or a parse error is itself the finding (a corrupt or conflicted lock). | MUST | Bazel 7/8/9; A, F | M-B-02 |
| **BZL-MOD-06** | A change to `.bazelversion` regenerates `MODULE.bazel.lock` and reviews the diff in the **same commit**; never let the first CI or developer run rewrite it unreviewed. This binds on a **patch or Maintenance bump too**, not only a major one. | A version-mismatched lock is discarded wholesale and rewritten with nothing printed (Verdict 2), so the alternative is a full, unreviewed re-resolution disguised as a routine version bump. The lockfile's own docs warn it changes "even between backward-compatible Bazel releases" — and this is measured, not rhetorical: 8.7.0 → **8.8.0** crosses the same `lockFileVersion` 24 → 28 boundary as 8.7.0 → 9.2.0 (Verdict 3), so "we are staying on 8.x" is not an exemption. | Reading heuristic: `git show --stat <bump-commit>` must touch both `.bazelversion` and `MODULE.bazel.lock`. **A commit touching only `.bazelversion` = FINDING**, regardless of how small the version step is. | MUST | Bazel 7/8/9; A, F | M-B-02 |
| **BZL-MOD-07** | Mark every dev-only `bazel_dep` (test, lint, docs, formatting tooling) `dev_dependency = True`. | Per the attribute's own doc text a dev dependency "will be ignored if the current module is not the root module" — omitting it leaks your build/test toolchain into every consumer's resolved graph. | `grep -n 'bazel_dep' MODULE.bazel`, then classify each: referenced from the public `.bzl`/BUILD surface (prod, plain) versus test/lint/doc only (dev, must carry the attribute). **Empty output = no deps declared**, which is its own question, not a pass. | MUST for a published module; SHOULD for a root-only one | Bazel 7/8/9; A, F | — |
| **BZL-MOD-08** | Never write a `single_version_override` whose `version` is lower than any live `bazel_dep` requirement for the same module. | Silently accepted — and silently harmful — through Bazel 8; a hard, named resolution error since the fix that shipped in 9.0.0. No `--incompatible_*` flag gates it, so there is nothing to grep for in advance except the pattern itself. | `bazel mod graph` (or any build) on Bazel 9: the string `is overridden to use version '…', which is lower than the version '…' requested by the root module` is unambiguous. **Empty output (clean graph) = pass.** On Bazel 8 the same pattern is a latent bug: compare each `single_version_override` version against every `bazel_dep` for that module by hand. | MUST on Bazel 9.0+; SHOULD on Bazel 8; A, F | Bazel 8/9 | M-B-16 |
| **BZL-MOD-09** | On a module published to the BCR, never delete or renumber `compatibility_level` because the resolver ignores it, and use an `@bazel-io skip_check <name>` comment only for a deliberate, stated exception. | The no-op is resolver-only (8.6.0/9.1.0); BCR presubmit's `bcr_validation.py` still diffs the field against the previous version and blocks the PR. Reading "it's a no-op" as "delete it" fails the next submission. The `skip_check` comments are per-check escape hatches — defaulting to them defeats exactly the protection each check provides. | `grep -n 'compatibility_level' MODULE.bazel` before and after any edit destined for the BCR: a diff on that line must be intentional and paired with `@bazel-io skip_check compatibility_level` in the PR. **Empty output on both sides = pass** (never declared, never changed). For a skip label on a PR, the thread must state the reason; no stated reason = FINDING. | MUST when publishing to a registry that gates on it; N/A for a private-registry-only module | Bazel 8.6+/9.1+ (resolver); registry check version-independent; A | M-B-13 |
| **BZL-MOD-10** | Run `bazel mod tidy` only behind a diff gate; never as a silent auto-commit step. | It rewrites the hand-authored `MODULE.bazel` (formatting plus every `use_repo()` call) and ships with **no** `--check` or dry-run flag, so nothing inside the command can preview the change. | `bazel mod tidy && git diff --exit-code MODULE.bazel`. **Exit 0 (empty diff) = pass** (already tidy). Non-zero = a human reviews the rewrite before it lands. | SHOULD | Bazel 7/8/9; A, F | M-B-12 |
| **BZL-MOD-11** | Never state that a vendored (`--vendor_dir`) build is offline- or airgap-capable without having run it from a clean output user root with the network blocked, on the target Bazel version. | Two open upstream issues show Bazel-internal repos (`@local_config_platform` and friends) and output-user-root state escaping a full `bazel vendor //...`; separately, `bazel mod tidy`'s implicit `buildozer` dependency escaped vendoring entirely before 9.2.0. The docs' framing reads as a guarantee at a skim. | Delete the output user root (or an equivalent clean-cache step), block the network, then build. **A clean success is the pass; any fetch attempt is the finding.** On Bazel < 9.2.0 with `mod tidy` in the pipeline, also vendor `@bazel_tools//tools:tools_for_bazel_subcommands` — `bazel mod tidy --vendor_dir=<dir> --nofetch` must exit 0. | MUST (as a claim); SHOULD (as a periodic verification) | Bazel 7/8/9, gap closed for `mod tidy` in 9.2.0; A, F | M-B-17, M-B-12 |
| **BZL-MOD-12** | Every `pin()` line in `VENDOR.bazel` carries an adjacent comment naming why it is pinned and who owns unpinning it. | A pinned repo is frozen with **zero** staleness signal by design — "Bazel will NOT update the vendored source for this repo … unless it's unpinned", with no error, warning, or indicator on the stale path. | `grep -n '^pin(' VENDOR.bazel`; every hit needs the adjacent comment. **Empty output = nothing pinned = pass by default.** | MUST where `pin()` is used | Bazel 7/8/9; F (A on adoption) | M-B-18 |
| **BZL-MOD-13** | Verify every flag name, flag default, subcommand and presubmit flag list against the live artefact — the pinned binary's own help output, the release notes for the exact minor, or the tagged source — never from a prose docs page, a changelog line in isolation, memory, or an older example. Treat BCR's `incompatible_flags.yml` and a community rc preset's flag catalogue (`bazel-contrib/bazelrc-presets`' `flags.bzl`, ~35 entries across `FLAGS`/`MIGRATIONS`/`NON_RBE`) as **hand-maintained third-party lists**, never as the CLI reference: consult them for "is this presubmit-tested / recommended", never for "does this flag exist and what is its default". | Six measured doc-lags in this family alone: `bazel mod tidy` and `dump_repo_mapping` are absent from the `mod` reference page in both source trees; `bazel.build/external/repo` never mentions `repository_ctx.repo_metadata()`; the 9.0.0 notes restate `--repo_contents_cache`'s original default without the 8.4.0 walkback (and never mention the 9.x re-enablement at all); `incompatible_flags.yml` can **lag a flag already flipped** (`--incompatible_disable_autoloads_in_main_repo` sits under `last_green`/`rolling` while 9.0.0 lists it as flipped — BZL-FLAG's finding); 6 of 8 `--incompatible_*` flags in the canonical 2022 always-on rc post return zero hits in the current CLI reference; and this ruleset's own earlier text prescribed `bazel help all --long`, which is not a command on any pinned version (Verdict 14). Inventing a fifth `--lockfile_mode` value or a `mod tidy --check` is the same failure from the other direction. | `bazel help mod` (subcommands — 9.2.0 prints `tidy` in the usage line plus eight query types, verified live), then **both** of `bazel help build --long \| grep -A6 '^ *--<flag>'` and `bazel help startup_options \| grep '<flag>'` — a flag can exist in exactly one of the two, and `--experimental_remote_repo_contents_cache` is startup-only. `bazel help all --long` is **not a command** and its `ERROR: 'all' is not a known command` must never be read as "flag absent". Then the tagged source for a constant, and a diff of any `presubmit.yml` `incompatible_flags:` block against the registry's file at HEAD. **Empty grep output across both help surfaces means the flag does not exist on that version — that is an answer, not a pass.** | MUST for anyone authoring guidance; SHOULD for a reviewer spot-checking | Bazel 7/8/9 (8.3+ for the cache flags; startup-option surface verified on 8.7.0/8.8.0/9.2.0); A, F | M-B-01, M-B-06, M-B-12 |
| **BZL-MOD-14** | A module extension's implementation function — and every `.bzl` file it `load()`s that is not itself a repository rule — must not call `ctx.os`/`module_ctx.os` or `.getenv()`; push all host and environment access down into the repository rules it instantiates. | This is exactly the boundary `reproducible = True` claims to hold, and nothing re-checks the claim: an impure impl marked reproducible produces silently divergent repos across machines with **no lockfile diff to catch it**, because the flag also removes the extension from the lockfile. The negative side is now measured, which is what makes the positive claim mean anything: a genuinely pure extension shows **zero** lock-entry drift under an env change (Verdict 11). | Static: `grep -n 'ctx\.os\.\|ctx\.getenv(' <extension>.bzl` (the substring matches any param name ending in `ctx`), then repeat over the transitive `load()` closure, enumerated with `bazel query 'buildfiles(@<ext-repo>//...)'` or a recursive scan of `load(` targets — the grep reads checked-in text only, so a `.bzl` file materialised into `external/` by a repository rule is outside it and needs the `bazel query` leg. **Empty across the closure = pass**; any hit outside the repository-rule files = FINDING. Dynamic (executed on 8.7.0, promoted from a named procedure): temporarily drop `reproducible = True`, run `bazel mod deps --lockfile_mode=update` to establish the lock entry, re-run once unchanged as a control, then re-run under `--repo_env=<VAR>=<value>` for each variable the extension's repos consult; diff that extension's `bzlTransitiveDigest`, `usagesDigest`, `recordedRepoMappingEntries`, `generatedRepoSpecs` and `envVariables`. **All five identical across runs = pure**; any field moving under an env change while the grep is clean = the grep missed a read. Restore the flag and the lock afterward. | MUST | Bazel 6+ (all Bzlmod); dynamic half measured on 8.7.0 (WSL2 host, one extension, two variables); A, F | M-B-05 |
| **BZL-MOD-15** | An extension whose impl is a pure function of its tags returns `module_ctx.extension_metadata(reproducible = True)`; never set it alongside `os_dependent`/`arch_dependent`; bump `facts_version` on any incompatible change to `facts` data; and drop the claim in the same change that breaks it. | Skipping the opt-in pays the lockfile-churn and merge-conflict cost for zero benefit. Setting `reproducible` next to `os_dependent`/`arch_dependent` asserts two contradictory things — the latter exist precisely to force re-evaluation on a host change. `facts` survive an extension code change untouched, so an old, incompatibly-shaped fact dict silently feeds new code unless the integer moves. A stale reproducibility claim is worse than never making one: it poisons a cross-workspace cache that has no correctness oracle. | `grep -n 'extension_metadata\|os_dependent\|arch_dependent\|facts_version' <extension>.bzl`. Pass = `reproducible = True` present while BZL-MOD-14's grep is empty, and no `os_dependent`/`arch_dependent` on the same extension. **Empty output while BZL-MOD-14 is also empty = FINDING** (a missed opt-in). Review trigger: any diff adding a `getenv`, a `watch`, or an unchecksummed fetch under a `reproducible` claim must touch the claim too. | SHOULD | Bazel 6+ (all Bzlmod); `facts`/`facts_version` Bazel 9.0+ only; A, F | M-B-06 |
| **BZL-MOD-16** | A repository rule that should benefit from a repo-contents cache returns `repository_ctx.repo_metadata(reproducible = True)` explicitly — an implicit `return None` grants nothing. That return is the **only** local-cache gate: `getenv()`/`watch()` do not disqualify a rule from the local cache. They do disqualify it from the experimental **remote** cache, which is a separate, startup-only, still-unexercised mechanism. | The pre-8.3 contract (return `None` or a dict) is the one every doc page still shows and it grants no cache eligibility at all. Measured end to end on 8.7.0: two rules both returning `repo_metadata(reproducible = True)`, one of them calling `getenv("HOME")`, were **both** cached and **both** hit after `bazel clean --expunge` — proved by the absence of their `print()` DEBUG lines on the second fetch, not merely by a populated directory. So the earlier framing ("a `getenv` site disqualifies the rule") was a remote-cache bar read as a universal one. The remote cache's own exclusion of "repo rules without any dependencies added at runtime" remains documentation-only (Verdict 18a). A rule marked `local = True` is re-fetched every server restart and is not a cache candidate at all. | `grep -n 'repo_metadata' <repo_rule>.bzl` — **empty while the rule is otherwise deterministic = a missed opt-in**, not a bug; the grep reads checked-in text only and cannot see a repo rule shipped inside a fetched external repo. Read the live default before relying on the cache: `bazel help build --long \| grep -A6 '^ *--repo_contents_cache'` — `""` on 8.7.0/8.8.0 means opt-in, `see description` on 9.2.0 means it derives from `{--repository_cache}/contents` and is already on. For the remote cache, confirm the flag first: `bazel help startup_options \| grep experimental_remote_repo_contents_cache` — **absent on 8.7.0, present and `false` on 8.8.0/9.2.0**; it never appears in `help build --long` or `help fetch --long`. Then read `$(bazel info output_base)/external/@<repo>.marker` after a fetch: **more than one line = runtime deps = not remote-eligible**; exactly one line = eligible. That `.marker` heuristic is read from discussion #27509 and has never been exercised against a real remote cache here. | SHOULD | Bazel 8.3.0+ (`repo_metadata`, live-confirmed callable on 8.7.0/8.8.0/9.2.0); local cache opt-in through 8.8.0 and on by default at 9.2.0; remote cache flag 8.8.0+ (not 9.0.0+); A, F | M-B-06 |
| **BZL-MOD-17** | Never instantiate a repository and `load()` a `.bzl` file from it inside the same module extension; when the error fires, fix it by splitting into two extensions (or a plain shared `.bzl` with no repo dependency), never by reordering statements. | It produces the hard, build-breaking error `Circular definition of repositories generated by module extensions or files in external repositories` — and the cycle is a Skyframe dependency-graph property, so statement order cannot affect it. The message's cycle diagram reads like an ordering problem, which is precisely why the wrong fix gets attempted. | Reading heuristic with a grep proxy: `grep -n '^load(' <ext>.bzl` cross-checked against the repo names that the same file's `_impl` passes to a `repository_rule` call. **No overlap = pass.** After a fix, `bazel mod deps` must evaluate both extensions cleanly. | MUST | Bazel 6+ (all Bzlmod); A, F | M-B-10 |
| **BZL-MOD-18** | Never call `native.register_toolchains()` or `native.bind()` inside a module extension implementation. | Both raise a hard error under Bzlmod: `register_toolchains`/`register_execution_platforms` are `MODULE.bazel`-only APIs, and `bind()` is unsupported outright. A WORKSPACE macro doing exactly this is a normal, working pre-Bzlmod pattern, so mechanical ports hit an error with no "did you mean `MODULE.bazel`" hint. | `grep -n 'native\.register_toolchains\|native\.bind(' <extension>.bzl`. **Empty = pass.** Run it specifically as part of any WORKSPACE→Bzlmod port. | MUST | Bazel 6+ (all Bzlmod); A, F | M-B-11 |
| **BZL-MOD-19** | When an extension must register a toolchain, generate one hub repo holding every toolchain target and its dependency repos, `use_repo()` the hub once from `MODULE.bazel`, and put `register_toolchains("@hub//…")` there — never inside the extension. | It is the only shape that satisfies BZL-MOD-18 while still registering a toolchain, and it moves per-consumer verbosity to the extension's maintainer once. Graded CONSIDER, not SHOULD: the restriction is canonical but this specific three-piece shape is one vendor's worked example of one ruleset, and `bazel.build` does not name the pattern. | Reading heuristic: `MODULE.bazel` carries a `register_toolchains(…)` line paired with `use_repo(<ext>, "<hub>")` for the same extension. **A `toolchain()` target in the extension's generated BUILD content with no `register_toolchains` anywhere = FINDING** — toolchains are silently never registered. | CONSIDER | Bazel 6+ (all Bzlmod); F | M-B-11 |
| **BZL-MOD-20** | Read every environment variable through `repository_ctx.getenv()`; never through `repository_ctx.os.environ`/`module_ctx.os.environ`, and migrate any `repository_rule(environ = [...])`/`module_extension(environ = [...])` list to per-read `getenv()`. Never add `environ=` *alongside* `getenv()` as a belt-and-suspenders measure. | `os.environ` is explicitly documented as **not** establishing a dependency — the same read, with none of the re-fetch tracking, so an edit to the variable silently serves a stale fetch with no error, no lint, and no test failure. `environ=` carries the verbatim marker `Deprecated. … Migrate to repository_ctx.getenv/module_ctx.getenv instead` in the **8.7.0-pinned and the current** API doc alike, and `bazel.build/external/repo` joins the two mechanisms with **"or"**: `getenv()` alone is necessary and sufficient, so a pair is not redundancy, it is a marker of a pre-`getenv()`-era snippet copied forward. Buildifier has **no** warning for any of this (a full read of its current `WARNINGS.md`, 82 categories, returns zero hits for `getenv`, `environ`, `repository_rule` or `module_extension`), so the grep is the only mechanical check that exists — not merely the cheapest. | `grep -rn 'ctx\.os\.environ\|module_ctx\.os\.environ' **/*.bzl` — **empty = pass**, any hit is a finding by definition. `grep -n 'environ *= *\[' *.bzl` inside a `repository_rule(`/`module_extension(` call — **empty = nothing to migrate.** Both read checked-in `.bzl` text only; a repository rule defined inside a fetched external repo is out of reach and needs `bazel mod show_repo`/a source read of that dependency instead. | MUST (`os.environ`); SHOULD (the `environ=` migration) | Bazel 6-9; deprecation wording confirmed identical at 8.7.0 and current; A, F | M-B-07 |
| **BZL-MOD-21** | Every `attr.label()` declared in a `repository_rule`'s `attrs=` is passed to `ctx.path()`/`ctx.read()`/`ctx.execute()` or explicitly `ctx.watch()`/`ctx.watch_tree()`ed inside the impl; and `watch = "auto"` is never treated as coverage for a path inside the repo being fetched, or (for a module extension) outside the workspace. | Since Bazel 8.0, `--incompatible_no_implicit_watch_label` defaults true: a `Label` attribute no longer auto-watches its file and `repository_ctx.path()` no longer implicitly watches its argument, so an edit to the referenced file stops triggering a re-fetch with no error anywhere. `"auto"` degrades to *don't watch* in exactly the two illegal-to-watch cases rather than erroring — silence that reads as coverage. | For each label attr name, grep the impl for that name adjacent to `ctx.path(ctx.attr.`, `ctx.read(ctx.attr.`, or `ctx.watch(`/`ctx.watch_tree(`. **Missing on all three = FINDING**; an empty finding list = pass. For any `read()`/`extract()`/`template()`/`patch()` on a possibly-illegal path, force `watch = "yes"` once and let the resulting error prove it is genuinely external. | MUST | Bazel 8, 9 (defensively fine on 7); A, F | M-B-07, M-B-09 |
| **BZL-MOD-22** | Every `ctx.download()`/`ctx.download_and_extract()` call carries `sha256=` or `integrity=`. | An unchecksummed fetch is non-hermetic (content can change under a floating URL) and is invisible to the content-addressed repository cache, which is keyed on the **expected** sha256 of the request — so it is both a supply-chain hole and a permanent cache miss. There is no lint safety net behind the grep: buildifier's current `WARNINGS.md` (82 `##` categories, read in full) contains zero occurrences of `sha256`, `integrity`, `checksum` or `hash`. | `grep -n 'ctx\.download' **/*.bzl`, then read forward from each hit to the call's closing paren and confirm `sha256`/`integrity` (the read-forward step is what makes this work on a multi-line call). **No unchecksummed hit = pass.** Beware the name collision with a tag class called `download` in a user-facing `MODULE.bazel` DSL. The grep covers checked-in `.bzl` only — a download issued by a repository rule that itself arrived from an external repo is out of reach. | MUST | Bazel 6-9; A, F | M-B-08 |
| **BZL-MOD-23** | Where a repository rule shells out via `ctx.execute()`, name the invoked binary's own environment-variable surface at the call site (comment or linked doc), and never claim the rule is hermetic on the strength of a `getenv`/`watch` inventory. | Local `execute()` seeds the child process from the Bazel server's full ambient environment and only then applies `environment=` — confirmed in source and in `--repo_env`'s own doc text. A Starlark-side inventory covers only what the Starlark code reads to build that dict; the binary's own reads of `PATH`, `LANG`, a proxy variable, or anything else pass through unlisted and untracked on every version through current master. Remote execution is the sole exception and is not generally available for repo rules. | Named heuristic: for each `ctx.execute(` site, confirm a comment or linked doc naming the tool's env surface — **a call with neither that note nor `getenv()` coverage = FINDING**; and any doc/README/rule claiming hermeticity from "N getenv sites, M watch sites" without addressing `ctx.execute()` inheritance is incomplete on its face. Runtime escalation when a specific run is in question: `bazel clean --expunge`, then `bazel build --experimental_workspace_rules_log_file=/tmp/wsl <target>`, build `src/tools/workspacelog:parser`, and grep its output for the six non-hermetic operation categories (`execute`, `download*`, `file`/`template`, `os`, `symlink`, `which`). The expunge is mandatory — cached fetches never appear in the log, so a partial run under-reports with no indication. | MUST (as a documentation-completeness check); SHOULD (the per-call-site note) | Bazel 6-9, confirmed against current master; A, F | M-B-07, M-B-19 |
| **BZL-MOD-24** | Do not expect `--repository_cache` to dedupe content a repository rule fetches through `ctx.execute()`; a ruleset that acquires content that way documents its own cache story instead of pointing at Bazel's. | The repository cache is keyed on the expected sha256 of a *download request*. `execute()` has no such concept, so identical content re-materialises from scratch in every fresh output base, however many sibling workspaces already have it. | Compare `grep -c 'ctx\.execute(' ` against `grep -c 'ctx\.download'` across the ruleset's repository rules. **An `execute()`-dominated ruleset with no written cache story = FINDING**; a `download`-dominated one is covered by BZL-MOD-22 and passes here. | SHOULD | Bazel 6-9; A, F | M-B-19 |
| **BZL-MOD-25** | Treat `repository_ctx.attr.name` as the **canonical** repo name; never parse a canonical name for structure, never hard-code the pre-8.0 `~` separator, and take an apparent name as an explicit attribute when you need one. | `--incompatible_use_plus_in_repo_names` flipped default-true in Bazel 8.0 **and immediately became a no-op flag** — `@@foo~1.0.0` became `@@foo+1.0.0` with no way back, and any code parsing canonical-name structure broke at the same release. The `name` attribute is magic in both directions: apparent going in, canonical coming out. | `grep -n '~' *.bzl scripts/* .bazelrc*` for a canonical-name-shaped string, and `grep -n 'ctx\.attr\.name'` to confirm no user-facing display string is built from it. `grep -rn '@@'` over `.bzl`, scripts and rc files for a hard-coded canonical label. **Empty on all three = pass.** | MUST for anything parsing repo-name structure; CONSIDER as general awareness | Bazel 8, 9 (was `~` pre-8.0); A, F | M-B-09 |
| **BZL-MOD-26** | Set `configure = True` on a `repository_rule` that inspects the host machine (`ctx.os`, `ctx.which`, toolchain autodetection); do not set `local = True` on a rule that is not genuinely restart-sensitive. | `configure` is the only knob `bazel fetch --force --configure` respects — an unmarked host-probing rule silently ignores the one command meant to re-run it. `local = True` re-fetches on **every** server restart, which means every CI job, for no benefit when the rule is not host-sensitive across restarts. | For a rule using `ctx.os`/`ctx.which`, grep its `repository_rule(` call for `configure = True`; for a rule using neither, confirm `local` is absent or `False`. **Empty grep for `configure` on a host-probing rule = FINDING**; empty grep for `local` on a non-probing rule = pass. | SHOULD | Bazel 6-9; A, F | — |
| **BZL-MOD-27** | Every `fail()` reachable from a repository rule or module extension names the exact command that fixes the condition. | A repo-rule failure has no interactive debugging session attached — the message is the entire remediation UI, for a human and an agent equally. | `grep -n 'fail(' *.bzl`, then confirm each string contains a runnable command token, not just a description. **Zero `fail()` calls passes trivially**; a `fail()` whose text names no command is a finding. Not a pure grep — a named reading heuristic over the grep's hits. | SHOULD | Bazel 6-9; A, F | M-B-22 |
| **BZL-MOD-28** | A BCR submission's `presubmit.yml` carries a `bcr_test_module` (with `local_path_override`), not only the built-in anonymous-module `verify_targets` check; and where that module stays build-only, the reason is written down next to it. | The anonymous-module test proves the module's own targets build stand-alone; only a test module exercises a real consumer's `bazel_dep` + `use_extension` + `use_repo` graph with dev dependencies available. But `bazel build` never executes the generated output, so argument assembly, exit-code handling and `ctx.execute()` ordering ship through presubmit undetected — fine when named and reasoned, a real gap when silent. BCR's own docs call `test_targets` unreliable off-root, so the fix is a narrow real-execution shard, not promoting the whole matrix. | The module's `presubmit.yml` has a top-level `bcr_test_module:` key — **absent = FINDING**. Then `grep` its BUILD file for `sh_test(` or the config for `test_targets:`: **neither present = the execution gap exists**, and the pass condition is an explicit comment naming why (live-network dependency, matrix flakiness) plus the upgrade condition. | SHOULD | BCR practice as of 2026-09-05; A | M-B-14 |
| **BZL-MOD-29** | Bypass a yanked version as a local, temporary decision (`BZLMOD_ALLOW_YANKED_VERSIONS`, or a one-off flag) — never by committing `--allow_yanked_versions` into an rc file or `MODULE.bazel`. | A yank is the registry's only removal mechanism (versions are never deleted, only marked in `metadata.json` with a reason). Committing the bypass silently un-yanks the dependency for every future build and every consumer, long after the incident that motivated it. | `grep -n 'allow_yanked\|BZLMOD_ALLOW_YANKED_VERSIONS' MODULE.bazel .bazelrc*`. **Empty = pass**; a hit in a committed file is a finding worth a second look, not an automatic revert. | CONSIDER | Bazel 6-9; A, F | — |
| **BZL-MOD-30** | **pinned** — A root-only tag class carrying a security or policy decision `fail()`s when a non-root module uses it, rather than silently ignoring the tag. | The ecosystem default is the opposite: a survey of five Bzlmod rulesets (`rules_python`, `rules_go`, `toolchains_llvm`, `rules_rust`, `rules_scala`) found all of them silently ignoring a non-root customisation and **none** calling `fail()`. That default is right for ergonomic knobs and wrong for a security posture — a dependency's attempt to weaken verification must be loud. This is a project decision that deliberately breaks with convention, recorded so nobody "fixes" it back. | `grep -n 'is_root' <extension>.bzl` — every security-relevant root-only tag class must reach a `fail()` on the non-root branch. **Empty output while such a tag class exists = FINDING** (silently ignored). A non-security tag class with no `is_root` check is not a finding. | SHOULD | Bazel 6+ (all Bzlmod); A, F | M-B-21 |
| **BZL-MOD-31** | Never call a `repository_rule` symbol — or an `_impl` that calls one — from anywhere but a module extension's own evaluation: not from a BUILD file, not from a `.bzl` helper, not from inside a `rule()` implementation. When matching the resulting error in a log, a runbook or a test, match on `Error in repository_rule:` and nothing after it. | The restriction is a Skyframe-level gate on which evaluation context may request repository creation, not a check on the calling code's shape — measured firing identically from loading-phase BUILD top level and from an analysis-phase `rule()` harness, on 8.7.0 and 9.2.0, twice each. **The message text after the colon differs by major**: 8.7.0 says `repository rules can only be used while evaluating a WORKSPACE file` (naming a file type Bazel 9 no longer has), 9.2.0 says `repo rules can only be called from within module extension impl functions`. Matching one major's wording silently never fires on the other. The direct consequence for testing: the repo-rule-invoking tail of an extension cannot be driven offline by any Starlark-side trick, which is why BZL-MOD-32 exists and why the offline test rows live in `BZL-TEST`. | `grep -rn '<repo_rule_symbol>(' --include='*.bzl' --include='BUILD*' .` and confirm every call site is inside a `module_extension` implementation (or a function only that implementation calls). **No call site outside an extension impl = pass.** For a log or CI matcher, `grep -c 'Error in repository_rule:'` — **a matcher pinned to either major's full sentence = FINDING.** Checked-in text only; a call inside a fetched external repo is out of reach. | MUST | Bazel 8 and 9 (measured on 8.7.0 and 9.2.0; the pre-9 wording is 7/8); A, F | M-B-20 (premise correction) |
| **BZL-MOD-32** | Split a module extension's `_impl` into a pure `module_ctx -> data` decision function and a thin tail that does nothing but loop over that data invoking repository rules; keep every `fail()`, every tag-validation branch and every version/platform choice in the pure half. | The tail is untestable offline by construction (BZL-MOD-31), so every line left in it is a line no test can reach — and the tag-validation branches are exactly where the `fail()`s that gate security and root-only policy live. `rules_python` 2.3.3 is the worked example, with `parse_modules(module_ctx) -> mods` unit-tested directly and the repo-invoking `_pip_impl()` tail left thin; `rules_rust`'s `crate_universe` `_crate_impl()` is the counter-example — unsplit, with zero offline coverage of either half. Graded SHOULD, not MUST: the split is measured in one ruleset and argued as general guidance, and 6 of 8 surveyed rulesets ship no offline extension tests at all. | Reading heuristic over `grep -n 'def \|repository_rule_symbol(' <extension>.bzl`: the function passed to `module_extension(implementation = …)` should contain a call to a named decision function and a loop of repo-rule invocations, and **no `fail()` of its own**. **A `fail()` or a tag-parsing loop in the same function as the repo-rule invocations = FINDING** (the branch cannot be tested). An extension with a single tag class and no validation is trivially compliant. | SHOULD | Bazel 6+ (all Bzlmod); A, F | — |
| **BZL-MOD-33** | On Bazel 9.x, keep `--output_user_root` and `--repository_cache` outside the main repo's own directory tree — including in a scratch or agent workspace. | `--repo_contents_cache` is enabled by default from (at least) 9.2.0 and derives its path from `{--repository_cache}/contents`, so pointing the output user root inside the workspace silently places the cache inside the main repo and Bazel hard-fails **every command, `bazel help` included**: `ERROR: The repo contents cache [<path>] is inside the main repo [<path>]. This can cause spurious failures. Disable the repo contents cache with --repo_contents_cache=, or specify --repo_contents_cache=<path outside the main repo>`. On 8.7.0/8.8.0 the same invocation works, because the cache is off by default there — so this appears only on the version bump, and appears as a total failure rather than a warning. Reproduced live on this WSL2 host with `--output_user_root=<workspace>/out`. | Run any command on the 9.x pin from the workspace; **the named `is inside the main repo` error = FINDING**, and the fix is either an output root outside the tree or an explicit `--repo_contents_cache=` (empty, to disable). **A clean run = pass.** Grep proxy for a committed setup: `grep -rn 'output_user_root\|repository_cache' .bazelrc* .github/workflows/ taskfile*.yml` — a path under the repo root is the finding; **empty = the defaults apply and are outside the tree = pass.** | MUST on Bazel 9.0+; N/A on 8.x | Bazel 9.2.0 measured; 8.7.0/8.8.0 unaffected (WSL2 host; path-shape logic, not filesystem-dependent); A, F | — |
| **BZL-MOD-34** | On a module published to the BCR, default every package to `package(default_visibility = ["//visibility:private"])` and mark exactly one target `//visibility:public` per logical entry point — the module-named target, or a private target plus a public `alias`. Never ship a package-wide `//visibility:public` default, and never leave the one canonical entry-point target private. | Every publicly visible target is a public API commitment that cannot be narrowed again without breaking consumers, and the BCR has **no automated check for it** — `tools/bcr_validation.py` runs none, so the only gate is human and bot review, which means a mistake ships and then cannot be taken back (the registry is add-only, Verdict 9). BCR's own maintainer playbook says "Encourage PR authors to keep the set of publicly visible targets small", the registry's automated reviewer repeats it ("visibility is minimal but includes `//visibility:public` for intended APIs"), and across 15 sampled merged PRs a package-wide public default drew a change request every time it appeared, with none of the 15 asking for *more* surface than the one intended entry point. The opposite failure sits in the same playbook bullet: an entry-point target that forgets `//visibility:public` is unusable by every consumer, and nothing catches it unless the module ships a test module (BZL-MOD-28). | `bazel query 'attr(visibility, "//visibility:public", //...)'` — the expected output is exactly the intended entry-point list, and this is the module's real public surface rather than a proxy for it: re-measured for this pass on 8.7.0 and 9.2.0, under `query` **and** `cquery`, it lists a target that inherits public from a `package(default_visibility=)` and omits an explicitly-private target in that same package, so a package-wide default is caught rather than hidden. **Empty output = FINDING** — no public target at all means the entry point is unreachable to every consumer; it never reads as "nothing to expose". More labels than entry points = FINDING (over-exposed surface). Never substitute `visible(//..., //...)`: it is a live function on both majors but computes "visible to every target in the queried universe", which stops tracking "externally reachable" the moment a repo has more than one package, and `cquery` rejects it outright (`visible() is not supported on configured targets`). Know which command enforces what: plain `query` walks an illegal visibility edge without complaint (visibility is an analysis-time check), and only `cquery` fails on it with the same error `bazel build` gives — so `cquery '//<entry point>'` answers "is this edge legal", `attr(visibility, …)` answers "what is public". | SHOULD (keep the surface minimal); MUST (at least one public entry point) | BCR practice as of 2026-09-06; query measured on 8.7.0 and 9.2.0 (WSL2 host, but loading/analysis-phase semantics — host-independent); A, F | M-B-15 |

## Applied to rules_ocx

`rules_ocx` 0.4.0, `.bazelversion` `8.7.0`, published to the BCR — shape A, and
the only fleet instance of this family. Of thirty-four rules: fifteen satisfied,
six violated, eleven that the repo structurally cannot exhibit, three
forward-looking — BZL-MOD-10 is the one row counted twice (satisfied today,
constraining the first `mod tidy` adoption). Counts re-tallied against the four
lists below in this pass; the earlier "seventeen / four / six / six" did not
match them.

**Already satisfied — preserve:**

- **BZL-MOD-01**: `git ls-files MODULE.bazel.lock` returns the one tracked lock;
  the four fixture locks under `examples/*`/`e2e/*` are deliberately
  `.gitignore`d (`build-contracts-and-ci-posture.md:41`) — the named exception,
  not a finding.
- **BZL-MOD-07**: `MODULE.bazel:13-14` leaves the two build-time deps plain and
  `:16-18` marks all three dev tools (`rules_shell`, `stardoc`,
  `buildifier_prebuilt`) `dev_dependency = True`. Exactly the rule's shape.
- **BZL-MOD-14 / BZL-MOD-15**: `ocx/extensions.bzl:6-10` documents the purity
  boundary in a source comment and `:331` returns
  `extension_metadata(reproducible = True)`; the grep for `module_ctx.os`/
  `getenv` in that file is empty (`build-contracts-and-ci-posture.md:242`), and
  no `os_dependent`/`arch_dependent`/`facts` appears anywhere. The claim is
  visibly true in the lockfile too: `moduleExtensions` has exactly four keys
  (`pybind11_bazel`, `rules_fuzzing`, `rules_kotlin`, `rules_python`'s
  `pip_internal`) and `//ocx:extensions.bzl%ocx` is absent
  ([module-extension-purity-and-repo-contents-cache.md:307](bazel-bzlmod-and-repo-rules/module-extension-purity-and-repo-contents-cache.md)).
  **Now measured, not only asserted**: BZL-MOD-14's dynamic half was run against
  this extension on 8.7.0 — with `reproducible = True` removed, its lock entry is
  byte-identical across a control re-run, a `--repo_env=OCX_MIRRORS=…` run (a
  site-class variable its own repo rules read) and a `--repo_env=HOME=…` run (the
  variable `OCX_HOME` derives from). The env reads live entirely in
  `ocx_download`/`ocx_project_repo`, evaluated later and separately, which is
  exactly the boundary the source comment claims
  ([module-extension-purity-and-tidy-dynamic-check.md § Q2](bazel-measurements/module-extension-purity-and-tidy-dynamic-check.md)).
- **BZL-MOD-10**: measured clean — `bazel mod deps --lockfile_mode=update`
  followed by `bazel mod tidy` on a pristine copy at the 8.7.0 pin leaves both
  `MODULE.bazel` and `MODULE.bazel.lock` byte-identical, so the rule's own
  `git diff --exit-code` gate would pass today with an empty diff
  ([module-extension-purity-and-tidy-dynamic-check.md § Q1](bazel-measurements/module-extension-purity-and-tidy-dynamic-check.md)).
- **BZL-MOD-31**: zero repository-rule call sites outside `_ocx_impl`; the four
  rules are invoked only from the extension implementation.
- **BZL-MOD-20**: 0 `ctx.os.environ` and 0 `environ = [` in the tree (verified
  live); 9 `getenv` sites at `download.bzl:36,44` and
  `repo_utils.bzl:630,632,659,724,728` (`starlark-code-shape.md:147`).
- **BZL-MOD-21**: `package.bzl:166-168` is the correct post-8.0 pattern —
  `ctx.path(ctx.attr.index)` immediately followed by `ctx.watch_tree(index)`;
  `download.bzl:41` reads its only label attr with `read()`'s default
  `watch="auto"`, legal because the label points outside the repo being fetched.
  Three further `ctx.watch()` calls at `repo_utils.bzl:708,722,735`, one of them
  defensively guarded against a watch that could itself crash (`:733`).
- **BZL-MOD-22**: both fetch sites carry `sha256=` — `download.bzl:38`
  (`manifest_sha256(dist_url)`) and `:45` (`row["sha256"]`)
  (`starlark-code-shape.md:150`).
- **BZL-MOD-24**: satisfied in the strong form — the repo does not point at
  Bazel's cache; `AGENTS.md:34-35` documents that tool content is deduped
  through the shared, content-addressed `OCX_HOME` store, entirely outside
  Bazel's model (`build-contracts-and-ci-posture.md:197`).
- **BZL-MOD-25**: 0 `@@` occurrences and 0 `~`-separator hard-codes across
  `ocx/defs.bzl`, `ocx/extensions.bzl`, `ocx/private/` and `.bazelrc` (verified
  live).
- **BZL-MOD-27**: `starlark.md:32-33` states the convention (map each ocx
  sysexit to a `fail()` naming the fixable command, e.g. exit 65 → run
  `ocx lock`), and `SYSEXIT_HINTS` (`repo_utils.bzl:121-185`) implements it for
  12 of 13 codes with the deliberate absence of 82 explained in a comment at
  `:152-155`. Representative instance: `repo_utils.bzl:801-802`.
- **BZL-MOD-28**: `.bcr/presubmit.yml` is a `bcr_test_module` at
  `module_path: "e2e/bzlmod"`, matrix 4 platforms × 2 Bazel versions = **8
  cells** (not the frame's 4), and the build-only gap is self-documented with
  its own upgrade condition at `e2e/bzlmod/BUILD.bazel:5-7`. Both halves of the
  rule pass; the fleet reached this rule's conclusion independently.
- **BZL-MOD-29**: no `allow_yanked` anywhere.
- **BZL-MOD-30**: the `policy` tag class is root-only and at most one, enforced
  by `fail()` in `resolve_policy()` (`repo_utils.bzl:523-526`), called from
  `extensions.bzl:222-235` before any repo is declared — deliberately against
  the ecosystem's silent-ignore norm
  (`config-inventory.md:188`, `research_bazel-policy-surfaces.md:12`).

**Violated:**

| Rule | Site | What is wrong |
|---|---|---|
| **BZL-MOD-04** | `rules_ocx/.gitattributes:5` | `MODULE.bazel.lock merge=union linguist-generated=true`. `git check-attr merge MODULE.bazel.lock` prints `union` (verified live) — a generic, JSON-unaware line driver on the one file whose digest fields must never be merged textually. The failure is silent: a union merge writes no `<<<<<<<` markers, so Bazel's own merge-conflict detector never fires and nobody is prompted to look. Newly found by this wave; no wave-1 audit read `.gitattributes`. The line above it, `.gitattributes:4`, does the same to `ocx.lock` — same shape, different owner: that one is **BZL-RUST-05's** row, fixed by a JSON-aware driver of its own, never by pointing `bazel-lockfile-merge` at it. |
| **BZL-MOD-02** | repo-wide | `grep -rn 'lockfile_mode\|bazel mod' .github/ taskfile.yml taskfiles/ .bazelrc` returns nothing (verified live; `build-contracts-and-ci-posture.md:44,168`; independently re-confirmed by wave 3b's cross-group CI audit). No freshness gate, no scheduled `refresh` leg. Every other supply-chain surface in this repo has a guard — the dist snapshot, pin completeness, offline determinism — and the 166 KB lock with 141 registry entries has none. When the leg is added, it must key on the exit code: a `bazel_dep` bump without a `mod deps` produces the `YankedVersionsFunction` crash (Verdict 17), not a matchable lockfile message. |
| **BZL-MOD-32** | `ocx/extensions.bzl:213-260` | `_ocx_impl` mixes tag parsing with repository-rule invocation in one function: three `fail()` branches (root-only `download`, at-most-one `download`, root-only `project`) sit in the same body as the `ocx_download(...)` call at `:249`, so none of them is reachable by an offline test. The security-relevant half is already split correctly — `resolve_policy()` (`repo_utils.bzl:523-526`) is a pure function called at `:235` before any repo is declared, and it is tested — which is precisely the shape the rule asks for, applied to one tag class out of four. Partial, not absent. |
| **BZL-MOD-23** | `repo_utils.bzl:780,796,919` | Three `ctx.execute()` sites, all invoking the pinned `ocx` binary with a carefully assembled `env` dict from `make_ocx_env()` (`repo_utils.bzl:604-717`). That dict is layered *onto* the Bazel server's full ambient environment, not substituted for it — so any variable `ocx` itself consults that is not in `OCX_ENV_CLASSES` passes through unlisted. Nothing in `AGENTS.md` or `starlark.md` carries that qualifier, and `starlark.md:10-12` states the inventory convention as if it were complete. The env-class design is excellent and cannot close this gap; the missing thing is one sentence saying so. |
| **BZL-MOD-34** | `ocx/BUILD.bazel:6`, `ocx/private/BUILD.bazel:6` | Both packages open with `package(default_visibility = ["//visibility:public"])` (verified live) — the one shape BCR reviewers change-request every time, applied to the *private* implementation package as well, so `//ocx:defs`, `//ocx:extensions` and `//ocx/private:private` are all public API. Narrower than it looks, and worth stating so nobody over-corrects: the `.bzl` files already carry Starlark `visibility(["//ocx", "//ocx/tests"])` (`ocx/private/*.bzl:10-31`), which restricts `load()` and **not** target visibility — two independent mechanisms, and only the target-level one is what the query and the reviewers read. No BCR reviewer has raised it against 0.4.0 and the playbook's own wording is scoped to C++ overlays, which is why the row is SHOULD; the fix is a private default in `ocx/private/` plus one public entry point in `//ocx`. |
| **BZL-MOD-26** | `download.bzl:33`, `package.bzl:156`, `project.bzl:131` vs. the four `repository_rule(` calls (`download.bzl:61`, `project.bzl:232`, `package.bzl:299,408`) | Three of four rules read `ctx.os.name`/`ctx.os.arch` to resolve the host platform; **zero** set `configure = True` (`grep -rn 'configure *=' ocx/` is empty, verified live). Practical impact is narrow — attribute, impl and env changes still trigger a re-fetch — but `bazel fetch --force --configure` is a no-op against exactly the rules it exists for, and that is now measured rather than read: on 8.7.0, a bare `bazel fetch --force --configure` re-ran only the `configure`-marked scratch rule and left the unmarked one's fetched state byte-identical, while `--force` with both repos named explicitly re-ran both ([module-extension-purity-and-tidy-dynamic-check.md § Q5](bazel-measurements/module-extension-purity-and-tidy-dynamic-check.md)). The `local = True` half passes: nothing sets it. |

**Cannot exhibit — the shape never arises:**

- **BZL-MOD-17, BZL-MOD-18, BZL-MOD-19**: one module extension, four tag
  classes, zero `register_toolchains`/`native.bind` anywhere, and no `load()`
  from a generated repo. These stay P0 for shape F; they are inert here because
  the ruleset provisions binaries, not toolchains.
- **BZL-MOD-33**: `.bazelversion` is 8.7.0, where the repo contents cache is
  opt-in; the rule has nothing to bind to until the pin crosses 9.0.
- **BZL-MOD-11, BZL-MOD-12**: no `--vendor_dir` and no `VENDOR.bazel` in the
  tree (verified live).
- **BZL-MOD-03, BZL-MOD-05**: no lockfile conflict has been resolved in-repo,
  and no artifact cites a version number. The rules constrain the next
  occurrence. Note that BZL-MOD-04's violation is what makes BZL-MOD-03's
  procedure unreachable — a union merge never presents a conflict to resolve.
- **BZL-MOD-06**: `.bazelversion` has been touched exactly once, in the initial
  feature commit (`git log -- .bazelversion` → one entry, `02ba1a7`). The rule
  has never been exercised, and it becomes live the day the pin moves — which
  is frame decision Q2, still the owner's.
- **BZL-MOD-08, BZL-MOD-09**: no `single_version_override`, no
  `multiple_version_override`, no `compatibility_level` anywhere in
  `MODULE.bazel` (verified live). The BCR check diffs against the previous
  version, so absent-and-still-absent passes; the gap arrives the day someone
  adds the field.

**New commitments — forward-looking:**

- **BZL-MOD-16**: 0 of 4 repository-rule `_impl` functions call
  `repository_ctx.repo_metadata()`
  ([module-extension-purity-and-repo-contents-cache.md:308](bazel-bzlmod-and-repo-rules/module-extension-purity-and-repo-contents-cache.md)).
  An unclaimed opportunity, **not a defect** — but the wave-2 reasoning for
  *why* was wrong and is corrected here: the 9 `getenv` + 4 `watch` sites
  disqualify these rules from the experimental **remote** cache only. They do
  **not** disqualify them from the local repo-contents cache, which is measured
  to cache and hit a `getenv`-calling rule across `bazel clean --expunge`
  ([module-extension-purity-and-tidy-dynamic-check.md § Q3](bazel-measurements/module-extension-purity-and-tidy-dynamic-check.md)).
  So the opt-in is worth more than wave 2 said, and worth more still after the
  9.x bump, where the local cache is on by default. What remains true is that
  these rules `ctx.execute` the ocx CLI rather than `ctx.download`, and the
  ruleset already dedupes that content through `OCX_HOME` (BZL-MOD-24), so the
  benefit overlaps an existing mechanism. Recorded so a later wave neither
  re-flags it as a miss nor repeats the wrong reason.
- **BZL-MOD-10, BZL-MOD-13**: `bazel mod tidy` is never run and no flag list is
  hand-copied; both rules constrain the first adoption.

## Applied to the fleet shapes

- **A — Starlark ruleset publishing to the BCR (`rules_ocx`)**: binds every row
  except 33 (8.x pin) and is the only shape where the BCR rows (09, 28, 34) and the
  extension/repo-rule rows (14-27, 31-32) are live today. Six violations, all
  fixable in one commit each.
- **B — Rust CLI + Python harness (`ocx`, `grimoire`, `ocx-mirror`, `bob`,
  `rust-oci-client`)**: binds nothing today — no `MODULE.bazel` exists in any of
  them. On adoption, 01-08 bind first, and the submodule lineage (two repos
  vendoring the same forks, `ocx-mirror` vendoring `ocx` whole) turns into a
  `git_override`-versus-`bazel_dep` decision that `BZL-ARCH` owns, not this
  family (`fleet-bazel-readiness.md:282`). One clarification this wave settles:
  `bazel mod graph --extension_info`, `bazel mod explain` and `bazel mod
  show_repo` all exist with identical descriptions on 8.7.0 and 9.1.0 (no 9.2.0
  doc snapshot exists — Bazel archives per LTS minor), so the query is not the
  blocker; the blocker is that none of the five repos in the lineage is a Bzlmod
  module, and the forked submodules would each need a `MODULE.bazel` of their own
  before `git_override` is even an option
  ([adoption-go-no-go-gate-and-coupling-query.md § Q4](bazel-followups/adoption-go-no-go-gate-and-coupling-query.md);
  BZL-ARCH-28 owns the rule). An agent must run `find <repo> -maxdepth 1 -iname
  'MODULE.bazel*'` before recommending any `bazel mod` invocation against a fleet
  repo — empty means the query is aspirational, not runnable.
- **C — Rust + TypeScript monorepo (`creeptd-ng`)**: nothing today. On adoption
  it inherits the lockfile-churn rows hardest, because it is the fleet's only
  multi-language dependency graph (13 crates, three JS toolchains in one repo) —
  BZL-MOD-04 is the row that decides whether daily merges are survivable.
- **D — Python library or automation (5 repos)**: binds 01-06 on adoption. The
  measured detail that matters: `rules_python`'s `pip` extension is **not**
  reproducible — it carries a `moduleExtensions` entry in the fleet's own lock —
  so every dependency edit rewrites digest fields, which is exactly the conflict
  surface BZL-MOD-03 and BZL-MOD-04 exist for.
- **E — TypeScript package, extension or Action (8 repos)**: same as D on
  adoption. Two of the eight lock with `bun`, which `rules_js` cannot ingest
  today (`fleet-bazel-readiness.md:166`) — a `BZL-JS` problem, not a BZL-MOD
  one, but it means those two would arrive with a hand-written extension, which
  puts 14-19 in play immediately.
- **F — Future polyglot Bazel monorepo, and `rules_ocx`'s own users**: the
  primary audience for every row. 14-27 and 31-32 are P0 here specifically,
  because shape F is where third-party module extensions and repository rules
  actually get written, and where a purity or watch mistake ships to other
  people. 33 binds from the day such a monorepo pins 9.x.

## AI-agent failure modes

Ranked by how often it bites, most frequent first.

1. **Resolving a `MODULE.bazel.lock` conflict textually.** An LLM asked to
   resolve a merge conflict defaults to textual resolution everywhere — correct
   for `registryFileHashes`/`selectedYankedVersions`, actively wrong for a
   digest field it cannot verify, and the result parses as valid JSON either
   way. *Check:* `git diff` the resolved lock; a hand-typed value inside a
   `bzlTransitiveDigest`/`usagesDigest`/`generatedRepoSpecs` block means discard
   and follow BZL-MOD-03.
2. **Setting `merge=union` (or `ours`) on the lockfile because "it's JSON, union
   merges are usually fine."** The fleet's own live mistake. *Check:*
   `git check-attr merge MODULE.bazel.lock` must name `bazel-lockfile-merge`.
3. **Reaching for `ctx.os.environ` because it looks like a normal environment
   dict.** It reads correctly and silently breaks cache invalidation — no error,
   no lint, no test failure until someone notices a stale fetch. *Check:*
   `grep -rn 'os\.environ'`; non-empty is always a finding.
4. **Carrying WORKSPACE-era vocabulary into a Bzlmod repo** —
   `native.register_toolchains()` inside an extension, `--enable_bzlmod=true`
   (gone from every help surface on 9.2.0, not merely a no-op),
   `bazel sync`/`bazel sync --only=<repo>` (removed in 9.0; the replacements are
   `bazel fetch --all` and `bazel fetch --repo=@<repo>` — a ruleset's own current
   docs still print the removed form, see BZL-RUST-03), a `WORKSPACE.bzlmod`
   beside a real `MODULE.bazel`. Every one is a working pre-Bzlmod pattern in the
   training data. *Check:* BZL-MOD-18's grep, plus
   `grep -rn 'enable_bzlmod\|bazel sync' .bazelrc* .github/`.
5. **Assuming a `Label`-typed attribute auto-watches its file.** Pre-8.0
   training data and most public examples predate the flip. *Check:*
   BZL-MOD-21's per-attr grep.
6. **Believing a `getenv`/`watch` count proves a shelling-out rule hermetic.**
   The single most consequential misconception in this family. *Check:* does the
   rule call `ctx.execute()` at all? If yes, no count is a hermeticity proof.
7. **Parsing or hard-coding the `~` canonical-name separator.** Training data
   before 2026 uses `@@foo~1.0.0` near-universally; Bazel 8+ is `+` with no flag
   to revert. *Check:* `grep -n '~'` over `.bzl` and scripts for a
   canonical-shaped string.
8. **Citing a lockfile version number, or inventing a flag/subcommand that
   sounds right** — a fifth `--lockfile_mode` value, `bazel mod tidy --check`,
   `--dry-run`. Every other formatter in this space has a check mode, so the
   reflex is strong and wrong. *Check:* BZL-MOD-05's one-liner and BZL-MOD-13's
   `bazel help mod`.
9. **Conflating `extension_metadata(reproducible=)` with
   `repo_metadata(reproducible=)`.** They sound like one flag; they are two
   objects gating two different things (lockfile exclusion versus cache
   eligibility), and satisfying one says nothing about the other. *Check:* grep
   both names separately.
10. **Deleting `compatibility_level` because "the docs say it's a no-op."** True
    at the resolver, false at BCR presubmit. *Check:* diff the field before and
    after any edit destined for the registry.
11. **Reordering statements to "fix" a circular-definition error.** The cycle
    diagram in the message looks like an ordering problem. *Check:* did the fix
    move a repo-instantiating call into a different extension (real), or only
    move lines within one file (not a fix)?
12. **Debugging a `reproducible = True` extension by diffing
    `MODULE.bazel.lock`.** There is no entry to diff, by design, and the absence
    reads as "the extension never ran". *Check:* use
    `bazel mod show_repo <repo> --all_repos` or
    `bazel query @<repo>//... --output=build` instead.
13. **Asserting `--vendor_dir` produces an airgap-ready build**, because the
    docs' framing reads that way at a skim. *Check:* never write "fully offline"
    without a from-clean-cache, network-blocked run backing it.
14. **Copying a `--experimental_workspace_rules_log_file` runbook without
    `bazel clean --expunge` first.** Cached fetches never appear in the log, so
    a partial run under-reports non-hermetic operations with no indication that
    it did. *Check:* confirm the expunge step exists before trusting an empty
    log.
15. **Grepping a build log for one Bazel major's repository-rule error
    sentence.** The wording changed at the WORKSPACE-deletion boundary — 8.7.0
    names a WORKSPACE file, 9.2.0 names module-extension impl functions — so a
    matcher written against either silently never fires on the other. *Check:*
    match `Error in repository_rule:` and stop there (BZL-MOD-31).
16. **Treating "we're staying on 8.x" as lockfile-format stability.** The
    `lockFileVersion` 24 → 28 jump and the new `factsVersions` key land at
    **8.8.0**, a Maintenance release, not at Bazel 9. *Check:* BZL-MOD-06 binds
    on any `.bazelversion` edit, however small the step.
17. **Reading a flag's absence from `bazel help build --long` as "the flag does
    not exist" — or reaching for `bazel help all --long`, which is not a
    command on any version.** Startup options live in a separate surface;
    `--experimental_remote_repo_contents_cache` is invisible to every
    command-level help page. *Check:* BZL-MOD-13 requires both `help build
    --long` and `help startup_options`.
18. **Building a `--lockfile_mode=error` CI gate that greps stderr for a named
    lockfile message.** The commonest staleness case — a `bazel_dep` bump with no
    `mod deps` — exits 37 through an unhandled JVM crash whose text says "This is
    a bug in Bazel, please report", with no lockfile wording in it at all.
    *Check:* gate on the exit code (BZL-MOD-02, Verdict 17).
19. **Adding `environ = [...]` next to `getenv()` "to be safe".** They are
    alternatives joined by *or* in Bazel's own re-fetch trigger list, and
    `environ=` has carried a `Deprecated` marker since at least 8.7.0. A pair is
    a signal that the snippet came from stale material, not extra safety.
    *Check:* BZL-MOD-20's second grep.
20. **Pointing an `--output_user_root` at a directory inside the workspace on
    9.x.** Harmless on 8.7.0/8.8.0, an immediate hard failure of every command on
    9.2.0 once the derived repo-contents cache lands inside the main repo.
    *Check:* BZL-MOD-33 — the error names itself and the two fixes.

## Open questions

### Needs a human decision

- **Rolling out `bazel-lockfile-merge` in `rules_ocx`.** BZL-MOD-04 cannot be
  satisfied by a committed file alone: the `.gitattributes` line is half of it,
  and the other half is a one-time
  `git config merge.bazel-lockfile-merge.driver …` on every clone and every CI
  runner that merges. That is a team-wide setup step, not a code change. The
  alternative — deleting the `merge=union` line and accepting visible conflicts
  — is strictly better than today and costs nothing.
- **Whether `rules_ocx` adopts `repository_ctx.repo_metadata(reproducible =
  True)` before moving off the 8.7.0 pin.** Re-priced by this wave: it buys the
  **local** repo-contents cache, which the measurement shows a `getenv`-calling
  rule *is* eligible for — so all four rules qualify, contrary to wave 2's
  reading — and which is on by default from 9.2.0. The remote cache stays out of
  reach. Still couples to frame question Q2, which is already the owner's, but
  the cost/benefit now favours adding the line before the bump rather than after.

### Deserves another research round

None open for this family. The one entry — BCR module surface (M-B-15), "which
visibility defaults does the playbook name, and is there a query that enumerates
the externally-reachable set" — was run in wave 5 and answered on both halves;
it ships as BZL-MOD-34, with the residual gaps recorded in Verdict 18b (no
automated BCR check exists, the playbook's wording is C++-overlay-scoped, and the
query has not been run against a BCR-sized module).

### M-B rows the ruleset does not settle

None. **M-B-15** — is the module's publicly visible target set as small as BCR
asks? — was the last one open and is settled by BZL-MOD-34: wave 5 read the
playbook, sampled 15 merged PRs, and measured the enumerating query on both
majors. Recorded here so nobody re-opens the row against the old "no dive read
the playbook" note.

Partially settled, recorded so nobody re-opens it: **M-B-04**'s contested half
(gitignore the lock during a migration) is scoped rather than dismissed — the
ruleset takes the docs' position (commit it, BZL-MOD-01), and the gitignore
workaround survives only as an explicitly time-boxed exception for a
high-churn, multi-registry monorepo that has not yet deployed the merge driver.
The sanctioned destination is the driver, not the gitignore.

Closed by wave 4a/4b, recorded so nobody re-opens them: **M-B-20** and the
repository-rule-testing round (answered — Verdict 16, BZL-MOD-31/32, rule rows in
`BZL-TEST`); the **module-extension purity dynamic half** (executed — Verdict 11,
BZL-MOD-14); and the **repo-contents cache defaults** (measured per version —
Verdict 5, BZL-MOD-16, BZL-MOD-33). The **remote repo-contents cache** round is
closed as a *gap* rather than an answer: the flag question is settled, the
eligibility question was never exercised (Verdict 18a).

## Sub-artifacts

- [module-file-and-lockfile-hygiene.md](bazel-bzlmod-and-repo-rules/module-file-and-lockfile-hygiene.md)
  — `MODULE.bazel` directives, the lockfile's format and its four modes, the
  merge procedure and jq driver, `bazel mod`'s two undocumented subcommands, and
  vendor mode; found the fleet's `merge=union` violation and the third lockfile
  version number.
- [module-extension-purity-and-repo-contents-cache.md](bazel-bzlmod-and-repo-rules/module-extension-purity-and-repo-contents-cache.md)
  — what `reproducible = True` and `repo_metadata()` each promise, the two
  Bazel-9 caches and their two different eligibility bars, the circular-repo
  failure, and why `native.register_toolchains()` is unavailable in an
  extension.
- [repository-rule-hermeticity-and-bcr.md](bazel-bzlmod-and-repo-rules/repository-rule-hermeticity-and-bcr.md)
  — the exact re-fetch trigger list, the `ctx.execute()` environment leak read
  from source, the two Bazel-8.0 flag flips, the six-operation non-hermeticity
  taxonomy, and the BCR's add-only contract and presubmit validations.

Wave-4 inputs folded into this revision:

- [bazel-followups/repository-rule-and-extension-offline-testing.md](bazel-followups/repository-rule-and-extension-offline-testing.md)
  — the Skyframe phase gate measured from two call sites on two majors, the
  per-major error wording, the `rule()`-harness + `analysistest(expect_failure)`
  technique and its `unittest.make()` negative control, an eight-ruleset survey
  of offline ctx-fake practice, and buildifier's total absence of coverage for
  either the sha256 or the `getenv` check.
- [bazel-followups/adoption-go-no-go-gate-and-coupling-query.md](bazel-followups/adoption-go-no-go-gate-and-coupling-query.md)
  — `bazel mod graph --extension_info`/`show_repo`/`explain` confirmed on the
  8.7.0 and 9.1.0 versioned docs (no 9.2.0 snapshot exists), and the finding that
  the fleet's `ocx → grimoire → ocx-mirror` lineage has nothing for those
  commands to query until the forked submodules declare their own `MODULE.bazel`.
- [bazel-measurements/module-extension-purity-and-tidy-dynamic-check.md](bazel-measurements/module-extension-purity-and-tidy-dynamic-check.md)
  — the executed dynamic purity check, the per-version `--repo_contents_cache`
  default with a real cache-hit across `clean --expunge`, the
  `--lockfile_mode=error` crash on both majors, and the `configure = True`
  round-trip. WSL2 host, no build actions ran.
- [bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md](bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md)
  — flag defaults read off all three pinned binaries, `bazel help all` shown not
  to be a command, the startup-versus-command help-surface split, and
  `lockFileVersion` 24/28/28 with `factsVersions` appearing at 8.8.0.

Wave-5 inputs folded into this revision:

- [bazel-followups/bcr-playbook-flag-archaeology-rewind-and-js-gaps.md](bazel-followups/bcr-playbook-flag-archaeology-rewind-and-js-gaps.md)
  — BCR's maintainer playbook and automated-reviewer config on visibility, 15
  sampled merged PRs, and the measured `attr(visibility, …)`-versus-`visible()`
  comparison on 8.7.0 and 9.2.0 including `cquery`'s refusal of `visible()` and
  its enforcement of visibility on edges. (Its CACHE and JS answers belong to
  those families, not here.)
- [bazel-measurements/arch-live-graph-generated-semantics-and-lockfile-error.md](bazel-measurements/arch-live-graph-generated-semantics-and-lockfile-error.md)
  — the `--lockfile_mode=error` crash isolated to a *changed* version of an
  existing dependency, the clean documented message for a newly added one, `mod
  deps` alone reproducing it, `--registry` changing nothing, and the three
  upstream issues that name the root cause and the 9.3.0-only fix. WSL2 host.

## Revision log

One line per change; a later author diffs against this.

| What changed | IDs | Why | Input |
|---|---|---|---|
| Frontmatter: four inputs added to `consolidates`, `revised: 2026-09-06` added | — | Provenance for this pass | all four |
| Verdict 3 + BZL-MOD-05/06: the `lockFileVersion` 24 → 28 jump and `factsVersions` land at **8.8.0**, not at Bazel 9; BZL-MOD-06 now binds on a Maintenance bump | BZL-MOD-05, BZL-MOD-06 | Measured on three binaries; "staying on 8.x is schema-stable" was an unstated assumption in the earlier text | flag-defaults § Q6 |
| Verdict 5 + BZL-MOD-16: `--repo_contents_cache` default is `""` on 8.7.0/8.8.0 and **enabled** on 9.2.0; "no source states it was re-enabled" replaced by a measurement | BZL-MOD-16 | The earlier text left the default unknown and made the rule CONSIDER on that basis | both measurements |
| **Overclaim removed**: `getenv()`/`watch()` do **not** disqualify a repo rule from the *local* repo-contents cache — that bar is remote-only. Wave 2 stated it as universal, including in the rules_ocx write-up | BZL-MOD-16 | A cache-hit across `clean --expunge` was measured for a `getenv`-calling rule; the earlier reading would have talked a repo out of a benefit it qualifies for | purity measurement § Q3 |
| BZL-MOD-16 severity CONSIDER → SHOULD | BZL-MOD-16 | Mechanism now measured end to end rather than read from docs | purity measurement § Q3 |
| `--experimental_remote_repo_contents_cache` re-dated: a **startup** option, absent on 8.7.0, present and `false` on 8.8.0/9.2.0 — not "9.0.0+" as the sub-dive had it. The two measurements' apparent disagreement is a help-surface artefact, reconciled and verified live here | BZL-MOD-16, BZL-MOD-13 | One measurement grepped `help fetch --long`, where startup options never appear | flag-defaults § Q1 + live check |
| **BZL-MOD-13's own verification command was wrong**: `bazel help all --long` is not a command on any pinned version. Replaced with `bazel help build --long` **and** `bazel help startup_options` | BZL-MOD-13 | The rule about not inventing commands had invented one | flag-defaults § Q1 |
| BZL-MOD-13 extended: `incompatible_flags.yml` can *lag* an already-flipped flag, and a community rc preset's `flags.bzl` is a hand-maintained catalogue, not the CLI reference | BZL-MOD-13 | Cross-family ask from `BZL-FLAG` | BZL-FLAG consolidation; frame 3b#6 |
| BZL-MOD-02 re-scoped to the Bzlmod lockfile explicitly, pointing at BZL-RUST-01/-02 for the generator-owned shape; gate must key on the **exit code**, not a stderr string | BZL-MOD-02 | Cross-family ask from `BZL-RUST` (`determine_repin()` gates every ordinary build), plus the measured crash | BZL-RUST consolidation; purity measurement § Q4 |
| Verdict 17 added: `--lockfile_mode=error` fails a `bazel_dep` bump through an unhandled `IllegalStateException`, exit 37, on 8.7.0 and 9.2.0 alike; root cause not isolated, no upstream issue found — recorded as a documented gap | BZL-MOD-02 | Verdict 2's named message applies only to the `lockFileVersion` path | purity measurement § Q4 |
| BZL-MOD-04 scoped to `MODULE.bazel.lock` only: Bazel's jq driver must never be aimed at `cargo-bazel-lock.json`, `ocx.lock` or any other JSON lockfile | BZL-MOD-04 | Cross-family ask from `BZL-RUST` | BZL-RUST consolidation; frame 3b#2 |
| BZL-MOD-14 dynamic half promoted from a named procedure to a second verification, with the exact five lock-entry fields to diff | BZL-MOD-14 | The procedure was executed on 8.7.0 against the fleet's own extension | purity measurement § Q2 |
| BZL-MOD-20 rationale re-grounded: `environ=` is `Deprecated` in the 8.7.0 *and* current API doc, `getenv()` alone is necessary and sufficient (`or`, not `and`), buildifier has zero coverage; rule text now forbids pairing them | BZL-MOD-20 | Cross-family note (d); the deprecation wording is dual-version pinned | offline-testing § Q4; frame 4a#5 |
| BZL-MOD-22 rationale: buildifier's 82-category `WARNINGS.md` has zero sha256/integrity/checksum/hash coverage — the grep is the only check, not the cheapest; verification now says to read forward to the closing paren | BZL-MOD-22 | Removes the implication that a lint backstop exists | offline-testing § Q4 |
| Generated-repo reach caveat added to every grep-based cell touched, and once in the ruleset preamble | BZL-MOD-14, -16, -20, -22, -31 | House standard | — |
| **New** — repo-rule instantiation is Skyframe-phase-gated; match `Error in repository_rule:` only, because the sentence after it differs by major | BZL-MOD-31 | Measured from two call sites on two majors | offline-testing § Q2; frame 4a#5 |
| **New** — split an extension `_impl` into a pure decision function plus a thin repo-invoking tail | BZL-MOD-32 | The tail is untestable by construction, so every `fail()` left in it is unreachable by any test | offline-testing § Q1/Q2 |
| **New** — on 9.x keep `--output_user_root`/`--repository_cache` outside the main repo | BZL-MOD-33 | The 9.x default cache derives from `{--repository_cache}/contents` and hard-fails inside the workspace; reproduced live | live check on 9.2.0 (this pass) |
| Applied-to-rules_ocx: BZL-MOD-32 added as a fourth violation (`_ocx_impl` mixes three `fail()` branches with the `ocx_download` call); BZL-MOD-10/14/15/26 upgraded from asserted to measured; BZL-MOD-04's note extended to `.gitattributes:4`'s `ocx.lock` | BZL-MOD-04, -10, -14, -15, -26, -32 | Source read plus the measurements | purity measurement §§ Q1/Q2/Q5; BZL-RUST |
| Fleet shape B: the `bazel mod` coupling query is confirmed present on 8.7.0/9.1.0 but has nothing to query until the lineage declares `MODULE.bazel` files | — | Cross-family, routes to BZL-ARCH-28 | adoption follow-up § Q4 |
| Open questions: four rounds closed (repository-rule testing, purity dynamic half, cache defaults, remote-cache flag). Remote-cache *eligibility* and M-B-15 moved into Verdict 18 as documented gaps. M-B-20 row retired from the unsettled table | — | Answers folded; gaps are findings | all four |
| Failure modes 15-20 added (per-major error text, 8.8.0 schema jump, help-surface split, stderr-grep CI gate, `environ=`+`getenv()` pairing, output root inside the workspace) | — | Each is a trap this wave measured | all four |
| **Wave 5.** Frontmatter: two inputs added to `consolidates`, `revised_wave5: 2026-09-06` added; both listed under Sub-artifacts | — | Provenance for this pass | both wave-5 inputs |
| Verdict 17 + BZL-MOD-02: the crash is scoped to an **existing** dependency's locked version changing (bump or downgrade); a brand-new `bazel_dep` produces the clean "Missing checksum for registry file …" message instead, **also exit 37**. `bazel mod deps` alone reproduces; explicit `--registry` changes nothing. Three unrelated stderr texts now share exit 37, which strengthens the existing exit-code gate | BZL-MOD-02 | The earlier text implied one crash path for all staleness, and said Verdict 2's clean message belonged to the `lockFileVersion` path only | [arch-live-graph-generated-semantics-and-lockfile-error.md § Q3](bazel-measurements/arch-live-graph-generated-semantics-and-lockfile-error.md) |
| **Gap closed**: Verdict 17's "root cause not isolated, no upstream issue located" replaced with the named cause (yanked-version metadata fetched unchecksummed during version resolution, forbidden under ENFORCE) and the citations — #29497 fixed by PR #30315, backported only to `release-9.3.0`; #29146/#29188 open; the 8.x fix explicitly declined | BZL-MOD-02 | The gap was the wave's own recorded follow-on and is now answered | same |
| **New** — BCR visibility surface: default-private package, exactly one public target per entry point, verified with `bazel query 'attr(visibility, "//visibility:public", //...)'`; `visible(//..., //...)` explicitly rejected (universe-wide predicate, unsupported under `cquery`), and only `cquery` enforces visibility on edges. Empty output reads as a missing entry point, never as a pass. Re-measured here that the query also catches a target inheriting public from `package(default_visibility=)`, on both majors and both commands | BZL-MOD-34 | M-B-15's two blockers (no playbook read, no enumerating query) are both gone | [bcr-playbook-flag-archaeology-rewind-and-js-gaps.md § Q1](bazel-followups/bcr-playbook-flag-archaeology-rewind-and-js-gaps.md) + live re-check on 8.7.0/9.2.0 |
| Verdict 18 re-headed "one gap and one closed"; 18b rewritten from a documented gap to a settled row, keeping three smaller residuals (no automated BCR check, playbook scoped to C++ overlays, query unproven at BCR scale). Both M-B-15 open-question tables closed | BZL-MOD-34 | The gap statement was contradicted by the wave-5 dive | same |
| Applied-to-rules_ocx: BZL-MOD-34 added as a sixth violation (`ocx/BUILD.bazel:6` and `ocx/private/BUILD.bazel:6` both default the package public; the `.bzl` `visibility()` calls restrict `load()`, not targets) | BZL-MOD-34 | Verified live in the repo; the new row binds today because `rules_ocx` publishes to the BCR | live grep of `rules_ocx` BUILD files (this pass) |
| Applied-to counts re-tallied against the four lists: 33 → 34 rules, and "seventeen / four / six / six" → "fifteen / six / eleven / three" (BZL-MOD-10 counted twice). The old split matched no list — the violated table already held five rows while the prose said four, from the wave-4 pass | — | A count a later reviser diffs against has to match what it counts | machine count of the four lists (this pass) |

## Key sources

| URL | Why it is here |
|---|---|
| [bazel.build/external/lockfile](https://bazel.build/external/lockfile) | The four `--lockfile_mode` values, the merge-conflict procedure, the jq merge driver, and the reproducible-extension exclusion |
| [bazel.build/external/module](https://bazel.build/external/module) | MVS, override types, and the canonical-versus-apparent repo-name warning |
| [bazel.build/external/repo](https://bazel.build/external/repo) | The exact five-item re-fetch trigger list, `configure`/`local`, and the magic `name` attribute — also the primary evidence of doc lag (no mention of `repo_metadata()`) |
| [bazel.build/external/extension](https://bazel.build/external/extension) | `reproducible = True`'s exact promise and the `facts`/`facts_version` mechanism |
| [bazel.build/external/migration](https://bazel.build/external/migration) | Canonical statement that `register_toolchains` is `MODULE.bazel`-only and `bind()` is unsupported |
| [bazel.build/external/faq](https://bazel.build/external/faq) | The verbatim `compatibility_level` no-op wording (8.6.0/9.1.0) |
| [bazel.build/external/vendor](https://bazel.build/external/vendor) | `pin()`/`ignore()` semantics and the `tools_for_bazel_subcommands` mitigation |
| [bazel.build/remote/workspace](https://bazel.build/remote/workspace) | The six-item non-hermetic-operation taxonomy and the workspacelog runbook |
| [bazel.build/reference/command-line-reference#flag--repo_env](https://bazel.build/reference/command-line-reference#flag--repo_env) | "repository rules see the full environment anyway" — the doc-level confirmation of the `execute()` leak |
| [bazel.build/rules/lib/builtins/repository_os](https://bazel.build/rules/lib/builtins/repository_os) | `ctx.os.environ` documented as establishing **no** dependency |
| [Bazel 9.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/9.0.0) | The `single_version_override` hard error, WORKSPACE deletion, `facts`, and both repo-contents cache flags |
| [Bazel 8.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/8.0.0) | `--incompatible_no_implicit_watch_label` and `--incompatible_use_plus_in_repo_names` both flipped |
| [`StarlarkBaseExternalContext.java`](https://github.com/bazelbuild/bazel/blob/948b8c70e281c2fe42aa5468dad543c7af9f0ccc/src/main/java/com/google/devtools/build/lib/bazel/repository/starlark/StarlarkBaseExternalContext.java) | `execute()`'s local-versus-remote environment construction (L2051, L2103) — the ground truth for BZL-MOD-23 |
| [`BazelLockFileFunction.java`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/bazel/bzlmod/BazelLockFileFunction.java) | Version-mismatch handling (silent discard versus named error) and the textual merge-conflict detector |
| [`BazelLockFileValue.java`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/bazel/bzlmod/BazelLockFileValue.java) | The current `LOCK_FILE_VERSION` constant and the undocumented `facts`/`factsVersions` fields |
| [`mod.txt`](https://raw.githubusercontent.com/bazelbuild/bazel/master/src/main/java/com/google/devtools/build/lib/bazel/commands/mod.txt) | `bazel help mod`'s embedded usage text — proof that `tidy` and `dump_repo_mapping` are real and undocumented |
| [BCR `docs/README.md`](https://github.com/bazelbuild/bazel-central-registry/blob/main/docs/README.md) | Add-only guarantee, the ordered presubmit validation list, anonymous-module versus test module, yanking |
| [BCR `docs/bcr-policies.md`](https://github.com/bazelbuild/bazel-central-registry/blob/main/docs/bcr-policies.md) | The maintainer playbook's verbatim "keep the set of publicly visible targets small" bullet — with the forgotten-`//visibility:public` failure in the same sentence — behind BZL-MOD-34 |
| [BCR `.gemini/styleguide.md`](https://github.com/bazelbuild/bazel-central-registry/blob/main/.gemini/styleguide.md) | The registry's automated PR reviewer restating the same rule, quoted verbatim in real change requests |
| [GitHub discussion #27509](https://github.com/bazelbuild/bazel/discussions/27509) | The only source with the remote repo-contents cache's runtime-dependency exclusion and the `.marker`-file test |
| [bazelbuild/bazel#23127](https://github.com/bazelbuild/bazel/issues/23127) | `~`→`+` flipped *and* immediately made a no-op; take the apparent name as an explicit attr |

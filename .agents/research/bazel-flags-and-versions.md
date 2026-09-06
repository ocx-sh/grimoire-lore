---
title: "BZL-FLAG — Bazel majors, LTS policy, flag churn, rc files, ruleset floors"
topic: bazel-flags-and-versions
family: BZL-FLAG
model: opus
consolidates:
  - bazel-flags-and-versions/lts-policy-and-incompatible-flag-churn.md
  - bazel-flags-and-versions/bazelrc-hygiene-and-ruleset-version-floors.md
  - bazel-followups/flags-project-scl-bcr-flag-list-and-cgroups.md
  - bazel-followups/diagnosis-procedures-profiling-and-execlog-tooling.md
  - bazel-followups/aspects-vs-macros-protobuf-and-execution-groups.md
  - bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md
  - bazel-measurements/exit-39-and-bwob-on-cache-only-build.md
  - bazel-measurements/module-extension-purity-and-tidy-dynamic-check.md
builds_on:
  - bazel-starlark-and-build.md (BZL-LARK-01, BZL-LARK-10, BZL-LARK-28)
  - bazel-bzlmod-and-repo-rules.md (BZL-MOD-02, BZL-MOD-06, BZL-MOD-13, BZL-MOD-14, BZL-MOD-16, BZL-MOD-25)
  - bazel-hermeticity-determinism.md (BZL-HERM-01, BZL-HERM-02, BZL-HERM-04, BZL-HERM-09, BZL-HERM-22, BZL-HERM-28)
  - bazel-caching-rbe.md (BZL-CACHE-03, BZL-CACHE-04, BZL-CACHE-23, BZL-CACHE-29)
grounded_in:
  - bazel-frame.md (body + all seven Corrections blocks; the measurement wave wins on any disagreement; orchestrator decisions 2 and 6)
  - bazel-topic-map.md ("How to read this", "Conflicts resolved" 1-18, "The map" § H, "Staged for wave 3" § Group 12)
  - bazel-audit/build-contracts-and-ci-posture.md (§1 rc files, §2 version posture, §7 release/BCR)
  - bazel-audit/config-inventory.md
  - bazel-audit/starlark-code-shape.md
  - bazel-audit/fleet-bazel-readiness.md
date: 2026-09-05
revised: 2026-09-06
---

# BZL-FLAG

## Verdict

1. **The official backward-compatibility page is not a flag list, and the two
   real lists answer two different questions.** `bazel.build/release/backward-compatibility`
   names **zero** `--incompatible_*` flags — it describes the introduce/backport/flip
   process and defers to the `incompatible-change` issue label
   ([lts-policy-and-incompatible-flag-churn.md:138](bazel-flags-and-versions/lts-policy-and-incompatible-flag-churn.md)).
   BCR's `incompatible_flags.yml` (6 active entries plus 1 commented out on
   2026-09-06) answers *"which flags does BCR presubmit force-flip today, and on
   which channel"*; the issue label (256 all-time, 29 open) answers *"what is
   coming, and where is its migration writeup"*. BCR's own contributor docs settle
   the first list's purpose in BCR's words — "BCR presubmit tests new modules
   against these flags using Bazelisk's `--migrate` feature, providing module
   maintainers with early warnings" — so it is a **forward-migration warning
   list**, never a regression-coverage list
   ([flags-project-scl-bcr-flag-list-and-cgroups.md § Q2](bazel-followups/flags-project-scl-bcr-flag-list-and-cgroups.md)).
   BZL-FLAG-07 makes the split part of the rule rather than a footnote.
   Bazel-version-independent.

2. **The narrow list lags a flag that already shipped as a default, and the lag
   is staleness, not policy.** `--incompatible_disable_autoloads_in_main_repo`
   sits under `last_green`/`rolling` in the live `incompatible_flags.yml` while
   the 9.0.0 release notes list it among the flags flipped in 9.0
   ([:145](bazel-flags-and-versions/lts-policy-and-incompatible-flag-churn.md)).
   The wave-4 round refutes the structural reading: the file has **four commits in
   its entire life, the last on 2025-07-25** — six months before 9.0.0 shipped —
   and the *other* three flipped-in-9.0 entries are scoped correctly (numbered
   channels only, absent from `9.x`), which a deliberate post-flip retesting
   policy would not produce. One anomaly in an unmaintained file, not a pattern.
   The cross-check stays MUST (BZL-FLAG-08) but its reason changes: read every
   entry as possibly stale, never as evidence of intent. Bazel 8/9.

3. **Correction to the map, on primary-source evidence: M-H-08's premise is
   false.** The map row asks whether `--sandbox_default_allow_network=false`
   "could break an unsandboxed repository-rule fetch". It cannot. The flag is
   tagged `execution` and governs sandboxed build and test *actions*;
   `repository_ctx.download`/`.execute()` run in the loading phase, which has
   never been sandboxed — proved by the still-open 2019 feature request asking
   for exactly that
   ([bazelrc-hygiene-and-ruleset-version-floors.md:158](bazel-flags-and-versions/bazelrc-hygiene-and-ruleset-version-floors.md),
   [bazelbuild/bazel#7764](https://github.com/bazelbuild/bazel/issues/7764)).
   Measured default `true` on 8.7.0, 8.8.0 and 9.2.0 alike, read off the binaries
   ([flag-defaults-and-trivial-builds-across-versions.md § Q1](bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md)).
   The flip itself stays owned by [BZL-HERM-02](bazel-hermeticity-determinism.md);
   BZL-FLAG-24 owns only the mis-citation. Bazel 7/8/9.

4. **Correction to the map: M-H-14's example list is wrong on `rules_ts` — and a
   version floor has three mechanisms, not two.** The map states
   "rules_js/rules_ts/rules_lint declare one". Measured at the release tags on
   2026-09-05: `rules_js` 3.4.1 and `rules_lint` 2.9.0 declare
   `bazel_compatibility = [">=7.6.0"]`; **`rules_ts` 3.10.1 declares none**, while
   its own `main` carries `>=7.7.0`
   ([bazelrc-hygiene-and-ruleset-version-floors.md:176-183](bazel-flags-and-versions/bazelrc-hygiene-and-ruleset-version-floors.md),
   cross-checked against [BZL-LARK](bazel-starlark-and-build.md) verdict 8). Three
   of six declare nothing at their pinned release; for those the real floor lives
   only in `.bazelci/presubmit.yml` — `7.4.1` exactly for `rules_rust` 0.74.0, a
   `7.x` leg for `rules_python` 2.3.3 and `rules_cc` 0.2.22. The wave-4 round adds
   a seventh module and a third mechanism: protobuf's own
   `bazel_compatibility = [">=8.0.0"]` first appears at **BCR 35.0** (absent at
   33.4 and 34.x), while Bazel 9 separately *enforces a minimum protobuf module
   version of 33.4* from its own side — a graph-resolution minimum, not a
   self-declared compatibility range
   ([aspects-vs-macros-protobuf-and-execution-groups.md § 2](bazel-followups/aspects-vs-macros-protobuf-and-execution-groups.md)).
   Conflating the two misattributes the mechanism. BZL-FLAG-27.

5. **Correction to the map: M-H-02's proposed check is half a check.** The row
   says to verify the autoload migration through the `native-cc-*`/`native-java-*`/
   `native-py`/`native-sh-*` buildifier families. [BZL-LARK](bazel-starlark-and-build.md)
   verdict 3 measured that `WARNINGS.md`'s flag column is provenance rather than a
   live switch, and BZL-LARK-10 already forbids reading a clean `native-py`/
   `native-sh-*` result as proof of Bazel-9 readiness. The ground truth for the
   symbol-to-`load()` mapping is tagged source — `AutoloadSymbols.java` at
   `release-9.0.0`, which no prose page enumerates
   ([lts-policy-and-incompatible-flag-churn.md:172-186](bazel-flags-and-versions/lts-policy-and-incompatible-flag-churn.md)).
   The repair tool is `buildifier --lint=fix -r -v .`, which is
   [#23043](https://github.com/bazelbuild/bazel/issues/23043)'s own migration-guide
   text. Measured on the real binaries, the breakage has **two error shapes**, not
   one: bare `py_library`, `sh_binary` and `proto_library` fail on 9.2.0 with a
   plain `name 'X' is not defined` plus a *wrong* `did you mean` suggestion, while
   `cc_library` alone hits a purpose-built removed-rule stub that names
   `buildifier --lint=fix` as the fix. All four build unloaded on 8.7.0, and all
   four build on both majors once the `bazel_dep` and `load()` are added
   ([flag-defaults-and-trivial-builds-across-versions.md § Q4](bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md)).
   BZL-FLAG-16.

6. **"9 months of Active support" is stale and no artifact may repeat it.** The
   2020 LTS announcement states 9 months, the 2021 rolling post repeats a matching
   cadence figure, and neither has been corrected at its own URL. Measured against
   tagged release dates the last two transitions were **12.0** and **13.4** months
   (7.0.0 2023-12-11 → 8.0.0 2024-12-09 → 9.0.0 2026-01-20), and the live
   `bazel.build/release` page has itself dropped the fixed-duration framing
   ([:99-112](bazel-flags-and-versions/lts-policy-and-incompatible-flag-churn.md)).
   Active means "until the next major ships". This is map conflict 8's lesson
   widened to blog-vs-live-docs-vs-measured-tags: three sources, three answers,
   and only the tags carry a date to check. BZL-FLAG-04, under
   [BZL-LARK-28](bazel-starlark-and-build.md)'s discipline.

7. **The permanent-flip trap is confirmed twice and is now a generalisation, not
   an anecdote.** Wave 2 found `--incompatible_use_plus_in_repo_names` flipped
   default-true in 8.0 *and* made a no-op in the same release
   ([BZL-MOD-25](bazel-bzlmod-and-repo-rules.md)). `--incompatible_disable_native_repo_rules`
   repeats it exactly in 9.0: listed both under "flipped in 9.0" and in the
   "now no-ops" appendix
   ([:216-218](bazel-flags-and-versions/lts-policy-and-incompatible-flag-churn.md)).
   Two independent instances is enough to make BZL-FLAG-09 a MUST for anyone
   writing migration prose: check the no-ops appendix before offering any
   `--no<flag>` escape hatch. Bazel 8 and 9.

8. **`WORKSPACE` on Bazel 9 is not a deprecation, and `--enable_workspace` is not
   a no-op there — it is gone.** 8.0.0 disabled the mechanism by default behind a
   real `--enable_workspace`; 9.0.0 removed the logic outright
   ([:156-162](bazel-flags-and-versions/lts-policy-and-incompatible-flag-churn.md)).
   The 9.0.0 notes' appendix calls `--enable_workspace` and `--enable_bzlmod`
   "now no-ops"; the 9.2.0 binary disagrees and the binary wins — both are
   **absent from every help surface** (`help build --long` and
   `help startup_options` both), while both are present on 8.7.0 and 8.8.0
   (`--enable_workspace` false, `--enable_bzlmod` true)
   ([flag-defaults-and-trivial-builds-across-versions.md § Q1](bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md)).
   The distinction is load-bearing: "no-op" invites writing the flag into a
   generated config that then fails the whole invocation with `unrecognized
   option`. A model trained on pre-2026 material remembers `--enable_workspace` as
   a live toggle, which is why BZL-FLAG-13 exists as a separate row from
   BZL-FLAG-12. Reinforces [BZL-HERM-28](bazel-hermeticity-determinism.md).
   Bazel 9+ (measured at 9.2.0; the exact 9.x minor of removal is unmeasured).

9. **Six of the nineteen flags flipped in 9.0 are load-bearing for a
   Starlark-only codebase; two are owned elsewhere and one is inert by default.**
   The 9.0.0 notes list exactly 19 flags. For a repository-rule and
   module-extension codebase with zero `cc_*`/`java_*`/`py_*`/`proto_library`/
   `objc_*` targets, the live set is: the two autoload flags,
   `--incompatible_disable_native_repo_rules`, `--incompatible_repo_env_ignores_action_env`
   ([BZL-HERM-04](bazel-hermeticity-determinism.md)), `--incompatible_strict_action_env`
   ([BZL-HERM-01](bazel-hermeticity-determinism.md)) and
   `--incompatible_use_new_cgroup_implementation`
   ([:188-214](bazel-flags-and-versions/lts-policy-and-incompatible-flag-churn.md)).
   The cgroups flag is now characterised and it is the weakest of the six:
   `VirtualCgroupFactory.create()` returns `VirtualCgroup.NULL` whenever no
   `--experimental_sandbox_limits`/`--experimental_sandbox_memory_limit_mb` is
   set, so a build that requests no limits never touches `/sys/fs/cgroup` on
   either implementation or either major
   ([flags-project-scl-bcr-flag-list-and-cgroups.md § Q3](bazel-followups/flags-project-scl-bcr-flag-list-and-cgroups.md)).
   BZL-FLAG-18 ships the reduction as CONSIDER — a reading aid whose targets are
   independently MUST-checkable — cites rather than re-derives the two BZL-HERM
   rows, and now routes the cgroups flag to BZL-FLAG-35.

10. **`--incompatible_strict_action_env` splits the fleet's own CI matrix and
    nothing says so.** Measured off the binaries, not inferred: `false` on 8.7.0
    and 8.8.0, `true` on 9.2.0, with an env capture showing 8.7.0 leaking
    `LD_LIBRARY_PATH` and the client `PATH` and nothing else
    (frame Corrections, measurement wave, item 8; [BZL-HERM-01](bazel-hermeticity-determinism.md)).
    `rules_ocx` runs 8.7.0 and 9.x/rolling in one matrix (`ci.yml:43`) with no
    such line in any rc file — so the 8 leg inherits `LD_LIBRARY_PATH` and the
    client `PATH` and the 9 leg does not, with zero configuration difference to
    explain it. The fix is not a comment: it is a version-gated line
    (`try-import-if-bazel-version`, or a per-flag `if_bazel_version` predicate in
    a generated preset), which is BZL-FLAG-21. Bazel 8 vs 9 is the boundary the
    whole rule turns on.

11. **The committed/try-imported split has two CI failure shapes, and the worse
    one is the one that looks tidier.** Either CI never creates the try-imported
    filename — so a developer's content is guaranteed unvalidated — or CI
    *recreates the same path* at runtime with a disjoint flag set, which invites a
    reviewer to infer overlap that does not exist. `rules_ocx` is the second case:
    `.github/actions/remote-cache/action.yml:27-34` writes its own `.bazelrc.user`
    holding cache flags only, sharing nothing with the developer file's
    `CC=`/`-layering_check` pair
    ([bazelrc-hygiene-and-ruleset-version-floors.md:242,348](bazel-flags-and-versions/bazelrc-hygiene-and-ruleset-version-floors.md)).
    BZL-FLAG-20 makes naming which shape applies the deliverable; the finding is
    the *undocumented* state, not the configuration.

12. **`--credential_helper` placement is inherited whole, not re-derived.**
    [BZL-CACHE-04](bazel-caching-rbe.md) already states it at MUST with the full
    evidence: Bazel resolves and spawns a `%workspace%`-relative helper with the
    client environment before the sandbox, on a plain `bazel query //...` of a
    fresh clone, and [bazelbuild/bazel#30439](https://github.com/bazelbuild/bazel/issues/30439)
    was closed as *intended behaviour under Bazel's documented threat model* — so
    the constraint does not loosen on any future version. This file adds only the
    generalisation it is one instance of: **any flag whose value is executed, or
    whose value is a secret, lives in an rc file the repository does not ship** —
    never merely one the repository ignores by convention (BZL-FLAG-19's second
    clause). No row restates the flag.

13. **A ruleset's "current version" cannot come from `releases/latest`.**
    Measured live: `gh api repos/aspect-build/rules_js/releases/latest` returned
    `v2.9.3`, a 2.x maintenance backport published two minutes *after* the actual
    current-major `v3.4.1` on the same morning, because the API's "latest" is
    publish-timestamp order, not semver order
    ([bazelrc-hygiene-and-ruleset-version-floors.md:187-196](bazel-flags-and-versions/bazelrc-hygiene-and-ruleset-version-floors.md)).
    And the "one major behind" check is structurally broken for a `0.y.z` ruleset,
    where `y` is the breaking-change counter: a leading-digit comparison never
    fires for `rules_rust` 0.74.0 or `rules_cc` 0.2.22. BZL-FLAG-28 and
    BZL-FLAG-29 are check-correctness rules, not policy preferences.

14. **Two dive candidates were merged rather than shipped side by side, and one
    was demoted on sourcing — then half-settled by measurement.** Dive 1's
    candidates 9 (MUST: run `--migrate` before a bump) and 10 (CONSIDER:
    `--strict` first) describe one procedure, so BZL-FLAG-17 carries both with the
    ordering as an efficiency clause inside a MUST. Dive 2's candidates 8 and 16
    are one numeric-knob rule; 16's copy-forward mode folds into 8's verification
    (BZL-FLAG-22). Dive 2's observation that `.bazelrc:8`'s
    `--incompatible_disallow_empty_glob` is a no-op on Bazel 8+ rested on the
    community preset's own `if_bazel_version` gate — codified, not normative. That
    premise is now **measured**: the flag defaults `true` on 8.7.0, 8.8.0 *and*
    9.2.0, so the fleet's line is dead on every leg of its own matrix. BZL-FLAG-26
    stays CONSIDER because what is still argued is the *policy* (delete the line
    or comment it), not the fact.

15. **Version boundaries every decision above depends on, stated once, measured
    where a binary could answer.** Bazel **8.0.0** (2024-12-09): WORKSPACE
    disabled by default behind a live `--enable_workspace`;
    `--incompatible_autoload_externally` defaults to the full moved-symbol
    allowlist; `--incompatible_use_plus_in_repo_names` flips and becomes a no-op.
    **8.2.0**: `--incompatible_disable_autoloads_in_main_repo` available as an
    opt-in migration aid. **8.4.0**: `--module_mirrors` available. **8.5.0**:
    `--incompatible_enforce_starlark_utf8` available. **8.8.0**:
    `--experimental_remote_repo_contents_cache` appears as a **startup** option
    (default false), invisible to `help build --long`; `bazel mod deps` starts
    writing `lockFileVersion` 28 with a new `factsVersions` key, so 8.7.0→8.8.0
    crosses the same lockfile-schema boundary as 8.7.0→9.2.0. **9.0.0**
    (2026-01-20): WORKSPACE logic deleted and both `--enable_*` flags gone from
    the binary's help surfaces by 9.2.0; autoload defaults to the empty string; 19
    flags flip; `--incompatible_disable_native_repo_rules` flips *and* becomes a
    no-op; `--incompatible_strict_action_env` becomes `true`;
    `--incompatible_compact_repo_mapping_manifest` becomes `true`;
    `--incompatible_use_new_cgroup_implementation` becomes `true`; a minimum
    protobuf module version of 33.4 is enforced; `bazel analyze-profile` is
    deleted; `bazel dump --skyframe`'s `working_set`/`working_set_frontier_deps`
    enum values are renamed `active_directories`/`active_directories_frontier_deps`;
    `bazel sync --only=` is deleted (replacement `bazel fetch --repo=@<repo>`);
    `--experimental_remote_merkle_tree_cache` and
    `--incompatible_remote_use_new_exit_code_for_lost_inputs` — both real and
    default-active through 8.8.0 — are removed. **9.2.0**: `--repo_contents_cache`
    is on by default, deriving `{--repository_cache}/contents`. Live LTS matrix on
    2026-09-06: **9 Active (9.2.0, ends Dec 2028)**, **8 Maintenance (8.8.0, ends
    Dec 2027)**, 7 Maintenance (7.7.1, ends Dec 2026), 6 Deprecated. Ruleset
    versions and floors, measured 2026-09-05/06: rules_js 3.4.1 (`>=7.6.0`),
    rules_ts 3.10.1 (none declared; `main` `>=7.7.0`), rules_python 2.3.3 (none;
    CI `[7.x, 8.x, 9.x]`), rules_rust 0.74.0 (none; CI `minimum_bazel_version
    "7.4.1"`), rules_cc 0.2.22 (none; CI `7.x`), rules_lint 2.9.0 (`>=7.6.0`),
    protobuf 36.1.bcr.1 (`>=8.0.0`, first declared at BCR 35.0).
    **pinned** — per frame decision 2, `rules_ocx`'s 8.7.0 pin stays and this
    family ships dated guidance for 8 and 9 side by side, with an expiry
    (BZL-FLAG-05) rather than an open-ended promise.

16. **`PROJECT.scl` coexists with `.bazelrc`; it does not replace it, and its
    already-default-true enforcement flag is inert.** Discovery walks up a
    *target's* package path to the innermost `PROJECT.scl`, resolved per target
    rather than per invocation. `--enforce_project_configs` defaults **true** on
    every tag from 8.7.0 through 9.2.0 — but `FlagSetFunction` returns an empty
    flag set immediately when the resolved file declares no `configs`/
    `buildable_units`, so "a `PROJECT.scl` with no configs" and "no `PROJECT.scl`
    at all" are behaviourally identical. Both `--enforce_project_configs` and
    `--scl_config` carry `UNDOCUMENTED` + `EXPERIMENTAL` unchanged across those
    tags and appear nowhere on the generated CLI reference. The sharpest result:
    a buildable unit may reference `--config=<name>` only if that config traces to
    Bazel's synthetic "client" source or an `InvocationPolicy` — `GlobalRcUtils`
    ships an empty `ALLOWED_GLOBAL_CONFIGS` and names only those two, so a config
    defined in *any* of the five ordinary rc layers fails at analysis time with
    "isn't a global rc file". Zero of the six shipped-set rulesets reference
    `PROJECT.scl` (same-day grep across all six)
    ([flags-project-scl-bcr-flag-list-and-cgroups.md § Q1](bazel-followups/flags-project-scl-bcr-flag-list-and-cgroups.md)).
    BZL-FLAG-32 and BZL-FLAG-33; settles M-H-15. Bazel 8.7.0+.

17. **A major bump breaks commands and enum values, not only flags — and Bazel's
    own docs are wrong about it in both directions.** `bazel analyze-profile` was
    deleted at 9.0.0 (`ProfileCommand.java` present at 8.7.0/8.8.0, absent at
    9.0.0/9.1.0/9.2.0) while Bazel's *own frozen 9.1.0 docs snapshot still lists
    it*. `bazel dump --skyframe=working_set` was renamed `active_directories` at
    9.0.0 while the live memory page still prints the 8.x spelling.
    `bazel sync --only=` was deleted at 9.0.0 while rules_rust's own current docs
    still print it (frame Corrections, wave 4a item 1 and wave 3b item 2). A
    migration checklist that greps only for `--incompatible_*` flag names passes a
    repository whose task files and docs are already broken. BZL-FLAG-31.
    Bazel 8→9.

18. **Documented gaps, carried rather than hidden.** (a) The cgroups verification
    is one-way: `--sandbox_debug --subcommands \| grep -- '-C '` proves a limit is
    live when it hits, but an EMPTY result cannot distinguish "flag off", "no
    limits requested" and "cgroup directory not writable" — there is no
    `bazel info` line and no exit code that separates them, and
    `BlazeRuntime.getCgroupsInfo()` has zero external callers at 9.2.0. (b) No
    live measurement exists of whether a GitHub-hosted runner or a plain
    `docker run` grants a writable cgroup delegation; the silent-degrade path is
    established from source, not from a run on either host. (c) The change that
    actually removed `--experimental_remote_merkle_tree_cache` and
    `--incompatible_remote_use_new_exit_code_for_lost_inputs` between 8.8.0 and
    9.2.0 is unidentified — [#25334](https://github.com/bazelbuild/bazel/pull/25334),
    cited in this corpus for the second, is `CLOSED` with `mergedAt: null`.
    (d) Every measurement folded into this file was taken on one WSL2 host with
    working unprivileged user namespaces and a real `linux-sandbox`; the
    flag-default reads are host-independent, the sandbox and cgroup behaviour
    is not.

## The ruleset

**This topic owns `BZL-FLAG` exclusively.** Thirty-five rules, 27 MUST. Rows are
grouped by the artefact the check reads: rows 01-06 read `.bazelversion` and the
CI matrix, 07-11 read the upstream flag surface, 12-18 are the 8→9 migration,
19-26 read rc files, 27-30 read `MODULE.bazel` and a ruleset's own release
history. Rows 31-35 are the wave-4 additions: what a major bump breaks besides
flags (31), `PROJECT.scl` (32-33), a flag a ruleset rather than Bazel owns (34),
and the one 9.0 flip whose behaviour had to be measured before it could be
audited (35). **pinned** marks a rule that fixes a project decision rather than
deriving a fact.

**Reach caveat, applying to every grep-based verification below** (frame
Corrections, wave 2, item 9): a grep over `BUILD*`/`*.bzl` sees only checked-in
text. BUILD and `.bzl` content that a repository rule or module extension
*generates* as a string is invisible to it, so an EMPTY grep over a repository
that generates Starlark is inconclusive for the generated half. Where that
matters — BZL-FLAG-16, BZL-FLAG-18, BZL-FLAG-31 and BZL-FLAG-34 — the row says
so again.

**Help-surface caveat, applying to every flag-existence check below**: `bazel help
all --long` is **not a command** (`ERROR: 'all' is not a known command`). The two
real surfaces are `bazel help <command> --long` and `bazel help startup_options`,
and a flag can live in only one of them.

| ID | Rule | Rationale | Verification (and how EMPTY reads) | Severity | Applies to | Settles | Depends on |
|---|---|---|---|---|---|---|---|
| **BZL-FLAG-01** | Pin `.bazelversion` to an exact three-component LTS semver. Never `rolling`, `last_green`, `last_rc`, `latest`, `latest-N`, a bare RC string, a floating `X.x`/`X.*`, or a commit hash — outside a deliberately disposable fixture directory (`examples/`, `e2e/`), which states the exemption in a comment. | Every one of those resolves to a value that moves independently of any code change in the repo, which is the opposite of what a pinned build file is for; a rolling release warns in its own announcement that "default behaviors may change with any rolling release". | `cat .bazelversion` must match `^[0-9]+\.[0-9]+\.[0-9]+$`. A **missing** file is equally a finding — bazelisk then falls through to "the latest official release", which is unpinned by a different route. EMPTY output from `cat` (empty file) = finding. | MUST | Bazel 6+ (any Bzlmod-era repo); shapes A, F | M-H-01, M-H-07 | — |
| **BZL-FLAG-02** | Run `rolling` and `last_green` as non-blocking CI canaries only (`continue-on-error` or the platform's equivalent), with the non-blocking directive on the leg itself, and never as any repo's default pin. | No patch-backport promise exists for either channel, and default behaviour can change on any rolling cut — so a rolling regression that blocks merges blocks them on a version nobody chose. | `grep -n 'rolling\|last_green' <CI config>` then read that leg's failure-handling directive. A rolling/last_green leg **without** a non-blocking directive is the finding. EMPTY (no such leg) = pass by absence, not by configuration. | MUST | Bazel all; CI-matrix repos, shapes A, F | M-H-07, M-H-09 | — |
| **BZL-FLAG-03** | Never write a literal Bazel version into a CI workflow's `USE_BAZEL_VERSION` (or `.bazeliskrc`) — only a matrix or env reference. | bazelisk resolves `USE_BAZEL_VERSION` **ahead of** `.bazelversion`, so a hardcoded literal silently overrides every future bump to the committed file; the pin then lives in two places that can disagree without any error. | `grep -n 'USE_BAZEL_VERSION' .github/workflows/*.yml .bazeliskrc 2>/dev/null` — a literal semver rather than a `${{ matrix.* }}`/`${{ env.* }}` expression, alongside a differing `.bazelversion`, is the finding. EMPTY = pass (the file is the single source). | MUST | Bazel all (bazelisk mechanism); shapes A, F | M-H-01 | — |
| **BZL-FLAG-04** | Re-derive a pinned major's LTS stage and Support-Ends date from `bazel.build/release` every time either is cited, and never state a fixed month-count for how long a major stays Active — state "until the next major ships", and compute a duration from two consecutive majors' tagged release dates when one is needed. | The live table shifts on the ~2-month Active-track minor cadence, so a citation ages within one minor release; and the 2020 announcement's "9 months" figure measures 12.0 and 13.4 months against tags for the last two transitions, while the live page has dropped the framing entirely. | Fetch `bazel.build/release` and diff the pinned major's row against the last recorded value; for a duration, `gh api repos/bazelbuild/bazel/releases/tags/<N>.0.0 --jq .published_at` for two consecutive majors. A 404 on the newer tag means that major has not shipped — do not extrapolate. No diff = pass. | SHOULD | Bazel all; shapes A, F | M-H-01 | BZL-LARK-28 |
| **BZL-FLAG-05** | **pinned** — Carry a Maintenance major's dated guidance side by side with the Active major's only through that major's own published Support-Ends date; past it, collapse the content to the historical-footnote pattern (name the version, name what stopped being true, move on). For Bazel 8 that is **through Dec 2027**. | Turns "we still cover Bazel 8" from an open-ended assumption into a checkable claim with an expiry a maintainer can act on. Frame decision 2 pins the dual-major posture; this pins its end. Assumption named: it presumes the ruleset is re-read at least once before the date arrives. | Reading heuristic — compare the artifact's "supports Bazel N" claim against the live `bazel.build/release` row for N. Once that row reads Deprecated the claim is already stale and the content should have converted. EMPTY (no such claim anywhere) = the artifact is silently single-major, which is its own finding. | SHOULD | All majors; shapes A, F | — | BZL-FLAG-04 |
| **BZL-FLAG-06** | Pin the launcher that resolves `.bazelversion` — bazelisk, or whatever provisions it — as explicitly as the Bazel version itself, and name both layers wherever the toolchain is documented. | The pin chain has two links, and only one of them is `.bazelversion`. A floating launcher can lose the ability to resolve a version keyword (`9.x`), or change its `--strict`/`--migrate` flag set, while the Bazel pin reads as unchanged. Sourced from the fleet's own arrangement plus bazelisk's documented resolution order, not from an upstream recommendation — hence SHOULD. | Read the launcher's own pin: a digest or exact version in whatever lockfile provisions it (`ocx.lock`, a container digest, a checked-in checksum). A `:latest`-style tag with no lock behind it is the finding. EMPTY (the launcher comes from an unpinned system package or a bare `curl`) = finding. | SHOULD | Bazel all; shapes A, F | M-H-01 (extends) | — |
| **BZL-FLAG-07** | Read the current `--incompatible_*` surface from BCR's `incompatible_flags.yml` (narrow: which flags BCR presubmit force-flips today, and on which channel) or the `incompatible-change` GitHub issue label (broad: what is coming, with the full migration writeup) — never from `bazel.build/release/backward-compatibility`, which names no flags at all. Read a commented-out entry in that yml as "known, tracked, currently blocked", never as "resolved"; read every entry as possibly stale. | Confirmed by direct fetch: the policy page describes only the process and links to the label. BCR's own contributor docs state the yml's purpose — early `--migrate` warnings for module maintainers — so it answers "what is BCR force-flipping", never "what is already the default". The staleness clause is measured: the file has four commits in its whole history, the last on 2025-07-25, spanning the entire 9.0 release. The live commented-out entry is `--noincompatible_enable_deprecated_label_apis`, blocked on [#23144](https://github.com/bazelbuild/bazel/issues/23144); its flag is default `true` on 8.7.0, 8.8.0 and 9.2.0 alike, and the Starlark API it gates is [BZL-LARK](bazel-starlark-and-build.md)'s row, not this one. | `curl -sL raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/incompatible_flags.yml` for the narrow list; `gh api "search/issues?q=repo:bazelbuild/bazel+label:incompatible-change+state:open"` for the broad open subset; `grep -B2 '^\s*#\s*"--' <the yml>` for the blocked entries, each of whose issues must be re-read; `gh api "repos/bazelbuild/bazel-central-registry/commits?path=incompatible_flags.yml" --jq '.[0].commit.committer.date'` for the file's own freshness. EMPTY on the commented-entry grep = no currently-blocked flags known, which is a pass. A last-commit date older than the newest major's release date means every entry needs BZL-FLAG-08 before it is quoted. | MUST | Bazel all; shapes A, F | M-H-04 | BZL-MOD-13 |
| **BZL-FLAG-08** | Before reading an `incompatible_flags.yml` channel entry as "not yet a shipped default", cross-check the flag against the release notes for the nearest major — the registry file can lag a flag that already flipped. | `--incompatible_disable_autoloads_in_main_repo` sits under `last_green`/`rolling` in the live file while the 9.0.0 notes list it as flipped and default-true. The lag is the file's own staleness, not a testing policy: the wave-4 round found the *other* three flipped-in-9.0 entries scoped correctly (numbered channels, absent from `9.x`), a shape a deliberate post-flip retesting policy would not produce, and the file untouched since 2025-07-25. The yml's testing-channel entry and a flag's shipped-default status are two different facts, and only one of them is maintained. | `gh api repos/bazelbuild/bazel/releases/tags/<major>.0.0 --jq .body \| grep -- '--<flag>'`. A hit in a "flipped" list while the yml still shows a pre-release channel is a lag in the yml, not a contradiction: trust the release notes for "is this the default", the yml for "is BCR force-flipping this". Better still, read the default off the pinned binary (BZL-FLAG-11). EMPTY on the release-notes grep = the flag has not flipped in that major; the yml's channel then stands. | MUST | Bazel 8, 9; shapes A, F | M-H-04 | BZL-MOD-13, BZL-LARK-28, BZL-FLAG-11 |
| **BZL-FLAG-09** | Never write migration guidance implying a newly flipped flag can be reverted with its `--no<flag>` form without first checking that same release's "now no-ops" appendix. | Confirmed twice: `--incompatible_use_plus_in_repo_names` (8.0) and `--incompatible_disable_native_repo_rules` (9.0) each appear in both the "flipped" list and the "now no-ops" appendix of the release that flipped them — the escape hatch is stripped in the same release. | `gh api repos/bazelbuild/bazel/releases/tags/<major>.0.0 --jq '.body' \| grep -A30 'now no-ops'` and look for the flag. A hit means no revert path exists and the guidance must say so. EMPTY (flag absent from the appendix) = a revert path exists on that major and may be described. | MUST | Bazel 8, 9; all shapes | M-H-02, M-H-05 | BZL-MOD-25 |
| **BZL-FLAG-10** | When building an N→N+1 migration checklist, diff major N's "will flip in a future release" list against N+1's own "flipped" *and* "will flip" lists — never assume an item carries over verbatim. | Several flags on 8.0's "future" list (`--incompatible_config_setting_private_default_visibility`, `--incompatible_disable_starlark_host_transitions`) are *still* only "will flip in a future release" per 9.0.0's notes — carried across two majors unflipped — while others on that same list did flip in 9.0. | Fetch both release bodies (`gh api repos/bazelbuild/bazel/releases/tags/<N>.0.0` and `<N+1>.0.0`) and diff the flag-name sets. A name present on N's list and absent from **both** of N+1's lists needs its issue re-read — renamed, closed won't-fix, or genuinely still pending. EMPTY diff = the lists match and the older checklist is reusable as written. | MUST for anyone authoring a migration checklist | Bazel 8→9 today, generalises; shapes A, F | M-H-04, M-H-06 | BZL-FLAG-09 |
| **BZL-FLAG-11** | Verify that every flag name exists on the pinned version before writing it into any rc file, workflow, doc or generated config — including flags copied from a community always-on list — by reading the pinned binary's own `bazel help <command> --long` **and** `bazel help startup_options`; and confirm that any PR cited as the source of a flag's addition or removal actually merged. | Measured against the current CLI reference, **6 of the 8** `--incompatible_*`/`--no*` flags the widely-copied 2022-04-28 always-on blog post names return zero hits: they are gone, not renamed, and Bazel hard-fails with "unrecognized option". The check itself failed twice under measurement: `bazel help all --long` is not a command (`ERROR: 'all' is not a known command`), and a flag can live only in the startup surface — `--experimental_remote_repo_contents_cache` is a startup option from 8.8.0, invisible to `help build --long`, and one worker searching only command options reported it absent. Citations fail one level up the same way: [#25334](https://github.com/bazelbuild/bazel/pull/25334) and [#25398](https://github.com/bazelbuild/bazel/pull/25398), cited in this corpus for two flag removals, are both `CLOSED` with `mergedAt: null`. This is [BZL-CACHE-23](bazel-caching-rbe.md)'s discipline in its general rc-file form; the two rows must not drift apart. | `bazel help build --long 2>&1 \| grep -- '--<flag>'` **and** `bazel help startup_options 2>&1 \| grep -- '--<flag>'`, run against **every** version in the matrix rather than the dev pin alone; or grep a freshly fetched versioned `bazel.build/versions/<N>/reference/command-line-reference`. Zero matches on both surfaces means the flag must not be written on that version — an EMPTY result is the **stop signal**, not a pass. EMPTY never licenses the claim "this flag does not exist": an `UNDOCUMENTED`/`EXPERIMENTAL` option can be real and absent from the generated reference (`--enforce_project_configs` is default-`true` from 8.7.0 with zero CLI-reference hits). For a citation, `gh pr view <n> -R bazelbuild/bazel --json state,mergedAt` — `mergedAt: null` means the PR is a proposal and the claim needs a different source. | MUST | Bazel all; all shapes | M-H-08 (in part) | BZL-CACHE-23, BZL-MOD-13 |
| **BZL-FLAG-12** | `find . -iname 'WORKSPACE*'` returns nothing on any repository pinned to Bazel 9.0.0 or later. A hit is a hard build break, not a deprecation warning. | 9.0.0's own notes: "all `WORKSPACE` logic has been removed from Bazel". The supporting code is deleted, so there is nothing for a flag to re-enable. | `find . -path ./.git -prune -o -iname 'WORKSPACE*' -print`. EMPTY = pass. Any hit on a ≥9.0 pin must be ported to `MODULE.bazel` before the bump, which is [BZL-MOD](bazel-bzlmod-and-repo-rules.md)'s territory, not this row's. | MUST | Bazel 9+; shapes A, F | M-H-03 | BZL-HERM-28 |
| **BZL-FLAG-13** | Never suggest `--enable_workspace` (or `--enable_bzlmod`) as a way to change behaviour on a Bazel-9 pin — and never describe either as a no-op there. Measured on 9.2.0 both are absent from every help surface, so passing one fails the whole invocation with `unrecognized option`. | Both are real, working flags on 8.7.0 and 8.8.0 (`--enable_workspace` default `false`, `--enable_bzlmod` default `true`, present as command and startup options) — exactly the shape a model trained on pre-2026 material remembers as a live toggle and will confidently offer. The 9.0.0 notes' appendix calls them "now no-ops"; the 9.2.0 binary has neither in `help build --long` nor `help startup_options`, and the binary wins. The wording matters: "no-op" invites writing the flag into a generated config that then refuses to parse. | `grep -rn 'enable_workspace\|enable_bzlmod' *.bazelrc* .github/ README* docs/` while `.bazelversion` names 9.x or later. EMPTY = pass; any hit on such a pin is dead configuration or wrong guidance. To re-derive on any pin: `bazel help build --long 2>&1 \| grep -- '--enable_workspace'` **and** `bazel help startup_options 2>&1 \| grep -- '--enable_workspace'` — zero hits on both is the 9.2.0 result (BZL-FLAG-11). | MUST | Bazel 9+ (measured absent at 9.2.0; the exact 9.x minor of removal is unmeasured); all shapes | M-H-03 | BZL-HERM-28, BZL-FLAG-11 |
| **BZL-FLAG-14** | Never suggest a non-empty `--incompatible_autoload_externally=<symbol-list>` as a Bazel-9 way to keep the old autoloads; a symbol list is a Bazel-8-only migration aid. | Measured off the binaries: on 8.7.0 and 8.8.0 the flag defaults to the full moved-symbol allowlist (`"+@rules_python,+java_common,…,+@rules_shell,+@rules_android"`); on 9.2.0 it defaults to `""`. The flag exists on all three — this is a default change, not a removal — so resurrecting an 8-era value on a 9 pin parses cleanly, restores nothing, and reads as a hallucinated workaround. Distinct from `--incompatible_disable_autoloads_in_main_repo` (boolean, main-repo scope, available since 8.2.0) — the two are easy to swap by name. | `grep -rn 'incompatible_autoload_externally=' *.bazelrc* .github/` on a repo pinned ≥9.0; a non-empty value is the finding. EMPTY = pass. Confirm the value **shape** matches the flag intended: a comma-joined list belongs to this flag, a bare boolean to the other. | SHOULD | Bazel 9 only; shapes A, F | M-H-02 | — |
| **BZL-FLAG-15** | **pinned** — Move a pin across a major boundary in this order, stopping at the first failure: (1) `bazelisk --strict build //... test //...` green on the **current** pin — a failure here is pre-existing debt, not a regression; (2) `BAZELISK_INCOMPATIBLE_FLAGS=<the incoming major's exact "flipped in X.0" list> bazelisk --migrate` on the current pin, fixing everything reported; (3) `buildifier --lint=fix -r -v .`, diff-reviewed; (4) confirm the ruleset floors the autoload migration needs *and* any minimum module version the incoming major enforces from its own side (Bazel 9: protobuf ≥ 33.4); (5) `find . -iname 'WORKSPACE*'` empty; (6) grep for the permanent-flip traps — no canonical-repo-name parsing, no `native.local_repository`/`native.new_local_repository`; (7) grep the repo's own docs, task files and CI for commands and enum values the incoming major deleted (BZL-FLAG-31); (8) bump `.bazelversion` and regenerate `MODULE.bazel.lock` in the same commit; (9) add the new major as a real, blocking CI leg and keep the old major's leg live until its Support-Ends date; (10) re-read the flag list from that major's own release notes before reusing this checklist for a future bump. | Each step has its own verification and each is cheap relative to the step after it. Step 7 exists because a major deletes commands and enum values as well as flags, and a checklist that greps only `--incompatible_*` names passes a repo whose tooling is already broken. Assumption named: the checklist starts from a Bzlmod-only, WORKSPACE-free tree; a repo still carrying a live WORKSPACE completes the Bzlmod migration first. | The ten steps are the check. Step 1 empty `--strict` report = clean start. Step 2 empty `--migrate` report = every incoming flag already compatible. Step 3: `git diff` showing only added `load()` lines and reordering = expected; any non-load semantic change is a finding to investigate, never to auto-accept. Step 7 EMPTY = pass. | MUST (before any major-version bump) | Bazel 7→8, 8→9 today; shapes A, F | M-H-02, M-H-03, M-H-05, M-H-06 | BZL-MOD-06, BZL-MOD-25, BZL-LARK-10, BZL-FLAG-31 |
| **BZL-FLAG-16** | A `.bazelversion` bump that crosses onto or past 9.0, in any repository declaring `cc_*`/`java_*`/`py_*`/`sh_*`/`proto_library` targets, shows a non-trivial `BUILD`/`.bzl` diff in that same commit produced by `buildifier --lint=fix -r -v .` — never a bare version-file edit. | Autoloading defaults to empty on 9.0, so every such symbol needs an explicit `load()`; buildifier's autofix is [#23043](https://github.com/bazelbuild/bazel/issues/23043)'s own documented migration tool. A repo with such targets and an empty BUILD diff on the bump commit has not migrated, it has broken. Measured, the breakage has **two error shapes** and only one of them names the fix: bare `py_library`/`sh_binary`/`proto_library` fail on 9.2.0 with `name 'X' is not defined` plus a misleading `did you mean 'cc_library'` suggestion, while `cc_library` hits a purpose-built removed-rule stub that names `buildifier --lint=fix` outright. Any skill showing "the error to recognise" must show both. | `git show --stat <bump-commit>` cross-referenced against `grep -rln 'cc_\|java_\|py_\|proto_library\|sh_' --include='BUILD*' --include='*.bzl' .` on the pre-bump tree. A repo with **zero** such hits legitimately shows an empty BUILD diff; a repo with hits and an empty diff is the finding. **Reach caveat**: this grep does not see generated BUILD/`.bzl` text, so a generator emitting a native rule name needs a separate read of the emitting `.bzl`. | MUST (when bumping onto/past 9.0, for repos with native-rule usage) | Bazel 9; shapes A, F | M-H-02 | BZL-MOD-06, BZL-LARK-10 |
| **BZL-FLAG-17** | Test an incoming major's flag flips on the **outgoing** pin before touching `.bazelversion`: run `bazelisk --strict` first as the one-build pass/fail signal, and reserve `bazelisk --migrate` (scoped with `BAZELISK_INCOMPATIBLE_FLAGS`) for isolating which flag broke a `--strict` failure. | This is upstream's own stated mechanism — the 9.0.0 notes name `bazelisk --migrate` with `BAZELISK_INCOMPATIBLE_FLAGS` as the way to test the 9.0 flips on Bazel 8.x. Running `--migrate` cold burns N+1 builds to answer what `--strict` answers in one. | `BAZELISK_INCOMPATIBLE_FLAGS=<list> bazelisk --strict build //... ; echo $?` on the outgoing pin, then `--migrate` only on non-zero. An empty `--strict` report = every flag already compatible = pass. EMPTY (no such invocation anywhere in CI or a task target) = the flip is untested and the finding is the absence. | MUST | Bazel 7/8/9 (mechanism is version-independent); shapes A, F | M-H-06 | BZL-FLAG-15 |
| **BZL-FLAG-18** | For a 9.0-readiness audit of a pure-Starlark repository-rule/module-extension codebase, check only the six load-bearing flags of the nineteen flipped in 9.0 — the two autoload flags, `--incompatible_disable_native_repo_rules`, `--incompatible_repo_env_ignores_action_env`, `--incompatible_strict_action_env` and `--incompatible_use_new_cgroup_implementation` — citing BZL-HERM-04 and BZL-HERM-01 for the two already fully specified there and BZL-FLAG-35 for the cgroups flag's own precondition. | Auditing all nineteen spends effort on thirteen flags that are inert until a `cc_*`/`java_*`/`py_*`/`proto_library`/`objc_*` target exists. A reading aid, not an independent finding source — the six flags it points at are each MUST-checkable on their own rows. The sixth is weaker than the other five: the cgroups flag creates nothing unless `--experimental_sandbox_limits`/`--experimental_sandbox_memory_limit_mb` is set, so for a repo that requests no sandbox limits the live set is effectively five. | `grep -rln 'cc_\|java_\|py_\|proto_library\|objc_' --include='BUILD*' --include='*.bzl' .` — EMPTY confirms the thirteen-flag exclusion holds; any hit re-includes the matching rows from the 19-flag table. Then `grep -rn 'sandbox_limits\|sandbox_memory_limit' .bazelrc* .github/` — EMPTY drops the cgroups flag from the live set for this repo. **Reach caveat**: generated BUILD/`.bzl` text is outside the first grep, so an EMPTY result on a repository that generates Starlark is inconclusive until the emitting `.bzl` files are read. | CONSIDER | Bazel 9.0; shapes A, F | M-H-02, M-H-05 | BZL-HERM-01, BZL-HERM-04, BZL-FLAG-35 |
| **BZL-FLAG-19** | The only mechanism for a personal override is a `try-import`ed, `.gitignore`d file imported as the **last** non-comment line of the committed `.bazelrc`; and any flag whose value is *executed* or whose value is a *secret* lives only in a file the repository does not ship. | Import position is part of the precedence contract — options in an imported file beat options appearing before the import line and lose to those after it, so a personal-override import placed anywhere but last is silently defeated. The execute/secret clause generalises [BZL-CACHE-04](bazel-caching-rbe.md): a helper path from a committed rc is spawned with the client environment before the sandbox, and the maintainers closed that as intended. | `tail -1 .bazelrc` must be the `try-import` line (or the last non-comment, non-blank line if a comment trailer follows); `git check-ignore <the imported path>` must succeed. For the second clause, `grep -n 'credential_helper' $(git ls-files \| grep '\.bazelrc')` — any hit in a tracked file is the finding. EMPTY on both = pass. | MUST | Bazel 7/8/9; shapes A, F | M-H-12 | BZL-CACHE-04, BZL-HERM-09 |
| **BZL-FLAG-20** | For every filename a `try-import` names, determine and write down next to that line which of two shapes CI has: (a) CI never creates the file, so developer content is never validated by CI, or (b) CI recreates the same path at runtime with a different, non-overlapping flag set. | The two look identical in the committed `.bazelrc` — one `try-import` line — but differ entirely in what a reviewer may assume. Shape (b) is the more dangerous of the two, because a reviewer who sees a CI action writing that filename can wrongly infer CI reads the developer's committed intent. | `grep -rn '<basename>' .github/workflows/ .github/actions/ .buildkite/` — no write anywhere = shape (a); a write with a flag set disjoint from the developer file = shape (b). Cross-check the effective result with `bazel build --announce_rc //some:target 2>&1 \| grep '^INFO: Reading rc'`. The finding is the **missing documentation**, not either shape. EMPTY comment beside the `try-import` line = finding. | MUST (as a documented fact) | Bazel 7/8/9; shapes A, F | M-H-12 | BZL-HERM-09 |
| **BZL-FLAG-21** | Version-gate a flag that does not exist, or whose default differs, across the CI matrix's Bazel majors with a mechanism — `try-import-if-bazel-version` at file level, or a generated preset's per-flag `if_bazel_version` predicate — never with a prose comment saying "remove this after upgrading". | A comment is not enforced. A matrix spanning two majors runs the wrong flag set on one leg the moment someone forgets the comment existed. The measured cross-major set for 8.7.0 / 8.8.0 / 9.2.0 is concrete and small: `--incompatible_strict_action_env` (false/false/**true**), `--incompatible_autoload_externally` (allowlist/allowlist/**empty**), `--repo_contents_cache` (off/off/**on**), `--enable_workspace` and `--enable_bzlmod` (present/present/**absent**), `--experimental_remote_merkle_tree_cache` and `--incompatible_remote_use_new_exit_code_for_lost_inputs` (present/present/**absent**), `--experimental_remote_repo_contents_cache` (**absent**/startup-only/startup-only). `--incompatible_strict_action_env` is the live instance in this fleet, with nothing configured to mark the split. | `grep -n '<flag>' .bazelrc*` for any flag on that list, or any other flag BZL-FLAG-11 shows differing across the matrix, and confirm the line sits inside a `try-import-if-bazel-version` block or an equivalently version-scoped `--config`. A major-dependent flag found bare in the shared rc file, with a multi-major matrix present, is the finding. EMPTY (flag absent entirely) reads against [BZL-HERM-01](bazel-hermeticity-determinism.md): absent with an 8.x leg present is itself a finding. | MUST | Bazel 8/9 (any multi-major matrix); shapes A, F | M-H-05 (in part) | BZL-HERM-01, BZL-FLAG-11 |
| **BZL-FLAG-22** | A numeric tuning value in an rc file — a timeout, retry count, worker or parallelism count, memory limit — carries an adjacent comment stating why that number, or a citation to the versioned source it was copied from; and any such value is re-checked against the current pin before being copied into a new repository. | A bare number cannot be told apart from a typo, a stale local value, or a deliberate choice. The fleet's `--remote_timeout=60` sits 60× tighter than the community preset's own cited `common:ci` default of `3600` with nothing anywhere stating whether that is intentional. A flag whose *name* states its behaviour (`--test_output=errors`) needs no comment. | For every rc line whose value is a bare integer, confirm a comment on the same or preceding line, or a citation to a source repo and version. EMPTY comment above a numeric flag = **finding**, regardless of what the number is. | MUST (new configuration) / SHOULD (retrofit onto an existing value) | Bazel all; shapes A, F | M-H-11 | — |
| **BZL-FLAG-23** | Prefix a `--config` name defined in a personal, try-imported rc file with an underscore. | Bazel's own docs recommend it specifically so a personal config cannot silently shadow, or be shadowed by, a shared or CI-defined config of the same name. Real, documented and a grep away, but a collision is rare and no fleet instance exists — hence CONSIDER. | `grep -n '^[a-z]*:[a-zA-Z]' .bazelrc.user \| grep -v ':_'` — non-underscore config names in a personal file are the finding. EMPTY = pass. | CONSIDER | Bazel 7/8/9; shapes A, F | M-H-10 | — |
| **BZL-FLAG-24** | Never cite `--sandbox_default_allow_network=false` as a control over a repository-rule fetch, in a rule, a doc, a comment or a commit message. | The flag is tagged `execution` and reaches sandboxed build and test *actions*; `repository_ctx.download`/`.execute()` run in the loading phase, which has never been sandboxed — [#7764](https://github.com/bazelbuild/bazel/issues/7764) has been open since 2019 asking for exactly that. An agent pattern-matching "sandbox"+"network"+"hermeticity" onto a repo-rule problem ships a flag that does nothing for the stated goal. Measured default `true` on 8.7.0, 8.8.0 and 9.2.0, and measured to genuinely block under `linux-sandbox` when flipped — so the flag works, just not on the phase the mis-citation aims at. The flip itself is [BZL-HERM-02](bazel-hermeticity-determinism.md)'s row, not this one. | `grep -rn 'sandbox_default_allow_network' --include='*.bzl' --include='*.md' .` — any hit framing it as a fetch-time or repo-rule control is the finding. The routing question when triaging: does the issue originate in a `repository_rule` implementation (loading phase, out of scope) or in `ctx.actions.run*` (execution phase, in scope)? EMPTY = pass. | MUST | Bazel 7/8/9 (default `true` measured on 8.7.0, 8.8.0, 9.2.0); all shapes | M-H-08 | BZL-HERM-02, BZL-MOD-14 |
| **BZL-FLAG-25** | Adopt a community rc-flag preset only as committed, generated output plus a regenerate-and-diff test — never as a live `bazel_dep` version pin that regenerates silently on update; and grade any individual flag the preset alone recommends as CONSIDER-tier evidence unless `bazel.build` independently documents that flag's mechanism. | The generator's own README states its changes are not semver-safe and "can cause behavior changes… or even break the build", and names vendoring-plus-review as the intended safety mechanism. What is normative about the preset is its maintenance stance, not its content — the content is one project's opinion with a version-gated data structure attached. | The generated rc fragment must appear in `git ls-files`, and a paired test target or CI step must fail when regenerating produces a diff. A bare version bump on the preset module with no regenerate-and-diff step in the same change is the finding. EMPTY (no preset adopted) = the rule does not bind. | MUST (once a preset is adopted) / CONSIDER (any single flag it alone recommends) | Bazel 7/8/9; shapes A, F | — | BZL-LARK-28 |
| **BZL-FLAG-26** | An explicit rc-file flag value that already matches the default on **every** Bazel version in the repository's matrix is removed, or carries a comment naming the floor it defends. | It protects nothing today and reads as meaningful tuning, so a reviewer cannot tell dead configuration from a deliberate defensive pin against a future default change. The premise is now measured — `--incompatible_disallow_empty_glob` defaults `true` on 8.7.0, 8.8.0 and 9.2.0, so the fleet's `.bazelrc:8` is dead on every leg of its own matrix — but the *policy* (delete versus comment) is still argued from one preset's version gates plus [BZL-CACHE-29](bazel-caching-rbe.md)'s reasoning, so the row stays CONSIDER. | For each explicit rc value, read the default off the **oldest** pinned version in the matrix, not the dev pin: `bazel help build --long 2>&1 \| grep -A2 -- '--<flag>'` per matrix leg, plus `bazel help startup_options` for a startup flag. Value equal to the default on every leg, with no adjacent comment, is the finding. EMPTY (the flag appears in neither help surface on some leg) routes to BZL-FLAG-11, not here. | CONSIDER | Bazel all; shapes A, F | M-H-09 (in part) | BZL-CACHE-29, BZL-MOD-13, BZL-FLAG-11 |
| **BZL-FLAG-27** | Read an absent `bazel_compatibility` in a ruleset's released `MODULE.bazel` as "undocumented", never as "no floor" — check that ruleset's own CI presubmit matrix before claiming a Bazel version works — and name which of the three mechanisms a version-support claim rests on: the module's own `bazel_compatibility`, its CI matrix, or a minimum module version Bazel itself enforces from the other side. | Three of the six rulesets this program ships guidance for (`rules_ts` 3.10.1, `rules_python` 2.3.3, `rules_rust` 0.74.0) declare nothing at their current release, yet all three have a real, CI-tested floor — `7.4.1` exactly for rules_rust, a named anchor rather than a bucket. A bare "supports 7+" erases the difference between a resolver-enforced floor and an untested assumption. A released artifact can disagree with its own `main` (`rules_ts`), and a declaration can appear late: protobuf's `bazel_compatibility = [">=8.0.0"]` first shows up at BCR 35.0, absent at 33.4 and 34.x. The third mechanism differs in kind: Bazel 9 enforces a minimum *protobuf module version* of 33.4 from its own release, which is graph resolution, not a self-declared compatibility range — conflating the two misattributes who is enforcing what. | `grep -n bazel_compatibility MODULE.bazel` **at the release tag** — EMPTY = undeclared, not unrestricted; then `curl -sL .../.bazelci/presubmit.yml` and read the version matrix or a `minimum_bazel_version` anchor; then check the target major's own release notes for an enforced minimum module version. A support claim citing none of the three is the finding. | MUST (authoring adoption or upgrade guidance) / SHOULD (spot-checking a `bazel_dep` bump) | Bazel 7/8/9; shapes A, D, E, F | M-H-14 | BZL-LARK-28 |
| **BZL-FLAG-28** | Never determine a ruleset's current version from a single `releases/latest` API call, a "Latest release" badge, or a remembered version string — list all non-prerelease releases and sort by semver. | Measured live on 2026-09-05: `aspect-build/rules_js`'s `releases/latest` returns the 2.x maintenance backport `v2.9.3`, published two minutes *after* the actual current-major `v3.4.1` the same morning. The API's "latest" is publish-timestamp order, and any ruleset running parallel maintenance and current tracks defeats it. | `gh api repos/<org>/<repo>/releases --jq '.[] \| select(.prerelease==false) \| .tag_name'` piped through a semver sort, compared against what `releases/latest` returned. A mismatch is the tell that parallel tracks exist. EMPTY release list (a ruleset that publishes only tags) = fall back to `gh api .../tags` and sort those. | MUST (authoring any "current version" claim) | All majors; shapes A, D, E, F | M-H-13 | BZL-LARK-28 |
| **BZL-FLAG-29** | For a pre-1.0 (`0.y.z`) ruleset, run the "how many majors behind" comparison on the **second** version component, not the first. | Semver treats `y` as the breaking-change counter below 1.0, so `0.73 → 0.74` is a major bump. `rules_rust` 0.74.0 and `rules_cc` 0.2.22 are both pre-1.0 today, and a check written against the leading digit alone never fires for either — it silently tolerates an arbitrarily stale pin. This is a check-correctness bug, not a policy preference. | Before diffing a pinned `bazel_dep` version against current, test whether the current release's leading component is `0`; if so, diff the second component and apply the same one-behind threshold to it. Two or more behind = hard finding; exactly one behind = tracked item. EMPTY (versions equal) = pass. | MUST (for anyone building the drift check itself) | All majors; `rules_rust` and `rules_cc` at their current 0.x generation; shapes A, F | M-H-13 | BZL-FLAG-28 |
| **BZL-FLAG-30** | Run the ruleset-drift check on a schedule, not only when someone happens to edit `MODULE.bazel`. | `rules_js`/`rules_ts` cut a new minor every two to four weeks; a repository that re-checks floors only while editing an unrelated `bazel_dep` line can drift a full major before anyone notices — and BZL-FLAG-28's trap makes even an active check unreliable without the semver sort. | A scheduled CI job (weekly or monthly) exists that runs the BZL-FLAG-28/29 comparison for every language-ruleset `bazel_dep` in `MODULE.bazel` and reports drift; it need not block. `grep -n 'schedule:\|cron:' .github/workflows/*.yml` then read what each scheduled job actually checks. EMPTY, or a schedule that checks something else entirely, = finding. | SHOULD | Bazel 7/8/9; shapes A, F | — | BZL-FLAG-28, BZL-FLAG-29 |
| **BZL-FLAG-31** | Treat a major bump as removing **commands and enum values**, not only flags: before and after the bump, grep the repository's own docs, task files, CI and generated help text for every command spelling the incoming major deleted, and re-derive each against the pinned binary. For 8→9 that is at minimum `bazel analyze-profile` (deleted at 9.0.0), `bazel dump --skyframe=working_set` / `working_set_frontier_deps` (renamed `active_directories` / `active_directories_frontier_deps` at 9.0.0) and `bazel sync --only=` (deleted at 9.0.0; the replacement is `bazel fetch --repo=@<repo>`). | Measured by diffing tagged trees and enums: `ProfileCommand.java` is present at 8.7.0 and 8.8.0 and absent at 9.0.0, 9.1.0 and 9.2.0. Every one of the three is still advertised by a source a reader would reasonably trust — Bazel's own frozen **9.1.0** docs snapshot still lists `analyze-profile`, the live memory page still prints `--skyframe=working_set`, and rules_rust's own current docs still print `bazel sync --only=crates`. A checklist that greps only for `--incompatible_*` names therefore passes a repository whose tooling is already broken on the new major, and the failure surfaces as an unknown-command error in CI rather than at review time. | `grep -rn 'analyze-profile\|skyframe=working_set\|sync --only' --include='*.md' --include='*.yml' --include='*.yaml' --include='*.bzl' --include='BUILD*' --include='Taskfile*' --include='taskfile*' .` — any hit on a ≥9.0 pin is the finding. Then re-derive each surviving spelling on the pinned binary: `bazel help <command>` (a deleted command answers `ERROR: '<name>' is not a known command`) and, for an enum, `bazel help dump --long \| grep -A5 skyframe`. EMPTY grep = pass. **Reach caveat**: a command spelled inside generated shell or `.bzl` text is outside this grep. | MUST | Bazel 8→9 today, generalises to any major bump; shapes A, F | — | BZL-FLAG-11, BZL-FLAG-15 |
| **BZL-FLAG-32** | Never read `--enforce_project_configs`'s default-`true` as meaning project-config enforcement is active on a build: it is inert until the nearest `PROJECT.scl` on the target's own package path declares a non-empty `configs`/`buildable_units`. Treat "a `PROJECT.scl` with no configs" and "no `PROJECT.scl` at all" as behaviourally identical, and never write guidance implying a Bazel-9 pin newly enforces project configs. | Measured from tagged source across 8.7.0, 8.8.0, 9.0.0, 9.1.0 and 9.2.0: the flag defaults `true` on **all** of them, so it is not a 9.0 flip at all, and `FlagSetFunction.getSclConfig()` returns an empty flag set immediately when the resolved file declares nothing — which is exactly what keeps the default from breaking every build sitting near an unrelated `PROJECT.scl`. The flag's own help text ("interactive builds may only pass `--scl_config`…") reads alarming out of context and is the specific sentence an agent will over-apply. Both `--enforce_project_configs` and `--scl_config` are `UNDOCUMENTED` + `EXPERIMENTAL` and appear nowhere on the generated CLI reference, so BZL-FLAG-11's grep returns EMPTY for two real flags. | `find . -name PROJECT.scl -not -path './.git/*'` — EMPTY means nothing on this axis can be active, whatever the flag's default says. For a repository that has one, the only user-visible signal is an `INFO: Reading project settings from …` line in build output for a target whose innermost `PROJECT.scl` is populated; its absence means no enforcement is in effect for that target. | MUST (guidance accuracy) | Bazel 8.7.0+ (unchanged through 9.2.0); all shapes | M-H-15 | BZL-FLAG-11 |
| **BZL-FLAG-33** | Never write `--config=<name>` inside a `PROJECT.scl` buildable unit's `flags` list when `<name>` is defined in any ordinary rc file — spell the flags out directly instead. Only a config traceable to Bazel's synthetic "client" source (the literal command line) or to an `InvocationPolicy` is legal there. | `FlagSetFunction.expandConfigFlags()` expands a `--config=` entry only if its definition traces to a *global* rc file, and `GlobalRcUtils` defines that set as exactly `["client", "Invocation policy"]` with `ALLOWED_GLOBAL_CONFIGS` empty and the source comment "No global RC files in Bazel, so no global configs." A config defined in the system rc, the workspace `.bazelrc`, `$HOME/.bazelrc`, a `--bazelrc=` file or a `try-import`ed file therefore fails at **analysis time**: "can't set `--config=ci` because its definition depends on `<path>/.bazelrc` which isn't a global rc file." Reusing an existing `build:ci` stanza is the obvious first move for anyone adopting `PROJECT.scl`, and it is the one move that cannot work. Note the narrower sense of "global" here: it excludes every file a reader would call a global rc. | For each `PROJECT.scl`, `grep -n -- '--config=' PROJECT.scl`; for every hit, `grep -rn '^[a-z]*:<name>' .bazelrc*` — a hit in any committed or imported rc file is the finding. EMPTY on the first grep = pass (the unit spells its flags out). | MUST (once a repository adopts `PROJECT.scl`) / N/A otherwise | Bazel 8.7.0+; shapes A, F | M-H-15 | BZL-FLAG-32 |
| **BZL-FLAG-34** | A `--@<module>//<package>:<flag>` build setting is versioned by the **ruleset that defines it**, not by Bazel: re-derive its label and default from the pinned module version's own source, and name that module version alongside any citation of the flag. | Bazel's own 9.0.0 release notes name `--@protobuf//bazel/toolchains:prefer_prebuilt_protoc` — correct for exactly protobuf 33.4 and stale for every version after it. At protobuf 34.0 the canonical label moved to `//bazel/flags:prefer_prebuilt_protoc` (the old path survives only as an `alias`) **and** its `build_setting_default` flipped `False` → `True` in the same release; 36.1.bcr.1 still carries `True`. So an official, dated, primary Bazel source names a flag path and an implied default that are both wrong for almost every real install. BZL-FLAG-11's `bazel help` check cannot catch this at all: a Starlark build setting never appears in Bazel's own help output, only in the module's own `BUILD` file. | Read the flag's definition from the pinned module version's own tagged source (`bazel/flags/BUILD` for protobuf), never from Bazel's release notes or a ruleset's rendered doc page. A citation naming the flag with no module version attached is the finding. EMPTY (`grep -rn 'prefer_prebuilt_protoc' .` finds nothing in the repo) means the setting sits at its module default — which must still be stated *with* a version wherever it is documented, because that default has already changed once. **Reach caveat**: a build setting referenced only from generated `.bzl` text is outside a source grep. | MUST | Bazel 8/9; any repository configuring a `bazel_dep`'s flags; shapes A, D, E, F | — | BZL-FLAG-11, BZL-FLAG-27 |
| **BZL-FLAG-35** | Never read `--incompatible_use_new_cgroup_implementation`'s default-`true` on Bazel 9 as meaning sandbox resource limits are enforced: without an explicit `--experimental_sandbox_limits` or `--experimental_sandbox_memory_limit_mb` the flag creates nothing, and *with* one, a host that denies a writable cgroup mount degrades silently to no limits and the build still exits 0. | Measured from tagged 9.2.0 source: `VirtualCgroupFactory.create()` returns `VirtualCgroup.NULL` whenever `!alwaysCreate && defaultLimits.isEmpty() && limits.isEmpty()`, and `alwaysCreate` is hardcoded `false` at its one call site — so a build requesting no limits never touches `/sys/fs/cgroup` on either implementation or either major. When limits are requested, `VirtualCgroup.createRoot()` skips a non-writable mount with a `logger.atInfo()` line ("Found non-writable cgroup v2 at %s") and `createInstance()` swallows any `IOException` the same way; nothing throws, nothing prints a WARNING in default build output, and the action runs unlimited. Two adjacent claims are also wrong and worth naming: the flag supports cgroup **v1 and v2**, not v2 only (`LinuxSandboxCommandLineBuilder`'s own doc comment saying "Requires cgroups v2 and systemd" is stale against `VirtualCgroup`), and under v2 the *parent* must be writable, not just the leaf, because Bazel creates a sibling cgroup when its own already has member processes. | `grep -rn 'sandbox_limits\|sandbox_memory_limit' .bazelrc* .github/` — EMPTY means no limit was ever requested and the flag is inert for this repository, which is a pass, not a gap. For a repository that *does* request limits: `bazel build --sandbox_debug --subcommands //<target> 2>&1 \| grep -- '-C '` and read the printed `linux-sandbox` invocation; a hit proves a cgroup was created and the limit is live. **EMPTY there is one-way and does not identify which of three causes applies** — flag off, no limits requested, or cgroup creation failed silently; no `bazel info` line or exit code separates them (`BlazeRuntime.getCgroupsInfo()` has zero external callers at 9.2.0). | MUST (guidance accuracy; the flag is one of BZL-FLAG-18's six) | Bazel 9+ (default `true` since 9.0.0); Linux only; shapes A, F | M-H-05 | BZL-FLAG-18, BZL-HERM-02 |

### Cross-references — rules that belong to another family

| Concern | Owner | Why not a `BZL-FLAG` row |
|---|---|---|
| `--incompatible_strict_action_env` explicit on a mixed 8/9 matrix | [BZL-HERM-01](bazel-hermeticity-determinism.md) | Owns the flag's default history and the removal condition; BZL-FLAG-21 owns only the *mechanism* that gates the line. |
| `--repo_env` vs `--action_env` for repository-rule input | [BZL-HERM-04](bazel-hermeticity-determinism.md) | One of the six 9.0 flips, fully specified there. |
| Setting `--sandbox_default_allow_network=false` at all | [BZL-HERM-02](bazel-hermeticity-determinism.md) | BZL-FLAG-24 owns only the mis-citation as a repo-rule control. |
| `--credential_helper` placement and the bearer-token migration | [BZL-CACHE-03](bazel-caching-rbe.md), [BZL-CACHE-04](bazel-caching-rbe.md) | Stated at MUST with full evidence; BZL-FLAG-19 generalises the shape only. |
| Re-deriving a remote-cache flag name, its version claim and its cited PR | [BZL-CACHE-23](bazel-caching-rbe.md) | The remote-cache instance of BZL-FLAG-11's general form; BZL-CACHE-23 cites this file by ID and the two must not drift apart. |
| `--repo_contents_cache`'s 8.x-opt-in / 9.2.0-default-on split, and `repo_metadata(reproducible = True)` as its gate | [BZL-MOD-16](bazel-bzlmod-and-repo-rules.md) | BZL-FLAG-21 lists the flag only as one member of the measured cross-major set; the cache's own semantics are Bzlmod mechanics. |
| `--lockfile_mode=error` scoped to `common:ci`, and the 8.8.0 `lockFileVersion` 28 jump | [BZL-MOD-02](bazel-bzlmod-and-repo-rules.md), [BZL-MOD-06](bazel-bzlmod-and-repo-rules.md) | rc-file lines, but their rationale is entirely lockfile mechanics; BZL-FLAG-15 step 8 cites rather than restates. |
| `Label.workspace_name` deprecated behind `--incompatible_enable_deprecated_label_apis`; use `Label.repo_name` | [BZL-LARK](bazel-starlark-and-build.md) | A Starlark API rule, not a flag rule. BZL-FLAG-07 names the flag only as the live commented-out `incompatible_flags.yml` entry. |
| `buildifier`'s `WARNINGS.md` flag column as provenance, not a switch | [BZL-LARK-01](bazel-starlark-and-build.md), BZL-LARK verdict 3 | Wave 2 measured it; this family inherits the conclusion. |
| Explicit `load()` for every native rule — including `proto_library` from `@protobuf//bazel:proto_library.bzl` — and the stale `native-py`/`native-sh-*` warning text | [BZL-LARK-10](bazel-starlark-and-build.md) | BZL-FLAG-16 owns the bump-commit evidence and the two measured error shapes; BZL-LARK owns the authoring rule. |
| `ts_proto_library` deprecated in rules_ts 3.10.1 | [BZL-JS](bazel-typescript.md) | A ruleset-API deprecation; BZL-FLAG-34 owns only the *flag* half of the protobuf finding. |
| Naming which Bazel major a stardoc golden file is authoritative for (M-H-16) | [BZL-HERM-22](bazel-hermeticity-determinism.md) | Already a **pinned** MUST there; duplicating it here would fork the check. |
| Reinstating `WORKSPACE`/`local_repository()`/`cc_configure()` as a "fix" | [BZL-HERM-28](bazel-hermeticity-determinism.md) | BZL-FLAG-12/13 own the detection; BZL-HERM owns the rejection. |
| Where the canonical Bash runfiles library lives (moved to `rules_shell` Feb 2025; the `@bazel_tools` paths are aliases), and why `--incompatible_compact_repo_mapping_manifest` is correctness-irrelevant to a launcher emitting canonical rlocationpaths | `bazel-diagnose` skill | Research and diagnosis heuristics, not standards a reviewer checks in a diff. Recorded so the finding is not lost: `rules_shell` v0.5.0 (2025-06-12) and `rules_python` 2.0.0 both parse the compact wildcard form, both predating the flag's 9.0.0 flip, so no version-skew window exists. |

## Applied to `rules_ocx` and the fleet

Measured 2026-09-05, re-checked 2026-09-06. `rules_ocx` is the fleet's only Bazel
repository; a `find /home/mherwig/dev -maxdepth 3 -name .bazelversion -o -name
.bazelrc` returns exactly two paths, both inside it.

**Satisfies**

- **BZL-FLAG-01** — `.bazelversion:1` is `8.7.0`, an exact three-component
  semver, and all four consumer modules carry the identical value
  (`e2e/bzlmod/.bazelversion:1`, `examples/{cross_platform,package,project}/.bazelversion:1`).
  No `.bazeliskrc` exists anywhere in the tree.
- **BZL-FLAG-02** — `ci.yml:43` runs `bazel: ["8.7.0", "9.x", "rolling"]` with
  `continue-on-error: ${{ matrix.bazel == 'rolling' }}` at `ci.yml:38` under the
  comment "rolling is forward-compat early-warning only — never blocks"
  (`ci.yml:37`). `rolling` appears in no other job's matrix. A positive exemplar
  the shipped skill can quote verbatim.
- **BZL-FLAG-03** — all four `USE_BAZEL_VERSION` assignments (`ci.yml:45,81,113,180`)
  reference `${{ matrix.bazel }}`; no literal semver anywhere.
- **BZL-FLAG-06** — the launcher is pinned at the layer below Bazel: `ocx.toml:4`
  declares `bazelisk = "ocx.sh/bazelbuild/bazelisk:latest"` and `ocx.lock:22-27`
  resolves it to per-platform sha256 digests. The floating tag in `ocx.toml` is
  backed by the lock, so the chain is reproducible — but only because the lock is
  committed, which is the fact the rule asks to be documented.
- **BZL-FLAG-12, BZL-FLAG-13** — no `WORKSPACE`, `WORKSPACE.bazel` or
  `WORKSPACE.bzlmod` file exists (`git ls-files | grep -i workspace` and a
  directory listing both empty); no `--enable_workspace`, no
  `native.local_repository`, no `native.new_local_repository` anywhere.
- **BZL-FLAG-19** — `.bazelrc:14` is the last non-comment line and is
  `try-import %workspace%/.bazelrc.user`; `.gitignore:2` ignores that path. On the
  second clause, `credential_helper` appears in exactly one tracked file — a
  research note under `.agents/` — and in none of the five tracked rc files,
  satisfying [BZL-CACHE-04](bazel-caching-rbe.md) by absence.
- **BZL-FLAG-31** — a full-tree grep for `analyze-profile`, `skyframe=working_set`
  and `sync --only` across `*.md`, `*.yml`, `*.yaml`, `*.bzl` and `BUILD*` returns
  nothing, so the repository carries no command spelling the 9.0 boundary deleted.
  Passes by absence, which is the right reading here: this is a bump-time check on
  a repository that has not bumped.

**Violates, or missing**

- **BZL-FLAG-17** — no `bazelisk --strict`, `--migrate` or
  `BAZELISK_INCOMPATIBLE_FLAGS` invocation exists in `.github/`, `taskfile.yml` or
  `taskfiles/`. The 9.x leg is the only forward signal, and it tests the flags 9.x
  already flipped rather than the ones the *next* major will. This is the group's
  single clearest fleet gap.
- **BZL-FLAG-21** (with [BZL-HERM-01](bazel-hermeticity-determinism.md)) — no
  `--incompatible_strict_action_env` line exists in any rc file, while `ci.yml:43`
  runs 8.7.0 (measured default `false`) alongside 9.x and rolling (measured `true`
  at 9.2.0) in one matrix. The two legs differ in `PATH`/`LD_LIBRARY_PATH`
  inheritance — confirmed by env capture, not inferred — with nothing in the
  repository marking the split.
- **BZL-FLAG-22** — `--remote_timeout=60` appears twice with no rationale:
  `.bazelrc.user:9` (gitignored, developer) and
  `.github/actions/remote-cache/action.yml:28` (CI, independently duplicated
  rather than sourced from one place). Sixty times tighter than the community
  preset's own cited `common:ci` value; no source in the repository says whether
  that is deliberate.
- **BZL-FLAG-20** — the repository is shape (b): `action.yml:27-34` recreates
  `.bazelrc.user` at CI runtime holding only cache flags, disjoint from the
  developer file's `CC=`/`-layering_check` pair (`.bazelrc.user:2-3`). Nothing
  next to `.bazelrc:14` documents this, so a reviewer seeing a CI action write
  that filename can reasonably infer the wrong thing.
- **BZL-FLAG-26** — `.bazelrc:8` sets `build --incompatible_disallow_empty_glob`
  with no comment. The rule's "read the default off each matrix leg" step is now
  discharged: the flag defaults `true` on 8.7.0, 8.8.0 **and** 9.2.0, read off the
  binaries, so the line is dead on every leg the repository runs. It stays a
  CONSIDER-tier finding because whether to delete it or annotate it as a
  defensive pin is the owner's call, not the measurement's.
- **BZL-FLAG-27** — `rules_ocx/MODULE.bazel` declares no `bazel_compatibility`
  (`grep -c` → 0) despite publishing to the BCR. Its real floor is discoverable
  only from its own CI matrix (`ci.yml:43,72,106,178` → 8.7.0 and 9.x), which is
  exactly the undeclared-floor pattern the rule was written against — here on the
  publishing side of the relationship rather than the consuming side.
- **BZL-FLAG-30** — the only scheduled workflow is `update-dist.yml:4-5`
  (`cron: "17 4 * * 1"`), which refreshes the ocx CLI dist snapshot. No scheduled
  job checks any `bazel_dep` version against upstream.

**Cannot exhibit**

- **BZL-FLAG-14, BZL-FLAG-16, BZL-FLAG-18** — the autoload migration, the single
  biggest 8→9 breakage, is a genuine non-event here: zero `cc_*`/`java_*`/`py_*`/
  `proto_library` targets exist, and every `sh_*` rule is already explicitly
  loaded from `@rules_shell` (`docs/BUILD.bazel:9`, `ocx/tests/BUILD.bazel:4`,
  and each `examples/*/BUILD.bazel`). To exhibit it the repository would have to
  declare a native-rule target it has no reason to declare. The rules stay
  load-bearing for what the ruleset *teaches* adopters to write.
- **BZL-FLAG-23** — the only `--config`-shaped name in the tree is
  `common:windows` (`.bazelrc:6`), a platform stanza selected by
  `--enable_platform_specific_config`, not a personal config. No personal config
  names exist to collide.
- **BZL-FLAG-24, BZL-FLAG-25** — no `--sandbox_default_allow_network` line and no
  vendored rc preset anywhere in the tree.
- **BZL-FLAG-32, BZL-FLAG-33** — `find . -name PROJECT.scl` returns nothing, so
  `--enforce_project_configs`'s default-`true` is inert here exactly as the rule
  describes. Both rows stay load-bearing for the shipped artifacts: the flag is on
  by default on this repo's own 8.7.0 pin, and its help text is what an agent
  reads and over-applies.
- **BZL-FLAG-34** — no `--@<module>//…` build setting is configured anywhere
  (`prefer_prebuilt_protoc` and every sibling spelling: zero hits), and the repo
  has no protobuf dependency.
- **BZL-FLAG-35** — no `--experimental_sandbox_limits` or
  `--experimental_sandbox_memory_limit_mb` anywhere, so the cgroups flag creates
  nothing on any leg of this matrix. The EMPTY grep is the pass condition here,
  and it is also why the rule's one-way verification caveat matters more to
  adopters than to this repo.
- **Shapes B through E** — nothing to exhibit at all. To exhibit any row in this
  family a fleet repo would first have to create three files it does not have: a
  `.bazelversion` holding an exact semver, a committed `.bazelrc` whose last line
  `try-import`s a gitignored personal file, and a `MODULE.bazel` whose
  `bazel_dep` versions the drift check can read. Until then every BZL-FLAG row is
  guidance for a repository that does not yet exist — which is the `bazel-adopt`
  skill's opening move, not a finding against these repos.

## Applied to the fleet shapes

- **A — Starlark ruleset publishing to the BCR (`rules_ocx`).** Binds in full;
  every row above has a live measurement. The three that bite hardest today are
  BZL-FLAG-17 (no pre-flip testing), BZL-FLAG-21 (a two-major matrix with an
  unmarked action-environment split) and BZL-FLAG-27 (a BCR-published module with
  no declared floor of its own).
- **B — Rust CLI plus Python acceptance harness (`ocx`, `grimoire`, `ocx-mirror`,
  `bob`, `rust-oci-client`).** Does not bind today; binds on the first commit of
  any adoption. BZL-FLAG-01 and BZL-FLAG-19 govern the two files that commit
  creates, and BZL-FLAG-27/28/29 govern the `rules_rust` 0.74.0 pin it must
  choose — a `0.y.z` ruleset, so the drift check is the second-component form
  from the start.
- **C — Rust plus TypeScript monorepo (`creeptd-ng`).** Does not bind today. It is
  the one fleet repo where the multi-major rc split of BZL-FLAG-21 would matter
  in practice, because it is the only repo whose adoption would plausibly outlive
  Bazel 8's Dec 2027 Support-Ends date under BZL-FLAG-05.
- **D — Python library or automation.** Binds only on adoption, and the
  ruleset-floor rows bite first: `rules_python` 2.3.3 declares no
  `bazel_compatibility`, so BZL-FLAG-27's "read `.bazelci/presubmit.yml`" step is
  the only way to learn its `[7.x, 8.x, 9.x]` floor.
- **E — TypeScript package, extension or Action.** Binds only on adoption, and
  exhibits BZL-FLAG-27's sharpest case: `rules_js` 3.4.1 declares `>=7.6.0` while
  `rules_ts` 3.10.1 — a ruleset almost always paired with it — declares nothing
  at its release tag though its `main` carries `>=7.7.0`. A floor claim about the
  pair must name which mechanism it read for each.
- **F — Future polyglot Bazel monorepo, and `rules_ocx`'s own users.** Binds in
  full and is the shape BZL-FLAG-15's ordered checklist is written for. It is also
  where BZL-FLAG-34 first bites (a monorepo configures other modules' build
  settings), where BZL-FLAG-35's silent-degrade path becomes reachable (a CI
  runner that caps sandbox memory), and the only shape where BZL-FLAG-30's
  scheduled drift check has enough `bazel_dep` surface to be worth a CI shard.

## AI-agent failure modes

Ranked by how often each bites in practice, most frequent first. Each carries the
mechanical check that catches it.

1. **Copying a memorised or blog-sourced flag list into a new `.bazelrc`.** Six of
   the eight `--incompatible_*`/`--no*` flags the canonical 2022 always-on post
   names return zero hits against the current CLI reference — Bazel hard-fails on
   "unrecognized option". *Check*: grep every flag name against a freshly fetched
   versioned `bazel.build/versions/<N>/reference/command-line-reference`, or run
   `bazel help build --long` **and** `bazel help startup_options` on the pinned
   version, before writing it (BZL-FLAG-11).
2. **Running `bazel help all --long` and reporting what it printed.** It prints
   nothing usable: `ERROR: 'all' is not a known command`. Every artifact in this
   corpus that named it was wrong, and an agent that runs it and reads the error
   as "the flag is absent" inverts the answer. *Check*: the two real surfaces are
   `bazel help <command> --long` and `bazel help startup_options` (BZL-FLAG-11).
3. **Treating `rolling`, `last_green` or `latest` as a stable pin because the name
   sounds current.** All three are real, resolvable bazelisk values, which is
   exactly what makes the mistake easy to make confidently. *Check*:
   `.bazelversion` matches `^[0-9]+\.[0-9]+\.[0-9]+$` (BZL-FLAG-01).
4. **Concluding a flag does not exist because one help surface had no hit.**
   `--experimental_remote_repo_contents_cache` is a real startup option from
   8.8.0, invisible to `help build --long`; `--enforce_project_configs` is real
   and default-`true` from 8.7.0 with zero hits on the generated CLI reference
   because it is tagged `UNDOCUMENTED`. *Check*: both surfaces, per version, and
   never upgrade an EMPTY result into "never existed" (BZL-FLAG-11).
5. **Suggesting `--enable_workspace` "brings WORKSPACE back", or calling it a
   harmless no-op, on a Bazel-9 pin.** It is absent from every help surface at
   9.2.0, so it fails the invocation rather than doing nothing; pre-2026 training
   data remembers it as live. *Check*: grep any generated config or doc for the
   flag while the pin is ≥9.0 (BZL-FLAG-13).
6. **Trusting `gh api .../releases/latest`, a badge, or a remembered version
   string for a ruleset's current major.** Measured wrong on `rules_js` itself.
   *Check*: list all non-prerelease releases and semver-sort (BZL-FLAG-28).
7. **Confusing `--incompatible_autoload_externally` (list-valued, whole-workspace)
   with `--incompatible_disable_autoloads_in_main_repo` (boolean, main-repo only,
   8.2.0+).** The names are close enough that "disable autoloading" produces
   either. *Check*: confirm the value shape — comma-joined list versus bare
   boolean — matches the flag actually intended (BZL-FLAG-14).
8. **Citing `bazel analyze-profile` for a Bazel-9 profile, or
   `bazel dump --skyframe=working_set` on a 9 pin.** The first was deleted at
   9.0.0 and Bazel's *own* frozen 9.1.0 docs snapshot still lists it; the second
   was renamed `active_directories` while the live memory page still prints the
   old spelling. *Check*: grep the repo's docs, task files and CI for both
   spellings on any ≥9.0 pin (BZL-FLAG-31).
9. **Treating an undeclared `bazel_compatibility` as "works on any Bazel".** Three
   of six rulesets in this exact set have that gap; protobuf declares one only
   from BCR 35.0 while Bazel 9 enforces a protobuf ≥33.4 minimum from the other
   side. *Check*: read `.bazelci/presubmit.yml` and the target major's own release
   notes before any version-support claim ships (BZL-FLAG-27).
10. **Sending a reader to `bazel.build/release/backward-compatibility` for the
    current flag list.** It names zero flags. *Check*: the two-list split — BCR
    yml for "what BCR force-flips", issue label for "what is coming"
    (BZL-FLAG-07).
11. **Reading `--enforce_project_configs=true` as live enforcement, or as a
    Bazel-9 change.** It has defaulted `true` since at least 8.7.0 and is inert
    until a `PROJECT.scl` on the target's package path declares configs. *Check*:
    `find . -name PROJECT.scl` — EMPTY settles it (BZL-FLAG-32).
12. **Recommending `--sandbox_default_allow_network=false` as a fix for a
    non-hermetic repository-rule fetch.** Pattern-matching "sandbox" + "network" +
    "hermeticity" onto the wrong phase. *Check*: does the problem originate in a
    `repository_rule` implementation (loading phase, out of reach) or in
    `ctx.actions.run*` (execution phase, in scope)? (BZL-FLAG-24.)
13. **Assuming Bazel 9's cgroup flag means sandbox resource limits are now on.**
    It creates nothing without an explicit limit flag, and degrades silently to
    unlimited when the host denies a writable cgroup. *Check*: grep for
    `--experimental_sandbox_limits`/`--experimental_sandbox_memory_limit_mb`
    first; only then `--sandbox_debug --subcommands | grep -- '-C '`
    (BZL-FLAG-35).
14. **Inventing a flag name adjacent to a real one** — `--incompatible_disable_bzlmod`
    does not exist; the historical flag was `--enable_bzlmod`, gone from the 9.2.0
    binary. *Check*: `bazel help build --long | grep -- '--<flag>'` and
    `bazel help startup_options | grep -- '--<flag>'` against the pinned binary;
    zero hits on both is a stop signal (BZL-FLAG-11,
    [BZL-CACHE-23](bazel-caching-rbe.md)).
15. **Citing `--@protobuf//bazel/toolchains:prefer_prebuilt_protoc` as the current
    flag.** Bazel's own 9.0.0 release notes name it, and it has been an `alias`
    with an inverted default since protobuf 34.0. *Check*: does the citation name
    the protobuf module version alongside the flag path? (BZL-FLAG-34.)
16. **Citing the 2020 LTS announcement's "9 months Active".** A live, findable,
    well-formatted primary source that is stale by measured tag dates. *Check*:
    compute the gap from two consecutive majors' `published_at` (BZL-FLAG-04).
17. **Committing `--credential_helper` into a shipped `.bazelrc` because a
    quickstart shows it that way.** *Check*:
    `grep -n credential_helper $(git ls-files | grep '\.bazelrc')` — any hit is
    the finding, whatever the value ([BZL-CACHE-04](bazel-caching-rbe.md),
    BZL-FLAG-19).
18. **Writing a bare, unscoped `build --lockfile_mode=error` from memory that "CI
    should catch a stale lockfile".** The instinct is right and the scope is
    usually wrong on a first attempt, breaking every local dependency edit
    ([BZL-MOD-02](bazel-bzlmod-and-repo-rules.md)).
19. **Assuming `try-import`'s "try" makes the imported file's content safe.** It
    controls only whether a *missing* file fails the invocation; it says nothing
    about divergence when the file is present. *Check*: BZL-FLAG-20's two-shape
    determination, cross-read with `--announce_rc`.
20. **Reading a commented-out `incompatible_flags.yml` entry as "nothing to worry
    about", or any entry in it as maintained.** Its own inline comment ties it to
    a still-open blocking issue, and the file has four commits in its life, the
    last on 2025-07-25 (BZL-FLAG-07).
21. **Reusing an existing `build:ci` stanza as `--config=ci` inside a
    `PROJECT.scl` buildable unit.** The obvious first move for an adopter, and the
    one that cannot work: only a "client" or `InvocationPolicy` config is legal
    there (BZL-FLAG-33).
22. **Assuming Bazel 6 is still in Maintenance.** It is Deprecated on the live
    table; any cutoff before 2026 last saw it otherwise. *Check*: re-fetch
    `bazel.build/release` rather than reason from a remembered position
    (BZL-FLAG-04).

## Open questions

### Needs a human decision

1. **Does `rules_ocx` declare a `bazel_compatibility` floor in its own
   `MODULE.bazel`?** It publishes to the BCR and currently declares none
   (`grep -c` → 0), matching the pattern BZL-FLAG-27 was written against. Adding
   one is consumer-visible and resolver-enforced — a constraint on downstream
   modules, not a lint fix. The evidence supports `[">=8.7.0"]` (the oldest leg
   its own CI proves), but the choice of floor is a compatibility promise the
   owner makes, not one this research can make.
2. **Is `--remote_timeout=60` deliberate?** It appears at `.bazelrc.user:9` and
   `.github/actions/remote-cache/action.yml:28` with no rationale anywhere, 60×
   tighter than the community preset's cited CI default. BZL-FLAG-22 requires a
   comment either way; only the owner knows whether the value is a fail-fast
   choice or a carried-over local number.
3. **What triggers the 8.7.0 → 9.x pin move — and is 8.7.0 → 8.8.0 still the
   cheap option it looks like?** Frame decision 2 pins that the pin stays and both
   majors ship dated guidance. BZL-FLAG-05 proposes the default trigger — before
   Bazel 8's Dec 2027 Support-Ends date — and the stardoc-golden cost is known
   (`ci.yml:57-60`: the 8.7.0 golden is the only one that matches, so a move
   regenerates `docs/*.md` and the 8.x freshness signal changes owner). The
   measurement wave adds a cost the earlier framing missed: `bazel mod deps`
   writes `lockFileVersion` **24** on 8.7.0 and **28** on 8.8.0 *and* 9.2.0, so a
   patch bump inside Bazel 8 crosses the same lockfile-schema boundary as the
   major move. "Stay on 8.x" is not schema-stable. Confirm the date, or name an
   earlier trigger.

### Deserves another research round

| Subarea | Exact question |
|---|---|
| `cgroup-delegation-on-hosted-ci` | Does a GitHub-hosted `ubuntu-latest` runner, or a plain `docker run` without `--cgroupns=host`, actually grant the invoking user a writable cgroup subtree in 2026? BZL-FLAG-35's silent-degrade path is established from tagged source, not from a run on either host; the settling measurement is `--experimental_sandbox_limits=memory=1` plus `--sandbox_debug --subcommands` inside a real hosted job and inside a plain container, grepping the printed `linux-sandbox` line for `-C `. This program's WSL2 host confirmed cgroup v2 filesystem presence only, never writability under limits. |

### M-H rows not settled

| Row | State | Why |
|---|---|---|
| **M-H-05** | **Settled** | BZL-FLAG-18 names all four families the row asks about (cgroups, native repo rules, strict action env, autoload), BZL-FLAG-21 governs the mixed-matrix consequence, and the wave-4 round closes the last gap: BZL-FLAG-35 characterises `--incompatible_use_new_cgroup_implementation` behaviourally — inert without an explicit limit flag, silently unlimited when the host denies a writable cgroup, verified one-way through `--sandbox_debug --subcommands`. The residual is a live-runner measurement, not a characterisation gap, and is filed as its own round above. |
| **M-H-09** | Partially settled | The sanctioned-exception half is settled — BZL-FLAG-02 marks the rolling lane as a non-blocking canary and requires the directive on the leg itself. The other half ("is a production build ever run with an `--incompatible_*` flag") now rests on a *measured* premise: `--incompatible_disallow_empty_glob` defaults `true` on 8.7.0, 8.8.0 and 9.2.0, so the fleet's explicit line is provably dead. BZL-FLAG-26 stays CONSIDER because delete-versus-annotate is a policy choice the measurement does not decide. |
| **M-H-15** | **Settled** | `PROJECT.scl` coexists with `.bazelrc` rather than replacing it: per-target package-path discovery to the innermost file, `--enforce_project_configs` default-`true` on every tag 8.7.0→9.2.0 but inert without a populated file, `--config=` legal inside a buildable unit only from "client" or `InvocationPolicy`, and both flags still `UNDOCUMENTED`/`EXPERIMENTAL` with no CLI-reference entry. A same-day grep across all six shipped-set rulesets returns zero hits, so the map's promotion criterion ("it appearing in a ruleset the fleet depends on") still has not fired — but the mechanism is documented rather than deferred, and ships as BZL-FLAG-32 and BZL-FLAG-33. |
| **M-H-16** | Settled elsewhere, no `BZL-FLAG` row | Stardoc golden-file drift across Bazel majors is already a **pinned** MUST at [BZL-HERM-22](bazel-hermeticity-determinism.md) ("name the Bazel major a golden-diff or snapshot test is authoritative for, adjacent to the CI condition that excludes the other legs"), whose live instance is `ci.yml:57-62`. Duplicating it here would fork one check across two families. |

## Revision log

One line per change made on 2026-09-06, naming the input that forced it.

- **Verdict 1, BZL-FLAG-07** — added BCR's own contributor-docs statement of the
  `incompatible_flags.yml` purpose (a bazelisk `--migrate` forward warning, not
  regression coverage), the four-commits/last-touched-2025-07-25 staleness fact
  and its freshness check, and the live commented-out entry's identity. Source:
  `bazel-followups/flags-project-scl-bcr-flag-list-and-cgroups.md` § Q2 (its
  BZL-FLAG-07 revision row, applied).
- **Verdict 2, BZL-FLAG-08** — rationale rewritten: the observed lag is the file's
  own staleness, refuted as deliberate policy by the three correctly-scoped
  sibling entries. Rule text unchanged; dependency on BZL-FLAG-11 added. Same
  source.
- **BZL-FLAG-11** — verification corrected (`bazel help all --long` is not a
  command) to `bazel help <command> --long` **and** `bazel help startup_options`,
  per matrix version; added the merged-PR clause and the "EMPTY never licenses
  'never existed'" reading with the `UNDOCUMENTED` counter-example. Keeps the
  general form [BZL-CACHE-23](bazel-caching-rbe.md) cites. Sources:
  `bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md` § Q1,
  `bazel-measurements/exit-39-and-bwob-on-cache-only-build.md` § flag
  re-derivation and PR-citation audit.
- **Verdict 8, BZL-FLAG-13** — contradiction resolved in place: `--enable_workspace`
  and `--enable_bzlmod` are **absent from every help surface at 9.2.0**, not
  no-ops, so passing one is an `unrecognized option` failure. The 9.0.0 notes'
  appendix loses to the binary. Source: flag-defaults measurement § Q1.
- **BZL-FLAG-14** — rationale now cites the measured per-version defaults (full
  allowlist on 8.7.0/8.8.0, `""` on 9.2.0) and states the flag exists on all
  three, so an 8-era value parses cleanly and restores nothing. Same source.
- **Verdict 5, BZL-FLAG-16** — added the two measured error shapes on 9.2.0: a
  plain `name 'X' is not defined` with a misleading suggestion for py/sh/proto,
  and a removed-rule stub naming `buildifier --lint=fix` for `cc_library`. Same
  source, § Q4.
- **BZL-FLAG-15** — new step 7 (grep for commands and enum values the incoming
  major deleted, citing BZL-FLAG-31); step 4 extended with the incoming major's
  own enforced minimum module version (protobuf ≥ 33.4 at Bazel 9); nine steps
  become ten. Sources: `bazel-followups/diagnosis-procedures-profiling-and-execlog-tooling.md`,
  `bazel-followups/aspects-vs-macros-protobuf-and-execution-groups.md` § 2.
- **Verdict 9, BZL-FLAG-18** — the cgroups gap is closed, so the "named but not
  characterised anywhere in this corpus" sentence is removed; the row now routes
  the flag to BZL-FLAG-35 and adds the limits grep that drops it from the live
  set. Source: 4b follow-up § Q3.
- **Verdict 10, BZL-FLAG-21** — rationale now carries the measured cross-major
  flag set for 8.7.0/8.8.0/9.2.0 as the concrete list a mixed matrix must gate,
  and the `--incompatible_strict_action_env` split is stated as measured (binary
  read plus env capture) rather than source-inferred. Sources: flag-defaults
  measurement § Q1, frame Corrections measurement wave item 8.
- **Verdict 3, BZL-FLAG-24** — added the measured `true` default on all three
  versions and the measured fact that the flip does block under `linux-sandbox`;
  rule text unchanged. Sources: flag-defaults measurement § Q1, frame measurement
  wave item 9.
- **Verdict 14, BZL-FLAG-26** — the "read the default off the pinned binary before
  calling the line dead" caveat is discharged for the fleet instance
  (`--incompatible_disallow_empty_glob` `true` on all three); verification
  switched to the two real help surfaces. Severity held at CONSIDER because the
  remaining question is policy, not fact. Source: flag-defaults measurement § Q1.
- **Verdict 4, BZL-FLAG-27** — a version floor now has three mechanisms, not two:
  the module's own `bazel_compatibility` (protobuf's appears only from BCR 35.0),
  its CI matrix, and a minimum module version the Bazel major enforces from its
  own side (protobuf ≥ 33.4 at Bazel 9). Source: aspects/protobuf follow-up § 2.
- **BZL-FLAG-31 (new)** — a major bump deletes commands and enum values, not only
  flags: `bazel analyze-profile`, `dump --skyframe=working_set`, `sync --only=`,
  each still advertised by a source a reader would trust. MUST. Sources:
  diagnosis follow-up § Q1, frame wave-3b item 2.
- **BZL-FLAG-32 (new)** — `--enforce_project_configs` defaults `true` from 8.7.0
  and is inert without a populated `PROJECT.scl`; never present it as a Bazel-9
  change. MUST. Source: 4b follow-up § Q1 (its NEW-1, applied as written).
- **BZL-FLAG-33 (new)** — never `--config=<name>` inside a `PROJECT.scl` buildable
  unit when the config comes from any ordinary rc layer; `GlobalRcUtils` admits
  only "client" and `InvocationPolicy`. MUST once adopted. Source: 4b follow-up
  § Q1 (its NEW-2, applied as written).
- **BZL-FLAG-34 (new)** — a `--@<module>//<pkg>:<flag>` build setting is versioned
  by its ruleset, not by Bazel, and `bazel help` cannot see it. Generalised from
  the `prefer_prebuilt_protoc` path move and default flip at protobuf 34.0, which
  Bazel's own 9.0.0 notes get wrong for every version after 33.4. MUST. Source:
  aspects/protobuf follow-up NEW-4.
- **BZL-FLAG-35 (new)** — `--incompatible_use_new_cgroup_implementation` creates
  nothing without an explicit limit flag and degrades silently to unlimited on a
  non-writable cgroup mount; verification is one-way. MUST. Source: 4b follow-up
  § Q3 (its NEW-3, applied with the one-way EMPTY reading made explicit).
- **Verdict 15** — the version-boundary paragraph rewritten against the measured
  per-version table: 8.8.0's startup-only `--experimental_remote_repo_contents_cache`
  and `lockFileVersion` 28, 9.0.0's deleted commands, renamed enums and enforced
  protobuf minimum, 9.2.0's default-on `--repo_contents_cache`, and the two
  phantom remote flags recorded as **removed at 9.0.0**, never "never existed".
  Sources: flag-defaults measurement, exit-39 measurement, module-extension-purity
  measurement.
- **Verdicts 16, 17 (new)** — `PROJECT.scl`'s coexistence contract and the
  deleted-command class promoted into the Verdict, because both were settled by
  rounds this file commissioned. Sources: 4b follow-up § Q1, diagnosis follow-up.
- **Verdict 18 (new)** — established gaps promoted out of Open questions into the
  Verdict as documented gaps: the cgroups verification's one-way EMPTY, the absent
  hosted-runner measurement, the unidentified change that removed the two phantom
  flags, and the single-host caveat on every sandbox measurement.
- **Open questions** — all four "deserves another research round" rows removed as
  answered by the 4b follow-up (PROJECT.scl, BCR file semantics, cgroups,
  repo-mapping manifest); one honest residual added (cgroup delegation on hosted
  CI). M-H-05 and M-H-15 moved to **Settled**; M-H-09's premise re-graded as
  measured; human-decision 3 gains the 8.7.0→8.8.0 lockfile-schema cost.
- **Failure modes** — list re-ranked and extended from 15 to 22: added
  `bazel help all --long`, the one-surface false negative, deleted commands,
  `--enforce_project_configs`, the cgroup default, the protobuf flag path and the
  `PROJECT.scl` `--config=` trap; corrected the `--enable_workspace` entry from
  "no-op" to "absent", and both help-command spellings.
- **Cross-references** — five rows added: BZL-CACHE-23's reciprocal pointer,
  BZL-MOD-16 for the repo-contents cache, BZL-LARK for `Label.workspace_name`,
  BZL-JS for `ts_proto_library`, and the runfiles-library relocation routed to
  `bazel-diagnose` (the 4b follow-up's NEW-5 and NEW-6, deliberately not made
  BZL-FLAG rows: they are research and diagnosis heuristics, not diff-checkable
  standards).
- **Not adopted** — the 4b follow-up's BZL-HERM-27 note (a stale
  `LinuxSandboxCommandLineBuilder` doc comment) stays inside BZL-FLAG-35's
  rationale as a cross-reference rather than a row; its NEW-4 (`Label.repo_name`)
  belongs to BZL-LARK. From the aspects follow-up, NEW-1/2/6/7/8 are BZL-ARCH's,
  NEW-3 is BZL-LARK-10's and NEW-5 is BZL-JS's; only NEW-4 lands here, generalised
  into BZL-FLAG-34.

## Sub-artifacts

- [`bazel-flags-and-versions/lts-policy-and-incompatible-flag-churn.md`](bazel-flags-and-versions/lts-policy-and-incompatible-flag-churn.md)
  — the LTS lifecycle and live matrix, bazelisk's resolution order and version
  keywords, where the two authoritative flag lists live and which question each
  answers, the `--strict`/`--migrate` pre-flip mechanism, and the ordered 8→9
  checklist with the 19-flag reduction table. 17 sources, 15 primary.
- [`bazel-flags-and-versions/bazelrc-hygiene-and-ruleset-version-floors.md`](bazel-flags-and-versions/bazelrc-hygiene-and-ruleset-version-floors.md)
  — rc-file precedence and the three import directives, the `--config` and
  personal-config conventions, the community always-on list's migration from blog
  post to versioned module, the `--sandbox_default_allow_network` phase question,
  and the six rulesets' declared-versus-CI-measured floors. 19 sources, 16
  primary.

**Folded in the 2026-09-06 revision** — commissioned by this file's own Open
questions, or touching its rows:

- [`bazel-followups/flags-project-scl-bcr-flag-list-and-cgroups.md`](bazel-followups/flags-project-scl-bcr-flag-list-and-cgroups.md)
  — answers all four of this file's research rounds: `PROJECT.scl`'s discovery
  contract and `--config=` carve-out, the BCR file's own stated purpose and its
  staleness, the cgroups flag's no-op case and silent degrade, and the compact
  repo-mapping manifest. 30 sources, 28 primary.
- [`bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md`](bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md)
  — the authoritative per-version default table for 8.7.0 / 8.8.0 / 9.2.0, read
  off the real binaries; the source for every default this file states, and for
  the two autoload error shapes.
- [`bazel-measurements/exit-39-and-bwob-on-cache-only-build.md`](bazel-measurements/exit-39-and-bwob-on-cache-only-build.md)
  — § "flag re-derivation and PR-citation audit": the two phantom remote flags
  live on 8.7.0/8.8.0, and the two closed-unmerged PR citations behind
  BZL-FLAG-11's new clause.
- [`bazel-measurements/module-extension-purity-and-tidy-dynamic-check.md`](bazel-measurements/module-extension-purity-and-tidy-dynamic-check.md)
  — `--repo_contents_cache`'s 8.x-opt-in / 9.2.0-default-on split, cited in
  BZL-FLAG-21's cross-major set and owned by
  [BZL-MOD-16](bazel-bzlmod-and-repo-rules.md).
- [`bazel-followups/diagnosis-procedures-profiling-and-execlog-tooling.md`](bazel-followups/diagnosis-procedures-profiling-and-execlog-tooling.md)
  — `bazel analyze-profile`'s deletion at 9.0.0 and the `dump --skyframe` enum
  rename, which become BZL-FLAG-31 and step 7 of BZL-FLAG-15.
- [`bazel-followups/aspects-vs-macros-protobuf-and-execution-groups.md`](bazel-followups/aspects-vs-macros-protobuf-and-execution-groups.md)
  — protobuf's `prefer_prebuilt_protoc` path move and default flip at 34.0, and
  its late `bazel_compatibility` declaration: BZL-FLAG-34 and BZL-FLAG-27.

## Key sources

| URL | What it is | Why it is on this list |
|---|---|---|
| [bazel.build/release](https://bazel.build/release) | Official release model: LTS stage definitions, Maintenance window, cadence, live status table | The only live source for Active/Maintenance/Deprecated and Support-Ends dates; BZL-FLAG-04 and BZL-FLAG-05 both read it |
| [bazel.build/release/backward-compatibility](https://bazel.build/release/backward-compatibility) | The `--incompatible_*` process page | Primary evidence that it names **zero** flags and defers to the issue label — this family's central finding |
| [BCR `incompatible_flags.yml`](https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/incompatible_flags.yml) | BCR's own presubmit flag-testing config | The narrow, force-flipped list (6 active + 1 blocked on 2026-09-06), and the source of the lag finding |
| [BCR `docs/README.md` § Testing incompatible flags](https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/docs/README.md) | BCR's own contributor docs | States the list's purpose in BCR's words: a bazelisk `--migrate` forward-migration warning, never regression coverage |
| [`incompatible_flags.yml` commit history](https://api.github.com/repos/bazelbuild/bazel-central-registry/commits?path=incompatible_flags.yml) | GitHub commits API | Four commits ever, the last on 2025-07-25 — the evidence that the observed lag is staleness, not policy |
| [`incompatible-change` issue label](https://github.com/bazelbuild/bazel/issues?q=label%3Aincompatible-change) | GitHub issue search | The broad list — 256 all-time, 29 open — and each flag's canonical migration writeup |
| [Bazel 9.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/9.0.0) | Release notes, full body | The exact 19-flag "flipped in 9.0" list, the WORKSPACE deletion, the enforced protobuf ≥33.4 minimum, and the "now no-ops" appendix — which proves the permanent-flip trap and, on `--enable_workspace`, is the claim the 9.2.0 binary contradicts |
| [Bazel 8.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/8.0.0) | Release notes, full body | `--incompatible_autoload_externally`'s introduction, the WORKSPACE disable-by-default step, and the "will flip in a future release" list BZL-FLAG-10 diffs against |
| [`AutoloadSymbols.java` @ `release-9.0.0`](https://github.com/bazelbuild/bazel/blob/release-9.0.0/src/main/java/com/google/devtools/build/lib/packages/AutoloadSymbols.java) | Tagged Bazel source | Ground truth for the symbol→`load()` mapping; no prose page enumerates it |
| [bazelisk README](https://github.com/bazelbuild/bazelisk/blob/master/README.md) | The launcher's own docs | Version-resolution order, the `rolling`/`last_green`/`last_rc` keywords, and `--strict`/`--migrate`/`BAZELISK_INCOMPATIBLE_FLAGS` |
| [bazel.build/run/bazelrc](https://bazel.build/run/bazelrc) | Official rc-file docs | The five-layer precedence chain, `import`/`try-import`/`try-import-if-bazel-version`, the `--config` mechanism, and the personal-config underscore convention |
| [bazel.build/reference/command-line-reference](https://bazel.build/reference/command-line-reference) | Generated CLI reference | An existence-and-default check for a *documented* flag — but not a complete one: `UNDOCUMENTED` options are real and absent from it, which is why BZL-FLAG-11 reads the binary's two help surfaces instead |
| [`GlobalRcUtils.java` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/common/options/GlobalRcUtils.java) | Tagged Bazel source | Proves "global rc file" means only `client` + `Invocation policy` — the whole basis of BZL-FLAG-33 |
| [`FlagSetFunction.java` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/skyframe/config/FlagSetFunction.java) | Tagged Bazel source | The empty-flag-set early return that makes `--enforce_project_configs` inert (BZL-FLAG-32) and the `--config=` expansion carve-out (BZL-FLAG-33) |
| [`VirtualCgroup.java` / `VirtualCgroupFactory.java` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/sandbox/cgroups/VirtualCgroup.java) | Tagged Bazel source | The v1+v2 discovery, the writability check and the silent-degrade path behind BZL-FLAG-35 |
| [`protobuf` `bazel/flags/BUILD` @ v34.0 and v36.1](https://github.com/protocolbuffers/protobuf/blob/v34.0/bazel/flags/BUILD) | Ruleset source, three tags | The `prefer_prebuilt_protoc` path move and `build_setting_default` flip — BZL-FLAG-34's worked example |
| [bazelbuild/bazel#7764](https://github.com/bazelbuild/bazel/issues/7764) | Open since 2019: "sandbox for repository rules" | Proves the loading phase has never been sandboxed — settles M-H-08's premise |
| [bazelbuild/bazel#30439](https://github.com/bazelbuild/bazel/issues/30439) | Security report closed as intended behaviour | Why `--credential_helper` must come from a non-repository rc, permanently |
| [bazelbuild/bazel#23043](https://github.com/bazelbuild/bazel/issues/23043) | The autoload flag's own issue | Its migration guide names `buildifier --lint=fix -r -v .` and the ruleset floors the migration needs |
| [bazel-contrib/bazelrc-presets](https://github.com/bazel-contrib/bazelrc-presets) | The maintained successor to the 2022 always-on blog post | Its README states the not-semver-safe stance verbatim, and `flags.bzl` encodes per-flag version gates as data |
| [aspect.build/blog/bazelrc-flags](https://aspect.build/blog/bazelrc-flags) | The 2022-04-28 always-on flag post | The measured stale-source case: 6 of its 8 named `--incompatible_*`/`--no*` flags no longer exist |
| [`flag-defaults-and-trivial-builds-across-versions.md`](bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md) | This program's own measurement against real 8.7.0 / 8.8.0 / 9.2.0 binaries | The authoritative per-version default table; every default stated in this file traces here rather than to a doc page |

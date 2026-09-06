---
title: "BZL-CI (part 1) — CI matrix, gates, and release flow"
topic: ci-matrix-gates-and-release-flow
group: bazel-ci-and-target-selection
family: BZL-CI
agent: research-lang (bazel program, wave 3b)
model: sonnet
date_researched: 2026-09-05
sources_count: 17
primary_sources_count: 10
settles:
  - M-F-04
  - M-F-05
  - M-F-06
  - M-F-07
  - M-F-08
  - M-F-10
  - M-F-11
  - M-F-12
  - M-F-13
  - M-F-14
builds_on:
  - BZL-CACHE-01
  - BZL-CACHE-11
  - BZL-CACHE-26
  - BZL-CACHE-27
  - BZL-CACHE-29
  - BZL-HERM-02
  - BZL-HERM-20
  - BZL-HERM-21
  - BZL-HERM-22
  - BZL-HERM-23
  - BZL-HERM-27
  - BZL-HERM-28
  - BZL-LARK-01
  - BZL-LARK-02
  - BZL-MOD-02
  - BZL-MOD-06
  - BZL-MOD-09
  - BZL-ARCH-29
scope: >
  What a Bazel CI pipeline must contain, what each job proves, the matrix
  shape (pinned major / Active LTS / rolling), the lint gate as a Bazel
  target versus a report, registry-parity and its real shard count, a
  deterministic guard as a cheaper substitute for a full matrix run, and the
  release-flow lockstep problem (a version that must move in more than one
  place at once). Does not cover target-selection tooling (bazel-diff,
  target-determinator) or the determinism precondition for trusting it —
  that is `target-selection-and-the-determinism-precondition.md` in this
  same group; this file only names the target-count/wall-clock threshold at
  which the two topics meet. Does not cover flag-by-flag `.bazelrc` hygiene
  or the 8-to-9 migration checklist — `bazel-flags-and-versions` owns those.
---

# BZL-CI (part 1) — CI matrix, gates, and release flow

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
  1. [The matrix shape: what actually needs to be a gate](#1-the-matrix-shape-what-actually-needs-to-be-a-gate)
  2. [`bazel.build/remote/ci` is stale, verbatim](#2-bazelbuildremoteci-is-stale-verbatim)
  3. [The lint gate: `warn` is not `advisory`](#3-the-lint-gate-warn-is-not-advisory)
  4. [The aspect-based lint mechanism](#4-the-aspect-based-lint-mechanism)
  5. [Registry parity and its real shard count](#5-registry-parity-and-its-real-shard-count)
  6. [A deterministic text guard as a cheaper substitute](#6-a-deterministic-text-guard-as-a-cheaper-substitute)
  7. [The surprise: three jobs that refuse help, and a fourth that forgot to say so](#7-the-surprise-three-jobs-that-refuse-help-and-a-fourth-that-forgot-to-say-so)
  8. [`.bazelversion`, `bazelisk`, and `--migrate`](#8-bazelversion-bazelisk-and---migrate)
  9. [The release-flow lockstep problem](#9-the-release-flow-lockstep-problem)
  10. [Assembling the pipeline: where each wave-2 gate lives](#10-assembling-the-pipeline-where-each-wave-2-gate-lives)
- [Decisions](#decisions)
- [Normative guidance candidates](#normative-guidance-candidates)
- [Fleet evidence](#fleet-evidence)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- A CI job's *name* does not describe its *behavior*: `lint_mode="warn"` on a buildifier target still exits nonzero on a finding — the gate is already hard, and the only way to soften it is a wrapper that swallows the exit code ([BZL-LARK-01](../bazel-starlark-and-build.md)).
- `bazel.build/remote/ci` still tells readers to add a WORKSPACE-era `bazel-toolchains` dependency and call `rbe_autoconfig` — dead advice on any Bzlmod-only repo, and impossible on Bazel 9 outright ([bazel.build/remote/ci](https://bazel.build/remote/ci)).
- rules_lint's aspect mechanism makes a lint finding an ordinary Bazel action: it is cached, remotely executable, and needs no BUILD-file macro wrapping — the "Bazel-native" alternative to a per-language CLI step bolted onto the workflow file ([rules_lint README:14](https://github.com/aspect-build/rules_lint/blob/main/README.md)).
- The flag that turns a lint aspect into a hard gate is `--@aspect_rules_lint//lint:fail_on_violation`; without it, `bazel build --aspects=...` only produces report files that nothing fails on ([rules_lint docs/linting.md](https://github.com/aspect-build/rules_lint/blob/main/docs/linting.md)).
- `rules_ocx` does not use rules_lint at all — its "lint" job is four separate CLI tools (buildifier, actionlint, hawkeye, lychee) run outside the Bazel graph except for buildifier, because the repo has zero per-language source for an aspect to attach to (`taskfile.yml:22-32`).
- A registry-parity job's real shard count is platforms × Bazel majors, not platforms alone: `rules_ocx`'s BCR-parity job is 4 platforms × 2 majors = 8 shards, matching the BCR's own `presubmit.yml` schema exactly ([bazel-central-registry docs/README.md § Presubmit](https://github.com/bazelbuild/bazel-central-registry/blob/main/docs/README.md)).
- A `grep -c` count-match guard caught a whole class of missing-platform bug in `rules_ocx` with no Bazel invocation and no flakiness — but it only covers cardinality bugs, and a job's comment must say so or a reader will trust it for more (`ci.yml:143-168`).
- Three fleet jobs deliberately run with no remote cache because a cache hit would hide exactly what the job exists to prove; a fourth job omits the cache with no comment at all, and a reader cannot tell that from an oversight — write the rule as "a job proving something works without help must not be given help, and must say so."
- `--incompatible_strict_action_env` defaults `false` on all of Bazel 8.x and `true` only from 9.0.0 ([BZL-HERM Verdict 1](../bazel-hermeticity-determinism.md)); a CI matrix spanning both majors runs each leg under a different environment-inheritance policy with nothing in the workflow announcing it.
- `.bazelversion` values are not free text: bazelisk understands `latest`, `latest-N`, an exact version, `N.x`, `N.*`, a commit hash, and, for official releases only, `last_green`, `last_rc`, and `rolling` — `last_downstream_green` was removed and must not be cited ([bazelisk README:57-76](https://github.com/bazelbuild/bazelisk/blob/master/README.md)).
- `bazelisk --migrate` produces a report, not a pass/fail signal — it re-runs the build once per `--incompatible_*` flag and prints which ones are safe; treat it as a scheduled advisory job, never a blocking PR check ([bazelisk README:135-138](https://github.com/bazelbuild/bazelisk/blob/master/README.md)).
- `rules_ocx`'s release flow enforces two separate lockstep invariants in the same pipeline: the git tag must equal `MODULE.bazel`'s `version` (`release.yml:23-29`), and `DEFAULT_OCX_VERSION` plus every `setup-ocx` pin (repeated six times across two workflow files) must move together, checked by the same script that performs the bump (`taskfile.yml:58-70`, `update-dist.yml`).
- A `--check` mode that shares its implementation with the refresh path cannot silently diverge from it — `rules_ocx`'s `dist:check` task explicitly says so in its own comment (`taskfile.yml:64-66`); a hand-rolled second copy of the same validation is the anti-pattern this decision blocks.
- publish-to-bcr opens its BCR pull request as a draft by default; a repo using a shared bot PAT (as `rules_ocx` does) must set `draft: false` explicitly or every release silently waits on a manual click nobody remembers to make ([publish-to-bcr README § 4](https://github.com/bazel-contrib/publish-to-bcr/blob/main/README.md)).
- `rules_ocx`'s own `.claude/rules/release.md` still documents BCR submission as manual ("follow … when automating"); `release.yml` has already automated it via a `publish-to-bcr` job triggered on every non-prerelease tag — the fleet's own AI-config runbook is stale relative to its own CI.
- The docs-freshness gate (a stardoc golden) is authoritative on exactly one CI leg (`bazel != '8.7.0'` excludes it from every other leg) and the comment naming why sits directly above the exclusion (`ci.yml:57-62`) — the positive worked example for [BZL-HERM-22](../bazel-hermeticity-determinism.md).
- No CI leg anywhere in `rules_ocx` sets `--lockfile_mode=error` or `--lockfile_mode=refresh` — [BZL-MOD-02](../bazel-bzlmod-and-repo-rules.md)'s freshness gate does not exist in the one pipeline this program can measure against.
- 3 of 9 test shards and one BCR-parity target run on Windows, where `processwrapper-sandbox` is the only cross-platform strategy and cannot enforce `--sandbox_default_allow_network=false` at all — a green Windows leg is not evidence that a network-isolation claim holds ([BZL-HERM-02](../bazel-hermeticity-determinism.md), [BZL-HERM-27](../bazel-hermeticity-determinism.md)).
- The minimum CI job set for a Bazel repo is a lint gate and a test matrix; a repo that publishes to a registry adds a registry-parity job, and a repo making any offline/hermetic claim adds a cold-store correctness job — only the first two may share the warm cache.

## Findings

### 1. The matrix shape: what actually needs to be a gate

The map framed this as a binary choice — "testing a Maintenance major as the gate and the Active one as advisory is a defensible choice that must be stated" (M-F-05). `rules_ocx`'s actual matrix does neither extreme. Its `test` job runs

```yaml
strategy:
  fail-fast: false
  matrix:
    os: [ubuntu-latest, macos-latest, windows-latest]
    bazel: ["8.7.0", "9.x", "rolling"]
continue-on-error: ${{ matrix.bazel == 'rolling' }}
```

(`ci.yml:37-43`). Both `8.7.0` (the pinned Maintenance major) and `9.x` (Active LTS) are **required** checks; only `rolling` is advisory. This is a third answer the map's dichotomy did not name: double-gate both live majors, and reserve "advisory" for the one channel that genuinely offers no compatibility guarantee (a nightly build). It costs 2/3 of the matrix's CI-minutes as blocking rather than 1/3, but it is the only shape that catches a break on the Active major before an external consumer does — material for a ruleset with consumers on both majors (shape A), less obviously worth it for an internal monorepo with one pin and no outside consumers (shape F). See [Decisions](#decisions).

The version-inheritance consequence is concrete, not cosmetic: `--incompatible_strict_action_env` defaults `false` on the entire Bazel 8.x line and `true` only from 9.0.0 ([BZL-HERM Verdict 1](../bazel-hermeticity-determinism.md), corrected from an earlier, wrong blanket claim in this program's own frame). `rules_ocx`'s `8.7.0` legs inherit `LD_LIBRARY_PATH` and the client `PATH`; its `9.x` and `rolling` legs do not — and nothing in the repository says so ([BZL-HERM-01](../bazel-hermeticity-determinism.md)).

### 2. `bazel.build/remote/ci` is stale, verbatim

Fetched directly, 2026-09-05. The page's setup instructions read:

```
Add a config named `rbe_ubuntu1604`
```
and, for the WORKSPACE dependency:
```python
load("@bazel_toolchains//rules:rbe_repo.bzl", "rbe_autoconfig")

rbe_autoconfig(name = "buildkite_config")
```

with the surrounding prose instructing the reader to "Add the `bazel-toolchains` GitHub repository to your `WORKSPACE` file." Bazel 9.0 (2026-01-20) deleted the WORKSPACE support code outright — `--enable_workspace` is a documented no-op, not a compatibility shim — so this exact snippet cannot be typed into a 9.x repo at all, and `bazel-toolchains`'s `rbe_repo.bzl` is itself WORKSPACE-era machinery with no Bzlmod successor documented on the same page. The page also assumes Buildkite and the `bazelbuild` org's own presubmit format; it says nothing about CI matrix design, caching, or service accounts in general. This is the map's own example of official-doc staleness (frame), now verified: the page has not been updated to reflect either Bzlmod or Bazel 9, and an agent reading it uncritically will propose dead code ([BZL-HERM-28](../bazel-hermeticity-determinism.md) is the general form of this trap).

### 3. The lint gate: `warn` is not `advisory`

This program's single largest correction (map conflict 18, now superseded) is that `buildifier()`'s `lint_mode="warn"` does **not** mean "report only." Tracing `buildifier.go` shows `exitCode = 4` is set from the lint step *before* the mode switch is even read, and running the real binary against a seeded `depset-union` violation confirms it: exit 4, with no diff printed ([BZL-LARK Verdict 1](../bazel-starlark-and-build.md)). `rules_ocx`'s own target,

```python
buildifier(
    name = "buildifier.check",
    exclude_patterns = ["./.git/*"],
    lint_mode = "warn",
    mode = "diff",
)
```

(`BUILD.bazel:13-18`), already exits nonzero on a finding — and CI already propagates it correctly: `task lint`'s first command is `{{.BAZEL}} run //:buildifier.check` (`taskfile.yml:25`) with no `|| true`, no `continue-on-error`, and no stdout scrape, called from the `lint` job's single `run:` line (`ci.yml:31-32`). What makes a lint gate a report instead of a gate is never the linter's own mode string — it is a CI wrapper between the linter and the job's exit code. This is [BZL-LARK-01](../bazel-starlark-and-build.md)'s content, restated here only because M-F-08 asks the same question from the CI side: the check is "does anything sit between the linter's exit code and the job's," and the answer is checkable with one grep regardless of which family owns the underlying rule.

### 4. The aspect-based lint mechanism

The Bazel-native alternative to a per-language CLI step is an **aspect**, not a macro:

> "Works with the Bazel rules you already use" … "You don't need to add lint wrapper macros."
> — [rules_lint README](https://github.com/aspect-build/rules_lint/blob/main/README.md)

> "Incremental. Lint checks (including producing fixes) are run as normal Bazel actions, which means they support Remote Execution and the outputs are stored in the Remote Cache."
> — same, line 14

Mechanically: a `linters.bzl` file (conventionally under `tools/lint`) declares one "aspect factory function" per linter, registered on the command line:

```
common:lint --aspects=//tools/lint:linters.bzl%eslint
```

This alone only *produces* report files under `bazel-out`; it does not fail anything. The flag that makes it a gate is:

```
--aspects=//tools/lint:linters.bzl%eslint
--@aspect_rules_lint//lint:fail_on_violation
```

> "This makes the build fail when any lint violations are present."
> — [rules_lint docs/linting.md](https://github.com/aspect-build/rules_lint/blob/main/docs/linting.md)

An equivalent gate for `bazel test` is the `lint_test` factory function, which wraps the aspect's output in an ordinary test target. Two more command-line switches worth knowing exactly: `no-lint` as a target tag skips linting a target outright, and `tags=["lint-genfiles"]` opts a target's generated `srcs` back in (rules_lint filters generated files out by default). The module is `aspect_rules_lint`, current release **v2.9.0**, `bazel_compatibility = [">=7.6.0"]` verified directly from its tagged `MODULE.bazel` — matching the map's stated version.

`rules_ocx` is a negative-but-correct instance: its `MODULE.bazel` carries no `rules_lint`/`aspect_rules_lint` dependency at all (`grep -n bazel_dep MODULE.bazel` — five hits, none of them lint-related), and its `lint` job runs buildifier (a native Bazel target) plus three CLI tools — `actionlint`, `hawkeye`, `lychee` — invoked directly through `ocx exec` outside the Bazel graph (`taskfile.yml:22-32`). That is not a violation: the repo has zero `cc_*`/`py_*`/`js_*`/`rust_*` targets, so there is no per-language source for an aspect to attach to, and none of actionlint/hawkeye/lychee lint Starlark or BUILD files (they lint workflow YAML, license headers, and markdown links respectively — none of which rules_lint covers either). The rule this settles (M-F-14) binds on adoption, for shape F, not for shape A today.

### 5. Registry parity and its real shard count

The BCR's own presubmit schema, read directly from its docs, is a `platform` × `bazel` matrix:

```yaml
matrix:
  platform:
  - rockylinux8
  - debian10
  - ubuntu2004
  - macos
  - windows
  bazel: [6.x, 7.x]
tasks:
  verify_targets:
    name: Verify build targets
    platform: ${{ platform }}
    bazel: ${{ bazel }}
    build_targets:
    - '@zlib//:zlib'
```

(worked example, [bazel-central-registry docs/README.md § Presubmit](https://github.com/bazelbuild/bazel-central-registry/blob/main/docs/README.md), quoting `zlib@1.2.13`'s own `presubmit.yml`). "BCR requires the bazel version to be specified for each task via the `bazel` field" — so a parity job's real cost is the cross-product, not the platform count alone. `rules_ocx`'s own `.bcr/presubmit.yml` is:

```yaml
bcr_test_module:
  module_path: "e2e/bzlmod"
  matrix:
    platform: ["debian11", "ubuntu2204", "macos", "windows"]
    bazel: ["8.x", "9.x"]
```

Four platforms × two majors = **8**, and the in-repo `bcr-parity` job (`ci.yml:93-141`) reproduces exactly that shape — four `target` entries × two `bazel` matrix values, including a Rosetta-emulated `darwin-amd64` leg because "BCR's `macos` agent is Intel (x86_64); macos-13 is deprecated" (`ci.yml:94-96`). The map's own prior estimate of "4" undercounted by half; this is now measured against the BCR's documented schema, not guessed.

The BCR presubmit additionally validates `compatibility_level` against the previous version on every submission — a check the *resolver* ignores from 8.6+/9.1+ but the *registry* still gates on, with `@bazel-io skip_check compatibility_level` as the one, deliberately-visible override ([bazel-central-registry docs/README.md § Validations](https://github.com/bazelbuild/bazel-central-registry/blob/main/docs/README.md); already normative at [BZL-MOD-09](../bazel-bzlmod-and-repo-rules.md), cited here only because it is part of what "parity" has to reproduce).

### 6. A deterministic text guard as a cheaper substitute

`rules_ocx`'s `pin-completeness` job never invokes Bazel:

```bash
for f in e2e/bzlmod/MODULE.bazel examples/package/MODULE.bazel; do
  blocks=$(grep -c 'pins = {' "$f")
  for p in darwin/amd64 darwin/arm64 linux/amd64 windows/amd64; do
    n=$(grep -c "\"$p\"" "$f") || n=0
    if [ "$n" -ne "$blocks" ]; then
      echo "FAIL $f: platform '$p' appears $n time(s), expected $blocks (one per pins block)"
      rc=1
    fi
  done
done
```

(`ci.yml:143-168`). Its own comment names exactly what it is for: "Deterministic, arch-independent guard for the class of bug that broke the BCR macOS presubmit … Catches a missing platform on any runner without emulation" (`ci.yml:144-146`). This is a real, measured cost saving — a cardinality mismatch that would otherwise need a full 8-shard BCR-parity run (including a Rosetta-emulated leg) to surface is instead caught by one `ubuntu-latest` job with no Bazel invocation and no flakiness surface at all. The scope is the whole of its value: it catches *count* mismatches, nothing about content, ordering, or correctness of the platforms named. A comment that generalizes this pattern beyond its actual class ("a lightweight guard for X") is the failure mode a reviewer should watch for.

### 7. The surprise: three jobs that refuse help, and a fourth that forgot to say so

Two `rules_ocx` jobs carry an explicit, quoted rationale for running with **no** remote cache:

```yaml
# Deliberately NO remote cache: this job has to build exactly what BCR's own
# presubmit builds, on infrastructure BCR cannot reach. A cache hit here
# would hide a break that BCR would then find in the submission PR.
```
(`ci.yml:98-100`, the `bcr-parity` job)

```yaml
# Deliberately NO remote cache: this job asserts hermetic offline behaviour,
# which a network-backed cache would mask.
```
(`ci.yml:171-172`, the `offline` job)

The `offline` job's three steps are the pattern in full: warm a fetch, refetch offline against the warmed store (must succeed), then refetch offline against an empty store with a fresh `OCX_HOME` (must fail) — `ci.yml:179-199`. (What this actually proves is scoped down at [§10](#10-assembling-the-pipeline-where-each-wave-2-gate-lives): cold-store correctness, not determinism — [BZL-HERM-23](../bazel-hermeticity-determinism.md).)

A third job — `examples` (`ci.yml:64-91`) — has **no** remote-cache step either, and no comment of any kind explaining why. Read side by side, the pattern the brief asks for is exactly this asymmetry: two jobs refuse help and say so; the third refuses help and says nothing, and a reader genuinely cannot tell that apart from someone forgetting the four-line composite-action call every other job makes. The general form: *a job that proves something is possible without help must not be given help, and must say so in a comment* — turned into [BZL-CI-04](#normative-guidance-candidates) below.

A fourth, adjacent pattern belongs to the same family of "refuse help deliberately": every job that *is* cache-eligible gates the write credential identically —

```yaml
auth: ${{ github.event_name == 'push' && secrets.BAZEL_CACHE_AUTH || '' }}
```

appearing verbatim at `ci.yml:30` (lint) and `:56` (test), and equivalently in every other cache-using job. Every pull request, same-repo included, evaluates to the empty string; the write secret is never materialized in that lane's environment at all ([BZL-CACHE-01](../bazel-caching-rbe.md)). This is the fourth "refuses help" pattern worth generalizing verbatim: an untrusted lane doesn't get a *weaker* credential, it gets *no* credential, spelled identically everywhere it appears so that a job spelling the gate differently is immediately the one to audit.

### 8. `.bazelversion`, `bazelisk`, and `--migrate`

Bazelisk's version-selection precedence, read from its own README: the `USE_BAZEL_VERSION` environment variable, then `USE_BAZEL_VERSION` in a `.bazeliskrc` file, then `.bazelversion`'s content, then `USE_BAZEL_FALLBACK_VERSION` (which itself takes an `error:`/`warn:`/`silent:` prefix), then the latest official release ([bazelisk README:44-52](https://github.com/bazelbuild/bazelisk/blob/master/README.md)). `rules_ocx`'s CI never touches `.bazelversion` for its matrix legs at all — it sets `USE_BAZEL_VERSION: ${{ matrix.bazel }}` directly (`ci.yml:39-40` and equivalently in every matrixed job), which is first in the precedence order and therefore always wins regardless of the committed `.bazelversion: 8.7.0` a developer's local build reads.

The accepted value formats, verified against the README directly (lines 57-76): `latest`, `latest-1`/`latest-2`/…; an exact version (`0.17.2`); a release candidate (`0.20.0rc3`); a rolling-release version string (`5.0.0-pre.20210317.1`); a floating LTS-series identifier (`4.x`, "the latest **release**"); a wildcard LTS identifier (`4.*`, "the latest **release or candidate**"); a bare git commit hash (only for commits that passed Bazel CI); and, for official releases only, three special names — `last_green`, `last_rc`, and `rolling`. The README states outright: **"`last_downstream_green` support has been removed, please use `last_green` instead"** (line 76) — a name a model trained on older bazelisk documentation will still reach for.

`--migrate` is a report generator, not a gate:

> "`--migrate` will run Bazel multiple times to help you identify compatibility issues. If the code fails with `--strict`, the flag `--migrate` will run Bazel with each one of the flag[s] separately, and print a report at the end."
> — [bazelisk README:135-138](https://github.com/bazelbuild/bazelisk/blob/master/README.md)

By default it tests every flag starting with `--incompatible_`; `BAZELISK_INCOMPATIBLE_FLAGS` (comma-separated) narrows the sweep to the flags actually relevant to a specific major jump (README:216). Nothing about `--migrate` produces a single exit code a CI system can gate a PR on — it produces a per-flag report. The ordered checklist for *acting* on that report across an 8-to-9 jump belongs to `bazel-flags-and-versions/lts-policy-and-incompatible-flag-churn.md`; the CI-orchestration fact that belongs here is narrower: wire `--migrate` as a scheduled, non-blocking job that uploads its report as a build artifact, never as a required check, because there is no boolean result to require.

### 9. The release-flow lockstep problem

`rules_ocx` ships two independent version-lockstep invariants inside one release pipeline, and they are solved two different ways worth contrasting.

**Invariant 1 — tag must equal the module version.** `release.yml`'s first step after checkout:

```bash
tag="${GITHUB_REF_NAME#v}"
module="$(sed -n 's/.*version = "\([0-9][^"]*\)".*/\1/p' MODULE.bazel | head -1)"
if [ "$tag" != "$module" ]; then
  echo "tag v$tag does not match MODULE.bazel version $module" >&2
  exit 1
fi
```
(`release.yml:23-29`). This is a one-shot verification with no shared-implementation risk, because there is no "refresh" counterpart — a human types the tag and edits `MODULE.bazel` by hand, and the check exists purely to catch the two drifting.

**Invariant 2 — a CLI-version pin repeated six times must move as one.** `DEFAULT_OCX_VERSION` (a Starlark constant) and the `version: "0.6.0"` argument to `ocx-sh/setup-ocx@v1` appear identically in **six** places — five jobs in `ci.yml` (lines 26, 52, 88, 120, 187) and once in `release.yml:22`. `dist-snapshot.md` states the invariant directly: "Always bump together with `DEFAULT_OCX_VERSION`." The mechanism that keeps them from drifting is not a hand check — `scripts/bump_ocx.py` owns both the scheduled refresh (`update-dist.yml`, unconditional) *and* the per-PR verification (`task dist:check`, called from `task lint`, `taskfile.yml:64-70`), and the check's own comment states why that matters: **"The same code path the refresh validates with, so CI actually exercises the per-row guards … rather than a weaker second copy of them"** (`taskfile.yml:64-66`). A hand-written duplicate validator is exactly the anti-pattern this design avoids — two implementations of the same rule can diverge; one implementation called from two triggers cannot.

The BCR submission step (`publish-to-bcr`, `release.yml:47-56`, `publish.yaml`) runs automatically for any non-prerelease tag, opening a pull request against `ocx-sh/bazel-central-registry` with `draft: false` and a comment explaining why: "Open the BCR PR ready for review — upstream defaults to draft, which would require a manual 'ready' click per release" (`publish.yaml:20-22`). This matches the upstream project's own guidance precisely — draft-mode is the default specifically because "non-bot users will be unable to mark it as ready for review" when a bot/machine PAT opens the PR ([publish-to-bcr README § 4](https://github.com/bazel-contrib/publish-to-bcr/blob/main/README.md)). **This is where the fleet's own AI-config has drifted from its own CI**: `.claude/rules/release.md:12` still says "BCR submission is manual for now … follow https://github.com/bazel-contrib/publish-to-bcr when automating" — but `release.yml` has already wired the automated `publish-to-bcr` job. An agent reading only the rule file would tell a maintainer to submit by hand; the pipeline has not required that in some time.

### 10. Assembling the pipeline: where each wave-2 gate lives

The addendum names four wave-2/wave-3a findings this file must assemble into one pipeline view rather than re-derive. Read against `rules_ocx`'s six-job `ci.yml` plus its three release/maintenance workflows:

| Pipeline slot | Governing rule(s) | State in `rules_ocx` |
|---|---|---|
| BwoB download-role differentiation | [BZL-CACHE-11](../bazel-caching-rbe.md) | Absent — zero `--remote_download_*` flags anywhere; the 9-shard test matrix, BCR-parity, and examples all inherit the undifferentiated `toplevel` default. |
| Cache-outage fallback decision | [BZL-CACHE-26](../bazel-caching-rbe.md) | Absent — no fallback flag anywhere, so a `bazel-cache.ocx.sh` outage is a hard failure across `lint` and `test` with no stated rationale for accepting that. |
| "Refuses help, and says so" job design | [BZL-CACHE-27](../bazel-caching-rbe.md) (CONSIDER at that family; settled here, [§7](#7-the-surprise-three-jobs-that-refuse-help-and-a-fourth-that-forgot-to-say-so)) | Two of three comply (`bcr-parity`, `offline`); `examples` does not. |
| Dead configuration vs. deliberate pin | [BZL-CACHE-29](../bazel-caching-rbe.md) | `--remote_timeout=60` (`.github/actions/remote-cache/action.yml`, second `.bazelrc.user` line) matches the current documented default exactly, with no comment — cannot be told apart from an unstated defensive pin. |
| Docs-freshness gate scoped to one leg | [BZL-HERM-22](../bazel-hermeticity-determinism.md), [BZL-ARCH-29](../bazel-architecture-monorepo.md) | **Satisfied.** `ci.yml:57-60` names the reason (stardoc's extra `repo_mapping` row under Bazel 9+) and the authoritative major (8.7.0) directly above the guarded exclusion at `ci.yml:62`. The positive worked example for both rules. |
| Lockfile freshness gate (PR-blocking `error` + scheduled `refresh`) | [BZL-MOD-02](../bazel-bzlmod-and-repo-rules.md) | **Absent entirely.** `grep -rn 'lockfile_mode' .bazelrc* .github/ taskfile.yml` returns nothing. No leg anywhere fails on a stale `MODULE.bazel.lock`, and no scheduled leg re-checks mutable registry data. |
| Buildifier gate (hard, propagating) | [BZL-LARK-01](../bazel-starlark-and-build.md) | **Satisfied**, per [§3](#3-the-lint-gate-warn-is-not-advisory). |

Five of seven pipeline slots are either absent or partially wrong in the fleet's one measured instance. This is the concrete shape of "assembled into a pipeline": a CI matrix is not one gate, it is this table, and a review of a Bazel repo's CI should walk it row by row rather than reading `ci.yml` top to bottom and hoping each concern surfaces.

## Decisions

**D1 — Minimum job set for a Bazel repo, and cache sharing.**
Decision: every Bazel repo's CI needs, at minimum, (a) a lint gate that propagates a real exit code and (b) a test matrix covering at least the pinned major. A repo that publishes to a package registry (the BCR or an equivalent) adds (c) a registry-parity job reproducing the registry's real presubmit shape. A repo making any offline, airgapped, or "hermetic" claim adds (d) a cold-store correctness job. Only (a) and (b) may share the warm remote cache; (c) and (d) exist specifically to prove something works *without* help, so giving them help defeats their purpose and must not happen ([§7](#7-the-surprise-three-jobs-that-refuse-help-and-a-fourth-that-forgot-to-say-so)).
Evidence: `rules_ocx`'s own six jobs map exactly onto this set (`lint`, `test`→a, b; `bcr-parity`, `pin-completeness`→c; `offline`→d), and its one comment-less exception (`examples`, uncached with no stated reason) is the live counter-example proving the rule is needed, not merely aesthetic.
Assumption: "registry" is read broadly — a private artifact registry with its own presubmit binds the same way a public BCR does.

**D2 — Matrix blocking-leg policy.**
Decision: for a Bazel module with external consumers on more than one major (shape A), both the pinned major and the Active LTS are blocking legs; a rolling/nightly channel is never blocking. For an internal, single-consumer repo with no external users (shape F), the Active-LTS leg may instead be advisory, but that choice must be stated in a comment rather than left to the reader to infer from `continue-on-error`'s absence.
Evidence: `rules_ocx` (shape A, published to the BCR) double-gates `8.7.0` and `9.x` and reserves `continue-on-error` for `rolling` alone (`ci.yml:38,43`) — the actual answer the map's "gate vs. advisory" framing did not name as a third option.
Assumption: CI-minutes cost is secondary to catching an Active-LTS break before a consumer on that major does, for any module with real external consumers.

**D3 — Target-count/wall-clock threshold, named lightly (cross-referenced, not re-derived).**
The orchestrator's frame decision (row 3) fixes whole-repo green as the fleet default; this file names the boundary condition rather than re-deriving the tool-specific analysis, which belongs to `target-selection-and-the-determinism-precondition.md` in this same group. The fleet's own measured scale — `creeptd-ng` at 13 `Cargo.toml`, 3 `package.json`, 3 build scripts, and *no* repo anywhere at "monorepo scale" — sits far below any point where selection's tooling cost and documented false-negative risk (both `bazel-diff` and `target-determinator` state their own gaps) would pay for itself against a whole-repo `bazel test //...` that already finishes in minutes. The practically useful proxy is wall-clock, not raw target count: whole-repo green stays the default until a repo's `bazel test //...` on its widest CI runner is consistently the long pole of the merge queue — Tinder's reported 93 percent CI-time reduction and Canva's decision to build a custom input-hashing layer both describe organizations at a scale this fleet is not close to (frame, Corrections 9; cross-referenced, not independently re-verified here).
Assumption: the sibling dive's tool-specific false-negative classes are the deciding factor once a repo nears that wall-clock boundary; this file does not adjudicate `bazel-diff` versus `target-determinator` versus a shared-green pipeline.

## Normative guidance candidates

| # | Rule | Rationale | Verification (and how EMPTY reads) | Severity | Applies to | Settles | Depends on |
|---|---|---|---|---|---|---|---|
| BZL-CI-01 | Invoke a repo's lint gate from CI as the underlying Bazel target's own exit code (`ocx exec -- task lint` → `bazel run //:buildifier.check`, no intermediate wrapper) — never `\|\| true`, `continue-on-error: true` on the lint job, or a step that parses stdout for a pass/fail word. | `lint_mode="warn"` already exits nonzero on a finding with nothing printed; the only place that can turn the gate into a report is the CI step between the linter and the job's own exit code. | Read the workflow step invoking the lint command for `\|\| true`/`continue-on-error`/output-grepping; separately confirm `bazel run //:buildifier.check; echo $?` is nonzero after seeding a violation. EMPTY (no wrapper found, nonzero confirmed) = pass. | MUST | Bazel 8, 9; shapes A, F | M-F-08 | BZL-LARK-01 |
| BZL-CI-02 | For any repo with real per-language source (`cc_*`/`py_*`/`js_*`/`rust_*`/`java_*` targets — shape F), wire lint through `aspect_rules_lint`'s aspect mechanism (`--aspects=//tools/lint:linters.bzl%<linter>` plus `--@aspect_rules_lint//lint:fail_on_violation`, or a `lint_test` target) rather than a per-language CLI step run as a raw shell command outside the Bazel graph. | A CLI step outside the graph is invisible to `bazel query`, gets no remote caching, and re-runs in full on every invocation; the aspect form is an ordinary Bazel action and inherits both for free. | `grep -rn '\-\-aspects=' .bazelrc* .github/workflows/*.yml` for the flag, and separately check whether a per-language linter (`eslint`, `ruff`, `clippy`, `golangci-lint`) is invoked as a bare shell step. A shell-invoked linter with no matching `--aspects=` flag, on a repo with real per-language targets, is the finding. Not applicable to a repo with none (e.g. `rules_ocx` itself, correctly). | SHOULD | Bazel 7.6+ (aspect_rules_lint's `bazel_compatibility` floor); `aspect_rules_lint` ≥2.9.0; shape F | M-F-14 | — |
| BZL-CI-03 | On a module with external consumers spanning more than one Bazel major (shape A), make both the pinned major and the Active LTS blocking test legs; reserve `continue-on-error`/advisory framing for a rolling or nightly channel only. On a single-consumer internal repo (shape F) an Active-LTS-as-advisory choice is acceptable but must be stated in an adjacent comment. | Advisory-only testing of the Active LTS lets a break reach an external consumer on that major before CI catches it; conversely, gating only the Active major drops the compatibility signal for consumers still deliberately on the Maintenance pin. | Read `continue-on-error:` (or the CI system's equivalent) against every `matrix.bazel`/`matrix.version` entry. EMPTY (no advisory framing at all, i.e. every leg blocks) = pass for shape A; for shape F, EMPTY plus no comment naming the choice = finding only if more than one major is in the matrix. | MUST (shape A) / SHOULD-with-stated-assumption (shape F) | Bazel 8, 9 (any two-major matrix) | M-F-05, M-F-06 | — |
| BZL-CI-04 | A CI job whose entire purpose is proving a build works without external help (a registry-parity reproduction, a cold-store/offline correctness check) runs with every remote-cache flag absent and carries an adjacent comment naming what it proves and why a cache hit would mask it. Any other job that simply has no cache step for an unstated reason gets one added, or gets the comment. | A cache hit on a "prove it works cold" job proves cache warmth, not the property under test; a reader cannot distinguish a deliberate omission from an oversight without the comment, and an oversight silently degrades to "job runs, proves nothing new." | For every cache-eligible job (has a Bazel invocation, in a repo with a remote cache configured) lacking a cache step: is there an adjacent comment stating the reason? EMPTY comment on a "refuses help" job = finding (MUST clause); EMPTY comment on any other cache-omitted job = finding (SHOULD clause). | MUST (refuses-help jobs) / SHOULD (all others) | Bazel all; shapes A, F | M-F-07 | BZL-CACHE-27, BZL-HERM-23 |
| BZL-CI-05 | A registry-parity CI job's shard count is read from the registry's own `presubmit.yml` schema (its `platform` list × its `bazel` list), never assumed to equal the platform count alone; the job's comment states the resulting number. | The BCR's own presubmit format requires a `bazel` field per task alongside `platform`, so the real cost (and coverage) is the cross-product; citing "N platforms" alone understates it by the major-version factor. | Multiply the job's own matrix arrays and compare the product against any comment or doc claiming a shard count. EMPTY (no stated count anywhere) = not itself a finding, but recompute and add one. A stated count that does not match the recomputed product = finding. | SHOULD | Bazel 7/8/9; shape A (BCR-published modules) | M-F-10 | — |
| BZL-CI-06 | A deterministic text/count guard (a `grep -c` cross-check between two related files, run with no Bazel invocation) may substitute for exercising a full platform matrix only for a narrow, named class of bug — a missing entry or a cardinality mismatch — and the job's comment names that class explicitly. | The guard is real and cheap, but it proves nothing about content correctness, ordering, or any property beyond "these two counts match"; a comment that generalizes past that invites trusting it for more than it checks. | Read the guard's own comment against what the script actually asserts (count equality vs. anything else). A comment claiming broader coverage than the script performs = finding. EMPTY (no such guard in use) = not applicable. | SHOULD | Bazel all; shape A | M-F-11 | — |
| BZL-CI-07 | Confirm CI actually invokes `bazel`/`bazelisk` on the path that gates a merge — do not infer it from the presence of a CI badge or a `.bazelversion` file. | A measured cross-project study found roughly 31 percent of Bazel projects with a CI service configured never invoke Bazel inside it at all, and a further ~28 percent of those that do need extra tooling to make it work (map row M-F-04, sourced from the wave-1 scout corpus). Adoption that never reaches CI has bought nothing. | `grep -rln 'bazel\|bazelisk' .github/workflows/*.yml` (or the CI system's equivalent) and confirm at least one hit is on a required check. EMPTY = finding — Bazel is present in the repo but never runs where anything is gated. | MUST | Bazel all; shapes A, F | M-F-04 | — |
| BZL-CI-08 | Gate every privileged secret (a cache-write token, a publish PAT) that a CI job could expose to an untrusted-triggerable lane behind an event only a trusted actor can produce (e.g. `github.event_name == 'push'`, never a bare `pull_request`), and spell that gate identically in every job that touches the secret. A job spelling it differently from its siblings is the first one to audit. | An untrusted lane (any PR, including same-repo forks) that can read a write-capable secret can plant a backdoored artifact a later trusted build downloads and executes; identical spelling across jobs makes a divergent one immediately visible as suspect rather than requiring a line-by-line secret-flow audit. | `grep -rn 'secrets\.' .github/workflows/*.yml .github/actions/*/*.yml` and diff the surrounding conditional expression across every hit referencing the same secret name. All identical = pass; any hit with a different or absent gate = finding. | MUST | Bazel all; shapes A, F | M-F-13 | BZL-CACHE-01 |
| BZL-CI-09 | A release job that bumps a version-of-record verifies — in the same run that cuts the release, not a separate audit — that every place that version must appear (a git tag, `MODULE.bazel`'s `version`, any other in-repo pin that must move in lockstep) agrees; where an automated refresh path also exists for one of those pins, the PR-time verification and the refresh share one implementation rather than two independently-maintained copies. | A version-mismatched release either ships silently wrong or fails at the worst possible time (mid-publish); two independent implementations of "does this pin match" can diverge from each other even when each individually looks correct. | For the tag-vs-version half: `git show --stat <release-tag-commit>` includes a step comparing `GITHUB_REF_NAME` against a parsed `MODULE.bazel` version, failing on mismatch. For a repeated CLI/tool pin: confirm the CI-run verification (e.g. a `--check` task) invokes the same script/function the scheduled refresh job calls, not a hand-written second check. EMPTY on either = finding. | MUST | Bazel all; shapes A, F | M-F-12 | BZL-MOD-06 |
| BZL-CI-10 | A generated-file freshness gate ([BZL-HERM-20](../bazel-hermeticity-determinism.md)/[-21](../bazel-hermeticity-determinism.md)) or a golden test authoritative on only one Bazel major has its excluding conditional (`matrix.bazel != 'X'`, or equivalent) accompanied by a comment naming both the affected major and the reason — a bare version-inequality guard reads as routine matrix pruning, not as "this check only means something here." | Reinforces [BZL-HERM-22](../bazel-hermeticity-determinism.md)/[BZL-ARCH-29](../bazel-architecture-monorepo.md) at the CI-assembly layer: the bar these rules set is "name the gap," and an uncommented version guard fails that bar even when the underlying golden-test design is sound. | `grep -B3 "!= '<version>'\|matrix\..*!=" .github/workflows/*.yml` and confirm an adjacent comment names the major and the reason. EMPTY comment = finding; no such guard anywhere = not applicable (single-major matrix). | MUST (name it) | Bazel 8 vs. 9 (any golden authoritative on one major); shape A | — | BZL-HERM-22, BZL-ARCH-29 |
| BZL-CI-11 | Name a CI job for what it actually proves, and re-name it the moment its behavior stops matching the name — an "offline determinism" job that asserts three fetch outcomes and compares zero action keys proves cold-store correctness, not determinism. | A misnamed job trains every future reader (human or agent) to over-trust what a green run means; the mismatch is invisible unless someone reads the job body against its title. | Read every CI job's `name:`/comment header against its actual assertions (does it compare two independent execution-log or action-key captures, or only an exit code and output presence?). A name claiming more than the assertions support = finding. | SHOULD | Bazel all; shape A | — | BZL-HERM-23 |
| BZL-CI-12 | Never read a green Windows CI leg as evidence that a network-sandboxing or filesystem-isolation claim holds; scope that assertion to a Linux or macOS leg where the sandbox strategy can actually enforce it, and say so in a comment on the matrix. | `processwrapper-sandbox` is the only cross-platform sandbox strategy and Windows CI legs always use it; it enforces "no undeclared-input read" and nothing about network access — `--sandbox_default_allow_network=false` has no network namespace to revoke there. | Identify which OS entries in the test matrix are `windows-*`; confirm any hermeticity-assertion step (a `--sandbox_default_allow_network=false` build, a strict-env check) either excludes those legs or the comment explains why a Windows pass is not being read as proof. EMPTY (no such assertion in the matrix at all) = not applicable. | SHOULD | Bazel 8, 9 (Windows legs present); shapes A, F | — | BZL-HERM-02, BZL-HERM-27 |
| BZL-CI-13 | When publish-to-bcr (or an equivalent registry-publish reusable workflow) runs under a shared bot/machine PAT rather than an individual maintainer's token, set its PR to non-draft explicitly and say why in a comment; a repo using a human's personal token instead leaves the upstream default (draft) in place. | Upstream's own guidance: draft mode is the default because a human author cannot mark their own PR ready for review, but "non-bot users will be unable to mark it as ready for review" when a bot PAT opens it — the wrong default for the bot case silently stalls every release on a click nobody is watching for. | `grep -n 'draft:' .github/workflows/publish*.yml` and cross-reference which PAT/token identity opens the PR (a dedicated machine user vs. an individual's classic PAT). `draft: true` (or the key absent, which defaults true) paired with a bot/machine PAT = finding. | SHOULD | publish-to-bcr (any version); shape A | — | — |
| BZL-CI-14 | Reject — and flag as dead on sight — any CI or RBE setup instruction that adds a `bazel-toolchains` dependency to a `WORKSPACE` file or calls `rbe_autoconfig`, regardless of how authoritative the source reads (including `bazel.build/remote/ci` itself). | Bazel 9.0 deleted the WORKSPACE support code outright; the snippet cannot be typed into a Bzlmod-only repo, and the page teaching it has not been updated to say so. | `grep -rn 'rbe_autoconfig\|bazel-toolchains' WORKSPACE* MODULE.bazel* .bazelrc* .github/` — any hit anywhere in a Bzlmod-only repo is the finding, including one freshly copy-pasted from official docs. EMPTY = pass. | MUST | Bazel 9 (WORKSPACE code deleted); shapes A, F | — | BZL-HERM-28 |
| BZL-CI-15 | Name a Bazel version in CI only through `.bazelversion`, `USE_BAZEL_VERSION`, or a `.bazeliskrc` file — bazelisk's own resolution mechanism — never by installing a specific Bazel binary through an OS package manager or a hand-written download step outside that chain. | bazelisk understands a specific, documented set of version forms (`latest`, `N.x`, `N.*`, an exact version, a commit hash, and — official releases only — `last_green`, `last_rc`, `rolling`); a side-channel install silently stops tracking whichever of those a developer's local `bazelisk` run would have picked, so CI and local dev drift without either side changing. | Read every CI step that provisions Bazel; confirm it goes through a `bazelisk`-aware installer (or sets `USE_BAZEL_VERSION`/reads `.bazelversion`) rather than `apt-get install bazel`, a manually pinned download URL, or an unversioned "latest" package. EMPTY (a manual-install step found) = finding. | MUST | Bazel all; shapes A, F | — | — |
| BZL-CI-16 | Never cite `last_downstream_green` as a valid `.bazelversion`/`USE_BAZEL_VERSION` value. | Removed from bazelisk outright ("please use `last_green` instead") — a name a model trained on older bazelisk documentation will still produce. | `grep -rn 'last_downstream_green' .bazelversion .bazeliskrc .github/` — any hit is the finding. EMPTY = pass. | MUST | bazelisk (any current release) | — | — |
| BZL-CI-17 | Wire `bazelisk --migrate` as a scheduled, non-blocking job that uploads its per-flag report as a build artifact — never as a required PR check — and scope it with `BAZELISK_INCOMPATIBLE_FLAGS` to the flags relevant to the major jump actually being planned, rather than accepting the default sweep of every `--incompatible_*` flag. | `--migrate` prints a report, not a single pass/fail signal, so there is no boolean a required check could gate on; the default unscoped sweep tests flags with no bearing on the planned jump and produces a report too noisy to act on. | Confirm any workflow invoking `--migrate` is not listed as a required status check, and — if `BAZELISK_INCOMPATIBLE_FLAGS` is unset — that the job's own documentation explains the unscoped sweep is intentional. EMPTY (no `--migrate` job at all) = not applicable. | CONSIDER | bazelisk (any current release) | — | — |
| BZL-CI-18 | Keep the human-facing release runbook (an `AGENTS.md`/`.claude/rules` release procedure, a CONTRIBUTING section) in lockstep with the actual release workflow file — a runbook step describing a manual action the workflow has since automated is worse than no runbook, because an agent or a new maintainer will follow the stale instruction in good faith. | `rules_ocx`'s own `.claude/rules/release.md` still documents BCR submission as manual, months after `release.yml` automated it via a `publish-to-bcr` job — a live instance of exactly this drift, in the fleet this program is grounded on. | Read the release runbook's steps against the release/publish workflow files' actual jobs, step for step. Any runbook step describing behavior the workflow no longer requires by hand (or vice versa) = finding. EMPTY (runbook and workflow agree) = pass. | SHOULD | all; shapes A, F | — | — |
| BZL-CI-19 | The minimum CI job set for a Bazel repo is a lint gate plus a test matrix as required checks; a registry-publishing repo adds a registry-parity job, and a repo with any offline/hermetic claim adds a cold-store correctness job. Only the lint and test jobs may share the warm remote cache. | Encodes [Decision D1](#decisions): the two "prove it without help" job types exist specifically to not benefit from a warm cache, and giving them one produces a green run that has stopped proving anything. | Enumerate every CI job; classify each into {lint, test, registry-parity, cold-store, other}. Any registry-parity or cold-store job carrying a cache step = finding. A repo with no lint or no test job at all = a more basic finding (the floor is missing). EMPTY (job list matches the taxonomy exactly, cache use matches the classification) = pass. | MUST | Bazel all; shapes A, F | — | BZL-CI-04 |
| BZL-CI-20 | A CLI-tool version pin repeated across N CI job definitions (a `setup-*` action's `version:` input, a toolchain pin copy-pasted per job) is updated by exactly one script the CI also runs to *verify* the pin, never edited by hand across N files — a partial hand-edit silently leaves some jobs on the old version with no error. | `rules_ocx` repeats `version: "0.6.0"` across six job definitions in two workflow files; its own bump script explicitly treats a step it cannot rewrite as a hard failure ("this cannot rewrite is a `die()`, not a skip"), which is exactly the property a hand-edited multi-file pin cannot offer. | `grep -c '<the pin string>' .github/workflows/*.yml` before and after any version bump — the count of files touched by the bump commit must equal the count of files the grep found beforehand. A bump commit touching fewer files than the grep found = finding. | MUST | Bazel all (any CI using a repeated tool-version pin); shapes A, F | — | BZL-CI-09 |

## Fleet evidence

`rules_ocx` is the only Bazel repository in the fleet (shape A), so every claim above with a `ci.yml`/`taskfile.yml`/`release.yml` citation is this section already, folded into Findings for readability. Consolidated here are the items that read as a decision for the maintainer rather than a fact about the pipeline:

- **Satisfies today:** BZL-CI-01 (lint gate propagates), BZL-CI-08 (identical secret gating across every job), BZL-CI-09 (both lockstep invariants enforced, one of them via a shared-implementation check), BZL-CI-10 (docs-freshness exclusion is commented), BZL-CI-13 (`draft: false` set and explained).
- **Violates today:** BZL-CI-04's SHOULD clause (`examples` job, `ci.yml:64-91`, no cache step and no comment — the fourth pattern named in [§7](#7-the-surprise-three-jobs-that-refuse-help-and-a-fourth-that-forgot-to-say-so)); BZL-CI-11 (the `offline` job's name overclaims — [BZL-HERM-23](../bazel-hermeticity-determinism.md)); BZL-CI-18 (`.claude/rules/release.md:12` documents manual BCR submission that `release.yml` has already automated).
- **New commitment, nothing to violate yet:** the pipeline-assembly table in [§10](#10-assembling-the-pipeline-where-each-wave-2-gate-lives) shows [BZL-MOD-02](../bazel-bzlmod-and-repo-rules.md)'s lockfile freshness gate does not exist in this repo at all — no leg anywhere sets `--lockfile_mode=error` or `=refresh`.
- **Cannot exhibit:** BZL-CI-02 (rules_lint's aspect mechanism) — the repo has zero per-language build targets for an aspect to attach to; this is correct absence, not a gap. BZL-CI-12's specific Windows-hermeticity-claim scenario has no live assertion to scope in this repo today (no `--sandbox_default_allow_network` flag exists anywhere per [BZL-HERM Applied to rules_ocx](../bazel-hermeticity-determinism.md)), so the rule is forward-looking.
- Sibling lore sets own the manifest-hygiene half of anything version-pin-shaped inside a Bazel repo: `Cargo.toml`/`pyproject.toml`/`package.json` version bumps are `rust-cargo`/`python-packaging`/`typescript-packaging`'s territory, not this file's — covered by those sets.

## AI-agent angle

1. **Copying `bazel.build/remote/ci`'s `rbe_autoconfig`/`bazel-toolchains` snippet into a fresh Bzlmod repo.** The page is Bazel's own, current, and wrong for any repo past Bazel 9.0. *Check:* `grep -rn 'rbe_autoconfig\|bazel-toolchains' WORKSPACE* MODULE.bazel* .bazelrc*` — any hit is dead on arrival (BZL-CI-14).
2. **Reading `lint_mode="warn"` as "non-blocking."** The attribute name invites exactly this misreading, and two independent wave-1 research passes made it before a source-level trace corrected it. *Check:* seed one violation, run `bazel run //:buildifier.check; echo $?`, read the number, not the attribute name.
3. **Assuming rules_lint needs a BUILD-file macro wrapper per lint check.** The README says the opposite directly: "You don't need to add lint wrapper macros." *Check:* if a proposed diff adds a macro that calls a linter binary per-target, prefer an aspect factory function instead.
4. **Treating `bazel lint` (Aspect CLI) or a bare `--aspects=` build as a CI gate.** Neither fails the build by itself; the gate requires `--@aspect_rules_lint//lint:fail_on_violation` or a `lint_test` target. *Check:* `grep -n 'fail_on_violation\|lint_test' .bazelrc* BUILD*` alongside any `--aspects=` flag — the aspect flag with neither is report-only.
5. **Citing `last_downstream_green` as a live `.bazelversion` value.** Removed; bazelisk's own README says so in one sentence a training-data snapshot from before the removal would not carry. *Check:* `grep -rn 'last_downstream_green'`.
6. **Treating `bazelisk --migrate` as something a PR check can gate on.** It emits a per-flag report, not an exit code representing "safe to migrate." *Check:* does the workflow require the `--migrate` job's status, or only archive its output? Requiring it is the tell.
7. **Undercounting a registry-parity job's shard cost as "platforms" alone.** The BCR's schema requires a `bazel` field per task; the real count is the cross-product. *Check:* multiply, don't add, the `platform` and `bazel` matrix arrays.
8. **Naming a CI job after the property it was originally meant to prove, not what it actually asserts today.** "Offline determinism" that compares zero action keys is the shipped example. *Check:* read the job's steps against its name; does every assertion in the body support every word in the title?
9. **Assuming `continue-on-error: true` on a rolling/nightly leg means nobody has to look at it.** Whether that leg's result is read anywhere (a dashboard, a scheduled digest) is a separate, unverified question this file does not settle — flag it rather than assume either way. *Check:* is there a consumer of the advisory leg's result at all, or does a red run simply vanish?
10. **Suggesting a hand-rolled second implementation of a lockstep check "to keep it simple."** The whole value of `rules_ocx`'s `dist:check`/`dist:update` pairing is that both call the *same* Python function; a proposed diff that adds a parallel bash version-comparison script for the same invariant reintroduces the exact drift risk the design avoids. *Check:* does the new verification call into the same function/script the refresh path uses, or duplicate its logic?

## Contested / evolving

- **Whether the Active LTS leg should block or advise.** The map frames this as an open, defensible-either-way choice (M-F-05); this file found a third answer in the one measured fleet instance (double-gate both, advise only on rolling) but found no broader corpus evidence of which of the three shapes is trending — treat this as genuinely unsettled as of 2026-09-05, not as a converging consensus.
- **Aspect-based lint adoption outside Aspect-affiliated tooling.** The mechanism (`--aspects=` plus `fail_on_violation`) is vanilla Bazel and needs no Aspect CLI, but several of the workflow's convenience layers documented in the rules_lint README (`bazel lint`, `MODULE.aspect`/`axl`, Aspect Workflows' code-review integration) are Aspect-CLI- or Aspect-Workflows-specific. A repo on vanilla `bazelisk` gets the aspect mechanism but not the ergonomics; this program found no evidence of how common the vanilla-only setup is in practice, only that it is documented as supported (rules_lint README § "Warnings in the terminal with a wrapper").
- **Whether a `--migrate`-driven report should ever gate a PR.** Not found contested in any fetched source — bazelisk's own docs describe it purely as a report generator — but a repo could in principle parse the report for a hard "zero broken flags" signal. No primary source recommends this, and this file does not either; named here only because an agent might invent the pattern absent a stated prohibition.
- **The lockfile freshness gate's absence in `rules_ocx`.** Not contested as a fact (verified by grep, empty), but genuinely open as a prioritization question: [BZL-MOD-02](../bazel-bzlmod-and-repo-rules.md) rates it MUST at the family level, while this repo has shipped without it with no reported incident. This file takes no position on whether that makes the fleet's own risk acceptance correct — only that the gap is real and named.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [bazel.build/remote/ci](https://bazel.build/remote/ci) | Official Bazel docs page, RBE-in-CI setup | Fetched 2026-09-05; content undated but pre-Bzlmod | Primary — verbatim source of the `rbe_autoconfig`/`bazel-toolchains` WORKSPACE snippet, confirmed stale on Bazel 9 |
| [bazelbuild/bazelisk README](https://github.com/bazelbuild/bazelisk/blob/master/README.md) | bazelisk's own repository README | Fetched 2026-09-05, `master` | Primary — exact `.bazelversion`/`USE_BAZEL_VERSION` precedence, accepted version formats, `--migrate` mechanism, `last_downstream_green` removal |
| [aspect-build/rules_lint README](https://github.com/aspect-build/rules_lint/blob/main/README.md) | rules_lint's own repository README | Fetched 2026-09-05, `main` | Primary — the "run as normal Bazel actions … Remote Cache" caching claim, verbatim |
| [aspect-build/rules_lint docs/linting.md](https://github.com/aspect-build/rules_lint/blob/main/docs/linting.md) | rules_lint's linting mechanism doc | Fetched 2026-09-05, `main` | Primary — the exact `--aspects=`/`fail_on_violation` gate mechanism, `lint_test`, `no-lint`/`lint-genfiles` tags |
| [aspect-build/rules_lint MODULE.bazel @ v2.9.0](https://github.com/aspect-build/rules_lint/blob/v2.9.0/MODULE.bazel) | Tagged source, the module's own manifest | Fetched 2026-09-05, tag v2.9.0 | Primary — confirms module name `aspect_rules_lint`, `bazel_compatibility = [">=7.6.0"]`, current version matching the map |
| [bazel-central-registry docs/README.md](https://github.com/bazelbuild/bazel-central-registry/blob/main/docs/README.md) | BCR's own contribution docs, § Presubmit | Fetched 2026-09-05, `main` | Primary — the exact `presubmit.yml` schema (`platform` × `bazel`), the `compatibility_level`/`@bazel-io skip_check` validation, worked `zlib` example |
| [bazel-central-registry docs/bcr-policies.md](https://github.com/bazelbuild/bazel-central-registry/blob/main/docs/bcr-policies.md) | BCR maintainer/contribution policy | Fetched 2026-09-05, `main` | Primary — add-only policy, `presubmit-auto-run` label, maintainer review triggers |
| [bazel-central-registry docs/contributing.md](https://github.com/bazelbuild/bazel-central-registry/blob/main/docs/contributing.md) | BCR contribution guide (named explicitly in the brief) | Fetched 2026-09-05, `main` | Primary — CLA and review-process content; confirms the presubmit *schema* itself lives in `docs/README.md`, not here |
| [bazel-contrib/publish-to-bcr README](https://github.com/bazel-contrib/publish-to-bcr/blob/main/README.md) | publish-to-bcr's own repository README | Fetched 2026-09-05, `main` | Primary — the reusable workflow's setup steps, PAT requirements, and the draft-mode default rationale for bot vs. human PATs |
| `rules_ocx` (fleet repo, multiple files: `ci.yml`, `.github/actions/remote-cache/action.yml`, `.bcr/presubmit.yml`, `release.yml`, `publish.yaml`, `update-dist.yml`, `taskfile.yml`, `BUILD.bazel`, `.bazelrc`, `.claude/rules/release.md`, `.claude/rules/dist-snapshot.md`) | The fleet's only Bazel repository | Read directly 2026-09-05 | Primary — ground truth for every fleet-evidence claim in this file; the only measured CI pipeline this program can cite |
| [`bazel-caching-rbe.md`](../bazel-caching-rbe.md) | Wave-2 consolidation, BZL-CACHE (30 rules) | 2026-09-05 | Consolidated — source of BZL-CACHE-01/11/26/27/29, required grounding per the revision addendum |
| [`bazel-hermeticity-determinism.md`](../bazel-hermeticity-determinism.md) | Wave-2 consolidation, BZL-HERM (29 rules) | 2026-09-05 | Consolidated — source of BZL-HERM-02/20/21/22/23/27/28 and the corrected `--incompatible_strict_action_env` per-major default, required grounding per the revision addendum |
| [`bazel-starlark-and-build.md`](../bazel-starlark-and-build.md) | Wave-2 consolidation, BZL-LARK (28 rules) | 2026-09-05 | Consolidated — source of the buildifier-gate correction (map conflict 18 superseded) and BZL-LARK-01/02 |
| [`bazel-bzlmod-and-repo-rules.md`](../bazel-bzlmod-and-repo-rules.md) | Wave-2 consolidation, BZL-MOD (30 rules) | 2026-09-05 | Consolidated — source of BZL-MOD-02 (lockfile freshness gate) and BZL-MOD-09 (`compatibility_level`) |
| [`bazel-architecture-monorepo.md`](../bazel-architecture-monorepo.md) | Wave-2 consolidation, BZL-ARCH (29 rules) | 2026-09-05 | Consolidated — source of BZL-ARCH-29 (generated-file freshness gate on every CI leg) |
| [`bazel-frame.md`](../bazel-frame.md) | Program frame, wave 1/2/orchestrator corrections | 2026-09-05 | Consolidated — orchestrator decision 3 (whole-repo green default), fleet scale facts (`creeptd-ng` at 13 crates), Tinder/Aspect/Canva citations reused for D3 |
| [`bazel-topic-map.md`](../bazel-topic-map.md) | Phase-3 topic map, family-F rows and this group's commission | 2026-09-05 | Consolidated — the M-F-01…14 rows this file settles or names, and the exact brief text |

Seventeen distinct sources: nine primary web/tagged-source fetches plus the fleet repository (read across ten files) as a tenth primary source, and seven consolidated program artifacts (five wave-2 rulesets, the frame, and the topic map) required as grounding.

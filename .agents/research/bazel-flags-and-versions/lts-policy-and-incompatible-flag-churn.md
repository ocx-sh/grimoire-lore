---
title: LTS policy and incompatible-flag churn
topic: lts-policy-and-incompatible-flag-churn
group: bazel-flags-and-versions
family: BZL-FLAG
agent: sonnet
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 17
primary_sources_count: 15
settles: [M-H-01, M-H-02, M-H-03, M-H-04, M-H-05, M-H-06, M-H-07, M-H-09]
builds_on: [BZL-MOD-06, BZL-MOD-13, BZL-MOD-14, BZL-MOD-25, BZL-LARK-01, BZL-LARK-28, BZL-HERM-01, BZL-HERM-04, BZL-CACHE-23]
scope: |
  Covers the Bazel LTS lifecycle (Active/Maintenance/Deprecated, the Maintenance
  window, release cadence), the live version matrix as of 2026-09-05, .bazelversion
  and bazelisk's version-resolution algorithm (including rolling/last_green/last_rc
  and why none is a default pin), where the authoritative --incompatible_* flag list
  actually lives (BCR's incompatible_flags.yml versus the incompatible-change issue
  label versus the backward-compatibility page that names neither), bazelisk --strict/
  --migrate/BAZELISK_INCOMPATIBLE_FLAGS as the pre-flip testing mechanism, and the
  ordered Bazel 8-to-9 migration checklist (WORKSPACE deletion, the autoload split,
  and the reduction of the ~19 flags that flip in 9.0 to the ones a pure-Starlark
  repository-rule/module-extension codebase must actually care about).
  Does NOT cover .bazelrc precedence/hygiene, personal --config conventions, the
  community always-on flag list, PROJECT.scl, stardoc golden-file drift, or ruleset
  version floors (rules_js/rules_python/rules_rust/rules_cc/rules_lint) — all owned
  by the sibling dive bazelrc-hygiene-and-ruleset-version-floors. Does not restate a
  flag's default value where a wave-2 file already owns it (BZL-HERM owns
  --incompatible_strict_action_env and --incompatible_repo_env_ignores_action_env;
  BZL-MOD owns the watch/repo-name flips and repo-contents-cache flags; BZL-CACHE
  owns the remote-execution flag family) — cited by ID instead.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The LTS lifecycle and the live matrix](#1-the-lts-lifecycle-and-the-live-matrix)
   2. [The surprise inside the surprise: "9 months Active" was never true at current cadence](#2-the-surprise-inside-the-surprise-9-months-active-was-never-true-at-current-cadence)
   3. [Rolling releases: what they are, and why never a default pin](#3-rolling-releases-what-they-are-and-why-never-a-default-pin)
   4. [bazelisk's version-resolution algorithm and the special names](#4-bazelisks-version-resolution-algorithm-and-the-special-names)
   5. [Where the flag list actually lives — the brief's central surprise, confirmed](#5-where-the-flag-list-actually-lives--the-briefs-central-surprise-confirmed)
   6. [Testing a flip before it lands: --strict, --migrate, BAZELISK_INCOMPATIBLE_FLAGS](#6-testing-a-flip-before-it-lands---strict---migrate-bazelisk_incompatible_flags)
   7. [The 8→9 migration, part 1: WORKSPACE is deleted, not gated](#7-the-89-migration-part-1-workspace-is-deleted-not-gated)
   8. [The 8→9 migration, part 2: the autoload split and the rule→load() table](#8-the-89-migration-part-2-the-autoload-split-and-the-ruleload-table)
   9. [The reduction table: which of the 19 flags matter to a Starlark-only codebase](#9-the-reduction-table-which-of-the-19-flags-matter-to-a-starlark-only-codebase)
   10. [The permanent-flip trap, confirmed a second time](#10-the-permanent-flip-trap-confirmed-a-second-time)
3. [Decisions](#decisions)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Fleet evidence](#fleet-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- The live LTS matrix as of 2026-09-05: Bazel 9 Active (9.2.0, released 2026-07-13), Bazel 8 Maintenance (8.8.0, released 2026-08-31), Bazel 7 Maintenance (7.7.1), Bazel 6 Deprecated (6.6.0). `rules_ocx` pins 8.7.0 — one minor behind its own Maintenance branch's latest patch, one major behind Active ([bazel.build/release](https://bazel.build/release)).
- Maintenance lasts exactly 2 years from the date a major is superseded, confirmed by measuring tagged release dates, not by trusting a fixed-duration promise: Bazel 7 was superseded 2024-12-09 and its live Support-Ends date is Dec 2026 ([bazel.build/release](https://bazel.build/release); [gh release tags](https://github.com/bazelbuild/bazel/releases)).
- The 2020 LTS announcement's "9 months of Active support" figure is stale and must not be cited: measured against tagged releases, Bazel 8 was Active for ~13.4 months (2024-12-09 to 2026-01-20), because "Active" in current practice means "until the next major ships," not a fixed window ([2020 announcement](https://blog.bazel.build/2020/11/10/long-term-support-release.html) vs [gh api tags](https://github.com/bazelbuild/bazel)).
- Never pin `.bazelversion` to `rolling`, `last_green`, `last_rc`, `latest`, a floating `X.x`/`X.*`, or a commit hash as a repo's default — each is a moving target with no backport guarantee; `rolling` in particular "may change with any rolling release" per its own announcement ([rolling releases post](https://blog.bazel.build/2021/06/15/bazel-rolling-releases.html); [bazelisk README](https://github.com/bazelbuild/bazelisk/blob/master/README.md)).
- `bazelisk`'s version-resolution order is `USE_BAZEL_VERSION` env var → `.bazeliskrc` → `.bazelversion` file → `USE_BAZEL_FALLBACK_VERSION` → the latest official release; a CI matrix that hardcodes a literal `USE_BAZEL_VERSION` silently overrides a bumped `.bazelversion` file ([bazelisk README](https://github.com/bazelbuild/bazelisk/blob/master/README.md)).
- `bazel.build/release/backward-compatibility` names **zero** `--incompatible_*` flags — it describes only the introduce/backport/flip process and defers entirely to the `incompatible-change` GitHub issue label ([backward-compatibility](https://bazel.build/release/backward-compatibility)).
- The authoritative **narrow, actually-tested** flag list is BCR's `incompatible_flags.yml`: 6 active entries plus 1 commented out pending [#23144](https://github.com/bazelbuild/bazel/issues/23144), as of 2026-09-05 ([raw incompatible_flags.yml](https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/incompatible_flags.yml)).
- The authoritative **broad** list is the `incompatible-change` issue label: 256 issues carry it all-time, 29 still open as of 2026-09-05 — use it for "what's coming and its full migration writeup," never for "what's tested right now" ([GitHub search](https://github.com/bazelbuild/bazel/issues?q=label%3Aincompatible-change)).
- The narrow list can itself lag a flag that already flipped by default: `--incompatible_disable_autoloads_in_main_repo` is still listed under `last_green`/`rolling` in the live `incompatible_flags.yml`, even though the Bazel 9.0.0 release notes list it as already flipped and default-true. Cross-check both before trusting either alone.
- `bazelisk --strict` builds once with every currently-known `--incompatible_*` flag on and fails fast; `bazelisk --migrate` (with `BAZELISK_INCOMPATIBLE_FLAGS` to scope the set) reruns once per flag to isolate which one broke a `--strict` failure — the documented mechanism for testing a flip before the major that flips it lands, unused anywhere in the fleet today ([bazelisk README](https://github.com/bazelbuild/bazelisk/blob/master/README.md)).
- Bazel 9.0.0 deletes WORKSPACE support code outright (not a flag gate); `--enable_workspace` and `--enable_bzlmod` are both no-ops from 9.0.0 ([9.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/9.0.0)).
- Exactly 19 flags are listed as "flipped in 9.0" in the 9.0.0 release notes — matching the brief's estimate exactly; of these, only 6 are relevant to a codebase with zero `cc_*`/`java_*`/`py_*`/`proto_library`/`objc_*` targets: the two autoload flags, `--incompatible_disable_native_repo_rules`, `--incompatible_repo_env_ignores_action_env`, `--incompatible_strict_action_env`, and `--incompatible_use_new_cgroup_implementation` ([9.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/9.0.0)).
- `--incompatible_autoload_externally` and `--incompatible_disable_autoloads_in_main_repo` are two different flags on two different scopes: the first controls whether native-rule symbols autoload **anywhere** (list-valued, defaults to every moved symbol on 8.x, empty string on 9.x); the second, available since **8.2.0**, lets a repo disable autoloading in **only its own main repo** ahead of the full 9.0 flip, as an opt-in migration aid ([#23043](https://github.com/bazelbuild/bazel/issues/23043); [#25755](https://github.com/bazelbuild/bazel/issues/25755)).
- The exact rule-name-to-`load()` mapping for every autoloaded symbol lives in tagged source, `AutoloadSymbols.java`, not in prose docs — e.g. `cc_library` → `@rules_cc//cc:cc_library.bzl`, `py_binary` → `@rules_python//python:py_binary.bzl`, `sh_test` → `@rules_shell//shell:sh_test.bzl`, `proto_library` → `@com_google_protobuf//bazel:proto_library.bzl` ([AutoloadSymbols.java at release-9.0.0](https://github.com/bazelbuild/bazel/blob/release-9.0.0/src/main/java/com/google/devtools/build/lib/packages/AutoloadSymbols.java)).
- `buildifier --lint=fix -r -v .` is the documented, upstream-authored way to insert the required `load()` statements for the autoload migration — it is issue #23043's own migration guide text, not a third-party trick ([#23043](https://github.com/bazelbuild/bazel/issues/23043)).
- `--incompatible_disable_native_repo_rules` is both listed as "flipped in 9.0" **and** listed in the same release's "now no-ops" appendix — a second confirmed instance of the flip-and-permanently-lock pattern wave 2 already found for `--incompatible_use_plus_in_repo_names` (BZL-MOD-25) — never write migration guidance implying either can be un-flipped on Bazel 9.
- `rules_ocx` already `load()`s every shell rule it uses from `@rules_shell` explicitly (`docs/BUILD.bazel:9`, `examples/*/BUILD.bazel`, `ocx/tests/BUILD.bazel:4`) and declares zero `cc_*`/`java_*`/`py_*`/`proto_library` targets — the autoload flip is a non-event for this repo's own build, though it remains load-bearing for anything the ruleset teaches adopters to write.
- `rules_ocx`'s own CI already implements the rolling-canary pattern correctly: `bazel: ["8.7.0", "9.x", "rolling"]` with `continue-on-error: ${{ matrix.bazel == 'rolling' }}` and the comment "rolling is forward-compat early-warning only — never blocks" (`ci.yml:37-45`) — a positive exemplar, not a finding.

## Findings

### 1. The LTS lifecycle and the live matrix

`bazel.build/release` defines three lifecycle stages verbatim:

- **Active**: "This major version is the current active LTS release. The Bazel team backports important features and bug fixes into its minor releases."
- **Maintenance**: "This major version is an old LTS release in maintenance mode. The Bazel team only promises to backport critical bug fixes for security issues and OS-compatibility issues."
- **Deprecated**: "The Bazel team no longer provides support for this major version, all users should migrate to newer Bazel LTS releases."

A release stays in Maintenance for **2 years** before moving to Deprecated ([bazel.build/release](https://bazel.build/release)). The live table as fetched 2026-09-05:

| Major | Status | Latest patch | Latest patch date | Support ends |
|---|---|---|---|---|
| 9 | Active | 9.2.0 | 2026-07-13 | Dec 2028 |
| 8 | Maintenance | 8.8.0 | 2026-08-31 | Dec 2027 |
| 7 | Maintenance | 7.7.1 | 2025-11-12 | Dec 2026 |
| 6 | Deprecated | 6.6.0 | 2026-01-21 | Dec 2025 |

Release-date sources: [gh api repos/bazelbuild/bazel/releases/tags/{9.2.0,8.8.0,7.7.1,6.6.0}](https://github.com/bazelbuild/bazel/releases). `rules_ocx` pins **8.7.0** — a Maintenance-major pin, one minor patch behind that major's own latest (8.8.0), one full major behind Active. Per the orchestrator's decision (frame, decision 2), the pin stays; this dive's job is to make the dual-major guidance dated and checkable rather than to argue for a bump.

LTS release cadence, per the same live page: "Major versions approximately every 12 months; minor versions every 2 months on Active track; patch versions released on-demand for critical fixes." Measured against tagged releases this is accurate for the recent past: 7.0.0 (2023-12-11) → 8.0.0 (2024-12-09) → 9.0.0 (2026-01-20) is a 12.0-month then 13.4-month gap.

### 2. The surprise inside the surprise: "9 months Active" was never true at current cadence

The brief's named surprise is the backward-compatibility page (§5 below). Chasing the LTS-lifecycle sources turned up a second, unprompted one, using the same house method (measured beats asserted, cross-check two majors' worth):

The original 2020 LTS announcement states two separate numbers: "Bazel supports each LTS branch for 9 months with critical bug fixes, but no new features" (Active duration), followed by "two years of maintenance, with only security and OS compatibility fixes" ([2020 announcement](https://blog.bazel.build/2020/11/10/long-term-support-release.html)). The 2021 rolling-releases announcement repeats a matching cadence figure: "Roughly every nine months, we'll publish a stable LTS release" ([2021 rolling post](https://blog.bazel.build/2021/06/15/bazel-rolling-releases.html)).

Neither figure survives a check against tagged release dates. Major-to-major gaps, measured via `gh api repos/bazelbuild/bazel/releases/tags/<ver>`:

| Transition | Gap |
|---|---|
| 7.0.0 (2023-12-11) → 8.0.0 (2024-12-09) | 12.0 months |
| 8.0.0 (2024-12-09) → 9.0.0 (2026-01-20) | 13.4 months |

Since a major stays "Active" (per the live page's own definition) until the *next* major supersedes it, Bazel 8 was Active for 13.4 months, not 9 — and the current `bazel.build/release` page has quietly dropped the fixed-duration framing entirely, defining Active only as "the current active LTS release" with no month count. The two original announcement posts remain unedited at their original URLs and still carry the "9 months"/"nine months" figures. This is the same failure shape as map conflict 8 (a `bazel.build` page can be behind **or** ahead of the numbered releases) extended to blog-vs-live-docs-vs-measured-tags: three sources, three answers, and the tagged releases are the only one with a date attached to check against. Generalized as BZL-FLAG-03 below and folds into BZL-LARK-28's "never date from one bullet alone" discipline.

### 3. Rolling releases: what they are, and why never a default pin

Rolling releases are "a preview of the next Bazel LTS release," cut on a live-at-head cadence (the 2021 post: weekly at the time of writing; the current cadence per `bazel.build/release`'s wording is "every two weeks from HEAD" — another instance of the docs updating a cadence number the original announcement doesn't carry forward, same pattern as §2). Their defining property for pin policy: "default behaviors may change with any rolling release" ([rolling releases post](https://blog.bazel.build/2021/06/15/bazel-rolling-releases.html)) — no stability guarantee, and the post never states any patch-backport policy for a rolling build (there is none; a rolling release *is* a patch of nothing, it's a snapshot of HEAD).

`bazelisk`'s own README treats `rolling` as a resolvable version keyword: "`rolling` refers to the latest rolling release (even if there is a newer LTS release)." A rolling version also has a full, dated identifier of its own (e.g. `5.0.0-pre.20210317.1`), so a specific rolling build **can** be pinned reproducibly — the finding is about the bare `rolling` keyword as a moving default, not about rolling releases being un-pinnable in principle.

`rules_ocx`'s CI already gets this right: `bazel: ["8.7.0", "9.x", "rolling"]` with the rolling leg marked `continue-on-error: true` and the comment "rolling is forward-compat early-warning only — never blocks" (`ci.yml:37-45`).

### 4. bazelisk's version-resolution algorithm and the special names

Resolution order, verbatim from the tool's own README:

1. `USE_BAZEL_VERSION` environment variable.
2. `.bazeliskrc` file in the workspace root (same variable name).
3. `.bazelversion` file, searched in the current directory and recursively upward.
4. `USE_BAZEL_FALLBACK_VERSION`, with `error:`/`warn:`/`silent:` prefixes controlling what happens.
5. Otherwise, the latest official Bazel release.

Accepted version-label formats: an exact version (`0.17.2`), an RC (`0.20.0rc3`), a rolling identifier (`5.0.0-pre.20210317.1`), a floating LTS-series identifier (`4.x` = latest **release** in that series), a wildcard identifier (`4.*` = latest **release or candidate**), a git commit hash (only for commits that passed Bazel CI), and three special names reserved for official releases: `last_green` (latest commit that passed [Bazel CI](https://buildkite.com/bazel/bazel-bazel)), `last_rc` (latest release candidate, or latest release if none is active), and `rolling` (latest rolling release). `last_downstream_green` is removed; use `last_green` ([bazelisk README](https://github.com/bazelbuild/bazelisk/blob/master/README.md)).

None of `rolling`, `last_green`, `last_rc`, `latest`, `latest-N`, an RC string, `X.x`/`X.*`, or a bare commit hash belongs in a committed default `.bazelversion` — each resolves to a value that moves independently of any code change in the repo, which is the opposite of what a pinned build file is for. `rules_ocx`'s own `.bazelversion` is a clean exact semver, `8.7.0`.

### 5. Where the flag list actually lives — the brief's central surprise, confirmed

`bazel.build/release/backward-compatibility` describes the process — "recommended to use `--incompatible_*` flags for breaking changes," each backed by "a GitHub issue [that] explains the change in behavior and aims to provide a migration recipe," backported to the latest LTS release without enabling it by default, closed "when the incompatible flag is flipped at HEAD" — and directs readers to "GitHub issues marked with an [`incompatible-change` label]" for the actual list ([backward-compatibility](https://bazel.build/release/backward-compatibility)). It names **zero** flags by name. A rule that tells a reader "check the backward-compatibility page for current flags" sends them to a process description with a link at the bottom, confirmed by direct fetch on the research date.

Two lists exist, answering two different questions:

- **Narrow, actually-tested**: [BCR's `incompatible_flags.yml`](https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/incompatible_flags.yml). As of 2026-09-05 it carries exactly 6 active entries (`--incompatible_config_setting_private_default_visibility`, `--incompatible_disable_starlark_host_transitions`, `--incompatible_disable_native_repo_rules`, `--incompatible_autoload_externally=`, `--incompatible_disable_autoloads_in_main_repo`, `--incompatible_strict_action_env`) plus one commented out, `--noincompatible_enable_deprecated_label_apis`, pending [#23144](https://github.com/bazelbuild/bazel/issues/23144#issuecomment-2793072689). Each entry names the Bazel channel(s) — `6.x`/`7.x`/`8.x`, or `last_green`/`rolling` — BCR presubmit currently force-flips the flag on to prove registry modules keep working. Use this to answer "is BCR testing this flag today, and against what."
- **Broad**: the [`incompatible-change` GitHub issue label](https://github.com/bazelbuild/bazel/issues?q=label%3Aincompatible-change). 256 issues carry it all-time, 29 remain open as of 2026-09-05 (measured via `gh api "search/issues?q=repo:bazelbuild/bazel+label:incompatible-change"`). Use this to answer "what's coming, and where's its full migration writeup" — each issue is the canonical source for a flag's motivation, migration guide, and flip target version.

The two lists can disagree in a third way, not named in the brief: the narrow list can **lag** a flag that has already flipped by default. `--incompatible_disable_autoloads_in_main_repo` is listed in the live `incompatible_flags.yml` under channels `last_green`/`rolling` (implying "not yet a numbered-release default"), but the Bazel 9.0.0 release notes list it under "The following flags are flipped in 9.0" — i.e. it is already the shipped default on the Active LTS as of this research. The BCR file's testing-channel entry and a flag's actual shipped-default status are two different facts; reading one as a proxy for the other is itself a finding-generating mistake this dive corrects (see BZL-FLAG-06).

### 6. Testing a flip before it lands: --strict, --migrate, BAZELISK_INCOMPATIBLE_FLAGS

Two distinct bazelisk commands, both undocumented outside the tool's own README:

- **`--strict`** "expands to the set of incompatible flags which may be enabled for the given version of Bazel" and runs the build once with all of them on — the fast pass/fail signal.
- **`--migrate`** "will run Bazel multiple times to help you identify compatibility issues. If the code fails with `--strict`, the flag `--migrate` will run Bazel with each one of the flag separately, and print a report at the end" — the isolator, one build per flag.

`BAZELISK_INCOMPATIBLE_FLAGS` scopes both: "a list of incompatible flags (separated by `,`) to be tested, otherwise Bazelisk tests all flags starting with `--incompatible_`" ([bazelisk README](https://github.com/bazelbuild/bazelisk/blob/master/README.md)). The 9.0.0 release notes' own "Migration-Ready Incompatible Flags" section names this exact mechanism as the intended pre-flip test: "Users can use `bazelisk --migrate` with the `BAZELISK_INCOMPATIBLE_FLAGS` environment variable to test these flag flips with Bazel 8.x" ([9.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/9.0.0)). No fleet CI job invokes either flag today.

### 7. The 8→9 migration, part 1: WORKSPACE is deleted, not gated

Bazel 7.0.0 (2023-12-11): Bzlmod on by default, WORKSPACE still fully functional, stated plan to disable-by-default in 8 and remove in 9.

Bazel 8.0.0 (2024-12-09): "The WORKSPACE mechanism is now disabled by default. … The WORKSPACE and WORKSPACE.bzlmod files are no longer read by Bazel, by default. To bring back this behavior, use `--enable_workspace`." Still a real, working flag.

Bazel 9.0.0 (2026-01-20): "Bzlmod is now always enabled, and all `WORKSPACE` logic has been removed from Bazel ([#26131](https://github.com/bazelbuild/bazel/issues/26131))." The appendix confirms both `--enable_bzlmod` and `--enable_workspace` are "now no-ops" — not "still work if you pass them," a genuinely inert flag against deleted code. `find . -iname 'WORKSPACE*'` on a Bazel-9-pinned repo must return nothing; a hit is a hard build break, not a deprecation warning.

### 8. The 8→9 migration, part 2: the autoload split and the rule→load() table

Two separate, easily-confused flags carry this migration:

**`--incompatible_autoload_externally`** ([#23043](https://github.com/bazelbuild/bazel/issues/23043)): a comma-separated, list-valued flag naming which previously-native symbols still autoload. On Bazel 8 it defaults to the **full list** of moved symbols (so existing code keeps working transparently, provided the right ruleset versions are `bazel_dep`'d: protobuf ≥28.3, rules_java ≥8.5.1, rules_cc ≥0.0.17 per the issue's own migration guide). On Bazel 9.0.0 it defaults to the **empty string** — nothing autoloads anywhere, main repo or external, and every `cc_*`/`java_*`/`py_*`/`sh_*`/`proto_library`/provider symbol needs an explicit `load()`.

**`--incompatible_disable_autoloads_in_main_repo`** ([#25755](https://github.com/bazelbuild/bazel/issues/25755)): a boolean, available from **Bazel 8.2.0**, that disables autoloading in *only the main repository* while `--incompatible_autoload_externally` still carries its Bazel-8 default elsewhere — an early opt-in migration aid, not a scope restriction on the first flag's own effect. Its own migration guide: "Run the latest version of buildifier on the repository. Using `buildifier --lint=fix -r -v .` will add loads to the whole repository." Both flags are listed as "flipped in 9.0" in the 9.0.0 release notes.

The exact symbol-to-`load()` mapping lives only in tagged source, [`AutoloadSymbols.java` at `release-9.0.0`](https://github.com/bazelbuild/bazel/blob/release-9.0.0/src/main/java/com/google/devtools/build/lib/packages/AutoloadSymbols.java) — no prose docs page enumerates it. A representative slice:

| Native symbol | `load()` target |
|---|---|
| `cc_binary`, `cc_library`, `cc_test`, `cc_import`, `cc_toolchain` | `@rules_cc//cc:<rule>.bzl` |
| `cc_proto_library` | `@com_google_protobuf//bazel:cc_proto_library.bzl` |
| `objc_import`, `objc_library` | `@rules_cc//cc:<rule>.bzl` (moved into rules_cc, not a separate rules_objc) |
| `java_binary`, `java_library`, `java_test`, `java_import` | `@rules_java//java:<rule>.bzl` |
| `proto_library` | `@com_google_protobuf//bazel:proto_library.bzl` |
| `py_binary`, `py_library`, `py_test`, `py_runtime` | `@rules_python//python:<rule>.bzl` |
| `sh_binary`, `sh_library`, `sh_test` | `@rules_shell//shell:<rule>.bzl` |
| `aar_import`, `android_binary`, `android_library`, `android_local_test` | `@rules_android//rules:rules.bzl` |
| `xcode_config`, `xcode_version` | `@build_bazel_apple_support//xcode:<rule>.bzl` |

Buildifier's own warning taxonomy mirrors this mapping symbol-for-symbol under the `native-*` category family (`native-cc-binary`, `native-java-library`, `native-proto`, …), confirmed against [buildtools' `WARNINGS.md`](https://raw.githubusercontent.com/bazelbuild/buildtools/master/WARNINGS.md) — the same finding as BZL-LARK's "buildifier gate is already hard" (BZL-LARK-01), applied here to the autoload category specifically: these are default-on warnings under a hard gate, and `buildifier --lint=fix` is the tool that both detects and repairs them mechanically.

### 9. The reduction table: which of the 19 flags matter to a Starlark-only codebase

The 9.0.0 release notes' "Migration-Ready Incompatible Flags → The following flags are flipped in 9.0" section lists exactly **19** entries — matching the brief's "~19" estimate precisely ([9.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/9.0.0)):

| Flag | Domain | Matters to a pure-Starlark repo-rule/module-extension codebase? |
|---|---|---|
| `--combined_report` | Coverage (lcov) | No |
| `--experimental_platform_in_output_dir` | Multi-platform output layout | No (matters once cc/multi-arch builds exist) |
| `--experimental_retain_test_configuration_across_testonly` | Test config caching | No |
| `--incompatible_autoload_externally` | Native rule autoloading | **Yes** — §8 |
| `--incompatible_avoid_hardcoded_objc_compilation_flags` | ObjC | No |
| `--incompatible_bazel_test_exec_run_under` | Test exec platform | No (unless the repo ships `bazel test` targets with `--run_under`) |
| `--incompatible_compact_repo_mapping_manifest` | Runfiles repo-mapping manifest format | Situational — matters to a launcher/runfiles-reading tool |
| `--incompatible_disable_autoloads_in_main_repo` | Native rule autoloading, main repo | **Yes** — §8 |
| `--incompatible_disable_native_repo_rules` | `native.local_repository` / `native.new_local_repository` and friends | **Yes** — directly governs repository-rule authoring |
| `--incompatible_enable_proto_toolchain_resolution` | Proto toolchains | No (0 `.proto` files fleet-wide) |
| `--incompatible_filegroup_runfiles_for_data` | `filegroup` runfiles | Situational |
| `--incompatible_locations_prefers_executable` | `$(location)` expansion | Situational |
| `--incompatible_remove_ctx_bazel_py_fragment` | Python `ctx.fragments` | No |
| `--incompatible_remove_ctx_py_fragment` | Python `ctx.fragments` | No |
| `--incompatible_repo_env_ignores_action_env` | Repo-rule env sourcing | **Yes** — already owned by [BZL-HERM-04](../bazel-hermeticity-determinism.md); cite, don't restate |
| `--incompatible_strict_action_env` | Action env hermeticity | **Yes** — already owned by [BZL-HERM-01](../bazel-hermeticity-determinism.md); cite, don't restate |
| `--incompatible_target_cpu_from_platform` | C++/CPU platform mapping | No |
| `--incompatible_use_new_cgroup_implementation` | Linux sandbox cgroups | **Yes** — general CI/sandbox infra, language-independent |
| `--@bazel_tools//tools/test:incompatible_use_default_test_toolchain` | Test execution-platform selection | No (unless the repo runs `*_test` targets with platform-specific toolchains) |

Net: **6 of 19** are unconditionally load-bearing for a codebase shaped like `rules_ocx` (repository rules + module extension, zero `cc_*`/`java_*`/`py_*`/`proto_library`/`objc_*` targets); 2 of those 6 are already fully specified in BZL-HERM and should be cited, not re-derived here. The other 13 are inert until the adopting repo declares a target in the affected domain — the table's "Situational" rows are exactly where "it depends" needs an explicit trigger condition rather than a shrug.

### 10. The permanent-flip trap, confirmed a second time

Wave 2 found that `--incompatible_use_plus_in_repo_names` flipped default-true in Bazel 8.0 *and* was simultaneously made a permanent no-op — no way back, ever (BZL-MOD-25). The same shape recurs in the 9.0.0 notes: `--incompatible_disable_native_repo_rules` appears **both** in "The following flags are flipped in 9.0" **and** in the appendix's "The following flags are now no-ops" list. Two independently-confirmed instances of the same upstream pattern (flip a flag to its incompatible default and immediately strip the escape hatch in the same release) is enough to generalize: never write migration guidance implying a `--no<flag>` fallback survives past the release that flips it, without checking that release's own no-ops appendix first.

## Decisions

**Decision: the ordered Bazel 8→9 migration checklist, with verification at each step.**

1. **Confirm the starting point is clean on 8.** Run `bazelisk --strict build //...` and `bazelisk --strict test //...` on the current 8.x pin. A failure here is pre-existing debt, not a 9.0 regression — fix it before touching the pin. *Verify*: exit code; empty `--strict` report = clean.
2. **Test the exact 9.0 flip set on 8.x.** `BAZELISK_INCOMPATIBLE_FLAGS=<comma-joined 9.0.0 "flipped in 9.0" list from §9> bazelisk --migrate build //... test //...`. Fix every flag the report names as breaking. *Verify*: the migrate report; empty = every flag already compatible.
3. **Run `buildifier --lint=fix -r -v .` and diff-review the result.** This inserts every `load()` the autoload split requires, per #23043's own migration guide. *Verify*: `git diff` shows only added `load()` lines and reordering; a non-load semantic change is a finding to investigate, not auto-accept.
4. **Confirm ruleset floors for the ruleset versions the repo actually depends on** (protobuf ≥28.3, rules_java ≥8.5.1, rules_cc ≥0.0.17, or later — Bzlmod resolves this automatically via MVS; a WORKSPACE-mode repo must bump manually). This step is the seam into the sibling `bazelrc-hygiene-and-ruleset-version-floors` dive — do not re-derive floors here beyond what the autoload migration itself requires.
5. **`find . -iname 'WORKSPACE*'` must return nothing.** If it doesn't, that content is dead on 9.0 and must be ported to `MODULE.bazel` first (BZL-MOD's territory), not carried forward.
6. **Grep for the permanent-flip traps** (§10): confirm no code parses a canonical repo name for a `~` separator (BZL-MOD-25) and no code assumes `native.local_repository`/`native.new_local_repository` remain callable.
7. **Bump `.bazelversion` and regenerate `MODULE.bazel.lock` in the same commit** (BZL-MOD-06) — never a bare version-file edit.
8. **Add the new major as a real (non-`continue-on-error`) CI leg**, keep the old major's leg live and passing for the duration named below, and demote the old major's leg to a `rolling`-style canary only once its own Support-Ends date (per the live LTS table) has passed.
9. **Re-read this checklist's flag list from that major's own release notes before reusing it for a future N→N+1 bump** — per §10 and BZL-FLAG-08, a "will flip in future" flag on major N is not guaranteed to appear verbatim as "flipped" on N+1.

Evidence: 9.0.0/8.0.0 release notes (§7-9), `AutoloadSymbols.java`, issue #23043's migration guide, bazelisk README, BZL-MOD-06/BZL-MOD-25. Assumption named: this checklist assumes a Bzlmod-only, WORKSPACE-free starting point (rules_ocx and any shape-A/F repo in this program); a repo still carrying a live WORKSPACE needs the Bzlmod migration itself completed first, which is BZL-MOD's territory, not this dive's.

**Decision: how long a shipped artifact must carry guidance for a Maintenance major.**

Carry a Maintenance major's dated guidance side-by-side with the Active major's **through that major's own published Support-Ends date on the live LTS table** — the end of its 2-year Maintenance window, not indefinitely and not "until someone notices it's gone." For Bazel 8 (superseded 2026-01-20), that is **through Dec 2027** per the live table (§1). After that date, 8-specific content converts to the historical-footnote pattern the wave-2 files already use ("stopped being true at Bazel X") rather than living on as an equally-weighted alternative path.

Evidence: the Maintenance-window definition itself (§1); the orchestrator's decision (frame, decision 2) that `rules_ocx`'s 8.7.0 pin stays and the artifacts carry dated dual-major guidance now. Assumption named: this rule assumes the shipped ruleset gets re-read/re-published at least once before a major's Support-Ends date arrives — a ruleset that is published once and never revisited has no mechanism to act on this decision regardless of what it says, which is itself the reason the verification below is a scheduling reading-heuristic, not a build-time check.

## Normative guidance candidates

1. **Pin `.bazelversion` to an exact LTS semver (e.g. `8.7.0`); never `rolling`, `last_green`, `last_rc`, `latest`, a floating `X.x`/`X.*` identifier, or a bare commit hash, as the default.**
   Rationale: each of those resolves to a value that moves independently of any code change; a rolling release explicitly warns "default behaviors may change with any rolling release."
   Verify: `cat .bazelversion` — must match `^[0-9]+\.[0-9]+\.[0-9]+$`. Missing file also reads as a finding (falls through to bazelisk's "latest official release," equally unpinned).
   Severity: MUST. Bazel 6+ (any Bzlmod-era repo). Settles: M-H-01, M-H-07.

2. **Re-derive a pinned major's LTS status (Active/Maintenance/Deprecated) fresh from `bazel.build/release` every time it is cited in a rule, doc, or commit message — never carry the status forward from a prior fetch or from memory.**
   Rationale: the table's version numbers and Support-Ends dates shift on the ~2-month Active-track minor cadence; a citation ages within one minor release.
   Verify: reading heuristic — fetch `bazel.build/release` and diff the pinned major's row against the last-recorded value; cross-check with `gh api repos/bazelbuild/bazel/releases/tags/<pin>`. No diff = pass.
   Severity: SHOULD. All majors. Settles: M-H-01.

3. **Never cite a fixed month-count for how long a Bazel major stays "Active" (in particular, never repeat the 2020 announcement's "9 months"); state instead that Active lasts until the next major ships, and if a duration is needed, compute it from two consecutive majors' own tagged release dates.**
   Rationale: measured against tags, Bazel 8 was Active for 13.4 months, not 9; the live `bazel.build/release` page has itself dropped the fixed-duration framing.
   Verify: `gh api repos/bazelbuild/bazel/releases/tags/<major>.0.0 --jq .published_at` for two consecutive majors. A 404 on the newer tag means that major hasn't shipped — do not extrapolate a duration from an unreleased major.
   Severity: SHOULD (sourcing discipline). All majors. Settles: M-H-01. Depends on: BZL-LARK-28.

4. **Treat `rolling`/`last_green` as canary-only: always non-blocking in CI (`continue-on-error` or equivalent), never a repo's default `.bazelversion` pin.**
   Rationale: no patch-backport promise exists for either channel, and default behavior can change on any rolling cut.
   Verify: grep the CI config for the rolling/last_green leg's failure-handling directive. Absence = FINDING (a rolling-release regression can block merges on a version nobody chose to pin). `rules_ocx` already satisfies this (`ci.yml:38`).
   Severity: MUST. All majors; CI-matrix repos. Settles: M-H-07, M-H-09.

5. **Read the current `--incompatible_*` flag surface from BCR's `incompatible_flags.yml` (narrow: what's actually presubmit-tested, and on which channel) or the `incompatible-change` GitHub issue label (broad: what's coming, with the full migration writeup); never from `bazel.build/release/backward-compatibility`, which names no flags at all.**
   Rationale: confirmed by direct fetch on the research date — the page describes only the process and links to the label.
   Verify: `curl -sL raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/incompatible_flags.yml` for the narrow list; `gh api "search/issues?q=repo:bazelbuild/bazel+label:incompatible-change+state:open"` for the broad, open subset.
   Severity: MUST. All majors. Settles: M-H-04.

6. **Before trusting an `incompatible_flags.yml` channel entry as "not yet a shipped default," cross-check the flag against the release notes for the nearest major — the registry file can lag a flag that already flipped.**
   Rationale: `--incompatible_disable_autoloads_in_main_repo` is still listed under `last_green`/`rolling` in the live file while the 9.0.0 notes already list it as flipped and default-true.
   Verify: for a flag read from the yml, `gh api repos/bazelbuild/bazel/releases/tags/<major>.0.0 --jq .body | grep -- '--<flag>'`. A hit in a "flipped" list while the yml still shows a pre-release channel is a lag in the yml, not a contradiction — trust the release notes for "is this the default," the yml for "is BCR testing this."
   Severity: MUST. Bazel 8/9. Settles: M-H-04. Depends on: BZL-MOD-13, BZL-LARK-28.

7. **Read a commented-out entry in `incompatible_flags.yml` as "known, tracked, currently blocked" — not as "resolved" or "not a concern."**
   Rationale: the file's own inline comment ties the commented flag to a specific, still-open blocking issue.
   Verify: `grep -B2 '^\s*#\s*"--' <incompatible_flags.yml>`; any hit needs its cited issue re-read for current status. Empty = no currently-blocked flags known.
   Severity: SHOULD. All majors. Settles: M-H-04.

8. **When building an N→N+1 migration checklist, diff major N's "will flip in a future major release" list against N+1's own "flipped"/"will flip" lists — do not assume every item on the older list appears verbatim on the newer one.**
   Rationale: several flags on Bazel 8.0's "future" list (e.g. `--incompatible_config_setting_private_default_visibility`, `--incompatible_disable_starlark_host_transitions`) are *still* only "will flip in a future release" per Bazel 9.0.0's own notes — carried across two majors unflipped, while others on that same 8.0 list did flip in 9.0.
   Verify: fetch both release bodies (`gh api repos/bazelbuild/bazel/releases/tags/<N>.0.0` and `<N+1>.0.0`) and diff the flag-name sets. A name present on N's list and absent from both of N+1's lists needs its issue re-read — it may have been renamed, closed as won't-fix, or genuinely still pending.
   Severity: MUST for anyone authoring a migration checklist. Bazel 8→9 today, generalizes. Settles: M-H-04, M-H-06.

9. **Before bumping `.bazelversion` across a major boundary, run `bazelisk --migrate` with `BAZELISK_INCOMPATIBLE_FLAGS` set to the incoming major's exact "flipped in X.0" flag list (from that major's own release notes appendix) on the CURRENT pin, and fix everything it reports first.**
   Rationale: this is the documented mechanism for testing a flip before the major that flips it lands; unused anywhere in the fleet today.
   Verify: `BAZELISK_INCOMPATIBLE_FLAGS=<list> bazelisk --migrate build //... ; echo $?` on the outgoing pin. Empty report = every flag already compatible = pass.
   Severity: MUST before any major-version bump. Bazel 7/8/9 (mechanism is version-independent). Settles: M-H-06.

10. **Use `bazelisk --strict` as the fast pre-flight signal and reserve `--migrate` for isolating which specific flag broke a `--strict` failure — do not run `--migrate` cold as the first check.**
    Rationale: `--strict` runs the build once with every known flag on; `--migrate` reruns once per flag. Running `--migrate` first burns N+1 builds to answer a question `--strict` answers in one.
    Verify: reading heuristic over the migration CI job's own script — does it call `--strict` before falling back to `--migrate` only on failure?
    Severity: CONSIDER. All majors. Settles: M-H-06.

11. **A `.bazelversion` bump commit that crosses onto or past 9.0 must show a non-trivial BUILD/.bzl diff in any repo declaring `cc_*`/`java_*`/`py_*`/`sh_*`/`proto_library` targets, produced by `buildifier --lint=fix -r -v .` run and diff-reviewed in that same commit — never a bare version-file edit.**
    Rationale: per #23043's own migration guide, buildifier's autofix is the documented way to add the required loads; a repo with such targets and an empty diff on the bump commit has not actually migrated, it has broken.
    Verify: `git show --stat <bump-commit>`, cross-referenced against `grep -rln 'cc_\|java_\|py_\|proto_library\|sh_' --include=BUILD* --include=*.bzl .` run on the pre-bump tree. A repo with zero such hits legitimately shows an empty BUILD/.bzl diff; a repo with hits and an empty diff is the finding.
    Severity: MUST when bumping onto/past 9.0, for repos with native-rule usage. Bazel 9. Settles: M-H-02. Depends on: BZL-MOD-06.

12. **For an audit of 9.0 readiness, check only the 6 of 19 flipped flags that are load-bearing for a pure-Starlark repository-rule/module-extension codebase (§9's table); cite BZL-HERM-01 and BZL-HERM-04 for the two of those six that are already fully specified there, rather than re-deriving their default-value history.**
    Rationale: the reduction is the deliverable's most useful table — auditing all 19 wastes effort on 13 flags that are inert until a `cc_*`/`java_*`/`py_*`/`proto_library`/`objc_*` target exists.
    Verify: `grep -rln 'cc_\|java_\|py_\|proto_library\|objc_' --include=BUILD* --include=*.bzl .` — empty confirms the 13-flag exclusion holds; any hit means re-include the matching row(s) from §9's table.
    Severity: CONSIDER (a reading aid; the six flags it points at are independently MUST-checkable). Bazel 9.0. Settles: M-H-02, M-H-05.

13. **Never write migration guidance implying a flag that appears in a release's own "flipped" list AND its "now no-ops" appendix can be reverted with its `--no<flag>` form — check the no-ops appendix before writing any "escape hatch" text for a newly-flipped flag.**
    Rationale: confirmed twice — `--incompatible_use_plus_in_repo_names` (Bazel 8.0, BZL-MOD-25) and `--incompatible_disable_native_repo_rules` (Bazel 9.0, this dive) both flip and simultaneously lose their off-switch in the same release.
    Verify: for any newly-flipped flag, `gh api repos/bazelbuild/bazel/releases/tags/<major>.0.0 --jq '.body' | grep -A30 'now no-ops'` — a hit means no revert path exists; write guidance accordingly.
    Severity: MUST (accuracy of migration guidance). Bazel 8, 9. Settles: M-H-02, M-H-05. Depends on: BZL-MOD-25.

14. **`find . -iname 'WORKSPACE*'` must return nothing on any repo pinned to Bazel 9.0.0 or later; a hit is a hard build break, not a deprecation warning, because the supporting code is deleted, not flag-gated.**
    Rationale: 9.0.0's own notes: "all `WORKSPACE` logic has been removed from Bazel"; `--enable_workspace` is a no-op, not a re-enable switch.
    Verify: `find . -iname 'WORKSPACE*'`. Empty = pass.
    Severity: MUST. Bazel 9+. Settles: M-H-03.

15. **Never suggest `--enable_workspace` as a way to keep WORKSPACE working on a Bazel-9 pin.**
    Rationale: it is a real, working flag only on Bazel 8; a no-op from 9.0.0 against deleted code — an agent trained on pre-2026 material will remember it as live.
    Verify: grep any generated `.bazelrc`/README/CI config for `--enable_workspace` while `.bazelversion` names 9.x+. Empty = pass.
    Severity: MUST (agent-authored guidance accuracy). Bazel 9+. Settles: M-H-03.

16. **Never suggest a non-empty `--incompatible_autoload_externally=<symbol-list>` value as a Bazel-9 way to "keep the old autoloads" — its only supported effect from 9.0.0 is the empty-string default; a symbol list is a Bazel-8-only migration aid.**
    Rationale: the flag's documented Bazel-9 behavior is binary in practice (empty = current default); resurrecting Bazel-8-era symbol-list values on a 9.x pin does not restore autoloading and reads as a hallucinated workaround.
    Verify: grep for `incompatible_autoload_externally=` with a non-empty value in a repo pinned ≥9.0. A hit is a finding to correct.
    Severity: SHOULD. Bazel 9 only. Settles: M-H-02.

17. **A CI matrix must never set a literal `USE_BAZEL_VERSION` value in a workflow file — only a matrix-variable reference — because the env var takes precedence over `.bazelversion` and a hardcoded literal silently overrides any future bump to the committed file.**
    Rationale: bazelisk's own resolution order puts the env var ahead of the file; a literal `USE_BAZEL_VERSION: 8.7.0` in a workflow means bumping `.bazelversion` to `9.0.0` changes nothing that workflow actually runs.
    Verify: `grep -n 'USE_BAZEL_VERSION' .github/workflows/*.yml` — a literal semver (not a `${{ matrix.* }}` or `${{ env.* }}` expression) alongside a differing `.bazelversion` value is a FINDING. `rules_ocx` already does this correctly (`ci.yml:45,81,113,180` all use `${{ matrix.bazel }}`).
    Severity: MUST for CI authoring. All majors (bazelisk mechanism). Settles: M-H-01.

18. **Reject `latest`, `latest-N`, a bare RC string, `X.x`/`X.*`, or a raw commit hash as a committed `.bazelversion` outside a disposable fixture (`examples/`, `e2e/`).**
    Rationale: each resolves to a different concrete version on a future fetch, or (for an RC) becomes unbuildable from cache once the candidate is superseded.
    Verify: `cat .bazelversion` — matches `^[0-9]+\.[0-9]+\.[0-9]+$` only, outside named fixture directories. Missing file is also a finding (falls through to "latest official release").
    Severity: MUST. All majors. Settles: M-H-01, M-H-07.

19. **A shipped ruleset's dual-major guidance for a Maintenance major stays live, dated, and side-by-side with the Active major's only through that major's own published Support-Ends date on the live LTS table; past that date, collapse it to the historical-footnote pattern (name the version, state what stopped being true, move on).**
    Rationale: turns "we still cover Bazel 8" from an assumption into a checkable claim with an expiry the maintainer can act on.
    Verify: reading heuristic — compare the artifact's "supports Bazel 8" claim against the live `bazel.build/release` row for Bazel 8; once that row reads Deprecated, the claim is stale and the content should have already converted.
    Severity: SHOULD (a maintenance-scheduling rule for the ruleset's own owner, not a per-build check). All majors. No M-ID (this is the addendum's Decision item, not a map row).

## Fleet evidence

- `.bazelversion` is a clean exact semver, `8.7.0` — satisfies candidates 1 and 18 (`rules_ocx/.bazelversion:1`).
- `ci.yml` runs `bazel: ["8.7.0", "9.x", "rolling"]` with `continue-on-error: ${{ matrix.bazel == 'rolling' }}` and the inline comment "rolling is forward-compat early-warning only — never blocks" — satisfies candidate 4 fully; this is a positive exemplar, not a finding (`ci.yml:37-45`).
- Every `USE_BAZEL_VERSION:` occurrence in `ci.yml` (four call sites: lines 45, 81, 113, 180) references `${{ matrix.bazel }}`, never a literal — satisfies candidate 17.
- `rules_ocx` `load()`s every shell rule it declares from `@rules_shell` explicitly — `docs/BUILD.bazel:9` (`sh_binary`), `examples/cross_platform/BUILD.bazel:5`, `examples/project/BUILD.bazel:4`, `examples/package/BUILD.bazel:4`, `ocx/tests/BUILD.bazel:4` (all `sh_test`) — and declares zero `cc_*`/`java_*`/`py_*`/`proto_library` targets anywhere in the tree. Confirmed by `grep -rn` across `BUILD*`/`*.bzl`. The autoload flip (§8, §9) is a genuine non-event for this repo's own build, though the ruleset must still teach the loads correctly to adopters.
- `find . -iname 'WORKSPACE*'` on `rules_ocx` returns nothing (also independently confirmed by wave 1's `starlark-code-shape.md` headline count of 0). Satisfies candidate 14.
- No occurrence anywhere in `rules_ocx` of `native.local_repository`, `native.new_local_repository`, or `--enable_workspace` — confirmed by a full-tree grep across `.bzl`, `BUILD*`, `.md`, and `.bazelrc*`. Both of §10's permanent-flip traps and candidate 15's `--enable_workspace` trap are non-issues here today.
- `rules_ocx/MODULE.bazel` declares no `bazel_compatibility` floor (checked directly; `grep -n 'bazel_compatibility' MODULE.bazel` returns nothing) — out of this dive's scope (ruleset-floor territory belongs to the sibling `bazelrc-hygiene-and-ruleset-version-floors` dive), noted here only because it surfaced during the fleet check.
- No fleet CI job invokes `bazelisk --strict` or `bazelisk --migrate` anywhere — candidates 9 and 10 are both currently unmet; this is the dive's one concrete finding against the fleet, not a positive.
- `rules_ocx` pins a Maintenance major (8.7.0) one minor behind its own branch's latest (8.8.0) and one major behind Active (9.2.0) — expected and accepted per the orchestrator's decision (frame, decision 2); the Decisions section above is what makes this posture's expiry checkable rather than open-ended.

## AI-agent angle

- **Suggesting `--enable_workspace` "brings WORKSPACE back" on a Bazel-9 pin.** It is a no-op from 9.0.0 against code that no longer exists; an LLM trained on pre-2026 Bazel 7/8 material will remember it as a live toggle. Check: grep any generated config for the flag while the pin is ≥9.0.0.
- **Confusing `--incompatible_autoload_externally` (list-valued, whole-workspace scope) with `--incompatible_disable_autoloads_in_main_repo` (boolean, main-repo-only scope, available since 8.2.0).** The names are close enough that a model asked to "disable autoloading" may write either one and get the other's semantics. Check: read the exact flag name and confirm the value shape (a comma-joined list vs a bare boolean) matches which flag was actually intended.
- **Treating `rolling` or `last_green` as a valid, stable-sounding pin because the name sounds like "current."** Both are real, resolvable bazelisk values — which is exactly what makes the mistake easy to make confidently. Check: `.bazelversion` matches an exact semver regex; anything else outside a disposable fixture is a finding.
- **Inventing a flag name adjacent to a real one** (e.g. `--incompatible_disable_bzlmod`, which does not exist; the real historical flag was `--enable_bzlmod`/`--noenable_bzlmod`, now a no-op). Check: `bazel help --long | grep -- '--<flag>'` against the pinned binary, or a fresh fetch of the CLI reference — zero hits means the flag does not exist on that version and must not be cited (BZL-CACHE-23 states the same discipline for remote-cache flags; it generalizes here).
- **Citing the 2020 LTS announcement's "9 months Active" figure as current policy.** It is a live, findable, well-formatted primary source — exactly the kind of page a research pass is tempted to trust at face value — and it is stale by measured tag dates (§2, §3).
- **Assuming Bazel 6 is still in Maintenance.** Training-data cutoffs that predate 2026 will have last seen Bazel 6 as either Active or freshly-Maintenance; it is Deprecated as of the live table (§1). Check: re-fetch `bazel.build/release` rather than reason from a remembered lifecycle position.
- **Reading a commented-out `incompatible_flags.yml` entry as "nothing to worry about."** The comment ties it to a specific, still-open blocking issue — treating its absence from the active list as resolution is the opposite of what the file's own inline comment says. Check: candidate 7's grep-and-read-the-issue heuristic.

## Contested / evolving

- **LTS cadence and Active-phase duration.** The 2020/2021 announcement posts state a 9-month figure for both LTS release cadence and Active-phase duration; measured tagged-release gaps for the two most recent transitions are 12.0 and 13.4 months, and the current `bazel.build/release` page has quietly dropped the fixed-duration framing in favor of "Active means current, until superseded." Trend: practice has slowed relative to the original announcement, and the live docs have already been updated to match; the original announcement posts have not been retracted or corrected at their own URLs, as of 2026-09-05. Re-check the next major's release date before repeating either the 9-month or the 12-month figure as settled.
- **Whether BCR's `incompatible_flags.yml` staying behind a landed flip (§5, `--incompatible_disable_autoloads_in_main_repo`) is a one-off lag or a structural property of a hand-maintained file.** One instance observed on this research date; direction of travel (will it be corrected, or does BCR intentionally keep testing already-shipped flags on `rolling`/`last_green` for regression coverage rather than treating the file as a "not yet default" list) is not established from a single fetch. Treat every read of the file as a live check against the nearest release notes, not as a settled classification, until a second wave either confirms or refutes a pattern.
- **Whether `--incompatible_compact_repo_mapping_manifest` and `--incompatible_bazel_test_exec_run_under` (§9's "Situational" rows) matter to `rules_ocx` specifically.** The repo is a launcher/repository-rule tool that reads runfiles and repo mappings at runtime; whether its own consumption of the repo-mapping manifest format is affected by the more compact 9.0 encoding was not traced to a specific call site in this pass — flagged as a narrower follow-up rather than resolved here either way.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [bazel.build/release](https://bazel.build/release) | Official docs — LTS lifecycle definitions, Maintenance window, cadence, live status table | Fetched 2026-09-05 | Primary source for Active/Maintenance/Deprecated wording and the current version matrix |
| [bazel.build/release/backward-compatibility](https://bazel.build/release/backward-compatibility) | Official docs — the `--incompatible_*` process | Fetched 2026-09-05 | Primary source proving the page names zero flags and defers to the GitHub label — the brief's central finding |
| [blog.bazel.build/2020/11/10/long-term-support-release.html](https://blog.bazel.build/2020/11/10/long-term-support-release.html) | Original LTS announcement | Published 2020-11-10 | Primary, historical source for the original (now-superseded) 9-month Active-phase figure |
| [blog.bazel.build/2021/06/15/bazel-rolling-releases.html](https://blog.bazel.build/2021/06/15/bazel-rolling-releases.html) | Rolling-releases announcement | Published 2021-06-15 | Primary source for "default behaviors may change with any rolling release" and the original cadence figure |
| [Bazel 7.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/7.0.0) | GitHub release notes (full body, fetched via `gh api`) | Released 2023-12-11 | Primary, dated source; migration-ready flag lists and the removed-flags appendix |
| [Bazel 8.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/8.0.0) | GitHub release notes (full body, fetched via `gh api`) | Released 2024-12-09 | Primary source for the Starlarkification split, `--incompatible_autoload_externally`'s introduction, and the 10-flag "flipped in 8.0" list |
| [Bazel 9.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/9.0.0) | GitHub release notes (full body, fetched via `gh api`) | Released 2026-01-20 | Primary source for the exact 19-flag "flipped in 9.0" list, WORKSPACE deletion, and the removed/no-op appendices |
| [`incompatible_flags.yml`](https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/incompatible_flags.yml) | BCR's own presubmit flag-testing config | Fetched 2026-09-05 | Primary source for the narrow, actually-tested flag list (6 active + 1 blocked) |
| [bazelisk README](https://github.com/bazelbuild/bazelisk/blob/master/README.md) | The tool's own documentation | Fetched 2026-09-05 | Primary source for version-resolution order, `rolling`/`last_green`/`last_rc`, `--strict`/`--migrate`, `BAZELISK_INCOMPATIBLE_FLAGS` |
| [Issue #23043](https://github.com/bazelbuild/bazel/issues/23043) | `incompatible-change`-labeled issue for `--incompatible_autoload_externally` | Filed pre-2026, open TODO items remain | Primary source for the flag's exact semantics (`+`/`-` prefix rules) and its own migration guide text (`buildifier --lint=fix`) |
| [Issue #25755](https://github.com/bazelbuild/bazel/issues/25755) | `incompatible-change`-labeled issue for `--incompatible_disable_autoloads_in_main_repo` | Available from 8.2.0, enabled at HEAD when filed | Primary source distinguishing this flag's main-repo-only scope from #23043's whole-workspace scope |
| [`AutoloadSymbols.java` @ `release-9.0.0`](https://github.com/bazelbuild/bazel/blob/release-9.0.0/src/main/java/com/google/devtools/build/lib/packages/AutoloadSymbols.java) | Tagged Bazel source | Tag `release-9.0.0` | Primary, ground-truth source for the exact symbol→`load()` mapping — no prose doc enumerates it |
| [`WARNINGS.md`](https://raw.githubusercontent.com/bazelbuild/buildtools/master/WARNINGS.md) | buildifier's own warning-category reference | Fetched 2026-09-05 | Primary source confirming the `native-*` warning family mirrors `AutoloadSymbols.java`'s redirect targets symbol-for-symbol |
| [bazel.build/versions/9.0.0/reference/command-line-reference](https://bazel.build/versions/9.0.0/reference/command-line-reference) | Versioned CLI flag reference, pinned to the 9.0.0 tag | Fetched 2026-09-05 | Primary source confirming `--incompatible_autoload_externally`'s default (`""`) directly, independent of the release-notes prose |
| [GitHub issue search, `label:incompatible-change`](https://github.com/bazelbuild/bazel/issues?q=label%3Aincompatible-change) | GitHub Search API (`gh api search/issues`) | Queried 2026-09-05 | Primary source for the broad list's size (256 all-time, 29 open) |
| [`gh api repos/bazelbuild/bazel/releases/tags/<version>`](https://github.com/bazelbuild/bazel/releases) | GitHub Releases API, `published_at` field, multiple tags (6.0.0, 6.6.0, 7.0.0, 7.7.1, 8.0.0, 8.4.0, 8.8.0, 9.0.0, 9.2.0) | Queried 2026-09-05 | Primary, dated ground truth for every cadence and Maintenance-window calculation in §1-2 |
| `rules_ocx/.bazelversion`, `.github/workflows/ci.yml`, `MODULE.bazel`, `BUILD.bazel`/`.bzl` tree (local fleet repo) | Fleet ground truth | Measured 2026-09-05 | Primary, local evidence for every Fleet-evidence claim above |

---
title: "Follow-up — PROJECT.scl, BCR's incompatible_flags.yml, cgroups v2, and the repo-mapping manifest"
slug: flags-project-scl-bcr-flag-list-and-cgroups
agent: bazel-followup-flags-and-cgroups
model: sonnet
date_researched: 2026-09-06
sources_count: 30
primary_sources_count: 28
answers_for:
  - bazel-flags-and-versions.md (Open questions: project-scl-and-per-target-flags, bcr-incompatible-flags-file-semantics, linux-sandbox-cgroups-v2, runfiles-repo-mapping-manifest-format)
  - bazel-hermeticity-determinism.md (cgroups-adjacent sandbox rows: BZL-HERM-01, -02, -04, -26, -27)
affects_rule_ids:
  - BZL-FLAG-07
  - BZL-FLAG-18
  - BZL-FLAG-21
  - BZL-HERM-01
  - BZL-HERM-02
  - BZL-HERM-04
  - BZL-HERM-26
  - BZL-HERM-27
  - BZL-LARK-10
  - NEW-1
  - NEW-2
  - NEW-3
  - NEW-4
  - NEW-5
  - NEW-6
---

# Follow-up: PROJECT.scl, BCR's flag list, cgroups, and the repo-mapping manifest

## Table of contents

- [Summary](#summary)
- [Answers](#answers)
  - [Q1 — PROJECT.scl on Bazel 9.2](#q1--projectscl-on-bazel-92)
  - [Q2 — BCR's `incompatible_flags.yml` semantics](#q2--bcrs-incompatible_flagsyml-semantics)
  - [Q3 — `--incompatible_use_new_cgroup_implementation`](#q3--incompatible_use_new_cgroup_implementation)
  - [Q4 — `--incompatible_compact_repo_mapping_manifest` and runfiles libraries](#q4--incompatible_compact_repo_mapping_manifest-and-runfiles-libraries)
- [Proposed revisions](#proposed-revisions)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Not settled](#not-settled)
- [Sources](#sources)

## Summary

- `PROJECT.scl` discovery walks up a **target's package path** looking for a file literally named `PROJECT.scl`, stopping at the first one found per target, resolved per-target (not per-invocation) — [`ProjectFilesLookupFunction.java`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/skyframe/ProjectFilesLookupFunction.java#L35).
- `--enforce_project_configs` defaults **true** on every tagged release from 8.7.0 through 9.2.0, but it is a **no-op for any target whose nearest `PROJECT.scl` declares no `configs`/`buildable_units`** — `FlagSetFunction` returns early with an empty flag set in that case. A repo with no PROJECT.scl files anywhere is completely unaffected today.
- Both `--enforce_project_configs` and `--scl_config` carry `OptionDocumentationCategory.UNDOCUMENTED` and `OptionMetadataTag.EXPERIMENTAL` **unchanged from 8.7.0 to 9.2.0**, and neither appears on the generated CLI reference page — confirmed by fetching `bazel.build/reference/command-line-reference` directly and finding zero hits.
- A `PROJECT.scl` buildable unit's flags may reference `--config=<name>` only if that config's definition traces back to Bazel's own synthetic "client" (command-line) source or an `InvocationPolicy` — **never to any ordinary `.bazelrc`** (system, workspace, home, `--bazelrc`, or `try-import`ed), because `GlobalRcUtils.GLOBAL_RC_FILES` names only those two sources and today's Bazel ships **zero** real global rc files.
- Two Starlark authoring syntaxes for `PROJECT.scl` coexist at 9.2.0: a legacy dict (`project = {"configs": {...}, "default_config": ...}`) and a newer proto-struct form (`buildable_units = [buildable_unit_pb2.BuildableUnit.create(...)]`) — both parsed by the same `ProjectFunction`.
- Grepping `aspect-build/rules_js`, `aspect-build/rules_ts`, `bazelbuild/rules_python`, `bazelbuild/rules_rust`, `bazelbuild/rules_cc`, and `bazel-contrib/rules_lint` for `PROJECT.scl` returns **zero hits in all six** — none of the shipped-set rulesets consume it as of 2026-09-06.
- BCR's `incompatible_flags.yml` is, by its **own published docs**, a bazelisk `--migrate` early-warning mechanism for flags not yet default on the channel under test — not a deliberate regression-coverage list. The file has had exactly **4 commits ever**, the last on 2025-07-25 — more than six months before Bazel 9.0.0 shipped (2026-01-20) — so its one stale `last_green`/`rolling`-only entry (`--incompatible_disable_autoloads_in_main_repo`, already default-true since 9.0.0) reads as unmaintained oversight, not policy; no second such instance exists in the live file.
- `--incompatible_use_new_cgroup_implementation` (default true since 9.0.0) is a **no-op for the common case**: `VirtualCgroupFactory.create()` returns `VirtualCgroup.NULL` (creates nothing) whenever no `--experimental_sandbox_limits`/`--experimental_sandbox_memory_limit_mb` is set, regardless of the flag. It supports **both cgroup v1 and v2** (not v2-only), and on any failure — non-writable cgroup dir, non-Linux host, missing delegation — it silently degrades to "no resource limits," logged only at INFO level, and the build proceeds and succeeds.
- The verification a CI author actually has: `linux-sandbox` receives cgroup directories via a `-C <dir>` flag ([`LinuxSandboxCommandLineBuilder.java:302-304`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/sandbox/LinuxSandboxCommandLineBuilder.java#L302-L304)); run with `--sandbox_debug --subcommands` and grep the printed invocation for `-C `. Absence means either the flag is off, no limits were requested, or cgroup creation failed silently — there is no `bazel info` line or exit code that distinguishes these.
- `--incompatible_compact_repo_mapping_manifest` (default false through 8.8.0, true from 9.0.0) merges consecutive manifest rows for repos generated by the same module extension into one wildcarded row (`module+ext+*,apparent,canonical`) — a pure size optimization on the `_repo_mapping` file that a **wildcard-unaware** reader will silently miss.
- The canonical Bash runfiles library moved **out of Bazel core** into `rules_shell` in February 2025 (`@bazel_tools//tools/bash/runfiles` is now an alias); `runfiles.bash` gained wildcard/compact-mapping support in `rules_shell` v0.5.0 (2025-06-12), and `rules_python`'s own runfiles library gained it before its 2.0.0 release — both predate the flag's 9.0.0 flip, so the two are already in lockstep for any Bazel that defaults it on.
- `rules_ocx`'s launchers (`repo_utils.bzl`'s `rlocation_path()`/`render_lazy_launcher()`) always emit **already-canonical** rlocationpaths built from `Label.workspace_name`; the standard `rlocation()` call still probes the `_repo_mapping` file on every invocation (it cannot know in advance the path is canonical) but the lookup is architected to miss-and-fall-through, so the compact/wildcard encoding change is correctness-irrelevant for this ruleset either way.
- `Label.workspace_name` — the very API `rules_ocx` calls — is **deprecated**, gated behind `--incompatible_enable_deprecated_label_apis` (default **true**, held back from flipping by an open issue), with `Label.repo_name` as the identical, non-deprecated replacement; this is the same flag sitting commented-out in BCR's `incompatible_flags.yml` today.

## Answers

### Q1 — PROJECT.scl on Bazel 9.2

> On Bazel 9.2, does `PROJECT.scl` replace, supplement or coexist with `.bazelrc`'s per-target `--config` conventions — what is its file-discovery and precedence contract against the five-layer rc chain, and does any ruleset in the six-member shipped set consume it yet?

**Findings.**

*File-discovery contract.* `ProjectFilesLookupFunction` walks from a target's **package** upward through containing packages (skipping non-package directories) looking for a file named exactly `PROJECT_FILE_NAME = "PROJECT.scl"` in each, collecting every match it finds along the way ([source](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/skyframe/ProjectFilesLookupFunction.java#L35-L112)). `Project.getProjectFiles()` then keeps only the **innermost** match per target ([`Project.java:118-141`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/analysis/Project.java#L118-L141)). This is per-target, not per-invocation: `bazel build //a:x //b:y` can resolve to two different PROJECT.scl files, and Bazel reports that as a "multi-project build" rather than an error, unless the resolved flag sets actually conflict.

*What it declares.* A `PROJECT.scl` sets a top-level `project = {...}`. Two schemas coexist, parsed by the same [`ProjectFunction.java`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/skyframe/ProjectFunction.java):

```python
# Legacy dict schema (still parsed at 9.2.0)
project = {
    "configs": {"default": ["--compilation_mode=opt"], "debug": ["--compilation_mode=dbg"]},
    "default_config": "default",
    "active_directories": {"default": ["//foo/...", "//bar/..."]},
    "enforcement_policy": "strict",       # warn (default) | compatible | strict
    "always_allowed_configs": ["ci"],
}
```

```python
# Proto-struct schema (per src/test/shell/integration/flagset_test.sh)
load("//third_party/bazel/src/main/protobuf/project:project_proto.scl", "buildable_unit_pb2", "project_pb2")
project = project_pb2.Project.create(
    enforcement_policy = "warn",
    buildable_units = [
        buildable_unit_pb2.BuildableUnit.create(name="default", flags=[], is_default=True),
    ],
)
```
`ProjectFunction` accepts `buildable_units` (name, description, `is_default`, `target_patterns`, flags) or the legacy `configs`+`default_config` pair and normalizes both into the same internal `BuildableUnit` map ([:120-271](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/skyframe/ProjectFunction.java#L120-L271)). A file can instead alias another project via `project = {"actual": "//other:PROJECT.scl"}` ([worked example](https://github.com/bazelbuild/examples/blob/master/configurations/auto_configured_builds/alias/project_lib/PROJECT.scl)); such a file must define nothing else.

If `configs`/`buildable_units` is unset or empty, `FlagSetFunction.getSclConfig()` returns an **empty** flag set immediately — the file is present but inert for flag enforcement ([`FlagSetFunction.java:129-133`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/skyframe/config/FlagSetFunction.java#L129-L133)). This is the load-bearing fact that keeps `--enforce_project_configs=true` from breaking every build that happens to sit near an unrelated PROJECT.scl.

*Interaction with the five-layer rc chain and `--config=`.* This is the sharpest, most surprising result. `FlagSetFunction.expandConfigFlags()` in-place expands any `--config=foo` entry found *inside* a buildable unit's flag list, but only if that config's definition can be traced to a **global rc file** — and `GlobalRcUtils` defines that set as exactly two synthetic sources, "client" (direct command-line options) and "Invocation policy" ([`GlobalRcUtils.java`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/common/options/GlobalRcUtils.java)):

```java
/* No global RC files in Bazel, so no global configs. */
public static final ImmutableList<String> ALLOWED_GLOBAL_CONFIGS = ImmutableList.of();
private static final ImmutableList<String> GLOBAL_RC_FILES = ImmutableList.of("client", "Invocation policy");
```

So this — the naive-looking pattern below — **fails at analysis time**, on every one of the five ordinary rc layers (system `/etc/bazel.bazelrc`, workspace `.bazelrc`, `$HOME/.bazelrc`, `--bazelrc=`, or a `try-import`ed file):

```python
# INCORRECT: "ci" is defined in a committed .bazelrc, not a global rc file
project = {"configs": {"default": ["--config=ci"]}}
```
```
ERROR: --scl_config=default: --config=ci appears ...: can't set --config=ci because its
definition depends on <path>/.bazelrc which isn't a global rc file.
```
The fix is to spell the flags out directly inside the buildable unit, or to accept that `--config=` references only work when the config comes from an `InvocationPolicy` proto (an enterprise Bazel wrapper mechanism) or the literal command line. Separately, `validateNoExtraFlagsSet()` treats every option set via *any* of the five rc layers or the command line identically as "user options" that can conflict with the resolved config under `enforcement_policy = "compatible"/"strict"` — the five-layer precedence chain still decides *which value wins* for a given flag name before this check runs, but PROJECT.scl adds an orthogonal enforcement pass on top, not a change to that precedence order.

*Stability at 9.2.0.* Both flags are unchanged across every tagged release checked (8.7.0, 8.8.0, 9.0.0, 9.1.0, 9.2.0):

| Flag | Default | Tags |
|---|---|---|
| `--scl_config` | `null` (string) | `UNDOCUMENTED`, `EXPERIMENTAL` — help text literally says "still under development" |
| `--enforce_project_configs` | `true` | `UNDOCUMENTED`, `EXPERIMENTAL` |

Neither flag appears on the generated [`bazel.build/reference/command-line-reference`](https://bazel.build/reference/command-line-reference) page (fetched directly, zero hits for either name, or for `experimental_enable_scl_dialect`). There is no `bazel.build` prose page for PROJECT.scl at all; the closest thing to a design doc is the tracking issue [bazelbuild/bazel#24839](https://github.com/bazelbuild/bazel/issues/24839) ("Explain effort to encode project data... in version control next to build targets"), and the only worked examples live in [`bazelbuild/examples/configurations/auto_configured_builds`](https://github.com/bazelbuild/examples/blob/master/configurations/auto_configured_builds/README.md), whose own closing line is "This is an evolving feature." A Bazel Q1 2026 community-update post frames it as "Auto-configured builds," explicitly aimed at "a project dev, external contributor, library maintainer, IDE, AI agent, or CI system" ([bazel-blog](https://raw.githubusercontent.com/bazelbuild/bazel-blog/master/_posts/2026-04-08-bazel-q1-2026-community-update.md)) — this ruleset's stated audience literally includes the kind of agent this program is building for.

*Ruleset consumption.* `PROJECT.scl` returns **zero** grep hits in `aspect-build/rules_js`, `aspect-build/rules_ts`, `bazelbuild/rules_python`, `bazelbuild/rules_rust`, `bazelbuild/rules_cc`, and `bazel-contrib/rules_lint` (checked via GitHub code search against each repo, 2026-09-06). None of the six shipped-set rulesets reads or writes it.

**Answer.** At Bazel 9.2.0, `PROJECT.scl` **coexists with** `.bazelrc`'s `--config` mechanism rather than replacing it: it is a separate, per-target-resolved Starlark file that a build discovers by walking up the target's package path, and it can only reference an existing `--config=` name if that name is itself defined outside the ordinary five-layer rc chain (client or InvocationPolicy only) — otherwise it must spell flags out directly. `--enforce_project_configs` defaults true and `--scl_config` exists on every tag from 8.7.0 forward, but both remain `EXPERIMENTAL`/`UNDOCUMENTED` with no CLI-reference entry and no official prose docs, and the feature is a no-op for any target whose nearest PROJECT.scl declares no configs. None of rules_js, rules_ts, rules_python, rules_rust, rules_cc, or rules_lint consumes it as of 2026-09-06 — the map's earlier "not adopted yet" call (M-H-15) stands, now with a same-day zero-hit grep across all six repos as the settling evidence.

### Q2 — BCR's `incompatible_flags.yml` semantics

> Is `incompatible_flags.yml` a "not yet default" list or a regression-coverage list? Does BCR deliberately keep testing already-flipped flags under `last_green`/`rolling`, making the observed lag structural? Confirm with a second instance or refute.

**Findings.** BCR's own docs describe the mechanism unambiguously: "BCR presubmit tests new modules against these flags using Bazelisk's `--migrate` feature, providing module maintainers with early warnings... During presubmit jobs, flags matching the current Bazel version in use will be tested" ([`docs/README.md:174-199`](https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/docs/README.md)). The consumer code is a literal string-equality match, nothing more:

```python
# buildkite/bazel-central-registry/bcr_presubmit.py:495-501 (bazelbuild/continuous-integration)
for flag, versions in data["incompatible_flags"].items():
    if bazel_version in versions:
        incompatible_flags.append(flag)
```
This is a **forward-migration warning list keyed by channel string**, not a mechanism with any stated regression-coverage intent for already-flipped flags. There is no code path, comment, or doc sentence anywhere in `bazel-central-registry` or `continuous-integration` describing deliberate post-flip retesting.

The live file (fetched 2026-09-06) has 6 active entries plus 1 commented-out:

```yaml
"--incompatible_disable_native_repo_rules": [7.x, 8.x]        # flipped 9.0 — correctly absent from 9.x
"--incompatible_autoload_externally=":       [7.x, 8.x]        # flipped 9.0 — correctly absent from 9.x
"--incompatible_disable_autoloads_in_main_repo": [last_green, rolling]  # flipped 9.0 — STILL listed here
"--incompatible_strict_action_env":          [6.x, 7.x, 8.x]   # flips true only at 9.0 — correctly scoped
```
Two of the four flags already flipped in 9.0 (`disable_native_repo_rules`, `autoload_externally`) are scoped *correctly* — they list only the pre-flip numbered channels and are absent from `9.x`. Only **one** flag (`disable_autoloads_in_main_repo`) sits in the anomalous shape the earlier consolidation flagged. Checking BCR's full commit history for this file finds exactly four commits total, the last on **2025-07-25** ([commit list](https://api.github.com/repos/bazelbuild/bazel-central-registry/commits?path=incompatible_flags.yml)) — more than six months before Bazel 9.0.0 shipped (2026-01-20) and over 13 months before today. Nobody has touched the file across the entire 9.0 release. That is the more decisive evidence than the single anomalous entry: if BCR deliberately kept testing already-flipped flags as regression coverage, the two correctly-scoped entries above would need the same treatment and don't, and the file would show at least one commit reconciling entries against the new major. Instead it shows zero.

**Answer.** `incompatible_flags.yml` is, by BCR's own stated design and its consumer code, a **"not yet default" forward-migration-warning list**, not a regression-coverage list. The single `last_green`/`rolling` anomaly is not a second instance of a deliberate pattern — it is the file's own staleness (unmaintained since 2025-07-25, spanning the entire 9.0 release) showing through in the one place where the pre-9.0 scoping choice ("test on nightly channels ahead of the numbered release") happened to outlive the flip. The hypothesis that BCR deliberately re-tests already-flipped flags is **refuted**: the other three flipped-in-9.0 entries in the same file are scoped correctly (numbered channels only, no `9.x`), which would not be true under a deliberate policy of continued post-flip testing.

### Q3 — `--incompatible_use_new_cgroup_implementation`

> What does this flag change for linux-sandbox, what does it require from the host, what happens on GitHub-hosted runners and inside Docker, and how does a CI author verify which happened?

**Findings.** The flag (default true since 9.0.0; [`SandboxOptions.java:378-387`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/sandbox/SandboxOptions.java#L378-L387)) governs whether the sandbox uses `VirtualCgroupFactory`/`VirtualCgroup` (new) or the older memory-only `CgroupsInfo` path (old, `--experimental_sandbox_memory_limit_mb` only). Its own tracking issue is candid that this is a small change for most users: "for most users, this should be a NO-OP" unless `--experimental_sandbox_limits` or `--experimental_sandbox_enforce_resources_regexp` was already set ([bazelbuild/bazel#28244](https://github.com/bazelbuild/bazel/issues/28244)).

*What it changes.* The new implementation adds **CPU** limiting on top of memory (the old one "only supports the memory controller and ignores... `--experimental_sandbox_limits`" per the flag's own help text). It supports **both cgroup v1 and v2** — `VirtualCgroup.createRoot()` walks `/proc/self/mounts` and `/proc/self/cgroup` and builds `LegacyCpu`/`LegacyMemory` (v1) or `UnifiedCpu`/`UnifiedMemory` (v2) controllers depending on what it finds ([`VirtualCgroup.java:120-220`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/sandbox/cgroups/VirtualCgroup.java#L120-L220)) — so "requires cgroup v2" is not quite right; it requires *a* writable cgroup mount of either version. `LinuxSandboxCommandLineBuilder`'s own doc comment ("Requires cgroups v2 and systemd") is itself stale against this — a citable instance of the program's running pattern that official-looking doc comments drift from the code they annotate ([:212-215](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/sandbox/LinuxSandboxCommandLineBuilder.java#L212-L215)).

*The no-op case, precisely.* `VirtualCgroupFactory.create()` returns `VirtualCgroup.NULL` — creating nothing — whenever `!alwaysCreate && defaultLimits.isEmpty() && limits.isEmpty()` ([:56-58](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/sandbox/cgroups/VirtualCgroupFactory.java#L56-L58)), and `alwaysCreate` is hardcoded `false` at the one call site in `LinuxSandboxedSpawnRunner` ([:159-166](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/sandbox/LinuxSandboxedSpawnRunner.java#L159-L166)). **A build that never sets `--experimental_sandbox_limits` or `--experimental_sandbox_memory_limit_mb` never touches `/sys/fs/cgroup` at all**, on either implementation, on either major.

*Host requirement and failure mode.* When limits *are* requested, `VirtualCgroup.createRoot()` checks `cgroup.toFile().canWrite()` for each candidate mount; a non-writable directory is logged (`logger.atInfo()`, "Found non-writable cgroup v2 at %s") and simply skipped — memory/cpu stay `null` and the resulting `VirtualCgroup` degrades to "no controllers." `createInstance()` catches any `IOException` from the whole discovery the same way ("Failed to create root cgroup") and falls back to `NULL`. Every one of these paths returns normally; none throws, none produces a WARNING visible in default build output, and **the build still runs the action, just without the requested limit**. This is the direct answer to "fallback, error, or silently no limits": **silently no limits**, at INFO log level only (which lands in Bazel's own server log, not the terminal by default). For cgroup v2 specifically, there is an additional "no internal processes" wrinkle: if Bazel's own process cgroup already has member processes, it cannot host a non-empty child, so `createRoot()` walks up one level and creates a **sibling** cgroup instead ([:145-152](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/sandbox/cgroups/VirtualCgroup.java#L145-L152)) — this is why cgroup v2 delegation in a container needs a writable *parent*, not just a writable leaf.

*GitHub-hosted runners and Docker.* Neither is special-cased in source; both fall out of the writability check above. A plain `docker run` without `--cgroupns=host` and a delegated subtree, or a GitHub-hosted `ubuntu-latest` runner whose systemd session doesn't grant the invoking user a writable `/sys/fs/cgroup` slice, will hit the non-writable branch and silently run unlimited. This host (WSL2, confirmed cgroup v2 via `stat -fc %T /sys/fs/cgroup` → `cgroup2fs`, per [`sandbox-strategy-network-and-hermetic-sandbox-on-this-host.md:79-80`](../bazel-measurements/sandbox-strategy-network-and-hermetic-sandbox-on-this-host.md)) never actually exercised the *cgroup-writing* code path in that measurement wave — it confirmed cgroup v2 filesystem presence, not writability under the new implementation with limits set, which is a gap this dive fills rather than duplicates.

*Verification a CI author can run.* There is no `bazel info` line for this (`BlazeRuntime.getCgroupsInfo()` is set from `VirtualCgroup.getInstance().cgroupsInfo()` but has **zero external callers** — dead for this purpose as of 9.2.0). The one user-visible signal is the `linux-sandbox` command line itself: cgroup directories are passed as `-C <dir>` ([`LinuxSandboxCommandLineBuilder.java:302-304`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/sandbox/LinuxSandboxCommandLineBuilder.java#L302-L304)):

```
$ bazel build --sandbox_debug --subcommands --experimental_sandbox_limits=memory=512 //:t
# grep the printed linux-sandbox invocation for "-C "
# present  → cgroup created and writable, limit is live
# absent   → flag off, no limits requested, OR cgroup dir was non-writable (indistinguishable from the line alone)
```

**Answer.** `--incompatible_use_new_cgroup_implementation` extends the sandbox's cgroup use from memory-only to memory+CPU and works on cgroup v1 or v2, but for the overwhelmingly common case — no `--experimental_sandbox_limits`/`--experimental_sandbox_memory_limit_mb` set — it changes nothing observable, on 8.x or 9.x. When limits *are* requested, the flag requires a writable cgroup mount (v1 or v2) for the invoking user; any failure to get one — non-Linux, unwritable dir, missing delegation, a container without a granted subtree — degrades silently to "no limits, build succeeds," logged only at INFO. The only practical verification is grepping `--sandbox_debug --subcommands` output for `-C ` on the `linux-sandbox` line; there is no exit code or `bazel info` signal.

### Q4 — `--incompatible_compact_repo_mapping_manifest` and runfiles libraries

> What changed in the manifest encoding; which runfiles libraries parse it and at which versions; does a launcher-shaped ruleset like rules_ocx touch the repo-mapping manifest at all, or only rlocationpath?

**Findings.** The flag (false through 8.8.0, true from 9.0.0; confirmed by diffing `CoreOptions.java` across tags) changes how `RepoMappingManifestAction` writes the `<binary>.repo_mapping` file. Normally each row is `sourceCanonicalRepo,apparentName,targetCanonicalDir`. When a module extension generates many repos that all carry an **identical** `RepositoryMapping` instance (true by construction for extension-generated repos — same object reference, checked via `==`, not `.equals()`, for speed), consecutive same-prefix rows collapse into one, with the source field's last segment replaced by `*`:

```
# without compaction (one row per generated repo)
rules_python++python+python_3_11,python,rules_python++python+python_3_11
rules_python++python+python_3_12,python,rules_python++python+python_3_12
# with compaction (one row for the whole extension-generated family)
rules_python++python+*,python,rules_python++python+python_3_11
```
[`RepoMappingManifestAction.java:227-249`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/analysis/RepoMappingManifestAction.java#L227-L249). This is a pure size optimization (O(N·M)→O(M) for N repos sharing an M-entry mapping) with no semantic change to what gets resolved — but the **reading** side must understand the `*` wildcard, or it will simply never match the merged row.

*Reading side, and a surprise about where it lives.* Bazel's own canonical Bash runfiles library, historically at `tools/bash/runfiles/runfiles.bash` in the `bazelbuild/bazel` repo, was **removed from that path entirely** by commit [`b8b91e4f64`](https://github.com/bazelbuild/bazel/commit/b8b91e4f64) ("Move Bash runfiles libraries out of Bazel," Feb 2025): "The Bash libraries in `@bazel_tools` are replaced with aliases to `@rules_shell//shell/runfiles`." Confirmed by directory listing: the file exists at the `8.7.0` tag, is gone by `9.0.0` and `9.1.0`. The label `@bazel_tools//tools/bash/runfiles/runfiles.bash` — the exact rlocation path `rules_ocx`'s own `_RUNFILES_PREAMBLE` sources — still resolves at runtime, but via this alias, so the actual implementation an agent needs to read now lives in `bazelbuild/rules_shell`. That copy gained wildcard/compact-mapping support in [`rules_shell` v0.5.0](https://github.com/bazelbuild/rules_shell/releases/tag/v0.5.0) (2025-06-12, commit `c1d71d999`, "Work towards bazelbuild/bazel#26262" — the same tracking issue this flag cites):

```bash
# rules_shell/shell/runfiles/runfiles.bash — the wildcard match, added in v0.5.0
source_repo_prefix="$(echo -n "$source_repo" | sed 's/\(.*[^-a-zA-Z0-9_.]\)[-a-zA-Z0-9_.]\{1,\}/\1*/')"
escaped_pattern="\(^$(esc "$source_repo")\|^$(esc "$source_repo_prefix")\),$(esc "$target_apparent"),"
```
`rules_python`'s own Python runfiles library gained the identical support before its 2.0.0 release ([commit](https://github.com/bazelbuild/rules_python/commit/f2668295be), landed 2025-09-26; present at tags 2.0.0 through the fleet's pinned 2.3.3). Both landed well before Bazel 9.0.0 shipped (2026-01-20), so — for these two — the runfiles-library side and the flag's default-on side are already in lockstep for any Bazel version that actually defaults the flag true; there is no version window where a Bazel-9-default build pairs with a wildcard-blind reader of either library, *as long as `@bazel_tools`'s own bundled `rules_shell` pin is current*, which it is by construction (Bazel's own release ships the alias target). `aspect-build/rules_js` returns **zero** hits for `repo_mapping`/`compact_repo_mapping` in its source — its JS launcher resolves modules through pnpm's virtual store, not through Bazel's rlocation/repo-mapping mechanism at all, so this flag is simply inapplicable there.

*Does rules_ocx touch it?* `repo_utils.bzl`'s `rlocation_path()` builds the rlocationpath directly from `label.workspace_name` and `label.package`/`label.name` (`ocx/private/repo_utils.bzl:1125-1133`, read-only, local fleet source — not published) — and `Label.workspace_name` is documented as returning "the **canonical** name of the repository containing the target" ([`Label.java:512-519`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/cmdline/Label.java#L512-L519)). So every rlocationpath `rules_ocx` emits is already fully canonical. But the standard single-argument `rlocation()` call in `runfiles.bash` **cannot know that in advance**: it always attempts a repo-mapping lookup first whenever `RUNFILES_REPO_MAPPING` exists and the path has more than one segment, treating the first segment as an apparent name relative to the *calling script's own* repository ([`runfiles.bash:160-201`](https://github.com/bazelbuild/rules_shell/blob/main/shell/runfiles/runfiles.bash#L160-L201)). Looking up an already-canonical name as if it were apparent typically finds no row, and the function's designed fallback — "if `target_repo` is empty, use `$1` verbatim" — makes that miss functionally identical to a hit. Net result: `rules_ocx`'s launchers **do probe** the repo-mapping manifest file on every `rlocation()` call (a wasted grep, not zero I/O), but never depend on a match, so the compact/wildcard encoding is correctness-irrelevant to them either way, on either major.

*An adjacent, more concrete trap in the same code path.* `Label.workspace_name` — the exact field `rlocation_path()` reads — is itself **deprecated**: `enableOnlyWithFlag = BuildLanguageOptions.INCOMPATIBLE_ENABLE_DEPRECATED_LABEL_APIS`, default **true** at 9.2.0 ([`BuildLanguageOptions.java:733-740`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/packages/semantics/BuildLanguageOptions.java#L733-L740)), with `Label.repo_name` as the documented, identical, non-deprecated replacement ([`Label.java:529-535`](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/cmdline/Label.java#L529-L535)). This is the same `--incompatible_enable_deprecated_label_apis` sitting **commented out** in BCR's `incompatible_flags.yml` today, blocked on a still-open issue. `rules_ocx` (read-only per this program's constraints) is presently fine because the flag defaults true, but any *new* Starlark this program's rules recommend should use `.repo_name`, never `.workspace_name`.

**Answer.** `--incompatible_compact_repo_mapping_manifest` (default false ≤8.8.0, true ≥9.0.0) merges repo-mapping rows that share an identical mapping (chiefly module-extension-generated repo families) into one wildcarded row, purely to shrink the manifest file; it changes nothing else. The canonical Bash runfiles library moved out of Bazel core into `rules_shell` before 9.0 shipped and gained wildcard support at v0.5.0 (2025-06-12); `rules_python`'s own library gained it before its 2.0.0 tag — both predate the flag's default flip, so no live version-skew window exists for either. `rules_js` never reads the file at all. A launcher-shaped ruleset like `rules_ocx`, which always emits pre-canonicalized rlocationpaths, technically queries the repo-mapping manifest on every `rlocation()` call but is architecturally insulated from whichever encoding it uses, because a miss and a hit are handled identically by the reader's fallback path.

## Proposed revisions

| Rule ID | Change | Evidence | Confidence |
|---|---|---|---|
| NEW-1 | Add: a repo adopting `PROJECT.scl` must know `--enforce_project_configs` already defaults **true** at every Bazel ≥8.7.0 but is a no-op until a `PROJECT.scl` declares `configs`/`buildable_units`; treat "a PROJECT.scl exists with no configs" and "no PROJECT.scl at all" as behaviourally identical. Verification: `bazel build --enforce_project_configs //t; ` succeeds silently either way — the only signal is `INFO: Reading project settings from ...` appearing in build output when a *populated* file is in scope. Empty output (no such INFO line) means no enforcement is active for that target. | [FlagSetFunction.java:129-133](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/skyframe/config/FlagSetFunction.java#L129-L133), [BuildRequestOptions.java:468-481](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/buildtool/BuildRequestOptions.java#L468-L481) | measured |
| NEW-2 | Add: never write `--config=<name>` inside a `PROJECT.scl` buildable unit's `flags` list unless `<name>` is guaranteed to be defined via `InvocationPolicy` or the literal command line — any ordinary `.bazelrc`-defined config fails at analysis time with "isn't a global rc file." Verification: grep the buildable unit's flags for `--config=` and cross-check the referenced config's `build:<name>` line is not defined in any committed `.bazelrc`; a hit there is the finding. | [GlobalRcUtils.java](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/common/options/GlobalRcUtils.java), [FlagSetFunction.java:531-582](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/skyframe/config/FlagSetFunction.java#L531-L582) | measured |
| BZL-FLAG-07 | Amend rationale: cite BCR's `docs/README.md` "Testing incompatible flags" section as the primary source establishing the list's forward-migration-warning purpose, and add the 4-commits / last-touched-2025-07-25 fact as the reason the observed `last_green`/`rolling` lag is oversight, not policy — don't let a reader infer "BCR does this on purpose." | [BCR docs/README.md:174-199](https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/docs/README.md), [commit history](https://api.github.com/repos/bazelbuild/bazel-central-registry/commits?path=incompatible_flags.yml) | measured |
| NEW-3 | Add under BZL-FLAG-18/BZL-HERM: `--incompatible_use_new_cgroup_implementation` is a no-op absent `--experimental_sandbox_limits`/`--experimental_sandbox_memory_limit_mb`; when limits are set, a non-writable cgroup mount degrades silently to unlimited (INFO log only, build still exits 0). Never assume "flag defaults true on 9.x" implies resource limits are enforced — verify with `--sandbox_debug --subcommands \| grep -- '-C '`. Empty grep output means no limit is live (check separately whether one was even requested). | [VirtualCgroupFactory.java:56-91](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/sandbox/cgroups/VirtualCgroupFactory.java#L56-L91), [LinuxSandboxCommandLineBuilder.java:302-304](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/sandbox/LinuxSandboxCommandLineBuilder.java#L302-L304) | measured |
| BZL-HERM-27 | Note in passing (not a new finding, cross-reference only): `LinuxSandboxCommandLineBuilder.java`'s own doc comment for `setCgroupsDirs` says "Requires cgroups v2 and systemd," which is stale against `VirtualCgroup`'s v1+v2 support — an in-repo instance of the "official-looking source drifts from the code it annotates" pattern this program keeps finding. | [LinuxSandboxCommandLineBuilder.java:212-215](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/sandbox/LinuxSandboxCommandLineBuilder.java#L212-L215) | measured |
| NEW-4 | Add under BZL-LARK/BZL-MOD Starlark hygiene: never call `Label.workspace_name` in new Starlark; use `Label.repo_name`. `.workspace_name` is deprecated behind `--incompatible_enable_deprecated_label_apis` (default true, held back by an open bug). Verification: `grep -rn '\.workspace_name' **/*.bzl` (states generated-repo `.bzl` text is out of this grep's reach) — any hit outside a documented compatibility shim is the finding. | [Label.java:512-535](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/cmdline/Label.java#L512-L535), [BuildLanguageOptions.java:733-740](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/packages/semantics/BuildLanguageOptions.java#L733-L740) | measured |
| NEW-5 | Add: when tracing "where does the canonical Bash/C++ runfiles library live," check `bazelbuild/rules_shell` (bash, since Feb 2025) and the relevant per-language ruleset first, not only `bazelbuild/bazel` — core Bazel's own copies are aliases or gone. A reader who searches only `bazelbuild/bazel` and finds nothing should not conclude the mechanism was removed. | [commit b8b91e4f64](https://github.com/bazelbuild/bazel/commit/b8b91e4f64), directory listings at [8.7.0](https://github.com/bazelbuild/bazel/tree/8.7.0/tools/bash/runfiles) vs [9.2.0](https://github.com/bazelbuild/bazel/tree/9.2.0/tools/bash/runfiles) | measured |
| NEW-6 | Add for `bazel-diagnose`: a launcher/wrapper ruleset that builds its own rlocationpaths from an already-canonical repo name (e.g. via `Label.repo_name`/`.workspace_name`) is unaffected by `--incompatible_compact_repo_mapping_manifest` either way; don't spend diagnosis time on manifest-format skew for that shape of tool — look at the runfiles *directory/manifest* (rlocationpath→realpath) instead, which this flag never touches. | [RepoMappingManifestAction.java:227-249](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/analysis/RepoMappingManifestAction.java#L227-L249), rules_ocx `repo_utils.bzl:1125-1133` (read-only) | measured |

## AI-agent angle

- The single biggest trap: an agent reading `--enforce_project_configs`'s help text ("interactive builds may only pass `--scl_config`... may not use any other build flags") will assume this is live and breaking on every 9.x build. It isn't, almost always — check for a populated `PROJECT.scl` on the target's package path before treating this as relevant at all; the mechanical check is the `INFO: Reading project settings from ...` line, not the flag's default.
- An agent asked "does Bazel have a global rc file" from training data will answer yes (the five-layer chain is well-documented) and then misapply that to PROJECT.scl's `--config=` carve-out, which uses "global" in a narrower, code-defined sense (`GLOBAL_RC_FILES = ["client", "Invocation policy"]`) that excludes every actual `.bazelrc`. The mechanical check: `grep -n 'GLOBAL_RC_FILES' GlobalRcUtils.java` beats any prose description.
- An agent searching `bazelbuild/bazel` for `runfiles.bash` or a C++ runfiles implementation and finding nothing will confidently report "removed in Bazel 9" rather than "moved to rules_shell, aliased" — a directory-listing diff across two tags (`8.7.0` vs `9.2.0`) is the check that avoids this, not a single-tag grep.
- An agent recommending a cgroup-based CI memory cap will assume Bazel 9's default flip means limits are "just on now." Check for an explicit `--experimental_sandbox_limits`/`--experimental_sandbox_memory_limit_mb` in the actual `.bazelrc`/CI config before claiming any resource limit is enforced — the flag alone enforces nothing.

## Contested / evolving

- Whether PROJECT.scl will ever graduate out of `EXPERIMENTAL`/`UNDOCUMENTED` is openly unresolved upstream — the tracking issue is still accepting design feedback as of the Q1 2026 community post, and `bazel.build/reference/command-line-reference` has not been updated to list either flag.
- Whether BCR will ever prune the stale `last_green`/`rolling` entry, or whether more entries will accumulate the same way as more flags flip in 9.x with nobody circling back, is unresolved — the mechanism has no automated staleness check.

## Not settled

- Whether `rules_shell`'s C++ and Java runfiles-library equivalents underwent the same core-to-ruleset move as Bash, and if so, which repo and version now own them — `tools/cpp/runfiles/runfiles.h` still lives in `bazelbuild/bazel` at 9.2.0 but its `.cc` implementation was not found there either; this dive did not chase that thread to a primary source and it should not be asserted from inference alone.
- Whether any GitHub Actions runner image or common `docker run` invocation actually grants a writable cgroup v2 delegation by default in 2026 — this dive established the code-level behavior (silent degrade) but did not run a live measurement inside a GitHub-hosted runner or a plain container, only inferred from the writability check's existence. A live measurement (`--experimental_sandbox_limits=memory=1` + `--sandbox_debug --subcommands` inside an actual `ubuntu-latest` job and a plain `docker run`) would settle this directly.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [`ProjectFilesLookupFunction.java` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/skyframe/ProjectFilesLookupFunction.java) | Tagged Bazel source | 2026-09-06 fetch | The literal file-discovery contract for PROJECT.scl |
| [`Project.java` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/analysis/Project.java) | Tagged Bazel source | 2026-09-06 fetch | Per-target resolution, multi-project build handling, `applySclConfig` |
| [`ProjectValue.java` / `ProjectFunction.java` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/skyframe/ProjectFunction.java) | Tagged Bazel source | 2026-09-06 fetch | The two coexisting `PROJECT.scl` schemas, enforcement-policy enum |
| [`FlagSetFunction.java` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/skyframe/config/FlagSetFunction.java) | Tagged Bazel source | 2026-09-06 fetch | `--config=` global-rc carve-out, WARN/COMPATIBLE/STRICT enforcement |
| [`GlobalRcUtils.java` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/common/options/GlobalRcUtils.java) | Tagged Bazel source | 2026-09-06 fetch | Proves "global rc file" means only client+InvocationPolicy today |
| [`BuildRequestOptions.java` / `CoreOptions.java`, 8.7.0 and 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/buildtool/BuildRequestOptions.java) | Tagged Bazel source, diffed across tags | 2026-09-06 fetch | Confirms `--enforce_project_configs`/`--scl_config` defaults and EXPERIMENTAL/UNDOCUMENTED tags unchanged 8.7.0→9.2.0 |
| [bazel.build/reference/command-line-reference](https://bazel.build/reference/command-line-reference) | Generated official CLI reference | fetched 2026-09-06 | Confirms zero listing for `enforce_project_configs`, `scl_config`, `experimental_enable_scl_dialect` |
| [bazelbuild/bazel#24839](https://github.com/bazelbuild/bazel/issues/24839) | Feature-tracking issue, original author's design writeup | opened 2024, still open | Closest thing to a PROJECT.scl design doc |
| [bazelbuild/examples — auto_configured_builds](https://github.com/bazelbuild/examples/blob/master/configurations/auto_configured_builds/README.md) | Official worked examples repo | fetched 2026-09-06 | The only concrete warn/compatible/strict/alias/per-target examples with real output |
| [Bazel Q1 2026 community update](https://raw.githubusercontent.com/bazelbuild/bazel-blog/master/_posts/2026-04-08-bazel-q1-2026-community-update.md) | Official Bazel blog post | 2026-04-08 | Names "AI agent" explicitly as a stated audience for the feature |
| [`flagset_test.sh` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/test/shell/integration/flagset_test.sh) | Bazel's own integration test | 2026-09-06 fetch | Shows the proto-struct authoring syntax and real error-message text |
| [BCR `incompatible_flags.yml`](https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/incompatible_flags.yml) | Live BCR presubmit config | fetched 2026-09-06 | The actual tested-flag list and its channel scoping |
| [BCR `docs/README.md` § Testing incompatible flags](https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/docs/README.md) | BCR's own contributor docs | fetched 2026-09-06 | States the list's purpose in BCR's own words: forward migration warning via bazelisk `--migrate` |
| [`incompatible_flags.yml` commit history](https://api.github.com/repos/bazelbuild/bazel-central-registry/commits?path=incompatible_flags.yml) | GitHub commits API | fetched 2026-09-06 | Proves only 4 commits ever, last 2025-07-25 — the staleness evidence |
| [`bcr_presubmit.py`](https://raw.githubusercontent.com/bazelbuild/continuous-integration/master/buildkite/bazel-central-registry/bcr_presubmit.py) | BCR's presubmit consumer script | fetched 2026-09-06 | The literal string-match logic that reads the yaml file |
| [Bazel 9.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/9.0.0) | Official release notes, full body | 2026-01-20 | Cites both `--incompatible_use_new_cgroup_implementation` and `--incompatible_compact_repo_mapping_manifest` as flipped-in-9.0, with tracking-issue numbers |
| [bazelbuild/bazel#28244](https://github.com/bazelbuild/bazel/issues/28244) | The cgroups flag's own tracking issue | opened pre-9.0 | Author's own "should be a NO-OP for most users" framing |
| [`SandboxOptions.java` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/sandbox/SandboxOptions.java) | Tagged Bazel source | 2026-09-06 fetch | `--experimental_sandbox_limits`, `--experimental_sandbox_enforce_resources_regexp`, the flag's own help text |
| [`VirtualCgroup.java` / `VirtualCgroupFactory.java` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/sandbox/cgroups/VirtualCgroup.java) | Tagged Bazel source | 2026-09-06 fetch | The actual v1/v2 discovery, writability check, and silent-fallback logic |
| [`LinuxSandboxedSpawnRunner.java` / `LinuxSandboxCommandLineBuilder.java` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/sandbox/LinuxSandboxedSpawnRunner.java) | Tagged Bazel source | 2026-09-06 fetch | Where `alwaysCreate=false` is hardcoded, and the `-C` cgroup-dir CLI flag |
| [`RepoMappingManifestAction.java` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/analysis/RepoMappingManifestAction.java) | Tagged Bazel source | 2026-09-06 fetch | The actual compaction/wildcard-writing algorithm |
| [Bazel commit "Move Bash runfiles libraries out of Bazel"](https://github.com/bazelbuild/bazel/commit/b8b91e4f64) | Core Bazel commit | 2025-02-17 | The move to `rules_shell`, explained in the author's own words |
| [`rules_shell` v0.5.0 release / commit `c1d71d999`](https://github.com/bazelbuild/rules_shell/releases/tag/v0.5.0) | Ruleset release + commit | 2025-06-12 | First tagged version with compact-repo-mapping wildcard support |
| [`rules_shell/shell/runfiles/runfiles.bash`](https://raw.githubusercontent.com/bazelbuild/rules_shell/main/shell/runfiles/runfiles.bash) | Ruleset source | fetched 2026-09-06 | The actual wildcard-matching `rlocation()` implementation |
| [`rules_python` commit `f2668295be`](https://github.com/bazelbuild/rules_python/commit/f2668295be) | Ruleset commit | 2025-09-26 | rules_python's own compact-repo-mapping support, confirmed present at tags 2.0.0–2.3.3 |
| [`Label.java` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/cmdline/Label.java) | Tagged Bazel source | 2026-09-06 fetch | `.workspace_name` deprecation notice and `.repo_name` replacement, both in the doc string |
| [`BuildLanguageOptions.java` @ 9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/packages/semantics/BuildLanguageOptions.java) | Tagged Bazel source | 2026-09-06 fetch | `--incompatible_enable_deprecated_label_apis` default (true) and scope |
| `rules_ocx/ocx/private/repo_utils.bzl` (read-only, fleet repo) | Fleet Bazel source | current | `rlocation_path()`, `render_lazy_launcher()`, the actual `.workspace_name` call site |
| [`bazel-measurements/sandbox-strategy-network-and-hermetic-sandbox-on-this-host.md`](../bazel-measurements/sandbox-strategy-network-and-hermetic-sandbox-on-this-host.md) | This program's own measurement wave | 2026-09-05 | Confirms cgroup v2 filesystem presence on this WSL2 host; the gap this dive fills is writability-under-limits, not presence |
| [`bazel-flags-and-versions.md`](../bazel-flags-and-versions.md) | This program's own consolidation | 2026-09-05 | The commissioning document and its Open Questions section |

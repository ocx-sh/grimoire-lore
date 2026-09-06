---
title: Module file and lockfile hygiene
topic: module-file-and-lockfile-hygiene
group: bazel-bzlmod-and-repo-rules
family: BZL-MOD
agent: sonnet
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 23
primary_sources_count: 17
settles: [M-B-01, M-B-02, M-B-03, M-B-04, M-B-12, M-B-13, M-B-16, M-B-17, M-B-18]
scope: |
  Covers MODULE.bazel directives and hygiene (bazel_dep, dev_dependency, overrides,
  compatibility_level), the MODULE.bazel.lock format and its version field, the four
  --lockfile_mode values, bazel mod subcommands (including two undocumented ones),
  bazel mod tidy, and VENDOR.bazel / --vendor_dir as it interacts with the lockfile.
  Does NOT cover module extension purity/reproducible or the repo-contents cache
  (owned by module-extension-purity-and-repo-contents-cache) or repository-rule
  hermeticity/BCR presubmit mechanics beyond compatibility_level
  (owned by repository-rule-hermeticity-and-bcr).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [MODULE.bazel: directives and the dev_dependency boundary](#1-modulebazel-directives-and-the-dev_dependency-boundary)
   2. [Version resolution and the single_version_override hard error](#2-version-resolution-and-the-single_version_override-hard-error)
   3. [compatibility_level: a resolver no-op that a registry still enforces](#3-compatibility_level-a-resolver-no-op-that-a-registry-still-enforces)
   4. [The lockfile: what it contains and why](#4-the-lockfile-what-it-contains-and-why)
   5. [--lockfile_mode: the four values](#5---lockfile_mode-the-four-values)
   6. [The lockfile version number: the surprise, confirmed three ways](#6-the-lockfile-version-number-the-surprise-confirmed-three-ways)
   7. [What a version mismatch actually does](#7-what-a-version-mismatch-actually-does)
   8. [Merge conflicts: the safe fields, the reset procedure, the merge driver](#8-merge-conflicts-the-safe-fields-the-reset-procedure-the-merge-driver)
   9. [bazel mod: the documented six and the undocumented two](#9-bazel-mod-the-documented-six-and-the-undocumented-two)
   10. [bazel mod tidy: what it rewrites, and why "unattended" needs a diff gate](#10-bazel-mod-tidy-what-it-rewrites-and-why-unattended-needs-a-diff-gate)
   11. [Vendor mode and VENDOR.bazel: what --vendor_dir actually delivers](#11-vendor-mode-and-vendorbazel-what---vendor_dir-actually-delivers)
3. [Decisions](#decisions)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Fleet evidence](#fleet-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Commit `MODULE.bazel.lock`. The docs recommend it explicitly, and `rules_ocx` already does — the failure mode without it is a re-resolution on every checkout, not a security gap.
- No source may cite a `MODULE.bazel.lock` schema version number. Measured triple mismatch: docs say `10`, `rules_ocx`'s committed lock says `24`, current `bazelbuild/bazel` master source says `28` (`LOCK_FILE_VERSION = 28` at `BazelLockFileValue.java:50`).
- A lockfile version mismatch is not "wrong," it is "absent": every mode except `error` silently discards the file's contents (`EMPTY_LOCKFILE`) and re-resolves from scratch with no warning; `error` mode alone raises a named, actionable error.
- `--lockfile_mode` has exactly four values — `update` (default), `refresh`, `error`, `off` — and none of them is called `strict` or `check`; an agent that invents a fifth is hallucinating.
- Run CI's freshness gate as `bazel mod deps --lockfile_mode=error` (or any bzlmod-touching command with that flag). It is the only mode that both fails loudly on a stale lock and performs zero network requests, so it never masks a real bug as network flake.
- Only `registryFileHashes` and `selectedYankedVersions` are safe to hand-merge in a `MODULE.bazel.lock` conflict; every other field (`moduleExtensions`, `bzlTransitiveDigest`, `usagesDigest`, `generatedRepoSpecs`) must be regenerated, never hand-resolved.
- The documented fix for a real lockfile conflict is `git reset MODULE.bazel.lock && git checkout MODULE.bazel.lock`, then fix `MODULE.bazel`, then run `bazel mod deps` — never a line-by-line JSON merge.
- `rules_ocx`'s own `.gitattributes:5` sets `MODULE.bazel.lock merge=union` — a generic, JSON-unaware git driver, not Bazel's own `bazel-lockfile-merge` jq driver. This can silently duplicate a changed digest key with no conflict markers at all, which is worse than a visible conflict.
- `bazel mod` documents six subcommands (`graph`, `deps`, `all_paths`, `path`, `explain`, `show_repo`, `show_extension`) on its own reference page; `tidy` and `dump_repo_mapping` are real, live subcommands (confirmed from the CLI's own embedded help text, `mod.txt`) that are missing from that page.
- `bazel mod tidy` formats `MODULE.bazel` and rewrites its `use_repo()` calls. It ships with no `--check`/dry-run flag, so "safe unattended" means "gated behind a diff check," never "run and auto-commit."
- `single_version_override` pinning a module below its `bazel_dep` requirement was silently accepted through Bazel 8; as of the change that shipped in Bazel 9.0.0 it is a hard resolution error with a named message.
- `compatibility_level` is a documented no-op in the Bazel *resolver* since 8.6.0/9.1.0, but the Bazel Central Registry's presubmit still diffs it against the previous version and blocks a PR unless the bump is acknowledged with `@bazel-io skip_check compatibility_level`.
- Mark every dev-only `bazel_dep` (test/lint/doc tooling) as `dev_dependency = True`; it is dropped for any consumer where your module isn't the root, per the attribute's own doc text.
- `--vendor_dir` does not deliver a network-free build on a fresh machine by default: two open upstream issues show Bazel-internal repos and output-user-root state escaping vendoring, and (pre-9.2.0) `bazel mod tidy`'s own `buildozer` dependency escaped it too.
- `VENDOR.bazel`'s `pin()` freezes a repo with no staleness signal at all — Bazel will not update it and will not warn that it is stale, by design.
- Pin the Bazel version via a committed `.bazelversion` (`rules_ocx` does: `8.7.0`) — the lockfile's own docs warn it changes "even between backward-compatible Bazel releases," so an unpinned team manufactures lockfile churn that looks like a real conflict.

## Findings

### 1. MODULE.bazel: directives and the dev_dependency boundary

A module's manifest is a `MODULE.bazel` file at the repo root declaring `module()`, `bazel_dep()` entries, and optional overrides ([bazel.build/external/module](https://bazel.build/external/module)). The attribute reference for `bazel_dep()` and `module()` ([bazel.build/rules/lib/globals/module](https://bazel.build/rules/lib/globals/module)):

| Directive | Attribute | Type | Default | Doc text (verbatim) |
|---|---|---|---|---|
| `bazel_dep` | `name` | string | required | — |
| `bazel_dep` | `version` | string | `''` | The version of the module to be added as a direct dependency. |
| `bazel_dep` | `repo_name` | string or None | `''` | The name of the external repo representing this dependency. |
| `bazel_dep` | `dev_dependency` | bool | `False` | "If true, this dependency will be ignored if the current module is not the root module or `--ignore_dev_dependency` is enabled." |
| `bazel_dep` | `max_compatibility_level` | int | `-1` | "Deprecated. This is now a no-op and has no effect." |
| `module` | `compatibility_level` | int | `-1` | "Deprecated. This is now a no-op and has no effect." |

`dev_dependency = True` is the correct, mechanical way to keep a module's own test/lint/doc tooling out of every consumer's resolved graph — a published module without it leaks its dev toolchain downstream. `rules_ocx/MODULE.bazel:16-18` marks exactly its three dev-only deps this way (§Fleet evidence).

### 2. Version resolution and the single_version_override hard error

Bazel resolves versions with Minimal Version Selection (MVS, from the Go module system): "MVS assumes that all new versions of a module are backwards compatible, and so picks the highest version specified by any dependent" ([bazel.build/external/module#version-selection](https://bazel.build/external/module#version-selection)). `single_version_override(module_name=, version=)` pins a module regardless of what the graph would otherwise select.

**The surprise, confirmed at the source level.** The map's wave-1 scouting flagged that a `single_version_override` pinning *below* a live `bazel_dep` requirement used to be silently accepted. The commit that changed this is public:

- Commit [`2f296f083c`](https://github.com/bazelbuild/bazel/commit/2f296f083c) (2025-09-12), "Fail if `single_version_override` version is lower than dep spec," closing [bazelbuild/bazel#26968](https://github.com/bazelbuild/bazel/pull/26968). PR body, verbatim: *"Previously, the `bazel_dep` requirement was silently ignored."*
- Exact error string, from `ModuleFileFunction.java:597-598`: `"module '%s' is overridden to use version '%s', which is lower than the version '%s' requested by the root module"`.
- Confirmed shipped in the [Bazel 9.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/9.0.0), line: *"**[Incompatible]** A `single_version_override` that pins a module to a lower version than requested in a `bazel_dep` for that module now results in an error instead of silently ignoring the `bazel_dep` version requirement."*

```python
# Bazel 8.x: builds fine, silently uses 1.0.0 for rules_foo everywhere.
# Bazel 9.0+: hard BAD_MODULE error at resolution time.
bazel_dep(name = "rules_foo", version = "2.0.0")
single_version_override(module_name = "rules_foo", version = "1.0.0")
```

No `--incompatible_*` flag gates this — it is a bug fix framed as `RELNOTES[INC]`, not a migration-window feature flip, so there is nothing to grep for in advance except the pattern itself.

### 3. compatibility_level: a resolver no-op that a registry still enforces

The Bzlmod FAQ is blunt: "You should stop using `compatibility_level`. … starting with Bazel 8.6.0 and 9.1.0, both `compatibility_level` and `max_compatibility_level` are no-ops" ([bazel.build/external/faq#compatibility-level](https://bazel.build/external/faq#compatibility-level)), and the attribute reference now carries the same text directly on the field (§1 above). That is the *resolver's* position.

The **registry's** position disagrees. The Bazel Central Registry's own contribution docs, verbatim: *"Verify the `compatibility_level` in `MODULE.bazel` matches the previous version. If the bump is intentional, comment `@bazel-io skip_check compatibility_level` in the PR to skip this optional check"* ([bazelbuild/bazel-central-registry `docs/README.md`](https://github.com/bazelbuild/bazel-central-registry/blob/main/docs/README.md)), and `tools/bcr_validation.py` implements the same check with the same skip phrase. So a module published to the BCR must keep the field internally consistent to pass presubmit, while getting zero resolution behavior from it on Bazel 8.6+/9.1+. Reading "it's a no-op" as "delete it" fails the next BCR submission.

### 4. The lockfile: what it contains and why

`MODULE.bazel.lock` is generated at the workspace root after module resolution and extension evaluation, and "promotes reproducible builds" by capturing "the result of module resolution and extension evaluation" ([bazel.build/external/lockfile](https://bazel.build/external/lockfile)). It has two parts:

1. `registryFileHashes` — hashes of every registry file consulted during resolution, including explicit `"not found"` entries for registries that were checked and came up empty (needed because a lower-precedence registry might still have the module).
2. Per extension, `bzlTransitiveDigest` (hash of the extension's implementation and everything it transitively loads) + `usagesDigest` (hash of how the extension is invoked, i.e. all its tags) + the resulting `generatedRepoSpecs` — this pair is *how* Bazel decides whether to re-run an extension at all.

A `selectedYankedVersions` map records any yanked version the build actually used (only non-empty when `--allow_yanked_versions` was needed). A module extension can opt out of lockfile inclusion entirely by returning `reproducible = True` metadata — that mechanism, and its verification, is owned by the sibling `module-extension-purity-and-repo-contents-cache` dive; `rules_ocx`'s own extension does this (§Fleet evidence).

Bazel also keeps a second, *hidden* lockfile at `$(bazel info output_base)/MODULE.bazel.lock` whose "format and contents ... are explicitly unspecified" and which exists purely as a performance cache — deleting it is never required for correctness and "any need to do so is a bug in either Bazel itself or a module extension" (same source). Never treat the hidden lockfile as something to inspect, commit, or reason about.

### 5. --lockfile_mode: the four values

From the command-line reference and the lockfile doc (identical wording), and confirmed as the current default via [bazel.build/reference/command-line-reference](https://bazel.build/reference/command-line-reference):

| Value | Default? | Behavior (verbatim, condensed) | Network during resolution? | Rewrites the lock? |
|---|---|---|---|---|
| `update` | **yes** | Uses cached info to skip known-good downloads/re-evaluations; adds missing info; avoids refreshing mutable info (yanked versions) for unchanged deps. | Only for missing/changed info | Yes |
| `refresh` | no | Like `update`, but mutable information (yanked versions, previously-missing modules) is *always* refreshed on mode switch and roughly hourly thereafter. | Yes, periodically | Yes |
| `error` | no | Like `update`, but fails if anything consulted is missing or out of date. "This mode never changes the lockfile or performs network requests during resolution." Reproducible extensions may still make network requests. | **No** | **No** |
| `off` | no | Lockfile neither checked nor updated. | Always (full resolution) | No |

```
# .bazelrc — the shape this dive settled on:
build --lockfile_mode=update           # developer default; implicit already

# .bazelrc.ci (or a CI-only flag)
build:freshness --lockfile_mode=error  # dedicated freshness job; never touches network

# scheduled/canary job
build:canary --lockfile_mode=refresh   # catches yanked-version / mutable drift
```

### 6. The lockfile version number: the surprise, confirmed three ways

The wave-1 map already flagged a discrepancy: the rendered docs' example JSON shows `"lockFileVersion": 10`; `rules_ocx`'s committed, Bazel-8.7.0-produced lock reads `24`. Fetching the actual current constant from `bazelbuild/bazel` `master` adds a *third* number:

```
$ grep -n LOCK_FILE_VERSION BazelLockFileValue.java
50:  public static final int LOCK_FILE_VERSION = 28;
```
([`src/main/java/com/google/devtools/build/lib/bazel/bzlmod/BazelLockFileValue.java`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/bazel/bzlmod/BazelLockFileValue.java))

Docs say 10. `rules_ocx` (Bazel 8.7.0) says 24. Current `master` says 28. All three are "correct" for their own vantage point and none is safe to write into a rule. The verification is unconditional: `python3 -c "import json;print(json.load(open('MODULE.bazel.lock'))['lockFileVersion'])"` against the file actually in hand.

A companion surprise from the same file: current `master`'s schema carries a top-level `facts` / `factsVersions` pair (empty in `rules_ocx`'s lock) that neither the rendered docs' example nor `rules_ocx`'s own committed schema-era documents — "Per-extension perpetually true facts that are passed to extensions at evaluation time without any invalidation" (source comment, same file, lines 136-154), discarded whenever an extension's declared `factsVersion` changes. This is further, independent confirmation that the lockfile's *shape*, not just its version number, moves under documentation's feet — the same operational rule applies: read the file, never the docs, for what fields exist.

### 7. What a version mismatch actually does

`BazelLockFileFunction.getLockfileValue` ([source](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/bazel/bzlmod/BazelLockFileFunction.java)) reads the lockfile's version with a regex before even attempting a full parse:

```java
private static final Pattern LOCKFILE_VERSION_PATTERN =
    Pattern.compile("\"lockFileVersion\":\\s*(\\d+)");
...
if (version == BazelLockFileValue.LOCK_FILE_VERSION) {
  // parse normally
} else {
  // This is an old version, its information can't be used.
  if (lockfileMode == LockfileMode.ERROR) {
    throw ... "The version of MODULE.bazel.lock is not supported by this version of Bazel."
             + " Please run `bazel mod deps --lockfile_mode=update` to update your lockfile."
  }
  return BazelLockFileValue.EMPTY_LOCKFILE;
}
```

So a version mismatch is treated as **"the lockfile does not exist,"** not "the lockfile is wrong": in `update`/`refresh`/`off` mode Bazel silently discards every field and re-resolves from scratch, then (in `update`/`refresh`) rewrites the file with no warning printed anywhere in this path. Only `error` mode surfaces it, with the exact actionable command named in the error text itself. This is the concrete mechanism behind the map's framing "a version mismatch makes an old lock unreadable" — it is not a partial read, it is a full discard.

The same function also detects an unresolved git merge textually, independent of JSON validity:

```java
private static final Pattern POSSIBLE_MERGE_CONFLICT_PATTERN =
    Pattern.compile("<<<<<<<|=======|" + Pattern.quote("|||||||") + "|>>>>>>>");
```

When a parse failure's message matches, Bazel appends: *"This looks like a merge conflict. See https://bazel.build/external/lockfile#merge-conflicts for advice."* — otherwise it appends *"Try deleting it and rerun the build."* A generic line-based git merge driver that "resolves" a conflict without ever emitting `<<<<<<<` markers (§8) bypasses this friendly message entirely, because nothing ever looked like a conflict to Bazel.

### 8. Merge conflicts: the safe fields, the reset procedure, the merge driver

Per [bazel.build/external/lockfile#merge-conflicts](https://bazel.build/external/lockfile#merge-conflicts):

- **Safe to hand-resolve**: conflicts confined to `registryFileHashes` and `selectedYankedVersions` — "can be safely resolved by keeping all the entries from both sides of the conflict."
- **Everything else** (in practice: `moduleExtensions`, `bzlTransitiveDigest`, `usagesDigest`, `generatedRepoSpecs`): "should not be resolved manually." The documented procedure, verbatim steps:
  1. `git reset MODULE.bazel.lock && git checkout MODULE.bazel.lock`
  2. Resolve any conflicts in `MODULE.bazel` (the human-authored file).
  3. `bazel mod deps` — regenerates the lock from the now-resolved `MODULE.bazel`.
- **Automatic path**: Bazel ships a real git merge driver, `bazel-lockfile-merge`, backed by a jq script at [`scripts/bazel-lockfile-merge.jq`](https://raw.githubusercontent.com/bazelbuild/bazel/master/scripts/bazel-lockfile-merge.jq) in the Bazel repo itself. Setup is two steps: a `.gitattributes` line (`MODULE.bazel.lock merge=bazel-lockfile-merge`) plus a one-time `git config --global merge.bazel-lockfile-merge.driver "jq -s '<script>' -- %O %A %B > %A.jq_tmp && mv %A.jq_tmp %A"`.

Practitioner corpus (secondary, not used for any current-behavior claim above) shows what happens when teams skip both: three converging GitHub issues — [#20272](https://github.com/bazelbuild/bazel/issues/20272), [#20369](https://github.com/bazelbuild/bazel/issues/20369), [rules_python#2434](https://github.com/bazelbuild/rules_python/issues/2434) — describe `moduleFileHash`-style churn on "essentially any dependency edit," with teams falling back to "delete and recreate the lockfile" as the path of least resistance. That escape hatch is more destructive than it looks: it re-resolves the *entire* graph, not just the conflicting module, and can silently pick up newer versions of unrelated dependencies as a side effect.

### 9. bazel mod: the documented six and the undocumented two

`bazel mod`'s own reference page ([bazel.build/external/mod-command](https://bazel.build/external/mod-command)) lists six subcommands: `graph`, `deps`, `all_paths`, `path`, `explain`, `show_repo`, `show_extension` (seven, counting both `show_*`). Fetching the raw doc source both from the legacy tree (`site/en/external/mod-command.md`) and the newer `docs/external/mod-command.mdx` shows the identical subcommand list in both — the gap is not a rendering bug, it is absent from both source trees.

The CLI's own embedded help text tells a different story. `bazel help mod`'s usage string is baked into [`src/main/java/com/google/devtools/build/lib/bazel/commands/mod.txt`](https://raw.githubusercontent.com/bazelbuild/bazel/master/src/main/java/com/google/devtools/build/lib/bazel/commands/mod.txt) and lists **eight** subcommands — the same seven plus:

```
Usage: %{product} %{command} [<option> ...] tidy|<query_type> [<args> ...]

When invoked as %{product} %{command} tidy, the command will format the
MODULE.bazel file and update all use_repo calls for supported module
extensions. Only works when bzlmod is enabled via --enable_bzlmod.
...
    - dump_repo_mapping <canonical_repo_name>...: Prints the mappings from
      apparent repo names to canonical repo names for the given repos in
      NDJSON format ... intended for use by tools such as IDEs and Starlark
      language servers.
```

`dump_repo_mapping` is also referenced, in passing, from the *module* doc's own repository-names section — "use the `bazel mod dump_repo_mapping` command to get the mapping from apparent names to canonical names" ([bazel.build/external/module#repository-names-and-strict-deps](https://bazel.build/external/module#repository-names-and-strict-deps)) — so the command page's own sibling doc assumes a subcommand the command page itself never lists. Both gaps are corroborated in the wild by real usage in a filed bug ([bazelbuild/bazel#28601](https://github.com/bazelbuild/bazel/issues/28601), which runs `bazel mod dump_repo_mapping ''` against a real repo).

`show_repo` output as of the current docs (post-9.0) supports `--all_repos` and `--all_visible_repos`, and three output modes: `text` (default, Starlark), `streamed_proto`, `streamed_jsonproto`. `graph`/`deps`/`all_paths`/`path`/`explain` share `--from`, `--verbose`, `--include_unused`, `--extension_info {hidden|usages|repos|all}`, `--depth` (default 1 for `explain`, 2 for `deps`, infinite otherwise), and `--output {text|json|graph}` (the last pipeable straight into `dot -Tsvg`).

### 10. bazel mod tidy: what it rewrites, and why "unattended" needs a diff gate

Per the CLI's own help text (§9): `tidy` "will format the `MODULE.bazel` file and update all `use_repo` calls for supported module extensions." The lockfile doc adds the mechanism: an extension's optional `moduleExtensionMetadata` field "contains metadata provided by the extension such as whether certain repositories it created should be imported via `use_repo` by the root module. This information powers the `bazel mod tidy` command" ([bazel.build/external/lockfile#module-extensions](https://bazel.build/external/lockfile#module-extensions)).

There is no `--check` or dry-run flag on `tidy` (confirmed absent from [`ModOptions.java`](https://raw.githubusercontent.com/bazelbuild/bazel/master/src/main/java/com/google/devtools/build/lib/bazel/bzlmod/modcommand/ModOptions.java)) — it either rewrites `MODULE.bazel` in place or it does nothing, with no third "tell me what you'd change" mode. That makes "is `bazel mod tidy` safe to run unattended" a question with a mechanical answer: only if something outside the command itself gates the diff, the same pattern buildifier's own `mode=diff` uses for BUILD files.

```bash
# Safe unattended pattern — a rewrite gated on an empty diff:
bazel mod tidy
git diff --exit-code MODULE.bazel   # nonzero = tidy changed something; needs review
```

### 11. Vendor mode and VENDOR.bazel: what --vendor_dir actually delivers

`bazel vendor --vendor_dir=<dir>` copies fetched repo directories (plus registry files, into `<vendor_dir>/_registries`) out of the output base and into a directory meant to be checked in; `bazel build --vendor_dir=<dir>` then prefers that copy over the network ([bazel.build/external/vendor](https://bazel.build/external/vendor)). `VENDOR.bazel`, placed under the vendor directory, accepts two directives, both over canonical repo names:

- `ignore("@@name+")` — exclude a repo from vendor commands entirely.
- `pin("@@name+")` — freeze a repo "as if there is a `--override_repository` flag for this repo. Bazel will **NOT** update the vendored source for this repo while running the vendor command unless it's unpinned." There is no error, warning, or staleness indicator on the pinned path — by design, the user is assumed to be maintaining it by hand.

Two open upstream issues undercut the "offline build" promise as stated:

- [#23243](https://github.com/bazelbuild/bazel/issues/23243) (open) — a fully vendored build still fails once the local output-user-root cache (`~/.cache/bazel/_bazel_$USER`) is removed, with errors resolving `@local_config_platform`/`@bazel_tools`-adjacent repos.
- [#26806](https://github.com/bazelbuild/bazel/issues/26806) (open) — reproduces the same gap minimally: a vendored, network-blocked build succeeds *until* the output user root is deleted, at which point Bazel tries to fetch again.

A third, [#29222](https://github.com/bazelbuild/bazel/issues/29222) ("`bazel vendor //...` does not capture `bazel mod tidy` deps," closed), shows `mod tidy`'s implicit `buildozer` dependency escaping vendoring by default — `ERROR: ... Vendored repository buildozer+ not found under the vendor directory and fetching is disabled`. This one **is fixed**, in [#29449](https://github.com/bazelbuild/bazel/issues/29449), landing the documented mitigation now present in the vendor docs verbatim: *"Some Bazel subcommands (such as `bazel mod tidy`) have implicit tool dependencies ... not included by `bazel vendor //...`. To vendor those tools as well, add the `@bazel_tools//tools:tools_for_bazel_subcommands` filegroup"* — shipped in **Bazel 9.2.0**, the current Active LTS. Anyone on Bazel 8.x (Maintenance, includes `rules_ocx`'s 8.7.0 pin) or an earlier 9.x still has the gap.

## Decisions

**Freshness verification for CI.** There is none in the fleet today (confirmed independently: `grep -rn "bazel mod\|lockfile_mode"` across every `.yml`/`.yaml`/Taskfile in `rules_ocx` returns nothing). **Decision: add a CI step running `bazel mod deps --lockfile_mode=error`** (or fold `--lockfile_mode=error` into an existing bzlmod-touching command in one CI leg). Evidence: `error` mode is the only one of the four that both fails loudly on drift and performs zero network requests during resolution (§5) — it cannot be defeated by network flake masking a real staleness bug. Assumption named: this changes CI's failure surface from "silent lockfile rewrite nobody reviews" to "a named, explained red build," which is a net gain even though it adds one more way CI can go red.

**Whether the lockfile is committed.** **Decision: yes**, matching both the docs' explicit recommendation and `rules_ocx`'s existing practice. Evidence: `bazel.build/external/lockfile`'s Best Practices section states it outright; the map's own contested corpus (`fail §2`) shows what teams who don't commit it end up doing instead (repeated full re-resolution, or a `.gitignore` workaround the docs never endorse). Assumption named: single-registry, BCR-only dependency graphs (like `rules_ocx`'s, §Fleet evidence) have a materially lower merge-conflict surface than a multi-registry monorepo, so this decision does not by itself resolve the churn concern the map flags as contested (M-B-04, P1) for a large polyglot adopter — that repo additionally needs the merge driver (§8) or a scheduled regen job.

**The exact instruction for a conflicted lockfile.** **Decision, stated as the agent-facing rule:** if the conflict is confined to `registryFileHashes` and/or `selectedYankedVersions`, keep both sides' entries. For any other conflict — which in practice means most of them, since `bzlTransitiveDigest`/`usagesDigest` change on nearly any dependency edit — run `git reset MODULE.bazel.lock && git checkout MODULE.bazel.lock`, resolve `MODULE.bazel` itself, then run `bazel mod deps` and commit the regenerated lock. Never hand-type a value into `moduleExtensions`. Evidence: this is Bazel's own documented procedure verbatim (§8), and it is the only procedure that doesn't require the agent to understand what a digest field means to safely touch it.

## Normative guidance candidates

1. **Commit `MODULE.bazel.lock` to version control.**
   Rationale: an uncommitted lock forces full re-resolution on every checkout and hides drift between machines.
   Verify: `git ls-files MODULE.bazel.lock`. Empty output = FINDING (untracked).
   Severity: MUST. Bazel 7/8/9. Settles: M-B-04.

2. **Never hand-edit `moduleExtensions`, `bzlTransitiveDigest`, `usagesDigest`, or `generatedRepoSpecs` inside `MODULE.bazel.lock`, including to resolve a merge conflict.**
   Rationale: these are opaque, extension-computed digests; a value that merely parses as JSON will desync silently from what actually produced it, and Bazel trusts it until the next `update` run touches that extension.
   Verify: reading heuristic — any diff to those keys not immediately preceded by a `bazel mod deps` / build invocation in the same change is a finding. No grep is possible (the fields are opaque hashes).
   Severity: MUST. Bazel 7/8/9. Settles: M-B-03.

3. **On a real `MODULE.bazel.lock` conflict, hand-merge only `registryFileHashes`/`selectedYankedVersions`; for everything else, reset-and-regenerate.**
   Rationale: this is Bazel's own documented procedure and the only one that doesn't require understanding digest semantics.
   Verify: named reading heuristic — the exact three-step sequence at [bazel.build/external/lockfile#manual-resolution](https://bazel.build/external/lockfile#manual-resolution) (`git reset` + `git checkout`, fix `MODULE.bazel`, `bazel mod deps`).
   Severity: MUST. Bazel 7/8/9. Settles: M-B-03.

4. **Install Bazel's own `bazel-lockfile-merge` jq merge driver; never leave `MODULE.bazel.lock`'s merge strategy as a generic line-based driver (e.g. git's built-in `union`).**
   Rationale: a JSON-unaware driver can duplicate a changed digest key across both sides of a conflict with zero visible conflict markers — worse than a real conflict, because Bazel's own merge-conflict detection (§7) never triggers and no human is ever prompted to look.
   Verify: `git check-attr merge MODULE.bazel.lock` must report `bazel-lockfile-merge`. Any other value (including `union`, or unset) = FINDING.
   Severity: MUST. Bazel 7/8/9. Settles: M-B-03. (`rules_ocx` currently fails this check — §Fleet evidence.)

5. **Run a dedicated CI step with `--lockfile_mode=error` on at least one bzlmod-touching command.**
   Rationale: the only mode that fails loudly on a stale lock while performing zero network requests, so it can't be confused with flake.
   Verify: `grep -rln 'lockfile_mode' .bazelrc* .github/workflows/ Taskfile*`. Empty output = FINDING (no freshness gate).
   Severity: MUST. Bazel 7/8/9. Settles: M-B-01.

6. **Leave developer-machine `.bazelrc` at the `update` default; do not force `--lockfile_mode=error` there.**
   Rationale: `error` mode turns every legitimate new dependency into a build failure that most developers won't know how to unblock; `update` is what makes incremental dependency edits self-service.
   Verify: reading heuristic on `.bazelrc`/`.bazelrc.user` — a bare (non-`ci`-scoped) `--lockfile_mode=error` line is a finding.
   Severity: SHOULD. Bazel 7/8/9. Decision (not a listed M-ID).

7. **Run a scheduled ("canary") job with `--lockfile_mode=refresh`, separate from the normal build/test matrix.**
   Rationale: `update` and `error` never re-check mutable lockfile data (yanked versions, previously-"not found" registry entries) once cached — only `refresh` does, and it does so "roughly every hour" it's active, which a one-shot CI run won't naturally exercise.
   Verify: presence of a `schedule:`-triggered workflow invoking `--lockfile_mode=refresh`. Empty = FINDING (mutable-data drift is undetectable).
   Severity: SHOULD. Bazel 7/8/9. Settles: M-B-01 (freshness, mutable-data half).

8. **Never cite a `MODULE.bazel.lock` schema/version number from documentation.**
   Rationale: measured triple mismatch — docs example shows 10, `rules_ocx`'s Bazel-8.7.0 lock shows 24, current `bazelbuild/bazel` master defines 28 — none wrong for its vantage point, all wrong to hardcode.
   Verify: `python3 -c "import json;print(json.load(open('MODULE.bazel.lock'))['lockFileVersion'])"` against the file in hand.
   Severity: MUST. Bazel 7/8/9. Settles: M-B-02.

9. **Treat a `lockFileVersion` mismatch as "no lockfile exists," and rely on rule 5's `error`-mode job — not a human noticing a slow build — to catch it.**
   Rationale: outside `error` mode, Bazel silently discards the entire file and re-resolves, printing nothing.
   Verify: reading heuristic — after any Bazel-version bump, confirm the `error`-mode CI job (rule 5) actually ran against the new version before merging.
   Severity: SHOULD. Bazel 7/8/9. Settles: M-B-02.

10. **Mark every dev-only `bazel_dep` as `dev_dependency = True`.**
    Rationale: per the attribute's own doc text, a `dev_dependency` bazel_dep "will be ignored if the current module is not the root module" — omitting it leaks build/test/doc tooling into every consumer's resolved graph.
    Verify: `grep -n 'bazel_dep' MODULE.bazel`; classify each as prod (referenced from the public `.bzl`/BUILD surface) or dev (test/lint/doc only) and confirm dev ones carry the attribute.
    Severity: MUST for a published module; SHOULD for a root-only module. Bazel 7/8/9. General MODULE.bazel hygiene (no listed M-ID).

11. **Never write, and reject in review, a `single_version_override` whose `version` is lower than any live `bazel_dep` requirement for that module, on Bazel 9.0+.**
    Rationale: silently accepted (and silently harmful) through Bazel 8; a hard `BAD_MODULE` error since the fix that shipped in 9.0.0.
    Verify: `bazel mod graph` (or one build) — the exact string `is overridden to use version '...', which is lower than the version '...' requested by the root module` is unambiguous. Empty output (clean graph) = pass.
    Severity: MUST on Bazel 9.0+; the pattern is merely a latent bug on Bazel 8. Settles: M-B-16.

12. **Delete `compatibility_level` only when the module will never be presubmitted to a registry that gates on it.**
    Rationale: resolver no-op since 8.6.0/9.1.0, but BCR presubmit still diffs it and blocks the PR without an explicit `@bazel-io skip_check compatibility_level`.
    Verify: for a BCR-targeted module, keep the field internally consistent across versions unless the skip phrase is used; for a private-registry-only module, delete freely.
    Severity: CONSIDER (BCR-bound modules: SHOULD keep it consistent). Bazel 8.6+/9.1+ (resolver); registry gate is version-independent. Settles: M-B-13.

13. **Run `bazel mod tidy` only behind a diff check, never as a silent auto-commit step.**
    Rationale: it rewrites hand-authored `MODULE.bazel` with no `--check`/dry-run flag to preview the change.
    Verify: `bazel mod tidy && git diff --exit-code MODULE.bazel`. Nonzero exit = a human must review the rewrite before it lands. Zero exit = pass (already tidy).
    Severity: SHOULD. Bazel 7/8/9. Settles: M-B-12.

14. **If a pipeline runs `bazel mod tidy` (or anything shelling to `buildozer`) under `--vendor_dir --nofetch`, explicitly vendor `@bazel_tools//tools:tools_for_bazel_subcommands` alongside build targets, or pin Bazel ≥9.2.0.**
    Rationale: `bazel vendor //...` alone doesn't capture `mod tidy`'s implicit `buildozer` dependency before 9.2.0; the failure is an opaque "repository not found" at tidy-time, not at vendor-time.
    Verify: either the Bazel pin is ≥9.2.0, or the vendor invocation includes the filegroup — `bazel mod tidy --vendor_dir=<dir> --nofetch` should exit 0.
    Severity: SHOULD (on Bazel <9.2.0 with offline `mod tidy` in the pipeline); N/A otherwise. Settles: M-B-12, M-B-17.

15. **Do not claim "vendor mode gives an offline build" without testing from a clean output-user-root, network blocked, on the target Bazel version.**
    Rationale: two open upstream issues show Bazel-internal repos (`@local_config_platform` and similar) and output-user-root-dependent state escaping vendoring even after a full `bazel vendor //...`.
    Verify: reading heuristic — `rm -rf $(bazel info output_base)/../..` (the user root) or an equivalent clean-cache step, then a network-blocked build. A clean success is the pass condition; any fetch attempt is the finding.
    Severity: MUST NOT (as an unverified claim); SHOULD (as a periodic verification). Bazel 7/8/9 (both issues open as of 2026-09-05). Settles: M-B-17.

16. **Require a justification comment on every `pin()` line in `VENDOR.bazel`.**
    Rationale: a pinned repo is frozen with zero staleness signal — "Bazel will NOT update the vendored source for this repo ... unless it's unpinned," with no warning printed either way.
    Verify: `grep -n '^pin(' VENDOR.bazel`; every hit needs an adjacent comment naming why and who owns unpinning it. Empty output = nothing pinned = pass by default.
    Severity: MUST (where `pin()` is used). Bazel 7/8/9. Settles: M-B-18.

17. **Pin the Bazel version via a committed `.bazelversion`, and require `bazelisk` for anyone touching a bzlmod repo.**
    Rationale: the lockfile's own docs warn it "will change even between backward-compatible Bazel releases" — an unpinned team manufactures lockfile churn indistinguishable from a real dependency conflict.
    Verify: `test -f .bazelversion && test -s .bazelversion`. Empty/absent = FINDING. `rules_ocx` passes (`8.7.0`).
    Severity: MUST. Bazel 7/8/9. General hygiene supporting M-B-04.

18. **After bumping `.bazelversion`, regenerate and diff-review `MODULE.bazel.lock` in the same commit; never let the first CI run rewrite it unreviewed.**
    Rationale: a stale-version lock is discarded and silently rewritten on first use (§7); doing that inside CI rather than deliberately hides a full re-resolution inside what looks like a routine version bump.
    Verify: reading heuristic — `git show --stat <bump-commit>` should touch both `.bazelversion` and `MODULE.bazel.lock`.
    Severity: MUST. Bazel 7/8/9. Settles: M-B-02.

19. **Before "delete and recreate the lockfile" as a conflict fix, confirm the regenerated file is diffed against the pre-conflict version outside the lines actually in conflict.**
    Rationale: deleting the whole lock re-resolves the *entire* graph, not just the conflicting module, and can silently pick up newer/different versions of unrelated dependencies as a side effect — the practitioner corpus (#20272, #20369, rules_python#2434) shows this is the common fallback precisely because rule 3 is unfamiliar.
    Verify: reading heuristic — diff the regenerated lock against the last-known-good one; any change to a `moduleExtensions`/`registryFileHashes` entry for a module untouched by the conflicting edit is a finding worth a second look, not an automatic revert.
    Severity: SHOULD. Bazel 7/8/9. Settles: M-B-03, M-B-04.

20. **Do not invent `--lockfile_mode` values, subcommand names, or flags beyond what the CLI reference and `bazel help mod` actually list.**
    Rationale: exactly four `--lockfile_mode` values and eight `bazel mod` subcommands exist as of 2026-09-05 (two of the eight absent from the rendered docs page); anything else is a hallucination or (for the two undocumented ones) a real thing memory alone won't reliably surface.
    Verify: `bazel help mod` (or the embedded `mod.txt`) is the ground truth for subcommands; `bazel help build 2>&1 | grep -A3 lockfile_mode` (or the command-line reference) for the flag's values.
    Severity: MUST. Bazel 7/8/9. Reading heuristic supporting M-B-01/M-B-12.

## Fleet evidence

`rules_ocx/MODULE.bazel` (32 lines) — 5 `bazel_dep`, exactly 3 marked `dev_dependency = True`:

```
13:bazel_dep(name = "bazel_skylib", version = "1.9.0")
14:bazel_dep(name = "platforms", version = "1.0.0")
16:bazel_dep(name = "rules_shell", version = "0.6.1", dev_dependency = True)
17:bazel_dep(name = "stardoc", version = "0.8.0", dev_dependency = True)
18:bazel_dep(name = "buildifier_prebuilt", version = "8.2.0.2", dev_dependency = True)
```
Satisfies candidate rule 10 exactly: the two build-time deps (`bazel_skylib`, `platforms`) are plain; the three dev/lint/doc tools are correctly marked. No `single_version_override`, `multiple_version_override`, or `compatibility_level` appear anywhere in the module — rules 11 and 12 are ungrounded in this fleet, upstream-only.

`rules_ocx/MODULE.bazel.lock` (166,136 bytes, measured with `wc -c`) — matches the brief's figures exactly:

```
lockFileVersion: 24
registryFileHashes: 141 entries, all from bcr.bazel.build (single registry)
selectedYankedVersions: {}  (empty)
moduleExtensions: 4 keys (pybind11_bazel, rules_fuzzing, rules_kotlin, rules_python pip) —
  rules_ocx's OWN `ocx` extension is absent from this map, consistent with its
  `reproducible = True` declaration (extensions.bzl:331, sibling dive's finding)
facts: {}  (present but empty — an undocumented top-level key beyond even the
  rules_ocx-era docs/schema, corroborating §6's version-drift finding independently)
```

**Standout finding, not previously flagged by any wave-1 artifact:** `rules_ocx/.gitattributes:5` reads
```
MODULE.bazel.lock merge=union linguist-generated=true
```
This is git's generic, line-based `union` merge driver — **not** Bazel's own `bazel-lockfile-merge` jq driver (§8, candidate rule 4). A `union` merge on a conflicting digest key keeps *both* copies of the key in the JSON object with no conflict markers at all, silently defeating Bazel's own merge-conflict detection (§7) and producing a file that looks clean but encodes stale or duplicate extension inputs. `rules_ocx` currently fails candidate rule 4's own verification (`git check-attr merge MODULE.bazel.lock` → `union`, not `bazel-lockfile-merge`).

CI freshness (confirms M-B-01 independently of the `ci` audit): `grep -rn "bazel mod\|lockfile_mode" --include="*.yml" --include="*.yaml" --include="Taskfile*" .` inside `rules_ocx` returns **nothing** — no `--lockfile_mode=error` gate, no scheduled `refresh` job, matching `build-contracts-and-ci-posture.md:168`'s independent finding.

`.bazelversion` is present and pinned (`8.7.0`), satisfying candidate rule 17. `MODULE.bazel.lock` is git-tracked (`git ls-files` confirms), satisfying candidate rule 1; the fixture locks under `examples/*/` and `e2e/*/` are deliberately `.gitignore`d — a reasonable exception for disposable test fixtures, not a finding.

## AI-agent angle

- **Writing `single_version_override` below a live `bazel_dep` and expecting it to just work.** This pattern is in a lot of pre-2026 training data because it silently succeeded through Bazel 8. On Bazel 9.0+ it is now a hard, named error. Smallest check: run `bazel mod graph` once after touching any override; the error string is unmistakable (§2, rule 11).
- **Treating `compatibility_level` as either "still load-bearing" or "safe to delete outright."** Both are wrong for a BCR-targeted module: the resolver ignores it, the registry still gates on it. Smallest check: if the module has a `presubmit.yml`/BCR history, keep the field consistent or use the documented skip phrase (§3, rule 12).
- **Hand-editing `MODULE.bazel.lock` to "fix" a conflict**, especially inside `moduleExtensions`. An LLM asked to resolve a merge conflict defaults to textual resolution everywhere, which is correct for `registryFileHashes`/`selectedYankedVersions` and actively wrong for digest fields it cannot verify. Smallest check: `git diff` the resolved lock and confirm no hand-typed value appears inside a `bzlTransitiveDigest`/`usagesDigest`/`generatedRepoSpecs` block; if one does, discard and follow rule 3 instead.
- **Citing a lockfile version number** ("bump to lockfile version 10/24/whatever") in generated guidance or a migration comment. Confirmed wrong for at least three different vantage points as of this research (§6). Smallest check: the file-reading one-liner in rule 8 — never trust a remembered number.
- **Inventing a `bazel mod tidy --check` or `--dry-run` flag** because that's the idiom every other formatter/linter in this space uses (buildifier, gofmt, prettier). It does not exist (§10). Smallest check: `bazel help mod` (or `ModOptions.java`) before writing any `tidy` invocation into a script.
- **Assuming `--vendor_dir` alone produces an airgap-ready build**, because the docs' framing ("build the target offline") reads that way at a skim. Two real upstream issues contradict it for a from-scratch machine (§11, rule 15). Smallest check: never assert "fully offline" in generated docs/CI without a from-clean-cache test run backing it.
- **Using WORKSPACE-era vocabulary or flags in a bzlmod repo** — `--enable_bzlmod=true` (now a permanent no-op as of Bazel 9.0.0, and WORKSPACE logic itself is deleted, not merely disabled), `bazel sync` (removed in 9.0, replaced by `bazel fetch --all`), or a `WORKSPACE`/`WORKSPACE.bzlmod` file in a repo whose `MODULE.bazel` is the real source of truth. Smallest check: `grep -rn 'enable_bzlmod\|bazel sync' .bazelrc* Taskfile* .github/` should be empty on a Bazel-9-only repo.
- **Setting a generic `merge=union`/`merge=ours` git attribute on `MODULE.bazel.lock`** because "it's JSON, union merges are usually fine" — exactly the fleet's own live mistake (§Fleet evidence). Smallest check: `git check-attr merge MODULE.bazel.lock` must name `bazel-lockfile-merge`.

## Contested / evolving

- **Should `MODULE.bazel.lock` be committed at all, or gitignored during a migration?** Official docs are unambiguous (commit it); the failure-corpus scout independently found real teams `.gitignore`-ing it mid-migration as a stopgap against merge churn, a workaround the docs never endorse (M-B-04, contested, P1 per the map). This dive's decision is "commit it" for a stable, single-registry module like `rules_ocx`; a large, multi-registry, high-churn monorepo may still find the gitignore-during-migration workaround pragmatic until the merge driver (rule 4) is in place team-wide. Trending: the jq merge driver (shipped, current) is the sanctioned fix, not gitignoring — treat gitignoring as a temporary, explicitly time-boxed exception, not a destination.
- **Does `--vendor_dir` deliver what its docs promise?** The docs assert a network-free build; two issues open as of 2026-09-05 (#23243, #26806) show it does not, unconditionally, on a fresh machine. One adjacent gap (#29222, `mod tidy` under vendor mode) *did* get fixed, in 9.2.0 — so the trend is upstream actively closing these gaps one at a time, not standing still. Treat "vendor mode is airgap-ready" as version-and-issue-dependent, re-check the two open issues' status before asserting it for a new Bazel pin.
- **`bazel mod tidy`'s documentation status.** Two live, real subcommands (`tidy`, `dump_repo_mapping`) are simply missing from the command's own reference page, in both the legacy and the newer Docusaurus-era source tree, as of this research (2026-09-05). This is not evolving so much as a standing documentation gap with no visible fix in flight — worth re-checking on each future wave, since a doc fix would remove the need for this dive's own cross-check method.
- **The lockfile schema's own drift.** Version 10 (docs) → 24 (fleet, Bazel 8.7.0) → 28 (current master) plus an undocumented `facts`/`factsVersions` pair not in any of the three prior vantage points. The schema is actively evolving (the `facts` mechanism is new machinery for extension-side caching, not yet exercised by any extension this dive found in the fleet); expect the version number to keep climbing and expect the shipped rule (candidate 8) to remain true regardless of the specific numbers on any future research date.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [bazel.build/external/lockfile](https://bazel.build/external/lockfile) | Official docs — lockfile format, `--lockfile_mode`, merge conflicts | Fetched 2026-09-05 (example schema: `lockFileVersion: 10`) | Primary source for lockfile modes, merge-conflict procedure, jq merge driver |
| [bazel.build/external/module](https://bazel.build/external/module) | Official docs — MODULE.bazel, MVS, overrides, canonical names | Fetched 2026-09-05 | Primary source for version resolution, override types, repo-name warning |
| [bazel.build/external/mod-command](https://bazel.build/external/mod-command) | Official docs — `bazel mod` subcommand reference | Fetched 2026-09-05 | Primary source for the 6/7 documented subcommands and their flags |
| [bazel.build/external/registry](https://bazel.build/external/registry) | Official docs — index registry format, BCR, `--registry` | Fetched 2026-09-05 | Primary source for registry file layout and precedence |
| [bazel.build/external/faq](https://bazel.build/external/faq) | Official docs — Bzlmod FAQ | Fetched 2026-09-05 | Primary, verbatim source for the `compatibility_level` no-op statement and module-versioning best practices |
| [bazel.build/external/vendor](https://bazel.build/external/vendor) | Official docs — vendor mode, `VENDOR.bazel` | Fetched 2026-09-05 | Primary source for `pin()`/`ignore()` semantics and the `tools_for_bazel_subcommands` mitigation |
| [bazel.build/rules/lib/globals/module](https://bazel.build/rules/lib/globals/module) | Official API reference — `bazel_dep()`/`module()` attributes | Fetched 2026-09-05 | Primary, verbatim attribute defaults and doc strings (`dev_dependency`, `compatibility_level`) |
| [bazel.build/reference/command-line-reference](https://bazel.build/reference/command-line-reference) | Official CLI flag reference | Fetched 2026-09-05 | Primary source confirming `--lockfile_mode` default (`update`) and related flags |
| [Bazel 9.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/9.0.0) | GitHub release notes | 2026-01-20 | Primary, dated source for the `single_version_override` hard-error change and WORKSPACE removal |
| [Bazel 8.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/8.0.0) | GitHub release notes | 2024-12-09 | Primary, dated source for WORKSPACE-disabled-by-default and `--incompatible_no_implicit_watch_label` |
| [`BazelLockFileValue.java`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/bazel/bzlmod/BazelLockFileValue.java) | Bazel source, `master` | Fetched 2026-09-05 | Primary source for the current `LOCK_FILE_VERSION` constant (28) and the undocumented `facts`/`factsVersions` fields |
| [`BazelLockFileFunction.java`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/bazel/bzlmod/BazelLockFileFunction.java) | Bazel source, `master` | Fetched 2026-09-05 | Primary source for version-mismatch handling (silent discard vs. named error) and merge-conflict text detection |
| [`ModuleFileFunction.java`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/bazel/bzlmod/ModuleFileFunction.java) | Bazel source, `master` | Fetched 2026-09-05 | Primary source for the exact `single_version_override` hard-error message string |
| [`mod.txt`](https://raw.githubusercontent.com/bazelbuild/bazel/master/src/main/java/com/google/devtools/build/lib/bazel/commands/mod.txt) | Bazel source, `master` — `bazel help mod`'s embedded usage text | Fetched 2026-09-05 | Primary, ground-truth source proving `tidy` and `dump_repo_mapping` are real subcommands missing from the docs page |
| [bazelbuild/bazel-central-registry `docs/README.md`](https://github.com/bazelbuild/bazel-central-registry/blob/main/docs/README.md) | BCR contribution/maintainer docs | Fetched 2026-09-05 | Primary source for the `compatibility_level` presubmit check and its `skip_check` escape hatch |
| [PR #26968 / commit `2f296f083c`](https://github.com/bazelbuild/bazel/pull/26968) | Bazel PR + commit, merged upstream | 2025-09-12 | Primary source: the author's own description of the prior silent-ignore behavior, `RELNOTES[INC]` tag |
| [Issue #29222](https://github.com/bazelbuild/bazel/issues/29222) + [#29449](https://github.com/bazelbuild/bazel/issues/29449) | Bazel GitHub issues | Filed 2026-06-26, fixed for 9.2.0 | Primary evidence for the `mod tidy`-under-vendor gap and its exact fix version |
| [Issues #23243](https://github.com/bazelbuild/bazel/issues/23243), [#26806](https://github.com/bazelbuild/bazel/issues/26806) | Bazel GitHub issues, open | Filed 2025-01-20 / 2025-09-16 | Secondary/practitioner evidence that `--vendor_dir` does not deliver a full airgap by itself |
| [Issues #20272](https://github.com/bazelbuild/bazel/issues/20272), [#20369](https://github.com/bazelbuild/bazel/issues/20369), [rules_python#2434](https://github.com/bazelbuild/rules_python/issues/2434) | GitHub issues, practitioner reports | 2023-2024 filed, still open/referenced | Secondary corpus for the "delete and recreate the lockfile" failure mode this dive warns against |
| `rules_ocx/MODULE.bazel`, `MODULE.bazel.lock`, `.gitattributes`, `.bazelversion` (local fleet repo) | Fleet ground truth | Measured 2026-09-05 | Primary, local evidence for every Fleet-evidence claim above, including the `.gitattributes` merge-driver misconfiguration this dive newly found |


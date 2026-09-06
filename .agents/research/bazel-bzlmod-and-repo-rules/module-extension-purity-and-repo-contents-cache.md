---
title: Module extension purity and the repo-contents cache
topic: module-extension-purity-and-repo-contents-cache
group: bazel-bzlmod-and-repo-rules
family: BZL-MOD
agent: research-lang-wave2-sonnet
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 17
primary_sources_count: 12
settles: [M-B-05, M-B-06, M-B-10, M-B-11]
scope: |
  What `reproducible = True` (extension side) and `repository_ctx.repo_metadata(reproducible=True)`
  (repo-rule side) each promise, how a reviewer verifies the claim rather than trusting the
  keyword, and what Bazel 8.3+/9.0 give in return: lockfile exclusion, the local
  `--repo_contents_cache`, and the experimental remote repo-contents cache. Also: the
  `Circular definition of repositories` failure and the toolchainization fix for
  `native.register_toolchains`/`native.bind` being unavailable in an extension. Does NOT
  cover `MODULE.bazel.lock` mechanics generally (`module-file-and-lockfile-hygiene`),
  `getenv`/`watch` re-fetch triggers or BCR policy (`repository-rule-hermeticity-and-bcr`),
  or `--vendor_dir`/`VENDOR.bazel` (same sibling dive).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [What `extension_metadata(reproducible = True)` actually promises](#1-what-extension_metadatareproducible--true-actually-promises)
   2. [The repo-rule twin: `repository_ctx.repo_metadata()`](#2-the-repo-rule-twin-repository_ctxrepo_metadata)
   3. [Two caches, two eligibility bars](#3-two-caches-two-eligibility-bars)
   4. [`bzlTransitiveDigest`/`usagesDigest`: what decides re-evaluation](#4-bzltransitivedigestusagesdigest-what-decides-re-evaluation)
   5. [`Circular definition of repositories`](#5-circular-definition-of-repositories)
   6. [Why `native.register_toolchains()`/`native.bind()` are unavailable in an extension](#6-why-nativeregister_toolchainsnativebind-are-unavailable-in-an-extension)
   7. [The toolchainization pattern](#7-the-toolchainization-pattern)
   8. [`facts`/`facts_version`: reproducibility without a checksum](#8-factsfacts_version-reproducibility-without-a-checksum)
   9. [The docs page itself is stale on this exact API](#9-the-docs-page-itself-is-stale-on-this-exact-api)
3. [Decisions](#decisions)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Fleet evidence](#fleet-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- `extension_metadata(reproducible = True)` is a promise about the extension's *own* impl function, not about the repos it creates: "given the same usages, tags, and watched inputs, it will always instantiate the same set of repository rules with the same attributes" ([module_ctx docs](https://bazel.build/rules/lib/builtins/module_ctx)). The repository rules it dispatches to can still be arbitrarily host-dependent.
- The one visible effect of `reproducible = True` is exclusion from the committed `MODULE.bazel.lock` — no `bzlTransitiveDigest`/`usagesDigest` entry is ever written for it ([lockfile.md](https://bazel.build/external/lockfile)).
- Nothing re-checks the claim. `reproducible = True` is Bazel trusting the author; a false claim produces silently divergent repos across machines with zero lockfile diff to catch it.
- `repository_ctx.repo_metadata(reproducible=True)` is a **different, newer** API on the repo-rule side (Bazel 8.3.0, [#26129](https://github.com/bazelbuild/bazel/pull/26129)) — it does not exist merely because the extension is marked reproducible, and a repo rule that only ever `return`s implicitly (`None`) gets none of the Bazel-9 caching.
- There are two Bazel-9 caches with two different eligibility bars, and conflating them is the single most likely mistake: **local** `--repo_contents_cache` needs only `repo_metadata(reproducible=True)`; the **remote** `--experimental_remote_repo_contents_cache` additionally excludes any repo rule with runtime-added deps via `repository_ctx.watch()` or `.getenv()` ([discussion #27509](https://github.com/bazelbuild/bazel/discussions/27509)).
- That discussion also gives the exact eligibility check: read `$(bazel info output_base)/external/@<repo>.marker` — more than one line means the repo has runtime deps and is excluded from the remote cache.
- `rules_ocx`'s own 4 repository rules never call `repository_ctx.repo_metadata()` (0 hits, `grep -c` confirmed) — none are eligible for either Bazel-9 cache today, independent of their 9 `getenv`/4 `watch` sites, and independent of the fact its extension is already `reproducible = True`.
- `bazel.build/external/repo` — the canonical repo-rule reference page — does not mention `repository_ctx.repo_metadata()` at all as of 2026-09-05; it still documents the pre-8.3 "return `None` or a dict" contract. Trust the flag's own `--help` output or the source (`RepositoryOptions.java`) over this page for anything cache-related.
- `--repo_contents_cache` shipped **enabled by default** in Bazel 8.3.0, was walked back to **opt-in only** in 8.4.0 after a real regression (archive_override stripped non-directory files, [#26450](https://github.com/bazelbuild/bazel/issues/26450)), and the 9.0.0 release notes restate the original "Added ... defaults to" line as part of a cumulative since-8.0 summary — an agent reading only the 9.0 notes never learns the flag flipped off and (per the flag's own `defaultValue = "null"` in the 9.0.0-tagged source) back on.
- `bzlTransitiveDigest` (extension impl + transitively loaded `.bzl` files) and `usagesDigest` (all tag usages across the module graph) are the two hashes Bazel compares to decide whether a **non**-reproducible extension needs re-evaluation. A reproducible extension carries neither — it is cached separately, in an internal, format-unspecified store that "persists across server restarts" ([extension.md](https://bazel.build/external/extension)).
- Instantiating a repository and `load()`-ing a `.bzl` file from it inside the *same* module extension produces `Circular definition of repositories generated by module extensions or files in external repositories` — a hard failure, not a warning. Fix: split into two extensions, or move the shared logic to a `.bzl` file loaded by both.
- `native.register_toolchains()` and `native.bind()` both raise a hard error inside a module extension. `register_toolchains()`/`register_execution_platforms()` are MODULE.bazel-only APIs under Bzlmod ([migration.md](https://bazel.build/external/migration)).
- The fix is toolchainization: the extension creates one hub repo holding every toolchain target plus the repos those toolchains depend on, the module does `use_repo(ext, "hub")`, and `register_toolchains("@hub//...")` lives in `MODULE.bazel`, never inside the extension.
- The brief's proposed static check (`grep -n 'ctx\.os\.\|ctx\.getenv\(' <extension>.bzl` empty) is necessary but not sufficient: it only inspects the extension's own file, misses a purity violation reached through a helper `.bzl` the extension `load()`s, and — because `reproducible = True` excludes the extension from the lockfile — there is no `bzlTransitiveDigest` to diff across two runs unless the flag is temporarily removed first.
- `facts`/`facts_version` (Bazel 9.0+, not present in 8.3–8.8) let an extension become reproducible without a checksum, by persisting immutable data (e.g. a resolved URL+hash table) across evaluations; unversioned schema changes to that persisted data are invisible because `facts` are never invalidated by extension code changes.
- `rules_ocx`'s extension sets neither `os_dependent` nor `arch_dependent` nor `facts` (0 hits) — consistent with the purity boundary the fleet's own source comment documents, and with both `download` sites carrying `sha256` (no need for the checksum-free `facts` escape hatch).

## Findings

### 1. What `extension_metadata(reproducible = True)` actually promises

The full signature, read directly off the API reference:

```
extension_metadata module_ctx.extension_metadata(*, root_module_direct_deps=None, root_module_direct_dev_deps=None, reproducible=False, facts={})
```

`reproducible`: "States that this module extension ensures complete reproducibility, which means that given the same usages, tags, and watched inputs, it will always instantiate the same set of repository rules with the same attributes." Default `False`. ([module_ctx](https://bazel.build/rules/lib/builtins/module_ctx))

The best-practices section of the extension guide spells out the qualifying condition and the payoff:

> "If your extension always defines the same repositories given the same inputs (extension tags, files it reads, etc.) and in particular doesn't rely on any downloads that aren't guarded by a checksum, consider returning `extension_metadata` with `reproducible = True`. This allows Bazel to skip this extension when writing to the `MODULE.bazel` lockfile... Bazel still caches the results of reproducible extensions in a way that persists across server restarts, so even a long-running extension can be marked as reproducible without a performance penalty." ([extension.md](https://bazel.build/external/extension))

Two things worth separating, because guidance tends to blur them:

- **The promise is about the extension's impl function**, not the repos it creates. A `reproducible = True` extension can still call a wildly host-dependent repository rule — the repo rule's own `repository_ctx.repo_metadata()` (Finding 2) is the separate, independent claim about *that*.
- **Nothing re-checks the claim at runtime.** There is no equivalent of a test suite Bazel runs against a `reproducible = True` extension. It is an assertion the author makes once, and it silently governs two different caching systems from then on (Finding 3).

### 2. The repo-rule twin: `repository_ctx.repo_metadata()`

```
repo_metadata repository_ctx.repo_metadata(*, reproducible=False, attrs_for_reproducibility={})
```

- `reproducible`: "if it were fetched another time with exactly the same input attributes, repo rule definition, watched files and environment variables, etc., then exactly the same output would be produced." Setting this to `True` "allows the fetched repo contents to be cached across workspaces. Note that setting this to `True` does not guarantee caching in the repo contents cache; for example, local repo rules are never cached." ([repository_ctx](https://bazel.build/rules/lib/builtins/repository_ctx))
- `attrs_for_reproducibility`: used when `reproducible=False`, to name which attributes would need to change to make a *future* fetch reproducible (the modern replacement for the pre-8.3 contract of returning a bare dict from the impl function).

This is a **different function on a different object** (`repository_ctx`, not `module_ctx`) and it did not exist before Bazel 8.3.0 ([#26129](https://github.com/bazelbuild/bazel/pull/26129)). An extension marked `reproducible = True` gets you nothing on this axis by itself — every repository rule it calls has to opt in separately, or it falls back to the pre-8.3 implicit contract (return `None`/a dict), which grants neither Bazel-9 cache (Finding 3).

### 3. Two caches, two eligibility bars

**Local, `--repo_contents_cache` (startup option).** From the 9.0.0-tagged source (`RepositoryOptions.java:55-71`):

```java
@Option(
    name = "repo_contents_cache",
    oldName = "repository_contents_cache",
    defaultValue = "null",
    ...
    help =
        """
        Specifies the location of the repo contents cache, which contains fetched repo
        directories shareable across workspaces. An empty string as argument requests the repo
        contents cache to be disabled, otherwise the default of `{--repository_cache}/contents`
        is used. Note that this means setting `--repository_cache=` would by default disable the
        repo contents cache as well, unless `--repo_contents_cache={some_path}` is also set.
        """)
public PathFragment repoContentsCache;
```
(https://github.com/bazelbuild/bazel/blob/9.0.0/src/main/java/com/google/devtools/build/lib/bazel/repository/RepositoryOptions.java#L55-L71)

Eligibility for this cache is **only** `repository_ctx.repo_metadata(reproducible=True)` — no restriction on `watch`/`getenv`.

**Remote, `--experimental_remote_repo_contents_cache` (startup option, default `false`, new in 9.0.0).** The GitHub discussion opened for feedback states the eligibility bar precisely:

> "A repository rule has to return `repository_ctx.repo_metadata(reproducible = True)` to be eligible for caching. As a further limitation of the current experimental implementation, **only repo rules without any dependencies added at runtime (e.g., via `repository_ctx.watch` or `.getenv`) are supported**. We hope to lift this restriction in the future. You can check a repo with canonical name `@@<repo_name>` for runtime deps by opening the file `$(bazel info output_base)/external/@<repo_name>.marker` — all lines after the first one are runtime deps." ([discussion #27509](https://github.com/bazelbuild/bazel/discussions/27509))

The `.marker` file check is the exact verification the brief asked for, and it comes straight from the feature's own author, not an inference. It also directly answers "does this rule out the fleet's own rules": **yes, for the remote cache** — any repo rule with a `getenv`/`watch` call adds a line to its own marker file, whether or not it also returns `repo_metadata(reproducible=True)`.

### 4. `bzlTransitiveDigest`/`usagesDigest`: what decides re-evaluation

Read directly from `MODULE.bazel.lock`'s own documentation, and confirmed against a real lockfile:

```json
"moduleExtensions": {
  "//:extension.bzl%lockfile_ext": {
    "general": {
      "bzlTransitiveDigest": "oWDzxG/aLnyY6Ubrfy....",
      "usagesDigest": "aLmqbvowmHkkBPve05y....",
      "generatedRepoSpecs": { "hello": { "bzlFile": "@@//:extension.bzl", ... } }
    }
  }
}
```

1. `bzlTransitiveDigest` — "the digest of the extension implementation and the `.bzl` files transitively loaded by it."
2. `usagesDigest` — "the digest of the usages of the extension in the dependency graph, which includes all tags."
3. "Further unspecified fields" track file/directory/env-var inputs.
4. `generatedRepoSpecs` is the memoized output — what re-evaluation is being skipped in favor of.
   ([lockfile.md](https://bazel.build/external/lockfile))

A local read of `rules_ocx/MODULE.bazel.lock` confirms the exact field set used in practice:

```
$ python3 -c "import json; print(list(json.load(open('MODULE.bazel.lock'))['moduleExtensions']['@@rules_python+//python/private/pypi:pip.bzl%pip_internal']['general'].keys()))"
['bzlTransitiveDigest', 'usagesDigest', 'recordedFileInputs', 'recordedDirentsInputs', 'envVariables', 'generatedRepoSpecs', 'recordedRepoMappingEntries']
```

`update` mode (the default `--lockfile_mode`) skips re-running an extension when both digests still match what's recorded — this is the general mechanism, and it applies to **every non-reproducible extension**. The important corollary for a reproducible one: `rules_ocx`'s own `ocx` extension has **no entry at all** under `moduleExtensions` in that same lockfile — confirmed by listing the four extension keys present, none of which is `//ocx:extensions.bzl%ocx`. `reproducible = True` doesn't get a fast digest match, it gets no digest recorded at all, and is instead cached in the separate, unspecified-format store the extension guide mentions.

### 5. `Circular definition of repositories`

The exact user-facing string, from the source that generates it:

```java
// src/main/java/com/google/devtools/build/lib/skyframe/BzlmodRepoCycleReporter.java:139
"Circular definition of repositories generated by module extensions or files in"
```
(https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/skyframe/BzlmodRepoCycleReporter.java#L139)

The minimal reproduction, taken from Bazel's own test suite (`ModuleExtensionResolutionTest.java:1605`, `testReportRepoAndBzlCycles_extRepoLoadSelfCycle`):

```python
# defs.bzl — WRONG: instantiates candy1 and loads from it in the same extension
load("@data_repo//:defs.bzl", "data_repo")
load("@candy1//:data.bzl", "data")   # candy1 doesn't exist yet at load time

def _ext_impl(ctx):
    data_repo(name = "candy1", data = "lollipops")

my_ext = module_extension(implementation = _ext_impl)
```

produces:

```
ERROR <no location>: Circular definition of repositories generated by module extensions
 or files in external repositories:
.-> @@+my_ext+candy1
|   module extension @@//:defs.bzl%my_ext
|   //:defs.bzl
|   @@+my_ext+candy1//:data.bzl
`-- @@+my_ext+candy1
```
(https://github.com/bazelbuild/bazel/blob/master/src/test/java/com/google/devtools/build/lib/bazel/bzlmod/ModuleExtensionResolutionTest.java#L1605)

Two extensions can hit the same error by loading from each other's generated repos (`testReportRepoAndBzlCycles_circularExtReposCtxRead`, same file, line 1512) — the failure is not limited to one extension referencing its own output; any load-time cycle across extension-generated repos triggers it. The fix in both cases is the same: split the repo-instantiation from the `.bzl` that needs to `load()` from the result into two separate extensions (or a plain `.bzl` loaded by both, with no repo dependency).

```python
# CORRECT — two extensions, no cycle
# ext_a.bzl
def _a_impl(ctx):
    data_repo(name = "candy1", data = "lollipops")
ext_a = module_extension(implementation = _a_impl)

# ext_b.bzl
load("@candy1//:data.bzl", "data")   # candy1 is fully resolved by the time ext_b runs
def _b_impl(ctx):
    ...
ext_b = module_extension(implementation = _b_impl)
```

### 6. Why `native.register_toolchains()`/`native.bind()` are unavailable in an extension

Straight from the canonical migration guide, which is the authoritative statement (not a blog inference):

> "With Bzlmod, the `register_toolchains` and `register_execution_platforms` APIs are only available in the `MODULE.bazel` file. You cannot call `native.register_toolchains` in a module extension." ([migration.md](https://bazel.build/external/migration#register-toolchains))

```python
## WORKSPACE (legacy) — WRONG under Bzlmod
def sh_configure():
    sh_config_rule(name = "local_config_sh")
    native.register_toolchains("@local_config_sh//:local_sh_toolchain")  # errors in an extension
```

```python
## MODULE.bazel (Bzlmod) — CORRECT
sh_config_ext = use_extension("//:local_config_sh_extension.bzl", "sh_config_extension")
use_repo(sh_config_ext, "local_config_sh")
register_toolchains("@local_config_sh//:local_sh_toolchain")   # must live here, not in the extension
```

`bind()` is the same story, one level simpler — it is "deprecated and not supported in Bzlmod" outright, extension or not; every caller migrates to `alias()` or a direct label ([migration.md](https://bazel.build/external/migration#bind-targets)).

### 7. The toolchainization pattern

EngFlow's worked migration of `rules_scala` names the pattern and gives the concrete before/after ([blog.engflow.com, 2025-05-14](https://blog.engflow.com/2025/05/14/migrating-to-bazel-modules-aka-bzlmod---toolchainization/)):

```python
## Legacy WORKSPACE — toolchains registered ad hoc, verbose per consumer
scala_deps = use_extension(...)
[(use_repo(scala_deps, repo) for repo in repos)]
[(register_toolchains(t) for t in toolchains)]   # scattered, per-repo
```

```python
## Bzlmod, toolchainized
bazel_dep(name = "rules_scala", version = "7.0.0")
scala_deps = use_extension("@rules_scala//scala/extensions:deps.bzl", "scala_deps")
scala_deps.scalafmt()
scala_deps.scalatest()
use_repo(scala_deps, "rules_scala_toolchains")     # one hub repo
register_toolchains("@rules_scala_toolchains//...:all")   # one line, in MODULE.bazel
```

Three collaborating pieces make this work, and the shape generalizes to any extension that used to `native.register_toolchains()`:

1. A macro (`scala_toolchains`) instantiates every dependency repo a configured toolchain needs, then calls a repository rule that materializes a hub repo.
2. That repository rule (`scala_toolchains_repo`) generates the `BUILD` files for every enabled toolchain inside the hub.
3. The module extension (`scala_deps`) is a thin tag-to-parameter translator that calls the macro — the extension itself never touches `register_toolchains`.

The consumer's `MODULE.bazel` ends up with exactly one `use_repo(...)` and one `register_toolchains(...)` line regardless of how many toolchains the extension configures — the complexity moves from every consumer to the extension's maintainer, once.

### 8. `facts`/`facts_version`: reproducibility without a checksum

New in Bazel 9.0.0 — absent from the 8.3.0 through 8.8.0 release notes (checked; no hits). From `extension_metadata`'s parameters:

> "`facts` — A JSON-like dict that is made available to future executions of this extension via the `module_ctx.facts` property. Multiple versions may be shallowly merged." ([module_ctx](https://bazel.build/rules/lib/builtins/module_ctx))

The extension guide's example: cache a version→(URL, checksum) mapping fetched once from the network, so subsequent evaluations skip the fetch entirely and become reproducible even without a hardcoded checksum in the extension's own source. The trap: "`facts` are not invalidated even when the code of your module extension changes... If you need to make a backwards-incompatible change to the schema... set `facts_version`... to a higher integer" — Bazel discards persisted facts only when that integer changes, never on a code diff alone ([extension.md](https://bazel.build/external/extension#specify_reproducibility)).

### 9. The docs page itself is stale on this exact API

`bazel.build/external/repo` (fetched raw 2026-09-05 from `bazelbuild/bazel@master`) still describes only the pre-8.3 contract:

> "The function returns either `None` to signify that the rule is reproducible given the specified parameters, or a dict with a set of parameters for that rule that would turn that rule into a reproducible one..."

`repository_ctx.repo_metadata()` — introduced 8.3.0, the API every Bazel-9 cache actually keys off — is **not mentioned anywhere on that page**. This is the map's conflict 8 pattern (a `bazel.build` prose page is not automatically current) showing up concretely in this exact dive: the only sources that describe `repo_metadata()` correctly are the auto-generated builtin API reference (`/rules/lib/builtins/repository_ctx`), the release notes, and the source. An agent that reads only `/external/repo` will keep writing repo rules against the superseded contract.

## Decisions

**Decision 1 — is the static grep sufficient, or does it need a two-run lockfile diff behind it?**
Neither alone. **Adopted:** the grep (`grep -n 'ctx\.os\.\|ctx\.getenv\(' <extension>.bzl` empty) is a cheap MUST-level static gate, kept because it is measured (§ Fleet evidence) and catches the common mistake — but it is scoped to the file grepped and proves nothing about a `load()`ed helper. **Extend it**, don't replace it: also grep every `.bzl` file the extension `load()`s (enumerable via `bazel query 'buildfiles(@<ext_repo>//...)'` or a recursive `load(` scan) for the same pattern. A true dynamic check needs a second step the brief's candidate can't do as stated: because `reproducible = True` excludes the extension from `MODULE.bazel.lock`, there is nothing to diff across two runs *while the flag is set*. The dynamic check is therefore: temporarily comment out `reproducible = True`, run `bazel mod deps --lockfile_mode=update` once, change something the purity claim says shouldn't matter (a `--repo_env` value, or run on a different OS/CI runner), run again, and diff the `bzlTransitiveDigest`/`generatedRepoSpecs` for that extension's lockfile entry — an unexpected diff means the claim was false. **Assumption named:** this dynamic check is reasoned from the documented lockfile mechanics (§ Finding 4), not measured against a live two-run experiment in this dive (no `bazel` binary was available in the research sandbox) — grade it CONSIDER, not MUST, until someone runs it once against a real extension and records the result.

**Decision 2 — does the remote-cache exclusion rule out `rules_ocx`'s own repository rules?**
**Yes, unconditionally, and independent of the extension's purity.** `rules_ocx` has 9 `getenv` sites and 4 `watch`/`watch_tree` sites across its repository rules ([starlark-code-shape.md §2](../bazel-audit/starlark-code-shape.md)); the discussion's own eligibility test (the `.marker` file having more than one line) will read positive for every one of them, which alone disqualifies them from `--experimental_remote_repo_contents_cache` regardless of whether they also return `repo_metadata(reproducible=True)`. **Assumption:** this is read directly off the feature's stated restriction, not measured against a live fetch (no Bazel 9 binary available); it would need re-confirming once the fleet's pin moves off 8.7.0.

**Decision 3 — is 0/4 `repo_metadata()` calls in `rules_ocx` a defect?**
**No, not today.** `repo_metadata()` requires Bazel 8.3.0+; `rules_ocx` pins 8.7.0, which does have it, but the caches it feeds (`--repo_contents_cache` locally, the experimental remote one) are new enough, and `rules_ocx`'s own repo rules `ctx.execute` the ocx CLI rather than `ctx.download`, that adopting it was never forced. **Assumption:** treated as a forward-looking opportunity (stated in Normative guidance candidate 4), not a present violation — record it as such so a later wave doesn't re-flag it as a gap the fleet "missed."

## Normative guidance candidates

1. **A module extension's implementation function MUST NOT call `ctx.os`/`module_ctx.os` or `.getenv()` directly.** Rationale: this is exactly the purity boundary `reproducible = True` claims to hold, and nothing else checks it — an impure impl marked reproducible produces silently divergent repos with no lockfile signal. Verify: `grep -n 'ctx\.os\.\|ctx\.getenv\(' <extension>.bzl` — matches any param name ending `ctx` (`ctx`, `module_ctx`, `rctx`...) because it's a substring match. Empty = pass. Bazel: all Bzlmod-era (6+). Settles: M-B-05.
2. **Also grep every `.bzl` file the extension `load()`s, not just the extension file itself.** Rationale: candidate 1 is scoped to one file; a purity violation reached through an imported helper evades it entirely. Verify: enumerate loads with `bazel query 'buildfiles(@<ext-owning-repo>//...)'` or a recursive text scan of `load(` targets, then re-run candidate 1's grep on each. Empty across the closure = pass; any hit outside the extension's own repository-rule files = finding. Bazel: all. Settles: M-B-05.
3. **A module extension whose impl is a pure function of tags MUST return `module_ctx.extension_metadata(reproducible = True)`.** Rationale: skipping the opt-in pays the lockfile-churn and merge-conflict cost (every tag/env change rewrites the extension's lockfile entry) for zero benefit. Verify: `grep -n 'extension_metadata' <extension>.bzl` and confirm `reproducible = True` appears in the call. Empty (or `reproducible` absent/`False`) while candidate 1's grep is also empty = a missed opt-in, a finding. Bazel: 6+ (any Bzlmod). Severity: SHOULD (declaring it is a choice, not purely mechanical — an author may deliberately want lockfile visibility). Settles: M-B-06.
4. **A repository rule intended to benefit from either Bazel-9 repo-contents cache MUST return `repository_ctx.repo_metadata(reproducible = True)` from its `_impl`, not rely on an implicit `return None`.** Rationale: the pre-8.3 implicit contract grants neither `--repo_contents_cache` nor `--experimental_remote_repo_contents_cache` eligibility — only the explicit `repo_metadata()` object does. Verify: `grep -n 'repo_metadata' <repo_rule_file>.bzl`. Empty while the rule is otherwise deterministic = the rule refetches into the cache every time and never hits it. Bazel: 8.3.0+ (introduced), read as CONSIDER on 8.3–8.7 since the local cache defaulted off for part of that range (§ Contested), MUST once the pin reaches a version where `--repo_contents_cache` is confirmed on. Settles: M-B-06 (adjacent to M-B-19).
5. **Do not assume a repository rule with `repository_ctx.watch()` or `.getenv()` calls is eligible for `--experimental_remote_repo_contents_cache`, even if it returns `repo_metadata(reproducible=True)`.** Rationale: the feature's own FAQ excludes "repo rules without any dependencies added at runtime" — `watch`/`getenv` are explicitly named as disqualifying. Verify: read `$(bazel info output_base)/external/@<repo_name>.marker` after a fetch — any line after the first is a runtime dep and disqualifies the repo. Empty (one line only) = eligible. Bazel: 9.0.0+, experimental. Settles: M-B-06.
6. **Never instantiate a repository and `load()` a `.bzl` file from it inside the same module extension.** Rationale: produces the hard failure `Circular definition of repositories generated by module extensions or files in external repositories` — not a warning, a build-breaking error, and the message alone rarely points a reader at "split into two extensions." Verify: reading heuristic — inside one `.bzl` file defining a `module_extension`, does any `load()` statement target a label whose repo (`@<name>`) is generated by a `repository_rule` call in that same file's own `_impl`? A grep proxy: `grep -n '^load(' <ext>.bzl` cross-checked against the repo names the same file's `_impl` calls a `repository_rule` with. No such overlap = pass. Bazel: all Bzlmod. Settles: M-B-10.
7. **When the circular-repo error does fire, fix it by splitting into two extensions (or a shared plain `.bzl` with no repo dependency), never by trying to reorder statements within one impl function.** Rationale: the cycle is structural (Skyframe dependency graph), not statement-order — reordering cannot fix it. Verify: the split compiles and `bazel mod deps` evaluates both extensions cleanly. Bazel: all Bzlmod. Settles: M-B-10.
8. **Never call `native.register_toolchains()` or `native.bind()` inside a module extension implementation.** Rationale: both raise a hard error under Bzlmod; `register_toolchains()`/`register_execution_platforms()` are `MODULE.bazel`-only. Verify: `grep -n 'native\.register_toolchains\|native\.bind(' <extension>.bzl`. Empty = pass. Bazel: all Bzlmod. Settles: M-B-11.
9. **When an extension needs to register a toolchain, toolchainize it: generate one hub repo inside the extension holding every toolchain target and its dependency repos, `use_repo()` the hub from `MODULE.bazel`, and put `register_toolchains("@hub//...")` in `MODULE.bazel`, never inside the extension.** Rationale: moves per-consumer verbosity to a single maintainer-owned pattern and is the only shape that satisfies candidate 8 while still registering a toolchain. Verify: reading heuristic — `MODULE.bazel` carries a `register_toolchains(...)` line paired with a `use_repo(<ext>, "<hub-repo>")` for the same extension. Absent `register_toolchains` while the extension clearly ships a toolchain (a `toolchain()` target in its generated `BUILD` content) = a finding — likely means toolchains are silently never registered. Bazel: all Bzlmod. Settles: M-B-11.
10. **Don't cite a cache-eligibility rule, a flag default, or a repo-rule-return contract from `bazel.build/external/repo` or `/external/extension` prose alone when it concerns something introduced since Bazel 8.3.** Rationale: `/external/repo` does not mention `repository_ctx.repo_metadata()` anywhere as of 2026-09-05 — a genuine docs-lag on the exact API these caches key off. Verify: cross-check any claim about `repo_metadata`/`repo_contents_cache` against `bazel help all --long | grep -A6 repo_contents_cache` on the pinned version, the release notes for the exact minor that introduced it, or the source (`RepositoryOptions.java`). Bazel: 8.3+/9. Severity: MUST for anyone authoring guidance; SHOULD for a reviewer spot-checking a claim already written. Settles: M-B-06.
11. **Do not assume `--repo_contents_cache` is on by default just because a changelog entry says "Added a new flag ... defaults to ...".** Rationale: it shipped on-by-default in 8.3.0, was walked back to opt-in in 8.4.0 after a real regression (#26450: `archive_override` stripped non-directory files from the unpacked archive), and the 9.0.0 notes restate the original line as part of a cumulative summary with no mention of the interim flip — reading only 9.0's notes hides the history. Verify: read the live default with `bazel help all --long | grep -A6 '^  --repo_contents_cache'` on the exact pinned Bazel version — don't trust one changelog line in isolation. Empty grep output means the flag doesn't exist on that Bazel version at all (pre-8.3), not that caching is off. Bazel: 8.3.0–9.x, version-dependent, dated 2026-09-05. Severity: CONSIDER (a reading discipline, not a repo-level check). Settles: M-B-06.
12. **An extension that persists non-checksummed network data via `facts` MUST bump `facts_version` on any incompatible change to that data's shape.** Rationale: `facts` survive an extension code change untouched — an old, incompatibly-shaped fact dict silently feeds new code unless the version integer changes. Verify: `grep -n 'facts_version' <extension>.bzl` next to any `extension_metadata(facts = ` or `module_ctx.facts` usage. A `facts`-using extension with no `facts_version` bump history = a finding once its facts schema changes. Bazel: 9.0+ only (absent from 8.3–8.8 release notes, confirmed by search). Settles: M-B-06 (adjacent).
13. **An extension that genuinely must read host OS/arch inside its own impl (rather than deferring to a repository rule) MUST set `os_dependent`/`arch_dependent` on `module_extension()`, and MUST NOT also claim `reproducible = True`.** Rationale: the two are contradictory signals — `os_dependent`/`arch_dependent` exist specifically to force re-evaluation on a host change, which is the opposite of "same inputs, same repos" that `reproducible` asserts. Verify: reading heuristic — does the impl branch on `ctx.os`/arch anywhere (candidate 1's grep, this time expected non-empty) while `reproducible = True` is also set? Both true simultaneously = a finding. Bazel: all Bzlmod. Settles: M-B-05 (corollary).
14. **A repository rule that opts into either Bazel-9 cache and later stops being reproducible (a new non-checksummed fetch, a new `getenv` call) must drop `repo_metadata(reproducible=True)` in the same change.** Rationale: a stale reproducibility claim after the rule changes shape is worse than never having made one — it actively poisons the cache with a plausible-looking but wrong result, and no test catches this because the cache itself has no correctness oracle. Verify: pair review — any diff touching a `repository_rule`'s `_impl` that adds a `ctx.download` without `sha256`, a `ctx.getenv`, or a `ctx.watch` call must also touch its `repo_metadata(...)` call site, or justify why the claim still holds. No mechanical check found (grep can show the two changed, not whether the claim is still true) — reading heuristic only. Bazel: 8.3+. Settles: M-B-06.
15. **When inspecting what a `reproducible = True` extension actually produced, don't look in `MODULE.bazel.lock` — it isn't there.** Rationale: candidate 3's opt-out is exactly what makes the extension invisible to the lockfile; an agent debugging "why didn't my extension pick up this change" by diffing the lockfile will find nothing and wrongly conclude the extension is broken or not running. Verify (reading heuristic, not a rule to enforce on code): use `bazel query @<generated_repo>//... --output=build` or `bazel mod show_repo <repo> --all_repos` to inspect the actual generated content instead. Bazel: all. Settles: M-B-06 (AI-agent-angle companion; also listed there).

## Fleet evidence

- **`rules_ocx`'s extension purity boundary is already correct and already documented.** `ocx/extensions.bzl:6-10` states in a source comment: "The implementation is a pure function of the tags — all host detection and environment access happens inside the repository rules — so the extension is marked reproducible and stays out of MODULE.bazel.lock." `extensions.bzl:331` returns `module_ctx.extension_metadata(reproducible = True)`. `grep -n 'module_ctx.os\|module_ctx.getenv' ocx/extensions.bzl` returns no output ([build-contracts-and-ci-posture.md:242](../bazel-audit/build-contracts-and-ci-posture.md)) — candidate 1 passes today.
- **Directly confirmed by reading the committed lockfile, not just asserted.** `rules_ocx/MODULE.bazel.lock`'s `moduleExtensions` map has exactly four keys (`pybind11_bazel`, `rules_fuzzing`, `rules_kotlin`, `rules_python`'s `pip_internal`) — `//ocx:extensions.bzl%ocx` is absent, matching the reproducible-extension exclusion documented in Finding 4.
- **0 of 4 repository-rule `_impl` functions (`ocx/private/download.bzl:28`, `package.bzl:155,367`, `project.bzl:130`) call `repository_ctx.repo_metadata()`** (0 hits across all three files) — none are eligible for `--repo_contents_cache` or the experimental remote cache today, independent of the fleet's Bazel-8.7.0 pin (§ Decision 3: not a defect, an unclaimed opportunity).
- **9 `getenv` sites and 4 `watch`/`watch_tree` sites** across the same repo rules ([starlark-code-shape.md §2](../bazel-audit/starlark-code-shape.md)) would disqualify them from the remote repo-contents cache specifically (candidate 5) even if `repo_metadata()` were added — the local cache (candidate 4) has no such restriction.
- **No `os_dependent`/`arch_dependent`/`facts`/`facts_version` usage anywhere in `extensions.bzl`** (0 hits) — consistent with both `download` sites carrying `sha256` ([starlark-code-shape.md](../bazel-audit/starlark-code-shape.md)), so the checksum-free `facts` escape hatch (Finding 8) was never needed.
- **No circular-repo or toolchainization trap present**: `rules_ocx` has one module extension with 4 tag classes and no toolchain registration at all (0 `register_toolchains`/`native.bind` calls anywhere in the repo) — candidates 6-9 are inert here, not because the fleet solved them, but because the shape never arises. Both candidates remain P0 for shape F (a future Bazel-adopting monorepo), per the topic map's shape legend.
- `AGENTS.md:65` states the same purity invariant in prose ("Extension impls: no `module_ctx.os`, no getenv — repository rules only") with, per `config-inventory.md #15`, "No lint/query named that would catch a violation mechanically" beyond the ad hoc grep this dive formalizes as candidate 1 — the rule closes that gap.

## AI-agent angle

- **Copying the `/external/repo` return-value example verbatim on Bazel 9.** The canonical repo-rule page still shows `return None` / `return {...}` as the reproducibility contract. An agent that follows it writes a repo rule that compiles and runs fine but never becomes eligible for either Bazel-9 cache. Mechanical check: does the repo-rule file contain `repo_metadata` at all? If the codebase targets Bazel ≥8.3 and the answer is no, that's a missed opt-in, not a bug — but worth flagging (candidate 4).
- **Conflating `extension_metadata(reproducible=True)` with `repo_metadata(reproducible=True)`.** They sound like the same flag; they are two different objects on two different context types, gating two different things (lockfile exclusion vs. cache eligibility). An agent that sees one and assumes the other is also satisfied will misdiagnose a cache miss. Mechanical check: grep for both names separately; one being present says nothing about the other.
- **Debugging a "stale" reproducible extension by diffing `MODULE.bazel.lock`.** Since the extension is excluded from the lockfile by design, an agent will find no entry, and may wrongly conclude the extension never ran or Bzlmod is broken. Mechanical check: use `bazel query @<repo>//...` or `bazel mod show_repo` instead (candidate 15); the absence of a lockfile entry is expected, not a symptom.
- **Reordering statements to "fix" a circular-definition error.** The error message's dependency-cycle diagram looks like an ordering problem; an agent will often try moving the `load()` earlier or later in the file. This cannot work — the cycle is a Skyframe dependency-graph property, not source order. Mechanical check: does the fix touch which extension a repo-instantiating call lives in (a real structural split), or only the position of statements within one file? The latter is a giveaway that the fix didn't land.
- **Calling `register_toolchains()` from inside a module extension because a WORKSPACE-era macro did.** A WORKSPACE macro calling `native.register_toolchains()` is a completely normal, working pattern pre-Bzlmod; an agent porting it mechanically into a module extension's `_impl` hits a hard error that gives no "did you mean MODULE.bazel" hint. Mechanical check: candidate 8's grep, run specifically as part of any WORKSPACE→Bzlmod port.
- **Trusting a Bazel-9 changelog line for a flag's *current* default in isolation.** The 9.0.0 release notes restate `--repo_contents_cache`'s original "Added ... defaults to" line from 8.3.0 without the 8.4.0 walkback; an agent citing only the 9.0.0 notes will state the flag is on by default without knowing it was off for a stretch and needs the live version's `--help` output to confirm. Mechanical check: candidate 11.
- **Assuming Bazel-9-only `facts`/`facts_version` exist on Bazel 8.** An agent porting a Bazel-9 extension pattern back to `rules_ocx`'s pinned 8.7.0 (or any 8.x) would hit an unknown-parameter error on `facts=` in `extension_metadata()`. Mechanical check: `bazel version` against the release notes floor (9.0.0) before using either parameter.

## Contested / evolving

- **Whether `--repo_contents_cache` is on by default right now, at 9.2.0/8.8.0.** The tagged 9.0.0 source's `defaultValue = "null"` plus its own help text ("otherwise the default of `{--repository_cache}/contents` is used") reads as on-by-default, matching its original 8.3.0 introduction — but the 8.4.0 walkback (#26450) shows this default has already flipped once for a real regression, and 8.8.0's release notes list three more repo-contents-cache bug fixes (`#29073`, `#29082`, `#29084`, `#30101`), which is the kind of continued investment consistent with a feature exercised by default. No source found states outright "re-enabled in version X" — this dive states the fact chain and leaves the live-default verification (`bazel help all --long`) to whoever is on the actual pinned version, rather than assert a number this research pass couldn't run `bazel` to confirm.
- **The remote repo-contents cache's runtime-dependency restriction is explicitly temporary.** The discussion's own FAQ says "we hope to lift this restriction in the future" — as of 2026-09-05 it is still `--experimental_*` with no graduation date found in any 8.x or 9.0.0 release notes. Trending toward relaxation; re-check before treating candidate 5 as permanent.
- **`facts`/`facts_version` is too new (9.0.0, 2026-01-20) for any practitioner corpus to have weighed in on.** No blog, BazelCon talk, or GitHub issue discussing real-world `facts` usage patterns was found in this pass — the only source is the reference doc itself. Treat candidate 12 as CONSIDER until a real usage example surfaces.
- **The EngFlow toolchainization pattern is a single vendor's worked example (`rules_scala`), not a Bazel-team-endorsed idiom with its own reference page.** `bazel.build` itself does not name "toolchainization" as a term; the pattern is real and the restriction it works around (candidate 8) is canonical, but the specific three-piece hub-repo shape (candidate 9) is argued, not normative. Grade candidate 9 SHOULD, not MUST, on that basis.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [bazel.build/external/extension](https://bazel.build/external/extension) | Bazel doc: module extension guide, incl. "Specify reproducibility and use facts" best practice | fetched 2026-09-05, content dated ~2025 | Primary source for `reproducible=True`'s exact promise and the `facts`/`facts_version` mechanism |
| [bazel.build/external/repo](https://bazel.build/external/repo) | Bazel doc: repository rule reference | fetched 2026-09-05 | Primary, but stale on `repo_metadata()` — direct evidence for Finding 9 / candidate 10 |
| [bazel.build/external/lockfile](https://bazel.build/external/lockfile) | Bazel doc: `MODULE.bazel.lock` structure | fetched 2026-09-05 | Primary source for `bzlTransitiveDigest`/`usagesDigest` semantics and the reproducible-extension exclusion |
| [bazel.build/external/migration](https://bazel.build/external/migration) | Bazel doc: WORKSPACE→Bzlmod migration guide, "Register toolchains" and "Bind targets" sections | fetched 2026-09-05 | Primary, canonical citation for `native.register_toolchains`/`native.bind` being unavailable in an extension, with before/after code |
| [bazel.build/rules/lib/builtins/module_ctx](https://bazel.build/rules/lib/builtins/module_ctx) | Auto-generated Starlark API reference | fetched 2026-09-05 | Primary source for `extension_metadata()`'s exact parameter list and defaults |
| [bazel.build/rules/lib/builtins/repository_ctx](https://bazel.build/rules/lib/builtins/repository_ctx) | Auto-generated Starlark API reference | fetched 2026-09-05 | Primary source for `repo_metadata()`'s exact parameters, incl. the "local repo rules are never cached" caveat |
| [Bazel 9.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/9.0.0) | GitHub release, "External Dependencies" section | 2026-01-20 | Primary; names `--repo_contents_cache`, `facts`, and `--experimental_remote_repo_contents_cache` with exact wording |
| [Bazel 8.3.0 / 8.4.0 / 8.8.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/8.3.0) | GitHub releases | 2026 (8.3.0 earliest, 8.8.0 current Maintenance) | Primary; establishes the introduction (8.3.0), default walkback (8.4.0, #26450), and ongoing fixes (8.8.0) that the 9.0.0 notes alone don't show |
| [GitHub discussion #27509](https://github.com/bazelbuild/bazel/discussions/27509) | Official Bazel-team feedback thread for the experimental remote repo-contents cache | opened alongside 9.0.0, 2026 | Primary; the *only* source with the exact runtime-dependency exclusion wording and the `.marker`-file verification method |
| [`RepositoryOptions.java` @ 9.0.0](https://github.com/bazelbuild/bazel/blob/9.0.0/src/main/java/com/google/devtools/build/lib/bazel/repository/RepositoryOptions.java#L55-L71) | Bazel source, the `@Option` definition for `--repo_contents_cache` | tagged 9.0.0 | Primary; the flag's actual default logic, more authoritative than any prose page |
| [`BzlmodRepoCycleReporter.java`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/skyframe/BzlmodRepoCycleReporter.java#L139) | Bazel source, the cycle-error message generator | master, 2026 | Primary; exact error string for "Circular definition of repositories" |
| [`ModuleExtensionResolutionTest.java`](https://github.com/bazelbuild/bazel/blob/master/src/test/java/com/google/devtools/build/lib/bazel/bzlmod/ModuleExtensionResolutionTest.java#L1605) | Bazel source, the test suite reproducing the circular-repo error | master, 2026 | Primary; minimal, exact reproduction case and full error output used verbatim in Finding 5 |
| [EngFlow: Migrating to Bzlmod — Module Extensions](https://blog.engflow.com/2025/01/16/migrating-to-bazel-modules-aka-bzlmod---module-extensions/) | Practitioner migration blog | 2025-01-16 | Secondary but load-bearing; the only source found with `rules_scala`'s real circular-definition failure and its fix in context |
| [EngFlow: Migrating to Bzlmod — Toolchainization](https://blog.engflow.com/2025/05/14/migrating-to-bazel-modules-aka-bzlmod---toolchainization/) | Practitioner migration blog | 2025-05-14 | Secondary; the only source found naming and demonstrating the toolchainization pattern end to end |
| [`rules_ocx/ocx/extensions.bzl`](file:///home/mherwig/dev/rules_ocx/ocx/extensions.bzl) (`:6-10`, `:331`) | Fleet source | current | The fleet's own worked positive example — purity boundary documented in a comment, `reproducible = True` in practice |
| [`rules_ocx/MODULE.bazel.lock`](file:///home/mherwig/dev/rules_ocx/MODULE.bazel.lock) | Fleet-generated lockfile | current | Measured proof that a `reproducible = True` extension gets no `moduleExtensions` entry, and the exact field names (`bzlTransitiveDigest` etc.) used in a real lock |
| [`bazel-audit/starlark-code-shape.md`](../bazel-audit/starlark-code-shape.md), [`build-contracts-and-ci-posture.md`](../bazel-audit/build-contracts-and-ci-posture.md), [`config-inventory.md`](../bazel-audit/config-inventory.md) | Wave-1 grounding audits of `rules_ocx` | 2026-09-05 | Fleet evidence for every claim in § Fleet evidence — file:line citations already re-derived here where load-bearing |

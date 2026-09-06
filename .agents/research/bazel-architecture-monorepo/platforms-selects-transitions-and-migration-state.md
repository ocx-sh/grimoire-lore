---
title: Platforms, selects, transitions and migration state
topic: platforms-selects-transitions-and-migration-state
group: bazel-architecture-monorepo
family: BZL-ARCH
agent: bazel-architecture-monorepo/platforms-selects-transitions-and-migration-state
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 20
primary_sources_count: 15
settles: [M-G-07, M-G-08, M-G-09, M-G-10, M-G-14, M-G-15, M-G-16, M-G-17, M-G-18, M-G-19, M-G-20]
scope: >
  Covers: the platform/constraint model vs. select()-on-raw-flags, why transition
  migration is the hard half of a platforms migration, the transition-induced
  configured-target explosion and how to actually measure it (the docs' own
  documented TODO), and the migration-state standards for a half-Bazel repo
  (source of truth, the Bazel-visible boundary, dual-CI-green, shared output
  directories, submodules, checked-in generated code). Does not cover
  target/package granularity or visibility (sibling dive
  package-granularity-visibility-and-generation), Bzlmod/lockfile mechanics
  (bazel-bzlmod-and-repo-rules group), or per-language ruleset internals
  (rules_js, rules_rust, etc. — cited here only for the migration pattern).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The platform/constraint model and `target_compatible_with`](#1-the-platformconstraint-model-and-target_compatible_with)
   2. [Why `select()` on raw flags is the legacy path](#2-why-select-on-raw-flags-is-the-legacy-path)
   3. [Why migrating transitions is the harder half](#3-why-migrating-transitions-is-the-harder-half)
   4. [The exponential configured-target explosion](#4-the-exponential-configured-target-explosion)
   5. [Measuring the explosion: aquery's blind spot and the cquery fix](#5-measuring-the-explosion-aquerys-blind-spot-and-the-cquery-fix)
   6. [`ctexplain`: Bazel's own half-finished answer to its own TODO](#6-ctexplain-bazels-own-half-finished-answer-to-its-own-todo)
   7. [Path mapping as an emerging alternative to a reset transition](#7-path-mapping-as-an-emerging-alternative-to-a-reset-transition)
   8. [Migration state: source of truth for dependencies and the IDE](#8-migration-state-source-of-truth-for-dependencies-and-the-ide)
   9. [Migration state: proving both systems stay green](#9-migration-state-proving-both-systems-stay-green)
   10. [The Bazel-visible boundary: `.bazelignore`, `REPO.bazel`, and a live fleet bug](#10-the-bazel-visible-boundary-bazelignore-repobazel-and-a-live-fleet-bug)
   11. [The shared-output-directory constraint](#11-the-shared-output-directory-constraint)
   12. [Submodules and checked-in generated code as migration-state signals](#12-submodules-and-checked-in-generated-code-as-migration-state-signals)
3. [Decisions](#decisions)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Fleet evidence](#fleet-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Model multi-platform variation with `platform`/`constraint_value`/`target_compatible_with`; `select()` keyed on raw flags (`values = {"cpu": ...}`) is the legacy path because it "doesn't understand `--platforms`" ([bazel.build/concepts/platforms@8.7.0](https://bazel.build/versions/8.7.0/concepts/platforms)).
- Bazel's own migration doc calls transition migration, not `select()` migration, **"the biggest challenge"** of moving a rule set to platforms — a `select()` rewrite is mechanical (swap `values=` for `constraint_values=`); a transition rewrite means finding and changing every `.bzl` function that returns a legacy-flag output key.
- The current live docs (`bazel.build/concepts/platforms`, fetched 2026-09-05) have quietly dropped the "Migrating to Platforms" title and the "biggest challenge" language that the version-pinned 8.7.0 snapshot still carries — platforms are now presented as the unmarked default, not an in-flight migration.
- A per-edge transition that never resets configuration at a dependency boundary produces `2^n` configured targets for a tree of depth `n`; the canonical docs end this exact section with `"TODO: Add strategies for measurement and mitigation of these issues"` ([bazel.build/extending/config](https://bazel.build/extending/config)).
- `aquery` cannot answer "did my transition double the action count" on its own: two actions whose output artifacts share the identical `execPath` under different configurations still print as separate entries — this is documented, not a bug.
- The confirmed working measurement (settling the wave-1 candidate): `bazel cquery 'deps(//path/to:target)' 2>/dev/null | awk '{print $1}' | sort | uniq -c | sort -rn` — any label with count > 1 is built under more than one configuration. This is exactly the algorithm Bazel's own `tools/ctexplain` "summary" analysis runs internally (grouping by `config_hash` per `label`).
- `ctexplain` is a real, actively-maintained (commit touching it 2026-09-04) tool inside Bazel's own source tree built for precisely this TODO — but 3 of its 4 analyses (`culprits`, `forked_targets`, `cloned_targets`, the ones that would name *which* flag caused the fork) print `"this analysis not yet implemented"` six years after being scaffolded; only `summary` works.
- Path mapping (`--experimental_output_paths=strip`) plus Bazel 7.4.0's action deduplication is the newer answer to "share a cacheable action across configurations that don't affect its output" — but the flag is still `off` by default and marked "highly experimental" in the current command-line reference.
- An outgoing transition that resets configuration to fix duplication has its own documented failure mode: anything genuinely downstream of the reset point silently gets the *wrong* value, not an error — the lucidsoftware demo repo shows this concretely.
- During a language migration onto Bazel, the language's own manifest (`Cargo.toml`, `pyproject.toml`+lockfile, `package.json`+lockfile) stays the declared source of truth for dependencies *and* the IDE — the IDE's own tool (`rust-analyzer`, Pyright, tsserver) reads that manifest, not the Bazel graph, and `crate_universe` explicitly ignores path dependencies so internal crates need hand-written BUILD deps regardless.
- Bazel does not read `.gitignore`; a directory excluded from git but not from `.bazelignore` is still fully visible to `bazel test //...`. `rules_ocx` hit this live: a missing `.agents/worktrees` entry let `bazel test //...` glob into a stale agent worktree's own `examples/` and fail.
- Bazel 8.0.0 added `REPO.bazel`'s `ignore_directories()` as a glob-capable successor to `.bazelignore`, explicitly "to provide a migration path off of" the older, glob-less file.
- A shared top-level `dist/` folder across `packages/*` cannot survive unmodified: Bazel requires a package's outputs to live under that package's own output directory, forcing either one large root `BUILD` file or restructuring each package's `dist/` beneath its own package (documented directly in `rules_js`'s own FAQ, a ruleset-neutral constraint of Bazel's output tree).
- No primary source names a standard "prove both build systems stay green" CI pattern; it is inferred from the source-of-truth decision, not documented anywhere as a named practice — flagged CONSIDER, not MUST.
- The fleet already has one correct, if invisible, example of the constraint-based platform model: `rules_ocx`'s `_ocx_package_hub_impl` generates `config_setting`s keyed on `constraint_values`, not raw flags — but because the whole thing is a Starlark string template writing another repo's `BUILD.bazel`, it is invisible to buildifier and to any rule that greps this repo's own `.bzl` files for `config_setting`.
- Two fleet repos (`ocx`, `grimoire`) vendor forks as git submodules; Bzlmod has no submodule-equivalent primitive — the closest analogue, `git_override`, requires the vendored fork to itself carry a `MODULE.bazel`.
- `creeptd-ng` checks in generated TypeScript (`web/src/gen/creeptd/**/*_pb.ts`) beside a documented single-source-of-codegen Rust crate, but the actual TS-generating step is unverified and has no `diff_test`-style regeneration gate.
- Ambiguous-match errors between a `values=`-keyed and a `constraint_values`-keyed `config_setting` in the same `select()` were reported upstream (bazelbuild/bazel#14604) but closed in 2022 with a possibly-superseding follow-up (#15575) — treat this as historical, not confirmed-current, behavior.

## Findings

### 1. The platform/constraint model and `target_compatible_with`

A platform is "a collection of `constraint_value`s" built from `constraint_setting`/`constraint_value` pairs; a platform may hold only one `constraint_value` per `constraint_setting` ([bazel.build/extending/platforms](https://bazel.build/extending/platforms)):

```starlark
platform(
    name = "linux_x86",
    constraint_values = [
        "@platforms//os:linux",
        "@platforms//cpu:x86",
    ],
)
```

`target_compatible_with` is the documented alternative to broad `select()` usage for marking a target incompatible with a platform: targets are silently skipped, not errored, "when they are considered incompatible and included in the build as part of a target pattern expansion" (e.g. `//...`); an *explicit* `bazel build //that:target` still errors unless `--skip_incompatible_explicit_targets` is set ([bazel.build/extending/platforms](https://bazel.build/extending/platforms)).

```starlark
cc_library(
    name = "win_driver_lib",
    srcs = ["win_driver_lib.cc"],
    target_compatible_with = [
        "@platforms//cpu:x86_64",
        "@platforms//os:windows",
    ],
)
```

The current live docs add a "More expressive constraints" pattern using `@platforms//:incompatible` (a value no platform satisfies) with `select()` to express OR/NOT logic on compatibility, and document a real gotcha in "Known Issues": **incompatible targets ignore visibility restrictions** ([bazel.build/concepts/platforms, fetched 2026-09-05](https://bazel.build/concepts/platforms)). The same page documents the verification command for this whole mechanism:

```
$ cat example.cquery
def format(target):
    if "IncompatiblePlatformProvider" not in providers(target):
        return target.label
    return ""
$ bazel cquery //... --output=starlark --starlark:file=example.cquery
```

C++ toolchain resolution via platforms is enabled by default **since Bazel 7.0** (tracked as [#7260](https://github.com/bazelbuild/bazel/issues/7260)); Android's equivalent (`--incompatible_enable_android_toolchain_resolution`) landed the same release ([#16285](https://github.com/bazelbuild/bazel/issues/16285)) — both per the version-pinned [bazel.build/concepts/platforms@8.7.0](https://bazel.build/versions/8.7.0/concepts/platforms). Go and Rust rules are stated as fully supporting platforms already; Apple rules "do not support platforms and are not yet scheduled for support" as of that same 8.7.0 snapshot.

### 2. Why `select()` on raw flags is the legacy path

The canonical `select()` example keys `config_setting` on built-in flags directly:

```starlark
config_setting(
    name = "x86_debug_build",
    values = {
        "cpu": "x86",
        "compilation_mode": "dbg",
    },
)
```

versus the constraint-based form:

```starlark
config_setting(
    name = "is_arm",
    constraint_values = ["@platforms//cpu:arm"],
)
```

The 8.7.0 migration page states the reason directly: **"select()s on --cpu, --crosstool_top, etc. don't understand --platforms. When migrating your project to platforms, you must either convert them to constraint_values or use platform mappings to support both styles during migration."** ([bazel.build/concepts/platforms@8.7.0](https://bazel.build/versions/8.7.0/concepts/platforms)). `select()` intentionally cannot match on a complete `platform`, only on individual `constraint_value`s — "This is intentional so select() supports as wide a variety of machines as possible" (same source). `bind()` is separately and unconditionally deprecated: **"First of all, do not use bind(). It is deprecated in favor of alias()"** ([bazel.build/configure/attributes](https://bazel.build/configure/attributes)) — a WORKSPACE-era relic with no Bzlmod relevance.

**`config_setting` sprawl as a missing-platform signal.** No primary source gives a numeric threshold for when a pile of `config_setting` targets should have been a `platform` instead — this is argued, not measured, in the wave-1 corpus (search-cluster read, cross-referenced against [bazelbuild/bazel#14604](https://github.com/bazelbuild/bazel/issues/14604)'s underlying platform/`select()` fragmentation). The mechanical smell that follows directly from §1's own model, though: several `config_setting`s in one package whose `values=`/`constraint_values=` all vary along an axis `@platforms` already provides (`@platforms//os`, `@platforms//cpu`) is redundant *re-derivation* of an existing constraint, not a legitimately new one — each such `config_setting` should instead reference the existing `@platforms//os:*`/`@platforms//cpu:*` value directly. A `config_setting` sprawl that varies along an axis `@platforms` does **not** provide is a legitimate custom `constraint_setting`, and the fix is to declare that setting once, not to keep adding raw-flag `config_setting`s for it one at a time.

### 3. Why migrating transitions is the harder half

The same 8.7.0 migration page states the difficulty ordering explicitly, for anyone who owns a rule set:

> "Ensure select()s and configuration transitions support platforms. **This is the biggest challenge.** It's particularly challenging for multi-language projects (which may fail if all languages can't read --platforms)."
> — [bazel.build/concepts/platforms@8.7.0, "Migrating your rule set"](https://bazel.build/versions/8.7.0/concepts/platforms)

The `select()` half is mechanical and greppable: swap `values = {"cpu": "arm"}` for `constraint_values = ["@platforms//cpu:arm"]`. The transitions half is not: a transition is Starlark code that returns a dict of output-setting values, and the specific failure mode is that a transition writing a **legacy** flag becomes invisible to any rule that only reads `--platforms`:

```python
# Before — invisible to platform-aware rules downstream
return {"//command_line_option:cpu": "arm"}

# After — the actual migration work, one call site at a time
return {"//command_line_option:platforms": "//:my_arm_platform"}
```

Finding every such call site requires reading transition implementations, not grepping BUILD files, because the same transition function may be attached to many targets via `cfg =`. `platform_mappings` exists as an explicit, named bridge for exactly this gap — but the docs are unusually blunt about its lifespan: **"Platform mappings is a temporary API... a blunt tool... Only use this if necessary, and expect to eventually eliminate it"** ([bazel.build/concepts/platforms@8.7.0](https://bazel.build/versions/8.7.0/concepts/platforms)). It lives in a `platform_mappings` file at the workspace root (or `--platform_mappings=//:my_custom_mapping`) and maps a `platform()` to a set of legacy flags or the reverse, applied consistently "including through transitions."

**Trend, dated:** the current live docs (`bazel.build/concepts/platforms`, fetched 2026-09-05, title now plain **"Platforms"**) have dropped this entire "Migrating your rule set" / "biggest challenge" / per-language Status table that the [version-pinned 8.7.0 snapshot](https://bazel.build/versions/8.7.0/concepts/platforms) (titled **"Migrating to Platforms"**) still carries in full. The migration framing itself is being retired from the docs — see [Contested / evolving](#contested--evolving).

### 4. The exponential configured-target explosion

The canonical transitions page's own worked example: a flag `--//foo:owner=<STRING>` combined with a transition that appends to it down each dependency edge produces, for a tree of depth `n`, `2^n` distinct configured targets of the shared leaf — "config.owner=" b₀b₁...bₙ" for all bᵢ in {0,1}"" — concluding **"This makes the build graph exponentially larger than the target graph, with corresponding memory and performance consequences,"** immediately followed by the literal, unresolved **"TODO: Add strategies for measurement and mitigation of these issues."** ([bazel.build/extending/config](https://bazel.build/extending/config))

The upstream tracker for the concrete symptom is [bazelbuild/bazel#14236, "Avoid action conflicts due to different configuration hashes"](https://github.com/bazelbuild/bazel/issues/14236) (filed by a real user, closed 2024-06-14 as completed): the same action, byte-for-byte, gets created under two different configuration hashes, and Bazel errors with an `ActionConflictException` naming both `ConfiguredTargetKey`s rather than silently sharing the output. The issue's own workaround section shows the trade-off directly — resetting the configuration to a fixed default at the input boundary avoids the conflict but throws away the transitioned value entirely for anything downstream (Case 3 in the issue: "Both versions of E are gone and both B and C link to an unintended default version"). A later comment on the same issue explicitly points at `ctexplain` as one of the follow-up efforts — see §6.

The [lucidsoftware/bazel-build-graph-explosion](https://github.com/lucidsoftware/bazel-build-graph-explosion) repo is a small, runnable demonstration built to make this concrete. Its four packages are a progression:

| Package | Change from previous | Result |
|---|---|---|
| `without_transitions` | — | every target built under one configuration |
| `with_incoming` | adds an incoming transition on `copy_file` | the shared `:file` target is built **twice**, once per configuration, with duplicated `"Generating static file..."` output on a real `bazel build` |
| `with_incoming_and_outgoing` | adds an outgoing transition that resets configuration on the `input` attribute | `:file` duplication is fixed, but a *second*, dynamic-content `static_file` (`dynamic-file`) that genuinely needs the transitioned value now gets the **wrong** value — the reset happens before the value can "reach" it |
| `with_incoming_and_path_mapping` | replaces the reset transition with path mapping + action dedup | both problems solved simultaneously — see §7 |

### 5. Measuring the explosion: `aquery`'s blind spot and the cquery fix

`aquery` "operates on the post-analysis Configured Target Graph" and is explicit about the exact failure mode the brief names: **"aquery operates on the pre-execution, post-analysis action graph, and hence treats these like separate actions whose output Artifacts have the exact same execPath. As a result, equivalent Artifacts appear duplicated."** ([bazel.build/query/aquery](https://bazel.build/query/aquery)) `aquery` output order is also explicitly unspecified — "In general, do not depend on the order of output" (same source) — so no script may count or diff aquery lines positionally.

**Decision (settling the wave-1 candidate):** counting distinct configuration hashes per target via `cquery` is confirmed as the right approach, and the exact working invocation is:

```
bazel cquery 'deps(//path/to:target)' 2>/dev/null \
  | awk '{print $1}' | sort | uniq -c | sort -rn
```

`cquery`'s default output already annotates every configured target as `label (confighash)` — confirmed directly from the official docs' own worked example, `//tree:ash (9f87702)` ([bazel.build/query/cquery](https://bazel.build/query/cquery)) — so grouping by the label column (`$1`) and counting is exactly "how many distinct configurations was this target built under." A count of 1 for every label is a **pass** (no duplication in this dependency closure); any label with count > 1 is the finding, and `bazel config <hash>` (accepting a unique prefix, git-short-hash style) dumps the full configuration for a closer look, while `bazel cquery "config(//path/to:target, <hash>)"` re-selects that exact configured target ([bazel.build/query/cquery](https://bazel.build/query/cquery)). `--transitions=lite|full` on a `cquery` shows the transition chain itself, `full` including the actual option diffs.

The lucidsoftware demo confirms this is also how practitioners actually look at the problem visually — its own README commands are `bazel cquery 'kind("_file rule$", //pkg:*)' --output graph | dot ...`, rendering the annotated build graph with a distinct configuration hash per node.

### 6. `ctexplain`: Bazel's own half-finished answer to its own TODO

**Chasing the surprise:** Bazel's own source tree already contains a purpose-built tool for the exact TODO the transitions doc leaves open. `tools/ctexplain` describes itself as **"a swiss army knife tool that tries to explain why build graphs are the size they are and how build flags, configuration transitions, and dependency structures affect that"** ([tools/ctexplain/ctexplain.py](https://raw.githubusercontent.com/bazelbuild/bazel/master/tools/ctexplain/ctexplain.py)), invoked as:

```
$ ctexplain -b "//mypkg:mybinary --define MY_FEATURE=1"
```

It shells out to a real `bazel` binary from the current working directory ([tools/ctexplain/bazel_api.py](https://raw.githubusercontent.com/bazelbuild/bazel/master/tools/ctexplain/bazel_api.py): `subprocess.run(..., cwd=os.getcwd())`), so it is usable against any repo, not only Bazel's own — but it ships **only** inside the `bazelbuild/bazel` source tree (no BCR module, no standalone release); using it means vendoring `tools/ctexplain/` out of a checkout plus `absl-py` and `frozendict`.

Its `--analysis=summary` (the default) computes exactly the metric derived by hand in §5 — grouping by `config_hash` per `label` — and reports it directly ([tools/ctexplain/analyses/summary.py](https://raw.githubusercontent.com/bazelbuild/bazel/master/tools/ctexplain/analyses/summary.py)):

```
Configurations: 3
Targets: 12
Configured targets: 15 (25% vs. targets)
Targets with multiple configs: 3
```

The surprise: the three analyses that would actually *name the culprit* — `culprits` ("shows which flags unnecessarily fork configured targets"), `forked_targets`, and `cloned_targets` — are each a one-line stub: `lambda x: print("this analysis not yet implemented")`. The file carries a 2020 copyright header and was still being touched as recently as **2026-09-04** (a same-era, unrelated dependency cleanup commit, [`0fc10749`](https://github.com/bazelbuild/bazel/commit/0fc10749)) — six years of active maintenance on the file, and the three analyses that answer "why" are still unimplemented. Only `summary` — "how big is the problem" — actually works.

### 7. Path mapping as an emerging alternative to a reset transition

The `with_incoming_and_path_mapping` package in the lucidsoftware demo shows a different fix than resetting configuration: enable path mapping (`--experimental_output_paths=strip`), mark the action `execution_requirements = {"supports-path-mapping": "1"}`, and — as of **Bazel v7.4.0** — actions whose *commands* become identical after path-stripping are deduplicated at execution time, reported as `"1 deduplicated"` in the build summary. This is the "best-of-both-worlds" case: `:file` is built once (not twice, as in `with_incoming`) *and* `:copied-dynamic-file` gets the correct, configuration-dependent value (unlike `with_incoming_and_outgoing`'s reset transition, which silently gave it the wrong one).

The flag itself is still explicitly experimental in the current CLI reference, unchanged since it was introduced for [GH-6526](https://github.com/bazelbuild/bazel/issues/6526):

> `--experimental_output_paths` — type `off or strip`, default `off`. "Which model to use for where in the output tree rules write their outputs, particularly for multi-platform / multi-configuration builds. **This is highly experimental.**"
> — [bazel.build/reference/command-line-reference, fetched 2026-09-05](https://bazel.build/reference/command-line-reference)

### 8. Migration state: source of truth for dependencies and the IDE

The Tweag Rust-workspace-with-Bazel post is explicit about which system stays authoritative during a migration: **"This allows us to have Cargo files as a single source of external dependencies, so when we need to add a new dependency, for example, we could just use `cargo add` and repin Bazel dependencies with `CARGO_BAZEL_REPIN=1 bazel sync --only=crate_index`."** ([tweag.io, 2023-07-27](https://www.tweag.io/blog/2023-07-27-building-rust-workspace-with-bazel/)) The same post names the concrete limitation that makes hand-authored BUILD deps unavoidable regardless: **"An important limitation is that crate_universe ignores path dependencies. This means we need to manually specify internal dependencies inside the workspace."** — corroborated independently by [rules_rust#1522](https://github.com/bazelbuild/rules_rust/issues/1522) and [discussion #2879](https://github.com/bazelbuild/rules_rust/discussions/2879), both still open threads on the two-lockfile drift problem as of the wave-1 scout's read.

The IDE half of the same decision follows mechanically, not from a Bazel doc: `rust-analyzer` reasons from `Cargo.toml`/`cargo check`, Pyright from `pyproject.toml`, tsserver from `package.json`/`tsconfig.json` — none of them read the Bazel graph. Anything visible only to Bazel (a `cargo_build_script`-only environment variable, a Bazel-only generated header) is therefore invisible to the IDE regardless of which system is "correct." The named pattern that keeps this from becoming two competing sources of truth: the language's manifest is edited by hand; the Bazel-side lockfile (`cargo-bazel-lock.json`, `requirements_lock.txt`, an `npm_translate_lock` pnpm-lock ingestion) is only ever regenerated from it, never hand-edited.

### 9. Migration state: proving both systems stay green

No primary source in this dive's reading list prescribes a named CI pattern for "prove the legacy build and Bazel both still pass during a migration." This is the honest gap the brief asks to be named as such, not papered over: the requirement follows logically from §8 (two systems both claim to build the same code; only a shared gate catches the day one silently stops representing what ships) but is not documented practice anywhere read for this dive. It is recorded here as a **CONSIDER**, not a MUST — see [Normative guidance candidates](#normative-guidance-candidates) #13.

### 10. The Bazel-visible boundary: `.bazelignore`, `REPO.bazel`, and a live fleet bug

`.bazelignore`'s exact contract, read from the primary source rather than a summary:

> "You can specify directories within the workspace that you want Bazel to ignore, such as related projects that use other build systems. Place a file called `.bazelignore` at the root of the workspace and add the directories you want Bazel to ignore, one per line. Entries are relative to the workspace root. The `.bazelignore` file does not permit glob semantics."
> — [bazel.build/run/bazelrc#bazelignore](https://bazel.build/run/bazelrc#bazelignore) (source: [site/en/run/bazelrc.md](https://raw.githubusercontent.com/bazelbuild/bazel/master/site/en/run/bazelrc.md))

Nowhere in that definition — or anywhere else in the docs read for this dive — does Bazel read or defer to `.gitignore`. This is exactly the fleet's own live bug, documented in `.agents/memory/hex.md:50-51`: without `.agents/worktrees` listed in `.bazelignore`, `bazel test //...` glob-expanded into a live agent worktree's own `examples/` directory and failed, even though that path has long been in `.gitignore`.

Bazel **8.0.0** shipped a second, glob-capable mechanism specifically to replace this one: `REPO.bazel`'s `ignore_directories()` directive, "just like `.bazelignore` does, but with glob semantics" ([bazel.build/run/bazelrc#bazelignore](https://bazel.build/run/bazelrc#bazelignore)). Its own PR description is explicit about the motive: **"This is done separately from `.bazelignore` to provide a migration path off of that weird single-purpose configuration file."** ([bazelbuild/bazel PR #24203](https://github.com/bazelbuild/bazel/pull/24203))

### 11. The shared-output-directory constraint

`rules_js`'s own FAQ documents this as a hard Bazel constraint, not a `rules_js`-specific limitation:

> "Bazel has a constraint that outputs for a given Bazel package (a directory containing a BUILD file) must be written under the corresponding output folder."
> — [aspect-build/rules_js, docs/faq.md](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/faq.md)

For a layout like

```
my-workspace/
├─ packages/
│  ├─ lib1/
│  └─ lib2/
└─ dist/
   ├─ lib1/
   └─ lib2/
```

there are exactly two options the FAQ names: (1) one `BUILD` file at `my-workspace` root — the only package that can write beneath `my-workspace/dist` — which "may get long, accumulate a lot of load statements, and the paths inside will be longer"; or (2) restructure so each package's own `dist/` lives beneath its own Bazel package (`packages/lib1/BUILD.bazel` outputting to `bazel-bin/packages/lib1/dist/`), "more Bazel-idiomatic," at the cost of updating any config (`tsconfig.json` `paths`, etc.) that still points at the old shared location. The FAQ's own suggested technique for keeping a legacy build working during that restructure: copy the config file into `bazel-bin` under a different path using [the `jq` rule](https://registry.bazel.build/modules/jq.bzl/latest/docs/jq/jq.bzl/jq) rather than editing the source config in place.

### 12. Submodules and checked-in generated code as migration-state signals

Two further migration-state signals surfaced directly in the fleet audit, unclaimed by any other wave-2 dive:

**Git submodules have no Bzlmod equivalent.** `ocx` and `grimoire` both vendor the same two forks (`ocx-sh/rust-oci-client`, `ocx-sh/docker_credential`) as git submodules; `ocx-mirror` vendors the entirety of `ocx` as a submodule and path-deps two directories deeper into *its* submodules ([fleet-bazel-readiness.md, Smells §2](../bazel-audit/fleet-bazel-readiness.md)). Bzlmod's closest primitive, `git_override(module_name=..., remote=..., commit=...)`, requires the vendored fork to itself declare a `MODULE.bazel` — it is not a drop-in replacement for "vendor an arbitrary git submodule," and none of the fleet's vendored forks currently do.

**Checked-in generated code needs a named generator and a regeneration gate.** `creeptd-ng/web/src/gen/creeptd/**/*_pb.ts` is checked-in protobuf-generated TypeScript; its Rust-side sibling crate documents itself as "the single Rust protoc source for the whole workspace" via a `build.rs` docstring, but the actual TS-generation step is a separate, unverified tool with no `diff_test`-style check that the checked-in file matches what regenerating it would produce ([fleet-bazel-readiness.md, Layout signals](../bazel-audit/fleet-bazel-readiness.md)). The documented, generalizable fix is Aspect's `write_source_files`/`diff_test` pattern — and `rules_ocx` itself already reimplements the identical shape by hand (`stardoc` + `diff_test` + a generated `update.sh` for its own docs), proof the pattern is not `rules_js`-specific.

## Decisions

**Decision 1 — the measurement is `cquery`, not `aquery`, and the exact invocation is confirmed.**
`bazel cquery 'deps(//path/to:target)' 2>/dev/null | awk '{print $1}' | sort | uniq -c | sort -rn`, reading any count > 1 as a target built under more than one configuration. Evidence: `cquery`'s own documented default output format already pairs each label with its configuration hash ([bazel.build/query/cquery](https://bazel.build/query/cquery)); `aquery` is documented to be structurally unable to answer this question because it renders same-`execPath` actions from different configurations as separate entries ([bazel.build/query/aquery](https://bazel.build/query/aquery)); and Bazel's own `tools/ctexplain` runs the identical algorithm internally as its (only working) `summary` analysis. Assumption named: this measures *configured-target* duplication, not *action* duplication directly — a duplicated configured target may still produce a byte-identical action that Bazel's own action-cache or a future path-mapping dedup collapses back down (§7); confirm with `bazel aquery` on the flagged label before treating it as wasted work.

**Decision 2 — the declared source of truth during a language migration is the language's own manifest, for both dependencies and the IDE.**
`Cargo.toml`/`pyproject.toml`+lockfile/`package.json`+lockfile stays hand-edited; the Bazel-side lockfile is one-way generated from it and never hand-edited. Evidence: Tweag's explicit recommendation and `CARGO_BAZEL_REPIN=1 bazel sync --only=crate_index` invocation ([tweag.io](https://www.tweag.io/blog/2023-07-27-building-rust-workspace-with-bazel/)); `crate_universe`'s documented path-dependency blind spot forcing manual BUILD declarations regardless; the general fact (not sourced to a Bazel doc, but mechanical) that no mainstream language-server reads the Bazel graph. Assumption named: this is the right default for a *migration in progress* — a repo that has fully committed to Bazel as the only build system may eventually flip the direction (generate the manifest from BUILD), which none of the fleet or the sources read here describe as a real, working pattern today.

**Decision 3 — the Bazel-visible boundary is enforced by `.bazelignore` (or, on Bazel 8+, `REPO.bazel`'s `ignore_directories()`), and the .gitignore assumption is named as false, not implied.**
Evidence: the primary `.bazelignore` doc's own definition never mentions `.gitignore` ([bazel.build/run/bazelrc#bazelignore](https://bazel.build/run/bazelrc#bazelignore)); the fleet's own committed `.bazelignore` and `hex.md:50-51` document a real, previously-live failure from assuming otherwise. Assumption named: `REPO.bazel`'s `ignore_directories()` is preferred only where glob semantics are actually needed (a wildcard, not a literal path) — plain literal-path exclusions have no documented reason to move off `.bazelignore` yet.

**Decision 4 — the shared-output-directory constraint is a MUST-decide before target granularity, not a detail to defer.**
Evidence: `rules_js`'s FAQ names exactly two resolutions, both requiring either a root-level `BUILD` file or a package restructure — there is no third option that preserves both a shared `dist/` and per-package `BUILD` files ([rules_js docs/faq.md](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/faq.md)). Assumption named: this is Bazel's output-tree design, not a `rules_js`-specific limitation, so the same two-option choice applies to any language whose existing tooling assumes a shared build-output root (a Python `dist/` from a shared `setup.py`, a Rust workspace's shared `target/`, etc.) — read here only through the one ruleset that documents it explicitly.

## Normative guidance candidates

Numbering is provisional (`BZL-ARCH-nn`); final IDs are assigned at consolidation across both `bazel-architecture-monorepo` dives.

1. **Model multi-platform variation with `constraint_value`-based `config_setting`/`target_compatible_with`, never `config_setting(values = {"cpu": ..., ...})` alone, once any rule in the graph resolves toolchains via `--platforms`.**
   Rationale: raw-flag `select()` "doesn't understand `--platforms`" and silently stops tracking reality once toolchain resolution flips over (C++ default since Bazel 7.0).
   Verify: `grep -rn 'config_setting' --include=BUILD* --include=*.bzl . | xargs grep -l 'values = {' | xargs grep -L 'constraint_values'` — any hit is a `config_setting` using only legacy flag values.
   Empty output = pass.
   Severity: MUST. Bazel 7+ (C++/Android default toolchain resolution); all rulesets.
   Settles: M-G-07.

2. **Never let a Starlark transition write a legacy flag key (`//command_line_option:cpu`, `:crosstool_top`, `:compiler`) in a repo where any consuming rule reads `--platforms`.**
   Rationale: the docs name this exact case as the reason transitions are "the biggest challenge" of a platform migration — the transitioned value becomes invisible downstream, not an error.
   Verify: `grep -rn '"//command_line_option:cpu"\|"//command_line_option:crosstool_top"\|"//command_line_option:compiler"' **/*.bzl`.
   Empty output = pass.
   Severity: MUST once the repo has flipped to platform-based toolchain resolution; SHOULD (flag as tech debt) during a mixed migration using `platform_mappings`. Bazel 7+.
   Settles: M-G-07, M-G-09.

3. **Treat the `select()` rewrite and the transition rewrite of a platforms migration as separately-estimated work, not one task — size the transition half by counting `.bzl` functions passed to a `cfg =` attribute, not by counting `select()` call sites.**
   Rationale: `select()` migration is mechanical and buildifier-visible; transition migration requires reading Starlark implementations one at a time, and the docs call it "the biggest challenge" for exactly this reason.
   Verify (reading heuristic, no tool): `grep -c 'select(' **/BUILD*` for the easy half; `grep -rn 'cfg = ' **/*.bzl` for the hard half's actual unit of work.
   Neither side reads as pass/fail — this is a planning heuristic.
   Severity: CONSIDER. All Bazel majors.
   Settles: M-G-07.

4. **Use `platform_mappings` only as a temporary bridge for a mixed legacy/platform-aware build; do not let it become the permanent mechanism.**
   Rationale: the docs call it "a temporary API... a blunt tool... expect to eventually eliminate it" in its own defining paragraph.
   Verify: `test -f platform_mappings && git log -1 --format=%ad -- platform_mappings` — a `platform_mappings` file untouched for over a year signals it has calcified rather than bridging an active migration.
   No file present = pass (nothing to migrate off).
   Severity: SHOULD. Bazel 6+ (feature is stable; the "temporary" framing is unchanged since introduction).
   Settles: M-G-07.

5. **Measure transition-induced configured-target duplication with `bazel cquery 'deps(//target)' 2>/dev/null | awk '{print $1}' | sort | uniq -c | sort -rn` before adding or debugging any custom transition.**
   Rationale: this is the confirmed-working, no-extra-tooling instance of the exact metric the canonical docs admit they don't yet prescribe (their own transitions page ends with a literal "TODO: Add strategies for measurement"), and it is the same algorithm Bazel's own `ctexplain --analysis=summary` runs.
   Verify: the command above; a label appearing with count > 1 is the finding.
   Every label at count 1 = pass (no duplication in this dependency closure).
   Severity: MUST whenever a repo defines a custom (non-native) transition. All Bazel majors — `cquery`'s label+hash output format predates Bzlmod.
   Settles: M-G-09, M-G-10.

6. **Never infer "did my transition double the action count" from `aquery` output alone; group by `ActionKey`, not by output path or line count.**
   Rationale: `aquery` documents that two actions whose outputs share the identical `execPath` under different configurations still render as separate entries — a naive line-count or path-based dedup silently under- or over-counts.
   Verify (negative check, reading heuristic): no script in the repo parses `aquery --output=text` positionally or counts its lines as a proxy for unique actions; a script that does is the finding.
   Absence of such a script = pass.
   Severity: MUST for any tooling built around `aquery`. All Bazel majors.
   Settles: M-G-10.

7. **Where the repo already has more than a handful of custom transitions and `cquery`-based ad hoc scripting stops being enough, vendor `tools/ctexplain` from a `bazelbuild/bazel` checkout and run `--analysis=summary` rather than reinventing the metric.**
   Rationale: it is Bazel's own purpose-built, actively-maintained answer to the exact TODO in its own docs, and reimplementing its grouping logic ad hoc risks missing edge cases the upstream tool already handles.
   Verify: `python3 ctexplain.py --analysis=culprits -b "..."` printing the literal `"this analysis not yet implemented"` string is confirmation you're still on the unimplemented path for anything beyond `summary` — do not build tooling that depends on `culprits`/`forked_targets`/`cloned_targets` today.
   N/A (adoption guidance, not a pass/fail check).
   Severity: CONSIDER — no BCR module, no released binary; must be vendored from source. All Bazel majors (the tool shells out to whatever `bazel` is on `PATH`).
   Settles: M-G-10.

8. **Before adding an outgoing transition purely to fix duplicate builds, check whether anything downstream of the reset point actually needs the transitioned value — a reset transition silently returns the *wrong* value there, not an error.**
   Rationale: the lucidsoftware demo shows exactly this: `copied-dynamic-file`'s output reads `"The setting is foo."` instead of `"The setting is bar."` once the naive reset-transition fix is applied, with no error or warning.
   Verify: for every target reachable through the reset boundary, confirm its output does not depend on the value being reset — a `select()` or `config_setting` reading that same setting anywhere downstream of the reset is the smell.
   No such downstream reader = pass.
   Severity: MUST review before shipping a reset transition as "the fix." All Bazel majors.
   Settles: M-G-09.

9. **Do not adopt `--experimental_output_paths=strip` (path mapping) as a production default; it remains "highly experimental," default `off`, unchanged in scope since GH-6526.**
   Rationale: current command-line reference still marks it experimental as of 2026-09-05 — two Bazel LTS majors after Bazel 7.4.0 first shipped the accompanying action-deduplication behavior.
   Verify: `grep -rn 'experimental_output_paths' .bazelrc*` — presence outside an explicitly-labeled experiment or CI canary leg is the finding.
   Empty output = pass.
   Severity: CONSIDER (do not gate on it; track it for graduation). Bazel 7.4.0+.
   Settles: M-G-09, M-G-10.

10. **During a language migration onto Bazel, keep the language's own manifest (`Cargo.toml`, `pyproject.toml`+lockfile, `package.json`+lockfile) as the sole hand-edited source of dependency truth; treat the Bazel-side lockfile as one-way generated.**
    Rationale: the IDE's own language server reads the manifest, not the Bazel graph, and `crate_universe` explicitly ignores path dependencies regardless — two sources of truth is the failure this prevents.
    Verify: `git diff --name-only <manifest commit>` should show the corresponding Bazel-side lockfile changing in the *same* commit (e.g. `CARGO_BAZEL_REPIN=1 bazel sync --only=crate_index` run before commit) — a manifest-only commit with no lockfile change is the finding for any repo where the lockfile is meant to track it.
    No manifest-only commits = pass.
    Severity: MUST. All languages, all Bazel majors — a repo-hygiene rule, not version-gated.
    Settles: M-G-14.

11. **Never hand-edit a generated Bazel-side dependency lockfile (`cargo-bazel-lock.json`, `requirements_lock.txt`) to fix a drift; regenerate it from the language manifest.**
    Rationale: direct corollary of #10 — a hand-edit reintroduces exactly the two-source-of-truth problem the manifest-authoritative rule exists to prevent, invisibly.
    Verify: `git log -p --follow <bazel-side-lockfile>` — any commit touching only that file, with no manifest change in the same commit and no `[repin]`/`CARGO_BAZEL_REPIN`-style commit message, is the smell.
    No such commits = pass.
    Severity: SHOULD. All Bazel majors.
    Settles: M-G-14.

12. **Run a CI job that exercises both the legacy build system and Bazel on the same code path for the duration of a migration, and fail the merge if either goes red — do not let the legacy pipeline quietly stop gating.**
    Rationale: with two systems both claiming to build the same code, only a shared-red/shared-green gate catches the day one silently stops representing what ships; no primary source names this pattern, so it is stated as inference, not established practice.
    Verify: `grep -l 'bazel ' .github/workflows/*.yml` and `grep -l '<legacy tool>' .github/workflows/*.yml` both nonempty, on the same trigger, both required checks on the same PR.
    Either grep empty (or not a required check) = finding, *unless* the migration has already fully retired the legacy job on purpose.
    Severity: CONSIDER — no fleet or primary-source precedent; Shape F only.
    Settles: M-G-15.

13. **Put every directory a legacy build system or a non-Bazel worktree/checkout owns into `.bazelignore` explicitly; never assume `.gitignore` covers it.**
    Rationale: Bazel does not read `.gitignore` (absent from `.bazelignore`'s own definition); the fleet's own `hex.md:50-51` records exactly this failure live — `bazel test //...` globbed into a stale agent worktree's `examples/` and failed.
    Verify: for every top-level directory the repo's `.gitignore` excludes that also contains buildable files or is a parallel checkout location, confirm it also appears in `.bazelignore` — a directory in one list and not the other is the finding.
    Both lists agree = pass.
    Severity: MUST. All Bazel majors.
    Settles: M-G-16, M-G-17.

14. **On Bazel 8+, move any `.bazelignore` entry that is trying to express a wildcard into `REPO.bazel`'s `ignore_directories()` instead.**
    Rationale: `.bazelignore` "does not permit glob semantics" by its own definition; `ignore_directories()` was added in Bazel 8.0.0 explicitly "to provide a migration path off of" that limitation.
    Verify: read `.bazelignore` for any entry that is a literal path standing in for a pattern (a comment explaining "and every directory like this," or many near-duplicate lines) — that repetition is the signal.
    No such entries = pass, no migration needed.
    Severity: SHOULD. Bazel 8+ only (`ignore_directories()` does not exist on 7).
    Settles: M-G-16.

15. **Before choosing target granularity for any language whose existing tooling assumes a shared top-level output directory (`dist/`, a shared `target/`), decide explicitly between a single root `BUILD` file and restructuring per-package output — do not discover this mid-migration.**
    Rationale: Bazel requires a package's outputs to live under that package's own output directory; a shared `dist/` above multiple intended `BUILD` boundaries cannot be preserved as-is.
    Verify: `find . -maxdepth 2 -type d \( -name dist -o -name build -o -name out \)` run before drawing package boundaries — a hit above the intended per-package `BUILD` locations is the trigger to make this decision explicitly, in writing, before proceeding.
    No shared output directory found = pass, no decision forced.
    Severity: MUST decide (not defer). All Bazel majors; documented via rules_js but the constraint is Bazel's own output-tree design.
    Settles: M-G-18.

16. **When restructuring a shared output directory to satisfy Bazel's constraint while a legacy build system must keep working, redirect stale config-file references (e.g. `tsconfig.json` `paths`) via a generated copy, not an in-place edit.**
    Rationale: the ruleset's own FAQ names this exact technique (the `jq` rule copying a config file to a different `bazel-bin` path) for keeping both systems buildable through the transition.
    Verify: none beyond confirming both systems build after the restructure — this is a migration-mechanics tip, not a standing invariant.
    N/A.
    Severity: CONSIDER.
    Settles: M-G-18.

17. **Treat a git submodule that is also a build dependency (not merely vendored docs or fixtures) as an open Bzlmod-migration question, not a settled pattern — Bzlmod has no submodule-equivalent primitive.**
    Rationale: two fleet repos vendor the same forks as submodules with no Bzlmod path evaluated; `git_override` is the nearest primitive but requires the vendored fork to declare its own `MODULE.bazel`, which neither does today.
    Verify: `git config -f .gitmodules --get-regexp path` — any entry whose path also appears in a `Cargo.toml`/`package.json`/`pyproject.toml` dependency graph (not just referenced from docs) is the trigger to evaluate `git_override`.
    No submodules that are also build dependencies = pass.
    Severity: CONSIDER. Bzlmod-era (Bazel 7+, WORKSPACE removed in 9).
    Settles: M-G-20.

18. **Name the generator and back it with a `diff_test`-style regeneration check for any checked-in generated file, before it is treated as source.**
    Rationale: the fleet's one instance of checked-in generated code (`creeptd-ng/web/src/gen/`) has no traceable, verified regeneration path — a generator that silently diverges from its checked-in output is a correctness bug that looks like a source-of-truth bug.
    Verify: for every file under a `gen/`-shaped directory, confirm the owning package's `BUILD`/`BUILD.bazel` contains a `diff_test` (or `write_source_files`) target naming the generator; `grep -L 'diff_test\|write_source_files' <package>/BUILD*` on packages containing a `gen/` subdirectory.
    Empty output = pass.
    Severity: SHOULD. All Bazel majors.
    Settles: M-G-19.

19. **When a package accumulates multiple `config_setting`s that all vary along an axis `@platforms` (or the repo's own declared `constraint_setting`s) already covers, replace them with direct references to the existing `constraint_value`s instead of adding another raw-flag `config_setting`.**
    Rationale: this is `config_setting` sprawl standing in for a constraint that already exists, or that should be declared once as a real `constraint_setting` rather than re-expressed per package — no primary source gives a numeric threshold, so this stays argued, not measured.
    Verify: `grep -rn 'config_setting' --include=BUILD* . | wc -l` per package, cross-referenced by hand against whether the same os/cpu/toolchain axis recurs — no automatable threshold exists; this is a reading heuristic, not a query.
    N/A (no pass/fail count; a reviewer judgment call).
    Severity: CONSIDER (argued, not measured — never MUST per the house standard for argued-only sources).
    Settles: M-G-08.

## Fleet evidence

- **Correct constraint-based platform modeling, generated invisibly.** `rules_ocx`'s `_ocx_package_hub_impl` (`ocx/private/package.bzl:367-408` in `/home/mherwig/dev/rules_ocx`) generates, as a Starlark string template, `config_setting` targets keyed on `constraint_values` (never raw flag `values=`) plus a `select()`-driven `alias`, which is exactly the modern pattern this dive recommends (candidate #1). But because the whole `BUILD.bazel` is written as a string (`ctx.file("BUILD.bazel", "\n".join(lines))`) into a *different* repository, it is invisible to buildifier and to any grep of this repo's own `.bzl` files for `config_setting` — the fleet's own audit already flags generated-BUILD-as-string-concatenation as a general smell ([starlark-code-shape.md §2 methodology note](../bazel-audit/starlark-code-shape.md)). A rule that checks for correct platform modeling by grepping this repo's `.bzl` sources would find nothing and falsely conclude the pattern is unused.
- **`target_compatible_with` fed by `select()`, correctly.** `docs/BUILD.bazel:19` — `_NOT_WINDOWS = select({"@platforms//os:windows": ["@platforms//:incompatible"], "//conditions:default": []})`, consumed as `target_compatible_with = _NOT_WINDOWS` on the `stardoc` targets, skipping the whole docs graph on Windows because stardoc's protobuf dependency doesn't compile under MSVC. This is the one real, evaluated `select()` in the repo's own analysis graph ([starlark-code-shape.md §2](../bazel-audit/starlark-code-shape.md): "Real select() calls in this repo's own build graph: 1").
- **`.bazelignore` and the live worktree bug.** `rules_ocx/.bazelignore` (3 lines: `examples`, `e2e`, `.agents/worktrees`), the third entry documented as the fix for exactly the failure candidate #13 targets — `.agents/memory/hex.md:50-51` records that without it, `bazel test //...` globbed into a live agent worktree's own `examples/` and failed ([config-inventory.md](../bazel-audit/config-inventory.md)).
- **No fleet consumer for the migration-state half.** Nothing in the fleet runs a legacy build system alongside Bazel (Shape F is "none today" per the topic map), so candidates #12 (dual-CI-green) and #15/#16 (shared output directory) have zero fleet instances to point at — they ship as forward-looking guidance grounded on the Tweag post and the `rules_js` FAQ respectively, the same posture the map assigns to the C++ depth file.
- **Submodules without a Bzlmod path evaluated.** `ocx` and `grimoire` vendor `ocx-sh/rust-oci-client` and `ocx-sh/docker_credential` as git submodules; `ocx-mirror` vendors all of `ocx` as a submodule and path-deps two directories into *its* submodules ([fleet-bazel-readiness.md, Smells §2](../bazel-audit/fleet-bazel-readiness.md)). None declare a `MODULE.bazel` today, so `git_override` (candidate #17) is not currently available without upstream changes to those forks.
- **Checked-in generated code with no regeneration gate.** `creeptd-ng/web/src/gen/creeptd/**/*_pb.ts`, the fleet's only instance of this shape, has a documented single-source Rust generator (`creeptd-proto/build.rs`) but an unverified, separate TS-generation step with no `diff_test` ([fleet-bazel-readiness.md, Layout signals](../bazel-audit/fleet-bazel-readiness.md)) — candidate #18 names exactly this gap.
- **`.bazelversion`: `8.7.0`** — Maintenance, one major behind Active LTS 9.2.0 (per the frame's Corrections; not re-derived here). All version-specific guidance above is stated for both 8 and 9 where it differs (`ignore_directories()` is 8.0.0+; everything else in this dive is unchanged across 7/8/9 except the C++/Android platform-default flip at 7.0).

## AI-agent angle

- **Suggesting `select({"@platforms//os:windows": ...})` values dict keyed on `"cpu"`/`"os"` strings instead of `constraint_values=[...]`.** A model trained on pre-2022 examples reaches for `values = {"cpu": "x86"}` because it's shorter and was the only form for years. Mechanical check: the grep in candidate #1 — any `config_setting` with `values = {` and no `constraint_values` in the same target.
- **Recommending a hand-written outgoing transition as "the fix" for duplicate builds, without checking whether anything downstream needs the transitioned value.** The lucidsoftware demo exists precisely because this looks correct, builds successfully, and produces silently wrong output. Mechanical check: candidate #8 — trace every target downstream of the reset boundary for a `select()`/`config_setting` reading the same setting.
- **Citing `--experimental_remote_merkle_tree_cache`, `platform_mappings` as a permanent solution, or `bind()` from memory.** All three are either a hallucinated flag (see conflict #14 in the topic map — the live flag is `--experimental_remote_discard_merkle_trees`, unrelated to this dive but the same failure class), a mechanism the docs themselves call temporary, or a deprecated WORKSPACE-era relic. Mechanical check: grep the CLI reference or `bazel help` for the exact flag name before writing it into an rc file or a rule.
- **Treating `aquery` line counts as an action-count metric.** A model asked "did this transition double my build" will reach for `bazel aquery ... | wc -l` because it looks like the obvious tool — `aquery`'s own docs say this specific comparison is unreliable (duplicate `execPath`s render as separate lines). Mechanical check: candidate #6 — the same grep-for-positional-parsing check.
- **Assuming Bazel reads `.gitignore`.** A model porting a repo to Bazel routinely assumes existing ignore rules carry over; they do not, silently, until `bazel test //...` globs into something it shouldn't. Mechanical check: candidate #13 — diff the `.gitignore` and `.bazelignore` directory lists.
- **Proposing `ignore_directories()` on a Bazel 7 pin.** The feature is Bazel 8.0.0+; suggesting it on `rules_ocx`'s 8.7.0 pin is fine, but suggesting it for a repo still on 7.x is a version-floor miss with no error until someone tries to run it. Mechanical check: read `.bazelversion` before recommending it.
- **Recommending `bind()` to wire up a platform-conditional dependency.** `bind()` is WORKSPACE-only and explicitly deprecated in favor of `alias()` + `select()`; a model may reach for it when asked for "a way to swap implementations by platform" because both terms appear together in older tutorials. Mechanical check: `grep -rn 'bind(' **/*.bazel **/*.bzl WORKSPACE*` — any hit on a Bzlmod-only repo (no `WORKSPACE` file) is dead weight at best, broken at worst.

## Contested / evolving

- **The "Migrating to Platforms" framing itself is being retired from the docs, mid-dive.** The version-pinned [8.7.0 snapshot](https://bazel.build/versions/8.7.0/concepts/platforms) is titled "Migrating to Platforms," states transitions are "the biggest challenge," and carries a per-language (C++/Java/Android/Apple/Go/Rust) migration-status table. The [current live page](https://bazel.build/concepts/platforms) (fetched 2026-09-05) is titled plainly "Platforms," drops the status table and the "biggest challenge" language entirely, and reads as a settled reference rather than a migration guide. Trending: platforms are moving from "the new thing being migrated to" to "the unmarked default," at least in how the docs present them — the underlying mechanics (transitions, `select()`, `platform_mappings`) are unchanged between the two snapshots.
- **`ctexplain`'s unimplemented analyses.** Three of four analysis modes have printed a literal "not yet implemented" stub since a 2020 copyright header, through a file-touching commit as recent as 2026-09-04. Unclear whether this reflects low internal priority, a design rethink, or simply nobody picking it up — no roadmap or deprecation notice found for the stubs either way. Treat `ctexplain` as "the `summary` tool," not "the full explain tool," until that changes.
- **Ambiguous `select()` specialization with mixed `values=`/`constraint_values=` arms.** [bazelbuild/bazel#14604](https://github.com/bazelbuild/bazel/issues/14604) reported this exact failure in 2022 and was closed the same year as "completed," with a comment pointing at a possibly-broader follow-up, [#15575](https://github.com/bazelbuild/bazel/issues/15575), not independently read for this dive. Current status as of 2026-09-05 is **not confirmed** — recorded here as historical, not as a live trap, pending someone actually reproducing it on 8.7.0/9.x.
- **Path mapping's graduation timeline.** `--experimental_output_paths` has carried the "highly experimental" label since GH-6526 (pre-7.0) through Bazel 7.4.0's action-dedup landing and still today, per the current CLI reference. No public roadmap found for when (or whether) it stabilizes; the lucidsoftware demo treats it as the state-of-the-art answer to the reset-transition problem regardless of its experimental status, which is itself worth flagging as a tension.
- **Whether "prove both systems stay green" is even the right frame for a migration.** This dive infers the CI pattern from the source-of-truth decision (§9); it is not established practice in any source read here. An alternative view — visible in the broader corpus's adoption skepticism (roughly 11 percent of Bazel adopters abandon it around year two, per the frame's Corrections) — is that a long-lived dual-green CI job is itself a migration that never finishes, and the honest fix in some cases is not migrating at all. Recorded as CONSIDER, explicitly not resolved.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [bazel.build/extending/platforms](https://bazel.build/extending/platforms) | Primary — official reference | Fetched 2026-09-05 (current) | Defines `platform`/`constraint_setting`/`constraint_value`, `target_compatible_with`, and pattern-expansion skip semantics |
| [bazel.build/concepts/platforms@8.7.0](https://bazel.build/versions/8.7.0/concepts/platforms) | Primary — versioned docs snapshot | 8.7.0-pinned (fleet's own version) | Titled "Migrating to Platforms"; the "biggest challenge" quote, the `select()`/transitions migration checklist, `platform_mappings` definition — all removed from the current live page |
| [bazel.build/concepts/platforms (current)](https://bazel.build/concepts/platforms) | Primary — official reference | Fetched 2026-09-05 (current, ~9.2 era) | Retitled "Platforms"; `IncompatiblePlatformProvider`/`cquery` detection recipe, "Known Issues" (visibility) |
| [bazel.build/configure/attributes](https://bazel.build/configure/attributes) | Primary — official reference | Fetched 2026-09-05 | Canonical `select()`/`config_setting` example, `bind()` deprecation notice |
| [bazel.build/extending/config](https://bazel.build/extending/config) | Primary — official reference | Fetched 2026-09-05 | Transitions definitions, the `2^n` case study, the literal unresolved TODO this dive fills |
| [bazel.build/query/aquery](https://bazel.build/query/aquery) | Primary — official reference | Fetched 2026-09-05 | `execPath`-duplicate rendering, unspecified output order, `--output=` formats |
| [bazel.build/query/cquery](https://bazel.build/query/cquery) | Primary — official reference | Fetched 2026-09-05 | Config-hash-annotated output format, `bazel config <hash>`, `--transitions=lite/full`, the `config()` query function |
| [bazel.build/run/bazelrc#bazelignore](https://bazel.build/run/bazelrc) (source: [site/en/run/bazelrc.md](https://raw.githubusercontent.com/bazelbuild/bazel/master/site/en/run/bazelrc.md)) | Primary — official reference, fetched raw from source | Fetched 2026-09-05 | Exact `.bazelignore` contract and the `REPO.bazel`/`ignore_directories()` Bazel-8.0.0 note, quoted verbatim |
| [bazel.build/reference/command-line-reference](https://bazel.build/reference/command-line-reference) | Primary — official CLI reference | Fetched 2026-09-05 | `--experimental_output_paths` exact type/default and "highly experimental" status, current as of era |
| [github.com/lucidsoftware/bazel-build-graph-explosion](https://github.com/lucidsoftware/bazel-build-graph-explosion) | Primary — runnable demonstration repo, 4 packages | Fetched 2026-09-05 | The exact worked progression from no-duplication through reset-transition's own failure mode to path-mapping's fix, with real command output |
| [bazelbuild/bazel#14236](https://github.com/bazelbuild/bazel/issues/14236) | Primary — upstream issue tracker | Filed pre-2024, closed 2024-06-14 | The real-world action-conflict symptom, the `ConfiguredTargetKey` error text, a comment naming `ctexplain` as follow-up work |
| [bazelbuild/bazel#14604](https://github.com/bazelbuild/bazel/issues/14604) | Primary — upstream issue tracker | Filed 2022, closed 2022-05-12 | `select()` ambiguous-specialization gotcha with mixed `values=`/`constraint_values=`; flagged historical, not confirmed-current |
| [bazelbuild/bazel PR #24203](https://github.com/bazelbuild/bazel/pull/24203) | Primary — upstream pull request | Landed for Bazel 8.0.0 | Origin and stated motive for `REPO.bazel`'s `ignore_directories()` |
| [bazelbuild/bazel `tools/ctexplain`](https://github.com/bazelbuild/bazel/tree/master/tools/ctexplain) (`ctexplain.py`, `analyses/summary.py`, `bazel_api.py`, `BUILD`) | Primary — Bazel's own source tree | Read 2026-09-05; last-touching commit 2026-09-04 | The tool built for this dive's exact question; confirms the `summary` algorithm and the 3 unimplemented stub analyses first-hand |
| [aspect-build/rules_js docs/faq.md](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/faq.md) | Primary — ruleset's own documentation | Fetched 2026-09-05 (`main`) | The shared-`dist/`-folder output-tree constraint, quoted verbatim with both resolutions |
| [tweag.io: Building a Rust workspace with Bazel](https://www.tweag.io/blog/2023-07-27-building-rust-workspace-with-bazel/) | Practitioner blog, Bazel-consultancy authored | Published 2023-07-27 | The dual-build-system migration pattern: Cargo as source of truth, `CARGO_BAZEL_REPIN`, `crate_universe`'s path-dependency blind spot |
| [rules_rust#1522](https://github.com/bazelbuild/rules_rust/issues/1522), [discussion #2879](https://github.com/bazelbuild/rules_rust/discussions/2879) | Primary — upstream issue/discussion | Open as of wave-1 read | Corroborates the two-lockfile drift problem named by the Tweag post |
| [bazel-audit/config-inventory.md](../bazel-audit/config-inventory.md), [starlark-code-shape.md](../bazel-audit/starlark-code-shape.md), [fleet-bazel-readiness.md](../bazel-audit/fleet-bazel-readiness.md) | Internal — grounding audits of `rules_ocx` and the fleet | Measured 2026-09-05 | Every fleet file:line citation in this dive: `.bazelignore`, the real `select()`/`config_setting` sites, submodule and generated-code patterns |
| `rules_ocx` source (`ocx/private/package.bzl`, `docs/BUILD.bazel`, `.bazelignore`) | Primary — the fleet's own Bazel repository | Read 2026-09-05 | Direct confirmation of the audit's citations: the constraint-based `config_setting` generator, the one real `select()`→`target_compatible_with` site |
| [bazel-topic-map/architecture-and-monorepo-practice.md](../bazel-topic-map/architecture-and-monorepo-practice.md), [canonical-bazel.md](../bazel-topic-map/canonical-bazel.md), [failure-corpus.md](../bazel-topic-map/failure-corpus.md) | Internal — wave-1 scouting notes | Written 2026-09-05 | Sourced the brief's reading list and cross-checked the primary-source quotes pulled independently for this dive |

---
title: Repository-rule hermeticity and the BCR contract
topic: repository-rule-hermeticity-and-bcr
group: bazel-bzlmod-and-repo-rules
family: BZL-MOD
agent: research-lang-wave2-sonnet
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 19
primary_sources_count: 19
settles: [M-B-07, M-B-08, M-B-09, M-B-13, M-B-14, M-B-19, M-B-22]
scope: |
  What a repository rule may read without lying to Bazel about when to re-fetch
  (the exact trigger list, the `getenv`/`watch` inventory problem, and the
  environment-leak trap in `ctx.execute()`), and what the Bazel Central Registry
  demands of a published module (add-only, presubmit validations, the
  anonymous-module and test-module patterns, `compatibility_level`'s two-layer
  status). Does NOT cover `MODULE.bazel`/lockfile mechanics generally
  (`module-file-and-lockfile-hygiene`), module-extension purity or the
  repo-contents caches (`module-extension-purity-and-repo-contents-cache`,
  same group — see that file for `reproducible = True`, `repo_metadata()`,
  and the `Circular definition of repositories` failure).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The exact re-fetch trigger list](#1-the-exact-re-fetch-trigger-list)
   2. [`getenv()` is cache invalidation, not a sandbox — and `ctx.os.environ` is neither](#2-getenv-is-cache-invalidation-not-a-sandbox--and-ctxosenviron-is-neither)
   3. [The `execute()` environment leak, confirmed from source](#3-the-execute-environment-leak-confirmed-from-source)
   4. [`--incompatible_no_implicit_watch_label`: attrs stopped auto-watching in Bazel 8.0](#4-incompatible_no_implicit_watch_label-attrs-stopped-auto-watching-in-bazel-80)
   5. [The `watch=` tri-state and `watch()`'s own error conditions](#5-the-watch-tri-state-and-watchs-own-error-conditions)
   6. [`configure` and `local`: two different re-fetch knobs](#6-configure-and-local-two-different-re-fetch-knobs)
   7. [Finding non-hermetic operations at runtime: the six-item taxonomy and the workspace log](#7-finding-non-hermetic-operations-at-runtime-the-six-item-taxonomy-and-the-workspace-log)
   8. [Canonical repo names: the `~`→`+` flip and `ctx.attr.name`](#8-canonical-repo-names-the--flip-and-ctxattrname)
   9. [The repository cache only ever covers `download`/`download_and_extract`](#9-the-repository-cache-only-ever-covers-downloaddownload_and_extract)
   10. [The BCR's add-only guarantee and its two escape hatches](#10-the-bcrs-add-only-guarantee-and-its-two-escape-hatches)
   11. [BCR presubmit validations, in order](#11-bcr-presubmit-validations-in-order)
   12. [Anonymous-module test vs. test module](#12-anonymous-module-test-vs-test-module)
   13. [`compatibility_level`: resolver no-op, registry gate](#13-compatibility_level-resolver-no-op-registry-gate)
   14. [Incompatible-flags presubmit testing](#14-incompatible-flags-presubmit-testing)
   15. [Attestations: experimental today, named as the eventual default](#15-attestations-experimental-today-named-as-the-eventual-default)
3. [Decisions](#decisions)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Fleet evidence](#fleet-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- A repo is re-fetched only on: an attr change, an impl-function change, a change to a `getenv()`-read or `environ=`-declared env var, a change to a `watch()`ed path, or `bazel fetch --force` — nothing else, ever ([external/repo](https://bazel.build/external/repo)).
- `getenv()` does **not** sandbox what a repository rule can read — it only tells Bazel when to invalidate the cached fetch. `repository_ctx.os.environ` reads the exact same variables but is explicitly documented as **not** establishing that dependency ([repository_os](https://bazel.build/rules/lib/builtins/repository_os)).
- The sharper trap: `repository_ctx.execute()` run locally always starts the child process's environment from the **full ambient environment of the Bazel server**, then only overrides/removes the keys named in `environment=` — confirmed both in Bazel's own source (`StarlarkBaseExternalContext.java:2103`, `osObject.getEnvironmentVariables()`) and in the `--repo_env` flag's own doc text: *"repository rules see the full environment anyway"*. No `getenv()` inventory, however complete, closes this gap for a rule that shells out.
- Remote execution is the one path that is actually clean-room here: *"Remote execution only sees the explicitly set environment variables"* (`StarlarkBaseExternalContext.java:2051`) — the opposite of local `execute()`.
- Since Bazel 8.0, `--incompatible_no_implicit_watch_label` defaults `true`: a `Label`-typed attribute no longer auto-watches its file just by existing, and `repository_ctx.path()` no longer implicitly watches its argument. An explicit `ctx.watch()`/`ctx.watch_tree()` (or a `ctx.read()`/`ctx.execute()`/`ctx.extract()` call with `watch="auto"`, which resolves to "watch when legal") is now required.
- `watch()` itself errors on two conditions: watching a path inside the repo currently being fetched, or a module extension watching outside the Bazel workspace. `watch="auto"` degrades to "don't watch" there instead of erroring — an agent must not read "auto" as "always covered."
- The six operations Bazel's own hermeticity-detection page names as potentially non-hermetic are exactly: `execute`; `download`/`download_and_extract`; `file`/`template`; `os`; `symlink`; `which` ([remote/workspace](https://bazel.build/remote/workspace)) — findable at runtime via `--experimental_workspace_rules_log_file` plus the `workspacelog:parser` tool, never by static analysis alone.
- `--incompatible_use_plus_in_repo_names` flipped to `true` by default in Bazel 8.0 **and immediately became a no-op flag** — canonical repo names switched from `@@foo~1.0` to `@@foo+1.0` and there is no flag to get the old separator back ([bazelbuild/bazel#23127](https://github.com/bazelbuild/bazel/issues/23127)).
- `repository_ctx.attr.name` returns the **canonical** repo name inside an impl function, never the apparent name a consumer wrote in `use_repo()` — code that needs the apparent name must take it as its own explicit attr.
- Bazel's built-in `--repository_cache` is a content-addressed store keyed by the **expected sha256 of a download request** ([run/build#repository-cache](https://bazel.build/run/build#repository-cache)); it covers `ctx.download`/`ctx.download_and_extract` calls only. A repository rule that shells out via `ctx.execute()` to fetch or build content gets zero benefit from it, however many times the same content is fetched across output bases.
- The BCR is add-only: an existing module version's `MODULE.bazel`, `source.json`, and patches can never be edited; a fix ships as a new version, and a BCR-only patch fix uses the `.bcr.<N>` version suffix convention ([BCR README](https://github.com/bazelbuild/bazel-central-registry/blob/main/docs/README.md#add-only)).
- `compatibility_level` is a Bazel-resolver no-op starting with Bazel 8.6.0/9.1.0 ("You should stop using `compatibility_level`" — [external/faq](https://bazel.build/external/faq)) but BCR's presubmit still diffs it against the previous version and blocks a mismatch unless the PR carries `@bazel-io skip_check compatibility_level` — deleting the field because "it's a no-op" fails the next submission's presubmit, not the resolver.
- BCR presubmit offers two consumption tests: the built-in **anonymous-module test** (a synthetic `bazel_dep()` building whatever targets `presubmit.yml` names) and the optional, `local_path_override`-based **test module**, which can exercise real consumer code including dev dependencies the target module itself can't declare.
- Neither BCR test pattern executes anything by default — both are `build_targets`-shaped; `test_targets` is documented as unreliable specifically because dev dependencies aren't available when the module isn't root. A build-only presubmit proves Starlark analysis succeeds, not that the repository rule's runtime orchestration is correct.
- BCR attestations (`attestations.json`, verified with `slsa-verifier`) are explicitly marked experimental and optional today, with BCR's own docs stating the eventual expectation is universal coverage for natively-Bazel-built modules — no date attached as of 2026-09-05.

## Findings

### 1. The exact re-fetch trigger list

`bazel.build/external/repo`, quoted verbatim, names exactly five triggers plus the force flag:

> Therefore, repos are re-fetched only if one of the following things changes:
> - The attributes passed to the repo rule invocation.
> - The Starlark code comprising the implementation of the repo rule.
> - The value of any environment variable passed to `repository_ctx`'s `getenv()` method or declared with the `environ` attribute of the `repository_rule`. The values of these environment variables can be hard-wired on the command line with the [`--repo_env`](https://bazel.build/reference/command-line-reference#flag--repo_env) flag.
> - The existence, contents, and type of any paths being [`watch`ed](https://bazel.build/rules/lib/builtins/repository_ctx#watch) in the implementation function of the repo rule.
>   - Certain other methods of `repository_ctx` with a `watch` parameter, such as `read()`, `execute()`, and `extract()`, can also cause paths to be watched.
>   - Similarly, `repository_ctx.watch_tree` and `path.readdir` can cause paths to be watched in other ways.
> - When `bazel fetch --force` is executed.

Everything not on this list is invisible to Bazel's fetch cache — this is the whole reason "what triggers a re-fetch" and "what escapes it" are the same question asked twice.

### 2. `getenv()` is cache invalidation, not a sandbox — and `ctx.os.environ` is neither

`repository_ctx.getenv(name, default=None)`'s doc is explicit about the mechanism: *"When building incrementally, any change to the value of the variable named by `name` will cause this repository to be re-fetched"* ([`StarlarkBaseExternalContext.java:1538-1543`](https://github.com/bazelbuild/bazel/blob/948b8c70e281c2fe42aa5468dad543c7af9f0ccc/src/main/java/com/google/devtools/build/lib/bazel/repository/starlark/StarlarkBaseExternalContext.java#L1538-L1543)). It says nothing about restricting what the rule may read — because it doesn't.

`repository_ctx.os.environ` (a plain dict of the *entire* process environment) reads the same variables with none of the tracking:

> "Retrieving an environment variable from this dictionary does not establish a dependency from a repository rule or module extension to the environment variable." — [`repository_os`](https://bazel.build/rules/lib/builtins/repository_os)

```python
# WRONG — reads HOME but never registers it; editing HOME never refetches
def _impl(ctx):
    home = ctx.os.environ.get("HOME")

# RIGHT — the same read, now tracked
def _impl(ctx):
    home = ctx.getenv("HOME")
```

The `repository_rule(environ = [...])` parameter is the older sibling of `getenv()` and is now documented **Deprecated**: *"Migrate to `repository_ctx.getenv` instead"* ([`bzl#repository_rule`](https://bazel.build/rules/lib/globals/bzl#repository_rule)) — it still works, it just declares a name with no link to the specific read that mattered.

### 3. The `execute()` environment leak, confirmed from source

`repository_ctx.execute()`'s own doc undersells this: *"The `environment` map can be used to override some environment variables to be passed to the process"* — "override **some**" implies the rest come from somewhere. Reading the implementation (`StarlarkBaseExternalContext.java`, current `master` @ `948b8c70`) confirms exactly what:

```java
// L2103 — local execution path
return StarlarkExecutionResult.builder(osObject.getEnvironmentVariables())
    .addArguments(args)
    .setDirectory(workingDirectoryPath.getPathFile())
    .addEnvironmentVariables(forceRepoEnvVariables)      // the `environment=` dict
    .removeEnvironmentVariables(removeRepoEnvVariables)  // keys set to None
    .setTimeout(timeoutMillis)
    ...
```

The child process's environment is seeded from `osObject.getEnvironmentVariables()` — the **same full ambient environment** exposed untracked via `ctx.os.environ` — and the `environment=` dict only adds/overrides/removes specific keys on top. A comment three lines above the remote-execution branch spells out the asymmetry directly:

> `// Remote execution only sees the explicitly set environment variables, so removing env vars isn't necessary.` — [line 2051](https://github.com/bazelbuild/bazel/blob/948b8c70e281c2fe42aa5468dad543c7af9f0ccc/src/main/java/com/google/devtools/build/lib/bazel/repository/starlark/StarlarkBaseExternalContext.java#L2051)

And Bazel's own CLI reference for `--repo_env` says it outright, without needing the source:

> "Specifies additional environment variables to be available only for repository rules. **Note that repository rules see the full environment anyway**, but in this way variables can be set via command-line flags and `.bazelrc` entries." — [command-line-reference `--repo_env`](https://bazel.build/reference/command-line-reference#flag--repo_env)

Consequence: a repository rule that calls `ctx.execute()` to shell out to any external binary cannot make that binary hermetic by enumerating `getenv()` calls in Starlark. The Starlark-side inventory only covers variables the *Starlark code* explicitly reads to build the `environment=` dict; the invoked binary's own reads of `PATH`, `LANG`, `TZ`, a proxy variable, or anything else in the Bazel server's process environment pass straight through, unlisted and untracked, on every platform, on every version through current `master`. There is no flag that changes this for local execution — only remote execution (`canExecuteRemote()`, same file) gets the clean-room behavior, and remote execution of repository rules is not generally available (`external/faq`).

### 4. `--incompatible_no_implicit_watch_label`: attrs stopped auto-watching in Bazel 8.0

Flipped default-`true` in Bazel 8.0 ([release notes](https://github.com/bazelbuild/bazel/releases/tag/8.0.0)), motivated by [bazelbuild/bazel#23861](https://github.com/bazelbuild/bazel/issues/23861):

> "The `repository_ctx.path` and `module_ctx.path` methods no longer cause the argument to be watched (previously, they did if and only if the argument is a `Label`). Other methods on the context objects no longer watch `Label` arguments with `watch = No`." — migration guide, same issue

The flag is still a live, revertible option as of current `master` (`BuildLanguageOptions.java:203-213`, `defaultValue = "true"`, `metadataTags = INCOMPATIBLE_CHANGE`) — unlike the repo-name separator flag below, this one has not yet been hard-flipped into a no-op.

```python
# Pre-8.0 idiom that silently stopped watching on Bazel 8+
def _impl(ctx):
    index = ctx.path(ctx.attr.index)   # used to auto-watch; no longer does
    ...

# Current-correct pattern (rules_ocx, ocx/private/package.bzl:166-168)
index = ctx.path(ctx.attr.index)
ctx.watch_tree(index)                  # explicit — required on Bazel 8+
```

### 5. The `watch=` tri-state and `watch()`'s own error conditions

`read()`, `extract()` (as `watch_archive`), `template()` (as `watch_template`), and `patch()` (as `watch_patch`) all take a `watch=` parameter with three values, default `"auto"`:

- `"yes"` — equivalent to calling `watch()` immediately.
- `"no"` — never watch.
- `"auto"` — *"will only attempt to watch the file when it is legal to do so"* ([`repository_ctx`](https://bazel.build/rules/lib/builtins/repository_ctx)).

`watch()` itself names the illegal cases explicitly:

> "Note that attempting to watch paths inside the repo currently being fetched, or inside the working directory of the current module extension, will result in an error. A module extension attempting to watch a path outside the current Bazel workspace will also result in an error."

`"auto"` silently skips watching in exactly those two cases rather than erroring — a rule reading its own generated output with `watch="auto"` gets no watch and no diagnostic. `download()` and `download_and_extract()` carry no `watch=` parameter at all; their hermeticity story is entirely the `sha256=`/`integrity=` argument (§9).

### 6. `configure` and `local`: two different re-fetch knobs

From `repository_rule()`'s own parameters:

| Parameter | Default | Effect |
|---|---|---|
| `configure` | `False` | Rule is re-fetched on `bazel fetch --force --configure` (not on a plain `--force`) |
| `local` | `False` | In addition to every trigger in §1, the repo is re-fetched every time the Bazel server restarts |
| `environ` | `[]` | Deprecated — see §2 |

`configure` is the signal for "this rule inspects the host machine" (autoconfigured toolchains being the canonical example); `local` is for "this rule can't be trusted to survive a server restart unchanged" and is expensive — it defeats caching across every fresh Bazel server (every CI job, typically).

### 7. Finding non-hermetic operations at runtime: the six-item taxonomy and the workspace log

`bazel.build/remote/workspace` (raw source: `site/en/remote/workspace.md`) names exactly six potentially non-hermetic `repository_ctx` operation groups:

> - `execute`: executes an arbitrary command on the host environment.
> - `download`, `download_and_extract`: to ensure hermetic builds, make sure that sha256 is specified.
> - `file`, `template`: not non-hermetic in itself, but may be a mechanism for introducing dependencies on the host environment.
> - `os`: not non-hermetic in itself, but an easy way to get dependencies on the host environment.
> - `symlink`: normally safe, but look for red flags — symlinks outside the repository or to an absolute path.
> - `which`: checking for programs installed on the host is usually problematic.

The runbook: `bazel clean --expunge`, then `bazel build --experimental_workspace_rules_log_file=/tmp/workspacelog <target>`, then `bazel build src/tools/workspacelog:parser && bazel-bin/src/tools/workspacelog/parser --log_path=/tmp/workspacelog > /tmp/workspacelog.txt` (optionally with `--exclude_rule <label>` per noisy built-in rule), then read the text log for hits against the six categories. This is a **runtime** log of what actually executed on one build, not a static analyzer — cached steps never appear (hence the mandatory `--expunge` first), and repeated evaluations can duplicate events. The flag dates to Bazel 0.18 and is still documented current in the 9.0.0/9.1.0 doc tree ([`DebuggingOptions.java`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/bazel/debug/DebuggingOptions.java)).

### 8. Canonical repo names: the `~`→`+` flip and `ctx.attr.name`

`--incompatible_use_plus_in_repo_names` flipped default-`true` in Bazel 8.0. Its own migration issue is unusually blunt about what happens next:

> "Note that in Bazel 8, this flag will be flipped to `true` by default, *and the flag will immediately become a no-op* (that is, setting it to `false` will have no effect). This is to avoid having to maintain the different repo name formats for another LTS cycle, especially as it was never a stable API to begin with." — [bazelbuild/bazel#23127](https://github.com/bazelbuild/bazel/issues/23127)

Canonical names went from `@@rules_foo~1.0.0` to `@@rules_foo+1.0.0` (module repos) and `$MODULE~$EXTENSION~$APPARENT` to `$MODULE+$EXTENSION+$APPARENT` (extension repos), with **no** flag to revert. The same issue's migration guide is the source of a subtler trap:

> "If you need access to the apparent repo name inside a repo rule, try passing in the apparent repo name as an explicit attr instead."

That's needed because `repository_ctx.attr.name` inside an implementation function returns the **canonical** name, even though the same `name` attribute takes the **apparent** name as input at the call site:

> "This is a string attribute that behaves somewhat magically: when specified as an input to a repo rule invocation, it takes an apparent repo name; but when read from the repo rule's implementation function using `repository_ctx.attr.name`, it returns the canonical repo name." — [`external/repo`](https://bazel.build/external/repo)

### 9. The repository cache only ever covers `download`/`download_and_extract`

> "Bazel caches all files downloaded in the repository cache... [a cache hit requires] the download request has a SHA256 sum of the file specified and a file with that hash is in the cache." Default location: `~/.cache/bazel/_bazel_$USER/cache/repos/v1/`. — [`run/build#repository-cache`](https://bazel.build/run/build#repository-cache)

The cache is keyed by the **expected** sha256 of a download — there is no equivalent concept for `ctx.execute()`. A repository rule whose actual content-fetching happens by shelling out to an external tool (rather than by `ctx.download`) gets no dedupe from `--repository_cache` at all: every fresh output base re-runs the tool from scratch, regardless of how many other Bazel workspaces on the same machine already fetched the identical content. Any caching for that content has to be the *tool's own*, entirely outside Bazel's model (see §Fleet evidence).

### 10. The BCR's add-only guarantee and its two escape hatches

> "To ensure reproducibility, the BCR is add-only; that is, existing versions of a module cannot be modified. If an existing module version needs a fix, it should be fixed upstream and a new version can be submitted." — [BCR README §Add-only](https://github.com/bazelbuild/bazel-central-registry/blob/main/docs/README.md#add-only)

Two named escape hatches when there's nothing to fix upstream:

- **`.bcr.<N>` suffix**: `foo@1.2.3` needing a BCR-only patch ships as `foo@1.2.3.bcr.1`.
- **Pseudo-versions**: an inactive upstream can still get a version based on a main-branch commit, Go-style: `foo@1.19.1-20250305-abcdef`, combinable with `.bcr.<N>`. Not semantically significant — treated as an ordinary version string.

Removal is likewise never a delete: a broken or vulnerable version is **yanked** (`metadata.json`'s `yanked_versions` map with a reason string), which fails a Bzlmod build that resolves to it unless the user passes `--allow_yanked_versions` or sets `BZLMOD_ALLOW_YANKED_VERSIONS`.

### 11. BCR presubmit validations, in order

From `docs/README.md#validations`, run locally via `bazel run -- //tools:bcr_validation --check=foo@1.0.0`:

1. The module version exists in `metadata.json`.
2. The source archive URL matches `metadata.json`'s `repository` allowlist.
3. The source archive URL is stable if GitHub-hosted (skippable: `@bazel-io skip_check unstable_url`).
4. Integrity values for the source archive and any patches are correct.
5. The checked-in `MODULE.bazel` matches the one in the extracted, patched source tree.
6. `compatibility_level` matches the previous version (skippable: `@bazel-io skip_check compatibility_level` — see §13).
7. Whether `presubmit.yml` changed enough to need a maintainer-applied `presubmit-auto-run` label.

Plus, outside `bcr_validation.py`: the checked-in `MODULE.bazel`/`source.json`/patches are not modified in the PR diff, and files outside `modules/` aren't touched when adding a new module version.

### 12. Anonymous-module test vs. test module

Two different consumption checks, both configured in `presubmit.yml`:

**Anonymous-module test** — always available, needs only a `matrix:`/`tasks:` block naming `build_targets`. BCR synthesizes a throwaway root module (`bazel_dep(name="foo", version="1.2.13")`) and builds the named targets against it:

```yaml
matrix:
  platform: [rockylinux8, debian10, ubuntu2004, macos, windows]
  bazel: [6.x, 7.x]
tasks:
  verify_targets:
    name: "Verify build targets"
    platform: ${{ platform }}
    bazel: ${{ bazel }}
    build_targets: ['@zlib//:zlib']
```

**Test module** — "highly recommended," lives inside the module's own source tree, depends on the module under test via `local_path_override`, and can carry dev-only dependencies the module itself can't declare:

```yaml
bcr_test_module:
  module_path: examples/bzlmod
  matrix: {platform: [...], bazel: [6.x, 7.x]}
  tasks:
    run_test_module:
      build_targets: ['//java/.../examples/bzlmod:bzlmod_example']
```

```python
# examples/bzlmod/MODULE.bazel, inside the test module
bazel_dep(name = "rules_jvm_external")
local_path_override(module_name = "rules_jvm_external", path = "../..")
```

Both patterns default to `build_targets`; BCR's own docs name why `test_targets` is the weaker option: *"it may not always work since test targets can require additional dev dependencies that are not available when your project is not the root module."*

### 13. `compatibility_level`: resolver no-op, registry gate

Two independent, non-contradicting facts, at two different layers (map conflict 15):

- **Resolver**: *"starting with Bazel 8.6.0 and 9.1.0, both `compatibility_level` and `max_compatibility_level` are no-ops"* — [`external/faq`](https://bazel.build/external/faq). The current `module()` reference itself now documents the parameter as `Deprecated. This is now a no-op and has no effect.`
- **Registry**: BCR presubmit's validation #6 (§11) still diffs `compatibility_level` against the module's previous version and blocks a mismatch. The only way past a *deliberate* bump is the exact comment `@bazel-io skip_check compatibility_level` on the PR.

An agent told "the resolver ignores this field" and asked to "clean up" a `MODULE.bazel` must not delete or silently change `compatibility_level` on a module that publishes to the BCR — the deletion or change reads to presubmit as an unexplained mismatch and blocks the PR, independent of what the resolver does with the value.

### 14. Incompatible-flags presubmit testing

Every BCR presubmit run also tests the module against Bazel's own migration-readiness flags, driven by Bazelisk's `--migrate` and a shared list ([`incompatible_flags.yml`](https://github.com/bazelbuild/bazel-central-registry/blob/main/incompatible_flags.yml), full contents as of 2026-09-05):

```yaml
incompatible_flags:
  "--incompatible_config_setting_private_default_visibility": [6.x, 7.x, 8.x]
  "--incompatible_disable_starlark_host_transitions": [6.x, 7.x, 8.x]
  "--incompatible_disable_native_repo_rules": [7.x, 8.x]
  "--incompatible_autoload_externally=": [7.x, 8.x]
  "--incompatible_disable_autoloads_in_main_repo": [last_green, rolling]
  "--incompatible_strict_action_env": [6.x, 7.x, 8.x]
```

A module's own `presubmit.yml` can override this list per version; omitting an override silently inherits whatever list is live in the BCR repo *at presubmit time* — which changes as flags flip and retire (conflict 14's "phantom flag" lesson generalizes: never hand-copy a flag name from an old example without checking it's still in this file). `@bazel-io skip_check incompatible_flags` skips the whole check for a PR, applying the `skip-incompatible-flags-test` label.

### 15. Attestations: experimental today, named as the eventual default

> "BCR now accepts build attestations in order to increase security for all BCR users. This feature is still experimental and thus optional, but eventually we expect all modules that natively build with Bazel to also generate build attestation." — [`docs/attestations.md`](https://github.com/bazelbuild/bazel-central-registry/blob/main/docs/attestations.md)

An `attestations.json` next to `source.json`/`MODULE.bazel` names exactly three required keys (`source.json`, `MODULE.bazel`, the source archive's basename), each an `*.intoto.jsonl` URL from the same GitHub repo named in `metadata.json`, verified with [slsa-verifier](https://github.com/slsa-framework/slsa-verifier) during presubmit. No date is attached to "eventually."

## Decisions

**1. The greppable inventory rule for "every env var consulted has a matching `getenv`, every label read has a matching `watch`."**

Decision: split it into a mechanical tier and a boundary tier, because §3 proves the second tier cannot be made purely mechanical.

- *Mechanical (always run, empty output required):*
  - `grep -rn 'ctx\.os\.environ\|module_ctx\.os\.environ'` over every `.bzl` file reachable from a `repository_rule`/`module_extension` implementation. Any hit is an untracked env read by definition (§2) — this is the one part of the inventory a grep answers completely and correctly.
  - For every `attr.label(...)` name declared in a `repository_rule`'s `attrs=`, grep the implementation body for that name appearing next to `ctx.path(ctx.attr.<name>`, `ctx.read(ctx.attr.<name>`, or an explicit `ctx.watch(`/`ctx.watch_tree(`. A label attr referenced only through `ctx.attr.<name>` string interpolation, with none of those three, is a miss.
- *Boundary (named heuristic, not a grep):* when the impl shells out via `ctx.execute()` to an external binary, the Starlark-side `getenv()` inventory can only ever cover variables the *Starlark code* reads to build the `environment=` dict — §3 shows the invoked binary's own ambient-env reads are structurally invisible to any Starlark-level check, on every Bazel version through current `master`. Assumption named: closing this gap is not a Starlark tooling problem — it requires a written, reviewable contract for the shelled-out binary's own env-var surface (the way `rules_ocx`'s `AGENTS.md` env classes attempt one), audited against *that binary's* docs/source, not re-derived from the calling `.bzl` file.

This is why the fleet's current wording — "`repository_ctx.getenv` for every env var consulted (Bazel tracks invalidation), `watch()` labels they read" (`starlark.md:10-12`) — is asserted, not verified: no grep can distinguish "every var the binary reads is declared" from "every var the Starlark code happens to read is declared." The mechanical tier above is what a lint gate can enforce; the boundary tier is what a design review has to.

**2. Whether a published module needs a test module beyond a build-only e2e.**

Decision: a build-only `bcr_test_module` (via `local_path_override`) is the **floor**, not the target. It proves something the anonymous-module test alone does not — that the module resolves and analyzes correctly as a `bazel_dep()` from a real consumer `MODULE.bazel`, with dev dependencies available. It does **not** prove the repository rule's runtime orchestration (fetch → verify → materialize → exec) is correct, because `bazel build` never executes the generated output. Given BCR's own reservation about `test_targets` reliability (dev deps not available when non-root) and the concrete cost named in `rules_ocx`'s own comment — executing a live-network smoke test across the full BCR platform matrix is flaky — the target state is: keep the full-matrix presubmit build-only, and add exactly one narrower, real-execution shard (a single platform, or a mocked/local backend) once that flakiness source is addressed, rather than promoting the whole matrix to `test_targets`. Assumption named: matrix breadth and execution depth trade off against each other, and BCR presubmit minutes are a shared, finite resource across every module — narrowing execution rather than widening it is the correct direction.

## Normative guidance candidates

1. **Never read `repository_ctx.os.environ` / `module_ctx.os.environ`; use `getenv()` for every variable whose value can change the fetched output.**
   Rationale: `os.environ` reads are explicitly documented as not establishing Bazel's re-fetch dependency — an edit to the variable silently serves a stale fetch.
   Verify: `grep -rn 'ctx\.os\.environ\|module_ctx\.os\.environ' **/*.bzl`. Empty = pass.
   Severity: MUST. Bazel: all majors (6-9). M-ID: M-B-07.

2. **Migrate `repository_rule(environ = [...])` to `repository_ctx.getenv()` per read.**
   Rationale: `environ=` is documented Deprecated; it blanket-lists names with no link to which read matters, and doesn't compose with per-call defaults.
   Verify: `grep -n 'environ\s*=\s*\[' *.bzl` inside a `repository_rule(` call. Empty = nothing to migrate.
   Severity: SHOULD. Bazel: 7-9 (deprecated, still functional). M-ID: M-B-07.

3. **Every `attr.label()` in a `repository_rule`'s `attrs=` must be passed to `ctx.path()`/`ctx.read()`/`ctx.execute()` or explicitly `ctx.watch()`ed inside the impl.**
   Rationale: on Bazel 8+ (`--incompatible_no_implicit_watch_label` default `true`), a label attribute no longer auto-watches; an unrelated-looking edit to the referenced file stops triggering a re-fetch with no error anywhere.
   Verify: for each such attr name, grep the impl for that name next to `ctx.path(ctx.attr.`, `ctx.read(ctx.attr.`, or `ctx.watch(`/`ctx.watch_tree(`. Missing on all three = finding.
   Severity: MUST. Bazel: 8, 9 (defensively fine on 7 too). M-ID: M-B-07, M-B-09.

4. **Document, at every `ctx.execute()` call that shells to an external tool, which ambient environment variables that tool is known to consult.**
   Rationale: `execute()`'s local path always seeds the child's environment from the full Bazel-server ambient environment (`StarlarkBaseExternalContext.java:2103`) — `getenv()` declarations cover only what the *Starlark code* reads, never what the invoked binary reads on its own.
   Verify: named heuristic — for each `ctx.execute(` call site, confirm a comment or linked doc names the invoked tool's env-var surface; a call with no such note and no accompanying `getenv()` coverage is a finding. Not exhaustively grep-checkable (see Decision 1).
   Severity: SHOULD. Bazel: all majors (confirmed against current `master`). M-ID: M-B-07, M-B-19.

5. **Prefer `--repo_env=NAME=value` in a `.bazelrc` over exporting the same variable only in CI job config, for anything a repository rule's `getenv()` reads.**
   Rationale: `--repo_env` makes the dependency reviewable in one committed file; the flag's own doc notes repo rules "see the full environment anyway," so pinning explicitly is the only way to make the intended value visible without trusting the calling shell.
   Verify: cross-reference `getenv()` site names against `--repo_env=` entries in `.bazelrc*`/CI-invoked flags. Absence isn't automatically wrong — a manual check.
   Severity: CONSIDER. Bazel: 7-9 (flag stable). M-ID: M-B-07.

6. **Every `ctx.download()`/`ctx.download_and_extract()` call must carry `sha256=` or `integrity=`.**
   Rationale: an unchecksummed fetch is non-hermetic (content can change under a floating URL) and is invisible to the content-addressed repository cache, which is keyed on the expected sha256.
   Verify: `grep -n 'ctx\.download' **/*.bzl`, confirm `sha256`/`integrity` on every match. Empty (no unchecksummed hit) = pass.
   Severity: MUST. Bazel: all majors. M-ID: M-B-08.

7. **Don't expect `--repository_cache` to dedupe content fetched by `ctx.execute()`-driven tool invocations.**
   Rationale: the cache is keyed on the expected sha256 of a *download request*; `execute()` has no such concept, so the same content re-fetches from scratch in every fresh output base regardless of how many sibling workspaces already have it.
   Verify: named heuristic — compare `grep -c 'ctx\.execute('` against `grep -c 'ctx\.download'` in a ruleset's repository rules; a ruleset dominated by `execute()` for content acquisition needs its own documented cache story, not a reference to Bazel's.
   Severity: SHOULD (documentation). Bazel: all majors. M-ID: M-B-19.

8. **Treat `repository_ctx.attr.name` as the canonical repo name (with the `+` separator, Bazel 8+); never parse it for the apparent name, and never hard-code the pre-8.0 `~` separator.**
   Rationale: `--incompatible_use_plus_in_repo_names` flipped the separator in Bazel 8.0 and immediately became a no-op flag — there is no way back to `~`, and any code that parsed canonical-name structure silently broke at the same release.
   Verify: `grep -n '~' *.bzl scripts/* .bazelrc*` for a hard-coded separator assumption on a canonical-looking name; `grep -n 'ctx\.attr\.name'` to confirm no apparent-name display string is built from it. Empty on both = pass.
   Severity: MUST for anything parsing repo-name structure; CONSIDER for general awareness. Bazel: 8+ (was `~` pre-8.0). M-ID: M-B-09.

9. **A `repository_rule` that inspects the host machine (`ctx.os`, `ctx.which`, toolchain autodetection) should set `configure = True`; a rule with no host inspection should not set `local = True`.**
   Rationale: `configure` is the only knob `bazel fetch --force --configure` respects; over-marking `local = True` defeats caching across every fresh Bazel server (every CI job, typically), for no benefit if the rule isn't actually host-sensitive across restarts.
   Verify: for a rule using `ctx.os`/`ctx.which`, grep its `repository_rule(` call for `configure = True`; for a rule with neither, grep that `local` is absent or `False`. Mismatch = finding.
   Severity: SHOULD. Bazel: all majors.

10. **Never rely on `watch="auto"` for a path that might be inside the repo currently being fetched, or (for a module extension) outside the Bazel workspace.**
    Rationale: those are the two documented illegal-to-watch conditions; `"auto"` silently skips watching there instead of erroring, which reads as "covered" when it is not.
    Verify: named reading heuristic — for any `read()`/`extract()`/`template()`/`patch()` call whose path could be one of those two cases, confirm manually that it is genuinely external, or force `watch="yes"` and let the resulting error prove it.
    Severity: CONSIDER. Bazel: all majors.

11. **Every `fail()` reachable from a repository rule or module extension names the exact command that fixes the condition.**
    Rationale: a repo-rule failure has no interactive debugging session attached — the message is the entire remediation UI, for a human or an agent equally.
    Verify: `grep -n 'fail(' *.bzl`, then confirm each string contains a runnable command token (a backtick- or quote-delimited CLI invocation), not just a description of the failure. Not a pure grep — a named reading heuristic. Zero `fail()` calls trivially passes; a `fail()` with no command in its text is a finding.
    Severity: SHOULD. Bazel: all majors. M-ID: M-B-22.

12. **Don't delete or renumber a BCR-published module's `compatibility_level` just because the resolver treats it as a no-op on Bazel 8.6+/9.1+.**
    Rationale: BCR presubmit's `bcr_validation.py` still diffs the field against the previous version and blocks a mismatch; the no-op is resolver-only, the registry gate is independent of it and version-independent.
    Verify: `grep -n 'compatibility_level' MODULE.bazel` before/after any edit to a module slated for BCR publication — a diff on this line must be intentional and paired with `@bazel-io skip_check compatibility_level` in the PR.
    Severity: MUST when publishing to the BCR. Bazel: 8.6.0+/9.1.0+ for the resolver no-op; presubmit behavior is registry-side and version-independent. M-ID: M-B-13.

13. **A BCR submission's `presubmit.yml` should include a `bcr_test_module` (with `local_path_override`), not only the built-in anonymous-module `verify_targets` check.**
    Rationale: the anonymous-module test proves the module's own public targets build stand-alone; it does not exercise a real consumer's `bazel_dep()` + `use_extension()` + `use_repo()` graph, including dev-only dependencies the module itself can't declare.
    Verify: the module's `presubmit.yml` (or `.bcr/presubmit.yml`) has a top-level `bcr_test_module:` key. Missing = finding (P1 — anonymous-module alone still catches most breakage).
    Severity: SHOULD. Bazel/BCR: current practice, 2026-09-05. M-ID: M-B-14.

14. **A build-only BCR test module (`build_targets` only) does not prove the repository rule's runtime orchestration is correct — say so where the gap is deliberate.**
    Rationale: `bazel build` never executes the generated launcher/binary; a bug in argument assembly, exit-code handling, or `ctx.execute()` ordering ships through BCR presubmit undetected. This is fine when named and reasoned, and a real gap when silent.
    Verify: in the test module's BUILD file, grep for `sh_test(` or the presence of `test_targets:` in `presubmit.yml`. None present = the gap exists; check for an explicit comment naming why (a live-network dependency, matrix flakiness) rather than silence.
    Severity: CONSIDER→SHOULD once the reason for staying build-only stops applying. Bazel/BCR: current practice. M-ID: M-B-14.

15. **Use `@bazel-io skip_check <name>` comments only for a deliberate, reasoned exception, never as a default way past a failing presubmit.**
    Rationale: these are lightweight, per-check escape hatches — the bot only labels the PR; it doesn't itself approve, merge, or bypass any other requirement. Defaulting to skip defeats the specific protection that check exists to provide (source-archive stability, compatibility signaling, migration readiness).
    Verify: for a PR carrying a `skip-*` label, confirm the PR thread states a reason. No stated reason alongside a skip label = finding.
    Severity: CONSIDER. Bazel/BCR: current practice, 2026-09-05.

16. **Don't hand-copy an `incompatible_flags:` override into `presubmit.yml` from an old example without checking it against the BCR's current `incompatible_flags.yml`.**
    Rationale: the live list changes as Bazel flags flip and retire (six entries as of 2026-09-05); a stale copy tests against flags that no longer matter and misses ones that now do — the same "phantom flag carried forward from an old source" failure mode as `--experimental_remote_merkle_tree_cache` (map conflict 14), generalized to BCR's own list.
    Verify: diff the module's `presubmit.yml` `incompatible_flags:` block (if present) against [`incompatible_flags.yml`](https://github.com/bazelbuild/bazel-central-registry/blob/main/incompatible_flags.yml) at HEAD. No override present = fully inherits the live list (usually correct, worth confirming once).
    Severity: CONSIDER. Bazel/BCR: current practice, 2026-09-05.

17. **`--experimental_workspace_rules_log_file` plus the `workspacelog:parser` tool is the way to confirm which of the six non-hermetic operation categories a rule actually invoked on a given run — not a substitute for reading the rule.**
    Rationale: the taxonomy names categories of API surface (`execute`, `download*`, `file`/`template`, `os`, `symlink`, `which`); only the runtime log says which repo rule called which method with which arguments, and only after a clean `bazel clean --expunge`.
    Verify: `bazel clean --expunge && bazel build --experimental_workspace_rules_log_file=/tmp/wsl <target> && bazel build src/tools/workspacelog:parser && bazel-bin/src/tools/workspacelog/parser --log_path=/tmp/wsl | grep -E '"os"|"which"'`. No hits for a rule expected to be pure = pass.
    Severity: CONSIDER (diagnostic — belongs in `bazel-diagnose`, cited here for completeness). Bazel: all majors (flag since 0.18, current through 9.1.0 docs).

18. **A `repository_rule(remotable = True)` must forward every environment variable the invoked binary needs through `environment=` explicitly — never rely on ambient inheritance, even on the local path.**
    Rationale: code that "happens to work" locally because it silently inherits `PATH`/`LANG`/etc. from the Bazel server breaks specifically when executed remotely, since remote execution "only sees the explicitly set environment variables" (§3) — the opposite of local behavior.
    Verify: for each `repository_rule(remotable = True)`, grep its `ctx.execute(` calls for an `environment=` dict covering every variable the invoked binary's own docs/source name as consulted.
    Severity: CONSIDER (`remotable` is itself documented experimental). Bazel: all majors. M-ID: M-B-19.

19. **When a module is yanked, don't rely on memory of `--allow_yanked_versions`'s spelling — read it from the flag reference, and prefer the `BZLMOD_ALLOW_YANKED_VERSIONS` env var for a one-off local override over changing `MODULE.bazel`.**
    Rationale: bypassing a yank should be a visible, temporary, local decision, not a change to a committed file that silently un-yanks the dependency for every future build.
    Verify: `grep -n 'allow_yanked\|BZLMOD_ALLOW_YANKED_VERSIONS' MODULE.bazel .bazelrc*` — a hit in a committed file (versus a shell-local env var or a one-off flag) is worth a second look.
    Severity: CONSIDER. Bazel: all majors.

20. **Never claim a repository rule is "fully hermetic" from a `getenv()`/`watch()` grep count alone when its implementation calls `ctx.execute()`.**
    Rationale: the count only proves the Starlark code's *own* declared reads are tracked (§1-§2); it says nothing about what the invoked binary reads from the inherited ambient environment (§3), which is structurally untrackable from the calling `.bzl` file.
    Verify: named heuristic — a claim of "N getenv sites, M watch sites, therefore hermetic" in a doc/README/rule file that does not also address `ctx.execute()` environment inheritance is incomplete on its face; check for that qualifier.
    Severity: MUST (as a documentation-completeness check, not a code check). Bazel: all majors. M-ID: M-B-07, M-B-19.

## Fleet evidence

`rules_ocx` (0.4.0, `.bazelversion` = `8.7.0`) is the one Bazel repository in the fleet and the working example throughout. All line numbers below were re-read directly against the checked-out tree on 2026-09-05 and match the brief's own citations exactly.

**Env-var and watch inventory** (§1, §2, Decision 1) — `grep -n -F 'ctx.getenv(' ocx/private/*.bzl`:

| File:line | Read |
|---|---|
| `download.bzl:36` | `OCX_INSTALL_DIST_URL` |
| `download.bzl:44` | `OCX_INSTALL_MIRROR_URL` |
| `repo_utils.bzl:630` | `OCX_HOME` |
| `repo_utils.bzl:632` | `USERPROFILE` / `HOME` (two calls, one line) |
| `repo_utils.bzl:659` | one of `_rows("site")`/`_rows("translucent")` |
| `repo_utils.bzl:724` | `OCX_NO_CONFIG` |
| `repo_utils.bzl:728` | `_CONFIG_HOME_ENV` members |

Matches [`starlark-code-shape.md:147`](bazel-audit/starlark-code-shape.md) exactly. `grep -n -F 'ctx.os.'` across the same tree hits only `.name`/`.arch` at `download.bzl:33`, `package.bzl:156`, `project.bzl:131` — **zero** `ctx.os.environ` uses ([`starlark-code-shape.md:151`](bazel-audit/starlark-code-shape.md)); rule 1 above passes today with empty output.

`ctx.watch()`/`ctx.watch_tree()`: `package.bzl:168` (`ctx.watch_tree(index)`, immediately after `ctx.path(ctx.attr.index)` at `:166` — the correct post-8.0 pattern from §4), `repo_utils.bzl:708,722,735` (three `ctx.watch()` calls). `download.bzl`'s only label attr, `dist_manifest`, is read via `ctx.read(ctx.attr.dist_manifest)` at `download.bzl:41` — `read()`'s default `watch="auto"` covers it because the label points outside the repo being fetched, so no explicit `ctx.watch()` is needed there.

**The three hand-built, fail-open paths**, exactly as the brief names them, self-documented in the fleet's own rule file:

> "ocx has no read-only command that reports any of those paths, so they are unavoidably hard-coded — and the watch fails *open*: relocate the directory upstream and it silently covers nothing, with no error." — `rules_ocx/.claude/rules/starlark.md:20-23` *(fleet-local file, not published)*

- `ambient_config_paths()` (`repo_utils.bzl:368-421`) — skips `/etc/ocx/config.toml` on Windows because it isn't absolute there, so an edit to that tier's Windows equivalent never refetches (documented gap, `repo_utils.bzl:390-395`).
- `sigstore_trust_root_path()` (`repo_utils.bzl:572-591`) — hard-codes `$OCX_HOME/sigstore/trusted-root.json`; relocating it upstream silently drops the watch.
- `manifest_sha256()` (`manifest.bzl:52-70`) — only a `<64-hex>.json` last-path-segment is self-verifying; any other manifest name downloads unverified with no error (`download.bzl:36-41` is the caller).

**The `execute()` environment leak (§3), applied**: `repo_utils.bzl:780,796,919` are the tree's three `ctx.execute()` call sites, all invoking the pinned `ocx` binary with a carefully assembled `env` dict from `make_ocx_env()` (`repo_utils.bzl:604-717` — the exact helper `config-inventory.md #41` names as asserted-not-verified). Per §3, this `env` dict is layered onto, not a replacement for, the Bazel server's full ambient environment — so any environment variable `ocx` itself consults that isn't in `OCX_ENV_CLASSES` passes through unlisted. This is not flagged anywhere in the fleet's own docs; it is a structural property of `ctx.execute()` the fleet's careful env-class design cannot close (Decision 1's boundary tier).

**Repository cache scope (§9, rule 7)**: `download.bzl:38,45` are the only two `ctx.download`/`download_and_extract` calls in the tree, both carrying `sha256=` — these are the only fetches in `rules_ocx` eligible for `--repository_cache`. The three `ctx.execute()` sites above, which is where the actual OCI package content materializes via the `ocx` CLI, get no benefit from it; `AGENTS.md` documents that tool content is instead deduped through the shared `OCX_HOME` content-addressed store, entirely outside Bazel's own caching (`build-contracts-and-ci-posture.md:197`).

**Compatibility level (§13, rule 12)**: `rules_ocx`'s `MODULE.bazel` (32 lines) never declares `compatibility_level` at all — it has never needed to bump it, so the field's absence has never been tested against BCR presubmit's diff check. The gap named in rule 12 is latent, not yet exercised.

**BCR test module (§12, §14, Decision 2)**: `.bcr/presubmit.yml` is exactly a `bcr_test_module` (not a bare anonymous-module block) at `module_path: "e2e/bzlmod"`, matrix `platform: [debian11, ubuntu2204, macos, windows]` × `bazel: [8.x, 9.x]` = **8 cells**, one task `verify_test_module` building `//...` — matching the frame's correction 5 (8 shards, not 4) and `build-contracts-and-ci-posture.md:252`. `e2e/bzlmod/BUILD.bazel:5-11` is entirely a `filegroup`, no `sh_test`, with the gap self-named:

> "ponytail: build-only. Executing jq would pull from the ocx.sh registry across the whole BCR platform matrix (flaky); add an sh_test that runs the launcher if BCR CI proves reliable against the live registry." — `e2e/bzlmod/BUILD.bazel:5-7`

This is Decision 2 already reached, independently, by the fleet itself — the shipped rule's recommendation (rule 14) matches the fleet's own stated upgrade condition rather than prescribing a new one.

**Fail-message convention (rule 11, M-B-22)**: `starlark.md:32-33` states the convention ("map ocx sysexits to `fail()` naming the user-fixable command, e.g. exit 65 → run `ocx lock`"); `repo_utils.bzl:801-802` (`fail("rules_ocx: {} failed (exit {}): ocx {}\n{}{}"...)`) and `:633-634`, `:640-643` are representative instances, all ending in a named, runnable next step. `config-inventory.md:220` confirms this row as asserted-and-followed with no enumerated test.

## AI-agent angle

- **Assuming a `Label`-typed attr auto-watches its file.** Pre-8.0 training data and most public examples predate `--incompatible_no_implicit_watch_label`. Smallest check: for every `attr.label()` name, grep the impl for that name next to `ctx.path(`/`ctx.read(`/`ctx.watch(` (rule 3) — a miss is exactly this mistake.
- **Reaching for `ctx.os.environ` because it looks like a normal environment dict.** It reads correctly and silently breaks cache invalidation — no error, no lint, no test failure until someone notices a stale fetch. Smallest check: `grep -rn 'os\.environ'` (rule 1); non-empty is always a finding.
- **Generating `repository_rule(environ = [...])` from memory instead of `getenv()`.** Still parses, still runs, and is now the deprecated path — it "loads but is wrong" in exactly the sense this program watches for. Smallest check: `grep -n 'environ\s*=\s*\['` inside a `repository_rule(` call (rule 2).
- **Believing `getenv()`/`watch()` coverage makes a rule that shells out fully hermetic.** The single most consequential misconception this dive found: §3 shows `ctx.execute()` always inherits the full ambient environment locally, regardless of any Starlark-side declaration. Smallest check: does the rule call `ctx.execute()` at all? If yes, "N getenv sites" is not a hermeticity proof (rule 20).
- **Parsing or hard-coding the `~` separator in a canonical repo name.** Training data before 2026 near-universally uses `@@foo~1.0.0`; Bazel 8+ uses `@@foo+1.0.0` with no flag to revert. Smallest check: `grep -n '~' *.bzl scripts/*` for a canonical-name-shaped string (rule 8).
- **Deleting `compatibility_level` because "the docs say it's a no-op."** True at the resolver, false at BCR presubmit — deleting or renumbering it without `@bazel-io skip_check compatibility_level` fails the next PR. Smallest check: diff `compatibility_level` before/after any MODULE.bazel edit destined for the BCR (rule 12).
- **Copying a WORKSPACE-era `--experimental_workspace_rules_log_file` runbook and skipping `bazel clean --expunge` first.** Cached fetches never appear in the log, so a partial run under-reports non-hermetic operations without any indication it did so. Smallest check: confirm the expunge step is present in any generated runbook before trusting an empty grep of the log's output.
- **Assuming `test_targets:` in a BCR `presubmit.yml` behaves like `build_targets:` but "also runs tests."** BCR's own docs call it unreliable specifically because dev dependencies aren't available outside the root module — a generated `presubmit.yml` that leans on `test_targets` for a module with real dev deps will intermittently fail presubmit for reasons unrelated to the module's own correctness. Smallest check: does the module declare `dev_dependency` deps the test targets need? If yes, route through a `bcr_test_module` instead (rule 13).
- **Hand-copying an `incompatible_flags:` block from an old `presubmit.yml` example.** The live list drifts as flags flip and retire (six entries as of 2026-09-05) — a stale copy tests flags no longer gated and misses newly-added ones. Smallest check: diff against the current `incompatible_flags.yml` (rule 16).

## Contested / evolving

- **`--incompatible_no_implicit_watch_label` is still a live, revertible flag** (`defaultValue = "true"`, `INCOMPATIBLE_CHANGE` metadata tag, current `master`) — unlike `--incompatible_use_plus_in_repo_names`, which was hard-flipped into a permanent no-op the same release it defaulted true. Whether this flag follows the same path in a future major (10?) is unknown as of 2026-09-05; treat the explicit-watch requirement as durable regardless, since reverting the flag would only restore a narrower, already-discouraged auto-watch behavior.
- **BCR attestations are optional today, named as the eventual universal default, with no committed date.** `docs/attestations.md` states the ambition directly but the "Future Work" list (extensive pre/post-submit testing with real attestations, a BCR web-UI indicator, a GitHub Action) is still open as of 2026-09-05 — trending toward mandatory, not yet close to it.
- **`remotable = True` on a repository rule remains explicitly experimental** ("may change at any time") and repo-rule remote execution is not generally available per `external/faq`'s own framing of repo rules as host-machine scripts. The module-extension-side remote repo-contents cache (covered by the sibling `module-extension-purity-and-repo-contents-cache` dive) is the more active frontier for repo-rule-adjacent remote infrastructure as of 2026-09-05 — `remotable` itself has seen no comparable investment.
- **`compatibility_level`'s two-layer status is a genuine, stable disagreement between the resolver team's stated direction and the registry's operational check**, not a transition in progress: the FAQ actively tells authors to stop using the field while BCR presubmit has not removed the corresponding validation. No source in this dive's corpus suggests either side is about to move — the correct authoring stance (rule 12) is to treat both as permanently true rather than expect near-term convergence.
- **`bazel.build/remote/workspace` is itself a WORKSPACE-era page title** ("Finding Non-Hermetic Behavior in WORKSPACE Rules") describing a mechanism (`repository_ctx`, the six-operation taxonomy) that applies identically under Bzlmod — a live illustration of map conflict 8's finding that a `bazel.build` prose page's currency has to be checked per-claim, not assumed from the page still existing in the current doc tree.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [bazel.build/external/repo](https://bazel.build/external/repo) | Official docs — repository rule reference | Current, 2026-09-05 | The exact five-item re-fetch trigger list, `configure`/`local`, canonical-vs-apparent `name` |
| [bazel.build/remote/workspace](https://bazel.build/remote/workspace) (raw: `site/en/remote/workspace.md`) | Official docs | Flag since Bazel 0.18, page current through 9.1.0 doc tree | Verbatim six-item non-hermetic-operation taxonomy and the workspacelog runbook |
| [bazel.build/external/faq](https://bazel.build/external/faq) | Official docs — Bzlmod FAQ | Current, 2026-09-05 | `compatibility_level` no-op wording (8.6.0/9.1.0), canonical-name framing |
| [bazel.build/rules/lib/builtins/repository_ctx](https://bazel.build/rules/lib/builtins/repository_ctx) | Official API reference | Current, 2026-09-05 | Exact signatures and `watch=` semantics for `read`/`extract`/`template`/`patch`/`download*` |
| [bazel.build/rules/lib/globals/bzl#repository_rule](https://bazel.build/rules/lib/globals/bzl#repository_rule) | Official API reference | Current, 2026-09-05 | `repository_rule()`'s own parameters; `environ=` marked Deprecated |
| [bazel.build/rules/lib/builtins/repository_os](https://bazel.build/rules/lib/builtins/repository_os) | Official API reference | Current, 2026-09-05 | `ctx.os.environ` explicitly documented as untracked |
| [bazel.build/reference/command-line-reference#flag--repo_env](https://bazel.build/reference/command-line-reference#flag--repo_env) | Official CLI reference | Current, 2026-09-05 | "repository rules see the full environment anyway" — the doc-level confirmation of §3 |
| [bazel.build/rules/lib/globals/module](https://bazel.build/rules/lib/globals/module) | Official API reference | Current, 2026-09-05 | `compatibility_level` now documented `Deprecated... no-op` |
| [bazel.build/run/build#repository-cache](https://bazel.build/run/build#repository-cache) | Official docs | Current, 2026-09-05 | Repository cache keyed on expected sha256; default path |
| [BCR `docs/bcr-policies.md`](https://github.com/bazelbuild/bazel-central-registry/blob/main/docs/bcr-policies.md) | Registry's own contribution/maintenance policy | Current, 2026-09-05 | Add-only guarantee, maintainer playbook, PR review requirements |
| [BCR `docs/README.md`](https://github.com/bazelbuild/bazel-central-registry/blob/main/docs/README.md) | Registry's own contribution guide | Current, 2026-09-05 | Full presubmit validation list, anonymous-module test, test module, incompatible-flags testing, yanking |
| [BCR `docs/attestations.md`](https://github.com/bazelbuild/bazel-central-registry/blob/main/docs/attestations.md) | Registry's own feature doc | Marked experimental, 2026-09-05 | Attestation format, verification tool, stated eventual-default ambition |
| [BCR `incompatible_flags.yml`](https://github.com/bazelbuild/bazel-central-registry/blob/main/incompatible_flags.yml) | Registry's own live config (raw source) | Read live, 2026-09-05 | The exact, current list a presubmit run tests against |
| [Bazel 8.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/8.0.0) | Official GitHub release notes | 2024 (8.0 LTS) | `--incompatible_no_implicit_watch_label` and `--incompatible_use_plus_in_repo_names` both listed as flipped in 8.0 |
| [Bazel 9.0.0 release notes](https://github.com/bazelbuild/bazel/releases/tag/9.0.0) | Official GitHub release notes | 2026-01-20 | WORKSPACE code deletion, `--incompatible_disable_native_repo_rules` flip, current-era flag list |
| [bazelbuild/bazel#23861](https://github.com/bazelbuild/bazel/issues/23861) | Official incompatible-flag tracking issue | 2024, resolved | `--incompatible_no_implicit_watch_label`'s own migration guide, verbatim |
| [bazelbuild/bazel#23127](https://github.com/bazelbuild/bazel/issues/23127) | Official incompatible-flag tracking issue | 2024, resolved | `--incompatible_use_plus_in_repo_names`'s "immediately becomes a no-op" note and apparent-name migration guide |
| [`StarlarkBaseExternalContext.java`](https://github.com/bazelbuild/bazel/blob/948b8c70e281c2fe42aa5468dad543c7af9f0ccc/src/main/java/com/google/devtools/build/lib/bazel/repository/starlark/StarlarkBaseExternalContext.java) | Bazel's own source (ground truth) | Read at `master`@`948b8c70`, 2026-09-05 | `getenv()`'s doc string; `execute()`'s local-vs-remote environment construction (the primary evidence for §3) |
| [`BuildLanguageOptions.java`](https://github.com/bazelbuild/bazel/blob/master/src/main/java/com/google/devtools/build/lib/packages/semantics/BuildLanguageOptions.java) | Bazel's own source (ground truth) | Read at `master`, 2026-09-05 | `--incompatible_no_implicit_watch_label`'s live flag definition and default |

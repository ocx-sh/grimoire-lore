---
title: Sandbox, environment and toolchain leakage
topic: sandbox-environment-and-toolchain-leakage
group: bazel-hermeticity-determinism
family: BZL-HERM
agent: research-lang wave-2 worker
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 19
primary_sources_count: 17
settles: [M-C-05, M-C-06, M-C-08, M-C-09, M-C-10, M-C-11, M-C-12, M-C-15, M-C-16, M-C-17, M-C-18]
scope: >
  How a Bazel build reaches the host despite the sandbox (sandbox strategies, host-path
  mounts, C++ toolchain autodetection, action/repo environment leakage, the glob
  package-boundary trap) and how the checked-in-generated-file pattern lets a build
  write to the source tree safely. Does not restate the general non-determinism cause
  list (embedded timestamps, iteration order, /dev/random) — that is
  bazel-hermeticity-determinism/action-nondeterminism-taxonomy.md's territory, cited
  here by pointer only. Does not cover module-extension `reproducible=True` or BCR
  repo-rule hermeticity mechanics — those are bazel-bzlmod-and-repo-rules' two dives.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The three sandbox strategies and their isolation contracts](#1-the-three-sandbox-strategies-and-their-isolation-contracts)
   2. [The read-only host mount: Bazel's "original sin" and its measured cost](#2-the-read-only-host-mount-bazels-original-sin-and-its-measured-cost)
   3. [`--sandbox_debug`: the inspection tool that must not stay on](#3---sandbox_debug-the-inspection-tool-that-must-not-stay-on)
   4. [Network isolation defaults to off](#4-network-isolation-defaults-to-off)
   5. [C++ toolchain autodetection and its one escape hatch](#5-c-toolchain-autodetection-and-its-one-escape-hatch)
   6. [`--repo_env` vs `--action_env`: a Bazel-8-vs-9 behavior change, not just a naming split](#6---repo_env-vs---action_env-a-bazel-8-vs-9-behavior-change-not-just-a-naming-split)
   7. [`--incompatible_strict_action_env`: also a Bazel-8-vs-9 default flip, not a settled fact](#7---incompatible_strict_action_env-also-a-bazel-8-vs-9-default-flip-not-a-settled-fact)
   8. [Finding non-hermetic repository-rule operations mechanically](#8-finding-non-hermetic-repository-rule-operations-mechanically)
   9. [The glob() package-boundary trap](#9-the-glob-package-boundary-trap)
   10. [The checked-in-generated-file pattern](#10-the-checked-in-generated-file-pattern)
   11. [A golden-diff test pinned to one Bazel major](#11-a-golden-diff-test-pinned-to-one-bazel-major)
   12. [Symlinked-sandbox cost and Windows path length](#12-symlinked-sandbox-cost-and-windows-path-length)
   13. [rules_ocx's own override: inert, not live](#13-rules_ocxs-own-override-inert-not-live)
3. [Decisions](#decisions)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Fleet evidence](#fleet-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Bazel has exactly three sandbox strategies — `linux-sandbox`, `darwin-sandbox`, `processwrapper-sandbox` — and only the third runs everywhere; it is also the weakest, enforcing nothing beyond "don't read an undeclared input" ([§1](#1-the-three-sandbox-strategies-and-their-isolation-contracts)).
- The default `linux-sandbox`/`darwin-sandbox` mount the whole filesystem read-only except the sandbox directory, which lets a build silently read host system libraries and tools — this is documented as "original sin #1" and empirically measured across 70 real projects ([§2](#2-the-read-only-host-mount-bazels-original-sin-and-its-measured-cost)).
- `--sandbox_debug` defaults `false` and, when set, stops Bazel from deleting the sandbox directory after the build — leaving it on fills the disk; it is a debug flag, never a standing config ([§3](#3---sandbox_debug-the-inspection-tool-that-must-not-stay-on)).
- `--sandbox_default_allow_network` defaults `true` — Bazel does **not** block network access by default; you must explicitly flip it to find a network-dependent action before RBE does ([§4](#4-network-isolation-defaults-to-off)).
- `BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1` is the only documented way to stop the C++ toolchain autodetection probe, which runs at workspace setup whether or not any `cc_*` target exists; the check now lives in rules_cc's own `cc/private/toolchain/cc_configure.bzl`, not in Bazel core ([§5](#5-c-toolchain-autodetection-and-its-one-escape-hatch)).
- **Surprise, not in the brief or the map**: `--incompatible_repo_env_ignores_action_env` defaults `false` on the entire Bazel 8.x line (verified 8.0.0–8.8.0) and `true` starting Bazel 9.0.0 — `--action_env` leaks into repository-rule and module-extension environments on 8.x and stops leaking on 9.x, with no announcement in either repo's own config ([§6](#6---repo_env-vs---action_env-a-bazel-8-vs-9-behavior-change-not-just-a-naming-split)).
- **A second, larger surprise that corrects the frame**: `--incompatible_strict_action_env` — which the frame's own correction says "now defaults true" — in fact defaults `false` across the *entire* Bazel 8.x line (8.0.0 through 8.8.0, including rules_ocx's own 8.7.0 pin) and only flips to `true` at Bazel 9.0.0 ([§7](#7---incompatible_strict_action_env-also-a-bazel-8-vs-9-default-flip-not-a-settled-fact)).
- A repo whose CI matrix spans Bazel 8 and 9 without pinning this flag runs each leg under a *different* PATH/`LD_LIBRARY_PATH` inheritance policy purely because of the version default, not because anyone configured it that way.
- `--experimental_workspace_rules_log_file` plus `bazel-bin/src/tools/workspacelog/parser` is the mechanical way to enumerate every `execute`, unchecksummed `download`, `which`, `.os`, and `.symlink` call a repository rule makes — the operations bazel.build's own doc names as non-hermetic ([§8](#8-finding-non-hermetic-repository-rule-operations-mechanically)).
- `glob()` silently stops matching inside any subdirectory that gains its own `BUILD`/`BUILD.bazel` file — no error, no warning, just a smaller match set from then on; this was once a real bug (`BUILD.bazel` not recognized, fixed 2017) and is now correct-but-still-surprising behavior ([§9](#9-the-glob-package-boundary-trap)).
- The checked-in-generated-file pattern (`write_source_files` + `diff_test`) works because `bazel build`/`bazel test` cannot write to the source tree by construction, while `bazel run` sets `BUILD_WORKSPACE_DIRECTORY` so the same target's update mode can `cd` there and write for real ([§10](#10-the-checked-in-generated-file-pattern)).
- A golden-diff/snapshot test pinned to one Bazel major must say so: rules_ocx's own docs-freshness test only runs on the 8.7.0 CI leg because stardoc emits an extra `repo_mapping` row on Bazel 9+ (`ci.yml:57-62`) — two of three CI legs get zero docs-freshness signal ([§11](#11-a-golden-diff-test-pinned-to-one-bazel-major)).
- A deliberately-uncached CI job proves the build is correct from a cold cache; it proves nothing about action-key stability, and would still pass with a non-deterministic action.
- The symlinked-sandbox setup cost issue (bazelbuild/bazel#16711) has been open since 2022 and is still open in 2026; the one shipped mitigation is `--experimental_reuse_sandbox_directories`, still experimental ([§12](#12-symlinked-sandbox-cost-and-windows-path-length)).
- rules_ocx's own `.bazelrc.user` C-toolchain override (`CC=` a zig wrapper, `-layering_check`) is real, non-hermetic, and currently inert — the repo compiles zero `cc_*` targets — which is a distinction to preserve, not flatten: it becomes live the instant any dependency pulls in a `cc_library` ([§13](#13-rules_ocxs-own-override-inert-not-live)).
- A peer-reviewed 2024/2025 measurement across 70 real Bazel projects found **zero** with a fully hermetic build, and that rules_cc's and rules_python's *default* configuration is the largest single documented cause — a fact independent of any one repo's discipline.
- Bazel 9.0 deleted WORKSPACE support code outright (not disabled it); an agent proposing a `WORKSPACE`-era `cc_configure()`/`local_repository()` fix on a Bazel-9 target is proposing dead machinery.

## Findings

### 1. The three sandbox strategies and their isolation contracts

Bazel ships exactly three sandboxed-execution strategies ([bazel.build/docs/sandboxing](https://bazel.build/docs/sandboxing)):

| Strategy | Platform | Isolation |
|---|---|---|
| `linux-sandbox` | Linux only | Linux namespaces (mount, PID, network, IPC, user); "makes the entire filesystem read-only except for the sandbox directory"; can optionally block network; uses PID namespaces so the action cannot see other processes |
| `darwin-sandbox` | macOS only | Apple's `sandbox-exec`, "roughly the same as" linux-sandbox — the doc does not enumerate feature parity beyond that phrase, so treat network-blocking parity as unconfirmed rather than assumed |
| `processwrapper-sandbox` | any POSIX system | Builds a directory of symlinks to declared inputs and "prevents the action from accidentally using any input files that are not declared" — no read-only filesystem enforcement, no network isolation, no process/user namespace |

`processwrapper-sandbox` is the only one that runs on every POSIX platform (and stands in on Windows, where neither Linux nor Darwin sandboxing exists at all), which is exactly why it is also the weakest guarantee available: it catches an undeclared *input*, nothing else. A build that is "sandboxed" on Windows or a container without namespace support is sandboxed only in this narrow sense.

A stronger, still-experimental Linux option exists: `--experimental_use_hermetic_linux_sandbox` (default `false`) — "do not mount root, only mount what's provided with `sandbox_add_mount_pair`" ([SandboxOptions.java:339-350](https://raw.githubusercontent.com/bazelbuild/bazel/master/src/main/java/com/google/devtools/build/lib/sandbox/SandboxOptions.java)). This is the flag that actually closes the read-only-host-mount trap in §2, at the cost of having to declare every mount explicitly.

### 2. The read-only host mount: Bazel's "original sin" and its measured cost

fzakaria's *Bazel's Original Sins* names this as sin #1: "the root `/` is mounted *read-only* by default into the sandbox," which creates accidental dependencies on host system libraries and tools. The worked example is real: "I spent more time than I care to admit tracking down a bug that turned out to be a difference between GNU & BSD `diff`" ([fzakaria.com/2025/06/22/bazel-s-original-sins](https://fzakaria.com/2025/06/22/bazel-s-original-sins)). The mechanism, not the specific tool, is the portable lesson — any GNU-vs-BSD (or any two hosts' installed-version) divergence in a tool an action shells out to reproduces this bug shape.

This is not a rare edge case. A peer-reviewed 2024/2025 measurement (IEEE Software, Zheng/Adams/Hassan, Queen's University) traced 150 million Linux syscalls across the build processes of 70 real Bazel projects and found:

- **Zero of 70 projects had a fully hermetic build.**
- 2,439 non-hermetic build-dependency packages total (1,760 libraries, 679 toolchains); toolchains are the dominant source — 98.6% of projects depend on at least one non-hermetic top-level *toolchain* versus 54.3% for libraries.
- Of 394 non-hermetic top-level toolchains, **71.9% are Linux utility toolchains** (tar, grep, and similar) "that in principle could be managed by Bazel," and **38.1% are programming-language toolchains introduced by the default configuration of official Bazel rules** — specifically naming rules_cc and rules_python as using host-installed toolchains by default, and rules_java as compiling with a Bazel-managed JDK but executing/testing with the host JDK.
- Only **37.1%** of the 70 projects configure *any* hermetic toolchain, and none manage all their toolchains that way.
- Counter-example named in the same paper: rules_go uses a hermetic Go SDK by default, and only 1 of 24 rules_go-using projects overrode that to use the host Go instead — the inverse failure mode, showing the default matters more than developer discipline either way.

(Full citation and methodology in [Sources](#sources); read verbatim excerpts in the fetched PDF at `/home/mherwig/.claude/projects/-home-mherwig-dev-grimoire-lore/946b693c-7b64-4917-9d73-8efea67c92ab/tool-results/webfetch-1788642888582-4bbeqf.pdf`.)

### 3. `--sandbox_debug`: the inspection tool that must not stay on

`--sandbox_debug` defaults `false` ([SandboxOptions.java:88-98](https://raw.githubusercontent.com/bazelbuild/bazel/master/src/main/java/com/google/devtools/build/lib/sandbox/SandboxOptions.java)):

> "Enables debugging features for the sandboxing feature. This includes two things: first, the sandbox root contents are left untouched after a build; and second, prints extra debugging information on execution."

The reason it must never be a standing setting: leaving the sandbox root untouched means every action's sandbox directory accumulates on disk across the life of the flag being on — it is a leak by design, meant for a single diagnostic session (`--sandbox_debug` + inspect the mount set, per the map's own named check for M-C-10), then turned back off.

### 4. Network isolation defaults to off

`--sandbox_default_allow_network` defaults `true` ([SandboxOptions.java:288-298](https://raw.githubusercontent.com/bazelbuild/bazel/master/src/main/java/com/google/devtools/build/lib/sandbox/SandboxOptions.java)):

> "Allow network access by default for actions; this may not work with all sandboxing implementations."

Read that literally: Bazel's default posture is "actions may reach the network." Nothing blocks it unless you explicitly pass `--sandbox_default_allow_network=false`, and even then the note "may not work with all sandboxing implementations" means `processwrapper-sandbox` (§1) cannot enforce it at all — there is no network namespace to revoke. This is the cheapest pre-RBE check for a network-dependent action: flip the default and see what breaks, on a platform where `linux-sandbox`/`darwin-sandbox` actually run.

### 5. C++ toolchain autodetection and its one escape hatch

The classic native `@bazel_tools` C++ autoconfiguration that used to run unconditionally has been reduced to almost nothing in current Bazel — `tools/cpp/cc_configure.bzl` on `master` is 18 lines and just re-exports a Starlark helper ([raw](https://raw.githubusercontent.com/bazelbuild/bazel/master/tools/cpp/cc_configure.bzl)). The actual autodetection logic — and the escape hatch — now live in **rules_cc's own repository**, `cc/private/toolchain/cc_configure.bzl`:

```python
def _should_disable_toolchain(repository_ctx):
    """Returns true if the toolchain should be disabled based on environment variables."""
    env = repository_ctx.os.environ
    if env.get("BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN") == "1":
        return True
```
(verbatim, [raw.githubusercontent.com/bazelbuild/rules_cc/main/cc/private/toolchain/cc_configure.bzl](https://raw.githubusercontent.com/bazelbuild/rules_cc/main/cc/private/toolchain/cc_configure.bzl))

`BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1` (set via `--repo_env`, since it must reach a repository rule, not an action — see §6) is the *only* documented switch. Nothing in rules_cc's own README names this variable — it is source-verified, not doc-verified, which is exactly the map's conflict-8 warning about current-behaviour claims needing the source or release notes rather than a tutorial.

The probe runs at workspace/module-extension setup time regardless of whether the repository declares a single `cc_*` target — this is the mechanism behind the "inert, not live" framing in §13.

### 6. `--repo_env` vs `--action_env`: a Bazel-8-vs-9 behavior change, not just a naming split

The textbook split is: `--action_env=NAME[=VALUE]` reaches build **actions**; `--repo_env=NAME[=VALUE]` reaches **repository rules and module extensions** ([CommonCommandOptions.java:620-636](https://raw.githubusercontent.com/bazelbuild/bazel/master/src/main/java/com/google/devtools/build/lib/runtime/CommonCommandOptions.java), [CoreOptions.java:433-472](https://raw.githubusercontent.com/bazelbuild/bazel/master/src/main/java/com/google/devtools/build/lib/analysis/config/CoreOptions.java)). Bazel's own `repo_env` help text adds a wrinkle most guidance omits: "repository rules see the full environment anyway" — the flag exists to make specific variables settable via `.bazelrc`/CLI, not to *restrict* what a repo rule can read (that restriction is a separate, still-experimental flag, `--experimental_strict_repo_env`, default `false`).

What is not textbook, and not in the map: whether `--action_env` *also* leaks into that same repository-rule/module-extension environment is governed by a third flag, `--incompatible_repo_env_ignores_action_env`, and its default is **version-dependent**:

```
# Bazel 8.0.0 through 8.8.0 (verified by tag):
      name = "incompatible_repo_env_ignores_action_env",
      defaultValue = "false",
      ...
      help = "If true, --action_env=NAME=VALUE will no longer affect repository rule and module extension environments."

# Bazel 9.0.0, 9.1.0, 9.2.0 (verified by tag):
      name = "incompatible_repo_env_ignores_action_env",
      defaultValue = "true",
```
([CommonCommandOptions.java](https://raw.githubusercontent.com/bazelbuild/bazel/8.7.0/src/main/java/com/google/devtools/build/lib/runtime/CommonCommandOptions.java) at tag `8.7.0` vs `9.0.0`/`9.1.0`/`9.2.0`; tracking issue [bazelbuild/bazel#26222](https://github.com/bazelbuild/bazel/issues/26222); flip commit [bf0d751](https://github.com/bazelbuild/bazel/commit/bf0d751971650a9872036cf520e96b8b57f8d7f8), 2025-07-14; deprecation-to-delete tracked at [bazelbuild/bazel#27745](https://github.com/bazelbuild/bazel/issues/27745), which states plainly: "This is enabled by default in Bazel v9.")

Concretely: on Bazel 8.x (including rules_ocx's own 8.7.0 pin), `--action_env=NAME=VALUE` **still reaches** `repository_ctx.getenv("NAME")` inside a repository rule or module extension. On Bazel 9.x, it does not — only `--repo_env` does. Code (or a `.bazelrc`) that relies on an `--action_env` value showing up inside a repo rule works by accident on 8.x and breaks silently on 9.x, with no error — the repo rule's `getenv()` call just returns empty or falls back to a default. A follow-on PR ([bazelbuild/bazel#28205](https://github.com/bazelbuild/bazel/pull/28205), "[9.0.0] Fix and consolidate repo env handling", merged 2026-01-09) also fixed related invalidation bugs; a **partial** backport to 8.x landed as ([bazelbuild/bazel#29069](https://github.com/bazelbuild/bazel/pull/29069), merged 2026-06-24) but explicitly does **not** port the full consolidation — its own PR body states: "On 8.7.0, `RepoEnvironmentFunction` checks `--repo_env` first, then falls back to the client environment via `ClientEnvironmentFunction`, since the consolidated repo env computation from `CommandEnvironment` is not present." So 8.7.0 (the fleet's pin) keeps the older, leakier fallback chain even after that partial fix.

### 7. `--incompatible_strict_action_env`: also a Bazel-8-vs-9 default flip, not a settled fact

The frame's own wave-1 correction states "`--incompatible_strict_action_env` now defaults true" as a blanket era fact. Direct source verification across every Bazel 8.x point release, by tag, shows this is **incomplete**:

```
6.0.0  defaultValue = "false"
7.0.0  defaultValue = "false"
8.0.0  defaultValue = "false"
8.1.0 … 8.8.0  defaultValue = "false"   (every 8.x point release checked)
9.0.0  defaultValue = "true"
9.1.0  defaultValue = "true"
9.2.0  defaultValue = "true"
```
([BazelRuleClassProvider.java](https://raw.githubusercontent.com/bazelbuild/bazel/8.7.0/src/main/java/com/google/devtools/build/lib/bazel/rules/BazelRuleClassProvider.java), fetched per tag)

The help text, unchanged across versions:

> "If true, Bazel uses an environment with a static value for `PATH` and does not inherit `LD_LIBRARY_PATH`. Use `--action_env=ENV_VARIABLE` if you want to inherit specific environment variables from the client, but note that doing so can prevent cross-user caching if a shared cache is used."

So the correct, dated statement is: **`--incompatible_strict_action_env` defaults `false` throughout the entire Bazel 8.x line and `true` starting only at Bazel 9.0.0.** A repo pinned to 8.x that also runs 9.x/rolling in its own CI matrix (exactly rules_ocx's shape — see [Fleet evidence](#fleet-evidence)) gets a *different* PATH/`LD_LIBRARY_PATH` inheritance policy on each leg purely from the version default, with nothing in the repo's own config announcing the split. This is a genuine finding this dive did not expect going in — the frame's assertion pointed the wrong direction for the fleet's actual pinned version.

### 8. Finding non-hermetic repository-rule operations mechanically

`bazel.build/remote/workspace` names the specific `repository_ctx` operations that are non-hermetic by nature: `execute` (arbitrary host commands), `download`/`download_and_extract` without a `sha256`, `which` ("checking for programs installed on the host is usually problematic since the workers may have different configurations"), `.os` ("a hermetic build would generally not call this"), `.file`/`.template`, and `.symlink` when it reaches outside the repo or depends on host properties.

The mechanical check: `--experimental_workspace_rules_log_file=<path>` logs every such call as a binary `WorkspaceEvent` proto during workspace/repo-rule evaluation, decoded by a dedicated parser target:

```bash
bazel clean --expunge
bazel build --experimental_workspace_rules_log_file=/tmp/wsl.log //...
bazel build src/tools/workspacelog:parser
bazel-bin/src/tools/workspacelog/parser --log_path=/tmp/wsl.log > /tmp/wsl.txt
# optionally: --exclude_rule "//external:local_config_cc" to cut noise
```
([bazelbuild/bazel `src/tools/workspacelog`](https://github.com/bazelbuild/bazel/tree/master/src/tools/workspacelog); usage per [bazel.build/remote/workspace](https://bazel.build/remote/workspace)). `bazel clean --expunge` first matters: without a cold cache, a repository whose fetch was already satisfied from a prior run does not re-invoke the operations you are trying to catch.

### 9. The glob() package-boundary trap

`glob()`'s own reference doc is explicit about the mechanism: "Labels are not allowed to cross the package boundary and glob does not match files in subpackages" — a pattern like `**/*.cc` in package `x` silently excludes `x/y/*.cc` the moment `x/y` becomes its own package, and "the result of the glob expression actually depends on the existence of BUILD files" ([bazel.build/reference/be/functions](https://bazel.build/reference/be/functions)).

This was once also a real *bug*: [bazelbuild/bazel#4194](https://github.com/bazelbuild/bazel/issues/4194) (filed 2017, closed 2017) showed that a subpackage delineated by the newer `BUILD.bazel` filename was **not** recognized as a package boundary by `glob()`, so files inside it were incorrectly matched by the parent's glob and then failed at the label-crossing check with a confusing `crosses boundary of subpackage` error. That specific bug is fixed — `BUILD.bazel` and `BUILD` are both boundary markers today. The trap that remains is the *correct*, undocumented-in-practice behavior itself: adding either filename anywhere under an existing recursive glob's tree silently shrinks that glob's match set, with no error and no diagnostic — only a target that suddenly builds from fewer sources than the developer expects.

```python
# Traps a wide glob the moment `sub/` gains a BUILD file.
filegroup(
    name = "all-srcs",
    srcs = glob(["**/*.py"]),   # silently drops sub/*.py once sub/BUILD.bazel exists
)
```

The only reliable check is to read what the glob actually expanded to, not the pattern: `bazel query 'kind("source file", deps(//path:target))'` before and after any change that adds a package boundary underneath it.

### 10. The checked-in-generated-file pattern

`bazel build`/`bazel test` are sandboxed by construction and cannot write to the real source tree — this is exactly what §1/§2 describe as the point of sandboxing. `bazel run`, by contrast, executes outside that constraint and sets `BUILD_WORKSPACE_DIRECTORY` (the workspace root) and `BUILD_WORKING_DIRECTORY` (the invocation cwd) so the executed binary can act on the real tree ([bazel.build/docs/user-manual](https://bazel.build/docs/user-manual)).

`write_source_files` (bazel-contrib/bazel-lib, formerly under `aspect-build`, current release `v3.7.2` published 2026-09-02) is built directly on that asymmetry — its generated updater script:

```bash
current_working_dir=$PWD
# BUILD_WORKSPACE_DIRECTORY not set when running as a test, uses the sandbox instead
if [[ ! -z "${BUILD_WORKSPACE_DIRECTORY:-}" ]]; then
    cd "$BUILD_WORKSPACE_DIRECTORY"
fi
```
([lib/private/write_source_file.bzl:236-239](https://raw.githubusercontent.com/bazel-contrib/bazel-lib/main/lib/private/write_source_file.bzl))

Under `bazel test //:write_foo_test`, the variable is unset, so the script stays inside the sandbox and its `diff_test` half fails — that failure *is* the safety net, and it prints the exact `bazel run` command to fix it:

```
//a/b/c:foo.json is out of date. To update this and other generated files, run:

    bazel run //:write_all
```
Under `bazel run //:write_foo`, the variable is set, the script `cd`s to the real workspace, and the file is actually rewritten. The mechanism is the reason `bazel build`/`bazel test`'s refusal to touch the source tree is *safe* rather than merely inconvenient: there is no path by which a routine `bazel test //...` can mutate a tracked file, only `bazel run` on a target a human or CI step invoked on purpose.

### 11. A golden-diff test pinned to one Bazel major

rules_ocx's own CI carries a live, dated instance of this trap. `ci.yml:57-60`'s comment (per [ci audit §](../bazel-audit/build-contracts-and-ci-posture.md)): stardoc under Bazel 9+ emits an extra `repo_mapping` row, so the dev-pinned 8.7.0 golden `docs/*.md` only matches the 8.7.0 output; `ci.yml:62` excludes the `//docs/...` freshness test whenever `matrix.bazel != '8.7.0'`. Concretely: **docs freshness is verified on 1 of the repo's 3 CI legs** (8.7.0; not 9.x, not rolling) — a real staleness regression introduced by a change that only manifests under Bazel 9 would ship unnoticed.

### 12. Symlinked-sandbox cost and Windows path length

[bazelbuild/bazel#16711](https://github.com/bazelbuild/bazel/issues/16711) ("Symlinked sandbox is slow") — filed 2022-11-09, **still open** as of the last activity recorded (2025-11-23) — documents that sandbox setup cost scales with input count, with reports of actions carrying up to 300K inputs. The one mitigation actually shipped, per the thread, is `--experimental_reuse_sandbox_directories` ("essentially your point #5 [keeping the filesystem around and reusing it]... it helped a lot"); per-tree-artifact single-symlinking (point #3) remains unimplemented as of the same thread.

[bazelbuild/bazel#11482](https://github.com/bazelbuild/bazel/issues/11482) ("Remove maximum path length limitation on Windows") — filed 2020-05-25, **closed** 2020-06-15 with no flag shipped; the actual failure mode reported (a `cc_binary` build with `--dynamic_mode=fully` producing colliding output DLL names because a `SymlinkAction` silently falls back to a copy when the symlink target name is too long) was redirected to a narrower follow-up issue ([#11515](https://github.com/bazelbuild/bazel/issues/11515)) about namespacing DLL output names, not about lifting the path limit itself. There is no Bazel-side fix for the underlying Windows path-length ceiling; the operator-side workaround is a short `--output_user_root`.

### 13. rules_ocx's own override: inert, not live

`.bazelrc.user:1-3` (gitignored, host-specific): a comment ("host-specific: no g++ on this box, use zig as C compiler"), then `common --repo_env=CC=/home/mherwig/.local/bin/zig-bazel-cc`, then `build --features=-layering_check --host_features=-layering_check`. Both lines are real, absolute-path-baked-to-one-machine, and non-hermetic by construction ([build-contracts-and-ci-posture.md:70-72](../bazel-audit/build-contracts-and-ci-posture.md)).

The repository defines **zero** `cc_binary`/`cc_library`/`cc_toolchain` targets anywhere (`grep -rn "cc_binary\|cc_library\|cc_toolchain"` over every `.bzl`/`BUILD.bazel` → no output — [build-contracts-and-ci-posture.md:37](../bazel-audit/build-contracts-and-ci-posture.md)), and CI never reads this file's committed content at all — it is gitignored and never regenerated by CI ([build-contracts-and-ci-posture.md:79](../bazel-audit/build-contracts-and-ci-posture.md)). The override exists purely because §5's autodetection probe runs at workspace setup unconditionally, and this developer's machine has no `g++`. The correct framing, worth preserving exactly as the map states it: **a non-hermetic override that currently governs zero targets is a latent trap, not an active bug — it becomes live the moment any dependency (present or future) pulls in a `cc_library`,** at which point its correctness (does the zig wrapper actually behave like the C++ toolchain any real target needs?) has never been exercised anywhere, including CI ([build-contracts-and-ci-posture.md:297](../bazel-audit/build-contracts-and-ci-posture.md)).

For the general non-determinism cause list this override is one instance of (embedded timestamps, iteration order, hidden toolchain files, etc.), see `action-nondeterminism-taxonomy.md` in this same group — not restated here.

## Decisions

**1. The checked-in-generated-file pattern is `write_source_files` (or a hand-rolled `diff_test` pair), built on `BUILD_WORKSPACE_DIRECTORY`.**
Decision: this is the pattern the shipped rule set recommends, not a bespoke `genrule` + manual `cp` workflow.
Evidence: §10 — the mechanism only works because `bazel run` sets `BUILD_WORKSPACE_DIRECTORY` and `bazel build`/`test` refuse to write the source tree; bazel-contrib/bazel-lib's `write_source_file.bzl` is the maintained, current (v3.7.2, 2026-09-02) reference implementation of exactly this.
Assumption named: the adopting repo either takes bazel-contrib/bazel-lib as a dependency or reimplements the same three primitives (a generating rule, a `diff_test`, a `bazel run`-triggered updater script that checks `BUILD_WORKSPACE_DIRECTORY`) — the shipped rule states the pattern and its mechanism, not a specific dependency, so it applies equally to a repo that never takes bazel-lib.

**2. A golden-diff/snapshot test that is authoritative for only one Bazel major MUST say so, in a comment or the failure message, naming that major.**
Decision: yes — required, not optional.
Evidence: §11 — rules_ocx's own `ci.yml:57-62` is a live, dated instance where a real drift (stardoc's Bazel-9 `repo_mapping` row) is silently invisible on 2 of 3 CI legs; the comment that exists (`:57-60`) is exactly what makes the gap legible to a maintainer rather than a silent hole.
Assumption named: rules_ocx cannot currently widen this coverage without re-generating separate goldens per major or moving its own pin, which the orchestrator's post-map decision (frame corrections, Decision table row 2) explicitly declines to do — so the rule's bar is "name the gap," not "close the gap," for repos in this exact position.

## Normative guidance candidates

1. **Do not treat any sandbox strategy as proof of hermeticity without naming which one ran.** `processwrapper-sandbox` — the only cross-platform strategy — enforces nothing beyond "no undeclared-input read"; it neither mounts read-only nor blocks network.
   Rationale: a build that "passes sandboxed" on Windows or inside an unprivileged container may have zero real isolation.
   Verify: `bazel build --sandbox_debug <target> 2>&1 | grep -i "sandbox"` and confirm which strategy Bazel selected for the platform in use.
   Empty output (no strategy name surfaced) → cannot confirm isolation level; treat as FINDING until confirmed.
   Severity: SHOULD. Bazel: 7/8/9, all rulesets. M-ID: M-C-10.

2. **`--sandbox_debug` MUST NOT appear in a committed `.bazelrc`, `.bazelrc.user`, or CI workflow file.**
   Rationale: it disables sandbox-directory cleanup by design ("Bazel does not delete the sandbox directory... fills up your disk over time") — a debug-only flag, never a standing one.
   Verify: `grep -rn "sandbox_debug" **/.bazelrc* .github/workflows/*.yml`.
   Empty output → PASS.
   Severity: MUST. Bazel: all. M-ID: M-C-10.

3. **In a repository with zero `cc_*` targets that has no plan to add any, set `--repo_env=BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1` rather than leaving the C++ autodetection probe to run silently on every invocation.**
   Rationale: the probe runs at workspace/extension setup regardless of whether any target needs a C++ toolchain; skipping it is pure cost removal with no hermeticity downside when there is truly no C++ target.
   Verify: `--repo_env=BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1` and confirm no `@local_config_cc`/rules_cc autoconf repo materializes (`bazel query @local_config_cc//...` errors or returns nothing after `bazel clean --expunge`).
   Empty output (no autoconf repo) → PASS.
   Severity: SHOULD. Bazel: 8/9; rules_cc current (`cc/private/toolchain/cc_configure.bzl` on `main`, 2026-09). M-ID: M-C-08, M-C-09.

4. **A host-specific, non-hermetic toolchain override (`CC=`, `-layering_check`, or similar) found in a repo with zero targets that would exercise it MUST be recorded as a latent trap, not dismissed as harmless.**
   Rationale: it is currently inert only because nothing compiles against it; it activates without warning the moment a dependency introduces the relevant target kind, and by then its correctness has never been tested.
   Verify: `grep -n "CC=\|layering_check" .bazelrc.user .bazelrc`; if non-empty, also run `grep -rn "cc_binary(\|cc_library(\|cc_toolchain(" --include=*.bzl --include=BUILD*`.
   Empty output on the second grep with non-empty first → CONSIDER (latent, tracked); both non-empty → escalate to MUST (live).
   Severity: CONSIDER, escalating to MUST. Bazel: all. M-ID: M-C-09.

5. **Pin `--incompatible_strict_action_env=true` explicitly in `.bazelrc` whenever a repo's own CI matrix spans both Bazel 8 and Bazel 9 (or a repo is being migrated across that boundary).**
   Rationale: the flag defaults `false` across the entire Bazel 8.x line (verified 8.0.0–8.8.0) and `true` starting at 9.0.0; an unpinned repo silently runs a *different* PATH/`LD_LIBRARY_PATH` inheritance policy per CI leg, purely from the version default.
   Verify: `grep -rn "incompatible_strict_action_env" .bazelrc* .github/workflows/*.yml`; cross-check against the CI matrix's Bazel majors.
   Empty output → FINDING when the matrix spans Bazel 8 and 9; PASS when the flag is pinned or the matrix is single-major.
   Severity: MUST (multi-major matrix), SHOULD (general). Bazel: 8 (default false, 8.0.0–8.8.0) vs 9 (default true, 9.0.0–9.2.0). M-ID: M-C-05, M-C-06.

6. **Use `--repo_env=NAME=VALUE`, never `--action_env=NAME=VALUE`, for anything a repository rule or module extension must read — and do not assume the two are interchangeable across Bazel majors.**
   Rationale: `--incompatible_repo_env_ignores_action_env` defaults `false` on 8.x (action_env leaks into repo env) and `true` on 9.x (leak closed); code relying on the leak breaks silently on 9.x with no error, only an empty `getenv()` read.
   Verify: for every name set via `--action_env` in `.bazelrc*`, `grep -rn "getenv(\|repository_ctx.getenv" **/*.bzl` and confirm none of those call sites expect that name; add a matching `--repo_env` line for any that do.
   Empty output (no overlap) → PASS.
   Severity: MUST. Bazel: 8 (default false, shipped as opt-in from 8.3.0) vs 9 (default true since 9.0.0). M-ID: M-C-06.

7. **Explicitly flip `--sandbox_default_allow_network=false` for at least one CI leg (on Linux or macOS, where it can be enforced) rather than assuming Bazel blocks network by default.**
   Rationale: the flag defaults `true` — network access is allowed unless told otherwise; the cheapest way to catch a network-dependent action (an uncached `pip`/`npm`/`cargo`/`curl` call inside a genrule or repo rule) is before RBE finds it.
   Verify: `bazel build --sandbox_default_allow_network=false //...` and see which target fails first.
   Empty output (build stays green) → PASS on platforms where the sandbox enforces it; meaningless on `processwrapper-sandbox` (cannot enforce network isolation at all).
   Severity: SHOULD. Bazel: all. M-ID: M-C-11.

8. **When authoring or auditing a repository rule, enumerate its actual host-touching calls with `--experimental_workspace_rules_log_file` before trusting a code read.**
   Rationale: `execute`, unchecksummed `download`/`download_and_extract`, `which`, `.os`, and unconstrained `.symlink` are the exact operations Bazel's own docs name as non-hermetic for remote execution; a code read misses dynamically-constructed calls.
   Verify: `bazel clean --expunge && bazel build --experimental_workspace_rules_log_file=/tmp/wsl.log //... && bazel build src/tools/workspacelog:parser && bazel-bin/src/tools/workspacelog/parser --log_path=/tmp/wsl.log > /tmp/wsl.txt`, then `grep -c '"which"\|sha256: ""' /tmp/wsl.txt`.
   Empty output (0 matches) → PASS.
   Severity: SHOULD. Bazel: all. M-ID: M-C-12.

9. **Never assume a `glob()` pattern's match set is stable across changes elsewhere in the tree — re-verify with `bazel query` after any change that adds a subdirectory `BUILD`/`BUILD.bazel` file.**
   Rationale: `glob()` silently stops matching inside any subdirectory that becomes its own package — no error, no diagnostic, just fewer files from then on.
   Verify: `bazel query 'kind("source file", deps(//path/to:target))'`, compared before and after the change.
   Empty output (unchanged count) → PASS; a shrinking result → FINDING.
   Severity: SHOULD. Bazel: all (the `BUILD.bazel`-recognition bug itself, #4194, has been fixed since 2017). M-ID: M-C-15.

10. **Every checked-in generated file (docs, snapshot, lockfile summary) MUST be paired with a `write_source_files`/`diff_test`-style target, never a manual-edit workflow.**
    Rationale: `bazel build`/`bazel test` cannot write to the source tree by construction, so a stale file only surfaces as an unexplained CI failure unless a paired target both detects the drift and tells the developer the exact `bazel run` command to fix it.
    Verify: for every path that is both a rule's declared output and tracked in git (`git ls-files` ∩ a rule's `outs`/`out_file`), confirm a `diff_test`/`write_source_files` target names it.
    Empty output (every generated-and-tracked file has a matching test) → PASS.
    Severity: MUST. Bazel: all; bazel-contrib/bazel-lib ≥ any version shipping `write_source_files` (current 3.7.2, 2026-09-02) or a hand-rolled bazel_skylib `diff_test` pair. M-ID: M-C-16.

11. **Never tag a `diff_test`/`write_source_files` target `manual` or otherwise exclude it from `//...`.**
    Rationale: that test's failure is the entire safety mechanism the pattern relies on (§10); excluding it silently reintroduces the "stale file, no signal" problem the pattern exists to close.
    Verify: `grep -B2 -A2 'diff_test\|write_source_file' BUILD.bazel | grep -i 'tags.*manual'`.
    Empty output → PASS.
    Severity: MUST. Bazel: all. M-ID: M-C-16.

12. **A golden-diff or snapshot test that is authoritative for only one Bazel major in a multi-major CI matrix MUST name that major in an adjacent comment, and the CI config MUST NOT silently exclude the other legs without one.**
    Rationale: rules_ocx's own `ci.yml:62` shows the failure mode live — docs freshness verified on 1 of 3 legs because stardoc's Bazel-9 output differs, and the only reason this is legible at all is the comment at `:57-60`.
    Verify: `grep -B3 "matrix.bazel !=" .github/workflows/*.yml` (or the CI system's equivalent conditional-skip syntax) and confirm an adjacent comment names the reason and affected major.
    Empty output (no guarded exclusion found) → PASS only if the repo has no multi-major matrix; a guarded exclusion with no comment → FINDING.
    Severity: MUST (name it), SHOULD (widen coverage). Bazel: 8 vs 9 (stardoc `repo_mapping` row is the concrete instance). M-ID: M-C-17.

13. **Do not describe a deliberately-uncached CI job as proving action-key determinism.**
    Rationale: an uncached job proves the build is correct starting from an empty store; it says nothing about whether the same action run twice produces the same action key, and would still pass every run with a non-deterministic action.
    Verify (reading heuristic): does the job's own assertion compare two independent action-key or execution-log captures, or only assert exit code / output presence?
    Empty output (no key-comparison step found) → FINDING — the job proves cache-miss correctness, not determinism; re-scope its name/docs accordingly.
    Severity: SHOULD. Bazel: all. M-ID: M-C-18.

14. **Track `--experimental_reuse_sandbox_directories` as the current, real mitigation for large-input-count sandbox setup cost — not a hoped-for fix, and not a hermeticity control.**
    Rationale: bazelbuild/bazel#16711 (open since 2022, still open in 2026) documents unbounded setup-cost growth with input count; this flag is the one improvement actually shipped from that thread.
    Verify: `bazel build --experimental_reuse_sandbox_directories //<large-input target>` and compare wall-clock cost against a baseline run.
    Empty output → no signal either way; this is a performance knob for `bazel-diagnose`, not a pass/fail gate.
    Severity: CONSIDER. Bazel: current (flag present, still experimental as of `master`). No M-ID (informs diagnosis, not a specific map row).

15. **On any repo with a Windows CI leg, document a short `--output_user_root` rather than assuming default paths are safe.**
    Rationale: bazelbuild/bazel#11482 shows a real failure mode (a `SymlinkAction` silently falling back to a copy when the target name is too long, producing output-name collisions); the issue was closed without a Bazel-side fix, so the mitigation is operator-side.
    Verify (reading heuristic): does the repo's Windows CI config or dev docs set `--output_user_root` to a short path?
    Empty output → FINDING if the repo has a Windows CI leg; N/A otherwise.
    Severity: CONSIDER. Bazel: all (issue-level workaround, not version-gated). No M-ID (fleet has zero Windows CI legs today).

16. **Treat rules_cc's and rules_python's default toolchain configuration as non-hermetic (host-installed) unless a hermetic toolchain is explicitly registered ahead of it — "the repo uses Bazel" does not imply "the repo is hermetic."**
    Rationale: a peer-reviewed measurement across 70 real projects found rules_cc and rules_python default to host-installed toolchains, and only 1 of 13 rules_python-using projects in that sample overrode the default; rules_java by default compiles with a Bazel-managed JDK but executes/tests with the host JDK.
    Verify: for rules_python, confirm `python.toolchain(python_version=...)` is registered and no unpinned system-Python fallback exists; for rules_cc, confirm a hermetic toolchain module (e.g. `toolchains_llvm`, `hermetic_cc_toolchain`) is registered ahead of the autodetected one.
    Empty output (no explicit hermetic toolchain registration found) → FINDING for any repo with real `cc_*`/`py_*` targets.
    Severity: MUST (Shape F repos with real targets); N/A for a repo with zero such targets (e.g. rules_ocx today). Bazel: 8/9; rules_python 2.3.3, current rules_cc (era pins). M-ID: M-C-08 (extends the C++-only framing to Python; the language-specific mechanics belong to the Python/C++ depth files, cross-referenced not restated here).

17. **Never mount a real host directory writable into a sandboxed action (`--sandbox_writable_path`, `--sandbox_add_mount_pair`) when an isolated empty mount (`--sandbox_tmpfs_path`) would serve — reserve the former for a documented, specific need.**
    Rationale: a writable host-directory mount defeats sandboxing outright, letting state flow between actions or from the developer's own filesystem into a supposedly declared-inputs-only action.
    Verify: `grep -rn "sandbox_writable_path\|sandbox_add_mount_pair" .bazelrc*` and confirm each named path is scoped and commented, not a broad host directory.
    Empty output → PASS.
    Severity: SHOULD. Bazel: all (`--sandbox_tmpfs_path` present in current `SandboxOptions.java`). M-ID: M-C-10.

18. **Reject a proposed fix that reintroduces `WORKSPACE`, `local_repository()`, or a top-level `cc_configure()` call on any repo targeting Bazel 9.**
    Rationale: Bazel 9.0 deleted the WORKSPACE support code outright (not merely disabled it); `--enable_workspace` is a no-op, so this is dead machinery, not legacy-but-working code.
    Verify: `grep -rn "^WORKSPACE\|local_repository(\|native.local_repository\|cc_configure(" --include=WORKSPACE* --include=*.bzl` on a Bazel-9-targeting repo, excluding an explicit compatibility shim.
    Empty output → PASS.
    Severity: MUST. Bazel: 9 (WORKSPACE code deleted at 9.0.0). M-ID: none direct (AI-agent-angle item; see below).

19. **A personal, gitignored `.bazelrc.user`-style override file SHOULD stay outside every path CI reads (`try-import`, a copy step, a checked-in symlink) — verify the negative, don't assume it.**
    Rationale: this is exactly what keeps rules_ocx's own non-hermetic CC override inert (§13); if CI ever sourced that file, the override would go from latent to load-bearing without anyone deciding it should.
    Verify: `grep -rn "bazelrc.user\|try-import" .github/workflows/*.yml`; confirm the personal rc file is listed in `.gitignore`.
    Empty output on "does CI read it" → PASS.
    Severity: SHOULD. Bazel: all. M-ID: M-C-09.

20. **Confirm a hermetic toolchain module is registered *before* the autodetected one in `register_toolchains`/module-extension order — registering it "for completeness" afterward does not override autodetection for any target that doesn't force the constraint.**
    Rationale: Bazel's toolchain resolution takes the first matching registered toolchain for the requested platform constraints; a hermetic toolchain listed after the autoconfigured one only wins when something forces that specific constraint set.
    Verify: read `MODULE.bazel`'s `register_toolchains(...)` call order, or `bazel cquery --transitions=full //target 2>&1 | grep -i toolchain` for a live selection.
    Empty output (no explicit hermetic toolchain resolves ahead of the autoconfigured one) → FINDING — the hermetic toolchain is registered but not actually in effect for default builds.
    Severity: CONSIDER. Bazel: 8/9; toolchains_llvm 1.9.0, hermetic_cc_toolchain 4.3.0 (era pins, not fleet-exercised). M-ID: M-C-08.

## Fleet evidence

- **The zig/`layering_check` override is real and currently inert.** `.bazelrc.user:1-3` (gitignored) sets `common --repo_env=CC=/home/mherwig/.local/bin/zig-bazel-cc` and `build --features=-layering_check --host_features=-layering_check`; the repo defines zero `cc_binary`/`cc_library`/`cc_toolchain` targets ([build-contracts-and-ci-posture.md:37,70-72,220,297,313](../bazel-audit/build-contracts-and-ci-posture.md)). CI never reads this file's content — it is regenerated only for cache auth, not for the CC/layering_check lines ([build-contracts-and-ci-posture.md:79](../bazel-audit/build-contracts-and-ci-posture.md)).
- **No `.bazelrc*` or CI workflow sets `--incompatible_strict_action_env`, `--action_env`, or `--repo_env`.** Verified directly against `/home/mherwig/dev/rules_ocx/.bazelrc` (12 lines: `--enable_platform_specific_config`, `--windows_enable_symlinks`, `--enable_runfiles`, `--incompatible_disallow_empty_glob`, `--test_output=errors`, `try-import %workspace%/.bazelrc.user`) and a grep of every `.github/workflows/*.yml` and `.github/actions/*/*.yml` for `action_env`/`repo_env` (no hits). Given §7's finding, this means the repo's own 3-way CI matrix (8.7.0, 9.x, rolling — [build-contracts-and-ci-posture.md:40](../bazel-audit/build-contracts-and-ci-posture.md)) silently runs each Bazel-8 leg with `LD_LIBRARY_PATH` inheritance enabled by default and each Bazel-9/rolling leg with it disabled, with nothing in the repo announcing the difference. This is a new finding this dive surfaced independently of the map's own M-C-05/M-C-06 rows.
- **`getenv`/`watch` discipline is real, not aspirational.** 9 `getenv` and 4 `watch`/`watch_tree` call sites, all funneled through 2 tested helper functions (`make_ocx_env`, `ambient_config_paths`); both `download` sites carry `sha256=` ([starlark-code-shape.md:290](../bazel-audit/starlark-code-shape.md)). `AGENTS.md:34-35` states the design intent explicitly: "repository rules are unsandboxed; that's inherent to Bazel, not a bug" ([config-inventory.md:186](../bazel-audit/config-inventory.md)) — meaning §19's "personal rc file must stay outside CI's read path" concern does not apply to `getenv`/`watch` usage here, which is a deliberate, documented design choice, not an oversight.
- **The `**` glob and `select()` findings the frame suspected do not exist in this repo.** 0 real `**` globs and 1 real `select()` in the entire own build graph — the sole hits both live inside generated-repo BUILD-string templates the repo's own Bazel invocation never evaluates ([starlark-code-shape.md:291](../bazel-audit/starlark-code-shape.md)). §9's glob-boundary trap is therefore grounded on upstream sources and the practitioner literature, not on fleet code — the fleet provides no counter-evidence, but also no supporting instance.
- **The golden-diff-pinned-to-one-major trap (§11) is live, not hypothetical, in this exact fleet repo.** `ci.yml:57-60`'s comment states stardoc emits an extra `repo_mapping` row under Bazel 9+; `ci.yml:62` excludes `//docs/...` whenever `matrix.bazel != '8.7.0'` ([build-contracts-and-ci-posture.md:116,263](../bazel-audit/build-contracts-and-ci-posture.md)).
- **The 4 repository-rule `_impl` entry points have zero offline test coverage of their own orchestration** ([starlark-code-shape.md:272](../bazel-audit/starlark-code-shape.md)) — meaning §8's `--experimental_workspace_rules_log_file` check is currently the *only* mechanical way (short of the live-registry example tests) to verify these 4 functions' `execute`/`download`/`symlink`/`file` sequencing stays hermetic across a change; there is no `analysistest` gate that would catch a regression first.
- **RBE is out of reach for this repo by design**, so §4's network-isolation check is aimed at the *adopting* Shape-F monorepo, not at rules_ocx itself: the launcher model resolves absolute host-store paths (the nixpkgs model, per its own README), which remote execution cannot reproduce (frame correction 5).

## AI-agent angle

- **Proposing `WORKSPACE`, `local_repository()`, or a top-level `cc_configure()` fix on a Bazel-9 target.** Bazel 9.0 deleted the WORKSPACE support code, not merely disabled it; `--enable_workspace` is a no-op. Mechanical check: `grep -rn "local_repository(\|^WORKSPACE\|cc_configure(" --include=WORKSPACE* --include=*.bzl` on a Bazel-9-pinned repo — any hit outside an explicit, commented compatibility shim is a hallucinated or historical fix being proposed as current.
- **Hallucinating `BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN` as a Bazel core flag or Starlark constant** rather than an environment variable a repository rule reads via `repository_ctx.os.environ`. It is not settable via `--define`, is not a `--flag`, and does not appear as a symbol to `load()` — it must be set through `--repo_env` (or the process environment before Bazel starts), never `--action_env`. Mechanical check: any generated `.bazelrc` line reading `build --define=BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1` or a `load(..., "BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN")` is wrong on its face — the only correct form is `common --repo_env=BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1` or an env var set before invoking `bazel`.
- **Assuming `--incompatible_strict_action_env` and `--incompatible_repo_env_ignores_action_env` behave identically across Bazel 8 and 9,** or citing "now defaults true" without naming which Bazel major that applies to — both flags default differently on 8.x vs 9.x (§6, §7), and a model trained mostly on Bazel-9-era documentation will assert the 9.x default as if it always held. Mechanical check: any guidance file asserting one of these two flag defaults without naming a Bazel major is unverifiable and should be treated as a gap, not a fact — re-derive it per the version table in §6/§7 before trusting it.
- **Recommending `--sandbox_debug` as a "safe to always leave on for troubleshooting" flag.** It disables sandbox-directory cleanup by design; an agent that adds it to a shared `.bazelrc` "to help debug CI failures" introduces an unbounded disk leak on every future invocation. Mechanical check: `grep -rn "sandbox_debug"` in any committed `.bazelrc*` should always return empty.
- **Treating `--sandbox_default_allow_network`'s existence as proof network is blocked by default.** It defaults `true`; an agent reasoning "Bazel sandboxes the build, so it must be network-isolated" is wrong on the default, and doubly wrong on `processwrapper-sandbox`/Windows where the flag cannot be enforced regardless of its value. Mechanical check: read the flag's own default in `SandboxOptions.java` or the CLI reference before asserting network isolation is in effect.
- **Writing a `glob(["**"])` fix and considering the job done** without re-running `bazel query` to confirm the actual match set — an agent that only re-reads the Starlark pattern will not notice a silent shrink caused by an unrelated subdirectory gaining a BUILD file elsewhere in the same PR. Mechanical check: any diff that touches a `glob()` pattern's containing tree should be paired with a `bazel query 'kind("source file", ...)'` diff, not just a visual read of the pattern.
- **Suggesting a `write_source_files`/`diff_test` target be tagged `manual` "to unblock CI"** when the underlying generated file is legitimately stale — this deletes the entire safety mechanism the pattern exists to provide (§10, guidance candidate 11) rather than fixing the drift. Mechanical check: any PR that adds a `manual` tag to an existing `diff_test`/`write_source_files` target without also regenerating the file it guards is very likely masking a real failure, not fixing a flaky one.

## Contested / evolving

- **Whether `darwin-sandbox` fully matches `linux-sandbox`'s network-blocking capability is not settled in Bazel's own docs.** The reference doc states linux-sandbox "can optionally... prevent the action from accessing the network" and separately says darwin-sandbox achieves "roughly the same as the Linux sandbox" via `sandbox-exec`, without directly confirming network-blocking parity for macOS. Treat this as unconfirmed rather than assumed equal; a rule that needs network isolation on macOS should verify empirically (`--sandbox_default_allow_network=false` and observe) rather than trust the "roughly the same" phrasing. As of 2026-09-05: unresolved in official docs.
- **`--incompatible_repo_env_ignores_action_env` and `--experimental_strict_repo_env` are both mid-flight, not stable end states.** The former is tracked for outright deletion of the old (leaky) behavior at Bazel HEAD ([bazelbuild/bazel#27745](https://github.com/bazelbuild/bazel/issues/27745), open as of 2025-11-20); the latter remains `experimental`, default `false`, with no announced graduation date. Trend: tightening (less env leaks into repo rules over time), but the exact Bazel version each stabilizes in is not yet fixed — a rule that hardcodes "Bazel 10 removes the flag" would be guessing.
- **`--experimental_use_hermetic_linux_sandbox` (mount nothing but explicit pairs, no whole-root read-only fallback) is the strongest closure of §2's read-only-host-mount trap, but remains experimental with no committed stabilization date.** Trend: this is the direction Bazel's own sandbox code is moving (per its presence and active option definition in current `SandboxOptions.java`), but adopting it today means opting into an experimental flag for a MUST-severity guarantee — hence CONSIDER, not MUST, in guidance candidate 1's stronger variant.
- **The peer-reviewed measurement (§2) is from 2024/2025-vintage tooling (rules_cc/rules_python versions current at that study's data collection) and this dive did not re-run its methodology against 2026-era rulesets.** The qualitative finding (default configs are host-toolchain-based) is corroborated independently by this dive's own source reading of rules_cc's current `cc/private/toolchain/cc_configure.bzl` (§5) and is very unlikely to have flipped, but the exact percentages (71.9%, 38.1%, 37.1%) should be read as "as measured circa 2024/2025," not as a live, continuously-updated statistic.
- **Whether `processwrapper-sandbox` will ever gain read-only-root or network-isolation capability is not on any roadmap surfaced by this research.** As of 2026-09-05, the practical guidance stays "cross-platform sandboxing is weak sandboxing" with no indication that is changing.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [bazel.build/docs/sandboxing](https://bazel.build/docs/sandboxing) | Official reference doc | Current (fetched 2026-09-05) | The three sandbox strategies, `--sandbox_debug`'s exact warning, primary for §1/§3 |
| [bazel.build/remote/workspace](https://bazel.build/remote/workspace) | Official reference doc | Current | Names the exact non-hermetic `repository_ctx` operations and the workspacelog mechanism, primary for §8 |
| [bazel.build/reference/be/functions](https://bazel.build/reference/be/functions) | Build Encyclopedia reference | Current | `glob()`'s own documented package-boundary semantics, primary for §9 |
| [bazel.build/reference/be/general](https://bazel.build/reference/be/general) | Build Encyclopedia reference | Current | The genrule "General Advice" determinism checklist, verbatim, cross-referenced from the sibling non-determinism dive |
| [bazel.build/docs/user-manual](https://bazel.build/docs/user-manual) | Official user manual | Current | `BUILD_WORKSPACE_DIRECTORY`/`BUILD_WORKING_DIRECTORY` definitions, primary for §10 |
| [raw.githubusercontent.com/bazelbuild/rules_cc/main/cc/private/toolchain/cc_configure.bzl](https://raw.githubusercontent.com/bazelbuild/rules_cc/main/cc/private/toolchain/cc_configure.bzl) | rules_cc's own source (current `main`) | Fetched 2026-09-05 | The actual `BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN` implementation — proves the escape hatch lives in rules_cc, not Bazel core, primary for §5 |
| [SandboxOptions.java](https://raw.githubusercontent.com/bazelbuild/bazel/master/src/main/java/com/google/devtools/build/lib/sandbox/SandboxOptions.java) (bazelbuild/bazel, `master`) | Bazel's own option-definition source | Current | Exact defaults for `--sandbox_debug` (false), `--sandbox_default_allow_network` (true), `--sandbox_tmpfs_path`, `--experimental_use_hermetic_linux_sandbox`; primary for §3/§4/§1 |
| [CommonCommandOptions.java](https://raw.githubusercontent.com/bazelbuild/bazel/master/src/main/java/com/google/devtools/build/lib/runtime/CommonCommandOptions.java) (bazelbuild/bazel, fetched at tags `master`, `8.7.0`, `8.8.0`, `9.0.0`, `9.1.0`, `9.2.0`) | Bazel's own option-definition source, multi-tag diff | Current + historical tags | The `--repo_env`/`--action_env`/`--incompatible_repo_env_ignores_action_env` definitions and their exact per-version default flip, primary for §6 |
| [BazelRuleClassProvider.java](https://raw.githubusercontent.com/bazelbuild/bazel/8.7.0/src/main/java/com/google/devtools/build/lib/bazel/rules/BazelRuleClassProvider.java) (bazelbuild/bazel, fetched at tags `6.0.0` through `9.2.0`) | Bazel's own option-definition source, multi-tag diff | Current + historical tags | `--incompatible_strict_action_env`'s exact per-version default (false through all of 8.x, true from 9.0.0) — the frame-correcting finding, primary for §7 |
| [bazelbuild/bazel#26222](https://github.com/bazelbuild/bazel/issues/26222) | Tracking issue, project's own tracker | Filed 2025-06-04, referenced PRs through 2026-06 | Full lifecycle of `--incompatible_repo_env_ignores_action_env` (add → backport → flip → deprecate), primary for §6 |
| [bazelbuild/bazel#27745](https://github.com/bazelbuild/bazel/issues/27745) | Deletion-tracking PR, project's own tracker | Opened 2025-11-20, open as of fetch | States plainly "This is enabled by default in Bazel v9," confirming the 9.x default, primary for §6 |
| [bazelbuild/bazel#16711](https://github.com/bazelbuild/bazel/issues/16711) | Bug/perf issue, project's own tracker | Filed 2022-11-09, still open, last activity 2025-11-23 | Symlinked-sandbox cost and the one shipped mitigation, primary for §12 |
| [bazelbuild/bazel#11482](https://github.com/bazelbuild/bazel/issues/11482) | Feature request, project's own tracker | Filed 2020-05-25, closed 2020-06-15 | Windows path-length failure mode and its non-fix, primary for §12 |
| [bazelbuild/bazel#4194](https://github.com/bazelbuild/bazel/issues/4194) | Bug report, project's own tracker | Filed 2017-11-30, closed 2017-12-06 | The historical `BUILD.bazel`-boundary bug, distinguishing "fixed bug" from "still-true surprising behavior" for §9 |
| [bazelbuild/bazel `src/tools/workspacelog`](https://github.com/bazelbuild/bazel/tree/master/src/tools/workspacelog) | Bazel's own in-tree tool | Current | The exact `parser` target and its usage, primary for §8's verification command |
| [fzakaria.com/2025/06/22/bazel-s-original-sins](https://fzakaria.com/2025/06/22/bazel-s-original-sins) | Practitioner blog (named in the brief) | 2025-06-22 | The "read-only root mount" framing and the GNU-vs-BSD `diff` worked example, argued not measured — used only for narrative framing in §2, not for any flag default |
| [Tweag: "How to keep a Bazel project hermetic?"](https://www.tweag.io/blog/2022-09-15-hermetic-bazel/) | Practitioner blog | 2022-09-15 | Names built-in `cc_*` rules and `pip_install`/`npm_install` as PATH-dependent by default, corroborates §2/§16 from a different angle |
| Zheng, Adams, Hassan — "On Build Hermeticity in Bazel-based Build Systems" (IEEE Software) | Peer-reviewed measurement study | Publication cycle 2024–2025 (feature article) | 150M-syscall study across 70 real Bazel projects; the 0%-fully-hermetic, 71.9%/38.1%/37.1% statistics underlying §2 and guidance candidate 16 — the strongest evidence tier available for this topic |
| [blog.bazel.build/2026/01/20/bazel-9.html](https://blog.bazel.build/2026/01/20/bazel-9.html) | Official Bazel blog, release announcement | 2026-01-20 | Confirms WORKSPACE support code deletion and `--incompatible_autoload_externally` default-empty, grounding the AI-agent-angle WORKSPACE-fix trap |
